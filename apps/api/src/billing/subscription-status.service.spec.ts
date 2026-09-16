import { describe, expect, it, vi } from "vitest";

import type { BillingPlanCatalogService } from "./billing-plan-catalog.service";
import type { PrismaService } from "../database/prisma.service";
import { SubscriptionStatusService } from "./subscription-status.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function createPrismaMock() {
  return {
    stripeSubscription: {
      findMany: vi.fn(),
    },
  };
}

function createCatalogMock(displayName: string | null) {
  return {
    resolvePlan: vi.fn().mockReturnValue(displayName ? { key: "fluyo_plus", displayName } : null),
  };
}

describe("SubscriptionStatusService", () => {
  it("returns null when the user has no Stripe subscription", async () => {
    const prisma = createPrismaMock();
    prisma.stripeSubscription.findMany.mockResolvedValue([]);
    const service = new SubscriptionStatusService(
      prisma as unknown as PrismaService,
      createCatalogMock(null) as unknown as BillingPlanCatalogService,
    );

    await expect(service.getCurrent(USER_ID)).resolves.toBeNull();
  });

  it("normalizes the subscription into a provider-neutral, display-safe summary", async () => {
    const prisma = createPrismaMock();
    prisma.stripeSubscription.findMany.mockResolvedValue([
      {
        planKey: "fluyo_plus",
        status: "ACTIVE",
        billingInterval: "MONTHLY",
        currentPeriodEnd: new Date("2026-08-20T12:00:00.000Z"),
        cancelAtPeriodEnd: false,
        trialEnd: null,
      },
    ]);
    const service = new SubscriptionStatusService(
      prisma as unknown as PrismaService,
      createCatalogMock("Fluyo Plus") as unknown as BillingPlanCatalogService,
    );

    await expect(service.getCurrent(USER_ID)).resolves.toEqual({
      planKey: "fluyo_plus",
      displayName: "Fluyo Plus",
      status: "active",
      billingInterval: "monthly",
      currentPeriodEnd: "2026-08-20T12:00:00.000Z",
      cancelAtPeriodEnd: false,
      trialEnd: null,
      accessGranted: true,
    });
  });

  it("falls back to the plan key when the catalog no longer defines the plan", async () => {
    const prisma = createPrismaMock();
    prisma.stripeSubscription.findMany.mockResolvedValue([
      {
        planKey: "retired_plan",
        status: "CANCELED",
        billingInterval: "ANNUAL",
        currentPeriodEnd: new Date("2026-08-20T12:00:00.000Z"),
        cancelAtPeriodEnd: true,
        trialEnd: null,
      },
    ]);
    const service = new SubscriptionStatusService(
      prisma as unknown as PrismaService,
      createCatalogMock(null) as unknown as BillingPlanCatalogService,
    );

    const result = await service.getCurrent(USER_ID);

    expect(result?.displayName).toBe("retired_plan");
    expect(result?.accessGranted).toBe(false);
  });

  it("prefers an access-granting subscription over a more recently updated canceled one", async () => {
    const prisma = createPrismaMock();
    prisma.stripeSubscription.findMany.mockResolvedValue([
      {
        planKey: "fluyo_plus",
        status: "CANCELED",
        billingInterval: "MONTHLY",
        currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
        cancelAtPeriodEnd: false,
        trialEnd: null,
      },
      {
        planKey: "fluyo_plus",
        status: "PAST_DUE",
        billingInterval: "MONTHLY",
        currentPeriodEnd: new Date("2026-06-01T00:00:00.000Z"),
        cancelAtPeriodEnd: false,
        trialEnd: null,
      },
    ]);
    const service = new SubscriptionStatusService(
      prisma as unknown as PrismaService,
      createCatalogMock("Fluyo Plus") as unknown as BillingPlanCatalogService,
    );

    const result = await service.getCurrent(USER_ID);

    expect(result?.status).toBe("past_due");
    expect(result?.accessGranted).toBe(true);
  });

  it("breaks ties within the same access tier using the most recently updated subscription", async () => {
    const prisma = createPrismaMock();
    // Prisma already returns rows ordered by `updatedAt desc`; the most
    // recently updated equally-ranked row is listed first.
    prisma.stripeSubscription.findMany.mockResolvedValue([
      {
        planKey: "fluyo_plus",
        status: "ACTIVE",
        billingInterval: "ANNUAL",
        currentPeriodEnd: new Date("2027-01-01T00:00:00.000Z"),
        cancelAtPeriodEnd: false,
        trialEnd: null,
      },
      {
        planKey: "fluyo_plus",
        status: "TRIALING",
        billingInterval: "MONTHLY",
        currentPeriodEnd: new Date("2026-06-01T00:00:00.000Z"),
        cancelAtPeriodEnd: false,
        trialEnd: new Date("2026-06-01T00:00:00.000Z"),
      },
    ]);
    const service = new SubscriptionStatusService(
      prisma as unknown as PrismaService,
      createCatalogMock("Fluyo Plus") as unknown as BillingPlanCatalogService,
    );

    const result = await service.getCurrent(USER_ID);

    expect(result?.status).toBe("active");
    expect(result?.billingInterval).toBe("annual");
  });
});
