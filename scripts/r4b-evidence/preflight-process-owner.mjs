import { createHash } from "node:crypto";
import { createServer } from "node:net";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

const LOOPBACK = "127.0.0.1";
const MAX_RESPONSE_BYTES = 262144;
const EXECUTABLE_IDENTITY_KEYS = Object.freeze(["absolutePath", "sha256"]);
const OWNERSHIP_RECORD_KEYS = Object.freeze([
  "role",
  "pid",
  "parentPid",
  "executablePathDigest",
  "executableSha256",
  "commandLineSha256",
  "creationTimeUtc",
  "allowedRoot",
]);
const OWNERSHIP_ROLES = new Set([
  "harness-builder",
  "harness-builder-job-helper",
  "web-server",
  "chromedriver",
  "nvda-installer",
  "defender-scanner",
  "nvda-writer",
  "nvda-checker",
  "nvda-stopper",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function within(path, root) {
  const value = relative(resolve(root), resolve(path));
  return value === "" || (!value.startsWith("..") && !isAbsolute(value));
}

export function assertIpv4LoopbackUrl(value) {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== LOOPBACK ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    throw new Error("request URL must use credential-free IPv4 loopback HTTP");
  }
  const port = Number(parsed.port);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("loopback request port is invalid");
  }
  return parsed;
}

export async function allocateInternalLoopbackPort() {
  return await new Promise((accept, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen({ host: LOOPBACK, port: 0, exclusive: true }, () => {
      const address = server.address();
      if (!address || typeof address === "string" || address.address !== LOOPBACK) {
        server.close(() => reject(new Error("port allocator did not bind IPv4 loopback")));
        return;
      }
      server.close((error) => (error ? reject(error) : accept(address.port)));
    });
  });
}

export async function withBoundedTimeout(
  operation,
  timeoutMs,
  label,
  parentSignal,
  maximumTimeoutMs = 120000,
) {
  if (
    !Number.isSafeInteger(maximumTimeoutMs) ||
    maximumTimeoutMs < 1 ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > maximumTimeoutMs
  ) {
    throw new Error(`${label} timeout is outside the closed bound`);
  }
  const controller = new AbortController();
  let rejectCancellation;
  const cancellation = new Promise((_, reject) => {
    rejectCancellation = reject;
  });
  const abort = (reason) => {
    if (!controller.signal.aborted) controller.abort(reason);
    rejectCancellation(reason);
  };
  const abortFromParent = () => abort(parentSignal.reason ?? new Error("attempt aborted"));
  if (parentSignal?.aborted) abortFromParent();
  else parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  const timer = setTimeout(() => abort(new Error(`${label} timed out`)), timeoutMs);
  timer.unref?.();
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      cancellation,
    ]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}

function validateExecutableIdentity(identity) {
  if (
    !identity ||
    JSON.stringify(Object.keys(identity)) !== JSON.stringify(EXECUTABLE_IDENTITY_KEYS) ||
    typeof identity.absolutePath !== "string" ||
    !isAbsolute(identity.absolutePath) ||
    resolve(identity.absolutePath) !== identity.absolutePath ||
    !/^[0-9a-f]{64}$/u.test(identity.sha256 ?? "")
  ) {
    throw new Error("executable identity must be an exact absolutePath and lowercase sha256 pair");
  }
  return identity;
}

export function createExecutableIdentity(absolutePath) {
  if (typeof absolutePath !== "string" || resolve(absolutePath) !== absolutePath) {
    throw new Error("executable identity path must be exact and absolute");
  }
  return Object.freeze({
    absolutePath,
    sha256: sha256(readFileSync(absolutePath)),
  });
}

function freezeExecutableIdentities(identities) {
  if (!Array.isArray(identities)) {
    throw new Error("executable identities must be an array");
  }
  const frozen = identities.map((identity) =>
    Object.freeze(validateExecutableIdentity({ ...identity })),
  );
  const exactPaths = new Set(frozen.map(({ absolutePath }) => absolutePath));
  const foldedPaths = new Set(frozen.map(({ absolutePath }) => absolutePath.toLowerCase()));
  if (exactPaths.size !== frozen.length || foldedPaths.size !== frozen.length) {
    throw new Error("executable identities contain duplicate or case-colliding paths");
  }
  return Object.freeze(frozen);
}

export function createWriteOnceOwnership(rootPids, allowedRoots, executableIdentities = []) {
  if (
    !Array.isArray(rootPids) ||
    rootPids.length === 0 ||
    rootPids.some((pid) => !Number.isSafeInteger(pid) || pid <= 0) ||
    new Set(rootPids).size !== rootPids.length ||
    !Array.isArray(allowedRoots) ||
    allowedRoots.length === 0
  ) {
    throw new Error("write-once process ownership contract is malformed");
  }
  return Object.freeze({
    rootPids: Object.freeze([...rootPids]),
    allowedRoots: Object.freeze([...allowedRoots].map((path) => resolve(path))),
    allowedExecutableIdentities: freezeExecutableIdentities(executableIdentities),
  });
}

function processRecord(snapshot, pid) {
  const record = snapshot.processes.find((entry) => entry.pid === pid);
  if (!record) throw new Error("owned process identity is absent from the exact snapshot");
  return record;
}

function executableSha256(record) {
  if (/^[0-9a-f]{64}$/u.test(record.executableSha256 ?? "")) return record.executableSha256;
  return sha256(readFileSync(record.executablePath));
}

function validOwnershipRole(role) {
  return (
    OWNERSHIP_ROLES.has(role) ||
    /^harness-builder-descendant:[1-9][0-9]*$/u.test(String(role ?? ""))
  );
}

export function validateOwnershipRecordShape(record) {
  if (
    !record ||
    JSON.stringify(Object.keys(record)) !== JSON.stringify(OWNERSHIP_RECORD_KEYS) ||
    !validOwnershipRole(record.role) ||
    !Number.isSafeInteger(record.pid) ||
    record.pid <= 0 ||
    (String(record.role).startsWith("harness-builder-descendant:") &&
      record.role !== `harness-builder-descendant:${record.pid}`) ||
    !Number.isSafeInteger(record.parentPid) ||
    record.parentPid < 0 ||
    !/^[0-9a-f]{64}$/u.test(record.executablePathDigest ?? "") ||
    !/^[0-9a-f]{64}$/u.test(record.executableSha256 ?? "") ||
    !/^[0-9a-f]{64}$/u.test(record.commandLineSha256 ?? "") ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(record.creationTimeUtc) ||
    typeof record.allowedRoot !== "string" ||
    resolve(record.allowedRoot) !== record.allowedRoot
  ) {
    throw new Error("ownership registry record has a noncanonical eight-field shape");
  }
  return record;
}

function ownershipRecord(descriptor, snapshot) {
  if (
    !validOwnershipRole(descriptor.role) ||
    !Number.isSafeInteger(descriptor.pid) ||
    descriptor.pid <= 0 ||
    typeof descriptor.allowedRoot !== "string"
  ) {
    throw new Error("ownership role descriptor is outside the closed registry");
  }
  const process = processRecord(snapshot, descriptor.pid);
  const allowedRoot = resolve(descriptor.allowedRoot);
  if (!within(process.executablePath, allowedRoot)) {
    throw new Error("owned process executable escaped its role root");
  }
  if (
    !Number.isSafeInteger(process.parentPid) ||
    process.parentPid < 0 ||
    typeof process.commandLine !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(process.creationTimeUtc)
  ) {
    throw new Error("owned process identity fields are malformed");
  }
  return Object.freeze(
    validateOwnershipRecordShape({
      role: descriptor.role,
      pid: descriptor.pid,
      parentPid: process.parentPid,
      executablePathDigest: sha256(Buffer.from(resolve(process.executablePath), "utf8")),
      executableSha256: executableSha256(process),
      commandLineSha256: sha256(Buffer.from(process.commandLine, "utf8")),
      creationTimeUtc: process.creationTimeUtc,
      allowedRoot,
    }),
  );
}

export function createImmutableOwnershipRegistry(descriptors, snapshot) {
  if (!Array.isArray(descriptors) || descriptors.length === 0) {
    throw new Error("ownership registry requires at least one fixed role");
  }
  const records = descriptors.map((descriptor) => ownershipRecord(descriptor, snapshot));
  if (
    new Set(records.map((record) => record.role)).size !== records.length ||
    new Set(records.map((record) => record.pid)).size !== records.length
  ) {
    throw new Error("ownership registry roles and PIDs must be unique");
  }
  return Object.freeze(records);
}

function requiresExactExecutableIdentities(registry) {
  return registry.some(
    ({ role }) =>
      role !== "harness-builder" && !String(role).startsWith("harness-builder-descendant:"),
  );
}

function requirePhaseExecutableIdentities(registry, allowedExecutableIdentities) {
  if (
    requiresExactExecutableIdentities(registry) &&
    (!Array.isArray(allowedExecutableIdentities) || allowedExecutableIdentities.length === 0)
  ) {
    throw new Error("attempt-002 process action requires nonempty exact executable identities");
  }
}

export function appendImmutableOwnershipRole(
  registry,
  descriptor,
  snapshot,
  allowedExecutableIdentities = [],
) {
  validateOwnershipRecordIdentities(snapshot, registry);
  const next = ownershipRecord(descriptor, snapshot);
  if (registry.some((record) => record.role === next.role || record.pid === next.pid)) {
    throw new Error("ownership registry is append-only and rejects role or PID replacement");
  }
  const appended = Object.freeze([...registry, next]);
  requirePhaseExecutableIdentities(appended, allowedExecutableIdentities);
  validateImmutableOwnershipRegistry(snapshot, appended, [], allowedExecutableIdentities);
  return appended;
}

function validateOwnershipRecordIdentities(snapshot, registry) {
  if (!Array.isArray(registry) || registry.length === 0 || !Object.isFrozen(registry)) {
    throw new Error("ownership registry must be a nonempty immutable array");
  }
  for (const record of registry) {
    if (!Object.isFrozen(record)) {
      throw new Error("ownership registry record shape or immutability changed");
    }
    validateOwnershipRecordShape(record);
    const current = ownershipRecord(record, snapshot);
    if (JSON.stringify(current) !== JSON.stringify(record)) {
      throw new Error("owned process exact identity changed after registration");
    }
  }
}

export function freezePersistedOwnershipRegistry(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("persisted ownership registry requires at least one record");
  }
  const registry = Object.freeze(
    records.map((record) => Object.freeze(validateOwnershipRecordShape({ ...record }))),
  );
  if (
    new Set(registry.map(({ role }) => role)).size !== registry.length ||
    new Set(registry.map(({ pid }) => pid)).size !== registry.length
  ) {
    throw new Error("persisted ownership registry roles and PIDs must be unique");
  }
  return registry;
}

export function validatePersistedOwnershipRegistry(
  snapshot,
  registry,
  additionalAllowedRoots = [],
) {
  if (!snapshot || !Array.isArray(snapshot.processes) || !Array.isArray(snapshot.sockets)) {
    throw new Error("process/socket snapshot is malformed");
  }
  if (!Object.isFrozen(registry) || registry.length === 0) {
    throw new Error("persisted ownership registry must be immutable and nonempty");
  }
  if (
    !Array.isArray(additionalAllowedRoots) ||
    additionalAllowedRoots.some((path) => typeof path !== "string")
  ) {
    throw new Error("additional owned-process roots are malformed");
  }
  for (const record of registry) {
    validateOwnershipRecordShape(record);
    const current = snapshot.processes.find(({ pid }) => pid === record.pid);
    if (!current) continue;
    const recreated = ownershipRecord(record, snapshot);
    if (JSON.stringify(recreated) !== JSON.stringify(record)) {
      throw new Error("persisted owned process exact identity changed after registration");
    }
  }
  const persistedPids = new Set(registry.map(({ pid }) => pid));
  const livePids = registry
    .filter(({ pid }) => snapshot.processes.some((entry) => entry.pid === pid))
    .map(({ pid }) => pid);
  if (snapshot.sockets.some(({ pid }) => persistedPids.has(pid) && !livePids.includes(pid))) {
    throw new Error("persisted owned socket remains without a live exact identity");
  }
  if (livePids.length) {
    validateOwnedProcessRootsAndSockets(
      snapshot,
      createWriteOnceOwnership(livePids, [
        ...registry.map(({ allowedRoot }) => allowedRoot),
        ...additionalAllowedRoots,
      ]),
    );
  }
  return Object.freeze({
    livePids: Object.freeze([...livePids].sort((a, b) => a - b)),
    persistedPids: Object.freeze([...persistedPids].sort((a, b) => a - b)),
  });
}

export function assertNoPersistedOwnedProcessesOrSockets(snapshot, registry) {
  const persistedPids = new Set(registry.map(({ pid }) => pid));
  if (snapshot.processes.some(({ pid }) => persistedPids.has(pid))) {
    throw new Error("persisted owned process remains after bounded termination");
  }
  if (snapshot.sockets.some(({ pid }) => persistedPids.has(pid))) {
    throw new Error("persisted owned socket remains after bounded termination");
  }
}

export function validateImmutableOwnershipRegistry(
  snapshot,
  registry,
  additionalAllowedRoots = [],
  allowedExecutableIdentities = [],
) {
  validateOwnershipRecordIdentities(snapshot, registry);
  if (
    !Array.isArray(additionalAllowedRoots) ||
    additionalAllowedRoots.some((path) => typeof path !== "string")
  ) {
    throw new Error("additional owned-process roots are malformed");
  }
  const ownership = createWriteOnceOwnership(
    registry.map((record) => record.pid),
    [...registry.map((record) => record.allowedRoot), ...additionalAllowedRoots],
    allowedExecutableIdentities,
  );
  return allowedExecutableIdentities.length
    ? validateOwnedProcessSnapshot(snapshot, ownership)
    : validateOwnedProcessRootsAndSockets(snapshot, ownership);
}

function recursiveOwnedPids(snapshot, ownership) {
  const owned = new Set(ownership.rootPids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of snapshot.processes) {
      if (owned.has(entry.parentPid) && !owned.has(entry.pid)) {
        owned.add(entry.pid);
        changed = true;
      }
    }
  }
  return owned;
}

export async function boundedJsonRequest(url, options = {}) {
  assertIpv4LoopbackUrl(url);
  const { timeoutMs = 10000, parentSignal, ...request } = options;
  return await withBoundedTimeout(
    async (signal) => {
      const response = await fetch(url, { ...request, signal, redirect: "error" });
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > MAX_RESPONSE_BYTES) throw new Error("loopback response exceeds 256 KiB");
      if (!response.ok) throw new Error(`loopback request failed with status ${response.status}`);
      return JSON.parse(bytes.toString("utf8"));
    },
    timeoutMs,
    "loopback request",
    parentSignal,
  );
}

export function validatePerformanceNetworkLog(entries, allowedOrigin) {
  const origin = assertIpv4LoopbackUrl(allowedOrigin).origin;
  let requestCount = 0;
  for (const [index, entry] of entries.entries()) {
    let message;
    try {
      message = JSON.parse(JSON.parse(entry.message).message);
    } catch {
      throw new Error(`network log entry ${index} is not canonical JSON`);
    }
    if (message.method !== "Network.requestWillBeSent") continue;
    requestCount += 1;
    const requested = new URL(message.params.request.url);
    if (
      !["data:", "blob:", "devtools:"].includes(requested.protocol) &&
      requested.origin !== origin
    ) {
      throw new Error("unexpected external egress in fail-closed network log");
    }
  }
  return Object.freeze({ requestCount, unexpectedEgressCount: 0 });
}

function validateOwnedProcessRootsAndSockets(
  snapshot,
  ownership,
  requireExactIdentities = false,
  requireRootProcesses = true,
) {
  if (!snapshot || !Array.isArray(snapshot.processes) || !Array.isArray(snapshot.sockets)) {
    throw new Error("process/socket snapshot is malformed");
  }
  if (
    !ownership ||
    !Array.isArray(ownership.rootPids) ||
    !Array.isArray(ownership.allowedRoots) ||
    !Array.isArray(ownership.allowedExecutableIdentities)
  ) {
    throw new Error("process ownership contract is malformed");
  }
  if (requireExactIdentities && ownership.allowedExecutableIdentities.length === 0) {
    throw new Error("process ownership contract is missing exact executable identities");
  }
  const processes = new Map(snapshot.processes.map((entry) => [entry.pid, entry]));
  const owned = recursiveOwnedPids(snapshot, ownership);
  const observedExecutableDigests = new Map();
  if (requireRootProcesses)
    for (const pid of ownership.rootPids) {
      if (!processes.has(pid)) throw new Error("owned root process is absent or spoofed");
    }
  for (const pid of owned) {
    const entry = processes.get(pid);
    if (!entry && !requireRootProcesses) continue;
    if (
      !entry ||
      !Number.isSafeInteger(entry.pid) ||
      typeof entry.executablePath !== "string" ||
      !ownership.allowedRoots.some((root) => within(entry.executablePath, root))
    ) {
      throw new Error("owned process executable escaped the allowlisted roots");
    }
    if (requireExactIdentities) {
      const absolutePath = resolve(entry.executablePath);
      const identity = ownership.allowedExecutableIdentities.find(
        (candidate) => candidate.absolutePath === absolutePath,
      );
      if (!identity) {
        throw new Error("owned process executable is not an exact allowlisted identity");
      }
      let observedSha256;
      try {
        observedSha256 = observedExecutableDigests.get(absolutePath);
        if (!observedSha256) {
          observedSha256 = sha256(readFileSync(absolutePath));
          observedExecutableDigests.set(absolutePath, observedSha256);
        }
      } catch {
        throw new Error("owned process executable could not be freshly hashed");
      }
      if (observedSha256 !== identity.sha256) {
        throw new Error("owned process executable digest changed from the exact allowlist");
      }
    }
  }
  for (const socket of snapshot.sockets) {
    if (!owned.has(socket.pid)) continue;
    const state = String(socket.State ?? socket.state ?? "").toUpperCase();
    const remote = socket.remoteAddress ?? "";
    const listening = state === "LISTEN";
    const connected = new Set(["ESTABLISHED", "TIMEWAIT", "CLOSEWAIT"]).has(state);
    if (socket.localAddress !== LOOPBACK || (!listening && (!connected || remote !== LOOPBACK))) {
      throw new Error("owned process has a wildcard, LAN, IPv6, proxy, or external socket");
    }
  }
  return Object.freeze({
    ownedPids: Object.freeze([...owned].filter((pid) => processes.has(pid)).sort((a, b) => a - b)),
    socketCount: snapshot.sockets.filter((entry) => owned.has(entry.pid)).length,
  });
}

export function validateOwnedProcessSnapshot(snapshot, ownership) {
  return validateOwnedProcessRootsAndSockets(snapshot, ownership, true);
}

export function assertNoOwnedProcessesOrSockets(snapshot, ownership) {
  const owned = recursiveOwnedPids(snapshot, ownership);
  if (snapshot.processes.some((entry) => owned.has(entry.pid))) {
    throw new Error("owned process remains after bounded termination");
  }
  if (snapshot.sockets.some((entry) => owned.has(entry.pid))) {
    throw new Error("owned socket remains after bounded termination");
  }
}

export function inspectWindowsProcessSocketSnapshot() {
  if (process.platform !== "win32") throw new Error("process/socket inspection requires Windows");
  const script = [
    "$p=Get-CimInstance Win32_Process | Select-Object @{n='pid';e={$_.ProcessId}},@{n='parentPid';e={$_.ParentProcessId}},@{n='executablePath';e={$_.ExecutablePath}},@{n='commandLine';e={$_.CommandLine}},@{n='creationTimeUtc';e={$_.CreationDate.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')}}",
    "$s=Get-NetTCPConnection -ErrorAction SilentlyContinue | Select-Object @{n='pid';e={$_.OwningProcess}},@{n='localAddress';e={$_.LocalAddress}},@{n='remoteAddress';e={$_.RemoteAddress}},State",
    "[pscustomobject]@{processes=$p;sockets=$s}|ConvertTo-Json -Depth 4 -Compress",
  ].join(";");
  const result = spawnSync(
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { encoding: "utf8", timeout: 15000, windowsHide: true },
  );
  if (result.status !== 0 || result.error)
    throw new Error("process/socket inspection failed closed");
  const parsed = JSON.parse(result.stdout);
  return {
    processes: Array.isArray(parsed.processes)
      ? parsed.processes
      : parsed.processes
        ? [parsed.processes]
        : [],
    sockets: Array.isArray(parsed.sockets)
      ? parsed.sockets
      : parsed.sockets
        ? [parsed.sockets]
        : [],
  };
}

export function validateWindowsStandardUserResult(value) {
  if (
    !value ||
    JSON.stringify(Object.keys(value)) !== JSON.stringify(["elevated"]) ||
    value.elevated !== false
  ) {
    throw new Error("attempt-002 requires a non-elevated standard-user process");
  }
  return true;
}

export function assertWindowsStandardUser() {
  if (process.platform !== "win32") throw new Error("standard-user gate requires Windows");
  const script = [
    "$identity=[Security.Principal.WindowsIdentity]::GetCurrent()",
    "$principal=[Security.Principal.WindowsPrincipal]::new($identity)",
    "$elevated=$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)",
    "[pscustomobject]@{elevated=$elevated}|ConvertTo-Json -Compress",
  ].join(";");
  const result = spawnSync(
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { encoding: "utf8", timeout: 10000, windowsHide: true },
  );
  if (result.status !== 0 || result.error) {
    throw new Error("attempt-002 requires a non-elevated standard-user process");
  }
  return validateWindowsStandardUserResult(JSON.parse(result.stdout));
}

export function assertRegisteredIdentityForForcedTermination(
  snapshot,
  registry,
  role,
  pid,
  additionalAllowedRoots = [],
  allowedExecutableIdentities = [],
) {
  requirePhaseExecutableIdentities(registry, allowedExecutableIdentities);
  const record = registry.find((entry) => entry.role === role);
  if (!record || record.pid !== pid) {
    throw new Error("forced termination role does not match the registered PID");
  }
  validateImmutableOwnershipRegistry(
    snapshot,
    registry,
    additionalAllowedRoots,
    allowedExecutableIdentities,
  );
  return record;
}

function exactTerminationOwnership(registry, additionalAllowedRoots, allowedExecutableIdentities) {
  return createWriteOnceOwnership(
    registry.map(({ pid }) => pid),
    [...registry.map(({ allowedRoot }) => allowedRoot), ...additionalAllowedRoots],
    allowedExecutableIdentities,
  );
}

function socketIdentity(socket) {
  return JSON.stringify({
    pid: socket.pid,
    localAddress: socket.localAddress ?? "",
    localPort: socket.localPort ?? "",
    remoteAddress: socket.remoteAddress ?? "",
    remotePort: socket.remotePort ?? "",
    state: String(socket.State ?? socket.state ?? "").toUpperCase(),
  });
}

function captureExactOwnedSet(snapshot, ownership, requireRootProcesses = true) {
  const validated = validateOwnedProcessRootsAndSockets(
    snapshot,
    ownership,
    true,
    requireRootProcesses,
  );
  const pids = new Set(validated.ownedPids);
  return {
    pids,
    sockets: new Set(snapshot.sockets.filter(({ pid }) => pids.has(pid)).map(socketIdentity)),
  };
}

function mergeExactOwnedSets(target, source) {
  for (const pid of source.pids) target.pids.add(pid);
  for (const socket of source.sockets) target.sockets.add(socket);
  return target;
}

export function captureRegisteredOwnedProcessSet(
  snapshot,
  registry,
  role,
  pid,
  additionalAllowedRoots = [],
  allowedExecutableIdentities = [],
) {
  assertRegisteredIdentityForForcedTermination(
    snapshot,
    registry,
    role,
    pid,
    additionalAllowedRoots,
    allowedExecutableIdentities,
  );
  const captured = captureExactOwnedSet(
    snapshot,
    exactTerminationOwnership(registry, additionalAllowedRoots, allowedExecutableIdentities),
  );
  return Object.freeze({
    pids: Object.freeze([...captured.pids].sort((a, b) => a - b)),
    sockets: Object.freeze([...captured.sockets].sort()),
  });
}

export function captureRegisteredOwnedExitSet(
  snapshot,
  registry,
  role,
  pid,
  additionalAllowedRoots = [],
  allowedExecutableIdentities = [],
) {
  const record = registry.find((entry) => entry.role === role);
  if (!record || record.pid !== pid) {
    throw new Error("exit capture requires the exact registered role and PID");
  }
  if (snapshot.processes.some((entry) => entry.pid === pid)) {
    return captureRegisteredOwnedProcessSet(
      snapshot,
      registry,
      role,
      pid,
      additionalAllowedRoots,
      allowedExecutableIdentities,
    );
  }
  const observed = captureExactOwnedSet(
    snapshot,
    exactTerminationOwnership(registry, additionalAllowedRoots, allowedExecutableIdentities),
    false,
  );
  return Object.freeze({
    pids: Object.freeze([...new Set([pid, ...observed.pids])].sort((a, b) => a - b)),
    sockets: Object.freeze(
      [
        ...new Set([
          ...observed.sockets,
          ...snapshot.sockets.filter((socket) => socket.pid === pid).map(socketIdentity),
        ]),
      ].sort(),
    ),
  });
}

export async function proveRegisteredOwnedProcessSetAbsent(
  inspect,
  registry,
  role,
  captured,
  additionalAllowedRoots = [],
  allowedExecutableIdentities = [],
) {
  requirePhaseExecutableIdentities(registry, allowedExecutableIdentities);
  const record = registry.find((entry) => entry.role === role);
  if (!record || typeof inspect !== "function") {
    throw new Error("bounded absence proof requires the exact registered role and inspector");
  }
  if (
    !captured ||
    !Array.isArray(captured.pids) ||
    !Array.isArray(captured.sockets) ||
    !captured.pids.includes(record.pid)
  ) {
    throw new Error("bounded absence proof requires the captured exact owned process set");
  }
  const ownership = exactTerminationOwnership(
    registry,
    additionalAllowedRoots,
    allowedExecutableIdentities,
  );
  const tracked = {
    pids: new Set(captured.pids),
    sockets: new Set(captured.sockets),
  };
  const deadline = Date.now() + 5000;
  let consecutiveAbsent = 0;
  while (Date.now() <= deadline) {
    const snapshot = inspect();
    const currentRoot = snapshot.processes.find(({ pid }) => pid === record.pid);
    if (currentRoot) {
      assertRegisteredIdentityForForcedTermination(
        snapshot,
        registry,
        role,
        record.pid,
        additionalAllowedRoots,
        allowedExecutableIdentities,
      );
    }
    mergeExactOwnedSets(tracked, captureExactOwnedSet(snapshot, ownership, false));
    for (const pid of [...tracked.pids]) {
      if (!snapshot.processes.some((entry) => entry.pid === pid)) continue;
      const reparented = createWriteOnceOwnership(
        [pid],
        ownership.allowedRoots,
        allowedExecutableIdentities,
      );
      mergeExactOwnedSets(tracked, captureExactOwnedSet(snapshot, reparented));
    }
    const liveProcess = snapshot.processes.find(({ pid }) => tracked.pids.has(pid));
    const liveSocket = snapshot.sockets.find(
      (socket) => tracked.pids.has(socket.pid) || tracked.sockets.has(socketIdentity(socket)),
    );
    if (liveProcess && liveProcess.pid !== record.pid) {
      throw new Error("captured or late owned descendant remains after bounded termination");
    }
    if (!liveProcess && !liveSocket) {
      consecutiveAbsent += 1;
      if (consecutiveAbsent === 2) return true;
    } else {
      consecutiveAbsent = 0;
    }
    await new Promise((accept) => setTimeout(accept, 50));
  }
  throw new Error("captured owned process or socket remains after bounded termination");
}

export async function terminateRegisteredOwnedChild(
  child,
  registry,
  role,
  inspect = inspectWindowsProcessSocketSnapshot,
  additionalAllowedRoots = [],
  allowedExecutableIdentities = [],
  initialCaptured = null,
) {
  requirePhaseExecutableIdentities(registry, allowedExecutableIdentities);
  const record = registry.find((entry) => entry.role === role);
  if (!record || record.pid !== child?.pid) {
    throw new Error("termination role does not match the exact registered child");
  }
  if (
    initialCaptured !== null &&
    (!Object.isFrozen(initialCaptured) ||
      !Array.isArray(initialCaptured?.pids) ||
      !Object.isFrozen(initialCaptured.pids) ||
      !Array.isArray(initialCaptured?.sockets) ||
      !Object.isFrozen(initialCaptured.sockets) ||
      !initialCaptured.pids.includes(record.pid))
  ) {
    throw new Error("termination seed must be the immutable captured exact owned process set");
  }
  const captured = {
    pids: new Set(initialCaptured?.pids ?? []),
    sockets: new Set(initialCaptured?.sockets ?? []),
  };
  const beforeSignal = inspect();
  if (child.exitCode !== null || !beforeSignal.processes.some(({ pid }) => pid === record.pid)) {
    const alreadyExitedCapture = captureRegisteredOwnedExitSet(
      beforeSignal,
      registry,
      role,
      record.pid,
      additionalAllowedRoots,
      allowedExecutableIdentities,
    );
    mergeExactOwnedSets(captured, {
      pids: new Set(alreadyExitedCapture.pids),
      sockets: new Set(alreadyExitedCapture.sockets),
    });
    await proveRegisteredOwnedProcessSetAbsent(
      inspect,
      registry,
      role,
      Object.freeze({
        pids: Object.freeze([...captured.pids].sort((a, b) => a - b)),
        sockets: Object.freeze([...captured.sockets].sort()),
      }),
      additionalAllowedRoots,
      allowedExecutableIdentities,
    );
    return "ALREADY_EXITED";
  }
  const beforeGracefulCapture = captureRegisteredOwnedProcessSet(
    beforeSignal,
    registry,
    role,
    child.pid,
    additionalAllowedRoots,
    allowedExecutableIdentities,
  );
  mergeExactOwnedSets(captured, {
    pids: new Set(beforeGracefulCapture.pids),
    sockets: new Set(beforeGracefulCapture.sockets),
  });
  const gracefulExit = new Promise((accept) => child.once("exit", () => accept(true)));
  child.kill();
  const graceful = await Promise.race([
    gracefulExit,
    new Promise((accept) => setTimeout(() => accept(false), 5000)),
  ]);
  let disposition = "GRACEFUL";
  if (!graceful) {
    const beforeForce = inspect();
    if (beforeForce.processes.some(({ pid }) => pid === record.pid)) {
      const refreshed = captureRegisteredOwnedProcessSet(
        beforeForce,
        registry,
        role,
        child.pid,
        additionalAllowedRoots,
        allowedExecutableIdentities,
      );
      mergeExactOwnedSets(captured, {
        pids: new Set(refreshed.pids),
        sockets: new Set(refreshed.sockets),
      });
      const forcedExit = new Promise((accept) => child.once("exit", () => accept(true)));
      if (child.exitCode === null) child.kill("SIGKILL");
      await Promise.race([
        forcedExit,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("owned process did not terminate")), 5000),
        ),
      ]);
      disposition = "FORCED_EXACT_PID";
    } else {
      mergeExactOwnedSets(
        captured,
        captureExactOwnedSet(
          beforeForce,
          exactTerminationOwnership(registry, additionalAllowedRoots, allowedExecutableIdentities),
          false,
        ),
      );
    }
  }
  await proveRegisteredOwnedProcessSetAbsent(
    inspect,
    registry,
    role,
    Object.freeze({
      pids: Object.freeze([...captured.pids].sort((a, b) => a - b)),
      sockets: Object.freeze([...captured.sockets].sort()),
    }),
    additionalAllowedRoots,
    allowedExecutableIdentities,
  );
  return disposition;
}

export const preflightProcessOwnerTesting = Object.freeze({
  LOOPBACK,
  MAX_RESPONSE_BYTES,
  within,
  EXECUTABLE_IDENTITY_KEYS,
  OWNERSHIP_RECORD_KEYS,
  sep,
});
