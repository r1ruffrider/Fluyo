import { Inject, Injectable } from "@nestjs/common";

import { ApiDomainException, rateLimitedException } from "../common/errors/api-domain.exception";
import {
  ACTIVITY_ATTEMPT_RATE_LIMITER,
  type ActivityAttemptRateLimiter,
} from "./activity-attempt-rate-limiter";

export const ACTIVITY_ATTEMPT_REPLAY_STORE = Symbol("ACTIVITY_ATTEMPT_REPLAY_STORE");

export interface StoredActivityAttemptReplay {
  requestHash: string;
  response: unknown;
}

export interface ActivityAttemptReplayStore {
  findByOwnerAndKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<StoredActivityAttemptReplay | null>;
}

export type ActivityAttemptAdmission = { kind: "new" } | { kind: "replay"; response: unknown };

interface ActivityAttemptAdmissionRequest {
  idempotencyKey: string;
  requestHash: string;
  userId: string;
}

@Injectable()
export class ActivityAttemptAdmissionService {
  constructor(
    @Inject(ACTIVITY_ATTEMPT_REPLAY_STORE)
    private readonly replayStore: ActivityAttemptReplayStore,
    @Inject(ACTIVITY_ATTEMPT_RATE_LIMITER)
    private readonly rateLimiter: ActivityAttemptRateLimiter,
  ) {}

  async admit(request: ActivityAttemptAdmissionRequest): Promise<ActivityAttemptAdmission> {
    const existing = await this.replayStore.findByOwnerAndKey(
      request.userId,
      request.idempotencyKey,
    );

    if (existing) {
      if (existing.requestHash !== request.requestHash) {
        throw new ApiDomainException("idempotency_conflict");
      }

      return { kind: "replay", response: existing.response };
    }

    const decision = this.rateLimiter.checkAndConsume(request.userId);
    if (!decision.allowed) {
      throw rateLimitedException(decision.retryAfterSeconds);
    }

    return { kind: "new" };
  }
}
