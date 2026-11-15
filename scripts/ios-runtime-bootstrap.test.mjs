import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, sep } from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDecoder } from "node:util";

import {
  ACQUIRE_TIMEOUT_MS,
  CHILD_CLOSE_WAIT_MS,
  CHILD_GATE_READY,
  CHILD_GATE_RELEASE_BYTES,
  CHILD_GATE_TIMEOUT_MS,
  CATALOG_PAYLOAD_BYTES,
  CATALOG_TUPLE,
  CATALOG_TUPLE_SHA256,
  CLEANUP_FINAL_RESERVE_MS,
  CLEANUP_TIMEOUT_MS,
  DISK_MONITOR_INTERVAL_MS,
  DISK_MONITOR_MAX_GAP_MS,
  DISK_MONITOR_MAX_TICKS,
  DIAGNOSTIC_MODE,
  EXPECTED_XCODE_BUILD,
  EXPECTED_XCODE_VERSION,
  FINALIZATION_TIMEOUT_MS,
  IOS_CI_SOURCE_BYTES,
  IOS_CI_SOURCE_SHA256,
  MAX_ACQUIRE_DISK_DELTA_BYTES,
  MAX_ATTEMPT_ROOT_BYTES,
  MAX_COMBINED_CAPTURE_BYTES,
  MAX_COMBINED_OWNED_ROOT_BYTES,
  MAX_MINIMUM_WORK_ROOT_BYTES,
  MAX_SCAN_DURATION_MS,
  MAX_SCAN_ENTRIES,
  MAX_CONTROLLER_SOURCE_BYTES,
  MAX_RECEIPT_BYTES,
  MINIMUM_EVIDENCE_TIMEOUT_MS,
  MIN_FREE_AFTER_ACQUIRE_BYTES,
  MIN_FREE_AFTER_CLEANUP_BYTES,
  MIN_FREE_BEFORE_BYTES,
  POLICY_ID,
  PARENT_TITLE,
  PREFLIGHT_TIMEOUT_MS,
  PROBE_TIMEOUT_MS,
  PS,
  PS_STDERR_MAX_BYTES,
  PS_STDOUT_MAX_BYTES,
  PS_TIMEOUT_MS,
  REQUIRED_FREE_RESERVE_BYTES,
  TOTAL_TRANSACTION_TIMEOUT_MS,
  WORKFLOW_MARGIN_MS,
  WORKFLOW_STEP_TIMEOUT_MS,
  XCODEBUILD,
  XCODE_DEVELOPER_DIR,
  XCODE_ARGS,
  BootstrapFailure,
  assertCatalogTuple,
  assertProcessGroupAbsent,
  bindStorageAnchor,
  buildWrapperEnvironment,
  closedChildEnvironment,
  discoverStorageAnchor,
  exactRuntimeRows,
  parsePsIdentity,
  parseParentPsIdentity,
  probeParentIdentity,
  parentIdentityRecord,
  parseRuntimeInventory,
  parseXcodeVersion,
  scanOwnedRoot,
  releaseTransactionOwnership,
  runGatedPhase,
  signalVerifiedProcessGroup,
  terminateVerifiedProcessGroup,
  testing,
  testingReceipt,
  validatePostInventory,
  validateChildGateEnvironment,
  validateChildGateDescriptors,
  validateReceipt,
  validateRunnerEnvironment,
} from "./ios-runtime-bootstrap.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const controllerPath = resolve(root, "scripts/ios-runtime-bootstrap.mjs");
const controllerSourceBytes = readFileSync(controllerPath);
const controllerSourceSha256 = createHash("sha256").update(controllerSourceBytes).digest("hex");
assert.equal(
  controllerSourceSha256,
  "12425795f01ea4c723a514ebcf1664bd939dd2381ea950a685fb6e42f2cbd147",
);
const ORACLE_SOURCE_INVALID = "IOS_RUNTIME_ORACLE_SOURCE_INVALID";
const ORACLE_IMPORT_QUERY = /^[0-9a-f]{32}$/u;
function decodeOracleControllerBytes(bytes) {
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(ORACLE_SOURCE_INVALID);
  }
  if (source !== source.normalize("NFC")) throw new Error(ORACLE_SOURCE_INVALID);
  if (!Buffer.from(source, "utf8").equals(Buffer.from(bytes))) {
    throw new Error(ORACLE_SOURCE_INVALID);
  }
  return source;
}
const controllerSource = decodeOracleControllerBytes(controllerSourceBytes);
const workflowSource = readFileSync(resolve(root, ".github/workflows/ios.yml"), "utf8");
const iosCiSource = readFileSync(resolve(root, "scripts/ios-ci.sh"), "utf8");
const oracleImportUrls = new Set();

const SAFE_PATH_SOURCE_TOKEN = String.raw`export const SAFE_CANONICAL_PATH = /^\/[A-Za-z0-9._/+\-]+$/u;`;
const XCODE_DIRECTORY_SOURCE_TOKEN =
  'export const XCODE_DEVELOPER_DIR = "/Applications/Xcode_16.2.app/Contents/Developer";';
const HOST_ARCHITECTURE_SOURCE_TOKEN = 'import { arch as hostArchitecture } from "node:os";';
const HOST_ARCHITECTURE_ORACLE_REPLACEMENT = 'const hostArchitecture = () => "arm64";';
const ORACLE_SIMCTL_RELATIVE_PATH = "usr/bin/simctl";
const ORACLE_SIMCTL_CONTENT = "fixture\n";
const ORACLE_SIMCTL_MODE = 0o600;
const ORACLE_SOURCE_MODE = 0o600;
const ORACLE_IOS_CI_MODE = 0o700;
const ORACLE_DIRECTORY_MODE = 0o700;
const ORACLE_SOURCE_COMMIT = "b3203f0b96db5efca6d3cd16e6eb39d80a9cd3a5";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const oraclePathPatternFor = (rootPath, separator) => {
  assert.equal(typeof rootPath, "string");
  assert.ok(separator === "/" || separator === "\\");
  assert.equal(rootPath.endsWith(separator), false);
  const escapedSeparator = escapeRegExp(separator);
  const segment = `(?!\\.{1,2}(?:${escapedSeparator}|$))[A-Za-z0-9._+ -]+`;
  return `^${escapeRegExp(rootPath)}(?:${escapedSeparator}${segment})*$`;
};

function replaceOracleToken(source, token, replacement) {
  const first = source.indexOf(token);
  assert.notEqual(first, -1);
  assert.equal(source.indexOf(token, first + token.length), -1);
  return source.slice(0, first) + replacement + source.slice(first + token.length);
}

async function withRunTransactionWindowsOracle(action) {
  const originalTitle = process.title;
  const productionControllerHash = controllerSourceSha256;
  const currentControllerBytes = readFileSync(controllerPath);
  assert.deepEqual(currentControllerBytes, controllerSourceBytes);
  assert.equal(
    createHash("sha256").update(currentControllerBytes).digest("hex"),
    productionControllerHash,
  );
  const oracleControllerSource = decodeOracleControllerBytes(currentControllerBytes);
  const createdRoot = mkdtempSync(resolve(tmpdir(), "fluyo-ios17-runtransaction-oracle-"));
  const fixtureRoot = realpathSync.native(createdRoot);
  try {
    const repositoryRoot = resolve(fixtureRoot, "repo");
    const scriptsDirectory = resolve(repositoryRoot, "scripts");
    const home = resolve(fixtureRoot, "home");
    const runnerTemp = resolve(fixtureRoot, "runner-temp");
    const storageRoot = resolve(fixtureRoot, "storage");
    const developerDirectory = resolve(fixtureRoot, "Xcode_16.2.app", "Contents", "Developer");
    const simctlPath = resolve(developerDirectory, ORACLE_SIMCTL_RELATIVE_PATH);
    for (const directory of [
      scriptsDirectory,
      home,
      runnerTemp,
      storageRoot,
      dirname(simctlPath),
    ]) {
      mkdirSync(directory, { recursive: true, mode: ORACLE_DIRECTORY_MODE });
    }
    const bootstrapParent = resolve(runnerTemp, "fluyo-ios-runtime-bootstrap");
    const bootstrapLeaf = resolve(runnerTemp, "fluyo-ios-runtime-bootstrap-9401-1");
    const minimumLeaf = resolve(runnerTemp, "fluyo-ios-minimum-9401-1");
    assert.equal(existsSync(bootstrapParent), false);
    assert.equal(existsSync(bootstrapLeaf), false);
    assert.equal(existsSync(minimumLeaf), false);

    const iosCiBytes = Buffer.from(iosCiSource, "utf8");
    assert.equal(iosCiBytes.length, IOS_CI_SOURCE_BYTES);
    assert.equal(createHash("sha256").update(iosCiBytes).digest("hex"), IOS_CI_SOURCE_SHA256);
    writeFileSync(resolve(scriptsDirectory, "ios-ci.sh"), iosCiBytes, {
      flag: "wx",
      mode: ORACLE_IOS_CI_MODE,
    });
    writeFileSync(simctlPath, ORACLE_SIMCTL_CONTENT, {
      encoding: "utf8",
      flag: "wx",
      mode: ORACLE_SIMCTL_MODE,
    });
    const simctlInfo = lstatSync(simctlPath);
    assert.equal(simctlInfo.isFile(), true);
    assert.equal(simctlInfo.isSymbolicLink(), false);

    const oraclePathPattern = oraclePathPatternFor(fixtureRoot, sep);
    const oraclePathRegex = new RegExp(oraclePathPattern, "u");
    assert.equal(oraclePathRegex.test(fixtureRoot), true);
    assert.equal(oraclePathRegex.test(resolve(fixtureRoot, "repo")), true);
    assert.equal(oraclePathRegex.test(resolve(fixtureRoot, "repo", "scripts")), true);
    const safePathReplacement = `export const SAFE_CANONICAL_PATH = new RegExp(${JSON.stringify(oraclePathPattern)}, "u");`;
    const developerDirectoryReplacement = `export const XCODE_DEVELOPER_DIR = ${JSON.stringify(developerDirectory)};`;
    let transformed = replaceOracleToken(
      oracleControllerSource,
      SAFE_PATH_SOURCE_TOKEN,
      safePathReplacement,
    );
    transformed = replaceOracleToken(
      transformed,
      XCODE_DIRECTORY_SOURCE_TOKEN,
      developerDirectoryReplacement,
    );
    transformed = replaceOracleToken(
      transformed,
      HOST_ARCHITECTURE_SOURCE_TOKEN,
      HOST_ARCHITECTURE_ORACLE_REPLACEMENT,
    );
    assert.equal(transformed.includes(HOST_ARCHITECTURE_SOURCE_TOKEN), false);
    assert.equal(
      transformed.indexOf(HOST_ARCHITECTURE_ORACLE_REPLACEMENT),
      transformed.lastIndexOf(HOST_ARCHITECTURE_ORACLE_REPLACEMENT),
    );
    assert.notEqual(transformed, oracleControllerSource);
    assert.equal(
      createHash("sha256").update(readFileSync(controllerPath)).digest("hex"),
      productionControllerHash,
    );
    assert.deepEqual(readFileSync(controllerPath), controllerSourceBytes);

    const fixtureControllerPath = resolve(fixtureRoot, "ios-runtime-bootstrap.fixture.mjs");
    writeFileSync(fixtureControllerPath, transformed, {
      encoding: "utf8",
      flag: "wx",
      mode: ORACLE_SOURCE_MODE,
    });
    const importUrl = pathToFileURL(fixtureControllerPath);
    const oracleQuery = randomBytes(16).toString("hex");
    assert.match(oracleQuery, ORACLE_IMPORT_QUERY);
    importUrl.searchParams.set("oracle", oracleQuery);
    assert.equal([...importUrl.searchParams.keys()].length, 1);
    assert.equal(importUrl.searchParams.get("oracle"), oracleQuery);
    assert.equal(importUrl.hash, "");
    assert.equal(oracleImportUrls.has(importUrl.href), false);
    oracleImportUrls.add(importUrl.href);
    const controller = await import(importUrl.href);
    const environment = Object.freeze({
      FLUYO_SOURCE_SHA: ORACLE_SOURCE_COMMIT,
      GITHUB_RUN_ATTEMPT: "1",
      GITHUB_RUN_ID: "9401",
      HOME: home,
      ImageOS: "macos15",
      ImageVersion: "20261104.0514.1",
      RUNNER_ARCH: "ARM64",
      RUNNER_OS: "macOS",
      RUNNER_TEMP: runnerTemp,
    });
    const oracleReceiptPath = resolve(
      repositoryRoot,
      "artifacts",
      "ios-runtime-bootstrap",
      "receipt.json",
    );
    const result = await action(
      Object.freeze({
        controller,
        bootstrapLeaf,
        bootstrapParent,
        developerDirectory,
        environment,
        fixtureControllerPath,
        fixtureRoot,
        minimumLeaf,
        receiptPath: oracleReceiptPath,
        repositoryRoot,
        runnerTemp,
        simctlPath,
        storageRoot,
      }),
    );
    assert.equal(existsSync(bootstrapParent), false);
    assert.equal(existsSync(bootstrapLeaf), false);
    assert.equal(existsSync(minimumLeaf), false);
    if (existsSync(oracleReceiptPath)) {
      assert.equal(readFileSync(oracleReceiptPath, "utf8").includes(oracleQuery), false);
    }
    assert.deepEqual(readFileSync(controllerPath), controllerSourceBytes);
    assert.equal(
      createHash("sha256").update(readFileSync(controllerPath)).digest("hex"),
      productionControllerHash,
    );
    return result;
  } finally {
    process.title = originalTitle;
    rmSync(fixtureRoot, { recursive: true, force: false });
    assert.equal(existsSync(fixtureRoot), false);
  }
}

function throwsCode(action, code) {
  assert.throws(action, (error) => error?.code === code);
}

function fakeChild(pid = 321) {
  const child = new EventEmitter();
  child.pid = pid;
  child.exitCode = null;
  child.signalCode = null;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  return child;
}

const esrch = () => Object.assign(new Error("absent"), { code: "ESRCH" });

function row(overrides = {}) {
  return {
    identifier: "com.apple.CoreSimulator.SimRuntime.iOS-18-5",
    name: "iOS 18.5",
    version: "18.5",
    build: "22F76",
    available: true,
    bundlePath: "/Library/Developer/CoreSimulator/Profiles/Runtimes/iOS 18.5.simruntime",
    runtimeRoot:
      "/Library/Developer/CoreSimulator/Profiles/Runtimes/iOS 18.5.simruntime/Contents/Resources/RuntimeRoot",
    ...overrides,
  };
}

const provenanceCases = [
  [
    "catalog tuple is exactly 261 UTF-8 bytes",
    () => assert.equal(Buffer.byteLength(CATALOG_TUPLE), 261),
  ],
  [
    "catalog tuple hash is exact",
    () =>
      assert.equal(
        CATALOG_TUPLE_SHA256,
        "27c0b7cd887423ccf4ac33c0378accc9b4e659adab748e6b0e66f009b8da0510",
      ),
  ],
  ["catalog tuple validates", () => assert.equal(assertCatalogTuple().simulatorBuild, "21F79")],
  ["payload byte count is exact", () => assert.equal(CATALOG_PAYLOAD_BYTES, 7_336_630_623n)],
  [
    "SDK build is not conflated with simulator build",
    () => assert.equal(CATALOG_TUPLE.includes("21F77"), false),
  ],
  [
    "artifact identifier is exact",
    () => assert.match(CATALOG_TUPLE, /com\.apple\.dmg\.iPhoneSimulatorSDK17_5/u),
  ],
  [
    "catalog version is exact",
    () => assert.match(CATALOG_TUPLE, /"catalogVersion":"17\.5\.0\.0"/u),
  ],
  ["content type is diskImage", () => assert.match(CATALOG_TUPLE, /"contentType":"diskImage"/u)],
  [
    "tuple hash is not named payload hash",
    () => assert.doesNotMatch(controllerSource, /payloadSha256/u),
  ],
  ["policy id is exact", () => assert.equal(POLICY_ID, "ios_17_5_runtime_bootstrap_v1")],
];

for (const [name, action] of provenanceCases) test(`provenance: ${name}`, action);

const runnerCases = [
  [
    "runner validation accepts exact tuple",
    () =>
      assert.equal(
        validateRunnerEnvironment(
          {
            RUNNER_OS: "macOS",
            RUNNER_ARCH: "ARM64",
            ImageOS: "macos15",
            ImageVersion: "20261104.0514.1",
            GITHUB_RUN_ATTEMPT: "1",
            GITHUB_RUN_ID: "1",
            FLUYO_SOURCE_SHA: "a".repeat(40),
          },
          "a".repeat(40),
          "darwin",
          "arm64",
        ),
        true,
      ),
  ],
  [
    "runner rejects wrong platform",
    () =>
      throwsCode(
        () =>
          validateRunnerEnvironment(
            {
              RUNNER_OS: "macOS",
              RUNNER_ARCH: "ARM64",
              ImageOS: "macos15",
              ImageVersion: "20261104.0514.1",
              GITHUB_RUN_ATTEMPT: "1",
              GITHUB_RUN_ID: "1",
              FLUYO_SOURCE_SHA: "a".repeat(40),
            },
            "a".repeat(40),
            "linux",
            "arm64",
          ),
        "PRECONDITION_RUNNER",
      ),
  ],
  [
    "runner rejects x64",
    () =>
      throwsCode(
        () =>
          validateRunnerEnvironment(
            {
              RUNNER_OS: "macOS",
              RUNNER_ARCH: "ARM64",
              ImageOS: "macos15",
              ImageVersion: "20261104.0514.1",
              GITHUB_RUN_ATTEMPT: "1",
              GITHUB_RUN_ID: "1",
              FLUYO_SOURCE_SHA: "a".repeat(40),
            },
            "a".repeat(40),
            "darwin",
            "x64",
          ),
        "PRECONDITION_RUNNER",
      ),
  ],
  [
    "runner rejects attempt two",
    () =>
      throwsCode(
        () =>
          validateRunnerEnvironment(
            {
              RUNNER_OS: "macOS",
              RUNNER_ARCH: "ARM64",
              ImageOS: "macos15",
              ImageVersion: "20261104.0514.1",
              GITHUB_RUN_ATTEMPT: "2",
              GITHUB_RUN_ID: "1",
              FLUYO_SOURCE_SHA: "a".repeat(40),
            },
            "a".repeat(40),
            "darwin",
            "arm64",
          ),
        "PRECONDITION_RUN_ATTEMPT",
      ),
  ],
  [
    "runner rejects source drift",
    () =>
      throwsCode(
        () =>
          validateRunnerEnvironment(
            {
              RUNNER_OS: "macOS",
              RUNNER_ARCH: "ARM64",
              ImageOS: "macos15",
              ImageVersion: "20261104.0514.1",
              GITHUB_RUN_ATTEMPT: "1",
              GITHUB_RUN_ID: "1",
              FLUYO_SOURCE_SHA: "a".repeat(40),
            },
            "b".repeat(40),
            "darwin",
            "arm64",
          ),
        "PRECONDITION_SOURCE",
      ),
  ],
  [
    "closed env accepts no credentials",
    () =>
      assert.deepEqual(
        Object.keys(closedChildEnvironment({ HOME: "/Users/runner" }, "/tmp/owned")),
        ["DEVELOPER_DIR", "HOME", "TMPDIR", "PATH", "LANG", "LC_ALL"],
      ),
  ],
  [
    "closed env rejects proxy case-insensitively",
    () =>
      throwsCode(
        () => closedChildEnvironment({ HOME: "/Users/runner", HtTp_PrOxY: "x" }, "/tmp/owned"),
        "PRECONDITION_ENV",
      ),
  ],
  [
    "closed env rejects token",
    () =>
      throwsCode(
        () => closedChildEnvironment({ HOME: "/Users/runner", ANY_TOKEN: "x" }, "/tmp/owned"),
        "PRECONDITION_ENV",
      ),
  ],
  [
    "closed env pins developer dir",
    () =>
      assert.equal(
        closedChildEnvironment({ HOME: "/Users/runner" }, "/tmp/owned").DEVELOPER_DIR,
        "/Applications/Xcode_16.2.app/Contents/Developer",
      ),
  ],
  [
    "Xcode version accepts exact build",
    () =>
      assert.deepEqual(parseXcodeVersion("Xcode 16.2\nBuild version 16C5032a\n"), {
        version: "16.2",
        build: "16C5032a",
      }),
  ],
  [
    "Xcode version rejects other build",
    () =>
      throwsCode(
        () => parseXcodeVersion("Xcode 16.2\nBuild version BAD\n"),
        "PRECONDITION_XCODE_VERSION_PARSE",
      ),
  ],
  ["workflow pins macos-15", () => assert.match(workflowSource, /runs-on: macos-15/u)],
  [
    "workflow disables cancellation",
    () => assert.match(workflowSource, /cancel-in-progress: false/u),
  ],
  [
    "workflow has no direct minimum bash step",
    () =>
      assert.doesNotMatch(
        workflowSource.split("  current-ios:")[0],
        /run: bash scripts\/ios-ci\.sh/u,
      ),
  ],
];

for (const [name, action] of runnerCases) test(`runner/env: ${name}`, action);

function directoryInfo(dev = 1n, ino = 2n) {
  return {
    dev,
    ino,
    size: 0n,
    isDirectory: () => true,
    isFile: () => false,
    isSymbolicLink: () => false,
  };
}

const fakePaths = {
  realpath: (value) => value,
  lstat: () => directoryInfo(),
};

const inventoryCases = [
  [
    "runtime inventory parses exact rows",
    () =>
      assert.equal(
        parseRuntimeInventory(
          JSON.stringify({
            runtimes: [
              {
                identifier: "com.apple.CoreSimulator.SimRuntime.iOS-17-5",
                name: "iOS 17.5",
                version: "17.5",
                buildversion: "21F79",
                isAvailable: true,
                bundlePath: "/Library/Developer/CoreSimulator/a",
                runtimeRoot: "/Library/Developer/CoreSimulator/b",
              },
            ],
          }),
        )[0].build,
        "21F79",
      ),
  ],
  [
    "runtime inventory rejects invalid JSON",
    () => throwsCode(() => parseRuntimeInventory("{"), "PRECONDITION_RUNTIME_INVENTORY"),
  ],
  [
    "exact row requires availability",
    () =>
      assert.equal(
        exactRuntimeRows([row({ version: "17.5", build: "21F79", available: false })]).length,
        0,
      ),
  ],
  [
    "exact row requires simulator build",
    () => assert.equal(exactRuntimeRows([row({ version: "17.5", build: "21F77" })]).length, 0),
  ],
  [
    "anchor is nearest CoreSimulator ancestor",
    () =>
      assert.equal(
        discoverStorageAnchor([row()], [], fakePaths).path,
        "/Library/Developer/CoreSimulator",
      ),
  ],
  [
    "anchor rejects no Apple-emitted candidate",
    () => throwsCode(() => discoverStorageAnchor([], [], fakePaths), "PRECONDITION_STORAGE_ANCHOR"),
  ],
  [
    "anchor rejects two canonical roots",
    () =>
      throwsCode(
        () =>
          discoverStorageAnchor(
            [
              row(),
              row({
                identifier: "com.apple.CoreSimulator.SimRuntime.iOS-18-6",
                bundlePath: "/Volumes/Other/CoreSimulator/a",
                runtimeRoot: "/Volumes/Other/CoreSimulator/b",
              }),
            ],
            [],
            fakePaths,
          ),
        "PRECONDITION_STORAGE_ANCHOR",
      ),
  ],
  [
    "anchor rejects a symlink candidate",
    () =>
      throwsCode(
        () =>
          discoverStorageAnchor([row()], [], {
            realpath: (value) => value,
            lstat: () => ({ ...directoryInfo(), isSymbolicLink: () => true }),
          }),
        "PRECONDITION_STORAGE_ANCHOR",
      ),
  ],
  [
    "post inventory accepts exact introduced row",
    () =>
      assert.equal(
        validatePostInventory(
          [row()],
          [
            row(),
            row({
              identifier: "com.apple.CoreSimulator.SimRuntime.iOS-17-5",
              name: "iOS 17.5",
              version: "17.5",
              build: "21F79",
              bundlePath: "/Library/Developer/CoreSimulator/new",
              runtimeRoot: "/Library/Developer/CoreSimulator/new/root",
            }),
          ],
          { path: "/Library/Developer/CoreSimulator", dev: 1n },
          fakePaths,
        ).build,
        "21F79",
      ),
  ],
  [
    "post inventory rejects two exact rows",
    () =>
      throwsCode(
        () =>
          validatePostInventory(
            [],
            [
              row({
                identifier: "com.apple.CoreSimulator.SimRuntime.iOS-17-5",
                version: "17.5",
                build: "21F79",
              }),
              row({
                identifier: "com.apple.CoreSimulator.SimRuntime.iOS-17-5-b",
                version: "17.5",
                build: "21F79",
              }),
            ],
            { path: "/Library/Developer/CoreSimulator", dev: 1n },
            fakePaths,
          ),
        "POST_RUNTIME_CARDINALITY",
      ),
  ],
  [
    "post inventory rejects invalid identifier",
    () =>
      throwsCode(
        () =>
          validatePostInventory(
            [],
            [row({ identifier: "bad", version: "17.5", build: "21F79" })],
            { path: "/Library/Developer/CoreSimulator", dev: 1n },
            fakePaths,
          ),
        "POST_RUNTIME_IDENTITY",
      ),
  ],
  [
    "post inventory rejects unrelated drift",
    () =>
      throwsCode(
        () =>
          validatePostInventory(
            [row()],
            [
              row({ name: "changed" }),
              row({
                identifier: "com.apple.CoreSimulator.SimRuntime.iOS-17-5",
                version: "17.5",
                build: "21F79",
              }),
            ],
            { path: "/Library/Developer/CoreSimulator", dev: 1n },
            fakePaths,
          ),
        "POST_RUNTIME_CARDINALITY",
      ),
  ],
  [
    "post inventory rejects outside anchor",
    () =>
      throwsCode(
        () =>
          validatePostInventory(
            [],
            [
              row({
                identifier: "com.apple.CoreSimulator.SimRuntime.iOS-17-5",
                version: "17.5",
                build: "21F79",
                bundlePath: "/Volumes/Other/new",
                runtimeRoot: "/Volumes/Other/new/root",
              }),
            ],
            { path: "/Library/Developer/CoreSimulator", dev: 1n },
            fakePaths,
          ),
        "POST_RUNTIME_STORAGE_VOLUME",
      ),
  ],
  [
    "runtime identifier is observed not pre-pinned",
    () => assert.doesNotMatch(CATALOG_TUPLE, /CoreSimulator/u),
  ],
];

for (const [name, action] of inventoryCases) test(`inventory/anchor: ${name}`, action);

const diskCases = [
  [
    "payload plus reserve equals preflight floor",
    () => assert.equal(CATALOG_PAYLOAD_BYTES + REQUIRED_FREE_RESERVE_BYTES, MIN_FREE_BEFORE_BYTES),
  ],
  ["floor equality passes", () => assert.equal(MIN_FREE_AFTER_ACQUIRE_BYTES, 2_147_483_648n)],
  ["delta equality passes", () => assert.equal(MAX_ACQUIRE_DISK_DELTA_BYTES, 11_811_160_064n)],
  ["monitor cadence is 250ms", () => assert.equal(DISK_MONITOR_INTERVAL_MS, 250)],
  ["monitor max gap is 1000ms", () => assert.equal(DISK_MONITOR_MAX_GAP_MS, 1000)],
  [
    "monitor cap includes boundary samples",
    () => assert.equal(DISK_MONITOR_MAX_TICKS, ACQUIRE_TIMEOUT_MS / DISK_MONITOR_INTERVAL_MS + 2),
  ],
  ["attempt root cap is 256MiB", () => assert.equal(MAX_ATTEMPT_ROOT_BYTES, 256 * 1024 * 1024)],
  [
    "minimum root cap is 4GiB",
    () => assert.equal(MAX_MINIMUM_WORK_ROOT_BYTES, 4 * 1024 * 1024 * 1024),
  ],
  [
    "combined root cap is exact sum",
    () =>
      assert.equal(
        MAX_COMBINED_OWNED_ROOT_BYTES,
        MAX_ATTEMPT_ROOT_BYTES + MAX_MINIMUM_WORK_ROOT_BYTES,
      ),
  ],
  ["capture cap is 4MiB", () => assert.equal(MAX_COMBINED_CAPTURE_BYTES, 4 * 1024 * 1024)],
  [
    "transaction phase budget is exact",
    () =>
      assert.equal(
        PREFLIGHT_TIMEOUT_MS +
          ACQUIRE_TIMEOUT_MS +
          MINIMUM_EVIDENCE_TIMEOUT_MS +
          CLEANUP_TIMEOUT_MS +
          FINALIZATION_TIMEOUT_MS,
        TOTAL_TRANSACTION_TIMEOUT_MS,
      ),
  ],
  [
    "workflow margin is exact",
    () => assert.equal(WORKFLOW_STEP_TIMEOUT_MS - TOTAL_TRANSACTION_TIMEOUT_MS, WORKFLOW_MARGIN_MS),
  ],
  [
    "cleanup final reserve is exact",
    () => assert.equal(CLEANUP_TIMEOUT_MS + FINALIZATION_TIMEOUT_MS, CLEANUP_FINAL_RESERVE_MS),
  ],
  [
    "root scanner bounds entries and duration",
    () => {
      assert.equal(MAX_SCAN_ENTRIES, 100000);
      assert.equal(MAX_SCAN_DURATION_MS, 1000);
    },
  ],
];

for (const [name, action] of diskCases) test(`disk/monitor: ${name}`, action);

const receiptCases = [
  [
    "success receipt validates",
    () => assert.equal(validateReceipt(testingReceipt()).state, "TRANSACTION_SUCCEEDED_CLEANED"),
  ],
  [
    "receipt rejects extra key",
    () =>
      throwsCode(() => validateReceipt({ ...testingReceipt(), extra: true }), "RECEIPT_INVALID"),
  ],
  [
    "receipt rejects missing key",
    () => {
      const value = testingReceipt();
      delete value.runId;
      throwsCode(() => validateReceipt(value), "RECEIPT_INVALID");
    },
  ],
  [
    "receipt rejects unsafe integer",
    () =>
      throwsCode(
        () => validateReceipt(testingReceipt({ durationMs: Number.MAX_SAFE_INTEGER + 1 })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "receipt rejects unknown primary",
    () =>
      throwsCode(
        () => validateReceipt(testingReceipt({ primaryFailureCode: "UNKNOWN" })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "receipt rejects unknown cleanup",
    () =>
      throwsCode(
        () => validateReceipt(testingReceipt({ cleanupFailureCode: "UNKNOWN" })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "receipt rejects unknown minimum result",
    () =>
      throwsCode(
        () => validateReceipt(testingReceipt({ minimumEvidenceResult: "UNKNOWN" })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "receipt binds requested variant wording",
    () => assert.equal(testingReceipt().requestedArchitectureVariant, "arm64"),
  ],
  [
    "receipt has no architectureVariant field",
    () => assert.equal("architectureVariant" in testingReceipt(), false),
  ],
  [
    "precondition receipt validates",
    () =>
      assert.equal(
        validateReceipt(
          testingReceipt({
            state: "PRECONDITION_REJECTED",
            primaryFailureCode: "PRECONDITION_ENV",
            cleanupFailureCode: "NONE",
            downloadInvocationCount: 0,
            downloadResult: "NOT_ATTEMPTED",
            minimumEvidenceResult: "NOT_RUN",
            cleanupResult: "NOT_REQUIRED",
            observedVersion: null,
            observedBuild: null,
            runtimeIdentifier: null,
            runtimeVersion: null,
            runtimeBuild: null,
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
          }),
        ).state,
        "PRECONDITION_REJECTED",
      ),
  ],
  [
    "precondition receipt rejects invocation",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            testingReceipt({
              state: "PRECONDITION_REJECTED",
              primaryFailureCode: "PRECONDITION_ENV",
              cleanupFailureCode: "NONE",
              downloadInvocationCount: 1,
              downloadResult: "NOT_ATTEMPTED",
              minimumEvidenceResult: "NOT_RUN",
              cleanupResult: "NOT_REQUIRED",
              runtimeIdentifier: null,
              runtimeVersion: null,
              runtimeBuild: null,
              minimumFreeBytesObserved: null,
              diskMonitorSampleCount: 0,
            }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "acquire failed clean validates",
    () =>
      assert.equal(
        validateReceipt(
          testingReceipt({
            state: "ACQUIRE_FAILED_CLEAN",
            primaryFailureCode: "ACQUIRE_EXIT",
            cleanupFailureCode: "NONE",
            downloadResult: "FAILED",
            minimumEvidenceResult: "NOT_RUN",
            cleanupResult: "SUCCEEDED",
            runtimeIdentifier: null,
            runtimeVersion: null,
            runtimeBuild: null,
            postAcquireExactRuntimeCount: 0,
            freeBytesAfterMinimumEvidence: null,
          }),
        ).state,
        "ACQUIRE_FAILED_CLEAN",
      ),
  ],
  [
    "test failed clean validates",
    () =>
      assert.equal(
        validateReceipt(
          testingReceipt({
            state: "TEST_FAILED_CLEAN",
            primaryFailureCode: "MINIMUM_EVIDENCE_EXIT",
            cleanupFailureCode: "NONE",
            downloadResult: "SUCCEEDED",
            minimumEvidenceResult: "FAILED",
            cleanupResult: "SUCCEEDED",
          }),
        ).state,
        "TEST_FAILED_CLEAN",
      ),
  ],
  [
    "cleanup failed requires cleanup code",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            testingReceipt({
              state: "CLEANUP_FAILED",
              cleanupResult: "FAILED",
              cleanupFailureCode: "NONE",
            }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "tuple hash field is exact",
    () => assert.equal(testingReceipt().artifactTupleSha256, CATALOG_TUPLE_SHA256),
  ],
  [
    "receipt permits observed runtime identifier",
    () => assert.match(testingReceipt().runtimeIdentifier, /^com\.apple\.CoreSimulator/u),
  ],
  [
    "receipt rejects arbitrary runtime identifier",
    () =>
      throwsCode(
        () => validateReceipt(testingReceipt({ runtimeIdentifier: "/private/path" })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "receipt has no raw output field",
    () =>
      assert.equal(
        Object.keys(testingReceipt()).some((key) =>
          /stdout|stderr|path|pid|device|user|env/iu.test(key),
        ),
        false,
      ),
  ],
  [
    "receipt retained flags are false on success",
    () =>
      assert.deepEqual(
        [testingReceipt().rawLogRetained, testingReceipt().runtimeRetained],
        [false, false],
      ),
  ],
  [
    "receipt fallback is always false",
    () =>
      throwsCode(() => validateReceipt(testingReceipt({ fallbackUsed: true })), "RECEIPT_INVALID"),
  ],
];

for (const [name, action] of receiptCases) test(`receipt: ${name}`, action);

const validPs = `123 123 Fri Nov 14 12:34:56 2026 ${XCODEBUILD} ${XCODE_ARGS.join(" ")}\n`;
const verifierCases = [
  ["ps path is exact", () => assert.equal(PS, "/bin/ps")],
  ["ps timeout is exact", () => assert.equal(PS_TIMEOUT_MS, 2000)],
  [
    "ps caps are exact",
    () => assert.deepEqual([PS_STDOUT_MAX_BYTES, PS_STDERR_MAX_BYTES], [4096, 1024]),
  ],
  ["valid C-locale identity parses", () => assert.equal(parsePsIdentity(validPs, 123).pgid, 123)],
  [
    "invalid locale date rejects",
    () =>
      throwsCode(
        () => parsePsIdentity(validPs.replace("Fri Nov", "Freitag Nov"), 123),
        "ACQUIRE_PROCESS_IDENTITY_GRAMMAR",
      ),
  ],
  [
    "zero lines reject",
    () => throwsCode(() => parsePsIdentity("", 123), "ACQUIRE_PROCESS_IDENTITY_OUTPUT_LIMIT"),
  ],
  [
    "multiple lines reject",
    () =>
      throwsCode(
        () => parsePsIdentity(validPs + validPs, 123),
        "ACQUIRE_PROCESS_IDENTITY_OUTPUT_LIMIT",
      ),
  ],
  [
    "extra command token rejects",
    () =>
      throwsCode(
        () => parsePsIdentity(validPs.trimEnd() + " extra\n", 123),
        "ACQUIRE_PROCESS_IDENTITY_GRAMMAR",
      ),
  ],
  [
    "stdout cap rejects",
    () =>
      throwsCode(
        () => parsePsIdentity("x".repeat(4097), 123),
        "ACQUIRE_PROCESS_IDENTITY_OUTPUT_LIMIT",
      ),
  ],
  [
    "PID reuse rejects",
    () =>
      throwsCode(
        () => parsePsIdentity(validPs.replace(/^123/u, "124"), 123),
        "ACQUIRE_PROCESS_IDENTITY_GRAMMAR",
      ),
  ],
  [
    "PGID mismatch rejects",
    () =>
      throwsCode(
        () => parsePsIdentity(validPs.replace(/^123 123/u, "123 124"), 123),
        "ACQUIRE_PROCESS_IDENTITY_GRAMMAR",
      ),
  ],
  [
    "executable drift rejects",
    () =>
      throwsCode(
        () => parsePsIdentity(validPs.replace(XCODEBUILD, "/tmp/xcodebuild"), 123),
        "ACQUIRE_PROCESS_IDENTITY_GRAMMAR",
      ),
  ],
  [
    "argv drift rejects",
    () =>
      throwsCode(
        () => parsePsIdentity(validPs.replace("17.5", "18.0"), 123),
        "ACQUIRE_PROCESS_IDENTITY_GRAMMAR",
      ),
  ],
  [
    "group absence accepts ESRCH",
    () =>
      assert.equal(
        assertProcessGroupAbsent(123, {
          kill: () => {
            const error = new Error();
            error.code = "ESRCH";
            throw error;
          },
        }),
        true,
      ),
  ],
  [
    "group residue fails without signal",
    () =>
      throwsCode(
        () => assertProcessGroupAbsent(123, { kill: () => undefined }),
        "ACQUIRE_PROCESS_GROUP_RESIDUE",
      ),
  ],
  [
    "identity parser emits frozen four fields",
    () =>
      assert.deepEqual(Object.keys(parsePsIdentity(validPs, 123)), [
        "pid",
        "pgid",
        "executable",
        "startTime",
      ]),
  ],
];

for (const [name, action] of verifierCases) test(`process verifier: ${name}`, action);

const supervisorCases = [
  ["single foreground run mode is wired", () => assert.match(controllerSource, /mode === "run"/u)],
  [
    "workflow has no separate cleanup mode",
    () => assert.doesNotMatch(workflowSource, /ios-runtime-bootstrap\.mjs cleanup/u),
  ],
  [
    "workflow always verifies receipt",
    () => assert.match(workflowSource, /if: always\(\)[\s\S]*verify-receipt/u),
  ],
  [
    "workflow always uploads receipt",
    () =>
      assert.match(
        workflowSource,
        /Upload sanitized runtime-bootstrap receipt[\s\S]*if: always\(\)/u,
      ),
  ],
  [
    "workflow errors on missing receipt",
    () =>
      assert.match(
        workflowSource,
        /ios-runtime-bootstrap\/receipt\.json[\s\S]*if-no-files-found: error/u,
      ),
  ],
  [
    "minimum artifact uploads only on success",
    () =>
      assert.match(
        workflowSource,
        /Upload sanitized minimum-runtime evidence[\s\S]*if: success\(\)/u,
      ),
  ],
  [
    "bash child is exact",
    () => assert.match(controllerSource, /\[command, args\] = \["\/bin\/bash"/u),
  ],
  [
    "bash argv is canonical script only",
    () => assert.match(controllerSource, /join\(root, "scripts", "ios-ci\.sh"\)/u),
  ],
  [
    "bash cwd is canonical repository",
    () => assert.match(controllerSource, /cwd: role === "MINIMUM" \? root : "\/"/u),
  ],
  [
    "child environment is closed literal",
    () => assert.match(controllerSource, /const minimumEnv = Object\.freeze\(\{/u),
  ],
  [
    "child PATH includes validated Node directory",
    () => assert.match(controllerSource, /\/usr\/bin:\/bin:\/usr\/sbin:\/sbin:\$\{nodeDir\}/u),
  ],
  [
    "minimum requires exact Node host",
    () => assert.match(iosCiSource, /FLUYO_NODE_EXECUTABLE:\?Set FLUYO_NODE_EXECUTABLE/u),
  ],
  [
    "script hash is pinned",
    () => {
      assert.equal(Buffer.byteLength(iosCiSource), IOS_CI_SOURCE_BYTES);
      assert.equal(createHash("sha256").update(iosCiSource).digest("hex"), IOS_CI_SOURCE_SHA256);
    },
  ],
  [
    "source is checked before acquisition",
    () =>
      assert.ok(
        controllerSource.indexOf("validateScriptIdentity(repositoryRoot)") <
          controllerSource.indexOf('role: "ACQUIRE"'),
      ),
  ],
  [
    "source is checked before minimum spawn",
    () => assert.match(controllerSource, /const scriptIdentity = validateScriptIdentity/u),
  ],
  [
    "source is checked after minimum close",
    () =>
      assert.ok(
        controllerSource.lastIndexOf("validateFinalScriptIdentity(paths.repositoryRoot)") >
          controllerSource.indexOf('role: "MINIMUM"'),
      ),
  ],
  [
    "acquisition failure leaves minimum NOT_RUN",
    () =>
      assert.match(
        controllerSource,
        /downloadResult = "FAILED";\s+minimumEvidenceResult = "NOT_RUN"/u,
      ),
  ],
  [
    "test starts only after post inventory",
    () =>
      assert.ok(
        controllerSource.indexOf("validatePostInventory") <
          controllerSource.indexOf('role: "MINIMUM"'),
      ),
  ],
  ["test verifier is generalized", () => assert.match(controllerSource, /expectedCommandTokens/u)],
  ["test timeout is 720000ms", () => assert.equal(MINIMUM_EVIDENCE_TIMEOUT_MS, 720000)],
  [
    "combined output cap is transaction-wide",
    () => assert.match(controllerSource, /const capture = \{ bytes: 0 \}/u),
  ],
  [
    "dual result receipt is emitted",
    () => assert.match(controllerSource, /minimumEvidenceResult/u),
  ],
];

for (const [name, action] of supervisorCases) test(`supervisor: ${name}`, action);

const v116Cases = [
  ["bootstrap root cap is exact", () => assert.equal(MAX_ATTEMPT_ROOT_BYTES, 268435456)],
  ["minimum root cap is exact", () => assert.equal(MAX_MINIMUM_WORK_ROOT_BYTES, 4294967296)],
  ["combined root cap is exact", () => assert.equal(MAX_COMBINED_OWNED_ROOT_BYTES, 4563402752)],
  ["scanner rejects symlinks", () => assert.match(scanOwnedRoot.toString(), /isSymbolicLink/u)],
  [
    "scanner rejects special entries",
    () => assert.match(scanOwnedRoot.toString(), /!info\.isDirectory\(\) && !info\.isFile\(\)/u),
  ],
  [
    "scanner uses BigInt sizes",
    () => assert.match(scanOwnedRoot.toString(), /BigInt\(maximumBytes\)/u),
  ],
  ["scanner entry cap is exact", () => assert.equal(MAX_SCAN_ENTRIES, 100000)],
  ["scanner duration cap is exact", () => assert.equal(MAX_SCAN_DURATION_MS, 1000)],
  ["preflight timeout is exact", () => assert.equal(PREFLIGHT_TIMEOUT_MS, 120000)],
  ["acquisition timeout is exact", () => assert.equal(ACQUIRE_TIMEOUT_MS, 1200000)],
  ["test timeout is exact", () => assert.equal(MINIMUM_EVIDENCE_TIMEOUT_MS, 720000)],
  ["cleanup timeout is exact", () => assert.equal(CLEANUP_TIMEOUT_MS, 300000)],
  ["final timeout is exact", () => assert.equal(FINALIZATION_TIMEOUT_MS, 30000)],
  ["total timeout is exact", () => assert.equal(TOTAL_TRANSACTION_TIMEOUT_MS, 2370000)],
  ["workflow step timeout is exact", () => assert.equal(WORKFLOW_STEP_TIMEOUT_MS, 2520000)],
  ["workflow margin is exact", () => assert.equal(WORKFLOW_MARGIN_MS, 150000)],
  [
    "receipt splits primary and cleanup failures",
    () =>
      assert.deepEqual(
        ["primaryFailureCode" in testingReceipt(), "cleanupFailureCode" in testingReceipt()],
        [true, true],
      ),
  ],
  [
    "minimum interruption code is frozen",
    () => assert.equal(testing.PRIMARY_FAILURE_CODES.has("MINIMUM_EVIDENCE_INTERRUPTED"), true),
  ],
];

for (const [name, action] of v116Cases) test(`v1.1.6: ${name}`, action);

const validInternal = Object.freeze({
  FLUYO_INTERNAL_CHECKOUT_ROOT: "/Users/runner/work/Fluyo/Fluyo",
  FLUYO_INTERNAL_IMAGE_OS: "macos15",
  FLUYO_INTERNAL_PARENT_IDENTITY_SHA256: "b".repeat(64),
  FLUYO_INTERNAL_PARENT_PID: "123",
  FLUYO_INTERNAL_RUN_ATTEMPT: "1",
  FLUYO_INTERNAL_RUN_ID: "456",
  FLUYO_INTERNAL_RUNNER_ARCH: "ARM64",
  FLUYO_INTERNAL_RUNNER_OS: "macOS",
  FLUYO_INTERNAL_RELEASE_SHA256: "d".repeat(64),
  FLUYO_INTERNAL_SOURCE_COMMIT: "a".repeat(40),
  FLUYO_INTERNAL_SOURCE_SHA256: "c".repeat(64),
  LANG: "C",
  LC_ALL: "C",
});
const validAcquireTarget = Object.freeze({
  DEVELOPER_DIR: XCODE_DEVELOPER_DIR,
  HOME: "/Users/runner",
  PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
  TMPDIR: "/Users/runner/work/_temp/owned",
});

const v1110Cases = [
  ["release is exactly 32 bytes", () => assert.equal(CHILD_GATE_RELEASE_BYTES, 32)],
  ["ready token is exact", () => assert.equal(CHILD_GATE_READY, "READY_V1\n")],
  ["wrapper self timeout is exact", () => assert.equal(CHILD_GATE_TIMEOUT_MS, 5000)],
  ["controller source cap is exact", () => assert.equal(MAX_CONTROLLER_SOURCE_BYTES, 262144)],
  ["receipt cap is exact", () => assert.equal(MAX_RECEIPT_BYTES, 8192)],
  ["parent spawns detached wrapper", () => assert.match(controllerSource, /detached: true/u)],
  [
    "wrapper target stays in wrapper group",
    () => assert.match(controllerSource, /detached: false/u),
  ],
  [
    "wrapper stdio has six exact slots",
    () =>
      assert.match(
        controllerSource,
        /stdio: \["ignore", "pipe", "pipe", "pipe", controllerSource\.fd, "pipe"\]/u,
      ),
  ],
  [
    "settlement attaches before ready",
    () =>
      assert.ok(
        controllerSource.indexOf("const lifecycle = childLifecycle(child)") <
          controllerSource.indexOf("await waitForReady"),
      ),
  ],
  [
    "ready precedes release",
    () =>
      assert.ok(
        controllerSource.indexOf("await waitForReady") < controllerSource.indexOf("gate.end"),
      ),
  ],
  [
    "release follows identity probe",
    () =>
      assert.ok(controllerSource.indexOf("probeIdentity") < controllerSource.indexOf("gate.end")),
  ],
  [
    "unverified child receives no signal",
    () =>
      assert.match(
        controllerSource,
        /gate\?\.destroy\(\);[\s\S]*awaitActualClose\(lifecycle\.close, CHILD_CLOSE_WAIT_MS/u,
      ),
  ],
  [
    "unverified residue enters hold",
    () => assert.match(controllerSource, /PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD/u),
  ],
  [
    "verified TERM and KILL are retained",
    () => assert.match(controllerSource, /terminateVerifiedProcessGroup/u),
  ],
  [
    "group absence is checked after close",
    () => assert.match(controllerSource, /assertProcessGroupAbsent\(captured\.pgid/u),
  ],
  ["cleanup uses the same gate", () => assert.match(controllerSource, /role: "CLEANUP"/u)],
  [
    "signal latch is installed before first preflight",
    () => {
      const transaction = controllerSource.slice(
        controllerSource.indexOf("export async function runTransaction"),
      );
      assert.ok(
        transaction.indexOf('signalTarget.once("SIGINT"') <
          transaction.indexOf("assertCatalogTuple()"),
      );
    },
  ],
  [
    "signal callback performs no I O",
    () =>
      assert.match(
        controllerSource,
        /const onTransactionSignal = \(\) => \{\s*cancellation\.requested = true;\s*cancellation\.phase = transactionPhase;\s*\}/u,
      ),
  ],
  [
    "precondition interruption is closed",
    () => assert.equal(testing.PRIMARY_FAILURE_CODES.has("PRECONDITION_INTERRUPTED"), true),
  ],
  [
    "acquire interruption remains closed",
    () => assert.equal(testing.PRIMARY_FAILURE_CODES.has("ACQUIRE_INTERRUPTED"), true),
  ],
  [
    "minimum interruption remains closed",
    () => assert.equal(testing.PRIMARY_FAILURE_CODES.has("MINIMUM_EVIDENCE_INTERRUPTED"), true),
  ],
  [
    "cleanup interruption is closed",
    () => assert.equal(testing.CLEANUP_FAILURE_CODES.has("CLEANUP_INTERRUPTED"), true),
  ],
  [
    "receipt rejects overlong run id",
    () =>
      throwsCode(
        () => validateReceipt(testingReceipt({ runId: "1".repeat(21) })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "receipt rejects wrong runner image",
    () =>
      throwsCode(
        () => validateReceipt(testingReceipt({ runnerImageOs: "macos14" })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "receipt rejects wrong runner arch",
    () =>
      throwsCode(() => validateReceipt(testingReceipt({ runnerArch: "X64" })), "RECEIPT_INVALID"),
  ],
  [
    "receipt rejects wrong host arch",
    () => throwsCode(() => validateReceipt(testingReceipt({ hostArch: "x64" })), "RECEIPT_INVALID"),
  ],
  [
    "receipt rejects wrong Xcode version",
    () =>
      throwsCode(
        () => validateReceipt(testingReceipt({ expectedVersion: "16.3" })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "receipt rejects wrong Xcode build",
    () =>
      throwsCode(
        () => validateReceipt(testingReceipt({ expectedBuild: "other" })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "finalization interrupted row validates",
    () =>
      assert.equal(
        validateReceipt(
          testingReceipt({
            state: "FINALIZATION_FAILED_CLEAN",
            primaryFailureCode: "FINALIZATION_INTERRUPTED",
          }),
        ).state,
        "FINALIZATION_FAILED_CLEAN",
      ),
  ],
  [
    "cleanup failure terminal code is independent",
    () => assert.equal(testing.CLEANUP_FAILURE_CODES.has("CLEANUP_RECEIPT_INVALID"), true),
  ],
  [
    "generalized parser reports expected executable",
    () =>
      assert.equal(
        parsePsIdentity("12 12 Fri Nov 14 12:34:56 2026 /bin/node gate\n", 12, [
          "/bin/node",
          "gate",
        ]).executable,
        "/bin/node",
      ),
  ],
  [
    "minimum target executable remains bash",
    () => assert.match(controllerSource, /\[command, args\] = \["\/bin\/bash"/u),
  ],
];
for (const [name, action] of v1110Cases) test(`v1.1.10: ${name}`, action);

const v11101Cases = [
  [
    "invocation count changes only before release",
    () => assert.match(controllerSource, /beforeRelease: \(\) => \{\s*invocationCount = 1/u),
  ],
  [
    "unverified hold emits fixed stderr",
    () => assert.match(controllerSource, /IOS_RUNTIME_BOOTSTRAP_UNVERIFIED_CHILD_HOLD/u),
  ],
  [
    "controller source uses O NOFOLLOW",
    () => assert.match(controllerSource, /O_RDONLY \| fsConstants\.O_NOFOLLOW/u),
  ],
  [
    "source reads are positional",
    () => assert.match(controllerSource, /readSync\(fd, value, offset, size - offset, offset\)/u),
  ],
  [
    "source rejects an extra byte",
    () => assert.match(controllerSource, /readSync\(fd, extra, 0, 1, size\) !== 0/u),
  ],
  [
    "source binding checks dev ino and size",
    () =>
      assert.match(
        controllerSource,
        /pathInfo\.dev !== binding\.dev[\s\S]*pathInfo\.ino !== binding\.ino[\s\S]*pathInfo\.size !== binding\.size/u,
      ),
  ],
  [
    "parent identity has exact title",
    () => assert.equal(PARENT_TITLE, "fluyo-ios17-bootstrap-parent-v1"),
  ],
  [
    "parent identity record has three NULs and LF",
    () => {
      const value = parentIdentityRecord({
        pid: 1,
        pgid: 2,
        startTime: "Fri Nov 14 12:34:56 2026",
      });
      assert.equal(value.split("\0").length - 1, 3);
      assert.equal(value.endsWith("\n"), true);
    },
  ],
  [
    "nonleader parent pgid is accepted",
    () =>
      assert.equal(
        parseParentPsIdentity(`5 1 9 Fri Nov 14 12:34:56 2026 ${PARENT_TITLE}\n`, 5, 1).pgid,
        9,
      ),
  ],
  [
    "parent title collision rejects",
    () =>
      throwsCode(
        () => parseParentPsIdentity("5 1 9 Fri Nov 14 12:34:56 2026 other\n", 5, 1),
        "PRECONDITION_ENV",
      ),
  ],
  [
    "wrapper title is role bound",
    () => assert.match(controllerSource, /CHILD_TITLE_PREFIX.*role\.toLowerCase/u),
  ],
  ["child gate mode is explicit", () => assert.match(controllerSource, /mode === "child-gate"/u)],
];
for (const [name, action] of v11101Cases) test(`v1.1.10.1: ${name}`, action);

const v11102Cases = [
  [
    "acquire environment is closed",
    () =>
      assert.deepEqual(
        Object.keys(buildWrapperEnvironment("ACQUIRE", validInternal, validAcquireTarget)).sort(),
        [...new Set([...testing.INTERNAL_ENV_KEYS, ...testing.ACQUIRE_TARGET_KEYS])].sort(),
      ),
  ],
  [
    "missing environment key rejects",
    () => {
      const value = { ...buildWrapperEnvironment("ACQUIRE", validInternal, validAcquireTarget) };
      delete value.HOME;
      throwsCode(() => validateChildGateEnvironment("ACQUIRE", value), "PRECONDITION_ENV");
    },
  ],
  [
    "extra environment key rejects",
    () =>
      throwsCode(
        () =>
          validateChildGateEnvironment("ACQUIRE", {
            ...buildWrapperEnvironment("ACQUIRE", validInternal, validAcquireTarget),
            EXTRA: "x",
          }),
        "PRECONDITION_ENV",
      ),
  ],
  [
    "forbidden environment key rejects",
    () =>
      throwsCode(
        () =>
          validateChildGateEnvironment("ACQUIRE", {
            ...buildWrapperEnvironment("ACQUIRE", validInternal, validAcquireTarget),
            TOKEN: "x",
          }),
        "PRECONDITION_ENV",
      ),
  ],
  [
    "controller source fd remains inherited",
    () => assert.match(controllerSource, /controllerSource\.fd/u),
  ],
  [
    "wrapper validates detached checkout",
    () => assert.match(controllerSource, /parseHead \?\? parseDetachedHead/u),
  ],
  [
    "wrapper validates Darwin arm64",
    () => assert.match(controllerSource, /!== "darwin"[\s\S]*!== "arm64"/u),
  ],
  [
    "wrapper validates parent identity hash",
    () => assert.match(controllerSource, /sha256\(parentIdentityRecord\(parent\)\)/u),
  ],
  [
    "security claim avoids OS authorization",
    () => assert.doesNotMatch(controllerSource, /OS authorization against malicious same-user/u),
  ],
  [
    "all three roles are closed",
    () => {
      for (const role of ["ACQUIRE", "MINIMUM", "CLEANUP"])
        assert.match(controllerSource, new RegExp(`role === "${role}"`, "u"));
    },
  ],
];
for (const [name, action] of v11102Cases) test(`v1.1.10.2: ${name}`, action);

function descriptorFixture(overrides = {}) {
  const bytes = Buffer.from("controller-source", "utf8");
  const fifo = { isFIFO: () => true };
  const regular = {
    dev: 11,
    ino: 22,
    size: bytes.length,
    isFIFO: () => false,
    isFile: () => true,
    isSymbolicLink: () => false,
  };
  const values = new Map([
    [3, fifo],
    [4, regular],
    [5, fifo],
  ]);
  let sourceReads = 0;
  return {
    bytes,
    dependencies: {
      sourcePath: "/repo/scripts/ios-runtime-bootstrap.mjs",
      realpath: (value) => value,
      lstat: () => ({ ...regular, ...(overrides.pathInfo ?? {}) }),
      fstat: (fd) => {
        if (fd === 4) sourceReads += 1;
        const base = values.get(fd);
        const sequence = overrides.sourceSequence;
        if (fd === 4 && sequence) return sequence[Math.min(sourceReads - 1, sequence.length - 1)];
        return fd === 3 && overrides.releaseInfo
          ? overrides.releaseInfo
          : fd === 5 && overrides.readyInfo
            ? overrides.readyInfo
            : base;
      },
      readSource: () => bytes,
    },
  };
}

const v11103Cases = [
  [
    "release nonce uses production randomBytes without deterministic fallback",
    () => {
      assert.match(controllerSource, /import \{ createHash, randomBytes \} from "node:crypto"/u);
      assert.doesNotMatch(controllerSource, /Buffer\.alloc\(size, 0xa5\)/u);
    },
  ],
  [
    "release hash is the only nonce-derived environment value",
    () => {
      assert.match(controllerSource, /FLUYO_INTERNAL_RELEASE_SHA256: sha256\(releaseToken\)/u);
      assert.doesNotMatch(controllerSource, /FLUYO_INTERNAL_RELEASE_TOKEN/u);
    },
  ],
  [
    "parent and child zeroize release bytes",
    () => assert.equal((controllerSource.match(/\.fill\(0\)/gu) ?? []).length >= 4, true),
  ],
  [
    "valid FIFO and held source descriptors pass",
    () => {
      const fixture = descriptorFixture();
      assert.equal(
        validateChildGateDescriptors(
          {
            releaseFd: 3,
            sourceFd: 4,
            readyFd: 5,
            expectedSourceSha256: createHash("sha256").update(fixture.bytes).digest("hex"),
          },
          fixture.dependencies,
        ).equals(fixture.bytes),
        true,
      );
    },
  ],
  [
    "non FIFO release descriptor rejects",
    () => {
      const fixture = descriptorFixture({ releaseInfo: { isFIFO: () => false } });
      throwsCode(
        () =>
          validateChildGateDescriptors(
            {
              releaseFd: 3,
              sourceFd: 4,
              readyFd: 5,
              expectedSourceSha256: createHash("sha256").update(fixture.bytes).digest("hex"),
            },
            fixture.dependencies,
          ),
        "PRECONDITION_SOURCE",
      );
    },
  ],
  [
    "non FIFO ready descriptor rejects",
    () => {
      const fixture = descriptorFixture({ readyInfo: { isFIFO: () => false } });
      throwsCode(
        () =>
          validateChildGateDescriptors(
            {
              releaseFd: 3,
              sourceFd: 4,
              readyFd: 5,
              expectedSourceSha256: createHash("sha256").update(fixture.bytes).digest("hex"),
            },
            fixture.dependencies,
          ),
        "PRECONDITION_SOURCE",
      );
    },
  ],
  [
    "nonregular inherited source descriptor rejects",
    () => {
      const fixture = descriptorFixture({
        sourceSequence: [{ dev: 11, ino: 22, size: 17, isFile: () => false }],
      });
      throwsCode(
        () =>
          validateChildGateDescriptors(
            { releaseFd: 3, sourceFd: 4, readyFd: 5, expectedSourceSha256: "0".repeat(64) },
            fixture.dependencies,
          ),
        "PRECONDITION_SOURCE",
      );
    },
  ],
  [
    "same-content wrong source inode rejects",
    () => {
      const fixture = descriptorFixture({ pathInfo: { ino: 23 } });
      throwsCode(
        () =>
          validateChildGateDescriptors(
            {
              releaseFd: 3,
              sourceFd: 4,
              readyFd: 5,
              expectedSourceSha256: createHash("sha256").update(fixture.bytes).digest("hex"),
            },
            fixture.dependencies,
          ),
        "PRECONDITION_SOURCE",
      );
    },
  ],
  [
    "source identity swap between positional read bounds rejects",
    () => {
      const fixture = descriptorFixture({
        sourceSequence: [
          { dev: 11, ino: 22, size: 17, isFile: () => true },
          { dev: 11, ino: 24, size: 17, isFile: () => true },
        ],
      });
      throwsCode(
        () =>
          validateChildGateDescriptors(
            {
              releaseFd: 3,
              sourceFd: 4,
              readyFd: 5,
              expectedSourceSha256: createHash("sha256").update(fixture.bytes).digest("hex"),
            },
            fixture.dependencies,
          ),
        "PRECONDITION_SOURCE",
      );
    },
  ],
  [
    "ownership release removes both handlers even when close throws",
    () => {
      const removed = [];
      assert.throws(() =>
        releaseTransactionOwnership(
          {
            unverifiedChildHold: false,
            controllerSource: { fd: 9 },
            signalTarget: { off: (name) => removed.push(name) },
            onTransactionSignal: () => {},
          },
          {
            closeControllerSource: () => {
              throw new Error("close");
            },
          },
        ),
      );
      assert.deepEqual(removed, ["SIGINT", "SIGTERM"]);
    },
  ],
  [
    "unverified hold alone retains source and handlers",
    () => {
      let closeCount = 0;
      let offCount = 0;
      assert.equal(
        releaseTransactionOwnership(
          {
            unverifiedChildHold: true,
            controllerSource: { fd: 9 },
            signalTarget: {
              off: () => {
                offCount += 1;
              },
            },
            onTransactionSignal: () => {},
          },
          {
            closeControllerSource: () => {
              closeCount += 1;
            },
          },
        ),
        false,
      );
      assert.deepEqual([closeCount, offCount], [0, 0]);
    },
  ],
];
for (const [name, action] of v11103Cases) test(`v1.1.10.3: ${name}`, action);

const v11113LifecycleCases = [
  ["release latch starts false", () => assert.match(controllerSource, /let released = false/u)],
  [
    "release latch flips only after synchronous callback",
    () =>
      assert.match(controllerSource, /beforeRelease\(\);[\s\S]*released = true;[\s\S]*gate\.end/u),
  ],
  [
    "acquire prerelease maps to precondition",
    () => assert.match(controllerSource, /role === "ACQUIRE"[\s\S]*"PRECONDITION_INTERRUPTED"/u),
  ],
  [
    "minimum prerelease maps to process identity",
    () => assert.match(controllerSource, /"MINIMUM_EVIDENCE_PROCESS_IDENTITY"/u),
  ],
  [
    "cleanup prerelease maps to process identity",
    () => assert.match(controllerSource, /"CLEANUP_PROCESS_IDENTITY"/u),
  ],
  [
    "release write is bounded",
    () => assert.match(controllerSource, /CHILD_GATE_TIMEOUT_MS[\s\S]*gate\.end/u),
  ],
  [
    "prerelease failure closes gate and waits",
    () =>
      assert.match(
        controllerSource,
        /if \(!released\)[\s\S]*gate\?\.destroy\(\)[\s\S]*awaitActualClose\(lifecycle\.close/u,
      ),
  ],
  [
    "unverified residue is internal HOLD",
    () => assert.match(controllerSource, /PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD/u),
  ],
  [
    "operational failure is independent",
    () => assert.match(controllerSource, /let operationalFailure = null/u),
  ],
  [
    "termination failure is independent",
    () => assert.match(controllerSource, /let terminationFailure = null/u),
  ],
  [
    "verified residue is internal HOLD",
    () => assert.match(controllerSource, /PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD/u),
  ],
  [
    "verified HOLD has fixed stderr",
    () => assert.match(controllerSource, /IOS_RUNTIME_BOOTSTRAP_VERIFIED_CHILD_HOLD/u),
  ],
  [
    "cleanup has a dedicated sanitizer",
    () => assert.match(controllerSource, /function sanitizeCleanupFailure/u),
  ],
  ["legacy owned phase is removed", () => assert.doesNotMatch(controllerSource, /runOwnedPhase/u)],
  [
    "legacy cleanup child is removed",
    () => assert.doesNotMatch(controllerSource, /runCleanupChild/u),
  ],
  [
    "minimum phase precedes post inventory",
    () =>
      assert.ok(
        controllerSource.indexOf('transactionPhase = "MINIMUM"') <
          controllerSource.indexOf("const afterResult"),
      ),
  ],
  [
    "minimum defaults failed after acquire",
    () =>
      assert.ok(
        controllerSource.indexOf('minimumEvidenceResult = "FAILED"') <
          controllerSource.indexOf("const afterResult"),
      ),
  ],
  [
    "post failure resets minimum not run",
    () =>
      assert.match(
        controllerSource,
        /primaryFailureCode\.startsWith\("POST_RUNTIME_"\)[\s\S]*minimumEvidenceResult = "NOT_RUN"/u,
      ),
  ],
  [
    "acquire cancellation checked after gate",
    () =>
      assert.match(
        controllerSource,
        /await runGatedPhase\([\s\S]*checkCancellation\(\);[\s\S]*downloadResult = "SUCCEEDED"/u,
      ),
  ],
  [
    "post inventory cancellation is checked",
    () =>
      assert.match(
        controllerSource,
        /const afterResult = await runTool[\s\S]*checkCancellation\(\);[\s\S]*const afterInventory/u,
      ),
  ],
  [
    "minimum cancellation checked after gate",
    () => {
      const role = controllerSource.indexOf('role: "MINIMUM"');
      const start = controllerSource.lastIndexOf("await runGatedPhase(", role);
      const checked = controllerSource.indexOf("checkCancellation();", start);
      const validated = controllerSource.indexOf("validateFinalScriptIdentity", start);
      assert.ok(start >= 0 && checked > start && validated > checked);
    },
  ],
  [
    "cleanup cancellation checked after gate",
    () => {
      const role = controllerSource.indexOf('role: "CLEANUP"');
      const start = controllerSource.lastIndexOf("await runGatedPhase(", role);
      const checked = controllerSource.indexOf("checkCancellation();", start);
      const sampled = controllerSource.indexOf("sampleCleanupFilesystem", start);
      assert.ok(start >= 0 && checked > start && sampled > checked);
    },
  ],
  [
    "termination failure has precedence",
    () =>
      assert.ok(
        controllerSource.indexOf("if (terminationFailure) fail") <
          controllerSource.indexOf("if (operationalFailure) fail"),
      ),
  ],
  [
    "group absence runs after termination await",
    () => {
      const phase = controllerSource.slice(
        controllerSource.indexOf("export async function runGatedPhase"),
      );
      assert.ok(
        phase.indexOf("if (terminating) await terminating") <
          phase.indexOf("assertProcessGroupAbsent(captured.pgid"),
      );
    },
  ],
  [
    "receipt adds minimum evidence free slot",
    () => assert.match(controllerSource, /"freeBytesAfterMinimumEvidence"/u),
  ],
];
for (const [name, action] of v11113LifecycleCases) test(`v1.1.11.3 lifecycle: ${name}`, action);

const preconditionReceipt = (overrides = {}) =>
  testingReceipt({
    state: "PRECONDITION_REJECTED",
    primaryFailureCode: "PRECONDITION_ENV",
    cleanupFailureCode: "NONE",
    downloadInvocationCount: 0,
    downloadResult: "NOT_ATTEMPTED",
    minimumEvidenceResult: "NOT_RUN",
    cleanupResult: "NOT_REQUIRED",
    observedVersion: null,
    observedBuild: null,
    runtimeIdentifier: null,
    runtimeVersion: null,
    runtimeBuild: null,
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
    rawLogRetained: false,
    runtimeRetained: false,
    ...overrides,
  });

const v11113ReceiptCases = [
  [
    "preexisting runtime records actual count",
    () =>
      assert.equal(
        validateReceipt(
          preconditionReceipt({
            primaryFailureCode: "PRECONDITION_RUNTIME_ALREADY_PRESENT",
            preExactRuntimeCount: 2,
          }),
        ).preExactRuntimeCount,
        2,
      ),
  ],
  [
    "runtime count cap rejects",
    () =>
      throwsCode(
        () => validateReceipt(preconditionReceipt({ preExactRuntimeCount: 4097 })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "partial runtime triple rejects",
    () =>
      throwsCode(() => validateReceipt(testingReceipt({ runtimeBuild: null })), "RECEIPT_INVALID"),
  ],
  [
    "zero samples require all nullable slots",
    () =>
      throwsCode(
        () => validateReceipt(preconditionReceipt({ freeBytesBefore: 0 })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "positive samples require initial and minimum",
    () =>
      throwsCode(
        () => validateReceipt(preconditionReceipt({ diskMonitorSampleCount: 1 })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "unknown postcleanup count reports retention",
    () =>
      assert.equal(
        validateReceipt(
          testingReceipt({
            state: "CLEANUP_FAILED",
            primaryFailureCode: "ACQUIRE_EXIT",
            cleanupFailureCode: "CLEANUP_RESIDUE",
            downloadResult: "FAILED",
            minimumEvidenceResult: "NOT_RUN",
            cleanupResult: "FAILED",
            runtimeIdentifier: null,
            runtimeVersion: null,
            runtimeBuild: null,
            preExactRuntimeCount: 0,
            postAcquireExactRuntimeCount: 0,
            postCleanupExactRuntimeCount: null,
            freeBytesAfterMinimumEvidence: null,
            runtimeRetained: true,
          }),
        ).runtimeRetained,
        true,
      ),
  ],
  [
    "unknown postcleanup count cannot claim no retention",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            testingReceipt({
              state: "CLEANUP_FAILED",
              primaryFailureCode: "ACQUIRE_EXIT",
              cleanupFailureCode: "CLEANUP_RESIDUE",
              downloadResult: "FAILED",
              minimumEvidenceResult: "NOT_RUN",
              cleanupResult: "FAILED",
              runtimeIdentifier: null,
              runtimeVersion: null,
              runtimeBuild: null,
              preExactRuntimeCount: 0,
              postAcquireExactRuntimeCount: 0,
              postCleanupExactRuntimeCount: null,
              runtimeRetained: false,
            }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "runtime inventory cap rejects 4097 rows",
    () =>
      throwsCode(
        () =>
          parseRuntimeInventory(
            JSON.stringify({ runtimes: Array.from({ length: 4097 }, () => ({})) }),
          ),
        "PRECONDITION_RUNTIME_INVENTORY",
      ),
  ],
];
for (const [name, action] of v11113ReceiptCases) test(`v1.1.11.3 receipt: ${name}`, action);

const acquireDiskReceipt = (primaryFailureCode, overrides = {}) =>
  testingReceipt({
    state: "ACQUIRE_FAILED_CLEAN",
    primaryFailureCode,
    cleanupFailureCode: "NONE",
    downloadInvocationCount: 1,
    downloadResult: "FAILED",
    minimumEvidenceResult: "NOT_RUN",
    cleanupResult: "SUCCEEDED",
    runtimeIdentifier: null,
    runtimeVersion: null,
    runtimeBuild: null,
    freeBytesBefore: Number(MIN_FREE_BEFORE_BYTES),
    freeBytesAfterAcquire: Number(MIN_FREE_AFTER_ACQUIRE_BYTES),
    freeBytesAfterMinimumEvidence: null,
    freeBytesAfterCleanup: Number(MIN_FREE_AFTER_CLEANUP_BYTES),
    minimumFreeBytesObserved: Number(MIN_FREE_AFTER_ACQUIRE_BYTES),
    acquireDiskDeltaBytes: 0,
    diskMonitorSampleCount: 2,
    preExactRuntimeCount: 0,
    postAcquireExactRuntimeCount: 0,
    postCleanupExactRuntimeCount: 0,
    rawLogRetained: false,
    runtimeRetained: false,
    ...overrides,
  });

const v11113ThresholdCases = [
  [
    "precondition disk accepts observed zero",
    () =>
      assert.equal(
        validateReceipt(
          preconditionReceipt({
            primaryFailureCode: "PRECONDITION_DISK",
            preExactRuntimeCount: 0,
            freeBytesBefore: 0,
            minimumFreeBytesObserved: 0,
            diskMonitorSampleCount: 1,
          }),
        ).freeBytesBefore,
        0,
      ),
  ],
  [
    "precondition disk accepts floor minus one",
    () =>
      assert.equal(
        validateReceipt(
          preconditionReceipt({
            primaryFailureCode: "PRECONDITION_DISK",
            preExactRuntimeCount: 0,
            freeBytesBefore: Number(MIN_FREE_BEFORE_BYTES) - 1,
            minimumFreeBytesObserved: Number(MIN_FREE_BEFORE_BYTES) - 1,
            diskMonitorSampleCount: 1,
          }),
        ).state,
        "PRECONDITION_REJECTED",
      ),
  ],
  [
    "precondition disk rejects exact floor",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            preconditionReceipt({
              primaryFailureCode: "PRECONDITION_DISK",
              preExactRuntimeCount: 0,
              freeBytesBefore: Number(MIN_FREE_BEFORE_BYTES),
              minimumFreeBytesObserved: Number(MIN_FREE_BEFORE_BYTES),
              diskMonitorSampleCount: 1,
            }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "acquire floor accepts floor minus one",
    () =>
      assert.equal(
        validateReceipt(
          acquireDiskReceipt("ACQUIRE_DISK_FLOOR", {
            freeBytesAfterAcquire: Number(MIN_FREE_AFTER_ACQUIRE_BYTES) - 1,
            minimumFreeBytesObserved: Number(MIN_FREE_AFTER_ACQUIRE_BYTES) - 1,
          }),
        ).primaryFailureCode,
        "ACQUIRE_DISK_FLOOR",
      ),
  ],
  [
    "acquire floor rejects exact floor",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            acquireDiskReceipt("ACQUIRE_DISK_FLOOR", {
              freeBytesAfterAcquire: Number(MIN_FREE_AFTER_ACQUIRE_BYTES),
            }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "acquire delta accepts cap plus one and rejects cap",
    () => {
      assert.equal(
        validateReceipt(
          acquireDiskReceipt("ACQUIRE_DISK_LIMIT", {
            acquireDiskDeltaBytes: Number(MAX_ACQUIRE_DISK_DELTA_BYTES) + 1,
          }),
        ).primaryFailureCode,
        "ACQUIRE_DISK_LIMIT",
      );
      throwsCode(
        () =>
          validateReceipt(
            acquireDiskReceipt("ACQUIRE_DISK_LIMIT", {
              acquireDiskDeltaBytes: Number(MAX_ACQUIRE_DISK_DELTA_BYTES),
            }),
          ),
        "RECEIPT_INVALID",
      );
    },
  ],
];
for (const [name, action] of v11113ThresholdCases) test(`v1.1.11.3 threshold: ${name}`, action);

const v11121CancellationCases = [
  [
    "finalization interruption preserves an existing primary failure",
    () =>
      assert.match(
        controllerSource,
        /cancellation\.requested[\s\S]*cleanupResult !== "FAILED"[\s\S]*primaryFailureCode === "NONE"/u,
      ),
  ],
  [
    "precondition interruption remains invocation zero",
    () =>
      assert.match(
        controllerSource,
        /"PRECONDITION_INTERRUPTED"[\s\S]*downloadInvocationCount === 0/u,
      ),
  ],
  [
    "acquire interruption remains closed",
    () => assert.match(controllerSource, /"ACQUIRE_INTERRUPTED"/u),
  ],
  [
    "minimum interruption remains closed",
    () => assert.match(controllerSource, /"MINIMUM_EVIDENCE_INTERRUPTED"/u),
  ],
  [
    "cleanup interruption remains a cleanup failure",
    () => assert.match(controllerSource, /"CLEANUP_INTERRUPTED"[\s\S]*sanitizeCleanupFailure/u),
  ],
];
for (const [name, action] of v11121CancellationCases)
  test(`v1.1.12.1 cancellation: ${name}`, action);

const v11121SubprocessCases = [
  [
    "uses a dedicated ps verifier",
    () => assert.match(controllerSource, /async function runPsVerifier/u),
  ],
  [
    "ps verifier is direct and detached",
    async () => {
      const child = fakeChild(401);
      let invocation;
      const promise = testing.runPsVerifier(
        ["-ww", "-p", "9"],
        {
          timeout: 2_000,
          stdout: 64,
          stderr: 64,
          timeoutCode: "PRECONDITION_ENV",
          outputCode: "PRECONDITION_ENV",
          exitCode: "PRECONDITION_ENV",
        },
        {
          spawnPs: (command, args, options) => {
            invocation = { command, args, options };
            return child;
          },
          kill: () => {
            throw esrch();
          },
        },
      );
      queueMicrotask(() => {
        child.stdout.end("ok");
        child.stderr.end();
        child.exitCode = 0;
        child.emit("close", 0, null);
      });
      assert.equal((await promise).stdout, "ok");
      assert.deepEqual(invocation, {
        command: PS,
        args: ["-ww", "-p", "9"],
        options: {
          cwd: "/",
          env: { LANG: "C", LC_ALL: "C" },
          shell: false,
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      });
    },
  ],
  [
    "ps verifier has the exact C locale",
    () => assert.match(controllerSource, /env: \{ LANG: "C", LC_ALL: "C" \}/u),
  ],
  [
    "ps verifier kills only its direct group",
    async () => {
      const child = fakeChild(402);
      const calls = [];
      await assert.rejects(
        testing.runPsVerifier(
          [],
          {
            timeout: 1,
            stdout: 64,
            stderr: 64,
            timeoutCode: "PRECONDITION_ENV",
            outputCode: "PRECONDITION_SOURCE",
            exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
          },
          {
            spawnPs: () => child,
            setTimeout: (callback) => {
              queueMicrotask(callback);
              return { unref() {} };
            },
            kill: (pid, signal) => {
              calls.push([pid, signal]);
              if (signal === "SIGKILL") {
                child.signalCode = "SIGKILL";
                child.emit("close", null, "SIGKILL");
                return;
              }
              throw esrch();
            },
          },
        ),
        (error) => error?.code === "PRECONDITION_ENV",
      );
      assert.deepEqual(calls, [
        [-402, "SIGKILL"],
        [-402, 0],
      ]);
    },
  ],
  [
    "general captured probes are detached",
    async () => {
      const child = fakeChild(403);
      let invocation;
      let expected;
      const promise = testing.runCaptured(
        "/tool",
        ["--flag"],
        {
          cwd: "/repo",
          env: { LANG: "C" },
        },
        {
          timeout: 2_000,
          stdout: 64,
          stderr: 64,
          timeoutCode: "PRECONDITION_ENV",
          outputCode: "PRECONDITION_SOURCE",
          exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
        },
        {
          spawn: (command, args, options) => {
            invocation = { command, args, options };
            return child;
          },
          probeIdentity: async (_pid, tokens) => {
            expected = tokens;
            return {
              pid: 403,
              pgid: 403,
              executable: "/tool",
              startTime: "Mon Jan 01 00:00:00 2024",
            };
          },
          kill: () => {
            throw esrch();
          },
        },
      );
      queueMicrotask(() => {
        child.stdout.end("ok");
        child.stderr.end();
        child.exitCode = 0;
        child.emit("close", 0, null);
      });
      assert.equal((await promise).stdout, "ok");
      assert.deepEqual(expected, ["/tool", "--flag"]);
      assert.equal(invocation.options.detached, true);
      assert.equal(invocation.options.shell, false);
    },
  ],
  [
    "general probes capture exact executable and argv",
    () => assert.match(controllerSource, /child\.pid,[\s\S]*\[command, \.\.\.args\]/u),
  ],
  [
    "settlement attaches immediately after spawn",
    () => {
      const start = controllerSource.indexOf("async function runCaptured");
      assert.ok(
        controllerSource.indexOf("const settlement = childSettlement(child)", start) <
          controllerSource.indexOf("const stdout = []", start),
      );
    },
  ],
  [
    "timeout and output latch the original phase code",
    async () => {
      const child = fakeChild(404);
      const calls = [];
      await assert.rejects(
        testing.runCaptured(
          "/tool",
          [],
          { cwd: "/", env: {} },
          {
            timeout: 1,
            stdout: 64,
            stderr: 64,
            timeoutCode: "PRECONDITION_ENV",
            outputCode: "PRECONDITION_SOURCE",
            exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
          },
          {
            spawn: () => child,
            probeIdentity: async () => ({
              pid: 404,
              pgid: 404,
              executable: "/tool",
              startTime: "Mon Jan 01 00:00:00 2024",
            }),
            setTimeout: (callback) => {
              queueMicrotask(callback);
              return { unref() {} };
            },
            kill: (pid, signal) => {
              calls.push([pid, signal]);
              if (signal === "SIGTERM") {
                child.signalCode = "SIGTERM";
                child.emit("close", null, "SIGTERM");
                return;
              }
              throw esrch();
            },
          },
        ),
        (error) => error?.code === "PRECONDITION_ENV",
      );
      assert.deepEqual(calls, [
        [-404, "SIGTERM"],
        [-404, 0],
        [-404, 0],
      ]);
      assert.match(controllerSource, /latch\(limits\.outputCode\)/u);
    },
  ],
  [
    "verified general failures use bounded TERM and KILL",
    () => assert.match(controllerSource, /terminateVerifiedProcessGroup\([\s\S]*lifecycle\.close/u),
  ],
  [
    "unverified live probes enter nonreceipt HOLD",
    async () => {
      const child = fakeChild(405);
      await assert.rejects(
        testing.runCaptured(
          "/tool",
          [],
          { cwd: "/", env: {} },
          {
            timeout: 2_000,
            stdout: 64,
            stderr: 64,
            timeoutCode: "PRECONDITION_ENV",
            outputCode: "PRECONDITION_SOURCE",
            exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
          },
          {
            spawn: () => child,
            probeIdentity: async () => {
              throw new Error("unverified");
            },
          },
        ),
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
    },
  ],
  [
    "verified probes always prove process-group absence",
    async () => {
      const child = fakeChild(406);
      const promise = testing.runCaptured(
        "/tool",
        [],
        { cwd: "/", env: {} },
        {
          timeout: 2_000,
          stdout: 64,
          stderr: 64,
          timeoutCode: "PRECONDITION_ENV",
          outputCode: "PRECONDITION_SOURCE",
          exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
        },
        {
          spawn: () => child,
          probeIdentity: async () => ({
            pid: 406,
            pgid: 406,
            executable: "/tool",
            startTime: "Mon Jan 01 00:00:00 2024",
          }),
          kill: () => undefined,
        },
      );
      queueMicrotask(() => {
        child.exitCode = 0;
        child.emit("close", 0, null);
      });
      await assert.rejects(
        promise,
        (error) => error?.code === "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD",
      );
    },
  ],
];
for (const [name, action] of v11121SubprocessCases) test(`v1.1.12.1 subprocess: ${name}`, action);

const v11121RoleSampleCases = [
  [
    "requires an explicit role sample sink",
    () => assert.match(controllerSource, /typeof onRoleSample !== "function"/u),
  ],
  [
    "writes the role slot on the initial gated sample",
    () => assert.match(controllerSource, /sampleHeldFilesystem\([\s\S]*onRoleSample/u),
  ],
  [
    "writes the role slot during interval monitoring",
    () => assert.ok((controllerSource.match(/\bonRoleSample\b/gu) ?? []).length >= 5),
  ],
  [
    "acquire samples bind freeBytesAfterAcquire",
    () => {
      assert.ok(controllerSource.includes("onRoleSample: (value) => {"));
      assert.ok(controllerSource.includes("freeAfterAcquire = value;"));
    },
  ],
  [
    "minimum samples bind freeBytesAfterMinimumEvidence",
    () => {
      assert.ok(controllerSource.includes("onRoleSample: (value) => {"));
      assert.ok(controllerSource.includes("freeAfterMinimumEvidence = value;"));
    },
  ],
  [
    "cleanup samples bind freeBytesAfterCleanup while preflight binds freeBefore",
    () => {
      assert.ok(controllerSource.includes("onRoleSample: (value) => {"));
      assert.ok(controllerSource.includes("freeAfterCleanup = value;"));
      assert.match(controllerSource, /freeBefore = sampleHeldFilesystem\(/u);
    },
  ],
];
for (const [name, action] of v11121RoleSampleCases) test(`v1.1.12.1 role sample: ${name}`, action);

const postIdentityReceipt = () =>
  testingReceipt({
    state: "ACQUIRE_FAILED_CLEAN",
    primaryFailureCode: "POST_RUNTIME_IDENTITY",
    cleanupFailureCode: "NONE",
    downloadResult: "SUCCEEDED",
    minimumEvidenceResult: "NOT_RUN",
    cleanupResult: "SUCCEEDED",
    runtimeIdentifier: null,
    runtimeVersion: null,
    runtimeBuild: null,
    freeBytesAfterMinimumEvidence: null,
    preExactRuntimeCount: 0,
    postAcquireExactRuntimeCount: 1,
    postCleanupExactRuntimeCount: 0,
  });

const v11121ReceiptCases = [
  [
    "invalid first inventory uses the dedicated code",
    () => throwsCode(() => parseRuntimeInventory("{"), "PRECONDITION_RUNTIME_INVENTORY"),
  ],
  [
    "oversized first inventory uses the dedicated code",
    () =>
      throwsCode(
        () =>
          parseRuntimeInventory(
            JSON.stringify({ runtimes: Array.from({ length: 4097 }, () => ({})) }),
          ),
        "PRECONDITION_RUNTIME_INVENTORY",
      ),
  ],
  [
    "runtime-inventory precondition has no fabricated observations",
    () =>
      assert.equal(
        validateReceipt(
          preconditionReceipt({ primaryFailureCode: "PRECONDITION_RUNTIME_INVENTORY" }),
        ).state,
        "PRECONDITION_REJECTED",
      ),
  ],
  [
    "storage-anchor precondition begins after exact count zero",
    () =>
      assert.equal(
        validateReceipt(
          preconditionReceipt({
            primaryFailureCode: "PRECONDITION_STORAGE_ANCHOR",
            preExactRuntimeCount: 0,
          }),
        ).preExactRuntimeCount,
        0,
      ),
  ],
  [
    "invocation one rejects a null pre-count",
    () =>
      throwsCode(
        () => validateReceipt(testingReceipt({ preExactRuntimeCount: null })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "cleanup success rejects a null post-cleanup count",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            testingReceipt({ postCleanupExactRuntimeCount: null, runtimeRetained: true }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "acquire floor cannot borrow a later low slot",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            acquireDiskReceipt("ACQUIRE_DISK_FLOOR", {
              freeBytesAfterAcquire: Number(MIN_FREE_AFTER_ACQUIRE_BYTES),
              freeBytesAfterMinimumEvidence: 0,
            }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "minimum floor cannot borrow an acquire low slot",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            testingReceipt({
              state: "TEST_FAILED_CLEAN",
              primaryFailureCode: "MINIMUM_EVIDENCE_DISK_FLOOR",
              minimumEvidenceResult: "FAILED",
              freeBytesAfterAcquire: 0,
              freeBytesAfterMinimumEvidence: Number(MIN_FREE_AFTER_ACQUIRE_BYTES),
              minimumFreeBytesObserved: 0,
            }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "post-runtime identity may record cardinality before selecting a runtime",
    () => assert.equal(validateReceipt(postIdentityReceipt()).postAcquireExactRuntimeCount, 1),
  ],
  [
    "acquire failure rejects an unreached minimum slot",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            acquireDiskReceipt("ACQUIRE_EXIT", {
              freeBytesAfterMinimumEvidence: Number(MIN_FREE_AFTER_ACQUIRE_BYTES),
            }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
];
for (const [name, action] of v11121ReceiptCases) test(`v1.1.12.1 receipt table: ${name}`, action);

const capturedWrapper = (pid = 511) => ({
  pid,
  pgid: pid,
  executable: "/tool",
  startTime: "Mon Jan 01 00:00:00 2024",
});

const v11122LifecycleCases = [
  [
    "live re-probe failure holds unverified without signaling",
    async () => {
      const child = fakeChild(511);
      const signals = [];
      await assert.rejects(
        signalVerifiedProcessGroup(child, capturedWrapper(), "SIGTERM", ["/tool"], {
          probeIdentity: async () => {
            throw new Error("probe failed");
          },
          kill: (...args) => signals.push(args),
        }),
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
      assert.deepEqual(signals, []);
    },
  ],
  [
    "close during re-probe accepts only proven group absence",
    async () => {
      const child = fakeChild(512);
      const signals = [];
      assert.equal(
        await signalVerifiedProcessGroup(child, capturedWrapper(512), "SIGTERM", ["/tool"], {
          probeIdentity: async () => {
            child.exitCode = 0;
            throw new Error("closed during probe");
          },
          kill: (...args) => {
            signals.push(args);
            throw esrch();
          },
        }),
        false,
      );
      assert.deepEqual(signals, [[-512, 0]]);
    },
  ],
  [
    "live immutable identity drift holds unverified without signaling",
    async () => {
      const child = fakeChild(513);
      const signals = [];
      await assert.rejects(
        signalVerifiedProcessGroup(child, capturedWrapper(513), "SIGTERM", ["/tool"], {
          probeIdentity: async () => ({
            ...capturedWrapper(513),
            startTime: "Tue Jan 02 00:00:00 2024",
          }),
          kill: (...args) => signals.push(args),
        }),
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
      assert.deepEqual(signals, []);
    },
  ],
  [
    "verified signal failure holds verified",
    async () => {
      const child = fakeChild(514);
      await assert.rejects(
        signalVerifiedProcessGroup(child, capturedWrapper(514), "SIGTERM", ["/tool"], {
          probeIdentity: async () => capturedWrapper(514),
          kill: () => {
            throw Object.assign(new Error("denied"), { code: "EPERM" });
          },
        }),
        (error) => error?.code === "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD",
      );
    },
  ],
  [
    "termination preserves the unverified hold code",
    async () => {
      const child = fakeChild(515);
      await assert.rejects(
        terminateVerifiedProcessGroup(
          child,
          testing.childLifecycle(child).close,
          capturedWrapper(515),
          ["/tool"],
          {
            probeIdentity: async () => {
              throw new Error("unverifiable");
            },
            kill: () => assert.fail("unverified identity must not be signaled"),
          },
        ),
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
    },
  ],
  [
    "gated phases race immutable HOLD settlement against child close",
    async () => {
      const sourcePath = realpathSync.native(resolve(root, "scripts/ios-runtime-bootstrap.mjs"));
      const sourceFd = openSync(sourcePath, "r");
      const sourceInfo = fstatSync(sourceFd);
      const sourceBytes = readFileSync(sourcePath);
      const heldSource = Object.freeze({
        fd: sourceFd,
        path: sourcePath,
        dev: sourceInfo.dev,
        ino: sourceInfo.ino,
        size: sourceInfo.size,
        sha256: createHash("sha256").update(sourceBytes).digest("hex"),
      });
      const child = fakeChild(516);
      const gate = new PassThrough();
      const ready = new PassThrough();
      child.stdio = [null, null, null, gate, null, ready];
      const originalEnd = gate.end.bind(gate);
      gate.end = (chunk, callback) => {
        child.stdout.write(Buffer.alloc(MAX_COMBINED_CAPTURE_BYTES + 1));
        return originalEnd(chunk, callback);
      };
      const gatedInternal = { ...validInternal };
      delete gatedInternal.FLUYO_INTERNAL_RELEASE_SHA256;
      let probes = 0;
      let signals = 0;
      let downstreamReceiptCleanupCalls = 0;
      const observations = { minimumFree: null, maximumDelta: 0n, samples: 0 };
      const directoryInfo = Object.freeze({
        dev: 1n,
        ino: 2n,
        isDirectory: () => true,
        isSymbolicLink: () => false,
      });
      const dependencies = {
        now: () => performance.now(),
        randomBytes: () => Buffer.alloc(CHILD_GATE_RELEASE_BYTES, 7),
        spawn: () => {
          queueMicrotask(() => ready.end(CHILD_GATE_READY));
          return child;
        },
        probeIdentity: async () => {
          probes += 1;
          if (probes === 1) return capturedWrapper(516);
          throw new Error("live termination identity became unprovable");
        },
        kill: () => {
          signals += 1;
        },
        fs: {
          fstat: () => directoryInfo,
          lstat: () => directoryInfo,
          statfs: () => ({ bavail: 20_000_000_000n, bsize: 1n }),
        },
      };
      const phase = runGatedPhase(
        {
          role: "ACQUIRE",
          repositoryRoot: root,
          controllerSource: heldSource,
          internalEnvironment: Object.freeze(gatedInternal),
          targetEnvironment: validAcquireTarget,
          timeoutMs: 10_000,
          binding: { fd: 1, path: "/owned", dev: 1n, ino: 2n },
          freeBefore: 20_000_000_000n,
          observations,
          ownedRoots: [],
          capture: { bytes: 0 },
          onRoleSample: () => {},
          beforeRelease: () => {},
        },
        dependencies,
      ).then(() => {
        downstreamReceiptCleanupCalls += 1;
      });
      try {
        await assert.rejects(
          Promise.race([
            phase,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("HOLD did not settle promptly")), 500),
            ),
          ]),
          (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
        );
        const samplesAtHold = observations.samples;
        await new Promise((resolveWait) => setTimeout(resolveWait, DISK_MONITOR_INTERVAL_MS + 25));
        assert.equal(observations.samples, samplesAtHold);
        assert.equal(signals, 0);
        assert.equal(downstreamReceiptCleanupCalls, 0);
        assert.equal(child.exitCode, null);
        assert.equal(child.signalCode, null);
        assert.ok(child.listenerCount("close") <= 1);
        assert.ok(child.listenerCount("error") <= 1);
        assert.equal(ready.listenerCount("data"), 0);
        assert.equal(ready.listenerCount("end"), 0);
      } finally {
        closeSync(sourceFd);
        gate.destroy();
        ready.destroy();
        child.stdout.destroy();
        child.stderr.destroy();
      }
    },
  ],
];
for (const [name, action] of v11122LifecycleCases) test(`v1.1.12.2 lifecycle: ${name}`, action);

function invalidTrackedChild(onPidRead) {
  const child = fakeChild(1);
  Object.defineProperty(child, "pid", {
    configurable: true,
    get: () => {
      onPidRead(child);
      return 0;
    },
  });
  return child;
}

async function prereleaseHold(code, pid) {
  const sourcePath = realpathSync.native(resolve(root, "scripts/ios-runtime-bootstrap.mjs"));
  const sourceFd = openSync(sourcePath, "r");
  const sourceInfo = fstatSync(sourceFd);
  const heldSource = Object.freeze({
    fd: sourceFd,
    path: sourcePath,
    dev: sourceInfo.dev,
    ino: sourceInfo.ino,
    size: sourceInfo.size,
    sha256: createHash("sha256").update(readFileSync(sourcePath)).digest("hex"),
  });
  const child = fakeChild(pid);
  const gate = new PassThrough();
  const ready = new PassThrough();
  child.stdio = [null, null, null, gate, null, ready];
  const gatedInternal = { ...validInternal };
  delete gatedInternal.FLUYO_INTERNAL_RELEASE_SHA256;
  const phase = runGatedPhase(
    {
      role: "ACQUIRE",
      repositoryRoot: root,
      controllerSource: heldSource,
      internalEnvironment: Object.freeze(gatedInternal),
      targetEnvironment: validAcquireTarget,
      timeoutMs: 10_000,
      binding: { fd: 1, path: "/owned", dev: 1n, ino: 2n },
      freeBefore: 20_000_000_000n,
      observations: { minimumFree: null, maximumDelta: 0n, samples: 0 },
      ownedRoots: [],
      capture: { bytes: 0 },
      onRoleSample: () => assert.fail("pre-release HOLD must not sample"),
    },
    {
      randomBytes: () => Buffer.alloc(CHILD_GATE_RELEASE_BYTES, 9),
      spawn: () => {
        queueMicrotask(() => ready.end(CHILD_GATE_READY));
        return child;
      },
      probeIdentity: async () => {
        throw new BootstrapFailure(code);
      },
    },
  );
  try {
    await assert.rejects(
      Promise.race([
        phase,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("pre-release HOLD was remapped or delayed")), 500),
        ),
      ]),
      (error) => error?.code === code,
    );
    assert.equal(child.exitCode, null);
    assert.equal(child.signalCode, null);
    assert.equal(gate.destroyed, false);
  } finally {
    closeSync(sourceFd);
    gate.destroy();
    ready.destroy();
    child.stdout.destroy();
    child.stderr.destroy();
  }
}

async function gatedMissingClose({ released, pid, expectedCode }) {
  const sourcePath = realpathSync.native(resolve(root, "scripts/ios-runtime-bootstrap.mjs"));
  const sourceFd = openSync(sourcePath, "r");
  const sourceInfo = fstatSync(sourceFd);
  const heldSource = Object.freeze({
    fd: sourceFd,
    path: sourcePath,
    dev: sourceInfo.dev,
    ino: sourceInfo.ino,
    size: sourceInfo.size,
    sha256: createHash("sha256").update(readFileSync(sourcePath)).digest("hex"),
  });
  const child = fakeChild(pid);
  const gate = new PassThrough();
  const ready = new PassThrough();
  child.stdio = [null, null, null, gate, null, ready];
  if (released) {
    const originalEnd = gate.end.bind(gate);
    gate.end = (chunk, callback) =>
      originalEnd(chunk, (error) => {
        callback(error);
        child.exitCode = 1;
        queueMicrotask(() => child.emit("error", new Error("released child exited without close")));
      });
  }
  const gatedInternal = { ...validInternal };
  delete gatedInternal.FLUYO_INTERNAL_RELEASE_SHA256;
  let signals = 0;
  let downstream = 0;
  const info = {
    dev: 1n,
    ino: 2n,
    isDirectory: () => true,
    isSymbolicLink: () => false,
  };
  const phase = runGatedPhase(
    {
      role: "ACQUIRE",
      repositoryRoot: root,
      controllerSource: heldSource,
      internalEnvironment: Object.freeze(gatedInternal),
      targetEnvironment: validAcquireTarget,
      timeoutMs: 10_000,
      binding: { fd: 1, path: "/owned", dev: 1n, ino: 2n },
      freeBefore: 20_000_000_000n,
      observations: { minimumFree: null, maximumDelta: 0n, samples: 0 },
      ownedRoots: [],
      capture: { bytes: 0 },
      onRoleSample: () => {},
    },
    {
      randomBytes: () => Buffer.alloc(CHILD_GATE_RELEASE_BYTES, 4),
      spawn: () => {
        queueMicrotask(() => ready.end(CHILD_GATE_READY));
        return child;
      },
      probeIdentity: async () => {
        if (!released) throw new Error("pre-release identity unavailable");
        return capturedWrapper(pid);
      },
      now: () => 0,
      setTimeout: (callback, milliseconds) =>
        setTimeout(callback, milliseconds === CHILD_CLOSE_WAIT_MS ? 0 : milliseconds),
      kill: () => {
        signals += 1;
      },
      fs: {
        fstat: () => info,
        lstat: () => info,
        statfs: () => ({ bavail: 20_000_000_000n, bsize: 1n }),
      },
    },
  ).then(() => {
    downstream += 1;
  });
  try {
    await assert.rejects(
      Promise.race([
        phase,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("missing-close HOLD did not settle")), 500),
        ),
      ]),
      (error) => error?.code === expectedCode,
    );
    assert.equal(signals, 0);
    assert.equal(downstream, 0);
    assert.equal(child.listenerCount("close"), 1);
  } finally {
    closeSync(sourceFd);
    gate.destroy();
    ready.destroy();
    child.stdout.destroy();
    child.stderr.destroy();
  }
}

const cleanupDiskReceipt = (cleanupFailureCode, overrides = {}) =>
  testingReceipt({
    state: "CLEANUP_FAILED",
    primaryFailureCode: "NONE",
    cleanupFailureCode,
    cleanupResult: "FAILED",
    postCleanupExactRuntimeCount: null,
    runtimeRetained: true,
    ...overrides,
  });

const v113Cases = [
  [
    "ps settlement attaches before invalid PID read and maps a close",
    async () => {
      const child = invalidTrackedChild((value) => {
        assert.equal(value.listenerCount("error"), 1);
        assert.equal(value.listenerCount("close"), 1);
      });
      const promise = testing.runPsVerifier(
        [],
        {
          timeout: 2_000,
          stdout: 64,
          stderr: 64,
          timeoutCode: "PRECONDITION_ENV",
          outputCode: "PRECONDITION_ENV",
          exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
        },
        { spawnPs: () => child },
      );
      queueMicrotask(() => child.emit("close", 1, null));
      await assert.rejects(promise, (error) => error?.code === "PRECONDITION_XCODE_VERSION_PROBE");
      assert.equal(child.listenerCount("error"), 0);
      assert.equal(child.listenerCount("close"), 0);
    },
  ],
  [
    "ps invalid PID without settlement enters bounded unverified HOLD and never signals",
    async () => {
      const child = invalidTrackedChild(() => {});
      let delay;
      let signals = 0;
      await assert.rejects(
        testing.runPsVerifier(
          [],
          {
            timeout: 2_000,
            stdout: 64,
            stderr: 64,
            timeoutCode: "PRECONDITION_ENV",
            outputCode: "PRECONDITION_ENV",
            exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
          },
          {
            spawnPs: () => child,
            setTimeout: (callback, milliseconds) => {
              delay = milliseconds;
              return setTimeout(callback, 0);
            },
            kill: () => {
              signals += 1;
            },
          },
        ),
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
      assert.equal(delay, 7_000);
      assert.equal(signals, 0);
    },
  ],
  [
    "general settlement attaches before invalid PID read and maps a close",
    async () => {
      const child = invalidTrackedChild((value) => {
        assert.equal(value.listenerCount("error"), 1);
        assert.equal(value.listenerCount("close"), 1);
      });
      const promise = testing.runCaptured(
        "/tool",
        [],
        { cwd: "/", env: {} },
        {
          timeout: 2_000,
          stdout: 64,
          stderr: 64,
          timeoutCode: "PRECONDITION_ENV",
          outputCode: "PRECONDITION_ENV",
          exitCode: "PRECONDITION_SOURCE",
        },
        { spawn: () => child },
      );
      queueMicrotask(() => {
        child.emit("error", new Error("spawned child failed"));
        queueMicrotask(() => child.emit("close", 1, null));
      });
      await assert.rejects(promise, (error) => error?.code === "PRECONDITION_SOURCE");
      assert.equal(child.listenerCount("error"), 0);
      assert.equal(child.listenerCount("close"), 0);
    },
  ],
  [
    "general invalid PID without settlement enters bounded unverified HOLD and never signals",
    async () => {
      const child = invalidTrackedChild(() => {});
      let delay;
      let signals = 0;
      await assert.rejects(
        testing.runCaptured(
          "/tool",
          [],
          { cwd: "/", env: {} },
          {
            timeout: 2_000,
            stdout: 64,
            stderr: 64,
            timeoutCode: "PRECONDITION_ENV",
            outputCode: "PRECONDITION_ENV",
            exitCode: "PRECONDITION_SOURCE",
          },
          {
            spawn: () => child,
            setTimeout: (callback, milliseconds) => {
              delay = milliseconds;
              return setTimeout(callback, 0);
            },
            kill: () => {
              signals += 1;
            },
          },
        ),
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
      assert.equal(delay, 7_000);
      assert.equal(signals, 0);
    },
  ],
  [
    "synchronous ps spawn rejection is the fixed phase exit code",
    async () =>
      assert.rejects(
        testing.runPsVerifier(
          [],
          {
            timeout: 2_000,
            stdout: 64,
            stderr: 64,
            timeoutCode: "PRECONDITION_ENV",
            outputCode: "PRECONDITION_ENV",
            exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
          },
          {
            spawnPs: () => {
              throw new Error("private raw error");
            },
          },
        ),
        (error) =>
          error?.code === "PRECONDITION_XCODE_VERSION_PROBE" && !error.message.includes("private"),
      ),
  ],
  [
    "synchronous general spawn rejection is the fixed phase exit code",
    async () =>
      assert.rejects(
        testing.runCaptured(
          "/tool",
          [],
          { cwd: "/", env: {} },
          {
            timeout: 2_000,
            stdout: 64,
            stderr: 64,
            timeoutCode: "PRECONDITION_ENV",
            outputCode: "PRECONDITION_ENV",
            exitCode: "PRECONDITION_SOURCE",
          },
          {
            spawn: () => {
              throw new Error("private raw error");
            },
          },
        ),
        (error) => error?.code === "PRECONDITION_SOURCE" && !error.message.includes("private"),
      ),
  ],
  [
    "pre-release unverified HOLD is retained before gate teardown or role mapping",
    async () => prereleaseHold("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD", 611),
  ],
  [
    "pre-release verified HOLD is retained before gate teardown or role mapping",
    async () => prereleaseHold("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD", 612),
  ],
  [
    "storage anchor failure closes its candidate exactly once and clears evidence",
    () => {
      const observations = { minimumFree: 1n, maximumDelta: 2n, samples: 3 };
      let closes = 0;
      throwsCode(
        () =>
          bindStorageAnchor([], [], observations, {
            discover: () => ({ path: "/anchor", dev: 1n, ino: 2n }),
            open: () => 77,
            close: (fd) => {
              assert.equal(fd, 77);
              closes += 1;
            },
            fs: {
              fstat: () => {
                throw new Error("identity failed");
              },
            },
          }),
        "PRECONDITION_STORAGE_ANCHOR",
      );
      assert.equal(closes, 1);
      assert.deepEqual(observations, { minimumFree: null, maximumDelta: 0n, samples: 0 });
    },
  ],
  [
    "successful storage anchor transfers its held descriptor and first sample",
    () => {
      const observations = { minimumFree: null, maximumDelta: 0n, samples: 0 };
      let closes = 0;
      const info = {
        dev: 1n,
        ino: 2n,
        isDirectory: () => true,
        isSymbolicLink: () => false,
      };
      const value = bindStorageAnchor([], [], observations, {
        discover: () => ({ path: "/anchor", dev: 1n, ino: 2n }),
        open: () => 78,
        close: () => {
          closes += 1;
        },
        fs: {
          fstat: () => info,
          lstat: () => info,
          statfs: () => ({ bavail: MIN_FREE_BEFORE_BYTES, bsize: 1n }),
        },
      });
      assert.equal(value.binding.fd, 78);
      assert.equal(value.freeBefore, MIN_FREE_BEFORE_BYTES);
      assert.equal(closes, 0);
      assert.deepEqual(observations, {
        minimumFree: MIN_FREE_BEFORE_BYTES,
        maximumDelta: 0n,
        samples: 1,
      });
    },
  ],
  [
    "cleanup floor requires the cleanup slot and aggregate minimum below floor",
    () => {
      const value = validateReceipt(
        cleanupDiskReceipt("CLEANUP_DISK_FLOOR", {
          freeBytesAfterCleanup: Number(MIN_FREE_AFTER_CLEANUP_BYTES - 1n),
          minimumFreeBytesObserved: Number(MIN_FREE_AFTER_CLEANUP_BYTES - 1n),
        }),
      );
      assert.equal(value.cleanupFailureCode, "CLEANUP_DISK_FLOOR");
    },
  ],
  [
    "cleanup floor cannot excuse an acquire-phase low slot",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            cleanupDiskReceipt("CLEANUP_DISK_FLOOR", {
              freeBytesAfterAcquire: Number(MIN_FREE_AFTER_ACQUIRE_BYTES - 1n),
              freeBytesAfterCleanup: Number(MIN_FREE_AFTER_CLEANUP_BYTES - 1n),
              minimumFreeBytesObserved: Number(MIN_FREE_AFTER_CLEANUP_BYTES - 1n),
            }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "cleanup limit requires its reached slot and an over-cap aggregate delta",
    () => {
      const value = validateReceipt(
        cleanupDiskReceipt("CLEANUP_DISK_LIMIT", {
          acquireDiskDeltaBytes: Number(MAX_ACQUIRE_DISK_DELTA_BYTES + 1n),
        }),
      );
      assert.equal(value.cleanupFailureCode, "CLEANUP_DISK_LIMIT");
    },
  ],
  [
    "non-disk cleanup failure permits an unreached cleanup sample only",
    () => {
      const value = validateReceipt(
        cleanupDiskReceipt("CLEANUP_STORAGE_IDENTITY", { freeBytesAfterCleanup: null }),
      );
      assert.equal(value.freeBytesAfterCleanup, null);
    },
  ],
];
for (const [name, action] of v113Cases) test(`v1.1.13: ${name}`, action);

const v1142Cases = [
  [
    "child lifecycle settles on error but closes only on actual close",
    async () => {
      const child = fakeChild(701);
      const lifecycle = testing.childLifecycle(child);
      child.emit("error", new Error("first error"));
      assert.deepEqual(await lifecycle.settlement, { code: null, signal: null, error: true });
      let closed = false;
      lifecycle.close.then(() => {
        closed = true;
      });
      await Promise.resolve();
      assert.equal(closed, false);
      child.emit("close", 1, null);
      assert.deepEqual(await lifecycle.close, { code: 1, signal: null, error: false });
      assert.equal(child.listenerCount("error"), 0);
      assert.equal(child.listenerCount("close"), 0);
    },
  ],
  [
    "actual-close wait never infers closure from exit or signal state",
    async () => {
      const child = fakeChild(702);
      child.exitCode = 1;
      child.signalCode = "SIGTERM";
      const lifecycle = testing.childLifecycle(child);
      let delay;
      const result = await testing.awaitActualClose(lifecycle.close, CHILD_CLOSE_WAIT_MS, {
        setTimeout: (callback, milliseconds) => {
          delay = milliseconds;
          return setTimeout(callback, 0);
        },
      });
      assert.equal(result, null);
      assert.equal(delay, 7_000);
    },
  ],
  [
    "ps exit state without close enters verified HOLD without another signal",
    async () => {
      const child = fakeChild(703);
      child.exitCode = 1;
      let signals = 0;
      await assert.rejects(
        testing.runPsVerifier(
          [],
          {
            timeout: 1,
            stdout: 64,
            stderr: 64,
            timeoutCode: "PRECONDITION_ENV",
            outputCode: "PRECONDITION_SOURCE",
            exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
          },
          {
            spawnPs: () => child,
            setTimeout: (callback) => setTimeout(callback, 0),
            kill: () => {
              signals += 1;
            },
          },
        ),
        (error) => error?.code === "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD",
      );
      assert.equal(signals, 0);
    },
  ],
  [
    "general exit state without close enters verified HOLD without another signal",
    async () => {
      const child = fakeChild(704);
      child.exitCode = 1;
      let signals = 0;
      await assert.rejects(
        testing.runCaptured(
          "/tool",
          [],
          { cwd: "/", env: {} },
          {
            timeout: 1,
            stdout: 64,
            stderr: 64,
            timeoutCode: "PRECONDITION_ENV",
            outputCode: "PRECONDITION_SOURCE",
            exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
          },
          {
            spawn: () => child,
            probeIdentity: async () => capturedWrapper(704),
            setTimeout: (callback) => setTimeout(callback, 0),
            kill: () => {
              signals += 1;
            },
          },
        ),
        (error) => error?.code === "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD",
      );
      assert.equal(signals, 0);
    },
  ],
  [
    "termination requires actual close even after observed exit",
    async () => {
      const child = fakeChild(705);
      child.exitCode = 1;
      const lifecycle = testing.childLifecycle(child);
      let signals = 0;
      await assert.rejects(
        terminateVerifiedProcessGroup(child, lifecycle.close, capturedWrapper(705), ["/tool"], {
          setTimeout: (callback) => setTimeout(callback, 0),
          kill: () => {
            signals += 1;
          },
        }),
        (error) => error?.code === "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD",
      );
      assert.equal(signals, 0);
    },
  ],
  [
    "gated pre-release missing close enters unverified HOLD",
    async () =>
      gatedMissingClose({
        released: false,
        pid: 706,
        expectedCode: "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      }),
  ],
  [
    "gated released missing close enters verified HOLD without downstream work",
    async () =>
      gatedMissingClose({
        released: true,
        pid: 707,
        expectedCode: "PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD",
      }),
  ],
  ...[
    "CLEANUP_PROCESS_IDENTITY",
    "CLEANUP_DELETE_FAILED",
    "CLEANUP_RAW_RESIDUE",
    "CLEANUP_RECEIPT_INVALID",
  ].map((code) => [
    `invocation-one ${code} rejects missing post-sample evidence`,
    () =>
      throwsCode(
        () => validateReceipt(cleanupDiskReceipt(code, { freeBytesAfterCleanup: null })),
        "RECEIPT_INVALID",
      ),
  ]),
  [
    "post-sample cleanup failure table accepts each required code",
    () => {
      for (const code of [
        "CLEANUP_PROCESS_IDENTITY",
        "CLEANUP_DELETE_FAILED",
        "CLEANUP_RAW_RESIDUE",
        "CLEANUP_RECEIPT_INVALID",
      ]) {
        assert.equal(validateReceipt(cleanupDiskReceipt(code)).cleanupFailureCode, code);
      }
    },
  ],
  [
    "invocation-zero raw cleanup residue may retain a null cleanup slot",
    () => {
      const value = validateReceipt(
        preconditionReceipt({
          state: "CLEANUP_FAILED",
          cleanupFailureCode: "CLEANUP_RAW_RESIDUE",
          cleanupResult: "FAILED",
        }),
      );
      assert.equal(value.freeBytesAfterCleanup, null);
    },
  ],
  [
    "three exact pre-sample cleanup failures may retain a null cleanup slot",
    () => {
      for (const code of ["CLEANUP_INTERRUPTED", "CLEANUP_RESIDUE", "CLEANUP_STORAGE_IDENTITY"]) {
        assert.equal(
          validateReceipt(cleanupDiskReceipt(code, { freeBytesAfterCleanup: null }))
            .cleanupFailureCode,
          code,
        );
      }
    },
  ],
  [
    "unknown cleanup failures sanitize by the cleanup-sample stage",
    () => {
      assert.equal(testing.sanitizeCleanupFailure(new Error("private"), false), "CLEANUP_RESIDUE");
      assert.equal(
        testing.sanitizeCleanupFailure(new Error("private"), true),
        "CLEANUP_RECEIPT_INVALID",
      );
    },
  ],
  [
    "explicit receipt-invalid cleanup failures sanitize by the cleanup-sample stage",
    () => {
      const error = new BootstrapFailure("CLEANUP_RECEIPT_INVALID");
      assert.equal(testing.sanitizeCleanupFailure(error, false), "CLEANUP_RESIDUE");
      assert.equal(testing.sanitizeCleanupFailure(error, true), "CLEANUP_RECEIPT_INVALID");
    },
  ],
];
for (const [name, action] of v1142Cases) test(`v1.1.14.2: ${name}`, action);

const v115Cases = [
  [
    "parent identity and insufficient-time codes are closed preconditions",
    () => {
      assert.equal(testing.PRIMARY_FAILURE_CODES.has("PRECONDITION_PARENT_IDENTITY"), true);
      assert.equal(testing.PRIMARY_FAILURE_CODES.has("PRECONDITION_INSUFFICIENT_TIME"), true);
    },
  ],
  [
    "precondition stages are an exact closed ordered set",
    () =>
      assert.deepEqual(testing.PRECONDITION_STAGE_VALUES, [
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
      ]),
  ],
  [
    "precondition stage fallback table is exact",
    () =>
      assert.deepEqual(testing.PRECONDITION_STAGE_FAILURE, {
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
      }),
  ],
  [
    "invocation zero preserves a known closed precondition",
    () =>
      assert.equal(
        testing.sanitizePrimaryFailure(
          new BootstrapFailure("PRECONDITION_SOURCE"),
          0,
          "PARENT_IDENTITY",
        ),
        "PRECONDITION_SOURCE",
      ),
  ],
  [
    "invocation zero maps raw parent failure without exposing cause",
    () =>
      assert.equal(
        testing.sanitizePrimaryFailure(new Error("private parent detail"), 0, "PARENT_IDENTITY"),
        "PRECONDITION_PARENT_IDENTITY",
      ),
  ],
  [
    "invocation zero never retains an acquisition code",
    () =>
      assert.equal(
        testing.sanitizePrimaryFailure(
          new BootstrapFailure("ACQUIRE_PROCESS_IDENTITY"),
          0,
          "PARENT_IDENTITY",
        ),
        "PRECONDITION_PARENT_IDENTITY",
      ),
  ],
  [
    "time-budget fallback is the dedicated precondition code",
    () =>
      assert.equal(
        testing.sanitizePrimaryFailure(new Error("private timing detail"), 0, "TIME_BUDGET"),
        "PRECONDITION_INSUFFICIENT_TIME",
      ),
  ],
  [
    "invocation one preserves its known operational code",
    () =>
      assert.equal(
        testing.sanitizePrimaryFailure(new BootstrapFailure("MINIMUM_EVIDENCE_EXIT"), 1, "SOURCE"),
        "MINIMUM_EVIDENCE_EXIT",
      ),
  ],
  [
    "invocation one retains the fixed acquisition fallback",
    () =>
      assert.equal(
        testing.sanitizePrimaryFailure(new Error("private operational detail"), 1, "SOURCE"),
        "ACQUIRE_PROCESS_IDENTITY",
      ),
  ],
  [
    "parent identity uses the dedicated direct ps verifier",
    async () => {
      let invocation;
      const child = fakeChild(711);
      queueMicrotask(() => {
        child.stdout.end(`5 1 9 Fri Nov 14 12:34:56 2026 ${PARENT_TITLE}\n`);
        child.stderr.end();
        child.exitCode = 0;
        child.emit("close", 0, null);
      });
      const identity = await probeParentIdentity(5, null, {
        spawnPs: (command, args, options) => {
          invocation = { command, args, options };
          return child;
        },
        kill: () => {
          throw esrch();
        },
      });
      assert.equal(invocation.command, PS);
      assert.deepEqual(invocation.options.env, { LANG: "C", LC_ALL: "C" });
      assert.equal(invocation.options.detached, true);
      assert.deepEqual(identity, {
        pid: 5,
        ppid: 1,
        pgid: 9,
        startTime: "Fri Nov 14 12:34:56 2026",
        title: PARENT_TITLE,
      });
    },
  ],
  [
    "oracle path pattern is portable and closed for POSIX separators",
    () => {
      const rootPath = "/tmp/fluyo-oracle-Ab12";
      const pattern = new RegExp(oraclePathPatternFor(rootPath, "/"), "u");
      for (const value of [
        rootPath,
        `${rootPath}/repo`,
        `${rootPath}/repo/scripts`,
        `${rootPath}/.config`,
      ]) {
        assert.equal(pattern.test(value), true);
      }
      for (const value of [
        `${rootPath}\\repo`,
        `${rootPath}2`,
        `${rootPath}/../escape`,
        `${rootPath}/.`,
        `${rootPath}/..`,
        `${rootPath}//repo`,
        `${rootPath}/repo/`,
        `${rootPath}/repo\tprivate`,
        `${rootPath}/repo\nprivate`,
        `${rootPath}/repo\0private`,
      ]) {
        assert.equal(pattern.test(value), false);
      }
    },
  ],
  [
    "oracle path pattern is portable and closed for Windows separators",
    () => {
      const rootPath = "C:\\Temp\\fluyo-oracle-Ab12";
      const pattern = new RegExp(oraclePathPatternFor(rootPath, "\\"), "u");
      for (const value of [
        rootPath,
        `${rootPath}\\repo`,
        `${rootPath}\\repo\\scripts`,
        `${rootPath}\\.config`,
      ]) {
        assert.equal(pattern.test(value), true);
      }
      for (const value of [
        `${rootPath}/repo`,
        `${rootPath}2`,
        `${rootPath}\\..\\escape`,
        `${rootPath}\\.`,
        `${rootPath}\\..`,
        `${rootPath}\\\\repo`,
        `${rootPath}\\repo\\`,
        `${rootPath}\\repo\tprivate`,
        `${rootPath}\\repo\nprivate`,
        `${rootPath}\\repo\0private`,
      ]) {
        assert.equal(pattern.test(value), false);
      }
    },
  ],
  [
    "raw parent failure writes a truthful callback-free invocation-zero receipt",
    async () => {
      await withRunTransactionWindowsOracle(
        async ({ bootstrapLeaf, controller, environment, minimumLeaf, repositoryRoot }) => {
          const counters = { final: 0, runTool: 0, spawn: 0 };
          const signalTarget = new EventEmitter();
          const dependencies = {
            arch: "arm64",
            now: () => 0,
            parseHead: () => ORACLE_SOURCE_COMMIT,
            platform: "darwin",
            probeParent: async () => {
              throw new Error("private-parent-detail");
            },
            runTool: async () => {
              counters.runTool += 1;
              throw new Error("unexpected-run-tool");
            },
            signalTarget,
            spawn: () => {
              counters.spawn += 1;
              throw new Error("unexpected-spawn");
            },
            validateFinalScriptIdentity: () => {
              counters.final += 1;
              throw new Error("unexpected-final-validator");
            },
          };
          await assert.rejects(
            controller.runTransaction(repositoryRoot, environment, dependencies),
            (error) => error?.code === "PRECONDITION_PARENT_IDENTITY",
          );
          assert.deepEqual(counters, { final: 0, runTool: 0, spawn: 0 });
          const receipt = controller.validateReceiptFile(repositoryRoot);
          assert.equal(receipt.primaryFailureCode, "PRECONDITION_PARENT_IDENTITY");
          assert.equal(receipt.downloadInvocationCount, 0);
          assert.equal(receipt.preExactRuntimeCount, null);
          assert.equal(receipt.freeBytesBefore, null);
          assert.equal(receipt.minimumFreeBytesObserved, null);
          assert.equal(receipt.diskMonitorSampleCount, 0);
          assert.equal(receipt.acquireDiskDeltaBytes, 0);
          assert.equal(receipt.rawLogRetained, false);
          assert.equal(receipt.runtimeRetained, false);
          assert.equal(existsSync(bootstrapLeaf), false);
          assert.equal(existsSync(minimumLeaf), false);
          assert.equal(signalTarget.listenerCount("SIGINT"), 0);
          assert.equal(signalTarget.listenerCount("SIGTERM"), 0);
          assert.equal(
            readFileSync(
              resolve(repositoryRoot, "artifacts", "ios-runtime-bootstrap", "receipt.json"),
              "utf8",
            ).includes("private-parent-detail"),
            false,
          );
        },
      );
    },
  ],
  [
    "diagnostic ready stops before final source validation or gated child",
    async () => {
      await withRunTransactionWindowsOracle(
        async ({
          bootstrapLeaf,
          controller,
          environment,
          minimumLeaf,
          repositoryRoot,
          simctlPath,
          storageRoot,
        }) => {
          const counters = { final: 0, runTool: 0, spawn: 0 };
          const signalTarget = new EventEmitter();
          const storageInfo = lstatSync(storageRoot, { bigint: true });
          const outputs = [
            { stdout: "Xcode 16.2\nBuild version 16C5032a\n", stderr: "" },
            { stdout: `${simctlPath}\n`, stderr: "" },
            { stdout: '{"runtimes":[]}\n', stderr: "" },
          ];
          const dependencies = {
            arch: "arm64",
            now: () => 0,
            discoverStorageAnchor: () => ({
              dev: storageInfo.dev,
              ino: storageInfo.ino,
              path: storageRoot,
            }),
            fs: {
              statfs: () => ({ bavail: MIN_FREE_BEFORE_BYTES, bsize: 1n }),
            },
            openStorageAnchor: (path) => openSync(path, fsConstants.O_RDONLY),
            parseHead: () => ORACLE_SOURCE_COMMIT,
            platform: "darwin",
            probeParent: async () => ({
              pgid: 9401,
              pid: 9401,
              ppid: 1,
              startTime: "Fri Nov 14 12:34:56 2026",
              title: PARENT_TITLE,
            }),
            runTool: async () => {
              const output = outputs[counters.runTool];
              counters.runTool += 1;
              assert.ok(output);
              return output;
            },
            signalTarget,
            spawn: () => {
              counters.spawn += 1;
              throw new Error("unexpected-spawn");
            },
            validateFinalScriptIdentity: () => {
              counters.final += 1;
              throw new Error("private-final-source-detail");
            },
          };
          await assert.rejects(
            controller.runTransaction(repositoryRoot, environment, dependencies),
            (error) => error?.code === "PRECONDITION_XCODE_DIAGNOSTIC_READY",
          );
          assert.deepEqual(counters, { final: 0, runTool: 2, spawn: 0 });
          const receipt = controller.validateReceiptFile(repositoryRoot);
          assert.equal(receipt.primaryFailureCode, "PRECONDITION_XCODE_DIAGNOSTIC_READY");
          assert.equal(receipt.downloadInvocationCount, 0);
          assert.equal(receipt.preExactRuntimeCount, null);
          assert.equal(receipt.freeBytesBefore, null);
          assert.equal(receipt.minimumFreeBytesObserved, null);
          assert.equal(receipt.diskMonitorSampleCount, 0);
          assert.equal(receipt.freeBytesAfterAcquire, null);
          assert.equal(receipt.freeBytesAfterMinimumEvidence, null);
          assert.equal(receipt.freeBytesAfterCleanup, null);
          assert.equal(receipt.acquireDiskDeltaBytes, 0);
          assert.equal(receipt.rawLogRetained, false);
          assert.equal(receipt.runtimeRetained, false);
          const receiptText = readFileSync(
            resolve(repositoryRoot, "artifacts", "ios-runtime-bootstrap", "receipt.json"),
            "utf8",
          );
          assert.equal(receiptText.includes("private-final-source-detail"), false);
          assert.equal(existsSync(bootstrapLeaf), false);
          assert.equal(existsSync(minimumLeaf), false);
          assert.equal(signalTarget.listenerCount("SIGINT"), 0);
          assert.equal(signalTarget.listenerCount("SIGTERM"), 0);
        },
      );
    },
  ],
  [
    "final source validation seam is local and called at exactly two final sites",
    () => {
      assert.equal(
        (controllerSource.match(/const validateFinalScriptIdentity =/gu) ?? []).length,
        1,
      );
      assert.equal(
        (controllerSource.match(/validateFinalScriptIdentity\(paths\.repositoryRoot\);/gu) ?? [])
          .length,
        2,
      );
      assert.equal(
        (
          controllerSource.match(
            /preconditionStage = "SOURCE";\s*validateFinalScriptIdentity\(paths\.repositoryRoot\);/gu,
          ) ?? []
        ).length,
        2,
      );
      assert.equal(
        (controllerSource.match(/const paths = validateScriptIdentity\(repositoryRoot\);/gu) ?? [])
          .length,
        1,
      );
      assert.equal(
        (
          controllerSource.match(
            /const scriptIdentity = validateScriptIdentity\(paths\.repositoryRoot\);/gu,
          ) ?? []
        ).length,
        1,
      );
    },
  ],
  [
    "oracle controller source rejects malformed UTF-8",
    () =>
      assert.throws(() => decodeOracleControllerBytes(Buffer.from([0xc3, 0x28])), {
        message: ORACLE_SOURCE_INVALID,
      }),
  ],
  [
    "oracle controller source rejects non-NFC text",
    () =>
      assert.throws(() => decodeOracleControllerBytes(Buffer.from("e\u0301", "utf8")), {
        message: ORACLE_SOURCE_INVALID,
      }),
  ],
  [
    "insufficient-time rejection receipt binds the reached sample",
    () => {
      const free = Number(MIN_FREE_BEFORE_BYTES);
      const receipt = validateReceipt(
        preconditionReceipt({
          primaryFailureCode: "PRECONDITION_INSUFFICIENT_TIME",
          preExactRuntimeCount: 0,
          freeBytesBefore: free,
          minimumFreeBytesObserved: free,
          diskMonitorSampleCount: 1,
        }),
      );
      assert.equal(receipt.freeBytesBefore, free);
      assert.equal(receipt.downloadInvocationCount, 0);
    },
  ],
  [
    "precondition evidence rows reject fabricated phase observations",
    () => {
      throwsCode(
        () =>
          validateReceipt(
            preconditionReceipt({
              primaryFailureCode: "PRECONDITION_PARENT_IDENTITY",
              preExactRuntimeCount: 0,
            }),
          ),
        "RECEIPT_INVALID",
      );
      throwsCode(
        () =>
          validateReceipt(
            preconditionReceipt({
              primaryFailureCode: "PRECONDITION_INSUFFICIENT_TIME",
              preExactRuntimeCount: 0,
              freeBytesBefore: Number(MIN_FREE_BEFORE_BYTES),
              minimumFreeBytesObserved: Number(MIN_FREE_BEFORE_BYTES),
              diskMonitorSampleCount: 2,
            }),
          ),
        "RECEIPT_INVALID",
      );
    },
  ],
  [
    "time budget returns to source before the final pre-release source proof",
    () =>
      assert.match(
        controllerSource,
        /preconditionStage = "TIME_BUDGET";[\s\S]*PRECONDITION_INSUFFICIENT_TIME[\s\S]*preconditionStage = "SOURCE";\s*validateFinalScriptIdentity\(paths\.repositoryRoot\);\s*verifyControllerSource\(controllerSource\)[\s\S]*beforeRelease: \(\) => \{\s*invocationCount = 1/u,
      ),
  ],
];
for (const [name, action] of v115Cases) test(`v1.1.15: ${name}`, action);

const v117Cases = [
  [
    "default monotonic clock preserves the native receiver",
    () => assert.equal(Number.isFinite(testing.monotonicNow()), true),
  ],
  [
    "injected monotonic clock returns the exact value once",
    () => {
      let calls = 0;
      assert.equal(testing.monotonicNow({ now: () => (++calls, 42.5) }), 42.5);
      assert.equal(calls, 1);
    },
  ],
  [
    "monotonic clock rejects a nonfunction injection with the fixed code",
    () =>
      throwsCode(
        () => testing.monotonicNow({ now: 1 }, "ACQUIRE_DISK_MONITOR"),
        "ACQUIRE_DISK_MONITOR",
      ),
  ],
  [
    "monotonic clock discards a private thrown cause",
    () => {
      let error;
      try {
        testing.monotonicNow(
          {
            get now() {
              throw new Error("private-clock-detail");
            },
          },
          "PRECONDITION_ENV",
        );
      } catch (caught) {
        error = caught;
      }
      assert.equal(error?.code, "PRECONDITION_ENV");
      assert.equal(String(error).includes("private-clock-detail"), false);
    },
  ],
  [
    "monotonic clock rejects every nonfinite or negative result",
    () => {
      for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1])
        throwsCode(() => testing.monotonicNow({ now: () => value }), "PRECONDITION_ENV");
    },
  ],
  [
    "five repaired clock sites use only closed failure codes",
    () => {
      assert.equal((controllerSource.match(/monotonicNow\(/gu) ?? []).length, 6);
      assert.equal(controllerSource.includes("(dependencies.now ?? performance.now)()"), false);
      assert.equal(
        (controllerSource.match(/monotonicNow\(dependencies, "MINIMUM_EVIDENCE_MONITOR"\)/gu) ?? [])
          .length,
        2,
      );
      assert.match(
        controllerSource,
        /const monitorStartedAt = monotonicNow\(dependencies, monitorFailure\)/u,
      );
      assert.match(controllerSource, /const now = monotonicNow\(dependencies, monitorFailure\)/u);
      assert.match(controllerSource, /started = monotonicNow\(dependencies, "PRECONDITION_ENV"\)/u);
    },
  ],
  [
    "canonical runner temp captures an immutable bigint identity",
    () => {
      const created = mkdtempSync(resolve(tmpdir(), "fluyo-runner-temp-"));
      const canonical = realpathSync.native(created);
      try {
        const binding = testing.validateRunnerTemp(
          { RUNNER_TEMP: canonical },
          { safePath: /^.+$/u },
        );
        assert.equal(binding.path, canonical);
        assert.equal(typeof binding.dev, "bigint");
        assert.equal(typeof binding.ino, "bigint");
        assert.equal(Object.isFrozen(binding), true);
      } finally {
        rmSync(canonical, { recursive: true, force: false });
      }
    },
  ],
  [
    "runner temp rejects relative control noncanonical link and nondirectory forms",
    () => {
      for (const value of ["relative", "C:\\private\0root", "C:\\private\nroot"])
        throwsCode(() => testing.validateRunnerTemp({ RUNNER_TEMP: value }), "PRECONDITION_ENV");
      const path = sep === "\\" ? "C:\\Temp\\fluyo" : "/tmp/fluyo";
      const directory = (overrides = {}) => ({
        dev: 1n,
        ino: 2n,
        isDirectory: () => true,
        isSymbolicLink: () => false,
        ...overrides,
      });
      throwsCode(
        () =>
          testing.validateRunnerTemp(
            { RUNNER_TEMP: path },
            { lstat: () => directory(), realpath: () => `${path}-alias` },
          ),
        "PRECONDITION_ENV",
      );
      throwsCode(
        () =>
          testing.validateRunnerTemp(
            { RUNNER_TEMP: path },
            { lstat: () => directory({ isSymbolicLink: () => true }), realpath: () => path },
          ),
        "PRECONDITION_ENV",
      );
      throwsCode(
        () =>
          testing.validateRunnerTemp(
            { RUNNER_TEMP: path },
            { lstat: () => directory({ isDirectory: () => false }), realpath: () => path },
          ),
        "PRECONDITION_ENV",
      );
    },
  ],
  [
    "owned roots are exact direct siblings and never create the legacy parent",
    () => {
      const runnerTemp = realpathSync.native(mkdtempSync(resolve(tmpdir(), "fluyo-owned-roots-")));
      try {
        const parent = testing.validateRunnerTemp(
          { RUNNER_TEMP: runnerTemp },
          { safePath: /^.+$/u },
        );
        const bootstrap = testing.createOwnedRoot(parent, "fluyo-ios-runtime-bootstrap-9401-1", 1);
        const minimum = testing.createOwnedRoot(parent, "fluyo-ios-minimum-9401-1", 1);
        assert.equal(bootstrap.path, resolve(runnerTemp, "fluyo-ios-runtime-bootstrap-9401-1"));
        assert.equal(minimum.path, resolve(runnerTemp, "fluyo-ios-minimum-9401-1"));
        assert.equal(existsSync(resolve(runnerTemp, "fluyo-ios-runtime-bootstrap")), false);
        testing.removeOwnedRoot(minimum);
        testing.removeOwnedRoot(bootstrap);
      } finally {
        rmSync(runnerTemp, { recursive: true, force: false });
      }
    },
  ],
  [
    "preexisting owned leaf is rejected without mutation",
    () => {
      const runnerTemp = realpathSync.native(
        mkdtempSync(resolve(tmpdir(), "fluyo-preexisting-root-")),
      );
      const leaf = resolve(runnerTemp, "fluyo-ios-runtime-bootstrap-9401-1");
      mkdirSync(leaf, { recursive: false, mode: 0o700 });
      try {
        const parent = testing.validateRunnerTemp(
          { RUNNER_TEMP: runnerTemp },
          { safePath: /^.+$/u },
        );
        const before = lstatSync(leaf, { bigint: true });
        throwsCode(
          () => testing.createOwnedRoot(parent, "fluyo-ios-runtime-bootstrap-9401-1", 1),
          "PRECONDITION_ENV",
        );
        const after = lstatSync(leaf, { bigint: true });
        assert.equal(after.dev, before.dev);
        assert.equal(after.ino, before.ino);
      } finally {
        rmSync(runnerTemp, { recursive: true, force: false });
      }
    },
  ],
  [
    "created owned leaf is mode 0700 nonsymlink and same-device",
    () => {
      const runnerTemp = realpathSync.native(mkdtempSync(resolve(tmpdir(), "fluyo-created-root-")));
      try {
        const parent = testing.validateRunnerTemp(
          { RUNNER_TEMP: runnerTemp },
          { safePath: /^.+$/u },
        );
        let mkdirOptions;
        const binding = testing.createOwnedRoot(parent, "fluyo-ios-runtime-bootstrap-9401-1", 1, {
          mkdir: (path, options) => {
            mkdirOptions = options;
            mkdirSync(path, options);
          },
        });
        const info = lstatSync(binding.path, { bigint: true });
        assert.deepEqual(mkdirOptions, { recursive: false, mode: 0o700 });
        assert.equal(info.isSymbolicLink(), false);
        assert.equal(info.dev, parent.dev);
        testing.removeOwnedRoot(binding);
      } finally {
        rmSync(runnerTemp, { recursive: true, force: false });
      }
    },
  ],
  [
    "created owned leaf rejects an injected different device",
    () => {
      const runnerTemp = realpathSync.native(mkdtempSync(resolve(tmpdir(), "fluyo-device-root-")));
      const parent = testing.validateRunnerTemp({ RUNNER_TEMP: runnerTemp }, { safePath: /^.+$/u });
      const leaf = resolve(runnerTemp, "fluyo-ios-runtime-bootstrap-9401-1");
      try {
        throwsCode(
          () =>
            testing.createOwnedRoot(parent, "fluyo-ios-runtime-bootstrap-9401-1", 1, {
              lstat: (path, options) => {
                const info = lstatSync(path, options);
                return path === leaf ? { ...info, dev: info.dev + 1n } : info;
              },
            }),
          "PRECONDITION_ENV",
        );
        assert.equal(existsSync(leaf), true);
      } finally {
        rmSync(runnerTemp, { recursive: true, force: false });
      }
    },
  ],
  [
    "identity swap before scan rejects without traversal",
    () => {
      const runnerTemp = realpathSync.native(mkdtempSync(resolve(tmpdir(), "fluyo-scan-swap-")));
      try {
        const parent = testing.validateRunnerTemp(
          { RUNNER_TEMP: runnerTemp },
          { safePath: /^.+$/u },
        );
        const binding = testing.createOwnedRoot(parent, "fluyo-ios-runtime-bootstrap-9401-1", 1);
        let traversed = false;
        throwsCode(
          () =>
            scanOwnedRoot(binding, 1, {
              lstat: (path, options) => {
                const info = lstatSync(path, options);
                return path === binding.path ? { ...info, ino: info.ino + 1n } : info;
              },
              realpath: realpathSync.native,
              readdir: () => ((traversed = true), []),
              now: () => 0,
              failureCode: "ACQUIRE_STORAGE_IDENTITY",
            }),
          "ACQUIRE_STORAGE_IDENTITY",
        );
        assert.equal(traversed, false);
      } finally {
        rmSync(runnerTemp, { recursive: true, force: false });
      }
    },
  ],
  [
    "identity swap before cleanup rejects without deletion",
    () => {
      const runnerTemp = realpathSync.native(mkdtempSync(resolve(tmpdir(), "fluyo-cleanup-swap-")));
      try {
        const parent = testing.validateRunnerTemp(
          { RUNNER_TEMP: runnerTemp },
          { safePath: /^.+$/u },
        );
        const binding = testing.createOwnedRoot(parent, "fluyo-ios-runtime-bootstrap-9401-1", 1);
        let removed = false;
        throwsCode(
          () =>
            testing.removeOwnedRoot(binding, {
              lstat: (path, options) => {
                const info = lstatSync(path, options);
                return path === binding.path ? { ...info, ino: info.ino + 1n } : info;
              },
              realpath: realpathSync.native,
              remove: () => {
                removed = true;
              },
            }),
          "CLEANUP_RAW_RESIDUE",
        );
        assert.equal(removed, false);
        assert.equal(existsSync(binding.path), true);
      } finally {
        rmSync(runnerTemp, { recursive: true, force: false });
      }
    },
  ],
  [
    "partial second-root creation failure cleans only the first and writes a truthful receipt",
    async () =>
      withRunTransactionWindowsOracle(
        async ({ controller, environment, minimumLeaf, repositoryRoot }) => {
          const callbacks = { runTool: 0, spawn: 0 };
          await assert.rejects(
            controller.runTransaction(repositoryRoot, environment, {
              arch: "arm64",
              parseHead: () => ORACLE_SOURCE_COMMIT,
              platform: "darwin",
              probeParent: async () => ({
                pgid: 9401,
                pid: 9401,
                ppid: 1,
                startTime: "Fri Nov 14 12:34:56 2026",
                title: PARENT_TITLE,
              }),
              rootFs: {
                mkdir: (path, options) => {
                  if (path.endsWith("fluyo-ios-minimum-9401-1"))
                    throw new Error("private-second-create");
                  mkdirSync(path, options);
                },
              },
              runTool: async () => ((callbacks.runTool += 1), assert.fail("unexpected tool")),
              signalTarget: new EventEmitter(),
              spawn: () => ((callbacks.spawn += 1), assert.fail("unexpected spawn")),
            }),
            (error) => error?.code === "PRECONDITION_ENV",
          );
          assert.deepEqual(callbacks, { runTool: 0, spawn: 0 });
          const receipt = controller.validateReceiptFile(repositoryRoot);
          assert.equal(receipt.state, "PRECONDITION_REJECTED");
          assert.equal(receipt.downloadInvocationCount, 0);
          assert.equal(receipt.cleanupResult, "NOT_REQUIRED");
          assert.equal(receipt.rawLogRetained, false);
          assert.equal(existsSync(minimumLeaf), false);
        },
      ),
  ],
  [
    "ordinary post-root precondition leaves both siblings and legacy parent absent",
    async () =>
      withRunTransactionWindowsOracle(
        async ({
          bootstrapLeaf,
          bootstrapParent,
          controller,
          environment,
          minimumLeaf,
          repositoryRoot,
        }) => {
          await assert.rejects(
            controller.runTransaction(repositoryRoot, environment, {
              arch: "arm64",
              parseHead: () => ORACLE_SOURCE_COMMIT,
              platform: "darwin",
              probeParent: async () => ({
                pgid: 9401,
                pid: 9401,
                ppid: 1,
                startTime: "Fri Nov 14 12:34:56 2026",
                title: PARENT_TITLE,
              }),
              runTool: async () => {
                throw new controller.BootstrapFailure("PRECONDITION_XCODE_VERSION_PROBE");
              },
              signalTarget: new EventEmitter(),
            }),
            (error) => error?.code === "PRECONDITION_XCODE_VERSION_PROBE",
          );
          assert.equal(existsSync(bootstrapLeaf), false);
          assert.equal(existsSync(minimumLeaf), false);
          assert.equal(existsSync(bootstrapParent), false);
          assert.equal(controller.validateReceiptFile(repositoryRoot).rawLogRetained, false);
        },
      ),
  ],
  [
    "clock precondition writes a canonical callback-free invocation-zero receipt",
    async () =>
      withRunTransactionWindowsOracle(async ({ controller, environment, repositoryRoot }) => {
        const callbacks = { parseHead: 0, probeParent: 0, runTool: 0, spawn: 0 };
        await assert.rejects(
          controller.runTransaction(repositoryRoot, environment, {
            now: () => {
              throw new Error("private-clock-detail");
            },
            parseHead: () => ((callbacks.parseHead += 1), ORACLE_SOURCE_COMMIT),
            probeParent: async () => (
              (callbacks.probeParent += 1),
              assert.fail("unexpected parent")
            ),
            runTool: async () => ((callbacks.runTool += 1), assert.fail("unexpected tool")),
            signalTarget: new EventEmitter(),
            spawn: () => ((callbacks.spawn += 1), assert.fail("unexpected spawn")),
          }),
          (error) => error?.code === "PRECONDITION_ENV",
        );
        assert.deepEqual(callbacks, { parseHead: 0, probeParent: 0, runTool: 0, spawn: 0 });
        const receipt = controller.validateReceiptFile(repositoryRoot);
        assert.equal(receipt.state, "PRECONDITION_REJECTED");
        assert.equal(receipt.primaryFailureCode, "PRECONDITION_ENV");
        assert.equal(receipt.downloadInvocationCount, 0);
        assert.equal(JSON.stringify(receipt).includes("private-clock-detail"), false);
      }),
  ],
  [
    "runner-root precondition writes a canonical callback-free invocation-zero receipt",
    async () =>
      withRunTransactionWindowsOracle(async ({ controller, environment, repositoryRoot }) => {
        const callbacks = { runTool: 0, spawn: 0 };
        const invalidEnvironment = Object.freeze({ ...environment, RUNNER_TEMP: "relative" });
        await assert.rejects(
          controller.runTransaction(repositoryRoot, invalidEnvironment, {
            arch: "arm64",
            parseHead: () => ORACLE_SOURCE_COMMIT,
            platform: "darwin",
            probeParent: async () => ({
              pgid: 9401,
              pid: 9401,
              ppid: 1,
              startTime: "Fri Nov 14 12:34:56 2026",
              title: PARENT_TITLE,
            }),
            runTool: async () => ((callbacks.runTool += 1), assert.fail("unexpected tool")),
            signalTarget: new EventEmitter(),
            spawn: () => ((callbacks.spawn += 1), assert.fail("unexpected spawn")),
          }),
          (error) => error?.code === "PRECONDITION_ENV",
        );
        assert.deepEqual(callbacks, { runTool: 0, spawn: 0 });
        const receipt = controller.validateReceiptFile(repositoryRoot);
        assert.equal(receipt.state, "PRECONDITION_REJECTED");
        assert.equal(receipt.downloadInvocationCount, 0);
        assert.equal(receipt.cleanupResult, "NOT_REQUIRED");
      }),
  ],
];
for (const [name, action] of v117Cases) test(`v1.1.17: ${name}`, action);

const diagnosticObservedCodes = new Set([
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
]);
const diagnosticReceipt = (primaryFailureCode, overrides = {}) =>
  testingReceipt({
    diagnosticMode: DIAGNOSTIC_MODE,
    observedVersion: diagnosticObservedCodes.has(primaryFailureCode)
      ? EXPECTED_XCODE_VERSION
      : null,
    observedBuild: diagnosticObservedCodes.has(primaryFailureCode) ? EXPECTED_XCODE_BUILD : null,
    state: "PRECONDITION_REJECTED",
    primaryFailureCode,
    cleanupFailureCode: "NONE",
    downloadInvocationCount: 0,
    downloadResult: "NOT_ATTEMPTED",
    minimumEvidenceResult: "NOT_RUN",
    cleanupResult: "NOT_REQUIRED",
    runtimeIdentifier: null,
    runtimeVersion: null,
    runtimeBuild: null,
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
    rawLogRetained: false,
    runtimeRetained: false,
    ...overrides,
  });

const diagnosticTransactionDependencies = (runTool) => ({
  arch: "arm64",
  now: () => 0,
  parseHead: () => ORACLE_SOURCE_COMMIT,
  platform: "darwin",
  probeParent: async () => ({
    pgid: 9401,
    pid: 9401,
    ppid: 1,
    startTime: "Fri Nov 14 12:34:56 2026",
    title: PARENT_TITLE,
  }),
  runTool,
  signalTarget: new EventEmitter(),
  spawn: () => assert.fail("unexpected spawn"),
});

const SIMCTL_FIND_TEST_PATH = "/Applications/Xcode_16.2.app/Contents/Developer/usr/bin/simctl";

const simctlFindIdentity = (pid) =>
  Object.freeze({
    pid,
    pgid: pid,
    ppid: 1,
    executable: "/Applications/Xcode_16.2.app/Contents/Developer/usr/bin/xcrun",
    startToken: "Fri Nov 14 12:34:56 2026",
    commandTokens: Object.freeze([
      "/Applications/Xcode_16.2.app/Contents/Developer/usr/bin/xcrun",
      "--find",
      "simctl",
    ]),
  });

const closeFakeChild = (child, code = 0, signal = null) => {
  child.exitCode = code;
  child.signalCode = signal;
  child.emit("close", code, signal);
};

const noSignalKill = (signals) => (pid, signal) => {
  if (signal === 0) throw esrch();
  signals.push([pid, signal]);
};

const immediateCloseTimeout = (callback, milliseconds) => {
  const timer = setTimeout(callback, milliseconds === CHILD_CLOSE_WAIT_MS ? 0 : 60_000);
  timer.unref?.();
  return timer;
};

const simctlShortLivedCases = [
  [
    "launch listeners capture delayed spawn and immediate output before PID inspection",
    async () => {
      const child = fakeChild(9501);
      const signals = [];
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          probeSimctlIdentity: async () => simctlFindIdentity(child.pid),
          kill: noSignalKill(signals),
          realpath: (value) => value,
        },
      );
      child.emit("spawn");
      child.stdout.write(`${SIMCTL_FIND_TEST_PATH}\n`);
      await new Promise((resolvePromise) => setImmediate(resolvePromise));
      closeFakeChild(child);
      assert.equal((await promise).stdout, `${SIMCTL_FIND_TEST_PATH}\n`);
      assert.deepEqual(signals, []);
    },
  ],
  [
    "async spawn error plus actual close maps only to SPAWN",
    async () => {
      const child = fakeChild(9502);
      const promise = testing.runSimctlFindV2({ cwd: "/", env: {} }, { spawn: () => child });
      child.emit("error", new Error("private"));
      closeFakeChild(child, null, null);
      await assert.rejects(promise, (error) => error?.code === "PRECONDITION_SIMCTL_FIND_SPAWN");
    },
  ],
  [
    "async spawn error without actual close is an unverified HOLD",
    async () => {
      const child = fakeChild(9503);
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        { spawn: () => child, setTimeout: immediateCloseTimeout },
      );
      child.emit("error", new Error("private"));
      await assert.rejects(
        promise,
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
    },
  ],
  [
    "spawned invalid PID waits for close and maps only to INVALID_PID",
    async () => {
      const child = fakeChild(0);
      const promise = testing.runSimctlFindV2({ cwd: "/", env: {} }, { spawn: () => child });
      child.emit("spawn");
      closeFakeChild(child);
      await assert.rejects(
        promise,
        (error) => error?.code === "PRECONDITION_SIMCTL_FIND_INVALID_PID",
      );
    },
  ],
  [
    "short-lived ps failure accepts exact settled success without signals",
    async () => {
      const child = fakeChild(9505);
      const signals = [];
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          probeSimctlIdentity: async () => {
            throw new Error("already closed");
          },
          kill: noSignalKill(signals),
          realpath: (value) => value,
        },
      );
      child.emit("spawn");
      child.stdout.end(`${SIMCTL_FIND_TEST_PATH}\n`);
      closeFakeChild(child);
      assert.equal((await promise).stdout, `${SIMCTL_FIND_TEST_PATH}\n`);
      assert.deepEqual(signals, []);
    },
  ],
  [
    "settled ps failure rejects a nonzero exit",
    async () => {
      const child = fakeChild(9506);
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          probeSimctlIdentity: async () => {
            throw new Error("already closed");
          },
          kill: noSignalKill([]),
        },
      );
      child.emit("spawn");
      closeFakeChild(child, 1);
      await assert.rejects(promise, (error) => error?.code === "PRECONDITION_SIMCTL_FIND_EXIT");
    },
  ],
  [
    "settled ps failure rejects invalid UTF-8",
    async () => {
      const child = fakeChild(9507);
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          probeSimctlIdentity: async () => {
            throw new Error("already closed");
          },
          kill: noSignalKill([]),
        },
      );
      child.emit("spawn");
      child.stdout.end(Buffer.from([0xff]));
      closeFakeChild(child);
      await assert.rejects(promise, (error) => error?.code === "PRECONDITION_SIMCTL_FIND_UTF8");
    },
  ],
  [
    "settled ps failure rejects a noncanonical simctl path",
    async () => {
      const child = fakeChild(9508);
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          probeSimctlIdentity: async () => {
            throw new Error("already closed");
          },
          kill: noSignalKill([]),
          realpath: (value) => value,
        },
      );
      child.emit("spawn");
      child.stdout.end("/tmp/simctl\n");
      closeFakeChild(child);
      await assert.rejects(promise, (error) => error?.code === "PRECONDITION_SIMCTL_FIND_PATH");
    },
  ],
  [
    "settled ps failure with surviving group is an unverified HOLD",
    async () => {
      const child = fakeChild(9509);
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          probeSimctlIdentity: async () => {
            throw new Error("already closed");
          },
          kill: () => true,
        },
      );
      child.emit("spawn");
      closeFakeChild(child);
      await assert.rejects(
        promise,
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
    },
  ],
  [
    "live ps failure without close is an unverified HOLD",
    async () => {
      const child = fakeChild(9510);
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          probeSimctlIdentity: async () => {
            throw new Error("live");
          },
          setTimeout: immediateCloseTimeout,
        },
      );
      child.emit("spawn");
      await assert.rejects(
        promise,
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
    },
  ],
  [
    "pending timeout without a qualifying launch is an unverified HOLD",
    async () => {
      const child = fakeChild(9511);
      const signals = [];
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          kill: noSignalKill(signals),
          setTimeout: (callback) => {
            const timer = setTimeout(callback, 0);
            timer.unref?.();
            return timer;
          },
        },
      );
      await assert.rejects(
        promise,
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
      assert.deepEqual(signals, []);
    },
  ],
  [
    "pending output cap without a qualifying launch is an unverified HOLD",
    async () => {
      const child = fakeChild(9512);
      const signals = [];
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          kill: noSignalKill(signals),
          setTimeout: immediateCloseTimeout,
        },
      );
      child.stdout.write(Buffer.alloc(4_097));
      await assert.rejects(
        promise,
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
      assert.deepEqual(signals, []);
    },
  ],
  [
    "pending abort rejects a late spawn without granting authority",
    async () => {
      const child = fakeChild(9513);
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          kill: noSignalKill([]),
        },
      );
      child.stdout.write(Buffer.alloc(4_097));
      await new Promise((resolvePromise) => setImmediate(resolvePromise));
      child.emit("spawn");
      await assert.rejects(
        promise,
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
    },
  ],
  [
    "pending timeout followed by error and actual close maps only to SPAWN",
    async () => {
      const child = fakeChild(9514);
      let timeoutCallback;
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          setTimeout: (callback, milliseconds) => {
            if (milliseconds === PROBE_TIMEOUT_MS) timeoutCallback = callback;
            const timer = setTimeout(() => {}, 60_000);
            timer.unref?.();
            return timer;
          },
        },
      );
      timeoutCallback();
      child.emit("error", new Error("private"));
      closeFakeChild(child, null, null);
      await assert.rejects(promise, (error) => error?.code === "PRECONDITION_SIMCTL_FIND_SPAWN");
    },
  ],
  [
    "pending output cap followed by close-before-spawn maps only to INVALID_PID",
    async () => {
      const child = fakeChild(9515);
      const promise = testing.runSimctlFindV2({ cwd: "/", env: {} }, { spawn: () => child });
      child.stdout.write(Buffer.alloc(4_097));
      closeFakeChild(child);
      await assert.rejects(
        promise,
        (error) => error?.code === "PRECONDITION_SIMCTL_FIND_INVALID_PID",
      );
    },
  ],
  [
    "settlement first then abort then late identity cannot restore safe success",
    async () => {
      const child = fakeChild(9516);
      const signals = [];
      let resolveIdentity;
      let timeoutCallback;
      let realpathCalls = 0;
      const identity = new Promise((resolveIdentityPromise) => {
        resolveIdentity = resolveIdentityPromise;
      });
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          probeSimctlIdentity: () => identity,
          kill: noSignalKill(signals),
          realpath: (value) => {
            realpathCalls += 1;
            return value;
          },
          setTimeout: (callback, milliseconds) => {
            if (milliseconds === PROBE_TIMEOUT_MS) timeoutCallback = callback;
            const timer = setTimeout(() => {}, 60_000);
            timer.unref?.();
            return timer;
          },
        },
      );
      child.emit("spawn");
      child.stdout.end(`${SIMCTL_FIND_TEST_PATH}\n`);
      closeFakeChild(child);
      await new Promise((resolvePromise) => setImmediate(resolvePromise));
      timeoutCallback();
      resolveIdentity(simctlFindIdentity(child.pid));
      await assert.rejects(promise, (error) => error?.code === "PRECONDITION_SIMCTL_FIND_TIMEOUT");
      assert.equal(realpathCalls, 0);
      assert.deepEqual(signals, []);
    },
  ],
  ...[
    ["TIMEOUT", "PRECONDITION_SIMCTL_FIND_TIMEOUT"],
    ["OUTPUT_LIMIT", "PRECONDITION_SIMCTL_FIND_OUTPUT_LIMIT"],
    ["CANCELLED", "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD"],
  ].map(([reason, expected]) => [
    `spawned preidentity ${reason.toLowerCase()} cannot restore READY`,
    async () => {
      const child = fakeChild(9520 + reason.length);
      const signalTarget = new EventEmitter();
      const signals = [];
      let rejectIdentity;
      let timeoutCallback;
      const identity = new Promise((_resolveIdentityPromise, rejectIdentityPromise) => {
        rejectIdentity = rejectIdentityPromise;
      });
      const promise = testing.runSimctlFindV2(
        { cwd: "/", env: {} },
        {
          spawn: () => child,
          probeSimctlIdentity: () => identity,
          kill: noSignalKill(signals),
          signalTarget,
          setTimeout: (callback, milliseconds) => {
            if (milliseconds === PROBE_TIMEOUT_MS) timeoutCallback = callback;
            const timer = setTimeout(() => {}, 60_000);
            timer.unref?.();
            return timer;
          },
        },
      );
      child.emit("spawn");
      await new Promise((resolvePromise) => setImmediate(resolvePromise));
      rejectIdentity(new Error("private identity failure"));
      await new Promise((resolvePromise) => setImmediate(resolvePromise));
      if (reason === "TIMEOUT") timeoutCallback();
      else if (reason === "OUTPUT_LIMIT") child.stdout.write(Buffer.alloc(4_097));
      else signalTarget.emit("SIGINT");
      closeFakeChild(child);
      await assert.rejects(promise, (error) => error?.code === expected);
      assert.deepEqual(signals, []);
    },
  ]),
];
assert.equal(simctlShortLivedCases.length, 19);

const diagnosticCodes = [
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
];

const diagnosticCases = [
  [
    "mode is exact",
    () => assert.equal(DIAGNOSTIC_MODE, "PR94_IOS_XCODE_PRECONDITION_DIAGNOSTIC_V1_2"),
  ],
  [
    "probe set is exact",
    () =>
      assert.deepEqual(
        [...testing.XCODE_PROBE_FAILURE_CODES],
        ["PRECONDITION_XCODE_VERSION_PROBE"],
      ),
  ],
  [
    "diagnostic set is exact and ordered",
    () => assert.deepEqual([...testing.XCODE_DIAGNOSTIC_FAILURE_CODES], diagnosticCodes),
  ],
  [
    "receipt schema v2 fields are ordered",
    () =>
      assert.deepEqual(testing.RECEIPT_FIELDS.slice(9, 14), [
        "diagnosticMode",
        "expectedVersion",
        "expectedBuild",
        "observedVersion",
        "observedBuild",
      ]),
  ],
  [
    "generic Xcode precondition code is absent",
    () => assert.equal(testing.PRIMARY_FAILURE_CODES.has("PRECONDITION_XCODE"), false),
  ],
  [
    "diagnostic stage fallbacks are exact",
    () =>
      assert.deepEqual(
        Object.fromEntries(
          ["XCODE_VERSION_PROBE", "XCODE_VERSION_PARSE", "SIMCTL_FIND_V2", "SIMCTL_FIND_PATH"].map(
            (stage) => [stage, testing.PRECONDITION_STAGE_FAILURE[stage]],
          ),
        ),
        {
          XCODE_VERSION_PROBE: "PRECONDITION_XCODE_VERSION_INTERNAL",
          XCODE_VERSION_PARSE: "PRECONDITION_XCODE_VERSION_INTERNAL",
          SIMCTL_FIND_V2: "PRECONDITION_SIMCTL_FIND_INTERNAL",
          SIMCTL_FIND_PATH: "PRECONDITION_SIMCTL_FIND_INTERNAL",
        },
      ),
  ],
  ...diagnosticCodes.map((code) => [
    `receipt validates closed row ${code}`,
    () => assert.equal(validateReceipt(diagnosticReceipt(code)).primaryFailureCode, code),
  ]),
  [
    "diagnostic receipt rejects invocation one",
    () =>
      throwsCode(
        () =>
          validateReceipt(diagnosticReceipt(diagnosticCodes[0], { downloadInvocationCount: 1 })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "diagnostic receipt rejects a cleanup result",
    () =>
      throwsCode(
        () =>
          validateReceipt(diagnosticReceipt(diagnosticCodes[0], { cleanupResult: "SUCCEEDED" })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "diagnostic receipt rejects runtime evidence",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            diagnosticReceipt(diagnosticCodes[0], {
              runtimeIdentifier: "com.apple.CoreSimulator.SimRuntime.iOS-17-5",
              runtimeVersion: "17.5",
              runtimeBuild: "21F79",
            }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "diagnostic receipt rejects disk evidence",
    () =>
      throwsCode(
        () => validateReceipt(diagnosticReceipt(diagnosticCodes[0], { freeBytesBefore: 0 })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "diagnostic receipt rejects retained raw output",
    () =>
      throwsCode(
        () => validateReceipt(diagnosticReceipt(diagnosticCodes[0], { rawLogRetained: true })),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "diagnostic receipt rejects wrong expected tuple",
    () => {
      throwsCode(
        () => validateReceipt(diagnosticReceipt(diagnosticCodes[0], { expectedVersion: "16.3" })),
        "RECEIPT_INVALID",
      );
      throwsCode(
        () => validateReceipt(diagnosticReceipt(diagnosticCodes[0], { expectedBuild: "other" })),
        "RECEIPT_INVALID",
      );
    },
  ],
  [
    "diagnostic receipt rejects wrong observed tuple",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            diagnosticReceipt("PRECONDITION_SIMCTL_FIND_PATH", { observedVersion: "16.3" }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "diagnostic receipt rejects partial observations",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            diagnosticReceipt("PRECONDITION_SIMCTL_FIND_PATH", { observedBuild: null }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "normal receipt rejects diagnostic failure code",
    () =>
      throwsCode(
        () =>
          validateReceipt(
            testingReceipt({
              state: "PRECONDITION_REJECTED",
              primaryFailureCode: "PRECONDITION_XCODE_VERSION_PROBE",
              downloadInvocationCount: 0,
              downloadResult: "NOT_ATTEMPTED",
              minimumEvidenceResult: "NOT_RUN",
              cleanupResult: "NOT_REQUIRED",
              observedVersion: null,
              observedBuild: null,
              runtimeIdentifier: null,
              runtimeVersion: null,
              runtimeBuild: null,
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
            }),
          ),
        "RECEIPT_INVALID",
      ),
  ],
  [
    "normal precondition keeps observations null",
    () =>
      assert.equal(
        validateReceipt(diagnosticReceipt("PRECONDITION_ENV", { diagnosticMode: null }))
          .diagnosticMode,
        null,
      ),
  ],
  [
    "normal invocation one requires exact observations",
    () => {
      assert.equal(validateReceipt(testingReceipt()).observedVersion, EXPECTED_XCODE_VERSION);
      throwsCode(
        () => validateReceipt(testingReceipt({ observedVersion: null, observedBuild: null })),
        "RECEIPT_INVALID",
      );
    },
  ],
  [
    "version probe code is preserved by safe spawn failure",
    async () =>
      assert.rejects(
        testing.runCaptured(
          "/tool",
          [],
          { cwd: "/", env: {} },
          {
            timeout: 1,
            stdout: 1,
            stderr: 1,
            timeoutCode: "PRECONDITION_XCODE_VERSION_PROBE",
            outputCode: "PRECONDITION_XCODE_VERSION_PROBE",
            exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
            diagnosticCode: "PRECONDITION_XCODE_VERSION_PROBE",
          },
          {
            spawn: () => {
              throw new Error("private");
            },
          },
        ),
        (error) =>
          error?.code === "PRECONDITION_XCODE_VERSION_PROBE" && !error.message.includes("private"),
      ),
  ],
  [
    "retired generic simctl probe code is rejected",
    async () =>
      assert.rejects(
        testing.runCaptured(
          "/tool",
          [],
          { cwd: "/", env: {} },
          {
            timeout: 1,
            stdout: 1,
            stderr: 1,
            timeoutCode: "PRECONDITION_SIMCTL_FIND_PROBE",
            outputCode: "PRECONDITION_SIMCTL_FIND_PROBE",
            exitCode: "PRECONDITION_SIMCTL_FIND_PROBE",
            diagnosticCode: "PRECONDITION_SIMCTL_FIND_PROBE",
          },
          {
            spawn: () => {
              throw new Error("private");
            },
          },
        ),
        (error) => error instanceof TypeError && error.message === "invalid diagnostic probe code",
      ),
  ],
  [
    "v1.2 simctl profile binds exact executable and argv",
    () => {
      assert.match(controllerSource, /const SIMCTL_FIND_PROFILE = "SIMCTL_FIND_V2";/u);
      assert.match(
        controllerSource,
        /const SIMCTL_FIND_TOKENS = Object\.freeze\(\[XCRUN, "--find", "simctl"\]\);/u,
      );
      assert.doesNotMatch(controllerSource, /diagnosticCode: "PRECONDITION_SIMCTL_FIND/u);
    },
  ],
  [
    "v1.2 simctl synchronous spawn maps only to SPAWN",
    async () =>
      assert.rejects(
        testing.runSimctlFindV2(
          { cwd: "/", env: {} },
          {
            spawn: () => {
              throw new Error("private");
            },
          },
        ),
        (error) =>
          error?.code === "PRECONDITION_SIMCTL_FIND_SPAWN" && !error.message.includes("private"),
      ),
  ],
  [
    "v1.2 removes the retired generic code from receipt authority",
    () => {
      assert.equal(testing.PRIMARY_FAILURE_CODES.has("PRECONDITION_SIMCTL_FIND_PROBE"), false);
      throwsCode(
        () =>
          validateReceipt(
            diagnosticReceipt("PRECONDITION_SIMCTL_FIND_PROBE", {
              observedVersion: EXPECTED_XCODE_VERSION,
              observedBuild: EXPECTED_XCODE_BUILD,
            }),
          ),
        "RECEIPT_INVALID",
      );
    },
  ],
  ...simctlShortLivedCases,
  [
    "diagnostic probe preserves live unverified HOLD",
    async () => {
      const child = fakeChild(9402);
      await assert.rejects(
        testing.runCaptured(
          "/tool",
          [],
          { cwd: "/", env: {} },
          {
            timeout: 2_000,
            stdout: 1,
            stderr: 1,
            timeoutCode: "PRECONDITION_XCODE_VERSION_PROBE",
            outputCode: "PRECONDITION_XCODE_VERSION_PROBE",
            exitCode: "PRECONDITION_XCODE_VERSION_PROBE",
            diagnosticCode: "PRECONDITION_XCODE_VERSION_PROBE",
          },
          {
            spawn: () => child,
            probeIdentity: async () => {
              throw new Error("private");
            },
          },
        ),
        (error) => error?.code === "PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD",
      );
    },
  ],
  [
    "wrong Xcode tuple writes parse receipt with null observation",
    async () =>
      withRunTransactionWindowsOracle(async ({ controller, environment, repositoryRoot }) => {
        await assert.rejects(
          controller.runTransaction(
            repositoryRoot,
            environment,
            diagnosticTransactionDependencies(async () => ({
              stdout: "Xcode 16.3\nBuild version private\n",
              stderr: "",
            })),
          ),
          (error) => error?.code === "PRECONDITION_XCODE_VERSION_PARSE",
        );
        const receipt = controller.validateReceiptFile(repositoryRoot);
        assert.equal(receipt.observedVersion, null);
        assert.equal(receipt.observedBuild, null);
      }),
  ],
  [
    "raw version-stage failure writes internal receipt",
    async () =>
      withRunTransactionWindowsOracle(async ({ controller, environment, repositoryRoot }) => {
        await assert.rejects(
          controller.runTransaction(
            repositoryRoot,
            environment,
            diagnosticTransactionDependencies(async () => {
              throw new Error("private");
            }),
          ),
          (error) => error?.code === "PRECONDITION_XCODE_VERSION_INTERNAL",
        );
        const receipt = controller.validateReceiptFile(repositoryRoot);
        assert.equal(receipt.primaryFailureCode, "PRECONDITION_XCODE_VERSION_INTERNAL");
        assert.equal(JSON.stringify(receipt).includes("private"), false);
      }),
  ],
  [
    "raw simctl-stage failure keeps exact observed tuple",
    async () =>
      withRunTransactionWindowsOracle(async ({ controller, environment, repositoryRoot }) => {
        let call = 0;
        await assert.rejects(
          controller.runTransaction(
            repositoryRoot,
            environment,
            diagnosticTransactionDependencies(async () => {
              if (call++ === 0)
                return { stdout: "Xcode 16.2\nBuild version 16C5032a\n", stderr: "" };
              throw new Error("private");
            }),
          ),
          (error) => error?.code === "PRECONDITION_SIMCTL_FIND_INTERNAL",
        );
        const receipt = controller.validateReceiptFile(repositoryRoot);
        assert.equal(receipt.observedVersion, EXPECTED_XCODE_VERSION);
        assert.equal(receipt.observedBuild, EXPECTED_XCODE_BUILD);
      }),
  ],
  [
    "ready receipt stops before runtime inventory and acquisition",
    async () =>
      withRunTransactionWindowsOracle(
        async ({ controller, environment, repositoryRoot, simctlPath }) => {
          let call = 0;
          await assert.rejects(
            controller.runTransaction(
              repositoryRoot,
              environment,
              diagnosticTransactionDependencies(async () => {
                call += 1;
                return call === 1
                  ? { stdout: "Xcode 16.2\nBuild version 16C5032a\n", stderr: "" }
                  : { stdout: `${simctlPath}\n`, stderr: "" };
              }),
            ),
            (error) => error?.code === "PRECONDITION_XCODE_DIAGNOSTIC_READY",
          );
          assert.equal(call, 2);
          const receipt = controller.validateReceiptFile(repositoryRoot);
          assert.equal(receipt.downloadInvocationCount, 0);
          assert.equal(receipt.primaryFailureCode, "PRECONDITION_XCODE_DIAGNOSTIC_READY");
        },
      ),
  ],
  [
    "diagnostic receipt never serializes raw output or paths",
    () => {
      const serialized = JSON.stringify(diagnosticReceipt("PRECONDITION_SIMCTL_FIND_PATH"));
      assert.equal(serialized.includes("stdout"), false);
      assert.equal(serialized.includes("stderr"), false);
      assert.equal(serialized.includes("/Applications/"), false);
    },
  ],
  [
    "diagnostic receipt accepts only the closed clean and cleanup-failure rows",
    () => {
      for (const code of diagnosticCodes) {
        assert.equal(validateReceipt(diagnosticReceipt(code)).primaryFailureCode, code);
        assert.equal(
          validateReceipt(
            diagnosticReceipt(code, {
              state: "CLEANUP_FAILED",
              cleanupFailureCode: "CLEANUP_RAW_RESIDUE",
              cleanupResult: "FAILED",
              rawLogRetained: true,
            }),
          ).primaryFailureCode,
          code,
        );
      }
      for (const overrides of [
        { state: "ACQUIRE_FAILED_CLEAN" },
        { cleanupFailureCode: "CLEANUP_RESIDUE" },
        { cleanupResult: "SUCCEEDED" },
        { rawLogRetained: false },
        { downloadInvocationCount: 1 },
        { runtimeIdentifier: "com.apple.CoreSimulator.SimRuntime.iOS-17-5" },
        { freeBytesBefore: 0 },
        { fallbackUsed: true },
      ]) {
        throwsCode(
          () =>
            validateReceipt(
              diagnosticReceipt(diagnosticCodes[0], {
                state: "CLEANUP_FAILED",
                cleanupFailureCode: "CLEANUP_RAW_RESIDUE",
                cleanupResult: "FAILED",
                rawLogRetained: true,
                ...overrides,
              }),
            ),
          "RECEIPT_INVALID",
        );
      }
    },
  ],
  [
    "owned-root cleanup failure preserves the diagnostic primary and truthful residue",
    async () =>
      withRunTransactionWindowsOracle(
        async ({ bootstrapLeaf, controller, environment, minimumLeaf, repositoryRoot }) => {
          const callbacks = { remove: 0, runTool: 0, spawn: 0 };
          await assert.rejects(
            controller.runTransaction(repositoryRoot, environment, {
              ...diagnosticTransactionDependencies(async () => {
                callbacks.runTool += 1;
                throw new controller.BootstrapFailure("PRECONDITION_XCODE_VERSION_PROBE");
              }),
              rootFs: {
                remove: () => {
                  callbacks.remove += 1;
                  throw new Error("private-cleanup-detail");
                },
              },
              spawn: () => {
                callbacks.spawn += 1;
                assert.fail("unexpected spawn");
              },
            }),
            (error) => error?.code === "CLEANUP_RAW_RESIDUE",
          );
          assert.deepEqual(callbacks, { remove: 1, runTool: 1, spawn: 0 });
          const receipt = controller.validateReceiptFile(repositoryRoot);
          assert.equal(receipt.state, "CLEANUP_FAILED");
          assert.equal(receipt.primaryFailureCode, "PRECONDITION_XCODE_VERSION_PROBE");
          assert.equal(receipt.cleanupFailureCode, "CLEANUP_RAW_RESIDUE");
          assert.equal(receipt.cleanupResult, "FAILED");
          assert.equal(receipt.rawLogRetained, true);
          assert.equal(receipt.downloadInvocationCount, 0);
          assert.equal(receipt.downloadResult, "NOT_ATTEMPTED");
          assert.equal(receipt.minimumEvidenceResult, "NOT_RUN");
          assert.equal(receipt.runtimeRetained, false);
          assert.equal(receipt.fallbackUsed, false);
          assert.equal(existsSync(bootstrapLeaf), true);
          assert.equal(existsSync(minimumLeaf), true);
          const serialized = JSON.stringify(receipt);
          for (const privateValue of [
            "private-cleanup-detail",
            bootstrapLeaf,
            minimumLeaf,
            String(process.pid),
            "RUNNER_TEMP",
          ]) {
            assert.equal(serialized.includes(privateValue), false);
          }
          rmSync(minimumLeaf, { recursive: true, force: false });
          rmSync(bootstrapLeaf, { recursive: true, force: false });
        },
      ),
  ],
];
assert.equal(diagnosticCases.length, 62);
for (const [name, action] of diagnosticCases) test(`diagnostic v1.2: ${name}`, action);
