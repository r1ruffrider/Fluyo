import { Injectable } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service";

@Injectable()
export class StripeCustomerMappingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findCustomerId(userId: string): Promise<string | null> {
    const mapping = await this.prisma.stripeCustomer.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    });

    return mapping?.stripeCustomerId ?? null;
  }

  async createMapping(userId: string, stripeCustomerId: string): Promise<void> {
    await this.prisma.stripeCustomer.create({
      data: { userId, stripeCustomerId },
      select: { userId: true },
    });
  }
}
