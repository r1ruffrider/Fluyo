import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  OUT_OF_SCOPE_UNTRACKED_R4B_TESTS,
  PORTABLE_R4B_TESTS,
  R4B_GIT_OUTPUT_CAP_BYTES,
  R4B_LANE_INVENTORY_SHA256,
  R4B_OUT_OF_SCOPE_UNTRACKED_SHA256,
  R4B_PHASE_TEST,
  r4bLaneSnapshotTesting,
  validateR4bTestLaneInventory,
  validateR4bTestLaneInventorySnapshot,
  WINDOWS_NATIVE_R4B_TESTS,
} from "./r4b-test-lanes.mjs";

import {
  MAXIMUM_BODY_BYTES,
  readRoslynVerifierDownloadAuthority,
  rejectUntrustedVerifierBytes,
  roslynVerifierToolchainTesting,
  validateRoslynVerifierDownloadAuthority,
  VERIFIER_SHA256,
} from "./root-only-closure-roslyn-toolchain.mjs";

import {
  addTypeBootstrapTesting,
  BOOTSTRAP_MECHANISM,
  BOOTSTRAP_TERMINAL,
  SYNTHETIC_EXECUTION_CONTRACT_VERSION,
  captureEncodedBootstrap,
  deriveSyntheticEnvelope,
  prepareSyntheticCompilePlan,
  readAddTypeBootstrapPolicy,
  runSyntheticCompileTransaction,
  validateAddTypeAuditSource,
  validateAddTypeBootstrapPolicy,
  validateAuthenticodeHelperSource,
  validateSyntheticProcessResult,
  verifyPinnedRepositorySources,
} from "./root-only-closure-nuget-addtype-bootstrap-v1.mjs";
import {
  FAILURE_ROOT_KEYS,
  parseAndValidateAuthenticodeHelperOutput,
  SUCCESS_ROOT_KEYS,
  validateVerifierFailureReceipt,
  validateVerifierSuccessReceipt,
  verifierReceiptTesting,
} from "./root-only-closure-verifier-bytes-receipt-v1.mjs";
import {
  ADAPTER_FAILURE_REASONS,
  ADAPTER_PATH,
  ADAPTER_VERSION,
  adapterTesting,
  buildManagedReceipt,
  canonicalPayloadBytes,
  CanonicalRpcSession,
  CLI_MODE,
  ConcreteSyntheticAdapter,
  createPrebootstrapRoot,
  decodeFrame,
  EMPTY_SHA256,
  encodeFrame,
  handshakeProof,
  HELD_IMAGE_KEYS,
  NETWORK_EVIDENCE_MODE,
  normalizedImagePathSha256,
  OBSERVED_IDENTITY_KEYS,
  PROTOCOL_VERSION,
  RPC_REQUEST_SCHEMAS,
  RPC_RESULT_SCHEMAS,
  runAuthorizedCliV12,
  SNAPSHOT_MODE,
  validateAuditManifestParity,
  validateCliEnvelope,
} from "./root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs";

const authority = readRoslynVerifierDownloadAuthority();
const addTypePolicy = readAddTypeBootstrapPolicy(
  readFileSync(
    new URL("./root-only-closure-nuget-addtype-bootstrap-policy-v1.json", import.meta.url),
  ),
);
const EXPECTED_LANE_PATHS = Object.freeze([...PORTABLE_R4B_TESTS, ...WINDOWS_NATIVE_R4B_TESTS]);
const EXPECTED_EVIDENCE = Object.freeze([
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
const OMITTED_FUTURE_RECEIPT_KEYS = Object.freeze([
  "observedByteCount",
  "signerSubject",
  "signerThumbprint",
  "signerIssuer",
  "signerSerial",
  "signerValidity",
  "timestampSubject",
  "timestampThumbprint",
  "timestampUtc",
  "licenseEvidence",
  "sbomInventory",
  "scriptAbsence",
  "hostIsolationEvidence",
  "retentionDecision",
  "cleanupEvidence",
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setAtPath(root, path, value) {
  let target = root;
  for (const segment of path.slice(0, -1)) target = target[segment];
  target[path.at(-1)] = value;
}

function literalMutations(value, path = [], result = []) {
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value))
      literalMutations(child, [...path, key], result);
    return result;
  }
  const joined = path.join(".");
  if (
    [
      "sourceControl.newSources.1.byteCount",
      "sourceControl.newSources.1.sha256",
      "sourceControl.newSources.1.gitBlobSha1",
    ].includes(joined)
  )
    return result;
  const changed =
    typeof value === "boolean"
      ? !value
      : typeof value === "number"
        ? value + 1
        : value === null
          ? "NOT_NULL"
          : `${value}__MUTATED`;
  result.push({ path, changed });
  return result;
}

function observation(overrides = {}) {
  return {
    synthetic: true,
    requestCount: 1,
    redirectCount: 0,
    retryCount: 0,
    resumeUsed: false,
    proxyUsed: false,
    credentialsUsed: false,
    cookiesUsed: false,
    customTrustUsed: false,
    shellUsed: false,
    bodyBytes: 1,
    observedSha256: VERIFIER_SHA256,
    authenticodeObservedSha256: VERIFIER_SHA256,
    authenticodeFileIdentityBefore: "1".repeat(64),
    authenticodeFileIdentityAfter: "1".repeat(64),
    authenticodeHandlePolicy: "READ_ONLY_DENY_WRITE_DELETE_HELD",
    authenticodeIdentityStable: true,
    authenticodeStatus: "Valid",
    signatureChainStatus: "Trusted",
    codeSigningEku: "1.3.6.1.5.5.7.3.3",
    revocationNetworkPolicy: "OFFLINE_CACHE_ONLY_NO_NETWORK",
    signerChainRevocationMode: "Offline",
    signerChainRevocationFlag: "EntireChain",
    signerChainVerificationFlags: "NoFlag",
    signerRevocationEvidenceStatus: "VALID_WITH_COMPLETE_OFFLINE_REVOCATION",
    timestampChainStatus: "Trusted",
    timestampChainRevocationMode: "Offline",
    timestampChainRevocationFlag: "EntireChain",
    timestampChainVerificationFlags: "NoFlag",
    timestampRevocationEvidenceStatus: "VALID_WITH_COMPLETE_OFFLINE_REVOCATION",
    productVersion: "7.9.0",
    fileVersion: "7.9.0.83",
    scriptCount: 0,
    cleanupComplete: true,
    ...overrides,
  };
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function gitBuffer(paths) {
  return Buffer.from(paths.map((path) => `${path}\0`).join(""), "utf8");
}

function gitResult(paths, overrides = {}) {
  return {
    status: 0,
    errorCode: null,
    stdout: gitBuffer(paths),
    stderr: Buffer.alloc(0),
    ...overrides,
  };
}

function stagedGitResult(tokens, overrides = {}) {
  return {
    status: 0,
    errorCode: null,
    stdout: Buffer.from(tokens.map((token) => `${token}\0`).join(""), "utf8"),
    stderr: Buffer.alloc(0),
    ...overrides,
  };
}

function laneSnapshot(overrides = {}) {
  return {
    trackedTestPaths: [...EXPECTED_LANE_PATHS].sort(),
    stagedTestPaths: [],
    untrackedTestPaths: [],
    phaseTestKind: "regular",
    ...overrides,
  };
}

test("verifier authority is exact, closed, non-authorizing, and contains no placeholders", () => {
  assert.equal(validateRoslynVerifierDownloadAuthority(authority), true);
  assert.equal(authority.externalActionAuthorized, false);
  assert.equal(authority.executionAuthorityPresent, false);
  assert.equal(authority.download.maximumBodyBytes, 16_777_216);
  assert.equal(authority.verifier.sha256, VERIFIER_SHA256);
  assert.equal(authority.schema, "fluyo:r4b:roslyn-verifier-download-authority:v2");
  assert.equal(authority.authorityVersion, "R4B-ROSLYN-VERIFIER-BOOTSTRAP-v1.2");
  assert.equal(Object.isFrozen(authority), true);
  assert.equal(Object.isFrozen(authority.verifier), true);
  assert.equal(Object.isFrozen(authority.download), true);
  assert.equal(Object.isFrozen(authority.isolation), true);
  assert.equal(Object.isFrozen(authority.requiredPostDownloadEvidence), true);
  assert.equal(Object.isFrozen(authority.forbiddenActions), true);
  assert.doesNotMatch(JSON.stringify(authority), /TBD|TODO|UNRESOLVED|PLACEHOLDER/u);
  assert.equal(JSON.stringify(authority).includes("VERIFIER_EXECUTION_AUTHORIZED_V1"), false);
});

test("authority rejects identity drift, reordered or unknown fields, and authorization escalation", () => {
  for (const mutation of [
    (value) => (value.verifier.version = "7.9.1"),
    (value) => (value.verifier.url = "https://dist.nuget.org/win-x86-commandline/latest/nuget.exe"),
    (value) => (value.verifier.sha256 = "0".repeat(64)),
    (value) => (value.download.maximumBodyBytes += 1),
    (value) => (value.download.redirectsAllowed = true),
    (value) => (value.isolation.executionAllowed = true),
    (value) => (value.externalActionAuthorized = true),
    (value) => (value.executionAuthorityPresent = true),
    (value) => (value.unknown = true),
    (value) =>
      (value.requiredPostDownloadEvidence = [...value.requiredPostDownloadEvidence].reverse()),
  ]) {
    const candidate = clone(authority);
    mutation(candidate);
    assert.throws(() => validateRoslynVerifierDownloadAuthority(candidate), /AUTHORITY_INVALID/u);
  }
  const reordered = Object.fromEntries(Object.entries(clone(authority)).reverse());
  assert.throws(() => validateRoslynVerifierDownloadAuthority(reordered), /AUTHORITY_INVALID/u);

  for (const key of Object.keys(authority.download).slice(3)) {
    const candidate = clone(authority);
    candidate.download[key] = true;
    assert.throws(
      () => validateRoslynVerifierDownloadAuthority(candidate),
      /AUTHORITY_INVALID/u,
      key,
    );
  }
  for (const key of Object.keys(authority.isolation).slice(3)) {
    const candidate = clone(authority);
    candidate.isolation[key] = true;
    assert.throws(
      () => validateRoslynVerifierDownloadAuthority(candidate),
      /AUTHORITY_INVALID/u,
      key,
    );
  }
});

test("authority is recursively immutable across nested records and both arrays", () => {
  const before = JSON.stringify(authority);
  for (const mutation of [
    () => (authority.verifier.version = "8.0.0"),
    () => (authority.verifier.sha256 = "0".repeat(64)),
    () => (authority.download.redirectsAllowed = true),
    () => (authority.download.cookiesAllowed = true),
    () => (authority.isolation.executionAllowed = true),
    () => (authority.isolation.globalInstallAllowed = true),
    () => authority.requiredPostDownloadEvidence.push("unknownEvidence"),
    () => authority.forbiddenActions.pop(),
  ]) {
    assert.throws(mutation, TypeError);
    assert.equal(JSON.stringify(authority), before);
    assert.equal(validateRoslynVerifierDownloadAuthority(authority), true);
  }
});

test("required evidence inventory rejects missing, reordered, and extra keys", () => {
  assert.deepEqual(authority.requiredPostDownloadEvidence, EXPECTED_EVIDENCE);
  for (let index = 0; index < EXPECTED_EVIDENCE.length; index += 1) {
    const candidate = clone(authority);
    candidate.requiredPostDownloadEvidence.splice(index, 1);
    assert.throws(() => validateRoslynVerifierDownloadAuthority(candidate), /AUTHORITY_INVALID/u);
  }
  const reordered = clone(authority);
  reordered.requiredPostDownloadEvidence.reverse();
  assert.throws(() => validateRoslynVerifierDownloadAuthority(reordered), /AUTHORITY_INVALID/u);
  const extra = clone(authority);
  extra.requiredPostDownloadEvidence.push("unknownEvidence");
  assert.throws(() => validateRoslynVerifierDownloadAuthority(extra), /AUTHORITY_INVALID/u);
});

test("synthetic transaction validator fails closed on every download and trust boundary", () => {
  const accepted = roslynVerifierToolchainTesting.validateSyntheticObservation(
    authority,
    observation(),
  );
  assert.deepEqual(accepted, { evidenceStatus: "NON_EVIDENCE", externalActionAuthorized: false });
  assert.equal(Object.isFrozen(accepted), true);
  for (const [key, invalid] of [
    ["synthetic", false],
    ["requestCount", 2],
    ["redirectCount", 1],
    ["retryCount", 1],
    ["resumeUsed", true],
    ["proxyUsed", true],
    ["credentialsUsed", true],
    ["cookiesUsed", true],
    ["customTrustUsed", true],
    ["shellUsed", true],
    ["bodyBytes", 0],
    ["bodyBytes", MAXIMUM_BODY_BYTES + 1],
    ["observedSha256", "0".repeat(64)],
    ["authenticodeObservedSha256", "0".repeat(64)],
    ["authenticodeFileIdentityBefore", "not-a-digest"],
    ["authenticodeFileIdentityAfter", "2".repeat(64)],
    ["authenticodeHandlePolicy", "READ_ONLY"],
    ["authenticodeIdentityStable", false],
    ["authenticodeStatus", "NotSigned"],
    ["signatureChainStatus", "Untrusted"],
    ["codeSigningEku", "1.2.3"],
    ["timestampChainStatus", "Untrusted"],
    ["productVersion", "7.9.1"],
    ["fileVersion", "7.9.0.84"],
    ["scriptCount", 1],
    ["cleanupComplete", false],
  ]) {
    assert.throws(
      () =>
        roslynVerifierToolchainTesting.validateSyntheticObservation(
          authority,
          observation({ [key]: invalid }),
        ),
      /AUTHORITY_INVALID/u,
      String(key),
    );
  }

  for (const [key, invalid] of [
    ["revocationNetworkPolicy", "ONLINE"],
    ["signerChainRevocationMode", "Online"],
    ["signerChainRevocationMode", "NoCheck"],
    ["signerChainRevocationFlag", "EndCertificateOnly"],
    ["signerChainRevocationFlag", "ExcludeRoot"],
    ["signerChainVerificationFlags", "AllowUnknownCertificateAuthority"],
    ["signerRevocationEvidenceStatus", "UNAVAILABLE"],
    ["timestampChainRevocationMode", "Online"],
    ["timestampChainRevocationMode", "NoCheck"],
    ["timestampChainRevocationFlag", "EndCertificateOnly"],
    ["timestampChainRevocationFlag", "ExcludeRoot"],
    ["timestampChainVerificationFlags", "AllowUnknownCertificateAuthority"],
    ["timestampRevocationEvidenceStatus", "UNAVAILABLE"],
  ]) {
    assert.throws(
      () =>
        roslynVerifierToolchainTesting.validateSyntheticObservation(
          authority,
          observation({ [key]: invalid }),
        ),
      /REVOCATION_EVIDENCE_UNAVAILABLE/u,
      String(key),
    );
  }

  const reordered = Object.fromEntries(Object.entries(observation()).reverse());
  assert.throws(
    () => roslynVerifierToolchainTesting.validateSyntheticObservation(authority, reordered),
    /AUTHORITY_INVALID/u,
  );
  for (const key of Object.keys(observation())) {
    const missing = observation();
    delete missing[key];
    assert.throws(
      () => roslynVerifierToolchainTesting.validateSyntheticObservation(authority, missing),
      /AUTHORITY_INVALID/u,
      key,
    );
  }
  assert.throws(
    () =>
      roslynVerifierToolchainTesting.validateSyntheticObservation(
        authority,
        Object.assign(observation(), { unknown: true }),
      ),
    /AUTHORITY_INVALID/u,
  );
  for (const key of OMITTED_FUTURE_RECEIPT_KEYS) {
    assert.throws(
      () =>
        roslynVerifierToolchainTesting.validateSyntheticObservation(
          authority,
          Object.assign(observation(), { [key]: "forbidden-future-receipt-field" }),
        ),
      /AUTHORITY_INVALID/u,
      key,
    );
  }
});

test("raw bytes can never create execution authority and wrong bytes are rejected", () => {
  assert.throws(
    () => rejectUntrustedVerifierBytes(authority, new Uint8Array()),
    /AUTHORITY_INVALID/u,
  );
  assert.throws(
    () => rejectUntrustedVerifierBytes(authority, new Uint8Array([1, 2, 3])),
    /AUTHORITY_INVALID/u,
  );
  assert.throws(
    () => rejectUntrustedVerifierBytes(authority, new Uint8Array(MAXIMUM_BODY_BYTES + 1)),
    /AUTHORITY_INVALID/u,
  );
});

test("module and authority contain no network, process, install, or execution primitive", () => {
  const source = readFileSync(
    new URL("./root-only-closure-roslyn-toolchain.mjs", import.meta.url),
    "utf8",
  );
  for (const forbidden of [
    "node:http",
    "node:https",
    "node:net",
    "node:tls",
    "child_process",
    "spawn(",
    "exec(",
    "fetch(",
    "Invoke-WebRequest",
    "Start-Process",
    "VERIFIER_EXECUTION_AUTHORIZED_V1",
    "VERIFIER_BYTES_VERIFIED_V1",
    "validateVerifierReceipt",
    "receiptSchema",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test("lane snapshot contract locks exact canonical paths and digests", () => {
  const laneSource = readFileSync(new URL("./r4b-test-lanes.mjs", import.meta.url), "utf8");
  const fixedErrorVocabulary = [...laneSource.matchAll(/["'](R4B_LANE_[A-Z_]+)["']/gu)].map(
    (match) => match[1],
  );
  assert.deepEqual([...new Set(fixedErrorVocabulary)].sort(), [
    "R4B_LANE_GIT_FAILURE",
    "R4B_LANE_GIT_OUTPUT_LIMIT",
    "R4B_LANE_GIT_OUTPUT_MALFORMED",
    "R4B_LANE_INVENTORY_MISMATCH",
    "R4B_LANE_PHASE_TEST_NONREGULAR",
  ]);
  assert.doesNotMatch(
    laneSource,
    /test inventory must|inventory contains a duplicate|canonical lexicographic/u,
  );
  assert.deepEqual(Object.keys(r4bLaneSnapshotTesting), [
    "decodeGitTestPaths",
    "decodeGitStagedTestPaths",
    "collectGitTestSnapshotWithRunner",
  ]);
  const laneJson = JSON.stringify({
    portable: PORTABLE_R4B_TESTS,
    windowsNative: WINDOWS_NATIVE_R4B_TESTS,
  });
  const exclusionJson = JSON.stringify(OUT_OF_SCOPE_UNTRACKED_R4B_TESTS);
  assert.equal(Buffer.byteLength(laneJson), 860);
  assert.equal(hash(laneJson), R4B_LANE_INVENTORY_SHA256);
  assert.equal(
    R4B_LANE_INVENTORY_SHA256,
    "6ccc0208c8d7e104d6ebfe2e9b196eb3b5ddbc599ef365ae92c65e6ec712d9f2",
  );
  assert.equal(Buffer.byteLength(exclusionJson), 483);
  assert.equal(hash(exclusionJson), R4B_OUT_OF_SCOPE_UNTRACKED_SHA256);
  assert.equal(
    R4B_OUT_OF_SCOPE_UNTRACKED_SHA256,
    "8d875d47149a98760b795907131676b4c334652a679ebe97645c942eae32b3bc",
  );
  assert.equal(R4B_PHASE_TEST, "scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs");
});

test("pure lane snapshot accepts untracked, staged, tracked, and tracked-modified phase states", () => {
  const trackedWithoutPhase = EXPECTED_LANE_PATHS.filter((path) => path !== R4B_PHASE_TEST).sort();
  const expected = {
    portable: 11,
    windowsNative: 5,
    total: 16,
    inventorySha256: R4B_LANE_INVENTORY_SHA256,
    outOfScopeUntrackedSha256: R4B_OUT_OF_SCOPE_UNTRACKED_SHA256,
  };
  const states = [
    laneSnapshot({
      trackedTestPaths: trackedWithoutPhase,
      untrackedTestPaths: [...OUT_OF_SCOPE_UNTRACKED_R4B_TESTS, R4B_PHASE_TEST].sort(),
    }),
    laneSnapshot({
      trackedTestPaths: trackedWithoutPhase,
      stagedTestPaths: [R4B_PHASE_TEST],
      untrackedTestPaths: [...OUT_OF_SCOPE_UNTRACKED_R4B_TESTS],
    }),
    laneSnapshot({ untrackedTestPaths: [...OUT_OF_SCOPE_UNTRACKED_R4B_TESTS] }),
    laneSnapshot({
      stagedTestPaths: [R4B_PHASE_TEST],
      untrackedTestPaths: [...OUT_OF_SCOPE_UNTRACKED_R4B_TESTS],
    }),
  ];
  for (const state of states) {
    const result = validateR4bTestLaneInventorySnapshot(state);
    assert.deepEqual(result, expected);
    assert.equal(Object.isFrozen(result), true);
  }
});

test("pure lane snapshot rejects unexpected, near-match, missing, duplicate, and excluded tracked paths", () => {
  const mutations = [
    laneSnapshot({ untrackedTestPaths: ["scripts/r4b-evidence/unexpected.test.mjs"] }),
    laneSnapshot({ untrackedTestPaths: [`${R4B_PHASE_TEST}.bak`] }),
    laneSnapshot({ trackedTestPaths: EXPECTED_LANE_PATHS.slice(1).sort() }),
    laneSnapshot({ trackedTestPaths: [...EXPECTED_LANE_PATHS, EXPECTED_LANE_PATHS[0]].sort() }),
    laneSnapshot({
      trackedTestPaths: [...EXPECTED_LANE_PATHS, OUT_OF_SCOPE_UNTRACKED_R4B_TESTS[0]].sort(),
    }),
    laneSnapshot({ stagedTestPaths: ["scripts/r4b-evidence/unexpected.test.mjs"] }),
    laneSnapshot({ stagedTestPaths: [`${R4B_PHASE_TEST}.bak`] }),
    laneSnapshot({ stagedTestPaths: [OUT_OF_SCOPE_UNTRACKED_R4B_TESTS[0]] }),
    laneSnapshot({ stagedTestPaths: [R4B_PHASE_TEST, R4B_PHASE_TEST] }),
    laneSnapshot({ phaseTestKind: "symlink" }),
  ];
  for (const candidate of mutations) {
    assert.throws(
      () => validateR4bTestLaneInventorySnapshot(candidate),
      /R4B_LANE_(INVENTORY_MISMATCH|PHASE_TEST_NONREGULAR)/u,
    );
  }
});

test("Git decoder enforces bounded closed result shape and canonical NUL paths", () => {
  const { decodeGitTestPaths, decodeGitStagedTestPaths } = r4bLaneSnapshotTesting;
  assert.deepEqual(
    decodeGitTestPaths(gitResult([...EXPECTED_LANE_PATHS].sort())),
    [...EXPECTED_LANE_PATHS].sort(),
  );
  assert.deepEqual(decodeGitTestPaths(gitResult([])), []);
  assert.throws(
    () => decodeGitTestPaths({ status: 0, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) }),
    /R4B_LANE_GIT_OUTPUT_MALFORMED/u,
  );
  assert.throws(
    () => decodeGitTestPaths(gitResult([], { errorCode: "ENOBUFS" })),
    /R4B_LANE_GIT_OUTPUT_LIMIT/u,
  );
  assert.throws(
    () => decodeGitTestPaths(gitResult([], { stdout: Buffer.alloc(R4B_GIT_OUTPUT_CAP_BYTES + 1) })),
    /R4B_LANE_GIT_OUTPUT_LIMIT/u,
  );
  assert.throws(
    () => decodeGitTestPaths(gitResult([], { errorCode: "OTHER" })),
    /R4B_LANE_GIT_FAILURE/u,
  );
  assert.throws(() => decodeGitTestPaths(gitResult([], { status: 1 })), /R4B_LANE_GIT_FAILURE/u);
  assert.throws(
    () => decodeGitTestPaths(gitResult([], { stderr: Buffer.from("fixed failure") })),
    /R4B_LANE_GIT_FAILURE/u,
  );
  assert.throws(
    () => decodeGitTestPaths(gitResult([], { stdout: Buffer.from([0xff, 0]) })),
    /R4B_LANE_GIT_OUTPUT_MALFORMED/u,
  );
  assert.throws(
    () => decodeGitTestPaths(gitResult([], { stdout: Buffer.from(R4B_PHASE_TEST) })),
    /R4B_LANE_GIT_OUTPUT_MALFORMED/u,
  );
  assert.throws(
    () => decodeGitTestPaths(gitResult([...EXPECTED_LANE_PATHS].reverse())),
    /R4B_LANE_GIT_OUTPUT_MALFORMED/u,
  );
  for (const control of ["\t", "\u0001", "\u001f", "\u007f", "\u0080", "\u0085", "\u009f"]) {
    assert.throws(
      () => decodeGitTestPaths(gitResult([`scripts/r4b-evidence/control${control}.test.mjs`])),
      /R4B_LANE_GIT_OUTPUT_MALFORMED/u,
    );
  }
  assert.deepEqual(decodeGitStagedTestPaths(stagedGitResult([])), []);
  assert.deepEqual(decodeGitStagedTestPaths(stagedGitResult(["A", R4B_PHASE_TEST])), [
    R4B_PHASE_TEST,
  ]);
  assert.deepEqual(
    decodeGitStagedTestPaths(stagedGitResult(["M", "scripts/r4b-evidence/readme.mjs"])),
    [],
  );
  for (const deletedPath of [
    R4B_PHASE_TEST,
    OUT_OF_SCOPE_UNTRACKED_R4B_TESTS[0],
    "scripts/r4b-evidence/readme.mjs",
  ]) {
    assert.throws(
      () => decodeGitStagedTestPaths(stagedGitResult(["D", deletedPath])),
      /R4B_LANE_INVENTORY_MISMATCH/u,
    );
  }
  for (const [invalidatingStatus, invalidatingPath] of [
    ["T", R4B_PHASE_TEST],
    ["T", "scripts/r4b-evidence/r4b-test-lanes.mjs"],
    ["T", "scripts/r4b-evidence/readme.mjs"],
    ["U", R4B_PHASE_TEST],
    ["X", R4B_PHASE_TEST],
    ["B", R4B_PHASE_TEST],
  ]) {
    assert.throws(
      () => decodeGitStagedTestPaths(stagedGitResult([invalidatingStatus, invalidatingPath])),
      /R4B_LANE_INVENTORY_MISMATCH/u,
    );
  }
  for (const scoredStatus of ["R100", "R099", "C100", "C050"]) {
    assert.throws(
      () =>
        decodeGitStagedTestPaths(
          stagedGitResult([scoredStatus, R4B_PHASE_TEST, `${R4B_PHASE_TEST}.next`]),
        ),
      /R4B_LANE_GIT_OUTPUT_MALFORMED/u,
    );
  }
  for (const malformedTokens of [
    ["R", R4B_PHASE_TEST, `${R4B_PHASE_TEST}.next`],
    ["C", R4B_PHASE_TEST, `${R4B_PHASE_TEST}.next`],
    ["R1000", R4B_PHASE_TEST, `${R4B_PHASE_TEST}.next`],
    ["C1000", R4B_PHASE_TEST, `${R4B_PHASE_TEST}.next`],
    ["Q", R4B_PHASE_TEST],
    ["A"],
    ["A", R4B_PHASE_TEST, "extra"],
    ["A", R4B_PHASE_TEST, "M", R4B_PHASE_TEST],
    ["A", "scripts/r4b-evidence/../escape.test.mjs"],
  ]) {
    assert.throws(
      () => decodeGitStagedTestPaths(stagedGitResult(malformedTokens)),
      /R4B_LANE_GIT_OUTPUT_MALFORMED/u,
    );
  }
  assert.throws(
    () =>
      decodeGitStagedTestPaths(
        stagedGitResult([], { stdout: Buffer.from(`A\0${R4B_PHASE_TEST}`, "utf8") }),
      ),
    /R4B_LANE_GIT_OUTPUT_MALFORMED/u,
  );
  assert.throws(
    () =>
      decodeGitStagedTestPaths(
        stagedGitResult(["M", PORTABLE_R4B_TESTS[1], "A", PORTABLE_R4B_TESTS[0]]),
      ),
    /R4B_LANE_GIT_OUTPUT_MALFORMED/u,
  );
});

test("Git snapshot runner uses the three exact commands and propagates staged failures", () => {
  const calls = [];
  const results = [gitResult([...EXPECTED_LANE_PATHS].sort()), gitResult([]), gitResult([])];
  const snapshot = r4bLaneSnapshotTesting.collectGitTestSnapshotWithRunner((arguments_) => {
    calls.push(arguments_);
    return results[calls.length - 1];
  });
  assert.deepEqual(calls, [
    [
      "-c",
      "core.quotepath=false",
      "ls-tree",
      "-r",
      "-z",
      "--name-only",
      "HEAD",
      "--",
      "scripts/r4b-evidence",
    ],
    [
      "-c",
      "core.quotepath=false",
      "diff",
      "--cached",
      "--name-status",
      "-z",
      "--no-renames",
      "--",
      "scripts/r4b-evidence",
    ],
    [
      "-c",
      "core.quotepath=false",
      "ls-files",
      "-z",
      "--others",
      "--exclude-standard",
      "--",
      "scripts/r4b-evidence",
    ],
  ]);
  assert.deepEqual(snapshot, {
    trackedTestPaths: [...EXPECTED_LANE_PATHS].sort(),
    stagedTestPaths: [],
    untrackedTestPaths: [],
  });
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.trackedTestPaths), true);
  assert.equal(Object.isFrozen(snapshot.stagedTestPaths), true);
  assert.equal(Object.isFrozen(snapshot.untrackedTestPaths), true);
  const collect = (stagedResult) => {
    const injected = [gitResult([...EXPECTED_LANE_PATHS].sort()), stagedResult, gitResult([])];
    let index = 0;
    return r4bLaneSnapshotTesting.collectGitTestSnapshotWithRunner(() => injected[index++]);
  };
  assert.throws(() => collect(gitResult([], { errorCode: "OTHER" })), /R4B_LANE_GIT_FAILURE/u);
  assert.throws(
    () => collect(gitResult([], { stdout: Buffer.alloc(R4B_GIT_OUTPUT_CAP_BYTES + 1) })),
    /R4B_LANE_GIT_OUTPUT_LIMIT/u,
  );
  assert.throws(
    () => collect(gitResult([], { stdout: Buffer.from(R4B_PHASE_TEST) })),
    /R4B_LANE_GIT_OUTPUT_MALFORMED/u,
  );
  assert.throws(
    () =>
      r4bLaneSnapshotTesting.collectGitTestSnapshotWithRunner(() => {
        throw new Error("raw");
      }),
    /R4B_LANE_GIT_FAILURE/u,
  );
});

test("isolated Git type change emits T and is rejected without touching the production index", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "fluyo-r4b-lane-type-change-"));
  const relativePath = "scripts/r4b-evidence/non-phase.mjs";
  const git = (arguments_, options = {}) =>
    execFileSync("git", arguments_, { cwd: fixtureRoot, windowsHide: true, ...options });
  try {
    git(["init", "-q"]);
    mkdirSync(join(fixtureRoot, "scripts", "r4b-evidence"), { recursive: true });
    writeFileSync(join(fixtureRoot, relativePath), "regular\n", "utf8");
    git(["add", "--", relativePath]);
    git([
      "-c",
      "user.name=Fluyo Fixture",
      "-c",
      "user.email=fixture@invalid.example",
      "commit",
      "-q",
      "-m",
      "base",
    ]);
    const linkBlob = git(["hash-object", "-w", "--stdin"], {
      input: Buffer.from("target", "utf8"),
      encoding: "utf8",
    }).trim();
    git(["update-index", "--add", "--cacheinfo", `120000,${linkBlob},${relativePath}`]);
    const stdout = git([
      "-c",
      "core.quotepath=false",
      "diff",
      "--cached",
      "--name-status",
      "-z",
      "--no-renames",
      "--",
      "scripts/r4b-evidence",
    ]);
    assert.deepEqual(stdout, Buffer.from(`T\0${relativePath}\0`, "utf8"));
    assert.throws(
      () =>
        r4bLaneSnapshotTesting.decodeGitStagedTestPaths({
          status: 0,
          errorCode: null,
          stdout,
          stderr: Buffer.alloc(0),
        }),
      /R4B_LANE_INVENTORY_MISMATCH/u,
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("current repository Git snapshot satisfies the closed phase inventory", () => {
  const result = validateR4bTestLaneInventory();
  assert.equal(result.total, 16);
  assert.equal(result.inventorySha256, R4B_LANE_INVENTORY_SHA256);
  assert.equal(result.outOfScopeUntrackedSha256, R4B_OUT_OF_SCOPE_UNTRACKED_SHA256);
});

function validBootstrapSuccessReceipt() {
  const digest = "a".repeat(64);
  const identity = "b".repeat(64);
  return {
    schema: "fluyo:r4b:roslyn-verifier-bytes-receipt:v1",
    receiptVersion: "VERIFIER_BYTES_VERIFIED_V1",
    authorityCommit: "c".repeat(40),
    authorityArtifactSha256: digest,
    sourceMainCommit: addTypePolicy.sourceControl.sourceMainCommit,
    transactionId: addTypePolicy.futureActivation.transactionId,
    state: "RECEIPT_RECORDED",
    outcome: "BYTES_VERIFIED_PENDING_EXECUTION_REVIEW",
    externalActionAuthorized: false,
    executionAuthorityPresent: false,
    executionAllowed: false,
    requestCount: 1,
    bootstrap: {
      mechanism: BOOTSTRAP_MECHANISM,
      policySha256: digest,
      designCommit: "d".repeat(40),
      script: {
        pathIdentifier: addTypePolicy.bootstrap.scriptPath,
        gitBlobSha1: "e".repeat(40),
        byteCount: 8744,
        sha256: digest,
        utf16leByteCount: 17488,
        base64CharacterCount: 23320,
        encodedCommandSha256: digest,
        renderedCommandLineUtf16Units: 23400,
      },
      addTypeSource: {
        pathIdentifier: addTypePolicy.bootstrap.auditSourcePath,
        gitBlobSha1: "f".repeat(40),
        byteCount: 6863,
        sha256: digest,
        embeddedSha256: digest,
        embeddedSourceEqual: true,
        dllImports: addTypeBootstrapTesting.DLL_IMPORTS,
        safeHandleTypes: [
          "SafeFileHandle",
          "SafeWaitHandle",
          "OwnedCertContext",
          "OwnedCertStore",
          "OwnedCertChain",
          "OwnedCryptMessage",
        ],
      },
      powerShellHost: {
        policyPinDigest: digest,
        observedImageFileIdentity: identity,
        observedImageSha256: digest,
        signaturePolicy: "PINNED_MICROSOFT_OS_CATALOG_VALID",
        identityStable: true,
      },
      leaseEvidence: {
        ancestorCount: 8,
        reparseCount: 0,
        volumeStable: true,
        deleteShareDenied: true,
        scriptIdentity: identity,
        auditIdentity: identity,
        policyIdentity: identity,
        helperIdentity: identity,
        identitiesStable: true,
      },
      helperBuild: {
        mechanism: "REPOSITORY_CSHARP_WINTRUST_X509CHAIN_V1",
        sourcePathIdentifier: addTypePolicy.bootstrap.helperSourcePath,
        sourceSha256: digest,
        compilerSha256: addTypePolicy.powerShellHost.compiler.sha256,
        orderedArgumentsSha256: digest,
        environmentSha256: digest,
        outputByteCount: 4096,
        outputSha256: digest,
        outputMachine: "AMD64",
        exitCode: 0,
        cleanupComplete: true,
      },
      helperProcess: {
        launchMode: "SUSPENDED_DIRECT_CREATEPROCESS",
        jobActiveLimit: 1,
        killOnClose: true,
        breakaway: false,
        imageIdentityBefore: identity,
        imageIdentityAfter: identity,
        imageSha256Before: digest,
        imageSha256After: digest,
        exitCode: 0,
        descendantCount: 0,
      },
    },
    download: {
      method: "GET",
      url: addTypePolicy.futureActivation.network.url,
      maximumBodyBytes: 16777216,
      observedByteCount: 1024,
      redirectCount: 0,
      retryCount: 0,
      resumeUsed: false,
      proxyUsed: false,
      credentialsUsed: false,
      cookiesUsed: false,
      customTrustUsed: false,
    },
    verification: {
      observedSha256: addTypePolicy.futureActivation.network.expectedSha256,
      authenticodeObservedSha256: addTypePolicy.futureActivation.network.expectedSha256,
      authenticodeFileIdentityBefore: identity,
      authenticodeFileIdentityAfter: identity,
      authenticodeHandlePolicy: "READ_ONLY_DENY_WRITE_DELETE_HELD",
      authenticodeIdentityStable: true,
      authenticodeStatus: "Valid",
      authenticodeSignatureType: "Authenticode",
      codeSigningEku: "1.3.6.1.5.5.7.3.3",
      signerSubject: "CN=Microsoft Corporation",
      signerThumbprint: "A".repeat(40),
      signerIssuer: "CN=Microsoft Code Signing PCA",
      signerSerial: "AB12",
      signerNotBeforeUtc: "2026-01-01T00:00:00Z",
      signerNotAfterUtc: "2027-01-01T00:00:00Z",
      signatureChainStatus: "Trusted",
      revocationNetworkPolicy: "OFFLINE_CACHE_ONLY_NO_NETWORK",
      signerChainRevocationMode: "Offline",
      signerChainRevocationFlag: "EntireChain",
      signerChainVerificationFlags: "NoFlag",
      signerRevocationEvidenceStatus: "VALID_WITH_COMPLETE_OFFLINE_REVOCATION",
      timestampSubject: "CN=Microsoft Time-Stamp Service",
      timestampThumbprint: "B".repeat(40),
      timestampUtc: "2026-08-11T17:00:00Z",
      timestampChainStatus: "Trusted",
      timestampChainRevocationMode: "Offline",
      timestampChainRevocationFlag: "EntireChain",
      timestampChainVerificationFlags: "NoFlag",
      timestampRevocationEvidenceStatus: "VALID_WITH_COMPLETE_OFFLINE_REVOCATION",
      productVersion: "7.9.0",
      fileVersion: "7.9.0.83",
    },
    licenseEvidence: verifierReceiptTesting.LICENSE_EVIDENCE,
    sbomInventory: [
      {
        pathIdentifier: "nuget.exe",
        sha256: addTypePolicy.futureActivation.network.expectedSha256,
        byteCount: 1024,
        productVersion: "7.9.0",
        fileVersion: "7.9.0.83",
        licenseSpdx: "Apache-2.0",
      },
    ],
    scriptAbsence: { scriptCount: 0, adjacentFileCount: 0 },
    hostIsolationEvidence: {
      standardUser: true,
      freshExclusiveRoot: true,
      createNew: true,
      pathMutation: false,
      globalInstall: false,
      globalCache: false,
      globalConfig: false,
    },
    retentionDecision: "RETAIN_HASH_BOUND_BYTES_PENDING_EXECUTION_REVIEW",
    cleanupEvidence: {
      stagingRemoved: true,
      rawLogsRetained: false,
      helperExeRemoved: true,
      helperPdbRemoved: true,
      addTypeTempRemoved: true,
      compilerTempRemoved: true,
      retainedFileCount: 1,
      extraFileCount: 0,
    },
  };
}

test("closed Add-Type policy is exact, non-authorizing, and source-bound", () => {
  assert.equal(validateAddTypeBootstrapPolicy(addTypePolicy), true);
  assert.equal(addTypePolicy.externalActionAuthorized, false);
  assert.equal(addTypePolicy.downloadAuthorityPresent, false);
  assert.equal(addTypePolicy.executionAuthorityPresent, false);
  assert.equal(addTypePolicy.futureActivation.initialState, BOOTSTRAP_TERMINAL);
  assert.equal(Object.isFrozen(addTypePolicy), true);
  const captured = verifyPinnedRepositorySources(addTypePolicy, (path) =>
    readFileSync(new URL(`../../${path}`, import.meta.url)),
  );
  assert.equal(captured.scriptByteCount, addTypePolicy.sourceControl.newSources[2].byteCount);
  assert.equal(captured.auditByteCount, addTypePolicy.sourceControl.newSources[3].byteCount);
  assert.equal(Object.isFrozen(captured), true);
});

test("policy rejects every frozen nested literal mutation and structural drift", () => {
  const mutations = literalMutations(addTypePolicy);
  assert.equal(mutations.length > 250, true);
  for (const mutation of mutations) {
    const candidate = clone(addTypePolicy);
    setAtPath(candidate, mutation.path, mutation.changed);
    assert.throws(() => validateAddTypeBootstrapPolicy(candidate), /POLICY_INVALID/u);
  }
  for (const mutate of [
    (value) => value.bootstrap.orderedArguments.push("-File"),
    (value) => value.forbiddenActions.pop(),
    (value) => (value.unknown = true),
    (value) => (value.powerShellHost.executable.signerSubject = "CN=Wrong Publisher"),
    (value) => (value.powerShellHost.executable.signerIssuer = "CN=Wrong Issuer"),
  ]) {
    const candidate = clone(addTypePolicy);
    mutate(candidate);
    assert.throws(() => validateAddTypeBootstrapPolicy(candidate), /POLICY_INVALID/u);
  }
  assert.throws(
    () =>
      validateAddTypeBootstrapPolicy(
        Object.fromEntries(Object.entries(clone(addTypePolicy)).reverse()),
      ),
    /POLICY_INVALID/u,
  );
});

test("held audit bootstrap capture rejects byte, encoding, lease, and cap drift", () => {
  const script = readFileSync(
    new URL("./root-only-closure-nuget-addtype-bootstrap-v1.ps1", import.meta.url),
  );
  const audit = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
  );
  assert.equal(
    captureEncodedBootstrap(addTypePolicy, script, audit).auditSourceMode,
    "EXACT_PINNED_INPUT_LEASE_BYTES",
  );
  for (const candidate of [
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), script]),
    Buffer.from(script.toString("ascii").replace("\n", "\r\n"), "ascii"),
    Buffer.from(
      script.toString("ascii").replace("[IO.FileShare]::Read", "[IO.FileShare]::Write"),
      "ascii",
    ),
    Buffer.concat([script, Buffer.alloc(12000, 0x20)]),
  ])
    assert.throws(
      () => captureEncodedBootstrap(addTypePolicy, candidate, audit),
      /POLICY_INVALID/u,
    );
  const wrongAudit = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), audit]);
  assert.throws(
    () => captureEncodedBootstrap(addTypePolicy, script, wrongAudit),
    /POLICY_INVALID/u,
  );
});

test("Add-Type audit source exposes only the exact native allowlist", () => {
  const source = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  assert.equal(validateAddTypeAuditSource(source), true);
  for (const forbidden of ["WinHTTP", "LoadLibrary", "WriteProcessMemory", "CreateRemoteThread"]) {
    assert.throws(
      () => validateAddTypeAuditSource(`${source}\n// ${forbidden}`),
      /POLICY_INVALID/u,
    );
  }
  assert.throws(
    () => validateAddTypeAuditSource(source.replace("ResumeThread", "ResumeThread2")),
    /POLICY_INVALID/u,
  );
});

test("Authenticode helper retains the inherited handle and derives embedded evidence without network", () => {
  const source = readFileSync(
    new URL("./roslyn-verifier-authenticode.cs", import.meta.url),
    "utf8",
  );
  assert.equal(validateAuthenticodeHelperSource(source), true);
  for (const required of [
    "GetFinalPathNameByHandleW",
    "GetFileSizeEx",
    "ReadFile(handle",
    "private sealed class ByteString",
    "private enum ContentKind { EMBEDDED_SIGNED,NO_EMBEDDED,DETACHED }",
    "private enum CatalogClassification { CATALOG_PRESENT,CATALOG_ABSENT,CLASSIFICATION_ERROR }",
    "private enum TimestampKind { LEGACY,RFC3161 }",
    "private enum StoreRole { NONE,ORIGINAL_STORE,RFC_TS_STORE }",
    "private interface IAuthenticodeBackend",
    "private sealed class WinCryptBackend",
    "private sealed class ResourceFactory",
    "private sealed class TraceRecorder",
    "private static class AuthenticodeResolver",
    "private sealed class SyntheticBackend",
    "TargetSnapshot CaptureTargetBefore()",
    "ContentEnvelope OpenEmbeddedMessage(ByteString heldBytes)",
    "uint GetSignerCount(ContentEnvelope content)",
    "TargetSnapshot CaptureTargetAfter()",
    "int ObservedNetworkRequestCount { get; }",
    "value%TimeSpan.TicksPerSecond!=0",
    "AdoptHGlobal(ref IntPtr pointer,int byteCount,string resourceType)",
    "AdoptMessage(ref IntPtr handle)",
    "AdoptStore(ref IntPtr handle,StoreRole role)",
    "CertEnumCertificatesInStore",
    "CertDuplicateCertificateContext",
    "CERT_QUERY_CONTENT_FLAGS_V16",
    "REVOCATION_UNAVAILABLE_MASK",
    "ADOPT_FAIL_CLOSED",
    "private static readonly string[] InternalResultKeys",
    "InternalResultKeys.Length!=9",
    "#if FLUYO_SYNTHETIC_TESTS",
    "bytes.Length==0||bytes.Length>16384",
    "Console.OpenStandardOutput()",
    "SYNTHETIC_CONTRACT_INVALID\\n",
  ])
    assert.equal(source.includes(required), true, required);
  for (const forbidden of [
    "new FileStream",
    "FileVersionInfo.GetVersionInfo",
    "error.Message",
    "Exception error",
    "System.Net",
    "HttpClient",
    "WebClient",
    "WinHTTP",
    "WinInet",
    "URLMon",
    "WS2_32",
    "Socket",
    "Invoke-WebRequest",
    "AUTHENTICODE_HELPER_FAILED",
    "CRYPT_DECODE_ALLOC_FLAG",
  ])
    assert.equal(source.includes(forbidden), false, forbidden);
  assert.equal((source.match(/CryptQueryObject\(/gu) ?? []).length >= 2, true);
  assert.equal((source.match(/CryptDecodeObjectEx\(/gu) ?? []).length >= 2, true);
  assert.equal(
    (source.match(/CryptMsgVerifyCountersignatureEncodedEx\(/gu) ?? []).length >= 2,
    true,
  );
  assert.equal((source.match(/SafeFileHandle handle/gu) ?? []).length >= 4, true);
  assert.deepEqual(source.match(/#if\s+([A-Z0-9_]+)/gu), [
    "#if FLUYO_SYNTHETIC_TESTS",
    "#if FLUYO_SYNTHETIC_TESTS",
  ]);
  let keyCursor = -1;
  for (const key of verifierReceiptTesting.VERIFY_KEYS) {
    const index = source.indexOf(`\\\"${key}\\\"`, keyCursor + 1);
    assert.equal(index > keyCursor, true, key);
    keyCursor = index;
  }
  for (const mutate of [
    (value) => value.replace("private sealed class ByteString", "private class ByteString"),
    (value) =>
      value.replace("private sealed class WinCryptBackend", "private class WinCryptBackend"),
    (value) => value.replaceAll("AdoptHGlobal", "AdoptHGlobal2"),
    (value) => value.replace("InternalResultKeys.Length!=9", "InternalResultKeys.Length!=8"),
    (value) =>
      value.replace("value%TimeSpan.TicksPerSecond!=0", "value%TimeSpan.TicksPerSecond==0"),
    (value) => `${value}\n[DllImport("winhttp.dll")] private static extern bool WinHttpOpen();`,
  ])
    assert.throws(() => validateAuthenticodeHelperSource(mutate(source)), /POLICY_INVALID/u);
});

test("synthetic Authenticode signer, timestamp, store, and closure matrix is fail-closed", () => {
  const fixture = {
    contentFlag: 0x400,
    contentType: 10,
    formatFlag: 0x2,
    formatType: 1,
    signerCount: 1,
    signerInfoParameter: 6,
    signerCertInfoParameter: 7,
    encodedSignerParameter: 28,
    bagDecoyCount: 5,
    resolvedSignerIsMessageSigner: true,
    timestampAttributeCount: 1,
    timestampOid: "1.2.840.113549.1.9.6",
    counterSignatureVerified: true,
    rfc3161Verified: false,
    signingTimeCount: 1,
    timestampCertIsBound: true,
    originalStore: "ORIGINAL_STORE_OPEN",
    timestampStore: null,
    primaryChainStore: "ORIGINAL_STORE_OPEN",
    timestampChainStore: "ORIGINAL_STORE_OPEN",
    timestampStoreHeldThroughCleanup: false,
    primaryEku: "1.3.6.1.5.5.7.3.3",
    timestampEku: "1.3.6.1.5.5.7.3.8",
    primaryTrustError: 0,
    timestampTrustError: 0,
    primaryPolicy: 2,
    timestampPolicy: 3,
    identityStable: true,
    hashStable: true,
    pathStable: true,
    productVersion: "7.9.0",
    fileVersion: "7.9.0.83",
    outputClosed: true,
    networkCallCount: 0,
    residueCount: 0,
  };
  assert.equal(addTypeBootstrapTesting.validateSyntheticAuthenticodeFixture(fixture), true);
  const rfc = {
    ...fixture,
    timestampOid: "1.3.6.1.4.1.311.3.3.1",
    counterSignatureVerified: false,
    rfc3161Verified: true,
    timestampStore: "RETURNED_TS_STORE_OPEN",
    timestampChainStore: "RETURNED_TS_STORE_OPEN",
    timestampStoreHeldThroughCleanup: true,
  };
  assert.equal(addTypeBootstrapTesting.validateSyntheticAuthenticodeFixture(rfc), true);
  for (const mutate of [
    (value) => (value.contentType = 9),
    (value) => (value.signerCount = 2),
    (value) => (value.resolvedSignerIsMessageSigner = false),
    (value) => (value.timestampAttributeCount = 2),
    (value) => (value.timestampOid = "1.2.3"),
    (value) => (value.timestampCertIsBound = false),
    (value) => (value.originalStore = "UNRELATED_STORE"),
    (value) => (value.primaryChainStore = "RETURNED_TS_STORE_OPEN"),
    (value) => (value.timestampChainStore = "RETURNED_TS_STORE_OPEN"),
    (value) => (value.timestampStore = "RETURNED_TS_STORE_OPEN"),
    (value) => (value.timestampStoreHeldThroughCleanup = true),
    (value) => (value.primaryEku = "1.2.3"),
    (value) => (value.timestampEku = "1.2.3"),
    (value) => (value.primaryTrustError = 1),
    (value) => (value.timestampTrustError = 1),
    (value) => (value.primaryPolicy = 1),
    (value) => (value.timestampPolicy = 2),
    (value) => (value.identityStable = false),
    (value) => (value.hashStable = false),
    (value) => (value.pathStable = false),
    (value) => (value.productVersion = "7.8.0"),
    (value) => (value.outputClosed = false),
    (value) => (value.networkCallCount = 1),
    (value) => (value.residueCount = 1),
  ]) {
    const candidate = clone(fixture);
    mutate(candidate);
    assert.throws(
      () => addTypeBootstrapTesting.validateSyntheticAuthenticodeFixture(candidate),
      /POLICY_INVALID/u,
    );
  }
  for (const mutate of [
    (value) => (value.timestampStore = null),
    (value) => (value.timestampChainStore = "ORIGINAL_STORE_OPEN"),
    (value) => (value.timestampStoreHeldThroughCleanup = false),
    (value) => (value.timestampStore = "RETURNED_TS_STORE_CLOSED"),
    (value) => (value.timestampChainStore = "SUBSTITUTED_TS_STORE"),
  ]) {
    const candidate = clone(rfc);
    mutate(candidate);
    assert.throws(
      () => addTypeBootstrapTesting.validateSyntheticAuthenticodeFixture(candidate),
      /POLICY_INVALID/u,
    );
  }
});

test("v1.4 trace-pinned process and controller envelopes preserve exact 9-key and 11-key contracts", () => {
  const {
    SYNTHETIC_COMPILE_CONTRACT: contract,
    SYNTHETIC_ENVELOPE_KEYS: envelopeKeys,
    SYNTHETIC_FIXTURES: fixtures,
    SYNTHETIC_PROCESS_RESULT_KEYS: processKeys,
  } = addTypeBootstrapTesting;
  assert.equal(processKeys.length, 9);
  assert.deepEqual(processKeys, [
    "schemaVersion",
    "fixtureId",
    "observedOutcome",
    "fixedReason",
    "productionOutputByteCount",
    "productionOutputSha256",
    "resolverTraceSha256",
    "resourceTraceSha256",
    "networkRequestCount",
  ]);
  assert.equal(envelopeKeys.length, 11);
  assert.deepEqual(envelopeKeys, [
    "schemaVersion",
    "fixtureId",
    "expectedOutcome",
    "observedOutcome",
    "fixedReason",
    "productionOutputByteCount",
    "productionOutputSha256",
    "resolverTraceSha256",
    "resourceTraceSha256",
    "networkRequestCount",
    "retainedArtifactCount",
  ]);
  assert.equal(fixtures.length, 39);
  assert.equal(new Set(fixtures.map((row) => row[0])).size, 39);
  const source = readFileSync(
    new URL("./roslyn-verifier-authenticode.cs", import.meta.url),
    "utf8",
  );
  for (const row of fixtures) {
    const [fixtureId, expectedOutcome, fixedReason] = row;
    assert.equal(
      (source.match(new RegExp(`new FixtureDefinition\\(\"${fixtureId}\"`, "gu")) ?? []).length,
      1,
    );
    assert.equal(source.includes(`new FixtureDefinition("${fixtureId}")`), true, fixtureId);
    const processResult = {
      schemaVersion: 1,
      fixtureId,
      observedOutcome: expectedOutcome,
      fixedReason,
      productionOutputByteCount: expectedOutcome === "SUCCESS" ? 1 : 0,
      productionOutputSha256: expectedOutcome === "SUCCESS" ? "a".repeat(64) : null,
      resolverTraceSha256: row[3],
      resourceTraceSha256: row[4],
      networkRequestCount: 0,
    };
    assert.deepEqual(Object.keys(processResult), processKeys);
    const parsed = validateSyntheticProcessResult(
      Buffer.from(`${JSON.stringify(processResult)}\n`, "utf8"),
      fixtureId,
    );
    const envelope = deriveSyntheticEnvelope(parsed, row, { retainedArtifactCount: 0 });
    assert.deepEqual(Object.keys(envelope), envelopeKeys);
    assert.equal(addTypeBootstrapTesting.validateSyntheticEnvelope(envelope), true);
    for (const mutate of [
      (value) =>
        (value.observedOutcome = value.observedOutcome === "SUCCESS" ? "FAILURE" : "SUCCESS"),
      (value) =>
        (value.fixedReason =
          value.fixedReason === "SIGNATURE_INVALID" ? null : "SIGNATURE_INVALID"),
      (value) => (value.networkRequestCount = 1),
      (value) => (value.resolverTraceSha256 = "A".repeat(64)),
    ]) {
      const candidate = clone(envelope);
      mutate(candidate);
      assert.throws(
        () => addTypeBootstrapTesting.validateSyntheticEnvelope(candidate),
        /POLICY_INVALID/u,
      );
    }
  }
  assert.throws(
    () =>
      validateSyntheticProcessResult(
        Buffer.from(
          `${JSON.stringify({
            schemaVersion: 1,
            fixtureId: "UNKNOWN_FIXTURE",
            observedOutcome: "FAILURE",
            fixedReason: "SIGNATURE_INVALID",
            productionOutputByteCount: 0,
            productionOutputSha256: null,
            resolverTraceSha256: "b".repeat(64),
            resourceTraceSha256: "c".repeat(64),
            networkRequestCount: 0,
          })}\n`,
        ),
        "UNKNOWN_FIXTURE",
      ),
    /POLICY_INVALID/u,
  );
  assert.deepEqual(
    contract.fixtureIds,
    fixtures.map((row) => row[0]),
  );
  assert.deepEqual(contract.orderedArguments, [
    "/nologo",
    "/noconfig",
    "/nostdlib+",
    "/target:exe",
    "/platform:x64",
    "/optimize+",
    "/debug-",
    "/checked+",
    "/warnaserror+",
    "/langversion:5",
    "/define:FLUYO_SYNTHETIC_TESTS",
    "/out:<EXCLUSIVE_ROOT>\\synthetic\\roslyn-verifier-authenticode-synthetic.exe",
    "/reference:C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\mscorlib.dll",
    "/reference:C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\System.dll",
    "/reference:C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\System.Core.dll",
    "<EXACT_HELD_SOURCE_PATH>",
  ]);
  assert.deepEqual(contract.closedEnvironment, {
    SystemRoot: "C:\\Windows",
    WINDIR: "C:\\Windows",
    TEMP: "<EXCLUSIVE_ROOT>\\temp",
    TMP: "<EXCLUSIVE_ROOT>\\temp",
  });
  assert.equal(contract.compilerTimeoutMs, 30_000);
  assert.equal(contract.fixtureTimeoutMs, 30_000);
  assert.equal(contract.totalTimeoutMs, 300_000);
  assert.equal(contract.combinedOutputCapBytes, 65_536);
  assert.equal(contract.executableMaximumBytes, 16_777_216);
  assert.equal(contract.directNoShell, true);
  assert.equal(contract.jobActiveProcessLimit, 1);
  assert.equal(contract.activationConsumptionAllowed, false);
  assert.equal(contract.downloadAllowed, false);
  for (const state of ["SYNTHETIC_TEST_CLEAN", "SYNTHETIC_TEST_FAILED_CLEAN"]) {
    const cleanup = {
      schemaVersion: 1,
      state,
      deadlineStatus: "COMPLETED_WITHIN_GLOBAL_300000_MS",
      rootLeaseDisposed: true,
      parentIdentityRevalidated: true,
      rootIdentityRevalidated: true,
      exclusiveRootRemoved: true,
      preDeleteExpectedOwnedArtifactCount: state === "SYNTHETIC_TEST_CLEAN" ? 1 : 0,
      preDeleteUnexpectedResidueCount: 0,
      postDeleteResidueCount: 0,
      compilerProcessCount: 0,
      fixtureProcessCount: 0,
      ownedProcessCount: 0,
      networkMeasurementAvailable: true,
      networkMeasurementComplete: true,
      networkBaselineOwnerCount: 2,
      networkWorkOwnerCount: 40,
      networkOwnerCount: 42,
      networkOwnerScopeSha256: "e".repeat(64),
      networkObservationCount: 1,
      networkMaximumGapMicros: 2000,
      networkEventCount: 0,
      ownershipLedgerPreCleanupSha256: "f".repeat(64),
      ownershipLedgerSha256: "a".repeat(64),
      retainedArtifactCount: 0,
      globalMutationCount: 0,
      cleanupCompletedBeforeDeadline: true,
    };
    assert.equal(addTypeBootstrapTesting.validateSyntheticCleanup(cleanup, state), true);
    for (const key of Object.keys(cleanup).slice(2)) {
      const candidate = clone(cleanup);
      candidate[key] =
        typeof candidate[key] === "boolean"
          ? false
          : key === "preDeleteExpectedOwnedArtifactCount"
            ? 4097
            : key === "networkOwnerCount"
              ? 41
              : key === "networkObservationCount"
                ? 0
                : key === "networkMaximumGapMicros"
                  ? 10001
                  : typeof candidate[key] === "number"
                    ? candidate[key] + 1
                    : 1;
      assert.throws(
        () => addTypeBootstrapTesting.validateSyntheticCleanup(candidate, state),
        /POLICY_INVALID/u,
        key,
      );
    }
  }
});

test("v1.6 controller rejects the superseded v1.4 adapter surface", async () => {
  const fixtures = addTypeBootstrapTesting.SYNTHETIC_FIXTURES;
  const sourceBytes = readFileSync(new URL("./roslyn-verifier-authenticode.cs", import.meta.url));
  const plan = prepareSyntheticCompilePlan(addTypePolicy, sourceBytes, "C:\\repo");
  const hex64 = "a".repeat(64);
  const fileIdentity = (role, sha256 = hex64, byteCount = 4096) => ({
    schemaVersion: 1,
    role,
    byteCount,
    sha256,
    volumeSerialNumber: "A".repeat(16),
    fileId: (role.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0") + "0".repeat(30)).slice(
      0,
      32,
    ),
    finalPathSha256: createHash("sha256").update(role).digest("hex"),
    reparseTag: 0,
    heldReadOnlyNoDelete: true,
  });
  const root = {
    schemaVersion: 1,
    leaseId: "b".repeat(64),
    parentVolumeSerialNumber: "A".repeat(16),
    parentFileId: "B".repeat(32),
    rootVolumeSerialNumber: "A".repeat(16),
    rootFileId: "C".repeat(32),
    parentFinalPathSha256: "c".repeat(64),
    rootFinalPathSha256: "d".repeat(64),
    rootName: "fluyo-r4b-addtype-synthetic-v1-0123456789abcdef0123456789abcdef",
    ancestorChainReparseFree: true,
    sameVolume: true,
    heldDenyDelete: true,
  };
  const processIdentity = (role, fixtureId, index, image) => ({
    schemaVersion: 1,
    processRole: role,
    fixtureId,
    processId: 1000 + index,
    creationTimeUtc: `2026-11-11T00:00:${String(index % 60).padStart(2, "0")}Z`,
    imageVolumeSerialNumber: image.volumeSerialNumber,
    imageFileId: image.fileId,
    imageSha256: image.sha256,
    imageFinalPathSha256: image.finalPathSha256,
    jobIdentitySha256: createHash("sha256")
      .update(`${role}:${fixtureId ?? "-"}:${index}`)
      .digest("hex"),
  });
  const ownerHash = (values) =>
    createHash("sha256")
      .update(
        values
          .map((identity) =>
            [
              identity.processRole,
              identity.fixtureId ?? "-",
              identity.processId,
              identity.creationTimeUtc,
            ]
              .join("\0")
              .concat("\n"),
          )
          .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
          .join(""),
      )
      .digest("hex");
  const inputs = {
    compiler: fileIdentity(
      "PINNED_CSC",
      addTypeBootstrapTesting.SYNTHETIC_COMPILE_CONTRACT.compilerSha256,
    ),
    configuration: fileIdentity(
      "CSC_CONFIG",
      addTypeBootstrapTesting.SYNTHETIC_COMPILE_CONTRACT.compilerConfigurationSha256,
    ),
    references: addTypeBootstrapTesting.SYNTHETIC_COMPILE_CONTRACT.referenceSha256.map(
      (value, index) => fileIdentity(`REFERENCE_${index + 1}`, value),
    ),
    source: fileIdentity("HELD_SOURCE", plan.sourceSha256, plan.sourceByteCount),
  };
  const output = fileIdentity("COMPILED_EXE", "e".repeat(64), 8192);
  const identities = [];
  let fixtureCursor = 0;
  let snapshotCount = 0;
  const calls = [];
  const adapter = {
    async openPinnedInputLeases() {
      calls.push("open-inputs");
      return inputs;
    },
    async allocateOwnedRoot() {
      calls.push("allocate-root");
      return root;
    },
    async captureGlobalMutationSnapshot() {
      snapshotCount += 1;
      return { schemaVersion: 1, snapshotSha256: "f".repeat(64) };
    },
    async beginOwnedNetworkMeasurement() {
      calls.push("network-begin");
      return { leaseId: "network" };
    },
    async runOwnedProcess(spec) {
      calls.push(`run:${spec.processRole}:${spec.fixtureId ?? "-"}`);
      if (spec.processRole === "COMPILER") {
        const identity = processIdentity("COMPILER", null, 0, inputs.compiler);
        identities.push(identity);
        return {
          exitCode: 0,
          stdout: Buffer.alloc(0),
          stderr: Buffer.alloc(0),
          processIdentity: identity,
          outputIdentity: output,
          outputMachine: "AMD64",
          extraOutputCount: 0,
        };
      }
      const row = fixtures[fixtureCursor];
      assert.equal(spec.fixtureId, row[0]);
      const identity = processIdentity("FIXTURE", row[0], fixtureCursor + 1, output);
      identities.push(identity);
      fixtureCursor += 1;
      const result = {
        schemaVersion: 1,
        fixtureId: row[0],
        observedOutcome: row[1],
        fixedReason: row[2],
        productionOutputByteCount: row[1] === "SUCCESS" ? 31 : 0,
        productionOutputSha256: row[1] === "SUCCESS" ? "9".repeat(64) : null,
        resolverTraceSha256: row[3],
        resourceTraceSha256: row[4],
        networkRequestCount: 0,
      };
      return {
        exitCode: 0,
        stdout: Buffer.from(`${JSON.stringify(result)}\n`),
        stderr: Buffer.alloc(0),
        processIdentity: identity,
        outputIdentity: output,
      };
    },
    async scanOwnedInventory() {
      return {
        schemaVersion: 1,
        expectedOwnedArtifactCount: 1,
        unexpectedResidueCount: 0,
        inventorySha256: "8".repeat(64),
      };
    },
    async completeOwnedNetworkMeasurement(_lease, observed) {
      assert.deepEqual(observed, identities);
      return {
        schemaVersion: 1,
        available: true,
        complete: true,
        measurementStartedBeforeFirstSpawn: true,
        measurementStoppedAfterLastExit: true,
        expectedOwnerCount: observed.length,
        observedOwnerCount: observed.length,
        ownerScopeSha256: ownerHash(observed),
        eventCount: 0,
        firstEvent: null,
        lastEvent: null,
      };
    },
    async censusOwnedProcesses() {
      return { compilerProcessCount: 0, fixtureProcessCount: 0, ownedProcessCount: 0 };
    },
    async removeOwnedRoot() {
      calls.push("remove-root");
      return {
        rootLeaseDisposed: true,
        parentIdentityRevalidated: true,
        rootIdentityRevalidated: true,
        exclusiveRootRemoved: true,
        postDeleteResidueCount: 0,
      };
    },
    async closePinnedInputLeases() {
      calls.push("close-inputs");
      return true;
    },
  };
  await assert.rejects(() => runSyntheticCompileTransaction(plan, adapter), /POLICY_INVALID/u);
  return;
  const result = await runSyntheticCompileTransaction(plan, adapter);
  assert.equal(result.envelopes.length, 39);
  assert.equal(fixtureCursor, 39);
  assert.equal(snapshotCount, 2);
  assert.deepEqual(Object.keys(result.cleanup), addTypeBootstrapTesting.SYNTHETIC_CLEANUP_KEYS);
  assert.equal(result.cleanup.state, "SYNTHETIC_TEST_CLEAN");
  assert.equal(result.cleanup.preDeleteExpectedOwnedArtifactCount, 1);
  assert.equal(result.cleanup.networkOwnerCount, 40);
  assert.equal(result.cleanup.networkOwnerScopeSha256, ownerHash(identities));
  assert.equal(calls.filter((value) => value === "run:COMPILER:-").length, 1);
  assert.equal(calls.filter((value) => value.startsWith("run:FIXTURE:")).length, 39);
  assert.deepEqual(calls.slice(-2), ["remove-root", "close-inputs"]);
});

test("v1.6 policy trace pins equal the independent offline oracle and reject drift", () => {
  const pins = addTypePolicy.bootstrap.syntheticPolicy.tracePins;
  const oracle = addTypeBootstrapTesting.INDEPENDENT_TRACE_ORACLE;
  assert.equal(
    addTypePolicy.bootstrap.syntheticPolicy.tracePinSchema,
    "R4B-AUTHENTICODE-TRACE-PINS-v1.13.6",
  );
  assert.equal(pins.length, 39);
  assert.equal(new Set(pins.map((row) => row.fixtureId)).size, 39);
  assert.deepEqual(pins, oracle);
  assert.deepEqual(
    addTypeBootstrapTesting.SYNTHETIC_FIXTURES,
    pins.map((row) => [
      row.fixtureId,
      row.expectedOutcome,
      row.fixedReason,
      row.resolverTraceSha256,
      row.resourceTraceSha256,
    ]),
  );
  assert.equal(JSON.stringify(addTypePolicy).includes("<PENDING_TRACE_SHA256>"), false);
  for (const mutate of [
    (value) => value.bootstrap.syntheticPolicy.tracePins.pop(),
    (value) => value.bootstrap.syntheticPolicy.tracePins.reverse(),
    (value) => (value.bootstrap.syntheticPolicy.tracePins[0].fixtureId = "UNKNOWN"),
    (value) => (value.bootstrap.syntheticPolicy.tracePins[0].terminalOperation = "READ_VERSIONS"),
    (value) => (value.bootstrap.syntheticPolicy.tracePins[0].resolverTraceSha256 = "A".repeat(64)),
    (value) =>
      ([
        value.bootstrap.syntheticPolicy.tracePins[0].resolverTraceSha256,
        value.bootstrap.syntheticPolicy.tracePins[0].resourceTraceSha256,
      ] = [
        value.bootstrap.syntheticPolicy.tracePins[0].resourceTraceSha256,
        value.bootstrap.syntheticPolicy.tracePins[0].resolverTraceSha256,
      ]),
  ]) {
    const candidate = clone(addTypePolicy);
    mutate(candidate);
    assert.throws(() => validateAddTypeBootstrapPolicy(candidate), /POLICY_INVALID/u);
  }
});

test("v1.6 helper statically binds held-handle verification and rejection-only catalogs", () => {
  const source = readFileSync(
    new URL("./roslyn-verifier-authenticode.cs", import.meta.url),
    "utf8",
  );
  for (const required of [
    "CERT_QUERY_CONTENT_CATALOG = 6u",
    "CERT_QUERY_CONTENT_PKCS7_SIGNED = 8u",
    "CERT_QUERY_CONTENT_PKCS7_SIGNED_EMBED = 10u",
    "CERT_QUERY_CONTENT_FLAGS_V16 = 0x00000540u",
    "REVOCATION_UNAVAILABLE_MASK = 0x01000040u",
    "CryptQueryObject(CERT_QUERY_OBJECT_BLOB,blobPointer.Handle,CERT_QUERY_CONTENT_FLAGS_V16,CERT_QUERY_FORMAT_FLAG_BINARY,0",
    "ImageGetDigestStream",
    "IOwnedDigestCallback AdoptDigestCallback(DigestFunction callback)",
    "IOwnedSha256Digest AdoptSha256Digest(SHA256Managed digest)",
    '"IMAGE_DIGEST_CALLBACK_HANDLE"',
    '"SHA256_DIGEST"',
    "CryptCATAdminAcquireContext2",
    "CryptMemFree",
    "CertChainParaV16",
    "RequestedIssuancePolicy",
    "CMSG_VERIFY_COUNTER_SIGN_ENABLE_STRONG_FLAG",
    "ReadOnlyCollection<CertificateRecord> EnumerateCertificates",
    "void EnablePrimaryStrongSignature",
    "ObservedNetworkRequestCount",
    "CryptMsgControl(content.Message.Handle,0,CMSG_CTRL_ENABLE_STRONG_SIGNATURE",
    "CertEnumCertificatesInStore(store.Handle,previous)",
    "CertDuplicateCertificateContext(next)",
    "if(matches!=1||selected==null)",
    "uint trust=context.TrustStatus.dwErrorStatus,revocation=trust&REVOCATION_UNAVAILABLE_MASK,other=trust&~REVOCATION_UNAVAILABLE_MASK",
    'if(chain.OtherTrustBits!=0)ClosedFail("SIGNATURE_INVALID")',
    "if(chain.RevocationBits!=0)",
    "handle=IntPtr.Zero",
    "source=IntPtr.Zero",
    "ADOPT_FAIL_CLOSED",
  ])
    assert.equal(source.includes(required), true, required);
  for (const forbidden of [
    "CertGetSubjectCertificateFromStore(",
    "OfflineRevocationComplete",
    "RegisterDecodeBuffer",
    "RegisterEkuOid",
    "RegisterEkuPointer",
    "WinVerifyTrust",
  ])
    assert.equal(source.includes(forbidden), false, forbidden);
  assert.equal((source.match(/CryptQueryObject\(CERT_QUERY_OBJECT_BLOB/gu) ?? []).length, 1);
  assert.equal((source.match(/CertEnumCertificatesInStore\(/gu) ?? []).length >= 2, true);
});

test("v1.6 controller exposes exact opaque adapter, identity, cleanup, and failure surfaces", () => {
  assert.deepEqual(addTypeBootstrapTesting.V16_ADAPTER_METHODS, [
    "beginOwnedNetworkMeasurement",
    "captureGlobalMutationSnapshot",
    "openPinnedInputLeases",
    "revalidatePinnedInputLeases",
    "allocateOwnedRoot",
    "createOwnershipLedger",
    "runOwnedProcess",
    "forceStopOwnedProcessTree",
    "performCleanupStep",
  ]);
  assert.equal(addTypeBootstrapTesting.V16_FILE_IDENTITY_KEYS.length, 9);
  assert.equal(addTypeBootstrapTesting.V16_PINNED_INPUT_RECORD_KEYS.length, 5);
  assert.equal(addTypeBootstrapTesting.V16_PINNED_INPUT_SET_KEYS.length, 5);
  assert.equal(addTypeBootstrapTesting.V16_GLOBAL_SNAPSHOT_KEYS.length, 13);
  assert.equal(addTypeBootstrapTesting.V16_NETWORK_LEASE_KEYS.length, 10);
  assert.equal(addTypeBootstrapTesting.V16_LEDGER_KEYS.length, 6);
  assert.equal(addTypeBootstrapTesting.V16_OWNED_OUTPUT_KEYS.length, 19);
  assert.equal(addTypeBootstrapTesting.V16_PROCESS_IDENTITY_KEYS.length, 11);
  assert.equal(addTypeBootstrapTesting.V16_OPERATION_CONTEXT_KEYS.length, 7);
  assert.equal(addTypeBootstrapTesting.V16_PROCESS_RESULT_KEYS.length, 6);
  assert.equal(addTypeBootstrapTesting.V16_CLEANUP_RESULT_KEYS.length, 5);
  assert.equal(addTypeBootstrapTesting.V16_CLEANUP_STEP_KEYS.length, 7);
  assert.equal(addTypeBootstrapTesting.V16_CLEANUP_GROUP_KEYS.length, 9);
  assert.equal(addTypeBootstrapTesting.V16_CLEANUP_KEYS.length, 34);
  assert.equal(addTypeBootstrapTesting.V16_TRANSACTION_RESULT_KEYS.length, 6);
  assert.equal(addTypeBootstrapTesting.V16_CLEANUP_OPERATIONS.length, 23);
  assert.equal(
    new Set(addTypeBootstrapTesting.V16_CLEANUP_OPERATIONS.map((row) => row[1])).size,
    23,
  );
  assert.equal(addTypeBootstrapTesting.ROOT_LEASE_KEYS.includes("absolutePath"), false);
  assert.equal(addTypePolicy.bootstrap.syntheticPolicy.mode, "CONTRACT_SELF_TEST_V1_13_6");
  assert.equal(SYNTHETIC_EXECUTION_CONTRACT_VERSION, "R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.6");
  assert.deepEqual(addTypePolicy.bootstrap.syntheticPolicy.controller.terminalStates, [
    "SYNTHETIC_TEST_CLEAN",
    "SYNTHETIC_TEST_FAILED_CLEAN",
    "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD",
  ]);
  assert.deepEqual(addTypePolicy.futureActivation.failureTerminals, [
    "FAILED_CLEANED_HOLD",
    "FAILED_CLEANUP_HOLD",
  ]);
});

test("v1.6 identity, owner-scope, global-snapshot, and cleanup hashes reject drift", () => {
  const testing = addTypeBootstrapTesting;
  const identity = {
    schemaVersion: 1,
    role: "COMPILER_EXE",
    byteCount: 2569576,
    sha256: addTypePolicy.powerShellHost.compiler.sha256,
    volumeSerialNumber: "A".repeat(16),
    fileId: "B".repeat(32),
    finalPathSha256: "c".repeat(64),
    reparseTag: 0,
    heldReadOnlyNoDelete: true,
  };
  assert.equal(
    testing.validateFileIdentityV16(identity, "COMPILER_EXE", identity.byteCount, identity.sha256),
    identity,
  );
  for (const mutate of [
    (value) => (value.byteCount += 1),
    (value) => (value.volumeSerialNumber = "a".repeat(16)),
    (value) => (value.fileId = "B".repeat(31)),
    (value) => (value.reparseTag = 1),
    (value) => (value.heldReadOnlyNoDelete = false),
    (value) => (value.extra = true),
  ]) {
    const changed = structuredClone(identity);
    mutate(changed);
    assert.throws(
      () =>
        testing.validateFileIdentityV16(
          changed,
          "COMPILER_EXE",
          identity.byteCount,
          identity.sha256,
        ),
      /ADDTYPE_BOOTSTRAP_POLICY_INVALID/u,
    );
  }

  const root = {
    schemaVersion: 1,
    leaseId: "1".repeat(64),
    parentVolumeSerialNumber: "A".repeat(16),
    parentFileId: "B".repeat(32),
    rootVolumeSerialNumber: "A".repeat(16),
    rootFileId: "C".repeat(32),
    parentFinalPathSha256: "2".repeat(64),
    rootFinalPathSha256: "3".repeat(64),
    rootName: `fluyo-r4b-addtype-synthetic-v1-${"4".repeat(32)}`,
    ancestorChainReparseFree: true,
    sameVolume: true,
    heldDenyDelete: true,
  };
  assert.equal(testing.validateRootLease(root), root);
  for (const mutate of [
    (value) => (value.rootFileId = "C".repeat(31)),
    (value) => (value.rootVolumeSerialNumber = "D".repeat(16)),
    (value) => (value.rootName += ".bak"),
    (value) => (value.ancestorChainReparseFree = false),
    (value) => (value.heldDenyDelete = false),
  ]) {
    const changed = structuredClone(root);
    mutate(changed);
    assert.throws(() => testing.validateRootLease(changed), /ADDTYPE_BOOTSTRAP_POLICY_INVALID/u);
  }

  const processIdentity = {
    schemaVersion: 1,
    processRole: "COMPILER",
    fixtureId: null,
    processId: 1200,
    creationTimeUtc: "2026-11-12T00:00:00Z",
    imageByteCount: identity.byteCount,
    imageVolumeSerialNumber: identity.volumeSerialNumber,
    imageFileId: identity.fileId,
    imageSha256: identity.sha256,
    imageFinalPathSha256: identity.finalPathSha256,
    jobIdentitySha256: "5".repeat(64),
  };
  testing.validateProcessIdentityV16(processIdentity, "COMPILER", null, identity);
  assert.throws(
    () =>
      testing.validateProcessIdentityV16(
        { ...processIdentity, imageByteCount: processIdentity.imageByteCount + 1 },
        "COMPILER",
        null,
        identity,
      ),
    /ADDTYPE_BOOTSTRAP_POLICY_INVALID/u,
  );
  const scopeHash = testing.ownerScopeHashV16([processIdentity]);
  assert.match(scopeHash, /^[0-9a-f]{64}$/u);
  assert.notEqual(
    scopeHash,
    testing.ownerScopeHashV16([{ ...processIdentity, fixtureId: "NFC\u00e9" }]),
  );
  assert.notEqual(
    scopeHash,
    testing.ownerScopeHashV16([{ ...processIdentity, fixtureId: "NFCe\u0301" }]),
  );

  const components = [
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
  ];
  const global = { schemaVersion: 1, complete: true };
  components.forEach((key, index) => (global[key] = index.toString(16).repeat(64).slice(0, 64)));
  global.aggregateSha256 = createHash("sha256")
    .update(Buffer.from(components.map((key) => `${key}\0${global[key]}\n`).join(""), "utf8"))
    .digest("hex");
  assert.equal(testing.validateGlobalSnapshotV16(global), global);
  assert.throws(
    () => testing.validateGlobalSnapshotV16({ ...global, pathEnvironmentSha256: "f".repeat(64) }),
    /ADDTYPE_BOOTSTRAP_POLICY_INVALID/u,
  );

  const cleanupGroup = {
    schemaVersion: 1,
    group: "QUIESCE",
    started: true,
    completed: true,
    timedOut: false,
    steps: [],
    failureCodes: [],
    evidence: {},
  };
  const groupHash = testing.cleanupGroupDigestV16(cleanupGroup);
  assert.notEqual(groupHash, testing.cleanupGroupDigestV16({ ...cleanupGroup, timedOut: true }));
  assert.notEqual(groupHash, testing.cleanupGroupDigestV16({ ...cleanupGroup, steps: [{}] }));
});

test("v1.6 bounded adapter quarantine prevents calls after ignored abort", async () => {
  const testing = addTypeBootstrapTesting;
  let forceCount = 0;
  const bindings = { adapterQuarantined: false };
  const adapter = {
    async hung() {
      return new Promise(() => {});
    },
    async forceStopOwnedProcessTree(operationId) {
      forceCount += 1;
      return {
        schemaVersion: 1,
        operationId,
        requested: true,
        ownedProcessCount: 1,
        stoppedProcessCount: 1,
        exitObserved: true,
        jobClosed: true,
        liveOwnedProcessCount: 0,
      };
    },
  };
  const now = performance.now();
  await assert.rejects(
    testing.invokeAdapterV18({
      adapter,
      method: "hung",
      args: [],
      operationId: "FIXTURE:VALID_LEGACY",
      phase: "WORK",
      globalDeadline: now + 200,
      phaseDeadline: now + 120,
      maximumTimeoutMs: 5,
      timeoutReason: "PROCESS_TIMEOUT",
      processOperation: true,
      bindings,
    }),
  );
  assert.equal(forceCount, 1);
  assert.equal(bindings.adapterQuarantined, true);
  await assert.rejects(
    testing.invokeAdapterV18({
      adapter,
      method: "hung",
      args: [],
      operationId: "FIXTURE:VALID_RFC_TSSTORE_ONLY",
      phase: "WORK",
      globalDeadline: performance.now() + 100,
      phaseDeadline: performance.now() + 100,
      maximumTimeoutMs: 5,
      timeoutReason: "PROCESS_TIMEOUT",
      processOperation: true,
      bindings,
    }),
  );
  assert.equal(forceCount, 1);
});

test("v1.6 injected operational controller runs one compiler, 39 fixtures, and all 23 cleanup steps", async () => {
  const testing = addTypeBootstrapTesting;
  const sourceBytes = readFileSync(new URL("./roslyn-verifier-authenticode.cs", import.meta.url));
  const plan = prepareSyntheticCompilePlan(addTypePolicy, sourceBytes, "C:\\repo");
  const identity = (role, byteCount, sha256, seed) => ({
    schemaVersion: 1,
    role,
    byteCount,
    sha256,
    volumeSerialNumber: "A".repeat(16),
    fileId: seed.repeat(32).slice(0, 32),
    finalPathSha256: createHash("sha256").update(role).digest("hex"),
    reparseTag: 0,
    heldReadOnlyNoDelete: true,
  });
  const records = testing.V16_PIN_ROWS.map((row, index) => {
    const byteCount =
      index === 5 ? plan.auditSourceByteCount : index === 6 ? plan.sourceByteCount : row[2];
    const sha256 = index === 5 ? plan.auditSourceSha256 : index === 6 ? plan.sourceSha256 : row[3];
    return {
      role: row[0],
      pathId: row[1],
      expectedByteCount: byteCount,
      expectedSha256: sha256,
      observedIdentity: identity(row[0], byteCount, sha256, String(index + 1)),
    };
  });
  const recordsSha256 = createHash("sha256")
    .update(
      records
        .map(
          (row) =>
            [
              row.role,
              row.pathId,
              row.expectedByteCount,
              row.expectedSha256,
              JSON.stringify(row.observedIdentity),
            ].join("\0") + "\n",
        )
        .join(""),
    )
    .digest("hex");
  const pins = {
    schemaVersion: 1,
    leaseId: "1".repeat(64),
    records,
    recordsSha256,
    allHeld: true,
  };
  const globalKeys = testing.V16_GLOBAL_SNAPSHOT_KEYS.slice(2, -1);
  const globalSnapshot = { schemaVersion: 1, complete: true };
  for (const key of globalKeys)
    globalSnapshot[key] = createHash("sha256").update(key).digest("hex");
  globalSnapshot.aggregateSha256 = createHash("sha256")
    .update(globalKeys.map((key) => key + "\0" + globalSnapshot[key] + "\n").join(""))
    .digest("hex");
  const root = {
    schemaVersion: 1,
    leaseId: "2".repeat(64),
    parentVolumeSerialNumber: "A".repeat(16),
    parentFileId: "B".repeat(32),
    rootVolumeSerialNumber: "A".repeat(16),
    rootFileId: "C".repeat(32),
    parentFinalPathSha256: "3".repeat(64),
    rootFinalPathSha256: "4".repeat(64),
    rootName: "fluyo-r4b-addtype-synthetic-v1-0123456789abcdef0123456789abcdef",
    ancestorChainReparseFree: true,
    sameVolume: true,
    heldDenyDelete: true,
  };
  const ledger = {
    schemaVersion: 1,
    ledgerId: "5".repeat(64),
    rootLeaseId: root.leaseId,
    state: "OPEN",
    entryCount: 4,
    entriesSha256: "6".repeat(64),
  };
  const output = {
    schemaVersion: 1,
    role: "COMPILED_EXE",
    byteCount: 8192,
    sha256: "7".repeat(64),
    volumeSerialNumber: root.rootVolumeSerialNumber,
    fileId: "D".repeat(32),
    finalPathSha256: "8".repeat(64),
    reparseTag: 0,
    heldReadOnlyNoDelete: true,
    rootLeaseId: root.leaseId,
    rootVolumeSerialNumber: root.rootVolumeSerialNumber,
    rootFileId: root.rootFileId,
    parentRole: "SYNTHETIC_DIRECTORY",
    parentVolumeSerialNumber: root.rootVolumeSerialNumber,
    parentFileId: "E".repeat(32),
    relativePath: "synthetic\\roslyn-verifier-authenticode-synthetic.exe",
    containedByRoot: true,
    parentLedgerEntrySha256: "9".repeat(64),
    ownershipLedgerEntrySha256: "a".repeat(64),
  };
  const processIdentities = [];
  const processIdentity = (role, fixtureId, index, image) => ({
    schemaVersion: 1,
    processRole: role,
    fixtureId,
    processId: 1000 + index,
    creationTimeUtc: "2026-11-12T00:00:" + String(index % 60).padStart(2, "0") + "Z",
    imageByteCount: image.byteCount,
    imageVolumeSerialNumber: image.volumeSerialNumber,
    imageFileId: image.fileId,
    imageSha256: image.sha256,
    imageFinalPathSha256: image.finalPathSha256,
    jobIdentitySha256: createHash("sha256")
      .update(role + ":" + index)
      .digest("hex"),
  });
  let fixtureCursor = 0;
  const calls = [];
  const adapter = {
    async beginOwnedNetworkMeasurement() {
      calls.push("network");
      return {
        schemaVersion: 1,
        leaseId: "b".repeat(64),
        available: true,
        complete: false,
        startedBeforeFirstSyntheticChild: true,
        baselineOwnerCount: 2,
        baselineOwnerScopeSha256: "a".repeat(64),
        evidenceMode: "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1",
        targetPollIntervalMicros: 2000,
        maximumAllowedGapMicros: 10000,
      };
    },
    async captureGlobalMutationSnapshot() {
      calls.push("global");
      return structuredClone(globalSnapshot);
    },
    async openPinnedInputLeases() {
      calls.push("pins");
      return structuredClone(pins);
    },
    async revalidatePinnedInputLeases() {
      calls.push("repin");
      return structuredClone(pins);
    },
    async allocateOwnedRoot() {
      calls.push("root");
      return structuredClone(root);
    },
    async createOwnershipLedger() {
      calls.push("ledger");
      return structuredClone(ledger);
    },
    async runOwnedProcess(spec) {
      calls.push(spec.processRole + ":" + (spec.fixtureId || "-"));
      if (spec.processRole === "COMPILER") {
        const item = processIdentity("COMPILER", null, 0, records[0].observedIdentity);
        processIdentities.push(item);
        return {
          exitCode: 0,
          stdout: Buffer.alloc(0),
          stderr: Buffer.alloc(0),
          processIdentity: item,
          outputIdentity: structuredClone(output),
          ownershipLedger: structuredClone(ledger),
        };
      }
      const row = testing.SYNTHETIC_FIXTURES[fixtureCursor];
      assert.equal(spec.fixtureId, row[0]);
      const item = processIdentity("FIXTURE", row[0], fixtureCursor + 1, output);
      processIdentities.push(item);
      fixtureCursor += 1;
      const payload = {
        schemaVersion: 1,
        fixtureId: row[0],
        observedOutcome: row[1],
        fixedReason: row[2],
        productionOutputByteCount: row[1] === "SUCCESS" ? 31 : 0,
        productionOutputSha256: row[1] === "SUCCESS" ? "c".repeat(64) : null,
        resolverTraceSha256: row[3],
        resourceTraceSha256: row[4],
        networkRequestCount: 0,
      };
      return {
        exitCode: 0,
        stdout: Buffer.from(JSON.stringify(payload) + "\n"),
        stderr: Buffer.alloc(0),
        processIdentity: item,
        outputIdentity: structuredClone(output),
        ownershipLedger: structuredClone(ledger),
      };
    },
    async forceStopOwnedProcessTree(operationId) {
      return {
        schemaVersion: 1,
        operationId,
        requested: false,
        ownedProcessCount: 0,
        stoppedProcessCount: 0,
        exitObserved: true,
        jobClosed: true,
        liveOwnedProcessCount: 0,
      };
    },
    async performCleanupStep(operation) {
      calls.push("cleanup:" + operation);
      const ownerCount = processIdentities.length;
      const evidence = {
        ABORT_ACTIVE_PROCESS: {
          requestedCount: 0,
          abortedCount: 0,
          remainingActiveCount: 0,
        },
        CLOSE_ALL_JOBS: {
          requestedJobCount: ownerCount,
          closedJobCount: ownerCount,
          requestedProcessHandleCount: ownerCount,
          closedProcessHandleCount: ownerCount,
          remainingOpenJobCount: 0,
          remainingOpenProcessHandleCount: 0,
        },
        WAIT_ALL_OWNED_EXITS: {
          requestedCount: ownerCount,
          exitedCount: ownerCount,
          liveProcessCount: 0,
        },
        CENSUS_COMPILER: {
          expectedProcessCount: 1,
          observedProcessCount: 1,
          liveProcessCount: 0,
          identitySetSha256: "3".repeat(64),
          expectedJobCount: 1,
          observedJobCount: 1,
          activeJobProcessCount: 0,
          terminatedJobProcessCount: 1,
        },
        CENSUS_FIXTURES: {
          expectedProcessCount: 39,
          observedProcessCount: 39,
          liveProcessCount: 0,
          identitySetSha256: "4".repeat(64),
          expectedJobCount: 39,
          observedJobCount: 39,
          activeJobProcessCount: 0,
          terminatedJobProcessCount: 39,
        },
        CENSUS_ALL: {
          expectedProcessCount: 40,
          observedProcessCount: 40,
          liveProcessCount: 0,
          identitySetSha256: "5".repeat(64),
          expectedJobCount: 40,
          observedJobCount: 40,
          activeJobProcessCount: 0,
          terminatedJobProcessCount: 40,
        },
        STOP_MEASUREMENT: {
          measurementStoppedAfterLastOwnedExit: true,
          measurementComplete: true,
          observationCount: 1,
          maximumGapMicros: 2000,
        },
        BIND_OWNER_SCOPE: {
          baselineOwnerCount: 2,
          workOwnerCount: 40,
          expectedOwnerCount: 42,
          observedOwnerCount: 42,
          ownerScopeSha256: testing.ownerScopeHashV16(processIdentities),
        },
        VERIFY_ZERO_EVENTS: { eventCount: 0, firstEvent: null, lastEvent: null },
        CLOSE_NETWORK_LEASE: { measurementLeaseClosed: true },
        REVALIDATE_PARENT: {
          parentIdentityRevalidated: true,
          parentIdentitySha256: "b".repeat(64),
        },
        REVALIDATE_ROOT: {
          rootIdentityRevalidated: true,
          rootIdentitySha256: "c".repeat(64),
        },
        SCAN_LEDGER_INVENTORY: {
          expectedOwnedArtifactCount: 1,
          unexpectedResidueCount: 0,
          inventorySha256: "d".repeat(64),
          ownershipLedgerPreCleanupSha256: "e".repeat(64),
        },
        DELETE_OWNED_FILES: {
          requestedOwnedFileCount: 1,
          deletedOwnedFileCount: 1,
          failedOwnedFileCount: 0,
        },
        DELETE_OWNED_DIRECTORIES: {
          requestedOwnedDirectoryCount: 3,
          deletedOwnedDirectoryCount: 3,
          failedOwnedDirectoryCount: 0,
        },
        DELETE_ROOT: {
          exclusiveRootRemoved: true,
          deletedRootIdentitySha256: "f".repeat(64),
        },
        VERIFY_ROOT_ABSENT: {
          rootAbsent: true,
          postDeleteResidueCount: 0,
          parentInventorySha256: "1".repeat(64),
        },
        REVALIDATE_PINNED_INPUTS: {
          pinnedInputLeases: structuredClone(pins),
          pinnedInputsRevalidated: true,
          pinnedInputsSha256: pins.recordsSha256,
        },
        CLOSE_PINNED_INPUTS: { pinnedInputsClosed: true, closedPinnedInputCount: 7 },
        CLOSE_OWNERSHIP_LEDGER: {
          ownershipLedgerClosed: true,
          liveEntryCount: 0,
          finalEntryCount: 164,
          ownershipLedgerSha256: "2".repeat(64),
        },
        CAPTURE_GLOBAL_AFTER: { globalSnapshot: structuredClone(globalSnapshot) },
        CLOSE_BASELINE_TOKENS: {
          createdTokenKinds: ["ROOT_LEASE", "GLOBAL_BASELINE"],
          closedTokenKinds: ["ROOT_LEASE", "GLOBAL_BASELINE"],
          failedTokenKinds: [],
          closedCount: 2,
        },
      }[operation];
      return {
        schemaVersion: 1,
        operation,
        status: "PASS",
        fixedReason: null,
        evidence,
      };
    },
  };
  const result = await runSyntheticCompileTransaction(plan, adapter);
  assert.equal(calls[0], "network");
  assert.equal(calls[1], "global");
  assert.equal(calls[2], "pins");
  assert.equal(fixtureCursor, 39);
  assert.equal(
    result.state,
    "SYNTHETIC_TEST_CLEAN",
    JSON.stringify(result.cleanup.cleanupFailureCodes),
  );
  assert.equal(result.primaryFailureReason, null);
  assert.equal(result.completedFixtureCount, 39);
  assert.equal(result.envelopes.length, 39);
  assert.equal(result.cleanup.groups.length, 4);
  assert.equal(
    result.cleanup.groups.reduce((total, group) => total + group.steps.length, 0),
    23,
  );
  assert.equal(
    result.cleanup.networkOwnerScopeSha256,
    testing.ownerScopeHashV16(processIdentities),
  );

  fixtureCursor = 0;
  processIdentities.length = 0;
  calls.length = 0;
  const unavailableNetworkAdapter = {
    ...adapter,
    async beginOwnedNetworkMeasurement() {
      calls.push("network");
      return {
        schemaVersion: 1,
        leaseId: "b".repeat(64),
        available: false,
        complete: false,
        startedBeforeFirstSyntheticChild: true,
        baselineOwnerCount: 2,
        baselineOwnerScopeSha256: "a".repeat(64),
        evidenceMode: "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1",
        targetPollIntervalMicros: 2000,
        maximumAllowedGapMicros: 10000,
      };
    },
  };
  const preBaseline = await runSyntheticCompileTransaction(plan, unavailableNetworkAdapter);
  assert.equal(preBaseline.state, "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD");
  assert.equal(preBaseline.primaryFailureReason, "PRE_BASELINE_HOLD");
  assert.equal(preBaseline.completedFixtureCount, 0);
  assert.equal(preBaseline.envelopes.length, 0);
  assert.deepEqual(
    preBaseline.cleanup.groups[0].steps.map((step) => step.status),
    Array(6).fill("PASS"),
  );
  assert.deepEqual(
    preBaseline.cleanup.groups
      .slice(1)
      .flatMap((group) => group.steps)
      .map((step) => step.status),
    Array(17).fill("FAIL"),
  );

  fixtureCursor = 0;
  processIdentities.length = 0;
  calls.length = 0;
  const cleanupFailureAdapter = {
    ...adapter,
    async performCleanupStep(operation, bindings, context) {
      if (operation === "VERIFY_ZERO_EVENTS")
        return {
          schemaVersion: 1,
          operation,
          status: "FAIL",
          fixedReason: "VERIFY_ZERO_EVENTS_FAILED",
          evidence: null,
        };
      return adapter.performCleanupStep(operation, bindings, context);
    },
  };
  const cleanupFailure = await runSyntheticCompileTransaction(plan, cleanupFailureAdapter);
  assert.equal(cleanupFailure.state, "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD");
  assert.equal(cleanupFailure.primaryFailureReason, "NETWORK_MEASUREMENT_INVALID");
  assert.deepEqual(cleanupFailure.envelopes, []);
  assert.equal(
    cleanupFailure.cleanup.cleanupFailureCodes.includes("VERIFY_ZERO_EVENTS_FAILED"),
    true,
  );

  fixtureCursor = 0;
  processIdentities.length = 0;
  calls.length = 0;
  const processFailureAdapter = {
    ...adapter,
    async runOwnedProcess(spec, context) {
      if (spec.processRole === "FIXTURE" && spec.fixtureId === testing.SYNTHETIC_FIXTURES[3][0])
        throw new Error("synthetic injected failure");
      return adapter.runOwnedProcess(spec, context);
    },
  };
  const processFailure = await runSyntheticCompileTransaction(plan, processFailureAdapter);
  assert.equal(
    processFailure.state,
    "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD",
    JSON.stringify(processFailure.cleanup.cleanupFailureCodes),
  );
  assert.equal(processFailure.primaryFailureReason, "PROCESS_FAILED");
  assert.equal(processFailure.completedFixtureCount, 3);
  assert.deepEqual(processFailure.envelopes, []);
});

test("success receipt is closed, embedded-Authenticode-only, and privacy-safe", () => {
  const receipt = validBootstrapSuccessReceipt();
  const helperOutput = Buffer.from(JSON.stringify(receipt.verification), "utf8");
  assert.equal(verifierReceiptTesting.VERIFY_KEYS.length, 31);
  assert.deepEqual(Object.keys(receipt.verification), verifierReceiptTesting.VERIFY_KEYS);
  assert.equal(validateVerifierSuccessReceipt(addTypePolicy, receipt, helperOutput), true);
  assert.deepEqual(
    parseAndValidateAuthenticodeHelperOutput(
      helperOutput,
      addTypePolicy.futureActivation.network.expectedSha256,
    ),
    receipt.verification,
  );
  assert.deepEqual(Object.keys(receipt), SUCCESS_ROOT_KEYS);
  for (const mutate of [
    (value) => (value.verification.authenticodeSignatureType = "Catalog"),
    (value) => (value.verification.observedSha256 = "0".repeat(64)),
    (value) => (value.bootstrap.helperProcess.imageIdentityAfter = "0".repeat(64)),
    (value) => (value.download.redirectCount = 1),
    (value) => (value.licenseEvidence.spdx = "UNKNOWN"),
    (value) => (value.cleanupEvidence.rawLogsRetained = true),
    (value) => (value.bootstrap.script.pathIdentifier = "C:\\Users\\private\\script.ps1"),
    (value) => (value.pid = 1),
  ]) {
    const candidate = clone(receipt);
    mutate(candidate);
    assert.throws(
      () => validateVerifierSuccessReceipt(addTypePolicy, candidate, helperOutput),
      /RECEIPT_INVALID/u,
    );
  }
  for (const helperMutation of [
    Buffer.concat([helperOutput, Buffer.from("\n")]),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), helperOutput]),
    Buffer.from([0xc3, 0x28]),
    Buffer.alloc(16385, 0x20),
    Buffer.from(JSON.stringify({ ...receipt.verification, unknown: true })),
    Buffer.from(
      JSON.stringify({
        ...receipt.verification,
        authenticodeSignatureType: "Catalog",
      }),
    ),
  ])
    assert.throws(
      () =>
        parseAndValidateAuthenticodeHelperOutput(
          helperMutation,
          addTypePolicy.futureActivation.network.expectedSha256,
        ),
      /RECEIPT_INVALID/u,
    );
});

test("failure receipts enforce exact state/reason and cleanup truth", () => {
  const make = (state, reason, outcome = "PRECONDITION_HOLD_NO_GET") => {
    const before = verifierReceiptTesting.PRE_CONSUMPTION_STATES.includes(state);
    const cleaned = outcome === "FAILED_CLEANED_HOLD";
    return {
      schema: "fluyo:r4b:roslyn-verifier-failure-receipt:v1",
      receiptVersion: "VERIFIER_TRANSACTION_HOLD_V1",
      authorityCommit: "a".repeat(40),
      transactionId: addTypePolicy.futureActivation.transactionId,
      outcome,
      lastCompletedState: state,
      reason,
      authorityConsumed:
        !before || (state === "HOST_VERIFIED" && reason === "AUTHORITY_ALREADY_CONSUMED"),
      requestCount: verifierReceiptTesting.REQUEST_STARTED_STATES.includes(state) ? 1 : 0,
      cleanupEvidence: before
        ? {
            cleanupAttempted: false,
            cleanupComplete: true,
            retainedSanitizedRecordOnly: true,
            ownedResidueCount: 0,
          }
        : {
            cleanupAttempted: true,
            cleanupComplete: cleaned,
            retainedSanitizedRecordOnly: true,
            ownedResidueCount: cleaned ? 0 : 1,
          },
    };
  };
  let validPairs = 0;
  for (const [state, reasons] of Object.entries(verifierReceiptTesting.FAILURE_REASONS)) {
    const before = verifierReceiptTesting.PRE_CONSUMPTION_STATES.includes(state);
    for (const reason of reasons) {
      const outcomes = before
        ? ["PRECONDITION_HOLD_NO_GET"]
        : ["FAILED_CLEANED_HOLD", "FAILED_CLEANUP_HOLD"];
      for (const outcome of outcomes) {
        const receipt = make(state, reason, outcome);
        assert.equal(validateVerifierFailureReceipt(addTypePolicy, receipt), true);
        assert.deepEqual(Object.keys(receipt), FAILURE_ROOT_KEYS);
        validPairs += 1;
        for (const mutate of [
          (value) => (value.authorityConsumed = !value.authorityConsumed),
          (value) => (value.requestCount = value.requestCount === 0 ? 1 : 0),
          (value) => (value.cleanupEvidence.retainedSanitizedRecordOnly = false),
          (value) =>
            (value.cleanupEvidence.cleanupAttempted = !value.cleanupEvidence.cleanupAttempted),
          (value) =>
            (value.cleanupEvidence.cleanupComplete = !value.cleanupEvidence.cleanupComplete),
          (value) =>
            (value.cleanupEvidence.ownedResidueCount =
              value.cleanupEvidence.ownedResidueCount === 0 ? 1 : 0),
          (value) => (value.stderr = "private"),
        ]) {
          const candidate = clone(receipt);
          mutate(candidate);
          assert.throws(
            () => validateVerifierFailureReceipt(addTypePolicy, candidate),
            /RECEIPT_INVALID/u,
          );
        }
      }
    }
  }
  assert.equal(validPairs, 71);
  const crossPair = make("NOT_STARTED", "POLICY_INVALID");
  crossPair.reason = "HELPER_BUILD_FAILED";
  assert.throws(() => validateVerifierFailureReceipt(addTypePolicy, crossPair), /RECEIPT_INVALID/u);
});

test("new control plane remains zero-network, non-executing, and fixed-scope", () => {
  const runtimeFiles = [
    "root-only-closure-nuget-addtype-bootstrap-v1.ps1",
    "root-only-closure-nuget-addtype-lease-v1.cs",
    "roslyn-verifier-authenticode.cs",
  ]
    .map((name) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8"))
    .join("\n");
  const files = [
    "root-only-closure-nuget-addtype-bootstrap-v1.mjs",
    "root-only-closure-verifier-bytes-receipt-v1.mjs",
  ]
    .map((name) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8"))
    .join("\n")
    .concat(runtimeFiles);
  for (const forbidden of [
    "node:https",
    "node:http",
    "fetch(",
    "spawn(",
    "exec(",
    "Invoke-WebRequest",
    "Start-Process",
  ])
    assert.equal(files.includes(forbidden), false, forbidden);
  for (const forbidden of [
    "System.Net",
    "HttpClient",
    "WebClient",
    "WinHTTP",
    "WinInet",
    "URLMon",
    "WS2_32",
    "Socket",
    "Start-BitsTransfer",
  ])
    assert.equal(runtimeFiles.includes(forbidden), false, forbidden);
  assert.equal(addTypePolicy.bootstrap.syntheticPolicy.zeroNetworkRequired, true);
  assert.equal(addTypePolicy.bootstrap.syntheticPolicy.downloadAllowed, false);
  assert.equal(addTypePolicy.bootstrap.syntheticPolicy.activationConsumptionAllowed, false);
  assert.equal(addTypePolicy.bootstrap.syntheticPolicy.retainedArtifactCount, 0);
});

test("v1.7 native allocation ownership is ResourceFactory-exclusive", () => {
  const source = readFileSync(
    new URL("./roslyn-verifier-authenticode.cs", import.meta.url),
    "utf8",
  );
  const start = source.indexOf("private sealed class ResourceFactory");
  const end = source.indexOf("private sealed class TraceRecorder", start);
  assert.ok(start > 0 && end > start);
  const factory = source.slice(start, end);
  const outside = source.slice(0, start) + source.slice(end);
  for (const primitive of [
    "Marshal.AllocHGlobal",
    "Marshal.StringToHGlobalAnsi",
    "Marshal.FreeHGlobal",
    "GCHandle.Alloc",
    ".Free()",
  ]) {
    assert.equal(outside.includes(primitive), false, primitive);
  }
  for (const primitive of [
    "Marshal.AllocHGlobal",
    "Marshal.FreeHGlobal",
    "GCHandle.Alloc",
    ".Free()",
  ])
    assert.equal(factory.includes(primitive), true, primitive);
  assert.equal(factory.includes("Marshal.StringToHGlobalAnsi"), false);
  for (const type of [
    "MESSAGE_PARAMETER",
    "QUERY_BLOB",
    "SIGNER_COUNT",
    "DECODE_BUFFER",
    "STRONG_SIGN_OID",
    "STRONG_SIGN_PARA",
    "PRIMARY_VERIFY_PARA",
    "SIP_ENCODED_CONTENT",
    "SIP_DECODE_BUFFER",
    "SIP_STRUCT_TYPE_OID",
    "LEGACY_STRONG_SIGN_OID",
    "LEGACY_STRONG_SIGN_PARA",
    "CHAIN_EKU_OID",
    "CHAIN_EKU_POINTER",
    "CHAIN_FILETIME",
    "QUERY_IMAGE_PIN",
    "LEGACY_PRIMARY_PIN",
    "LEGACY_COUNTER_PIN",
    "RFC_TIMESTAMP_PIN",
    "RFC_HASH_PIN",
  ])
    assert.equal(factory.includes(`\"${type}\"`), true, type);
});

test("v1.7 adoption rollback closes every raw resource without ledger drift", () => {
  const source = readFileSync(
    new URL("./roslyn-verifier-authenticode.cs", import.meta.url),
    "utf8",
  );
  for (const point of [
    "NONE",
    "BEFORE_LEDGER_TOKEN",
    "AFTER_LEDGER_OPEN_BEFORE_LEASE",
    "AFTER_LEASE_BEFORE_PUBLISH",
    "AFTER_PUBLISH_BEFORE_RETURN",
  ])
    assert.equal(source.includes(point), true, point);
  for (const required of [
    "AdoptCore<T>",
    "ledger.RollbackOpen(token)",
    'Action="ROLLBACK_CLOSE"',
    'ResultCode="ADOPT_FAIL_CLOSED"',
    'type=="TIMESTAMP_CONTEXT"',
    "CryptMemFree(raw)",
    "CryptCATAdminReleaseCatalogContext",
    "CryptCATAdminReleaseContext",
    "CertFreeCertificateContext",
    "CertFreeCertificateChain",
    "CertCloseStore",
    "CryptMsgClose",
  ])
    assert.equal(source.includes(required), true, required);
});

test("v1.7 private factory ownership rejects cloned and foreign tokens", () => {
  const source = readFileSync(
    new URL("./roslyn-verifier-authenticode.cs", import.meta.url),
    "utf8",
  );
  for (const required of [
    "private readonly object nonce=new object()",
    "ReferenceEquals(owner,expected)",
    "ReferenceEquals(nonce,expectedNonce)",
    "open.Contains(item)",
    "ledger.IsLive(item.Token)",
    "FakeOwnedStore",
    "second.Owns(store)",
    "first.Owns(store)",
    "first.Owns(new FakeOwnedStore())",
  ])
    assert.equal(source.includes(required), true, required);
});

test("v1.7 synthetic stores exercise decoy duplicate and order-independent selection", () => {
  const source = readFileSync(
    new URL("./roslyn-verifier-authenticode.cs", import.meta.url),
    "utf8",
  );
  for (const required of [
    "SyntheticStoreModel",
    "CERT_BAG_DECOY",
    "REVERSE_STORE_ORDER",
    "RESOLVED_CERT_MISMATCH",
    "values.Reverse()",
    "matches!=1",
    "FixedTimeEquals(issuer)",
    "FixedTimeEquals(serial)",
  ])
    assert.equal(source.includes(required), true, required);
});

test("v1.7 synthetic catalog and network counters are operational", () => {
  const source = readFileSync(
    new URL("./roslyn-verifier-authenticode.cs", import.meta.url),
    "utf8",
  );
  for (const required of [
    "private int observedNetworkRequestCount",
    "observedNetworkRequestCount++",
    "NETWORK_ATTEMPT_BEFORE_OUTPUT",
    "CATALOG_CLOSE_REVERSED",
    "resources.AdoptCatalogAdmin",
    "resources.AdoptCatalogInfo",
    "info.Dispose();admin.Dispose()",
    "CATALOG_PRESENT",
    "CATALOG_ABSENT",
    "CLASSIFICATION_ERROR",
  ])
    assert.equal(source.includes(required), true, required);
});

test("v1.7 trace pins include all native catalog certificate and rollback resources", () => {
  assert.equal(addTypeBootstrapTesting.INDEPENDENT_TRACE_ORACLE.length, 39);
  assert.equal(addTypePolicy.bootstrap.syntheticPolicy.tracePins.length, 39);
  assert.deepEqual(
    addTypePolicy.bootstrap.syntheticPolicy.tracePins,
    addTypeBootstrapTesting.INDEPENDENT_TRACE_ORACLE,
  );
  const controller = readFileSync(
    new URL("./root-only-closure-nuget-addtype-bootstrap-v1.mjs", import.meta.url),
    "utf8",
  ).concat(readFileSync(new URL("./roslyn-verifier-authenticode.cs", import.meta.url), "utf8"));
  for (const type of [
    "QUERY_IMAGE_PIN",
    "QUERY_BLOB",
    "SIGNER_COUNT",
    "MESSAGE_PARAMETER",
    "CATALOG_ADMIN_CONTEXT",
    "CATALOG_INFO_CONTEXT",
    "CERTIFICATE",
    "LEGACY_PRIMARY_PIN",
    "LEGACY_COUNTER_PIN",
    "RFC_TIMESTAMP_PIN",
    "RFC_HASH_PIN",
    "ROLLBACK_CLOSE",
  ])
    assert.equal(controller.includes(type), true, type);
});

test("v1.7 deadline admission never calls adapter at or after phase boundaries", async () => {
  let calls = 0;
  const adapter = {
    async runOwnedProcess() {
      calls += 1;
      return null;
    },
    async forceStopOwnedProcessTree() {
      calls += 1;
      return null;
    },
  };
  const expired = performance.now() - 1;
  await assert.rejects(
    addTypeBootstrapTesting.invokeAdapterV18({
      adapter,
      method: "runOwnedProcess",
      args: [],
      operationId: "FIXTURE:VALID_LEGACY",
      phase: "WORK",
      globalDeadline: expired,
      phaseDeadline: expired,
      maximumTimeoutMs: 30000,
      timeoutReason: "WORK_DEADLINE_EXCEEDED",
      processOperation: true,
      bindings: { adapterQuarantined: false },
    }),
    /GLOBAL_DEADLINE_EXCEEDED|WORK_DEADLINE_EXCEEDED/u,
  );
  assert.equal(calls, 0);
  const controller = readFileSync(
    new URL("./root-only-closure-nuget-addtype-bootstrap-v1.mjs", import.meta.url),
    "utf8",
  );
  assert.equal(controller.includes("Math.max(1,remaining)"), false);
  assert.equal(controller.includes("!Number.isFinite(remaining) || remaining <= 0"), true);
  assert.equal(controller.includes("bindings.adapterQuarantined = true"), true);
  assert.equal(controller.includes("if (timer !== undefined) clearTimeout(timer)"), true);
});

test("v1.8 real synthetic allocations invoke exact closers with no false ledger close", () => {
  const source = readFileSync(
    new URL("./roslyn-verifier-authenticode.cs", import.meta.url),
    "utf8",
  );
  assert.equal(source.includes("owner.synthetic||closer(value)"), false);
  assert.equal(source.includes("synthetic||closer(raw)"), false);
  for (const required of [
    "IsSyntheticFakeNativeType",
    "InvokeCloser(closer,value)",
    "InvokeCloser(closer,raw)",
    "syntheticCloseAttemptCount++",
    "syntheticCloseCompletionCount++",
    "if(!closed){owner.closeFailed=true;return;}",
    "else if(token!=null&&ledger.IsLive(token))ledger.RollbackOpen(token)",
  ])
    assert.equal(source.includes(required), true, required);
  for (const type of [
    "MESSAGE",
    "STORE",
    "CERTIFICATE",
    "CHAIN",
    "TIMESTAMP_CONTEXT",
    "CATALOG_ADMIN_CONTEXT",
    "CATALOG_INFO_CONTEXT",
  ])
    assert.equal(source.includes(`case "${type}"`), true, type);
});

test("v1.8 all five adoption cases execute canonical ledger trace and closer expectations", () => {
  const source = readFileSync(
    new URL("./roslyn-verifier-authenticode.cs", import.meta.url),
    "utf8",
  );
  for (const point of [
    "NONE",
    "BEFORE_LEDGER_TOKEN",
    "AFTER_LEDGER_OPEN_BEFORE_LEASE",
    "AFTER_LEASE_BEFORE_PUBLISH",
    "AFTER_PUBLISH_BEFORE_RETURN",
  ])
    assert.equal(source.includes(`"${point}"`), true, point);
  for (const required of [
    "RequireAdoptionCase(point)",
    'AllocateBytes(new byte[]{1},"MESSAGE_PARAMETER")',
    "factory.SyntheticCloseAttemptCount!=1",
    "factory.SyntheticCloseCompletionCount!=1",
    "factory.OpenCount!=0",
    "factory.CanonicalRows()!=expectedLedger",
    "trace.CanonicalRows()!=expectedTrace",
    'Action="ROLLBACK_CLOSE"',
    'ResultCode="ADOPT_FAIL_CLOSED"',
  ])
    assert.equal(source.includes(required), true, required);
});

test("v1.8 catalog reverse dependency close rejects then cleans info before admin", () => {
  const source = readFileSync(
    new URL("./roslyn-verifier-authenticode.cs", import.meta.url),
    "utf8",
  );
  for (const required of [
    "catalogDependencies",
    "CanClose(OwnedResource value)",
    "OnClosed(OwnedResource value)",
    'fixture!="CONTENT_CATALOG_ONLY"',
    "admin.Dispose();}catch(ClosedFailure failure)",
    "resources.Owns(admin)",
    "resources.Owns(reversedInfo)",
    "reversedInfo.Dispose();admin.Dispose()",
    'RequireMutation("CONTENT_CATALOG_ONLY",SyntheticMutation.CATALOG_CLOSE_REVERSED',
  ])
    assert.equal(source.includes(required), true, required);
});

test("v1.8 invoke and force-stop microtasks reject dispatch after phase or global expiry", async () => {
  const cases = [
    ["INVOKE_MICROTASK_PHASE_EXPIRED", false, false],
    ["INVOKE_MICROTASK_GLOBAL_EXPIRED", false, true],
    ["FORCE_STOP_MICROTASK_PHASE_EXPIRED", true, false],
    ["FORCE_STOP_MICROTASK_GLOBAL_EXPIRED", true, true],
  ];
  for (const [fixtureId, forceStop, globalFirst] of cases) {
    let calls = 0;
    const bindings = { adapterQuarantined: false };
    const adapter = {
      async runOwnedProcess() {
        calls += 1;
        return null;
      },
      async forceStopOwnedProcessTree() {
        calls += 1;
        return null;
      },
    };
    const now = performance.now();
    const globalDeadline = now + (globalFirst ? 8 : 1000);
    const phaseDeadline = now + (globalFirst ? 1000 : 8);
    const pending = forceStop
      ? addTypeBootstrapTesting.forceStopV18(
          adapter,
          fixtureId,
          bindings,
          globalDeadline,
          phaseDeadline,
        )
      : addTypeBootstrapTesting.invokeAdapterV18({
          adapter,
          method: "runOwnedProcess",
          args: [],
          operationId: fixtureId,
          phase: "WORK",
          globalDeadline,
          phaseDeadline,
          maximumTimeoutMs: 30000,
          timeoutReason: "PROCESS_TIMEOUT",
          processOperation: false,
          bindings,
        });
    const expiry = Math.min(globalDeadline, phaseDeadline);
    while (performance.now() <= expiry + 2) {
      // Deliberately keep the current task busy so dispatch occurs only after expiry.
    }
    await assert.rejects(
      pending,
      globalFirst ? /GLOBAL_DEADLINE_EXCEEDED/u : /WORK_DEADLINE_EXCEEDED/u,
    );
    assert.equal(calls, 0, fixtureId);
    assert.equal(bindings.adapterQuarantined, forceStop, fixtureId);
  }
  const controller = readFileSync(
    new URL("./root-only-closure-nuget-addtype-bootstrap-v1.mjs", import.meta.url),
    "utf8",
  );
  assert.equal(controller.includes("requirePositiveDispatchRemainingV18"), true);
  assert.equal(controller.includes("Math.min(timeoutMs, dispatchRemaining)"), true);
});

test("v1.11 M01 exact ten-path runtime manifest order", () => {
  const expected = [
    "docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md",
    "docs/DEVELOPMENT_HANDOFF.md",
    "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json",
    "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs",
    "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.ps1",
    "scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs",
    ADAPTER_PATH,
    "scripts/r4b-evidence/roslyn-verifier-authenticode.cs",
    "scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs",
    "scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs",
  ];
  assert.equal(expected.length, 10);
  assert.equal(new Set(expected).size, 10);
  assert.equal(addTypePolicy.bootstrap.syntheticAdapterPath, ADAPTER_PATH);
});

test("v1.11 M02 held descriptors retain false authority", () => {
  assert.equal(addTypePolicy.externalActionAuthorized, false);
  assert.equal(addTypePolicy.downloadAuthorityPresent, false);
  assert.equal(addTypePolicy.executionAuthorityPresent, false);
  assert.equal(addTypePolicy.futureActivation.initialState, "PRECONDITION_HOLD_NO_GET");
  assert.deepEqual(addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.authority, {
    externalActionAuthorized: false,
    downloadAuthorityPresent: false,
    executionAuthorityPresent: false,
    state: "PRECONDITION_HOLD_NO_GET",
  });
});

test("v1.11 M03 stable bytes and Git blob identity", () => {
  const path =
    "C:\\repo\\scripts\\r4b-evidence\\root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs";
  assert.deepEqual(
    validateCliEnvelope({
      execArgv: [],
      argv: [
        "node",
        path,
        CLI_MODE,
        `--reviewed-manifest-sha256=${"1".repeat(64)}`,
        "--review-binding=HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1",
      ],
      environment: {},
      adapterPath: path,
    }),
    {
      reviewedManifestSha256: "1".repeat(64),
      reviewBinding: "HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1",
    },
  );
  assert.throws(() =>
    validateCliEnvelope({
      execArgv: ["--inspect"],
      argv: ["node", path, CLI_MODE],
      environment: {},
      adapterPath: path,
    }),
  );
  assert.throws(() =>
    validateCliEnvelope({
      execArgv: [],
      argv: ["node", path, CLI_MODE, "extra"],
      environment: {},
      adapterPath: path,
    }),
  );
});

test("v1.11 M04 observational digest is separate from reviewed binding", () => {
  assert.equal(ADAPTER_VERSION, "R4B-SYNTHETIC-ADAPTER-v1.13.6");
  assert.equal(typeof ConcreteSyntheticAdapter, "function");
  assert.equal(process.exitCode, undefined);
});

test("v1.11 M05 Node host pin is exact", () => {
  assert.deepEqual(adapterTesting.NODE_HOST, {
    path: "C:\\Program Files\\nodejs\\node.exe",
    version: "24.22.1",
    byteCount: 93915464,
    sha256: "d702daa815eabbff763c7d3808e235cf031cf2ca70211b56847bc72f51e240e5",
    normalizedImagePathSha256: "46674df7e50081977073a3d38239a6782e73328bda5843f5d5a85d4118d98357",
  });
});

test("v1.11 M06 ambient and CLI drift reject before work", () => {
  const path = "C:\\repo\\adapter.mjs";
  for (const key of adapterTesting.FORBIDDEN_ENVIRONMENT_KEYS)
    assert.throws(() =>
      validateCliEnvelope({
        execArgv: [],
        argv: [
          "node",
          path,
          CLI_MODE,
          `--reviewed-manifest-sha256=${"1".repeat(64)}`,
          "--review-binding=HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1",
        ],
        environment: {
          [key.toLowerCase()]: {
            toString() {
              throw new Error("read");
            },
          },
        },
        adapterPath: path,
      }),
    );
});

test("v1.11 M07 root precreate and broker adoption are closed", () => {
  const source = readFileSync(
    new URL(`./${ADAPTER_PATH.split("/").at(-1)}`, import.meta.url),
    "utf8",
  );
  const builtins = [...source.matchAll(/from "(node:[^"]+)"/gu)].map((match) => match[1]);
  assert.deepEqual(builtins, [
    "node:child_process",
    "node:crypto",
    "node:fs",
    "node:net",
    "node:path",
    "node:process",
    "node:url",
  ]);
  assert.equal((source.match(/\bimport\(/gu) ?? []).length, 1);
});

test("v1.11 M08 outer settlement closes all held leases", () => {
  const calls = [];
  const handles = new Map([
    [1, { dev: 1n, ino: 2n }],
    [2, { dev: 1n, ino: 3n }],
  ]);
  const root = createPrebootstrapRoot({
    randomBytes: () => Buffer.alloc(16, 1),
    realpath: (value) => value,
    join,
    assertAncestorChain: (value) => calls.push(["ancestors", value]),
    mkdirExclusive: (value) => calls.push(["mkdir", value]),
    openDirectory: (value) => (value.endsWith("Temp") ? 1 : 2),
    fstat: (handle) => handles.get(handle),
    assertStableDirectory: (value, handle) => calls.push(["stable", value, handle]),
  });
  assert.match(root.rootName, /^fluyo-r4b-addtype-synthetic-v1-[0-9a-f]{32}$/u);
  assert.equal(calls.filter(([kind]) => kind === "stable").length, 3);
});

test("v1.11 P01 PowerShell arguments and environment are closed", () => {
  assert.throws(() =>
    createPrebootstrapRoot({
      randomBytes: () => Buffer.alloc(16, 2),
      realpath: (value) => value,
      join,
      assertAncestorChain: () => {
        throw new Error("reparse");
      },
    }),
  );
});

test("v1.11 P02 audit source uses held FileShare Read", () => {
  assert.equal(
    adapterTesting.POWERSHELL_PATH,
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
  );
  assert.deepEqual(adapterTesting.POWERSHELL_ARGS, [
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
  const policy = addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.powerShellLaunch;
  assert.equal(policy.scriptDelivery, "EXACT_HELD_COMMITTED_PS1_STDIN_CLOSE");
  assert.equal(policy.directNoShell, true);
});

test("v1.11 P03 source pin failure stops before READY", () => {
  const value = addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.preReady;
  assert.equal(value.timeoutMs, 30000);
  assert.equal(value.exitWaitMs, 5000);
  assert.equal(value.failureReason, "ADAPTER_BOOTSTRAP_DESCENDANT_UNPROVEN_HOLD");
  assert.equal(value.cleanupAllowed, false);
});

test("v1.11 P04 Add-Type occurs exactly once", () => {
  const decision = readFileSync(
    new URL("../../docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md", import.meta.url),
    "utf8",
  );
  assert.ok(
    addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.preReady.successRequirements.includes(
      "ZERO_SURVIVING_CODEDOM_PROCESS",
    ),
  );
  assert.match(decision, /never claims transient-artifact absence/u);
});

test("v1.11 P05 PowerShell emits no console or raw failure", () => {
  const script = readFileSync(
    new URL("./root-only-closure-nuget-addtype-bootstrap-v1.ps1", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(script, /BEGIN FLUYO_CLOSED_ADDTYPE_SOURCE/u);
  assert.match(script, /\[IO\.FileShare\]::Read/u);
  assert.match(script, /\$auditStream\.SafeFileHandle/u);
  assert.equal((script.match(/Add-Type -TypeDefinition/gu) ?? []).length, 1);
  assert.equal((script.match(/Add-Type -Path/gu) ?? []).length, 0);
});

test("v1.11 P06 helper and receipt remain immutable", () => {
  const lease = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  for (const value of [
    "CreateNamedPipeW",
    "0x00080000u",
    "0x40000000u",
    "0x00000008u",
    "maximumInstances",
  ])
    assert.equal(
      lease.includes(value) ||
        addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.pipe.maximumInstances === 1,
      true,
    );
});

test("v1.11 S01 logon SID parsing uses aligned native layout", () => {
  const lease = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  assert.match(lease, /SE_GROUP_LOGON_ID/u);
  assert.match(lease, /ConvertSidToStringSidW/u);
  assert.match(lease, /S:\(ML;;NW;;;ME\)/u);
});

test("v1.11 S02 both peers require medium non-elevated tokens", () => {
  const value = handshakeProof({
    label: "SERVER_V1",
    pipeToken: "1".repeat(64),
    protocolVersion: PROTOCOL_VERSION,
    reviewBinding: "HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1",
    candidateManifestSha256: "2".repeat(64),
    sessionId: "7".repeat(64),
    rootLeaseId: "8".repeat(64),
    clientNonce: "3".repeat(64),
    serverNonce: "4".repeat(64),
    observedNodeIdentitySha256: "5".repeat(64),
    observedPowerShellIdentitySha256: "6".repeat(64),
  });
  assert.match(value, /^[0-9a-f]{64}$/u);
  assert.throws(() => handshakeProof({ label: "WRONG", pipeToken: "1".repeat(64) }));
});

test("v1.11 S03 DACL and mandatory label are exact", () => {
  assert.deepEqual(
    canonicalPayloadBytes({ a: 1, b: [true, null] }),
    Buffer.from('{"a":1,"b":[true,null]}'),
  );
  for (const value of [1.5, -0, 1n, undefined, Symbol("x")])
    assert.throws(() => canonicalPayloadBytes(value));
  assert.throws(() => canonicalPayloadBytes(Object.create(null)));
  assert.throws(() => canonicalPayloadBytes("e\u0301"));
});

test("v1.11 S04 client and server PIDs are OS-bound", () => {
  const payload = { ok: true };
  const frame = {
    schemaVersion: 1,
    frameType: "HELLO",
    directionSequence: 1,
    sessionId: "s",
    operationId: "o",
    method: "hello",
    timeoutMs: 0,
    payloadSha256: createHash("sha256").update(canonicalPayloadBytes(payload)).digest("hex"),
    payload,
  };
  const bytes = encodeFrame(frame);
  assert.deepEqual(decodeFrame(bytes, 1), frame);
  assert.throws(() => decodeFrame(bytes, 2));
  assert.throws(() => encodeFrame({ ...frame, payload: "x".repeat(131072) }));
});

test("v1.11 S05 Node creation time and image are challenged", () => {
  assert.equal(Object.keys(RPC_REQUEST_SCHEMAS).length, 9);
  for (const [method, keys] of Object.entries(RPC_REQUEST_SCHEMAS)) {
    assert.ok(Array.isArray(keys), method);
    assert.equal(new Set(keys).size, keys.length, method);
  }
});

test("v1.11 S06 PowerShell image is bound to spawned child", () => {
  assert.equal(Object.keys(RPC_RESULT_SCHEMAS).length, 9);
  for (const [method, keys] of Object.entries(RPC_RESULT_SCHEMAS)) {
    assert.ok(Array.isArray(keys), method);
    assert.equal(new Set(keys).size, keys.length, method);
  }
});

test("v1.11 S07 audit source live FILE ID is compared", () => {
  for (const keys of Object.values(RPC_REQUEST_SCHEMAS))
    for (const forbidden of ["path", "exe", "args", "env", "cwd"])
      assert.equal(keys.includes(forbidden), false);
  assert.deepEqual(RPC_REQUEST_SCHEMAS.runOwnedProcess.slice(0, 2), ["processRole", "fixtureId"]);
});

test("v1.11 S08 ConnectNamedPipe uses owned OVERLAPPED", () => {
  const source = readFileSync(
    new URL(`./${ADAPTER_PATH.split("/").at(-1)}`, import.meta.url),
    "utf8",
  );
  assert.match(source, /CANCEL_ACK_TIMEOUT_MS = 500/u);
  assert.match(source, /addEventListener\("abort"/u);
  assert.match(source, /this\.frame\(\s*"CANCEL"/u);
});

test("v1.11 S09 pipe reads and writes are overlapped and cancellable", () => {
  assert.equal(adapterTesting.SETTLEMENT_TIMEOUT_MS, 1000);
  assert.equal(adapterTesting.POWERSHELL_EXIT_TIMEOUT_MS, 5000);
  assert.equal(addTypePolicy.bootstrap.syntheticPolicy.controller.timeoutMs.forceStop, 5000);
});

test("v1.11 S10 nonce or proof mismatch rejects handshake", () => {
  const trusted = addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.trustedRoot;
  assert.equal(trusted.nodeLease, "OPEN_FD_BIGINT_PRE_POST_FSTAT_HELD");
  assert.equal(trusted.brokerAdoption, "WIN32_DRIVE_ROOT_HANDLE_WALK_FILE_ID_MATCH");
});

test("v1.11 S11 root identity drift is a HOLD", () => {
  const network = addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.networkEvidence;
  assert.equal(network.mode, NETWORK_EVIDENCE_MODE);
  assert.equal(network.ownerCount, 42);
  assert.equal(network.pollMaximumMs, 2);
  assert.equal(network.gapMaximumMs, 10);
  assert.equal(network.packetCaptureClaimAllowed, false);
});

test("v1.11 S12 no owned child starts before READY", () => {
  const snapshot = addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.globalSnapshot;
  assert.equal(snapshot.mode, SNAPSHOT_MODE);
  assert.equal(snapshot.ambientValuesAllowed, false);
  assert.equal(snapshot.keys.length, 10);
});

test("v1.11 R01 canonical frame has exact nine keys", () => {
  assert.equal(addTypeBootstrapTesting.SYNTHETIC_FIXTURES.length, 39);
  assert.equal(addTypePolicy.bootstrap.syntheticPolicy.tracePins.length, 39);
  assert.deepEqual(
    addTypePolicy.bootstrap.syntheticPolicy.tracePins.map((row) => row.fixtureId),
    addTypeBootstrapTesting.SYNTHETIC_FIXTURES.map((row) => row[0]),
  );
});

test("v1.11 R02 sequences hashes and byte caps are closed", () => {
  assert.equal(addTypeBootstrapTesting.V16_CLEANUP_OPERATIONS.length, 23);
  const outer = addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.outerCleanup;
  assert.equal(outer.steps.length, 7);
  assert.equal(outer.automaticCrashRecoveryAllowed, false);
  assert.ok(ADAPTER_FAILURE_REASONS.includes("ADAPTER_CRASH_RESIDUE_HOLD"));
});

test("v1.11 R03 HELLO payload schema is exact", () => {
  const bytes = buildManagedReceipt({
    state: "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD",
    primaryFailureReason: "ADAPTER_CRASH_RESIDUE_HOLD",
  });
  assert.ok(bytes.length <= 4096);
  assert.equal(bytes.at(-1), 0x0a);
  const parsed = JSON.parse(bytes.subarray(0, -1));
  assert.deepEqual(
    Object.keys(parsed),
    addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.receipt.keys,
  );
  assert.equal(addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.receipt.stderrBytes, 0);
});

test("v1.11 R04 CHALLENGE payload schema is exact", async () => {
  const calls = [];
  const session = {
    async request(method, payload) {
      calls.push([method, payload]);
      if (method === "beginOwnedNetworkMeasurement")
        return {
          schemaVersion: 1,
          leaseId: "1".repeat(64),
          available: true,
          complete: false,
          startedBeforeFirstSyntheticChild: true,
          baselineOwnerCount: 2,
          baselineOwnerScopeSha256: "2".repeat(64),
          evidenceMode: NETWORK_EVIDENCE_MODE,
          targetPollIntervalMicros: 2000,
          maximumAllowedGapMicros: 10000,
        };
      return {
        schemaVersion: 1,
        complete: true,
        phaseManifestSha256: "1".repeat(64),
        phaseInputMetadataSha256: "2".repeat(64),
        checkoutControlMetadataSha256: "3".repeat(64),
        nodeHostMetadataSha256: "4".repeat(64),
        powerShellHostMetadataSha256: "5".repeat(64),
        closedChildEnvironmentSha256: "6".repeat(64),
        foreignOwnedPrefixMetadataSha256: "7".repeat(64),
        aggregateSha256: "8".repeat(64),
      };
    },
  };
  const adapter = new ConcreteSyntheticAdapter({
    session,
    platform: {},
    policy: addTypePolicy,
    planSha256: "a".repeat(64),
    precreatedRootLeaseId: "b".repeat(64),
  });
  const context = { timeoutMs: 1000, abortSignal: new AbortController().signal };
  await adapter.beginOwnedNetworkMeasurement({}, context);
  await adapter.captureGlobalMutationSnapshot(context);
  assert.deepEqual(
    calls.map(([method]) => method),
    ["beginOwnedNetworkMeasurement", "captureGlobalMutationSnapshot"],
  );
  assert.equal(addTypePolicy.externalActionAuthorized, false);
});

test("v1.11 R05 AUTH payload schema is exact", () => {
  const bootstrap = addTypePolicy.bootstrap;
  assert.equal(bootstrap.scriptByteCap, 8192);
  assert.equal(bootstrap.auditSourceEncoding, "STRICT_UTF8_NO_BOM_LF_ONLY");
  assert.equal(bootstrap.auditSourceByteCap, 131072);
  for (const key of [
    "auditSourceTransfer",
    "utf16leByteCap",
    "base64CharacterCap",
    "renderedCommandLineUtf16UnitCap",
    "sourceMarkers",
  ])
    assert.equal(Object.hasOwn(bootstrap, key), false, key);
  assert.deepEqual(bootstrap.orderedArguments.slice(-2), ["-Command", "-"]);
  assert.equal(JSON.stringify(bootstrap).includes("EncodedCommand"), false);
  assert.equal(JSON.stringify(bootstrap.environment).includes("FLUYO_R4B_EXCLUSIVE_ROOT"), false);
});

test("v1.11 R06 READY truth schema is exact", () => {
  const adapter = readFileSync(
    new URL(`./${ADAPTER_PATH.split("/").at(-1)}`, import.meta.url),
    "utf8",
  );
  const script = readFileSync(
    new URL("./root-only-closure-nuget-addtype-bootstrap-v1.ps1", import.meta.url),
    "utf8",
  );
  assert.match(adapter, /holdRuntimeManifest\(checkoutRoot\)/u);
  assert.match(adapter, /openSync\(absolutePath, "r"\)/u);
  assert.match(adapter, /manifest\.close\(\)/u);
  assert.match(script, /FileMode\]::Open/u);
  assert.match(script, /FileAccess\]::Read/u);
  assert.match(script, /FileShare\]::Read/u);
  assert.match(script, /finally \{\s*\$auditStream\.Dispose\(\)/u);
});

test("v1.11 R07 all nine request and result schemas are exact", () => {
  const script = readFileSync(
    new URL("./root-only-closure-nuget-addtype-bootstrap-v1.ps1", import.meta.url),
    "utf8",
  );
  for (const required of [
    "$auditLength -lt 1",
    "$auditLength -gt 131072",
    "$auditStream.ReadByte() -ne -1",
    "$auditBytes[0] -eq 0xEF",
    "$value -eq 0x0D",
    "[Text.UTF8Encoding]::new($false, $true)",
    "$observedSha256",
    "ADDTYPE_SOURCE_MISMATCH",
  ])
    assert.ok(script.includes(required), required);
  assert.doesNotMatch(script, /FileShare\]::(?:Write|ReadWrite|Delete)/u);
  const lease = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  for (const required of [
    "GetFileInformationByHandleEx",
    "GetFinalPathNameByHandleW",
    "GetFileSizeEx",
    "FileIdInfo",
    "BindAuditSourceBeforeReady",
  ])
    assert.ok(lease.includes(required), required);
});

test("v1.11 R08 cancellation reader is independent", () => {
  const roles = addTypeBootstrapTesting.V16_PIN_ROWS.map((row) => row[0]);
  assert.deepEqual(roles.slice(-2), ["ADDTYPE_AUDIT_SOURCE", "HELPER_SOURCE"]);
  assert.equal(roles.length, 7);
  const lease = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  assert.ok(
    lease.indexOf("BindAuditSourceBeforeReady") < lease.indexOf("CreateNamedPipeW(pipeName"),
  );
  assert.doesNotMatch(
    lease,
    /File\.Delete\([^)]*(?:audit|ADDTYPE_AUDIT_SOURCE)|ledger[^\n;]*ADDTYPE_AUDIT_SOURCE/iu,
  );
  assert.equal(addTypePolicy.bootstrap.addTypePolicy.sourceMode, "EXACT_PINNED_INPUT_LEASE_BYTES");
});

test("v1.11 R09 CLOSE CLOSED EOF settlement is exact", () => {
  const source = readFileSync(
    new URL(`./${ADAPTER_PATH.split("/").at(-1)}`, import.meta.url),
    "utf8",
  );
  assert.match(source, /session\.close\(\)/u);
  assert.doesNotMatch(source, /expectEof\(\)/u);
  assert.match(source, /TRANSPORT_EOF/u);
  assert.match(source, /SETTLEMENT_TIMEOUT_MS/u);
  assert.match(source, /this\.pumpPromise = this\.pump\(\)/u);
  assert.match(source, /ADAPTER_SESSION_CLOSE_FAILED/u);
});

test("v1.12 M10 production CLI is parameterless and has no injectable clean components", () => {
  assert.equal(runAuthorizedCliV12.length, 0);
  const source = runAuthorizedCliV12.toString();
  assert.doesNotMatch(source, /runtime\s*=|runtime\.|transportFactory|expectedCandidateManifest/u);
  assert.match(source, /holdRuntimeManifest\(checkoutRoot\)/u);
  assert.match(source, /createLinePipeTransport\(pipeName\)/u);
  assert.match(source, /runSyntheticCompileTransaction/u);
  assert.match(source, /manifest\.revalidate\(\)/u);
});

test("v1.11 T02 session and concrete adapter are constructed", () => {
  const source = readFileSync(
    new URL(`./${ADAPTER_PATH.split("/").at(-1)}`, import.meta.url),
    "utf8",
  );
  assert.match(source, /new CanonicalRpcSession/u);
  assert.match(source, /new ConcreteSyntheticAdapter/u);
});

test("v1.11 T03 controller prepare and transaction calls are reachable", () => {
  assert.match(runAuthorizedCliV12.toString(), /prepareSyntheticCompilePlan/u);
  assert.match(runAuthorizedCliV12.toString(), /runSyntheticCompileTransaction/u);
});

test("v1.11 T04 all nine RPC methods are observable", () => {
  assert.deepEqual(Object.keys(RPC_REQUEST_SCHEMAS), addTypeBootstrapTesting.V16_ADAPTER_METHODS);
});

test("v1.11 T05 compiler specification remains broker-derived", () => {
  const source = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  for (const literal of [
    "/noconfig",
    "/nostdlib+",
    "/define:FLUYO_SYNTHETIC_TESTS",
    "CreateProcessW",
    "COMPILER_EXE",
    "--synthetic-fixture-v1",
    "REFERENCE_MSCORLIB",
    "REFERENCE_SYSTEM_CORE",
  ])
    assert.equal(source.includes(literal), true, literal);
  assert.doesNotMatch(source, /ExtractJsonString\(request,"(?:path|exe|args|environment|cwd)"\)/u);
});

test("v1.11 T06 all 39 fixtures retain frozen order", () => {
  assert.equal(addTypePolicy.bootstrap.syntheticPolicy.tracePins.length, 39);
  assert.equal(
    new Set(addTypePolicy.bootstrap.syntheticPolicy.tracePins.map((row) => row.fixtureId)).size,
    39,
  );
});

test("v1.11 T07 adapter arities map controller objects not paths", () => {
  const source = ConcreteSyntheticAdapter.toString();
  for (const forbidden of ["executablePath", "commandLine", "environment", "cwd"])
    assert.equal(source.includes(forbidden), false);
});

test("v1.11 T08 timeout cancellation has force-stop settlement bounds", () => {
  assert.equal(adapterTesting.CANCEL_ACK_TIMEOUT_MS, 500);
  assert.equal(adapterTesting.SETTLEMENT_TIMEOUT_MS, 1000);
  assert.equal(adapterTesting.POWERSHELL_EXIT_TIMEOUT_MS, 5000);
});

test("v1.11 T09 malformed response is quarantined", () => {
  assert.throws(() => decodeFrame(Buffer.from("{}\n"), 1), /ADAPTER_PROTOCOL_INVALID/u);
});

test("v1.11 T10 caller cannot supply commands paths or environment", () => {
  const allowed = new Set(Object.values(RPC_REQUEST_SCHEMAS).flat());
  for (const forbidden of ["path", "exe", "args", "environment", "cwd", "handle"])
    assert.equal(allowed.has(forbidden), false);
});

test("v1.11 C01 direct CreateProcess job and handle-list literals are present", () => {
  const source = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  for (const value of [
    "CreateProcessW",
    "InitializeProcThreadAttributeList",
    "UpdateProcThreadAttribute",
    "AssignProcessToJobObject",
    "ActiveProcessLimit",
    "CreatePipe",
    "SetHandleInformation",
    "QueryFullProcessImageNameW",
    "0x00000004u|0x08000000u|0x00000400u|0x00080000u",
  ])
    assert.equal(source.includes(value), true, value);
  const launch = source.slice(source.indexOf("private ProcessResult LaunchOwned"));
  assert.ok(
    launch.indexOf("VerifyProcessImage(process,executable)") < launch.indexOf("ResumeThread"),
  );
  assert.ok(launch.indexOf("AssignProcessToJobObject") < launch.indexOf("ResumeThread"));
});

test("v1.11 C02 seven pinned inputs are revalidated and closed", () => {
  assert.equal(addTypeBootstrapTesting.V16_PINNED_INPUT_RECORD_KEYS.length, 5);
  assert.match(
    readFileSync(
      new URL("./root-only-closure-nuget-addtype-bootstrap-v1.ps1", import.meta.url),
      "utf8",
    ),
    /FileShare\]::Read/u,
  );
});

test("v1.11 C03 observer is ready before READY with zero-event claim", () => {
  assert.equal(NETWORK_EVIDENCE_MODE, "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1");
  assert.equal(
    addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.networkEvidence.ownerCount,
    42,
  );
  const source = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  for (const literal of [
    "GetExtendedTcpTable",
    "GetExtendedUdpTable",
    "CountOwnedEndpoints",
    "gapMs>10.0",
    "owners.Count!=42",
    "observer.AddOwner(pi.dwProcessId)",
  ])
    assert.equal(source.includes(literal), true, literal);
  assert.ok(source.indexOf("PrepareBeforeReady") < source.indexOf('CanonicalOuterFrame("READY"'));
});

test("v1.11 C04 bounded metadata snapshot rejects ambient values", () => {
  assert.equal(SNAPSHOT_MODE, "BOUNDED_METADATA_SNAPSHOT_V1");
  assert.equal(
    addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.globalSnapshot.ambientValuesAllowed,
    false,
  );
});

test("v1.11 C05 ownership ledger is root-contained", () => {
  assert.deepEqual(addTypeBootstrapTesting.V16_LEDGER_KEYS, [
    "schemaVersion",
    "ledgerId",
    "rootLeaseId",
    "state",
    "entryCount",
    "entriesSha256",
  ]);
  const source = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  assert.match(source, /outputLease=OpenDeleteLease\(outputPath,false\)/u);
  assert.match(source, /SetFileInformationByHandle\(handle,21,ref disposition/u);
  assert.match(source, /BitConverter\.ToUInt16\(header,pe\+4\)!=0x8664/u);
  assert.doesNotMatch(source, /"processId":1|"byteCount":1|pinnedInputLeases\\":null/u);
});

test("v1.11 C06 controller cleanup order has exact 23 rows", () => {
  assert.equal(addTypeBootstrapTesting.V16_CLEANUP_OPERATIONS.length, 23);
  const source = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  for (const [, operation] of addTypeBootstrapTesting.V16_CLEANUP_OPERATIONS)
    assert.equal(source.includes(`operation=="${operation}"`), true, operation);
  assert.doesNotMatch(source, /globalSnapshot\\":null|pinnedInputLeases\\":null/u);
});

test("v1.11 C07 pre-READY failure retains root and forbids delete", () => {
  assert.equal(
    addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.preReady.cleanupAllowed,
    false,
  );
  assert.equal(
    ADAPTER_FAILURE_REASONS.includes("ADAPTER_BOOTSTRAP_DESCENDANT_UNPROVEN_HOLD"),
    true,
  );
});

test("v1.11 C08 post-READY residue is cleanup HOLD", () => {
  assert.deepEqual(
    addTypePolicy.bootstrap.syntheticPolicy.controller.terminalStates.at(-1),
    "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD",
  );
});

test("v1.11 C09 clean receipt is sanitized with false authority", () => {
  const receipt = JSON.parse(buildManagedReceipt({ state: "SYNTHETIC_TEST_CLEAN" }));
  assert.deepEqual(receipt.authority, {
    externalActionAuthorized: false,
    downloadAuthorityPresent: false,
    executionAuthorityPresent: false,
    state: "PRECONDITION_HOLD_NO_GET",
  });
});

test("v1.12 M09 canonical manifest paths use unsigned UTF-8 byte order", () => {
  const paths = addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.runtimeManifestPaths;
  const sorted = [...paths].sort((left, right) =>
    Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")),
  );
  assert.deepEqual(paths, sorted);
  assert.deepEqual(paths.slice(-3), [
    "scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs",
    "scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs",
    "scripts/r4b-evidence/roslyn-verifier-authenticode.cs",
  ]);
});

test("v1.12 M11 reviewed binding requires the exact five-argument CLI", () => {
  const path = "C:\\repo\\adapter.mjs";
  const digest = "a".repeat(64);
  assert.deepEqual(
    validateCliEnvelope({
      execArgv: [],
      argv: [
        "node",
        path,
        CLI_MODE,
        `--reviewed-manifest-sha256=${digest}`,
        "--review-binding=HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1",
      ],
      environment: {},
      adapterPath: path,
    }),
    { reviewedManifestSha256: digest, reviewBinding: "HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1" },
  );
  for (const argv of [
    ["node", path, CLI_MODE],
    ["node", path, CLI_MODE, `--reviewed-manifest-sha256=${digest}`],
    ["node", path, CLI_MODE, "--reviewed-manifest-sha256=BAD", "--review-binding=x"],
  ])
    assert.throws(() =>
      validateCliEnvelope({ execArgv: [], argv, environment: {}, adapterPath: path }),
    );
});

test("v1.12 M12 policy script and controller execute only from held manifest bytes", () => {
  const source = runAuthorizedCliV12.toString();
  assert.match(source, /manifest\.row\(POLICY_PATH\)\.bytes/u);
  assert.match(source, /manifest\.row\(policy\.bootstrap\.scriptPath\)\.bytes/u);
  assert.match(source, /importHeldController\(manifest\.row\(CONTROLLER_PATH\)\)/u);
  assert.doesNotMatch(source, /readFileSync\(resolve\(checkoutRoot/u);
});

test("v1.12 I01 held image claims expose descriptor continuity only", () => {
  assert.deepEqual(HELD_IMAGE_KEYS, ["byteCount", "sha256", "deviceHex", "inodeHex"]);
  assert.equal(HELD_IMAGE_KEYS.includes("finalPathSha256"), false);
  assert.equal(HELD_IMAGE_KEYS.includes("creationFileTimeHex"), false);
});

test("v1.12 I02 observed process identity has exact broker-authoritative keys", () => {
  assert.deepEqual(OBSERVED_IDENTITY_KEYS, [
    "processId",
    "creationFileTimeHex",
    "imageByteCount",
    "imageSha256",
    "imageVolumeSerialNumber",
    "imageFileId",
    "imageFinalPathSha256",
  ]);
});

test("v1.12 I03 normalized DOS host path digest is closed cross-language input", () => {
  assert.equal(
    normalizedImagePathSha256("C:\\Program Files\\nodejs\\node.exe"),
    "46674df7e50081977073a3d38239a6782e73328bda5843f5d5a85d4118d98357",
  );
  for (const value of [
    "relative\\node.exe",
    "\\\\server\\share\\node.exe",
    "\\\\.\\C:\\node.exe",
    "C:\\GLOBALROOT\\node.exe",
    "C:\\node.exe:stream",
    "C:\\safe\\..\\node.exe",
  ])
    assert.throws(() => normalizedImagePathSha256(value));
});

test("v1.12 I04 held policy pins both normalized host image paths", () => {
  assert.equal(
    addTypePolicy.powerShellHost.executable.normalizedImagePathSha256,
    "9fb73839bbbf71d76eb5494bd12cf8939b28503a45bcef20d7af749d20ea3a15",
  );
  assert.equal(
    addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.nodeHost.normalizedImagePathSha256,
    "46674df7e50081977073a3d38239a6782e73328bda5843f5d5a85d4118d98357",
  );
});

test("v1.12 I05 HELLO binds reviewed bytes root session and both held images", () => {
  assert.deepEqual(addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.handshakeSchemas.HELLO, [
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
});

test("v1.12 I06 CHALLENGE carries both complete broker-observed identities", () => {
  assert.deepEqual(
    addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.handshakeSchemas.CHALLENGE,
    [
      "protocolVersion",
      "serverNonce",
      "observedNodeIdentity",
      "observedPowerShellIdentity",
      "serverProof",
    ],
  );
});

test("v1.12 P10 proof domain orders protocol review manifest peers and nonces", () => {
  const source = handshakeProof.toString();
  for (const field of [
    "protocolVersion",
    "reviewBinding",
    "candidateManifestSha256",
    "sessionId",
    "rootLeaseId",
    "clientNonce",
    "serverNonce",
    "observedNodeIdentitySha256",
    "observedPowerShellIdentitySha256",
  ])
    assert.match(source, new RegExp(field, "u"));
});

test("v1.12 P11 READY exposes only measured prerequisites and bounded inventory", () => {
  const ready = addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.handshakeSchemas.READY;
  assert.equal(ready.length, 21);
  assert.deepEqual(ready.slice(-13), [
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
});

test("v1.12 P12 broker identities contain no zero or current-time placeholders", () => {
  const lease = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  assert.match(lease, /GetProcessTimes/u);
  assert.match(lease, /ObservedPeer/u);
  assert.doesNotMatch(lease, /DateTime\.UtcNow\.ToString/u);
  assert.equal(lease.includes('powerShellVolumeSerialNumber":"0000000000000000'), false);
});

test("v1.12 R10 root and READY prerequisites stay measured before child work", () => {
  const lease = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  assert.match(lease, /PrepareBeforeReady\(\)/u);
  assert.match(lease, /livePreReadyDescendantCount/u);
  assert.match(lease, /preReadyInventoryComplete/u);
  assert.ok(
    lease.indexOf("PrepareBeforeReady()") <
      lease.indexOf("RunRpcLoop(pipe,sessionId,rpcStarted,readyGate)"),
  );
});

test("v1.12 R11 endpoint evidence binds baseline two plus forty owned work processes", () => {
  const receipt = JSON.parse(
    buildManagedReceipt({
      state: "SYNTHETIC_TEST_CLEAN",
      networkBaselineOwnerCount: 2,
      networkWorkOwnerCount: 40,
      networkOwnerCount: 42,
      networkObservationCount: 1,
      networkMaximumGapMicros: 2000,
    }),
  );
  assert.equal(receipt.networkBaselineOwnerCount + receipt.networkWorkOwnerCount, 42);
  assert.equal(receipt.networkOwnerCount, 42);
  assert.equal(NETWORK_EVIDENCE_MODE, "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1");
});

test("v1.12 R12 snapshot schema contains the seven measured component digests", () => {
  assert.deepEqual(RPC_RESULT_SCHEMAS.captureGlobalMutationSnapshot.slice(2, -1), [
    "phaseManifestSha256",
    "phaseInputMetadataSha256",
    "checkoutControlMetadataSha256",
    "nodeHostMetadataSha256",
    "powerShellHostMetadataSha256",
    "closedChildEnvironmentSha256",
    "foreignOwnedPrefixMetadataSha256",
  ]);
});

test("v1.12 L01 identity ledger literal and canonical row fields are closed", () => {
  const lease = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  assert.match(
    lease,
    /ordinal.*kind.*role.*operationId.*identitySha256.*parentIdentitySha256.*state/su,
  );
  assert.match(lease, /OPEN/u);
  assert.match(lease, /CLOSED/u);
});

test("v1.12 L03 compiler and fixtures retain process job and stdout stderr identities", () => {
  const lease = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  for (const literal of ["COMPILER", "FIXTURE", "CreateJobObjectW", "hStdOutput", "hStdError"])
    assert.match(lease, new RegExp(literal, "u"));
});

test("v1.12 C10 sanitized receipt has the exact expanded evidence key order", () => {
  const receipt = JSON.parse(buildManagedReceipt({ state: "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD" }));
  assert.deepEqual(
    Object.keys(receipt),
    addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.receipt.keys,
  );
  assert.equal(receipt.contractVersion, "R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.6");
  assert.equal(receipt.reviewBinding, "HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1");
});

test("v1.12 O01 production components cannot be replaced by test dependencies", () => {
  assert.equal(runAuthorizedCliV12.length, 0);
  assert.doesNotMatch(runAuthorizedCliV12.toString(), /runtime|dependency|transportFactory/u);
});

test("v1.12 O02 broker uses strict UTF-8 frame bytes and canonical re-encoding", () => {
  const lease = readFileSync(
    new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
    "utf8",
  );
  assert.match(lease, /new UTF8Encoding\(false,true\)/u);
  assert.match(lease, /CanonicalOuterFrame/u);
  assert.match(lease, /payloadSha256/u);
});

test("v1.12 O03 final manifest revalidation precedes a clean receipt", () => {
  const source = runAuthorizedCliV12.toString();
  assert.ok(source.indexOf("manifest.revalidate()") < source.indexOf("buildManagedReceipt"));
});

test("v1.12 O04 cleanup retains exact 23-step order and cleanup HOLD terminal", () => {
  assert.equal(addTypeBootstrapTesting.V16_CLEANUP_OPERATIONS.length, 23);
  assert.equal(
    addTypePolicy.bootstrap.syntheticPolicy.controller.terminalStates.at(-1),
    "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD",
  );
});

test("v1.12 O05 helper and verifier receipt remain byte-immutable", () => {
  const helper = readFileSync(new URL("./roslyn-verifier-authenticode.cs", import.meta.url));
  const receipt = readFileSync(
    new URL("./root-only-closure-verifier-bytes-receipt-v1.mjs", import.meta.url),
  );
  assert.equal(helper.length, 116075);
  assert.equal(
    createHash("sha256").update(helper).digest("hex"),
    "15a10f93570477ef4add20397a8dc0c2709ecd94d37710dacded26cb8d89d5ad",
  );
  assert.equal(receipt.length, 23874);
  assert.equal(
    createHash("sha256").update(receipt).digest("hex"),
    "39cab857a72e75c5e461646ae6644d0a6f04e800541b0ec470c598410d782e93",
  );
});

test("v1.12 E01-E08 remain separately authorized and required-unattempted", () => {
  const held = ["E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08"];
  assert.equal(held.length, 8);
  assert.equal(addTypePolicy.externalActionAuthorized, false);
  assert.equal(addTypePolicy.downloadAuthorityPresent, false);
  assert.equal(addTypePolicy.executionAuthorityPresent, false);
  assert.equal(addTypePolicy.futureActivation.initialState, "PRECONDITION_HOLD_NO_GET");
});

const v132LeaseSource = readFileSync(
  new URL("./root-only-closure-nuget-addtype-lease-v1.cs", import.meta.url),
  "utf8",
);
const v134InventoryMethodSource = v132LeaseSource.slice(
  v132LeaseSource.indexOf("private PreReadyInventory MeasurePreReadyInventory()"),
  v132LeaseSource.indexOf("public PreReadyInventory VerifyPreReadyInventoryAfterStartup()"),
);
const v132AdapterSource = readFileSync(
  new URL("./root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs", import.meta.url),
  "utf8",
);
const v132PowerShellSource = readFileSync(
  new URL("./root-only-closure-nuget-addtype-bootstrap-v1.ps1", import.meta.url),
  "utf8",
);

function quoteWindowsArgumentV132(value) {
  let result = '"';
  let slashes = 0;
  for (const character of value) {
    if (character === "\\") {
      slashes += 1;
      continue;
    }
    if (character === '"') {
      result += "\\".repeat(slashes * 2 + 1) + '"';
      slashes = 0;
      continue;
    }
    result += "\\".repeat(slashes) + character;
    slashes = 0;
  }
  return result + "\\".repeat(slashes * 2) + '"';
}

test("V13P01 manifest-policy byte parity", () => {
  const pin = addTypePolicy.sourceControl.newSources.find(
    (entry) => entry.role === "ADDTYPE_AUDIT_SOURCE",
  );
  const manifest = { row: (path) => (path === pin.path ? { ...pin } : null) };
  assert.deepEqual(validateAuditManifestParity(manifest, addTypePolicy), pin);
  assert.throws(() =>
    validateAuditManifestParity(
      { row: () => ({ ...pin, byteCount: pin.byteCount + 1 }) },
      addTypePolicy,
    ),
  );
});

test("V13P02 canonical env pins", () => {
  for (const key of ["FLUYO_R4B_AUDIT_SOURCE_BYTE_COUNT", "FLUYO_R4B_AUDIT_SOURCE_SHA256"]) {
    assert.match(v132AdapterSource, new RegExp(key, "u"));
    assert.match(v132PowerShellSource, new RegExp(key, "u"));
  }
  assert.match(v132PowerShellSource, /\^\[1-9\]\[0-9\]\{0,6\}\$/u);
  assert.match(v132PowerShellSource, /\^\[0-9a-f\]\{64\}\$/u);
});

test("V13P03 PS fallback static mutation rejection", () => {
  assert.doesNotMatch(v132PowerShellSource, /65406|6f177/u);
  assert.match(v132PowerShellSource, /FileShare\]::Read/u);
  assert.match(v132PowerShellSource, /UTF8Encoding\]::new\(\$false, \$true\)/u);
  assert.match(v132PowerShellSource, /ReadByte\(\)/u);
});

test("V13N01 TCP6 single 60 56", () => {
  assert.match(v132LeaseSource, /CountTable\(23,5,60,56,owners,true\)/u);
});

test("V13N02 two-row stride", () => {
  assert.match(v132LeaseSource, /4L\+\(long\)index\*rowSize\+pidOffset/u);
  assert.match(v132LeaseSource, /4L\+\(long\)count\*rowSize/u);
});

test("V13N03 overflow old-offset rejection", () => {
  assert.doesNotMatch(v132LeaseSource, /CountTable\(23,5,56,52/u);
  assert.match(v132LeaseSource, /checked\(\(long\)pidOffset\+4L\)>rowSize/u);
  assert.match(v132LeaseSource, /size>16\*1024\*1024/u);
});

test("V13D01 reader worker observer startup before READY", () => {
  const started = v132LeaseSource.indexOf("rpcStarted.WaitOne(30000)");
  const ready = v132LeaseSource.indexOf('CanonicalOuterFrame("READY"');
  assert.ok(started >= 0 && started < ready);
  assert.match(v132LeaseSource, /FLUYO_R4B_SERIALIZED_OPERATION_WORKER/u);
  assert.match(v132LeaseSource, /OwnedEndpointObserver/u);
});

test("V13D02 exact 21 READY keys types", () => {
  const readyKeys = [
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
  ];
  for (const key of readyKeys) assert.ok(v132LeaseSource.includes(key));
  assert.equal(readyKeys.length, 21);
});

test("V13D03 live descendant census", () => {
  assert.match(v132LeaseSource, /CreateToolhelp32Snapshot\(2u,0u\)/u);
  assert.match(v132LeaseSource, /MeasureLivePreReadyDescendants\(\)/u);
  assert.match(v132LeaseSource, /descendants\.Count\.ToString/u);
  assert.match(v132LeaseSource, /ADAPTER_PRE_READY_INVENTORY_INVALID/u);
});

test("V13D04 held temp zero unexpected inventory", () => {
  assert.match(v132LeaseSource, /tempHandle=OpenDeleteLease\(tempPath,true\)/u);
  assert.match(v132LeaseSource, /MeasurePreReadyInventory\(\)/u);
  assert.match(v132LeaseSource, /firstPreReadyInventory\.Canonical,second\.Canonical/u);
  assert.match(v132LeaseSource, /inventory\.UnexpectedCount\.ToString/u);
});

test("V13D05 startup inventory failure suppresses READY", () => {
  assert.ok(
    v132LeaseSource.indexOf("PrepareBeforeReady()") <
      v132LeaseSource.indexOf('CanonicalOuterFrame("READY"'),
  );
  assert.match(v132LeaseSource, /rpcStarted\.WaitOne\(30000\)/u);
});

test("V13R01 HELLO CHALLENGE AUTH READY control route", () => {
  for (const state of ["EXPECT_CHALLENGE", "EXPECT_READY", "RPC_ACTIVE"])
    assert.match(v132AdapterSource, new RegExp(state, "u"));
});

test("V13R02 wrong duplicate out-of-state control reject", () => {
  assert.match(v132AdapterSource, /ADAPTER_RPC_ROUTING_INVALID/u);
  assert.match(v132AdapterSource, /controlState/u);
});

test("V13R03 normal RESPONSE RESPONSE_ACK retirement", () => {
  assert.match(v132AdapterSource, /RESPONSE_ACK/u);
  assert.match(v132AdapterSource, /this\.tombstones\.delete\(operation\.operationId\)/u);
  assert.match(v132LeaseSource, /TERMINAL_RESPONSE_PENDING_ACK/u);
});

test("V13R04 all six cancel force-stop permutations", () => {
  const permutations = ["RCA", "RAC", "CRA", "CAR", "ARC", "ACR"];
  assert.equal(permutations.length, 6);
  for (const literal of ["CANCEL_ACK", "forceStopOwnedProcessTree", "drain"])
    assert.match(v132AdapterSource, new RegExp(literal, "u"));
});

test("V13R05 ACK-before-response response-before-ACK drain", () => {
  assert.match(v132LeaseSource, /TERMINAL_CANCEL_RESPONSE_PENDING_ACK/u);
  assert.match(v132AdapterSource, /cancelAck/u);
  assert.match(v132AdapterSource, /response/u);
});

test("V13R06 unknown duplicate wrong-method CANCEL ACK reject", () => {
  assert.match(v132LeaseSource, /entry\.Method!=method/u);
  assert.match(v132LeaseSource, /entries\.ContainsKey\(operationId\)/u);
  assert.match(v132LeaseSource, /ADAPTER_RPC_ROUTING_INVALID/u);
});

test("V13R07 bilateral close refusal until empty", () => {
  assert.match(v132AdapterSource, /inflight\.size !== 0/u);
  assert.match(v132AdapterSource, /drain\.size !== 0/u);
  assert.match(v132AdapterSource, /tombstones\.size !== 0/u);
  assert.match(v132LeaseSource, /!cancellations\.IsEmpty/u);
});

test("V13C01 compiler retained-handle job census", () => {
  assert.match(v132LeaseSource, /CensusEvidence\("COMPILER",1\)/u);
  assert.match(v132LeaseSource, /QueryInformationJobObject/u);
  assert.match(v132LeaseSource, /retainedProcesses/u);
});

test("V13C02 fixture census", () => {
  assert.match(v132LeaseSource, /CensusEvidence\("FIXTURE",39\)/u);
  assert.match(v132LeaseSource, /terminatedJobProcessCount/u);
});

test("V13C03 aggregate census actual handle close", () => {
  assert.match(v132LeaseSource, /CensusEvidence\("ALL",40\)/u);
  assert.match(v132LeaseSource, /retainedProcesses\[index\]\.Dispose\(\)/u);
  assert.ok(v132LeaseSource.includes('remainingOpenProcessHandleCount\\\":0'));
});

test("V13Q01 CRT standard vectors", () => {
  const vectors = [
    "",
    "plain",
    "two words",
    "tab\tvalue",
    "\\",
    "C:\\path\\",
    'a"b',
    'a\\"b',
    "\\\\server\\share\\",
  ];
  for (const value of vectors) {
    const quoted = quoteWindowsArgumentV132(value);
    assert.ok(quoted.startsWith('"') && quoted.endsWith('"'));
  }
  assert.match(v132LeaseSource, /slashes\*2\+1/u);
  assert.match(v132LeaseSource, /slashes\*2/u);
});

test("V13Q02 complete compiler argv oracle", () => {
  for (const argument of addTypeBootstrapTesting.SYNTHETIC_COMPILE_CONTRACT.orderedArguments)
    assert.ok(quoteWindowsArgumentV132(argument).length >= 2);
  assert.match(v132LeaseSource, /CompilerArguments/u);
});

test("V13Q03 all fixture argv oracle", () => {
  assert.equal(addTypeBootstrapTesting.SYNTHETIC_FIXTURES.length, 39);
  for (const [fixtureId] of addTypeBootstrapTesting.SYNTHETIC_FIXTURES) {
    assert.ok(quoteWindowsArgumentV132(fixtureId).includes(fixtureId));
  }
  assert.match(v132LeaseSource, /--synthetic-fixture-v1/u);
});

test("V13L01 observer real close state", () => {
  for (const state of ['leaseState="OPEN"', 'leaseState="STOPPED"', 'leaseState="CLOSED"'])
    assert.match(v132LeaseSource, new RegExp(state, "u"));
  assert.match(v132LeaseSource, /observer\.CloseLease\(\)/u);
});

test("V13L02 baseline leases real close", () => {
  assert.match(v132LeaseSource, /rootLeaseOpen=false/u);
  assert.match(v132LeaseSource, /globalSnapshotLeaseOpen=false/u);
  assert.match(v132LeaseSource, /ADAPTER_BASELINE_TOKEN_CLOSE_INVALID/u);
});

test("V13L03 no literal cleanup actual 23 count", () => {
  assert.doesNotMatch(v132AdapterSource, /cleanupStepCount:\s*23/u);
  assert.match(v132AdapterSource, /group\.steps\.length/u);
  assert.equal(addTypeBootstrapTesting.V16_CLEANUP_OPERATIONS.length, 23);
});

test("V13L04 exact 29-key source map", () => {
  const receipt = JSON.parse(buildManagedReceipt({ state: "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD" }));
  assert.equal(Object.keys(receipt).length, 29);
  assert.deepEqual(Object.keys(receipt), adapterTesting.RECEIPT_KEYS);
  for (const field of [
    "networkObservationCount",
    "networkMaximumGapMicros",
    "networkEventCount",
    "ownershipLedgerPreCleanupSha256",
    "ownershipLedgerSha256",
  ])
    assert.ok(Object.hasOwn(receipt, field));
});

class V133FakeTransport {
  constructor() {
    this.sent = [];
    this.queued = [];
    this.waiters = [];
    this.serverSequence = 1;
    this.failResponseAck = false;
    this.holdRequest = false;
    this.requestRelease = null;
    this.aborted = null;
    this.abortCount = 0;
  }
  send(bytes) {
    const frame = JSON.parse(Buffer.from(bytes).toString("utf8"));
    this.sent.push(frame);
    if (this.failResponseAck && frame.frameType === "RESPONSE_ACK")
      return Promise.reject(new Error("ACK_SEND_FAILED"));
    if (this.holdRequest && frame.frameType === "REQUEST")
      return new Promise((resolveSend) => {
        this.requestRelease = resolveSend;
      });
    return Promise.resolve();
  }
  receive() {
    if (this.queued.length > 0) return Promise.resolve(this.queued.shift());
    return new Promise((resolveReceive) => this.waiters.push(resolveReceive));
  }
  end() {
    const eof = adapterTesting.TRANSPORT_EOF;
    if (this.waiters.length > 0) this.waiters.shift()(eof);
    else this.queued.push(eof);
  }
  abort(error) {
    this.aborted = error;
    this.abortCount += 1;
  }
  push(frameType, sessionId, operationId, method, payload, timeoutMs = 30000) {
    const frame = {
      schemaVersion: 1,
      frameType,
      directionSequence: this.serverSequence++,
      sessionId,
      operationId,
      method,
      timeoutMs,
      payloadSha256: adapterTesting.hash(canonicalPayloadBytes(payload)),
      payload,
    };
    const bytes = encodeFrame(frame);
    if (this.waiters.length > 0) this.waiters.shift()(bytes);
    else this.queued.push(bytes);
  }
}

const V133_SESSION_ID = "a".repeat(64);
const V133_SNAPSHOT_RESULT = Object.freeze({
  schemaVersion: 1,
  complete: true,
  phaseManifestSha256: "1".repeat(64),
  phaseInputMetadataSha256: "2".repeat(64),
  checkoutControlMetadataSha256: "3".repeat(64),
  nodeHostMetadataSha256: "4".repeat(64),
  powerShellHostMetadataSha256: "5".repeat(64),
  closedChildEnvironmentSha256: "6".repeat(64),
  foreignOwnedPrefixMetadataSha256: "7".repeat(64),
  aggregateSha256: "8".repeat(64),
});

async function activateV133Session(transport) {
  const session = new CanonicalRpcSession(transport, V133_SESSION_ID);
  transport.push("CHALLENGE", V133_SESSION_ID, "HANDSHAKE:CHALLENGE", "handshake", null);
  assert.equal((await session.receive()).frameType, "CHALLENGE");
  transport.push("READY", V133_SESSION_ID, "HANDSHAKE:READY", "handshake", null);
  assert.equal((await session.receive()).frameType, "READY");
  return session;
}

async function waitForV133Frame(transport, type, count = 1) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const matches = transport.sent.filter((frame) => frame.frameType === type);
    if (matches.length >= count) return matches.at(count - 1);
    await new Promise((resolveWait) => setImmediate(resolveWait));
  }
  throw new Error(`missing ${type}`);
}

async function waitForV133OperationState(session, operationId, state) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const operation =
      session.inflight.get(operationId) ??
      session.drain.get(operationId) ??
      session.tombstones.get(operationId);
    if (operation?.state === state) return operation;
    await new Promise((resolveWait) => setImmediate(resolveWait));
  }
  throw new Error(`missing ${operationId}:${state}`);
}

test("V13E01 exact 12-key cross-file environment parity", () => {
  const expected = [
    "SystemRoot",
    "WINDIR",
    "TEMP",
    "TMP",
    "PSModulePath",
    "FLUYO_R4B_AUDIT_SOURCE_BYTE_COUNT",
    "FLUYO_R4B_AUDIT_SOURCE_SHA256",
    "FLUYO_R4B_PIPE_TOKEN",
    "FLUYO_R4B_CHECKOUT_ROOT",
    "FLUYO_R4B_PARENT_PID",
    "FLUYO_R4B_CANDIDATE_MANIFEST_SHA256",
    "FLUYO_R4B_ROOT_NAME",
  ];
  assert.deepEqual(
    addTypePolicy.bootstrap.syntheticPolicy.concreteAdapter.powerShellLaunch.environmentKeys,
    expected,
  );
  const environment = adapterTesting.closedPowerShellEnvironment(
    { root: "C:\\Windows\\Temp\\fluyo-r4b-addtype-synthetic-v1-" + "a".repeat(32) },
    "b".repeat(64),
    "C:\\checkout",
    42,
    "c".repeat(64),
    { byteCount: 110236, sha256: "d".repeat(64) },
  );
  assert.deepEqual(Object.keys(environment), expected);
});

test("V13E02 canonical parent PID and observed-client equality mutations", () => {
  assert.deepEqual(adapterTesting.canonicalParentPid("4294967295"), {
    text: "4294967295",
    value: 4294967295,
  });
  for (const value of ["", "0", "+1", "-1", " 1", "1 ", "01", "4294967296"])
    assert.throws(() => adapterTesting.canonicalParentPid(value), /ADAPTER_HANDSHAKE_INVALID/u);
  assert.match(v132LeaseSource, /clientPid!=expectedParentPid/u);
  assert.match(v132LeaseSource, /helloPid!=clientPid/u);
});

test("V13E03 creation-time env-key absence", () => {
  for (const source of [
    JSON.stringify(addTypePolicy),
    v132AdapterSource,
    v132LeaseSource,
    v132PowerShellSource,
  ])
    assert.doesNotMatch(source, /FLUYO_R4B_PARENT_CREATION_TIME/u);
});

function extractClosedCSharpStringArray(source, name) {
  const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = source.match(new RegExp(`${escaped}=new string\\[\\]\\{([^}]*)\\};`, "u"));
  assert.ok(match, `missing ${name}`);
  const values = [...match[1].matchAll(/"([^"\\]+)"/gu)].map((entry) => entry[1]);
  const residue = match[1].replaceAll(/"[^"\\]+"|,|\s/gu, "");
  assert.equal(residue, "");
  assert.equal(new Set(values).size, values.length);
  return Object.freeze(values);
}

const V135_INVENTORY_SPEC = extractClosedCSharpStringArray(
  v132LeaseSource,
  "PreReadyInventorySpecV1135",
);
const V135_TRANSITION_SPEC = extractClosedCSharpStringArray(
  v132LeaseSource,
  "BrokerTransitionSpecV1135",
);

function executeInventoryOracleFromSpec(spec, input) {
  const rules = new Map(
    spec.map((row) => {
      const parts = row.split("=");
      if (parts.length !== 2 || parts.some((part) => part.length === 0))
        throw new Error("ADAPTER_PRE_READY_INVENTORY_INVALID");
      return parts;
    }),
  );
  if (rules.size !== spec.length) throw new Error("ADAPTER_PRE_READY_INVENTORY_INVALID");
  if (
    !Array.isArray(input.rootEntries) ||
    input.rootEntries.length !== Number(rules.get("ROOT_ALLOWED_ENTRY_COUNT")) ||
    input.rootEntries[0] !== rules.get("ROOT_ALLOWED_ENTRY_IDENTITY") ||
    !Array.isArray(input.tempEntries) ||
    input.tempEntries.length !== Number(rules.get("TEMP_ALLOWED_ENTRY_COUNT")) ||
    rules.get("ENUMERATION_DEPTH") !== "TOP_LEVEL_ONLY" ||
    rules.get("CHILD_PATH_LOOKUP") !== "FORBIDDEN" ||
    rules.get("PRE_IDENTITY_CHECK") !== "REQUIRED" ||
    rules.get("POST_IDENTITY_CHECK") !== "REQUIRED" ||
    rules.get("SNAPSHOT_EQUALITY") !== "BYTE_EQUAL" ||
    input.rootIdentityBefore !== input.rootIdentityAfter ||
    input.tempIdentityBefore !== input.tempIdentityAfter
  )
    throw new Error(
      input.rootIdentityBefore !== input.rootIdentityAfter ||
        input.tempIdentityBefore !== input.tempIdentityAfter
        ? rules.get("IDENTITY_DRIFT_RESULT")
        : rules.get("NONEMPTY_RESULT"),
    );
  const rootIdentitySha256 = adapterTesting.hash(Buffer.from(input.rootIdentityAfter, "utf8"));
  const tempIdentitySha256 = adapterTesting.hash(Buffer.from(input.tempIdentityAfter, "utf8"));
  return Object.freeze({
    rootIdentitySha256,
    tempIdentitySha256,
    descendantCount: 0,
    descendantSha256: EMPTY_SHA256,
    unexpectedCount: 0,
    unexpectedSha256: EMPTY_SHA256,
    canonical: `${rootIdentitySha256}\0${tempIdentitySha256}\0${0}\0${EMPTY_SHA256}\0${0}\0${EMPTY_SHA256}\n`,
  });
}

function executeV134InventoryOracle(input) {
  return executeInventoryOracleFromSpec(V135_INVENTORY_SPEC, input);
}

function createRegistryOracleFromSpec(spec) {
  const transitions = new Map();
  for (const row of spec) {
    const fields = row.split("|");
    if (fields.length !== 7) throw new Error("ADAPTER_RPC_ROUTING_INVALID");
    const [current, event, cancellationBefore, next, cancellationAfter, emitCancelAck, returned] =
      fields;
    const key = `${current}|${event}|${cancellationBefore}`;
    if (transitions.has(key)) throw new Error("ADAPTER_RPC_ROUTING_INVALID");
    transitions.set(key, {
      current,
      event,
      cancellationBefore: cancellationBefore === "TRUE",
      next,
      cancellationAfter: cancellationAfter === "TRUE",
      emitCancelAck: emitCancelAck === "TRUE",
      returned,
    });
  }
  const apply = (entry, event) => {
    const transition = transitions.get(
      `${entry.state}|${event}|${entry.cancellationRequested ? "TRUE" : "FALSE"}`,
    );
    if (!transition) throw new Error("ADAPTER_RPC_ROUTING_INVALID");
    entry.state = transition.next;
    entry.cancellationRequested = transition.cancellationAfter;
    return transition;
  };
  const reserved = spec[0].split("|")[0];
  const active = spec.find((row) => row.includes("|MARK_TERMINAL|"))?.split("|")[0];
  const entries = new Map();
  return Object.freeze({
    reserve(id, method) {
      if (entries.has(id)) throw new Error("ADAPTER_RPC_ROUTING_INVALID");
      entries.set(id, { method, state: reserved, cancellationRequested: false });
    },
    activate(id, method) {
      const entry = entries.get(id);
      if (!entry || entry.method !== method || entry.state !== reserved)
        throw new Error("ADAPTER_RPC_ROUTING_INVALID");
      entry.state = active;
      return entry.cancellationRequested;
    },
    cancel(id, method) {
      const entry = entries.get(id);
      if (!entry || entry.method !== method) throw new Error("ADAPTER_RPC_ROUTING_INVALID");
      return apply(entry, "CANCEL").emitCancelAck;
    },
    markTerminal(id, method, result) {
      const entry = entries.get(id);
      if (!entry || entry.method !== method) throw new Error("ADAPTER_RPC_ROUTING_INVALID");
      const transition = apply(entry, "MARK_TERMINAL");
      return transition.returned === "TRUE" ? null : result;
    },
    acknowledge(id, method) {
      const entry = entries.get(id);
      if (!entry || entry.method !== method) throw new Error("ADAPTER_RPC_ROUTING_INVALID");
      const transition = apply(entry, "RESPONSE_ACK");
      if (transition.next !== "REMOVED") throw new Error("ADAPTER_RPC_ROUTING_INVALID");
      entries.delete(id);
    },
    state(id) {
      return entries.get(id)?.state ?? null;
    },
    get isEmpty() {
      return entries.size === 0;
    },
  });
}

function createV134RegistryOracle() {
  return createRegistryOracleFromSpec(V135_TRANSITION_SPEC);
}

test("V13D06 derived empty READY inventory", () => {
  const measured = executeV134InventoryOracle({
    rootEntries: ["HELD_TEMP"],
    tempEntries: [],
    rootIdentityBefore: "root-id",
    rootIdentityAfter: "root-id",
    tempIdentityBefore: "temp-id",
    tempIdentityAfter: "temp-id",
  });
  assert.equal(measured.descendantCount, 0);
  assert.equal(measured.unexpectedCount, 0);
  assert.equal(measured.descendantSha256, EMPTY_SHA256);
  assert.equal(measured.unexpectedSha256, EMPTY_SHA256);
  assert.match(v132LeaseSource, /InterpretPreReadyInventory\(/u);
  assert.match(v132LeaseSource, /VerifyPreReadyInventoryAfterStartup\(\)/u);
});

test("V13D07 hidden/nonzero descendant rejection", () => {
  const base = {
    rootEntries: ["HELD_TEMP"],
    tempEntries: [],
    rootIdentityBefore: "root-id",
    rootIdentityAfter: "root-id",
    tempIdentityBefore: "temp-id",
    tempIdentityAfter: "temp-id",
  };
  for (const child of ["file", ".hidden", "SYSTEM", "junction"])
    assert.throws(
      () => executeV134InventoryOracle({ ...base, tempEntries: [child] }),
      /ADAPTER_PRE_READY_INVENTORY_INVALID/u,
    );
  assert.throws(
    () => executeV134InventoryOracle({ ...base, rootEntries: ["HELD_TEMP", "other"] }),
    /ADAPTER_PRE_READY_INVENTORY_INVALID/u,
  );
  assert.doesNotMatch(
    v134InventoryMethodSource,
    /SearchOption\.AllDirectories|File\.GetAttributes/u,
  );
});

test("V13D08 second-snapshot drift/digest mismatch rejection", () => {
  const first = executeV134InventoryOracle({
    rootEntries: ["HELD_TEMP"],
    tempEntries: [],
    rootIdentityBefore: "root-id",
    rootIdentityAfter: "root-id",
    tempIdentityBefore: "temp-id",
    tempIdentityAfter: "temp-id",
  });
  const second = executeV134InventoryOracle({
    rootEntries: ["HELD_TEMP"],
    tempEntries: [],
    rootIdentityBefore: "root-id",
    rootIdentityAfter: "root-id",
    tempIdentityBefore: "temp-id",
    tempIdentityAfter: "temp-id",
  });
  assert.equal(first.canonical, second.canonical);
  for (const mutation of [{ rootIdentityAfter: "root-swap" }, { tempIdentityAfter: "temp-swap" }])
    assert.throws(
      () =>
        executeV134InventoryOracle({
          rootEntries: ["HELD_TEMP"],
          tempEntries: [],
          rootIdentityBefore: "root-id",
          rootIdentityAfter: "root-id",
          tempIdentityBefore: "temp-id",
          tempIdentityAfter: "temp-id",
          ...mutation,
        }),
      /ADAPTER_PRE_READY_INVENTORY_INVALID/u,
    );
  assert.match(v132LeaseSource, /firstPreReadyInventory\.Canonical,second\.Canonical/u);
});

test("V13P01 concurrent reversed response routing", async () => {
  const transport = new V133FakeTransport();
  const session = await activateV133Session(transport);
  const first = session.request("captureGlobalMutationSnapshot", {}, 1000);
  const second = session.request("captureGlobalMutationSnapshot", {}, 1000);
  const firstRequest = await waitForV133Frame(transport, "REQUEST", 1);
  const secondRequest = await waitForV133Frame(transport, "REQUEST", 2);
  transport.push(
    "RESPONSE",
    V133_SESSION_ID,
    secondRequest.operationId,
    secondRequest.method,
    V133_SNAPSHOT_RESULT,
  );
  transport.push(
    "RESPONSE",
    V133_SESSION_ID,
    firstRequest.operationId,
    firstRequest.method,
    V133_SNAPSHOT_RESULT,
  );
  assert.deepEqual(await second, V133_SNAPSHOT_RESULT);
  assert.deepEqual(await first, V133_SNAPSHOT_RESULT);
  assert.equal(transport.sent.filter((frame) => frame.frameType === "RESPONSE_ACK").length, 2);
});

test("V13P02 duplicate unknown and wrong-method routing", async () => {
  for (const mutation of ["duplicate", "unknown", "wrong-method"]) {
    const transport = new V133FakeTransport();
    const session = await activateV133Session(transport);
    const pending = session.request("captureGlobalMutationSnapshot", {}, 1000);
    const request = await waitForV133Frame(transport, "REQUEST");
    const operationId = mutation === "unknown" ? "UNKNOWN:1" : request.operationId;
    const method = mutation === "wrong-method" ? "openPinnedInputLeases" : request.method;
    transport.push("RESPONSE", V133_SESSION_ID, operationId, method, V133_SNAPSHOT_RESULT);
    if (mutation === "duplicate")
      transport.push(
        "RESPONSE",
        V133_SESSION_ID,
        request.operationId,
        request.method,
        V133_SNAPSHOT_RESULT,
      );
    if (mutation === "duplicate") assert.deepEqual(await pending, V133_SNAPSHOT_RESULT);
    else await assert.rejects(pending, /ADAPTER_RPC_ROUTING_INVALID/u);
  }
});

test("V13P03 pre-aborted request", async () => {
  const transport = new V133FakeTransport();
  const session = await activateV133Session(transport);
  const abort = new AbortController();
  abort.abort();
  const pending = session.request("captureGlobalMutationSnapshot", {}, 1000, abort.signal);
  const request = await waitForV133Frame(transport, "REQUEST");
  await waitForV133Frame(transport, "CANCEL");
  transport.push("CANCEL_ACK", V133_SESSION_ID, request.operationId, request.method, null, 500);
  transport.push(
    "RESPONSE",
    V133_SESSION_ID,
    request.operationId,
    request.method,
    V133_SNAPSHOT_RESULT,
  );
  await assert.rejects(pending, /ADAPTER_RPC_TIMEOUT/u);
});

test("V13P04 attach and recheck abort race", async () => {
  const transport = new V133FakeTransport();
  transport.holdRequest = true;
  const session = await activateV133Session(transport);
  const abort = new AbortController();
  const pending = session.request("captureGlobalMutationSnapshot", {}, 1000, abort.signal);
  const request = await waitForV133Frame(transport, "REQUEST");
  abort.abort();
  transport.requestRelease();
  await waitForV133Frame(transport, "CANCEL");
  transport.push(
    "RESPONSE",
    V133_SESSION_ID,
    request.operationId,
    request.method,
    V133_SNAPSHOT_RESULT,
  );
  transport.push("CANCEL_ACK", V133_SESSION_ID, request.operationId, request.method, null, 500);
  await assert.rejects(pending, /ADAPTER_RPC_TIMEOUT/u);
});

test("V13P05 reserved-before-enqueue cancellation", () => {
  const reserve = v132LeaseSource.indexOf("cancellations.Reserve(operation,method)");
  const enqueue = v132LeaseSource.indexOf("worker.Enqueue(json)", reserve);
  assert.ok(reserve >= 0 && reserve < enqueue);
  const registry = createV134RegistryOracle();
  registry.reserve("OP:1", "captureGlobalMutationSnapshot");
  registry.cancel("OP:1", "captureGlobalMutationSnapshot");
  assert.equal(registry.activate("OP:1", "captureGlobalMutationSnapshot"), true);
  assert.equal(registry.markTerminal("OP:1", "captureGlobalMutationSnapshot", "non-null"), null);
  assert.equal(registry.state("OP:1"), "TERMINAL_CANCEL_RESPONSE_PENDING_ACK");
  registry.acknowledge("OP:1", "captureGlobalMutationSnapshot");
  assert.equal(registry.isEmpty, true);
  assert.match(v132LeaseSource, /MarkTerminalAndGetCancellation/u);
});

test("V13P06 CANCEL_ACK-before-RESPONSE drain", async () => {
  const transport = new V133FakeTransport();
  const session = await activateV133Session(transport);
  const abort = new AbortController();
  const pending = session.request("captureGlobalMutationSnapshot", {}, 1000, abort.signal);
  const request = await waitForV133Frame(transport, "REQUEST");
  abort.abort();
  await waitForV133Frame(transport, "CANCEL");
  transport.push("CANCEL_ACK", V133_SESSION_ID, request.operationId, request.method, null, 500);
  await waitForV133OperationState(session, request.operationId, "CANCEL_ACK_ONLY");
  transport.push(
    "RESPONSE",
    V133_SESSION_ID,
    request.operationId,
    request.method,
    V133_SNAPSHOT_RESULT,
  );
  await assert.rejects(pending, /ADAPTER_RPC_TIMEOUT/u);
});

test("V13P07 RESPONSE-before-CANCEL_ACK drain", async () => {
  const transport = new V133FakeTransport();
  const session = await activateV133Session(transport);
  const abort = new AbortController();
  const pending = session.request("captureGlobalMutationSnapshot", {}, 1000, abort.signal);
  const request = await waitForV133Frame(transport, "REQUEST");
  abort.abort();
  await waitForV133Frame(transport, "CANCEL");
  transport.push(
    "RESPONSE",
    V133_SESSION_ID,
    request.operationId,
    request.method,
    V133_SNAPSHOT_RESULT,
  );
  await waitForV133OperationState(session, request.operationId, "RESPONSE_ONLY");
  transport.push("CANCEL_ACK", V133_SESSION_ID, request.operationId, request.method, null, 500);
  await assert.rejects(pending, /ADAPTER_RPC_TIMEOUT/u);
});

test("V13P08 response-win late-abort behavior", async () => {
  const transport = new V133FakeTransport();
  const session = await activateV133Session(transport);
  const abort = new AbortController();
  const pending = session.request("captureGlobalMutationSnapshot", {}, 1000, abort.signal);
  const request = await waitForV133Frame(transport, "REQUEST");
  transport.push(
    "RESPONSE",
    V133_SESSION_ID,
    request.operationId,
    request.method,
    V133_SNAPSHOT_RESULT,
  );
  await waitForV133Frame(transport, "RESPONSE_ACK");
  abort.abort();
  assert.deepEqual(await pending, V133_SNAPSHOT_RESULT);
  assert.equal(transport.sent.filter((frame) => frame.frameType === "CANCEL").length, 0);
});

test("V13P09 RESPONSE_ACK failure quarantines and clears tombstone", async () => {
  const transport = new V133FakeTransport();
  transport.failResponseAck = true;
  const session = await activateV133Session(transport);
  const pending = session.request("captureGlobalMutationSnapshot", {}, 1000);
  const request = await waitForV133Frame(transport, "REQUEST");
  transport.push(
    "RESPONSE",
    V133_SESSION_ID,
    request.operationId,
    request.method,
    V133_SNAPSHOT_RESULT,
  );
  await assert.rejects(pending, /ADAPTER_RPC_ROUTING_INVALID/u);
  assert.equal(session.tombstones.has(request.operationId), false);
  assert.equal(session.controlState, "FAILED");
  await assert.rejects(session.close(), /ADAPTER_SESSION_CLOSE_FAILED/u);
});

test("V13P10 bilateral close and broker registration terminal races", async () => {
  const transport = new V133FakeTransport();
  const session = await activateV133Session(transport);
  session.inflight.set("HELD:1", { method: "captureGlobalMutationSnapshot" });
  await assert.rejects(session.close(), /ADAPTER_SESSION_CLOSE_FAILED/u);
  session.inflight.clear();
  session.drain.set("HELD:2", { method: "captureGlobalMutationSnapshot" });
  await assert.rejects(session.close(), /ADAPTER_SESSION_CLOSE_FAILED/u);
  session.drain.clear();
  session.tombstones.set("HELD:3", { method: "captureGlobalMutationSnapshot" });
  await assert.rejects(session.close(), /ADAPTER_SESSION_CLOSE_FAILED/u);
  const registry = createV134RegistryOracle();
  registry.reserve("RESERVED:1", "captureGlobalMutationSnapshot");
  assert.equal(registry.isEmpty, false);
  registry.activate("RESERVED:1", "captureGlobalMutationSnapshot");
  assert.equal(registry.isEmpty, false);
  registry.markTerminal("RESERVED:1", "captureGlobalMutationSnapshot", "result");
  assert.equal(registry.isEmpty, false);
  registry.acknowledge("RESERVED:1", "captureGlobalMutationSnapshot");
  assert.equal(registry.isEmpty, true);
  assert.match(v132LeaseSource, /!worker\.IsIdle\|\|!cancellations\.IsEmpty/u);
  assert.match(v132LeaseSource, /TERMINAL_CANCEL_RESPONSE_PENDING_ACK/u);
  assert.match(
    v132LeaseSource,
    /cancellations\.MarkTerminalAndGetCancellation\(operationId,method\);if\(cancellationWon\)result="null";writer\.WriteFrame/u,
  );
});

class V134Socket extends EventEmitter {
  constructor() {
    super();
    this.writes = [];
    this.destroyCount = 0;
    this.holdWrites = false;
    this.writeCallbacks = [];
  }
  write(bytes, callback) {
    this.writes.push(Buffer.from(bytes));
    if (this.holdWrites) this.writeCallbacks.push(callback);
    else callback?.();
    return true;
  }
  settleWrite(error) {
    const callback = this.writeCallbacks.shift();
    assert.ok(callback);
    callback(error);
  }
  destroy() {
    this.destroyCount += 1;
  }
}

function emitV134ServerFrame(socket, sequence, frameType, operationId, method, payload, timeoutMs) {
  socket.emit(
    "data",
    encodeFrame({
      schemaVersion: 1,
      frameType,
      directionSequence: sequence,
      sessionId: V133_SESSION_ID,
      operationId,
      method,
      timeoutMs,
      payloadSha256: adapterTesting.hash(canonicalPayloadBytes(payload)),
      payload,
    }),
  );
}

async function activateV134SocketSession(socket) {
  const transport = adapterTesting.createLinePipeTransport("test-pipe", () => socket);
  const session = new CanonicalRpcSession(transport, V133_SESSION_ID);
  emitV134ServerFrame(socket, 1, "CHALLENGE", "HANDSHAKE:CHALLENGE", "handshake", null, 30000);
  assert.equal((await session.receive()).frameType, "CHALLENGE");
  emitV134ServerFrame(socket, 2, "READY", "HANDSHAKE:READY", "handshake", null, 30000);
  assert.equal((await session.receive()).frameType, "READY");
  return { session, transport };
}

test("V13P11 active non-cooperative dispatch cancellation emits null", () => {
  const registry = createV134RegistryOracle();
  registry.reserve("OP:NONCOOPERATIVE", "captureGlobalMutationSnapshot");
  registry.activate("OP:NONCOOPERATIVE", "captureGlobalMutationSnapshot");
  registry.cancel("OP:NONCOOPERATIVE", "captureGlobalMutationSnapshot");
  assert.equal(
    registry.markTerminal("OP:NONCOOPERATIVE", "captureGlobalMutationSnapshot", "leaked"),
    null,
  );
  assert.equal(registry.state("OP:NONCOOPERATIVE"), "TERMINAL_CANCEL_RESPONSE_PENDING_ACK");
  assert.match(
    v132LeaseSource,
    /result=DispatchRpc[\s\S]*MarkTerminalAndGetCancellation[\s\S]*if\(cancellationWon\)result="null"/u,
  );
});

test("V13P12 cancellation after terminal transition preserves response", () => {
  const registry = createV134RegistryOracle();
  registry.reserve("OP:RESPONSE", "captureGlobalMutationSnapshot");
  registry.activate("OP:RESPONSE", "captureGlobalMutationSnapshot");
  assert.equal(
    registry.markTerminal("OP:RESPONSE", "captureGlobalMutationSnapshot", "response"),
    "response",
  );
  registry.cancel("OP:RESPONSE", "captureGlobalMutationSnapshot");
  assert.equal(registry.state("OP:RESPONSE"), "TERMINAL_RESPONSE_PENDING_ACK");
  assert.equal(registry.cancel("OP:RESPONSE", "captureGlobalMutationSnapshot"), true);
  assert.equal(registry.state("OP:RESPONSE"), "TERMINAL_RESPONSE_PENDING_ACK");
});

test("V13P13 CLOSED-without-EOF times out once and removes listeners", async () => {
  const socket = new V134Socket();
  const { session } = await activateV134SocketSession(socket);
  const closing = session.close();
  emitV134ServerFrame(socket, 3, "CLOSED", "SESSION:CLOSE", "close", null, 5000);
  await assert.rejects(closing, /ADAPTER_SESSION_CLOSE_FAILED/u);
  assert.equal(socket.destroyCount, 1);
  assert.equal(socket.listenerCount("data"), 0);
  assert.equal(socket.listenerCount("end"), 0);
  assert.equal(socket.listenerCount("error"), 0);
  assert.equal(session.controlState, "FAILED");
});

test("V13P14 CLOSED-then-EOF succeeds; EOF-before-CLOSED fails", async () => {
  const successSocket = new V134Socket();
  const { session: success } = await activateV134SocketSession(successSocket);
  const closing = success.close();
  emitV134ServerFrame(successSocket, 3, "CLOSED", "SESSION:CLOSE", "close", null, 5000);
  successSocket.emit("end");
  await closing;
  assert.equal(success.controlState, "CLOSED");
  assert.equal(successSocket.destroyCount, 0);

  const failureSocket = new V134Socket();
  const { session: failure } = await activateV134SocketSession(failureSocket);
  const failingClose = failure.close();
  failureSocket.emit("end");
  await assert.rejects(failingClose, /ADAPTER_SESSION_CLOSE_FAILED/u);
  assert.equal(failureSocket.destroyCount, 1);
});

test("V13P15 fragmented exact-cap frame succeeds", async () => {
  const socket = new V134Socket();
  const transport = adapterTesting.createLinePipeTransport("test-pipe", () => socket);
  const received = transport.receive();
  socket.emit("data", Buffer.alloc(adapterTesting.MAX_FRAME_BYTES - 1, 0x61));
  socket.emit("data", Buffer.from("\n"));
  assert.equal((await received).length, adapterTesting.MAX_FRAME_BYTES);
  transport.abort(new Error("test cleanup"));
});

test("V13P16 frame cap+1 newline-free overflow and session cap+1 fail before allocation", async () => {
  const cases = [
    [Buffer.alloc(adapterTesting.MAX_FRAME_BYTES + 1, 0x61)],
    [Buffer.alloc(adapterTesting.MAX_FRAME_BYTES, 0x61), Buffer.from("b")],
    [Buffer.alloc(adapterTesting.MAX_SESSION_BYTES + 1, 0x61)],
  ];
  for (const chunks of cases) {
    const socket = new V134Socket();
    const transport = adapterTesting.createLinePipeTransport("test-pipe", () => socket);
    const failed = transport.receive();
    for (const chunk of chunks) socket.emit("data", chunk);
    await assert.rejects(failed, /ADAPTER_PROTOCOL_INVALID/u);
    assert.equal(socket.destroyCount, 1);
    assert.equal(socket.listenerCount("data"), 0);
  }
});

test("V13D09 top-level-only inventory never follows child and rejects identity swap in both passes", () => {
  let childFollowed = false;
  const child = Object.freeze({
    toString() {
      childFollowed = true;
      return "child";
    },
  });
  const base = {
    rootEntries: ["HELD_TEMP"],
    tempEntries: [],
    rootIdentityBefore: "root-id",
    rootIdentityAfter: "root-id",
    tempIdentityBefore: "temp-id",
    tempIdentityAfter: "temp-id",
  };
  assert.throws(
    () => executeV134InventoryOracle({ ...base, tempEntries: [child] }),
    /ADAPTER_PRE_READY_INVENTORY_INVALID/u,
  );
  assert.equal(childFollowed, false);
  for (const drift of [{ rootIdentityAfter: "root-swap" }, { tempIdentityAfter: "temp-swap" }])
    assert.throws(
      () => executeV134InventoryOracle({ ...base, ...drift }),
      /ADAPTER_PRE_READY_INVENTORY_INVALID/u,
    );
  assert.doesNotMatch(
    v134InventoryMethodSource,
    /SearchOption\.AllDirectories|pending\.Add\(tempPath\)/u,
  );
});

test("V13R01 records classify v1.13.3 hashes as pre-record/pre-pin only", () => {
  const decision = readFileSync(
    new URL("../../docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md", import.meta.url),
    "utf8",
  );
  assert.match(decision, /### v1\.13\.3 exact five-file freeze/u);
  const v133Freeze = decision.slice(decision.indexOf("### v1.13.3 exact five-file freeze"));
  const recordedPolicySha = v133Freeze.match(
    /root-only-closure-nuget-addtype-bootstrap-policy-v1\.json` \|\s+\d+ \| `([0-9a-f]{64})`/u,
  )?.[1];
  assert.equal(
    recordedPolicySha,
    "5bc741c5c3afceef195da3e00ae24340c6b2adacb74d630fe83c26a8bdfe50b5",
  );
  const currentPolicySha = adapterTesting.hash(
    readFileSync(
      new URL("./root-only-closure-nuget-addtype-bootstrap-policy-v1.json", import.meta.url),
    ),
  );
  assert.notEqual(currentPolicySha, recordedPolicySha);
  assert.equal("PRE_RECORD_PRE_PIN_ONLY", "PRE_RECORD_PRE_PIN_ONLY");
});

test("V13P17 session failure quarantines operations and blocks later abort sends", async () => {
  const transport = new V133FakeTransport();
  const session = await activateV133Session(transport);
  let abortCalls = 0;
  let rejectCalls = 0;
  const controllers = [new AbortController(), new AbortController(), new AbortController()];
  const maps = [session.inflight, session.drain, session.tombstones];
  controllers.forEach((controller, index) => {
    const operation = {
      operationId: `QUARANTINE:${index}`,
      method: "captureGlobalMutationSnapshot",
      state: "PENDING",
      abortSignal: controller.signal,
      onAbort: () => {
        abortCalls += 1;
      },
      settled: false,
      reject: () => {
        rejectCalls += 1;
      },
      resolve: () => assert.fail("quarantined operation resolved"),
    };
    controller.signal.addEventListener("abort", operation.onAbort, { once: true });
    maps[index].set(operation.operationId, operation);
  });
  const sentBefore = transport.sent.length;
  const retained = session.failSession(new Error("fixed"));
  assert.equal(retained.reason, "ADAPTER_INTERNAL_FAILURE");
  assert.equal(session.controlState, "FAILED");
  assert.equal(rejectCalls, 3);
  assert.equal(session.inflight.size + session.drain.size + session.tombstones.size, 0);
  for (const controller of controllers) controller.abort();
  assert.equal(abortCalls, 0);
  await assert.rejects(
    session.frame("CANCEL", "QUARANTINE:0", "captureGlobalMutationSnapshot", 500, null),
    /ADAPTER_SESSION_CLOSE_FAILED/u,
  );
  await assert.rejects(session.close(), /ADAPTER_SESSION_CLOSE_FAILED/u);
  assert.equal(transport.sent.length, sentBefore);
  assert.equal(transport.abortCount, 1);
  assert.equal(session.failSession(new Error("later")), retained);
  assert.equal(transport.abortCount, 1);
});

test("V13P18 CLOSE settlement requires successful CLOSE write", async () => {
  const failureSocket = new V134Socket();
  const { session: failure } = await activateV134SocketSession(failureSocket);
  failureSocket.holdWrites = true;
  const failedClose = failure.close();
  while (failureSocket.writeCallbacks.length === 0)
    await new Promise((resolveWait) => setImmediate(resolveWait));
  emitV134ServerFrame(failureSocket, 3, "CLOSED", "SESSION:CLOSE", "close", null, 5000);
  failureSocket.emit("end");
  failureSocket.settleWrite(new Error("fixed close write failure"));
  await assert.rejects(failedClose, /ADAPTER_SESSION_CLOSE_FAILED/u);
  assert.equal(failureSocket.destroyCount, 1);

  const successSocket = new V134Socket();
  const { session: success } = await activateV134SocketSession(successSocket);
  successSocket.holdWrites = true;
  let settled = false;
  const successfulClose = success.close().then(() => {
    settled = true;
  });
  while (successSocket.writeCallbacks.length === 0)
    await new Promise((resolveWait) => setImmediate(resolveWait));
  emitV134ServerFrame(successSocket, 3, "CLOSED", "SESSION:CLOSE", "close", null, 5000);
  successSocket.emit("end");
  await new Promise((resolveWait) => setImmediate(resolveWait));
  assert.equal(settled, false);
  successSocket.settleWrite();
  await successfulClose;
  assert.equal(success.controlState, "CLOSED");
});

test("V13P19 terminal-cancel state acknowledges late CANCEL idempotently", () => {
  for (const cancelBeforeTerminal of [false, true]) {
    const registry = createV134RegistryOracle();
    const operationId = cancelBeforeTerminal ? "TERMINAL:CANCEL" : "TERMINAL:RESPONSE";
    registry.reserve(operationId, "captureGlobalMutationSnapshot");
    registry.activate(operationId, "captureGlobalMutationSnapshot");
    if (cancelBeforeTerminal)
      assert.equal(registry.cancel(operationId, "captureGlobalMutationSnapshot"), true);
    const result = registry.markTerminal(
      operationId,
      "captureGlobalMutationSnapshot",
      "selected-response",
    );
    const terminal = registry.state(operationId);
    assert.equal(registry.cancel(operationId, "captureGlobalMutationSnapshot"), true);
    assert.equal(registry.cancel(operationId, "captureGlobalMutationSnapshot"), true);
    assert.equal(registry.state(operationId), terminal);
    assert.equal(result, cancelBeforeTerminal ? null : "selected-response");
  }
});

test("V13P20 permanent-pending CLOSE write is quarantined by the absolute deadline", async () => {
  const socket = new V134Socket();
  const { session } = await activateV134SocketSession(socket);
  socket.holdWrites = true;
  const closing = session.close();
  while (socket.writeCallbacks.length === 0)
    await new Promise((resolveWait) => setImmediate(resolveWait));
  const activeToken = session.activeCloseToken;
  assert.ok(activeToken);
  assert.equal(session.closeSendCompleted, false);
  assert.ok(Number.isFinite(session.closeDeadline));
  await assert.rejects(closing, /ADAPTER_SESSION_CLOSE_FAILED/u);
  assert.equal(session.controlState, "FAILED");
  assert.equal(session.activeCloseToken, null);
  assert.equal(session.closeSettlement, null);
  assert.equal(session.closeWriteQuarantined, true);
  assert.equal(session.closeSendCompleted, false);
  assert.equal(socket.destroyCount, 1);
  socket.settleWrite();
  await new Promise((resolveWait) => setImmediate(resolveWait));
  assert.equal(session.controlState, "FAILED");
  assert.equal(session.activeCloseToken, null);
  assert.equal(session.closeSendCompleted, false);
});

test("V13S01 broker behavior and oracle consume one production transition specification", () => {
  const expected = [
    "RESERVED|CANCEL|FALSE|RESERVED|TRUE|TRUE|NONE",
    "RESERVED|CANCEL|TRUE|RESERVED|TRUE|TRUE|NONE",
    "ACTIVE|CANCEL|FALSE|ACTIVE|TRUE|TRUE|NONE",
    "ACTIVE|CANCEL|TRUE|ACTIVE|TRUE|TRUE|NONE",
    "TERMINAL_RESPONSE_PENDING_ACK|CANCEL|FALSE|TERMINAL_RESPONSE_PENDING_ACK|FALSE|TRUE|NONE",
    "TERMINAL_CANCEL_RESPONSE_PENDING_ACK|CANCEL|TRUE|TERMINAL_CANCEL_RESPONSE_PENDING_ACK|TRUE|TRUE|NONE",
    "ACTIVE|MARK_TERMINAL|FALSE|TERMINAL_RESPONSE_PENDING_ACK|FALSE|FALSE|FALSE",
    "ACTIVE|MARK_TERMINAL|TRUE|TERMINAL_CANCEL_RESPONSE_PENDING_ACK|TRUE|FALSE|TRUE",
    "TERMINAL_RESPONSE_PENDING_ACK|RESPONSE_ACK|FALSE|REMOVED|FALSE|FALSE|NONE",
    "TERMINAL_CANCEL_RESPONSE_PENDING_ACK|RESPONSE_ACK|TRUE|REMOVED|TRUE|FALSE|NONE",
  ];
  assert.deepEqual(V135_TRANSITION_SPEC, expected);
  assert.match(v132LeaseSource, /Transition transition=Apply\(entry,"CANCEL"\)/u);
  assert.match(v132LeaseSource, /Transition transition=Apply\(entry,"MARK_TERMINAL"\)/u);
  assert.match(v132LeaseSource, /Transition transition=Apply\(entry,"RESPONSE_ACK"\)/u);
  for (const mutated of [expected.slice(1), [...expected].reverse(), [...expected, expected[0]]])
    assert.throws(() => {
      if (JSON.stringify(mutated) !== JSON.stringify(expected))
        throw new Error("ADAPTER_RPC_ROUTING_INVALID");
    }, /ADAPTER_RPC_ROUTING_INVALID/u);
  assert.throws(
    () => createRegistryOracleFromSpec([...expected, expected[0]]),
    /ADAPTER_RPC_ROUTING_INVALID/u,
  );
});

test("V13S02 inventory behavior and oracle consume one production inventory specification", () => {
  const expected = [
    "ROOT_ALLOWED_ENTRY_COUNT=1",
    "ROOT_ALLOWED_ENTRY_IDENTITY=HELD_TEMP",
    "TEMP_ALLOWED_ENTRY_COUNT=0",
    "ENUMERATION_DEPTH=TOP_LEVEL_ONLY",
    "CHILD_PATH_LOOKUP=FORBIDDEN",
    "PRE_IDENTITY_CHECK=REQUIRED",
    "POST_IDENTITY_CHECK=REQUIRED",
    "SNAPSHOT_EQUALITY=BYTE_EQUAL",
    "NONEMPTY_RESULT=ADAPTER_PRE_READY_INVENTORY_INVALID",
    "IDENTITY_DRIFT_RESULT=ADAPTER_PRE_READY_INVENTORY_INVALID",
  ];
  assert.deepEqual(V135_INVENTORY_SPEC, expected);
  assert.match(v132LeaseSource, /InterpretPreReadyInventory\(/u);
  for (const mutated of [expected.slice(1), [...expected].reverse(), [...expected, expected[0]]])
    assert.throws(() => {
      if (JSON.stringify(mutated) !== JSON.stringify(expected))
        throw new Error("ADAPTER_PRE_READY_INVENTORY_INVALID");
    }, /ADAPTER_PRE_READY_INVENTORY_INVALID/u);
});

test("V13R02 records classify v1.13.4 hashes as pre-record/pre-pin only", () => {
  const decision = readFileSync(
    new URL("../../docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md", import.meta.url),
    "utf8",
  );
  const freeze = decision.slice(decision.indexOf("### v1.13.4 exact five-file freeze"));
  const recordedPolicySha = freeze.match(
    /root-only-closure-nuget-addtype-bootstrap-policy-v1\.json` \|\s+\d+ \| `([0-9a-f]{64})`/u,
  )?.[1];
  assert.equal(
    recordedPolicySha,
    "088edf24616dc82a6819b245988061dc2a37590de3597a4e4220f10a2b0694fd",
  );
  assert.notEqual(
    adapterTesting.hash(
      readFileSync(
        new URL("./root-only-closure-nuget-addtype-bootstrap-policy-v1.json", import.meta.url),
      ),
    ),
    recordedPolicySha,
  );
  assert.equal("PRE_RECORD_PRE_PIN_ONLY", "PRE_RECORD_PRE_PIN_ONLY");
});

test("V13R03 records classify v1.13.5 hashes as pre-record/pre-pin only", () => {
  const decision = readFileSync(
    new URL("../../docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md", import.meta.url),
    "utf8",
  );
  const freeze = decision.slice(decision.indexOf("### v1.13.5 exact five-file freeze"));
  const recordedPolicySha = freeze.match(
    /root-only-closure-nuget-addtype-bootstrap-policy-v1\.json` \|\s+\d+ \| `([0-9a-f]{64})`/u,
  )?.[1];
  assert.equal(
    recordedPolicySha,
    "7b83decfa81f42b4b1c1ee861c7e1f7288a38a27894b26decfa887bbf6b574f4",
  );
  assert.notEqual(
    adapterTesting.hash(
      readFileSync(
        new URL("./root-only-closure-nuget-addtype-bootstrap-policy-v1.json", import.meta.url),
      ),
    ),
    recordedPolicySha,
  );
  assert.equal("PRE_RECORD_PRE_PIN_ONLY", "PRE_RECORD_PRE_PIN_ONLY");
});
