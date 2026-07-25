import {
  EntitlementSource,
  EntitlementStatus,
  Prisma,
  StripeSubscriptionStatus,
} from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { isUUID } from "class-validator";
import type Stripe from "stripe";

import { PrismaService } from "../database/prisma.service";
import {
  BillingPlanCatalogService,
  type ResolvedBillingPlanPrice,
} from "./billing-plan-catalog.service";
import { StripeWebhookEventLedgerService } from "./stripe-webhook-event-ledger.service";
import type {
  StripeWebhookProcessingResult,
  SupportedStripeWebhookType,
} from "./stripe-webhook.types";
import { subscriptionGrantsAccess } from "./subscription-access";

interface SubscriptionProjection {
  billingInterval: "MONTHLY" | "ANNUAL";
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  currentPeriodEnd: Date;
  currentPeriodStart: Date;
  plan: ResolvedBillingPlanPrice["plan"];
  status: StripeSubscriptionStatus;
  stripeCustomerId: string;
  stripePriceId: string;
  stripeProductId: string;
  stripeSubscriptionId: string;
  trialEnd: Date | null;
}

function objectId(value: { id: string } | string): string {
  return typeof value === "string" ? value : value.id;
}

function timestamp(value: number | null): Date | null {
  return value === null ? null : new Date(value * 1_000);
}

function subscriptionStatus(status: Stripe.Subscription.Status): StripeSubscriptionStatus {
  const normalized = status.toUpperCase() as keyof typeof StripeSubscriptionStatus;
  const result = StripeSubscriptionStatus[normalized];

  if (!result) {
    throw new Error(`Unsupported Stripe subscription status: ${status}`);
  }

  return result;
}

@Injectable()
export class StripeWebhookProcessorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: BillingPlanCatalogService,
    private readonly ledger: StripeWebhookEventLedgerService,
  ) {}

  async process(
    eventId: string,
    eventType: SupportedStripeWebhookType,
    subscription: Stripe.Subscription | null,
    occurredAt: Date,
  ): Promise<StripeWebhookProcessingResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (await this.ledger.hasProcessed(eventId, transaction)) {
          return { duplicate: true, processed: true };
        }

        await this.ledger.recordProcessed(eventId, eventType, transaction);

        if (subscription) {
          await this.synchronizeSubscription(transaction, subscription, occurredAt);
        }

        return { duplicate: false, processed: true };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (await this.ledger.hasProcessed(eventId))
      ) {
        return { duplicate: true, processed: true };
      }

      throw error;
    }
  }

  private normalizeSubscription(subscription: Stripe.Subscription): SubscriptionProjection {
    const [item] = subscription.items.data;

    if (!item || subscription.items.data.length !== 1) {
      throw new Error("Fluyo subscriptions must contain exactly one configured Price");
    }

    const resolved = this.catalog.resolveStripePrice(item.price.id);

    if (!resolved) {
      throw new Error("Stripe subscription uses an unconfigured Price");
    }

    return {
      billingInterval: resolved.price.interval === "monthly" ? "MONTHLY" : "ANNUAL",
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: timestamp(subscription.canceled_at),
      currentPeriodEnd: new Date(item.current_period_end * 1_000),
      currentPeriodStart: new Date(item.current_period_start * 1_000),
      plan: resolved.plan,
      status: subscriptionStatus(subscription.status),
      stripeCustomerId: objectId(subscription.customer),
      stripePriceId: item.price.id,
      stripeProductId: objectId(item.price.product),
      stripeSubscriptionId: subscription.id,
      trialEnd: timestamp(subscription.trial_end),
    };
  }

  private async synchronizeSubscription(
    transaction: Prisma.TransactionClient,
    subscription: Stripe.Subscription,
    occurredAt: Date,
  ): Promise<void> {
    const projection = this.normalizeSubscription(subscription);
    const userId = await this.resolveUserId(transaction, subscription, projection.stripeCustomerId);

    await this.ensureCustomerMapping(transaction, userId, projection.stripeCustomerId);
    await this.ensureSubscriptionOwnership(transaction, userId, projection);
    await transaction.stripeSubscription.upsert({
      where: { stripeSubscriptionId: projection.stripeSubscriptionId },
      create: {
        userId,
        stripeSubscriptionId: projection.stripeSubscriptionId,
        stripeCustomerId: projection.stripeCustomerId,
        planKey: projection.plan.key,
        stripeProductId: projection.stripeProductId,
        stripePriceId: projection.stripePriceId,
        billingInterval: projection.billingInterval,
        status: projection.status,
        currentPeriodStart: projection.currentPeriodStart,
        currentPeriodEnd: projection.currentPeriodEnd,
        trialEnd: projection.trialEnd,
        cancelAtPeriodEnd: projection.cancelAtPeriodEnd,
        canceledAt: projection.canceledAt,
      },
      update: {
        planKey: projection.plan.key,
        stripeProductId: projection.stripeProductId,
        stripePriceId: projection.stripePriceId,
        billingInterval: projection.billingInterval,
        status: projection.status,
        currentPeriodStart: projection.currentPeriodStart,
        currentPeriodEnd: projection.currentPeriodEnd,
        trialEnd: projection.trialEnd,
        cancelAtPeriodEnd: projection.cancelAtPeriodEnd,
        canceledAt: projection.canceledAt,
      },
      select: { id: true },
    });

    await this.synchronizeEntitlements(transaction, userId, projection, occurredAt);
  }

  private async resolveUserId(
    transaction: Prisma.TransactionClient,
    subscription: Stripe.Subscription,
    stripeCustomerId: string,
  ): Promise<string> {
    const metadataUserId = subscription.metadata.supabase_user_id;
    const customerMapping = await transaction.stripeCustomer.findUnique({
      where: { stripeCustomerId },
      select: { userId: true },
    });

    if (metadataUserId && isUUID(metadataUserId)) {
      if (customerMapping && customerMapping.userId !== metadataUserId) {
        throw new Error("Stripe Customer ownership does not match subscription metadata");
      }

      return metadataUserId;
    }

    if (customerMapping) {
      return customerMapping.userId;
    }

    throw new Error("Stripe subscription is missing a verified user mapping");
  }

  private async ensureCustomerMapping(
    transaction: Prisma.TransactionClient,
    userId: string,
    stripeCustomerId: string,
  ): Promise<void> {
    const mapping = await transaction.stripeCustomer.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    });

    if (mapping && mapping.stripeCustomerId !== stripeCustomerId) {
      throw new Error("User is already mapped to a different Stripe Customer");
    }

    if (!mapping) {
      await transaction.stripeCustomer.create({
        data: { userId, stripeCustomerId },
        select: { userId: true },
      });
    }
  }

  private async ensureSubscriptionOwnership(
    transaction: Prisma.TransactionClient,
    userId: string,
    projection: SubscriptionProjection,
  ): Promise<void> {
    const existing = await transaction.stripeSubscription.findUnique({
      where: { stripeSubscriptionId: projection.stripeSubscriptionId },
      select: { stripeCustomerId: true, userId: true },
    });

    if (
      existing &&
      (existing.userId !== userId || existing.stripeCustomerId !== projection.stripeCustomerId)
    ) {
      throw new Error("Stripe Subscription ownership cannot be reassigned");
    }
  }

  private async synchronizeEntitlements(
    transaction: Prisma.TransactionClient,
    userId: string,
    projection: SubscriptionProjection,
    occurredAt: Date,
  ): Promise<void> {
    const grantsAccess = subscriptionGrantsAccess(projection.status);
    const status = grantsAccess
      ? EntitlementStatus.ACTIVE
      : projection.status === StripeSubscriptionStatus.CANCELED
        ? EntitlementStatus.CANCELED
        : EntitlementStatus.EXPIRED;
    const endsAt = grantsAccess ? null : (projection.canceledAt ?? occurredAt);

    await transaction.entitlement.updateMany({
      where: {
        userId,
        source: EntitlementSource.STRIPE,
        sourceReference: projection.stripeSubscriptionId,
        entitlementKey: { notIn: [...projection.plan.entitlementKeys] },
      },
      data: {
        status: EntitlementStatus.EXPIRED,
        endsAt: occurredAt,
      },
    });

    for (const entitlementKey of projection.plan.entitlementKeys) {
      await transaction.entitlement.upsert({
        where: {
          userId_entitlementKey_source: {
            userId,
            entitlementKey,
            source: EntitlementSource.STRIPE,
          },
        },
        create: {
          userId,
          entitlementKey,
          source: EntitlementSource.STRIPE,
          sourceReference: projection.stripeSubscriptionId,
          status,
          startsAt: projection.currentPeriodStart,
          endsAt,
        },
        update: {
          sourceReference: projection.stripeSubscriptionId,
          status,
          startsAt: projection.currentPeriodStart,
          endsAt,
        },
        select: { id: true },
      });
    }
  }
}
