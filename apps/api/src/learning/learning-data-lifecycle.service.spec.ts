import { ActivityAttemptResult, Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service";
import { LearningDataLifecycleService } from "./learning-data-lifecycle.service";
import type { LearningTelemetryService } from "./learning-telemetry.service";

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER_OWNER = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-10-18T08:15:00.000Z");

function telemetryMock() {
  return { recordLifecycle: vi.fn() } as unknown as LearningTelemetryService;
}

describe("LearningDataLifecycleService", () => {
  it("exports every owned learning record in a stable provider-neutral shape", async () => {
    const transaction = {
      activityAttempt: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "attempt",
            userId: OWNER,
            activityId: "activity",
            contentVersion: 2,
            idempotencyKey: "key",
            requestHash: "hash",
            selectedChoiceId: "hola",
            result: ActivityAttemptResult.CORRECT,
            response: { result: "correct" },
            completedAt: NOW,
            createdAt: NOW,
          },
        ]),
      },
      lessonProgress: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "progress",
            userId: OWNER,
            lessonId: "lesson",
            nextActivityId: null,
            completedActivityIds: ["activity"],
            completedAt: NOW,
            createdAt: NOW,
            updatedAt: NOW,
          },
        ]),
      },
      practiceDay: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "day",
            userId: OWNER,
            localDate: new Date("2026-10-18T00:00:00.000Z"),
            timezone: "Asia/Riyadh",
            completedActivityCount: 1,
            createdAt: NOW,
            updatedAt: NOW,
          },
        ]),
      },
      learningGoal: {
        findUnique: vi.fn().mockResolvedValue({
          id: "goal",
          userId: OWNER,
          dailyTarget: 3,
          createdAt: NOW,
          updatedAt: NOW,
        }),
      },
      learningPreference: {
        findUnique: vi.fn().mockResolvedValue({
          id: "preference",
          userId: OWNER,
          timezone: "Asia/Riyadh",
          createdAt: NOW,
          updatedAt: NOW,
        }),
      },
      notificationPreference: {
        findUnique: vi.fn().mockResolvedValue({
          id: "notification",
          userId: OWNER,
          practiceReminderEnabled: true,
          reminderLocalTime: new Date("1970-01-01T08:15:00.000Z"),
          createdAt: NOW,
          updatedAt: NOW,
        }),
      },
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation((callback) => callback(transaction)),
    };
    const telemetry = telemetryMock();
    const service = new LearningDataLifecycleService(prisma as unknown as PrismaService, telemetry);

    await expect(service.exportOwnedData(OWNER, NOW)).resolves.toEqual({
      schemaVersion: 1,
      ownerId: OWNER,
      exportedAt: NOW.toISOString(),
      activityAttempts: [
        {
          id: "attempt",
          activityId: "activity",
          contentVersion: 2,
          idempotencyKey: "key",
          requestHash: "hash",
          selectedChoiceId: "hola",
          result: "correct",
          response: { result: "correct" },
          completedAt: NOW.toISOString(),
          createdAt: NOW.toISOString(),
        },
      ],
      lessonProgress: [
        {
          id: "progress",
          lessonId: "lesson",
          nextActivityId: null,
          completedActivityIds: ["activity"],
          completedAt: NOW.toISOString(),
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
      practiceDays: [
        {
          id: "day",
          localDate: "2026-10-18",
          timezone: "Asia/Riyadh",
          completedActivityCount: 1,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
      goal: {
        id: "goal",
        dailyTarget: 3,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      },
      learningPreference: {
        id: "preference",
        timezone: "Asia/Riyadh",
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      },
      notificationPreference: {
        id: "notification",
        practiceReminderEnabled: true,
        reminderLocalTime: "08:15:00",
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      },
    });
    for (const repository of Object.values(transaction)) {
      expect(Object.values(repository)[0]).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: OWNER } }),
      );
    }
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
    expect(telemetry.recordLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "export", outcome: "ready" }),
    );
  });

  it("deletes all and only one owner's learning data and is idempotent", async () => {
    const state = createLearningState();
    const prisma = createTransactionalDeleteFake(state);
    const telemetry = telemetryMock();
    const service = new LearningDataLifecycleService(
      prisma.client as unknown as PrismaService,
      telemetry,
    );

    await expect(service.deleteOwnedData(OWNER)).resolves.toEqual({
      activityAttempts: 1,
      lessonProgress: 1,
      practiceDays: 1,
      goals: 1,
      learningPreferences: 1,
      notificationPreferences: 1,
      total: 6,
    });
    expect(prisma.state()).toEqual({
      ...createLearningState(),
      activityAttempt: [OTHER_OWNER],
      lessonProgress: [OTHER_OWNER],
      practiceDay: [OTHER_OWNER],
      learningGoal: [OTHER_OWNER],
      learningPreference: [OTHER_OWNER],
      notificationPreference: [OTHER_OWNER],
    });
    await expect(service.deleteOwnedData(OWNER)).resolves.toMatchObject({ total: 0 });
    expect(telemetry.recordLifecycle).toHaveBeenLastCalledWith(
      expect.objectContaining({ operation: "delete", outcome: "empty" }),
    );
  });

  it("rolls back the complete deletion when one owned repository fails", async () => {
    const initial = createLearningState();
    const prisma = createTransactionalDeleteFake(initial, "practiceDay");
    const telemetry = telemetryMock();
    const service = new LearningDataLifecycleService(
      prisma.client as unknown as PrismaService,
      telemetry,
    );

    await expect(service.deleteOwnedData(OWNER)).rejects.toThrow("injected delete failure");
    expect(prisma.state()).toEqual(initial);
    expect(telemetry.recordLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "delete", outcome: "failed" }),
    );
  });
});

type LearningTable =
  | "activityAttempt"
  | "lessonProgress"
  | "practiceDay"
  | "learningGoal"
  | "learningPreference"
  | "notificationPreference";

function createLearningState(): Record<LearningTable | "profile" | "billing", string[]> {
  return {
    activityAttempt: [OWNER, OTHER_OWNER],
    lessonProgress: [OWNER, OTHER_OWNER],
    practiceDay: [OWNER, OTHER_OWNER],
    learningGoal: [OWNER, OTHER_OWNER],
    learningPreference: [OWNER, OTHER_OWNER],
    notificationPreference: [OWNER, OTHER_OWNER],
    profile: [OWNER, OTHER_OWNER],
    billing: [OWNER, OTHER_OWNER],
  };
}

function createTransactionalDeleteFake(
  initial: ReturnType<typeof createLearningState>,
  failOn?: LearningTable,
) {
  let committed = structuredClone(initial);
  const tables: LearningTable[] = [
    "activityAttempt",
    "lessonProgress",
    "practiceDay",
    "learningGoal",
    "notificationPreference",
    "learningPreference",
  ];
  return {
    client: {
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) => {
        const staged = structuredClone(committed);
        const transaction = Object.fromEntries(
          tables.map((table) => [
            table,
            {
              deleteMany: async ({ where }: { where: { userId: string } }) => {
                if (failOn === table) {
                  throw new Error("injected delete failure");
                }
                const before = staged[table].length;
                staged[table] = staged[table].filter((userId) => userId !== where.userId);
                return { count: before - staged[table].length };
              },
            },
          ]),
        );
        const result = await callback(transaction);
        committed = staged;
        return result;
      },
    },
    state: () => structuredClone(committed),
  };
}
