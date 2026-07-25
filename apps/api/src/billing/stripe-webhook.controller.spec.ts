import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";

import { STRIPE_API_VERSION } from "../config/billing.config";
import { STRIPE_CLIENT } from "./billing.tokens";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { StripeWebhookProcessorService } from "./stripe-webhook-processor.service";
import { StripeWebhookService } from "./stripe-webhook.service";

const WEBHOOK_SECRET = ["whsec", "unit", "fixture"].join("_");
const API_KEY = ["sk", "test", "unit", "fixture"].join("_");

describe("StripeWebhookController integration", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function startApplication() {
    const stripe = new Stripe(API_KEY, { apiVersion: STRIPE_API_VERSION });
    const process = vi.fn();
    const moduleRef = await Test.createTestingModule({
      controllers: [StripeWebhookController],
      providers: [
        StripeWebhookService,
        { provide: STRIPE_CLIENT, useValue: stripe },
        { provide: StripeWebhookProcessorService, useValue: { process } },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) =>
              key === "billing.stripeWebhookSecret" ? WEBHOOK_SECRET : undefined,
            ),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as { port: number };

    return {
      endpoint: `http://127.0.0.1:${address.port}/billing/webhooks/stripe`,
      process,
      stripe,
    };
  }

  it("verifies a valid signature against the untouched raw request body", async () => {
    const fixture = await startApplication();
    const payload = JSON.stringify({
      id: "evt_valid_fixture",
      object: "event",
      api_version: STRIPE_API_VERSION,
      created: 1_790_000_000,
      data: { object: { id: "cus_fixture", object: "customer" } },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: "customer.created",
    });
    const signature = fixture.stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });
    const response = await fetch(fixture.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
      body: payload,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      received: true,
      duplicate: false,
      processed: false,
    });
    expect(fixture.process).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature without invoking event processing", async () => {
    const fixture = await startApplication();
    const response = await fetch(fixture.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "invalid-signature",
      },
      body: JSON.stringify({ id: "evt_invalid_fixture", object: "event" }),
    });

    expect(response.status).toBe(400);
    expect(fixture.process).not.toHaveBeenCalled();
  });
});
