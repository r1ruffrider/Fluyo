import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { githubWorkflowAnnotationTitle } from "./github-workflow-annotation.mjs";

const summarizeAnnotation = (file, phase, githubActions = "true") =>
  spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", phase, "--github-annotation"],
    { encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: githubActions } },
  );

const root = mkdtempSync(join(tmpdir(), "fluyo-ios-summary-"));
try {
  const file = join(root, "raw.log");
  const privateValues = [
    "learner@example.test",
    "Authorization: Bearer header.payload.signature",
    "https://auth.example.test/callback?code=private",
    "/Users/private/DerivedData/result.xcresult",
    "ProviderPrivateException",
  ];
  writeFileSync(file, `AuthRuntimeKernelTests assertion failed ${privateValues.join(" ")}`);
  const result = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const output = `${result.stdout}${result.stderr}`;
  assert.match(
    output,
    /phase=test_current; category=assertion; test=unknown; raw output discarded/,
  );
  for (const value of privateValues) assert.equal(output.includes(value), false);

  writeFileSync(
    file,
    `AuthRuntimeKernelTests.swift:55:13: error: cannot find symbol ${privateValues.join(" ")}`,
  );
  const compileFailure = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const compileFailureOutput = `${compileFailure.stdout}${compileFailure.stderr}`;
  assert.match(
    compileFailureOutput,
    /phase=test_current; category=compile; test=unknown; raw output discarded/,
  );
  for (const value of privateValues) assert.equal(compileFailureOutput.includes(value), false);

  writeFileSync(
    file,
    `linker command failed with exit code 1; undefined symbol AuthRuntimeKernelTests ${privateValues.join(" ")}`,
  );
  const linkFailure = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const linkFailureOutput = `${linkFailure.stdout}${linkFailure.stderr}`;
  assert.match(
    linkFailureOutput,
    /phase=test_current; category=link; test=unknown; raw output discarded/,
  );
  for (const value of privateValues) assert.equal(linkFailureOutput.includes(value), false);

  writeFileSync(
    file,
    `CompileSwiftSources normal arm64 AuthRuntimeKernelTests.swift
Test Case '-[FluyoTests.AuthRuntimeKernelTests testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups]' failed (0.001 seconds). [auth_corpus_cold_start_without_candidate_stage_snapshot_state] ${privateValues.join(" ")}`,
  );
  const mixedAuthFailure = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const mixedAuthFailureOutput = `${mixedAuthFailure.stdout}${mixedAuthFailure.stderr}`;
  assert.match(
    mixedAuthFailureOutput,
    /phase=test_current; category=auth_contract; test=testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups; corpus=cold_start_without_candidate; stage=snapshot; mismatch=state; raw output discarded/,
  );
  for (const value of privateValues) assert.equal(mixedAuthFailureOutput.includes(value), false);

  writeFileSync(
    file,
    `Test Case '-[FluyoTests.AuthRuntimeKernelTests testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups]' failed (0.001 seconds). ${privateValues.join(" ")}`,
  );
  const allowlistedFailure = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const allowlistedFailureOutput = `${allowlistedFailure.stdout}${allowlistedFailure.stderr}`;
  assert.match(
    allowlistedFailureOutput,
    /phase=test_current; category=auth_contract; test=testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups; raw output discarded/,
  );
  for (const value of privateValues) assert.equal(allowlistedFailureOutput.includes(value), false);

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed [auth_corpus_callback_cancel_stage_snapshot_state] ${privateValues.join(" ")}`,
  );
  const bounded = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_minimum"],
    { encoding: "utf8" },
  );
  const boundedOutput = `${bounded.stdout}${bounded.stderr}`;
  assert.match(
    boundedOutput,
    /phase=test_minimum; category=auth_contract; test=unknown; corpus=callback_cancel; stage=snapshot; mismatch=state; raw output discarded/,
  );
  assert.equal(
    boundedOutput,
    "iOS phase failed; phase=test_minimum; category=auth_contract; test=unknown; corpus=callback_cancel; stage=snapshot; mismatch=state; raw output discarded\n",
  );
  for (const value of privateValues) assert.equal(boundedOutput.includes(value), false);

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed [auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_timer_500] ${privateValues.join(" ")}`,
  );
  const traceBounded = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const traceBoundedOutput = `${traceBounded.stdout}${traceBounded.stderr}`;
  assert.match(
    traceBoundedOutput,
    /phase=test_current; category=auth_contract; test=unknown; corpus=cold_start_without_candidate; stage=trace; mismatch=sequence; index=1; expected=snapshot_published; actual=timer_500; raw output discarded/,
  );
  for (const value of privateValues) assert.equal(traceBoundedOutput.includes(value), false);

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed [auth_corpus_cold_start_without_candidate_stage_trace_sequence_unavailable] ${privateValues.join(" ")}`,
  );
  const unavailableBounded = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const unavailableBoundedOutput = `${unavailableBounded.stdout}${unavailableBounded.stderr}`;
  assert.match(
    unavailableBoundedOutput,
    /corpus=cold_start_without_candidate; stage=trace; mismatch=sequence_unavailable; raw output discarded/,
  );
  for (const value of privateValues) assert.equal(unavailableBoundedOutput.includes(value), false);

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed [auth_corpus_diagnostic_unavailable] ${privateValues.join(" ")}`,
  );
  const diagnosticUnavailable = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const diagnosticUnavailableOutput = `${diagnosticUnavailable.stdout}${diagnosticUnavailable.stderr}`;
  assert.match(
    diagnosticUnavailableOutput,
    /category=auth_contract; test=unknown; stage=diagnostic; mismatch=unavailable; raw output discarded/,
  );
  for (const value of privateValues)
    assert.equal(diagnosticUnavailableOutput.includes(value), false);

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed [auth_corpus_diagnostic_unavailable_private] ${privateValues.join(" ")}`,
  );
  const diagnosticUnavailableNearMatch = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const diagnosticUnavailableNearMatchOutput = `${diagnosticUnavailableNearMatch.stdout}${diagnosticUnavailableNearMatch.stderr}`;
  assert.doesNotMatch(diagnosticUnavailableNearMatchOutput, /stage=|mismatch=/);
  for (const value of privateValues)
    assert.equal(diagnosticUnavailableNearMatchOutput.includes(value), false);

  const fixedFallbacks = [
    ["snapshot", "diagnostic_inconsistent"],
    ["snapshot", "diagnostic_rejected"],
    ["trace", "diagnostic_inconsistent"],
    ["trace", "diagnostic_rejected"],
  ];
  for (const [stage, mismatch] of fixedFallbacks) {
    const marker = `[auth_corpus_stage_${stage}_${mismatch}]`;
    writeFileSync(
      file,
      `AuthRuntimeKernelTests assertion failed ${marker} ${privateValues.join(" ")}`,
    );
    const fixedFallback = spawnSync(
      process.execPath,
      ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
      { encoding: "utf8" },
    );
    const fixedFallbackOutput = `${fixedFallback.stdout}${fixedFallback.stderr}`;
    assert.match(
      fixedFallbackOutput,
      new RegExp(
        `category=auth_contract; test=unknown; stage=${stage}; mismatch=${mismatch}; raw output discarded`,
      ),
    );
    for (const value of privateValues) assert.equal(fixedFallbackOutput.includes(value), false);

    for (const nearMatch of [`${marker.slice(0, -1)}_private]`, `${marker}_private`]) {
      writeFileSync(
        file,
        `AuthRuntimeKernelTests assertion failed ${nearMatch} ${privateValues.join(" ")}`,
      );
      const rejected = spawnSync(
        process.execPath,
        ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
        { encoding: "utf8" },
      );
      const rejectedOutput = `${rejected.stdout}${rejected.stderr}`;
      assert.doesNotMatch(rejectedOutput, /stage=|mismatch=/);
      for (const value of privateValues) assert.equal(rejectedOutput.includes(value), false);
    }
  }

  writeFileSync(
    file,
    `AuthRuntimeKernelTests.swift:55: error: AuthRuntimeKernelTests.testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups : failed - [auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_timer_500] ${privateValues.join(" ")}`,
  );
  const xctFail = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const xctFailOutput = `${xctFail.stdout}${xctFail.stderr}`;
  assert.match(
    xctFailOutput,
    /test=testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups; corpus=cold_start_without_candidate; stage=trace; mismatch=sequence; index=1; expected=snapshot_published; actual=timer_500; raw output discarded/,
  );
  for (const value of privateValues) assert.equal(xctFailOutput.includes(value), false);

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed [auth_corpus_cold_start_without_candidate_stage_trace_count_expected_2_actual_3] ${privateValues.join(" ")}`,
  );
  const countBounded = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const countBoundedOutput = `${countBounded.stdout}${countBounded.stderr}`;
  assert.match(
    countBoundedOutput,
    /corpus=cold_start_without_candidate; stage=trace; mismatch=count; expected_count=2; actual_count=3; raw output discarded/,
  );
  for (const value of privateValues) assert.equal(countBoundedOutput.includes(value), false);

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed [auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_private_value] ${privateValues.join(" ")}`,
  );
  const invalidCombination = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const invalidCombinationOutput = `${invalidCombination.stdout}${invalidCombination.stderr}`;
  assert.doesNotMatch(invalidCombinationOutput, /corpus=|stage=|mismatch=/);
  for (const value of privateValues) assert.equal(invalidCombinationOutput.includes(value), false);

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed [auth_corpus_cold_start_without_candidate_stage_trace_sequence_index_1_expected_snapshot_published_actual_timer_5000] ${privateValues.join(" ")}`,
  );
  const nearMatch = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const nearMatchOutput = `${nearMatch.stdout}${nearMatch.stderr}`;
  assert.doesNotMatch(nearMatchOutput, /corpus=|stage=|mismatch=/);
  for (const value of privateValues) assert.equal(nearMatchOutput.includes(value), false);

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed [auth_corpus_cold_start_without_candidate_stage_trace_sequence_unavailable_private] ${privateValues.join(" ")}`,
  );
  const unavailableNearMatch = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const unavailableNearMatchOutput = `${unavailableNearMatch.stdout}${unavailableNearMatch.stderr}`;
  assert.doesNotMatch(unavailableNearMatchOutput, /corpus=|stage=|mismatch=/);
  for (const value of privateValues)
    assert.equal(unavailableNearMatchOutput.includes(value), false);

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed [auth_corpus_callback_cancel_private_stage_snapshot_state] ${privateValues.join(" ")}`,
  );
  const adversarial = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const adversarialOutput = `${adversarial.stdout}${adversarial.stderr}`;
  assert.doesNotMatch(adversarialOutput, /vector=|stage=|mismatch=/);
  for (const value of privateValues) assert.equal(adversarialOutput.includes(value), false);

  const annotationTest =
    "testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups";
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
      `test=${annotationTest}; stage=${stage}; mismatch=${mismatch}`,
    ]),
  ];
  for (const [marker, expectedDiagnostic] of annotationCases) {
    writeFileSync(
      file,
      `Test Case '-[FluyoTests.AuthRuntimeKernelTests ${annotationTest}]' failed (0.001 seconds). ${marker} learner@example.test\n::warning title=owned::private`,
    );
    const annotated = summarizeAnnotation(file, "test_current");
    assert.equal(annotated.status, 0);
    assert.equal(annotated.stderr, "");
    assert.equal(
      annotated.stdout,
      `::error title=${githubWorkflowAnnotationTitle}::phase=test_current; category=auth_contract; ${expectedDiagnostic}\n`,
    );
    assert.equal(annotated.stdout.match(/\n/g)?.length, 1);
    assert.doesNotMatch(annotated.stdout, /example\.test|warning|owned|private/i);
  }

  const compilerCases = [
    [
      "AuthRuntimeKernel.swift",
      "327",
      "18",
      "task-isolated value passed as a strongly transferred parameter; later accesses could race learner@example.test",
      "task_transfer",
    ],
    [
      "AuthRuntimeKernelTests.swift",
      "324",
      "20",
      "capture of 'privatePorts' with non-sendable type 'ScriptPorts' in a @Sendable closure",
      "sendability",
    ],
    [
      "AuthRuntimeKernel.swift",
      "91",
      "7",
      "main actor-isolated property 'privateValue' cannot be referenced from a nonisolated context",
      "actor_isolation",
    ],
    [
      "AuthRuntimeKernelTests.swift",
      "102",
      "11",
      "type of expression is ambiguous without a type annotation for PrivateSymbol",
      "type_inference",
    ],
    [
      "AuthRuntimeKernel.swift",
      "203",
      "16",
      "cannot convert value of type 'PrivateValue' to expected argument type 'AuthTraceEntry'",
      "type_mismatch",
    ],
    [
      "AuthRuntimeKernelTests.swift",
      "207",
      "9",
      "value of type 'AuthTraceEntry' has no member 'privateMember'",
      "missing_member",
    ],
    [
      "AuthRuntimeKernel.swift",
      "18",
      "3",
      "expected expression after operator privateSymbol",
      "syntax",
    ],
    [
      "AuthRuntimeKernelTests.swift",
      "19",
      "4",
      "the compiler rejected privateSymbol learner@example.test",
      "other",
    ],
  ];
  for (const [source, line, column, message, reason] of compilerCases) {
    writeFileSync(
      file,
      `/Users/private/DerivedData/Fluyo/${source}:${line}:${column}: error: ${message}\n::warning title=owned::private`,
    );
    const annotated = summarizeAnnotation(file, "test_current");
    assert.equal(annotated.status, 0);
    assert.equal(annotated.stderr, "");
    assert.equal(
      annotated.stdout,
      `::error title=${githubWorkflowAnnotationTitle}::phase=test_current; category=compile; source=${source}; line=${line}; column=${column}; reason=${reason}\n`,
    );
    assert.equal(annotated.stdout.match(/\n/g)?.length, 1);
    assert.doesNotMatch(
      annotated.stdout,
      /example\.test|DerivedData|private|warning|owned|PrivateSymbol|privateSymbol|privateMember|privatePorts|PrivateValue/i,
    );
  }

  writeFileSync(
    file,
    "/Users/private/Private.swift:999999:999999: error: the compiler rejected learner@example.test",
  );
  const unknownCompilerSource = summarizeAnnotation(file, "test_minimum");
  assert.equal(
    unknownCompilerSource.stdout,
    `::error title=${githubWorkflowAnnotationTitle}::phase=test_minimum; category=compile; source=unknown; line=0; column=0; reason=other\n`,
  );
  assert.doesNotMatch(unknownCompilerSource.stdout, /Private|example\.test/i);

  writeFileSync(
    file,
    `/Users/private/AuthRuntimeKernel.swift:12:7: error: sending 'privateValue' risks causing data races
/Users/private/AuthRuntimeKernelTests.swift:99:4: error: value of type 'Secret' has no member 'raw'`,
  );
  const firstCompilerError = summarizeAnnotation(file, "test_current");
  assert.equal(
    firstCompilerError.stdout,
    `::error title=${githubWorkflowAnnotationTitle}::phase=test_current; category=compile; source=AuthRuntimeKernel.swift; line=12; column=7; reason=task_transfer\n`,
  );
  assert.doesNotMatch(firstCompilerError.stdout, /Secret|raw|privateValue/i);

  writeFileSync(
    file,
    `/Users/private/AuthRuntimeKernel.swift:44:8: error: capture of 'privateValue' with non-sendable type 'PrivatePorts' in a @Sendable closure
Test Case '-[FluyoTests.AuthRuntimeKernelTests ${annotationTest}]' failed (0.001 seconds). learner@example.test`,
  );
  const compileOutranksNamedTest = summarizeAnnotation(file, "test_current");
  assert.equal(
    compileOutranksNamedTest.stdout,
    `::error title=${githubWorkflowAnnotationTitle}::phase=test_current; category=compile; source=AuthRuntimeKernel.swift; line=44; column=8; reason=sendability\n`,
  );

  writeFileSync(
    file,
    `/Users/private/AuthRuntimeKernel.swift:44:8: error: capture of 'privateValue' with non-sendable type 'PrivatePorts' in a @Sendable closure
Test Case '-[FluyoTests.AuthRuntimeKernelTests ${annotationTest}]' failed (0.001 seconds). [auth_corpus_callback_cancel_stage_snapshot_state] learner@example.test`,
  );
  const markerOutranksCompile = summarizeAnnotation(file, "test_current");
  assert.equal(
    markerOutranksCompile.stdout,
    `::error title=${githubWorkflowAnnotationTitle}::phase=test_current; category=auth_contract; corpus=callback_cancel; stage=snapshot; mismatch=state\n`,
  );

  writeFileSync(
    file,
    `/Users/private/AuthRuntimeKernel.swift:44:8: error: capture of 'privateValue' with non-sendable type 'PrivatePorts' in a @Sendable closure
undefined symbol: privateSymbol
linker command failed with exit code 1`,
  );
  const linkOutranksCompile = summarizeAnnotation(file, "test_current");
  assert.equal(
    linkOutranksCompile.stdout,
    `::error title=${githubWorkflowAnnotationTitle}::phase=test_current; category=link\n`,
  );

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed [auth_corpus_stage_trace_diagnostic_rejected_private] learner@example.test\n::error title=owned::private`,
  );
  const genericAnnotation = summarizeAnnotation(file, "test_current");
  assert.equal(genericAnnotation.status, 0);
  assert.equal(genericAnnotation.stderr, "");
  assert.equal(
    genericAnnotation.stdout,
    `::error title=${githubWorkflowAnnotationTitle}::phase=test_current; category=assertion\n`,
  );

  const outsideActions = summarizeAnnotation(file, "test_current", "false");
  assert.notEqual(outsideActions.status, 0);
  assert.equal(outsideActions.stdout, "");
} finally {
  rmSync(root, { recursive: true, force: true });
}
