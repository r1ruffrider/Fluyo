import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service";
import { EntitlementsService } from "./entitlements.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const AT = new Date("2026-07-20T12:00:00.000Z");

function createPrismaMock() {
  return {
    entitlement: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

describe("EntitlementsService", () => {
  it("checks only active entitlements in their valid time window", async () => {
    const prisma = createPrismaMock();
    prisma.entitlement.findFirst.mockResolvedValue({ id: "entitlement-id" });
    const service = new EntitlementsService(prisma as unknown as PrismaService);

    await expect(service.hasActive(USER_ID, "practice.unlimited", AT)).resolves.toBe(true);
    expect(prisma.entitlement.findFirst).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        entitlementKey: "practice.unlimited",
        status: "ACTIVE",
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: AT } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: AT } }] },
        ],
      },
      select: { id: true },
    });
  });

  it("returns provider-neutral active entitlement data", async () => {
    const prisma = createPrismaMock();
    prisma.entitlement.findMany.mockResolvedValue([
      {
        entitlementKey: "practice.unlimited",
        startsAt: null,
        endsAt: new Date("2026-08-20T12:00:00.000Z"),
      },
    ]);
    const service = new EntitlementsService(prisma as unknown as PrismaService);

    await expect(service.listActive(USER_ID, AT)).resolves.toEqual([
      {
        key: "practice.unlimited",
        startsAt: null,
        endsAt: "2026-08-20T12:00:00.000Z",
      },
    ]);
  });
});
