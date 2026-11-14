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
  windowsTrustedTempRoot,
  windowsTrustedTempEnvironment,
} from "./windows-trusted-temp-root.mjs";
import { testPythonBindingTesting } from "./test-python-binding.mjs";

const CLIENT_URL = new URL("./windows-native-client.mjs", import.meta.url).href;
const TRUSTED_TEMP_URL = new URL("./windows-trusted-temp-root.mjs", import.meta.url).href;
const RUNNER_URL = new URL("./windows-native-test-journal-runner.mjs", import.meta.url).href;
const RUNNER_SOURCE = readFileSync(
  new URL("./windows-native-test-journal-runner.mjs", import.meta.url),
  "utf8",
);
const CANONICAL_TEMP_ROOT = windowsTrustedTempRoot();
const LEGACY_PARENT = resolve(CANONICAL_TEMP_ROOT, "fluyo-native-broker-journals");
const TEST_PARENT = resolve(CANONICAL_TEMP_ROOT, "fluyo-native-test-broker-journals");
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CLEANUP_SOURCE = resolve(ROOT, "scripts/r4b-evidence/windows-native-test-journal-cleanup.cs");
const EXPECTED_CLEANUP_SOURCE_SHA256 =
  "7376078454fc47b3b6bd257c5436f7b67a71ee688ffe45191189df5b65568ab8";
const POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const completedRunIds = new Set();

const PYTHON_ROOT = "C:\\hostedtoolcache\\windows\\Python\\3.12.10\\x64";
const PYTHON_EXE = `${PYTHON_ROOT}\\python.exe`;
const PYTHON_BYTES = Buffer.from("PYTHON_FIXTURE");
const PYTHON_SHA256 = createHash("sha256").update(PYTHON_BYTES).digest("hex");
const PYTHON_STDOUT = `${JSON.stringify({
  executable: PYTHON_EXE,
  sha256: PYTHON_SHA256,
  version: [3, 12, 10],
})}\r\n`;
const PYTHON_MARKERS = Object.freeze({
  GITHUB_ACTIONS: "true",
  CI: "true",
  RUNNER_OS: "Windows",
  RUNNER_ARCH: "X64",
  RUNNER_ENVIRONMENT: "github-hosted",
});
const PYTHON_ERROR = Object.freeze({
  platform: "TEST_PYTHON_PLATFORM_INVALID",
  internal: "TEST_PYTHON_INTERNAL_CONTRACT_INVALID",
  environment: "TEST_PYTHON_ENVIRONMENT_INVALID",
  ci: "TEST_PYTHON_CI_CONTEXT_INVALID",
  actionRoot: "TEST_PYTHON_ACTION_ROOT_INVALID",
  rootIdentity: "TEST_PYTHON_ROOT_IDENTITY_INVALID",
  executable: "TEST_PYTHON_EXECUTABLE_INVALID",
  executableIdentity: "TEST_PYTHON_EXECUTABLE_IDENTITY_INVALID",
  revalidation: "TEST_PYTHON_REVALIDATION_FAILED",
  timeout: "TEST_PYTHON_INTROSPECTION_TIMEOUT",
  introspection: "TEST_PYTHON_INTROSPECTION_FAILED",
  output: "TEST_PYTHON_INTROSPECTION_OUTPUT_INVALID",
  content: "TEST_PYTHON_EXECUTABLE_CONTENT_INVALID",
  version: "TEST_PYTHON_VERSION_INVALID",
  pathUnavailable: "TEST_PYTHON_PATH_BINDING_UNAVAILABLE",
});

function pythonDirectoryStat({ dev = 1n, ino = 2n, mode = 16_877n, link = false } = {}) {
  return {
    dev,
    ino,
    mode,
    isDirectory: () => true,
    isFile: () => false,
    isSymbolicLink: () => link,
  };
}

function pythonFileStat({ dev = 1n, ino = 3n, mode = 33_206n, size = 14n, link = false } = {}) {
  return {
    dev,
    ino,
    mode,
    size,
    isDirectory: () => false,
    isFile: () => true,
    isSymbolicLink: () => link,
  };
}

function pythonEnvironment(overrides = {}) {
  return {
    ...PYTHON_MARKERS,
    pythonLocation: PYTHON_ROOT,
    Python_ROOT_DIR: PYTHON_ROOT,
    Python3_ROOT_DIR: PYTHON_ROOT,
    SystemRoot: "C:\\Windows",
    windir: "C:\\Windows",
    PRIVATE_SENTINEL: "PRIVATE_ENV_SENTINEL",
    HTTPS_PROXY: "PRIVATE_PROXY_SENTINEL",
    ...overrides,
  };
}

function mapKey(path) {
  return path.toLowerCase();
}

function createPythonFixture(overrides = {}) {
  const calls = [];
  const entries = new Map();
  let nextInode = 10n;
  const state = {
    spawned: false,
    lstatOverride: null,
    realpathOverride: null,
    readFileOverride: null,
    spawnOverride: null,
    spawnResult: null,
    spawnThrow: null,
    ...overrides,
  };

  function putDirectory(path, realpath = path, identity = {}) {
    const existing = entries.get(mapKey(realpath));
    const stat = existing?.stat ?? pythonDirectoryStat({ ino: nextInode++, ...identity });
    entries.set(mapKey(path), { kind: "directory", path, realpath, stat });
    if (!entries.has(mapKey(realpath))) {
      entries.set(mapKey(realpath), { kind: "directory", path: realpath, realpath, stat });
    }
    return stat;
  }

  function addRoot(declaredRoot, canonicalRoot = declaredRoot, options = {}) {
    const declaredDrive = declaredRoot.slice(0, 3);
    const canonicalDrive = canonicalRoot.slice(0, 3);
    const driveStat = putDirectory(declaredDrive, canonicalDrive, {
      dev: options.dev ?? 1n,
      ino: 1n,
    });
    if (!entries.has(mapKey(canonicalDrive))) {
      entries.set(mapKey(canonicalDrive), {
        kind: "directory",
        path: canonicalDrive,
        realpath: canonicalDrive,
        stat: driveStat,
      });
    }
    const declaredSegments = declaredRoot.slice(3).split("\\").filter(Boolean);
    const canonicalSegments = canonicalRoot.slice(3).split("\\").filter(Boolean);
    assert.equal(declaredSegments.length, canonicalSegments.length);
    let declaredCursor = declaredDrive;
    let canonicalCursor = canonicalDrive;
    for (let index = 0; index < declaredSegments.length; index += 1) {
      declaredCursor = resolve(declaredCursor, declaredSegments[index]);
      canonicalCursor = resolve(canonicalCursor, canonicalSegments[index]);
      putDirectory(declaredCursor, canonicalCursor, { dev: options.dev ?? 1n });
    }
    const candidate = resolve(canonicalRoot, "python.exe");
    const bytes = options.bytes ?? PYTHON_BYTES;
    entries.set(mapKey(candidate), {
      kind: "file",
      path: candidate,
      realpath: candidate,
      bytes,
      stat: pythonFileStat({
        dev: options.candidateDev ?? options.dev ?? 1n,
        ino: nextInode++,
        size: BigInt(bytes.length),
      }),
    });
    return candidate;
  }

  addRoot(PYTHON_ROOT);

  function entryFor(path) {
    const entry = entries.get(mapKey(path));
    if (!entry) throw new Error("PRIVATE_FS_SENTINEL");
    return entry;
  }

  const dependencies = {
    platform: "win32",
    lstat(path) {
      calls.push(["lstat", path]);
      if (state.lstatOverride) {
        const value = state.lstatOverride(path, calls, entries, state);
        if (value !== undefined) return value;
      }
      return entryFor(path).stat;
    },
    realpath(path) {
      calls.push(["realpath", path]);
      if (state.realpathOverride) {
        const value = state.realpathOverride(path, calls, entries, state);
        if (value !== undefined) return value;
      }
      return entryFor(path).realpath;
    },
    readFile(path) {
      calls.push(["readFile", path]);
      if (state.readFileOverride) {
        const value = state.readFileOverride(path, calls, entries, state);
        if (value !== undefined) return value;
      }
      return entryFor(path).bytes;
    },
    spawn(file, argv, options) {
      calls.push(["spawn", file, argv, options]);
      state.spawned = true;
      if (state.spawnOverride)
        return state.spawnOverride(file, argv, options, calls, entries, state);
      if (state.spawnThrow) throw state.spawnThrow;
      return (
        state.spawnResult ?? {
          status: 0,
          signal: null,
          error: undefined,
          stdout: PYTHON_STDOUT,
          stderr: "",
        }
      );
    },
  };
  return { addRoot, calls, dependencies, entries, state };
}

function resolvePython(environment, fixture) {
  return testPythonBindingTesting.resolveTestPythonBindingWithDependencies(
    environment,
    fixture.dependencies,
  );
}

function diagnosePython(environment, fixture) {
  return testPythonBindingTesting.diagnoseTestPythonBindingWithDependencies(
    environment,
    fixture.dependencies,
  );
}

function assertPythonError(operation, code, sentinels = []) {
  assert.throws(operation, (error) => {
    assert.deepEqual(error, new Error(code));
    for (const sentinel of sentinels) assert.equal(error.message.includes(sentinel), false);
    return true;
  });
}

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

test("binds setup-python roots to one closed Python 3.12 executable without PATH authority", async (t) => {
  await t.test("01 rejects non-Windows platforms before environment or filesystem access", () => {
    const fixture = createPythonFixture();
    fixture.dependencies.platform = "linux";
    const environment = new Proxy({}, { getOwnPropertyDescriptor: () => assert.fail("env read") });
    assertPythonError(() => resolvePython(environment, fixture), PYTHON_ERROR.platform);
    assert.deepEqual(fixture.calls, []);
  });

  await t.test(
    "02 rejects malformed dependency contracts before environment or filesystem access",
    () => {
      const base = createPythonFixture().dependencies;
      const invalid = [
        null,
        Object.create(null),
        { platform: "win32", lstat: base.lstat, realpath: base.realpath, readFile: base.readFile },
        {
          platform: "win32",
          realpath: base.realpath,
          lstat: base.lstat,
          readFile: base.readFile,
          spawn: base.spawn,
        },
        { ...base, extra: () => {} },
        { ...base, spawn: 1 },
      ];
      for (const dependencies of invalid) {
        assertPythonError(
          () =>
            testPythonBindingTesting.resolveTestPythonBindingWithDependencies(
              new Proxy({}, { getOwnPropertyDescriptor: () => assert.fail("env read") }),
              dependencies,
            ),
          PYTHON_ERROR.internal,
        );
      }
    },
  );

  await t.test("03 rejects null and nonobject environments", () => {
    for (const environment of [null, undefined, 1, "x", true]) {
      const fixture = createPythonFixture();
      assertPythonError(() => resolvePython(environment, fixture), PYTHON_ERROR.environment);
      assert.deepEqual(fixture.calls, []);
    }
  });

  await t.test("04 rejects descriptor traps once without invoking getters", () => {
    const fixture = createPythonFixture();
    let trapCount = 0;
    let getterCount = 0;
    const environment = new Proxy(
      {
        get GITHUB_ACTIONS() {
          getterCount += 1;
          return "true";
        },
      },
      {
        getOwnPropertyDescriptor() {
          trapCount += 1;
          throw new Error("PRIVATE_TRAP_SENTINEL");
        },
      },
    );
    assertPythonError(() => resolvePython(environment, fixture), PYTHON_ERROR.environment, [
      "PRIVATE_TRAP_SENTINEL",
    ]);
    assert.equal(trapCount, 1);
    assert.equal(getterCount, 0);
    assert.deepEqual(fixture.calls, []);
  });

  await t.test("05 rejects accessors and nonstrings without invoking getters", () => {
    let getterCount = 0;
    const accessor = Object.defineProperty({}, "GITHUB_ACTIONS", {
      enumerable: true,
      get() {
        getterCount += 1;
        return "true";
      },
    });
    for (const environment of [accessor, { GITHUB_ACTIONS: 1 }]) {
      const fixture = createPythonFixture();
      assertPythonError(() => resolvePython(environment, fixture), PYTHON_ERROR.environment);
      assert.deepEqual(fixture.calls, []);
    }
    assert.equal(getterCount, 0);
  });

  await t.test("06 enforces exact environment snapshot bounds and row grammar", () => {
    const base = {
      PATH: PYTHON_ROOT,
      SystemRoot: "C:\\Windows",
      windir: "C:\\Windows",
    };
    const accepted = { ...base };
    for (let index = 0; index < 4_093; index += 1) accepted[`K${index}`] = "";
    assert.equal(Object.keys(accepted).length, 4_096);
    assert.equal(resolvePython(accepted, createPythonFixture()).path, PYTHON_EXE);

    const keyBoundary = { ...base, ["K".repeat(256)]: "" };
    assert.equal(resolvePython(keyBoundary, createPythonFixture()).path, PYTHON_EXE);
    const valueBoundary = { ...base, VALUE: "v".repeat(32_768) };
    assert.equal(resolvePython(valueBoundary, createPythonFixture()).path, PYTHON_EXE);
    const aggregateSize = (environment) =>
      Object.entries(environment).reduce(
        (total, [key, value]) =>
          total + Buffer.byteLength(key, "utf8") + 1 + Buffer.byteLength(value, "utf8") + 1,
        0,
      );
    const aggregateBoundary = { ...base };
    aggregateBoundary.PAD1 = "p".repeat(32_768);
    const remaining = 65_536 - aggregateSize(aggregateBoundary) - Buffer.byteLength("PAD2") - 2;
    aggregateBoundary.PAD2 = "p".repeat(remaining);
    assert.equal(aggregateSize(aggregateBoundary), 65_536);
    assert.equal(resolvePython(aggregateBoundary, createPythonFixture()).path, PYTHON_EXE);

    const rows = [];
    const tooMany = { ...accepted, EXTRA: "" };
    rows.push(tooMany);
    rows.push({ ["K".repeat(257)]: "x" });
    rows.push({ K: "x".repeat(32_769) });
    rows.push({ ...aggregateBoundary, PAD2: `${aggregateBoundary.PAD2}x` });
    rows.push({ "BAD=KEY": "x" });
    rows.push({ "BAD\u0001KEY": "x" });
    rows.push({ K: "BAD\u0000VALUE" });
    const symbol = { PATH: PYTHON_ROOT };
    symbol[Symbol("private")] = "x";
    rows.push(symbol);
    for (const environment of rows) {
      assertPythonError(
        () => resolvePython(environment, createPythonFixture()),
        PYTHON_ERROR.environment,
      );
    }
  });

  await t.test("07 snapshots once and ignores caller mutation during spawn", () => {
    const environment = pythonEnvironment({ UNRELATED: "before" });
    const fixture = createPythonFixture({
      spawnOverride() {
        environment.UNRELATED = "after";
        environment.PATH = "C:\\private";
        return { status: 0, signal: null, error: undefined, stdout: PYTHON_STDOUT, stderr: "" };
      },
    });
    const result = testPythonBindingTesting.bindTestPythonEnvironmentWithDependencies(
      environment,
      fixture.dependencies,
    );
    assert.equal(result.environment.UNRELATED, "before");
    assert.equal(result.environment.PATH, undefined);
  });

  await t.test(
    "08 ignores inherited action roots markers and getters during local fallback",
    () => {
      let getterCount = 0;
      const prototype = Object.create(null);
      for (const key of ["pythonLocation", "Python_ROOT_DIR", "Python3_ROOT_DIR"]) {
        Object.defineProperty(prototype, key, {
          get() {
            getterCount += 1;
            return PYTHON_ROOT;
          },
        });
      }
      const environment = Object.assign(Object.create(prototype), {
        PATH: PYTHON_ROOT,
        SystemRoot: "C:\\Windows",
        WINDIR: "C:\\Windows",
      });
      const fixture = createPythonFixture();
      assert.equal(resolvePython(environment, fixture).path, PYTHON_EXE);
      assert.equal(getterCount, 0);
    },
  );

  await t.test("09 rejects every partial CI marker set without PATH fallback", () => {
    for (const key of Object.keys(PYTHON_MARKERS)) {
      const environment = {
        PATH: PYTHON_ROOT,
        SystemRoot: "C:\\Windows",
        WINDIR: "C:\\Windows",
        [key]: PYTHON_MARKERS[key],
      };
      const fixture = createPythonFixture();
      assertPythonError(() => resolvePython(environment, fixture), PYTHON_ERROR.ci);
      assert.deepEqual(fixture.calls, []);
    }
  });

  await t.test("10 rejects every wrong closed CI marker literal without PATH fallback", () => {
    for (const key of Object.keys(PYTHON_MARKERS)) {
      const environment = pythonEnvironment();
      environment[key] = `${PYTHON_MARKERS[key]}-wrong`;
      const fixture = createPythonFixture();
      assertPythonError(() => resolvePython(environment, fixture), PYTHON_ERROR.ci);
      assert.deepEqual(fixture.calls, []);
    }
  });

  await t.test("11 exact marker tuple and roots succeeds without PATH authority", () => {
    const environment = new Proxy(pythonEnvironment(), {
      getOwnPropertyDescriptor(target, key) {
        if (key === "PATH" || key === "Path") assert.fail("PATH descriptor requested");
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    assert.equal(resolvePython(environment, createPythonFixture()).path, PYTHON_EXE);
  });

  await t.test("12 exact markers with partial action roots rejects without PATH fallback", () => {
    for (const keys of [["pythonLocation"], ["pythonLocation", "Python_ROOT_DIR"]]) {
      const environment = {
        ...PYTHON_MARKERS,
        PATH: PYTHON_ROOT,
        SystemRoot: "C:\\Windows",
        WINDIR: "C:\\Windows",
      };
      for (const key of keys) environment[key] = PYTHON_ROOT;
      const fixture = createPythonFixture();
      assertPythonError(() => resolvePython(environment, fixture), PYTHON_ERROR.actionRoot);
      assert.deepEqual(fixture.calls, []);
    }
  });

  await t.test("13 rejects action-root triple case and lexical mismatches", () => {
    const fixture = createPythonFixture();
    assertPythonError(
      () => resolvePython(pythonEnvironment({ Python3_ROOT_DIR: "C:\\different" }), fixture),
      PYTHON_ERROR.actionRoot,
    );
    assert.deepEqual(fixture.calls, []);
  });

  await t.test("14 rejects every invalid lexical action root before filesystem access", () => {
    const invalid = [
      "",
      " C:\\Python",
      "relative",
      "C:/Python",
      'C:\\"Python',
      "C:\\Py\u0000thon",
      "C:\\Cafe\u0301",
      "\\\\server\\share",
      "\\\\?\\C:\\Python",
      "\\GLOBALROOT\\Device",
      "C:\\Python:stream",
      "C:\\.\\Python",
      "C:\\A\\..\\Python",
      "C:\\Python\\",
      "C:\\Python\\.",
    ];
    for (const root of invalid) {
      const fixture = createPythonFixture();
      assertPythonError(
        () =>
          resolvePython(
            pythonEnvironment({
              pythonLocation: root,
              Python_ROOT_DIR: root,
              Python3_ROOT_DIR: root,
            }),
            fixture,
          ),
        root.includes("\u0000") ? PYTHON_ERROR.environment : PYTHON_ERROR.actionRoot,
      );
      assert.deepEqual(fixture.calls, []);
    }
  });

  await t.test("15 rejects invalid drive roots", () => {
    for (const rootCase of [
      () => {
        throw new Error("PRIVATE_DRIVE_SENTINEL");
      },
      () => pythonFileStat(),
      () => pythonDirectoryStat({ link: true }),
    ]) {
      const fixture = createPythonFixture({
        lstatOverride: (path) => (path === "C:\\" ? rootCase() : undefined),
      });
      assertPythonError(
        () => resolvePython(pythonEnvironment(), fixture),
        PYTHON_ERROR.rootIdentity,
        ["PRIVATE_DRIVE_SENTINEL"],
      );
    }
  });

  await t.test("16 rejects a symlink or reparse identity at every ancestor segment", () => {
    const segments = [
      "C:\\hostedtoolcache",
      "C:\\hostedtoolcache\\windows",
      "C:\\hostedtoolcache\\windows\\Python",
      "C:\\hostedtoolcache\\windows\\Python\\3.12.10",
      PYTHON_ROOT,
    ];
    for (const target of segments) {
      const fixture = createPythonFixture({
        lstatOverride: (path) =>
          path === target ? pythonDirectoryStat({ link: true }) : undefined,
      });
      assertPythonError(
        () => resolvePython(pythonEnvironment(), fixture),
        PYTHON_ERROR.rootIdentity,
      );
    }
  });

  await t.test("17 rejects mounted-volume transitions at every segment and candidate", () => {
    const targets = [
      "C:\\hostedtoolcache",
      "C:\\hostedtoolcache\\windows",
      "C:\\hostedtoolcache\\windows\\Python",
      "C:\\hostedtoolcache\\windows\\Python\\3.12.10",
      PYTHON_ROOT,
      PYTHON_EXE,
    ];
    for (const target of targets) {
      const fixture = createPythonFixture({
        lstatOverride: (path) =>
          path === target
            ? path === PYTHON_EXE
              ? pythonFileStat({ dev: 9n })
              : pythonDirectoryStat({ dev: 9n })
            : undefined,
      });
      assertPythonError(
        () => resolvePython(pythonEnvironment(), fixture),
        target === PYTHON_EXE ? PYTHON_ERROR.executableIdentity : PYTHON_ERROR.rootIdentity,
      );
    }
  });

  await t.test("18 rejects ancestor canonical parent escape", () => {
    const fixture = createPythonFixture({
      realpathOverride: (path) =>
        path === "C:\\hostedtoolcache\\windows" ? "C:\\escape\\windows" : undefined,
    });
    assertPythonError(() => resolvePython(pythonEnvironment(), fixture), PYTHON_ERROR.rootIdentity);
  });

  await t.test("19 rejects declared and canonical segment identity mismatch", () => {
    const fixture = createPythonFixture();
    fixture.addRoot("C:\\HOSTED~1\\windows\\Python\\3.12.10\\x64", PYTHON_ROOT);
    fixture.state.lstatOverride = (path) =>
      path === "C:\\HOSTED~1" ? pythonDirectoryStat({ ino: 999n }) : undefined;
    const alias = "C:\\HOSTED~1\\windows\\Python\\3.12.10\\x64";
    assertPythonError(
      () =>
        resolvePython(
          pythonEnvironment({
            pythonLocation: alias,
            Python_ROOT_DIR: alias,
            Python3_ROOT_DIR: alias,
          }),
          fixture,
        ),
      PYTHON_ERROR.rootIdentity,
    );
  });

  await t.test(
    "20 accepts an 8.3 alias only through same segment identity and canonical parents",
    () => {
      const alias = "C:\\HOSTED~1\\windows\\Python\\3.12.10\\x64";
      const fixture = createPythonFixture();
      fixture.addRoot(alias, PYTHON_ROOT);
      const binding = resolvePython(
        pythonEnvironment({
          pythonLocation: alias,
          Python_ROOT_DIR: alias,
          Python3_ROOT_DIR: alias,
        }),
        fixture,
      );
      assert.equal(binding.path, PYTHON_EXE);
    },
  );

  await t.test("21 rejects missing nondirectory and final-symlink roots or executables", () => {
    const invalidStats = [
      () => {
        throw Object.assign(new Error("PRIVATE_ROOT_SENTINEL"), { code: "ENOENT" });
      },
      () => pythonFileStat(),
      () => ({ ...pythonDirectoryStat(), isSymbolicLink: () => true }),
    ];
    for (const rootCase of invalidStats) {
      const fixture = createPythonFixture({
        lstatOverride: (path) => (path === PYTHON_ROOT ? rootCase() : pythonFileStat()),
      });
      assertPythonError(
        () => resolvePython(pythonEnvironment(), fixture),
        PYTHON_ERROR.rootIdentity,
        ["PRIVATE_ROOT_SENTINEL"],
      );
    }
  });

  {
    for (const fileCase of [
      () => {
        throw new Error("PRIVATE_FILE_SENTINEL");
      },
      () => pythonDirectoryStat(),
      () => ({ ...pythonFileStat(), isSymbolicLink: () => true }),
    ]) {
      const fixture = createPythonFixture({
        lstatOverride: (path) => (path === PYTHON_EXE ? fileCase() : pythonDirectoryStat()),
      });
      assertPythonError(
        () => resolvePython(pythonEnvironment(), fixture),
        PYTHON_ERROR.executable,
        ["PRIVATE_FILE_SENTINEL"],
      );
    }
  }

  await t.test("22 rejects a candidate on a different device", () => {
    const fixture = createPythonFixture({
      lstatOverride: (path) => (path === PYTHON_EXE ? pythonFileStat({ dev: 9n }) : undefined),
    });
    assertPythonError(
      () => resolvePython(pythonEnvironment(), fixture),
      PYTHON_ERROR.executableIdentity,
    );
  });

  await t.test(
    "23 rejects a candidate whose realpath differs from the derived canonical candidate",
    () => {
      const fixture = createPythonFixture({
        realpathOverride: (path) => (path === PYTHON_EXE ? "C:\\Other\\python.exe" : undefined),
      });
      assertPythonError(
        () => resolvePython(pythonEnvironment(), fixture),
        PYTHON_ERROR.executableIdentity,
      );
    },
  );

  await t.test(
    "24 rejects executable identity drift immediately after the first read without spawning",
    () => {
      let candidateStats = 0;
      const fixture = createPythonFixture({
        lstatOverride(path) {
          if (path === PYTHON_EXE)
            return ++candidateStats === 1 ? pythonFileStat() : pythonFileStat({ ino: 44n });
          return pythonDirectoryStat();
        },
      });
      assertPythonError(
        () => resolvePython(pythonEnvironment(), fixture),
        PYTHON_ERROR.revalidation,
      );
      assert.equal(
        fixture.calls.some(([operation]) => operation === "spawn"),
        false,
      );
    },
  );

  {
    const rows = [
      (() => {
        const env = pythonEnvironment();
        delete env.SystemRoot;
        return env;
      })(),
      Object.defineProperty(pythonEnvironment(), "SystemRoot", { get: () => "C:\\Windows" }),
      pythonEnvironment({ SystemRoot: "relative" }),
      pythonEnvironment({ WINDIR: "C:\\WinNT" }),
    ];
    for (const environment of rows) {
      const fixture = createPythonFixture();
      assertPythonError(() => resolvePython(environment, fixture), PYTHON_ERROR.environment);
      assert.equal(
        fixture.calls.some(([operation]) => operation === "spawn"),
        false,
      );
    }
  }

  await t.test("25 action mode proves zero PATH shim access", () => {
    const fixture = createPythonFixture();
    resolvePython(
      pythonEnvironment({ TOKEN: "PRIVATE_TOKEN_SENTINEL", PATH: "C:\\shim" }),
      fixture,
    );
    const [, file, argv, options] = fixture.calls.find(([operation]) => operation === "spawn");
    assert.equal(file, PYTHON_EXE);
    assert.deepEqual(argv.slice(0, 4), ["-I", "-S", "-B", "-c"]);
    assert.match(argv[4], /^import hashlib,json,os,sys;/u);
    assert.deepEqual(Object.keys(options), [
      "cwd",
      "env",
      "encoding",
      "input",
      "stdio",
      "timeout",
      "maxBuffer",
      "windowsHide",
      "shell",
      "killSignal",
    ]);
    assert.deepEqual(options, {
      cwd: PYTHON_ROOT,
      env: {
        SystemRoot: "C:\\Windows",
        WINDIR: "C:\\Windows",
        PYTHONUTF8: "1",
        PYTHONDONTWRITEBYTECODE: "1",
        PYTHONNOUSERSITE: "1",
      },
      encoding: "utf8",
      input: undefined,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
      maxBuffer: 4_097,
      windowsHide: true,
      shell: false,
      killSignal: "SIGTERM",
    });
    assert.equal(JSON.stringify(options).includes("PRIVATE"), false);
    assert.equal(
      fixture.calls.some(([, path]) => path === "C:\\shim\\python.exe"),
      false,
    );
  });

  await t.test("26 invokes one exact child with the frozen argv and closed options", () => {
    const shim = "C:\\shim\\python.exe";
    const fixture = createPythonFixture();
    resolvePython(pythonEnvironment({ PATH: "C:\\shim" }), fixture);
    const spawns = fixture.calls.filter(([operation]) => operation === "spawn");
    assert.equal(spawns.length, 1);
    assert.equal(spawns[0][1], PYTHON_EXE);
    assert.deepEqual(spawns[0][2].slice(0, 4), ["-I", "-S", "-B", "-c"]);
    assert.equal(spawns[0][3].maxBuffer, 4097);
    assert.equal(spawns[0][3].shell, false);
    assert.equal(
      fixture.calls.some(([, path]) => path === shim),
      false,
    );
  });

  await t.test("27 spawns exactly once and never retries", () => {
    const fixture = createPythonFixture();
    assert.equal(resolvePython(pythonEnvironment(), fixture).path, PYTHON_EXE);
    assert.equal(fixture.calls.filter(([operation]) => operation === "spawn").length, 1);
  });

  await t.test("28 sanitizes spawn throws after exact post-revalidation", () => {
    const fixture = createPythonFixture({ spawnThrow: new Error("PRIVATE_CAUSE_SENTINEL") });
    assertPythonError(
      () => resolvePython(pythonEnvironment(), fixture),
      PYTHON_ERROR.introspection,
      ["PRIVATE_CAUSE_SENTINEL"],
    );
    assert.equal(fixture.calls.filter(([operation]) => operation === "spawn").length, 1);
  });

  await t.test("29 classifies timeout only after revalidation with no retry", () => {
    const fixture = createPythonFixture({
      spawnResult: {
        error: { code: "ETIMEDOUT" },
        status: null,
        signal: "SIGTERM",
        stdout: "",
        stderr: "",
      },
    });
    assertPythonError(() => resolvePython(pythonEnvironment(), fixture), PYTHON_ERROR.timeout);
    assert.equal(fixture.calls.filter(([operation]) => operation === "spawn").length, 1);
  });

  await t.test("30 rejects nonzero null-status and signaled children", () => {
    for (const row of [
      { status: 1, signal: null },
      { status: null, signal: null },
      { status: 0, signal: "SIGTERM" },
    ]) {
      const fixture = createPythonFixture({
        spawnResult: { ...row, error: undefined, stdout: "", stderr: "" },
      });
      assertPythonError(
        () => resolvePython(pythonEnvironment(), fixture),
        PYTHON_ERROR.introspection,
      );
    }
  });

  await t.test("31 enforces the exact 4096-byte combined output boundary", () => {
    for (const row of [
      { stdout: Buffer.from("x"), stderr: "" },
      { stdout: "", stderr: Buffer.from("x") },
      { stdout: "x".repeat(4097), stderr: "" },
    ]) {
      const fixture = createPythonFixture({
        spawnResult: { status: 0, signal: null, error: undefined, ...row },
      });
      assertPythonError(() => resolvePython(pythonEnvironment(), fixture), PYTHON_ERROR.output);
    }
    const fixture = createPythonFixture();
    resolvePython(pythonEnvironment(), fixture);
    const spawnCall = fixture.calls.find(([operation]) => operation === "spawn");
    assert.equal(spawnCall[3].maxBuffer, 4097);

    const baseReported = "C:\\a\\python.exe";
    const baseStdout = `${JSON.stringify({ executable: baseReported, sha256: PYTHON_SHA256, version: [3, 12, 10] })}\r\n`;
    const reported = `C:\\${"a".repeat(1 + 4096 - Buffer.byteLength(baseStdout, "utf8"))}\\python.exe`;
    const stdout = `${JSON.stringify({ executable: reported, sha256: PYTHON_SHA256, version: [3, 12, 10] })}\r\n`;
    assert.equal(Buffer.byteLength(stdout, "utf8"), 4096);
    const exact = createPythonFixture({
      spawnResult: { status: 0, signal: null, error: undefined, stdout, stderr: "" },
      realpathOverride: (path) => (path === reported ? PYTHON_EXE : undefined),
    });
    assert.equal(resolvePython(pythonEnvironment(), exact).path, PYTHON_EXE);
  });

  await t.test("32 rejects nonempty stderr without leaking private bytes", () => {
    const fixture = createPythonFixture({
      spawnResult: {
        status: 0,
        signal: null,
        error: undefined,
        stdout: PYTHON_STDOUT,
        stderr: "PRIVATE_STDERR_SENTINEL",
      },
    });
    assertPythonError(() => resolvePython(pythonEnvironment(), fixture), PYTHON_ERROR.output, [
      "PRIVATE_STDERR_SENTINEL",
    ]);
  });

  await t.test("33 rejects nonstring streams malformed JSON and nonobject JSON values", () => {
    for (const stdout of ["{\r\n", "null\r\n", "[]\r\n"]) {
      const fixture = createPythonFixture({
        spawnResult: { status: 0, signal: null, error: undefined, stdout, stderr: "" },
      });
      assertPythonError(() => resolvePython(pythonEnvironment(), fixture), PYTHON_ERROR.output);
    }
  });

  await t.test("34 rejects BOM whitespace wrong newline trailing bytes and second objects", () => {
    const canonical = PYTHON_STDOUT.slice(0, -2);
    for (const stdout of [
      `\ufeff${PYTHON_STDOUT}`,
      ` ${PYTHON_STDOUT}`,
      canonical,
      `${canonical}\n`,
      `${PYTHON_STDOUT}\r\n`,
      `${PYTHON_STDOUT} `,
      `${PYTHON_STDOUT}${PYTHON_STDOUT}`,
    ]) {
      const fixture = createPythonFixture({
        spawnResult: { status: 0, signal: null, error: undefined, stdout, stderr: "" },
      });
      assertPythonError(() => resolvePython(pythonEnvironment(), fixture), PYTHON_ERROR.output);
    }
  });

  await t.test("35 rejects missing extra reordered old and noncanonical keys", () => {
    for (const payload of [
      { executable: PYTHON_EXE },
      { executable: PYTHON_EXE, sha256: PYTHON_SHA256, version: [3, 12, 10], extra: true },
      { version: [3, 12, 10], sha256: PYTHON_SHA256, executable: PYTHON_EXE },
      { executable: PYTHON_EXE, version: [3, 12, 10] },
    ]) {
      const stdout = `${JSON.stringify(payload)}\r\n`;
      const fixture = createPythonFixture({
        spawnResult: { status: 0, signal: null, error: undefined, stdout, stderr: "" },
      });
      assertPythonError(() => resolvePython(pythonEnvironment(), fixture), PYTHON_ERROR.output);
    }
  });

  await t.test("36 rejects malformed reported executable paths", () => {
    for (const executable of [
      1,
      "Cafe\u0301",
      "relative",
      "C:/Python/python.exe",
      "C:\\A\\..\\python.exe",
    ]) {
      const stdout = `${JSON.stringify({ executable, sha256: PYTHON_SHA256, version: [3, 12, 10] })}\r\n`;
      const fixture = createPythonFixture({
        spawnResult: { status: 0, signal: null, error: undefined, stdout, stderr: "" },
      });
      assertPythonError(() => resolvePython(pythonEnvironment(), fixture), PYTHON_ERROR.output);
    }
  });

  await t.test("37 rejects reported executable identity mismatch and lookup errors", () => {
    for (const realpathOverride of [
      (path, calls) =>
        path === PYTHON_EXE && calls.filter(([operation]) => operation === "realpath").length >= 6
          ? "C:\\Other\\python.exe"
          : path,
      (path, calls) => {
        if (
          path === PYTHON_EXE &&
          calls.filter(([operation]) => operation === "realpath").length >= 6
        )
          throw new Error("PRIVATE_ID_SENTINEL");
        return path;
      },
    ]) {
      const fixture = createPythonFixture({ realpathOverride });
      assertPythonError(
        () => resolvePython(pythonEnvironment(), fixture),
        PYTHON_ERROR.executableIdentity,
        ["PRIVATE_ID_SENTINEL"],
      );
    }
  });

  await t.test("38 rejects malformed executable self hashes as output", () => {
    for (const sha256 of [1, "A".repeat(64), "a".repeat(63), "g".repeat(64)]) {
      const stdout = `${JSON.stringify({ executable: PYTHON_EXE, sha256, version: [3, 12, 10] })}\r\n`;
      const fixture = createPythonFixture({
        spawnResult: { status: 0, signal: null, error: undefined, stdout, stderr: "" },
      });
      assertPythonError(() => resolvePython(pythonEnvironment(), fixture), PYTHON_ERROR.output);
    }
  });

  await t.test("39 rejects swap-during-child restore through child self hash", () => {
    const swappedHash = createHash("sha256").update("SWAPPED_FIXTURE").digest("hex");
    const stdout = `${JSON.stringify({ executable: PYTHON_EXE, sha256: swappedHash, version: [3, 12, 10] })}\r\n`;
    const fixture = createPythonFixture({
      spawnResult: { status: 0, signal: null, error: undefined, stdout, stderr: "" },
    });
    assertPythonError(() => resolvePython(pythonEnvironment(), fixture), PYTHON_ERROR.content);
    assert.equal(fixture.calls.filter(([operation]) => operation === "spawn").length, 1);
  });

  await t.test("40 rejects invalid version shapes and numeric ranges", () => {
    const versions = [
      null,
      [3, 12],
      [3, 12, 10, 0],
      [3, 12, 1.5],
      [3, 12, Number.MAX_SAFE_INTEGER + 1],
      [3, 12, -1],
      [3, 12, 65_536],
    ];
    for (const version of versions) {
      const stdout = `${JSON.stringify({ executable: PYTHON_EXE, sha256: PYTHON_SHA256, version })}\r\n`;
      const fixture = createPythonFixture({
        spawnResult: { status: 0, signal: null, error: undefined, stdout, stderr: "" },
      });
      assertPythonError(() => resolvePython(pythonEnvironment(), fixture), PYTHON_ERROR.version);
    }
  });

  await t.test("41 requires exact Python major and minor versions", () => {
    for (const version of [
      [2, 12, 10],
      [3, 11, 10],
      [4, 12, 10],
    ]) {
      const stdout = `${JSON.stringify({ executable: PYTHON_EXE, sha256: PYTHON_SHA256, version })}\r\n`;
      const fixture = createPythonFixture({
        spawnResult: { status: 0, signal: null, error: undefined, stdout, stderr: "" },
      });
      assertPythonError(() => resolvePython(pythonEnvironment(), fixture), PYTHON_ERROR.version);
    }
  });

  await t.test("42 gives post-spawn ancestor drift precedence over child failures", () => {
    for (const target of ["C:\\hostedtoolcache", PYTHON_ROOT]) {
      let spawned = false;
      const fixture = createPythonFixture({
        spawnOverride() {
          spawned = true;
          return {
            status: 1,
            signal: null,
            error: { code: "ETIMEDOUT" },
            stdout: "PRIVATE_STDOUT_SENTINEL",
            stderr: "PRIVATE_STDERR_SENTINEL",
          };
        },
        lstatOverride(path) {
          return spawned && path === target ? pythonDirectoryStat({ ino: 99n }) : undefined;
        },
      });
      assertPythonError(
        () => resolvePython(pythonEnvironment(), fixture),
        PYTHON_ERROR.revalidation,
        ["PRIVATE_STDOUT_SENTINEL", "PRIVATE_STDERR_SENTINEL"],
      );
    }
  });

  await t.test("43 gives post-spawn candidate identity or hash drift precedence", () => {
    for (const mutation of ["candidate", "hash"]) {
      let spawned = false;
      const fixture = createPythonFixture({
        spawnOverride() {
          spawned = true;
          return {
            status: 1,
            signal: null,
            error: { code: "ETIMEDOUT" },
            stdout: "PRIVATE_STDOUT_SENTINEL",
            stderr: "PRIVATE_STDERR_SENTINEL",
          };
        },
        lstatOverride(path) {
          return spawned && mutation === "candidate" && path === PYTHON_EXE
            ? pythonFileStat({ ino: 99n })
            : undefined;
        },
        readFileOverride(path) {
          return spawned && mutation === "hash" && path === PYTHON_EXE
            ? Buffer.from("CHANGED_FIXTURE")
            : undefined;
        },
      });
      assertPythonError(
        () => resolvePython(pythonEnvironment(), fixture),
        PYTHON_ERROR.revalidation,
        ["PRIVATE_STDOUT_SENTINEL", "PRIVATE_STDERR_SENTINEL"],
      );
    }
  });

  await t.test(
    "44 returns exact frozen resolve and binder results from one snapshot and spawn",
    () => {
      const environment = pythonEnvironment({ UNRELATED: "preserved" });
      const before = Object.getOwnPropertyDescriptors(environment);
      const fixture = createPythonFixture();
      const result = testPythonBindingTesting.bindTestPythonEnvironmentWithDependencies(
        environment,
        fixture.dependencies,
      );
      const { binding } = result;
      assert.deepEqual(Object.keys(result), ["binding", "environment"]);
      assert.deepEqual(Object.keys(binding), ["path", "sha256", "version"]);
      assert.deepEqual(binding, { path: PYTHON_EXE, sha256: PYTHON_SHA256, version: "3.12.10" });
      assert.equal(Object.isFrozen(result), true);
      assert.equal(Object.isFrozen(binding), true);
      assert.equal(Object.isFrozen(result.environment), true);
      assert.notEqual(result.environment, environment);
      assert.equal(result.environment.UNRELATED, "preserved");
      assert.equal(result.environment.FLUYO_R4B_TEST_PYTHON, PYTHON_EXE);
      assert.equal(result.environment.FLUYO_R4B_TEST_PYTHON_SHA256, PYTHON_SHA256);
      assert.equal(fixture.calls.filter(([operation]) => operation === "spawn").length, 1);
      assert.deepEqual(Object.getOwnPropertyDescriptors(environment), before);
    },
  );

  await t.test(
    "45 local mode chooses and spawns the first structurally valid PATH candidate once",
    () => {
      const local = { PATH: `"${PYTHON_ROOT}"`, SystemRoot: "C:\\Windows", WINDIR: "C:\\Windows" };
      const fixture = createPythonFixture();
      assert.equal(resolvePython(local, fixture).path, PYTHON_EXE);
      assert.equal(fixture.calls.filter(([operation]) => operation === "spawn").length, 1);
    },
  );

  await t.test("46 local mode skips structurally invalid candidates before the first valid", () => {
    const invalidRoot = "C:\\missing";
    const fixture = createPythonFixture();
    const environment = {
      PATH: `${invalidRoot};${PYTHON_ROOT}`,
      SystemRoot: "C:\\Windows",
      WINDIR: "C:\\Windows",
    };
    assert.equal(resolvePython(environment, fixture).path, PYTHON_EXE);
    assert.equal(fixture.calls.filter(([operation]) => operation === "spawn").length, 1);
  });

  await t.test("47 first structurally valid candidate runtime failure is terminal", () => {
    const laterRoot = "C:\\later";
    for (const spawnResult of [
      { status: 1, signal: null, error: undefined, stdout: "", stderr: "" },
      { status: 0, signal: null, error: undefined, stdout: "bad\r\n", stderr: "" },
    ]) {
      const fixture = createPythonFixture({ spawnResult });
      fixture.addRoot(laterRoot);
      const environment = {
        PATH: `${PYTHON_ROOT};${laterRoot}`,
        SystemRoot: "C:\\Windows",
        WINDIR: "C:\\Windows",
      };
      assertPythonError(
        () => resolvePython(environment, fixture),
        spawnResult.status === 1 ? PYTHON_ERROR.introspection : PYTHON_ERROR.output,
      );
      assert.equal(fixture.calls.filter(([operation]) => operation === "spawn").length, 1);
      assert.equal(
        fixture.calls.some(
          ([, path]) =>
            typeof path === "string" && path.toLowerCase().startsWith(laterRoot.toLowerCase()),
        ),
        false,
      );
    }
  });

  await t.test("48 bounds PATH syntax and reports only environment or unavailable", () => {
    const local = { PATH: `"${PYTHON_ROOT}"`, SystemRoot: "C:\\Windows", WINDIR: "C:\\Windows" };
    for (const environment of [
      { ...local, Path: "C:\\other" },
      { ...local, PATH: "" },
      { ...local, PATH: "x".repeat(32_769) },
      { ...local, PATH: Array.from({ length: 65 }, (_, index) => `C:\\P${index}`).join(";") },
    ]) {
      assertPythonError(
        () => resolvePython(environment, createPythonFixture()),
        PYTHON_ERROR.environment,
      );
    }
    const unavailable = createPythonFixture({
      lstatOverride: () => {
        throw new Error("PRIVATE_PATH_SENTINEL");
      },
    });
    assertPythonError(() => resolvePython(local, unavailable), PYTHON_ERROR.pathUnavailable, [
      "PRIVATE_PATH_SENTINEL",
    ]);
  });

  await t.test("49 partial CI or action signals prove zero PATH fallback and fixed errors", () => {
    for (const environment of [
      { PATH: PYTHON_ROOT, SystemRoot: "C:\\Windows", WINDIR: "C:\\Windows", CI: "true" },
      {
        PATH: PYTHON_ROOT,
        SystemRoot: "C:\\Windows",
        WINDIR: "C:\\Windows",
        pythonLocation: PYTHON_ROOT,
      },
    ]) {
      const fixture = createPythonFixture();
      assertPythonError(() => resolvePython(environment, fixture), PYTHON_ERROR.ci, [
        "PRIVATE_PATH_SENTINEL",
      ]);
      assert.deepEqual(fixture.calls, []);
    }
  });

  await t.test(
    "50 canonicalizes unambiguous Windows environment key casing and rejects collisions",
    () => {
      for (const environment of [
        pythonEnvironment(),
        (() => {
          const value = pythonEnvironment();
          delete value.SystemRoot;
          delete value.windir;
          value.sYsTeMrOoT = "C:\\Windows";
          value.WiNdIr = "C:\\Windows";
          return value;
        })(),
      ]) {
        const fixture = createPythonFixture();
        const result = testPythonBindingTesting.bindTestPythonEnvironmentWithDependencies(
          environment,
          fixture.dependencies,
        );
        const spawnCall = fixture.calls.find(([operation]) => operation === "spawn");
        assert.deepEqual(Object.keys(spawnCall[3].env), [
          "SystemRoot",
          "WINDIR",
          "PYTHONUTF8",
          "PYTHONDONTWRITEBYTECODE",
          "PYTHONNOUSERSITE",
        ]);
        assert.equal(spawnCall[3].env.SystemRoot, "C:\\Windows");
        assert.equal(spawnCall[3].env.WINDIR, "C:\\Windows");
        assert.equal(Object.hasOwn(spawnCall[3].env, "windir"), false);
        for (const key of ["windir", "WiNdIr", "sYsTeMrOoT"]) {
          if (Object.hasOwn(environment, key)) {
            assert.equal(Object.hasOwn(result.environment, key), true);
          }
        }
        if (!Object.hasOwn(environment, "WINDIR")) {
          assert.equal(Object.hasOwn(result.environment, "WINDIR"), false);
        }
      }

      const collisionRows = [
        { WINDIR: "C:\\Windows", windir: "C:\\Windows" },
        { WINDIR: "C:\\WinNT", windir: "C:\\Windows" },
        { SYSTEMROOT: "C:\\Windows", SystemRoot: "C:\\Windows" },
        { SYSTEMROOT: "C:\\WinNT", SystemRoot: "C:\\Windows" },
      ];
      for (const row of collisionRows) {
        const fixture = createPythonFixture();
        assertPythonError(
          () => resolvePython(pythonEnvironment(row), fixture),
          PYTHON_ERROR.environment,
          ["PRIVATE_SYSTEM_KEY_SENTINEL"],
        );
        assert.equal(fixture.calls.length, 0);
      }

      let getterCount = 0;
      const accessor = pythonEnvironment();
      delete accessor.windir;
      Object.defineProperty(accessor, "wInDiR", {
        enumerable: true,
        get() {
          getterCount += 1;
          return "PRIVATE_SYSTEM_VALUE_SENTINEL";
        },
      });
      for (const environment of [accessor, pythonEnvironment({ windir: 1 })]) {
        const fixture = createPythonFixture();
        assertPythonError(() => resolvePython(environment, fixture), PYTHON_ERROR.environment, [
          "PRIVATE_SYSTEM_VALUE_SENTINEL",
        ]);
        assert.equal(fixture.calls.length, 0);
      }
      assert.equal(getterCount, 0);

      for (const environment of [
        (() => {
          const value = pythonEnvironment();
          delete value.windir;
          return value;
        })(),
        pythonEnvironment({ windir: "C:\\WinNT" }),
      ]) {
        assertPythonError(
          () => resolvePython(environment, createPythonFixture()),
          PYTHON_ERROR.environment,
        );
      }

      const unrelated = pythonEnvironment({ Alpha: "one", ALPHA: "two" });
      const unrelatedResult = testPythonBindingTesting.bindTestPythonEnvironmentWithDependencies(
        unrelated,
        createPythonFixture().dependencies,
      );
      assert.equal(unrelatedResult.environment.Alpha, "one");
      assert.equal(unrelatedResult.environment.ALPHA, "two");

      for (const environment of [
        {
          github_actions: "true",
          PATH: PYTHON_ROOT,
          SystemRoot: "C:\\Windows",
          windir: "C:\\Windows",
        },
        { ci: "true", PATH: PYTHON_ROOT, SystemRoot: "C:\\Windows", windir: "C:\\Windows" },
        {
          runner_os: "Windows",
          PATH: PYTHON_ROOT,
          SystemRoot: "C:\\Windows",
          windir: "C:\\Windows",
        },
        {
          pythonlocation: PYTHON_ROOT,
          PATH: PYTHON_ROOT,
          SystemRoot: "C:\\Windows",
          windir: "C:\\Windows",
        },
        { path: PYTHON_ROOT, SystemRoot: "C:\\Windows", windir: "C:\\Windows" },
      ]) {
        if (Object.hasOwn(environment, "path")) {
          assertPythonError(
            () => resolvePython(environment, createPythonFixture()),
            PYTHON_ERROR.environment,
          );
        } else {
          assert.equal(resolvePython(environment, createPythonFixture()).path, PYTHON_EXE);
        }
      }
      for (const key of ["fluyo_r4b_test_python", "FlUyO_R4B_TEST_PYTHON_SHA256"]) {
        const environment = pythonEnvironment({ [key]: "PRIVATE_SYSTEM_KEY_SENTINEL" });
        const result = testPythonBindingTesting.bindTestPythonEnvironmentWithDependencies(
          environment,
          createPythonFixture().dependencies,
        );
        assert.equal(result.environment[key], "PRIVATE_SYSTEM_KEY_SENTINEL");
      }
    },
  );
});

test("emits one closed Python-binding diagnostic without raw process evidence", async (t) => {
  const assertDiagnostic = (record, candidateClass, stage, failureCode) => {
    assert.deepEqual(Object.keys(record), [
      "schema",
      "outcome",
      "candidateClass",
      "stage",
      "failureCode",
    ]);
    assert.equal(record.schema, "fluyo:r4b:test-python-binding-diagnostic:v1");
    assert.equal(record.outcome, stage === "SUCCESS" ? "PASS" : "FAIL");
    assert.equal(record.candidateClass, candidateClass);
    assert.equal(record.stage, stage);
    assert.equal(record.failureCode, failureCode);
    assert.ok(Buffer.byteLength(`${JSON.stringify(record)}\n`, "utf8") <= 512);
  };

  await t.test("01 reports ACTION_ROOT success", () => {
    assertDiagnostic(
      diagnosePython(pythonEnvironment(), createPythonFixture()),
      "ACTION_ROOT",
      "SUCCESS",
      null,
    );
  });

  await t.test("02 reports LOCAL_PATH success for the first structural candidate", () => {
    const environment = { PATH: PYTHON_ROOT, SystemRoot: "C:\\Windows", windir: "C:\\Windows" };
    const fixture = createPythonFixture();
    assertDiagnostic(diagnosePython(environment, fixture), "LOCAL_PATH", "SUCCESS", null);
    assert.equal(fixture.calls.filter(([operation]) => operation === "spawn").length, 1);
  });

  await t.test("03 reports synchronous spawn throw", () => {
    const fixture = createPythonFixture({ spawnThrow: new Error("PRIVATE_CAUSE_SENTINEL") });
    assertDiagnostic(
      diagnosePython(pythonEnvironment(), fixture),
      "ACTION_ROOT",
      "SPAWN_THROW",
      PYTHON_ERROR.introspection,
    );
  });

  await t.test("04 reports timeout", () => {
    const fixture = createPythonFixture({
      spawnResult: {
        error: { code: "ETIMEDOUT" },
        status: null,
        signal: "SIGTERM",
        stdout: "",
        stderr: "",
      },
    });
    assertDiagnostic(
      diagnosePython(pythonEnvironment(), fixture),
      "ACTION_ROOT",
      "SPAWN_TIMEOUT",
      PYTHON_ERROR.timeout,
    );
  });

  await t.test("05 reports nonzero null-status and signal", () => {
    for (const row of [
      { status: 1, signal: null },
      { status: null, signal: null },
      { status: 0, signal: "SIGTERM" },
    ]) {
      const fixture = createPythonFixture({
        spawnResult: { ...row, error: undefined, stdout: "", stderr: "" },
      });
      assertDiagnostic(
        diagnosePython(pythonEnvironment(), fixture),
        "ACTION_ROOT",
        "CHILD_NONZERO_OR_SIGNAL",
        PYTHON_ERROR.introspection,
      );
    }
  });

  await t.test("06 reports pre-spawn revalidation", () => {
    let reads = 0;
    const fixture = createPythonFixture({
      readFileOverride: (path) =>
        path === PYTHON_EXE && ++reads > 1 ? Buffer.from("DRIFT") : undefined,
    });
    assertDiagnostic(
      diagnosePython(pythonEnvironment(), fixture),
      "ACTION_ROOT",
      "PRE_SPAWN_REVALIDATION",
      PYTHON_ERROR.revalidation,
    );
    assert.equal(
      fixture.calls.some(([operation]) => operation === "spawn"),
      false,
    );
  });

  await t.test("07 post-spawn revalidation outranks pending child", () => {
    let spawned = false;
    const fixture = createPythonFixture({
      spawnOverride() {
        spawned = true;
        return { status: 1, signal: null, error: undefined, stdout: "PRIVATE_STDOUT", stderr: "" };
      },
      lstatOverride(path) {
        return spawned && path === PYTHON_EXE ? pythonFileStat({ ino: 999n }) : undefined;
      },
    });
    assertDiagnostic(
      diagnosePython(pythonEnvironment(), fixture),
      "ACTION_ROOT",
      "POST_SPAWN_REVALIDATION",
      PYTHON_ERROR.revalidation,
    );
  });

  await t.test("08 classifies stream cap and stderr stages", () => {
    const rows = [
      [
        { status: 0, signal: null, error: undefined, stdout: Buffer.from("x"), stderr: "" },
        "STREAM_TYPE",
      ],
      [
        { status: 0, signal: null, error: undefined, stdout: "x".repeat(4097), stderr: "" },
        "COMBINED_OUTPUT_LIMIT",
      ],
      [
        {
          status: 0,
          signal: null,
          error: undefined,
          stdout: PYTHON_STDOUT,
          stderr: "PRIVATE_STDERR",
        },
        "STDERR_NONEMPTY",
      ],
    ];
    for (const [spawnResult, stage] of rows) {
      assertDiagnostic(
        diagnosePython(pythonEnvironment(), createPythonFixture({ spawnResult })),
        "ACTION_ROOT",
        stage,
        PYTHON_ERROR.output,
      );
    }
  });

  await t.test("09 classifies framing JSON parse and schema stages", () => {
    const rows = [
      ["bad", "STDOUT_FRAMING"],
      ["{bad}\r\n", "JSON_PARSE"],
      [`${JSON.stringify({ executable: PYTHON_EXE })}\r\n`, "JSON_SCHEMA"],
    ];
    for (const [stdout, stage] of rows) {
      const spawnResult = { status: 0, signal: null, error: undefined, stdout, stderr: "" };
      assertDiagnostic(
        diagnosePython(pythonEnvironment(), createPythonFixture({ spawnResult })),
        "ACTION_ROOT",
        stage,
        PYTHON_ERROR.output,
      );
    }
  });

  await t.test("10 classifies executable self-hash and version stages", () => {
    const other = "C:\\Other\\python.exe";
    const execFixture = createPythonFixture({
      realpathOverride: (path) => (path === other ? other : undefined),
      spawnResult: {
        status: 0,
        signal: null,
        error: undefined,
        stdout: `${JSON.stringify({ executable: other, sha256: PYTHON_SHA256, version: [3, 12, 10] })}\r\n`,
        stderr: "",
      },
    });
    assertDiagnostic(
      diagnosePython(pythonEnvironment(), execFixture),
      "ACTION_ROOT",
      "REPORTED_EXECUTABLE_IDENTITY",
      PYTHON_ERROR.executableIdentity,
    );
    for (const [payload, stage, code] of [
      [
        { executable: PYTHON_EXE, sha256: "0".repeat(64), version: [3, 12, 10] },
        "SELF_HASH_MISMATCH",
        PYTHON_ERROR.content,
      ],
      [
        { executable: PYTHON_EXE, sha256: PYTHON_SHA256, version: [3, 11, 10] },
        "VERSION_INVALID",
        PYTHON_ERROR.version,
      ],
    ]) {
      const spawnResult = {
        status: 0,
        signal: null,
        error: undefined,
        stdout: `${JSON.stringify(payload)}\r\n`,
        stderr: "",
      };
      assertDiagnostic(
        diagnosePython(pythonEnvironment(), createPythonFixture({ spawnResult })),
        "ACTION_ROOT",
        stage,
        code,
      );
    }
  });

  await t.test("11 every record is closed bounded and contains no private evidence", () => {
    assert.deepEqual(Object.keys(testPythonBindingTesting), [
      "resolveTestPythonBindingWithDependencies",
      "bindTestPythonEnvironmentWithDependencies",
      "diagnoseTestPythonBindingWithDependencies",
      "diagnosticRecordForTesting",
    ]);
    assert.equal(Object.isFrozen(testPythonBindingTesting), true);
    const validTuples = [
      ["ACTION_ROOT", "SUCCESS", null],
      ["LOCAL_PATH", "SUCCESS", null],
      ["NONE", "USAGE_INVALID", "TEST_PYTHON_DIAGNOSTIC_USAGE_INVALID"],
      ["NONE", "ENVIRONMENT_OR_MODE", PYTHON_ERROR.platform],
      ["NONE", "ENVIRONMENT_OR_MODE", PYTHON_ERROR.internal],
      ["NONE", "ENVIRONMENT_OR_MODE", PYTHON_ERROR.environment],
      ["NONE", "ENVIRONMENT_OR_MODE", PYTHON_ERROR.ci],
      ["NONE", "ENVIRONMENT_OR_MODE", PYTHON_ERROR.actionRoot],
      ["ACTION_ROOT", "ENVIRONMENT_OR_MODE", PYTHON_ERROR.rootIdentity],
      ["ACTION_ROOT", "ENVIRONMENT_OR_MODE", PYTHON_ERROR.executable],
      ["ACTION_ROOT", "ENVIRONMENT_OR_MODE", PYTHON_ERROR.executableIdentity],
      ["ACTION_ROOT", "ENVIRONMENT_OR_MODE", PYTHON_ERROR.revalidation],
      ["NONE", "NO_STRUCTURAL_CANDIDATE", PYTHON_ERROR.pathUnavailable],
      ["ACTION_ROOT", "PRE_SPAWN_REVALIDATION", PYTHON_ERROR.revalidation],
      ["LOCAL_PATH", "PRE_SPAWN_REVALIDATION", PYTHON_ERROR.revalidation],
      ["ACTION_ROOT", "SPAWN_THROW", PYTHON_ERROR.introspection],
      ["LOCAL_PATH", "SPAWN_THROW", PYTHON_ERROR.introspection],
      ["ACTION_ROOT", "SPAWN_TIMEOUT", PYTHON_ERROR.timeout],
      ["LOCAL_PATH", "SPAWN_TIMEOUT", PYTHON_ERROR.timeout],
      ["ACTION_ROOT", "CHILD_NONZERO_OR_SIGNAL", PYTHON_ERROR.introspection],
      ["LOCAL_PATH", "CHILD_NONZERO_OR_SIGNAL", PYTHON_ERROR.introspection],
      ["ACTION_ROOT", "STREAM_TYPE", PYTHON_ERROR.output],
      ["LOCAL_PATH", "STREAM_TYPE", PYTHON_ERROR.output],
      ["ACTION_ROOT", "COMBINED_OUTPUT_LIMIT", PYTHON_ERROR.output],
      ["LOCAL_PATH", "COMBINED_OUTPUT_LIMIT", PYTHON_ERROR.output],
      ["ACTION_ROOT", "STDERR_NONEMPTY", PYTHON_ERROR.output],
      ["LOCAL_PATH", "STDERR_NONEMPTY", PYTHON_ERROR.output],
      ["ACTION_ROOT", "STDOUT_FRAMING", PYTHON_ERROR.output],
      ["LOCAL_PATH", "STDOUT_FRAMING", PYTHON_ERROR.output],
      ["ACTION_ROOT", "JSON_PARSE", PYTHON_ERROR.output],
      ["LOCAL_PATH", "JSON_PARSE", PYTHON_ERROR.output],
      ["ACTION_ROOT", "JSON_SCHEMA", PYTHON_ERROR.output],
      ["LOCAL_PATH", "JSON_SCHEMA", PYTHON_ERROR.output],
      ["ACTION_ROOT", "REPORTED_EXECUTABLE_IDENTITY", PYTHON_ERROR.executableIdentity],
      ["LOCAL_PATH", "REPORTED_EXECUTABLE_IDENTITY", PYTHON_ERROR.executableIdentity],
      ["ACTION_ROOT", "SELF_HASH_MISMATCH", PYTHON_ERROR.content],
      ["LOCAL_PATH", "SELF_HASH_MISMATCH", PYTHON_ERROR.content],
      ["ACTION_ROOT", "VERSION_INVALID", PYTHON_ERROR.version],
      ["LOCAL_PATH", "VERSION_INVALID", PYTHON_ERROR.version],
      ["ACTION_ROOT", "POST_SPAWN_REVALIDATION", PYTHON_ERROR.revalidation],
      ["LOCAL_PATH", "POST_SPAWN_REVALIDATION", PYTHON_ERROR.revalidation],
      ["NONE", "INTERNAL_FIXED_FAILURE", "TEST_PYTHON_DIAGNOSTIC_INTERNAL_FAILURE"],
    ];
    assert.equal(validTuples.length, 42);
    for (const [candidateClass, stage, failureCode] of validTuples) {
      assertDiagnostic(
        testPythonBindingTesting.diagnosticRecordForTesting(candidateClass, stage, failureCode),
        candidateClass,
        stage,
        failureCode,
      );
    }

    const rootIdentityFixture = createPythonFixture({
      lstatOverride: (path) => (path === "C:\\" ? pythonDirectoryStat({ link: true }) : undefined),
    });
    const executableFixture = createPythonFixture({
      lstatOverride: (path) =>
        path.toLowerCase() === PYTHON_EXE.toLowerCase() ? pythonDirectoryStat() : undefined,
    });
    const executableIdentityFixture = createPythonFixture({
      lstatOverride: (path) =>
        path.toLowerCase() === PYTHON_EXE.toLowerCase() ? pythonFileStat({ dev: 2n }) : undefined,
    });
    let executableStatCalls = 0;
    const revalidationFixture = createPythonFixture({
      lstatOverride: (path) => {
        if (path.toLowerCase() !== PYTHON_EXE.toLowerCase()) return undefined;
        executableStatCalls += 1;
        return executableStatCalls > 1 ? pythonFileStat({ ino: 999n }) : undefined;
      },
    });
    for (const [fixture, code] of [
      [rootIdentityFixture, PYTHON_ERROR.rootIdentity],
      [executableFixture, PYTHON_ERROR.executable],
      [executableIdentityFixture, PYTHON_ERROR.executableIdentity],
      [revalidationFixture, PYTHON_ERROR.revalidation],
    ]) {
      assertDiagnostic(
        diagnosePython(pythonEnvironment(), fixture),
        "ACTION_ROOT",
        "ENVIRONMENT_OR_MODE",
        code,
      );
      assert.equal(
        fixture.calls.some(([operation]) => operation === "spawn"),
        false,
      );
    }

    const internalRecord = {
      schema: "fluyo:r4b:test-python-binding-diagnostic:v1",
      outcome: "FAIL",
      candidateClass: "NONE",
      stage: "INTERNAL_FIXED_FAILURE",
      failureCode: "TEST_PYTHON_DIAGNOSTIC_INTERNAL_FAILURE",
    };
    const invalidTuples = [
      ["NONE", "SUCCESS", null],
      ["ACTION_ROOT", "SUCCESS", PYTHON_ERROR.introspection],
      ["ACTION_ROOT", "USAGE_INVALID", "TEST_PYTHON_DIAGNOSTIC_USAGE_INVALID"],
      ["LOCAL_PATH", "ENVIRONMENT_OR_MODE", PYTHON_ERROR.environment],
      ["NONE", "SPAWN_THROW", PYTHON_ERROR.introspection],
      ["ACTION_ROOT", "JSON_SCHEMA", PYTHON_ERROR.content],
      ["NONE", "INTERNAL_FIXED_FAILURE", "PRIVATE_DIAGNOSTIC_SENTINEL"],
    ];
    assert.equal(invalidTuples.length, 7);
    for (const tuple of invalidTuples) {
      const record = testPythonBindingTesting.diagnosticRecordForTesting(...tuple);
      assert.deepEqual(record, internalRecord);
      assert.equal(JSON.stringify(record).includes("PRIVATE_DIAGNOSTIC_SENTINEL"), false);
    }
    for (const tuple of [
      [{ toJSON: () => "PRIVATE_DIAGNOSTIC_SENTINEL" }, "SUCCESS", null],
      ["ACTION_ROOT", { toJSON: () => "PRIVATE_DIAGNOSTIC_SENTINEL" }, null],
      ["ACTION_ROOT", "SUCCESS", { toJSON: () => "PRIVATE_DIAGNOSTIC_SENTINEL" }],
    ]) {
      assert.deepEqual(
        testPythonBindingTesting.diagnosticRecordForTesting(...tuple),
        internalRecord,
      );
    }

    const records = [
      diagnosePython(pythonEnvironment(), createPythonFixture()),
      diagnosePython(
        pythonEnvironment(),
        createPythonFixture({ spawnThrow: new Error("PRIVATE_CAUSE_SENTINEL") }),
      ),
      diagnosePython(
        { PATH: "C:\\missing", SystemRoot: "C:\\Windows", windir: "C:\\Windows" },
        createPythonFixture(),
      ),
    ];
    for (const record of records) {
      assert.deepEqual(Object.keys(record), [
        "schema",
        "outcome",
        "candidateClass",
        "stage",
        "failureCode",
      ]);
      const serialized = JSON.stringify(record);
      for (const sentinel of [
        PYTHON_ROOT,
        PYTHON_EXE,
        PYTHON_SHA256,
        "3.12.10",
        "PRIVATE_CAUSE_SENTINEL",
        "PRIVATE_STDOUT",
        "PRIVATE_STDERR",
        String(process.pid),
      ])
        assert.equal(serialized.includes(sentinel), false);
      assert.ok(Buffer.byteLength(`${serialized}\n`, "utf8") <= 512);
    }
  });

  await t.test("12 CLI is main-guarded exact one-write and import-inert", () => {
    const source = readFileSync(new URL("./test-python-binding.mjs", import.meta.url), "utf8");
    assert.match(
      source,
      /fileURLToPath\(import\.meta\.url\) === resolve\(process\.argv\[1\] \?\? ""\)/u,
    );
    assert.match(
      source,
      /process\.argv\.length === 3 && process\.argv\[2\] === "--diagnose-reviewed-local-once-v1"/u,
    );
    assert.equal((source.match(/process\.stdout\.write/gu) ?? []).length, 1);
    assert.equal(source.includes("writeFile"), false);
    assert.equal(source.includes("mkdir"), false);

    const bindingUrl = new URL("./test-python-binding.mjs", import.meta.url);
    const bindingPath = fileURLToPath(bindingUrl);
    const cliScratch = mkdtempSync(resolve(CANONICAL_TEMP_ROOT, "fluyo-python-cli-proof-"));
    const cliEnvironment = {
      SystemRoot: process.env.SystemRoot ?? process.env.SYSTEMROOT ?? "C:\\Windows",
      WINDIR: process.env.WINDIR ?? process.env.windir ?? "C:\\Windows",
      PATH: cliScratch,
      TEMP: cliScratch,
      TMP: cliScratch,
    };
    const spawnNode = (arguments_) =>
      spawnSync(process.execPath, arguments_, {
        cwd: ROOT,
        env: cliEnvironment,
        encoding: "utf8",
        input: undefined,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 10_000,
        maxBuffer: 4_097,
        windowsHide: true,
        shell: false,
      });
    const assertCleanNodeResult = (result, stdout) => {
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0);
      assert.equal(result.signal, null);
      assert.equal(result.stdout, stdout);
      assert.equal(result.stderr, "");
      assert.deepEqual(readdirSync(cliScratch), []);
    };
    const usage = `${JSON.stringify({
      schema: "fluyo:r4b:test-python-reviewed-local-settlement:v1",
      outcome: "FAIL",
      candidateClass: "NONE",
      stage: "USAGE_INVALID",
      failureCode: "TEST_PYTHON_REVIEWED_LOCAL_USAGE_INVALID",
      transactionId: null,
      publicBindingDigest: null,
    })}\n`;
    const consumed = `${JSON.stringify({
      schema: "fluyo:r4b:test-python-reviewed-local-settlement:v1",
      outcome: "FAIL",
      candidateClass: "NONE",
      stage: "PRIOR_DIAGNOSTIC_CONSUMED",
      failureCode: "TEST_PYTHON_PRIOR_DIAGNOSTIC_CONSUMED",
      transactionId: null,
      publicBindingDigest: null,
    })}\n`;

    try {
      assert.equal(resolve(process.execPath), process.execPath);
      const importSpecifier = `${bindingUrl.href}?nonce=${randomBytes(16).toString("hex")}`;
      assertCleanNodeResult(
        spawnNode([
          "--input-type=module",
          "-e",
          `await import(${JSON.stringify(importSpecifier)})`,
        ]),
        "",
      );
      for (const arguments_ of [
        [bindingPath],
        [bindingPath, "--wrong"],
        [bindingPath, "--diagnose-once-v1", "extra"],
      ]) {
        assert.equal(arguments_.includes("--diagnose-once-v1") && arguments_.length === 2, false);
        assertCleanNodeResult(spawnNode(arguments_), usage);
      }
      assertCleanNodeResult(spawnNode([bindingPath, "--diagnose-once-v1"]), consumed);
    } finally {
      rmSync(cliScratch, { force: true, recursive: true });
    }
    assert.equal(existsSync(cliScratch), false);
  });
});

test("keeps production and test journal namespaces closed and distinct", () => {
  const root = resolve(tmpdir(), "fluyo-journal-path-contract");
  const production = windowsNativeBoundaryTesting.journalPathFor(root, false);
  const testPath = windowsNativeBoundaryTesting.journalPathFor(root, true);
  assert.equal(resolve(production).startsWith(resolve(LEGACY_PARENT)), true);
  assert.equal(resolve(testPath).startsWith(resolve(TEST_PARENT)), true);
  assert.equal(testPath.includes(process.env.FLUYO_TEST_JOURNAL_RUN_ID), true);
  assert.notEqual(production, testPath);
});

test("captures one native temp identity and frozen cleanup environment", async () => {
  const before = windowsTrustedTempEnvironment();
  const originalTemp = process.env.TEMP;
  const originalTmp = process.env.TMP;
  const platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");
  try {
    process.env.TEMP = resolve(CANONICAL_TEMP_ROOT, "caller-temp-override");
    process.env.TMP = resolve(CANONICAL_TEMP_ROOT, "caller-tmp-override");
    Object.defineProperty(process, "platform", { ...platformDescriptor, value: "linux" });
    assert.deepEqual(windowsTrustedTempEnvironment(), before);
    assert.equal(before.TEMP, windowsTrustedTempRoot());
    assert.equal(before.TMP, windowsTrustedTempRoot());
    assert.equal(Object.isFrozen(before), true);
  } finally {
    Object.defineProperty(process, "platform", platformDescriptor);
    if (originalTemp === undefined) delete process.env.TEMP;
    else process.env.TEMP = originalTemp;
    if (originalTmp === undefined) delete process.env.TMP;
    else process.env.TMP = originalTmp;
  }
  assert.match(RUNNER_SOURCE, /const CANONICAL_SYSTEM_ROOT = process\.env\.SystemRoot/u);
  assert.match(RUNNER_SOURCE, /const CANONICAL_COMSPEC = process\.env\.ComSpec/u);
  assert.match(RUNNER_SOURCE, /ComSpec: CANONICAL_COMSPEC/u);
  assert.match(RUNNER_SOURCE, /SystemRoot: CANONICAL_SYSTEM_ROOT/u);
  const originalComSpec = process.env.ComSpec;
  const originalSystemRoot = process.env.SystemRoot;
  try {
    const pending = runTestJournalChild(["-e", "setTimeout(() => {}, 250)"], {
      stdio: "ignore",
    });
    process.env.ComSpec = resolve(CANONICAL_TEMP_ROOT, "caller-comspec-override.exe");
    process.env.SystemRoot = resolve(CANONICAL_TEMP_ROOT, "caller-system-root-override");
    const result = await pending;
    assert.equal(result.code, 0);
    assert.equal(result.cleanupFailed, false);
    assert.equal(existsSync(testJournalRunPath(result.runId)), false);
  } finally {
    if (originalComSpec === undefined) delete process.env.ComSpec;
    else process.env.ComSpec = originalComSpec;
    if (originalSystemRoot === undefined) delete process.env.SystemRoot;
    else process.env.SystemRoot = originalSystemRoot;
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
    const originalTemp = process.env.TEMP;
    const originalTmp = process.env.TMP;
    let rejected = false;
    try {
      const { windowsTrustedTempRoot } = await import(${JSON.stringify(TRUSTED_TEMP_URL)});
      try { windowsTrustedTempRoot(); } catch (error) {
        if (error?.message !== "WINDOWS_TRUSTED_TEMP_ROOT_IDENTITY") process.exitCode = 73;
        rejected = true;
      }
      process.env.TEMP = process.env.FLUYO_VALID_TEMP;
      process.env.TMP = process.env.FLUYO_VALID_TEMP;
      try { windowsTrustedTempRoot(); process.exitCode = 74; } catch (error) {
        if (error?.message !== "WINDOWS_TRUSTED_TEMP_ROOT_IDENTITY") process.exitCode = 75;
      }
    } catch (error) {
      process.exitCode = 76;
    }
    if (!rejected) process.exitCode = 72;
    process.env.TEMP = originalTemp;
    process.env.TMP = originalTmp;
  `;
  try {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TEMP: child, TMP: child, FLUYO_VALID_TEMP: CANONICAL_TEMP_ROOT },
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
    const { windowsTrustedTempRoot } = await import(${JSON.stringify(TRUSTED_TEMP_URL)});
    windowsTrustedTempRoot();
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
