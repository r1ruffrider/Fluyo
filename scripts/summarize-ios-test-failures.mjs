import fs from "node:fs";

const authCorpusIds = new Set([
  "cold_start_without_candidate",
  "cold_start_with_candidate",
  "warm_callback_success",
  "cold_callback_success",
  "callback_cancel",
  "callback_malformed",
  "callback_expired",
  "callback_replay",
  "callback_duplicate_delivery",
  "callback_unsupported",
  "callback_overlap_rejected",
  "refresh_success",
  "refresh_explicit_revocation",
  "refresh_transient_failure_preserves_candidate",
  "refresh_repeated_401_clears",
  "forbidden_403_preserves_session",
  "offline_startup_preserves_verified_display_only",
  "background_foreground",
  "termination_relaunch_without_transaction",
  "account_switch_cleanup",
  "stale_response_discarded",
  "stale_storage_write_discarded",
  "vault_corruption_cleanup",
  "clock_skew",
  "owner_subject_mismatch",
  "zero_telemetry_launch",
  "zero_telemetry_resume",
  "zero_telemetry_error",
  "public_state_is_secret_free",
  "callback_transaction_is_purpose_environment_host_path_and_expiry_bound",
  "callback_transaction_consumes_once_and_wipes",
  "valid_verified_session_survives_bad_link",
  "generation_change_cancels_work_and_blocks_stale_writes",
  "owner_data_waits_for_private_subject_confirmation",
  "transient_refresh_failure_preserves_candidate",
  "explicit_invalidation_and_repeated_401_clear",
  "403_never_refreshes_or_signs_out",
  "offline_never_confirms_new_owner_or_expands_access",
  "cleanup_precedes_signed_out_or_new_owner_exposure",
  "no_op_telemetry_has_zero_retention_and_zero_transport",
  "evidence_is_closed_and_mutation_safe",
]);
const traceValuePattern =
  "(?:init_read|callback_reserved|callback_consumed|callback_rejected|callback_duplicate|callback_overlap|provider_exchange|provider_refresh|owner_verify|vault_replace|owner_bind|timer_500|timer_15000|timer_30000|generation_fence|callback_purge|headers_clear|vault_clear|owner_purge|callback_confirm|vault_confirm|owner_confirm|stale_rejected|snapshot_published|effect_enqueued|terminal_latched)";
const traceCountPattern = "(?:[0-9]|[1-5][0-9]|6[0-3]|64_plus)";
const traceIndexPattern = "(?:[0-9]|[1-5][0-9]|6[0-3])";
const authDiagnosticPattern = new RegExp(
  `\\[auth_corpus_([a-z0-9_]+)_stage_(?:snapshot_(count|shape|state|candidate|owner|destination|outcome|generation)|trace_(?:(sequence_unavailable)|count_expected_(${traceCountPattern})_actual_(${traceCountPattern})|sequence_index_(${traceIndexPattern})_expected_(${traceValuePattern})_actual_(${traceValuePattern})))\\]`,
);
const diagnosticUnavailablePattern = /\[auth_corpus_diagnostic_unavailable\]/;

const [logPath, phaseFlag, phase] = process.argv.slice(2);
const phases = new Set([
  "build_debug",
  "build_staging",
  "build_release",
  "test_minimum",
  "test_current",
]);
if (!logPath || phaseFlag !== "--phase" || !phases.has(phase)) {
  throw new Error("Use a bounded iOS phase.");
}

const raw = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
const allowedTests = [
  "testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups",
  "testSerializedCoordinatorFencesEveryCleanupAwaitAndPublishesOnlyAfterConfirmation",
  "testCleanupFailureIsFencedAndDelayedEffectsAreGenerationBoundOneShot",
  "testExactStepAndTotalTimeoutBoundariesAndGenerationOverflowFailClosed",
];
const test =
  allowedTests.find((name) => {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
      `(?:Test Case ['"]?-\\[[^\\]\\r\\n]*AuthRuntimeKernelTests ${escapedName}\\]['"]? failed|AuthRuntimeKernelTests\\.${escapedName}\\s*:\\s*failed)`,
      "i",
    ).test(raw);
  }) ?? "unknown";
const authDiagnosticMatch = raw.match(authDiagnosticPattern);
const authDiagnostic =
  authDiagnosticMatch && authCorpusIds.has(authDiagnosticMatch[1]) ? authDiagnosticMatch : null;
const diagnosticUnavailable = diagnosticUnavailablePattern.test(raw);
const compileFailurePattern =
  /(?:\b(?:SwiftCompile|SwiftEmitModule|EmitSwiftModule)\b[^\r\n]*(?:failed|failure|nonzero exit)|failed to build module|\.swift:\d+:\d+:\s*error:)/i;
const category =
  authDiagnostic || diagnosticUnavailable || test !== "unknown"
    ? "auth_contract"
    : /linker command failed|undefined symbol/i.test(raw)
      ? "link"
      : compileFailurePattern.test(raw)
        ? "compile"
        : /simulator|simctl|destination.*unavailable/i.test(raw)
          ? "simulator"
          : /timed out|timeout/i.test(raw)
            ? "timeout"
            : /configuration|xcconfig|Info\.plist/i.test(raw)
              ? "configuration"
              : /XCTAssert|assertion failed|test case .* failed/i.test(raw)
                ? "assertion"
                : "unknown";
const boundedDiagnostic = authDiagnostic
  ? authDiagnostic[2]
    ? `; corpus=${authDiagnostic[1]}; stage=snapshot; mismatch=${authDiagnostic[2]}`
    : authDiagnostic[3]
      ? `; corpus=${authDiagnostic[1]}; stage=trace; mismatch=sequence_unavailable`
      : authDiagnostic[4]
        ? `; corpus=${authDiagnostic[1]}; stage=trace; mismatch=count; expected_count=${authDiagnostic[4]}; actual_count=${authDiagnostic[5]}`
        : `; corpus=${authDiagnostic[1]}; stage=trace; mismatch=sequence; index=${authDiagnostic[6]}; expected=${authDiagnostic[7]}; actual=${authDiagnostic[8]}`
  : diagnosticUnavailable
    ? "; stage=diagnostic; mismatch=unavailable"
    : "";
process.stderr.write(
  `iOS phase failed; phase=${phase}; category=${category}; test=${test}${boundedDiagnostic}; raw output discarded\n`,
);
