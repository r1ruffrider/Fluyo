import fs from "node:fs";
import path from "node:path";

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
const traceValuePattern =
  "(?:init_read|callback_reserved|callback_consumed|callback_rejected|callback_duplicate|callback_overlap|provider_exchange|provider_refresh|owner_verify|vault_replace|owner_bind|timer_500|timer_15000|timer_30000|generation_fence|callback_purge|headers_clear|vault_clear|owner_purge|callback_confirm|vault_confirm|owner_confirm|stale_rejected|snapshot_published|effect_enqueued|terminal_latched)";
const traceCountPattern = "(?:[0-9]|[1-5][0-9]|6[0-3]|64_plus)";
const traceIndexPattern = "(?:[0-9]|[1-5][0-9]|6[0-3])";
const authDiagnosticPattern = new RegExp(
  `\\[auth_corpus_([a-z0-9_]+)_stage_(?:snapshot_(count|shape|state|candidate|owner|destination|outcome|generation)|trace_(?:(sequence_unavailable)|count_expected_(${traceCountPattern})_actual_(${traceCountPattern})|sequence_index_(${traceIndexPattern})_expected_(${traceValuePattern})_actual_(${traceValuePattern})))\\]`,
);
const exactAuthDiagnosticPattern = new RegExp(`^${authDiagnosticPattern.source}$`);
const diagnosticFallbackPattern =
  /\[auth_corpus_stage_(snapshot|trace)_(diagnostic_inconsistent|diagnostic_rejected)\](?![A-Za-z0-9_])/;
const exactDiagnosticFallbackPattern =
  /^\[auth_corpus_stage_(snapshot|trace)_(diagnostic_inconsistent|diagnostic_rejected)\]$/;
const diagnosticUnavailablePattern = /\[auth_corpus_diagnostic_unavailable\]/;
const exactDiagnosticUnavailablePattern = /^\[auth_corpus_diagnostic_unavailable\]$/;
const unavailableDiagnostic = Object.freeze({ unavailable: true });
const parseBoundedMarker = (marker) => {
  const match = marker.match(exactAuthDiagnosticPattern);
  if (match && authCorpusIds.has(match[1])) return match;
  const fallback = marker.match(exactDiagnosticFallbackPattern);
  if (fallback) return Object.freeze({ fallback: true, stage: fallback[1], mismatch: fallback[2] });
  return exactDiagnosticUnavailablePattern.test(marker) ? unavailableDiagnostic : null;
};
const readBoundedDiagnostic = (file) => {
  if (!file || !fs.existsSync(file)) return null;
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 512) return null;
  const raw = fs.readFileSync(file, "utf8");
  if (raw.includes("\r")) return null;
  const envelope = raw.match(/^corpus=([a-z0-9_]+)\nmarker=([^\n]+)\n$/);
  if (!envelope || !authCorpusIds.has(envelope[1])) return null;
  const marker = parseBoundedMarker(envelope[2]);
  if (!marker || (Array.isArray(marker) && marker[1] !== envelope[1])) return null;
  return Object.freeze({ corpusId: envelope[1], marker });
};
const normalizeBoundedDiagnostic = (diagnostic, corpusId) =>
  diagnostic === unavailableDiagnostic
    ? { corpusId, stage: "diagnostic", mismatch: "unavailable" }
    : diagnostic.fallback === true
      ? { corpusId, stage: diagnostic.stage, mismatch: diagnostic.mismatch }
      : {
          corpusId: diagnostic[1],
          ...(diagnostic[2]
            ? { stage: "snapshot", mismatch: diagnostic[2] }
            : diagnostic[3]
              ? { stage: "trace", mismatch: "sequence_unavailable" }
              : diagnostic[4]
                ? {
                    stage: "trace",
                    mismatch: "count",
                    expectedCount: diagnostic[4],
                    actualCount: diagnostic[5],
                  }
                : {
                    stage: "trace",
                    mismatch: "sequence",
                    index: Number(diagnostic[6]),
                    expected: diagnostic[7],
                    actual: diagnostic[8],
                  }),
        };

const args = process.argv.slice(2);
const phaseIndex = args.indexOf("--phase");
const allowedPhases = new Set([
  "unit_test",
  "assemble_internal",
  "assemble_production_inert",
  "compile_instrumentation",
  "lint",
  "instrumentation_internal",
  "instrumentation_production_inert",
  "baseline_profile",
]);
let phase = null;
if (phaseIndex !== -1) {
  phase = args[phaseIndex + 1] ?? null;
  args.splice(phaseIndex, 2);
  if (!allowedPhases.has(phase)) throw new Error("Unsupported bounded Android failure phase.");
}
let sidecarDiagnostic = null;
const diagnosticIndex = args.indexOf("--diagnostic-file");
if (diagnosticIndex !== -1) {
  const diagnosticFile = args[diagnosticIndex + 1] ?? null;
  args.splice(diagnosticIndex, 2);
  sidecarDiagnostic = readBoundedDiagnostic(diagnosticFile);
}
const githubAnnotationIndex = args.indexOf("--github-annotation");
const githubAnnotation = githubAnnotationIndex !== -1;
if (githubAnnotation) {
  args.splice(githubAnnotationIndex, 1);
  if (args.includes("--github-annotation") || process.env.GITHUB_ACTIONS !== "true" || !phase) {
    throw new Error(
      "GitHub annotation mode requires one flag, GitHub Actions, and a bounded phase.",
    );
  }
}
const roots = args;
if (roots.length === 0) {
  throw new Error("At least one Android test-results directory is required.");
}

const xmlFiles = [];
const visit = (entry) => {
  if (!fs.existsSync(entry)) return;
  const stat = fs.statSync(entry);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(entry)) visit(path.join(entry, child));
  } else if (stat.isFile() && path.basename(entry).startsWith("TEST-") && entry.endsWith(".xml")) {
    xmlFiles.push(entry);
  }
};
for (const root of roots) visit(root);

const safeIdentifier = (value) => {
  const normalized = value.replace(/[^A-Za-z0-9_.$-]/g, "_").slice(0, 160);
  return normalized || "unknown";
};
const attribute = (tag, name) => {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return safeIdentifier(match?.[1] ?? "unknown");
};
const rawAttribute = (tag, name) => {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return match?.[1] ?? "";
};
const frameworkFailureCategory = (tag) => {
  const match = tag.match(/(?:^|\s)type="([^"]*)"/);
  const value = match?.[1] ?? "";
  const allowed = new Map([
    ["java.lang.AssertionError", "assertion"],
    ["junit.framework.AssertionFailedError", "assertion"],
    ["org.junit.ComparisonFailure", "comparison"],
    ["java.lang.IllegalStateException", "illegal_state"],
    ["java.lang.SecurityException", "permission_denied"],
    ["java.lang.ClassNotFoundException", "class_loading"],
    ["java.lang.NoClassDefFoundError", "class_loading"],
    ["androidx.compose.ui.test.ComposeTimeoutException", "timeout"],
    ["java.util.concurrent.TimeoutException", "timeout"],
  ]);
  return allowed.get(value) ?? null;
};

const failureCategory = (body) => {
  const normalized = body.toLowerCase();
  if (/not found|could not find|does not exist/.test(normalized)) return "node_missing";
  if (/not displayed|isdisplayed|visible area/.test(normalized)) return "visibility";
  if (/scroll/.test(normalized)) return "scroll_action";
  if (/height|width|size/.test(normalized)) return "bounds";
  if (/focus/.test(normalized)) return "focus";
  if (/expected.*(?:0|zero)|count/.test(normalized)) return "count";
  if (/exception|error/.test(normalized)) return "runtime_error";
  return "assertion";
};

const boundedStageCategory = (tag, body) => {
  const stages = [
    ["node_missing", "node missing", /AssertionError: node missing(?:\r?\n|$)/],
    ["node_count", "node count", /AssertionError: node count(?:\r?\n|$)/],
    ["scroll_action", "scroll action", /AssertionError: scroll action(?:\r?\n|$)/],
    ["node_geometry", "node geometry", /AssertionError: node geometry(?:\r?\n|$)/],
    ["font_scale", "font scale", /AssertionError: font scale(?:\r?\n|$)/],
    ["runtime_launch", "runtime launch", /AssertionError: runtime launch(?:\r?\n|$)/],
    ["runtime_cleanup", "runtime cleanup", /AssertionError: runtime cleanup(?:\r?\n|$)/],
    ["content_setup", "content setup", /AssertionError: content setup(?:\r?\n|$)/],
    ["state_transition", "state transition", /AssertionError: state transition(?:\r?\n|$)/],
    ["failure_transition", "failure transition", /AssertionError: failure transition(?:\r?\n|$)/],
    ["content_teardown", "content teardown", /AssertionError: content teardown(?:\r?\n|$)/],
  ];
  for (const [category, , pattern] of stages) {
    if (pattern.test(body)) return category;
  }
  const message = rawAttribute(tag, "message");
  for (const [category, sentinel] of stages) {
    if (message === sentinel || message === `java.lang.AssertionError: ${sentinel}`) {
      return category;
    }
  }
  return null;
};

const runtimeCategories = (body) => {
  const categories = [];
  const mappings = [
    ["activity_lifecycle", /\b(?:ActivityScenario|NoActivityResumedException)\b/],
    ["assertion", /\bAssertionError\b/],
    ["class_loading", /\b(?:ClassNotFoundException|NoClassDefFoundError)\b/],
    ["illegal_state", /\bIllegalStateException\b/],
    [
      "instrumentation_abort",
      /(?:instrumentation run failed|test (?:run )?failed to (?:run to completion|complete)|failed to run all tests|no test results|INSTRUMENTATION_(?:ABORTED|FAILED))/i,
    ],
    [
      "activity_launch",
      /(?:unable to resolve activity|activity (?:was )?not started|failed to launch activity)/i,
    ],
    [
      "device_infrastructure",
      /(?:device setup failed|device became unavailable|emulator.*(?:offline|disconnected|unavailable))/i,
    ],
    ["permission_denied", /(?:permission denial|permission denied|securityexception)/i],
    [
      "process_crash",
      /(?:\bProcessCrash\b|\bProcessCrashedException\b|\bprocess (?:crash|crashed)\b)/i,
    ],
    ["timeout", /\b(?:ComposeTimeoutException|TimeoutException)\b/],
  ];
  for (const [category, pattern] of mappings) {
    if (pattern.test(body)) categories.push(category);
  }
  return categories;
};

const failures = [];
for (const file of xmlFiles.sort()) {
  const xml = fs.readFileSync(file, "utf8");
  for (const match of xml.matchAll(/<testcase\b([^>]*)>([\s\S]*?)<\/testcase>/g)) {
    const [, attributes, body] = match;
    const failureTag = body.match(/<(failure|error)\b([^>]*)>/);
    const kind = failureTag?.[1] ?? null;
    if (!kind) continue;
    const className = attribute(attributes, "classname");
    const authKernel = className === "com.fluyo.app.AuthRuntimeKernelTest";
    const rawTestName = rawAttribute(attributes, "name");
    const authNameMatch = rawTestName.match(
      /^canonicalScenarioOrInvariant\[(?:[0-9]|[1-3][0-9]|40):([a-z0-9_]+)@[0-9a-f]{64}\]$/,
    );
    const authCorpusId =
      authNameMatch && authCorpusIds.has(authNameMatch[1]) ? authNameMatch[1] : null;
    const sourceName = className.split(".").at(-1)?.split("$")[0] ?? "unknown";
    const escapedSourceName = sourceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sourceLineMatch = body.match(new RegExp(`${escapedSourceName}\\.kt:(\\d{1,5})`));
    const sourceLine = sourceLineMatch ? Number(sourceLineMatch[1]) : null;
    const inlineDiagnosticSource = `${rawAttribute(failureTag[2], "message")}\n${body}`;
    const inlineFallbackMatch = inlineDiagnosticSource.match(diagnosticFallbackPattern);
    const inlineAuthDiagnostic = authKernel
      ? (inlineDiagnosticSource.match(authDiagnosticPattern) ??
        (authCorpusId && inlineFallbackMatch
          ? Object.freeze({
              fallback: true,
              stage: inlineFallbackMatch[1],
              mismatch: inlineFallbackMatch[2],
            })
          : authCorpusId && diagnosticUnavailablePattern.test(inlineDiagnosticSource)
            ? unavailableDiagnostic
            : null))
      : null;
    const matchingSidecar =
      sidecarDiagnostic?.corpusId === authCorpusId ? sidecarDiagnostic.marker : null;
    const authDiagnosticMatch = inlineAuthDiagnostic ?? matchingSidecar;
    const authDiagnostic =
      authDiagnosticMatch &&
      (authDiagnosticMatch === unavailableDiagnostic ||
        authDiagnosticMatch.fallback === true ||
        (authCorpusIds.has(authDiagnosticMatch[1]) && authDiagnosticMatch[1] === authCorpusId))
        ? authDiagnosticMatch
        : null;
    failures.push({
      className: authKernel ? "auth_kernel" : className,
      testName:
        authKernel && authCorpusId
          ? `auth_corpus_${authCorpusId}`
          : authKernel
            ? "auth_vector_unknown"
            : attribute(attributes, "name"),
      kind,
      category:
        boundedStageCategory(failureTag[2], body) ??
        (authKernel ? "auth_contract" : failureCategory(failureTag[2])),
      frameworkFailureCategory: frameworkFailureCategory(failureTag[2]),
      runtimeCategories: runtimeCategories(body),
      sourceLine,
      ...(authDiagnostic
        ? {
            authDiagnostic: normalizeBoundedDiagnostic(authDiagnostic, authCorpusId),
          }
        : {}),
    });
  }
}

const summary = { structuredReports: xmlFiles.length, failures };
if (phase) {
  summary.diagnostic = {
    phase,
    category: xmlFiles.length === 0 ? "pre_report_failure" : "structured_test_failure",
  };
}
if (githubAnnotation) {
  const failure = failures.find(
    (candidate) => candidate.className === "auth_kernel" && candidate.authDiagnostic,
  );
  const fields = [`phase=${phase}`, `category=${failure?.category ?? summary.diagnostic.category}`];
  const diagnostic =
    failure?.authDiagnostic ??
    (sidecarDiagnostic
      ? normalizeBoundedDiagnostic(sidecarDiagnostic.marker, sidecarDiagnostic.corpusId)
      : null);
  if (diagnostic) {
    fields.push(
      `corpus=${diagnostic.corpusId}`,
      `stage=${diagnostic.stage}`,
      `mismatch=${diagnostic.mismatch}`,
    );
    if (diagnostic.expectedCount !== undefined) {
      fields.push(
        `expected_count=${diagnostic.expectedCount}`,
        `actual_count=${diagnostic.actualCount}`,
      );
    }
    if (diagnostic.index !== undefined) fields.push(`index=${diagnostic.index}`);
    if (diagnostic.expected !== undefined) {
      fields.push(`expected=${diagnostic.expected}`, `actual=${diagnostic.actual}`);
    }
  }
  process.stdout.write(githubWorkflowErrorAnnotation(fields.join("; ")));
} else {
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}
