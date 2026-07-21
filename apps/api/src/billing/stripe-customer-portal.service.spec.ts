import {
  BadGatewayException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { StripeCustomerPortalService } from "./stripe-customer-portal.service";
import type { StripeCustomerMappingsService } from "./stripe-customer-mappings.service";

const IDENTITY = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "learner@example.com",
};

function createFixture(options?: {
  customerId?: string | null;
  portalConfigurationId?: string | null;
  stripe?: boolean;
}) {
  const sessionsCreate = vi.fn().mockResolvedValue({
    url: "https://billing.stripe.com/p/session/example",
  });
  const stripe = {
    billingPortal: { sessions: { create: sessionsCreate } },
  } as unknown as Stripe;
  const customerId = options && "customerId" in options ? options.customerId : "cus_existing";
  const customerMappings = {
    findCustomerId: vi.fn().mockResolvedValue(customerId),
  } as unknown as StripeCustomerMappingsService;
  const portalConfigurationId =
    options && "portalConfigurationId" in options
      ? options.portalConfigurationId
      : "bpc_fluyo_placeholder";
  const configValues: Record<string, unknown> = {
    "app.webOrigin": "https://app.fluyo.example",
    "billing.stripePortalConfigurationId": portalConfigurationId ?? undefined,
  };
  const config = {
    get: vi.fn((key: string) => configValues[key]),
    getOrThrow: vi.fn((key: string) => configValues[key]),
  } as unknown as ConfigService;
  const service = new StripeCustomerPortalService(
    options?.stripe === false ? null : stripe,
    customerMappings,
    config,
  );

  return { customerMappings, service, sessionsCreate };
}

describe("StripeCustomerPortalService", () => {
  it("creates a Portal Session for the authenticated user's existing customer", async () => {
    const fixture = createFixture();

    await expect(fixture.service.createSession(IDENTITY)).resolves.toEqual({
      url: "https://billing.stripe.com/p/session/example",
    });
    expect(fixture.customerMappings.findCustomerId).toHaveBeenCalledWith(IDENTITY.id);
    expect(fixture.sessionsCreate).toHaveBeenCalledWith({
      configuration: "bpc_fluyo_placeholder",
      customer: "cus_existing",
      return_url: "https://app.fluyo.example/billing",
    });
  });

  it("rejects users without an existing Stripe Customer mapping", async () => {
    const fixture = createFixture({ customerId: null });

    await expect(fixture.service.createSession(IDENTITY)).rejects.toBeInstanceOf(NotFoundException);
    expect(fixture.sessionsCreate).not.toHaveBeenCalled();
  });

  it("uses the Stripe account's default Portal configuration when none is configured", async () => {
    const fixture = createFixture({ portalConfigurationId: null });

    await fixture.service.createSession(IDENTITY);

    expect(fixture.sessionsCreate).toHaveBeenCalledWith({
      customer: "cus_existing",
      return_url: "https://app.fluyo.example/billing",
    });
  });

  it("returns safe errors when mapping lookup or Stripe Portal creation fails", async () => {
    const lookupFailure = createFixture();
    lookupFailure.customerMappings.findCustomerId = vi
      .fn()
      .mockRejectedValue(new Error("database detail"));

    await expect(lookupFailure.service.createSession(IDENTITY)).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    const providerFailure = createFixture();
    providerFailure.sessionsCreate.mockRejectedValueOnce(new Error("provider detail"));
    await expect(providerFailure.service.createSession(IDENTITY)).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    providerFailure.sessionsCreate.mockResolvedValueOnce({ url: null });
    await expect(providerFailure.service.createSession(IDENTITY)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it("rejects Portal creation while server-side billing configuration is disabled", async () => {
    const fixture = createFixture({ stripe: false });

    await expect(fixture.service.createSession(IDENTITY)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fixture.customerMappings.findCustomerId).not.toHaveBeenCalled();
  });
});
