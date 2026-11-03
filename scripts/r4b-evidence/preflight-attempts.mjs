import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertFixedRootGuard,
  createFixedDirectory,
  readBoundedRegularFile,
  writeFixedRegularFile,
} from "./fixed-root-guard.mjs";

import {
  PREFLIGHT_SCHEMAS,
  validatePreflightDiscard,
  validatePreflightResult,
  validateAttempt002ToolManifest,
} from "./preflight-contracts.mjs";
import { createDiscardedPreflightPlan, discardedPreflightPlanDigest } from "./preflight-plan.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const RUNTIME = resolve(ROOT, ".r4b-preflight/runtime");
const PRODUCT_SOURCE_COMMIT = "fea1f5fadb2307ca611379f30461a7ee47861fff";
const AUTHORITY_SOURCE_RELATIVE = "scripts/r4b-evidence/attempt-002-authority.json";
const AUTHORITY_SOURCE_PATH = resolve(ROOT, AUTHORITY_SOURCE_RELATIVE);
const INFRASTRUCTURE_PLAN_RELATIVE = "docs/2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md";
const INFRASTRUCTURE_PLAN_PATH = resolve(ROOT, INFRASTRUCTURE_PLAN_RELATIVE);
export const ATTEMPT_002_SOURCE_TOOL_MANIFEST = resolve(RUNTIME, "attempt-002-tool-manifest.json");

export const PREFLIGHT_ATTEMPT_IDS = Object.freeze(["attempt-001-smoke", "attempt-002-observer"]);
export const PREFLIGHT_ATTEMPT_002_STATES = Object.freeze([
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
export const ATTEMPT_001_SEALS = Object.freeze({
  result: "6429c43544f025c9a60ad01e10e5284930b15d952e6467c3a018ad22c1500e1a",
  receipt: "48161fe1845ac28d0b214f7e5ed5c709c102300d30e7752297b06c82446643be",
});
export const ATTEMPT_002_PATHS = Object.freeze({
  lifecycle: resolve(RUNTIME, "attempt-002-lifecycle.jsonl"),
  root: resolve(RUNTIME, "attempts/attempt-002-observer"),
  authoritySource: AUTHORITY_SOURCE_PATH,
  authority: resolve(RUNTIME, "attempts/attempt-002-observer/authority.json"),
  toolManifest: resolve(RUNTIME, "attempts/attempt-002-observer/tool-manifest.json"),
  raw: resolve(RUNTIME, "attempts/attempt-002-observer/raw"),
  build: resolve(ROOT, "apps/r4b-preflight-harness/.next-attempt-002"),
  buildTemp: resolve(RUNTIME, "attempt-002-build-temp"),
  aggregate: resolve(RUNTIME, "attempts/attempt-002-observer/synthetic-observation-aggregate.json"),
  result: resolve(RUNTIME, "attempts/attempt-002-observer/sanitized-result.json"),
  receipt: resolve(RUNTIME, "attempts/attempt-002-observer/discard-receipt.json"),
  failedHeld: resolve(RUNTIME, "attempts/attempt-002-observer/failed-held.json"),
  buildFailedHeld: resolve(RUNTIME, "attempt-002-build-failed-held.json"),
  buildOwnership: resolve(RUNTIME, "attempt-002-builder-ownership.jsonl"),
  buildRecovery: resolve(RUNTIME, "attempt-002-build-failure-recovery.json"),
  buildReady: resolve(RUNTIME, "attempt-002-build-ready.json"),
  serverReady: resolve(RUNTIME, "attempts/attempt-002-observer/server-ready.json"),
  driverReady: resolve(RUNTIME, "attempts/attempt-002-observer/driver-ready.json"),
  nvdaReady: resolve(RUNTIME, "attempts/attempt-002-observer/nvda-ready.json"),
});
const ATTEMPT_001_PATHS = Object.freeze({
  result: resolve(RUNTIME, "sanitized-result.json"),
  receipt: resolve(RUNTIME, "discard-receipt.json"),
  toolManifest: resolve(RUNTIME, "tool-manifest.json"),
});

export const FROZEN_HARNESS_FILES = Object.freeze([
  ".gitignore",
  ".vercelignore",
  "package.json",
  "package-lock.json",
  "tsconfig.base.json",
  INFRASTRUCTURE_PLAN_RELATIVE,
  "apps/r4b-preflight-harness/package.json",
  "apps/r4b-preflight-harness/next-env.d.ts",
  "apps/r4b-preflight-harness/next.config.ts",
  "apps/r4b-preflight-harness/tsconfig.json",
  "apps/r4b-preflight-harness/app/layout.tsx",
  "apps/r4b-preflight-harness/app/globals.css",
  "apps/r4b-preflight-harness/app/page.tsx",
  "apps/r4b-preflight-harness/localized-boundary.tsx",
  "apps/r4b-preflight-harness/transition-intent-boundary.tsx",
  "apps/r4b-preflight-harness/inert-client-boundary.tsx",
  "apps/r4b-preflight-harness/source-contract.tsx",
  "apps/r4b-preflight-harness/inert-actions.ts",
  "apps/web/package.json",
  "apps/web/app/globals.css",
  "apps/web/app/learn/session/conversation-canvas.tsx",
  "apps/web/app/learn/session/conversation-canvas.module.css",
  "apps/web/app/learn/session/conversation-canvas.dom.spec.tsx",
  "apps/web/app/learn/session/conversation-canvas-state.ts",
  "apps/web/app/dev-fixtures/conversation-canvas/fixtures.ts",
  "scripts/r4b-evidence/nvda-adapter/index.mjs",
  "scripts/r4b-evidence/nvda-adapter/protocol.mjs",
  "scripts/r4b-evidence/nvda-adapter/protocol.test.mjs",
  "scripts/r4b-evidence/nvda-adapter/inherited-handle-consumer-fixture.py",
  "scripts/r4b-evidence/nvda-adapter/nvda-plugin-latch-fixture.py",
  "scripts/r4b-evidence/nvda-adapter/scratchpad/globalPlugins/fluyoPreflightSpeech.py",
  "scripts/r4b-evidence/fixed-root-guard.mjs",
  "scripts/r4b-evidence/fixed-root-guard.test.mjs",
  "scripts/r4b-evidence/windows-native-boundary.cs",
  "scripts/r4b-evidence/windows-native-client.mjs",
  "scripts/r4b-evidence/windows-native-contract.json",
  "scripts/r4b-evidence/windows-native-worker.mjs",
  "scripts/r4b-evidence/windows-native-response.mjs",
  "scripts/r4b-evidence/windows-native-test-journal-cleanup.cs",
  "scripts/r4b-evidence/windows-native-test-journal-runner.mjs",
  "scripts/r4b-evidence/windows-native-test-journal-runner.test.mjs",
  "scripts/r4b-evidence/windows-native-boundary.test.mjs",
  "scripts/r4b-evidence/r4b-test-lanes.mjs",
  "scripts/r4b-evidence/fixtures/attempt-001/sanitized-result.fixture",
  "scripts/r4b-evidence/fixtures/attempt-001/discard-receipt.fixture",
  "scripts/r4b-evidence/preflight-attempts.mjs",
  "scripts/r4b-evidence/preflight-attempts.test.mjs",
  "scripts/r4b-evidence/preflight-build.mjs",
  "scripts/r4b-evidence/preflight-build.test.mjs",
  "scripts/r4b-evidence/preflight-cli.mjs",
  "scripts/r4b-evidence/preflight-contracts.mjs",
  "scripts/r4b-evidence/preflight-contracts.test.mjs",
  "scripts/r4b-evidence/preflight-executor.mjs",
  "scripts/r4b-evidence/preflight-executor.test.mjs",
  "scripts/r4b-evidence/preflight-observer.mjs",
  "scripts/r4b-evidence/preflight-observer.test.mjs",
  "scripts/r4b-evidence/preflight-plan.mjs",
  "scripts/r4b-evidence/preflight-plan.test.mjs",
  "scripts/r4b-evidence/preflight-png.mjs",
  "scripts/r4b-evidence/preflight-png.test.mjs",
  "scripts/r4b-evidence/preflight-process-owner.mjs",
  "scripts/r4b-evidence/preflight-process-owner.test.mjs",
  "scripts/r4b-evidence/production-exclusion.mjs",
  "scripts/r4b-evidence/production-exclusion.test.mjs",
]);

const AUTHORITY_KEYS = Object.freeze([
  "schema",
  "creditable",
  "evidenceStatus",
  "attemptId",
  "ordinal",
  "mode",
  "productSourceCommit",
  "productTreeDigest",
  "harnessSourceCommit",
  "harnessTreeDigest",
  "infrastructurePlanDigest",
  "observationPlanDigest",
  "toolManifestDigest",
  "predecessorResultFileSha256",
  "predecessorReceiptFileSha256",
  "predecessorStatus",
  "requiredCheckCount",
  "rawPolicy",
]);
const LIFECYCLE_SCHEMA = "fluyo:r4b:attempt-002-lifecycle-state:v1";
const LIFECYCLE_KEYS = Object.freeze([
  "schema",
  "attemptId",
  "ordinal",
  "state",
  "previousRecordSha256",
]);
const LIFECYCLE_TRANSITIONS = Object.freeze(
  new Map([
    ["NOT_STARTED", new Set(["BUILDING"])],
    ["BUILDING", new Set(["BUILD_READY", "FAILED_HELD"])],
    ["BUILD_READY", new Set(["PREPARING", "FAILED_HELD"])],
    ["PREPARING", new Set(["PREPARED", "FAILED_HELD"])],
    ["PREPARED", new Set(["OBSERVING", "FAILED_HELD"])],
    ["OBSERVING", new Set(["SERVER_READY", "FAILED_HELD"])],
    ["SERVER_READY", new Set(["DRIVER_READY", "FAILED_HELD"])],
    ["DRIVER_READY", new Set(["NVDA_READY", "FAILED_HELD"])],
    ["NVDA_READY", new Set(["OBSERVED", "FAILED_HELD"])],
    ["OBSERVED", new Set(["RESULT_RECORDED", "FAILED_HELD"])],
    ["RESULT_RECORDED", new Set(["CLEANING", "FAILED_HELD"])],
    ["CLEANING", new Set(["SEALED", "FAILED_HELD"])],
    ["FAILED_HELD", new Set(["CLEANING", "BUILD_ABORTED"])],
    ["BUILD_ABORTED", new Set()],
    ["SEALED", new Set()],
  ]),
);

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function fileDigest(path) {
  return digest(readBoundedRegularFile(path, ROOT, 1048576, "attempt-002 bounded digest read"));
}
function canonicalDigest(value) {
  return digest(JSON.stringify(value));
}
function readJson(path) {
  return JSON.parse(
    readBoundedRegularFile(path, ROOT, 1048576, "attempt-002 bounded JSON read").toString("utf8"),
  );
}

export function validateAttempt002Lifecycle(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("attempt-002 lifecycle must contain at least BUILDING");
  }
  let previousState = "NOT_STARTED";
  let previousDigest = null;
  for (const [index, record] of records.entries()) {
    if (
      !record ||
      JSON.stringify(Object.keys(record)) !== JSON.stringify(LIFECYCLE_KEYS) ||
      record.schema !== LIFECYCLE_SCHEMA ||
      record.attemptId !== "attempt-002-observer" ||
      record.ordinal !== index + 1 ||
      record.previousRecordSha256 !== previousDigest ||
      !LIFECYCLE_TRANSITIONS.get(previousState)?.has(record.state)
    ) {
      throw new Error("attempt-002 append-only lifecycle order, chain, or state changed");
    }
    previousState = record.state;
    previousDigest = canonicalDigest(record);
  }
  return Object.freeze({ state: previousState, lastRecordSha256: previousDigest });
}

function readAttempt002Lifecycle() {
  if (!existsSync(ATTEMPT_002_PATHS.lifecycle)) return [];
  const bytes = readBoundedRegularFile(
    ATTEMPT_002_PATHS.lifecycle,
    ROOT,
    65536,
    "attempt-002 lifecycle read",
  ).toString("utf8");
  if (!bytes.endsWith("\n")) {
    throw new Error("attempt-002 lifecycle exceeds its bound or is not newline complete");
  }
  return bytes
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line));
}

export function currentAttempt002LifecycleState() {
  const records = readAttempt002Lifecycle();
  return records.length ? validateAttempt002Lifecycle(records).state : "NOT_STARTED";
}

function appendAttempt002LifecycleState(state) {
  const records = readAttempt002Lifecycle();
  const validated = records.length
    ? validateAttempt002Lifecycle(records)
    : { state: "NOT_STARTED", lastRecordSha256: null };
  const record = {
    schema: LIFECYCLE_SCHEMA,
    attemptId: "attempt-002-observer",
    ordinal: records.length + 1,
    state,
    previousRecordSha256: validated.lastRecordSha256,
  };
  validateAttempt002Lifecycle([...records, record]);
  createFixedDirectory(dirname(ATTEMPT_002_PATHS.lifecycle), ROOT, {
    recursive: true,
    label: "attempt-002 lifecycle parent",
  });
  writeFixedRegularFile(ATTEMPT_002_PATHS.lifecycle, ROOT, `${JSON.stringify(record)}\n`, {
    encoding: "utf8",
    flag: "a",
    label: "attempt-002 lifecycle append",
  });
  return Object.freeze(record);
}

export function assertAttempt002FixedPath(path, options = {}) {
  return assertFixedRootGuard(ROOT, path, {
    label: "attempt-002 fixed-root guard",
    ...options,
  });
}

function existingPathKind(path) {
  try {
    assertAttempt002FixedPath(path, { label: "attempt-002 path-kind check" });
    const entry = lstatSync(path);
    return entry.isSymbolicLink() ? "LINK" : entry.isDirectory() ? "DIRECTORY" : "FILE";
  } catch (error) {
    if (error?.code === "ENOENT") return "ABSENT";
    throw error;
  }
}

export function recordAttempt002Building() {
  if (
    existingPathKind(ATTEMPT_002_PATHS.root) !== "ABSENT" ||
    existingPathKind(ATTEMPT_002_PATHS.build) !== "ABSENT" ||
    existingPathKind(ATTEMPT_002_PATHS.buildTemp) !== "ABSENT" ||
    existingPathKind(ATTEMPT_002_PATHS.buildFailedHeld) !== "ABSENT" ||
    existingPathKind(ATTEMPT_002_PATHS.buildOwnership) !== "ABSENT" ||
    existingPathKind(ATTEMPT_002_PATHS.buildRecovery) !== "ABSENT" ||
    existingPathKind(ATTEMPT_002_PATHS.buildReady) !== "ABSENT"
  ) {
    throw new Error("attempt-002 BUILDING requires absent raw/result and build roots");
  }
  return appendAttempt002LifecycleState("BUILDING");
}

export function recordAttempt002BuildReady() {
  const buildId = resolve(ATTEMPT_002_PATHS.build, "BUILD_ID");
  if (
    existingPathKind(ATTEMPT_002_PATHS.root) !== "ABSENT" ||
    existingPathKind(ATTEMPT_002_PATHS.build) !== "DIRECTORY" ||
    existingPathKind(ATTEMPT_002_PATHS.buildTemp) !== "ABSENT" ||
    existingPathKind(ATTEMPT_002_PATHS.buildOwnership) !== "ABSENT" ||
    existingPathKind(buildId) !== "FILE" ||
    existingPathKind(ATTEMPT_002_PATHS.buildReady) !== "FILE"
  ) {
    throw new Error("attempt-002 BUILD_READY requires an isolated regular BUILD_ID output");
  }
  return appendAttempt002LifecycleState("BUILD_READY");
}
export const recordAttempt002Preparing = () => appendAttempt002LifecycleState("PREPARING");
export const recordAttempt002Prepared = () => appendAttempt002LifecycleState("PREPARED");
export const recordAttempt002Observing = () => appendAttempt002LifecycleState("OBSERVING");
export const recordAttempt002ServerReady = () => appendAttempt002LifecycleState("SERVER_READY");
export const recordAttempt002DriverReady = () => appendAttempt002LifecycleState("DRIVER_READY");
export const recordAttempt002NvdaReady = () => appendAttempt002LifecycleState("NVDA_READY");
export const recordAttempt002Observed = () => appendAttempt002LifecycleState("OBSERVED");
export const recordAttempt002ResultRecorded = () =>
  appendAttempt002LifecycleState("RESULT_RECORDED");
export const recordAttempt002Cleaning = () => appendAttempt002LifecycleState("CLEANING");
export const recordAttempt002FailedHeld = () => appendAttempt002LifecycleState("FAILED_HELD");
export const recordAttempt002Sealed = () => appendAttempt002LifecycleState("SEALED");

export function validateAttempt002BuildAbortRecords(
  failure,
  recovery,
  failureRecordSha256,
  pathKinds,
) {
  if (
    !failure ||
    JSON.stringify(Object.keys(failure)) !==
      JSON.stringify([
        "schema",
        "attemptId",
        "category",
        "boundary",
        "partialBuildInventorySha256",
        "partialBuildBytes",
        "partialTempInventorySha256",
        "partialTempBytes",
        "status",
      ]) ||
    failure.schema !== "fluyo:r4b:preflight-failed-held:v1" ||
    failure.attemptId !== "attempt-002-observer" ||
    failure.category !== "BUILD_TRANSACTION_FAILED" ||
    !/^[A-Z_]+$/u.test(failure.boundary) ||
    !/^[0-9a-f]{64}$/u.test(failure.partialBuildInventorySha256) ||
    !/^(0|[1-9][0-9]*)$/u.test(failure.partialBuildBytes) ||
    !/^[0-9a-f]{64}$/u.test(failure.partialTempInventorySha256) ||
    !/^(0|[1-9][0-9]*)$/u.test(failure.partialTempBytes) ||
    failure.status !== "FAILED_HELD"
  ) {
    throw new Error("attempt-002 build-abort failure record changed");
  }
  if (
    !recovery ||
    JSON.stringify(Object.keys(recovery)) !==
      JSON.stringify([
        "schema",
        "attemptId",
        "failureRecordSha256",
        "discardedBuildInventorySha256",
        "discardedBuildBytes",
        "discardedTempInventorySha256",
        "discardedTempBytes",
        "residualBuildBytes",
        "residualTempBytes",
        "status",
      ]) ||
    recovery.schema !== "fluyo:r4b:preflight-build-recovery:v1" ||
    recovery.attemptId !== "attempt-002-observer" ||
    recovery.failureRecordSha256 !== failureRecordSha256 ||
    recovery.discardedBuildInventorySha256 !== failure.partialBuildInventorySha256 ||
    recovery.discardedBuildBytes !== failure.partialBuildBytes ||
    recovery.discardedTempInventorySha256 !== failure.partialTempInventorySha256 ||
    recovery.discardedTempBytes !== failure.partialTempBytes ||
    recovery.residualBuildBytes !== "0" ||
    recovery.residualTempBytes !== "0" ||
    recovery.status !== "PASS" ||
    JSON.stringify(pathKinds) !==
      JSON.stringify({
        attemptRoot: "ABSENT",
        build: "ABSENT",
        buildTemp: "ABSENT",
        buildOwnership: "ABSENT",
        buildReady: "ABSENT",
      })
  ) {
    throw new Error("attempt-002 build-abort recovery receipt or zero-residual closure changed");
  }
  return Object.freeze({ state: "BUILD_ABORTED", status: "PASS" });
}

function validateFixedBuildAbortClosure() {
  const failure = readJson(ATTEMPT_002_PATHS.buildFailedHeld);
  const recovery = readJson(ATTEMPT_002_PATHS.buildRecovery);
  return validateAttempt002BuildAbortRecords(
    failure,
    recovery,
    fileDigest(ATTEMPT_002_PATHS.buildFailedHeld),
    {
      attemptRoot: existingPathKind(ATTEMPT_002_PATHS.root),
      build: existingPathKind(ATTEMPT_002_PATHS.build),
      buildTemp: existingPathKind(ATTEMPT_002_PATHS.buildTemp),
      buildOwnership: existingPathKind(ATTEMPT_002_PATHS.buildOwnership),
      buildReady: existingPathKind(ATTEMPT_002_PATHS.buildReady),
    },
  );
}

export function recordAttempt002BuildAborted() {
  validateFixedBuildAbortClosure();
  return appendAttempt002LifecycleState("BUILD_ABORTED");
}

export function validateAttempt002ReadinessReceipt(value, readiness) {
  const expectedChecks = Object.freeze({
    SERVER_READY: "QUERY_BOUNDARY_AND_LOOPBACK_PASS",
    DRIVER_READY: "WEBDRIVER_STATUS_AND_IDENTITY_PASS",
    NVDA_READY: "FILTERED_PRE_SPEECH_ADAPTER_IDENTITY_PASS",
  });
  if (
    !value ||
    JSON.stringify(Object.keys(value)) !==
      JSON.stringify(["schema", "attemptId", "readiness", "identityDigest", "checks", "status"]) ||
    value.schema !== "fluyo:r4b:attempt-002-readiness:v1" ||
    value.attemptId !== "attempt-002-observer" ||
    value.readiness !== readiness ||
    !/^[0-9a-f]{64}$/u.test(value.identityDigest) ||
    value.checks !== expectedChecks[readiness] ||
    value.status !== "PASS"
  ) {
    throw new Error("attempt-002 readiness receipt changed or is malformed");
  }
  return value;
}
function git(args, options = {}) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", ...options }).trim();
}

function canonicalCommitInventory(commit, paths) {
  return paths.map((path) => {
    const bytes = execFileSync("git", ["show", `${commit}:${path}`], { cwd: ROOT });
    return { path, sha256: digest(bytes) };
  });
}

export function validateAttempt002Authority(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value)) !== JSON.stringify(AUTHORITY_KEYS)
  ) {
    throw new Error("attempt-002 authority-v3 keys changed");
  }
  if (
    value.schema !== PREFLIGHT_SCHEMAS.attemptAuthority ||
    value.creditable !== false ||
    value.evidenceStatus !== "NON_EVIDENCE" ||
    value.attemptId !== "attempt-002-observer" ||
    value.ordinal !== 2 ||
    value.mode !== "DISCARDED_SYNTHETIC_OBSERVER" ||
    value.productSourceCommit !== PRODUCT_SOURCE_COMMIT ||
    value.predecessorStatus !== "BLOCKED" ||
    value.requiredCheckCount !== 144 ||
    value.rawPolicy !== "DISCARD_AFTER_VALIDATED_RESULT"
  ) {
    throw new Error("attempt-002 authority-v3 closed identity changed");
  }
  if (!/^[0-9a-f]{40}$/u.test(value.harnessSourceCommit)) {
    throw new Error("attempt-002 harnessSourceCommit must be lowercase 40-hex");
  }
  for (const field of [
    "productTreeDigest",
    "harnessTreeDigest",
    "infrastructurePlanDigest",
    "observationPlanDigest",
    "toolManifestDigest",
    "predecessorResultFileSha256",
    "predecessorReceiptFileSha256",
  ]) {
    if (!/^[0-9a-f]{64}$/u.test(value[field])) {
      throw new Error(`attempt-002 ${field} must be lowercase SHA-256`);
    }
  }
  if (
    value.predecessorResultFileSha256 !== ATTEMPT_001_SEALS.result ||
    value.predecessorReceiptFileSha256 !== ATTEMPT_001_SEALS.receipt
  ) {
    throw new Error("attempt-002 predecessor file seal changed");
  }
  return value;
}

export function validateAttempt001SealedBytes(resultBytes, receiptBytes) {
  if (!Buffer.isBuffer(resultBytes) || !Buffer.isBuffer(receiptBytes)) {
    throw new Error("attempt-001 seal validation requires exact result and receipt bytes");
  }
  if (
    digest(resultBytes) !== ATTEMPT_001_SEALS.result ||
    digest(receiptBytes) !== ATTEMPT_001_SEALS.receipt
  ) {
    throw new Error("attempt-001 immutable result or receipt seal changed");
  }
  const result = JSON.parse(resultBytes.toString("utf8"));
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  validatePreflightResult(result);
  validatePreflightDiscard(receipt);
  if (
    result.status !== "BLOCKED" ||
    receipt.status !== "PASS" ||
    receipt.resultDigest !== canonicalDigest(result)
  ) {
    throw new Error("attempt-001 sealed semantics changed");
  }
  return Object.freeze({ result, receipt });
}

export function verifyAttempt001Seals() {
  return validateAttempt001SealedBytes(
    readBoundedRegularFile(
      ATTEMPT_001_PATHS.result,
      ROOT,
      1048576,
      "attempt-001 operational result read",
    ),
    readBoundedRegularFile(
      ATTEMPT_001_PATHS.receipt,
      ROOT,
      1048576,
      "attempt-001 operational receipt read",
    ),
  );
}

function productTreeDigest() {
  const listing = execFileSync(
    "git",
    ["ls-tree", "-r", PRODUCT_SOURCE_COMMIT, "--", "apps/web", "packages/shared"],
    { cwd: ROOT },
  );
  return digest(listing);
}

export function harnessTreeDigest(commit) {
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error("harness commit is invalid");
  return canonicalDigest(canonicalCommitInventory(commit, FROZEN_HARNESS_FILES));
}

export function deriveAttempt002AuthorityRecord(...args) {
  if (args.length) throw new Error("authority derivation does not accept caller-supplied commits");
  const harnessSourceCommit = git(["rev-parse", "HEAD"]);
  const status = git(["status", "--porcelain", "--", ...FROZEN_HARNESS_FILES]);
  if (status) throw new Error("authority derivation requires a clean frozen harness checkout H");
  verifyAttempt001Seals();
  const toolManifest = readJson(ATTEMPT_002_SOURCE_TOOL_MANIFEST);
  validateAttempt002ToolManifest(toolManifest);
  return validateAttempt002Authority({
    schema: PREFLIGHT_SCHEMAS.attemptAuthority,
    creditable: false,
    evidenceStatus: "NON_EVIDENCE",
    attemptId: "attempt-002-observer",
    ordinal: 2,
    mode: "DISCARDED_SYNTHETIC_OBSERVER",
    productSourceCommit: PRODUCT_SOURCE_COMMIT,
    productTreeDigest: productTreeDigest(),
    harnessSourceCommit,
    harnessTreeDigest: harnessTreeDigest(harnessSourceCommit),
    infrastructurePlanDigest: fileDigest(INFRASTRUCTURE_PLAN_PATH),
    observationPlanDigest: discardedPreflightPlanDigest(createDiscardedPreflightPlan()),
    toolManifestDigest: fileDigest(ATTEMPT_002_SOURCE_TOOL_MANIFEST),
    predecessorResultFileSha256: ATTEMPT_001_SEALS.result,
    predecessorReceiptFileSha256: ATTEMPT_001_SEALS.receipt,
    predecessorStatus: "BLOCKED",
    requiredCheckCount: 144,
    rawPolicy: "DISCARD_AFTER_VALIDATED_RESULT",
  });
}

export function verifyAttempt002AuthorityCheckout() {
  const authority = validateAttempt002Authority(readJson(AUTHORITY_SOURCE_PATH));
  const { authorityCommit, harnessCommit } = validateAuthorityOnlyCheckout();
  if (harnessCommit !== authority.harnessSourceCommit) {
    throw new Error("authority checkout is not the direct child of the frozen harness commit H");
  }
  execFileSync("git", ["diff", "--quiet", harnessCommit, "--", ...FROZEN_HARNESS_FILES], {
    cwd: ROOT,
  });
  const untracked = git([
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    ...FROZEN_HARNESS_FILES,
  ]);
  if (untracked) throw new Error("untracked frozen-source drift blocks attempt-002");
  const expected = {
    productTreeDigest: productTreeDigest(),
    harnessTreeDigest: harnessTreeDigest(harnessCommit),
    infrastructurePlanDigest: fileDigest(INFRASTRUCTURE_PLAN_PATH),
    observationPlanDigest: discardedPreflightPlanDigest(createDiscardedPreflightPlan()),
    toolManifestDigest: fileDigest(ATTEMPT_002_SOURCE_TOOL_MANIFEST),
  };
  for (const [field, value] of Object.entries(expected)) {
    if (authority[field] !== value)
      throw new Error(`authority-v3 ${field} does not match frozen bytes`);
  }
  verifyAttempt001Seals();
  const toolManifest = readJson(ATTEMPT_002_SOURCE_TOOL_MANIFEST);
  validateAttempt002ToolManifest(toolManifest);
  return Object.freeze({
    authority,
    authorityCommit,
    harnessCommit,
    digest: canonicalDigest(authority),
    toolManifest,
  });
}

export function validateAuthorityOnlyCheckout(
  repositoryRoot = ROOT,
  authorityRelative = AUTHORITY_SOURCE_RELATIVE,
) {
  const run = (args) => execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();
  const parentLine = run(["rev-list", "--parents", "-n", "1", "HEAD"]).split(/\s+/u);
  if (parentLine.length !== 2) {
    throw new Error("A2 must be an exact single-parent authority-only commit");
  }
  const [authorityCommit, harnessCommit] = parentLine;
  const authorityChanges = run([
    "diff-tree",
    "--no-commit-id",
    "--name-only",
    "-r",
    harnessCommit,
    authorityCommit,
  ])
    .split(/\r?\n/u)
    .filter(Boolean);
  if (JSON.stringify(authorityChanges) !== JSON.stringify([authorityRelative])) {
    throw new Error("A2 is not an authority-only direct child commit");
  }
  if (run(["status", "--porcelain"])) {
    throw new Error("attempt-002 requires a clean A2 checkout");
  }
  return Object.freeze({ authorityCommit, harnessCommit });
}

export function createAttempt002Authority(...args) {
  if (args.length)
    throw new Error("attempt authority does not accept caller-supplied IDs or paths");
  return verifyAttempt002AuthorityCheckout();
}

export function resolveAttempt002State() {
  const records = readAttempt002Lifecycle();
  if (!records.length) {
    return existsSync(ATTEMPT_002_PATHS.root) ||
      existsSync(ATTEMPT_002_PATHS.build) ||
      existsSync(ATTEMPT_002_PATHS.buildOwnership)
      ? "INVALID"
      : "NOT_STARTED";
  }
  let state;
  try {
    state = validateAttempt002Lifecycle(records).state;
  } catch {
    return "INVALID";
  }
  const rootExists = existsSync(ATTEMPT_002_PATHS.root);
  if (rootExists) {
    const root = lstatSync(ATTEMPT_002_PATHS.root);
    if (root.isSymbolicLink() || !root.isDirectory()) return "INVALID";
    const allowed = new Set(
      Object.entries(ATTEMPT_002_PATHS)
        .filter(([key]) => !new Set(["root", "authoritySource", "build", "lifecycle"]).has(key))
        .map(([, path]) => path.split(/[\\/]/u).at(-1)),
    );
    if (readdirSync(ATTEMPT_002_PATHS.root).some((name) => !allowed.has(name))) return "INVALID";
  }
  const present = (key) => existsSync(ATTEMPT_002_PATHS[key]);
  if (state === "BUILDING") return !rootExists ? state : "INVALID";
  if (state === "BUILD_READY")
    return !rootExists &&
      existsSync(resolve(ATTEMPT_002_PATHS.build, "BUILD_ID")) &&
      present("buildReady")
      ? state
      : "INVALID";
  if (new Set(["PREPARING", "PREPARED", "OBSERVING"]).has(state))
    return rootExists ? state : "INVALID";
  if (state === "SERVER_READY") return rootExists && present("serverReady") ? state : "INVALID";
  if (state === "DRIVER_READY")
    return rootExists && present("serverReady") && present("driverReady") ? state : "INVALID";
  if (state === "NVDA_READY")
    return rootExists && present("serverReady") && present("driverReady") && present("nvdaReady")
      ? state
      : "INVALID";
  if (state === "OBSERVED") return rootExists && present("aggregate") ? state : "INVALID";
  if (state === "RESULT_RECORDED") return rootExists && present("result") ? state : "INVALID";
  if (state === "CLEANING") return rootExists && present("result") ? state : "INVALID";
  if (state === "FAILED_HELD")
    return (rootExists && present("failedHeld")) || (!rootExists && present("buildFailedHeld"))
      ? state
      : "INVALID";
  if (state === "BUILD_ABORTED") {
    try {
      validateFixedBuildAbortClosure();
      return state;
    } catch {
      return "INVALID";
    }
  }
  if (state === "SEALED") {
    return rootExists &&
      present("result") &&
      present("receipt") &&
      !present("raw") &&
      !present("build")
      ? state
      : "INVALID";
  }
  return "INVALID";
}

export const preflightAttemptsTesting = Object.freeze({
  AUTHORITY_KEYS,
  AUTHORITY_SOURCE_RELATIVE,
  canonicalCommitInventory,
  canonicalDigest,
  productTreeDigest,
});
