import { describe, expect, it } from "vitest";

import {
  BillingPlanCatalogService,
  type BillingPlanDefinition,
} from "./billing-plan-catalog.service";

const PLAN: BillingPlanDefinition = {
  key: "fluyo_plus",
  displayName: "Fluyo Plus",
  description: "Example catalog entry used only by the unit tests.",
  entitlementKeys: ["practice.unlimited", "progress.advanced"],
  prices: [
    { interval: "monthly", stripePriceId: "price_monthly_placeholder" },
    { interval: "annual", stripePriceId: "price_annual_placeholder" },
  ],
  trialPeriodDays: 7,
  promotionCodesAllowed: true,
};

describe("BillingPlanCatalogService", () => {
  it("publishes commercial metadata without exposing Stripe Price IDs", () => {
    const catalog = new BillingPlanCatalogService([PLAN]);

    const published = catalog.listPublished();

    expect(published).toEqual([
      {
        key: "fluyo_plus",
        displayName: "Fluyo Plus",
        description: PLAN.description,
        entitlementKeys: ["practice.unlimited", "progress.advanced"],
        intervals: ["monthly", "annual"],
        trialPeriodDays: 7,
        promotionCodesAllowed: true,
      },
    ]);
    expect(JSON.stringify(published)).not.toContain("price_");
  });

  it("resolves a Stripe Price ID only through the server-side catalog", () => {
    const catalog = new BillingPlanCatalogService([PLAN]);

    expect(catalog.resolvePrice("fluyo_plus", "annual")).toEqual({
      interval: "annual",
      stripePriceId: "price_annual_placeholder",
    });
    expect(catalog.resolvePrice("missing", "monthly")).toBeNull();
  });

  it("requires monthly and annual prices for every configured paid plan", () => {
    expect(
      () =>
        new BillingPlanCatalogService([
          {
            ...PLAN,
            prices: [{ interval: "monthly", stripePriceId: "price_monthly_placeholder" }],
          },
        ]),
    ).toThrow("must define monthly and annual prices");
  });

  it("rejects duplicate plan keys and malformed server-side Price IDs", () => {
    expect(() => new BillingPlanCatalogService([PLAN, PLAN])).toThrow("Billing plan keys");
    expect(
      () =>
        new BillingPlanCatalogService([
          {
            ...PLAN,
            prices: [
              { interval: "monthly", stripePriceId: "client_supplied_value" },
              { interval: "annual", stripePriceId: "price_annual_placeholder" },
            ],
          },
        ]),
    ).toThrow("invalid Stripe Price ID");
  });
});
