import type { StripeSubscriptionStatus } from "@prisma/client";

const ACCESS_GRANTING_STATUSES = new Set<StripeSubscriptionStatus>([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
]);

export function subscriptionGrantsAccess(status: StripeSubscriptionStatus): boolean {
  return ACCESS_GRANTING_STATUSES.has(status);
}
