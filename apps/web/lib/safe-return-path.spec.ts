import { describe, expect, it } from "vitest";

import { safeReturnPath } from "./safe-return-path";

describe("safeReturnPath", () => {
  it.each(["/account", "/billing", "/dashboard", "/learn", "/pricing"])(
    "accepts the allowlisted local path %s",
    (path) => {
      expect(safeReturnPath(path)).toBe(path);
    },
  );

  it.each(["https://evil.example", "//evil.example", "/dashboard?next=evil", "\\evil", ""])(
    "rejects the untrusted return value %s",
    (value) => {
      expect(safeReturnPath(value)).toBe("/account");
    },
  );

  it("uses the caller's fixed fallback for a missing value", () => {
    expect(safeReturnPath(null, "/dashboard")).toBe("/dashboard");
  });
});
