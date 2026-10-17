import { describe, expect, it } from "vitest";

import {
  ACTIVITY_ATTEMPT_RATE_LIMIT,
  ACTIVITY_ATTEMPT_RATE_WINDOW_MS,
  InMemoryActivityAttemptRateLimiter,
} from "./activity-attempt-rate-limiter";

describe("InMemoryActivityAttemptRateLimiter", () => {
  it("allows 30 attempts, rejects the next request, and permits it after the rolling window", () => {
    let now = 10_000;
    const limiter = new InMemoryActivityAttemptRateLimiter({ clock: () => now });

    for (let attempt = 0; attempt < ACTIVITY_ATTEMPT_RATE_LIMIT; attempt += 1) {
      expect(limiter.checkAndConsume("user-a")).toEqual({ allowed: true });
    }

    expect(limiter.checkAndConsume("user-a")).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });

    now += ACTIVITY_ATTEMPT_RATE_WINDOW_MS;
    expect(limiter.checkAndConsume("user-a")).toEqual({ allowed: true });
  });

  it("isolates limits by verified user ID", () => {
    const limiter = new InMemoryActivityAttemptRateLimiter({ limit: 1 });

    expect(limiter.checkAndConsume("user-a")).toEqual({ allowed: true });
    expect(limiter.checkAndConsume("user-a")).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(limiter.checkAndConsume("user-b")).toEqual({ allowed: true });
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
