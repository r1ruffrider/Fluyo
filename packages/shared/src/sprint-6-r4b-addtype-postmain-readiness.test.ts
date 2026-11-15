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
const historicalHandoffBytes = 249_789;
const historicalHandoffSha256 = "78788e3bf3b0a54ef3bccb4b0aec804ad3db406976dfede4963bf1d2c083889f";
const ios17SuffixBytes = 32_526;
const ios17SuffixSha256 = "7c195892108b4b0a9e6a2157975aeee362b5b72f081598158054fa24ba6b4d29";
const ios17Heading = "## 2026-11-14 — Recommended Option A iOS 17.5 prerequisite CI repair";

const sha256 = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");

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
const isExactIos17Handoff = (value: Buffer): boolean => {
  if (value.length !== historicalHandoffBytes + ios17SuffixBytes) return false;
  const prefix = value.subarray(0, historicalHandoffBytes);
  const suffix = value.subarray(historicalHandoffBytes);
  if (sha256(prefix) !== historicalHandoffSha256 || sha256(suffix) !== ios17SuffixSha256)
    return false;
  const text = value.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(value) || text !== text.normalize("NFC")) return false;
  const suffixText = suffix.toString("utf8");
  if (!suffixText.startsWith(`\n${ios17Heading}\n\n`)) return false;
  if (suffixText.split(ios17Heading).length !== 2) return false;
  return [
    "Marlon explicitly selected Recommended Option A",
    "xcodebuild -downloadPlatform iOS -buildVersion 17.5 -architectureVariant arm64",
    "The v1.1.6 implementation is repository-only until independent gates pass.",
    "300/300 controller cases",
    "58/58 shared structure cases",
    "gated accidental-invocation and source-mutation containment",
    "not OS authorization against malicious same-user code",
    "PR #93 remains draft/HOLD",
  ].every((literal) => suffixText.includes(literal));
};

describe("R4B Add-Type post-main readiness", () => {
  it("preserves the historical build-plan prefix byte for byte", () => {
    const planBytes = readBytes(planPath);
    const prefix = planBytes.subarray(0, 96_127);

    expect(planBytes.byteLength).toBeGreaterThan(96_127);
    expect(prefix.byteLength).toBe(96_127);
    expect(sha256(prefix)).toBe("05ac348eb3160e4514c1ebfba3daeace40bd29286af4687c777282b5df153a0a");
  });

  it("keeps historical records immutable and binds the exact iOS 17.5 append", () => {
    const handoff = readBytes(handoffPath);
    const decision = readBytes(decisionPath);

    const prefix = handoff.subarray(0, historicalHandoffBytes);
    const suffix = handoff.subarray(historicalHandoffBytes);
    expect(prefix.byteLength).toBe(historicalHandoffBytes);
    expect(sha256(prefix)).toBe(historicalHandoffSha256);
    expect(suffix.byteLength).toBe(ios17SuffixBytes);
    expect(sha256(suffix)).toBe(ios17SuffixSha256);
    expect(isExactIos17Handoff(handoff)).toBe(true);
    expect(decision.byteLength).toBe(44_712);
    expect(sha256(decision)).toBe(
      "60593b594f000cc8abeba4dfed36068bfb104fbbe76215712b740bda1f7c3605",
    );

    const prefixMutation = Buffer.from(handoff);
    prefixMutation[0] = (prefixMutation[0] ?? 0) ^ 1;
    const suffixMutation = Buffer.from(handoff);
    suffixMutation[historicalHandoffBytes + 1] =
      (suffixMutation[historicalHandoffBytes + 1] ?? 0) ^ 1;
    const decomposed = Buffer.concat([
      prefix,
      Buffer.from(suffix.toString("utf8").replace("—", "e\u0301"), "utf8"),
    ]);
    const duplicateHeading = Buffer.concat([handoff, Buffer.from(`\n${ios17Heading}\n`, "utf8")]);
    const invalidUtf8 = Buffer.concat([handoff, Buffer.from([0xc3, 0x28])]);
    for (const mutation of [
      prefixMutation,
      suffixMutation,
      handoff.subarray(0, -1),
      decomposed,
      duplicateHeading,
      invalidUtf8,
    ])
      expect(isExactIos17Handoff(mutation)).toBe(false);
  });

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
