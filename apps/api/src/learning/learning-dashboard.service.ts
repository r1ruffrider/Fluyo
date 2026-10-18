import type { ActivityChoice, LearningDashboardResponse, PublishedActivity } from "@fluyo/shared";
import { Injectable, Optional } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { EntitlementsService } from "../billing/entitlements.service";
import { PrismaService } from "../database/prisma.service";
import { LearningSettingsService } from "./learning-settings.service";
import { LearningTelemetryService } from "./learning-telemetry.service";

function entitlementAccess(entitlementKeys: string[]) {
  return {
    OR: [{ requiredEntitlementKey: null }, { requiredEntitlementKey: { in: entitlementKeys } }],
  };
}

function publicChoices(value: Prisma.JsonValue): ActivityChoice[] {
  if (!Array.isArray(value)) {
    throw new Error("Published activity choices are invalid");
  }

  return value.map((choice) => {
    if (
      typeof choice !== "object" ||
      choice === null ||
      Array.isArray(choice) ||
      typeof choice.id !== "string" ||
      typeof choice.label !== "string"
    ) {
      throw new Error("Published activity choice is invalid");
    }

    return { id: choice.id, label: choice.label };
  });
}

@Injectable()
export class LearningDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly settings: LearningSettingsService,
    @Optional() private readonly telemetry?: LearningTelemetryService,
  ) {}

  async getDashboard(userId: string): Promise<LearningDashboardResponse> {
    const startedAt = Date.now();

    try {
      const entitlementKeys = (await this.entitlements.listActive(userId)).map(({ key }) => key);
      const access = entitlementAccess(entitlementKeys);
      const [
        activities,
        completionProgress,
        recentProgress,
        goal,
        streak,
        learningPreference,
        notificationPreference,
      ] = await Promise.all([
        this.prisma.activity.findMany({
          where: {
            archivedAt: null,
            publishedVersion: { not: null },
            ...access,
            lesson: { archivedAt: null, ...entitlementAccess(entitlementKeys) },
          },
          orderBy: [{ lesson: { sortOrder: "asc" } }, { sortOrder: "asc" }, { id: "asc" }],
          select: {
            id: true,
            kind: true,
            publishedVersion: true,
            publishedContent: { select: { prompt: true, choices: true } },
          },
        }),
        this.prisma.lessonProgress.findMany({
          where: {
            userId,
            lesson: { archivedAt: null, ...entitlementAccess(entitlementKeys) },
          },
          select: { completedActivityIds: true },
        }),
        this.prisma.lessonProgress.findMany({
          where: {
            userId,
            lesson: { archivedAt: null, ...entitlementAccess(entitlementKeys) },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          take: 5,
          select: {
            lessonId: true,
            completedActivityIds: true,
            nextActivityId: true,
            completedAt: true,
            updatedAt: true,
            lesson: { select: { title: true } },
          },
        }),
        this.settings.getGoal(userId),
        this.settings.getStreak(userId),
        this.settings.getLearningPreference(userId),
        this.settings.getNotificationPreference(userId),
      ]);

      const completedActivityIds = new Set(
        completionProgress.flatMap((progress) => progress.completedActivityIds),
      );
      const visibleActivityIds = new Set(activities.map((activity) => activity.id));
      const next = activities.find((activity) => !completedActivityIds.has(activity.id));
      const nextActivity = next ? this.mapActivity(next) : null;
      let unavailableReason: LearningDashboardResponse["access"]["unavailableReason"] = null;

      if (activities.length === 0) {
        const publishedCatalogEntry = await this.prisma.activity.findFirst({
          where: {
            archivedAt: null,
            publishedVersion: { not: null },
            lesson: { archivedAt: null },
          },
          select: { id: true },
        });
        unavailableReason = publishedCatalogEntry ? "entitlement_required" : "catalog_empty";
      }

      const response: LearningDashboardResponse = {
        nextActivity,
        recentProgress: recentProgress.map((progress) => ({
          lessonId: progress.lessonId,
          lessonTitle: progress.lesson.title,
          completedActivityIds: progress.completedActivityIds.filter((id) =>
            visibleActivityIds.has(id),
          ),
          nextActivityId:
            progress.nextActivityId && visibleActivityIds.has(progress.nextActivityId)
              ? progress.nextActivityId
              : null,
          completedAt: progress.completedAt?.toISOString() ?? null,
          updatedAt: progress.updatedAt.toISOString(),
        })),
        goal,
        streak,
        learningPreference,
        notificationPreference,
        access: {
          nextActivityAvailable: nextActivity !== null,
          unavailableReason,
        },
      };
      this.telemetry?.recordDashboard({
        outcome: nextActivity ? "ready" : "empty",
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      this.telemetry?.recordDashboard({ outcome: "failed", durationMs: Date.now() - startedAt });
      throw error;
    }
  }

  private mapActivity(activity: {
    id: string;
    kind: string;
    publishedVersion: number | null;
    publishedContent: { prompt: string; choices: Prisma.JsonValue } | null;
  }): PublishedActivity {
    if (
      activity.kind !== "PHRASE_CHOICE" ||
      activity.publishedVersion === null ||
      activity.publishedContent === null
    ) {
      throw new Error("Published activity content is invalid");
    }

    return {
      id: activity.id,
      kind: "phrase_choice",
      contentVersion: activity.publishedVersion,
      prompt: activity.publishedContent.prompt,
      choices: publicChoices(activity.publishedContent.choices),
    };
  }
}
