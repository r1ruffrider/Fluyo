import {
  decodeLearningContractJson,
  type LearningContractJsonFailure,
} from "./learning-contract-json";

export const LEARNING_SESSION_PLAN_SCHEMA_VERSION = 1 as const;
export const LEARNING_SESSION_REASONS = ["next"] as const;

export interface LearningSessionPlanItemV1 {
  activityId: string;
  contentVersion: number;
  reason: "next";
}

export interface LearningSessionPlanV1 {
  schemaVersion: 1;
  item: LearningSessionPlanItemV1 | null;
}

export type LearningSessionPlanFailure = LearningContractJsonFailure | "invalid_shape";

export type LearningSessionPlanParseResult =
  { ok: true; value: LearningSessionPlanV1 } | { ok: false; reason: LearningSessionPlanFailure };

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isValidItem(value: unknown): value is LearningSessionPlanItemV1 {
  if (!isRecord(value) || !hasExactKeys(value, ["activityId", "contentVersion", "reason"])) {
    return false;
  }

  return (
    typeof value.activityId === "string" &&
    UUID_V4_PATTERN.test(value.activityId) &&
    typeof value.contentVersion === "number" &&
    Number.isSafeInteger(value.contentVersion) &&
    value.contentVersion > 0 &&
    value.reason === "next"
  );
}

export function parseLearningSessionPlanV1(
  rawUtf8Json: Uint8Array,
): LearningSessionPlanParseResult {
  const decoded = decodeLearningContractJson(rawUtf8Json);
  if (!decoded.ok) return decoded;

  if (!isRecord(decoded.value) || !hasExactKeys(decoded.value, ["schemaVersion", "item"])) {
    return { ok: false, reason: "invalid_shape" };
  }

  if (
    decoded.value.schemaVersion !== LEARNING_SESSION_PLAN_SCHEMA_VERSION ||
    (decoded.value.item !== null && !isValidItem(decoded.value.item))
  ) {
    return { ok: false, reason: "invalid_shape" };
  }

  return { ok: true, value: decoded.value as unknown as LearningSessionPlanV1 };
}
