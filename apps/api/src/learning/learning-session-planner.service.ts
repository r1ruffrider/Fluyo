import type { LearningSessionPlanV1 } from "@fluyo/shared";
import { Injectable } from "@nestjs/common";

export interface LearningSessionPlannerCandidate {
  readonly activityId: string;
  readonly contentVersion: number;
  readonly lessonSortOrder: number;
  readonly activitySortOrder: number;
  readonly completed: boolean;
}

const CANDIDATE_KEYS = [
  "activityId",
  "contentVersion",
  "lessonSortOrder",
  "activitySortOrder",
  "completed",
] as const;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const INVALID_CANDIDATES_MESSAGE = "Learning session planner candidates are invalid";
const MAX_CANDIDATE_COUNT = 10_000;

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function captureCandidate(value: unknown): Readonly<LearningSessionPlannerCandidate> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  if (Object.getPrototypeOf(value) !== Object.prototype) return null;

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length !== CANDIDATE_KEYS.length || !CANDIDATE_KEYS.every((key) => keys.includes(key))) {
    return null;
  }

  const isEnumerableDataDescriptor = (
    descriptor: PropertyDescriptor | undefined,
  ): descriptor is PropertyDescriptor & { value: unknown } =>
    descriptor !== undefined && descriptor.enumerable === true && "value" in descriptor;

  const activityIdDescriptor = descriptors.activityId;
  const contentVersionDescriptor = descriptors.contentVersion;
  const lessonSortOrderDescriptor = descriptors.lessonSortOrder;
  const activitySortOrderDescriptor = descriptors.activitySortOrder;
  const completedDescriptor = descriptors.completed;
  if (
    !isEnumerableDataDescriptor(activityIdDescriptor) ||
    !isEnumerableDataDescriptor(contentVersionDescriptor) ||
    !isEnumerableDataDescriptor(lessonSortOrderDescriptor) ||
    !isEnumerableDataDescriptor(activitySortOrderDescriptor) ||
    !isEnumerableDataDescriptor(completedDescriptor)
  ) {
    return null;
  }

  const snapshot = Object.freeze({
    activityId: activityIdDescriptor.value,
    contentVersion: contentVersionDescriptor.value,
    lessonSortOrder: lessonSortOrderDescriptor.value,
    activitySortOrder: activitySortOrderDescriptor.value,
    completed: completedDescriptor.value,
  });

  if (
    typeof snapshot.activityId !== "string" ||
    !UUID_V4_PATTERN.test(snapshot.activityId) ||
    !isPositiveSafeInteger(snapshot.contentVersion) ||
    !isPositiveSafeInteger(snapshot.lessonSortOrder) ||
    !isPositiveSafeInteger(snapshot.activitySortOrder) ||
    typeof snapshot.completed !== "boolean"
  ) {
    return null;
  }

  return snapshot;
}

function captureCandidateCollection(
  value: unknown,
): ReadonlyArray<Readonly<LearningSessionPlannerCandidate>> | null {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;

  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    lengthDescriptor.enumerable !== false ||
    lengthDescriptor.configurable !== false ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > MAX_CANDIDATE_COUNT
  ) {
    return null;
  }
  const length = lengthDescriptor.value;

  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== length + 1) return null;

  let sawLength = false;
  for (let keyIndex = 0; keyIndex < ownKeys.length; keyIndex += 1) {
    const key = ownKeys[keyIndex];
    if (key === "length") {
      if (sawLength) return null;
      sawLength = true;
      continue;
    }
    if (typeof key !== "string") return null;

    const candidateIndex = Number(key);
    if (
      !Number.isSafeInteger(candidateIndex) ||
      candidateIndex < 0 ||
      candidateIndex >= length ||
      String(candidateIndex) !== key
    ) {
      return null;
    }
  }
  if (!sawLength) return null;

  const snapshot: Readonly<LearningSessionPlannerCandidate>[] = [];
  const seenActivityIds = new Set<string>();
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) {
      return null;
    }

    const captured = captureCandidate(descriptor.value);
    if (captured === null || seenActivityIds.has(captured.activityId)) return null;

    seenActivityIds.add(captured.activityId);
    snapshot[index] = captured;
  }

  return Object.freeze(snapshot);
}

function compareCandidates(
  left: LearningSessionPlannerCandidate,
  right: LearningSessionPlannerCandidate,
): number {
  return (
    left.lessonSortOrder - right.lessonSortOrder ||
    left.activitySortOrder - right.activitySortOrder ||
    (left.activityId < right.activityId ? -1 : left.activityId > right.activityId ? 1 : 0)
  );
}

@Injectable()
export class LearningSessionPlannerService {
  plan(candidates: readonly unknown[]): LearningSessionPlanV1 {
    let snapshot: ReadonlyArray<Readonly<LearningSessionPlannerCandidate>> | null;
    try {
      snapshot = captureCandidateCollection(candidates);
    } catch {
      throw new Error(INVALID_CANDIDATES_MESSAGE);
    }
    if (snapshot === null) throw new Error(INVALID_CANDIDATES_MESSAGE);

    let next: Readonly<LearningSessionPlannerCandidate> | null = null;
    for (let index = 0; index < snapshot.length; index += 1) {
      const candidate = snapshot[index];
      if (candidate === undefined) throw new Error(INVALID_CANDIDATES_MESSAGE);
      if (!candidate.completed && (next === null || compareCandidates(candidate, next) < 0)) {
        next = candidate;
      }
    }

    return {
      schemaVersion: 1,
      item: next
        ? {
            activityId: next.activityId,
            contentVersion: next.contentVersion,
            reason: "next",
          }
        : null,
    };
  }
}
