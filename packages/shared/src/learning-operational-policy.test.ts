import { describe, expect, it } from "vitest";

import {
  evaluateLearningOperationalPolicyV1,
  type LearningOperationalPolicyV1,
} from "./learning-operational-policy";

const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);
const digest = `sha256:${"a".repeat(64)}` as const;
const otherDigest = `sha256:${"b".repeat(64)}` as const;

const context = {
  expectedEnvironment: "development",
  expectedSourceDigest: digest,
  nowUtc: "2026-10-31T12:00:00Z",
} as const;

const validPolicy: LearningOperationalPolicyV1 = {
  schemaVersion: 1,
  policyId: "learning_operational_policy",
  environment: "development",
  sourceDigest: digest,
  issuedAtUtc: "2026-10-31T00:00:00Z",
  expiresAtUtc: "2026-11-01T00:00:00Z",
  switches: { LEARNING_SESSION_PLAN_ENABLED: false },
};

const evaluate = (policy: unknown, runtimeContext: unknown = context) =>
  evaluateLearningOperationalPolicyV1(
    utf8(JSON.stringify(policy)),
    runtimeContext as typeof context,
  );

const expectFailure = (
  result: ReturnType<typeof evaluateLearningOperationalPolicyV1>,
  reason: string,
): void => {
  expect(result).toEqual({
    ok: false,
    reason,
    effective: { LEARNING_SESSION_PLAN_ENABLED: false },
  });
};

describe("LearningOperationalPolicyV1", () => {
  it.each(["development", "staging", "production"] as const)(
    "accepts a disabled %s policy",
    (environment) => {
      const policy = { ...validPolicy, environment };
      const result = evaluate(policy, { ...context, expectedEnvironment: environment });
      expect(result).toMatchObject({
        ok: true,
        effective: { LEARNING_SESSION_PLAN_ENABLED: false },
      });
    },
  );

  it.each(["development", "staging"] as const)(
    "preserves a valid enabled %s switch",
    (environment) => {
      const result = evaluate(
        {
          ...validPolicy,
          environment,
          switches: { LEARNING_SESSION_PLAN_ENABLED: true },
        },
        { ...context, expectedEnvironment: environment },
      );
      expect(result).toMatchObject({
        ok: true,
        effective: { LEARNING_SESSION_PLAN_ENABLED: true },
      });
    },
  );

  it("rejects an enabled production policy", () => {
    expectFailure(
      evaluate(
        {
          ...validPolicy,
          environment: "production",
          switches: { LEARNING_SESSION_PLAN_ENABLED: true },
        },
        { ...context, expectedEnvironment: "production" },
      ),
      "production_enabled",
    );
  });

  it("defaults every failure to disabled", () => {
    expectFailure(evaluateLearningOperationalPolicyV1(new Uint8Array(), context), "missing");
  });

  it("fails closed as missing for detached input under a valid context", () => {
    const input = utf8(JSON.stringify(validPolicy));
    structuredClone(input.buffer, { transfer: [input.buffer] });
    expect(input.byteLength).toBe(0);

    const result = evaluateLearningOperationalPolicyV1(input, context);
    expectFailure(result, "missing");
    expect(Object.keys(result).sort()).toEqual(["effective", "ok", "reason"]);
  });

  it("accepts an exact 1,024-byte policy document", () => {
    const source = JSON.stringify(validPolicy);
    const input = utf8(`${source}${" ".repeat(1_024 - utf8(source).byteLength)}`);
    expect(input).toHaveLength(1_024);
    expect(evaluateLearningOperationalPolicyV1(input, context)).toMatchObject({ ok: true });
  });

  it("rejects a 1,025-byte policy document", () => {
    const source = JSON.stringify(validPolicy);
    const input = utf8(`${source}${" ".repeat(1_025 - utf8(source).byteLength)}`);
    expect(input).toHaveLength(1_025);
    expectFailure(evaluateLearningOperationalPolicyV1(input, context), "oversize");
  });

  it.each([
    ["zero switches", {}],
    ["extra switch", { LEARNING_SESSION_PLAN_ENABLED: false, ANOTHER_SWITCH: false }],
    ["non-boolean switch", { LEARNING_SESSION_PLAN_ENABLED: 0 }],
  ])("rejects %s", (_name, switches) => {
    expectFailure(evaluate({ ...validPolicy, switches }), "invalid_shape");
  });

  it.each([
    ["uppercase hex", `sha256:${"A".repeat(64)}`],
    ["short hex", `sha256:${"a".repeat(63)}`],
    ["long hex", `sha256:${"a".repeat(65)}`],
    ["wrong algorithm", `sha512:${"a".repeat(64)}`],
    ["non-hex", `sha256:${"g".repeat(64)}`],
  ])("rejects a policy with %s digest", (_name, sourceDigest) => {
    expectFailure(evaluate({ ...validPolicy, sourceDigest }), "invalid_shape");
  });

  it("rejects an environment mismatch", () => {
    expectFailure(evaluate({ ...validPolicy, environment: "staging" }), "environment_mismatch");
  });

  it("rejects a source mismatch", () => {
    expectFailure(evaluate({ ...validPolicy, sourceDigest: otherDigest }), "source_mismatch");
  });

  it.each([
    ["root", '{"schemaVersion":1,"schemaVersion":1}'],
    [
      "nested",
      `{"schemaVersion":1,"policyId":"learning_operational_policy","environment":"development","sourceDigest":"${digest}","issuedAtUtc":"2026-10-31T00:00:00Z","expiresAtUtc":"2026-11-01T00:00:00Z","switches":{"LEARNING_SESSION_PLAN_ENABLED":false,"LEARNING_SESSION_PLAN_ENABLED":true}}`,
    ],
  ])("rejects a %s duplicate key", (_name, source) => {
    expectFailure(evaluateLearningOperationalPolicyV1(utf8(source), context), "duplicate_key");
  });

  it("accepts nowUtc equal to issuedAtUtc", () => {
    const policy = {
      ...validPolicy,
      issuedAtUtc: context.nowUtc,
      expiresAtUtc: "2026-10-31T12:00:01Z",
    };
    expect(evaluate(policy)).toMatchObject({ ok: true });
  });

  it("rejects nowUtc equal to expiresAtUtc", () => {
    expectFailure(evaluate({ ...validPolicy, expiresAtUtc: context.nowUtc }), "expired");
  });

  it("rejects a policy issued in the future", () => {
    expectFailure(
      evaluate({
        ...validPolicy,
        issuedAtUtc: "2026-10-31T12:00:01Z",
        expiresAtUtc: "2026-10-31T12:00:02Z",
      }),
      "not_yet_valid",
    );
  });

  it.each([
    ["offset", "2026-10-31T12:00:00+00:00"],
    ["fractional seconds", "2026-10-31T12:00:00.000Z"],
    ["impossible date", "2026-02-30T12:00:00Z"],
    ["lowercase z", "2026-10-31T12:00:00z"],
    ["missing Z", "2026-10-31T12:00:00"],
    ["surrounding whitespace", " 2026-10-31T12:00:00Z"],
  ])("rejects a policy timestamp with %s", (_name, issuedAtUtc) => {
    expectFailure(evaluate({ ...validPolicy, issuedAtUtc }), "invalid_shape");
  });

  it.each([
    ["offset", "2026-10-31T12:00:00+00:00"],
    ["fractional seconds", "2026-10-31T12:00:00.000Z"],
    ["impossible date", "2026-02-30T12:00:00Z"],
    ["lowercase z", "2026-10-31T12:00:00z"],
    ["missing Z", "2026-10-31T12:00:00"],
    ["surrounding whitespace", "2026-10-31T12:00:00Z "],
    ["non-string", 0],
  ])("rejects context nowUtc with %s", (_name, nowUtc) => {
    expectFailure(evaluate(validPolicy, { ...context, nowUtc }), "invalid_context");
  });

  it.each([
    ["invalid expected environment", { ...context, expectedEnvironment: "preview" }],
    ["non-string expected environment", { ...context, expectedEnvironment: 1 }],
    ["uppercase expected digest", { ...context, expectedSourceDigest: `sha256:${"A".repeat(64)}` }],
    ["malformed expected digest", { ...context, expectedSourceDigest: "sha256:short" }],
    [
      "inherited environment",
      Object.assign(Object.create({ expectedEnvironment: "development" }), {
        expectedSourceDigest: digest,
        nowUtc: context.nowUtc,
      }),
    ],
  ])("fails closed for %s", (_name, runtimeContext) => {
    expectFailure(evaluate(validPolicy, runtimeContext), "invalid_context");
  });

  it("gives invalid context precedence over a malformed document", () => {
    expectFailure(
      evaluateLearningOperationalPolicyV1(utf8("{"), {
        ...context,
        expectedEnvironment: "preview",
      } as never),
      "invalid_context",
    );
  });

  it("accepts the exact seven-day maximum lifetime", () => {
    expect(
      evaluate({
        ...validPolicy,
        issuedAtUtc: "2026-10-31T00:00:00Z",
        expiresAtUtc: "2026-11-07T00:00:00Z",
      }),
    ).toMatchObject({ ok: true });
  });

  it("rejects maximum lifetime plus one second", () => {
    expectFailure(
      evaluate({
        ...validPolicy,
        issuedAtUtc: "2026-10-31T00:00:00Z",
        expiresAtUtc: "2026-11-07T00:00:01Z",
      }),
      "lifetime_exceeded",
    );
  });

  it("rejects an unsupported numeric schema", () => {
    expectFailure(evaluate({ ...validPolicy, schemaVersion: 2 }), "unsupported_schema");
  });

  it.each([
    "schemaVersion",
    "policyId",
    "environment",
    "sourceDigest",
    "issuedAtUtc",
    "expiresAtUtc",
    "switches",
  ])("rejects a missing %s root field", (field) => {
    const policy = { ...validPolicy } as Record<string, unknown>;
    delete policy[field];
    expectFailure(evaluate(policy), "invalid_shape");
  });

  it.each([
    ["extra root field", { ...validPolicy, endpoint: "forbidden" }],
    [
      "extra nested field",
      {
        ...validPolicy,
        switches: { LEARNING_SESSION_PLAN_ENABLED: false, metadata: "forbidden" },
      },
    ],
    ["array root", []],
    ["primitive root", true],
    ["string schema", { ...validPolicy, schemaVersion: "1" }],
    ["coerced policy ID", { ...validPolicy, policyId: 1 }],
    ["coerced switch", { ...validPolicy, switches: { LEARNING_SESSION_PLAN_ENABLED: "false" } }],
    ["equal issue and expiry", { ...validPolicy, expiresAtUtc: validPolicy.issuedAtUtc }],
    [
      "issue after expiry",
      {
        ...validPolicy,
        issuedAtUtc: "2026-11-02T00:00:00Z",
        expiresAtUtc: "2026-11-01T00:00:00Z",
      },
    ],
  ])("rejects %s", (_name, policy) => {
    expectFailure(evaluate(policy), "invalid_shape");
  });

  it("is deterministic for the injected clock", () => {
    const input = utf8(JSON.stringify(validPolicy));
    const first = evaluateLearningOperationalPolicyV1(input, context);
    const second = evaluateLearningOperationalPolicyV1(input, context);
    expect(second).toEqual(first);
  });

  it("does not mutate the caller input", () => {
    const input = utf8(JSON.stringify(validPolicy));
    const before = input.slice();
    evaluateLearningOperationalPolicyV1(input, context);
    expect(input).toEqual(before);
  });

  it("measures and parses only the exact Uint8Array view", () => {
    const policyBytes = utf8(JSON.stringify(validPolicy));
    const storage = new Uint8Array(policyBytes.length + 2);
    storage[0] = 0xff;
    storage.set(policyBytes, 1);
    storage[storage.length - 1] = 0xff;
    const exactView = storage.subarray(1, storage.length - 1);
    expect(evaluateLearningOperationalPolicyV1(exactView, context)).toMatchObject({ ok: true });
  });

  it("has no caller-controlled byte-length argument", () => {
    expect(evaluateLearningOperationalPolicyV1.length).toBe(2);
  });

  it.each([
    ["missing", new Uint8Array(), "missing"],
    ["invalid UTF-8", new Uint8Array([0xc0, 0xaf]), "invalid_utf8"],
    ["invalid JSON", utf8("{"), "invalid_json"],
  ])("returns only bounded fields for %s", (_name, input, reason) => {
    const result = evaluateLearningOperationalPolicyV1(input, context);
    expectFailure(result, reason);
    expect(Object.keys(result).sort()).toEqual(["effective", "ok", "reason"]);
  });
});
