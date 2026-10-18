import { BadRequestException } from "@nestjs/common";
import { ActivityAttemptResult, Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { EntitlementsService } from "../billing/entitlements.service";
import { ApiDomainException } from "../common/errors/api-domain.exception";
import type { PrismaService } from "../database/prisma.service";
import type { ActivityAttemptAdmissionService } from "./activity-attempt-admission.service";
import { ActivityAttemptService } from "./activity-attempt.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const LESSON_ID = "22222222-2222-4222-8222-222222222222";
const ACTIVITY_ID = "33333333-3333-4333-8333-333333333333";
const NEXT_ACTIVITY_ID = "44444444-4444-4444-8444-444444444444";
const KEY = "55555555-5555-4555-8555-555555555555";
const NOW = new Date("2026-10-18T00:30:00.000Z");

function createTransaction() {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ locked: 1 }]),
    activity: {
      findFirst: vi.fn().mockResolvedValue({
        id: ACTIVITY_ID,
        lessonId: LESSON_ID,
        publishedVersion: 1,
        publishedContent: {
          choices: [
            { id: "hola", label: "Hola" },
            { id: "adios", label: "Adiós" },
          ],
          validation: { correctChoiceId: "hola" },
          feedback: { correct: "Correct", incorrect: "Try again" },
        },
      }),
      findMany: vi.fn().mockResolvedValue([{ id: ACTIVITY_ID }, { id: NEXT_ACTIVITY_ID }]),
    },
    learningPreference: {
      upsert: vi.fn().mockResolvedValue({ timezone: "UTC" }),
    },
    practiceDay: { upsert: vi.fn().mockResolvedValue({}) },
    lessonProgress: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockImplementation(({ create }) =>
        Promise.resolve({
          lessonId: LESSON_ID,
          completedActivityIds: create.completedActivityIds,
          nextActivityId: create.nextActivityId,
          completedAt: create.completedAt,
          updatedAt: NOW,
        }),
      ),
    },
    activityAttempt: { create: vi.fn().mockResolvedValue({}) },
  };
}

function createFixture() {
  const transaction = createTransaction();
  const prisma = {
    $transaction: vi.fn().mockImplementation((callback) => callback(transaction)),
  };
  const entitlements = { listActive: vi.fn().mockResolvedValue([]) };
  const complete = vi.fn();
  const fail = vi.fn();
  const recoverUniqueKeyConflict = vi.fn();
  const admission = {
    admit: vi.fn().mockResolvedValue({
      kind: "provisional_new",
      complete,
      fail,
      recoverUniqueKeyConflict,
    }),
  };
  const service = new ActivityAttemptService(
    prisma as unknown as PrismaService,
    entitlements as unknown as EntitlementsService,
    admission as unknown as ActivityAttemptAdmissionService,
  );

  return {
    service,
    prisma,
    transaction,
    entitlements,
    admission,
    complete,
    fail,
    recoverUniqueKeyConflict,
  };
}

describe("ActivityAttemptService", () => {
  it("records a correct attempt and advances progress in one transaction", async () => {
    const fixture = createFixture();

    const response = await fixture.service.submit(
      USER_ID,
      ACTIVITY_ID,
      KEY,
      { contentVersion: 1, selectedChoiceId: "hola" },
      NOW,
    );

    expect(response).toMatchObject({
      activityId: ACTIVITY_ID,
      result: "correct",
      feedback: "Correct",
      progress: {
        lessonId: LESSON_ID,
        completedActivityIds: [ACTIVITY_ID],
        nextActivityId: NEXT_ACTIVITY_ID,
      },
    });
    expect(fixture.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(fixture.transaction.$queryRaw).toHaveBeenCalledOnce();
    expect(fixture.transaction.practiceDay.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          localDate: new Date("2026-10-18T00:00:00.000Z"),
          timezone: "UTC",
          completedActivityCount: 1,
        }),
        update: { completedActivityCount: { increment: 1 } },
      }),
    );
    expect(fixture.transaction.activityAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        idempotencyKey: KEY,
        result: ActivityAttemptResult.CORRECT,
      }),
    });
    expect(fixture.complete).toHaveBeenCalledOnce();
    expect(fixture.fail).not.toHaveBeenCalled();
  });

  it("records incorrect feedback and completes a lesson after its final activity", async () => {
    const fixture = createFixture();
    fixture.transaction.activity.findMany.mockResolvedValue([{ id: ACTIVITY_ID }]);

    const response = await fixture.service.submit(
      USER_ID,
      ACTIVITY_ID,
      KEY,
      { contentVersion: 1, selectedChoiceId: "adios" },
      NOW,
    );

    expect(response).toMatchObject({
      result: "incorrect",
      feedback: "Try again",
      progress: { nextActivityId: null, completedAt: NOW.toISOString() },
    });
    expect(fixture.transaction.activityAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: ActivityAttemptResult.INCORRECT }),
    });
  });

  it("returns a stored replay before entitlement lookup or transaction work", async () => {
    const fixture = createFixture();
    const stored = { attemptId: "stored", result: "correct" };
    fixture.admission.admit.mockResolvedValue({ kind: "replay", response: stored });

    await expect(
      fixture.service.submit(
        USER_ID,
        ACTIVITY_ID,
        KEY,
        { contentVersion: 1, selectedChoiceId: "hola" },
        NOW,
      ),
    ).resolves.toBe(stored);
    expect(fixture.entitlements.listActive).not.toHaveBeenCalled();
    expect(fixture.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects inaccessible or archived content without projections", async () => {
    const fixture = createFixture();
    fixture.transaction.activity.findFirst.mockResolvedValue(null);

    const error = await fixture.service
      .submit(USER_ID, ACTIVITY_ID, KEY, { contentVersion: 1, selectedChoiceId: "hola" }, NOW)
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiDomainException);
    expect(error).toMatchObject({ code: "resource_not_found" });
    expect(fixture.transaction.practiceDay.upsert).not.toHaveBeenCalled();
    expect(fixture.fail).toHaveBeenCalledOnce();
  });

  it("rejects stale content versions before writing progress", async () => {
    const fixture = createFixture();

    const error = await fixture.service
      .submit(USER_ID, ACTIVITY_ID, KEY, { contentVersion: 2, selectedChoiceId: "hola" }, NOW)
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiDomainException);
    expect(error).toMatchObject({ code: "content_version_conflict" });
    expect(fixture.transaction.practiceDay.upsert).not.toHaveBeenCalled();
  });

  it("rejects a choice that was not issued by the published activity", async () => {
    const fixture = createFixture();

    await expect(
      fixture.service.submit(
        USER_ID,
        ACTIVITY_ID,
        KEY,
        { contentVersion: 1, selectedChoiceId: "injected" },
        NOW,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fixture.transaction.practiceDay.upsert).not.toHaveBeenCalled();
  });

  it("releases the rate-limit reservation when a transaction fails", async () => {
    const fixture = createFixture();
    fixture.prisma.$transaction.mockRejectedValue(new Error("database unavailable"));

    await expect(
      fixture.service.submit(
        USER_ID,
        ACTIVITY_ID,
        KEY,
        { contentVersion: 1, selectedChoiceId: "hola" },
        NOW,
      ),
    ).rejects.toThrow("database unavailable");
    expect(fixture.fail).toHaveBeenCalledOnce();
    expect(fixture.complete).not.toHaveBeenCalled();
  });

  it("recovers the committed winner after an idempotency unique-key race", async () => {
    const fixture = createFixture();
    const stored = { attemptId: "winner", result: "correct" };
    fixture.prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        clientVersion: "6.19.3",
        code: "P2002",
      }),
    );
    fixture.recoverUniqueKeyConflict.mockResolvedValue({ kind: "replay", response: stored });

    await expect(
      fixture.service.submit(
        USER_ID,
        ACTIVITY_ID,
        KEY,
        { contentVersion: 1, selectedChoiceId: "hola" },
        NOW,
      ),
    ).resolves.toBe(stored);
    expect(fixture.recoverUniqueKeyConflict).toHaveBeenCalledOnce();
    expect(fixture.fail).not.toHaveBeenCalled();
  });
});
