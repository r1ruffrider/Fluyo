"use server";

import { BILLING_INTERVALS, FLUYO_PLUS_PLAN_KEY, type BillingInterval } from "@fluyo/shared";
import { redirect } from "next/navigation";

import { createCheckoutSession } from "../../lib/billing-api";
import { getVerifiedWebIdentity } from "../../lib/supabase/identity";

export interface CheckoutActionState {
  error: string | null;
}

export async function startCheckout(
  _previousState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const identity = await getVerifiedWebIdentity();

  if (!identity) {
    redirect("/login?error=authentication_required");
  }

  const interval = String(formData.get("interval") ?? "") as BillingInterval;

  if (!BILLING_INTERVALS.includes(interval)) {
    return { error: "Choose a valid billing interval." };
  }

  let checkoutUrl: string;

  try {
    checkoutUrl = await createCheckoutSession(identity.accessToken, {
      interval,
      planKey: FLUYO_PLUS_PLAN_KEY,
    });
  } catch {
    return {
      error: "Stripe Checkout is temporarily unavailable. Please try again.",
    };
  }

  redirect(checkoutUrl);
}
