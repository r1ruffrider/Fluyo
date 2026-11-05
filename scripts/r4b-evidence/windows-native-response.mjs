import { createHash } from "node:crypto";

const CORE_KEYS = [
  "magic",
  "version",
  "sessionNonce",
  "sequence",
  "operation",
  "requestSha256",
  "status",
];
const PRE_RESPONSE_ANCHOR_KEYS = ["journalBeforeResponseSha256", "journalBeforeResponseSequence"];
const COMMIT_KEYS = [
  "commitStatus",
  "acknowledgedResponseSha256",
  "journalAfterAckSha256",
  "journalAfterAckSequence",
];

const NVDA_STATE_FIELDS = [
  "nvdaToken",
  "controllerPid",
  "controllerCreationIdentity",
  "brokerPid",
  "brokerCreationIdentity",
  "nvdaPid",
  "nvdaCreationIdentity",
  "nvdaState",
  "exitCode",
  "pinnedHandleCount",
  "inheritedHandleCount",
  "controlTransport",
  "readyTransport",
  "transcriptExternalWriteShare",
  "diagnosticExternalWriteShare",
  "capabilities",
];
const NVDA_VARIANT_FIELDS = Object.freeze({
  CREATE: [...NVDA_STATE_FIELDS, "receiptNonce"],
  CONTROL: [...NVDA_STATE_FIELDS, "controlSha256"],
  READY: [...NVDA_STATE_FIELDS, "payloadBase64", "contentSha256", "bytes"],
  TRANSCRIPT: [...NVDA_STATE_FIELDS, "payloadBase64", "contentSha256", "bytes"],
  DIAGNOSTIC: [...NVDA_STATE_FIELDS, "payloadBase64", "contentSha256", "bytes"],
  STATUS: NVDA_STATE_FIELDS,
  TEST_INJECTED_CONSUMER: [
    "outcome",
    "controllerPid",
    "brokerPid",
    "consumerPid",
    "consumerSchema",
    "inheritedHandleCount",
    "externalWriteForgery",
  ],
});

const JOB_STATE_FIELDS = [
  "jobToken",
  "brokerPid",
  "builderPid",
  "jobState",
  "exitCode",
  "canonicalArgvSha256",
  "environmentSha256",
  "outputAuthoritySha256",
  "outputPathSha256",
  "outputAuthorityRootId",
  "retainedOutputParentIdentity",
  "infrastructurePlanDigest",
  "assignmentReceiptSha256",
  "distDir",
  "nodeIdentity",
  "nextIdentity",
  "powerShellIdentity",
  "clientIdentity",
  "cwdIdentity",
  "tempIdentity",
  "closedReceiptSha256",
  "closedReceiptBase64",
];
const OPERATION_FIELDS = Object.freeze({
  HELLO: [
    "boundary",
    "contractSha256",
    "brokerPid",
    "controllerJournalAnchorHandle",
    "powerShellIdentity",
    "powerShellVersion",
    "powerShellSignature",
    "journalSha256",
    "journalSequence",
    "lastRequestId",
    "lastJournalState",
    "controllerCreationIdentity",
    "journalState",
    "journalFailureReason",
    "outcome",
  ],
  READ_BOUNDED: ["contentSha256", "bytes", "volumeSerial", "fileId", "payloadBase64"],
  HASH_BOUNDED: ["contentSha256", "bytes", "volumeSerial", "fileId"],
  INVENTORY_TREE: [
    "inventoryDigest",
    "inventoryTokenBase64",
    "inventoryLeaseId",
    "files",
    "directories",
    "bytes",
  ],
  CREATE_DIRECTORY: ["volumeSerial", "fileId"],
  WRITE_NEW: ["contentSha256", "bytes", "volumeSerial", "fileId"],
  APPEND_DURABLE: ["contentSha256", "bytes", "volumeSerial", "fileId"],
  REPLACE_EXISTING_EXACT: ["contentSha256", "bytes", "volumeSerial", "fileId"],
  RENAME_EXCLUSIVE: ["volumeSerial", "fileId"],
  UNLINK_EXACT: ["volumeSerial", "fileId"],
  REMOVE_TREE_EXACT: ["inventoryDigest", "inventoryLeaseId", "outcome"],
  PIN_FILE: ["contentSha256", "bytes", "volumeSerial", "fileId"],
  UNPIN_FILE: ["inventoryLeaseId", "outcome"],
  JOB_CREATE_SUSPENDED: [
    "jobToken",
    "brokerPid",
    "builderPid",
    "canonicalArgvSha256",
    "environmentSha256",
    "outputAuthoritySha256",
    "outputPathSha256",
    "outputAuthorityRootId",
    "retainedOutputParentIdentity",
    "infrastructurePlanDigest",
    "distDir",
    "nodeIdentity",
    "nextIdentity",
    "powerShellIdentity",
    "clientIdentity",
    "cwdIdentity",
    "tempIdentity",
    "limitFlags",
    "jobState",
    "assignmentReceiptSha256",
    "assignmentReceiptBase64",
  ],
  JOB_RESUME: JOB_STATE_FIELDS,
  JOB_STATUS: JOB_STATE_FIELDS,
  JOB_TERMINATE: JOB_STATE_FIELDS,
  NVDA_START_WITH_HANDLES: null,
  NVDA_STOP: NVDA_STATE_FIELDS,
  TEST_SYNCHRONIZED_SWAP: [
    "attackerPid",
    "attackerOutputSha256",
    "testWindow",
    "testOperation",
    "actualOperation",
    "swapOutcome",
    "outsideSentinel",
  ],
  SHUTDOWN: ["outcome"],
  RECOVER_SESSION: null,
  TEST_POST_ACK_JOURNAL_FAILURE: ["outcome"],
});

function exactKeys(value, keys, label) {
  if (JSON.stringify(Object.keys(value)) !== JSON.stringify(keys)) {
    throw new Error(
      `${label} has extra, missing, or reordered fields: ${Object.keys(value).join(",")} != ${keys.join(",")}`,
    );
  }
}

function decimal(value) {
  return /^(0|[1-9][0-9]*)$/u.test(value ?? "");
}

function digest(value) {
  return /^[0-9a-f]{64}$/u.test(value ?? "");
}

function fileIdentity(value) {
  return /^(0|[1-9][0-9]*):[0-9a-f]{32}$/iu.test(value ?? "");
}

function exactBase64(value) {
  if (typeof value !== "string") return null;
  try {
    const bytes = Buffer.from(value, "base64");
    return bytes.toString("base64") === value ? bytes : null;
  } catch {
    return null;
  }
}

function validateFileResult(value, payload = false) {
  if (
    !digest(value.contentSha256) ||
    !decimal(value.bytes) ||
    !decimal(value.volumeSerial) ||
    !/^[0-9a-f]{32}$/iu.test(value.fileId ?? "")
  ) {
    throw new Error("native broker file result semantics changed");
  }
  if (payload) {
    const bytes = exactBase64(value.payloadBase64);
    if (
      !bytes ||
      String(bytes.length) !== value.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== value.contentSha256
    ) {
      throw new Error("native broker file payload authority changed");
    }
  }
}

function validateJobClosedReceipt(value) {
  if (!new Set(["CLOSED", "TERMINATED_CLOSED"]).has(value.jobState)) {
    if (value.closedReceiptSha256 !== "" || value.closedReceiptBase64 !== "") {
      throw new Error("native broker exposed a premature JOB_CLOSED receipt");
    }
    return;
  }
  const bytes = exactBase64(value.closedReceiptBase64);
  if (
    !bytes ||
    !digest(value.closedReceiptSha256) ||
    createHash("sha256").update(bytes).digest("hex") !== value.closedReceiptSha256
  ) {
    throw new Error("native broker JOB_CLOSED receipt digest changed");
  }
  const entries = Object.fromEntries(
    bytes
      .toString("utf8")
      .split("\n")
      .map((line) => line.split("=")),
  );
  const expected = {
    assignmentReceiptSha256: value.assignmentReceiptSha256,
    clientIdentity: value.clientIdentity,
    cwdIdentity: value.cwdIdentity,
    distDir: value.distDir,
    event: "JOB_CLOSED",
    exitCode: value.exitCode,
    infrastructurePlanDigest: value.infrastructurePlanDigest,
    nextIdentity: value.nextIdentity,
    nodeIdentity: value.nodeIdentity,
    outputAuthorityRootId: value.outputAuthorityRootId,
    outputAuthoritySha256: value.outputAuthoritySha256,
    powerShellIdentity: value.powerShellIdentity,
    retainedOutputParentIdentity: value.retainedOutputParentIdentity,
    schema: "fluyo:r4b:attempt-002-builder-job-closed:v1",
    status: value.exitCode === "0" ? "PASS" : "FAIL",
    tempIdentity: value.tempIdentity,
  };
  if (JSON.stringify(entries) !== JSON.stringify(expected)) {
    throw new Error("native broker JOB_CLOSED receipt binding changed");
  }
}

export function validateNativeResponseFrame(value, expected, phase) {
  if (!value || Array.isArray(value))
    throw new Error(`native broker ${phase} frame is not an object`);
  const identityValid =
    value.magic === "FLUYONS1" &&
    value.version === 1 &&
    value.sessionNonce === expected.sessionNonce &&
    value.sequence === expected.sequence &&
    value.operation === expected.operation &&
    value.requestSha256 === expected.requestSha256 &&
    new Set(["PASS", "FAIL"]).has(value.status);
  if (!identityValid)
    throw new Error(
      `native broker ${phase} frame escaped the closed response contract: ${JSON.stringify({ value, expected })}`,
    );

  if (phase === "commit confirmation") {
    exactKeys(value, [...CORE_KEYS, ...COMMIT_KEYS], `native broker ${phase}`);
    if (
      value.status !== "PASS" ||
      value.commitStatus !== "COMMIT_CONFIRMED" ||
      !digest(value.acknowledgedResponseSha256) ||
      !digest(value.journalAfterAckSha256) ||
      !decimal(value.journalAfterAckSequence)
    ) {
      throw new Error("native broker commit confirmation semantics changed");
    }
    return value;
  }

  if (value.status === "FAIL") {
    exactKeys(
      value,
      [...CORE_KEYS, "errorCode", ...PRE_RESPONSE_ANCHOR_KEYS],
      `native broker ${phase}`,
    );
    if (
      typeof value.errorCode !== "string" ||
      value.errorCode.length === 0 ||
      !digest(value.journalBeforeResponseSha256) ||
      !decimal(value.journalBeforeResponseSequence)
    ) {
      throw new Error("native broker failure omitted its exact error code");
    }
    return value;
  }
  let fields = OPERATION_FIELDS[value.operation];
  if (value.operation === "NVDA_START_WITH_HANDLES") {
    fields = NVDA_VARIANT_FIELDS[expected.resultVariant];
    if (!fields) throw new Error("native broker NVDA result variant is not closed");
  }
  if (value.operation === "RECOVER_SESSION") {
    const replay = new Set(["VERIFIED_APPLIED_UNACKED", "VERIFIED_COMMITTED"]);
    const closed = new Set([
      ...replay,
      "VERIFIED_NOT_APPLIED",
      "AMBIGUOUS_PERMANENT_HELD",
      "JOURNAL_PERMANENT_HELD",
      "LEGACY_JOURNAL_PERMANENT_HELD",
    ]);
    if (!closed.has(value.outcome)) throw new Error("native broker recovery outcome is not closed");
    fields = replay.has(value.outcome)
      ? [
          "outcome",
          "replayResponseBase64",
          "replayResponseSha256",
          "replaySessionNonce",
          "replaySequence",
          "replayOperation",
          "replayRequestSha256",
        ]
      : ["outcome"];
  }
  if (value.operation === "TEST_SYNCHRONIZED_SWAP" && "actualContentSha256" in value) {
    fields = [
      "attackerPid",
      "attackerOutputSha256",
      "testWindow",
      "actualContentSha256",
      "testOperation",
      "actualOperation",
      "swapOutcome",
      "outsideSentinel",
    ];
  }
  if (!fields) throw new Error(`native broker ${phase} has no closed response schema`);
  exactKeys(
    value,
    [...CORE_KEYS, ...fields, ...PRE_RESPONSE_ANCHOR_KEYS],
    `native broker ${phase}`,
  );
  if (!digest(value.journalBeforeResponseSha256) || !decimal(value.journalBeforeResponseSequence)) {
    throw new Error("native broker pre-response journal anchor changed");
  }

  if (value.operation === "HELLO") {
    if (
      value.boundary !== "WINDOWS_PERSISTENT_CAPABILITY_PIPE_V4_J2" ||
      !digest(value.contractSha256) ||
      !/^[1-9][0-9]*$/u.test(value.brokerPid ?? "") ||
      !/^[1-9][0-9]*$/u.test(value.controllerJournalAnchorHandle ?? "") ||
      typeof value.powerShellIdentity !== "string" ||
      value.powerShellIdentity.length === 0 ||
      typeof value.powerShellVersion !== "string" ||
      value.powerShellVersion.length === 0 ||
      !/^Valid:/u.test(value.powerShellSignature ?? "") ||
      !digest(value.journalSha256) ||
      !decimal(value.journalSequence) ||
      !digest(value.lastRequestId) ||
      typeof value.controllerCreationIdentity !== "string" ||
      value.controllerCreationIdentity.length === 0 ||
      !new Set([
        "EMPTY",
        "INTENT_DURABLE",
        "APPLIED_UNACKED_DURABLE",
        "ACKED_COMMITTED_DURABLE",
        "JOB_CLOSED_DURABLE",
        "FAILED_HELD",
        "PERMANENT_HELD",
        "LEGACY_JOURNAL",
      ]).has(value.lastJournalState) ||
      !new Set([
        "CLOSED",
        "FAILED_HELD",
        "JOURNAL_PERMANENT_HELD",
        "ORPHANED_PERMANENT_HELD",
        "AMBIGUOUS_PERMANENT_HELD",
        "LEGACY_JOURNAL_PERMANENT_HELD",
      ]).has(value.journalState) ||
      typeof value.journalFailureReason !== "string" ||
      value.journalFailureReason.length === 0
    ) {
      throw new Error("native broker HELLO authority semantics changed");
    }
  }
  if (
    new Set([
      "READ_BOUNDED",
      "WRITE_NEW",
      "APPEND_DURABLE",
      "REPLACE_EXISTING_EXACT",
      "PIN_FILE",
    ]).has(value.operation)
  ) {
    validateFileResult(value, value.operation === "READ_BOUNDED");
  }
  if (value.operation === "HASH_BOUNDED") validateFileResult(value, false);
  if (
    new Set(["CREATE_DIRECTORY", "RENAME_EXCLUSIVE", "UNLINK_EXACT"]).has(value.operation) &&
    (!decimal(value.volumeSerial) || !/^[0-9a-f]{32}$/iu.test(value.fileId ?? ""))
  ) {
    throw new Error("native broker filesystem identity semantics changed");
  }
  if (
    value.operation === "INVENTORY_TREE" &&
    (!digest(value.inventoryDigest) ||
      !digest(value.inventoryLeaseId) ||
      exactBase64(value.inventoryTokenBase64) === null ||
      !decimal(value.files) ||
      !decimal(value.directories) ||
      !decimal(value.bytes))
  ) {
    throw new Error("native broker inventory authority semantics changed");
  }
  if (
    value.operation === "REMOVE_TREE_EXACT" &&
    (!digest(value.inventoryDigest) ||
      !digest(value.inventoryLeaseId) ||
      !new Set(["ORIGINAL_INVENTORY_DELETED", "ORIGINAL_INVENTORY_ALREADY_DELETED"]).has(
        value.outcome,
      ))
  ) {
    throw new Error("native broker removal authority semantics changed");
  }
  if (
    value.operation === "UNPIN_FILE" &&
    (!digest(value.inventoryLeaseId) || value.outcome !== "ORIGINAL_INVENTORY_RELEASED")
  ) {
    throw new Error("native broker inventory release semantics changed");
  }

  if (
    ["JOB_CREATE_SUSPENDED", "JOB_RESUME", "JOB_STATUS", "JOB_TERMINATE"].includes(value.operation)
  ) {
    for (const key of [
      "canonicalArgvSha256",
      "environmentSha256",
      "outputAuthoritySha256",
      "outputPathSha256",
      "infrastructurePlanDigest",
      "assignmentReceiptSha256",
    ])
      if (!digest(value[key])) throw new Error(`native broker Job ${key} is not an exact digest`);
    if (
      value.outputAuthorityRootId !== "BUILD_OUTPUT_ROOT" ||
      value.distDir !== ".next-attempt-002"
    ) {
      throw new Error("native broker Job output authority semantics changed");
    }
    if (
      !/^[1-9][0-9]*$/u.test(value.brokerPid ?? "") ||
      !/^[1-9][0-9]*$/u.test(value.builderPid ?? "") ||
      ![
        value.nodeIdentity,
        value.nextIdentity,
        value.powerShellIdentity,
        value.clientIdentity,
        value.cwdIdentity,
        value.tempIdentity,
        value.retainedOutputParentIdentity,
      ].every(fileIdentity) ||
      value.retainedOutputParentIdentity !== value.cwdIdentity ||
      !new Set(["ASSIGNED_SUSPENDED", "RUNNING", "CLOSED", "TERMINATED_CLOSED"]).has(
        value.jobState,
      ) ||
      !(value.exitCode === undefined || value.exitCode === "" || decimal(value.exitCode))
    ) {
      throw new Error("native broker Job pinned identity semantics changed");
    }
    if (value.operation === "JOB_CREATE_SUSPENDED") {
      const receipt = exactBase64(value.assignmentReceiptBase64);
      if (
        !receipt ||
        createHash("sha256").update(receipt).digest("hex") !== value.assignmentReceiptSha256 ||
        value.limitFlags !== "JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE"
      ) {
        throw new Error("native broker Job assignment receipt semantics changed");
      }
    } else {
      validateJobClosedReceipt(value);
    }
  }
  if (value.operation === "RECOVER_SESSION" && "replayResponseSha256" in value) {
    const replay = exactBase64(value.replayResponseBase64);
    if (
      !digest(value.replayResponseSha256) ||
      !replay ||
      createHash("sha256").update(replay).digest("hex") !== value.replayResponseSha256
    ) {
      throw new Error("native broker recovery replay authority changed");
    }
    let replayValue;
    try {
      replayValue = JSON.parse(replay.toString("utf8"));
    } catch {
      throw new Error("native broker recovery replay is not exact UTF-8 JSON");
    }
    validateNativeResponseFrame(
      replayValue,
      {
        sessionNonce: value.replaySessionNonce,
        sequence: value.replaySequence,
        operation: value.replayOperation,
        requestSha256: value.replayRequestSha256,
      },
      "recovery replay",
    );
  }
  if (
    value.operation === "NVDA_START_WITH_HANDLES" &&
    expected.resultVariant !== "TEST_INJECTED_CONSUMER"
  ) {
    if (
      value.controlTransport !== "INHERITED_ANONYMOUS_PIPE" ||
      value.readyTransport !== "INHERITED_ANONYMOUS_PIPE" ||
      value.transcriptExternalWriteShare !== "DENIED" ||
      value.diagnosticExternalWriteShare !== "DENIED"
    ) {
      throw new Error("native broker NVDA handle authority semantics changed");
    }
    if (
      ![value.controllerPid, value.brokerPid, value.nvdaPid].every((entry) =>
        /^[1-9][0-9]*$/u.test(entry ?? ""),
      ) ||
      new Set([value.controllerPid, value.brokerPid, value.nvdaPid]).size !== 3 ||
      !new Set(["ASSIGNED_SUSPENDED", "RUNNING", "CLOSED"]).has(value.nvdaState) ||
      value.pinnedHandleCount !== "8" ||
      value.inheritedHandleCount !== "10"
    ) {
      throw new Error("native broker NVDA process identity semantics changed");
    }
    if ("payloadBase64" in value) {
      const payload = exactBase64(value.payloadBase64);
      if (
        !payload ||
        String(payload.length) !== value.bytes ||
        createHash("sha256").update(payload).digest("hex") !== value.contentSha256
      ) {
        throw new Error("native broker NVDA payload authority changed");
      }
    }
  }
  if (
    value.operation === "NVDA_STOP" &&
    (value.nvdaState !== "TERMINATED_CLOSED" ||
      value.pinnedHandleCount !== "8" ||
      value.inheritedHandleCount !== "10")
  ) {
    throw new Error("native broker NVDA stop semantics changed");
  }
  if (
    value.operation === "TEST_SYNCHRONIZED_SWAP" &&
    (!/^[1-9][0-9]*$/u.test(value.attackerPid ?? "") ||
      !digest(value.attackerOutputSha256) ||
      !(value.actualContentSha256 === undefined || digest(value.actualContentSha256)) ||
      value.testWindow !== "TEST_WINDOW_OPEN/CONTINUE" ||
      value.actualOperation !== "PASS" ||
      value.swapOutcome !== "BLOCKED_OR_REFUSED" ||
      value.outsideSentinel !== "UNCHANGED")
  ) {
    throw new Error("native broker synchronized-swap semantics changed");
  }
  if (value.operation === "SHUTDOWN" && value.outcome !== "SESSION_CLOSED") {
    throw new Error("native broker shutdown semantics changed");
  }
  if (
    value.operation === "TEST_POST_ACK_JOURNAL_FAILURE" &&
    value.outcome !== "APPLIED_PENDING_ACK"
  ) {
    throw new Error("native broker post-ACK fixture semantics changed");
  }
  return value;
}

export const windowsNativeResponseTesting = Object.freeze({ validateNativeResponseFrame });
