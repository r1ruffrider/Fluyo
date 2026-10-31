import { describe, expect, it, vi } from "vitest";

import { LearningDashboardService } from "./learning-dashboard.service";
import {
  LearningExperienceOperations,
  REPOSITORY_LEARNING_EXPERIENCE_CONTROL,
} from "./learning-experience-operations";
import { LearningSessionPlannerService } from "./learning-session-planner.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const FIRST_ACTIVITY = "22222222-2222-4222-8222-222222222222";
const NEXT_ACTIVITY = "33333333-3333-4333-8333-333333333333";
const UPDATED_AT = new Date("2026-10-18T01:00:00.000Z");

function activity(id: string) {
  return {
    id,
    kind: "PHRASE_CHOICE",
    sortOrder: id === FIRST_ACTIVITY ? 1 : 2,
    publishedVersion: 2,
    publishedContent: {
      prompt: "Choose hello",
      choices: [
        { id: "hola", label: "Hola" },
        { id: "adios", label: "Adiós" },
      ],
    },
    lesson: { sortOrder: 1 },
  };
}

function plan(item: { activityId: string; contentVersion: number; reason: "next" } | null) {
  return { schemaVersion: 1 as const, item };
}

function enabledOperations(record = vi.fn()) {
  return {
    operations: new LearningExperienceOperations(
      Object.freeze({ LEARNING_SESSION_PLAN_ENABLED: true }),
      { record },
    ),
    record,
  };
}

function disabledOperations(record = vi.fn()) {
  return {
    operations: new LearningExperienceOperations(REPOSITORY_LEARNING_EXPERIENCE_CONTROL, {
      record,
    }),
    record,
  };
}

function fixture(
  planner?: { plan: ReturnType<typeof vi.fn> },
  operations = planner ? enabledOperations().operations : undefined,
) {
  const prisma = {
    $transaction: vi.fn(),
    activity: {
      findMany: vi.fn().mockResolvedValue([activity(FIRST_ACTIVITY), activity(NEXT_ACTIVITY)]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    lessonProgress: {
      create: vi.fn(),
      update: vi.fn(),
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
    planner as never,
    telemetry as never,
    operations,
  );
  return { entitlements, operations, planner, prisma, service, settings, telemetry };
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

  it("passes only the authorized read snapshot to the planner and revalidates its selection", async () => {
    const planner = {
      plan: vi
        .fn()
        .mockReturnValue(plan({ activityId: NEXT_ACTIVITY, contentVersion: 2, reason: "next" })),
    };
    const { prisma, service } = fixture(planner);
    prisma.lessonProgress.findMany.mockReset();
    prisma.lessonProgress.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await service.getDashboard(USER_ID);

    expect(planner.plan).toHaveBeenCalledWith([
      {
        activityId: FIRST_ACTIVITY,
        contentVersion: 2,
        lessonSortOrder: 1,
        activitySortOrder: 1,
        completed: false,
      },
      {
        activityId: NEXT_ACTIVITY,
        contentVersion: 2,
        lessonSortOrder: 1,
        activitySortOrder: 2,
        completed: false,
      },
    ]);
    expect(result.nextActivity?.id).toBe(NEXT_ACTIVITY);
  });

  it("keeps the planner and operational sink unreachable under the repository default", async () => {
    const planner = {
      plan: vi
        .fn()
        .mockReturnValue(plan({ activityId: FIRST_ACTIVITY, contentVersion: 2, reason: "next" })),
    };
    const operational = disabledOperations();
    const baseline = fixture();
    const disabled = fixture(planner, operational.operations);

    expect(await disabled.service.getDashboard(USER_ID)).toEqual(
      await baseline.service.getDashboard(USER_ID),
    );
    expect(planner.plan).not.toHaveBeenCalled();
    expect(operational.record).not.toHaveBeenCalled();
  });

  it("fails closed when the operational control throws", async () => {
    const planner = { plan: vi.fn().mockReturnValue(plan(null)) };
    const operations = {
      isSessionPlannerEnabled: vi.fn(() => {
        throw new Error("private policy detail");
      }),
      recordSessionPlannerOutcome: vi.fn(),
    };
    const baseline = fixture();
    const failed = fixture(planner, operations as never);

    expect(await failed.service.getDashboard(USER_ID)).toEqual(
      await baseline.service.getDashboard(USER_ID),
    );
    expect(planner.plan).not.toHaveBeenCalled();
    expect(operations.recordSessionPlannerOutcome).not.toHaveBeenCalled();
  });

  it("records one closed selected event after authorized planner revalidation", async () => {
    const planner = {
      plan: vi
        .fn()
        .mockReturnValue(plan({ activityId: NEXT_ACTIVITY, contentVersion: 2, reason: "next" })),
    };
    const operational = enabledOperations();
    const { prisma, service } = fixture(planner, operational.operations);
    prisma.lessonProgress.findMany.mockReset();
    prisma.lessonProgress.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await service.getDashboard(USER_ID);

    expect(result.nextActivity?.id).toBe(NEXT_ACTIVITY);
    expect(operational.record).toHaveBeenCalledTimes(1);
    expect(operational.record).toHaveBeenCalledWith({
      schemaVersion: 1,
      policyId: "learning_operational_policy",
      scenario: "session_planner",
      outcome: "selected",
      result: "no_op",
    });
    expect(Object.isFrozen(operational.record.mock.calls[0]?.[0])).toBe(true);
  });

  it.each([
    ["null", vi.fn().mockReturnValue(plan(null))],
    [
      "throwing",
      vi.fn(() => {
        throw new Error("private planner detail");
      }),
    ],
  ])("records one closed fallback event for a %s planner", async (_name, planResult) => {
    const operational = enabledOperations();
    const { service } = fixture({ plan: planResult }, operational.operations);

    const result = await service.getDashboard(USER_ID);

    expect(result.nextActivity?.id).toBe(NEXT_ACTIVITY);
    expect(operational.record).toHaveBeenCalledTimes(1);
    expect(operational.record).toHaveBeenCalledWith({
      schemaVersion: 1,
      policyId: "learning_operational_policy",
      scenario: "session_planner",
      outcome: "fallback",
      result: "no_op",
    });
  });

  it("isolates a throwing operational recorder from selected and fallback responses", async () => {
    const operations = {
      isSessionPlannerEnabled: vi.fn(() => true),
      recordSessionPlannerOutcome: vi.fn(() => {
        throw new Error("private sink detail");
      }),
    };
    const selectedPlanner = {
      plan: vi
        .fn()
        .mockReturnValue(plan({ activityId: NEXT_ACTIVITY, contentVersion: 2, reason: "next" })),
    };
    const fallbackPlanner = { plan: vi.fn().mockReturnValue(plan(null)) };
    const selected = fixture(selectedPlanner, operations as never);
    const fallback = fixture(fallbackPlanner, operations as never);
    selected.prisma.lessonProgress.findMany.mockReset();
    selected.prisma.lessonProgress.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(selected.service.getDashboard(USER_ID)).resolves.toEqual(
      expect.objectContaining({ nextActivity: expect.objectContaining({ id: NEXT_ACTIVITY }) }),
    );
    await expect(fallback.service.getDashboard(USER_ID)).resolves.toEqual(
      expect.objectContaining({ nextActivity: expect.objectContaining({ id: NEXT_ACTIVITY }) }),
    );
    expect(operations.recordSessionPlannerOutcome).toHaveBeenCalledTimes(2);
  });

  it("proves deterministic rollback from test-enabled planning to the repository default", async () => {
    const enabledPlanner = {
      plan: vi
        .fn()
        .mockReturnValue(plan({ activityId: NEXT_ACTIVITY, contentVersion: 2, reason: "next" })),
    };
    const rollbackPlanner = {
      plan: vi
        .fn()
        .mockReturnValue(plan({ activityId: NEXT_ACTIVITY, contentVersion: 2, reason: "next" })),
    };
    const enabled = fixture(enabledPlanner, enabledOperations().operations);
    const rolledBack = fixture(rollbackPlanner, disabledOperations().operations);
    const baseline = fixture();
    for (const current of [enabled, rolledBack, baseline]) {
      current.prisma.lessonProgress.findMany.mockReset();
      current.prisma.lessonProgress.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    }

    expect((await enabled.service.getDashboard(USER_ID)).nextActivity?.id).toBe(NEXT_ACTIVITY);
    const firstRollback = await rolledBack.service.getDashboard(USER_ID);
    const baselineResult = await baseline.service.getDashboard(USER_ID);

    expect(firstRollback.nextActivity?.id).toBe(FIRST_ACTIVITY);
    expect(firstRollback).toEqual(baselineResult);
    expect(JSON.stringify(firstRollback)).toBe(JSON.stringify(baselineResult));
    expect(rollbackPlanner.plan).not.toHaveBeenCalled();
  });

  it("preserves the exact client response when the optional planner returns no item", async () => {
    const baseline = fixture();
    const optional = fixture({ plan: vi.fn().mockReturnValue(plan(null)) });

    expect(await optional.service.getDashboard(USER_ID)).toEqual(
      await baseline.service.getDashboard(USER_ID),
    );
  });

  it("preserves the exact client response when the optional planner throws", async () => {
    const baseline = fixture();
    const optional = fixture({
      plan: vi.fn().mockImplementation(() => {
        throw new Error("planner unavailable");
      }),
    });

    expect(await optional.service.getDashboard(USER_ID)).toEqual(
      await baseline.service.getDashboard(USER_ID),
    );
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["primitive", true],
    ["array", []],
    ["wrong schema", { schemaVersion: 2, item: null }],
    ["missing schema", { item: null }],
    ["missing item", { schemaVersion: 1 }],
    ["extra root field", { schemaVersion: 1, item: null, ownerId: USER_ID }],
    [
      "extra item field",
      {
        schemaVersion: 1,
        item: { activityId: NEXT_ACTIVITY, contentVersion: 2, reason: "next", prompt: "private" },
      },
    ],
    [
      "invalid UUID",
      {
        schemaVersion: 1,
        item: { activityId: "private", contentVersion: 2, reason: "next" },
      },
    ],
    [
      "invalid content version",
      {
        schemaVersion: 1,
        item: { activityId: NEXT_ACTIVITY, contentVersion: 0, reason: "next" },
      },
    ],
    [
      "invalid reason",
      {
        schemaVersion: 1,
        item: { activityId: NEXT_ACTIVITY, contentVersion: 2, reason: "review" },
      },
    ],
  ])("preserves fallback for malformed planner output: %s", async (_name, value) => {
    const { service } = fixture({ plan: vi.fn().mockReturnValue(value) });
    expect((await service.getDashboard(USER_ID)).nextActivity?.id).toBe(NEXT_ACTIVITY);
  });

  it.each([
    ["unknown", "55555555-5555-4555-8555-555555555555", 2],
    ["inaccessible", "66666666-6666-4666-8666-666666666666", 2],
    ["stale", NEXT_ACTIVITY, 1],
  ])("preserves fallback for a %s planned reference", async (_name, activityId, contentVersion) => {
    const { service } = fixture({
      plan: vi.fn().mockReturnValue(plan({ activityId, contentVersion, reason: "next" })),
    });
    expect((await service.getDashboard(USER_ID)).nextActivity?.id).toBe(NEXT_ACTIVITY);
  });

  it("preserves fallback when the planner selects a completed activity", async () => {
    const { service } = fixture({
      plan: vi
        .fn()
        .mockReturnValue(plan({ activityId: FIRST_ACTIVITY, contentVersion: 2, reason: "next" })),
    });
    expect((await service.getDashboard(USER_ID)).nextActivity?.id).toBe(NEXT_ACTIVITY);
  });

  it("preserves fallback when duplicate authorized candidates make the planner fail closed", async () => {
    const planner = new LearningSessionPlannerService();
    const { prisma, service } = fixture(planner as never);
    prisma.activity.findMany.mockResolvedValue([
      activity(FIRST_ACTIVITY),
      activity(FIRST_ACTIVITY),
      activity(NEXT_ACTIVITY),
    ]);

    expect((await service.getDashboard(USER_ID)).nextActivity?.id).toBe(NEXT_ACTIVITY);
  });

  it("never invokes a transaction or write method while planning", async () => {
    const { prisma, service } = fixture({ plan: vi.fn().mockReturnValue(plan(null)) });
    await service.getDashboard(USER_ID);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.activity.create).not.toHaveBeenCalled();
    expect(prisma.activity.update).not.toHaveBeenCalled();
    expect(prisma.lessonProgress.create).not.toHaveBeenCalled();
    expect(prisma.lessonProgress.update).not.toHaveBeenCalled();
  });

  it("does not swallow settings failures when a planner is present", async () => {
    const operational = enabledOperations();
    const { service, settings } = fixture(
      { plan: vi.fn().mockReturnValue(plan(null)) },
      operational.operations,
    );
    const failure = new Error("settings unavailable");
    settings.getGoal.mockRejectedValue(failure);
    await expect(service.getDashboard(USER_ID)).rejects.toBe(failure);
    expect(operational.record).not.toHaveBeenCalled();
  });

  it("does not swallow invalid authorized content selected after planning", async () => {
    const operational = enabledOperations();
    const { prisma, service } = fixture(
      {
        plan: vi
          .fn()
          .mockReturnValue(plan({ activityId: NEXT_ACTIVITY, contentVersion: 2, reason: "next" })),
      },
      operational.operations,
    );
    prisma.activity.findMany.mockResolvedValue([
      activity(FIRST_ACTIVITY),
      { ...activity(NEXT_ACTIVITY), publishedContent: null },
    ]);

    await expect(service.getDashboard(USER_ID)).rejects.toThrow(
      "Published activity content is invalid",
    );
    expect(operational.record).not.toHaveBeenCalled();
  });
});
