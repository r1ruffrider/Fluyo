import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const digest = "0e273eeddffd655f44ad86514da715c8925fadc99f093047e6d6ee1f6d33f214";
const ids = readFileSync("contracts/mobile/auth-runtime-synthetic/v1/vectors.tsv", "utf8")
  .trimEnd()
  .split("\n")
  .slice(1)
  .map((line) => line.split("\t")[1]);
const root = mkdtempSync(join(tmpdir(), "fluyo-android-auth-results-"));
const run = (...args) =>
  execFileSync(process.execPath, ["scripts/verify-android-auth-kernel-results.mjs", ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });
const summarize = (...args) =>
  execFileSync(process.execPath, ["scripts/summarize-android-test-failures.mjs", ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });
const testcase = (id, index, className = "com.fluyo.app.AuthRuntimeKernelTest") =>
  `<testcase name="canonicalScenarioOrInvariant[${index}:${id}@${digest}]" classname="${className}"/>`;
const xml = (cases, tests = 41) =>
  `<testsuite name="com.fluyo.app.AuthRuntimeKernelTest" tests="${tests}" skipped="0" failures="0" errors="0">${cases}</testsuite>`;

try {
  const dir = join(root, "results");
  mkdirSync(dir);
  const file = join(dir, "TEST-com.fluyo.app.AuthRuntimeKernelTest.xml");
  const validCases = ids.map((id, index) => testcase(id, index));
  writeFileSync(file, xml(validCases.join("")));
  assert.match(run(dir), /41 exact semantic identities/);

  const mutations = [
    validCases.slice(0, -1),
    [...validCases.slice(0, -1), validCases[0]],
    [validCases[1], validCases[0], ...validCases.slice(2)],
    [testcase(ids[0], 0, "wrong.Class"), ...validCases.slice(1)],
    [validCases[0].replace(digest, "f".repeat(64)), ...validCases.slice(1)],
  ];
  for (const cases of mutations) {
    writeFileSync(file, xml(cases.join(""), cases.length));
    assert.throws(() => run(dir));
  }

  const ios = join(root, "ios.log");
  const markers = ids.map((id, index) => `AUTH_KERNEL_VECTOR ${index} ${id} ${digest} PASS`);
  writeFileSync(ios, `${markers.join("\n")}\n`);
  assert.match(run("--ios-log", ios), /41 exact semantic identities/);
  for (const lines of [
    markers.slice(0, -1),
    [...markers.slice(0, -1), markers[0]],
    [markers[1], markers[0], ...markers.slice(2)],
  ]) {
    writeFileSync(ios, `${lines.join("\n")}\n`);
    assert.throws(() => run("--ios-log", ios));
  }

  const summaryDir = join(root, "summary");
  mkdirSync(summaryDir);
  const summaryFile = join(summaryDir, "TEST-auth.xml");
  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:callback_cancel@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_callback_cancel_stage_snapshot_state] learner@example.test">C:\\private\\path</failure></testcase></testsuite>`,
  );
  const bounded = summarize(summaryDir);
  const failure = JSON.parse(bounded).failures[0];
  assert.equal(failure.testName, "auth_corpus_callback_cancel");
  assert.deepEqual(failure.authDiagnostic, {
    corpusId: "callback_cancel",
    stage: "snapshot",
    mismatch: "state",
  });
  assert.doesNotMatch(bounded, /example\.test|private/i);

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_timer_500] learner@example.test">C:\\private\\path</failure></testcase></testsuite>`,
  );
  const traceBounded = summarize(summaryDir);
  const traceFailure = JSON.parse(traceBounded).failures[0];
  assert.equal(traceFailure.testName, "auth_corpus_cold_start_without_candidate");
  assert.deepEqual(traceFailure.authDiagnostic, {
    corpusId: "cold_start_without_candidate",
    stage: "trace",
    mismatch: "sequence",
    index: 1,
    expected: "snapshot_published",
    actual: "timer_500",
  });
  assert.doesNotMatch(traceBounded, /example\.test|private/i);

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError">java.lang.AssertionError: [auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_timer_500]\n\tat com.fluyo.app.AuthRuntimeKernelTest.canonicalScenarioOrInvariant(AuthRuntimeKernelTest.kt:59)</failure></testcase></testsuite>`,
  );
  const stacktraceBounded = summarize(summaryDir);
  assert.deepEqual(JSON.parse(stacktraceBounded).failures[0].authDiagnostic, {
    corpusId: "cold_start_without_candidate",
    stage: "trace",
    mismatch: "sequence",
    index: 1,
    expected: "snapshot_published",
    actual: "timer_500",
  });
  assert.doesNotMatch(stacktraceBounded, /example\.test|private/i);

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_cold_start_without_candidate_stage_trace_count_expected_2_actual_3] learner@example.test">C:\\private\\path</failure></testcase></testsuite>`,
  );
  const countBounded = summarize(summaryDir);
  const countFailure = JSON.parse(countBounded).failures[0];
  assert.deepEqual(countFailure.authDiagnostic, {
    corpusId: "cold_start_without_candidate",
    stage: "trace",
    mismatch: "count",
    expectedCount: "2",
    actualCount: "3",
  });
  assert.doesNotMatch(countBounded, /example\.test|private/i);

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_private_value] learner@example.test">C:\\private\\path</failure></testcase></testsuite>`,
  );
  const invalidCombination = summarize(summaryDir);
  const invalidCombinationFailure = JSON.parse(invalidCombination).failures[0];
  assert.equal("authDiagnostic" in invalidCombinationFailure, false);
  assert.doesNotMatch(invalidCombination, /example\.test|private/i);

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_timer_5000] learner@example.test">C:\\private\\path</failure></testcase></testsuite>`,
  );
  const nearMatch = summarize(summaryDir);
  const nearMatchFailure = JSON.parse(nearMatch).failures[0];
  assert.equal("authDiagnostic" in nearMatchFailure, false);
  assert.doesNotMatch(nearMatch, /example\.test|private/i);

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:callback_cancel_private@${digest}]"><failure message="[auth_corpus_callback_cancel_private_stage_snapshot_state]">learner@example.test C:\\private\\path</failure></testcase></testsuite>`,
  );
  const adversarial = summarize(summaryDir);
  const adversarialFailure = JSON.parse(adversarial).failures[0];
  assert.equal(adversarialFailure.testName, "auth_vector_unknown");
  assert.equal("authDiagnostic" in adversarialFailure, false);
  assert.doesNotMatch(adversarial, /example\.test|private/i);
} finally {
  rmSync(root, { recursive: true, force: true });
}
