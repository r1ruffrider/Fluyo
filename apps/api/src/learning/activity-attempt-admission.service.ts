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

export type ActivityAttemptReplay = { kind: "replay"; response: unknown };

export type ActivityAttemptAdmission =
  | {
      /**
       * The downstream transaction must insert under the unique owner/idempotency-key constraint.
       * If it loses that race, it must call this recovery before returning a response.
       */
      kind: "provisional_new";
      recoverUniqueKeyConflict: () => Promise<ActivityAttemptReplay>;
    }
  | ActivityAttemptReplay;

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

    const decision = this.rateLimiter.checkAndConsume(request.userId, request.idempotencyKey);
    if (!decision.allowed) {
      throw rateLimitedException(decision.retryAfterSeconds);
    }

    return {
      kind: "provisional_new",
      recoverUniqueKeyConflict: () => this.recoverUniqueKeyConflict(request),
    };
  }

  private async recoverUniqueKeyConflict(
    request: ActivityAttemptAdmissionRequest,
  ): Promise<ActivityAttemptReplay> {
    const winner = await this.replayStore.findByOwnerAndKey(request.userId, request.idempotencyKey);

    if (!winner) {
      // A real unique-key violation guarantees a committed winner. Missing data is an internal
      // consistency failure and must stay behind the global generic-error boundary.
      throw new Error("The winning idempotent activity attempt could not be loaded");
    }
    if (winner.requestHash !== request.requestHash) {
      throw new ApiDomainException("idempotency_conflict");
    }

    return { kind: "replay", response: winner.response };
  }
}
