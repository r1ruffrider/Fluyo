import assert from "node:assert/strict";
import test from "node:test";

import { scanText } from "./scan-ios-evidence.mjs";

const unsafeValues = [
  ["sk", "test", "1234567890abcdef"].join("_"),
  ["eyJheader012345", "payload012345", "signature"].join("."),
  ["-----BEGIN ", "PRIVATE", " KEY-----"].join(""),
  ["Authorization: ", "Bearer ", "top.secret.token"].join(""),
  ["FLUYO_TEST_ADRIANA_", "EMAIL=learner@example.test"].join(""),
  "cus_1234567890abcdef",
  "123E4567-E89B-12D3-A456-426614174000",
  "/Users/runner/work/Fluyo/source.swift",
  "C:\\Users\\runner\\Fluyo\\source.swift",
  "https://api.fluyo.com/api/v1",
  "DEVELOPMENT_TEAM = ABCDE12345",
  "learner@example.com",
  "learner@example.test",
  "Learner+QA@Example.Test",
  "binary\u0000learner@example.test\u0000payload",
  "FLUYO_TEST_ADRIANA_EMAIL",
  "FLUYO_TEST_ELANA_PASSWORD",
];

for (const [index, value] of unsafeValues.entries()) {
  test(`rejects restricted evidence mutation ${index + 1}`, () => {
    assert.notEqual(scanText(value).length, 0);
  });
}

test("allows bounded non-contact synthetic evidence", () => {
  assert.deepEqual(
    scanText(
      JSON.stringify({
        platform: "ios",
        environment: "staging",
        deviceModel: "iPhone simulator",
        identityLabel: "Signed in",
        sourceCommit: "0123456789abcdef0123456789abcdef01234567",
      }),
    ),
    [],
  );
});
