export const ACTIVITY_ATTEMPT_RATE_LIMITER = Symbol("ACTIVITY_ATTEMPT_RATE_LIMITER");

export const ACTIVITY_ATTEMPT_RATE_LIMIT = 30;
export const ACTIVITY_ATTEMPT_RATE_WINDOW_MS = 60_000;

export type ActivityAttemptRateLimitDecision =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

export interface ActivityAttemptRateLimiter {
  checkAndConsume(userId: string, idempotencyKey: string): ActivityAttemptRateLimitDecision;
}

interface InMemoryActivityAttemptRateLimiterOptions {
  clock?: () => number;
  limit?: number;
  windowMs?: number;
}

export class InMemoryActivityAttemptRateLimiter implements ActivityAttemptRateLimiter {
  private readonly attemptsByUser = new Map<
    string,
    Array<{ attemptedAt: number; idempotencyKey: string }>
  >();
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
      ({ attemptedAt }) => attemptedAt > cutoff,
    );

    if (recentAttempts.some((attempt) => attempt.idempotencyKey === idempotencyKey)) {
      this.attemptsByUser.set(userId, recentAttempts);
      return { allowed: true };
    }

    if (recentAttempts.length >= this.limit) {
      const oldestAttempt = recentAttempts[0]?.attemptedAt;
      if (oldestAttempt === undefined) {
        throw new Error("Rate limiter reached an invalid state");
      }

      this.attemptsByUser.set(userId, recentAttempts);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((oldestAttempt + this.windowMs - now) / 1_000)),
      };
    }

    recentAttempts.push({ attemptedAt: now, idempotencyKey });
    this.attemptsByUser.set(userId, recentAttempts);
    return { allowed: true };
  }

  private sweepExpiredUsers(now: number): void {
    if (now < this.nextSweepAt) {
      return;
    }

    const cutoff = now - this.windowMs;
    for (const [userId, attempts] of this.attemptsByUser) {
      if (!attempts.some(({ attemptedAt }) => attemptedAt > cutoff)) {
        this.attemptsByUser.delete(userId);
      }
    }
    this.nextSweepAt = now + this.windowMs;
  }
}
