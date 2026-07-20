import type { StripeSubscriptionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { subscriptionGrantsAccess } from "./subscription-access";

describe("subscriptionGrantsAccess", () => {
  it.each<[StripeSubscriptionStatus, boolean]>([
    ["TRIALING", true],
    ["ACTIVE", true],
    ["PAST_DUE", true],
    ["CANCELED", false],
    ["UNPAID", false],
    ["INCOMPLETE", false],
    ["INCOMPLETE_EXPIRED", false],
    ["PAUSED", false],
  ])("maps %s to access=%s", (status, expected) => {
    expect(subscriptionGrantsAccess(status)).toBe(expected);
  });
});
