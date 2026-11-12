export const SUCCESS_ROOT_KEYS = Object.freeze([
  "schema",
  "receiptVersion",
  "authorityCommit",
  "authorityArtifactSha256",
  "sourceMainCommit",
  "transactionId",
  "state",
  "outcome",
  "externalActionAuthorized",
  "executionAuthorityPresent",
  "executionAllowed",
  "requestCount",
  "bootstrap",
  "download",
  "verification",
  "licenseEvidence",
  "sbomInventory",
  "scriptAbsence",
  "hostIsolationEvidence",
  "retentionDecision",
  "cleanupEvidence",
]);
export const FAILURE_ROOT_KEYS = Object.freeze([
  "schema",
  "receiptVersion",
  "authorityCommit",
  "transactionId",
  "outcome",
  "lastCompletedState",
  "reason",
  "authorityConsumed",
  "requestCount",
  "cleanupEvidence",
]);
const VERIFY_KEYS = Object.freeze([
  "observedSha256",
  "authenticodeObservedSha256",
  "authenticodeFileIdentityBefore",
  "authenticodeFileIdentityAfter",
  "authenticodeHandlePolicy",
  "authenticodeIdentityStable",
  "authenticodeStatus",
  "authenticodeSignatureType",
  "codeSigningEku",
  "signerSubject",
  "signerThumbprint",
  "signerIssuer",
  "signerSerial",
  "signerNotBeforeUtc",
  "signerNotAfterUtc",
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
]);
const SCRIPT_KEYS = Object.freeze([
  "pathIdentifier",
  "gitBlobSha1",
  "byteCount",
  "sha256",
  "utf16leByteCount",
  "base64CharacterCount",
  "encodedCommandSha256",
  "renderedCommandLineUtf16Units",
]);
const ADDTYPE_KEYS = Object.freeze([
  "pathIdentifier",
  "gitBlobSha1",
  "byteCount",
  "sha256",
  "embeddedSha256",
  "embeddedSourceEqual",
  "dllImports",
  "safeHandleTypes",
]);
const HOST_KEYS = Object.freeze([
  "policyPinDigest",
  "observedImageFileIdentity",
  "observedImageSha256",
  "signaturePolicy",
  "identityStable",
]);
const LEASE_KEYS = Object.freeze([
  "ancestorCount",
  "reparseCount",
  "volumeStable",
  "deleteShareDenied",
  "scriptIdentity",
  "auditIdentity",
  "policyIdentity",
  "helperIdentity",
  "identitiesStable",
]);
const BUILD_KEYS = Object.freeze([
  "mechanism",
  "sourcePathIdentifier",
  "sourceSha256",
  "compilerSha256",
  "orderedArgumentsSha256",
  "environmentSha256",
  "outputByteCount",
  "outputSha256",
  "outputMachine",
  "exitCode",
  "cleanupComplete",
]);
const PROCESS_KEYS = Object.freeze([
  "launchMode",
  "jobActiveLimit",
  "killOnClose",
  "breakaway",
  "imageIdentityBefore",
  "imageIdentityAfter",
  "imageSha256Before",
  "imageSha256After",
  "exitCode",
  "descendantCount",
]);
const DOWNLOAD_KEYS = Object.freeze([
  "method",
  "url",
  "maximumBodyBytes",
  "observedByteCount",
  "redirectCount",
  "retryCount",
  "resumeUsed",
  "proxyUsed",
  "credentialsUsed",
  "cookiesUsed",
  "customTrustUsed",
]);
const FAILURE_REASONS = Object.freeze({
  NOT_STARTED: Object.freeze([
    "POLICY_INVALID",
    "SOURCE_CONTROL_INVALID",
    "BOOTSTRAP_BYTES_INVALID",
    "COMMAND_LINE_INVALID",
    "HOST_PRECHECK_INVALID",
  ]),
  BOOTSTRAP_BYTES_VERIFIED: Object.freeze([
    "ADDTYPE_UNAVAILABLE",
    "ADDTYPE_SOURCE_MISMATCH",
    "ADDTYPE_COMPILE_FAILED",
    "ADDTYPE_BOOTSTRAP_RESIDUE",
  ]),
  ADDTYPE_READY: Object.freeze([
    "LEASE_PATH_INVALID",
    "LEASE_REPARSE_OR_VOLUME_INVALID",
    "LEASE_IDENTITY_INVALID",
  ]),
  LEASES_HELD: Object.freeze([
    "HOST_IDENTITY_INVALID",
    "HOST_SIGNATURE_INVALID",
    "HOST_CATALOG_SIGNATURE_INVALID",
    "COMPILER_IDENTITY_INVALID",
  ]),
  HOST_VERIFIED: Object.freeze([
    "AUTHORITY_ALREADY_CONSUMED",
    "ACTIVATION_INVALID",
    "CONSUMPTION_RECORD_FAILED",
  ]),
  ACTIVATION_CONSUMED: Object.freeze([
    "HELPER_BUILD_FAILED",
    "HELPER_BUILD_TIMEOUT",
    "HELPER_BUILD_OUTPUT_LIMIT",
    "HELPER_RESIDUE_INVALID",
  ]),
  HELPER_READY: Object.freeze([
    "TARGET_CREATE_FAILED",
    "TARGET_IDENTITY_INVALID",
    "DOWNLOAD_START_FAILED",
  ]),
  DOWNLOAD_IN_PROGRESS: Object.freeze([
    "DOWNLOAD_FAILED",
    "REQUEST_COUNT_INVALID",
    "REDIRECT_RETRY_RESUME_INVALID",
    "BODY_LIMIT_EXCEEDED",
    "CONTENT_LENGTH_INVALID",
  ]),
  BYTES_RECEIVED: Object.freeze(["HASH_MISMATCH", "BYTE_COUNT_INVALID", "FILE_IDENTITY_DRIFT"]),
  HASH_VERIFIED: Object.freeze([
    "SIGNATURE_INVALID",
    "CATALOG_SIGNATURE_REJECTED",
    "OFFLINE_REVOCATION_UNAVAILABLE",
    "CERTIFICATE_FIELDS_INVALID",
    "VERSION_INVALID",
  ]),
  SIGNATURE_VERIFIED: Object.freeze([
    "LICENSE_EVIDENCE_INVALID",
    "SBOM_INVALID",
    "SCRIPT_INVENTORY_INVALID",
    "RECEIPT_INVALID",
  ]),
  RECEIPT_RECORDED: Object.freeze(["RETENTION_SEAL_FAILED", "CLEANUP_FAILED"]),
});
const PRE_CONSUMPTION_STATES = Object.freeze([
  "NOT_STARTED",
  "BOOTSTRAP_BYTES_VERIFIED",
  "ADDTYPE_READY",
  "LEASES_HELD",
  "HOST_VERIFIED",
]);
const REQUEST_STARTED_STATES = Object.freeze([
  "DOWNLOAD_IN_PROGRESS",
  "BYTES_RECEIVED",
  "HASH_VERIFIED",
  "SIGNATURE_VERIFIED",
  "RECEIPT_RECORDED",
]);
const LICENSE_EVIDENCE = Object.freeze({
  spdx: "Apache-2.0",
  repositoryEvidence: Object.freeze({
    path: "docs/2026-11-10_r4b_roslyn_pinned_determinism_v1.md",
    commit: "d6607300e52219c5d534e70c17e00e2e717e505b",
    gitBlobSha1: "0323602a2f828245b42e88bb10c794a3b8a19a7f",
    contentSha256: "9fc89d301aaaabe8f52c6574ca9e518d09a6af4296130d03d3baf71122baef9f",
    byteCount: 6645,
  }),
  primarySource: Object.freeze({
    repository: "https://github.com/NuGet/NuGet.Client",
    licenseUrl:
      "https://github.com/NuGet/NuGet.Client/blob/977537e19c6be57fead1411e6cf05f936bf1baf4/LICENSE.txt",
    sourceCommit: "977537e19c6be57fead1411e6cf05f936bf1baf4",
    sourceTag: "7.9.0.83",
    licensePath: "LICENSE.txt",
    licenseGitBlobSha1: "86930deb63793b92ece8bbe56aaa3c1e531dc2be",
    licenseContentSha256: "f1e3c903178e459ebd0c25d2dc65ebf11163c0a0d3ae46690943dffd5813040e",
    licenseByteCount: 594,
  }),
  packageEvidence: Object.freeze({
    url: "https://www.nuget.org/packages/NuGet.CommandLine/7.9.0",
    version: "7.9.0",
    fileVersion: "7.9.0.83",
  }),
  provenance: "COMMITTED_PRIMARY_SOURCE",
});

function fail() {
  throw new Error("VERIFIER_RECEIPT_INVALID");
}
function plain(value) {
  return (
    value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype
  );
}
function keys(value, expected) {
  if (!plain(value) || JSON.stringify(Object.keys(value)) !== JSON.stringify(expected)) fail();
}
function exact(value, expected) {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail();
}
function hex(value, length) {
  return typeof value === "string" && new RegExp(`^[0-9a-f]{${length}}$`, `u`).test(value);
}
function text(value, max = 512) {
  return (
    typeof value === "string" && value.length > 0 && value.length <= max && !/[\p{Cc}]/u.test(value)
  );
}
function utc(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value) &&
    new Date(value).toISOString().replace(".000Z", "Z") === value
  );
}
function noPrivate(value) {
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (["pid", "stdout", "stderr", "error"].includes(key)) fail();
      noPrivate(child);
    }
    return;
  }
  if (
    typeof value === "string" &&
    (/^[A-Za-z]:\\/u.test(value) || value.includes("\\Users\\") || value.includes("\\Temp\\"))
  )
    fail();
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function validateVerificationEvidence(verification, expectedSha256) {
  keys(verification, VERIFY_KEYS);
  if (
    verification.observedSha256 !== expectedSha256 ||
    verification.authenticodeObservedSha256 !== expectedSha256 ||
    !hex(verification.authenticodeFileIdentityBefore, 64) ||
    verification.authenticodeFileIdentityAfter !== verification.authenticodeFileIdentityBefore ||
    verification.authenticodeHandlePolicy !== "READ_ONLY_DENY_WRITE_DELETE_HELD" ||
    verification.authenticodeIdentityStable !== true ||
    verification.authenticodeStatus !== "Valid" ||
    verification.authenticodeSignatureType !== "Authenticode" ||
    verification.codeSigningEku !== "1.3.6.1.5.5.7.3.3" ||
    !text(verification.signerSubject) ||
    !text(verification.signerIssuer) ||
    !/^[0-9A-F]{40}$/u.test(verification.signerThumbprint) ||
    !/^[0-9A-F]{1,80}$/u.test(verification.signerSerial) ||
    !utc(verification.signerNotBeforeUtc) ||
    !utc(verification.signerNotAfterUtc) ||
    !text(verification.timestampSubject) ||
    !/^[0-9A-F]{40}$/u.test(verification.timestampThumbprint) ||
    !utc(verification.timestampUtc) ||
    Date.parse(verification.signerNotBeforeUtc) > Date.parse(verification.timestampUtc) ||
    Date.parse(verification.timestampUtc) > Date.parse(verification.signerNotAfterUtc) ||
    verification.signatureChainStatus !== "Trusted" ||
    verification.revocationNetworkPolicy !== "OFFLINE_CACHE_ONLY_NO_NETWORK" ||
    verification.signerChainRevocationMode !== "Offline" ||
    verification.signerChainRevocationFlag !== "EntireChain" ||
    verification.signerChainVerificationFlags !== "NoFlag" ||
    verification.signerRevocationEvidenceStatus !== "VALID_WITH_COMPLETE_OFFLINE_REVOCATION" ||
    verification.timestampChainStatus !== "Trusted" ||
    verification.timestampChainRevocationMode !== "Offline" ||
    verification.timestampChainRevocationFlag !== "EntireChain" ||
    verification.timestampChainVerificationFlags !== "NoFlag" ||
    verification.timestampRevocationEvidenceStatus !== "VALID_WITH_COMPLETE_OFFLINE_REVOCATION" ||
    verification.productVersion !== "7.9.0" ||
    verification.fileVersion !== "7.9.0.83"
  )
    fail();
  noPrivate(verification);
  return true;
}

export function parseAndValidateAuthenticodeHelperOutput(output, expectedSha256) {
  if (!Buffer.isBuffer(output) || output.length <= 0 || output.length > 16384) fail();
  if (output.length >= 3 && output[0] === 0xef && output[1] === 0xbb && output[2] === 0xbf) fail();
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(output);
  } catch {
    fail();
  }
  if (source.charCodeAt(0) === 0xfeff) fail();
  let verification;
  try {
    verification = JSON.parse(source);
  } catch {
    fail();
  }
  if (JSON.stringify(verification) !== source) fail();
  validateVerificationEvidence(verification, expectedSha256);
  return deepFreeze(verification);
}

export function validateVerifierSuccessReceipt(policy, receipt, helperOutput) {
  keys(receipt, SUCCESS_ROOT_KEYS);
  if (
    receipt.schema !== "fluyo:r4b:roslyn-verifier-bytes-receipt:v1" ||
    receipt.receiptVersion !== "VERIFIER_BYTES_VERIFIED_V1" ||
    receipt.state !== "RECEIPT_RECORDED" ||
    receipt.outcome !== "BYTES_VERIFIED_PENDING_EXECUTION_REVIEW" ||
    receipt.externalActionAuthorized !== false ||
    receipt.executionAuthorityPresent !== false ||
    receipt.executionAllowed !== false ||
    receipt.requestCount !== 1 ||
    !hex(receipt.authorityCommit, 40) ||
    !hex(receipt.authorityArtifactSha256, 64) ||
    receipt.sourceMainCommit !== policy.sourceControl.sourceMainCommit ||
    receipt.transactionId !== policy.futureActivation.transactionId
  )
    fail();
  keys(receipt.bootstrap, policy.receiptContract.bootstrapRootKeys);
  if (
    receipt.bootstrap.mechanism !== policy.bootstrap.mechanism ||
    !hex(receipt.bootstrap.policySha256, 64) ||
    !hex(receipt.bootstrap.designCommit, 40)
  )
    fail();
  keys(receipt.bootstrap.script, SCRIPT_KEYS);
  const script = receipt.bootstrap.script;
  if (
    script.pathIdentifier !== policy.bootstrap.scriptPath ||
    !hex(script.gitBlobSha1, 40) ||
    !Number.isSafeInteger(script.byteCount) ||
    script.byteCount <= 0 ||
    script.byteCount > 11520 ||
    !hex(script.sha256, 64) ||
    !Number.isSafeInteger(script.utf16leByteCount) ||
    script.utf16leByteCount <= 0 ||
    script.utf16leByteCount > 23040 ||
    !Number.isSafeInteger(script.base64CharacterCount) ||
    script.base64CharacterCount <= 0 ||
    script.base64CharacterCount > 30720 ||
    !hex(script.encodedCommandSha256, 64) ||
    !Number.isSafeInteger(script.renderedCommandLineUtf16Units) ||
    script.renderedCommandLineUtf16Units <= 0 ||
    script.renderedCommandLineUtf16Units > 30960
  )
    fail();
  keys(receipt.bootstrap.addTypeSource, ADDTYPE_KEYS);
  const add = receipt.bootstrap.addTypeSource;
  if (
    add.pathIdentifier !== policy.bootstrap.auditSourcePath ||
    !hex(add.gitBlobSha1, 40) ||
    !Number.isSafeInteger(add.byteCount) ||
    add.byteCount <= 0 ||
    add.byteCount > 8704 ||
    !hex(add.sha256, 64) ||
    add.embeddedSha256 !== add.sha256 ||
    add.embeddedSourceEqual !== true ||
    JSON.stringify(add.dllImports) !==
      JSON.stringify({
        "kernel32.dll": [
          "CreateFileW",
          "GetFileInformationByHandleEx",
          "GetFinalPathNameByHandleW",
          "GetFileSizeEx",
          "SetFilePointerEx",
          "ReadFile",
          "CreateProcessW",
          "InitializeProcThreadAttributeList",
          "UpdateProcThreadAttribute",
          "DeleteProcThreadAttributeList",
          "ResumeThread",
          "TerminateProcess",
          "WaitForSingleObject",
          "GetExitCodeProcess",
          "QueryFullProcessImageNameW",
          "CreateJobObjectW",
          "SetInformationJobObject",
          "AssignProcessToJobObject",
        ],
        "wintrust.dll": ["WinVerifyTrust"],
        "crypt32.dll": [
          "CryptQueryObject",
          "CertGetCertificateChain",
          "CertVerifyCertificateChainPolicy",
          "CertFreeCertificateChain",
          "CertCloseStore",
          "CryptMsgClose",
          "CertFreeCertificateContext",
        ],
      }) ||
    JSON.stringify(add.safeHandleTypes) !==
      JSON.stringify([
        "SafeFileHandle",
        "SafeWaitHandle",
        "OwnedCertContext",
        "OwnedCertStore",
        "OwnedCertChain",
        "OwnedCryptMessage",
      ])
  )
    fail();
  keys(receipt.bootstrap.powerShellHost, HOST_KEYS);
  if (
    !hex(receipt.bootstrap.powerShellHost.policyPinDigest, 64) ||
    !hex(receipt.bootstrap.powerShellHost.observedImageFileIdentity, 64) ||
    !hex(receipt.bootstrap.powerShellHost.observedImageSha256, 64) ||
    receipt.bootstrap.powerShellHost.signaturePolicy !== "PINNED_MICROSOFT_OS_CATALOG_VALID" ||
    receipt.bootstrap.powerShellHost.identityStable !== true
  )
    fail();
  keys(receipt.bootstrap.leaseEvidence, LEASE_KEYS);
  const lease = receipt.bootstrap.leaseEvidence;
  if (
    !Number.isSafeInteger(lease.ancestorCount) ||
    lease.ancestorCount < 1 ||
    lease.ancestorCount > 64 ||
    lease.reparseCount !== 0 ||
    lease.volumeStable !== true ||
    lease.deleteShareDenied !== true ||
    lease.identitiesStable !== true ||
    ![lease.scriptIdentity, lease.auditIdentity, lease.policyIdentity, lease.helperIdentity].every(
      (value) => hex(value, 64),
    )
  )
    fail();
  keys(receipt.bootstrap.helperBuild, BUILD_KEYS);
  const build = receipt.bootstrap.helperBuild;
  if (
    build.mechanism !== "REPOSITORY_CSHARP_WINTRUST_X509CHAIN_V1" ||
    build.sourcePathIdentifier !== policy.bootstrap.helperSourcePath ||
    !hex(build.sourceSha256, 64) ||
    !hex(build.compilerSha256, 64) ||
    !hex(build.orderedArgumentsSha256, 64) ||
    !hex(build.environmentSha256, 64) ||
    !Number.isSafeInteger(build.outputByteCount) ||
    build.outputByteCount <= 0 ||
    build.outputByteCount > 16777216 ||
    !hex(build.outputSha256, 64) ||
    build.outputMachine !== "AMD64" ||
    build.exitCode !== 0 ||
    build.cleanupComplete !== true
  )
    fail();
  keys(receipt.bootstrap.helperProcess, PROCESS_KEYS);
  const process = receipt.bootstrap.helperProcess;
  if (
    process.launchMode !== "SUSPENDED_DIRECT_CREATEPROCESS" ||
    process.jobActiveLimit !== 1 ||
    process.killOnClose !== true ||
    process.breakaway !== false ||
    !hex(process.imageIdentityBefore, 64) ||
    process.imageIdentityAfter !== process.imageIdentityBefore ||
    !hex(process.imageSha256Before, 64) ||
    process.imageSha256After !== process.imageSha256Before ||
    process.exitCode !== 0 ||
    process.descendantCount !== 0
  )
    fail();
  keys(receipt.download, DOWNLOAD_KEYS);
  const download = receipt.download;
  if (
    download.method !== "GET" ||
    download.url !== policy.futureActivation.network.url ||
    download.maximumBodyBytes !== 16777216 ||
    !Number.isSafeInteger(download.observedByteCount) ||
    download.observedByteCount <= 0 ||
    download.observedByteCount > 16777216 ||
    download.redirectCount !== 0 ||
    download.retryCount !== 0 ||
    download.resumeUsed !== false ||
    download.proxyUsed !== false ||
    download.credentialsUsed !== false ||
    download.cookiesUsed !== false ||
    download.customTrustUsed !== false
  )
    fail();
  keys(receipt.verification, VERIFY_KEYS);
  const verification = receipt.verification,
    expected = policy.futureActivation.network.expectedSha256;
  const helperVerification = parseAndValidateAuthenticodeHelperOutput(helperOutput, expected);
  if (
    verification.observedSha256 !== expected ||
    verification.authenticodeObservedSha256 !== expected ||
    !hex(verification.authenticodeFileIdentityBefore, 64) ||
    verification.authenticodeFileIdentityAfter !== verification.authenticodeFileIdentityBefore ||
    verification.authenticodeHandlePolicy !== "READ_ONLY_DENY_WRITE_DELETE_HELD" ||
    verification.authenticodeIdentityStable !== true ||
    verification.authenticodeStatus !== "Valid" ||
    verification.authenticodeSignatureType !== "Authenticode" ||
    verification.codeSigningEku !== "1.3.6.1.5.5.7.3.3" ||
    !text(verification.signerSubject) ||
    !text(verification.signerIssuer) ||
    !/^[0-9A-F]{40}$/u.test(verification.signerThumbprint) ||
    !/^[0-9A-F]{1,80}$/u.test(verification.signerSerial) ||
    !utc(verification.signerNotBeforeUtc) ||
    !utc(verification.signerNotAfterUtc) ||
    !utc(verification.timestampUtc) ||
    Date.parse(verification.signerNotBeforeUtc) > Date.parse(verification.timestampUtc) ||
    Date.parse(verification.timestampUtc) > Date.parse(verification.signerNotAfterUtc) ||
    verification.signatureChainStatus !== "Trusted" ||
    verification.revocationNetworkPolicy !== "OFFLINE_CACHE_ONLY_NO_NETWORK" ||
    verification.signerChainRevocationMode !== "Offline" ||
    verification.signerChainRevocationFlag !== "EntireChain" ||
    verification.signerChainVerificationFlags !== "NoFlag" ||
    verification.signerRevocationEvidenceStatus !== "VALID_WITH_COMPLETE_OFFLINE_REVOCATION" ||
    verification.timestampChainStatus !== "Trusted" ||
    verification.timestampChainRevocationMode !== "Offline" ||
    verification.timestampChainRevocationFlag !== "EntireChain" ||
    verification.timestampChainVerificationFlags !== "NoFlag" ||
    verification.timestampRevocationEvidenceStatus !== "VALID_WITH_COMPLETE_OFFLINE_REVOCATION" ||
    verification.productVersion !== "7.9.0" ||
    verification.fileVersion !== "7.9.0.83"
  )
    fail();
  exact(verification, helperVerification);
  exact(receipt.licenseEvidence, LICENSE_EVIDENCE);
  if (!Array.isArray(receipt.sbomInventory) || receipt.sbomInventory.length !== 1) fail();
  keys(receipt.sbomInventory[0], [
    "pathIdentifier",
    "sha256",
    "byteCount",
    "productVersion",
    "fileVersion",
    "licenseSpdx",
  ]);
  const item = receipt.sbomInventory[0];
  if (
    item.pathIdentifier !== "nuget.exe" ||
    item.sha256 !== expected ||
    !Number.isSafeInteger(item.byteCount) ||
    item.byteCount <= 0 ||
    item.byteCount > 16777216 ||
    item.productVersion !== "7.9.0" ||
    item.fileVersion !== "7.9.0.83" ||
    item.licenseSpdx !== "Apache-2.0"
  )
    fail();
  exact(receipt.scriptAbsence, { scriptCount: 0, adjacentFileCount: 0 });
  exact(receipt.hostIsolationEvidence, {
    standardUser: true,
    freshExclusiveRoot: true,
    createNew: true,
    pathMutation: false,
    globalInstall: false,
    globalCache: false,
    globalConfig: false,
  });
  if (receipt.retentionDecision !== "RETAIN_HASH_BOUND_BYTES_PENDING_EXECUTION_REVIEW") fail();
  exact(receipt.cleanupEvidence, {
    stagingRemoved: true,
    rawLogsRetained: false,
    helperExeRemoved: true,
    helperPdbRemoved: true,
    addTypeTempRemoved: true,
    compilerTempRemoved: true,
    retainedFileCount: 1,
    extraFileCount: 0,
  });
  noPrivate(receipt);
  return true;
}

export function validateVerifierFailureReceipt(policy, receipt) {
  keys(receipt, FAILURE_ROOT_KEYS);
  if (
    receipt.schema !== "fluyo:r4b:roslyn-verifier-failure-receipt:v1" ||
    receipt.receiptVersion !== "VERIFIER_TRANSACTION_HOLD_V1" ||
    !hex(receipt.authorityCommit, 40) ||
    receipt.transactionId !== policy.futureActivation.transactionId ||
    !Object.hasOwn(FAILURE_REASONS, receipt.lastCompletedState) ||
    !FAILURE_REASONS[receipt.lastCompletedState].includes(receipt.reason) ||
    typeof receipt.authorityConsumed !== "boolean" ||
    !Number.isSafeInteger(receipt.requestCount) ||
    receipt.requestCount < 0 ||
    receipt.requestCount > 1
  )
    fail();
  keys(receipt.cleanupEvidence, [
    "cleanupAttempted",
    "cleanupComplete",
    "retainedSanitizedRecordOnly",
    "ownedResidueCount",
  ]);
  if (
    !Number.isSafeInteger(receipt.cleanupEvidence.ownedResidueCount) ||
    receipt.cleanupEvidence.ownedResidueCount < 0 ||
    receipt.cleanupEvidence.ownedResidueCount > 64
  )
    fail();
  const pre = receipt.outcome === "PRECONDITION_HOLD_NO_GET",
    cleaned = receipt.outcome === "FAILED_CLEANED_HOLD",
    failed = receipt.outcome === "FAILED_CLEANUP_HOLD",
    beforeConsumption = PRE_CONSUMPTION_STATES.includes(receipt.lastCompletedState),
    alreadyConsumed =
      receipt.lastCompletedState === "HOST_VERIFIED" &&
      receipt.reason === "AUTHORITY_ALREADY_CONSUMED",
    expectedRequestCount = REQUEST_STARTED_STATES.includes(receipt.lastCompletedState) ? 1 : 0;
  if (!pre && !cleaned && !failed) fail();
  if (
    beforeConsumption &&
    (!pre ||
      receipt.authorityConsumed !== alreadyConsumed ||
      receipt.requestCount !== 0 ||
      receipt.cleanupEvidence.cleanupAttempted !== false ||
      receipt.cleanupEvidence.cleanupComplete !== true ||
      receipt.cleanupEvidence.retainedSanitizedRecordOnly !== true ||
      receipt.cleanupEvidence.ownedResidueCount !== 0)
  )
    fail();
  if (
    !beforeConsumption &&
    ((!cleaned && !failed) ||
      receipt.authorityConsumed !== true ||
      receipt.requestCount !== expectedRequestCount)
  )
    fail();
  if (
    cleaned &&
    (receipt.cleanupEvidence.cleanupAttempted !== true ||
      receipt.cleanupEvidence.cleanupComplete !== true ||
      receipt.cleanupEvidence.retainedSanitizedRecordOnly !== true ||
      receipt.cleanupEvidence.ownedResidueCount !== 0)
  )
    fail();
  if (
    failed &&
    (receipt.cleanupEvidence.cleanupAttempted !== true ||
      receipt.cleanupEvidence.cleanupComplete !== false ||
      receipt.cleanupEvidence.retainedSanitizedRecordOnly !== true ||
      receipt.cleanupEvidence.ownedResidueCount === 0)
  )
    fail();
  noPrivate(receipt);
  return true;
}

export const verifierReceiptTesting = Object.freeze({
  FAILURE_REASONS,
  PRE_CONSUMPTION_STATES,
  REQUEST_STARTED_STATES,
  VERIFY_KEYS,
  LICENSE_EVIDENCE,
  noPrivate,
  validateVerificationEvidence,
});
