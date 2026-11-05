import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRegisteredIdentityForForcedTermination,
  assertIpv4LoopbackUrl,
  assertNoOwnedProcessesOrSockets,
  assertNoPersistedOwnedProcessesOrSockets,
  appendImmutableOwnershipRole,
  createImmutableOwnershipRegistry,
  createWriteOnceOwnership,
  freezePersistedOwnershipRegistry,
  validateOwnedProcessSnapshot,
  validateImmutableOwnershipRegistry,
  validatePerformanceNetworkLog,
  validatePersistedOwnershipRegistry,
  validateWindowsStandardUserResult,
  withBoundedTimeout,
} from "./preflight-process-owner.mjs";

test("fails closed when the attempt process is elevated or the identity result drifts", () => {
  assert.equal(validateWindowsStandardUserResult({ elevated: false }), true);
  for (const value of [{ elevated: true }, {}, { elevated: false, role: "caller" }, null]) {
    assert.throws(() => validateWindowsStandardUserResult(value), /non-elevated standard-user/u);
  }
});

const ownership = createWriteOnceOwnership([10], ["C:\\fixed\\tools", "C:\\fixed\\build"]);
const snapshot = {
  processes: [
    {
      pid: 10,
      parentPid: 1,
      executablePath: "C:\\fixed\\tools\\driver.exe",
      executableSha256: "a".repeat(64),
      commandLine: "driver --port=fixed",
      creationTimeUtc: "2026-11-02T00:00:00.000Z",
    },
    {
      pid: 11,
      parentPid: 10,
      executablePath: "C:\\fixed\\build\\node.exe",
      executableSha256: "b".repeat(64),
      commandLine: "node fixed.js",
      creationTimeUtc: "2026-11-02T00:00:01.000Z",
    },
  ],
  sockets: [
    {
      pid: 11,
      localAddress: "127.0.0.1",
      remoteAddress: "127.0.0.1",
      State: "Established",
    },
  ],
};

test("accepts only credential-free IPv4 loopback and fail-closes network logs", () => {
  assert.equal(assertIpv4LoopbackUrl("http://127.0.0.1:41000/fixture").hostname, "127.0.0.1");
  for (const url of [
    "http://localhost:41000/",
    "http://[::1]:41000/",
    "http://0.0.0.0:41000/",
    "http://192.168.1.2:41000/",
    "http://user:pass@127.0.0.1:41000/",
  ])
    assert.throws(() => assertIpv4LoopbackUrl(url), /IPv4 loopback/u);
  const entry = (url) => ({
    message: JSON.stringify({
      message: JSON.stringify({
        method: "Network.requestWillBeSent",
        params: { request: { url } },
      }),
    }),
  });
  assert.deepEqual(
    validatePerformanceNetworkLog([entry("http://127.0.0.1:41000/a")], "http://127.0.0.1:41000"),
    { requestCount: 1, unexpectedEgressCount: 0 },
  );
  assert.throws(
    () =>
      validatePerformanceNetworkLog([entry("https://example.test/a")], "http://127.0.0.1:41000"),
    /external egress/u,
  );
  assert.throws(
    () =>
      validateOwnedProcessSnapshot(
        { ...snapshot, sockets: [{ ...snapshot.sockets[0], State: "Bound" }] },
        ownership,
      ),
    /external socket/u,
  );
  assert.throws(() => ownership.rootPids.push(12), TypeError);
  assert.throws(
    () => validatePerformanceNetworkLog([{ message: "{" }], "http://127.0.0.1:41000"),
    /canonical JSON/u,
  );
});

test("binds the exact process tree and rejects spoofed owners or socket drift", () => {
  assert.deepEqual(validateOwnedProcessSnapshot(snapshot, ownership).ownedPids, [10, 11]);
  assert.throws(
    () =>
      validateOwnedProcessSnapshot(
        { ...snapshot, processes: snapshot.processes.slice(1) },
        ownership,
      ),
    /absent or spoofed/u,
  );
  assert.throws(
    () =>
      validateOwnedProcessSnapshot(
        {
          ...snapshot,
          processes: [{ ...snapshot.processes[0], executablePath: "C:\\Windows\\node.exe" }],
        },
        ownership,
      ),
    /escaped/u,
  );
  assert.throws(
    () =>
      validateOwnedProcessSnapshot(
        { ...snapshot, sockets: [{ ...snapshot.sockets[0], remoteAddress: "8.8.8.8" }] },
        ownership,
      ),
    /external socket/u,
  );
  assert.doesNotThrow(() =>
    assertNoOwnedProcessesOrSockets({ processes: [], sockets: [] }, ownership),
  );
  assert.throws(() => assertNoOwnedProcessesOrSockets(snapshot, ownership), /remains/u);
});

test("creates an immutable append-only per-role registry and rejects identity drift", () => {
  const registry = createImmutableOwnershipRegistry(
    [{ role: "chromedriver", pid: 10, allowedRoot: "C:\\fixed\\tools" }],
    snapshot,
  );
  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry[0]), true);
  assert.deepEqual(Object.keys(registry[0]), [
    "role",
    "pid",
    "parentPid",
    "executablePathDigest",
    "executableSha256",
    "commandLineSha256",
    "creationTimeUtc",
    "allowedRoot",
  ]);
  const appended = appendImmutableOwnershipRole(
    registry,
    [{ role: "web-server", pid: 11, allowedRoot: "C:\\fixed\\build" }][0],
    snapshot,
  );
  assert.deepEqual(
    appended.map(({ role }) => role),
    ["chromedriver", "web-server"],
  );
  assert.throws(
    () =>
      appendImmutableOwnershipRole(
        appended,
        { role: "web-server", pid: 11, allowedRoot: "C:\\fixed\\build" },
        snapshot,
      ),
    /append-only/u,
  );
  const drift = {
    ...snapshot,
    processes: snapshot.processes.map((entry) =>
      entry.pid === 10 ? { ...entry, commandLine: "driver --changed" } : entry,
    ),
  };
  assert.throws(() => validateImmutableOwnershipRegistry(drift, appended), /identity changed/u);
});

test("refuses forced termination after PID reuse or exact identity drift", () => {
  const registry = createImmutableOwnershipRegistry(
    [{ role: "chromedriver", pid: 10, allowedRoot: "C:\\fixed\\tools" }],
    snapshot,
  );
  for (const replacement of [
    { commandLine: "replacement --same-pid" },
    { creationTimeUtc: "2026-11-02T00:01:00.000Z" },
    { executableSha256: "f".repeat(64) },
    { parentPid: 99 },
  ]) {
    const reused = {
      ...snapshot,
      processes: snapshot.processes.map((entry) =>
        entry.pid === 10 ? { ...entry, ...replacement } : entry,
      ),
    };
    assert.throws(
      () => assertRegisteredIdentityForForcedTermination(reused, registry, "chromedriver", 10),
      /identity changed/u,
    );
  }
});

test("validates persisted eight-field identities independently of an absent root", () => {
  const registry = createImmutableOwnershipRegistry(
    [
      { role: "harness-builder", pid: 10, allowedRoot: "C:\\fixed\\tools" },
      {
        role: "harness-builder-descendant:11",
        pid: 11,
        allowedRoot: "C:\\fixed\\build",
      },
    ],
    snapshot,
  );
  const orphanedGrandchild = {
    processes: [snapshot.processes[1]],
    sockets: snapshot.sockets,
  };
  assert.deepEqual(validatePersistedOwnershipRegistry(orphanedGrandchild, registry).livePids, [11]);
  assert.throws(
    () => assertNoPersistedOwnedProcessesOrSockets(orphanedGrandchild, registry),
    /persisted owned process remains/u,
  );
  assert.doesNotThrow(() =>
    assertNoPersistedOwnedProcessesOrSockets({ processes: [], sockets: [] }, registry),
  );
  for (const malformed of [
    { ...registry[0], extra: true },
    { ...registry[0], commandLineSha256: "f" },
    { ...registry[0], role: "caller" },
  ]) {
    assert.throws(() => freezePersistedOwnershipRegistry([malformed]), /eight-field shape/u);
  }
});

test("cancels operations at the closed timeout", async () => {
  await assert.rejects(
    withBoundedTimeout(() => new Promise(() => {}), 5, "signal-ignoring operation"),
    /timed out/u,
  );
  await assert.rejects(
    withBoundedTimeout(
      (signal) =>
        new Promise((_, reject) =>
          signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
        ),
      5,
      "test operation",
    ),
    /timed out/u,
  );
  await assert.rejects(
    withBoundedTimeout(async () => true, 120001, "test operation"),
    /outside/u,
  );
});
