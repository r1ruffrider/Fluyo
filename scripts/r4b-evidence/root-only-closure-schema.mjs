import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson, parseStrictJson, sha256 } from "./root-only-closure-plan.generator.mjs";

const ROOT = realpathSync(fileURLToPath(new URL("../..", import.meta.url)));
const PRIOR_OUTPUT_BROKER_SOURCE_SHA256 =
  "76d42ad509a4b83757d32df6ca1214eb49d62f07ebf52953fde9e79aa521e691";
const V1_MIGRATION_REASON =
  "Marlon selected 1/A on 2026-11-09: permanently delete the privacy-bearing v1 manifest after exact 8,232-byte and SHA-256 verification; retain no copy, recovery path, content, or future content-reverifiability claim.";
const MIGRATION_PATHS = Object.freeze({
  a3: "scripts/r4b-evidence/root-only-helper-pe-migration-a3.json",
  gaps: "scripts/r4b-evidence/root-only-helper-pe-migration-gaps.json",
  index: "scripts/r4b-evidence/root-only-helper-pe-migration-index.json",
});
const MIGRATION_GAPS = Object.freeze([
  Object.freeze({ id: "V1_CONTENT_UNRECOVERABLE", status: "PERMANENT_NONBLOCKING" }),
  Object.freeze({ id: "V1_CONTENT_NOT_REVERIFIABLE", status: "PERMANENT_NONBLOCKING" }),
  Object.freeze({ id: "ATTEMPT004_AUTHORITY_NOT_FROZEN", status: "OPEN_BLOCKING" }),
  Object.freeze({ id: "ATTEMPT004_BROKER_ONLY_BUILD_NOT_EXECUTED", status: "OPEN_BLOCKING" }),
  Object.freeze({ id: "ATTEMPT004_RESULT_NOT_VALIDATED", status: "OPEN_BLOCKING" }),
]);

export function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a plain object`);
  }
  if (canonicalJson(Object.keys(value)) !== canonicalJson(expected)) {
    throw new Error(`${label} has unknown, missing, or reordered keys`);
  }
}

export function exactStringArray(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} contains duplicates`);
}

function integer(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum)
    throw new Error(`${label} is not a bounded integer`);
}

function sha(value, label, length = 64) {
  if (typeof value !== "string" || !new RegExp(`^[0-9a-f]{${length}}$`, "u").test(value)) {
    throw new Error(`${label} is not a canonical digest`);
  }
}

export function validateOutputBrokerContractShape(contract) {
  exactKeys(
    contract,
    [
      "schema",
      "protocol",
      "evidenceStatus",
      "creditable",
      "frameDomain",
      "sessionIdDomain",
      "artifactDomain",
      "childDomain",
      "publicationDomain",
      "sessionDomain",
      "authorityBinding",
      "source",
      "productionExecutable",
      "testingExecutable",
      "limits",
      "destinationTemplates",
      "spawnPolicies",
      "states",
      "testingBarriers",
    ],
    "output broker contract",
  );
  if (
    contract.schema !== "fluyo:r4b:root-only-output-broker-contract:v1" ||
    contract.protocol !== "ROOT_ONLY_OUTPUT_BROKER_V1" ||
    contract.evidenceStatus !== "NON_EVIDENCE" ||
    contract.creditable !== false
  )
    throw new Error("output broker envelope changed");
  for (const [key, value] of Object.entries({
    frameDomain: "fluyo:r4b:output-broker-frame:v1",
    sessionIdDomain: "fluyo:r4b:output-broker-session-id:v1",
    artifactDomain: "fluyo:r4b:output-broker-artifact:v1",
    childDomain: "fluyo:r4b:output-broker-child:v1",
    publicationDomain: "fluyo:r4b:output-broker-publication:v1",
    sessionDomain: "fluyo:r4b:output-broker-session:v1",
  }))
    if (contract[key] !== value) throw new Error(`output broker ${key} changed`);
  exactKeys(
    contract.authorityBinding,
    [
      "schema",
      "approvedChildFields",
      "trustedParentFields",
      "authorityDigestField",
      "relation",
      "relationVerifier",
      "receiptFields",
    ],
    "output broker authority binding",
  );
  if (
    contract.authorityBinding.schema !== "fluyo:r4b:root-only-output-broker-authority-binding:v1" ||
    canonicalJson(contract.authorityBinding.approvedChildFields) !==
      canonicalJson(["approvedHead", "approvedTree"]) ||
    canonicalJson(contract.authorityBinding.trustedParentFields) !==
      canonicalJson(["trustedParentHead", "trustedParentTree"]) ||
    contract.authorityBinding.authorityDigestField !== "approvedAuthorityDigest" ||
    contract.authorityBinding.relation !== "SOLE_DIRECT_CHILD_AUTHORITY_PATH_ONLY" ||
    contract.authorityBinding.relationVerifier !==
      "scripts/r4b-evidence/root-only-install-authority.mjs#approvedCheckoutState" ||
    canonicalJson(contract.authorityBinding.receiptFields) !==
      canonicalJson([
        "approvedAuthorityDigest",
        "approvedHead",
        "approvedTree",
        "trustedParentHead",
        "trustedParentTree",
      ])
  )
    throw new Error("output broker authority binding changed");
  exactKeys(contract.source, ["path", "mode", "bytes", "sha256"], "output broker source");
  if (
    contract.source.path !== "scripts/r4b-evidence/root-only-output-broker.cs" ||
    contract.source.mode !== "100644"
  )
    throw new Error("output broker source path/mode changed");
  integer(contract.source.bytes, "output broker source bytes", 1);
  sha(contract.source.sha256, "output broker source digest");
  exactKeys(
    contract.productionExecutable,
    ["path", "status", "machine", "subsystem", "sourceSha256"],
    "output broker production executable",
  );
  if (
    contract.productionExecutable.path !== "scripts/r4b-evidence/root-only-output-broker.exe" ||
    !["STALE_REBUILD_REQUIRED", "TRACKED_APPROVED_BUILD"].includes(
      contract.productionExecutable.status,
    ) ||
    contract.productionExecutable.machine !== "AMD64" ||
    contract.productionExecutable.subsystem !== "CONSOLE"
  )
    throw new Error("output broker production executable identity changed");
  sha(
    contract.productionExecutable.sourceSha256,
    "output broker production executable source digest",
  );
  if (
    contract.productionExecutable.status === "STALE_REBUILD_REQUIRED" &&
    (contract.productionExecutable.sourceSha256 !== PRIOR_OUTPUT_BROKER_SOURCE_SHA256 ||
      contract.productionExecutable.sourceSha256 === contract.source.sha256)
  )
    throw new Error("output broker stale production executable binding changed");
  if (
    contract.productionExecutable.status === "TRACKED_APPROVED_BUILD" &&
    contract.productionExecutable.sourceSha256 !== contract.source.sha256
  )
    throw new Error("output broker tracked production executable source binding changed");
  exactKeys(
    contract.testingExecutable,
    ["path", "sourcePath", "status"],
    "output broker testing executable",
  );
  if (contract.testingExecutable.status !== "PENDING_APPROVED_BUILD")
    throw new Error("output broker testing executable prematurely changed");
  const limitKeys = [
    "maximumFrameBytes",
    "maximumRequestBodyBytes",
    "maximumWriteBytes",
    "maximumCommands",
    "maximumDirectories",
    "maximumFiles",
    "maximumSegmentBytes",
    "maximumDepth",
    "maximumLogBytes",
    "maximumReceiptBytes",
    "maximumPassBytes",
    "maximumSessionReceiptBytes",
    "maximumInteractiveStdoutBytes",
    "maximumInteractiveStderrBytes",
    "controllerTimeoutMs",
    "handoffTimeoutMs",
    "idleTimeoutMs",
    "jobCloseTimeoutMs",
    "testingBarrierTimeoutMs",
  ];
  exactKeys(contract.limits, limitKeys, "output broker limits");
  for (const [key, value] of Object.entries(contract.limits))
    integer(value, `output broker ${key}`, 1);
  exactKeys(
    contract.destinationTemplates,
    [
      "CTRL_USER_CONFIG",
      "CTRL_GLOBAL_CONFIG",
      "CTRL_CAPTURE_LOG",
      "CTRL_NPM_LOG_DIR",
      "CTRL_INSTALL_RECEIPT",
      "HANDOFF_TERMINAL",
      "HANDOFF_PASS_PENDING",
      "HANDOFF_PASS_FINAL",
    ],
    "output broker destinations",
  );
  exactKeys(contract.spawnPolicies, ["CONTROLLER", "HANDOFF"], "output broker spawn policies");
  if (
    contract.spawnPolicies.CONTROLLER !== "NPM_CI_V1" ||
    contract.spawnPolicies.HANDOFF !== "CLOSURE_NTFS_V2"
  )
    throw new Error("output broker spawn policies changed");
  exactStringArray(contract.states, "output broker states");
  exactStringArray(contract.testingBarriers, "output broker testing barriers");
  return contract;
}

function retainedRepositoryBytes(checkoutRoot, relativePath, maximumBytes, label) {
  const absolute = resolve(checkoutRoot, ...relativePath.split("/"));
  if (realpathSync(absolute).toLowerCase() !== absolute.toLowerCase())
    throw new Error(`${label} realpath changed`);
  const metadata = lstatSync(absolute);
  if (
    metadata.isSymbolicLink() ||
    !metadata.isFile() ||
    metadata.nlink !== 1 ||
    metadata.size < 1 ||
    metadata.size > maximumBytes
  )
    throw new Error(`${label} is linked, non-regular, multiply-linked, empty, or oversized`);
  const bytes = readFileSync(absolute);
  if (bytes.length !== metadata.size) throw new Error(`${label} size changed during read`);
  return bytes;
}

function repositoryIdentity(bytes, path) {
  return Object.freeze({
    blob: createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"),
    bytes: bytes.length,
    mode: "100644",
    path,
    sha256: sha256(bytes),
  });
}

function sameRepositoryIdentity(actual, expected, label, executable = false) {
  const keys = executable
    ? ["blob", "bytes", "machine", "mode", "path", "sha256", "subsystem"]
    : ["blob", "bytes", "mode", "path", "sha256"];
  exactKeys(expected, keys, label);
  const comparable = executable ? { ...actual, machine: "AMD64", subsystem: "CONSOLE" } : actual;
  if (canonicalJson(comparable) !== canonicalJson(expected)) throw new Error(`${label} changed`);
}

export function assertTrackedOutputBrokerBuild(checkoutRoot) {
  checkoutRoot = realpathSync(checkoutRoot);
  if (checkoutRoot.toLowerCase() !== ROOT.toLowerCase())
    throw new Error("output broker build checkout root changed");
  const brokerContractPath = "scripts/r4b-evidence/root-only-output-broker-contract.json";
  const brokerContractBytes = retainedRepositoryBytes(
    checkoutRoot,
    brokerContractPath,
    1024 * 1024,
    "output broker contract",
  );
  const brokerContract = validateOutputBrokerContractShape(
    parseStrictJson(brokerContractBytes, "output broker contract"),
  );
  const sourceBytes = retainedRepositoryBytes(
    checkoutRoot,
    brokerContract.source.path,
    1024 * 1024,
    "output broker source",
  );
  const sourceIdentity = repositoryIdentity(sourceBytes, brokerContract.source.path);
  if (
    sourceIdentity.bytes !== brokerContract.source.bytes ||
    sourceIdentity.mode !== brokerContract.source.mode ||
    sourceIdentity.sha256 !== brokerContract.source.sha256
  )
    throw new Error("output broker source identity changed");
  if (brokerContract.productionExecutable.status === "STALE_REBUILD_REQUIRED") {
    if (
      brokerContract.productionExecutable.sourceSha256 !== PRIOR_OUTPUT_BROKER_SOURCE_SHA256 ||
      brokerContract.productionExecutable.sourceSha256 === sourceIdentity.sha256
    )
      throw new Error("output broker stale source boundary changed");
    throw new Error("output broker production executable status is STALE_REBUILD_REQUIRED");
  }
  if (
    brokerContract.productionExecutable.status !== "TRACKED_APPROVED_BUILD" ||
    brokerContract.productionExecutable.sourceSha256 !== sourceIdentity.sha256
  )
    throw new Error("output broker tracked build status changed");
  const installContractPath = "scripts/r4b-evidence/root-only-install-contract.json";
  const installContractBytes = retainedRepositoryBytes(
    checkoutRoot,
    installContractPath,
    16 * 1024 * 1024,
    "install contract",
  );
  const installContract = validateInstallContractShape(
    parseStrictJson(installContractBytes, "install contract"),
  );
  const migration = validateHelperPeMigrationBundle(checkoutRoot);
  assertAttempt004MigrationReady(migration);
  const outputBroker = installContract.executables.outputBroker;
  sameRepositoryIdentity(
    repositoryIdentity(brokerContractBytes, brokerContractPath),
    outputBroker.contract,
    "install output broker contract",
  );
  sameRepositoryIdentity(sourceIdentity, outputBroker.source, "install output broker source");
  const executableBytes = retainedRepositoryBytes(
    checkoutRoot,
    brokerContract.productionExecutable.path,
    16 * 1024 * 1024,
    "output broker executable",
  );
  const executableIdentity = repositoryIdentity(
    executableBytes,
    brokerContract.productionExecutable.path,
  );
  sameRepositoryIdentity(
    executableIdentity,
    outputBroker.executable,
    "install output broker executable",
    true,
  );
  return Object.freeze({
    brokerContract: repositoryIdentity(brokerContractBytes, brokerContractPath),
    executable: executableIdentity,
    migration,
    source: sourceIdentity,
  });
}

export function validateHelperPeMigrationA3Shape(a3) {
  exactKeys(a3, ["schema", "v1"], "helper PE migration A3");
  if (a3.schema !== "fluyo:r4b:root-only-helper-pe-migration-a3:v1")
    throw new Error("helper PE migration A3 schema changed");
  exactKeys(a3.v1, ["sha256", "bytes", "migrationReason"], "helper PE migration A3 v1 record");
  if (
    a3.v1.sha256 !== "ff5f8d8d5d6ea1b3fd1aedfed0508f86452587a5c74cd4e1a433e25c86ced7ce" ||
    a3.v1.bytes !== 8232 ||
    a3.v1.migrationReason !== V1_MIGRATION_REASON
  )
    throw new Error("helper PE migration A3 v1 facts changed");
  return a3;
}

export function validateHelperPeMigrationGapsShape(record) {
  exactKeys(record, ["schema", "gaps"], "helper PE migration gaps");
  if (
    record.schema !== "fluyo:r4b:root-only-helper-pe-migration-gaps:v1" ||
    !Array.isArray(record.gaps)
  )
    throw new Error("helper PE migration gaps envelope changed");
  for (const gap of record.gaps) exactKeys(gap, ["id", "status"], "helper PE migration gap");
  if (canonicalJson(record.gaps) !== canonicalJson(MIGRATION_GAPS))
    throw new Error("helper PE migration gaps changed");
  return record;
}

export function validateHelperPeMigrationIndexShape(index) {
  exactKeys(index, ["schema", "a3Sha256", "migrationGapsSha256"], "helper PE migration index");
  if (index.schema !== "fluyo:r4b:root-only-helper-pe-migration-index:v1")
    throw new Error("helper PE migration index schema changed");
  sha(index.a3Sha256, "helper PE migration A3 digest");
  sha(index.migrationGapsSha256, "helper PE migration gaps digest");
  return index;
}

export function validateHelperPeMigrationBundle(checkoutRoot) {
  checkoutRoot = realpathSync(checkoutRoot);
  if (checkoutRoot.toLowerCase() !== ROOT.toLowerCase())
    throw new Error("helper PE migration checkout root changed");
  const a3Bytes = retainedRepositoryBytes(
    checkoutRoot,
    MIGRATION_PATHS.a3,
    16 * 1024,
    "helper PE migration A3",
  );
  const gapsBytes = retainedRepositoryBytes(
    checkoutRoot,
    MIGRATION_PATHS.gaps,
    16 * 1024,
    "helper PE migration gaps",
  );
  const indexBytes = retainedRepositoryBytes(
    checkoutRoot,
    MIGRATION_PATHS.index,
    16 * 1024,
    "helper PE migration index",
  );
  const a3 = validateHelperPeMigrationA3Shape(parseStrictJson(a3Bytes, "helper PE migration A3"));
  const gaps = validateHelperPeMigrationGapsShape(
    parseStrictJson(gapsBytes, "helper PE migration gaps"),
  );
  const index = validateHelperPeMigrationIndexShape(
    parseStrictJson(indexBytes, "helper PE migration index"),
  );
  if (index.a3Sha256 !== sha256(a3Bytes) || index.migrationGapsSha256 !== sha256(gapsBytes))
    throw new Error("helper PE migration index digest link changed");
  return Object.freeze({
    a3: Object.freeze({ path: MIGRATION_PATHS.a3, sha256: index.a3Sha256, value: a3 }),
    gaps: Object.freeze({
      path: MIGRATION_PATHS.gaps,
      sha256: index.migrationGapsSha256,
      value: gaps,
    }),
    index: Object.freeze({ path: MIGRATION_PATHS.index, sha256: sha256(indexBytes), value: index }),
  });
}

export function assertAttempt004MigrationReady(bundle) {
  const blockers = bundle.gaps.value.gaps.filter((gap) => gap.status === "OPEN_BLOCKING");
  if (blockers.length !== 0) throw new Error("Attempt004 migration gaps remain open");
  return bundle;
}

export const INSTALL_RECEIPT_KEYS = Object.freeze([
  "schema",
  "attemptId",
  "checkoutHead",
  "checkoutTree",
  "approvedHead",
  "approvedTree",
  "approvedAuthorityDigest",
  "trustedParentHead",
  "trustedParentTree",
  "authorityPath",
  "authorityChange",
  "authorityDiffSha256",
  "trustedHarnessManifestDigest",
  "installContractSha256",
  "closurePlanDigest",
  "outsideAllowedManifestDigest",
  "approvedModuleIdentities",
  "cwd",
  "nodeProcessExecutable",
  "nodeProcessExecutableSha256",
  "nodeExecutable",
  "nodeSha256",
  "npmEntry",
  "npmEntrySha256",
  "npmTreeInventorySha256",
  "argv",
  "argvSha256",
  "environmentEntries",
  "environmentSha256",
  "userConfigPath",
  "userConfigBytes",
  "userConfigSha256",
  "globalConfigPath",
  "globalConfigBytes",
  "globalConfigSha256",
  "cacheRoot",
  "logPath",
  "logBytes",
  "logSha256",
  "startedUtc",
  "endedUtc",
  "processId",
  "processStartUtc",
  "exitCode",
  "networkObservation",
  "previousReceiptSha256",
  "receiptSha256",
]);

export function validateInstallContractShape(contract) {
  exactKeys(
    contract,
    [
      "schema",
      "evidenceStatus",
      "creditable",
      "protocolMode",
      "claimBoundary",
      "target",
      "checkout",
      "executables",
      "configuration",
      "argv",
      "brokerExecution",
      "closurePlan",
      "receipt",
    ],
    "install contract",
  );
  if (
    contract.schema !== "fluyo:r4b:root-only-install-contract:v3" ||
    contract.evidenceStatus !== "NON_EVIDENCE" ||
    contract.creditable !== false ||
    contract.protocolMode !== "EVIDENCE_ONLY_NO_CONSUMER"
  )
    throw new Error("install contract envelope changed");
  exactKeys(contract.claimBoundary, ["proves", "doesNotProve"], "claim boundary");
  if (
    contract.claimBoundary.proves !==
    "exact installed closure held immutable during trusted verification through authenticated terminalization"
  )
    throw new Error("claim boundary proves text changed");
  exactStringArray(contract.claimBoundary.doesNotProve, "claim exclusions");
  exactKeys(contract.target, ["os", "cpu", "libc"], "contract target");
  if (
    contract.target.os !== "win32" ||
    contract.target.cpu !== "x64" ||
    contract.target.libc !== null
  )
    throw new Error("contract target changed");
  exactKeys(
    contract.checkout,
    ["mode", "requiredClean", "forbidWorkspacePackages", "allowedWriteRoots"],
    "checkout contract",
  );
  if (
    contract.checkout.mode !== "EXACT_VERIFIED_CHECKOUT_ROOT" ||
    contract.checkout.requiredClean !== true ||
    contract.checkout.forbidWorkspacePackages !== true
  )
    throw new Error("checkout boundary changed");
  exactStringArray(contract.checkout.allowedWriteRoots, "allowed write roots");
  exactKeys(
    contract.executables,
    ["node", "npmEntry", "npmTree", "outputBroker", "nativeVerifier"],
    "executable contract",
  );
  exactKeys(contract.executables.node, ["bytes", "path", "sha256", "version"], "Node identity");
  exactKeys(
    contract.executables.npmEntry,
    ["bytes", "path", "sha256", "version"],
    "npm entry identity",
  );
  exactKeys(
    contract.executables.npmTree,
    ["bytes", "files", "inventorySha256", "path"],
    "npm tree identity",
  );
  exactKeys(
    contract.executables.outputBroker,
    ["contract", "executable", "source"],
    "output broker identity",
  );
  exactKeys(
    contract.executables.nativeVerifier,
    ["executable", "source"],
    "native verifier identity",
  );
  for (const [label, identity] of [
    ["Node", contract.executables.node],
    ["npm entry", contract.executables.npmEntry],
  ]) {
    if (typeof identity.path !== "string") throw new Error(`${label} path is invalid`);
    integer(identity.bytes, `${label} bytes`, 1);
    sha(identity.sha256, `${label} sha256`);
  }
  integer(contract.executables.npmTree.files, "npm tree files", 1);
  integer(contract.executables.npmTree.bytes, "npm tree bytes", 1);
  sha(contract.executables.npmTree.inventorySha256, "npm tree digest");
  const repositoryIdentity = (identity, label, executable = false) => {
    exactKeys(
      identity,
      executable
        ? ["blob", "bytes", "machine", "mode", "path", "sha256", "subsystem"]
        : ["blob", "bytes", "mode", "path", "sha256"],
      label,
    );
    if (identity.mode !== "100644" || typeof identity.path !== "string")
      throw new Error(`${label} path/mode changed`);
    if (executable && (identity.machine !== "AMD64" || identity.subsystem !== "CONSOLE"))
      throw new Error(`${label} PE identity changed`);
    const pending =
      identity.blob === "PENDING_APPROVED_BUILD" &&
      identity.bytes === "PENDING_APPROVED_BUILD" &&
      identity.sha256 === "PENDING_APPROVED_BUILD";
    if (pending) {
      if (!executable) throw new Error(`${label} cannot be pending`);
      return;
    }
    if (!/^[0-9a-f]{40}$/u.test(identity.blob)) throw new Error(`${label} blob is invalid`);
    integer(identity.bytes, `${label} bytes`, 1);
    sha(identity.sha256, `${label} digest`);
  };
  repositoryIdentity(contract.executables.outputBroker.contract, "output broker contract");
  repositoryIdentity(contract.executables.outputBroker.source, "output broker source");
  repositoryIdentity(
    contract.executables.outputBroker.executable,
    "output broker executable",
    true,
  );
  repositoryIdentity(contract.executables.nativeVerifier.source, "native verifier source");
  repositoryIdentity(
    contract.executables.nativeVerifier.executable,
    "native verifier executable",
    true,
  );
  exactKeys(
    contract.configuration,
    [
      "userConfigRelativePath",
      "globalConfigRelativePath",
      "npmLogDirectoryRelativePath",
      "logRelativePath",
      "receiptDirectoryRelativePath",
      "emptyConfigBytes",
      "emptyConfigSha256",
      "maximumLogBytes",
      "environmentKeys",
      "npmConfigEnvironmentKeys",
    ],
    "configuration contract",
  );
  for (const key of [
    "userConfigRelativePath",
    "globalConfigRelativePath",
    "npmLogDirectoryRelativePath",
    "logRelativePath",
    "receiptDirectoryRelativePath",
  ])
    if (typeof contract.configuration[key] !== "string")
      throw new Error(`configuration ${key} changed type`);
  exactStringArray(contract.configuration.environmentKeys, "environment keys");
  exactStringArray(contract.configuration.npmConfigEnvironmentKeys, "npm config environment keys");
  if (contract.configuration.npmConfigEnvironmentKeys.length !== 0)
    throw new Error("NPM_CONFIG environment must remain empty");
  integer(contract.configuration.emptyConfigBytes, "empty config bytes");
  integer(contract.configuration.maximumLogBytes, "maximum log bytes", 1);
  sha(contract.configuration.emptyConfigSha256, "empty config digest");
  exactStringArray(contract.argv, "contract argv");
  if (
    contract.argv.length !== 16 ||
    contract.argv[1] !== "ci" ||
    !contract.argv.includes("--offline") ||
    !contract.argv.includes("--ignore-scripts") ||
    !contract.argv.includes("--no-bin-links")
  )
    throw new Error("install argv contract changed");
  exactKeys(
    contract.brokerExecution,
    ["controller", "handoff", "schema"],
    "broker execution contract",
  );
  if (contract.brokerExecution.schema !== "fluyo:r4b:root-only-broker-execution:v1")
    throw new Error("broker execution schema changed");
  exactKeys(
    contract.brokerExecution.controller,
    [
      "argv",
      "cwdId",
      "entryRef",
      "environment",
      "executableRef",
      "limits",
      "logDestinationId",
      "npmLogDestinationId",
      "policyId",
      "treeRef",
    ],
    "controller broker execution",
  );
  exactKeys(
    contract.brokerExecution.handoff,
    ["argv", "cwdId", "environment", "executableRef", "limits", "policyId"],
    "handoff broker execution",
  );
  if (
    contract.brokerExecution.controller.policyId !== "NPM_CI_V1" ||
    contract.brokerExecution.handoff.policyId !== "CLOSURE_NTFS_V2"
  )
    throw new Error("broker spawn policy changed");
  if (canonicalJson(contract.brokerExecution.controller.argv) !== canonicalJson(contract.argv))
    throw new Error("controller broker argv differs from reviewed argv");
  for (const [label, policy, inheritKeys] of [
    ["controller", contract.brokerExecution.controller, contract.configuration.environmentKeys],
    ["handoff", contract.brokerExecution.handoff, ["SystemRoot", "TEMP", "TMP"]],
  ]) {
    exactKeys(
      policy.environment,
      ["derivedEntries", "forbidUnknown", "inheritKeys", "literalEntries"],
      `${label} broker environment`,
    );
    if (
      policy.environment.forbidUnknown !== true ||
      canonicalJson(policy.environment.inheritKeys) !== canonicalJson(inheritKeys) ||
      !Array.isArray(policy.environment.derivedEntries) ||
      !Array.isArray(policy.environment.literalEntries)
    )
      throw new Error(`${label} broker environment changed`);
  }
  exactKeys(
    contract.brokerExecution.controller.limits,
    ["gracefulJobCloseMs", "logBytes", "processes", "timeoutMs"],
    "controller broker limits",
  );
  exactKeys(
    contract.brokerExecution.handoff.limits,
    ["idleMs", "processes", "stderrBytes", "stdoutBytes", "timeoutMs"],
    "handoff broker limits",
  );
  exactKeys(
    contract.closurePlan,
    ["path", "schema", "digest", "packages"],
    "closure plan contract",
  );
  sha(contract.closurePlan.digest, "closure plan digest");
  integer(contract.closurePlan.packages, "closure plan package count", 1);
  exactKeys(contract.receipt, ["schema", "requiredKeys", "domain"], "receipt contract");
  if (typeof contract.receipt.domain !== "string") throw new Error("receipt domain changed type");
  if (canonicalJson(contract.receipt.requiredKeys) !== canonicalJson(INSTALL_RECEIPT_KEYS))
    throw new Error("receipt keys changed");
  return contract;
}

export function validatePlanShape(plan) {
  exactKeys(
    plan,
    [
      "schema",
      "target",
      "source",
      "installMode",
      "limits",
      "overrides",
      "exactAggregate",
      "packages",
      "digest",
    ],
    "closure plan",
  );
  exactKeys(plan.target, ["os", "cpu", "libc"], "plan target");
  if (plan.target.os !== "win32" || plan.target.cpu !== "x64" || plan.target.libc !== null)
    throw new Error("plan target changed");
  exactKeys(
    plan.source,
    ["lockSha256", "packageSha256", "lockfileVersion", "rootWorkspaces", "rootOverridesSha256"],
    "plan source",
  );
  sha(plan.source.lockSha256, "plan lock digest");
  sha(plan.source.packageSha256, "plan package digest");
  sha(plan.source.rootOverridesSha256, "plan override digest");
  if (plan.source.lockfileVersion !== 3) throw new Error("plan lockfile version changed");
  exactStringArray(plan.source.rootWorkspaces, "plan workspaces");
  exactKeys(
    plan.installMode,
    [
      "workspaces",
      "includeDev",
      "includeOptional",
      "ignoreScripts",
      "offline",
      "noBinLinks",
      "strategy",
    ],
    "install mode",
  );
  if (
    canonicalJson(plan.installMode) !==
    canonicalJson({
      workspaces: false,
      includeDev: true,
      includeOptional: true,
      ignoreScripts: true,
      offline: true,
      noBinLinks: true,
      strategy: "hoisted",
    })
  )
    throw new Error("plan install mode changed");
  exactKeys(
    plan.limits,
    [
      "maximumPackages",
      "maximumCompressedBytesPerPackage",
      "maximumExpandedBytesPerPackage",
      "maximumAggregateCompressedBytes",
      "maximumAggregateExpandedBytes",
      "maximumEntriesPerPackage",
      "maximumAggregateEntries",
      "maximumPathBytes",
      "maximumDepth",
      "maximumFileBytes",
      "maximumMetadataBytes",
      "maximumExpansionRatio",
    ],
    "plan limits",
  );
  for (const [key, value] of Object.entries(plan.limits)) integer(value, `plan limit ${key}`, 1);
  exactKeys(
    plan.exactAggregate,
    ["compressedBytes", "expandedBytes", "entries", "files"],
    "exact aggregate",
  );
  for (const [key, value] of Object.entries(plan.exactAggregate))
    integer(value, `exact aggregate ${key}`, 1);
  if (!Array.isArray(plan.overrides)) throw new Error("plan overrides must be an array");
  for (const override of plan.overrides) {
    exactKeys(override, ["selector", "value", "matchedPaths"], "plan override");
    if (
      typeof override.selector !== "string" ||
      (typeof override.value !== "string" &&
        (!override.value || typeof override.value !== "object" || Array.isArray(override.value)))
    )
      throw new Error("plan override type changed");
    exactStringArray(override.matchedPaths, "override matched paths");
  }
  if (!Array.isArray(plan.packages) || plan.packages.length !== plan.limits.maximumPackages)
    throw new Error("plan package count changed");
  const paths = new Set();
  for (const entry of plan.packages) {
    exactKeys(
      entry,
      [
        "path",
        "name",
        "version",
        "resolved",
        "integrity",
        "sha512Hex",
        "cacheContentPath",
        "dev",
        "devOptional",
        "optional",
        "hasInstallScript",
        "os",
        "cpu",
        "libc",
        "dependencies",
        "optionalDependencies",
        "peerDependencies",
        "peerDependenciesMeta",
        "proof",
        "archive",
      ],
      `plan package ${entry.path ?? "<unknown>"}`,
    );
    exactKeys(
      entry.archive,
      [
        "compressedBytes",
        "expandedBytes",
        "entries",
        "files",
        "maximumPathBytes",
        "maximumFileBytes",
        "inventorySha256",
      ],
      `archive proof ${entry.path}`,
    );
    for (const key of [
      "path",
      "name",
      "version",
      "resolved",
      "integrity",
      "sha512Hex",
      "cacheContentPath",
    ])
      if (typeof entry[key] !== "string")
        throw new Error(`plan package ${entry.path} ${key} changed type`);
    for (const key of ["dev", "devOptional", "optional", "hasInstallScript"])
      if (typeof entry[key] !== "boolean")
        throw new Error(`plan package ${entry.path} ${key} changed type`);
    for (const key of [
      "dependencies",
      "optionalDependencies",
      "peerDependencies",
      "peerDependenciesMeta",
      "proof",
    ])
      if (!entry[key] || typeof entry[key] !== "object" || Array.isArray(entry[key]))
        throw new Error(`plan package ${entry.path} ${key} changed type`);
    exactKeys(entry.proof, ["parent", "name", "range", "kind"], `plan proof ${entry.path}`);
    for (const [key, value] of Object.entries(entry.archive))
      if (key !== "inventorySha256")
        integer(value, `archive ${entry.path} ${key}`, key === "maximumFileBytes" ? 0 : 1);
    if (paths.has(entry.path)) throw new Error(`duplicate plan package ${entry.path}`);
    paths.add(entry.path);
    sha(entry.archive.inventorySha256, `archive inventory ${entry.path}`);
  }
  sha(plan.digest, "plan digest");
  return plan;
}

export function validateInstallReceiptShape(receipt, contract) {
  exactKeys(receipt, [...INSTALL_RECEIPT_KEYS].toSorted(), "install receipt");
  if (receipt.schema !== contract.receipt.schema) throw new Error("install receipt schema changed");
  exactStringArray(receipt.argv, "receipt argv");
  if (!Array.isArray(receipt.environmentEntries))
    throw new Error("receipt environment is not an array");
  if (
    !Array.isArray(receipt.approvedModuleIdentities) ||
    receipt.approvedModuleIdentities.length === 0
  )
    throw new Error("receipt approved module identities are absent");
  for (const identity of receipt.approvedModuleIdentities) {
    exactKeys(identity, ["blob", "bytes", "mode", "path", "sha256"], "approved module identity");
    if (typeof identity.path !== "string" || identity.mode !== "100644")
      throw new Error("approved module identity path/mode changed");
    sha(identity.blob, "approved module blob", 40);
    integer(identity.bytes, "approved module bytes", 1);
    sha(identity.sha256, "approved module sha256");
  }
  for (const entry of receipt.environmentEntries) {
    exactKeys(entry, ["key", "value"], "environment entry");
    if (typeof entry.key !== "string" || typeof entry.value !== "string")
      throw new Error("environment entry type changed");
  }
  for (const key of [
    "argvSha256",
    "environmentSha256",
    "userConfigSha256",
    "globalConfigSha256",
    "logSha256",
    "nodeProcessExecutableSha256",
    "nodeSha256",
    "npmEntrySha256",
    "npmTreeInventorySha256",
    "receiptSha256",
  ])
    sha(receipt[key], key);
  for (const key of [
    "approvedAuthorityDigest",
    "authorityDiffSha256",
    "trustedHarnessManifestDigest",
    "installContractSha256",
    "closurePlanDigest",
    "outsideAllowedManifestDigest",
  ])
    sha(receipt[key], key);
  for (const key of ["approvedHead", "approvedTree", "trustedParentHead", "trustedParentTree"])
    sha(receipt[key], key, 40);
  for (const key of ["userConfigBytes", "globalConfigBytes", "logBytes", "processId"])
    integer(receipt[key], key, key === "processId" ? 1 : 0);
  return receipt;
}

export function contentDigest(domain, value) {
  return sha256(`${domain}\0${canonicalJson(value)}`);
}
