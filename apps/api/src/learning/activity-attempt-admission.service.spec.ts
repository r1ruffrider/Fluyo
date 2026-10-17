import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { ApiDomainException } from "../common/errors/api-domain.exception";
import type { ActivityAttemptRateLimiter } from "./activity-attempt-rate-limiter";
import {
  ActivityAttemptAdmissionService,
  type ActivityAttemptReplayStore,
} from "./activity-attempt-admission.service";

const REQUEST = {
  idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  requestHash: "normalized-request-hash",
  userId: "11111111-1111-4111-8111-111111111111",
};

function createService(
  replayStore: ActivityAttemptReplayStore,
  rateLimiter: ActivityAttemptRateLimiter,
): ActivityAttemptAdmissionService {
  return new ActivityAttemptAdmissionService(replayStore, rateLimiter);
}

function allowedDecision() {
  return {
    allowed: true as const,
    lease: { complete: vi.fn(), fail: vi.fn() },
  };
}

describe("ActivityAttemptAdmissionService", () => {
  it("returns a stored replay before consulting the limiter", async () => {
    const replayStore = {
      findByOwnerAndKey: vi.fn().mockResolvedValue({
        requestHash: REQUEST.requestHash,
        response: { attemptId: "attempt-1" },
      }),
    } satisfies ActivityAttemptReplayStore;
    const rateLimiter = {
      checkAndConsume: vi.fn().mockReturnValue({ allowed: false, retryAfterSeconds: 60 }),
    } satisfies ActivityAttemptRateLimiter;

    await expect(createService(replayStore, rateLimiter).admit(REQUEST)).resolves.toEqual({
      kind: "replay",
      response: { attemptId: "attempt-1" },
    });
    expect(rateLimiter.checkAndConsume).not.toHaveBeenCalled();
  });

  it("returns an idempotency conflict before consulting a saturated limiter", async () => {
    const replayStore = {
      findByOwnerAndKey: vi.fn().mockResolvedValue({
        requestHash: "different-request-hash",
        response: { attemptId: "attempt-1" },
      }),
    } satisfies ActivityAttemptReplayStore;
    const rateLimiter = {
      checkAndConsume: vi.fn().mockReturnValue({ allowed: false, retryAfterSeconds: 60 }),
    } satisfies ActivityAttemptRateLimiter;

    const error = await createService(replayStore, rateLimiter)
      .admit(REQUEST)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiDomainException);
    expect(error).toMatchObject({ code: "idempotency_conflict" });
    expect(rateLimiter.checkAndConsume).not.toHaveBeenCalled();
  });

  it("rate-limits a new key before any write", async () => {
    const replayStore = {
      findByOwnerAndKey: vi.fn().mockResolvedValue(null),
    } satisfies ActivityAttemptReplayStore;
    const rateLimiter = {
      checkAndConsume: vi.fn().mockReturnValue({ allowed: false, retryAfterSeconds: 11 }),
    } satisfies ActivityAttemptRateLimiter;

    const error = await createService(replayStore, rateLimiter)
      .admit(REQUEST)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiDomainException);
    expect(error).toMatchObject({
      code: "rate_limited",
      retryAfterSeconds: 11,
      safeDetails: { retryAfterSeconds: 11 },
    });
    expect((error as ApiDomainException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it("admits a new key when capacity remains", async () => {
    const replayStore = {
      findByOwnerAndKey: vi.fn().mockResolvedValue(null),
    } satisfies ActivityAttemptReplayStore;
    const decision = allowedDecision();
    const rateLimiter = {
      checkAndConsume: vi.fn().mockReturnValue(decision),
    } satisfies ActivityAttemptRateLimiter;

    const admission = await createService(replayStore, rateLimiter).admit(REQUEST);

    expect(admission).toMatchObject({ kind: "provisional_new" });
    expect(rateLimiter.checkAndConsume).toHaveBeenCalledWith(
      REQUEST.userId,
      REQUEST.idempotencyKey,
    );
    if (admission.kind !== "provisional_new") {
      throw new Error("Expected provisional admission");
    }
    admission.complete();
    expect(decision.lease.complete).toHaveBeenCalledOnce();
  });

  it("recovers the unique-key loser as a replay after concurrent provisional admission", async () => {
    const stored = {
      requestHash: REQUEST.requestHash,
      response: { attemptId: "attempt-winner" },
    };
    const replayStore = {
      findByOwnerAndKey: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(stored),
    } satisfies ActivityAttemptReplayStore;
    const decision = allowedDecision();
    const rateLimiter = {
      checkAndConsume: vi.fn().mockReturnValue(decision),
    } satisfies ActivityAttemptRateLimiter;
    const admission = await createService(replayStore, rateLimiter).admit(REQUEST);

    expect(admission.kind).toBe("provisional_new");
    if (admission.kind !== "provisional_new") {
      throw new Error("Expected provisional admission");
    }
    await expect(admission.recoverUniqueKeyConflict()).resolves.toEqual({
      kind: "replay",
      response: stored.response,
    });
    expect(decision.lease.fail).toHaveBeenCalledOnce();
  });

  it("recovers a concurrent changed-payload loser as an idempotency conflict", async () => {
    const replayStore = {
      findByOwnerAndKey: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          requestHash: "different-request-hash",
          response: { attemptId: "attempt-winner" },
        }),
    } satisfies ActivityAttemptReplayStore;
    const decision = allowedDecision();
    const rateLimiter = {
      checkAndConsume: vi.fn().mockReturnValue(decision),
    } satisfies ActivityAttemptRateLimiter;
    const admission = await createService(replayStore, rateLimiter).admit(REQUEST);

    if (admission.kind !== "provisional_new") {
      throw new Error("Expected provisional admission");
    }
    await expect(admission.recoverUniqueKeyConflict()).rejects.toMatchObject({
      code: "idempotency_conflict",
    });
    expect(decision.lease.fail).toHaveBeenCalledOnce();
  });

  it("keeps a missing unique-key winner behind the internal error boundary", async () => {
    const replayStore = {
      findByOwnerAndKey: vi.fn().mockResolvedValue(null),
    } satisfies ActivityAttemptReplayStore;
    const decision = allowedDecision();
    const rateLimiter = {
      checkAndConsume: vi.fn().mockReturnValue(decision),
    } satisfies ActivityAttemptRateLimiter;
    const admission = await createService(replayStore, rateLimiter).admit(REQUEST);

    if (admission.kind !== "provisional_new") {
      throw new Error("Expected provisional admission");
    }
    await expect(admission.recoverUniqueKeyConflict()).rejects.toThrow(
      "The winning idempotent activity attempt could not be loaded",
    );
    expect(decision.lease.fail).toHaveBeenCalledOnce();
  });
});
