import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service";
import { ProfilesService } from "./profiles.service";

const IDENTITY_ID = "11111111-1111-4111-8111-111111111111";
const CREATED_AT = new Date("2026-07-19T00:00:00.000Z");
const UPDATED_AT = new Date("2026-07-19T00:01:00.000Z");

function createPrismaMock() {
  return {
    userProfile: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

describe("ProfilesService", () => {
  it("reads only the current non-deleted user's profile", async () => {
    const prisma = createPrismaMock();
    prisma.userProfile.findFirst.mockResolvedValue({
      id: IDENTITY_ID,
      displayName: "Ana",
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    });
    const service = new ProfilesService(prisma as unknown as PrismaService);

    await expect(service.findCurrent(IDENTITY_ID)).resolves.toEqual({
      id: IDENTITY_ID,
      displayName: "Ana",
      createdAt: CREATED_AT.toISOString(),
      updatedAt: UPDATED_AT.toISOString(),
    });
    expect(prisma.userProfile.findFirst).toHaveBeenCalledWith({
      where: { deletedAt: null, id: IDENTITY_ID },
    });
  });

  it("returns null when the current user has no profile", async () => {
    const prisma = createPrismaMock();
    prisma.userProfile.findFirst.mockResolvedValue(null);
    const service = new ProfilesService(prisma as unknown as PrismaService);

    await expect(service.findCurrent(IDENTITY_ID)).resolves.toBeNull();
  });

  it("upserts a profile using only the verified identity ID", async () => {
    const prisma = createPrismaMock();
    prisma.userProfile.upsert.mockResolvedValue({
      id: IDENTITY_ID,
      displayName: "Ana",
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    });
    const service = new ProfilesService(prisma as unknown as PrismaService);

    await expect(service.updateCurrent(IDENTITY_ID, { displayName: "Ana" })).resolves.toMatchObject(
      {
        id: IDENTITY_ID,
        displayName: "Ana",
      },
    );
    expect(prisma.userProfile.upsert).toHaveBeenCalledWith({
      where: { id: IDENTITY_ID },
      create: { id: IDENTITY_ID, displayName: "Ana" },
      update: { displayName: "Ana", deletedAt: null },
    });
  });
});
