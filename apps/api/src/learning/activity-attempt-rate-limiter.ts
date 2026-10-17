export const ACTIVITY_ATTEMPT_RATE_LIMITER = Symbol("ACTIVITY_ATTEMPT_RATE_LIMITER");

export const ACTIVITY_ATTEMPT_RATE_LIMIT = 30;
export const ACTIVITY_ATTEMPT_RATE_WINDOW_MS = 60_000;

export interface ActivityAttemptRateLimitLease {
  complete(): void;
  fail(): void;
}

export type ActivityAttemptRateLimitDecision =
  | { allowed: true; lease: ActivityAttemptRateLimitLease }
  | { allowed: false; retryAfterSeconds: number };

export interface ActivityAttemptRateLimiter {
  checkAndConsume(userId: string, idempotencyKey: string): ActivityAttemptRateLimitDecision;
}

interface InMemoryActivityAttemptRateLimiterOptions {
  clock?: () => number;
  limit?: number;
  windowMs?: number;
}

interface InFlightActivityAttemptReservation {
  expiresAt: number;
  reservations: number;
}

export class InMemoryActivityAttemptRateLimiter implements ActivityAttemptRateLimiter {
  private readonly attemptsByUser = new Map<string, number[]>();
  private readonly inFlightByOwnerAndKey = new Map<string, InFlightActivityAttemptReservation>();
  private readonly clock: () => number;
  private readonly limit: number;
  private readonly windowMs: number;
  private nextSweepAt = 0;

  constructor(options: InMemoryActivityAttemptRateLimiterOptions = {}) {
    this.clock = options.clock ?? Date.now;
    this.limit = options.limit ?? ACTIVITY_ATTEMPT_RATE_LIMIT;
    this.windowMs = options.windowMs ?? ACTIVITY_ATTEMPT_RATE_WINDOW_MS;

    if (!Number.isInteger(this.limit) || this.limit < 1) {
      throw new Error("Activity attempt rate limit must be a positive integer");
    }
    if (!Number.isFinite(this.windowMs) || this.windowMs <= 0) {
      throw new Error("Activity attempt rate window must be positive");
    }
  }

  checkAndConsume(userId: string, idempotencyKey: string): ActivityAttemptRateLimitDecision {
    const now = this.clock();
    this.sweepExpiredUsers(now);

    const cutoff = now - this.windowMs;
    const recentAttempts = (this.attemptsByUser.get(userId) ?? []).filter(
      (attemptedAt) => attemptedAt > cutoff,
    );
    const ownerAndKey = this.ownerAndKey(userId, idempotencyKey);
    const inFlight = this.inFlightByOwnerAndKey.get(ownerAndKey);

    if (inFlight && inFlight.expiresAt > now) {
      inFlight.reservations += 1;
      this.attemptsByUser.set(userId, recentAttempts);
      return { allowed: true, lease: this.createLease(ownerAndKey, inFlight) };
    }

    if (recentAttempts.length >= this.limit) {
      const oldestAttempt = recentAttempts[0];
      if (oldestAttempt === undefined) {
        throw new Error("Rate limiter reached an invalid state");
      }

      this.attemptsByUser.set(userId, recentAttempts);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((oldestAttempt + this.windowMs - now) / 1_000)),
      };
    }

    recentAttempts.push(now);
    this.attemptsByUser.set(userId, recentAttempts);
    const inFlightReservation = {
      expiresAt: now + this.windowMs,
      reservations: 1,
    };
    this.inFlightByOwnerAndKey.set(ownerAndKey, inFlightReservation);
    return {
      allowed: true,
      lease: this.createLease(ownerAndKey, inFlightReservation),
    };
  }

  private createLease(
    ownerAndKey: string,
    generation: InFlightActivityAttemptReservation,
  ): ActivityAttemptRateLimitLease {
    let settled = false;
    const settle = (): void => {
      if (settled) {
        return;
      }
      settled = true;

      const currentGeneration = this.inFlightByOwnerAndKey.get(ownerAndKey);
      if (currentGeneration !== generation) {
        return;
      }
      if (generation.reservations <= 1) {
        this.inFlightByOwnerAndKey.delete(ownerAndKey);
        return;
      }
      generation.reservations -= 1;
    };

    return { complete: settle, fail: settle };
  }

  private ownerAndKey(userId: string, idempotencyKey: string): string {
    return `${userId}\u0000${idempotencyKey}`;
  }

  private sweepExpiredUsers(now: number): void {
    if (now < this.nextSweepAt) {
      return;
    }

    const cutoff = now - this.windowMs;
    for (const [userId, attempts] of this.attemptsByUser) {
      if (!attempts.some((attemptedAt) => attemptedAt > cutoff)) {
        this.attemptsByUser.delete(userId);
      }
    }
    for (const [ownerAndKey, inFlight] of this.inFlightByOwnerAndKey) {
      if (inFlight.expiresAt <= now) {
        this.inFlightByOwnerAndKey.delete(ownerAndKey);
      }
    }
    this.nextSweepAt = now + this.windowMs;
  }
}
