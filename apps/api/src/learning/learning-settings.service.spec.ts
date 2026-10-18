import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service";
import { LearningSettingsService } from "./learning-settings.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const UPDATED_AT = new Date("2026-10-18T00:00:00.000Z");

function createPrismaMock() {
  return {
    learningGoal: { upsert: vi.fn() },
    learningPreference: { upsert: vi.fn(), findUnique: vi.fn() },
    notificationPreference: { upsert: vi.fn() },
    practiceDay: { findMany: vi.fn() },
  };
}

describe("LearningSettingsService", () => {
  it("creates the default goal and returns an ISO timestamp", async () => {
    const prisma = createPrismaMock();
    prisma.learningGoal.upsert.mockResolvedValue({ dailyTarget: 3, updatedAt: UPDATED_AT });
    const service = new LearningSettingsService(prisma as unknown as PrismaService);

    await expect(service.getGoal(USER_ID)).resolves.toEqual({
      dailyTarget: 3,
      updatedAt: UPDATED_AT.toISOString(),
    });
    expect(prisma.learningGoal.upsert).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      update: {},
      create: { userId: USER_ID },
    });
  });

  it("idempotently replaces only the verified user's goal", async () => {
    const prisma = createPrismaMock();
    prisma.learningGoal.upsert.mockResolvedValue({ dailyTarget: 7, updatedAt: UPDATED_AT });
    const service = new LearningSettingsService(prisma as unknown as PrismaService);

    await expect(service.updateGoal(USER_ID, { dailyTarget: 7 })).resolves.toMatchObject({
      dailyTarget: 7,
    });
    expect(prisma.learningGoal.upsert).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      update: { dailyTarget: 7 },
      create: { userId: USER_ID, dailyTarget: 7 },
    });
  });

  it("uses UTC until a learner saves a preference", async () => {
    const prisma = createPrismaMock();
    prisma.learningPreference.upsert.mockResolvedValue({ timezone: "UTC", updatedAt: UPDATED_AT });
    const service = new LearningSettingsService(prisma as unknown as PrismaService);

    await expect(service.getLearningPreference(USER_ID)).resolves.toEqual({
      timezone: "UTC",
      updatedAt: UPDATED_AT.toISOString(),
    });
  });

  it("rejects invalid zones without writing", async () => {
    const prisma = createPrismaMock();
    const service = new LearningSettingsService(prisma as unknown as PrismaService);

    await expect(
      service.updateLearningPreference(USER_ID, { timezone: "Mars/Olympus_Mons" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.learningPreference.upsert).not.toHaveBeenCalled();
  });

  it("stores a valid timezone without rewriting earlier practice days", async () => {
    const prisma = createPrismaMock();
    prisma.learningPreference.upsert.mockResolvedValue({
      timezone: "Asia/Riyadh",
      updatedAt: UPDATED_AT,
    });
    const service = new LearningSettingsService(prisma as unknown as PrismaService);

    await expect(
      service.updateLearningPreference(USER_ID, { timezone: "Asia/Riyadh" }),
    ).resolves.toMatchObject({ timezone: "Asia/Riyadh" });
    expect(prisma.practiceDay.findMany).not.toHaveBeenCalled();
  });

  it("reports reminder storage without claiming delivery exists", async () => {
    const prisma = createPrismaMock();
    prisma.notificationPreference.upsert.mockResolvedValue({
      practiceReminderEnabled: true,
      reminderLocalTime: new Date("1970-01-01T08:15:00.000Z"),
      updatedAt: UPDATED_AT,
    });
    const service = new LearningSettingsService(prisma as unknown as PrismaService);

    await expect(
      service.updateNotificationPreference(USER_ID, {
        practiceReminderEnabled: true,
        reminderLocalTime: "08:15",
      }),
    ).resolves.toEqual({
      practiceReminderEnabled: true,
      reminderLocalTime: "08:15",
      deliveryAvailable: false,
      updatedAt: UPDATED_AT.toISOString(),
    });
  });

  it("keeps a streak through today and reports today's activity count", async () => {
    const prisma = createPrismaMock();
    prisma.learningPreference.findUnique.mockResolvedValue({ timezone: "UTC" });
    prisma.practiceDay.findMany.mockResolvedValue([
      { localDate: new Date("2026-10-18T00:00:00.000Z"), completedActivityCount: 2 },
      { localDate: new Date("2026-10-17T00:00:00.000Z"), completedActivityCount: 1 },
      { localDate: new Date("2026-10-16T00:00:00.000Z"), completedActivityCount: 4 },
    ]);
    const service = new LearningSettingsService(prisma as unknown as PrismaService);

    await expect(service.getStreak(USER_ID, UPDATED_AT)).resolves.toEqual({
      currentDays: 3,
      practicedToday: true,
      todayCompletedActivities: 2,
    });
  });

  it("preserves yesterday's streak before today's first practice and resets after a gap", async () => {
    const prisma = createPrismaMock();
    prisma.learningPreference.findUnique.mockResolvedValue(null);
    prisma.practiceDay.findMany
      .mockResolvedValueOnce([
        { localDate: new Date("2026-10-17T00:00:00.000Z"), completedActivityCount: 1 },
        { localDate: new Date("2026-10-16T00:00:00.000Z"), completedActivityCount: 1 },
      ])
      .mockResolvedValueOnce([
        { localDate: new Date("2026-10-16T00:00:00.000Z"), completedActivityCount: 1 },
      ]);
    const service = new LearningSettingsService(prisma as unknown as PrismaService);

    await expect(service.getStreak(USER_ID, UPDATED_AT)).resolves.toMatchObject({
      currentDays: 2,
      practicedToday: false,
    });
    await expect(service.getStreak(USER_ID, UPDATED_AT)).resolves.toMatchObject({
      currentDays: 0,
      practicedToday: false,
    });
  });
});
