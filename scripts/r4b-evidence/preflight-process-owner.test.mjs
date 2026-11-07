import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test, { after } from "node:test";

import {
  assertRegisteredIdentityForForcedTermination,
  assertIpv4LoopbackUrl,
  assertNoOwnedProcessesOrSockets,
  assertNoPersistedOwnedProcessesOrSockets,
  appendImmutableOwnershipRole,
  captureRegisteredOwnedProcessSet,
  createExecutableIdentity,
  createImmutableOwnershipRegistry,
  createWriteOnceOwnership,
  freezePersistedOwnershipRegistry,
  terminateRegisteredOwnedChild,
  validateOwnedProcessSnapshot,
  validateImmutableOwnershipRegistry,
  validatePerformanceNetworkLog,
  validatePersistedOwnershipRegistry,
  validateWindowsStandardUserResult,
  withBoundedTimeout,
} from "./preflight-process-owner.mjs";

const fixtureRoot = mkdtempSync(join(tmpdir(), "fluyo-process-owner-"));
const toolsRoot = resolve(fixtureRoot, "tools");
const buildRoot = resolve(fixtureRoot, "build");
const outsideRoot = resolve(fixtureRoot, "outside");
for (const path of [toolsRoot, buildRoot, outsideRoot]) mkdirSync(path, { recursive: true });
const executable = (path, bytes) => {
  writeFileSync(path, bytes);
  return Object.freeze({
    absolutePath: path,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
};
const driverIdentity = executable(resolve(toolsRoot, "driver.exe"), Buffer.from("driver-v1"));
const nodeIdentity = executable(resolve(buildRoot, "node.exe"), Buffer.from("node-v1"));
after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

test("fails closed when the attempt process is elevated or the identity result drifts", () => {
  assert.equal(validateWindowsStandardUserResult({ elevated: false }), true);
  for (const value of [{ elevated: true }, {}, { elevated: false, role: "caller" }, null]) {
    assert.throws(() => validateWindowsStandardUserResult(value), /non-elevated standard-user/u);
  }
});

const ownership = createWriteOnceOwnership(
  [10],
  [toolsRoot, buildRoot],
  [driverIdentity, nodeIdentity],
);
const snapshot = {
  processes: [
    {
      pid: 10,
      parentPid: 1,
      executablePath: driverIdentity.absolutePath,
      executableSha256: driverIdentity.sha256,
      commandLine: "driver --port=fixed",
      creationTimeUtc: "2026-11-02T00:00:00.000Z",
    },
    {
      pid: 11,
      parentPid: 10,
      executablePath: nodeIdentity.absolutePath,
      executableSha256: nodeIdentity.sha256,
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
const driverSnapshot = Object.freeze({
  processes: Object.freeze([snapshot.processes[0]]),
  sockets: Object.freeze([]),
});

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
          processes: [
            { ...snapshot.processes[0], executablePath: resolve(outsideRoot, "node.exe") },
          ],
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

test("accepts driver descendants only when every Chrome PID shares the exact Chrome identity", () => {
  const chromeIdentity = executable(resolve(toolsRoot, "chrome.exe"), Buffer.from("chrome-v1"));
  const chromeTree = {
    processes: [
      snapshot.processes[0],
      {
        ...snapshot.processes[1],
        pid: 20,
        parentPid: 10,
        executablePath: chromeIdentity.absolutePath,
        executableSha256: chromeIdentity.sha256,
      },
      {
        ...snapshot.processes[1],
        pid: 21,
        parentPid: 10,
        executablePath: chromeIdentity.absolutePath,
        executableSha256: chromeIdentity.sha256,
      },
      {
        ...snapshot.processes[1],
        pid: 22,
        parentPid: 20,
        executablePath: chromeIdentity.absolutePath,
        executableSha256: chromeIdentity.sha256,
      },
    ],
    sockets: [],
  };
  const chromeOwnership = createWriteOnceOwnership(
    [10],
    [toolsRoot],
    [driverIdentity, chromeIdentity],
  );
  assert.deepEqual(
    validateOwnedProcessSnapshot(chromeTree, chromeOwnership).ownedPids,
    [10, 20, 21, 22],
  );
  assert.equal(Object.isFrozen(chromeOwnership.allowedExecutableIdentities), true);
  assert.equal(Object.isFrozen(chromeOwnership.allowedExecutableIdentities[0]), true);
});

test("denies six independent in-root helper executables that lack exact identities", () => {
  const helperNames = [
    "chrome_proxy.exe",
    "chrome_pwa_launcher.exe",
    "elevated_tracing_service.exe",
    "elevation_service.exe",
    "notification_helper.exe",
    "setup.exe",
  ];
  for (const [index, helperName] of helperNames.entries()) {
    const helperIdentity = executable(
      resolve(toolsRoot, helperName),
      Buffer.from(`helper-${index}`),
    );
    const helperSnapshot = {
      processes: [
        snapshot.processes[0],
        {
          ...snapshot.processes[1],
          pid: 30 + index,
          parentPid: 10,
          executablePath: helperIdentity.absolutePath,
          executableSha256: helperIdentity.sha256,
        },
      ],
      sockets: [],
    };
    assert.throws(
      () => validateOwnedProcessSnapshot(helperSnapshot, ownership),
      /not an exact allowlisted identity/u,
      helperName,
    );
  }
});

test("fails malformed, missing, duplicate, case-colliding, and byte-drifted identities", () => {
  assert.deepEqual(createExecutableIdentity(driverIdentity.absolutePath), driverIdentity);
  for (const identities of [
    null,
    [{ absolutePath: driverIdentity.absolutePath }],
    [{ absolutePath: "relative.exe", sha256: driverIdentity.sha256 }],
    [{ absolutePath: driverIdentity.absolutePath, sha256: "A".repeat(64) }],
  ]) {
    assert.throws(() => createWriteOnceOwnership([10], [toolsRoot], identities), /identit/u);
  }
  assert.throws(
    () => createWriteOnceOwnership([10], [toolsRoot], [driverIdentity, driverIdentity]),
    /duplicate or case-colliding/u,
  );
  assert.throws(
    () =>
      createWriteOnceOwnership(
        [10],
        [toolsRoot],
        [
          driverIdentity,
          { ...driverIdentity, absolutePath: driverIdentity.absolutePath.toUpperCase() },
        ],
      ),
    /duplicate or case-colliding/u,
  );
  assert.throws(
    () =>
      validateOwnedProcessSnapshot(
        snapshot,
        createWriteOnceOwnership([10], [toolsRoot, buildRoot]),
      ),
    /missing exact executable identities/u,
  );
  assert.throws(
    () =>
      validateOwnedProcessSnapshot(
        snapshot,
        createWriteOnceOwnership(
          [10],
          [toolsRoot, buildRoot],
          [{ ...driverIdentity, sha256: "f".repeat(64) }, nodeIdentity],
        ),
      ),
    /digest changed/u,
  );
});

test("rejects an exact allowed executable identity when its path escapes every root", () => {
  const outsideIdentity = executable(resolve(outsideRoot, "outside.exe"), Buffer.from("outside"));
  const escaped = {
    processes: [
      snapshot.processes[0],
      {
        ...snapshot.processes[1],
        executablePath: outsideIdentity.absolutePath,
        executableSha256: outsideIdentity.sha256,
      },
    ],
    sockets: [],
  };
  assert.throws(
    () =>
      validateOwnedProcessSnapshot(
        escaped,
        createWriteOnceOwnership([10], [toolsRoot], [driverIdentity, outsideIdentity]),
      ),
    /escaped the allowlisted roots/u,
  );
});

test("creates an immutable append-only per-role registry and rejects identity drift", () => {
  const registry = createImmutableOwnershipRegistry(
    [{ role: "chromedriver", pid: 10, allowedRoot: toolsRoot }],
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
    [{ role: "web-server", pid: 11, allowedRoot: buildRoot }][0],
    snapshot,
    ownership.allowedExecutableIdentities,
  );
  assert.deepEqual(
    appended.map(({ role }) => role),
    ["chromedriver", "web-server"],
  );
  assert.throws(
    () =>
      appendImmutableOwnershipRole(
        appended,
        { role: "web-server", pid: 11, allowedRoot: buildRoot },
        snapshot,
        ownership.allowedExecutableIdentities,
      ),
    /append-only/u,
  );
  assert.throws(
    () =>
      appendImmutableOwnershipRole(
        registry,
        { role: "web-server", pid: 11, allowedRoot: buildRoot },
        snapshot,
      ),
    /requires nonempty exact executable identities/u,
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
    [{ role: "chromedriver", pid: 10, allowedRoot: toolsRoot }],
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
      () =>
        assertRegisteredIdentityForForcedTermination(
          reused,
          registry,
          "chromedriver",
          10,
          [],
          [driverIdentity],
        ),
      /identity changed/u,
    );
  }
});

function fakeChild(pid, onKill, exitCode = null) {
  const child = new EventEmitter();
  child.pid = pid;
  child.exitCode = exitCode;
  child.killCalls = [];
  child.kill = (signal) => {
    child.killCalls.push(signal ?? "SIGTERM");
    onKill?.(child, signal);
    return true;
  };
  return child;
}

test("rejects missing identities before signalling and accepts already-exited only when absent", async () => {
  const registry = createImmutableOwnershipRegistry(
    [{ role: "chromedriver", pid: 10, allowedRoot: toolsRoot }],
    driverSnapshot,
  );
  const live = () => driverSnapshot;
  const missing = fakeChild(10);
  await assert.rejects(
    terminateRegisteredOwnedChild(missing, registry, "chromedriver", live),
    /requires nonempty exact executable identities/u,
  );
  assert.deepEqual(missing.killCalls, []);

  const absent = fakeChild(10, null, 0);
  assert.equal(
    await terminateRegisteredOwnedChild(
      absent,
      registry,
      "chromedriver",
      () => ({ processes: [], sockets: [] }),
      [],
      [driverIdentity],
    ),
    "ALREADY_EXITED",
  );
  assert.deepEqual(absent.killCalls, []);

  const reused = fakeChild(10, null, 0);
  await assert.rejects(
    terminateRegisteredOwnedChild(
      reused,
      registry,
      "chromedriver",
      () => ({
        ...driverSnapshot,
        processes: driverSnapshot.processes.map((entry) =>
          entry.pid === 10 ? { ...entry, commandLine: "reused pid" } : entry,
        ),
      }),
      [],
      [driverIdentity],
    ),
    /identity changed/u,
  );
  assert.deepEqual(reused.killCalls, []);

  let ephemeralReuseInspections = 0;
  const ephemeralReuse = fakeChild(10, null, 0);
  await assert.rejects(
    terminateRegisteredOwnedChild(
      ephemeralReuse,
      registry,
      "chromedriver",
      () =>
        ephemeralReuseInspections++ === 0
          ? {
              ...driverSnapshot,
              processes: driverSnapshot.processes.map((entry) => ({
                ...entry,
                commandLine: "ephemeral reused pid",
              })),
            }
          : { processes: [], sockets: [] },
      [],
      [driverIdentity],
    ),
    /identity changed/u,
  );
  assert.deepEqual(ephemeralReuse.killCalls, []);
});

test("validates exact identity before graceful signalling and proves absence afterward", async () => {
  const registry = createImmutableOwnershipRegistry(
    [{ role: "chromedriver", pid: 10, allowedRoot: toolsRoot }],
    driverSnapshot,
  );
  let running = true;
  const child = fakeChild(10, (value) => {
    running = false;
    value.exitCode = 0;
    queueMicrotask(() => value.emit("exit", 0, null));
  });
  assert.equal(
    await terminateRegisteredOwnedChild(
      child,
      registry,
      "chromedriver",
      () => (running ? driverSnapshot : { processes: [], sockets: [] }),
      [],
      [driverIdentity],
    ),
    "GRACEFUL",
  );
  assert.deepEqual(child.killCalls, ["SIGTERM"]);

  const denied = fakeChild(10);
  const deniedSnapshot = {
    ...driverSnapshot,
    processes: driverSnapshot.processes.map((entry) =>
      entry.pid === 10 ? { ...entry, executablePath: resolve(toolsRoot, "cmd.exe") } : entry,
    ),
  };
  await assert.rejects(
    terminateRegisteredOwnedChild(
      denied,
      registry,
      "chromedriver",
      () => deniedSnapshot,
      [],
      [driverIdentity],
    ),
    /identity changed|not an exact allowlisted identity/u,
  );
  assert.deepEqual(denied.killCalls, []);
});

test("rejects a surviving reparented Chrome child captured before graceful termination", async () => {
  const chromeIdentity = executable(
    resolve(toolsRoot, "chrome-survives.exe"),
    Buffer.from("chrome-survives"),
  );
  const tree = {
    processes: [
      driverSnapshot.processes[0],
      {
        ...snapshot.processes[1],
        pid: 41,
        parentPid: 10,
        executablePath: chromeIdentity.absolutePath,
        executableSha256: chromeIdentity.sha256,
        commandLine: "chrome --survives",
      },
    ],
    sockets: [
      {
        pid: 41,
        localAddress: "127.0.0.1",
        remoteAddress: "127.0.0.1",
        State: "Established",
      },
    ],
  };
  const registry = createImmutableOwnershipRegistry(
    [{ role: "chromedriver", pid: 10, allowedRoot: toolsRoot }],
    tree,
  );
  let running = true;
  const child = fakeChild(10, (value) => {
    running = false;
    value.exitCode = 0;
    queueMicrotask(() => value.emit("exit", 0, null));
  });
  await assert.rejects(
    terminateRegisteredOwnedChild(
      child,
      registry,
      "chromedriver",
      () =>
        running
          ? tree
          : {
              processes: [{ ...tree.processes[1], parentPid: 1 }],
              sockets: tree.sockets,
            },
      [],
      [driverIdentity, chromeIdentity],
    ),
    /captured or late owned descendant remains/u,
  );
  assert.deepEqual(child.killCalls, ["SIGTERM"]);
});

test("rejects a late descendant that appears after the root exits", async () => {
  const chromeIdentity = executable(
    resolve(toolsRoot, "chrome-late.exe"),
    Buffer.from("chrome-late"),
  );
  const registry = createImmutableOwnershipRegistry(
    [{ role: "chromedriver", pid: 10, allowedRoot: toolsRoot }],
    driverSnapshot,
  );
  let running = true;
  const child = fakeChild(10, (value) => {
    running = false;
    value.exitCode = 0;
    queueMicrotask(() => value.emit("exit", 0, null));
  });
  const late = {
    processes: [
      {
        ...snapshot.processes[1],
        pid: 42,
        parentPid: 10,
        executablePath: chromeIdentity.absolutePath,
        executableSha256: chromeIdentity.sha256,
        commandLine: "chrome --late",
      },
    ],
    sockets: [],
  };
  await assert.rejects(
    terminateRegisteredOwnedChild(
      child,
      registry,
      "chromedriver",
      () => (running ? driverSnapshot : late),
      [],
      [driverIdentity, chromeIdentity],
    ),
    /captured or late owned descendant remains/u,
  );
  assert.deepEqual(child.killCalls, ["SIGTERM"]);
});

test("preserves the pre-wait capture when the root exits during an error race", async () => {
  const chromeIdentity = executable(
    resolve(toolsRoot, "chrome-timeout-race.exe"),
    Buffer.from("chrome-timeout-race"),
  );
  const initial = {
    processes: [
      driverSnapshot.processes[0],
      {
        ...snapshot.processes[1],
        pid: 43,
        parentPid: 10,
        executablePath: chromeIdentity.absolutePath,
        executableSha256: chromeIdentity.sha256,
        commandLine: "chrome --timeout-race",
      },
    ],
    sockets: [],
  };
  const registry = createImmutableOwnershipRegistry(
    [{ role: "chromedriver", pid: 10, allowedRoot: toolsRoot }],
    initial,
  );
  const captured = captureRegisteredOwnedProcessSet(
    initial,
    registry,
    "chromedriver",
    10,
    [],
    [driverIdentity, chromeIdentity],
  );
  const exited = fakeChild(10, null, 1);
  await assert.rejects(
    terminateRegisteredOwnedChild(
      exited,
      registry,
      "chromedriver",
      () => ({
        processes: [{ ...initial.processes[1], parentPid: 1 }],
        sockets: [],
      }),
      [],
      [driverIdentity, chromeIdentity],
      captured,
    ),
    /captured or late owned descendant remains/u,
  );
  assert.deepEqual(exited.killCalls, []);
});

test("preserves a pre-wait child reparented before graceful termination begins", async () => {
  const chromeIdentity = executable(
    resolve(toolsRoot, "chrome-prewait-reparent.exe"),
    Buffer.from("chrome-prewait-reparent"),
  );
  const initial = {
    processes: [
      driverSnapshot.processes[0],
      {
        ...snapshot.processes[1],
        pid: 44,
        parentPid: 10,
        executablePath: chromeIdentity.absolutePath,
        executableSha256: chromeIdentity.sha256,
        commandLine: "chrome --prewait-reparent",
      },
    ],
    sockets: [],
  };
  const registry = createImmutableOwnershipRegistry(
    [{ role: "chromedriver", pid: 10, allowedRoot: toolsRoot }],
    initial,
  );
  const captured = captureRegisteredOwnedProcessSet(
    initial,
    registry,
    "chromedriver",
    10,
    [],
    [driverIdentity, chromeIdentity],
  );
  let running = true;
  const child = fakeChild(10, (value) => {
    running = false;
    value.exitCode = 0;
    queueMicrotask(() => value.emit("exit", 0, null));
  });
  const reparented = { ...initial.processes[1], parentPid: 1 };
  await assert.rejects(
    terminateRegisteredOwnedChild(
      child,
      registry,
      "chromedriver",
      () => ({
        processes: running ? [initial.processes[0], reparented] : [reparented],
        sockets: [],
      }),
      [],
      [driverIdentity, chromeIdentity],
      captured,
    ),
    /captured or late owned descendant remains/u,
  );
  assert.deepEqual(child.killCalls, ["SIGTERM"]);
});

test("revalidates immediately before forced signalling and proves absence afterward", async () => {
  const registry = createImmutableOwnershipRegistry(
    [{ role: "chromedriver", pid: 10, allowedRoot: toolsRoot }],
    driverSnapshot,
  );
  let running = true;
  const child = fakeChild(10, (value, signal) => {
    if (signal !== "SIGKILL") return;
    running = false;
    value.exitCode = 0;
    queueMicrotask(() => value.emit("exit", 0, null));
  });
  assert.equal(
    await terminateRegisteredOwnedChild(
      child,
      registry,
      "chromedriver",
      () => (running ? driverSnapshot : { processes: [], sockets: [] }),
      [],
      [driverIdentity],
    ),
    "FORCED_EXACT_PID",
  );
  assert.deepEqual(child.killCalls, ["SIGTERM", "SIGKILL"]);

  let inspections = 0;
  const drifted = {
    ...driverSnapshot,
    processes: driverSnapshot.processes.map((entry) =>
      entry.pid === 10 ? { ...entry, creationTimeUtc: "2026-11-02T00:10:00.000Z" } : entry,
    ),
  };
  const drift = fakeChild(10);
  await assert.rejects(
    terminateRegisteredOwnedChild(
      drift,
      registry,
      "chromedriver",
      () => (inspections++ === 0 ? driverSnapshot : drifted),
      [],
      [driverIdentity],
    ),
    /identity changed/u,
  );
  assert.deepEqual(drift.killCalls, ["SIGTERM"]);
});

test("validates persisted eight-field identities independently of an absent root", () => {
  const registry = createImmutableOwnershipRegistry(
    [
      { role: "harness-builder", pid: 10, allowedRoot: toolsRoot },
      {
        role: "harness-builder-descendant:11",
        pid: 11,
        allowedRoot: buildRoot,
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
