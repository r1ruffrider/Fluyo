import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";

const ACTION_ROOT_KEYS = ["pythonLocation", "Python_ROOT_DIR", "Python3_ROOT_DIR"];
const CI_MARKER_KEYS = ["GITHUB_ACTIONS", "CI", "RUNNER_OS", "RUNNER_ARCH", "RUNNER_ENVIRONMENT"];
const CI_MARKER_VALUES = ["true", "true", "Windows", "X64", "github-hosted"];
const INTROSPECTION =
  'import hashlib,json,os,sys;p=os.path.realpath(sys.executable);f=open(p,"rb",buffering=0);h=hashlib.file_digest(f,"sha256").hexdigest();f.close();print(json.dumps({"executable":p,"sha256":h,"version":list(sys.version_info[:3])},ensure_ascii=False,separators=(",",":")))';
const CHILD_ARGV = ["-I", "-S", "-B", "-c", INTROSPECTION];
const TIMEOUT_MS = 10_000;
const COMBINED_OUTPUT_CAP_BYTES = 4_096;
const CHILD_STREAM_MAX_BUFFER_BYTES = 4_097;
const MAX_PATH_BYTES = 32_768;
const MAX_PATH_ENTRIES = 64;
const MAX_ENV_KEYS = 4_096;
const MAX_ENV_KEY_BYTES = 256;
const MAX_ENV_VALUE_BYTES = 32_768;
const MAX_ENV_TOTAL_BYTES = 65_536;
const DEPENDENCY_KEYS = ["platform", "lstat", "realpath", "readFile", "spawn"];
const FLUYO_BINDING_KEYS = ["FLUYO_R4B_TEST_PYTHON", "FLUYO_R4B_TEST_PYTHON_SHA256"];
const REVIEWED_LOCAL_PACKET_KEY = "FLUYO_R4B_TEST_PYTHON_REVIEWED_LOCAL_PACKET_V1";
const REVIEWED_LOCAL_OUTPUT_KEYS = [
  "FLUYO_R4B_TEST_PYTHON_TRANSACTION_ID",
  "FLUYO_R4B_TEST_PYTHON_PUBLIC_BINDING_DIGEST",
  "FLUYO_R4B_TEST_PYTHON_PROVENANCE",
];
const REVIEWED_LOCAL_PACKET_KEYS = [
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
];
const SIGNATURE_EVIDENCE_KEYS = [
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
];
const REVIEWED_LOCAL_SCHEMA = "fluyo:r4b:test-python-reviewed-local-binding:v2";
const REVIEWED_LOCAL_SETTLEMENT_SCHEMA = "fluyo:r4b:test-python-reviewed-local-settlement:v1";
const REVIEWED_LOCAL_PACKET_INVALID = "TEST_PYTHON_REVIEWED_LOCAL_PACKET_INVALID";
const REVIEWED_LOCAL_NATIVE_LEASE_UNAVAILABLE = "REVIEWED_LOCAL_NATIVE_LEASE_UNAVAILABLE_HOLD";
const ERROR = Object.freeze({
  platform: "TEST_PYTHON_PLATFORM_INVALID",
  internal: "TEST_PYTHON_INTERNAL_CONTRACT_INVALID",
  environment: "TEST_PYTHON_ENVIRONMENT_INVALID",
  ci: "TEST_PYTHON_CI_CONTEXT_INVALID",
  actionRoot: "TEST_PYTHON_ACTION_ROOT_INVALID",
  rootIdentity: "TEST_PYTHON_ROOT_IDENTITY_INVALID",
  executable: "TEST_PYTHON_EXECUTABLE_INVALID",
  executableIdentity: "TEST_PYTHON_EXECUTABLE_IDENTITY_INVALID",
  revalidation: "TEST_PYTHON_REVALIDATION_FAILED",
  timeout: "TEST_PYTHON_INTROSPECTION_TIMEOUT",
  introspection: "TEST_PYTHON_INTROSPECTION_FAILED",
  output: "TEST_PYTHON_INTROSPECTION_OUTPUT_INVALID",
  content: "TEST_PYTHON_EXECUTABLE_CONTENT_INVALID",
  version: "TEST_PYTHON_VERSION_INVALID",
  pathUnavailable: "TEST_PYTHON_PATH_BINDING_UNAVAILABLE",
});

const DIAGNOSTIC_USAGE_FAILURE = "TEST_PYTHON_DIAGNOSTIC_USAGE_INVALID";
const DIAGNOSTIC_INTERNAL_FAILURE = "TEST_PYTHON_DIAGNOSTIC_INTERNAL_FAILURE";
const VALID_DIAGNOSTIC_TUPLES = Object.freeze(
  [
    ["ACTION_ROOT", "SUCCESS", null],
    ["LOCAL_PATH", "SUCCESS", null],
    ["NONE", "USAGE_INVALID", DIAGNOSTIC_USAGE_FAILURE],
    ["NONE", "ENVIRONMENT_OR_MODE", ERROR.platform],
    ["NONE", "ENVIRONMENT_OR_MODE", ERROR.internal],
    ["NONE", "ENVIRONMENT_OR_MODE", ERROR.environment],
    ["NONE", "ENVIRONMENT_OR_MODE", ERROR.ci],
    ["NONE", "ENVIRONMENT_OR_MODE", ERROR.actionRoot],
    ["ACTION_ROOT", "ENVIRONMENT_OR_MODE", ERROR.rootIdentity],
    ["ACTION_ROOT", "ENVIRONMENT_OR_MODE", ERROR.executable],
    ["ACTION_ROOT", "ENVIRONMENT_OR_MODE", ERROR.executableIdentity],
    ["ACTION_ROOT", "ENVIRONMENT_OR_MODE", ERROR.revalidation],
    ["NONE", "NO_STRUCTURAL_CANDIDATE", ERROR.pathUnavailable],
    ["ACTION_ROOT", "PRE_SPAWN_REVALIDATION", ERROR.revalidation],
    ["LOCAL_PATH", "PRE_SPAWN_REVALIDATION", ERROR.revalidation],
    ["ACTION_ROOT", "SPAWN_THROW", ERROR.introspection],
    ["LOCAL_PATH", "SPAWN_THROW", ERROR.introspection],
    ["ACTION_ROOT", "SPAWN_TIMEOUT", ERROR.timeout],
    ["LOCAL_PATH", "SPAWN_TIMEOUT", ERROR.timeout],
    ["ACTION_ROOT", "CHILD_NONZERO_OR_SIGNAL", ERROR.introspection],
    ["LOCAL_PATH", "CHILD_NONZERO_OR_SIGNAL", ERROR.introspection],
    ["ACTION_ROOT", "STREAM_TYPE", ERROR.output],
    ["LOCAL_PATH", "STREAM_TYPE", ERROR.output],
    ["ACTION_ROOT", "COMBINED_OUTPUT_LIMIT", ERROR.output],
    ["LOCAL_PATH", "COMBINED_OUTPUT_LIMIT", ERROR.output],
    ["ACTION_ROOT", "STDERR_NONEMPTY", ERROR.output],
    ["LOCAL_PATH", "STDERR_NONEMPTY", ERROR.output],
    ["ACTION_ROOT", "STDOUT_FRAMING", ERROR.output],
    ["LOCAL_PATH", "STDOUT_FRAMING", ERROR.output],
    ["ACTION_ROOT", "JSON_PARSE", ERROR.output],
    ["LOCAL_PATH", "JSON_PARSE", ERROR.output],
    ["ACTION_ROOT", "JSON_SCHEMA", ERROR.output],
    ["LOCAL_PATH", "JSON_SCHEMA", ERROR.output],
    ["ACTION_ROOT", "REPORTED_EXECUTABLE_IDENTITY", ERROR.executableIdentity],
    ["LOCAL_PATH", "REPORTED_EXECUTABLE_IDENTITY", ERROR.executableIdentity],
    ["ACTION_ROOT", "SELF_HASH_MISMATCH", ERROR.content],
    ["LOCAL_PATH", "SELF_HASH_MISMATCH", ERROR.content],
    ["ACTION_ROOT", "VERSION_INVALID", ERROR.version],
    ["LOCAL_PATH", "VERSION_INVALID", ERROR.version],
    ["ACTION_ROOT", "POST_SPAWN_REVALIDATION", ERROR.revalidation],
    ["LOCAL_PATH", "POST_SPAWN_REVALIDATION", ERROR.revalidation],
    ["NONE", "INTERNAL_FIXED_FAILURE", DIAGNOSTIC_INTERNAL_FAILURE],
  ].map((tuple) => Object.freeze(tuple)),
);
const VALID_DIAGNOSTIC_TUPLE_IDENTITIES = Object.freeze(
  new Set(VALID_DIAGNOSTIC_TUPLES.map((tuple) => JSON.stringify(tuple))),
);
const INTERNAL_DIAGNOSTIC_RECORD = Object.freeze({
  schema: "fluyo:r4b:test-python-binding-diagnostic:v1",
  outcome: "FAIL",
  candidateClass: "NONE",
  stage: "INTERNAL_FIXED_FAILURE",
  failureCode: DIAGNOSTIC_INTERNAL_FAILURE,
});

const PRODUCTION_DEPENDENCIES = Object.freeze({
  platform: process.platform,
  lstat: (path) => lstatSync(path, { bigint: true }),
  realpath: realpathSync.native,
  readFile: readFileSync,
  spawn: spawnSync,
});

function fail(code) {
  throw new Error(code);
}

function isOrdinaryObject(value) {
  return (
    value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype
  );
}

function validateDependencies(dependencies) {
  let descriptors;
  try {
    if (!isOrdinaryObject(dependencies)) fail(ERROR.internal);
    if (JSON.stringify(Object.keys(dependencies)) !== JSON.stringify(DEPENDENCY_KEYS)) {
      fail(ERROR.internal);
    }
    descriptors = Object.getOwnPropertyDescriptors(dependencies);
  } catch (error) {
    if (error?.message === ERROR.internal) throw error;
    fail(ERROR.internal);
  }
  if (
    DEPENDENCY_KEYS.some((key) => !("value" in descriptors[key])) ||
    typeof descriptors.platform.value !== "string" ||
    DEPENDENCY_KEYS.slice(1).some((key) => typeof descriptors[key].value !== "function")
  ) {
    fail(ERROR.internal);
  }
  return dependencies;
}

function validatePlatform(dependencies) {
  if (dependencies.platform !== "win32") fail(ERROR.platform);
}

function snapshotEnvironment(environment) {
  if (environment === null || typeof environment !== "object") fail(ERROR.environment);
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(environment);
    if (!isOrdinaryObject(descriptors)) fail(ERROR.environment);
  } catch (error) {
    if (error?.message === ERROR.environment) throw error;
    fail(ERROR.environment);
  }
  let keys;
  try {
    keys = Reflect.ownKeys(descriptors);
  } catch {
    fail(ERROR.environment);
  }
  if (keys.length > MAX_ENV_KEYS || keys.some((key) => typeof key !== "string")) {
    fail(ERROR.environment);
  }
  const snapshot = {};
  let totalBytes = 0;
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!("value" in descriptor) || typeof descriptor.value !== "string") fail(ERROR.environment);
    const value = descriptor.value;
    const keyBytes = Buffer.byteLength(key, "utf8");
    const valueBytes = Buffer.byteLength(value, "utf8");
    if (
      key.length === 0 ||
      key !== key.normalize("NFC") ||
      /[=\u0000-\u001f\u007f-\u009f]/u.test(key) ||
      keyBytes > MAX_ENV_KEY_BYTES ||
      value.includes("\u0000") ||
      valueBytes > MAX_ENV_VALUE_BYTES ||
      [...FLUYO_BINDING_KEYS, ...REVIEWED_LOCAL_OUTPUT_KEYS].includes(key)
    ) {
      fail(ERROR.environment);
    }
    totalBytes += keyBytes + 1 + valueBytes + 1;
    if (totalBytes > MAX_ENV_TOTAL_BYTES) fail(ERROR.environment);
    Object.defineProperty(snapshot, key, {
      configurable: false,
      enumerable: true,
      value,
      writable: false,
    });
  }
  return Object.freeze(snapshot);
}

function canonicalSha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseCanonicalJsonObject(raw, keys, failureCode) {
  if (
    typeof raw !== "string" ||
    raw.length === 0 ||
    Buffer.byteLength(raw, "utf8") > 8_192 ||
    raw !== raw.normalize("NFC") ||
    /[\u0000\r\n]/u.test(raw)
  )
    fail(failureCode);
  for (const key of keys) {
    if ((raw.match(new RegExp(`"${key}"`, "gu")) ?? []).length !== 1) fail(failureCode);
  }
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    fail(failureCode);
  }
  if (
    !isOrdinaryObject(value) ||
    JSON.stringify(Object.keys(value)) !== JSON.stringify(keys) ||
    JSON.stringify(value) !== raw
  )
    fail(failureCode);
  return value;
}

function parseReviewedLocalPacket(raw) {
  const packet = parseCanonicalJsonObject(
    raw,
    REVIEWED_LOCAL_PACKET_KEYS,
    REVIEWED_LOCAL_PACKET_INVALID,
  );
  const signature = packet.signatureEvidence;
  if (
    packet.schema !== REVIEWED_LOCAL_SCHEMA ||
    packet.mode !== "REVIEWED_LOCAL" ||
    typeof packet.transactionId !== "string" ||
    !/^[0-9a-f]{64}$/u.test(packet.transactionId) ||
    !isLexicalWindowsRoot(packet.root) ||
    Buffer.byteLength(packet.root, "utf8") < 4 ||
    Buffer.byteLength(packet.root, "utf8") > 1_024 ||
    typeof packet.expectedExecutableSha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(packet.expectedExecutableSha256) ||
    JSON.stringify(packet.expectedVersion) !== "[3,12,5]" ||
    packet.provenance !== "PSF_CPYTHON_INTERPRETER" ||
    typeof packet.expectedRootManifestSha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(packet.expectedRootManifestSha256) ||
    !Number.isSafeInteger(packet.expectedRootFileCount) ||
    packet.expectedRootFileCount < 1 ||
    packet.expectedRootFileCount > 16_384 ||
    !Number.isSafeInteger(packet.expectedRootDirectoryCount) ||
    packet.expectedRootDirectoryCount < 1 ||
    packet.expectedRootDirectoryCount > 4_096 ||
    !Number.isSafeInteger(packet.expectedRootByteCount) ||
    packet.expectedRootByteCount < 1 ||
    packet.expectedRootByteCount > 2_147_483_648 ||
    !isOrdinaryObject(signature) ||
    JSON.stringify(Object.keys(signature)) !== JSON.stringify(SIGNATURE_EVIDENCE_KEYS)
  )
    fail(REVIEWED_LOCAL_PACKET_INVALID);
  const signaturePreimage = Object.fromEntries(
    SIGNATURE_EVIDENCE_KEYS.slice(0, -1).map((key) => [key, signature[key]]),
  );
  if (
    signature.method !== "WINCRYPT_AUTHENTICODE_OFFLINE_CACHE_V1" ||
    signature.status !== "VALID" ||
    signature.signatureType !== "AUTHENTICODE_EMBEDDED" ||
    signature.observedSha256 !== packet.expectedExecutableSha256 ||
    typeof signature.signerSubject !== "string" ||
    signature.signerSubject !== signature.signerSubject.normalize("NFC") ||
    signature.signerSubject.length === 0 ||
    Buffer.byteLength(signature.signerSubject, "utf8") > 512 ||
    /\p{Cc}/u.test(signature.signerSubject) ||
    typeof signature.signerThumbprint !== "string" ||
    !/^[0-9A-F]{40}$/u.test(signature.signerThumbprint) ||
    signature.chainStatus !== "TRUSTED" ||
    signature.revocationPolicy !== "OFFLINE_CACHE_ONLY_NO_NETWORK" ||
    signature.revocationStatus !== "VALID_WITH_COMPLETE_OFFLINE_REVOCATION" ||
    typeof signature.verificationUtc !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(signature.verificationUtc) ||
    new Date(signature.verificationUtc).toISOString().replace(".000Z", "Z") !==
      signature.verificationUtc ||
    signature.evidenceSha256 !== canonicalSha256(JSON.stringify(signaturePreimage))
  )
    fail(REVIEWED_LOCAL_PACKET_INVALID);
  const publicPreimage = Object.fromEntries(
    REVIEWED_LOCAL_PACKET_KEYS.filter((key) => key !== "root" && key !== "publicBindingDigest").map(
      (key) => [key, packet[key]],
    ),
  );
  if (packet.publicBindingDigest !== canonicalSha256(JSON.stringify(publicPreimage))) {
    fail(REVIEWED_LOCAL_PACKET_INVALID);
  }
  return Object.freeze(packet);
}

function reviewedLocalSettlementRecordForTesting(
  candidateClass,
  stage,
  failureCode,
  transactionId,
  publicBindingDigest,
) {
  const noneStage = [
    "PACKET_INVALID",
    "AUTHORITY_CONFLICT",
    "USAGE_INVALID",
    "PRIOR_DIAGNOSTIC_CONSUMED",
    "INTERNAL_FIXED_FAILURE",
  ].includes(stage);
  const valid =
    (candidateClass === "NONE" || candidateClass === "REVIEWED_LOCAL") &&
    typeof stage === "string" &&
    (failureCode === null || typeof failureCode === "string") &&
    (noneStage
      ? candidateClass === "NONE" && transactionId === null && publicBindingDigest === null
      : candidateClass === "REVIEWED_LOCAL" &&
        typeof transactionId === "string" &&
        /^[0-9a-f]{64}$/u.test(transactionId) &&
        typeof publicBindingDigest === "string" &&
        /^[0-9a-f]{64}$/u.test(publicBindingDigest));
  const record = valid
    ? {
        schema: REVIEWED_LOCAL_SETTLEMENT_SCHEMA,
        outcome: stage === "SUCCESS" ? "PASS" : "FAIL",
        candidateClass,
        stage,
        failureCode,
        transactionId,
        publicBindingDigest,
      }
    : {
        schema: REVIEWED_LOCAL_SETTLEMENT_SCHEMA,
        outcome: "FAIL",
        candidateClass: "NONE",
        stage: "INTERNAL_FIXED_FAILURE",
        failureCode: DIAGNOSTIC_INTERNAL_FAILURE,
        transactionId: null,
        publicBindingDigest: null,
      };
  return Object.freeze(record);
}

function diagnoseReviewedLocalBindingWithDependencies(environment) {
  try {
    const snapshot = snapshotEnvironment(environment);
    const folded = Object.keys(snapshot).filter(
      (key) => asciiFold(key) === asciiFold(REVIEWED_LOCAL_PACKET_KEY),
    );
    if (folded.length !== 1 || folded[0] !== REVIEWED_LOCAL_PACKET_KEY) {
      fail(REVIEWED_LOCAL_PACKET_INVALID);
    }
    if ([...CI_MARKER_KEYS, ...ACTION_ROOT_KEYS].some((key) => hasOwn(snapshot, key))) {
      return reviewedLocalSettlementRecordForTesting(
        "NONE",
        "AUTHORITY_CONFLICT",
        "TEST_PYTHON_REVIEWED_LOCAL_AUTHORITY_CONFLICT",
        null,
        null,
      );
    }
    const packet = parseReviewedLocalPacket(snapshot[REVIEWED_LOCAL_PACKET_KEY]);
    return reviewedLocalSettlementRecordForTesting(
      "REVIEWED_LOCAL",
      "NATIVE_LEASE_UNAVAILABLE",
      REVIEWED_LOCAL_NATIVE_LEASE_UNAVAILABLE,
      packet.transactionId,
      packet.publicBindingDigest,
    );
  } catch {
    return reviewedLocalSettlementRecordForTesting(
      "NONE",
      "PACKET_INVALID",
      REVIEWED_LOCAL_PACKET_INVALID,
      null,
      null,
    );
  }
}

function hasOwn(snapshot, key) {
  return Object.prototype.hasOwnProperty.call(snapshot, key);
}

function asciiFold(value) {
  return value.replace(/[a-z]/gu, (character) => String.fromCharCode(character.charCodeAt(0) - 32));
}

function selectSystemRootValue(snapshot, target) {
  const matches = Object.keys(snapshot).filter((key) => asciiFold(key) === target);
  if (matches.length !== 1) fail(ERROR.environment);
  return snapshot[matches[0]];
}

function hasForbiddenPathCharacter(value) {
  return /[\u0000-\u001f\u007f-\u009f"/]/u.test(value);
}

function isLexicalWindowsRoot(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value === value.trim() &&
    value === value.normalize("NFC") &&
    !hasForbiddenPathCharacter(value) &&
    win32.isAbsolute(value) &&
    win32.normalize(value) === value &&
    !value.endsWith("\\") &&
    !/^(?:\\\\|\\\?\\|\\\.\\|\\GLOBALROOT\\)/iu.test(value) &&
    !/(^|\\)\.{1,2}(?:\\|$)/u.test(value) &&
    !/:[^\\]+$/u.test(value.slice(2)) &&
    /^[A-Za-z]:\\[^:]*$/u.test(value)
  );
}

function isCanonicalWindowsPath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value === value.normalize("NFC") &&
    !hasForbiddenPathCharacter(value) &&
    win32.isAbsolute(value) &&
    win32.normalize(value) === value &&
    !/^(?:\\\\|\\\?\\|\\\.\\|\\GLOBALROOT\\)/iu.test(value) &&
    /^[A-Za-z]:\\[^:]*$/u.test(value)
  );
}

function statKind(stat, method) {
  try {
    return typeof stat?.[method] === "function" && stat[method]();
  } catch {
    return false;
  }
}

function directoryIdentity(stat) {
  if (
    !statKind(stat, "isDirectory") ||
    statKind(stat, "isSymbolicLink") ||
    typeof stat.dev !== "bigint" ||
    typeof stat.ino !== "bigint" ||
    typeof stat.mode !== "bigint"
  ) {
    return null;
  }
  return Object.freeze({ dev: stat.dev, ino: stat.ino, mode: stat.mode });
}

function fileIdentity(stat) {
  if (
    !statKind(stat, "isFile") ||
    statKind(stat, "isSymbolicLink") ||
    typeof stat.dev !== "bigint" ||
    typeof stat.ino !== "bigint" ||
    typeof stat.mode !== "bigint" ||
    typeof stat.size !== "bigint"
  ) {
    return null;
  }
  return Object.freeze({ dev: stat.dev, ino: stat.ino, mode: stat.mode, size: stat.size });
}

function sameIdentity(left, right) {
  return (
    left !== null && right !== null && Object.keys(left).every((key) => left[key] === right[key])
  );
}

function safeCall(code, operation) {
  try {
    return operation();
  } catch {
    fail(code);
  }
}

function captureRootWalk(declaredRoot, dependencies, failureCode = ERROR.rootIdentity) {
  const driveRoot = win32.parse(declaredRoot).root;
  if (!/^[A-Za-z]:\\$/u.test(driveRoot)) fail(failureCode);
  const driveStat = safeCall(failureCode, () => dependencies.lstat(driveRoot));
  const driveIdentity = directoryIdentity(driveStat);
  if (!driveIdentity) fail(failureCode);
  const driveRealpath = safeCall(failureCode, () => dependencies.realpath(driveRoot));
  if (driveRealpath.toLowerCase() !== driveRoot.toLowerCase()) fail(failureCode);

  const relative = declaredRoot.slice(driveRoot.length);
  const segments = relative.split("\\").filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
    fail(failureCode);
  }
  const rows = [];
  let previousDeclared = driveRoot;
  let previousCanonical = driveRoot;
  for (const segment of segments) {
    const declaredPath = win32.join(previousDeclared, segment);
    const declaredStat = safeCall(failureCode, () => dependencies.lstat(declaredPath));
    const declaredIdentity = directoryIdentity(declaredStat);
    if (!declaredIdentity || declaredIdentity.dev !== driveIdentity.dev) fail(failureCode);
    const canonicalPath = safeCall(failureCode, () => dependencies.realpath(declaredPath));
    if (
      !isCanonicalWindowsPath(canonicalPath) ||
      win32.dirname(canonicalPath).toLowerCase() !== previousCanonical.toLowerCase()
    ) {
      fail(failureCode);
    }
    const canonicalStat = safeCall(failureCode, () => dependencies.lstat(canonicalPath));
    const canonicalIdentity = directoryIdentity(canonicalStat);
    if (
      !sameIdentity(declaredIdentity, canonicalIdentity) ||
      canonicalIdentity.dev !== driveIdentity.dev
    ) {
      fail(failureCode);
    }
    rows.push(
      Object.freeze({
        declaredPath,
        canonicalPath,
        dev: declaredIdentity.dev,
        ino: declaredIdentity.ino,
        mode: declaredIdentity.mode,
      }),
    );
    previousDeclared = declaredPath;
    previousCanonical = canonicalPath;
  }
  return Object.freeze({
    declaredRoot,
    canonicalRoot: previousCanonical,
    driveRoot,
    driveIdentity,
    rows: Object.freeze(rows),
  });
}

function captureCandidate(rootWalk, dependencies) {
  const candidate = win32.resolve(rootWalk.canonicalRoot, "python.exe");
  if (
    win32.dirname(candidate).toLowerCase() !== rootWalk.canonicalRoot.toLowerCase() ||
    win32.basename(candidate).toLowerCase() !== "python.exe"
  ) {
    fail(ERROR.executable);
  }
  const beforeStat = safeCall(ERROR.executable, () => dependencies.lstat(candidate));
  const identity = fileIdentity(beforeStat);
  if (!identity) fail(ERROR.executable);
  if (identity.dev !== rootWalk.driveIdentity.dev) fail(ERROR.executableIdentity);
  const realCandidate = safeCall(ERROR.executableIdentity, () => dependencies.realpath(candidate));
  if (realCandidate.toLowerCase() !== candidate.toLowerCase()) fail(ERROR.executableIdentity);
  const bytes = safeCall(ERROR.executable, () => dependencies.readFile(candidate));
  if (!Buffer.isBuffer(bytes)) fail(ERROR.executable);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const afterReadStat = safeCall(ERROR.revalidation, () => dependencies.lstat(candidate));
  if (!sameIdentity(identity, fileIdentity(afterReadStat))) fail(ERROR.revalidation);
  return Object.freeze({ candidate, identity, sha256 });
}

function prepareCandidate(declaredRoot, dependencies) {
  const walk = captureRootWalk(declaredRoot, dependencies);
  const executable = captureCandidate(walk, dependencies);
  return Object.freeze({ walk, executable });
}

function compareWalk(expected, observed) {
  return (
    expected.driveRoot.toLowerCase() === observed.driveRoot.toLowerCase() &&
    sameIdentity(expected.driveIdentity, observed.driveIdentity) &&
    expected.rows.length === observed.rows.length &&
    expected.rows.every((row, index) => {
      const candidate = observed.rows[index];
      return (
        row.declaredPath.toLowerCase() === candidate.declaredPath.toLowerCase() &&
        row.canonicalPath.toLowerCase() === candidate.canonicalPath.toLowerCase() &&
        row.dev === candidate.dev &&
        row.ino === candidate.ino &&
        row.mode === candidate.mode
      );
    })
  );
}

function revalidatePrepared(prepared, dependencies) {
  try {
    const observedWalk = captureRootWalk(
      prepared.walk.declaredRoot,
      dependencies,
      ERROR.revalidation,
    );
    if (!compareWalk(prepared.walk, observedWalk)) fail(ERROR.revalidation);
    const realCandidate = dependencies.realpath(prepared.executable.candidate);
    const stat = dependencies.lstat(prepared.executable.candidate);
    const bytes = dependencies.readFile(prepared.executable.candidate);
    if (
      realCandidate.toLowerCase() !== prepared.executable.candidate.toLowerCase() ||
      !sameIdentity(prepared.executable.identity, fileIdentity(stat)) ||
      !Buffer.isBuffer(bytes) ||
      createHash("sha256").update(bytes).digest("hex") !== prepared.executable.sha256
    ) {
      fail(ERROR.revalidation);
    }
  } catch (error) {
    if (error?.message === ERROR.revalidation) throw error;
    fail(ERROR.revalidation);
  }
}

function childEnvironment(snapshot) {
  const systemRoot = selectSystemRootValue(snapshot, "SYSTEMROOT");
  const windir = selectSystemRootValue(snapshot, "WINDIR");
  if (
    typeof systemRoot !== "string" ||
    typeof windir !== "string" ||
    !isLexicalWindowsRoot(systemRoot) ||
    !isLexicalWindowsRoot(windir) ||
    systemRoot.toLowerCase() !== windir.toLowerCase()
  ) {
    fail(ERROR.environment);
  }
  return Object.freeze({
    SystemRoot: systemRoot,
    WINDIR: windir,
    PYTHONUTF8: "1",
    PYTHONDONTWRITEBYTECODE: "1",
    PYTHONNOUSERSITE: "1",
  });
}

function parseChildResult(result, prepared, dependencies) {
  if (!isOrdinaryObject(result)) fail(ERROR.introspection);
  if (result.error) {
    if (result.error?.code === "ETIMEDOUT") fail(ERROR.timeout);
    fail(ERROR.introspection);
  }
  if (result.status !== 0 || result.signal !== null) fail(ERROR.introspection);
  if (typeof result.stdout !== "string" || typeof result.stderr !== "string") fail(ERROR.output);
  if (
    Buffer.byteLength(result.stdout, "utf8") + Buffer.byteLength(result.stderr, "utf8") >
    COMBINED_OUTPUT_CAP_BYTES
  ) {
    fail(ERROR.output);
  }
  if (result.stderr !== "" || !result.stdout.endsWith("\r\n")) fail(ERROR.output);
  const line = result.stdout.slice(0, -2);
  if (
    line.length === 0 ||
    line.includes("\r") ||
    line.includes("\n") ||
    line.charCodeAt(0) === 0xfeff
  ) {
    fail(ERROR.output);
  }
  let payload;
  try {
    payload = JSON.parse(line);
  } catch {
    fail(ERROR.output);
  }
  if (
    !isOrdinaryObject(payload) ||
    JSON.stringify(Object.keys(payload)) !== JSON.stringify(["executable", "sha256", "version"]) ||
    typeof payload.executable !== "string" ||
    !isCanonicalWindowsPath(payload.executable) ||
    typeof payload.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(payload.sha256) ||
    JSON.stringify(payload) + "\r\n" !== result.stdout
  ) {
    fail(ERROR.output);
  }
  const reportedExecutable = safeCall(ERROR.executableIdentity, () =>
    dependencies.realpath(payload.executable),
  );
  if (reportedExecutable.toLowerCase() !== prepared.executable.candidate.toLowerCase()) {
    fail(ERROR.executableIdentity);
  }
  if (payload.sha256 !== prepared.executable.sha256) fail(ERROR.content);
  if (
    !Array.isArray(payload.version) ||
    payload.version.length !== 3 ||
    payload.version.some((part) => !Number.isSafeInteger(part) || part < 0 || part > 65_535) ||
    payload.version[0] !== 3 ||
    payload.version[1] !== 12
  ) {
    fail(ERROR.version);
  }
  return payload.version.join(".");
}

function executePrepared(prepared, env, dependencies) {
  revalidatePrepared(prepared, dependencies);
  let result;
  try {
    result = dependencies.spawn(prepared.executable.candidate, CHILD_ARGV, {
      cwd: prepared.walk.canonicalRoot,
      env,
      encoding: "utf8",
      input: undefined,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: TIMEOUT_MS,
      maxBuffer: CHILD_STREAM_MAX_BUFFER_BYTES,
      windowsHide: true,
      shell: false,
      killSignal: "SIGTERM",
    });
  } catch {
    result = Object.freeze({ spawnThrew: true });
  }
  revalidatePrepared(prepared, dependencies);
  if (result.spawnThrew) fail(ERROR.introspection);
  const version = parseChildResult(result, prepared, dependencies);
  return Object.freeze({
    path: prepared.executable.candidate,
    sha256: prepared.executable.sha256,
    version,
  });
}

function modeFromSnapshot(snapshot) {
  const signaled = [...CI_MARKER_KEYS, ...ACTION_ROOT_KEYS].some((key) => hasOwn(snapshot, key));
  if (!signaled) return Object.freeze({ action: false });
  if (
    CI_MARKER_KEYS.some(
      (key, index) => !hasOwn(snapshot, key) || snapshot[key] !== CI_MARKER_VALUES[index],
    )
  ) {
    fail(ERROR.ci);
  }
  if (ACTION_ROOT_KEYS.some((key) => !hasOwn(snapshot, key))) fail(ERROR.actionRoot);
  const values = ACTION_ROOT_KEYS.map((key) => snapshot[key]);
  if (
    values.some((value) => !isLexicalWindowsRoot(value)) ||
    values.some((value) => value.toLowerCase() !== values[0].toLowerCase())
  ) {
    fail(ERROR.actionRoot);
  }
  return Object.freeze({ action: true, root: values[0] });
}

function localPathEntries(snapshot) {
  const hasUpper = hasOwn(snapshot, "PATH");
  const hasTitle = hasOwn(snapshot, "Path");
  if (hasUpper && hasTitle && snapshot.PATH !== snapshot.Path) fail(ERROR.environment);
  const value = hasUpper ? snapshot.PATH : snapshot.Path;
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Buffer.byteLength(value, "utf8") > MAX_PATH_BYTES
  ) {
    fail(ERROR.environment);
  }
  const entries = value
    .split(";")
    .map((entry) => entry.trim().replace(/^"|"$/gu, ""))
    .filter(Boolean);
  if (
    entries.length === 0 ||
    entries.length > MAX_PATH_ENTRIES ||
    entries.some((entry) => !win32.isAbsolute(entry))
  ) {
    fail(ERROR.environment);
  }
  return entries;
}

function normalizeLocalRoot(entry) {
  const normalized = win32.resolve(entry);
  return normalized.endsWith("\\") ? normalized.slice(0, -1) : normalized;
}

function resolveSnapshot(snapshot, dependencies) {
  const env = childEnvironment(snapshot);
  const mode = modeFromSnapshot(snapshot);
  if (mode.action) {
    return executePrepared(prepareCandidate(mode.root, dependencies), env, dependencies);
  }
  for (const entry of localPathEntries(snapshot)) {
    try {
      const prepared = prepareCandidate(normalizeLocalRoot(entry), dependencies);
      return executePrepared(prepared, env, dependencies);
    } catch (error) {
      if (
        ![
          ERROR.rootIdentity,
          ERROR.executable,
          ERROR.executableIdentity,
          ERROR.revalidation,
        ].includes(error?.message)
      ) {
        throw error;
      }
    }
  }
  fail(ERROR.pathUnavailable);
}

function diagnosticRecord(candidateClass, stage, failureCode) {
  if (
    typeof candidateClass !== "string" ||
    typeof stage !== "string" ||
    (failureCode !== null && typeof failureCode !== "string") ||
    !VALID_DIAGNOSTIC_TUPLE_IDENTITIES.has(JSON.stringify([candidateClass, stage, failureCode]))
  ) {
    return INTERNAL_DIAGNOSTIC_RECORD;
  }
  const record = Object.freeze({
    schema: "fluyo:r4b:test-python-binding-diagnostic:v1",
    outcome: stage === "SUCCESS" ? "PASS" : "FAIL",
    candidateClass,
    stage,
    failureCode,
  });
  if (Buffer.byteLength(`${JSON.stringify(record)}\n`, "utf8") > 512) {
    return INTERNAL_DIAGNOSTIC_RECORD;
  }
  return record;
}

function diagnosticChildStage(result, prepared, dependencies) {
  if (!isOrdinaryObject(result)) {
    return ["CHILD_NONZERO_OR_SIGNAL", ERROR.introspection];
  }
  if (result.error) {
    return result.error?.code === "ETIMEDOUT"
      ? ["SPAWN_TIMEOUT", ERROR.timeout]
      : ["CHILD_NONZERO_OR_SIGNAL", ERROR.introspection];
  }
  if (result.status !== 0 || result.signal !== null) {
    return ["CHILD_NONZERO_OR_SIGNAL", ERROR.introspection];
  }
  if (typeof result.stdout !== "string" || typeof result.stderr !== "string") {
    return ["STREAM_TYPE", ERROR.output];
  }
  if (
    Buffer.byteLength(result.stdout, "utf8") + Buffer.byteLength(result.stderr, "utf8") >
    COMBINED_OUTPUT_CAP_BYTES
  ) {
    return ["COMBINED_OUTPUT_LIMIT", ERROR.output];
  }
  if (result.stderr !== "") return ["STDERR_NONEMPTY", ERROR.output];
  if (
    !result.stdout.endsWith("\r\n") ||
    result.stdout.length <= 2 ||
    result.stdout.slice(0, -2).includes("\r") ||
    result.stdout.slice(0, -2).includes("\n") ||
    result.stdout.charCodeAt(0) === 0xfeff
  ) {
    return ["STDOUT_FRAMING", ERROR.output];
  }
  let payload;
  try {
    payload = JSON.parse(result.stdout.slice(0, -2));
  } catch {
    return ["JSON_PARSE", ERROR.output];
  }
  if (
    !isOrdinaryObject(payload) ||
    JSON.stringify(Object.keys(payload)) !== JSON.stringify(["executable", "sha256", "version"]) ||
    typeof payload.executable !== "string" ||
    !isCanonicalWindowsPath(payload.executable) ||
    typeof payload.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(payload.sha256) ||
    JSON.stringify(payload) + "\r\n" !== result.stdout
  ) {
    return ["JSON_SCHEMA", ERROR.output];
  }
  try {
    if (
      dependencies.realpath(payload.executable).toLowerCase() !==
      prepared.executable.candidate.toLowerCase()
    ) {
      return ["REPORTED_EXECUTABLE_IDENTITY", ERROR.executableIdentity];
    }
  } catch {
    return ["REPORTED_EXECUTABLE_IDENTITY", ERROR.executableIdentity];
  }
  if (payload.sha256 !== prepared.executable.sha256) {
    return ["SELF_HASH_MISMATCH", ERROR.content];
  }
  if (
    !Array.isArray(payload.version) ||
    payload.version.length !== 3 ||
    payload.version.some((part) => !Number.isSafeInteger(part) || part < 0 || part > 65_535) ||
    payload.version[0] !== 3 ||
    payload.version[1] !== 12
  ) {
    return ["VERSION_INVALID", ERROR.version];
  }
  return ["SUCCESS", null];
}

function diagnoseTestPythonBindingWithDependencies(environment, injectedDependencies) {
  let dependencies;
  let snapshot;
  let env;
  let mode;
  try {
    dependencies = validateDependencies(injectedDependencies);
    validatePlatform(dependencies);
    snapshot = snapshotEnvironment(environment);
    env = childEnvironment(snapshot);
    mode = modeFromSnapshot(snapshot);
  } catch (error) {
    const code =
      typeof error?.message === "string" && Object.values(ERROR).includes(error.message)
        ? error.message
        : "TEST_PYTHON_DIAGNOSTIC_INTERNAL_FAILURE";
    return diagnosticRecord(
      "NONE",
      code === "TEST_PYTHON_DIAGNOSTIC_INTERNAL_FAILURE"
        ? "INTERNAL_FIXED_FAILURE"
        : "ENVIRONMENT_OR_MODE",
      code,
    );
  }

  let candidateClass = "NONE";
  let prepared;
  if (mode.action) {
    candidateClass = "ACTION_ROOT";
    try {
      prepared = prepareCandidate(mode.root, dependencies);
    } catch (error) {
      return diagnosticRecord(
        candidateClass,
        "ENVIRONMENT_OR_MODE",
        error?.message ?? DIAGNOSTIC_INTERNAL_FAILURE,
      );
    }
  } else {
    let entries;
    try {
      entries = localPathEntries(snapshot);
    } catch (error) {
      return diagnosticRecord("NONE", "ENVIRONMENT_OR_MODE", error?.message ?? ERROR.environment);
    }
    for (const entry of entries) {
      try {
        prepared = prepareCandidate(normalizeLocalRoot(entry), dependencies);
        candidateClass = "LOCAL_PATH";
        break;
      } catch (error) {
        if (
          ![
            ERROR.rootIdentity,
            ERROR.executable,
            ERROR.executableIdentity,
            ERROR.revalidation,
          ].includes(error?.message)
        ) {
          return diagnosticRecord(
            "NONE",
            "INTERNAL_FIXED_FAILURE",
            "TEST_PYTHON_DIAGNOSTIC_INTERNAL_FAILURE",
          );
        }
      }
    }
    if (!prepared) {
      return diagnosticRecord("NONE", "NO_STRUCTURAL_CANDIDATE", ERROR.pathUnavailable);
    }
  }

  try {
    revalidatePrepared(prepared, dependencies);
  } catch {
    return diagnosticRecord(candidateClass, "PRE_SPAWN_REVALIDATION", ERROR.revalidation);
  }
  let result;
  let spawnThrew = false;
  try {
    result = dependencies.spawn(prepared.executable.candidate, CHILD_ARGV, {
      cwd: prepared.walk.canonicalRoot,
      env,
      encoding: "utf8",
      input: undefined,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: TIMEOUT_MS,
      maxBuffer: CHILD_STREAM_MAX_BUFFER_BYTES,
      windowsHide: true,
      shell: false,
      killSignal: "SIGTERM",
    });
  } catch {
    spawnThrew = true;
  }
  try {
    revalidatePrepared(prepared, dependencies);
  } catch {
    return diagnosticRecord(candidateClass, "POST_SPAWN_REVALIDATION", ERROR.revalidation);
  }
  if (spawnThrew) {
    return diagnosticRecord(candidateClass, "SPAWN_THROW", ERROR.introspection);
  }
  const [stage, failureCode] = diagnosticChildStage(result, prepared, dependencies);
  return diagnosticRecord(candidateClass, stage, failureCode);
}

function resolveTestPythonBindingWithDependencies(environment, injectedDependencies) {
  const dependencies = validateDependencies(injectedDependencies);
  validatePlatform(dependencies);
  const snapshot = snapshotEnvironment(environment);
  return resolveSnapshot(snapshot, dependencies);
}

function bindTestPythonEnvironmentWithDependencies(environment, injectedDependencies) {
  const dependencies = validateDependencies(injectedDependencies);
  validatePlatform(dependencies);
  const snapshot = snapshotEnvironment(environment);
  const binding = resolveSnapshot(snapshot, dependencies);
  return Object.freeze({
    binding,
    environment: Object.freeze({
      ...snapshot,
      FLUYO_R4B_TEST_PYTHON: binding.path,
      FLUYO_R4B_TEST_PYTHON_SHA256: binding.sha256,
    }),
  });
}

export function resolveTestPythonBinding(environment = process.env) {
  return resolveTestPythonBindingWithDependencies(environment, PRODUCTION_DEPENDENCIES);
}

export function bindTestPythonEnvironment(environment = process.env) {
  return bindTestPythonEnvironmentWithDependencies(environment, PRODUCTION_DEPENDENCIES);
}

export const testPythonBindingTesting = Object.freeze({
  resolveTestPythonBindingWithDependencies,
  bindTestPythonEnvironmentWithDependencies,
  diagnoseTestPythonBindingWithDependencies,
  diagnosticRecordForTesting: diagnosticRecord,
});

export const reviewedLocalBindingTesting = Object.freeze({
  diagnoseReviewedLocalBindingWithDependencies,
  reviewedLocalSettlementRecordForTesting,
});

function emitDiagnostic(record) {
  process.stdout.write(`${JSON.stringify(record)}\n`);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  if (process.argv.length === 3 && process.argv[2] === "--diagnose-reviewed-local-once-v1") {
    emitDiagnostic(diagnoseReviewedLocalBindingWithDependencies(process.env));
  } else if (process.argv.length === 3 && process.argv[2] === "--diagnose-once-v1") {
    emitDiagnostic(
      reviewedLocalSettlementRecordForTesting(
        "NONE",
        "PRIOR_DIAGNOSTIC_CONSUMED",
        "TEST_PYTHON_PRIOR_DIAGNOSTIC_CONSUMED",
        null,
        null,
      ),
    );
  } else {
    emitDiagnostic(
      reviewedLocalSettlementRecordForTesting(
        "NONE",
        "USAGE_INVALID",
        "TEST_PYTHON_REVIEWED_LOCAL_USAGE_INVALID",
        null,
        null,
      ),
    );
  }
}
