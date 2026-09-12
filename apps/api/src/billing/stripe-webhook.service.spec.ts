import type { ConfigService } from "@nestjs/config";
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { StripeWebhookProcessorService } from "./stripe-webhook-processor.service";
import { StripeWebhookService } from "./stripe-webhook.service";

const OCCURRED_AT_SECONDS = 1_790_000_000;
const WEBHOOK_SECRET = ["whsec", "service", "fixture"].join("_");

function event(
  type: string,
  object: unknown,
  id = `evt_${type.replaceAll(".", "_")}`,
): Stripe.Event {
  return {
    id,
    type,
    object: "event",
    api_version: "2026-06-24.dahlia",
    created: OCCURRED_AT_SECONDS,
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: null,
  } as Stripe.Event;
}

function createFixture() {
  const constructEvent = vi.fn();
  const retrieve = vi.fn();
  const process = vi.fn().mockResolvedValue({ duplicate: false, processed: true });
  const stripe = {
    webhooks: { constructEvent },
    subscriptions: { retrieve },
  } as unknown as Stripe;
  const config = {
    get: vi.fn((key: string) =>
      key === "billing.stripeWebhookSecret" ? WEBHOOK_SECRET : undefined,
    ),
  } as unknown as ConfigService;
  const service = new StripeWebhookService(
    stripe,
    { process } as unknown as StripeWebhookProcessorService,
    config,
  );

  return { constructEvent, process, retrieve, service };
}

describe("StripeWebhookService", () => {
  it("ignores a verified unknown event without writing the ledger", async () => {
    const fixture = createFixture();
    fixture.constructEvent.mockReturnValue(event("customer.updated", { object: "customer" }));

    await expect(fixture.service.receive(Buffer.from("{}"), "signature")).resolves.toEqual({
      received: true,
      duplicate: false,
      processed: false,
    });
    expect(fixture.process).not.toHaveBeenCalled();
  });

  it.each([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ] as const)("refreshes authoritative state for %s", async (type) => {
    const fixture = createFixture();
    const subscription = { id: "sub_fixture", object: "subscription" } as Stripe.Subscription;
    fixture.constructEvent.mockReturnValue(event(type, subscription));
    fixture.retrieve.mockResolvedValue(subscription);

    await fixture.service.receive(Buffer.from("{}"), "signature");

    expect(fixture.retrieve).toHaveBeenCalledWith("sub_fixture");
    expect(fixture.process).toHaveBeenCalledWith(
      expect.any(String),
      type,
      subscription,
      new Date(OCCURRED_AT_SECONDS * 1_000),
    );
  });

  it("synchronizes Checkout completion from the current Stripe Subscription", async () => {
    const fixture = createFixture();
    const subscription = { id: "sub_checkout", object: "subscription" } as Stripe.Subscription;
    fixture.constructEvent.mockReturnValue(
      event("checkout.session.completed", {
        id: "cs_fixture",
        object: "checkout.session",
        mode: "subscription",
        subscription: "sub_checkout",
      }),
    );
    fixture.retrieve.mockResolvedValue(subscription);

    await fixture.service.receive(Buffer.from("{}"), "signature");

    expect(fixture.retrieve).toHaveBeenCalledWith("sub_checkout");
    expect(fixture.process).toHaveBeenCalledWith(
      expect.any(String),
      "checkout.session.completed",
      subscription,
      expect.any(Date),
    );
  });

  it.each(["invoice.paid", "invoice.payment_failed"] as const)(
    "synchronizes subscription state for %s",
    async (type) => {
      const fixture = createFixture();
      const subscription = { id: "sub_invoice", object: "subscription" } as Stripe.Subscription;
      fixture.constructEvent.mockReturnValue(
        event(type, {
          id: "in_fixture",
          object: "invoice",
          parent: {
            type: "subscription_details",
            quote_details: null,
            subscription_details: {
              metadata: null,
              subscription: "sub_invoice",
            },
          },
        }),
      );
      fixture.retrieve.mockResolvedValue(subscription);

      await fixture.service.receive(Buffer.from("{}"), "signature");

      expect(fixture.retrieve).toHaveBeenCalledWith("sub_invoice");
      expect(fixture.process).toHaveBeenCalledWith(
        expect.any(String),
        type,
        subscription,
        expect.any(Date),
      );
    },
  );
});
