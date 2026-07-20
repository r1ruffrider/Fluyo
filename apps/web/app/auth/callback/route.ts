import { NextResponse } from "next/server";

import { getPublicWebUrl } from "../../../lib/supabase/config";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flow = requestUrl.searchParams.get("flow");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=invalid_callback", getPublicWebUrl()));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  const destination = error
    ? "/login?error=invalid_callback"
    : flow === "recovery"
      ? "/reset-password"
      : "/account";

  return NextResponse.redirect(new URL(destination, getPublicWebUrl()));
}
