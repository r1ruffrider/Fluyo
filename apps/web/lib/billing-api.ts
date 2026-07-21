import {
  BILLING_PATHS,
  type CreateCheckoutSessionRequest,
  type CreateCheckoutSessionResponse,
} from "@fluyo/shared";

import { apiBaseUrl } from "./api-client";

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
  const checkoutUrl = new URL(data.url);

  if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") {
    throw new Error("Checkout returned an unsafe redirect URL");
  }

  return checkoutUrl.toString();
}
