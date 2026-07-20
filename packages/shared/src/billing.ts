export const BILLING_INTERVALS = ["monthly", "annual"] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];

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
