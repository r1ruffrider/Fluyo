import { createHash } from "node:crypto";

const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/u;
const LOWERCASE_COMMIT = /^[0-9a-f]{40}$/u;
const CANONICAL_UNSIGNED_DECIMAL = /^(0|[1-9][0-9]*)$/u;
const BASE64_VALUE = /^[A-Za-z0-9+/]+={0,2}$/u;
const CHROME_TOOL_IDS = new Set(["chrome_for_testing", "chromedriver"]);
export const NVDA_EXPECTED_SOURCE_URL =
  "https://download.nvaccess.org/releases/2026.3/nvda_2026.3.exe";
export const NVDA_EXPECTED_SHA256 =
  "a8a87cb823da0c62cfbae4a444ae5ae238d54dc82ad6d46d3fdb3fef082799b2";
export const NVDA_EXPECTED_SIGNATURE_METHOD = "POWERSHELL_GET_AUTHENTICODE_SIGNATURE_V1";
export const NVDA_EXPECTED_SIGNER_SUBJECT =
  "CN=NV Access Limited, O=NV Access Limited, L=Camp Mountain, S=Queensland, C=AU";
export const NVDA_EXPECTED_SIGNER_THUMBPRINT = "4E9A772A99C1A3B713766DAC4B3545236CC2AE72";
const CFT_REVISION = "1706539";
const CFT_INDEX_URL = "https://googlechromelabs.github.io/chrome-for-testing/156.0.8078.80.json";
const CFT_INDEX_RESPONSE_SHA256 =
  "c88d93108425da68329f4774e059d3c2aaef716f735e07c2cde14341282d7693";
const CFT_CHROME_URL =
  "https://storage.googleapis.com/chrome-for-testing-public/156.0.8078.80/win64/chrome-win64.zip";
const CFT_DRIVER_URL =
  "https://storage.googleapis.com/chrome-for-testing-public/156.0.8078.80/win64/chromedriver-win64.zip";
const CFT_ALLOWED_EXECUTABLES = Object.freeze({
  chrome_for_testing: "chrome-win64/chrome.exe",
  chromedriver: "chromedriver-win64/chromedriver.exe",
});
const CFT_DENIED_EXECUTABLES = Object.freeze({
  chrome_for_testing: Object.freeze([
    "chrome-win64/chrome_proxy.exe",
    "chrome-win64/chrome_pwa_launcher.exe",
    "chrome-win64/elevated_tracing_service.exe",
    "chrome-win64/elevation_service.exe",
    "chrome-win64/notification_helper.exe",
    "chrome-win64/setup.exe",
  ]),
  chromedriver: Object.freeze([]),
});
const TOOL_SOURCE_RULES = Object.freeze(
  new Map([
    [
      "chrome_for_testing",
      /^https:\/\/storage\.googleapis\.com\/chrome-for-testing-public\/156\.0\.8078\.80\/win64\/chrome-win64\.zip$/u,
    ],
    [
      "chromedriver",
      /^https:\/\/storage\.googleapis\.com\/chrome-for-testing-public\/156\.0\.8078\.80\/win64\/chromedriver-win64\.zip$/u,
    ],
    ["nvda", /^https:\/\/download\.nvaccess\.org\/releases\/2026\.3\/nvda_2026\.3\.exe$/u],
    [
      "tesseract",
      /^https:\/\/github\.com\/tesseract-ocr\/tesseract\/archive\/refs\/tags\/5\.5\.4\.zip$/u,
    ],
    [
      "tessdata_fast",
      /^https:\/\/github\.com\/tesseract-ocr\/tessdata_fast\/archive\/65727574dfcd264acbb0c3e07860e4e9e9b22185\.zip$/u,
    ],
  ]),
);

export const PREFLIGHT_SCHEMAS = Object.freeze({
  toolManifest: "fluyo:r4b:preflight-tool-manifest:v2",
  plan: "fluyo:r4b:preflight-plan:v1",
  result: "fluyo:r4b:preflight-result:v1",
  discard: "fluyo:r4b:preflight-discard:v1",
  smokeResult: "fluyo:r4b:preflight-smoke-result:v1",
  attemptAuthority: "fluyo:r4b:preflight-attempt-authority:v3",
  aggregateV2: "fluyo:r4b:preflight-synthetic-observation-aggregate:v2",
  resultV2: "fluyo:r4b:preflight-result:v2",
  discardV2: "fluyo:r4b:preflight-discard:v2",
});

export const PREFLIGHT_EVIDENCE_STATUS = "NON_EVIDENCE";
export const PREFLIGHT_NETWORK_ISOLATION_STATUS = "UNATTEMPTED";

const TOOL_IDS = Object.freeze([
  "chrome_for_testing",
  "chromedriver",
  "nvda",
  "tesseract",
  "tessdata_fast",
]);

function requirePlainObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function requireExactKeys(value, keys, name) {
  const actual = Object.keys(value);
  if (actual.length !== keys.length || !keys.every((key, index) => actual[index] === key)) {
    throw new Error(`${name} keys must match the closed canonical order`);
  }
}

function requireString(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a nonempty string`);
  }
  return value;
}

function requireCommit(value, name) {
  if (!LOWERCASE_COMMIT.test(value)) throw new Error(`${name} must be a lowercase 40-hex commit`);
  return value;
}

function requireSha256OrNull(value, name) {
  if (value !== null && !LOWERCASE_SHA256.test(value)) {
    throw new Error(`${name} must be null or lowercase SHA-256`);
  }
  return value;
}

function requireUnsignedDecimal(value, name) {
  if (!CANONICAL_UNSIGNED_DECIMAL.test(value)) {
    throw new Error(`${name} must be a canonical unsigned decimal string`);
  }
  return value;
}

const CAPACITY_FIELDS = Object.freeze([
  "observerPeakRssBytes",
  "sampleRawInventoryLogicalBytes",
  "sampleDistinctCellCount",
  "sampleObservationCount",
  "sampleObservationArtifactFileCount",
  "fullRunCellCount",
  "fullRunArtifactCount",
  "diskScaleNumerator",
  "diskScaleDenominator",
  "diskSafetyFactorNumerator",
  "diskSafetyFactorDenominator",
  "conservativeFullRunDiskBudgetBytes",
]);

function validateCapacityContract(value, name) {
  for (const field of CAPACITY_FIELDS) requireUnsignedDecimal(value[field], `${name} ${field}`);
  const sampleCells = BigInt(value.sampleDistinctCellCount);
  const sampleObservations = BigInt(value.sampleObservationCount);
  const sampleArtifacts = BigInt(value.sampleObservationArtifactFileCount);
  const fullCells = BigInt(value.fullRunCellCount);
  const fullArtifacts = BigInt(value.fullRunArtifactCount);
  const scaleNumerator = BigInt(value.diskScaleNumerator);
  const scaleDenominator = BigInt(value.diskScaleDenominator);
  const safetyNumerator = BigInt(value.diskSafetyFactorNumerator);
  const safetyDenominator = BigInt(value.diskSafetyFactorDenominator);
  if (
    sampleCells !== 30n ||
    sampleObservations !== 120n ||
    sampleArtifacts !== 960n ||
    fullCells !== 10800n ||
    fullArtifacts !== 86400n ||
    scaleNumerator !== fullCells ||
    scaleDenominator !== sampleCells ||
    safetyNumerator !== 2n ||
    safetyDenominator !== 1n ||
    scaleDenominator === 0n ||
    safetyDenominator === 0n ||
    scaleNumerator % scaleDenominator !== 0n ||
    safetyNumerator % safetyDenominator !== 0n
  ) {
    throw new Error(`${name} capacity constants or exact divisibility changed`);
  }
  const expectedBudget =
    BigInt(value.sampleRawInventoryLogicalBytes) *
    (scaleNumerator / scaleDenominator) *
    (safetyNumerator / safetyDenominator);
  if (BigInt(value.conservativeFullRunDiskBudgetBytes) !== expectedBudget) {
    throw new Error(`${name} disk budget does not equal the exact BigInt projection`);
  }
  return value;
}

function requireNonEvidenceEnvelope(value, name) {
  if (value.creditable !== false || value.evidenceStatus !== PREFLIGHT_EVIDENCE_STATUS) {
    throw new Error(`${name} must be non-creditable NON_EVIDENCE`);
  }
}

function requireCanonicalRelativePath(value, name) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 240 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`${name} is not canonical relative POSIX`);
  }
  return value;
}

function validateAuthoritativeObjectMetadata(metadata, toolId) {
  requirePlainObject(metadata, `${toolId}.provenance.authoritativeObjectMetadata`);
  requireExactKeys(
    metadata,
    [
      "generation",
      "metageneration",
      "bytes",
      "md5Base64",
      "crc32cBase64",
      "etag",
      "createdUtc",
      "updatedUtc",
    ],
    `${toolId}.provenance.authoritativeObjectMetadata`,
  );
  requireUnsignedDecimal(metadata.generation, `${toolId} GCS generation`);
  requireUnsignedDecimal(metadata.metageneration, `${toolId} GCS metageneration`);
  requireUnsignedDecimal(metadata.bytes, `${toolId} GCS bytes`);
  for (const field of ["md5Base64", "crc32cBase64"]) {
    if (!BASE64_VALUE.test(metadata[field])) throw new Error(`${toolId} GCS ${field} is invalid`);
  }
  requireString(metadata.etag, `${toolId} GCS etag`);
  for (const field of ["createdUtc", "updatedUtc"]) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(metadata[field])) {
      throw new Error(`${toolId} GCS ${field} must be canonical UTC milliseconds`);
    }
  }
}

function validateOfficialIndexRecord(record, toolId) {
  requirePlainObject(record, `${toolId}.provenance.officialIndexRecord`);
  requireExactKeys(
    record,
    [
      "sourceUrl",
      "responseBytes",
      "responseSha256",
      "recordSha256",
      "version",
      "revision",
      "chromeWin64Url",
      "chromedriverWin64Url",
    ],
    `${toolId}.provenance.officialIndexRecord`,
  );
  if (
    record.sourceUrl !== CFT_INDEX_URL ||
    record.responseBytes !== "2582" ||
    record.responseSha256 !== CFT_INDEX_RESPONSE_SHA256 ||
    record.recordSha256 !== CFT_INDEX_RESPONSE_SHA256 ||
    record.version !== "156.0.8078.80" ||
    record.revision !== CFT_REVISION ||
    record.chromeWin64Url !== CFT_CHROME_URL ||
    record.chromedriverWin64Url !== CFT_DRIVER_URL
  ) {
    throw new Error(`${toolId} official index record does not match the approved pin`);
  }
  requireUnsignedDecimal(record.responseBytes, `${toolId} official index responseBytes`);
  for (const field of ["responseSha256", "recordSha256"]) {
    if (!LOWERCASE_SHA256.test(record[field])) {
      throw new Error(`${toolId} official index ${field} must be lowercase SHA-256`);
    }
  }
}

function validateMalwareScan(scan, toolId) {
  requirePlainObject(scan, `${toolId}.provenance.malwareScan`);
  requireExactKeys(
    scan,
    ["engine", "engineVersion", "definitionsVersion", "scannedUtc", "result"],
    `${toolId}.provenance.malwareScan`,
  );
  if (!new Set(["UNATTEMPTED", "PASS", "FAIL"]).has(scan.result)) {
    throw new Error(`${toolId} malware scan result is not closed`);
  }
  const detailFields = ["engine", "engineVersion", "definitionsVersion", "scannedUtc"];
  if (scan.result === "UNATTEMPTED") {
    if (detailFields.some((field) => scan[field] !== null)) {
      throw new Error(`${toolId} unattempted malware scan cannot carry details`);
    }
    return;
  }
  for (const field of detailFields.slice(0, 3)) requireString(scan[field], `${toolId} ${field}`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(scan.scannedUtc)) {
    throw new Error(`${toolId} malware scan time must be canonical UTC milliseconds`);
  }
}

function validateCanonicalPathList(paths, name) {
  if (!Array.isArray(paths)) throw new Error(`${name} must be an array`);
  for (const path of paths) requireCanonicalRelativePath(path, name);
  if (paths.some((path, index) => index > 0 && path <= paths[index - 1])) {
    throw new Error(`${name} must be unique and path-sorted`);
  }
}

function validateProvenance(tool) {
  const provenance = requirePlainObject(tool.provenance, `${tool.toolId}.provenance`);
  requireExactKeys(
    provenance,
    [
      "status",
      "method",
      "officialIndexRecord",
      "authoritativeObjectMetadata",
      "safeArchiveInventorySha256",
      "archiveInventoryCount",
      "archiveExpandedBytes",
      "archivePathStatus",
      "archiveReparseStatus",
      "malwareScan",
      "versionStatus",
      "executableAllowlist",
      "deniedExecutables",
    ],
    `${tool.toolId}.provenance`,
  );
  if (!new Set(["UNATTEMPTED", "VERIFIED", "FAILED"]).has(provenance.status)) {
    throw new Error(`${tool.toolId}.provenance.status is not closed`);
  }
  if (
    !new Set([
      "UNATTEMPTED",
      "GCS_OBJECT_AND_LOCAL_ARCHIVE_V1",
      "UPSTREAM_SHA256_AND_AUTHENTICODE_V1",
      "SOURCE_BUILD_NOT_APPROVED",
    ]).has(provenance.method)
  ) {
    throw new Error(`${tool.toolId}.provenance.method is not closed`);
  }
  if (provenance.officialIndexRecord !== null) {
    validateOfficialIndexRecord(provenance.officialIndexRecord, tool.toolId);
  }
  if (provenance.authoritativeObjectMetadata !== null) {
    validateAuthoritativeObjectMetadata(provenance.authoritativeObjectMetadata, tool.toolId);
  }
  requireSha256OrNull(
    provenance.safeArchiveInventorySha256,
    `${tool.toolId}.provenance.safeArchiveInventorySha256`,
  );
  for (const field of ["archiveInventoryCount", "archiveExpandedBytes"]) {
    if (provenance[field] !== null)
      requireUnsignedDecimal(provenance[field], `${tool.toolId} ${field}`);
  }
  for (const field of ["archivePathStatus", "archiveReparseStatus", "versionStatus"]) {
    if (!new Set(["UNATTEMPTED", "PASS", "FAIL"]).has(provenance[field])) {
      throw new Error(`${tool.toolId}.provenance.${field} is not closed`);
    }
  }
  validateMalwareScan(provenance.malwareScan, tool.toolId);
  if (!Array.isArray(provenance.executableAllowlist)) {
    throw new Error(`${tool.toolId}.provenance.executableAllowlist must be an array`);
  }
  const executablePaths = [];
  for (const [executableIndex, executable] of provenance.executableAllowlist.entries()) {
    requirePlainObject(
      executable,
      `${tool.toolId}.provenance.executableAllowlist[${executableIndex}]`,
    );
    requireExactKeys(
      executable,
      ["path", "version", "sha256", "signatureStatus", "peVersionMethod", "peVersionStatus"],
      `${tool.toolId}.provenance.executableAllowlist[${executableIndex}]`,
    );
    requireCanonicalRelativePath(executable.path, `${tool.toolId} executable path`);
    requireString(executable.version, `${tool.toolId} executable version`);
    if (!LOWERCASE_SHA256.test(executable.sha256)) {
      throw new Error(`${tool.toolId} executable sha256 must be lowercase SHA-256`);
    }
    if (!new Set(["VALID", "NOT_SIGNED"]).has(executable.signatureStatus)) {
      throw new Error(`${tool.toolId} executable signatureStatus is not closed`);
    }
    if (executable.peVersionMethod !== "VERSIONINFO_FILE_AND_PRODUCT_VERSION_V1") {
      throw new Error(`${tool.toolId} executable PE version method changed`);
    }
    if (executable.peVersionStatus !== "PASS") {
      throw new Error(`${tool.toolId} executable PE version inspection must PASS`);
    }
    executablePaths.push(executable.path);
  }
  if (executablePaths.some((path, index) => index > 0 && path <= executablePaths[index - 1])) {
    throw new Error(`${tool.toolId} executable allowlist must be unique and path-sorted`);
  }
  if (!Array.isArray(provenance.deniedExecutables)) {
    throw new Error(`${tool.toolId}.provenance.deniedExecutables must be an array`);
  }
  const deniedPaths = [];
  for (const [deniedIndex, executable] of provenance.deniedExecutables.entries()) {
    requirePlainObject(executable, `${tool.toolId}.provenance.deniedExecutables[${deniedIndex}]`);
    requireExactKeys(
      executable,
      ["path", "version", "sha256", "signatureStatus", "peVersionMethod", "peVersionStatus"],
      `${tool.toolId}.provenance.deniedExecutables[${deniedIndex}]`,
    );
    requireCanonicalRelativePath(executable.path, `${tool.toolId} denied executable path`);
    requireString(executable.version, `${tool.toolId} denied executable version`);
    if (!LOWERCASE_SHA256.test(executable.sha256)) {
      throw new Error(`${tool.toolId} denied executable sha256 must be lowercase SHA-256`);
    }
    if (executable.signatureStatus !== "NOT_SIGNED") {
      throw new Error(`${tool.toolId} denied executable must remain NOT_SIGNED`);
    }
    if (executable.peVersionMethod !== "VERSIONINFO_FILE_AND_PRODUCT_VERSION_V1") {
      throw new Error(`${tool.toolId} denied executable PE version method changed`);
    }
    if (executable.peVersionStatus !== "PASS") {
      throw new Error(`${tool.toolId} denied executable PE version inspection must PASS`);
    }
    deniedPaths.push(executable.path);
  }
  validateCanonicalPathList(deniedPaths, `${tool.toolId}.provenance.deniedExecutablePaths`);

  const launchEligible = new Set(["ELIGIBLE", "LAUNCHED"]).has(tool.launchStatus);
  if (!launchEligible) return;
  if (
    provenance.status !== "VERIFIED" ||
    provenance.malwareScan.result !== "PASS" ||
    provenance.versionStatus !== "PASS" ||
    provenance.executableAllowlist.length === 0
  ) {
    throw new Error(
      `${tool.toolId} launch requires verified scan, version, and executable provenance`,
    );
  }
  if (CHROME_TOOL_IDS.has(tool.toolId)) {
    if (
      provenance.method !== "GCS_OBJECT_AND_LOCAL_ARCHIVE_V1" ||
      provenance.officialIndexRecord === null ||
      provenance.authoritativeObjectMetadata === null ||
      provenance.safeArchiveInventorySha256 === null ||
      provenance.archiveInventoryCount === null ||
      provenance.archiveExpandedBytes === null ||
      provenance.archivePathStatus !== "PASS" ||
      provenance.archiveReparseStatus !== "PASS" ||
      provenance.authoritativeObjectMetadata.bytes !== tool.observedByteLength ||
      provenance.authoritativeObjectMetadata.md5Base64 !== tool.observedMd5Base64 ||
      provenance.authoritativeObjectMetadata.crc32cBase64 !== tool.observedCrc32cBase64 ||
      tool.licenseNotices.length === 0 ||
      tool.licenseNoticeSha256 === null
    ) {
      throw new Error(`${tool.toolId} launch requires complete matching GCS archive provenance`);
    }
    if (
      provenance.executableAllowlist.some((entry) => entry.version !== "156.0.8078.80") ||
      tool.version !== "156.0.8078.80" ||
      tool.revision !== CFT_REVISION
    ) {
      throw new Error(`${tool.toolId} version or revision does not match the approved pin`);
    }
    const allowedPath = CFT_ALLOWED_EXECUTABLES[tool.toolId];
    const expectedDeniedPaths = CFT_DENIED_EXECUTABLES[tool.toolId];
    if (
      provenance.executableAllowlist.length !== 1 ||
      provenance.executableAllowlist[0].path !== allowedPath ||
      deniedPaths.includes(allowedPath) ||
      deniedPaths.length !== expectedDeniedPaths.length ||
      deniedPaths.some((path, index) => path !== expectedDeniedPaths[index])
    ) {
      throw new Error(`${tool.toolId} executable allowlist or denylist is incomplete`);
    }
    if (tool.signatureStatus !== "NOT_SIGNED") {
      throw new Error(`${tool.toolId} unsigned binaries must remain explicitly NOT_SIGNED`);
    }
    return;
  }
  if (tool.toolId === "nvda") {
    if (
      provenance.method !== "UPSTREAM_SHA256_AND_AUTHENTICODE_V1" ||
      provenance.officialIndexRecord !== null ||
      provenance.authoritativeObjectMetadata !== null ||
      tool.sourceUrl !== NVDA_EXPECTED_SOURCE_URL ||
      tool.expectedSha256 !== NVDA_EXPECTED_SHA256 ||
      tool.observedSha256 !== NVDA_EXPECTED_SHA256 ||
      tool.signatureMethod !== NVDA_EXPECTED_SIGNATURE_METHOD ||
      tool.signatureStatus !== "VERIFIED" ||
      tool.signatureChainStatus !== "TRUSTED_VALID" ||
      tool.signatureObservedSha256 !== NVDA_EXPECTED_SHA256 ||
      tool.signatureVerifiedUtc === null ||
      tool.signerSubject !== NVDA_EXPECTED_SIGNER_SUBJECT ||
      tool.signerThumbprint !== NVDA_EXPECTED_SIGNER_THUMBPRINT
    ) {
      throw new Error(
        "nvda launch requires exact upstream bytes and a complete trusted Authenticode observation",
      );
    }
    return;
  }
  throw new Error(`${tool.toolId} launch is not approved by Choice A`);
}

function validateSignatureObservation(tool) {
  if (
    !new Set(["UNATTEMPTED", "VERIFIED", "FAILED", "NOT_SIGNED", "NOT_APPLICABLE"]).has(
      tool.signatureStatus,
    )
  ) {
    throw new Error(`${tool.toolId}.signatureStatus is not closed`);
  }
  if (
    !new Set(["UNATTEMPTED", NVDA_EXPECTED_SIGNATURE_METHOD, "NOT_APPLICABLE"]).has(
      tool.signatureMethod,
    )
  ) {
    throw new Error(`${tool.toolId}.signatureMethod is not closed`);
  }
  if (
    !new Set([
      "UNATTEMPTED",
      "TRUSTED_VALID",
      "UNTRUSTED",
      "EXPIRED_OR_INVALID",
      "NOT_APPLICABLE",
    ]).has(tool.signatureChainStatus)
  ) {
    throw new Error(`${tool.toolId}.signatureChainStatus is not closed`);
  }
  requireSha256OrNull(tool.signatureObservedSha256, `${tool.toolId}.signatureObservedSha256`);
  if (
    tool.signatureVerifiedUtc !== null &&
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(tool.signatureVerifiedUtc)
  ) {
    throw new Error(
      `${tool.toolId}.signatureVerifiedUtc must be null or canonical UTC milliseconds`,
    );
  }

  if (tool.signatureStatus === "UNATTEMPTED") {
    if (
      tool.signatureMethod !== "UNATTEMPTED" ||
      tool.signatureChainStatus !== "UNATTEMPTED" ||
      tool.signatureVerifiedUtc !== null ||
      tool.signatureObservedSha256 !== null ||
      tool.signerSubject !== null ||
      tool.signerThumbprint !== null
    ) {
      throw new Error(`${tool.toolId} unattempted signature cannot carry observed evidence`);
    }
    return;
  }
  if (new Set(["NOT_SIGNED", "NOT_APPLICABLE"]).has(tool.signatureStatus)) {
    if (
      tool.signatureMethod !== "NOT_APPLICABLE" ||
      tool.signatureChainStatus !== "NOT_APPLICABLE" ||
      tool.signatureVerifiedUtc !== null ||
      tool.signatureObservedSha256 !== null ||
      tool.signerSubject !== null ||
      tool.signerThumbprint !== null
    ) {
      throw new Error(
        `${tool.toolId} unsigned signature status cannot carry Authenticode evidence`,
      );
    }
    return;
  }
  if (
    tool.signatureMethod !== NVDA_EXPECTED_SIGNATURE_METHOD ||
    tool.signatureVerifiedUtc === null ||
    tool.signatureObservedSha256 === null ||
    tool.observedSha256 === null ||
    tool.signatureObservedSha256 !== tool.observedSha256
  ) {
    throw new Error(
      `${tool.toolId} signature observation is missing or not bound to installer bytes`,
    );
  }
  if (
    tool.signatureStatus === "VERIFIED" &&
    (tool.signatureChainStatus !== "TRUSTED_VALID" ||
      tool.signerSubject === null ||
      tool.signerThumbprint === null)
  ) {
    throw new Error(`${tool.toolId} verified signature requires a trusted valid chain and signer`);
  }
  if (
    tool.signatureStatus === "FAILED" &&
    !new Set(["UNTRUSTED", "EXPIRED_OR_INVALID"]).has(tool.signatureChainStatus)
  ) {
    throw new Error(`${tool.toolId} failed signature requires a closed failing chain status`);
  }
}

function validateTool(tool, index) {
  requirePlainObject(tool, `tools[${index}]`);
  requireExactKeys(
    tool,
    [
      "toolId",
      "version",
      "revision",
      "sourceUrl",
      "digestAuthority",
      "expectedSha256",
      "observedSha256",
      "observedMd5Base64",
      "observedCrc32cBase64",
      "observedByteLength",
      "archiveStatus",
      "provenance",
      "signatureMethod",
      "signatureStatus",
      "signatureChainStatus",
      "signatureVerifiedUtc",
      "signatureObservedSha256",
      "signerSubject",
      "signerThumbprint",
      "licenseNotices",
      "licenseNoticeDigestMethod",
      "licenseNoticeSha256",
      "launchStatus",
    ],
    `tools[${index}]`,
  );
  if (tool.toolId !== TOOL_IDS[index]) throw new Error("tool manifest order or tool ID changed");
  requireString(tool.version, `${tool.toolId}.version`);
  requireString(tool.revision, `${tool.toolId}.revision`);
  if (!TOOL_SOURCE_RULES.get(tool.toolId)?.test(tool.sourceUrl)) {
    throw new Error(`${tool.toolId}.sourceUrl is not the approved official source`);
  }
  if (!new Set(["UPSTREAM", "LOCALLY_CALCULATED"]).has(tool.digestAuthority)) {
    throw new Error(`${tool.toolId}.digestAuthority is not closed`);
  }
  requireSha256OrNull(tool.expectedSha256, `${tool.toolId}.expectedSha256`);
  requireSha256OrNull(tool.observedSha256, `${tool.toolId}.observedSha256`);
  for (const field of ["observedMd5Base64", "observedCrc32cBase64"]) {
    if (tool[field] !== null && !BASE64_VALUE.test(tool[field])) {
      throw new Error(`${tool.toolId}.${field} must be null or base64`);
    }
  }
  if (tool.observedByteLength !== null) {
    requireUnsignedDecimal(tool.observedByteLength, `${tool.toolId}.observedByteLength`);
  }
  if ((tool.observedSha256 === null) !== (tool.observedByteLength === null)) {
    throw new Error(`${tool.toolId} digest and byte length must be observed together`);
  }
  if (!new Set(["UNATTEMPTED", "READABLE", "NOT_ARCHIVE", "FAILED"]).has(tool.archiveStatus)) {
    throw new Error(`${tool.toolId}.archiveStatus is not closed`);
  }
  if (
    tool.signerSubject !== null &&
    (typeof tool.signerSubject !== "string" ||
      tool.signerSubject.length === 0 ||
      tool.signerSubject.length > 256 ||
      /[\r\n]/u.test(tool.signerSubject))
  ) {
    throw new Error(`${tool.toolId}.signerSubject is not a safe bounded string or null`);
  }
  if (tool.signerThumbprint !== null && !/^[0-9A-F]{40}$/u.test(tool.signerThumbprint)) {
    throw new Error(`${tool.toolId}.signerThumbprint must be null or uppercase SHA-1`);
  }
  validateSignatureObservation(tool);
  if (!Array.isArray(tool.licenseNotices)) {
    throw new Error(`${tool.toolId}.licenseNotices must be an array`);
  }
  const licensePaths = [];
  for (const [noticeIndex, notice] of tool.licenseNotices.entries()) {
    requirePlainObject(notice, `${tool.toolId}.licenseNotices[${noticeIndex}]`);
    requireExactKeys(
      notice,
      ["path", "bytes", "sha256"],
      `${tool.toolId}.licenseNotices[${noticeIndex}]`,
    );
    requireCanonicalRelativePath(notice.path, `${tool.toolId} license notice path`);
    requireUnsignedDecimal(notice.bytes, `${tool.toolId} license notice bytes`);
    if (!LOWERCASE_SHA256.test(notice.sha256)) {
      throw new Error(`${tool.toolId} license notice sha256 must be lowercase SHA-256`);
    }
    licensePaths.push(notice.path);
  }
  if (licensePaths.some((path, index) => index > 0 && path <= licensePaths[index - 1])) {
    throw new Error(`${tool.toolId}.licenseNotices must be unique and path-sorted`);
  }
  requireSha256OrNull(tool.licenseNoticeSha256, `${tool.toolId}.licenseNoticeSha256`);
  if (tool.licenseNotices.length === 0) {
    if (tool.licenseNoticeDigestMethod !== "NOT_APPLICABLE" || tool.licenseNoticeSha256 !== null) {
      throw new Error(`${tool.toolId} empty license notices must be NOT_APPLICABLE`);
    }
  } else {
    if (tool.licenseNoticeDigestMethod !== "CANONICAL_JSON_ORDERED_PATH_BYTES_SHA256_V1") {
      throw new Error(`${tool.toolId} license notice digest method changed`);
    }
    if (tool.licenseNoticeSha256 !== licenseNoticeManifestDigest(tool.licenseNotices)) {
      throw new Error(`${tool.toolId} license notice aggregate digest mismatch`);
    }
  }
  if (
    !new Set(["NOT_LAUNCHED", "ELIGIBLE", "LAUNCHED", "BLOCKED", "FAILED"]).has(tool.launchStatus)
  ) {
    throw new Error(`${tool.toolId}.launchStatus is not closed`);
  }
  if (new Set(["ELIGIBLE", "LAUNCHED"]).has(tool.launchStatus) && tool.observedSha256 === null) {
    throw new Error(`${tool.toolId} cannot launch without an observed digest`);
  }
  validateProvenance(tool);
}

export function licenseNoticeManifestDigest(records) {
  if (!Array.isArray(records)) throw new TypeError("license notice records must be an array");
  return createHash("sha256").update(JSON.stringify(records), "utf8").digest("hex");
}

export function validatePreflightToolManifest(value) {
  requirePlainObject(value, "tool manifest");
  requireExactKeys(
    value,
    ["schema", "creditable", "evidenceStatus", "sourceCommit", "tools"],
    "tool manifest",
  );
  if (value.schema !== PREFLIGHT_SCHEMAS.toolManifest)
    throw new Error("tool manifest schema changed");
  requireNonEvidenceEnvelope(value, "tool manifest");
  requireCommit(value.sourceCommit, "tool manifest sourceCommit");
  if (!Array.isArray(value.tools) || value.tools.length !== TOOL_IDS.length) {
    throw new Error(`tool manifest must contain exactly ${TOOL_IDS.length} tools`);
  }
  value.tools.forEach(validateTool);
  return value;
}

export function validateAttempt002ToolManifest(value) {
  validatePreflightToolManifest(value);
  const nvda = value.tools.find((tool) => tool.toolId === "nvda");
  if (
    !nvda ||
    nvda.licenseNotices.length === 0 ||
    nvda.licenseNoticeDigestMethod !== "CANONICAL_JSON_ORDERED_PATH_BYTES_SHA256_V1" ||
    !LOWERCASE_SHA256.test(nvda.licenseNoticeSha256) ||
    nvda.licenseNoticeSha256 !== licenseNoticeManifestDigest(nvda.licenseNotices)
  ) {
    throw new Error("attempt-002 requires a nonempty hash-bound NVDA license/notice inventory");
  }
  return value;
}

export function validatePreflightPlanEnvelope(value) {
  requirePlainObject(value, "preflight plan");
  requireExactKeys(
    value,
    [
      "schema",
      "creditable",
      "evidenceStatus",
      "sourceCommit",
      "visualCells",
      "observations",
      "accessibilityChecks",
      "riskIntersections",
      "transitionFamilies",
      "gates",
      "rawOutputPolicy",
    ],
    "preflight plan",
  );
  if (value.schema !== PREFLIGHT_SCHEMAS.plan) throw new Error("preflight plan schema changed");
  requireNonEvidenceEnvelope(value, "preflight plan");
  requireCommit(value.sourceCommit, "preflight plan sourceCommit");
  if (!Array.isArray(value.visualCells) || value.visualCells.length !== 30) {
    throw new Error("preflight plan must contain exactly 30 visual cells");
  }
  if (!Array.isArray(value.observations) || value.observations.length !== 120) {
    throw new Error("preflight plan must contain exactly 120 observations");
  }
  if (!Array.isArray(value.transitionFamilies) || value.transitionFamilies.length !== 8) {
    throw new Error("preflight plan must contain exactly eight transition families");
  }
  requirePlainObject(value.gates, "preflight plan gates");
  requireExactKeys(
    value.gates,
    [
      "pngEncodedMaxBytes",
      "pngDecodedMaxBytes",
      "jsonMaxBytes",
      "textMaxBytes",
      "physicalKeyMaxChars",
      "transientRootMaxChars",
      "fullPathMaxChars",
      "cleanRepeatChangedPixels",
      "pngNormalization",
      "unexpectedEgress",
      "networkIsolationAuthority",
      "aggregateMaximumBytes",
    ],
    "preflight plan gates",
  );
  const expectedGates = {
    pngEncodedMaxBytes: "8388608",
    pngDecodedMaxBytes: "8388608",
    jsonMaxBytes: "262144",
    textMaxBytes: "131072",
    physicalKeyMaxChars: 90,
    transientRootMaxChars: 128,
    fullPathMaxChars: 240,
    cleanRepeatChangedPixels: 0,
    pngNormalization: "RGBA8_SRGB_CRITICAL_CHUNKS_ONLY",
    unexpectedEgress: "FAIL",
    networkIsolationAuthority: "UNATTEMPTED",
    aggregateMaximumBytes: "536870912",
  };
  if (JSON.stringify(value.gates) !== JSON.stringify(expectedGates)) {
    throw new Error("preflight plan gates changed");
  }
  if (value.rawOutputPolicy !== "DISCARD_ALL_RETAIN_SANITIZED_AGGREGATES_ONLY") {
    throw new Error("preflight plan raw-output policy changed");
  }
  return value;
}

export function validatePreflightResult(value) {
  requirePlainObject(value, "preflight result");
  requireExactKeys(
    value,
    [
      "schema",
      "creditable",
      "evidenceStatus",
      "sourceCommit",
      "planDigest",
      "toolManifestDigest",
      "smokeResultDigest",
      "networkIsolation",
      "status",
      "conducted",
      "passed",
      "failed",
      "blocked",
      "requiredUnattempted",
      "peakBytes",
      "projectedFullRunPeakBytes",
      "retainedRawBytes",
      "notes",
    ],
    "preflight result",
  );
  if (value.schema !== PREFLIGHT_SCHEMAS.result) throw new Error("preflight result schema changed");
  requireNonEvidenceEnvelope(value, "preflight result");
  requireCommit(value.sourceCommit, "preflight result sourceCommit");
  if (!LOWERCASE_SHA256.test(value.planDigest))
    throw new Error("planDigest must be lowercase SHA-256");
  if (!LOWERCASE_SHA256.test(value.toolManifestDigest)) {
    throw new Error("toolManifestDigest must be lowercase SHA-256");
  }
  requireSha256OrNull(value.smokeResultDigest, "smokeResultDigest");
  if (value.networkIsolation !== PREFLIGHT_NETWORK_ISOLATION_STATUS) {
    throw new Error("preflight cannot claim authoritative network isolation");
  }
  if (!new Set(["PASS", "FAIL", "BLOCKED"]).has(value.status)) {
    throw new Error("preflight result status is not closed");
  }
  for (const field of ["conducted", "passed", "failed", "blocked", "requiredUnattempted"]) {
    if (!Number.isSafeInteger(value[field]) || value[field] < 0) {
      throw new Error(`${field} must be a nonnegative safe integer`);
    }
  }
  if (value.conducted !== value.passed + value.failed) {
    throw new Error("conducted must equal passed plus failed");
  }
  for (const field of ["peakBytes", "projectedFullRunPeakBytes", "retainedRawBytes"]) {
    requireUnsignedDecimal(value[field], field);
  }
  if (value.retainedRawBytes !== "0") throw new Error("preflight cannot retain raw bytes");
  if (
    value.status === "PASS" &&
    (value.failed > 0 || value.blocked > 0 || value.requiredUnattempted > 0)
  ) {
    throw new Error(
      "preflight PASS cannot contain failures, blocks, or required unattempted checks",
    );
  }
  if (!Array.isArray(value.notes) || !value.notes.every((note) => typeof note === "string")) {
    throw new Error("preflight result notes must be strings");
  }
  return value;
}

export function validatePreflightDiscard(value) {
  requirePlainObject(value, "preflight discard");
  requireExactKeys(
    value,
    [
      "schema",
      "creditable",
      "evidenceStatus",
      "sourceCommit",
      "planDigest",
      "resultDigest",
      "toolManifestDigest",
      "smokeResultDigest",
      "notE2",
      "discardedRawBytes",
      "residualRawBytes",
      "status",
    ],
    "preflight discard",
  );
  if (value.schema !== PREFLIGHT_SCHEMAS.discard)
    throw new Error("preflight discard schema changed");
  requireNonEvidenceEnvelope(value, "preflight discard");
  requireCommit(value.sourceCommit, "preflight discard sourceCommit");
  requireSha256OrNull(value.planDigest, "preflight discard planDigest");
  requireSha256OrNull(value.resultDigest, "preflight discard resultDigest");
  requireSha256OrNull(value.toolManifestDigest, "preflight discard toolManifestDigest");
  requireSha256OrNull(value.smokeResultDigest, "preflight discard smokeResultDigest");
  if (value.planDigest === null || value.resultDigest === null) {
    throw new Error("preflight discard must bind plan and result digests");
  }
  if (value.toolManifestDigest === null) {
    throw new Error("preflight discard must bind the tool manifest digest");
  }
  if (value.notE2 !== true) throw new Error("preflight discard must declare notE2 true");
  requireUnsignedDecimal(value.discardedRawBytes, "discardedRawBytes");
  requireUnsignedDecimal(value.residualRawBytes, "residualRawBytes");
  if (value.residualRawBytes !== "0")
    throw new Error("preflight discard must leave zero raw bytes");
  if (value.status !== "PASS") throw new Error("preflight discard status must be PASS");
  return value;
}

export function validateAttempt002Result(value) {
  requirePlainObject(value, "attempt-002 result");
  requireExactKeys(
    value,
    [
      "schema",
      "creditable",
      "evidenceStatus",
      "attemptId",
      "productSourceCommit",
      "authorityDigest",
      "planDigest",
      "toolManifestDigest",
      "networkIsolationStatus",
      "status",
      "conducted",
      "passed",
      "failed",
      "blocked",
      "requiredUnattempted",
      "observerPeakRssBytes",
      "sampleRawInventoryLogicalBytes",
      "sampleDistinctCellCount",
      "sampleObservationCount",
      "sampleObservationArtifactFileCount",
      "fullRunCellCount",
      "fullRunArtifactCount",
      "diskScaleNumerator",
      "diskScaleDenominator",
      "diskSafetyFactorNumerator",
      "diskSafetyFactorDenominator",
      "conservativeFullRunDiskBudgetBytes",
      "rawInventoryDigest",
      "buildInventoryDigest",
      "rawBytesBeforeDiscard",
      "buildBytesBeforeDiscard",
      "retainedRawBytes",
      "retainedBuildBytes",
      "notes",
    ],
    "attempt-002 result",
  );
  if (
    value.schema !== PREFLIGHT_SCHEMAS.resultV2 ||
    value.creditable !== false ||
    value.evidenceStatus !== PREFLIGHT_EVIDENCE_STATUS ||
    value.attemptId !== "attempt-002-observer" ||
    value.productSourceCommit !== "fea1f5fadb2307ca611379f30461a7ee47861fff"
  ) {
    throw new Error("attempt-002 result closed identity changed");
  }
  for (const field of [
    "authorityDigest",
    "planDigest",
    "toolManifestDigest",
    "rawInventoryDigest",
    "buildInventoryDigest",
  ]) {
    if (!LOWERCASE_SHA256.test(value[field]))
      throw new Error(`attempt-002 result ${field} is invalid`);
  }
  if (!new Set(["PASS", "FAIL"]).has(value.networkIsolationStatus))
    throw new Error("attempt-002 result network status is not closed");
  if (!new Set(["PASS", "FAIL", "BLOCKED"]).has(value.status))
    throw new Error("attempt-002 result status is not closed");
  for (const field of ["conducted", "passed", "failed", "blocked", "requiredUnattempted"]) {
    if (!Number.isSafeInteger(value[field]) || value[field] < 0)
      throw new Error(`attempt-002 result ${field} is invalid`);
  }
  if (
    value.conducted !== value.passed + value.failed ||
    value.passed + value.failed + value.blocked !== 144 ||
    value.requiredUnattempted > value.blocked
  )
    throw new Error("attempt-002 result counts do not reconcile to 144");
  for (const field of [
    "observerPeakRssBytes",
    "sampleRawInventoryLogicalBytes",
    "sampleDistinctCellCount",
    "sampleObservationCount",
    "sampleObservationArtifactFileCount",
    "fullRunCellCount",
    "fullRunArtifactCount",
    "diskScaleNumerator",
    "diskScaleDenominator",
    "diskSafetyFactorNumerator",
    "diskSafetyFactorDenominator",
    "conservativeFullRunDiskBudgetBytes",
    "rawBytesBeforeDiscard",
    "buildBytesBeforeDiscard",
    "retainedRawBytes",
    "retainedBuildBytes",
  ])
    requireUnsignedDecimal(value[field], `attempt-002 result ${field}`);
  validateCapacityContract(value, "attempt-002 result");
  if (value.sampleRawInventoryLogicalBytes !== value.rawBytesBeforeDiscard) {
    throw new Error(
      "attempt-002 result sampleRawInventoryLogicalBytes must equal rawBytesBeforeDiscard",
    );
  }
  if (value.retainedRawBytes !== "0" || value.retainedBuildBytes !== "0")
    throw new Error("attempt-002 sanitized result cannot retain raw or build bytes");
  if (
    !Array.isArray(value.notes) ||
    value.notes.some(
      (entry) =>
        typeof entry !== "string" ||
        /https?:|127\.0\.0\.1|localhost|[a-z]:\\|\\\\|\bpid\b|\bport\b/iu.test(entry),
    )
  )
    throw new Error("attempt-002 result notes contain a locator or are not strings");
  return value;
}

export function validateAttempt002Discard(value) {
  requirePlainObject(value, "attempt-002 discard");
  requireExactKeys(
    value,
    [
      "schema",
      "creditable",
      "evidenceStatus",
      "attemptId",
      "authorityDigest",
      "resultFileSha256",
      "discardedRawBytes",
      "discardedBuildBytes",
      "residualRawBytes",
      "residualBuildBytes",
      "cleanupStatus",
      "evidenceQualification",
    ],
    "attempt-002 discard",
  );
  if (
    value.schema !== PREFLIGHT_SCHEMAS.discardV2 ||
    value.creditable !== false ||
    value.evidenceStatus !== PREFLIGHT_EVIDENCE_STATUS ||
    value.attemptId !== "attempt-002-observer" ||
    value.cleanupStatus !== "PASS" ||
    value.evidenceQualification !== "NOT_E2" ||
    !LOWERCASE_SHA256.test(value.authorityDigest) ||
    !LOWERCASE_SHA256.test(value.resultFileSha256)
  )
    throw new Error("attempt-002 discard closed identity changed");
  for (const field of [
    "discardedRawBytes",
    "discardedBuildBytes",
    "residualRawBytes",
    "residualBuildBytes",
  ])
    requireUnsignedDecimal(value[field], `attempt-002 discard ${field}`);
  if (value.residualRawBytes !== "0" || value.residualBuildBytes !== "0")
    throw new Error("attempt-002 discard must leave zero owned bytes");
  return value;
}

export function validatePreflightSmokeResult(value) {
  requirePlainObject(value, "preflight smoke result");
  requireExactKeys(
    value,
    [
      "schema",
      "creditable",
      "evidenceStatus",
      "sourceCommit",
      "planDigest",
      "toolManifestSha256",
      "status",
      "startedAt",
      "endedAt",
      "durationMilliseconds",
      "checks",
      "launchedTools",
      "launchedToolProcessCount",
      "networkIsolation",
      "prelaunchSandboxAttempt",
      "captureCounts",
      "nvdaStatus",
      "ocrStatus",
      "rawRootsPendingDiscard",
      "notes",
    ],
    "preflight smoke result",
  );
  if (value.schema !== PREFLIGHT_SCHEMAS.smokeResult) {
    throw new Error("preflight smoke result schema changed");
  }
  requireNonEvidenceEnvelope(value, "preflight smoke result");
  requireCommit(value.sourceCommit, "preflight smoke result sourceCommit");
  if (
    !LOWERCASE_SHA256.test(value.planDigest) ||
    !LOWERCASE_SHA256.test(value.toolManifestSha256)
  ) {
    throw new Error("preflight smoke result digests must be lowercase SHA-256");
  }
  if (value.status !== "PASS") throw new Error("preflight smoke result must be PASS");
  for (const field of ["startedAt", "endedAt"]) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3,7}Z$/u.test(value[field])) {
      throw new Error(`preflight smoke result ${field} must be a canonical UTC timestamp`);
    }
  }
  if (!Number.isSafeInteger(value.durationMilliseconds) || value.durationMilliseconds < 0) {
    throw new Error("preflight smoke duration must be a nonnegative safe integer");
  }
  requirePlainObject(value.checks, "preflight smoke checks");
  requireExactKeys(
    value.checks,
    [
      "loopbackServer",
      "driverReady",
      "sessionCreated",
      "documentTitle",
      "domHeading",
      "focus",
      "interaction",
      "loopbackOrigin",
      "unexpectedExternalRequests",
      "deniedExecutableLaunches",
      "externalConnectionsObserved",
      "lingeringToolProcesses",
    ],
    "preflight smoke checks",
  );
  for (const field of [
    "loopbackServer",
    "driverReady",
    "sessionCreated",
    "documentTitle",
    "domHeading",
    "focus",
    "interaction",
    "loopbackOrigin",
  ]) {
    if (value.checks[field] !== "PASS") throw new Error(`preflight smoke ${field} must PASS`);
  }
  for (const field of [
    "unexpectedExternalRequests",
    "deniedExecutableLaunches",
    "externalConnectionsObserved",
    "lingeringToolProcesses",
  ]) {
    if (value.checks[field] !== 0) throw new Error(`preflight smoke ${field} must be zero`);
  }
  if (
    !Array.isArray(value.launchedTools) ||
    JSON.stringify(value.launchedTools) !==
      JSON.stringify(["chrome-win64/chrome.exe", "chromedriver-win64/chromedriver.exe"])
  ) {
    throw new Error("preflight smoke launched tools changed");
  }
  if (!Number.isSafeInteger(value.launchedToolProcessCount) || value.launchedToolProcessCount < 2) {
    throw new Error("preflight smoke launched tool process count is invalid");
  }
  if (
    value.networkIsolation !== PREFLIGHT_NETWORK_ISOLATION_STATUS ||
    value.prelaunchSandboxAttempt !== "BLOCKED_BEFORE_TOOL_LAUNCH" ||
    value.nvdaStatus !== "BLOCKED_NOT_LAUNCHED" ||
    value.ocrStatus !== "BLOCKED_NOT_ACQUIRED"
  ) {
    throw new Error("preflight smoke bounded status changed");
  }
  requirePlainObject(value.captureCounts, "preflight smoke captureCounts");
  requireExactKeys(
    value.captureCounts,
    ["visualCells", "observations", "artifacts", "transitions"],
    "preflight smoke captureCounts",
  );
  if (Object.values(value.captureCounts).some((count) => count !== 0)) {
    throw new Error("preflight smoke cannot claim capture work");
  }
  requirePlainObject(value.rawRootsPendingDiscard, "preflight smoke rawRootsPendingDiscard");
  requireExactKeys(
    value.rawRootsPendingDiscard,
    ["count", "files", "bytes", "reparsePoints"],
    "preflight smoke rawRootsPendingDiscard",
  );
  if (
    value.rawRootsPendingDiscard.count !== 2 ||
    value.rawRootsPendingDiscard.files !== 178 ||
    value.rawRootsPendingDiscard.bytes !== 4690311 ||
    value.rawRootsPendingDiscard.reparsePoints !== 0
  ) {
    throw new Error("preflight smoke pending raw inventory changed");
  }
  if (!Array.isArray(value.notes) || !value.notes.every((note) => typeof note === "string")) {
    throw new Error("preflight smoke notes must be strings");
  }
  return value;
}
