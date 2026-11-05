import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { validateAttempt002Result, validatePreflightResult } from "./preflight-contracts.mjs";
import {
  PREFLIGHT_EXECUTOR_PATHS,
  expectedSyntheticCheckIds,
  preflightExecutorTesting,
  validateSyntheticObservationAggregate,
} from "./preflight-executor.mjs";
import { createDiscardedPreflightPlan, discardedPreflightPlanDigest } from "./preflight-plan.mjs";
import { windowsNativeBoundaryTesting } from "./windows-native-client.mjs";

if (process.platform === "win32") {
  windowsNativeBoundaryTesting.enableTestRoot();
}

function createMandatoryJunction(target, junction) {
  symlinkSync(target, junction, process.platform === "win32" ? "junction" : "dir");
}

function passingObservationMetrics(plan) {
  return {
    maxPngEncodedBytes: "4096",
    maxPngDecodedBytes: "8192",
    maxJsonBytes: "2048",
    maxTextBytes: "1024",
    maxPhysicalKeyChars: plan.gates.physicalKeyMaxChars,
    maxFullPathChars: 180,
    cleanRepeatChangedPixels: plan.gates.cleanRepeatChangedPixels,
    pngNormalization: plan.gates.pngNormalization,
  };
}

function passingAggregate(plan) {
  return {
    schema: "fluyo:r4b:preflight-synthetic-observation-aggregate:v2",
    creditable: false,
    evidenceStatus: "NON_EVIDENCE",
    productSourceCommit: plan.sourceCommit,
    authorityDigest: "a".repeat(64),
    planDigest: discardedPreflightPlanDigest(plan),
    networkIsolationStatus: "PASS",
    unexpectedEgressCount: 0,
    observerPeakRssBytes: "1048576",
    sampleRawInventoryLogicalBytes: "1024",
    sampleDistinctCellCount: "30",
    sampleObservationCount: "120",
    sampleObservationArtifactFileCount: "960",
    fullRunCellCount: "10800",
    fullRunArtifactCount: "86400",
    diskScaleNumerator: "10800",
    diskScaleDenominator: "30",
    diskSafetyFactorNumerator: "2",
    diskSafetyFactorDenominator: "1",
    conservativeFullRunDiskBudgetBytes: "737280",
    announcements: plan.observations.map((observation) => ({
      observationId: observation.observationId,
      eventCount: 1,
      normalizedTextSha256: "b".repeat(64),
      duplicateCount: 0,
      expectedOrderStatus: "PASS",
      oneTimeAnnouncementStatus: "PASS",
    })),
    checks: expectedSyntheticCheckIds(plan).map((checkId) => ({
      checkId,
      status: "PASS",
      metrics: checkId.startsWith("observation:") ? passingObservationMetrics(plan) : null,
    })),
  };
}

test("closes the executor to fixed ignored NON_EVIDENCE paths and 144 required checks", () => {
  const plan = createDiscardedPreflightPlan();
  const ids = expectedSyntheticCheckIds(plan);
  assert.equal(ids.length, 144);
  assert.equal(ids.filter((id) => id.startsWith("observation:")).length, 120);
  assert.equal(ids.filter((id) => id.startsWith("accessibility:")).length, 10);
  assert.equal(ids.filter((id) => id.startsWith("risk:")).length, 6);
  assert.equal(ids.filter((id) => id.startsWith("transition-family:")).length, 8);
  assert.deepEqual(PREFLIGHT_EXECUTOR_PATHS, {
    manifest: ".r4b-preflight/runtime/tool-manifest.json",
    smokeResult: ".r4b-preflight/runtime/smoke-result.json",
    aggregate: ".r4b-preflight/runtime/synthetic-observation-aggregate.json",
    raw: ".r4b-preflight/runtime/raw",
    result: ".r4b-preflight/runtime/sanitized-result.json",
    discard: ".r4b-preflight/runtime/discard-receipt.json",
  });
  for (const forbidden of [
    "discardRawTree",
    "discardExactOwnedTree",
    "completeCleanupTransaction",
    "completeAttempt002CleanupTransaction",
    "writeExclusiveOrValidateMatchingJson",
  ]) {
    assert.equal(Object.hasOwn(preflightExecutorTesting, forbidden), false);
  }
});

test("emits an honest counted BLOCKED result while required tools are not launched", () => {
  const plan = createDiscardedPreflightPlan();
  const manifest = {
    tools: [
      { toolId: "chrome_for_testing", launchStatus: "BLOCKED" },
      { toolId: "chromedriver", launchStatus: "BLOCKED" },
      { toolId: "nvda", launchStatus: "ELIGIBLE" },
    ],
  };
  const result = preflightExecutorTesting.blockedResult(
    plan,
    manifest,
    "required_tool_launch_not_eligible",
    { toolManifestDigest: "c".repeat(64), smokeResultDigest: "d".repeat(64) },
  );
  assert.equal(validatePreflightResult(result), result);
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.conducted, 0);
  assert.equal(result.blocked, 144);
  assert.equal(result.requiredUnattempted, 144);
  assert.equal(result.retainedRawBytes, "0");
  assert.equal(
    result.notes.some((note) => /[A-Z]:\\|\.\.\//u.test(note)),
    false,
  );
});

test("accepts only a complete sanitized aggregate that enforces every observation gate", () => {
  const plan = createDiscardedPreflightPlan();
  const aggregate = passingAggregate(plan);
  assert.equal(validateSyntheticObservationAggregate(aggregate, plan), aggregate);
  const result = preflightExecutorTesting.aggregateResult(plan, aggregate, {
    toolManifestDigest: "c".repeat(64),
    smokeResultDigest: "d".repeat(64),
  });
  assert.equal(validatePreflightResult(result), result);
  assert.deepEqual(
    {
      status: result.status,
      conducted: result.conducted,
      passed: result.passed,
      failed: result.failed,
      blocked: result.blocked,
      requiredUnattempted: result.requiredUnattempted,
    },
    {
      status: "PASS",
      conducted: 144,
      passed: 144,
      failed: 0,
      blocked: 0,
      requiredUnattempted: 0,
    },
  );

  const zeroDiffViolation = structuredClone(aggregate);
  zeroDiffViolation.checks[0].metrics.cleanRepeatChangedPixels = 1;
  assert.throws(
    () => validateSyntheticObservationAggregate(zeroDiffViolation, plan),
    /must FAIL when a resource, path, or zero-diff gate fails/u,
  );
  assert.throws(
    () =>
      validateSyntheticObservationAggregate(
        { ...aggregate, conservativeFullRunDiskBudgetBytes: "737281" },
        plan,
      ),
    /capacity contract|BigInt|disk budget/u,
  );
  assert.throws(
    () =>
      validateSyntheticObservationAggregate({ ...aggregate, sampleDistinctCellCount: "31" }, plan),
    /capacity contract|BigInt|disk budget/u,
  );
  assert.throws(
    () =>
      validateSyntheticObservationAggregate({ ...aggregate, fullRunArtifactCount: "86401" }, plan),
    /capacity contract|BigInt|disk budget/u,
  );
  assert.equal(
    validateSyntheticObservationAggregate(
      { ...aggregate, observerPeakRssBytes: "999999999999999999" },
      plan,
    ).observerPeakRssBytes,
    "999999999999999999",
  );
  zeroDiffViolation.checks[0].status = "FAIL";
  assert.equal(validateSyntheticObservationAggregate(zeroDiffViolation, plan), zeroDiffViolation);

  assert.throws(
    () =>
      validateSyntheticObservationAggregate(
        { ...aggregate, retainedLocator: "http://localhost:43127" },
        plan,
      ),
    /keys/u,
  );
  assert.throws(
    () =>
      validateSyntheticObservationAggregate(
        { ...aggregate, networkIsolationStatus: "UNATTEMPTED" },
        plan,
      ),
    /network status/u,
  );
  assert.throws(
    () => validateSyntheticObservationAggregate({ ...aggregate, unexpectedEgressCount: 1 }, plan),
    /fail-closed/u,
  );
  const egressFailure = structuredClone(aggregate);
  egressFailure.unexpectedEgressCount = 1;
  egressFailure.checks[0].status = "FAIL";
  assert.equal(validateSyntheticObservationAggregate(egressFailure, plan), egressFailure);
  assert.throws(
    () =>
      validateSyntheticObservationAggregate(
        { ...aggregate, checks: aggregate.checks.slice(1) },
        plan,
      ),
    /exactly the 144/u,
  );
});

test("counts failures and required unattempted checks without retaining raw details", () => {
  const plan = createDiscardedPreflightPlan();
  const aggregate = passingAggregate(plan);
  aggregate.checks[0].status = "FAIL";
  aggregate.checks[120].status = "UNATTEMPTED";
  validateSyntheticObservationAggregate(aggregate, plan);
  const result = preflightExecutorTesting.aggregateResult(plan, aggregate, {
    toolManifestDigest: "c".repeat(64),
    smokeResultDigest: "d".repeat(64),
  });
  assert.equal(result.status, "FAIL");
  assert.equal(result.conducted, 143);
  assert.equal(result.passed, 142);
  assert.equal(result.failed, 1);
  assert.equal(result.requiredUnattempted, 1);
  assert.equal(JSON.stringify(result).includes("cells/"), false);
});

test("accepts all 144 honest blocked statuses without fabricating observation metrics", () => {
  const plan = createDiscardedPreflightPlan();
  const aggregate = passingAggregate(plan);
  aggregate.networkIsolationStatus = "FAIL";
  aggregate.announcements = aggregate.announcements.map((summary) => ({
    ...summary,
    eventCount: 0,
    expectedOrderStatus: "BLOCKED",
    oneTimeAnnouncementStatus: "BLOCKED",
  }));
  aggregate.checks = aggregate.checks.map((check) => ({
    ...check,
    status: "BLOCKED",
    metrics: null,
  }));
  assert.equal(validateSyntheticObservationAggregate(aggregate, plan), aggregate);
  assert.equal(aggregate.checks.length, 144);
});

test("binds the attempt-002 sanitized result to exact raw and build inventories", () => {
  const plan = createDiscardedPreflightPlan();
  const aggregate = passingAggregate(plan);
  aggregate.sampleRawInventoryLogicalBytes = "101";
  aggregate.conservativeFullRunDiskBudgetBytes = "72720";
  const authority = {
    productSourceCommit: plan.sourceCommit,
    harnessSourceCommit: "f".repeat(40),
  };
  const result = preflightExecutorTesting.attempt002ResultFromAggregate(
    aggregate,
    authority,
    "c".repeat(64),
    {
      raw: { digest: "d".repeat(64), bytes: 101n },
      build: { digest: "e".repeat(64), bytes: 202n },
    },
  );
  assert.equal(validateAttempt002Result(result), result);
  assert.equal(result.rawBytesBeforeDiscard, "101");
  assert.equal(result.buildBytesBeforeDiscard, "202");
  assert.equal(result.retainedRawBytes, "0");
  assert.equal(result.retainedBuildBytes, "0");
  assert.throws(
    () => validateAttempt002Result({ ...result, rawInventoryDigest: "bad" }),
    /rawInventoryDigest/u,
  );
  assert.throws(
    () =>
      preflightExecutorTesting.attempt002ResultFromAggregate(
        { ...aggregate, sampleRawInventoryLogicalBytes: "102" },
        authority,
        "c".repeat(64),
        {
          raw: { digest: "d".repeat(64), bytes: 101n },
          build: { digest: "e".repeat(64), bytes: 202n },
        },
      ),
    /must equal the exact raw inventory bytes/u,
  );
  assert.throws(
    () =>
      validateAttempt002Result({
        ...result,
        sampleRawInventoryLogicalBytes: "102",
        conservativeFullRunDiskBudgetBytes: "73440",
      }),
    /must equal rawBytesBeforeDiscard/u,
  );
});

test("rejects oversized JSON and runtime directory links before parsing", () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "fluyo-r4b-input-"));
  try {
    const runtimeRoot = resolve(temporaryRoot, "runtime");
    mkdirSync(runtimeRoot, { recursive: true });
    const inputPath = resolve(runtimeRoot, "input.json");
    writeFileSync(inputPath, JSON.stringify({ value: "1234567890" }));
    assert.throws(
      () => preflightExecutorTesting.readBoundedJson(inputPath, runtimeRoot, 5, "test input"),
      /exceeds the approved JSON byte gate/u,
    );
    assert.deepEqual(
      preflightExecutorTesting.readBoundedJson(inputPath, runtimeRoot, 64, "test input"),
      { value: "1234567890" },
    );

    const linkedRuntime = resolve(temporaryRoot, "linked-runtime");
    createMandatoryJunction(runtimeRoot, linkedRuntime);
    assert.throws(
      () => preflightExecutorTesting.assertRealDirectoryChain(temporaryRoot, linkedRuntime),
      /junction|link|reparse/u,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
