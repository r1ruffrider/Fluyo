import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SupabaseJwtGuard } from "../auth/supabase-jwt.guard";
import { SupabaseJwtService } from "../auth/supabase-jwt.service";
import { BillingController } from "./billing.controller";
import { StripeCheckoutService } from "./stripe-checkout.service";
import { StripeCustomerPortalService } from "./stripe-customer-portal.service";

const IDENTITY = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "learner@example.com",
};

describe("BillingController integration", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function startApplication(verify: ReturnType<typeof vi.fn>) {
    const createCheckoutSession = vi.fn().mockResolvedValue({
      url: "https://checkout.stripe.com/example",
    });
    const createPortalSession = vi.fn().mockResolvedValue({
      url: "https://billing.stripe.com/p/session/example",
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        SupabaseJwtGuard,
        { provide: SupabaseJwtService, useValue: { verify } },
        { provide: StripeCheckoutService, useValue: { createSession: createCheckoutSession } },
        {
          provide: StripeCustomerPortalService,
          useValue: { createSession: createPortalSession },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as { port: number };

    return {
      createCheckoutSession,
      createPortalSession,
      checkoutEndpoint: `http://127.0.0.1:${address.port}/billing/checkout-sessions`,
      portalEndpoint: `http://127.0.0.1:${address.port}/billing/portal-sessions`,
    };
  }

  it("rejects unauthenticated Checkout requests", async () => {
    const fixture = await startApplication(vi.fn());
    const response = await fetch(fixture.checkoutEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planKey: "fluyo_plus", interval: "monthly" }),
    });

    expect(response.status).toBe(401);
    expect(fixture.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("passes only the verified identity and approved request contract to Checkout", async () => {
    const verify = vi.fn().mockResolvedValue(IDENTITY);
    const fixture = await startApplication(verify);
    const response = await fetch(fixture.checkoutEndpoint, {
      method: "POST",
      headers: {
        authorization: "Bearer verified-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ planKey: "fluyo_plus", interval: "annual" }),
    });

    expect(response.status).toBe(201);
    expect(verify).toHaveBeenCalledWith("verified-token");
    expect(fixture.createCheckoutSession).toHaveBeenCalledWith(IDENTITY, {
      planKey: "fluyo_plus",
      interval: "annual",
    });
  });

  it("rejects unauthenticated Customer Portal requests", async () => {
    const fixture = await startApplication(vi.fn());
    const response = await fetch(fixture.portalEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(401);
    expect(fixture.createPortalSession).not.toHaveBeenCalled();
  });

  it("passes only the verified identity to Customer Portal creation", async () => {
    const verify = vi.fn().mockResolvedValue(IDENTITY);
    const fixture = await startApplication(verify);
    const response = await fetch(fixture.portalEndpoint, {
      method: "POST",
      headers: {
        authorization: "Bearer verified-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(201);
    expect(fixture.createPortalSession).toHaveBeenCalledWith(IDENTITY);
  });

  it("rejects browser-supplied Stripe Customer IDs and return URLs", async () => {
    const fixture = await startApplication(vi.fn().mockResolvedValue(IDENTITY));
    const response = await fetch(fixture.portalEndpoint, {
      method: "POST",
      headers: {
        authorization: "Bearer verified-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        customerId: "cus_browser_value",
        returnUrl: "https://attacker.example",
      }),
    });

    expect(response.status).toBe(400);
    expect(fixture.createPortalSession).not.toHaveBeenCalled();
  });
});
