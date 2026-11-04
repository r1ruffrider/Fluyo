import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  ATTEMPT_001_SEALS,
  ATTEMPT_002_PATHS,
  PREFLIGHT_ATTEMPT_IDS,
  PREFLIGHT_ATTEMPT_002_STATES,
  FROZEN_HARNESS_FILES,
  resolveAttempt002State,
  validateAuthorityOnlyCheckout,
  validateAttempt002Authority,
  validateAttempt002Lifecycle,
  validateAttempt002BuildAbortRecords,
  validateAttempt002ReadinessReceipt,
  validateAttempt001SealedBytes,
} from "./preflight-attempts.mjs";
import { PREFLIGHT_SCHEMAS } from "./preflight-contracts.mjs";

test("closes attempts to immutable 001 smoke and internally derived 002 observer", () => {
  assert.deepEqual(PREFLIGHT_ATTEMPT_IDS, ["attempt-001-smoke", "attempt-002-observer"]);
  assert.deepEqual(PREFLIGHT_ATTEMPT_002_STATES, [
    "NOT_STARTED",
    "BUILDING",
    "BUILD_READY",
    "PREPARING",
    "PREPARED",
    "OBSERVING",
    "SERVER_READY",
    "DRIVER_READY",
    "NVDA_READY",
    "OBSERVED",
    "RESULT_RECORDED",
    "CLEANING",
    "FAILED_HELD",
    "BUILD_ABORTED",
    "SEALED",
    "INVALID",
  ]);
  assert.equal(ATTEMPT_001_SEALS.result.length, 64);
  assert.equal(ATTEMPT_001_SEALS.receipt.length, 64);
  assert.match(ATTEMPT_002_PATHS.root, /attempt-002-observer$/u);
  assert.match(ATTEMPT_002_PATHS.build, /apps[\\/]r4b-preflight-harness[\\/]\.next-attempt-002$/u);
  assert.equal(
    FROZEN_HARNESS_FILES.includes("apps/r4b-preflight-harness/source-contract.tsx"),
    true,
  );
  for (const path of [
    "apps/web/app/globals.css",
    "apps/web/app/learn/session/conversation-canvas.dom.spec.tsx",
    "apps/r4b-preflight-harness/app/globals.css",
    "apps/r4b-preflight-harness/localized-boundary.tsx",
    "apps/r4b-preflight-harness/transition-intent-boundary.tsx",
  ])
    assert.equal(FROZEN_HARNESS_FILES.includes(path), true, path);
  assert.equal(
    FROZEN_HARNESS_FILES.includes("scripts/r4b-evidence/nvda-adapter/protocol.mjs"),
    true,
  );
  assert.equal(
    FROZEN_HARNESS_FILES.includes(
      "scripts/r4b-evidence/nvda-adapter/inherited-handle-consumer-fixture.py",
    ),
    true,
  );
  assert.equal(
    FROZEN_HARNESS_FILES.includes("scripts/r4b-evidence/windows-native-boundary.cs"),
    true,
  );
  assert.equal(
    FROZEN_HARNESS_FILES.includes("scripts/r4b-evidence/windows-native-client.mjs"),
    true,
  );
  assert.equal(
    FROZEN_HARNESS_FILES.includes("scripts/r4b-evidence/windows-native-contract.json"),
    true,
  );
  assert.equal(
    FROZEN_HARNESS_FILES.includes("scripts/r4b-evidence/windows-native-worker.mjs"),
    true,
  );
  assert.equal(
    FROZEN_HARNESS_FILES.includes("scripts/r4b-evidence/windows-native-boundary.test.mjs"),
    true,
  );
  assert.equal(
    FROZEN_HARNESS_FILES.includes("scripts/r4b-evidence/windows-trusted-temp-root.mjs"),
    true,
  );
  assert.equal(
    FROZEN_HARNESS_FILES.includes("scripts/r4b-evidence/windows-job-builder.ps1"),
    false,
  );
  assert.equal(FROZEN_HARNESS_FILES.includes("scripts/r4b-evidence/fixed-root-guard.mjs"), true);
  assert.equal(
    FROZEN_HARNESS_FILES.includes("scripts/r4b-evidence/fixed-root-guard.test.mjs"),
    true,
  );
  assert.equal(
    FROZEN_HARNESS_FILES.includes("docs/2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md"),
    true,
  );
  assert.equal(new Set(FROZEN_HARNESS_FILES).size, FROZEN_HARNESS_FILES.length);
});

test("closes pre-build failure only through a zero-residual BUILD_ABORTED receipt", () => {
  const failure = {
    schema: "fluyo:r4b:preflight-failed-held:v1",
    attemptId: "attempt-002-observer",
    category: "BUILD_TRANSACTION_FAILED",
    boundary: "BUILDING_RECORDED",
    partialBuildInventorySha256: "1".repeat(64),
    partialBuildBytes: "5",
    partialTempInventorySha256: "2".repeat(64),
    partialTempBytes: "4",
    status: "FAILED_HELD",
  };
  const failureRecordSha256 = createHash("sha256")
    .update(`${JSON.stringify(failure)}\n`, "utf8")
    .digest("hex");
  const recovery = {
    schema: "fluyo:r4b:preflight-build-recovery:v1",
    attemptId: "attempt-002-observer",
    failureRecordSha256,
    discardedBuildInventorySha256: failure.partialBuildInventorySha256,
    discardedBuildBytes: failure.partialBuildBytes,
    discardedTempInventorySha256: failure.partialTempInventorySha256,
    discardedTempBytes: failure.partialTempBytes,
    residualBuildBytes: "0",
    residualTempBytes: "0",
    status: "PASS",
  };
  const absent = {
    attemptRoot: "ABSENT",
    build: "ABSENT",
    buildTemp: "ABSENT",
    buildOwnership: "ABSENT",
    buildReady: "ABSENT",
  };
  assert.deepEqual(
    validateAttempt002BuildAbortRecords(failure, recovery, failureRecordSha256, absent),
    { state: "BUILD_ABORTED", status: "PASS" },
  );
  for (const mutation of [
    [{ ...recovery, residualBuildBytes: "1" }, absent],
    [{ ...recovery, failureRecordSha256: "3".repeat(64) }, absent],
    [recovery, { ...absent, build: "DIRECTORY" }],
    [recovery, { ...absent, buildTemp: "DIRECTORY" }],
    [recovery, { ...absent, buildOwnership: "FILE" }],
    [recovery, { ...absent, attemptRoot: "DIRECTORY" }],
  ]) {
    assert.throws(
      () =>
        validateAttempt002BuildAbortRecords(failure, mutation[0], failureRecordSha256, mutation[1]),
      /build-abort/u,
    );
  }
  const buildAbortRecords = [];
  let previousRecordSha256 = null;
  for (const [index, state] of ["BUILDING", "FAILED_HELD", "BUILD_ABORTED"].entries()) {
    const record = {
      schema: "fluyo:r4b:attempt-002-lifecycle-state:v1",
      attemptId: "attempt-002-observer",
      ordinal: index + 1,
      state,
      previousRecordSha256,
    };
    buildAbortRecords.push(record);
    previousRecordSha256 = createHash("sha256")
      .update(JSON.stringify(record), "utf8")
      .digest("hex");
  }
  assert.equal(validateAttempt002Lifecycle(buildAbortRecords).state, "BUILD_ABORTED");
  assert.throws(
    () =>
      validateAttempt002Lifecycle([
        ...buildAbortRecords,
        {
          schema: "fluyo:r4b:attempt-002-lifecycle-state:v1",
          attemptId: "attempt-002-observer",
          ordinal: 4,
          state: "BUILDING",
          previousRecordSha256,
        },
      ]),
    /lifecycle/u,
  );
});

test("validates the append-only build/readiness/observe/cleanup lifecycle and recovery", () => {
  const states = [
    "BUILDING",
    "BUILD_READY",
    "PREPARING",
    "PREPARED",
    "OBSERVING",
    "SERVER_READY",
    "DRIVER_READY",
    "NVDA_READY",
    "OBSERVED",
    "RESULT_RECORDED",
    "CLEANING",
    "FAILED_HELD",
    "CLEANING",
    "SEALED",
  ];
  const records = [];
  let previousRecordSha256 = null;
  for (const [index, state] of states.entries()) {
    const record = {
      schema: "fluyo:r4b:attempt-002-lifecycle-state:v1",
      attemptId: "attempt-002-observer",
      ordinal: index + 1,
      state,
      previousRecordSha256,
    };
    records.push(record);
    previousRecordSha256 = createHash("sha256")
      .update(JSON.stringify(record), "utf8")
      .digest("hex");
  }
  assert.equal(validateAttempt002Lifecycle(records).state, "SEALED");
  assert.throws(
    () =>
      validateAttempt002Lifecycle(
        records.map((record, index) => (index === 4 ? { ...record, state: "SEALED" } : record)),
      ),
    /lifecycle/u,
  );
  for (let boundary = 1; boundary <= states.indexOf("OBSERVED"); boundary += 1) {
    const prefix = states.slice(0, boundary);
    const failureStates = [...prefix, "FAILED_HELD", "CLEANING", "SEALED"];
    const failureRecords = [];
    let previousRecordSha256 = null;
    for (const [index, state] of failureStates.entries()) {
      const record = {
        schema: "fluyo:r4b:attempt-002-lifecycle-state:v1",
        attemptId: "attempt-002-observer",
        ordinal: index + 1,
        state,
        previousRecordSha256,
      };
      failureRecords.push(record);
      previousRecordSha256 = createHash("sha256")
        .update(JSON.stringify(record), "utf8")
        .digest("hex");
    }
    assert.equal(validateAttempt002Lifecycle(failureRecords).state, "SEALED");
  }
});

test("closes persistent server, driver, and NVDA readiness receipts before sampling", () => {
  for (const [readiness, checks] of [
    ["SERVER_READY", "QUERY_BOUNDARY_AND_LOOPBACK_PASS"],
    ["DRIVER_READY", "WEBDRIVER_STATUS_AND_IDENTITY_PASS"],
    ["NVDA_READY", "FILTERED_PRE_SPEECH_ADAPTER_IDENTITY_PASS"],
  ]) {
    const receipt = {
      schema: "fluyo:r4b:attempt-002-readiness:v1",
      attemptId: "attempt-002-observer",
      readiness,
      identityDigest: "a".repeat(64),
      checks,
      status: "PASS",
    };
    assert.equal(validateAttempt002ReadinessReceipt(receipt, readiness), receipt);
    assert.throws(
      () => validateAttempt002ReadinessReceipt({ ...receipt, identityDigest: "b" }, readiness),
      /readiness receipt/u,
    );
  }
});

test("rejects dirty, multi-parent, and non-authority-only A2 fixture checkouts", () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-a2-fixture-"));
  const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  try {
    git(["init", "-q"]);
    git(["config", "user.email", "fixture@example.invalid"]);
    git(["config", "user.name", "Fluyo A2 Fixture"]);
    mkdirSync(resolve(root, "scripts/r4b-evidence"), { recursive: true });
    writeFileSync(resolve(root, "harness.txt"), "H\n");
    git(["add", "harness.txt"]);
    git(["commit", "-q", "-m", "H"]);
    writeFileSync(resolve(root, "scripts/r4b-evidence/attempt-002-authority.json"), "{}\n");
    git(["add", "scripts/r4b-evidence/attempt-002-authority.json"]);
    git(["commit", "-q", "-m", "A2"]);
    const branch = git(["branch", "--show-current"]);
    const a2 = git(["rev-parse", "HEAD"]);
    const h = git(["rev-parse", "HEAD^"]);
    assert.match(validateAuthorityOnlyCheckout(root).authorityCommit, /^[0-9a-f]{40}$/u);
    writeFileSync(resolve(root, "dirty.txt"), "dirty\n");
    assert.throws(() => validateAuthorityOnlyCheckout(root), /clean A2 checkout/u);
    rmSync(resolve(root, "dirty.txt"));
    writeFileSync(resolve(root, "extra.txt"), "extra\n");
    git(["add", "extra.txt"]);
    git(["commit", "-q", "--amend", "--no-edit"]);
    assert.throws(() => validateAuthorityOnlyCheckout(root), /authority-only/u);
    git(["reset", "--hard", "-q", a2]);
    git(["switch", "-q", "-c", "side", h]);
    writeFileSync(resolve(root, "side.txt"), "side\n");
    git(["add", "side.txt"]);
    git(["commit", "-q", "-m", "side"]);
    git(["switch", "-q", branch]);
    git(["merge", "-q", "--no-ff", "side", "-m", "merge"]);
    assert.throws(() => validateAuthorityOnlyCheckout(root), /single-parent/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("verifies the sealed predecessor and validates the exact authority-v3 H/A2 record", () => {
  const resultBytes = readFileSync(
    new URL("./fixtures/attempt-001/sanitized-result.fixture", import.meta.url),
  );
  const receiptBytes = readFileSync(
    new URL("./fixtures/attempt-001/discard-receipt.fixture", import.meta.url),
  );
  assert.equal(validateAttempt001SealedBytes(resultBytes, receiptBytes).result.status, "BLOCKED");
  assert.throws(
    () =>
      validateAttempt001SealedBytes(Buffer.concat([resultBytes, Buffer.from(" ")]), receiptBytes),
    /immutable result or receipt seal changed/u,
  );
  const authority = {
    schema: PREFLIGHT_SCHEMAS.attemptAuthority,
    creditable: false,
    evidenceStatus: "NON_EVIDENCE",
    attemptId: "attempt-002-observer",
    ordinal: 2,
    mode: "DISCARDED_SYNTHETIC_OBSERVER",
    productSourceCommit: "fea1f5fadb2307ca611379f30461a7ee47861fff",
    productTreeDigest: "1".repeat(64),
    harnessSourceCommit: "2".repeat(40),
    harnessTreeDigest: "3".repeat(64),
    infrastructurePlanDigest: "4".repeat(64),
    observationPlanDigest: "5".repeat(64),
    toolManifestDigest: "6".repeat(64),
    predecessorResultFileSha256: ATTEMPT_001_SEALS.result,
    predecessorReceiptFileSha256: ATTEMPT_001_SEALS.receipt,
    predecessorStatus: "BLOCKED",
    requiredCheckCount: 144,
    rawPolicy: "DISCARD_AFTER_VALIDATED_RESULT",
  };
  assert.equal(authority.attemptId, "attempt-002-observer");
  assert.equal(authority.ordinal, 2);
  assert.equal(authority.predecessorStatus, "BLOCKED");
  assert.equal(
    new Set([
      authority.productTreeDigest,
      authority.infrastructurePlanDigest,
      authority.observationPlanDigest,
      authority.harnessTreeDigest,
      authority.toolManifestDigest,
    ]).size,
    5,
  );
  assert.equal(validateAttempt002Authority(authority), authority);
  assert.throws(
    () => validateAttempt002Authority({ ...authority, attemptId: "attempt-003" }),
    /closed identity/u,
  );
  assert.throws(
    () => validateAttempt002Authority({ ...authority, harnessSourceCommit: "2".repeat(64) }),
    /40-hex/u,
  );
  assert.throws(
    () =>
      validateAttempt002Authority({
        ...authority,
        planDigest: authority.observationPlanDigest,
      }),
    /keys changed/u,
  );
  assert.deepEqual(
    [
      PREFLIGHT_SCHEMAS.attemptAuthority,
      PREFLIGHT_SCHEMAS.aggregateV2,
      PREFLIGHT_SCHEMAS.resultV2,
      PREFLIGHT_SCHEMAS.discardV2,
    ],
    [
      "fluyo:r4b:preflight-attempt-authority:v3",
      "fluyo:r4b:preflight-synthetic-observation-aggregate:v2",
      "fluyo:r4b:preflight-result:v2",
      "fluyo:r4b:preflight-discard:v2",
    ],
  );
  assert.equal(resolveAttempt002State(), "NOT_STARTED");
});
