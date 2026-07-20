import type { ActiveEntitlement } from "@fluyo/shared";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service";

function activeWindow(at: Date) {
  return {
    status: "ACTIVE" as const,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: at } }] },
      { OR: [{ endsAt: null }, { endsAt: { gt: at } }] },
    ],
  };
}

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async hasActive(userId: string, entitlementKey: string, at = new Date()): Promise<boolean> {
    const entitlement = await this.prisma.entitlement.findFirst({
      where: { userId, entitlementKey, ...activeWindow(at) },
      select: { id: true },
    });

    return entitlement !== null;
  }

  async listActive(userId: string, at = new Date()): Promise<ActiveEntitlement[]> {
    const entitlements = await this.prisma.entitlement.findMany({
      where: { userId, ...activeWindow(at) },
      orderBy: { entitlementKey: "asc" },
      select: { entitlementKey: true, startsAt: true, endsAt: true },
    });

    return entitlements.map((entitlement) => ({
      key: entitlement.entitlementKey,
      startsAt: entitlement.startsAt?.toISOString() ?? null,
      endsAt: entitlement.endsAt?.toISOString() ?? null,
    }));
  }
}
