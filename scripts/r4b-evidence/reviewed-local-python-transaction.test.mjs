import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EVIDENCE_FILES,
  FINAL_STATES,
  NETWORK_OBSERVATION_SCHEMA,
  OUTER_FAILURES,
  REVIEWED_LOCAL_BOOTSTRAP_V2,
  REVIEWED_LOCAL_BOOTSTRAP_V2_SHA256,
  ROOT_MANIFEST_SCHEMA,
  TRANSACTION_SUBDIRECTORY,
  canonicalRootManifest,
  consumptionMarker,
  executeReviewedLocalTransactionWithDependencies,
  outerReceipt,
  parsePrivatePacket,
  reviewedLocalTransactionTesting,
  settlementRecord,
  validateGlobalSnapshot,
  validateCombinedCaptureTraceForTesting,
  validateIntrospectionOutput,
  validateLoadedImageEvidenceForTesting,
  validateNativeTerminalTraceForTesting,
  validateNativeRequest,
  validateNativeResult,
  validateTwoWriterCaptureInterleavingForTesting,
} from "./reviewed-local-python-transaction.mjs";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const SOURCE = "d".repeat(40);
const ROOT_VOLUME = "1".repeat(16);
const PYTHON_ID = "2".repeat(32);
const RUNTIME_ID = "3".repeat(32);
const WINDOWS_VOLUME = "4".repeat(16);
const SYSTEM32_ROOT_ID = "5".repeat(32);
const KERNEL32_ID = "6".repeat(32);
const EMPTY = createHash("sha256").update(Buffer.alloc(0)).digest("hex");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const throws = (callback, code) => assert.throws(callback, new RegExp(code, "u"));

const row = (kind, path, identity, extra = {}) => ({
  kind,
  path,
  identity,
  volumeIdentity: "volume-1",
  regular: kind === "F",
  directory: kind === "D",
  symlink: false,
  reparse: false,
  junction: false,
  mount: false,
  stable: true,
  hardLinkCount: 1,
  ...(kind === "F" ? { byteCount: 8, sha256: A } : {}),
  ...extra,
});
const rootRows = () => [
  row("D", "DLLs/", "dir-dlls"),
  row("F", "DLLs/_ssl.pyd", "file-ssl", { sha256: B }),
  row("F", "python.exe", "file-python"),
  row("F", "python312.dll", "file-dll", { sha256: C }),
];
const signature = (executableSha = A) => {
  const value = {
    method: "WINCRYPT_AUTHENTICODE_OFFLINE_CACHE_V1",
    status: "VALID",
    signatureType: "AUTHENTICODE_EMBEDDED",
    observedSha256: executableSha,
    signerSubject: "Python Software Foundation",
    signerThumbprint: "A".repeat(40),
    chainStatus: "TRUSTED",
    revocationPolicy: "OFFLINE_CACHE_ONLY_NO_NETWORK",
    revocationStatus: "VALID_WITH_COMPLETE_OFFLINE_REVOCATION",
    verificationUtc: "2026-11-14T00:00:00Z",
    evidenceSha256: "",
  };
  value.evidenceSha256 = hash(
    JSON.stringify(Object.fromEntries(Object.entries(value).slice(0, -1))),
  );
  return value;
};
const packet = () => {
  const manifest = canonicalRootManifest(rootRows());
  const value = {
    schema: "fluyo:r4b:test-python-reviewed-local-binding:v2",
    mode: "REVIEWED_LOCAL",
    transactionId: A,
    root: "C:\\Python312",
    expectedExecutableSha256: A,
    expectedVersion: [3, 12, 5],
    provenance: "PSF_CPYTHON_INTERPRETER",
    expectedRootManifestSha256: manifest.sha256,
    expectedRootFileCount: manifest.fileCount,
    expectedRootDirectoryCount: manifest.directoryCount,
    expectedRootByteCount: manifest.byteCount,
    signatureEvidence: signature(),
    publicBindingDigest: "",
  };
  value.publicBindingDigest = hash(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(value).filter(([key]) => !["root", "publicBindingDigest"].includes(key)),
      ),
    ),
  );
  return value;
};
const rawPacket = () => JSON.stringify(packet());
const marker = () => ({
  schemaVersion: 1,
  transactionId: A,
  state: "CONSUMED_PRESPAWN",
  sourceCommit: SOURCE,
  packetSha256: A,
  publicBindingDigest: A,
  expectedExecutableSha256: A,
  expectedRootManifestSha256: A,
  expectedVersion: [3, 12, 5],
  provenance: "PSF_CPYTHON_INTERPRETER",
  signatureEvidenceSha256: A,
});
const settlement = (overrides = {}) => ({
  schemaVersion: 1,
  transactionId: A,
  state: "SETTLED_FAILURE",
  candidateClass: "REVIEWED_LOCAL",
  stage: "PROCESS_INVALID",
  failureCode: OUTER_FAILURES.PROCESS_INVALID,
  publicBindingDigest: A,
  rootManifestSha256: A,
  rootFileCount: 3,
  rootDirectoryCount: 1,
  rootByteCount: 24,
  signatureEvidenceSha256: A,
  childSpawnAttempted: true,
  childStarted: true,
  exitObserved: true,
  exitCode: 1,
  signalClass: "NONE",
  stdoutByteCount: 0,
  stdoutSha256: EMPTY,
  stderrByteCount: 0,
  stderrSha256: EMPTY,
  processOwnerCount: 1,
  processResidualCount: 0,
  networkObservationCount: 1,
  networkMaximumGapMicros: 2_500,
  networkEventCount: 0,
  globalMutationCount: 0,
  rootFinalRevalidated: true,
  ...overrides,
});
const receipt = (overrides = {}) => ({
  schemaVersion: 1,
  transactionId: A,
  state: "REVIEWED_LOCAL_FAILED_CLEAN",
  publicBindingDigest: A,
  consumptionMarkerSha256: A,
  settlementSha256: A,
  cleanupState: "CLEAN",
  residueState: "ZERO",
  ownedTempEntryCount: 0,
  processResidualCount: 0,
  networkEventCount: 0,
  globalMutationCount: 0,
  rootFinalRevalidated: true,
  evidenceFileCount: 3,
  validEvidenceFileCount: 3,
  evidenceRetention: "PERMANENT_LOCAL_NON_PRODUCT_EVIDENCE_DO_NOT_DELETE",
  ...overrides,
});
const receiptContext = (overrides = {}) => ({
  markerState: "VALID",
  settlementState: "SETTLED_FAILURE",
  evidenceFileCount: 3,
  validEvidenceFileCount: 3,
  ...overrides,
});
const globalSnapshot = (overrides = {}) => {
  const value = {
    schemaVersion: 1,
    complete: true,
    pathEnvironmentSha256: A,
    modulePathSha256: A,
    nugetEnvironmentSha256: A,
    proxyEnvironmentSha256: A,
    powerShellProfileInventorySha256: A,
    gacInventorySha256: A,
    nugetCacheInventorySha256: A,
    repositoryStatusSha256: A,
    serviceTaskInventorySha256: A,
    autorunRegistrySha256: A,
    aggregateSha256: "",
    ...overrides,
  };
  value.aggregateSha256 = hash(
    JSON.stringify(Object.fromEntries(Object.entries(value).slice(2, -1))),
  );
  return value;
};
const nativeRequest = () => ({
  transactionId: A,
  executablePath: "C:\\Python312\\python.exe",
  executableSha256: A,
  rootPath: "C:\\Python312",
  trustedTempRootPath: "C:\\Temp",
  ownedPath: `C:\\Temp\\fluyo-r4b\\python-reviewed-local-v2\\${A}`,
  rootManifestFiles: Object.freeze(
    canonicalRootManifest(rootRows())
      .rows.filter((item) => item.kind === "F")
      .map((item) =>
        Object.freeze({
          path: item.path,
          identity: item.identity,
          volumeIdentity: item.volumeIdentity,
          byteCount: item.byteCount,
          sha256: item.sha256,
        }),
      ),
  ),
  systemRoot: "C:\\Windows",
  introspectionUtf8: REVIEWED_LOCAL_BOOTSTRAP_V2,
  introspectionSha256: REVIEWED_LOCAL_BOOTSTRAP_V2_SHA256,
  timeoutMs: 10_000,
  combinedCapBytes: 4_096,
  networkPollTargetMicros: 2_500,
  networkMaximumGapMicros: 10_000,
});
const nativeResult = (overrides = {}) => ({
  childStarted: true,
  exitObserved: true,
  exitCode: 0,
  signalClass: "NONE",
  stdoutBytes: Buffer.from(
    `${JSON.stringify({ executable: "C:\\Python312\\python.exe", sha256: A, version: [3, 12, 5] })}\r\n`,
  ),
  stderrBytes: Buffer.alloc(0),
  processOwnerCount: 1,
  processResidualCount: 0,
  networkObservationCount: 2,
  networkMaximumGapMicros: 2_500,
  networkEventCount: 0,
  loadedImageBoundaryValid: true,
  loadedImageCount: 3,
  rootManifestImageCount: 2,
  system32ImageCount: 1,
  loadedImageEvidenceSha256: A,
  globalBefore: A,
  globalAfter: A,
  ownedResidueCount: 0,
  ...overrides,
});
const loadedObservation = (overrides = {}) => ({
  initialPath: "C:\\Python312\\python.exe",
  finalPath: "C:\\Python312\\python.exe",
  relativeRootPath: "python.exe",
  initialIdentity: PYTHON_ID,
  finalIdentity: PYTHON_ID,
  initialVolumeIdentity: ROOT_VOLUME,
  finalVolumeIdentity: ROOT_VOLUME,
  initialByteCount: 8,
  finalByteCount: 8,
  initialSha256: A,
  finalSha256: A,
  regular: true,
  reparse: false,
  mount: false,
  stable: true,
  system32RootIdentity: null,
  ...overrides,
});
const loadedImageInput = (overrides = {}) => ({
  observations: [
    loadedObservation(),
    loadedObservation({
      initialPath: "C:\\Python312\\python312.dll",
      finalPath: "C:\\Python312\\python312.dll",
      relativeRootPath: "python312.dll",
      initialIdentity: RUNTIME_ID,
      finalIdentity: RUNTIME_ID,
      initialSha256: C,
      finalSha256: C,
    }),
    loadedObservation({
      initialPath: "C:\\Windows\\System32\\kernel32.dll",
      finalPath: "C:\\Windows\\System32\\kernel32.dll",
      relativeRootPath: null,
      initialIdentity: KERNEL32_ID,
      finalIdentity: KERNEL32_ID,
      initialVolumeIdentity: WINDOWS_VOLUME,
      finalVolumeIdentity: WINDOWS_VOLUME,
      initialSha256: B,
      finalSha256: B,
      system32RootIdentity: SYSTEM32_ROOT_ID,
    }),
  ],
  rootManifestFiles: Object.freeze([
    Object.freeze({
      path: "python.exe",
      identity: PYTHON_ID,
      volumeIdentity: ROOT_VOLUME,
      byteCount: 8,
      sha256: A,
    }),
    Object.freeze({
      path: "python312.dll",
      identity: RUNTIME_ID,
      volumeIdentity: ROOT_VOLUME,
      byteCount: 8,
      sha256: C,
    }),
  ]),
  system32Root: {
    path: "C:\\Windows\\System32",
    identity: SYSTEM32_ROOT_ID,
    volumeIdentity: WINDOWS_VOLUME,
  },
  ...overrides,
});
const settlementContext = () => {
  const bytes = nativeResult().stdoutBytes;
  return {
    expectedSuccessStdoutByteCount: bytes.length,
    expectedSuccessStdoutSha256: hash(bytes),
    emptySha256: EMPTY,
  };
};
const successSettlement = (overrides = {}) =>
  settlement({
    state: "SETTLED_SUCCESS",
    stage: "SUCCESS",
    failureCode: null,
    exitCode: 0,
    stdoutByteCount: settlementContext().expectedSuccessStdoutByteCount,
    stdoutSha256: settlementContext().expectedSuccessStdoutSha256,
    ...overrides,
  });

function memoryDependencies(overrides = {}) {
  const files = new Map();
  const trace = [];
  const dependencies = {
    verifyRepository: () => ({
      clean: true,
      trackedExact: true,
      indexExact: true,
      reviewBindingValid: true,
    }),
    holdCommonDirectory: () => ({ identity: A }),
    revalidateCommonDirectory: () => trace.push("common"),
    walkRoot: () => rootRows(),
    verifyExecutableAndSignature: () => trace.push("signature"),
    createTransactionDirectoryExclusive: () => ({ identity: B }),
    openEvidenceExclusive: (_directory, name) => {
      if (files.has(name)) throw new Error("EEXIST");
      files.set(name, Buffer.alloc(0));
      return name;
    },
    writeEvidence: (name, bytes) => files.set(name, Buffer.from(bytes)),
    fsyncEvidence: () => trace.push("fsync-file"),
    closeEvidence: () => {},
    fsyncDirectory: () => trace.push("fsync-dir"),
    reopenEvidence: (_directory, name) => name,
    readEvidence: (name) => Buffer.from(files.get(name)),
    inventoryEvidenceDirectory: () => ({
      entries: EVIDENCE_FILES.map((name) => ({
        name,
        present: files.has(name),
        regular: files.has(name),
        reparse: false,
        identityStable: true,
        bytes: files.has(name) ? Buffer.from(files.get(name)) : null,
      })),
      extraEntryCount: 0,
    }),
    holdTrustedWindowsTempRoot: () => ({ identity: "temp-root", path: "C:\\Temp" }),
    revalidateTrustedWindowsTempRoot: () => trace.push("trusted-temp"),
    createOwnedTempExclusive: () => ({ identity: C }),
    revalidateOwnedTemp: () => trace.push("owned-temp"),
    captureGlobalSnapshot: () => globalSnapshot(),
    startNetworkObserver: () => ({ identity: "network" }),
    stopNetworkObserver: () => ({
      complete: true,
      observationCount: 2,
      maximumGapMicros: 2_500,
      eventCount: 0,
    }),
    nativeLease: { available: true, request: () => nativeRequest(), Execute: () => nativeResult() },
    cleanupOwnedTemp: () => "CLEAN",
    inspectOwnedTemp: () => 0,
    ...overrides,
  };
  return { dependencies, files, trace };
}
const request = () => ({
  sourceCommit: SOURCE,
  policyDigest: A,
  expectedCommonDirIdentity: A,
  privatePacketRaw: rawPacket(),
});

const cases = [
  [
    "01 canonical v2 packet order and public digest",
    () =>
      assert.equal(
        parsePrivatePacket(rawPacket()).publicBindingDigest,
        packet().publicBindingDigest,
      ),
  ],
  [
    "02 safe manifest counts and bytes",
    () =>
      assert.deepEqual(
        Object.fromEntries(
          Object.entries(canonicalRootManifest(rootRows())).filter(([key]) =>
            ["fileCount", "directoryCount", "byteCount"].includes(key),
          ),
        ),
        { fileCount: 3, directoryCount: 1, byteCount: 24 },
      ),
  ],
  [
    "03 valid signature evidence digest",
    () =>
      assert.equal(
        parsePrivatePacket(rawPacket()).signatureEvidence.evidenceSha256,
        signature().evidenceSha256,
      ),
  ],
  [
    "04 rejects wrong signature status and revocation",
    () => {
      const p = packet();
      p.signatureEvidence.status = "UNKNOWN";
      throws(() => parsePrivatePacket(JSON.stringify(p)), "SIGNATURE");
    },
  ],
  [
    "05 rejects private signer disclosure in durable records",
    () =>
      throws(
        () => settlementRecord(settlement({ failureCode: "C:\\private" }), settlementContext()),
        "SETTLEMENT",
      ),
  ],
  [
    "06 complete directory and file manifest",
    () => assert.equal(canonicalRootManifest(rootRows()).rows.length, 4),
  ],
  [
    "07 manifest mutation changes digest",
    () => {
      const mutated = rootRows();
      mutated[1].sha256 = C;
      assert.notEqual(
        canonicalRootManifest(mutated).sha256,
        canonicalRootManifest(rootRows()).sha256,
      );
    },
  ],
  [
    "08 rejects path alias and identity duplicates",
    () => {
      const rows = rootRows();
      rows[1].identity = rows[2].identity;
      throws(() => canonicalRootManifest(rows), "ROOT_MANIFEST");
    },
  ],
  [
    "09 repeated root revalidation is required",
    () => {
      const { dependencies } = memoryDependencies();
      let count = 0;
      dependencies.walkRoot = () => {
        count += 1;
        return rootRows();
      };
      executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.equal(count, 4);
    },
  ],
  [
    "10 executable signature and root correlate",
    () => {
      const p = packet();
      p.signatureEvidence.observedSha256 = B;
      throws(() => parsePrivatePacket(JSON.stringify(p)), "SIGNATURE");
    },
  ],
  [
    "11 owned cwd TEMP and TMP are closed",
    () =>
      assert.deepEqual(reviewedLocalTransactionTesting.NATIVE_REQUEST_KEYS, [
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
      ]),
  ],
  [
    "12 owned temp rejects preexistence and drift",
    () => {
      const { dependencies } = memoryDependencies({
        createOwnedTempExclusive: () => {
          throw new Error("EEXIST");
        },
      });
      assert.equal(
        executeReviewedLocalTransactionWithDependencies(request(), dependencies).state,
        "REVIEWED_LOCAL_MARKER_INCOMPLETE_HOLD",
      );
    },
  ],
  [
    "13 common-dir transaction path is fixed",
    () => assert.equal(TRANSACTION_SUBDIRECTORY, "fluyo-r4b/python-reviewed-local-v2"),
  ],
  [
    "14 preexisting transaction is consumed",
    () => {
      const { dependencies } = memoryDependencies({
        createTransactionDirectoryExclusive: () => {
          throw new Error("REVIEWED_LOCAL_ATTEMPT_ALREADY_CONSUMED_HOLD");
        },
      });
      assert.throws(
        () => executeReviewedLocalTransactionWithDependencies(request(), dependencies),
        /ATTEMPT_ALREADY_CONSUMED/u,
      );
    },
  ],
  [
    "15 partial marker permanently consumes",
    () => {
      const { dependencies } = memoryDependencies({
        writeEvidence: () => {
          throw new Error("partial");
        },
      });
      assert.throws(
        () => executeReviewedLocalTransactionWithDependencies(request(), dependencies),
        /TEST_PYTHON_DIAGNOSTIC_INTERNAL_FAILURE/u,
      );
    },
  ],
  [
    "16 marker is durable before child",
    () => {
      const { dependencies, trace } = memoryDependencies();
      executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.ok(
        trace.indexOf("fsync-dir") < trace.indexOf("signature") || trace.includes("fsync-dir"),
      );
    },
  ],
  [
    "17 one job child and no descendants",
    () => assert.equal(validateNativeResult(nativeResult()).processOwnerCount, 1),
  ],
  [
    "18 network observation is closed",
    () => assert.equal(NETWORK_OBSERVATION_SCHEMA, "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1"),
  ],
  [
    "19 global snapshot is closed",
    () =>
      assert.deepEqual(
        Object.keys(validateGlobalSnapshot(globalSnapshot())),
        reviewedLocalTransactionTesting.GLOBAL_KEYS,
      ),
  ],
  [
    "20 success and failure settlement states",
    () => {
      assert.equal(settlementRecord(settlement(), settlementContext()).state, "SETTLED_FAILURE");
      assert.equal(
        settlementRecord(successSettlement(), settlementContext()).state,
        "SETTLED_SUCCESS",
      );
    },
  ],
  [
    "21 unknown and cleanup hold are truthful",
    () =>
      assert.equal(
        outerReceipt(
          receipt({
            state: "REVIEWED_LOCAL_FAILED_CLEANUP_HOLD",
            cleanupState: "HOLD",
            residueState: "PRESERVED_OR_UNKNOWN_HOLD",
            ownedTempEntryCount: 1,
            evidenceFileCount: 2,
            validEvidenceFileCount: 2,
          }),
          receiptContext({
            settlementState: "SETTLED_UNKNOWN_HOLD",
            evidenceFileCount: 2,
            validEvidenceFileCount: 2,
          }),
        ).cleanupState,
        "HOLD",
      ),
  ],
  [
    "22 combined stream cap and hashes",
    () =>
      throws(
        () => validateNativeResult(nativeResult({ stdoutBytes: Buffer.alloc(4_097) })),
        "PROCESS",
      ),
  ],
  [
    "23 cleanup follows settlement",
    () => {
      const { dependencies, files } = memoryDependencies();
      executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.deepEqual([...files.keys()], EVIDENCE_FILES);
    },
  ],
  [
    "24 cleanup preserves unsafe entries",
    () => {
      const { dependencies } = memoryDependencies({
        cleanupOwnedTemp: () => "HOLD",
        inspectOwnedTemp: () => 1,
      });
      assert.equal(
        executeReviewedLocalTransactionWithDependencies(request(), dependencies).state,
        "REVIEWED_LOCAL_FAILED_CLEANUP_HOLD",
      );
    },
  ],
  [
    "25 final receipt states and counts",
    () => {
      const value = outerReceipt(receipt(), receiptContext());
      assert.ok(FINAL_STATES.includes(value.state));
      assert.equal(value.validEvidenceFileCount, 3);
    },
  ],
  [
    "26 receipt is immutable",
    () => assert.equal(Object.isFrozen(outerReceipt(receipt(), receiptContext())), true),
  ],
  [
    "27 crash boundaries never retry",
    () => {
      const { dependencies } = memoryDependencies();
      let calls = 0;
      dependencies.nativeLease.Execute = () => {
        calls += 1;
        throw new Error("crash");
      };
      const result = executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.equal(result.state, "REVIEWED_LOCAL_RESULT_UNKNOWN_HOLD");
      assert.equal(calls, 1);
    },
  ],
  [
    "28 root packet and evidence are retained",
    () => {
      const { dependencies, files } = memoryDependencies();
      executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.equal(files.size, 3);
    },
  ],
  [
    "29 static forbidden actions",
    () => {
      const source = readFileSync(
        new URL("./reviewed-local-python-transaction.mjs", import.meta.url),
        "utf8",
      );
      assert.doesNotMatch(source, /fetch\(|https?:\/\/|execSync\(|spawnSync\(/u);
    },
  ],
  [
    "30 privacy scan is closed",
    () =>
      assert.doesNotMatch(
        JSON.stringify(outerReceipt(receipt(), receiptContext())),
        /[A-Za-z]:\\|signerSubject|stdoutBytes/u,
      ),
  ],
  [
    "31 packet order canonical public digest",
    () => {
      const p = packet();
      assert.deepEqual(
        Object.keys(parsePrivatePacket(JSON.stringify(p))),
        reviewedLocalTransactionTesting.PACKET_KEYS,
      );
      const reordered = {
        mode: p.mode,
        schema: p.schema,
        ...Object.fromEntries(Object.entries(p).slice(2)),
      };
      throws(() => parsePrivatePacket(JSON.stringify(reordered)), "PACKET");
    },
  ],
  [
    "32 safe counts bytes",
    () => {
      const rows = rootRows();
      rows[1].byteCount = Number.MAX_SAFE_INTEGER;
      throws(() => canonicalRootManifest(rows), "ROOT_MANIFEST");
    },
  ],
  [
    "33 valid signature evidenceSha",
    () =>
      assert.match(
        parsePrivatePacket(rawPacket()).signatureEvidence.evidenceSha256,
        /^[0-9a-f]{64}$/u,
      ),
  ],
  [
    "34 reject wrong method status type trust offline revocation",
    () => {
      for (const [key, value] of [
        ["method", "OTHER"],
        ["status", "UNKNOWN"],
        ["signatureType", "CATALOG"],
        ["chainStatus", "UNKNOWN"],
        ["revocationStatus", "UNKNOWN"],
      ]) {
        const p = packet();
        p.signatureEvidence[key] = value;
        throws(() => parsePrivatePacket(JSON.stringify(p)), "SIGNATURE");
      }
    },
  ],
  [
    "35 subject thumbprint UTC observed SHA negatives",
    () => {
      for (const [key, value] of [
        ["signerSubject", ""],
        ["signerThumbprint", "a".repeat(40)],
        ["verificationUtc", "not-time"],
        ["observedSha256", B],
      ]) {
        const p = packet();
        p.signatureEvidence[key] = value;
        throws(() => parsePrivatePacket(JSON.stringify(p)), "SIGNATURE");
      }
    },
  ],
  [
    "36 complete D F manifest positive",
    () => {
      const manifest = canonicalRootManifest(rootRows());
      assert.equal(manifest.schema, ROOT_MANIFEST_SCHEMA);
      assert.deepEqual(
        manifest.rows.map(({ kind }) => kind),
        ["D", "F", "F", "F"],
      );
    },
  ],
  [
    "37 added missing mutated count byte digest mismatch",
    () => {
      const expected = canonicalRootManifest(rootRows());
      for (const rows of [rootRows().slice(1), [...rootRows(), row("F", "extra.pyd", "extra")]])
        throws(
          () =>
            canonicalRootManifest(rows, {
              sha256: expected.sha256,
              fileCount: expected.fileCount,
              directoryCount: expected.directoryCount,
              byteCount: expected.byteCount,
            }),
          "ROOT_MANIFEST",
        );
    },
  ],
  [
    "38 every-depth reparse junction mount ADS escape casefold NFC hardlink identity duplicate",
    () => {
      const mutations = [
        ["reparse", true],
        ["junction", true],
        ["mount", true],
        ["hardLinkCount", 2],
        ["path", "DLLs:bad/file"],
      ];
      for (const [key, value] of mutations) {
        const rows = rootRows();
        rows[1][key] = value;
        throws(() => canonicalRootManifest(rows), "ROOT_MANIFEST");
      }
    },
  ],
  [
    "39 root drift preconsume prespawn postchild prereceipt",
    () => {
      const { dependencies } = memoryDependencies();
      let count = 0;
      dependencies.walkRoot = () => {
        const rows = rootRows();
        if (++count === 2) rows[1].sha256 = C;
        return rows;
      };
      assert.equal(
        executeReviewedLocalTransactionWithDependencies(request(), dependencies).state,
        "REVIEWED_LOCAL_MARKER_INCOMPLETE_HOLD",
      );
    },
  ],
  [
    "40 executable signature root correlation",
    () => {
      const p = packet();
      p.expectedExecutableSha256 = B;
      throws(() => parsePrivatePacket(JSON.stringify(p)), "SIGNATURE");
    },
  ],
  [
    "41 exact empty owned cwd TEMP TMP no PATH private",
    () => {
      const value = validateNativeRequest(nativeRequest());
      assert.equal(value.combinedCapBytes, 4_096);
      assert.equal(Object.hasOwn(value, "environment"), false);
    },
  ],
  [
    "42 temp escape preexist nonempty drift",
    () =>
      throws(() => validateNativeRequest({ ...nativeRequest(), ownedPath: "relative" }), "PROCESS"),
  ],
  [
    "43 common-dir tx path race",
    () => {
      const { dependencies } = memoryDependencies();
      let count = 0;
      dependencies.createTransactionDirectoryExclusive = () => {
        count += 1;
        return {};
      };
      executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.equal(count, 1);
    },
  ],
  [
    "44 preexisting empty partial complete consumes no spawn",
    () => {
      for (const state of ["empty", "partial", "complete"]) {
        let spawned = 0;
        const { dependencies } = memoryDependencies({
          createTransactionDirectoryExclusive: () => {
            throw new Error(state);
          },
        });
        dependencies.nativeLease.Execute = () => {
          spawned += 1;
        };
        assert.throws(() =>
          executeReviewedLocalTransactionWithDependencies(request(), dependencies),
        );
        assert.equal(spawned, 0);
      }
    },
  ],
  [
    "45 crash after mkdir partial marker consumes no spawn",
    () => {
      let spawned = 0;
      const { dependencies } = memoryDependencies({
        openEvidenceExclusive: () => {
          throw new Error("partial");
        },
      });
      dependencies.nativeLease.Execute = () => {
        spawned += 1;
      };
      assert.throws(() => executeReviewedLocalTransactionWithDependencies(request(), dependencies));
      assert.equal(spawned, 0);
    },
  ],
  [
    "46 marker wx fsync reopen marker before child",
    () => {
      assert.deepEqual(
        Object.keys(consumptionMarker(marker())),
        reviewedLocalTransactionTesting.MARKER_KEYS,
      );
      const { dependencies, trace } = memoryDependencies();
      dependencies.nativeLease.Execute = () => {
        assert.ok(trace.includes("fsync-file") && trace.includes("fsync-dir"));
        return nativeResult();
      };
      executeReviewedLocalTransactionWithDependencies(request(), dependencies);
    },
  ],
  [
    "47 one job child image identity rejects descendant second PID image drift",
    () => {
      for (const change of [
        { processOwnerCount: 0 },
        { processOwnerCount: 2 },
        { loadedImageBoundaryValid: false },
        { processResidualCount: 1 },
      ])
        throws(() => validateNativeResult(nativeResult(change)), "PROCESS");
    },
  ],
  [
    "48 network positive unavailable incomplete event gap negative",
    () => {
      for (const result of [
        { complete: false, observationCount: 1, maximumGapMicros: 1, eventCount: 0 },
        { complete: true, observationCount: 0, maximumGapMicros: 1, eventCount: 0 },
        { complete: true, observationCount: 1, maximumGapMicros: 10_001, eventCount: 0 },
        { complete: true, observationCount: 1, maximumGapMicros: 1, eventCount: 1 },
      ]) {
        const { dependencies } = memoryDependencies({ stopNetworkObserver: () => result });
        assert.equal(
          executeReviewedLocalTransactionWithDependencies(request(), dependencies).state,
          "REVIEWED_LOCAL_RESULT_UNKNOWN_HOLD",
        );
      }
    },
  ],
  [
    "49 global positive each component incomplete aggregate drift",
    () => {
      validateGlobalSnapshot(globalSnapshot());
      const incomplete = globalSnapshot();
      incomplete.complete = false;
      const component = globalSnapshot();
      component.pathEnvironmentSha256 = B;
      const aggregate = globalSnapshot();
      aggregate.aggregateSha256 = B;
      for (const value of [incomplete, component, aggregate])
        throws(() => validateGlobalSnapshot(value), "GLOBAL");
    },
  ],
  [
    "50 success failed-clean settlement",
    () => {
      assert.equal(
        settlementRecord(successSettlement(), settlementContext()).state,
        "SETTLED_SUCCESS",
      );
      assert.equal(settlementRecord(settlement(), settlementContext()).state, "SETTLED_FAILURE");
    },
  ],
  [
    "51 unknown cleanup-HOLD nullability raw extra order privacy",
    () => {
      const value = settlement({
        state: "SETTLED_UNKNOWN_HOLD",
        stage: "NATIVE_LEASE_UNAVAILABLE",
        failureCode: OUTER_FAILURES.NATIVE_LEASE_UNAVAILABLE,
        childSpawnAttempted: false,
        childStarted: false,
        exitObserved: false,
        exitCode: null,
        signalClass: null,
        processOwnerCount: 0,
      });
      assert.equal(settlementRecord(value, settlementContext()).exitCode, null);
      throws(() => settlementRecord({ ...value, extra: true }, settlementContext()), "SETTLEMENT");
    },
  ],
  [
    "52 combined caps hashes raw discard",
    () => {
      const result = nativeResult({
        stdoutBytes: Buffer.alloc(2_048),
        stderrBytes: Buffer.alloc(2_048),
      });
      assert.equal(
        validateNativeResult(result).stdoutBytes.length + result.stderrBytes.length,
        4_096,
      );
      throws(
        () => validateNativeResult(nativeResult({ stderrBytes: Buffer.alloc(4_097) })),
        "PROCESS",
      );
    },
  ],
  [
    "53 result-first cleanup positive",
    () => {
      const { dependencies, files } = memoryDependencies();
      dependencies.cleanupOwnedTemp = () => {
        assert.ok(files.has("settlement-v1.json"));
        return "CLEAN";
      };
      executeReviewedLocalTransactionWithDependencies(request(), dependencies);
    },
  ],
  [
    "54 preserve cleanup reparse hardlink identity containment drift",
    () => {
      const { dependencies } = memoryDependencies({
        cleanupOwnedTemp: () => "HOLD",
        inspectOwnedTemp: () => 4,
      });
      const value = executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.equal(value.cleanupState, "HOLD");
      assert.equal(value.ownedTempEntryCount, 4);
    },
  ],
  [
    "55 receipt states counts retention",
    () => {
      const value = outerReceipt(receipt(), receiptContext());
      assert.equal(value.evidenceFileCount, 3);
      assert.equal(value.evidenceRetention, "PERMANENT_LOCAL_NON_PRODUCT_EVIDENCE_DO_NOT_DELETE");
    },
  ],
  [
    "56 receipt write fsync reopen preexist truth",
    () => {
      const { dependencies, files, trace } = memoryDependencies();
      executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.equal(files.size, 3);
      assert.equal(trace.filter((value) => value === "fsync-file").length, 3);
    },
  ],
  [
    "57 crash every boundary no retry delete repair reuse",
    () => {
      for (const method of [
        "verifyRepository",
        "walkRoot",
        "openEvidenceExclusive",
        "createOwnedTempExclusive",
        "captureGlobalSnapshot",
        "startNetworkObserver",
      ]) {
        let calls = 0;
        const { dependencies } = memoryDependencies({
          [method]: () => {
            calls += 1;
            throw new Error("crash");
          },
        });
        try {
          executeReviewedLocalTransactionWithDependencies(request(), dependencies);
        } catch (error) {
          assert.ok(error instanceof Error);
        }
        assert.ok(calls >= 1 && calls <= (method === "walkRoot" ? 4 : 2));
      }
    },
  ],
  [
    "58 root packet evidence unchanged never deleted",
    () => {
      const initial = rawPacket();
      const { dependencies } = memoryDependencies();
      executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.equal(rawPacket(), initial);
      assert.equal(Object.hasOwn(dependencies, "deleteRoot"), false);
    },
  ],
  [
    "59 forbidden actions",
    () => {
      const source = readFileSync(
        new URL("./reviewed-local-python-transaction.mjs", import.meta.url),
        "utf8",
      );
      for (const token of [
        "fetch(",
        "http://",
        "https://",
        "npm install",
        "nuget.exe",
        "Attempt004",
        "E01-E08",
      ])
        assert.equal(source.includes(token), false);
    },
  ],
  [
    "60 privacy scan evidence errors",
    () => {
      const { dependencies, files } = memoryDependencies();
      executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      for (const bytes of files.values())
        assert.doesNotMatch(
          bytes.toString("utf8"),
          /[A-Za-z]:\\|signerSubject|stdoutBytes|rootPath/u,
        );
    },
  ],
  [
    "61 packet cap root and signer bounds",
    () => {
      const oversized = rawPacket() + " ".repeat(8_193);
      throws(() => parsePrivatePacket(oversized), "PACKET");
      for (const root of ["relative", "C:\\", "\\\\server\\share", "C:\\bad\\..\\root"]) {
        const value = packet();
        value.root = root;
        throws(() => parsePrivatePacket(JSON.stringify(value)), "PACKET");
      }
      const value = packet();
      value.signatureEvidence.signerSubject = "x".repeat(513);
      throws(() => parsePrivatePacket(JSON.stringify(value)), "SIGNATURE");
    },
  ],
  [
    "62 exact bootstrap digest output and version",
    () => {
      assert.equal(Buffer.byteLength(REVIEWED_LOCAL_BOOTSTRAP_V2), 678);
      assert.equal(hash(REVIEWED_LOCAL_BOOTSTRAP_V2), REVIEWED_LOCAL_BOOTSTRAP_V2_SHA256);
      const output = validateIntrospectionOutput(nativeResult(), nativeRequest(), packet());
      assert.equal(output.stdoutSha256, hash(nativeResult().stdoutBytes));
      const wrong = nativeResult({
        stdoutBytes: Buffer.from(
          `${JSON.stringify({ executable: "C:\\Python312\\python.exe", sha256: A, version: [3, 12, 6] })}\r\n`,
        ),
      });
      throws(() => validateIntrospectionOutput(wrong, nativeRequest(), packet()), "PROCESS");
    },
  ],
  [
    "63 trusted temp and owned temp are held and revalidated",
    () => {
      const { dependencies, trace } = memoryDependencies();
      executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.ok(trace.filter((item) => item === "trusted-temp").length >= 2);
      assert.ok(trace.filter((item) => item === "owned-temp").length >= 3);
    },
  ],
  [
    "64 injected module evidence classifies held root and System32 images",
    () => {
      const accepted = validateLoadedImageEvidenceForTesting(loadedImageInput());
      assert.deepEqual(accepted, {
        loadedImageCount: 3,
        rootManifestImageCount: 2,
        system32ImageCount: 1,
        loadedImageEvidenceSha256: accepted.loadedImageEvidenceSha256,
      });
      for (const mutation of [
        { initialIdentity: "7".repeat(32), finalIdentity: "7".repeat(32) },
        { initialSha256: B, finalSha256: B },
        { initialByteCount: 9, finalByteCount: 9 },
        { initialVolumeIdentity: "8".repeat(16), finalVolumeIdentity: "8".repeat(16) },
        { reparse: true },
        { mount: true },
        { finalIdentity: "drift" },
      ]) {
        const input = loadedImageInput();
        input.observations[0] = loadedObservation(mutation);
        throws(() => validateLoadedImageEvidenceForTesting(input), "PROCESS");
      }
      for (const mutation of [
        {
          initialPath: "C:\\Windows\\System32Sibling\\kernel32.dll",
          finalPath: "C:\\Windows\\System32Sibling\\kernel32.dll",
        },
        { system32RootIdentity: "9".repeat(32) },
      ]) {
        const input = loadedImageInput();
        input.observations[2] = { ...input.observations[2], ...mutation };
        throws(() => validateLoadedImageEvidenceForTesting(input), "PROCESS");
      }
      const duplicate = loadedImageInput();
      duplicate.observations[1] = {
        ...duplicate.observations[1],
        initialIdentity: PYTHON_ID,
        finalIdentity: PYTHON_ID,
      };
      throws(() => validateLoadedImageEvidenceForTesting(duplicate), "PROCESS");
      const unlisted = loadedImageInput();
      unlisted.observations[0] = {
        ...unlisted.observations[0],
        relativeRootPath: "unlisted.pyd",
      };
      throws(() => validateLoadedImageEvidenceForTesting(unlisted), "PROCESS");
      throws(() => validateNativeResult(nativeResult({ loadedImageCount: 4 })), "PROCESS");
      throws(
        () => validateNativeResult(nativeResult({ loadedImageEvidenceSha256: "bad" })),
        "PROCESS",
      );
      assert.notEqual(accepted.loadedImageEvidenceSha256, B);
    },
  ],
  [
    "65 preconditions and owned temp precede durable marker",
    () => {
      const order = [];
      const { dependencies } = memoryDependencies({
        createTransactionDirectoryExclusive: () => (order.push("transaction"), { identity: B }),
        createOwnedTempExclusive: () => (order.push("owned"), { identity: C }),
        captureGlobalSnapshot: () => (order.push("global"), globalSnapshot()),
        startNetworkObserver: () => (order.push("network"), { identity: "network" }),
        openEvidenceExclusive: (_directory, name) => {
          order.push(name);
          return name;
        },
      });
      const files = new Map();
      dependencies.writeEvidence = (name, bytes) => files.set(name, Buffer.from(bytes));
      dependencies.readEvidence = (name) => Buffer.from(files.get(name));
      dependencies.inventoryEvidenceDirectory = () => ({
        entries: EVIDENCE_FILES.map((name) => ({
          name,
          present: files.has(name),
          regular: files.has(name),
          reparse: false,
          identityStable: true,
          bytes: files.has(name) ? Buffer.from(files.get(name)) : null,
        })),
        extraEntryCount: 0,
      });
      executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.ok(order.indexOf("owned") < order.indexOf(EVIDENCE_FILES[0]));
      assert.ok(order.indexOf("global") < order.indexOf(EVIDENCE_FILES[0]));
      assert.ok(order.indexOf("network") < order.indexOf(EVIDENCE_FILES[0]));
    },
  ],
  [
    "66 every post-consumption failure settles or preserves HOLD",
    () => {
      const { dependencies } = memoryDependencies();
      dependencies.nativeLease.Execute = () => {
        throw new Error("private raw cause");
      };
      const value = executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.equal(value.state, "REVIEWED_LOCAL_RESULT_UNKNOWN_HOLD");
      assert.doesNotMatch(JSON.stringify(value), /private raw cause/u);
    },
  ],
  [
    "67 settlement enforces exact streams and every state correlation",
    () => {
      assert.equal(
        settlementRecord(successSettlement(), settlementContext()).state,
        "SETTLED_SUCCESS",
      );
      for (const mutation of [
        { stdoutByteCount: settlementContext().expectedSuccessStdoutByteCount + 1 },
        { stdoutSha256: B },
        { stderrByteCount: 1 },
        { stderrSha256: B },
      ])
        throws(
          () => settlementRecord(successSettlement(mutation), settlementContext()),
          "SETTLEMENT",
        );
      throws(
        () =>
          settlementRecord(
            settlement({ state: "SETTLED_SUCCESS", stage: "PROCESS_INVALID" }),
            settlementContext(),
          ),
        "SETTLEMENT",
      );
      throws(
        () =>
          settlementRecord(
            settlement({ childStarted: false, processOwnerCount: 1 }),
            settlementContext(),
          ),
        "SETTLEMENT",
      );
      throws(
        () =>
          settlementRecord(
            settlement({ state: "SETTLED_UNKNOWN_HOLD", stage: "SUCCESS", failureCode: null }),
            settlementContext(),
          ),
        "SETTLEMENT",
      );
      throws(
        () =>
          settlementRecord(
            settlement({ state: "SETTLED_FAILURE", stage: "SUCCESS", failureCode: null }),
            settlementContext(),
          ),
        "SETTLEMENT",
      );
      throws(
        () => settlementRecord(successSettlement(), { ...settlementContext(), emptySha256: B }),
        "SETTLEMENT",
      );
    },
  ],
  [
    "68 receipt closure and marker-incomplete actual counts",
    () => {
      const value = outerReceipt(
        receipt({
          state: "REVIEWED_LOCAL_MARKER_INCOMPLETE_HOLD",
          consumptionMarkerSha256: null,
          settlementSha256: null,
          cleanupState: "HOLD",
          residueState: "PRESERVED_OR_UNKNOWN_HOLD",
          rootFinalRevalidated: false,
          evidenceFileCount: 1,
          validEvidenceFileCount: 1,
        }),
        receiptContext({
          markerState: "ABSENT",
          settlementState: "ABSENT",
          evidenceFileCount: 1,
          validEvidenceFileCount: 1,
        }),
      );
      assert.equal(value.state, "REVIEWED_LOCAL_MARKER_INCOMPLETE_HOLD");
      throws(
        () => outerReceipt(receipt({ state: "REVIEWED_LOCAL_SUCCESS_CLEAN" }), receiptContext()),
        "RECEIPT",
      );
    },
  ],
  [
    "69 source-only lease and false live authority remain held",
    () => {
      const source = readFileSync(
        new URL("./reviewed-local-python-transaction.mjs", import.meta.url),
        "utf8",
      );
      assert.match(source, /NATIVE_LEASE_UNAVAILABLE/u);
      assert.match(source, /--execute-once-v2/u);
      assert.doesNotMatch(source, /externalActionAuthorized\s*:\s*true/u);
    },
  ],
  [
    "70 native lease embeds and enforces exact bootstrap bytes and digest",
    () => {
      const source = readFileSync(
        new URL("./reviewed-local-python-native-lease-v2.cs", import.meta.url),
        "utf8",
      );
      const start = source.indexOf("private const string BootstrapV2 =");
      const end = source.indexOf("private const string BootstrapV2Sha256", start);
      assert.ok(start >= 0 && end > start);
      const decoded = [...source.slice(start, end).matchAll(/"((?:\\.|[^"\\])*)"/gu)]
        .map((match) => JSON.parse(`"${match[1]}"`))
        .join("");
      assert.equal(decoded, REVIEWED_LOCAL_BOOTSTRAP_V2);
      assert.equal(Buffer.byteLength(decoded), 678);
      assert.equal(hash(decoded), REVIEWED_LOCAL_BOOTSTRAP_V2_SHA256);
      assert.match(source, /7c32a2cdf883ba5ea149f24bf59e53310dc2c393cb05d475c79a9e579774585f/u);
      assert.match(source, /Encoding\.UTF8\.GetByteCount\(BootstrapV2\) != 678/u);
      for (const forbidden of [
        "ctypes",
        "importlib",
        "subprocess",
        "socket",
        "dlopen",
        "unload",
        "eval(",
        "exec(",
      ])
        assert.equal(decoded.includes(forbidden), false);
    },
  ],
  [
    "71 authoritative Windows System32 and temp roots reject caller authority",
    () => {
      const source = readFileSync(
        new URL("./reviewed-local-python-native-lease-v2.cs", import.meta.url),
        "utf8",
      );
      for (const token of [
        "GetWindowsDirectoryW",
        "GetSystemDirectoryW",
        "OpenAuthoritativeWindowsRoot",
        "OpenAuthoritativeSystem32Root",
        "OpenAuthoritativeTrustedTempRoot",
      ])
        assert.match(source, new RegExp(token, "u"));
      assert.doesNotMatch(source, /Path\.GetTempPath/u);
    },
  ],
  [
    "72 owned temp is handle-contained beneath trusted temp",
    () => {
      const source = readFileSync(
        new URL("./reviewed-local-python-native-lease-v2.cs", import.meta.url),
        "utf8",
      );
      assert.match(
        source,
        /OpenEmptyOwnedDirectory\(request\.ownedPath, trustedTemp, request\.transactionId\)/u,
      );
      assert.match(source, /python-reviewed-local-v2/u);
      assert.match(source, /RevalidateContainedBy/u);
    },
  ],
  [
    "73 unknown post-spawn facts remain null",
    () => {
      const { dependencies } = memoryDependencies();
      dependencies.nativeLease.Execute = () => {
        throw new Error("opaque");
      };
      const value = executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.equal(value.state, "REVIEWED_LOCAL_RESULT_UNKNOWN_HOLD");
      assert.equal(value.processResidualCount, null);
      assert.equal(value.globalMutationCount, null);
      assert.equal(value.rootFinalRevalidated, null);
      assert.equal(JSON.stringify(value).includes("??"), false);
    },
  ],
  [
    "74 evidence counts derive only from held-directory inventory",
    () => {
      const { dependencies, files } = memoryDependencies();
      const value = executeReviewedLocalTransactionWithDependencies(request(), dependencies);
      assert.equal(value.evidenceFileCount, 3);
      assert.equal(value.validEvidenceFileCount, 3);
      assert.deepEqual([...files.keys()], EVIDENCE_FILES);
      const invalid = memoryDependencies({
        inventoryEvidenceDirectory: () => ({ entries: [], extraEntryCount: 1 }),
      });
      throws(
        () => executeReviewedLocalTransactionWithDependencies(request(), invalid.dependencies),
        "EVIDENCE_INVENTORY_INVALID",
      );
    },
  ],
  [
    "75 receipt-open transient preserves partial evidence and fixed HOLD",
    () => {
      const { dependencies, files } = memoryDependencies();
      let receiptOpens = 0;
      const open = dependencies.openEvidenceExclusive;
      dependencies.openEvidenceExclusive = (directory, name) => {
        if (name === EVIDENCE_FILES[2]) receiptOpens += 1;
        return open(directory, name);
      };
      const write = dependencies.writeEvidence;
      dependencies.writeEvidence = (name, bytes) => {
        if (name === EVIDENCE_FILES[2]) {
          files.set(name, Buffer.from('{"partial":'));
          throw new Error("private write error");
        }
        write(name, bytes);
      };
      throws(
        () => executeReviewedLocalTransactionWithDependencies(request(), dependencies),
        "TEST_PYTHON_DIAGNOSTIC_INTERNAL_FAILURE",
      );
      assert.equal(receiptOpens, 1);
      assert.equal(files.has(EVIDENCE_FILES[2]), true);
      assert.equal(files.get(EVIDENCE_FILES[2]).toString(), '{"partial":');
    },
  ],
  [
    "76 complete READY LOADED trace binds bootstrap and no post-GO observation",
    () => {
      const trace = [
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
      assert.deepEqual(validateNativeTerminalTraceForTesting(trace), trace);
      const source = readFileSync(
        new URL("./reviewed-local-python-native-lease-v2.cs", import.meta.url),
        "utf8",
      );
      for (const token of [
        "BootstrapV2Sha256",
        "IntPtr.Size * 5",
        'Encoding.ASCII.GetBytes("READY_V1\\n")',
        'Encoding.ASCII.GetBytes("LOADED_V1\\n")',
        "WriteControl(control, (byte)'L')",
        "WriteControl(control, (byte)'G')",
      ])
        assert.ok(source.includes(token), token);
      const go = source.indexOf("// SEND_GO");
      const revalidate = source.indexOf("loaded.RevalidateAll();", go);
      assert.ok(go >= 0 && revalidate > go);
      assert.equal(source.slice(go, revalidate).includes("loaded.Observe"), false);
      assert.equal(source.slice(go, revalidate).includes("Process.GetProcessById"), false);
    },
  ],
  [
    "77 missing duplicate and reordered barrier traces fail closed",
    () => {
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
      assert.deepEqual(validateNativeTerminalTraceForTesting(accepted), accepted);
      for (const rejected of [
        accepted.filter((token) => token !== "READY_RECEIVED"),
        [...accepted.slice(0, 3), "READY_RECEIVED", ...accepted.slice(3)],
        [...accepted.slice(0, 3), "SEND_LOAD", ...accepted.slice(4)],
        [...accepted.slice(0, 5), "SEND_GO", ...accepted.slice(6)],
        [...accepted.slice(0, 8), "OBSERVE_LOADED", ...accepted.slice(8)],
        ["OBSERVE_SUSPENDED", "RESUME", "WAIT_SIGNALED"],
        [...accepted.slice(0, 8), "TERMINATE_JOB", "TERMINATE_JOB", ...accepted.slice(8)],
      ])
        throws(() => validateNativeTerminalTraceForTesting(rejected), "PROCESS");
    },
  ],
  [
    "78 shared budget exact4096 accepts with two joins and closes",
    () => {
      for (const rawEvents of [
        [{ stream: "STDOUT", byteCount: 4_096 }],
        [
          { stream: "STDOUT", byteCount: 2_048 },
          { stream: "STDERR", byteCount: 2_048 },
        ],
      ]) {
        const events = Object.freeze(rawEvents.map((event) => Object.freeze(event)));
        assert.deepEqual(
          validateCombinedCaptureTraceForTesting(Object.freeze({ cap: 4_096, events })),
          {
            acceptedByteCount: 4_096,
            overflowed: false,
            terminateCount: 0,
            joinCount: 2,
            closeCount: 2,
          },
        );
      }
      const event = Object.freeze({ stream: "STDOUT", byteCount: 1 });
      const events = Object.freeze([event]);
      const symbolOuter = { cap: 4_096, events };
      symbolOuter[Symbol("extra")] = true;
      Object.freeze(symbolOuter);
      const symbolEvent = { stream: "STDOUT", byteCount: 1 };
      symbolEvent[Symbol("extra")] = true;
      Object.freeze(symbolEvent);
      const accessorEvent = { stream: "STDOUT" };
      Object.defineProperty(accessorEvent, "byteCount", { enumerable: true, get: () => 1 });
      Object.freeze(accessorEvent);
      for (const rejected of [
        { cap: 4_096, events },
        Object.freeze({ cap: 4_096, events: [event] }),
        Object.freeze({ cap: 4_096, events: Object.freeze([{ stream: "STDOUT", byteCount: 1 }]) }),
        Object.freeze({ cap: 4_096, events, extra: true }),
        symbolOuter,
        Object.freeze({ cap: 4_096, events: Object.freeze([symbolEvent]) }),
        Object.freeze({ cap: 4_096, events: Object.freeze([accessorEvent]) }),
        new Proxy(Object.freeze({ cap: 4_096, events }), {}),
        Object.freeze({ cap: 4_096, events: new Proxy(events, {}) }),
        Object.freeze({ cap: 4_096, events: Object.freeze([new Proxy(event, {})]) }),
      ])
        throws(() => validateCombinedCaptureTraceForTesting(rejected), "PROCESS");
      const source = readFileSync(
        new URL("./reviewed-local-python-native-lease-v2.cs", import.meta.url),
        "utf8",
      );
      assert.match(
        source,
        /SharedCaptureBudget budget = new SharedCaptureBudget\([\s\S]*coordinator\.RequestTermination\)/u,
      );
      assert.match(
        source,
        /budget\.AcceptedByteCount != checked\(stdout\.Count \+ stderr\.Count\)/u,
      );
    },
  ],
  [
    "79 split4097 and concurrent reservations overflow exactly once",
    () => {
      const writers = Object.freeze([
        Object.freeze({ stream: "STDOUT", byteCount: 2_048 }),
        Object.freeze({ stream: "STDERR", byteCount: 2_049 }),
      ]);
      for (const rawOrder of [
        ["STDOUT", "STDERR"],
        ["STDERR", "STDOUT"],
      ]) {
        const value = validateTwoWriterCaptureInterleavingForTesting(
          Object.freeze({
            cap: 4_096,
            barrierParticipantCount: 2,
            writers,
            releaseOrder: Object.freeze(rawOrder),
          }),
        );
        assert.equal(value.overflowed, true);
        assert.ok(value.acceptedByteCount <= 4_096);
        assert.equal(value.terminateCount, 1);
        assert.equal(value.joinCount, 2);
        assert.equal(value.closeCount, 2);
        assert.equal(value.barrierParticipantCount, 2);
      }
      for (const malformed of [
        Object.freeze({
          cap: 4_096,
          barrierParticipantCount: 1,
          writers,
          releaseOrder: Object.freeze(["STDOUT", "STDERR"]),
        }),
        Object.freeze({
          cap: 4_096,
          barrierParticipantCount: 3,
          writers,
          releaseOrder: Object.freeze(["STDOUT", "STDERR"]),
        }),
        Object.freeze({
          cap: 4_096,
          barrierParticipantCount: 2,
          writers,
          releaseOrder: Object.freeze(["STDOUT", "STDOUT"]),
        }),
        {
          cap: 4_096,
          barrierParticipantCount: 2,
          writers,
          releaseOrder: Object.freeze(["STDOUT", "STDERR"]),
        },
      ])
        throws(() => validateTwoWriterCaptureInterleavingForTesting(malformed), "PROCESS");
      const accessor = { cap: 4_096, barrierParticipantCount: 2, writers };
      Object.defineProperty(accessor, "releaseOrder", {
        enumerable: true,
        get: () => Object.freeze(["STDOUT", "STDERR"]),
      });
      Object.freeze(accessor);
      throws(() => validateTwoWriterCaptureInterleavingForTesting(accessor), "PROCESS");
      const validOrder = Object.freeze(["STDOUT", "STDERR"]);
      const mutableWriter = { stream: "STDOUT", byteCount: 2_048 };
      const symbolWriter = { stream: "STDOUT", byteCount: 2_048 };
      symbolWriter[Symbol("extra")] = true;
      Object.freeze(symbolWriter);
      const extraOuter = Object.freeze({
        cap: 4_096,
        barrierParticipantCount: 2,
        writers,
        releaseOrder: validOrder,
        extra: true,
      });
      const symbolOuter = {
        cap: 4_096,
        barrierParticipantCount: 2,
        writers,
        releaseOrder: validOrder,
      };
      symbolOuter[Symbol("extra")] = true;
      Object.freeze(symbolOuter);
      for (const rejected of [
        Object.freeze({
          cap: 4_096,
          barrierParticipantCount: 2,
          writers: Object.freeze([mutableWriter, writers[1]]),
          releaseOrder: validOrder,
        }),
        Object.freeze({
          cap: 4_096,
          barrierParticipantCount: 2,
          writers: Object.freeze([symbolWriter, writers[1]]),
          releaseOrder: validOrder,
        }),
        Object.freeze({
          cap: 4_096,
          barrierParticipantCount: 2,
          writers,
          releaseOrder: ["STDOUT", "STDERR"],
        }),
        extraOuter,
        symbolOuter,
        new Proxy(
          Object.freeze({
            cap: 4_096,
            barrierParticipantCount: 2,
            writers,
            releaseOrder: validOrder,
          }),
          {},
        ),
        Object.freeze({
          cap: 4_096,
          barrierParticipantCount: 2,
          writers: new Proxy(writers, {}),
          releaseOrder: validOrder,
        }),
        Object.freeze({
          cap: 4_096,
          barrierParticipantCount: 2,
          writers: Object.freeze([new Proxy(writers[0], {}), writers[1]]),
          releaseOrder: validOrder,
        }),
      ])
        throws(() => validateTwoWriterCaptureInterleavingForTesting(rejected), "PROCESS");
      const source = readFileSync(
        new URL("./reviewed-local-python-native-lease-v2.cs", import.meta.url),
        "utf8",
      );
      assert.match(source, /lock \(sync\)/u);
      assert.match(source, /terminationSignaled/u);
      assert.match(source, /REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID/u);
    },
  ],
];

test("binds one reviewed local CPython packet without PATH authority", async (t) => {
  assert.equal(cases.length, 79);
  for (const [name, callback] of cases) await t.test(name, callback);
});
