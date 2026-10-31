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
