import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

  const aggregateFailure =
    "Test Case '-[FluyoTests.AuthRuntimeKernelTests testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups]' failed (0.001 seconds).";
  writeFileSync(
    file,
    `[auth_corpus_cold_start_without_candidate_stage_step_checkpoint]\n[auth_corpus_callback_cancel_stage_invariant_checkpoint]\n${aggregateFailure} ${privateValues.join(" ")}`,
  );
  const checkpointFailure = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const checkpointFailureOutput = `${checkpointFailure.stdout}${checkpointFailure.stderr}`;
  assert.equal(
    checkpointFailureOutput,
    "iOS phase failed; phase=test_current; category=auth_contract; test=testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups; corpus=callback_cancel; stage=invariant; mismatch=assertion; raw output discarded\n",
  );
  for (const value of privateValues) assert.equal(checkpointFailureOutput.includes(value), false);

  writeFileSync(
    file,
    `[auth_corpus_callback_cancel_stage_invariant_checkpoint]\nTest Case '-[FluyoTests.AuthRuntimeKernelTests testCleanupFailureIsFencedAndDelayedEffectsAreGenerationBoundOneShot]' failed (0.001 seconds). ${privateValues.join(" ")}`,
  );
  const checkpointFromPassingAggregate = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const checkpointFromPassingAggregateOutput = `${checkpointFromPassingAggregate.stdout}${checkpointFromPassingAggregate.stderr}`;
  assert.doesNotMatch(checkpointFromPassingAggregateOutput, /corpus=|stage=|mismatch=/);
  for (const value of privateValues)
    assert.equal(checkpointFromPassingAggregateOutput.includes(value), false);

  writeFileSync(
    file,
    `[auth_corpus_corpus_manifest_stage_manifest_checkpoint]\n${aggregateFailure} ${privateValues.join(" ")}`,
  );
  const manifestCheckpoint = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_minimum"],
    { encoding: "utf8" },
  );
  assert.equal(
    `${manifestCheckpoint.stdout}${manifestCheckpoint.stderr}`,
    "iOS phase failed; phase=test_minimum; category=auth_contract; test=testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups; corpus=corpus_manifest; stage=manifest; mismatch=assertion; raw output discarded\n",
  );

  const checkpointStages = [
    "manifest",
    "fingerprint",
    "step",
    "snapshot",
    "effects",
    "drain",
    "trace",
    "wipe",
    "rejected_writes",
    "completions",
    "exchange",
    "generation",
    "terminal",
    "invariant",
  ];
  for (const stage of checkpointStages) {
    writeFileSync(
      file,
      `[auth_corpus_callback_cancel_stage_${stage}_checkpoint]\n${aggregateFailure} ${privateValues.join(" ")}`,
    );
    const checkpointStage = spawnSync(
      process.execPath,
      ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
      { encoding: "utf8" },
    );
    assert.match(
      `${checkpointStage.stdout}${checkpointStage.stderr}`,
      new RegExp(`corpus=callback_cancel; stage=${stage}; mismatch=assertion`),
    );
  }

  const invariantDiagnosticCases = [
    ["generation_change_cancels_work_and_blocks_stale_writes", "comparison_start_timeout"],
    ["generation_change_cancels_work_and_blocks_stale_writes", "comparison_release_timeout"],
    ["evidence_is_closed_and_mutation_safe", "terminal_not_fenced_after_initialize"],
    ["evidence_is_closed_and_mutation_safe", "terminal_not_fenced_after_receive_callback"],
    ["evidence_is_closed_and_mutation_safe", "terminal_not_fenced_after_cancel_callback"],
    ["evidence_is_closed_and_mutation_safe", "terminal_not_fenced_after_handle_401"],
    ["evidence_is_closed_and_mutation_safe", "terminal_not_fenced_after_handle_403"],
    ["evidence_is_closed_and_mutation_safe", "terminal_not_fenced_after_schedule_timeout"],
    ["evidence_is_closed_and_mutation_safe", "terminal_not_fenced_after_delayed_announcement"],
    ["evidence_is_closed_and_mutation_safe", "terminal_not_fenced_after_sign_out"],
    ["evidence_is_closed_and_mutation_safe", "terminal_not_fenced_after_switch_account"],
    ["evidence_is_closed_and_mutation_safe", "terminal_not_fenced_after_entrypoint_sequence"],
  ];
  assert.equal(invariantDiagnosticCases.length, 12);
  for (const [corpusId, mismatch] of invariantDiagnosticCases) {
    const marker = `[auth_corpus_${corpusId}_stage_invariant_${mismatch}]`;
    writeFileSync(file, `${marker}\n${aggregateFailure} ${privateValues.join(" ")}`);
    const invariantDiagnostic = spawnSync(
      process.execPath,
      ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
      { encoding: "utf8" },
    );
    const invariantDiagnosticOutput = `${invariantDiagnostic.stdout}${invariantDiagnostic.stderr}`;
    assert.equal(
      invariantDiagnosticOutput,
      `iOS phase failed; phase=test_current; category=auth_contract; test=testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups; corpus=${corpusId}; stage=invariant; mismatch=${mismatch}; raw output discarded\n`,
    );
    for (const value of privateValues)
      assert.equal(invariantDiagnosticOutput.includes(value), false);
  }

  const [validInvariantCorpus, validInvariantMismatch] = invariantDiagnosticCases[0];
  const validInvariantMarker = `[auth_corpus_${validInvariantCorpus}_stage_invariant_${validInvariantMismatch}]`;
  for (const invalidInvariantMarker of [
    "[auth_corpus_evidence_is_closed_and_mutation_safe_stage_invariant_comparison_start_timeout]",
    "[auth_corpus_generation_change_cancels_work_and_blocks_stale_writes_stage_invariant_terminal_not_fenced_after_initialize]",
    "[auth_corpus_private_value_stage_invariant_comparison_start_timeout]",
    "[auth_corpus_generation_change_cancels_work_and_blocks_stale_writes_stage_invariant_private_value]",
    "[auth_corpus_generation_change_cancels_work_and_blocks_stale_writes_stage_invariant_comparison_start_timeout_private]",
    "[auth_corpus_generation_change_cancels_work_and_blocks_stale_writes_stage_invariant_comparison_start_timeout]_private",
  ]) {
    writeFileSync(
      file,
      `${validInvariantMarker}\n${invalidInvariantMarker}\n${aggregateFailure} ${privateValues.join(" ")}`,
    );
    const rejectedInvariant = spawnSync(
      process.execPath,
      ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
      { encoding: "utf8" },
    );
    const rejectedInvariantOutput = `${rejectedInvariant.stdout}${rejectedInvariant.stderr}`;
    assert.doesNotMatch(rejectedInvariantOutput, /corpus=|stage=|mismatch=/);
    for (const value of privateValues) assert.equal(rejectedInvariantOutput.includes(value), false);
  }

  writeFileSync(
    file,
    `${validInvariantMarker}\n[auth_corpus_callback_cancel_stage_invariant_checkpoint]\n${aggregateFailure} ${privateValues.join(" ")}`,
  );
  const invariantOutranksCheckpoint = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  assert.match(
    `${invariantOutranksCheckpoint.stdout}${invariantOutranksCheckpoint.stderr}`,
    new RegExp(
      `corpus=${validInvariantCorpus}; stage=invariant; mismatch=${validInvariantMismatch}`,
    ),
  );

  for (const invalidCheckpoint of [
    "[auth_corpus_private_value_stage_step_checkpoint]",
    "[auth_corpus_callback_cancel_stage_private_value_checkpoint]",
    "[auth_corpus_callback_cancel_stage_step_checkpoint_private]",
    "[auth_corpus_callback_cancel_stage_step_checkpoint]_private",
  ]) {
    writeFileSync(
      file,
      `[auth_corpus_cold_start_without_candidate_stage_step_checkpoint]\n${invalidCheckpoint}\n${aggregateFailure} ${privateValues.join(" ")}`,
    );
    const rejectedCheckpoint = spawnSync(
      process.execPath,
      ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
      { encoding: "utf8" },
    );
    const rejectedCheckpointOutput = `${rejectedCheckpoint.stdout}${rejectedCheckpoint.stderr}`;
    assert.doesNotMatch(rejectedCheckpointOutput, /corpus=|stage=|mismatch=/);
    for (const value of privateValues)
      assert.equal(rejectedCheckpointOutput.includes(value), false);
  }

  writeFileSync(
    file,
    `[auth_corpus_callback_cancel_stage_invariant_checkpoint]\n[auth_corpus_callback_cancel_stage_snapshot_state]\n${aggregateFailure} ${privateValues.join(" ")}`,
  );
  const detailedOutranksCheckpoint = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  assert.match(
    `${detailedOutranksCheckpoint.stdout}${detailedOutranksCheckpoint.stderr}`,
    /corpus=callback_cancel; stage=snapshot; mismatch=state; raw output discarded/,
  );

  const swiftTestSource = readFileSync(
    join("apps", "ios", "FluyoTests", "AuthRuntimeKernelTests.swift"),
    "utf8",
  );
  const checkpointAllowlistSource = swiftTestSource.slice(
    swiftTestSource.indexOf("private static let checkpointCorpusIds"),
    swiftTestSource.indexOf("private struct Vector"),
  );
  const swiftCheckpointIds = [...checkpointAllowlistSource.matchAll(/"([a-z0-9_]+)"/g)].map(
    (match) => match[1],
  );
  const corpusRows = readFileSync(
    join("contracts", "mobile", "auth-runtime-synthetic", "v1", "vectors.tsv"),
    "utf8",
  )
    .trimEnd()
    .split("\n")
    .slice(1)
    .map((line) => line.split("\t")[1]);
  assert.equal(corpusRows.length, 41);
  assert.equal(new Set(corpusRows).size, 41);
  const recordedAssertionRegularStages = [
    "fingerprint",
    "step",
    "snapshot",
    "effects",
    "drain",
    "trace",
    "wipe",
    "rejected_writes",
    "completions",
    "generation",
    "terminal",
    "invariant",
  ];
  const recordedAssertionPairs = [
    ["corpus_manifest", "manifest"],
    ...corpusRows.flatMap((corpusId) =>
      recordedAssertionRegularStages.map((stage) => [corpusId, stage]),
    ),
    ["warm_callback_success", "exchange"],
  ];
  assert.equal(recordedAssertionPairs.length, 494);
  assert.equal(
    new Set(recordedAssertionPairs.map(([corpusId, stage]) => `${corpusId}\0${stage}`)).size,
    494,
  );
  for (const [corpusId, stage] of recordedAssertionPairs) {
    const marker = `[auth_corpus_${corpusId}_stage_${stage}_assertion_recorded]`;
    writeFileSync(file, `${marker}\n${aggregateFailure} ${privateValues.join(" ")}`);
    const recordedAssertion = spawnSync(
      process.execPath,
      ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
      { encoding: "utf8" },
    );
    const recordedAssertionOutput = `${recordedAssertion.stdout}${recordedAssertion.stderr}`;
    assert.equal(
      recordedAssertionOutput,
      `iOS phase failed; phase=test_current; category=auth_contract; test=testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups; corpus=${corpusId}; stage=${stage}; mismatch=assertion_recorded; raw output discarded\n`,
    );
    for (const value of privateValues) assert.equal(recordedAssertionOutput.includes(value), false);
  }

  const validRecordedMarker = "[auth_corpus_callback_cancel_stage_step_assertion_recorded]";
  const inconsistentRecordedMarker =
    "[auth_corpus_callback_cancel_stage_snapshot_assertion_recorded]";
  for (const invalidRecordedMarker of [
    "[auth_corpus_corpus_manifest_stage_step_assertion_recorded]",
    "[auth_corpus_callback_cancel_stage_manifest_assertion_recorded]",
    "[auth_corpus_callback_cancel_stage_exchange_assertion_recorded]",
    "[auth_corpus_warm_callback_success_stage_manifest_assertion_recorded]",
    "[auth_corpus_private_value_stage_step_assertion_recorded]",
    "[auth_corpus_callback_cancel_stage_private_value_assertion_recorded]",
    "[auth_corpus_callback_cancel_stage_step_assertion_recorded_private]",
    "[auth_corpus_callback_cancel_stage_step_assertion_recorded]_private",
  ]) {
    writeFileSync(
      file,
      `${validRecordedMarker}\n${invalidRecordedMarker}\n${aggregateFailure} ${privateValues.join(" ")}`,
    );
    const rejectedRecorded = spawnSync(
      process.execPath,
      ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
      { encoding: "utf8" },
    );
    const rejectedRecordedOutput = `${rejectedRecorded.stdout}${rejectedRecorded.stderr}`;
    assert.doesNotMatch(rejectedRecordedOutput, /corpus=|stage=|mismatch=/);
    for (const value of privateValues) assert.equal(rejectedRecordedOutput.includes(value), false);
  }
  writeFileSync(file, `${validRecordedMarker}\n${inconsistentRecordedMarker}\n${aggregateFailure}`);
  const inconsistentRecorded = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  assert.doesNotMatch(
    `${inconsistentRecorded.stdout}${inconsistentRecorded.stderr}`,
    /corpus=|stage=|mismatch=/,
  );
  writeFileSync(file, `${validRecordedMarker}\n${validRecordedMarker}\n${aggregateFailure}`);
  const duplicateRecorded = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  assert.match(
    `${duplicateRecorded.stdout}${duplicateRecorded.stderr}`,
    /corpus=callback_cancel; stage=step; mismatch=assertion_recorded/,
  );
  writeFileSync(
    file,
    `${validRecordedMarker}\nTest Case '-[FluyoTests.AuthRuntimeKernelTests testCleanupFailureIsFencedAndDelayedEffectsAreGenerationBoundOneShot]' failed (0.001 seconds).`,
  );
  const recordedFromOtherTest = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  assert.doesNotMatch(
    `${recordedFromOtherTest.stdout}${recordedFromOtherTest.stderr}`,
    /corpus=|stage=|mismatch=/,
  );

  writeFileSync(
    file,
    `${validRecordedMarker}\n[auth_corpus_callback_cancel_stage_invariant_checkpoint]\n${aggregateFailure}`,
  );
  const recordedOutranksCheckpoint = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  assert.match(
    `${recordedOutranksCheckpoint.stdout}${recordedOutranksCheckpoint.stderr}`,
    /corpus=callback_cancel; stage=step; mismatch=assertion_recorded/,
  );
  writeFileSync(
    file,
    `${validRecordedMarker}\n[auth_corpus_cold_start_without_candidate_stage_snapshot_state]\n${aggregateFailure}`,
  );
  const snapshotOutranksRecorded = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  assert.match(
    `${snapshotOutranksRecorded.stdout}${snapshotOutranksRecorded.stderr}`,
    /corpus=cold_start_without_candidate; stage=snapshot; mismatch=state/,
  );
  writeFileSync(file, `${validRecordedMarker}\n${validInvariantMarker}\n${aggregateFailure}`);
  const invariantOutranksRecorded = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  assert.match(
    `${invariantOutranksRecorded.stdout}${invariantOutranksRecorded.stderr}`,
    new RegExp(
      `corpus=${validInvariantCorpus}; stage=invariant; mismatch=${validInvariantMismatch}`,
    ),
  );

  const summarizerSource = readFileSync("scripts/summarize-ios-test-failures.mjs", "utf8");
  const parseSetDeclaration = (name) => {
    const prefix = `const ${name} = new Set([`;
    const start = summarizerSource.indexOf(prefix);
    assert.notEqual(start, -1, `${name} declaration is required`);
    assert.equal(
      summarizerSource.indexOf(prefix, start + prefix.length),
      -1,
      `${name} declaration must be unique`,
    );
    const bodyStart = start + prefix.length;
    const bodyEnd = summarizerSource.indexOf("]);", bodyStart);
    assert.notEqual(bodyEnd, -1, `${name} declaration must be closed`);
    return summarizerSource
      .slice(bodyStart, bodyEnd)
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
  };
  const authCorpusTokens = parseSetDeclaration("authCorpusIds");
  assert.equal(authCorpusTokens.length, 41);
  for (const token of authCorpusTokens) assert.match(token, /^"[a-z0-9_]+"$/);
  const summarizerAuthCorpusIds = authCorpusTokens.map((token) => JSON.parse(token));
  assert.equal(new Set(summarizerAuthCorpusIds).size, 41);
  assert.deepEqual([...summarizerAuthCorpusIds].sort(), [...corpusRows].sort());

  const checkpointCorpusTokens = parseSetDeclaration("checkpointCorpusIds");
  assert.deepEqual(checkpointCorpusTokens, ['"corpus_manifest"', "...authCorpusIds"]);
  const summarizerCheckpointCorpusIds = ["corpus_manifest", ...summarizerAuthCorpusIds];
  assert.equal(new Set(summarizerCheckpointCorpusIds).size, 42);
  assert.deepEqual(
    [...summarizerCheckpointCorpusIds].sort(),
    ["corpus_manifest", ...corpusRows].sort(),
  );
  const recordedAssertionStageTokens = parseSetDeclaration("recordedAssertionRegularStages");
  assert.deepEqual(
    recordedAssertionStageTokens.map((token) => JSON.parse(token)).sort(),
    [...recordedAssertionRegularStages].sort(),
  );
  const expectedInvariantDeclarationStrings = [
    ...new Set(invariantDiagnosticCases.flatMap(([corpusId, mismatch]) => [corpusId, mismatch])),
  ].sort();
  const summarizerInvariantStart = summarizerSource.indexOf(
    "const invariantDiagnosticsByCorpus = new Map([",
  );
  const summarizerInvariantEnd = summarizerSource.indexOf(
    "]);\nconst recordedAssertionRegularStages",
    summarizerInvariantStart,
  );
  assert.notEqual(summarizerInvariantStart, -1);
  assert.notEqual(summarizerInvariantEnd, -1);
  const summarizerInvariantDeclaration = summarizerSource.slice(
    summarizerInvariantStart,
    summarizerInvariantEnd,
  );
  const summarizerInvariantStrings = [
    ...summarizerInvariantDeclaration.matchAll(/"([a-z0-9_]+)"/g),
  ].map((match) => match[1]);
  assert.equal(summarizerInvariantStrings.length, 14);
  assert.deepEqual([...summarizerInvariantStrings].sort(), expectedInvariantDeclarationStrings);

  assert.deepEqual(
    [...new Set(swiftCheckpointIds)].sort(),
    ["corpus_manifest", ...new Set(corpusRows)].sort(),
  );
  const swiftRegularStageSource = swiftTestSource.slice(
    swiftTestSource.indexOf("private static let regularFailureStages"),
    swiftTestSource.indexOf("private static let invariantDiagnosticsByCorpus"),
  );
  const swiftRegularStages = [...swiftRegularStageSource.matchAll(/\.([A-Za-z][A-Za-z0-9]*)/g)].map(
    (match) => (match[1] === "rejectedWrites" ? "rejected_writes" : match[1]),
  );
  assert.equal(swiftRegularStages.length, 12);
  assert.deepEqual([...swiftRegularStages].sort(), [...recordedAssertionRegularStages].sort());
  assert.match(
    swiftTestSource,
    /guard Self\.checkpointCorpusIds\.contains\(corpusId\) else \{ return "\[auth_corpus_stage_diagnostic_rejected\]" \}/,
  );
  assert.match(
    swiftTestSource,
    /let isManifest = corpusId == "corpus_manifest" && stage == \.manifest[\s\S]*let isRegular = corpusId != "corpus_manifest"[\s\S]*let isExchange = corpusId == "warm_callback_success" && stage == \.exchange/,
  );
  const aggregateMethod = swiftTestSource.slice(
    swiftTestSource.indexOf(
      "func testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups()",
    ),
    swiftTestSource.indexOf(
      "func testSerializedCoordinatorFencesEveryCleanupAwaitAndPublishesOnlyAfterConfirmation()",
    ),
  );
  assert.match(
    aggregateMethod,
    /let observer = corpusStageObserver[\s\S]*observer\.reset\(\)[\s\S]*defer \{ observer\.reset\(\) \}[\s\S]*observeStage\("corpus_manifest", \.manifest, observer: observer\)[\s\S]*let rows = try loadCorpus\(\)/,
  );
  assert.doesNotMatch(aggregateMethod, /continueAfterFailure/);
  assert.match(aggregateMethod, /run\(vector, observer: observer\)/);
  assert.match(aggregateMethod, /closeObservedStage\(observer\)/);
  const runMethod = swiftTestSource.slice(
    swiftTestSource.indexOf(
      "private func run(_ vector: Vector, observer: CorpusStageObserver? = nil)",
    ),
    swiftTestSource.indexOf("private func assertFenceTraceSemantics"),
  );
  const requiredRunStages = [
    "fingerprint",
    "step",
    "snapshot",
    "effects",
    "drain",
    "trace",
    "wipe",
    "rejectedWrites",
    "completions",
    "exchange",
    "generation",
    "terminal",
    "invariant",
  ];
  for (const stage of requiredRunStages) {
    assert.match(
      runMethod,
      new RegExp(`observeStage\\(vector\\.id, \\.${stage}, observer: observer\\)`),
    );
  }
  assert.equal(
    [...runMethod.matchAll(/observeStage\(vector\.id, \.[A-Za-z]+, observer: observer\)/g)].length,
    requiredRunStages.length,
  );
  assert.match(
    runMethod,
    /var rejected = 0\s*for step in vector\.steps \{\s*rejected \+= try await observeStage\(vector\.id, \.step, observer: observer\) \{\s*try await execute\(step, coordinator, ports\)\s*\}\s*\}/,
  );
  assert.doesNotMatch(
    runMethod,
    /observeStage\(vector\.id, \.step, observer: observer\) \{[\s\S]*for step in vector\.steps/,
  );
  assert.doesNotMatch(runMethod, /emitCorpusCheckpoint/);

  const observerClassSource = swiftTestSource.slice(
    swiftTestSource.indexOf("private final class CorpusStageObserver"),
    swiftTestSource.indexOf("private static let regularFailureStages"),
  );
  const observerSource = swiftTestSource.slice(
    swiftTestSource.indexOf("private func observeStage"),
    swiftTestSource.indexOf("private func failInvariant"),
  );
  assert.doesNotMatch(swiftTestSource, /override func record\(_ issue: XCTIssue\)/);
  assert.doesNotMatch(swiftTestSource, /super\.record\(issue\)/);
  assert.doesNotMatch(swiftTestSource, /override func recordFailure/);
  assert.doesNotMatch(swiftTestSource, /XCTestRun|failureCount|totalFailureCount/);
  assert.doesNotMatch(swiftTestSource, /\[auth_corpus_diagnostic_unavailable\]/);
  assert.doesNotMatch(observerClassSource, /NSLock|assertionRecorded|withNamedDiagnostic/);
  assert.match(observerClassSource, /func currentStage\(\) -> ActiveStage\?/);
  assert.match(
    observerSource,
    /guard let observer else \{[\s\S]*catch CorpusError\.diagnosticAbort[\s\S]*throw CorpusError\.diagnosticAbort[\s\S]*catch \{[\s\S]*throw CorpusError\.diagnosticAbort[\s\S]*catch CorpusError\.diagnosticAbort[\s\S]*observer\.reset\(\)[\s\S]*throw CorpusError\.diagnosticAbort[\s\S]*catch \{[\s\S]*observer\.finishStage\(\)[\s\S]*failRecordedAssertion[\s\S]*throw CorpusError\.diagnosticAbort/,
  );
  assert.match(
    observerSource,
    /let result = try await operation\(\)[\s\S]*observer\.finishStage\(\)[\s\S]*return result/,
  );
  assert.match(
    observerSource,
    /private func requireCorpusAssertion[\s\S]*guard matches\(\) else \{ try failCurrentStageAssertion\(\) \}/,
  );
  assert.match(
    observerSource,
    /private func failCurrentStageAssertion[\s\S]*currentStage\(\)[\s\S]*failRecordedAssertion\(active\)/,
  );
  assert.match(
    observerSource,
    /private func failRecordedAssertion[\s\S]*print\(marker\)[\s\S]*throw CorpusError\.diagnosticAbort/,
  );
  const genericFailureSource = observerSource.slice(
    observerSource.indexOf("private func failRecordedAssertion"),
  );
  assert.doesNotMatch(genericFailureSource, /XCTFail|\.record\(/);

  const swiftFunctions = new Map();
  const swiftFunctionPattern =
    /(?:^|\n)\s*(?:private\s+)?(?:override\s+)?func\s+([A-Za-z_][A-Za-z0-9_]*)[^\{]*\{/g;
  for (const match of swiftTestSource.matchAll(swiftFunctionPattern)) {
    const open = match.index + match[0].lastIndexOf("{");
    let depth = 1;
    let end = open + 1;
    while (end < swiftTestSource.length && depth > 0) {
      if (swiftTestSource[end] === "{") depth += 1;
      if (swiftTestSource[end] === "}") depth -= 1;
      end += 1;
    }
    const name = match[1];
    swiftFunctions.set(name, [
      ...(swiftFunctions.get(name) ?? []),
      swiftTestSource.slice(open + 1, end - 1),
    ]);
  }
  const aggregateReachable = new Set([
    "testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups",
  ]);
  const aggregatePending = [...aggregateReachable];
  while (aggregatePending.length > 0) {
    const name = aggregatePending.pop();
    for (const body of swiftFunctions.get(name) ?? []) {
      for (const call of body.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
        const callee = call[1];
        if (swiftFunctions.has(callee) && !aggregateReachable.has(callee)) {
          aggregateReachable.add(callee);
          aggregatePending.push(callee);
        }
      }
    }
  }
  for (const required of [
    "run",
    "execute",
    "validateInvariant",
    "loadCorpus",
    "observeStage",
    "requireCorpusAssertion",
    "failCurrentStageAssertion",
  ]) {
    assert.equal(aggregateReachable.has(required), true);
  }
  const aggregateReachableSource = [...aggregateReachable]
    .flatMap((name) => swiftFunctions.get(name) ?? [])
    .join("\n");
  assert.doesNotMatch(
    aggregateReachableSource,
    /\b(?:XCTAssert[A-Za-z]*|XCTFail|XCTUnwrap|XCTSkip[A-Za-z]*)\s*\(/,
  );
  assert.doesNotMatch(aggregateReachableSource, /\bthrow\s+error\b/);
  const swiftInitializerBodies = [];
  const swiftInitializerPattern =
    /(?<!\.)\binit[!?]?\s*\([^{}]*\)(?:\s+(?:async|throws|rethrows))*\s*\{/g;
  for (const match of swiftTestSource.matchAll(swiftInitializerPattern)) {
    const open = match.index + match[0].lastIndexOf("{");
    let depth = 1;
    let end = open + 1;
    while (end < swiftTestSource.length && depth > 0) {
      if (swiftTestSource[end] === "{") depth += 1;
      if (swiftTestSource[end] === "}") depth -= 1;
      end += 1;
    }
    swiftInitializerBodies.push(swiftTestSource.slice(open + 1, end - 1));
  }
  assert.equal(swiftInitializerBodies.length >= 10, true);
  assert.equal(
    swiftInitializerBodies.some((body) => body.includes("guard f.count == 14")),
    true,
  );
  assert.doesNotMatch(
    swiftInitializerBodies.join("\n"),
    /\b(?:XCTAssert[A-Za-z]*|XCTFail|XCTUnwrap|XCTSkip[A-Za-z]*)\s*\(/,
  );
  assert.match(
    swiftTestSource,
    /func testUnexpectedCorpusErrorIsConvertedToPayloadFreeSentinel\(\) async[\s\S]*private_unexpected_corpus_token[\s\S]*observeStage\("callback_cancel", \.step, observer: nil\)[\s\S]*catch CorpusError\.diagnosticAbort/,
  );

  const invariantDiagnosticSource = swiftTestSource.slice(
    swiftTestSource.indexOf("private static let invariantDiagnosticsByCorpus"),
    swiftTestSource.indexOf("private static let diagnosticCorpusId"),
  );
  const swiftInvariantStrings = [...invariantDiagnosticSource.matchAll(/"([a-z0-9_]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(swiftInvariantStrings.length, 14);
  assert.deepEqual([...swiftInvariantStrings].sort(), expectedInvariantDeclarationStrings);
  for (const [, mismatch] of invariantDiagnosticCases) {
    assert.equal([...swiftTestSource.matchAll(new RegExp(`"${mismatch}"`, "g"))].length >= 2, true);
  }
  const generationCoordination = swiftTestSource.slice(
    swiftTestSource.indexOf("private func verifyEveryDestructiveMutationRejectsStaleGeneration()"),
    swiftTestSource.indexOf("private func verifyCallbackValidationCancellationPrecedesPurge()"),
  );
  assert.match(
    generationCoordination,
    /if !comparisonStarted \{[\s\S]*generations\.releaseComparison\(\)[\s\S]*_ = await mutation\.value[\s\S]*comparison_start_timeout/,
  );
  assert.match(
    generationCoordination,
    /let applied = await mutation\.value; await activation\.value[\s\S]*comparisonReleaseTimedOut\(\)[\s\S]*comparison_release_timeout/,
  );
  const generationCell = swiftTestSource.slice(
    swiftTestSource.indexOf("private final class GenerationCell"),
    swiftTestSource.indexOf("private actor ScriptProvider"),
  );
  assert.doesNotMatch(generationCell, /XCTAssert/);
  assert.match(generationCell, /func waitComparisonStarted\(\) -> Bool/);
  assert.match(generationCell, /releaseTimedOut = !released/);
  const terminalEntryPoints = swiftTestSource.slice(
    swiftTestSource.indexOf("private func exerciseTerminalEntryPoints"),
    swiftTestSource.indexOf("private func makeCoordinator"),
  );
  const entrypointMismatches = invariantDiagnosticCases
    .filter(
      ([corpusId, mismatch]) =>
        corpusId === "evidence_is_closed_and_mutation_safe" &&
        mismatch !== "terminal_not_fenced_after_entrypoint_sequence",
    )
    .map(([, mismatch]) => mismatch);
  assert.equal(entrypointMismatches.length, 9);
  for (const mismatch of entrypointMismatches) {
    assert.match(
      terminalEntryPoints,
      new RegExp(`try await requireTerminalFence\\(coordinator, "${mismatch}"\\)`),
    );
  }
  assert.match(
    swiftTestSource,
    /case "evidence_is_closed_and_mutation_safe":[\s\S]*let terminal = await coordinator\.isTerminalFenced\(\)[\s\S]*if !terminal \{ try failInvariant\(id, "terminal_not_fenced_after_entrypoint_sequence"\) \}/,
  );
  const evidenceInvariant = swiftTestSource.slice(
    swiftTestSource.indexOf('case "evidence_is_closed_and_mutation_safe":'),
    swiftTestSource.indexOf('case "no_op_telemetry_has_zero_retention_and_zero_transport"'),
  );
  assert.doesNotMatch(evidenceInvariant, /XCTAssertTrue\(terminal\)/);
  assert.match(
    swiftTestSource,
    /private func failInvariant[\s\S]*print\(marker\)[\s\S]*throw CorpusError\.diagnosticAbort/,
  );
  assert.match(
    swiftTestSource,
    /private func requireCorpusMatch[\s\S]*print\(boundedMarker\)[\s\S]*throw CorpusError\.diagnosticAbort/,
  );
  const namedDiagnosticFailureSource = swiftTestSource.slice(
    swiftTestSource.indexOf("private func failInvariant"),
    swiftTestSource.indexOf("private let boundedDiagnosticPattern"),
  );
  assert.doesNotMatch(namedDiagnosticFailureSource, /XCTFail|XCTAssert|XCTUnwrap|XCTSkip/);

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
      "[auth_corpus_callback_cancel_stage_step_assertion_recorded]",
      "corpus=callback_cancel; stage=step; mismatch=assertion_recorded",
    ],
    ...invariantDiagnosticCases.map(([corpusId, mismatch]) => [
      `[auth_corpus_${corpusId}_stage_invariant_${mismatch}]`,
      `corpus=${corpusId}; stage=invariant; mismatch=${mismatch}`,
    ]),
    [
      "[auth_corpus_callback_cancel_stage_invariant_checkpoint]",
      "corpus=callback_cancel; stage=invariant; mismatch=assertion",
    ],
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
