import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  ftruncateSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  rmdirSync,
  symlinkSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { windowsNativeBoundaryTesting } from "./windows-native-client.mjs";
import {
  createTestJournalRunId,
  runTestJournalChild as runUntrackedTestJournalChild,
  testJournalRunPath,
} from "./windows-native-test-journal-runner.mjs";
import {
  WINDOWS_TRUSTED_TEMP_ROOT,
  windowsTrustedTempEnvironment,
} from "./windows-trusted-temp-root.mjs";

const CLIENT_URL = new URL("./windows-native-client.mjs", import.meta.url).href;
const TRUSTED_TEMP_URL = new URL("./windows-trusted-temp-root.mjs", import.meta.url).href;
const RUNNER_URL = new URL("./windows-native-test-journal-runner.mjs", import.meta.url).href;
const CANONICAL_TEMP_ROOT = WINDOWS_TRUSTED_TEMP_ROOT;
const LEGACY_PARENT = resolve(CANONICAL_TEMP_ROOT, "fluyo-native-broker-journals");
const TEST_PARENT = resolve(CANONICAL_TEMP_ROOT, "fluyo-native-test-broker-journals");
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CLEANUP_SOURCE = resolve(ROOT, "scripts/r4b-evidence/windows-native-test-journal-cleanup.cs");
const EXPECTED_CLEANUP_SOURCE_SHA256 =
  "7376078454fc47b3b6bd257c5436f7b67a71ee688ffe45191189df5b65568ab8";
const POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const completedRunIds = new Set();

const CLEANUP_FIXTURE_BOOTSTRAP = [
  "$ErrorActionPreference='Stop'",
  "$bytes=[IO.File]::ReadAllBytes($env:FLUYO_TEST_JOURNAL_CLEANUP_SOURCE)",
  "$actual=([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($bytes))).Replace('-','').ToLowerInvariant()",
  "if($actual -cne $env:FLUYO_TEST_JOURNAL_CLEANUP_SHA256){throw 'TEST_JOURNAL_CLEANUP_SOURCE_DIGEST'}",
  "Add-Type -TypeDefinition ([Text.Encoding]::UTF8.GetString($bytes)) -Language CSharp -ErrorAction Stop",
  "$result=[FluyoTestJournalCleanup]::Cleanup($env:FLUYO_TEST_JOURNAL_RUN_ID)",
  "[Console]::Out.Write($result)",
].join(";");

function cleanupTestJournalRunForFixture(
  runId,
  trustedEnvironment = windowsTrustedTempEnvironment(),
) {
  testJournalRunPath(runId);
  const source = readFileSync(CLEANUP_SOURCE);
  assert.equal(createHash("sha256").update(source).digest("hex"), EXPECTED_CLEANUP_SOURCE_SHA256);
  const result = spawnSync(
    POWERSHELL,
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      CLEANUP_FIXTURE_BOOTSTRAP,
    ],
    {
      env: {
        ComSpec: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
        SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
        ...trustedEnvironment,
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

function shortPathFor(path) {
  const result = spawnSync(
    POWERSHELL,
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "[Console]::Out.Write((New-Object -ComObject Scripting.FileSystemObject).GetFolder($env:FLUYO_SHORT_PATH).ShortPath)",
    ],
    {
      env: { ...process.env, FLUYO_SHORT_PATH: path },
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert.equal(result.status, 0);
  const shortPath = result.stdout.trim();
  assert.notEqual(shortPath, "");
  return shortPath;
}

function productionSnapshot() {
  if (!existsSync(LEGACY_PARENT)) return [];
  return readdirSync(LEGACY_PARENT, { withFileTypes: true })
    .map((entry) => {
      assert.equal(entry.isFile(), true);
      const path = resolve(LEGACY_PARENT, entry.name);
      return [entry.name, readFileSync(path).length];
    })
    .sort(([left], [right]) => left.localeCompare(right));
}

function disposableBrokerScript({ exitCode = 0, crashAndRecover = false } = {}) {
  return `
    import { mkdtempSync, rmSync, existsSync } from "node:fs";
    import { tmpdir } from "node:os";
    import { resolve } from "node:path";
    import { windowsNativeBoundaryTesting as boundary } from ${JSON.stringify(CLIENT_URL)};
    const root = mkdtempSync(resolve(tmpdir(), "fluyo-journal-runner-child-"));
    try {
      let hello = boundary.executeTestNative("HELLO", root);
      ${
        crashAndRecover
          ? `await boundary.crashBrokerForTest(root);
      hello = boundary.executeTestNative("HELLO", root);
      boundary.executeTestNative("RECOVER_SESSION", root, "", { recoveryRecord: {
        schema: "fluyo:r4b:native-recovery:v2",
        failureEvent: "NATIVE_TRANSPORT_FAILURE",
        requestId: hello.requestId,
        controllerPid: process.pid,
        controllerCreationIdentity: hello.controllerCreationIdentity,
        journalSequence: hello.journalSequence,
        journalDigest: hello.journalDigest,
        disposition: "RETRY_SAME_REQUEST_ONLY"
      }});`
          : ""
      }
    } finally {
      await boundary.terminateBrokerForTest(root);
      rmSync(root, { recursive: true, force: true });
      if (existsSync(root)) throw new Error("child root remains");
    }
    process.exitCode = ${exitCode};
  `;
}

function currentTestRunDirectories() {
  if (!existsSync(TEST_PARENT)) return [];
  return readdirSync(TEST_PARENT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function runTestJournalChild(argv, options = {}) {
  const result = await runUntrackedTestJournalChild(argv, options);
  completedRunIds.add(result.runId);
  return result;
}

function completedOwnedRunDirectories() {
  return [...completedRunIds].filter((runId) => existsSync(testJournalRunPath(runId))).sort();
}

test("keeps production and test journal namespaces closed and distinct", () => {
  const root = resolve(tmpdir(), "fluyo-journal-path-contract");
  const production = windowsNativeBoundaryTesting.journalPathFor(root, false);
  const testPath = windowsNativeBoundaryTesting.journalPathFor(root, true);
  assert.equal(resolve(production).startsWith(resolve(LEGACY_PARENT)), true);
  assert.equal(resolve(testPath).startsWith(resolve(TEST_PARENT)), true);
  assert.equal(testPath.includes(process.env.FLUYO_TEST_JOURNAL_RUN_ID), true);
  assert.notEqual(production, testPath);
});

test("captures one native temp identity and does not follow later environment mutation", () => {
  const before = windowsTrustedTempEnvironment();
  const originalTemp = process.env.TEMP;
  const originalTmp = process.env.TMP;
  try {
    process.env.TEMP = resolve(CANONICAL_TEMP_ROOT, "caller-temp-override");
    process.env.TMP = resolve(CANONICAL_TEMP_ROOT, "caller-tmp-override");
    assert.deepEqual(windowsTrustedTempEnvironment(), before);
    assert.equal(before.TEMP, WINDOWS_TRUSTED_TEMP_ROOT);
    assert.equal(before.TMP, WINDOWS_TRUSTED_TEMP_ROOT);
    assert.equal(Object.isFrozen(before), true);
  } finally {
    if (originalTemp === undefined) delete process.env.TEMP;
    else process.env.TEMP = originalTemp;
    if (originalTmp === undefined) delete process.env.TMP;
    else process.env.TMP = originalTmp;
  }
});

test("accepts a real short temp alias only after proving the same native identity", () => {
  const productionBefore = productionSnapshot();
  const longRoot = resolve(
    CANONICAL_TEMP_ROOT,
    `fluyo short temp ${randomBytes(8).toString("hex")}`,
  );
  mkdirSync(longRoot);
  const shortRoot = shortPathFor(longRoot);
  assert.notEqual(shortRoot.toLowerCase(), longRoot.toLowerCase());
  assert.equal(realpathSync.native(shortRoot).toLowerCase(), longRoot.toLowerCase());
  const runId = createTestJournalRunId();
  const script = `
    import { windowsNativeBoundaryTesting as boundary } from ${JSON.stringify(CLIENT_URL)};
    const root = process.cwd();
    try {
      if (boundary.executeTestNative("HELLO", root).status !== "PASS") process.exitCode = 71;
    } finally {
      await boundary.terminateBrokerForTest(root);
    }
  `;
  try {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: ROOT,
      env: {
        ...process.env,
        TEMP: shortRoot,
        TMP: shortRoot,
        FLUYO_TEST_JOURNAL_RUN_ID: runId,
      },
      encoding: "utf8",
      windowsHide: true,
      timeout: 120000,
    });
    assert.equal(result.status, 0);
    assert.equal(cleanupTestJournalRunForFixture(runId).outcome, "ABSENT");
    assert.deepEqual(productionSnapshot(), productionBefore);
  } finally {
    rmSync(longRoot, { recursive: true, force: true });
  }
});

test("rejects an initial temp ancestor junction before broker or cleanup mutation", () => {
  const productionBefore = productionSnapshot();
  const target = mkdtempSync(resolve(CANONICAL_TEMP_ROOT, "fluyo-temp-junction-target-"));
  const junction = resolve(
    CANONICAL_TEMP_ROOT,
    `fluyo-temp-junction-${randomBytes(8).toString("hex")}`,
  );
  const child = resolve(junction, "child");
  mkdirSync(resolve(target, "child"));
  symlinkSync(target, junction, "junction");
  const script = `
    try {
      await import(${JSON.stringify(TRUSTED_TEMP_URL)});
      process.exitCode = 72;
    } catch (error) {
      if (error?.message !== "WINDOWS_TRUSTED_TEMP_ROOT_IDENTITY") process.exitCode = 73;
    }
  `;
  try {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TEMP: child, TMP: child },
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
    });
    assert.equal(result.status, 0);
    assert.equal(existsSync(resolve(target, "child", "fluyo-native-test-broker-journals")), false);
    assert.deepEqual(productionSnapshot(), productionBefore);
  } finally {
    rmdirSync(junction);
    rmSync(target, { recursive: true, force: true });
  }
});

test("rejects capture-to-cleanup identity replacement without production mutation", () => {
  const productionBefore = productionSnapshot();
  const original = mkdtempSync(resolve(CANONICAL_TEMP_ROOT, "fluyo-temp-capture-"));
  const moved = `${original}-moved`;
  const capturedIndex = String(statSync(original, { bigint: true }).ino);
  renameSync(original, moved);
  mkdirSync(original);
  const runId = createTestJournalRunId();
  const run = resolve(original, "fluyo-native-test-broker-journals", runId);
  mkdirSync(run, { recursive: true });
  const journal = resolve(run, `${"a".repeat(64)}.journal`);
  writeFileSync(journal, "bounded\n");
  try {
    assert.throws(
      () =>
        cleanupTestJournalRunForFixture(runId, {
          TEMP: original,
          TMP: original,
          FLUYO_TRUSTED_TEMP_FILE_INDEX: capturedIndex,
        }),
      /test journal cleanup failed/u,
    );
    assert.equal(readFileSync(journal, "utf8"), "bounded\n");
    assert.deepEqual(productionSnapshot(), productionBefore);
  } finally {
    rmSync(original, { recursive: true, force: true });
    renameSync(moved, original);
    rmSync(original, { recursive: true, force: true });
  }
});

test("blocks or rejects capture-to-create and capture-to-adopt identity replacement", () => {
  const productionBefore = productionSnapshot();
  const original = mkdtempSync(resolve(CANONICAL_TEMP_ROOT, "fluyo-temp-runtime-capture-"));
  const moved = `${original}-moved`;
  const capturedIndex = String(statSync(original, { bigint: true }).ino);
  const runId = createTestJournalRunId();
  const script = `
    import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
    await import(${JSON.stringify(TRUSTED_TEMP_URL)});
    const original = process.env.FLUYO_CAPTURE_TEMP;
    const moved = process.env.FLUYO_CAPTURE_MOVED;
    const root = process.cwd();
    async function swapAndRequireRejection(boundary) {
      let swapped = false;
      try {
        renameSync(original, moved);
        mkdirSync(original);
        swapped = true;
      } catch (error) {
        if (error?.code !== "EPERM" && error?.code !== "EBUSY") throw error;
      }
      if (!swapped) return;
      try {
        let rejected = false;
        try { boundary.executeTestNative("HELLO", root); } catch { rejected = true; }
        if (!rejected || existsSync(original + "\\\\fluyo-native-test-broker-journals")) {
          process.exitCode = 74;
        }
      } finally {
        rmSync(original, { recursive: true, force: true });
        renameSync(moved, original);
      }
    }
    const { windowsNativeBoundaryTesting: boundary } = await import(${JSON.stringify(CLIENT_URL)});
    await swapAndRequireRejection(boundary);
    if (process.exitCode) process.exit();
    boundary.executeTestNative("HELLO", root);
    await boundary.crashBrokerForTest(root);
    await swapAndRequireRejection(boundary);
    await boundary.shutdownBrokers();
  `;
  try {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: ROOT,
      env: {
        ...process.env,
        TEMP: original,
        TMP: original,
        FLUYO_TEST_JOURNAL_RUN_ID: runId,
        FLUYO_CAPTURE_TEMP: original,
        FLUYO_CAPTURE_MOVED: moved,
      },
      encoding: "utf8",
      windowsHide: true,
      timeout: 120000,
    });
    assert.equal(result.status, 0);
    const cleanup = cleanupTestJournalRunForFixture(runId, {
      TEMP: original,
      TMP: original,
      FLUYO_TRUSTED_TEMP_FILE_INDEX: capturedIndex,
    });
    assert.equal(["ABSENT", "REMOVED"].includes(cleanup.outcome), true);
    assert.deepEqual(productionSnapshot(), productionBefore);
  } finally {
    rmSync(original, { recursive: true, force: true });
    rmSync(moved, { recursive: true, force: true });
  }
});

test("rejects every caller-derived or malformed test run identity", () => {
  const original = process.env.FLUYO_TEST_JOURNAL_RUN_ID;
  try {
    for (const invalid of [
      undefined,
      "",
      "a".repeat(63),
      "a".repeat(65),
      "A".repeat(64),
      "../x",
      "0".repeat(63) + "/",
    ]) {
      if (invalid === undefined) delete process.env.FLUYO_TEST_JOURNAL_RUN_ID;
      else process.env.FLUYO_TEST_JOURNAL_RUN_ID = invalid;
      assert.throws(
        () => windowsNativeBoundaryTesting.requireTestJournalRunId(),
        /outer-runner journal identity/u,
      );
      assert.throws(() => testJournalRunPath(invalid), /invalid test journal run identity/u);
    }
  } finally {
    process.env.FLUYO_TEST_JOURNAL_RUN_ID = original;
  }
});

test("rejects caller-selected runner identities and paths", async () => {
  const before = currentTestRunDirectories();
  const runnerExports = await import(RUNNER_URL);
  assert.equal(Object.hasOwn(runnerExports, "cleanupTestJournalRun"), false);
  const childArguments = ["--input-type=module", "-e", "process.exit(0)"];
  for (const options of [
    { runId: "0".repeat(64) },
    { journalPath: resolve(TEST_PARENT, "caller-selected.journal") },
    { runDirectory: resolve(TEST_PARENT, "0".repeat(64)) },
    { cwd: tmpdir() },
    { env: { TEMP: resolve(tmpdir(), "caller-selected-temp") } },
    { env: { TMP: resolve(tmpdir(), "caller-selected-tmp") } },
    { env: { FLUYO_TEST_JOURNAL_RUN_ID: "0".repeat(64) } },
  ]) {
    await assert.rejects(
      runTestJournalChild(childArguments, options),
      /runner option is not supported/u,
    );
  }
  assert.deepEqual(currentTestRunDirectories(), before);
});

test("binds child creation and cleanup to one immutable temp root", async () => {
  const outerRunId = process.env.FLUYO_TEST_JOURNAL_RUN_ID;
  const before = currentTestRunDirectories().filter((runId) => runId !== outerRunId);
  const originalTemp = process.env.TEMP;
  const originalTmp = process.env.TMP;
  const divertedRoot = mkdtempSync(resolve(CANONICAL_TEMP_ROOT, "fluyo-temp-mutation-"));
  const divertedTestParent = resolve(divertedRoot, "fluyo-native-test-broker-journals");
  try {
    const pending = runTestJournalChild(["--input-type=module", "-e", disposableBrokerScript()], {
      stdio: "ignore",
    });
    process.env.TEMP = divertedRoot;
    process.env.TMP = divertedRoot;
    const result = await pending;
    assert.equal(result.code, 0);
    assert.equal(result.cleanupFailed, false);
    assert.equal(existsSync(testJournalRunPath(result.runId)), false);
    assert.equal(existsSync(divertedTestParent), false);
  } finally {
    if (originalTemp === undefined) delete process.env.TEMP;
    else process.env.TEMP = originalTemp;
    if (originalTmp === undefined) delete process.env.TMP;
    else process.env.TMP = originalTmp;
    rmSync(divertedRoot, { recursive: true, force: true });
    assert.equal(existsSync(divertedRoot), false);
  }
  assert.deepEqual(
    currentTestRunDirectories().filter((runId) => runId !== outerRunId),
    before,
  );
});

test("fails closed when native tests bypass the outer runner", async () => {
  const script = `import { mkdtempSync, rmSync, existsSync } from "node:fs"; import { tmpdir } from "node:os"; import { resolve } from "node:path"; import { windowsNativeBoundaryTesting as b } from ${JSON.stringify(CLIENT_URL)}; const root=mkdtempSync(resolve(tmpdir(), "fluyo-unwrapped-native-")); try { b.executeTestNative("HELLO", root); } finally { rmSync(root, { recursive: true, force: true }); if (existsSync(root)) throw new Error("unwrapped root remains"); }`;
  const env = { ...process.env };
  delete env.FLUYO_TEST_JOURNAL_RUN_ID;
  const result = await new Promise((complete) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("close", (code) => complete({ code, stderr }));
  });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /outer-runner journal identity/u);
});

test("cleans sequential and parallel wrapped runs without touching production journals", async () => {
  const productionBefore = productionSnapshot();
  const childArguments = ["--input-type=module", "-e", disposableBrokerScript()];
  for (let index = 0; index < 2; index += 1) {
    const result = await runTestJournalChild(childArguments, { stdio: "ignore" });
    assert.equal(result.code, 0);
    assert.equal(result.cleanupFailed, false);
    assert.equal(existsSync(testJournalRunPath(result.runId)), false);
  }
  const parallel = await Promise.all([
    runTestJournalChild(childArguments, { stdio: "ignore" }),
    runTestJournalChild(childArguments, { stdio: "ignore" }),
  ]);
  assert.notEqual(parallel[0].runId, parallel[1].runId);
  for (const result of parallel) {
    assert.equal(result.code, 0);
    assert.equal(result.cleanupFailed, false);
    assert.equal(existsSync(testJournalRunPath(result.runId)), false);
  }
  assert.deepEqual(productionSnapshot(), productionBefore);
});

test("preserves a failing child status while still cleaning its journal run", async () => {
  const result = await runTestJournalChild(
    ["--input-type=module", "-e", disposableBrokerScript({ exitCode: 7 })],
    { stdio: "ignore" },
  );
  assert.equal(result.code, 7);
  assert.equal(result.cleanupFailed, false);
  assert.equal(existsSync(testJournalRunPath(result.runId)), false);
});

test("preserves crash recovery and final-crash journals until child close", async () => {
  const recovered = await runTestJournalChild(
    [
      "--test",
      "--test-name-pattern",
      "derives APPLIED_UNACKED and COMMITTED recovery from durable broker truth",
      fileURLToPath(new URL("./windows-native-boundary.test.mjs", import.meta.url)),
    ],
    { stdio: "ignore" },
  );
  assert.equal(recovered.code, 0);
  assert.equal(recovered.cleanupFailed, false);
  assert.equal(existsSync(testJournalRunPath(recovered.runId)), false);

  const finalCrash = `
    import { mkdtempSync, rmSync, existsSync } from "node:fs";
    import { tmpdir } from "node:os";
    import { resolve } from "node:path";
    import { windowsNativeBoundaryTesting as b } from ${JSON.stringify(CLIENT_URL)};
    const root = mkdtempSync(resolve(tmpdir(), "fluyo-final-crash-journal-"));
    b.executeTestNative("HELLO", root);
    await b.crashBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    if (existsSync(root)) throw new Error("final crash root remains");
  `;
  const crashed = await runTestJournalChild(["--input-type=module", "-e", finalCrash], {
    stdio: "ignore",
  });
  assert.equal(crashed.code, 0);
  assert.equal(crashed.cleanupFailed, false);
  assert.equal(existsSync(testJournalRunPath(crashed.runId)), false);
});

test("fails closed while an active broker owns the journal, then removes it after child close", async () => {
  const runId = createTestJournalRunId();
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-active-journal-owner-"));
  const script = `
    import { windowsNativeBoundaryTesting as b } from ${JSON.stringify(CLIENT_URL)};
    const root = process.env.FLUYO_ACTIVE_JOURNAL_ROOT;
    b.executeTestNative("HELLO", root);
    process.stdout.write("READY\\n");
    setInterval(() => {}, 1000);
  `;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
    env: {
      ...process.env,
      FLUYO_TEST_JOURNAL_RUN_ID: runId,
      FLUYO_ACTIVE_JOURNAL_ROOT: root,
    },
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
  });
  child.stdout.setEncoding("utf8");
  await new Promise((ready, reject) => {
    child.stdout.once("data", (chunk) =>
      chunk.includes("READY") ? ready() : reject(new Error("missing ready")),
    );
    child.once("error", reject);
  });
  assert.equal(currentTestRunDirectories().includes(runId), true);
  assert.deepEqual(completedOwnedRunDirectories(), []);
  assert.throws(() => cleanupTestJournalRunForFixture(runId), /test journal cleanup failed/u);
  assert.equal(existsSync(testJournalRunPath(runId)), true);
  child.kill("SIGTERM");
  await new Promise((closed) => child.once("close", closed));
  assert.equal(cleanupTestJournalRunForFixture(runId).outcome, "REMOVED");
  assert.equal(existsSync(testJournalRunPath(runId)), false);
  rmSync(root, { recursive: true, force: true });
  assert.equal(existsSync(root), false);
});

test("rejects unknown entries without deleting and removes bounded malformed journals after quiescence", () => {
  const rejectedRun = createTestJournalRunId();
  const rejectedPath = testJournalRunPath(rejectedRun);
  mkdirSync(rejectedPath, { recursive: true });
  const unknown = resolve(rejectedPath, "unknown.txt");
  writeFileSync(unknown, "unknown");
  assert.throws(() => cleanupTestJournalRunForFixture(rejectedRun), /test journal cleanup failed/u);
  assert.equal(readFileSync(unknown, "utf8"), "unknown");
  unlinkSync(unknown);
  rmdirSync(rejectedPath);
  assert.equal(existsSync(rejectedPath), false);

  for (const bytes of [Buffer.alloc(0), Buffer.from("malformed")]) {
    const runId = createTestJournalRunId();
    const runPath = testJournalRunPath(runId);
    mkdirSync(runPath, { recursive: true });
    const name = `${createHash("sha256").update(randomBytes(32)).digest("hex")}.journal`;
    writeFileSync(resolve(runPath, name), bytes);
    assert.equal(cleanupTestJournalRunForFixture(runId).outcome, "REMOVED");
    assert.equal(existsSync(runPath), false);
  }
});

test("rejects count, size, nested-directory, and reparse bounds without deletion", () => {
  const countRun = createTestJournalRunId();
  const countPath = testJournalRunPath(countRun);
  mkdirSync(countPath, { recursive: true });
  const countFiles = [];
  for (let index = 0; index < 1025; index += 1) {
    const name = `${createHash("sha256").update(`count-${index}`).digest("hex")}.journal`;
    const path = resolve(countPath, name);
    writeFileSync(path, "");
    countFiles.push(path);
  }
  assert.throws(() => cleanupTestJournalRunForFixture(countRun), /test journal cleanup failed/u);
  assert.equal(readdirSync(countPath).length, 1025);
  for (const path of countFiles) unlinkSync(path);
  rmdirSync(countPath);

  const sizeRun = createTestJournalRunId();
  const sizePath = testJournalRunPath(sizeRun);
  mkdirSync(sizePath, { recursive: true });
  const oversized = resolve(sizePath, `${"a".repeat(64)}.journal`);
  const descriptor = openSync(oversized, "w");
  try {
    ftruncateSync(descriptor, 16 * 1024 * 1024 + 1);
  } finally {
    closeSync(descriptor);
  }
  assert.throws(() => cleanupTestJournalRunForFixture(sizeRun), /test journal cleanup failed/u);
  assert.equal(existsSync(oversized), true);
  unlinkSync(oversized);
  rmdirSync(sizePath);

  const aggregateRun = createTestJournalRunId();
  const aggregatePath = testJournalRunPath(aggregateRun);
  mkdirSync(aggregatePath, { recursive: true });
  const aggregateFiles = [];
  for (let index = 0; index < 33; index += 1) {
    const name = `${createHash("sha256").update(`aggregate-${index}`).digest("hex")}.journal`;
    const path = resolve(aggregatePath, name);
    const file = openSync(path, "w");
    try {
      ftruncateSync(file, 16 * 1024 * 1024);
    } finally {
      closeSync(file);
    }
    aggregateFiles.push(path);
  }
  assert.throws(
    () => cleanupTestJournalRunForFixture(aggregateRun),
    /test journal cleanup failed/u,
  );
  assert.equal(readdirSync(aggregatePath).length, 33);
  for (const path of aggregateFiles) unlinkSync(path);
  rmdirSync(aggregatePath);

  const nestedRun = createTestJournalRunId();
  const nestedPath = testJournalRunPath(nestedRun);
  const nested = resolve(nestedPath, "nested");
  mkdirSync(nested, { recursive: true });
  assert.throws(() => cleanupTestJournalRunForFixture(nestedRun), /test journal cleanup failed/u);
  assert.equal(existsSync(nested), true);
  rmdirSync(nested);
  rmdirSync(nestedPath);

  const reparseRun = createTestJournalRunId();
  const reparsePath = testJournalRunPath(reparseRun);
  const outside = resolve(tmpdir(), `fluyo-test-journal-outside-${reparseRun}`);
  mkdirSync(outside);
  const sentinel = resolve(outside, "sentinel.txt");
  writeFileSync(sentinel, "outside-unchanged");
  mkdirSync(TEST_PARENT, { recursive: true });
  symlinkSync(outside, reparsePath, "junction");
  assert.throws(() => cleanupTestJournalRunForFixture(reparseRun), /test journal cleanup failed/u);
  assert.equal(readFileSync(sentinel, "utf8"), "outside-unchanged");
  rmdirSync(reparsePath);
  unlinkSync(sentinel);
  rmdirSync(outside);
});

test("leaves no completed owned run directories", () => {
  assert.deepEqual(completedOwnedRunDirectories(), []);
});
