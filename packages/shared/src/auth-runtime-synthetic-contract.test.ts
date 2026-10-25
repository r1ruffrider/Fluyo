import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const contract = resolve(root, "contracts/mobile/auth-runtime-synthetic/v1");
const authState = resolve(root, "contracts/mobile/auth-state/v1");
const schema = JSON.parse(readFileSync(resolve(contract, "schema.json"), "utf8")) as Record<
  string,
  unknown
>;
const corpus = readFileSync(resolve(contract, "vectors.tsv"));
const acceptance = JSON.parse(
  readFileSync(resolve(authState, "acceptance.json"), "utf8"),
) as Record<string, unknown>;
const phaseBase = "e2197c597a9a49f3685ceb2c2010cd5d067ff299";
const authReadinessApprovalTemporaryRootPrefix = ".tmp-auth-readiness-approval-";

const phaseUntrackedPaths = (paths: string[]) =>
  paths.filter(
    (path) =>
      Boolean(path) &&
      !path.startsWith(".tmp/") &&
      !path.startsWith(".security-tmp/") &&
      !path.startsWith(authReadinessApprovalTemporaryRootPrefix),
  );

const strings = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be strings`);
  }
  return value;
};
const bundleDigest = () => {
  const hash = createHash("sha256");
  for (const name of ["README.md", "acceptance.json", "copy.json", "state-machine.json"]) {
    const bytes = readFileSync(resolve(authState, name));
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    hash
      .update(name)
      .update(Buffer.from([0]))
      .update(length)
      .update(bytes);
  }
  return hash.digest("hex");
};

const parse = (bytes: Buffer) => {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) throw new Error("bom");
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (decoded.includes("\r") || !decoded.endsWith("\n")) throw new Error("line endings");
  if (/[^\x09\x0a\x20-\x7e]/.test(decoded)) throw new Error("non ascii");
  const lines = decoded.slice(0, -1).split("\n");
  const columns = strings(schema.columns, "columns");
  if (lines[0] !== columns.join("\t")) throw new Error("header");
  const stepTokens = new Set(strings(schema.stepTokens, "stepTokens"));
  const completionTokens = new Set(strings(schema.portCompletionTokens, "portCompletionTokens"));
  const traceTokens = new Set(strings(schema.traceTokens, "traceTokens"));
  const wipeTokens = new Set(strings(schema.wipeTokens, "wipeTokens"));
  const snapshot = new RegExp(String(schema.snapshotPattern));
  const effect = new RegExp(String(schema.effectPattern));
  const ids = new Set<string>();
  const rows = lines.slice(1).map((line) => {
    const fields = line.split("\t");
    if (fields.length !== columns.length) throw new Error("field count");
    const row = Object.fromEntries(
      columns.map((column, index) => [column, fields[index]!]),
    ) as Record<string, string>;
    if (ids.has(row.id!)) throw new Error("duplicate id");
    ids.add(row.id!);
    if (!strings(schema.kinds, "kinds").includes(row.kind!)) throw new Error("kind");
    if (!strings(schema.initials, "initials").includes(row.initial!)) throw new Error("initial");
    if (row.steps!.split(">").some((token) => !stepTokens.has(token))) throw new Error("step");
    if (row.portCompletions!.split(">").some((token) => !completionTokens.has(token))) {
      throw new Error("completion");
    }
    const monotonicTimes = row.monotonicTimes!.split(">");
    if (monotonicTimes.some((token) => !/^(0|[1-9][0-9]*)$/.test(token))) {
      throw new Error("time");
    }
    if (
      monotonicTimes.some(
        (token, index) => index > 0 && BigInt(token) < BigInt(monotonicTimes[index - 1]!),
      )
    )
      throw new Error("time order");
    if (row.expectedSnapshots!.split(">").some((value) => !snapshot.test(value))) {
      throw new Error("snapshot");
    }
    if (
      row.expectedEffects !== "-" &&
      row.expectedEffects!.split(">").some((value) => !effect.test(value))
    ) {
      throw new Error("effect");
    }
    if (
      row.expectedTrace !== "-" &&
      row.expectedTrace!.split(">").some((value) => !traceTokens.has(value))
    ) {
      throw new Error("trace");
    }
    if (!wipeTokens.has(row.wipeOrder!)) throw new Error("wipe");
    if (
      !/^(0|[1-9][0-9]*)$/.test(row.rejectedWrites!) ||
      !/^[1-9][0-9]*$/.test(row.finalGeneration!)
    ) {
      throw new Error("integer");
    }
    if (!/^[01]$/.test(row.terminal!)) throw new Error("terminal");
    if (row.contractFingerprint !== schema.contractFingerprint) throw new Error("digest");
    if (/https?:|@|\\|bearer|token|secret|exception|email/i.test(fields.slice(2).join("\t"))) {
      throw new Error("forbidden data");
    }
    return row;
  });
  const expectedIds = [
    ...strings(acceptance.syntheticScenarioIds, "syntheticScenarioIds"),
    ...strings(acceptance.requiredAssertions, "requiredAssertions"),
  ];
  if (rows.map((row) => row.id).join("\n") !== expectedIds.join("\n")) throw new Error("inventory");
  return rows;
};

describe("native auth executable synthetic kernel", () => {
  it("binds immutable auth-state bytes and the exact executable inventory", () => {
    expect(bundleDigest()).toBe(schema.contractFingerprint);
    const rows = parse(corpus);
    expect(rows.filter((row) => row.kind === "scenario")).toHaveLength(28);
    expect(rows.filter((row) => row.kind === "invariant")).toHaveLength(13);
    expect(rows).toHaveLength(41);
  });

  it("rejects encoding, shape, enum, digest, inventory, private-data, duplicate, and missing mutations", () => {
    const text = corpus.toString("utf8");
    const lines = text.trimEnd().split("\n");
    const mutations = [
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), corpus]),
      Buffer.from(text.replace(/\n/g, "\r\n")),
      Buffer.from(text.replace("init_none", "unknown_step")),
      Buffer.from(text.replace(String(schema.contractFingerprint), "f".repeat(64))),
      Buffer.from(`${text}${lines[1]}\n`),
      Buffer.from(`${[lines[0], ...lines.slice(2)].join("\n")}\n`),
      Buffer.from(text.replace("cold_start_without_candidate", "learner@example.test")),
      Buffer.from(text.replace("vault_none", "https://auth.example.test")),
    ];
    for (const mutation of mutations) expect(() => parse(mutation)).toThrow();
  });

  it("requires both native harnesses to execute the real coordinator without answer factories", () => {
    const swift = readFileSync(
      resolve(root, "apps/ios/FluyoTests/AuthRuntimeKernelTests.swift"),
      "utf8",
    );
    const kotlin = readFileSync(
      resolve(root, "apps/android/app/src/test/java/com/fluyo/app/AuthRuntimeKernelTest.kt"),
      "utf8",
    );
    const swiftRuntime = readFileSync(
      resolve(root, "apps/ios/Fluyo/AuthRuntimeKernel.swift"),
      "utf8",
    );
    const kotlinRuntime = readFileSync(
      resolve(root, "apps/android/app/src/main/java/com/fluyo/app/AuthRuntimeKernel.kt"),
      "utf8",
    );
    for (const source of [swift, kotlin]) {
      expect(source).not.toMatch(/scenarioResult|expectedResult|answerFactory|hardcodedResult/i);
      expect(source).toContain("AuthRuntimeCoordinator");
      expect(source).toContain("receiveCallback");
      expect(source).toContain("drainPresentationEffects");
      expect(source).toContain("expectedSnapshots");
      expect(source).toContain("expectedEffects");
      expect(source).toContain("expectedTrace");
      expect(source).toContain("completionValues");
      expect(source).toContain("normalize");
      expect(source).toContain("snapshotHistory");
      expect(source).toContain("presentationEffectHistory");
      expect(source).toContain("aggregate:");
      expect(source).toContain("cancelOwnedWork");
      expect(source).toContain("activateGeneration");
      expect(source).toContain("oauthState");
      expect(source).toContain("verifier");
      expect(source).toContain("compareAndMutate");
      expect(source).toContain("validationCancellation");
      expect(source).toContain("pauseAfterComparison");
    }
    expect(swift).toContain("XCTAssertEqual(fullEffectHistory, vector.effects");
    expect(swift).toContain("requireCorpusMatch(trace == vector.trace");
    expect(swift).toContain("XCTFail(boundedMarker");
    expect(swift).toContain("print(boundedMarker)");
    expect(swift).toContain("diagnostic_inconsistent");
    expect(swift).toContain("diagnostic_rejected");
    expect(swift).not.toContain("[auth_corpus_diagnostic_unavailable]");
    expect(swift).toContain("XCTAssertEqual(completions, vector.completions");
    expect(swift).toContain("entries.count < commands.count");
    expect(swift).toContain("verifyLateTimerRegistrationCancellation");
    expect(swift).toContain("withTaskCancellationHandler");
    expect(kotlin).toContain("assertEquals(vector.effects, fullEffectHistory)");
    expect(kotlin).toContain("requireCorpusMatch(vector.trace == trace");
    expect(kotlin).toContain("throw AssertionError(boundedMarker)");
    expect(kotlin).toContain("diagnostic_inconsistent");
    expect(kotlin).toContain("diagnostic_rejected");
    expect(kotlin).toContain("private sealed class BoundedTraceCount");
    expect(kotlin).toContain("private sealed class TraceDiagnostic");
    expect(kotlin).toContain("private fun classifyTraceDiagnostic");
    expect(kotlin).toContain("private fun renderTraceDiagnostic");
    expect(kotlin).toContain("private fun parseDiagnosticMarker");
    expect(kotlin).not.toContain("private const val diagnosticCorpusId");
    expect(kotlin).not.toContain("private fun traceMismatch");
    expect(kotlin).not.toContain("[auth_corpus_diagnostic_unavailable]");
    expect(kotlin).toContain('System.getProperty("fluyo.authDiagnosticFile")');
    expect(kotlin).toContain("StandardOpenOption.CREATE_NEW");
    expect(kotlin).toContain("catch (_: FileAlreadyExistsException)");
    expect(kotlin).toContain("preservesFirstMarkerUntilTaskCleanup");
    expect(kotlin).not.toContain("StandardOpenOption.TRUNCATE_EXISTING");
    expect(kotlin).not.toContain("StandardOpenOption.CREATE,");
    expect(kotlin).toContain("trace_(?:sequence_unavailable|");
    expect(kotlin).not.toMatch(/(?:System\.(?:out|err)\.)?print(?:ln)?\s*\(|\bLog\.\w+\s*\(/);
    expect(kotlin).toContain("assertEquals(vector.completions.filterNot");
    expect(kotlin).toContain("values.size < commands.size");
    expect(swiftRuntime).toContain("guard requestedGeneration == generation else { return [] }");
    expect(swiftRuntime).toContain(
      "enqueueLocked(generation, .safeTerminalError, terminalEntryEffect())",
    );
    expect(swiftRuntime).toMatch(
      /finishInitialization[^]*task\.cancel\(\)[^]*cancelOwnedTimers[^]*await task\.value/,
    );
    expect(swiftRuntime).toMatch(
      /finishRefresh[^]*task\.cancel\(\)[^]*cancelOwnedTimers[^]*await task\.value/,
    );
    expect(kotlinRuntime).toContain("if (forGeneration != generationValue)");
    expect(kotlinRuntime).toContain(
      "enqueueLocked(generationValue, AuthRuntimeState.SAFE_TERMINAL_ERROR, terminalEntryEffect())",
    );
    expect(kotlinRuntime).toContain("withContext(NonCancellable) { cleanupIrrevocably");
    expect(kotlinRuntime).toContain(
      "withContext(NonCancellable) { transitionAfterFenceIrrevocably",
    );
    for (const runtime of [swiftRuntime, kotlinRuntime]) {
      expect(runtime).toContain("pendingSuppressedStaleGenerations");
    }
    expect(kotlinRuntime).toMatch(
      /reservation\.generation in staleOutcomeSuppressedGenerations[^]*pendingSuppressedStaleGenerations \+= reservation\.generation/,
    );
    expect(swiftRuntime).toMatch(
      /staleOutcomeSuppressedGenerations\.contains\(reservation\.generation\)[^]*pendingSuppressedStaleGenerations\.insert\(reservation\.generation\)/,
    );
    expect(kotlinRuntime).toMatch(
      /publishLocked\(snapshot\)[^]*payloads\.forEach[^]*staleOutcomeSuppressedGenerations\.remove\(expected\)[^]*pendingSuppressedStaleGenerations\.remove\(expected\)[^]*STALE_REJECTED/,
    );
    expect(kotlinRuntime).toMatch(
      /if \(!committed\)[^]*staleOutcomeSuppressedGenerations\.remove\(expected\)[^]*pendingSuppressedStaleGenerations\.remove\(expected\)/,
    );
    expect(swiftRuntime).toMatch(
      /publishLocked\(snapshot\)[^]*for payload in payloads[^]*staleOutcomeSuppressedGenerations\.remove\(expected\)[^]*pendingSuppressedStaleGenerations\.remove\(expected\)[^]*staleRejected/,
    );
    expect(swiftRuntime).toMatch(
      /if !committed[^]*staleOutcomeSuppressedGenerations\.remove\(expected\)[^]*pendingSuppressedStaleGenerations\.remove\(expected\)/,
    );
    expect(swiftRuntime).not.toContain("guard valid(reservation), !Task.isCancelled");
  });

  it("uses the canonical diagnostic and presentation vocabularies", () => {
    const diagnosticCategories = strings(
      acceptance.fixedDiagnosticCategories,
      "fixedDiagnosticCategories",
    );
    expect(diagnosticCategories).toEqual([
      "success",
      "canceled",
      "malformed",
      "expired",
      "replayed",
      "duplicate",
      "unsupported",
      "overlap_rejected",
      "transient_failure",
      "reauthentication_required",
      "forbidden",
      "owner_mismatch",
      "stale_generation_discarded",
      "vault_corrupt",
      "timed_out",
    ]);
    expect(String(schema.snapshotPattern)).toContain("duplicate");
    expect(String(schema.snapshotPattern)).toContain("overlap_rejected");
    expect(String(schema.snapshotPattern)).toContain("stale_generation_discarded");
    expect(String(schema.effectPattern)).toContain("aggregate");
    expect(String(schema.effectPattern)).toContain("authenticated_after_callback");
    expect(String(schema.effectPattern)).toContain("refresh_pending");
    expect(String(schema.effectPattern)).toContain("session_ended");
    const effectPattern = new RegExp(String(schema.effectPattern));
    expect(
      effectPattern.test("1:1:refresh_pending:aggregate:heading:refresh_pending:polite:none"),
    ).toBe(true);
    expect(
      effectPattern.test("1:1:refresh_pending:aggregate:heading:refresh_pending:none:none"),
    ).toBe(false);
    expect(effectPattern.test("1:1:refresh_pending:aggregate:heading:none:polite:none")).toBe(
      false,
    );
    expect(String(schema.snapshotPattern)).not.toMatch(/cleanup_failed|generation_overflow/);
    for (const path of [
      "apps/ios/Fluyo/AuthRuntimeKernel.swift",
      "apps/android/app/src/main/java/com/fluyo/app/AuthRuntimeKernel.kt",
    ]) {
      const source = readFileSync(resolve(root, path), "utf8");
      expect(source).toContain("hasSessionCandidate");
      expect(source).not.toContain("sessionCandidateStatus");
      expect(source).toContain("session_ended");
      expect(source).toContain("refresh_pending");
      expect(source).not.toMatch(/cleanup_failed|generation_overflow/);
    }
    expect(corpus.toString("utf8")).not.toMatch(/status_heading|signed_in|safe_link_error/);
    const rows = parse(corpus);
    const byId = new Map(rows.map((row) => [row.id, row]));
    const callbackCancelTrace = byId.get("callback_cancel")!.expectedTrace!.split(">");
    const callbackFence = callbackCancelTrace.indexOf("generation_fence");
    const callbackSnapshot = callbackCancelTrace.indexOf("snapshot_published", callbackFence);
    const callbackStale = callbackCancelTrace.indexOf("stale_rejected");
    expect(callbackFence).toBeLessThan(callbackSnapshot);
    expect(callbackSnapshot).toBeLessThan(callbackStale);
    expect(callbackCancelTrace.filter((entry) => entry === "stale_rejected")).toHaveLength(1);
    const signOutTrace = byId.get("stale_response_discarded")!.expectedTrace!.split(">");
    expect(signOutTrace.indexOf("generation_fence")).toBeLessThan(
      signOutTrace.indexOf("stale_rejected"),
    );
    expect(signOutTrace.indexOf("stale_rejected")).toBeLessThan(
      signOutTrace.indexOf("callback_purge"),
    );
    expect(signOutTrace.filter((entry) => entry === "stale_rejected")).toHaveLength(1);
    expect(byId.get("callback_malformed")?.expectedTrace).not.toContain("stale_rejected");
    for (const id of [
      "callback_duplicate_delivery",
      "callback_overlap_rejected",
      "stale_response_discarded",
      "stale_storage_write_discarded",
    ]) {
      expect(byId.get(id)?.expectedSnapshots).not.toMatch(
        /duplicate|overlap_rejected|stale_generation_discarded/,
      );
    }
    expect(byId.get("cold_callback_success")?.expectedSnapshots).toMatch(/^callback_pending,/);
    expect(byId.get("warm_callback_success")?.expectedEffects).toContain(
      ":callback_pending:aggregate:heading:callback_pending:polite:",
    );
    expect(byId.get("offline_startup_preserves_verified_display_only")?.expectedEffects).toContain(
      ":offline_session_candidate:aggregate:heading:offline_candidate:polite:",
    );
    expect(byId.get("account_switch_cleanup")?.expectedEffects).toContain(
      ":account_switching:aggregate:heading:account_switching:polite:",
    );
    expect(byId.get("forbidden_403_preserves_session")?.expectedSnapshots).toContain(
      "safe_terminal_error,present,1,internal_foundation_home,forbidden",
    );
    expect(byId.get("callback_cancel")?.portCompletions).not.toContain("timer_fired");
    expect(byId.get("zero_telemetry_launch")?.monotonicTimes).toBe("0>499");
    expect(byId.get("zero_telemetry_launch")?.expectedEffects).toBe("-");
    expect(byId.get("zero_telemetry_resume")?.monotonicTimes).toBe("0>500");
    expect(byId.get("zero_telemetry_resume")?.expectedEffects).toContain(
      ":initializing:aggregate:none:initializing:polite:",
    );
    expect(byId.get("termination_relaunch_without_transaction")?.monotonicTimes).toBe("0>501");
    expect(byId.get("termination_relaunch_without_transaction")?.expectedEffects).toContain(
      ":initializing:",
    );
    for (const id of [
      "refresh_explicit_revocation",
      "refresh_repeated_401_clears",
      "explicit_invalidation_and_repeated_401_clear",
    ])
      expect(byId.get(id)?.expectedEffects).toContain(":session_ended:");
    const refreshBoundary = byId.get("transient_refresh_failure_preserves_candidate");
    expect(refreshBoundary?.steps).toContain("refresh_boundary_checks");
    expect(refreshBoundary?.monotonicTimes).toBe("0>499>500>501");
    for (const row of rows) {
      const expectedEffectCount =
        row.expectedEffects === "-" ? 0 : row.expectedEffects!.split(">").length;
      const traceEffectCount =
        row.expectedTrace === "-"
          ? 0
          : row.expectedTrace!.split(">").filter((entry) => entry === "effect_enqueued").length;
      expect(expectedEffectCount, row.id).toBe(traceEffectCount);
    }
    const swift = readFileSync(
      resolve(root, "apps/ios/FluyoTests/AuthRuntimeKernelTests.swift"),
      "utf8",
    );
    const kotlin = readFileSync(
      resolve(root, "apps/android/app/src/test/java/com/fluyo/app/AuthRuntimeKernelTest.kt"),
      "utf8",
    );
    for (const source of [swift, kotlin]) {
      expect(source).toContain("presentationEffectHistory");
      expect(source).toContain("setDelayedElapsed");
      expect(source).toMatch(/499[^]*500[^]*501/);
    }
  });

  it("preserves bounded phase claims and excludes the corpus from app resources", () => {
    const phase = JSON.parse(readFileSync(resolve(contract, "phase.json"), "utf8"));
    expect(phase).toMatchObject({
      phaseId: "AUTH-RUNTIME-SYNTHETIC-KERNEL-V1",
      providerRequests: 0,
      liveRuntimeEvidence: 0,
      openMaterialDecisions: 14,
      unsatisfiedReadinessRequirements: 69,
      mirroredLiveRows: { planned: 24, passed: 0, failed: 0, status: "unattempted" },
      uiOnlyChecks: "not_applicable_kernel_only",
      completionClaimAllowed: false,
    });
    expect(readdirSync(contract).sort()).toEqual([
      "README.md",
      "phase.json",
      "schema.json",
      "vectors.tsv",
    ]);
    expect(
      readFileSync(resolve(root, "apps/ios/Fluyo.xcodeproj/project.pbxproj"), "utf8"),
    ).not.toContain("vectors.tsv in Resources");
    expect(readFileSync(resolve(root, "apps/android/app/build.gradle.kts"), "utf8")).not.toContain(
      "auth-runtime-synthetic/v1/vectors.tsv",
    );
  });

  it("pins every protected CI job to the exact event head", () => {
    const workflow = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
    expect(workflow).toContain(
      "FLUYO_CI_HEAD: ${{ github.event.pull_request.head.sha || github.sha }}",
    );
    expect(
      workflow.match(/ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/g),
    ).toHaveLength(8);
    expect(workflow.match(/fetch-depth: 0/g)).toHaveLength(8);
    expect(workflow.match(/- name: Verify exact checkout/g)).toHaveLength(8);
    expect(workflow.match(/test "\$\(git rev-parse HEAD\)" = "\$FLUYO_CI_HEAD"/g)).toHaveLength(8);
  });

  it("carries only validated auth diagnostics and removes the Android sidecar", () => {
    const workflow = readFileSync(resolve(root, ".github/workflows/android.yml"), "utf8");
    const build = readFileSync(resolve(root, "apps/android/app/build.gradle.kts"), "utf8");
    const kernelTest = readFileSync(
      resolve(root, "apps/android/app/src/test/java/com/fluyo/app/AuthRuntimeKernelTest.kt"),
      "utf8",
    );
    const summarizer = readFileSync(
      resolve(root, "scripts/summarize-android-test-failures.mjs"),
      "utf8",
    );
    const annotation = readFileSync(
      resolve(root, "scripts/github-workflow-annotation.mjs"),
      "utf8",
    );
    expect(workflow).toContain(
      'AUTH_DIAGNOSTIC_FILE="$GITHUB_WORKSPACE/apps/android/app/build/auth-runtime-diagnostic.txt"',
    );
    expect(workflow).not.toContain("FLUYO_AUTH_DIAGNOSTIC_FILE");
    expect(workflow).toContain('rm -f "$AUTH_DIAGNOSTIC_FILE"');
    expect(workflow).toContain('--diagnostic-file "$AUTH_DIAGNOSTIC_FILE"');
    expect(workflow).toContain("--github-annotation");
    expect(workflow.match(/scripts\/github-workflow-annotation\.mjs/g)).toHaveLength(2);
    expect(workflow.match(/scripts\/github-workflow-annotation\.test\.mjs/g)).toHaveLength(2);
    expect(build).toContain('layout.buildDirectory.file("auth-runtime-diagnostic.txt")');
    expect(build).toContain('systemProperty("fluyo.authDiagnosticFile"');
    expect(build).toContain("doFirst { authDiagnosticFile.get().asFile.delete() }");
    const diagnosticCorpusSet = kernelTest.match(
      /private val diagnosticCorpusIds = setOf\(([\s\S]*?)\n\)/,
    );
    expect(diagnosticCorpusSet).not.toBeNull();
    const diagnosticCorpusIds = [
      ...(diagnosticCorpusSet?.[1] ?? "").matchAll(/"([a-z0-9_]+)"/g),
    ].map((match) => match[1]);
    const contractCorpusIds = readFileSync(
      resolve(root, "contracts/mobile/auth-runtime-synthetic/v1/vectors.tsv"),
      "utf8",
    )
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((row) => row.split("\t")[1]);
    expect(diagnosticCorpusIds).toEqual(contractCorpusIds);
    expect(kernelTest).toContain("require(corpusId in diagnosticCorpusIds)");
    expect(kernelTest).toContain('private const val diagnosticProducer = "typed_trace_v2"');
    expect(kernelTest).toContain(
      'val envelope = "producer=$diagnosticProducer\\ncorpus=$corpusId\\nmarker=$marker\\n"',
    );
    expect(kernelTest).toContain(
      "writeFirstBoundedDiagnostic(Path.of(path), corpusId, boundedMarker)",
    );
    expect(summarizer).toContain("producer=(typed_trace_v2)\\ncorpus=([a-z0-9_]+)");
    expect(summarizer).toContain("sidecarDiagnostic?.corpusId === authCorpusId");
    expect(summarizer).toContain('origin: "sidecar", producer: matchingSidecar.producer');
    expect(summarizer).toContain("stat.size > 512");
    expect(summarizer).toContain("stat.isSymbolicLink()");
    expect(summarizer).toContain('process.env.GITHUB_ACTIONS !== "true"');
    expect(summarizer).toContain('githubWorkflowErrorAnnotation(fields.join("; "))');
    expect(annotation).toContain(
      'export const githubWorkflowAnnotationTitle = "Fluyo native auth diagnostic"',
    );
    expect(annotation).toContain('replaceAll("%", "%25")');
    expect(annotation).toContain('replaceAll("\\r", "%0D")');
    expect(annotation).toContain('replaceAll("\\n", "%0A")');
    expect(annotation).toContain('replaceAll(":", "%3A")');
    expect(annotation).toContain('replaceAll(",", "%2C")');
  });

  it("enforces the exact phase-base file allowlist and unchanged protected surfaces", () => {
    expect(
      phaseUntrackedPaths([
        ".tmp-auth-readiness-approval-abc123/",
        ".tmp-auth-readiness-approvals-abc123/policy.json",
        "unexpected.txt",
      ]),
    ).toEqual([".tmp-auth-readiness-approvals-abc123/policy.json", "unexpected.txt"]);

    const allowed = [
      ".github/workflows/android.yml",
      ".github/workflows/ci.yml",
      ".github/workflows/ios.yml",
      "apps/android/app/build.gradle.kts",
      "apps/android/app/src/main/java/com/fluyo/app/AuthRuntimeKernel.kt",
      "apps/android/app/src/test/java/com/fluyo/app/AuthRuntimeKernelTest.kt",
      "apps/ios/Fluyo.xcodeproj/project.pbxproj",
      "apps/ios/Fluyo/AuthRuntimeKernel.swift",
      "apps/ios/FluyoTests/AuthRuntimeKernelTests.swift",
      "contracts/mobile/auth-runtime-synthetic/v1/README.md",
      "contracts/mobile/auth-runtime-synthetic/v1/phase.json",
      "contracts/mobile/auth-runtime-synthetic/v1/schema.json",
      "contracts/mobile/auth-runtime-synthetic/v1/vectors.tsv",
      "docs/adr/0006-native-auth-synthetic-kernel.md",
      "packages/shared/src/auth-runtime-synthetic-contract.test.ts",
      "packages/shared/src/ios-foundation-structure.test.ts",
      "scripts/ios-ci.sh",
      "scripts/github-workflow-annotation.mjs",
      "scripts/github-workflow-annotation.test.mjs",
      "scripts/summarize-android-test-failures.mjs",
      "scripts/summarize-ios-test-failures.mjs",
      "scripts/summarize-ios-test-failures.test.mjs",
      "scripts/verify-android-auth-kernel-results.mjs",
      "scripts/verify-android-auth-kernel-results.test.mjs",
    ].sort();
    const tracked = execFileSync("git", ["diff", "--name-only", phaseBase], {
      cwd: root,
      encoding: "utf8",
    })
      .trim()
      .split(/\r?\n/)
      .filter(
        (path) => Boolean(path) && !path.startsWith(".tmp/") && !path.startsWith(".security-tmp/"),
      );
    const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
      cwd: root,
      encoding: "utf8",
    })
      .trim()
      .split(/\r?\n/);
    const phaseUntracked = phaseUntrackedPaths(untracked);
    expect([...new Set([...tracked, ...phaseUntracked])].sort()).toEqual(allowed);
    for (const path of [
      "package.json",
      "package-lock.json",
      "apps/android/app/src/main/AndroidManifest.xml",
      "apps/ios/Fluyo/Info.plist",
      "apps/ios/Config/Base.xcconfig",
      "apps/ios/Config/Debug.xcconfig",
      "apps/ios/Config/Staging.xcconfig",
      "apps/ios/Config/Release.xcconfig",
      "apps/ios/Fluyo/FluyoApp.swift",
      "apps/ios/Fluyo/FoundationShellView.swift",
      "apps/android/app/src/main/java/com/fluyo/app/MainActivity.kt",
      "apps/android/app/src/main/java/com/fluyo/app/FoundationShell.kt",
    ]) {
      expect(readFileSync(resolve(root, path)), path).toEqual(
        execFileSync("git", ["show", `${phaseBase}:${path}`], { cwd: root }),
      );
    }
  });

  it("keeps product kernels provider-neutral, redacted, and structurally telemetry-free", () => {
    const sources = [
      readFileSync(resolve(root, "apps/ios/Fluyo/AuthRuntimeKernel.swift"), "utf8"),
      readFileSync(
        resolve(root, "apps/android/app/src/main/java/com/fluyo/app/AuthRuntimeKernel.kt"),
        "utf8",
      ),
    ].join("\n");
    expect(sources).not.toMatch(
      /URLSession|OkHttp|Retrofit|Supabase|Firebase|os_log|Log\.|Timber|Codable|Serializable|Parcelable|data class/,
    );
    expect(sources).not.toMatch(/emit\(|enqueueTelemetry|writeTelemetry|retryTelemetry/);
    expect(sources).toContain("<opaque-session-candidate>");
    expect(sources).toContain("<opaque-owner-subject>");
    expect(sources).toContain("<opaque-callback-ingress>");
  });
});
