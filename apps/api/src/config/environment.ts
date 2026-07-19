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

  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol");
  }

  if (nodeEnv === "production") {
    if (!supabaseUrl.startsWith("https://") || !supabaseJwksUrl.startsWith("https://")) {
      throw new Error("Supabase URLs must use HTTPS in production");
    }
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
  };
}
