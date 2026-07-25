import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service";
import {
  BillingPlanCatalogService,
  type BillingPlanDefinition,
} from "./billing-plan-catalog.service";
import { StripeWebhookEventLedgerService } from "./stripe-webhook-event-ledger.service";
import { StripeWebhookProcessorService } from "./stripe-webhook-processor.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OCCURRED_AT = new Date("2026-09-20T12:00:00.000Z");
const PERIOD_START = 1_790_000_000;
const PERIOD_END = 1_792_592_000;
const PLAN: BillingPlanDefinition = {
  key: "fluyo_plus",
  displayName: "Fluyo Plus",
  description: "Webhook test plan.",
  entitlementKeys: ["practice.unlimited", "grammar.full"],
  prices: [
    { interval: "monthly", stripePriceId: "price_monthly_fixture" },
    { interval: "annual", stripePriceId: "price_annual_fixture" },
  ],
  trialPeriodDays: null,
  promotionCodesAllowed: true,
};

function subscription(
  overrides: Partial<{
    canceledAt: number | null;
    status: Stripe.Subscription.Status;
  }> = {},
): Stripe.Subscription {
  return {
    id: "sub_fixture",
    object: "subscription",
    customer: "cus_fixture",
    metadata: { supabase_user_id: USER_ID, plan_key: PLAN.key },
    status: overrides.status ?? "active",
    cancel_at_period_end: false,
    canceled_at: overrides.canceledAt ?? null,
    trial_end: null,
    items: {
      data: [
        {
          id: "si_fixture",
          object: "subscription_item",
          current_period_start: PERIOD_START,
          current_period_end: PERIOD_END,
          price: {
            id: "price_monthly_fixture",
            object: "price",
            product: "prod_fixture",
          },
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

function createTransaction() {
  return {
    stripeWebhookEvent: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "evt_fixture" }),
    },
    stripeCustomer: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ userId: USER_ID }),
    },
    stripeSubscription: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: "subscription-row" }),
    },
    entitlement: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockResolvedValue({ id: "entitlement-row" }),
    },
  };
}

function createFixture(transaction = createTransaction()) {
  let committed = false;
  const prismaMock = {
    $transaction: vi.fn(async (callback: (client: typeof transaction) => Promise<unknown>) => {
      const result = await callback(transaction);
      committed = true;
      return result;
    }),
    stripeWebhookEvent: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  };
  const prisma = prismaMock as unknown as PrismaService;
  const ledger = new StripeWebhookEventLedgerService(prisma);
  const service = new StripeWebhookProcessorService(
    prisma,
    new BillingPlanCatalogService([PLAN]),
    ledger,
  );

  return {
    committed: () => committed,
    prisma,
    prismaMock,
    service,
    transaction,
  };
}

describe("StripeWebhookProcessorService", () => {
  it("atomically creates customer, subscription, entitlements, and ledger state", async () => {
    const fixture = createFixture();

    await expect(
      fixture.service.process(
        "evt_created_fixture",
        "customer.subscription.created",
        subscription(),
        OCCURRED_AT,
      ),
    ).resolves.toEqual({ duplicate: false, processed: true });

    expect(fixture.committed()).toBe(true);
    expect(fixture.transaction.stripeWebhookEvent.create).toHaveBeenCalledWith({
      data: {
        id: "evt_created_fixture",
        type: "customer.subscription.created",
      },
      select: { id: true },
    });
    expect(fixture.transaction.stripeCustomer.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, stripeCustomerId: "cus_fixture" },
      select: { userId: true },
    });
    expect(fixture.transaction.stripeSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          billingInterval: "MONTHLY",
          planKey: PLAN.key,
          status: "ACTIVE",
          stripeCustomerId: "cus_fixture",
          stripePriceId: "price_monthly_fixture",
          stripeProductId: "prod_fixture",
          stripeSubscriptionId: "sub_fixture",
          userId: USER_ID,
        }),
      }),
    );
    expect(fixture.transaction.entitlement.upsert).toHaveBeenCalledTimes(2);
    expect(fixture.transaction.entitlement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          entitlementKey: "practice.unlimited",
          endsAt: null,
          source: "STRIPE",
          sourceReference: "sub_fixture",
          status: "ACTIVE",
          userId: USER_ID,
        }),
      }),
    );
  });

  it("replays an existing event without applying lifecycle changes again", async () => {
    const transaction = createTransaction();
    transaction.stripeWebhookEvent.findUnique.mockResolvedValue({ id: "evt_replay_fixture" });
    const fixture = createFixture(transaction);

    await expect(
      fixture.service.process(
        "evt_replay_fixture",
        "customer.subscription.updated",
        subscription(),
        OCCURRED_AT,
      ),
    ).resolves.toEqual({ duplicate: true, processed: true });

    expect(transaction.stripeWebhookEvent.create).not.toHaveBeenCalled();
    expect(transaction.stripeSubscription.upsert).not.toHaveBeenCalled();
    expect(transaction.entitlement.upsert).not.toHaveBeenCalled();
  });

  it("treats a concurrent ledger uniqueness conflict as replay protection", async () => {
    const fixture = createFixture();
    fixture.prismaMock.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate event", {
        clientVersion: "6.19.3",
        code: "P2002",
      }),
    );
    fixture.prismaMock.stripeWebhookEvent.findUnique.mockResolvedValue({
      id: "evt_concurrent_fixture",
    });

    await expect(
      fixture.service.process(
        "evt_concurrent_fixture",
        "customer.subscription.updated",
        subscription(),
        OCCURRED_AT,
      ),
    ).resolves.toEqual({ duplicate: true, processed: true });
  });

  it("revokes Stripe entitlements when the authoritative subscription is deleted", async () => {
    const transaction = createTransaction();
    transaction.stripeCustomer.findUnique
      .mockResolvedValueOnce({ userId: USER_ID })
      .mockResolvedValueOnce({ stripeCustomerId: "cus_fixture" });
    transaction.stripeSubscription.findUnique.mockResolvedValue({
      userId: USER_ID,
      stripeCustomerId: "cus_fixture",
    });
    const fixture = createFixture(transaction);

    await fixture.service.process(
      "evt_deleted_fixture",
      "customer.subscription.deleted",
      subscription({ status: "canceled", canceledAt: 1_790_100_000 }),
      OCCURRED_AT,
    );

    expect(transaction.stripeSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "CANCELED" }),
      }),
    );
    expect(transaction.entitlement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: "CANCELED",
          endsAt: new Date(1_790_100_000 * 1_000),
        }),
      }),
    );
  });

  it("does not commit the ledger when entitlement synchronization fails", async () => {
    const transaction = createTransaction();
    transaction.entitlement.upsert.mockRejectedValue(new Error("database write failed"));
    const fixture = createFixture(transaction);

    await expect(
      fixture.service.process(
        "evt_rollback_fixture",
        "invoice.payment_failed",
        subscription({ status: "past_due" }),
        OCCURRED_AT,
      ),
    ).rejects.toThrow("database write failed");

    expect(fixture.committed()).toBe(false);
    expect(transaction.stripeWebhookEvent.create).toHaveBeenCalled();
  });
});
