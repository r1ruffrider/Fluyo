CREATE TYPE "BillingInterval" AS ENUM ('monthly', 'annual');

CREATE TYPE "StripeSubscriptionStatus" AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused'
);

CREATE TYPE "EntitlementSource" AS ENUM ('stripe', 'manual', 'revenuecat');

CREATE TYPE "EntitlementStatus" AS ENUM ('active', 'canceled', 'expired');

ALTER TABLE "user_profiles"
    ADD COLUMN "subscription_tier" VARCHAR(50) NOT NULL DEFAULT 'free',
    ADD COLUMN "revenuecat_app_user_id" TEXT;

CREATE TABLE "stripe_customers" (
    "user_id" UUID NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_customers_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "stripe_customers_stripe_customer_id_key" UNIQUE ("stripe_customer_id"),
    CONSTRAINT "stripe_customers_customer_user_key" UNIQUE ("stripe_customer_id", "user_id")
);

COMMENT ON COLUMN "stripe_customers"."user_id" IS 'Verified Supabase Auth user UUID';

CREATE TABLE "stripe_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "plan_key" VARCHAR(100) NOT NULL,
    "stripe_product_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "billing_interval" "BillingInterval" NOT NULL,
    "status" "StripeSubscriptionStatus" NOT NULL,
    "current_period_start" TIMESTAMPTZ(6),
    "current_period_end" TIMESTAMPTZ(6),
    "trial_end" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stripe_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id"),
    CONSTRAINT "stripe_subscriptions_customer_user_fkey" FOREIGN KEY ("stripe_customer_id", "user_id")
        REFERENCES "stripe_customers" ("stripe_customer_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "stripe_subscriptions_user_id_idx" ON "stripe_subscriptions" ("user_id");
CREATE INDEX "stripe_subscriptions_customer_id_idx" ON "stripe_subscriptions" ("stripe_customer_id");

CREATE TABLE "entitlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "entitlement_key" VARCHAR(100) NOT NULL,
    "source" "EntitlementSource" NOT NULL DEFAULT 'manual',
    "source_reference" TEXT,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'active',
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "entitlements_user_key_source_key" UNIQUE ("user_id", "entitlement_key", "source")
);

COMMENT ON COLUMN "entitlements"."entitlement_key" IS 'Provider-neutral capability key used by application authorization';

CREATE INDEX "entitlements_user_status_idx" ON "entitlements" ("user_id", "status");

CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

COMMENT ON TABLE "stripe_webhook_events" IS 'Idempotency ledger populated only after successful signed Stripe event processing';
