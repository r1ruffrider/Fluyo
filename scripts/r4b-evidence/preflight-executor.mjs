import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PREFLIGHT_EVIDENCE_STATUS,
  PREFLIGHT_NETWORK_ISOLATION_STATUS,
  PREFLIGHT_SCHEMAS,
  validateAttempt002ToolManifest,
  validateAttempt002Discard,
  validateAttempt002Result,
  validatePreflightDiscard,
  validatePreflightResult,
  validatePreflightSmokeResult,
  validatePreflightToolManifest,
} from "./preflight-contracts.mjs";
import {
  ATTEMPT_002_PATHS,
  recordAttempt002Cleaning,
  recordAttempt002FailedHeld,
  recordAttempt002ResultRecorded,
  recordAttempt002Sealed,
  resolveAttempt002State,
  verifyAttempt002AuthorityCheckout,
} from "./preflight-attempts.mjs";
import { createDiscardedPreflightPlan, discardedPreflightPlanDigest } from "./preflight-plan.mjs";
import {
  assertFixedRootGuard,
  createFixedDirectory,
  inventoryFixedOwnedTree,
  isPathWithin,
  readBoundedRegularFile,
  removeFixedOwnedTree,
  unlinkFixedRegularFile,
  writeFixedRegularFile,
} from "./fixed-root-guard.mjs";
import { recoverNativeFailure } from "./windows-native-client.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const RUNTIME_ROOT = resolve(REPOSITORY_ROOT, ".r4b-preflight/runtime");
const RAW_ROOT = resolve(RUNTIME_ROOT, "raw");
const MANIFEST_PATH = resolve(RUNTIME_ROOT, "tool-manifest.json");
const SMOKE_RESULT_PATH = resolve(RUNTIME_ROOT, "smoke-result.json");
const AGGREGATE_PATH = resolve(RUNTIME_ROOT, "synthetic-observation-aggregate.json");
const RESULT_PATH = resolve(RUNTIME_ROOT, "sanitized-result.json");
const DISCARD_PATH = resolve(RUNTIME_ROOT, "discard-receipt.json");
const EXPECTED_MANIFEST_DIGEST = "a9128a28ebb11329eadb40e35adb0eb43e2f970d8f037f380ce7cfeaf0c04738";
const EXPECTED_SMOKE_DIGEST = "267430f37142d29e9fc8925e7f908ce9449fb53d19100064185ff75705185992";
const EXPECTED_SMOKE_RAW_ROOTS = Object.freeze([
  "smoke-20261102T011500Z-9f2a6d11",
  "smoke-20261102T011800Z-a3c4e7f2",
]);
const REQUIRED_TOOL_IDS = Object.freeze(["chrome_for_testing", "chromedriver"]);
const CLOSED_CHECK_STATUSES = new Set(["PASS", "FAIL", "BLOCKED", "UNATTEMPTED"]);
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

export const PREFLIGHT_EXECUTOR_PATHS = Object.freeze({
  manifest: ".r4b-preflight/runtime/tool-manifest.json",
  smokeResult: ".r4b-preflight/runtime/smoke-result.json",
  aggregate: ".r4b-preflight/runtime/synthetic-observation-aggregate.json",
  raw: ".r4b-preflight/runtime/raw",
  result: ".r4b-preflight/runtime/sanitized-result.json",
  discard: ".r4b-preflight/runtime/discard-receipt.json",
});

function requireExactKeys(value, expected, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  const actual = Object.keys(value);
  if (actual.length !== expected.length || !expected.every((key, index) => key === actual[index])) {
    throw new Error(`${name} keys must match the closed canonical order`);
  }
}

function requireDecimal(value, name) {
  if (typeof value !== "string" || !DECIMAL.test(value)) {
    throw new Error(`${name} must be a canonical unsigned decimal string`);
  }
}

function canonicalDigest(value) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function bytesDigest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isWithin(child, parent) {
  const pathFromParent = relative(parent, child);
  return (
    pathFromParent === "" ||
    (pathFromParent !== ".." &&
      !pathFromParent.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromParent))
  );
}

function assertRealDirectoryChain(parent, child) {
  return assertFixedRootGuard(parent, child, {
    allowAbsentLeaf: false,
    leafKind: "directory",
    label: "fixed runtime directory chain",
  });
}

function readBoundedJsonRecord(path, runtimeRoot, maxBytes, name) {
  const exactPath = resolve(path);
  const exactRuntimeRoot = resolve(runtimeRoot);
  if (!isWithin(exactPath, exactRuntimeRoot)) {
    throw new Error(`${name} escaped the fixed runtime root`);
  }
  if (isPathWithin(exactPath, REPOSITORY_ROOT)) {
    const bytes = readBoundedRegularFile(exactPath, REPOSITORY_ROOT, maxBytes, name);
    return Object.freeze({ value: JSON.parse(bytes.toString("utf8")), digest: bytesDigest(bytes) });
  }
  const fileStat = lstatSync(exactPath);
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
    throw new Error(`${name} must be a real file, not a link or special entry`);
  }
  if (fileStat.size > maxBytes) throw new Error(`${name} exceeds the approved JSON byte gate`);
  const bytes = readFileSync(exactPath);
  return Object.freeze({ value: JSON.parse(bytes.toString("utf8")), digest: bytesDigest(bytes) });
}

function readBoundedJson(path, runtimeRoot, maxBytes, name) {
  return readBoundedJsonRecord(path, runtimeRoot, maxBytes, name).value;
}

function inventoryRawTree(rawRoot, runtimeRoot) {
  const exactRawRoot = resolve(runtimeRoot, "raw");
  if (resolve(rawRoot) !== exactRawRoot || !isWithin(exactRawRoot, resolve(runtimeRoot))) {
    throw new Error("refusing to inspect a raw root outside the fixed runtime root");
  }
  if (!existsSync(exactRawRoot)) {
    return Object.freeze({ rootNames: [], files: 0, bytes: 0n, reparsePoints: 0 });
  }
  const rootStat = lstatSync(exactRawRoot);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error("fixed raw root must be a real directory, not a link or reparse target");
  }
  let bytes = 0n;
  let files = 0;
  let reparsePoints = 0;
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const child = resolve(directory, entry.name);
      if (!isWithin(child, exactRawRoot)) throw new Error("raw entry escaped the fixed raw root");
      if (entry.isSymbolicLink()) {
        reparsePoints += 1;
        continue;
      }
      if (entry.isDirectory()) {
        visit(child);
      } else if (entry.isFile()) {
        files += 1;
        bytes += BigInt(lstatSync(child).size);
      } else {
        throw new Error("raw tree contains an unsupported filesystem entry");
      }
    }
  };
  visit(exactRawRoot);
  const rootNames = readdirSync(exactRawRoot, { withFileTypes: true })
    .map((entry) => entry.name)
    .sort();
  return Object.freeze({ rootNames, files, bytes, reparsePoints });
}

function countRawTreeBytes(rawRoot, runtimeRoot) {
  const inventory = inventoryRawTree(rawRoot, runtimeRoot);
  if (inventory.reparsePoints !== 0) {
    throw new Error("raw tree cannot contain links or reparse targets");
  }
  return inventory.bytes;
}

function discardRawTree(rawRoot, runtimeRoot) {
  const approvedInventory = inventoryExactOwnedTree(rawRoot, rawRoot);
  const bytes = countRawTreeBytes(rawRoot, runtimeRoot);
  if (existsSync(rawRoot)) {
    if (isPathWithin(rawRoot, REPOSITORY_ROOT)) {
      removeFixedOwnedTree(
        rawRoot,
        REPOSITORY_ROOT,
        approvedInventory,
        "fixed raw preflight cleanup",
      );
    } else rmSync(rawRoot, { recursive: true, force: false });
  }
  if (existsSync(rawRoot)) throw new Error("raw preflight root remains after discard");
  return bytes;
}

export function inventoryExactOwnedTree(path, exactPath) {
  if (resolve(path) !== resolve(exactPath))
    throw new Error("owned cleanup target is not the fixed exact root");
  if (isPathWithin(path, REPOSITORY_ROOT)) {
    return inventoryFixedOwnedTree(path, REPOSITORY_ROOT, "attempt-002 owned inventory");
  }
  if (!existsSync(path))
    return Object.freeze({
      files: 0,
      directories: 0,
      bytes: 0n,
      reparsePoints: 0,
      digest: canonicalDigest([]),
    });
  const root = lstatSync(path);
  if (!root.isDirectory() || root.isSymbolicLink() || (root.mode & 0o120000) === 0o120000) {
    throw new Error("owned cleanup root must be a real directory");
  }
  const result = { files: 0, directories: 1, bytes: 0n, reparsePoints: 0 };
  const records = [];
  const pending = [path];
  while (pending.length) {
    const current = pending.pop();
    for (const name of readdirSync(current)) {
      const child = resolve(current, name);
      if (!isWithin(child, exactPath))
        throw new Error("owned cleanup entry escaped the fixed root");
      const entry = lstatSync(child);
      if (entry.isSymbolicLink() || (entry.mode & 0o120000) === 0o120000) {
        result.reparsePoints += 1;
      } else if (entry.isDirectory()) {
        result.directories += 1;
        pending.push(child);
      } else if (entry.isFile()) {
        result.files += 1;
        result.bytes += BigInt(entry.size);
        records.push({
          path: relative(exactPath, child).replaceAll("\\", "/"),
          bytes: String(entry.size),
          sha256: bytesDigest(
            readBoundedRegularFile(child, exactPath, entry.size, "owned inventory read"),
          ),
        });
      } else throw new Error("owned cleanup tree contains an unsupported entry");
    }
  }
  if (result.reparsePoints) throw new Error("owned cleanup tree contains a link or reparse point");
  records.sort((left, right) => left.path.localeCompare(right.path));
  return Object.freeze({ ...result, digest: canonicalDigest(records) });
}

function discardExactOwnedTree(path, exactPath, approvedInventory) {
  if (resolve(path) !== resolve(exactPath))
    throw new Error("owned cleanup target is not the fixed exact root");
  if (
    !existsSync(path) &&
    approvedInventory?.files === 0 &&
    approvedInventory?.directories === 0 &&
    approvedInventory?.bytes === 0n
  ) {
    return 0n;
  }
  if (isPathWithin(path, REPOSITORY_ROOT)) {
    return removeFixedOwnedTree(
      path,
      REPOSITORY_ROOT,
      approvedInventory,
      "attempt-002 owned cleanup",
    ).bytes;
  }
  const inventory = inventoryExactOwnedTree(path, exactPath);
  if (existsSync(path)) rmSync(path, { recursive: true, force: false });
  if (existsSync(path)) throw new Error("fixed owned cleanup root remains after deletion");
  return inventory.bytes;
}

function validateSmokeRawInventory(inventory, smokeResult) {
  if (
    JSON.stringify(inventory.rootNames) !== JSON.stringify(EXPECTED_SMOKE_RAW_ROOTS) ||
    inventory.files !== smokeResult.rawRootsPendingDiscard.files ||
    inventory.bytes !== BigInt(smokeResult.rawRootsPendingDiscard.bytes) ||
    inventory.reparsePoints !== smokeResult.rawRootsPendingDiscard.reparsePoints
  ) {
    throw new Error("immediate smoke raw inventory does not match the bound cleanup authority");
  }
}

function emptyRawInventory(inventory) {
  return (
    inventory.rootNames.length === 0 &&
    inventory.files === 0 &&
    inventory.bytes === 0n &&
    inventory.reparsePoints === 0
  );
}

export function expectedSyntheticCheckIds(plan = createDiscardedPreflightPlan()) {
  const ids = [
    ...plan.observations.map((entry) => `observation:${entry.observationId}`),
    ...plan.accessibilityChecks.map((entry) => `accessibility:${entry.checkId}`),
    ...plan.riskIntersections.map((entry) => `risk:${entry.intersectionId}`),
    ...plan.transitionFamilies.map((entry) => `transition-family:${entry.familyId}`),
  ];
  if (ids.length !== 144 || new Set(ids).size !== ids.length) {
    throw new Error("preflight must resolve to exactly 144 unique required synthetic checks");
  }
  return Object.freeze(ids);
}

function validateFixedPathGates(plan) {
  if (PREFLIGHT_EXECUTOR_PATHS.raw.length > plan.gates.transientRootMaxChars) {
    throw new Error("fixed transient root exceeds the approved character gate");
  }
  for (const observation of plan.observations) {
    for (const key of observation.artifactKeys) {
      if (key.length > plan.gates.physicalKeyMaxChars) {
        throw new Error("physical artifact key exceeds the approved character gate");
      }
      const fullPath = resolve(RAW_ROOT, ...key.split("/"));
      if (!isWithin(fullPath, RAW_ROOT) || fullPath.length > plan.gates.fullPathMaxChars) {
        throw new Error("planned raw artifact path violates the containment or length gate");
      }
    }
  }
}

function validateObservationMetrics(metrics, gates, checkId) {
  requireExactKeys(
    metrics,
    [
      "maxPngEncodedBytes",
      "maxPngDecodedBytes",
      "maxJsonBytes",
      "maxTextBytes",
      "maxPhysicalKeyChars",
      "maxFullPathChars",
      "cleanRepeatChangedPixels",
      "pngNormalization",
    ],
    `${checkId} metrics`,
  );
  for (const field of [
    "maxPngEncodedBytes",
    "maxPngDecodedBytes",
    "maxJsonBytes",
    "maxTextBytes",
  ]) {
    requireDecimal(metrics[field], `${checkId} ${field}`);
  }
  for (const field of ["maxPhysicalKeyChars", "maxFullPathChars", "cleanRepeatChangedPixels"]) {
    if (!Number.isSafeInteger(metrics[field]) || metrics[field] < 0) {
      throw new Error(`${checkId} ${field} must be a nonnegative safe integer`);
    }
  }
  const violations =
    BigInt(metrics.maxPngEncodedBytes) > BigInt(gates.pngEncodedMaxBytes) ||
    BigInt(metrics.maxPngDecodedBytes) > BigInt(gates.pngDecodedMaxBytes) ||
    BigInt(metrics.maxJsonBytes) > BigInt(gates.jsonMaxBytes) ||
    BigInt(metrics.maxTextBytes) > BigInt(gates.textMaxBytes) ||
    metrics.maxPhysicalKeyChars > gates.physicalKeyMaxChars ||
    metrics.maxFullPathChars > gates.fullPathMaxChars ||
    metrics.cleanRepeatChangedPixels !== gates.cleanRepeatChangedPixels ||
    metrics.pngNormalization !== gates.pngNormalization;
  return violations;
}

export function validateSyntheticObservationAggregate(
  aggregate,
  plan = createDiscardedPreflightPlan(),
) {
  requireExactKeys(
    aggregate,
    [
      "schema",
      "creditable",
      "evidenceStatus",
      "productSourceCommit",
      "authorityDigest",
      "planDigest",
      "networkIsolationStatus",
      "unexpectedEgressCount",
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
      "announcements",
      "checks",
    ],
    "synthetic observation aggregate",
  );
  const planDigest = discardedPreflightPlanDigest(plan);
  if (
    aggregate.schema !== PREFLIGHT_SCHEMAS.aggregateV2 ||
    aggregate.creditable !== false ||
    aggregate.evidenceStatus !== PREFLIGHT_EVIDENCE_STATUS ||
    aggregate.productSourceCommit !== plan.sourceCommit ||
    !SHA256.test(aggregate.authorityDigest) ||
    aggregate.planDigest !== planDigest ||
    !SHA256.test(aggregate.planDigest)
  ) {
    throw new Error("synthetic observation aggregate authority does not match the approved plan");
  }
  if (!new Set(["PASS", "FAIL"]).has(aggregate.networkIsolationStatus)) {
    throw new Error("synthetic observation aggregate network status is not closed");
  }
  if (
    !Number.isSafeInteger(aggregate.unexpectedEgressCount) ||
    aggregate.unexpectedEgressCount < 0
  ) {
    throw new Error("unexpected egress count must be a nonnegative safe integer");
  }
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
  ])
    requireDecimal(aggregate[field], `aggregate ${field}`);
  const sampleCells = BigInt(aggregate.sampleDistinctCellCount);
  const fullCells = BigInt(aggregate.fullRunCellCount);
  if (
    sampleCells !== 30n ||
    BigInt(aggregate.sampleObservationCount) !== 120n ||
    BigInt(aggregate.sampleObservationArtifactFileCount) !== 960n ||
    fullCells !== 10800n ||
    BigInt(aggregate.fullRunArtifactCount) !== 86400n ||
    BigInt(aggregate.diskScaleNumerator) !== fullCells ||
    BigInt(aggregate.diskScaleDenominator) !== sampleCells ||
    fullCells % sampleCells !== 0n ||
    aggregate.diskSafetyFactorNumerator !== "2" ||
    aggregate.diskSafetyFactorDenominator !== "1" ||
    BigInt(aggregate.conservativeFullRunDiskBudgetBytes) !==
      BigInt(aggregate.sampleRawInventoryLogicalBytes) * (fullCells / sampleCells) * 2n
  )
    throw new Error("aggregate capacity contract changed or is not exactly divisible");
  if (
    BigInt(aggregate.conservativeFullRunDiskBudgetBytes) > BigInt(plan.gates.aggregateMaximumBytes)
  )
    throw new Error("aggregate conservative disk budget exceeds aggregateMaximumBytes");
  if (
    !Array.isArray(aggregate.announcements) ||
    aggregate.announcements.length !== plan.observations.length
  ) {
    throw new Error("aggregate must contain one sanitized announcement summary per observation");
  }
  for (const [index, summary] of aggregate.announcements.entries()) {
    requireExactKeys(
      summary,
      [
        "observationId",
        "eventCount",
        "normalizedTextSha256",
        "duplicateCount",
        "expectedOrderStatus",
        "oneTimeAnnouncementStatus",
      ],
      `aggregate announcements[${index}]`,
    );
    if (
      summary.observationId !== plan.observations[index].observationId ||
      !Number.isSafeInteger(summary.eventCount) ||
      summary.eventCount < 0 ||
      !SHA256.test(summary.normalizedTextSha256) ||
      !Number.isSafeInteger(summary.duplicateCount) ||
      summary.duplicateCount < 0 ||
      !CLOSED_CHECK_STATUSES.has(summary.expectedOrderStatus) ||
      !CLOSED_CHECK_STATUSES.has(summary.oneTimeAnnouncementStatus)
    ) {
      throw new Error("sanitized announcement summary is invalid or out of order");
    }
  }
  if (
    /(?:https?:\/\/|127\.0\.0\.1|localhost|[a-z]:\\|\\\\|\bpid\b|\bport\b|(?:pre-)?speech(?:-requests)?\.jsonl)/iu.test(
      JSON.stringify(aggregate),
    )
  ) {
    throw new Error(
      "sanitized aggregate retained a URL, port, path, process, device, or raw transcript locator",
    );
  }
  const expectedIds = expectedSyntheticCheckIds(plan);
  if (!Array.isArray(aggregate.checks) || aggregate.checks.length !== expectedIds.length) {
    throw new Error("aggregate must contain exactly the 144 required synthetic checks");
  }
  for (const [index, check] of aggregate.checks.entries()) {
    requireExactKeys(check, ["checkId", "status", "metrics"], `aggregate checks[${index}]`);
    if (check.checkId !== expectedIds[index])
      throw new Error("aggregate check order or identity changed");
    if (!CLOSED_CHECK_STATUSES.has(check.status))
      throw new Error(`${check.checkId} status is not closed`);
    const isObservation = check.checkId.startsWith("observation:");
    if (isObservation) {
      if (check.metrics === null) {
        if (!new Set(["BLOCKED", "UNATTEMPTED"]).has(check.status)) {
          throw new Error(`${check.checkId} may omit metrics only when blocked or unattempted`);
        }
        continue;
      }
      const gateViolation = validateObservationMetrics(check.metrics, plan.gates, check.checkId);
      if (gateViolation && check.status !== "FAIL") {
        throw new Error(
          `${check.checkId} must FAIL when a resource, path, or zero-diff gate fails`,
        );
      }
    } else if (check.metrics !== null) {
      throw new Error(`${check.checkId} must not retain raw or locator-shaped metrics`);
    }
  }
  if (
    aggregate.unexpectedEgressCount > 0 &&
    !aggregate.checks.some((check) => check.status === "FAIL")
  ) {
    throw new Error("unexpected egress must produce a fail-closed check result");
  }
  return aggregate;
}

function summarizeChecks(checks) {
  const counts = { PASS: 0, FAIL: 0, BLOCKED: 0, UNATTEMPTED: 0 };
  for (const check of checks) counts[check.status] += 1;
  return counts;
}

function blockedResult(plan, manifest, reason, inputDigests) {
  const planned = expectedSyntheticCheckIds(plan).length;
  const toolStates = REQUIRED_TOOL_IDS.map((toolId) => {
    const tool = manifest.tools.find((entry) => entry.toolId === toolId);
    return `${toolId}=${tool?.launchStatus ?? "MISSING"}`;
  });
  return {
    schema: PREFLIGHT_SCHEMAS.result,
    creditable: false,
    evidenceStatus: PREFLIGHT_EVIDENCE_STATUS,
    sourceCommit: plan.sourceCommit,
    planDigest: discardedPreflightPlanDigest(plan),
    toolManifestDigest: inputDigests.toolManifestDigest,
    smokeResultDigest: inputDigests.smokeResultDigest,
    networkIsolation: PREFLIGHT_NETWORK_ISOLATION_STATUS,
    status: "BLOCKED",
    conducted: 0,
    passed: 0,
    failed: 0,
    blocked: planned,
    requiredUnattempted: planned,
    peakBytes: "0",
    projectedFullRunPeakBytes: "0",
    retainedRawBytes: "0",
    notes: [`reason=${reason}`, `required_tools=${toolStates.join(",")}`],
  };
}

function aggregateResult(plan, aggregate, inputDigests) {
  const counts = summarizeChecks(aggregate.checks);
  const status =
    counts.FAIL > 0 ? "FAIL" : counts.BLOCKED > 0 || counts.UNATTEMPTED > 0 ? "BLOCKED" : "PASS";
  return {
    schema: PREFLIGHT_SCHEMAS.result,
    creditable: false,
    evidenceStatus: PREFLIGHT_EVIDENCE_STATUS,
    sourceCommit: plan.sourceCommit,
    planDigest: discardedPreflightPlanDigest(plan),
    toolManifestDigest: inputDigests.toolManifestDigest,
    smokeResultDigest: inputDigests.smokeResultDigest,
    networkIsolation: PREFLIGHT_NETWORK_ISOLATION_STATUS,
    status,
    conducted: counts.PASS + counts.FAIL,
    passed: counts.PASS,
    failed: counts.FAIL,
    blocked: counts.BLOCKED,
    requiredUnattempted: counts.UNATTEMPTED,
    peakBytes: aggregate.observerPeakRssBytes,
    projectedFullRunPeakBytes: aggregate.conservativeFullRunDiskBudgetBytes,
    retainedRawBytes: "0",
    notes: [
      "synthetic_checks=144",
      "raw_policy=discarded",
      "network_isolation_authority=unattempted",
    ],
  };
}

function writeExclusiveJson(path, value, maxBytes) {
  if (isPathWithin(path, REPOSITORY_ROOT)) {
    createFixedDirectory(dirname(path), REPOSITORY_ROOT, {
      recursive: true,
      label: "attempt-002 output parent",
    });
  } else mkdirSync(dirname(path), { recursive: true });
  const serialized = `${JSON.stringify(value)}\n`;
  if (Buffer.byteLength(serialized, "utf8") > maxBytes) {
    throw new Error("sanitized JSON output exceeds the approved byte gate");
  }
  if (isPathWithin(path, REPOSITORY_ROOT)) {
    writeFixedRegularFile(path, REPOSITORY_ROOT, serialized, {
      encoding: "utf8",
      flag: "wx",
      label: "attempt-002 output write",
    });
  } else writeFileSync(path, serialized, { encoding: "utf8", flag: "wx" });
}

function writeExclusiveOrValidateMatchingJson(path, value, runtimeRoot, maxBytes, name) {
  if (!existsSync(path)) {
    writeExclusiveJson(path, value, maxBytes);
    return "CREATED";
  }
  const existing = readBoundedJson(path, runtimeRoot, maxBytes, name);
  if (JSON.stringify(existing) !== JSON.stringify(value)) {
    throw new Error(`${name} exists with nonmatching bytes; refusing overwrite ambiguity`);
  }
  return "EXISTING_MATCH";
}

function inspectOwnedProcessesAndSockets() {
  if (process.platform !== "win32") {
    throw new Error("owned process/socket inspection requires the approved Windows worker");
  }
  const script = [
    "$ErrorActionPreference='Stop'",
    "$p=@(Get-CimInstance Win32_Process | Where-Object {$_.Name -in @('chrome.exe','chromedriver.exe','node.exe')} | Select-Object ProcessId,Name,ExecutablePath,CommandLine)",
    "$c=@(Get-NetTCPConnection -ErrorAction SilentlyContinue | Select-Object OwningProcess,State,LocalAddress,LocalPort,RemoteAddress,RemotePort)",
    "[pscustomobject]@{processes=$p;connections=$c}|ConvertTo-Json -Depth 4 -Compress",
  ].join("; ");
  const inspection = spawnSync(
    "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
  );
  if (inspection.status !== 0 || !inspection.stdout) {
    throw new Error("owned process/socket inspection failed closed");
  }
  const snapshot = JSON.parse(inspection.stdout);
  const processes = Array.isArray(snapshot.processes)
    ? snapshot.processes
    : snapshot.processes
      ? [snapshot.processes]
      : [];
  const connections = Array.isArray(snapshot.connections)
    ? snapshot.connections
    : snapshot.connections
      ? [snapshot.connections]
      : [];
  const expectedExecutablePaths = new Set(
    [
      resolve(REPOSITORY_ROOT, ".r4b-preflight/tools/chrome-win64/chrome.exe"),
      resolve(REPOSITORY_ROOT, ".r4b-preflight/tools/chromedriver-win64/chromedriver.exe"),
    ].map((path) => path.toLowerCase()),
  );
  const rawNeedle = `${RAW_ROOT.toLowerCase()}${sep}`;
  const ownedProcesses = processes.filter((entry) => {
    const executablePath = String(entry.ExecutablePath ?? "").toLowerCase();
    const commandLine = String(entry.CommandLine ?? "").toLowerCase();
    return expectedExecutablePaths.has(executablePath) || commandLine.includes(rawNeedle);
  });
  const ownedPids = new Set(ownedProcesses.map((entry) => Number(entry.ProcessId)));
  const ownedSockets = connections.filter((entry) => ownedPids.has(Number(entry.OwningProcess)));
  return Object.freeze({ ownedProcesses, ownedSockets });
}

function assertNoLingeringOwnership(snapshot) {
  if (
    !snapshot ||
    !Array.isArray(snapshot.ownedProcesses) ||
    !Array.isArray(snapshot.ownedSockets)
  ) {
    throw new Error("owned process/socket snapshot is malformed");
  }
  if (snapshot.ownedProcesses.length !== 0 || snapshot.ownedSockets.length !== 0) {
    throw new Error("lingering owned process or socket blocks raw cleanup");
  }
}

function inspectAttempt002LingeringOwnership() {
  if (process.platform !== "win32")
    throw new Error("attempt-002 ownership inspection requires Windows");
  const script = [
    "$ErrorActionPreference='Stop'",
    "$p=@(Get-CimInstance Win32_Process | Where-Object {$_.Name -in @('chrome.exe','chromedriver.exe','nvda.exe','node.exe')} | Select-Object ProcessId,Name,ExecutablePath,CommandLine)",
    "$c=@(Get-NetTCPConnection -ErrorAction SilentlyContinue | Select-Object OwningProcess,State,LocalAddress,LocalPort,RemoteAddress,RemotePort)",
    "[pscustomobject]@{processes=$p;connections=$c}|ConvertTo-Json -Depth 4 -Compress",
  ].join("; ");
  const inspection = spawnSync(
    "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
  );
  if (inspection.status !== 0 || !inspection.stdout)
    throw new Error("attempt-002 ownership inspection failed closed");
  const snapshot = JSON.parse(inspection.stdout);
  const processes = Array.isArray(snapshot.processes)
    ? snapshot.processes
    : snapshot.processes
      ? [snapshot.processes]
      : [];
  const connections = Array.isArray(snapshot.connections)
    ? snapshot.connections
    : snapshot.connections
      ? [snapshot.connections]
      : [];
  const needles = [ATTEMPT_002_PATHS.raw, ATTEMPT_002_PATHS.build].map((path) =>
    path.toLowerCase(),
  );
  const ownedProcesses = processes.filter((entry) => {
    const executable = String(entry.ExecutablePath ?? "").toLowerCase();
    const command = String(entry.CommandLine ?? "").toLowerCase();
    return needles.some((needle) => executable.startsWith(needle) || command.includes(needle));
  });
  const pids = new Set(ownedProcesses.map((entry) => Number(entry.ProcessId)));
  return Object.freeze({
    ownedProcesses,
    ownedSockets: connections.filter((entry) => pids.has(Number(entry.OwningProcess))),
  });
}

function completeCleanupTransaction({
  result,
  createReceipt,
  resultPath,
  receiptPath,
  runtimeRoot,
  rawRoot,
  maxBytes,
  expectedInventory,
  inspectOwnership,
  discard,
}) {
  validatePreflightResult(result);
  const resultDisposition = writeExclusiveOrValidateMatchingJson(
    resultPath,
    result,
    runtimeRoot,
    maxBytes,
    "sanitized result",
  );
  assertNoLingeringOwnership(inspectOwnership());
  const immediateInventory = inventoryRawTree(rawRoot, runtimeRoot);
  let discardedBytes;
  if (expectedInventory(immediateInventory)) {
    discardedBytes = discard(rawRoot, runtimeRoot);
  } else if (resultDisposition === "EXISTING_MATCH" && emptyRawInventory(immediateInventory)) {
    discardedBytes = 0n;
  } else {
    throw new Error(
      "raw cleanup inventory is neither the exact authority nor a safe recovery state",
    );
  }
  const residual = inventoryRawTree(rawRoot, runtimeRoot);
  if (!emptyRawInventory(residual)) throw new Error("raw cleanup left residual entries");
  const receipt = createReceipt(discardedBytes, resultDisposition);
  validatePreflightDiscard(receipt);
  writeExclusiveOrValidateMatchingJson(
    receiptPath,
    receipt,
    runtimeRoot,
    maxBytes,
    "discard receipt",
  );
  return Object.freeze({ result, receipt, resultDisposition });
}

export function executeDiscardedPreflight(...callerArguments) {
  if (callerArguments.length !== 0) {
    throw new Error("discarded preflight executor does not accept caller-supplied authority");
  }
  const plan = createDiscardedPreflightPlan();
  validateFixedPathGates(plan);
  assertRealDirectoryChain(REPOSITORY_ROOT, RUNTIME_ROOT);
  const jsonMaxBytes = Number(plan.gates.jsonMaxBytes);
  const manifestRecord = readBoundedJsonRecord(
    MANIFEST_PATH,
    RUNTIME_ROOT,
    jsonMaxBytes,
    "tool manifest",
  );
  const manifest = manifestRecord.value;
  validatePreflightToolManifest(manifest);
  if (manifestRecord.digest !== EXPECTED_MANIFEST_DIGEST) {
    throw new Error("tool manifest digest does not match the cleanup authority");
  }
  if (manifest.sourceCommit !== plan.sourceCommit) {
    throw new Error("tool manifest source commit does not match the approved plan");
  }
  const smokeRecord = readBoundedJsonRecord(
    SMOKE_RESULT_PATH,
    RUNTIME_ROOT,
    jsonMaxBytes,
    "smoke result",
  );
  const smokeResult = smokeRecord.value;
  validatePreflightSmokeResult(smokeResult);
  if (
    smokeRecord.digest !== EXPECTED_SMOKE_DIGEST ||
    smokeResult.toolManifestSha256 !== manifestRecord.digest ||
    smokeResult.sourceCommit !== plan.sourceCommit ||
    smokeResult.planDigest !== discardedPreflightPlanDigest(plan)
  ) {
    throw new Error("smoke result digest or authority binding does not match cleanup authority");
  }

  const inputDigests = Object.freeze({
    toolManifestDigest: manifestRecord.digest,
    smokeResultDigest: smokeRecord.digest,
  });

  const requiredToolsLaunched = REQUIRED_TOOL_IDS.every(
    (toolId) =>
      manifest.tools.find((entry) => entry.toolId === toolId)?.launchStatus === "LAUNCHED",
  );
  let result;
  if (!requiredToolsLaunched) {
    result = blockedResult(plan, manifest, "required_tool_launch_not_eligible", inputDigests);
  } else if (!existsSync(AGGREGATE_PATH)) {
    result = blockedResult(plan, manifest, "sanitized_observation_aggregate_missing", inputDigests);
  } else {
    const aggregate = readBoundedJson(
      AGGREGATE_PATH,
      RUNTIME_ROOT,
      jsonMaxBytes,
      "synthetic observation aggregate",
    );
    validateSyntheticObservationAggregate(aggregate, plan);
    result = aggregateResult(plan, aggregate, inputDigests);
  }
  return completeCleanupTransaction({
    result,
    createReceipt: () => ({
      schema: PREFLIGHT_SCHEMAS.discard,
      creditable: false,
      evidenceStatus: PREFLIGHT_EVIDENCE_STATUS,
      sourceCommit: plan.sourceCommit,
      planDigest: discardedPreflightPlanDigest(plan),
      resultDigest: canonicalDigest(result),
      toolManifestDigest: manifestRecord.digest,
      smokeResultDigest: smokeRecord.digest,
      notE2: true,
      discardedRawBytes: String(smokeResult.rawRootsPendingDiscard.bytes),
      residualRawBytes: "0",
      status: "PASS",
    }),
    resultPath: RESULT_PATH,
    receiptPath: DISCARD_PATH,
    runtimeRoot: RUNTIME_ROOT,
    rawRoot: RAW_ROOT,
    maxBytes: jsonMaxBytes,
    expectedInventory: (inventory) => {
      try {
        validateSmokeRawInventory(inventory, smokeResult);
        return true;
      } catch {
        return false;
      }
    },
    inspectOwnership: inspectOwnedProcessesAndSockets,
    discard: discardRawTree,
  });
}

function attempt002ResultFromAggregate(aggregate, authority, toolManifestDigest, inventories) {
  if (BigInt(aggregate.sampleRawInventoryLogicalBytes) !== inventories.raw.bytes) {
    throw new Error(
      "attempt-002 aggregate sampleRawInventoryLogicalBytes must equal the exact raw inventory bytes",
    );
  }
  const counts = summarizeChecks(aggregate.checks);
  const status =
    counts.FAIL > 0 ? "FAIL" : counts.BLOCKED > 0 || counts.UNATTEMPTED > 0 ? "BLOCKED" : "PASS";
  const result = {
    schema: PREFLIGHT_SCHEMAS.resultV2,
    creditable: false,
    evidenceStatus: PREFLIGHT_EVIDENCE_STATUS,
    attemptId: "attempt-002-observer",
    productSourceCommit: authority.productSourceCommit,
    authorityDigest: canonicalDigest(authority),
    planDigest: aggregate.planDigest,
    toolManifestDigest,
    networkIsolationStatus: aggregate.networkIsolationStatus,
    status,
    conducted: counts.PASS + counts.FAIL,
    passed: counts.PASS,
    failed: counts.FAIL,
    blocked: counts.BLOCKED + counts.UNATTEMPTED,
    requiredUnattempted: counts.UNATTEMPTED,
    observerPeakRssBytes: aggregate.observerPeakRssBytes,
    sampleRawInventoryLogicalBytes: aggregate.sampleRawInventoryLogicalBytes,
    sampleDistinctCellCount: aggregate.sampleDistinctCellCount,
    sampleObservationCount: aggregate.sampleObservationCount,
    sampleObservationArtifactFileCount: aggregate.sampleObservationArtifactFileCount,
    fullRunCellCount: aggregate.fullRunCellCount,
    fullRunArtifactCount: aggregate.fullRunArtifactCount,
    diskScaleNumerator: aggregate.diskScaleNumerator,
    diskScaleDenominator: aggregate.diskScaleDenominator,
    diskSafetyFactorNumerator: aggregate.diskSafetyFactorNumerator,
    diskSafetyFactorDenominator: aggregate.diskSafetyFactorDenominator,
    conservativeFullRunDiskBudgetBytes: aggregate.conservativeFullRunDiskBudgetBytes,
    rawInventoryDigest: inventories.raw.digest,
    buildInventoryDigest: inventories.build.digest,
    rawBytesBeforeDiscard: String(inventories.raw.bytes),
    buildBytesBeforeDiscard: String(inventories.build.bytes),
    retainedRawBytes: "0",
    retainedBuildBytes: "0",
    notes: [
      "synthetic_checks=144",
      "raw_and_build_policy=discarded",
      "evidence_qualification=NON_EVIDENCE",
    ],
  };
  validateAttempt002Result(result);
  return result;
}

function writeAttempt002FailedHeld() {
  const failedHeld = {
    schema: "fluyo:r4b:preflight-failed-held:v1",
    attemptId: "attempt-002-observer",
    category: "RESULT_WRITTEN_CLEANUP_FAILED",
    status: "FAILED_HELD",
  };
  if (!existsSync(ATTEMPT_002_PATHS.failedHeld)) {
    writeExclusiveJson(ATTEMPT_002_PATHS.failedHeld, failedHeld, 4096);
    recordAttempt002FailedHeld();
  }
}

function completeAttempt002CleanupTransaction(result, authorityDigest) {
  validateAttempt002Result(result);
  if (result.authorityDigest !== authorityDigest)
    throw new Error("attempt-002 result authority binding changed");
  const resultDisposition = writeExclusiveOrValidateMatchingJson(
    ATTEMPT_002_PATHS.result,
    result,
    ATTEMPT_002_PATHS.root,
    262144,
    "attempt-002 sanitized result",
  );
  if (resolveAttempt002State() === "OBSERVED") recordAttempt002ResultRecorded();
  if (new Set(["RESULT_RECORDED", "FAILED_HELD"]).has(resolveAttempt002State())) {
    recordAttempt002Cleaning();
  }
  if (resolveAttempt002State() !== "CLEANING") {
    throw new Error("attempt-002 cleanup requires append-only CLEANING state");
  }
  let rawInventory;
  let buildInventory;
  try {
    assertNoLingeringOwnership(inspectAttempt002LingeringOwnership());
    rawInventory = inventoryExactOwnedTree(ATTEMPT_002_PATHS.raw, ATTEMPT_002_PATHS.raw);
    buildInventory = inventoryExactOwnedTree(ATTEMPT_002_PATHS.build, ATTEMPT_002_PATHS.build);
    for (const [name, inventory, expectedDigest, expectedBytes] of [
      ["raw", rawInventory, result.rawInventoryDigest, result.rawBytesBeforeDiscard],
      ["build", buildInventory, result.buildInventoryDigest, result.buildBytesBeforeDiscard],
    ]) {
      const absentRecovery = inventory.files === 0 && inventory.directories === 0;
      if (
        !absentRecovery &&
        (inventory.digest !== expectedDigest || String(inventory.bytes) !== expectedBytes)
      ) {
        throw new Error(`attempt-002 ${name} cleanup inventory is partial or changed`);
      }
    }
    discardExactOwnedTree(ATTEMPT_002_PATHS.raw, ATTEMPT_002_PATHS.raw, rawInventory);
    discardExactOwnedTree(ATTEMPT_002_PATHS.build, ATTEMPT_002_PATHS.build, buildInventory);
    const residualRaw = inventoryExactOwnedTree(ATTEMPT_002_PATHS.raw, ATTEMPT_002_PATHS.raw);
    const residualBuild = inventoryExactOwnedTree(ATTEMPT_002_PATHS.build, ATTEMPT_002_PATHS.build);
    if (residualRaw.bytes !== 0n || residualBuild.bytes !== 0n)
      throw new Error("attempt-002 cleanup left residual bytes");
    const receipt = {
      schema: PREFLIGHT_SCHEMAS.discardV2,
      creditable: false,
      evidenceStatus: PREFLIGHT_EVIDENCE_STATUS,
      attemptId: "attempt-002-observer",
      authorityDigest,
      resultFileSha256: bytesDigest(
        readBoundedRegularFile(
          ATTEMPT_002_PATHS.result,
          REPOSITORY_ROOT,
          262144,
          "attempt-002 result digest read",
        ),
      ),
      discardedRawBytes: result.rawBytesBeforeDiscard,
      discardedBuildBytes: result.buildBytesBeforeDiscard,
      residualRawBytes: "0",
      residualBuildBytes: "0",
      cleanupStatus: "PASS",
      evidenceQualification: "NOT_E2",
    };
    validateAttempt002Discard(receipt);
    writeExclusiveOrValidateMatchingJson(
      ATTEMPT_002_PATHS.receipt,
      receipt,
      ATTEMPT_002_PATHS.root,
      262144,
      "attempt-002 discard receipt",
    );
    if (existsSync(ATTEMPT_002_PATHS.failedHeld))
      unlinkFixedRegularFile(
        ATTEMPT_002_PATHS.failedHeld,
        REPOSITORY_ROOT,
        "attempt-002 failed-held cleanup",
      );
    recordAttempt002Sealed();
    return Object.freeze({ result, receipt, resultDisposition });
  } catch (error) {
    recoverNativeFailure(error, "NATIVE_TRANSACTION_FAILED");
    writeAttempt002FailedHeld();
    throw error;
  }
}

export function executeAttempt002Preflight(...args) {
  if (args.length)
    throw new Error("attempt-002 executor does not accept caller-supplied authority");
  const state = resolveAttempt002State();
  if (!new Set(["OBSERVED", "RESULT_RECORDED", "CLEANING", "FAILED_HELD"]).has(state))
    throw new Error(
      "attempt-002 executor requires OBSERVED, RESULT_RECORDED, CLEANING, or FAILED_HELD state",
    );
  const checkout = verifyAttempt002AuthorityCheckout();
  const runtimeAuthority = readBoundedJson(
    ATTEMPT_002_PATHS.authority,
    ATTEMPT_002_PATHS.root,
    262144,
    "attempt-002 authority",
  );
  if (JSON.stringify(runtimeAuthority) !== JSON.stringify(checkout.authority))
    throw new Error("runtime authority does not match the A2 authority record");
  const manifestRecord = readBoundedJsonRecord(
    ATTEMPT_002_PATHS.toolManifest,
    ATTEMPT_002_PATHS.root,
    262144,
    "attempt-002 tool manifest",
  );
  validateAttempt002ToolManifest(manifestRecord.value);
  const aggregate = readBoundedJson(
    ATTEMPT_002_PATHS.aggregate,
    ATTEMPT_002_PATHS.root,
    262144,
    "attempt-002 aggregate",
  );
  validateSyntheticObservationAggregate(aggregate);
  if (aggregate.authorityDigest !== checkout.digest)
    throw new Error("aggregate authority digest does not match A2");
  let result;
  if (state === "OBSERVED" || (state === "FAILED_HELD" && !existsSync(ATTEMPT_002_PATHS.result))) {
    const inventories = {
      raw: inventoryExactOwnedTree(ATTEMPT_002_PATHS.raw, ATTEMPT_002_PATHS.raw),
      build: inventoryExactOwnedTree(ATTEMPT_002_PATHS.build, ATTEMPT_002_PATHS.build),
    };
    result = attempt002ResultFromAggregate(
      aggregate,
      checkout.authority,
      manifestRecord.digest,
      inventories,
    );
  } else {
    result = readBoundedJson(
      ATTEMPT_002_PATHS.result,
      ATTEMPT_002_PATHS.root,
      262144,
      "attempt-002 sanitized result recovery",
    );
    validateAttempt002Result(result);
    const expected = attempt002ResultFromAggregate(
      aggregate,
      checkout.authority,
      manifestRecord.digest,
      {
        raw: { digest: result.rawInventoryDigest, bytes: BigInt(result.rawBytesBeforeDiscard) },
        build: {
          digest: result.buildInventoryDigest,
          bytes: BigInt(result.buildBytesBeforeDiscard),
        },
      },
    );
    if (JSON.stringify(result) !== JSON.stringify(expected)) {
      throw new Error("attempt-002 recovery result is not byte-identical to aggregate derivation");
    }
  }
  return completeAttempt002CleanupTransaction(result, checkout.digest);
}

export const preflightExecutorTesting = Object.freeze({
  countRawTreeBytes,
  inventoryRawTree,
  assertRealDirectoryChain,
  readBoundedJson,
  readBoundedJsonRecord,
  blockedResult,
  aggregateResult,
  validateSmokeRawInventory,
  assertNoLingeringOwnership,
  inventoryExactOwnedTree,
  attempt002ResultFromAggregate,
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { result, receipt } = executeDiscardedPreflight(...process.argv.slice(2));
    process.stdout.write(
      `${JSON.stringify({
        schema: "fluyo:r4b:preflight-execution-summary:v1",
        evidenceStatus: result.evidenceStatus,
        status: result.status,
        conducted: result.conducted,
        passed: result.passed,
        failed: result.failed,
        blocked: result.blocked,
        requiredUnattempted: result.requiredUnattempted,
        discardStatus: receipt.status,
      })}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : "preflight execution failed"}\n`,
    );
    process.exitCode = 1;
  }
}
