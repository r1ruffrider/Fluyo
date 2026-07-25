const NODE_ENVIRONMENTS = new Set(["development", "test", "production"]);

function readString(config: Record<string, unknown>, key: string, defaultValue?: string): string {
  const value = config[key];

  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(`Missing required environment variable: ${key}`);
}

function readPort(config: Record<string, unknown>, key: string, defaultValue: number): number {
  const value = Number(readString(config, key, String(defaultValue)));

  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`${key} must be an integer between 1 and 65535`);
  }

  return value;
}

function readUrl(config: Record<string, unknown>, key: string, defaultValue?: string): string {
  const value = readString(config, key, defaultValue);

  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }
}

function readBoolean(config: Record<string, unknown>, key: string, defaultValue: boolean): boolean {
  const value = config[key];

  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  throw new Error(`${key} must be true or false`);
}

function readOptionalString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = readString(config, "NODE_ENV", "development");

  if (!NODE_ENVIRONMENTS.has(nodeEnv)) {
    throw new Error("NODE_ENV must be development, test, or production");
  }

  const databaseUrl = readString(config, "DATABASE_URL");
  const supabaseUrl = readUrl(config, "SUPABASE_URL");
  const supabaseJwksUrl = readUrl(
    config,
    "SUPABASE_JWKS_URL",
    `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
  );
  const billingEnabled = readBoolean(config, "BILLING_ENABLED", false);
  const stripeSecretKey = readOptionalString(config, "STRIPE_SECRET_KEY");
  const stripePriceFluyoPlusMonthly = readOptionalString(config, "STRIPE_PRICE_FLUYO_PLUS_MONTHLY");
  const stripePriceFluyoPlusAnnual = readOptionalString(config, "STRIPE_PRICE_FLUYO_PLUS_ANNUAL");
  const stripeWebhookSecret = readOptionalString(config, "STRIPE_WEBHOOK_SECRET");
  const stripePortalConfigurationId = readOptionalString(config, "STRIPE_PORTAL_CONFIGURATION_ID");

  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol");
  }

  if (nodeEnv === "production") {
    if (!supabaseUrl.startsWith("https://") || !supabaseJwksUrl.startsWith("https://")) {
      throw new Error("Supabase URLs must use HTTPS in production");
    }
  }

  if (billingEnabled) {
    if (!stripeSecretKey) {
      throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
    }

    if (!/^(?:rk|sk)_(?:test|live)_/u.test(stripeSecretKey)) {
      throw new Error("STRIPE_SECRET_KEY must be a Stripe restricted or secret API key");
    }

    if (!stripePriceFluyoPlusMonthly) {
      throw new Error("Missing required environment variable: STRIPE_PRICE_FLUYO_PLUS_MONTHLY");
    }

    if (!stripePriceFluyoPlusAnnual) {
      throw new Error("Missing required environment variable: STRIPE_PRICE_FLUYO_PLUS_ANNUAL");
    }

    if (!stripeWebhookSecret) {
      throw new Error("Missing required environment variable: STRIPE_WEBHOOK_SECRET");
    }
  }

  for (const [name, priceId] of [
    ["STRIPE_PRICE_FLUYO_PLUS_MONTHLY", stripePriceFluyoPlusMonthly],
    ["STRIPE_PRICE_FLUYO_PLUS_ANNUAL", stripePriceFluyoPlusAnnual],
  ] as const) {
    if (priceId && !priceId.startsWith("price_")) {
      throw new Error(`${name} must be a Stripe Price ID`);
    }
  }

  if (stripeWebhookSecret && !stripeWebhookSecret.startsWith("whsec_")) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be a Stripe webhook signing secret");
  }

  if (stripePortalConfigurationId && !stripePortalConfigurationId.startsWith("bpc_")) {
    throw new Error("STRIPE_PORTAL_CONFIGURATION_ID must be a Stripe Portal configuration ID");
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    API_PORT: readPort(config, "API_PORT", 4000),
    WEB_ORIGIN: readUrl(config, "WEB_ORIGIN", "http://localhost:3000"),
    DATABASE_URL: databaseUrl,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_JWKS_URL: supabaseJwksUrl,
    SUPABASE_JWT_AUDIENCE: readString(config, "SUPABASE_JWT_AUDIENCE", "authenticated"),
    BILLING_ENABLED: billingEnabled,
    STRIPE_SECRET_KEY: stripeSecretKey,
    STRIPE_PRICE_FLUYO_PLUS_MONTHLY: stripePriceFluyoPlusMonthly,
    STRIPE_PRICE_FLUYO_PLUS_ANNUAL: stripePriceFluyoPlusAnnual,
    STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
    STRIPE_PORTAL_CONFIGURATION_ID: stripePortalConfigurationId,
  };
}
