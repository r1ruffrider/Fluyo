"use server";

import { redirect } from "next/navigation";

import { getPublicWebUrl } from "../../lib/supabase/config";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { safeReturnPath } from "../../lib/safe-return-path";

interface Credentials {
  email: string;
  password: string;
}

function readEmail(formData: FormData): string | null {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  return email.includes("@") && email.length <= 254 ? email : null;
}

function readCredentials(formData: FormData): Credentials | null {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");

  if (!email || password.length < 8 || password.length > 128) {
    return null;
  }

  return { email, password };
}

function callbackUrl(flow?: "recovery", next?: string): string {
  const url = new URL("/auth/callback", getPublicWebUrl());

  if (flow) {
    url.searchParams.set("flow", flow);
  }
  if (next) {
    url.searchParams.set("next", safeReturnPath(next));
  }

  return url.toString();
}

function loginErrorUrl(
  error: "invalid_input" | "invalid_credentials" | "signup_failed",
  next: string,
) {
  return `/login?error=${error}&next=${encodeURIComponent(next)}`;
}

export async function signIn(formData: FormData): Promise<void> {
  const next = safeReturnPath(formData.get("next"));
  const credentials = readCredentials(formData);

  if (!credentials) {
    redirect(loginErrorUrl("invalid_input", next));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    redirect(loginErrorUrl("invalid_credentials", next));
  }

  redirect(next);
}

export async function signUp(formData: FormData): Promise<void> {
  const next = safeReturnPath(formData.get("next"));
  const credentials = readCredentials(formData);

  if (!credentials) {
    redirect(loginErrorUrl("invalid_input", next));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: { emailRedirectTo: callbackUrl(undefined, next) },
  });

  if (error) {
    redirect(loginErrorUrl("signup_failed", next));
  }

  redirect(data.session ? next : `/login?message=check_email&next=${encodeURIComponent(next)}`);
}

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = readEmail(formData);

  if (!email) {
    redirect("/forgot-password?error=invalid_email");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl("recovery"),
  });

  // Always return the same result so the form cannot enumerate accounts.
  redirect("/forgot-password?message=check_email");
}

export async function updatePassword(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");

  if (password.length < 8 || password.length > 128 || password !== confirmation) {
    redirect("/reset-password?error=invalid_password");
  }

  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/forgot-password?error=invalid_recovery");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/reset-password?error=update_failed");
  }

  await supabase.auth.signOut();
  redirect("/login?message=password_updated");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
