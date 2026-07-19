import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseConfig } from "./config";

export function createSupabaseBrowserClient() {
  const { publishableKey, url } = getPublicSupabaseConfig();
  return createBrowserClient(url, publishableKey);
}
