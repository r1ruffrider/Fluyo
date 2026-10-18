import { describe, expect, it, vi } from "vitest";

import { LearningDashboardService } from "./learning-dashboard.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const FIRST_ACTIVITY = "22222222-2222-4222-8222-222222222222";
const NEXT_ACTIVITY = "33333333-3333-4333-8333-333333333333";
const UPDATED_AT = new Date("2026-10-18T01:00:00.000Z");

function activity(id: string) {
  return {
    id,
    kind: "PHRASE_CHOICE",
    publishedVersion: 2,
    publishedContent: {
      prompt: "Choose hello",
      choices: [
        { id: "hola", label: "Hola" },
        { id: "adios", label: "Adiós" },
      ],
    },
  };
}

function fixture() {
  const prisma = {
    activity: {
      findMany: vi.fn().mockResolvedValue([activity(FIRST_ACTIVITY), activity(NEXT_ACTIVITY)]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    lessonProgress: {
      findMany: vi
        .fn()
        .mockResolvedValueOnce([{ completedActivityIds: [FIRST_ACTIVITY] }])
        .mockResolvedValueOnce([
          {
            lessonId: "44444444-4444-4444-8444-444444444444",
            lesson: { title: "Café hello" },
            completedActivityIds: [FIRST_ACTIVITY],
            nextActivityId: NEXT_ACTIVITY,
            completedAt: null,
            updatedAt: UPDATED_AT,
          },
        ]),
    },
  };
  const entitlements = {
    listActive: vi.fn().mockResolvedValue([{ key: "learning.plus" }]),
  };
  const settings = {
    getGoal: vi.fn().mockResolvedValue({ dailyTarget: 3, updatedAt: UPDATED_AT.toISOString() }),
    getStreak: vi.fn().mockResolvedValue({
      currentDays: 2,
      practicedToday: true,
      todayCompletedActivities: 1,
    }),
    getLearningPreference: vi
      .fn()
      .mockResolvedValue({ timezone: "UTC", updatedAt: UPDATED_AT.toISOString() }),
    getNotificationPreference: vi.fn().mockResolvedValue({
      practiceReminderEnabled: false,
      reminderLocalTime: "09:00",
      deliveryAvailable: false,
      updatedAt: UPDATED_AT.toISOString(),
    }),
  };
  const telemetry = { recordDashboard: vi.fn() };
  const service = new LearningDashboardService(
    prisma as never,
    entitlements as never,
    settings as never,
    telemetry as never,
  );
  return { entitlements, prisma, service, telemetry };
}

describe("LearningDashboardService", () => {
  it("returns the first accessible activity not completed anywhere and only recent progress", async () => {
    const { prisma, service, telemetry } = fixture();

    const result = await service.getDashboard(USER_ID);

    expect(result.nextActivity).toEqual({
      id: NEXT_ACTIVITY,
      kind: "phrase_choice",
      contentVersion: 2,
      prompt: "Choose hello",
      choices: [
        { id: "hola", label: "Hola" },
        { id: "adios", label: "Adiós" },
      ],
    });
    expect(result.recentProgress).toEqual([
      expect.objectContaining({ lessonTitle: "Café hello", nextActivityId: NEXT_ACTIVITY }),
    ]);
    expect(prisma.lessonProgress.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER_ID,
          lesson: expect.objectContaining({ archivedAt: null }),
        }),
        select: { completedActivityIds: true },
      }),
    );
    expect(prisma.lessonProgress.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER_ID,
          lesson: expect.objectContaining({ archivedAt: null }),
        }),
        take: 5,
      }),
    );
    expect(telemetry.recordDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "ready" }),
    );
  });

  it("does not expose inaccessible activity IDs in recent progress", async () => {
    const { prisma, service } = fixture();
    const inaccessible = "55555555-5555-4555-8555-555555555555";
    prisma.lessonProgress.findMany.mockReset();
    prisma.lessonProgress.findMany
      .mockResolvedValueOnce([{ completedActivityIds: [FIRST_ACTIVITY] }])
      .mockResolvedValueOnce([
        {
          lessonId: "44444444-4444-4444-8444-444444444444",
          lesson: { title: "Café hello" },
          completedActivityIds: [FIRST_ACTIVITY, inaccessible],
          nextActivityId: inaccessible,
          completedAt: null,
          updatedAt: UPDATED_AT,
        },
      ]);

    const result = await service.getDashboard(USER_ID);

    expect(result.recentProgress[0]?.completedActivityIds).toEqual([FIRST_ACTIVITY]);
    expect(result.recentProgress[0]?.nextActivityId).toBeNull();
  });

  it("scopes catalog access with only the verified owner's active entitlement keys", async () => {
    const { entitlements, prisma, service } = fixture();

    await service.getDashboard(USER_ID);

    expect(entitlements.listActive).toHaveBeenCalledWith(USER_ID);
    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { requiredEntitlementKey: null },
            { requiredEntitlementKey: { in: ["learning.plus"] } },
          ],
          lesson: expect.objectContaining({
            OR: [
              { requiredEntitlementKey: null },
              { requiredEntitlementKey: { in: ["learning.plus"] } },
            ],
          }),
        }),
      }),
    );
  });

  it("distinguishes an entitlement block from an empty catalog", async () => {
    const blocked = fixture();
    blocked.prisma.activity.findMany.mockResolvedValue([]);
    blocked.prisma.activity.findFirst.mockResolvedValue({ id: FIRST_ACTIVITY });
    blocked.prisma.lessonProgress.findMany.mockReset();
    blocked.prisma.lessonProgress.findMany.mockResolvedValue([]);

    const blockedResult = await blocked.service.getDashboard(USER_ID);
    expect(blockedResult.access).toEqual({
      nextActivityAvailable: false,
      unavailableReason: "entitlement_required",
    });

    const empty = fixture();
    empty.prisma.activity.findMany.mockResolvedValue([]);
    empty.prisma.activity.findFirst.mockResolvedValue(null);
    empty.prisma.lessonProgress.findMany.mockReset();
    empty.prisma.lessonProgress.findMany.mockResolvedValue([]);

    const emptyResult = await empty.service.getDashboard(USER_ID);
    expect(emptyResult.access).toEqual({
      nextActivityAvailable: false,
      unavailableReason: "catalog_empty",
    });
  });

  it("reports a completed accessible catalog without claiming an access failure", async () => {
    const { prisma, service } = fixture();
    prisma.lessonProgress.findMany.mockReset();
    prisma.lessonProgress.findMany
      .mockResolvedValueOnce([{ completedActivityIds: [FIRST_ACTIVITY, NEXT_ACTIVITY] }])
      .mockResolvedValueOnce([]);

    const result = await service.getDashboard(USER_ID);

    expect(result.nextActivity).toBeNull();
    expect(result.access).toEqual({ nextActivityAvailable: false, unavailableReason: null });
    expect(prisma.activity.findFirst).not.toHaveBeenCalled();
  });

  it("records a safe failure outcome while preserving the original error", async () => {
    const { entitlements, service, telemetry } = fixture();
    const failure = new Error("database unavailable");
    entitlements.listActive.mockRejectedValue(failure);

    await expect(service.getDashboard(USER_ID)).rejects.toBe(failure);
    expect(telemetry.recordDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed" }),
    );
  });
});
