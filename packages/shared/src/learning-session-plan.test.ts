import { describe, expect, it } from "vitest";

import { parseLearningSessionPlanV1 } from "./learning-session-plan";

const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);
const activityId = "123e4567-e89b-42d3-a456-426614174000";

const validItem = {
  activityId,
  contentVersion: 1,
  reason: "next",
};

const encodePlan = (value: unknown): Uint8Array =>
  utf8(JSON.stringify({ schemaVersion: 1, item: value }));

describe("LearningSessionPlanV1", () => {
  it.each([
    ["missing", new Uint8Array(), "missing"],
    ["oversize", utf8(`null${" ".repeat(1_021)}`), "oversize"],
    ["invalid UTF-8", new Uint8Array([0xc0, 0xaf]), "invalid_utf8"],
    ["invalid JSON", utf8("{"), "invalid_json"],
    ["duplicate key", utf8('{"schemaVersion":1,"schemaVersion":1,"item":null}'), "duplicate_key"],
  ])("propagates the %s decoder failure", (_name, input, reason) => {
    expect(parseLearningSessionPlanV1(input)).toEqual({ ok: false, reason });
  });

  it("propagates missing for a detached zero-byte input without throwing", () => {
    const input = encodePlan(validItem);
    structuredClone(input.buffer, { transfer: [input.buffer] });
    expect(input.byteLength).toBe(0);

    expect(parseLearningSessionPlanV1(input)).toEqual({ ok: false, reason: "missing" });
  });

  it("accepts the null plan", () => {
    expect(parseLearningSessionPlanV1(encodePlan(null))).toEqual({
      ok: true,
      value: { schemaVersion: 1, item: null },
    });
  });

  it("accepts the exact item plan", () => {
    expect(parseLearningSessionPlanV1(encodePlan(validItem))).toEqual({
      ok: true,
      value: { schemaVersion: 1, item: validItem },
    });
  });

  it.each([
    ["uppercase", activityId.toUpperCase()],
    ["non-v4", "123e4567-e89b-12d3-a456-426614174000"],
    ["wrong variant", "123e4567-e89b-42d3-7456-426614174000"],
    ["malformed", "not-a-uuid"],
  ])("rejects a %s activity UUID", (_name, value) => {
    expect(parseLearningSessionPlanV1(encodePlan({ ...validItem, activityId: value }))).toEqual({
      ok: false,
      reason: "invalid_shape",
    });
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["fractional", 1.5],
    ["unsafe", Number.MAX_SAFE_INTEGER + 1],
    ["string", "1"],
  ])("rejects a %s content version", (_name, value) => {
    expect(parseLearningSessionPlanV1(encodePlan({ ...validItem, contentVersion: value }))).toEqual(
      {
        ok: false,
        reason: "invalid_shape",
      },
    );
  });

  it.each([
    ["wrong reason", { ...validItem, reason: "review" }],
    ["wrong schema", null, 2],
    ["string schema", null, "1"],
  ])("rejects %s", (name, item, schemaVersion = 1) => {
    const input = name === "wrong reason" ? { schemaVersion, item } : { schemaVersion, item };
    expect(parseLearningSessionPlanV1(utf8(JSON.stringify(input)))).toEqual({
      ok: false,
      reason: "invalid_shape",
    });
  });

  it.each([
    ["missing schemaVersion", { item: null }],
    ["missing item", { schemaVersion: 1 }],
    ["extra root key", { schemaVersion: 1, item: null, metadata: {} }],
    ["missing activityId", { schemaVersion: 1, item: { contentVersion: 1, reason: "next" } }],
    ["missing contentVersion", { schemaVersion: 1, item: { activityId, reason: "next" } }],
    ["missing reason", { schemaVersion: 1, item: { activityId, contentVersion: 1 } }],
    ["extra nested key", { schemaVersion: 1, item: { ...validItem, prompt: "forbidden" } }],
    ["array item", { schemaVersion: 1, item: [validItem] }],
    ["array root", []],
    ["primitive root", true],
    ["primitive item", { schemaVersion: 1, item: "next" }],
    ["constructor key", { schemaVersion: 1, item: null, constructor: "forbidden" }],
  ])("rejects the closed-shape violation: %s", (_name, value) => {
    expect(parseLearningSessionPlanV1(utf8(JSON.stringify(value)))).toEqual({
      ok: false,
      reason: "invalid_shape",
    });
  });

  it("rejects an explicitly encoded inherited-property key", () => {
    expect(
      parseLearningSessionPlanV1(
        utf8('{"schemaVersion":1,"item":null,"toString":"inherited-name"}'),
      ),
    ).toEqual({ ok: false, reason: "invalid_shape" });
  });

  it("does not mutate the input", () => {
    const input = encodePlan(validItem);
    const before = input.slice();
    parseLearningSessionPlanV1(input);
    expect(input).toEqual(before);
  });

  it("returns a bounded non-disclosing invalid-shape failure", () => {
    const result = parseLearningSessionPlanV1(
      utf8(
        '{"schemaVersion":1,"item":{"activityId":"private","contentVersion":1,"reason":"next"}}',
      ),
    );
    expect(result).toEqual({ ok: false, reason: "invalid_shape" });
    expect(JSON.stringify(result)).not.toContain("private");
  });
});
