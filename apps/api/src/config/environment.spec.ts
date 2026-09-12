import { describe, expect, it } from "vitest";

import { validateEnvironment } from "./environment";

const BASE_ENVIRONMENT = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://fluyo:fluyo@localhost:5432/fluyo",
  SUPABASE_URL: "https://identity.example.com",
};
const TEST_STRIPE_SECRET_KEY = ["rk", "test", "placeholder"].join("_");
const TEST_STRIPE_WEBHOOK_SECRET = ["whsec", "placeholder"].join("_");
const TEST_MONTHLY_PRICE = ["price", "monthly", "placeholder"].join("_");
const TEST_ANNUAL_PRICE = ["price", "annual", "placeholder"].join("_");

describe("validateEnvironment", () => {
  it("keeps billing disabled without requiring Stripe credentials", () => {
    expect(validateEnvironment(BASE_ENVIRONMENT)).toMatchObject({
      BILLING_ENABLED: false,
      STRIPE_SECRET_KEY: undefined,
      STRIPE_WEBHOOK_SECRET: undefined,
    });
  });

  it("accepts server-only Stripe configuration when billing is enabled", () => {
    expect(
      validateEnvironment({
        ...BASE_ENVIRONMENT,
        BILLING_ENABLED: "true",
        STRIPE_SECRET_KEY: TEST_STRIPE_SECRET_KEY,
        STRIPE_PRICE_FLUYO_PLUS_MONTHLY: TEST_MONTHLY_PRICE,
        STRIPE_PRICE_FLUYO_PLUS_ANNUAL: TEST_ANNUAL_PRICE,
        STRIPE_WEBHOOK_SECRET: TEST_STRIPE_WEBHOOK_SECRET,
        STRIPE_PORTAL_CONFIGURATION_ID: "bpc_placeholder",
      }),
    ).toMatchObject({
      BILLING_ENABLED: true,
      STRIPE_PRICE_FLUYO_PLUS_MONTHLY: TEST_MONTHLY_PRICE,
      STRIPE_PRICE_FLUYO_PLUS_ANNUAL: TEST_ANNUAL_PRICE,
      STRIPE_PORTAL_CONFIGURATION_ID: "bpc_placeholder",
    });
  });

  it("requires Stripe credentials when billing is enabled", () => {
    expect(() => validateEnvironment({ ...BASE_ENVIRONMENT, BILLING_ENABLED: "true" })).toThrow(
      "STRIPE_SECRET_KEY",
    );
  });

  it("rejects public or malformed Stripe credential values", () => {
    expect(() =>
      validateEnvironment({
        ...BASE_ENVIRONMENT,
        BILLING_ENABLED: "true",
        STRIPE_SECRET_KEY: ["pk", "test", "not-server-side"].join("_"),
        STRIPE_PRICE_FLUYO_PLUS_MONTHLY: TEST_MONTHLY_PRICE,
        STRIPE_PRICE_FLUYO_PLUS_ANNUAL: TEST_ANNUAL_PRICE,
      }),
    ).toThrow("restricted or secret API key");
  });

  it("requires both server-controlled Checkout Price IDs", () => {
    expect(() =>
      validateEnvironment({
        ...BASE_ENVIRONMENT,
        BILLING_ENABLED: "true",
        STRIPE_SECRET_KEY: TEST_STRIPE_SECRET_KEY,
      }),
    ).toThrow("STRIPE_PRICE_FLUYO_PLUS_MONTHLY");

    expect(() =>
      validateEnvironment({
        ...BASE_ENVIRONMENT,
        BILLING_ENABLED: "true",
        STRIPE_SECRET_KEY: TEST_STRIPE_SECRET_KEY,
        STRIPE_PRICE_FLUYO_PLUS_MONTHLY: TEST_MONTHLY_PRICE,
      }),
    ).toThrow("STRIPE_PRICE_FLUYO_PLUS_ANNUAL");
  });

  it("requires signed webhook configuration when billing is enabled", () => {
    expect(() =>
      validateEnvironment({
        ...BASE_ENVIRONMENT,
        BILLING_ENABLED: "true",
        STRIPE_SECRET_KEY: TEST_STRIPE_SECRET_KEY,
        STRIPE_PRICE_FLUYO_PLUS_MONTHLY: TEST_MONTHLY_PRICE,
        STRIPE_PRICE_FLUYO_PLUS_ANNUAL: TEST_ANNUAL_PRICE,
      }),
    ).toThrow("STRIPE_WEBHOOK_SECRET");
  });

  it("validates webhook and optional Portal configuration when supplied", () => {
    expect(() =>
      validateEnvironment({
        ...BASE_ENVIRONMENT,
        STRIPE_WEBHOOK_SECRET: "not-a-webhook-secret",
      }),
    ).toThrow("webhook signing secret");

    expect(
      validateEnvironment({
        ...BASE_ENVIRONMENT,
        STRIPE_WEBHOOK_SECRET: TEST_STRIPE_WEBHOOK_SECRET,
      }),
    ).toMatchObject({ STRIPE_WEBHOOK_SECRET: TEST_STRIPE_WEBHOOK_SECRET });
  });
});
