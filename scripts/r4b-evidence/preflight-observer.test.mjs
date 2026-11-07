import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { Script } from "node:vm";
import {
  assertProductionFixtureBoundaryEligible,
  canonicalPreparationClosureDigest,
  contextualSemanticContrastPairs,
  effectiveRgbaWithOpacity,
  executePreparationDispositionTransaction,
  fillUnattemptedObservationStatuses,
  fixturePresentation,
  focusContrastAgainstExposedSurface,
  nativeRadioArrowModel,
  nativeSequentialFocusModel,
  preparationTransactionDisposition,
  preflightPageAuditScriptForTesting,
  reconstructObserverOwnership,
  proveFailedSpawnRegistrationAbsent,
  resolveAccessibleNameEvidence,
  rgbaContrastRatio,
  validateRtlNotchGeometry,
  validateHarnessQueryProofResponses,
  validateInertClientBoundaryProbe,
  validateLongContentReflow,
  validatePreparationManifestAuthorityBinding,
  validatePreparationProcessSnapshot,
  validateObservationTransactionTrace,
  validateRepresentativeFocusFixture,
  spawnAndRegisterPreparationProcessForTesting,
  waitForOwnedExitForTesting,
} from "./preflight-observer.mjs";
import { createExecutableIdentity } from "./preflight-process-owner.mjs";
import { createDiscardedPreflightPlan } from "./preflight-plan.mjs";

function fakeProcess(
  pid,
  parentPid,
  executablePath = process.execPath,
  creationTimeUtc = new Date().toISOString(),
) {
  return { pid, parentPid, executablePath, commandLine: executablePath, creationTimeUtc };
}

function frozenProcessRecord(entry) {
  return Object.freeze({
    pid: entry.pid,
    parentPid: entry.parentPid,
    creationTimeUtc: entry.creationTimeUtc,
    executablePath: resolve(entry.executablePath),
    executableSha256: createExecutableIdentity(entry.executablePath).sha256,
  });
}

function frozenLaunchClosure(root, records = [], sockets = []) {
  return Object.freeze({
    rootPid: root.pid,
    expectedRootIdentity: Object.freeze(createExecutableIdentity(root.executablePath)),
    launchTimeMs: Date.parse(root.creationTimeUtc),
    records: Object.freeze(records.map((record) => Object.freeze(record))),
    pids: Object.freeze(records.map(({ pid }) => pid).sort((left, right) => left - right)),
    sockets: Object.freeze([...sockets]),
  });
}

test("preserves Node, driver, Chrome, and future NVDA identities across reconstruction", () => {
  const root = mkdtempSync(join(tmpdir(), "fluyo-observer-identities-"));
  try {
    const node = resolve(root, "node", "node.exe");
    const driver = resolve(root, "driver", "chromedriver.exe");
    const chrome = resolve(root, "chrome", "chrome.exe");
    const nvda = resolve(root, "nvda", "nvda.exe");
    for (const path of [node, driver, chrome, nvda]) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, Buffer.from(`identity:${path}`));
    }

    const web = reconstructObserverOwnership(null, [10], [dirname(node)], [node]);
    const browser = reconstructObserverOwnership(
      web,
      [10, 20],
      [dirname(node), dirname(driver), dirname(chrome)],
      [driver, chrome],
    );
    const browserIdentities = browser.allowedExecutableIdentities.map(
      ({ absolutePath }) => absolutePath,
    );
    assert.deepEqual(browserIdentities, [node, driver, chrome]);
    assert.equal(Object.isFrozen(browser.allowedExecutableIdentities), true);
    assert.equal(Object.isFrozen(browser.allowedExecutableIdentities[2]), true);

    const withNvda = reconstructObserverOwnership(
      browser,
      [10, 20, 30],
      [...browser.allowedRoots, dirname(nvda)],
      [nvda, chrome],
    );
    assert.deepEqual(
      withNvda.allowedExecutableIdentities.slice(0, 3),
      browser.allowedExecutableIdentities,
    );
    assert.deepEqual(
      withNvda.allowedExecutableIdentities.map(({ absolutePath }) => absolutePath),
      [node, driver, chrome, nvda],
    );

    writeFileSync(chrome, Buffer.from("changed chrome bytes"));
    assert.throws(
      () =>
        reconstructObserverOwnership(withNvda, withNvda.rootPids, withNvda.allowedRoots, [chrome]),
      /identity changed during ownership reconstruction/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("closes preparation digests, A2 manifest binding, and transaction disposition without launch", () => {
  const identityDigest = "1".repeat(64);
  const capturedSetDigest = "2".repeat(64);
  const installer = canonicalPreparationClosureDigest(
    "nvda-installer",
    identityDigest,
    capturedSetDigest,
    "PASS",
  );
  assert.match(installer, /^[0-9a-f]{64}$/u);
  assert.notEqual(
    installer,
    canonicalPreparationClosureDigest(
      "defender-scanner",
      identityDigest,
      capturedSetDigest,
      "PASS",
    ),
  );
  for (const invalid of [
    ["other", identityDigest, capturedSetDigest, "PASS"],
    ["nvda-installer", "x", capturedSetDigest, "PASS"],
    ["nvda-installer", identityDigest, "x", "PASS"],
    ["nvda-installer", identityDigest, capturedSetDigest, "FAIL"],
  ]) {
    assert.throws(() => canonicalPreparationClosureDigest(...invalid), /closure/u);
  }
  assert.equal(validatePreparationManifestAuthorityBinding(identityDigest, identityDigest), true);
  assert.throws(
    () => validatePreparationManifestAuthorityBinding(identityDigest, capturedSetDigest),
    /immutable A2 authority/u,
  );
  assert.equal(preparationTransactionDisposition("BUILD_READY"), "PREPARE");
  assert.equal(preparationTransactionDisposition("PREPARED"), "VALIDATE_ONLY");
  for (const state of ["NOT_STARTED", "PREPARING", "OBSERVING", "FAILED_HELD"]) {
    assert.throws(() => preparationTransactionDisposition(state), /BUILD_READY or PREPARED/u);
  }
});

test("proves registration-failure descendants and sockets absent without launching", async () => {
  const rootRecord = fakeProcess(50, 1);
  const descendantRecord = fakeProcess(51, 50);
  const nestedRecord = fakeProcess(52, 51);
  const snapshots = [
    {
      processes: [rootRecord, descendantRecord, nestedRecord],
      sockets: [{ pid: 52, localAddress: "127.0.0.1", localPort: 4000 }],
    },
    { processes: [{ ...nestedRecord, parentPid: 1 }], sockets: [] },
    { processes: [], sockets: [] },
    { processes: [], sockets: [] },
  ];
  const terminated = [];
  const child = { pid: 50, exitCode: null, kill: () => assert.fail("child.kill is PID-only") };
  const captured = await proveFailedSpawnRegistrationAbsent(
    child,
    () => snapshots.shift(),
    frozenLaunchClosure(rootRecord),
    (pid) => terminated.push(pid),
  );
  assert.deepEqual(terminated, [52, 51, 50, 52]);
  assert.deepEqual(captured.pids, [50, 51, 52]);
  assert.equal(captured.sockets.length, 1);

  const exitedSnapshots = [
    { processes: [], sockets: [] },
    { processes: [], sockets: [] },
    { processes: [], sockets: [] },
  ];
  await proveFailedSpawnRegistrationAbsent(
    { pid: 60, exitCode: 1, kill: () => assert.fail("exited root must not be killed") },
    () => exitedSnapshots.shift(),
    frozenLaunchClosure(fakeProcess(60, 1)),
    () => {},
  );
});

test("accumulates registration closure, kills roots on inspection failure, and terminates survivors", async () => {
  const root = mkdtempSync(join(tmpdir(), "fluyo-prep-registration-"));
  try {
    const executable = resolve(root, "installer.exe");
    const defender = resolve(root, "defender.exe");
    writeFileSync(executable, Buffer.from("exact installer"));
    writeFileSync(defender, Buffer.from("exact defender"));
    const identities = Object.freeze([createExecutableIdentity(executable)]);
    const normalRoot = fakeProcess(40, 1, executable);
    const noisyGlobalSnapshot = {
      processes: [
        { pid: 0, parentPid: null, executablePath: null },
        { pid: 900, parentPid: null, executablePath: resolve(root, "protected.exe") },
        { pid: 901, parentPid: 1, executablePath: resolve(root, "unreadable-a.exe") },
        { pid: 901, parentPid: 2, executablePath: resolve(root, "unreadable-b.exe") },
        normalRoot,
      ],
      sockets: [],
    };
    const normal = await spawnAndRegisterPreparationProcessForTesting(
      executable,
      [],
      {},
      { role: "nvda-installer", allowedRoot: root },
      identities,
      {
        spawnProcess: () => ({ pid: 40, exitCode: null, kill: () => assert.fail("normal kill") }),
        inspect: () => noisyGlobalSnapshot,
        waitForRegistration: async (_registry, descriptor, _identities, observe) => {
          observe(noisyGlobalSnapshot);
          return Object.freeze([Object.freeze(descriptor)]);
        },
      },
    );
    assert.equal(normal.registry[0].pid, 40);
    assert.deepEqual(normal.registrationCapture.pids, [40]);
    assert.equal(normal.registrationCapture.records[0].executableSha256, identities[0].sha256);
    const child = { pid: 50, exitCode: null, kill: () => assert.fail("PID-only root kill") };
    const failedRoot = fakeProcess(50, 1, executable);
    const failedDescendant = fakeProcess(51, 50, executable);
    const immediate = {
      processes: [failedRoot, failedDescendant],
      sockets: [{ pid: 51, localAddress: "127.0.0.1", localPort: 5000 }],
    };
    const reparented = {
      processes: [{ ...failedDescendant, parentPid: 1 }],
      sockets: [{ pid: 51, localAddress: "127.0.0.1", localPort: 5000 }],
    };
    const snapshots = [
      immediate,
      reparented,
      reparented,
      { processes: [], sockets: [] },
      { processes: [], sockets: [] },
    ];
    const terminated = [];
    await assert.rejects(
      spawnAndRegisterPreparationProcessForTesting(
        executable,
        [],
        {},
        { role: "nvda-installer", allowedRoot: root },
        identities,
        {
          spawnProcess: () => child,
          inspect: () => snapshots.shift(),
          waitForRegistration: async (_registry, _descriptor, _identities, observe) => {
            observe(reparented);
            throw new Error("identity rejection");
          },
          terminatePid: (pid) => terminated.push(pid),
        },
      ),
      /identity rejection/u,
    );
    assert.deepEqual(terminated, [51, 51]);

    let inspection = 0;
    const inspectionRoot = fakeProcess(60, 1, executable);
    const inspectionTerminated = [];
    await assert.rejects(
      spawnAndRegisterPreparationProcessForTesting(
        executable,
        [],
        {},
        { role: "defender-scanner", allowedRoot: root },
        identities,
        {
          spawnProcess: () => ({
            pid: 60,
            exitCode: null,
            kill: () => assert.fail("PID-only root kill"),
          }),
          inspect: () => {
            inspection += 1;
            if (inspection === 1) throw new Error("inspection failed");
            if (inspection === 2) return { processes: [inspectionRoot], sockets: [] };
            return { processes: [], sockets: [] };
          },
          waitForRegistration: async () => {
            throw new Error("must not register after inspection failure");
          },
          terminatePid: (pid) => inspectionTerminated.push(pid),
        },
      ),
      /inspection failed/u,
    );
    assert.deepEqual(inspectionTerminated, [60]);

    const timeoutRoot = fakeProcess(70, 1, executable);
    const timeoutDescendant = fakeProcess(71, 70, executable);
    const timeoutSnapshots = [
      { processes: [timeoutRoot], sockets: [] },
      {
        processes: [timeoutRoot, timeoutDescendant],
        sockets: [{ pid: 71, localPort: 7000 }],
      },
      {
        processes: [{ ...timeoutDescendant, parentPid: 1 }],
        sockets: [{ pid: 71, localPort: 7000 }],
      },
      { processes: [], sockets: [] },
      { processes: [], sockets: [] },
    ];
    const timeoutTerminated = [];
    await assert.rejects(
      spawnAndRegisterPreparationProcessForTesting(
        executable,
        [],
        {},
        { role: "nvda-installer", allowedRoot: root },
        identities,
        {
          spawnProcess: () => ({
            pid: 70,
            exitCode: null,
            kill: () => assert.fail("PID-only root kill"),
          }),
          inspect: () => timeoutSnapshots.shift(),
          waitForRegistration: async () => {
            throw new Error("registration timeout");
          },
          terminatePid: (pid) => timeoutTerminated.push(pid),
        },
      ),
      /registration timeout/u,
    );
    assert.deepEqual(timeoutTerminated, [71, 70, 71]);

    for (const [path, role, original] of [
      [executable, "nvda-installer", identities[0]],
      [defender, "defender-scanner", createExecutableIdentity(defender)],
    ]) {
      writeFileSync(path, Buffer.from(`changed ${role}`));
      let spawnCount = 0;
      await assert.rejects(
        spawnAndRegisterPreparationProcessForTesting(
          path,
          [],
          {},
          { role, allowedRoot: root },
          Object.freeze([original]),
          { spawnProcess: () => (spawnCount += 1) },
        ),
        /identity changed before spawn/u,
      );
      assert.equal(spawnCount, 0);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reconciles different-executable descendants only through exact same-snapshot parents", async () => {
  const root = mkdtempSync(join(tmpdir(), "fluyo-owned-bfs-"));
  try {
    const rootExecutable = resolve(root, "installer.exe");
    const childExecutable = resolve(root, "worker.exe");
    const grandchildExecutable = resolve(root, "helper.exe");
    const outsideExecutable = resolve(dirname(root), `${basename(root)}-outside.exe`);
    writeFileSync(rootExecutable, Buffer.from("root executable"));
    writeFileSync(childExecutable, Buffer.from("child executable"));
    writeFileSync(grandchildExecutable, Buffer.from("grandchild executable"));
    writeFileSync(outsideExecutable, Buffer.from("outside executable"));
    const identities = Object.freeze([createExecutableIdentity(rootExecutable)]);
    const rootEntry = fakeProcess(140, 1, rootExecutable);
    const childEntry = fakeProcess(141, 140, childExecutable);
    const reparentedChild = { ...childEntry, parentPid: 1 };
    const grandchildEntry = fakeProcess(142, 141, grandchildExecutable);
    const first = { processes: [rootEntry, childEntry], sockets: [] };
    const second = {
      processes: [rootEntry, reparentedChild, grandchildEntry],
      sockets: [{ pid: 142, localAddress: "127.0.0.1", localPort: 4142 }],
    };
    const captured = await spawnAndRegisterPreparationProcessForTesting(
      rootExecutable,
      [],
      {},
      { role: "nvda-installer", allowedRoot: root },
      identities,
      {
        spawnProcess: () => ({ pid: 140, exitCode: null }),
        inspect: () => first,
        waitForRegistration: async (_registry, descriptor, _identities, observe) => {
          observe(second);
          return Object.freeze([Object.freeze(descriptor)]);
        },
      },
    );
    assert.deepEqual(captured.registrationCapture.pids, [140, 141, 142]);
    assert.deepEqual(
      captured.executableIdentities.map(({ absolutePath }) => absolutePath),
      [rootExecutable, childExecutable, grandchildExecutable],
    );
    assert.equal(captured.registrationCapture.sockets.length, 1);

    const staleRoot = fakeProcess(150, 1, rootExecutable);
    const staleChild = fakeProcess(151, 150, childExecutable);
    const stale = await spawnAndRegisterPreparationProcessForTesting(
      rootExecutable,
      [],
      {},
      { role: "nvda-installer", allowedRoot: root },
      identities,
      {
        spawnProcess: () => ({ pid: 150, exitCode: null }),
        inspect: () => ({ processes: [staleRoot], sockets: [] }),
        waitForRegistration: async (_registry, descriptor, _identities, observe) => {
          observe({ processes: [staleChild], sockets: [] });
          return Object.freeze([Object.freeze(descriptor)]);
        },
      },
    );
    assert.deepEqual(stale.registrationCapture.pids, [150]);

    const escapedRoot = fakeProcess(160, 1, rootExecutable);
    const escapedChild = fakeProcess(161, 160, outsideExecutable);
    const escapedSnapshots = [
      { processes: [escapedRoot, escapedChild], sockets: [] },
      { processes: [], sockets: [] },
      { processes: [], sockets: [] },
    ];
    const terminated = [];
    await assert.rejects(
      spawnAndRegisterPreparationProcessForTesting(
        rootExecutable,
        [],
        {},
        { role: "nvda-installer", allowedRoot: root },
        identities,
        {
          spawnProcess: () => ({ pid: 160, exitCode: null }),
          inspect: () => escapedSnapshots.shift(),
          waitForRegistration: async () => assert.fail("escaped child registered"),
          terminatePid: (pid) => terminated.push(pid),
        },
      ),
      /escaped the frozen allowed root/u,
    );
    assert.deepEqual(terminated, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(resolve(dirname(root), `${basename(root)}-outside.exe`), { force: true });
  }
});

test("never terminates recycled root or descendant PIDs with changed immutable identities", async () => {
  const root = mkdtempSync(join(tmpdir(), "fluyo-pid-reuse-"));
  try {
    const originalPath = resolve(root, "owned.exe");
    const reusedPath = resolve(root, "reused.exe");
    writeFileSync(originalPath, Buffer.from("original bytes"));
    writeFileSync(reusedPath, Buffer.from("reused bytes"));
    const originalRoot = fakeProcess(50, 1, originalPath);
    const originalDescendant = fakeProcess(51, 50, originalPath);
    const seed = frozenLaunchClosure(originalRoot, [
      frozenProcessRecord(originalRoot),
      frozenProcessRecord(originalDescendant),
    ]);
    const recycled = {
      processes: [
        fakeProcess(50, 1, reusedPath, "2026-11-07T01:00:00.000Z"),
        fakeProcess(51, 50, reusedPath, "2026-11-07T01:00:01.000Z"),
      ],
      sockets: [],
    };
    const snapshots = [recycled, recycled];
    const terminated = [];
    await proveFailedSpawnRegistrationAbsent(
      { pid: 50, exitCode: null, kill: () => assert.fail("PID-only root kill") },
      () => snapshots.shift(),
      seed,
      (pid) => terminated.push(pid),
    );
    assert.deepEqual(terminated, []);

    writeFileSync(originalPath, Buffer.from("changed hash at same path"));
    const samePidPathTimeChangedHash = {
      processes: [originalRoot, originalDescendant],
      sockets: [],
    };
    const changedSnapshots = [samePidPathTimeChangedHash, samePidPathTimeChangedHash];
    await assert.rejects(
      proveFailedSpawnRegistrationAbsent(
        { pid: 50, exitCode: null, kill: () => assert.fail("changed hash root kill") },
        () => changedSnapshots.shift(),
        seed,
        (pid) => terminated.push(pid),
      ),
      /HOLD: captured owned root executable bytes changed/u,
    );
    assert.deepEqual(terminated, []);

    rmSync(originalPath, { force: true });
    const unreadableSnapshots = [samePidPathTimeChangedHash, samePidPathTimeChangedHash];
    await assert.rejects(
      proveFailedSpawnRegistrationAbsent(
        { pid: 50, exitCode: null, kill: () => assert.fail("unreadable root kill") },
        () => unreadableSnapshots.shift(),
        seed,
        (pid) => terminated.push(pid),
      ),
      /HOLD: captured owned root executable bytes are unreadable/u,
    );
    assert.deepEqual(terminated, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed on unreadable or pre-inspection reused roots and binds registration records", async () => {
  const root = mkdtempSync(join(tmpdir(), "fluyo-registration-binding-"));
  try {
    const expectedPath = resolve(root, "expected.exe");
    const reusedPath = resolve(root, "reused.exe");
    const missingPath = resolve(root, "missing.exe");
    writeFileSync(expectedPath, Buffer.from("expected executable"));
    writeFileSync(reusedPath, Buffer.from("reused executable"));
    const identities = Object.freeze([createExecutableIdentity(expectedPath)]);

    for (const [, pid, firstSnapshot, errorPattern] of [
      [
        "reused",
        90,
        { processes: [fakeProcess(90, 1, reusedPath)], sockets: [] },
        /launch identity/u,
      ],
      [
        "unreadable",
        91,
        { processes: [fakeProcess(91, 1, missingPath)], sockets: [] },
        /launch identity/u,
      ],
      [
        "malformed-root",
        92,
        { processes: [{ ...fakeProcess(92, 1, expectedPath), parentPid: null }], sockets: [] },
        /identity is malformed/u,
      ],
      [
        "duplicate-root",
        93,
        {
          processes: [fakeProcess(93, 1, expectedPath), fakeProcess(93, 2, expectedPath)],
          sockets: [],
        },
        /ambiguous duplicate PID/u,
      ],
    ]) {
      const snapshots = [
        firstSnapshot,
        { processes: [], sockets: [] },
        { processes: [], sockets: [] },
      ];
      const terminated = [];
      await assert.rejects(
        spawnAndRegisterPreparationProcessForTesting(
          expectedPath,
          [],
          {},
          { role: "nvda-installer", allowedRoot: root },
          identities,
          {
            spawnProcess: () => ({ pid, exitCode: null }),
            inspect: () => snapshots.shift(),
            waitForRegistration: async () => assert.fail("mismatched root registered"),
            terminatePid: (terminatedPid) => terminated.push(terminatedPid),
          },
        ),
        errorPattern,
      );
      assert.deepEqual(terminated, []);
    }

    const ownedRoot = fakeProcess(94, 1, expectedPath);
    const ownedMalformedChild = {
      ...fakeProcess(95, 94, expectedPath),
      executablePath: null,
    };
    const ownedSnapshots = [
      { processes: [ownedRoot, ownedMalformedChild], sockets: [] },
      { processes: [], sockets: [] },
      { processes: [], sockets: [] },
    ];
    await assert.rejects(
      spawnAndRegisterPreparationProcessForTesting(
        expectedPath,
        [],
        {},
        { role: "nvda-installer", allowedRoot: root },
        identities,
        {
          spawnProcess: () => ({ pid: 94, exitCode: null }),
          inspect: () => ownedSnapshots.shift(),
          waitForRegistration: async () => assert.fail("malformed descendant registered"),
          terminatePid: () => assert.fail("malformed owned process signaled"),
        },
      ),
      /identity is malformed/u,
    );

    for (const [pid, processes, errorPattern] of [
      [96, [fakeProcess(96, 1, expectedPath), fakeProcess(97, 96, missingPath)], /unreadable/u],
      [
        98,
        [
          fakeProcess(98, 1, expectedPath),
          fakeProcess(99, 98, expectedPath),
          fakeProcess(99, 98, expectedPath),
        ],
        /ambiguous duplicate PID/u,
      ],
    ]) {
      const ownedDefectSnapshots = [
        { processes, sockets: [] },
        { processes: [], sockets: [] },
        { processes: [], sockets: [] },
      ];
      await assert.rejects(
        spawnAndRegisterPreparationProcessForTesting(
          expectedPath,
          [],
          {},
          { role: "nvda-installer", allowedRoot: root },
          identities,
          {
            spawnProcess: () => ({ pid, exitCode: null }),
            inspect: () => ownedDefectSnapshots.shift(),
            waitForRegistration: async () => assert.fail("defective descendant registered"),
            terminatePid: () => assert.fail("defective owned process signaled"),
          },
        ),
        errorPattern,
      );
    }

    const rootEntry = fakeProcess(100, 1, expectedPath);
    const rootRecord = frozenProcessRecord(rootEntry);
    const registry = Object.freeze([Object.freeze({ role: "nvda-installer", pid: 100 })]);
    const captureExitSet = () =>
      Object.freeze({ pids: Object.freeze([100]), sockets: Object.freeze([]) });
    const invoke = async (registrationCapture) =>
      waitForOwnedExitForTesting(
        { pid: 100, exitCode: 0 },
        "registration binding",
        1,
        registry,
        "nvda-installer",
        identities,
        registrationCapture,
        {
          inspect: () => ({ processes: [rootEntry], sockets: [] }),
          captureExitSet,
          proveAbsent: async () => true,
        },
      );
    const run = async (records) =>
      invoke(
        Object.freeze({
          ...frozenLaunchClosure(rootEntry, records),
          records: Object.freeze(records),
          pids: Object.freeze(records.map(({ pid }) => pid).sort((left, right) => left - right)),
        }),
      );
    await assert.rejects(
      invoke({ ...frozenLaunchClosure(rootEntry, [rootRecord]) }),
      /registration closure/u,
    );
    await assert.rejects(run([]), /registration closure/u);
    const missingHashRecord = { ...rootRecord };
    delete missingHashRecord.executableSha256;
    await assert.rejects(
      run([Object.freeze(missingHashRecord)]),
      /records changed or are incomplete/u,
    );
    await assert.rejects(
      run([Object.freeze({ ...rootRecord, executableSha256: "0".repeat(64) })]),
      /records changed/u,
    );
    const first = await run([rootRecord]);
    const descendantPath = resolve(root, "descendant.exe");
    writeFileSync(descendantPath, Buffer.from("exact descendant executable"));
    const descendant = frozenProcessRecord(fakeProcess(101, 100, descendantPath));
    const second = await run([rootRecord, descendant]);
    assert.notEqual(first.capturedSetDigest, second.capturedSetDigest);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("unions successful registration closure through normal, exited, timeout, and error exit paths", async () => {
  const registrationRootEntry = fakeProcess(80, 1);
  const registrationRoot = frozenProcessRecord(registrationRootEntry);
  const registrationDescendant = frozenProcessRecord(fakeProcess(81, 80));
  const registrationCapture = frozenLaunchClosure(
    registrationRootEntry,
    [registrationRoot, registrationDescendant],
    ["registration-socket"],
  );
  const registry = Object.freeze([Object.freeze({ role: "nvda-installer", pid: 80 })]);
  const identities = Object.freeze([createExecutableIdentity(process.execPath)]);
  const captureExitSet = () =>
    Object.freeze({
      pids: Object.freeze([80, 82]),
      sockets: Object.freeze(["exit-socket"]),
    });
  const expected = {
    pids: [80, 81],
    sockets: ["exit-socket", "registration-socket"],
  };

  for (const scenario of ["normal", "ALREADY_EXITED", "timeout", "error"]) {
    const observed = [];
    const failure = new Error(scenario);
    const child = { pid: 80, exitCode: scenario === "ALREADY_EXITED" ? 0 : null };
    const reusedRoot = fakeProcess(80, 1, process.execPath, "2000-01-01T00:00:00.000Z");
    const dependencies = {
      inspect: () => ({ processes: [reusedRoot], sockets: [] }),
      captureExitSet,
      proveAbsent: async (ownedInspect, _registry, _role, captured) => {
        assert.deepEqual(ownedInspect().processes, []);
        observed.push(captured);
      },
      terminateOwned: async (_child, _registry, _role, ownedInspect, _roots, _ids, captured) => {
        assert.deepEqual(ownedInspect().processes, []);
        observed.push(captured);
      },
      waitForExit: async () => {
        if (scenario === "normal") return 0;
        throw failure;
      },
    };
    if (scenario === "normal" || scenario === "ALREADY_EXITED") {
      const result = await waitForOwnedExitForTesting(
        child,
        scenario,
        1,
        registry,
        "nvda-installer",
        identities,
        registrationCapture,
        dependencies,
      );
      assert.equal(result.exitCode, 0);
    } else {
      await assert.rejects(
        waitForOwnedExitForTesting(
          child,
          scenario,
          1,
          registry,
          "nvda-installer",
          identities,
          registrationCapture,
          dependencies,
        ),
        new RegExp(scenario, "u"),
      );
    }
    assert.deepEqual(observed[0], expected);
  }
});

test("restarts fresh absence proof only for monotonic late closure expansion", async () => {
  const root = mkdtempSync(join(tmpdir(), "fluyo-fresh-absence-"));
  try {
    const rootExecutable = resolve(root, "root.exe");
    const childExecutable = resolve(root, "child.exe");
    writeFileSync(rootExecutable, Buffer.from("root bytes"));
    writeFileSync(childExecutable, Buffer.from("child bytes"));
    const identity = createExecutableIdentity(rootExecutable);
    const identities = Object.freeze([identity]);

    for (const [scenario, childPath] of [
      ["normal-different-exe", childExecutable],
      ["ALREADY_EXITED-different-exe", childExecutable],
    ]) {
      const rootEntry = fakeProcess(200, 1, rootExecutable);
      const childEntry = fakeProcess(201, 200, childPath);
      const registration = frozenLaunchClosure(rootEntry, [frozenProcessRecord(rootEntry)]);
      const registry = Object.freeze([Object.freeze({ role: "nvda-installer", pid: 200 })]);
      const rootSnapshot = { processes: [rootEntry], sockets: [] };
      const expandedSnapshot = {
        processes: [rootEntry, childEntry],
        sockets: [{ pid: 201, localAddress: "127.0.0.1", localPort: 4201 }],
      };
      const snapshots = [
        rootSnapshot,
        rootSnapshot,
        expandedSnapshot,
        expandedSnapshot,
        { processes: [], sockets: [] },
        { processes: [], sockets: [] },
      ];
      let lowerCalls = 0;
      const result = await waitForOwnedExitForTesting(
        { pid: 200, exitCode: scenario.startsWith("ALREADY") ? 0 : null },
        scenario,
        100,
        registry,
        "nvda-installer",
        identities,
        registration,
        {
          inspect: () => snapshots.shift(),
          captureExitSet: () =>
            Object.freeze({ pids: Object.freeze([200]), sockets: Object.freeze([]) }),
          waitForExit: async () => 0,
          proveAbsent: async (ownedInspect) => {
            lowerCalls += 1;
            ownedInspect();
          },
        },
      );
      assert.equal(lowerCalls, 2);
      assert.equal(result.absenceStatus, "PASS");
      assert.match(result.capturedSetDigest, /^[0-9a-f]{64}$/u);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("preserves lower errors, gives HOLD and deadline precedence, and never retries tamper", async () => {
  const root = mkdtempSync(join(tmpdir(), "fluyo-fresh-errors-"));
  try {
    const executable = resolve(root, "root.exe");
    writeFileSync(executable, Buffer.from("root bytes"));
    const identities = Object.freeze([createExecutableIdentity(executable)]);
    const rootEntry = fakeProcess(220, 1, executable);
    const registration = frozenLaunchClosure(rootEntry, [frozenProcessRecord(rootEntry)]);
    const registry = Object.freeze([Object.freeze({ role: "nvda-installer", pid: 220 })]);
    const rootSnapshot = { processes: [rootEntry], sockets: [] };
    const makeBase = (overrides = {}) => ({
      inspect: () => rootSnapshot,
      captureExitSet: () =>
        Object.freeze({ pids: Object.freeze([220]), sockets: Object.freeze([]) }),
      waitForExit: async () => 0,
      ...overrides,
    });

    const stable = new Error("stable lower proof failure");
    let stableCalls = 0;
    await assert.rejects(
      waitForOwnedExitForTesting(
        { pid: 220, exitCode: null },
        "stable lower",
        100,
        registry,
        "nvda-installer",
        identities,
        registration,
        makeBase({
          proveAbsent: async () => {
            stableCalls += 1;
            throw stable;
          },
        }),
      ),
      stable,
    );
    assert.equal(stableCalls, 1);

    const childExecutable = resolve(root, "child.exe");
    writeFileSync(childExecutable, Buffer.from("child bytes"));
    const childEntry = fakeProcess(221, 220, childExecutable);
    const expandedSnapshot = {
      processes: [rootEntry, childEntry],
      sockets: [{ pid: 221, localAddress: "127.0.0.1", localPort: 4221 }],
    };
    const expansionSnapshots = [
      rootSnapshot,
      rootSnapshot,
      expandedSnapshot,
      expandedSnapshot,
      { processes: [], sockets: [] },
    ];
    let expansionCalls = 0;
    const expandedResult = await waitForOwnedExitForTesting(
      { pid: 220, exitCode: null },
      "lower error then expansion",
      100,
      registry,
      "nvda-installer",
      identities,
      registration,
      makeBase({
        inspect: () => expansionSnapshots.shift(),
        proveAbsent: async () => {
          expansionCalls += 1;
          if (expansionCalls === 1) throw new Error("superseded lower error");
        },
      }),
    );
    assert.equal(expansionCalls, 2);
    assert.equal(expandedResult.absenceStatus, "PASS");

    let tamperCalls = 0;
    writeFileSync(executable, Buffer.from("root bytes"));
    await assert.rejects(
      waitForOwnedExitForTesting(
        { pid: 220, exitCode: null },
        "post tamper",
        100,
        registry,
        "nvda-installer",
        identities,
        registration,
        makeBase({
          proveAbsent: async () => {
            tamperCalls += 1;
            writeFileSync(executable, Buffer.from("tampered bytes"));
          },
        }),
      ),
      /owned process HOLD/u,
    );
    assert.equal(tamperCalls, 1);

    writeFileSync(executable, Buffer.from("root bytes"));
    const ticks = [0, 1, 2, 10];
    await assert.rejects(
      waitForOwnedExitForTesting(
        { pid: 220, exitCode: null },
        "shared deadline",
        100,
        registry,
        "nvda-installer",
        identities,
        registration,
        makeBase({
          proveAbsent: async (ownedInspect) => ownedInspect(),
          proofTimeoutMs: 5,
          proofNow: () => ticks.shift() ?? 10,
        }),
      ),
      /absolute deadline/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("executes PREPARED validation idempotently and mutates only BUILD_READY", async () => {
  const calls = [];
  const operations = {
    validateExisting: () => {
      calls.push("validate");
      return "validated";
    },
    prepareNew: () => {
      calls.push("prepare");
      return "prepared";
    },
  };
  assert.equal(await executePreparationDispositionTransaction("PREPARED", operations), "validated");
  assert.deepEqual(calls, ["validate"]);
  calls.length = 0;
  assert.equal(
    await executePreparationDispositionTransaction("BUILD_READY", operations),
    "prepared",
  );
  assert.deepEqual(calls, ["prepare"]);
  await assert.rejects(
    executePreparationDispositionTransaction("PREPARING", operations),
    /BUILD_READY or PREPARED/u,
  );
});

test("rejects exact staged Chrome and driver residues but not path substrings", () => {
  const chrome = resolve(".r4b-preflight/tools/chrome-win64/chrome.exe");
  const driver = resolve(".r4b-preflight/tools/chromedriver-win64/chromedriver.exe");
  assert.equal(
    validatePreparationProcessSnapshot({
      processes: [{ executablePath: `${chrome}.backup` }, { executablePath: `${driver}.old` }],
      sockets: [],
    }),
    true,
  );
  for (const executablePath of [chrome, driver]) {
    assert.throws(
      () => validatePreparationProcessSnapshot({ processes: [{ executablePath }], sockets: [] }),
      /residue/u,
    );
  }
});

test("threads no-default exact identities through every observer lifecycle phase", () => {
  const source = readFileSync(new URL("./preflight-observer.mjs", import.meta.url), "utf8").replace(
    /\s+/gu,
    " ",
  );
  for (const control of [
    "createExecutableIdentity(NVDA_ADAPTER_PATHS.installer)",
    "createExecutableIdentity(defender)",
    "[process.execPath]",
    "[DRIVER, CHROME]",
    "[nvdaWriter.executable]",
    'waitForOwnedExit( installer, "NVDA portable creation", 120000, installerRegistry, "nvda-installer", installerIdentities, installerRegistrationCapture, )',
    'waitForOwnedExit( scanner, "NVDA portable malware scan", 120000, scannerRegistry, "defender-scanner", scannerIdentities, scannerRegistrationCapture, )',
    "appendImmutableOwnershipRole(registry, descriptor, snapshot, allowedExecutableIdentities)",
    "validateImmutableOwnershipRegistry(snapshot, next, [], allowedExecutableIdentities)",
    'terminateRegisteredOwnedChild( child, writerRegistry, "nvda-writer", inspectWindowsProcessSocketSnapshot, [], writerIdentities, )',
    "exactPhaseExecutableIdentities(ownership, [nvdaWriter.executable])",
    "exactPhaseExecutableIdentities(ownership, [DRIVER, CHROME])",
    "exactPhaseExecutableIdentities(ownership, [process.execPath])",
    "captureExitSet( initialSnapshot, registry, role, child.pid, [], phaseIdentities, )",
    "proveAbsenceFromFreshClosure({",
    "terminateOwned( child, registry, role, identityInspect, [], phaseIdentities, capturedOwnerView(captured), )",
    "await proveFresh(); throw error;",
  ]) {
    assert.ok(source.includes(control), control);
  }
  assert.doesNotMatch(source, /waitForRoleRegistration\([^)]*allowedExecutableIdentities\s*=/u);
  assert.doesNotMatch(source, /stopNvdaWriter\([^)]*allowedExecutableIdentities\s*=/u);
});

test("orders classification before hashing and exact-parent BFS before lower ownership actions", () => {
  const source = readFileSync(new URL("./preflight-observer.mjs", import.meta.url), "utf8");
  const classifyStart = source.indexOf("function classifyCapturedRawProcess");
  const reuseBranch = source.indexOf('status: "REUSED"', classifyStart);
  const materialize = source.indexOf("materializeProcessRecord(entry, label)", classifyStart);
  const reconcileStart = source.indexOf("export function reconcileOwnedClosureForTesting");
  const exactParentGate = source.indexOf(
    "currentExactRecords.has(candidate.parentPid)",
    reconcileStart,
  );
  const descendantHash = source.indexOf(
    'materializeProcessRecord(selected, "spawn registration descendant")',
    exactParentGate,
  );
  const waitStart = source.indexOf("export async function waitForOwnedExitForTesting");
  const waitReconcile = source.indexOf(
    "reconcileOwnedClosureForTesting(tracked, inspect())",
    waitStart,
  );
  const lowerSignal = source.indexOf("await terminateOwned(", waitStart);
  assert.ok(classifyStart >= 0 && reuseBranch > classifyStart && materialize > reuseBranch);
  assert.ok(
    reconcileStart >= 0 &&
      exactParentGate > reconcileStart &&
      descendantHash > exactParentGate &&
      waitReconcile > waitStart &&
      lowerSignal > waitReconcile,
  );
  assert.doesNotMatch(source, /!currentParent/u);
  const waitEnd = source.indexOf("const waitForOwnedExit = waitForOwnedExitForTesting", waitStart);
  const waitSource = source.slice(waitStart, waitEnd);
  assert.doesNotMatch(waitSource, /await proveAbsent\(/u);
  assert.match(waitSource, /const proof = await proveFresh\(\);\s*return result/u);
  assert.match(waitSource, /await terminateOwned\([\s\S]*?await proveFresh\(\);\s*throw error/u);
});

test("freezes each phase executable identity before spawning and revalidates at registration", () => {
  const source = readFileSync(new URL("./preflight-observer.mjs", import.meta.url), "utf8");
  for (const [identity, spawn] of [
    [
      "const installerIdentities = Object.freeze([\n    createExecutableIdentity(NVDA_ADAPTER_PATHS.installer),\n  ]);",
      "const installerSpawn = await spawnAndRegisterPreparationProcess(",
    ],
    [
      "const scannerIdentities = Object.freeze([createExecutableIdentity(defender)]);",
      "const scannerSpawn = await spawnAndRegisterPreparationProcess(",
    ],
    [
      "const writerIdentities = Object.freeze([portableIdentity]);",
      "const child = await spawnNativeNvdaBoundary(",
    ],
    ["const webIdentity = createExecutableIdentity(process.execPath);", "const web = spawn("],
    ["const driverIdentity = createExecutableIdentity(DRIVER);", "driver = spawn(DRIVER"],
    ["const chromeIdentity = createExecutableIdentity(CHROME);", "driver = spawn(DRIVER"],
  ]) {
    assert.ok(source.indexOf(identity) >= 0, identity);
    assert.ok(source.indexOf(identity) < source.indexOf(spawn), `${identity} before ${spawn}`);
  }
  assert.match(source, /reconstructObserverOwnershipFromFrozenIdentities/u);
  assert.match(
    source,
    /validateImmutableOwnershipRegistry\(snapshot, next, \[\], allowedExecutableIdentities\)/u,
  );
});

test("separates identity-controlled portable preparation from every observation launch", () => {
  const source = readFileSync(new URL("./preflight-observer.mjs", import.meta.url), "utf8");
  const prepareStart = source.indexOf("async function prepareNvdaPortable");
  const launchStart = source.indexOf("async function launchPreparedNvdaWriter");
  const registryStart = source.indexOf("function registryForRole", launchStart);
  const transactionStart = source.indexOf("export async function prepareAttempt002RuntimeInternal");
  const observerStart = source.indexOf("async function observeDiscardedPreflightInternal");
  assert.ok(
    prepareStart >= 0 &&
      prepareStart < launchStart &&
      launchStart < registryStart &&
      transactionStart >= 0 &&
      transactionStart < observerStart,
  );
  const prepare = source.slice(prepareStart, launchStart);
  const launch = source.slice(launchStart, registryStart);
  const transaction = source.slice(transactionStart, observerStart);
  const validateStart = source.indexOf("function validatePreparedNvdaClosure");
  const validateEnd = source.indexOf("async function prepareNvdaPortable", validateStart);
  const preparedValidation = source.slice(validateStart, validateEnd);
  assert.match(
    prepare,
    /spawnAndRegisterPreparationProcess\([\s\S]*NVDA_ADAPTER_PATHS\.installer/u,
  );
  assert.match(prepare, /defender-scanner/u);
  assert.doesNotMatch(
    prepare,
    /spawnNativeNvdaBoundary|spawn\(DRIVER|allocateInternalLoopbackPort/u,
  );
  assert.match(launch, /spawnNativeNvdaBoundary/u);
  assert.doesNotMatch(launch, /NVDA portable creation|defender-scanner|MpCmdRun/u);
  assert.match(transaction, /resolveAttempt002State\(\).*preparationTransactionDisposition/su);
  assert.match(transaction, /disposition === "VALIDATE_ONLY"/u);
  const validateOnly = transaction.slice(
    transaction.indexOf('if (disposition === "VALIDATE_ONLY")'),
    transaction.indexOf("assertProductionFixtureBoundaryEligible"),
  );
  assert.doesNotMatch(validateOnly, /guardedAttemptWrite|guardedAttemptMkdir|prepareNvdaPortable/u);
  assert.match(transaction, /recordAttempt002Preparing/u);
  assert.match(transaction, /preparationReceipt/u);
  assert.match(transaction, /recordAttempt002Prepared/u);
  assert.doesNotMatch(
    transaction,
    /allocateInternalLoopbackPort|spawn\(DRIVER|createChromeSession|spawnNativeNvdaBoundary/u,
  );
  assert.match(source, /attempt-002 observer is not in PREPARED state/u);
  assert.match(
    preparedValidation,
    /receipt\.installerIdentityDigest !== valueDigest\(\[installerIdentity\]\)/u,
  );
  assert.match(
    preparedValidation,
    /receipt\.defenderIdentityDigest !== valueDigest\(\[defenderIdentity\]\)/u,
  );
  const residue = source.slice(
    source.indexOf("function assertNoPreparationResidue"),
    source.indexOf("function captureSpawnClosure"),
  );
  assert.match(residue, /executablePath === chrome/u);
  assert.match(residue, /executablePath === driver/u);
});

test("maps every sampled accepted state variant to a closed development fixture", () => {
  const plan = createDiscardedPreflightPlan();
  const allowed = new Set([
    "preparing",
    "active",
    "submitting",
    "confirmed-correct-continue",
    "confirmed-correct-finish",
    "confirmed-incorrect-continue",
    "confirmed-incorrect-finish",
    "retryable-prepare",
    "retryable-submit",
    "stale-content",
    "session-ended",
    "access-blocked",
    "empty-review",
    "offline-prepare",
    "offline-active",
  ]);
  assert.equal(
    plan.visualCells.every((cell) => allowed.has(fixturePresentation(cell))),
    true,
  );
});

test("marks only not-started observations UNATTEMPTED after mid-matrix cancellation", () => {
  const plan = createDiscardedPreflightPlan();
  const completed = plan.observations.slice(0, 17).map((observation) => ({
    cellOrdinal: observation.cellOrdinal,
    status: "PASS",
    audit: {},
    metrics: {},
  }));
  const announcements = plan.observations.slice(0, 17).map((observation) => ({
    observationId: observation.observationId,
    eventCount: 1,
    normalizedTextSha256: "a".repeat(64),
    duplicateCount: 0,
    expectedOrderStatus: "PASS",
    oneTimeAnnouncementStatus: "PASS",
  }));
  const filled = fillUnattemptedObservationStatuses(plan, completed, announcements);
  assert.equal(filled.observations.length, 120);
  assert.equal(filled.observations.filter(({ status }) => status === "PASS").length, 17);
  assert.equal(filled.observations.filter(({ status }) => status === "UNATTEMPTED").length, 103);
  assert.equal(filled.announcements[17].expectedOrderStatus, "UNATTEMPTED");
  assert.equal(completed.length, 17);
});

test("requires inert client navigation, action substitution, presentation, and focus", () => {
  const probe = {
    boundary: "v1",
    actionAlias: "fluyo:r4b:inert-conversation-action:v1",
    anchorNavigationPrevented: true,
    routerButtonPrevented: true,
    actionCallbackPrevented: true,
    pointerSubmitPrevented: true,
    keyboardSubmitPrevented: true,
    locationStable: true,
    presentationStable: true,
    focusStable: true,
    zeroRequestActivation: true,
    zeroActionActivation: true,
    blockedActivationCount: 5,
  };
  assert.deepEqual(validateInertClientBoundaryProbe(probe), { status: "PASS" });
  for (const field of [
    "anchorNavigationPrevented",
    "routerButtonPrevented",
    "actionCallbackPrevented",
    "pointerSubmitPrevented",
    "keyboardSubmitPrevented",
    "locationStable",
    "presentationStable",
    "focusStable",
    "zeroRequestActivation",
    "zeroActionActivation",
  ]) {
    assert.throws(() => validateInertClientBoundaryProbe({ ...probe, [field]: false }), /failed/u);
  }
  assert.throws(
    () => validateInertClientBoundaryProbe({ ...probe, blockedActivationCount: 4 }),
    /failed/u,
  );
});

test("holds every post-PREPARING mutation boundary on crash", () => {
  const boundaries = [
    "PREPARING_RECORDED",
    "ATTEMPT_ROOT_CREATED",
    "AUTHORITY_COPIED",
    "MANIFEST_COPIED",
    "RAW_ROOT_CREATED",
    "PREPARED_RECORDED",
    "OBSERVING_RECORDED",
    "WEB_SPAWNED",
    "WEB_REGISTERED",
    "SERVER_READY_RECORDED",
    "DRIVER_SPAWNED",
    "DRIVER_REGISTERED",
    "DRIVER_READY_RECORDED",
    "NVDA_REGISTERED",
    "NVDA_READY_RECORDED",
  ];
  assert.deepEqual(validateObservationTransactionTrace(boundaries), {
    status: "NVDA_READY",
    boundary: "NVDA_READY_RECORDED",
  });
  for (let index = 1; index <= boundaries.length; index += 1) {
    assert.deepEqual(
      validateObservationTransactionTrace([...boundaries.slice(0, index), "FAILED_HELD"]),
      {
        status: "FAILED_HELD",
        boundary: boundaries[index - 1],
      },
    );
  }
  assert.throws(
    () => validateObservationTransactionTrace([boundaries[0], boundaries[2]]),
    /skipped or reordered/u,
  );
});

test("requires two distinct production query cells and rejects malformed or extra keys", () => {
  const responses = [
    {
      kind: "valid-a",
      status: 200,
      body: '<div data-fixture-cell="a" data-r4b-inert-navigation-boundary="v1">A</div>',
    },
    {
      kind: "valid-b",
      status: 200,
      body: '<div data-fixture-cell="b" data-r4b-inert-navigation-boundary="v1">B</div>',
    },
    { kind: "malformed", status: 404, body: "not found" },
    { kind: "extra", status: 404, body: "not found" },
  ];
  assert.deepEqual(validateHarnessQueryProofResponses(responses), {
    valid: 2,
    rejected: 2,
    status: "PASS",
  });
  assert.throws(
    () => validateHarnessQueryProofResponses(responses.map((entry) => ({ ...entry, status: 200 }))),
    /status/u,
  );
  assert.throws(
    () =>
      validateHarnessQueryProofResponses([
        responses[0],
        { ...responses[1], body: responses[0].body },
        ...responses.slice(2),
      ]),
    /byte-identical/u,
  );
});

test("accepts only the inert isolated production harness boundary", () => {
  assert.doesNotThrow(() => assertProductionFixtureBoundaryEligible());
});

test("resolves progress names through complete aria-labelledby references", () => {
  assert.deepEqual(
    resolveAccessibleNameEvidence({
      ariaLabelledby: "progress-label progress-context",
      referencedLabels: {
        "progress-label": "Activity progress",
        "progress-context": "Lesson one",
      },
    }),
    {
      name: "Activity progress Lesson one",
      source: "aria-labelledby",
      status: "PASS",
    },
  );
  assert.equal(
    resolveAccessibleNameEvidence({
      ariaLabelledby: "progress-label missing",
      referencedLabels: { "progress-label": "Activity progress" },
    }).status,
    "FAIL",
  );
  assert.equal(
    resolveAccessibleNameEvidence({
      ariaLabelledby: "progress-label empty",
      referencedLabels: { "progress-label": "Activity progress", empty: "  " },
    }).status,
    "FAIL",
  );
});

test("measures offset focus and semantic indicators against the exposed surface", () => {
  for (const sample of [
    {
      outlineRgba: [38, 57, 182, 1],
      elementSurfaceRgba: [38, 57, 182, 1],
      exposedSurfaceRgba: [255, 255, 255, 1],
    },
    {
      outlineRgba: [255, 211, 78, 1],
      elementSurfaceRgba: [255, 211, 78, 1],
      exposedSurfaceRgba: [33, 28, 74, 1],
    },
  ]) {
    assert.equal(rgbaContrastRatio(sample.outlineRgba, sample.elementSurfaceRgba), 1);
    assert.equal(focusContrastAgainstExposedSurface(sample).status, "PASS");
  }
  assert.ok(rgbaContrastRatio([38, 57, 182, 1], [255, 253, 248, 1]) >= 3);
  assert.ok(rgbaContrastRatio([174, 184, 255, 1], [42, 36, 86, 1]) >= 3);
  assert.ok(rgbaContrastRatio([22, 122, 91, 1], [232, 251, 244, 1]) >= 3);
});

test("alpha-composes disabled-control and ancestor opacity instead of trusting raw tokens", () => {
  const cobalt = [38, 57, 182, 1];
  const activeSurface = [235.47, 235.36, 242.06, 1];
  const submittingSurface = [255, 247, 216, 1];
  const priorActive = effectiveRgbaWithOpacity({
    foregroundRgba: cobalt,
    backgroundRgba: activeSurface,
    opacityChain: [0.52],
  });
  const priorSubmitting = effectiveRgbaWithOpacity({
    foregroundRgba: cobalt,
    backgroundRgba: submittingSurface,
    opacityChain: [0.52],
  });
  assert.ok(rgbaContrastRatio(cobalt, activeSurface) >= 3);
  assert.ok(rgbaContrastRatio(cobalt, submittingSurface) >= 3);
  assert.ok(Math.abs(rgbaContrastRatio(priorActive, activeSurface) - 2.5965) < 0.001);
  assert.ok(Math.abs(rgbaContrastRatio(priorSubmitting, submittingSurface) - 2.7075) < 0.001);
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: cobalt,
      elementSurfaceRgba: cobalt,
      exposedSurfaceRgba: activeSurface,
      opacityChain: [0.52],
    }).status,
    "FAIL",
  );
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: cobalt,
      elementSurfaceRgba: cobalt,
      exposedSurfaceRgba: activeSurface,
      opacityChain: [1, 0.5],
    }).status,
    "FAIL",
  );
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: [38, 57, 182, 0.2],
      elementSurfaceRgba: [38, 57, 182, 0.2],
      exposedSurfaceRgba: activeSurface,
    }).status,
    "FAIL",
  );
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: cobalt,
      elementSurfaceRgba: cobalt,
      exposedSurfaceRgba: activeSurface,
      opacityChain: [Number.NaN],
    }).status,
    "FAIL",
  );
});

test("uses explicit opaque disabled tokens with compliant light and dark contrast", () => {
  const lightParent = [255, 247, 216, 1];
  const lightSurface = [89, 96, 127, 1];
  const darkParent = [42, 36, 86, 1];
  const darkSurface = [144, 153, 197, 1];
  for (const evidence of [
    contextualSemanticContrastPairs({
      elementId: "primary-action",
      elementSurfaceRgba: lightSurface,
      parentSurfaceRgba: lightParent,
      boundaryRgba: [23, 19, 63, 1],
    }),
    contextualSemanticContrastPairs({
      elementId: "primary-action",
      elementSurfaceRgba: darkSurface,
      parentSurfaceRgba: darkParent,
      boundaryRgba: [255, 211, 78, 1],
    }),
  ]) {
    assert.equal(
      evidence.every(({ status }) => status === "PASS"),
      true,
    );
  }
  assert.ok(rgbaContrastRatio([255, 255, 255, 1], lightSurface) >= 4.5);
  assert.ok(rgbaContrastRatio([23, 19, 63, 1], darkSurface) >= 4.5);
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: [38, 57, 182, 1],
      elementSurfaceRgba: lightSurface,
      exposedSurfaceRgba: lightParent,
    }).status,
    "PASS",
  );
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: [255, 211, 78, 1],
      elementSurfaceRgba: darkSurface,
      exposedSurfaceRgba: darkParent,
    }).status,
    "PASS",
  );
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: [0, 0, 0, 1],
      elementSurfaceRgba: [20, 20, 20, 1],
      exposedSurfaceRgba: [255, 255, 255, 1],
      opacityChain: [0.9, 0.9],
    }).status,
    "PASS",
  );
});

test("uses opaque checked and unchecked disabled-choice tokens and rejects the prior alpha fade", () => {
  const white = [255, 255, 255, 1];
  const lightSurface = [242, 240, 248, 1];
  const darkSurface = [42, 36, 86, 1];
  const themes = [
    {
      surface: lightSurface,
      ink: [79, 75, 109, 1],
      uncheckedBoundary: [111, 105, 148, 1],
      checkedBoundary: [38, 57, 182, 1],
      focus: [38, 57, 182, 1],
    },
    {
      surface: darkSurface,
      ink: [215, 208, 229, 1],
      uncheckedBoundary: [174, 184, 255, 1],
      checkedBoundary: [255, 211, 78, 1],
      focus: [255, 211, 78, 1],
    },
  ];
  for (const theme of themes) {
    assert.ok(rgbaContrastRatio(theme.ink, theme.surface) >= 4.5);
    for (const [state, boundaryRgba] of [
      ["unchecked", theme.uncheckedBoundary],
      ["checked", theme.checkedBoundary],
    ]) {
      const [pair] = contextualSemanticContrastPairs({
        elementId: `choice-disabled-${state}`,
        elementSurfaceRgba: theme.surface,
        parentSurfaceRgba: white,
        boundaryRgba,
      });
      assert.equal(pair.pairId, `choice-disabled-${state}:choice-boundary`);
      assert.equal(pair.status, "PASS");
      assert.ok(pair.ratio >= 3);
    }
    assert.equal(
      focusContrastAgainstExposedSurface({
        outlineRgba: theme.focus,
        elementSurfaceRgba: theme.surface,
        exposedSurfaceRgba: theme.surface,
      }).status,
      "PASS",
    );
  }

  const [oldOpacityPair] = contextualSemanticContrastPairs({
    elementId: "choice-disabled-unchecked",
    elementSurfaceRgba: [255, 253, 248, 1],
    parentSurfaceRgba: white,
    boundaryRgba: [111, 105, 148, 1],
    opacityChain: [0.72],
  });
  assert.ok(Math.abs(oldOpacityPair.ratio - 2.9073645442184133) < 1e-12);
  assert.equal(oldOpacityPair.status, "FAIL");
  assert.equal(
    contextualSemanticContrastPairs({
      elementId: "choice-disabled-unchecked",
      elementSurfaceRgba: [255, 253, 248, 1],
      parentSurfaceRgba: white,
      boundaryRgba: [111, 105, 148, 1],
      opacityChain: [1, 0.72],
    })[0].status,
    "FAIL",
  );
  assert.equal(
    contextualSemanticContrastPairs({
      elementId: "choice-disabled-unchecked",
      elementSurfaceRgba: [255, 253, 248, 1],
      parentSurfaceRgba: white,
      boundaryRgba: [111, 105, 148, 0.72],
    })[0].status,
    "FAIL",
  );
});

test("uses closed contextual semantic contrast pairs and never compares a decorative border to its own fill", () => {
  const state = contextualSemanticContrastPairs({
    elementId: "state-panel",
    elementSurfaceRgba: [255, 247, 216, 1],
    parentSurfaceRgba: [255, 253, 248, 1],
    boundaryRgba: [138, 91, 0, 1],
  });
  assert.deepEqual(
    state.map(({ pairId }) => pairId),
    ["state-panel:state-rule"],
  );
  assert.equal(state[0].status, "PASS");

  const choice = contextualSemanticContrastPairs({
    elementId: "choice-cerca",
    elementSurfaceRgba: [255, 253, 248, 1],
    parentSurfaceRgba: [255, 255, 255, 1],
    boundaryRgba: [111, 105, 148, 1],
  });
  assert.deepEqual(
    choice.map(({ pairId }) => pairId),
    ["choice-cerca:choice-boundary"],
  );
  assert.equal(choice[0].status, "PASS");

  const primary = contextualSemanticContrastPairs({
    elementId: "primary-action",
    elementSurfaceRgba: [38, 57, 182, 1],
    parentSurfaceRgba: [255, 253, 248, 1],
    boundaryRgba: [38, 57, 182, 1],
  });
  assert.deepEqual(
    primary.map(({ pairId }) => pairId),
    ["primary-action:primary-surface", "primary-action:primary-boundary"],
  );
  assert.equal(
    primary.every(({ status }) => status === "PASS"),
    true,
  );
  assert.equal(
    primary.some(
      ({ foregroundRgba, backgroundRgba }) =>
        JSON.stringify(foregroundRgba) === JSON.stringify(backgroundRgba),
    ),
    false,
  );
  assert.equal(
    contextualSemanticContrastPairs({
      elementId: "choice-cerca",
      elementSurfaceRgba: [255, 253, 248, 1],
      parentSurfaceRgba: [255, 255, 255, 1],
      boundaryRgba: [255, 253, 248, 1],
    })[0].status,
    "FAIL",
  );
});

test("keeps the warning rule above 3:1 in light and dark themes", () => {
  assert.ok(rgbaContrastRatio([138, 91, 0, 1], [255, 247, 216, 1]) >= 3);
  assert.ok(rgbaContrastRatio([255, 211, 78, 1], [42, 36, 86, 1]) >= 3);
});

test("models native Tab radio grouping and guarded Arrow selection for representative states", () => {
  const common = [
    { key: "a:Skip to activity", type: "link" },
    { key: "hidden", type: "hidden" },
    { key: "non-rendered", type: "button", rendered: false },
    { key: "inert", type: "button", inert: true },
    { key: "disabled", type: "button", disabled: true },
    { key: "a:Back to dashboard", type: "link" },
  ];
  const radios = [
    {
      key: "radio:selectedChoiceId:cerca",
      type: "radio",
      name: "selectedChoiceId",
      checked: true,
    },
    {
      key: "radio:selectedChoiceId:gracias",
      type: "radio",
      name: "selectedChoiceId",
      checked: false,
    },
  ];
  const activeKeys = nativeSequentialFocusModel([
    ...common,
    ...radios,
    { key: "conversation-canvas-attempt-action", type: "button" },
    { key: "button:Run synthetic event", type: "button" },
  ]);
  assert.deepEqual(activeKeys, [
    "a:Skip to activity",
    "a:Back to dashboard",
    "radio:selectedChoiceId:cerca",
    "conversation-canvas-attempt-action",
    "button:Run synthetic event",
  ]);
  const activeArrow = nativeRadioArrowModel({
    members: radios.map(({ key }) => key),
    currentIndex: 0,
    direction: "ArrowRight",
    ariaDisabled: false,
  });
  assert.deepEqual(activeArrow, {
    activeKey: "radio:selectedChoiceId:gracias",
    checkedKey: "radio:selectedChoiceId:gracias",
    selectionChanged: true,
    guarded: false,
  });
  const submittingArrow = nativeRadioArrowModel({
    members: radios.map(({ key }) => key),
    currentIndex: 0,
    direction: "ArrowRight",
    ariaDisabled: true,
  });
  assert.deepEqual(submittingArrow, {
    activeKey: "radio:selectedChoiceId:cerca",
    checkedKey: "radio:selectedChoiceId:cerca",
    selectionChanged: false,
    guarded: true,
  });
  for (const [stateId, expectedKeys, radioArrow] of [
    ["ACTIVE", activeKeys, { status: "PASS", guarded: false }],
    ["SUBMITTING", activeKeys, { status: "PASS", guarded: true }],
    [
      "CONFIRMED",
      [
        "a:Skip to activity",
        "a:Back to dashboard",
        "conversation-canvas-primary-action",
        "button:Run synthetic event",
      ],
      null,
    ],
  ]) {
    assert.equal(
      validateRepresentativeFocusFixture({
        stateId,
        keyboardTrace: {
          status: "PASS",
          expectedKeys,
          reverse: [...expectedKeys].reverse().map((key) => ({ key })),
        },
        radioArrow,
      }).status,
      "PASS",
    );
  }
});

test("requires the exact unbroken phone-risk fixture and zero document or named-region overflow", () => {
  const value = {
    prompt: "P".repeat(600),
    choices: ["1", "2", "3", "4"].map((value) => value.repeat(180)),
    documentScrollWidth: 320,
    documentClientWidth: 320,
    regions: [
      { id: "canvas", missing: false, horizontalClipped: false },
      { id: "choices", missing: false, horizontalClipped: false },
      { id: "primary", missing: false, horizontalClipped: false },
    ],
  };
  assert.equal(validateLongContentReflow(value).status, "PASS");
  assert.equal(
    validateLongContentReflow({
      ...value,
      regions: value.regions.map((region, index) =>
        index === 1 ? { ...region, horizontalClipped: true } : region,
      ),
    }).status,
    "FAIL",
  );
});

test("derives the RTL notch side from the responsive computed token", () => {
  for (const notchSize of [20, 24]) {
    assert.equal(
      validateRtlNotchGeometry({
        clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${notchSize}px), calc(100% - ${notchSize}px) 100%, 0 100%)`,
        notchSize,
        width: 720,
        height: 480,
      }),
      true,
    );
  }
  assert.equal(
    validateRtlNotchGeometry({
      clipPath: "polygon(0 0, 100% 0, 100% 100%, 20px 100%, 0 calc(100% - 20px))",
      notchSize: 20,
      width: 720,
      height: 480,
    }),
    false,
  );
});

test("keeps the embedded browser audit executable after exact geometry changes", () => {
  assert.doesNotThrow(() => new Script(`(${preflightPageAuditScriptForTesting()})`));
});

test("binds presentation fidelity, full geometry artifacts, locale, and reducer transitions", () => {
  const observer = readFileSync(new URL("./preflight-observer.mjs", import.meta.url), "utf8");
  const source = readFileSync(
    new URL("../../apps/r4b-preflight-harness/source-contract.tsx", import.meta.url),
    "utf8",
  );
  const styles = readFileSync(
    new URL("../../apps/r4b-preflight-harness/app/globals.css", import.meta.url),
    "utf8",
  );
  const localizer = readFileSync(
    new URL("../../apps/r4b-preflight-harness/localized-boundary.tsx", import.meta.url),
    "utf8",
  );
  const transition = readFileSync(
    new URL("../../apps/r4b-preflight-harness/transition-intent-boundary.tsx", import.meta.url),
    "utf8",
  );
  const productCanvas = readFileSync(
    new URL("../../apps/web/app/learn/session/conversation-canvas.tsx", import.meta.url),
    "utf8",
  );
  const productStyles = readFileSync(
    new URL("../../apps/web/app/learn/session/conversation-canvas.module.css", import.meta.url),
    "utf8",
  );
  for (const marker of [
    "--display",
    "--body",
    "box-sizing: border-box",
    "min-width: 320px",
    ":focus-visible",
  ])
    assert.equal(styles.includes(marker), true, marker);
  for (const marker of ["en-XA", "ar-XB", "pseudoLocalizeVisibleString", "MutationObserver"]) {
    assert.equal(localizer.includes(marker), true, marker);
  }
  for (const marker of [
    "activationElement",
    "contrastPairs",
    "namedRegions",
    "keyboardTrace",
    "progressValueTextPass",
    "logicalMirrorPass",
    "identicalStaticOutcome",
    "requiredRegionsPass",
    "actionableOverlapPass",
    "borderInlineStartColor",
    "parentBg=background(e.parentElement",
    "closedSemanticIds",
    "semanticPairIdsPass",
    "progressAccessibleName",
    "notchSize",
    "effectiveOpacity",
    "colorComputationPass",
    "data-r4b-transition-intent",
  ])
    assert.equal(observer.includes(marker), true, marker);
  assert.equal(source.includes("provenance"), true);
  assert.equal(transition.includes('type: "AUTHORITATIVE_RESET"'), false);
  for (const marker of [
    "conversationCanvasReducer",
    "browserConnectivityInstruction",
    "rebindOfflineSelection",
    "retrySubmitState",
    "retryPrepareState",
    "lateConfirmationIgnored",
    "answerRetained",
    "answerCleared",
  ])
    assert.equal(transition.includes(marker), true, marker);
  assert.equal(observer.includes("ratio(bg,bg)"), false);
  assert.equal(observer.includes("background(e.parentElement??document.body)"), true);
  assert.equal(observer.includes("['progress','progress-fill','state-panel'"), false);
  assert.equal(productCanvas.includes("aria-disabled={disabled || undefined}"), true);
  assert.equal(
    productCanvas.includes('disabled={isBusy || state.id === "OFFLINE_READ_ONLY"}'),
    false,
  );
  assert.equal(productCanvas.includes("if (!canSubmit) return"), true);
  assert.equal(productStyles.includes("--cc-mint-strong: #167a5b"), true);
  assert.equal(productStyles.includes("--cc-warning-strong: #8a5b00"), true);
  assert.equal(productStyles.includes("--cc-disabled-surface: #59607f"), true);
  assert.equal(productStyles.includes("--cc-disabled-focus: #2639b6"), true);
  assert.equal(productStyles.includes("opacity: 0.52"), false);
  assert.equal(productStyles.includes("--cc-disabled-choice-surface: #f2f0f8"), true);
  assert.equal(productStyles.includes("--cc-disabled-choice-boundary: #6f6994"), true);
  assert.equal(productStyles.includes("--cc-disabled-choice-focus: #2639b6"), true);
  assert.equal(productStyles.includes("opacity: 0.72"), false);
  assert.equal(observer.includes("...scope.querySelectorAll('fieldset label')"), true);
  assert.equal(observer.includes("semanticId+':choice-boundary'"), true);
  assert.equal(productStyles.includes("overflow-wrap: anywhere"), true);
  assert.equal(productStyles.includes("min-inline-size: 0"), true);
  assert.equal(productStyles.includes("background: var(--cc-cobalt);"), true);
  assert.equal(styles.includes("scroll-behavior: auto"), true);
});
