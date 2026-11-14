import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync } from "node:fs";
import { resolve } from "node:path";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";

import { bindTestPythonEnvironment } from "./test-python-binding.mjs";

const MODULE_PATH = fileURLToPath(import.meta.url);
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const R4B_GIT_OUTPUT_CAP_BYTES = 1_048_576;
export const R4B_PHASE_TEST = "scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs";
export const R4B_REVIEWED_LOCAL_TEST =
  "scripts/r4b-evidence/reviewed-local-python-transaction.test.mjs";
export const R4B_LANE_TEST_PATH_KINDS = Object.freeze(
  [
    [R4B_PHASE_TEST, "regular"],
    [R4B_REVIEWED_LOCAL_TEST, "regular"],
  ].map((row) => Object.freeze(row)),
);
export const R4B_LANE_LIFECYCLE_STATES = Object.freeze(
  [
    ["A", "100", "001"],
    ["B", "110", "010"],
    ["C", "100", "100"],
    ["D", "110", "110"],
  ].map((row) => Object.freeze(row)),
);
export const R4B_LANE_INVENTORY_SHA256 =
  "dcb968f685a4c7c2b271a2d32d7d2f7c3765f34e8c531831e932e1e3f9b5a1f5";
export const R4B_OUT_OF_SCOPE_UNTRACKED_SHA256 =
  "8d875d47149a98760b795907131676b4c334652a679ebe97645c942eae32b3bc";

export const PORTABLE_R4B_TESTS = Object.freeze([
  "scripts/r4b-evidence/core.test.mjs",
  "scripts/r4b-evidence/nvda-adapter/protocol.test.mjs",
  "scripts/r4b-evidence/preflight-attempts.test.mjs",
  "scripts/r4b-evidence/preflight-contracts.test.mjs",
  "scripts/r4b-evidence/preflight-executor.test.mjs",
  "scripts/r4b-evidence/preflight-observer.test.mjs",
  "scripts/r4b-evidence/preflight-plan.test.mjs",
  "scripts/r4b-evidence/preflight-png.test.mjs",
  "scripts/r4b-evidence/production-exclusion.test.mjs",
  "scripts/r4b-evidence/reviewed-local-python-transaction.test.mjs",
  "scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs",
  "scripts/r4b-evidence/transition.test.mjs",
]);

export const WINDOWS_NATIVE_R4B_TESTS = Object.freeze([
  "scripts/r4b-evidence/fixed-root-guard.test.mjs",
  "scripts/r4b-evidence/preflight-build.test.mjs",
  "scripts/r4b-evidence/preflight-process-owner.test.mjs",
  "scripts/r4b-evidence/windows-native-boundary.test.mjs",
  "scripts/r4b-evidence/windows-native-test-journal-runner.test.mjs",
]);

export const OUT_OF_SCOPE_UNTRACKED_R4B_TESTS = Object.freeze([
  "scripts/r4b-evidence/root-only-closure-ntfs-build-provenance.test.mjs",
  "scripts/r4b-evidence/root-only-closure-ntfs.test.mjs",
  "scripts/r4b-evidence/root-only-closure-plan.generator.test.mjs",
  "scripts/r4b-evidence/root-only-closure-tar.test.mjs",
  "scripts/r4b-evidence/root-only-closure-verifier.test.mjs",
  "scripts/r4b-evidence/root-only-install-authority.test.mjs",
  "scripts/r4b-evidence/root-only-install-controller.test.mjs",
  "scripts/r4b-evidence/root-only-output-broker.test.mjs",
]);

const TRACKED_GIT_ARGUMENTS = Object.freeze([
  "-c",
  "core.quotepath=false",
  "ls-tree",
  "-r",
  "-z",
  "--name-only",
  "HEAD",
  "--",
  "scripts/r4b-evidence",
]);
const STAGED_GIT_ARGUMENTS = Object.freeze([
  "-c",
  "core.quotepath=false",
  "diff",
  "--cached",
  "--name-status",
  "-z",
  "--no-renames",
  "--",
  "scripts/r4b-evidence",
]);
const UNTRACKED_GIT_ARGUMENTS = Object.freeze([
  "-c",
  "core.quotepath=false",
  "ls-files",
  "-z",
  "--others",
  "--exclude-standard",
  "--",
  "scripts/r4b-evidence",
]);
const LANE_PATHS = Object.freeze([...PORTABLE_R4B_TESTS, ...WINDOWS_NATIVE_R4B_TESTS]);
const LANE_PATH_SET = new Set(LANE_PATHS);
const EXCLUSION_SET = new Set(OUT_OF_SCOPE_UNTRACKED_R4B_TESTS);
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

function fixedError(code) {
  throw new Error(code);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function exactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype &&
    JSON.stringify(Object.keys(value)) === JSON.stringify(keys)
  );
}

function validatePath(path) {
  if (
    path !== path.normalize("NFC") ||
    path.includes("\\") ||
    /\p{Cc}/u.test(path) ||
    !path.startsWith("scripts/r4b-evidence/") ||
    path.startsWith("/") ||
    /^[A-Za-z]:/u.test(path) ||
    path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  )
    fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
}

export function decodeGitTestPaths(result) {
  if (
    !exactKeys(result, ["status", "errorCode", "stdout", "stderr"]) ||
    !(Number.isInteger(result.status) || result.status === null) ||
    ![null, "ENOBUFS", "OTHER"].includes(result.errorCode) ||
    !Buffer.isBuffer(result.stdout) ||
    !Buffer.isBuffer(result.stderr)
  )
    fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
  if (result.errorCode === "ENOBUFS") fixedError("R4B_LANE_GIT_OUTPUT_LIMIT");
  if (result.stdout.byteLength + result.stderr.byteLength > R4B_GIT_OUTPUT_CAP_BYTES)
    fixedError("R4B_LANE_GIT_OUTPUT_LIMIT");
  if (result.errorCode === "OTHER" || result.status !== 0 || result.stderr.byteLength !== 0)
    fixedError("R4B_LANE_GIT_FAILURE");
  if (result.stdout.byteLength === 0) return Object.freeze([]);
  if (result.stdout.at(-1) !== 0) fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
  let decoded;
  try {
    decoded = UTF8_DECODER.decode(result.stdout);
  } catch {
    fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
  }
  const paths = decoded.slice(0, -1).split("\0");
  if (paths.some((path) => path.length === 0)) fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
  for (const path of paths) validatePath(path);
  for (let index = 1; index < paths.length; index += 1) {
    if (
      Buffer.compare(Buffer.from(paths[index - 1], "utf8"), Buffer.from(paths[index], "utf8")) >= 0
    )
      fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
  }
  return Object.freeze(paths.filter((path) => path.endsWith(".test.mjs")));
}

export function decodeGitStagedTestPaths(result) {
  if (
    !exactKeys(result, ["status", "errorCode", "stdout", "stderr"]) ||
    !(Number.isInteger(result.status) || result.status === null) ||
    ![null, "ENOBUFS", "OTHER"].includes(result.errorCode) ||
    !Buffer.isBuffer(result.stdout) ||
    !Buffer.isBuffer(result.stderr)
  )
    fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
  if (result.errorCode === "ENOBUFS") fixedError("R4B_LANE_GIT_OUTPUT_LIMIT");
  if (result.stdout.byteLength + result.stderr.byteLength > R4B_GIT_OUTPUT_CAP_BYTES)
    fixedError("R4B_LANE_GIT_OUTPUT_LIMIT");
  if (result.errorCode === "OTHER" || result.status !== 0 || result.stderr.byteLength !== 0)
    fixedError("R4B_LANE_GIT_FAILURE");
  if (result.stdout.byteLength === 0) return Object.freeze([]);
  if (result.stdout.at(-1) !== 0) fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
  let decoded;
  try {
    decoded = UTF8_DECODER.decode(result.stdout);
  } catch {
    fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
  }
  const tokens = decoded.slice(0, -1).split("\0");
  const paths = [];
  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++];
    if (/^[CR]\d{1,3}$/u.test(status)) fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
    if (!["A", "M", "D", "T", "U", "X", "B"].includes(status) || index >= tokens.length)
      fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
    const path = tokens[index++];
    if (path.length === 0) fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
    validatePath(path);
    if (["D", "T", "U", "X", "B"].includes(status)) fixedError("R4B_LANE_INVENTORY_MISMATCH");
    if (paths.includes(path)) fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
    paths.push(path);
  }
  for (let index = 1; index < paths.length; index += 1) {
    if (
      Buffer.compare(Buffer.from(paths[index - 1], "utf8"), Buffer.from(paths[index], "utf8")) >= 0
    )
      fixedError("R4B_LANE_GIT_OUTPUT_MALFORMED");
  }
  return Object.freeze(paths.filter((path) => path.endsWith(".test.mjs")));
}

function normalizeGitResult(result) {
  return {
    status: Number.isInteger(result?.status) ? result.status : null,
    errorCode: result?.error ? (result.error.code === "ENOBUFS" ? "ENOBUFS" : "OTHER") : null,
    stdout: Buffer.isBuffer(result?.stdout) ? result.stdout : Buffer.alloc(0),
    stderr: Buffer.isBuffer(result?.stderr) ? result.stderr : Buffer.alloc(0),
  };
}

function fixedGitRunner(arguments_) {
  try {
    return normalizeGitResult(
      spawnSync("git", arguments_, {
        cwd: ROOT,
        encoding: null,
        maxBuffer: R4B_GIT_OUTPUT_CAP_BYTES,
        shell: false,
        windowsHide: true,
      }),
    );
  } catch {
    fixedError("R4B_LANE_GIT_FAILURE");
  }
}

export function collectGitTestSnapshotWithRunner(runGit) {
  if (typeof runGit !== "function") fixedError("R4B_LANE_GIT_FAILURE");
  let trackedResult;
  let stagedResult;
  let untrackedResult;
  try {
    trackedResult = runGit([...TRACKED_GIT_ARGUMENTS]);
    stagedResult = runGit([...STAGED_GIT_ARGUMENTS]);
    untrackedResult = runGit([...UNTRACKED_GIT_ARGUMENTS]);
  } catch {
    fixedError("R4B_LANE_GIT_FAILURE");
  }
  return Object.freeze({
    trackedTestPaths: decodeGitTestPaths(trackedResult),
    stagedTestPaths: decodeGitStagedTestPaths(stagedResult),
    untrackedTestPaths: decodeGitTestPaths(untrackedResult),
  });
}

export const r4bLaneSnapshotTesting = Object.freeze({
  decodeGitTestPaths,
  decodeGitStagedTestPaths,
  collectGitTestSnapshotWithRunner,
});

function assertCanonicalLane(paths, expectedCount) {
  if (paths.length !== expectedCount || JSON.stringify(paths) !== JSON.stringify([...paths].sort()))
    fixedError("R4B_LANE_INVENTORY_MISMATCH");
}

export function validateR4bTestLaneInventorySnapshot(snapshot) {
  if (
    !exactKeys(snapshot, [
      "trackedTestPaths",
      "stagedTestPaths",
      "untrackedTestPaths",
      "testPathKinds",
    ])
  )
    fixedError("R4B_LANE_INVENTORY_MISMATCH");
  if (
    !Array.isArray(snapshot.testPathKinds) ||
    JSON.stringify(snapshot.testPathKinds) !== JSON.stringify(R4B_LANE_TEST_PATH_KINDS)
  )
    fixedError("R4B_LANE_PHASE_TEST_NONREGULAR");
  if (
    !Array.isArray(snapshot.trackedTestPaths) ||
    !Array.isArray(snapshot.stagedTestPaths) ||
    !Array.isArray(snapshot.untrackedTestPaths)
  )
    fixedError("R4B_LANE_INVENTORY_MISMATCH");
  assertCanonicalLane(PORTABLE_R4B_TESTS, 12);
  assertCanonicalLane(WINDOWS_NATIVE_R4B_TESTS, 5);
  const portable = new Set(PORTABLE_R4B_TESTS);
  const windowsNative = new Set(WINDOWS_NATIVE_R4B_TESTS);
  if (portable.size !== PORTABLE_R4B_TESTS.length) fixedError("R4B_LANE_INVENTORY_MISMATCH");
  if (windowsNative.size !== WINDOWS_NATIVE_R4B_TESTS.length)
    fixedError("R4B_LANE_INVENTORY_MISMATCH");
  const overlap = [...portable].filter((path) => windowsNative.has(path));
  if (overlap.length) {
    fixedError("R4B_LANE_INVENTORY_MISMATCH");
  }
  if (
    sha256(
      JSON.stringify({ portable: PORTABLE_R4B_TESTS, windowsNative: WINDOWS_NATIVE_R4B_TESTS }),
    ) !== R4B_LANE_INVENTORY_SHA256 ||
    sha256(JSON.stringify(OUT_OF_SCOPE_UNTRACKED_R4B_TESTS)) !== R4B_OUT_OF_SCOPE_UNTRACKED_SHA256
  )
    fixedError("R4B_LANE_INVENTORY_MISMATCH");
  const tracked = snapshot.trackedTestPaths;
  const staged = snapshot.stagedTestPaths;
  const untracked = snapshot.untrackedTestPaths;
  for (const paths of [tracked, staged, untracked]) {
    if (
      paths.some((path) => typeof path !== "string") ||
      new Set(paths).size !== paths.length ||
      JSON.stringify(paths) !== JSON.stringify([...paths].sort())
    )
      fixedError("R4B_LANE_INVENTORY_MISMATCH");
  }
  if (tracked.some((path) => EXCLUSION_SET.has(path))) fixedError("R4B_LANE_INVENTORY_MISMATCH");
  if (tracked.some((path) => !LANE_PATH_SET.has(path))) fixedError("R4B_LANE_INVENTORY_MISMATCH");
  if (staged.some((path) => EXCLUSION_SET.has(path) || !LANE_PATH_SET.has(path)))
    fixedError("R4B_LANE_INVENTORY_MISMATCH");
  if (untracked.some((path) => path !== R4B_REVIEWED_LOCAL_TEST && !EXCLUSION_SET.has(path)))
    fixedError("R4B_LANE_INVENTORY_MISMATCH");
  const phaseLocations = [
    tracked.includes(R4B_PHASE_TEST),
    staged.includes(R4B_PHASE_TEST),
    untracked.includes(R4B_PHASE_TEST),
  ].map((present) => (present ? "1" : "0"));
  const reviewedLocations = [
    tracked.includes(R4B_REVIEWED_LOCAL_TEST),
    staged.includes(R4B_REVIEWED_LOCAL_TEST),
    untracked.includes(R4B_REVIEWED_LOCAL_TEST),
  ].map((present) => (present ? "1" : "0"));
  const phaseState = phaseLocations.join("");
  const reviewedState = reviewedLocations.join("");
  if (
    !["100", "110"].includes(phaseState) ||
    !["001", "010", "100", "110"].includes(reviewedState) ||
    !R4B_LANE_LIFECYCLE_STATES.some(
      ([, expectedPhase, expectedReviewed]) =>
        expectedPhase === phaseState && expectedReviewed === reviewedState,
    )
  )
    fixedError("R4B_LANE_INVENTORY_MISMATCH");
  for (const path of LANE_PATHS) {
    if (path === R4B_PHASE_TEST || path === R4B_REVIEWED_LOCAL_TEST) continue;
    if (!tracked.includes(path) || staged.includes(path) || untracked.includes(path))
      fixedError("R4B_LANE_INVENTORY_MISMATCH");
  }
  const phasePaths = [...new Set([...tracked, ...staged, ...untracked])].filter((path) =>
    LANE_PATH_SET.has(path),
  );
  if (
    phasePaths.length !== LANE_PATHS.length ||
    JSON.stringify([...phasePaths].sort()) !== JSON.stringify([...LANE_PATHS].sort())
  )
    fixedError("R4B_LANE_INVENTORY_MISMATCH");
  return Object.freeze({
    portable: 12,
    windowsNative: 5,
    total: 17,
    inventorySha256: R4B_LANE_INVENTORY_SHA256,
    outOfScopeUntrackedSha256: R4B_OUT_OF_SCOPE_UNTRACKED_SHA256,
  });
}

export function validateR4bTestLaneInventory() {
  const testPathKinds = [];
  try {
    for (const [path] of R4B_LANE_TEST_PATH_KINDS) {
      const metadata = lstatSync(resolve(ROOT, path));
      testPathKinds.push([
        path,
        metadata.isFile() && !metadata.isSymbolicLink() ? "regular" : "nonregular",
      ]);
    }
  } catch {
    fixedError("R4B_LANE_PHASE_TEST_NONREGULAR");
  }
  const gitSnapshot = collectGitTestSnapshotWithRunner(fixedGitRunner);
  return validateR4bTestLaneInventorySnapshot({ ...gitSnapshot, testPathKinds });
}

function runNode(arguments_, environment = process.env) {
  const result = spawnSync(process.execPath, arguments_, {
    cwd: ROOT,
    env: environment,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function assertWindowsNativeLane() {
  if (process.platform !== "win32") {
    throw new Error("Windows-native R4-B tests require process.platform === win32");
  }
}

if (resolve(process.argv[1] ?? "") === MODULE_PATH) {
  const mode = process.argv[2];
  if (process.argv.length !== 3 || !["portable", "windows-native", "exact"].includes(mode)) {
    throw new Error("usage: node r4b-test-lanes.mjs <portable|windows-native|exact>");
  }

  validateR4bTestLaneInventory();

  if (mode === "portable") {
    runNode(
      process.platform === "win32"
        ? [
            "scripts/r4b-evidence/windows-native-test-journal-runner.mjs",
            "--",
            "--test-concurrency=1",
            "--test",
            ...PORTABLE_R4B_TESTS,
          ]
        : ["--test", ...PORTABLE_R4B_TESTS],
    );
  } else {
    assertWindowsNativeLane();
    const { environment } = bindTestPythonEnvironment();
    const selected =
      mode === "windows-native"
        ? WINDOWS_NATIVE_R4B_TESTS
        : [...PORTABLE_R4B_TESTS, ...WINDOWS_NATIVE_R4B_TESTS];
    runNode(
      [
        "scripts/r4b-evidence/windows-native-test-journal-runner.mjs",
        "--",
        "--test-concurrency=1",
        "--test-reporter=tap",
        "--test",
        ...selected,
      ],
      environment,
    );
    if (mode === "exact") {
      const { verifyAttempt001Seals } = await import("./preflight-attempts.mjs");
      verifyAttempt001Seals();
    }
  }
}
