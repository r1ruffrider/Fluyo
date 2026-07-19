"use server";

import { redirect } from "next/navigation";

import { updateCurrentProfile } from "../../lib/profile-api";
import { getVerifiedWebIdentity } from "../../lib/supabase/identity";

export async function saveProfile(formData: FormData): Promise<void> {
  const identity = await getVerifiedWebIdentity();

  if (!identity) {
    redirect("/login?error=authentication_required");
  }

  const rawDisplayName = String(formData.get("displayName") ?? "");
  const displayName = rawDisplayName.trim() || null;

  if (displayName && displayName.length > 80) {
    redirect("/account?error=invalid_profile");
  }

  try {
    await updateCurrentProfile(identity.accessToken, { displayName });
  } catch {
    redirect("/account?error=profile_unavailable");
  }

  redirect("/account?message=profile_saved");
}
