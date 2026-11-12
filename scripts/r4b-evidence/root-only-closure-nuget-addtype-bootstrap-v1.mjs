import { createHash } from "node:crypto";

export const BOOTSTRAP_POLICY_PATH =
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json";
export const BOOTSTRAP_MECHANISM = "CLOSED_ADD_TYPE_PINVOKE_LEASE_BOOTSTRAP_V1";
export const BOOTSTRAP_TERMINAL = "PRECONDITION_HOLD_NO_GET";
export const SYNTHETIC_EXECUTION_CONTRACT_VERSION = "R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.6";

const ROOT_KEYS = Object.freeze([
  "schema",
  "policyVersion",
  "decisionStatus",
  "decisionDate",
  "decisionReference",
  "externalActionAuthorized",
  "downloadAuthorityPresent",
  "executionAuthorityPresent",
  "sourceControl",
  "delegation",
  "powerShellHost",
  "bootstrap",
  "futureActivation",
  "receiptContract",
  "failureReceiptContract",
  "forbiddenActions",
]);
const SOURCE_CONTROL_KEYS = Object.freeze([
  "sourceMainCommit",
  "historicalAuthorityPath",
  "historicalAuthorityBlobSha1",
  "historicalAuthoritySha256",
  "decisionRecordPath",
  "handoffPath",
  "newSources",
  "designCommitRequiredBeforeActivation",
  "headChangeInvalidates",
]);
const SOURCE_KEYS = Object.freeze(["path", "role", "byteCount", "sha256", "gitBlobSha1"]);
const HOST_KEYS = Object.freeze([
  "signaturePolicy",
  "executable",
  "configuration",
  "automationAssembly",
  "utilityModuleManifest",
  "utilityModuleScript",
  "utilityAssembly",
  "clr",
  "mscorlib",
  "compiler",
  "compilerConfiguration",
  "compilerReferences",
]);
const HOST_RECORD_KEYS = Object.freeze([
  "path",
  "byteCount",
  "sha256",
  "fileVersion",
  "productVersion",
  "signatureStatus",
  "signatureType",
  "signerSubject",
  "signerThumbprint",
  "signerIssuer",
]);
const HOST_EXECUTABLE_RECORD_KEYS = Object.freeze([
  "path",
  "byteCount",
  "sha256",
  "normalizedImagePathSha256",
  "fileVersion",
  "productVersion",
  "signatureStatus",
  "signatureType",
  "signerSubject",
  "signerThumbprint",
  "signerIssuer",
]);
const BOOTSTRAP_KEYS = Object.freeze([
  "mechanism",
  "scriptPath",
  "auditSourcePath",
  "helperSourcePath",
  "receiptValidatorPath",
  "syntheticAdapterPath",
  "scriptEncoding",
  "scriptByteCap",
  "auditSourceEncoding",
  "auditSourceByteCap",
  "orderedArguments",
  "cwdPolicy",
  "environment",
  "languageMode",
  "moduleAutoloadPolicy",
  "addTypePolicy",
  "processPolicy",
  "syntheticPolicy",
]);
const SYNTHETIC_POLICY_KEYS = Object.freeze([
  "mode",
  "tracePinSchema",
  "controller",
  "concreteAdapter",
  "tracePins",
  "zeroNetworkRequired",
  "networkEvidenceMode",
  "tempOnly",
  "activationConsumptionAllowed",
  "downloadAllowed",
  "retainedArtifactCount",
  "globalMutationAllowed",
]);
const SYNTHETIC_CONTROLLER_KEYS = Object.freeze([
  "version",
  "adapterMethods",
  "timeoutMs",
  "cleanupGroupTimeoutMs",
  "terminalStates",
  "deadlineStatuses",
  "baselineTokenOrder",
]);
const CONCRETE_ADAPTER_KEYS = Object.freeze([
  "version",
  "protocolVersion",
  "manifestBinding",
  "runtimeManifestPaths",
  "handshakeSchemas",
  "brokerThreading",
  "ownedProcessPolicy",
  "cleanupBinding",
  "path",
  "cliMode",
  "nodeHost",
  "ambientGate",
  "importPolicy",
  "trustedRoot",
  "powerShellLaunch",
  "pipe",
  "rpc",
  "globalSnapshot",
  "networkEvidence",
  "preReady",
  "receipt",
  "outerCleanup",
  "failureReasons",
  "authority",
]);
const EXPECTED_CONCRETE_ADAPTER_SHA256 =
  "a0aec2b68691bd2b2d75d157582dad5db8dc0d863681ad6e338d44fc5a0a6911";
const SYNTHETIC_CONTROLLER_TIMEOUT_KEYS = Object.freeze([
  "global",
  "work",
  "process",
  "forceStop",
  "abortSettlement",
]);
const SYNTHETIC_CONTROLLER_GROUP_TIMEOUT_KEYS = Object.freeze([
  "QUIESCE",
  "NETWORK",
  "ROOT",
  "FINALIZE",
]);
const FUTURE_KEYS = Object.freeze([
  "requiredAuthorityId",
  "activationArtifactRequired",
  "activationCommitMustDescendFromMergedDesignCommit",
  "designPolicySha256Required",
  "externalActionAuthorized",
  "downloadAuthorityPresent",
  "executionAuthorityPresent",
  "initialState",
  "transactionId",
  "maximumTransactions",
  "headChangeInvalidates",
  "network",
  "targetCreationPolicy",
  "stateOrder",
  "successTerminal",
  "preconditionTerminal",
  "failureRecoveryState",
  "failureTerminals",
  "retryAllowed",
  "resumeAllowed",
]);
const FORBIDDEN = Object.freeze([
  "genericPowerShellOrShellAuthority",
  "arbitraryAddTypeOrPInvoke",
  "profileOrModuleSearch",
  "dynamicSourceOrCallerOptions",
  "extraNetwork",
  "redirect",
  "retry",
  "resume",
  "proxy",
  "credentials",
  "cookies",
  "customTrust",
  "pathMutation",
  "globalInstall",
  "globalCache",
  "globalConfig",
  "nugetExecution",
  "roslynDownload",
  "roslynExtraction",
  "generalCompilerExecution",
  "replacement",
  "broker",
  "Attempt004",
  "production",
  "signing",
  "store",
  "spend",
  "externalAccount",
  "nonReproducibilityAcceptance",
]);
const DYNAMIC_SOURCE_PATHS = Object.freeze([
  "docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.ps1",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs",
  "scripts/r4b-evidence/roslyn-verifier-authenticode.cs",
  "scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs",
]);
const DYNAMIC_SOURCE_ROLES = Object.freeze([
  "DECISION_RECORD",
  "CONTROLLER_VALIDATOR",
  "ENCODED_BOOTSTRAP",
  "ADDTYPE_AUDIT_SOURCE",
  "SYNTHETIC_ADAPTER_LAUNCHER",
  "AUTHENTICODE_HELPER_SOURCE",
  "RECEIPT_VALIDATOR",
]);
const MICROSOFT_WINDOWS_SUBJECT =
  "CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US";
const MICROSOFT_2026_ISSUER =
  "CN=Microsoft Windows Production PCA 2026 RSA2048-SHA256, O=Microsoft Corporation, C=US";
const MICROSOFT_2011_ISSUER =
  "CN=Microsoft Windows Production PCA 2011, O=Microsoft Corporation, L=Redmond, S=Washington, C=US";
const MICROSOFT_2023_ISSUER = "CN=Windows Production PCA 2023, O=Microsoft Corporation, C=US";
const PINNED_HOSTS = Object.freeze([
  [
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    495616,
    "d8f182560210d43baaf767d482ad1dc1207372522e91413b9d5e515a875e552d",
    "10.0.26100.9818 (WinBuild.160101.0800)",
    "10.0.26100.9818",
    "667BBA1E1F478221AA65DE4F75187A751B03A453",
    MICROSOFT_WINDOWS_SUBJECT,
    MICROSOFT_2026_ISSUER,
  ],
  [
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe.config",
    395,
    "7bd3f01f04332f1657494e879e861500d520f49b8f9a2a2d511d1d6736c85656",
    null,
    null,
    "71F53A26BB1625E466727183409A30D03D7923DF",
    MICROSOFT_WINDOWS_SUBJECT,
    MICROSOFT_2011_ISSUER,
  ],
  [
    "C:\\Windows\\Microsoft.Net\\assembly\\GAC_MSIL\\System.Management.Automation\\v4.0_3.0.0.0__31bf3856ad364e35\\System.Management.Automation.dll",
    6703104,
    "330d01150c14fd1c937d485775abbea7764c2062d65e6dfc55e9cde50e2e6bcb",
    "10.0.26100.9818",
    "10.0.26100.9818",
    "667BBA1E1F478221AA65DE4F75187A751B03A453",
    MICROSOFT_WINDOWS_SUBJECT,
    MICROSOFT_2026_ISSUER,
  ],
  [
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules\\Microsoft.PowerShell.Utility\\Microsoft.PowerShell.Utility.psd1",
    2459,
    "c09df190addc67f7c6c38e7ea1dca719fd87807107f688c3f60ed8816e1c48a6",
    null,
    null,
    "71F53A26BB1625E466727183409A30D03D7923DF",
    MICROSOFT_WINDOWS_SUBJECT,
    MICROSOFT_2011_ISSUER,
  ],
  [
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules\\Microsoft.PowerShell.Utility\\Microsoft.PowerShell.Utility.psm1",
    30592,
    "f9232f3de3c94dd03caf40f54b22876c9d810c657c41e54ab2d10469b45f26b5",
    null,
    null,
    "71F53A26BB1625E466727183409A30D03D7923DF",
    MICROSOFT_WINDOWS_SUBJECT,
    MICROSOFT_2011_ISSUER,
  ],
  [
    "C:\\Windows\\Microsoft.Net\\assembly\\GAC_MSIL\\Microsoft.PowerShell.Commands.Utility\\v4.0_3.0.0.0__31bf3856ad364e35\\Microsoft.PowerShell.Commands.Utility.dll",
    6999552,
    "a0dd6ea090bc0402ecde17c6236442d4f32a9c8b41b97fa63c8bf0d5d71f2172",
    "10.0.26100.9974",
    "10.0.26100.9974",
    "667BBA1E1F478221AA65DE4F75187A751B03A453",
    MICROSOFT_WINDOWS_SUBJECT,
    MICROSOFT_2026_ISSUER,
  ],
  [
    "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\clr.dll",
    10001720,
    "121b975d4242a069be2f46e59b661b95c7c468e30c0a9820da1066d8e40df524",
    "4.8.10008.0 built by: d5c29ab0c000001",
    "4.8.10008.0",
    "A28356221F80483A8509067973B88770557C9300",
    MICROSOFT_WINDOWS_SUBJECT,
    MICROSOFT_2023_ISSUER,
  ],
  [
    "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\mscorlib.dll",
    5495096,
    "94715f6991e2b9dc7481532c05aa99e74a5fff4ee147be541bca27f99e003fc7",
    "4.8.10008.0 built by: d5c29ab0c000001",
    "4.8.10008.0",
    "A28356221F80483A8509067973B88770557C9300",
    MICROSOFT_WINDOWS_SUBJECT,
    MICROSOFT_2023_ISSUER,
  ],
  [
    "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe",
    2569576,
    "eca02e6b15cde93009a59a3d129d5a77fb5008f2e1cf62cf573b6737c747ecc3",
    "14.8.10001.0 built by: bd501acdc000004",
    "14.8.10001.0",
    "A28356221F80483A8509067973B88770557C9300",
    MICROSOFT_WINDOWS_SUBJECT,
    MICROSOFT_2023_ISSUER,
  ],
  [
    "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe.config",
    182,
    "2d4610ade011e530d817dd3ba4fc787e5dc0c2297cc520c30a643b8fb13f9093",
    null,
    null,
    "A28356221F80483A8509067973B88770557C9300",
    MICROSOFT_WINDOWS_SUBJECT,
    MICROSOFT_2023_ISSUER,
  ],
  [
    "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\System.dll",
    3561272,
    "09787b4f38f4f020c6b8a3894146085d4df7b8ae337577ed42d9acf1419660e8",
    "4.8.10001.0 built by: 5f296df0c000005",
    "4.8.10001.0",
    "A28356221F80483A8509067973B88770557C9300",
    MICROSOFT_WINDOWS_SUBJECT,
    MICROSOFT_2023_ISSUER,
  ],
  [
    "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\System.Core.dll",
    1540408,
    "d1bafee1a4dd7e7bd9adf6859e7b1b654d1b4e0d031a38795e33ba040508c09d",
    "4.8.10008.0 built by: d5c29ab0c000000",
    "4.8.10008.0",
    "A28356221F80483A8509067973B88770557C9300",
    MICROSOFT_WINDOWS_SUBJECT,
    MICROSOFT_2023_ISSUER,
  ],
]);
const EXPECTED_POLICY_LITERAL_SHA256 =
  "5afd879df8ca88fb3f7445a39732ef553746e119d29b01a6ee9564d17c3be6db";
const DLL_IMPORTS = Object.freeze({
  "kernel32.dll": Object.freeze([
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
  ]),
  "wintrust.dll": Object.freeze(["WinVerifyTrust"]),
  "crypt32.dll": Object.freeze([
    "CryptQueryObject",
    "CertGetCertificateChain",
    "CertVerifyCertificateChainPolicy",
    "CertFreeCertificateChain",
    "CertCloseStore",
    "CryptMsgClose",
    "CertFreeCertificateContext",
  ]),
});
const AUDIT_SOURCE_DLL_IMPORTS = Object.freeze({
  "kernel32.dll": Object.freeze([
    "CreateFileW",
    "GetFileInformationByHandleEx",
    "GetFinalPathNameByHandleW",
    "GetFileSizeEx",
    "SetFileInformationByHandle",
    "SetFilePointerEx",
    "ReadFile",
    "CreateProcessW",
    "InitializeProcThreadAttributeList",
    "UpdateProcThreadAttribute",
    "DeleteProcThreadAttributeList",
    "ResumeThread",
    "TerminateProcess",
    "TerminateJobObject",
    "WaitForSingleObject",
    "GetExitCodeProcess",
    "QueryFullProcessImageNameW",
    "CreateJobObjectW",
    "SetInformationJobObject",
    "QueryInformationJobObject",
    "AssignProcessToJobObject",
    "CreatePipe",
    "SetHandleInformation",
    "GetFileType",
    "GetProcessTimes",
    "OpenProcess",
    "CreateToolhelp32Snapshot",
    "Process32FirstW",
    "Process32NextW",
    "CreateNamedPipeW",
    "ConnectNamedPipe",
    "GetOverlappedResult",
    "CancelIoEx",
    "CreateEventW",
    "FlushFileBuffers",
    "DisconnectNamedPipe",
    "GetNamedPipeClientProcessId",
    "GetNamedPipeServerProcessId",
    "WriteFile",
    "ReadFileOverlapped",
    "WriteFileOverlapped",
    "GetCurrentProcess",
    "LocalFree",
  ]),
  "wintrust.dll": DLL_IMPORTS["wintrust.dll"],
  "crypt32.dll": DLL_IMPORTS["crypt32.dll"],
  "advapi32.dll": Object.freeze([
    "ConvertStringSecurityDescriptorToSecurityDescriptorW",
    "OpenProcessToken",
    "GetTokenInformation",
    "ConvertSidToStringSidW",
  ]),
  "iphlpapi.dll": Object.freeze(["GetExtendedTcpTable", "GetExtendedUdpTable"]),
});
const AUTHENTICODE_HELPER_DLL_IMPORTS = Object.freeze({
  "kernel32.dll": Object.freeze([
    "GetFileInformationByHandleEx",
    "GetFinalPathNameByHandleW",
    "GetFileSizeEx",
    "SetFilePointerEx",
    "ReadFile",
  ]),
  "crypt32.dll": Object.freeze([
    "CryptQueryObject",
    "CryptMsgGetParam",
    "CryptMsgControl",
    "CertEnumCertificatesInStore",
    "CertDuplicateCertificateContext",
    "CryptDecodeObjectEx",
    "CryptMsgVerifyCountersignatureEncodedEx",
    "CryptVerifyTimeStampSignature",
    "CertGetCertificateChain",
    "CertVerifyCertificateChainPolicy",
    "CertFreeCertificateChain",
    "CertFreeCertificateContext",
    "CertCloseStore",
    "CryptMsgClose",
    "CryptMemFree",
  ]),
  "imagehlp.dll": Object.freeze(["ImageGetDigestStream"]),
  "wintrust.dll": Object.freeze([
    "CryptCATAdminAcquireContext2",
    "CryptCATAdminCalcHashFromFileHandle2",
    "CryptCATAdminEnumCatalogFromHash",
    "CryptCATAdminReleaseCatalogContext",
    "CryptCATAdminReleaseContext",
  ]),
});

function fail() {
  throw new Error("ADDTYPE_BOOTSTRAP_POLICY_INVALID");
}
function plain(value) {
  return (
    value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype
  );
}
function exactKeys(value, keys) {
  if (!plain(value) || JSON.stringify(Object.keys(value)) !== JSON.stringify(keys)) fail();
}
function same(value, expected) {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail();
}
function hash(bytes, algorithm = "sha256") {
  return createHash(algorithm).update(bytes).digest("hex");
}
function gitBlob(bytes) {
  return hash(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]), "sha1");
}
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

const SYNTHETIC_AUTHENTICODE_KEYS = Object.freeze([
  "contentFlag",
  "contentType",
  "formatFlag",
  "formatType",
  "signerCount",
  "signerInfoParameter",
  "signerCertInfoParameter",
  "encodedSignerParameter",
  "bagDecoyCount",
  "resolvedSignerIsMessageSigner",
  "timestampAttributeCount",
  "timestampOid",
  "counterSignatureVerified",
  "rfc3161Verified",
  "signingTimeCount",
  "timestampCertIsBound",
  "originalStore",
  "timestampStore",
  "primaryChainStore",
  "timestampChainStore",
  "timestampStoreHeldThroughCleanup",
  "primaryEku",
  "timestampEku",
  "primaryTrustError",
  "timestampTrustError",
  "primaryPolicy",
  "timestampPolicy",
  "identityStable",
  "hashStable",
  "pathStable",
  "productVersion",
  "fileVersion",
  "outputClosed",
  "networkCallCount",
  "residueCount",
]);

function validateSyntheticAuthenticodeFixture(fixture) {
  exactKeys(fixture, SYNTHETIC_AUTHENTICODE_KEYS);
  const legacy = fixture.timestampOid === "1.2.840.113549.1.9.6";
  const rfc3161 = fixture.timestampOid === "1.3.6.1.4.1.311.3.3.1";
  if (
    fixture.contentFlag !== 0x400 ||
    fixture.contentType !== 10 ||
    fixture.formatFlag !== 0x2 ||
    fixture.formatType !== 1 ||
    fixture.signerCount !== 1 ||
    fixture.signerInfoParameter !== 6 ||
    fixture.signerCertInfoParameter !== 7 ||
    fixture.encodedSignerParameter !== 28 ||
    !Number.isSafeInteger(fixture.bagDecoyCount) ||
    fixture.bagDecoyCount < 0 ||
    fixture.resolvedSignerIsMessageSigner !== true ||
    fixture.timestampAttributeCount !== 1 ||
    (!legacy && !rfc3161) ||
    fixture.timestampCertIsBound !== true ||
    fixture.originalStore !== "ORIGINAL_STORE_OPEN" ||
    fixture.primaryChainStore !== "ORIGINAL_STORE_OPEN" ||
    fixture.primaryEku !== "1.3.6.1.5.5.7.3.3" ||
    fixture.timestampEku !== "1.3.6.1.5.5.7.3.8" ||
    fixture.primaryTrustError !== 0 ||
    fixture.timestampTrustError !== 0 ||
    fixture.primaryPolicy !== 2 ||
    fixture.timestampPolicy !== 3 ||
    fixture.identityStable !== true ||
    fixture.hashStable !== true ||
    fixture.pathStable !== true ||
    fixture.productVersion !== "7.9.0" ||
    fixture.fileVersion !== "7.9.0.83" ||
    fixture.outputClosed !== true ||
    fixture.networkCallCount !== 0 ||
    fixture.residueCount !== 0
  )
    fail();
  if (
    legacy &&
    (fixture.counterSignatureVerified !== true ||
      fixture.rfc3161Verified !== false ||
      fixture.signingTimeCount !== 1 ||
      fixture.timestampStore !== null ||
      fixture.timestampChainStore !== "ORIGINAL_STORE_OPEN" ||
      fixture.timestampStoreHeldThroughCleanup !== false)
  )
    fail();
  if (
    rfc3161 &&
    (fixture.counterSignatureVerified !== false ||
      fixture.rfc3161Verified !== true ||
      fixture.signingTimeCount !== 1 ||
      fixture.timestampStore !== "RETURNED_TS_STORE_OPEN" ||
      fixture.timestampChainStore !== "RETURNED_TS_STORE_OPEN" ||
      fixture.timestampStoreHeldThroughCleanup !== true)
  )
    fail();
  return true;
}

const SYNTHETIC_ENVELOPE_KEYS = Object.freeze([
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
const SYNTHETIC_PROCESS_RESULT_KEYS = Object.freeze([
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
const SYNTHETIC_FIXTURE_DEFINITIONS = Object.freeze(
  [
    ["VALID_LEGACY", "SUCCESS", null, "BUILD_EVIDENCE"],
    ["VALID_RFC_TSSTORE_ONLY", "SUCCESS", null, "BUILD_EVIDENCE"],
    ["CERT_BAG_DECOY", "SUCCESS", null, "BUILD_EVIDENCE"],
    ["SIGNER_COUNT_ZERO", "FAILURE", "SIGNATURE_INVALID", "GET_SIGNER_COUNT"],
    ["SIGNER_COUNT_TWO", "FAILURE", "SIGNATURE_INVALID", "GET_SIGNER_COUNT"],
    [
      "SIGNER_INFO_CERT_INFO_MISMATCH",
      "FAILURE",
      "CERTIFICATE_FIELDS_INVALID",
      "COMPARE_SIGNER_IDENTITIES",
    ],
    ["RESOLVED_CERT_MISMATCH", "FAILURE", "CERTIFICATE_FIELDS_INVALID", "RESOLVE_PRIMARY_CERT"],
    ["TIMESTAMP_NONE", "FAILURE", "SIGNATURE_INVALID", "GET_TIMESTAMP_ATTRIBUTES"],
    ["TIMESTAMP_BOTH", "FAILURE", "SIGNATURE_INVALID", "GET_TIMESTAMP_ATTRIBUTES"],
    ["TIMESTAMP_DUPLICATE", "FAILURE", "SIGNATURE_INVALID", "GET_TIMESTAMP_ATTRIBUTES"],
    [
      "LEGACY_COUNTERSIGN_INVALID",
      "FAILURE",
      "SIGNATURE_INVALID",
      "VERIFY_LEGACY_COUNTERSIGNATURE",
    ],
    ["LEGACY_WRONG_STORE", "FAILURE", "SIGNATURE_INVALID", "RESOLVE_LEGACY_TIMESTAMP_CERT"],
    ["RFC_HASH_MISMATCH", "FAILURE", "SIGNATURE_INVALID", "VERIFY_RFC3161"],
    ["RFC_TSSTORE_EMPTY", "FAILURE", "SIGNATURE_INVALID", "VERIFY_RFC3161"],
    ["RFC_TSSTORE_UNRELATED", "FAILURE", "SIGNATURE_INVALID", "VERIFY_RFC3161"],
    ["RFC_TSSTORE_CLOSED", "FAILURE", "SIGNATURE_INVALID", "BUILD_TIMESTAMP_CHAIN"],
    ["SIGNER_EKU_MISSING", "FAILURE", "CERTIFICATE_FIELDS_INVALID", "VERIFY_PRIMARY_EKU"],
    ["TSA_EKU_MISSING", "FAILURE", "CERTIFICATE_FIELDS_INVALID", "VERIFY_TIMESTAMP_EKU"],
    ["SIGNER_CHAIN_TRUST_ERROR", "FAILURE", "SIGNATURE_INVALID", "BUILD_PRIMARY_CHAIN"],
    ["TSA_CHAIN_TRUST_ERROR", "FAILURE", "SIGNATURE_INVALID", "BUILD_TIMESTAMP_CHAIN"],
    ["SIGNER_POLICY_ERROR", "FAILURE", "SIGNATURE_INVALID", "VERIFY_PRIMARY_POLICY"],
    ["TSA_POLICY_ERROR", "FAILURE", "SIGNATURE_INVALID", "VERIFY_TIMESTAMP_POLICY"],
    [
      "OFFLINE_REVOCATION_MISSING",
      "FAILURE",
      "OFFLINE_REVOCATION_UNAVAILABLE",
      "BUILD_PRIMARY_CHAIN",
    ],
    ["FRACTIONAL_FILETIME", "FAILURE", "CERTIFICATE_FIELDS_INVALID", "VALIDATE_TIMESTAMP_FILETIME"],
    [
      "TIMESTAMP_OUTSIDE_SIGNER_VALIDITY",
      "FAILURE",
      "CERTIFICATE_FIELDS_INVALID",
      "VALIDATE_TIMESTAMP_VALIDITY",
    ],
    [
      "TIMESTAMP_OUTSIDE_TSA_VALIDITY",
      "FAILURE",
      "CERTIFICATE_FIELDS_INVALID",
      "VALIDATE_TIMESTAMP_VALIDITY",
    ],
    ["HANDLE_IDENTITY_DRIFT", "FAILURE", "FILE_IDENTITY_DRIFT", "COMPARE_TARGET_SNAPSHOTS"],
    ["HANDLE_HASH_DRIFT", "FAILURE", "FILE_IDENTITY_DRIFT", "COMPARE_TARGET_SNAPSHOTS"],
    ["HANDLE_PATH_DRIFT", "FAILURE", "FILE_IDENTITY_DRIFT", "COMPARE_TARGET_SNAPSHOTS"],
    ["CONTENT_UNSIGNED", "FAILURE", "SIGNATURE_INVALID", "CLASSIFY_CATALOG_IF_NO_EMBEDDED"],
    ["CONTENT_DETACHED", "FAILURE", "SIGNATURE_INVALID", "OPEN_EMBEDDED_MESSAGE"],
    [
      "CONTENT_CATALOG_ONLY",
      "FAILURE",
      "CATALOG_SIGNATURE_REJECTED",
      "CLASSIFY_CATALOG_IF_NO_EMBEDDED",
    ],
    ["VERSION_INVALID", "FAILURE", "VERSION_INVALID", "READ_VERSIONS"],
    ["OUTPUT_EXTRA_FIELD", "FAILURE", "CERTIFICATE_FIELDS_INVALID", "BUILD_EVIDENCE"],
    ["OUTPUT_MISSING_FIELD", "FAILURE", "CERTIFICATE_FIELDS_INVALID", "BUILD_EVIDENCE"],
    ["OUTPUT_REORDERED", "FAILURE", "CERTIFICATE_FIELDS_INVALID", "BUILD_EVIDENCE"],
    ["OUTPUT_WRONG_TYPE", "FAILURE", "CERTIFICATE_FIELDS_INVALID", "BUILD_EVIDENCE"],
    ["OUTPUT_OVERSIZE", "FAILURE", "CERTIFICATE_FIELDS_INVALID", "BUILD_EVIDENCE"],
    ["OUTPUT_TRAILING", "FAILURE", "CERTIFICATE_FIELDS_INVALID", "BUILD_EVIDENCE"],
  ].map((row) => Object.freeze(row)),
);
const TRACE_PIN_KEYS = Object.freeze([
  "fixtureId",
  "expectedOutcome",
  "fixedReason",
  "terminalOperation",
  "resolverTraceSha256",
  "resourceTraceSha256",
]);
const RFC_FIXTURES = new Set([
  "VALID_RFC_TSSTORE_ONLY",
  "RFC_HASH_MISMATCH",
  "RFC_TSSTORE_EMPTY",
  "RFC_TSSTORE_UNRELATED",
  "RFC_TSSTORE_CLOSED",
]);

function deriveIndependentTracePinsV17(definition) {
  const fixtureId = definition[0];
  const expectedOutcome = definition[1];
  const fixedReason = definition[2];
  const terminalOperation = definition[3];
  const resolverRows = [];
  const resourceRows = [];
  const resources = [];
  const ordinals = new Map();
  const liveCount = () => resources.filter((value) => value.open).length;
  const open = (type) => {
    const ordinal = (ordinals.get(type) || 0) + 1;
    ordinals.set(type, ordinal);
    const value = { id: type + "#" + ordinal, type, open: true };
    resources.push(value);
    resourceRows.push({
      sequence: resourceRows.length + 1,
      action: "OPEN",
      resourceType: type,
      resourceId: value.id,
      resultCode: "OK",
      liveCount: liveCount(),
    });
    return value;
  };
  const close = (value) => {
    if (!value || value.open !== true) return;
    value.open = false;
    resourceRows.push({
      sequence: resourceRows.length + 1,
      action: "CLOSE",
      resourceType: value.type,
      resourceId: value.id,
      resultCode: "OK",
      liveCount: liveCount(),
    });
  };
  const find = (id) => resources.find((value) => value.id === id);
  const add = (operation, resultCode) => {
    resolverRows.push({
      sequence: resolverRows.length + 1,
      operation,
      resultCode,
      resourceLiveCount: liveCount(),
    });
  };
  const isRfc = RFC_FIXTURES.has(fixtureId);
  const noEmbedded = fixtureId === "CONTENT_UNSIGNED" || fixtureId === "CONTENT_CATALOG_ONLY";
  const detached = fixtureId === "CONTENT_DETACHED";
  const operations = ["CAPTURE_TARGET_BEFORE", "OPEN_EMBEDDED_MESSAGE"];
  if (noEmbedded) operations.push("CLASSIFY_CATALOG_IF_NO_EMBEDDED");
  if (!noEmbedded && !detached) {
    operations.push(
      "GET_SIGNER_COUNT",
      "GET_PRIMARY_SIGNER_INFO",
      "GET_SIGNER_CERT_INFO",
      "COMPARE_SIGNER_IDENTITIES",
      "RESOLVE_PRIMARY_CERT",
      "COMPARE_RESOLVED_CERT_IDENTITY",
      "ENABLE_PRIMARY_STRONG_SIGNATURE",
      "VERIFY_PRIMARY_MESSAGE_SIGNATURE",
      "VERIFY_PE_INDIRECT_DIGEST",
      "GET_TIMESTAMP_ATTRIBUTES",
    );
    if (isRfc) operations.push("VERIFY_RFC3161", "VALIDATE_TIMESTAMP_FILETIME");
    else
      operations.push(
        "DECODE_LEGACY_COUNTERSIGNER",
        "RESOLVE_LEGACY_TIMESTAMP_CERT",
        "VERIFY_LEGACY_COUNTERSIGNATURE",
        "VALIDATE_TIMESTAMP_FILETIME",
      );
    operations.push(
      "VERIFY_PRIMARY_EKU",
      "VERIFY_TIMESTAMP_EKU",
      "BUILD_PRIMARY_CHAIN",
      "VERIFY_PRIMARY_POLICY",
      "BUILD_TIMESTAMP_CHAIN",
      "VERIFY_TIMESTAMP_POLICY",
      "VALIDATE_TIMESTAMP_VALIDITY",
      "READ_VERSIONS",
      "CAPTURE_TARGET_AFTER",
      "COMPARE_TARGET_SNAPSHOTS",
      "BUILD_EVIDENCE",
    );
  }
  for (const operation of operations) {
    if (operation === "OPEN_EMBEDDED_MESSAGE") {
      open("QUERY_IMAGE_PIN");
      open("QUERY_BLOB");
      if (!noEmbedded && !detached) {
        open("STORE");
        open("MESSAGE");
      }
    } else if (operation === "CLASSIFY_CATALOG_IF_NO_EMBEDDED") {
      const admin = open("CATALOG_ADMIN_CONTEXT");
      if (fixtureId === "CONTENT_CATALOG_ONLY") {
        const info = open("CATALOG_INFO_CONTEXT");
        close(info);
      }
      close(admin);
    } else if (operation === "GET_SIGNER_COUNT") {
      open("SIGNER_COUNT");
    } else if (operation === "GET_PRIMARY_SIGNER_INFO") {
      open("MESSAGE_PARAMETER");
      open("MESSAGE_PARAMETER");
    } else if (operation === "GET_SIGNER_CERT_INFO") {
      open("MESSAGE_PARAMETER");
    } else if (operation === "RESOLVE_PRIMARY_CERT") {
      const count =
        fixtureId === "CERT_BAG_DECOY" || fixtureId === "RESOLVED_CERT_MISMATCH"
          ? 3
          : isRfc
            ? 1
            : 2;
      for (let index = 0; index < count; index += 1) open("CERTIFICATE");
    } else if (operation === "ENABLE_PRIMARY_STRONG_SIGNATURE") {
      open("STRONG_SIGN_OID");
      open("STRONG_SIGN_PARA");
    } else if (operation === "VERIFY_PRIMARY_MESSAGE_SIGNATURE") {
      open("PRIMARY_VERIFY_PARA");
    } else if (operation === "VERIFY_PE_INDIRECT_DIGEST") {
      open("SIP_ENCODED_CONTENT");
      open("SIP_STRUCT_TYPE_OID");
      open("SIP_DECODE_BUFFER");
      const callback = open("IMAGE_DIGEST_CALLBACK_HANDLE");
      const digest = open("SHA256_DIGEST");
      close(digest);
      close(callback);
    } else if (operation === "DECODE_LEGACY_COUNTERSIGNER") {
      open("LEGACY_COUNTER_PIN");
      open("DECODE_BUFFER");
    } else if (operation === "RESOLVE_LEGACY_TIMESTAMP_CERT") {
      const count = fixtureId === "CERT_BAG_DECOY" ? 1 : fixtureId === "LEGACY_WRONG_STORE" ? 1 : 2;
      for (let index = 0; index < count; index += 1) open("CERTIFICATE");
    } else if (operation === "VERIFY_LEGACY_COUNTERSIGNATURE") {
      open("LEGACY_PRIMARY_PIN");
      open("LEGACY_COUNTER_PIN");
      open("LEGACY_STRONG_SIGN_OID");
      open("LEGACY_STRONG_SIGN_PARA");
    } else if (operation === "VERIFY_RFC3161") {
      open("RFC_TIMESTAMP_PIN");
      open("RFC_HASH_PIN");
      if (fixtureId !== "RFC_TSSTORE_EMPTY" && fixtureId !== "RFC_TSSTORE_UNRELATED") {
        open("STORE");
        open("CERTIFICATE");
        open("TIMESTAMP_CONTEXT");
      }
    } else if (operation === "BUILD_PRIMARY_CHAIN") {
      open("CHAIN_EKU_OID");
      open("CHAIN_EKU_POINTER");
      open("CHAIN_FILETIME");
      open("STRONG_SIGN_OID");
      open("STRONG_SIGN_PARA");
      open("CHAIN");
    } else if (operation === "BUILD_TIMESTAMP_CHAIN") {
      if (fixtureId === "RFC_TSSTORE_CLOSED") close(find("STORE#2"));
      else {
        open("CHAIN_EKU_OID");
        open("CHAIN_EKU_POINTER");
        open("CHAIN_FILETIME");
        open("STRONG_SIGN_OID");
        open("STRONG_SIGN_PARA");
        open("CHAIN");
      }
    }
    const terminal = operation === terminalOperation;
    add(operation, terminal ? fixedReason || "OK" : "OK");
    if (terminal) break;
  }
  for (let index = resources.length - 1; index >= 0; index -= 1) close(resources[index]);
  const resolverTraceSha256 = hash(
    Buffer.from(resolverRows.map((row) => JSON.stringify(row) + "\n").join(""), "utf8"),
  );
  const resourceTraceSha256 = hash(
    Buffer.from(resourceRows.map((row) => JSON.stringify(row) + "\n").join(""), "utf8"),
  );
  return deepFreeze({
    fixtureId,
    expectedOutcome,
    fixedReason,
    terminalOperation,
    resolverTraceSha256,
    resourceTraceSha256,
  });
}

const INDEPENDENT_TRACE_ORACLE = Object.freeze(
  SYNTHETIC_FIXTURE_DEFINITIONS.map(deriveIndependentTracePinsV17),
);
const TRACE_PIN_POLICY = INDEPENDENT_TRACE_ORACLE;
const SYNTHETIC_FIXTURES = Object.freeze(
  TRACE_PIN_POLICY.map((row) =>
    Object.freeze([
      row.fixtureId,
      row.expectedOutcome,
      row.fixedReason,
      row.resolverTraceSha256,
      row.resourceTraceSha256,
    ]),
  ),
);
const SYNTHETIC_FIXTURE_MAP = new Map(SYNTHETIC_FIXTURES.map((row) => [row[0], row]));
const LOWER_HEX_64 = /^[0-9a-f]{64}$/u;

function validateSyntheticEnvelope(envelope) {
  exactKeys(envelope, SYNTHETIC_ENVELOPE_KEYS);
  const fixture = SYNTHETIC_FIXTURE_MAP.get(envelope.fixtureId);
  if (
    !fixture ||
    envelope.schemaVersion !== 1 ||
    envelope.expectedOutcome !== fixture[1] ||
    envelope.observedOutcome !== fixture[1] ||
    envelope.fixedReason !== fixture[2] ||
    envelope.resolverTraceSha256 !== fixture[3] ||
    envelope.resourceTraceSha256 !== fixture[4] ||
    !Number.isSafeInteger(envelope.productionOutputByteCount) ||
    !LOWER_HEX_64.test(envelope.resolverTraceSha256) ||
    !LOWER_HEX_64.test(envelope.resourceTraceSha256) ||
    envelope.networkRequestCount !== 0 ||
    envelope.retainedArtifactCount !== 0
  )
    fail();
  if (
    (fixture[1] === "SUCCESS" &&
      (envelope.productionOutputByteCount < 1 ||
        envelope.productionOutputByteCount > 16_384 ||
        !LOWER_HEX_64.test(envelope.productionOutputSha256))) ||
    (fixture[1] === "FAILURE" &&
      (envelope.productionOutputByteCount !== 0 || envelope.productionOutputSha256 !== null))
  )
    fail();
  return true;
}

export function validateSyntheticProcessResult(bytes, fixtureId) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length <= 0 ||
    bytes.length > 16_384 ||
    bytes[0] === 0xef ||
    !SYNTHETIC_FIXTURE_MAP.has(fixtureId)
  )
    fail();
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail();
  }
  if (!text.endsWith("\n") || text.slice(0, -1).includes("\n") || text.includes("\r")) fail();
  let result;
  try {
    result = JSON.parse(text.slice(0, -1));
  } catch {
    fail();
  }
  exactKeys(result, SYNTHETIC_PROCESS_RESULT_KEYS);
  const expected = SYNTHETIC_FIXTURE_MAP.get(fixtureId);
  if (
    result.schemaVersion !== 1 ||
    result.fixtureId !== fixtureId ||
    result.observedOutcome !== expected[1] ||
    result.fixedReason !== expected[2] ||
    result.resolverTraceSha256 !== expected[3] ||
    result.resourceTraceSha256 !== expected[4] ||
    !Number.isSafeInteger(result.productionOutputByteCount) ||
    !LOWER_HEX_64.test(result.resolverTraceSha256) ||
    !LOWER_HEX_64.test(result.resourceTraceSha256) ||
    result.networkRequestCount !== 0
  )
    fail();
  if (
    (expected[1] === "SUCCESS" &&
      (result.productionOutputByteCount < 1 ||
        result.productionOutputByteCount > 16_384 ||
        !LOWER_HEX_64.test(result.productionOutputSha256))) ||
    (expected[1] === "FAILURE" &&
      (result.productionOutputByteCount !== 0 || result.productionOutputSha256 !== null))
  )
    fail();
  return deepFreeze(result);
}

export function deriveSyntheticEnvelope(processResult, expectedRow, measuredResidue) {
  exactKeys(processResult, SYNTHETIC_PROCESS_RESULT_KEYS);
  if (
    !Array.isArray(expectedRow) ||
    expectedRow.length !== 5 ||
    SYNTHETIC_FIXTURE_MAP.get(expectedRow[0]) !== expectedRow ||
    !plain(measuredResidue) ||
    Object.keys(measuredResidue).length !== 1 ||
    measuredResidue.retainedArtifactCount !== 0
  )
    fail();
  const envelope = {
    schemaVersion: processResult.schemaVersion,
    fixtureId: processResult.fixtureId,
    expectedOutcome: expectedRow[1],
    observedOutcome: processResult.observedOutcome,
    fixedReason: processResult.fixedReason,
    productionOutputByteCount: processResult.productionOutputByteCount,
    productionOutputSha256: processResult.productionOutputSha256,
    resolverTraceSha256: processResult.resolverTraceSha256,
    resourceTraceSha256: processResult.resourceTraceSha256,
    networkRequestCount: processResult.networkRequestCount,
    retainedArtifactCount: measuredResidue.retainedArtifactCount,
  };
  validateSyntheticEnvelope(envelope);
  return deepFreeze(envelope);
}

const SYNTHETIC_CLEANUP_KEYS = Object.freeze([
  "schemaVersion",
  "state",
  "deadlineStatus",
  "rootLeaseDisposed",
  "parentIdentityRevalidated",
  "rootIdentityRevalidated",
  "exclusiveRootRemoved",
  "preDeleteExpectedOwnedArtifactCount",
  "preDeleteUnexpectedResidueCount",
  "postDeleteResidueCount",
  "compilerProcessCount",
  "fixtureProcessCount",
  "ownedProcessCount",
  "networkMeasurementAvailable",
  "networkMeasurementComplete",
  "networkBaselineOwnerCount",
  "networkWorkOwnerCount",
  "networkOwnerCount",
  "networkOwnerScopeSha256",
  "networkObservationCount",
  "networkMaximumGapMicros",
  "networkEventCount",
  "ownershipLedgerPreCleanupSha256",
  "ownershipLedgerSha256",
  "retainedArtifactCount",
  "globalMutationCount",
  "cleanupCompletedBeforeDeadline",
]);
const FILE_IDENTITY_KEYS = Object.freeze([
  "schemaVersion",
  "role",
  "byteCount",
  "sha256",
  "volumeSerialNumber",
  "fileId",
  "finalPathSha256",
  "reparseTag",
  "heldReadOnlyNoDelete",
]);
const ROOT_LEASE_KEYS = Object.freeze([
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
]);
const PROCESS_IDENTITY_KEYS = Object.freeze([
  "schemaVersion",
  "processRole",
  "fixtureId",
  "processId",
  "creationTimeUtc",
  "imageVolumeSerialNumber",
  "imageFileId",
  "imageSha256",
  "imageFinalPathSha256",
  "jobIdentitySha256",
]);
const NETWORK_MEASUREMENT_KEYS = Object.freeze([
  "schemaVersion",
  "available",
  "complete",
  "measurementStartedBeforeFirstSpawn",
  "measurementStoppedAfterLastExit",
  "expectedOwnerCount",
  "observedOwnerCount",
  "ownerScopeSha256",
  "eventCount",
  "firstEvent",
  "lastEvent",
]);
const INVENTORY_KEYS = Object.freeze([
  "schemaVersion",
  "expectedOwnedArtifactCount",
  "unexpectedResidueCount",
  "inventorySha256",
]);
const SYNTHETIC_COMPILE_CONTRACT = deepFreeze({
  authority: "CONTRACT_SELF_TEST_V1",
  activationConsumptionAllowed: false,
  downloadAllowed: false,
  sourcePath: "scripts/r4b-evidence/roslyn-verifier-authenticode.cs",
  compilerPath: "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe",
  compilerSha256: "eca02e6b15cde93009a59a3d129d5a77fb5008f2e1cf62cf573b6737c747ecc3",
  compilerConfigurationSha256: "2d4610ade011e530d817dd3ba4fc787e5dc0c2297cc520c30a643b8fb13f9093",
  referenceSha256: Object.freeze([
    "94715f6991e2b9dc7481532c05aa99e74a5fff4ee147be541bca27f99e003fc7",
    "09787b4f38f4f020c6b8a3894146085d4df7b8ae337577ed42d9acf1419660e8",
    "d1bafee1a4dd7e7bd9adf6859e7b1b654d1b4e0d031a38795e33ba040508c09d",
  ]),
  orderedArguments: Object.freeze([
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
  ]),
  cwdPolicy: "EXACT_VERIFIED_CHECKOUT_ROOT",
  closedEnvironment: Object.freeze({
    SystemRoot: "C:\\Windows",
    WINDIR: "C:\\Windows",
    TEMP: "<EXCLUSIVE_ROOT>\\temp",
    TMP: "<EXCLUSIVE_ROOT>\\temp",
  }),
  exclusiveRootPattern: "<TRUSTED_TEMP>\\fluyo-r4b-addtype-synthetic-v1-<32-lowerhex>",
  compilerTimeoutMs: 30_000,
  fixtureTimeoutMs: 30_000,
  totalTimeoutMs: 300_000,
  combinedOutputCapBytes: 65_536,
  executableMaximumBytes: 16_777_216,
  executableMachine: "AMD64",
  directNoShell: true,
  jobKillOnClose: true,
  jobActiveProcessLimit: 1,
  jobBreakawayAllowed: false,
  childProcessAllowed: false,
  fixtureArguments: Object.freeze(["--synthetic-fixture-v1", "<FIXTURE_ID>"]),
  fixtureIds: Object.freeze(SYNTHETIC_FIXTURES.map((row) => row[0])),
  cleanupKeys: SYNTHETIC_CLEANUP_KEYS,
  successState: "SYNTHETIC_TEST_CLEAN",
  failedCleanState: "SYNTHETIC_TEST_FAILED_CLEAN",
});

const SYNTHETIC_STATE_ORDER = Object.freeze([
  "NOT_STARTED",
  "SOURCE_VERIFIED",
  "COMPILER_VERIFIED",
  "BUILDING",
  "BUILD_VERIFIED",
  "FIXTURES_RUNNING",
  "FIXTURES_VERIFIED",
  "CLEANING",
  "SYNTHETIC_TEST_CLEAN",
]);
const SYNTHETIC_ADAPTER_METHODS = Object.freeze([
  "openPinnedInputLeases",
  "allocateOwnedRoot",
  "captureGlobalMutationSnapshot",
  "beginOwnedNetworkMeasurement",
  "runOwnedProcess",
  "scanOwnedInventory",
  "completeOwnedNetworkMeasurement",
  "censusOwnedProcesses",
  "removeOwnedRoot",
  "closePinnedInputLeases",
]);

export function prepareSyntheticCompilePlan(policy, sourceBytes, checkoutRoot) {
  validateAddTypeBootstrapPolicy(policy);
  if (
    !Buffer.isBuffer(sourceBytes) ||
    sourceBytes.length <= 0 ||
    sourceBytes.length > 16_777_216 ||
    typeof checkoutRoot !== "string" ||
    !/^[A-Za-z]:\\[^\0\r\n]+$/u.test(checkoutRoot) ||
    checkoutRoot.endsWith("\\")
  )
    fail();
  const sourcePin = policy.sourceControl.newSources.find(
    (entry) => entry.path === SYNTHETIC_COMPILE_CONTRACT.sourcePath,
  );
  const auditSourcePin = policy.sourceControl.newSources.find(
    (entry) => entry.path === policy.bootstrap.auditSourcePath,
  );
  if (
    !sourcePin ||
    !auditSourcePin ||
    sourcePin.byteCount !== sourceBytes.length ||
    sourcePin.sha256 !== hash(sourceBytes) ||
    sourcePin.gitBlobSha1 !== gitBlob(sourceBytes)
  )
    fail();
  const sourcePath = `${checkoutRoot}\\${SYNTHETIC_COMPILE_CONTRACT.sourcePath.replaceAll("/", "\\")}`;
  return deepFreeze({
    schemaVersion: 1,
    authority: SYNTHETIC_COMPILE_CONTRACT.authority,
    stateOrder: SYNTHETIC_STATE_ORDER,
    checkoutRoot,
    sourcePath,
    sourceByteCount: sourceBytes.length,
    sourceSha256: hash(sourceBytes),
    sourceGitBlobSha1: gitBlob(sourceBytes),
    auditSourceByteCount: auditSourcePin.byteCount,
    auditSourceSha256: auditSourcePin.sha256,
    compilerPath: SYNTHETIC_COMPILE_CONTRACT.compilerPath,
    compilerSha256: SYNTHETIC_COMPILE_CONTRACT.compilerSha256,
    compilerConfigurationSha256: SYNTHETIC_COMPILE_CONTRACT.compilerConfigurationSha256,
    referenceSha256: SYNTHETIC_COMPILE_CONTRACT.referenceSha256,
    fixtureIds: SYNTHETIC_COMPILE_CONTRACT.fixtureIds,
    totalTimeoutMs: SYNTHETIC_COMPILE_CONTRACT.totalTimeoutMs,
  });
}

function validateRootLease(root) {
  exactKeys(root, ROOT_LEASE_KEYS);
  if (
    root.schemaVersion !== 1 ||
    !LOWER_HEX_64.test(root.leaseId) ||
    !/^[0-9A-F]{16}$/u.test(root.parentVolumeSerialNumber) ||
    !/^[0-9A-F]{32}$/u.test(root.parentFileId) ||
    root.rootVolumeSerialNumber !== root.parentVolumeSerialNumber ||
    !/^[0-9A-F]{32}$/u.test(root.rootFileId) ||
    !LOWER_HEX_64.test(root.parentFinalPathSha256) ||
    !LOWER_HEX_64.test(root.rootFinalPathSha256) ||
    !/^fluyo-r4b-addtype-synthetic-v1-[0-9a-f]{32}$/u.test(root.rootName) ||
    root.ancestorChainReparseFree !== true ||
    root.sameVolume !== true ||
    root.heldDenyDelete !== true
  )
    fail();
  return root;
}

const V16_FILE_IDENTITY_KEYS = Object.freeze([
  "schemaVersion",
  "role",
  "byteCount",
  "sha256",
  "volumeSerialNumber",
  "fileId",
  "finalPathSha256",
  "reparseTag",
  "heldReadOnlyNoDelete",
]);
const V16_PINNED_INPUT_RECORD_KEYS = Object.freeze([
  "role",
  "pathId",
  "expectedByteCount",
  "expectedSha256",
  "observedIdentity",
]);
const V16_PINNED_INPUT_SET_KEYS = Object.freeze([
  "schemaVersion",
  "leaseId",
  "records",
  "recordsSha256",
  "allHeld",
]);
const V16_GLOBAL_SNAPSHOT_KEYS = Object.freeze([
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
const V16_GLOBAL_COMPONENT_KEYS = Object.freeze(V16_GLOBAL_SNAPSHOT_KEYS.slice(2, -1));
const V16_NETWORK_LEASE_KEYS = Object.freeze([
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
]);
const V16_LEDGER_KEYS = Object.freeze([
  "schemaVersion",
  "ledgerId",
  "rootLeaseId",
  "state",
  "entryCount",
  "entriesSha256",
]);
const V16_OWNED_OUTPUT_KEYS = Object.freeze([
  "schemaVersion",
  "role",
  "byteCount",
  "sha256",
  "volumeSerialNumber",
  "fileId",
  "finalPathSha256",
  "reparseTag",
  "heldReadOnlyNoDelete",
  "rootLeaseId",
  "rootVolumeSerialNumber",
  "rootFileId",
  "parentRole",
  "parentVolumeSerialNumber",
  "parentFileId",
  "relativePath",
  "containedByRoot",
  "parentLedgerEntrySha256",
  "ownershipLedgerEntrySha256",
]);
const V16_PROCESS_IDENTITY_KEYS = Object.freeze([
  "schemaVersion",
  "processRole",
  "fixtureId",
  "processId",
  "creationTimeUtc",
  "imageByteCount",
  "imageVolumeSerialNumber",
  "imageFileId",
  "imageSha256",
  "imageFinalPathSha256",
  "jobIdentitySha256",
]);
const V16_OPERATION_CONTEXT_KEYS = Object.freeze([
  "schemaVersion",
  "operationId",
  "phase",
  "absoluteGlobalDeadlineMonotonicMs",
  "absolutePhaseDeadlineMonotonicMs",
  "timeoutMs",
  "abortSignal",
]);
const V16_FORCE_STOP_KEYS = Object.freeze([
  "schemaVersion",
  "operationId",
  "requested",
  "ownedProcessCount",
  "stoppedProcessCount",
  "exitObserved",
  "jobClosed",
  "liveOwnedProcessCount",
]);
const V16_PROCESS_RESULT_KEYS = Object.freeze([
  "exitCode",
  "stdout",
  "stderr",
  "processIdentity",
  "outputIdentity",
  "ownershipLedger",
]);
const V16_CLEANUP_RESULT_KEYS = Object.freeze([
  "schemaVersion",
  "operation",
  "status",
  "fixedReason",
  "evidence",
]);
const V16_CLEANUP_STEP_KEYS = Object.freeze([
  "sequence",
  "group",
  "operation",
  "status",
  "fixedReason",
  "durationBucket",
  "evidence",
]);
const V16_CLEANUP_GROUP_KEYS = Object.freeze([
  "schemaVersion",
  "group",
  "started",
  "completed",
  "timedOut",
  "steps",
  "failureCodes",
  "evidence",
  "groupSha256",
]);
const V16_CLEANUP_KEYS = Object.freeze([
  "schemaVersion",
  "state",
  "deadlineStatus",
  "adapterQuarantined",
  "groups",
  "cleanupFailureCodes",
  "rootLeaseDisposed",
  "parentIdentityRevalidated",
  "rootIdentityRevalidated",
  "exclusiveRootRemoved",
  "preDeleteExpectedOwnedArtifactCount",
  "preDeleteUnexpectedResidueCount",
  "postDeleteResidueCount",
  "compilerProcessCount",
  "fixtureProcessCount",
  "ownedProcessCount",
  "networkMeasurementAvailable",
  "networkMeasurementComplete",
  "networkBaselineOwnerCount",
  "networkWorkOwnerCount",
  "networkOwnerCount",
  "networkOwnerScopeSha256",
  "networkObservationCount",
  "networkMaximumGapMicros",
  "networkEventCount",
  "pinnedInputsRevalidated",
  "pinnedInputsClosed",
  "ownershipLedgerClosed",
  "ownershipLedgerPreCleanupSha256",
  "ownershipLedgerSha256",
  "globalSnapshotMatched",
  "retainedArtifactCount",
  "globalMutationCount",
  "cleanupCompletedBeforeDeadline",
]);
const V16_TRANSACTION_RESULT_KEYS = Object.freeze([
  "schemaVersion",
  "state",
  "primaryFailureReason",
  "completedFixtureCount",
  "envelopes",
  "cleanup",
]);
const V16_ADAPTER_METHODS = Object.freeze([
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
const V16_PRIMARY_FAILURES = Object.freeze([
  "SYNTHETIC_CONTRACT_INVALID",
  "PRE_BASELINE_HOLD",
  "PINNED_INPUT_INVALID",
  "PROCESS_IMAGE_IDENTITY_INVALID",
  "OWNERSHIP_CONTAINMENT_INVALID",
  "NETWORK_MEASUREMENT_INVALID",
  "GLOBAL_MUTATION_DETECTED",
  "PROCESS_FAILED",
  "PROCESS_TIMEOUT",
  "OUTPUT_INVALID",
  "WORK_DEADLINE_EXCEEDED",
  "GLOBAL_DEADLINE_EXCEEDED",
]);
const V16_PIN_ROWS = Object.freeze([
  Object.freeze(["COMPILER_EXE", "CSC_EXE", 2569576, SYNTHETIC_COMPILE_CONTRACT.compilerSha256]),
  Object.freeze([
    "COMPILER_CONFIG",
    "CSC_CONFIG",
    182,
    SYNTHETIC_COMPILE_CONTRACT.compilerConfigurationSha256,
  ]),
  Object.freeze([
    "REFERENCE_MSCORLIB",
    "MSCORLIB",
    5495096,
    SYNTHETIC_COMPILE_CONTRACT.referenceSha256[0],
  ]),
  Object.freeze([
    "REFERENCE_SYSTEM",
    "SYSTEM",
    3561272,
    SYNTHETIC_COMPILE_CONTRACT.referenceSha256[1],
  ]),
  Object.freeze([
    "REFERENCE_SYSTEM_CORE",
    "SYSTEM_CORE",
    1540408,
    SYNTHETIC_COMPILE_CONTRACT.referenceSha256[2],
  ]),
  Object.freeze(["ADDTYPE_AUDIT_SOURCE", "ADDTYPE_AUDIT_SOURCE", null, null]),
  Object.freeze(["HELPER_SOURCE", "HELPER_SOURCE", null, null]),
]);
const V16_CLEANUP_OPERATIONS = Object.freeze(
  [
    ["QUIESCE", "ABORT_ACTIVE_PROCESS", 5000],
    ["QUIESCE", "WAIT_ALL_OWNED_EXITS", 5000],
    ["QUIESCE", "CENSUS_COMPILER", 5000],
    ["QUIESCE", "CENSUS_FIXTURES", 5000],
    ["QUIESCE", "CENSUS_ALL", 5000],
    ["QUIESCE", "CLOSE_ALL_JOBS", 5000],
    ["NETWORK", "STOP_MEASUREMENT", 5000],
    ["NETWORK", "BIND_OWNER_SCOPE", 5000],
    ["NETWORK", "VERIFY_ZERO_EVENTS", 5000],
    ["NETWORK", "CLOSE_NETWORK_LEASE", 5000],
    ["ROOT", "REVALIDATE_PARENT", 10000],
    ["ROOT", "REVALIDATE_ROOT", 10000],
    ["ROOT", "SCAN_LEDGER_INVENTORY", 10000],
    ["ROOT", "DELETE_OWNED_FILES", 10000],
    ["ROOT", "DELETE_OWNED_DIRECTORIES", 10000],
    ["ROOT", "DELETE_ROOT", 10000],
    ["ROOT", "VERIFY_ROOT_ABSENT", 10000],
    ["FINALIZE", "REVALIDATE_PINNED_INPUTS", 10000],
    ["FINALIZE", "CLOSE_PINNED_INPUTS", 10000],
    ["FINALIZE", "CLOSE_OWNERSHIP_LEDGER", 10000],
    ["FINALIZE", "CAPTURE_GLOBAL_AFTER", 10000],
    ["FINALIZE", "COMPARE_GLOBAL_SNAPSHOT", 10000],
    ["FINALIZE", "CLOSE_BASELINE_TOKENS", 10000],
  ].map((row) => Object.freeze(row)),
);

function exactAdapterV16(adapter) {
  if (
    !plain(adapter) ||
    JSON.stringify(Object.keys(adapter)) !== JSON.stringify(V16_ADAPTER_METHODS)
  )
    fail();
  for (const name of V16_ADAPTER_METHODS) if (typeof adapter[name] !== "function") fail();
}

function validateFileIdentityV16(value, role, byteCount, sha256) {
  exactKeys(value, V16_FILE_IDENTITY_KEYS);
  if (
    value.schemaVersion !== 1 ||
    value.role !== role ||
    !Number.isSafeInteger(value.byteCount) ||
    value.byteCount <= 0 ||
    (byteCount != null && value.byteCount !== byteCount) ||
    !LOWER_HEX_64.test(value.sha256) ||
    (sha256 != null && value.sha256 !== sha256) ||
    !/^[0-9A-F]{16}$/u.test(value.volumeSerialNumber) ||
    !/^[0-9A-F]{32}$/u.test(value.fileId) ||
    !LOWER_HEX_64.test(value.finalPathSha256) ||
    value.reparseTag !== 0 ||
    value.heldReadOnlyNoDelete !== true
  )
    fail();
  return value;
}

function pinnedRecordsDigestV16(records) {
  return hash(
    Buffer.from(
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
      "utf8",
    ),
  );
}

function validatePinnedInputsV16(value, plan) {
  exactKeys(value, V16_PINNED_INPUT_SET_KEYS);
  if (
    value.schemaVersion !== 1 ||
    !LOWER_HEX_64.test(value.leaseId) ||
    value.allHeld !== true ||
    !Array.isArray(value.records) ||
    value.records.length !== V16_PIN_ROWS.length
  )
    fail();
  value.records.forEach((record, index) => {
    exactKeys(record, V16_PINNED_INPUT_RECORD_KEYS);
    const expected = V16_PIN_ROWS[index];
    const count =
      index === 5 ? plan.auditSourceByteCount : index === 6 ? plan.sourceByteCount : expected[2];
    const digest =
      index === 5 ? plan.auditSourceSha256 : index === 6 ? plan.sourceSha256 : expected[3];
    if (
      record.role !== expected[0] ||
      record.pathId !== expected[1] ||
      record.expectedByteCount !== count ||
      record.expectedSha256 !== digest
    )
      fail();
    validateFileIdentityV16(record.observedIdentity, expected[0], count, digest);
  });
  if (value.recordsSha256 !== pinnedRecordsDigestV16(value.records)) fail();
  return value;
}

function globalSnapshotDigestV16(value) {
  return hash(
    Buffer.from(
      V16_GLOBAL_COMPONENT_KEYS.map((key) => key + "\0" + value[key] + "\n").join(""),
      "utf8",
    ),
  );
}

function validateGlobalSnapshotV16(value) {
  exactKeys(value, V16_GLOBAL_SNAPSHOT_KEYS);
  if (value.schemaVersion !== 1 || value.complete !== true) fail();
  for (const key of V16_GLOBAL_COMPONENT_KEYS) if (!LOWER_HEX_64.test(value[key])) fail();
  if (value.aggregateSha256 !== globalSnapshotDigestV16(value)) fail();
  return value;
}

function validateNetworkLeaseV16(value) {
  exactKeys(value, V16_NETWORK_LEASE_KEYS);
  if (
    value.schemaVersion !== 1 ||
    !LOWER_HEX_64.test(value.leaseId) ||
    value.available !== true ||
    value.complete !== false ||
    value.startedBeforeFirstSyntheticChild !== true ||
    value.baselineOwnerCount !== 2 ||
    !LOWER_HEX_64.test(value.baselineOwnerScopeSha256) ||
    value.evidenceMode !== "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1" ||
    value.targetPollIntervalMicros !== 2000 ||
    value.maximumAllowedGapMicros !== 10000
  )
    fail();
  return value;
}

function validateLedgerV16(value, rootLeaseId) {
  exactKeys(value, V16_LEDGER_KEYS);
  if (
    value.schemaVersion !== 1 ||
    !LOWER_HEX_64.test(value.ledgerId) ||
    value.rootLeaseId !== rootLeaseId ||
    value.state !== "OPEN" ||
    !Number.isSafeInteger(value.entryCount) ||
    value.entryCount < 3 ||
    value.entryCount > 4096 ||
    !LOWER_HEX_64.test(value.entriesSha256)
  )
    fail();
  return value;
}

function validateOwnedOutputV16(value, root, ledger) {
  exactKeys(value, V16_OWNED_OUTPUT_KEYS);
  const base = Object.fromEntries(V16_FILE_IDENTITY_KEYS.map((key) => [key, value[key]]));
  validateFileIdentityV16(base, "COMPILED_EXE");
  if (
    value.rootLeaseId !== root.leaseId ||
    value.rootVolumeSerialNumber !== root.rootVolumeSerialNumber ||
    value.rootFileId !== root.rootFileId ||
    value.parentRole !== "SYNTHETIC_DIRECTORY" ||
    value.parentVolumeSerialNumber !== root.rootVolumeSerialNumber ||
    !/^[0-9A-F]{32}$/u.test(value.parentFileId) ||
    value.relativePath !== "synthetic\\roslyn-verifier-authenticode-synthetic.exe" ||
    value.containedByRoot !== true ||
    !LOWER_HEX_64.test(value.parentLedgerEntrySha256) ||
    !LOWER_HEX_64.test(value.ownershipLedgerEntrySha256) ||
    ledger.entryCount < 4
  )
    fail();
  return value;
}

function validateProcessIdentityV16(value, role, fixtureId, image) {
  exactKeys(value, V16_PROCESS_IDENTITY_KEYS);
  if (
    value.schemaVersion !== 1 ||
    value.processRole !== role ||
    value.fixtureId !== fixtureId ||
    !Number.isSafeInteger(value.processId) ||
    value.processId <= 0 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value.creationTimeUtc) ||
    value.imageByteCount !== image.byteCount ||
    value.imageVolumeSerialNumber !== image.volumeSerialNumber ||
    value.imageFileId !== image.fileId ||
    value.imageSha256 !== image.sha256 ||
    value.imageFinalPathSha256 !== image.finalPathSha256 ||
    !LOWER_HEX_64.test(value.jobIdentitySha256)
  )
    fail();
  return value;
}

function ownerScopeHashV16(identities) {
  const rows = identities
    .map(
      (value) =>
        [
          value.processRole,
          value.fixtureId === null ? "-" : value.fixtureId,
          value.processId,
          value.creationTimeUtc,
          value.imageByteCount,
          value.imageVolumeSerialNumber,
          value.imageFileId,
          value.imageSha256,
          value.imageFinalPathSha256,
          value.jobIdentitySha256,
        ].join("\0") + "\n",
    )
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  return hash(Buffer.from(rows.join(""), "utf8"));
}

function operationContextV16(operationId, phase, globalDeadline, phaseDeadline, timeoutMs, signal) {
  const value = {
    schemaVersion: 1,
    operationId,
    phase,
    absoluteGlobalDeadlineMonotonicMs: globalDeadline,
    absolutePhaseDeadlineMonotonicMs: phaseDeadline,
    timeoutMs,
    abortSignal: signal,
  };
  exactKeys(value, V16_OPERATION_CONTEXT_KEYS);
  if (
    !/^[A-Z0-9:_-]{1,96}$/u.test(operationId) ||
    !["WORK", "QUIESCE", "NETWORK", "ROOT", "FINALIZE"].includes(phase) ||
    !Number.isFinite(globalDeadline) ||
    !Number.isFinite(phaseDeadline) ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 30000 ||
    !(signal instanceof AbortSignal)
  )
    fail();
  return Object.freeze(value);
}

class BoundedAdapterFailure extends Error {
  constructor(reason, timedOut = false, quarantined = false) {
    super(reason);
    this.reason = reason;
    this.timedOut = timedOut;
    this.quarantined = quarantined;
  }
}

function validateForceStopEvidenceV16(value, operationId) {
  exactKeys(value, V16_FORCE_STOP_KEYS);
  if (
    value.schemaVersion !== 1 ||
    value.operationId !== operationId ||
    typeof value.requested !== "boolean" ||
    !Number.isSafeInteger(value.ownedProcessCount) ||
    value.ownedProcessCount < 0 ||
    value.ownedProcessCount > 1 ||
    !Number.isSafeInteger(value.stoppedProcessCount) ||
    value.stoppedProcessCount < 0 ||
    value.stoppedProcessCount > 1 ||
    typeof value.exitObserved !== "boolean" ||
    typeof value.jobClosed !== "boolean" ||
    value.liveOwnedProcessCount !== 0 ||
    value.stoppedProcessCount !== value.ownedProcessCount ||
    value.requested !== (value.ownedProcessCount === 1) ||
    value.exitObserved !== true ||
    value.jobClosed !== true
  )
    fail();
  return value;
}

async function settleWithinV16(promise, milliseconds) {
  if (milliseconds <= 0) return false;
  let timer;
  try {
    return await Promise.race([
      promise.then(
        () => true,
        () => true,
      ),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(false), milliseconds);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function requirePositiveDispatchRemainingV18(
  globalDeadline,
  phaseDeadline,
  bindings,
  quarantineOnExpiry,
) {
  if (bindings.adapterQuarantined)
    throw new BoundedAdapterFailure("SYNTHETIC_CONTRACT_INVALID", false, true);
  const now = performance.now();
  const remaining = Math.floor(Math.min(globalDeadline, phaseDeadline) - now);
  if (!Number.isFinite(remaining) || remaining <= 0) {
    if (quarantineOnExpiry) bindings.adapterQuarantined = true;
    throw new BoundedAdapterFailure(
      now >= globalDeadline ? "GLOBAL_DEADLINE_EXCEEDED" : "WORK_DEADLINE_EXCEEDED",
      true,
      quarantineOnExpiry,
    );
  }
  return remaining;
}

async function forceStopV18(adapter, operationId, bindings, globalDeadline, phaseDeadline) {
  const now = performance.now();
  const remaining = Math.floor(Math.min(globalDeadline, phaseDeadline) - now);
  if (!Number.isFinite(remaining) || remaining <= 0) {
    bindings.adapterQuarantined = true;
    throw new BoundedAdapterFailure(
      now >= globalDeadline ? "GLOBAL_DEADLINE_EXCEEDED" : "WORK_DEADLINE_EXCEEDED",
      true,
      true,
    );
  }
  const timeoutMs = Math.min(5000, remaining);
  const controller = new AbortController();
  let timer;
  const pending = Promise.resolve().then(() => {
    const dispatchRemaining = requirePositiveDispatchRemainingV18(
      globalDeadline,
      phaseDeadline,
      bindings,
      true,
    );
    const context = operationContextV16(
      `${operationId}:FORCE_STOP`,
      "WORK",
      globalDeadline,
      phaseDeadline,
      Math.min(timeoutMs, dispatchRemaining),
      controller.signal,
    );
    return adapter.forceStopOwnedProcessTree(operationId, bindings, context);
  });
  try {
    const result = await Promise.race([
      pending,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new BoundedAdapterFailure("WORK_DEADLINE_EXCEEDED", true));
        }, timeoutMs);
      }),
    ]);
    return validateForceStopEvidenceV16(result, operationId);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function invokeAdapterV18({
  adapter,
  method,
  args,
  operationId,
  phase,
  globalDeadline,
  phaseDeadline,
  maximumTimeoutMs,
  timeoutReason = "PROCESS_TIMEOUT",
  processOperation,
  bindings,
}) {
  if (bindings.adapterQuarantined)
    throw new BoundedAdapterFailure("SYNTHETIC_CONTRACT_INVALID", false, true);
  const now = performance.now();
  const remaining = Math.floor(Math.min(globalDeadline, phaseDeadline) - now);
  if (!Number.isFinite(remaining) || remaining <= 0)
    throw new BoundedAdapterFailure(
      now >= globalDeadline ? "GLOBAL_DEADLINE_EXCEEDED" : "WORK_DEADLINE_EXCEEDED",
      true,
    );
  const timeoutMs = Math.min(maximumTimeoutMs, remaining);
  const controller = new AbortController();
  let timer;
  let timedOut = false;
  const pending = Promise.resolve().then(() => {
    const dispatchRemaining = requirePositiveDispatchRemainingV18(
      globalDeadline,
      phaseDeadline,
      bindings,
      false,
    );
    const context = operationContextV16(
      operationId,
      phase,
      globalDeadline,
      phaseDeadline,
      Math.min(timeoutMs, dispatchRemaining),
      controller.signal,
    );
    return adapter[method](...args, context);
  });
  try {
    return await Promise.race([
      pending,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new BoundedAdapterFailure(timeoutReason, true));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (!timedOut) throw error;
    if (processOperation) {
      try {
        await forceStopV18(adapter, operationId, bindings, globalDeadline, phaseDeadline);
      } catch {
        bindings.adapterQuarantined = true;
        throw new BoundedAdapterFailure(timeoutReason, true, true);
      }
    }
    const settlementMs = Math.max(
      0,
      Math.min(1000, Math.floor(Math.min(globalDeadline, phaseDeadline) - performance.now())),
    );
    if (!(await settleWithinV16(pending, settlementMs))) {
      bindings.adapterQuarantined = true;
      throw new BoundedAdapterFailure(timeoutReason, true, true);
    }
    throw new BoundedAdapterFailure(
      performance.now() >= globalDeadline
        ? "GLOBAL_DEADLINE_EXCEEDED"
        : performance.now() >= phaseDeadline
          ? "WORK_DEADLINE_EXCEEDED"
          : timeoutReason,
      true,
    );
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function durationBucketV16(milliseconds) {
  if (milliseconds < 1000) return "LT_1S";
  if (milliseconds < 5000) return "1_TO_5S";
  return "5_TO_10S";
}

const V16_JOB_POLICY = deepFreeze({
  killOnClose: true,
  activeProcessLimit: 1,
  breakawayAllowed: false,
  childProcessAllowed: false,
});

function cleanupOperationHasRequiredTokensV16(operation, bindings) {
  if (
    [
      "ABORT_ACTIVE_PROCESS",
      "CLOSE_ALL_JOBS",
      "WAIT_ALL_OWNED_EXITS",
      "CENSUS_COMPILER",
      "CENSUS_FIXTURES",
      "CENSUS_ALL",
    ].includes(operation)
  )
    return true;
  if (
    ["STOP_MEASUREMENT", "BIND_OWNER_SCOPE", "VERIFY_ZERO_EVENTS", "CLOSE_NETWORK_LEASE"].includes(
      operation,
    )
  )
    return bindings.networkLease !== null;
  if (["REVALIDATE_PARENT", "REVALIDATE_ROOT"].includes(operation))
    return bindings.rootLease !== null;
  if (
    [
      "SCAN_LEDGER_INVENTORY",
      "DELETE_OWNED_FILES",
      "DELETE_OWNED_DIRECTORIES",
      "DELETE_ROOT",
      "VERIFY_ROOT_ABSENT",
    ].includes(operation)
  )
    return bindings.rootLease !== null && bindings.ownershipLedger !== null;
  if (["REVALIDATE_PINNED_INPUTS", "CLOSE_PINNED_INPUTS"].includes(operation))
    return bindings.pinnedInputLeases !== null;
  if (operation === "CLOSE_OWNERSHIP_LEDGER") return bindings.ownershipLedger !== null;
  if (["CAPTURE_GLOBAL_AFTER", "COMPARE_GLOBAL_SNAPSHOT"].includes(operation))
    return bindings.beforeGlobal !== null;
  if (operation === "CLOSE_BASELINE_TOKENS")
    return bindings.rootLease !== null || bindings.beforeGlobal !== null;
  return false;
}

function validateMeasuredProcessCensusV132(evidence, expectedCount) {
  exactKeys(evidence, [
    "expectedProcessCount",
    "observedProcessCount",
    "liveProcessCount",
    "identitySetSha256",
    "expectedJobCount",
    "observedJobCount",
    "activeJobProcessCount",
    "terminatedJobProcessCount",
  ]);
  if (
    evidence.expectedProcessCount !== expectedCount ||
    evidence.observedProcessCount !== expectedCount ||
    evidence.liveProcessCount !== 0 ||
    !LOWER_HEX_64.test(evidence.identitySetSha256) ||
    evidence.expectedJobCount !== expectedCount ||
    evidence.observedJobCount !== expectedCount ||
    evidence.activeJobProcessCount !== 0 ||
    evidence.terminatedJobProcessCount !== expectedCount
  )
    fail();
}

function validateCleanupStepEvidenceV16(operation, evidence, bindings, mergedEvidence) {
  if (!plain(evidence)) fail();
  const exact = (keys) => exactKeys(evidence, keys);
  if (operation === "ABORT_ACTIVE_PROCESS") {
    exact(["requestedCount", "abortedCount", "remainingActiveCount"]);
    if (
      !Number.isSafeInteger(evidence.requestedCount) ||
      evidence.requestedCount < 0 ||
      evidence.requestedCount > 1 ||
      evidence.abortedCount !== evidence.requestedCount ||
      evidence.remainingActiveCount !== 0
    )
      fail();
  } else if (operation === "CLOSE_ALL_JOBS") {
    exact([
      "requestedJobCount",
      "closedJobCount",
      "requestedProcessHandleCount",
      "closedProcessHandleCount",
      "remainingOpenJobCount",
      "remainingOpenProcessHandleCount",
    ]);
    if (
      evidence.requestedJobCount !== bindings.processIdentities.length ||
      evidence.closedJobCount !== evidence.requestedJobCount ||
      evidence.requestedProcessHandleCount !== bindings.processIdentities.length ||
      evidence.closedProcessHandleCount !== evidence.requestedProcessHandleCount ||
      evidence.remainingOpenJobCount !== 0 ||
      evidence.remainingOpenProcessHandleCount !== 0
    )
      fail();
  } else if (operation === "WAIT_ALL_OWNED_EXITS") {
    exact(["requestedCount", "exitedCount", "liveProcessCount"]);
    if (
      evidence.requestedCount !== bindings.processIdentities.length ||
      evidence.exitedCount !== evidence.requestedCount ||
      evidence.liveProcessCount !== 0
    )
      fail();
  } else if (operation === "CENSUS_COMPILER") {
    validateMeasuredProcessCensusV132(evidence, 1);
  } else if (operation === "CENSUS_FIXTURES") {
    validateMeasuredProcessCensusV132(evidence, 39);
  } else if (operation === "CENSUS_ALL") {
    validateMeasuredProcessCensusV132(evidence, 40);
  } else if (operation === "STOP_MEASUREMENT") {
    exact([
      "measurementStoppedAfterLastOwnedExit",
      "measurementComplete",
      "observationCount",
      "maximumGapMicros",
    ]);
    if (
      evidence.measurementStoppedAfterLastOwnedExit !== true ||
      evidence.measurementComplete !== true ||
      !Number.isSafeInteger(evidence.observationCount) ||
      evidence.observationCount < 1 ||
      !Number.isSafeInteger(evidence.maximumGapMicros) ||
      evidence.maximumGapMicros < 0 ||
      evidence.maximumGapMicros > 10000
    )
      fail();
  } else if (operation === "BIND_OWNER_SCOPE") {
    exact([
      "baselineOwnerCount",
      "workOwnerCount",
      "expectedOwnerCount",
      "observedOwnerCount",
      "ownerScopeSha256",
    ]);
    if (
      evidence.baselineOwnerCount !== 2 ||
      evidence.workOwnerCount !== bindings.processIdentities.length ||
      evidence.expectedOwnerCount !== 42 ||
      evidence.observedOwnerCount !== evidence.expectedOwnerCount ||
      !LOWER_HEX_64.test(evidence.ownerScopeSha256)
    )
      fail();
  } else if (operation === "VERIFY_ZERO_EVENTS") {
    exact(["eventCount", "firstEvent", "lastEvent"]);
    if (evidence.eventCount !== 0 || evidence.firstEvent !== null || evidence.lastEvent !== null)
      fail();
  } else if (operation === "CLOSE_NETWORK_LEASE") {
    exact(["measurementLeaseClosed"]);
    if (evidence.measurementLeaseClosed !== true) fail();
  } else if (operation === "REVALIDATE_PARENT") {
    exact(["parentIdentityRevalidated", "parentIdentitySha256"]);
    if (
      evidence.parentIdentityRevalidated !== true ||
      !LOWER_HEX_64.test(evidence.parentIdentitySha256)
    )
      fail();
  } else if (operation === "REVALIDATE_ROOT") {
    exact(["rootIdentityRevalidated", "rootIdentitySha256"]);
    if (
      evidence.rootIdentityRevalidated !== true ||
      !LOWER_HEX_64.test(evidence.rootIdentitySha256)
    )
      fail();
  } else if (operation === "SCAN_LEDGER_INVENTORY") {
    exact([
      "expectedOwnedArtifactCount",
      "unexpectedResidueCount",
      "inventorySha256",
      "ownershipLedgerPreCleanupSha256",
    ]);
    if (
      !Number.isSafeInteger(evidence.expectedOwnedArtifactCount) ||
      evidence.expectedOwnedArtifactCount < 0 ||
      evidence.expectedOwnedArtifactCount > 4096 ||
      evidence.unexpectedResidueCount !== 0 ||
      !LOWER_HEX_64.test(evidence.inventorySha256) ||
      !LOWER_HEX_64.test(evidence.ownershipLedgerPreCleanupSha256)
    )
      fail();
  } else if (operation === "DELETE_OWNED_FILES") {
    exact(["requestedOwnedFileCount", "deletedOwnedFileCount", "failedOwnedFileCount"]);
    if (
      !Number.isSafeInteger(evidence.requestedOwnedFileCount) ||
      evidence.requestedOwnedFileCount < 0 ||
      !Number.isSafeInteger(evidence.deletedOwnedFileCount) ||
      evidence.deletedOwnedFileCount < 0 ||
      evidence.deletedOwnedFileCount !== evidence.requestedOwnedFileCount ||
      evidence.failedOwnedFileCount !== 0
    )
      fail();
  } else if (operation === "DELETE_OWNED_DIRECTORIES") {
    exact([
      "requestedOwnedDirectoryCount",
      "deletedOwnedDirectoryCount",
      "failedOwnedDirectoryCount",
    ]);
    if (
      !Number.isSafeInteger(evidence.requestedOwnedDirectoryCount) ||
      evidence.requestedOwnedDirectoryCount < 0 ||
      !Number.isSafeInteger(evidence.deletedOwnedDirectoryCount) ||
      evidence.deletedOwnedDirectoryCount < 0 ||
      evidence.deletedOwnedDirectoryCount !== evidence.requestedOwnedDirectoryCount ||
      evidence.failedOwnedDirectoryCount !== 0
    )
      fail();
  } else if (operation === "DELETE_ROOT") {
    exact(["exclusiveRootRemoved", "deletedRootIdentitySha256"]);
    if (
      evidence.exclusiveRootRemoved !== true ||
      !LOWER_HEX_64.test(evidence.deletedRootIdentitySha256)
    )
      fail();
  } else if (operation === "VERIFY_ROOT_ABSENT") {
    exact(["rootAbsent", "postDeleteResidueCount", "parentInventorySha256"]);
    if (
      evidence.rootAbsent !== true ||
      evidence.postDeleteResidueCount !== 0 ||
      !LOWER_HEX_64.test(evidence.parentInventorySha256)
    )
      fail();
  } else if (operation === "REVALIDATE_PINNED_INPUTS") {
    exact(["pinnedInputLeases", "pinnedInputsRevalidated", "pinnedInputsSha256"]);
    validatePinnedInputsV16(evidence.pinnedInputLeases, bindings.plan);
    if (
      evidence.pinnedInputsRevalidated !== true ||
      JSON.stringify(evidence.pinnedInputLeases) !== JSON.stringify(bindings.pinnedInputLeases) ||
      evidence.pinnedInputsSha256 !== evidence.pinnedInputLeases.recordsSha256
    )
      fail();
  } else if (operation === "CLOSE_PINNED_INPUTS") {
    exact(["pinnedInputsClosed", "closedPinnedInputCount"]);
    if (evidence.pinnedInputsClosed !== true || evidence.closedPinnedInputCount !== 7) fail();
  } else if (operation === "CLOSE_OWNERSHIP_LEDGER") {
    exact(["ownershipLedgerClosed", "liveEntryCount", "finalEntryCount", "ownershipLedgerSha256"]);
    if (
      evidence.ownershipLedgerClosed !== true ||
      evidence.liveEntryCount !== 0 ||
      evidence.finalEntryCount !== 164 ||
      !LOWER_HEX_64.test(evidence.ownershipLedgerSha256)
    )
      fail();
  } else if (operation === "CAPTURE_GLOBAL_AFTER") {
    exact(["globalSnapshot"]);
    validateGlobalSnapshotV16(evidence.globalSnapshot);
  } else if (operation === "COMPARE_GLOBAL_SNAPSHOT") {
    exact(["globalSnapshotMatched", "beforeAggregateSha256", "afterAggregateSha256"]);
    if (
      evidence.globalSnapshotMatched !== true ||
      !LOWER_HEX_64.test(evidence.beforeAggregateSha256) ||
      evidence.afterAggregateSha256 !== evidence.beforeAggregateSha256
    )
      fail();
  } else if (operation === "CLOSE_BASELINE_TOKENS") {
    exact(["createdTokenKinds", "closedTokenKinds", "failedTokenKinds", "closedCount"]);
    const created = [];
    if (bindings.rootLease !== null) created.push("ROOT_LEASE");
    if (bindings.beforeGlobal !== null) created.push("GLOBAL_BASELINE");
    if (
      JSON.stringify(evidence.createdTokenKinds) !== JSON.stringify(created) ||
      !Array.isArray(evidence.closedTokenKinds) ||
      !Array.isArray(evidence.failedTokenKinds) ||
      evidence.closedCount !== evidence.closedTokenKinds.length ||
      JSON.stringify([...evidence.closedTokenKinds, ...evidence.failedTokenKinds]) !==
        JSON.stringify(created) ||
      new Set(evidence.closedTokenKinds).size !== evidence.closedTokenKinds.length ||
      new Set(evidence.failedTokenKinds).size !== evidence.failedTokenKinds.length ||
      evidence.failedTokenKinds.length !== 0 ||
      JSON.stringify(evidence.closedTokenKinds) !== JSON.stringify(created)
    )
      fail();
  } else fail();
  if (operation === "COMPARE_GLOBAL_SNAPSHOT" && mergedEvidence.afterGlobalSnapshot === null)
    fail();
}

function cleanupGroupDigestV16(value) {
  return hash(
    Buffer.from(
      JSON.stringify({
        schemaVersion: value.schemaVersion,
        group: value.group,
        started: value.started,
        completed: value.completed,
        timedOut: value.timedOut,
        steps: value.steps,
        failureCodes: value.failureCodes,
        evidence: value.evidence,
      }),
      "utf8",
    ),
  );
}

function cleanupEvidenceV16(group) {
  if (group === "QUIESCE")
    return {
      compilerProcessCount: 0,
      fixtureProcessCount: 0,
      ownedProcessCount: 0,
      requestedProcessCount: 0,
      abortedProcessCount: 0,
      closedJobCount: 0,
      exitedProcessCount: 0,
    };
  if (group === "NETWORK")
    return {
      measurementStartedBeforeFirstSyntheticChild: false,
      measurementStoppedAfterLastOwnedExit: false,
      measurementComplete: false,
      observationCount: 0,
      maximumGapMicros: 0,
      baselineOwnerCount: 0,
      workOwnerCount: 0,
      expectedOwnerCount: 0,
      observedOwnerCount: 0,
      ownerScopeSha256: ownerScopeHashV16([]),
      eventCount: 0,
      firstEvent: null,
      lastEvent: null,
      measurementLeaseClosed: false,
    };
  if (group === "ROOT")
    return {
      parentIdentityRevalidated: false,
      parentIdentitySha256: null,
      rootIdentityRevalidated: false,
      rootIdentitySha256: null,
      expectedOwnedArtifactCount: 0,
      unexpectedResidueCount: 0,
      inventorySha256: hash(Buffer.alloc(0)),
      ownershipLedgerPreCleanupSha256: null,
      requestedOwnedFileCount: 0,
      deletedOwnedFileCount: 0,
      failedOwnedFileCount: 0,
      requestedOwnedDirectoryCount: 0,
      deletedOwnedDirectoryCount: 0,
      failedOwnedDirectoryCount: 0,
      exclusiveRootRemoved: false,
      deletedRootIdentitySha256: null,
      rootAbsent: false,
      postDeleteResidueCount: 0,
      parentInventorySha256: null,
    };
  return {
    postPinnedInputLeases: null,
    pinnedInputsRevalidated: false,
    pinnedInputsSha256: null,
    pinnedInputsClosed: false,
    closedPinnedInputCount: 0,
    ownershipLedgerClosed: false,
    liveEntryCount: 0,
    finalEntryCount: 0,
    ownershipLedgerSha256: null,
    afterGlobalSnapshot: null,
    globalSnapshotMatched: false,
    beforeAggregateSha256: null,
    afterAggregateSha256: null,
    baselineTokensClosed: false,
    createdTokenKinds: [],
    closedTokenKinds: [],
    failedTokenKinds: [],
  };
}

function mergeCleanupEvidenceV16(target, operation, evidence) {
  if (!plain(evidence)) return;
  const map = {
    ABORT_ACTIVE_PROCESS: [
      ["requestedProcessCount", "requestedCount"],
      ["abortedProcessCount", "abortedCount"],
      ["remainingActiveCount", "remainingActiveCount"],
    ],
    CLOSE_ALL_JOBS: [
      ["closedJobCount", "closedJobCount"],
      ["remainingOpenJobCount", "remainingOpenJobCount"],
      ["closedProcessHandleCount", "closedProcessHandleCount"],
      ["remainingOpenProcessHandleCount", "remainingOpenProcessHandleCount"],
    ],
    WAIT_ALL_OWNED_EXITS: [
      ["exitedProcessCount", "exitedCount"],
      ["liveProcessCount", "liveProcessCount"],
    ],
    CENSUS_COMPILER: [["compilerProcessCount", "liveProcessCount"]],
    CENSUS_FIXTURES: [["fixtureProcessCount", "liveProcessCount"]],
    CENSUS_ALL: [["ownedProcessCount", "liveProcessCount"]],
    STOP_MEASUREMENT: [
      ["measurementStoppedAfterLastOwnedExit", "measurementStoppedAfterLastOwnedExit"],
      ["measurementComplete", "measurementComplete"],
      ["observationCount", "observationCount"],
      ["maximumGapMicros", "maximumGapMicros"],
    ],
    BIND_OWNER_SCOPE: [
      ["baselineOwnerCount", "baselineOwnerCount"],
      ["workOwnerCount", "workOwnerCount"],
      ["expectedOwnerCount", "expectedOwnerCount"],
      ["observedOwnerCount", "observedOwnerCount"],
      ["ownerScopeSha256", "ownerScopeSha256"],
    ],
    VERIFY_ZERO_EVENTS: [
      ["eventCount", "eventCount"],
      ["firstEvent", "firstEvent"],
      ["lastEvent", "lastEvent"],
    ],
    CLOSE_NETWORK_LEASE: [["measurementLeaseClosed", "measurementLeaseClosed"]],
    REVALIDATE_PARENT: [
      ["parentIdentityRevalidated", "parentIdentityRevalidated"],
      ["parentIdentitySha256", "parentIdentitySha256"],
    ],
    REVALIDATE_ROOT: [
      ["rootIdentityRevalidated", "rootIdentityRevalidated"],
      ["rootIdentitySha256", "rootIdentitySha256"],
    ],
    SCAN_LEDGER_INVENTORY: [
      ["expectedOwnedArtifactCount", "expectedOwnedArtifactCount"],
      ["unexpectedResidueCount", "unexpectedResidueCount"],
      ["inventorySha256", "inventorySha256"],
      ["ownershipLedgerPreCleanupSha256", "ownershipLedgerPreCleanupSha256"],
    ],
    DELETE_OWNED_FILES: [
      ["requestedOwnedFileCount", "requestedOwnedFileCount"],
      ["deletedOwnedFileCount", "deletedOwnedFileCount"],
      ["failedOwnedFileCount", "failedOwnedFileCount"],
    ],
    DELETE_OWNED_DIRECTORIES: [
      ["requestedOwnedDirectoryCount", "requestedOwnedDirectoryCount"],
      ["deletedOwnedDirectoryCount", "deletedOwnedDirectoryCount"],
      ["failedOwnedDirectoryCount", "failedOwnedDirectoryCount"],
    ],
    DELETE_ROOT: [
      ["exclusiveRootRemoved", "exclusiveRootRemoved"],
      ["deletedRootIdentitySha256", "deletedRootIdentitySha256"],
    ],
    VERIFY_ROOT_ABSENT: [
      ["rootAbsent", "rootAbsent"],
      ["postDeleteResidueCount", "postDeleteResidueCount"],
      ["parentInventorySha256", "parentInventorySha256"],
    ],
    REVALIDATE_PINNED_INPUTS: [
      ["postPinnedInputLeases", "pinnedInputLeases"],
      ["pinnedInputsRevalidated", "pinnedInputsRevalidated"],
      ["pinnedInputsSha256", "pinnedInputsSha256"],
    ],
    CLOSE_PINNED_INPUTS: [
      ["pinnedInputsClosed", "pinnedInputsClosed"],
      ["closedPinnedInputCount", "closedPinnedInputCount"],
    ],
    CLOSE_OWNERSHIP_LEDGER: [
      ["ownershipLedgerClosed", "ownershipLedgerClosed"],
      ["liveEntryCount", "liveEntryCount"],
      ["finalEntryCount", "finalEntryCount"],
      ["ownershipLedgerSha256", "ownershipLedgerSha256"],
    ],
    CAPTURE_GLOBAL_AFTER: [["afterGlobalSnapshot", "globalSnapshot"]],
    COMPARE_GLOBAL_SNAPSHOT: [
      ["globalSnapshotMatched", "globalSnapshotMatched"],
      ["beforeAggregateSha256", "beforeAggregateSha256"],
      ["afterAggregateSha256", "afterAggregateSha256"],
    ],
    CLOSE_BASELINE_TOKENS: [
      ["createdTokenKinds", "createdTokenKinds"],
      ["closedTokenKinds", "closedTokenKinds"],
      ["failedTokenKinds", "failedTokenKinds"],
    ],
  };
  for (const pair of map[operation] || []) target[pair[0]] = evidence[pair[1]];
  if (operation === "CLOSE_BASELINE_TOKENS")
    target.baselineTokensClosed = evidence.failedTokenKinds.length === 0;
}

function cleanupFailureReasonV16(workReason, failureCodes) {
  if (workReason !== null) return workReason;
  if (failureCodes.includes("GLOBAL_300000_MS_EXCEEDED")) return "GLOBAL_DEADLINE_EXCEEDED";
  if (
    failureCodes.some((value) =>
      ["CAPTURE_GLOBAL_AFTER_FAILED", "COMPARE_GLOBAL_SNAPSHOT_FAILED"].includes(value),
    )
  )
    return "GLOBAL_MUTATION_DETECTED";
  if (
    failureCodes.some((value) =>
      [
        "STOP_MEASUREMENT_FAILED",
        "BIND_OWNER_SCOPE_FAILED",
        "VERIFY_ZERO_EVENTS_FAILED",
        "CLOSE_NETWORK_LEASE_FAILED",
      ].includes(value),
    )
  )
    return "NETWORK_MEASUREMENT_INVALID";
  if (failureCodes.includes("REVALIDATE_PINNED_INPUTS_FAILED")) return "PINNED_INPUT_INVALID";
  if (
    failureCodes.some((value) =>
      [
        "REVALIDATE_PARENT_FAILED",
        "REVALIDATE_ROOT_FAILED",
        "SCAN_LEDGER_INVENTORY_FAILED",
        "DELETE_OWNED_FILES_FAILED",
        "DELETE_OWNED_DIRECTORIES_FAILED",
        "DELETE_ROOT_FAILED",
        "VERIFY_ROOT_ABSENT_FAILED",
      ].includes(value),
    )
  )
    return "OWNERSHIP_CONTAINMENT_INVALID";
  if (
    failureCodes.some((value) =>
      [
        "ABORT_ACTIVE_PROCESS_FAILED",
        "CLOSE_ALL_JOBS_FAILED",
        "WAIT_ALL_OWNED_EXITS_FAILED",
        "CENSUS_COMPILER_FAILED",
        "CENSUS_FIXTURES_FAILED",
        "CENSUS_ALL_FAILED",
      ].includes(value),
    )
  )
    return "PROCESS_FAILED";
  return failureCodes.length === 0 ? null : "SYNTHETIC_CONTRACT_INVALID";
}

async function cleanupV16(adapter, bindings, globalDeadline, workReason) {
  const groups = [];
  const failures = [];
  for (const groupName of ["QUIESCE", "NETWORK", "ROOT", "FINALIZE"]) {
    const rows = V16_CLEANUP_OPERATIONS.filter((row) => row[0] === groupName);
    const groupCap = { QUIESCE: 5000, NETWORK: 5000, ROOT: 10000, FINALIZE: 10000 }[groupName];
    const groupDeadline = Math.min(globalDeadline, performance.now() + groupCap);
    const evidence = cleanupEvidenceV16(groupName);
    const steps = [];
    let timedOut = false;
    for (const row of rows) {
      const operation = row[1];
      const started = performance.now();
      let status = "FAIL";
      let fixedReason = operation + "_FAILED";
      let stepEvidence = null;
      const missingToken = !cleanupOperationHasRequiredTokensV16(operation, bindings);
      if (bindings.adapterQuarantined) {
        fixedReason = "ADAPTER_QUARANTINED";
      } else if (started >= globalDeadline) {
        timedOut = true;
        fixedReason = "GLOBAL_300000_MS_EXCEEDED";
      } else if (started >= groupDeadline) {
        timedOut = true;
        fixedReason = `${groupName}_GROUP_TIMEOUT`;
      } else if (!missingToken) {
        try {
          if (operation === "COMPARE_GLOBAL_SNAPSHOT") {
            const matched =
              evidence.afterGlobalSnapshot !== null &&
              bindings.beforeGlobal !== null &&
              JSON.stringify(evidence.afterGlobalSnapshot) ===
                JSON.stringify(bindings.beforeGlobal);
            status = matched ? "PASS" : "FAIL";
            fixedReason = matched ? null : operation + "_FAILED";
            stepEvidence = { globalSnapshotMatched: matched };
          } else {
            const result = await invokeAdapterV18({
              adapter,
              method: "performCleanupStep",
              args: [operation, bindings],
              operationId: `CLEANUP:${groupName}:${steps.length + 1}:${operation}`,
              phase: groupName,
              globalDeadline,
              phaseDeadline: groupDeadline,
              maximumTimeoutMs: Math.min(30000, groupCap),
              timeoutReason: `${groupName}_GROUP_TIMEOUT`,
              processOperation: false,
              bindings,
            });
            exactKeys(result, V16_CLEANUP_RESULT_KEYS);
            if (
              result.schemaVersion !== 1 ||
              result.operation !== operation ||
              !["PASS", "FAIL"].includes(result.status) ||
              result.fixedReason !== (result.status === "PASS" ? null : operation + "_FAILED")
            )
              fail();
            if (result.status === "PASS")
              validateCleanupStepEvidenceV16(operation, result.evidence, bindings, evidence);
            status = result.status;
            fixedReason = result.fixedReason;
            stepEvidence = result.evidence;
          }
        } catch (error) {
          status = "FAIL";
          fixedReason =
            error instanceof BoundedAdapterFailure && error.quarantined
              ? "ADAPTER_QUARANTINED"
              : error instanceof BoundedAdapterFailure && error.timedOut
                ? performance.now() >= globalDeadline
                  ? "GLOBAL_300000_MS_EXCEEDED"
                  : `${groupName}_GROUP_TIMEOUT`
                : operation + "_FAILED";
          timedOut ||= /TIMEOUT|EXCEEDED/u.test(fixedReason);
          stepEvidence = null;
        }
      }
      if (status === "FAIL") failures.push(fixedReason);
      mergeCleanupEvidenceV16(evidence, operation, stepEvidence);
      const step = {
        sequence: steps.length + 1,
        group: groupName,
        operation,
        status,
        fixedReason,
        durationBucket: durationBucketV16(performance.now() - started),
        evidence: stepEvidence,
      };
      exactKeys(step, V16_CLEANUP_STEP_KEYS);
      steps.push(deepFreeze(step));
    }
    const group = {
      schemaVersion: 1,
      group: groupName,
      started: true,
      completed: true,
      timedOut,
      steps,
      failureCodes: steps.filter((step) => step.status === "FAIL").map((step) => step.fixedReason),
      evidence,
    };
    group.groupSha256 = cleanupGroupDigestV16(group);
    exactKeys(group, V16_CLEANUP_GROUP_KEYS);
    groups.push(deepFreeze(group));
  }
  const byName = Object.fromEntries(groups.map((group) => [group.group, group.evidence]));
  const primaryFailureReason = cleanupFailureReasonV16(workReason, failures);
  const clean = failures.length === 0 && !bindings.adapterQuarantined;
  const state =
    clean && primaryFailureReason === null
      ? "SYNTHETIC_TEST_CLEAN"
      : clean
        ? "SYNTHETIC_TEST_FAILED_CLEAN"
        : "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD";
  const completedBeforeDeadline = performance.now() <= globalDeadline;
  const cleanup = {
    schemaVersion: 1,
    state,
    deadlineStatus:
      completedBeforeDeadline && !failures.includes("GLOBAL_300000_MS_EXCEEDED")
        ? "COMPLETED_WITHIN_GLOBAL_300000_MS"
        : "GLOBAL_300000_MS_EXCEEDED",
    adapterQuarantined: bindings.adapterQuarantined,
    groups,
    cleanupFailureCodes: failures,
    rootLeaseDisposed: byName.FINALIZE.baselineTokensClosed === true,
    parentIdentityRevalidated: byName.ROOT.parentIdentityRevalidated === true,
    rootIdentityRevalidated: byName.ROOT.rootIdentityRevalidated === true,
    exclusiveRootRemoved: byName.ROOT.exclusiveRootRemoved === true,
    preDeleteExpectedOwnedArtifactCount: byName.ROOT.expectedOwnedArtifactCount,
    preDeleteUnexpectedResidueCount: byName.ROOT.unexpectedResidueCount,
    postDeleteResidueCount: byName.ROOT.postDeleteResidueCount,
    compilerProcessCount: byName.QUIESCE.compilerProcessCount,
    fixtureProcessCount: byName.QUIESCE.fixtureProcessCount,
    ownedProcessCount: byName.QUIESCE.ownedProcessCount,
    networkMeasurementAvailable: bindings.networkLease?.available === true,
    networkMeasurementComplete:
      byName.NETWORK.measurementComplete === true && byName.NETWORK.measurementLeaseClosed === true,
    networkBaselineOwnerCount: byName.NETWORK.baselineOwnerCount,
    networkWorkOwnerCount: byName.NETWORK.workOwnerCount,
    networkOwnerCount: byName.NETWORK.observedOwnerCount,
    networkOwnerScopeSha256: byName.NETWORK.ownerScopeSha256,
    networkObservationCount: byName.NETWORK.observationCount,
    networkMaximumGapMicros: byName.NETWORK.maximumGapMicros,
    networkEventCount: byName.NETWORK.eventCount,
    pinnedInputsRevalidated: byName.FINALIZE.pinnedInputsRevalidated === true,
    pinnedInputsClosed: byName.FINALIZE.pinnedInputsClosed === true,
    ownershipLedgerClosed: byName.FINALIZE.ownershipLedgerClosed === true,
    ownershipLedgerPreCleanupSha256: byName.ROOT.ownershipLedgerPreCleanupSha256,
    ownershipLedgerSha256: byName.FINALIZE.ownershipLedgerSha256,
    globalSnapshotMatched: byName.FINALIZE.globalSnapshotMatched === true,
    retainedArtifactCount: byName.ROOT.postDeleteResidueCount,
    globalMutationCount: byName.FINALIZE.globalSnapshotMatched === true ? 0 : 1,
    cleanupCompletedBeforeDeadline: completedBeforeDeadline,
  };
  exactKeys(cleanup, V16_CLEANUP_KEYS);
  return { cleanup: deepFreeze(cleanup), primaryFailureReason };
}

export async function runSyntheticCompileTransaction(plan, ownedAdapter) {
  exactAdapterV16(ownedAdapter);
  if (
    !plain(plan) ||
    plan.schemaVersion !== 1 ||
    plan.authority !== "CONTRACT_SELF_TEST_V1" ||
    !Object.isFrozen(plan) ||
    JSON.stringify(plan.fixtureIds) !== JSON.stringify(SYNTHETIC_COMPILE_CONTRACT.fixtureIds)
  )
    fail();
  const started = performance.now();
  const globalDeadline = started + 300000;
  const workDeadline = started + 270000;
  const bindings = {
    plan,
    networkLease: null,
    rootLease: null,
    ownershipLedger: null,
    pinnedInputLeases: null,
    beforeGlobal: null,
    processIdentities: [],
    adapterQuarantined: false,
  };
  const envelopes = [];
  let completedFixtureCount = 0;
  let workReason = null;
  const setFailure = (reason) => {
    if (workReason === null) workReason = reason;
  };
  const callWork = async (method, args, operationId, processOperation = false) => {
    const now = performance.now();
    const remainingWork = Math.floor(workDeadline - now);
    if (processOperation && remainingWork <= 6000)
      throw new BoundedAdapterFailure("WORK_DEADLINE_EXCEEDED", true);
    if (!Number.isFinite(remainingWork) || remainingWork <= 0)
      throw new BoundedAdapterFailure("WORK_DEADLINE_EXCEEDED", true);
    const maximumTimeoutMs = processOperation
      ? Math.min(30000, remainingWork - 6000)
      : Math.min(30000, remainingWork);
    return invokeAdapterV18({
      adapter: ownedAdapter,
      method,
      args,
      operationId,
      phase: "WORK",
      globalDeadline,
      phaseDeadline: workDeadline,
      maximumTimeoutMs,
      timeoutReason:
        processOperation && maximumTimeoutMs < 30000 ? "WORK_DEADLINE_EXCEEDED" : "PROCESS_TIMEOUT",
      processOperation,
      bindings,
    });
  };
  try {
    bindings.networkLease = validateNetworkLeaseV16(
      await callWork("beginOwnedNetworkMeasurement", [plan], "BASELINE:NETWORK"),
    );
  } catch {
    setFailure("PRE_BASELINE_HOLD");
  }
  if (workReason === null) {
    try {
      bindings.beforeGlobal = validateGlobalSnapshotV16(
        await callWork("captureGlobalMutationSnapshot", [], "BASELINE:GLOBAL"),
      );
    } catch {
      setFailure("PRE_BASELINE_HOLD");
    }
  }
  if (workReason === null) {
    try {
      bindings.pinnedInputLeases = validatePinnedInputsV16(
        await callWork("openPinnedInputLeases", [plan], "BASELINE:PINNED_INPUTS"),
        plan,
      );
      validatePinnedInputsV16(
        await callWork(
          "revalidatePinnedInputLeases",
          [bindings.pinnedInputLeases],
          "BASELINE:PINNED_INPUTS_REVALIDATE",
        ),
        plan,
      );
    } catch (error) {
      setFailure(error instanceof BoundedAdapterFailure ? error.reason : "PINNED_INPUT_INVALID");
    }
  }
  if (workReason === null) {
    try {
      bindings.rootLease = validateRootLease(
        await callWork("allocateOwnedRoot", [plan], "BASELINE:ROOT"),
      );
      bindings.ownershipLedger = validateLedgerV16(
        await callWork("createOwnershipLedger", [bindings.rootLease], "BASELINE:LEDGER"),
        bindings.rootLease.leaseId,
      );
    } catch {
      setFailure("OWNERSHIP_CONTAINMENT_INVALID");
    }
  }
  let output = null;
  if (workReason === null) {
    let compilerStage = "PROCESS";
    try {
      const compilerRuntimeBudget = Math.min(
        30000,
        Math.floor(workDeadline - performance.now() - 6000),
      );
      if (!Number.isFinite(compilerRuntimeBudget) || compilerRuntimeBudget <= 0)
        throw new BoundedAdapterFailure("WORK_DEADLINE_EXCEEDED", true);
      const compilerImage = bindings.pinnedInputLeases.records[0].observedIdentity;
      const compiled = await callWork(
        "runOwnedProcess",
        [
          deepFreeze({
            schemaVersion: 1,
            processRole: "COMPILER",
            fixtureId: null,
            executableIdentity: compilerImage,
            rootLease: bindings.rootLease,
            ownershipLedger: bindings.ownershipLedger,
            pinnedInputLeases: bindings.pinnedInputLeases,
            orderedArguments: SYNTHETIC_COMPILE_CONTRACT.orderedArguments,
            cwdPolicy: SYNTHETIC_COMPILE_CONTRACT.cwdPolicy,
            environment: SYNTHETIC_COMPILE_CONTRACT.closedEnvironment,
            directNoShell: true,
            createSuspended: true,
            job: V16_JOB_POLICY,
            timeoutMs: compilerRuntimeBudget,
            combinedOutputCapBytes: 65536,
          }),
        ],
        "COMPILER",
        true,
      );
      compilerStage = "OUTPUT";
      exactKeys(compiled, V16_PROCESS_RESULT_KEYS);
      if (
        compiled.exitCode !== 0 ||
        !Buffer.isBuffer(compiled.stdout) ||
        compiled.stdout.length !== 0 ||
        !Buffer.isBuffer(compiled.stderr) ||
        compiled.stderr.length !== 0
      )
        fail();
      compilerStage = "CONTAINMENT";
      bindings.ownershipLedger = validateLedgerV16(
        compiled.ownershipLedger,
        bindings.rootLease.leaseId,
      );
      output = validateOwnedOutputV16(
        compiled.outputIdentity,
        bindings.rootLease,
        bindings.ownershipLedger,
      );
      compilerStage = "IMAGE";
      bindings.processIdentities.push(
        validateProcessIdentityV16(compiled.processIdentity, "COMPILER", null, compilerImage),
      );
      compilerStage = "PIN_REVALIDATE";
      validatePinnedInputsV16(
        await callWork(
          "revalidatePinnedInputLeases",
          [bindings.pinnedInputLeases],
          "COMPILER:PINNED_INPUTS_REVALIDATE",
        ),
        plan,
      );
    } catch (error) {
      setFailure(
        error instanceof BoundedAdapterFailure
          ? error.reason
          : compilerStage === "PIN_REVALIDATE"
            ? "PINNED_INPUT_INVALID"
            : compilerStage === "IMAGE"
              ? "PROCESS_IMAGE_IDENTITY_INVALID"
              : compilerStage === "CONTAINMENT"
                ? "OWNERSHIP_CONTAINMENT_INVALID"
                : compilerStage === "OUTPUT"
                  ? "OUTPUT_INVALID"
                  : "PROCESS_FAILED",
      );
    }
  }
  if (workReason === null) {
    for (const row of SYNTHETIC_FIXTURES) {
      let fixtureStage = "PROCESS";
      try {
        const fixtureRuntimeBudget = Math.min(
          30000,
          Math.floor(workDeadline - performance.now() - 6000),
        );
        if (!Number.isFinite(fixtureRuntimeBudget) || fixtureRuntimeBudget <= 0) {
          setFailure("WORK_DEADLINE_EXCEEDED");
          break;
        }
        const executed = await callWork(
          "runOwnedProcess",
          [
            deepFreeze({
              schemaVersion: 1,
              processRole: "FIXTURE",
              fixtureId: row[0],
              executableIdentity: output,
              rootLease: bindings.rootLease,
              ownershipLedger: bindings.ownershipLedger,
              orderedArguments: Object.freeze(["--synthetic-fixture-v1", row[0]]),
              cwdPolicy: SYNTHETIC_COMPILE_CONTRACT.cwdPolicy,
              environment: SYNTHETIC_COMPILE_CONTRACT.closedEnvironment,
              directNoShell: true,
              createSuspended: true,
              job: V16_JOB_POLICY,
              timeoutMs: fixtureRuntimeBudget,
              combinedOutputCapBytes: 65536,
            }),
          ],
          `FIXTURE:${row[0]}`,
          true,
        );
        fixtureStage = "OUTPUT";
        exactKeys(executed, V16_PROCESS_RESULT_KEYS);
        if (
          executed.exitCode !== 0 ||
          !Buffer.isBuffer(executed.stdout) ||
          !Buffer.isBuffer(executed.stderr) ||
          executed.stderr.length !== 0
        )
          fail();
        fixtureStage = "CONTAINMENT";
        const fixtureLedger = validateLedgerV16(
          executed.ownershipLedger,
          bindings.rootLease.leaseId,
        );
        const fixtureOutput = validateOwnedOutputV16(
          executed.outputIdentity,
          bindings.rootLease,
          fixtureLedger,
        );
        if (
          JSON.stringify(fixtureLedger) !== JSON.stringify(bindings.ownershipLedger) ||
          JSON.stringify(fixtureOutput) !== JSON.stringify(output)
        )
          fail();
        fixtureStage = "IMAGE";
        bindings.processIdentities.push(
          validateProcessIdentityV16(executed.processIdentity, "FIXTURE", row[0], output),
        );
        fixtureStage = "ENVELOPE";
        envelopes.push(
          deriveSyntheticEnvelope(validateSyntheticProcessResult(executed.stdout, row[0]), row, {
            retainedArtifactCount: 0,
          }),
        );
        completedFixtureCount += 1;
      } catch (error) {
        setFailure(
          error instanceof BoundedAdapterFailure
            ? error.reason
            : fixtureStage === "IMAGE"
              ? "PROCESS_IMAGE_IDENTITY_INVALID"
              : fixtureStage === "CONTAINMENT"
                ? "OWNERSHIP_CONTAINMENT_INVALID"
                : fixtureStage === "PROCESS"
                  ? "PROCESS_FAILED"
                  : "OUTPUT_INVALID",
        );
        break;
      }
    }
  }
  if (workReason === null) {
    try {
      validatePinnedInputsV16(
        await callWork(
          "revalidatePinnedInputLeases",
          [bindings.pinnedInputLeases],
          "FIXTURES:PINNED_INPUTS_REVALIDATE",
        ),
        plan,
      );
    } catch (error) {
      setFailure(error instanceof BoundedAdapterFailure ? error.reason : "PINNED_INPUT_INVALID");
    }
  }
  const closed = await cleanupV16(ownedAdapter, bindings, globalDeadline, workReason);
  const result = {
    schemaVersion: 1,
    state: closed.cleanup.state,
    primaryFailureReason: closed.primaryFailureReason,
    completedFixtureCount,
    envelopes: closed.primaryFailureReason === null ? envelopes : [],
    cleanup: closed.cleanup,
  };
  exactKeys(result, V16_TRANSACTION_RESULT_KEYS);
  if (
    (result.primaryFailureReason === null &&
      (result.state !== "SYNTHETIC_TEST_CLEAN" ||
        result.completedFixtureCount !== 39 ||
        result.envelopes.length !== 39)) ||
    (result.primaryFailureReason !== null &&
      (!V16_PRIMARY_FAILURES.includes(result.primaryFailureReason) ||
        result.envelopes.length !== 0))
  )
    fail();
  return deepFreeze(result);
}

function validateSyntheticCleanup(cleanup, expectedState) {
  exactKeys(cleanup, SYNTHETIC_CLEANUP_KEYS);
  if (
    cleanup.schemaVersion !== 1 ||
    cleanup.state !== expectedState ||
    cleanup.deadlineStatus !== "COMPLETED_WITHIN_GLOBAL_300000_MS" ||
    cleanup.rootLeaseDisposed !== true ||
    cleanup.parentIdentityRevalidated !== true ||
    cleanup.rootIdentityRevalidated !== true ||
    cleanup.exclusiveRootRemoved !== true ||
    !Number.isSafeInteger(cleanup.preDeleteExpectedOwnedArtifactCount) ||
    cleanup.preDeleteExpectedOwnedArtifactCount < 0 ||
    cleanup.preDeleteExpectedOwnedArtifactCount > 4096 ||
    cleanup.preDeleteUnexpectedResidueCount !== 0 ||
    cleanup.postDeleteResidueCount !== 0 ||
    cleanup.compilerProcessCount !== 0 ||
    cleanup.fixtureProcessCount !== 0 ||
    cleanup.ownedProcessCount !== 0 ||
    cleanup.networkMeasurementAvailable !== true ||
    cleanup.networkMeasurementComplete !== true ||
    cleanup.networkBaselineOwnerCount !== 2 ||
    cleanup.networkWorkOwnerCount !== 40 ||
    cleanup.networkOwnerCount !== 42 ||
    !LOWER_HEX_64.test(cleanup.networkOwnerScopeSha256) ||
    !Number.isSafeInteger(cleanup.networkObservationCount) ||
    cleanup.networkObservationCount < 1 ||
    !Number.isSafeInteger(cleanup.networkMaximumGapMicros) ||
    cleanup.networkMaximumGapMicros < 0 ||
    cleanup.networkMaximumGapMicros > 10000 ||
    cleanup.networkEventCount !== 0 ||
    !LOWER_HEX_64.test(cleanup.ownershipLedgerPreCleanupSha256) ||
    !LOWER_HEX_64.test(cleanup.ownershipLedgerSha256) ||
    cleanup.retainedArtifactCount !== 0 ||
    cleanup.globalMutationCount !== 0 ||
    cleanup.cleanupCompletedBeforeDeadline !== true
  )
    fail();
  return true;
}

function policyLiteralDigest(policy) {
  const normalized = JSON.parse(JSON.stringify(policy));
  const controller = normalized.sourceControl?.newSources?.[1];
  if (controller && typeof controller === "object") {
    controller.byteCount = 0;
    controller.sha256 = "<SELF_SHA256>";
    controller.gitBlobSha1 = "<SELF_GIT_BLOB_SHA1>";
  }
  return hash(Buffer.from(JSON.stringify(normalized), "utf8"));
}

export function validateAddTypeBootstrapPolicy(policy) {
  exactKeys(policy, ROOT_KEYS);
  if (
    policy.schema !== "fluyo:r4b:nuget-verifier-addtype-bootstrap-policy:v1" ||
    policy.policyVersion !== "R4B-NUGET-VERIFIER-CLOSED-ADDTYPE-BOOTSTRAP-v1" ||
    policy.decisionStatus !== "APPROVED_FOR_REPOSITORY_IMPLEMENTATION_ONLY" ||
    policy.decisionDate !== "2026-11-11" ||
    policy.decisionReference !== "MARLON_RECOMMENDED_1A_CLOSED_ADDTYPE_PINVOKE_2026-11-11" ||
    policy.externalActionAuthorized !== false ||
    policy.downloadAuthorityPresent !== false ||
    policy.executionAuthorityPresent !== false
  )
    fail();
  exactKeys(policy.sourceControl, SOURCE_CONTROL_KEYS);
  if (
    policy.sourceControl.sourceMainCommit !== "d6607300e52219c5d534e70c17e00e2e717e505b" ||
    policy.sourceControl.historicalAuthorityBlobSha1 !==
      "4881688075b25726be4b2a03a22b19a9ea5c6419" ||
    policy.sourceControl.historicalAuthoritySha256 !==
      "bd1a523399a76fdcfd88a2afe0e752e24c4f518500d65a6e6b51ddb0834b59cd" ||
    policy.sourceControl.designCommitRequiredBeforeActivation !== true ||
    policy.sourceControl.headChangeInvalidates !== true
  )
    fail();
  if (
    !Array.isArray(policy.sourceControl.newSources) ||
    policy.sourceControl.newSources.length !== 7
  )
    fail();
  policy.sourceControl.newSources.forEach((entry, index) => {
    exactKeys(entry, SOURCE_KEYS);
    if (
      entry.path !== DYNAMIC_SOURCE_PATHS[index] ||
      entry.role !== DYNAMIC_SOURCE_ROLES[index] ||
      !Number.isSafeInteger(entry.byteCount) ||
      entry.byteCount <= 0 ||
      !/^[0-9a-f]{64}$/u.test(entry.sha256) ||
      !/^[0-9a-f]{40}$/u.test(entry.gitBlobSha1)
    )
      fail();
  });
  exactKeys(policy.powerShellHost, HOST_KEYS);
  if (policy.powerShellHost.signaturePolicy !== "PINNED_MICROSOFT_OS_CATALOG_VALID") fail();
  const records = [
    policy.powerShellHost.executable,
    policy.powerShellHost.configuration,
    policy.powerShellHost.automationAssembly,
    policy.powerShellHost.utilityModuleManifest,
    policy.powerShellHost.utilityModuleScript,
    policy.powerShellHost.utilityAssembly,
    policy.powerShellHost.clr,
    policy.powerShellHost.mscorlib,
    policy.powerShellHost.compiler,
    policy.powerShellHost.compilerConfiguration,
    ...policy.powerShellHost.compilerReferences.slice(1),
  ];
  if (
    !Array.isArray(policy.powerShellHost.compilerReferences) ||
    policy.powerShellHost.compilerReferences.length !== 3 ||
    JSON.stringify(policy.powerShellHost.compilerReferences[0]) !==
      JSON.stringify(policy.powerShellHost.mscorlib) ||
    records.length !== 12
  )
    fail();
  records.forEach((record, index) => {
    exactKeys(record, index === 0 ? HOST_EXECUTABLE_RECORD_KEYS : HOST_RECORD_KEYS);
    const pin = PINNED_HOSTS[index];
    if (
      record.path !== pin[0] ||
      record.byteCount !== pin[1] ||
      record.sha256 !== pin[2] ||
      record.fileVersion !== pin[3] ||
      record.productVersion !== pin[4] ||
      record.signatureStatus !== "Valid" ||
      record.signatureType !== "Catalog" ||
      record.signerThumbprint !== pin[5] ||
      record.signerSubject !== pin[6] ||
      record.signerIssuer !== pin[7]
    )
      fail();
  });
  if (
    policy.powerShellHost.executable.normalizedImagePathSha256 !==
    "9fb73839bbbf71d76eb5494bd12cf8939b28503a45bcef20d7af749d20ea3a15"
  )
    fail();
  exactKeys(policy.bootstrap, BOOTSTRAP_KEYS);
  if (
    policy.bootstrap.mechanism !== BOOTSTRAP_MECHANISM ||
    policy.bootstrap.scriptEncoding !== "ASCII_UTF8_NO_BOM_LF_ONLY" ||
    policy.bootstrap.scriptByteCap !== 8192 ||
    policy.bootstrap.auditSourceEncoding !== "STRICT_UTF8_NO_BOM_LF_ONLY" ||
    policy.bootstrap.auditSourceByteCap !== 131072 ||
    policy.bootstrap.addTypePolicy.sourceMode !== "EXACT_PINNED_INPUT_LEASE_BYTES"
  )
    fail();
  same(policy.bootstrap.orderedArguments, [
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
  exactKeys(policy.bootstrap.syntheticPolicy, SYNTHETIC_POLICY_KEYS);
  if (
    policy.bootstrap.syntheticAdapterPath !==
      "scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs" ||
    policy.bootstrap.syntheticPolicy.mode !== "CONTRACT_SELF_TEST_V1_13_6" ||
    policy.bootstrap.syntheticPolicy.tracePinSchema !== "R4B-AUTHENTICODE-TRACE-PINS-v1.13.6" ||
    policy.bootstrap.syntheticPolicy.networkEvidenceMode !==
      "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1" ||
    policy.bootstrap.syntheticPolicy.zeroNetworkRequired !== true ||
    policy.bootstrap.syntheticPolicy.tempOnly !== true ||
    policy.bootstrap.syntheticPolicy.activationConsumptionAllowed !== false ||
    policy.bootstrap.syntheticPolicy.downloadAllowed !== false ||
    policy.bootstrap.syntheticPolicy.retainedArtifactCount !== 0 ||
    policy.bootstrap.syntheticPolicy.globalMutationAllowed !== false ||
    !Array.isArray(policy.bootstrap.syntheticPolicy.tracePins) ||
    policy.bootstrap.syntheticPolicy.tracePins.length !== 39
  )
    fail();
  const controller = policy.bootstrap.syntheticPolicy.controller;
  exactKeys(controller, SYNTHETIC_CONTROLLER_KEYS);
  exactKeys(controller.timeoutMs, SYNTHETIC_CONTROLLER_TIMEOUT_KEYS);
  exactKeys(controller.cleanupGroupTimeoutMs, SYNTHETIC_CONTROLLER_GROUP_TIMEOUT_KEYS);
  if (
    controller.version !== "R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.6" ||
    JSON.stringify(controller.adapterMethods) !== JSON.stringify(V16_ADAPTER_METHODS) ||
    JSON.stringify(controller.timeoutMs) !==
      JSON.stringify({
        global: 300000,
        work: 270000,
        process: 30000,
        forceStop: 5000,
        abortSettlement: 1000,
      }) ||
    JSON.stringify(controller.cleanupGroupTimeoutMs) !==
      JSON.stringify({ QUIESCE: 5000, NETWORK: 5000, ROOT: 10000, FINALIZE: 10000 }) ||
    JSON.stringify(controller.terminalStates) !==
      JSON.stringify([
        "SYNTHETIC_TEST_CLEAN",
        "SYNTHETIC_TEST_FAILED_CLEAN",
        "SYNTHETIC_TEST_FAILED_CLEANUP_HOLD",
      ]) ||
    JSON.stringify(controller.deadlineStatuses) !==
      JSON.stringify(["COMPLETED_WITHIN_GLOBAL_300000_MS", "GLOBAL_300000_MS_EXCEEDED"]) ||
    JSON.stringify(controller.baselineTokenOrder) !==
      JSON.stringify(["ROOT_LEASE", "GLOBAL_BASELINE"])
  )
    fail();
  const concreteAdapter = policy.bootstrap.syntheticPolicy.concreteAdapter;
  exactKeys(concreteAdapter, CONCRETE_ADAPTER_KEYS);
  exactKeys(concreteAdapter.nodeHost, [
    "path",
    "version",
    "byteCount",
    "sha256",
    "normalizedImagePathSha256",
  ]);
  if (
    concreteAdapter.nodeHost.normalizedImagePathSha256 !==
    "46674df7e50081977073a3d38239a6782e73328bda5843f5d5a85d4118d98357"
  )
    fail();
  if (
    hash(Buffer.from(JSON.stringify(concreteAdapter), "utf8")) !== EXPECTED_CONCRETE_ADAPTER_SHA256
  )
    fail();
  policy.bootstrap.syntheticPolicy.tracePins.forEach((row, index) => {
    exactKeys(row, TRACE_PIN_KEYS);
    const expected = INDEPENDENT_TRACE_ORACLE[index];
    if (
      row.fixtureId !== expected.fixtureId ||
      row.expectedOutcome !== expected.expectedOutcome ||
      row.fixedReason !== expected.fixedReason ||
      row.terminalOperation !== expected.terminalOperation ||
      row.resolverTraceSha256 !== expected.resolverTraceSha256 ||
      row.resourceTraceSha256 !== expected.resourceTraceSha256 ||
      !LOWER_HEX_64.test(row.resolverTraceSha256) ||
      !LOWER_HEX_64.test(row.resourceTraceSha256)
    )
      fail();
  });
  exactKeys(policy.futureActivation, FUTURE_KEYS);
  if (
    policy.futureActivation.initialState !== BOOTSTRAP_TERMINAL ||
    policy.futureActivation.externalActionAuthorized !== false ||
    policy.futureActivation.downloadAuthorityPresent !== false ||
    policy.futureActivation.executionAuthorityPresent !== false ||
    policy.futureActivation.maximumTransactions !== 1
  )
    fail();
  same(policy.forbiddenActions, FORBIDDEN);
  if (policyLiteralDigest(policy) !== EXPECTED_POLICY_LITERAL_SHA256) fail();
  return true;
}

export function captureEncodedBootstrap(policy, scriptBytes, auditBytes) {
  validateAddTypeBootstrapPolicy(policy);
  if (
    !Buffer.isBuffer(scriptBytes) ||
    scriptBytes.length <= 0 ||
    scriptBytes.length > 8192 ||
    !Buffer.isBuffer(auditBytes) ||
    auditBytes.length <= 0 ||
    auditBytes.length > 131072
  )
    fail();
  for (const byte of scriptBytes)
    if (byte !== 9 && byte !== 10 && (byte < 0x20 || byte > 0x7e)) fail();
  const text = scriptBytes.toString("ascii");
  if (
    text.includes("\r") ||
    text.includes("\0") ||
    text.charCodeAt(0) === 0xfeff ||
    text.includes("-EncodedCommand") ||
    text.includes("BEGIN FLUYO_CLOSED_ADDTYPE_SOURCE")
  )
    fail();
  if (auditBytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) || auditBytes.includes(13))
    fail();
  let auditText;
  try {
    auditText = new TextDecoder("utf-8", { fatal: true }).decode(auditBytes);
  } catch {
    fail();
  }
  if (auditText.includes("\r") || !text.includes("[IO.FileShare]::Read")) fail();
  return deepFreeze({
    scriptByteCount: scriptBytes.length,
    scriptSha256: hash(scriptBytes),
    scriptGitBlobSha1: gitBlob(scriptBytes),
    auditByteCount: auditBytes.length,
    auditSha256: hash(auditBytes),
    auditGitBlobSha1: gitBlob(auditBytes),
    auditSourceMode: "EXACT_PINNED_INPUT_LEASE_BYTES",
    orderedArgumentsSha256: hash(Buffer.from(policy.bootstrap.orderedArguments.join("\0") + "\n")),
    fileShare: "READ",
  });
}

export function validateAddTypeAuditSource(source) {
  if (typeof source !== "string" || Buffer.byteLength(source) > 131072) fail();
  const found = {};
  for (const match of source.matchAll(
    /\[DllImport\("([^"]+)"[^\]]*\)\]\s+(?:public|private)\s+static\s+extern\s+\S+\s+(\w+)\s*\(/gu,
  )) {
    (found[match[1]] ??= []).push(match[2]);
  }
  for (const [dll, names] of Object.entries(AUDIT_SOURCE_DLL_IMPORTS)) same(found[dll], names);
  same(Object.keys(found), Object.keys(AUDIT_SOURCE_DLL_IMPORTS));
  for (const forbidden of [
    "WinHTTP",
    "WinInet",
    "URLMon",
    "WS2_32",
    "LoadLibrary",
    "GetProcAddress",
    "WriteProcessMemory",
    "VirtualAllocEx",
    "CreateRemoteThread",
  ])
    if (source.includes(forbidden)) fail();
  return true;
}

export function validateAuthenticodeHelperSource(source) {
  if (typeof source !== "string" || Buffer.byteLength(source) <= 0) fail();
  const found = {};
  for (const match of source.matchAll(
    /\[DllImport\("([^"]+)"[^\]]*\)\]\s+(?:public|private)\s+static\s+extern\s+\S+\s+(\w+)\s*\(/gu,
  )) {
    (found[match[1]] ??= []).push(match[2]);
  }
  same(found, AUTHENTICODE_HELPER_DLL_IMPORTS);
  for (const required of [
    "private sealed class ByteString",
    "private enum ContentKind { EMBEDDED_SIGNED,NO_EMBEDDED,DETACHED }",
    "private enum CatalogClassification { CATALOG_PRESENT,CATALOG_ABSENT,CLASSIFICATION_ERROR }",
    "private enum TimestampKind { LEGACY,RFC3161 }",
    "private enum StoreRole { NONE,ORIGINAL_STORE,RFC_TS_STORE }",
    "private interface IAuthenticodeBackend",
    "private sealed class WinCryptBackend",
    "private static class AuthenticodeResolver",
    "private sealed class ResourceFactory",
    "private sealed class TraceRecorder",
    "private sealed class SyntheticBackend",
    "TargetSnapshot CaptureTargetBefore()",
    "ContentEnvelope OpenEmbeddedMessage(ByteString heldBytes)",
    "CatalogClassification ClassifyCatalogIfNoEmbedded(TargetSnapshot heldTarget)",
    "ReadOnlyCollection<CertificateRecord> EnumerateCertificates(IOwnedStore store)",
    "void EnablePrimaryStrongSignature(ContentEnvelope content)",
    "bool VerifyPrimaryMessageSignature(ContentEnvelope content,CertificateRecord signer)",
    "bool VerifyPeIndirectDigest(ContentEnvelope content,TargetSnapshot heldTarget)",
    "IOwnedDigestCallback AdoptDigestCallback(DigestFunction callback)",
    "IOwnedSha256Digest AdoptSha256Digest(SHA256Managed digest)",
    '"IMAGE_DIGEST_CALLBACK_HANDLE"',
    '"SHA256_DIGEST"',
    "uint GetSignerCount(ContentEnvelope content)",
    "TargetSnapshot CaptureTargetAfter()",
    "int ObservedNetworkRequestCount { get; }",
    "IOwnedBuffer AdoptHGlobal(ref IntPtr pointer,int byteCount,string resourceType)",
    "AdoptMessage(ref IntPtr handle)",
    "AdoptStore(ref IntPtr handle,StoreRole role)",
    "AllocateBytes(byte[] value,string resourceType)",
    "AllocateAscii(string value,string resourceType)",
    "AllocateStruct<T>(T value,string resourceType)",
    "CertEnumCertificatesInStore",
    "CertDuplicateCertificateContext",
    "CERT_QUERY_CONTENT_FLAGS_V16",
    "ImageGetDigestStream",
    "CryptCATAdminAcquireContext2",
    "CMSG_CTRL_ENABLE_STRONG_SIGNATURE",
    "REVOCATION_UNAVAILABLE_MASK",
    "ADOPT_FAIL_CLOSED",
    "CERT_CHAIN_REVOCATION_CHECK_CHAIN|CERT_CHAIN_CACHE_ONLY_URL_RETRIEVAL",
    "value%TimeSpan.TicksPerSecond!=0",
    "READ_ONLY_DENY_WRITE_DELETE_HELD",
    "CATALOG_SIGNATURE_REJECTED",
    "OFFLINE_REVOCATION_UNAVAILABLE",
    "CERTIFICATE_FIELDS_INVALID",
    "VERSION_INVALID",
    "FILE_IDENTITY_DRIFT",
    "private static readonly string[] InternalResultKeys",
    "InternalResultKeys.Length!=9",
    "SYNTHETIC_CONTRACT_INVALID\\n",
    "OUTPUT_TRAILING",
    "#if FLUYO_SYNTHETIC_TESTS",
  ])
    if (!source.includes(required)) fail();
  for (const forbidden of [
    "System.Net",
    "HttpClient",
    "WebClient",
    "WinHTTP",
    "WinInet",
    "URLMon",
    "WS2_32",
    "Socket",
    "error.Message",
    "Exception error",
    "WinVerifyTrust",
    "CertGetSubjectCertificateFromStore",
    "LoadLibrary",
    "GetProcAddress",
    "CRYPT_DECODE_ALLOC_FLAG",
    "CertGetSubjectCertificateFromStore",
  ])
    if (source.includes(forbidden)) fail();
  same(
    [...source.matchAll(/new FixtureDefinition\("([A-Z0-9_]+)"/gu)].map((match) => match[1]),
    SYNTHETIC_FIXTURES.map((row) => row[0]),
  );
  if ((source.match(/private static readonly string\[\] InternalResultKeys/gu) ?? []).length !== 1)
    fail();
  const syntheticGuards = source.match(/#if\s+([A-Z0-9_]+)/gu) ?? [];
  if (
    syntheticGuards.length < 1 ||
    syntheticGuards.some((value) => value !== "#if FLUYO_SYNTHETIC_TESTS")
  )
    fail();
  return true;
}

export function verifyPinnedRepositorySources(policy, readBytes) {
  validateAddTypeBootstrapPolicy(policy);
  for (const entry of policy.sourceControl.newSources) {
    const bytes = readBytes(entry.path);
    if (
      !Buffer.isBuffer(bytes) ||
      bytes.length !== entry.byteCount ||
      hash(bytes) !== entry.sha256 ||
      gitBlob(bytes) !== entry.gitBlobSha1
    )
      fail();
  }
  const script = readBytes(policy.bootstrap.scriptPath),
    audit = readBytes(policy.bootstrap.auditSourcePath),
    helper = readBytes(policy.bootstrap.helperSourcePath);
  validateAddTypeAuditSource(audit.toString("ascii"));
  validateAuthenticodeHelperSource(helper.toString("utf8"));
  return captureEncodedBootstrap(policy, script, audit);
}

export function readAddTypeBootstrapPolicy(bytes) {
  if (!(Buffer.isBuffer(bytes) || typeof bytes === "string")) fail();
  const policy = JSON.parse(Buffer.isBuffer(bytes) ? bytes.toString("utf8") : bytes);
  validateAddTypeBootstrapPolicy(policy);
  return deepFreeze(policy);
}

export const addTypeBootstrapTesting = Object.freeze({
  hash,
  gitBlob,
  exactKeys,
  deepFreeze,
  DLL_IMPORTS,
  AUTHENTICODE_HELPER_DLL_IMPORTS,
  PINNED_HOSTS,
  policyLiteralDigest,
  SYNTHETIC_AUTHENTICODE_KEYS,
  validateSyntheticAuthenticodeFixture,
  SYNTHETIC_PROCESS_RESULT_KEYS,
  SYNTHETIC_ENVELOPE_KEYS,
  SYNTHETIC_FIXTURES,
  SYNTHETIC_CLEANUP_KEYS,
  FILE_IDENTITY_KEYS,
  ROOT_LEASE_KEYS,
  PROCESS_IDENTITY_KEYS,
  NETWORK_MEASUREMENT_KEYS,
  INVENTORY_KEYS,
  SYNTHETIC_COMPILE_CONTRACT,
  SYNTHETIC_STATE_ORDER,
  SYNTHETIC_ADAPTER_METHODS,
  validateSyntheticProcessResult,
  deriveSyntheticEnvelope,
  validateSyntheticEnvelope,
  validateSyntheticCleanup,
  INDEPENDENT_TRACE_ORACLE,
  TRACE_PIN_KEYS,
  V16_ADAPTER_METHODS,
  V16_FILE_IDENTITY_KEYS,
  V16_PINNED_INPUT_RECORD_KEYS,
  V16_PINNED_INPUT_SET_KEYS,
  V16_GLOBAL_SNAPSHOT_KEYS,
  V16_NETWORK_LEASE_KEYS,
  V16_LEDGER_KEYS,
  V16_OWNED_OUTPUT_KEYS,
  V16_PROCESS_IDENTITY_KEYS,
  V16_OPERATION_CONTEXT_KEYS,
  V16_PROCESS_RESULT_KEYS,
  V16_CLEANUP_RESULT_KEYS,
  V16_CLEANUP_STEP_KEYS,
  V16_CLEANUP_GROUP_KEYS,
  V16_CLEANUP_KEYS,
  V16_TRANSACTION_RESULT_KEYS,
  V16_PRIMARY_FAILURES,
  V16_PIN_ROWS,
  V16_CLEANUP_OPERATIONS,
  validateFileIdentityV16,
  validatePinnedInputsV16,
  validateGlobalSnapshotV16,
  validateNetworkLeaseV16,
  validateLedgerV16,
  validateRootLease,
  validateOwnedOutputV16,
  validateProcessIdentityV16,
  ownerScopeHashV16,
  cleanupGroupDigestV16,
  requirePositiveDispatchRemainingV18,
  invokeAdapterV18,
  forceStopV18,
  validateForceStopEvidenceV16,
});
