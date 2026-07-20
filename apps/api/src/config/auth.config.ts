import { registerAs } from "@nestjs/config";

function supabaseIssuer(): string {
  const supabaseUrl = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${supabaseUrl}/auth/v1`;
}

export const authConfig = registerAs("auth", () => ({
  audience: process.env.SUPABASE_JWT_AUDIENCE ?? "authenticated",
  issuer: supabaseIssuer(),
  jwksUrl: process.env.SUPABASE_JWKS_URL ?? `${supabaseIssuer()}/.well-known/jwks.json`,
}));
