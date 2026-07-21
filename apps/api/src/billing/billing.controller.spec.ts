import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SupabaseJwtGuard } from "../auth/supabase-jwt.guard";
import { SupabaseJwtService } from "../auth/supabase-jwt.service";
import { BillingController } from "./billing.controller";
import { StripeCheckoutService } from "./stripe-checkout.service";

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
    const createSession = vi.fn().mockResolvedValue({
      url: "https://checkout.stripe.com/example",
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        SupabaseJwtGuard,
        { provide: SupabaseJwtService, useValue: { verify } },
        { provide: StripeCheckoutService, useValue: { createSession } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as { port: number };

    return {
      createSession,
      endpoint: `http://127.0.0.1:${address.port}/billing/checkout-sessions`,
    };
  }

  it("rejects unauthenticated Checkout requests", async () => {
    const fixture = await startApplication(vi.fn());
    const response = await fetch(fixture.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planKey: "fluyo_plus", interval: "monthly" }),
    });

    expect(response.status).toBe(401);
    expect(fixture.createSession).not.toHaveBeenCalled();
  });

  it("passes only the verified identity and approved request contract to Checkout", async () => {
    const verify = vi.fn().mockResolvedValue(IDENTITY);
    const fixture = await startApplication(verify);
    const response = await fetch(fixture.endpoint, {
      method: "POST",
      headers: {
        authorization: "Bearer verified-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ planKey: "fluyo_plus", interval: "annual" }),
    });

    expect(response.status).toBe(201);
    expect(verify).toHaveBeenCalledWith("verified-token");
    expect(fixture.createSession).toHaveBeenCalledWith(IDENTITY, {
      planKey: "fluyo_plus",
      interval: "annual",
    });
  });
});
