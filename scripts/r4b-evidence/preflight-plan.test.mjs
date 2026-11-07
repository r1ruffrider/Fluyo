import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadAcceptedR4aCatalog } from "./catalog.mjs";
import { isPhysicalArtifactKey } from "./identity.mjs";
import {
  PREFLIGHT_RELATIVE_ROOTS,
  createAttempt002PreparationSummary,
  createPreflightInfrastructureHandshake,
  runPreflightCli,
} from "./preflight-cli.mjs";
import {
  APPROVED_PREFLIGHT_SOURCE_COMMIT,
  PREFLIGHT_ARTIFACT_IDS,
  createDiscardedPreflightPlan,
  discardedPreflightPlanDigest,
} from "./preflight-plan.mjs";

test("creates the approved immutable NON_EVIDENCE discarded-preflight plan", () => {
  const plan = createDiscardedPreflightPlan();
  assert.equal(plan.schema, "fluyo:r4b:preflight-plan:v1");
  assert.equal(plan.creditable, false);
  assert.equal(plan.evidenceStatus, "NON_EVIDENCE");
  assert.equal(plan.sourceCommit, APPROVED_PREFLIGHT_SOURCE_COMMIT);
  assert.equal(plan.rawOutputPolicy, "DISCARD_ALL_RETAIN_SANITIZED_AGGREGATES_ONLY");
  assert.deepEqual(plan.gates, {
    pngEncodedMaxBytes: "8388608",
    pngDecodedMaxBytes: "8388608",
    jsonMaxBytes: "262144",
    textMaxBytes: "131072",
    physicalKeyMaxChars: 90,
    transientRootMaxChars: 128,
    fullPathMaxChars: 240,
    cleanRepeatChangedPixels: 0,
    pngNormalization: "RGBA8_SRGB_CRITICAL_CHUNKS_ONLY",
    unexpectedEgress: "FAIL",
    networkIsolationAuthority: "UNATTEMPTED",
    aggregateMaximumBytes: "536870912",
  });
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.visualCells), true);
  assert.equal(Object.isFrozen(plan.visualCells[0]), true);
  assert.throws(() => plan.visualCells.push(plan.visualCells[0]), /not extensible/u);
  assert.match(discardedPreflightPlanDigest(plan), /^[0-9a-f]{64}$/u);
  assert.throws(() => createDiscardedPreflightPlan({}), /caller-supplied authority/u);
});

test("rotates exactly 30 visual cells across every fixture and both browser zooms", () => {
  const { axes } = loadAcceptedR4aCatalog();
  const plan = createDiscardedPreflightPlan();
  assert.equal(plan.visualCells.length, 30);
  assert.equal(new Set(plan.visualCells.map((cell) => cell.cellDigest)).size, 30);

  for (const fixtureId of axes.fixtureIds) {
    const cells = plan.visualCells.filter((cell) => cell.fixtureId === fixtureId);
    assert.equal(cells.length, 2);
    assert.deepEqual(
      cells.map((cell) => cell.textScaleId),
      axes.textScaleIds,
    );
  }
  for (const [axisName, acceptedValues, expectedCount] of [
    ["stateId", axes.stateIds, 3],
    ["viewportId", axes.viewportIds, 5],
    ["themeId", axes.themeIds, 15],
    ["localeId", axes.localeIds, 10],
    ["textScaleId", axes.textScaleIds, 15],
  ]) {
    for (const acceptedValue of acceptedValues) {
      assert.equal(
        plan.visualCells.filter((cell) => cell[axisName] === acceptedValue).length,
        expectedCount,
      );
    }
  }
});

test("creates 120 transient observations with all eight class-shaped outputs", () => {
  const plan = createDiscardedPreflightPlan();
  assert.equal(plan.observations.length, 120);
  assert.equal(new Set(plan.observations.map((entry) => entry.observationId)).size, 120);
  for (const cell of plan.visualCells) {
    const observations = plan.observations.filter((entry) => entry.cellDigest === cell.cellDigest);
    assert.equal(observations.length, 4);
    assert.deepEqual(
      observations.map((entry) => `${entry.motionPreferenceId}:${entry.repetition}`),
      ["no-preference:1", "no-preference:2", "reduce:1", "reduce:2"],
    );
    for (const observation of observations) {
      assert.equal(observation.transientRootClass, "NON_EVIDENCE_DISCARDED_PREFLIGHT");
      assert.equal(observation.artifactKeys.length, 8);
      assert.deepEqual(
        observation.artifactKeys.map((key) => key.split("/").at(-1)),
        PREFLIGHT_ARTIFACT_IDS,
      );
      assert.equal(observation.artifactKeys.every(isPhysicalArtifactKey), true);
      assert.equal(Math.max(...observation.artifactKeys.map((key) => key.length)), 90);
    }
  }
});

test("adds accessibility/risk checks and partitions all 49 transitions into eight families", () => {
  const plan = createDiscardedPreflightPlan();
  assert.equal(plan.accessibilityChecks.length, 10);
  assert.equal(plan.riskIntersections.length, 6);
  assert.equal(plan.transitionFamilies.length, 8);
  const sequences = plan.transitionFamilies.flatMap((family) => family.transitionSequences);
  assert.deepEqual(
    [...sequences].sort((left, right) => left - right),
    Array.from({ length: 49 }, (_, index) => index + 1),
  );
  assert.equal(new Set(sequences).size, 49);
  assert.deepEqual(
    plan.transitionFamilies.map((family) => family.representativeSequence),
    [1, 16, 32, 31, 46, 47, 48, 49],
  );
  assert.equal(
    plan.transitionFamilies.every((family) =>
      family.transitionSequences.includes(family.representativeSequence),
    ),
    true,
  );
  assert.deepEqual(
    plan.transitionFamilies.map((family) => family.familyId),
    [
      "direct_load",
      "client_transition",
      "same_screen_refresh",
      "delayed_preparing_refresh",
      "connectivity_lost_preparing",
      "connectivity_lost_active",
      "connectivity_restored_preparing",
      "connectivity_restored_active",
    ],
  );
  assert.equal(
    plan.accessibilityChecks.find((entry) => entry.checkId === "browser_zoom_200_reflow")
      .targetCellOrdinals.length,
    15,
  );
  assert.equal(
    plan.accessibilityChecks.find(
      (entry) => entry.checkId === "rtl_direction_and_logical_mirroring",
    ).targetCellOrdinals.length,
    11,
  );
  assert.equal(new Set(plan.riskIntersections.map((entry) => entry.cellDigest)).size, 6);
  assert.deepEqual(
    plan.riskIntersections.find(
      (entry) => entry.intersectionId === "large_text_compact_landscape_zoom_200",
    ),
    {
      ordinal: 3,
      intersectionId: "large_text_compact_landscape_zoom_200",
      stateId: "ACTIVE",
      viewportId: "compact_landscape_844x390",
      themeId: "light",
      localeId: "en-XA",
      textScaleId: "browser_zoom_200",
      fixtureId: "large_text_compact_landscape",
      variantId: null,
      cellDigest: plan.riskIntersections[2].cellDigest,
      required: true,
    },
  );
});

test("publishes a credential-free fixed-root infrastructure handshake", () => {
  const handshake = createPreflightInfrastructureHandshake();
  assert.equal(handshake.schema, "fluyo:r4b:preflight-handshake:v1");
  assert.equal(handshake.creditable, false);
  assert.equal(handshake.evidenceStatus, "NON_EVIDENCE");
  assert.equal(handshake.sourceCommit, APPROVED_PREFLIGHT_SOURCE_COMMIT);
  assert.equal(handshake.environmentVariables.length, 0);
  assert.equal(handshake.networkIsolationAuthority, "UNATTEMPTED");
  assert.deepEqual(handshake.relativeRoots, PREFLIGHT_RELATIVE_ROOTS);
  assert.equal(handshake.relativeRoots.raw.startsWith(".r4b-preflight/"), true);
  assert.equal(
    handshake.relativeRoots.attempt002.root,
    ".r4b-preflight/runtime/attempts/attempt-002-observer",
  );
  assert.equal(handshake.forbiddenActions.includes("full_capture"), true);
  assert.equal(handshake.forbiddenActions.includes("provider_or_cloud_access"), true);
});

test("holds execution before any attempt-002 mutation until A2 and all gates are frozen", async () => {
  await assert.rejects(
    runPreflightCli(["execute"]),
    /requires OBSERVED, RESULT_RECORDED, CLEANING, or FAILED_HELD state/u,
  );
});

test("exposes one fixed PREP-only CLI command and sanitized summary", () => {
  const source = readFileSync(new URL("./preflight-cli.mjs", import.meta.url), "utf8");
  const prepareCase = source.slice(
    source.indexOf('case "prepare-attempt-002"'),
    source.indexOf('case "execute"'),
  );
  const summaryFunction = source.slice(
    source.indexOf("export function createAttempt002PreparationSummary"),
    source.indexOf("export async function runPreflightCli"),
  );
  assert.match(prepareCase, /prepareAttempt002Runtime\(\)/u);
  assert.match(summaryFunction, /fluyo:r4b:preflight-preparation-summary:v1/u);
  for (const key of [
    "schema",
    "evidenceStatus",
    "status",
    "receiptDigest",
    "nativeNvdaLaunchStatus",
  ]) {
    assert.match(
      summaryFunction,
      new RegExp(key === "receiptDigest" ? "receiptDigest," : `${key}:`, "u"),
    );
  }
  assert.doesNotMatch(prepareCase, /observeDiscardedPreflight|executeAttempt002Preflight/u);
  assert.equal(
    PREFLIGHT_RELATIVE_ROOTS.attempt002.preparationReceipt,
    ".r4b-preflight/runtime/attempts/attempt-002-observer/preparation-receipt.json",
  );
});

test("binds the CLI preparation summary to exact newline-terminated receipt bytes", () => {
  const receipt = { status: "PASS", nativeNvdaLaunchStatus: "UNATTEMPTED" };
  const exactBytes = `${JSON.stringify(receipt)}\n`;
  const exactDigest = createHash("sha256").update(exactBytes, "utf8").digest("hex");
  const summary = createAttempt002PreparationSummary(receipt, exactDigest);
  assert.equal(summary.receiptDigest, exactDigest);
  assert.notEqual(
    summary.receiptDigest,
    createHash("sha256").update(JSON.stringify(receipt), "utf8").digest("hex"),
  );
  const cli = readFileSync(new URL("./preflight-cli.mjs", import.meta.url), "utf8");
  assert.match(
    cli,
    /createAttempt002PreparationSummary\(\s*receipt,\s*attempt002PreparationReceiptDigest\(\)\s*\)/u,
  );
});

test("locks PREP to authority-bound manifest, sealed lifecycle receipt, and no observation launch", () => {
  const observer = readFileSync(new URL("./preflight-observer.mjs", import.meta.url), "utf8");
  const attempts = readFileSync(new URL("./preflight-attempts.mjs", import.meta.url), "utf8");
  for (const marker of [
    "validatePreparationManifestAuthorityBinding",
    "canonicalPreparationClosureDigest",
    "directExecutableSha256",
    "spawnAndRegisterPreparationProcess",
    "proveFailedSpawnRegistrationAbsent",
    "registrationCapture.records",
    "capturedOwnerView(captured)",
    "attempt002PreparationReceiptDigest() !== currentAttempt002PreparedReceiptDigest()",
  ]) {
    assert.equal(observer.includes(marker), true, marker);
  }
  assert.equal(attempts.includes('"preparationReceiptSha256"'), true);
  assert.equal(
    attempts.includes("preparationReceiptSha256 === attempt002PreparationReceiptDigest()"),
    true,
  );
  const prepare = observer.slice(
    observer.indexOf("async function prepareNvdaPortable"),
    observer.indexOf("async function launchPreparedNvdaWriter"),
  );
  assert.doesNotMatch(prepare, /spawnNativeNvdaBoundary|spawn\(DRIVER|createChromeSession/u);
  const ownershipRegressions = readFileSync(
    new URL("./preflight-process-owner.test.mjs", import.meta.url),
    "utf8",
  );
  const observerRegressions = readFileSync(
    new URL("./preflight-observer.test.mjs", import.meta.url),
    "utf8",
  );
  for (const title of [
    "never terminates recycled root or descendant PIDs with changed immutable identities",
    "fails closed on unreadable or pre-inspection reused roots and binds registration records",
    "unions successful registration closure through normal, exited, timeout, and error exit paths",
  ]) {
    assert.equal(observerRegressions.includes(title), true, title);
  }
  for (const title of [
    "accepts already-exited only when absent",
    "proves absence afterward",
    "surviving reparented Chrome child",
    "late descendant that appears after the root exits",
    "pre-wait child reparented before graceful termination",
    "cancels operations at the closed timeout",
  ]) {
    assert.equal(ownershipRegressions.includes(title), true, title);
  }
});

test("git excludes every raw discarded-preflight root from accidental staging", () => {
  const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
  for (const path of [
    ".r4b-preflight/downloads/archive.zip",
    ".r4b-preflight/tools/browser/chrome.exe",
    ".r4b-preflight/runtime/raw/cells/deadbeef/actual.png",
    ".r4b-preflight/runtime/tool-manifest.json",
  ]) {
    const output = execFileSync("git", ["check-ignore", "--no-index", "--verbose", path], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });
    assert.match(output, /^\.gitignore:\d+:\.r4b-preflight\//u);
  }
  assert.throws(
    () =>
      execFileSync(
        "git",
        ["check-ignore", "--no-index", "scripts/r4b-evidence/preflight-plan.mjs"],
        {
          cwd: repositoryRoot,
          encoding: "utf8",
          stdio: "pipe",
        },
      ),
    (error) => error?.status === 1,
  );
});
