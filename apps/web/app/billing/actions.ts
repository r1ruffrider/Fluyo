"use server";

import { redirect } from "next/navigation";

import { createPortalSession } from "../../lib/billing-api";
import { getVerifiedWebIdentity } from "../../lib/supabase/identity";

export interface PortalActionState {
  error: string | null;
}

export async function openCustomerPortal(
  previousState: PortalActionState,
): Promise<PortalActionState> {
  void previousState;
  const identity = await getVerifiedWebIdentity();

  if (!identity) {
    redirect("/login?error=authentication_required");
  }

  let portalUrl: string;

  try {
    portalUrl = await createPortalSession(identity.accessToken);
  } catch {
    return {
      error: "Subscription management is unavailable. Start a subscription first or try again.",
    };
  }

  redirect(portalUrl);
}
