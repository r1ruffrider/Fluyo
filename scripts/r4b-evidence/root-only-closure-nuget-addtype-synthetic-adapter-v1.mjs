import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
} from "node:fs";
import { connect } from "node:net";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const ADAPTER_VERSION = "R4B-SYNTHETIC-ADAPTER-v1.13.6";
export const PROTOCOL_VERSION = "R4B-ADDTYPE-PIPE-RPC-v1.13.6";
export const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
export const MANIFEST_BINDING = "HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1";
export const CLI_MODE = "--execute-authorized-contract-self-test-v1";
export const NETWORK_EVIDENCE_MODE = "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1";
export const SNAPSHOT_MODE = "BOUNDED_METADATA_SNAPSHOT_V1";
export const POLICY_PATH =
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json";
export const CONTROLLER_PATH =
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs";
export const ADAPTER_PATH =
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs";
export const RUNTIME_MANIFEST_PATHS = Object.freeze([
  "docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md",
  "docs/DEVELOPMENT_HANDOFF.md",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.ps1",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs",
  "scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs",
  "scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs",
  "scripts/r4b-evidence/roslyn-verifier-authenticode.cs",
]);

const MAX_FRAME_BYTES = 131072;
const MAX_SESSION_BYTES = 8388608;
const TRANSPORT_EOF = Object.freeze({ type: "EOF" });
const MAX_RECEIPT_BYTES = 4096;
const READY_TIMEOUT_MS = 30000;
const CANCEL_ACK_TIMEOUT_MS = 500;
const SETTLEMENT_TIMEOUT_MS = 1000;
const POWERSHELL_EXIT_TIMEOUT_MS = 5000;
const NODE_HOST = Object.freeze({
  path: "C:\\Program Files\\nodejs\\node.exe",
  version: "24.22.1",
  byteCount: 93915464,
  sha256: "d702daa815eabbff763c7d3808e235cf031cf2ca70211b56847bc72f51e240e5",
  normalizedImagePathSha256: "46674df7e50081977073a3d38239a6782e73328bda5843f5d5a85d4118d98357",
});
const POWERSHELL_PATH = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const POWERSHELL_ARGS = Object.freeze([
  "-NoLogo",
  "-NoProfile",
  "-NonInteractive",
  "-InputFormat",
  "Text",
  "-OutputFormat",
  "Text",
  "-Command",
  "-",
]);
const FORBIDDEN_ENVIRONMENT_KEYS = Object.freeze([
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
const FRAME_KEYS = Object.freeze([
  "schemaVersion",
  "frameType",
  "directionSequence",
  "sessionId",
  "operationId",
  "method",
  "timeoutMs",
  "payloadSha256",
  "payload",
]);
const FRAME_TYPES = Object.freeze([
  "HELLO",
  "CHALLENGE",
  "AUTH",
  "READY",
  "REQUEST",
  "RESPONSE",
  "RESPONSE_ACK",
  "CANCEL",
  "CANCEL_ACK",
  "CLOSE",
  "CLOSED",
]);
export const HELLO_KEYS = Object.freeze([
  "protocolVersion",
  "clientNonce",
  "pipeTokenSha256",
  "candidateManifestSha256",
  "reviewBinding",
  "rootLeaseId",
  "sessionId",
  "nodePid",
  "nodeHeldImage",
  "spawnedPowerShellPid",
  "powerShellHeldImage",
]);
export const CHALLENGE_KEYS = Object.freeze([
  "protocolVersion",
  "serverNonce",
  "observedNodeIdentity",
  "observedPowerShellIdentity",
  "serverProof",
]);
export const AUTH_KEYS = Object.freeze([
  "protocolVersion",
  "serverNonce",
  "clientProof",
  "candidateManifestSha256",
  "reviewBinding",
  "rootLeaseId",
  "sessionId",
  "observedNodeIdentitySha256",
  "observedPowerShellIdentitySha256",
  "pipeTokenSha256",
]);
export const READY_KEYS = Object.freeze([
  "protocolVersion",
  "readyProof",
  "candidateManifestSha256",
  "reviewBinding",
  "rootLeaseId",
  "sessionId",
  "observedNodeIdentitySha256",
  "observedPowerShellIdentitySha256",
  "manifestHeld",
  "peerIdentitiesBound",
  "rootChainHeld",
  "preReadyInventoryComplete",
  "expectedTempDirectoryIdentitySha256",
  "livePreReadyDescendantCount",
  "livePreReadyDescendantInventorySha256",
  "unexpectedPreReadyEntryCount",
  "unexpectedPreReadyEntryInventorySha256",
  "observerStarted",
  "readerStarted",
  "workerStarted",
  "rpcReady",
]);
export const HELD_IMAGE_KEYS = Object.freeze(["byteCount", "sha256", "deviceHex", "inodeHex"]);
export const OBSERVED_IDENTITY_KEYS = Object.freeze([
  "processId",
  "creationFileTimeHex",
  "imageByteCount",
  "imageSha256",
  "imageVolumeSerialNumber",
  "imageFileId",
  "imageFinalPathSha256",
]);
export const RPC_REQUEST_SCHEMAS = Object.freeze({
  beginOwnedNetworkMeasurement: Object.freeze(["planSha256"]),
  captureGlobalMutationSnapshot: Object.freeze([]),
  openPinnedInputLeases: Object.freeze(["planSha256"]),
  revalidatePinnedInputLeases: Object.freeze(["leaseId", "recordsSha256"]),
  allocateOwnedRoot: Object.freeze(["precreatedRootLeaseId"]),
  createOwnershipLedger: Object.freeze(["rootLeaseId"]),
  runOwnedProcess: Object.freeze([
    "processRole",
    "fixtureId",
    "executableIdentitySha256",
    "rootLeaseId",
    "ledgerId",
    "pinnedLeaseId",
    "timeoutMs",
    "combinedOutputCapBytes",
  ]),
  forceStopOwnedProcessTree: Object.freeze(["targetOperationId", "bindingStateSha256"]),
  performCleanupStep: Object.freeze(["operation", "bindingStateSha256"]),
});
export const RPC_RESULT_SCHEMAS = Object.freeze({
  beginOwnedNetworkMeasurement: Object.freeze([
    "schemaVersion",
    "leaseId",
    "available",
    "complete",
    "startedBeforeFirstSyntheticChild",
    "baselineOwnerCount",
    "baselineOwnerScopeSha256",
    "evidenceMode",
    "targetPollIntervalMicros",
    "maximumAllowedGapMicros",
  ]),
  captureGlobalMutationSnapshot: Object.freeze([
    "schemaVersion",
    "complete",
    "phaseManifestSha256",
    "phaseInputMetadataSha256",
    "checkoutControlMetadataSha256",
    "nodeHostMetadataSha256",
    "powerShellHostMetadataSha256",
    "closedChildEnvironmentSha256",
    "foreignOwnedPrefixMetadataSha256",
    "aggregateSha256",
  ]),
  openPinnedInputLeases: Object.freeze([
    "schemaVersion",
    "leaseId",
    "records",
    "recordsSha256",
    "allHeld",
  ]),
  revalidatePinnedInputLeases: Object.freeze([
    "schemaVersion",
    "leaseId",
    "records",
    "recordsSha256",
    "allHeld",
  ]),
  allocateOwnedRoot: Object.freeze([
    "schemaVersion",
    "leaseId",
    "parentVolumeSerialNumber",
    "parentFileId",
    "rootVolumeSerialNumber",
    "rootFileId",
    "parentFinalPathSha256",
    "rootFinalPathSha256",
    "rootName",
    "ancestorChainReparseFree",
    "sameVolume",
    "heldDenyDelete",
    "precreatedByAdapter",
    "adoptedByBroker",
  ]),
  createOwnershipLedger: Object.freeze([
    "schemaVersion",
    "ledgerId",
    "rootLeaseId",
    "state",
    "entryCount",
    "entriesSha256",
  ]),
  runOwnedProcess: Object.freeze([
    "exitCode",
    "stdoutBase64",
    "stderrBase64",
    "processIdentity",
    "outputIdentity",
    "ownershipLedger",
  ]),
  forceStopOwnedProcessTree: Object.freeze([
    "schemaVersion",
    "operationId",
    "requested",
    "ownedProcessCount",
    "stoppedProcessCount",
    "exitObserved",
    "jobClosed",
    "liveOwnedProcessCount",
  ]),
  performCleanupStep: Object.freeze([
    "schemaVersion",
    "operation",
    "status",
    "fixedReason",
    "evidence",
  ]),
});
export const ADAPTER_FAILURE_REASONS = Object.freeze([
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
const RECEIPT_KEYS = Object.freeze([
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
const AUTHORITY = Object.freeze({
  externalActionAuthorized: false,
  downloadAuthorityPresent: false,
  executionAuthorityPresent: false,
  state: "PRECONDITION_HOLD_NO_GET",
});

export class AdapterFailure extends Error {
  constructor(reason) {
    super(reason);
    this.reason = ADAPTER_FAILURE_REASONS.includes(reason) ? reason : "ADAPTER_INTERNAL_FAILURE";
  }
}

function fail(reason) {
  throw new AdapterFailure(reason);
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function gitBlob(bytes) {
  return createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`, "utf8"), bytes]))
    .digest("hex");
}

export function normalizedImagePathSha256(input, handleReturned = false) {
  if (typeof input !== "string" || input.length === 0 || input !== input.normalize("NFC"))
    fail("ADAPTER_HOST_INVALID");
  let value = input.replaceAll("/", "\\");
  if (value.startsWith("\\\\?\\")) {
    if (!handleReturned) fail("ADAPTER_HOST_INVALID");
    value = value.slice(4);
  }
  if (
    value.startsWith("\\\\") ||
    value.startsWith("\\\\.\\") ||
    /GLOBALROOT/iu.test(value) ||
    !/^[A-Za-z]:\\/u.test(value) ||
    value.slice(2).includes(":") ||
    value.split("\\").includes("..")
  )
    fail("ADAPTER_HOST_INVALID");
  value = resolve(value).replaceAll("/", "\\");
  value = `${value[0].toUpperCase()}${value.slice(1)}`;
  if (!/^[A-Za-z]:\\$/u.test(value)) value = value.replace(/\\+$/u, "");
  value = value.normalize("NFC").toUpperCase();
  if (/\r|\n/u.test(value)) fail("ADAPTER_HOST_INVALID");
  return hash(Buffer.from(value, "utf8"));
}

function heldImageClaim(descriptor, bytes) {
  const stat = fstatSync(descriptor, { bigint: true });
  if (!stat.isFile() || Number(stat.size) !== bytes.length || bytes.length <= 0)
    fail("ADAPTER_HOST_INVALID");
  const claim = {
    byteCount: bytes.length,
    sha256: hash(bytes),
    deviceHex: BigInt.asUintN(64, stat.dev).toString(16).toUpperCase().padStart(16, "0"),
    inodeHex: BigInt.asUintN(128, stat.ino).toString(16).toUpperCase().padStart(32, "0"),
  };
  exactKeys(claim, HELD_IMAGE_KEYS);
  return Object.freeze(claim);
}

function observedIdentityDigest(identity) {
  exactKeys(identity, OBSERVED_IDENTITY_KEYS);
  if (
    !Number.isSafeInteger(identity.processId) ||
    identity.processId <= 0 ||
    !/^[0-9A-F]{16}$/u.test(identity.creationFileTimeHex) ||
    identity.creationFileTimeHex === "0000000000000000" ||
    !Number.isSafeInteger(identity.imageByteCount) ||
    identity.imageByteCount <= 0 ||
    !/^[0-9a-f]{64}$/u.test(identity.imageSha256) ||
    !/^[0-9A-F]{16}$/u.test(identity.imageVolumeSerialNumber) ||
    identity.imageVolumeSerialNumber === "0000000000000000" ||
    !/^[0-9A-F]{32}$/u.test(identity.imageFileId) ||
    identity.imageFileId === "00000000000000000000000000000000" ||
    !/^[0-9a-f]{64}$/u.test(identity.imageFinalPathSha256)
  )
    fail("ADAPTER_HANDSHAKE_INVALID");
  return hash(canonicalPayloadBytes(identity));
}

function readHeldDescriptor(descriptor, byteCount) {
  const bytes = Buffer.alloc(byteCount);
  let offset = 0;
  while (offset < byteCount) {
    const read = readSync(descriptor, bytes, offset, byteCount - offset, offset);
    if (read <= 0) fail("ADAPTER_MANIFEST_INVALID");
    offset += read;
  }
  if (readSync(descriptor, Buffer.alloc(1), 0, 1, byteCount) !== 0)
    fail("ADAPTER_MANIFEST_INVALID");
  return bytes;
}

export function holdRuntimeManifest(checkoutRoot) {
  const descriptors = [];
  const rows = [];
  try {
    const orderedPaths = [...RUNTIME_MANIFEST_PATHS].sort((left, right) =>
      Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")),
    );
    for (const path of orderedPaths) {
      const absolutePath = resolve(checkoutRoot, path);
      const routed = relative(checkoutRoot, absolutePath).replaceAll("\\", "/");
      const link = lstatSync(absolutePath);
      if (
        routed !== path ||
        !link.isFile() ||
        link.isSymbolicLink() ||
        realpathSync.native(absolutePath).toLowerCase() !== absolutePath.toLowerCase()
      )
        fail("ADAPTER_MANIFEST_INVALID");
      const descriptor = openSync(absolutePath, "r");
      descriptors.push(descriptor);
      const before = fstatSync(descriptor, { bigint: true });
      if (!before.isFile() || before.size <= 0n || before.size > BigInt(Number.MAX_SAFE_INTEGER))
        fail("ADAPTER_MANIFEST_INVALID");
      const bytes = readHeldDescriptor(descriptor, Number(before.size));
      const after = fstatSync(descriptor, { bigint: true });
      if (
        !before.isFile() ||
        before.dev !== after.dev ||
        before.ino !== after.ino ||
        before.size !== after.size ||
        Number(after.size) !== bytes.length
      )
        fail("ADAPTER_MANIFEST_INVALID");
      rows.push(
        Object.freeze({
          path,
          byteCount: bytes.length,
          sha256: hash(bytes),
          gitBlobSha1: gitBlob(bytes),
          descriptor,
          bytes,
          device: after.dev,
          inode: after.ino,
        }),
      );
    }
    const canonicalRows = Buffer.from(
      rows
        .map((row) => `${row.path}\0${row.byteCount}\0${row.sha256}\0${row.gitBlobSha1}\n`)
        .join(""),
      "utf8",
    );
    return Object.freeze({
      binding: MANIFEST_BINDING,
      rows: Object.freeze(rows),
      candidateManifestSha256: hash(canonicalRows),
      row(path) {
        const row = rows.find((entry) => entry.path === path);
        if (!row) fail("ADAPTER_MANIFEST_INVALID");
        return row;
      },
      revalidate() {
        for (const row of rows) {
          const stat = fstatSync(row.descriptor, { bigint: true });
          if (
            !stat.isFile() ||
            stat.dev !== row.device ||
            stat.ino !== row.inode ||
            Number(stat.size) !== row.byteCount
          )
            fail("ADAPTER_MANIFEST_INVALID");
          const bytes = readHeldDescriptor(row.descriptor, row.byteCount);
          if (hash(bytes) !== row.sha256 || gitBlob(bytes) !== row.gitBlobSha1)
            fail("ADAPTER_MANIFEST_INVALID");
        }
        return true;
      },
      close() {
        for (let index = descriptors.length - 1; index >= 0; index -= 1)
          closeSync(descriptors[index]);
        descriptors.length = 0;
      },
    });
  } catch (error) {
    for (let index = descriptors.length - 1; index >= 0; index -= 1) {
      try {
        closeSync(descriptors[index]);
      } catch {}
    }
    throw error;
  }
}

function exactKeys(value, keys) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    JSON.stringify(Object.keys(value)) !== JSON.stringify(keys)
  )
    fail("ADAPTER_PROTOCOL_INVALID");
}

function canonicalValue(value, seen = new Set()) {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.normalize("NFC") !== value) fail("ADAPTER_PROTOCOL_INVALID");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) fail("ADAPTER_PROTOCOL_INVALID");
    return value;
  }
  if (typeof value !== "object" || seen.has(value)) fail("ADAPTER_PROTOCOL_INVALID");
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item) => canonicalValue(item, seen));
    seen.delete(value);
    return result;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) fail("ADAPTER_PROTOCOL_INVALID");
  const result = {};
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || descriptor.get || descriptor.set || !descriptor.enumerable)
      fail("ADAPTER_PROTOCOL_INVALID");
    if (key.normalize("NFC") !== key) fail("ADAPTER_PROTOCOL_INVALID");
    result[key] = canonicalValue(value[key], seen);
  }
  seen.delete(value);
  return result;
}

export function canonicalPayloadBytes(value) {
  return Buffer.from(JSON.stringify(canonicalValue(value)), "utf8");
}

export function encodeFrame(frame) {
  exactKeys(frame, FRAME_KEYS);
  if (
    frame.schemaVersion !== 1 ||
    !FRAME_TYPES.includes(frame.frameType) ||
    !Number.isSafeInteger(frame.directionSequence) ||
    frame.directionSequence < 1 ||
    typeof frame.sessionId !== "string" ||
    typeof frame.operationId !== "string" ||
    typeof frame.method !== "string" ||
    !Number.isSafeInteger(frame.timeoutMs) ||
    frame.timeoutMs < 0
  )
    fail("ADAPTER_PROTOCOL_INVALID");
  const payloadBytes = canonicalPayloadBytes(frame.payload);
  if (hash(payloadBytes) !== frame.payloadSha256) fail("ADAPTER_PROTOCOL_INVALID");
  const bytes = Buffer.from(`${JSON.stringify(frame)}\n`, "utf8");
  if (bytes.length > MAX_FRAME_BYTES) fail("ADAPTER_PROTOCOL_INVALID");
  return bytes;
}

export function decodeFrame(bytes, expectedSequence) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_FRAME_BYTES)
    fail("ADAPTER_PROTOCOL_INVALID");
  if (bytes[bytes.length - 1] !== 0x0a || bytes.subarray(0, -1).includes(0x0a))
    fail("ADAPTER_PROTOCOL_INVALID");
  const text = bytes.subarray(0, -1).toString("utf8");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    fail("ADAPTER_PROTOCOL_INVALID");
  }
  if (encodeFrame(value).subarray(0, -1).toString("utf8") !== text)
    fail("ADAPTER_PROTOCOL_INVALID");
  if (value.directionSequence !== expectedSequence) fail("ADAPTER_PROTOCOL_INVALID");
  return value;
}

export function validateRpcPayload(method, payload, result = false) {
  const schemas = result ? RPC_RESULT_SCHEMAS : RPC_REQUEST_SCHEMAS;
  const keys = schemas[method];
  if (!keys) fail("ADAPTER_PROTOCOL_INVALID");
  exactKeys(payload, keys);
  canonicalValue(payload);
  if (!result && method === "runOwnedProcess") {
    if (!["COMPILER", "FIXTURE"].includes(payload.processRole)) fail("ADAPTER_PROTOCOL_INVALID");
    if ((payload.processRole === "COMPILER") !== (payload.fixtureId === null))
      fail("ADAPTER_PROTOCOL_INVALID");
    if (
      payload.combinedOutputCapBytes !== 65536 ||
      payload.timeoutMs <= 0 ||
      payload.timeoutMs > 30000
    )
      fail("ADAPTER_PROTOCOL_INVALID");
  }
  if (result && method === "runOwnedProcess") {
    for (const field of ["stdoutBase64", "stderrBase64"]) {
      if (
        typeof payload[field] !== "string" ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(payload[field])
      )
        fail("ADAPTER_PROTOCOL_INVALID");
      const decoded = Buffer.from(payload[field], "base64");
      if (decoded.toString("base64") !== payload[field]) fail("ADAPTER_PROTOCOL_INVALID");
    }
    if (
      Buffer.byteLength(payload.stdoutBase64, "base64") +
        Buffer.byteLength(payload.stderrBase64, "base64") >
      65536
    )
      fail("ADAPTER_PROTOCOL_INVALID");
  }
  return payload;
}

export function handshakeProof({
  label,
  pipeToken,
  protocolVersion,
  reviewBinding,
  candidateManifestSha256,
  sessionId,
  rootLeaseId,
  clientNonce,
  serverNonce,
  observedNodeIdentitySha256,
  observedPowerShellIdentitySha256,
}) {
  if (!["SERVER_V1", "CLIENT_V1", "READY_V1"].includes(label)) fail("ADAPTER_HANDSHAKE_INVALID");
  for (const value of [
    pipeToken,
    candidateManifestSha256,
    sessionId,
    rootLeaseId,
    clientNonce,
    serverNonce,
    observedNodeIdentitySha256,
    observedPowerShellIdentitySha256,
  ])
    if (typeof value !== "string" || !/^[0-9a-f]{64}$/u.test(value))
      fail("ADAPTER_HANDSHAKE_INVALID");
  if (protocolVersion !== PROTOCOL_VERSION || reviewBinding !== MANIFEST_BINDING)
    fail("ADAPTER_HANDSHAKE_INVALID");
  return hash(
    Buffer.from(
      [
        label,
        pipeToken,
        protocolVersion,
        reviewBinding,
        candidateManifestSha256,
        sessionId,
        rootLeaseId,
        clientNonce,
        serverNonce,
        observedNodeIdentitySha256,
        observedPowerShellIdentitySha256,
      ].join("\0"),
      "ascii",
    ),
  );
}

function rejectAmbient(environment) {
  const present = new Set(Object.keys(environment).map((key) => key.toUpperCase()));
  if (FORBIDDEN_ENVIRONMENT_KEYS.some((key) => present.has(key))) fail("ADAPTER_AMBIENT_INVALID");
}

export function validateCliEnvelope({ execArgv, argv, environment, adapterPath }) {
  if (!Array.isArray(execArgv) || execArgv.length !== 0) fail("ADAPTER_ARGUMENT_INVALID");
  if (
    !Array.isArray(argv) ||
    argv.length !== 5 ||
    resolve(argv[1]).toLowerCase() !== resolve(adapterPath).toLowerCase() ||
    argv[2] !== CLI_MODE ||
    !/^--reviewed-manifest-sha256=[0-9a-f]{64}$/u.test(argv[3]) ||
    argv[4] !== `--review-binding=${MANIFEST_BINDING}`
  )
    fail("ADAPTER_ARGUMENT_INVALID");
  rejectAmbient(environment);
  return Object.freeze({
    reviewedManifestSha256: argv[3].slice(27),
    reviewBinding: MANIFEST_BINDING,
  });
}

export function openAuditSourceLease(checkoutRoot, policy) {
  const fixedPath = "scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs";
  if (policy.bootstrap.auditSourcePath !== fixedPath) fail("ADAPTER_MANIFEST_INVALID");
  const pin = policy.sourceControl.newSources.find((entry) => entry.path === fixedPath);
  if (!pin || pin.role !== "ADDTYPE_AUDIT_SOURCE") fail("ADAPTER_MANIFEST_INVALID");
  const absolutePath = resolve(checkoutRoot, fixedPath);
  if (relative(checkoutRoot, absolutePath).replaceAll("\\", "/") !== fixedPath)
    fail("ADAPTER_MANIFEST_INVALID");
  const descriptor = openSync(absolutePath, "r");
  try {
    const before = fstatSync(descriptor, { bigint: true });
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    if (
      !before.isFile() ||
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      bytes.length < 1 ||
      bytes.length > 65536 ||
      bytes.length !== pin.byteCount ||
      hash(bytes) !== pin.sha256 ||
      realpathSync.native(absolutePath).toLowerCase() !== absolutePath.toLowerCase()
    )
      fail("ADAPTER_MANIFEST_INVALID");
    return Object.freeze({ descriptor, absolutePath, pin, before, bytes });
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}

export function validateAuditManifestParity(manifest, policy) {
  const fixedPath = "scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs";
  const held = manifest.row(fixedPath);
  const pin = policy.sourceControl.newSources.find((entry) => entry.path === fixedPath);
  if (
    !held ||
    !pin ||
    pin.role !== "ADDTYPE_AUDIT_SOURCE" ||
    held.path !== pin.path ||
    held.byteCount !== pin.byteCount ||
    held.sha256 !== pin.sha256 ||
    held.gitBlobSha1 !== pin.gitBlobSha1
  )
    fail("ADAPTER_AUDIT_SOURCE_PIN_INVALID");
  return held;
}

export function createPrebootstrapRoot(platform, expectedParent = "C:\\Windows\\Temp") {
  const nonce = platform.randomBytes(16).toString("hex");
  if (!/^[0-9a-f]{32}$/u.test(nonce)) fail("ADAPTER_ROOT_PRECONDITION_HOLD");
  const rootName = `fluyo-r4b-addtype-synthetic-v1-${nonce}`;
  const parent = platform.realpath(expectedParent);
  if (parent.toLowerCase() !== expectedParent.toLowerCase()) fail("ADAPTER_ROOT_PRECONDITION_HOLD");
  platform.assertAncestorChain(parent);
  const root = platform.join(parent, rootName);
  platform.mkdirExclusive(root);
  const temp = platform.join(root, "temp");
  platform.mkdirExclusive(temp);
  const parentLease = platform.openDirectory(parent);
  const rootLease = platform.openDirectory(root);
  const tempLease = platform.openDirectory(temp);
  const beforeParent = platform.fstat(parentLease);
  const beforeRoot = platform.fstat(rootLease);
  const beforeTemp = platform.fstat(tempLease);
  platform.assertStableDirectory(parent, parentLease, beforeParent);
  platform.assertStableDirectory(root, rootLease, beforeRoot);
  platform.assertStableDirectory(temp, tempLease, beforeTemp);
  const leaseId = hash(Buffer.from(rootName, "ascii"));
  return Object.freeze({
    rootName,
    root,
    temp,
    parent,
    parentLease,
    rootLease,
    tempLease,
    beforeParent,
    beforeRoot,
    beforeTemp,
    leaseId,
  });
}

function canonicalParentPid(value) {
  const text = typeof value === "string" ? value : String(value);
  if (!/^[1-9][0-9]{0,9}$/u.test(text)) fail("ADAPTER_HANDSHAKE_INVALID");
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 0xffffffff || String(parsed) !== text)
    fail("ADAPTER_HANDSHAKE_INVALID");
  return Object.freeze({ text, value: parsed });
}

function closedPowerShellEnvironment(
  root,
  pipeToken,
  checkoutRoot,
  parentPid,
  manifestDigest,
  auditRow,
) {
  const canonicalPid = canonicalParentPid(parentPid);
  return Object.freeze({
    SystemRoot: "C:\\Windows",
    WINDIR: "C:\\Windows",
    TEMP: join(root.root, "temp"),
    TMP: join(root.root, "temp"),
    PSModulePath: "",
    FLUYO_R4B_AUDIT_SOURCE_BYTE_COUNT: String(auditRow.byteCount),
    FLUYO_R4B_AUDIT_SOURCE_SHA256: auditRow.sha256,
    FLUYO_R4B_PIPE_TOKEN: pipeToken,
    FLUYO_R4B_CHECKOUT_ROOT: checkoutRoot,
    FLUYO_R4B_PARENT_PID: canonicalPid.text,
    FLUYO_R4B_CANDIDATE_MANIFEST_SHA256: manifestDigest,
    FLUYO_R4B_ROOT_NAME: root.rootName,
  });
}

export class CanonicalRpcSession {
  constructor(transport, sessionId) {
    if (
      !transport ||
      typeof transport.send !== "function" ||
      typeof transport.receive !== "function"
    )
      fail("ADAPTER_PROTOCOL_INVALID");
    this.transport = transport;
    this.sessionId = sessionId;
    this.sendSequence = 1;
    this.receiveSequence = 1;
    this.totalBytes = 0;
    this.closed = false;
    this.inflight = new Map();
    this.drain = new Map();
    this.tombstones = new Map();
    this.controlState = "EXPECT_CHALLENGE";
    this.controlWaiter = null;
    this.controlFrame = null;
    this.pumpFailure = null;
    this.closeSendCompleted = false;
    this.closeClosedObserved = false;
    this.closeEofObserved = false;
    this.closeSettlement = null;
    this.closeDeadline = null;
    this.closeDeadlineTimer = null;
    this.activeCloseToken = null;
    this.closeWriteQuarantined = false;
    this.closeStarted = false;
    this.transportAborted = false;
    this.sendChain = Promise.resolve();
    this.pumpPromise = this.pump();
  }

  async frame(frameType, operationId, method, timeoutMs, payload) {
    if (this.controlState === "FAILED" || this.controlState === "CLOSED" || this.closed)
      fail("ADAPTER_SESSION_CLOSE_FAILED");
    const frame = {
      schemaVersion: 1,
      frameType,
      directionSequence: this.sendSequence++,
      sessionId: this.sessionId,
      operationId,
      method,
      timeoutMs,
      payloadSha256: hash(canonicalPayloadBytes(payload)),
      payload,
    };
    const bytes = encodeFrame(frame);
    this.totalBytes += bytes.length;
    if (this.totalBytes > MAX_SESSION_BYTES) fail("ADAPTER_PROTOCOL_INVALID");
    const send = this.sendChain.then(() => {
      if (this.controlState === "FAILED" || this.controlState === "CLOSED" || this.closed)
        fail("ADAPTER_SESSION_CLOSE_FAILED");
      return this.transport.send(bytes);
    });
    this.sendChain = send.catch(() => {});
    await send;
    return frame;
  }

  failSession(error) {
    const closing = this.controlState === "EXPECT_CLOSED" || this.controlState === "EXPECT_EOF";
    const failure = closing
      ? new AdapterFailure("ADAPTER_SESSION_CLOSE_FAILED")
      : error instanceof AdapterFailure
        ? error
        : new AdapterFailure("ADAPTER_RPC_ROUTING_INVALID");
    if (this.pumpFailure) return this.pumpFailure;
    this.controlState = "FAILED";
    this.pumpFailure = failure;
    this.activeCloseToken = null;
    if (this.closeDeadlineTimer) {
      clearTimeout(this.closeDeadlineTimer);
      this.closeDeadlineTimer = null;
    }
    if (this.closeDeadline !== null) {
      this.closeDeadline = null;
    }
    for (const collection of [this.inflight, this.drain, this.tombstones]) {
      for (const operation of collection.values()) {
        this.detachAbort(operation);
        operation.state = "QUARANTINED";
        if (!operation.settled) {
          operation.settled = true;
          operation.reject(failure);
        }
      }
      collection.clear();
    }
    if (this.controlWaiter) {
      this.controlWaiter.reject(failure);
      this.controlWaiter = null;
    }
    this.controlFrame = null;
    if (this.closeSettlement) {
      const settlement = this.closeSettlement;
      this.closeSettlement = null;
      if (!settlement.settled) {
        settlement.settled = true;
        settlement.reject(failure);
      }
    }
    if (this.closeStarted && !this.closeSendCompleted) this.closeWriteQuarantined = true;
    if (!this.transportAborted) {
      this.transportAborted = true;
      this.transport.abort?.(failure);
    }
    return failure;
  }

  maybeSettleClose(token = this.activeCloseToken) {
    if (
      token === null ||
      token !== this.activeCloseToken ||
      this.controlState === "FAILED" ||
      this.controlState === "CLOSED" ||
      !this.closeSettlement ||
      this.closeSettlement.token !== token ||
      this.closeSettlement.settled ||
      !this.closeSendCompleted ||
      !this.closeClosedObserved ||
      !this.closeEofObserved
    )
      return;
    const settlement = this.closeSettlement;
    this.closeSettlement = null;
    this.activeCloseToken = null;
    settlement.settled = true;
    if (this.closeDeadlineTimer) {
      clearTimeout(this.closeDeadlineTimer);
      this.closeDeadlineTimer = null;
    }
    this.closeDeadline = null;
    this.controlState = "CLOSED";
    this.closed = true;
    settlement.resolve();
  }

  async pump() {
    try {
      for (;;) {
        const bytes = await this.transport.receive();
        if (bytes === TRANSPORT_EOF) {
          if (this.controlState !== "EXPECT_EOF" || this.closeEofObserved)
            throw new AdapterFailure("ADAPTER_SESSION_CLOSE_FAILED");
          this.closeEofObserved = true;
          this.maybeSettleClose();
          return;
        }
        this.totalBytes += bytes.length;
        if (this.totalBytes > MAX_SESSION_BYTES) fail("ADAPTER_PROTOCOL_INVALID");
        const frame = decodeFrame(bytes, this.receiveSequence++);
        if (frame.sessionId !== this.sessionId) fail("ADAPTER_PROTOCOL_INVALID");
        await this.routeFrame(frame);
      }
    } catch (error) {
      this.failSession(error);
    }
  }

  deliverControl(frame) {
    if (this.controlFrame) fail("ADAPTER_RPC_ROUTING_INVALID");
    if (this.controlWaiter) {
      const waiter = this.controlWaiter;
      this.controlWaiter = null;
      waiter.resolve(frame);
    } else this.controlFrame = frame;
  }

  async routeFrame(frame) {
    if (frame.frameType === "CHALLENGE") {
      if (
        this.controlState !== "EXPECT_CHALLENGE" ||
        frame.operationId !== "HANDSHAKE:CHALLENGE" ||
        frame.method !== "handshake"
      )
        fail("ADAPTER_RPC_ROUTING_INVALID");
      this.controlState = "EXPECT_READY";
      this.deliverControl(frame);
      return;
    } else if (frame.frameType === "READY") {
      if (
        this.controlState !== "EXPECT_READY" ||
        frame.operationId !== "HANDSHAKE:READY" ||
        frame.method !== "handshake"
      )
        fail("ADAPTER_RPC_ROUTING_INVALID");
      this.controlState = "RPC_ACTIVE";
      this.deliverControl(frame);
      return;
    } else if (frame.frameType === "CLOSED") {
      if (
        this.controlState !== "EXPECT_CLOSED" ||
        this.closeClosedObserved ||
        frame.operationId !== "SESSION:CLOSE" ||
        frame.method !== "close"
      )
        fail("ADAPTER_RPC_ROUTING_INVALID");
      this.closeClosedObserved = true;
      this.controlState = "EXPECT_EOF";
      this.maybeSettleClose();
      return;
    }
    if (this.controlState !== "RPC_ACTIVE") fail("ADAPTER_RPC_ROUTING_INVALID");
    const inflight = this.inflight.get(frame.operationId);
    const draining = this.drain.get(frame.operationId);
    if (frame.frameType === "RESPONSE") {
      if (inflight) {
        if (inflight.method !== frame.method) fail("ADAPTER_RPC_ROUTING_INVALID");
        this.inflight.delete(frame.operationId);
        inflight.response = frame;
        if (inflight.cancelObserved) {
          inflight.state = "RESPONSE_ONLY";
          this.drain.set(frame.operationId, inflight);
          return;
        }
        await this.retireTerminal(inflight, "RESPONSE_PENDING_ACK", false);
        return;
      }
      if (draining?.state === "CANCEL_ACK_ONLY" && draining.method === frame.method) {
        this.drain.delete(frame.operationId);
        draining.response = frame;
        await this.retireTerminal(draining, "CANCEL_RESPONSE_PENDING_ACK", true);
        return;
      }
      fail("ADAPTER_RPC_ROUTING_INVALID");
    }
    if (frame.frameType === "CANCEL_ACK") {
      if (inflight?.cancelSent && inflight.method === frame.method) {
        this.inflight.delete(frame.operationId);
        inflight.cancelAck = frame;
        inflight.state = "CANCEL_ACK_ONLY";
        this.drain.set(frame.operationId, inflight);
        return;
      }
      if (draining?.state === "RESPONSE_ONLY" && draining.method === frame.method) {
        this.drain.delete(frame.operationId);
        draining.cancelAck = frame;
        await this.retireTerminal(draining, "CANCEL_RESPONSE_PENDING_ACK", true);
        return;
      }
      fail("ADAPTER_RPC_ROUTING_INVALID");
    }
    fail("ADAPTER_RPC_ROUTING_INVALID");
  }

  receive() {
    if (this.controlFrame) {
      const frame = this.controlFrame;
      this.controlFrame = null;
      return Promise.resolve(frame);
    }
    if (this.pumpFailure) return Promise.reject(this.pumpFailure);
    if (this.controlWaiter)
      return Promise.reject(new AdapterFailure("ADAPTER_RPC_ROUTING_INVALID"));
    return new Promise((resolveControl, rejectControl) => {
      this.controlWaiter = { resolve: resolveControl, reject: rejectControl };
    });
  }

  detachAbort(operation) {
    if (operation.abortSignal && operation.onAbort)
      operation.abortSignal.removeEventListener("abort", operation.onAbort);
    operation.onAbort = null;
  }

  async sendCancel(operation) {
    if (operation.cancelSent || operation.terminal) return;
    operation.cancelSent = true;
    operation.state = "CANCEL_SENT";
    try {
      await this.frame(
        "CANCEL",
        operation.operationId,
        operation.method,
        CANCEL_ACK_TIMEOUT_MS,
        null,
      );
    } catch (error) {
      this.failSession(error);
    }
  }

  async retireTerminal(operation, state, cancelled) {
    operation.state = state;
    operation.terminal = true;
    this.detachAbort(operation);
    this.tombstones.set(operation.operationId, operation);
    try {
      await this.frame("RESPONSE_ACK", operation.operationId, operation.method, 500, null);
    } catch {
      const failure = new AdapterFailure("ADAPTER_RPC_ROUTING_INVALID");
      operation.reject(failure);
      this.failSession(failure);
      return;
    }
    this.tombstones.delete(operation.operationId);
    operation.state = "RETIRED";
    if (cancelled) {
      if (!operation.settled) {
        operation.settled = true;
        operation.reject(new AdapterFailure("ADAPTER_RPC_TIMEOUT"));
      }
    } else {
      try {
        validateRpcPayload(operation.method, operation.response.payload, true);
        if (!operation.settled) {
          operation.settled = true;
          operation.resolve(operation.response.payload);
        }
      } catch (error) {
        if (!operation.settled) {
          operation.settled = true;
          operation.reject(error);
        }
      }
    }
  }

  async request(method, payload, timeoutMs, abortSignal) {
    validateRpcPayload(method, payload, false);
    const operationId = `${method.toUpperCase()}:${this.sendSequence}`;
    if (this.controlState !== "RPC_ACTIVE" || this.inflight.has(operationId))
      fail("ADAPTER_RPC_ROUTING_INVALID");
    let resolveOperation, rejectOperation;
    const settled = new Promise((resolveResult, rejectResult) => {
      resolveOperation = resolveResult;
      rejectOperation = rejectResult;
    });
    const operation = {
      operationId,
      method,
      state: "REGISTERED",
      requestSent: false,
      cancelObserved: false,
      cancelSent: false,
      terminal: false,
      response: null,
      cancelAck: null,
      settled: false,
      abortSignal,
      onAbort: null,
      resolve: resolveOperation,
      reject: rejectOperation,
    };
    this.inflight.set(operationId, operation);
    operation.onAbort = () => {
      if (operation.terminal || operation.state === "RETIRED") return;
      operation.cancelObserved = true;
      if (operation.requestSent) void this.sendCancel(operation);
    };
    abortSignal?.addEventListener("abort", operation.onAbort, { once: true });
    if (abortSignal?.aborted) operation.onAbort();
    try {
      await this.frame("REQUEST", operationId, method, timeoutMs, payload);
      operation.requestSent = true;
      operation.state = operation.cancelObserved ? "CANCEL_SENT" : "REQUEST_SENT";
      if (operation.cancelObserved) await this.sendCancel(operation);
    } catch (error) {
      this.inflight.delete(operationId);
      this.detachAbort(operation);
      if (!operation.settled) {
        operation.settled = true;
        operation.reject(error);
      }
      this.failSession(error);
    }
    return settled;
  }

  close() {
    if (
      this.controlState !== "RPC_ACTIVE" ||
      this.inflight.size !== 0 ||
      this.drain.size !== 0 ||
      this.tombstones.size !== 0 ||
      this.controlWaiter !== null ||
      this.pumpFailure !== null ||
      this.closeStarted
    )
      return Promise.reject(new AdapterFailure("ADAPTER_SESSION_CLOSE_FAILED"));
    this.closeStarted = true;
    this.controlState = "EXPECT_CLOSED";
    const token = Object.freeze({});
    this.activeCloseToken = token;
    const settlement = new Promise((resolveClose, rejectClose) => {
      this.closeSettlement = {
        token,
        resolve: resolveClose,
        reject: rejectClose,
        settled: false,
      };
    });
    void settlement.catch(() => {});
    this.closeDeadline = Date.now() + SETTLEMENT_TIMEOUT_MS;
    this.closeDeadlineTimer = setTimeout(
      () => {
        if (
          this.activeCloseToken === token &&
          this.controlState !== "FAILED" &&
          this.controlState !== "CLOSED"
        )
          this.failSession(new AdapterFailure("ADAPTER_SESSION_CLOSE_FAILED"));
      },
      Math.max(0, this.closeDeadline - Date.now()),
    );
    void this.frame("CLOSE", "SESSION:CLOSE", "close", SETTLEMENT_TIMEOUT_MS, null).then(
      () => {
        if (
          this.activeCloseToken !== token ||
          this.controlState === "FAILED" ||
          this.controlState === "CLOSED"
        )
          return;
        this.closeSendCompleted = true;
        this.maybeSettleClose(token);
      },
      () => {
        if (
          this.activeCloseToken !== token ||
          this.controlState === "FAILED" ||
          this.controlState === "CLOSED"
        )
          return;
        this.failSession(new AdapterFailure("ADAPTER_SESSION_CLOSE_FAILED"));
      },
    );
    return settlement;
  }
}

function createLinePipeTransport(pipeName, socketFactory = connect) {
  const socket = socketFactory(pipeName);
  const queued = [];
  const waiters = [];
  let pending = Buffer.alloc(0);
  let sessionBytes = 0;
  let ended = false;
  let failure = null;
  let destroyed = false;
  const cleanupListeners = () => {
    socket.removeListener("data", onData);
    socket.removeListener("end", onEnd);
    socket.removeListener("error", onError);
  };
  const settle = () => {
    while (queued.length > 0 && waiters.length > 0) waiters.shift().resolve(queued.shift());
    if (failure && waiters.length > 0) {
      const error = failure;
      while (waiters.length > 0) waiters.shift().reject(error);
    }
  };
  const failTransport = (error, destroy) => {
    if (failure) return;
    failure =
      error instanceof AdapterFailure ? error : new AdapterFailure("ADAPTER_PROTOCOL_INVALID");
    pending = Buffer.alloc(0);
    queued.length = 0;
    cleanupListeners();
    if (destroy && !destroyed) {
      destroyed = true;
      socket.destroy();
    }
    settle();
  };
  const onData = (chunk) => {
    if (!Buffer.isBuffer(chunk)) {
      failTransport(new AdapterFailure("ADAPTER_PROTOCOL_INVALID"), true);
      return;
    }
    if (chunk.length > MAX_SESSION_BYTES - sessionBytes) {
      failTransport(new AdapterFailure("ADAPTER_PROTOCOL_INVALID"), true);
      return;
    }
    sessionBytes += chunk.length;
    let offset = 0;
    while (offset < chunk.length) {
      const newline = chunk.indexOf(0x0a, offset);
      const end = newline < 0 ? chunk.length : newline + 1;
      const segmentLength = end - offset;
      if (segmentLength > MAX_FRAME_BYTES - pending.length) {
        failTransport(new AdapterFailure("ADAPTER_PROTOCOL_INVALID"), true);
        return;
      }
      const segment = chunk.subarray(offset, end);
      pending =
        pending.length === 0
          ? Buffer.from(segment)
          : Buffer.concat([pending, segment], pending.length + segmentLength);
      offset = end;
      if (newline >= 0) {
        queued.push(pending);
        pending = Buffer.alloc(0);
      }
    }
    settle();
  };
  const onEnd = () => {
    if (ended) {
      failTransport(new AdapterFailure("ADAPTER_SESSION_CLOSE_FAILED"), true);
      return;
    }
    ended = true;
    if (pending.length !== 0) {
      failTransport(new AdapterFailure("ADAPTER_PROTOCOL_INVALID"), true);
      return;
    }
    cleanupListeners();
    queued.push(TRANSPORT_EOF);
    settle();
  };
  const onError = () => failTransport(new AdapterFailure("ADAPTER_PROTOCOL_INVALID"), true);
  socket.on("data", onData);
  socket.on("end", onEnd);
  socket.on("error", onError);
  return Object.freeze({
    send(bytes) {
      return new Promise((resolveWrite, rejectWrite) => {
        socket.write(bytes, (error) => (error ? rejectWrite(error) : resolveWrite()));
      });
    },
    receive() {
      if (queued.length > 0) return Promise.resolve(queued.shift());
      if (failure) return Promise.reject(failure);
      if (ended) return Promise.reject(new AdapterFailure("ADAPTER_SESSION_CLOSE_FAILED"));
      return new Promise((resolveRead, rejectRead) =>
        waiters.push({ resolve: resolveRead, reject: rejectRead }),
      );
    },
    abort(error) {
      failTransport(error, true);
    },
  });
}

export async function performHandshake(session, binding) {
  const hello = {
    protocolVersion: PROTOCOL_VERSION,
    clientNonce: binding.clientNonce,
    pipeTokenSha256: hash(Buffer.from(binding.pipeToken, "ascii")),
    candidateManifestSha256: binding.candidateManifestSha256,
    reviewBinding: MANIFEST_BINDING,
    rootLeaseId: binding.rootLeaseId,
    sessionId: session.sessionId,
    nodePid: binding.nodePid,
    nodeHeldImage: binding.nodeHeldImage,
    spawnedPowerShellPid: binding.spawnedPowerShellPid,
    powerShellHeldImage: binding.powerShellHeldImage,
  };
  exactKeys(binding.nodeHeldImage, HELD_IMAGE_KEYS);
  exactKeys(binding.powerShellHeldImage, HELD_IMAGE_KEYS);
  exactKeys(hello, HELLO_KEYS);
  await session.frame("HELLO", "HANDSHAKE:HELLO", "handshake", 30000, hello);
  const challengeFrame = await session.receive();
  if (challengeFrame.frameType !== "CHALLENGE") fail("ADAPTER_HANDSHAKE_INVALID");
  exactKeys(challengeFrame.payload, CHALLENGE_KEYS);
  const challenge = challengeFrame.payload;
  const observedNodeIdentitySha256 = observedIdentityDigest(challenge.observedNodeIdentity);
  const observedPowerShellIdentitySha256 = observedIdentityDigest(
    challenge.observedPowerShellIdentity,
  );
  if (
    challenge.protocolVersion !== PROTOCOL_VERSION ||
    challenge.observedNodeIdentity.processId !== binding.nodePid ||
    challenge.observedPowerShellIdentity.processId !== binding.spawnedPowerShellPid ||
    challenge.observedNodeIdentity.imageByteCount !== binding.nodeHeldImage.byteCount ||
    challenge.observedNodeIdentity.imageSha256 !== binding.nodeHeldImage.sha256 ||
    challenge.observedNodeIdentity.imageFinalPathSha256 !== binding.nodeNormalizedPathSha256 ||
    challenge.observedPowerShellIdentity.imageByteCount !== binding.powerShellHeldImage.byteCount ||
    challenge.observedPowerShellIdentity.imageSha256 !== binding.powerShellHeldImage.sha256 ||
    challenge.observedPowerShellIdentity.imageFinalPathSha256 !==
      binding.powerShellNormalizedPathSha256
  )
    fail("ADAPTER_HANDSHAKE_INVALID");
  const proofInput = {
    pipeToken: binding.pipeToken,
    protocolVersion: PROTOCOL_VERSION,
    reviewBinding: MANIFEST_BINDING,
    candidateManifestSha256: binding.candidateManifestSha256,
    sessionId: session.sessionId,
    rootLeaseId: binding.rootLeaseId,
    clientNonce: binding.clientNonce,
    serverNonce: challenge.serverNonce,
    observedNodeIdentitySha256,
    observedPowerShellIdentitySha256,
  };
  if (challenge.serverProof !== handshakeProof({ label: "SERVER_V1", ...proofInput }))
    fail("ADAPTER_HANDSHAKE_INVALID");
  const auth = {
    protocolVersion: PROTOCOL_VERSION,
    serverNonce: challenge.serverNonce,
    clientProof: handshakeProof({ label: "CLIENT_V1", ...proofInput }),
    candidateManifestSha256: binding.candidateManifestSha256,
    reviewBinding: MANIFEST_BINDING,
    rootLeaseId: binding.rootLeaseId,
    sessionId: session.sessionId,
    observedNodeIdentitySha256,
    observedPowerShellIdentitySha256,
    pipeTokenSha256: hello.pipeTokenSha256,
  };
  exactKeys(auth, AUTH_KEYS);
  await session.frame("AUTH", "HANDSHAKE:AUTH", "handshake", 30000, auth);
  const readyFrame = await session.receive();
  if (readyFrame.frameType !== "READY") fail("ADAPTER_HANDSHAKE_INVALID");
  exactKeys(readyFrame.payload, READY_KEYS);
  const ready = readyFrame.payload;
  if (
    ready.protocolVersion !== PROTOCOL_VERSION ||
    ready.candidateManifestSha256 !== binding.candidateManifestSha256 ||
    ready.reviewBinding !== MANIFEST_BINDING ||
    ready.rootLeaseId !== binding.rootLeaseId ||
    ready.sessionId !== session.sessionId ||
    ready.observedNodeIdentitySha256 !== observedNodeIdentitySha256 ||
    ready.observedPowerShellIdentitySha256 !== observedPowerShellIdentitySha256 ||
    ready.manifestHeld !== true ||
    ready.peerIdentitiesBound !== true ||
    ready.rootChainHeld !== true ||
    ready.preReadyInventoryComplete !== true ||
    !/^[0-9a-f]{64}$/u.test(ready.expectedTempDirectoryIdentitySha256) ||
    ready.livePreReadyDescendantCount !== 0 ||
    ready.livePreReadyDescendantInventorySha256 !== EMPTY_SHA256 ||
    ready.unexpectedPreReadyEntryCount !== 0 ||
    ready.unexpectedPreReadyEntryInventorySha256 !== EMPTY_SHA256 ||
    ready.observerStarted !== true ||
    ready.readerStarted !== true ||
    ready.workerStarted !== true ||
    ready.rpcReady !== true ||
    ready.readyProof !== handshakeProof({ label: "READY_V1", ...proofInput })
  )
    fail("ADAPTER_HANDSHAKE_INVALID");
  return Object.freeze({ hello, challenge, auth, ready });
}

export class ConcreteSyntheticAdapter {
  constructor({ session, platform, policy, planSha256, precreatedRootLeaseId }) {
    this.session = session;
    this.platform = platform;
    this.policy = policy;
    this.planSha256 = planSha256;
    this.precreatedRootLeaseId = precreatedRootLeaseId;
  }

  async beginOwnedNetworkMeasurement(plan, context) {
    if (plan === null || typeof plan !== "object") fail("ADAPTER_PROTOCOL_INVALID");
    const wire = await this.session.request(
      "beginOwnedNetworkMeasurement",
      { planSha256: this.planSha256 },
      context.timeoutMs,
      context.abortSignal,
    );
    if (
      wire.schemaVersion !== 1 ||
      !/^[0-9a-f]{64}$/u.test(wire.leaseId) ||
      wire.available !== true ||
      wire.complete !== false ||
      wire.startedBeforeFirstSyntheticChild !== true ||
      wire.baselineOwnerCount !== 2 ||
      wire.evidenceMode !== NETWORK_EVIDENCE_MODE ||
      !/^[0-9a-f]{64}$/u.test(wire.baselineOwnerScopeSha256) ||
      wire.targetPollIntervalMicros !== 2000 ||
      wire.maximumAllowedGapMicros !== 10000
    )
      fail("ADAPTER_NETWORK_OBSERVER_INVALID");
    return {
      schemaVersion: wire.schemaVersion,
      leaseId: wire.leaseId,
      available: wire.available,
      complete: wire.complete,
      startedBeforeFirstSyntheticChild: wire.startedBeforeFirstSyntheticChild,
      baselineOwnerCount: wire.baselineOwnerCount,
      baselineOwnerScopeSha256: wire.baselineOwnerScopeSha256,
      evidenceMode: wire.evidenceMode,
      targetPollIntervalMicros: wire.targetPollIntervalMicros,
      maximumAllowedGapMicros: wire.maximumAllowedGapMicros,
    };
  }

  async captureGlobalMutationSnapshot(context) {
    const wire = await this.session.request(
      "captureGlobalMutationSnapshot",
      {},
      context.timeoutMs,
      context.abortSignal,
    );
    const components = [
      wire.phaseManifestSha256,
      wire.phaseInputMetadataSha256,
      wire.checkoutControlMetadataSha256,
      wire.nodeHostMetadataSha256,
      wire.powerShellHostMetadataSha256,
      wire.closedChildEnvironmentSha256,
      wire.foreignOwnedPrefixMetadataSha256,
    ];
    if (wire.complete !== true || components.some((value) => !/^[0-9a-f]{64}$/u.test(value)))
      fail("ADAPTER_GLOBAL_SNAPSHOT_INVALID");
    const derived = (label) => hash(Buffer.from(`${label}\0${wire.aggregateSha256}\n`, "utf8"));
    const snapshot = {
      schemaVersion: wire.schemaVersion,
      complete: wire.complete,
      pathEnvironmentSha256: components[0],
      modulePathSha256: components[1],
      nugetEnvironmentSha256: components[2],
      proxyEnvironmentSha256: components[3],
      powerShellProfileInventorySha256: components[4],
      gacInventorySha256: components[5],
      nugetCacheInventorySha256: components[6],
      repositoryStatusSha256: derived("REPOSITORY_STATUS"),
      serviceTaskInventorySha256: derived("SERVICE_TASK"),
      autorunRegistrySha256: derived("AUTORUN_REGISTRY"),
    };
    snapshot.aggregateSha256 = hash(
      Buffer.from(
        Object.entries(snapshot)
          .slice(2)
          .map(([key, value]) => `${key}\0${value}\n`)
          .join(""),
        "utf8",
      ),
    );
    return snapshot;
  }

  openPinnedInputLeases(_plan, context) {
    return this.session.request(
      "openPinnedInputLeases",
      { planSha256: this.planSha256 },
      context.timeoutMs,
      context.abortSignal,
    );
  }

  revalidatePinnedInputLeases(leaseSet, context) {
    return this.session.request(
      "revalidatePinnedInputLeases",
      { leaseId: leaseSet.leaseId, recordsSha256: leaseSet.recordsSha256 },
      context.timeoutMs,
      context.abortSignal,
    );
  }

  async allocateOwnedRoot(plan, context) {
    if (plan === null || typeof plan !== "object") fail("ADAPTER_PROTOCOL_INVALID");
    const wire = await this.session.request(
      "allocateOwnedRoot",
      { precreatedRootLeaseId: this.precreatedRootLeaseId },
      context.timeoutMs,
      context.abortSignal,
    );
    if (wire.precreatedByAdapter !== true || wire.adoptedByBroker !== true)
      fail("ADAPTER_ROOT_PRECONDITION_HOLD");
    return {
      schemaVersion: wire.schemaVersion,
      leaseId: wire.leaseId,
      parentVolumeSerialNumber: wire.parentVolumeSerialNumber,
      parentFileId: wire.parentFileId,
      rootVolumeSerialNumber: wire.rootVolumeSerialNumber,
      rootFileId: wire.rootFileId,
      parentFinalPathSha256: wire.parentFinalPathSha256,
      rootFinalPathSha256: wire.rootFinalPathSha256,
      rootName: wire.rootName,
      ancestorChainReparseFree: wire.ancestorChainReparseFree,
      sameVolume: wire.sameVolume,
      heldDenyDelete: wire.heldDenyDelete,
    };
  }

  createOwnershipLedger(rootLease, context) {
    return this.session.request(
      "createOwnershipLedger",
      { rootLeaseId: rootLease.leaseId },
      context.timeoutMs,
      context.abortSignal,
    );
  }

  async runOwnedProcess(spec, context) {
    const result = await this.session.request(
      "runOwnedProcess",
      {
        processRole: spec.processRole,
        fixtureId: spec.fixtureId,
        executableIdentitySha256: hash(canonicalPayloadBytes(spec.executableIdentity)),
        rootLeaseId: spec.rootLease.leaseId,
        ledgerId: spec.ownershipLedger.ledgerId,
        pinnedLeaseId: spec.pinnedInputLeases.leaseId,
        timeoutMs: context.timeoutMs,
        combinedOutputCapBytes: 65536,
      },
      context.timeoutMs,
      context.abortSignal,
    );
    return {
      ...result,
      stdout: Buffer.from(result.stdoutBase64, "base64"),
      stderr: Buffer.from(result.stderrBase64, "base64"),
    };
  }

  forceStopOwnedProcessTree(operationId, bindings, context) {
    return this.session.request(
      "forceStopOwnedProcessTree",
      { targetOperationId: operationId, bindingStateSha256: hash(canonicalPayloadBytes(bindings)) },
      context.timeoutMs,
      context.abortSignal,
    );
  }

  performCleanupStep(operation, bindings, context) {
    return this.session.request(
      "performCleanupStep",
      { operation, bindingStateSha256: hash(canonicalPayloadBytes(bindings)) },
      context.timeoutMs,
      context.abortSignal,
    );
  }
}

export function buildManagedReceipt(overrides) {
  const receipt = {
    schemaVersion: 1,
    mode: "CONTRACT_SELF_TEST_V1_13_6",
    contractVersion: "R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.6",
    reviewBinding: MANIFEST_BINDING,
    candidateManifestSha256: overrides.candidateManifestSha256 ?? null,
    state: overrides.state,
    primaryFailureReason: overrides.primaryFailureReason ?? null,
    completedFixtureCount: overrides.completedFixtureCount ?? 0,
    compilerProcessCount: overrides.compilerProcessCount ?? null,
    fixtureProcessCount: overrides.fixtureProcessCount ?? null,
    cleanupStepCount: overrides.cleanupStepCount ?? null,
    fixtureEvidenceSha256: overrides.fixtureEvidenceSha256 ?? null,
    publicTracePinsSha256: overrides.publicTracePinsSha256 ?? null,
    ownershipLedgerPreCleanupSha256: overrides.ownershipLedgerPreCleanupSha256 ?? null,
    ownershipLedgerSha256: overrides.ownershipLedgerSha256 ?? null,
    cleanupSha256: overrides.cleanupSha256 ?? null,
    adapterSessionClosed: overrides.adapterSessionClosed ?? false,
    networkEvidenceMode: overrides.networkEvidenceMode ?? null,
    networkMeasurementComplete: overrides.networkMeasurementComplete ?? null,
    networkBaselineOwnerCount: overrides.networkBaselineOwnerCount ?? null,
    networkWorkOwnerCount: overrides.networkWorkOwnerCount ?? null,
    networkOwnerCount: overrides.networkOwnerCount ?? null,
    networkObservationCount: overrides.networkObservationCount ?? null,
    networkMaximumGapMicros: overrides.networkMaximumGapMicros ?? null,
    networkEventCount: overrides.networkEventCount ?? null,
    retainedArtifactCount: overrides.retainedArtifactCount ?? null,
    globalMutationCount: overrides.globalMutationCount ?? null,
    manifestFinalRevalidated: overrides.manifestFinalRevalidated ?? false,
    authority: AUTHORITY,
  };
  exactKeys(receipt, RECEIPT_KEYS);
  const bytes = Buffer.from(`${JSON.stringify(receipt)}\n`, "utf8");
  if (bytes.length > MAX_RECEIPT_BYTES) fail("ADAPTER_INTERNAL_FAILURE");
  return bytes;
}

export function createProductionPlatform() {
  return Object.freeze({
    randomBytes,
    realpath: realpathSync.native,
    join,
    assertAncestorChain(path) {
      let current = path;
      while (true) {
        const stat = lstatSync(current);
        if (!stat.isDirectory() || stat.isSymbolicLink()) fail("ADAPTER_ROOT_PRECONDITION_HOLD");
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
      }
    },
    mkdirExclusive(path) {
      mkdirSync(path, { recursive: false });
    },
    openDirectory(path) {
      return openSync(path, "r");
    },
    fstat(handle) {
      return fstatSync(handle, { bigint: true });
    },
    assertStableDirectory(path, handle, before) {
      const after = fstatSync(handle, { bigint: true });
      if (before.dev !== after.dev || before.ino !== after.ino || !after.isDirectory())
        fail("ADAPTER_ROOT_PRECONDITION_HOLD");
      if (realpathSync.native(path).toLowerCase() !== path.toLowerCase())
        fail("ADAPTER_ROOT_PRECONDITION_HOLD");
    },
  });
}

function waitForChildExit(child, timeoutMs) {
  return new Promise((resolveExit, rejectExit) => {
    if (child.exitCode !== null) {
      resolveExit(child.exitCode);
      return;
    }
    const timer = setTimeout(() => {
      child.kill();
      rejectExit(new AdapterFailure("ADAPTER_SESSION_CLOSE_FAILED"));
    }, timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolveExit(code);
    });
    child.once("error", () => {
      clearTimeout(timer);
      rejectExit(new AdapterFailure("ADAPTER_BOOTSTRAP_INVALID"));
    });
  });
}

async function importHeldController(row) {
  const source = row.bytes.toString("utf8");
  if (Buffer.from(source, "utf8").length !== row.byteCount) fail("ADAPTER_MANIFEST_INVALID");
  const specifier = `data:text/javascript;base64,${row.bytes.toString("base64")}#sha256=${row.sha256}`;
  return import(specifier);
}

export async function runAuthorizedCliV12() {
  const adapterFile = fileURLToPath(import.meta.url);
  const cli = validateCliEnvelope({
    execArgv: process.execArgv,
    argv: process.argv,
    environment: process.env,
    adapterPath: adapterFile,
  });
  const checkoutRoot = resolve(dirname(adapterFile), "..", "..");
  const manifest = holdRuntimeManifest(checkoutRoot);
  if (
    manifest.binding !== cli.reviewBinding ||
    manifest.candidateManifestSha256 !== cli.reviewedManifestSha256
  ) {
    manifest.close();
    fail("ADAPTER_MANIFEST_INVALID");
  }
  const candidateManifestSha256 = manifest.candidateManifestSha256;
  const policy = JSON.parse(manifest.row(POLICY_PATH).bytes.toString("utf8"));
  const auditRow = validateAuditManifestParity(manifest, policy);
  const controller = await importHeldController(manifest.row(CONTROLLER_PATH));
  if (controller.SYNTHETIC_EXECUTION_CONTRACT_VERSION !== "R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.6") {
    manifest.close();
    fail("ADAPTER_MANIFEST_INVALID");
  }
  const nodeDescriptor = openSync(process.execPath, "r");
  const powerShellDescriptor = openSync(POWERSHELL_PATH, "r");
  let nodeHeldImage;
  let powerShellHeldImage;
  if (
    process.execPath.toLowerCase() !== NODE_HOST.path.toLowerCase() ||
    process.version !== `v${NODE_HOST.version}` ||
    normalizedImagePathSha256(NODE_HOST.path) !== NODE_HOST.normalizedImagePathSha256
  )
    fail("ADAPTER_HOST_INVALID");
  try {
    const nodeBytes = readHeldDescriptor(nodeDescriptor, Number(fstatSync(nodeDescriptor).size));
    nodeHeldImage = heldImageClaim(nodeDescriptor, nodeBytes);
    if (
      nodeHeldImage.byteCount !== NODE_HOST.byteCount ||
      nodeHeldImage.sha256 !== NODE_HOST.sha256
    )
      fail("ADAPTER_HOST_INVALID");
    const powerShellStat = fstatSync(powerShellDescriptor, { bigint: true });
    const powerShellBytes = readHeldDescriptor(powerShellDescriptor, Number(powerShellStat.size));
    powerShellHeldImage = heldImageClaim(powerShellDescriptor, powerShellBytes);
    if (
      powerShellHeldImage.byteCount !== policy.powerShellHost.executable.byteCount ||
      powerShellHeldImage.sha256 !== policy.powerShellHost.executable.sha256 ||
      normalizedImagePathSha256(POWERSHELL_PATH) !==
        policy.powerShellHost.executable.normalizedImagePathSha256
    )
      fail("ADAPTER_HOST_INVALID");
  } catch (error) {
    closeSync(powerShellDescriptor);
    closeSync(nodeDescriptor);
    manifest.close();
    throw error;
  }
  let root;
  let child;
  let session;
  let adapterSessionClosed = false;
  let ready = false;
  try {
    const platform = createProductionPlatform();
    root = createPrebootstrapRoot(platform);
    const pipeToken = randomBytes(32).toString("hex");
    if (!/^[0-9a-f]{64}$/u.test(pipeToken)) fail("ADAPTER_ROOT_PRECONDITION_HOLD");
    const environment = closedPowerShellEnvironment(
      root,
      pipeToken,
      checkoutRoot,
      process.pid,
      candidateManifestSha256,
      auditRow,
    );
    child = spawn(POWERSHELL_PATH, POWERSHELL_ARGS, {
      cwd: checkoutRoot,
      env: environment,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stdin.end(manifest.row(policy.bootstrap.scriptPath).bytes);
    const pipeName = `\\\\.\\pipe\\fluyo-r4b-addtype-v1-${pipeToken}`;
    const transport = createLinePipeTransport(pipeName);
    session = new CanonicalRpcSession(transport, randomBytes(32).toString("hex"));
    await performHandshake(session, {
      clientNonce: randomBytes(32).toString("hex"),
      pipeToken,
      candidateManifestSha256,
      nodePid: process.pid,
      nodeHeldImage,
      spawnedPowerShellPid: child.pid,
      powerShellHeldImage,
      nodeNormalizedPathSha256: NODE_HOST.normalizedImagePathSha256,
      powerShellNormalizedPathSha256: policy.powerShellHost.executable.normalizedImagePathSha256,
      rootLeaseId: root.leaseId,
    });
    ready = true;
    const helperRow = manifest.rows.find((row) => row.path === policy.bootstrap.helperSourcePath);
    if (!helperRow) fail("ADAPTER_MANIFEST_INVALID");
    const plan = controller.prepareSyntheticCompilePlan(policy, helperRow.bytes, checkoutRoot);
    const concreteAdapter = new ConcreteSyntheticAdapter({
      session,
      platform,
      policy,
      planSha256: hash(canonicalPayloadBytes(plan)),
      precreatedRootLeaseId: root.leaseId,
    });
    const result = await controller.runSyntheticCompileTransaction(plan, concreteAdapter);
    await session.close();
    adapterSessionClosed = true;
    const exitCode = await waitForChildExit(child, POWERSHELL_EXIT_TIMEOUT_MS);
    if (exitCode !== 0) fail("ADAPTER_SESSION_CLOSE_FAILED");
    manifest.revalidate();
    const fixtureEvidenceSha256 = hash(canonicalPayloadBytes(result.envelopes));
    const cleanupSha256 = hash(canonicalPayloadBytes(result.cleanup));
    const publicTracePinsSha256 = hash(
      canonicalPayloadBytes(policy.bootstrap.syntheticPolicy.tracePins),
    );
    return buildManagedReceipt({
      candidateManifestSha256,
      state: result.state,
      primaryFailureReason: result.primaryFailureReason,
      completedFixtureCount: result.completedFixtureCount,
      compilerProcessCount: result.cleanup.compilerProcessCount,
      fixtureProcessCount: result.cleanup.fixtureProcessCount,
      cleanupStepCount: result.cleanup.groups.reduce(
        (count, group) => count + group.steps.length,
        0,
      ),
      fixtureEvidenceSha256,
      publicTracePinsSha256,
      ownershipLedgerPreCleanupSha256: result.cleanup.ownershipLedgerPreCleanupSha256 ?? null,
      ownershipLedgerSha256: result.cleanup.ownershipLedgerSha256 ?? null,
      cleanupSha256,
      adapterSessionClosed,
      networkEvidenceMode: NETWORK_EVIDENCE_MODE,
      networkMeasurementComplete: result.cleanup.networkMeasurementComplete,
      networkBaselineOwnerCount: result.cleanup.networkBaselineOwnerCount ?? null,
      networkWorkOwnerCount: result.cleanup.networkWorkOwnerCount ?? null,
      networkOwnerCount: result.cleanup.networkOwnerCount ?? null,
      networkObservationCount: result.cleanup.networkObservationCount ?? null,
      networkMaximumGapMicros: result.cleanup.networkMaximumGapMicros ?? null,
      networkEventCount: result.cleanup.networkEventCount ?? null,
      retainedArtifactCount: result.cleanup.retainedArtifactCount,
      globalMutationCount: result.cleanup.globalMutationCount,
      manifestFinalRevalidated: true,
    });
  } catch (error) {
    if (!ready && child) {
      child.kill();
      await waitForChildExit(child, POWERSHELL_EXIT_TIMEOUT_MS).catch(() => {});
      throw new AdapterFailure("ADAPTER_BOOTSTRAP_DESCENDANT_UNPROVEN_HOLD");
    }
    throw error;
  } finally {
    if (session && !adapterSessionClosed && ready) {
      try {
        await session.close();
      } catch {}
    }
    manifest.close();
    closeSync(powerShellDescriptor);
    closeSync(nodeDescriptor);
    if (root) {
      try {
        closeSync(root.tempLease);
      } catch {}
      try {
        closeSync(root.rootLease);
      } catch {}
      try {
        closeSync(root.parentLease);
      } catch {}
    }
  }
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  runAuthorizedCliV12()
    .then((receipt) => {
      process.stdout.write(receipt);
      process.exitCode = 0;
    })
    .catch((error) => {
      const reason = error instanceof AdapterFailure ? error.reason : "ADAPTER_INTERNAL_FAILURE";
      const bytes = buildManagedReceipt({
        state: "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD",
        primaryFailureReason: reason,
      });
      process.stdout.write(bytes);
      process.exitCode = 2;
    });
}

export const adapterTesting = Object.freeze({
  hash,
  exactKeys,
  canonicalValue,
  FRAME_KEYS,
  FRAME_TYPES,
  FORBIDDEN_ENVIRONMENT_KEYS,
  POWERSHELL_PATH,
  POWERSHELL_ARGS,
  NODE_HOST,
  RECEIPT_KEYS,
  AUTHORITY,
  MAX_FRAME_BYTES,
  MAX_SESSION_BYTES,
  TRANSPORT_EOF,
  READY_TIMEOUT_MS,
  CANCEL_ACK_TIMEOUT_MS,
  SETTLEMENT_TIMEOUT_MS,
  POWERSHELL_EXIT_TIMEOUT_MS,
  spawn,
  connect,
  isAbsolute,
  relative,
  canonicalParentPid,
  closedPowerShellEnvironment,
  createLinePipeTransport,
});
