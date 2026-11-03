import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  NVDA_CONTROL_SCHEMA,
  protocolSourceSha256,
  validateNvdaControl,
  validateNvdaReady,
} from "./protocol.mjs";
import {
  assertFixedRootGuard,
  createFixedDirectory,
  inventoryFixedOwnedTree,
  readBoundedRegularFile,
  writeFixedRegularFile,
} from "../fixed-root-guard.mjs";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const ATTEMPT = resolve(ROOT, ".r4b-preflight/runtime/attempts/attempt-002-observer");
const PLUGIN_SOURCE = resolve(
  ROOT,
  "scripts/r4b-evidence/nvda-adapter/scratchpad/globalPlugins/fluyoPreflightSpeech.py",
);
export const NVDA_ADAPTER_PATHS = Object.freeze({
  installer: resolve(ROOT, ".r4b-preflight/downloads/nvda_2026.3.exe"),
  rawRoot: resolve(ATTEMPT, "raw/nvda"),
  portable: resolve(ATTEMPT, "raw/nvda/portable"),
  config: resolve(ATTEMPT, "raw/nvda/config"),
  diagnostics: resolve(ATTEMPT, "raw/nvda/diagnostics.log"),
  preSpeechRequests: resolve(ATTEMPT, "raw/nvda/pre-speech-requests.jsonl"),
  pluginSource: PLUGIN_SOURCE,
  pluginInstalled: resolve(
    ATTEMPT,
    "raw/nvda/config/scratchpad/globalPlugins/fluyoPreflightSpeech.py",
  ),
  protocolBinding: resolve(ATTEMPT, "raw/nvda/protocol.sha256"),
  configuration: resolve(ATTEMPT, "raw/nvda/config/nvda.ini"),
});

function sha256(path) {
  return createHash("sha256")
    .update(readBoundedRegularFile(path, ROOT, 1048576, "NVDA bounded digest read"))
    .digest("hex");
}

function guardNvdaPath(path, options = {}) {
  return assertFixedRootGuard(ROOT, path, {
    label: "attempt-002 NVDA fixed-root guard",
    ...options,
  });
}

function ensureNvdaParent(path) {
  createFixedDirectory(dirname(path), ROOT, {
    recursive: true,
    label: "attempt-002 NVDA parent",
  });
}

function guardedNvdaWrite(path, bytes, options) {
  ensureNvdaParent(path);
  writeFixedRegularFile(path, ROOT, bytes, {
    ...options,
    label: "attempt-002 NVDA write",
  });
}

export function createNvdaLifecycle(executable) {
  if (arguments.length !== 1 || executable !== resolve(NVDA_ADAPTER_PATHS.portable, "nvda.exe")) {
    throw new Error("NVDA lifecycle accepts only the fixed portable executable");
  }
  return Object.freeze({
    create: [
      "--create-portable-silent",
      `--portable-path=${NVDA_ADAPTER_PATHS.portable}`,
      "--no-sr-flag",
    ],
    launch: [
      "--minimal",
      "--no-sr-flag",
      "--lang=en",
      `--config-path=${NVDA_ADAPTER_PATHS.config}`,
      `--log-file=${NVDA_ADAPTER_PATHS.diagnostics}`,
      "--log-level=20",
    ],
    readyTransport: "INHERITED_ANONYMOUS_PIPE",
    stopTransport: "PERSISTENT_BROKER_OPERATION_18",
    diagnosticsAreTranscript: false,
  });
}

export function validateExactScratchpadConfigTree() {
  guardNvdaPath(NVDA_ADAPTER_PATHS.config, {
    allowAbsentLeaf: false,
    leafKind: "directory",
  });
  const inventory = inventoryFixedOwnedTree(
    NVDA_ADAPTER_PATHS.config,
    ROOT,
    "NVDA exact config inventory",
  );
  const expectedConfigurationSha256 = createHash("sha256")
    .update("[development]\nenableScratchpadDir = True\n", "utf8")
    .digest("hex");
  if (
    inventory.files !== 2 ||
    inventory.directories !== 3 ||
    sha256(NVDA_ADAPTER_PATHS.configuration) !== expectedConfigurationSha256 ||
    sha256(NVDA_ADAPTER_PATHS.pluginInstalled) !== sha256(NVDA_ADAPTER_PATHS.pluginSource)
  ) {
    throw new Error("NVDA isolated config contains an add-on or unbound byte");
  }
  return Object.freeze({ fileCount: inventory.files, addOnCount: 0 });
}

export function installHashBoundScratchpad() {
  const sourceDigest = sha256(PLUGIN_SOURCE);
  const protocolDigest = protocolSourceSha256();
  ensureNvdaParent(NVDA_ADAPTER_PATHS.pluginInstalled);
  const pluginBytes = readBoundedRegularFile(
    PLUGIN_SOURCE,
    ROOT,
    1048576,
    "NVDA plugin source read",
  );
  writeFixedRegularFile(NVDA_ADAPTER_PATHS.pluginInstalled, ROOT, pluginBytes, {
    flag: "wx",
    label: "NVDA plugin installation",
  });
  if (sha256(NVDA_ADAPTER_PATHS.pluginInstalled) !== sourceDigest) {
    throw new Error("installed NVDA scratchpad plugin digest changed");
  }
  guardedNvdaWrite(NVDA_ADAPTER_PATHS.protocolBinding, `${protocolDigest}\n`, {
    encoding: "ascii",
    flag: "wx",
  });
  guardedNvdaWrite(
    NVDA_ADAPTER_PATHS.configuration,
    "[development]\nenableScratchpadDir = True\n",
    {
      encoding: "utf8",
      flag: "wx",
    },
  );
  validateExactScratchpadConfigTree();
  return Object.freeze({ pluginSha256: sourceDigest, protocolSha256: protocolDigest });
}

export function createNvdaControl({
  observationId,
  nativeReceipt,
  expectedObservationIds,
  expectedSpeechContract,
}) {
  const now = process.hrtime.bigint() / 1000000n;
  const control = {
    schema: NVDA_CONTROL_SCHEMA,
    attemptId: "attempt-002-observer",
    observationId,
    generation: String([...expectedObservationIds].indexOf(observationId) + 1),
    phase: "OBSERVE",
    expectedSpeechContract,
    controllerPid: process.pid,
    controllerCreationIdentity: nativeReceipt.controllerCreationIdentity,
    brokerPid: Number(nativeReceipt.brokerPid),
    brokerCreationIdentity: nativeReceipt.brokerCreationIdentity,
    expectedNvdaPid: Number(nativeReceipt.nvdaPid),
    nvdaCreationIdentity: nativeReceipt.nvdaCreationIdentity,
    capabilities: "CONTROL_READ|READY_WRITE|TRANSCRIPT_WRITE|DIAGNOSTIC_WRITE|OWNED_JOB_STOP",
    pluginSha256: sha256(PLUGIN_SOURCE),
    protocolSha256: protocolSourceSha256(),
    createdMonotonicMilliseconds: String(now),
    expiresMonotonicMilliseconds: String(now + 120000n),
  };
  validateNvdaControl(control, expectedObservationIds);
  return Object.freeze(control);
}

export function createNvdaCloseControl(control, expectedObservationIds) {
  const close = { ...control, phase: "CLOSE" };
  validateNvdaControl(close, expectedObservationIds);
  return Object.freeze(close);
}

export function validateNvdaReadyPayload(bytes, control) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 4096) {
    throw new Error("NVDA ready inherited-handle payload is outside its byte gate");
  }
  return validateNvdaReady(JSON.parse(bytes.toString("utf8")), control);
}

export const nvdaAdapterTesting = Object.freeze({ sha256 });
