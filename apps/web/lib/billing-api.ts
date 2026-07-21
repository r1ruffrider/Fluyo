import {
  BILLING_PATHS,
  type CreateCheckoutSessionRequest,
  type CreateCheckoutSessionResponse,
  type CreatePortalSessionResponse,
} from "@fluyo/shared";

import { apiBaseUrl } from "./api-client";

function requireStripeUrl(value: string, hostname: string): string {
  const url = new URL(value);

  if (url.protocol !== "https:" || url.hostname !== hostname) {
    throw new Error("Billing provider returned an unsafe redirect URL");
  }

  return url.toString();
}

export async function createCheckoutSession(
  accessToken: string,
  input: CreateCheckoutSessionRequest,
): Promise<string> {
  const response = await fetch(`${apiBaseUrl}${BILLING_PATHS.checkoutSessions}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Checkout request failed with status ${response.status}`);
  }

  const data = (await response.json()) as CreateCheckoutSessionResponse;
  return requireStripeUrl(data.url, "checkout.stripe.com");
}

export async function createPortalSession(accessToken: string): Promise<string> {
  const response = await fetch(`${apiBaseUrl}${BILLING_PATHS.portalSessions}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Customer Portal request failed with status ${response.status}`);
  }

  const data = (await response.json()) as CreatePortalSessionResponse;
  return requireStripeUrl(data.url, "billing.stripe.com");
}
