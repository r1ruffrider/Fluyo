import { createHash, randomUUID } from "node:crypto";

import type { SubmitActivityAttemptResponse } from "@fluyo/shared";
import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { ActivityAttemptResult, Prisma } from "@prisma/client";

import { EntitlementsService } from "../billing/entitlements.service";
import { ApiDomainException } from "../common/errors/api-domain.exception";
import { PrismaService } from "../database/prisma.service";
import { ActivityAttemptAdmissionService } from "./activity-attempt-admission.service";
import type { SubmitActivityAttemptDto } from "./dto/submit-activity-attempt.dto";
import { LearningTelemetryService } from "./learning-telemetry.service";
import { localDateAt } from "./learning-time";

interface ActivityContent {
  choiceIds: string[];
  correctChoiceId: string;
  correctFeedback: string;
  incorrectFeedback: string;
}

interface ActivityAttemptWriteResult {
  response: SubmitActivityAttemptResponse;
  progressUpdated: boolean;
  lessonId: string;
}

function failureOutcome(error: unknown): "conflict" | "denied" | "rate_limited" | "failed" {
  if (error instanceof ApiDomainException) {
    if (error.code === "rate_limited") {
      return "rate_limited";
    }
    if (error.code === "content_version_conflict" || error.code === "idempotency_conflict") {
      return "conflict";
    }
    if (error.code === "resource_not_found") {
      return "denied";
    }
  }
  return error instanceof BadRequestException ? "denied" : "failed";
}

function entitlementAccess(entitlementKeys: string[]) {
  return {
    OR: [{ requiredEntitlementKey: null }, { requiredEntitlementKey: { in: entitlementKeys } }],
  };
}

function jsonRecord(value: Prisma.JsonValue): Prisma.JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Published activity content is invalid");
  }
  return value;
}

function activityContent(
  choicesValue: Prisma.JsonValue,
  validationValue: Prisma.JsonValue,
  feedbackValue: Prisma.JsonValue,
): ActivityContent {
  if (!Array.isArray(choicesValue)) {
    throw new Error("Published activity choices are invalid");
  }
  const choiceIds = choicesValue.map((choice) => {
    const record = jsonRecord(choice);
    if (typeof record.id !== "string") {
      throw new Error("Published activity choice is invalid");
    }
    return record.id;
  });
  const validation = jsonRecord(validationValue);
  const feedback = jsonRecord(feedbackValue);
  if (
    typeof validation.correctChoiceId !== "string" ||
    !choiceIds.includes(validation.correctChoiceId) ||
    typeof feedback.correct !== "string" ||
    typeof feedback.incorrect !== "string"
  ) {
    throw new Error("Published activity evaluation is invalid");
  }

  return {
    choiceIds,
    correctChoiceId: validation.correctChoiceId,
    correctFeedback: feedback.correct,
    incorrectFeedback: feedback.incorrect,
  };
}

function requestHash(
  activityId: string,
  idempotencyKey: string,
  input: SubmitActivityAttemptDto,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        activityId: activityId.toLowerCase(),
        contentVersion: input.contentVersion,
        idempotencyKey: idempotencyKey.toLowerCase(),
        selectedChoiceId: input.selectedChoiceId,
      }),
    )
    .digest("hex");
}

@Injectable()
export class ActivityAttemptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly admission: ActivityAttemptAdmissionService,
    @Optional() private readonly telemetry?: LearningTelemetryService,
  ) {}

  async submit(
    userId: string,
    activityId: string,
    idempotencyKey: string,
    input: SubmitActivityAttemptDto,
    completedAt = new Date(),
  ): Promise<SubmitActivityAttemptResponse> {
    const startedAt = Date.now();
    const normalizedActivityId = activityId.toLowerCase();
    const normalizedIdempotencyKey = idempotencyKey.toLowerCase();
    const hash = requestHash(normalizedActivityId, normalizedIdempotencyKey, input);
    try {
      const admission = await this.admission.admit({
        userId,
        idempotencyKey: normalizedIdempotencyKey,
        requestHash: hash,
      });
      if (admission.kind === "replay") {
        this.telemetry?.recordAttempt({
          outcome: "duplicate",
          durationMs: Date.now() - startedAt,
          activityId: normalizedActivityId,
        });
        return admission.response as unknown as SubmitActivityAttemptResponse;
      }

      try {
        const entitlementKeys = (await this.entitlements.listActive(userId, completedAt)).map(
          (entitlement) => entitlement.key,
        );
        const write = await this.prisma.$transaction((transaction) =>
          this.writeAttempt(
            transaction,
            userId,
            normalizedActivityId,
            normalizedIdempotencyKey,
            hash,
            input,
            entitlementKeys,
            completedAt,
          ),
        );
        admission.complete();
        this.telemetry?.recordAttempt({
          outcome: write.response.result,
          durationMs: Date.now() - startedAt,
          activityId: normalizedActivityId,
          lessonId: write.lessonId,
        });
        this.telemetry?.recordProgress({
          outcome: write.progressUpdated ? "updated" : "unchanged",
          activityId: normalizedActivityId,
          lessonId: write.lessonId,
        });
        return write.response;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const replay = await admission.recoverUniqueKeyConflict();
          this.telemetry?.recordAttempt({
            outcome: "duplicate",
            durationMs: Date.now() - startedAt,
            activityId: normalizedActivityId,
          });
          return replay.response as unknown as SubmitActivityAttemptResponse;
        }
        admission.fail();
        throw error;
      }
    } catch (error) {
      this.telemetry?.recordAttempt({
        outcome: failureOutcome(error),
        durationMs: Date.now() - startedAt,
        activityId: normalizedActivityId,
      });
      throw error;
    }
  }

  private async writeAttempt(
    transaction: Prisma.TransactionClient,
    userId: string,
    activityId: string,
    idempotencyKey: string,
    hash: string,
    input: SubmitActivityAttemptDto,
    entitlementKeys: string[],
    completedAt: Date,
  ): Promise<ActivityAttemptWriteResult> {
    const access = entitlementAccess(entitlementKeys);
    const activity = await transaction.activity.findFirst({
      where: {
        id: activityId,
        archivedAt: null,
        ...access,
        lesson: { archivedAt: null, ...entitlementAccess(entitlementKeys) },
      },
      select: {
        id: true,
        lessonId: true,
        publishedVersion: true,
        publishedContent: { select: { choices: true, validation: true, feedback: true } },
      },
    });
    if (!activity || activity.publishedVersion === null || activity.publishedContent === null) {
      throw new ApiDomainException("resource_not_found");
    }
    if (activity.publishedVersion !== input.contentVersion) {
      throw new ApiDomainException("content_version_conflict");
    }

    const content = activityContent(
      activity.publishedContent.choices,
      activity.publishedContent.validation,
      activity.publishedContent.feedback,
    );
    if (!content.choiceIds.includes(input.selectedChoiceId)) {
      throw new BadRequestException("Unknown activity choice");
    }
    const correct = input.selectedChoiceId === content.correctChoiceId;
    const result = correct ? "correct" : "incorrect";
    const feedback = correct ? content.correctFeedback : content.incorrectFeedback;

    // The lock also covers a first projection write, when no row exists yet to lock. It prevents
    // two valid attempts for the same owned lesson from overwriting each other's completed IDs.
    await transaction.$queryRaw`
      SELECT 1::integer AS locked
      FROM pg_advisory_xact_lock(hashtextextended(${`${userId}:${activity.lessonId}`}, 0))
    `;

    const preference = await transaction.learningPreference.upsert({
      where: { userId },
      update: {},
      create: { userId, timezone: "UTC" },
      select: { timezone: true },
    });
    const publishedActivities = await transaction.activity.findMany({
      where: {
        lessonId: activity.lessonId,
        archivedAt: null,
        publishedVersion: { not: null },
        ...access,
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const existingProgress = await transaction.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: activity.lessonId } },
      select: {
        lessonId: true,
        completedActivityIds: true,
        nextActivityId: true,
        completedAt: true,
        updatedAt: true,
      },
    });
    const awardedCompletion =
      correct && !existingProgress?.completedActivityIds.includes(activity.id);
    let progress = existingProgress;

    if (awardedCompletion) {
      const localDate = localDateAt(completedAt, preference.timezone);
      await transaction.practiceDay.upsert({
        where: { userId_localDate: { userId, localDate } },
        update: { completedActivityCount: { increment: 1 } },
        create: {
          userId,
          localDate,
          timezone: preference.timezone,
          completedActivityCount: 1,
        },
      });

      const completedActivityIds = [...(existingProgress?.completedActivityIds ?? []), activity.id];
      const completedSet = new Set(completedActivityIds);
      const nextActivityId =
        publishedActivities.find((candidate) => !completedSet.has(candidate.id))?.id ?? null;
      const lessonCompletedAt =
        nextActivityId === null ? (existingProgress?.completedAt ?? completedAt) : null;
      progress = await transaction.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: activity.lessonId } },
        update: { completedActivityIds, nextActivityId, completedAt: lessonCompletedAt },
        create: {
          userId,
          lessonId: activity.lessonId,
          completedActivityIds,
          nextActivityId,
          completedAt: lessonCompletedAt,
        },
        select: {
          lessonId: true,
          completedActivityIds: true,
          nextActivityId: true,
          completedAt: true,
          updatedAt: true,
        },
      });
    }

    const progressSnapshot = progress ?? {
      lessonId: activity.lessonId,
      completedActivityIds: [],
      nextActivityId: publishedActivities[0]?.id ?? null,
      completedAt: null,
      updatedAt: completedAt,
    };

    const response: SubmitActivityAttemptResponse = {
      attemptId: randomUUID(),
      activityId: activity.id,
      contentVersion: input.contentVersion,
      result,
      feedback,
      completedAt: completedAt.toISOString(),
      progress: {
        lessonId: progressSnapshot.lessonId,
        completedActivityIds: progressSnapshot.completedActivityIds,
        nextActivityId: progressSnapshot.nextActivityId,
        completedAt: progressSnapshot.completedAt?.toISOString() ?? null,
        updatedAt: progressSnapshot.updatedAt.toISOString(),
      },
    };
    await transaction.activityAttempt.create({
      data: {
        id: response.attemptId,
        userId,
        activityId: activity.id,
        contentVersion: input.contentVersion,
        idempotencyKey,
        requestHash: hash,
        selectedChoiceId: input.selectedChoiceId,
        result: correct ? ActivityAttemptResult.CORRECT : ActivityAttemptResult.INCORRECT,
        response: response as unknown as Prisma.InputJsonValue,
        completedAt,
      },
    });

    return { response, progressUpdated: awardedCompletion, lessonId: activity.lessonId };
  }
}
