import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  createReadStream,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statfsSync,
  renameSync,
  writeSync,
  writeFileSync,
} from "node:fs";
import { arch as hostArchitecture } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const POLICY_ID = "ios_17_5_runtime_bootstrap_v1";
export const DIAGNOSTIC_MODE = "PR94_IOS_XCODE_PRECONDITION_DIAGNOSTIC_V1_2";
export const EXPECTED_XCODE_VERSION = "16.2";
export const EXPECTED_XCODE_BUILD = "16C5032a";
export const XCODE_DEVELOPER_DIR = "/Applications/Xcode_16.2.app/Contents/Developer";
export const XCODEBUILD = `${XCODE_DEVELOPER_DIR}/usr/bin/xcodebuild`;
export const XCRUN = `${XCODE_DEVELOPER_DIR}/usr/bin/xcrun`;
export const PS = "/bin/ps";
export const XCODE_ARGS = Object.freeze([
  "-downloadPlatform",
  "iOS",
  "-buildVersion",
  "17.5",
  "-architectureVariant",
  "arm64",
]);
export const CATALOG_TUPLE =
  '{"artifactIdentifier":"com.apple.dmg.iPhoneSimulatorSDK17_5","catalogVersion":"17.5.0.0","contentType":"diskImage","fileSizeBytes":7336630623,"name":"iOS 17.5 Simulator Runtime","platform":"com.apple.platform.iphoneos","simulatorBuild":"21F79","version":"17.5"}';
export const CATALOG_TUPLE_SHA256 =
  "27c0b7cd887423ccf4ac33c0378accc9b4e659adab748e6b0e66f009b8da0510";
export const CATALOG_PAYLOAD_BYTES = 7_336_630_623n;
export const REQUIRED_FREE_RESERVE_BYTES = 2_147_483_648n;
export const MIN_FREE_BEFORE_BYTES = 9_484_114_271n;
export const MIN_FREE_AFTER_ACQUIRE_BYTES = 2_147_483_648n;
export const MIN_FREE_AFTER_CLEANUP_BYTES = 2_147_483_648n;
export const MAX_ACQUIRE_DISK_DELTA_BYTES = 11_811_160_064n;
export const MAX_ATTEMPT_ROOT_BYTES = 268_435_456;
export const MAX_COMBINED_CAPTURE_BYTES = 4_194_304;
export const ACQUIRE_TIMEOUT_MS = 1_200_000;
export const CLEANUP_TIMEOUT_MS = 300_000;
export const PROBE_TIMEOUT_MS = 30_000;
export const TERM_GRACE_MS = 10_000;
export const KILL_GRACE_MS = 10_000;
export const PREFLIGHT_TIMEOUT_MS = 120_000;
export const MINIMUM_EVIDENCE_TIMEOUT_MS = 720_000;
export const FINALIZATION_TIMEOUT_MS = 30_000;
export const TOTAL_TRANSACTION_TIMEOUT_MS = 2_370_000;
export const CLEANUP_FINAL_RESERVE_MS = 330_000;
export const WORKFLOW_STEP_TIMEOUT_MS = 2_520_000;
export const WORKFLOW_MARGIN_MS = 150_000;
export const MAX_MINIMUM_WORK_ROOT_BYTES = 4_294_967_296;
export const MAX_COMBINED_OWNED_ROOT_BYTES = 4_563_402_752;
export const MAX_SCAN_ENTRIES = 100_000;
export const MAX_SCAN_DURATION_MS = 1_000;
export const DISK_MONITOR_INTERVAL_MS = 250;
export const DISK_MONITOR_MAX_GAP_MS = 1_000;
export const DISK_MONITOR_MAX_TICKS = 4_802;
export const PS_TIMEOUT_MS = 2_000;
export const PS_STDOUT_MAX_BYTES = 4_096;
export const PS_STDERR_MAX_BYTES = 1_024;
export const CHILD_GATE_TIMEOUT_MS = 5_000;
export const CHILD_CLOSE_WAIT_MS = 7_000;
export const CHILD_GATE_RELEASE_BYTES = 32;
export const CHILD_GATE_READY = "READY_V1\n";
export const MAX_CONTROLLER_SOURCE_BYTES = 262_144;
export const MAX_RECEIPT_BYTES = 8_192;
export const PARENT_TITLE = "fluyo-ios17-bootstrap-parent-v1";
export const CHILD_TITLE_PREFIX = "fluyo-ios17-bootstrap-child-v1-";
export const IOS_CI_SOURCE_BYTES = 17_695;
export const IOS_CI_SOURCE_SHA256 =
  "8de79ce3d2715f68b23930d4e4b601dba232494e789338d25405a5b065248c0c";
export const SAFE_CANONICAL_PATH = /^\/[A-Za-z0-9._/+\-]+$/u;

const SOURCE_SHA = /^[0-9a-f]{40}$/u;
const RUNTIME_IDENTIFIER = /^com\.apple\.CoreSimulator\.SimRuntime\.[A-Za-z0-9.-]+$/u;
const ASCII_LINE = /^[\x20-\x7e]+$/u;
const PS_LINE =
  /^(\d+)\s+(\d+)\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [ 0-3]\d \d{2}:\d{2}:\d{2} \d{4})\s+(.+)$/u;
const EXPECTED_COMMAND_TOKENS = Object.freeze([XCODEBUILD, ...XCODE_ARGS]);
const RECEIPT_FIELDS = Object.freeze([
  "schemaVersion",
  "policyId",
  "sourceCommit",
  "runId",
  "runAttempt",
  "runnerImageOs",
  "runnerImageVersion",
  "runnerArch",
  "hostArch",
  "diagnosticMode",
  "expectedVersion",
  "expectedBuild",
  "observedVersion",
  "observedBuild",
  "artifactTupleSha256",
  "artifactIdentifier",
  "artifactVersion",
  "artifactBuild",
  "artifactFileSizeBytes",
  "catalogObservationDate",
  "runtimeIdentifier",
  "runtimeVersion",
  "runtimeBuild",
  "requestedArchitectureVariant",
  "state",
  "primaryFailureCode",
  "cleanupFailureCode",
  "downloadInvocationCount",
  "downloadResult",
  "minimumEvidenceResult",
  "cleanupResult",
  "durationMs",
  "freeBytesBefore",
  "freeBytesAfterAcquire",
  "freeBytesAfterMinimumEvidence",
  "freeBytesAfterCleanup",
  "minimumFreeBytesObserved",
  "acquireDiskDeltaBytes",
  "diskMonitorSampleCount",
  "preExactRuntimeCount",
  "postAcquireExactRuntimeCount",
  "postCleanupExactRuntimeCount",
  "rawLogRetained",
  "runtimeRetained",
  "fallbackUsed",
]);
const STATES = new Set([
  "PRECONDITION_REJECTED",
  "ACQUIRE_FAILED_CLEAN",
  "TEST_FAILED_CLEAN",
  "TRANSACTION_SUCCEEDED_CLEANED",
  "FINALIZATION_FAILED_CLEAN",
  "CLEANUP_FAILED",
]);
const DOWNLOAD_RESULTS = new Set(["NOT_ATTEMPTED", "FAILED", "SUCCEEDED"]);
const MINIMUM_EVIDENCE_RESULTS = new Set(["NOT_RUN", "FAILED", "SUCCEEDED"]);
const CLEANUP_RESULTS = new Set(["NOT_REQUIRED", "SUCCEEDED", "FAILED"]);
const PRIMARY_FAILURE_CODES = new Set([
  "NONE",
  "PRECONDITION_RUN_ATTEMPT",
  "PRECONDITION_RUNNER",
  "PRECONDITION_SOURCE",
  "PRECONDITION_XCODE_VERSION_PROBE",
  "PRECONDITION_XCODE_VERSION_PARSE",
  "PRECONDITION_SIMCTL_FIND_SPAWN",
  "PRECONDITION_SIMCTL_FIND_INVALID_PID",
  "PRECONDITION_SIMCTL_FIND_IDENTITY_AFTER_SETTLEMENT",
  "PRECONDITION_SIMCTL_FIND_TIMEOUT",
  "PRECONDITION_SIMCTL_FIND_OUTPUT_LIMIT",
  "PRECONDITION_SIMCTL_FIND_EXIT",
  "PRECONDITION_SIMCTL_FIND_UTF8",
  "PRECONDITION_SIMCTL_FIND_PATH",
  "PRECONDITION_XCODE_VERSION_INTERNAL",
  "PRECONDITION_SIMCTL_FIND_INTERNAL",
  "PRECONDITION_XCODE_DIAGNOSTIC_READY",
  "PRECONDITION_ENV",
  "PRECONDITION_PROVENANCE",
  "PRECONDITION_DISK",
  "PRECONDITION_RUNTIME_ALREADY_PRESENT",
  "PRECONDITION_RUNTIME_INVENTORY",
  "PRECONDITION_STORAGE_ANCHOR",
  "PRECONDITION_PARENT_IDENTITY",
  "PRECONDITION_INSUFFICIENT_TIME",
  "PRECONDITION_INTERRUPTED",
  "ACQUIRE_INSUFFICIENT_TIME",
  "ACQUIRE_TIMEOUT",
  "ACQUIRE_OUTPUT_LIMIT",
  "ACQUIRE_EXIT",
  "ACQUIRE_INTERRUPTED",
  "ACQUIRE_PROCESS_IDENTITY_PROBE_TIMEOUT",
  "ACQUIRE_PROCESS_IDENTITY_OUTPUT_LIMIT",
  "ACQUIRE_PROCESS_IDENTITY_EXIT",
  "ACQUIRE_PROCESS_IDENTITY_GRAMMAR",
  "ACQUIRE_EXIT_BEFORE_IDENTITY",
  "ACQUIRE_PROCESS_IDENTITY",
  "ACQUIRE_PROCESS_SIGNAL",
  "ACQUIRE_PROCESS_GROUP_RESIDUE",
  "ACQUIRE_DISK_FLOOR",
  "ACQUIRE_DISK_LIMIT",
  "ACQUIRE_DISK_MONITOR",
  "ACQUIRE_STORAGE_IDENTITY",
  "POST_RUNTIME_CARDINALITY",
  "POST_RUNTIME_IDENTITY",
  "POST_RUNTIME_VERSION_BUILD",
  "POST_RUNTIME_STORAGE_VOLUME",
  "MINIMUM_EVIDENCE_INSUFFICIENT_TIME",
  "MINIMUM_EVIDENCE_SOURCE_IDENTITY",
  "MINIMUM_EVIDENCE_TIMEOUT",
  "MINIMUM_EVIDENCE_OUTPUT_LIMIT",
  "MINIMUM_EVIDENCE_EXIT",
  "MINIMUM_EVIDENCE_INTERRUPTED",
  "MINIMUM_EVIDENCE_PROCESS_IDENTITY",
  "MINIMUM_EVIDENCE_PROCESS_SIGNAL",
  "MINIMUM_EVIDENCE_PROCESS_GROUP_RESIDUE",
  "MINIMUM_EVIDENCE_DISK_FLOOR",
  "MINIMUM_EVIDENCE_DISK_LIMIT",
  "MINIMUM_EVIDENCE_MONITOR",
  "MINIMUM_EVIDENCE_ROOT_LIMIT",
  "FINALIZATION_INTERRUPTED",
]);
const CLEANUP_FAILURE_CODES = new Set([
  "NONE",
  "CLEANUP_PROCESS_IDENTITY",
  "CLEANUP_STORAGE_IDENTITY",
  "CLEANUP_DELETE_FAILED",
  "CLEANUP_RESIDUE",
  "CLEANUP_RAW_RESIDUE",
  "CLEANUP_RECEIPT_INVALID",
  "CLEANUP_INTERRUPTED",
  "CLEANUP_DISK_FLOOR",
  "CLEANUP_DISK_LIMIT",
]);
const FORBIDDEN_ENV_NAME = /(?:proxy|credential|token|cookie|password|secret|authorization)/iu;
const XCODE_PROBE_FAILURE_CODES = new Set(["PRECONDITION_XCODE_VERSION_PROBE"]);
const XCODE_DIAGNOSTIC_FAILURE_CODES = new Set([
  "PRECONDITION_XCODE_VERSION_PROBE",
  "PRECONDITION_XCODE_VERSION_PARSE",
  "PRECONDITION_SIMCTL_FIND_SPAWN",
  "PRECONDITION_SIMCTL_FIND_INVALID_PID",
  "PRECONDITION_SIMCTL_FIND_IDENTITY_AFTER_SETTLEMENT",
  "PRECONDITION_SIMCTL_FIND_TIMEOUT",
  "PRECONDITION_SIMCTL_FIND_OUTPUT_LIMIT",
  "PRECONDITION_SIMCTL_FIND_EXIT",
  "PRECONDITION_SIMCTL_FIND_UTF8",
  "PRECONDITION_SIMCTL_FIND_PATH",
  "PRECONDITION_XCODE_VERSION_INTERNAL",
  "PRECONDITION_SIMCTL_FIND_INTERNAL",
  "PRECONDITION_XCODE_DIAGNOSTIC_READY",
]);
const PRECONDITION_STAGE_VALUES = Object.freeze([
  "INITIAL",
  "RUNNER",
  "PARENT_IDENTITY",
  "SOURCE",
  "ROOTS",
  "XCODE_VERSION_PROBE",
  "XCODE_VERSION_PARSE",
  "SIMCTL_FIND_V2",
  "SIMCTL_FIND_PATH",
  "RUNTIME_INVENTORY",
  "STORAGE_ANCHOR",
  "DISK",
  "TIME_BUDGET",
]);
const PRECONDITION_STAGE_FAILURE = Object.freeze({
  INITIAL: "PRECONDITION_ENV",
  RUNNER: "PRECONDITION_RUNNER",
  PARENT_IDENTITY: "PRECONDITION_PARENT_IDENTITY",
  SOURCE: "PRECONDITION_SOURCE",
  ROOTS: "PRECONDITION_ENV",
  XCODE_VERSION_PROBE: "PRECONDITION_XCODE_VERSION_INTERNAL",
  XCODE_VERSION_PARSE: "PRECONDITION_XCODE_VERSION_INTERNAL",
  SIMCTL_FIND_V2: "PRECONDITION_SIMCTL_FIND_INTERNAL",
  SIMCTL_FIND_PATH: "PRECONDITION_SIMCTL_FIND_INTERNAL",
  RUNTIME_INVENTORY: "PRECONDITION_RUNTIME_INVENTORY",
  STORAGE_ANCHOR: "PRECONDITION_STORAGE_ANCHOR",
  DISK: "PRECONDITION_DISK",
  TIME_BUDGET: "PRECONDITION_INSUFFICIENT_TIME",
});

export class BootstrapFailure extends Error {
  constructor(code) {
    super(code);
    this.name = "BootstrapFailure";
    this.code = code;
  }
}

function fail(code) {
  throw new BootstrapFailure(code);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function exactKeys(value, keys) {
  return (
    value &&
    Object.getPrototypeOf(value) === Object.prototype &&
    JSON.stringify(Object.keys(value)) === JSON.stringify(keys)
  );
}

function safeNumber(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail("RECEIPT_INVALID");
  return value;
}

function bigintToSafeNumber(value) {
  if (typeof value !== "bigint" || value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail("ACQUIRE_DISK_MONITOR");
  }
  return Number(value);
}

function within(path, root) {
  const value = relative(root, path);
  return value !== "" && !value.startsWith(`..${sep}`) && value !== ".." && !isAbsolute(value);
}

export function assertCatalogTuple() {
  if (Buffer.byteLength(CATALOG_TUPLE, "utf8") !== 261) fail("PRECONDITION_PROVENANCE");
  if (sha256(Buffer.from(CATALOG_TUPLE, "utf8")) !== CATALOG_TUPLE_SHA256) {
    fail("PRECONDITION_PROVENANCE");
  }
  return Object.freeze(JSON.parse(CATALOG_TUPLE));
}

export function closedChildEnvironment(env, attemptRoot) {
  for (const key of Object.keys(env)) {
    if (FORBIDDEN_ENV_NAME.test(key)) fail("PRECONDITION_ENV");
  }
  const home = env.HOME;
  if (typeof home !== "string" || !isAbsolute(home) || home.includes("\0")) {
    fail("PRECONDITION_ENV");
  }
  return Object.freeze({
    DEVELOPER_DIR: XCODE_DEVELOPER_DIR,
    HOME: home,
    TMPDIR: attemptRoot,
    PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    LANG: "en_US.UTF-8",
    LC_ALL: "en_US.UTF-8",
  });
}

export function validateRunnerEnvironment(
  env,
  actualHead,
  platform = process.platform,
  arch = hostArchitecture(),
) {
  if (
    platform !== "darwin" ||
    arch !== "arm64" ||
    env.RUNNER_OS !== "macOS" ||
    env.RUNNER_ARCH !== "ARM64" ||
    env.ImageOS !== "macos15" ||
    !/^[0-9]{8}\.[0-9]{4}\.[0-9]+$/u.test(env.ImageVersion ?? "") ||
    env.ImageVersion.length > 32
  ) {
    fail("PRECONDITION_RUNNER");
  }
  if (env.GITHUB_RUN_ATTEMPT !== "1" || !/^\d{1,20}$/u.test(env.GITHUB_RUN_ID ?? "")) {
    fail("PRECONDITION_RUN_ATTEMPT");
  }
  if (!SOURCE_SHA.test(env.FLUYO_SOURCE_SHA ?? "") || env.FLUYO_SOURCE_SHA !== actualHead) {
    fail("PRECONDITION_SOURCE");
  }
  return true;
}

export function parseDetachedHead(repositoryRoot) {
  const dotGit = join(repositoryRoot, ".git");
  const stat = lstatSync(dotGit);
  let headPath;
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    headPath = join(dotGit, "HEAD");
  } else if (stat.isFile() && !stat.isSymbolicLink()) {
    const pointer = readFileSync(dotGit, "utf8").trim();
    if (!pointer.startsWith("gitdir: ")) fail("PRECONDITION_SOURCE");
    const gitDir = resolve(repositoryRoot, pointer.slice(8));
    headPath = join(gitDir, "HEAD");
  } else {
    fail("PRECONDITION_SOURCE");
  }
  const head = readFileSync(headPath, "utf8").trim();
  if (!SOURCE_SHA.test(head)) fail("PRECONDITION_SOURCE");
  return head;
}

export function parseXcodeVersion(value) {
  const match = /^Xcode 16\.2\nBuild version 16C5032a\n?$/u.exec(value);
  if (!match) fail("PRECONDITION_XCODE_VERSION_PARSE");
  return Object.freeze({ version: EXPECTED_XCODE_VERSION, build: EXPECTED_XCODE_BUILD });
}

function runtimeBuild(row) {
  return row.buildversion ?? row.buildVersion;
}

export function parseRuntimeInventory(raw, failureCode = "PRECONDITION_RUNTIME_INVENTORY") {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail(failureCode);
  }
  if (!parsed || !Array.isArray(parsed.runtimes) || parsed.runtimes.length > 4096)
    fail(failureCode);
  return Object.freeze(
    parsed.runtimes.map((row) => {
      if (!row || Object.getPrototypeOf(row) !== Object.prototype) {
        fail(failureCode);
      }
      return Object.freeze({
        identifier: row.identifier,
        name: row.name,
        version: row.version,
        build: runtimeBuild(row),
        available: row.isAvailable === true,
        bundlePath: row.bundlePath,
        runtimeRoot: row.runtimeRoot,
      });
    }),
  );
}

function canonicalDirectory(path, fs = {}) {
  const realpath = fs.realpath ?? realpathSync.native;
  const lstat = fs.lstat ?? lstatSync;
  if (typeof path !== "string" || !isAbsolute(path) || path.includes("\0")) {
    fail("PRECONDITION_STORAGE_ANCHOR");
  }
  const canonical = realpath(path);
  const info = lstat(canonical, { bigint: true });
  if (!info.isDirectory() || info.isSymbolicLink()) fail("PRECONDITION_STORAGE_ANCHOR");
  return { canonical, info };
}

export function discoverStorageAnchor(inventory, forbiddenPaths, fs = {}) {
  const candidates = [];
  for (const row of inventory) {
    if (!row.available || typeof row.identifier !== "string" || !row.identifier.includes(".iOS-")) {
      continue;
    }
    for (const emittedPath of [row.bundlePath, row.runtimeRoot]) {
      const { canonical } = canonicalDirectory(emittedPath, fs);
      let current = canonical;
      let anchor = null;
      while (true) {
        if (basename(current) === "CoreSimulator") {
          anchor = current;
          break;
        }
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
      }
      if (!anchor) fail("PRECONDITION_STORAGE_ANCHOR");
      candidates.push(anchor);
    }
  }
  const unique = [...new Set(candidates)].sort();
  if (unique.length !== 1) fail("PRECONDITION_STORAGE_ANCHOR");
  const anchor = canonicalDirectory(unique[0], fs);
  const forbidden = new Set(forbiddenPaths.map((item) => (item ? resolve(item) : item)));
  for (const fixed of ["/", "/System", "/Library", "/Applications", "/Users"]) forbidden.add(fixed);
  if (forbidden.has(anchor.canonical)) fail("PRECONDITION_STORAGE_ANCHOR");
  return Object.freeze({ path: anchor.canonical, dev: anchor.info.dev, ino: anchor.info.ino });
}

export function bindStorageAnchor(inventory, forbiddenPaths, observations, dependencies = {}) {
  const open = dependencies.open ?? openSync;
  const close = dependencies.close ?? closeSync;
  const discover = dependencies.discover ?? discoverStorageAnchor;
  let candidateFd = null;
  let binding;
  try {
    const anchor = discover(inventory, forbiddenPaths, dependencies.fs);
    candidateFd = open(
      anchor.path,
      fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
    );
    binding = { ...anchor, fd: candidateFd };
    const freeBefore = sampleHeldFilesystem(
      binding,
      0n,
      observations,
      dependencies.fs,
      () => {},
      false,
    );
    candidateFd = null;
    return Object.freeze({ binding, freeBefore });
  } catch {
    if (candidateFd !== null) close(candidateFd);
    observations.minimumFree = null;
    observations.maximumDelta = 0n;
    observations.samples = 0;
    throw new BootstrapFailure("PRECONDITION_STORAGE_ANCHOR");
  }
}

export function exactRuntimeRows(inventory) {
  return inventory.filter(
    (row) => row.available && row.version === "17.5" && row.build === "21F79",
  );
}

export function validatePostInventory(pre, post, anchor, fs = {}) {
  if (exactRuntimeRows(pre).length !== 0) fail("PRECONDITION_RUNTIME_ALREADY_PRESENT");
  const rows = exactRuntimeRows(post);
  if (rows.length !== 1) fail("POST_RUNTIME_CARDINALITY");
  const row = rows[0];
  if (!RUNTIME_IDENTIFIER.test(row.identifier ?? "")) fail("POST_RUNTIME_IDENTITY");
  const withoutNew = post.filter((item) => item.identifier !== row.identifier);
  if (JSON.stringify(withoutNew) !== JSON.stringify(pre)) fail("POST_RUNTIME_CARDINALITY");
  for (const emittedPath of [row.bundlePath, row.runtimeRoot]) {
    const first = canonicalDirectory(emittedPath, fs);
    if (!within(first.canonical, anchor.path) || first.info.dev !== anchor.dev) {
      fail("POST_RUNTIME_STORAGE_VOLUME");
    }
    let current = first.canonical;
    while (current !== anchor.path) {
      const info = (fs.lstat ?? lstatSync)(current, { bigint: true });
      if (info.isSymbolicLink()) fail("POST_RUNTIME_STORAGE_VOLUME");
      current = dirname(current);
    }
    const second = canonicalDirectory(emittedPath, fs);
    if (
      first.canonical !== second.canonical ||
      first.info.dev !== second.info.dev ||
      first.info.ino !== second.info.ino
    ) {
      fail("POST_RUNTIME_STORAGE_VOLUME");
    }
  }
  return row;
}

export function sampleHeldFilesystem(
  binding,
  beforeBytes,
  observations,
  fs = {},
  onSample = () => {},
  enforceBounds = true,
) {
  const fstat = fs.fstat ?? fstatSync;
  const lstat = fs.lstat ?? lstatSync;
  const statfs = fs.statfs ?? statfsSync;
  const verify = () => {
    const held = fstat(binding.fd, { bigint: true });
    const named = lstat(binding.path, { bigint: true });
    if (
      !held.isDirectory() ||
      !named.isDirectory() ||
      named.isSymbolicLink() ||
      held.dev !== binding.dev ||
      held.ino !== binding.ino ||
      named.dev !== binding.dev ||
      named.ino !== binding.ino
    ) {
      fail("ACQUIRE_STORAGE_IDENTITY");
    }
  };
  verify();
  const values = statfs(binding.path, { bigint: true });
  if (
    typeof values.bavail !== "bigint" ||
    typeof values.bsize !== "bigint" ||
    values.bavail < 0n ||
    values.bsize <= 0n
  ) {
    fail("ACQUIRE_DISK_MONITOR");
  }
  const free = values.bavail * values.bsize;
  verify();
  const delta = beforeBytes > free ? beforeBytes - free : 0n;
  observations.minimumFree =
    observations.minimumFree == null || free < observations.minimumFree
      ? free
      : observations.minimumFree;
  observations.maximumDelta =
    observations.maximumDelta == null || delta > observations.maximumDelta
      ? delta
      : observations.maximumDelta;
  observations.samples += 1;
  onSample(free);
  if (enforceBounds && free < MIN_FREE_AFTER_ACQUIRE_BYTES) fail("ACQUIRE_DISK_FLOOR");
  if (enforceBounds && delta > MAX_ACQUIRE_DISK_DELTA_BYTES) fail("ACQUIRE_DISK_LIMIT");
  return free;
}

export function parsePsIdentity(
  stdout,
  requestedPid,
  expectedCommandTokens = EXPECTED_COMMAND_TOKENS,
) {
  if (
    Buffer.byteLength(stdout, "utf8") > PS_STDOUT_MAX_BYTES ||
    stdout.includes("\0") ||
    stdout.split(/\r?\n/u).filter(Boolean).length !== 1
  ) {
    fail("ACQUIRE_PROCESS_IDENTITY_OUTPUT_LIMIT");
  }
  const line = stdout.trim();
  if (!ASCII_LINE.test(line)) fail("ACQUIRE_PROCESS_IDENTITY_GRAMMAR");
  const match = PS_LINE.exec(line);
  if (!match) fail("ACQUIRE_PROCESS_IDENTITY_GRAMMAR");
  const pid = Number(match[1]);
  const pgid = Number(match[2]);
  if (
    !Number.isSafeInteger(pid) ||
    pid < 1 ||
    pid > 2_147_483_647 ||
    pid !== requestedPid ||
    pgid !== pid
  ) {
    fail("ACQUIRE_PROCESS_IDENTITY_GRAMMAR");
  }
  const commandTokens = match[4].split(" ");
  if (JSON.stringify(commandTokens) !== JSON.stringify(expectedCommandTokens)) {
    fail("ACQUIRE_PROCESS_IDENTITY_GRAMMAR");
  }
  return Object.freeze({ pid, pgid, executable: expectedCommandTokens[0], startTime: match[3] });
}

function childLifecycle(child) {
  let resolveSettlement;
  let resolveClose;
  let resolveLaunch;
  let settled = false;
  let launchState = "PENDING";
  const settlement = new Promise((resolve) => {
    resolveSettlement = resolve;
  });
  const close = new Promise((resolve) => {
    resolveClose = resolve;
  });
  const launch = new Promise((resolve) => {
    resolveLaunch = resolve;
  });
  const terminalLaunch = (value) => {
    if (launchState !== "PENDING") return false;
    launchState = value.state;
    resolveLaunch(Object.freeze({ ...value }));
    return true;
  };
  const onSpawn = () => {
    terminalLaunch({ state: "SPAWNED" });
  };
  const onError = () => {
    terminalLaunch({ state: "ERROR" });
    if (settled) return;
    settled = true;
    resolveSettlement(Object.freeze({ code: null, signal: null, error: true }));
  };
  const onClose = (code, signal) => {
    const value = Object.freeze({ code, signal, error: false });
    terminalLaunch({ state: "CLOSE", result: value });
    if (!settled) {
      settled = true;
      resolveSettlement(value);
    }
    child.off("spawn", onSpawn);
    child.off("error", onError);
    child.off("close", onClose);
    resolveClose(value);
  };
  child.once("spawn", onSpawn);
  child.on("error", onError);
  child.once("close", onClose);
  return Object.freeze({
    settlement,
    close,
    launch,
    terminalLaunch,
    get launchState() {
      return launchState;
    },
  });
}

async function awaitActualClose(closePromise, milliseconds, dependencies = {}) {
  let timer;
  const timedOut = Object.freeze({ timedOut: true });
  const result = await Promise.race([
    closePromise,
    new Promise((resolveTimeout) => {
      timer = (dependencies.setTimeout ?? setTimeout)(() => resolveTimeout(timedOut), milliseconds);
      timer.unref?.();
    }),
  ]);
  clearTimeout(timer);
  return result === timedOut ? null : result;
}

async function rejectInvalidSpawn(lifecycle, exitCode, dependencies = {}) {
  if (!(await awaitActualClose(lifecycle.close, CHILD_CLOSE_WAIT_MS, dependencies)))
    throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
  fail(exitCode);
}

function capturedText(chunks, failureCode) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    fail(failureCode);
  }
}

function directGroupAbsent(pgid, dependencies = {}) {
  try {
    (dependencies.kill ?? process.kill)(-pgid, 0);
  } catch (error) {
    if (error?.code === "ESRCH") return true;
    throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
  }
  throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
}

async function runPsVerifier(args, limits, dependencies = {}) {
  const spawnProcess = dependencies.spawnPs ?? dependencies.spawn ?? spawn;
  let child;
  try {
    child = spawnProcess(PS, args, {
      cwd: "/",
      env: { LANG: "C", LC_ALL: "C" },
      shell: false,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    fail(limits.exitCode);
  }
  const lifecycle = childLifecycle(child);
  if (!Number.isSafeInteger(child.pid) || child.pid < 1 || child.pid > 2_147_483_647)
    await rejectInvalidSpawn(lifecycle, limits.exitCode, dependencies);
  const stdout = [];
  const stderr = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let failureCode = null;
  let resolveFailure;
  const failure = new Promise((resolveFailurePromise) => {
    resolveFailure = resolveFailurePromise;
  });
  const latch = (code) => {
    if (failureCode !== null) return;
    failureCode = code;
    resolveFailure({ failure: true });
  };
  const add = (bucket, chunk, which) => {
    const value = Buffer.from(chunk);
    if (which === "stdout") stdoutBytes += value.length;
    else stderrBytes += value.length;
    if (stdoutBytes > limits.stdout || stderrBytes > limits.stderr) {
      latch(limits.outputCode);
      return;
    }
    bucket.push(value);
  };
  child.stdout?.on("data", (chunk) => add(stdout, chunk, "stdout"));
  child.stderr?.on("data", (chunk) => add(stderr, chunk, "stderr"));
  const timer = (dependencies.setTimeout ?? setTimeout)(
    () => latch(limits.timeoutCode),
    limits.timeout,
  );
  timer.unref?.();
  const first = await Promise.race([
    lifecycle.settlement.then((value) => ({ settlement: value })),
    failure,
  ]);
  if (first.failure) {
    if (child.exitCode == null && child.signalCode == null) {
      try {
        (dependencies.kill ?? process.kill)(-child.pid, "SIGKILL");
      } catch (error) {
        if (error?.code !== "ESRCH")
          throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
      }
    }
    if (!(await awaitActualClose(lifecycle.close, KILL_GRACE_MS, dependencies)))
      throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
  } else if (!(await awaitActualClose(lifecycle.close, CHILD_CLOSE_WAIT_MS, dependencies))) {
    throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
  }
  clearTimeout(timer);
  directGroupAbsent(child.pid, dependencies);
  const result = first.settlement ?? (await lifecycle.settlement);
  if (failureCode !== null) fail(failureCode);
  if (result.error || result.code !== 0 || result.signal != null) fail(limits.exitCode);
  return Object.freeze({
    stdout: capturedText(stdout, limits.exitCode),
    stderr: capturedText(stderr, limits.exitCode),
  });
}

async function runCaptured(command, args, options, limits, dependencies = {}) {
  const diagnosticCode = limits.diagnosticCode ?? null;
  if (diagnosticCode !== null && !XCODE_PROBE_FAILURE_CODES.has(diagnosticCode))
    throw new TypeError("invalid diagnostic probe code");
  const spawnProcess = dependencies.spawn ?? spawn;
  let child;
  try {
    child = spawnProcess(command, args, {
      ...options,
      shell: false,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    fail(diagnosticCode ?? limits.exitCode);
  }
  const lifecycle = childLifecycle(child);
  if (!Number.isSafeInteger(child.pid) || child.pid < 1 || child.pid > 2_147_483_647)
    await rejectInvalidSpawn(lifecycle, diagnosticCode ?? limits.exitCode, dependencies);
  const stdout = [];
  const stderr = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let failureCode = null;
  let resolveFailure;
  const failure = new Promise((resolveFailurePromise) => {
    resolveFailure = resolveFailurePromise;
  });
  const latch = (code) => {
    if (failureCode !== null) return;
    failureCode = code;
    resolveFailure({ failure: true });
  };
  const add = (bucket, chunk, which) => {
    const value = Buffer.from(chunk);
    if (which === "stdout") stdoutBytes += value.length;
    else stderrBytes += value.length;
    if (stdoutBytes > limits.stdout || stderrBytes > limits.stderr) {
      latch(limits.outputCode);
      return;
    }
    bucket.push(value);
  };
  child.stdout?.on("data", (chunk) => add(stdout, chunk, "stdout"));
  child.stderr?.on("data", (chunk) => add(stderr, chunk, "stderr"));
  const timer = (dependencies.setTimeout ?? setTimeout)(
    () => latch(limits.timeoutCode),
    limits.timeout,
  );
  timer.unref?.();
  let captured;
  try {
    captured = await (dependencies.probeIdentity ?? probeProcessIdentity)(
      child.pid,
      [command, ...args],
      dependencies,
    );
  } catch {
    clearTimeout(timer);
    if (child.exitCode == null && child.signalCode == null)
      throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
    if (!(await awaitActualClose(lifecycle.close, CHILD_CLOSE_WAIT_MS, dependencies)))
      throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
    directGroupAbsent(child.pid, dependencies);
    fail(diagnosticCode ?? limits.exitCode);
  }
  const first = await Promise.race([
    lifecycle.settlement.then((value) => ({ settlement: value })),
    failure,
  ]);
  if (first.failure) {
    try {
      await terminateVerifiedProcessGroup(
        child,
        lifecycle.close,
        captured,
        [command, ...args],
        dependencies,
      );
    } catch (error) {
      if (
        error instanceof BootstrapFailure &&
        [
          "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
          "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD",
        ].includes(error.code)
      )
        throw error;
      throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
    }
  } else if (!(await awaitActualClose(lifecycle.close, CHILD_CLOSE_WAIT_MS, dependencies))) {
    throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
  }
  const result = first.settlement ?? (await lifecycle.settlement);
  clearTimeout(timer);
  try {
    assertProcessGroupAbsent(captured.pgid, dependencies);
  } catch {
    throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
  }
  if (failureCode !== null) fail(failureCode);
  if (result.error || result.code !== 0 || result.signal != null) fail(limits.exitCode);
  return Object.freeze({
    stdout: capturedText(stdout, limits.exitCode),
    stderr: capturedText(stderr, limits.exitCode),
  });
}

const SIMCTL_FIND_PROFILE = "SIMCTL_FIND_V2";
const SIMCTL_FIND_TOKENS = Object.freeze([XCRUN, "--find", "simctl"]);

function parseSimctlFindIdentity(stdout, requestedPid) {
  if (
    Buffer.byteLength(stdout, "utf8") > PS_STDOUT_MAX_BYTES ||
    stdout.includes("\0") ||
    stdout.split(/\r?\n/u).filter(Boolean).length !== 1
  ) {
    fail("PRECONDITION_SIMCTL_FIND_INTERNAL");
  }
  const line = stdout.trim();
  const match =
    /^(\d+)\s+(\d+)\s+(\d+)\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [ 0-3]\d \d{2}:\d{2}:\d{2} \d{4})\s+(.+)$/u.exec(
      line,
    );
  if (!match || !ASCII_LINE.test(line)) fail("PRECONDITION_SIMCTL_FIND_INTERNAL");
  const pid = Number(match[1]);
  const ppid = Number(match[2]);
  const pgid = Number(match[3]);
  const commandTokens = match[5].split(" ");
  if (
    pid !== requestedPid ||
    pgid !== pid ||
    !Number.isSafeInteger(ppid) ||
    ppid < 1 ||
    ppid > 2_147_483_647 ||
    JSON.stringify(commandTokens) !== JSON.stringify(SIMCTL_FIND_TOKENS)
  ) {
    fail("PRECONDITION_SIMCTL_FIND_INTERNAL");
  }
  return Object.freeze({
    pid,
    pgid,
    ppid,
    executable: XCRUN,
    startToken: match[4],
    commandTokens: Object.freeze([...commandTokens]),
  });
}

async function probeSimctlFindIdentity(pid, _expectedTokens, dependencies = {}) {
  const result = await runPsVerifier(
    [
      "-ww",
      "-p",
      String(pid),
      "-o",
      "pid=",
      "-o",
      "ppid=",
      "-o",
      "pgid=",
      "-o",
      "lstart=",
      "-o",
      "command=",
    ],
    {
      timeout: PS_TIMEOUT_MS,
      stdout: PS_STDOUT_MAX_BYTES,
      stderr: PS_STDERR_MAX_BYTES,
      timeoutCode: "PRECONDITION_SIMCTL_FIND_INTERNAL",
      outputCode: "PRECONDITION_SIMCTL_FIND_INTERNAL",
      exitCode: "PRECONDITION_SIMCTL_FIND_INTERNAL",
    },
    dependencies,
  );
  if (result.stderr !== "") fail("PRECONDITION_SIMCTL_FIND_INTERNAL");
  return parseSimctlFindIdentity(result.stdout, pid);
}

function validatedSimctlFindOutput(stdoutChunks, stderrChunks, dependencies = {}) {
  const stdout = capturedText(stdoutChunks, "PRECONDITION_SIMCTL_FIND_UTF8");
  const stderr = capturedText(stderrChunks, "PRECONDITION_SIMCTL_FIND_UTF8");
  if (stderr !== "") fail("PRECONDITION_SIMCTL_FIND_EXIT");
  const candidate = stdout.trim();
  let canonical;
  try {
    canonical = (dependencies.realpath ?? realpathSync.native)(candidate);
  } catch {
    fail("PRECONDITION_SIMCTL_FIND_PATH");
  }
  if (
    !SAFE_CANONICAL_PATH.test(candidate) ||
    canonical !== candidate ||
    !within(canonical, XCODE_DEVELOPER_DIR)
  ) {
    fail("PRECONDITION_SIMCTL_FIND_PATH");
  }
  return Object.freeze({ stdout: `${canonical}\n`, stderr: "" });
}

async function runSimctlFindV2(options, dependencies = {}) {
  const spawnProcess = dependencies.spawn ?? spawn;
  let child;
  try {
    child = spawnProcess(XCRUN, ["--find", "simctl"], {
      ...options,
      shell: false,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    fail("PRECONDITION_SIMCTL_FIND_SPAWN");
  }
  const lifecycle = childLifecycle(child);
  const stdout = [];
  const stderr = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let acceptOutput = true;
  let abortEvidence = null;
  let identityState = "PENDING";
  let preIdentityAbort = false;
  let resolveAbort;
  const abort = new Promise((resolveAbortPromise) => {
    resolveAbort = resolveAbortPromise;
  });
  const zeroizeOutput = () => {
    acceptOutput = false;
    stdout.splice(0).forEach((chunk) => chunk.fill(0));
    stderr.splice(0).forEach((chunk) => chunk.fill(0));
    stdoutBytes = 0;
    stderrBytes = 0;
  };
  const latchAbort = (reason) => {
    if (abortEvidence !== null) return false;
    abortEvidence = reason;
    if (identityState !== "CAPTURED") preIdentityAbort = true;
    zeroizeOutput();
    resolveAbort(Object.freeze({ reason }));
    return true;
  };
  const add = (bucket, chunk, which) => {
    if (!acceptOutput) return;
    const value = Buffer.from(chunk);
    if (which === "stdout") stdoutBytes += value.length;
    else stderrBytes += value.length;
    if (stdoutBytes > 4096 || stderrBytes > 1024) {
      value.fill(0);
      latchAbort("OUTPUT_LIMIT");
      return;
    }
    bucket.push(value);
  };
  child.stdout?.on("data", (chunk) => add(stdout, chunk, "stdout"));
  child.stderr?.on("data", (chunk) => add(stderr, chunk, "stderr"));
  const timer = (dependencies.setTimeout ?? setTimeout)(
    () => latchAbort("TIMEOUT"),
    PROBE_TIMEOUT_MS,
  );
  timer.unref?.();
  const cancelTarget = dependencies.signalTarget ?? process;
  const onCancel = () => latchAbort("CANCELLED");
  cancelTarget.on("SIGINT", onCancel);
  cancelTarget.on("SIGTERM", onCancel);
  const clearObservers = () => {
    clearTimeout(timer);
    cancelTarget.off("SIGINT", onCancel);
    cancelTarget.off("SIGTERM", onCancel);
  };
  const awaitCloseAndAbsence = async (pid) => {
    if (!(await awaitActualClose(lifecycle.close, CHILD_CLOSE_WAIT_MS, dependencies))) {
      throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
    }
    if (!Number.isSafeInteger(pid) || pid < 1 || pid > 2_147_483_647) {
      throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
    }
    try {
      directGroupAbsent(pid, dependencies);
    } catch {
      throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
    }
  };
  const failForAbort = async (pid) => {
    await awaitCloseAndAbsence(pid);
    if (abortEvidence === "CANCELLED") {
      throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
    }
    fail(
      abortEvidence === "OUTPUT_LIMIT"
        ? "PRECONDITION_SIMCTL_FIND_OUTPUT_LIMIT"
        : "PRECONDITION_SIMCTL_FIND_TIMEOUT",
    );
  };

  try {
    const launch = await Promise.race([
      lifecycle.launch,
      abort.then(() => Object.freeze({ state: "ABORTED" })),
    ]);
    if (launch.state === "ABORTED") {
      const closeObservation = awaitActualClose(lifecycle.close, CHILD_CLOSE_WAIT_MS, dependencies);
      const observedLaunch = await Promise.race([
        lifecycle.launch,
        closeObservation.then((closed) =>
          Object.freeze({ state: closed ? "CLOSE" : "OBSERVATION_EXPIRED" }),
        ),
      ]);
      if (observedLaunch.state === "ERROR") {
        if (!(await closeObservation)) {
          throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
        }
        fail("PRECONDITION_SIMCTL_FIND_SPAWN");
      }
      if (observedLaunch.state === "CLOSE") {
        fail("PRECONDITION_SIMCTL_FIND_INVALID_PID");
      }
      throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
    }
    if (launch.state === "ERROR") {
      if (!(await awaitActualClose(lifecycle.close, CHILD_CLOSE_WAIT_MS, dependencies))) {
        throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
      }
      fail("PRECONDITION_SIMCTL_FIND_SPAWN");
    }
    if (launch.state === "CLOSE") fail("PRECONDITION_SIMCTL_FIND_INVALID_PID");
    if (!Number.isSafeInteger(child.pid) || child.pid < 1 || child.pid > 2_147_483_647) {
      if (!(await awaitActualClose(lifecycle.close, CHILD_CLOSE_WAIT_MS, dependencies))) {
        throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
      }
      fail("PRECONDITION_SIMCTL_FIND_INVALID_PID");
    }

    const identityDependencies = Object.freeze({
      ...dependencies,
      probeIdentity: probeSimctlFindIdentity,
    });
    const identity = Promise.resolve()
      .then(() =>
        (dependencies.probeSimctlIdentity ?? probeSimctlFindIdentity)(
          child.pid,
          SIMCTL_FIND_TOKENS,
          dependencies,
        ),
      )
      .then(
        (captured) => {
          if (preIdentityAbort) return Object.freeze({ state: "ABORTED" });
          identityState = "CAPTURED";
          return Object.freeze({ state: "CAPTURED", captured });
        },
        () => {
          if (abortEvidence !== null) return Object.freeze({ state: "ABORTED" });
          identityState = "FAILED";
          return Object.freeze({ state: "FAILED" });
        },
      );
    const first = await Promise.race([
      identity,
      abort.then(() => Object.freeze({ state: "ABORTED" })),
      lifecycle.settlement.then((result) => Object.freeze({ state: "SETTLED", result })),
    ]);

    if (first.state === "ABORTED" || preIdentityAbort) {
      await identity;
      await failForAbort(child.pid);
    }

    let identityOutcome = first.state === "CAPTURED" || first.state === "FAILED" ? first : null;
    if (first.state === "SETTLED") {
      identityOutcome = await identity;
      if (preIdentityAbort) await failForAbort(child.pid);
    }
    if (identityOutcome?.state === "FAILED") {
      await awaitCloseAndAbsence(child.pid);
      if (abortEvidence !== null || preIdentityAbort) await failForAbort(child.pid);
      const result = await lifecycle.settlement;
      if (result.error || result.code !== 0 || result.signal != null || stderrBytes !== 0) {
        fail("PRECONDITION_SIMCTL_FIND_EXIT");
      }
      return validatedSimctlFindOutput(stdout, stderr, dependencies);
    }

    const captured = identityOutcome.captured;
    const completion = await Promise.race([
      lifecycle.settlement.then((result) => Object.freeze({ state: "SETTLED", result })),
      abort.then(() => Object.freeze({ state: "ABORTED" })),
    ]);
    if (completion.state === "ABORTED") {
      await terminateVerifiedProcessGroup(
        child,
        lifecycle.close,
        captured,
        SIMCTL_FIND_TOKENS,
        identityDependencies,
      );
      if (abortEvidence === "CANCELLED") fail("PRECONDITION_INTERRUPTED");
      fail(
        abortEvidence === "OUTPUT_LIMIT"
          ? "PRECONDITION_SIMCTL_FIND_OUTPUT_LIMIT"
          : "PRECONDITION_SIMCTL_FIND_TIMEOUT",
      );
    }
    if (!(await awaitActualClose(lifecycle.close, CHILD_CLOSE_WAIT_MS, dependencies))) {
      throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
    }
    try {
      assertProcessGroupAbsent(captured.pgid, dependencies);
    } catch {
      throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
    }
    const result = completion.result;
    if (result.error || result.code !== 0 || result.signal != null || stderrBytes !== 0) {
      fail("PRECONDITION_SIMCTL_FIND_EXIT");
    }
    return validatedSimctlFindOutput(stdout, stderr, dependencies);
  } finally {
    clearObservers();
  }
}

export async function probeProcessIdentity(
  pid,
  expectedCommandTokens = EXPECTED_COMMAND_TOKENS,
  dependencies = {},
) {
  if (!Number.isSafeInteger(pid) || pid < 1 || pid > 2_147_483_647) {
    fail("ACQUIRE_PROCESS_IDENTITY_GRAMMAR");
  }
  const result = await runPsVerifier(
    ["-ww", "-p", String(pid), "-o", "pid=", "-o", "pgid=", "-o", "lstart=", "-o", "command="],
    {
      timeout: PS_TIMEOUT_MS,
      stdout: PS_STDOUT_MAX_BYTES,
      stderr: PS_STDERR_MAX_BYTES,
      timeoutCode: "ACQUIRE_PROCESS_IDENTITY_PROBE_TIMEOUT",
      outputCode: "ACQUIRE_PROCESS_IDENTITY_OUTPUT_LIMIT",
      exitCode: "ACQUIRE_PROCESS_IDENTITY_EXIT",
    },
    dependencies,
  );
  if (result.stderr !== "") fail("ACQUIRE_PROCESS_IDENTITY_EXIT");
  return parsePsIdentity(result.stdout, pid, expectedCommandTokens);
}

function sameIdentity(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function signalVerifiedProcessGroup(
  child,
  captured,
  signal,
  expectedCommandTokens = EXPECTED_COMMAND_TOKENS,
  dependencies = {},
) {
  const proveCapturedGroupAbsent = () => {
    try {
      assertProcessGroupAbsent(captured.pgid, dependencies);
    } catch {
      throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
    }
  };
  if (child.exitCode != null || child.signalCode != null) {
    proveCapturedGroupAbsent();
    return false;
  }
  let current;
  try {
    current = await (dependencies.probeIdentity ?? probeProcessIdentity)(
      child.pid,
      expectedCommandTokens,
      dependencies,
    );
  } catch {
    if (child.exitCode != null || child.signalCode != null) {
      proveCapturedGroupAbsent();
      return false;
    }
    throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
  }
  if (!sameIdentity(current, captured)) {
    if (child.exitCode != null || child.signalCode != null) {
      proveCapturedGroupAbsent();
      return false;
    }
    throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
  }
  if (child.exitCode != null || child.signalCode != null) {
    proveCapturedGroupAbsent();
    return false;
  }
  try {
    (dependencies.kill ?? process.kill)(-captured.pgid, signal);
  } catch (error) {
    if (error?.code === "ESRCH") {
      proveCapturedGroupAbsent();
      return false;
    }
    throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
  }
  return true;
}

export async function terminateVerifiedProcessGroup(
  child,
  closePromise,
  captured,
  expectedCommandTokens = EXPECTED_COMMAND_TOKENS,
  dependencies = {},
) {
  if (child.exitCode != null || child.signalCode != null) {
    if (!(await awaitActualClose(closePromise, CHILD_CLOSE_WAIT_MS, dependencies)))
      throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
    try {
      assertProcessGroupAbsent(captured.pgid, dependencies);
    } catch {
      throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
    }
    return;
  }
  await signalVerifiedProcessGroup(child, captured, "SIGTERM", expectedCommandTokens, dependencies);
  if (await awaitActualClose(closePromise, TERM_GRACE_MS, dependencies)) {
    try {
      assertProcessGroupAbsent(captured.pgid, dependencies);
    } catch {
      throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
    }
    return;
  }
  await signalVerifiedProcessGroup(child, captured, "SIGKILL", expectedCommandTokens, dependencies);
  if (!(await awaitActualClose(closePromise, KILL_GRACE_MS, dependencies)))
    throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
  try {
    assertProcessGroupAbsent(captured.pgid, dependencies);
  } catch {
    throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
  }
}

export function assertProcessGroupAbsent(pgid, dependencies = {}) {
  try {
    (dependencies.kill ?? process.kill)(-pgid, 0);
  } catch (error) {
    if (error?.code === "ESRCH") return true;
    fail("ACQUIRE_PROCESS_IDENTITY");
  }
  fail("ACQUIRE_PROCESS_GROUP_RESIDUE");
}

function validateReceiptPhaseEvidence(receipt) {
  const diskSlots = [
    receipt.freeBytesBefore,
    receipt.freeBytesAfterAcquire,
    receipt.freeBytesAfterMinimumEvidence,
    receipt.freeBytesAfterCleanup,
    receipt.minimumFreeBytesObserved,
  ];
  const runtimeTriple = [receipt.runtimeIdentifier, receipt.runtimeVersion, receipt.runtimeBuild];
  const hasRuntime = runtimeTriple.every((value) => value !== null);
  const hasNoRuntime = runtimeTriple.every((value) => value === null);
  if (!hasRuntime && !hasNoRuntime) fail("RECEIPT_INVALID");
  if (receipt.downloadInvocationCount === 1 && receipt.preExactRuntimeCount !== 0)
    fail("RECEIPT_INVALID");
  if (
    receipt.downloadInvocationCount === 1 &&
    receipt.cleanupResult === "SUCCEEDED" &&
    receipt.postCleanupExactRuntimeCount !== 0
  )
    fail("RECEIPT_INVALID");
  if (hasRuntime && receipt.postAcquireExactRuntimeCount !== 1) fail("RECEIPT_INVALID");
  const nullDiskEvidence = () =>
    diskSlots.every((value) => value === null) &&
    receipt.acquireDiskDeltaBytes === 0 &&
    receipt.diskMonitorSampleCount === 0;
  if (receipt.primaryFailureCode === "PRECONDITION_PARENT_IDENTITY") {
    if (
      receipt.preExactRuntimeCount !== null ||
      receipt.postAcquireExactRuntimeCount !== null ||
      receipt.postCleanupExactRuntimeCount !== null ||
      !hasNoRuntime ||
      !nullDiskEvidence()
    )
      fail("RECEIPT_INVALID");
  }
  if (receipt.primaryFailureCode === "PRECONDITION_INSUFFICIENT_TIME") {
    if (
      receipt.preExactRuntimeCount !== 0 ||
      receipt.postAcquireExactRuntimeCount !== null ||
      receipt.postCleanupExactRuntimeCount !== null ||
      !hasNoRuntime ||
      receipt.freeBytesBefore == null ||
      receipt.freeBytesBefore < Number(MIN_FREE_BEFORE_BYTES) ||
      receipt.freeBytesAfterAcquire !== null ||
      receipt.freeBytesAfterMinimumEvidence !== null ||
      receipt.freeBytesAfterCleanup !== null ||
      receipt.minimumFreeBytesObserved !== receipt.freeBytesBefore ||
      receipt.acquireDiskDeltaBytes !== 0 ||
      receipt.diskMonitorSampleCount !== 1
    )
      fail("RECEIPT_INVALID");
  }
  if (receipt.primaryFailureCode === "PRECONDITION_RUNTIME_INVENTORY") {
    if (
      receipt.preExactRuntimeCount !== null ||
      receipt.postAcquireExactRuntimeCount !== null ||
      receipt.postCleanupExactRuntimeCount !== null ||
      !hasNoRuntime ||
      !nullDiskEvidence()
    )
      fail("RECEIPT_INVALID");
  }
  if (receipt.primaryFailureCode === "PRECONDITION_STORAGE_ANCHOR") {
    if (
      receipt.preExactRuntimeCount !== 0 ||
      receipt.postAcquireExactRuntimeCount !== null ||
      receipt.postCleanupExactRuntimeCount !== null ||
      !hasNoRuntime ||
      !nullDiskEvidence()
    )
      fail("RECEIPT_INVALID");
  }
  if (receipt.primaryFailureCode === "PRECONDITION_RUNTIME_ALREADY_PRESENT") {
    if (
      receipt.preExactRuntimeCount == null ||
      receipt.preExactRuntimeCount < 1 ||
      receipt.postAcquireExactRuntimeCount !== null ||
      receipt.postCleanupExactRuntimeCount !== null ||
      !hasNoRuntime ||
      !nullDiskEvidence()
    )
      fail("RECEIPT_INVALID");
  }
  if (receipt.primaryFailureCode === "PRECONDITION_DISK") {
    if (
      receipt.preExactRuntimeCount !== 0 ||
      receipt.freeBytesBefore == null ||
      receipt.freeBytesBefore < 0 ||
      receipt.freeBytesBefore >= Number(MIN_FREE_BEFORE_BYTES) ||
      receipt.minimumFreeBytesObserved !== receipt.freeBytesBefore ||
      receipt.freeBytesAfterAcquire !== null ||
      receipt.freeBytesAfterMinimumEvidence !== null ||
      receipt.freeBytesAfterCleanup !== null ||
      receipt.acquireDiskDeltaBytes !== 0 ||
      receipt.diskMonitorSampleCount < 1
    )
      fail("RECEIPT_INVALID");
  }
  const floor = Number(MIN_FREE_AFTER_ACQUIRE_BYTES);
  const maximumDelta = Number(MAX_ACQUIRE_DISK_DELTA_BYTES);
  const phaseDiskEvidence = [
    {
      slot: receipt.freeBytesAfterAcquire,
      floorCode: receipt.primaryFailureCode === "ACQUIRE_DISK_FLOOR",
      limitCode: receipt.primaryFailureCode === "ACQUIRE_DISK_LIMIT",
    },
    {
      slot: receipt.freeBytesAfterMinimumEvidence,
      floorCode: receipt.primaryFailureCode === "MINIMUM_EVIDENCE_DISK_FLOOR",
      limitCode: receipt.primaryFailureCode === "MINIMUM_EVIDENCE_DISK_LIMIT",
    },
    {
      slot: receipt.freeBytesAfterCleanup,
      floorCode: receipt.cleanupFailureCode === "CLEANUP_DISK_FLOOR",
      limitCode: receipt.cleanupFailureCode === "CLEANUP_DISK_LIMIT",
    },
  ];
  for (const evidence of phaseDiskEvidence) {
    if (evidence.floorCode && (evidence.slot == null || evidence.slot >= floor))
      fail("RECEIPT_INVALID");
    if (
      evidence.limitCode &&
      (evidence.slot == null || receipt.acquireDiskDeltaBytes <= maximumDelta)
    )
      fail("RECEIPT_INVALID");
    if (evidence.slot != null && evidence.slot < floor && !evidence.floorCode)
      fail("RECEIPT_INVALID");
  }
  const exactFloorCode =
    receipt.primaryFailureCode === "PRECONDITION_DISK" ||
    phaseDiskEvidence.some((evidence) => evidence.floorCode);
  const exactLimitCode = phaseDiskEvidence.some((evidence) => evidence.limitCode);
  if (
    receipt.minimumFreeBytesObserved != null &&
    receipt.minimumFreeBytesObserved < floor &&
    !exactFloorCode
  )
    fail("RECEIPT_INVALID");
  if (receipt.acquireDiskDeltaBytes > maximumDelta && !exactLimitCode) fail("RECEIPT_INVALID");
  if (
    receipt.cleanupFailureCode === "CLEANUP_DISK_FLOOR" &&
    (receipt.minimumFreeBytesObserved == null || receipt.minimumFreeBytesObserved >= floor)
  )
    fail("RECEIPT_INVALID");
  if (
    receipt.cleanupFailureCode === "CLEANUP_DISK_LIMIT" &&
    receipt.acquireDiskDeltaBytes <= maximumDelta
  )
    fail("RECEIPT_INVALID");
  const cleanupPostSampleRequired = new Set([
    "CLEANUP_PROCESS_IDENTITY",
    "CLEANUP_DELETE_FAILED",
    "CLEANUP_RAW_RESIDUE",
    "CLEANUP_RECEIPT_INVALID",
  ]);
  const cleanupPreSampleNullable = new Set([
    "CLEANUP_INTERRUPTED",
    "CLEANUP_RESIDUE",
    "CLEANUP_STORAGE_IDENTITY",
  ]);
  if (
    receipt.downloadInvocationCount === 1 &&
    cleanupPostSampleRequired.has(receipt.cleanupFailureCode) &&
    (receipt.freeBytesAfterCleanup == null || receipt.freeBytesAfterCleanup < floor)
  )
    fail("RECEIPT_INVALID");
  if (
    receipt.state === "CLEANUP_FAILED" &&
    receipt.freeBytesAfterCleanup == null &&
    !cleanupPreSampleNullable.has(receipt.cleanupFailureCode) &&
    !(receipt.downloadInvocationCount === 0 && receipt.cleanupFailureCode === "CLEANUP_RAW_RESIDUE")
  )
    fail("RECEIPT_INVALID");
  if (receipt.downloadInvocationCount === 1) {
    if (
      receipt.freeBytesBefore == null ||
      receipt.freeBytesBefore < Number(MIN_FREE_BEFORE_BYTES) ||
      receipt.freeBytesAfterAcquire == null ||
      (receipt.primaryFailureCode !== "ACQUIRE_DISK_FLOOR" &&
        receipt.freeBytesAfterAcquire < Number(MIN_FREE_AFTER_ACQUIRE_BYTES))
    )
      fail("RECEIPT_INVALID");
    if (receipt.minimumEvidenceResult === "NOT_RUN") {
      if (receipt.freeBytesAfterMinimumEvidence !== null) fail("RECEIPT_INVALID");
    } else if (
      receipt.freeBytesAfterMinimumEvidence == null ||
      (receipt.primaryFailureCode !== "MINIMUM_EVIDENCE_DISK_FLOOR" &&
        receipt.freeBytesAfterMinimumEvidence < Number(MIN_FREE_AFTER_ACQUIRE_BYTES))
    ) {
      fail("RECEIPT_INVALID");
    }
    if (
      receipt.cleanupResult === "SUCCEEDED" &&
      (receipt.freeBytesAfterCleanup == null ||
        receipt.freeBytesAfterCleanup < Number(MIN_FREE_AFTER_CLEANUP_BYTES))
    )
      fail("RECEIPT_INVALID");
    if (
      receipt.minimumFreeBytesObserved == null ||
      (receipt.acquireDiskDeltaBytes > Number(MAX_ACQUIRE_DISK_DELTA_BYTES) &&
        !/^(?:ACQUIRE|MINIMUM_EVIDENCE)_DISK_LIMIT$/u.test(receipt.primaryFailureCode) &&
        receipt.cleanupFailureCode !== "CLEANUP_DISK_LIMIT")
    )
      fail("RECEIPT_INVALID");
  }
  const cleanOperational = [
    "TRANSACTION_SUCCEEDED_CLEANED",
    "TEST_FAILED_CLEAN",
    "FINALIZATION_FAILED_CLEAN",
  ].includes(receipt.state);
  if (cleanOperational) {
    if (
      receipt.preExactRuntimeCount !== 0 ||
      receipt.postAcquireExactRuntimeCount !== 1 ||
      receipt.postCleanupExactRuntimeCount !== 0 ||
      !hasRuntime ||
      receipt.freeBytesBefore == null ||
      receipt.freeBytesBefore < Number(MIN_FREE_BEFORE_BYTES) ||
      receipt.freeBytesAfterAcquire == null ||
      receipt.freeBytesAfterAcquire < Number(MIN_FREE_AFTER_ACQUIRE_BYTES) ||
      receipt.freeBytesAfterMinimumEvidence == null ||
      receipt.freeBytesAfterMinimumEvidence < Number(MIN_FREE_AFTER_ACQUIRE_BYTES) ||
      receipt.freeBytesAfterCleanup == null ||
      receipt.freeBytesAfterCleanup < Number(MIN_FREE_AFTER_CLEANUP_BYTES) ||
      receipt.minimumFreeBytesObserved == null ||
      receipt.minimumFreeBytesObserved < Number(MIN_FREE_AFTER_ACQUIRE_BYTES) ||
      receipt.acquireDiskDeltaBytes > Number(MAX_ACQUIRE_DISK_DELTA_BYTES)
    )
      fail("RECEIPT_INVALID");
  }
  const observedRetention =
    receipt.downloadInvocationCount === 1 &&
    (receipt.postCleanupExactRuntimeCount === null || receipt.postCleanupExactRuntimeCount > 0);
  if (receipt.runtimeRetained !== observedRetention) fail("RECEIPT_INVALID");
  return true;
}

function validateDiagnosticReceipt(receipt) {
  const observed = [receipt.observedVersion, receipt.observedBuild];
  const expectsObserved = [
    "PRECONDITION_SIMCTL_FIND_SPAWN",
    "PRECONDITION_SIMCTL_FIND_INVALID_PID",
    "PRECONDITION_SIMCTL_FIND_IDENTITY_AFTER_SETTLEMENT",
    "PRECONDITION_SIMCTL_FIND_TIMEOUT",
    "PRECONDITION_SIMCTL_FIND_OUTPUT_LIMIT",
    "PRECONDITION_SIMCTL_FIND_EXIT",
    "PRECONDITION_SIMCTL_FIND_UTF8",
    "PRECONDITION_SIMCTL_FIND_PATH",
    "PRECONDITION_SIMCTL_FIND_INTERNAL",
    "PRECONDITION_XCODE_DIAGNOSTIC_READY",
  ].includes(receipt.primaryFailureCode);
  const cleanRow =
    receipt.state === "PRECONDITION_REJECTED" &&
    receipt.cleanupFailureCode === "NONE" &&
    receipt.cleanupResult === "NOT_REQUIRED" &&
    receipt.rawLogRetained === false;
  const cleanupFailureRow =
    receipt.state === "CLEANUP_FAILED" &&
    receipt.cleanupFailureCode === "CLEANUP_RAW_RESIDUE" &&
    receipt.cleanupResult === "FAILED" &&
    receipt.rawLogRetained === true;
  if (
    receipt.diagnosticMode !== DIAGNOSTIC_MODE ||
    !XCODE_DIAGNOSTIC_FAILURE_CODES.has(receipt.primaryFailureCode) ||
    (!cleanRow && !cleanupFailureRow) ||
    receipt.downloadInvocationCount !== 0 ||
    receipt.downloadResult !== "NOT_ATTEMPTED" ||
    receipt.minimumEvidenceResult !== "NOT_RUN" ||
    receipt.runtimeIdentifier !== null ||
    receipt.runtimeVersion !== null ||
    receipt.runtimeBuild !== null ||
    receipt.freeBytesBefore !== null ||
    receipt.freeBytesAfterAcquire !== null ||
    receipt.freeBytesAfterMinimumEvidence !== null ||
    receipt.freeBytesAfterCleanup !== null ||
    receipt.minimumFreeBytesObserved !== null ||
    receipt.acquireDiskDeltaBytes !== 0 ||
    receipt.diskMonitorSampleCount !== 0 ||
    receipt.preExactRuntimeCount !== null ||
    receipt.postAcquireExactRuntimeCount !== null ||
    receipt.postCleanupExactRuntimeCount !== null ||
    receipt.runtimeRetained !== false ||
    (expectsObserved &&
      (observed[0] !== EXPECTED_XCODE_VERSION || observed[1] !== EXPECTED_XCODE_BUILD)) ||
    (!expectsObserved && !observed.every((value) => value === null))
  ) {
    fail("RECEIPT_INVALID");
  }
  return Object.freeze({ ...receipt });
}

export function validateReceipt(receipt) {
  if (!exactKeys(receipt, RECEIPT_FIELDS)) fail("RECEIPT_INVALID");
  if (
    receipt.schemaVersion !== 2 ||
    receipt.policyId !== POLICY_ID ||
    !SOURCE_SHA.test(receipt.sourceCommit) ||
    !/^\d{1,20}$/u.test(receipt.runId) ||
    receipt.runAttempt !== 1 ||
    receipt.runnerImageOs !== "macos15" ||
    !/^[0-9]{8}\.[0-9]{4}\.[0-9]+$/u.test(receipt.runnerImageVersion) ||
    receipt.runnerImageVersion.length > 32 ||
    receipt.runnerArch !== "ARM64" ||
    receipt.hostArch !== "arm64" ||
    ![null, DIAGNOSTIC_MODE].includes(receipt.diagnosticMode) ||
    receipt.expectedVersion !== EXPECTED_XCODE_VERSION ||
    receipt.expectedBuild !== EXPECTED_XCODE_BUILD ||
    ![null, EXPECTED_XCODE_VERSION].includes(receipt.observedVersion) ||
    ![null, EXPECTED_XCODE_BUILD].includes(receipt.observedBuild) ||
    (receipt.observedVersion === null) !== (receipt.observedBuild === null) ||
    receipt.artifactTupleSha256 !== CATALOG_TUPLE_SHA256 ||
    receipt.artifactIdentifier !== "com.apple.dmg.iPhoneSimulatorSDK17_5" ||
    receipt.artifactVersion !== "17.5" ||
    receipt.artifactBuild !== "21F79" ||
    receipt.artifactFileSizeBytes !== Number(CATALOG_PAYLOAD_BYTES) ||
    receipt.catalogObservationDate !== "2026-11-14" ||
    receipt.requestedArchitectureVariant !== "arm64" ||
    !STATES.has(receipt.state) ||
    !PRIMARY_FAILURE_CODES.has(receipt.primaryFailureCode) ||
    !CLEANUP_FAILURE_CODES.has(receipt.cleanupFailureCode) ||
    !DOWNLOAD_RESULTS.has(receipt.downloadResult) ||
    !MINIMUM_EVIDENCE_RESULTS.has(receipt.minimumEvidenceResult) ||
    !CLEANUP_RESULTS.has(receipt.cleanupResult) ||
    typeof receipt.rawLogRetained !== "boolean" ||
    typeof receipt.runtimeRetained !== "boolean" ||
    receipt.fallbackUsed !== false
  ) {
    fail("RECEIPT_INVALID");
  }
  for (const key of [
    "downloadInvocationCount",
    "durationMs",
    "acquireDiskDeltaBytes",
    "diskMonitorSampleCount",
  ]) {
    safeNumber(receipt[key]);
  }
  if (receipt.diagnosticMode === DIAGNOSTIC_MODE) return validateDiagnosticReceipt(receipt);
  if (
    XCODE_DIAGNOSTIC_FAILURE_CODES.has(receipt.primaryFailureCode) ||
    (receipt.downloadInvocationCount === 0 &&
      (receipt.observedVersion !== null || receipt.observedBuild !== null)) ||
    (receipt.downloadInvocationCount === 1 &&
      (receipt.observedVersion !== EXPECTED_XCODE_VERSION ||
        receipt.observedBuild !== EXPECTED_XCODE_BUILD))
  ) {
    fail("RECEIPT_INVALID");
  }
  const nullableFreeFields = [
    "freeBytesBefore",
    "freeBytesAfterAcquire",
    "freeBytesAfterMinimumEvidence",
    "freeBytesAfterCleanup",
    "minimumFreeBytesObserved",
  ];
  for (const key of nullableFreeFields) if (receipt[key] !== null) safeNumber(receipt[key]);
  const runtimeCountFields = [
    "preExactRuntimeCount",
    "postAcquireExactRuntimeCount",
    "postCleanupExactRuntimeCount",
  ];
  for (const key of runtimeCountFields) {
    if (
      receipt[key] !== null &&
      (safeNumber(receipt[key]) > 4096 || !Number.isSafeInteger(receipt[key]))
    )
      fail("RECEIPT_INVALID");
  }
  if (
    receipt.runtimeIdentifier !== null &&
    (!RUNTIME_IDENTIFIER.test(receipt.runtimeIdentifier) || receipt.runtimeIdentifier.length > 128)
  ) {
    fail("RECEIPT_INVALID");
  }
  if (
    ![null, "17.5"].includes(receipt.runtimeVersion) ||
    ![null, "21F79"].includes(receipt.runtimeBuild)
  ) {
    fail("RECEIPT_INVALID");
  }
  const runtimeTriple = [receipt.runtimeIdentifier, receipt.runtimeVersion, receipt.runtimeBuild];
  if (
    !runtimeTriple.every((value) => value === null) &&
    runtimeTriple.some((value) => value === null)
  )
    fail("RECEIPT_INVALID");
  if (
    (receipt.diskMonitorSampleCount === 0 &&
      (!nullableFreeFields.every((key) => receipt[key] === null) ||
        receipt.acquireDiskDeltaBytes !== 0)) ||
    (receipt.diskMonitorSampleCount > 0 &&
      (receipt.freeBytesBefore === null || receipt.minimumFreeBytesObserved === null))
  )
    fail("RECEIPT_INVALID");
  if (
    receipt.state === "PRECONDITION_REJECTED" &&
    !(
      receipt.downloadInvocationCount === 0 &&
      receipt.downloadResult === "NOT_ATTEMPTED" &&
      receipt.cleanupResult === "NOT_REQUIRED" &&
      receipt.minimumEvidenceResult === "NOT_RUN" &&
      receipt.primaryFailureCode.startsWith("PRECONDITION_") &&
      receipt.cleanupFailureCode === "NONE" &&
      receipt.rawLogRetained === false &&
      receipt.runtimeRetained === false
    )
  ) {
    fail("RECEIPT_INVALID");
  }
  if (
    receipt.state === "TRANSACTION_SUCCEEDED_CLEANED" &&
    !(
      receipt.downloadInvocationCount === 1 &&
      receipt.downloadResult === "SUCCEEDED" &&
      receipt.minimumEvidenceResult === "SUCCEEDED" &&
      receipt.cleanupResult === "SUCCEEDED" &&
      receipt.primaryFailureCode === "NONE" &&
      receipt.cleanupFailureCode === "NONE" &&
      receipt.rawLogRetained === false &&
      receipt.runtimeRetained === false
    )
  ) {
    fail("RECEIPT_INVALID");
  }
  if (
    receipt.state === "ACQUIRE_FAILED_CLEAN" &&
    !(
      /^(?:ACQUIRE_|POST_RUNTIME_)/u.test(receipt.primaryFailureCode) &&
      receipt.cleanupFailureCode === "NONE" &&
      receipt.downloadResult ===
        (receipt.primaryFailureCode.startsWith("POST_RUNTIME_") ? "SUCCEEDED" : "FAILED") &&
      receipt.minimumEvidenceResult === "NOT_RUN" &&
      receipt.cleanupResult === "SUCCEEDED" &&
      receipt.downloadInvocationCount === 1 &&
      receipt.rawLogRetained === false &&
      receipt.runtimeRetained === false
    )
  ) {
    fail("RECEIPT_INVALID");
  }
  if (
    receipt.state === "TEST_FAILED_CLEAN" &&
    !(
      receipt.primaryFailureCode.startsWith("MINIMUM_EVIDENCE_") &&
      receipt.cleanupFailureCode === "NONE" &&
      receipt.downloadResult === "SUCCEEDED" &&
      receipt.minimumEvidenceResult === "FAILED" &&
      receipt.cleanupResult === "SUCCEEDED" &&
      receipt.downloadInvocationCount === 1 &&
      receipt.rawLogRetained === false &&
      receipt.runtimeRetained === false
    )
  ) {
    fail("RECEIPT_INVALID");
  }
  if (
    receipt.state === "FINALIZATION_FAILED_CLEAN" &&
    !(
      receipt.primaryFailureCode === "FINALIZATION_INTERRUPTED" &&
      receipt.cleanupFailureCode === "NONE" &&
      receipt.downloadInvocationCount === 1 &&
      receipt.downloadResult === "SUCCEEDED" &&
      receipt.minimumEvidenceResult === "SUCCEEDED" &&
      receipt.cleanupResult === "SUCCEEDED" &&
      receipt.rawLogRetained === false &&
      receipt.runtimeRetained === false
    )
  ) {
    fail("RECEIPT_INVALID");
  }
  if (
    receipt.state === "CLEANUP_FAILED" &&
    !(
      receipt.cleanupResult === "FAILED" &&
      receipt.cleanupFailureCode !== "NONE" &&
      receipt.state === "CLEANUP_FAILED" &&
      ((receipt.primaryFailureCode.startsWith("PRECONDITION_") &&
        receipt.downloadInvocationCount === 0 &&
        receipt.downloadResult === "NOT_ATTEMPTED" &&
        receipt.minimumEvidenceResult === "NOT_RUN") ||
        (receipt.primaryFailureCode.startsWith("ACQUIRE_") &&
          receipt.downloadInvocationCount === 1 &&
          receipt.downloadResult === "FAILED" &&
          receipt.minimumEvidenceResult === "NOT_RUN") ||
        (receipt.primaryFailureCode.startsWith("POST_RUNTIME_") &&
          receipt.downloadInvocationCount === 1 &&
          receipt.downloadResult === "SUCCEEDED" &&
          receipt.minimumEvidenceResult === "NOT_RUN") ||
        (receipt.primaryFailureCode.startsWith("MINIMUM_EVIDENCE_") &&
          receipt.downloadInvocationCount === 1 &&
          receipt.downloadResult === "SUCCEEDED" &&
          receipt.minimumEvidenceResult === "FAILED") ||
        (["NONE", "FINALIZATION_INTERRUPTED"].includes(receipt.primaryFailureCode) &&
          receipt.downloadInvocationCount === 1 &&
          receipt.downloadResult === "SUCCEEDED" &&
          receipt.minimumEvidenceResult === "SUCCEEDED"))
    )
  ) {
    fail("RECEIPT_INVALID");
  }
  if (
    receipt.primaryFailureCode === "PRECONDITION_RUNTIME_ALREADY_PRESENT" &&
    !(
      receipt.preExactRuntimeCount !== null &&
      receipt.preExactRuntimeCount >= 1 &&
      receipt.postAcquireExactRuntimeCount === null &&
      receipt.postCleanupExactRuntimeCount === null &&
      runtimeTriple.every((value) => value === null)
    )
  )
    fail("RECEIPT_INVALID");
  if (
    receipt.state === "PRECONDITION_REJECTED" &&
    receipt.primaryFailureCode !== "PRECONDITION_RUNTIME_ALREADY_PRESENT" &&
    !(
      [null, 0].includes(receipt.preExactRuntimeCount) &&
      receipt.postAcquireExactRuntimeCount === null &&
      receipt.postCleanupExactRuntimeCount === null &&
      runtimeTriple.every((value) => value === null)
    )
  )
    fail("RECEIPT_INVALID");
  const cleanOperationalState = new Set([
    "TRANSACTION_SUCCEEDED_CLEANED",
    "TEST_FAILED_CLEAN",
    "FINALIZATION_FAILED_CLEAN",
  ]).has(receipt.state);
  if (
    cleanOperationalState &&
    !(
      receipt.preExactRuntimeCount === 0 &&
      receipt.postAcquireExactRuntimeCount === 1 &&
      receipt.postCleanupExactRuntimeCount === 0
    )
  )
    fail("RECEIPT_INVALID");
  if (runtimeTriple[0] !== null && receipt.postAcquireExactRuntimeCount !== 1)
    fail("RECEIPT_INVALID");
  const observedRuntimeRetained =
    receipt.downloadInvocationCount === 1 &&
    (receipt.postCleanupExactRuntimeCount === null || receipt.postCleanupExactRuntimeCount > 0);
  if (receipt.runtimeRetained !== observedRuntimeRetained) fail("RECEIPT_INVALID");
  if (
    receipt.primaryFailureCode === "PRECONDITION_DISK" &&
    !(
      receipt.freeBytesBefore !== null &&
      receipt.freeBytesBefore >= 0 &&
      receipt.freeBytesBefore < Number(MIN_FREE_BEFORE_BYTES)
    )
  )
    fail("RECEIPT_INVALID");
  if (
    receipt.primaryFailureCode === "ACQUIRE_DISK_FLOOR" &&
    (receipt.freeBytesAfterAcquire === null ||
      receipt.freeBytesAfterAcquire >= Number(MIN_FREE_AFTER_ACQUIRE_BYTES))
  )
    fail("RECEIPT_INVALID");
  if (
    receipt.primaryFailureCode === "MINIMUM_EVIDENCE_DISK_FLOOR" &&
    (receipt.freeBytesAfterMinimumEvidence === null ||
      receipt.freeBytesAfterMinimumEvidence >= Number(MIN_FREE_AFTER_ACQUIRE_BYTES))
  )
    fail("RECEIPT_INVALID");
  if (
    /(?:ACQUIRE|MINIMUM_EVIDENCE)_DISK_LIMIT/u.test(receipt.primaryFailureCode) &&
    receipt.acquireDiskDeltaBytes <= Number(MAX_ACQUIRE_DISK_DELTA_BYTES)
  )
    fail("RECEIPT_INVALID");
  if (
    ["TRANSACTION_SUCCEEDED_CLEANED", "FINALIZATION_FAILED_CLEAN"].includes(receipt.state) &&
    !(
      receipt.freeBytesBefore !== null &&
      receipt.freeBytesBefore >= Number(MIN_FREE_BEFORE_BYTES) &&
      receipt.freeBytesAfterAcquire !== null &&
      receipt.freeBytesAfterAcquire >= Number(MIN_FREE_AFTER_ACQUIRE_BYTES) &&
      receipt.freeBytesAfterMinimumEvidence !== null &&
      receipt.freeBytesAfterMinimumEvidence >= Number(MIN_FREE_AFTER_ACQUIRE_BYTES) &&
      receipt.freeBytesAfterCleanup !== null &&
      receipt.freeBytesAfterCleanup >= Number(MIN_FREE_AFTER_CLEANUP_BYTES) &&
      receipt.minimumFreeBytesObserved !== null &&
      receipt.minimumFreeBytesObserved >= Number(MIN_FREE_AFTER_ACQUIRE_BYTES) &&
      receipt.acquireDiskDeltaBytes <= Number(MAX_ACQUIRE_DISK_DELTA_BYTES)
    )
  )
    fail("RECEIPT_INVALID");
  validateReceiptPhaseEvidence(receipt);
  return Object.freeze({ ...receipt });
}

export function testingReceipt(overrides = {}) {
  return {
    schemaVersion: 2,
    policyId: POLICY_ID,
    sourceCommit: "a".repeat(40),
    runId: "1",
    runAttempt: 1,
    runnerImageOs: "macos15",
    runnerImageVersion: "20261104.0514.1",
    runnerArch: "ARM64",
    hostArch: "arm64",
    diagnosticMode: null,
    expectedVersion: EXPECTED_XCODE_VERSION,
    expectedBuild: EXPECTED_XCODE_BUILD,
    observedVersion: EXPECTED_XCODE_VERSION,
    observedBuild: EXPECTED_XCODE_BUILD,
    artifactTupleSha256: CATALOG_TUPLE_SHA256,
    artifactIdentifier: "com.apple.dmg.iPhoneSimulatorSDK17_5",
    artifactVersion: "17.5",
    artifactBuild: "21F79",
    artifactFileSizeBytes: Number(CATALOG_PAYLOAD_BYTES),
    catalogObservationDate: "2026-11-14",
    runtimeIdentifier: "com.apple.CoreSimulator.SimRuntime.iOS-17-5",
    runtimeVersion: "17.5",
    runtimeBuild: "21F79",
    requestedArchitectureVariant: "arm64",
    state: "TRANSACTION_SUCCEEDED_CLEANED",
    primaryFailureCode: "NONE",
    cleanupFailureCode: "NONE",
    downloadInvocationCount: 1,
    downloadResult: "SUCCEEDED",
    minimumEvidenceResult: "SUCCEEDED",
    cleanupResult: "SUCCEEDED",
    durationMs: 1,
    freeBytesBefore: Number(MIN_FREE_BEFORE_BYTES),
    freeBytesAfterAcquire: Number(MIN_FREE_AFTER_ACQUIRE_BYTES),
    freeBytesAfterMinimumEvidence: Number(MIN_FREE_AFTER_ACQUIRE_BYTES),
    freeBytesAfterCleanup: Number(MIN_FREE_AFTER_CLEANUP_BYTES),
    minimumFreeBytesObserved: Number(MIN_FREE_AFTER_ACQUIRE_BYTES),
    acquireDiskDeltaBytes: Number(MAX_ACQUIRE_DISK_DELTA_BYTES),
    diskMonitorSampleCount: 2,
    preExactRuntimeCount: 0,
    postAcquireExactRuntimeCount: 1,
    postCleanupExactRuntimeCount: 0,
    rawLogRetained: false,
    runtimeRetained: false,
    fallbackUsed: false,
    ...overrides,
  };
}

function receiptPath(repositoryRoot) {
  return join(repositoryRoot, "artifacts", "ios-runtime-bootstrap", "receipt.json");
}

function writeCanonicalJson(path, value) {
  const content = `${JSON.stringify(value)}\n`;
  const bytes = Buffer.from(content, "utf8");
  if (bytes.length < 1 || bytes.length > MAX_RECEIPT_BYTES) fail("CLEANUP_RECEIPT_INVALID");
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, bytes, { mode: 0o600, flag: "wx" });
}

function rootOperations(dependencies = {}) {
  return Object.freeze({
    exists: dependencies.exists ?? existsSync,
    lstat: dependencies.lstat ?? lstatSync,
    mkdir: dependencies.mkdir ?? mkdirSync,
    realpath: dependencies.realpath ?? realpathSync.native,
    remove: dependencies.remove ?? rmSync,
  });
}

function validateRunnerTemp(env, dependencies = {}) {
  try {
    const path = env.RUNNER_TEMP;
    const safePath = dependencies.safePath ?? SAFE_CANONICAL_PATH;
    if (
      typeof path !== "string" ||
      !isAbsolute(path) ||
      !safePath.test(path) ||
      /[\0\r\n]/u.test(path)
    )
      fail("PRECONDITION_ENV");
    const fs = rootOperations(dependencies);
    const info = fs.lstat(path, { bigint: true });
    if (!info.isDirectory() || info.isSymbolicLink() || fs.realpath(path) !== path)
      fail("PRECONDITION_ENV");
    return Object.freeze({ path, dev: info.dev, ino: info.ino });
  } catch {
    fail("PRECONDITION_ENV");
  }
}

function validateRunnerTempBinding(binding, failureCode, dependencies = {}) {
  try {
    const fs = rootOperations(dependencies);
    const info = fs.lstat(binding.path, { bigint: true });
    if (
      !info.isDirectory() ||
      info.isSymbolicLink() ||
      fs.realpath(binding.path) !== binding.path ||
      info.dev !== binding.dev ||
      info.ino !== binding.ino
    )
      fail(failureCode);
    return binding;
  } catch {
    fail(failureCode);
  }
}

function validateOwnedRootBinding(binding, failureCode, dependencies = {}) {
  try {
    if (!binding || typeof binding !== "object" || !Object.isFrozen(binding)) fail(failureCode);
    const fs = rootOperations(dependencies);
    const parent = dirname(binding.path);
    const parentInfo = fs.lstat(parent, { bigint: true });
    const info = fs.lstat(binding.path, { bigint: true });
    if (
      !parentInfo.isDirectory() ||
      parentInfo.isSymbolicLink() ||
      fs.realpath(parent) !== parent ||
      parentInfo.dev !== binding.parentDev ||
      !info.isDirectory() ||
      info.isSymbolicLink() ||
      fs.realpath(binding.path) !== binding.path ||
      info.dev !== binding.dev ||
      info.ino !== binding.ino ||
      info.dev !== binding.parentDev
    )
      fail(failureCode);
    return binding;
  } catch {
    fail(failureCode);
  }
}

function createOwnedRoot(parentBinding, name, maximumBytes, dependencies = {}) {
  const fs = rootOperations(dependencies);
  const path = join(parentBinding.path, name);
  validateRunnerTempBinding(parentBinding, "PRECONDITION_ENV", dependencies);
  try {
    if (fs.exists(path)) fail("PRECONDITION_ENV");
    fs.mkdir(path, { recursive: false, mode: 0o700 });
    const info = fs.lstat(path, { bigint: true });
    if (
      !info.isDirectory() ||
      info.isSymbolicLink() ||
      fs.realpath(path) !== path ||
      info.dev !== parentBinding.dev
    )
      fail("PRECONDITION_ENV");
    return Object.freeze({
      path,
      dev: info.dev,
      ino: info.ino,
      parentDev: parentBinding.dev,
      maximumBytes,
    });
  } catch {
    fail("PRECONDITION_ENV");
  }
}

function baseReceipt(env, sourceCommit) {
  return testingReceipt({
    sourceCommit,
    runId: /^\d+$/u.test(env.GITHUB_RUN_ID ?? "") ? env.GITHUB_RUN_ID : "0",
    runnerImageOs: env.ImageOS ?? "unknown",
    runnerImageVersion: env.ImageVersion ?? "unknown",
    runnerArch: env.RUNNER_ARCH ?? "unknown",
    hostArch: hostArchitecture(),
    diagnosticMode: null,
    observedVersion: null,
    observedBuild: null,
    runtimeIdentifier: null,
    runtimeVersion: null,
    runtimeBuild: null,
    state: "PRECONDITION_REJECTED",
    primaryFailureCode: "PRECONDITION_ENV",
    cleanupFailureCode: "NONE",
    downloadInvocationCount: 0,
    downloadResult: "NOT_ATTEMPTED",
    minimumEvidenceResult: "NOT_RUN",
    cleanupResult: "NOT_REQUIRED",
    durationMs: 0,
    freeBytesBefore: null,
    freeBytesAfterAcquire: null,
    freeBytesAfterMinimumEvidence: null,
    freeBytesAfterCleanup: null,
    minimumFreeBytesObserved: null,
    acquireDiskDeltaBytes: 0,
    diskMonitorSampleCount: 0,
    preExactRuntimeCount: null,
    postAcquireExactRuntimeCount: null,
    postCleanupExactRuntimeCount: null,
  });
}

function sanitizePrimaryFailure(error, invocationCount, preconditionStage) {
  if (![0, 1].includes(invocationCount) || !PRECONDITION_STAGE_VALUES.includes(preconditionStage)) {
    return invocationCount === 1 ? "ACQUIRE_PROCESS_IDENTITY" : "PRECONDITION_ENV";
  }
  const knownCode =
    error instanceof BootstrapFailure && PRIMARY_FAILURE_CODES.has(error.code) ? error.code : null;
  if (invocationCount === 0) {
    return knownCode?.startsWith("PRECONDITION_")
      ? knownCode
      : PRECONDITION_STAGE_FAILURE[preconditionStage];
  }
  return knownCode ?? "ACQUIRE_PROCESS_IDENTITY";
}

function sanitizeCleanupFailure(error, cleanupSampleRecorded) {
  if (error instanceof BootstrapFailure && error.code === "CLEANUP_RECEIPT_INVALID") {
    return cleanupSampleRecorded ? "CLEANUP_RECEIPT_INVALID" : "CLEANUP_RESIDUE";
  }
  if (error instanceof BootstrapFailure && CLEANUP_FAILURE_CODES.has(error.code)) {
    return error.code;
  }
  return cleanupSampleRecorded ? "CLEANUP_RECEIPT_INVALID" : "CLEANUP_RESIDUE";
}

function sampleCleanupFilesystem(binding, freeBefore, observations, fs, onSample = () => {}) {
  try {
    return sampleHeldFilesystem(binding, freeBefore, observations, fs, onSample);
  } catch (error) {
    if (error instanceof BootstrapFailure && error.code === "ACQUIRE_DISK_FLOOR") {
      throw new BootstrapFailure("CLEANUP_DISK_FLOOR");
    }
    if (error instanceof BootstrapFailure && error.code === "ACQUIRE_DISK_LIMIT") {
      throw new BootstrapFailure("CLEANUP_DISK_LIMIT");
    }
    throw new BootstrapFailure("CLEANUP_STORAGE_IDENTITY");
  }
}

function elapsedMs(started) {
  return Math.max(0, Math.floor(performance.now() - started));
}

function monotonicNow(dependencies = {}, failureCode = "PRECONDITION_ENV") {
  try {
    const injected = dependencies.now;
    if (injected !== undefined && typeof injected !== "function") fail(failureCode);
    const value = injected === undefined ? performance.now() : injected();
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fail(failureCode);
    return value;
  } catch {
    fail(failureCode);
  }
}

function ensurePhaseBudget(started, phaseMs, failureCode) {
  if (elapsedMs(started) + phaseMs + CLEANUP_FINAL_RESERVE_MS > TOTAL_TRANSACTION_TIMEOUT_MS) {
    fail(failureCode);
  }
}

export function scanOwnedRoot(binding, maximumBytes, dependencies = {}) {
  const failureCode = dependencies.failureCode ?? "MINIMUM_EVIDENCE_MONITOR";
  validateOwnedRootBinding(binding, failureCode, dependencies);
  const root = binding.path;
  const started = monotonicNow(dependencies, "MINIMUM_EVIDENCE_MONITOR");
  const readDirectory = dependencies.readdir ?? readdirSync;
  const lstat = dependencies.lstat ?? lstatSync;
  let entries = 0;
  let bytes = 0n;
  const pending = [root];
  while (pending.length > 0) {
    if (monotonicNow(dependencies, "MINIMUM_EVIDENCE_MONITOR") - started > MAX_SCAN_DURATION_MS) {
      fail("MINIMUM_EVIDENCE_MONITOR");
    }
    const current = pending.pop();
    const info = lstat(current, { bigint: true });
    if (info.isSymbolicLink() || (!info.isDirectory() && !info.isFile())) {
      fail("MINIMUM_EVIDENCE_ROOT_LIMIT");
    }
    entries += 1;
    if (entries > MAX_SCAN_ENTRIES) fail("MINIMUM_EVIDENCE_ROOT_LIMIT");
    if (info.isFile()) bytes += info.size;
    if (bytes > BigInt(maximumBytes)) fail("MINIMUM_EVIDENCE_ROOT_LIMIT");
    if (info.isDirectory()) {
      for (const child of readDirectory(current)) pending.push(join(current, child));
    }
  }
  return Object.freeze({ entries, bytes });
}

function validateScriptIdentity(repositoryRoot) {
  const canonicalRoot = realpathSync.native(repositoryRoot);
  const script = realpathSync.native(join(canonicalRoot, "scripts", "ios-ci.sh"));
  if (!SAFE_CANONICAL_PATH.test(canonicalRoot) || !SAFE_CANONICAL_PATH.test(script)) {
    fail("MINIMUM_EVIDENCE_SOURCE_IDENTITY");
  }
  const info = lstatSync(script);
  const bytes = readFileSync(script);
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    bytes.length !== IOS_CI_SOURCE_BYTES ||
    sha256(bytes) !== IOS_CI_SOURCE_SHA256
  ) {
    fail("MINIMUM_EVIDENCE_SOURCE_IDENTITY");
  }
  return Object.freeze({ repositoryRoot: canonicalRoot, script });
}

function childClosed(child) {
  return child.exitCode != null || child.signalCode != null;
}

const INTERNAL_ENV_KEYS = Object.freeze([
  "FLUYO_INTERNAL_CHECKOUT_ROOT",
  "FLUYO_INTERNAL_IMAGE_OS",
  "FLUYO_INTERNAL_PARENT_IDENTITY_SHA256",
  "FLUYO_INTERNAL_PARENT_PID",
  "FLUYO_INTERNAL_RUN_ATTEMPT",
  "FLUYO_INTERNAL_RUN_ID",
  "FLUYO_INTERNAL_RUNNER_ARCH",
  "FLUYO_INTERNAL_RUNNER_OS",
  "FLUYO_INTERNAL_RELEASE_SHA256",
  "FLUYO_INTERNAL_SOURCE_COMMIT",
  "FLUYO_INTERNAL_SOURCE_SHA256",
  "LANG",
  "LC_ALL",
]);
const ACQUIRE_TARGET_KEYS = Object.freeze(["DEVELOPER_DIR", "HOME", "PATH", "TMPDIR"]);
const MINIMUM_TARGET_KEYS = Object.freeze([
  "CI",
  "DEVELOPER_DIR",
  "FLUYO_DEVELOPER_DIR",
  "FLUYO_IOS_EVIDENCE_LEG",
  "FLUYO_IOS_RUNTIME_BUILD",
  "FLUYO_IOS_RUNTIME_IDENTIFIER",
  "FLUYO_IOS_RUNTIME_VERSION",
  "FLUYO_NODE_EXECUTABLE",
  "FLUYO_SOURCE_SHA",
  "FLUYO_XCODE_PREFIX",
  "GITHUB_ACTIONS",
  "GITHUB_RUN_ATTEMPT",
  "GITHUB_RUN_ID",
  "HOME",
  "LANG",
  "LC_ALL",
  "PATH",
  "RUNNER_TEMP",
  "TMPDIR",
]);

function plainClosedEnvironment(value, expectedKeys, code = "PRECONDITION_ENV") {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) fail(code);
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...expectedKeys].sort())) fail(code);
  for (const [key, entry] of Object.entries(value)) {
    if (
      FORBIDDEN_ENV_NAME.test(key) ||
      typeof entry !== "string" ||
      entry !== entry.normalize("NFC") ||
      /[\x00-\x1f\x7f]/u.test(entry)
    )
      fail(code);
  }
  return value;
}

export function parentIdentityRecord(identity) {
  if (
    !Number.isSafeInteger(identity?.pid) ||
    identity.pid < 1 ||
    identity.pid > 2_147_483_647 ||
    !Number.isSafeInteger(identity?.pgid) ||
    identity.pgid < 1 ||
    identity.pgid > 2_147_483_647 ||
    !/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [ 0-3]\d \d{2}:\d{2}:\d{2} \d{4}$/u.test(
      identity?.startTime ?? "",
    )
  )
    fail("PRECONDITION_ENV");
  const value = `pid=${identity.pid}\0pgid=${identity.pgid}\0start=${identity.startTime}\0title=${PARENT_TITLE}\n`;
  if (Buffer.byteLength(value) > 256 || !/^[\x00\x0a\x20-\x7e]+$/u.test(value))
    fail("PRECONDITION_ENV");
  return value;
}

export function parseParentPsIdentity(
  stdout,
  expectedPid,
  expectedPpid = null,
  failureCode = "PRECONDITION_ENV",
) {
  const line = stdout.trim();
  if (
    Buffer.byteLength(stdout) > PS_STDOUT_MAX_BYTES ||
    stdout.includes("\0") ||
    stdout.split(/\r?\n/u).filter(Boolean).length !== 1 ||
    !ASCII_LINE.test(line)
  )
    fail(failureCode);
  const match =
    /^(\d+)\s+(\d+)\s+(\d+)\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [ 0-3]\d \d{2}:\d{2}:\d{2} \d{4})\s+(.+)$/u.exec(
      line,
    );
  if (!match) fail(failureCode);
  const pid = Number(match[1]);
  const ppid = Number(match[2]);
  const pgid = Number(match[3]);
  if (
    pid !== expectedPid ||
    (expectedPpid != null && ppid !== expectedPpid) ||
    !Number.isSafeInteger(pgid) ||
    pgid < 1 ||
    pgid > 2_147_483_647 ||
    match[5] !== PARENT_TITLE
  )
    fail(failureCode);
  return Object.freeze({ pid, ppid, pgid, startTime: match[4], title: match[5] });
}

export async function probeParentIdentity(pid, expectedPpid = null, dependencies = {}) {
  const result = await runPsVerifier(
    [
      "-ww",
      "-p",
      String(pid),
      "-o",
      "pid=",
      "-o",
      "ppid=",
      "-o",
      "pgid=",
      "-o",
      "lstart=",
      "-o",
      "command=",
    ],
    {
      timeout: PS_TIMEOUT_MS,
      stdout: PS_STDOUT_MAX_BYTES,
      stderr: PS_STDERR_MAX_BYTES,
      timeoutCode: "PRECONDITION_PARENT_IDENTITY",
      outputCode: "PRECONDITION_PARENT_IDENTITY",
      exitCode: "PRECONDITION_PARENT_IDENTITY",
    },
    dependencies,
  );
  if (result.stderr !== "") fail("PRECONDITION_PARENT_IDENTITY");
  return parseParentPsIdentity(result.stdout, pid, expectedPpid, "PRECONDITION_PARENT_IDENTITY");
}

function positionalSourceBytes(fd, size, code = "PRECONDITION_SOURCE") {
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_CONTROLLER_SOURCE_BYTES) fail(code);
  const value = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(fd, value, offset, size - offset, offset);
    if (count <= 0) fail(code);
    offset += count;
  }
  const extra = Buffer.alloc(1);
  if (readSync(fd, extra, 0, 1, size) !== 0) fail(code);
  return value;
}

export function openControllerSource(sourcePath) {
  const canonical = realpathSync.native(sourcePath);
  if (canonical !== sourcePath || !SAFE_CANONICAL_PATH.test(canonical)) fail("PRECONDITION_SOURCE");
  const before = lstatSync(canonical);
  if (!before.isFile() || before.isSymbolicLink()) fail("PRECONDITION_SOURCE");
  const fd = openSync(canonical, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  const held = fstatSync(fd);
  if (
    !held.isFile() ||
    held.dev !== before.dev ||
    held.ino !== before.ino ||
    held.size !== before.size
  )
    fail("PRECONDITION_SOURCE");
  const bytes = positionalSourceBytes(fd, held.size);
  const after = fstatSync(fd);
  if (after.dev !== held.dev || after.ino !== held.ino || after.size !== held.size)
    fail("PRECONDITION_SOURCE");
  return Object.freeze({
    fd,
    path: canonical,
    dev: held.dev,
    ino: held.ino,
    size: held.size,
    sha256: sha256(bytes),
  });
}

export function verifyControllerSource(binding) {
  const pathInfo = lstatSync(binding.path);
  const held = fstatSync(binding.fd);
  if (
    realpathSync.native(binding.path) !== binding.path ||
    !pathInfo.isFile() ||
    pathInfo.isSymbolicLink() ||
    pathInfo.dev !== binding.dev ||
    pathInfo.ino !== binding.ino ||
    pathInfo.size !== binding.size ||
    held.dev !== binding.dev ||
    held.ino !== binding.ino ||
    held.size !== binding.size ||
    sha256(positionalSourceBytes(binding.fd, binding.size)) !== binding.sha256
  )
    fail("PRECONDITION_SOURCE");
  return true;
}

function roleTargetKeys(role) {
  return role === "MINIMUM" ? MINIMUM_TARGET_KEYS : ACQUIRE_TARGET_KEYS;
}

export function validateChildGateEnvironment(role, env) {
  if (!new Set(["ACQUIRE", "MINIMUM", "CLEANUP"]).has(role)) fail("PRECONDITION_ENV");
  const targetKeys = roleTargetKeys(role);
  plainClosedEnvironment(env, [...new Set([...INTERNAL_ENV_KEYS, ...targetKeys])]);
  if (
    env.LANG !== "C" ||
    env.LC_ALL !== "C" ||
    !/^\d{1,20}$/u.test(env.FLUYO_INTERNAL_RUN_ID) ||
    env.FLUYO_INTERNAL_RUN_ATTEMPT !== "1" ||
    env.FLUYO_INTERNAL_RUNNER_OS !== "macOS" ||
    env.FLUYO_INTERNAL_RUNNER_ARCH !== "ARM64" ||
    env.FLUYO_INTERNAL_IMAGE_OS !== "macos15" ||
    !/^[0-9a-f]{64}$/u.test(env.FLUYO_INTERNAL_RELEASE_SHA256) ||
    !SOURCE_SHA.test(env.FLUYO_INTERNAL_SOURCE_COMMIT) ||
    !/^[0-9a-f]{64}$/u.test(env.FLUYO_INTERNAL_SOURCE_SHA256) ||
    !/^[0-9a-f]{64}$/u.test(env.FLUYO_INTERNAL_PARENT_IDENTITY_SHA256) ||
    !/^\d+$/u.test(env.FLUYO_INTERNAL_PARENT_PID) ||
    !SAFE_CANONICAL_PATH.test(env.FLUYO_INTERNAL_CHECKOUT_ROOT)
  )
    fail("PRECONDITION_ENV");
  const target = {};
  for (const key of targetKeys) target[key] = env[key];
  if (
    target.DEVELOPER_DIR !== XCODE_DEVELOPER_DIR ||
    target.PATH !==
      (role === "MINIMUM"
        ? `/usr/bin:/bin:/usr/sbin:/sbin:${dirname(target.FLUYO_NODE_EXECUTABLE ?? "")}`
        : "/usr/bin:/bin:/usr/sbin:/sbin") ||
    !SAFE_CANONICAL_PATH.test(target.HOME ?? "") ||
    !SAFE_CANONICAL_PATH.test(target.TMPDIR ?? "")
  )
    fail("PRECONDITION_ENV");
  if (
    role === "MINIMUM" &&
    (target.CI !== "true" ||
      target.FLUYO_DEVELOPER_DIR !== XCODE_DEVELOPER_DIR ||
      target.FLUYO_XCODE_PREFIX !== "Xcode 16.2" ||
      target.FLUYO_SOURCE_SHA !== env.FLUYO_INTERNAL_SOURCE_COMMIT ||
      target.FLUYO_IOS_EVIDENCE_LEG !== "minimum" ||
      !RUNTIME_IDENTIFIER.test(target.FLUYO_IOS_RUNTIME_IDENTIFIER ?? "") ||
      target.FLUYO_IOS_RUNTIME_VERSION !== "17.5" ||
      target.FLUYO_IOS_RUNTIME_BUILD !== "21F79" ||
      target.GITHUB_ACTIONS !== "true" ||
      target.GITHUB_RUN_ID !== env.FLUYO_INTERNAL_RUN_ID ||
      target.GITHUB_RUN_ATTEMPT !== "1" ||
      target.RUNNER_TEMP !== target.TMPDIR ||
      !SAFE_CANONICAL_PATH.test(target.FLUYO_NODE_EXECUTABLE ?? ""))
  )
    fail("PRECONDITION_ENV");
  target.LANG = role === "MINIMUM" ? "en_US.UTF-8" : "en_US.UTF-8";
  target.LC_ALL = "en_US.UTF-8";
  return Object.freeze(target);
}

export function buildWrapperEnvironment(role, internal, target) {
  const targetKeys = roleTargetKeys(role).filter((key) => !["LANG", "LC_ALL"].includes(key));
  plainClosedEnvironment(target, targetKeys);
  const wrapper = {
    ...target,
    ...internal,
    LANG: "C",
    LC_ALL: "C",
  };
  validateChildGateEnvironment(role, wrapper);
  return Object.freeze(wrapper);
}

export function validateChildGateDescriptors(
  { releaseFd, sourceFd, readyFd, expectedSourceSha256 },
  dependencies = {},
) {
  const fstat = dependencies.fstat ?? fstatSync;
  const lstat = dependencies.lstat ?? lstatSync;
  const realpath = dependencies.realpath ?? realpathSync.native;
  const sourcePath = dependencies.sourcePath ?? fileURLToPath(import.meta.url);
  const releaseInfo = fstat(releaseFd);
  const readyInfo = fstat(readyFd);
  if (!releaseInfo.isFIFO() || !readyInfo.isFIFO()) fail("PRECONDITION_SOURCE");
  const canonical = realpath(sourcePath);
  const pathInfo = lstat(sourcePath);
  const heldBefore = fstat(sourceFd);
  if (
    canonical !== sourcePath ||
    !pathInfo.isFile() ||
    pathInfo.isSymbolicLink() ||
    !heldBefore.isFile() ||
    heldBefore.size < 1 ||
    heldBefore.size > MAX_CONTROLLER_SOURCE_BYTES ||
    pathInfo.dev !== heldBefore.dev ||
    pathInfo.ino !== heldBefore.ino ||
    pathInfo.size !== heldBefore.size
  )
    fail("PRECONDITION_SOURCE");
  const bytes = (dependencies.readSource ?? positionalSourceBytes)(sourceFd, heldBefore.size);
  const heldAfter = fstat(sourceFd);
  if (
    !heldAfter.isFile() ||
    heldAfter.dev !== heldBefore.dev ||
    heldAfter.ino !== heldBefore.ino ||
    heldAfter.size !== heldBefore.size ||
    sha256(bytes) !== expectedSourceSha256
  )
    fail("PRECONDITION_SOURCE");
  return bytes;
}

function readExactRelease(fd, dependencies = {}) {
  return new Promise((resolveRelease, rejectRelease) => {
    const stream = (dependencies.createReadStream ?? createReadStream)(null, {
      fd,
      autoClose: false,
    });
    const chunks = [];
    let bytes = 0;
    let settled = false;
    let timer;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stream.destroy();
      if (error) rejectRelease(error);
      else resolveRelease(Buffer.concat(chunks));
    };
    stream.on("data", (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > CHILD_GATE_RELEASE_BYTES)
        finish(new BootstrapFailure("PRECONDITION_INTERRUPTED"));
      else chunks.push(Buffer.from(chunk));
    });
    stream.once("end", () =>
      bytes === CHILD_GATE_RELEASE_BYTES
        ? finish()
        : finish(new BootstrapFailure("PRECONDITION_INTERRUPTED")),
    );
    stream.once("error", () => finish(new BootstrapFailure("PRECONDITION_INTERRUPTED")));
    timer = (dependencies.setTimeout ?? setTimeout)(
      () => finish(new BootstrapFailure("PRECONDITION_INTERRUPTED")),
      CHILD_GATE_TIMEOUT_MS,
    );
    timer.unref?.();
  });
}

export async function childGate(role, cleanupRuntime, dependencies = {}) {
  const env = dependencies.env ?? process.env;
  if (
    (dependencies.platform ?? process.platform) !== "darwin" ||
    (dependencies.arch ?? process.arch) !== "arm64"
  )
    fail("PRECONDITION_RUNNER");
  const targetEnv = validateChildGateEnvironment(role, env);
  const releaseFd = dependencies.releaseFd ?? 3;
  const sourceFd = dependencies.sourceFd ?? 4;
  const readyFd = dependencies.readyFd ?? 5;
  validateChildGateDescriptors(
    {
      releaseFd,
      sourceFd,
      readyFd,
      expectedSourceSha256: env.FLUYO_INTERNAL_SOURCE_SHA256,
    },
    dependencies,
  );
  const root = realpathSync.native(env.FLUYO_INTERNAL_CHECKOUT_ROOT);
  if (root !== env.FLUYO_INTERNAL_CHECKOUT_ROOT) fail("PRECONDITION_SOURCE");
  if ((dependencies.parseHead ?? parseDetachedHead)(root) !== env.FLUYO_INTERNAL_SOURCE_COMMIT)
    fail("PRECONDITION_SOURCE");
  if (realpathSync.native(XCODE_DEVELOPER_DIR) !== XCODE_DEVELOPER_DIR)
    fail("PRECONDITION_XCODE_VERSION_INTERNAL");
  const parent = await (dependencies.probeParent ?? probeParentIdentity)(
    Number(env.FLUYO_INTERNAL_PARENT_PID),
    null,
    dependencies,
  );
  if ((dependencies.parentPid ?? process.ppid) !== Number(env.FLUYO_INTERNAL_PARENT_PID))
    fail("PRECONDITION_ENV");
  if (sha256(parentIdentityRecord(parent)) !== env.FLUYO_INTERNAL_PARENT_IDENTITY_SHA256)
    fail("PRECONDITION_ENV");
  process.title = `${CHILD_TITLE_PREFIX}${role.toLowerCase()}`;
  writeSync(readyFd, CHILD_GATE_READY, null, "ascii");
  (dependencies.closeReady ?? closeSync)(readyFd);
  const release = await readExactRelease(releaseFd, dependencies);
  const releaseSha256 = sha256(release);
  release.fill(0);
  if (releaseSha256 !== env.FLUYO_INTERNAL_RELEASE_SHA256) fail("PRECONDITION_INTERRUPTED");
  let command;
  let args;
  if (role === "ACQUIRE") [command, args] = [XCODEBUILD, XCODE_ARGS];
  else if (role === "MINIMUM")
    [command, args] = ["/bin/bash", [join(root, "scripts", "ios-ci.sh")]];
  else {
    if (!RUNTIME_IDENTIFIER.test(cleanupRuntime ?? "")) fail("CLEANUP_STORAGE_IDENTITY");
    [command, args] = [XCRUN, ["simctl", "runtime", "delete", cleanupRuntime]];
  }
  const child = (dependencies.spawn ?? spawn)(command, [...args], {
    cwd: role === "MINIMUM" ? root : "/",
    env: targetEnv,
    shell: false,
    detached: false,
    stdio: ["ignore", "inherit", "inherit"],
  });
  const result = await new Promise((resolveClose, rejectClose) => {
    child.once("error", rejectClose);
    child.once("close", (code, signal) => resolveClose({ code, signal }));
  });
  if (result.code !== 0 || result.signal != null)
    fail(
      role === "CLEANUP"
        ? "CLEANUP_DELETE_FAILED"
        : `${role === "MINIMUM" ? "MINIMUM_EVIDENCE" : role}_EXIT`,
    );
}

function waitForReady(stream, child, dependencies = {}) {
  return new Promise((resolveReady, rejectReady) => {
    const chunks = [];
    let bytes = 0;
    let settled = false;
    let timer;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stream.off("data", onData);
      stream.off("end", onEnd);
      child.off("close", onClose);
      child.off("error", onError);
      if (error) rejectReady(error);
      else resolveReady();
    };
    const onData = (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > Buffer.byteLength(CHILD_GATE_READY)) {
        finish(new BootstrapFailure("PRECONDITION_ENV"));
        return;
      }
      chunks.push(Buffer.from(chunk));
    };
    const onEnd = () => {
      if (Buffer.concat(chunks).toString("ascii") !== CHILD_GATE_READY)
        finish(new BootstrapFailure("PRECONDITION_ENV"));
      else finish();
    };
    const onClose = () => finish(new BootstrapFailure("PRECONDITION_INTERRUPTED"));
    const onError = () => finish(new BootstrapFailure("PRECONDITION_INTERRUPTED"));
    stream.on("data", onData);
    stream.once("end", onEnd);
    child.once("close", onClose);
    child.once("error", onError);
    timer = (dependencies.setTimeout ?? setTimeout)(
      () => finish(new BootstrapFailure("PRECONDITION_INTERRUPTED")),
      CHILD_GATE_TIMEOUT_MS,
    );
    timer.unref?.();
  });
}

export async function runGatedPhase(
  {
    role,
    repositoryRoot,
    controllerSource,
    internalEnvironment,
    targetEnvironment,
    cleanupRuntime = null,
    timeoutMs,
    binding,
    freeBefore,
    observations,
    ownedRoots,
    capture,
    onRoleSample,
    isCancelled = () => false,
    beforeRelease = () => {},
  },
  dependencies = {},
) {
  if (typeof onRoleSample !== "function") fail("PRECONDITION_ENV");
  const preReleaseFailure =
    role === "ACQUIRE"
      ? "PRECONDITION_INTERRUPTED"
      : role === "MINIMUM"
        ? "MINIMUM_EVIDENCE_PROCESS_IDENTITY"
        : "CLEANUP_PROCESS_IDENTITY";
  const exitFailure =
    role === "CLEANUP"
      ? "CLEANUP_DELETE_FAILED"
      : role === "MINIMUM"
        ? "MINIMUM_EVIDENCE_EXIT"
        : "ACQUIRE_EXIT";
  const signalFailure =
    role === "CLEANUP"
      ? "CLEANUP_PROCESS_IDENTITY"
      : role === "MINIMUM"
        ? "MINIMUM_EVIDENCE_PROCESS_SIGNAL"
        : "ACQUIRE_PROCESS_SIGNAL";
  const interruptedFailure =
    role === "CLEANUP"
      ? "CLEANUP_INTERRUPTED"
      : role === "MINIMUM"
        ? "MINIMUM_EVIDENCE_INTERRUPTED"
        : "ACQUIRE_INTERRUPTED";
  const monitorFailure =
    role === "MINIMUM"
      ? "MINIMUM_EVIDENCE_MONITOR"
      : role === "CLEANUP"
        ? "CLEANUP_STORAGE_IDENTITY"
        : "ACQUIRE_DISK_MONITOR";
  const rootIdentityFailure =
    role === "MINIMUM"
      ? "MINIMUM_EVIDENCE_MONITOR"
      : role === "CLEANUP"
        ? "CLEANUP_STORAGE_IDENTITY"
        : "ACQUIRE_STORAGE_IDENTITY";
  const mapOperationalFailure = (error) => {
    const code = error instanceof BootstrapFailure ? error.code : null;
    if (role === "CLEANUP") {
      if (code === "ACQUIRE_DISK_FLOOR") return "CLEANUP_DISK_FLOOR";
      if (code === "ACQUIRE_DISK_LIMIT") return "CLEANUP_DISK_LIMIT";
      return CLEANUP_FAILURE_CODES.has(code) ? code : "CLEANUP_STORAGE_IDENTITY";
    }
    if (role === "MINIMUM") {
      if (code === "ACQUIRE_DISK_FLOOR") return "MINIMUM_EVIDENCE_DISK_FLOOR";
      if (code === "ACQUIRE_DISK_LIMIT") return "MINIMUM_EVIDENCE_DISK_LIMIT";
      if (code === "ACQUIRE_STORAGE_IDENTITY" || code === "ACQUIRE_DISK_MONITOR")
        return "MINIMUM_EVIDENCE_MONITOR";
    }
    return PRIMARY_FAILURE_CODES.has(code) ? code : signalFailure;
  };
  const nodeExecutable = realpathSync.native(process.execPath);
  const wrapperArgs = [controllerSource.path, "child-gate", role];
  const wrapperIdentityTokens = [`${CHILD_TITLE_PREFIX}${role.toLowerCase()}`];
  if (role === "CLEANUP") wrapperArgs.push(cleanupRuntime);
  verifyControllerSource(controllerSource);
  for (const owned of ownedRoots)
    validateOwnedRootBinding(owned.binding, rootIdentityFailure, dependencies.rootFs);
  plainClosedEnvironment(
    internalEnvironment,
    INTERNAL_ENV_KEYS.filter((key) => key !== "FLUYO_INTERNAL_RELEASE_SHA256"),
  );
  plainClosedEnvironment(
    targetEnvironment,
    roleTargetKeys(role).filter((key) => !["LANG", "LC_ALL"].includes(key)),
  );
  const releaseToken = Buffer.from(
    (dependencies.randomBytes ?? randomBytes)(CHILD_GATE_RELEASE_BYTES),
  );
  if (releaseToken.length !== CHILD_GATE_RELEASE_BYTES) {
    releaseToken.fill(0);
    fail("PRECONDITION_INTERRUPTED");
  }
  let wrapperEnvironment;
  try {
    wrapperEnvironment = buildWrapperEnvironment(
      role,
      Object.freeze({
        ...internalEnvironment,
        FLUYO_INTERNAL_RELEASE_SHA256: sha256(releaseToken),
      }),
      targetEnvironment,
    );
  } catch (error) {
    releaseToken.fill(0);
    throw error;
  }
  let child;
  try {
    child = (dependencies.spawn ?? spawn)(nodeExecutable, wrapperArgs, {
      cwd: repositoryRoot,
      env: wrapperEnvironment,
      shell: false,
      detached: true,
      stdio: ["ignore", "pipe", "pipe", "pipe", controllerSource.fd, "pipe"],
    });
  } catch (error) {
    releaseToken.fill(0);
    throw error;
  }
  const lifecycle = childLifecycle(child);
  const gate = child.stdio?.[3];
  const ready = child.stdio?.[5];
  let released = false;
  let captured;
  let outputFailure = null;
  let outputLatch = () => {
    if (outputFailure == null) outputFailure = "PRECONDITION_INTERRUPTED";
  };
  const roleCode = role === "MINIMUM" ? "MINIMUM_EVIDENCE" : role;
  const addOutput = (chunk) => {
    capture.bytes += Buffer.byteLength(chunk);
    if (capture.bytes > MAX_COMBINED_CAPTURE_BYTES)
      outputLatch(role === "CLEANUP" ? "CLEANUP_DELETE_FAILED" : `${roleCode}_OUTPUT_LIMIT`);
  };
  child.stdout?.on("data", addOutput);
  child.stderr?.on("data", addOutput);
  let operationalFailure = null;
  try {
    if (!Number.isSafeInteger(child.pid) || !gate || !ready || childClosed(child))
      fail(preReleaseFailure);
    if (isCancelled()) fail(preReleaseFailure);
    await waitForReady(ready, child, dependencies);
    if (outputFailure || isCancelled()) fail(preReleaseFailure);
    captured = await (dependencies.probeIdentity ?? probeProcessIdentity)(
      child.pid,
      wrapperIdentityTokens,
      dependencies,
    );
    if (childClosed(child) || isCancelled()) fail(preReleaseFailure);
    verifyControllerSource(controllerSource);
    beforeRelease();
    if (childClosed(child) || isCancelled()) fail(preReleaseFailure);
    released = true;
    await new Promise((resolveRelease, rejectRelease) => {
      let settled = false;
      const timer = (dependencies.setTimeout ?? setTimeout)(() => {
        if (settled) return;
        settled = true;
        rejectRelease(new BootstrapFailure(exitFailure));
      }, CHILD_GATE_TIMEOUT_MS);
      timer.unref?.();
      gate.end(releaseToken, (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) rejectRelease(new BootstrapFailure(exitFailure));
        else resolveRelease();
      });
    });
    releaseToken.fill(0);
    if (isCancelled()) operationalFailure = interruptedFailure;
  } catch (error) {
    releaseToken.fill(0);
    if (
      error instanceof BootstrapFailure &&
      [
        "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
        "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD",
      ].includes(error.code)
    ) {
      throw error;
    }
    if (!released) {
      gate?.destroy();
      if (!(await awaitActualClose(lifecycle.close, CHILD_CLOSE_WAIT_MS, dependencies))) {
        throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
      }
      throw new BootstrapFailure(preReleaseFailure);
    }
    operationalFailure = exitFailure;
  }
  const monitorStartedAt = monotonicNow(dependencies, monitorFailure);
  try {
    sampleHeldFilesystem(binding, freeBefore, observations, dependencies.fs, onRoleSample);
  } catch (error) {
    if (operationalFailure == null) operationalFailure = mapOperationalFailure(error);
  }
  let terminationFailure = null;
  let terminating = null;
  let holdCode = null;
  let resolveHold;
  const holdPromise = new Promise((resolve) => {
    resolveHold = resolve;
  });
  const settleHold = (code) => {
    if (
      holdCode == null &&
      (code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD" ||
        code === "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD")
    ) {
      holdCode = code;
      resolveHold(Object.freeze({ hold: true }));
    }
  };
  let lastTick = monitorStartedAt;
  let ticks = 0;
  const latch = (code) => {
    if (operationalFailure == null) operationalFailure = code;
    if (!terminating) {
      terminating = terminateVerifiedProcessGroup(
        child,
        lifecycle.close,
        captured,
        wrapperIdentityTokens,
        dependencies,
      ).catch((error) => {
        if (
          error instanceof BootstrapFailure &&
          (error.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD" ||
            error.code === "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD")
        ) {
          settleHold(error.code);
          return;
        }
        terminationFailure = signalFailure;
      });
    }
  };
  lifecycle.settlement.then((result) => {
    if (result.error) latch(exitFailure);
  });
  if (operationalFailure != null) latch(operationalFailure);
  outputLatch = latch;
  if (outputFailure) latch(outputFailure);
  const interval = setInterval(() => {
    try {
      if (isCancelled()) fail(interruptedFailure);
      const now = monotonicNow(dependencies, monitorFailure);
      if (now - lastTick > DISK_MONITOR_MAX_GAP_MS || ++ticks > DISK_MONITOR_MAX_TICKS)
        fail(monitorFailure);
      lastTick = now;
      sampleHeldFilesystem(binding, freeBefore, observations, dependencies.fs, onRoleSample);
      let combined = 0n;
      for (const owned of ownedRoots) {
        validateOwnedRootBinding(owned.binding, rootIdentityFailure, dependencies.rootFs);
        combined += scanOwnedRoot(owned.binding, owned.maximumBytes, {
          ...dependencies.scan,
          failureCode: rootIdentityFailure,
          ...dependencies.rootFs,
        }).bytes;
      }
      if (combined > BigInt(MAX_COMBINED_OWNED_ROOT_BYTES)) fail("MINIMUM_EVIDENCE_ROOT_LIMIT");
    } catch (error) {
      latch(mapOperationalFailure(error));
    }
  }, DISK_MONITOR_INTERVAL_MS);
  interval.unref?.();
  const timer = setTimeout(
    () => latch(role === "CLEANUP" ? "CLEANUP_DELETE_FAILED" : `${roleCode}_TIMEOUT`),
    timeoutMs,
  );
  timer.unref?.();
  const outcome = await Promise.race([
    lifecycle.close.then((result) => Object.freeze({ hold: false, result })),
    holdPromise,
  ]);
  clearInterval(interval);
  clearTimeout(timer);
  if (outcome.hold) throw new BootstrapFailure(holdCode);
  const result = outcome.result;
  if (terminating) await terminating;
  if (holdCode != null) throw new BootstrapFailure(holdCode);
  try {
    verifyControllerSource(controllerSource);
  } catch (error) {
    if (operationalFailure == null) operationalFailure = mapOperationalFailure(error);
  }
  try {
    assertProcessGroupAbsent(captured.pgid, dependencies);
  } catch {
    throw new BootstrapFailure("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
  }
  if (terminationFailure) fail(terminationFailure);
  if (operationalFailure) fail(operationalFailure);
  if (result.code !== 0 || result.signal != null) fail(exitFailure);
  return Object.freeze({ captured, ticks });
}

function transactionReceipt(receipt, values) {
  return validateReceipt({
    ...receipt,
    ...values,
    durationMs: safeNumber(values.durationMs),
  });
}

function removeOwnedRoot(binding, dependencies = {}) {
  if (!binding) return;
  const fs = rootOperations(dependencies);
  validateOwnedRootBinding(binding, "CLEANUP_RAW_RESIDUE", dependencies);
  fs.remove(binding.path, { recursive: true, force: false });
  if (fs.exists(binding.path)) throw new BootstrapFailure("CLEANUP_RAW_RESIDUE");
}

export function releaseTransactionOwnership(
  { unverifiedChildHold, controllerSource, signalTarget, onTransactionSignal },
  dependencies = {},
) {
  if (unverifiedChildHold) return false;
  try {
    if (controllerSource) (dependencies.closeControllerSource ?? closeSync)(controllerSource.fd);
  } finally {
    signalTarget.off("SIGINT", onTransactionSignal);
    signalTarget.off("SIGTERM", onTransactionSignal);
  }
  return true;
}

export async function runTransaction(repositoryRoot, env = process.env, dependencies = {}) {
  const signalTarget = dependencies.signalTarget ?? process;
  const cancellation = { requested: false, phase: "PRECONDITION" };
  let transactionPhase = "PRECONDITION";
  const onTransactionSignal = () => {
    cancellation.requested = true;
    cancellation.phase = transactionPhase;
  };
  signalTarget.once("SIGINT", onTransactionSignal);
  signalTarget.once("SIGTERM", onTransactionSignal);
  let controllerSource;
  let unverifiedChildHold = false;
  try {
    const validateFinalScriptIdentity =
      dependencies.validateFinalScriptIdentity ?? validateScriptIdentity;
    const checkCancellation = () => {
      if (!cancellation.requested) return;
      if (transactionPhase === "PRECONDITION") fail("PRECONDITION_INTERRUPTED");
      if (transactionPhase === "ACQUIRE") fail("ACQUIRE_INTERRUPTED");
      if (transactionPhase === "MINIMUM") fail("MINIMUM_EVIDENCE_INTERRUPTED");
      if (transactionPhase === "CLEANUP") throw new BootstrapFailure("CLEANUP_INTERRUPTED");
      fail("FINALIZATION_INTERRUPTED");
    };
    const source = SOURCE_SHA.test(env.FLUYO_SOURCE_SHA ?? "")
      ? env.FLUYO_SOURCE_SHA
      : "0".repeat(40);
    let receipt = baseReceipt(env, source);
    let started = null;
    let binding;
    let runnerTempBinding;
    let bootstrapRootBinding;
    let minimumRootBinding;
    let bootstrapRoot = null;
    let minimumRoot = null;
    let internalEnvironment;
    let primaryFailureCode = "NONE";
    let cleanupFailureCode = "NONE";
    let downloadResult = "NOT_ATTEMPTED";
    let minimumEvidenceResult = "NOT_RUN";
    let cleanupResult = "NOT_REQUIRED";
    let diagnosticMode = null;
    let observedVersion = null;
    let observedBuild = null;
    let invocationCount = 0;
    let preconditionStage = "INITIAL";
    let runtime;
    let before = null;
    let preExactRuntimeCount = null;
    let postAcquireExactRuntimeCount = null;
    let postCleanupExactRuntimeCount = null;
    let freeBefore = null;
    let freeAfterAcquire = null;
    let freeAfterMinimumEvidence = null;
    let freeAfterCleanup = null;
    let cleanupSampleRecorded = false;
    const recordCleanupSample = (value) => {
      freeAfterCleanup = value;
      if (!cleanupSampleRecorded) cleanupSampleRecorded = true;
    };
    const observations = { minimumFree: null, maximumDelta: 0n, samples: 0 };
    const capture = { bytes: 0 };
    let childEnv;
    try {
      started = monotonicNow(dependencies, "PRECONDITION_ENV");
      checkCancellation();
      assertCatalogTuple();
      preconditionStage = "RUNNER";
      const paths = validateScriptIdentity(repositoryRoot);
      const actualHead = (dependencies.parseHead ?? parseDetachedHead)(paths.repositoryRoot);
      validateRunnerEnvironment(env, actualHead, dependencies.platform, dependencies.arch);
      checkCancellation();
      preconditionStage = "PARENT_IDENTITY";
      process.title = PARENT_TITLE;
      const parentIdentity = await (dependencies.probeParent ?? probeParentIdentity)(
        process.pid,
        null,
        dependencies,
      );
      checkCancellation();
      preconditionStage = "SOURCE";
      controllerSource = openControllerSource(fileURLToPath(import.meta.url));
      internalEnvironment = Object.freeze({
        FLUYO_INTERNAL_CHECKOUT_ROOT: paths.repositoryRoot,
        FLUYO_INTERNAL_IMAGE_OS: "macos15",
        FLUYO_INTERNAL_PARENT_IDENTITY_SHA256: sha256(parentIdentityRecord(parentIdentity)),
        FLUYO_INTERNAL_PARENT_PID: String(process.pid),
        FLUYO_INTERNAL_RUN_ATTEMPT: "1",
        FLUYO_INTERNAL_RUN_ID: env.GITHUB_RUN_ID,
        FLUYO_INTERNAL_RUNNER_ARCH: "ARM64",
        FLUYO_INTERNAL_RUNNER_OS: "macOS",
        FLUYO_INTERNAL_SOURCE_COMMIT: actualHead,
        FLUYO_INTERNAL_SOURCE_SHA256: controllerSource.sha256,
        LANG: "C",
        LC_ALL: "C",
      });
      verifyControllerSource(controllerSource);
      preconditionStage = "ROOTS";
      if (!/^\d{1,20}$/u.test(env.GITHUB_RUN_ID ?? "") || env.GITHUB_RUN_ATTEMPT !== "1")
        fail("PRECONDITION_ENV");
      runnerTempBinding = validateRunnerTemp(env, dependencies.rootFs);
      const legacyRoot = join(runnerTempBinding.path, "fluyo-ios-runtime-bootstrap");
      bootstrapRoot = join(
        runnerTempBinding.path,
        `fluyo-ios-runtime-bootstrap-${env.GITHUB_RUN_ID}-1`,
      );
      minimumRoot = join(runnerTempBinding.path, `fluyo-ios-minimum-${env.GITHUB_RUN_ID}-1`);
      const rootFs = rootOperations(dependencies.rootFs);
      if (rootFs.exists(legacyRoot) || rootFs.exists(bootstrapRoot) || rootFs.exists(minimumRoot))
        fail("PRECONDITION_ENV");
      bootstrapRootBinding = createOwnedRoot(
        runnerTempBinding,
        `fluyo-ios-runtime-bootstrap-${env.GITHUB_RUN_ID}-1`,
        MAX_ATTEMPT_ROOT_BYTES,
        dependencies.rootFs,
      );
      minimumRootBinding = createOwnedRoot(
        runnerTempBinding,
        `fluyo-ios-minimum-${env.GITHUB_RUN_ID}-1`,
        MAX_MINIMUM_WORK_ROOT_BYTES,
        dependencies.rootFs,
      );
      childEnv = closedChildEnvironment(env, bootstrapRoot);
      const runTool = dependencies.runTool ?? runCaptured;
      checkCancellation();
      diagnosticMode = DIAGNOSTIC_MODE;
      preconditionStage = "XCODE_VERSION_PROBE";
      const xcode = await runTool(
        XCODEBUILD,
        ["-version"],
        {
          cwd: paths.repositoryRoot,
          env: childEnv,
          shell: false,
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
        {
          timeout: PROBE_TIMEOUT_MS,
          stdout: 4096,
          stderr: 1024,
          timeoutCode: "PRECONDITION_XCODE_VERSION_PROBE",
          outputCode: "PRECONDITION_XCODE_VERSION_PROBE",
          exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
          diagnosticCode: "PRECONDITION_XCODE_VERSION_PROBE",
        },
      );
      checkCancellation();
      preconditionStage = "XCODE_VERSION_PARSE";
      const parsedXcode = parseXcodeVersion(xcode.stdout);
      observedVersion = parsedXcode.version;
      observedBuild = parsedXcode.build;
      preconditionStage = "SIMCTL_FIND_V2";
      const simctl =
        runTool === runCaptured
          ? await runSimctlFindV2(
              {
                cwd: paths.repositoryRoot,
                env: childEnv,
              },
              dependencies,
            )
          : await runTool(
              XCRUN,
              ["--find", "simctl"],
              {
                cwd: paths.repositoryRoot,
                env: childEnv,
                shell: false,
                detached: true,
                stdio: ["ignore", "pipe", "pipe"],
              },
              Object.freeze({ profile: SIMCTL_FIND_PROFILE }),
            );
      checkCancellation();
      preconditionStage = "SIMCTL_FIND_PATH";
      let simctlPath;
      try {
        simctlPath = realpathSync.native(simctl.stdout.trim());
      } catch {
        fail("PRECONDITION_SIMCTL_FIND_PATH");
      }
      if (!within(simctlPath, XCODE_DEVELOPER_DIR)) fail("PRECONDITION_SIMCTL_FIND_PATH");
      fail("PRECONDITION_XCODE_DIAGNOSTIC_READY");
      preconditionStage = "RUNTIME_INVENTORY";
      const beforeResult = await runTool(
        XCRUN,
        ["simctl", "list", "runtimes", "--json"],
        {
          cwd: paths.repositoryRoot,
          env: childEnv,
          shell: false,
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
        {
          timeout: PROBE_TIMEOUT_MS,
          stdout: 1_048_576,
          stderr: 1024,
          timeoutCode: "PRECONDITION_RUNTIME_INVENTORY",
          outputCode: "PRECONDITION_RUNTIME_INVENTORY",
          exitCode: "PRECONDITION_RUNTIME_INVENTORY",
        },
      );
      checkCancellation();
      before = parseRuntimeInventory(beforeResult.stdout, "PRECONDITION_RUNTIME_INVENTORY");
      preExactRuntimeCount = exactRuntimeRows(before).length;
      if (preExactRuntimeCount !== 0) fail("PRECONDITION_RUNTIME_ALREADY_PRESENT");
      preconditionStage = "STORAGE_ANCHOR";
      ({ binding, freeBefore } = bindStorageAnchor(
        before,
        [env.HOME, env.RUNNER_TEMP, paths.repositoryRoot],
        observations,
        {
          fs: dependencies.fs,
          open: dependencies.openStorageAnchor,
          close: dependencies.closeStorageAnchor,
          discover: dependencies.discoverStorageAnchor,
        },
      ));
      preconditionStage = "DISK";
      if (freeBefore < MIN_FREE_BEFORE_BYTES) fail("PRECONDITION_DISK");
      preconditionStage = "TIME_BUDGET";
      if (elapsedMs(started) > PREFLIGHT_TIMEOUT_MS) fail("PRECONDITION_INSUFFICIENT_TIME");
      ensurePhaseBudget(started, ACQUIRE_TIMEOUT_MS, "PRECONDITION_INSUFFICIENT_TIME");
      preconditionStage = "SOURCE";
      validateFinalScriptIdentity(paths.repositoryRoot);
      verifyControllerSource(controllerSource);
      const acquireTargetEnvironment = Object.freeze({
        DEVELOPER_DIR: XCODE_DEVELOPER_DIR,
        HOME: childEnv.HOME,
        PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
        TMPDIR: bootstrapRoot,
      });
      await runGatedPhase(
        {
          role: "ACQUIRE",
          repositoryRoot: paths.repositoryRoot,
          controllerSource,
          internalEnvironment,
          targetEnvironment: acquireTargetEnvironment,
          timeoutMs: ACQUIRE_TIMEOUT_MS,
          binding,
          freeBefore,
          observations,
          ownedRoots: [{ binding: bootstrapRootBinding, maximumBytes: MAX_ATTEMPT_ROOT_BYTES }],
          capture,
          onRoleSample: (value) => {
            freeAfterAcquire = value;
          },
          isCancelled: () => cancellation.requested,
          beforeRelease: () => {
            invocationCount = 1;
            transactionPhase = "ACQUIRE";
          },
        },
        dependencies,
      );
      checkCancellation();
      downloadResult = "SUCCEEDED";
      transactionPhase = "MINIMUM";
      minimumEvidenceResult = "FAILED";
      const afterResult = await runTool(
        XCRUN,
        ["simctl", "list", "runtimes", "--json"],
        {
          cwd: paths.repositoryRoot,
          env: childEnv,
          shell: false,
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
        {
          timeout: PROBE_TIMEOUT_MS,
          stdout: 1_048_576,
          stderr: 1024,
          timeoutCode: "POST_RUNTIME_CARDINALITY",
          outputCode: "POST_RUNTIME_CARDINALITY",
          exitCode: "POST_RUNTIME_CARDINALITY",
        },
      );
      checkCancellation();
      const afterInventory = parseRuntimeInventory(afterResult.stdout, "POST_RUNTIME_CARDINALITY");
      postAcquireExactRuntimeCount = exactRuntimeRows(afterInventory).length;
      runtime = validatePostInventory(before, afterInventory, binding);
      freeAfterAcquire = sampleHeldFilesystem(
        binding,
        freeBefore,
        observations,
        dependencies.fs,
        (value) => {
          freeAfterAcquire = value;
        },
      );
      ensurePhaseBudget(started, MINIMUM_EVIDENCE_TIMEOUT_MS, "MINIMUM_EVIDENCE_INSUFFICIENT_TIME");
      const scriptIdentity = validateScriptIdentity(paths.repositoryRoot);
      const nodeExecutable = realpathSync.native(process.execPath);
      const nodeDir = dirname(nodeExecutable);
      if (!SAFE_CANONICAL_PATH.test(nodeExecutable) || !SAFE_CANONICAL_PATH.test(nodeDir)) {
        fail("MINIMUM_EVIDENCE_SOURCE_IDENTITY");
      }
      const minimumEnv = Object.freeze({
        CI: "true",
        DEVELOPER_DIR: XCODE_DEVELOPER_DIR,
        FLUYO_DEVELOPER_DIR: XCODE_DEVELOPER_DIR,
        FLUYO_XCODE_PREFIX: "Xcode 16.2",
        FLUYO_SOURCE_SHA: actualHead,
        FLUYO_IOS_EVIDENCE_LEG: "minimum",
        FLUYO_IOS_RUNTIME_IDENTIFIER: runtime.identifier,
        FLUYO_IOS_RUNTIME_VERSION: "17.5",
        FLUYO_IOS_RUNTIME_BUILD: "21F79",
        GITHUB_ACTIONS: "true",
        GITHUB_RUN_ID: env.GITHUB_RUN_ID,
        GITHUB_RUN_ATTEMPT: "1",
        HOME: childEnv.HOME,
        LANG: "en_US.UTF-8",
        LC_ALL: "en_US.UTF-8",
        RUNNER_TEMP: minimumRoot,
        TMPDIR: minimumRoot,
        PATH: `/usr/bin:/bin:/usr/sbin:/sbin:${nodeDir}`,
        FLUYO_NODE_EXECUTABLE: nodeExecutable,
      });
      const minimumTargetEnvironment = Object.freeze(
        Object.fromEntries(
          Object.entries(minimumEnv).filter(([key]) => !["LANG", "LC_ALL"].includes(key)),
        ),
      );
      await runGatedPhase(
        {
          role: "MINIMUM",
          repositoryRoot: scriptIdentity.repositoryRoot,
          controllerSource,
          internalEnvironment,
          targetEnvironment: minimumTargetEnvironment,
          timeoutMs: MINIMUM_EVIDENCE_TIMEOUT_MS,
          binding,
          freeBefore,
          observations,
          ownedRoots: [
            { binding: bootstrapRootBinding, maximumBytes: MAX_ATTEMPT_ROOT_BYTES },
            { binding: minimumRootBinding, maximumBytes: MAX_MINIMUM_WORK_ROOT_BYTES },
          ],
          capture,
          onRoleSample: (value) => {
            freeAfterMinimumEvidence = value;
          },
          isCancelled: () => cancellation.requested,
          beforeRelease: () => {
            transactionPhase = "MINIMUM";
          },
        },
        dependencies,
      );
      checkCancellation();
      preconditionStage = "SOURCE";
      validateFinalScriptIdentity(paths.repositoryRoot);
      freeAfterMinimumEvidence = sampleHeldFilesystem(
        binding,
        freeBefore,
        observations,
        dependencies.fs,
        (value) => {
          freeAfterMinimumEvidence = value;
        },
      );
      minimumEvidenceResult = "SUCCEEDED";
    } catch (error) {
      if (
        error instanceof BootstrapFailure &&
        [
          "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
          "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD",
        ].includes(error.code)
      ) {
        unverifiedChildHold = true;
        throw error;
      }
      primaryFailureCode = sanitizePrimaryFailure(error, invocationCount, preconditionStage);
      if (primaryFailureCode.startsWith("PRECONDITION_")) {
        downloadResult = "NOT_ATTEMPTED";
        minimumEvidenceResult = "NOT_RUN";
      } else if (primaryFailureCode.startsWith("MINIMUM_EVIDENCE_")) {
        downloadResult = "SUCCEEDED";
        minimumEvidenceResult = "FAILED";
      } else if (primaryFailureCode.startsWith("POST_RUNTIME_")) {
        downloadResult = "SUCCEEDED";
        minimumEvidenceResult = "NOT_RUN";
      } else {
        downloadResult = "FAILED";
        minimumEvidenceResult = "NOT_RUN";
      }
    }

    if (invocationCount === 1) {
      cleanupResult = "SUCCEEDED";
      try {
        transactionPhase = "CLEANUP";
        checkCancellation();
        const cleanupEnv = childEnv;
        const runTool = dependencies.runTool ?? runCaptured;
        if (!runtime) {
          const current = await runTool(
            XCRUN,
            ["simctl", "list", "runtimes", "--json"],
            {
              cwd: repositoryRoot,
              env: cleanupEnv,
              shell: false,
              detached: true,
              stdio: ["ignore", "pipe", "pipe"],
            },
            {
              timeout: PROBE_TIMEOUT_MS,
              stdout: 1_048_576,
              stderr: 1024,
              timeoutCode: "CLEANUP_RESIDUE",
              outputCode: "CLEANUP_RESIDUE",
              exitCode: "CLEANUP_RESIDUE",
            },
          );
          checkCancellation();
          const inventory = parseRuntimeInventory(current.stdout, "CLEANUP_RESIDUE");
          postAcquireExactRuntimeCount = exactRuntimeRows(inventory).length;
          if (JSON.stringify(inventory) !== JSON.stringify(before)) {
            try {
              runtime = validatePostInventory(before, inventory, binding);
            } catch {
              throw new BootstrapFailure("CLEANUP_RESIDUE");
            }
          }
        }
        if (runtime) {
          sampleCleanupFilesystem(
            binding,
            freeBefore,
            observations,
            dependencies.fs,
            recordCleanupSample,
          );
          const cleanupTargetEnvironment = Object.freeze({
            DEVELOPER_DIR: XCODE_DEVELOPER_DIR,
            HOME: cleanupEnv.HOME,
            PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
            TMPDIR: bootstrapRoot,
          });
          await runGatedPhase(
            {
              role: "CLEANUP",
              cleanupRuntime: runtime.identifier,
              repositoryRoot,
              controllerSource,
              internalEnvironment,
              targetEnvironment: cleanupTargetEnvironment,
              timeoutMs: CLEANUP_TIMEOUT_MS,
              binding,
              freeBefore,
              observations,
              ownedRoots: [
                { binding: bootstrapRootBinding, maximumBytes: MAX_ATTEMPT_ROOT_BYTES },
                { binding: minimumRootBinding, maximumBytes: MAX_MINIMUM_WORK_ROOT_BYTES },
              ],
              capture,
              onRoleSample: recordCleanupSample,
              isCancelled: () => cancellation.requested,
              beforeRelease: () => {
                transactionPhase = "CLEANUP";
              },
            },
            dependencies,
          );
          checkCancellation();
          sampleCleanupFilesystem(
            binding,
            freeBefore,
            observations,
            dependencies.fs,
            recordCleanupSample,
          );
          const post = await runTool(
            XCRUN,
            ["simctl", "list", "runtimes", "--json"],
            {
              cwd: repositoryRoot,
              env: cleanupEnv,
              shell: false,
              detached: true,
              stdio: ["ignore", "pipe", "pipe"],
            },
            {
              timeout: PROBE_TIMEOUT_MS,
              stdout: 1_048_576,
              stderr: 1024,
              timeoutCode: "CLEANUP_RESIDUE",
              outputCode: "CLEANUP_RESIDUE",
              exitCode: "CLEANUP_RESIDUE",
            },
          );
          checkCancellation();
          const postInventory = parseRuntimeInventory(post.stdout, "CLEANUP_RESIDUE");
          postCleanupExactRuntimeCount = exactRuntimeRows(postInventory).length;
          if (JSON.stringify(postInventory) !== JSON.stringify(before)) {
            throw new BootstrapFailure("CLEANUP_RESIDUE");
          }
        } else {
          postCleanupExactRuntimeCount = postAcquireExactRuntimeCount;
        }
        if (binding)
          freeAfterCleanup = sampleCleanupFilesystem(
            binding,
            freeBefore,
            observations,
            dependencies.fs,
            recordCleanupSample,
          );
        removeOwnedRoot(minimumRootBinding, dependencies.rootFs);
        minimumRootBinding = null;
        removeOwnedRoot(bootstrapRootBinding, dependencies.rootFs);
        bootstrapRootBinding = null;
      } catch (error) {
        if (
          error instanceof BootstrapFailure &&
          [
            "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
            "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD",
          ].includes(error.code)
        ) {
          unverifiedChildHold = true;
          throw error;
        }
        cleanupResult = "FAILED";
        cleanupFailureCode = sanitizeCleanupFailure(error, cleanupSampleRecorded);
      }
    } else {
      try {
        removeOwnedRoot(minimumRootBinding, dependencies.rootFs);
        minimumRootBinding = null;
        removeOwnedRoot(bootstrapRootBinding, dependencies.rootFs);
        bootstrapRootBinding = null;
        const rootFs = rootOperations(dependencies.rootFs);
        if (
          (minimumRoot && rootFs.exists(minimumRoot)) ||
          (bootstrapRoot && rootFs.exists(bootstrapRoot))
        )
          throw new BootstrapFailure("CLEANUP_RAW_RESIDUE");
      } catch {
        cleanupResult = "FAILED";
        cleanupFailureCode = "CLEANUP_RAW_RESIDUE";
      }
    }
    if (binding) closeSync(binding.fd);

    transactionPhase = "FINALIZATION";
    if (cancellation.requested && cleanupResult !== "FAILED" && primaryFailureCode === "NONE") {
      primaryFailureCode = "FINALIZATION_INTERRUPTED";
    }
    let state;
    if (cleanupResult === "FAILED") state = "CLEANUP_FAILED";
    else if (primaryFailureCode.startsWith("PRECONDITION_")) state = "PRECONDITION_REJECTED";
    else if (
      primaryFailureCode.startsWith("ACQUIRE_") ||
      primaryFailureCode.startsWith("POST_RUNTIME_")
    )
      state = "ACQUIRE_FAILED_CLEAN";
    else if (primaryFailureCode.startsWith("MINIMUM_EVIDENCE_")) state = "TEST_FAILED_CLEAN";
    else if (primaryFailureCode === "FINALIZATION_INTERRUPTED") state = "FINALIZATION_FAILED_CLEAN";
    else state = "TRANSACTION_SUCCEEDED_CLEANED";
    if (state === "PRECONDITION_REJECTED") cleanupResult = "NOT_REQUIRED";
    const finalReceipt = transactionReceipt(receipt, {
      diagnosticMode,
      observedVersion,
      observedBuild,
      state,
      primaryFailureCode,
      cleanupFailureCode,
      downloadInvocationCount: invocationCount,
      downloadResult,
      minimumEvidenceResult,
      cleanupResult,
      durationMs: started == null ? 0 : elapsedMs(started),
      freeBytesBefore: freeBefore == null ? null : bigintToSafeNumber(freeBefore),
      freeBytesAfterAcquire: freeAfterAcquire == null ? null : bigintToSafeNumber(freeAfterAcquire),
      freeBytesAfterMinimumEvidence:
        freeAfterMinimumEvidence == null ? null : bigintToSafeNumber(freeAfterMinimumEvidence),
      freeBytesAfterCleanup: freeAfterCleanup == null ? null : bigintToSafeNumber(freeAfterCleanup),
      minimumFreeBytesObserved:
        observations.minimumFree == null ? null : bigintToSafeNumber(observations.minimumFree),
      acquireDiskDeltaBytes:
        observations.maximumDelta == null ? 0 : bigintToSafeNumber(observations.maximumDelta),
      diskMonitorSampleCount: observations.samples,
      preExactRuntimeCount,
      postAcquireExactRuntimeCount,
      postCleanupExactRuntimeCount,
      runtimeIdentifier: runtime?.identifier ?? null,
      runtimeVersion: runtime?.version ?? null,
      runtimeBuild: runtime?.build ?? null,
      rawLogRetained:
        (bootstrapRoot != null && rootOperations(dependencies.rootFs).exists(bootstrapRoot)) ||
        (minimumRoot != null && rootOperations(dependencies.rootFs).exists(minimumRoot)),
      runtimeRetained:
        invocationCount === 1 &&
        (postCleanupExactRuntimeCount === null || postCleanupExactRuntimeCount > 0),
    });
    const finalPath = receiptPath(repositoryRoot);
    const temporary = `${finalPath}.tmp`;
    if (existsSync(temporary)) fail("CLEANUP_RECEIPT_INVALID");
    writeCanonicalJson(temporary, finalReceipt);
    if (existsSync(finalPath)) rmSync(finalPath, { force: false });
    (dependencies.rename ?? renameSync)(temporary, finalPath);
    if (state !== "TRANSACTION_SUCCEEDED_CLEANED") {
      throw new BootstrapFailure(
        state === "CLEANUP_FAILED" ? cleanupFailureCode : primaryFailureCode,
      );
    }
    return finalReceipt;
  } finally {
    releaseTransactionOwnership(
      { unverifiedChildHold, controllerSource, signalTarget, onTransactionSignal },
      dependencies,
    );
  }
}

export function validateReceiptFile(repositoryRoot) {
  const path = receiptPath(repositoryRoot);
  const info = lstatSync(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 1 || info.size > MAX_RECEIPT_BYTES)
    fail("RECEIPT_INVALID");
  const bytes = readFileSync(path);
  if (bytes.length !== info.size) fail("RECEIPT_INVALID");
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("RECEIPT_INVALID");
  }
  if (text !== text.normalize("NFC") || !text.endsWith("\n")) fail("RECEIPT_INVALID");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    fail("RECEIPT_INVALID");
  }
  const receipt = validateReceipt(value);
  if (`${JSON.stringify(receipt)}\n` !== text) fail("RECEIPT_INVALID");
  return receipt;
}

export const testing = Object.freeze({
  RECEIPT_FIELDS,
  PRIMARY_FAILURE_CODES,
  XCODE_PROBE_FAILURE_CODES,
  XCODE_DIAGNOSTIC_FAILURE_CODES,
  PRECONDITION_STAGE_VALUES,
  PRECONDITION_STAGE_FAILURE,
  CLEANUP_FAILURE_CODES,
  EXPECTED_COMMAND_TOKENS,
  exactKeys,
  bigintToSafeNumber,
  sameIdentity,
  sha256,
  INTERNAL_ENV_KEYS,
  ACQUIRE_TARGET_KEYS,
  MINIMUM_TARGET_KEYS,
  positionalSourceBytes,
  waitForReady,
  childLifecycle,
  awaitActualClose,
  runCaptured,
  runSimctlFindV2,
  runPsVerifier,
  sanitizePrimaryFailure,
  sanitizeCleanupFailure,
  monotonicNow,
  validateRunnerTemp,
  validateRunnerTempBinding,
  createOwnedRoot,
  validateOwnedRootBinding,
  removeOwnedRoot,
  validateReceiptPhaseEvidence,
});

async function main() {
  const mode = process.argv[2];
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  try {
    if (mode === "run") await runTransaction(repositoryRoot);
    else if (mode === "verify-receipt") validateReceiptFile(repositoryRoot);
    else if (mode === "child-gate") await childGate(process.argv[3], process.argv[4]);
    else fail("RECEIPT_INVALID");
  } catch (error) {
    if (
      mode === "run" &&
      error instanceof BootstrapFailure &&
      [
        "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
        "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD",
      ].includes(error.code)
    ) {
      process.stderr.write(
        error.code === "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD"
          ? "IOS_RUNTIME_BOOTSTRAP_VERIFIED_CHILD_HOLD\n"
          : "IOS_RUNTIME_BOOTSTRAP_UNVERIFIED_CHILD_HOLD\n",
      );
      await new Promise(() => {});
      return;
    }
    const code =
      error instanceof BootstrapFailure
        ? error.code
        : mode === "verify-receipt"
          ? "CLEANUP_RECEIPT_INVALID"
          : "ACQUIRE_PROCESS_IDENTITY";
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
