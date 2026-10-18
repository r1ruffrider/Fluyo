import { createHash, randomUUID } from "node:crypto";

import type { SubmitActivityAttemptResponse } from "@fluyo/shared";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ActivityAttemptResult, Prisma } from "@prisma/client";

import { EntitlementsService } from "../billing/entitlements.service";
import { ApiDomainException } from "../common/errors/api-domain.exception";
import { PrismaService } from "../database/prisma.service";
import { ActivityAttemptAdmissionService } from "./activity-attempt-admission.service";
import type { SubmitActivityAttemptDto } from "./dto/submit-activity-attempt.dto";
import { localDateAt } from "./learning-time";

interface ActivityContent {
  choiceIds: string[];
  correctChoiceId: string;
  correctFeedback: string;
  incorrectFeedback: string;
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
        activityId,
        contentVersion: input.contentVersion,
        idempotencyKey,
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
  ) {}

  async submit(
    userId: string,
    activityId: string,
    idempotencyKey: string,
    input: SubmitActivityAttemptDto,
    completedAt = new Date(),
  ): Promise<SubmitActivityAttemptResponse> {
    const hash = requestHash(activityId, idempotencyKey, input);
    const admission = await this.admission.admit({
      userId,
      idempotencyKey,
      requestHash: hash,
    });
    if (admission.kind === "replay") {
      return admission.response as unknown as SubmitActivityAttemptResponse;
    }

    try {
      const entitlementKeys = (await this.entitlements.listActive(userId, completedAt)).map(
        (entitlement) => entitlement.key,
      );
      const response = await this.prisma.$transaction((transaction) =>
        this.writeAttempt(
          transaction,
          userId,
          activityId,
          idempotencyKey,
          hash,
          input,
          entitlementKeys,
          completedAt,
        ),
      );
      admission.complete();
      return response;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return (await admission.recoverUniqueKeyConflict())
          .response as unknown as SubmitActivityAttemptResponse;
      }
      admission.fail();
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
  ): Promise<SubmitActivityAttemptResponse> {
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
      select: { completedActivityIds: true, completedAt: true },
    });
    const completedActivityIds = existingProgress?.completedActivityIds.includes(activity.id)
      ? existingProgress.completedActivityIds
      : [...(existingProgress?.completedActivityIds ?? []), activity.id];
    const completedSet = new Set(completedActivityIds);
    const nextActivityId =
      publishedActivities.find((candidate) => !completedSet.has(candidate.id))?.id ?? null;
    const lessonCompletedAt =
      nextActivityId === null ? (existingProgress?.completedAt ?? completedAt) : null;
    const progress = await transaction.lessonProgress.upsert({
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

    const response: SubmitActivityAttemptResponse = {
      attemptId: randomUUID(),
      activityId: activity.id,
      contentVersion: input.contentVersion,
      result,
      feedback,
      completedAt: completedAt.toISOString(),
      progress: {
        lessonId: progress.lessonId,
        completedActivityIds: progress.completedActivityIds,
        nextActivityId: progress.nextActivityId,
        completedAt: progress.completedAt?.toISOString() ?? null,
        updatedAt: progress.updatedAt.toISOString(),
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

    return response;
  }
}
