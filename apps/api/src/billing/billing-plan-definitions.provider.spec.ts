import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

import { createBillingPlanDefinitions } from "./billing-plan-definitions.provider";

describe("createBillingPlanDefinitions", () => {
  it("keeps the commercial catalog disabled until billing is configured", () => {
    const config = {
      get: vi.fn().mockReturnValue(false),
      getOrThrow: vi.fn(),
    } as unknown as ConfigService;

    expect(createBillingPlanDefinitions(config)).toEqual([]);
    expect(config.getOrThrow).not.toHaveBeenCalled();
  });

  it("builds monthly and annual prices only from server configuration", () => {
    const values: Record<string, unknown> = {
      "billing.enabled": true,
      "billing.stripePriceFluyoPlusMonthly": "price_monthly_placeholder",
      "billing.stripePriceFluyoPlusAnnual": "price_annual_placeholder",
    };
    const config = {
      get: vi.fn((key: string) => values[key]),
      getOrThrow: vi.fn((key: string) => values[key]),
    } as unknown as ConfigService;

    expect(createBillingPlanDefinitions(config)).toMatchObject([
      {
        key: "fluyo_plus",
        prices: [
          { interval: "monthly", stripePriceId: "price_monthly_placeholder" },
          { interval: "annual", stripePriceId: "price_annual_placeholder" },
        ],
        promotionCodesAllowed: true,
      },
    ]);
  });
});
