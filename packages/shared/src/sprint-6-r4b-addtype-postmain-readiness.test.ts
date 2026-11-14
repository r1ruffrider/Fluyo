import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const recordPath = "docs/2026-11-12_r4b_addtype_postmain_readiness_v1.md";
const planPath = "docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md";
const handoffPath = "docs/DEVELOPMENT_HANDOFF.md";
const decisionPath = "docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md";
const canonicalRecordHeading = "## Canonical readiness record";
const reviewedSourceCommit = "7220bef062a93142f5bcde07de89199355eb5837";
const designMergeCommit = "7a5b345846eb29928dacb8f01b96796c01182dc2";
const readinessMergeCommit = "d70d8d9f3510b8b4a83f18478dc79dece39094d6";
const currentOverlayCommit = "c579699c273301599d81c89cec6ba0696e34e313";

const sha256 = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");
const blob = (bytes: Buffer): string =>
  createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
    .digest("hex");

const expectedRecord = {
  schema: "fluyo:r4b:addtype-postmain-readiness:v1",
  recordedDate: "2026-11-12",
  repositoryMainCommit: "7a5b345846eb29928dacb8f01b96796c01182dc2",
  reviewedPullRequest: {
    number: 89,
    reviewedHead: "7220bef062a93142f5bcde07de89199355eb5837",
    relationship: "SQUASH_SOURCE",
    mergeCommit: "7a5b345846eb29928dacb8f01b96796c01182dc2",
    mergedAtUtc: "2026-11-12T12:22:17Z",
  },
  reviewedManifest: {
    rowCount: 10,
    byteCount: 1753,
    sha256: "15b3ff5f2158b0eb7839591a0aad3373491afff45b2e7dc6a4eda2e3f607ea2b",
  },
  postMainVerification: {
    workflowCount: 3,
    successfulWorkflowCount: 3,
    ciJobCount: 9,
    successfulCiJobCount: 9,
    retryCount: 0,
    status: "SUCCESS",
  },
  operationalScenarios: [
    { id: "E01", status: "REQUIRED_UNATTEMPTED" },
    { id: "E02", status: "REQUIRED_UNATTEMPTED" },
    { id: "E03", status: "REQUIRED_UNATTEMPTED" },
    { id: "E04", status: "REQUIRED_UNATTEMPTED" },
    { id: "E05", status: "REQUIRED_UNATTEMPTED" },
    { id: "E06", status: "REQUIRED_UNATTEMPTED" },
    { id: "E07", status: "REQUIRED_UNATTEMPTED" },
    { id: "E08", status: "REQUIRED_UNATTEMPTED" },
  ],
  authority: {
    externalActionAuthorized: false,
    downloadAuthorityPresent: false,
    executionAuthorityPresent: false,
    draftMutationAuthorized: false,
    state: "PRECONDITION_HOLD_NO_GET",
  },
  completion: {
    r4b2: false,
    aggregateR4b: false,
    sprint6: false,
  },
  observedOpenDraftPullRequests: [87, 77, 61, 58],
  claimBoundary: "REPOSITORY_ONLY_POST_MAIN_VERIFIED_NO_OPERATIONAL_AUTHORITY",
} as const;

const readBytes = (path: string): Buffer => readFileSync(resolve(root, path));
const gitBytes = (commit: string, path: string): Buffer =>
  execFileSync("git", ["show", `${commit}:${path}`], { cwd: root, windowsHide: true });

const canonicalJsonBlocks = (source: string): string[] => {
  const markerParts = source.split(canonicalRecordHeading);
  if (markerParts.length !== 2) return [];
  const matches = [...markerParts[1]!.matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g)];
  return matches.map((match) => match[1] ?? "");
};

const hasExactKeys = (value: unknown, keys: readonly string[]): boolean => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value)) === JSON.stringify(keys);
};

const isClosedRecord = (value: unknown): boolean => {
  if (!hasExactKeys(value, Object.keys(expectedRecord))) return false;
  return JSON.stringify(value) === JSON.stringify(expectedRecord);
};

describe("R4B Add-Type post-main readiness", () => {
  it("preserves the historical build-plan prefix byte for byte", () => {
    const planBytes = readBytes(planPath);
    const prefix = planBytes.subarray(0, 96_127);

    expect(planBytes.byteLength).toBeGreaterThan(96_127);
    expect(prefix.byteLength).toBe(96_127);
    expect(sha256(prefix)).toBe("05ac348eb3160e4514c1ebfba3daeace40bd29286af4687c777282b5df153a0a");
  });

  it("keeps historical records immutable and pins the sole current handoff overlay", () => {
    const handoff = readBytes(handoffPath);
    const decision = readBytes(decisionPath);
    const historicalHandoff = gitBytes(readinessMergeCommit, handoffPath);
    const historicalDecision = gitBytes(readinessMergeCommit, decisionPath);

    expect(historicalHandoff.byteLength).toBe(249_789);
    expect(sha256(historicalHandoff)).toBe(
      "78788e3bf3b0a54ef3bccb4b0aec804ad3db406976dfede4963bf1d2c083889f",
    );
    expect(historicalDecision.byteLength).toBe(44_712);
    expect(sha256(historicalDecision)).toBe(
      "60593b594f000cc8abeba4dfed36068bfb104fbbe76215712b740bda1f7c3605",
    );

    for (const commit of [reviewedSourceCommit, designMergeCommit, readinessMergeCommit]) {
      expect(gitBytes(commit, handoffPath)).toEqual(historicalHandoff);
      expect(gitBytes(commit, decisionPath)).toEqual(historicalDecision);
    }

    expect(decision).toEqual(historicalDecision);
    expect(decision).toEqual(gitBytes(currentOverlayCommit, decisionPath));
    expect(handoff).toEqual(gitBytes(currentOverlayCommit, handoffPath));
    expect({ bytes: handoff.length, sha256: sha256(handoff), blob: blob(handoff) }).toEqual({
      bytes: 256_652,
      sha256: "154984bb347861ea28767551fa587fe835aaf9981385f26c5e4f1a5e549c1302",
      blob: "1e036c612cc7eb7b5cee9fb163809a6d600109bc",
    });

    expect(
      [handoffPath, decisionPath].filter(
        (path) => !readBytes(path).equals(gitBytes(readinessMergeCommit, path)),
      ),
    ).toEqual([handoffPath]);
  }, 30_000);

  it("duplicates one exact canonical readiness object across both records surfaces", () => {
    const datedRecordBlocks = canonicalJsonBlocks(readBytes(recordPath).toString("utf8"));
    const planBlocks = canonicalJsonBlocks(readBytes(planPath).toString("utf8"));

    expect(datedRecordBlocks).toHaveLength(1);
    expect(planBlocks).toHaveLength(1);
    expect(datedRecordBlocks[0]).toBe(planBlocks[0]);
    expect(isClosedRecord(JSON.parse(datedRecordBlocks[0]!))).toBe(true);
  });

  it("keeps the closed key order, scalar types, and exact squash-source relationship", () => {
    const parsed = JSON.parse(
      canonicalJsonBlocks(readBytes(recordPath).toString("utf8"))[0] ?? "null",
    ) as unknown;

    expect(isClosedRecord(parsed)).toBe(true);
    expect(Object.keys(parsed as object)).toEqual(Object.keys(expectedRecord));
    expect(expectedRecord.reviewedPullRequest.relationship).toBe("SQUASH_SOURCE");
    expect(expectedRecord.reviewedPullRequest.reviewedHead).not.toBe(
      expectedRecord.repositoryMainCommit,
    );
    expect(expectedRecord.reviewedPullRequest.mergeCommit).toBe(
      expectedRecord.repositoryMainCommit,
    );
  });

  it("keeps E01 through E08 ordered and required-unattempted", () => {
    expect(expectedRecord.operationalScenarios).toEqual(
      Array.from({ length: 8 }, (_, index) => ({
        id: `E${String(index + 1).padStart(2, "0")}`,
        status: "REQUIRED_UNATTEMPTED",
      })),
    );
  });

  it("keeps all authority and completion values fail-closed", () => {
    expect(expectedRecord.authority).toEqual({
      externalActionAuthorized: false,
      downloadAuthorityPresent: false,
      executionAuthorityPresent: false,
      draftMutationAuthorized: false,
      state: "PRECONDITION_HOLD_NO_GET",
    });
    expect(expectedRecord.completion).toEqual({
      r4b2: false,
      aggregateR4b: false,
      sprint6: false,
    });
  });

  it("rejects extra authority, readiness, completion, and operational fields", () => {
    const mutations: unknown[] = [
      { ...expectedRecord, externalActionAuthorized: true },
      { ...expectedRecord, selfTestAuthorized: true },
      { ...expectedRecord, acquisitionAuthorized: true },
      { ...expectedRecord, verifierExecutionAuthorized: true },
      { ...expectedRecord, helperExecutionAuthorized: true },
      { ...expectedRecord, brokerAuthorized: true },
      { ...expectedRecord, attempt004Authorized: true },
      {
        ...expectedRecord,
        authority: { ...expectedRecord.authority, executionAuthorityPresent: true },
      },
      { ...expectedRecord, completion: { ...expectedRecord.completion, r4b2: true } },
      {
        ...expectedRecord,
        operationalScenarios: expectedRecord.operationalScenarios.map((scenario, index) =>
          index === 0 ? { ...scenario, status: "PASS" } : scenario,
        ),
      },
    ];

    for (const mutation of mutations) expect(isClosedRecord(mutation)).toBe(false);
  });

  it("binds only the observed open draft identities and repository-only claim", () => {
    expect(expectedRecord.observedOpenDraftPullRequests).toEqual([87, 77, 61, 58]);
    expect(expectedRecord.claimBoundary).toBe(
      "REPOSITORY_ONLY_POST_MAIN_VERIFIED_NO_OPERATIONAL_AUTHORITY",
    );
  });
});
