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
const sidecarEnvelope = (corpusId, marker) =>
  `producer=typed_trace_v2\ncorpus=${corpusId}\nmarker=${marker}\n`;

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
    corpusId: "cold_start_without_candidate",
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
    assert.deepEqual(JSON.parse(fixedFallback).failures[0].authDiagnostic, {
      corpusId: "cold_start_without_candidate",
      stage,
      mismatch,
    });
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
    sidecarEnvelope(
      "cold_start_without_candidate",
      "[auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_timer_500]",
    ),
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
  assert.doesNotMatch(sidecarBounded, /origin|producer|typed_trace_v2/);
  writeFileSync(
    diagnosticFile,
    sidecarEnvelope("cold_start_without_candidate", "[auth_corpus_diagnostic_unavailable]"),
  );
  const unavailableSidecar = summarize(
    summaryDir,
    "--phase",
    "unit_test",
    "--diagnostic-file",
    diagnosticFile,
  );
  assert.deepEqual(JSON.parse(unavailableSidecar).failures[0].authDiagnostic, {
    corpusId: "cold_start_without_candidate",
    stage: "diagnostic",
    mismatch: "unavailable",
  });
  for (const [stage, mismatch] of fixedFallbacks) {
    writeFileSync(
      diagnosticFile,
      sidecarEnvelope("cold_start_without_candidate", `[auth_corpus_stage_${stage}_${mismatch}]`),
    );
    const fixedFallbackSidecar = summarize(
      summaryDir,
      "--phase",
      "unit_test",
      "--diagnostic-file",
      diagnosticFile,
    );
    assert.deepEqual(JSON.parse(fixedFallbackSidecar).failures[0].authDiagnostic, {
      corpusId: "cold_start_without_candidate",
      stage,
      mismatch,
    });
  }
  for (const rejected of [
    "corpus=cold_start_without_candidate\nmarker=[auth_corpus_stage_trace_diagnostic_rejected]\n",
    "producer=typed_trace_v1\ncorpus=cold_start_without_candidate\nmarker=[auth_corpus_stage_trace_diagnostic_rejected]\n",
    "producer=typed_trace_v2\ncorpus=private_corpus\nmarker=[auth_corpus_stage_trace_diagnostic_rejected]\n",
    "producer=typed_trace_v2\ncorpus=cold_start_without_candidate\nmarker=[auth_corpus_stage_trace_diagnostic_rejected]\nprivate=learner@example.test\n",
    "producer=typed_trace_v2\r\ncorpus=cold_start_without_candidate\r\nmarker=[auth_corpus_stage_trace_diagnostic_rejected]\r\n",
    "producer=typed_trace_v2\ncorpus=cold_start_without_candidate\nmarker=[auth_corpus_stage_trace_diagnostic_rejected] learner@example.test\n",
    "producer=typed_trace_v2\ncorpus=cold_start_without_candidate\nmarker=[auth_corpus_cold_start_without_candidate_private_stage_snapshot_state]\n",
    "producer=typed_trace_v2\ncorpus=callback_cancel\nmarker=[auth_corpus_cold_start_without_candidate_stage_snapshot_state]\n",
    "producer=typed_trace_v2\ncorpus=cold_start_without_candidate\nmarker=[auth_corpus_stage_trace_diagnostic_rejected]_private\n",
    "corpus=cold_start_without_candidate\nproducer=typed_trace_v2\nmarker=[auth_corpus_stage_trace_diagnostic_rejected]\n",
    "x".repeat(513),
  ]) {
    writeFileSync(diagnosticFile, rejected);
    const rejectedSidecar = JSON.parse(
      summarize(summaryDir, "--phase", "unit_test", "--diagnostic-file", diagnosticFile),
    ).failures[0];
    assert.equal("authDiagnostic" in rejectedSidecar, false);
  }

  for (const corpusId of ids) {
    const representativeMarkers = [
      [
        `[auth_corpus_${corpusId}_stage_trace_count_expected_0_actual_63]`,
        { corpusId, stage: "trace", mismatch: "count", expectedCount: "0", actualCount: "63" },
      ],
      [
        `[auth_corpus_${corpusId}_stage_trace_sequence_index_0_expected_init_read_actual_snapshot_published]`,
        {
          corpusId,
          stage: "trace",
          mismatch: "sequence",
          index: 0,
          expected: "init_read",
          actual: "snapshot_published",
        },
      ],
      [
        `[auth_corpus_${corpusId}_stage_trace_sequence_unavailable]`,
        { corpusId, stage: "trace", mismatch: "sequence_unavailable" },
      ],
      [
        "[auth_corpus_stage_trace_diagnostic_inconsistent]",
        { corpusId, stage: "trace", mismatch: "diagnostic_inconsistent" },
      ],
    ];
    for (const [marker, expected] of representativeMarkers) {
      writeFileSync(diagnosticFile, sidecarEnvelope(corpusId, marker));
      writeFileSync(
        summaryFile,
        `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[${ids.indexOf(corpusId)}:${corpusId}@${digest}]"><failure type="java.lang.AssertionError">message unavailable</failure></testcase></testsuite>`,
      );
      assert.deepEqual(
        JSON.parse(
          summarize(summaryDir, "--phase", "unit_test", "--diagnostic-file", diagnosticFile),
        ).failures[0].authDiagnostic,
        expected,
      );
    }
  }

  writeFileSync(
    diagnosticFile,
    sidecarEnvelope("callback_cancel", "[auth_corpus_stage_trace_diagnostic_rejected]"),
  );
  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError">first</failure></testcase><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[4:callback_cancel@${digest}]"><failure type="java.lang.AssertionError">later</failure></testcase></testsuite>`,
  );
  const crossCorpus = JSON.parse(
    summarize(summaryDir, "--phase", "unit_test", "--diagnostic-file", diagnosticFile),
  );
  assert.equal("authDiagnostic" in crossCorpus.failures[0], false);
  assert.deepEqual(crossCorpus.failures[1].authDiagnostic, {
    corpusId: "callback_cancel",
    stage: "trace",
    mismatch: "diagnostic_rejected",
  });

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
      `corpus=cold_start_without_candidate; stage=${stage}; mismatch=${mismatch}`,
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
      `::error title=${githubWorkflowAnnotationTitle}::phase=unit_test; category=auth_contract; ${expectedDiagnostic}; origin=inline\n`,
    );
    assert.equal(annotation.match(/\n/g)?.length, 1);
    assert.doesNotMatch(annotation, /example\.test|warning|owned|private/i);
  }

  const suppressedLifecycleCases = [
    [
      "suppressingNoLatePathEmitsNoStale",
      "suppressed_no_late_fence_count",
      " expected:&lt;2&gt; but was:&lt;1&gt;",
    ],
    ["suppressingNoLatePathEmitsNoStale", "suppressed_no_late_stale_absent", ""],
    ["failedTerminalPathClearsSuppressionWithoutStale", "suppressed_failed_terminal_fenced", ""],
    [
      "failedTerminalPathClearsSuppressionWithoutStale",
      "suppressed_failed_terminal_stale_absent",
      "",
    ],
  ];
  for (const [testName, assertion, junitSuffix] of suppressedLifecycleCases) {
    writeFileSync(
      summaryFile,
      `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeSuppressedStaleLifecycleTest" name="${testName}"><failure type="java.lang.AssertionError" message="${assertion}${junitSuffix}">learner@example.test\n::warning title=owned::private</failure></testcase></testsuite>`,
    );
    const annotation = summarizeAnnotation(summaryDir, "--phase", "unit_test");
    assert.equal(
      annotation,
      `::error title=${githubWorkflowAnnotationTitle}::phase=unit_test; category=auth_contract; test=${testName}; assertion=${assertion}\n`,
    );
    assert.equal(annotation.match(/\n/g)?.length, 1);
    assert.doesNotMatch(annotation, /example\.test|warning|owned|private|expected|but was/i);
  }

  const rejectedSuppressedLifecycleCases = [
    ["suppressingNoLatePathEmitsNoStalePrivate", "suppressed_no_late_fence_count"],
    ["suppressingNoLatePathEmitsNoStale", "suppressed_no_late_fence_count_private"],
    ["suppressingNoLatePathEmitsNoStale", "suppressed_failed_terminal_fenced"],
    [
      "failedTerminalPathClearsSuppressionWithoutStale",
      "private suppressed_failed_terminal_fenced",
    ],
  ];
  for (const [testName, message] of rejectedSuppressedLifecycleCases) {
    writeFileSync(
      summaryFile,
      `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeSuppressedStaleLifecycleTest" name="${testName}"><failure type="java.lang.AssertionError" message="${message}">learner@example.test\n::error title=owned::private</failure></testcase></testsuite>`,
    );
    const annotation = summarizeAnnotation(summaryDir, "--phase", "unit_test");
    assert.equal(
      annotation,
      `::error title=${githubWorkflowAnnotationTitle}::phase=unit_test; category=structured_test_failure\n`,
    );
    assert.doesNotMatch(annotation, /example\.test|warning|owned|private|suppressed/i);
  }

  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_stage_snapshot_diagnostic_inconsistent]">first</failure></testcase><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_cold_start_without_candidate_stage_trace_sequence_unavailable]">second</failure></testcase></testsuite>`,
  );
  assert.equal(
    summarizeAnnotation(summaryDir, "--phase", "unit_test"),
    `::error title=${githubWorkflowAnnotationTitle}::phase=unit_test; category=auth_contract; corpus=cold_start_without_candidate; stage=snapshot; mismatch=diagnostic_inconsistent; origin=inline\n`,
  );

  writeFileSync(
    diagnosticFile,
    sidecarEnvelope(
      "cold_start_without_candidate",
      "[auth_corpus_cold_start_without_candidate_stage_trace_count_expected_0_actual_63]",
    ),
  );
  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="[auth_corpus_stage_trace_diagnostic_rejected]">stale generic fallback</failure></testcase></testsuite>`,
  );
  assert.equal(
    summarizeAnnotation(summaryDir, "--phase", "unit_test", "--diagnostic-file", diagnosticFile),
    `::error title=${githubWorkflowAnnotationTitle}::phase=unit_test; category=auth_contract; corpus=cold_start_without_candidate; stage=trace; mismatch=count; expected_count=0; actual_count=63; origin=sidecar; producer=typed_trace_v2\n`,
  );

  const matchingDetailedMarker =
    "[auth_corpus_cold_start_without_candidate_stage_trace_sequence_unavailable]";
  writeFileSync(
    diagnosticFile,
    sidecarEnvelope("cold_start_without_candidate", matchingDetailedMarker),
  );
  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.AuthRuntimeKernelTest" name="canonicalScenarioOrInvariant[0:cold_start_without_candidate@${digest}]"><failure type="java.lang.AssertionError" message="${matchingDetailedMarker}">matching current inline evidence</failure></testcase></testsuite>`,
  );
  assert.equal(
    summarizeAnnotation(summaryDir, "--phase", "unit_test", "--diagnostic-file", diagnosticFile),
    `::error title=${githubWorkflowAnnotationTitle}::phase=unit_test; category=auth_contract; corpus=cold_start_without_candidate; stage=trace; mismatch=sequence_unavailable; origin=inline; producer=typed_trace_v2\n`,
  );

  writeFileSync(
    diagnosticFile,
    sidecarEnvelope("callback_cancel", "[auth_corpus_stage_trace_diagnostic_rejected]"),
  );
  writeFileSync(
    summaryFile,
    `<testsuite><testcase classname="com.fluyo.app.OtherTest" name="other"><failure type="java.lang.AssertionError">learner@example.test\n::warning title=owned::private</failure></testcase></testsuite>`,
  );
  const orphanAnnotation = summarizeAnnotation(
    summaryDir,
    "--phase",
    "unit_test",
    "--diagnostic-file",
    diagnosticFile,
  );
  assert.equal(
    orphanAnnotation,
    `::error title=${githubWorkflowAnnotationTitle}::phase=unit_test; category=structured_test_failure; corpus=callback_cancel; stage=trace; mismatch=diagnostic_rejected; origin=sidecar; producer=typed_trace_v2\n`,
  );
  assert.doesNotMatch(orphanAnnotation, /example\.test|warning|owned|private/i);

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
