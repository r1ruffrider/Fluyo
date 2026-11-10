import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const AUTHORITY_PATH =
  "scripts/r4b-evidence/root-only-closure-roslyn-download-authority.json";
export const AUTHORITY_SCHEMA = "fluyo:r4b:roslyn-verifier-download-authority:v2";
export const AUTHORITY_VERSION = "R4B-ROSLYN-VERIFIER-BOOTSTRAP-v1.2";
export const VERIFIER_SHA256 = "992d70cac5b06c38efec91806caba64cdcc07e6d963a0959dbbbaf264d33b800";
export const MAXIMUM_BODY_BYTES = 16_777_216;

const ROOT_KEYS = Object.freeze([
  "schema",
  "authorityVersion",
  "decisionStatus",
  "externalActionAuthorized",
  "executionAuthorityPresent",
  "verifier",
  "download",
  "isolation",
  "requiredPostDownloadEvidence",
  "forbiddenActions",
]);
const VERIFIER_KEYS = Object.freeze([
  "packageId",
  "version",
  "fileVersion",
  "architecture",
  "distribution",
  "releaseDate",
  "url",
  "sha256",
  "license",
  "manifest",
]);
const DOWNLOAD_KEYS = Object.freeze([
  "method",
  "maximumBodyBytes",
  "maximumRequests",
  "redirectsAllowed",
  "retriesAllowed",
  "resumeAllowed",
  "credentialsAllowed",
  "cookiesAllowed",
  "proxyAllowed",
  "customTrustAllowed",
  "shellAllowed",
]);
const ISOLATION_KEYS = Object.freeze([
  "standardUserOnly",
  "freshExclusiveRootRequired",
  "createNewRequired",
  "pathMutationAllowed",
  "globalInstallAllowed",
  "globalCacheAllowed",
  "globalConfigAllowed",
  "executionAllowed",
]);
const REQUIRED_EVIDENCE = Object.freeze([
  "observedByteCount",
  "observedSha256",
  "authenticodeObservedSha256",
  "authenticodeFileIdentityBefore",
  "authenticodeFileIdentityAfter",
  "authenticodeHandlePolicy",
  "authenticodeIdentityStable",
  "authenticodeStatus",
  "codeSigningEku",
  "signerSubject",
  "signerThumbprint",
  "signerIssuer",
  "signerSerial",
  "signerValidity",
  "signatureChainStatus",
  "revocationNetworkPolicy",
  "signerChainRevocationMode",
  "signerChainRevocationFlag",
  "signerChainVerificationFlags",
  "signerRevocationEvidenceStatus",
  "timestampSubject",
  "timestampThumbprint",
  "timestampUtc",
  "timestampChainStatus",
  "timestampChainRevocationMode",
  "timestampChainRevocationFlag",
  "timestampChainVerificationFlags",
  "timestampRevocationEvidenceStatus",
  "productVersion",
  "fileVersion",
  "licenseEvidence",
  "sbomInventory",
  "scriptAbsence",
  "hostIsolationEvidence",
  "retentionDecision",
  "cleanupEvidence",
]);
const FORBIDDEN_ACTIONS = Object.freeze([
  "verifierExecution",
  "roslynDownload",
  "roslynExtraction",
  "compilerExecution",
  "replacement",
  "broker",
  "Attempt004",
  "production",
  "signing",
  "store",
  "spend",
  "credentials",
]);

function fail() {
  throw new Error("ROSLYN_VERIFIER_AUTHORITY_INVALID");
}

function revocationFail() {
  throw new Error("REVOCATION_EVIDENCE_UNAVAILABLE");
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function isPlainRecord(value) {
  return (
    value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(value, keys) {
  if (!isPlainRecord(value) || JSON.stringify(Object.keys(value)) !== JSON.stringify(keys)) fail();
}

function exactArray(value, expected) {
  if (!Array.isArray(value) || JSON.stringify(value) !== JSON.stringify(expected)) fail();
}

function exactFalseRecord(value, keys) {
  exactKeys(value, keys);
  for (const key of keys) if (value[key] !== false) fail();
}

export function validateRoslynVerifierDownloadAuthority(authority) {
  exactKeys(authority, ROOT_KEYS);
  exactKeys(authority.verifier, VERIFIER_KEYS);
  exactKeys(authority.download, DOWNLOAD_KEYS);
  exactKeys(authority.isolation, ISOLATION_KEYS);
  if (
    authority.schema !== AUTHORITY_SCHEMA ||
    authority.authorityVersion !== AUTHORITY_VERSION ||
    authority.decisionStatus !== "APPROVED_FOR_REPOSITORY_IMPLEMENTATION_ONLY" ||
    authority.externalActionAuthorized !== false ||
    authority.executionAuthorityPresent !== false
  )
    fail();
  const verifier = authority.verifier;
  if (
    verifier.packageId !== "Microsoft.NuGet" ||
    verifier.version !== "7.9.0" ||
    verifier.fileVersion !== "7.9.0.83" ||
    verifier.architecture !== "x86" ||
    verifier.distribution !== "portable" ||
    verifier.releaseDate !== "2026-08-11" ||
    verifier.url !== "https://dist.nuget.org/win-x86-commandline/v7.9.0/nuget.exe" ||
    verifier.sha256 !== VERIFIER_SHA256 ||
    verifier.license !== "Apache-2.0" ||
    verifier.manifest !== "manifests/m/Microsoft/NuGet/7.9.0/Microsoft.NuGet.installer.yaml"
  )
    fail();
  const download = authority.download;
  if (
    download.method !== "GET" ||
    download.maximumBodyBytes !== MAXIMUM_BODY_BYTES ||
    download.maximumRequests !== 1
  )
    fail();
  exactFalseRecord(
    Object.fromEntries(DOWNLOAD_KEYS.slice(3).map((key) => [key, download[key]])),
    DOWNLOAD_KEYS.slice(3),
  );
  exactKeys(authority.isolation, ISOLATION_KEYS);
  for (const key of ISOLATION_KEYS.slice(0, 3)) if (authority.isolation[key] !== true) fail();
  for (const key of ISOLATION_KEYS.slice(3)) if (authority.isolation[key] !== false) fail();
  exactArray(authority.requiredPostDownloadEvidence, REQUIRED_EVIDENCE);
  exactArray(authority.forbiddenActions, FORBIDDEN_ACTIONS);
  return true;
}

export function readRoslynVerifierDownloadAuthority() {
  const path = fileURLToPath(
    new URL("./root-only-closure-roslyn-download-authority.json", import.meta.url),
  );
  const authority = JSON.parse(readFileSync(path, "utf8"));
  validateRoslynVerifierDownloadAuthority(authority);
  return deepFreeze(authority);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function validateSyntheticObservation(authority, observation) {
  validateRoslynVerifierDownloadAuthority(authority);
  exactKeys(observation, [
    "synthetic",
    "requestCount",
    "redirectCount",
    "retryCount",
    "resumeUsed",
    "proxyUsed",
    "credentialsUsed",
    "cookiesUsed",
    "customTrustUsed",
    "shellUsed",
    "bodyBytes",
    "observedSha256",
    "authenticodeObservedSha256",
    "authenticodeFileIdentityBefore",
    "authenticodeFileIdentityAfter",
    "authenticodeHandlePolicy",
    "authenticodeIdentityStable",
    "authenticodeStatus",
    "signatureChainStatus",
    "codeSigningEku",
    "revocationNetworkPolicy",
    "signerChainRevocationMode",
    "signerChainRevocationFlag",
    "signerChainVerificationFlags",
    "signerRevocationEvidenceStatus",
    "timestampChainStatus",
    "timestampChainRevocationMode",
    "timestampChainRevocationFlag",
    "timestampChainVerificationFlags",
    "timestampRevocationEvidenceStatus",
    "productVersion",
    "fileVersion",
    "scriptCount",
    "cleanupComplete",
  ]);
  if (observation.synthetic !== true) fail();
  if (
    observation.requestCount !== 1 ||
    observation.redirectCount !== 0 ||
    observation.retryCount !== 0 ||
    observation.resumeUsed !== false ||
    observation.proxyUsed !== false ||
    observation.credentialsUsed !== false ||
    observation.cookiesUsed !== false ||
    observation.customTrustUsed !== false ||
    observation.shellUsed !== false ||
    !Number.isSafeInteger(observation.bodyBytes) ||
    observation.bodyBytes <= 0 ||
    observation.bodyBytes > MAXIMUM_BODY_BYTES ||
    observation.observedSha256 !== VERIFIER_SHA256 ||
    observation.authenticodeObservedSha256 !== VERIFIER_SHA256 ||
    !/^[0-9a-f]{64}$/u.test(observation.authenticodeFileIdentityBefore) ||
    observation.authenticodeFileIdentityAfter !== observation.authenticodeFileIdentityBefore ||
    observation.authenticodeHandlePolicy !== "READ_ONLY_DENY_WRITE_DELETE_HELD" ||
    observation.authenticodeIdentityStable !== true ||
    observation.authenticodeStatus !== "Valid" ||
    observation.signatureChainStatus !== "Trusted" ||
    observation.codeSigningEku !== "1.3.6.1.5.5.7.3.3" ||
    observation.timestampChainStatus !== "Trusted" ||
    observation.productVersion !== "7.9.0" ||
    observation.fileVersion !== "7.9.0.83" ||
    observation.scriptCount !== 0 ||
    observation.cleanupComplete !== true
  )
    fail();
  if (
    observation.revocationNetworkPolicy !== "OFFLINE_CACHE_ONLY_NO_NETWORK" ||
    observation.signerChainRevocationMode !== "Offline" ||
    observation.signerChainRevocationFlag !== "EntireChain" ||
    observation.signerChainVerificationFlags !== "NoFlag" ||
    observation.signerRevocationEvidenceStatus !== "VALID_WITH_COMPLETE_OFFLINE_REVOCATION" ||
    observation.timestampChainRevocationMode !== "Offline" ||
    observation.timestampChainRevocationFlag !== "EntireChain" ||
    observation.timestampChainVerificationFlags !== "NoFlag" ||
    observation.timestampRevocationEvidenceStatus !== "VALID_WITH_COMPLETE_OFFLINE_REVOCATION"
  )
    revocationFail();
  return deepFreeze({ evidenceStatus: "NON_EVIDENCE", externalActionAuthorized: false });
}

export function rejectUntrustedVerifierBytes(authority, bytes) {
  validateRoslynVerifierDownloadAuthority(authority);
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength <= 0 ||
    bytes.byteLength > MAXIMUM_BODY_BYTES
  )
    fail();
  if (sha256(bytes) !== VERIFIER_SHA256) fail();
  return Object.freeze({
    evidenceStatus: "HASH_ONLY_EXECUTION_PROHIBITED",
    externalActionAuthorized: false,
  });
}

export const roslynVerifierToolchainTesting = Object.freeze({ validateSyntheticObservation });
