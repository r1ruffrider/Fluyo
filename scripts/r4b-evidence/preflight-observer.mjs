import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  NVDA_EXPECTED_SHA256,
  NVDA_EXPECTED_SIGNATURE_METHOD,
  NVDA_EXPECTED_SIGNER_SUBJECT,
  NVDA_EXPECTED_SIGNER_THUMBPRINT,
  NVDA_EXPECTED_SOURCE_URL,
  validateAttempt002ToolManifest,
} from "./preflight-contracts.mjs";
import {
  ATTEMPT_002_PATHS,
  attempt002PreparationReceiptDigest,
  createAttempt002Authority,
  currentAttempt002LifecycleState,
  currentAttempt002PreparedReceiptDigest,
  recordAttempt002DriverReady,
  recordAttempt002FailedHeld,
  recordAttempt002NvdaReady,
  recordAttempt002Observed,
  recordAttempt002Observing,
  recordAttempt002Prepared,
  recordAttempt002Preparing,
  recordAttempt002ServerReady,
  readAttempt002PreparationReceipt,
  resolveAttempt002State,
  validateAttempt002PreparationReceipt,
  validateAttempt002ReadinessReceipt,
} from "./preflight-attempts.mjs";
import {
  inventoryExactOwnedTree,
  validateSyntheticObservationAggregate,
} from "./preflight-executor.mjs";
import {
  NVDA_ADAPTER_PATHS,
  createNvdaCloseControl,
  createNvdaControl,
  createNvdaLifecycle,
  installHashBoundScratchpad,
  validateNvdaReadyPayload,
} from "./nvda-adapter/index.mjs";
import {
  createNvdaExpectedSpeechContract,
  readValidatedNvdaPreSpeechRequestStreams,
} from "./nvda-adapter/protocol.mjs";
import {
  PREFLIGHT_ARTIFACT_IDS,
  createDiscardedPreflightPlan,
  discardedPreflightPlanDigest,
} from "./preflight-plan.mjs";
import { diffPng } from "./preflight-png.mjs";
import {
  createFixedDirectory,
  readBoundedRegularFile,
  writeFixedRegularFile,
} from "./fixed-root-guard.mjs";
import { enumerateAcceptedTransitionIdentities } from "./transition.mjs";
import {
  allocateInternalLoopbackPort,
  assertIpv4LoopbackUrl,
  assertNoOwnedProcessesOrSockets,
  assertWindowsStandardUser,
  appendImmutableOwnershipRole,
  boundedJsonRequest,
  captureRegisteredOwnedExitSet,
  createExecutableIdentity,
  createImmutableOwnershipRegistry,
  createWriteOnceOwnership,
  inspectWindowsProcessSocketSnapshot,
  proveRegisteredOwnedProcessSetAbsent,
  terminateRegisteredOwnedChild,
  validateImmutableOwnershipRegistry,
  validateOwnedProcessSnapshot,
  validatePerformanceNetworkLog,
  withBoundedTimeout,
} from "./preflight-process-owner.mjs";
import {
  scanProductionSourceTrees,
  validateHarnessInertness,
  validateHarnessProductionBuildProof,
  validateRepositoryDeploymentExclusion,
} from "./production-exclusion.mjs";
import { recoverNativeFailure, spawnNativeNvdaBoundary } from "./windows-native-client.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const RUNTIME = ATTEMPT_002_PATHS.root;
const RAW = ATTEMPT_002_PATHS.raw;
const MANIFEST = ATTEMPT_002_PATHS.toolManifest;
const AGGREGATE = ATTEMPT_002_PATHS.aggregate;
const CHROME = resolve(ROOT, ".r4b-preflight/tools/chrome-win64/chrome.exe");
const DRIVER = resolve(ROOT, ".r4b-preflight/tools/chromedriver-win64/chromedriver.exe");
const DEFENDER = "C:\\Program Files\\Windows Defender\\MpCmdRun.exe";
const NEXT_CLI = fileURLToPath(import.meta.resolve("next/dist/bin/next"));
const HARNESS = resolve(ROOT, "apps/r4b-preflight-harness");
const HARNESS_BUILD = ATTEMPT_002_PATHS.build;
const GLOBAL_ATTEMPT_TIMEOUT_MS = 3_600_000;
let activeAttemptSignal;
const OBSERVATION_TRANSACTION_BOUNDARIES = Object.freeze([
  "PREPARING_RECORDED",
  "ATTEMPT_ROOT_CREATED",
  "AUTHORITY_COPIED",
  "MANIFEST_COPIED",
  "RAW_ROOT_CREATED",
  "PREPARED_RECORDED",
  "OBSERVING_RECORDED",
  "WEB_SPAWNED",
  "WEB_REGISTERED",
  "SERVER_READY_RECORDED",
  "DRIVER_SPAWNED",
  "DRIVER_REGISTERED",
  "DRIVER_READY_RECORDED",
  "NVDA_REGISTERED",
  "NVDA_READY_RECORDED",
]);

function ensureAttemptParent(path) {
  createFixedDirectory(dirname(path), ROOT, {
    recursive: true,
    label: "attempt-002 observer parent",
  });
}

function guardedAttemptMkdir(path, options = {}) {
  createFixedDirectory(path, ROOT, {
    recursive: options.recursive ?? false,
    label: "attempt-002 observer directory",
  });
}

function guardedAttemptWrite(path, bytes, options) {
  ensureAttemptParent(path);
  writeFixedRegularFile(path, ROOT, bytes, {
    ...options,
    label: "attempt-002 observer write",
  });
}

export function validateObservationTransactionTrace(events) {
  if (!Array.isArray(events) || events.length < 1) {
    throw new Error("observation transaction trace is empty");
  }
  const failureIndex = events.indexOf("FAILED_HELD");
  const active = failureIndex < 0 ? events : events.slice(0, failureIndex);
  if (
    active.some((event, index) => event !== OBSERVATION_TRANSACTION_BOUNDARIES[index]) ||
    active.length > OBSERVATION_TRANSACTION_BOUNDARIES.length
  ) {
    throw new Error("observation transaction skipped or reordered a closed boundary");
  }
  if (failureIndex >= 0) {
    if (failureIndex === 0 || events.length !== failureIndex + 1) {
      throw new Error("observation failure trace is not a closed FAILED_HELD suffix");
    }
    return Object.freeze({ status: "FAILED_HELD", boundary: active.at(-1) });
  }
  if (active.length !== OBSERVATION_TRANSACTION_BOUNDARIES.length) {
    throw new Error("successful observation transaction readiness trace is incomplete");
  }
  return Object.freeze({ status: "NVDA_READY", boundary: active.at(-1) });
}

function assertAttemptActive() {
  if (activeAttemptSignal?.aborted) throw activeAttemptSignal.reason;
}

const VIEWPORTS = Object.freeze({
  phone_320x568: [320, 568],
  reference_390x844: [390, 844],
  phone_430x932: [430, 932],
  compact_landscape_844x390: [844, 390],
  tablet_768x1024: [768, 1024],
  desktop_1200x900: [1200, 900],
});

export function fixturePresentation(cell) {
  const simple = {
    PREPARING: "preparing",
    ACTIVE: "active",
    SUBMITTING: "submitting",
    STALE_CONTENT: "stale-content",
    SESSION_ENDED: "session-ended",
    ACCESS_BLOCKED: "access-blocked",
    EMPTY_REVIEW: "empty-review",
  };
  if (simple[cell.stateId]) return simple[cell.stateId];
  if (cell.stateId === "CONFIRMED") return cell.variantId.replaceAll("_", "-");
  if (cell.stateId === "RETRYABLE_ERROR")
    return cell.variantId.endsWith("prepare") ? "retryable-prepare" : "retryable-submit";
  if (cell.stateId === "OFFLINE_READ_ONLY")
    return cell.variantId.endsWith("prepare") ? "offline-prepare" : "offline-active";
  throw new Error(`no fixture presentation for ${cell.stateId}`);
}

export function assertProductionFixtureBoundaryEligible() {
  const page = readFileSync(resolve(HARNESS, "app/page.tsx"), "utf8");
  const source = readFileSync(resolve(HARNESS, "source-contract.tsx"), "utf8");
  const config = readFileSync(resolve(HARNESS, "next.config.ts"), "utf8");
  if (
    /use server|\bfetch\s*\(|\bWebSocket\b/u.test(`${page}\n${source}`) ||
    !source.includes("ConversationCanvas") ||
    !source.includes("conversationCanvasScenario") ||
    !/Object\.freeze\(\s*\[\s*"breakCase",\s*"fixture",\s*"locale",\s*"transition",?\s*\]\s*as const\s*\)/u.test(
      source,
    ) ||
    !/distDir:\s*["']\.next-attempt-002["']/u.test(config)
  ) {
    throw new Error("attempt-002 isolated harness is not inert or bound to .next-attempt-002");
  }
}

function sha256(path) {
  return createHash("sha256")
    .update(readBoundedRegularFile(path, ROOT, 512 * 1024 * 1024, "observer bounded digest"))
    .digest("hex");
}
function directExecutableSha256(path) {
  const absolutePath = resolve(path);
  let stats;
  try {
    stats = lstatSync(absolutePath);
  } catch {
    throw new Error("spawn registration executable bytes are unreadable");
  }
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.size <= 0 ||
    stats.size > 512 * 1024 * 1024
  ) {
    throw new Error("spawn registration executable is not a bounded direct regular file");
  }
  try {
    return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
  } catch {
    throw new Error("spawn registration executable bytes are unreadable");
  }
}
function valueDigest(value) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}
export function canonicalPreparationClosureDigest(
  role,
  identityDigest,
  capturedSetDigest,
  absenceStatus,
) {
  if (
    !new Set(["nvda-installer", "defender-scanner"]).has(role) ||
    !/^[0-9a-f]{64}$/u.test(identityDigest) ||
    !/^[0-9a-f]{64}$/u.test(capturedSetDigest) ||
    absenceStatus !== "PASS"
  ) {
    throw new Error("preparation closure identity, captured set, or absence status is malformed");
  }
  return valueDigest({ role, identityDigest, capturedSetDigest, absenceStatus });
}

export function validatePreparationManifestAuthorityBinding(
  authorityToolManifestDigest,
  copiedToolManifestDigest,
) {
  if (
    !/^[0-9a-f]{64}$/u.test(authorityToolManifestDigest) ||
    authorityToolManifestDigest !== copiedToolManifestDigest
  ) {
    throw new Error("copied attempt-002 manifest is not bound to immutable A2 authority");
  }
  return true;
}
export function reconstructObserverOwnership(
  priorOwnership,
  rootPids,
  allowedRoots,
  additionalExecutablePaths,
) {
  if (!Array.isArray(additionalExecutablePaths)) {
    throw new Error("observer executable reconstruction paths are malformed");
  }
  const identities = [...(priorOwnership?.allowedExecutableIdentities ?? [])];
  const folded = new Map(
    identities.map((identity) => [identity.absolutePath.toLowerCase(), identity]),
  );
  for (const absolutePath of additionalExecutablePaths) {
    const next = createExecutableIdentity(absolutePath);
    const existing = folded.get(next.absolutePath.toLowerCase());
    if (existing) {
      if (existing.absolutePath !== next.absolutePath || existing.sha256 !== next.sha256) {
        throw new Error("observer executable identity changed during ownership reconstruction");
      }
      continue;
    }
    identities.push(next);
    folded.set(next.absolutePath.toLowerCase(), next);
  }
  return createWriteOnceOwnership(rootPids, allowedRoots, identities);
}
function reconstructObserverOwnershipFromFrozenIdentities(
  priorOwnership,
  rootPids,
  allowedRoots,
  additionalExecutableIdentities,
) {
  if (!Array.isArray(additionalExecutableIdentities)) {
    throw new Error("observer frozen executable identities are malformed");
  }
  const identities = [
    ...(priorOwnership?.allowedExecutableIdentities ?? []),
    ...additionalExecutableIdentities,
  ];
  const folded = new Map();
  for (const identity of identities) {
    const current = createExecutableIdentity(identity.absolutePath);
    if (
      current.absolutePath !== identity.absolutePath ||
      current.sha256 !== identity.sha256 ||
      (folded.has(identity.absolutePath.toLowerCase()) &&
        folded.get(identity.absolutePath.toLowerCase()).absolutePath !== identity.absolutePath)
    ) {
      throw new Error("observer frozen executable identity changed before registration");
    }
    folded.set(identity.absolutePath.toLowerCase(), identity);
  }
  return createWriteOnceOwnership(rootPids, allowedRoots, [...folded.values()]);
}
function exactPhaseExecutableIdentities(ownership, absolutePaths) {
  if (!ownership || !Array.isArray(absolutePaths) || absolutePaths.length === 0) {
    throw new Error("observer phase executable identities are missing");
  }
  const selected = absolutePaths.map((absolutePath) => {
    const identity = ownership.allowedExecutableIdentities.find(
      (candidate) => candidate.absolutePath === absolutePath,
    );
    if (!identity) throw new Error("observer phase executable identity is not preserved");
    return identity;
  });
  return Object.freeze(selected);
}
function assertFrozenExecutableIdentityCurrent(identity, label) {
  const current = createExecutableIdentity(identity.absolutePath);
  if (current.absolutePath !== identity.absolutePath || current.sha256 !== identity.sha256) {
    throw new Error(`${label} executable identity changed before spawn`);
  }
  return identity;
}
function closedPathDigest(path) {
  return createHash("sha256").update(resolve(path).toLowerCase(), "utf8").digest("hex");
}
function safeEnvironment() {
  return Object.freeze({
    ComSpec: "C:\\Windows\\System32\\cmd.exe",
    SystemRoot: "C:\\Windows",
    WINDIR: "C:\\Windows",
    TEMP: RAW,
    TMP: RAW,
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_ENV: "production",
  });
}
async function waitFor(url, milliseconds = 30000) {
  assertIpv4LoopbackUrl(url);
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    try {
      const response = await withBoundedTimeout(
        (signal) => fetch(url, { signal, redirect: "error" }),
        2000,
        "loopback readiness probe",
        activeAttemptSignal,
      );
      if (response.ok) return;
    } catch {
      if (activeAttemptSignal?.aborted) throw activeAttemptSignal.reason;
    }
    await new Promise((accept) => setTimeout(accept, 250));
  }
  throw new Error(`loopback service did not become ready: ${new URL(url).pathname}`);
}

export function validateHarnessQueryProofResponses(responses) {
  if (!Array.isArray(responses) || responses.length !== 4) {
    throw new Error("harness query proof requires exactly four closed responses");
  }
  const expected = [
    ["valid-a", 200],
    ["valid-b", 200],
    ["malformed", 404],
    ["extra", 404],
  ];
  for (const [index, response] of responses.entries()) {
    if (
      response.kind !== expected[index][0] ||
      response.status !== expected[index][1] ||
      typeof response.body !== "string" ||
      Buffer.byteLength(response.body, "utf8") > 1_048_576
    ) {
      throw new Error("harness query proof status, order, or response bound changed");
    }
  }
  for (const response of responses.slice(0, 2)) {
    if (
      !response.body.includes("data-fixture-cell") ||
      !response.body.includes("data-r4b-inert-navigation-boundary")
    ) {
      throw new Error("valid harness query omitted the exact product or inert boundary marker");
    }
  }
  if (responses[0].body === responses[1].body) {
    throw new Error("two distinct valid harness cells rendered byte-identical responses");
  }
  return Object.freeze({ valid: 2, rejected: 2, status: "PASS" });
}

async function proveHarnessQueryBoundary(origin, plan) {
  const cells = [
    plan.visualCells[0],
    plan.visualCells.find((cell) => cell.stateId !== plan.visualCells[0].stateId),
  ];
  if (!cells[1]) throw new Error("closed plan lacks two distinct query-proof cells");
  const paths = [
    `/?breakCase=${cells[0].fixtureId}&fixture=${fixturePresentation(cells[0])}&locale=${cells[0].localeId}&transition=none`,
    `/?breakCase=${cells[1].fixtureId}&fixture=${fixturePresentation(cells[1])}&locale=${cells[1].localeId}&transition=none`,
    `/?fixture=${fixturePresentation(cells[0])}&locale=${cells[0].localeId}&transition=none`,
    `/?breakCase=${cells[0].fixtureId}&fixture=${fixturePresentation(cells[0])}&locale=${cells[0].localeId}&transition=none&extra=1`,
  ];
  const kinds = ["valid-a", "valid-b", "malformed", "extra"];
  const responses = [];
  for (let index = 0; index < paths.length; index += 1) {
    if (activeAttemptSignal?.aborted) throw activeAttemptSignal.reason;
    const response = await withBoundedTimeout(
      (signal) => fetch(`${origin}${paths[index]}`, { signal, redirect: "error" }),
      10_000,
      "harness query proof",
      activeAttemptSignal,
    );
    const body = await response.text();
    responses.push({ kind: kinds[index], status: response.status, body });
  }
  return validateHarnessQueryProofResponses(responses);
}
function boundedLog(child) {
  let output = "";
  for (const stream of [child.stdout, child.stderr])
    stream?.on("data", (chunk) => {
      output = `${output}${chunk}`.slice(-65536);
    });
  return () => output;
}

function syncAppendOnlyExecutableIdentities(phaseIdentities, nextIdentities) {
  for (const identity of nextIdentities) {
    const existing = phaseIdentities.find(
      (candidate) => candidate.absolutePath.toLowerCase() === identity.absolutePath.toLowerCase(),
    );
    if (
      existing &&
      (existing.absolutePath !== identity.absolutePath || existing.sha256 !== identity.sha256)
    ) {
      throw ownedProcessHold("lower ownership executable identity collided or changed");
    }
    if (!existing) phaseIdentities.push(identity);
  }
  return phaseIdentities;
}

function canonicalOwnedClosureGeneration(frozenClosure, phaseIdentities) {
  const sortedIdentities = [...phaseIdentities]
    .map((identity) => Object.freeze({ ...identity }))
    .sort((left, right) =>
      left.absolutePath < right.absolutePath ? -1 : left.absolutePath > right.absolutePath ? 1 : 0,
    );
  return Object.freeze({
    recordCount: frozenClosure.records.length,
    pidCount: frozenClosure.pids.length,
    socketCount: frozenClosure.sockets.length,
    identityCount: sortedIdentities.length,
    recordsDigest: valueDigest(frozenClosure.records),
    pidsDigest: valueDigest(frozenClosure.pids),
    socketsDigest: valueDigest(frozenClosure.sockets),
    identitiesDigest: valueDigest(sortedIdentities),
    closureDigest: valueDigest(frozenClosure),
  });
}

function assertMonotonicOwnedGeneration(previous, next) {
  if (
    previous.frozenClosure.rootPid !== next.frozenClosure.rootPid ||
    previous.frozenClosure.expectedRootIdentity.absolutePath !==
      next.frozenClosure.expectedRootIdentity.absolutePath ||
    previous.frozenClosure.expectedRootIdentity.sha256 !==
      next.frozenClosure.expectedRootIdentity.sha256 ||
    previous.frozenClosure.launchTimeMs !== next.frozenClosure.launchTimeMs ||
    previous.frozenClosure.records.some(
      (record) =>
        !next.frozenClosure.records.some((candidate) => sameProcessRecord(record, candidate)),
    ) ||
    previous.frozenClosure.sockets.some((socket) => !next.frozenClosure.sockets.includes(socket)) ||
    previous.executableIdentities.some(
      (identity) =>
        !next.executableIdentities.some(
          (candidate) =>
            candidate.absolutePath === identity.absolutePath &&
            candidate.sha256 === identity.sha256,
        ),
    )
  ) {
    throw ownedProcessHold("owned closure generation was not append-only");
  }
}

function closureExpanded(previous, next) {
  return (
    previous.generation.closureDigest !== next.generation.closureDigest ||
    previous.generation.identitiesDigest !== next.generation.identitiesDigest
  );
}

function ownedClosureExpanded() {
  const error = new Error("owned closure expanded during bounded absence proof");
  error.code = "OWNED_CLOSURE_EXPANDED";
  return error;
}

function ownedProofDeadline() {
  const error = new Error("owned absence proof exceeded its absolute deadline");
  error.code = "OWNED_PROOF_DEADLINE";
  return error;
}

export async function proveAbsenceFromFreshClosure({
  closure,
  phaseIdentities,
  inspect,
  proveAbsent,
  registry,
  role,
  timeoutMs = 5000,
  now = Date.now,
}) {
  if (
    !closure ||
    !Array.isArray(phaseIdentities) ||
    !phaseIdentities.length ||
    typeof inspect !== "function" ||
    typeof proveAbsent !== "function" ||
    !registry ||
    !role ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    typeof now !== "function"
  ) {
    throw new Error("fresh owned absence proof parameters are malformed");
  }
  const deadline = now() + timeoutMs;
  const reconcile = () => {
    const reconciled = reconcileOwnedClosureForTesting(closure, inspect());
    syncAppendOnlyExecutableIdentities(phaseIdentities, reconciled.executableIdentities);
    const frozenClosure = freezeSpawnClosure(closure);
    const executableIdentities = Object.freeze(
      [...phaseIdentities]
        .map((identity) => Object.freeze({ ...identity }))
        .sort((left, right) =>
          left.absolutePath < right.absolutePath
            ? -1
            : left.absolutePath > right.absolutePath
              ? 1
              : 0,
        ),
    );
    return Object.freeze({
      frozenClosure,
      executableIdentities,
      ownerView: capturedOwnerView(frozenClosure),
      filteredSnapshot: reconciled.filteredSnapshot,
      generation: canonicalOwnedClosureGeneration(frozenClosure, executableIdentities),
    });
  };
  while (true) {
    const epoch = reconcile();
    if (now() > deadline) throw ownedProofDeadline();
    const identityAwareInspector = () => {
      const current = reconcile();
      assertMonotonicOwnedGeneration(epoch, current);
      if (closureExpanded(epoch, current)) throw ownedClosureExpanded();
      if (now() > deadline) throw ownedProofDeadline();
      return current.filteredSnapshot;
    };
    let lowerError = null;
    const remainingMs = deadline - now();
    if (remainingMs <= 0) throw ownedProofDeadline();
    let lowerTimer;
    try {
      await Promise.race([
        Promise.resolve().then(() =>
          proveAbsent(
            identityAwareInspector,
            registry,
            role,
            epoch.ownerView,
            [],
            epoch.executableIdentities,
          ),
        ),
        new Promise((_, reject) => {
          lowerTimer = setTimeout(() => reject(ownedProofDeadline()), remainingMs);
        }),
      ]);
    } catch (error) {
      if (error?.code === "OWNED_CLOSURE_EXPANDED") {
        const expanded = Object.freeze({
          frozenClosure: freezeSpawnClosure(closure),
          executableIdentities: Object.freeze([...phaseIdentities]),
        });
        assertMonotonicOwnedGeneration(epoch, expanded);
        if (now() > deadline) throw ownedProofDeadline();
        continue;
      }
      if (error?.code === "OWNED_PROCESS_HOLD" || error?.code === "OWNED_PROOF_DEADLINE") {
        throw error;
      }
      lowerError = error;
    } finally {
      clearTimeout(lowerTimer);
    }

    // A lower success or stable error is accepted only after one more fresh
    // inspection. HOLD takes precedence; then the shared deadline; expansion
    // retries under that same deadline.
    const post = reconcile();
    assertMonotonicOwnedGeneration(epoch, post);
    if (now() > deadline) throw ownedProofDeadline();
    if (closureExpanded(epoch, post)) continue;
    if (lowerError) throw lowerError;
    return post;
  }
}

export async function waitForOwnedExitForTesting(
  child,
  label,
  timeoutMs,
  registry,
  role,
  allowedExecutableIdentities,
  registrationCapture,
  dependencies = {},
) {
  const inspect = dependencies.inspect ?? inspectWindowsProcessSocketSnapshot;
  const proveAbsent = dependencies.proveAbsent ?? proveRegisteredOwnedProcessSetAbsent;
  const terminateOwned = dependencies.terminateOwned ?? terminateRegisteredOwnedChild;
  const captureExitSet = dependencies.captureExitSet ?? captureRegisteredOwnedExitSet;
  const waitForExit =
    dependencies.waitForExit ??
    (() =>
      withBoundedTimeout(
        () =>
          new Promise((accept, reject) => {
            child.once("error", reject);
            child.once("exit", (code) => accept(code));
          }),
        timeoutMs,
        label,
        activeAttemptSignal,
      ));
  if (!child || !Number.isSafeInteger(child.pid) || child.pid <= 0) {
    throw new Error(`${label} did not create an exact owned process`);
  }
  if (
    !registry ||
    !role ||
    !Array.isArray(allowedExecutableIdentities) ||
    allowedExecutableIdentities.length === 0 ||
    !registrationCapture ||
    !Object.isFrozen(registrationCapture) ||
    JSON.stringify(Object.keys(registrationCapture)) !==
      JSON.stringify([
        "rootPid",
        "expectedRootIdentity",
        "launchTimeMs",
        "records",
        "pids",
        "sockets",
      ]) ||
    !Array.isArray(registrationCapture.records) ||
    !Object.isFrozen(registrationCapture.records) ||
    registrationCapture.records.length === 0 ||
    registrationCapture.records.some((record) => !Object.isFrozen(record)) ||
    registrationCapture.rootPid !== child.pid ||
    !Object.isFrozen(registrationCapture.expectedRootIdentity) ||
    JSON.stringify(Object.keys(registrationCapture.expectedRootIdentity)) !==
      JSON.stringify(["absolutePath", "sha256"]) ||
    !Number.isFinite(registrationCapture.launchTimeMs) ||
    !Array.isArray(registrationCapture.pids) ||
    !Object.isFrozen(registrationCapture.pids) ||
    !Array.isArray(registrationCapture.sockets) ||
    !Object.isFrozen(registrationCapture.sockets) ||
    !registrationCapture.pids.includes(child.pid)
  ) {
    throw new Error(`${label} requires exact phase identities and registration closure`);
  }
  const registrationRoot = registrationCapture.records.find(
    (registeredRecord) => registeredRecord.pid === child.pid,
  );
  const expectedRootIdentity = allowedExecutableIdentities.find(
    (identity) => resolve(identity.absolutePath) === registrationRoot?.executablePath,
  );
  const recordPids = registrationCapture.records
    .map(({ pid }) => pid)
    .sort((left, right) => left - right);
  if (
    !registrationRoot ||
    !expectedRootIdentity ||
    resolve(registrationCapture.expectedRootIdentity.absolutePath) !==
      registrationRoot.executablePath ||
    registrationCapture.expectedRootIdentity.sha256 !== registrationRoot.executableSha256 ||
    registrationRoot.executableSha256 !== expectedRootIdentity.sha256 ||
    registrationCapture.records.some(
      (registeredRecord) =>
        JSON.stringify(Object.keys(registeredRecord)) !==
          JSON.stringify([
            "pid",
            "parentPid",
            "creationTimeUtc",
            "executablePath",
            "executableSha256",
          ]) ||
        !Number.isSafeInteger(registeredRecord.pid) ||
        registeredRecord.pid <= 0 ||
        typeof registeredRecord.executablePath !== "string" ||
        !/^[0-9a-f]{64}$/u.test(registeredRecord.executableSha256 ?? "") ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(
          registeredRecord.creationTimeUtc,
        ) ||
        resolve(registeredRecord.executablePath) !== registeredRecord.executablePath,
    ) ||
    JSON.stringify(recordPids) !== JSON.stringify(registrationCapture.pids)
  ) {
    throw new Error(`${label} registration closure records changed or are incomplete`);
  }
  const tracked = createSpawnClosure(
    registrationCapture.rootPid,
    registrationCapture.expectedRootIdentity,
    registrationCapture.launchTimeMs,
  );
  for (const registeredRecord of registrationCapture.records) {
    tracked.records.set(registeredRecord.pid, registeredRecord);
  }
  for (const socket of registrationCapture.sockets) tracked.sockets.add(socket);
  const phaseIdentities = [...allowedExecutableIdentities];
  const identityInspect = () => {
    const reconciled = reconcileOwnedClosureForTesting(tracked, inspect());
    syncAppendOnlyExecutableIdentities(phaseIdentities, reconciled.executableIdentities);
    return reconciled.filteredSnapshot;
  };
  const initialSnapshot = identityInspect();
  const record = registry.find((entry) => entry.role === role && entry.pid === child.pid);
  if (!record) throw new Error(`${label} requires the exact registered process role`);
  const exitCapture = captureExitSet(
    initialSnapshot,
    registry,
    role,
    child.pid,
    [],
    phaseIdentities,
  );
  for (const socket of exitCapture.sockets) tracked.sockets.add(socket);
  const proveFresh = () =>
    proveAbsenceFromFreshClosure({
      closure: tracked,
      phaseIdentities,
      inspect,
      proveAbsent,
      registry,
      role,
      timeoutMs: dependencies.proofTimeoutMs ?? 5000,
      now: dependencies.proofNow ?? Date.now,
    });
  const result = (exitCode, proof) => {
    return Object.freeze({
      exitCode,
      // Receipt identity remains bound only to the originally approved root
      // executable identities. Descendants bind the lower proof and closure.
      identityDigest: valueDigest(allowedExecutableIdentities),
      capturedSetDigest: valueDigest(proof.frozenClosure),
      absenceStatus: "PASS",
    });
  };
  if (child.exitCode !== null) {
    const proof = await proveFresh();
    return result(child.exitCode, proof);
  }
  let exitCompleted = false;
  try {
    const exitCode = await waitForExit();
    exitCompleted = true;
    const proof = await proveFresh();
    return result(exitCode, proof);
  } catch (error) {
    if (error?.code === "OWNED_PROCESS_HOLD") throw error;
    if (exitCompleted) throw error;
    if (child.exitCode === null) {
      // Reconcile immediately before the one permitted lower termination path.
      identityInspect();
      const captured = freezeSpawnClosure(tracked);
      await terminateOwned(
        child,
        registry,
        role,
        identityInspect,
        [],
        phaseIdentities,
        capturedOwnerView(captured),
      );
    }
    await proveFresh();
    throw error;
  }
}

const waitForOwnedExit = waitForOwnedExitForTesting;

function capturedOwnerView(captured) {
  return Object.freeze({
    pids: Object.freeze([...captured.pids]),
    sockets: Object.freeze([...captured.sockets]),
  });
}

function assertNoPreexistingNvda(snapshot) {
  if (
    snapshot.processes.some(
      (entry) =>
        typeof entry.executablePath === "string" &&
        basename(entry.executablePath).toLowerCase() === "nvda.exe",
    )
  ) {
    throw new Error("preexisting NVDA process blocks attempt-002 single-writer ownership");
  }
}

function assertNoPreparationResidue(snapshot) {
  const installer = resolve(NVDA_ADAPTER_PATHS.installer).toLowerCase();
  const defender = resolve(DEFENDER).toLowerCase();
  const portable = `${resolve(NVDA_ADAPTER_PATHS.portable).toLowerCase()}\\`;
  const chrome = resolve(CHROME).toLowerCase();
  const driver = resolve(DRIVER).toLowerCase();
  const residue = snapshot.processes.filter((entry) => {
    const executablePath =
      typeof entry.executablePath === "string" ? resolve(entry.executablePath).toLowerCase() : "";
    return (
      executablePath === installer ||
      executablePath === defender ||
      executablePath.startsWith(portable) ||
      executablePath === chrome ||
      executablePath === driver
    );
  });
  if (residue.length) throw new Error("portable preparation process residue blocks progression");
}

export function validatePreparationProcessSnapshot(snapshot) {
  assertNoPreexistingNvda(snapshot);
  assertNoPreparationResidue(snapshot);
  return true;
}

function createSpawnClosure(rootPid, expectedRootIdentity, launchTimeMs, now = Date.now) {
  if (
    !Number.isSafeInteger(rootPid) ||
    rootPid <= 0 ||
    !expectedRootIdentity ||
    typeof expectedRootIdentity.absolutePath !== "string" ||
    !/^[0-9a-f]{64}$/u.test(expectedRootIdentity.sha256 ?? "") ||
    !Number.isFinite(launchTimeMs) ||
    typeof now !== "function"
  ) {
    throw new Error("spawn registration root launch identity is malformed");
  }
  return {
    rootPid,
    expectedRootIdentity: Object.freeze({ ...expectedRootIdentity }),
    launchTimeMs,
    now,
    allowedExecutableRoot: dirname(resolve(expectedRootIdentity.absolutePath)),
    records: new Map(),
    sockets: new Set(),
  };
}

function ownedProcessHold(message) {
  const error = new Error(`owned process HOLD: ${message}`);
  error.code = "OWNED_PROCESS_HOLD";
  return error;
}

function rawProcessShape(entry, label = "spawn registration process") {
  if (
    !entry ||
    !Number.isSafeInteger(entry.pid) ||
    entry.pid <= 0 ||
    !Number.isSafeInteger(entry.parentPid) ||
    entry.parentPid < 0 ||
    typeof entry.executablePath !== "string" ||
    !entry.executablePath ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(entry.creationTimeUtc)
  ) {
    throw ownedProcessHold(`${label} identity is malformed`);
  }
  return Object.freeze({
    pid: entry.pid,
    parentPid: entry.parentPid,
    creationTimeUtc: entry.creationTimeUtc,
    executablePath: resolve(entry.executablePath),
  });
}

function materializeProcessRecord(entry, label = "spawn registration process") {
  const raw = rawProcessShape(entry, label);
  let executableSha256;
  try {
    executableSha256 = directExecutableSha256(raw.executablePath);
  } catch {
    throw ownedProcessHold(`${label} executable bytes are unreadable`);
  }
  return Object.freeze({ ...raw, executableSha256 });
}

function sameProcessRecord(left, right) {
  return (
    left?.pid === right?.pid &&
    left?.creationTimeUtc === right?.creationTimeUtc &&
    left?.executablePath === right?.executablePath &&
    left?.executableSha256 === right?.executableSha256
  );
}

function rootRecordMatchesLaunch(closure, record) {
  const created = Date.parse(record.creationTimeUtc);
  return (
    record.pid === closure.rootPid &&
    record.executablePath === resolve(closure.expectedRootIdentity.absolutePath) &&
    record.executableSha256 === closure.expectedRootIdentity.sha256 &&
    Number.isFinite(created) &&
    created >= closure.launchTimeMs - 2000 &&
    created <= closure.now() + 2000
  );
}

function rawProcessIndex(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.processes) || !Array.isArray(snapshot.sockets)) {
    throw ownedProcessHold("process/socket snapshot is malformed");
  }
  const byPid = new Map();
  for (const entry of snapshot.processes) {
    // Machine-wide indexing is byte-blind. Unrelated protected/malformed rows
    // remain outside the owned trust set and are never hashed.
    if (!Number.isSafeInteger(entry?.pid) || entry.pid <= 0) continue;
    const bucket = byPid.get(entry.pid) ?? [];
    bucket.push(entry);
    byPid.set(entry.pid, bucket);
  }
  return byPid;
}

function selectedRawProcess(byPid, pid, label) {
  const bucket = byPid.get(pid) ?? [];
  if (bucket.length > 1) throw ownedProcessHold(`${label} has an ambiguous duplicate PID`);
  return bucket[0] ?? null;
}

function classifyCapturedRawProcess(capturedRecord, byPid, label) {
  const entry = selectedRawProcess(byPid, capturedRecord.pid, label);
  if (!entry) return Object.freeze({ status: "ABSENT", raw: null, record: null });
  const raw = rawProcessShape(entry, label);
  if (
    raw.creationTimeUtc !== capturedRecord.creationTimeUtc ||
    raw.executablePath !== capturedRecord.executablePath
  ) {
    // Changed creation/path means PID reuse. It is absent without a byte read.
    return Object.freeze({ status: "REUSED", raw, record: null });
  }
  const current = materializeProcessRecord(entry, label);
  if (current.executableSha256 !== capturedRecord.executableSha256) {
    throw ownedProcessHold(`${label} executable bytes changed after capture`);
  }
  return Object.freeze({ status: "EXACT", raw, record: capturedRecord });
}

function withinFrozenExecutableRoot(closure, absolutePath) {
  const foldedRoot = closure.allowedExecutableRoot.toLowerCase();
  const foldedPath = resolve(absolutePath).toLowerCase();
  return foldedPath === foldedRoot || foldedPath.startsWith(`${foldedRoot}${sep}`);
}

function appendExecutableIdentity(identities, record) {
  const key = record.executablePath.toLowerCase();
  const existing = identities.get(key);
  if (
    existing &&
    (existing.absolutePath !== record.executablePath || existing.sha256 !== record.executableSha256)
  ) {
    throw ownedProcessHold("owned executable identity collided or changed");
  }
  if (!existing) {
    identities.set(
      key,
      Object.freeze({
        absolutePath: record.executablePath,
        sha256: record.executableSha256,
      }),
    );
  }
}

function freezeSpawnClosure(closure) {
  return Object.freeze({
    rootPid: closure.rootPid,
    expectedRootIdentity: Object.freeze({ ...closure.expectedRootIdentity }),
    launchTimeMs: closure.launchTimeMs,
    records: Object.freeze(
      [...closure.records.values()]
        .sort((left, right) => left.pid - right.pid)
        .map((record) => Object.freeze({ ...record })),
    ),
    pids: Object.freeze([...closure.records.keys()].sort((a, b) => a - b)),
    sockets: Object.freeze([...closure.sockets].sort()),
  });
}

export function reconcileOwnedClosureForTesting(closure, snapshot) {
  const byPid = rawProcessIndex(snapshot);
  const currentExactRecords = new Map();
  const priorRoot = closure.records.get(closure.rootPid);
  if (priorRoot) {
    const classification = classifyCapturedRawProcess(priorRoot, byPid, "captured owned root");
    if (classification.status === "EXACT") currentExactRecords.set(priorRoot.pid, priorRoot);
  } else {
    const rootEntry = selectedRawProcess(byPid, closure.rootPid, "spawn registration root");
    if (rootEntry) {
      const rootShape = rawProcessShape(rootEntry, "spawn registration root");
      const created = Date.parse(rootShape.creationTimeUtc);
      if (
        rootShape.executablePath === resolve(closure.expectedRootIdentity.absolutePath) &&
        Number.isFinite(created) &&
        created >= closure.launchTimeMs - 2000 &&
        created <= closure.now() + 2000
      ) {
        const root = materializeProcessRecord(rootEntry, "spawn registration root");
        if (!rootRecordMatchesLaunch(closure, root)) {
          throw ownedProcessHold("spawn registration root executable identity changed");
        }
        closure.records.set(root.pid, root);
        currentExactRecords.set(root.pid, root);
      }
    }
  }

  for (const record of closure.records.values()) {
    if (currentExactRecords.has(record.pid)) continue;
    const classification = classifyCapturedRawProcess(record, byPid, "captured owned process");
    if (classification.status === "EXACT") currentExactRecords.set(record.pid, record);
  }

  // BFS expansion requires the parent to be EXACT in this same snapshot. A
  // captured exact process may survive reparenting, but an absent/reused parent
  // cannot confer ownership on a newly observed PID.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [pid, bucket] of byPid) {
      if (closure.records.has(pid)) continue;
      const candidate = bucket[0];
      if (
        !Number.isSafeInteger(candidate?.parentPid) ||
        candidate.parentPid < 0 ||
        !currentExactRecords.has(candidate.parentPid)
      ) {
        continue;
      }
      const selected = selectedRawProcess(byPid, pid, "spawn registration descendant");
      const shape = rawProcessShape(selected, "spawn registration descendant");
      if (!withinFrozenExecutableRoot(closure, shape.executablePath)) {
        throw ownedProcessHold("owned descendant executable escaped the frozen allowed root");
      }
      const record = materializeProcessRecord(selected, "spawn registration descendant");
      closure.records.set(record.pid, record);
      currentExactRecords.set(record.pid, record);
      changed = true;
    }
  }

  for (const socket of snapshot.sockets) {
    if (currentExactRecords.has(socket?.pid)) closure.sockets.add(JSON.stringify(socket));
  }
  const identities = new Map();
  appendExecutableIdentity(identities, {
    executablePath: resolve(closure.expectedRootIdentity.absolutePath),
    executableSha256: closure.expectedRootIdentity.sha256,
  });
  for (const record of closure.records.values()) appendExecutableIdentity(identities, record);
  const frozenClosure = freezeSpawnClosure(closure);
  const livePids = new Set(currentExactRecords.keys());
  const filteredSnapshot = Object.freeze({
    processes: Object.freeze(
      snapshot.processes.filter(
        (entry) => livePids.has(entry?.pid) && byPid.get(entry.pid)?.length === 1,
      ),
    ),
    sockets: Object.freeze(snapshot.sockets.filter((socket) => livePids.has(socket?.pid))),
  });
  return Object.freeze({
    frozenClosure,
    currentExactRecords: Object.freeze(
      [...currentExactRecords.values()]
        .sort((left, right) => left.pid - right.pid)
        .map((record) => Object.freeze({ ...record })),
    ),
    ownerView: capturedOwnerView(frozenClosure),
    executableIdentities: Object.freeze([...identities.values()]),
    filteredSnapshot,
  });
}

export async function proveFailedSpawnRegistrationAbsent(
  child,
  inspect = inspectWindowsProcessSocketSnapshot,
  seed = null,
  terminatePid = (pid) => process.kill(pid, "SIGKILL"),
) {
  if (
    !child ||
    !Number.isSafeInteger(child.pid) ||
    child.pid <= 0 ||
    typeof inspect !== "function" ||
    typeof terminatePid !== "function"
  ) {
    throw new Error("failed spawn registration cleanup requires an exact child and inspector");
  }
  if (
    !seed ||
    !Object.isFrozen(seed) ||
    JSON.stringify(Object.keys(seed)) !==
      JSON.stringify([
        "rootPid",
        "expectedRootIdentity",
        "launchTimeMs",
        "records",
        "pids",
        "sockets",
      ]) ||
    seed.rootPid !== child.pid ||
    !Object.isFrozen(seed.expectedRootIdentity) ||
    JSON.stringify(Object.keys(seed.expectedRootIdentity)) !==
      JSON.stringify(["absolutePath", "sha256"]) ||
    !Number.isFinite(seed.launchTimeMs) ||
    !Array.isArray(seed.records) ||
    !Object.isFrozen(seed.records) ||
    seed.records.some((record) => !Object.isFrozen(record)) ||
    !Array.isArray(seed.pids) ||
    !Object.isFrozen(seed.pids) ||
    JSON.stringify(seed.records.map(({ pid }) => pid).sort((left, right) => left - right)) !==
      JSON.stringify(seed.pids) ||
    !Array.isArray(seed.sockets) ||
    !Object.isFrozen(seed.sockets)
  ) {
    throw new Error("failed spawn registration cleanup requires an immutable launch closure");
  }
  const captured = createSpawnClosure(child.pid, seed.expectedRootIdentity, seed.launchTimeMs);
  for (const record of seed.records) captured.records.set(record.pid, record);
  for (const socket of seed.sockets) captured.sockets.add(socket);
  const terminateCapturedRecords = (records) => {
    for (const record of [...records].sort((left, right) => right.pid - left.pid)) {
      try {
        terminatePid(record.pid);
      } catch (error) {
        if (error?.code !== "ESRCH") throw error;
      }
    }
  };
  let consecutiveAbsent = 0;
  const deadline = Date.now() + 5000;
  while (Date.now() <= deadline) {
    const snapshot = inspect();
    const reconciled = reconcileOwnedClosureForTesting(captured, snapshot);
    const liveRecords = reconciled.currentExactRecords;
    terminateCapturedRecords(liveRecords);
    const livePid = liveRecords.length > 0;
    const liveSocket = snapshot.sockets.some(
      (socket) =>
        liveRecords.some((record) => record.pid === socket.pid) ||
        captured.sockets.has(JSON.stringify(socket)),
    );
    if (!livePid && !liveSocket) {
      consecutiveAbsent += 1;
      if (consecutiveAbsent === 2) return freezeSpawnClosure(captured);
    } else {
      consecutiveAbsent = 0;
    }
    await new Promise((accept) => setTimeout(accept, 50));
  }
  throw new Error("failed spawn registration left a captured process or socket");
}

export async function spawnAndRegisterPreparationProcessForTesting(
  executable,
  args,
  options,
  descriptor,
  identities,
  dependencies = {},
) {
  const spawnProcess = dependencies.spawnProcess ?? spawn;
  const inspect = dependencies.inspect ?? inspectWindowsProcessSocketSnapshot;
  const waitForRegistration = dependencies.waitForRegistration ?? waitForRoleRegistration;
  const terminatePid = dependencies.terminatePid ?? ((pid) => process.kill(pid, "SIGKILL"));
  const now = dependencies.now ?? Date.now;
  assertFrozenExecutableIdentityCurrent(identities[0], `${descriptor.role} pre-spawn`);
  const launchTimeMs = now();
  const child = spawnProcess(executable, args, options);
  const closure = createSpawnClosure(child.pid, identities[0], launchTimeMs, now);
  const phaseIdentities = [...identities];
  const reconcile = (snapshot) => {
    const result = reconcileOwnedClosureForTesting(closure, snapshot);
    for (const identity of result.executableIdentities) {
      const existing = phaseIdentities.find(
        (candidate) => candidate.absolutePath.toLowerCase() === identity.absolutePath.toLowerCase(),
      );
      if (
        existing &&
        (existing.absolutePath !== identity.absolutePath || existing.sha256 !== identity.sha256)
      ) {
        throw ownedProcessHold("registration executable identity collided or changed");
      }
      if (!existing) phaseIdentities.push(identity);
    }
    return result;
  };
  try {
    reconcile(inspect());
    if (!closure.records.has(child.pid)) {
      throw new Error("spawn registration root did not match launch identity");
    }
    const registry = await waitForRegistration(
      null,
      { ...descriptor, pid: child.pid },
      phaseIdentities,
      (snapshot) => reconcile(snapshot),
    );
    const registrationCapture = freezeSpawnClosure(closure);
    if (!registrationCapture.records.some((record) => record.pid === child.pid)) {
      throw new Error("spawn registration capture omitted the exact root record");
    }
    return Object.freeze({
      child,
      registry,
      registrationCapture,
      executableIdentities: Object.freeze([...phaseIdentities]),
    });
  } catch (error) {
    await proveFailedSpawnRegistrationAbsent(
      child,
      inspect,
      freezeSpawnClosure(closure),
      terminatePid,
    );
    throw error;
  }
}

const spawnAndRegisterPreparationProcess = spawnAndRegisterPreparationProcessForTesting;

async function waitForNvdaReady(child, control) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (activeAttemptSignal?.aborted) throw activeAttemptSignal.reason;
    try {
      return validateNvdaReadyPayload(child.readReady(), control);
    } catch {}
    await new Promise((accept) => setTimeout(accept, 50));
  }
  throw new Error("NVDA scratchpad ready handshake timed out");
}

async function waitForNvdaObservation(
  child,
  expectedObservationIds,
  expectedSpeechContracts,
  currentIndex,
) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (activeAttemptSignal?.aborted) throw activeAttemptSignal.reason;
    try {
      const summaries = await readValidatedNvdaPreSpeechRequestStreams(child.readTranscript(), {
        expectedObservationIds,
        expectedSpeechContracts,
        timeoutMs: 1000,
      });
      if (summaries[currentIndex]?.eventCount > 0) return summaries[currentIndex];
    } catch (error) {
      if (!/ENOENT|expected accessible name|expected state content/u.test(String(error))) {
        throw error;
      }
    }
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error("NVDA produced no bounded synthetic announcement for the active observation");
}

function validateNvdaManifestForPreparation(manifest) {
  assertAttemptActive();
  validateAttempt002ToolManifest(manifest);
  const tool = manifest.tools.find((entry) => entry.toolId === "nvda");
  if (!tool || !["ELIGIBLE", "LAUNCHED"].includes(tool.launchStatus)) {
    throw new Error("NVDA is not preparation eligible");
  }
  const installerSha256 = sha256(NVDA_ADAPTER_PATHS.installer);
  if (
    tool.sourceUrl !== NVDA_EXPECTED_SOURCE_URL ||
    tool.expectedSha256 !== NVDA_EXPECTED_SHA256 ||
    installerSha256 !== NVDA_EXPECTED_SHA256 ||
    tool.observedSha256 !== installerSha256 ||
    tool.signatureMethod !== NVDA_EXPECTED_SIGNATURE_METHOD ||
    tool.signatureStatus !== "VERIFIED" ||
    tool.signatureChainStatus !== "TRUSTED_VALID" ||
    tool.signatureObservedSha256 !== installerSha256 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(tool.signatureVerifiedUtc) ||
    tool.signerSubject !== NVDA_EXPECTED_SIGNER_SUBJECT ||
    tool.signerThumbprint !== NVDA_EXPECTED_SIGNER_THUMBPRINT
  ) {
    throw new Error("NVDA installer or prospective Authenticode observation changed before launch");
  }
  return tool;
}

function validatePreparedNvdaClosure(manifest, receipt) {
  validateNvdaManifestForPreparation(manifest);
  validateAttempt002PreparationReceipt(receipt);
  const attempt = createAttempt002Authority();
  validatePreparationManifestAuthorityBinding(
    attempt.authority.toolManifestDigest,
    sha256(ATTEMPT_002_PATHS.toolManifest),
  );
  const installerIdentity = createExecutableIdentity(NVDA_ADAPTER_PATHS.installer);
  const defenderIdentity = createExecutableIdentity(DEFENDER);
  const executable = resolve(NVDA_ADAPTER_PATHS.portable, "nvda.exe");
  if (!existsSync(executable)) throw new Error("NVDA portable executable is absent");
  const portableIdentity = createExecutableIdentity(executable);
  const portableInventory = inventoryExactOwnedTree(
    NVDA_ADAPTER_PATHS.portable,
    NVDA_ADAPTER_PATHS.portable,
  );
  const configInventory = inventoryExactOwnedTree(
    NVDA_ADAPTER_PATHS.config,
    NVDA_ADAPTER_PATHS.config,
  );
  if (
    receipt.authorityDigest !== attempt.digest ||
    receipt.toolManifestDigest !== attempt.authority.toolManifestDigest ||
    receipt.installerIdentityDigest !== valueDigest([installerIdentity]) ||
    receipt.defenderIdentityDigest !== valueDigest([defenderIdentity]) ||
    receipt.portableExecutableIdentityDigest !== valueDigest(portableIdentity) ||
    receipt.portableInventoryDigest !== portableInventory.digest ||
    receipt.configInventoryDigest !== configInventory.digest
  ) {
    throw new Error("attempt-002 prepared NVDA closure changed after preparation");
  }
  const snapshot = inspectWindowsProcessSocketSnapshot();
  validatePreparationProcessSnapshot(snapshot);
  return Object.freeze({ executable, portableIdentity, portableInventory, configInventory });
}

async function prepareNvdaPortable(manifest, authorityDigest, authorityToolManifestDigest) {
  validateNvdaManifestForPreparation(manifest);
  validatePreparationManifestAuthorityBinding(
    authorityToolManifestDigest,
    sha256(ATTEMPT_002_PATHS.toolManifest),
  );
  assertWindowsStandardUser();
  const initialSnapshot = inspectWindowsProcessSocketSnapshot();
  validatePreparationProcessSnapshot(initialSnapshot);
  const lifecycle = createNvdaLifecycle(resolve(NVDA_ADAPTER_PATHS.portable, "nvda.exe"));
  const installerIdentities = Object.freeze([
    createExecutableIdentity(NVDA_ADAPTER_PATHS.installer),
  ]);
  const installerSpawn = await spawnAndRegisterPreparationProcess(
    NVDA_ADAPTER_PATHS.installer,
    lifecycle.create,
    { cwd: RAW, env: safeEnvironment(), stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    {
      role: "nvda-installer",
      allowedRoot: dirname(NVDA_ADAPTER_PATHS.installer),
    },
    installerIdentities,
  );
  const {
    child: installer,
    registry: installerRegistry,
    registrationCapture: installerRegistrationCapture,
  } = installerSpawn;
  const installerLog = boundedLog(installer);
  const installerExit = await waitForOwnedExit(
    installer,
    "NVDA portable creation",
    120000,
    installerRegistry,
    "nvda-installer",
    installerIdentities,
    installerRegistrationCapture,
  );
  if (installerExit.exitCode !== 0) {
    throw new Error(
      `NVDA portable creation failed with ${installerExit.exitCode}: ${installerLog()}`,
    );
  }
  assertFrozenExecutableIdentityCurrent(installerIdentities[0], "NVDA installer post-exit");
  installHashBoundScratchpad();
  inventoryExactOwnedTree(NVDA_ADAPTER_PATHS.rawRoot, NVDA_ADAPTER_PATHS.rawRoot);
  const defender = DEFENDER;
  if (!existsSync(defender)) throw new Error("fixed Microsoft Defender scanner is absent");
  const scannerIdentities = Object.freeze([createExecutableIdentity(defender)]);
  const scannerSpawn = await spawnAndRegisterPreparationProcess(
    defender,
    ["-Scan", "-ScanType", "3", "-File", NVDA_ADAPTER_PATHS.rawRoot, "-DisableRemediation"],
    { cwd: RAW, env: safeEnvironment(), stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    {
      role: "defender-scanner",
      allowedRoot: dirname(defender),
    },
    scannerIdentities,
  );
  const {
    child: scanner,
    registry: scannerRegistry,
    registrationCapture: scannerRegistrationCapture,
  } = scannerSpawn;
  const scannerLog = boundedLog(scanner);
  const scannerExit = await waitForOwnedExit(
    scanner,
    "NVDA portable malware scan",
    120000,
    scannerRegistry,
    "defender-scanner",
    scannerIdentities,
    scannerRegistrationCapture,
  );
  if (scannerExit.exitCode !== 0 || !/found no threats/iu.test(scannerLog())) {
    throw new Error("NVDA generated portable malware scan did not pass");
  }
  assertFrozenExecutableIdentityCurrent(scannerIdentities[0], "Defender scanner post-exit");
  validatePreparationProcessSnapshot(inspectWindowsProcessSocketSnapshot());
  const executable = resolve(NVDA_ADAPTER_PATHS.portable, "nvda.exe");
  if (!existsSync(executable)) throw new Error("NVDA portable executable is absent");
  const portableIdentity = createExecutableIdentity(executable);
  const portableInventory = inventoryExactOwnedTree(
    NVDA_ADAPTER_PATHS.portable,
    NVDA_ADAPTER_PATHS.portable,
  );
  const configInventory = inventoryExactOwnedTree(
    NVDA_ADAPTER_PATHS.config,
    NVDA_ADAPTER_PATHS.config,
  );
  return validateAttempt002PreparationReceipt({
    schema: "fluyo:r4b:attempt-002-preparation:v1",
    attemptId: "attempt-002-observer",
    authorityDigest,
    toolManifestDigest: authorityToolManifestDigest,
    installerIdentityDigest: installerExit.identityDigest,
    defenderIdentityDigest: scannerExit.identityDigest,
    installerClosureDigest: canonicalPreparationClosureDigest(
      "nvda-installer",
      installerExit.identityDigest,
      installerExit.capturedSetDigest,
      installerExit.absenceStatus,
    ),
    defenderClosureDigest: canonicalPreparationClosureDigest(
      "defender-scanner",
      scannerExit.identityDigest,
      scannerExit.capturedSetDigest,
      scannerExit.absenceStatus,
    ),
    portableExecutableIdentityDigest: valueDigest(portableIdentity),
    portableInventoryDigest: portableInventory.digest,
    configInventoryDigest: configInventory.digest,
    installerExitCode: installerExit.exitCode,
    defenderExitCode: scannerExit.exitCode,
    installerAbsenceStatus: installerExit.absenceStatus,
    defenderAbsenceStatus: scannerExit.absenceStatus,
    malwareStatus: "PASS",
    serverLaunchStatus: "UNATTEMPTED",
    driverLaunchStatus: "UNATTEMPTED",
    chromeLaunchStatus: "UNATTEMPTED",
    nativeNvdaLaunchStatus: "UNATTEMPTED",
    status: "PASS",
  });
}

async function launchPreparedNvdaWriter(
  manifest,
  receipt,
  firstObservationId,
  expectedObservationIds,
  firstSpeechContract,
) {
  assertAttemptActive();
  const { executable, portableIdentity } = validatePreparedNvdaClosure(manifest, receipt);
  assertWindowsStandardUser();
  assertNoPreexistingNvda(inspectWindowsProcessSocketSnapshot());
  const lifecycle = createNvdaLifecycle(executable);
  const writerIdentities = Object.freeze([portableIdentity]);
  const child = await spawnNativeNvdaBoundary(
    [
      executable,
      NVDA_ADAPTER_PATHS.portable,
      NVDA_ADAPTER_PATHS.rawRoot,
      NVDA_ADAPTER_PATHS.config,
      NVDA_ADAPTER_PATHS.pluginInstalled,
      NVDA_ADAPTER_PATHS.protocolBinding,
      NVDA_ADAPTER_PATHS.diagnostics,
      randomBytes(16).toString("hex"),
      sha256(executable),
      sha256(NVDA_ADAPTER_PATHS.pluginInstalled),
      sha256(NVDA_ADAPTER_PATHS.protocolBinding),
      closedPathDigest(NVDA_ADAPTER_PATHS.config),
      closedPathDigest(NVDA_ADAPTER_PATHS.rawRoot),
    ],
    {
      cwd: NVDA_ADAPTER_PATHS.portable,
      env: safeEnvironment(),
    },
  );
  const writerRegistry = await waitForRoleRegistration(
    null,
    {
      role: "nvda-writer",
      pid: child.pid,
      allowedRoot: NVDA_ADAPTER_PATHS.portable,
    },
    writerIdentities,
  );
  let control;
  try {
    control = createNvdaControl({
      observationId: firstObservationId,
      nativeReceipt: child.nativeReceipt,
      expectedObservationIds,
      expectedSpeechContract: firstSpeechContract,
    });
    child.writeControl(control);
    await waitForNvdaReady(child, control);
  } catch (error) {
    await terminateRegisteredOwnedChild(
      child,
      writerRegistry,
      "nvda-writer",
      inspectWindowsProcessSocketSnapshot,
      [],
      writerIdentities,
    );
    throw error;
  }
  return Object.freeze({
    child,
    executable,
    lifecycle,
    executableIdentities: writerIdentities,
    initialObservationId: firstObservationId,
    initialControl: control,
  });
}

function registryForRole(registry, role) {
  const record = registry.find((entry) => entry.role === role);
  if (!record) throw new Error(`ownership registry is missing ${role}`);
  return Object.freeze([record]);
}

async function waitForRoleRegistration(
  registry,
  descriptor,
  allowedExecutableIdentities,
  observeSnapshot = () => {},
) {
  if (!Array.isArray(allowedExecutableIdentities) || allowedExecutableIdentities.length === 0) {
    throw new Error(`owned ${descriptor.role} registration requires exact executable identities`);
  }
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (activeAttemptSignal?.aborted) throw activeAttemptSignal.reason;
    const snapshot = inspectWindowsProcessSocketSnapshot();
    observeSnapshot(snapshot);
    try {
      const next = registry
        ? appendImmutableOwnershipRole(registry, descriptor, snapshot, allowedExecutableIdentities)
        : createImmutableOwnershipRegistry([descriptor], snapshot);
      validateImmutableOwnershipRegistry(snapshot, next, [], allowedExecutableIdentities);
      return next;
    } catch (error) {
      if (!/absent from the exact snapshot/u.test(String(error))) throw error;
    }
    await new Promise((accept) => setTimeout(accept, 50));
  }
  throw new Error(`owned ${descriptor.role} process was not registerable within 5000ms`);
}

async function stopNvdaWriter(writer, registry, allowedExecutableIdentities) {
  if (!writer) return;
  await terminateRegisteredOwnedChild(
    writer.child,
    registryForRole(registry, "nvda-writer"),
    "nvda-writer",
    inspectWindowsProcessSocketSnapshot,
    [],
    allowedExecutableIdentities,
  );
}
async function wd(base, method, path, body) {
  const payload = await boundedJsonRequest(`${base}${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    timeoutMs: 15000,
    parentSignal: activeAttemptSignal,
  });
  if (payload.value?.error)
    throw new Error(`WebDriver ${method} request failed: ${payload.value?.message ?? "unknown"}`);
  return payload.value;
}
async function execute(base, session, script, args = []) {
  return wd(base, "POST", `/session/${session}/execute/sync`, { script, args });
}
async function cdp(base, session, cmd, params = {}) {
  return wd(base, "POST", `/session/${session}/goog/cdp/execute`, { cmd, params });
}
async function createChromeSession(base, profileRoot) {
  const created = await wd(base, "POST", "/session", {
    capabilities: {
      alwaysMatch: {
        browserName: "chrome",
        "goog:loggingPrefs": { performance: "ALL" },
        "goog:chromeOptions": {
          binary: CHROME,
          args: [
            `--user-data-dir=${profileRoot}`,
            `--disk-cache-dir=${resolve(profileRoot, "cache")}`,
            "--disable-background-networking",
            "--disable-component-update",
            "--disable-sync",
            "--metrics-recording-only",
            "--no-first-run",
            "--no-default-browser-check",
            "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
          ],
        },
      },
    },
  });
  return created.sessionId;
}
async function keys(base, session, key) {
  await wd(base, "POST", `/session/${session}/actions`, {
    actions: [
      {
        type: "key",
        id: "keyboard",
        actions: [
          { type: "keyDown", value: "\uE009" },
          { type: "keyDown", value: key },
          { type: "keyUp", value: key },
          { type: "keyUp", value: "\uE009" },
        ],
      },
    ],
  });
}
async function pressTab(base, session, reverse = false) {
  const actions = [];
  if (reverse) actions.push({ type: "keyDown", value: "\uE008" });
  actions.push({ type: "keyDown", value: "\uE004" }, { type: "keyUp", value: "\uE004" });
  if (reverse) actions.push({ type: "keyUp", value: "\uE008" });
  await wd(base, "POST", `/session/${session}/actions`, {
    actions: [{ type: "key", id: "keyboard-order", actions }],
  });
}

async function pressArrowRight(base, session) {
  await wd(base, "POST", `/session/${session}/actions`, {
    actions: [
      {
        type: "key",
        id: "radio-arrow-order",
        actions: [
          { type: "keyDown", value: "\uE014" },
          { type: "keyUp", value: "\uE014" },
        ],
      },
    ],
  });
}

export function resolveAccessibleNameEvidence({
  ariaLabel,
  ariaLabelledby,
  referencedLabels = {},
}) {
  const direct = typeof ariaLabel === "string" ? ariaLabel.trim() : "";
  if (direct) return Object.freeze({ name: direct, source: "aria-label", status: "PASS" });
  const ids = typeof ariaLabelledby === "string" ? ariaLabelledby.trim().split(/\s+/u) : [];
  if (!ids.length) return Object.freeze({ name: "", source: null, status: "FAIL" });
  const values = ids.map((id) =>
    typeof referencedLabels[id] === "string" ? referencedLabels[id].trim() : "",
  );
  if (values.some((value) => !value))
    return Object.freeze({ name: "", source: "aria-labelledby", status: "FAIL" });
  return Object.freeze({ name: values.join(" "), source: "aria-labelledby", status: "PASS" });
}

function relativeLuminance(rgba) {
  const channels = rgba.slice(0, 3).map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function rgbaContrastRatio(firstRgba, secondRgba) {
  const lighter = Math.max(relativeLuminance(firstRgba), relativeLuminance(secondRgba));
  const darker = Math.min(relativeLuminance(firstRgba), relativeLuminance(secondRgba));
  return (lighter + 0.05) / (darker + 0.05);
}

function validRgba(value) {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(
      (component, index) =>
        Number.isFinite(component) &&
        (index === 3 ? component >= 0 && component <= 1 : component >= 0 && component <= 255),
    )
  );
}

export function effectiveRgbaWithOpacity({ foregroundRgba, backgroundRgba, opacityChain }) {
  if (
    !validRgba(foregroundRgba) ||
    !validRgba(backgroundRgba) ||
    !Array.isArray(opacityChain) ||
    opacityChain.length === 0 ||
    opacityChain.some((opacity) => !Number.isFinite(opacity) || opacity < 0 || opacity > 1)
  ) {
    return null;
  }
  const effectiveAlpha =
    foregroundRgba[3] * opacityChain.reduce((product, opacity) => product * opacity, 1);
  return Object.freeze([
    foregroundRgba[0] * effectiveAlpha + backgroundRgba[0] * (1 - effectiveAlpha),
    foregroundRgba[1] * effectiveAlpha + backgroundRgba[1] * (1 - effectiveAlpha),
    foregroundRgba[2] * effectiveAlpha + backgroundRgba[2] * (1 - effectiveAlpha),
    1,
  ]);
}

export function focusContrastAgainstExposedSurface({
  outlineRgba,
  elementSurfaceRgba,
  exposedSurfaceRgba,
  opacityChain = [1],
}) {
  const effectiveOutlineRgba = effectiveRgbaWithOpacity({
    foregroundRgba: outlineRgba,
    backgroundRgba: exposedSurfaceRgba,
    opacityChain,
  });
  const effectiveElementSurfaceRgba = effectiveRgbaWithOpacity({
    foregroundRgba: elementSurfaceRgba,
    backgroundRgba: exposedSurfaceRgba,
    opacityChain,
  });
  const ratio = effectiveOutlineRgba
    ? rgbaContrastRatio(effectiveOutlineRgba, exposedSurfaceRgba)
    : 0;
  return Object.freeze({
    outlineRgba: validRgba(outlineRgba) ? Object.freeze([...outlineRgba]) : null,
    elementSurfaceRgba: validRgba(elementSurfaceRgba)
      ? Object.freeze([...elementSurfaceRgba])
      : null,
    exposedSurfaceRgba: validRgba(exposedSurfaceRgba)
      ? Object.freeze([...exposedSurfaceRgba])
      : null,
    effectiveOutlineRgba,
    effectiveElementSurfaceRgba,
    opacityChain: Array.isArray(opacityChain) ? Object.freeze([...opacityChain]) : null,
    ratio,
    threshold: 3,
    status: effectiveOutlineRgba && effectiveElementSurfaceRgba && ratio >= 3 ? "PASS" : "FAIL",
  });
}

export function contextualSemanticContrastPairs({
  elementId,
  elementSurfaceRgba,
  parentSurfaceRgba,
  boundaryRgba,
  opacityChain = [1],
}) {
  const effectiveElementSurfaceRgba = effectiveRgbaWithOpacity({
    foregroundRgba: elementSurfaceRgba,
    backgroundRgba: parentSurfaceRgba,
    opacityChain,
  });
  const effectiveBoundaryRgba = effectiveRgbaWithOpacity({
    foregroundRgba: boundaryRgba,
    backgroundRgba: parentSurfaceRgba,
    opacityChain,
  });
  if (!effectiveElementSurfaceRgba || !effectiveBoundaryRgba) {
    return Object.freeze([
      Object.freeze({
        pairId: `${elementId}:unsupported-effective-color`,
        foregroundRgba: null,
        backgroundRgba: null,
        ratio: 0,
        threshold: 3,
        status: "FAIL",
      }),
    ]);
  }
  const specifications =
    elementId === "state-panel"
      ? [["state-rule", effectiveBoundaryRgba, effectiveElementSurfaceRgba]]
      : elementId.startsWith("choice-")
        ? [["choice-boundary", effectiveBoundaryRgba, effectiveElementSurfaceRgba]]
        : elementId === "primary-action"
          ? [
              ["primary-surface", effectiveElementSurfaceRgba, parentSurfaceRgba],
              ["primary-boundary", effectiveBoundaryRgba, parentSurfaceRgba],
            ]
          : [];
  return Object.freeze(
    specifications.map(([suffix, foregroundRgba, backgroundRgba]) => {
      const ratio = rgbaContrastRatio(foregroundRgba, backgroundRgba);
      return Object.freeze({
        pairId: `${elementId}:${suffix}`,
        foregroundRgba: Object.freeze([...foregroundRgba]),
        backgroundRgba: Object.freeze([...backgroundRgba]),
        ratio,
        threshold: 3,
        status: ratio >= 3 ? "PASS" : "FAIL",
      });
    }),
  );
}

export function validateRtlNotchGeometry({ clipPath, notchSize, width, height }) {
  if (![20, 24].includes(notchSize) || typeof clipPath !== "string") return false;
  const logicalTokens =
    clipPath.includes(`100% calc(100% - ${notchSize}px)`) &&
    clipPath.includes(`calc(100% - ${notchSize}px) 100%`);
  const points = [...clipPath.matchAll(/([-\d.]+)px\s+([-\d.]+)px/gu)].map((match) => [
    Number(match[1]),
    Number(match[2]),
  ]);
  const near = (first, second) => Math.abs(first - second) < 1;
  const resolvedPixels =
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    points.some(([x, y]) => near(x, width) && near(y, height - notchSize)) &&
    points.some(([x, y]) => near(x, width - notchSize) && near(y, height));
  return logicalTokens || resolvedPixels;
}

export function nativeSequentialFocusModel(elements) {
  const eligible = elements.filter(
    (entry) =>
      entry.rendered !== false &&
      entry.hidden !== true &&
      entry.inert !== true &&
      entry.disabled !== true &&
      entry.type !== "hidden" &&
      Number(entry.tabIndex ?? 0) >= 0,
  );
  const radioGroups = new Map();
  for (const entry of eligible) {
    if (entry.type !== "radio" || !entry.name) continue;
    const group = `${entry.formId ?? ""}\u0000${entry.name}`;
    const prior = radioGroups.get(group);
    if (!prior || (!prior.checked && entry.checked)) radioGroups.set(group, entry);
  }
  return Object.freeze(
    eligible
      .filter((entry) => {
        if (entry.type !== "radio" || !entry.name) return true;
        return radioGroups.get(`${entry.formId ?? ""}\u0000${entry.name}`) === entry;
      })
      .map((entry) => entry.key),
  );
}

export function validateLongContentReflow({
  prompt,
  choices,
  documentScrollWidth,
  documentClientWidth,
  regions,
}) {
  const exactFixture =
    typeof prompt === "string" &&
    prompt.length === 600 &&
    !/\s/u.test(prompt) &&
    Array.isArray(choices) &&
    choices.length === 4 &&
    choices.every(
      (choice) => typeof choice === "string" && choice.length === 180 && !/\s/u.test(choice),
    );
  const documentFits = documentScrollWidth <= documentClientWidth;
  const regionsFit =
    Array.isArray(regions) &&
    regions.length > 0 &&
    regions.every((region) => region.missing !== true && region.horizontalClipped !== true);
  return Object.freeze({
    exactFixture,
    documentFits,
    regionsFit,
    status: exactFixture && documentFits && regionsFit ? "PASS" : "FAIL",
  });
}

export function nativeRadioArrowModel({ members, currentIndex, direction, ariaDisabled }) {
  if (!Array.isArray(members) || members.length === 0) throw new Error("radio group is empty");
  if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= members.length)
    throw new Error("radio current index is invalid");
  if (!new Set(["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"]).has(direction))
    throw new Error("radio arrow direction is invalid");
  if (ariaDisabled)
    return Object.freeze({
      activeKey: members[currentIndex],
      checkedKey: members[currentIndex],
      selectionChanged: false,
      guarded: true,
    });
  const delta = new Set(["ArrowRight", "ArrowDown"]).has(direction) ? 1 : -1;
  const nextIndex = (currentIndex + delta + members.length) % members.length;
  return Object.freeze({
    activeKey: members[nextIndex],
    checkedKey: members[nextIndex],
    selectionChanged: nextIndex !== currentIndex,
    guarded: false,
  });
}

const REPRESENTATIVE_FOCUS_KEYS = Object.freeze({
  ACTIVE: Object.freeze([
    "a:Skip to activity",
    "a:Back to dashboard",
    "radio:selectedChoiceId:cerca",
    "conversation-canvas-attempt-action",
    "button:Run synthetic event",
  ]),
  SUBMITTING: Object.freeze([
    "a:Skip to activity",
    "a:Back to dashboard",
    "radio:selectedChoiceId:cerca",
    "conversation-canvas-attempt-action",
    "button:Run synthetic event",
  ]),
  CONFIRMED: Object.freeze([
    "a:Skip to activity",
    "a:Back to dashboard",
    "conversation-canvas-primary-action",
    "button:Run synthetic event",
  ]),
});

export function validateRepresentativeFocusFixture({ stateId, keyboardTrace, radioArrow }) {
  const expected = REPRESENTATIVE_FOCUS_KEYS[stateId];
  if (!expected) throw new Error("representative focus state is not closed");
  const exactForward = JSON.stringify(keyboardTrace?.expectedKeys) === JSON.stringify(expected);
  const exactReverse =
    JSON.stringify(keyboardTrace?.reverse?.map((entry) => entry?.key)) ===
    JSON.stringify([...expected].reverse());
  const exactArrow =
    stateId === "CONFIRMED"
      ? radioArrow == null
      : radioArrow?.status === "PASS" && radioArrow.guarded === (stateId === "SUBMITTING");
  return Object.freeze({
    exactForward,
    exactReverse,
    exactArrow,
    status:
      keyboardTrace?.status === "PASS" && exactForward && exactReverse && exactArrow
        ? "PASS"
        : "FAIL",
  });
}

function focusedElementAuditScript(includeGeometry) {
  return `const e=document.activeElement;if(!e)return null;e.scrollIntoView({block:'nearest',inline:'nearest'});const r=e.getBoundingClientRect(),s=getComputedStyle(e),parse=value=>{const text=String(value),m=text.match(/rgba?\\(([-.\\d]+)[, ]+([-.\\d]+)[, ]+([-.\\d]+)(?:[, \\/]+([-.\\d]+))?/);if(m)return [+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]];const c=text.match(/^color\\(srgb\\s+([-.\\d]+)\\s+([-.\\d]+)\\s+([-.\\d]+)(?:\\s*\\/\\s*([-.\\d]+))?\\)$/);return c?[+c[1]*255,+c[2]*255,+c[3]*255,c[4]===undefined?1:+c[4]]:null},over=(fg,bg)=>{const a=fg[3];return [fg[0]*a+bg[0]*(1-a),fg[1]*a+bg[1]*(1-a),fg[2]*a+bg[2]*(1-a),1]},opacity=node=>{let product=1;for(let n=node;n;n=n.parentElement){const value=Number(getComputedStyle(n).opacity);if(!Number.isFinite(value)||value<0||value>1)return null;product*=value}return product},effective=(fg,bg,node)=>{const product=opacity(node);return fg&&bg&&product!==null?over([fg[0],fg[1],fg[2],fg[3]*product],bg):null},background=node=>{const layers=[];for(let n=node;n;n=n.parentElement){const c=parse(getComputedStyle(n).backgroundColor),product=opacity(n);if(!c||product===null)return null;layers.push([c,product])}let out=[255,255,255,1];for(let i=layers.length-1;i>=0;i--){const [color,product]=layers[i];out=over([color[0],color[1],color[2],color[3]*product],out)}return out},lum=c=>{const v=c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]},ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05),outline=parse(s.outlineColor),elementSurface=background(e),exposedSurface=background(e.parentElement??document.body),effectiveOutline=effective(outline,exposedSurface,e),measured=effectiveOutline&&exposedSurface?ratio(effectiveOutline,exposedSurface):0${includeGeometry ? ",a=e.matches('input[type=\"radio\"],input[type=\"checkbox\"]')?(e.labels?.[0]??e.closest('label')):e,ar=a.getBoundingClientRect()" : ""};return {index:Number(e.getAttribute('data-preflight-focus-index')??-1),key:e.getAttribute('data-preflight-focus-key'),id:e.id||null,tag:e.tagName.toLowerCase(),name:e.getAttribute('aria-label')||e.labels?.[0]?.textContent?.trim()||e.textContent?.trim()||'',active:document.activeElement===e,visible:r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth,ring:s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0&&!!effectiveOutline,focusPair:{pairId:'focus-stop-'+e.getAttribute('data-preflight-focus-index'),kind:'focus',fgRgba:effectiveOutline,bgRgba:exposedSurface,rawFgRgba:outline,elementSurfaceRgba:elementSurface,exposedSurfaceRgba:exposedSurface,effectiveOpacity:opacity(e),threshold:3,ratio:measured,status:effectiveOutline&&exposedSurface&&measured>=3?'PASS':'FAIL'}${includeGeometry ? ",activationRect:{x:ar.x,y:ar.y,width:ar.width,height:ar.height}" : ""}};`;
}

function applyKeyboardTraceToAudit(audit, keyboardTrace) {
  const focusPairs = keyboardTrace.forward.map((entry) => entry?.focusPair).filter(Boolean);
  audit.contrastPairs.push(...focusPairs);
  audit.contrastPass =
    audit.colorComputationPass &&
    audit.semanticPairIdsPass &&
    audit.contrastPairs.every((entry) => entry.status === "PASS");
  audit.contrastMinimum = audit.contrastPairs.length
    ? Math.min(...audit.contrastPairs.map((entry) => entry.ratio / entry.threshold))
    : 1;
}

async function auditKeyboardOrder(base, session) {
  const prepared = await execute(
    base,
    session,
    `const scope=document.querySelector('[data-fixture-cell]');if(!scope)return null;const raw=[...scope.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')];const eligible=raw.filter(e=>{const s=getComputedStyle(e);return !e.hidden&&!e.disabled&&e.type!=='hidden'&&!e.closest('[inert]')&&e.tabIndex>=0&&s.display!=='none'&&s.visibility!=='hidden'&&e.getClientRects().length>0});const groupKey=e=>(e.form?.id??'')+'\\u0000'+e.name;const chosen=new Map();for(const e of eligible){if(!e.matches('input[type="radio"]')||!e.name)continue;const key=groupKey(e),prior=chosen.get(key);if(!prior||(!prior.checked&&e.checked))chosen.set(key,e)}const nodes=eligible.filter(e=>!e.matches('input[type="radio"]')||!e.name||chosen.get(groupKey(e))===e);const keyFor=e=>e.id||(e.matches('input[type="radio"]')?'radio:'+e.name+':'+e.value:e.tagName.toLowerCase()+':'+(e.textContent?.trim()||e.name||e.type));nodes.forEach((node,index)=>{node.setAttribute('data-preflight-focus-index',String(index));node.setAttribute('data-preflight-focus-key',keyFor(node))});document.activeElement?.blur();return {count:nodes.length,keys:nodes.map(keyFor)};`,
  );
  const count = prepared?.count;
  if (!Number.isSafeInteger(count) || count < 0 || count > 32) {
    return { status: "FAIL", forward: [], reverse: [], stopCount: count };
  }
  const forward = [];
  for (let index = 0; index < count; index += 1) {
    await pressTab(base, session, false);
    forward.push(await execute(base, session, focusedElementAuditScript(true)));
  }
  const reverse = [];
  await execute(base, session, `document.activeElement?.blur();return true;`);
  for (let index = count - 1; index >= 0; index -= 1) {
    await pressTab(base, session, true);
    reverse.push(await execute(base, session, focusedElementAuditScript(false)));
  }
  const ordered =
    JSON.stringify(forward.map((entry) => entry?.key)) === JSON.stringify(prepared.keys) &&
    JSON.stringify(reverse.map((entry) => entry?.key)) ===
      JSON.stringify([...prepared.keys].reverse());
  const everyStop = [...forward, ...reverse].every(
    (entry) => entry?.active && entry.visible && entry.ring,
  );
  return {
    status: ordered && everyStop ? "PASS" : "FAIL",
    expectedKeys: prepared.keys,
    forward,
    reverse,
    stopCount: count,
  };
}

async function auditRadioArrowBehavior(base, session) {
  const before = await execute(
    base,
    session,
    `const scope=document.querySelector('[data-fixture-cell]');if(!scope)return null;const radios=[...scope.querySelectorAll('input[type="radio"][name]')].filter(e=>!e.disabled&&!e.hidden&&!e.closest('[inert]')&&e.getClientRects().length>0);if(radios.length===0)return {members:[],beforeKey:null,checkedKey:null,guarded:null};const groups=new Map();for(const radio of radios){const key=(radio.form?.id??'')+'\\u0000'+radio.name;const members=groups.get(key)??[];members.push(radio);groups.set(key,members)}if(groups.size!==1)return {members:[],beforeKey:null,checkedKey:null,guarded:null};const members=[...groups.values()][0],current=members.find(e=>e.checked)??members[0],key=e=>'radio:'+e.name+':'+e.value;members.forEach(e=>e.setAttribute('data-preflight-radio-key',key(e)));current.focus();return {members:members.map(key),beforeKey:key(current),checkedKey:key(members.find(e=>e.checked)??current),guarded:current.getAttribute('aria-disabled')==='true'};`,
  );
  if (!before || before.members.length === 0) {
    return { status: "PASS", ...before, afterKey: null, afterCheckedKey: null };
  }
  await pressArrowRight(base, session);
  const after = await execute(
    base,
    session,
    `const scope=document.querySelector('[data-fixture-cell]'),active=document.activeElement,checked=scope?.querySelector('input[type="radio"][name]:checked');return {afterKey:active?.getAttribute('data-preflight-radio-key')??null,afterCheckedKey:checked?.getAttribute('data-preflight-radio-key')??null};`,
  );
  const expected = nativeRadioArrowModel({
    members: before.members,
    currentIndex: before.members.indexOf(before.beforeKey),
    direction: "ArrowRight",
    ariaDisabled: before.guarded,
  });
  return {
    status:
      after?.afterKey === expected.activeKey && after?.afterCheckedKey === expected.checkedKey
        ? "PASS"
        : "FAIL",
    ...before,
    ...after,
  };
}
async function traverseNvdaAcceptanceTargets(base, session) {
  const count = await execute(
    base,
    session,
    `const scope=document.querySelector('[data-fixture-cell]');if(!scope)return -1;const nodes=[scope.querySelector('h1'),scope.querySelector('[role="progressbar"],progress'),scope.querySelector('[class*="backLink"]'),...scope.querySelectorAll('fieldset input[type="radio"]'),scope.querySelector('#conversation-canvas-attempt-action,#conversation-canvas-primary-action')].filter((node,index,list)=>node&&list.indexOf(node)===index);nodes.forEach((node,index)=>{node.setAttribute('data-nvda-acceptance-index',String(index));node.setAttribute('data-nvda-acceptance-target',index===0?'heading':index===1?'progress':index===2?'back-link':node.matches('input[type="radio"]')?'choice':node.id==='conversation-canvas-primary-action'?'recovery-action':'primary-action')});return nodes.length;`,
  );
  if (!Number.isSafeInteger(count) || count < 2 || count > 34) {
    throw new Error("NVDA acceptance traversal target set changed");
  }
  for (let index = 0; index < count; index += 1) {
    const focused = await execute(
      base,
      session,
      `const node=document.querySelector('[data-nvda-acceptance-index="'+arguments[0]+'"]');if(!node||node.disabled)return false;const temporary=!node.matches('a[href],button,input,select,textarea,[tabindex]');if(temporary)node.setAttribute('tabindex','-1');node.scrollIntoView({block:'nearest',inline:'nearest'});node.focus();const active=document.activeElement===node;if(temporary)node.removeAttribute('tabindex');return active;`,
      [index],
    );
    if (!focused) throw new Error(`NVDA acceptance target ${index} was not focusable`);
    await new Promise((accept) => setTimeout(accept, 25));
  }
  return count;
}
async function setZoom(base, session, percent) {
  await keys(base, session, "0");
  if (percent === 200) for (let step = 0; step < 5; step += 1) await keys(base, session, "+");
}
function pageScript() {
  return `(()=>{const scope=document.querySelector('[data-fixture-cell]');
    if(!scope)return {error:'fixture_missing'};
    const q='a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])';
    const focusable=[...scope.querySelectorAll(q)].filter(e=>!e.disabled&&getComputedStyle(e).display!=='none');
    const activation=e=>e.matches('input[type="radio"],input[type="checkbox"]')?(e.labels?.[0]??e.closest('label')??e):e;
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const visible=r=>r.bottom>0&&r.y<innerHeight&&r.right>0&&r.x<innerWidth;
    const unoccluded=(e,r)=>{if(!e||!r)return true;const x=Math.max(0,Math.min(innerWidth-1,r.x+r.width/2)),y=Math.max(0,Math.min(innerHeight-1,r.y+r.height/2)),hit=document.elementFromPoint(x,y);return !hit||e===hit||e.contains(hit)};
    const accessibleName=e=>{if(!e)return '';const direct=e.getAttribute('aria-label')?.trim();if(direct)return direct;const labelledby=e.getAttribute('aria-labelledby')?.trim();if(!labelledby)return '';const values=labelledby.split(/\\s+/).map(id=>document.getElementById(id)?.textContent?.trim()??'');return values.length>0&&values.every(Boolean)?values.join(' '):''};
    const targetRects=focusable.map(e=>{const a=activation(e),r=rect(a),s=getComputedStyle(e);return {id:e.id||null,tag:e.tagName.toLowerCase(),name:e.getAttribute('aria-label')||e.labels?.[0]?.textContent?.trim()||e.textContent?.trim().slice(0,240)||'',activationElement:a.tagName.toLowerCase(),rect:r,visible:visible(r),outlineWidth:s.outlineWidth,outlineStyle:s.outlineStyle};});
    const primary=[...scope.querySelectorAll('#conversation-canvas-attempt-action,#conversation-canvas-primary-action')];
    if(primary[0])primary[0].scrollIntoView({block:'nearest',inline:'nearest'});
    const primaryRect=primary[0]?rect(primary[0]):null,primaryName=accessibleName(primary[0])||primary[0]?.textContent?.trim()||null;
    const progress=scope.querySelector('[role="progressbar"],progress');
    const parse=value=>{const text=String(value),m=text.match(/rgba?\\(([-.\\d]+)[, ]+([-.\\d]+)[, ]+([-.\\d]+)(?:[, \\/]+([-.\\d]+))?/);if(m)return [+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]];const c=text.match(/^color\\(srgb\\s+([-.\\d]+)\\s+([-.\\d]+)\\s+([-.\\d]+)(?:\\s*\\/\\s*([-.\\d]+))?\\)$/);return c?[+c[1]*255,+c[2]*255,+c[3]*255,c[4]===undefined?1:+c[4]]:null};
    const over=(fg,bg)=>{const a=fg[3];return [fg[0]*a+bg[0]*(1-a),fg[1]*a+bg[1]*(1-a),fg[2]*a+bg[2]*(1-a),1]};
    const opacity=e=>{let product=1;for(let n=e;n;n=n.parentElement){const value=Number(getComputedStyle(n).opacity);if(!Number.isFinite(value)||value<0||value>1)return null;product*=value}return product};
    const effective=(fg,bg,e)=>{const product=opacity(e);return fg&&bg&&product!==null?over([fg[0],fg[1],fg[2],fg[3]*product],bg):null};
    const background=e=>{const layers=[];for(let n=e;n;n=n.parentElement){const c=parse(getComputedStyle(n).backgroundColor),product=opacity(n);if(!c||product===null)return null;layers.push([c,product])}let out=[255,255,255,1];for(let i=layers.length-1;i>=0;i--){const [color,product]=layers[i];out=over([color[0],color[1],color[2],color[3]*product],out)}return out};
    const lum=c=>{const v=c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]};
    const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const pairs=[];let colorComputationPass=true;
    const statePanel=scope.querySelector('[data-state]'),canvasPanel=scope.querySelector('section[aria-labelledby] > div:not([class*="backdrop"])');
    const semantic=[['heading',scope.querySelector('h1')],['back-link',scope.querySelector('[class*="backLink"]')],['progress',progress],['progress-fill',progress?.querySelector('span')],['state-panel',statePanel],['primary-action',primary[0]],...([...scope.querySelectorAll('fieldset label')].map((e,index)=>['choice-'+(index+1),e])),...([...scope.querySelectorAll('[data-state] > p')].map((e,index)=>['state-copy-'+(index+1),e]))].filter(([,e])=>e);
    const closedSemanticIds=new Set(['heading','back-link','progress','progress-fill','state-panel','primary-action','choice-1','choice-2','choice-3','choice-4','state-copy-1','state-copy-2','state-copy-3']);const semanticPairIdsPass=semantic.every(([semanticId])=>closedSemanticIds.has(semanticId));
    for(const [semanticId,e] of semantic){const s=getComputedStyle(e),parentBg=background(e.parentElement??document.body),ownRaw=parse(s.backgroundColor),bg=effective(ownRaw,parentBg,e),text=e.textContent?.trim()||accessibleName(e),effectiveOpacity=opacity(e);if(!parentBg||!ownRaw||!bg||effectiveOpacity===null){colorComputationPass=false;continue}if(text){const raw=parse(s.color),fg=effective(raw,bg,e);if(raw&&fg){const large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&parseFloat(s.fontWeight)>=700),threshold=large?3:4.5,measured=ratio(fg,bg);pairs.push({pairId:semanticId+':text',kind:'text',element:semanticId,fgRgba:fg,bgRgba:bg,rawFgRgba:raw,effectiveOpacity,threshold,ratio:measured,status:measured>=threshold?'PASS':'FAIL'})}else colorComputationPass=false}if(semanticId==='progress-fill'&&ownRaw[3]>0){const measured=ratio(bg,parentBg);pairs.push({pairId:'progress-fill:surface',kind:'surface',element:semanticId,fgRgba:bg,bgRgba:parentBg,rawFgRgba:ownRaw,effectiveOpacity,threshold:3,ratio:measured,status:measured>=3?'PASS':'FAIL'})}const boundaryRaw=parse(s.borderInlineStartColor),boundaryEffective=effective(boundaryRaw,parentBg,e),boundaryVisible=s.borderInlineStartStyle!=='none'&&parseFloat(s.borderInlineStartWidth)>0&&boundaryRaw&&boundaryRaw[3]>0;if(boundaryVisible&&!boundaryEffective)colorComputationPass=false;if(semanticId==='state-panel'&&boundaryVisible&&boundaryEffective){const measured=ratio(boundaryEffective,bg);pairs.push({pairId:'state-panel:state-rule',kind:'boundary',element:semanticId,fgRgba:boundaryEffective,bgRgba:bg,rawFgRgba:boundaryRaw,effectiveOpacity,threshold:3,ratio:measured,status:measured>=3?'PASS':'FAIL'})}if(semanticId.startsWith('choice-')&&boundaryVisible&&boundaryEffective){const measured=ratio(boundaryEffective,bg);pairs.push({pairId:semanticId+':choice-boundary',kind:'boundary',element:semanticId,fgRgba:boundaryEffective,bgRgba:bg,rawFgRgba:boundaryRaw,effectiveOpacity,threshold:3,ratio:measured,status:measured>=3?'PASS':'FAIL'})}if(semanticId==='primary-action'&&ownRaw[3]>0){const surfaceMeasured=ratio(bg,parentBg);pairs.push({pairId:'primary-action:primary-surface',kind:'surface',element:semanticId,fgRgba:bg,bgRgba:parentBg,rawFgRgba:ownRaw,effectiveOpacity,threshold:3,ratio:surfaceMeasured,status:surfaceMeasured>=3?'PASS':'FAIL'});if(boundaryVisible&&boundaryEffective){const boundaryMeasured=ratio(boundaryEffective,parentBg);pairs.push({pairId:'primary-action:primary-boundary',kind:'boundary',element:semanticId,fgRgba:boundaryEffective,bgRgba:parentBg,rawFgRgba:boundaryRaw,effectiveOpacity,threshold:3,ratio:boundaryMeasured,status:boundaryMeasured>=3?'PASS':'FAIL'})}}}
    const motion=[...scope.querySelectorAll('*')].map((e,index)=>{const s=getComputedStyle(e);return {id:e.id||e.tagName.toLowerCase()+'-'+index,animationName:s.animationName,animationDuration:s.animationDuration,transitionProperty:s.transitionProperty,transitionDuration:s.transitionDuration,transform:s.transform}}).filter(x=>x.animationName!=='none'||x.transitionDuration.split(',').some(v=>parseFloat(v)>0));
    const region=(id,e,required=true)=>e?{regionId:id,required,rect:rect(e),clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,horizontalClipped:e.scrollWidth>e.clientWidth,verticalOverflow:e.scrollHeight>e.clientHeight}:required?{regionId:id,required,missing:true}:null;
    const regions=[region('canvas',scope),region('canvas-panel',canvasPanel),region('session-bar',scope.querySelector('[class*="sessionBar"]')),region('progress',progress),region('heading',scope.querySelector('h1')),region('form',scope.querySelector('form')),region('choices',scope.querySelector('fieldset'),false),region('state-panel',statePanel),region('primary-action',primary[0],false)].filter(Boolean);
    const rectContains=(a,b)=>a.x<=b.x&&a.y<=b.y&&a.right>=b.right&&a.bottom>=b.bottom;
    const actionableRegions=regions.filter(entry=>['session-bar','choices','primary-action'].includes(entry.regionId)&&entry.rect);
    const overlaps=[];for(let i=0;i<actionableRegions.length;i++)for(let j=i+1;j<actionableRegions.length;j++){const a=actionableRegions[i].rect,b=actionableRegions[j].rect;if(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y&&!rectContains(a,b)&&!rectContains(b,a))overlaps.push(actionableRegions[i].regionId+':'+actionableRegions[j].regionId)}
    const heading=scope.querySelector('h1'),section=scope.querySelector('section[aria-labelledby]'),main=scope.closest('main'),live=scope.querySelector('[aria-live]');
    const localeRoot=scope.closest('[data-r4b-locale]');const localeId=localeRoot?.getAttribute('data-r4b-locale')??null;const rtl=getComputedStyle(scope).direction==='rtl';
    const localized=[...scope.querySelectorAll('*')].flatMap(e=>[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()));
    const pseudoPrefix=localeId==='en-XA'?'⟦':localeId==='ar-XB'?'⟦عَرَبِيّ ':'';const pseudoSuffix=localeId==='en'?'':' ···⟧';
    const exactPseudo=localeId==='en'||localized.every(value=>value.startsWith(pseudoPrefix)&&value.endsWith(pseudoSuffix)&&value.length>pseudoPrefix.length+pseudoSuffix.length);
    const normalizePseudo=value=>!value||localeId==='en'?value:value.slice(pseudoPrefix.length,-pseudoSuffix.length);
    const exactPrimaryNames=new Set(['Check answer','Checking…','Continue','Finish','Try again','Refresh activity','Sign in','Return to learning','Continue learning','Reconnect']);
    const primaryIdentityPass=primary.length===0||(primary.length===1&&['conversation-canvas-attempt-action','conversation-canvas-primary-action'].includes(primary[0].id)&&exactPrimaryNames.has(normalizePseudo(primaryName)));
    const stateId=statePanel?.getAttribute('data-state')??null,expectedValueText=stateId==='CONFIRMED'?'Activity complete':'Activity incomplete';
    const sessionBar=scope.querySelector('[class*="sessionBar"]'),backLink=scope.querySelector('[class*="backLink"]'),progressGroup=progress?.parentElement;
    const canvas=scope.querySelector('section[aria-labelledby]'),canvasClip=canvasPanel?getComputedStyle(canvasPanel).clipPath:'none',notchSize=parseFloat(getComputedStyle(canvas??scope).getPropertyValue('--cc-notch')),progressOrigin=progress?.querySelector('span')?parseFloat(getComputedStyle(progress.querySelector('span')).transformOrigin):NaN;
    const rtlOrderPass=!rtl||!!(backLink&&progressGroup&&backLink.getBoundingClientRect().x>progressGroup.getBoundingClientRect().x);
    const clipHeight=canvasPanel?.getBoundingClientRect().height??0,clipWidth=canvasPanel?.getBoundingClientRect().width??0,near=(a,b)=>Math.abs(a-b)<1;
    const rtlClipPass=!rtl||(Number.isFinite(notchSize)&&[20,24].includes(notchSize)&&((canvasClip.includes('100% calc(100% - '+notchSize+'px)')&&canvasClip.includes('calc(100% - '+notchSize+'px) 100%'))||([...canvasClip.matchAll(/([-\\d.]+)px\\s+([-\\d.]+)px/g)].some(match=>near(+match[1],clipWidth)&&near(+match[2],clipHeight-notchSize))&&[...canvasClip.matchAll(/([-\\d.]+)px\\s+([-\\d.]+)px/g)].some(match=>near(+match[1],clipWidth-notchSize)&&near(+match[2],clipHeight)))));
    const logicalMirrorPass=!rtl||(getComputedStyle(sessionBar??scope).direction==='rtl'&&progressOrigin>(progress?.clientWidth??0)/2&&rtlOrderPass&&rtlClipPass&&['right','start'].includes(getComputedStyle(statePanel??scope).textAlign));
    const requiredRegionsPass=regions.every(entry=>!entry.required||(!entry.missing&&!entry.horizontalClipped));
    const progressName=accessibleName(progress),namedStatusPass=!!(statePanel&&stateId&&live&&progressName&&heading?.id&&section?.getAttribute('aria-labelledby')===heading.id);
    return {error:null,headingCount:scope.querySelectorAll('h1').length,mainCount:main?1:0,landmarkRelationshipPass:!!(main&&section&&heading&&section.getAttribute('aria-labelledby')===heading.id)&&namedStatusPass,namedStatusPass,
      documentClientWidth:document.documentElement.clientWidth,documentScrollWidth:document.documentElement.scrollWidth,innerWidth,innerHeight,devicePixelRatio,dir:getComputedStyle(scope).direction,
      focusable:targetRects,minimumTarget:targetRects.length?Math.min(...targetRects.map(x=>Math.min(x.rect.width,x.rect.height))):44,focusVisible:targetRects.length===0||targetRects.every(x=>x.outlineStyle!=='none'&&parseFloat(x.outlineWidth)>0),
      primaryAction:{count:primary.length,id:primary[0]?.id||null,accessibleName:primaryName,exactIdentityAndName:primaryIdentityPass,rect:primaryRect,visible:primaryRect?visible(primaryRect):true,unoccluded:unoccluded(primary[0],primaryRect)},
      actionReachable:primaryRect?visible(primaryRect):true,contrastPairs:pairs,contrastMinimum:pairs.length?Math.min(...pairs.map(x=>x.ratio/x.threshold)):0,contrastPass:colorComputationPass&&pairs.every(x=>x.status==='PASS')&&semanticPairIdsPass,colorComputationPass,semanticPairIdsPass,regions,requiredRegionsPass,actionableOverlapPass:overlaps.length===0,overlaps,verticalRecovery:{documentClientHeight:document.documentElement.clientHeight,documentScrollHeight:document.documentElement.scrollHeight,scrollable:document.documentElement.scrollHeight>document.documentElement.clientHeight,primaryVisibleAfterScroll:primaryRect?visible(primaryRect):true},
      progressNamed:!progress||!!progressName,progressAccessibleName:progressName,progressValued:!progress||progress.hasAttribute('value')||progress.hasAttribute('aria-valuenow'),progressValueText:progress?.getAttribute('aria-valuetext')??null,progressValueTextPass:!progress||progress.getAttribute('aria-valuetext')===expectedValueText,
      reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior,motionComputed:motion,motionPresent:motion.some(x=>x.animationName!=='none'||x.transitionDuration.split(',').some(v=>parseFloat(v)>.00001)),staticOutcome:{state:stateId,heading:heading?.textContent?.trim()??null,primary:primaryName,regions:regions.filter(x=>x.rect).map(x=>[x.regionId,x.rect.width,x.rect.height])},
      locale:{id:localeId,complete:localeRoot?.getAttribute('data-r4b-localization-complete')==='true',visibleStringCount:Number(localeRoot?.getAttribute('data-r4b-localized-visible-string-count')??0),visibleStrings:localized,allPseudoLocalized:exactPseudo,logicalMirrorPass,canvasClipPath:canvasClip,notchSize,progressOrigin,rtlOrderPass,rtlClipPass,stateTextAlign:getComputedStyle(statePanel??scope).textAlign,notch:canvasClip}
    };})()`;
}

export function preflightPageAuditScriptForTesting() {
  return pageScript();
}

function transitionPresentation(stateId, entryContextId) {
  const direct = {
    PREPARING: "preparing",
    ACTIVE: "active",
    SUBMITTING: "submitting",
    CONFIRMED: "confirmed-correct-continue",
    RETRYABLE_ERROR:
      entryContextId === "delayed_preparing" ? "retryable-prepare" : "retryable-submit",
    STALE_CONTENT: "stale-content",
    SESSION_ENDED: "session-ended",
    ACCESS_BLOCKED: "access-blocked",
    EMPTY_REVIEW: "empty-review",
    OFFLINE_READ_ONLY: entryContextId.includes("preparing") ? "offline-prepare" : "offline-active",
  };
  const value = direct[stateId.split(":", 1)[0]];
  if (!value) throw new Error("transition uses an unknown presentation state");
  return value;
}

async function configureAndAuditCell(base, session, origin, cell) {
  assertAttemptActive();
  const [width, height] = VIEWPORTS[cell.viewportId];
  await setZoom(base, session, 100);
  await wd(base, "POST", `/session/${session}/window/rect`, { width, height, x: 0, y: 0 });
  await cdp(base, session, "Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: cell.themeId },
      { name: "prefers-reduced-motion", value: "reduce" },
    ],
  });
  const url = `${origin}/?fixture=${fixturePresentation(cell)}&breakCase=${cell.fixtureId}&locale=${cell.localeId}&transition=none`;
  await wd(base, "POST", `/session/${session}/url`, { url });
  await setZoom(base, session, cell.textScaleId.endsWith("200") ? 200 : 100);
  await execute(
    base,
    session,
    `document.documentElement.lang=arguments[0];document.documentElement.dir=arguments[1];return true;`,
    [cell.localeId, cell.localeId === "ar-XB" ? "rtl" : "ltr"],
  );
  const keyboardTrace = await auditKeyboardOrder(base, session);
  const audit = await execute(base, session, `return (${pageScript()})`);
  audit.keyboardTrace = keyboardTrace;
  audit.keyboardOrderPass = keyboardTrace.status === "PASS";
  audit.focusVisible = keyboardTrace.status === "PASS";
  applyKeyboardTraceToAudit(audit, keyboardTrace);
  const logs = await wd(base, "POST", `/session/${session}/log`, { type: "performance" });
  validatePerformanceNetworkLog(logs, origin);
  return audit;
}

export function validateInertClientBoundaryProbe(value) {
  if (
    !value ||
    value.boundary !== "v1" ||
    value.actionAlias !== "fluyo:r4b:inert-conversation-action:v1" ||
    value.anchorNavigationPrevented !== true ||
    value.routerButtonPrevented !== true ||
    value.actionCallbackPrevented !== true ||
    value.pointerSubmitPrevented !== true ||
    value.keyboardSubmitPrevented !== true ||
    value.locationStable !== true ||
    value.presentationStable !== true ||
    value.focusStable !== true ||
    value.zeroRequestActivation !== true ||
    value.zeroActionActivation !== true ||
    value.blockedActivationCount !== 5
  ) {
    throw new Error("harness inert client action/navigation runtime proof failed");
  }
  return Object.freeze({ status: "PASS" });
}

async function pressEnter(base, session) {
  await wd(base, "POST", `/session/${session}/actions`, {
    actions: [
      {
        type: "key",
        id: "inert-submit-keyboard",
        actions: [
          { type: "keyDown", value: "\uE007" },
          { type: "keyUp", value: "\uE007" },
        ],
      },
    ],
  });
}

async function probeInertActivation(base, session, origin, specification) {
  const url = `${origin}/?fixture=${specification.fixture}&breakCase=missing_optional_explanation&locale=en&transition=none`;
  await wd(base, "POST", `/session/${session}/url`, { url });
  const initial = await execute(
    base,
    session,
    `const kind=arguments[0];const elements=[...document.querySelectorAll('a[href],button')];const target=kind==='anchor'?document.querySelector('a#conversation-canvas-primary-action'):kind==='router'?document.querySelector('button#conversation-canvas-primary-action'):kind==='callback'?elements.find((entry)=>entry.textContent?.trim()==='Run synthetic event'):document.querySelector('button[type="submit"]');const boundary=document.querySelector('[data-r4b-inert-navigation-boundary]');const scope=document.querySelector('[data-fixture-presentation]');if(!target||!boundary||!scope)return null;target.focus();return {boundary:boundary.getAttribute('data-r4b-inert-navigation-boundary'),actionAlias:boundary.getAttribute('data-r4b-inert-action-alias'),location:location.href,presentation:scope.getAttribute('data-fixture-presentation'),state:scope.querySelector('[data-state]')?.getAttribute('data-state')??null,trace:scope.querySelector('output')?.textContent??null,count:Number(boundary.getAttribute('data-r4b-blocked-activation-count')??'-1'),focused:document.activeElement===target};`,
    [specification.kind],
  );
  if (!initial?.focused) throw new Error(`inert ${specification.kind} probe target is absent`);
  await wd(base, "POST", `/session/${session}/log`, { type: "performance" });
  let activationPrevented = true;
  if (specification.activation === "keyboard") await pressEnter(base, session);
  else {
    activationPrevented = await execute(
      base,
      session,
      `const kind=arguments[0];const elements=[...document.querySelectorAll('a[href],button')];const target=kind==='anchor'?document.querySelector('a#conversation-canvas-primary-action'):kind==='router'?document.querySelector('button#conversation-canvas-primary-action'):kind==='callback'?elements.find((entry)=>entry.textContent?.trim()==='Run synthetic event'):document.querySelector('button[type="submit"]');const event=new MouseEvent('click',{bubbles:true,cancelable:true,button:0});target.dispatchEvent(event);return event.defaultPrevented;`,
      [specification.kind],
    );
  }
  const after = await execute(
    base,
    session,
    `const kind=arguments[0];const elements=[...document.querySelectorAll('a[href],button')];const target=kind==='anchor'?document.querySelector('a#conversation-canvas-primary-action'):kind==='router'?document.querySelector('button#conversation-canvas-primary-action'):kind==='callback'?elements.find((entry)=>entry.textContent?.trim()==='Run synthetic event'):document.querySelector('button[type="submit"]');const boundary=document.querySelector('[data-r4b-inert-navigation-boundary]');const scope=document.querySelector('[data-fixture-presentation]');return {location:location.href,presentation:scope?.getAttribute('data-fixture-presentation')??null,state:scope?.querySelector('[data-state]')?.getAttribute('data-state')??null,trace:scope?.querySelector('output')?.textContent??null,count:Number(boundary?.getAttribute('data-r4b-blocked-activation-count')??'-1'),focused:document.activeElement===target};`,
    [specification.kind],
  );
  const network = validatePerformanceNetworkLog(
    await wd(base, "POST", `/session/${session}/log`, { type: "performance" }),
    origin,
  );
  return Object.freeze({
    activationPrevented,
    boundary: initial.boundary,
    actionAlias: initial.actionAlias,
    locationStable: after.location === initial.location,
    presentationStable: after.presentation === initial.presentation,
    focusStable: after.focused,
    actionStable: after.state === initial.state && after.trace === initial.trace,
    blockedCountDelta: after.count - initial.count,
    requestCount: network.requestCount,
  });
}

async function proveInertClientBoundary(base, session, origin) {
  const specifications = [
    { name: "anchorNavigationPrevented", fixture: "session-ended", kind: "anchor" },
    { name: "routerButtonPrevented", fixture: "confirmed-correct-finish", kind: "router" },
    { name: "actionCallbackPrevented", fixture: "active", kind: "callback" },
    { name: "pointerSubmitPrevented", fixture: "retryable-submit", kind: "submit" },
    {
      name: "keyboardSubmitPrevented",
      fixture: "retryable-submit",
      kind: "submit",
      activation: "keyboard",
    },
  ];
  const results = [];
  for (const specification of specifications) {
    assertAttemptActive();
    results.push(await probeInertActivation(base, session, origin, specification));
  }
  const first = results[0];
  return validateInertClientBoundaryProbe({
    boundary: first.boundary,
    actionAlias: first.actionAlias,
    ...Object.fromEntries(
      specifications.map((specification, index) => [
        specification.name,
        results[index].activationPrevented && results[index].blockedCountDelta === 1,
      ]),
    ),
    locationStable: results.every((entry) => entry.locationStable),
    presentationStable: results.every((entry) => entry.presentationStable),
    focusStable: results.every((entry) => entry.focusStable),
    zeroRequestActivation: results.every((entry) => entry.requestCount === 0),
    zeroActionActivation: results.every((entry) => entry.actionStable),
    blockedActivationCount: results.reduce((sum, entry) => sum + entry.blockedCountDelta, 0),
  });
}
function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}
function writeReadinessReceipt(readiness, registry, roles) {
  const selected = roles.map((role) => {
    const record = registry.find((entry) => entry.role === role);
    if (!record) throw new Error(`readiness receipt is missing registered role ${role}`);
    return record;
  });
  const checks = {
    SERVER_READY: "QUERY_BOUNDARY_AND_LOOPBACK_PASS",
    DRIVER_READY: "WEBDRIVER_STATUS_AND_IDENTITY_PASS",
    NVDA_READY: "FILTERED_PRE_SPEECH_ADAPTER_IDENTITY_PASS",
  }[readiness];
  const receipt = {
    schema: "fluyo:r4b:attempt-002-readiness:v1",
    attemptId: "attempt-002-observer",
    readiness,
    identityDigest: createHash("sha256").update(JSON.stringify(selected), "utf8").digest("hex"),
    checks,
    status: "PASS",
  };
  validateAttempt002ReadinessReceipt(receipt, readiness);
  const path = {
    SERVER_READY: ATTEMPT_002_PATHS.serverReady,
    DRIVER_READY: ATTEMPT_002_PATHS.driverReady,
    NVDA_READY: ATTEMPT_002_PATHS.nvdaReady,
  }[readiness];
  guardedAttemptWrite(path, `${JSON.stringify(receipt)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  if (readiness === "SERVER_READY") recordAttempt002ServerReady();
  else if (readiness === "DRIVER_READY") recordAttempt002DriverReady();
  else recordAttempt002NvdaReady();
  return Object.freeze(receipt);
}
function writeArtifact(path, bytes, maximum) {
  if (bytes.length > maximum) throw new Error("artifact exceeds approved byte gate");
  guardedAttemptWrite(path, bytes, { flag: "wx" });
}
function recordFailedHeld(category = "OBSERVATION_FAILED") {
  if (existsSync(ATTEMPT_002_PATHS.failedHeld)) return;
  if (!existsSync(RUNTIME)) {
    ensureAttemptParent(RUNTIME);
    guardedAttemptMkdir(RUNTIME, { recursive: false });
  }
  guardedAttemptWrite(
    ATTEMPT_002_PATHS.failedHeld,
    `${JSON.stringify({
      schema: "fluyo:r4b:preflight-failed-held:v1",
      attemptId: "attempt-002-observer",
      category,
      status: "FAILED_HELD",
    })}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  recordAttempt002FailedHeld();
}
function artifactPath(observation, key) {
  const path = resolve(RAW, "o", observation.observationId, ...key.split("/"));
  if (path.length > 240 || !path.startsWith(`${RAW}\\`))
    throw new Error("raw artifact path violates fixed gate");
  return path;
}
export function fillUnattemptedObservationStatuses(plan, completed, announcements) {
  if (
    completed.length > plan.observations.length ||
    announcements.length > plan.observations.length
  ) {
    throw new Error("completed observation counts exceed the closed matrix");
  }
  const filled = [...completed];
  const filledAnnouncements = [...announcements];
  while (filled.length < plan.observations.length) {
    const observation = plan.observations[filled.length];
    filled.push({
      cellOrdinal: observation.cellOrdinal,
      status: "UNATTEMPTED",
      audit: null,
      metrics: null,
    });
  }
  while (filledAnnouncements.length < plan.observations.length) {
    const observation = plan.observations[filledAnnouncements.length];
    filledAnnouncements.push({
      observationId: observation.observationId,
      eventCount: 0,
      normalizedTextSha256: createHash("sha256").update("", "utf8").digest("hex"),
      duplicateCount: 0,
      expectedOrderStatus: "UNATTEMPTED",
      oneTimeAnnouncementStatus: "UNATTEMPTED",
    });
  }
  return Object.freeze({
    observations: Object.freeze(filled),
    announcements: Object.freeze(filledAnnouncements),
  });
}

function readPreparedManifest(plan) {
  const manifestBytes = readBoundedRegularFile(
    MANIFEST,
    ROOT,
    1048576,
    "attempt-002 observer manifest read",
  );
  if (manifestBytes.length > Number(plan.gates.jsonMaxBytes)) {
    throw new Error("manifest exceeds JSON gate");
  }
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  validateAttempt002ToolManifest(manifest);
  return manifest;
}

export function preparationTransactionDisposition(state) {
  if (state === "PREPARED") return "VALIDATE_ONLY";
  if (state === "BUILD_READY") return "PREPARE";
  throw new Error("attempt-002 preparation is not in BUILD_READY or PREPARED state");
}

export async function executePreparationDispositionTransaction(state, operations) {
  if (
    !operations ||
    JSON.stringify(Object.keys(operations)) !==
      JSON.stringify(["validateExisting", "prepareNew"]) ||
    typeof operations.validateExisting !== "function" ||
    typeof operations.prepareNew !== "function"
  ) {
    throw new Error("attempt-002 preparation transaction operations are malformed");
  }
  const disposition = preparationTransactionDisposition(state);
  return disposition === "VALIDATE_ONLY" ? operations.validateExisting() : operations.prepareNew();
}

export async function prepareAttempt002RuntimeInternal() {
  const plan = createDiscardedPreflightPlan();
  const state = resolveAttempt002State();
  const disposition = preparationTransactionDisposition(state);
  if (disposition === "VALIDATE_ONLY")
    return executePreparationDispositionTransaction(state, {
      validateExisting: () => {
        const manifest = readPreparedManifest(plan);
        const receipt = readAttempt002PreparationReceipt();
        validatePreparedNvdaClosure(manifest, receipt);
        return receipt;
      },
      prepareNew: () => {
        throw new Error("PREPARED validation cannot enter the BUILD_READY mutation path");
      },
    });
  assertProductionFixtureBoundaryEligible();
  validateRepositoryDeploymentExclusion();
  validateHarnessInertness();
  scanProductionSourceTrees();
  const attempt = createAttempt002Authority();
  if (!existsSync(resolve(HARNESS_BUILD, "BUILD_ID"))) {
    throw new Error("reproducible isolated harness build is absent");
  }
  const buildInventory = inventoryExactOwnedTree(HARNESS_BUILD, HARNESS_BUILD);
  if (buildInventory.files === 0 || buildInventory.bytes === 0n) {
    throw new Error("isolated harness build inventory is empty");
  }
  validateHarnessProductionBuildProof(HARNESS_BUILD);
  return executePreparationDispositionTransaction(state, {
    validateExisting: () => {
      throw new Error("BUILD_READY preparation cannot enter the PREPARED validation path");
    },
    prepareNew: async () => {
      recordAttempt002Preparing();
      try {
        ensureAttemptParent(RUNTIME);
        guardedAttemptMkdir(RUNTIME, { recursive: false });
        guardedAttemptWrite(ATTEMPT_002_PATHS.authority, `${JSON.stringify(attempt.authority)}\n`, {
          flag: "wx",
        });
        guardedAttemptWrite(MANIFEST, `${JSON.stringify(attempt.toolManifest)}\n`, { flag: "wx" });
        guardedAttemptMkdir(RAW, { recursive: false });
        validatePreparationManifestAuthorityBinding(
          attempt.authority.toolManifestDigest,
          sha256(MANIFEST),
        );
        const receipt = await prepareNvdaPortable(
          attempt.toolManifest,
          attempt.digest,
          attempt.authority.toolManifestDigest,
        );
        const receiptBytes = Buffer.from(`${JSON.stringify(receipt)}\n`, "utf8");
        if (receiptBytes.length > 4096) throw new Error("preparation receipt exceeds 4096 bytes");
        guardedAttemptWrite(ATTEMPT_002_PATHS.preparationReceipt, receiptBytes, { flag: "wx" });
        recordAttempt002Prepared(sha256(ATTEMPT_002_PATHS.preparationReceipt));
        return receipt;
      } catch (error) {
        if (currentAttempt002LifecycleState() === "PREPARING") {
          recordFailedHeld("PREPARATION_FAILED");
        }
        throw error;
      }
    },
  });
}

async function observeDiscardedPreflightInternal() {
  const plan = createDiscardedPreflightPlan();
  if (resolveAttempt002State() !== "PREPARED")
    throw new Error("attempt-002 observer is not in PREPARED state");
  assertProductionFixtureBoundaryEligible();
  validateRepositoryDeploymentExclusion();
  validateHarnessInertness();
  scanProductionSourceTrees();
  createAttempt002Authority();
  if (!existsSync(resolve(HARNESS_BUILD, "BUILD_ID")))
    throw new Error("reproducible isolated harness build is absent");
  const buildInventory = inventoryExactOwnedTree(HARNESS_BUILD, HARNESS_BUILD);
  if (buildInventory.files === 0 || buildInventory.bytes === 0n) {
    throw new Error("isolated harness build inventory is empty");
  }
  validateHarnessProductionBuildProof(HARNESS_BUILD);
  const manifest = readPreparedManifest(plan);
  const preparationReceipt = readAttempt002PreparationReceipt();
  if (attempt002PreparationReceiptDigest() !== currentAttempt002PreparedReceiptDigest()) {
    throw new Error("attempt-002 preparation receipt is not sealed by the PREPARED lifecycle");
  }
  validatePreparedNvdaClosure(manifest, preparationReceipt);
  for (const [toolId, path] of [
    ["chrome_for_testing", CHROME],
    ["chromedriver", DRIVER],
  ]) {
    const tool = manifest.tools.find((entry) => entry.toolId === toolId);
    if (!tool || !["ELIGIBLE", "LAUNCHED"].includes(tool.launchStatus))
      throw new Error(`${toolId} is not launch eligible`);
    if (sha256(path) !== tool.provenance.executableAllowlist[0].sha256)
      throw new Error(`${toolId} executable digest changed`);
  }
  if (existsSync(AGGREGATE)) throw new Error("observer requires an absent attempt aggregate");
  recordAttempt002Observing();
  const webPort = await allocateInternalLoopbackPort();
  const driverPort = await allocateInternalLoopbackPort();
  const origin = `http://127.0.0.1:${webPort}`;
  const driverBase = `http://127.0.0.1:${driverPort}`;
  const webIdentity = createExecutableIdentity(process.execPath);
  const driverIdentity = createExecutableIdentity(DRIVER);
  const chromeIdentity = createExecutableIdentity(CHROME);
  const web = spawn(
    process.execPath,
    [NEXT_CLI, "start", "--hostname", "127.0.0.1", "--port", String(webPort)],
    {
      cwd: HARNESS,
      env: safeEnvironment(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  const webLog = boundedLog(web);
  let driver;
  let session;
  let ownership;
  let ownershipRegistry;
  let nvdaWriter;
  const expectedObservationIds = plan.observations.map((entry) => entry.observationId);
  const expectedObservationSet = new Set(expectedObservationIds);
  const expectedSpeechContracts = plan.observations.map((entry) =>
    createNvdaExpectedSpeechContract(
      plan.visualCells[entry.cellOrdinal - 1].stateId,
      plan.visualCells[entry.cellOrdinal - 1].localeId,
      plan.visualCells[entry.cellOrdinal - 1].fixtureId,
      plan.visualCells[entry.cellOrdinal - 1].variantId,
    ),
  );
  const baselines = new Map();
  const staticMotionOutcomes = new Map();
  const summaries = [];
  const announcementSummaries = [];
  const riskStatuses = new Map();
  const transitionStatuses = new Map();
  const representativeFocusStatuses = new Map();
  let observerPeakRssBytes = BigInt(process.memoryUsage().rss);
  let unexpectedEgressCount = 0;
  let operationalError;
  let inertBoundaryProved = false;
  try {
    assertAttemptActive();
    ownership = reconstructObserverOwnershipFromFrozenIdentities(
      null,
      [web.pid],
      [dirname(process.execPath), HARNESS_BUILD],
      [webIdentity],
    );
    ownershipRegistry = await waitForRoleRegistration(
      null,
      {
        role: "web-server",
        pid: web.pid,
        allowedRoot: dirname(process.execPath),
      },
      ownership.allowedExecutableIdentities,
    );
    const first = plan.visualCells[0];
    await waitFor(
      `${origin}/?fixture=${fixturePresentation(first)}&breakCase=${first.fixtureId}&locale=${first.localeId}&transition=none`,
    );
    await proveHarnessQueryBoundary(origin, plan);
    validateImmutableOwnershipRegistry(
      inspectWindowsProcessSocketSnapshot(),
      ownershipRegistry,
      [],
      ownership.allowedExecutableIdentities,
    );
    writeReadinessReceipt("SERVER_READY", ownershipRegistry, ["web-server"]);
    assertFrozenExecutableIdentityCurrent(driverIdentity, "ChromeDriver");
    assertFrozenExecutableIdentityCurrent(chromeIdentity, "Chrome");
    driver = spawn(DRIVER, [`--port=${driverPort}`, "--allowed-ips=127.0.0.1"], {
      env: safeEnvironment(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    ownership = reconstructObserverOwnershipFromFrozenIdentities(
      ownership,
      [web.pid, driver.pid],
      [dirname(process.execPath), dirname(DRIVER), dirname(CHROME), HARNESS_BUILD],
      [driverIdentity, chromeIdentity],
    );
    ownershipRegistry = await waitForRoleRegistration(
      ownershipRegistry,
      {
        role: "chromedriver",
        pid: driver.pid,
        allowedRoot: dirname(DRIVER),
      },
      ownership.allowedExecutableIdentities,
    );
    const driverLog = boundedLog(driver);
    try {
      await waitFor(`${driverBase}/status`);
    } catch (error) {
      throw new Error(`${error.message}; ${driverLog()}`);
    }
    validateImmutableOwnershipRegistry(
      inspectWindowsProcessSocketSnapshot(),
      ownershipRegistry,
      [],
      ownership.allowedExecutableIdentities,
    );
    writeReadinessReceipt("DRIVER_READY", ownershipRegistry, ["web-server", "chromedriver"]);
    for (const risk of plan.riskIntersections) {
      assertAttemptActive();
      assertFrozenExecutableIdentityCurrent(chromeIdentity, "Chrome session");
      session = await createChromeSession(
        driverBase,
        resolve(RAW, "checks", "risk", risk.cellDigest),
      );
      const audit = await configureAndAuditCell(driverBase, session, origin, risk);
      if (
        (risk.stateId === "ACTIVE" || risk.stateId === "SUBMITTING") &&
        !representativeFocusStatuses.has(risk.stateId)
      ) {
        const radioArrow = await auditRadioArrowBehavior(driverBase, session);
        representativeFocusStatuses.set(
          risk.stateId,
          validateRepresentativeFocusFixture({
            stateId: risk.stateId,
            keyboardTrace: audit.keyboardTrace,
            radioArrow,
          }).status,
        );
      }
      if (!inertBoundaryProved) {
        await proveInertClientBoundary(driverBase, session, origin);
        inertBoundaryProved = true;
      }
      const passed =
        audit.documentScrollWidth <= audit.documentClientWidth &&
        audit.actionReachable &&
        audit.primaryAction.exactIdentityAndName &&
        audit.primaryAction.visible &&
        audit.primaryAction.unoccluded &&
        audit.focusVisible &&
        audit.keyboardOrderPass &&
        audit.landmarkRelationshipPass &&
        audit.namedStatusPass &&
        audit.requiredRegionsPass &&
        (risk.intersectionId !== "long_content_phone_320_zoom_100" ||
          audit.regions.every(
            (region) => region.missing !== true && region.horizontalClipped !== true,
          )) &&
        audit.actionableOverlapPass &&
        audit.contrastPass &&
        audit.minimumTarget >= 44 &&
        (risk.localeId !== "ar-XB" || audit.dir === "rtl") &&
        audit.locale.complete &&
        audit.locale.allPseudoLocalized &&
        (risk.localeId !== "ar-XB" || audit.locale.logicalMirrorPass) &&
        audit.progressValueTextPass &&
        (risk.viewportId !== "compact_landscape_844x390" ||
          (audit.verticalRecovery.primaryVisibleAfterScroll &&
            (audit.verticalRecovery.scrollable ||
              audit.verticalRecovery.documentScrollHeight <=
                audit.verticalRecovery.documentClientHeight))) &&
        (!audit.reducedMotion || (!audit.motionPresent && audit.scrollBehavior === "auto"));
      riskStatuses.set(risk.intersectionId, passed ? "PASS" : "FAIL");
      validateOwnedProcessSnapshot(inspectWindowsProcessSocketSnapshot(), ownership);
      await wd(driverBase, "DELETE", `/session/${session}`);
      session = undefined;
    }
    const transitions = new Map(
      enumerateAcceptedTransitionIdentities().map((entry) => [entry.sequence, entry]),
    );
    for (const family of plan.transitionFamilies) {
      assertAttemptActive();
      const transition = transitions.get(family.representativeSequence);
      if (!transition || transition.transitionDigest !== family.representativeDigest) {
        throw new Error("transition-family representative drifted from the closed plan");
      }
      assertFrozenExecutableIdentityCurrent(chromeIdentity, "Chrome transition session");
      session = await createChromeSession(
        driverBase,
        resolve(RAW, "checks", "transition", family.representativeDigest),
      );
      const breakCase = "missing_optional_explanation";
      const targetPresentation = transitionPresentation(
        transition.targetPresentationId,
        transition.entryContextId,
      );
      const sourcePresentation = new Set(["none", "current_presentation"]).has(
        transition.sourcePresentationId,
      )
        ? targetPresentation
        : transitionPresentation(transition.sourcePresentationId, transition.entryContextId);
      await wd(driverBase, "POST", `/session/${session}/url`, {
        url: `${origin}/?fixture=${sourcePresentation}&breakCase=${breakCase}&locale=en&transition=${family.familyId}`,
      });
      await execute(
        driverBase,
        session,
        `const button=document.querySelector('[data-r4b-transition-intent]');if(!button)return false;button.click();return true;`,
      );
      let observed = null;
      for (let poll = 0; poll < 80 && !observed; poll += 1) {
        observed = await execute(
          driverBase,
          session,
          `const output=document.querySelector('[data-r4b-transition-trace="complete"]');if(!output)return null;const trace=JSON.parse(output.textContent),state=document.querySelector('[data-r4b-transition-state]'),heading=document.querySelector('#r4b-transition-heading'),announcement=document.querySelector('[data-r4b-transition-announcement]');return {trace,domState:state?.getAttribute('data-r4b-transition-state')??null,heading:heading?.textContent??null,announcement:announcement?.textContent??null,focusedId:document.activeElement?.id||document.activeElement?.getAttribute('data-r4b-transition-intent')||null};`,
        );
        if (!observed) await new Promise((accept) => setTimeout(accept, 25));
      }
      const logs = await wd(driverBase, "POST", `/session/${session}/log`, { type: "performance" });
      validatePerformanceNetworkLog(logs, origin);
      const expectedTargetState = transition.targetPresentationId.split(":", 1)[0];
      const expectedNavigationIntent = new Map([
        ["direct_load", "DIRECT_LOAD"],
        ["client_transition", "CLIENT_TRANSITION"],
        ["same_screen_refresh", "REFRESH"],
        ["delayed_preparing_refresh", "DELAYED_REFRESH"],
        ["connectivity_lost_preparing", "NONE"],
        ["connectivity_lost_active", "NONE"],
        ["connectivity_restored_preparing", "REVALIDATE"],
        ["connectivity_restored_active", "REVALIDATE"],
      ]).get(family.familyId);
      const expectedReducerEvents = family.familyId.startsWith("connectivity_lost_")
        ? ["CONNECTIVITY_LOST"]
        : family.familyId === "client_transition"
          ? ["LEAVE"]
          : [];
      const focusMatches =
        observed?.trace?.focusTarget === "transition-heading"
          ? observed.focusedId === "r4b-transition-heading"
          : observed?.focusedId === family.familyId;
      transitionStatuses.set(
        family.familyId,
        observed?.trace?.familyId === family.familyId &&
          observed.trace.targetState === expectedTargetState &&
          observed.domState === expectedTargetState &&
          observed.heading === observed.trace.announcement &&
          observed.announcement === observed.trace.announcement &&
          focusMatches &&
          observed.trace.navigationIntent === expectedNavigationIntent &&
          JSON.stringify(observed.trace.reducerEvents) === JSON.stringify(expectedReducerEvents) &&
          observed.trace.probes?.retrySubmitState === "SUBMITTING" &&
          observed.trace.probes?.retryPrepareState === "PREPARING" &&
          observed.trace.probes?.cancelState === "PREPARING" &&
          observed.trace.probes?.lateConfirmationIgnored === true &&
          observed.trace.probes?.offlineState === "OFFLINE_READ_ONLY" &&
          observed.trace.probes?.restoredState === "ACTIVE" &&
          observed.trace.probes?.answerRetained === true &&
          observed.trace.probes?.answerCleared === true
          ? "PASS"
          : "FAIL",
      );
      validateOwnedProcessSnapshot(inspectWindowsProcessSocketSnapshot(), ownership);
      await wd(driverBase, "DELETE", `/session/${session}`);
      session = undefined;
    }
    assertAttemptActive();
    nvdaWriter = await launchPreparedNvdaWriter(
      manifest,
      preparationReceipt,
      plan.observations[0].observationId,
      expectedObservationSet,
      expectedSpeechContracts[0],
    );
    if (!nvdaWriter) throw new Error("NVDA readiness is required before observation sampling");
    ownership = reconstructObserverOwnershipFromFrozenIdentities(
      ownership,
      [...ownership.rootPids, nvdaWriter.child.pid],
      [...ownership.allowedRoots, NVDA_ADAPTER_PATHS.portable, NVDA_ADAPTER_PATHS.config],
      nvdaWriter.executableIdentities,
    );
    ownershipRegistry = await waitForRoleRegistration(
      ownershipRegistry,
      {
        role: "nvda-writer",
        pid: nvdaWriter.child.pid,
        allowedRoot: NVDA_ADAPTER_PATHS.portable,
      },
      ownership.allowedExecutableIdentities,
    );
    validateImmutableOwnershipRegistry(
      inspectWindowsProcessSocketSnapshot(),
      ownershipRegistry,
      [],
      ownership.allowedExecutableIdentities,
    );
    writeReadinessReceipt("NVDA_READY", ownershipRegistry, [
      "web-server",
      "chromedriver",
      "nvda-writer",
    ]);
    for (const observation of plan.observations) {
      assertAttemptActive();
      const profileRoot = resolve(RAW, "profiles", observation.observationId);
      assertFrozenExecutableIdentityCurrent(chromeIdentity, "Chrome observation session");
      session = await createChromeSession(driverBase, profileRoot);
      await cdp(driverBase, session, "Network.enable");
      const cell = plan.visualCells[observation.cellOrdinal - 1];
      let activeNvdaControl =
        observation.observationId === nvdaWriter?.initialObservationId
          ? nvdaWriter.initialControl
          : null;
      if (nvdaWriter) {
        if (observation.observationId !== nvdaWriter.initialObservationId) {
          const control = createNvdaControl({
            observationId: observation.observationId,
            nativeReceipt: nvdaWriter.child.nativeReceipt,
            expectedObservationIds: expectedObservationSet,
            expectedSpeechContract:
              expectedSpeechContracts[expectedObservationIds.indexOf(observation.observationId)],
          });
          nvdaWriter.child.writeControl(control);
          await waitForNvdaReady(nvdaWriter.child, control);
          activeNvdaControl = control;
        }
      }
      const [width, height] = VIEWPORTS[cell.viewportId];
      await setZoom(driverBase, session, 100);
      await wd(driverBase, "POST", `/session/${session}/window/rect`, {
        width,
        height,
        x: 0,
        y: 0,
      });
      await cdp(driverBase, session, "Emulation.setEmulatedMedia", {
        features: [
          { name: "prefers-color-scheme", value: cell.themeId },
          {
            name: "prefers-reduced-motion",
            value: observation.motionPreferenceId === "reduce" ? "reduce" : "no-preference",
          },
        ],
      });
      const url = `${origin}/?fixture=${fixturePresentation(cell)}&breakCase=${cell.fixtureId}&locale=${cell.localeId}&transition=none`;
      await wd(driverBase, "POST", `/session/${session}/url`, { url });
      await setZoom(driverBase, session, cell.textScaleId.endsWith("200") ? 200 : 100);
      await execute(
        driverBase,
        session,
        `document.documentElement.lang=arguments[0];document.documentElement.dir=arguments[1];return true;`,
        [cell.localeId, cell.localeId === "ar-XB" ? "rtl" : "ltr"],
      );
      await traverseNvdaAcceptanceTargets(driverBase, session);
      const keyboardTrace = await auditKeyboardOrder(driverBase, session);
      const audit = await execute(driverBase, session, `return (${pageScript()})`);
      audit.keyboardTrace = keyboardTrace;
      audit.keyboardOrderPass = audit.keyboardTrace.status === "PASS";
      audit.focusVisible = audit.keyboardTrace.status === "PASS";
      applyKeyboardTraceToAudit(audit, keyboardTrace);
      if (cell.stateId === "CONFIRMED" && !representativeFocusStatuses.has("CONFIRMED")) {
        representativeFocusStatuses.set(
          "CONFIRMED",
          validateRepresentativeFocusFixture({
            stateId: "CONFIRMED",
            keyboardTrace,
            radioArrow: null,
          }).status,
        );
      }
      const screenshot = Buffer.from(
        await wd(driverBase, "GET", `/session/${session}/screenshot`),
        "base64",
      );
      const baselineKey = `${cell.cellDigest}:${observation.motionPreferenceId}`;
      const baseline = baselines.get(baselineKey) ?? screenshot;
      const png = diffPng(baseline, screenshot);
      if (observation.repetition === 1) baselines.set(baselineKey, png.actual);
      else baselines.delete(baselineKey);
      const overflow = {
        horizontalOverflow: audit.documentScrollWidth > audit.documentClientWidth,
        actionReachable: audit.actionReachable,
        primaryAction: audit.primaryAction,
        observedInnerWidth: audit.innerWidth,
        observedInnerHeight: audit.innerHeight,
        namedRegions: audit.regions,
        overlaps: audit.overlaps,
        requiredRegionsPass: audit.requiredRegionsPass,
        actionableOverlapPass: audit.actionableOverlapPass,
        verticalRecovery: audit.verticalRecovery,
        zoomReflowPass:
          !cell.textScaleId.endsWith("200") ||
          audit.documentScrollWidth <= audit.documentClientWidth,
        compactLandscapeVerticalRecovery:
          cell.viewportId !== "compact_landscape_844x390" ||
          (audit.verticalRecovery.primaryVisibleAfterScroll &&
            (audit.verticalRecovery.scrollable ||
              audit.verticalRecovery.documentScrollHeight <=
                audit.verticalRecovery.documentClientHeight) &&
            audit.primaryAction.visible &&
            audit.primaryAction.unoccluded),
      };
      const contrast = {
        status: audit.contrastPass ? "PASS" : "FAIL",
        minimumThresholdRatio: audit.contrastMinimum,
        pairs: audit.contrastPairs,
      };
      const focus = {
        status: audit.keyboardTrace.status,
        expectedStopCount: audit.keyboardTrace.stopCount,
        forward: audit.keyboardTrace.forward,
        reverse: audit.keyboardTrace.reverse,
        primaryAction: audit.primaryAction,
      };
      const announcementSummary = nvdaWriter
        ? await waitForNvdaObservation(
            nvdaWriter.child,
            expectedObservationIds,
            expectedSpeechContracts,
            announcementSummaries.length,
          )
        : {
            observationId: observation.observationId,
            eventCount: 0,
            normalizedTextSha256: createHash("sha256").update("", "utf8").digest("hex"),
            duplicateCount: 0,
            expectedOrderStatus: "BLOCKED",
            oneTimeAnnouncementStatus: "BLOCKED",
          };
      announcementSummaries.push(announcementSummary);
      if (nvdaWriter && activeNvdaControl) {
        const closeControl = createNvdaCloseControl(activeNvdaControl, expectedObservationSet);
        nvdaWriter.child.writeControl(closeControl);
        const idle = await waitForNvdaReady(nvdaWriter.child, closeControl);
        if (idle.status !== "OBSERVATION_IDLE") {
          throw new Error("NVDA observation CLOSE/DRAIN/IDLE barrier did not complete");
        }
      }
      const announcements = jsonBytes(announcementSummary);
      const staticKey = `${cell.cellDigest}:${observation.repetition}`;
      const priorStaticOutcome = staticMotionOutcomes.get(staticKey);
      if (observation.motionPreferenceId === "no-preference") {
        staticMotionOutcomes.set(staticKey, audit.staticOutcome);
      }
      const identicalStaticOutcome =
        observation.motionPreferenceId === "no-preference" ||
        JSON.stringify(priorStaticOutcome) === JSON.stringify(audit.staticOutcome);
      const reduced = {
        mediaMatched: audit.reducedMotion,
        movementPresent: audit.motionPresent,
        computedMotion: audit.motionComputed,
        staticOutcome: audit.staticOutcome,
        identicalStaticOutcome,
        scrollBehavior: audit.scrollBehavior,
        status:
          audit.reducedMotion &&
          (audit.motionPresent || !identicalStaticOutcome || audit.scrollBehavior !== "auto")
            ? "FAIL"
            : "PASS",
      };
      const payloads = [
        png.actual,
        png.baseline,
        png.diff,
        jsonBytes(overflow),
        jsonBytes(contrast),
        jsonBytes(focus),
        announcements,
        jsonBytes(reduced),
      ];
      let maxPng = 0;
      let maxJson = 0;
      let maxText = 0;
      let maxPath = 0;
      for (let index = 0; index < payloads.length; index += 1) {
        const path = artifactPath(observation, observation.artifactKeys[index]);
        const bytes = payloads[index];
        const isPng = index < 3;
        const maximum = isPng
          ? Number(plan.gates.pngEncodedMaxBytes)
          : index === 6
            ? Number(plan.gates.textMaxBytes)
            : Number(plan.gates.jsonMaxBytes);
        writeArtifact(path, bytes, maximum);
        maxPath = Math.max(maxPath, path.length);
        if (isPng) maxPng = Math.max(maxPng, bytes.length);
        else if (index === 6) maxText = bytes.length;
        else maxJson = Math.max(maxJson, bytes.length);
      }
      const logs = await wd(driverBase, "POST", `/session/${session}/log`, { type: "performance" });
      const egress = validatePerformanceNetworkLog(logs, origin).unexpectedEgressCount;
      unexpectedEgressCount += egress;
      validateOwnedProcessSnapshot(inspectWindowsProcessSocketSnapshot(), ownership);
      const gateFailure =
        egress > 0 ||
        png.changedPixels !== 0 ||
        overflow.horizontalOverflow ||
        !audit.actionReachable ||
        !audit.primaryAction.exactIdentityAndName ||
        !audit.primaryAction.visible ||
        !audit.primaryAction.unoccluded ||
        !audit.contrastPass ||
        !audit.keyboardOrderPass ||
        !audit.landmarkRelationshipPass ||
        !audit.namedStatusPass ||
        !audit.requiredRegionsPass ||
        !audit.actionableOverlapPass ||
        (cell.viewportId === "compact_landscape_844x390" &&
          (!audit.verticalRecovery.primaryVisibleAfterScroll ||
            (!audit.verticalRecovery.scrollable &&
              audit.verticalRecovery.documentScrollHeight >
                audit.verticalRecovery.documentClientHeight))) ||
        (cell.textScaleId.endsWith("200") &&
          audit.documentScrollWidth > audit.documentClientWidth) ||
        reduced.status !== "PASS" ||
        !audit.progressValueTextPass ||
        !audit.locale.complete ||
        !audit.locale.allPseudoLocalized ||
        (cell.localeId === "ar-XB" && !audit.locale.logicalMirrorPass);
      summaries.push({
        cellOrdinal: cell.ordinal,
        status: gateFailure ? "FAIL" : "PASS",
        audit,
        overflow,
        reduced,
        metrics: {
          maxPngEncodedBytes: String(maxPng),
          maxPngDecodedBytes: String(png.decodedBytes),
          maxJsonBytes: String(maxJson),
          maxTextBytes: String(maxText),
          maxPhysicalKeyChars: Math.max(...observation.artifactKeys.map((key) => key.length)),
          maxFullPathChars: maxPath,
          cleanRepeatChangedPixels: png.changedPixels,
          pngNormalization: plan.gates.pngNormalization,
        },
      });
      observerPeakRssBytes =
        observerPeakRssBytes > BigInt(process.memoryUsage().rss)
          ? observerPeakRssBytes
          : BigInt(process.memoryUsage().rss);
      await wd(driverBase, "DELETE", `/session/${session}`);
      session = undefined;
    }
    if (
      ["ACTIVE", "SUBMITTING", "CONFIRMED"].some(
        (stateId) => representativeFocusStatuses.get(stateId) !== "PASS",
      )
    ) {
      throw new Error("representative native keyboard fixture failed");
    }
  } catch (error) {
    operationalError = new Error(`${error.message}; web=${webLog()}`);
  } finally {
    try {
      if (session && driver) await wd(driverBase, "DELETE", `/session/${session}`).catch(() => {});
      if (nvdaWriter)
        await stopNvdaWriter(
          nvdaWriter,
          ownershipRegistry,
          exactPhaseExecutableIdentities(ownership, [nvdaWriter.executable]),
        );
      if (driver)
        await terminateRegisteredOwnedChild(
          driver,
          registryForRole(ownershipRegistry, "chromedriver"),
          "chromedriver",
          inspectWindowsProcessSocketSnapshot,
          [],
          exactPhaseExecutableIdentities(ownership, [DRIVER, CHROME]),
        );
      await terminateRegisteredOwnedChild(
        web,
        registryForRole(ownershipRegistry, "web-server"),
        "web-server",
        inspectWindowsProcessSocketSnapshot,
        [],
        exactPhaseExecutableIdentities(ownership, [process.execPath]),
      );
      if (ownership)
        assertNoOwnedProcessesOrSockets(inspectWindowsProcessSocketSnapshot(), ownership);
    } catch (error) {
      recordFailedHeld("OWNERSHIP_CLEANUP_FAILED");
      operationalError ??= error;
    }
  }
  const completedMatrix = fillUnattemptedObservationStatuses(
    plan,
    summaries,
    announcementSummaries,
  );
  summaries.splice(0, summaries.length, ...completedMatrix.observations);
  announcementSummaries.splice(0, announcementSummaries.length, ...completedMatrix.announcements);
  const checks = [];
  for (let index = 0; index < plan.observations.length; index += 1)
    checks.push({
      checkId: `observation:${plan.observations[index].observationId}`,
      status: summaries[index].status,
      metrics: summaries[index].metrics,
    });
  const all = (predicate, ordinals = null) =>
    summaries.filter((entry) => !ordinals || ordinals.includes(entry.cellOrdinal)).every(predicate);
  const accessStatus = operationalError
    ? new Map(plan.accessibilityChecks.map((check) => [check.checkId, "UNATTEMPTED"]))
    : new Map([
        [
          "semantic_heading_and_landmarks",
          all(
            (s) =>
              s.audit.headingCount > 0 &&
              s.audit.mainCount === 1 &&
              s.audit.landmarkRelationshipPass &&
              s.audit.namedStatusPass,
          )
            ? "PASS"
            : "FAIL",
        ],
        [
          "keyboard_forward_and_reverse_order",
          all((s) => s.audit.keyboardOrderPass) ? "PASS" : "FAIL",
        ],
        ["visible_noncolor_focus", all((s) => s.audit.focusVisible) ? "PASS" : "FAIL"],
        [
          "primary_action_reachable",
          all(
            (s) =>
              s.audit.actionReachable &&
              s.audit.primaryAction.exactIdentityAndName &&
              s.audit.primaryAction.visible &&
              s.audit.primaryAction.unoccluded,
          )
            ? "PASS"
            : "FAIL",
        ],
        [
          "target_size_minimum_44_css_px",
          all((s) => s.audit.minimumTarget >= 44) ? "PASS" : "FAIL",
        ],
        [
          "browser_zoom_200_reflow",
          all(
            (s) =>
              s.audit.documentScrollWidth <= s.audit.documentClientWidth &&
              s.overflow.zoomReflowPass,
            plan.accessibilityChecks[5].targetCellOrdinals,
          )
            ? "PASS"
            : "FAIL",
        ],
        [
          "rtl_direction_and_logical_mirroring",
          all(
            (s) => s.audit.dir === "rtl" && s.audit.locale.logicalMirrorPass,
            plan.accessibilityChecks[6].targetCellOrdinals,
          )
            ? "PASS"
            : "FAIL",
        ],
        [
          "one_time_announcement_deduplication",
          announcementSummaries.every(
            (entry) =>
              entry.expectedOrderStatus === "PASS" && entry.oneTimeAnnouncementStatus === "PASS",
          )
            ? "PASS"
            : announcementSummaries.some((entry) => entry.expectedOrderStatus === "BLOCKED")
              ? "BLOCKED"
              : "FAIL",
        ],
        [
          "progress_name_value_and_text",
          all(
            (s) => s.audit.progressNamed && s.audit.progressValued && s.audit.progressValueTextPass,
          )
            ? "PASS"
            : "FAIL",
        ],
        [
          "reduced_motion_static_equivalent",
          all((s) => s.reduced.status === "PASS") ? "PASS" : "FAIL",
        ],
      ]);
  for (const check of plan.accessibilityChecks)
    checks.push({
      checkId: `accessibility:${check.checkId}`,
      status: accessStatus.get(check.checkId),
      metrics: null,
    });
  for (const risk of plan.riskIntersections)
    checks.push({
      checkId: `risk:${risk.intersectionId}`,
      status: riskStatuses.get(risk.intersectionId) ?? "UNATTEMPTED",
      metrics: null,
    });
  for (const family of plan.transitionFamilies)
    checks.push({
      checkId: `transition-family:${family.familyId}`,
      status: transitionStatuses.get(family.familyId) ?? "UNATTEMPTED",
      metrics: null,
    });
  const rawInventory = inventoryExactOwnedTree(RAW, RAW);
  const sampleDistinctCellCount = 30n;
  const sampleObservationCount = 120n;
  const sampleObservationArtifactFileCount = 960n;
  const fullRunCellCount = 10800n;
  const fullRunArtifactCount = 86400n;
  const diskScaleNumerator = fullRunCellCount;
  const diskScaleDenominator = sampleDistinctCellCount;
  const diskSafetyFactorNumerator = 2n;
  const diskSafetyFactorDenominator = 1n;
  if (
    fullRunCellCount % sampleDistinctCellCount !== 0n ||
    diskSafetyFactorNumerator % diskSafetyFactorDenominator !== 0n ||
    sampleObservationCount * BigInt(PREFLIGHT_ARTIFACT_IDS.length) !==
      sampleObservationArtifactFileCount ||
    fullRunCellCount * BigInt(PREFLIGHT_ARTIFACT_IDS.length) !== fullRunArtifactCount
  ) {
    throw new Error("capacity projection is not exactly divisible or artifact counts drifted");
  }
  const conservativeFullRunDiskBudgetBytes =
    rawInventory.bytes *
    (diskScaleNumerator / diskScaleDenominator) *
    (diskSafetyFactorNumerator / diskSafetyFactorDenominator);
  const aggregate = {
    schema: "fluyo:r4b:preflight-synthetic-observation-aggregate:v2",
    creditable: false,
    evidenceStatus: "NON_EVIDENCE",
    productSourceCommit: plan.sourceCommit,
    authorityDigest: attempt.digest,
    planDigest: discardedPreflightPlanDigest(plan),
    networkIsolationStatus: !operationalError && unexpectedEgressCount === 0 ? "PASS" : "FAIL",
    unexpectedEgressCount,
    observerPeakRssBytes: String(observerPeakRssBytes),
    sampleRawInventoryLogicalBytes: String(rawInventory.bytes),
    sampleDistinctCellCount: String(sampleDistinctCellCount),
    sampleObservationCount: String(sampleObservationCount),
    sampleObservationArtifactFileCount: String(sampleObservationArtifactFileCount),
    fullRunCellCount: String(fullRunCellCount),
    fullRunArtifactCount: String(fullRunArtifactCount),
    diskScaleNumerator: String(diskScaleNumerator),
    diskScaleDenominator: String(diskScaleDenominator),
    diskSafetyFactorNumerator: String(diskSafetyFactorNumerator),
    diskSafetyFactorDenominator: String(diskSafetyFactorDenominator),
    conservativeFullRunDiskBudgetBytes: String(conservativeFullRunDiskBudgetBytes),
    announcements: announcementSummaries,
    checks,
  };
  validateSyntheticObservationAggregate(aggregate, plan);
  const bytes = jsonBytes(aggregate);
  if (bytes.length > Number(plan.gates.jsonMaxBytes))
    throw new Error("aggregate exceeds JSON gate");
  guardedAttemptMkdir(RUNTIME, { recursive: true });
  guardedAttemptWrite(AGGREGATE, bytes, { flag: "wx" });
  if (operationalError && !existsSync(ATTEMPT_002_PATHS.failedHeld)) {
    recordFailedHeld("OBSERVATION_FAILED");
  } else if (!operationalError) {
    recordAttempt002Observed();
  }
  return aggregate;
}

export async function prepareAttempt002Runtime(...args) {
  if (args.length) throw new Error("preparation does not accept caller-supplied authority");
  const controller = new AbortController();
  const abortForSignal = (signalName) => () =>
    controller.abort(new Error(`attempt-002 preparation cancelled by ${signalName}`));
  const onSigint = abortForSignal("SIGINT");
  const onSigterm = abortForSignal("SIGTERM");
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);
  const timer = setTimeout(
    () => controller.abort(new Error("attempt-002 preparation exceeded the global 300000ms bound")),
    300_000,
  );
  timer.unref?.();
  activeAttemptSignal = controller.signal;
  try {
    return await prepareAttempt002RuntimeInternal();
  } finally {
    activeAttemptSignal = undefined;
    clearTimeout(timer);
    process.removeListener("SIGINT", onSigint);
    process.removeListener("SIGTERM", onSigterm);
  }
}

export async function observeDiscardedPreflight(...args) {
  if (args.length) throw new Error("observer does not accept caller-supplied authority");
  const controller = new AbortController();
  const abortForSignal = (signalName) => () =>
    controller.abort(new Error(`attempt-002 cancelled by ${signalName}`));
  const onSigint = abortForSignal("SIGINT");
  const onSigterm = abortForSignal("SIGTERM");
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);
  const timer = setTimeout(
    () => controller.abort(new Error("attempt-002 exceeded the global 3600000ms bound")),
    GLOBAL_ATTEMPT_TIMEOUT_MS,
  );
  timer.unref?.();
  activeAttemptSignal = controller.signal;
  try {
    return await observeDiscardedPreflightInternal();
  } catch (error) {
    recoverNativeFailure(error, "OBSERVATION_TRANSACTION_FAILED");
    const state = currentAttempt002LifecycleState();
    if (
      new Set([
        "PREPARING",
        "PREPARED",
        "OBSERVING",
        "SERVER_READY",
        "DRIVER_READY",
        "NVDA_READY",
      ]).has(state)
    ) {
      try {
        recordFailedHeld("OBSERVATION_TRANSACTION_FAILED");
      } catch (holdError) {
        throw new AggregateError([error, holdError], "attempt-002 observation and hold failed");
      }
    }
    throw error;
  } finally {
    activeAttemptSignal = undefined;
    clearTimeout(timer);
    process.removeListener("SIGINT", onSigint);
    process.removeListener("SIGTERM", onSigterm);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  observeDiscardedPreflight(...process.argv.slice(2))
    .then((aggregate) => {
      process.stdout.write(
        `${JSON.stringify({ schema: "fluyo:r4b:preflight-observer-summary:v1", checks: aggregate.checks.length, status: "READY_FOR_EXECUTOR" })}\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
