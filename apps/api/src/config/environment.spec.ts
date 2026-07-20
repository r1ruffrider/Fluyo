import { describe, expect, it } from "vitest";

import { validateEnvironment } from "./environment";

const BASE_ENVIRONMENT = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://fluyo:fluyo@localhost:5432/fluyo",
  SUPABASE_URL: "https://identity.example.com",
};
const TEST_STRIPE_SECRET_KEY = ["rk", "test", "placeholder"].join("_");
const TEST_STRIPE_WEBHOOK_SECRET = ["whsec", "placeholder"].join("_");

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
        STRIPE_WEBHOOK_SECRET: TEST_STRIPE_WEBHOOK_SECRET,
        STRIPE_PORTAL_CONFIGURATION_ID: "bpc_placeholder",
      }),
    ).toMatchObject({
      BILLING_ENABLED: true,
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
        STRIPE_SECRET_KEY: "pk_test_not_server_side",
        STRIPE_WEBHOOK_SECRET: TEST_STRIPE_WEBHOOK_SECRET,
      }),
    ).toThrow("restricted or secret API key");
  });
});
