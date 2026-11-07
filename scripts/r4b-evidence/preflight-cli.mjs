import { fileURLToPath } from "node:url";

import { validatePreflightToolManifest } from "./preflight-contracts.mjs";
import {
  attempt002PreparationReceiptDigest,
  deriveAttempt002AuthorityRecord,
} from "./preflight-attempts.mjs";
import { runAttempt002BuildTransaction } from "./preflight-build.mjs";
import { PREFLIGHT_EXECUTOR_PATHS, executeAttempt002Preflight } from "./preflight-executor.mjs";
import { observeDiscardedPreflight, prepareAttempt002Runtime } from "./preflight-observer.mjs";
import { readBoundedRegularFile } from "./fixed-root-guard.mjs";
import {
  APPROVED_PREFLIGHT_SOURCE_COMMIT,
  createDiscardedPreflightPlan,
  discardedPreflightPlanDigest,
} from "./preflight-plan.mjs";

export const PREFLIGHT_RELATIVE_ROOTS = Object.freeze({
  downloads: ".r4b-preflight/downloads",
  tools: ".r4b-preflight/tools",
  runtime: ".r4b-preflight/runtime",
  raw: ".r4b-preflight/runtime/raw",
  toolManifest: ".r4b-preflight/runtime/tool-manifest.json",
  syntheticAggregate: PREFLIGHT_EXECUTOR_PATHS.aggregate,
  sanitizedResult: PREFLIGHT_EXECUTOR_PATHS.result,
  discardReceipt: PREFLIGHT_EXECUTOR_PATHS.discard,
  attempt002: Object.freeze({
    root: ".r4b-preflight/runtime/attempts/attempt-002-observer",
    lifecycle: ".r4b-preflight/runtime/attempt-002-lifecycle.jsonl",
    sourceToolManifest: ".r4b-preflight/runtime/attempt-002-tool-manifest.json",
    authority: ".r4b-preflight/runtime/attempts/attempt-002-observer/authority.json",
    toolManifest: ".r4b-preflight/runtime/attempts/attempt-002-observer/tool-manifest.json",
    preparationReceipt:
      ".r4b-preflight/runtime/attempts/attempt-002-observer/preparation-receipt.json",
    raw: ".r4b-preflight/runtime/attempts/attempt-002-observer/raw",
    build: "apps/r4b-preflight-harness/.next-attempt-002",
    buildTemp: ".r4b-preflight/runtime/attempt-002-build-temp",
    syntheticAggregate:
      ".r4b-preflight/runtime/attempts/attempt-002-observer/synthetic-observation-aggregate.json",
    sanitizedResult: ".r4b-preflight/runtime/attempts/attempt-002-observer/sanitized-result.json",
    discardReceipt: ".r4b-preflight/runtime/attempts/attempt-002-observer/discard-receipt.json",
    failedHeld: ".r4b-preflight/runtime/attempts/attempt-002-observer/failed-held.json",
    buildFailedHeld: ".r4b-preflight/runtime/attempt-002-build-failed-held.json",
    buildOwnership: ".r4b-preflight/runtime/attempt-002-builder-ownership.jsonl",
    buildRecovery: ".r4b-preflight/runtime/attempt-002-build-failure-recovery.json",
    buildReady: ".r4b-preflight/runtime/attempt-002-build-ready.json",
    serverReady: ".r4b-preflight/runtime/attempts/attempt-002-observer/server-ready.json",
    driverReady: ".r4b-preflight/runtime/attempts/attempt-002-observer/driver-ready.json",
    nvdaReady: ".r4b-preflight/runtime/attempts/attempt-002-observer/nvda-ready.json",
  }),
});

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));

export function createPreflightInfrastructureHandshake() {
  const plan = createDiscardedPreflightPlan();
  return Object.freeze({
    schema: "fluyo:r4b:preflight-handshake:v1",
    creditable: false,
    evidenceStatus: "NON_EVIDENCE",
    sourceCommit: APPROVED_PREFLIGHT_SOURCE_COMMIT,
    planDigest: discardedPreflightPlanDigest(plan),
    relativeRoots: PREFLIGHT_RELATIVE_ROOTS,
    environmentVariables: [],
    loopbackOriginPolicy: "INTERNAL_IPV4_LOOPBACK_ONLY_NOT_RETAINED",
    extractionPolicy: "PORTABLE_STANDARD_USER_NO_GLOBAL_INSTALL",
    rawOutputPolicy: "DISCARD_ALL_RETAIN_SANITIZED_AGGREGATES_ONLY",
    networkIsolationAuthority: "UNATTEMPTED",
    forbiddenActions: Object.freeze([
      "provider_or_cloud_access",
      "credential_or_secret_use",
      "administrator_or_uac_action",
      "firewall_or_registry_mutation",
      "system_path_or_service_mutation",
      "upload_or_external_ocr",
      "spending",
      "full_capture",
      "final_evidence_credit",
    ]),
  });
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

export function createAttempt002PreparationSummary(receipt, receiptDigest) {
  if (
    !receipt ||
    receipt.status !== "PASS" ||
    receipt.nativeNvdaLaunchStatus !== "UNATTEMPTED" ||
    !/^[0-9a-f]{64}$/u.test(receiptDigest)
  ) {
    throw new Error("attempt-002 preparation summary inputs are malformed");
  }
  return Object.freeze({
    schema: "fluyo:r4b:preflight-preparation-summary:v1",
    evidenceStatus: "NON_EVIDENCE",
    status: receipt.status,
    receiptDigest,
    nativeNvdaLaunchStatus: receipt.nativeNvdaLaunchStatus,
  });
}

function fixedManifestPath() {
  return fileURLToPath(new URL("../../.r4b-preflight/runtime/tool-manifest.json", import.meta.url));
}

export async function runPreflightCli(args) {
  if (args.length !== 1) {
    throw new Error(
      "expected exactly one fixed command: describe, emit-plan, emit-attempt-002-authority, validate-tool-manifest, build-attempt-002, prepare-attempt-002, observe, or execute",
    );
  }
  switch (args[0]) {
    case "describe":
      printJson(createPreflightInfrastructureHandshake());
      return;
    case "emit-plan":
      printJson(createDiscardedPreflightPlan());
      return;
    case "emit-attempt-002-authority":
      printJson(deriveAttempt002AuthorityRecord());
      return;
    case "validate-tool-manifest": {
      const manifest = JSON.parse(
        readBoundedRegularFile(
          fixedManifestPath(),
          REPOSITORY_ROOT,
          1024 * 1024,
          "attempt-002 tool manifest",
        ).toString("utf8"),
      );
      validatePreflightToolManifest(manifest);
      printJson({
        schema: "fluyo:r4b:preflight-tool-manifest-validation:v1",
        sourceCommit: manifest.sourceCommit,
        status: "PASS",
      });
      return;
    }
    case "build-attempt-002":
      printJson(await runAttempt002BuildTransaction());
      return;
    case "prepare-attempt-002": {
      const receipt = await prepareAttempt002Runtime();
      printJson(createAttempt002PreparationSummary(receipt, attempt002PreparationReceiptDigest()));
      return;
    }
    case "execute": {
      const { result, receipt } = executeAttempt002Preflight();
      printJson({
        schema: "fluyo:r4b:preflight-execution-summary:v2",
        evidenceStatus: result.evidenceStatus,
        status: result.status,
        conducted: result.conducted,
        passed: result.passed,
        failed: result.failed,
        blocked: result.blocked,
        requiredUnattempted: result.requiredUnattempted,
        discardStatus: receipt.cleanupStatus,
      });
      return;
    }
    case "observe": {
      const aggregate = await observeDiscardedPreflight();
      printJson({
        schema: "fluyo:r4b:preflight-observer-summary:v1",
        evidenceStatus: aggregate.evidenceStatus,
        checks: aggregate.checks.length,
        status: "READY_FOR_EXECUTOR",
      });
      return;
    }
    default:
      throw new Error(
        "unknown command; expected describe, emit-plan, emit-attempt-002-authority, validate-tool-manifest, build-attempt-002, prepare-attempt-002, observe, or execute",
      );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPreflightCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "preflight CLI failed"}\n`);
    process.exitCode = 1;
  });
}
