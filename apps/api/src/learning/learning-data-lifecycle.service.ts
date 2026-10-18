import { Injectable, Optional } from "@nestjs/common";
import { ActivityAttemptResult, Prisma } from "@prisma/client";

import { PrismaService } from "../database/prisma.service";
import { LearningTelemetryService } from "./learning-telemetry.service";

export type LearningExportJsonValue =
  | string
  | number
  | boolean
  | null
  | LearningExportJsonValue[]
  | { [key: string]: LearningExportJsonValue };

export interface LearningDataExport {
  schemaVersion: 1;
  ownerId: string;
  exportedAt: string;
  activityAttempts: Array<{
    id: string;
    activityId: string;
    contentVersion: number;
    idempotencyKey: string;
    requestHash: string;
    selectedChoiceId: string;
    result: "correct" | "incorrect";
    response: LearningExportJsonValue;
    completedAt: string;
    createdAt: string;
  }>;
  lessonProgress: Array<{
    id: string;
    lessonId: string;
    nextActivityId: string | null;
    completedActivityIds: string[];
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  practiceDays: Array<{
    id: string;
    localDate: string;
    timezone: string;
    completedActivityCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  goal: { id: string; dailyTarget: number; createdAt: string; updatedAt: string } | null;
  learningPreference: { id: string; timezone: string; createdAt: string; updatedAt: string } | null;
  notificationPreference: {
    id: string;
    practiceReminderEnabled: boolean;
    reminderLocalTime: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface LearningDataDeletionResult {
  activityAttempts: number;
  lessonProgress: number;
  practiceDays: number;
  goals: number;
  learningPreferences: number;
  notificationPreferences: number;
  total: number;
}

function iso(value: Date): string {
  return value.toISOString();
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function timeOnly(value: Date): string {
  return value.toISOString().slice(11, 19);
}

@Injectable()
export class LearningDataLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly telemetry?: LearningTelemetryService,
  ) {}

  async exportOwnedData(userId: string, exportedAt = new Date()): Promise<LearningDataExport> {
    const startedAt = Date.now();
    try {
      const data = await this.prisma.$transaction(
        async (transaction) => this.readOwnedData(transaction, userId, exportedAt),
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
      this.telemetry?.recordLifecycle({
        operation: "export",
        outcome:
          data.activityAttempts.length > 0 ||
          data.lessonProgress.length > 0 ||
          data.practiceDays.length > 0 ||
          data.goal !== null ||
          data.learningPreference !== null ||
          data.notificationPreference !== null
            ? "ready"
            : "empty",
        durationMs: Date.now() - startedAt,
      });
      return data;
    } catch (error) {
      this.telemetry?.recordLifecycle({
        operation: "export",
        outcome: "failed",
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }

  async deleteOwnedData(userId: string): Promise<LearningDataDeletionResult> {
    const startedAt = Date.now();
    try {
      const result = await this.prisma.$transaction(async (transaction) => {
        const activityAttempts = await transaction.activityAttempt.deleteMany({
          where: { userId },
        });
        const lessonProgress = await transaction.lessonProgress.deleteMany({ where: { userId } });
        const practiceDays = await transaction.practiceDay.deleteMany({ where: { userId } });
        const goals = await transaction.learningGoal.deleteMany({ where: { userId } });
        const notificationPreferences = await transaction.notificationPreference.deleteMany({
          where: { userId },
        });
        const learningPreferences = await transaction.learningPreference.deleteMany({
          where: { userId },
        });
        const counts = {
          activityAttempts: activityAttempts.count,
          lessonProgress: lessonProgress.count,
          practiceDays: practiceDays.count,
          goals: goals.count,
          learningPreferences: learningPreferences.count,
          notificationPreferences: notificationPreferences.count,
        };
        return { ...counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) };
      });
      this.telemetry?.recordLifecycle({
        operation: "delete",
        outcome: result.total === 0 ? "empty" : "deleted",
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      this.telemetry?.recordLifecycle({
        operation: "delete",
        outcome: "failed",
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }

  private async readOwnedData(
    transaction: Prisma.TransactionClient,
    userId: string,
    exportedAt: Date,
  ): Promise<LearningDataExport> {
    const activityAttempts = await transaction.activityAttempt.findMany({
      where: { userId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const lessonProgress = await transaction.lessonProgress.findMany({
      where: { userId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const practiceDays = await transaction.practiceDay.findMany({
      where: { userId },
      orderBy: [{ localDate: "asc" }, { id: "asc" }],
    });
    const goal = await transaction.learningGoal.findUnique({ where: { userId } });
    const learningPreference = await transaction.learningPreference.findUnique({
      where: { userId },
    });
    const notificationPreference = await transaction.notificationPreference.findUnique({
      where: { userId },
    });

    return {
      schemaVersion: 1,
      ownerId: userId,
      exportedAt: iso(exportedAt),
      activityAttempts: activityAttempts.map((attempt) => ({
        id: attempt.id,
        activityId: attempt.activityId,
        contentVersion: attempt.contentVersion,
        idempotencyKey: attempt.idempotencyKey,
        requestHash: attempt.requestHash,
        selectedChoiceId: attempt.selectedChoiceId,
        result: attempt.result === ActivityAttemptResult.CORRECT ? "correct" : "incorrect",
        response: attempt.response as unknown as LearningExportJsonValue,
        completedAt: iso(attempt.completedAt),
        createdAt: iso(attempt.createdAt),
      })),
      lessonProgress: lessonProgress.map((progress) => ({
        id: progress.id,
        lessonId: progress.lessonId,
        nextActivityId: progress.nextActivityId,
        completedActivityIds: progress.completedActivityIds,
        completedAt: progress.completedAt ? iso(progress.completedAt) : null,
        createdAt: iso(progress.createdAt),
        updatedAt: iso(progress.updatedAt),
      })),
      practiceDays: practiceDays.map((day) => ({
        id: day.id,
        localDate: dateOnly(day.localDate),
        timezone: day.timezone,
        completedActivityCount: day.completedActivityCount,
        createdAt: iso(day.createdAt),
        updatedAt: iso(day.updatedAt),
      })),
      goal: goal
        ? {
            id: goal.id,
            dailyTarget: goal.dailyTarget,
            createdAt: iso(goal.createdAt),
            updatedAt: iso(goal.updatedAt),
          }
        : null,
      learningPreference: learningPreference
        ? {
            id: learningPreference.id,
            timezone: learningPreference.timezone,
            createdAt: iso(learningPreference.createdAt),
            updatedAt: iso(learningPreference.updatedAt),
          }
        : null,
      notificationPreference: notificationPreference
        ? {
            id: notificationPreference.id,
            practiceReminderEnabled: notificationPreference.practiceReminderEnabled,
            reminderLocalTime: timeOnly(notificationPreference.reminderLocalTime),
            createdAt: iso(notificationPreference.createdAt),
            updatedAt: iso(notificationPreference.updatedAt),
          }
        : null,
    };
  }
}
