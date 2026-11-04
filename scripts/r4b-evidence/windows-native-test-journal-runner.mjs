import { createHash, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  WINDOWS_TRUSTED_TEMP_ROOT,
  windowsTrustedTempEnvironment,
} from "./windows-trusted-temp-root.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CLEANUP_SOURCE = resolve(ROOT, "scripts/r4b-evidence/windows-native-test-journal-cleanup.cs");
const EXPECTED_CLEANUP_SOURCE_SHA256 =
  "7376078454fc47b3b6bd257c5436f7b67a71ee688ffe45191189df5b65568ab8";
const POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const RUN_ID_PATTERN = /^[0-9a-f]{64}$/u;
const CANONICAL_TEMP_ROOT = WINDOWS_TRUSTED_TEMP_ROOT;
const CANONICAL_SYSTEM_ROOT = process.env.SystemRoot ?? "C:\\Windows";
const CANONICAL_COMSPEC = process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe";
const TEST_PARENT = resolve(CANONICAL_TEMP_ROOT, "fluyo-native-test-broker-journals");
const ALLOWED_CHILD_OPTION_KEYS = new Set(["stdio"]);

const CLEANUP_BOOTSTRAP = [
  "$ErrorActionPreference='Stop'",
  "$bytes=[IO.File]::ReadAllBytes($env:FLUYO_TEST_JOURNAL_CLEANUP_SOURCE)",
  "$actual=([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($bytes))).Replace('-','').ToLowerInvariant()",
  "if($actual -cne $env:FLUYO_TEST_JOURNAL_CLEANUP_SHA256){throw 'TEST_JOURNAL_CLEANUP_SOURCE_DIGEST'}",
  "Add-Type -TypeDefinition ([Text.Encoding]::UTF8.GetString($bytes)) -Language CSharp -ErrorAction Stop",
  "$result=[FluyoTestJournalCleanup]::Cleanup($env:FLUYO_TEST_JOURNAL_RUN_ID)",
  "[Console]::Out.Write($result)",
].join(";");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createTestJournalRunId() {
  return randomBytes(32).toString("hex");
}

export function testJournalRunPath(runId) {
  if (!RUN_ID_PATTERN.test(runId ?? "")) throw new Error("invalid test journal run identity");
  return resolve(TEST_PARENT, runId);
}

function cleanupTestJournalRun(runId) {
  testJournalRunPath(runId);
  if (process.platform !== "win32") return Object.freeze({ outcome: "ABSENT" });
  const source = readFileSync(CLEANUP_SOURCE);
  if (source.length === 0 || source.length > 512 * 1024) {
    throw new Error("test journal cleanup source is invalid");
  }
  if (sha256(source) !== EXPECTED_CLEANUP_SOURCE_SHA256) {
    throw new Error("test journal cleanup source digest mismatch");
  }
  const result = spawnSync(
    POWERSHELL,
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", CLEANUP_BOOTSTRAP],
    {
      env: {
        ComSpec: CANONICAL_COMSPEC,
        SystemRoot: CANONICAL_SYSTEM_ROOT,
        ...windowsTrustedTempEnvironment(),
        FLUYO_TEST_JOURNAL_CLEANUP_SOURCE: CLEANUP_SOURCE,
        FLUYO_TEST_JOURNAL_CLEANUP_SHA256: EXPECTED_CLEANUP_SOURCE_SHA256,
        FLUYO_TEST_JOURNAL_RUN_ID: runId,
      },
      encoding: "utf8",
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 1024 * 1024,
    },
  );
  if (result.status !== 0 || (result.stdout !== "ABSENT" && result.stdout !== "REMOVED")) {
    throw new Error("test journal cleanup failed");
  }
  return Object.freeze({ outcome: result.stdout });
}

function normalizedChildArguments(argv) {
  const args = argv[0] === "--" ? argv.slice(1) : [...argv];
  if (args.length === 0) throw new Error("test journal runner requires Node arguments");
  return args;
}

function normalizedChildOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("test journal runner options are invalid");
  }
  for (const key of Reflect.ownKeys(options)) {
    if (typeof key !== "string" || !ALLOWED_CHILD_OPTION_KEYS.has(key)) {
      throw new Error("test journal runner option is not supported");
    }
  }
  return options;
}

export async function runTestJournalChild(argv, options = {}) {
  const args = normalizedChildArguments(argv);
  const childOptions = normalizedChildOptions(options);
  const runId = createTestJournalRunId();
  testJournalRunPath(runId);
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...windowsTrustedTempEnvironment(),
      FLUYO_TEST_JOURNAL_RUN_ID: runId,
    },
    stdio: childOptions.stdio ?? "inherit",
    windowsHide: true,
  });
  const forward = (signal) => {
    if (!child.killed) child.kill(signal);
  };
  const onSigint = () => forward("SIGINT");
  const onSigterm = () => forward("SIGTERM");
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);
  let code;
  let signal;
  let spawnError;
  try {
    ({ code, signal, spawnError } = await new Promise((resolveClose) => {
      let failure;
      child.once("error", (error) => {
        failure = error;
      });
      child.once("close", (childCode, childSignal) =>
        resolveClose({ code: childCode, signal: childSignal, spawnError: failure }),
      );
    }));
  } finally {
    process.removeListener("SIGINT", onSigint);
    process.removeListener("SIGTERM", onSigterm);
  }
  let cleanupError;
  try {
    cleanupTestJournalRun(runId);
  } catch (error) {
    cleanupError = error;
  }
  return Object.freeze({
    runId,
    code: cleanupError || spawnError ? 1 : (code ?? 1),
    signal: signal ?? null,
    cleanupFailed: Boolean(cleanupError),
    spawnFailed: Boolean(spawnError),
  });
}

async function main() {
  let result;
  try {
    result = await runTestJournalChild(process.argv.slice(2));
  } catch {
    process.stderr.write("TEST_JOURNAL_RUNNER_FAILED\n");
    process.exitCode = 1;
    return;
  }
  if (result.cleanupFailed) process.stderr.write("TEST_JOURNAL_CLEANUP_FAILED\n");
  else if (result.spawnFailed) process.stderr.write("TEST_JOURNAL_CHILD_START_FAILED\n");
  process.exitCode = result.code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
