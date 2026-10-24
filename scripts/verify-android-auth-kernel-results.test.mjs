import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { githubWorkflowAnnotationTitle } from "./github-workflow-annotation.mjs";

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
const summarizeAnnotation = (...args) =>
  execFileSync(
    process.execPath,
    ["scripts/summarize-android-test-failures.mjs", ...args, "--github-annotation"],
    {
      encoding: "utf8",
      stdio: "pipe",
      env: { ...process.env, GITHUB_ACTIONS: "true" },
    },
  );
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
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_cold_start_without_candidate_stage_trace_sequence_unavailable] learner@example.test">C:\\private\\path</failure></testcase></testsuite>`,
  );
  const unavailableBounded = summarize(summaryDir);
  assert.deepEqual(JSON.parse(unavailableBounded).failures[0].authDiagnostic, {
    corpusId: "cold_start_without_candidate",
    stage: "trace",
    mismatch: "sequence_unavailable",
  });
  assert.doesNotMatch(unavailableBounded, /example\.test|private/i);

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_diagnostic_unavailable] learner@example.test">C:\\private\\path</failure></testcase></testsuite>`,
  );
  const diagnosticUnavailable = summarize(summaryDir);
  assert.deepEqual(JSON.parse(diagnosticUnavailable).failures[0].authDiagnostic, {
    stage: "diagnostic",
    mismatch: "unavailable",
  });
  assert.doesNotMatch(diagnosticUnavailable, /example\.test|private/i);

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_diagnostic_unavailable_private] learner@example.test">C:\\private\\path</failure></testcase></testsuite>`,
  );
  const diagnosticUnavailableNearMatch = summarize(summaryDir);
  assert.equal("authDiagnostic" in JSON.parse(diagnosticUnavailableNearMatch).failures[0], false);
  assert.doesNotMatch(diagnosticUnavailableNearMatch, /example\.test|private/i);

  const fixedFallbacks = [
    ["snapshot", "diagnostic_inconsistent"],
    ["snapshot", "diagnostic_rejected"],
    ["trace", "diagnostic_inconsistent"],
    ["trace", "diagnostic_rejected"],
  ];
  for (const [stage, mismatch] of fixedFallbacks) {
    const marker = `[auth_corpus_stage_${stage}_${mismatch}]`;
    writeFileSync(
      summaryFile,
      `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="${marker} learner@example.test">C:\\private\\path</failure></testcase></testsuite>`,
    );
    const fixedFallback = summarize(summaryDir);
    assert.deepEqual(JSON.parse(fixedFallback).failures[0].authDiagnostic, { stage, mismatch });
    assert.doesNotMatch(fixedFallback, /example\.test|private/i);

    for (const nearMatch of [`${marker.slice(0, -1)}_private]`, `${marker}_private`]) {
      writeFileSync(
        summaryFile,
        `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="${nearMatch} learner@example.test">C:\\private\\path</failure></testcase></testsuite>`,
      );
      const rejected = summarize(summaryDir);
      assert.equal("authDiagnostic" in JSON.parse(rejected).failures[0], false);
      assert.doesNotMatch(rejected, /example\.test|private/i);
    }
  }

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_cold_start_without_candidate_stage_trace_sequence_unavailable_private] learner@example.test">C:\\private\\path</failure></testcase></testsuite>`,
  );
  const unavailableNearMatch = summarize(summaryDir);
  assert.equal("authDiagnostic" in JSON.parse(unavailableNearMatch).failures[0], false);
  assert.doesNotMatch(unavailableNearMatch, /example\.test|private/i);

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

  const diagnosticFile = join(root, "auth-diagnostic.txt");
  writeFileSync(
    diagnosticFile,
    "[auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_timer_500]\n",
  );
  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError">message unavailable</failure></testcase></testsuite>`,
  );
  const sidecarBounded = summarize(
    summaryDir,
    "--phase",
    "unit_test",
    "--diagnostic-file",
    diagnosticFile,
  );
  assert.deepEqual(JSON.parse(sidecarBounded).failures[0].authDiagnostic, {
    corpusId: "cold_start_without_candidate",
    stage: "trace",
    mismatch: "sequence",
    index: 1,
    expected: "snapshot_published",
    actual: "timer_500",
  });
  writeFileSync(diagnosticFile, "[auth_corpus_diagnostic_unavailable]\n");
  const unavailableSidecar = summarize(
    summaryDir,
    "--phase",
    "unit_test",
    "--diagnostic-file",
    diagnosticFile,
  );
  assert.deepEqual(JSON.parse(unavailableSidecar).failures[0].authDiagnostic, {
    stage: "diagnostic",
    mismatch: "unavailable",
  });
  for (const [stage, mismatch] of fixedFallbacks) {
    writeFileSync(diagnosticFile, `[auth_corpus_stage_${stage}_${mismatch}]\n`);
    const fixedFallbackSidecar = summarize(
      summaryDir,
      "--phase",
      "unit_test",
      "--diagnostic-file",
      diagnosticFile,
    );
    assert.deepEqual(JSON.parse(fixedFallbackSidecar).failures[0].authDiagnostic, {
      stage,
      mismatch,
    });
  }
  for (const rejected of [
    "[auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_timer_500] learner@example.test\n",
    "[auth_corpus_cold_start_without_candidate_private_stage_snapshot_state]\n",
    "[auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_timer_5000]\n",
    "[auth_corpus_cold_start_without_candidate_stage_trace_sequence_unavailable_private]\n",
    "[auth_corpus_diagnostic_unavailable_private]\n",
    "[auth_corpus_stage_snapshot_diagnostic_inconsistent_private]\n",
    "[auth_corpus_stage_trace_diagnostic_rejected]_private\n",
    "x".repeat(513),
  ]) {
    writeFileSync(diagnosticFile, rejected);
    const rejectedSidecar = JSON.parse(
      summarize(summaryDir, "--phase", "unit_test", "--diagnostic-file", diagnosticFile),
    ).failures[0];
    assert.equal("authDiagnostic" in rejectedSidecar, false);
  }

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

  const annotationCases = [
    [
      "[auth_corpus_cold_start_without_candidate_stage_snapshot_state]",
      "corpus=cold_start_without_candidate; stage=snapshot; mismatch=state",
    ],
    [
      "[auth_corpus_cold_start_without_candidate_stage_trace_sequence_unavailable]",
      "corpus=cold_start_without_candidate; stage=trace; mismatch=sequence_unavailable",
    ],
    [
      "[auth_corpus_cold_start_without_candidate_stage_trace_count_expected_2_actual_3]",
      "corpus=cold_start_without_candidate; stage=trace; mismatch=count; expected_count=2; actual_count=3",
    ],
    [
      "[auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_timer_500]",
      "corpus=cold_start_without_candidate; stage=trace; mismatch=sequence; index=1; expected=snapshot_published; actual=timer_500",
    ],
    ...fixedFallbacks.map(([stage, mismatch]) => [
      `[auth_corpus_stage_${stage}_${mismatch}]`,
      `test=auth_corpus_cold_start_without_candidate; stage=${stage}; mismatch=${mismatch}`,
    ]),
  ];
  for (const [marker, expectedDiagnostic] of annotationCases) {
    writeFileSync(
      summaryFile,
      `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="${marker}">learner@example.test\n::warning title=owned::private</failure></testcase></testsuite>`,
    );
    const annotation = summarizeAnnotation(summaryDir, "--phase", "unit_test");
    assert.equal(
      annotation,
      `::error title=${githubWorkflowAnnotationTitle}::phase=unit_test; category=auth_contract; ${expectedDiagnostic}\n`,
    );
    assert.equal(annotation.match(/\n/g)?.length, 1);
    assert.doesNotMatch(annotation, /example\.test|warning|owned|private/i);
  }

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_stage_snapshot_diagnostic_inconsistent]">first</failure></testcase><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_cold_start_without_candidate_stage_trace_sequence_unavailable]">second</failure></testcase></testsuite>`,
  );
  assert.equal(
    summarizeAnnotation(summaryDir, "--phase", "unit_test"),
    `::error title=${githubWorkflowAnnotationTitle}::phase=unit_test; category=auth_contract; test=auth_corpus_cold_start_without_candidate; stage=snapshot; mismatch=diagnostic_inconsistent\n`,
  );

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_stage_trace_diagnostic_rejected_private]">learner@example.test\n::error title=owned::private</failure></testcase></testsuite>`,
  );
  assert.equal(
    summarizeAnnotation(summaryDir, "--phase", "unit_test"),
    `::error title=${githubWorkflowAnnotationTitle}::phase=unit_test; category=structured_test_failure\n`,
  );

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_cold_start_without_candidate_stage_snapshot_state]">learner@example.test</failure></testcase></testsuite>`,
  );
  assert.equal(
    summarize(summaryDir),
    `{"structuredReports":1,"failures":[{"className":"auth_kernel","testName":"auth_corpus_cold_start_without_candidate","kind":"failure","category":"auth_contract","frameworkFailureCategory":"assertion","runtimeCategories":["assertion"],"sourceLine":null,"authDiagnostic":{"corpusId":"cold_start_without_candidate","stage":"snapshot","mismatch":"state"}}]}\n`,
  );

  const outsideActions = spawnSync(
    process.execPath,
    [
      "scripts/summarize-android-test-failures.mjs",
      summaryDir,
      "--phase",
      "unit_test",
      "--github-annotation",
    ],
    { encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "false" } },
  );
  assert.notEqual(outsideActions.status, 0);
  assert.equal(outsideActions.stdout, "");
} finally {
  rmSync(root, { recursive: true, force: true });
}
