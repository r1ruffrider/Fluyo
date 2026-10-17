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
      safeDetails: { retryAfterSeconds: 11 },
      safeHeaders: { "Retry-After": "11" },
    });
    expect((error as ApiDomainException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it("admits a new key when capacity remains", async () => {
    const replayStore = {
      findByOwnerAndKey: vi.fn().mockResolvedValue(null),
    } satisfies ActivityAttemptReplayStore;
    const rateLimiter = {
      checkAndConsume: vi.fn().mockReturnValue({ allowed: true }),
    } satisfies ActivityAttemptRateLimiter;

    await expect(createService(replayStore, rateLimiter).admit(REQUEST)).resolves.toEqual({
      kind: "new",
    });
    expect(rateLimiter.checkAndConsume).toHaveBeenCalledWith(REQUEST.userId);
  });
});
