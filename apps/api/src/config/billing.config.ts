import { registerAs } from "@nestjs/config";

export const STRIPE_API_VERSION = "2026-06-24.dahlia";

function optionalEnvironmentValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const billingConfig = registerAs("billing", () => ({
  enabled: process.env.BILLING_ENABLED === "true",
  stripeApiVersion: STRIPE_API_VERSION,
  stripeSecretKey: optionalEnvironmentValue("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: optionalEnvironmentValue("STRIPE_WEBHOOK_SECRET"),
  stripePortalConfigurationId: optionalEnvironmentValue("STRIPE_PORTAL_CONFIGURATION_ID"),
}));
