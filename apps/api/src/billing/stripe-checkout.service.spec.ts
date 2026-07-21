import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import {
  BillingPlanCatalogService,
  type BillingPlanDefinition,
} from "./billing-plan-catalog.service";
import { StripeCheckoutService } from "./stripe-checkout.service";
import type { StripeCustomerMappingsService } from "./stripe-customer-mappings.service";

const IDENTITY = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "learner@example.com",
};
const PLAN: BillingPlanDefinition = {
  key: "fluyo_plus",
  displayName: "Fluyo Plus",
  description: "The paid Fluyo plan used by Checkout tests.",
  entitlementKeys: ["practice.unlimited"],
  prices: [
    { interval: "monthly", stripePriceId: "price_monthly_placeholder" },
    { interval: "annual", stripePriceId: "price_annual_placeholder" },
  ],
  trialPeriodDays: null,
  promotionCodesAllowed: true,
};

function createFixture(options?: { existingCustomerId?: string | null; stripe?: boolean }) {
  const customersCreate = vi.fn().mockResolvedValue({ id: "cus_created" });
  const sessionsCreate = vi.fn().mockResolvedValue({
    url: "https://checkout.stripe.com/example",
  });
  const stripe = {
    customers: { create: customersCreate },
    checkout: { sessions: { create: sessionsCreate } },
  } as unknown as Stripe;
  const customerMappings = {
    findCustomerId: vi.fn().mockResolvedValue(options?.existingCustomerId ?? null),
    createMapping: vi.fn().mockResolvedValue(undefined),
  } as unknown as StripeCustomerMappingsService;
  const config = {
    getOrThrow: vi.fn().mockReturnValue("https://app.fluyo.example"),
  } as unknown as ConfigService;
  const service = new StripeCheckoutService(
    options?.stripe === false ? null : stripe,
    new BillingPlanCatalogService([PLAN]),
    customerMappings,
    config,
  );

  return { customerMappings, customersCreate, service, sessionsCreate };
}

describe("StripeCheckoutService", () => {
  it("creates a Stripe-hosted subscription Checkout Session from the server catalog", async () => {
    const fixture = createFixture();

    await expect(
      fixture.service.createSession(IDENTITY, {
        planKey: "fluyo_plus",
        interval: "annual",
      }),
    ).resolves.toEqual({ url: "https://checkout.stripe.com/example" });
    expect(fixture.sessionsCreate).toHaveBeenCalledWith({
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      cancel_url: "https://app.fluyo.example/pricing?checkout=cancelled",
      client_reference_id: IDENTITY.id,
      customer: "cus_created",
      customer_update: { address: "auto" },
      line_items: [{ price: "price_annual_placeholder", quantity: 1 }],
      metadata: {
        plan_key: "fluyo_plus",
        supabase_user_id: IDENTITY.id,
      },
      mode: "subscription",
      subscription_data: {
        metadata: {
          plan_key: "fluyo_plus",
          supabase_user_id: IDENTITY.id,
        },
      },
      success_url: "https://app.fluyo.example/pricing?checkout=success",
    });
  });

  it("creates and persists a Stripe Customer mapping when none exists", async () => {
    const fixture = createFixture();

    await fixture.service.createSession(IDENTITY, {
      planKey: "fluyo_plus",
      interval: "monthly",
    });

    expect(fixture.customersCreate).toHaveBeenCalledWith({
      email: IDENTITY.email,
      metadata: { supabase_user_id: IDENTITY.id },
    });
    expect(fixture.customerMappings.createMapping).toHaveBeenCalledWith(IDENTITY.id, "cus_created");
  });

  it("reuses an existing Stripe Customer without creating another", async () => {
    const fixture = createFixture({ existingCustomerId: "cus_existing" });

    await fixture.service.createSession(IDENTITY, {
      planKey: "fluyo_plus",
      interval: "monthly",
    });

    expect(fixture.customersCreate).not.toHaveBeenCalled();
    expect(fixture.customerMappings.createMapping).not.toHaveBeenCalled();
    expect(fixture.sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" }),
    );
  });

  it("rejects plans and intervals that are not in the server catalog", async () => {
    const fixture = createFixture();

    await expect(
      fixture.service.createSession(IDENTITY, {
        planKey: "browser_supplied_plan",
        interval: "monthly",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fixture.customersCreate).not.toHaveBeenCalled();
    expect(fixture.sessionsCreate).not.toHaveBeenCalled();
  });

  it("keeps promotion-code policy enabled in the provider request", async () => {
    const fixture = createFixture({ existingCustomerId: "cus_existing" });

    await fixture.service.createSession(IDENTITY, {
      planKey: "fluyo_plus",
      interval: "monthly",
    });

    expect(fixture.sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ allow_promotion_codes: true }),
    );
  });

  it("returns a safe provider error when Stripe fails or omits a Checkout URL", async () => {
    const fixture = createFixture({ existingCustomerId: "cus_existing" });
    fixture.sessionsCreate.mockRejectedValueOnce(new Error("provider detail"));

    await expect(
      fixture.service.createSession(IDENTITY, {
        planKey: "fluyo_plus",
        interval: "monthly",
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    fixture.sessionsCreate.mockResolvedValueOnce({ url: null });
    await expect(
      fixture.service.createSession(IDENTITY, {
        planKey: "fluyo_plus",
        interval: "monthly",
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("rejects Checkout while server-side billing configuration is disabled", async () => {
    const fixture = createFixture({ stripe: false });

    await expect(
      fixture.service.createSession(IDENTITY, {
        planKey: "fluyo_plus",
        interval: "monthly",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
