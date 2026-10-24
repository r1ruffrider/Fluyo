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
    /phase=test_current; category=auth_contract; test=unknown; raw output discarded/,
  );
  for (const value of privateValues) assert.equal(output.includes(value), false);

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
