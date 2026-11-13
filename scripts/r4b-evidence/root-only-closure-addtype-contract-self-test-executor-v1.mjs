import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  realpathSync,
  writeSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const deepFreeze = (value) => {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};
const EXPECTED_PACKET_V111 = JSON.parse(
  String.raw`{"schemaVersion":2,"packetId":"R4B-ADDTYPE-CONTRACT-SELF-TEST-ACTIVATION-v1.1.1","recordedDate":"2026-11-13","decision":{"selection":"RECOMMENDED_OPTION_A","approvedBy":"Adriana Solano","approvalBasis":"MARLON_DELEGATED_BOUNDED_NON_PRODUCTION_EVIDENCE_TEST_APPROVAL","authorityId":"CLOSED_ADD_TYPE_PINVOKE_LEASE_BOOTSTRAP_V1","decisionReference":"MARLON_RECOMMENDED_1A_CLOSED_ADDTYPE_PINVOKE_2026-11-11"},"historicalDesignProvenance":{"sourceMainCommit":"d6607300e52219c5d534e70c17e00e2e717e505b","reviewedSourceHead":"7220bef062a93142f5bcde07de89199355eb5837","designMergeCommit":"7a5b345846eb29928dacb8f01b96796c01182dc2","readinessMergeCommit":"d70d8d9f3510b8b4a83f18478dc79dece39094d6","semantics":"IMMUTABLE_HISTORICAL_PROVENANCE_NOT_EXECUTION_AUTHORITY"},"executionBinding":{"executionCheckoutCommit":"d70d8d9f3510b8b4a83f18478dc79dece39094d6","requiredAncestorCommit":"d6607300e52219c5d534e70c17e00e2e717e505b","relationship":"DESCENDANT_WITH_BYTE_IDENTICAL_TEN_PATH_SUBJECT","reviewBinding":"HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1","manifestRowCount":10,"manifestByteCount":1753,"manifestSha256":"15b3ff5f2158b0eb7839591a0aad3373491afff45b2e7dc6a4eda2e3f607ea2b","manifestPaths":["docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md","docs/DEVELOPMENT_HANDOFF.md","scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json","scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs","scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.ps1","scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs","scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs","scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs","scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs","scripts/r4b-evidence/roslyn-verifier-authenticode.cs"],"cleanDetachedCheckoutRequired":true,"headDriftInvalidates":true,"repositoryIdentityBinding":{"mode":"EXPECTED_REPOSITORY_COMMON_DIR_IDENTITY_V1","derivationAlgorithm":"R4B_REPOSITORY_COMMON_DIR_IDENTITY_V1","reviewedPostMainTupleRequired":true,"expectedValueCommitted":false,"crossCloneAllowed":false,"sameCommonDirIdentityRequired":true}},"activationBundleBinding":{"reviewBinding":"HELD_SIX_PATH_ACTIVATION_REVIEW_BINDING_V1","pathCount":6,"manifestAlgorithm":"UTF8_PATH_NUL_BYTECOUNT_NUL_SHA256_NUL_GITBLOBSHA1_LF_V1","manifestDigestCommitted":false,"manifestDigestSource":"FRESH_EXACT_HEAD_GATE","paths":["docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md","docs/2026-11-13_r4b_addtype_contract_self_test_activation_v1.md","packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts","scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-activation-v1.json","scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.mjs","scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.test.mjs"]},"executorBinding":{"contractVersion":"R4B-ADDTYPE-OUTER-ACTIVATION-EXECUTOR-v1.1.1","executorPath":"scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.mjs","executorTestPath":"scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.test.mjs","adapterPath":"scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs","adapterCliMode":"--execute-authorized-contract-self-test-v1","adapterReviewBinding":"HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1","nodeHost":{"path":"C:\\Program Files\\nodejs\\node.exe","version":"24.22.1","byteCount":93915464,"sha256":"d702daa815eabbff763c7d3808e235cf031cf2ca70211b56847bc72f51e240e5","normalizedImagePathSha256":"46674df7e50081977073a3d38239a6782e73328bda5843f5d5a85d4118d98357"},"allowedBuiltins":["node:child_process","node:crypto","node:fs","node:path","node:process","node:url"],"dynamicImportAllowed":false,"shellAllowed":false,"networkAllowed":false,"unknownArgumentsAllowed":false},"transaction":{"transactionId":"R4B-ADDTYPE-CONTRACT-SELF-TEST-D70D8D9F-001","transactionIdSha256":"ac17e1dfe4c2f08c719eb89a73756e0f426f81d407ed4d38482fd07e4853c576","mode":"CONTRACT_SELF_TEST_V1_13_6","outerCliMode":"--execute-authorized-contract-self-test-activation-v1","innerCliMode":"--execute-authorized-contract-self-test-v1","maximumAttempts":1,"attemptConsumedAt":"EXCLUSIVE_TRANSACTION_DIRECTORY_CREATE_SUCCESS","retryAllowed":false,"resumeAllowed":false,"networkAllowed":false,"cleanCompilerProcessCount":1,"cleanFixtureProcessCount":39,"cleanOwnedChildProcessCount":40,"innerReceiptMaximumBytes":4096,"outerReceiptMaximumBytes":8192,"childStdoutMaximumBytes":4096,"childStderrMaximumBytes":0,"outerObservationTimeoutMs":330000,"innerTerminalStates":["SYNTHETIC_TEST_CLEAN","SYNTHETIC_TEST_FAILED_CLEAN","SYNTHETIC_TEST_FAILED_CLEANUP_HOLD"],"outerTerminalStates":["OUTER_SYNTHETIC_TEST_CLEAN","OUTER_SYNTHETIC_TEST_FAILED_CLEAN","OUTER_SYNTHETIC_TEST_FAILED_CLEANUP_HOLD","OUTER_ATTEMPT_CONSUMED_MARKER_INCOMPLETE_HOLD","OUTER_ATTEMPT_CONSUMED_RESULT_UNKNOWN_HOLD"]},"durableConsumption":{"mode":"GIT_COMMON_DIR_DURABLE_TRANSACTION_V1","transactionIdSha256":"ac17e1dfe4c2f08c719eb89a73756e0f426f81d407ed4d38482fd07e4853c576","relativeDirectory":"fluyo-r4b/transactions/ac17e1dfe4c2f08c719eb89a73756e0f426f81d407ed4d38482fd07e4853c576","markerFileName":"consumption-v1.json","receiptFileName":"outer-receipt-v1.json","directoryCreateMode":"EXCLUSIVE_NONRECURSIVE_SEGMENT_CHAIN_V1","markerCreateMode":"WX_CANONICAL_FSYNC_V1","receiptCreateMode":"WX_CANONICAL_FSYNC_V1","directoryExistenceConsumesAttempt":true,"retryAllowed":false,"resumeAllowed":false,"repairAllowed":false,"deleteAllowed":false,"crossCloneAllowed":false,"sameCommonDirIdentityRequired":true,"retention":"PERMANENT_DO_NOT_DELETE_REPAIR_REUSE"},"outerReceipt":{"schema":"R4B-ADDTYPE-CONTRACT-SELF-TEST-OUTER-RECEIPT-v1.1.1","maximumBytes":8192,"canonicalEncoding":"UTF8_NFC_COMPACT_JSON_ONE_LF","rawPathAllowed":false,"rawOutputAllowed":false,"innerRetainedArtifactCountRequired":0,"markerStateValues":["VALID_CANONICAL","ABSENT_AFTER_DIRECTORY_CONSUMPTION_HOLD","PRESENT_INVALID_OR_PARTIAL_HOLD"],"retention":"PERMANENT_DO_NOT_DELETE_REPAIR_REUSE"},"preExecutionGates":{"packetExactHeadElana":"REQUIRED_PASS_BEFORE_MERGE","protectedCi":"REQUIRED_SUCCESS","postMain":"REQUIRED_SUCCESS","postMainRepositoryIdentityTuple":"REQUIRED_FRESH_REVIEW","catalina":"REQUIRED_FRESH_PASS_ON_M_D70_IDENTITY_TUPLE","natalia":"REQUIRED_FRESH_PASS_ON_M_D70_IDENTITY_TUPLE","renata":"REQUIRED_FRESH_PASS_ON_M_D70_IDENTITY_TUPLE","postRunJulieta":"REQUIRED","postRunElana":"REQUIRED"},"authority":{"syntheticBootstrapTestAuthorized":true,"transactionAuthorizationPresent":true,"externalActionAuthorized":false,"downloadAuthorityPresent":false,"executionAuthorityPresent":false,"state":"PRECONDITION_HOLD_NO_GET"},"operationalScenarios":[{"id":"E01","status":"REQUIRED_UNATTEMPTED"},{"id":"E02","status":"REQUIRED_UNATTEMPTED"},{"id":"E03","status":"REQUIRED_UNATTEMPTED"},{"id":"E04","status":"REQUIRED_UNATTEMPTED"},{"id":"E05","status":"REQUIRED_UNATTEMPTED"},{"id":"E06","status":"REQUIRED_UNATTEMPTED"},{"id":"E07","status":"REQUIRED_UNATTEMPTED"},{"id":"E08","status":"REQUIRED_UNATTEMPTED"}],"forbiddenActions":["GET","DOWNLOAD","ACQUISITION","LIVE_VERIFIER","NUGET_EXECUTION","BROKER","ATTEMPT004","E01","E02","E03","E04","E05","E06","E07","E08","PRODUCTION","SIGNING","STORE","SPEND","CREDENTIAL","EXTERNAL_ACCOUNT","PROVIDER_ADMIN","FIREWALL","STORAGE_EXPANSION","PUBLICATION"],"completion":{"r4b2":false,"r4b3":false,"aggregateR4b":false,"sprint6":false},"claimBoundary":"ONE_ZERO_NETWORK_SYNTHETIC_CONTRACT_SELF_TEST_ONLY_NO_OPERATIONAL_OR_EXTERNAL_AUTHORITY"}`,
);

const EXPECTED_PACKET = deepFreeze({
  ...EXPECTED_PACKET_V111,
  packetId: "R4B-ADDTYPE-CONTRACT-SELF-TEST-ACTIVATION-v1.1.2",
  activationBundleBinding: {
    ...EXPECTED_PACKET_V111.activationBundleBinding,
    paths: [
      "docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md",
      "docs/2026-11-13_r4b_addtype_contract_self_test_activation_v1.md",
      "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts",
      "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-executor.test.mjs",
      "scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-activation-v1.json",
      "scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.mjs",
    ],
  },
  executorBinding: {
    ...EXPECTED_PACKET_V111.executorBinding,
    contractVersion: "R4B-ADDTYPE-OUTER-ACTIVATION-EXECUTOR-v1.1.2",
    executorTestPath:
      "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-executor.test.mjs",
  },
  transaction: {
    transactionId: "R4B-ADDTYPE-CONTRACT-SELF-TEST-D70D8D9F-001",
    transactionIdSha256: "ac17e1dfe4c2f08c719eb89a73756e0f426f81d407ed4d38482fd07e4853c576",
    mode: "CONTRACT_SELF_TEST_V1_13_6",
    outerCliMode: "--execute-authorized-contract-self-test-activation-v1",
    innerCliMode: "--execute-authorized-contract-self-test-v1",
    maximumAttempts: 1,
    attemptConsumedAt: "EXCLUSIVE_TRANSACTION_DIRECTORY_CREATE_SUCCESS",
    retryAllowed: false,
    resumeAllowed: false,
    networkAllowed: false,
    cleanCompletedFixtureCount: 39,
    cleanDerivedLaunchedCompilerProcessCount: 1,
    cleanResidualCompilerProcessCount: 0,
    cleanResidualFixtureProcessCount: 0,
    cleanResidualOwnedProcessCount: 0,
    cleanNetworkBaselineOwnerCount: 2,
    cleanNetworkWorkOwnerCount: 40,
    cleanNetworkOwnerCount: 42,
    cleanNetworkEventCount: 0,
    networkTablesPerObservation: 4,
    innerReceiptMaximumBytes: 4096,
    outerReceiptMaximumBytes: 8192,
    childStdoutMaximumBytes: 4096,
    childStderrMaximumBytes: 0,
    outerObservationTimeoutMs: 330000,
    innerTerminalStates: [
      "SYNTHETIC_TEST_CLEAN",
      "SYNTHETIC_TEST_FAILED_CLEAN",
      "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD",
    ],
    outerTerminalStates: [
      "OUTER_SYNTHETIC_TEST_CLEAN",
      "OUTER_SYNTHETIC_TEST_FAILED_CLEAN",
      "OUTER_SYNTHETIC_TEST_FAILED_CLEANUP_HOLD",
      "OUTER_ATTEMPT_CONSUMED_MARKER_INCOMPLETE_HOLD",
      "OUTER_ATTEMPT_CONSUMED_RESULT_UNKNOWN_HOLD",
    ],
  },
  outerReceipt: {
    schema: "R4B-ADDTYPE-CONTRACT-SELF-TEST-OUTER-RECEIPT-v1.1.2",
    maximumBytes: 8192,
    canonicalEncoding: "UTF8_NFC_COMPACT_JSON_ONE_LF",
    rawPathAllowed: false,
    rawOutputAllowed: false,
    innerRetainedArtifactCountRequired: 0,
    innerNumericalEvidenceProjection: {
      sourceReceiptKeyCount: 29,
      cleanAndFailedCleanRequireCompleteEvidence: true,
      cleanupHoldOuterProjection: "ALL_NUMERICAL_FIELDS_NULL",
      networkTablesPerObservation: 4,
      sourceFields: [
        "completedFixtureCount",
        "compilerProcessCount",
        "fixtureProcessCount",
        "cleanupStepCount",
        "networkBaselineOwnerCount",
        "networkWorkOwnerCount",
        "networkOwnerCount",
        "networkObservationCount",
        "networkMaximumGapMicros",
        "networkEventCount",
        "retainedArtifactCount",
      ],
      derivedFields: [
        "innerDerivedLaunchedCompilerProcessCount=networkWorkOwnerCount-completedFixtureCount",
        "innerDerivedNetworkTableIterationCount=networkObservationCount*4",
      ],
    },
    markerStateValues: [
      "VALID_CANONICAL",
      "ABSENT_AFTER_DIRECTORY_CONSUMPTION_HOLD",
      "PRESENT_INVALID_OR_PARTIAL_HOLD",
    ],
    retention: "PERMANENT_DO_NOT_DELETE_REPAIR_REUSE",
  },
});

const CONTRACT_VERSION = "R4B-ADDTYPE-OUTER-ACTIVATION-EXECUTOR-v1.1.2";
const PACKET_PATH =
  "scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-activation-v1.json";
const ADAPTER_PATH =
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs";
const ADAPTER_BYTE_COUNT = 67466;
const ADAPTER_SHA256 = "a86fafac5f55f9d93308484bc54fb2a815bd264e7f558a6e0f9b79ba98cb950f";
const ADAPTER_GIT_BLOB_SHA1 = "7ed73973cc5fad445cda7d7dc872609dc8796c97";
const SIX_PATHS = Object.freeze([
  "docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md",
  "docs/2026-11-13_r4b_addtype_contract_self_test_activation_v1.md",
  "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts",
  "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-executor.test.mjs",
  "scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-activation-v1.json",
  "scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.mjs",
]);
const OUTER_MODE = "--execute-authorized-contract-self-test-activation-v1";
const INNER_MODE = "--execute-authorized-contract-self-test-v1";
const TEN_BINDING = "HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1";
const SIX_BINDING = "HELD_SIX_PATH_ACTIVATION_REVIEW_BINDING_V1";
const EXECUTION_COMMIT = "d70d8d9f3510b8b4a83f18478dc79dece39094d6";
const TEN_MANIFEST_SHA = "15b3ff5f2158b0eb7839591a0aad3373491afff45b2e7dc6a4eda2e3f607ea2b";
const TRANSACTION_ID = "R4B-ADDTYPE-CONTRACT-SELF-TEST-D70D8D9F-001";
const TRANSACTION_SHA = "ac17e1dfe4c2f08c719eb89a73756e0f426f81d407ed4d38482fd07e4853c576";
const TRANSACTION_SEGMENTS = ["fluyo-r4b", "transactions", TRANSACTION_SHA];
const MARKER_NAME = "consumption-v1.json";
const RECEIPT_NAME = "outer-receipt-v1.json";
const RECEIPT_ID = "R4B-ADDTYPE-CONTRACT-SELF-TEST-OUTER-RECEIPT-v1.1.2";
const COMMON_ID_DOMAIN = "R4B_REPOSITORY_COMMON_DIR_IDENTITY_V1";
const MAX_GIT_CONTROL_BYTES = 4096;
const MAX_MARKER_BYTES = 2048;
const MAX_OUTER_RECEIPT_BYTES = 8192;
const MAX_STDOUT_BYTES = 4096;
const OBSERVATION_TIMEOUT_MS = 330000;
const FORBIDDEN_OUTER_ENVIRONMENT_KEYS = Object.freeze([
  "NODE_OPTIONS",
  "NODE_PATH",
  "NODE_EXTRA_CA_CERTS",
  "NPM_CONFIG_NODE_OPTIONS",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "NO_PROXY",
  "NUGET_CREDENTIALPROVIDERS_PATH",
  "NUGET_PLUGIN_PATHS",
  "ARTIFACTS_CREDENTIALPROVIDER_FEED_ENDPOINTS",
  "VSS_NUGET_EXTERNAL_FEED_ENDPOINTS",
]);

const PLATFORM_KEYS = Object.freeze([
  "openFileReadOnly",
  "openDirectoryReadOnly",
  "close",
  "fstatBigInt",
  "readHeldFile",
  "realpathNative",
  "lstat",
  "mkdirNonrecursive",
  "openFileExclusive",
  "writeAll",
  "fsyncFile",
  "fsyncDirectory",
  "spawnDirect",
  "waitForExit",
  "monotonicMilliseconds",
]);

const INNER_RECEIPT_KEYS = Object.freeze([
  "schemaVersion",
  "mode",
  "contractVersion",
  "reviewBinding",
  "candidateManifestSha256",
  "state",
  "primaryFailureReason",
  "completedFixtureCount",
  "compilerProcessCount",
  "fixtureProcessCount",
  "cleanupStepCount",
  "fixtureEvidenceSha256",
  "publicTracePinsSha256",
  "ownershipLedgerPreCleanupSha256",
  "ownershipLedgerSha256",
  "cleanupSha256",
  "adapterSessionClosed",
  "networkEvidenceMode",
  "networkMeasurementComplete",
  "networkBaselineOwnerCount",
  "networkWorkOwnerCount",
  "networkOwnerCount",
  "networkObservationCount",
  "networkMaximumGapMicros",
  "networkEventCount",
  "retainedArtifactCount",
  "globalMutationCount",
  "manifestFinalRevalidated",
  "authority",
]);
const TRANSACTION_INNER_REASONS = Object.freeze([
  "SYNTHETIC_CONTRACT_INVALID",
  "PRE_BASELINE_HOLD",
  "PINNED_INPUT_INVALID",
  "PROCESS_IMAGE_IDENTITY_INVALID",
  "OWNERSHIP_CONTAINMENT_INVALID",
  "NETWORK_MEASUREMENT_INVALID",
  "GLOBAL_MUTATION_DETECTED",
  "PROCESS_FAILED",
  "PROCESS_TIMEOUT",
  "OUTPUT_INVALID",
  "WORK_DEADLINE_EXCEEDED",
  "GLOBAL_DEADLINE_EXCEEDED",
]);
const ADAPTER_INNER_REASONS = Object.freeze([
  "ADAPTER_HOST_INVALID",
  "ADAPTER_AMBIENT_INVALID",
  "ADAPTER_ARGUMENT_INVALID",
  "ADAPTER_MANIFEST_INVALID",
  "ADAPTER_ROOT_PRECONDITION_HOLD",
  "ADAPTER_BOOTSTRAP_TIMEOUT_HOLD",
  "ADAPTER_BOOTSTRAP_DESCENDANT_UNPROVEN_HOLD",
  "ADAPTER_BOOTSTRAP_INVALID",
  "ADAPTER_PIPE_SECURITY_INVALID",
  "ADAPTER_HANDSHAKE_INVALID",
  "ADAPTER_PROTOCOL_INVALID",
  "ADAPTER_RPC_TIMEOUT",
  "ADAPTER_FORCE_STOP_FAILED",
  "ADAPTER_NETWORK_OBSERVER_INVALID",
  "ADAPTER_GLOBAL_SNAPSHOT_INVALID",
  "ADAPTER_CRASH_RESIDUE_HOLD",
  "ADAPTER_SESSION_CLOSE_FAILED",
  "ADAPTER_INTERNAL_FAILURE",
]);
const CLOSED_INNER_REASONS = Object.freeze([
  ...TRANSACTION_INNER_REASONS,
  ...ADAPTER_INNER_REASONS,
]);

const NUMERICAL_PROJECTION_KEYS = Object.freeze([
  "innerCompletedFixtureCount",
  "innerDerivedLaunchedCompilerProcessCount",
  "innerResidualCompilerProcessCount",
  "innerResidualFixtureProcessCount",
  "innerCleanupStepCount",
  "innerNetworkBaselineOwnerCount",
  "innerNetworkWorkOwnerCount",
  "innerNetworkOwnerCount",
  "innerNetworkObservationCount",
  "innerNetworkMaximumGapMicros",
  "innerDerivedNetworkTableIterationCount",
  "innerNetworkEventCount",
  "innerRetainedArtifactCount",
]);
const NULL_NUMERICAL_PROJECTION = Object.freeze(
  Object.fromEntries(NUMERICAL_PROJECTION_KEYS.map((key) => [key, null])),
);

const OUTER_RECEIPT_KEYS = Object.freeze([
  "schemaVersion",
  "receiptId",
  "transactionId",
  "transactionIdSha256",
  "state",
  "reason",
  "activationMergeCommit",
  "executionCheckoutCommit",
  "activationPacketSha256",
  "activationPacketGitBlobSha1",
  "activationManifestSha256",
  "reviewBinding",
  "expectedRepositoryCommonDirIdentitySha256",
  "observedRepositoryCommonDirIdentitySha256",
  "nodeImageEvidence",
  "adapterImageEvidence",
  "innerReceiptByteCount",
  "innerReceiptSha256",
  "innerState",
  "innerPrimaryFailureReason",
  ...NUMERICAL_PROJECTION_KEYS,
  "childSpawnAttempted",
  "childExitCode",
  "childSignal",
  "childTimedOut",
  "stdoutByteCount",
  "stderrByteCount",
  "cleanupState",
  "residueState",
  "consumptionMarkerState",
  "outerEvidenceFileCount",
  "outerValidEvidenceFileCount",
  "outerEvidenceRetention",
  "authority",
]);

class ActivationFailure extends Error {
  constructor(reason, consumed = false) {
    super(reason);
    this.reason = reason;
    this.consumed = consumed;
  }
}

const fail = (reason, consumed = false) => {
  throw new ActivationFailure(reason, consumed);
};
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const gitBlob = (bytes) =>
  createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`, "utf8"), bytes]))
    .digest("hex");
const exactKeys = (value, keys, reason = "ACTIVATION_PACKET_INVALID") => {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value)) !== JSON.stringify(keys)
  )
    fail(reason);
};
const canonicalCompact = (value) => Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
const isHex = (value, length) =>
  typeof value === "string" && new RegExp(`^[0-9a-f]{${length}}$`, "u").test(value);
const statIdentity = (stat) => ({ dev: stat.dev, ino: stat.ino, size: stat.size });
const sameIdentity = (left, right) =>
  left.dev === right.dev && left.ino === right.ino && left.size === right.size;
const normalizePath = (value) => {
  let normalized = value.normalize("NFC").replaceAll("/", "\\");
  if (/^[A-Za-z]:\\/u.test(normalized))
    normalized = `${normalized[0].toLowerCase()}${normalized.slice(1)}`;
  if (!/^[a-z]:\\$/u.test(normalized)) normalized = normalized.replace(/\\+$/u, "");
  return normalized;
};
const imageEvidence = (bytes, stat, finalPath, includeBlob) => {
  const scalar = {
    byteCount: bytes.length,
    sha256: sha256(bytes),
    ...(includeBlob ? { gitBlobSha1: gitBlob(bytes) } : {}),
    finalPathSha256: sha256(Buffer.from(normalizePath(finalPath), "utf8")),
    deviceHex: BigInt.asUintN(64, stat.dev).toString(16),
    inodeHex: BigInt.asUintN(128, stat.ino).toString(16),
  };
  return Object.freeze({ ...scalar, evidenceSha256: sha256(Buffer.from(JSON.stringify(scalar))) });
};

function validatePlatform(platform) {
  exactKeys(platform, PLATFORM_KEYS, "ACTIVATION_INTERNAL_FAILURE_HOLD");
  for (const key of PLATFORM_KEYS)
    if (typeof platform[key] !== "function") fail("ACTIVATION_INTERNAL_FAILURE_HOLD");
  return platform;
}

function parseCli(argv, execArgv, executorPath) {
  if (
    !Array.isArray(execArgv) ||
    execArgv.length !== 0 ||
    !Array.isArray(argv) ||
    argv.length !== 10
  )
    fail("ACTIVATION_CLI_INVALID");
  const patterns = [
    [2, OUTER_MODE],
    [3, /^--activation-merge-commit=([0-9a-f]{40})$/u],
    [4, /^--execution-checkout-root=(.+)$/u],
    [5, /^--activation-packet-sha256=([0-9a-f]{64})$/u],
    [6, /^--activation-packet-git-blob-sha1=([0-9a-f]{40})$/u],
    [7, /^--reviewed-six-row-manifest-sha256=([0-9a-f]{64})$/u],
    [8, /^--expected-repository-common-dir-identity-sha256=([0-9a-f]{64})$/u],
    [9, `--review-binding=${SIX_BINDING}`],
  ];
  if (resolve(argv[1]).toLowerCase() !== resolve(executorPath).toLowerCase())
    fail("ACTIVATION_CLI_INVALID");
  for (const [index, expected] of patterns) {
    const value = argv[index];
    if (typeof expected === "string" ? value !== expected : !expected.test(value))
      fail("ACTIVATION_CLI_INVALID");
  }
  const executionRoot = argv[4].slice("--execution-checkout-root=".length);
  if (!isAbsolute(executionRoot) || executionRoot !== resolve(executionRoot))
    fail("ACTIVATION_CLI_INVALID");
  const values = Object.freeze({
    activationMergeCommit: argv[3].slice("--activation-merge-commit=".length),
    executionRoot,
    activationPacketSha256: argv[5].slice("--activation-packet-sha256=".length),
    activationPacketGitBlobSha1: argv[6].slice("--activation-packet-git-blob-sha1=".length),
    activationManifestSha256: argv[7].slice("--reviewed-six-row-manifest-sha256=".length),
    expectedRepositoryIdentity: argv[8].slice(
      "--expected-repository-common-dir-identity-sha256=".length,
    ),
    reviewBinding: argv[9].slice("--review-binding=".length),
  });
  if (
    !isHex(values.activationMergeCommit, 40) ||
    !isHex(values.activationPacketSha256, 64) ||
    !isHex(values.activationPacketGitBlobSha1, 40) ||
    !isHex(values.activationManifestSha256, 64) ||
    !isHex(values.expectedRepositoryIdentity, 64) ||
    values.reviewBinding !== SIX_BINDING
  )
    fail("ACTIVATION_CLI_INVALID");
  return values;
}

function validatePacket(bytes, cli) {
  const text = bytes.toString("utf8");
  if (
    bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) ||
    text !== text.normalize("NFC") ||
    text.includes("\r") ||
    Buffer.from(text, "utf8").length !== bytes.length
  )
    fail("ACTIVATION_PACKET_INVALID");
  let packet;
  try {
    packet = JSON.parse(text);
  } catch {
    fail("ACTIVATION_PACKET_INVALID");
  }
  if (text !== `${JSON.stringify(packet, null, 2)}\n`) fail("ACTIVATION_PACKET_INVALID");
  if (JSON.stringify(packet) !== JSON.stringify(EXPECTED_PACKET)) fail("ACTIVATION_PACKET_INVALID");
  if (
    packet.activationBundleBinding.reviewBinding !== cli.reviewBinding ||
    packet.activationBundleBinding.reviewBinding !== SIX_BINDING ||
    packet.executionBinding.executionCheckoutCommit !== EXECUTION_COMMIT ||
    packet.executionBinding.manifestSha256 !== TEN_MANIFEST_SHA
  )
    fail("ACTIVATION_PACKET_INVALID");
  return packet;
}

function readBoundedHeld(platform, path, cap, reason) {
  const link = platform.lstat(path);
  if (!link || !link.isFile() || link.isSymbolicLink() || link.size > cap || link.size <= 0)
    fail(reason);
  const handle = platform.openFileReadOnly(path);
  const before = platform.fstatBigInt(handle);
  const bytes = platform.readHeldFile(handle, cap);
  const after = platform.fstatBigInt(handle);
  if (
    !before.isFile() ||
    !after.isFile() ||
    !sameIdentity(statIdentity(before), statIdentity(after))
  ) {
    platform.close(handle);
    fail(reason);
  }
  const finalPath = platform.realpathNative(path);
  return {
    path,
    handle,
    bytes,
    identity: statIdentity(after),
    finalPath,
    finalPathSha256: sha256(Buffer.from(normalizePath(finalPath), "utf8")),
    sha256: sha256(bytes),
    gitBlobSha1: gitBlob(bytes),
  };
}

function holdDirectory(platform, path, reason) {
  const link = platform.lstat(path);
  if (!link?.isDirectory() || link.isSymbolicLink()) fail(reason);
  const handle = platform.openDirectoryReadOnly(path);
  const before = platform.fstatBigInt(handle);
  const finalPath = platform.realpathNative(path);
  const fresh = platform.openDirectoryReadOnly(path);
  try {
    const after = platform.fstatBigInt(handle);
    const reached = platform.fstatBigInt(fresh);
    if (
      !before.isDirectory() ||
      !after.isDirectory() ||
      !reached.isDirectory() ||
      before.dev === 0n ||
      before.ino === 0n ||
      !sameIdentity(statIdentity(before), statIdentity(after)) ||
      !sameIdentity(statIdentity(after), statIdentity(reached))
    )
      fail(reason);
    return {
      path,
      handle,
      identity: statIdentity(after),
      finalPath,
      finalPathSha256: sha256(Buffer.from(normalizePath(finalPath), "utf8")),
    };
  } catch (error) {
    platform.close(handle);
    throw error;
  } finally {
    platform.close(fresh);
  }
}

function reopenAndCompareDirectory(platform, held, reason, consumed = false) {
  let fresh;
  try {
    const link = platform.lstat(held.path);
    if (!link?.isDirectory() || link.isSymbolicLink()) fail(reason, consumed);
    fresh = platform.openDirectoryReadOnly(held.path);
    const stat = platform.fstatBigInt(fresh);
    const finalPathSha256 = sha256(
      Buffer.from(normalizePath(platform.realpathNative(held.path)), "utf8"),
    );
    if (
      !stat.isDirectory() ||
      !sameIdentity(statIdentity(stat), held.identity) ||
      finalPathSha256 !== held.finalPathSha256
    )
      fail(reason, consumed);
  } catch (error) {
    if (error instanceof ActivationFailure) throw error;
    fail(reason, consumed);
  } finally {
    if (fresh !== undefined) platform.close(fresh);
  }
}

function reopenAndCompareFile(platform, held, reason, consumed = false, withBlob = true) {
  let fresh;
  try {
    const link = platform.lstat(held.path);
    if (!link?.isFile() || link.isSymbolicLink() || link.size !== Number(held.identity.size))
      fail(reason, consumed);
    fresh = platform.openFileReadOnly(held.path);
    const before = platform.fstatBigInt(fresh);
    const bytes = platform.readHeldFile(fresh, Math.max(1, Number(held.identity.size)));
    const after = platform.fstatBigInt(fresh);
    const finalPathSha256 = sha256(
      Buffer.from(normalizePath(platform.realpathNative(held.path)), "utf8"),
    );
    if (
      !before.isFile() ||
      !after.isFile() ||
      !sameIdentity(statIdentity(before), held.identity) ||
      !sameIdentity(statIdentity(after), held.identity) ||
      finalPathSha256 !== held.finalPathSha256 ||
      sha256(bytes) !== held.sha256 ||
      (withBlob && gitBlob(bytes) !== held.gitBlobSha1)
    )
      fail(reason, consumed);
  } catch (error) {
    if (error instanceof ActivationFailure) throw error;
    fail(reason, consumed);
  } finally {
    if (fresh !== undefined) platform.close(fresh);
  }
}

function holdActivationBundle(platform, activationRoot, cli) {
  const held = [];
  try {
    const rows = [];
    for (const relativePath of SIX_PATHS) {
      const expectedPath = resolve(activationRoot, relativePath);
      const lexical = relative(activationRoot, expectedPath).replaceAll("\\", "/");
      if (lexical !== relativePath || lexical.startsWith("../") || isAbsolute(lexical))
        fail("ACTIVATION_MANIFEST_INVALID");
      const file = readBoundedHeld(
        platform,
        expectedPath,
        2_000_000,
        "ACTIVATION_MANIFEST_INVALID",
      );
      held.push(file);
      if (normalizePath(file.finalPath) !== normalizePath(expectedPath))
        fail("ACTIVATION_MANIFEST_INVALID");
      rows.push(
        Buffer.from(
          `${relativePath}\0${file.bytes.length}\0${file.sha256}\0${file.gitBlobSha1}\n`,
          "utf8",
        ),
      );
    }
    const manifestBytes = Buffer.concat(rows);
    const manifestSha256 = sha256(manifestBytes);
    if (manifestSha256 !== cli.activationManifestSha256) fail("ACTIVATION_MANIFEST_INVALID");
    const packet = held[SIX_PATHS.indexOf(PACKET_PATH)];
    if (
      !packet ||
      packet.sha256 !== cli.activationPacketSha256 ||
      packet.gitBlobSha1 !== cli.activationPacketGitBlobSha1
    )
      fail("ACTIVATION_PACKET_INVALID");
    const packetObject = validatePacket(packet.bytes, cli);
    if (
      packetObject.activationBundleBinding.pathCount !== SIX_PATHS.length ||
      JSON.stringify(packetObject.activationBundleBinding.paths) !== JSON.stringify(SIX_PATHS)
    )
      fail("ACTIVATION_MANIFEST_INVALID");
    return { held, rows, manifestBytes, manifestSha256, packet, packetObject };
  } catch (error) {
    for (let index = held.length - 1; index >= 0; index -= 1) platform.close(held[index].handle);
    throw error;
  }
}

function revalidateActivationBundle(platform, bundle, reason, consumed) {
  for (const file of bundle.held) reopenAndCompareFile(platform, file, reason, consumed, true);
}

function parseControlLine(bytes, prefix, reason) {
  if (
    bytes.length > MAX_GIT_CONTROL_BYTES ||
    bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))
  )
    fail(reason);
  const text = bytes.toString("utf8");
  if (text !== text.normalize("NFC") || text.includes("\r") || text.includes("\0")) fail(reason);
  const lines = text.split("\n");
  if (lines.length !== 2 || lines[1] !== "" || !lines[0].startsWith(prefix)) fail(reason);
  const value = lines[0].slice(prefix.length);
  if (value.length === 0) fail(reason);
  return value;
}

function openRepository(platform, worktreeRoot, expectedHead) {
  const files = [];
  const directories = [];
  try {
    const worktree = holdDirectory(platform, worktreeRoot, "ACTIVATION_GIT_TOPOLOGY_INVALID");
    directories.push(worktree);
    if (normalizePath(worktree.finalPath) !== normalizePath(resolve(worktreeRoot)))
      fail("ACTIVATION_GIT_TOPOLOGY_INVALID");
    const gitFile = readBoundedHeld(
      platform,
      join(worktreeRoot, ".git"),
      MAX_GIT_CONTROL_BYTES,
      "ACTIVATION_GIT_TOPOLOGY_INVALID",
    );
    files.push(gitFile);
    if (normalizePath(gitFile.finalPath) !== normalizePath(join(worktree.finalPath, ".git")))
      fail("ACTIVATION_GIT_TOPOLOGY_INVALID");
    const gitdirText = parseControlLine(
      gitFile.bytes,
      "gitdir: ",
      "ACTIVATION_GIT_TOPOLOGY_INVALID",
    );
    const gitdir = resolve(worktreeRoot, gitdirText);
    const gitdirHeld = holdDirectory(platform, gitdir, "ACTIVATION_GIT_TOPOLOGY_INVALID");
    directories.push(gitdirHeld);
    if (normalizePath(gitdirHeld.finalPath) !== normalizePath(gitdir))
      fail("ACTIVATION_GIT_TOPOLOGY_INVALID");
    const commonFile = readBoundedHeld(
      platform,
      join(gitdir, "commondir"),
      MAX_GIT_CONTROL_BYTES,
      "ACTIVATION_GIT_TOPOLOGY_INVALID",
    );
    files.push(commonFile);
    if (
      normalizePath(commonFile.finalPath) !== normalizePath(join(gitdirHeld.finalPath, "commondir"))
    )
      fail("ACTIVATION_GIT_TOPOLOGY_INVALID");
    const commonText = parseControlLine(commonFile.bytes, "", "ACTIVATION_GIT_TOPOLOGY_INVALID");
    const commonDir = resolve(gitdir, commonText);
    const commonHeld = holdDirectory(platform, commonDir, "ACTIVATION_GIT_TOPOLOGY_INVALID");
    directories.push(commonHeld);
    const headFile = readBoundedHeld(
      platform,
      join(gitdir, "HEAD"),
      MAX_GIT_CONTROL_BYTES,
      "ACTIVATION_GIT_TOPOLOGY_INVALID",
    );
    files.push(headFile);
    if (normalizePath(headFile.finalPath) !== normalizePath(join(gitdirHeld.finalPath, "HEAD")))
      fail("ACTIVATION_GIT_TOPOLOGY_INVALID");
    if (headFile.bytes.toString("utf8") !== `${expectedHead}\n`)
      fail("ACTIVATION_GIT_TOPOLOGY_INVALID");
    if (
      normalizePath(dirname(gitdirHeld.finalPath)) !==
        normalizePath(join(commonHeld.finalPath, "worktrees")) ||
      normalizePath(commonHeld.finalPath) !== normalizePath(commonDir) ||
      worktree.identity.dev !== gitdirHeld.identity.dev ||
      gitdirHeld.identity.dev !== commonHeld.identity.dev
    )
      fail("ACTIVATION_GIT_TOPOLOGY_INVALID");
    const identityBytes = Buffer.from(
      `${COMMON_ID_DOMAIN}\n${BigInt.asUintN(64, commonHeld.identity.dev).toString(16)}\n${BigInt.asUintN(128, commonHeld.identity.ino).toString(16)}\n${commonHeld.finalPathSha256}\n`,
      "utf8",
    );
    return Object.freeze({
      worktreeRoot,
      worktree,
      gitdir,
      gitdirHeld,
      commonDir,
      commonHandle: commonHeld.handle,
      commonHeld,
      commonIdentity: commonHeld.identity,
      files,
      directories,
      identitySha256: sha256(identityBytes),
      handles: [...directories.map((entry) => entry.handle), ...files.map((entry) => entry.handle)],
    });
  } catch (error) {
    const handles = [
      ...directories.map((entry) => entry.handle),
      ...files.map((entry) => entry.handle),
    ];
    for (let index = handles.length - 1; index >= 0; index -= 1) {
      try {
        platform.close(handles[index]);
      } catch {}
    }
    throw error;
  }
}

function revalidateRepository(platform, repository, reason, consumed) {
  for (const directory of repository.directories)
    reopenAndCompareDirectory(platform, directory, reason, consumed);
  for (const file of repository.files) reopenAndCompareFile(platform, file, reason, consumed, true);
}

function establishTransaction(platform, repository) {
  const held = [];
  let currentPath = repository.commonDir;
  let anyMkdirSideEffect = false;
  const revalidateExisting = (reason, consumed) => {
    reopenAndCompareDirectory(platform, repository.commonHeld, reason, consumed);
    for (const entry of held) reopenAndCompareDirectory(platform, entry, reason, consumed);
  };
  try {
    for (let index = 0; index < TRANSACTION_SEGMENTS.length; index += 1) {
      const segment = TRANSACTION_SEGMENTS[index];
      const target = join(currentPath, segment);
      revalidateExisting(
        anyMkdirSideEffect
          ? "ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD"
          : "ACTIVATION_TRANSACTION_PATH_IDENTITY_INVALID",
        anyMkdirSideEffect,
      );
      let existing = null;
      try {
        existing = platform.lstat(target);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      if (existing) {
        if (index === TRANSACTION_SEGMENTS.length - 1)
          fail("ACTIVATION_TRANSACTION_ALREADY_CONSUMED");
        if (!existing.isDirectory() || existing.isSymbolicLink())
          fail(
            anyMkdirSideEffect
              ? "ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD"
              : "ACTIVATION_TRANSACTION_PATH_IDENTITY_INVALID",
            anyMkdirSideEffect,
          );
      } else {
        revalidateExisting(
          anyMkdirSideEffect
            ? "ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD"
            : "ACTIVATION_TRANSACTION_PATH_IDENTITY_INVALID",
          anyMkdirSideEffect,
        );
        platform.mkdirNonrecursive(target);
        anyMkdirSideEffect = true;
      }
      try {
        revalidateExisting("ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD", true);
        const created = holdDirectory(
          platform,
          target,
          "ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD",
        );
        if (
          created.identity.dev !== repository.commonIdentity.dev ||
          normalizePath(dirname(created.finalPath)) !==
            normalizePath(held.at(-1)?.finalPath ?? repository.commonHeld.finalPath)
        ) {
          platform.close(created.handle);
          fail("ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD", true);
        }
        reopenAndCompareDirectory(
          platform,
          created,
          "ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD",
          true,
        );
        held.push(created);
        currentPath = target;
      } catch (error) {
        if (anyMkdirSideEffect && !(error instanceof ActivationFailure))
          fail("ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD", true);
        throw error;
      }
    }
    return { path: currentPath, held, consumed: true };
  } catch (error) {
    for (let index = held.length - 1; index >= 0; index -= 1) platform.close(held[index].handle);
    if (anyMkdirSideEffect && !(error instanceof ActivationFailure && error.consumed))
      fail("ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD", true);
    throw error;
  }
}

function revalidateTransactionChain(platform, repository, transaction) {
  reopenAndCompareDirectory(
    platform,
    repository.commonHeld,
    "ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD",
    true,
  );
  for (const entry of transaction.held)
    reopenAndCompareDirectory(
      platform,
      entry,
      "ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD",
      true,
    );
}

function canonicalWrite(platform, directoryHandle, path, value, cap) {
  const bytes = canonicalCompact(value);
  if (bytes.length > cap || bytes.toString("utf8") !== bytes.toString("utf8").normalize("NFC"))
    fail("ACTIVATION_INTERNAL_FAILURE_HOLD", true);
  const handle = platform.openFileExclusive(path);
  try {
    platform.writeAll(handle, bytes);
    platform.fsyncFile(handle);
  } finally {
    platform.close(handle);
  }
  platform.fsyncDirectory(directoryHandle);
  const held = readBoundedHeld(platform, path, cap, "ACTIVATION_INTERNAL_FAILURE_HOLD");
  try {
    if (!held.bytes.equals(bytes)) fail("ACTIVATION_INTERNAL_FAILURE_HOLD", true);
  } finally {
    platform.close(held.handle);
  }
  return bytes;
}

const isSafeIntegerInRange = (value, minimum, maximum) =>
  Number.isSafeInteger(value) && value >= minimum && value <= maximum;
const isNullableSafeIntegerInRange = (value, minimum, maximum) =>
  value === null || isSafeIntegerInRange(value, minimum, maximum);
const isHex64OrNull = (value) => value === null || isHex(value, 64);
const isBooleanOrNull = (value) => value === null || typeof value === "boolean";

function validateCompleteInnerReceipt(receipt) {
  if (
    receipt.completedFixtureCount !== 39 ||
    receipt.compilerProcessCount !== 0 ||
    receipt.fixtureProcessCount !== 0 ||
    receipt.cleanupStepCount !== 23 ||
    !isHex(receipt.fixtureEvidenceSha256, 64) ||
    !isHex(receipt.publicTracePinsSha256, 64) ||
    !isHex(receipt.ownershipLedgerPreCleanupSha256, 64) ||
    !isHex(receipt.ownershipLedgerSha256, 64) ||
    !isHex(receipt.cleanupSha256, 64) ||
    receipt.adapterSessionClosed !== true ||
    receipt.networkEvidenceMode !== "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1" ||
    receipt.networkMeasurementComplete !== true ||
    receipt.networkBaselineOwnerCount !== 2 ||
    receipt.networkWorkOwnerCount !== 40 ||
    receipt.networkOwnerCount !== 42 ||
    receipt.networkBaselineOwnerCount + receipt.networkWorkOwnerCount !==
      receipt.networkOwnerCount ||
    receipt.networkWorkOwnerCount - receipt.completedFixtureCount !== 1 ||
    !isSafeIntegerInRange(receipt.networkObservationCount, 1, Number.MAX_SAFE_INTEGER) ||
    !isSafeIntegerInRange(receipt.networkMaximumGapMicros, 0, 10_000) ||
    receipt.networkEventCount !== 0 ||
    receipt.retainedArtifactCount !== 0 ||
    receipt.globalMutationCount !== 0 ||
    receipt.manifestFinalRevalidated !== true ||
    !Number.isSafeInteger(receipt.networkObservationCount * 4)
  )
    fail("ACTIVATION_INNER_RECEIPT_INVALID", true);
  if (
    (receipt.state === "SYNTHETIC_TEST_CLEAN" && receipt.primaryFailureReason !== null) ||
    (receipt.state === "SYNTHETIC_TEST_FAILED_CLEAN" &&
      !TRANSACTION_INNER_REASONS.includes(receipt.primaryFailureReason))
  )
    fail("ACTIVATION_INNER_RECEIPT_INVALID", true);
}

function validateCleanupHoldInnerReceipt(receipt) {
  if (
    !CLOSED_INNER_REASONS.includes(receipt.primaryFailureReason) ||
    !isSafeIntegerInRange(receipt.completedFixtureCount, 0, 39) ||
    !isNullableSafeIntegerInRange(receipt.compilerProcessCount, 0, 1) ||
    !isNullableSafeIntegerInRange(receipt.fixtureProcessCount, 0, 39) ||
    !isNullableSafeIntegerInRange(receipt.cleanupStepCount, 0, 23) ||
    !isHex64OrNull(receipt.fixtureEvidenceSha256) ||
    !isHex64OrNull(receipt.publicTracePinsSha256) ||
    !isHex64OrNull(receipt.ownershipLedgerPreCleanupSha256) ||
    !isHex64OrNull(receipt.ownershipLedgerSha256) ||
    !isHex64OrNull(receipt.cleanupSha256) ||
    !isBooleanOrNull(receipt.adapterSessionClosed) ||
    ![null, "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1"].includes(receipt.networkEvidenceMode) ||
    !isBooleanOrNull(receipt.networkMeasurementComplete) ||
    !isNullableSafeIntegerInRange(receipt.networkBaselineOwnerCount, 0, 2) ||
    !isNullableSafeIntegerInRange(receipt.networkWorkOwnerCount, 0, 40) ||
    !isNullableSafeIntegerInRange(receipt.networkOwnerCount, 0, 42) ||
    !isNullableSafeIntegerInRange(receipt.networkObservationCount, 0, Number.MAX_SAFE_INTEGER) ||
    !isNullableSafeIntegerInRange(receipt.networkMaximumGapMicros, 0, Number.MAX_SAFE_INTEGER) ||
    !isNullableSafeIntegerInRange(receipt.networkEventCount, 0, Number.MAX_SAFE_INTEGER) ||
    !isNullableSafeIntegerInRange(receipt.retainedArtifactCount, 0, 4096) ||
    !isNullableSafeIntegerInRange(receipt.globalMutationCount, 0, 1) ||
    !isBooleanOrNull(receipt.manifestFinalRevalidated)
  )
    fail("ACTIVATION_INNER_RECEIPT_INVALID", true);
}

function projectInnerNumericalEvidence(receipt) {
  if (!receipt || receipt.state === "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD")
    return NULL_NUMERICAL_PROJECTION;
  const projection = {
    innerCompletedFixtureCount: receipt.completedFixtureCount,
    innerDerivedLaunchedCompilerProcessCount:
      receipt.networkWorkOwnerCount - receipt.completedFixtureCount,
    innerResidualCompilerProcessCount: receipt.compilerProcessCount,
    innerResidualFixtureProcessCount: receipt.fixtureProcessCount,
    innerCleanupStepCount: receipt.cleanupStepCount,
    innerNetworkBaselineOwnerCount: receipt.networkBaselineOwnerCount,
    innerNetworkWorkOwnerCount: receipt.networkWorkOwnerCount,
    innerNetworkOwnerCount: receipt.networkOwnerCount,
    innerNetworkObservationCount: receipt.networkObservationCount,
    innerNetworkMaximumGapMicros: receipt.networkMaximumGapMicros,
    innerDerivedNetworkTableIterationCount: receipt.networkObservationCount * 4,
    innerNetworkEventCount: receipt.networkEventCount,
    innerRetainedArtifactCount: receipt.retainedArtifactCount,
  };
  exactKeys(projection, NUMERICAL_PROJECTION_KEYS, "ACTIVATION_INNER_RECEIPT_INVALID");
  return Object.freeze(projection);
}

function parseInnerReceipt(stdout, stderr) {
  if (!Buffer.isBuffer(stdout) || !Buffer.isBuffer(stderr) || stderr.length !== 0)
    fail("ACTIVATION_CHILD_OUTPUT_INVALID", true);
  if (stdout.length <= 0 || stdout.length > MAX_STDOUT_BYTES)
    fail("ACTIVATION_CHILD_OUTPUT_INVALID", true);
  const text = stdout.toString("utf8");
  if (text !== text.normalize("NFC") || text.includes("\r") || !text.endsWith("\n"))
    fail("ACTIVATION_CHILD_OUTPUT_INVALID", true);
  if (text.slice(0, -1).includes("\n") || Buffer.from(text, "utf8").length !== stdout.length)
    fail("ACTIVATION_CHILD_OUTPUT_INVALID", true);
  let receipt;
  try {
    receipt = JSON.parse(text);
  } catch {
    fail("ACTIVATION_INNER_RECEIPT_INVALID", true);
  }
  exactKeys(receipt, INNER_RECEIPT_KEYS, "ACTIVATION_INNER_RECEIPT_INVALID");
  exactKeys(
    receipt.authority,
    ["externalActionAuthorized", "downloadAuthorityPresent", "executionAuthorityPresent", "state"],
    "ACTIVATION_INNER_RECEIPT_INVALID",
  );
  if (
    receipt.schemaVersion !== 1 ||
    receipt.mode !== "CONTRACT_SELF_TEST_V1_13_6" ||
    receipt.contractVersion !== "R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.6" ||
    receipt.reviewBinding !== TEN_BINDING ||
    receipt.candidateManifestSha256 !== TEN_MANIFEST_SHA ||
    ![
      "SYNTHETIC_TEST_CLEAN",
      "SYNTHETIC_TEST_FAILED_CLEAN",
      "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD",
    ].includes(receipt.state) ||
    receipt.authority.externalActionAuthorized !== false ||
    receipt.authority.downloadAuthorityPresent !== false ||
    receipt.authority.executionAuthorityPresent !== false ||
    receipt.authority.state !== "PRECONDITION_HOLD_NO_GET"
  )
    fail("ACTIVATION_INNER_RECEIPT_INVALID", true);
  if (receipt.state === "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD")
    validateCleanupHoldInnerReceipt(receipt);
  else validateCompleteInnerReceipt(receipt);
  return receipt;
}

function buildOuterReceipt(context, outcome) {
  exactKeys(
    outcome.numericalProjection,
    NUMERICAL_PROJECTION_KEYS,
    "ACTIVATION_INTERNAL_FAILURE_HOLD",
  );
  const receipt = {
    schemaVersion: 1,
    receiptId: RECEIPT_ID,
    transactionId: TRANSACTION_ID,
    transactionIdSha256: TRANSACTION_SHA,
    state: outcome.state,
    reason: outcome.reason,
    activationMergeCommit: context.cli.activationMergeCommit,
    executionCheckoutCommit: EXECUTION_COMMIT,
    activationPacketSha256: context.cli.activationPacketSha256,
    activationPacketGitBlobSha1: context.cli.activationPacketGitBlobSha1,
    activationManifestSha256: context.activationManifestSha256,
    reviewBinding: SIX_BINDING,
    expectedRepositoryCommonDirIdentitySha256: context.cli.expectedRepositoryIdentity,
    observedRepositoryCommonDirIdentitySha256: context.observedRepositoryIdentity,
    nodeImageEvidence: context.nodeEvidence,
    adapterImageEvidence: context.adapterEvidence,
    innerReceiptByteCount: outcome.innerBytes?.length ?? null,
    innerReceiptSha256: outcome.innerBytes ? sha256(outcome.innerBytes) : null,
    innerState: outcome.inner?.state ?? null,
    innerPrimaryFailureReason: outcome.inner?.primaryFailureReason ?? null,
    ...outcome.numericalProjection,
    childSpawnAttempted: outcome.childSpawnAttempted,
    childExitCode: outcome.childExitCode,
    childSignal: outcome.childSignal,
    childTimedOut: outcome.childTimedOut,
    stdoutByteCount: outcome.stdoutByteCount,
    stderrByteCount: outcome.stderrByteCount,
    cleanupState: outcome.cleanupState,
    residueState: outcome.residueState,
    consumptionMarkerState: outcome.markerState,
    outerEvidenceFileCount: outcome.outerEvidenceFileCount,
    outerValidEvidenceFileCount: outcome.outerValidEvidenceFileCount,
    outerEvidenceRetention: "PERMANENT_DO_NOT_DELETE_REPAIR_REUSE",
    authority: {
      externalActionAuthorized: false,
      downloadAuthorityPresent: false,
      executionAuthorityPresent: false,
      state: "PRECONDITION_HOLD_NO_GET",
    },
  };
  exactKeys(receipt, OUTER_RECEIPT_KEYS, "ACTIVATION_INTERNAL_FAILURE_HOLD");
  return receipt;
}

function mapInnerOutcome(inner, child) {
  const common = {
    inner,
    innerBytes: child.stdout,
    numericalProjection: projectInnerNumericalEvidence(inner),
    childSpawnAttempted: true,
    childExitCode: child.exitCode,
    childSignal: child.signal ?? null,
    childTimedOut: false,
    stdoutByteCount: child.stdout.length,
    stderrByteCount: child.stderr.length,
    markerState: "VALID_CANONICAL",
    outerEvidenceFileCount: 2,
    outerValidEvidenceFileCount: 2,
  };
  if (inner.state === "SYNTHETIC_TEST_CLEAN" && child.exitCode === 0)
    return {
      ...common,
      state: "OUTER_SYNTHETIC_TEST_CLEAN",
      reason: null,
      cleanupState: "INNER_CLEAN_CONFIRMED",
      residueState: "ZERO_CONFIRMED",
    };
  if (inner.state === "SYNTHETIC_TEST_FAILED_CLEAN" && child.exitCode === 0)
    return {
      ...common,
      state: "OUTER_SYNTHETIC_TEST_FAILED_CLEAN",
      reason: inner.primaryFailureReason,
      cleanupState: "INNER_CLEAN_CONFIRMED",
      residueState: "ZERO_CONFIRMED",
    };
  if (inner.state === "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD" && child.exitCode === 2)
    return {
      ...common,
      state: "OUTER_SYNTHETIC_TEST_FAILED_CLEANUP_HOLD",
      reason: "ACTIVATION_INNER_CLEANUP_HOLD",
      cleanupState: "INNER_CLEANUP_HOLD",
      residueState: "NONZERO_OR_UNKNOWN_HOLD",
    };
  fail("ACTIVATION_INNER_RECEIPT_INVALID", true);
}

function buildChildInvocation(executionRoot) {
  return Object.freeze({
    executable: process.execPath,
    args: Object.freeze([
      join(executionRoot, ADAPTER_PATH),
      INNER_MODE,
      `--reviewed-manifest-sha256=${TEN_MANIFEST_SHA}`,
      `--review-binding=${TEN_BINDING}`,
    ]),
    options: Object.freeze({
      cwd: executionRoot,
      shell: false,
      windowsHide: true,
      stdio: Object.freeze(["ignore", "pipe", "pipe"]),
      env: Object.freeze({ SystemRoot: "C:\\Windows", WINDIR: "C:\\Windows" }),
    }),
  });
}

function unknownOutcome(reason, child = {}) {
  return {
    state: "OUTER_ATTEMPT_CONSUMED_RESULT_UNKNOWN_HOLD",
    reason,
    inner: null,
    innerBytes: null,
    numericalProjection: NULL_NUMERICAL_PROJECTION,
    childSpawnAttempted: child.childSpawnAttempted ?? false,
    childExitCode: child.exitCode ?? null,
    childSignal: child.signal ?? null,
    childTimedOut: child.timedOut ?? false,
    stdoutByteCount: child.stdout?.length ?? 0,
    stderrByteCount: child.stderr?.length ?? 0,
    cleanupState: "INNER_CLEANUP_UNKNOWN",
    residueState: "NONZERO_OR_UNKNOWN_HOLD",
    markerState: "VALID_CANONICAL",
    outerEvidenceFileCount: 2,
    outerValidEvidenceFileCount: 2,
  };
}

function classifyChildResult(child) {
  if (child.spawnError) return unknownOutcome("ACTIVATION_CHILD_SPAWN_FAILED");
  if (child.timedOut)
    return unknownOutcome("ACTIVATION_CHILD_TIMEOUT_HOLD", {
      ...child,
      childSpawnAttempted: true,
      timedOut: true,
    });
  if (child.overflow)
    return unknownOutcome("ACTIVATION_CHILD_OUTPUT_INVALID", {
      ...child,
      childSpawnAttempted: true,
    });
  try {
    const inner = parseInnerReceipt(child.stdout, child.stderr);
    return mapInnerOutcome(inner, child);
  } catch (error) {
    if (error instanceof ActivationFailure)
      return unknownOutcome(error.reason, { ...child, childSpawnAttempted: true });
    return unknownOutcome("ACTIVATION_INTERNAL_FAILURE_HOLD", {
      ...child,
      childSpawnAttempted: true,
    });
  }
}

function revalidateExecutionBoundary(
  platform,
  activation,
  execution,
  bundle,
  node,
  adapter,
  transaction,
  reason,
) {
  revalidateRepository(platform, activation, reason, true);
  revalidateRepository(platform, execution, reason, true);
  revalidateActivationBundle(platform, bundle, reason, true);
  reopenAndCompareFile(platform, node, reason, true, false);
  reopenAndCompareFile(platform, adapter, reason, true, true);
  reopenAndCompareDirectory(platform, execution.worktree, reason, true);
  if (
    relative(execution.worktree.finalPath, platform.realpathNative(adapter.path)).replaceAll(
      "\\",
      "/",
    ) !== ADAPTER_PATH
  )
    fail(reason, true);
  revalidateTransactionChain(platform, execution, transaction);
}

function observeChild(child, timeoutMs, caps, timers = { set: setTimeout, clear: clearTimeout }) {
  return new Promise((resolvePromise) => {
    let settled = false;
    let overflow = false;
    let stdoutTotal = 0;
    let stderrTotal = 0;
    const stdoutChunks = [];
    const stderrChunks = [];
    const capture = (chunks, cap, current, chunk) => {
      const bytes = Buffer.from(chunk);
      const next = Math.min(cap + 1, current + bytes.length);
      const remaining = Math.max(0, cap - current);
      if (remaining > 0) chunks.push(bytes.subarray(0, remaining));
      if (current + bytes.length > cap) overflow = true;
      return next;
    };
    const onStdout = (chunk) => {
      stdoutTotal = capture(stdoutChunks, caps.stdout, stdoutTotal, chunk);
    };
    const onStderr = (chunk) => {
      stderrTotal = capture(stderrChunks, caps.stderr, stderrTotal, chunk);
    };
    const remove = () => {
      child.stdout?.off("data", onStdout);
      child.stderr?.off("data", onStderr);
      child.off("close", onClose);
      child.off("error", onError);
    };
    const settle = (value, timeout = false) => {
      if (settled) return;
      settled = true;
      timers.clear(timer);
      remove();
      if (timeout) {
        child.stdout?.destroy();
        child.stderr?.destroy();
        child.unref();
      }
      resolvePromise({
        ...value,
        stdout: Buffer.concat(stdoutChunks),
        stderr: Buffer.concat(stderrChunks),
        overflow,
        stdoutTotal,
        stderrTotal,
      });
    };
    const onClose = (exitCode, signal) =>
      settle({ exitCode, signal, timedOut: false, spawnError: false });
    const onError = () =>
      settle({ exitCode: null, signal: null, timedOut: false, spawnError: true });
    child.stdout?.on("data", onStdout);
    child.stderr?.on("data", onStderr);
    child.once("close", onClose);
    child.once("error", onError);
    const timer = timers.set(
      () => settle({ exitCode: null, signal: null, timedOut: true, spawnError: false }, true),
      timeoutMs,
    );
    timer?.unref?.();
  });
}

function createProductionPlatform() {
  return Object.freeze({
    openFileReadOnly: (path) => openSync(path, "r"),
    openDirectoryReadOnly: (path) => openSync(path, "r"),
    close: (handle) => closeSync(handle),
    fstatBigInt: (handle) => fstatSync(handle, { bigint: true }),
    readHeldFile(handle, cap) {
      const stat = fstatSync(handle);
      if (!stat.isFile() || stat.size <= 0 || stat.size > cap)
        fail("ACTIVATION_INTERNAL_FAILURE_HOLD");
      const bytes = Buffer.alloc(stat.size);
      let offset = 0;
      while (offset < bytes.length) {
        const count = readSync(handle, bytes, offset, bytes.length - offset, offset);
        if (count <= 0) fail("ACTIVATION_INTERNAL_FAILURE_HOLD");
        offset += count;
      }
      return bytes;
    },
    realpathNative: (path) => realpathSync.native(path),
    lstat: (path) => lstatSync(path),
    mkdirNonrecursive: (path) => mkdirSync(path),
    openFileExclusive: (path) => openSync(path, "wx"),
    writeAll(handle, bytes) {
      let offset = 0;
      while (offset < bytes.length) {
        const count = writeSync(handle, bytes, offset, bytes.length - offset);
        if (count <= 0) fail("ACTIVATION_INTERNAL_FAILURE_HOLD", true);
        offset += count;
      }
    },
    fsyncFile: (handle) => fsyncSync(handle),
    fsyncDirectory: (handle) => fsyncSync(handle),
    spawnDirect(executable, args, options) {
      return spawn(executable, args, options);
    },
    waitForExit: observeChild,
    monotonicMilliseconds: () => Number(process.hrtime.bigint() / 1_000_000n),
  });
}

export function createOuterActivationExecutor(inputPlatform) {
  const platform = validatePlatform(inputPlatform);
  return Object.freeze({
    deriveRepositoryIdentity(activationRoot, executionRoot, activationCommit) {
      const activation = openRepository(platform, activationRoot, activationCommit);
      const execution = openRepository(platform, executionRoot, EXECUTION_COMMIT);
      try {
        if (activation.identitySha256 !== execution.identitySha256)
          fail("ACTIVATION_REPOSITORY_IDENTITY_INVALID");
        return activation.identitySha256;
      } finally {
        for (const repository of [execution, activation])
          for (let index = repository.handles.length - 1; index >= 0; index -= 1)
            platform.close(repository.handles[index]);
      }
    },
    async execute({ argv, execArgv, environment, executorPath, activationRoot }) {
      const cli = parseCli(argv, execArgv, executorPath);
      if (
        typeof environment !== "object" ||
        environment === null ||
        FORBIDDEN_OUTER_ENVIRONMENT_KEYS.some((key) => Object.hasOwn(environment, key))
      )
        fail("ACTIVATION_CLI_INVALID");
      const handles = [];
      let activation;
      let execution;
      let transaction;
      let bundle;
      try {
        activation = openRepository(platform, activationRoot, cli.activationMergeCommit);
        execution = openRepository(platform, cli.executionRoot, EXECUTION_COMMIT);
        handles.push(...activation.handles, ...execution.handles);
        if (
          activation.identitySha256 !== cli.expectedRepositoryIdentity ||
          execution.identitySha256 !== cli.expectedRepositoryIdentity
        )
          fail("ACTIVATION_REPOSITORY_IDENTITY_INVALID");
        bundle = holdActivationBundle(platform, activationRoot, cli);
        handles.push(...bundle.held.map((entry) => entry.handle));
        const packetObject = bundle.packetObject;
        const node = readBoundedHeld(
          platform,
          process.execPath,
          100_000_000,
          "ACTIVATION_HOST_IMAGE_INVALID",
        );
        handles.push(node.handle);
        const nodeEvidence = imageEvidence(
          node.bytes,
          platform.fstatBigInt(node.handle),
          node.finalPath,
          false,
        );
        if (
          process.version !== "v24.22.1" ||
          nodeEvidence.byteCount !== packetObject.executorBinding.nodeHost.byteCount ||
          nodeEvidence.sha256 !== packetObject.executorBinding.nodeHost.sha256 ||
          nodeEvidence.finalPathSha256 !==
            packetObject.executorBinding.nodeHost.normalizedImagePathSha256
        )
          fail("ACTIVATION_HOST_IMAGE_INVALID");
        const adapter = readBoundedHeld(
          platform,
          join(cli.executionRoot, ADAPTER_PATH),
          1_000_000,
          "ACTIVATION_ADAPTER_IMAGE_INVALID",
        );
        handles.push(adapter.handle);
        if (relative(cli.executionRoot, adapter.finalPath).replaceAll("\\", "/") !== ADAPTER_PATH)
          fail("ACTIVATION_ADAPTER_IMAGE_INVALID");
        const adapterEvidence = imageEvidence(
          adapter.bytes,
          platform.fstatBigInt(adapter.handle),
          adapter.finalPath,
          true,
        );
        if (
          adapterEvidence.byteCount !== ADAPTER_BYTE_COUNT ||
          adapterEvidence.sha256 !== ADAPTER_SHA256 ||
          adapterEvidence.gitBlobSha1 !== ADAPTER_GIT_BLOB_SHA1
        )
          fail("ACTIVATION_ADAPTER_IMAGE_INVALID");
        transaction = establishTransaction(platform, execution);
        handles.push(...transaction.held.map((entry) => entry.handle));
        const marker = {
          schemaVersion: 1,
          transactionId: TRANSACTION_ID,
          transactionIdSha256: TRANSACTION_SHA,
          state: "ATTEMPT_CONSUMED_PRESPAWN",
          expectedRepositoryCommonDirIdentitySha256: cli.expectedRepositoryIdentity,
          observedRepositoryCommonDirIdentitySha256: execution.identitySha256,
          activationPacketSha256: cli.activationPacketSha256,
          activationPacketGitBlobSha1: cli.activationPacketGitBlobSha1,
          activationManifestSha256: bundle.manifestSha256,
          activationMergeCommit: cli.activationMergeCommit,
          executionCheckoutCommit: EXECUTION_COMMIT,
        };
        const txHandle = transaction.held.at(-1).handle;
        revalidateTransactionChain(platform, execution, transaction);
        let markerState = "VALID_CANONICAL";
        try {
          canonicalWrite(
            platform,
            txHandle,
            join(transaction.path, MARKER_NAME),
            marker,
            MAX_MARKER_BYTES,
          );
        } catch {
          try {
            const markerLink = platform.lstat(join(transaction.path, MARKER_NAME));
            if (markerLink) markerState = "PRESENT_INVALID_OR_PARTIAL_HOLD";
          } catch {}
          const outcome = {
            state: "OUTER_ATTEMPT_CONSUMED_MARKER_INCOMPLETE_HOLD",
            reason:
              markerState === "VALID_CANONICAL"
                ? "ACTIVATION_CONSUMPTION_MARKER_WRITE_FAILED"
                : "ACTIVATION_CONSUMPTION_MARKER_INVALID",
            inner: null,
            innerBytes: null,
            numericalProjection: NULL_NUMERICAL_PROJECTION,
            childSpawnAttempted: false,
            childExitCode: null,
            childSignal: null,
            childTimedOut: false,
            stdoutByteCount: 0,
            stderrByteCount: 0,
            cleanupState: "NOT_SPAWNED",
            residueState: "NOT_APPLICABLE",
            markerState:
              markerState === "VALID_CANONICAL"
                ? "ABSENT_AFTER_DIRECTORY_CONSUMPTION_HOLD"
                : markerState,
            outerEvidenceFileCount: markerState === "VALID_CANONICAL" ? 1 : 2,
            outerValidEvidenceFileCount: 1,
          };
          const receipt = buildOuterReceipt(
            {
              cli,
              nodeEvidence,
              adapterEvidence,
              activationManifestSha256: bundle.manifestSha256,
              observedRepositoryIdentity: execution.identitySha256,
            },
            outcome,
          );
          canonicalWrite(
            platform,
            txHandle,
            join(transaction.path, RECEIPT_NAME),
            receipt,
            MAX_OUTER_RECEIPT_BYTES,
          );
          return receipt;
        }
        let childResult;
        let outcome;
        try {
          revalidateExecutionBoundary(
            platform,
            activation,
            execution,
            bundle,
            node,
            adapter,
            transaction,
            "ACTIVATION_POST_SETTLEMENT_IDENTITY_DRIFT_HOLD",
          );
        } catch {
          outcome = unknownOutcome("ACTIVATION_POST_SETTLEMENT_IDENTITY_DRIFT_HOLD");
        }
        if (!outcome) {
          const invocation = buildChildInvocation(cli.executionRoot);
          try {
            const child = platform.spawnDirect(
              invocation.executable,
              invocation.args,
              invocation.options,
            );
            childResult = await platform.waitForExit(child, OBSERVATION_TIMEOUT_MS, {
              stdout: MAX_STDOUT_BYTES,
              stderr: 0,
            });
          } catch {
            childResult = {
              spawnError: true,
              exitCode: null,
              signal: null,
              timedOut: false,
              stdout: Buffer.alloc(0),
              stderr: Buffer.alloc(0),
            };
          }
          outcome = classifyChildResult(childResult);
          try {
            revalidateExecutionBoundary(
              platform,
              activation,
              execution,
              bundle,
              node,
              adapter,
              transaction,
              "ACTIVATION_POST_SETTLEMENT_IDENTITY_DRIFT_HOLD",
            );
          } catch {
            outcome = unknownOutcome("ACTIVATION_POST_SETTLEMENT_IDENTITY_DRIFT_HOLD", {
              ...childResult,
              childSpawnAttempted: true,
            });
          }
        }
        const receipt = buildOuterReceipt(
          {
            cli,
            nodeEvidence,
            adapterEvidence,
            activationManifestSha256: bundle.manifestSha256,
            observedRepositoryIdentity: execution.identitySha256,
          },
          outcome,
        );
        canonicalWrite(
          platform,
          txHandle,
          join(transaction.path, RECEIPT_NAME),
          receipt,
          MAX_OUTER_RECEIPT_BYTES,
        );
        return receipt;
      } finally {
        for (let index = handles.length - 1; index >= 0; index -= 1) {
          try {
            platform.close(handles[index]);
          } catch {}
        }
      }
    },
  });
}

export const outerActivationTesting = Object.freeze({
  CONTRACT_VERSION,
  PLATFORM_KEYS,
  INNER_RECEIPT_KEYS,
  NUMERICAL_PROJECTION_KEYS,
  TRANSACTION_INNER_REASONS,
  ADAPTER_INNER_REASONS,
  CLOSED_INNER_REASONS,
  OUTER_RECEIPT_KEYS,
  EXPECTED_PACKET,
  SIX_PATHS,
  parseCli,
  normalizePath,
  parseControlLine,
  canonicalCompact,
  gitBlob,
  sha256,
  imageEvidence,
  parseInnerReceipt,
  mapInnerOutcome,
  classifyChildResult,
  unknownOutcome,
  buildChildInvocation,
  buildOuterReceipt,
  validatePacket,
  holdActivationBundle,
  holdDirectory,
  revalidateActivationBundle,
  reopenAndCompareDirectory,
  reopenAndCompareFile,
  openRepository,
  revalidateRepository,
  establishTransaction,
  revalidateTransactionChain,
  canonicalWrite,
  observeChild,
  createProductionPlatform,
  constants: Object.freeze({
    EXECUTION_COMMIT,
    PACKET_PATH,
    TRANSACTION_ID,
    TRANSACTION_SHA,
    TEN_MANIFEST_SHA,
    SIX_BINDING,
    TEN_BINDING,
    OUTER_MODE,
    INNER_MODE,
    MAX_STDOUT_BYTES,
    MAX_OUTER_RECEIPT_BYTES,
    OBSERVATION_TIMEOUT_MS,
  }),
});

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(modulePath)) {
  const executor = createOuterActivationExecutor(createProductionPlatform());
  executor
    .execute({
      argv: process.argv,
      execArgv: process.execArgv,
      environment: process.env,
      executorPath: modulePath,
      activationRoot: resolve(dirname(modulePath), "../.."),
    })
    .then((receipt) => process.stdout.write(canonicalCompact(receipt)))
    .catch((error) => {
      process.stderr.write(
        `${error instanceof ActivationFailure ? error.reason : "ACTIVATION_INTERNAL_FAILURE_HOLD"}\n`,
      );
      process.exitCode = 1;
    });
}
