import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PREFLIGHT_SCHEMAS,
  licenseNoticeManifestDigest,
  validateAttempt002ToolManifest,
  validatePreflightDiscard,
  validatePreflightResult,
  validatePreflightSmokeResult,
  validatePreflightToolManifest,
} from "./preflight-contracts.mjs";
import {
  APPROVED_PREFLIGHT_SOURCE_COMMIT,
  createDiscardedPreflightPlan,
  discardedPreflightPlanDigest,
} from "./preflight-plan.mjs";

const sha = "a".repeat(64);
const infrastructurePlan = readFileSync(
  new URL("../../docs/2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md", import.meta.url),
  "utf8",
);

function toolManifest() {
  const sourceUrls = {
    chrome_for_testing:
      "https://storage.googleapis.com/chrome-for-testing-public/156.0.8078.80/win64/chrome-win64.zip",
    chromedriver:
      "https://storage.googleapis.com/chrome-for-testing-public/156.0.8078.80/win64/chromedriver-win64.zip",
    nvda: "https://download.nvaccess.org/releases/2026.3/nvda_2026.3.exe",
    tesseract: "https://github.com/tesseract-ocr/tesseract/archive/refs/tags/5.5.4.zip",
    tessdata_fast:
      "https://github.com/tesseract-ocr/tessdata_fast/archive/65727574dfcd264acbb0c3e07860e4e9e9b22185.zip",
  };
  const revisions = {
    chrome_for_testing: "1706539",
    chromedriver: "1706539",
    nvda: "7eb1738dd1556775145453fdd8b6b7ca6b397693",
    tesseract: "7e548e6eff172f38f97664afe7f7ce40db36c8d6",
    tessdata_fast: "65727574dfcd264acbb0c3e07860e4e9e9b22185",
  };
  return {
    schema: PREFLIGHT_SCHEMAS.toolManifest,
    creditable: false,
    evidenceStatus: "NON_EVIDENCE",
    sourceCommit: APPROVED_PREFLIGHT_SOURCE_COMMIT,
    tools: [
      ["chrome_for_testing", "156.0.8078.80", "LOCALLY_CALCULATED", null],
      ["chromedriver", "156.0.8078.80", "LOCALLY_CALCULATED", null],
      [
        "nvda",
        "2026.3",
        "UPSTREAM",
        "a8a87cb823da0c62cfbae4a444ae5ae238d54dc82ad6d46d3fdb3fef082799b2",
      ],
      ["tesseract", "5.5.4", "LOCALLY_CALCULATED", null],
      ["tessdata_fast", "4.1.0", "LOCALLY_CALCULATED", null],
    ].map(([toolId, version, digestAuthority, expectedSha256]) => ({
      toolId,
      version,
      revision: revisions[toolId],
      sourceUrl: sourceUrls[toolId],
      digestAuthority,
      expectedSha256,
      observedSha256: null,
      observedMd5Base64: null,
      observedCrc32cBase64: null,
      observedByteLength: null,
      archiveStatus: "UNATTEMPTED",
      provenance: {
        status: "UNATTEMPTED",
        method: "UNATTEMPTED",
        officialIndexRecord: null,
        authoritativeObjectMetadata: null,
        safeArchiveInventorySha256: null,
        archiveInventoryCount: null,
        archiveExpandedBytes: null,
        archivePathStatus: "UNATTEMPTED",
        archiveReparseStatus: "UNATTEMPTED",
        malwareScan: {
          engine: null,
          engineVersion: null,
          definitionsVersion: null,
          scannedUtc: null,
          result: "UNATTEMPTED",
        },
        versionStatus: "UNATTEMPTED",
        executableAllowlist: [],
        deniedExecutables: [],
      },
      signatureMethod: "UNATTEMPTED",
      signatureStatus: "UNATTEMPTED",
      signatureChainStatus: "UNATTEMPTED",
      signatureVerifiedUtc: null,
      signatureObservedSha256: null,
      signerSubject: null,
      signerThumbprint: null,
      licenseNotices: [],
      licenseNoticeDigestMethod: "NOT_APPLICABLE",
      licenseNoticeSha256: null,
      launchStatus: "NOT_LAUNCHED",
    })),
  };
}

function makeChromeEligible(manifest, toolIndex) {
  const tool = manifest.tools[toolIndex];
  tool.observedSha256 = "d".repeat(64);
  tool.observedMd5Base64 = "YWJjZA==";
  tool.observedCrc32cBase64 = "ZWZnaA==";
  tool.observedByteLength = "1234";
  tool.archiveStatus = "READABLE";
  tool.signatureMethod = "NOT_APPLICABLE";
  tool.signatureStatus = "NOT_SIGNED";
  tool.signatureChainStatus = "NOT_APPLICABLE";
  tool.launchStatus = "ELIGIBLE";
  tool.licenseNotices = [
    { path: "LICENSE", bytes: "1536", sha256: "a".repeat(64) },
    { path: "THIRD_PARTY_NOTICES", bytes: "4096", sha256: "b".repeat(64) },
  ];
  tool.licenseNoticeDigestMethod = "CANONICAL_JSON_ORDERED_PATH_BYTES_SHA256_V1";
  tool.licenseNoticeSha256 = licenseNoticeManifestDigest(tool.licenseNotices);
  tool.provenance = {
    status: "VERIFIED",
    method: "GCS_OBJECT_AND_LOCAL_ARCHIVE_V1",
    officialIndexRecord: {
      sourceUrl: "https://googlechromelabs.github.io/chrome-for-testing/156.0.8078.80.json",
      responseBytes: "2582",
      responseSha256: "c88d93108425da68329f4774e059d3c2aaef716f735e07c2cde14341282d7693",
      recordSha256: "c88d93108425da68329f4774e059d3c2aaef716f735e07c2cde14341282d7693",
      version: "156.0.8078.80",
      revision: "1706539",
      chromeWin64Url:
        "https://storage.googleapis.com/chrome-for-testing-public/156.0.8078.80/win64/chrome-win64.zip",
      chromedriverWin64Url:
        "https://storage.googleapis.com/chrome-for-testing-public/156.0.8078.80/win64/chromedriver-win64.zip",
    },
    authoritativeObjectMetadata: {
      generation: "1760000000000000",
      metageneration: "1",
      bytes: "1234",
      md5Base64: "YWJjZA==",
      crc32cBase64: "ZWZnaA==",
      etag: "CM+o993m3ZcDEAE=",
      createdUtc: "2026-10-28T22:52:43.155Z",
      updatedUtc: "2026-10-28T22:52:43.155Z",
    },
    safeArchiveInventorySha256: "e".repeat(64),
    archiveInventoryCount: "3",
    archiveExpandedBytes: "4096",
    archivePathStatus: "PASS",
    archiveReparseStatus: "PASS",
    malwareScan: {
      engine: "Microsoft Defender",
      engineVersion: "1.1.26100.4",
      definitionsVersion: "1.463.79.0",
      scannedUtc: "2026-11-02T01:08:24.425Z",
      result: "PASS",
    },
    versionStatus: "PASS",
    executableAllowlist: [
      {
        path: toolIndex === 0 ? "chrome-win64/chrome.exe" : "chromedriver-win64/chromedriver.exe",
        version: "156.0.8078.80",
        sha256: "f".repeat(64),
        signatureStatus: "NOT_SIGNED",
        peVersionMethod: "VERSIONINFO_FILE_AND_PRODUCT_VERSION_V1",
        peVersionStatus: "PASS",
      },
    ],
    deniedExecutables:
      toolIndex === 0
        ? [
            "chrome_proxy.exe",
            "chrome_pwa_launcher.exe",
            "elevated_tracing_service.exe",
            "elevation_service.exe",
            "notification_helper.exe",
            "setup.exe",
          ].map((filename, index) => ({
            path: `chrome-win64/${filename}`,
            version: "156.0.8078.80",
            sha256: String(index + 1).repeat(64),
            signatureStatus: "NOT_SIGNED",
            peVersionMethod: "VERSIONINFO_FILE_AND_PRODUCT_VERSION_V1",
            peVersionStatus: "PASS",
          }))
        : [],
  };
  return tool;
}

function makeNvdaEligible(manifest) {
  const tool = manifest.tools[2];
  tool.observedSha256 = tool.expectedSha256;
  tool.observedByteLength = "69352040";
  tool.archiveStatus = "NOT_ARCHIVE";
  tool.signatureMethod = "POWERSHELL_GET_AUTHENTICODE_SIGNATURE_V1";
  tool.signatureStatus = "VERIFIED";
  tool.signatureChainStatus = "TRUSTED_VALID";
  tool.signatureVerifiedUtc = "2026-11-03T01:02:03.004Z";
  tool.signatureObservedSha256 = tool.observedSha256;
  tool.signerSubject =
    "CN=NV Access Limited, O=NV Access Limited, L=Camp Mountain, S=Queensland, C=AU";
  tool.signerThumbprint = "4E9A772A99C1A3B713766DAC4B3545236CC2AE72";
  tool.launchStatus = "ELIGIBLE";
  tool.provenance = {
    status: "VERIFIED",
    method: "UPSTREAM_SHA256_AND_AUTHENTICODE_V1",
    officialIndexRecord: null,
    authoritativeObjectMetadata: null,
    safeArchiveInventorySha256: null,
    archiveInventoryCount: null,
    archiveExpandedBytes: null,
    archivePathStatus: "UNATTEMPTED",
    archiveReparseStatus: "UNATTEMPTED",
    malwareScan: {
      engine: "Microsoft Defender",
      engineVersion: "1.1.26100.4",
      definitionsVersion: "1.463.79.0",
      scannedUtc: "2026-11-02T01:08:24.425Z",
      result: "PASS",
    },
    versionStatus: "PASS",
    executableAllowlist: [
      {
        path: "nvda_2026.3.exe",
        version: "2026.3",
        sha256: tool.expectedSha256,
        signatureStatus: "VALID",
        peVersionMethod: "VERSIONINFO_FILE_AND_PRODUCT_VERSION_V1",
        peVersionStatus: "PASS",
      },
    ],
    deniedExecutables: [],
  };
  return tool;
}

test("keeps NVDA Authenticode pins prospective until a complete byte-bound observation exists", () => {
  assert.match(infrastructurePlan, /Live Authenticode observation is `UNATTEMPTED`/u);
  assert.match(infrastructurePlan, /prospective expected pins only/u);
  assert.doesNotMatch(infrastructurePlan, /The verified installer remains fixed/u);
  const manifest = toolManifest();
  const nvda = manifest.tools[2];
  assert.equal(nvda.sourceUrl, "https://download.nvaccess.org/releases/2026.3/nvda_2026.3.exe");
  assert.equal(
    nvda.expectedSha256,
    "a8a87cb823da0c62cfbae4a444ae5ae238d54dc82ad6d46d3fdb3fef082799b2",
  );
  assert.deepEqual(
    {
      signatureMethod: nvda.signatureMethod,
      signatureStatus: nvda.signatureStatus,
      signatureChainStatus: nvda.signatureChainStatus,
      signatureVerifiedUtc: nvda.signatureVerifiedUtc,
      signatureObservedSha256: nvda.signatureObservedSha256,
      signerSubject: nvda.signerSubject,
      signerThumbprint: nvda.signerThumbprint,
      launchStatus: nvda.launchStatus,
    },
    {
      signatureMethod: "UNATTEMPTED",
      signatureStatus: "UNATTEMPTED",
      signatureChainStatus: "UNATTEMPTED",
      signatureVerifiedUtc: null,
      signatureObservedSha256: null,
      signerSubject: null,
      signerThumbprint: null,
      launchStatus: "NOT_LAUNCHED",
    },
  );
  assert.equal(validatePreflightToolManifest(manifest), manifest);

  const prematureClaim = structuredClone(manifest);
  prematureClaim.tools[2].signerSubject =
    "CN=NV Access Limited, O=NV Access Limited, L=Camp Mountain, S=Queensland, C=AU";
  prematureClaim.tools[2].signerThumbprint = "4E9A772A99C1A3B713766DAC4B3545236CC2AE72";
  assert.throws(
    () => validatePreflightToolManifest(prematureClaim),
    /unattempted signature cannot carry observed evidence/u,
  );

  const verified = structuredClone(manifest);
  makeNvdaEligible(verified);
  assert.equal(validatePreflightToolManifest(verified), verified);
  for (const [label, mutate, expected] of [
    [
      "missing method",
      (candidate) => {
        candidate.tools[2].signatureMethod = "UNATTEMPTED";
      },
      /signature observation is missing/u,
    ],
    [
      "missing time",
      (candidate) => {
        candidate.tools[2].signatureVerifiedUtc = null;
      },
      /signature observation is missing/u,
    ],
    [
      "noncanonical time",
      (candidate) => {
        candidate.tools[2].signatureVerifiedUtc = "2026-11-03";
      },
      /canonical UTC milliseconds/u,
    ],
    [
      "missing signature byte hash",
      (candidate) => {
        candidate.tools[2].signatureObservedSha256 = null;
      },
      /signature observation is missing/u,
    ],
    [
      "stale signature byte hash",
      (candidate) => {
        candidate.tools[2].observedSha256 = "b".repeat(64);
      },
      /not bound to installer bytes/u,
    ],
    [
      "untrusted chain",
      (candidate) => {
        candidate.tools[2].signatureChainStatus = "UNTRUSTED";
      },
      /trusted valid chain/u,
    ],
    [
      "expired or invalid chain",
      (candidate) => {
        candidate.tools[2].signatureChainStatus = "EXPIRED_OR_INVALID";
      },
      /trusted valid chain/u,
    ],
    [
      "missing signer",
      (candidate) => {
        candidate.tools[2].signerSubject = null;
      },
      /trusted valid chain and signer/u,
    ],
    [
      "unexpected signer",
      (candidate) => {
        candidate.tools[2].signerSubject = "CN=Unexpected Publisher";
      },
      /complete trusted Authenticode observation/u,
    ],
    [
      "unexpected thumbprint",
      (candidate) => {
        candidate.tools[2].signerThumbprint = "A".repeat(40);
      },
      /complete trusted Authenticode observation/u,
    ],
    [
      "unbound source",
      (candidate) => {
        candidate.tools[2].sourceUrl = "https://example.test/nvda.exe";
      },
      /approved official source/u,
    ],
  ]) {
    const candidate = structuredClone(verified);
    mutate(candidate);
    assert.throws(
      () => validatePreflightToolManifest(candidate),
      expected,
      `expected ${label} evidence to fail closed`,
    );
  }
});

test("validates the closed tool manifest and rejects unverified launches", () => {
  const manifest = toolManifest();
  assert.equal(validatePreflightToolManifest(manifest), manifest);
  const launchedWithoutDigest = structuredClone(manifest);
  launchedWithoutDigest.tools[0].launchStatus = "LAUNCHED";
  assert.throws(
    () => validatePreflightToolManifest(launchedWithoutDigest),
    /cannot launch without an observed digest/u,
  );
  const reordered = structuredClone(manifest);
  [reordered.tools[0], reordered.tools[1]] = [reordered.tools[1], reordered.tools[0]];
  assert.throws(() => validatePreflightToolManifest(reordered), /order or tool ID/u);
  const unofficial = structuredClone(manifest);
  unofficial.tools[0].sourceUrl = "https://example.test/chrome.zip";
  assert.throws(() => validatePreflightToolManifest(unofficial), /approved official source/u);
  const partialObservation = structuredClone(manifest);
  partialObservation.tools[0].observedSha256 = sha;
  assert.throws(
    () => validatePreflightToolManifest(partialObservation),
    /digest and byte length must be observed together/u,
  );
  const unsignedVerification = structuredClone(manifest);
  unsignedVerification.tools[2].signatureStatus = "VERIFIED";
  assert.throws(
    () => validatePreflightToolManifest(unsignedVerification),
    /signature observation is missing|trusted valid chain/u,
  );
  const failedSignatureNotBlocked = structuredClone(manifest);
  failedSignatureNotBlocked.tools[0].signatureStatus = "FAILED";
  failedSignatureNotBlocked.tools[0].signatureMethod = "POWERSHELL_GET_AUTHENTICODE_SIGNATURE_V1";
  failedSignatureNotBlocked.tools[0].signatureChainStatus = "UNTRUSTED";
  failedSignatureNotBlocked.tools[0].signatureVerifiedUtc = "2026-11-03T01:02:03.004Z";
  failedSignatureNotBlocked.tools[0].launchStatus = "ELIGIBLE";
  failedSignatureNotBlocked.tools[0].observedSha256 = sha;
  failedSignatureNotBlocked.tools[0].signatureObservedSha256 = sha;
  failedSignatureNotBlocked.tools[0].observedByteLength = "1";
  assert.throws(() => validatePreflightToolManifest(failedSignatureNotBlocked), /launch requires/u);
  const verifiedAlternateProvenance = structuredClone(manifest);
  makeChromeEligible(verifiedAlternateProvenance, 0);
  assert.equal(
    validatePreflightToolManifest(verifiedAlternateProvenance),
    verifiedAlternateProvenance,
  );
  const missingObjectMetadata = structuredClone(verifiedAlternateProvenance);
  missingObjectMetadata.tools[0].provenance.authoritativeObjectMetadata = null;
  assert.throws(
    () => validatePreflightToolManifest(missingObjectMetadata),
    /complete matching GCS archive provenance/u,
  );
  const failedAlternateProvenance = structuredClone(verifiedAlternateProvenance);
  failedAlternateProvenance.tools[0].provenance.status = "FAILED";
  assert.throws(
    () => validatePreflightToolManifest(failedAlternateProvenance),
    /launch requires verified/u,
  );
  for (const [label, mutate, expected] of [
    [
      "index response digest",
      (candidate) => {
        candidate.tools[0].provenance.officialIndexRecord.responseSha256 = "b".repeat(64);
      },
      /official index record does not match/u,
    ],
    [
      "local MD5",
      (candidate) => {
        candidate.tools[0].observedMd5Base64 = "aW52YWxpZA==";
      },
      /complete matching GCS archive provenance/u,
    ],
    [
      "local CRC32C",
      (candidate) => {
        candidate.tools[0].observedCrc32cBase64 = "aW52YWxpZA==";
      },
      /complete matching GCS archive provenance/u,
    ],
    [
      "inventory count",
      (candidate) => {
        candidate.tools[0].provenance.archiveInventoryCount = null;
      },
      /complete matching GCS archive provenance/u,
    ],
    [
      "traversal result",
      (candidate) => {
        candidate.tools[0].provenance.archivePathStatus = "FAIL";
      },
      /complete matching GCS archive provenance/u,
    ],
    [
      "reparse result",
      (candidate) => {
        candidate.tools[0].provenance.archiveReparseStatus = "FAIL";
      },
      /complete matching GCS archive provenance/u,
    ],
    [
      "allowlist path",
      (candidate) => {
        candidate.tools[0].provenance.executableAllowlist[0].path = "chrome-win64/setup.exe";
      },
      /executable allowlist or denylist is incomplete/u,
    ],
    [
      "denylist completeness",
      (candidate) => {
        candidate.tools[0].provenance.deniedExecutables.pop();
      },
      /executable allowlist or denylist is incomplete/u,
    ],
    [
      "PE inspection method",
      (candidate) => {
        candidate.tools[0].provenance.executableAllowlist[0].peVersionMethod = "OTHER";
      },
      /PE version method changed/u,
    ],
    [
      "malware scan",
      (candidate) => {
        candidate.tools[0].provenance.malwareScan.result = "FAIL";
      },
      /launch requires verified scan/u,
    ],
    [
      "unsigned status",
      (candidate) => {
        candidate.tools[0].signatureStatus = "NOT_APPLICABLE";
      },
      /must remain explicitly NOT_SIGNED/u,
    ],
  ]) {
    const candidate = structuredClone(verifiedAlternateProvenance);
    mutate(candidate);
    assert.throws(
      () => validatePreflightToolManifest(candidate),
      expected,
      `expected ${label} mismatch to fail`,
    );
  }
  const traversalPath = structuredClone(verifiedAlternateProvenance);
  traversalPath.tools[0].provenance.executableAllowlist[0].path = "../chrome.exe";
  assert.throws(
    () => validatePreflightToolManifest(traversalPath),
    /not canonical relative POSIX/u,
  );
  const verifiedNvda = structuredClone(manifest);
  makeNvdaEligible(verifiedNvda);
  assert.equal(validatePreflightToolManifest(verifiedNvda), verifiedNvda);
  const wrongNvdaSigner = structuredClone(verifiedNvda);
  wrongNvdaSigner.tools[2].signerSubject = "CN=Unexpected Publisher";
  assert.throws(
    () => validatePreflightToolManifest(wrongNvdaSigner),
    /complete trusted Authenticode observation/u,
  );
  const forbiddenTesseractLaunch = structuredClone(manifest);
  const tesseract = forbiddenTesseractLaunch.tools[3];
  tesseract.observedSha256 = "1".repeat(64);
  tesseract.observedByteLength = "1234";
  tesseract.archiveStatus = "READABLE";
  tesseract.signatureMethod = "NOT_APPLICABLE";
  tesseract.signatureStatus = "NOT_SIGNED";
  tesseract.signatureChainStatus = "NOT_APPLICABLE";
  tesseract.launchStatus = "ELIGIBLE";
  tesseract.provenance = {
    status: "VERIFIED",
    method: "SOURCE_BUILD_NOT_APPROVED",
    officialIndexRecord: null,
    authoritativeObjectMetadata: null,
    safeArchiveInventorySha256: "2".repeat(64),
    archiveInventoryCount: "1",
    archiveExpandedBytes: "1234",
    archivePathStatus: "PASS",
    archiveReparseStatus: "PASS",
    malwareScan: {
      engine: "Microsoft Defender",
      engineVersion: "1.1.26100.4",
      definitionsVersion: "1.463.79.0",
      scannedUtc: "2026-11-02T01:08:24.425Z",
      result: "PASS",
    },
    versionStatus: "PASS",
    executableAllowlist: [
      {
        path: "tesseract/tesseract.exe",
        version: "5.5.4",
        sha256: "3".repeat(64),
        signatureStatus: "NOT_SIGNED",
        peVersionMethod: "VERSIONINFO_FILE_AND_PRODUCT_VERSION_V1",
        peVersionStatus: "PASS",
      },
    ],
    deniedExecutables: [],
  };
  assert.throws(
    () => validatePreflightToolManifest(forbiddenTesseractLaunch),
    /launch is not approved by Choice A/u,
  );
  const withLicenses = structuredClone(manifest);
  withLicenses.tools[1].licenseNotices = [
    { path: "LICENSE.chromedriver", bytes: "1536", sha256: "b".repeat(64) },
    { path: "THIRD_PARTY_NOTICES.chromedriver", bytes: "4096", sha256: "c".repeat(64) },
  ];
  withLicenses.tools[1].licenseNoticeDigestMethod = "CANONICAL_JSON_ORDERED_PATH_BYTES_SHA256_V1";
  withLicenses.tools[1].licenseNoticeSha256 = licenseNoticeManifestDigest(
    withLicenses.tools[1].licenseNotices,
  );
  assert.equal(validatePreflightToolManifest(withLicenses), withLicenses);
  withLicenses.tools[1].licenseNotices.reverse();
  assert.throws(() => validatePreflightToolManifest(withLicenses), /unique and path-sorted/u);
});

test("requires a nonempty hash-bound NVDA license inventory for attempt-002", () => {
  const manifest = toolManifest();
  assert.throws(() => validateAttempt002ToolManifest(manifest), /NVDA license/u);
  const nvda = manifest.tools[2];
  nvda.licenseNotices = [
    { path: "documentation/copying.txt", bytes: "4096", sha256: "d".repeat(64) },
  ];
  nvda.licenseNoticeDigestMethod = "CANONICAL_JSON_ORDERED_PATH_BYTES_SHA256_V1";
  nvda.licenseNoticeSha256 = licenseNoticeManifestDigest(nvda.licenseNotices);
  assert.equal(validateAttempt002ToolManifest(manifest), manifest);
});

test("validates sanitized results and forbids authoritative isolation or raw retention", () => {
  const result = {
    schema: PREFLIGHT_SCHEMAS.result,
    creditable: false,
    evidenceStatus: "NON_EVIDENCE",
    sourceCommit: APPROVED_PREFLIGHT_SOURCE_COMMIT,
    planDigest: discardedPreflightPlanDigest(createDiscardedPreflightPlan()),
    toolManifestDigest: "c".repeat(64),
    smokeResultDigest: "d".repeat(64),
    networkIsolation: "UNATTEMPTED",
    status: "BLOCKED",
    conducted: 0,
    passed: 0,
    failed: 0,
    blocked: 1,
    requiredUnattempted: 1,
    peakBytes: "0",
    projectedFullRunPeakBytes: "0",
    retainedRawBytes: "0",
    notes: ["tool acquisition has not run"],
  };
  assert.equal(validatePreflightResult(result), result);
  assert.throws(
    () => validatePreflightResult({ ...result, networkIsolation: "PASS" }),
    /cannot claim authoritative network isolation/u,
  );
  assert.throws(
    () => validatePreflightResult({ ...result, retainedRawBytes: "1" }),
    /cannot retain raw bytes/u,
  );
  assert.throws(
    () =>
      validatePreflightResult({
        ...result,
        status: "PASS",
      }),
    /cannot contain failures, blocks, or required unattempted/u,
  );
});

test("validates a discard receipt that is explicitly not R4-B3 E2", () => {
  const discard = {
    schema: PREFLIGHT_SCHEMAS.discard,
    creditable: false,
    evidenceStatus: "NON_EVIDENCE",
    sourceCommit: APPROVED_PREFLIGHT_SOURCE_COMMIT,
    planDigest: sha,
    resultDigest: "b".repeat(64),
    toolManifestDigest: "c".repeat(64),
    smokeResultDigest: "d".repeat(64),
    notE2: true,
    discardedRawBytes: "1024",
    residualRawBytes: "0",
    status: "PASS",
  };
  assert.equal(validatePreflightDiscard(discard), discard);
  assert.throws(() => validatePreflightDiscard({ ...discard, notE2: false }), /notE2 true/u);
  assert.throws(
    () => validatePreflightDiscard({ ...discard, residualRawBytes: "1" }),
    /zero raw bytes/u,
  );
});

test("validates the bounded zero-capture smoke record before cleanup", () => {
  const smoke = {
    schema: PREFLIGHT_SCHEMAS.smokeResult,
    creditable: false,
    evidenceStatus: "NON_EVIDENCE",
    sourceCommit: APPROVED_PREFLIGHT_SOURCE_COMMIT,
    planDigest: discardedPreflightPlanDigest(createDiscardedPreflightPlan()),
    toolManifestSha256: "c".repeat(64),
    status: "PASS",
    startedAt: "2026-11-02T01:15:45.8434812Z",
    endedAt: "2026-11-02T01:15:58.6278762Z",
    durationMilliseconds: 12784,
    checks: {
      loopbackServer: "PASS",
      driverReady: "PASS",
      sessionCreated: "PASS",
      documentTitle: "PASS",
      domHeading: "PASS",
      focus: "PASS",
      interaction: "PASS",
      loopbackOrigin: "PASS",
      unexpectedExternalRequests: 0,
      deniedExecutableLaunches: 0,
      externalConnectionsObserved: 0,
      lingeringToolProcesses: 0,
    },
    launchedTools: ["chrome-win64/chrome.exe", "chromedriver-win64/chromedriver.exe"],
    launchedToolProcessCount: 10,
    networkIsolation: "UNATTEMPTED",
    prelaunchSandboxAttempt: "BLOCKED_BEFORE_TOOL_LAUNCH",
    captureCounts: { visualCells: 0, observations: 0, artifacts: 0, transitions: 0 },
    nvdaStatus: "BLOCKED_NOT_LAUNCHED",
    ocrStatus: "BLOCKED_NOT_ACQUIRED",
    rawRootsPendingDiscard: { count: 2, files: 178, bytes: 4690311, reparsePoints: 0 },
    notes: ["synthetic_loopback_fixture_only", "not_final_evidence"],
  };
  assert.equal(validatePreflightSmokeResult(smoke), smoke);
  assert.throws(
    () =>
      validatePreflightSmokeResult({
        ...smoke,
        captureCounts: { ...smoke.captureCounts, observations: 1 },
      }),
    /cannot claim capture work/u,
  );
  assert.throws(
    () =>
      validatePreflightSmokeResult({
        ...smoke,
        rawRootsPendingDiscard: { ...smoke.rawRootsPendingDiscard, files: 177 },
      }),
    /inventory changed/u,
  );
});
