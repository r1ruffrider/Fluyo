import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { githubWorkflowErrorAnnotation } from "./github-workflow-annotation.mjs";

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
const checkpointCorpusIds = new Set(["corpus_manifest", ...authCorpusIds]);
const checkpointStages = new Set([
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
]);
const invariantDiagnosticsByCorpus = new Map([
  [
    "generation_change_cancels_work_and_blocks_stale_writes",
    new Set(["comparison_start_timeout", "comparison_release_timeout"]),
  ],
  [
    "evidence_is_closed_and_mutation_safe",
    new Set([
      "terminal_not_fenced_after_initialize",
      "terminal_not_fenced_after_receive_callback",
      "terminal_not_fenced_after_cancel_callback",
      "terminal_not_fenced_after_handle_401",
      "terminal_not_fenced_after_handle_403",
      "terminal_not_fenced_after_schedule_timeout",
      "terminal_not_fenced_after_delayed_announcement",
      "terminal_not_fenced_after_sign_out",
      "terminal_not_fenced_after_switch_account",
      "terminal_not_fenced_after_entrypoint_sequence",
    ]),
  ],
]);
const recordedAssertionRegularStages = new Set([
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
]);
const traceValuePattern =
  "(?:init_read|callback_reserved|callback_consumed|callback_rejected|callback_duplicate|callback_overlap|provider_exchange|provider_refresh|owner_verify|vault_replace|owner_bind|timer_500|timer_15000|timer_30000|generation_fence|callback_purge|headers_clear|vault_clear|owner_purge|callback_confirm|vault_confirm|owner_confirm|stale_rejected|snapshot_published|effect_enqueued|terminal_latched)";
const traceCountPattern = "(?:[0-9]|[1-5][0-9]|6[0-3]|64_plus)";
const traceIndexPattern = "(?:[0-9]|[1-5][0-9]|6[0-3])";
const authDiagnosticPattern = new RegExp(
  `\\[auth_corpus_([a-z0-9_]+)_stage_(?:snapshot_(count|shape|state|candidate|owner|destination|outcome|generation)|trace_(?:(sequence_unavailable)|count_expected_(${traceCountPattern})_actual_(${traceCountPattern})|sequence_index_(${traceIndexPattern})_expected_(${traceValuePattern})_actual_(${traceValuePattern})))\\]`,
);
const diagnosticFallbackPattern =
  /\[auth_corpus_stage_(snapshot|trace)_(diagnostic_inconsistent|diagnostic_rejected)\](?![A-Za-z0-9_])/;
const diagnosticUnavailablePattern = /\[auth_corpus_diagnostic_unavailable\]/;
const checkpointCandidatePattern =
  /\[auth_corpus_([^\]\r\n]{1,128})_stage_([^\]\r\n]{1,64})_checkpoint([^\]\r\n]{0,128})\]([A-Za-z0-9_]?)/g;
const invariantDiagnosticCandidatePattern =
  /\[auth_corpus_([^\]\r\n]{1,128})_stage_invariant_([^\]\r\n]{1,128})\]([A-Za-z0-9_]?)/g;
const recordedAssertionCandidatePattern =
  /\[auth_corpus_([^\]\r\n]{1,128})_stage_([^\]\r\n]{1,64})_assertion_recorded([^\]\r\n]{0,128})\]([A-Za-z0-9_]?)/g;

const currentAllowedTests = Object.freeze([
  "testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups",
  "testSerializedCoordinatorFencesEveryCleanupAwaitAndPublishesOnlyAfterConfirmation",
  "testCleanupFailureIsFencedAndDelayedEffectsAreGenerationBoundOneShot",
  "testExactStepAndTotalTimeoutBoundariesAndGenerationOverflowFailClosed",
  "testDiagnosticGrammarAndFallbackSelectionAreTotalAndClosed",
]);
const currentFields = (...values) => Object.freeze(values);
const currentCompilerReason = (message) => {
  if (
    /strongly transferred|task[- ]isolated.*(?:sent|transfer)|sending .* risks causing data races/i.test(
      message,
    )
  )
    return "task_transfer";
  if (
    /non[- ]sendable|does not conform to (?:the )?['"]?Sendable|capture of .* non-sendable/i.test(
      message,
    )
  )
    return "sendability";
  if (/actor[- ]isolated|main actor[- ]isolated|global actor/i.test(message))
    return "actor_isolation";
  if (
    /type of expression is ambiguous|generic parameter .* could not be inferred|could not infer/i.test(
      message,
    )
  )
    return "type_inference";
  if (/cannot convert value of type|cannot assign value of type|cannot use .* as/i.test(message))
    return "type_mismatch";
  if (/has no member|cannot find .* in scope/i.test(message)) return "missing_member";
  if (/expected |consecutive statements|unterminated|extraneous .* at top level/i.test(message))
    return "syntax";
  return "other";
};
const safeCurrentInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 && number <= 65_535 ? number : null;
};

export function classifyCurrentTestFailure(raw) {
  if (typeof raw !== "string") throw new TypeError("IOS_CURRENT_FAILURE_CLASSIFIER_INPUT");
  const phaseField = "phase=test_current";
  const aggregateTest = currentAllowedTests[0];
  const test =
    currentAllowedTests.find((name) => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(
        `(?:Test Case ['"]?-\\[[^\\]\\r\\n]*AuthRuntimeKernelTests ${escapedName}\\]['"]? failed|AuthRuntimeKernelTests\\.${escapedName}\\s*:\\s*failed)`,
        "i",
      ).test(raw);
    }) ?? null;
  const invariantCandidates = [...raw.matchAll(invariantDiagnosticCandidatePattern)].filter(
    (candidate) =>
      !(
        candidate[2] === "checkpoint" &&
        candidate[3] === "" &&
        checkpointCorpusIds.has(candidate[1])
      ),
  );
  const invariant = invariantCandidates.at(-1);
  if (
    invariant &&
    invariant[3] === "" &&
    invariantDiagnosticsByCorpus.get(invariant[1])?.has(invariant[2])
  )
    return currentFields(
      phaseField,
      "category=auth_contract",
      "code=CURRENT_TEST_AUTH_INVARIANT",
      `corpus=${invariant[1]}`,
      "stage=invariant",
      `mismatch=${invariant[2]}`,
    );

  const diagnostic = raw.match(authDiagnosticPattern);
  if (diagnostic && authCorpusIds.has(diagnostic[1])) {
    const fields = [
      phaseField,
      "category=auth_contract",
      "code=CURRENT_TEST_AUTH_DIAGNOSTIC",
      `corpus=${diagnostic[1]}`,
    ];
    if (diagnostic[2]) fields.push("stage=snapshot", `mismatch=${diagnostic[2]}`);
    else if (diagnostic[3]) fields.push("stage=trace", "mismatch=sequence_unavailable");
    else if (diagnostic[4])
      fields.push(
        "stage=trace",
        "mismatch=count",
        `expected_count=${diagnostic[4]}`,
        `actual_count=${diagnostic[5]}`,
      );
    else
      fields.push(
        "stage=trace",
        "mismatch=sequence",
        `index=${diagnostic[6]}`,
        `expected=${diagnostic[7]}`,
        `actual=${diagnostic[8]}`,
      );
    return Object.freeze(fields);
  }

  const recordedCandidates = [...raw.matchAll(recordedAssertionCandidatePattern)];
  const validRecorded = (candidate) => {
    if (candidate[3] !== "" || candidate[4] !== "") return false;
    if (candidate[1] === "corpus_manifest") return candidate[2] === "manifest";
    if (candidate[1] === "warm_callback_success" && candidate[2] === "exchange") return true;
    return authCorpusIds.has(candidate[1]) && recordedAssertionRegularStages.has(candidate[2]);
  };
  const recordedKeys = new Set(
    recordedCandidates.filter(validRecorded).map((candidate) => `${candidate[1]}\0${candidate[2]}`),
  );
  const recorded =
    test === aggregateTest &&
    recordedCandidates.length > 0 &&
    recordedCandidates.every(validRecorded) &&
    recordedKeys.size === 1
      ? recordedCandidates.at(-1)
      : null;
  if (recorded)
    return currentFields(
      phaseField,
      "category=auth_contract",
      "code=CURRENT_TEST_AUTH_ASSERTION_RECORDED",
      `corpus=${recorded[1]}`,
      `stage=${recorded[2]}`,
      "mismatch=assertion_recorded",
    );

  const checkpointCandidates = [...raw.matchAll(checkpointCandidatePattern)];
  const checkpoint = checkpointCandidates.at(-1);
  if (
    checkpoint &&
    test === aggregateTest &&
    checkpoint[3] === "" &&
    checkpoint[4] === "" &&
    checkpointCorpusIds.has(checkpoint[1]) &&
    checkpointStages.has(checkpoint[2])
  )
    return currentFields(
      phaseField,
      "category=auth_contract",
      "code=CURRENT_TEST_AUTH_CHECKPOINT",
      `corpus=${checkpoint[1]}`,
      `stage=${checkpoint[2]}`,
      "mismatch=assertion",
    );

  const fallback = raw.match(diagnosticFallbackPattern);
  if (fallback)
    return currentFields(
      phaseField,
      "category=auth_contract",
      "code=CURRENT_TEST_AUTH_FALLBACK",
      ...(test ? [`test=${test}`] : []),
      `stage=${fallback[1]}`,
      `mismatch=${fallback[2]}`,
    );
  if (diagnosticUnavailablePattern.test(raw))
    return currentFields(
      phaseField,
      "category=auth_contract",
      "code=CURRENT_TEST_AUTH_DIAGNOSTIC_UNAVAILABLE",
      ...(test ? [`test=${test}`] : []),
      "stage=diagnostic",
      "mismatch=unavailable",
    );
  if (/linker command failed|undefined symbol/i.test(raw))
    return currentFields(phaseField, "category=link", "code=CURRENT_TEST_LINK");

  const compilerMatch =
    /(?:^|[\r\n])(?:[^\r\n]*[\\/])?([^\\/\r\n:]+\.swift):(\d{1,12}):(\d{1,12}):\s*error:\s*([^\r\n]*)/u.exec(
      raw,
    );
  const compilePattern =
    /(?:\b(?:SwiftCompile|SwiftEmitModule|EmitSwiftModule)\b[^\r\n]*(?:failed|failure|nonzero exit)|failed to build module|\.swift:\d+:\d+:\s*error:)/i;
  if (compilerMatch || compilePattern.test(raw)) {
    const source = new Set(["AuthRuntimeKernel.swift", "AuthRuntimeKernelTests.swift"]).has(
      compilerMatch?.[1],
    )
      ? compilerMatch[1]
      : "unknown";
    return currentFields(
      phaseField,
      "category=compile",
      "code=CURRENT_TEST_COMPILE",
      `source=${source}`,
      `line=${safeCurrentInteger(compilerMatch?.[2]) ?? 0}`,
      `column=${safeCurrentInteger(compilerMatch?.[3]) ?? 0}`,
      `reason=${currentCompilerReason(compilerMatch?.[4] ?? "")}`,
    );
  }
  if (test)
    return currentFields(
      phaseField,
      "category=auth_contract",
      "code=CURRENT_TEST_AUTH_TEST",
      `test=${test}`,
    );

  const lines = raw.split(/\r?\n/u);
  const summaryPattern =
    /^[\t ]*Executed ([0-9]{1,5}) tests?, with ([0-9]{1,5}) failures? \(([0-9]{1,5}) unexpected\)(?: in ([0-9]{1,6}(?:\.[0-9]{1,6})?) \(([0-9]{1,6}(?:\.[0-9]{1,6})?)\) seconds)?[\t ]*$/u;
  const markerPattern = /^[\t ]*\*\* TEST FAILED \*\*[\t ]*$/u;
  const markerCandidates = lines
    .map((line, index) => ({ index, line }))
    .filter(({ line }) => /TEST FAILED/u.test(line));
  const executedCandidates = lines
    .map((line, index) => ({ index, line, match: summaryPattern.exec(line) }))
    .filter(({ line }) => /^[\t ]*Executed\b/u.test(line));
  let terminal = null;
  if (
    markerCandidates.length === 1 &&
    markerPattern.test(markerCandidates[0].line) &&
    executedCandidates.length > 0 &&
    executedCandidates.every((candidate) => candidate.match)
  ) {
    const markerIndex = markerCandidates[0].index;
    let finalIndex = markerIndex - 1;
    while (finalIndex >= 0 && lines[finalIndex].trim() === "") finalIndex -= 1;
    const final = executedCandidates.find((candidate) => candidate.index === finalIndex);
    if (final && executedCandidates.every((candidate) => candidate.index < markerIndex)) {
      const parsed = executedCandidates.map((candidate) => {
        const match = candidate.match;
        const executed = safeCurrentInteger(match[1]);
        const failures = safeCurrentInteger(match[2]);
        const unexpected = safeCurrentInteger(match[3]);
        const durations = [match[4], match[5]].filter((value) => value !== undefined).map(Number);
        const validEarlier =
          executed !== null &&
          failures !== null &&
          unexpected !== null &&
          failures <= executed &&
          unexpected <= failures &&
          durations.every((value) => Number.isFinite(value) && value <= 86_400);
        const validFinal = validEarlier && failures > 0;
        return { candidate, executed, failures, unexpected, validEarlier, validFinal };
      });
      const finalParsed = parsed.find(({ candidate }) => candidate === final);
      const earlier = parsed.filter(({ candidate }) => candidate !== final);
      if (
        finalParsed?.validFinal &&
        earlier.every(
          (value) =>
            value.validEarlier &&
            value.executed <= finalParsed.executed &&
            value.failures <= finalParsed.failures &&
            value.unexpected <= finalParsed.unexpected &&
            (value.executed !== finalParsed.executed ||
              value.failures !== finalParsed.failures ||
              value.unexpected !== finalParsed.unexpected),
        )
      )
        terminal = finalParsed;
    }
  }
  const destinationCandidates = lines.filter((line) =>
    /xcodebuild:\s*error:|destination matching/iu.test(line),
  );
  const destination =
    destinationCandidates.length === 1 &&
    /^[\t ]*xcodebuild: error: Unable to find a destination matching the provided destination specifier:[\t ]*$/u.test(
      destinationCandidates[0],
    );
  if (terminal && !destination)
    return currentFields(
      phaseField,
      "category=xctest",
      "code=CURRENT_TEST_XCTEST_FAILURE",
      `executed=${terminal.executed}`,
      `failures=${terminal.failures}`,
      `unexpected=${terminal.unexpected}`,
    );
  if (destination && !terminal)
    return currentFields(
      phaseField,
      "category=simulator",
      "code=CURRENT_TEST_DESTINATION_UNAVAILABLE",
    );
  return currentFields(phaseField, "category=unknown", "code=CURRENT_TEST_UNKNOWN");
}

const enoentOnly = (error) => error && typeof error === "object" && error.code === "ENOENT";
const lstatOrNull = (filesystem, path) => {
  try {
    return filesystem.lstatSync(path, { bigint: true });
  } catch (error) {
    if (enoentOnly(error)) return null;
    throw error;
  }
};
const proveAbsent = (filesystem, path) => lstatOrNull(filesystem, path) === null;

export function sanitizeCurrentTestFailure(
  { logPath, resultBundlePath, runnerTemp },
  dependencies = {},
) {
  const filesystem = dependencies.fs ?? fs;
  const platform = dependencies.platform ?? process.platform;
  const currentUid =
    dependencies.uid ?? (typeof process.getuid === "function" ? process.getuid() : -1);
  const nonce = dependencies.randomBytes ?? randomBytes;
  const classify = dependencies.classify ?? classifyCurrentTestFailure;
  const joinPath = dependencies.join ?? join;
  const absolutePath = dependencies.isAbsolute ?? isAbsolute;
  const constants = filesystem.constants ?? fs.constants;
  const attemptRoot =
    typeof runnerTemp === "string" ? joinPath(runnerTemp, "fluyo-ios-current") : "";
  const expectedLog = attemptRoot ? joinPath(attemptRoot, "logs", "test-current.log") : "";
  const expectedBundle = attemptRoot ? joinPath(attemptRoot, "results", "current.xcresult") : "";
  if (
    platform !== "darwin" ||
    typeof runnerTemp !== "string" ||
    !absolutePath(runnerTemp) ||
    /[\x00-\x1f\x7f]/u.test(runnerTemp) ||
    logPath !== expectedLog ||
    resultBundlePath !== expectedBundle
  )
    return Object.freeze({ ok: false, fields: null });

  const opened = [];
  const provisionalFds = new Set();
  let runner = null;
  let attempt = null;
  let logs = null;
  let results = null;
  let quarantine = null;
  let quarantineCreation = null;
  let logBinding = null;
  let bundleBinding = null;
  let fields = null;
  let failed = false;
  const asUid = BigInt(currentUid);
  const directoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
  const closeProvisional = (fd) => {
    if (!provisionalFds.delete(fd)) throw new Error("IOS_CURRENT_FAILURE_FD_OWNERSHIP");
    filesystem.closeSync(fd);
  };
  const promoteBinding = (binding) => {
    opened.push(binding);
    if (!provisionalFds.delete(binding.fd)) throw new Error("IOS_CURRENT_FAILURE_FD_OWNERSHIP");
    return binding;
  };
  const openDirectory = (path, parent = null) => {
    const before = filesystem.lstatSync(path, { bigint: true });
    if (
      !before.isDirectory() ||
      before.isSymbolicLink() ||
      before.uid !== asUid ||
      (before.mode & 0o022n) !== 0n ||
      filesystem.realpathSync.native(path) !== path ||
      (parent && before.dev !== parent.dev)
    )
      throw new Error("IOS_CURRENT_FAILURE_IDENTITY");
    const fd = filesystem.openSync(path, directoryFlags);
    provisionalFds.add(fd);
    try {
      const held = filesystem.fstatSync(fd, { bigint: true });
      if (!held.isDirectory() || held.dev !== before.dev || held.ino !== before.ino)
        throw new Error("IOS_CURRENT_FAILURE_IDENTITY");
      return promoteBinding(
        Object.freeze({ path, fd, dev: held.dev, ino: held.ino, kind: "directory" }),
      );
    } catch (error) {
      closeProvisional(fd);
      throw error;
    }
  };
  const verifyDirectory = (binding, parent = null) => {
    const current = filesystem.lstatSync(binding.path, { bigint: true });
    const held = filesystem.fstatSync(binding.fd, { bigint: true });
    return (
      current.isDirectory() &&
      !current.isSymbolicLink() &&
      current.dev === binding.dev &&
      current.ino === binding.ino &&
      current.uid === asUid &&
      (current.mode & 0o022n) === 0n &&
      held.isDirectory() &&
      held.dev === binding.dev &&
      held.ino === binding.ino &&
      held.uid === asUid &&
      (held.mode & 0o022n) === 0n &&
      filesystem.realpathSync.native(binding.path) === binding.path &&
      (!parent || current.dev === parent.dev)
    );
  };
  const openLog = () => {
    const before = filesystem.lstatSync(logPath, { bigint: true });
    if (
      !before.isFile() ||
      before.isSymbolicLink() ||
      before.uid !== asUid ||
      (before.mode & 0o022n) !== 0n ||
      before.dev !== runner.dev ||
      filesystem.realpathSync.native(logPath) !== logPath ||
      before.size > 4_194_304n
    )
      throw new Error("IOS_CURRENT_FAILURE_IDENTITY");
    const fd = filesystem.openSync(logPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    provisionalFds.add(fd);
    try {
      const held = filesystem.fstatSync(fd, { bigint: true });
      if (
        !held.isFile() ||
        held.dev !== before.dev ||
        held.ino !== before.ino ||
        held.size !== before.size
      )
        throw new Error("IOS_CURRENT_FAILURE_IDENTITY");
      logBinding = promoteBinding(
        Object.freeze({
          path: logPath,
          fd,
          dev: held.dev,
          ino: held.ino,
          size: held.size,
          kind: "log",
        }),
      );
    } catch (error) {
      closeProvisional(fd);
      throw error;
    }
  };
  const openBundle = () => {
    const before = lstatOrNull(filesystem, resultBundlePath);
    if (!before) return;
    if (
      !before.isDirectory() ||
      before.isSymbolicLink() ||
      before.uid !== asUid ||
      (before.mode & 0o022n) !== 0n ||
      before.dev !== runner.dev ||
      filesystem.realpathSync.native(resultBundlePath) !== resultBundlePath
    )
      throw new Error("IOS_CURRENT_FAILURE_IDENTITY");
    const fd = filesystem.openSync(resultBundlePath, directoryFlags);
    provisionalFds.add(fd);
    try {
      const held = filesystem.fstatSync(fd, { bigint: true });
      if (!held.isDirectory() || held.dev !== before.dev || held.ino !== before.ino)
        throw new Error("IOS_CURRENT_FAILURE_IDENTITY");
      bundleBinding = promoteBinding(
        Object.freeze({
          path: resultBundlePath,
          fd,
          dev: held.dev,
          ino: held.ino,
          kind: "bundle",
        }),
      );
    } catch (error) {
      closeProvisional(fd);
      throw error;
    }
  };
  const cleanupTarget = (binding, path, ancestor, leafName) => {
    try {
      if (
        !quarantine ||
        !verifyDirectory(runner) ||
        !verifyDirectory(attempt, runner) ||
        !verifyDirectory(ancestor, attempt) ||
        !verifyDirectory(quarantine, attempt)
      )
        return false;
      const current = lstatOrNull(filesystem, path);
      if (!current) return binding === null;
      if (current.isSymbolicLink()) {
        filesystem.unlinkSync(path);
        if (
          !proveAbsent(filesystem, path) ||
          !proveAbsent(filesystem, joinPath(quarantine.path, leafName))
        )
          return false;
        return false;
      }
      if (
        !binding ||
        current.dev !== binding.dev ||
        current.ino !== binding.ino ||
        current.uid !== asUid ||
        (current.mode & 0o022n) !== 0n ||
        filesystem.realpathSync.native(path) !== path ||
        (binding.kind === "log" && (!current.isFile() || current.size !== binding.size)) ||
        (binding.kind === "bundle" && !current.isDirectory())
      )
        return false;
      const leaf = joinPath(quarantine.path, leafName);
      if (!proveAbsent(filesystem, leaf)) return false;
      filesystem.renameSync(path, leaf);
      const moved = filesystem.lstatSync(leaf, { bigint: true });
      const held = filesystem.fstatSync(binding.fd, { bigint: true });
      if (
        moved.dev !== binding.dev ||
        moved.ino !== binding.ino ||
        moved.uid !== asUid ||
        (moved.mode & 0o022n) !== 0n ||
        held.dev !== binding.dev ||
        held.ino !== binding.ino ||
        held.uid !== asUid ||
        (held.mode & 0o022n) !== 0n ||
        (binding.kind === "log" && !held.isFile()) ||
        (binding.kind === "bundle" && !held.isDirectory()) ||
        (binding.kind === "log" && moved.size !== binding.size)
      )
        return false;
      if (binding.kind === "log") filesystem.unlinkSync(leaf);
      else filesystem.rmSync(leaf, { recursive: true, force: false });
      return proveAbsent(filesystem, path) && proveAbsent(filesystem, leaf);
    } catch {
      return false;
    }
  };

  try {
    runner = openDirectory(runnerTemp);
    attempt = openDirectory(attemptRoot, runner);
    logs = openDirectory(joinPath(attemptRoot, "logs"), attempt);
    results = openDirectory(joinPath(attemptRoot, "results"), attempt);
    try {
      openLog();
    } catch {
      failed = true;
    }
    try {
      openBundle();
    } catch {
      failed = true;
    }
    const random = nonce(16);
    if (!Buffer.isBuffer(random) || random.length !== 16) throw new Error("IOS_CURRENT_NONCE");
    const hex = random.toString("hex");
    random.fill(0);
    if (!/^[0-9a-f]{32}$/u.test(hex)) throw new Error("IOS_CURRENT_NONCE");
    const quarantinePath = joinPath(attemptRoot, `.failure-sanitizer-${hex}`);
    if (!proveAbsent(filesystem, quarantinePath)) throw new Error("IOS_CURRENT_QUARANTINE");
    filesystem.mkdirSync(quarantinePath, { recursive: false, mode: 0o700 });
    quarantineCreation = { path: quarantinePath, dev: null, ino: null };
    const createdQuarantine = filesystem.lstatSync(quarantinePath, { bigint: true });
    if (
      !createdQuarantine.isDirectory() ||
      createdQuarantine.isSymbolicLink() ||
      createdQuarantine.uid !== asUid ||
      (createdQuarantine.mode & 0o022n) !== 0n ||
      createdQuarantine.dev !== attempt.dev ||
      filesystem.realpathSync.native(quarantinePath) !== quarantinePath
    )
      throw new Error("IOS_CURRENT_QUARANTINE");
    quarantineCreation = Object.freeze({
      path: quarantinePath,
      dev: createdQuarantine.dev,
      ino: createdQuarantine.ino,
    });
    quarantine = openDirectory(quarantinePath, attempt);
    if (!logBinding) throw new Error("IOS_CURRENT_LOG");
    const size = Number(logBinding.size);
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = filesystem.readSync(logBinding.fd, bytes, offset, size - offset, offset);
      if (count <= 0) throw new Error("IOS_CURRENT_LOG");
      offset += count;
    }
    if (filesystem.readSync(logBinding.fd, Buffer.alloc(1), 0, 1, size) !== 0)
      throw new Error("IOS_CURRENT_LOG");
    fields = classify(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    failed = true;
  } finally {
    const logClean = cleanupTarget(logBinding, logPath, logs, "test-current.log");
    const bundleClean = cleanupTarget(bundleBinding, resultBundlePath, results, "current.xcresult");
    if (!logClean || !bundleClean) failed = true;
    for (const binding of opened.slice().reverse()) {
      try {
        filesystem.closeSync(binding.fd);
      } catch {
        failed = true;
      }
    }
    for (const fd of [...provisionalFds].reverse()) {
      try {
        closeProvisional(fd);
      } catch {
        failed = true;
      }
    }
    if (quarantineCreation) {
      try {
        const current = lstatOrNull(filesystem, quarantineCreation.path);
        if (current) {
          if (
            quarantineCreation.dev === null ||
            quarantineCreation.ino === null ||
            !current.isDirectory() ||
            current.isSymbolicLink() ||
            current.dev !== quarantineCreation.dev ||
            current.ino !== quarantineCreation.ino ||
            current.uid !== asUid ||
            (current.mode & 0o022n) !== 0n ||
            filesystem.realpathSync.native(quarantineCreation.path) !== quarantineCreation.path
          )
            throw new Error("IOS_CURRENT_QUARANTINE");
          filesystem.rmdirSync(quarantineCreation.path);
        }
        if (!proveAbsent(filesystem, quarantineCreation.path)) failed = true;
      } catch {
        failed = true;
      }
    }
  }
  return Object.freeze({ ok: !failed && fields !== null, fields: !failed ? fields : null });
}

const main = () => {
  const args = process.argv.slice(2);
  const githubAnnotationIndex = args.indexOf("--github-annotation");
  const githubAnnotation = githubAnnotationIndex !== -1;
  if (githubAnnotation) {
    args.splice(githubAnnotationIndex, 1);
    if (args.includes("--github-annotation") || process.env.GITHUB_ACTIONS !== "true") {
      throw new Error("GitHub annotation mode requires one flag and GitHub Actions.");
    }
  }
  const [logPath, phaseFlag, phase, ...remainingArgs] = args;
  let extraArgs = remainingArgs;
  let consumeResultBundle = null;
  let currentSanitization = false;
  if (
    phase === "test_current" &&
    remainingArgs.length === 4 &&
    remainingArgs[0] === "--termination" &&
    remainingArgs[1] === "EXIT_NONZERO" &&
    remainingArgs[2] === "--consume-result-bundle"
  ) {
    consumeResultBundle = remainingArgs[3];
    currentSanitization = true;
    extraArgs = [];
  }
  const phases = new Set([
    "build_debug",
    "build_staging",
    "build_release",
    "compile_tests_minimum",
    "compile_tests_current",
    "test_minimum",
    "test_current",
  ]);
  if (!logPath || phaseFlag !== "--phase" || !phases.has(phase) || extraArgs.length !== 0) {
    throw new Error("Use a bounded iOS phase.");
  }

  const sanitizationFailure = () => {
    process.stderr.write("IOS_CURRENT_FAILURE_SANITIZATION_FAILED\n");
    process.exitCode = 1;
  };
  if (currentSanitization) {
    const result = sanitizeCurrentTestFailure({
      logPath,
      resultBundlePath: consumeResultBundle,
      runnerTemp: process.env.RUNNER_TEMP,
    });
    if (!result.ok) {
      sanitizationFailure();
      return;
    }
    const detail = result.fields.join("; ");
    if (githubAnnotation) process.stdout.write(githubWorkflowErrorAnnotation(detail));
    else process.stderr.write(`IOS_CURRENT_TEST_FAILURE; ${detail}\n`);
    return;
  }
  const raw = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
  const compilerErrorPattern =
    /(?:^|[\r\n])(?:[^\r\n]*[\\/])?([^\\/\r\n:]+\.swift):(\d{1,12}):(\d{1,12}):\s*error:\s*([^\r\n]*)/g;
  const compilerErrorMatch = compilerErrorPattern.exec(raw);
  const compilerSources = new Set(["AuthRuntimeKernel.swift", "AuthRuntimeKernelTests.swift"]);
  const boundedCoordinate = (value) => {
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 1 && number <= 65_535 ? String(number) : "0";
  };
  const compilerReason = (message) => {
    if (
      /strongly transferred|task[- ]isolated.*(?:sent|transfer)|sending .* risks causing data races/i.test(
        message,
      )
    ) {
      return "task_transfer";
    }
    if (
      /non[- ]sendable|does not conform to (?:the )?['"]?Sendable|capture of .* non-sendable/i.test(
        message,
      )
    ) {
      return "sendability";
    }
    if (/actor[- ]isolated|main actor[- ]isolated|global actor/i.test(message)) {
      return "actor_isolation";
    }
    if (
      /type of expression is ambiguous|generic parameter .* could not be inferred|could not infer/i.test(
        message,
      )
    ) {
      return "type_inference";
    }
    if (
      /cannot convert value of type|cannot assign value of type|cannot use .* as/i.test(message)
    ) {
      return "type_mismatch";
    }
    if (/has no member|cannot find .* in scope/i.test(message)) return "missing_member";
    if (/expected |consecutive statements|unterminated|extraneous .* at top level/i.test(message)) {
      return "syntax";
    }
    return "other";
  };
  const compilerDiagnostic = compilerErrorMatch
    ? Object.freeze({
        source: compilerSources.has(compilerErrorMatch[1]) ? compilerErrorMatch[1] : "unknown",
        line: boundedCoordinate(compilerErrorMatch[2]),
        column: boundedCoordinate(compilerErrorMatch[3]),
        reason: compilerReason(compilerErrorMatch[4]),
      })
    : null;
  const allowedTests = [
    "testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups",
    "testSerializedCoordinatorFencesEveryCleanupAwaitAndPublishesOnlyAfterConfirmation",
    "testCleanupFailureIsFencedAndDelayedEffectsAreGenerationBoundOneShot",
    "testExactStepAndTotalTimeoutBoundariesAndGenerationOverflowFailClosed",
    "testDiagnosticGrammarAndFallbackSelectionAreTotalAndClosed",
  ];
  const aggregateCorpusTest =
    "testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups";
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
  const invariantDiagnosticCandidates = [
    ...raw.matchAll(invariantDiagnosticCandidatePattern),
  ].filter(
    (candidate) =>
      !(
        candidate[2] === "checkpoint" &&
        candidate[3] === "" &&
        checkpointCorpusIds.has(candidate[1])
      ),
  );
  const invariantDiagnosticCandidate = invariantDiagnosticCandidates.at(-1);
  const invariantDiagnostic =
    invariantDiagnosticCandidate &&
    invariantDiagnosticCandidate[3] === "" &&
    invariantDiagnosticsByCorpus
      .get(invariantDiagnosticCandidate[1])
      ?.has(invariantDiagnosticCandidate[2])
      ? invariantDiagnosticCandidate
      : null;
  const recordedAssertionCandidates = [...raw.matchAll(recordedAssertionCandidatePattern)];
  const validRecordedAssertion = (candidate) => {
    if (candidate[3] !== "" || candidate[4] !== "") return false;
    const corpusId = candidate[1];
    const stage = candidate[2];
    if (corpusId === "corpus_manifest") return stage === "manifest";
    if (corpusId === "warm_callback_success" && stage === "exchange") return true;
    return authCorpusIds.has(corpusId) && recordedAssertionRegularStages.has(stage);
  };
  const recordedAssertionKeys = new Set(
    recordedAssertionCandidates
      .filter(validRecordedAssertion)
      .map((candidate) => `${candidate[1]}\0${candidate[2]}`),
  );
  const recordedAssertion =
    test === aggregateCorpusTest &&
    recordedAssertionCandidates.length > 0 &&
    recordedAssertionCandidates.every(validRecordedAssertion) &&
    recordedAssertionKeys.size === 1
      ? recordedAssertionCandidates.at(-1)
      : null;
  const checkpointCandidates = [...raw.matchAll(checkpointCandidatePattern)];
  const checkpointCandidate = checkpointCandidates.at(-1);
  const checkpoint =
    checkpointCandidate &&
    test === aggregateCorpusTest &&
    checkpointCandidate[3] === "" &&
    checkpointCandidate[4] === "" &&
    checkpointCorpusIds.has(checkpointCandidate[1]) &&
    checkpointStages.has(checkpointCandidate[2])
      ? checkpointCandidate
      : null;
  const diagnosticFallback = raw.match(diagnosticFallbackPattern);
  const diagnosticUnavailable = diagnosticUnavailablePattern.test(raw);
  const compileFailurePattern =
    /(?:\b(?:SwiftCompile|SwiftEmitModule|EmitSwiftModule)\b[^\r\n]*(?:failed|failure|nonzero exit)|failed to build module|\.swift:\d+:\d+:\s*error:)/i;
  const category =
    invariantDiagnostic ||
    authDiagnostic ||
    recordedAssertion ||
    checkpoint ||
    diagnosticFallback ||
    diagnosticUnavailable
      ? "auth_contract"
      : /linker command failed|undefined symbol/i.test(raw)
        ? "link"
        : compilerDiagnostic || compileFailurePattern.test(raw)
          ? "compile"
          : test !== "unknown"
            ? "auth_contract"
            : /simulator|simctl|destination.*unavailable/i.test(raw)
              ? "simulator"
              : /timed out|timeout/i.test(raw)
                ? "timeout"
                : /configuration|xcconfig|Info\.plist/i.test(raw)
                  ? "configuration"
                  : /XCTAssert|assertion failed|test case .* failed/i.test(raw)
                    ? "assertion"
                    : "unknown";
  const boundedDiagnostic = invariantDiagnostic
    ? `; corpus=${invariantDiagnostic[1]}; stage=invariant; mismatch=${invariantDiagnostic[2]}`
    : authDiagnostic
      ? authDiagnostic[2]
        ? `; corpus=${authDiagnostic[1]}; stage=snapshot; mismatch=${authDiagnostic[2]}`
        : authDiagnostic[3]
          ? `; corpus=${authDiagnostic[1]}; stage=trace; mismatch=sequence_unavailable`
          : authDiagnostic[4]
            ? `; corpus=${authDiagnostic[1]}; stage=trace; mismatch=count; expected_count=${authDiagnostic[4]}; actual_count=${authDiagnostic[5]}`
            : `; corpus=${authDiagnostic[1]}; stage=trace; mismatch=sequence; index=${authDiagnostic[6]}; expected=${authDiagnostic[7]}; actual=${authDiagnostic[8]}`
      : diagnosticFallback
        ? `; stage=${diagnosticFallback[1]}; mismatch=${diagnosticFallback[2]}`
        : diagnosticUnavailable
          ? "; stage=diagnostic; mismatch=unavailable"
          : recordedAssertion
            ? `; corpus=${recordedAssertion[1]}; stage=${recordedAssertion[2]}; mismatch=assertion_recorded`
            : checkpoint
              ? `; corpus=${checkpoint[1]}; stage=${checkpoint[2]}; mismatch=assertion`
              : "";
  if (githubAnnotation) {
    const fields = [`phase=${phase}`, `category=${category}`];
    if (invariantDiagnostic) {
      fields.push(
        `corpus=${invariantDiagnostic[1]}`,
        "stage=invariant",
        `mismatch=${invariantDiagnostic[2]}`,
      );
    } else if (authDiagnostic) {
      fields.push(`corpus=${authDiagnostic[1]}`);
      if (authDiagnostic[2]) {
        fields.push("stage=snapshot", `mismatch=${authDiagnostic[2]}`);
      } else if (authDiagnostic[3]) {
        fields.push("stage=trace", "mismatch=sequence_unavailable");
      } else if (authDiagnostic[4]) {
        fields.push(
          "stage=trace",
          "mismatch=count",
          `expected_count=${authDiagnostic[4]}`,
          `actual_count=${authDiagnostic[5]}`,
        );
      } else {
        fields.push(
          "stage=trace",
          "mismatch=sequence",
          `index=${authDiagnostic[6]}`,
          `expected=${authDiagnostic[7]}`,
          `actual=${authDiagnostic[8]}`,
        );
      }
    } else if (diagnosticFallback) {
      if (test !== "unknown") fields.push(`test=${test}`);
      fields.push(`stage=${diagnosticFallback[1]}`, `mismatch=${diagnosticFallback[2]}`);
    } else if (diagnosticUnavailable) {
      if (test !== "unknown") fields.push(`test=${test}`);
      fields.push("stage=diagnostic", "mismatch=unavailable");
    } else if (recordedAssertion) {
      fields.push(
        `corpus=${recordedAssertion[1]}`,
        `stage=${recordedAssertion[2]}`,
        "mismatch=assertion_recorded",
      );
    } else if (checkpoint) {
      fields.push(`corpus=${checkpoint[1]}`, `stage=${checkpoint[2]}`, "mismatch=assertion");
    } else if (test !== "unknown" && category === "auth_contract") {
      fields.push(`test=${test}`);
    }
    if (category === "compile" && compilerDiagnostic) {
      fields.push(
        `source=${compilerDiagnostic.source}`,
        `line=${compilerDiagnostic.line}`,
        `column=${compilerDiagnostic.column}`,
        `reason=${compilerDiagnostic.reason}`,
      );
    }
    process.stdout.write(githubWorkflowErrorAnnotation(fields.join("; ")));
  } else {
    process.stderr.write(
      `iOS phase failed; phase=${phase}; category=${category}; test=${test}${boundedDiagnostic}; raw output discarded\n`,
    );
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
