import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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

const authority = readRoslynVerifierDownloadAuthority();
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
