import { describe, expect, it } from "vitest";

import {
  ACTIVITY_ATTEMPT_RATE_LIMIT,
  ACTIVITY_ATTEMPT_RATE_WINDOW_MS,
  type ActivityAttemptRateLimitDecision,
  type ActivityAttemptRateLimitLease,
  InMemoryActivityAttemptRateLimiter,
} from "./activity-attempt-rate-limiter";

function expectAllowed(decision: ActivityAttemptRateLimitDecision): ActivityAttemptRateLimitLease {
  expect(decision).toMatchObject({ allowed: true });
  if (!decision.allowed) {
    throw new Error("Expected the rate limiter to allow the request");
  }
  return decision.lease;
}

describe("InMemoryActivityAttemptRateLimiter", () => {
  it("allows 30 attempts, rejects the next request, and permits it after the rolling window", () => {
    let now = 10_000;
    const limiter = new InMemoryActivityAttemptRateLimiter({ clock: () => now });

    for (let attempt = 0; attempt < ACTIVITY_ATTEMPT_RATE_LIMIT; attempt += 1) {
      expectAllowed(limiter.checkAndConsume("user-a", `key-${attempt}`)).complete();
    }

    expect(limiter.checkAndConsume("user-a", "new-key")).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });

    now += ACTIVITY_ATTEMPT_RATE_WINDOW_MS;
    expectAllowed(limiter.checkAndConsume("user-a", "new-key")).complete();
  });

  it("isolates limits by verified user ID", () => {
    const limiter = new InMemoryActivityAttemptRateLimiter({ limit: 1 });

    expectAllowed(limiter.checkAndConsume("user-a", "key-a")).complete();
    expect(limiter.checkAndConsume("user-a", "key-b")).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expectAllowed(limiter.checkAndConsume("user-b", "key-b")).complete();
  });

  it("does not consume capacity twice for the same pending idempotency key", () => {
    const limiter = new InMemoryActivityAttemptRateLimiter({ limit: 1 });

    const firstLease = expectAllowed(limiter.checkAndConsume("user-a", "same-key"));
    const secondLease = expectAllowed(limiter.checkAndConsume("user-a", "same-key"));
    expect(limiter.checkAndConsume("user-a", "new-key")).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    firstLease.complete();
    secondLease.fail();
  });

  it("removes settled in-flight state while retaining the consumed capacity", () => {
    const limiter = new InMemoryActivityAttemptRateLimiter({ limit: 2 });

    const firstLease = expectAllowed(limiter.checkAndConsume("user-a", "same-key"));
    const concurrentLease = expectAllowed(limiter.checkAndConsume("user-a", "same-key"));
    firstLease.fail();
    concurrentLease.fail();

    expectAllowed(limiter.checkAndConsume("user-a", "same-key")).fail();
    expect(limiter.checkAndConsume("user-a", "new-key")).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });

  it("rate-limits the 31st sequential failed attempt that reuses one key", () => {
    const limiter = new InMemoryActivityAttemptRateLimiter();

    for (let attempt = 0; attempt < ACTIVITY_ATTEMPT_RATE_LIMIT; attempt += 1) {
      expectAllowed(limiter.checkAndConsume("user-a", "same-key")).fail();
    }

    expect(limiter.checkAndConsume("user-a", "same-key")).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });

  it("settles each concurrent reservation once", () => {
    const limiter = new InMemoryActivityAttemptRateLimiter({ limit: 2 });
    const firstLease = expectAllowed(limiter.checkAndConsume("user-a", "same-key"));
    const secondLease = expectAllowed(limiter.checkAndConsume("user-a", "same-key"));

    firstLease.complete();
    firstLease.fail();
    const thirdLease = expectAllowed(limiter.checkAndConsume("user-a", "same-key"));
    secondLease.fail();
    thirdLease.complete();

    expectAllowed(limiter.checkAndConsume("user-a", "same-key")).fail();

    expect(limiter.checkAndConsume("user-a", "new-key")).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });

  it("does not let a stale lease settle a replacement generation", () => {
    let now = 0;
    const limiter = new InMemoryActivityAttemptRateLimiter({
      clock: () => now,
      limit: 1,
      windowMs: 10,
    });
    const staleLease = expectAllowed(limiter.checkAndConsume("user-a", "same-key"));

    now = 10;
    const replacementLease = expectAllowed(limiter.checkAndConsume("user-a", "same-key"));
    staleLease.fail();
    const concurrentReplacementLease = expectAllowed(limiter.checkAndConsume("user-a", "same-key"));

    replacementLease.complete();
    concurrentReplacementLease.complete();
  });

  it("rejects invalid limiter configuration", () => {
    expect(() => new InMemoryActivityAttemptRateLimiter({ limit: 0 })).toThrow(
      "Activity attempt rate limit must be a positive integer",
    );
    expect(() => new InMemoryActivityAttemptRateLimiter({ windowMs: 0 })).toThrow(
      "Activity attempt rate window must be positive",
    );
  });
});
