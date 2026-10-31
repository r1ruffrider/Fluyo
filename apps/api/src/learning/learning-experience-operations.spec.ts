import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  createLearningOperationalEvent,
  LearningExperienceOperations,
  learningSessionPlanEnabled,
  NoOpLearningOperationalSink,
  recordLearningOperationalEvent,
  REPOSITORY_LEARNING_EXPERIENCE_CONTROL,
} from "./learning-experience-operations";

const enabledControl = () => Object.freeze({ LEARNING_SESSION_PLAN_ENABLED: true });

describe("learning experience operational control", () => {
  it("locks the repository control to one frozen default-disabled switch", () => {
    expect(REPOSITORY_LEARNING_EXPERIENCE_CONTROL).toEqual({
      LEARNING_SESSION_PLAN_ENABLED: false,
    });
    expect(Reflect.ownKeys(REPOSITORY_LEARNING_EXPERIENCE_CONTROL)).toEqual([
      "LEARNING_SESSION_PLAN_ENABLED",
    ]);
    expect(Object.isFrozen(REPOSITORY_LEARNING_EXPERIENCE_CONTROL)).toBe(true);
    expect(learningSessionPlanEnabled(REPOSITORY_LEARNING_EXPERIENCE_CONTROL)).toBe(false);
  });

  it("accepts only a literal true own data property on a plain closed record", () => {
    expect(learningSessionPlanEnabled(enabledControl())).toBe(true);
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["primitive", true],
    ["array", [true]],
    ["empty", {}],
    ["false", { LEARNING_SESSION_PLAN_ENABLED: false }],
    ["string", { LEARNING_SESSION_PLAN_ENABLED: "true" }],
    ["number", { LEARNING_SESSION_PLAN_ENABLED: 1 }],
    ["extra", { LEARNING_SESSION_PLAN_ENABLED: true, environment: "development" }],
    [
      "inherited",
      Object.assign(Object.create({ LEARNING_SESSION_PLAN_ENABLED: true }), {
        LEARNING_SESSION_PLAN_ENABLED: true,
      }),
    ],
  ])("fails closed for a %s control", (_name, control) => {
    expect(learningSessionPlanEnabled(control)).toBe(false);
  });

  it("does not invoke an accessor-backed switch", () => {
    const getter = vi.fn(() => true);
    const control = Object.defineProperty({}, "LEARNING_SESSION_PLAN_ENABLED", {
      enumerable: true,
      get: getter,
    });

    expect(learningSessionPlanEnabled(control)).toBe(false);
    expect(getter).not.toHaveBeenCalled();
  });

  it("rejects symbol keys without reading their values", () => {
    const symbol = Symbol("identity");
    const control = { LEARNING_SESSION_PLAN_ENABLED: true, [symbol]: "private" };
    expect(learningSessionPlanEnabled(control)).toBe(false);
  });

  it.each(["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"] as const)(
    "contains a proxy %s trap",
    (trap) => {
      const sentinel = new Error("private control detail");
      const control = new Proxy(enabledControl(), {
        [trap]() {
          throw sentinel;
        },
      });
      expect(() => learningSessionPlanEnabled(control)).not.toThrow();
      expect(learningSessionPlanEnabled(control)).toBe(false);
    },
  );

  it("never invokes a proxy value getter while reading the switch descriptor", () => {
    const get = vi.fn(() => {
      throw new Error("private control value");
    });
    const control = new Proxy(enabledControl(), { get });

    expect(learningSessionPlanEnabled(control)).toBe(true);
    expect(get).not.toHaveBeenCalled();
  });

  it("has no environment, configuration, filesystem, network, logger, or timer dependency", () => {
    const source = readFileSync(resolve(__dirname, "learning-experience-operations.ts"), "utf8");

    expect(source).not.toContain("process.env");
    expect(source).not.toContain("ConfigService");
    expect(source).not.toContain("LearningTelemetryService");
    expect(source).not.toMatch(/from ["']node:(?:fs|http|https|net|crypto|timers)["']/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\bsetTimeout\s*\(/);
    expect(source).not.toMatch(/\bsetInterval\s*\(/);
  });
});

describe("learning operational event boundary", () => {
  it.each(["selected", "fallback"] as const)(
    "creates a closed frozen %s record without identifiers",
    (outcome) => {
      const event = createLearningOperationalEvent(outcome);
      expect(event).toEqual({
        schemaVersion: 1,
        policyId: "learning_operational_policy",
        scenario: "session_planner",
        outcome,
        result: "no_op",
      });
      expect(Reflect.ownKeys(event)).toEqual([
        "schemaVersion",
        "policyId",
        "scenario",
        "outcome",
        "result",
      ]);
      expect(Object.isFrozen(event)).toBe(true);
    },
  );

  it("passes only a newly frozen scalar snapshot to the sink", () => {
    const record = vi.fn();
    const event = {
      schemaVersion: 1,
      policyId: "learning_operational_policy",
      scenario: "session_planner",
      outcome: "selected",
      result: "no_op",
    };

    recordLearningOperationalEvent({ record }, event);

    expect(record).toHaveBeenCalledTimes(1);
    const captured = record.mock.calls[0]?.[0];
    expect(captured).toEqual(event);
    expect(captured).not.toBe(event);
    expect(Object.isFrozen(captured)).toBe(true);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["array", []],
    ["nested", { ...createLearningOperationalEvent("selected"), metadata: { userId: "private" } }],
    ["bad schema", { ...createLearningOperationalEvent("selected"), schemaVersion: 2 }],
    ["bad policy", { ...createLearningOperationalEvent("selected"), policyId: "private" }],
    ["bad scenario", { ...createLearningOperationalEvent("selected"), scenario: "private" }],
    ["bad outcome", { ...createLearningOperationalEvent("selected"), outcome: "failed" }],
    ["bad result", { ...createLearningOperationalEvent("selected"), result: "sent" }],
  ])("drops a %s event", (_name, event) => {
    const record = vi.fn();
    recordLearningOperationalEvent({ record }, event);
    expect(record).not.toHaveBeenCalled();
  });

  it.each([
    "userId",
    "ownerId",
    "profileId",
    "activityId",
    "lessonId",
    "answer",
    "content",
    "email",
    "token",
    "code",
    "url",
    "query",
    "providerPayload",
    "deviceId",
    "installId",
    "accessibilitySetting",
    "correlationId",
    "filePath",
    "exception",
    "stack",
  ])("rejects the forbidden %s field", (key) => {
    const record = vi.fn();
    recordLearningOperationalEvent(
      { record },
      { ...createLearningOperationalEvent("fallback"), [key]: "private" },
    );
    expect(record).not.toHaveBeenCalled();
  });

  it("rejects inherited, symbol, and accessor fields without invoking accessors", () => {
    const record = vi.fn();
    const getter = vi.fn(() => "private");
    const inherited = Object.assign(
      Object.create({ userId: "private" }),
      createLearningOperationalEvent("selected"),
    );
    const symbol = { ...createLearningOperationalEvent("selected"), [Symbol("userId")]: "private" };
    const accessor = Object.defineProperty(
      { ...createLearningOperationalEvent("selected") },
      "outcome",
      { enumerable: true, get: getter },
    );

    recordLearningOperationalEvent({ record }, inherited);
    recordLearningOperationalEvent({ record }, symbol);
    recordLearningOperationalEvent({ record }, accessor);

    expect(record).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
  });

  it.each(["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"] as const)(
    "contains an event proxy %s trap without leaking its sentinel",
    (trap) => {
      const record = vi.fn();
      const event = new Proxy(createLearningOperationalEvent("selected"), {
        [trap]() {
          throw new Error("private event detail");
        },
      });
      expect(() => recordLearningOperationalEvent({ record }, event)).not.toThrow();
      expect(record).not.toHaveBeenCalled();
    },
  );

  it("never invokes a proxy value getter while capturing event descriptors", () => {
    const record = vi.fn();
    const get = vi.fn(() => {
      throw new Error("private event value");
    });
    const event = new Proxy(createLearningOperationalEvent("selected"), { get });

    recordLearningOperationalEvent({ record }, event);

    expect(record).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();
  });

  it("contains a throwing sink", () => {
    const operations = new LearningExperienceOperations(enabledControl(), {
      record: vi.fn(() => {
        throw new Error("private sink detail");
      }),
    });

    expect(() => operations.recordSessionPlannerOutcome("selected")).not.toThrow();
    expect(operations.isSessionPlannerEnabled()).toBe(true);
  });

  it("keeps the default no-op sink stateless", () => {
    const sink = new NoOpLearningOperationalSink();
    sink.record(createLearningOperationalEvent("fallback"));
    expect(Reflect.ownKeys(sink)).toEqual([]);
  });
});
