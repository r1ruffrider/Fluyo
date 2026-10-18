import { describe, expect, it } from "vitest";

import {
  type AttemptActionState,
  isCorrectResultForActivity,
  shouldRotateAttemptKey,
} from "./attempt-state";

const COMPLETED_ACTIVITY = "22222222-2222-4222-8222-222222222222";
const NEXT_ACTIVITY = "33333333-3333-4333-8333-333333333333";
const correctState: AttemptActionState = {
  activityId: COMPLETED_ACTIVITY,
  error: null,
  feedback: "Correct",
  result: "correct",
  selectedChoiceId: "hola",
};

describe("attempt idempotency state", () => {
  it("keeps the key while the first unsubmitted selection changes", () => {
    expect(shouldRotateAttemptKey(null, "adios")).toBe(false);
  });

  it("keeps the key when retrying the same selection after an ambiguous failure", () => {
    expect(shouldRotateAttemptKey("hola", "hola")).toBe(false);
  });

  it("rotates the key when a learner changes selection before the pending request settles", () => {
    expect(shouldRotateAttemptKey("hola", "adios")).toBe(true);
  });

  it("disables resubmission for the activity that was confirmed correct", () => {
    expect(isCorrectResultForActivity(correctState, COMPLETED_ACTIVITY)).toBe(true);
  });

  it("does not disable the next activity when the prior activity was confirmed correct", () => {
    expect(isCorrectResultForActivity(correctState, NEXT_ACTIVITY)).toBe(false);
  });
});
