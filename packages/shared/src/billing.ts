export const BILLING_INTERVALS = ["monthly", "annual"] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const FLUYO_PLUS_PLAN_KEY = "fluyo_plus";

export const BILLING_PATHS = {
  checkoutSessions: "/billing/checkout-sessions",
  portalSessions: "/billing/portal-sessions",
  status: "/billing/status",
} as const;

export const BILLING_SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;

export type BillingSubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number];

export interface CreateCheckoutSessionRequest {
  planKey: string;
  interval: BillingInterval;
}

export interface CreateCheckoutSessionResponse {
  url: string;
}

export interface CreatePortalSessionResponse {
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

export interface BillingSubscriptionSummary {
  planKey: string;
  displayName: string;
  status: BillingSubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  accessGranted: boolean;
}

export interface BillingStatusResponse {
  subscription: BillingSubscriptionSummary | null;
  entitlements: ActiveEntitlement[];
}
