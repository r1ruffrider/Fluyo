import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const reportPath = "docs/research/2026-10-31_duolingo-public-evidence-study_v1.md";
const planPath = "docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md";
const adrPath = "docs/adr/0007-learning-experience-and-operational-boundaries.md";

const report = read(reportPath);
const plan = read(planPath);
const adr = read(adrPath);
const roadmap = read("docs/ROADMAP.md");
const handoff = read("docs/DEVELOPMENT_HANDOFF.md");

const closedJsonArrayAfter = (marker: string): string[] => {
  const afterMarker = plan.split(marker)[1] ?? "";
  const block = afterMarker.match(/```json\s*([\s\S]*?)```/);
  if (!block?.[1]) throw new Error(`missing closed JSON array after ${marker}`);
  return JSON.parse(block[1]) as string[];
};

describe("Sprint 6 R0 public-evidence boundary", () => {
  it("retains the exact official/public source ledger and honest date unknowns", () => {
    const sourceLedger = report.split("## Source ledger")[1]?.split("## Observation")[0] ?? "";
    const sourceIds = [...sourceLedger.matchAll(/\| (SRC-\d{3}) \|/g)].map((match) => match[1]);

    expect(sourceIds).toHaveLength(24);
    expect(new Set(sourceIds).size).toBe(24);
    expect(sourceIds).toEqual(
      Array.from({ length: 24 }, (_, index) => `SRC-${String(index + 1).padStart(3, "0")}`),
    );
    expect(report).toContain("not shown in retrieved page (UNKNOWN)");
    expect(report).toContain("updated 2026-09-08");
    expect(report).toContain("filed 2026-02-27");
    expect(report).not.toContain("Pending exact recheck");
  });

  it("separates observations, inferences, unknowns, and company-reported numbers", () => {
    expect(report).toContain("`OBSERVATION`");
    expect(report).toContain("`INFERENCE`");
    expect(report).toContain("`UNKNOWN`");
    expect(report).toContain("UNK-006");
    expect(report).toContain("`COMPANY-REPORTED`");
    expect(report).toContain("`DO NOT USE AS FLUYO TARGET/FORECAST`");
    expect(plan).toContain("Engagement cannot be presented as learning efficacy");
  });

  it("locks the lawful no-copy and originality boundary", () => {
    for (const phrase of [
      "bypass DRM",
      "private APIs",
      "automate an account",
      "Duolingo lesson text",
      "screenshots",
      "trade dress",
      "Conversation Canvas",
      "paper, ink, cobalt, coral, sun, mint",
    ]) {
      expect(report).toContain(phrase);
    }

    expect(adr).toContain("must not recreate Duolingo's game board");
    expect(plan).toContain("Copying competitor expression or trade dress");
  });

  it("keeps ADR 0005 authoritative and progress server-confirmed", () => {
    expect(adr).toContain("Extends: [ADR 0005]");
    expect(adr).toContain("Learning Core remains authoritative");
    expect(adr).toContain("Only `CONFIRMED`");
    expect(plan).toContain("Only `CONFIRMED` may reflect a canonical progress change");
    expect(plan).toContain("cannot mutate progress");
  });

  it("locks the separate R0 through R4 sequence and the R1 zero-delta boundary", () => {
    for (const phase of ["R0", "R1", "R2", "R3", "R4-A", "R4-B"]) {
      expect(plan).toMatch(new RegExp(`\\| ${phase}\\s+\\|`));
    }

    expect(plan).toContain("No API, DB, UI, SDK, telemetry transport");
    expect(plan).toContain("No Prisma, OpenAPI, workspace dependency");
    expect(plan).toContain("R1 begins only after R0 merges");
    expect(plan).toContain("Every phase uses a separate small branch and pull request");
  });

  it("locks Catalina's exact R1 file map, prohibited paths, and dependency edges", () => {
    const exactR1Files = [
      "packages/shared/src/learning-contract-json.ts",
      "packages/shared/src/learning-contract-json.test.ts",
      "packages/shared/src/learning-session-plan.ts",
      "packages/shared/src/learning-session-plan.test.ts",
      "packages/shared/src/learning-operational-policy.ts",
      "packages/shared/src/learning-operational-policy.test.ts",
      "packages/shared/src/index.ts",
    ];
    const prohibitedPaths = [
      "apps/api/",
      "apps/web/",
      "apps/ios/",
      "apps/android/",
      "apps/api/prisma/",
      ".github/",
      "contracts/",
      "package.json",
      "package-lock.json",
    ];

    for (const path of [...exactR1Files, ...prohibitedPaths]) {
      expect(plan).toContain(path);
    }

    for (const boundary of [
      "R1 changes only these seven files",
      "R1 adds no dependency, environment variable, workflow, Prisma/OpenAPI artifact, API route, UI, SDK, hosted integration, database object, fixture toggle, or runtime consumer",
      "learning-session-plan.ts ───────┐",
      "learning-operational-policy.ts ─┘",
      "learning-contract-json.ts\n  └─ no project import, I/O, network, storage, process environment",
      "index.ts\n  ├─ exports learning-session-plan.ts public types/functions",
      "learning-session-plan.test.ts\n  └─ imports learning-session-plan.ts",
      "learning-operational-policy.test.ts\n  └─ imports learning-operational-policy.ts",
      "package-internal and is not re-exported from `index.ts`",
      "no R1 dependency edge to either new module",
      "Neither edge exists in R1",
    ]) {
      expect(plan).toContain(boundary);
    }
  });

  it("locks the shared duplicate-aware raw JSON decoder boundary", () => {
    for (const declaration of [
      "LEARNING_CONTRACT_JSON_MAX_BYTES = 1_024 as const",
      "export type LearningContractJsonFailure",
      '"missing"',
      '"oversize"',
      '"invalid_utf8"',
      '"invalid_json"',
      '"duplicate_key"',
      "export type LearningContractJsonDecodeResult",
      "decodeLearningContractJson(",
      "rawUtf8Json: Uint8Array",
    ]) {
      expect(plan).toContain(declaration);
    }

    for (const rule of [
      "immediately copies the exact `Uint8Array` view",
      "that immutable snapshot",
      "Zero bytes return `missing`",
      "more than 1,024 bytes return `oversize`",
      "Fatal UTF-8 validation",
      "invalid, truncated, or overlong encodings",
      "UTF-8 BOM",
      "trailing non-whitespace content",
      "invalid escape",
      "unpaired surrogate",
      "dependency-free and duplicate-aware",
      "does not use `JSON.parse` or a reviver",
      '`"a"` plus `"\\u0061"`',
      "Duplicate detection is scoped per object",
      "without invoking `__proto__`, setters, or inherited properties",
      "never returns input text, key names, offsets, paths, stacks, or partial objects",
      "caller\'s byte array is not mutated",
      "exact 1,024-byte valid input and 1,025-byte rejection",
      "fixed non-disclosing failures",
    ]) {
      expect(plan).toContain(rule);
    }

    expect(adr).toContain("package-internal `learning-contract-json.ts` decoder");
    expect(adr).toContain("Both public contracts accept raw `Uint8Array` JSON");
  });

  it("locks the closed LearningSessionPlanV1 contract and validation rules", () => {
    for (const declaration of [
      "LEARNING_SESSION_PLAN_SCHEMA_VERSION = 1 as const",
      'LEARNING_SESSION_REASONS = ["next"] as const',
      "export interface LearningSessionPlanItemV1",
      "activityId: string",
      "contentVersion: number",
      'reason: "next"',
      "export interface LearningSessionPlanV1",
      "schemaVersion: 1",
      "item: LearningSessionPlanItemV1 | null",
      "export type LearningSessionPlanFailure",
      'LearningContractJsonFailure | "invalid_shape"',
      "export type LearningSessionPlanParseResult",
      "{ ok: false; reason: LearningSessionPlanFailure }",
      "parseLearningSessionPlanV1(",
      "rawUtf8Json: Uint8Array",
    ]) {
      expect(plan).toContain(declaration);
    }

    for (const rule of [
      "root keys are exactly `schemaVersion` and `item`",
      "`item: null` is the only zero-result representation",
      "exactly `activityId`, `contentVersion`, and `reason`",
      "canonical lowercase RFC 4122 UUID v4",
      "positive JavaScript safe integer",
      "Snapshot and decode through `decodeLearningContractJson`",
      "Propagate only its fixed failure reason",
      "Unknown, missing, inherited, or incorrectly typed fields",
      "duplicate rejection already occurred at the raw JSON boundary",
      "never partially accepted or normalized",
      "no prompt, answer, feedback, owner, email, entitlement, progress, reward, economy, analytics, URL, endpoint, or arbitrary metadata",
      "preserves the existing dashboard behavior",
      "dependency-free and side-effect-free",
      "throws no user-data-bearing diagnostic",
      "every decoder failure",
      "uppercase/non-v4/malformed UUIDs",
      "input immutability",
    ]) {
      expect(plan).toContain(rule);
    }

    expect(plan).not.toContain("duplicate-after-decoding");
  });

  it("locks the closed LearningOperationalPolicyV1 contract, bounds, and injected context", () => {
    for (const declaration of [
      "LEARNING_OPERATIONAL_POLICY_SCHEMA_VERSION = 1 as const",
      "LEARNING_POLICY_ENVIRONMENTS",
      "export interface LearningOperationalPolicyV1",
      'policyId: "learning_operational_policy"',
      'environment: "development" | "staging" | "production"',
      "sourceDigest: `sha256:${string}`",
      "issuedAtUtc: string",
      "expiresAtUtc: string",
      "LEARNING_SESSION_PLAN_ENABLED: boolean",
      "export type LearningOperationalPolicyFailure",
      "LearningContractJsonFailure",
      '"invalid_context"',
      '"invalid_shape"',
      '"unsupported_schema"',
      '"environment_mismatch"',
      '"source_mismatch"',
      '"not_yet_valid"',
      '"expired"',
      '"lifetime_exceeded"',
      '"production_enabled"',
      "export type LearningOperationalPolicyEvaluation",
      "evaluateLearningOperationalPolicyV1(",
      "rawUtf8Json: Uint8Array",
      "expectedEnvironment:",
      "expectedSourceDigest: `sha256:${string}`",
      "nowUtc: string",
    ]) {
      expect(plan).toContain(declaration);
    }

    for (const rule of [
      "1,024 bytes",
      "computes length internally from the same immutable byte snapshot",
      "Context is validated before policy decoding",
      "Root keys are exactly `schemaVersion`, `policyId`, `environment`, `sourceDigest`, `issuedAtUtc`, `expiresAtUtc`, and `switches`",
      "exactly 64 lowercase hexadecimal characters",
      "explicitly injected expected digest",
      "canonical round-trip UTC whole-second strings",
      "Offsets, fractional seconds, impossible calendar dates, lowercase `z`, missing `Z`, surrounding whitespace, non-string values",
      "`invalid_context` always evaluates `LEARNING_SESSION_PLAN_ENABLED` to `false`",
      "validate runtime context",
      "snapshot raw bytes",
      "fatal UTF-8 decode",
      "duplicate-aware JSON parse",
      "canonical issued/expires validation",
      "environment/source comparison",
      "production-enable rejection",
      "604,800 seconds (7 days)",
      "`issuedAtUtc <= nowUtc < expiresAtUtc`",
      "reads no process environment or global clock",
      "Maximum switch-entry count is **1**",
      "evaluates fail-closed to `false`",
      "fails as `production_enabled`",
      "R1 has no runtime consumer and enables nothing",
      "Unknown fields at any depth fail",
      "exact 1,024/1,025-byte boundary",
      "duplicate root and nested policy keys",
      "`nowUtc === issuedAtUtc` success",
      "`nowUtc === expiresAtUtc` expiry",
      "absence of caller-controlled negative, fractional, `NaN`, or false-small byte lengths",
      "same measured and parsed immutable byte snapshot",
      "fail-closed invalid context",
      "injected-clock determinism",
      "bounded non-disclosing reasons",
    ]) {
      expect(plan).toContain(rule);
    }

    const signature =
      plan
        .split("export function evaluateLearningOperationalPolicyV1(")[1]
        ?.split("): LearningOperationalPolicyEvaluation;")[0] ?? "";
    expect(signature).not.toContain("utf8ByteLength");
    expect(adr).toContain("validates its injected expected environment, source digest");
    expect(adr).toContain("reads no global clock or process environment");
  });

  it("locks the exact R1 phase sentence in the plan and ADR", () => {
    const phaseLock =
      "R1 may begin only after R0 merges, all post-main checks pass, and ADR 0007 is recorded as accepted at an exact head reviewed by the required specialists and Elana. R1 implements only the shared files and closed contracts named above.";

    expect(plan).toContain(phaseLock);
    expect(adr).toContain(phaseLock);
  });

  it("locks the exact learner flow, state inventory, and Break-UI fixtures in order", () => {
    const learnerFlow = [
      "setup",
      "editable_goal",
      "start_from_beginning",
      "prepare",
      "answer",
      "check",
      "confirmed_feedback",
      "continue_or_finish",
      "confirmed_progress",
    ];
    const states = [
      "PREPARING",
      "ACTIVE",
      "SUBMITTING",
      "CONFIRMED",
      "RETRYABLE_ERROR",
      "STALE_CONTENT",
      "SESSION_ENDED",
      "ACCESS_BLOCKED",
      "EMPTY_REVIEW",
      "OFFLINE_READ_ONLY",
    ];
    const fixtures = [
      "long_localized_prompt_and_choices",
      "rtl_mixed_script_activity",
      "large_text_compact_landscape",
      "one_character_and_multiline_answers",
      "empty_activity_catalog",
      "network_loss_during_submit",
      "duplicate_submit",
      "stale_content_version",
      "late_confirmation_after_exit",
      "authentication_expired",
      "entitlement_blocked",
      "offline_saved_material",
      "corrupt_cache_recovery",
      "protected_mode_unknown_cohort",
      "missing_optional_explanation",
    ];

    expect(closedJsonArrayAfter("The learner-flow ID order is closed:")).toEqual(learnerFlow);
    expect(closedJsonArrayAfter("The experience-state ID order is closed:")).toEqual(states);
    expect(closedJsonArrayAfter("The Break-UI fixture ID order is closed:")).toEqual(fixtures);
    expect(new Set(learnerFlow).size).toBe(learnerFlow.length);
    expect(new Set(states).size).toBe(states.length);
    expect(new Set(fixtures).size).toBe(fixtures.length);

    for (const boundary of [
      "meaningful headings, names, roles, logical focus order",
      "one-time announcements",
      "200% text reflow",
      "reachable 44px targets",
      "static reduced-motion equivalent",
      "Motion remains bounded and interruptible",
      "placement, audio, notifications, social features, competition, economy, ads, purchases, experiments, child-specific behavior, offline writes, native learning, and downloadable content remain deferred and unavailable",
    ]) {
      expect(plan).toContain(boundary);
    }
  });

  it("locks the canonical 48-row transition manifest, digest, and recovery invariants", () => {
    const block = plan
      .split("### Canonical ordered learning transition manifest")[1]
      ?.match(/```json\s*([\s\S]*?)```/);
    if (!block?.[1]) throw new Error("missing canonical transition manifest");
    const manifest = JSON.parse(block[1]) as Array<{
      id: string;
      source: string;
      event: string;
      guards: string[];
      effects: string[];
      target: string | null;
      externalDestination: string | null;
      durableEffect: string;
    }>;
    const expectedManifest = [
      {
        id: "T01",
        source: "PREPARING",
        event: "PLAN_READY",
        guards: [
          "CURRENT_AUTH_GENERATION",
          "SERVER_AUTHORIZED",
          "SERVER_ENTITLED",
          "CONTENT_VERSION_CURRENT",
          "ITEM_AVAILABLE",
        ],
        effects: ["CLEAR_RETRY_CONTEXT", "CLEAR_OFFLINE_CONTEXT"],
        target: "ACTIVE",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T02",
        source: "PREPARING",
        event: "REVIEW_EMPTY",
        guards: ["CURRENT_AUTH_GENERATION", "SERVER_REVIEW_EMPTY"],
        effects: ["CLEAR_RETRY_CONTEXT"],
        target: "EMPTY_REVIEW",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T03",
        source: "PREPARING",
        event: "ACCESS_DENIED",
        guards: ["SERVER_ACCESS_DENIED"],
        effects: ["STOP_ATTEMPT", "CLEAR_UNCONFIRMED_ANSWER", "PRESERVE_AUTHENTICATED_SESSION"],
        target: "ACCESS_BLOCKED",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T04",
        source: "PREPARING",
        event: "PREPARE_FAILED",
        guards: ["CURRENT_AUTH_GENERATION", "RETRYABLE_PREPARATION_FAILURE"],
        effects: ["SET_RETRY_ORIGIN_PREPARE", "CLEAR_SUBMISSION_CONTEXT"],
        target: "RETRYABLE_ERROR",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T05",
        source: "PREPARING",
        event: "SESSION_INVALID",
        guards: ["SESSION_INVALID"],
        effects: [
          "FENCE_LATE_RESULTS",
          "PRESERVE_CONFIRMED_SERVER_PROGRESS",
          "PRESERVE_OWNER_NEUTRAL_ROUTE",
          "CLEAR_AUTH_BOUND_WORK",
          "CLEAR_OWNER_BOUND_CLIENT_STATE",
          "CLEAR_UNCONFIRMED_ANSWER",
          "CLEAR_SUBMISSION_CONTEXT",
          "CLEAR_RETRY_CONTEXT",
          "CLEAR_OFFLINE_CONTEXT",
        ],
        target: "SESSION_ENDED",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T06",
        source: "PREPARING",
        event: "NETWORK_OFFLINE",
        guards: ["NETWORK_OFFLINE"],
        effects: ["SET_OFFLINE_ORIGIN_PREPARE", "CLEAR_UNCONFIRMED_ANSWER"],
        target: "OFFLINE_READ_ONLY",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T07",
        source: "PREPARING",
        event: "EXIT",
        guards: ["ALWAYS"],
        effects: ["CLEAR_RETRY_CONTEXT", "CLEAR_OFFLINE_CONTEXT", "CLEAR_UNCONFIRMED_ANSWER"],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T08",
        source: "ACTIVE",
        event: "SUBMIT_REQUESTED",
        guards: ["CURRENT_AUTH_GENERATION", "CONTENT_VERSION_CURRENT", "ANSWER_READY"],
        effects: ["CREATE_OR_REUSE_SUBMISSION_IDEMPOTENCY_KEY"],
        target: "SUBMITTING",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T09",
        source: "ACTIVE",
        event: "ACCESS_DENIED",
        guards: ["SERVER_ACCESS_DENIED"],
        effects: ["STOP_ATTEMPT", "CLEAR_UNCONFIRMED_ANSWER", "PRESERVE_AUTHENTICATED_SESSION"],
        target: "ACCESS_BLOCKED",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T10",
        source: "ACTIVE",
        event: "SESSION_INVALID",
        guards: ["SESSION_INVALID"],
        effects: [
          "FENCE_LATE_RESULTS",
          "PRESERVE_CONFIRMED_SERVER_PROGRESS",
          "PRESERVE_OWNER_NEUTRAL_ROUTE",
          "CLEAR_AUTH_BOUND_WORK",
          "CLEAR_OWNER_BOUND_CLIENT_STATE",
          "CLEAR_UNCONFIRMED_ANSWER",
          "CLEAR_SUBMISSION_CONTEXT",
          "CLEAR_RETRY_CONTEXT",
          "CLEAR_OFFLINE_CONTEXT",
        ],
        target: "SESSION_ENDED",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T11",
        source: "ACTIVE",
        event: "NETWORK_OFFLINE",
        guards: ["NETWORK_OFFLINE"],
        effects: ["SET_OFFLINE_ORIGIN_ACTIVE", "PRESERVE_EPHEMERAL_ANSWER_IN_MEMORY"],
        target: "OFFLINE_READ_ONLY",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T12",
        source: "ACTIVE",
        event: "EXIT",
        guards: ["NO_UNCONFIRMED_ANSWER_OR_DISCARD_CONFIRMED"],
        effects: [
          "FENCE_LATE_RESULTS",
          "CLEAR_UNCONFIRMED_ANSWER",
          "CLEAR_RETRY_CONTEXT",
          "CLEAR_OFFLINE_CONTEXT",
        ],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T13",
        source: "SUBMITTING",
        event: "ATTEMPT_CONFIRMED",
        guards: [
          "CURRENT_AUTH_GENERATION",
          "SERVER_CONFIRMATION_MATCHES_IDEMPOTENCY_KEY",
          "CONTENT_VERSION_CURRENT",
        ],
        effects: [
          "CLEAR_SUBMISSION_CONTEXT",
          "CLEAR_RETRY_CONTEXT",
          "REFLECT_SERVER_CONFIRMED_PROGRESS",
        ],
        target: "CONFIRMED",
        externalDestination: null,
        durableEffect: "REFLECT_SERVER_CONFIRMED_PROGRESS",
      },
      {
        id: "T14",
        source: "SUBMITTING",
        event: "SUBMIT_FAILED",
        guards: ["CURRENT_AUTH_GENERATION", "RETRYABLE_TRANSPORT_OR_SERVER_FAILURE"],
        effects: ["SET_RETRY_ORIGIN_SUBMIT", "PRESERVE_SUBMISSION_IDEMPOTENCY_KEY"],
        target: "RETRYABLE_ERROR",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T15",
        source: "SUBMITTING",
        event: "CONTENT_STALE",
        guards: ["SERVER_CONTENT_VERSION_CONFLICT"],
        effects: ["FENCE_LATE_RESULTS", "CLEAR_SUBMISSION_CONTEXT", "CLEAR_UNCONFIRMED_ANSWER"],
        target: "STALE_CONTENT",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T16",
        source: "SUBMITTING",
        event: "ACCESS_DENIED",
        guards: ["SERVER_ACCESS_DENIED"],
        effects: [
          "FENCE_LATE_RESULTS",
          "STOP_ATTEMPT",
          "CLEAR_SUBMISSION_CONTEXT",
          "CLEAR_UNCONFIRMED_ANSWER",
          "PRESERVE_AUTHENTICATED_SESSION",
        ],
        target: "ACCESS_BLOCKED",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T17",
        source: "SUBMITTING",
        event: "SESSION_INVALID",
        guards: ["SESSION_INVALID"],
        effects: [
          "FENCE_LATE_RESULTS",
          "PRESERVE_CONFIRMED_SERVER_PROGRESS",
          "PRESERVE_OWNER_NEUTRAL_ROUTE",
          "CLEAR_AUTH_BOUND_WORK",
          "CLEAR_OWNER_BOUND_CLIENT_STATE",
          "CLEAR_UNCONFIRMED_ANSWER",
          "CLEAR_SUBMISSION_CONTEXT",
          "CLEAR_RETRY_CONTEXT",
          "CLEAR_OFFLINE_CONTEXT",
        ],
        target: "SESSION_ENDED",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T18",
        source: "SUBMITTING",
        event: "EXIT",
        guards: ["USER_CONFIRMED_DISCARD"],
        effects: [
          "FENCE_LATE_RESULTS",
          "CLEAR_SUBMISSION_CONTEXT",
          "CLEAR_UNCONFIRMED_ANSWER",
          "CLEAR_RETRY_CONTEXT",
        ],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T19",
        source: "CONFIRMED",
        event: "CONTINUE",
        guards: ["SERVER_SELECTED_NEXT_AVAILABLE"],
        effects: ["CLEAR_SUBMISSION_CONTEXT", "CLEAR_RETRY_CONTEXT"],
        target: "ACTIVE",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T20",
        source: "CONFIRMED",
        event: "REVIEW_EMPTY",
        guards: ["SERVER_REVIEW_EMPTY"],
        effects: ["CLEAR_SUBMISSION_CONTEXT", "CLEAR_RETRY_CONTEXT"],
        target: "EMPTY_REVIEW",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T21",
        source: "CONFIRMED",
        event: "FINISH",
        guards: ["ALWAYS"],
        effects: ["CLEAR_SUBMISSION_CONTEXT", "CLEAR_RETRY_CONTEXT", "CLEAR_OFFLINE_CONTEXT"],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T22",
        source: "RETRYABLE_ERROR",
        event: "RETRY_REQUESTED",
        guards: ["RETRY_ORIGIN_PREPARE", "NO_SUBMISSION_IDEMPOTENCY_KEY"],
        effects: ["CLEAR_RETRY_CONTEXT"],
        target: "PREPARING",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T23",
        source: "RETRYABLE_ERROR",
        event: "RETRY_REQUESTED",
        guards: [
          "RETRY_ORIGIN_SUBMIT",
          "SAME_SUBMISSION_IDEMPOTENCY_KEY_PRESENT",
          "CURRENT_AUTH_GENERATION",
          "CONTENT_VERSION_CURRENT",
        ],
        effects: ["PRESERVE_SUBMISSION_IDEMPOTENCY_KEY", "CLEAR_RETRY_ORIGIN"],
        target: "SUBMITTING",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T24",
        source: "RETRYABLE_ERROR",
        event: "SESSION_INVALID",
        guards: ["SESSION_INVALID"],
        effects: [
          "FENCE_LATE_RESULTS",
          "PRESERVE_CONFIRMED_SERVER_PROGRESS",
          "PRESERVE_OWNER_NEUTRAL_ROUTE",
          "CLEAR_AUTH_BOUND_WORK",
          "CLEAR_OWNER_BOUND_CLIENT_STATE",
          "CLEAR_UNCONFIRMED_ANSWER",
          "CLEAR_SUBMISSION_CONTEXT",
          "CLEAR_RETRY_CONTEXT",
          "CLEAR_OFFLINE_CONTEXT",
        ],
        target: "SESSION_ENDED",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T25",
        source: "RETRYABLE_ERROR",
        event: "EXIT",
        guards: ["ALWAYS"],
        effects: [
          "FENCE_LATE_RESULTS",
          "CLEAR_SUBMISSION_CONTEXT",
          "CLEAR_RETRY_CONTEXT",
          "CLEAR_UNCONFIRMED_ANSWER",
        ],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T26",
        source: "STALE_CONTENT",
        event: "REFRESH",
        guards: ["ALWAYS"],
        effects: ["CLEAR_SUBMISSION_CONTEXT", "CLEAR_UNCONFIRMED_ANSWER", "CLEAR_RETRY_CONTEXT"],
        target: "PREPARING",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T27",
        source: "STALE_CONTENT",
        event: "SESSION_INVALID",
        guards: ["SESSION_INVALID"],
        effects: [
          "FENCE_LATE_RESULTS",
          "PRESERVE_CONFIRMED_SERVER_PROGRESS",
          "PRESERVE_OWNER_NEUTRAL_ROUTE",
          "CLEAR_AUTH_BOUND_WORK",
          "CLEAR_OWNER_BOUND_CLIENT_STATE",
          "CLEAR_UNCONFIRMED_ANSWER",
          "CLEAR_SUBMISSION_CONTEXT",
          "CLEAR_RETRY_CONTEXT",
          "CLEAR_OFFLINE_CONTEXT",
        ],
        target: "SESSION_ENDED",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T28",
        source: "STALE_CONTENT",
        event: "EXIT",
        guards: ["ALWAYS"],
        effects: ["CLEAR_SUBMISSION_CONTEXT", "CLEAR_UNCONFIRMED_ANSWER", "CLEAR_RETRY_CONTEXT"],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T29",
        source: "SESSION_ENDED",
        event: "BEGIN_SIGN_IN",
        guards: ["OWNER_NEUTRAL_ROUTE_PRESENT"],
        effects: ["START_INTERNAL_SIGN_IN"],
        target: "SESSION_ENDED",
        externalDestination: "INTERNAL_SIGN_IN",
        durableEffect: "NONE",
      },
      {
        id: "T30",
        source: "SESSION_ENDED",
        event: "SIGN_IN_RETURN_VALID",
        guards: [
          "SIGN_IN_RETURN_RESULT_VALID",
          "AUTH_IDENTITY_CONFIRMED",
          "AUTH_SAME_OWNER",
          "SERVER_AUTHORIZED",
          "SERVER_ENTITLED",
          "CONTENT_VERSION_CURRENT",
          "ACTIVITY_AVAILABLE",
          "ROUTE_IS_LEARNING_SESSION_ENTRY",
        ],
        effects: ["DISCARD_OWNER_NEUTRAL_ROUTE", "REQUEST_SERVER_SELECTED_ACTIVITY"],
        target: "PREPARING",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T31",
        source: "SESSION_ENDED",
        event: "SIGN_IN_RETURN_REJECTED",
        guards: ["SIGN_IN_RETURN_RESULT_OWNER_CHANGED"],
        effects: [
          "DISCARD_OWNER_NEUTRAL_ROUTE",
          "CLEAR_PREVIOUS_OWNER_CLIENT_STATE",
          "PRESERVE_CURRENT_AUTHENTICATED_SESSION",
        ],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T32",
        source: "SESSION_ENDED",
        event: "SIGN_IN_RETURN_REJECTED",
        guards: ["SIGN_IN_RETURN_RESULT_AUTHORIZATION_DENIED"],
        effects: ["DISCARD_OWNER_NEUTRAL_ROUTE", "PRESERVE_AUTHENTICATED_SESSION"],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T33",
        source: "SESSION_ENDED",
        event: "SIGN_IN_RETURN_REJECTED",
        guards: ["SIGN_IN_RETURN_RESULT_ENTITLEMENT_DENIED"],
        effects: ["DISCARD_OWNER_NEUTRAL_ROUTE", "PRESERVE_AUTHENTICATED_SESSION"],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T34",
        source: "SESSION_ENDED",
        event: "SIGN_IN_RETURN_REJECTED",
        guards: ["SIGN_IN_RETURN_RESULT_CONTENT_STALE"],
        effects: ["DISCARD_OWNER_NEUTRAL_ROUTE", "PRESERVE_AUTHENTICATED_SESSION"],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T35",
        source: "SESSION_ENDED",
        event: "SIGN_IN_RETURN_REJECTED",
        guards: ["SIGN_IN_RETURN_RESULT_ACTIVITY_UNAVAILABLE"],
        effects: ["DISCARD_OWNER_NEUTRAL_ROUTE", "PRESERVE_AUTHENTICATED_SESSION"],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T36",
        source: "SESSION_ENDED",
        event: "SIGN_IN_CANCELED",
        guards: ["ALWAYS"],
        effects: ["STOP_INTERNAL_SIGN_IN"],
        target: "SESSION_ENDED",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T37",
        source: "ACCESS_BLOCKED",
        event: "RETURN_TO_LEARNING",
        guards: ["ALWAYS"],
        effects: ["CLEAR_UNCONFIRMED_ANSWER", "PRESERVE_AUTHENTICATED_SESSION"],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T38",
        source: "ACCESS_BLOCKED",
        event: "SESSION_INVALID",
        guards: ["SESSION_INVALID"],
        effects: [
          "FENCE_LATE_RESULTS",
          "PRESERVE_CONFIRMED_SERVER_PROGRESS",
          "PRESERVE_OWNER_NEUTRAL_ROUTE",
          "CLEAR_AUTH_BOUND_WORK",
          "CLEAR_OWNER_BOUND_CLIENT_STATE",
          "CLEAR_UNCONFIRMED_ANSWER",
          "CLEAR_SUBMISSION_CONTEXT",
          "CLEAR_RETRY_CONTEXT",
          "CLEAR_OFFLINE_CONTEXT",
        ],
        target: "SESSION_ENDED",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T39",
        source: "EMPTY_REVIEW",
        event: "CONTINUE_LEARNING",
        guards: ["SERVER_SELECTED_NEXT_AVAILABLE"],
        effects: ["REQUEST_SERVER_SELECTED_ACTIVITY", "CLEAR_REVIEW_CONTEXT"],
        target: "PREPARING",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T40",
        source: "EMPTY_REVIEW",
        event: "CONTINUE_LEARNING",
        guards: ["NO_SERVER_SELECTED_ACTIVITY"],
        effects: ["CLEAR_REVIEW_CONTEXT"],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T41",
        source: "EMPTY_REVIEW",
        event: "SESSION_INVALID",
        guards: ["SESSION_INVALID"],
        effects: [
          "FENCE_LATE_RESULTS",
          "PRESERVE_CONFIRMED_SERVER_PROGRESS",
          "PRESERVE_OWNER_NEUTRAL_ROUTE",
          "CLEAR_AUTH_BOUND_WORK",
          "CLEAR_OWNER_BOUND_CLIENT_STATE",
          "CLEAR_UNCONFIRMED_ANSWER",
          "CLEAR_SUBMISSION_CONTEXT",
          "CLEAR_RETRY_CONTEXT",
          "CLEAR_OFFLINE_CONTEXT",
        ],
        target: "SESSION_ENDED",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T42",
        source: "EMPTY_REVIEW",
        event: "NETWORK_OFFLINE",
        guards: ["NETWORK_OFFLINE"],
        effects: ["SET_OFFLINE_ORIGIN_PREPARE", "PRESERVE_SAFE_DISPLAY_PREFERENCES"],
        target: "OFFLINE_READ_ONLY",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T43",
        source: "OFFLINE_READ_ONLY",
        event: "RECONNECT",
        guards: ["NETWORK_ONLINE", "OFFLINE_ORIGIN_PREPARE"],
        effects: ["CLEAR_OFFLINE_CONTEXT"],
        target: "PREPARING",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T44",
        source: "OFFLINE_READ_ONLY",
        event: "RECONNECT",
        guards: [
          "NETWORK_ONLINE",
          "OFFLINE_ORIGIN_ACTIVE",
          "CURRENT_AUTH_GENERATION",
          "RECONNECT_RESULT_VALID",
          "AUTH_SAME_OWNER",
          "SERVER_AUTHORIZED",
          "SERVER_ENTITLED",
          "CONTENT_VERSION_CURRENT",
          "ACTIVITY_AVAILABLE",
        ],
        effects: ["RESTORE_EPHEMERAL_ANSWER", "CLEAR_OFFLINE_CONTEXT"],
        target: "ACTIVE",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T45",
        source: "OFFLINE_READ_ONLY",
        event: "RECONNECT_REJECTED",
        guards: ["RECONNECT_RESULT_OWNER_CHANGED"],
        effects: [
          "CLEAR_EPHEMERAL_ANSWER",
          "CLEAR_OFFLINE_CONTEXT",
          "CLEAR_PREVIOUS_OWNER_CLIENT_STATE",
          "PRESERVE_CURRENT_AUTHENTICATED_SESSION",
        ],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
      {
        id: "T46",
        source: "OFFLINE_READ_ONLY",
        event: "RECONNECT_REJECTED",
        guards: ["RECONNECT_RESULT_REVALIDATE"],
        effects: ["CLEAR_EPHEMERAL_ANSWER", "CLEAR_OFFLINE_CONTEXT"],
        target: "PREPARING",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T47",
        source: "OFFLINE_READ_ONLY",
        event: "SESSION_INVALID",
        guards: ["SESSION_INVALID"],
        effects: [
          "FENCE_LATE_RESULTS",
          "PRESERVE_CONFIRMED_SERVER_PROGRESS",
          "PRESERVE_OWNER_NEUTRAL_ROUTE",
          "CLEAR_AUTH_BOUND_WORK",
          "CLEAR_OWNER_BOUND_CLIENT_STATE",
          "CLEAR_UNCONFIRMED_ANSWER",
          "CLEAR_SUBMISSION_CONTEXT",
          "CLEAR_RETRY_CONTEXT",
          "CLEAR_OFFLINE_CONTEXT",
        ],
        target: "SESSION_ENDED",
        externalDestination: null,
        durableEffect: "NONE",
      },
      {
        id: "T48",
        source: "OFFLINE_READ_ONLY",
        event: "EXIT",
        guards: ["ALWAYS"],
        effects: ["CLEAR_EPHEMERAL_ANSWER", "CLEAR_OFFLINE_CONTEXT"],
        target: null,
        externalDestination: "LEARNING_HOME",
        durableEffect: "NONE",
      },
    ];

    const canonical = JSON.stringify(manifest);
    const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
    const expectedDigest = "a326000567fad95dc74fc096f96be90b6228e935cfa5986a029b63f111e060f0";
    expect(manifest).toEqual(expectedManifest);
    expect(manifest).toHaveLength(48);
    expect(manifest.map(({ id }) => id)).toEqual(
      Array.from({ length: 48 }, (_, index) => `T${String(index + 1).padStart(2, "0")}`),
    );
    expect(new Set(manifest.map(({ id }) => id)).size).toBe(48);
    expect(digest).toBe(expectedDigest);
    expect(plan).toContain(`\`${expectedDigest}\``);
    expect(adr).toContain(`\`${expectedDigest}\``);
    expect(adr).toContain(
      "[Canonical ordered learning transition manifest](../2026-10-31_sprint-6-learning-experience-build-plan_v1.md#canonical-ordered-learning-transition-manifest)",
    );
    expect(adr).toContain("This ADR intentionally keeps no second transition list.");
    expect(adr).not.toContain("PREPARING →");

    const exactKeys = [
      "id",
      "source",
      "event",
      "guards",
      "effects",
      "target",
      "externalDestination",
      "durableEffect",
    ];
    for (const row of manifest) expect(Object.keys(row)).toEqual(exactKeys);

    const states = [
      "PREPARING",
      "ACTIVE",
      "SUBMITTING",
      "CONFIRMED",
      "RETRYABLE_ERROR",
      "STALE_CONTENT",
      "SESSION_ENDED",
      "ACCESS_BLOCKED",
      "EMPTY_REVIEW",
      "OFFLINE_READ_ONLY",
    ];
    for (const state of states) {
      expect(manifest.some(({ source }) => source === state)).toBe(true);
      expect(manifest.some(({ target }) => target === state)).toBe(true);
    }

    const closed = {
      sources: new Set(expectedManifest.map(({ source }) => source)),
      events: new Set(expectedManifest.map(({ event }) => event)),
      guards: new Set(expectedManifest.flatMap(({ guards }) => guards)),
      effects: new Set(expectedManifest.flatMap(({ effects }) => effects)),
      targets: new Set(expectedManifest.map(({ target }) => target)),
      destinations: new Set(expectedManifest.map(({ externalDestination }) => externalDestination)),
      durable: new Set(expectedManifest.map(({ durableEffect }) => durableEffect)),
    };
    expect(closed.sources.has("UNKNOWN_STATE")).toBe(false);
    expect(closed.events.has("UNKNOWN_EVENT")).toBe(false);
    expect(closed.guards.has("UNKNOWN_GUARD")).toBe(false);
    expect(closed.effects.has("UNKNOWN_EFFECT")).toBe(false);
    expect(closed.targets.has("UNKNOWN_STATE")).toBe(false);
    expect(closed.destinations.has("https://example.test")).toBe(false);
    expect(closed.durable.has("CLIENT_PROGRESS")).toBe(false);

    const t13 = manifest.filter(({ durableEffect }) => durableEffect !== "NONE");
    expect(t13).toEqual([expectedManifest[12]]);
    expect(t13[0]?.id).toBe("T13");

    expect(manifest[21]).toEqual(expectedManifest[21]);
    expect(manifest[21]?.guards).toEqual(["RETRY_ORIGIN_PREPARE", "NO_SUBMISSION_IDEMPOTENCY_KEY"]);
    expect(manifest[22]?.guards).toEqual([
      "RETRY_ORIGIN_SUBMIT",
      "SAME_SUBMISSION_IDEMPOTENCY_KEY_PRESENT",
      "CURRENT_AUTH_GENERATION",
      "CONTENT_VERSION_CURRENT",
    ]);
    expect(manifest[22]?.effects).toEqual([
      "PRESERVE_SUBMISSION_IDEMPOTENCY_KEY",
      "CLEAR_RETRY_ORIGIN",
    ]);
    expect(manifest[13]?.event).toBe("SUBMIT_FAILED");
    expect(manifest[13]?.target).toBe("RETRYABLE_ERROR");

    expect(manifest[29]?.guards).toEqual([
      "SIGN_IN_RETURN_RESULT_VALID",
      "AUTH_IDENTITY_CONFIRMED",
      "AUTH_SAME_OWNER",
      "SERVER_AUTHORIZED",
      "SERVER_ENTITLED",
      "CONTENT_VERSION_CURRENT",
      "ACTIVITY_AVAILABLE",
      "ROUTE_IS_LEARNING_SESSION_ENTRY",
    ]);
    expect(manifest.slice(30, 35).map(({ guards }) => guards)).toEqual([
      ["SIGN_IN_RETURN_RESULT_OWNER_CHANGED"],
      ["SIGN_IN_RETURN_RESULT_AUTHORIZATION_DENIED"],
      ["SIGN_IN_RETURN_RESULT_ENTITLEMENT_DENIED"],
      ["SIGN_IN_RETURN_RESULT_CONTENT_STALE"],
      ["SIGN_IN_RETURN_RESULT_ACTIVITY_UNAVAILABLE"],
    ]);
    expect(
      manifest
        .slice(30, 35)
        .every(
          ({ target, externalDestination, effects }) =>
            target === null &&
            externalDestination === "LEARNING_HOME" &&
            effects[0] === "DISCARD_OWNER_NEUTRAL_ROUTE",
        ),
    ).toBe(true);

    const sessionEffects = [
      "FENCE_LATE_RESULTS",
      "PRESERVE_CONFIRMED_SERVER_PROGRESS",
      "PRESERVE_OWNER_NEUTRAL_ROUTE",
      "CLEAR_AUTH_BOUND_WORK",
      "CLEAR_OWNER_BOUND_CLIENT_STATE",
      "CLEAR_UNCONFIRMED_ANSWER",
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_RETRY_CONTEXT",
      "CLEAR_OFFLINE_CONTEXT",
    ];
    for (const row of manifest.filter(({ event }) => event === "SESSION_INVALID")) {
      expect(row.effects).toEqual(sessionEffects);
    }

    const isOwnerNeutralRoute = (value: unknown) => value === "learning_session_entry";
    expect(isOwnerNeutralRoute("learning_session_entry")).toBe(true);
    for (const invalid of [
      "550e8400-e29b-41d4-a716-446655440000",
      "activity-123",
      "/learning",
      "scheme:value",
      "learning?next=1",
      "learning#fragment",
      "owner_123",
      "content_123",
      "anything_else",
    ]) {
      expect(isOwnerNeutralRoute(invalid)).toBe(false);
    }

    expect(plan).toContain("The learning module stores no owner ID");
    expect(plan).toContain(
      "Every transient field and normalization snapshot/result is memory-only, unlogged, unpersisted",
    );
    expect(plan).toContain("A submit retry reuses the same opaque submission idempotency key");
    expect(plan).toContain("A prepare retry has no submission idempotency key");
    expect(plan).toContain("T13 is the sole durable-effect row");
    expect(manifest[43]?.guards).toEqual([
      "NETWORK_ONLINE",
      "OFFLINE_ORIGIN_ACTIVE",
      "CURRENT_AUTH_GENERATION",
      "RECONNECT_RESULT_VALID",
      "AUTH_SAME_OWNER",
      "SERVER_AUTHORIZED",
      "SERVER_ENTITLED",
      "CONTENT_VERSION_CURRENT",
      "ACTIVITY_AVAILABLE",
    ]);
    expect(manifest[44]?.guards).toEqual(["RECONNECT_RESULT_OWNER_CHANGED"]);
    expect(manifest[45]?.guards).toEqual(["RECONNECT_RESULT_REVALIDATE"]);

    const mutations: Array<(value: typeof expectedManifest) => void> = [
      (value) => {
        value[0]!.id = "T99";
      },
      (value) => {
        value[0]!.source = "ACTIVE";
      },
      (value) => {
        value[0]!.event = "EXIT";
      },
      (value) => {
        value[0]!.guards.reverse();
      },
      (value) => {
        value[0]!.effects.reverse();
      },
      (value) => {
        value[0]!.target = "CONFIRMED";
      },
      (value) => {
        value[0]!.externalDestination = "LEARNING_HOME";
      },
      (value) => {
        value[0]!.durableEffect = "REFLECT_SERVER_CONFIRMED_PROGRESS";
      },
      (value) => {
        [value[0], value[1]] = [value[1]!, value[0]!];
      },
    ];
    for (const mutate of mutations) {
      const candidate = structuredClone(expectedManifest);
      mutate(candidate);
      expect(candidate).not.toEqual(expectedManifest);
      expect(createHash("sha256").update(JSON.stringify(candidate), "utf8").digest("hex")).not.toBe(
        expectedDigest,
      );
    }

    for (const state of ["SESSION_ENDED", "ACCESS_BLOCKED", "EMPTY_REVIEW"]) {
      expect(manifest.some(({ source, target }) => source === state || target === state)).toBe(
        true,
      );
    }
    expect(plan).toContain("Your session ended");
    expect(plan).toContain("You can’t open this activity");
    expect(plan).toContain("Nothing to review right now");
    expect(plan).toContain("one deduplicated message");
    expect(plan).toContain("No activity completion, goal change, or manufactured review progress");
  });

  it("locks closed sign-in-return and reconnect normalization truth tables", () => {
    type SignInReturnResult =
      | "VALID"
      | "OWNER_CHANGED"
      | "AUTHORIZATION_DENIED"
      | "ENTITLEMENT_DENIED"
      | "CONTENT_STALE"
      | "ACTIVITY_UNAVAILABLE"
      | "INVALID";
    type ReconnectResult = "VALID" | "OWNER_CHANGED" | "REVALIDATE" | "INVALID";
    type SignInSnapshot = {
      complete: boolean;
      identityConfirmed: boolean;
      ownerChanged: boolean;
      sameOwner: boolean;
      authorized: boolean;
      entitled: boolean;
      contentCurrent: boolean;
      activityAvailable: boolean;
      routeValid: boolean;
    };
    type ReconnectSnapshot = {
      networkOnline: boolean;
      currentGeneration: boolean;
      freshEvidence: boolean;
      ownerChanged: boolean;
      sameOwner: boolean;
      authorized: boolean;
      entitled: boolean;
      contentCurrent: boolean;
      activityAvailable: boolean;
    };

    const normalizeSignIn = (snapshot: SignInSnapshot): SignInReturnResult => {
      if (!snapshot.complete) return "INVALID";
      if (snapshot.ownerChanged) return "OWNER_CHANGED";
      if (!snapshot.identityConfirmed || !snapshot.sameOwner || !snapshot.routeValid)
        return "INVALID";
      if (!snapshot.authorized) return "AUTHORIZATION_DENIED";
      if (!snapshot.entitled) return "ENTITLEMENT_DENIED";
      if (!snapshot.contentCurrent) return "CONTENT_STALE";
      if (!snapshot.activityAvailable) return "ACTIVITY_UNAVAILABLE";
      return "VALID";
    };
    const normalizeReconnect = (snapshot: ReconnectSnapshot): ReconnectResult => {
      if (!snapshot.networkOnline || !snapshot.currentGeneration || !snapshot.freshEvidence) {
        return "INVALID";
      }
      if (snapshot.ownerChanged) return "OWNER_CHANGED";
      if (!snapshot.sameOwner) return "INVALID";
      if (
        !snapshot.authorized ||
        !snapshot.entitled ||
        !snapshot.contentCurrent ||
        !snapshot.activityAvailable
      ) {
        return "REVALIDATE";
      }
      return "VALID";
    };

    const signInEvent = (result: SignInReturnResult) => {
      const eventByResult: Record<Exclude<SignInReturnResult, "INVALID">, string> = {
        VALID: "T30",
        OWNER_CHANGED: "T31",
        AUTHORIZATION_DENIED: "T32",
        ENTITLEMENT_DENIED: "T33",
        CONTENT_STALE: "T34",
        ACTIVITY_UNAVAILABLE: "T35",
      };
      return result === "INVALID" ? [] : [eventByResult[result]];
    };
    const reconnectEvent = (result: ReconnectResult) => {
      const eventByResult: Record<Exclude<ReconnectResult, "INVALID">, string> = {
        VALID: "T44",
        OWNER_CHANGED: "T45",
        REVALIDATE: "T46",
      };
      return result === "INVALID" ? [] : [eventByResult[result]];
    };

    const signInKeys: Array<keyof SignInSnapshot> = [
      "complete",
      "identityConfirmed",
      "ownerChanged",
      "sameOwner",
      "authorized",
      "entitled",
      "contentCurrent",
      "activityAvailable",
      "routeValid",
    ];
    for (let mask = 0; mask < 2 ** signInKeys.length; mask += 1) {
      const snapshot = Object.fromEntries(
        signInKeys.map((key, bit) => [key, Boolean(mask & (1 << bit))]),
      ) as SignInSnapshot;
      const expected: SignInReturnResult = !snapshot.complete
        ? "INVALID"
        : snapshot.ownerChanged
          ? "OWNER_CHANGED"
          : !snapshot.identityConfirmed || !snapshot.sameOwner || !snapshot.routeValid
            ? "INVALID"
            : !snapshot.authorized
              ? "AUTHORIZATION_DENIED"
              : !snapshot.entitled
                ? "ENTITLEMENT_DENIED"
                : !snapshot.contentCurrent
                  ? "CONTENT_STALE"
                  : !snapshot.activityAvailable
                    ? "ACTIVITY_UNAVAILABLE"
                    : "VALID";
      const result = normalizeSignIn(snapshot);
      expect(result).toBe(expected);
      expect(signInEvent(result).length).toBeLessThanOrEqual(1);
    }

    const reconnectKeys: Array<keyof ReconnectSnapshot> = [
      "networkOnline",
      "currentGeneration",
      "freshEvidence",
      "ownerChanged",
      "sameOwner",
      "authorized",
      "entitled",
      "contentCurrent",
      "activityAvailable",
    ];
    for (let mask = 0; mask < 2 ** reconnectKeys.length; mask += 1) {
      const snapshot = Object.fromEntries(
        reconnectKeys.map((key, bit) => [key, Boolean(mask & (1 << bit))]),
      ) as ReconnectSnapshot;
      const expected: ReconnectResult =
        !snapshot.networkOnline || !snapshot.currentGeneration || !snapshot.freshEvidence
          ? "INVALID"
          : snapshot.ownerChanged
            ? "OWNER_CHANGED"
            : !snapshot.sameOwner
              ? "INVALID"
              : !snapshot.authorized ||
                  !snapshot.entitled ||
                  !snapshot.contentCurrent ||
                  !snapshot.activityAvailable
                ? "REVALIDATE"
                : "VALID";
      const result = normalizeReconnect(snapshot);
      expect(result).toBe(expected);
      expect(reconnectEvent(result).length).toBeLessThanOrEqual(1);
    }

    const validSignIn: SignInSnapshot = {
      complete: true,
      identityConfirmed: true,
      ownerChanged: false,
      sameOwner: true,
      authorized: true,
      entitled: true,
      contentCurrent: true,
      activityAvailable: true,
      routeValid: true,
    };
    expect(signInEvent(normalizeSignIn(validSignIn))).toEqual(["T30"]);
    expect(normalizeSignIn({ ...validSignIn, authorized: false })).toBe("AUTHORIZATION_DENIED");
    expect(normalizeSignIn({ ...validSignIn, entitled: false })).toBe("ENTITLEMENT_DENIED");
    expect(normalizeSignIn({ ...validSignIn, contentCurrent: false })).toBe("CONTENT_STALE");
    expect(normalizeSignIn({ ...validSignIn, activityAvailable: false })).toBe(
      "ACTIVITY_UNAVAILABLE",
    );
    expect(signInEvent(normalizeSignIn({ ...validSignIn, complete: false }))).toEqual([]);
    expect(signInEvent(normalizeSignIn({ ...validSignIn, routeValid: false }))).toEqual([]);

    const allSignInFailures = {
      ...validSignIn,
      ownerChanged: true,
      sameOwner: false,
      authorized: false,
      entitled: false,
      contentCurrent: false,
      activityAvailable: false,
    };
    expect(signInEvent(normalizeSignIn(allSignInFailures))).toEqual(["T31"]);

    const signInFailurePriority = [
      ["authorized", "AUTHORIZATION_DENIED"],
      ["entitled", "ENTITLEMENT_DENIED"],
      ["contentCurrent", "CONTENT_STALE"],
      ["activityAvailable", "ACTIVITY_UNAVAILABLE"],
    ] as const;
    for (let first = 0; first < signInFailurePriority.length; first += 1) {
      for (let second = first + 1; second < signInFailurePriority.length; second += 1) {
        const snapshot = { ...validSignIn };
        snapshot[signInFailurePriority[first]![0]] = false;
        snapshot[signInFailurePriority[second]![0]] = false;
        expect(normalizeSignIn(snapshot)).toBe(signInFailurePriority[first]![1]);
      }
    }

    const validReconnect: ReconnectSnapshot = {
      networkOnline: true,
      currentGeneration: true,
      freshEvidence: true,
      ownerChanged: false,
      sameOwner: true,
      authorized: true,
      entitled: true,
      contentCurrent: true,
      activityAvailable: true,
    };
    expect(reconnectEvent(normalizeReconnect(validReconnect))).toEqual(["T44"]);
    expect(reconnectEvent(normalizeReconnect({ ...validReconnect, freshEvidence: false }))).toEqual(
      [],
    );
    expect(
      reconnectEvent(normalizeReconnect({ ...validReconnect, currentGeneration: false })),
    ).toEqual([]);
    expect(reconnectEvent(normalizeReconnect({ ...validReconnect, networkOnline: false }))).toEqual(
      [],
    );
    expect(reconnectEvent(normalizeReconnect({ ...validReconnect, authorized: false }))).toEqual([
      "T46",
    ]);
    const allReconnectFailures = {
      ...validReconnect,
      ownerChanged: true,
      sameOwner: false,
      authorized: false,
      entitled: false,
      contentCurrent: false,
      activityAvailable: false,
    };
    expect(reconnectEvent(normalizeReconnect(allReconnectFailures))).toEqual(["T45"]);
    const reconnectFailureKeys = [
      "authorized",
      "entitled",
      "contentCurrent",
      "activityAvailable",
    ] as const;
    for (let first = 0; first < reconnectFailureKeys.length; first += 1) {
      for (let second = first + 1; second < reconnectFailureKeys.length; second += 1) {
        const snapshot = { ...validReconnect };
        snapshot[reconnectFailureKeys[first]!] = false;
        snapshot[reconnectFailureKeys[second]!] = false;
        expect(normalizeReconnect(snapshot)).toBe("REVALIDATE");
        expect(reconnectEvent(normalizeReconnect(snapshot))).toEqual(["T46"]);
      }
    }

    const manifestBlock = plan
      .split("### Canonical ordered learning transition manifest")[1]
      ?.match(/```json\s*([\s\S]*?)```/);
    if (!manifestBlock?.[1]) throw new Error("missing canonical transition manifest");
    const manifest = JSON.parse(manifestBlock[1]) as Array<{
      id: string;
      effects: string[];
      durableEffect: string;
    }>;
    const t31 = manifest.find(({ id }) => id === "T31");
    const t45 = manifest.find(({ id }) => id === "T45");
    for (const row of [t31, t45]) {
      expect(row?.effects).toContain("CLEAR_PREVIOUS_OWNER_CLIENT_STATE");
      expect(row?.effects).not.toContain("REFLECT_SERVER_CONFIRMED_PROGRESS");
      expect(row?.durableEffect).toBe("NONE");
    }
    expect(
      manifest.filter(({ durableEffect }) => durableEffect !== "NONE").map(({ id }) => id),
    ).toEqual(["T13"]);

    for (const phrase of [
      "SignInReturnResult` is exactly `VALID | OWNER_CHANGED | AUTHORIZATION_DENIED | ENTITLEMENT_DENIED | CONTENT_STALE | ACTIVITY_UNAVAILABLE | INVALID",
      "one immutable validation snapshot",
      "INVALID` emits no graph event, remains in `SESSION_ENDED`",
      "ReconnectResult` is exactly `VALID | OWNER_CHANGED | REVALIDATE | INVALID",
      "fresh post-reconnect server authorization, entitlement, content-version, and activity-availability evidence",
      "Cached evidence, stale-generation evidence, or missing fresh evidence yields `INVALID`",
      "Exactly one normalized result and at most one graph event may be produced",
    ]) {
      expect(plan).toContain(phrase);
    }
  });

  it("locks Camila's authoritative terminal and recovery state contracts", () => {
    for (const exactCopy of [
      "Your session ended",
      "Sign in again to continue safely. Your confirmed progress hasn’t changed.",
      "Sign in",
      "You can’t open this activity",
      "This activity isn’t available for your account right now. Return to learning to choose something available.",
      "Return to learning",
      "Nothing to review right now",
      "You can continue with your next activity.",
      "Continue learning",
    ]) {
      expect(plan).toContain(exactCopy);
    }

    for (const rule of [
      "Preserve confirmed server progress and the allowlisted return destination",
      "Retain no owner-bound client state",
      "Never carry an unconfirmed answer across the signed-out boundary",
      "Internal sign-in, then only the allowlisted learning destination after identity confirmation",
      "Focus the heading once on session loss",
      "assertively once as one deduplicated message",
      "cannot complete an activity or mutate progress or awards",
      "Preserve confirmed progress and unrelated safe navigation",
      "Do not submit or retain an unconfirmed answer as progress",
      "Keep the user signed in",
      "filtered to activities the server says are available",
      "without entitlement, subscription, provider, or diagnostic detail",
      "No activity completion, goal change, review-eligibility change, reward, or progress mutation",
      "Preserve confirmed progress, curriculum position, and safe display preferences",
      "Create no synthetic review item or hidden completion",
      "Server-selected next available activity; fall back to learning home",
      "On client-side entry, focus the heading once; on direct load, retain normal focus order",
      "Announce politely once when an existing list becomes empty; do not repeat on reload or recomposition",
      "No activity completion, goal change, or manufactured review progress",
    ]) {
      expect(plan).toContain(rule);
    }

    for (const state of ["SESSION_ENDED", "ACCESS_BLOCKED", "EMPTY_REVIEW"]) {
      expect(adr).toContain(state);
    }
    expect(adr).toContain("Access denial preserves authentication");
    expect(adr).toContain("cannot award or mutate progress");
  });

  it("keeps offline read-only and optional controls default-disabled and fail-closed", () => {
    expect(report).toContain("R0–R4 stays read-only offline");
    expect(adr).toContain("Offline starts read-only");
    expect(adr).toContain("no offline write queue");
    expect(plan).toContain("default-disabled");
    expect(plan).toContain("`LEARNING_SESSION_PLAN_ENABLED`");
    expect(plan).toContain("cannot be enabled by a client");
    expect(plan).toContain("Optional modules cannot award progress");
  });

  it("retains the full 13-agent roster and Elana's sole independent gate", () => {
    for (const agent of [
      "Adriana Solano",
      "Bianca Morales",
      "Gabriela Mendoza",
      "Catalina Moreno",
      "Natalia Ortega",
      "Renata Vega",
      "Camila Reyes",
      "Daniela Vargas",
      "Isabella Navarro",
      "Fernanda Ortiz",
      "Julieta Herrera",
      "Valentina Cruz",
      "Elana Castillo",
    ]) {
      expect(plan).toMatch(new RegExp(`\\| ${agent}\\s+\\|`));
    }

    expect(plan).toContain("Sole independent exact-head QA/code-review gate");
    expect(handoff).toContain("Elana remains the sole independent exact-head QA");
  });

  it("preserves zero implementation and the separate PR 61 boundary", () => {
    expect(plan).toContain("Runtime implementation remains zero");
    expect(plan).toContain("PR #61 and its required-check blocker remain separate and untouched");
    expect(handoff).toContain("PR #61 remains a separate draft");
    expect(handoff).toContain("native runtime remains zero");
    expect(handoff).toContain("all 24 live-auth rows remain unattempted");
  });

  it("links the canonical R0 records from the roadmap and handoff", () => {
    for (const path of [reportPath, planPath, adrPath]) {
      expect(() => read(path)).not.toThrow();
    }

    expect(roadmap).toContain("2026-10-31_sprint-6-learning-experience-build-plan_v1.md");
    expect(roadmap).toContain("research/2026-10-31_duolingo-public-evidence-study_v1.md");
    expect(roadmap).toContain("adr/0007-learning-experience-and-operational-boundaries.md");
    expect(handoff).toContain("research/2026-10-31_duolingo-public-evidence-study_v1.md");
  });
});
