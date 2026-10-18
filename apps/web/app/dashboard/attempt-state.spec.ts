import { describe, expect, it } from "vitest";

import {
  type AttemptActionState,
  initialAttemptState,
  shouldRotateAttemptKey,
} from "./attempt-state";

const ACTIVITY_ID = "22222222-2222-4222-8222-222222222222";

function attempted(overrides: Partial<AttemptActionState> = {}): AttemptActionState {
  return {
    ...initialAttemptState,
    activityId: ACTIVITY_ID,
    selectedChoiceId: "hola",
    ...overrides,
  };
}

describe("attempt idempotency state", () => {
  it("keeps the key while the first unsubmitted selection changes", () => {
    expect(shouldRotateAttemptKey(initialAttemptState, ACTIVITY_ID, "adios")).toBe(false);
  });

  it("keeps the key when retrying the same selection after an ambiguous failure", () => {
    expect(
      shouldRotateAttemptKey(attempted({ error: "request timed out" }), ACTIVITY_ID, "hola"),
    ).toBe(false);
  });

  it("rotates the key when a learner changes the submitted answer", () => {
    expect(shouldRotateAttemptKey(attempted({ result: "incorrect" }), ACTIVITY_ID, "adios")).toBe(
      true,
    );
  });
});
