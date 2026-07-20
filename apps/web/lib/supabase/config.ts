export interface PublicSupabaseConfig {
  publishableKey: string;
  url: string;
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase public configuration is missing");
  }

  return { publishableKey, url };
}

export function getPublicWebUrl(): string {
  const value = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
  return new URL(value).toString().replace(/\/$/, "");
}
