export const BILLING_INTERVALS = ["monthly", "annual"] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const FLUYO_PLUS_PLAN_KEY = "fluyo_plus";

export const BILLING_PATHS = {
  checkoutSessions: "/billing/checkout-sessions",
} as const;

export interface CreateCheckoutSessionRequest {
  planKey: string;
  interval: BillingInterval;
}

export interface CreateCheckoutSessionResponse {
  url: string;
}

export interface PublishedBillingPlan {
  key: string;
  displayName: string;
  description: string;
  entitlementKeys: string[];
  intervals: BillingInterval[];
  trialPeriodDays: number | null;
  promotionCodesAllowed: boolean;
}

export interface ActiveEntitlement {
  key: string;
  startsAt: string | null;
  endsAt: string | null;
}
