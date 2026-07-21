import { FLUYO_PLUS_PLAN_KEY } from "@fluyo/shared";
import { type FactoryProvider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { BillingPlanDefinition } from "./billing-plan-catalog.service";
import { BILLING_PLAN_DEFINITIONS } from "./billing.tokens";

export function createBillingPlanDefinitions(
  config: ConfigService,
): readonly BillingPlanDefinition[] {
  if (!config.get<boolean>("billing.enabled")) {
    return [];
  }

  return [
    {
      key: FLUYO_PLUS_PLAN_KEY,
      displayName: "Fluyo Plus",
      description: "Unlimited daily practice and the complete Fluyo learning experience.",
      entitlementKeys: [
        "practice.unlimited",
        "charla.unlimited",
        "grammar.full",
        "review.full",
        "offline.packs",
        "camera.translate",
      ],
      prices: [
        {
          interval: "monthly",
          stripePriceId: config.getOrThrow<string>("billing.stripePriceFluyoPlusMonthly"),
        },
        {
          interval: "annual",
          stripePriceId: config.getOrThrow<string>("billing.stripePriceFluyoPlusAnnual"),
        },
      ],
      trialPeriodDays: null,
      promotionCodesAllowed: true,
    },
  ];
}

export const billingPlanDefinitionsProvider: FactoryProvider<readonly BillingPlanDefinition[]> = {
  provide: BILLING_PLAN_DEFINITIONS,
  inject: [ConfigService],
  useFactory: createBillingPlanDefinitions,
};
