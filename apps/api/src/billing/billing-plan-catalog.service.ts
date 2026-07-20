import type { BillingInterval, PublishedBillingPlan } from "@fluyo/shared";
import { Inject, Injectable } from "@nestjs/common";

import { BILLING_PLAN_DEFINITIONS } from "./billing.tokens";

export interface BillingPlanPriceDefinition {
  interval: BillingInterval;
  stripePriceId: string;
}

export interface BillingPlanDefinition {
  key: string;
  displayName: string;
  description: string;
  entitlementKeys: readonly string[];
  prices: readonly BillingPlanPriceDefinition[];
  trialPeriodDays: number | null;
  promotionCodesAllowed: boolean;
}

function requireUniqueValues(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must be unique`);
  }
}

function validatePlan(plan: BillingPlanDefinition): void {
  if (!/^[a-z][a-z0-9_-]{1,99}$/u.test(plan.key)) {
    throw new Error(`Invalid billing plan key: ${plan.key}`);
  }

  if (!plan.displayName.trim() || !plan.description.trim()) {
    throw new Error(`Billing plan ${plan.key} requires display text`);
  }

  if (plan.entitlementKeys.length === 0) {
    throw new Error(`Billing plan ${plan.key} requires at least one entitlement`);
  }

  requireUniqueValues(plan.entitlementKeys, `Billing plan ${plan.key} entitlement keys`);

  const intervals = plan.prices.map((price) => price.interval);
  requireUniqueValues(intervals, `Billing plan ${plan.key} intervals`);

  if (!intervals.includes("monthly") || !intervals.includes("annual")) {
    throw new Error(`Billing plan ${plan.key} must define monthly and annual prices`);
  }

  for (const price of plan.prices) {
    if (!price.stripePriceId.startsWith("price_")) {
      throw new Error(`Billing plan ${plan.key} has an invalid Stripe Price ID`);
    }
  }

  if (
    plan.trialPeriodDays !== null &&
    (!Number.isInteger(plan.trialPeriodDays) ||
      plan.trialPeriodDays < 0 ||
      plan.trialPeriodDays > 365)
  ) {
    throw new Error(`Billing plan ${plan.key} has an invalid trial period`);
  }
}

@Injectable()
export class BillingPlanCatalogService {
  private readonly plansByKey: ReadonlyMap<string, BillingPlanDefinition>;

  constructor(
    @Inject(BILLING_PLAN_DEFINITIONS)
    plans: readonly BillingPlanDefinition[],
  ) {
    requireUniqueValues(
      plans.map((plan) => plan.key),
      "Billing plan keys",
    );
    plans.forEach(validatePlan);
    this.plansByKey = new Map(plans.map((plan) => [plan.key, plan]));
  }

  listPublished(): PublishedBillingPlan[] {
    return [...this.plansByKey.values()].map((plan) => ({
      key: plan.key,
      displayName: plan.displayName,
      description: plan.description,
      entitlementKeys: [...plan.entitlementKeys],
      intervals: plan.prices.map((price) => price.interval),
      trialPeriodDays: plan.trialPeriodDays,
      promotionCodesAllowed: plan.promotionCodesAllowed,
    }));
  }

  resolvePrice(planKey: string, interval: BillingInterval): BillingPlanPriceDefinition | null {
    return (
      this.plansByKey.get(planKey)?.prices.find((price) => price.interval === interval) ?? null
    );
  }

  resolvePlan(planKey: string): BillingPlanDefinition | null {
    return this.plansByKey.get(planKey) ?? null;
  }
}
