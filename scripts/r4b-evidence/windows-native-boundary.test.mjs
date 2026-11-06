import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  truncateSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, resolve } from "node:path";
import test from "node:test";

import {
  nativeInventory,
  nativeRemoveTree,
  nativeSynchronizedSwapTest,
  windowsNativeBoundaryTesting,
} from "./windows-native-client.mjs";
import { windowsNativeResponseTesting } from "./windows-native-response.mjs";

windowsNativeBoundaryTesting.enableTestRoot();
test.after(() => windowsNativeBoundaryTesting.shutdownBrokers());

const POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const CLIENT_URL = new URL("./windows-native-client.mjs", import.meta.url).href;
const NVDA_PLUGIN_LATCH_FIXTURE_TIMEOUT_MILLISECONDS = 30_000;

test("bounds the longer cold-bootstrap deadline to the first broker HELLO", () => {
  assert.equal(
    windowsNativeBoundaryTesting.ORDINARY_NATIVE_TRANSACTION_TIMEOUT_MILLISECONDS,
    30_000,
  );
  assert.equal(
    windowsNativeBoundaryTesting.FIRST_BROKER_HELLO_BOOTSTRAP_TIMEOUT_MILLISECONDS,
    120_000,
  );
  assert.equal(
    windowsNativeBoundaryTesting.nativeTransactionTimeoutMilliseconds("HELLO", 1n),
    120_000,
  );
  assert.equal(
    windowsNativeBoundaryTesting.nativeTransactionTimeoutMilliseconds("HELLO", 2n),
    30_000,
  );
  assert.equal(
    windowsNativeBoundaryTesting.nativeTransactionTimeoutMilliseconds("READ_BOUNDED", 1n),
    30_000,
  );

  const source = readFileSync(new URL("./windows-native-client.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(
    source,
    /function transactWithBroker\([^)]*timeoutMilliseconds\s*=\s*(?:120000|120_000)/su,
  );
});

function validateTestPythonBinding() {
  const configured = process.env.FLUYO_R4B_TEST_PYTHON;
  const expectedSha256 = process.env.FLUYO_R4B_TEST_PYTHON_SHA256;
  if (!configured || !isAbsolute(configured)) {
    throw new Error("FLUYO_R4B_TEST_PYTHON must bind an absolute Python 3.12 interpreter path");
  }
  if (!/^[0-9a-f]{64}$/u.test(expectedSha256 ?? "")) {
    throw new Error("FLUYO_R4B_TEST_PYTHON_SHA256 must be exact lowercase 64-hex");
  }
  const metadata = lstatSync(configured);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error("FLUYO_R4B_TEST_PYTHON must be a regular non-link file");
  }
  const resolved = realpathSync.native(configured);
  if (resolve(configured).toLowerCase() !== resolved.toLowerCase()) {
    throw new Error("FLUYO_R4B_TEST_PYTHON must already be an exact resolved path");
  }
  if (basename(resolved).toLowerCase() !== "python.exe") {
    throw new Error("FLUYO_R4B_TEST_PYTHON must resolve to python.exe");
  }
  const sha256 = createHash("sha256").update(readFileSync(resolved)).digest("hex");
  if (sha256 !== expectedSha256) {
    throw new Error("FLUYO_R4B_TEST_PYTHON_SHA256 does not match the resolved interpreter bytes");
  }
  const version = execFileSync(resolved, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
  if (!/^Python 3\.12\.\d+$/u.test(version)) {
    throw new Error(`FLUYO_R4B_TEST_PYTHON must report Python 3.12.x, received ${version}`);
  }
  return Object.freeze({ path: resolved, sha256, version });
}

const PYTHON_BINDING = validateTestPythonBinding();
const PYTHON = PYTHON_BINDING.path;

function assertTestPythonBinding() {
  const current = validateTestPythonBinding();
  assert.deepEqual(current, PYTHON_BINDING, "test-only Python interpreter binding changed");
}

function journalPathForTest(root) {
  const runId = process.env.FLUYO_TEST_JOURNAL_RUN_ID;
  assert.match(runId ?? "", /^[0-9a-f]{64}$/u);
  const name = createHash("sha256")
    .update(Buffer.from(`${resolve(root)}\0test`))
    .digest("hex");
  return resolve(tmpdir(), "fluyo-native-test-broker-journals", runId, `${name}.journal`);
}

function waitForJournalState(path, state) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (existsSync(path) && readFileSync(path, "utf8").includes(`${state}|`)) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  }
  assert.fail(`journal did not reach ${state}`);
}

function rewriteJournalAfterBrokerExit(path, bytes) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      writeFileSync(path, bytes);
      return;
    } catch (error) {
      if (error?.code !== "EBUSY") throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  assert.fail("native broker did not release the journal handle");
}

function recoveryRecord(hello) {
  return [
    "NATIVE_TRANSACTION_FAILED",
    hello.lastRequestId,
    hello.controllerCreationIdentity,
    hello.journalSequence,
    hello.journalSha256,
  ].join("|");
}

const JOB_CLOSED_RECEIPT_KEYS = Object.freeze([
  "assignmentReceiptSha256",
  "clientIdentity",
  "cwdIdentity",
  "distDir",
  "event",
  "exitCode",
  "infrastructurePlanDigest",
  "nextIdentity",
  "nodeIdentity",
  "outputAuthorityRootId",
  "outputAuthoritySha256",
  "powerShellIdentity",
  "retainedOutputParentIdentity",
  "schema",
  "status",
  "tempIdentity",
]);

function jobClosedReceipt(overrides = {}) {
  const identity = `1:${"a".repeat(32)}`;
  const values = {
    assignmentReceiptSha256: "1".repeat(64),
    clientIdentity: identity,
    cwdIdentity: identity,
    distDir: ".next-attempt-002",
    event: "JOB_CLOSED",
    exitCode: "0",
    infrastructurePlanDigest: "2".repeat(64),
    nextIdentity: identity,
    nodeIdentity: identity,
    outputAuthorityRootId: "BUILD_OUTPUT_ROOT",
    outputAuthoritySha256: "3".repeat(64),
    powerShellIdentity: identity,
    retainedOutputParentIdentity: identity,
    schema: "fluyo:r4b:attempt-002-builder-job-closed:v1",
    status: "PASS",
    tempIdentity: identity,
    ...overrides,
  };
  return Buffer.from(JOB_CLOSED_RECEIPT_KEYS.map((key) => `${key}=${values[key]}`).join("\n"));
}

function j2Record(fields) {
  assert.equal(fields.length, 15);
  return [...fields, createHash("sha256").update(fields.join("|")).digest("hex")];
}

function j2Fixture(responseMutation = (value) => value) {
  const session = "a".repeat(32);
  const requestSha256 = "b".repeat(64);
  const relative = Buffer.from("value.txt").toString("base64");
  const intent = j2Record([
    "J2",
    "INTENT_DURABLE",
    "1",
    session,
    "WRITE_NEW",
    requestSha256,
    "TEST_ROOT",
    relative,
    "",
    "ABSENT",
    "ABSENT",
    "0".repeat(64),
    "0",
    "",
    "0".repeat(64),
  ]);
  const responseValue = responseMutation({
    magic: "FLUYONS1",
    version: 1,
    sessionNonce: session,
    sequence: "1",
    operation: "WRITE_NEW",
    requestSha256,
    status: "PASS",
    contentSha256: "c".repeat(64),
    bytes: "1",
    volumeSerial: "1",
    fileId: "d".repeat(32),
    journalBeforeResponseSha256: intent[15],
    journalBeforeResponseSequence: "1",
  });
  const response = Buffer.isBuffer(responseValue)
    ? responseValue
    : Buffer.from(JSON.stringify(responseValue));
  const applied = j2Record([
    "J2",
    "APPLIED_UNACKED_DURABLE",
    "1",
    session,
    "WRITE_NEW",
    requestSha256,
    "TEST_ROOT",
    relative,
    "",
    "ABSENT",
    "c".repeat(64),
    createHash("sha256").update(response).digest("hex"),
    String(response.length),
    response.toString("base64"),
    intent[15],
  ]);
  return { intent, applied, response };
}

function validateJ2Journal(bytes, confirmedSequence = 0, confirmedDigest = "0".repeat(64)) {
  const source = windowsNativeBoundaryTesting.sourcePath.replaceAll("'", "''");
  const payload = bytes.toString("base64");
  return execFileSync(
    POWERSHELL,
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Add-Type -Path '${source}' -ErrorAction Stop;[FluyoNativeBoundary]::ValidateJ2JournalForTest('${payload}',${confirmedSequence},'${confirmedDigest}')`,
    ],
    { encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024 },
  ).trim();
}

function runIsolatedController(root, dropAck) {
  const script = [
    `const { windowsNativeBoundaryTesting: boundary } = await import(${JSON.stringify(CLIENT_URL)});`,
    "boundary.enableTestRoot();",
    dropAck
      ? "try { boundary.executeTestNative('WRITE_NEW', process.env.FLUYO_TEST_ROOT, 'applied-once.txt', { payload: Buffer.from('once'), testDropAck: true }); } catch {} process.reallyExit(73);"
      : "boundary.executeTestNative('WRITE_NEW', process.env.FLUYO_TEST_ROOT, 'seed.txt', { payload: Buffer.from('seed') }); boundary.shutdownBrokers();",
  ].join("\n");
  return spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    env: { ...process.env, FLUYO_TEST_ROOT: root },
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
  });
}

function coherentJournalRewrite(bytes) {
  let prior = "0".repeat(64);
  const rewritten = bytes
    .toString("utf8")
    .trimEnd()
    .split("\n")
    .map((line) => {
      const fields = line.split("|");
      assert.equal(fields.length, 16);
      fields[3] = "f".repeat(32);
      fields[14] = prior;
      fields[15] = createHash("sha256").update(fields.slice(0, 15).join("|")).digest("hex");
      prior = fields[15];
      return fields.join("|");
    });
  return Buffer.from(`${rewritten.join("\n")}\n`, "utf8");
}

function assertPermanentHold(root, expectedOutcome, seedName, seedValue) {
  const journal = journalPathForTest(root);
  const beforeJournal = readFileSync(journal);
  const hello = windowsNativeBoundaryTesting.executeTestNative("HELLO", root);
  assert.equal(hello.outcome, expectedOutcome);
  assert.equal(hello.journalState, expectedOutcome);
  assert.throws(
    () =>
      windowsNativeBoundaryTesting.executeTestNative("WRITE_NEW", root, "forbidden-retry.txt", {
        payload: Buffer.from("forbidden"),
      }),
    new RegExp(expectedOutcome.replaceAll("_", " "), "iu"),
  );
  const recoveryOutcome = "JOURNAL_PERMANENT_HELD";
  assert.equal(
    windowsNativeBoundaryTesting.executeTestNative("RECOVER_SESSION", root, "", {
      recoveryRecord: recoveryRecord(hello),
    }).outcome,
    recoveryOutcome,
  );
  assert.equal(existsSync(resolve(root, "forbidden-retry.txt")), false);
  assert.equal(readFileSync(resolve(root, seedName), "utf8"), seedValue);
  assert.deepEqual(readFileSync(journal), beforeJournal);
}

test("compiles the frozen native retained-handle boundary", () => {
  const script = [
    `Add-Type -Path '${windowsNativeBoundaryTesting.sourcePath.replaceAll("'", "''")}' -ErrorAction Stop`,
    "[FluyoNativeBoundary].FullName",
  ].join(";");
  assert.equal(
    execFileSync(POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    }).trim(),
    "FluyoNativeBoundary",
  );
});

test("locks the reviewed native source digest to the sole client literal", () => {
  const boundaryBytes = readFileSync(windowsNativeBoundaryTesting.sourcePath);
  const boundarySha256 = createHash("sha256").update(boundaryBytes).digest("hex");
  const clientBytes = readFileSync(new URL("./windows-native-client.mjs", import.meta.url));
  const clientSource = clientBytes.toString("utf8");
  const literals = [
    ...clientSource.matchAll(/const EXPECTED_SOURCE_SHA256 = "(?<sha256>[0-9a-f]{64})";/gu),
  ];
  assert.equal(literals.length, 1);
  assert.equal(literals[0].groups.sha256, boundarySha256);
  assert.deepEqual(windowsNativeBoundaryTesting.loadBoundarySource(), boundaryBytes);
});

test("validates the strict non-circular J2 record and response schema", () => {
  const valid = j2Fixture();
  const bytes = Buffer.from(`${valid.intent.join("|")}\n${valid.applied.join("|")}\n`);
  assert.equal(validateJ2Journal(bytes), "FAILED_HELD:NONE");

  const cases = [];
  const noncanonicalBase64 = valid.applied.slice();
  noncanonicalBase64[13] = `${noncanonicalBase64[13]}=`;
  noncanonicalBase64[15] = createHash("sha256")
    .update(noncanonicalBase64.slice(0, 15).join("|"))
    .digest("hex");
  cases.push([noncanonicalBase64, "JOURNAL_RESPONSE_BASE64"]);
  const wrongLength = valid.applied.slice();
  wrongLength[12] = String(Number(wrongLength[12]) + 1);
  wrongLength[15] = createHash("sha256").update(wrongLength.slice(0, 15).join("|")).digest("hex");
  cases.push([wrongLength, "JOURNAL_RESPONSE_DIGEST"]);

  const responseCases = [
    [
      Buffer.from(
        valid.response.toString("utf8").replace(/\}$/u, `,"requestSha256":"${"b".repeat(64)}"}`),
      ),
      "JOURNAL_RESPONSE_DUPLICATE",
    ],
    [
      Buffer.from(valid.response.toString("utf8").replace(/,"status":"PASS"/u, "")),
      "JOURNAL_RESPONSE_IDENTITY",
    ],
    [
      Buffer.from(
        valid.response
          .toString("utf8")
          .replace(
            /,"sequence":"1","operation":"WRITE_NEW"/u,
            ',"operation":"WRITE_NEW","sequence":"1"',
          ),
      ),
      "JOURNAL_RESPONSE_IDENTITY",
    ],
    [Buffer.from(` ${valid.response.toString("utf8")}`), "JOURNAL_RESPONSE_IDENTITY"],
  ];
  for (const [response, expected] of responseCases) {
    const record = valid.applied.slice();
    record[11] = createHash("sha256").update(response).digest("hex");
    record[12] = String(response.length);
    record[13] = response.toString("base64");
    record[15] = createHash("sha256").update(record.slice(0, 15).join("|")).digest("hex");
    cases.push([record, expected]);
  }
  for (const [record, expected] of cases) {
    assert.equal(
      validateJ2Journal(Buffer.from(`${valid.intent.join("|")}\n${record.join("|")}\n`)),
      expected,
    );
  }
});

test("distinguishes J2 record-hash tamper, full-chain prefix mismatch, and legacy J1 hold", () => {
  const original = j2Fixture();
  const alteredResponse = Buffer.from(
    original.response.toString("utf8").replace('"bytes":"1"', '"bytes":"2"'),
  );
  const unchangedHash = original.applied.slice();
  unchangedHash[11] = createHash("sha256").update(alteredResponse).digest("hex");
  unchangedHash[12] = String(alteredResponse.length);
  unchangedHash[13] = alteredResponse.toString("base64");
  assert.equal(
    validateJ2Journal(Buffer.from(`${original.intent.join("|")}\n${unchangedHash.join("|")}\n`)),
    "JOURNAL_HASH",
  );

  const rewrittenApplied = unchangedHash.slice();
  rewrittenApplied[15] = createHash("sha256")
    .update(rewrittenApplied.slice(0, 15).join("|"))
    .digest("hex");
  const originalAcked = j2Record([
    ...original.applied
      .slice(0, 15)
      .map((field, index) =>
        index === 1 ? "ACKED_COMMITTED_DURABLE" : index === 14 ? original.applied[15] : field,
      ),
  ]);
  const rewrittenAcked = j2Record([
    ...rewrittenApplied
      .slice(0, 15)
      .map((field, index) =>
        index === 1 ? "ACKED_COMMITTED_DURABLE" : index === 14 ? rewrittenApplied[15] : field,
      ),
  ]);
  assert.equal(
    validateJ2Journal(
      Buffer.from(
        `${original.intent.join("|")}\n${rewrittenApplied.join("|")}\n${rewrittenAcked.join("|")}\n`,
      ),
      3,
      originalAcked[15],
    ),
    "JOURNAL_PREFIX_MISMATCH",
  );
  assert.equal(
    validateJ2Journal(Buffer.from(`INTENT_DURABLE|1|${"a".repeat(32)}|WRITE_NEW|legacy\n`)),
    "LEGACY_JOURNAL_PERMANENT_HELD:LEGACY_JOURNAL",
  );
});

test("denies journal rewrites while the controller and broker retain live handles", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-native-live-journal-"));
  try {
    windowsNativeBoundaryTesting.executeTestNative("WRITE_NEW", root, "value.txt", {
      payload: Buffer.from("once"),
    });
    const journal = journalPathForTest(root);
    const before = readFileSync(journal);
    assert.throws(() => writeFileSync(journal, before), /EBUSY|resource busy|locked/iu);
    assert.equal(readFileSync(resolve(root, "value.txt"), "utf8"), "once");
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

test("permanently holds a nonempty legacy J1 journal with zero action", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-native-legacy-j1-"));
  const journal = journalPathForTest(root);
  mkdirSync(resolve(journal, ".."), { recursive: true });
  const legacy = Buffer.from(
    `INTENT_DURABLE|1|${"a".repeat(32)}|WRITE_NEW|${"b".repeat(64)}|TEST_ROOT|||ABSENT|ABSENT|${"0".repeat(64)}||${"0".repeat(64)}|${"c".repeat(64)}\n`,
  );
  writeFileSync(journal, legacy);
  try {
    const hello = windowsNativeBoundaryTesting.executeTestNative("HELLO", root);
    assert.equal(hello.outcome, "LEGACY_JOURNAL_PERMANENT_HELD");
    assert.equal(hello.journalState, "LEGACY_JOURNAL_PERMANENT_HELD");
    assert.equal(hello.journalFailureReason, "LEGACY_JOURNAL");
    assert.throws(
      () =>
        windowsNativeBoundaryTesting.executeTestNative("WRITE_NEW", root, "forbidden.txt", {
          payload: Buffer.from("forbidden"),
        }),
      /legacy journal permanent held/iu,
    );
    assert.equal(existsSync(resolve(root, "forbidden.txt")), false);
    assert.deepEqual(readFileSync(journal), legacy);
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

test("enforces the exact C# root-operation-relative-path denial matrix", () => {
  const source = windowsNativeBoundaryTesting.sourcePath.replaceAll("'", "''");
  const cases = [
    ["BUILD_OUTPUT_ROOT", "INVENTORY_TREE", "", false, "PASS"],
    ["BUILD_OUTPUT_ROOT", "READ_BOUNDED", "BUILD_ID", false, "PASS"],
    ["BUILD_OUTPUT_ROOT", "READ_BOUNDED", "nested/BUILD_ID", false, "ROOT_RIGHT_DENIED"],
    ["BUILD_OUTPUT_ROOT", "WRITE_NEW", "BUILD_ID", false, "ROOT_RIGHT_DENIED"],
    ["BUILD_TEMP_ROOT", "CREATE_DIRECTORY", "", false, "PASS"],
    ["BUILD_TEMP_ROOT", "CREATE_DIRECTORY", "nested", false, "ROOT_RIGHT_DENIED"],
    ["NVDA_CONFIG_ROOT", "REMOVE_TREE_EXACT", "", false, "PASS"],
    ["NVDA_CONFIG_ROOT", "WRITE_NEW", "nvda.ini", false, "PASS"],
    ["NVDA_CONFIG_ROOT", "CREATE_DIRECTORY", "scratchpad/globalPlugins", false, "PASS"],
    [
      "NVDA_CONFIG_ROOT",
      "WRITE_NEW",
      "scratchpad/globalPlugins/fluyoPreflightSpeech.py",
      false,
      "PASS",
    ],
    [
      "NVDA_CONFIG_ROOT",
      "WRITE_NEW",
      "scratchpad/globalPlugins/attacker.py",
      false,
      "ROOT_RIGHT_DENIED",
    ],
    ["NVDA_PORTABLE_ROOT", "INVENTORY_TREE", "", false, "PASS"],
    ["NVDA_PORTABLE_ROOT", "READ_BOUNDED", "nvda.exe", false, "ROOT_RIGHT_DENIED"],
    ["NVDA_RAW_ROOT", "WRITE_NEW", "pre-speech-requests.jsonl", false, "PASS"],
    ["NVDA_RAW_ROOT", "WRITE_NEW", "diagnostics.log", false, "PASS"],
    ["NVDA_RAW_ROOT", "WRITE_NEW", "protocol.sha256", false, "PASS"],
    ["NVDA_RAW_ROOT", "WRITE_NEW", "arbitrary.jsonl", false, "ROOT_RIGHT_DENIED"],
    [
      "RAW_ROOT",
      "WRITE_NEW",
      `o/${"b".repeat(64)}/cells/${"a".repeat(64)}/actual.png`,
      false,
      "PASS",
    ],
    ["RAW_ROOT", "CREATE_DIRECTORY", `o/${"b".repeat(64)}/cells/${"a".repeat(64)}`, false, "PASS"],
    ["RAW_ROOT", "WRITE_NEW", "cells/short/actual.png", false, "ROOT_RIGHT_DENIED"],
    [
      "RAW_ROOT",
      "WRITE_NEW",
      `o/${"b".repeat(64)}/cells/${"a".repeat(64)}/arbitrary.png`,
      false,
      "ROOT_RIGHT_DENIED",
    ],
    ["RUNTIME_CONTROL_ROOT", "REMOVE_TREE_EXACT", "", false, "ROOT_RIGHT_DENIED"],
    ["RUNTIME_CONTROL_ROOT", "WRITE_NEW", "nested/value.json", false, "ROOT_RIGHT_DENIED"],
    ["RUNTIME_CONTROL_ROOT", "WRITE_NEW", "attempt-002-state.json", false, "ROOT_RIGHT_DENIED"],
    ["RUNTIME_CONTROL_ROOT", "WRITE_NEW", "attempt-002-build-ready.json", false, "PASS"],
    [
      "RUNTIME_CONTROL_ROOT",
      "WRITE_NEW",
      "attempt-002-build-ready.json/child",
      false,
      "ROOT_RIGHT_DENIED",
    ],
    ["ATTEMPT_ROOT", "REMOVE_TREE_EXACT", "raw", false, "ROOT_RIGHT_DENIED"],
    ["ATTEMPT_ROOT", "WRITE_NEW", "authority.json", false, "PASS"],
    ["ATTEMPT_ROOT", "WRITE_NEW", "arbitrary/authority.json", false, "ROOT_RIGHT_DENIED"],
    ["TOOLS_READ", "READ_BOUNDED", "nvda/nvda.exe", false, "PASS"],
    ["TOOLS_READ", "WRITE_NEW", "nvda/nvda.exe", false, "ROOT_RIGHT_DENIED"],
    ["DOWNLOADS_READ", "HASH_BOUNDED", "nvda_2026.3.exe", false, "PASS"],
    ["DOWNLOADS_READ", "HASH_BOUNDED", "nested/nvda_2026.3.exe", false, "ROOT_RIGHT_DENIED"],
    ["FROZEN_REPOSITORY_READ", "READ_BOUNDED", "package.json", false, "PASS"],
    [
      "FROZEN_REPOSITORY_READ",
      "READ_BOUNDED",
      "scripts/r4b-evidence/attempt-002-authority.json",
      false,
      "PASS",
    ],
    [
      "FROZEN_REPOSITORY_READ",
      "HASH_BOUNDED",
      "scripts/r4b-evidence/attempt-002-authority.json",
      false,
      "ROOT_RIGHT_DENIED",
    ],
    [
      "FROZEN_REPOSITORY_READ",
      "INVENTORY_TREE",
      "scripts/r4b-evidence/attempt-002-authority.json",
      false,
      "ROOT_RIGHT_DENIED",
    ],
    [
      "FROZEN_REPOSITORY_READ",
      "PIN_FILE",
      "scripts/r4b-evidence/attempt-002-authority.json",
      false,
      "ROOT_RIGHT_DENIED",
    ],
    ...[
      "CREATE_DIRECTORY",
      "WRITE_NEW",
      "APPEND_DURABLE",
      "RENAME_EXCLUSIVE",
      "UNLINK_EXACT",
      "REPLACE_EXISTING_EXACT",
      "REMOVE_TREE_EXACT",
      "UNPIN_FILE",
      "JOB_CREATE_SUSPENDED",
      "JOB_RESUME",
      "JOB_STATUS",
      "JOB_TERMINATE",
      "NVDA_START_WITH_HANDLES",
      "NVDA_STOP",
      "TEST_CRASH_AFTER_INTENT",
      "TEST_POST_ACK_JOURNAL_FAILURE",
    ].map((operation) => [
      "FROZEN_REPOSITORY_READ",
      operation,
      "scripts/r4b-evidence/attempt-002-authority.json",
      false,
      "ROOT_RIGHT_DENIED",
    ]),
    ...[
      "scripts/r4b-evidence/attempt-002-authority.json/child",
      "scripts/r4b-evidence/attempt-002-authority.json.sibling",
      "scripts/r4b-evidence/attempt-002-authority.json.bak",
      "scripts/r4b-evidence/Attempt-002-authority.json",
      "scripts/r4b-evidence//attempt-002-authority.json",
      "scripts/r4b-evidence/./attempt-002-authority.json",
    ].map((relativePath) => [
      "FROZEN_REPOSITORY_READ",
      "READ_BOUNDED",
      relativePath,
      false,
      "ROOT_RIGHT_DENIED",
    ]),
    ["FROZEN_REPOSITORY_READ", "WRITE_NEW", "value.txt", false, "ROOT_RIGHT_DENIED"],
    ["BUILD_OUTPUT_ROOT", "REMOVE_TREE_EXACT", "", false, "PASS"],
    ["TEST_ROOT", "WRITE_NEW", "value.txt", false, "TEST_ROOT_DISABLED"],
    ["TEST_ROOT", "WRITE_NEW", "value.txt", true, "PASS"],
  ];
  const script = [
    `Add-Type -Path '${source}' -ErrorAction Stop`,
    ...cases.map(
      ([rootId, operation, relativePath, testMode]) =>
        `[FluyoNativeBoundary]::ValidateRootRightForTest('${rootId}','${operation}','${relativePath}',${testMode ? "$true" : "$false"})`,
    ),
  ].join(";");
  const actual = execFileSync(POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  })
    .trim()
    .split(/\r?\n/u);
  assert.deepEqual(
    actual,
    cases.map((entry) => entry[4]),
  );
});

test("keeps every frozen RAW_ROOT exact intermediate node in parity with C# grants", () => {
  const contract = JSON.parse(
    readFileSync(new URL("./windows-native-contract.json", import.meta.url), "utf8"),
  );
  const exactIntermediateNodes = [
    "",
    "o",
    "checks",
    "checks/risk",
    "checks/transition",
    "profiles",
  ];
  assert.deepEqual(
    contract.exactRelativeAllowlists.RAW_ROOT.filter(
      (entry) => !entry.includes("{") && !entry.includes("."),
    ),
    exactIntermediateNodes,
  );
  const source = windowsNativeBoundaryTesting.sourcePath.replaceAll("'", "''");
  const script = [
    `Add-Type -Path '${source}' -ErrorAction Stop`,
    ...exactIntermediateNodes.map(
      (relativePath) =>
        `[FluyoNativeBoundary]::ValidateRootRightForTest('RAW_ROOT','CREATE_DIRECTORY','${relativePath}',$false)`,
    ),
    "[FluyoNativeBoundary]::ValidateRootRightForTest('RAW_ROOT','CREATE_DIRECTORY','checks/arbitrary',$false)",
  ].join(";");
  assert.deepEqual(
    execFileSync(POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    })
      .trim()
      .split(/\r?\n/u),
    [...exactIntermediateNodes.map(() => "PASS"), "ROOT_RIGHT_DENIED"],
  );
});

test("rejects malformed JOB_CLOSED receipts by exact schema, keys, and binding", () => {
  const valid = jobClosedReceipt();
  const swappedKeys = valid.toString("utf8").split("\n");
  [swappedKeys[0], swappedKeys[1]] = [swappedKeys[1], swappedKeys[0]];
  const cases = [
    [valid, "PASS"],
    [
      Buffer.from(valid.toString("utf8").split("\n").slice(0, -1).join("\n")),
      "JOB_CLOSED_RECEIPT_SCHEMA",
    ],
    [Buffer.from(swappedKeys.join("\n")), "JOB_CLOSED_RECEIPT_KEYS"],
    [
      jobClosedReceipt({ schema: "fluyo:r4b:attempt-002-builder-job-closed:v0" }),
      "JOB_CLOSED_RECEIPT_BINDING",
    ],
    [jobClosedReceipt({ assignmentReceiptSha256: "short" }), "JOB_CLOSED_RECEIPT_BINDING"],
  ];
  const source = windowsNativeBoundaryTesting.sourcePath.replaceAll("'", "''");
  const script = [
    `Add-Type -Path '${source}' -ErrorAction Stop`,
    ...cases.map(
      ([payload]) =>
        `[FluyoNativeBoundary]::ValidateJobClosedReceiptForTest('${payload.toString("base64")}')`,
    ),
  ].join(";");
  assert.deepEqual(
    execFileSync(POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    })
      .trim()
      .split(/\r?\n/u),
    cases.map(([, expected]) => expected),
  );
});

function createDurablyClosedJob(root) {
  const controller = [
    `const { windowsNativeBoundaryTesting: boundary } = await import(${JSON.stringify(CLIENT_URL)});`,
    `const { createHash } = await import("node:crypto");`,
    `const { mkdirSync, readFileSync, writeFileSync } = await import("node:fs");`,
    `const { resolve } = await import("node:path");`,
    `const root = process.env.FLUYO_TEST_ROOT;`,
    `const script = resolve(root, "harmless-builder-fixture.mjs");`,
    `writeFileSync(script, "if (process.argv[2] !== 'build') process.exit(19);\\n");`,
    `mkdirSync(resolve(root, "docs"));`,
    `const plan = resolve(root, "docs", "2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md");`,
    `writeFileSync(plan, readFileSync(process.env.FLUYO_TEST_PLAN_SOURCE));`,
    `const client = resolve(boundary.sourcePath, "..", "windows-native-client.mjs");`,
    `const digest = path => createHash("sha256").update(readFileSync(path)).digest("hex");`,
    `const pathDigest = path => createHash("sha256").update(resolve(path).replace(/[\\\\/]$/u, "").toLowerCase()).digest("hex");`,
    `const builderArgv = [process.execPath, script, "build"];`,
    `const environmentEntries = ["ComSpec=" + (process.env.ComSpec ?? "C:\\\\Windows\\\\System32\\\\cmd.exe"), "NEXT_TELEMETRY_DISABLED=1", "NODE_ENV=production", "SystemRoot=" + (process.env.SystemRoot ?? "C:\\\\Windows"), "TEMP=" + root, "TMP=" + root];`,
    `const environmentDigest = createHash("sha256").update(Buffer.from(environmentEntries.join("\\0") + "\\0\\0", "utf16le")).digest("hex");`,
    `const argvDigest = createHash("sha256").update(Buffer.from(JSON.stringify(builderArgv), "utf8")).digest("hex");`,
    `const arguments_ = [process.execPath, script, root, "INHERITED_ANONYMOUS_RESPONSE_PIPE", "SHA256_CAPABILITY_ACK_ON_REQUEST_PIPE", argvDigest, ...environmentEntries, environmentDigest, digest(process.execPath), digest(script), ${JSON.stringify(POWERSHELL)}, digest(${JSON.stringify(POWERSHELL)}), client, digest(client), pathDigest(root), pathDigest(resolve(root, ".next-attempt-002")), pathDigest(root), digest(plan)];`,
    `const child = boundary.spawnTestJobBoundary(arguments_, root, { windowsHide: true });`,
    `const exited = new Promise((accept, reject) => { child.once("error", reject); child.once("exit", (code, signal) => accept({ code, signal })); });`,
    `const keepAlive = setInterval(() => {}, 100);`,
    `if (!/RUNNING|CLOSED/u.test(child.resume().jobState)) throw new Error("JOB_RESUME");`,
    `const result = await exited; clearInterval(keepAlive); if (result.code !== 0 || result.signal !== null) throw new Error("JOB_EXIT");`,
    `if (child.closedReceipt.status !== "PASS") throw new Error("JOB_CLOSE");`,
    `if (child.kill() !== true) throw new Error("JOB_TERMINATE");`,
    `boundary.shutdownBrokers();`,
  ].join("\n");
  const planSource = resolve(
    windowsNativeBoundaryTesting.sourcePath,
    "..",
    "..",
    "..",
    "docs",
    "2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md",
  );
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", controller], {
    env: { ...process.env, FLUYO_TEST_ROOT: root, FLUYO_TEST_PLAN_SOURCE: planSource },
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const journal = journalPathForTest(root);
  assert.match(readFileSync(journal, "utf8"), /JOB_CLOSED_DURABLE/u);
  return journal;
}

test("assigns and completes a real suspended non-evidence Job fixture", () => {
  const script = [
    `Add-Type -Path '${windowsNativeBoundaryTesting.sourcePath.replaceAll("'", "''")}' -ErrorAction Stop`,
    "[FluyoNativeBoundary]::RunJobFixtureForTest($env:ComSpec,$env:SystemRoot)",
  ].join(";");
  assert.equal(
    execFileSync(POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    }).trim(),
    "PASS",
  );
});

test("runs the framed persistent-broker Job path without launching Next", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-native-framed-job-"));
  try {
    const script = resolve(root, "harmless-builder-fixture.mjs");
    writeFileSync(script, "if (process.argv[2] !== 'build') process.exit(19);\n");
    const planSource = new URL(
      "../../docs/2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md",
      import.meta.url,
    );
    mkdirSync(resolve(root, "docs"));
    const plan = resolve(root, "docs", "2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md");
    writeFileSync(plan, readFileSync(planSource));
    const client = resolve(
      windowsNativeBoundaryTesting.sourcePath,
      "..",
      "windows-native-client.mjs",
    );
    const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
    const pathDigest = (path) =>
      createHash("sha256")
        .update(
          resolve(path)
            .replace(/[\\/]$/u, "")
            .toLowerCase(),
        )
        .digest("hex");
    const builderArgv = [process.execPath, script, "build"];
    const environmentEntries = [
      `ComSpec=${process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe"}`,
      "NEXT_TELEMETRY_DISABLED=1",
      "NODE_ENV=production",
      `SystemRoot=${process.env.SystemRoot ?? "C:\\Windows"}`,
      `TEMP=${root}`,
      `TMP=${root}`,
    ];
    const environmentDigest = createHash("sha256")
      .update(Buffer.from(`${environmentEntries.join("\0")}\0\0`, "utf16le"))
      .digest("hex");
    const argvDigest = createHash("sha256")
      .update(Buffer.from(JSON.stringify(builderArgv), "utf8"))
      .digest("hex");
    const arguments_ = [
      process.execPath,
      script,
      root,
      "INHERITED_ANONYMOUS_RESPONSE_PIPE",
      "SHA256_CAPABILITY_ACK_ON_REQUEST_PIPE",
      argvDigest,
      ...environmentEntries,
      environmentDigest,
      digest(process.execPath),
      digest(script),
      POWERSHELL,
      digest(POWERSHELL),
      client,
      digest(client),
      pathDigest(root),
      pathDigest(resolve(root, ".next-attempt-002")),
      pathDigest(root),
      digest(plan),
    ];
    const child = windowsNativeBoundaryTesting.spawnTestJobBoundary(arguments_, root, {
      windowsHide: true,
    });
    assert.equal(child.assignmentReceipt.assigned.status, "PASS");
    assert.equal(child.assignmentReceipt.assigned.builderPid, child.builderPid);
    assert.match(child.assignmentReceipt.assigned.infrastructurePlanDigest, /^[0-9a-f]{64}$/u);
    assert.match(child.assignmentReceipt.assigned.outputAuthoritySha256, /^[0-9a-f]{64}$/u);
    const exited = new Promise((accept, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => accept({ code, signal }));
    });
    assert.match(child.resume().jobState, /RUNNING|CLOSED/u);
    assert.deepEqual(await exited, { code: 0, signal: null });
    assert.equal(child.closedReceipt.status, "PASS");
    assert.equal(
      child.closedReceipt.assignmentReceiptSha256,
      child.assignmentReceipt.assignedReceiptSha256,
    );
    const journal = readFileSync(journalPathForTest(root), "utf8");
    assert.match(journal, /JOB_CLOSED_DURABLE/u);
    const closedRecord = journal
      .trimEnd()
      .split("\n")
      .map((line) => line.split("|"))
      .find((fields) => fields[1] === "JOB_CLOSED_DURABLE");
    assert.equal(closedRecord.length, 16);
    const durableReceipt = Buffer.from(closedRecord[13], "base64");
    assert.equal(String(durableReceipt.length), closedRecord[12]);
    assert.equal(createHash("sha256").update(durableReceipt).digest("hex"), closedRecord[11]);
    assert.equal(
      createHash("sha256")
        .update(
          Buffer.from(
            Object.entries(child.closedReceipt)
              .map(([key, value]) => `${key}=${value}`)
              .join("\n"),
          ),
        )
        .digest("hex"),
      closedRecord[11],
    );
    assert.equal(child.kill(), true);
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

for (const attack of ["receipt-tamper", "receipt-truncation"]) {
  test(`permanently holds a ${attack} journal containing JOB_CLOSED_DURABLE with zero cleanup`, async () => {
    const root = mkdtempSync(resolve(tmpdir(), `fluyo-native-job-closed-${attack}-`));
    try {
      const journal = createDurablyClosedJob(root);
      const sentinel = resolve(root, "cleanup-sentinel.txt");
      writeFileSync(sentinel, "retain");
      const lines = readFileSync(journal, "utf8").trimEnd().split("\n");
      const closedIndex = lines.findIndex((line) => line.startsWith("J2|JOB_CLOSED_DURABLE|"));
      assert.notEqual(closedIndex, -1);
      const fields = lines[closedIndex].split("|");
      const receipt = Buffer.from(fields[13], "base64");
      const attackedReceipt =
        attack === "receipt-tamper"
          ? Buffer.from(receipt.toString("utf8").replace("status=PASS", "status=FAIL"))
          : receipt.subarray(0, receipt.length - 8);
      fields[13] = attackedReceipt.toString("base64");
      lines[closedIndex] = fields.join("|");
      rewriteJournalAfterBrokerExit(journal, Buffer.from(`${lines.join("\n")}\n`));
      assert.match(readFileSync(journal, "utf8"), /JOB_CLOSED_DURABLE/u);
      assert.equal(
        windowsNativeBoundaryTesting.executeTestNative("HELLO", root).journalFailureReason,
        "JOURNAL_RESPONSE_DIGEST",
      );
      assertPermanentHold(root, "ORPHANED_PERMANENT_HELD", "cleanup-sentinel.txt", "retain");
      assert.equal(readFileSync(sentinel, "utf8"), "retain");
    } finally {
      await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
      rmSync(root, { recursive: true, force: true });
      assert.equal(existsSync(root), false);
    }
  });
}

test("rejects every mismatched Job output-authority component before assignment", async () => {
  const mutations = [
    [19, "cwd identity"],
    [20, "normalized output path"],
    [21, "temp identity"],
    [22, "infrastructure plan"],
  ];
  for (const [index, label] of mutations) {
    const root = mkdtempSync(resolve(tmpdir(), `fluyo-native-job-${index}-`));
    try {
      const script = resolve(root, "harmless-builder-fixture.mjs");
      writeFileSync(script, "process.exit(0);\n");
      mkdirSync(resolve(root, "docs"));
      const plan = resolve(root, "docs", "2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md");
      writeFileSync(
        plan,
        readFileSync(
          new URL(
            "../../docs/2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md",
            import.meta.url,
          ),
        ),
      );
      const client = resolve(
        windowsNativeBoundaryTesting.sourcePath,
        "..",
        "windows-native-client.mjs",
      );
      const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
      const pathDigest = (path) =>
        createHash("sha256")
          .update(
            resolve(path)
              .replace(/[\\/]$/u, "")
              .toLowerCase(),
          )
          .digest("hex");
      const builderArgv = [process.execPath, script, "build"];
      const environmentEntries = [
        `ComSpec=${process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe"}`,
        "NEXT_TELEMETRY_DISABLED=1",
        "NODE_ENV=production",
        `SystemRoot=${process.env.SystemRoot ?? "C:\\Windows"}`,
        `TEMP=${root}`,
        `TMP=${root}`,
      ];
      const environmentDigest = createHash("sha256")
        .update(Buffer.from(`${environmentEntries.join("\0")}\0\0`, "utf16le"))
        .digest("hex");
      const argvDigest = createHash("sha256")
        .update(Buffer.from(JSON.stringify(builderArgv), "utf8"))
        .digest("hex");
      const arguments_ = [
        process.execPath,
        script,
        root,
        "INHERITED_ANONYMOUS_RESPONSE_PIPE",
        "SHA256_CAPABILITY_ACK_ON_REQUEST_PIPE",
        argvDigest,
        ...environmentEntries,
        environmentDigest,
        digest(process.execPath),
        digest(script),
        POWERSHELL,
        digest(POWERSHELL),
        client,
        digest(client),
        pathDigest(root),
        pathDigest(resolve(root, ".next-attempt-002")),
        pathDigest(root),
        digest(plan),
      ];
      arguments_[index] = "0".repeat(64);
      assert.throws(
        () => windowsNativeBoundaryTesting.spawnTestJobBoundary(arguments_, root),
        /digest|authority|failed/iu,
        label,
      );
      assert.equal(existsSync(resolve(root, ".next-attempt-002")), false, label);
    } finally {
      await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
      rmSync(root, { recursive: true, force: true });
      assert.equal(existsSync(root), false);
    }
  }
});

test("passes only inherited handles to a compiled Python consumer fixture", () => {
  assertTestPythonBinding();
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-nvda-handle-consumer-"));
  try {
    const fixture = resolve(
      windowsNativeBoundaryTesting.sourcePath,
      "..",
      "nvda-adapter",
      "inherited-handle-consumer-fixture.py",
    );
    execFileSync(
      PYTHON,
      [
        "-c",
        "import pathlib,sys; compile(pathlib.Path(sys.argv[1]).read_bytes(),sys.argv[1],'exec')",
        fixture,
      ],
      { windowsHide: true },
    );
    const script = [
      `Add-Type -Path '${windowsNativeBoundaryTesting.sourcePath.replaceAll("'", "''")}' -ErrorAction Stop`,
      `[FluyoNativeBoundary]::RunExactNvdaHandleConsumerFixtureForTest('${PYTHON.replaceAll("'", "''")}','${fixture.replaceAll("'", "''")}','${root.replaceAll("'", "''")}')`,
    ].join(";");
    assert.equal(
      execFileSync(POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
        encoding: "utf8",
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      }).trim(),
      "PASS",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("latches one NVDA control across multiple speech and cancel callbacks", () => {
  assertTestPythonBinding();
  assert.equal(NVDA_PLUGIN_LATCH_FIXTURE_TIMEOUT_MILLISECONDS, 30_000);
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-nvda-plugin-latch-"));
  try {
    const fixture = resolve(
      windowsNativeBoundaryTesting.sourcePath,
      "..",
      "nvda-adapter",
      "nvda-plugin-latch-fixture.py",
    );
    const plugin = resolve(
      windowsNativeBoundaryTesting.sourcePath,
      "..",
      "nvda-adapter",
      "scratchpad",
      "globalPlugins",
      "fluyoPreflightSpeech.py",
    );
    const bytecodeDirectory = resolve(plugin, "..", "__pycache__");
    assert.equal(existsSync(bytecodeDirectory), false);
    for (const ordinal of [1, 2]) {
      assert.equal(
        execFileSync(PYTHON, [fixture, plugin, resolve(root, `transcript-${ordinal}.jsonl`)], {
          encoding: "utf8",
          windowsHide: true,
          timeout: NVDA_PLUGIN_LATCH_FIXTURE_TIMEOUT_MILLISECONDS,
        }).trim(),
        "PASS",
      );
      assert.equal(existsSync(bytecodeDirectory), false);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("uses one closed framed protocol with no shell-derived mutation request", () => {
  const source = windowsNativeBoundaryTesting.loadBoundarySource().toString("utf8");
  for (const marker of [
    "FLUYONR1",
    "FLUYONS1",
    "FILE_FLAG_OPEN_REPARSE_POINT",
    "FILE_FLAG_BACKUP_SEMANTICS",
    "FILE_SHARE_READ | FILE_SHARE_WRITE",
    "SetFileInformationByHandle",
    "FileRenameInfo",
    "FileDispositionInfoEx",
    "GetFileInformationByHandleEx",
    "GetFinalPathNameByHandleW",
    "GetVolumeInformationW",
    "NON_FIXED_VOLUME",
    "NON_NTFS_VOLUME",
    "DELETE_UNKNOWN_ENTRY",
    "BrokerNvdaCommand",
    "SetHandleInformation(BROKER_NVDA_PIN)",
    "PROC_THREAD_ATTRIBUTE_HANDLE_LIST",
    "UpdateProcThreadAttribute(BROKER_NVDA)",
    "EXTENDED_STARTUPINFO_PRESENT",
    "CreateProcessW(BROKER_NVDA_SUSPENDED)",
    "AssignProcessToJobObject(BROKER_NVDA)",
    'pinnedHandleCount", "8',
    'inheritedHandleCount", "10',
  ]) {
    assert.equal(source.includes(marker), true, marker);
  }
  assert.equal(source.includes("Directory.Delete("), false);
  assert.equal(source.includes("File.Delete("), false);
  assert.equal(source.includes("File.ReadAllText("), false);
});

test("wires the NVDA portable process through inherited pinned native handles", () => {
  const observer = readFileSync(new URL("./preflight-observer.mjs", import.meta.url), "utf8");
  const client = readFileSync(new URL("./windows-native-client.mjs", import.meta.url), "utf8");
  const source = windowsNativeBoundaryTesting.loadBoundarySource().toString("utf8");
  const plugin = readFileSync(
    new URL("./nvda-adapter/scratchpad/globalPlugins/fluyoPreflightSpeech.py", import.meta.url),
    "utf8",
  );
  assert.equal(observer.includes("await spawnNativeNvdaBoundary("), true);
  assert.equal(observer.includes("spawn(executable, lifecycle.launch"), false);
  assert.equal(client.includes("[FluyoNativeBoundary]::RunNvda($args[0..12],$PID)"), false);
  assert.equal(client.includes("NVDA_BOOTSTRAP"), false);
  assert.equal(client.includes("JOB_BOOTSTRAP"), false);
  assert.equal(source.includes('"NVDA_START_WITH_HANDLES"'), true);
  assert.equal(source.includes('"JOB_CREATE_SUSPENDED"'), true);
  for (const marker of [
    "SetHandleInformation(BROKER_NVDA_PIN)",
    "CreateProcessW(BROKER_NVDA_SUSPENDED)",
    "AssignProcessToJobObject(BROKER_NVDA)",
    "JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE",
    'pinnedHandleCount", "8',
    'inheritedHandleCount", "10',
  ]) {
    assert.equal(source.includes(marker), true, marker);
  }
  assert.equal(plugin.includes("msvcrt.open_osfhandle"), true);
  assert.equal(plugin.includes("FLUYO_NVDA_CONTROL_HANDLE"), true);
  assert.equal(plugin.includes("FLUYO_NVDA_TRANSCRIPT_HANDLE"), true);
  assert.equal(plugin.includes("FLUYO_NVDA_CONTROLLER_PID"), true);
  assert.equal(plugin.includes("os.getppid"), false);
  assert.equal(plugin.includes("Path(__file__)"), false);
});

test("exercises the exact injected handle consumer through persistent NVDA op 17", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-nvda-pipe-consumer-"));
  try {
    const fixture = resolve(
      windowsNativeBoundaryTesting.sourcePath,
      "..",
      "nvda-adapter",
      "inherited-handle-consumer-fixture.py",
    );
    const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
    const pathDigest = (path) =>
      createHash("sha256")
        .update(
          resolve(path)
            .replace(/[\\/]$/u, "")
            .toLowerCase(),
        )
        .digest("hex");
    const result = windowsNativeBoundaryTesting.executeTestNative(
      "NVDA_START_WITH_HANDLES",
      root,
      "",
      {
        argumentsJson: JSON.stringify([
          "TEST_INJECTED_CONSUMER",
          PYTHON,
          fixture,
          root,
          PYTHON_BINDING.sha256,
          digest(fixture),
          pathDigest(root),
        ]),
      },
    );
    assert.equal(result.outcome, "PASS");
    assert.equal(result.consumerSchema, "TEST_INJECTED_EXACT_NVDA_HANDLES_V1");
    assert.equal(result.inheritedHandleCount, "10");
    assert.equal(result.externalWriteForgery, "DENIED");
    assert.notEqual(result.controllerPid, result.brokerPid);
    assert.notEqual(result.controllerPid, result.consumerPid);
    assert.notEqual(result.brokerPid, result.consumerPid);
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

test("blocks synchronized ancestor swaps across every native operation family", async () => {
  for (const operation of [
    "mkdir",
    "create-write",
    "append",
    "rename",
    "read-hash",
    "unlink",
    "remove-tree",
    "job-receipt-ack",
    "pinned-nvda",
  ]) {
    const root = mkdtempSync(resolve(tmpdir(), `fluyo-native-${operation}-`));
    try {
      mkdirSync(resolve(root, "owned"));
      mkdirSync(resolve(root, "outside"));
      writeFileSync(resolve(root, "owned", "seed.txt"), "inside");
      writeFileSync(resolve(root, "outside", "sentinel.txt"), "outside-unchanged");
      const result = nativeSynchronizedSwapTest(root, operation);
      assert.equal(result.testOperation, operation);
      assert.equal(result.actualOperation, "PASS");
      assert.equal(result.swapOutcome, "BLOCKED_OR_REFUSED");
      assert.equal(result.outsideSentinel, "UNCHANGED");
      assert.match(result.attackerPid, /^[1-9][0-9]*$/u);
      assert.match(result.attackerOutputSha256, /^[0-9a-f]{64}$/u);
      assert.equal(result.testWindow, "TEST_WINDOW_OPEN/CONTINUE");
      assert.equal(
        readFileSync(resolve(root, "outside", "sentinel.txt"), "utf8"),
        "outside-unchanged",
      );
    } finally {
      await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
      rmSync(root, { recursive: true, force: true });
      assert.equal(existsSync(root), false);
    }
  }
});

test("rejects malformed protocol construction before native dispatch", () => {
  assert.throws(
    () => windowsNativeBoundaryTesting.encodeRequest("UNKNOWN", {}, Buffer.alloc(0)),
    /unknown native-boundary operation/u,
  );
  assert.throws(
    () =>
      windowsNativeBoundaryTesting.encodeRequest(
        "HELLO",
        { sessionNonce: "a".repeat(70000) },
        Buffer.alloc(0),
      ),
    /oversized/u,
  );
});

test("rejects malformed operation responses before the worker can send ACK", () => {
  const expected = {
    sessionNonce: "a".repeat(32),
    sequence: "1",
    operation: "WRITE_NEW",
    requestSha256: "b".repeat(64),
  };
  const valid = {
    magic: "FLUYONS1",
    version: 1,
    ...expected,
    status: "PASS",
    contentSha256: "c".repeat(64),
    bytes: "1",
    volumeSerial: "1",
    fileId: "d".repeat(32),
    journalBeforeResponseSha256: "e".repeat(64),
    journalBeforeResponseSequence: "1",
  };
  assert.equal(
    windowsNativeResponseTesting.validateNativeResponseFrame(valid, expected, "pre-ACK response"),
    valid,
  );
  for (const malformed of [
    { ...valid, status: "UNKNOWN" },
    Object.fromEntries(Object.entries(valid).filter(([key]) => key !== "fileId")),
    { ...valid, extra: "forbidden" },
    { ...valid, journalBeforeResponseSequence: "01" },
  ]) {
    assert.throws(
      () =>
        windowsNativeResponseTesting.validateNativeResponseFrame(
          malformed,
          expected,
          "pre-ACK response",
        ),
      /response contract|extra, missing|fields|journal anchor/u,
    );
  }
  const worker = readFileSync(new URL("./windows-native-worker.mjs", import.meta.url), "utf8");
  assert.ok(
    worker.indexOf("validateIdentityFrame(response") <
      worker.indexOf("await writeFrame(responseSha256)"),
    "worker must validate the exact operation response before ACK",
  );
});

test("does not ACK or commit a transport-corrupted operation response", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-native-malformed-response-"));
  try {
    assert.throws(
      () =>
        windowsNativeBoundaryTesting.executeTestNative("WRITE_NEW", root, "value.txt", {
          payload: Buffer.from("applied-but-not-acked"),
          testMalformedResponseBeforeAck: true,
        }),
      /forbiddenTransportField|extra, missing|reordered/u,
    );
    const journal = readFileSync(journalPathForTest(root), "utf8");
    assert.match(journal, /APPLIED_UNACKED_DURABLE/u);
    assert.doesNotMatch(journal, /ACKED_COMMITTED_DURABLE\|2\|/u);
  } finally {
    await windowsNativeBoundaryTesting.crashBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

function directFrame(operation, fields, payload = Buffer.alloc(0), sequence = 1n) {
  const encodedFields = [];
  for (const [id, value] of fields) {
    const bytes = Buffer.from(value, "utf8");
    const prefix = Buffer.alloc(6);
    prefix.writeUInt16LE(id, 0);
    prefix.writeUInt32LE(bytes.length, 2);
    encodedFields.push(prefix, bytes);
  }
  const header = Buffer.concat(encodedFields);
  const prefix = Buffer.alloc(36);
  Buffer.from("FLUYONR1", "ascii").copy(prefix);
  prefix.writeUInt32LE(1, 8);
  prefix.writeBigUInt64LE(sequence, 12);
  prefix.writeUInt32LE(operation, 20);
  prefix.writeUInt32LE(header.length, 24);
  prefix.writeBigUInt64LE(BigInt(payload.length), 28);
  return Buffer.concat([prefix, header, payload]);
}

test("rejects unknown, reordered, repeated, and trailing fields directly in C#", () => {
  const nonce = "a".repeat(32);
  for (const request of [
    directFrame(1, [
      [1, nonce],
      [2, "TEST_ROOT"],
    ]),
    directFrame(2, [
      [2, "TEST_ROOT"],
      [1, nonce],
      [3, "seed"],
      [5, "64"],
      [10, "b".repeat(64)],
    ]),
    directFrame(1, [
      [1, nonce],
      [1, nonce],
    ]),
    directFrame(1, [[1, nonce]], Buffer.from("trailing")),
  ]) {
    const response = windowsNativeBoundaryTesting.runDirectFrameForTest(request);
    assert.equal(response.status, "FAIL");
    assert.match(response.errorCode, /FIELD_|PAYLOAD_/u);
  }
});

test("holds API failures and crash-after-INTENT until exact journal recovery", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-native-held-"));
  try {
    mkdirSync(resolve(root, "owned"));
    writeFileSync(resolve(root, "owned", "seed.txt"), "inside");
    let failure;
    try {
      windowsNativeBoundaryTesting.executeTestNative("APPEND_DURABLE", root, "owned/seed.txt", {
        payload: Buffer.from("blocked"),
        expectedVolumeSerial: "0",
        expectedFileId: "0".repeat(32),
      });
      assert.fail("APPEND_DURABLE unexpectedly accepted the mismatched identity");
    } catch (error) {
      failure = error;
    }
    assert.match(failure.message, /expected identity/u);
    assert.match(failure.nativeResponseSha256, /^[0-9a-f]{64}$/u);
    const failedRecord = readFileSync(journalPathForTest(root), "utf8")
      .trimEnd()
      .split("\n")
      .at(-1)
      .split("|");
    assert.equal(failedRecord[1], "FAILED_HELD");
    const failedResponse = Buffer.from(failedRecord[13], "base64");
    assert.equal(Number(failedRecord[12]), failedResponse.length);
    assert.equal(createHash("sha256").update(failedResponse).digest("hex"), failedRecord[11]);
    assert.equal(failedRecord[11], failure.nativeResponseSha256);
    assert.equal(JSON.parse(failedResponse).status, "FAIL");
    let hello = windowsNativeBoundaryTesting.executeTestNative("HELLO", root);
    assert.equal(hello.journalState, "FAILED_HELD");
    assert.equal(
      windowsNativeBoundaryTesting.executeTestNative("RECOVER_SESSION", root, "", {
        recoveryRecord: recoveryRecord(hello),
      }).outcome,
      "VERIFIED_NOT_APPLIED",
    );
    assert.throws(
      () =>
        windowsNativeBoundaryTesting.executeTestNative("TEST_CRASH_AFTER_INTENT", root, "owned"),
      /broker exited/u,
    );
    hello = windowsNativeBoundaryTesting.executeTestNative("HELLO", root);
    assert.equal(hello.journalState, "FAILED_HELD");
    windowsNativeBoundaryTesting.executeTestNative("RECOVER_SESSION", root, "", {
      recoveryRecord: recoveryRecord(hello),
    });
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

test("consumes the closed production recovery call shape without a generic held-state clear", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-native-recovery-call-"));
  try {
    mkdirSync(resolve(root, "owned"));
    writeFileSync(resolve(root, "owned", "seed.txt"), "inside");
    assert.throws(
      () =>
        windowsNativeBoundaryTesting.executeTestNative("APPEND_DURABLE", root, "owned/seed.txt", {
          payload: Buffer.from("blocked"),
          expectedVolumeSerial: "0",
          expectedFileId: "0".repeat(32),
        }),
      /expected identity/u,
    );
    const recovered = windowsNativeBoundaryTesting.recoverTestNativeSessionFromFailureRecord(root, {
      failureEvent: "NATIVE_TRANSACTION_FAILED",
    });
    assert.equal(recovered.outcome, "VERIFIED_NOT_APPLIED");
    assert.equal(readFileSync(resolve(root, "owned", "seed.txt"), "utf8"), "inside");
    assert.equal(existsSync(resolve(root, "forbidden-retry.txt")), false);
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

test("rejects caller-supplied recovery truth and every journal-anchor mismatch", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-native-recovery-mismatch-"));
  try {
    mkdirSync(resolve(root, "owned"));
    writeFileSync(resolve(root, "owned", "seed.txt"), "inside");
    assert.throws(
      () =>
        windowsNativeBoundaryTesting.executeTestNative("APPEND_DURABLE", root, "owned/seed.txt", {
          payload: Buffer.from("blocked"),
          expectedVolumeSerial: "0",
          expectedFileId: "0".repeat(32),
        }),
      /expected identity/u,
    );
    const hello = windowsNativeBoundaryTesting.executeTestNative("HELLO", root);
    const exact = recoveryRecord(hello).split("|");
    const records = [
      [...exact.slice(0, 1), "0".repeat(64), ...exact.slice(2)],
      [...exact.slice(0, 2), "different-controller", ...exact.slice(3)],
      [...exact.slice(0, 3), String(Number(exact[3]) + 1), exact[4]],
      [...exact.slice(0, 4), "0".repeat(64)],
      [...exact, "VERIFIED_NOT_APPLIED"],
    ];
    const journal = journalPathForTest(root);
    const before = readFileSync(journal);
    for (const fields of records) {
      assert.throws(
        () =>
          windowsNativeBoundaryTesting.executeTestNative("RECOVER_SESSION", root, "", {
            recoveryRecord: fields.join("|"),
          }),
        /recovery record binding|recovery record schema/u,
      );
    }
    assert.deepEqual(readFileSync(journal), before);
    assert.equal(readFileSync(resolve(root, "owned", "seed.txt"), "utf8"), "inside");
    assert.equal(existsSync(resolve(root, "forbidden-retry.txt")), false);
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

test("derives APPLIED_UNACKED and COMMITTED recovery from durable broker truth", async () => {
  for (const state of ["APPLIED_UNACKED", "COMMITTED"]) {
    const root = mkdtempSync(resolve(tmpdir(), `fluyo-native-derived-${state}-`));
    try {
      if (state === "APPLIED_UNACKED") {
        assert.throws(
          () =>
            windowsNativeBoundaryTesting.executeTestNative("WRITE_NEW", root, "derived.txt", {
              payload: Buffer.from("once"),
              testDropAck: true,
            }),
          /TEST_ACK_LOSS/u,
        );
        await windowsNativeBoundaryTesting.crashBrokerForTest(root);
      } else {
        windowsNativeBoundaryTesting.executeTestNative("WRITE_NEW", root, "derived.txt", {
          payload: Buffer.from("once"),
        });
      }
      const hello = windowsNativeBoundaryTesting.executeTestNative("HELLO", root);
      const recovered = windowsNativeBoundaryTesting.executeTestNative(
        "RECOVER_SESSION",
        root,
        "",
        { recoveryRecord: recoveryRecord(hello) },
      );
      assert.equal(
        recovered.outcome,
        state === "APPLIED_UNACKED" ? "VERIFIED_APPLIED_UNACKED" : "VERIFIED_COMMITTED",
      );
      assert.match(recovered.replayResponseSha256, /^[0-9a-f]{64}$/u);
      assert.equal(
        createHash("sha256")
          .update(Buffer.from(recovered.replayResponseBase64, "base64"))
          .digest("hex"),
        recovered.replayResponseSha256,
      );
      assert.equal(readFileSync(resolve(root, "derived.txt"), "utf8"), "once");
    } finally {
      await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
      rmSync(root, { recursive: true, force: true });
      assert.equal(existsSync(root), false);
    }
  }
});

for (const attack of ["valid-replay", "destination-delete", "destination-substitute"]) {
  test(`binds RENAME_EXCLUSIVE recovery to source absence and destination identity: ${attack}`, async () => {
    const root = mkdtempSync(resolve(tmpdir(), `fluyo-native-rename-recovery-${attack}-`));
    try {
      const source = resolve(root, "source.txt");
      const destination = resolve(root, "destination.txt");
      writeFileSync(source, "approved");
      assert.throws(
        () =>
          windowsNativeBoundaryTesting.renameTestNativeWithDroppedAck(root, source, destination),
        /TEST_ACK_LOSS/u,
      );
      await windowsNativeBoundaryTesting.crashBrokerForTest(root);
      assert.equal(existsSync(source), false);
      if (attack !== "valid-replay") unlinkSync(destination);
      if (attack === "destination-substitute") writeFileSync(destination, "approved");
      const hello = windowsNativeBoundaryTesting.executeTestNative("HELLO", root);
      const recovered = windowsNativeBoundaryTesting.executeTestNative(
        "RECOVER_SESSION",
        root,
        "",
        {
          recoveryRecord: recoveryRecord(hello),
        },
      );
      assert.equal(
        recovered.outcome,
        attack === "valid-replay" ? "VERIFIED_APPLIED_UNACKED" : "AMBIGUOUS_PERMANENT_HELD",
      );
      assert.equal(existsSync(source), false);
      assert.equal(existsSync(destination), attack !== "destination-delete");
    } finally {
      await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
      rmSync(root, { recursive: true, force: true });
      assert.equal(existsSync(root), false);
    }
  });
}

test("permanently holds a controller-loss transaction with zero retry or cleanup", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-native-controller-loss-"));
  try {
    const child = runIsolatedController(root, true);
    assert.equal(child.status, 73, child.stderr || child.stdout);
    const journal = journalPathForTest(root);
    waitForJournalState(journal, "APPLIED_UNACKED_DURABLE");
    assertPermanentHold(root, "JOURNAL_PERMANENT_HELD", "applied-once.txt", "once");
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

for (const attack of ["coherent-rewrite", "truncation", "file-replacement"]) {
  test(`permanently holds an orphaned journal after ${attack} with zero mutation or cleanup`, async () => {
    const root = mkdtempSync(resolve(tmpdir(), `fluyo-native-journal-${attack}-`));
    try {
      const child = runIsolatedController(root, false);
      assert.equal(child.status, 0, child.stderr || child.stdout);
      const journal = journalPathForTest(root);
      const original = readFileSync(journal);
      assert.equal(readFileSync(resolve(root, "seed.txt"), "utf8"), "seed");
      if (attack === "coherent-rewrite") {
        writeFileSync(journal, coherentJournalRewrite(original));
      } else if (attack === "truncation") {
        truncateSync(journal, 0);
      } else {
        const replacement = `${journal}.replacement`;
        writeFileSync(replacement, original);
        unlinkSync(journal);
        renameSync(replacement, journal);
      }
      assertPermanentHold(root, "ORPHANED_PERMANENT_HELD", "seed.txt", "seed");
    } finally {
      await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
      rmSync(root, { recursive: true, force: true });
      assert.equal(existsSync(root), false);
    }
  });
}

test("cleanup consumes only the original retained inventory lease and blocks rename-out", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-native-cleanup-"));
  try {
    const owned = resolve(root, "owned");
    const seed = resolve(owned, "seed.txt");
    mkdirSync(owned);
    writeFileSync(seed, "inside");
    let prior = nativeInventory(owned, root);
    const injected = resolve(owned, "new.txt");
    writeFileSync(injected, "attacker");
    assert.throws(
      () => nativeRemoveTree(owned, root, prior.inventoryDigest, { inventory: prior }),
      /unknown or missing entry/u,
    );
    let hello = windowsNativeBoundaryTesting.executeTestNative("HELLO", root);
    windowsNativeBoundaryTesting.executeTestNative("RECOVER_SESSION", root, "", {
      recoveryRecord: recoveryRecord(hello),
    });
    unlinkSync(injected);
    assert.throws(() => renameSync(seed, resolve(owned, "original.txt")), /EPERM|EBUSY/u);
    assert.throws(() => unlinkSync(seed), /EPERM|EBUSY/u);
    assert.throws(() => renameSync(owned, resolve(root, "moved-owned")), /EPERM|EBUSY/u);
    assert.equal(readFileSync(seed, "utf8"), "inside");
    assert.equal(existsSync(resolve(root, "moved-owned")), false);
    assert.equal(
      nativeRemoveTree(owned, root, prior.inventoryDigest, { inventory: prior }).outcome,
      "ORIGINAL_INVENTORY_DELETED",
    );
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

test("resumes two-root cleanup from original leases after one root committed deleted", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-native-partial-cleanup-"));
  try {
    const first = resolve(root, "first");
    const second = resolve(root, "second");
    mkdirSync(first);
    mkdirSync(second);
    writeFileSync(resolve(first, "seed.txt"), "first");
    writeFileSync(resolve(second, "seed.txt"), "second");
    const firstLease = nativeInventory(first, root);
    const secondLease = nativeInventory(second, root);
    assert.equal(
      nativeRemoveTree(first, root, firstLease.inventoryDigest, { inventory: firstLease }).outcome,
      "ORIGINAL_INVENTORY_DELETED",
    );
    writeFileSync(resolve(second, "late.txt"), "forbidden");
    assert.throws(
      () => nativeRemoveTree(second, root, secondLease.inventoryDigest, { inventory: secondLease }),
      /unknown or missing entry/u,
    );
    const held = windowsNativeBoundaryTesting.executeTestNative("HELLO", root);
    assert.equal(
      windowsNativeBoundaryTesting.executeTestNative("RECOVER_SESSION", root, "", {
        recoveryRecord: recoveryRecord(held),
      }).outcome,
      "VERIFIED_NOT_APPLIED",
    );
    unlinkSync(resolve(second, "late.txt"));
    assert.equal(
      nativeRemoveTree(first, root, firstLease.inventoryDigest, { inventory: firstLease }).outcome,
      "ORIGINAL_INVENTORY_ALREADY_DELETED",
    );
    assert.equal(
      nativeRemoveTree(second, root, secondLease.inventoryDigest, { inventory: secondLease })
        .outcome,
      "ORIGINAL_INVENTORY_DELETED",
    );
    assert.equal(existsSync(first), false);
    assert.equal(existsSync(second), false);
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

test("uses only inherited capability pipes for authoritative request, response, and ACK", () => {
  const client = readFileSync(new URL("./windows-native-client.mjs", import.meta.url), "utf8");
  const worker = readFileSync(new URL("./windows-native-worker.mjs", import.meta.url), "utf8");
  const source = windowsNativeBoundaryTesting.loadBoundarySource().toString("utf8");
  const contract = windowsNativeBoundaryTesting.loadBoundaryContract();
  assert.equal(contract.transport.kind, "inherited-anonymous-pipes");
  assert.equal(contract.transport.authoritativeFilesystemMessages, false);
  for (const forbidden of [".request.new", ".request`", ".response`", ".ready`", ".ack`"]) {
    assert.equal(client.includes(forbidden), false, forbidden);
  }
  assert.equal(source.includes("RunFileServer"), false);
  assert.equal(worker.includes('stdio: ["pipe", "pipe", "pipe"]'), true);
  assert.equal(worker.includes("writeFrame(responseSha256)"), true);
});

test("derives the journal only from a handle-proven local temp identity", () => {
  const client = readFileSync(new URL("./windows-native-client.mjs", import.meta.url), "utf8");
  const trustedTemp = readFileSync(
    new URL("./windows-trusted-temp-root.mjs", import.meta.url),
    "utf8",
  );
  const cleanup = readFileSync(
    new URL("./windows-native-test-journal-cleanup.cs", import.meta.url),
    "utf8",
  );
  const source = windowsNativeBoundaryTesting.loadBoundarySource().toString("utf8");
  assert.match(trustedTemp, /lstatSync\(path, \{ bigint: true \}\)/u);
  assert.match(trustedTemp, /openSync\(path, constants\.O_RDONLY\)/u);
  assert.match(trustedTemp, /fstatSync\(descriptor, \{ bigint: true \}\)/u);
  assert.match(trustedTemp, /sameIdentity\(before, opened\)/u);
  assert.match(trustedTemp, /heldDescriptors: Object\.freeze\(heldDescriptors\)/u);
  assert.match(trustedTemp, /trustedWindowsTempState = "UNATTEMPTED"/u);
  assert.match(trustedTemp, /process\.platform !== "win32"/u);
  assert.match(trustedTemp, /export function windowsTrustedTempRoot\(\)/u);
  assert.doesNotMatch(trustedTemp, /const TRUSTED_WINDOWS_TEMP = captureTrustedWindowsTempRoot/u);
  assert.match(client, /\.\.\.windowsTrustedTempEnvironment\(\)/u);
  assert.match(client, /FLUYO_BROKER_TEST_RUN_ID/u);
  assert.doesNotMatch(client, /RunPipeServer\([^\n]*testRunId/u);
  for (const required of [
    "OpenTrustedTempRoot",
    "HoldJournalDescendants",
    "BindComputedJournalPath",
    "RequireSameIdentity",
    "NativeLocalPath",
    "JOURNAL_VOLUME_TRANSITION",
    "TRUSTED_TEMP_CAPTURE_INDEX",
  ]) {
    assert.equal(source.includes(required), true, required);
  }
  assert.match(source, /BrokerJournalPath = Path\.Combine\(Combine\(chain\.Root, segments/u);
  assert.doesNotMatch(source, /FINAL_PATH_IDENTITY:/u);
  for (const required of [
    "InspectIdentity",
    "RequireSameIdentity",
    "NativeLocalPath",
    "TEST_JOURNAL_VOLUME_TRANSITION",
    "TEST_JOURNAL_CAPTURE_INDEX",
  ]) {
    assert.equal(cleanup.includes(required), true, required);
  }
});

test("freezes the exact ordered roots, rights, and PowerShell broker identity", async () => {
  const contract = windowsNativeBoundaryTesting.loadBoundaryContract();
  assert.deepEqual(
    contract.roots.map(({ id }) => id),
    [
      "BUILD_OUTPUT_ROOT",
      "BUILD_TEMP_ROOT",
      "NVDA_CONFIG_ROOT",
      "NVDA_PORTABLE_ROOT",
      "NVDA_RAW_ROOT",
      "RAW_ROOT",
      "ATTEMPT_ROOT",
      "RUNTIME_CONTROL_ROOT",
      "TOOLS_READ",
      "DOWNLOADS_READ",
      "FROZEN_REPOSITORY_READ",
      "TEST_ROOT",
    ],
  );
  assert.equal(contract.roots[0].relative, "apps/r4b-preflight-harness/.next-attempt-002");
  assert.equal(contract.roots.at(-1).testOnly, true);
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-native-hello-"));
  try {
    const hello = windowsNativeBoundaryTesting.executeTestNative("HELLO", root);
    assert.equal(hello.boundary, "WINDOWS_PERSISTENT_CAPABILITY_PIPE_V4_J2");
    assert.match(hello.brokerPid, /^[1-9][0-9]*$/u);
    assert.match(hello.controllerJournalAnchorHandle, /^[1-9][0-9]*$/u);
    assert.match(hello.powerShellIdentity, /WindowsPowerShell\\v1\.0\\powershell\.exe$/iu);
    assert.match(hello.powerShellVersion, /^5\.1\./u);
    assert.match(hello.powerShellSignature, /^Valid:/u);
    assert.match(hello.contractSha256, /^[0-9a-f]{64}$/u);
    assert.equal(
      windowsNativeBoundaryTesting.executeTestNative("HELLO", root).brokerPid,
      hello.brokerPid,
    );
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

test("replays response and ACK loss without reapplying a mutation", async () => {
  for (const loss of ["testDropResponse", "testDropAck"]) {
    const root = mkdtempSync(resolve(tmpdir(), `fluyo-native-${loss}-`));
    try {
      const options = { payload: Buffer.from("once"), [loss]: true };
      if (loss === "testDropResponse") {
        assert.throws(
          () =>
            windowsNativeBoundaryTesting.executeTestNative("WRITE_NEW", root, "value.txt", options),
          /TEST_RESPONSE_LOSS/u,
        );
      } else {
        assert.throws(
          () =>
            windowsNativeBoundaryTesting.executeTestNative("WRITE_NEW", root, "value.txt", options),
          /TEST_ACK_LOSS/u,
        );
      }
      assert.equal(
        (() => {
          const replayed = windowsNativeBoundaryTesting.executeTestNative(
            "WRITE_NEW",
            root,
            "value.txt",
            {
              payload: Buffer.from("once"),
              // Sequence 1 is the mandatory HELLO that pins the controller's
              // journal anchor before the first mutation; replay the mutation at 2.
              sequence: 2n,
            },
          );
          const records = readFileSync(journalPathForTest(root), "utf8")
            .trimEnd()
            .split("\n")
            .map((line) => line.split("|"));
          const applied = records.find((fields) => fields[1] === "APPLIED_UNACKED_DURABLE");
          const committed = records.find((fields) => fields[1] === "ACKED_COMMITTED_DURABLE");
          assert.equal(applied.length, 16);
          assert.equal(committed.length, 16);
          assert.equal(applied[11], replayed.nativeResponseSha256);
          assert.equal(committed[11], replayed.nativeResponseSha256);
          assert.equal(applied[12], committed[12]);
          assert.equal(applied[13], committed[13]);
          const hello = windowsNativeBoundaryTesting.executeTestNative("HELLO", root);
          assert.equal(hello.journalSha256, committed[15]);
          assert.equal(hello.journalSequence, String(records.length));
          return replayed;
        })().status,
        "PASS",
      );
      assert.equal(readFileSync(resolve(root, "value.txt"), "utf8"), "once");
    } finally {
      await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
      rmSync(root, { recursive: true, force: true });
      assert.equal(existsSync(root), false);
    }
  }
});

test("never reports success when the post-ACK durable journal append fails", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-native-post-ack-failure-"));
  try {
    assert.throws(
      () =>
        windowsNativeBoundaryTesting.executeTestNative("TEST_POST_ACK_JOURNAL_FAILURE", root, ""),
      /broker exited|TEST_POST_ACK_JOURNAL_FAILURE|truncated/iu,
    );
    const journal = readFileSync(journalPathForTest(root), "utf8");
    assert.match(journal, /APPLIED_UNACKED_DURABLE/u);
    assert.doesNotMatch(journal, /ACKED_COMMITTED_DURABLE/u);
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});
