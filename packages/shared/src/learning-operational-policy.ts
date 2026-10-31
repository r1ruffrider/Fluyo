import {
  decodeLearningContractJson,
  type LearningContractJsonFailure,
} from "./learning-contract-json";

export const LEARNING_OPERATIONAL_POLICY_SCHEMA_VERSION = 1 as const;
export const LEARNING_POLICY_ENVIRONMENTS = ["development", "staging", "production"] as const;

export interface LearningOperationalPolicyV1 {
  schemaVersion: 1;
  policyId: "learning_operational_policy";
  environment: "development" | "staging" | "production";
  sourceDigest: `sha256:${string}`;
  issuedAtUtc: string;
  expiresAtUtc: string;
  switches: {
    LEARNING_SESSION_PLAN_ENABLED: boolean;
  };
}

export type LearningOperationalPolicyFailure =
  | LearningContractJsonFailure
  | "invalid_context"
  | "invalid_shape"
  | "unsupported_schema"
  | "environment_mismatch"
  | "source_mismatch"
  | "not_yet_valid"
  | "expired"
  | "lifetime_exceeded"
  | "production_enabled";

export type LearningOperationalPolicyEvaluation =
  | {
      ok: true;
      value: LearningOperationalPolicyV1;
      effective: { LEARNING_SESSION_PLAN_ENABLED: boolean };
    }
  | {
      ok: false;
      reason: LearningOperationalPolicyFailure;
      effective: { LEARNING_SESSION_PLAN_ENABLED: false };
    };

type LearningPolicyEnvironment = (typeof LEARNING_POLICY_ENVIRONMENTS)[number];

interface LearningOperationalPolicyContext {
  expectedEnvironment: LearningPolicyEnvironment;
  expectedSourceDigest: `sha256:${string}`;
  nowUtc: string;
}

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const MAXIMUM_POLICY_LIFETIME_MS = 604_800 * 1_000;
const ROOT_KEYS = [
  "schemaVersion",
  "policyId",
  "environment",
  "sourceDigest",
  "issuedAtUtc",
  "expiresAtUtc",
  "switches",
] as const;

function fail(reason: LearningOperationalPolicyFailure): LearningOperationalPolicyEvaluation {
  return {
    ok: false,
    reason,
    effective: { LEARNING_SESSION_PLAN_ENABLED: false },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isEnvironment(value: unknown): value is LearningPolicyEnvironment {
  return (
    typeof value === "string" && (LEARNING_POLICY_ENVIRONMENTS as readonly string[]).includes(value)
  );
}

function parseCanonicalUtc(value: unknown): number | null {
  if (typeof value !== "string" || !UTC_PATTERN.test(value)) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return null;

  try {
    return new Date(milliseconds).toISOString() === value.replace("Z", ".000Z")
      ? milliseconds
      : null;
  } catch {
    return null;
  }
}

function isValidContext(value: unknown): value is LearningOperationalPolicyContext {
  if (!isRecord(value)) return false;

  return (
    Object.prototype.hasOwnProperty.call(value, "expectedEnvironment") &&
    Object.prototype.hasOwnProperty.call(value, "expectedSourceDigest") &&
    Object.prototype.hasOwnProperty.call(value, "nowUtc") &&
    isEnvironment(value.expectedEnvironment) &&
    typeof value.expectedSourceDigest === "string" &&
    DIGEST_PATTERN.test(value.expectedSourceDigest) &&
    parseCanonicalUtc(value.nowUtc) !== null
  );
}

export function evaluateLearningOperationalPolicyV1(
  rawUtf8Json: Uint8Array,
  context: LearningOperationalPolicyContext,
): LearningOperationalPolicyEvaluation {
  if (!isValidContext(context)) return fail("invalid_context");

  const decoded = decodeLearningContractJson(rawUtf8Json);
  if (!decoded.ok) return fail(decoded.reason);

  if (!isRecord(decoded.value) || !hasExactKeys(decoded.value, ROOT_KEYS)) {
    return fail("invalid_shape");
  }

  const policy = decoded.value;
  if (typeof policy.schemaVersion !== "number") return fail("invalid_shape");
  if (policy.schemaVersion !== LEARNING_OPERATIONAL_POLICY_SCHEMA_VERSION) {
    return fail("unsupported_schema");
  }

  if (
    policy.policyId !== "learning_operational_policy" ||
    !isEnvironment(policy.environment) ||
    typeof policy.sourceDigest !== "string" ||
    !DIGEST_PATTERN.test(policy.sourceDigest) ||
    typeof policy.issuedAtUtc !== "string" ||
    typeof policy.expiresAtUtc !== "string" ||
    !isRecord(policy.switches) ||
    !hasExactKeys(policy.switches, ["LEARNING_SESSION_PLAN_ENABLED"]) ||
    typeof policy.switches.LEARNING_SESSION_PLAN_ENABLED !== "boolean"
  ) {
    return fail("invalid_shape");
  }

  const issuedAt = parseCanonicalUtc(policy.issuedAtUtc);
  const expiresAt = parseCanonicalUtc(policy.expiresAtUtc);
  if (issuedAt === null || expiresAt === null || issuedAt >= expiresAt) {
    return fail("invalid_shape");
  }

  if (policy.environment !== context.expectedEnvironment) return fail("environment_mismatch");
  if (policy.sourceDigest !== context.expectedSourceDigest) return fail("source_mismatch");

  if (expiresAt - issuedAt > MAXIMUM_POLICY_LIFETIME_MS) return fail("lifetime_exceeded");

  const now = parseCanonicalUtc(context.nowUtc);
  if (now === null) return fail("invalid_context");
  if (now < issuedAt) return fail("not_yet_valid");
  if (now >= expiresAt) return fail("expired");

  if (policy.environment === "production" && policy.switches.LEARNING_SESSION_PLAN_ENABLED) {
    return fail("production_enabled");
  }

  const value = policy as unknown as LearningOperationalPolicyV1;
  return {
    ok: true,
    value,
    effective: {
      LEARNING_SESSION_PLAN_ENABLED: value.switches.LEARNING_SESSION_PLAN_ENABLED,
    },
  };
}
