import { describe, expect, it } from "vitest";

import {
  ACTIVITY_ATTEMPT_RESULTS,
  ACTIVITY_KINDS,
  LEARNING_DEFAULT_DAILY_TARGET,
  LEARNING_DEFAULT_PAGE_LIMIT,
  LEARNING_MAX_DAILY_TARGET,
  LEARNING_MAX_PAGE_LIMIT,
  LEARNING_MIN_DAILY_TARGET,
  LEARNING_PATHS,
} from "./learning";

describe("learning API contracts", () => {
  it("publishes stable versioned endpoint paths", () => {
    expect(LEARNING_PATHS).toEqual({
      dashboard: "/learning/dashboard",
      lessons: "/lessons",
      lesson: "/lessons/:lessonId",
      phraseDecks: "/phrase-decks",
      activityAttempts: "/activities/:activityId/attempts",
      goal: "/learning-goals/me",
      preferences: "/learning-preferences/me",
      notificationPreferences: "/notification-preferences/me",
    });
  });

  it("keeps pagination and daily-goal bounds aligned with ADR 0005", () => {
    expect(LEARNING_DEFAULT_PAGE_LIMIT).toBe(20);
    expect(LEARNING_MAX_PAGE_LIMIT).toBe(50);
    expect(LEARNING_DEFAULT_DAILY_TARGET).toBe(3);
    expect(LEARNING_MIN_DAILY_TARGET).toBe(1);
    expect(LEARNING_MAX_DAILY_TARGET).toBe(20);
  });

  it("exposes only the supported public activity kind and outcomes", () => {
    expect(ACTIVITY_KINDS).toEqual(["phrase_choice"]);
    expect(ACTIVITY_ATTEMPT_RESULTS).toEqual(["correct", "incorrect"]);
  });
});
