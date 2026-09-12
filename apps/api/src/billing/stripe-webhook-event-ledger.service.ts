import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../database/prisma.service";

type StripeWebhookEventStore = Pick<Prisma.TransactionClient, "stripeWebhookEvent">;

@Injectable()
export class StripeWebhookEventLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async hasProcessed(
    eventId: string,
    store: StripeWebhookEventStore = this.prisma,
  ): Promise<boolean> {
    return (
      (await store.stripeWebhookEvent.findUnique({
        where: { id: eventId },
        select: { id: true },
      })) !== null
    );
  }

  async recordProcessed(
    eventId: string,
    type: string,
    store: StripeWebhookEventStore = this.prisma,
  ): Promise<void> {
    await store.stripeWebhookEvent.create({
      data: { id: eventId, type },
      select: { id: true },
    });
  }
}
