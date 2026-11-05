import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { ATTEMPT_002_PATHS } from "./preflight-attempts.mjs";
import {
  assertBuilderStoppedBeforeRecovery,
  preflightBuildTesting,
  runAttempt002BuildTransaction,
  validateBuildTransactionTrace,
  validateFixedBuildEnvironment,
  validateNodeRuntimeBinding,
} from "./preflight-build.mjs";
import { windowsNativeBoundaryTesting } from "./windows-native-client.mjs";

windowsNativeBoundaryTesting.enableTestRoot();

const SUCCESS = [
  "AUTHORITY_VALIDATED",
  "BUILDING_RECORDED",
  "BUILD_INVOKED",
  "BUILD_VALIDATED",
  "BUILD_READY_RECORDED",
];

test("closes the fixed no-argument build transaction and every crash boundary", async () => {
  assert.deepEqual(validateBuildTransactionTrace(SUCCESS), {
    status: "BUILD_READY",
    boundary: "BUILD_READY_RECORDED",
  });
  for (let boundary = 1; boundary <= SUCCESS.length; boundary += 1) {
    assert.deepEqual(
      validateBuildTransactionTrace([
        ...SUCCESS.slice(0, boundary),
        "FAILED_HELD",
        "PARTIAL_BUILD_RECOVERED",
      ]),
      { status: "FAILED_HELD", boundary: SUCCESS[boundary - 1] },
    );
  }
  assert.throws(
    () => validateBuildTransactionTrace(["AUTHORITY_VALIDATED", "BUILD_INVOKED"]),
    /skipped or reordered/u,
  );
  assert.throws(
    () => validateBuildTransactionTrace(["AUTHORITY_VALIDATED", "FAILED_HELD"]),
    /recovery/u,
  );
  await assert.rejects(runAttempt002BuildTransaction("caller-data"), /accepts no caller input/u);
});

test("rejects caller-derived build environment and binds one ignored temp root", () => {
  const environment = {
    ComSpec: "C:\\Windows\\System32\\cmd.exe",
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_ENV: "production",
    SystemRoot: "C:\\Windows",
    TEMP: ATTEMPT_002_PATHS.buildTemp,
    TMP: ATTEMPT_002_PATHS.buildTemp,
  };
  assert.equal(validateFixedBuildEnvironment(environment), environment);
  for (const mutation of [
    { TEMP: "C:\\Users\\caller\\Temp" },
    { PATH: "C:\\caller" },
    { NODE_OPTIONS: "--require caller.js" },
  ]) {
    assert.throws(
      () => validateFixedBuildEnvironment({ ...environment, ...mutation }),
      /no caller-controlled value/u,
    );
  }
});

test("delivers only the exact sorted six-key double-NUL Unicode environment block", () => {
  const fixture = preflightBuildTesting.canonicalBuildEnvironmentFixture();
  assert.deepEqual(fixture.entries, [
    "ComSpec=C:\\Windows\\System32\\cmd.exe",
    "NEXT_TELEMETRY_DISABLED=1",
    "NODE_ENV=production",
    "SystemRoot=C:\\Windows",
    `TEMP=${ATTEMPT_002_PATHS.buildTemp}`,
    `TMP=${ATTEMPT_002_PATHS.buildTemp}`,
  ]);
  const decoded = fixture.block.toString("utf16le");
  assert.equal(decoded, `${fixture.entries.join("\0")}\0\0`);
  assert.equal(decoded.endsWith("\0\0"), true);
  assert.equal(decoded.endsWith("\0\0\0"), false);
  assert.match(fixture.digest, /^[0-9a-f]{64}$/u);

  const exact = [...fixture.entries];
  for (const mutation of [
    exact.slice(0, -1),
    [...exact, "EXTRA=forbidden"],
    [exact[0], `comspec=${exact[0].split("=").slice(1).join("=")}`, ...exact.slice(2)],
    [exact[1], exact[0], ...exact.slice(2)],
    [...exact.slice(0, 2), "NODE_ENV=development", ...exact.slice(3)],
  ]) {
    assert.throws(
      () => preflightBuildTesting.validateCanonicalBuildEnvironmentEntries(mutation),
      /six entries|duplicate|case-colliding|missing|extra|order|values/u,
    );
  }
});

test("binds the actual supported Node executable without claiming an invoked npm runtime", () => {
  const runtime = preflightBuildTesting.readNodeRuntimeBinding();
  assert.equal(runtime.nodeVersion, process.versions.node);
  assert.equal(runtime.nodeSupportedRange, ">=22.12.0");
  assert.match(runtime.nodeExecutablePathSha256, /^[0-9a-f]{64}$/u);
  assert.match(runtime.nodeExecutableSha256, /^[0-9a-f]{64}$/u);
  for (const mutation of [
    { nodeVersion: "22.11.0" },
    { nodeSupportedRange: ">=20" },
    { nodeExecutablePathSha256: "0".repeat(63) },
    { nodeExecutableSha256: "not-a-digest" },
  ]) {
    assert.throws(() => validateNodeRuntimeBinding({ ...runtime, ...mutation }), /Node runtime/u);
  }
});

test("uses fixture-backed build failure and deterministic recovery boundaries", () => {
  for (const scenario of [
    "failure-after-building",
    "resume-from-failure-record",
    "resume-from-receipt",
  ]) {
    assert.deepEqual(preflightBuildTesting.exerciseBuildRecoveryFixture(scenario), {
      scenario,
      failureRecordCreated: true,
      recoveryReceiptCreated: true,
      residualBuildBytes: "0",
      residualTempBytes: "0",
      status: "PASS",
    });
  }
});

test("rejects tampered partial roots and recreated residual after a recovery receipt", () => {
  assert.throws(
    () => preflightBuildTesting.exerciseBuildRecoveryFixture("tampered-partial"),
    /changed before recovery resume/u,
  );
  assert.throws(
    () => preflightBuildTesting.exerciseBuildRecoveryFixture("receipt-with-recreated-residual"),
    /recreated residual bytes/u,
  );
});

test("owns the async builder tree and refuses unsafe cleanup boundaries", async () => {
  assert.deepEqual(preflightBuildTesting.exerciseBuilderOwnershipFixture("clean-exit"), {
    status: "PASS",
  });
  assert.throws(
    () => preflightBuildTesting.exerciseBuilderOwnershipFixture("descendant-survival"),
    /remains/u,
  );
  assert.throws(
    () => preflightBuildTesting.exerciseBuilderOwnershipFixture("pid-reuse-before-force"),
    /identity changed/u,
  );
  assert.throws(
    () => preflightBuildTesting.exerciseBuilderOwnershipFixture("unexpected-socket"),
    /external socket/u,
  );
  await assert.rejects(preflightBuildTesting.withBuilderTimeoutFixture(), /timed out/u);
  assert.equal(
    assertBuilderStoppedBeforeRecovery({
      builderOwnershipCleared: true,
      ownershipReceiptPresent: false,
    }),
    true,
  );
  for (const unsafe of [
    { builderOwnershipCleared: false, ownershipReceiptPresent: false },
    { builderOwnershipCleared: true, ownershipReceiptPresent: true },
    null,
  ]) {
    assert.throws(() => assertBuilderStoppedBeforeRecovery(unsafe), /not zero-safe/u);
  }
});

test("closes the builder timeout at exactly 900000 milliseconds", async () => {
  assert.equal(await preflightBuildTesting.withBuilderTimeoutAt(900000), true);
  await assert.rejects(
    preflightBuildTesting.withBuilderTimeoutAt(900001),
    /outside the closed bound/u,
  );
});

test("binds the Windows native boundary to suspended Job Object assignment before resume", () => {
  const source = preflightBuildTesting.nativeBoundarySource();
  for (const marker of [
    "CREATE_SUSPENDED",
    "CREATE_UNICODE_ENVIRONMENT",
    "JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE",
    "ExactEnvironmentBlock",
    'Encoding.Unicode.GetBytes(String.Join("\\0", entries) + "\\0\\0")',
    "Marshal.Copy(environmentBytes, 0, environment, environmentBytes.Length)",
    "CREATE_SUSPENDED | CREATE_NO_WINDOW | CREATE_UNICODE_ENVIRONMENT",
    "AssignProcessToJobObject(state.Job, process.hProcess)",
    "BrokerJob = state",
    "state.Pins.Add(PinExactFile(node",
    "state.Pins.Add(PinExactFile(nextCli",
    "state.Pins.Add(PinExactFile(powershell",
    "state.Pins.Add(PinExactFile(client",
    "state.Pins.Add(PinExactDirectory(cwd, expectedCwdDigest))",
    "state.Pins.Add(PinExactDirectory(tempPath, expectedTempDigest))",
    "ResumeBrokerJob",
    "ResumeThread(state.Thread)",
    "bool terminated = TerminateProcess(process.hProcess, 0xDEAD)",
    "ProveUnassignedProcessTerminated(process.hProcess)",
    "UNASSIGNED_PROCESS_TERMINATION_TIMEOUT",
    "UNASSIGNED_PROCESS_REMAINS_ACTIVE",
    "if (Job != IntPtr.Zero) { CloseHandle(Job)",
  ]) {
    assert.equal(source.includes(marker), true, marker);
  }
  assert.equal(
    source.includes("CREATE_SUSPENDED | CREATE_NO_WINDOW,\n                IntPtr.Zero"),
    false,
    "builder must not inherit the helper environment",
  );
  assert.equal(source.includes("environmentSha256"), true);
  assert.equal(source.includes("File.ReadAllText"), false);
  assert.equal(source.includes("receiptHandle = OpenHandle(receiptPath"), false);
  assert.equal(source.includes("ackHandle = OpenHandle(ackPath"), false);
  assert.equal(source.includes("JOB_ACK_TIMEOUT"), false);
  assert.equal(
    source.indexOf("AssignProcessToJobObject(state.Job, process.hProcess)") <
      source.indexOf("BrokerJob = state"),
    true,
  );
  assert.match(
    source,
    /private static Dictionary<string, string> ResumeBrokerJob[\s\S]*ResumeThread\(state\.Thread\)/u,
  );
});

test("bounds every builder runtime record before allocation", () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-builder-record-"));
  try {
    const record = resolve(root, "record.jsonl");
    writeFileSync(record, "12345");
    assert.equal(preflightBuildTesting.readGuardedRecord(record, 5, "fixture").toString(), "12345");
    assert.throws(
      () => preflightBuildTesting.readGuardedRecord(record, 4, "fixture"),
      /byte bound/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("injects unassigned-process termination failure and timeout proofs without launching a process", () => {
  const sourcePath = preflightBuildTesting.nativeBoundarySourcePath();
  const script = [
    `Add-Type -Path '${sourcePath.replaceAll("'", "''")}' -ErrorAction Stop`,
    "$results=@(",
    "[FluyoNativeBoundary]::ValidateUnassignedTerminationProofForTest($true,0,0,$true,0)",
    "[FluyoNativeBoundary]::ValidateUnassignedTerminationProofForTest($false,5,0,$true,0)",
    "[FluyoNativeBoundary]::ValidateUnassignedTerminationProofForTest($true,0,258,$true,259)",
    "[FluyoNativeBoundary]::ValidateUnassignedTerminationProofForTest($false,5,0,$true,259)",
    ")",
    "$results|ConvertTo-Json -Compress",
  ].join(";");
  const results = JSON.parse(
    execFileSync(
      "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024 },
    ),
  );
  assert.deepEqual(results.slice(0, 2), ["PASS", "PASS"]);
  assert.match(results[2], /TimeoutException:UNASSIGNED_PROCESS_TERMINATION_TIMEOUT/u);
  assert.match(results[3], /InvalidOperationException:UNASSIGNED_PROCESS_REMAINS_ACTIVE/u);
});

test("writes launch intent before spawn and rejects ambiguous crash recovery", async () => {
  await assert.rejects(
    preflightBuildTesting.exerciseBuilderJournalFixture("spawn-before-receipt-crash"),
    /permanently ambiguous/u,
  );
});

test("refuses cleanup for assignment failure and helper/job crash ambiguity", async () => {
  for (const scenario of ["registration-failure", "assignment-failure", "helper-job-crash"]) {
    const result = await preflightBuildTesting.exerciseBuilderJournalFixture(scenario);
    assert.equal(result.status, "AMBIGUOUS");
    assert.match(result.message, /permanently ambiguous/u);
    assert.equal(result.receiptPresent, true);
    assert.equal(result.processCount, 2);
  }
});

test("rejects an already-aborted signal without spawning", async () => {
  await assert.rejects(
    preflightBuildTesting.exerciseAlreadyAbortedBuilderFixture(),
    /fixture already aborted/u,
  );
});

test("Job Object owns a surviving grandchild and socket after root/intermediate exit", async () => {
  assert.deepEqual(
    await preflightBuildTesting.exerciseBuilderJournalFixture("early-root-exit-with-survivor"),
    {
      status: "ZERO_OWNED_PROCESSES_OR_SOCKETS",
      identityCount: 4,
      receiptPresent: false,
    },
  );
});

test("Job Object closes an orphan created between polls and a late termination child", async () => {
  for (const scenario of ["intermediate-between-polls", "late-child-during-termination"]) {
    assert.deepEqual(await preflightBuildTesting.exerciseBuilderJournalFixture(scenario), {
      status: "ZERO_OWNED_PROCESSES_OR_SOCKETS",
      identityCount: 2,
      receiptPresent: false,
    });
  }
});

test("rejects malformed absent-root receipts and extra builder arguments", async () => {
  await assert.rejects(
    preflightBuildTesting.exerciseBuilderJournalFixture("malformed-absent-root-receipt"),
    /eight-field shape/u,
  );
  assert.throws(
    () =>
      preflightBuildTesting.validateBuilderCommandLine(
        `${preflightBuildTesting.builderFixtureCommandLine()} "extra"`,
      ),
    /extra arguments|exact Node\/Next/u,
  );
  assert.throws(
    () =>
      preflightBuildTesting.validateHelperCommandLine(
        `${preflightBuildTesting.builderFixtureHelperCommandLine()} "extra"`,
      ),
    /extra arguments|exact closed contract/u,
  );
});

test("resumes a registered crash only after exact zero proof", async () => {
  assert.deepEqual(await preflightBuildTesting.exerciseBuilderJournalFixture("crash-resume"), {
    status: "ZERO_OWNED_PROCESSES_OR_SOCKETS",
    identityCount: 2,
    receiptPresent: false,
  });
});

test("requires two absence snapshots separated by an awaited event-loop turn", async () => {
  await assert.rejects(
    preflightBuildTesting.exerciseTwoPassAbsenceFixture(),
    /persisted owned process remains/u,
  );
});
