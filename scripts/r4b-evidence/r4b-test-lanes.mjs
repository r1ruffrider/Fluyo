import { spawnSync } from "node:child_process";
import { lstatSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { bindTestPythonEnvironment } from "./test-python-binding.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const EVIDENCE_ROOT = resolve(ROOT, "scripts/r4b-evidence");

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
  "scripts/r4b-evidence/transition.test.mjs",
]);

export const WINDOWS_NATIVE_R4B_TESTS = Object.freeze([
  "scripts/r4b-evidence/fixed-root-guard.test.mjs",
  "scripts/r4b-evidence/preflight-build.test.mjs",
  "scripts/r4b-evidence/preflight-process-owner.test.mjs",
  "scripts/r4b-evidence/windows-native-boundary.test.mjs",
  "scripts/r4b-evidence/windows-native-test-journal-runner.test.mjs",
]);

function collectTests(root) {
  const tests = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    const metadata = lstatSync(current);
    if (metadata.isSymbolicLink()) throw new Error("R4-B test inventory rejects links");
    if (metadata.isDirectory()) {
      for (const name of readdirSync(current)) pending.push(resolve(current, name));
    } else if (metadata.isFile() && current.endsWith(".test.mjs")) {
      tests.push(relative(ROOT, current).replaceAll("\\", "/"));
    } else if (!metadata.isFile()) {
      throw new Error("R4-B test inventory found an unsupported filesystem entry");
    }
  }
  return tests.sort();
}

export function validateR4bTestLaneInventory() {
  const portable = new Set(PORTABLE_R4B_TESTS);
  const windowsNative = new Set(WINDOWS_NATIVE_R4B_TESTS);
  if (portable.size !== PORTABLE_R4B_TESTS.length) {
    throw new Error("portable R4-B test inventory contains a duplicate");
  }
  if (windowsNative.size !== WINDOWS_NATIVE_R4B_TESTS.length) {
    throw new Error("Windows-native R4-B test inventory contains a duplicate");
  }
  const overlap = [...portable].filter((path) => windowsNative.has(path));
  if (overlap.length) {
    throw new Error(`R4-B test lane inventories overlap: ${overlap.join(",")}`);
  }
  const classified = [...portable, ...windowsNative].sort();
  const discovered = collectTests(EVIDENCE_ROOT);
  if (JSON.stringify(classified) !== JSON.stringify(discovered)) {
    throw new Error(
      `R4-B test lane inventory is incomplete or stale: ${JSON.stringify({ classified, discovered })}`,
    );
  }
  return Object.freeze({
    portable: PORTABLE_R4B_TESTS.length,
    windowsNative: WINDOWS_NATIVE_R4B_TESTS.length,
    total: discovered.length,
  });
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
