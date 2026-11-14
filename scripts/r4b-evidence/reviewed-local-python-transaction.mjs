import { createHash } from "node:crypto";
import { resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { types as utilTypes } from "node:util";

export const ROOT_MANIFEST_SCHEMA = "R4B_REVIEWED_LOCAL_ROOT_MANIFEST_V1";
export const NETWORK_OBSERVATION_SCHEMA = "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1";
export const REVIEWED_LOCAL_BOOTSTRAP_V2 = `import hashlib,json,msvcrt,os,sys
r=msvcrt.open_osfhandle(int(sys.argv[1]),os.O_RDONLY)
w=msvcrt.open_osfhandle(int(sys.argv[2]),os.O_WRONLY)
def recv(expected):
 b=os.read(r,len(expected))
 if b!=expected: raise SystemExit(121)
def send(value):
 if os.write(w,value)!=len(value): raise SystemExit(122)
send(b"READY_V1\\n")
recv(b"L")
p=os.path.realpath(sys.executable)
with open(p,"rb",buffering=0) as f:
 h=hashlib.file_digest(f,"sha256").hexdigest()
payload=(json.dumps({"executable":p,"sha256":h,"version":list(sys.version_info[:3])},ensure_ascii=False,separators=(",",":"))+"\\r\\n").encode("utf-8")
send(b"LOADED_V1\\n")
recv(b"G")
os.write(1,payload)
os.close(r)
os.close(w)
`;
export const REVIEWED_LOCAL_BOOTSTRAP_V2_SHA256 =
  "7c32a2cdf883ba5ea149f24bf59e53310dc2c393cb05d475c79a9e579774585f";
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
export const TRANSACTION_SUBDIRECTORY = "fluyo-r4b/python-reviewed-local-v2";
export const EVIDENCE_FILES = Object.freeze([
  "consumption-v1.json",
  "settlement-v1.json",
  "outer-receipt-v1.json",
]);
export const FINAL_STATES = Object.freeze([
  "REVIEWED_LOCAL_SUCCESS_CLEAN",
  "REVIEWED_LOCAL_FAILED_CLEAN",
  "REVIEWED_LOCAL_FAILED_CLEANUP_HOLD",
  "REVIEWED_LOCAL_RESULT_UNKNOWN_HOLD",
  "REVIEWED_LOCAL_MARKER_INCOMPLETE_HOLD",
]);
export const OUTER_FAILURES = Object.freeze({
  REPOSITORY_INVALID: "REVIEWED_LOCAL_REPOSITORY_INVALID",
  PACKET_INVALID: "REVIEWED_LOCAL_PACKET_INVALID",
  SIGNATURE_INVALID: "REVIEWED_LOCAL_SIGNATURE_EVIDENCE_INVALID",
  ROOT_MANIFEST_INVALID: "REVIEWED_LOCAL_ROOT_MANIFEST_INVALID",
  OWNED_TEMP_INVALID: "REVIEWED_LOCAL_OWNED_TEMP_INVALID",
  NATIVE_LEASE_UNAVAILABLE: "REVIEWED_LOCAL_NATIVE_LEASE_UNAVAILABLE_HOLD",
  PROCESS_INVALID: "REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID",
  NETWORK_INVALID: "REVIEWED_LOCAL_NETWORK_OBSERVATION_INVALID",
  GLOBAL_MUTATION: "REVIEWED_LOCAL_GLOBAL_MUTATION_INVALID",
  CLEANUP_INVALID: "REVIEWED_LOCAL_CLEANUP_INVALID",
  INTERNAL_FIXED_FAILURE: "TEST_PYTHON_DIAGNOSTIC_INTERNAL_FAILURE",
});

const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const MAX_FILES = 16_384;
const MAX_DIRECTORIES = 4_096;
const MAX_BYTES = 2_147_483_648;
const PRIVATE =
  /(?:[A-Za-z]:\\|\\\\|PRIVATE_|BEGIN CERTIFICATE|signerSubject|signerThumbprint|stdoutBytes|stderrBytes|rootPath|ownedPath|executablePath)/u;
const PACKET_KEYS = Object.freeze([
  "schema",
  "mode",
  "transactionId",
  "root",
  "expectedExecutableSha256",
  "expectedVersion",
  "provenance",
  "expectedRootManifestSha256",
  "expectedRootFileCount",
  "expectedRootDirectoryCount",
  "expectedRootByteCount",
  "signatureEvidence",
  "publicBindingDigest",
]);
const SIGNATURE_KEYS = Object.freeze([
  "method",
  "status",
  "signatureType",
  "observedSha256",
  "signerSubject",
  "signerThumbprint",
  "chainStatus",
  "revocationPolicy",
  "revocationStatus",
  "verificationUtc",
  "evidenceSha256",
]);
const MARKER_KEYS = Object.freeze([
  "schemaVersion",
  "transactionId",
  "state",
  "sourceCommit",
  "packetSha256",
  "publicBindingDigest",
  "expectedExecutableSha256",
  "expectedRootManifestSha256",
  "expectedVersion",
  "provenance",
  "signatureEvidenceSha256",
]);
const SETTLEMENT_KEYS = Object.freeze([
  "schemaVersion",
  "transactionId",
  "state",
  "candidateClass",
  "stage",
  "failureCode",
  "publicBindingDigest",
  "rootManifestSha256",
  "rootFileCount",
  "rootDirectoryCount",
  "rootByteCount",
  "signatureEvidenceSha256",
  "childSpawnAttempted",
  "childStarted",
  "exitObserved",
  "exitCode",
  "signalClass",
  "stdoutByteCount",
  "stdoutSha256",
  "stderrByteCount",
  "stderrSha256",
  "processOwnerCount",
  "processResidualCount",
  "networkObservationCount",
  "networkMaximumGapMicros",
  "networkEventCount",
  "globalMutationCount",
  "rootFinalRevalidated",
]);
const RECEIPT_KEYS = Object.freeze([
  "schemaVersion",
  "transactionId",
  "state",
  "publicBindingDigest",
  "consumptionMarkerSha256",
  "settlementSha256",
  "cleanupState",
  "residueState",
  "ownedTempEntryCount",
  "processResidualCount",
  "networkEventCount",
  "globalMutationCount",
  "rootFinalRevalidated",
  "evidenceFileCount",
  "validEvidenceFileCount",
  "evidenceRetention",
]);
const NATIVE_REQUEST_KEYS = Object.freeze([
  "transactionId",
  "executablePath",
  "executableSha256",
  "rootPath",
  "trustedTempRootPath",
  "ownedPath",
  "rootManifestFiles",
  "systemRoot",
  "introspectionUtf8",
  "introspectionSha256",
  "timeoutMs",
  "combinedCapBytes",
  "networkPollTargetMicros",
  "networkMaximumGapMicros",
]);
const NATIVE_RESULT_KEYS = Object.freeze([
  "childStarted",
  "exitObserved",
  "exitCode",
  "signalClass",
  "stdoutBytes",
  "stderrBytes",
  "processOwnerCount",
  "processResidualCount",
  "networkObservationCount",
  "networkMaximumGapMicros",
  "networkEventCount",
  "loadedImageBoundaryValid",
  "loadedImageCount",
  "rootManifestImageCount",
  "system32ImageCount",
  "loadedImageEvidenceSha256",
  "globalBefore",
  "globalAfter",
  "ownedResidueCount",
]);
const GLOBAL_KEYS = Object.freeze([
  "schemaVersion",
  "complete",
  "pathEnvironmentSha256",
  "modulePathSha256",
  "nugetEnvironmentSha256",
  "proxyEnvironmentSha256",
  "powerShellProfileInventorySha256",
  "gacInventorySha256",
  "nugetCacheInventorySha256",
  "repositoryStatusSha256",
  "serviceTaskInventorySha256",
  "autorunRegistrySha256",
  "aggregateSha256",
]);
const REQUEST_KEYS = Object.freeze([
  "sourceCommit",
  "policyDigest",
  "expectedCommonDirIdentity",
  "privatePacketRaw",
]);
const DEPENDENCY_KEYS = Object.freeze([
  "verifyRepository",
  "holdCommonDirectory",
  "revalidateCommonDirectory",
  "walkRoot",
  "verifyExecutableAndSignature",
  "createTransactionDirectoryExclusive",
  "openEvidenceExclusive",
  "writeEvidence",
  "fsyncEvidence",
  "closeEvidence",
  "fsyncDirectory",
  "reopenEvidence",
  "readEvidence",
  "inventoryEvidenceDirectory",
  "holdTrustedWindowsTempRoot",
  "revalidateTrustedWindowsTempRoot",
  "createOwnedTempExclusive",
  "revalidateOwnedTemp",
  "captureGlobalSnapshot",
  "startNetworkObserver",
  "stopNetworkObserver",
  "nativeLease",
  "cleanupOwnedTemp",
  "inspectOwnedTemp",
]);

function fail(code) {
  throw new Error(code);
}
function plain(value) {
  return (
    value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype
  );
}
function exact(value, keys) {
  return plain(value) && JSON.stringify(Object.keys(value)) === JSON.stringify(keys);
}
function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (plain(value))
    return Object.freeze(
      Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freeze(item)])),
    );
  return value;
}
function integer(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}
function add(left, right, maximum) {
  if (!integer(left) || !integer(right) || left > maximum - right)
    fail(OUTER_FAILURES.ROOT_MANIFEST_INVALID);
  return left + right;
}
function canonical(value, cap, code) {
  const raw = `${JSON.stringify(value)}\n`;
  if (Buffer.byteLength(raw) > cap || PRIVATE.test(raw)) fail(code);
  return raw;
}
function utc(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value) &&
    new Date(value).toISOString().replace(".000Z", "Z") === value
  );
}

export function parsePrivatePacket(raw) {
  if (
    typeof raw !== "string" ||
    raw.length === 0 ||
    raw !== raw.normalize("NFC") ||
    /[\u0000\r\n]/u.test(raw) ||
    Buffer.byteLength(raw) > 8_192
  )
    fail(OUTER_FAILURES.PACKET_INVALID);
  let packet;
  try {
    packet = JSON.parse(raw);
  } catch {
    fail(OUTER_FAILURES.PACKET_INVALID);
  }
  if (!exact(packet, PACKET_KEYS) || JSON.stringify(packet) !== raw)
    fail(OUTER_FAILURES.PACKET_INVALID);
  const signature = packet.signatureEvidence;
  if (
    packet.schema !== "fluyo:r4b:test-python-reviewed-local-binding:v2" ||
    packet.mode !== "REVIEWED_LOCAL" ||
    !HEX64.test(packet.transactionId) ||
    typeof packet.root !== "string" ||
    packet.root !== packet.root.normalize("NFC") ||
    Buffer.byteLength(packet.root) < 4 ||
    Buffer.byteLength(packet.root) > 1_024 ||
    /\p{Cc}/u.test(packet.root) ||
    packet.root.includes("/") ||
    packet.root.endsWith("\\") ||
    !win32.isAbsolute(packet.root) ||
    win32.normalize(packet.root) !== packet.root ||
    /^[A-Za-z]:\\?$/u.test(packet.root) ||
    /^(?:\\\\|\\\?\\|\\\.\\|\\GLOBALROOT\\)/iu.test(packet.root) ||
    /(^|\\)\.{1,2}(?:\\|$)/u.test(packet.root) ||
    /:[^\\]+$/u.test(packet.root.slice(2)) ||
    !HEX64.test(packet.expectedExecutableSha256) ||
    JSON.stringify(packet.expectedVersion) !== "[3,12,5]" ||
    packet.provenance !== "PSF_CPYTHON_INTERPRETER" ||
    !HEX64.test(packet.expectedRootManifestSha256) ||
    !integer(packet.expectedRootFileCount, 1, MAX_FILES) ||
    !integer(packet.expectedRootDirectoryCount, 1, MAX_DIRECTORIES) ||
    !integer(packet.expectedRootByteCount, 1, MAX_BYTES) ||
    !exact(signature, SIGNATURE_KEYS)
  )
    fail(OUTER_FAILURES.PACKET_INVALID);
  const signaturePreimage = Object.fromEntries(
    SIGNATURE_KEYS.slice(0, -1).map((key) => [key, signature[key]]),
  );
  if (
    signature.method !== "WINCRYPT_AUTHENTICODE_OFFLINE_CACHE_V1" ||
    signature.status !== "VALID" ||
    signature.signatureType !== "AUTHENTICODE_EMBEDDED" ||
    signature.observedSha256 !== packet.expectedExecutableSha256 ||
    typeof signature.signerSubject !== "string" ||
    signature.signerSubject !== signature.signerSubject.normalize("NFC") ||
    Buffer.byteLength(signature.signerSubject) < 1 ||
    Buffer.byteLength(signature.signerSubject) > 512 ||
    /\p{Cc}/u.test(signature.signerSubject) ||
    !/^[0-9A-F]{40}$/u.test(signature.signerThumbprint) ||
    signature.chainStatus !== "TRUSTED" ||
    signature.revocationPolicy !== "OFFLINE_CACHE_ONLY_NO_NETWORK" ||
    signature.revocationStatus !== "VALID_WITH_COMPLETE_OFFLINE_REVOCATION" ||
    !utc(signature.verificationUtc) ||
    signature.evidenceSha256 !== digest(JSON.stringify(signaturePreimage))
  )
    fail(OUTER_FAILURES.SIGNATURE_INVALID);
  const publicPreimage = Object.fromEntries(
    PACKET_KEYS.filter((key) => key !== "root" && key !== "publicBindingDigest").map((key) => [
      key,
      packet[key],
    ]),
  );
  if (packet.publicBindingDigest !== digest(JSON.stringify(publicPreimage)))
    fail(OUTER_FAILURES.PACKET_INVALID);
  return freeze(packet);
}

function validateRow(row) {
  const common = [
    "kind",
    "path",
    "identity",
    "volumeIdentity",
    "regular",
    "directory",
    "symlink",
    "reparse",
    "junction",
    "mount",
    "stable",
    "hardLinkCount",
  ];
  const keys = row?.kind === "F" ? [...common, "byteCount", "sha256"] : common;
  if (!exact(row, keys) || !["D", "F"].includes(row.kind))
    fail(OUTER_FAILURES.ROOT_MANIFEST_INVALID);
  const bare = row.kind === "D" ? row.path.slice(0, -1) : row.path;
  if (
    typeof row.path !== "string" ||
    row.path !== row.path.normalize("NFC") ||
    Buffer.byteLength(row.path) > 512 ||
    (row.kind === "D") !== row.path.endsWith("/") ||
    row.path.startsWith("/") ||
    row.path.includes("\\") ||
    bare.split("/").some((part) => part === "" || part === "." || part === "..") ||
    /[:\p{Cc}]/u.test(row.path) ||
    typeof row.identity !== "string" ||
    row.identity.length === 0 ||
    typeof row.volumeIdentity !== "string" ||
    row.volumeIdentity.length === 0 ||
    row.symlink !== false ||
    row.reparse !== false ||
    row.junction !== false ||
    row.mount !== false ||
    row.stable !== true ||
    row.hardLinkCount !== 1 ||
    (row.kind === "D"
      ? row.directory !== true || row.regular !== false
      : row.regular !== true || row.directory !== false)
  )
    fail(OUTER_FAILURES.ROOT_MANIFEST_INVALID);
  if (row.kind === "F" && (!integer(row.byteCount, 0, MAX_BYTES) || !HEX64.test(row.sha256)))
    fail(OUTER_FAILURES.ROOT_MANIFEST_INVALID);
}

export function canonicalRootManifest(rows, expected = null) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_FILES + MAX_DIRECTORIES)
    fail(OUTER_FAILURES.ROOT_MANIFEST_INVALID);
  const paths = new Set();
  const folded = new Set();
  const identities = new Set();
  let volume = null;
  let fileCount = 0;
  let directoryCount = 0;
  let byteCount = 0;
  const normalized = rows.map((row) => {
    validateRow(row);
    const fold = row.path.normalize("NFC").toLocaleLowerCase("en-US");
    if (
      paths.has(row.path) ||
      folded.has(fold) ||
      identities.has(row.identity) ||
      (volume !== null && volume !== row.volumeIdentity)
    )
      fail(OUTER_FAILURES.ROOT_MANIFEST_INVALID);
    paths.add(row.path);
    folded.add(fold);
    identities.add(row.identity);
    volume ??= row.volumeIdentity;
    if (row.kind === "F") {
      fileCount = add(fileCount, 1, MAX_FILES);
      byteCount = add(byteCount, row.byteCount, MAX_BYTES);
    } else directoryCount = add(directoryCount, 1, MAX_DIRECTORIES);
    return freeze({ ...row });
  });
  normalized.sort(
    (a, b) =>
      Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)) ||
      Buffer.compare(Buffer.from(a.kind), Buffer.from(b.kind)),
  );
  const raw = normalized
    .map((row) =>
      row.kind === "D" ? `D\0${row.path}\n` : `F\0${row.path}\0${row.byteCount}\0${row.sha256}\n`,
    )
    .join("");
  const result = freeze({
    schema: ROOT_MANIFEST_SCHEMA,
    sha256: digest(raw),
    fileCount,
    directoryCount,
    byteCount,
    rows: normalized,
  });
  if (
    expected !== null &&
    (!exact(expected, ["sha256", "fileCount", "directoryCount", "byteCount"]) ||
      Object.keys(expected).some((key) => expected[key] !== result[key]))
  )
    fail(OUTER_FAILURES.ROOT_MANIFEST_INVALID);
  return result;
}

export function consumptionMarker(fields) {
  if (
    !exact(fields, MARKER_KEYS) ||
    fields.schemaVersion !== 1 ||
    fields.state !== "CONSUMED_PRESPAWN" ||
    !HEX64.test(fields.transactionId) ||
    !HEX40.test(fields.sourceCommit) ||
    !MARKER_KEYS.slice(4, 8).every((key) => HEX64.test(fields[key])) ||
    JSON.stringify(fields.expectedVersion) !== "[3,12,5]" ||
    fields.provenance !== "PSF_CPYTHON_INTERPRETER" ||
    !HEX64.test(fields.signatureEvidenceSha256)
  )
    fail("REVIEWED_LOCAL_MARKER_INVALID");
  canonical(fields, 2_048, "REVIEWED_LOCAL_MARKER_INVALID");
  return freeze({ ...fields });
}

export function settlementRecord(fields, context) {
  const validStage = fields?.stage === "SUCCESS" || Object.hasOwn(OUTER_FAILURES, fields?.stage);
  const unknown = fields?.state === "SETTLED_UNKNOWN_HOLD";
  const nullableInteger = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) =>
    (unknown && value === null) || integer(value, minimum, maximum);
  const nullableBoolean = (value) => (unknown && value === null) || typeof value === "boolean";
  const nullableHex = (value) => (unknown && value === null) || HEX64.test(value);
  const nullableSignal = (value) => value === null || ["NONE", "TIMEOUT", "SIGNAL"].includes(value);
  if (
    !exact(context, [
      "expectedSuccessStdoutByteCount",
      "expectedSuccessStdoutSha256",
      "emptySha256",
    ]) ||
    !integer(context.expectedSuccessStdoutByteCount, 1, 4_096) ||
    !HEX64.test(context.expectedSuccessStdoutSha256) ||
    context.emptySha256 !== EMPTY_SHA256 ||
    !exact(fields, SETTLEMENT_KEYS) ||
    fields.schemaVersion !== 1 ||
    !HEX64.test(fields.transactionId) ||
    !["SETTLED_SUCCESS", "SETTLED_FAILURE", "SETTLED_UNKNOWN_HOLD"].includes(fields.state) ||
    fields.candidateClass !== "REVIEWED_LOCAL" ||
    !validStage ||
    (fields.stage === "SUCCESS"
      ? fields.failureCode !== null
      : fields.failureCode !== OUTER_FAILURES[fields.stage]) ||
    !HEX64.test(fields.publicBindingDigest) ||
    !HEX64.test(fields.rootManifestSha256) ||
    !HEX64.test(fields.signatureEvidenceSha256) ||
    !integer(fields.rootFileCount, 1, MAX_FILES) ||
    !integer(fields.rootDirectoryCount, 1, MAX_DIRECTORIES) ||
    !integer(fields.rootByteCount, 1, MAX_BYTES) ||
    !nullableBoolean(fields.childSpawnAttempted) ||
    !nullableBoolean(fields.childStarted) ||
    !nullableBoolean(fields.exitObserved) ||
    !(fields.exitCode === null || Number.isSafeInteger(fields.exitCode)) ||
    !nullableSignal(fields.signalClass) ||
    !nullableInteger(fields.stdoutByteCount, 0, 4_096) ||
    !nullableHex(fields.stdoutSha256) ||
    !nullableInteger(fields.stderrByteCount, 0, 4_096) ||
    !nullableHex(fields.stderrSha256) ||
    (fields.stdoutByteCount !== null &&
      fields.stderrByteCount !== null &&
      fields.stdoutByteCount + fields.stderrByteCount > 4_096) ||
    !nullableInteger(fields.processOwnerCount, 0, 1) ||
    !nullableInteger(fields.processResidualCount, 0, 1) ||
    !nullableInteger(fields.networkObservationCount, 0) ||
    !nullableInteger(fields.networkMaximumGapMicros, 0, 10_000) ||
    !nullableInteger(fields.networkEventCount, 0) ||
    !nullableInteger(fields.globalMutationCount, 0) ||
    !nullableBoolean(fields.rootFinalRevalidated)
  )
    fail("REVIEWED_LOCAL_SETTLEMENT_INVALID");
  if (
    fields.state === "SETTLED_SUCCESS" &&
    !(
      fields.stage === "SUCCESS" &&
      fields.childSpawnAttempted &&
      fields.childStarted &&
      fields.exitObserved &&
      fields.exitCode === 0 &&
      fields.signalClass === "NONE" &&
      fields.processOwnerCount === 1 &&
      fields.processResidualCount === 0 &&
      fields.networkObservationCount >= 1 &&
      fields.networkMaximumGapMicros <= 10_000 &&
      fields.networkEventCount === 0 &&
      fields.globalMutationCount === 0 &&
      fields.rootFinalRevalidated &&
      fields.stdoutByteCount === context.expectedSuccessStdoutByteCount &&
      fields.stdoutSha256 === context.expectedSuccessStdoutSha256 &&
      fields.stderrByteCount === 0 &&
      fields.stderrSha256 === context.emptySha256
    )
  )
    fail("REVIEWED_LOCAL_SETTLEMENT_INVALID");
  if (
    fields.state === "SETTLED_FAILURE" &&
    !(
      fields.stage !== "SUCCESS" &&
      fields.childSpawnAttempted === true &&
      fields.processResidualCount === 0 &&
      fields.networkObservationCount >= 1 &&
      fields.networkMaximumGapMicros <= 10_000 &&
      fields.networkEventCount === 0 &&
      fields.globalMutationCount === 0 &&
      fields.rootFinalRevalidated === true &&
      (fields.childStarted === false
        ? fields.exitObserved === false &&
          fields.exitCode === null &&
          fields.signalClass === null &&
          fields.processOwnerCount === 0
        : fields.childStarted === true &&
          fields.exitObserved === true &&
          fields.exitCode !== null &&
          fields.signalClass !== null &&
          fields.processOwnerCount === 1)
    )
  )
    fail("REVIEWED_LOCAL_SETTLEMENT_INVALID");
  if (
    unknown &&
    (fields.stage === "SUCCESS" ||
      fields.failureCode === null ||
      (fields.childStarted === false && fields.processOwnerCount === 1) ||
      (fields.childStarted === true && fields.processOwnerCount === 0))
  )
    fail("REVIEWED_LOCAL_SETTLEMENT_INVALID");
  canonical(fields, 4_096, "REVIEWED_LOCAL_SETTLEMENT_INVALID");
  return freeze({ ...fields });
}

export function outerReceipt(fields, context) {
  const markerStates = ["VALID", "ABSENT", "PARTIAL", "INVALID"];
  const settlementStates = [
    "SETTLED_SUCCESS",
    "SETTLED_FAILURE",
    "SETTLED_UNKNOWN_HOLD",
    "ABSENT",
    "INVALID",
  ];
  const holdState = !["REVIEWED_LOCAL_SUCCESS_CLEAN", "REVIEWED_LOCAL_FAILED_CLEAN"].includes(
    fields?.state,
  );
  const nullableInteger = (value) => (holdState && value === null) || integer(value);
  const nullableBoolean = (value) => (holdState && value === null) || typeof value === "boolean";
  if (
    !exact(context, [
      "markerState",
      "settlementState",
      "evidenceFileCount",
      "validEvidenceFileCount",
    ]) ||
    !markerStates.includes(context.markerState) ||
    !settlementStates.includes(context.settlementState) ||
    !exact(fields, RECEIPT_KEYS) ||
    fields.schemaVersion !== 1 ||
    !HEX64.test(fields.transactionId) ||
    !FINAL_STATES.includes(fields.state) ||
    !HEX64.test(fields.publicBindingDigest) ||
    !(fields.consumptionMarkerSha256 === null || HEX64.test(fields.consumptionMarkerSha256)) ||
    !(fields.settlementSha256 === null || HEX64.test(fields.settlementSha256)) ||
    !["CLEAN", "HOLD", "UNKNOWN_HOLD"].includes(fields.cleanupState) ||
    !["ZERO", "PRESERVED_OR_UNKNOWN_HOLD", "UNKNOWN_HOLD"].includes(fields.residueState) ||
    !nullableInteger(fields.ownedTempEntryCount) ||
    !nullableInteger(fields.processResidualCount) ||
    !nullableInteger(fields.networkEventCount) ||
    !nullableInteger(fields.globalMutationCount) ||
    !nullableBoolean(fields.rootFinalRevalidated) ||
    !integer(fields.evidenceFileCount, 1, 3) ||
    !integer(fields.validEvidenceFileCount, 1, fields.evidenceFileCount) ||
    fields.evidenceFileCount !== context.evidenceFileCount ||
    fields.validEvidenceFileCount !== context.validEvidenceFileCount ||
    fields.evidenceRetention !== "PERMANENT_LOCAL_NON_PRODUCT_EVIDENCE_DO_NOT_DELETE"
  )
    fail("REVIEWED_LOCAL_RECEIPT_INVALID");
  const cleanEvidence =
    fields.cleanupState === "CLEAN" &&
    fields.residueState === "ZERO" &&
    fields.ownedTempEntryCount === 0 &&
    fields.processResidualCount === 0 &&
    fields.networkEventCount === 0 &&
    fields.globalMutationCount === 0 &&
    fields.rootFinalRevalidated &&
    fields.evidenceFileCount === 3 &&
    fields.validEvidenceFileCount === 3 &&
    fields.settlementSha256 !== null;
  if (
    fields.state === "REVIEWED_LOCAL_SUCCESS_CLEAN" &&
    !(
      context.markerState === "VALID" &&
      context.settlementState === "SETTLED_SUCCESS" &&
      cleanEvidence
    )
  )
    fail("REVIEWED_LOCAL_RECEIPT_INVALID");
  if (
    fields.state === "REVIEWED_LOCAL_FAILED_CLEAN" &&
    !(
      context.markerState === "VALID" &&
      context.settlementState === "SETTLED_FAILURE" &&
      cleanEvidence
    )
  )
    fail("REVIEWED_LOCAL_RECEIPT_INVALID");
  if (
    fields.state === "REVIEWED_LOCAL_FAILED_CLEANUP_HOLD" &&
    !(
      context.markerState === "VALID" &&
      ["SETTLED_SUCCESS", "SETTLED_FAILURE", "SETTLED_UNKNOWN_HOLD"].includes(
        context.settlementState,
      ) &&
      fields.cleanupState === "HOLD" &&
      fields.residueState === "PRESERVED_OR_UNKNOWN_HOLD"
    )
  )
    fail("REVIEWED_LOCAL_RECEIPT_INVALID");
  if (
    fields.state === "REVIEWED_LOCAL_RESULT_UNKNOWN_HOLD" &&
    !(
      context.markerState === "VALID" &&
      ["ABSENT", "SETTLED_UNKNOWN_HOLD"].includes(context.settlementState) &&
      (context.settlementState !== "ABSENT") === (fields.settlementSha256 !== null)
    )
  )
    fail("REVIEWED_LOCAL_RECEIPT_INVALID");
  if (
    fields.state === "REVIEWED_LOCAL_MARKER_INCOMPLETE_HOLD" &&
    !(
      context.markerState !== "VALID" &&
      fields.consumptionMarkerSha256 === null &&
      fields.settlementSha256 === null &&
      context.settlementState === "ABSENT" &&
      fields.cleanupState !== "CLEAN" &&
      fields.residueState !== "ZERO" &&
      ((context.markerState === "ABSENT" &&
        fields.evidenceFileCount === 1 &&
        fields.validEvidenceFileCount === 1) ||
        (context.markerState !== "ABSENT" &&
          fields.validEvidenceFileCount < fields.evidenceFileCount))
    )
  )
    fail("REVIEWED_LOCAL_RECEIPT_INVALID");
  canonical(fields, 2_048, "REVIEWED_LOCAL_RECEIPT_INVALID");
  return freeze({ ...fields });
}

export function validateGlobalSnapshot(value) {
  if (
    !exact(value, GLOBAL_KEYS) ||
    value.schemaVersion !== 1 ||
    value.complete !== true ||
    GLOBAL_KEYS.slice(2).some((key) => !HEX64.test(value[key]))
  )
    fail(OUTER_FAILURES.GLOBAL_MUTATION);
  const computed = digest(
    JSON.stringify(Object.fromEntries(GLOBAL_KEYS.slice(2, -1).map((key) => [key, value[key]]))),
  );
  if (value.aggregateSha256 !== computed) fail(OUTER_FAILURES.GLOBAL_MUTATION);
  return freeze({ ...value });
}

export function validateNativeRequest(value) {
  const manifestFilesValid =
    Array.isArray(value?.rootManifestFiles) &&
    Object.isFrozen(value.rootManifestFiles) &&
    value.rootManifestFiles.length >= 1 &&
    value.rootManifestFiles.every(
      (row) =>
        Object.isFrozen(row) &&
        exact(row, ["path", "identity", "volumeIdentity", "byteCount", "sha256"]) &&
        typeof row.path === "string" &&
        row.path === row.path.normalize("NFC") &&
        !row.path.endsWith("/") &&
        !row.path.includes("\\") &&
        typeof row.identity === "string" &&
        row.identity.length > 0 &&
        typeof row.volumeIdentity === "string" &&
        row.volumeIdentity.length > 0 &&
        integer(row.byteCount, 0, MAX_BYTES) &&
        HEX64.test(row.sha256),
    ) &&
    value.rootManifestFiles.every(
      (row, index) =>
        index === 0 ||
        Buffer.compare(
          Buffer.from(value.rootManifestFiles[index - 1].path),
          Buffer.from(row.path),
        ) < 0,
    );
  if (
    !exact(value, NATIVE_REQUEST_KEYS) ||
    !HEX64.test(value.transactionId) ||
    !HEX64.test(value.executableSha256) ||
    !manifestFilesValid ||
    value.timeoutMs !== 10_000 ||
    value.combinedCapBytes !== 4_096 ||
    !integer(value.networkPollTargetMicros, 1, 2_500) ||
    value.networkMaximumGapMicros !== 10_000 ||
    value.introspectionUtf8 !== REVIEWED_LOCAL_BOOTSTRAP_V2 ||
    Buffer.byteLength(value.introspectionUtf8) !== 678 ||
    value.introspectionSha256 !== REVIEWED_LOCAL_BOOTSTRAP_V2_SHA256 ||
    digest(value.introspectionUtf8) !== value.introspectionSha256 ||
    ["executablePath", "rootPath", "trustedTempRootPath", "ownedPath", "systemRoot"].some(
      (key) => typeof value[key] !== "string" || !win32.isAbsolute(value[key]),
    )
  )
    fail(OUTER_FAILURES.PROCESS_INVALID);
  return freeze({ ...value });
}

export function validateIntrospectionOutput(native, request, packet) {
  if (
    native.exitCode !== 0 ||
    native.signalClass !== "NONE" ||
    native.stderrBytes.length !== 0 ||
    native.stdoutBytes.length === 0 ||
    native.stdoutBytes.length > 4_096 ||
    native.stdoutBytes[0] === 0xef ||
    !native.stdoutBytes.subarray(-2).equals(Buffer.from("\r\n"))
  )
    fail(OUTER_FAILURES.PROCESS_INVALID);
  let raw;
  let parsed;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(native.stdoutBytes);
    if (raw.slice(0, -2).includes("\r") || raw.slice(0, -2).includes("\n"))
      fail(OUTER_FAILURES.PROCESS_INVALID);
    parsed = JSON.parse(raw.slice(0, -2));
  } catch {
    fail(OUTER_FAILURES.PROCESS_INVALID);
  }
  if (
    !exact(parsed, ["executable", "sha256", "version"]) ||
    JSON.stringify(parsed) + "\r\n" !== raw ||
    typeof parsed.executable !== "string" ||
    parsed.executable !== parsed.executable.normalize("NFC") ||
    !win32.isAbsolute(parsed.executable) ||
    win32.normalize(parsed.executable) !== parsed.executable ||
    parsed.executable !== request.executablePath ||
    parsed.sha256 !== packet.expectedExecutableSha256 ||
    JSON.stringify(parsed.version) !== "[3,12,5]"
  )
    fail(OUTER_FAILURES.PROCESS_INVALID);
  return freeze({
    stdoutByteCount: native.stdoutBytes.length,
    stdoutSha256: digest(native.stdoutBytes),
  });
}

const LOADED_IMAGE_OBSERVATION_KEYS = Object.freeze([
  "initialPath",
  "finalPath",
  "relativeRootPath",
  "initialIdentity",
  "finalIdentity",
  "initialVolumeIdentity",
  "finalVolumeIdentity",
  "initialByteCount",
  "finalByteCount",
  "initialSha256",
  "finalSha256",
  "regular",
  "reparse",
  "mount",
  "stable",
  "system32RootIdentity",
]);

export function validateLoadedImageEvidenceForTesting({
  observations,
  rootManifestFiles,
  system32Root,
}) {
  if (
    !Array.isArray(observations) ||
    observations.length < 1 ||
    !Array.isArray(rootManifestFiles) ||
    rootManifestFiles.length < 1 ||
    !exact(system32Root, ["path", "identity", "volumeIdentity"]) ||
    typeof system32Root.path !== "string" ||
    !win32.isAbsolute(system32Root.path) ||
    typeof system32Root.identity !== "string" ||
    !/^[0-9a-f]{32}$/u.test(system32Root.identity) ||
    !/^[0-9a-f]{16}$/u.test(system32Root.volumeIdentity)
  )
    fail(OUTER_FAILURES.PROCESS_INVALID);
  const expected = new Map(rootManifestFiles.map((row) => [row.path, row]));
  if (expected.size !== rootManifestFiles.length) fail(OUTER_FAILURES.PROCESS_INVALID);
  const seen = new Set();
  const rows = [];
  let rootManifestImageCount = 0;
  let system32ImageCount = 0;
  const system32Prefix = `${system32Root.path.replace(/\\+$/u, "")}\\`;
  for (const observed of observations) {
    if (
      !exact(observed, LOADED_IMAGE_OBSERVATION_KEYS) ||
      !observed.regular ||
      observed.reparse ||
      observed.mount ||
      !observed.stable ||
      observed.initialPath !== observed.finalPath ||
      observed.initialIdentity !== observed.finalIdentity ||
      observed.initialVolumeIdentity !== observed.finalVolumeIdentity ||
      observed.initialByteCount !== observed.finalByteCount ||
      observed.initialSha256 !== observed.finalSha256 ||
      !integer(observed.initialByteCount) ||
      !HEX64.test(observed.initialSha256) ||
      !/^[0-9a-f]{32}$/u.test(observed.initialIdentity) ||
      !/^[0-9a-f]{16}$/u.test(observed.initialVolumeIdentity)
    )
      fail(OUTER_FAILURES.PROCESS_INVALID);
    const identityKey = `${observed.initialVolumeIdentity}\0${observed.initialIdentity}`;
    if (seen.has(identityKey)) fail(OUTER_FAILURES.PROCESS_INVALID);
    seen.add(identityKey);
    const manifest =
      observed.relativeRootPath === null ? undefined : expected.get(observed.relativeRootPath);
    const inSystem32 =
      observed.system32RootIdentity === system32Root.identity &&
      observed.initialVolumeIdentity === system32Root.volumeIdentity &&
      observed.initialPath.toLowerCase().startsWith(system32Prefix.toLowerCase());
    if (manifest !== undefined && inSystem32) fail(OUTER_FAILURES.PROCESS_INVALID);
    let classification;
    if (manifest !== undefined) {
      if (
        manifest.identity !== observed.initialIdentity ||
        manifest.volumeIdentity !== observed.initialVolumeIdentity ||
        manifest.byteCount !== observed.initialByteCount ||
        manifest.sha256 !== observed.initialSha256
      )
        fail(OUTER_FAILURES.PROCESS_INVALID);
      classification = "ROOT_MANIFEST";
      rootManifestImageCount += 1;
    } else if (observed.relativeRootPath === null && inSystem32) {
      classification = "SYSTEM32";
      system32ImageCount += 1;
    } else fail(OUTER_FAILURES.PROCESS_INVALID);
    rows.push(
      `${classification}\0${observed.initialVolumeIdentity}\0${observed.initialIdentity}\0${observed.initialByteCount}\0${observed.initialSha256}\n`,
    );
  }
  rows.sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const result = {
    loadedImageCount: observations.length,
    rootManifestImageCount,
    system32ImageCount,
    loadedImageEvidenceSha256: digest(rows.join("")),
  };
  return freeze(result);
}

const NATIVE_TERMINAL_TOKENS = Object.freeze([
  "OBSERVE_SUSPENDED",
  "RESUME",
  "READY_RECEIVED",
  "OBSERVE_READY",
  "SEND_LOAD",
  "LOADED_RECEIVED",
  "OBSERVE_LOADED",
  "SEND_GO",
  "TERMINATE_JOB",
  "WAIT_SIGNALED",
  "REVALIDATE_HELD",
  "JOIN_STREAMS",
  "READ_EXIT_CODE",
  "COMPLETE",
]);

function closedArray(value, code) {
  try {
    if (
      !Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Array.prototype ||
      utilTypes.isProxy(value)
    )
      fail(code);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const names = Reflect.ownKeys(descriptors);
    if (
      names.some((name) => typeof name !== "string") ||
      names.length !== value.length + 1 ||
      names[names.length - 1] !== "length"
    )
      fail(code);
    const items = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (descriptor === undefined || !("value" in descriptor)) fail(code);
      items.push(descriptor.value);
    }
    return items;
  } catch {
    fail(code);
  }
}

export function validateNativeTerminalTraceForTesting(trace) {
  const tokens = closedArray(trace, OUTER_FAILURES.PROCESS_INVALID);
  const accepted = [
    "OBSERVE_SUSPENDED",
    "RESUME",
    "READY_RECEIVED",
    "OBSERVE_READY",
    "SEND_LOAD",
    "LOADED_RECEIVED",
    "OBSERVE_LOADED",
    "SEND_GO",
    "WAIT_SIGNALED",
    "REVALIDATE_HELD",
    "JOIN_STREAMS",
    "READ_EXIT_CODE",
    "COMPLETE",
  ];
  if (
    tokens.some((token) => !NATIVE_TERMINAL_TOKENS.includes(token)) ||
    JSON.stringify(tokens) !== JSON.stringify(accepted)
  )
    fail(OUTER_FAILURES.PROCESS_INVALID);
  return freeze(tokens);
}

function captureBudgetEvent(value) {
  try {
    if (!plain(value) || !Object.isFrozen(value) || utilTypes.isProxy(value))
      fail(OUTER_FAILURES.PROCESS_INVALID);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const names = Reflect.ownKeys(descriptors);
    if (
      names.length !== 2 ||
      names[0] !== "stream" ||
      names[1] !== "byteCount" ||
      !("value" in descriptors.stream) ||
      !("value" in descriptors.byteCount)
    )
      fail(OUTER_FAILURES.PROCESS_INVALID);
    const stream = descriptors.stream.value;
    const byteCount = descriptors.byteCount.value;
    if (!["STDOUT", "STDERR"].includes(stream) || !integer(byteCount, 1, 4_097))
      fail(OUTER_FAILURES.PROCESS_INVALID);
    return { stream, byteCount };
  } catch {
    fail(OUTER_FAILURES.PROCESS_INVALID);
  }
}

export function validateCombinedCaptureTraceForTesting(value) {
  let cap;
  let rawEvents;
  try {
    if (!plain(value) || !Object.isFrozen(value) || utilTypes.isProxy(value))
      fail(OUTER_FAILURES.PROCESS_INVALID);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const names = Reflect.ownKeys(descriptors);
    if (
      names.length !== 2 ||
      names[0] !== "cap" ||
      names[1] !== "events" ||
      !("value" in descriptors.cap) ||
      !("value" in descriptors.events)
    )
      fail(OUTER_FAILURES.PROCESS_INVALID);
    cap = descriptors.cap.value;
    rawEvents = descriptors.events.value;
  } catch {
    fail(OUTER_FAILURES.PROCESS_INVALID);
  }
  if (cap !== 4_096) fail(OUTER_FAILURES.PROCESS_INVALID);
  if (!Object.isFrozen(rawEvents)) fail(OUTER_FAILURES.PROCESS_INVALID);
  const events = closedArray(rawEvents, OUTER_FAILURES.PROCESS_INVALID).map(captureBudgetEvent);
  let acceptedByteCount = 0;
  let overflowed = false;
  let terminateCount = 0;
  for (const event of events) {
    if (overflowed) continue;
    if (acceptedByteCount > cap - event.byteCount) {
      overflowed = true;
      terminateCount = 1;
      continue;
    }
    acceptedByteCount += event.byteCount;
  }
  return freeze({ acceptedByteCount, overflowed, terminateCount, joinCount: 2, closeCount: 2 });
}

export function validateTwoWriterCaptureInterleavingForTesting(value) {
  let cap;
  let barrierParticipantCount;
  let writers;
  let releaseOrder;
  try {
    if (!plain(value) || !Object.isFrozen(value) || utilTypes.isProxy(value))
      fail(OUTER_FAILURES.PROCESS_INVALID);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const names = Reflect.ownKeys(descriptors);
    const expected = ["cap", "barrierParticipantCount", "writers", "releaseOrder"];
    if (
      JSON.stringify(names) !== JSON.stringify(expected) ||
      expected.some((name) => !("value" in descriptors[name]))
    )
      fail(OUTER_FAILURES.PROCESS_INVALID);
    cap = descriptors.cap.value;
    barrierParticipantCount = descriptors.barrierParticipantCount.value;
    writers = descriptors.writers.value;
    releaseOrder = descriptors.releaseOrder.value;
  } catch {
    fail(OUTER_FAILURES.PROCESS_INVALID);
  }
  if (
    cap !== 4_096 ||
    barrierParticipantCount !== 2 ||
    !Object.isFrozen(writers) ||
    !Object.isFrozen(releaseOrder)
  )
    fail(OUTER_FAILURES.PROCESS_INVALID);
  const capturedWriters = closedArray(writers, OUTER_FAILURES.PROCESS_INVALID).map(
    captureBudgetEvent,
  );
  const capturedOrder = closedArray(releaseOrder, OUTER_FAILURES.PROCESS_INVALID);
  if (
    capturedWriters.length !== 2 ||
    capturedWriters[0].stream !== "STDOUT" ||
    capturedWriters[0].byteCount !== 2_048 ||
    capturedWriters[1].stream !== "STDERR" ||
    capturedWriters[1].byteCount !== 2_049 ||
    capturedOrder.length !== 2 ||
    new Set(capturedOrder).size !== 2 ||
    !capturedOrder.includes("STDOUT") ||
    !capturedOrder.includes("STDERR")
  )
    fail(OUTER_FAILURES.PROCESS_INVALID);
  const byStream = new Map(capturedWriters.map((writer) => [writer.stream, writer]));
  const result = validateCombinedCaptureTraceForTesting(
    freeze({ cap, events: capturedOrder.map((stream) => freeze(byStream.get(stream))) }),
  );
  return freeze({
    acceptedByteCount: result.acceptedByteCount,
    overflowed: result.overflowed,
    terminateCount: result.terminateCount,
    joinCount: result.joinCount,
    closeCount: result.closeCount,
    barrierParticipantCount,
  });
}

export function validateNativeResult(value) {
  if (
    !exact(value, NATIVE_RESULT_KEYS) ||
    typeof value.childStarted !== "boolean" ||
    typeof value.exitObserved !== "boolean" ||
    !(value.exitCode === null || Number.isSafeInteger(value.exitCode)) ||
    !["NONE", "TIMEOUT", "SIGNAL"].includes(value.signalClass) ||
    !Buffer.isBuffer(value.stdoutBytes) ||
    !Buffer.isBuffer(value.stderrBytes) ||
    value.stdoutBytes.length + value.stderrBytes.length > 4_096 ||
    !integer(value.processOwnerCount, 0, 1) ||
    !integer(value.processResidualCount, 0, 1) ||
    !integer(value.networkObservationCount, 1) ||
    !integer(value.networkMaximumGapMicros, 0, 10_000) ||
    !integer(value.networkEventCount) ||
    typeof value.loadedImageBoundaryValid !== "boolean" ||
    !integer(value.loadedImageCount, 1) ||
    !integer(value.rootManifestImageCount, 0) ||
    !integer(value.system32ImageCount, 0) ||
    value.loadedImageCount !== value.rootManifestImageCount + value.system32ImageCount ||
    !HEX64.test(value.loadedImageEvidenceSha256) ||
    typeof value.globalBefore !== "string" ||
    typeof value.globalAfter !== "string" ||
    !integer(value.ownedResidueCount)
  )
    fail(OUTER_FAILURES.PROCESS_INVALID);
  if (
    value.processOwnerCount !== (value.childStarted ? 1 : 0) ||
    value.processResidualCount !== 0 ||
    value.networkEventCount !== 0 ||
    !value.loadedImageBoundaryValid ||
    value.globalBefore !== value.globalAfter
  )
    fail(OUTER_FAILURES.PROCESS_INVALID);
  return value;
}

function validateNetwork(value) {
  if (
    !exact(value, ["complete", "observationCount", "maximumGapMicros", "eventCount"]) ||
    value.complete !== true ||
    !integer(value.observationCount, 1) ||
    !integer(value.maximumGapMicros, 0, 10_000) ||
    value.eventCount !== 0
  )
    fail(OUTER_FAILURES.NETWORK_INVALID);
  return freeze({ ...value });
}

function fixedFailureCode(error, stage) {
  const observed = error instanceof Error ? error.message : "";
  if (Object.values(OUTER_FAILURES).includes(observed)) return observed;
  return Object.hasOwn(OUTER_FAILURES, stage)
    ? OUTER_FAILURES[stage]
    : OUTER_FAILURES.INTERNAL_FIXED_FAILURE;
}

function settlementFields({ packet, root, native, network, state, stage, failureCode }) {
  const observed = native !== null;
  const stdout = observed && Buffer.isBuffer(native.stdoutBytes) ? native.stdoutBytes : null;
  const stderr = observed && Buffer.isBuffer(native.stderrBytes) ? native.stderrBytes : null;
  const unknown = state === "SETTLED_UNKNOWN_HOLD";
  return {
    schemaVersion: 1,
    transactionId: packet.transactionId,
    state,
    candidateClass: "REVIEWED_LOCAL",
    stage,
    failureCode,
    publicBindingDigest: packet.publicBindingDigest,
    rootManifestSha256: root.sha256,
    rootFileCount: root.fileCount,
    rootDirectoryCount: root.directoryCount,
    rootByteCount: root.byteCount,
    signatureEvidenceSha256: packet.signatureEvidence.evidenceSha256,
    childSpawnAttempted: observed ? true : unknown ? null : true,
    childStarted: observed ? native.childStarted : unknown ? null : false,
    exitObserved: observed ? native.exitObserved : unknown ? null : false,
    exitCode: observed ? native.exitCode : null,
    signalClass: observed ? native.signalClass : null,
    stdoutByteCount: stdout === null ? null : stdout.length,
    stdoutSha256: stdout === null ? null : digest(stdout),
    stderrByteCount: stderr === null ? null : stderr.length,
    stderrSha256: stderr === null ? null : digest(stderr),
    processOwnerCount: observed ? native.processOwnerCount : unknown ? null : 0,
    processResidualCount: observed ? native.processResidualCount : unknown ? null : 0,
    networkObservationCount: network?.observationCount ?? null,
    networkMaximumGapMicros: network?.maximumGapMicros ?? null,
    networkEventCount: network?.eventCount ?? null,
    globalMutationCount: observed ? (native.globalBefore === native.globalAfter ? 0 : 1) : null,
    rootFinalRevalidated: unknown ? null : true,
  };
}

function expectedSettlementContext(request, packet) {
  const expected = Buffer.from(
    `${JSON.stringify({
      executable: request.executablePath,
      sha256: packet.expectedExecutableSha256,
      version: [3, 12, 5],
    })}\r\n`,
  );
  return freeze({
    expectedSuccessStdoutByteCount: expected.length,
    expectedSuccessStdoutSha256: digest(expected),
    emptySha256: EMPTY_SHA256,
  });
}

function cleanupOwned(dependencies, owned, trustedTemp) {
  dependencies.revalidateOwnedTemp(owned, trustedTemp);
  const before = dependencies.inspectOwnedTemp(owned);
  if (!integer(before)) fail(OUTER_FAILURES.CLEANUP_INVALID);
  const result = dependencies.cleanupOwnedTemp(owned, trustedTemp);
  if (result !== "CLEAN")
    return freeze({ clean: false, residue: before, ownedTempEntryCount: before });
  dependencies.revalidateOwnedTemp(owned, trustedTemp);
  const after = dependencies.inspectOwnedTemp(owned);
  if (after !== 0) return freeze({ clean: false, residue: after, ownedTempEntryCount: after });
  return freeze({ clean: true, residue: 0, ownedTempEntryCount: 0 });
}

function buildReceipt({
  packet,
  markerSha256,
  settlementSha256,
  markerState,
  settlementState,
  cleanup,
  native,
  network,
  rootFinalRevalidated,
  evidenceFileCount,
  validEvidenceFileCount,
  state,
}) {
  const fields = {
    schemaVersion: 1,
    transactionId: packet.transactionId,
    state,
    publicBindingDigest: packet.publicBindingDigest,
    consumptionMarkerSha256: markerState === "VALID" ? markerSha256 : null,
    settlementSha256: ["SETTLED_SUCCESS", "SETTLED_FAILURE", "SETTLED_UNKNOWN_HOLD"].includes(
      settlementState,
    )
      ? settlementSha256
      : null,
    cleanupState: cleanup.clean ? "CLEAN" : "HOLD",
    residueState: cleanup.clean ? "ZERO" : "PRESERVED_OR_UNKNOWN_HOLD",
    ownedTempEntryCount: cleanup.ownedTempEntryCount ?? cleanup.residue ?? null,
    processResidualCount: native?.processResidualCount ?? null,
    networkEventCount: network?.eventCount ?? null,
    globalMutationCount:
      native === null || native === undefined
        ? null
        : native.globalBefore === native.globalAfter
          ? 0
          : 1,
    rootFinalRevalidated,
    evidenceFileCount,
    validEvidenceFileCount,
    evidenceRetention: "PERMANENT_LOCAL_NON_PRODUCT_EVIDENCE_DO_NOT_DELETE",
  };
  return outerReceipt(fields, {
    markerState,
    settlementState,
    evidenceFileCount,
    validEvidenceFileCount,
  });
}

function persist(dependencies, directory, name, value, cap) {
  const raw = Buffer.from(canonical(value, cap, "REVIEWED_LOCAL_EVIDENCE_INVALID"));
  const handle = dependencies.openEvidenceExclusive(directory, name);
  try {
    dependencies.writeEvidence(handle, raw);
    dependencies.fsyncEvidence(handle);
  } finally {
    dependencies.closeEvidence(handle);
  }
  dependencies.fsyncDirectory(directory);
  const reopened = dependencies.reopenEvidence(directory, name);
  let observed;
  try {
    observed = dependencies.readEvidence(reopened, cap + 1);
  } finally {
    dependencies.closeEvidence(reopened);
  }
  if (!Buffer.isBuffer(observed) || !observed.equals(raw))
    fail("REVIEWED_LOCAL_EVIDENCE_REOPEN_INVALID");
  return digest(observed);
}

function parseCanonicalEvidence(bytes, cap, code, validator) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > cap) return null;
  try {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const value = JSON.parse(raw);
    const validated = validator(value);
    if (canonical(validated, cap, code) !== raw) return null;
    return validated;
  } catch {
    return null;
  }
}

function inventoryEvidence(dependencies, directory, settlementContext) {
  const observed = dependencies.inventoryEvidenceDirectory(directory);
  if (
    !exact(observed, ["entries", "extraEntryCount"]) ||
    observed.extraEntryCount !== 0 ||
    !Array.isArray(observed.entries) ||
    observed.entries.length !== EVIDENCE_FILES.length
  )
    fail("REVIEWED_LOCAL_EVIDENCE_INVENTORY_INVALID");
  const entries = observed.entries.map((entry, index) => {
    if (
      !exact(entry, ["name", "present", "regular", "reparse", "identityStable", "bytes"]) ||
      entry.name !== EVIDENCE_FILES[index] ||
      typeof entry.present !== "boolean" ||
      typeof entry.regular !== "boolean" ||
      typeof entry.reparse !== "boolean" ||
      typeof entry.identityStable !== "boolean" ||
      !(entry.bytes === null || Buffer.isBuffer(entry.bytes)) ||
      (!entry.present && entry.bytes !== null) ||
      (entry.present && (!entry.regular || entry.reparse || !entry.identityStable))
    )
      fail("REVIEWED_LOCAL_EVIDENCE_INVENTORY_INVALID");
    return entry;
  });
  const marker = entries[0].present
    ? parseCanonicalEvidence(
        entries[0].bytes,
        2_048,
        "REVIEWED_LOCAL_MARKER_INVALID",
        consumptionMarker,
      )
    : null;
  const settlement = entries[1].present
    ? parseCanonicalEvidence(
        entries[1].bytes,
        4_096,
        "REVIEWED_LOCAL_SETTLEMENT_INVALID",
        (value) => settlementRecord(value, settlementContext),
      )
    : null;
  const evidenceFileCount = entries.filter((entry) => entry.present).length;
  const validBeforeReceipt = Number(marker !== null) + Number(settlement !== null);
  let receipt = null;
  if (entries[2].present) {
    receipt = parseCanonicalEvidence(
      entries[2].bytes,
      2_048,
      "REVIEWED_LOCAL_RECEIPT_INVALID",
      (value) =>
        outerReceipt(value, {
          markerState: marker === null ? (entries[0].present ? "INVALID" : "ABSENT") : "VALID",
          settlementState:
            settlement === null ? (entries[1].present ? "INVALID" : "ABSENT") : settlement.state,
          evidenceFileCount,
          validEvidenceFileCount: validBeforeReceipt + 1,
        }),
    );
    if (
      receipt !== null &&
      ((marker !== null && receipt.consumptionMarkerSha256 !== digest(entries[0].bytes)) ||
        (settlement !== null && receipt.settlementSha256 !== digest(entries[1].bytes)))
    )
      receipt = null;
  }
  const validEvidenceFileCount = validBeforeReceipt + Number(receipt !== null);
  return freeze({
    entries,
    marker,
    settlement,
    receipt,
    markerState: marker === null ? (entries[0].present ? "INVALID" : "ABSENT") : "VALID",
    settlementState:
      settlement === null ? (entries[1].present ? "INVALID" : "ABSENT") : settlement.state,
    evidenceFileCount,
    validEvidenceFileCount,
  });
}

function validateInputs(request, dependencies) {
  if (
    !exact(request, REQUEST_KEYS) ||
    !HEX40.test(request.sourceCommit) ||
    !HEX64.test(request.policyDigest) ||
    !HEX64.test(request.expectedCommonDirIdentity) ||
    typeof request.privatePacketRaw !== "string" ||
    !exact(dependencies, DEPENDENCY_KEYS) ||
    DEPENDENCY_KEYS.filter((key) => key !== "nativeLease").some(
      (key) => typeof dependencies[key] !== "function",
    ) ||
    !plain(dependencies.nativeLease) ||
    typeof dependencies.nativeLease.available !== "boolean" ||
    typeof dependencies.nativeLease.request !== "function" ||
    typeof dependencies.nativeLease.Execute !== "function"
  )
    fail(OUTER_FAILURES.INTERNAL_FIXED_FAILURE);
}

export function executeReviewedLocalTransactionWithDependencies(request, dependencies) {
  validateInputs(request, dependencies);
  const repository = dependencies.verifyRepository(
    request.sourceCommit,
    request.policyDigest,
    request.expectedCommonDirIdentity,
  );
  if (
    !exact(repository, ["clean", "trackedExact", "indexExact", "reviewBindingValid"]) ||
    Object.values(repository).some((value) => value !== true)
  )
    fail(OUTER_FAILURES.REPOSITORY_INVALID);
  const common = dependencies.holdCommonDirectory(request.expectedCommonDirIdentity);
  dependencies.revalidateCommonDirectory(common, request.expectedCommonDirIdentity);
  const packet = parsePrivatePacket(request.privatePacketRaw);
  const expected = {
    sha256: packet.expectedRootManifestSha256,
    fileCount: packet.expectedRootFileCount,
    directoryCount: packet.expectedRootDirectoryCount,
    byteCount: packet.expectedRootByteCount,
  };
  const root = canonicalRootManifest(dependencies.walkRoot(packet.root), expected);
  dependencies.verifyExecutableAndSignature(packet, root);
  const trustedTemp = dependencies.holdTrustedWindowsTempRoot();
  dependencies.revalidateTrustedWindowsTempRoot(trustedTemp);
  const transaction = dependencies.createTransactionDirectoryExclusive(
    common,
    TRANSACTION_SUBDIRECTORY,
    packet.transactionId,
  );
  let owned = null;
  let observer = null;
  let markerSha256 = null;
  let settlementSha256 = null;
  let markerState = "ABSENT";
  let settlementState = "ABSENT";
  let globalBefore = null;
  let network = null;
  let native = null;
  let finalRoot = root;
  let stage = "INTERNAL_FIXED_FAILURE";
  let receiptCreationAttempted = false;
  let settlementContext = expectedSettlementContext(
    { executablePath: win32.join(packet.root, "python.exe") },
    packet,
  );
  const manifestFiles = Object.freeze(
    root.rows
      .filter((row) => row.kind === "F")
      .map((row) =>
        Object.freeze({
          path: row.path,
          identity: row.identity,
          volumeIdentity: row.volumeIdentity,
          byteCount: row.byteCount,
          sha256: row.sha256,
        }),
      ),
  );
  try {
    owned = dependencies.createOwnedTempExclusive(
      trustedTemp,
      TRANSACTION_SUBDIRECTORY,
      packet.transactionId,
    );
    dependencies.revalidateOwnedTemp(owned, trustedTemp);
    globalBefore = validateGlobalSnapshot(dependencies.captureGlobalSnapshot());
    observer = dependencies.startNetworkObserver({ targetMicros: 2_500, maximumGapMicros: 10_000 });
    dependencies.revalidateCommonDirectory(common, request.expectedCommonDirIdentity);
    finalRoot = canonicalRootManifest(dependencies.walkRoot(packet.root), expected);
    if (finalRoot.sha256 !== root.sha256) fail(OUTER_FAILURES.ROOT_MANIFEST_INVALID);
    dependencies.verifyExecutableAndSignature(packet, finalRoot);
    dependencies.revalidateTrustedWindowsTempRoot(trustedTemp);
    dependencies.revalidateOwnedTemp(owned, trustedTemp);
    const marker = consumptionMarker({
      schemaVersion: 1,
      transactionId: packet.transactionId,
      state: "CONSUMED_PRESPAWN",
      sourceCommit: request.sourceCommit,
      packetSha256: digest(request.privatePacketRaw),
      publicBindingDigest: packet.publicBindingDigest,
      expectedExecutableSha256: packet.expectedExecutableSha256,
      expectedRootManifestSha256: packet.expectedRootManifestSha256,
      expectedVersion: packet.expectedVersion,
      provenance: packet.provenance,
      signatureEvidenceSha256: packet.signatureEvidence.evidenceSha256,
    });
    markerState = "PARTIAL";
    markerSha256 = persist(dependencies, transaction, EVIDENCE_FILES[0], marker, 2_048);
    markerState = "VALID";
    if (!dependencies.nativeLease.available) {
      stage = "NATIVE_LEASE_UNAVAILABLE";
      fail(OUTER_FAILURES.NATIVE_LEASE_UNAVAILABLE);
    }
    stage = "PROCESS_INVALID";
    const nativeRequest = validateNativeRequest(
      dependencies.nativeLease.request(packet, owned, trustedTemp, manifestFiles, {
        introspectionUtf8: REVIEWED_LOCAL_BOOTSTRAP_V2,
        introspectionSha256: REVIEWED_LOCAL_BOOTSTRAP_V2_SHA256,
      }),
    );
    settlementContext = expectedSettlementContext(nativeRequest, packet);
    native = validateNativeResult(dependencies.nativeLease.Execute(nativeRequest));
    validateIntrospectionOutput(native, nativeRequest, packet);
    stage = "NETWORK_INVALID";
    network = validateNetwork(dependencies.stopNetworkObserver(observer));
    observer = null;
    stage = "ROOT_MANIFEST_INVALID";
    finalRoot = canonicalRootManifest(dependencies.walkRoot(packet.root), expected);
    stage = "GLOBAL_MUTATION";
    const globalAfter = validateGlobalSnapshot(dependencies.captureGlobalSnapshot());
    if (
      finalRoot.sha256 !== root.sha256 ||
      JSON.stringify(globalBefore) !== JSON.stringify(globalAfter)
    )
      fail(OUTER_FAILURES.GLOBAL_MUTATION);
    const success = native.exitObserved && native.exitCode === 0 && native.signalClass === "NONE";
    const settlement = settlementRecord(
      settlementFields({
        packet,
        root: finalRoot,
        native,
        network,
        state: success ? "SETTLED_SUCCESS" : "SETTLED_FAILURE",
        stage: success ? "SUCCESS" : "PROCESS_INVALID",
        failureCode: success ? null : OUTER_FAILURES.PROCESS_INVALID,
      }),
      settlementContext,
    );
    settlementState = settlement.state;
    settlementSha256 = persist(dependencies, transaction, EVIDENCE_FILES[1], settlement, 4_096);
    const beforeCleanup = inventoryEvidence(dependencies, transaction, settlementContext);
    if (
      beforeCleanup.markerState !== "VALID" ||
      beforeCleanup.settlementState !== settlement.state ||
      beforeCleanup.evidenceFileCount !== 2 ||
      beforeCleanup.validEvidenceFileCount !== 2 ||
      digest(beforeCleanup.entries[0].bytes) !== markerSha256 ||
      digest(beforeCleanup.entries[1].bytes) !== settlementSha256
    )
      fail("REVIEWED_LOCAL_EVIDENCE_INVENTORY_INVALID");
    stage = "CLEANUP_INVALID";
    const cleanup = cleanupOwned(dependencies, owned, trustedTemp);
    stage = "ROOT_MANIFEST_INVALID";
    finalRoot = canonicalRootManifest(dependencies.walkRoot(packet.root), expected);
    if (finalRoot.sha256 !== root.sha256) fail(OUTER_FAILURES.ROOT_MANIFEST_INVALID);
    const receipt = buildReceipt({
      packet,
      markerSha256,
      settlementSha256,
      markerState,
      settlementState,
      cleanup,
      native,
      network,
      rootFinalRevalidated: true,
      evidenceFileCount: beforeCleanup.evidenceFileCount + 1,
      validEvidenceFileCount: beforeCleanup.validEvidenceFileCount + 1,
      state: cleanup.clean
        ? success
          ? "REVIEWED_LOCAL_SUCCESS_CLEAN"
          : "REVIEWED_LOCAL_FAILED_CLEAN"
        : "REVIEWED_LOCAL_FAILED_CLEANUP_HOLD",
    });
    receiptCreationAttempted = true;
    persist(dependencies, transaction, EVIDENCE_FILES[2], receipt, 2_048);
    const afterReceipt = inventoryEvidence(dependencies, transaction, settlementContext);
    if (
      afterReceipt.evidenceFileCount !== receipt.evidenceFileCount ||
      afterReceipt.validEvidenceFileCount !== receipt.validEvidenceFileCount ||
      afterReceipt.receipt === null ||
      afterReceipt.receipt.state !== receipt.state
    )
      fail("REVIEWED_LOCAL_EVIDENCE_INVENTORY_INVALID");
    return receipt;
  } catch (error) {
    if (receiptCreationAttempted) {
      try {
        inventoryEvidence(dependencies, transaction, settlementContext);
      } catch {
        /* fixed out-of-band HOLD; preserve every evidence byte */
      }
      throw new Error(OUTER_FAILURES.INTERNAL_FIXED_FAILURE);
    }
    const failureCode = fixedFailureCode(error, stage);
    if (observer !== null) {
      try {
        network = validateNetwork(dependencies.stopNetworkObserver(observer));
      } catch {
        network = null;
      }
      observer = null;
    }
    if (markerState === "VALID") {
      const unknown = settlementRecord(
        settlementFields({
          packet,
          root: finalRoot,
          native,
          network,
          state: "SETTLED_UNKNOWN_HOLD",
          stage,
          failureCode,
        }),
        settlementContext,
      );
      settlementState = unknown.state;
      try {
        settlementSha256 = persist(dependencies, transaction, EVIDENCE_FILES[1], unknown, 4_096);
      } catch {
        settlementState = "INVALID";
      }
    }
    let cleanup = { clean: false, residue: null };
    if (settlementSha256 !== null && owned !== null) {
      try {
        cleanup = cleanupOwned(dependencies, owned, trustedTemp);
      } catch {
        cleanup = { clean: false, residue: null };
      }
    }
    const receiptState =
      markerState !== "VALID"
        ? "REVIEWED_LOCAL_MARKER_INCOMPLETE_HOLD"
        : cleanup.clean
          ? "REVIEWED_LOCAL_RESULT_UNKNOWN_HOLD"
          : "REVIEWED_LOCAL_FAILED_CLEANUP_HOLD";
    const beforeReceipt = inventoryEvidence(dependencies, transaction, settlementContext);
    const finalCount = Math.min(3, beforeReceipt.evidenceFileCount + 1);
    const finalValid = Math.min(finalCount, beforeReceipt.validEvidenceFileCount + 1);
    const receipt = buildReceipt({
      packet,
      markerSha256: markerState === "VALID" ? markerSha256 : null,
      settlementSha256: settlementState === "SETTLED_UNKNOWN_HOLD" ? settlementSha256 : null,
      markerState,
      settlementState: settlementState === "INVALID" ? "SETTLED_UNKNOWN_HOLD" : settlementState,
      cleanup,
      native,
      network,
      rootFinalRevalidated: null,
      evidenceFileCount: finalCount,
      validEvidenceFileCount: finalValid,
      state: receiptState,
    });
    try {
      receiptCreationAttempted = true;
      persist(dependencies, transaction, EVIDENCE_FILES[2], receipt, 2_048);
    } catch {
      throw new Error(OUTER_FAILURES.INTERNAL_FIXED_FAILURE);
    }
    const afterReceipt = inventoryEvidence(dependencies, transaction, settlementContext);
    if (
      afterReceipt.evidenceFileCount !== receipt.evidenceFileCount ||
      afterReceipt.validEvidenceFileCount !== receipt.validEvidenceFileCount ||
      afterReceipt.receipt === null
    )
      throw new Error(OUTER_FAILURES.INTERNAL_FIXED_FAILURE);
    return receipt;
  } finally {
    if (observer !== null) {
      try {
        dependencies.stopNetworkObserver(observer);
      } catch {
        /* fixed out-of-band HOLD */
      }
    }
  }
}

export const reviewedLocalTransactionTesting = Object.freeze({
  PACKET_KEYS,
  SIGNATURE_KEYS,
  MARKER_KEYS,
  SETTLEMENT_KEYS,
  RECEIPT_KEYS,
  NATIVE_REQUEST_KEYS,
  NATIVE_RESULT_KEYS,
  GLOBAL_KEYS,
  parsePrivatePacket,
  canonicalRootManifest,
  consumptionMarker,
  settlementRecord,
  outerReceipt,
  validateGlobalSnapshot,
  validateLoadedImageEvidenceForTesting,
  validateNativeTerminalTraceForTesting,
  validateCombinedCaptureTraceForTesting,
  validateTwoWriterCaptureInterleavingForTesting,
  validateNativeRequest,
  validateNativeResult,
  executeReviewedLocalTransactionWithDependencies,
});

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  if (
    process.argv.length !== 6 ||
    process.argv[2] !== "--execute-once-v2" ||
    !HEX40.test(process.argv[3] ?? "") ||
    !HEX64.test(process.argv[4] ?? "") ||
    !HEX64.test(process.argv[5] ?? "")
  )
    throw new Error("REVIEWED_LOCAL_USAGE_INVALID");
  throw new Error(OUTER_FAILURES.NATIVE_LEASE_UNAVAILABLE);
}
