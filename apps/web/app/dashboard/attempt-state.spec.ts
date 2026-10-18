import { describe, expect, it } from "vitest";

import { shouldRotateAttemptKey } from "./attempt-state";

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
});
