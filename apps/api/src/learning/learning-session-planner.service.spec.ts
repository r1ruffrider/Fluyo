import { describe, expect, it } from "vitest";

import { LearningModule } from "./learning.module";
import {
  LearningSessionPlannerService,
  type LearningSessionPlannerCandidate,
} from "./learning-session-planner.service";

const ACTIVITY_A = "123e4567-e89b-42d3-a456-426614174000";
const ACTIVITY_B = "22222222-2222-4222-8222-222222222222";
const ACTIVITY_C = "33333333-3333-4333-8333-333333333333";
const INVALID_MESSAGE = "Learning session planner candidates are invalid";

function candidate(
  activityId: string,
  overrides: Partial<LearningSessionPlannerCandidate> = {},
): LearningSessionPlannerCandidate {
  return {
    activityId,
    contentVersion: 1,
    lessonSortOrder: 1,
    activitySortOrder: 1,
    completed: false,
    ...overrides,
  };
}

const service = new LearningSessionPlannerService();

function expectInvalid(candidates: readonly unknown[]): void {
  expect(() => service.plan(candidates)).toThrowError(INVALID_MESSAGE);
  try {
    service.plan(candidates);
  } catch (error) {
    expect(error).toEqual(new Error(INVALID_MESSAGE));
    expect(String(error)).toBe(`Error: ${INVALID_MESSAGE}`);
  }
}

describe("LearningSessionPlannerService", () => {
  it("returns the closed zero-item plan for an empty authorized snapshot", () => {
    expect(service.plan([])).toEqual({ schemaVersion: 1, item: null });
  });

  it("returns the closed zero-item plan when every candidate is completed", () => {
    expect(
      service.plan([
        candidate(ACTIVITY_A, { completed: true }),
        candidate(ACTIVITY_B, { completed: true }),
      ]),
    ).toEqual({ schemaVersion: 1, item: null });
  });

  it("returns exactly one next reference without content, owner, entitlement, or progress data", () => {
    expect(service.plan([candidate(ACTIVITY_A), candidate(ACTIVITY_B)])).toEqual({
      schemaVersion: 1,
      item: { activityId: ACTIVITY_A, contentVersion: 1, reason: "next" },
    });
  });

  it("orders by lesson sort order before every other key", () => {
    expect(
      service.plan([
        candidate(ACTIVITY_A, { lessonSortOrder: 2, activitySortOrder: 1 }),
        candidate(ACTIVITY_B, { lessonSortOrder: 1, activitySortOrder: 99 }),
      ]).item?.activityId,
    ).toBe(ACTIVITY_B);
  });

  it("orders by activity sort order inside a lesson", () => {
    expect(
      service.plan([
        candidate(ACTIVITY_A, { activitySortOrder: 2 }),
        candidate(ACTIVITY_B, { activitySortOrder: 1 }),
      ]).item?.activityId,
    ).toBe(ACTIVITY_B);
  });

  it("uses the canonical activity UUID as the final deterministic tie-breaker", () => {
    expect(service.plan([candidate(ACTIVITY_C), candidate(ACTIVITY_A)]).item?.activityId).toBe(
      ACTIVITY_A,
    );
  });

  it.each([
    [ACTIVITY_A, ACTIVITY_B, ACTIVITY_C],
    [ACTIVITY_A, ACTIVITY_C, ACTIVITY_B],
    [ACTIVITY_B, ACTIVITY_A, ACTIVITY_C],
    [ACTIVITY_B, ACTIVITY_C, ACTIVITY_A],
    [ACTIVITY_C, ACTIVITY_A, ACTIVITY_B],
    [ACTIVITY_C, ACTIVITY_B, ACTIVITY_A],
  ])("is deterministic for input permutation %s %s %s", (...ids) => {
    const candidates = ids.map((id) => candidate(id));
    expect(service.plan(candidates).item?.activityId).toBe(ACTIVITY_A);
  });

  it("skips completed candidates after applying stable ordering", () => {
    expect(
      service.plan([
        candidate(ACTIVITY_C),
        candidate(ACTIVITY_A, { completed: true }),
        candidate(ACTIVITY_B),
      ]).item?.activityId,
    ).toBe(ACTIVITY_B);
  });

  it("does not mutate candidates or their order", () => {
    const input = [candidate(ACTIVITY_C), candidate(ACTIVITY_A), candidate(ACTIVITY_B)];
    const before = structuredClone(input);
    service.plan(input);
    expect(input).toEqual(before);
  });

  it("returns a detached projection that cannot mutate the candidate snapshot", () => {
    const input = [candidate(ACTIVITY_A)];
    const plan = service.plan(input);
    if (plan.item) plan.item.contentVersion = 9;
    expect(input).toEqual([candidate(ACTIVITY_A)]);
  });

  it.each([
    ["uppercase UUID", ACTIVITY_A.toUpperCase()],
    ["non-v4 UUID", "11111111-1111-1111-8111-111111111111"],
    ["wrong UUID variant", "11111111-1111-4111-7111-111111111111"],
    ["malformed UUID", "private-activity"],
    ["empty UUID", ""],
  ])("rejects a %s with the fixed non-disclosing error", (_name, activityId) => {
    expectInvalid([candidate(activityId)]);
  });

  it.each(["contentVersion", "lessonSortOrder", "activitySortOrder"] as const)(
    "accepts Number.MAX_SAFE_INTEGER for %s",
    (field) => {
      expect(() =>
        service.plan([candidate(ACTIVITY_A, { [field]: Number.MAX_SAFE_INTEGER })]),
      ).not.toThrow();
    },
  );

  it.each([
    ["contentVersion", 0],
    ["contentVersion", -1],
    ["contentVersion", 1.5],
    ["contentVersion", Number.MAX_SAFE_INTEGER + 1],
    ["contentVersion", Number.NaN],
    ["contentVersion", Number.POSITIVE_INFINITY],
    ["contentVersion", "1"],
    ["contentVersion", null],
    ["lessonSortOrder", 0],
    ["lessonSortOrder", -1],
    ["lessonSortOrder", 1.5],
    ["lessonSortOrder", Number.MAX_SAFE_INTEGER + 1],
    ["lessonSortOrder", Number.NaN],
    ["lessonSortOrder", Number.POSITIVE_INFINITY],
    ["lessonSortOrder", "1"],
    ["lessonSortOrder", null],
    ["activitySortOrder", 0],
    ["activitySortOrder", -1],
    ["activitySortOrder", 1.5],
    ["activitySortOrder", Number.MAX_SAFE_INTEGER + 1],
    ["activitySortOrder", Number.NaN],
    ["activitySortOrder", Number.POSITIVE_INFINITY],
    ["activitySortOrder", "1"],
    ["activitySortOrder", null],
  ] as const)("rejects invalid numeric gate %s = %s", (field, value) => {
    expectInvalid([{ ...candidate(ACTIVITY_A), [field]: value }]);
  });

  it.each([0, 1, "false", null, undefined, {}, []])(
    "rejects non-boolean completed value %s",
    (completed) => {
      expectInvalid([{ ...candidate(ACTIVITY_A), completed }]);
    },
  );

  it.each([
    [
      "missing activityId",
      { contentVersion: 1, lessonSortOrder: 1, activitySortOrder: 1, completed: false },
    ],
    [
      "missing contentVersion",
      { activityId: ACTIVITY_A, lessonSortOrder: 1, activitySortOrder: 1, completed: false },
    ],
    [
      "missing lessonSortOrder",
      { activityId: ACTIVITY_A, contentVersion: 1, activitySortOrder: 1, completed: false },
    ],
    [
      "missing activitySortOrder",
      { activityId: ACTIVITY_A, contentVersion: 1, lessonSortOrder: 1, completed: false },
    ],
    [
      "missing completed",
      { activityId: ACTIVITY_A, contentVersion: 1, lessonSortOrder: 1, activitySortOrder: 1 },
    ],
    ["owner field", { ...candidate(ACTIVITY_A), ownerId: "private" }],
    ["entitlement field", { ...candidate(ACTIVITY_A), entitlement: "plus" }],
    ["prompt field", { ...candidate(ACTIVITY_A), prompt: "private" }],
    ["progress field", { ...candidate(ACTIVITY_A), progress: 1 }],
    ["reward field", { ...candidate(ACTIVITY_A), reward: 10 }],
    ["metadata field", { ...candidate(ACTIVITY_A), metadata: {} }],
    ["array candidate", [candidate(ACTIVITY_A)]],
    ["null candidate", null],
    ["primitive candidate", ACTIVITY_A],
  ])("rejects closed candidate violation: %s", (_name, value) => {
    expectInvalid([value]);
  });

  it("rejects a duplicate activity ID even when the versions differ", () => {
    expectInvalid([candidate(ACTIVITY_A), candidate(ACTIVITY_A, { contentVersion: 2 })]);
  });

  it("rejects a duplicate activity ID even when one row is completed", () => {
    expectInvalid([candidate(ACTIVITY_A), candidate(ACTIVITY_A, { completed: true })]);
  });

  it("rejects inherited candidate data", () => {
    const value = Object.create({ ownerId: "private" }) as LearningSessionPlannerCandidate;
    Object.assign(value, candidate(ACTIVITY_A));
    expectInvalid([value]);
  });

  it("rejects candidates that inherit the permitted fields instead of owning them", () => {
    expectInvalid([Object.create(candidate(ACTIVITY_A))]);
  });

  it("rejects symbol-keyed candidate extensions", () => {
    const value = candidate(ACTIVITY_A) as LearningSessionPlannerCandidate & {
      [key: symbol]: string;
    };
    value[Symbol("private")] = "private";
    expectInvalid([value]);
  });

  it.each([
    ["activityId", ACTIVITY_A, "private-activity"],
    ["contentVersion", 1, 0],
    ["lessonSortOrder", 1, 0],
    ["activitySortOrder", 1, 0],
    ["completed", false, "false"],
  ] as const)(
    "rejects a time-varying %s accessor without invoking it",
    (field, firstValue, laterValue) => {
      const value = candidate(ACTIVITY_A);
      let reads = 0;
      Object.defineProperty(value, field, {
        configurable: true,
        enumerable: true,
        get() {
          reads += 1;
          return reads === 1 ? firstValue : laterValue;
        },
      });

      expectInvalid([value]);
      expect(reads).toBe(0);
    },
  );

  it("rejects a throwing candidate getter without invoking or disclosing it", () => {
    const value = candidate(ACTIVITY_A);
    let reads = 0;
    Object.defineProperty(value, "contentVersion", {
      configurable: true,
      enumerable: true,
      get() {
        reads += 1;
        throw new Error("private candidate value");
      },
    });
    expectInvalid([value]);
    expect(reads).toBe(0);
  });

  it("captures each proxy-backed data field once without using property getters", () => {
    const source = candidate(ACTIVITY_A);
    const descriptorReads = new Map<PropertyKey, number>();
    let propertyReads = 0;
    let ownKeyReads = 0;
    let prototypeReads = 0;
    const value = new Proxy(source, {
      get() {
        propertyReads += 1;
        throw new Error("candidate fields must not be read through the proxy");
      },
      getOwnPropertyDescriptor(target, property) {
        descriptorReads.set(property, (descriptorReads.get(property) ?? 0) + 1);
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      getPrototypeOf(target) {
        prototypeReads += 1;
        return Reflect.getPrototypeOf(target);
      },
      ownKeys(target) {
        ownKeyReads += 1;
        return Reflect.ownKeys(target);
      },
    });

    expect(service.plan([value])).toEqual({
      schemaVersion: 1,
      item: { activityId: ACTIVITY_A, contentVersion: 1, reason: "next" },
    });
    expect(propertyReads).toBe(0);
    expect(prototypeReads).toBe(1);
    expect(ownKeyReads).toBe(1);
    expect([...descriptorReads.entries()]).toEqual(
      expect.arrayContaining(
        ["activityId", "contentVersion", "lessonSortOrder", "activitySortOrder", "completed"].map(
          (field) => [field, 1],
        ),
      ),
    );
    expect(descriptorReads.size).toBe(5);
    expect(source).toEqual(candidate(ACTIVITY_A));
  });

  it("does not call an own overridden map that would bypass candidate validation", () => {
    const value = [{ ...candidate(ACTIVITY_A), ownerId: "private" }] as unknown[] & {
      map: (callback: (entry: unknown) => unknown) => unknown[];
    };
    let mapCalls = 0;
    Object.defineProperty(value, "map", {
      configurable: true,
      enumerable: true,
      value() {
        mapCalls += 1;
        return [candidate(ACTIVITY_A)];
      },
      writable: true,
    });

    expectInvalid(value);
    expect(mapCalls).toBe(0);
  });

  it("rejects an array subclass without calling its overridden map", () => {
    let mapCalls = 0;
    class CandidateArray extends Array<unknown> {}
    Object.defineProperty(CandidateArray.prototype, "map", {
      configurable: true,
      value() {
        mapCalls += 1;
        return [candidate(ACTIVITY_A)];
      },
      writable: true,
    });

    expectInvalid(new CandidateArray({ ...candidate(ACTIVITY_A), ownerId: "private" }));
    expect(mapCalls).toBe(0);
  });

  it("rejects sparse candidate collections with the fixed error", () => {
    expectInvalid(new Array<unknown>(1));
  });

  it("rejects indexed collection accessors without invoking or disclosing them", () => {
    const value: unknown[] = [];
    let reads = 0;
    Object.defineProperty(value, "0", {
      configurable: true,
      enumerable: true,
      get() {
        reads += 1;
        throw new Error("private indexed candidate");
      },
    });

    expectInvalid(value);
    expect(reads).toBe(0);
  });

  it("does not invoke proxy map, length, iterator, or indexed get traps", () => {
    const value = new Proxy([candidate(ACTIVITY_A)], {
      get(_target, property) {
        throw new Error(`private collection property: ${String(property)}`);
      },
    });

    expect(service.plan(value)).toEqual({
      schemaVersion: 1,
      item: { activityId: ACTIVITY_A, contentVersion: 1, reason: "next" },
    });
  });

  it("wraps a collection descriptor trap without leaking its private sentinel", () => {
    const value = new Proxy([candidate(ACTIVITY_A)], {
      getOwnPropertyDescriptor() {
        throw new Error("private collection descriptor sentinel");
      },
    });

    expectInvalid(value);
  });

  it("wraps a collection length descriptor trap without leaking its private sentinel", () => {
    const value = new Proxy([candidate(ACTIVITY_A)], {
      getOwnPropertyDescriptor(target, property) {
        if (property === "length") throw new Error("private collection length sentinel");
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });

    expectInvalid(value);
  });

  it("wraps a collection own-keys trap without leaking its private sentinel", () => {
    const value = new Proxy([candidate(ACTIVITY_A)], {
      ownKeys() {
        throw new Error("private collection keys sentinel");
      },
    });

    expectInvalid(value);
  });

  it("rejects unexpected own string-keyed collection properties", () => {
    const value = [candidate(ACTIVITY_A)] as unknown[] & { private?: string };
    value.private = "private";
    expectInvalid(value);
  });

  it("rejects unexpected own symbol-keyed collection properties", () => {
    const value = [candidate(ACTIVITY_A)] as unknown[] & { [key: symbol]: string };
    value[Symbol("private")] = "private";
    expectInvalid(value);
  });

  it("fails closed when a proxy mutates the collection during snapshot capture", () => {
    const source: unknown[] = [candidate(ACTIVITY_A)];
    const value = new Proxy(source, {
      ownKeys(target) {
        target.push({ ...candidate(ACTIVITY_B), ownerId: "private" });
        return Reflect.ownKeys(target);
      },
    });

    expectInvalid(value);
  });

  it.each([Number.NaN, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects a proxy-reported invalid collection length %s",
    (reportedLength) => {
      const value = new Proxy([candidate(ACTIVITY_A)], {
        getOwnPropertyDescriptor(target, property) {
          const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
          return property === "length" && descriptor
            ? { ...descriptor, value: reportedLength }
            : descriptor;
        },
      });

      expectInvalid(value);
    },
  );

  it("rejects an oversized collection before attempting sparse indexed capture", () => {
    expectInvalid(new Array<unknown>(10_001));
  });

  it("accepts a frozen plain collection containing frozen candidate data", () => {
    expect(service.plan(Object.freeze([Object.freeze(candidate(ACTIVITY_A))]))).toEqual({
      schemaVersion: 1,
      item: { activityId: ACTIVITY_A, contentVersion: 1, reason: "next" },
    });
  });

  it("rejects a non-array runtime input without leaking it", () => {
    expectInvalid({ private: "value" } as unknown as readonly unknown[]);
  });

  it("is registered as an internal provider and is not exported from LearningModule", () => {
    const providers = Reflect.getMetadata("providers", LearningModule) as unknown[];
    const exports = Reflect.getMetadata("exports", LearningModule) as unknown[];
    expect(providers).toContain(LearningSessionPlannerService);
    expect(exports).not.toContain(LearningSessionPlannerService);
  });
});
