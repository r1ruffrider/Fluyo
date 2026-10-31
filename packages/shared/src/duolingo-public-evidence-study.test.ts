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
      "R1 changes only these five files",
      "R1 adds no dependency, environment variable, workflow, Prisma/OpenAPI artifact, API route, UI, SDK, hosted integration, database object, fixture toggle, or runtime consumer",
      "index.ts\n  ├─ exports learning-session-plan.ts",
      "learning-session-plan.test.ts\n  └─ imports learning-session-plan.ts",
      "learning-operational-policy.test.ts\n  └─ imports learning-operational-policy.ts",
      "no project import, I/O, clock, network, storage, or environment access",
      "no project import, I/O, network, storage, environment-variable access",
      "no R1 dependency edge to either new module",
      "Neither edge exists in R1",
    ]) {
      expect(plan).toContain(boundary);
    }
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
      "export type LearningSessionPlanParseResult",
      '{ ok: false; reason: "invalid_shape" }',
      "parseLearningSessionPlanV1(input: unknown): LearningSessionPlanParseResult",
    ]) {
      expect(plan).toContain(declaration);
    }

    for (const rule of [
      "root keys are exactly `schemaVersion` and `item`",
      "`item: null` is the only zero-result representation",
      "exactly `activityId`, `contentVersion`, and `reason`",
      "canonical lowercase RFC 4122 UUID v4",
      "positive JavaScript safe integer",
      "Unknown, missing, inherited, duplicate-after-decoding, or incorrectly typed fields",
      "never partially accepted or normalized",
      "no prompt, answer, feedback, owner, email, entitlement, progress, reward, economy, analytics, URL, endpoint, or arbitrary metadata",
      "preserves the existing dashboard behavior",
      "dependency-free and side-effect-free",
      "throws no user-data-bearing diagnostic",
      "uppercase/non-v4/malformed UUIDs",
      "input immutability",
    ]) {
      expect(plan).toContain(rule);
    }
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
      '"missing"',
      '"oversize"',
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
      "utf8ByteLength: number",
      "expectedEnvironment:",
      "expectedSourceDigest: `sha256:${string}`",
      "nowUtc: string",
    ]) {
      expect(plan).toContain(declaration);
    }

    for (const rule of [
      "1,024 bytes",
      "Root keys are exactly `schemaVersion`, `policyId`, `environment`, `sourceDigest`, `issuedAtUtc`, `expiresAtUtc`, and `switches`",
      "exactly 64 lowercase hexadecimal characters",
      "explicitly injected expected digest",
      "canonical round-trip UTC whole-second strings",
      "604,800 seconds (7 days)",
      "`issuedAtUtc <= nowUtc < expiresAtUtc`",
      "reads no process environment or global clock",
      "Maximum switch-entry count is **1**",
      "evaluates fail-closed to `false`",
      "fails as `production_enabled`",
      "R1 has no runtime consumer and enables nothing",
      "Unknown fields at any depth fail",
      "exact 1,024/1,025-byte boundary",
      "injected-clock determinism",
      "bounded failure reasons",
    ]) {
      expect(plan).toContain(rule);
    }
  });

  it("locks the exact R1 phase sentence in the plan and ADR", () => {
    const phaseLock =
      "R1 may begin only after R0 merges, all post-main checks pass, and ADR 0007 is recorded as accepted at an exact head reviewed by the required specialists and Elana. R1 implements only the shared files and closed contracts named above.";

    expect(plan).toContain(phaseLock);
    expect(adr).toContain(phaseLock);
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
