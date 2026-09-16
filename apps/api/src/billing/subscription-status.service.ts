import type { ActiveEntitlement, BillingSubscriptionSummary } from "@fluyo/shared";
import type { BillingInterval, StripeSubscriptionStatus } from "@prisma/client";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service";
import { BillingPlanCatalogService } from "./billing-plan-catalog.service";

const STATUS_LABELS: Record<StripeSubscriptionStatus, BillingSubscriptionSummary["status"]> = {
  TRIALING: "trialing",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  UNPAID: "unpaid",
  INCOMPLETE: "incomplete",
  INCOMPLETE_EXPIRED: "incomplete_expired",
  PAUSED: "paused",
};

const INTERVAL_LABELS: Record<BillingInterval, BillingSubscriptionSummary["billingInterval"]> = {
  MONTHLY: "monthly",
  ANNUAL: "annual",
};

const ACCESS_PRIORITY: Record<StripeSubscriptionStatus, number> = {
  TRIALING: 0,
  ACTIVE: 0,
  PAST_DUE: 0,
  UNPAID: 1,
  INCOMPLETE: 1,
  PAUSED: 1,
  CANCELED: 2,
  INCOMPLETE_EXPIRED: 2,
};

interface StoredSubscription {
  planKey: string;
  status: StripeSubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
}

@Injectable()
export class SubscriptionStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: BillingPlanCatalogService,
  ) {}

  async getCurrent(
    userId: string,
    entitlements: readonly ActiveEntitlement[],
  ): Promise<BillingSubscriptionSummary | null> {
    const subscriptions = await this.prisma.stripeSubscription.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        planKey: true,
        status: true,
        billingInterval: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        trialEnd: true,
      },
    });

    const current = this.selectMostRelevant(subscriptions);

    if (!current) {
      return null;
    }

    const plan = this.catalog.resolvePlan(current.planKey);

    return {
      planKey: current.planKey,
      displayName: plan?.displayName ?? current.planKey,
      status: STATUS_LABELS[current.status],
      billingInterval: INTERVAL_LABELS[current.billingInterval],
      currentPeriodEnd: current.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: current.cancelAtPeriodEnd,
      trialEnd: current.trialEnd?.toISOString() ?? null,
      // Sourced from the entitlement table, not `current.status`: the two
      // can briefly diverge (webhook lag, a manual revocation), and
      // entitlements are the authorization source of truth (ADR 0003).
      accessGranted: entitlements.length > 0,
    };
  }

  private selectMostRelevant(
    subscriptions: readonly StoredSubscription[],
  ): StoredSubscription | null {
    if (subscriptions.length === 0) {
      return null;
    }

    // `subscriptions` is pre-sorted by `updatedAt` descending, and `Array#sort`
    // is stable, so the most recently updated subscription wins ties within
    // the same access-priority tier.
    const [mostRelevant] = [...subscriptions].sort(
      (a, b) => ACCESS_PRIORITY[a.status] - ACCESS_PRIORITY[b.status],
    );

    return mostRelevant ?? null;
  }
}
