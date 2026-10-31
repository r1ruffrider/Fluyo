import type { LearningOperationalPolicyV1 } from "@fluyo/shared";
import { Inject, Injectable } from "@nestjs/common";

export type LearningExperienceControl = Readonly<LearningOperationalPolicyV1["switches"]>;

export interface LearningOperationalEventV1 {
  readonly schemaVersion: 1;
  readonly policyId: "learning_operational_policy";
  readonly scenario: "session_planner";
  readonly outcome: "selected" | "fallback";
  readonly result: "no_op";
}

export interface LearningOperationalSink {
  record(event: LearningOperationalEventV1): void;
}

export const LEARNING_EXPERIENCE_CONTROL = Symbol("LEARNING_EXPERIENCE_CONTROL");
export const LEARNING_OPERATIONAL_SINK = Symbol("LEARNING_OPERATIONAL_SINK");

export const REPOSITORY_LEARNING_EXPERIENCE_CONTROL: LearningExperienceControl = Object.freeze({
  LEARNING_SESSION_PLAN_ENABLED: false,
});

const CONTROL_KEY = "LEARNING_SESSION_PLAN_ENABLED";
const EVENT_KEYS = ["schemaVersion", "policyId", "scenario", "outcome", "result"] as const;

function isEnumerableDataDescriptor(
  descriptor: PropertyDescriptor | undefined,
): descriptor is PropertyDescriptor & { value: unknown } {
  return descriptor !== undefined && descriptor.enumerable === true && "value" in descriptor;
}

export function learningSessionPlanEnabled(control: unknown): boolean {
  try {
    if (typeof control !== "object" || control === null || Array.isArray(control)) return false;
    if (Object.getPrototypeOf(control) !== Object.prototype) return false;

    const descriptors = Object.getOwnPropertyDescriptors(control);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== 1 || keys[0] !== CONTROL_KEY) return false;

    const switchDescriptor = descriptors[CONTROL_KEY];
    return isEnumerableDataDescriptor(switchDescriptor) && switchDescriptor.value === true;
  } catch {
    return false;
  }
}

export function createLearningOperationalEvent(
  outcome: LearningOperationalEventV1["outcome"],
): LearningOperationalEventV1 {
  return Object.freeze({
    schemaVersion: 1,
    policyId: "learning_operational_policy",
    scenario: "session_planner",
    outcome,
    result: "no_op",
  });
}

function captureLearningOperationalEvent(value: unknown): LearningOperationalEventV1 | null {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    if (Object.getPrototypeOf(value) !== Object.prototype) return null;

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== EVENT_KEYS.length || !EVENT_KEYS.every((key) => keys.includes(key))) {
      return null;
    }

    const schemaVersion = descriptors.schemaVersion;
    const policyId = descriptors.policyId;
    const scenario = descriptors.scenario;
    const outcome = descriptors.outcome;
    const result = descriptors.result;
    if (
      !isEnumerableDataDescriptor(schemaVersion) ||
      !isEnumerableDataDescriptor(policyId) ||
      !isEnumerableDataDescriptor(scenario) ||
      !isEnumerableDataDescriptor(outcome) ||
      !isEnumerableDataDescriptor(result) ||
      schemaVersion.value !== 1 ||
      policyId.value !== "learning_operational_policy" ||
      scenario.value !== "session_planner" ||
      (outcome.value !== "selected" && outcome.value !== "fallback") ||
      result.value !== "no_op"
    ) {
      return null;
    }

    return createLearningOperationalEvent(outcome.value);
  } catch {
    return null;
  }
}

export function recordLearningOperationalEvent(
  sink: LearningOperationalSink | undefined,
  event: unknown,
): void {
  const snapshot = captureLearningOperationalEvent(event);
  if (snapshot === null || sink === undefined) return;

  try {
    sink.record(snapshot);
  } catch {
    // Operational evidence is optional and must never affect Learning Core behavior.
  }
}

@Injectable()
export class NoOpLearningOperationalSink implements LearningOperationalSink {
  record(event: LearningOperationalEventV1): void {
    void event;
  }
}

@Injectable()
export class LearningExperienceOperations {
  constructor(
    @Inject(LEARNING_EXPERIENCE_CONTROL) private readonly control: unknown,
    @Inject(LEARNING_OPERATIONAL_SINK)
    private readonly sink: LearningOperationalSink | undefined,
  ) {}

  isSessionPlannerEnabled(): boolean {
    return learningSessionPlanEnabled(this.control);
  }

  recordSessionPlannerOutcome(outcome: LearningOperationalEventV1["outcome"]): void {
    recordLearningOperationalEvent(this.sink, createLearningOperationalEvent(outcome));
  }
}
