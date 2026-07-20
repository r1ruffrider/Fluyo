import { Injectable } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service";

@Injectable()
export class StripeWebhookEventLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async hasProcessed(eventId: string): Promise<boolean> {
    return (
      (await this.prisma.stripeWebhookEvent.findUnique({
        where: { id: eventId },
        select: { id: true },
      })) !== null
    );
  }

  async recordProcessed(eventId: string, type: string): Promise<void> {
    await this.prisma.stripeWebhookEvent.create({
      data: { id: eventId, type },
      select: { id: true },
    });
  }
}
