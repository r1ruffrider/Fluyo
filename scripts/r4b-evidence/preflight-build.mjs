import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ATTEMPT_002_PATHS,
  recordAttempt002BuildAborted,
  recordAttempt002Building,
  recordAttempt002BuildReady,
  recordAttempt002FailedHeld,
  resolveAttempt002State,
  verifyAttempt002AuthorityCheckout,
} from "./preflight-attempts.mjs";
import { inventoryExactOwnedTree } from "./preflight-executor.mjs";
import {
  assertFixedRootGuard,
  createFixedDirectory,
  isPathWithin,
  readBoundedRegularFile,
  removeFixedOwnedTree,
  unlinkFixedRegularFile,
  writeFixedRegularFile,
} from "./fixed-root-guard.mjs";
import {
  assertNoOwnedProcessesOrSockets,
  assertNoPersistedOwnedProcessesOrSockets,
  assertRegisteredIdentityForForcedTermination,
  assertWindowsStandardUser,
  createImmutableOwnershipRegistry,
  createWriteOnceOwnership,
  freezePersistedOwnershipRegistry,
  inspectWindowsProcessSocketSnapshot,
  validateImmutableOwnershipRegistry,
  validatePersistedOwnershipRegistry,
  withBoundedTimeout,
} from "./preflight-process-owner.mjs";
import {
  validateHarnessInertness,
  validateHarnessProductionBuildProof,
  validateRepositoryDeploymentExclusion,
} from "./production-exclusion.mjs";
import { recoverNativeFailure, spawnNativeJobBoundary } from "./windows-native-client.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const HARNESS = resolve(ROOT, "apps/r4b-preflight-harness");
const NEXT_CLI = fileURLToPath(import.meta.resolve("next/dist/bin/next"));
const NATIVE_BOUNDARY_SOURCE = resolve(ROOT, "scripts/r4b-evidence/windows-native-boundary.cs");
const NATIVE_BOUNDARY_CLIENT = resolve(ROOT, "scripts/r4b-evidence/windows-native-client.mjs");
const POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const PACKAGE_JSON = resolve(ROOT, "package.json");
const LOCKFILE = resolve(ROOT, "package-lock.json");
const INFRASTRUCTURE_PLAN = resolve(
  ROOT,
  "docs/2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md",
);
const BUILD_FAILURE_RECOVERY = ATTEMPT_002_PATHS.buildRecovery;
const BUILD_OWNERSHIP = ATTEMPT_002_PATHS.buildOwnership;
const BUILD_JOB_RESPONSE_TRANSPORT = "INHERITED_ANONYMOUS_RESPONSE_PIPE";
const BUILD_JOB_ACK_TRANSPORT = "SHA256_CAPABILITY_ACK_ON_REQUEST_PIPE";
const BUILDER_TIMEOUT_MS = 900000;
const BUILDER_RECEIPT_SCHEMA = "fluyo:r4b:attempt-002-builder-ownership:v2";
const BUILDER_EVENT_KEYS = Object.freeze([
  "schema",
  "attemptId",
  "ordinal",
  "event",
  "previousRecordSha256",
  "payload",
]);
const BUILDER_INTENT_KEYS = Object.freeze([
  "nodeExecutable",
  "nextCli",
  "argv",
  "canonicalArgvSha256",
  "cwd",
  "allowedRoots",
  "nodeExecutablePathSha256",
  "nodeExecutableSha256",
  "nextCliSha256",
  "nativeBoundarySource",
  "nativeBoundarySourceSha256",
  "nativeBoundaryClient",
  "nativeBoundaryClientSha256",
  "powershellExecutable",
  "powershellExecutableSha256",
  "environmentEntries",
  "environmentSha256",
  "helperArgv",
  "helperArgvSha256",
  "jobResponseTransport",
  "jobAckTransport",
  "status",
]);
const JOB_ASSIGNMENT_KEYS = Object.freeze([
  "receiptSha256",
  "helperPid",
  "builderPid",
  "canonicalArgvSha256",
  "environmentSha256",
  "outputAuthoritySha256",
  "outputPathSha256",
  "infrastructurePlanDigest",
  "outputAuthorityRootId",
  "retainedOutputParentIdentity",
  "distDir",
  "nodeIdentity",
  "nextIdentity",
  "powerShellIdentity",
  "clientIdentity",
  "cwdIdentity",
  "tempIdentity",
  "limitFlags",
  "status",
]);
const BUILD_ENVIRONMENT_KEYS = Object.freeze([
  "ComSpec",
  "NEXT_TELEMETRY_DISABLED",
  "NODE_ENV",
  "SystemRoot",
  "TEMP",
  "TMP",
]);

function guardRepositoryPath(path, options = {}) {
  if (!isPathWithin(path, ROOT)) return;
  assertFixedRootGuard(ROOT, path, {
    label: "attempt-002 build fixed-root guard",
    ...options,
  });
}

function ensureGuardedParent(path) {
  if (!isPathWithin(path, ROOT)) {
    mkdirSync(dirname(path), { recursive: true });
    return;
  }
  createFixedDirectory(dirname(path), ROOT, {
    recursive: true,
    label: "attempt-002 build parent",
  });
}

function guardedRepositoryWrite(path, bytes, options) {
  ensureGuardedParent(path);
  if (!isPathWithin(path, ROOT)) {
    writeFileSync(path, bytes, options);
    return;
  }
  writeFixedRegularFile(path, ROOT, bytes, {
    ...options,
    label: "attempt-002 build write",
  });
}

function readGuardedRecord(path, maximumBytes, label) {
  if (isPathWithin(path, ROOT)) return readBoundedRegularFile(path, ROOT, maximumBytes, label);
  const metadata = lstatSync(path);
  if (metadata.isSymbolicLink() || !metadata.isFile() || metadata.size > maximumBytes) {
    throw new Error(`${label} is linked, non-regular, or outside its byte bound`);
  }
  return readFileSync(path);
}

function guardedRepositoryRemove(path, approvedInventory) {
  if (!isPathWithin(path, ROOT)) {
    rmSync(path, { recursive: true, force: false });
    return;
  }
  const metadata = lstatSync(path);
  if (metadata.isDirectory() && !metadata.isSymbolicLink()) {
    removeFixedOwnedTree(path, ROOT, approvedInventory, "attempt-002 build cleanup");
  } else {
    unlinkFixedRegularFile(path, ROOT, "attempt-002 build artifact cleanup");
  }
}
const BUILD_TRANSACTION_STATES = Object.freeze([
  "AUTHORITY_VALIDATED",
  "BUILDING_RECORDED",
  "BUILD_INVOKED",
  "BUILD_VALIDATED",
  "BUILD_READY_RECORDED",
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function expectedFixedBuildEnvironment() {
  return Object.freeze({
    ComSpec: "C:\\Windows\\System32\\cmd.exe",
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_ENV: "production",
    SystemRoot: "C:\\Windows",
    TEMP: ATTEMPT_002_PATHS.buildTemp,
    TMP: ATTEMPT_002_PATHS.buildTemp,
  });
}

function fixedBuildEnvironment() {
  if (process.platform !== "win32") {
    throw new Error("attempt-002 fixed build environment requires Windows");
  }
  for (const path of ["C:\\Windows", "C:\\Windows\\System32\\cmd.exe"]) {
    const entry = lstatSync(path);
    if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) {
      throw new Error("fixed Windows build environment path changed");
    }
  }
  const temporary = lstatSync(ATTEMPT_002_PATHS.buildTemp);
  if (!temporary.isDirectory() || temporary.isSymbolicLink()) {
    throw new Error("fixed build temp root is absent, linked, or not a directory");
  }
  return expectedFixedBuildEnvironment();
}

export function validateFixedBuildEnvironment(value) {
  const expected = expectedFixedBuildEnvironment();
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new Error("attempt-002 build environment accepts no caller-controlled value");
  }
  return value;
}

function canonicalBuildEnvironmentEntries(value) {
  const environment = validateFixedBuildEnvironment(value);
  const entries = BUILD_ENVIRONMENT_KEYS.map((key) => `${key}=${environment[key]}`);
  return validateCanonicalBuildEnvironmentEntries(entries);
}

function validateCanonicalBuildEnvironmentEntries(entries) {
  if (!Array.isArray(entries) || entries.length !== BUILD_ENVIRONMENT_KEYS.length) {
    throw new Error("builder environment requires exactly six entries");
  }
  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    if (typeof entry !== "string" || entry.includes("\0")) {
      throw new Error("builder environment entry is malformed");
    }
    const separator = entry.indexOf("=");
    const key = separator > 0 ? entry.slice(0, separator) : "";
    const folded = key.toLocaleUpperCase("en-US");
    if (!key || seen.has(folded)) {
      throw new Error("builder environment contains a duplicate or case-colliding key");
    }
    seen.add(folded);
    if (key !== BUILD_ENVIRONMENT_KEYS[index]) {
      throw new Error("builder environment keys are missing, extra, or out of canonical order");
    }
  }
  const expectedEnvironment = expectedFixedBuildEnvironment();
  const expected = BUILD_ENVIRONMENT_KEYS.map((key) => `${key}=${expectedEnvironment[key]}`);
  if (JSON.stringify(entries) !== JSON.stringify(expected)) {
    throw new Error("builder environment values escaped the exact fixed contract");
  }
  return Object.freeze([...entries]);
}

function canonicalBuildEnvironmentBlock(value) {
  const entries = canonicalBuildEnvironmentEntries(value);
  return Buffer.from(`${entries.join("\0")}\0\0`, "utf16le");
}

function canonicalBuildEnvironmentDigest(value) {
  return sha256(canonicalBuildEnvironmentBlock(value));
}

export function validateBuildTransactionTrace(events) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error("build transaction trace is empty");
  }
  const failureIndex = events.indexOf("FAILED_HELD");
  const active = failureIndex < 0 ? events : events.slice(0, failureIndex);
  if (
    active.some((event, index) => event !== BUILD_TRANSACTION_STATES[index]) ||
    active.length > BUILD_TRANSACTION_STATES.length
  ) {
    throw new Error("build transaction trace skipped or reordered a closed boundary");
  }
  if (failureIndex >= 0) {
    if (
      failureIndex === 0 ||
      events.length !== failureIndex + 2 ||
      events[failureIndex + 1] !== "PARTIAL_BUILD_RECOVERED"
    ) {
      throw new Error("build failure trace omitted deterministic recovery");
    }
    return Object.freeze({ status: "FAILED_HELD", boundary: active.at(-1) });
  }
  if (events.length !== BUILD_TRANSACTION_STATES.length) {
    throw new Error("successful build transaction trace is incomplete");
  }
  return Object.freeze({ status: "BUILD_READY", boundary: active.at(-1) });
}

export function validateNodeRuntimeBinding(value) {
  if (
    !value ||
    !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u.test(value.nodeVersion) ||
    value.nodeSupportedRange !== ">=22.12.0" ||
    !/^[0-9a-f]{64}$/u.test(value.nodeExecutablePathSha256) ||
    !/^[0-9a-f]{64}$/u.test(value.nodeExecutableSha256)
  ) {
    throw new Error("Node runtime binding changed or is incomplete");
  }
  const [major, minor] = value.nodeVersion.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 12)) {
    throw new Error("Node runtime is outside the repository-supported range");
  }
  return value;
}

export function assertBuilderStoppedBeforeRecovery(value) {
  if (!value || value.builderOwnershipCleared !== true || value.ownershipReceiptPresent !== false) {
    throw new Error("builder ownership is not zero-safe for build-root recovery");
  }
  return true;
}

function readNodeRuntimeBinding(supportedRange = ">=22.12.0") {
  const nodeExecutable = lstatSync(process.execPath);
  if (!nodeExecutable.isFile() || nodeExecutable.isSymbolicLink()) {
    throw new Error("Node executable is absent, linked, or not a regular file");
  }
  const realNodeExecutable = realpathSync(process.execPath);
  return validateNodeRuntimeBinding({
    nodeVersion: process.versions.node,
    nodeSupportedRange: supportedRange,
    nodeExecutablePathSha256: sha256(Buffer.from(realNodeExecutable, "utf8")),
    nodeExecutableSha256: sha256(readFileSync(realNodeExecutable)),
  });
}

function validateRuntimeAndLockPins() {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON, "utf8"));
  const lockfile = JSON.parse(readFileSync(LOCKFILE, "utf8"));
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (
    packageJson.packageManager !== "npm@11.13.0" ||
    packageJson.engines?.node !== ">=22.12.0" ||
    packageJson.devDependencies?.next !== "16.4.2" ||
    lockfile.lockfileVersion !== 3 ||
    lockfile.packages?.[""]?.devDependencies?.next !== "16.4.2" ||
    major < 22 ||
    (major === 22 && minor < 12)
  ) {
    throw new Error("repository lockfile, package-manager declaration, or Node/Next pin changed");
  }
  const nodeRuntime = readNodeRuntimeBinding(packageJson.engines.node);
  const cli = lstatSync(NEXT_CLI);
  const nativeSource = lstatSync(NATIVE_BOUNDARY_SOURCE);
  const nativeClient = lstatSync(NATIVE_BOUNDARY_CLIENT);
  const powershell = lstatSync(POWERSHELL);
  const commonDirectory = execFileSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: ROOT, encoding: "utf8" },
  ).trim();
  const allowedInstallRoots = [
    resolve(ROOT, "node_modules"),
    resolve(dirname(commonDirectory), "node_modules"),
  ].filter((path) => existsSync(path));
  const realCli = realpathSync(NEXT_CLI);
  const repositoryOwned = allowedInstallRoots.some((root) => {
    const path = relative(realpathSync(root), realCli);
    return path !== "" && !path.startsWith("..") && !isAbsolute(path);
  });
  const installedNext = JSON.parse(
    readFileSync(resolve(dirname(NEXT_CLI), "../../package.json"), "utf8"),
  );
  if (!cli.isFile() || cli.isSymbolicLink()) {
    throw new Error("repository-resolved Next CLI is absent or linked");
  }
  if (
    !nativeSource.isFile() ||
    nativeSource.isSymbolicLink() ||
    !nativeClient.isFile() ||
    nativeClient.isSymbolicLink() ||
    !powershell.isFile() ||
    powershell.isSymbolicLink()
  ) {
    throw new Error("native boundary source/client or Windows PowerShell binding changed");
  }
  if (!repositoryOwned || installedNext.version !== "16.4.2") {
    throw new Error("resolved Next CLI escaped the repository-owned pinned install");
  }
  return Object.freeze({
    nextCliSha256: sha256(readFileSync(NEXT_CLI)),
    nativeBoundarySourceSha256: sha256(readFileSync(NATIVE_BOUNDARY_SOURCE)),
    nativeBoundaryClientSha256: sha256(readFileSync(NATIVE_BOUNDARY_CLIENT)),
    powershellExecutableSha256: sha256(readFileSync(POWERSHELL)),
    allowedBuilderRoots: Object.freeze([
      dirname(realNodeExecutable),
      dirname(realpathSync(POWERSHELL)),
      ...allowedInstallRoots.map((path) => realpathSync(path)),
    ]),
    ...nodeRuntime,
  });
}

function boundedBuilderLog(child) {
  let output = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream?.on("data", (chunk) => {
      output = `${output}${chunk}`.slice(-65536);
    });
  }
  return () => output;
}

function waitForChildExit(child) {
  return new Promise((accept, reject) => {
    if (child.exitCode !== null) {
      accept(Object.freeze({ code: child.exitCode, signal: child.signalCode }));
      return;
    }
    child.once("error", reject);
    child.once("exit", (code, signal) => accept(Object.freeze({ code, signal })));
  });
}

function abortableDelay(milliseconds, signal) {
  return new Promise((accept, reject) => {
    const timer = setTimeout(accept, milliseconds);
    timer.unref?.();
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new Error("builder wait aborted"));
    };
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

function canonicalBuilderArgv() {
  return Object.freeze([realpathSync(process.execPath), realpathSync(NEXT_CLI), "build"]);
}

function canonicalArgvDigest(argv) {
  return sha256(Buffer.from(JSON.stringify(argv), "utf8"));
}

function exactFileDigest(path) {
  return sha256(readFileSync(realpathSync(path)));
}

function exactPathDigest(path) {
  return sha256(Buffer.from(resolve(path).toLowerCase(), "utf8"));
}

function canonicalHelperArgv() {
  const builderArgv = canonicalBuilderArgv();
  const environment = validateFixedBuildEnvironment(expectedFixedBuildEnvironment());
  const environmentEntries = canonicalBuildEnvironmentEntries(environment);
  return Object.freeze([
    realpathSync(POWERSHELL),
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "PERSISTENT_CAPABILITY_PIPE_JOB_CREATE",
    builderArgv[0],
    builderArgv[1],
    realpathSync(HARNESS),
    BUILD_JOB_RESPONSE_TRANSPORT,
    BUILD_JOB_ACK_TRANSPORT,
    canonicalArgvDigest(builderArgv),
    ...environmentEntries,
    canonicalBuildEnvironmentDigest(environment),
    exactFileDigest(builderArgv[0]),
    exactFileDigest(builderArgv[1]),
    realpathSync(POWERSHELL),
    exactFileDigest(POWERSHELL),
    realpathSync(NATIVE_BOUNDARY_CLIENT),
    exactFileDigest(NATIVE_BOUNDARY_CLIENT),
    exactPathDigest(HARNESS),
    exactPathDigest(ATTEMPT_002_PATHS.build),
    exactPathDigest(environment.TEMP),
    exactFileDigest(INFRASTRUCTURE_PLAN),
  ]);
}

function parseWindowsCommandLine(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 32767) {
    throw new Error("builder command line is absent or outside the Windows bound");
  }
  const argv = [];
  let argument = "";
  let quoted = false;
  let started = false;
  for (let index = 0; index < value.length;) {
    if (!quoted && /\s/u.test(value[index])) {
      if (started) {
        argv.push(argument);
        argument = "";
        started = false;
      }
      index += 1;
      continue;
    }
    let slashes = 0;
    while (value[index + slashes] === "\\") slashes += 1;
    if (value[index + slashes] === '"') {
      argument += "\\".repeat(Math.floor(slashes / 2));
      started = true;
      if (slashes % 2 === 0) quoted = !quoted;
      else argument += '"';
      index += slashes + 1;
      continue;
    }
    if (slashes) {
      argument += "\\".repeat(slashes);
      started = true;
      index += slashes;
      continue;
    }
    argument += value[index];
    started = true;
    index += 1;
  }
  if (quoted) throw new Error("builder command line has an unterminated quote");
  if (started) argv.push(argument);
  return argv;
}

function normalizeBuilderArgv(argv) {
  if (!Array.isArray(argv) || argv.length !== 3) {
    throw new Error("builder command line includes missing or extra arguments");
  }
  return [resolve(argv[0]).toLowerCase(), resolve(argv[1]).toLowerCase(), argv[2]];
}

function validateBuilderCommandLine(value, intent) {
  const parsed = normalizeBuilderArgv(parseWindowsCommandLine(value));
  const expected = normalizeBuilderArgv(intent.argv);
  if (JSON.stringify(parsed) !== JSON.stringify(expected)) {
    throw new Error("builder command line escaped the exact Node/Next build contract");
  }
  if (canonicalArgvDigest(intent.argv) !== intent.canonicalArgvSha256) {
    throw new Error("builder canonical argv digest changed");
  }
  return true;
}

function normalizeHelperArgv(argv) {
  if (!Array.isArray(argv) || argv.length !== 30) {
    throw new Error("native Job boundary command line includes missing or extra arguments");
  }
  const normalized = [...argv];
  for (const index of [0, 7, 8, 9, 10, 11, 22, 24]) {
    normalized[index] = resolve(normalized[index]).toLowerCase();
  }
  return normalized;
}

function validateHelperCommandLine(value, intent) {
  const parsed = normalizeHelperArgv(parseWindowsCommandLine(value));
  const expected = normalizeHelperArgv(intent.helperArgv);
  if (
    JSON.stringify(parsed) !== JSON.stringify(expected) ||
    canonicalArgvDigest(intent.helperArgv) !== intent.helperArgvSha256
  ) {
    throw new Error("native Job boundary command line escaped the exact closed contract");
  }
  return true;
}

function durableWrite(path, line, flag) {
  ensureGuardedParent(path);
  if (isPathWithin(path, ROOT)) {
    writeFixedRegularFile(path, ROOT, line, {
      encoding: "utf8",
      flag,
      label: "attempt-002 durable builder write",
    });
  } else {
    writeFileSync(path, line, { encoding: "utf8", flag });
  }
}

function builderEventDigest(event) {
  return sha256(Buffer.from(JSON.stringify(event), "utf8"));
}

function validateBuilderIntent(payload, runtimePins) {
  const argv = canonicalBuilderArgv();
  const helperArgv = canonicalHelperArgv();
  const environment = validateFixedBuildEnvironment(expectedFixedBuildEnvironment());
  const environmentEntries = canonicalBuildEnvironmentEntries(environment);
  if (
    !payload ||
    JSON.stringify(Object.keys(payload)) !== JSON.stringify(BUILDER_INTENT_KEYS) ||
    payload.nodeExecutable !== argv[0] ||
    payload.nextCli !== argv[1] ||
    JSON.stringify(payload.argv) !== JSON.stringify(argv) ||
    payload.canonicalArgvSha256 !== canonicalArgvDigest(argv) ||
    payload.cwd !== realpathSync(HARNESS) ||
    JSON.stringify(payload.allowedRoots) !== JSON.stringify(runtimePins.allowedBuilderRoots) ||
    payload.nodeExecutablePathSha256 !== runtimePins.nodeExecutablePathSha256 ||
    payload.nodeExecutableSha256 !== runtimePins.nodeExecutableSha256 ||
    payload.nextCliSha256 !== runtimePins.nextCliSha256 ||
    payload.nativeBoundarySource !== realpathSync(NATIVE_BOUNDARY_SOURCE) ||
    payload.nativeBoundarySourceSha256 !== runtimePins.nativeBoundarySourceSha256 ||
    payload.nativeBoundaryClient !== realpathSync(NATIVE_BOUNDARY_CLIENT) ||
    payload.nativeBoundaryClientSha256 !== runtimePins.nativeBoundaryClientSha256 ||
    payload.powershellExecutable !== realpathSync(POWERSHELL) ||
    payload.powershellExecutableSha256 !== runtimePins.powershellExecutableSha256 ||
    JSON.stringify(payload.environmentEntries) !== JSON.stringify(environmentEntries) ||
    payload.environmentSha256 !== canonicalBuildEnvironmentDigest(environment) ||
    JSON.stringify(payload.helperArgv) !== JSON.stringify(helperArgv) ||
    payload.helperArgvSha256 !== canonicalArgvDigest(helperArgv) ||
    payload.jobResponseTransport !== BUILD_JOB_RESPONSE_TRANSPORT ||
    payload.jobAckTransport !== BUILD_JOB_ACK_TRANSPORT ||
    payload.status !== "LAUNCH_INTENT"
  ) {
    throw new Error("builder launch intent escaped the exact closed contract");
  }
  return Object.freeze({ ...payload, argv: Object.freeze([...payload.argv]) });
}

function createBuilderLaunchIntent(runtimePins) {
  const argv = canonicalBuilderArgv();
  const helperArgv = canonicalHelperArgv();
  const environment = validateFixedBuildEnvironment(expectedFixedBuildEnvironment());
  const environmentEntries = canonicalBuildEnvironmentEntries(environment);
  return validateBuilderIntent(
    {
      nodeExecutable: argv[0],
      nextCli: argv[1],
      argv,
      canonicalArgvSha256: canonicalArgvDigest(argv),
      cwd: realpathSync(HARNESS),
      allowedRoots: runtimePins.allowedBuilderRoots,
      nodeExecutablePathSha256: runtimePins.nodeExecutablePathSha256,
      nodeExecutableSha256: runtimePins.nodeExecutableSha256,
      nextCliSha256: runtimePins.nextCliSha256,
      nativeBoundarySource: realpathSync(NATIVE_BOUNDARY_SOURCE),
      nativeBoundarySourceSha256: runtimePins.nativeBoundarySourceSha256,
      nativeBoundaryClient: realpathSync(NATIVE_BOUNDARY_CLIENT),
      nativeBoundaryClientSha256: runtimePins.nativeBoundaryClientSha256,
      powershellExecutable: realpathSync(POWERSHELL),
      powershellExecutableSha256: runtimePins.powershellExecutableSha256,
      environmentEntries,
      environmentSha256: canonicalBuildEnvironmentDigest(environment),
      helperArgv,
      helperArgvSha256: canonicalArgvDigest(helperArgv),
      jobResponseTransport: BUILD_JOB_RESPONSE_TRANSPORT,
      jobAckTransport: BUILD_JOB_ACK_TRANSPORT,
      status: "LAUNCH_INTENT",
    },
    runtimePins,
  );
}

function validateBuilderEvent(value, ordinal, previousRecordSha256) {
  if (
    !value ||
    JSON.stringify(Object.keys(value)) !== JSON.stringify(BUILDER_EVENT_KEYS) ||
    value.schema !== BUILDER_RECEIPT_SCHEMA ||
    value.attemptId !== "attempt-002-observer" ||
    value.ordinal !== ordinal ||
    value.previousRecordSha256 !== previousRecordSha256 ||
    !new Set(["LAUNCH_INTENT", "SPAWNED", "JOB_ASSIGNED", "IDENTITY", "ZERO_PROOF"]).has(
      value.event,
    )
  ) {
    throw new Error("builder ownership journal event keys, order, or chain changed");
  }
  if (value.event === "IDENTITY" && JSON.stringify(Object.keys(value.payload)) !== '["record"]') {
    throw new Error("builder identity event top-level payload changed");
  }
  if (
    value.event === "SPAWNED" &&
    (!value.payload ||
      JSON.stringify(Object.keys(value.payload)) !== '["pid"]' ||
      !Number.isSafeInteger(value.payload.pid) ||
      value.payload.pid <= 0)
  ) {
    throw new Error("builder spawned-PID event changed");
  }
  if (
    value.event === "JOB_ASSIGNED" &&
    (!value.payload ||
      JSON.stringify(Object.keys(value.payload)) !== JSON.stringify(JOB_ASSIGNMENT_KEYS) ||
      !/^[0-9a-f]{64}$/u.test(value.payload.receiptSha256 ?? "") ||
      !Number.isSafeInteger(value.payload.helperPid) ||
      value.payload.helperPid <= 0 ||
      !Number.isSafeInteger(value.payload.builderPid) ||
      value.payload.builderPid <= 0 ||
      !/^[0-9a-f]{64}$/u.test(value.payload.canonicalArgvSha256 ?? "") ||
      !/^[0-9a-f]{64}$/u.test(value.payload.environmentSha256 ?? "") ||
      !/^[0-9a-f]{64}$/u.test(value.payload.outputAuthoritySha256 ?? "") ||
      !/^[0-9a-f]{64}$/u.test(value.payload.outputPathSha256 ?? "") ||
      !/^[0-9a-f]{64}$/u.test(value.payload.infrastructurePlanDigest ?? "") ||
      value.payload.outputAuthorityRootId !== "BUILD_OUTPUT_ROOT" ||
      value.payload.distDir !== ".next-attempt-002" ||
      value.payload.retainedOutputParentIdentity !== value.payload.cwdIdentity ||
      ![
        value.payload.nodeIdentity,
        value.payload.nextIdentity,
        value.payload.powerShellIdentity,
        value.payload.clientIdentity,
        value.payload.cwdIdentity,
        value.payload.tempIdentity,
      ].every((identity) => /^(0|[1-9][0-9]*):[0-9a-f]{32}$/iu.test(identity ?? "")) ||
      value.payload.limitFlags !== "JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE" ||
      value.payload.status !== "PASS")
  ) {
    throw new Error("builder Job Object assignment event changed");
  }
  if (
    value.event === "ZERO_PROOF" &&
    JSON.stringify(value.payload) !== '{"status":"ZERO_OWNED_PROCESSES_OR_SOCKETS"}'
  ) {
    throw new Error("builder zero-proof event changed");
  }
  return value;
}

function readBuilderOwnershipJournal(runtimePins, path = BUILD_OWNERSHIP) {
  guardRepositoryPath(path, { allowAbsentLeaf: false, leafKind: "file" });
  const bytes = readGuardedRecord(path, 262144, "builder ownership journal read").toString("utf8");
  if (!bytes.endsWith("\n")) {
    throw new Error("builder ownership journal is truncated or exceeds its bound");
  }
  const events = bytes
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line));
  let previousRecordSha256 = null;
  let intent;
  let spawnedPid;
  let jobAssignment;
  const records = [];
  let zeroProof = false;
  for (const [index, event] of events.entries()) {
    validateBuilderEvent(event, index + 1, previousRecordSha256);
    if (index === 0) {
      if (event.event !== "LAUNCH_INTENT") {
        throw new Error("builder ownership journal must begin with durable LAUNCH_INTENT");
      }
      intent = validateBuilderIntent(event.payload, runtimePins);
    } else if (event.event === "SPAWNED") {
      if (spawnedPid || index !== 1 || records.length || zeroProof) {
        throw new Error("builder spawned PID must be the unique second journal event");
      }
      spawnedPid = event.payload.pid;
    } else if (event.event === "JOB_ASSIGNED") {
      if (!spawnedPid || jobAssignment || records.length || zeroProof) {
        throw new Error("Job Object assignment must precede persisted process identities");
      }
      jobAssignment = Object.freeze({ ...event.payload });
    } else if (event.event === "IDENTITY") {
      if (!spawnedPid) throw new Error("builder identity precedes durable spawned PID");
      if (!jobAssignment)
        throw new Error("builder identity precedes durable Job Object assignment");
      if (zeroProof) throw new Error("builder identity cannot follow zero proof");
      records.push(event.payload.record);
    } else if (event.event === "ZERO_PROOF") {
      if (zeroProof || index !== events.length - 1) {
        throw new Error("builder zero proof must be the unique terminal journal event");
      }
      zeroProof = true;
    } else {
      throw new Error("builder launch intent must be the unique first event");
    }
    previousRecordSha256 = builderEventDigest(event);
  }
  const registry = records.length ? freezePersistedOwnershipRegistry(records) : Object.freeze([]);
  if (registry.length && registry[0].role !== "harness-builder-job-helper") {
    throw new Error("Job Object helper identity is not the first persisted record");
  }
  if (registry.length && registry[0].pid !== spawnedPid) {
    throw new Error("Job Object helper identity does not match the durable spawned PID");
  }
  if (
    jobAssignment &&
    (jobAssignment.helperPid !== spawnedPid ||
      jobAssignment.canonicalArgvSha256 !== intent.canonicalArgvSha256 ||
      jobAssignment.environmentSha256 !== intent.environmentSha256)
  ) {
    throw new Error("Job Object assignment escaped the launch intent");
  }
  for (const record of registry) {
    if (
      !intent.allowedRoots.some((root) => {
        const candidate = relative(resolve(root), resolve(record.allowedRoot));
        return candidate === "" || (!candidate.startsWith("..") && !isAbsolute(candidate));
      })
    ) {
      throw new Error("builder identity escaped launch-intent roots");
    }
  }
  return Object.freeze({
    events: Object.freeze(events),
    intent,
    spawnedPid,
    jobAssignment,
    registry,
    zeroProof,
    previousRecordSha256,
  });
}

function appendBuilderEvent(path, event, payload, runtimePins) {
  const current = existsSync(path)
    ? readBuilderOwnershipJournal(runtimePins, path)
    : { events: [], previousRecordSha256: null };
  const value = {
    schema: BUILDER_RECEIPT_SCHEMA,
    attemptId: "attempt-002-observer",
    ordinal: current.events.length + 1,
    event,
    previousRecordSha256: current.previousRecordSha256,
    payload,
  };
  validateBuilderEvent(value, value.ordinal, current.previousRecordSha256);
  ensureGuardedParent(path);
  durableWrite(path, `${JSON.stringify(value)}\n`, current.events.length ? "a" : "wx");
  return readBuilderOwnershipJournal(runtimePins, path);
}

function writeBuilderLaunchIntent(runtimePins, path = BUILD_OWNERSHIP) {
  if (existsSync(path)) throw new Error("builder ownership journal already exists");
  return appendBuilderEvent(
    path,
    "LAUNCH_INTENT",
    createBuilderLaunchIntent(runtimePins),
    runtimePins,
  );
}

function writeBuilderSpawnedPid(pid, runtimePins, path = BUILD_OWNERSHIP) {
  return appendBuilderEvent(path, "SPAWNED", { pid }, runtimePins);
}

function jobAssignmentPayload(receipt) {
  return Object.freeze({
    receiptSha256: receipt.assignedReceiptSha256,
    helperPid: receipt.assigned.helperPid,
    builderPid: receipt.assigned.builderPid,
    canonicalArgvSha256: receipt.assigned.canonicalArgvSha256,
    environmentSha256: receipt.assigned.environmentSha256,
    outputAuthoritySha256: receipt.assigned.outputAuthoritySha256,
    outputPathSha256: receipt.assigned.outputPathSha256,
    infrastructurePlanDigest: receipt.assigned.infrastructurePlanDigest,
    outputAuthorityRootId: receipt.assigned.outputAuthorityRootId,
    retainedOutputParentIdentity: receipt.assigned.retainedOutputParentIdentity,
    distDir: receipt.assigned.distDir,
    nodeIdentity: receipt.assigned.nodeIdentity,
    nextIdentity: receipt.assigned.nextIdentity,
    powerShellIdentity: receipt.assigned.powerShellIdentity,
    clientIdentity: receipt.assigned.clientIdentity,
    cwdIdentity: receipt.assigned.cwdIdentity,
    tempIdentity: receipt.assigned.tempIdentity,
    limitFlags: receipt.assigned.limitFlags,
    status: "PASS",
  });
}

function resumeBuilderCapability(journal, child) {
  if (
    !journal.jobAssignment ||
    journal.registry.length < 2 ||
    journal.registry[0].role !== "harness-builder-job-helper" ||
    journal.registry[1].role !== "harness-builder"
  ) {
    throw new Error("Job Object resume requires complete immutable ownership registration");
  }
  if (typeof child?.resume !== "function") {
    throw new Error("Job Object resume requires the persistent broker capability");
  }
  return Object.freeze(child.resume());
}

function waitForBuilderJobAssignment(child) {
  if (!child?.assignmentReceipt || child.assignmentReceipt.assigned.helperPid !== child.pid) {
    throw new Error("Job Object assignment lacks its framed broker receipt");
  }
  return child.assignmentReceipt;
}

function removeBuilderOwnershipReceipt(path = BUILD_OWNERSHIP) {
  if (existsSync(path)) guardedRepositoryRemove(path);
}

async function finalizeBuilderZeroArtifacts(
  journal,
  inspect,
  path = BUILD_OWNERSHIP,
  yieldTurn = () => new Promise(setImmediate),
) {
  if (!journal.zeroProof || journal.registry.length < 2) {
    throw new Error("builder artifacts cannot be removed before complete durable zero proof");
  }
  await proveOwnedTreeAbsentTwice(inspect, journal.registry, yieldTurn);
  await yieldTurn();
  await proveOwnedTreeAbsentTwice(inspect, journal.registry, yieldTurn);
  removeBuilderOwnershipReceipt(path);
  await yieldTurn();
  await proveOwnedTreeAbsentTwice(inspect, journal.registry, yieldTurn);
}

function descendantPids(snapshot, rootPids) {
  const owned = new Set(rootPids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const process of snapshot.processes) {
      if (owned.has(process.parentPid) && !owned.has(process.pid)) {
        owned.add(process.pid);
        changed = true;
      }
    }
  }
  return owned;
}

function allowedRootForProcess(processEntry, allowedRoots) {
  return allowedRoots.find((root) => {
    const value = relative(resolve(root), resolve(processEntry.executablePath));
    return value === "" || (!value.startsWith("..") && !isAbsolute(value));
  });
}

function persistDiscoveredBuilderIdentities(
  snapshot,
  journal,
  runtimePins,
  path = BUILD_OWNERSHIP,
) {
  const known = new Set(journal.registry.map(({ pid }) => pid));
  const rootPids = journal.registry
    .filter(
      ({ role }) => role === "harness-builder" || role.startsWith("harness-builder-descendant:"),
    )
    .map(({ pid }) => pid);
  const discoverable = descendantPids(snapshot, rootPids);
  if (!rootPids.length) {
    throw new Error("builder root identity must be persisted before descendant discovery");
  }
  let current = journal;
  for (const pid of [...discoverable].sort((left, right) => left - right)) {
    if (known.has(pid)) continue;
    const processEntry = snapshot.processes.find((entry) => entry.pid === pid);
    const allowedRoot =
      processEntry && allowedRootForProcess(processEntry, journal.intent.allowedRoots);
    if (!processEntry || !allowedRoot) {
      throw new Error("discovered builder descendant escaped the launch-intent roots");
    }
    const [record] = createImmutableOwnershipRegistry(
      [{ role: `harness-builder-descendant:${pid}`, pid, allowedRoot }],
      snapshot,
    );
    current = appendBuilderEvent(path, "IDENTITY", { record }, runtimePins);
    known.add(pid);
  }
  validatePersistedOwnershipRegistry(snapshot, current.registry, current.intent.allowedRoots);
  return current;
}

function registerJobOwnedProcesses(snapshot, child, journal, runtimePins, path = BUILD_OWNERSHIP) {
  if (journal.spawnedPid !== child.pid || journal.jobAssignment?.helperPid !== child.pid) {
    throw new Error("Job Object helper PID does not match its durable assignment");
  }
  const helperProcess = snapshot.processes.find(({ pid }) => pid === child.pid);
  const builderProcess = snapshot.processes.find(
    ({ pid }) => pid === journal.jobAssignment.builderPid,
  );
  if (!helperProcess || !builderProcess) {
    throw new Error("Job Object helper or suspended builder is absent during registration");
  }
  if (child.nativeJobToken) {
    if (!/RunPipeServer/u.test(helperProcess.commandLine)) {
      throw new Error("persistent native broker command line escaped its fixed entry point");
    }
  } else {
    validateHelperCommandLine(helperProcess.commandLine, journal.intent);
  }
  validateBuilderCommandLine(builderProcess.commandLine, journal.intent);
  const [helperRecord, builderRecord] = createImmutableOwnershipRegistry(
    [
      {
        role: "harness-builder-job-helper",
        pid: child.pid,
        allowedRoot: dirname(realpathSync(POWERSHELL)),
      },
      {
        role: "harness-builder",
        pid: journal.jobAssignment.builderPid,
        allowedRoot: dirname(realpathSync(process.execPath)),
      },
    ],
    snapshot,
  );
  if (
    helperRecord.executableSha256 !== runtimePins.powershellExecutableSha256 ||
    builderRecord.executablePathDigest !== runtimePins.nodeExecutablePathSha256 ||
    builderRecord.executableSha256 !== runtimePins.nodeExecutableSha256
  ) {
    throw new Error("Job Object helper or builder escaped its pinned runtime bytes");
  }
  let owned = appendBuilderEvent(path, "IDENTITY", { record: helperRecord }, runtimePins);
  owned = appendBuilderEvent(path, "IDENTITY", { record: builderRecord }, runtimePins);
  return persistDiscoveredBuilderIdentities(snapshot, owned, runtimePins, path);
}

async function withBuilderTimeout(operation, timeoutMs, parentSignal) {
  return await withBoundedTimeout(
    operation,
    timeoutMs,
    "harness builder",
    parentSignal,
    BUILDER_TIMEOUT_MS,
  );
}

async function monitorOwnedBuilder(child, journal, inspect, parentSignal, runtimePins, path) {
  const exit = waitForChildExit(child);
  let current = journal;
  return await withBuilderTimeout(
    async (signal) => {
      while (true) {
        const outcome = await Promise.race([exit, abortableDelay(250, signal).then(() => null)]);
        const snapshot = inspect();
        current = persistDiscoveredBuilderIdentities(snapshot, current, runtimePins, path);
        if (outcome) return Object.freeze({ outcome, journal: current });
      }
    },
    BUILDER_TIMEOUT_MS,
    parentSignal,
  );
}

async function waitForPersistedProcessesToExit(inspect, registry, timeoutMs) {
  const persisted = new Set(registry.map(({ pid }) => pid));
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!inspect().processes.some(({ pid }) => persisted.has(pid))) return true;
    await new Promise((accept) => setTimeout(accept, 50));
  }
  return false;
}

async function proveOwnedTreeAbsentTwice(
  inspect,
  registry,
  yieldTurn = () => new Promise(setImmediate),
) {
  const first = inspect();
  assertNoPersistedOwnedProcessesOrSockets(first, registry);
  await yieldTurn();
  const second = inspect();
  assertNoPersistedOwnedProcessesOrSockets(second, registry);
  return Object.freeze({ first, second });
}

async function terminatePersistedBuilderOwnership(journal, dependencies = {}) {
  const inspect = dependencies.inspect ?? inspectWindowsProcessSocketSnapshot;
  const killPid = dependencies.killPid ?? ((pid, signal) => process.kill(pid, signal));
  const runtimePins = dependencies.runtimePins;
  const path = dependencies.path ?? BUILD_OWNERSHIP;
  if (!journal.registry.length) {
    throw new Error("launch-intent-only builder ownership is ambiguous and cannot be terminated");
  }
  let snapshot = inspect();
  let current = persistDiscoveredBuilderIdentities(snapshot, journal, runtimePins, path);
  validatePersistedOwnershipRegistry(snapshot, current.registry, current.intent.allowedRoots);
  const helperRecord = current.registry.find(({ role }) => role === "harness-builder-job-helper");
  if (
    !current.jobAssignment ||
    !helperRecord ||
    helperRecord.pid !== current.jobAssignment.helperPid
  ) {
    throw new Error(
      "complete Job Object assignment and helper ownership are required to terminate",
    );
  }
  if (snapshot.processes.some(({ pid }) => pid === helperRecord.pid)) {
    killPid(helperRecord.pid, "SIGTERM");
  }
  if (!(await waitForPersistedProcessesToExit(inspect, current.registry, 5000))) {
    snapshot = inspect();
    validatePersistedOwnershipRegistry(snapshot, current.registry, current.intent.allowedRoots);
    if (snapshot.processes.some(({ pid }) => pid === helperRecord.pid)) {
      const exact = freezePersistedOwnershipRegistry([helperRecord]);
      validatePersistedOwnershipRegistry(snapshot, exact, current.intent.allowedRoots);
      killPid(helperRecord.pid, "SIGKILL");
    }
    if (!(await waitForPersistedProcessesToExit(inspect, current.registry, 5000))) {
      throw new Error("Job Object helper close did not terminate the persisted builder tree");
    }
  }
  await proveOwnedTreeAbsentTwice(inspect, current.registry, dependencies.yieldTurn);
  current = appendBuilderEvent(
    path,
    "ZERO_PROOF",
    { status: "ZERO_OWNED_PROCESSES_OR_SOCKETS" },
    runtimePins,
  );
  await proveOwnedTreeAbsentTwice(inspect, current.registry, dependencies.yieldTurn);
  return current;
}

async function safelyTerminalizeBuilderFailure(runtimePins, dependencies = {}) {
  const path = dependencies.path ?? BUILD_OWNERSHIP;
  const journal = readBuilderOwnershipJournal(runtimePins, path);
  if (
    !journal.jobAssignment ||
    journal.registry.length < 2 ||
    journal.registry[0].role !== "harness-builder-job-helper" ||
    journal.registry[1].role !== "harness-builder"
  ) {
    throw new Error(
      "SPAWNED builder without complete Job Object assignment/ownership is permanently ambiguous",
    );
  }
  return await terminatePersistedBuilderOwnership(journal, {
    ...dependencies,
    runtimePins,
    path,
  });
}

async function runOwnedHarnessBuilder(runtimePins, dependencies = {}) {
  const spawnBuilder = dependencies.spawnBuilder;
  const inspect = dependencies.inspect ?? inspectWindowsProcessSocketSnapshot;
  const parentSignal = dependencies.parentSignal;
  const path = dependencies.path ?? BUILD_OWNERSHIP;
  if (parentSignal?.aborted) {
    throw parentSignal.reason ?? new Error("attempt aborted before builder launch");
  }
  const environment = validateFixedBuildEnvironment(fixedBuildEnvironment());
  guardRepositoryPath(HARNESS, { allowAbsentLeaf: false, leafKind: "directory" });
  guardRepositoryPath(NATIVE_BOUNDARY_SOURCE, { allowAbsentLeaf: false, leafKind: "file" });
  guardRepositoryPath(NATIVE_BOUNDARY_CLIENT, { allowAbsentLeaf: false, leafKind: "file" });
  guardRepositoryPath(path);
  writeBuilderLaunchIntent(runtimePins, path);
  let child;
  try {
    const helperArgv = canonicalHelperArgv();
    const spawnOptions = {
      cwd: HARNESS,
      env: environment,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    };
    child = spawnBuilder
      ? spawnBuilder(helperArgv[0], helperArgv.slice(1), spawnOptions)
      : spawnNativeJobBoundary(helperArgv.slice(7), spawnOptions);
  } catch (error) {
    recoverNativeFailure(error, "BUILD_TRANSACTION_FAILED");
    error.builderOwnershipCleared = false;
    throw error;
  }
  if (!Number.isSafeInteger(child?.pid) || child.pid <= 0) {
    const error = new Error("harness builder did not create an exact owned process");
    error.builderOwnershipCleared = false;
    throw error;
  }
  try {
    writeBuilderSpawnedPid(child.pid, runtimePins, path);
  } catch (error) {
    error.builderOwnershipCleared = false;
    throw error;
  }
  const readLog = boundedBuilderLog(child);
  try {
    const jobReceipt = waitForBuilderJobAssignment(child);
    let journal = appendBuilderEvent(
      path,
      "JOB_ASSIGNED",
      jobAssignmentPayload(jobReceipt),
      runtimePins,
    );
    journal = registerJobOwnedProcesses(inspect(), child, journal, runtimePins, path);
    resumeBuilderCapability(journal, child);
    const monitored = await monitorOwnedBuilder(
      child,
      journal,
      inspect,
      parentSignal,
      runtimePins,
      path,
    );
    const closedJobReceipt = child.closedReceipt
      ? { assigned: child.assignmentReceipt.assigned, closed: child.closedReceipt }
      : null;
    if (
      !closedJobReceipt.closed ||
      monitored.outcome.signal ||
      closedJobReceipt.closed.exitCode !== monitored.outcome.code
    ) {
      throw new Error("Job Object helper exit lacks its exact durable close receipt");
    }
    const terminal = await terminatePersistedBuilderOwnership(monitored.journal, {
      inspect,
      runtimePins,
      path,
      killPid: dependencies.killPid,
    });
    await finalizeBuilderZeroArtifacts(terminal, inspect, path, dependencies.yieldTurn);
    if (monitored.outcome.code !== 0 || monitored.outcome.signal) {
      throw new Error(`harness builder failed: ${readLog()}`);
    }
    return Object.freeze({
      status: "PASS",
      pid: child.pid,
      environmentSha256: closedJobReceipt.assigned.environmentSha256,
    });
  } catch (error) {
    if (!existsSync(path)) {
      error.builderOwnershipCleared = true;
      throw error;
    }
    try {
      const terminal = await safelyTerminalizeBuilderFailure(runtimePins, {
        inspect,
        path,
        killPid: dependencies.killPid,
        yieldTurn: dependencies.yieldTurn,
      });
      if (!terminal.zeroProof) throw new Error("builder failure did not reach durable zero proof");
      await finalizeBuilderZeroArtifacts(terminal, inspect, path, dependencies.yieldTurn);
      error.builderOwnershipCleared = true;
      throw error;
    } catch (terminationError) {
      if (terminationError === error) throw error;
      terminationError.builderOwnershipCleared = false;
      throw terminationError;
    }
  }
}

async function recoverPersistedBuilderOwnership(dependencies = {}) {
  const path = dependencies.path ?? BUILD_OWNERSHIP;
  if (!existsSync(path)) {
    return Object.freeze({ status: "ABSENT" });
  }
  const inspect = dependencies.inspect ?? inspectWindowsProcessSocketSnapshot;
  const runtimePins = dependencies.runtimePins ?? validateRuntimeAndLockPins();
  let journal = readBuilderOwnershipJournal(runtimePins, path);
  if (
    !journal.jobAssignment ||
    journal.registry.length < 2 ||
    journal.registry[0].role !== "harness-builder-job-helper" ||
    journal.registry[1].role !== "harness-builder"
  ) {
    throw new Error(
      "SPAWNED builder without complete Job Object assignment/ownership is permanently ambiguous",
    );
  }
  if (journal.zeroProof) {
    const snapshot = inspect();
    assertNoPersistedOwnedProcessesOrSockets(snapshot, journal.registry);
  } else {
    journal = await terminatePersistedBuilderOwnership(journal, {
      ...dependencies,
      inspect,
      runtimePins,
      path,
    });
  }
  await finalizeBuilderZeroArtifacts(journal, inspect, path, dependencies.yieldTurn);
  return Object.freeze({ status: "ZERO_OWNED_PROCESSES_OR_SOCKETS" });
}

function writeBuildFailureRecord(boundary, buildInventory, tempInventory) {
  ensureGuardedParent(ATTEMPT_002_PATHS.buildFailedHeld);
  const failure = {
    schema: "fluyo:r4b:preflight-failed-held:v1",
    attemptId: "attempt-002-observer",
    category: "BUILD_TRANSACTION_FAILED",
    boundary,
    partialBuildInventorySha256: buildInventory.digest,
    partialBuildBytes: String(buildInventory.bytes),
    partialTempInventorySha256: tempInventory.digest,
    partialTempBytes: String(tempInventory.bytes),
    status: "FAILED_HELD",
  };
  guardedRepositoryWrite(ATTEMPT_002_PATHS.buildFailedHeld, `${JSON.stringify(failure)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  recordAttempt002FailedHeld();
  return failure;
}

function recoverPartialBuildAtPaths(paths, failure, buildInventory, tempInventory) {
  for (const [name, path, inventory] of [
    ["build", paths.build, buildInventory],
    ["temp", paths.temp, tempInventory],
  ]) {
    if (existsSync(path)) {
      if (!isPathWithin(path, ROOT)) {
        const current = inventoryExactOwnedTree(path, path);
        if (current.digest !== inventory.digest || current.bytes !== inventory.bytes) {
          throw new Error(`partial ${name} changed before recovery resume`);
        }
      }
      guardedRepositoryRemove(path, inventory);
    }
    const residual = inventoryExactOwnedTree(path, path);
    if (residual.files !== 0 || residual.directories !== 0 || residual.bytes !== 0n) {
      throw new Error(`partial ${name} recovery left residual bytes`);
    }
  }
  const recovery = {
    schema: "fluyo:r4b:preflight-build-recovery:v1",
    attemptId: "attempt-002-observer",
    failureRecordSha256: sha256(Buffer.from(`${JSON.stringify(failure)}\n`, "utf8")),
    discardedBuildInventorySha256: buildInventory.digest,
    discardedBuildBytes: String(buildInventory.bytes),
    discardedTempInventorySha256: tempInventory.digest,
    discardedTempBytes: String(tempInventory.bytes),
    residualBuildBytes: "0",
    residualTempBytes: "0",
    status: "PASS",
  };
  guardedRepositoryWrite(paths.recovery, `${JSON.stringify(recovery)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return recovery;
}

function recoverPartialBuild(failure, buildInventory, tempInventory) {
  return recoverPartialBuildAtPaths(
    {
      build: ATTEMPT_002_PATHS.build,
      temp: ATTEMPT_002_PATHS.buildTemp,
      recovery: BUILD_FAILURE_RECOVERY,
    },
    failure,
    buildInventory,
    tempInventory,
  );
}

function readBuildFailureAtPath(path) {
  const failureBytes = readGuardedRecord(path, 16384, "build failure record read");
  const failure = JSON.parse(failureBytes.toString("utf8"));
  if (
    failure?.schema !== "fluyo:r4b:preflight-failed-held:v1" ||
    failure.attemptId !== "attempt-002-observer" ||
    failure.category !== "BUILD_TRANSACTION_FAILED" ||
    !/^[0-9a-f]{64}$/u.test(failure.partialBuildInventorySha256) ||
    !/^(0|[1-9][0-9]*)$/u.test(failure.partialBuildBytes) ||
    !/^[0-9a-f]{64}$/u.test(failure.partialTempInventorySha256) ||
    !/^(0|[1-9][0-9]*)$/u.test(failure.partialTempBytes) ||
    failure.status !== "FAILED_HELD"
  ) {
    throw new Error("build failure record is outside the closed recovery contract");
  }
  return failure;
}

function validateBuildRecoveryReceiptAtPaths(paths, recovery, failure) {
  if (
    !recovery ||
    recovery.schema !== "fluyo:r4b:preflight-build-recovery:v1" ||
    recovery.attemptId !== "attempt-002-observer" ||
    recovery.failureRecordSha256 !==
      sha256(readGuardedRecord(paths.failure, 16384, "build failure digest read")) ||
    recovery.discardedBuildInventorySha256 !== failure.partialBuildInventorySha256 ||
    recovery.discardedBuildBytes !== failure.partialBuildBytes ||
    recovery.discardedTempInventorySha256 !== failure.partialTempInventorySha256 ||
    recovery.discardedTempBytes !== failure.partialTempBytes ||
    recovery.residualBuildBytes !== "0" ||
    recovery.residualTempBytes !== "0" ||
    recovery.status !== "PASS"
  ) {
    throw new Error("build recovery receipt changed or is incomplete");
  }
  return recovery;
}

function assertRecoveredRootsRemainEmpty(paths) {
  for (const [name, path] of [
    ["build", paths.build],
    ["temp", paths.temp],
  ]) {
    const residual = inventoryExactOwnedTree(path, path);
    if (residual.files !== 0 || residual.directories !== 0 || residual.bytes !== 0n) {
      throw new Error(`recovered ${name} root contains recreated residual bytes`);
    }
  }
}

function resumeBuildRecoveryAtPaths(paths) {
  const failure = readBuildFailureAtPath(paths.failure);
  if (existsSync(paths.recovery)) {
    const recovery = JSON.parse(
      readGuardedRecord(paths.recovery, 16384, "build recovery record read").toString("utf8"),
    );
    const validated = validateBuildRecoveryReceiptAtPaths(paths, recovery, failure);
    assertRecoveredRootsRemainEmpty(paths);
    return validated;
  }
  const recordedBuild = Object.freeze({
    digest: failure.partialBuildInventorySha256,
    bytes: BigInt(failure.partialBuildBytes),
  });
  const recordedTemp = Object.freeze({
    digest: failure.partialTempInventorySha256,
    bytes: BigInt(failure.partialTempBytes),
  });
  // A restarted controller cannot reconstruct the native retained handle set.
  // Passing the record-only summaries below therefore fails closed in
  // removeFixedOwnedTree with a permanent-hold error instead of re-adopting a
  // late tree by path.
  return recoverPartialBuildAtPaths(paths, failure, recordedBuild, recordedTemp);
}

function resumeFixedBuildRecovery() {
  return resumeBuildRecoveryAtPaths({
    build: ATTEMPT_002_PATHS.build,
    temp: ATTEMPT_002_PATHS.buildTemp,
    failure: ATTEMPT_002_PATHS.buildFailedHeld,
    recovery: BUILD_FAILURE_RECOVERY,
  });
}

function closeFixedBuildAbort(recovery) {
  recordAttempt002BuildAborted();
  return Object.freeze({
    schema: "fluyo:r4b:attempt-002-build-transaction:v1",
    attemptId: "attempt-002-observer",
    recoveryReceiptSha256: sha256(Buffer.from(`${JSON.stringify(recovery)}\n`, "utf8")),
    status: "BUILD_ABORTED_RECOVERED",
  });
}

export async function runAttempt002BuildTransaction(...args) {
  if (args.length) throw new Error("attempt-002 build transaction accepts no caller input");
  const initialState = resolveAttempt002State();
  if (initialState === "FAILED_HELD") {
    const recovery = resumeFixedBuildRecovery();
    return closeFixedBuildAbort(recovery);
  }
  if (initialState === "BUILDING") {
    await recoverPersistedBuilderOwnership();
    if (existsSync(ATTEMPT_002_PATHS.buildFailedHeld)) {
      recordAttempt002FailedHeld();
      const recovery = resumeFixedBuildRecovery();
      return closeFixedBuildAbort(recovery);
    }
    const buildInventory = inventoryExactOwnedTree(
      ATTEMPT_002_PATHS.build,
      ATTEMPT_002_PATHS.build,
    );
    const tempInventory = inventoryExactOwnedTree(
      ATTEMPT_002_PATHS.buildTemp,
      ATTEMPT_002_PATHS.buildTemp,
    );
    const failure = writeBuildFailureRecord("BUILDING_RECORDED", buildInventory, tempInventory);
    const recovery = recoverPartialBuild(failure, buildInventory, tempInventory);
    return closeFixedBuildAbort(recovery);
  }
  if (initialState !== "NOT_STARTED") {
    throw new Error("attempt-002 build transaction requires NOT_STARTED state");
  }
  if (existsSync(BUILD_OWNERSHIP)) {
    throw new Error("stale harness-builder ownership blocks a new build transaction");
  }
  const trace = [];
  verifyAttempt002AuthorityCheckout();
  assertWindowsStandardUser();
  const runtimePins = validateRuntimeAndLockPins();
  validateRepositoryDeploymentExclusion();
  validateHarnessInertness();
  trace.push("AUTHORITY_VALIDATED");
  recordAttempt002Building();
  trace.push("BUILDING_RECORDED");
  const controller = new AbortController();
  const abortFromSignal = (signal) => {
    if (!controller.signal.aborted) {
      controller.abort(new Error(`attempt-002 builder received ${signal}`));
    }
  };
  const sigint = () => abortFromSignal("SIGINT");
  const sigterm = () => abortFromSignal("SIGTERM");
  process.once("SIGINT", sigint);
  process.once("SIGTERM", sigterm);
  let builderOwnershipCleared = true;
  try {
    createFixedDirectory(ATTEMPT_002_PATHS.buildTemp, ROOT, {
      recursive: false,
      label: "attempt-002 build temp creation",
    });
    const environment = validateFixedBuildEnvironment(fixedBuildEnvironment());
    builderOwnershipCleared = false;
    const builder = await runOwnedHarnessBuilder(runtimePins, { parentSignal: controller.signal });
    const environmentSha256 = canonicalBuildEnvironmentDigest(environment);
    if (builder.environmentSha256 !== environmentSha256) {
      throw new Error("builder-delivered environment digest changed before BUILD_READY");
    }
    builderOwnershipCleared = true;
    trace.push("BUILD_INVOKED");
    const tempInventory = inventoryExactOwnedTree(
      ATTEMPT_002_PATHS.buildTemp,
      ATTEMPT_002_PATHS.buildTemp,
    );
    guardedRepositoryRemove(ATTEMPT_002_PATHS.buildTemp, tempInventory);
    const proof = validateHarnessProductionBuildProof(ATTEMPT_002_PATHS.build);
    trace.push("BUILD_VALIDATED");
    const ready = {
      schema: "fluyo:r4b:attempt-002-build-ready:v1",
      attemptId: "attempt-002-observer",
      nextCliSha256: runtimePins.nextCliSha256,
      nodeVersion: runtimePins.nodeVersion,
      nodeSupportedRange: runtimePins.nodeSupportedRange,
      nodeExecutablePathSha256: runtimePins.nodeExecutablePathSha256,
      nodeExecutableSha256: runtimePins.nodeExecutableSha256,
      environmentSha256,
      buildInventorySha256: proof.inventorySha256,
      buildFileCount: proof.fileCount,
      discardedBuildTempInventorySha256: tempInventory.digest,
      discardedBuildTempBytes: String(tempInventory.bytes),
      status: "PASS",
    };
    guardedRepositoryWrite(ATTEMPT_002_PATHS.buildReady, `${JSON.stringify(ready)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    recordAttempt002BuildReady();
    trace.push("BUILD_READY_RECORDED");
    validateBuildTransactionTrace(trace);
    return Object.freeze({
      schema: "fluyo:r4b:attempt-002-build-transaction:v1",
      attemptId: "attempt-002-observer",
      buildInventorySha256: proof.inventorySha256,
      buildFileCount: proof.fileCount,
      discardedBuildTempBytes: String(tempInventory.bytes),
      buildReadyReceiptSha256: sha256(Buffer.from(`${JSON.stringify(ready)}\n`, "utf8")),
      status: "BUILD_READY",
    });
  } catch (error) {
    recoverNativeFailure(error, "BUILD_TRANSACTION_FAILED");
    assertBuilderStoppedBeforeRecovery({
      builderOwnershipCleared:
        error?.builderOwnershipCleared === undefined
          ? builderOwnershipCleared
          : error.builderOwnershipCleared === true,
      ownershipReceiptPresent: existsSync(BUILD_OWNERSHIP),
    });
    const buildInventory = inventoryExactOwnedTree(
      ATTEMPT_002_PATHS.build,
      ATTEMPT_002_PATHS.build,
    );
    const tempInventory = inventoryExactOwnedTree(
      ATTEMPT_002_PATHS.buildTemp,
      ATTEMPT_002_PATHS.buildTemp,
    );
    const failure = writeBuildFailureRecord(trace.at(-1), buildInventory, tempInventory);
    const recovery = recoverPartialBuild(failure, buildInventory, tempInventory);
    closeFixedBuildAbort(recovery);
    validateBuildTransactionTrace([...trace, "FAILED_HELD", "PARTIAL_BUILD_RECOVERED"]);
    throw error;
  } finally {
    process.removeListener("SIGINT", sigint);
    process.removeListener("SIGTERM", sigterm);
  }
}

const FIXTURE_SCENARIOS = Object.freeze([
  "failure-after-building",
  "resume-from-failure-record",
  "resume-from-receipt",
  "receipt-with-recreated-residual",
  "tampered-partial",
]);

function exerciseBuildRecoveryFixture(scenario) {
  if (!FIXTURE_SCENARIOS.includes(scenario)) {
    throw new Error("unknown closed build-recovery fixture scenario");
  }
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-r4b-build-recovery-"));
  const paths = {
    build: resolve(root, "build"),
    temp: resolve(root, "temp"),
    failure: resolve(root, "failed-held.json"),
    recovery: resolve(root, "recovery.json"),
  };
  try {
    mkdirSync(paths.build);
    mkdirSync(paths.temp);
    writeFileSync(resolve(paths.build, "partial-build.bin"), "build");
    writeFileSync(resolve(paths.temp, "partial-temp.bin"), "temp");
    const buildInventory = inventoryExactOwnedTree(paths.build, paths.build);
    const tempInventory = inventoryExactOwnedTree(paths.temp, paths.temp);
    const failure = {
      schema: "fluyo:r4b:preflight-failed-held:v1",
      attemptId: "attempt-002-observer",
      category: "BUILD_TRANSACTION_FAILED",
      boundary: "BUILDING_RECORDED",
      partialBuildInventorySha256: buildInventory.digest,
      partialBuildBytes: String(buildInventory.bytes),
      partialTempInventorySha256: tempInventory.digest,
      partialTempBytes: String(tempInventory.bytes),
      status: "FAILED_HELD",
    };
    writeFileSync(paths.failure, `${JSON.stringify(failure)}\n`, { flag: "wx" });

    if (scenario === "tampered-partial") {
      writeFileSync(resolve(paths.build, "tamper.bin"), "tamper");
    }
    if (scenario === "failure-after-building") {
      recoverPartialBuildAtPaths(paths, failure, buildInventory, tempInventory);
    } else {
      resumeBuildRecoveryAtPaths(paths);
    }
    if (scenario === "receipt-with-recreated-residual") {
      mkdirSync(paths.build);
      writeFileSync(resolve(paths.build, "recreated.bin"), "recreated");
    }
    if (scenario === "resume-from-receipt" || scenario === "receipt-with-recreated-residual") {
      resumeBuildRecoveryAtPaths(paths);
    }
    return Object.freeze({
      scenario,
      failureRecordCreated: existsSync(paths.failure),
      recoveryReceiptCreated: existsSync(paths.recovery),
      residualBuildBytes: String(inventoryExactOwnedTree(paths.build, paths.build).bytes),
      residualTempBytes: String(inventoryExactOwnedTree(paths.temp, paths.temp).bytes),
      status: "PASS",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function exerciseBuilderOwnershipFixture(scenario) {
  const allowedRoot = "C:\\fixed\\node";
  const additionalAllowedRoots = ["C:\\fixed\\repo\\node_modules"];
  const base = {
    processes: [
      {
        pid: 700,
        parentPid: 1,
        executablePath: `${allowedRoot}\\node.exe`,
        executableSha256: "a".repeat(64),
        commandLine: "node next build",
        creationTimeUtc: "2026-11-02T00:00:00.000Z",
      },
      {
        pid: 701,
        parentPid: 700,
        executablePath: `${additionalAllowedRoots[0]}\\@next\\swc.exe`,
        executableSha256: "b".repeat(64),
        commandLine: "swc worker",
        creationTimeUtc: "2026-11-02T00:00:01.000Z",
      },
    ],
    sockets: [],
  };
  const registry = createImmutableOwnershipRegistry(
    [{ role: "harness-builder", pid: 700, allowedRoot }],
    base,
  );
  const ownership = createWriteOnceOwnership(
    registry.map(({ pid }) => pid),
    [...registry.map(({ allowedRoot }) => allowedRoot), ...additionalAllowedRoots],
  );
  if (scenario === "clean-exit") {
    validateImmutableOwnershipRegistry(base, registry, additionalAllowedRoots);
    assertNoOwnedProcessesOrSockets({ processes: [], sockets: [] }, ownership);
    return Object.freeze({ status: "PASS" });
  }
  if (scenario === "descendant-survival") {
    assertNoOwnedProcessesOrSockets({ processes: [base.processes[1]], sockets: [] }, ownership);
  } else if (scenario === "pid-reuse-before-force") {
    const drift = {
      ...base,
      processes: base.processes.map((entry) =>
        entry.pid === 700 ? { ...entry, creationTimeUtc: "2026-11-02T00:01:00.000Z" } : entry,
      ),
    };
    assertRegisteredIdentityForForcedTermination(
      drift,
      registry,
      "harness-builder",
      700,
      additionalAllowedRoots,
    );
  } else if (scenario === "unexpected-socket") {
    validateImmutableOwnershipRegistry(
      {
        ...base,
        sockets: [
          {
            pid: 701,
            localAddress: "127.0.0.1",
            remoteAddress: "8.8.8.8",
            State: "Established",
          },
        ],
      },
      registry,
      additionalAllowedRoots,
    );
  } else {
    throw new Error("unknown builder ownership fixture");
  }
  throw new Error("builder ownership fixture unexpectedly passed");
}

function builderFixtureRuntimePins() {
  return Object.freeze({
    ...readNodeRuntimeBinding(),
    nextCliSha256: sha256(readFileSync(NEXT_CLI)),
    nativeBoundarySourceSha256: sha256(readFileSync(NATIVE_BOUNDARY_SOURCE)),
    nativeBoundaryClientSha256: sha256(readFileSync(NATIVE_BOUNDARY_CLIENT)),
    powershellExecutableSha256: sha256(readFileSync(POWERSHELL)),
    allowedBuilderRoots: Object.freeze([
      dirname(realpathSync(process.execPath)),
      dirname(realpathSync(POWERSHELL)),
      dirname(realpathSync(NEXT_CLI)),
    ]),
  });
}

function builderFixtureCommandLine(extra = []) {
  return [...canonicalBuilderArgv(), ...extra].map((value) => `"${value}"`).join(" ");
}

function builderFixtureHelperCommandLine(extra = []) {
  return [...canonicalHelperArgv(), ...extra].map((value) => `"${value}"`).join(" ");
}

function builderFixtureSnapshot(runtimePins, includeDescendants = false) {
  const node = realpathSync(process.execPath);
  const powershell = realpathSync(POWERSHELL);
  const processes = [
    {
      pid: 700,
      parentPid: 1,
      executablePath: powershell,
      executableSha256: runtimePins.powershellExecutableSha256,
      commandLine: builderFixtureHelperCommandLine(),
      creationTimeUtc: "2026-11-02T00:00:00.000Z",
    },
    {
      pid: 701,
      parentPid: 700,
      executablePath: node,
      executableSha256: runtimePins.nodeExecutableSha256,
      commandLine: builderFixtureCommandLine(),
      creationTimeUtc: "2026-11-02T00:00:01.000Z",
    },
  ];
  if (includeDescendants) {
    processes.push(
      {
        pid: 702,
        parentPid: 701,
        executablePath: node,
        executableSha256: runtimePins.nodeExecutableSha256,
        commandLine: '"worker" "middle"',
        creationTimeUtc: "2026-11-02T00:00:02.000Z",
      },
      {
        pid: 703,
        parentPid: 702,
        executablePath: node,
        executableSha256: runtimePins.nodeExecutableSha256,
        commandLine: '"worker" "grandchild"',
        creationTimeUtc: "2026-11-02T00:00:03.000Z",
      },
    );
  }
  return { processes, sockets: [] };
}

async function exerciseBuilderJournalFixture(scenario) {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-builder-journal-"));
  const path = resolve(root, "ownership.jsonl");
  const runtimePins = builderFixtureRuntimePins();
  const child = { pid: 700, exitCode: null };
  let snapshot = builderFixtureSnapshot(runtimePins, scenario === "early-root-exit-with-survivor");
  const inspect = () => structuredClone(snapshot);
  const killPid = (pid) => {
    if (scenario === "late-child-during-termination" && pid === 700) {
      snapshot.processes.push({
        pid: 999,
        parentPid: 701,
        executablePath: realpathSync(process.execPath),
        executableSha256: runtimePins.nodeExecutableSha256,
        commandLine: '"late-child"',
        creationTimeUtc: "2026-11-02T00:00:04.000Z",
      });
    }
    if (pid === 700) snapshot = { processes: [], sockets: [] };
  };
  try {
    writeBuilderLaunchIntent(runtimePins, path);
    if (scenario === "spawn-before-receipt-crash") {
      await recoverPersistedBuilderOwnership({ path, runtimePins, inspect });
    }
    writeBuilderSpawnedPid(child.pid, runtimePins, path);
    if (new Set(["assignment-failure", "helper-job-crash", "registration-failure"]).has(scenario)) {
      try {
        await safelyTerminalizeBuilderFailure(runtimePins, { path, inspect, killPid });
      } catch (error) {
        return Object.freeze({
          status: "AMBIGUOUS",
          message: error.message,
          receiptPresent: existsSync(path),
          processCount: snapshot.processes.length,
        });
      }
      throw new Error("ambiguous builder fixture unexpectedly permitted cleanup");
    }
    const fixtureIdentity = `1:${"a".repeat(32)}`;
    const fixtureOutputPathSha256 = exactPathDigest(ATTEMPT_002_PATHS.build);
    const fixtureInfrastructurePlanDigest = exactFileDigest(INFRASTRUCTURE_PLAN);
    const fixtureOutputAuthoritySha256 = sha256(
      Buffer.from(
        [
          "BUILD_OUTPUT_ROOT",
          fixtureOutputPathSha256,
          fixtureIdentity,
          fixtureInfrastructurePlanDigest,
          ".next-attempt-002",
        ].join("\n"),
        "utf8",
      ),
    );
    let journal = appendBuilderEvent(
      path,
      "JOB_ASSIGNED",
      {
        receiptSha256: "d".repeat(64),
        helperPid: 700,
        builderPid: 701,
        canonicalArgvSha256: canonicalArgvDigest(canonicalBuilderArgv()),
        environmentSha256: canonicalBuildEnvironmentDigest(
          validateFixedBuildEnvironment(expectedFixedBuildEnvironment()),
        ),
        outputAuthoritySha256: fixtureOutputAuthoritySha256,
        outputPathSha256: fixtureOutputPathSha256,
        infrastructurePlanDigest: fixtureInfrastructurePlanDigest,
        outputAuthorityRootId: "BUILD_OUTPUT_ROOT",
        retainedOutputParentIdentity: fixtureIdentity,
        distDir: ".next-attempt-002",
        nodeIdentity: fixtureIdentity,
        nextIdentity: fixtureIdentity,
        powerShellIdentity: fixtureIdentity,
        clientIdentity: fixtureIdentity,
        cwdIdentity: fixtureIdentity,
        tempIdentity: fixtureIdentity,
        limitFlags: "JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE",
        status: "PASS",
      },
      runtimePins,
    );
    journal = registerJobOwnedProcesses(snapshot, child, journal, runtimePins, path);
    if (scenario === "malformed-absent-root-receipt") {
      const events = readBuilderOwnershipJournal(runtimePins, path).events;
      const malformed = structuredClone(events.at(-1));
      malformed.payload.record.extra = true;
      writeFileSync(
        path,
        `${events.slice(0, -1).map(JSON.stringify).join("\n")}\n${JSON.stringify(malformed)}\n`,
      );
      readBuilderOwnershipJournal(runtimePins, path);
    }
    if (scenario === "early-root-exit-with-survivor") {
      journal = persistDiscoveredBuilderIdentities(snapshot, journal, runtimePins, path);
      snapshot = {
        processes: [
          snapshot.processes.find(({ pid }) => pid === 700),
          snapshot.processes.find(({ pid }) => pid === 703),
        ],
        sockets: [
          {
            pid: 703,
            localAddress: "127.0.0.1",
            remoteAddress: "127.0.0.1",
            State: "Established",
          },
        ],
      };
    }
    if (scenario === "intermediate-between-polls") {
      snapshot.processes.push(
        {
          pid: 702,
          parentPid: 701,
          executablePath: realpathSync(process.execPath),
          executableSha256: runtimePins.nodeExecutableSha256,
          commandLine: '"middle"',
          creationTimeUtc: "2026-11-02T00:00:02.000Z",
        },
        {
          pid: 703,
          parentPid: 702,
          executablePath: realpathSync(process.execPath),
          executableSha256: runtimePins.nodeExecutableSha256,
          commandLine: '"orphan"',
          creationTimeUtc: "2026-11-02T00:00:03.000Z",
        },
      );
      snapshot.processes = snapshot.processes.filter(({ pid }) => pid !== 702);
    }
    const result = await recoverPersistedBuilderOwnership({
      path,
      runtimePins,
      inspect,
      killPid,
      yieldTurn: async () => {},
    });
    return Object.freeze({
      status: result.status,
      identityCount: journal.registry.length,
      receiptPresent: existsSync(path),
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function exerciseTwoPassAbsenceFixture() {
  const runtimePins = builderFixtureRuntimePins();
  const snapshot = builderFixtureSnapshot(runtimePins);
  const registry = createImmutableOwnershipRegistry(
    [
      {
        role: "harness-builder-job-helper",
        pid: 700,
        allowedRoot: dirname(realpathSync(POWERSHELL)),
      },
    ],
    snapshot,
  );
  let inspections = 0;
  let yields = 0;
  await proveOwnedTreeAbsentTwice(
    () => {
      inspections += 1;
      return inspections === 1
        ? { processes: [], sockets: [] }
        : { processes: [snapshot.processes[0]], sockets: [] };
    },
    registry,
    async () => {
      yields += 1;
    },
  );
  return { inspections, yields };
}

async function exerciseAlreadyAbortedBuilderFixture() {
  const controller = new AbortController();
  controller.abort(new Error("fixture already aborted"));
  let spawnCount = 0;
  await runOwnedHarnessBuilder(builderFixtureRuntimePins(), {
    parentSignal: controller.signal,
    spawnBuilder: () => {
      spawnCount += 1;
    },
  });
  return spawnCount;
}

export const preflightBuildTesting = Object.freeze({
  canonicalBuildEnvironmentFixture: () => {
    const environment = validateFixedBuildEnvironment(expectedFixedBuildEnvironment());
    const entries = canonicalBuildEnvironmentEntries(environment);
    const block = canonicalBuildEnvironmentBlock(environment);
    return Object.freeze({
      entries,
      block,
      digest: canonicalBuildEnvironmentDigest(environment),
    });
  },
  builderFixtureCommandLine,
  builderFixtureHelperCommandLine,
  builderFixtureRuntimePins,
  exerciseAlreadyAbortedBuilderFixture,
  exerciseBuilderJournalFixture,
  exerciseBuilderOwnershipFixture,
  exerciseTwoPassAbsenceFixture,
  exerciseBuildRecoveryFixture,
  nativeBoundarySource: () => readFileSync(NATIVE_BOUNDARY_SOURCE, "utf8"),
  nativeBoundaryCSharpSource: () => readFileSync(NATIVE_BOUNDARY_SOURCE, "utf8"),
  nativeBoundarySourcePath: () => NATIVE_BOUNDARY_SOURCE,
  readGuardedRecord,
  validateBuilderCommandLine: (value) =>
    validateBuilderCommandLine(value, createBuilderLaunchIntent(builderFixtureRuntimePins())),
  validateHelperCommandLine: (value) =>
    validateHelperCommandLine(value, createBuilderLaunchIntent(builderFixtureRuntimePins())),
  validateCanonicalBuildEnvironmentEntries,
  readNodeRuntimeBinding,
  validateRuntimeAndLockPins,
  withBuilderTimeoutAt: (timeoutMs, operation = () => Promise.resolve(true)) =>
    withBuilderTimeout(operation, timeoutMs),
  withBuilderTimeoutFixture: () => withBuilderTimeout(() => new Promise(() => {}), 5),
});
