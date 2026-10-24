import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
} finally {
  rmSync(root, { recursive: true, force: true });
}
