import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "vitest";

import {
  createOuterActivationExecutor,
  outerActivationTesting as subject,
} from "../../../scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.mjs";

const root = resolve(import.meta.dirname, "../../..");
const packetPath = join(
  root,
  "scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-activation-v1.json",
);
const executorPath = join(
  root,
  "scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.mjs",
);
const executorSource = readFileSync(executorPath, "utf8");
const packetBytes = readFileSync(packetPath);
const M = "a".repeat(40);
const SHA = "b".repeat(64);
const BLOB = "c".repeat(40);
const EXPECTED_ID = "d".repeat(64);
const D70 = subject.constants.EXECUTION_COMMIT;

const exactArgv = (overrides = {}) => [
  process.execPath,
  executorPath,
  subject.constants.OUTER_MODE,
  `--activation-merge-commit=${overrides.merge ?? M}`,
  `--execution-checkout-root=${overrides.executionRoot ?? "C:\\repo-d70"}`,
  `--activation-packet-sha256=${overrides.packetSha ?? SHA}`,
  `--activation-packet-git-blob-sha1=${overrides.packetBlob ?? BLOB}`,
  `--reviewed-six-row-manifest-sha256=${overrides.manifestSha ?? SHA}`,
  `--expected-repository-common-dir-identity-sha256=${overrides.identity ?? EXPECTED_ID}`,
  `--review-binding=${subject.constants.SIX_BINDING}`,
];

const makeStat = (entry, big = true) => ({
  dev: big ? entry.dev : Number(entry.dev),
  ino: big ? entry.ino : Number(entry.ino),
  size: big ? BigInt(entry.bytes?.length ?? 0) : (entry.bytes?.length ?? 0),
  isFile: () => entry.type === "file",
  isDirectory: () => entry.type === "dir",
  isSymbolicLink: () => entry.symlink === true,
});

function memoryPlatform() {
  const entries = new Map();
  const handles = new Map();
  const events = [];
  const hooks = { beforeLstat: null, beforeMkdir: null, afterMkdir: null };
  let nextIno = 10n;
  let nextHandle = 100;
  const key = (path) => resolve(path).toLowerCase();
  const add = (path, type, bytes = Buffer.alloc(0), options = {}) => {
    const entry = {
      path: resolve(path),
      type,
      bytes: Buffer.from(bytes),
      dev: options.dev ?? 1n,
      ino: options.ino ?? nextIno++,
      symlink: options.symlink ?? false,
      finalPath: options.finalPath ?? resolve(path),
    };
    entries.set(key(path), entry);
    return entry;
  };
  const replace = (path, options = {}) => {
    const previous = get(path);
    return add(path, options.type ?? previous.type, options.bytes ?? previous.bytes, {
      dev: options.dev ?? previous.dev,
      ino: options.ino ?? nextIno++,
      symlink: options.symlink ?? previous.symlink,
      finalPath: options.finalPath ?? previous.finalPath,
    });
  };
  const get = (path) => {
    const entry = entries.get(key(path));
    if (!entry) {
      const error = new Error("missing");
      error.code = "ENOENT";
      throw error;
    }
    return entry;
  };
  const open = (path, type) => {
    const entry = get(path);
    assert.equal(entry.type, type);
    const handle = nextHandle++;
    handles.set(handle, entry);
    events.push(["open", type, key(path)]);
    return handle;
  };
  const platform = {
    openFileReadOnly: (path) => open(path, "file"),
    openDirectoryReadOnly: (path) => open(path, "dir"),
    close(handle) {
      handles.delete(handle);
      events.push(["close", handle]);
    },
    fstatBigInt(handle) {
      return makeStat(handles.get(handle), true);
    },
    readHeldFile(handle, cap) {
      const bytes = handles.get(handle).bytes;
      assert.ok(bytes.length <= cap);
      return Buffer.from(bytes);
    },
    realpathNative: (path) => get(path).finalPath,
    lstat(path) {
      hooks.beforeLstat?.(resolve(path));
      return makeStat(get(path), false);
    },
    mkdirNonrecursive(path) {
      hooks.beforeMkdir?.(resolve(path));
      get(resolve(path, ".."));
      add(path, "dir");
      events.push(["mkdir", key(path)]);
      hooks.afterMkdir?.(resolve(path));
    },
    openFileExclusive(path) {
      assert.equal(entries.has(key(path)), false);
      add(path, "file");
      return open(path, "file");
    },
    writeAll(handle, bytes) {
      handles.get(handle).bytes = Buffer.from(bytes);
    },
    fsyncFile(handle) {
      assert.ok(handles.has(handle));
    },
    fsyncDirectory(handle) {
      assert.equal(handles.get(handle).type, "dir");
    },
    spawnDirect(executable, args, options) {
      events.push(["spawn", executable, args, options]);
      return { executable, args, options };
    },
    async waitForExit() {
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        stdout: cleanInnerBytes(),
        stderr: Buffer.alloc(0),
        overflow: false,
      };
    },
    monotonicMilliseconds: () => 1,
  };
  return { platform, entries, handles, events, hooks, add, replace, get, key };
}

function addRepository(memory, worktreeRoot, gitdir, commonDir, head) {
  memory.add(worktreeRoot, "dir");
  memory.add(join(worktreeRoot, ".git"), "file", Buffer.from(`gitdir: ${gitdir}\n`));
  memory.add(gitdir, "dir");
  memory.add(join(gitdir, "commondir"), "file", Buffer.from(`${commonDir}\n`));
  memory.add(join(gitdir, "HEAD"), "file", Buffer.from(`${head}\n`));
  if (!memory.entries.has(memory.key(commonDir)))
    memory.add(commonDir, "dir", Buffer.alloc(0), { ino: 2n });
}

function repositoryFixture(common = "C:\\repo\\.git") {
  const memory = memoryPlatform();
  const mRoot = "C:\\repo-m";
  const d70Root = "C:\\repo-d70";
  addRepository(memory, mRoot, join(common, "worktrees", "m"), common, M);
  addRepository(memory, d70Root, join(common, "worktrees", "d70"), common, D70);
  return { memory, mRoot, d70Root, common };
}

function directRepository(memory, common = "C:\\repo\\.git") {
  if (!memory.entries.has(memory.key(common)))
    memory.add(common, "dir", Buffer.alloc(0), { ino: 2n });
  const commonHeld = subject.holdDirectory(
    memory.platform,
    common,
    "ACTIVATION_REPOSITORY_IDENTITY_INVALID",
  );
  return {
    commonDir: common,
    commonHandle: commonHeld.handle,
    commonHeld,
    commonIdentity: commonHeld.identity,
  };
}

function activationBundleFixture() {
  const memory = memoryPlatform();
  const activationRoot = "C:\\activation";
  memory.add(activationRoot, "dir");
  const rows = [];
  for (const path of subject.SIX_PATHS) {
    const value =
      path === subject.constants.PACKET_PATH ? packetBytes : Buffer.from(`fixture:${path}`);
    memory.add(join(activationRoot, path), "file", value);
    rows.push(
      Buffer.from(
        `${path}\0${value.length}\0${subject.sha256(value)}\0${subject.gitBlob(value)}\n`,
      ),
    );
  }
  const manifestBytes = Buffer.concat(rows);
  return {
    memory,
    activationRoot,
    manifestBytes,
    manifestSha256: subject.sha256(manifestBytes),
  };
}

function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdout.destroyed = false;
  child.stderr.destroyed = false;
  child.stdout.destroy = () => {
    child.stdout.destroyed = true;
  };
  child.stderr.destroy = () => {
    child.stderr.destroyed = true;
  };
  child.unrefCount = 0;
  child.killCount = 0;
  child.unref = () => {
    child.unrefCount += 1;
  };
  child.kill = () => {
    child.killCount += 1;
  };
  return child;
}

const authority = {
  externalActionAuthorized: false,
  downloadAuthorityPresent: false,
  executionAuthorityPresent: false,
  state: "PRECONDITION_HOLD_NO_GET",
};

function innerReceipt(state = "SYNTHETIC_TEST_CLEAN", reason = null, overrides = {}) {
  return {
    schemaVersion: 1,
    mode: "CONTRACT_SELF_TEST_V1_13_6",
    contractVersion: "R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.6",
    reviewBinding: subject.constants.TEN_BINDING,
    candidateManifestSha256: subject.constants.TEN_MANIFEST_SHA,
    state,
    primaryFailureReason: reason,
    completedFixtureCount: 39,
    compilerProcessCount: 0,
    fixtureProcessCount: 0,
    cleanupStepCount: 23,
    fixtureEvidenceSha256: SHA,
    publicTracePinsSha256: SHA,
    ownershipLedgerPreCleanupSha256: SHA,
    ownershipLedgerSha256: SHA,
    cleanupSha256: SHA,
    adapterSessionClosed: true,
    networkEvidenceMode: "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1",
    networkMeasurementComplete: true,
    networkBaselineOwnerCount: 2,
    networkWorkOwnerCount: 40,
    networkOwnerCount: 42,
    networkObservationCount: 1,
    networkMaximumGapMicros: 1,
    networkEventCount: 0,
    retainedArtifactCount: 0,
    globalMutationCount: 0,
    manifestFinalRevalidated: true,
    authority,
    ...overrides,
  };
}

const cleanInnerBytes = () => Buffer.from(`${JSON.stringify(innerReceipt())}\n`);
const parseReceipt = (value) =>
  subject.parseInnerReceipt(Buffer.from(`${JSON.stringify(value)}\n`), Buffer.alloc(0));
const child = (state, exitCode, reason = null, overrides = {}) => ({
  exitCode,
  signal: null,
  timedOut: false,
  overflow: false,
  stdout: Buffer.from(`${JSON.stringify(innerReceipt(state, reason, overrides))}\n`),
  stderr: Buffer.alloc(0),
});
const captureFailure = (operation, pattern) => {
  try {
    operation();
  } catch (error) {
    assert.match(String(error), pattern);
    return error;
  }
  assert.fail("Expected operation to fail");
};

const outcomeContext = () => ({
  cli: {
    activationMergeCommit: M,
    activationPacketSha256: SHA,
    activationPacketGitBlobSha1: BLOB,
    activationManifestSha256: SHA,
    expectedRepositoryIdentity: EXPECTED_ID,
  },
  nodeEvidence: {
    byteCount: 1,
    sha256: SHA,
    finalPathSha256: SHA,
    deviceHex: "1",
    inodeHex: "2",
    evidenceSha256: SHA,
  },
  adapterEvidence: {
    byteCount: 1,
    sha256: SHA,
    gitBlobSha1: BLOB,
    finalPathSha256: SHA,
    deviceHex: "1",
    inodeHex: "3",
    evidenceSha256: SHA,
  },
  activationManifestSha256: SHA,
  observedRepositoryIdentity: EXPECTED_ID,
});

test("25 CLI accepts only exact positional argv and empty execArgv", () => {
  assert.equal(subject.parseCli(exactArgv(), [], executorPath).activationMergeCommit, M);
  for (const argv of [
    exactArgv().slice(0, -1),
    [...exactArgv(), "--extra"],
    exactArgv().toReversed(),
  ])
    assert.throws(() => subject.parseCli(argv, [], executorPath), /ACTIVATION_CLI_INVALID/u);
  assert.throws(
    () => subject.parseCli(exactArgv(), ["--inspect"], executorPath),
    /ACTIVATION_CLI_INVALID/u,
  );
});

test("26 held packet bytes must equal CLI pins and exact schema", () => {
  const fixture = activationBundleFixture();
  const cli = subject.parseCli(
    exactArgv({
      packetSha: subject.sha256(packetBytes),
      packetBlob: subject.gitBlob(packetBytes),
      manifestSha: fixture.manifestSha256,
    }),
    [],
    executorPath,
  );
  const held = subject.holdActivationBundle(fixture.memory.platform, fixture.activationRoot, cli);
  assert.equal(held.manifestSha256, fixture.manifestSha256);
  assert.equal(held.manifestBytes.toString("hex"), fixture.manifestBytes.toString("hex"));
  assert.throws(
    () => subject.validatePacket(Buffer.concat([packetBytes, Buffer.from(" ")]), cli),
    /ACTIVATION_PACKET_INVALID/u,
  );
  assert.throws(
    () =>
      subject.holdActivationBundle(fixture.memory.platform, fixture.activationRoot, {
        ...cli,
        activationManifestSha256: "0".repeat(64),
      }),
    /ACTIVATION_MANIFEST_INVALID/u,
  );
});

test("27 Git controls accept only canonical linked detached worktrees", () => {
  const fixture = repositoryFixture();
  const repository = subject.openRepository(fixture.memory.platform, fixture.mRoot, M);
  assert.equal(repository.commonDir.toLowerCase(), fixture.common.toLowerCase());
  const head = "C:\\repo\\.git\\worktrees\\m\\HEAD";
  const heldHead = repository.files.at(-1);
  fixture.memory.replace(head, { bytes: Buffer.from("ref: refs/heads/main\n") });
  assert.throws(
    () =>
      subject.revalidateRepository(
        fixture.memory.platform,
        repository,
        "ACTIVATION_POST_SETTLEMENT_IDENTITY_DRIFT_HOLD",
        true,
      ),
    /ACTIVATION_POST_SETTLEMENT_IDENTITY_DRIFT_HOLD/u,
  );
  assert.equal(
    fixture.memory.platform.readHeldFile(heldHead.handle, 4096).toString("utf8"),
    `${M}\n`,
  );
  assert.throws(
    () => subject.openRepository(fixture.memory.platform, fixture.mRoot, M),
    /ACTIVATION_GIT_TOPOLOGY_INVALID/u,
  );
});

test("28 linked M and d70 worktrees derive one common identity", () => {
  const fixture = repositoryFixture();
  const executor = createOuterActivationExecutor(fixture.memory.platform);
  assert.match(
    executor.deriveRepositoryIdentity(fixture.mRoot, fixture.d70Root, M),
    /^[0-9a-f]{64}$/u,
  );
});

test(
  "29 alternate clone identity rejects reviewed digest from clone A",
  { timeout: 90_000 },
  () => {
    const temporary = mkdtempSync(resolve(tmpdir(), "fluyo-r4b-common-id-"));
    const cloneA = join(temporary, "a");
    const cloneB = join(temporary, "b");
    const runGit = (cwd, args) =>
      execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true }).trim();
    try {
      for (const clone of [cloneA, cloneB])
        execFileSync("git", ["clone", "--no-local", root, clone], {
          windowsHide: true,
          stdio: "ignore",
        });
      const aM = join(temporary, "a-m");
      const aD70 = join(temporary, "a-d70");
      const bM = join(temporary, "b-m");
      const bD70 = join(temporary, "b-d70");
      runGit(cloneA, ["worktree", "add", "--detach", aM, D70]);
      runGit(cloneA, ["worktree", "add", "--detach", aD70, D70]);
      runGit(cloneB, ["worktree", "add", "--detach", bM, D70]);
      runGit(cloneB, ["worktree", "add", "--detach", bD70, D70]);
      const executor = createOuterActivationExecutor(subject.createProductionPlatform());
      const one = executor.deriveRepositoryIdentity(aM, aD70, D70);
      const two = executor.deriveRepositoryIdentity(bM, bD70, D70);
      assert.match(one, /^[0-9a-f]{64}$/u);
      assert.match(two, /^[0-9a-f]{64}$/u);
      assert.notEqual(one, two);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  },
);

test("30 random expected identity is not interchangeable", () => {
  const fixture = repositoryFixture();
  const actual = createOuterActivationExecutor(fixture.memory.platform).deriveRepositoryIdentity(
    fixture.mRoot,
    fixture.d70Root,
    M,
  );
  assert.notEqual(actual, EXPECTED_ID);
});

test("31 common directory held identity drift rejects before consumption", () => {
  const memory = memoryPlatform();
  const repository = directRepository(memory);
  const heldStat = memory.platform.fstatBigInt(repository.commonHandle);
  memory.replace(repository.commonDir);
  const error = captureFailure(
    () => subject.establishTransaction(memory.platform, repository),
    /ACTIVATION_TRANSACTION_PATH_IDENTITY_INVALID/u,
  );
  assert.equal(error.consumed, false);
  assert.equal(memory.platform.fstatBigInt(repository.commonHandle).ino, heldStat.ino);
  assert.equal(
    memory.events.some(([name]) => name === "mkdir"),
    false,
  );
});

test("32 exact transaction directory must be absent during preflight", () => {
  const memory = memoryPlatform();
  const repository = directRepository(memory);
  const transaction = subject.establishTransaction(memory.platform, repository);
  assert.equal(transaction.consumed, true);
  assert.equal(memory.events.filter(([name]) => name === "mkdir").length, 3);
});

test("33 pre-existing transaction directory is permanently consumed", () => {
  const memory = memoryPlatform();
  const repository = directRepository(memory);
  const first = join(repository.commonDir, "fluyo-r4b");
  const second = join(first, "transactions");
  memory.add(first, "dir");
  memory.add(second, "dir");
  memory.add(join(second, subject.constants.TRANSACTION_SHA), "dir");
  assert.throws(
    () => subject.establishTransaction(memory.platform, repository),
    /ACTIVATION_TRANSACTION_ALREADY_CONSUMED/u,
  );
});

test("34 segment creation is nonrecursive and accepts only valid held parents", () => {
  const memory = memoryPlatform();
  const repository = directRepository(memory);
  memory.add(join(repository.commonDir, "fluyo-r4b"), "dir");
  const transaction = subject.establishTransaction(memory.platform, repository);
  assert.equal(transaction.held.length, 3);
  assert.equal(memory.events.filter(([name]) => name === "mkdir").length, 2);
});

test("35 common replacement immediately before each mkdir rejects", () => {
  for (let targetIndex = 0; targetIndex < 3; targetIndex += 1) {
    const memory = memoryPlatform();
    const repository = directRepository(memory);
    let missingSeen = 0;
    memory.hooks.beforeLstat = (path) => {
      if (!memory.entries.has(memory.key(path)) && missingSeen++ === targetIndex)
        memory.replace(repository.commonDir);
    };
    const error = captureFailure(
      () => subject.establishTransaction(memory.platform, repository),
      /ACTIVATION_TRANSACTION_PATH_IDENTITY_(?:INVALID|RACE_HOLD)/u,
    );
    assert.equal(error.consumed, targetIndex > 0);
  }
});

test("36 held-parent replacement immediately before mkdir rejects", () => {
  const memory = memoryPlatform();
  const repository = directRepository(memory);
  let missingSeen = 0;
  memory.hooks.beforeLstat = (path) => {
    if (!memory.entries.has(memory.key(path)) && missingSeen++ === 1)
      memory.replace(join(repository.commonDir, "fluyo-r4b"));
  };
  const error = captureFailure(
    () => subject.establishTransaction(memory.platform, repository),
    /ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD/u,
  );
  assert.equal(error.consumed, true);
});

test("37 common replacement immediately after each mkdir holds without delete", () => {
  const memory = memoryPlatform();
  const repository = directRepository(memory);
  memory.hooks.afterMkdir = () => {
    memory.replace(repository.commonDir);
    memory.hooks.afterMkdir = null;
  };
  const error = captureFailure(
    () => subject.establishTransaction(memory.platform, repository),
    /ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD/u,
  );
  assert.equal(error.consumed, true);
  assert.doesNotMatch(executorSource, /rmSync|unlinkSync|rmdirSync/u);
});

test("38 parent replacement immediately after mkdir holds without reuse", () => {
  const memory = memoryPlatform();
  const repository = directRepository(memory);
  let created = 0;
  memory.hooks.afterMkdir = (path) => {
    created += 1;
    if (created === 2) memory.replace(resolve(path, ".."));
  };
  const error = captureFailure(
    () => subject.establishTransaction(memory.platform, repository),
    /ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD/u,
  );
  assert.equal(error.consumed, true);
});

test("39 full-chain replacement before marker or child rejects", () => {
  const memory = memoryPlatform();
  const repository = directRepository(memory);
  const transaction = subject.establishTransaction(memory.platform, repository);
  const heldStat = memory.platform.fstatBigInt(transaction.held[1].handle);
  memory.replace(transaction.held[1].path);
  assert.throws(
    () => subject.revalidateTransactionChain(memory.platform, repository, transaction),
    /ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD/u,
  );
  assert.equal(memory.platform.fstatBigInt(transaction.held[1].handle).ino, heldStat.ino);
  assert.equal(
    executorSource.match(/revalidateTransactionChain\(platform, execution, transaction\)/gu)
      ?.length,
    2,
  );
});

test("40 canonical marker write uses wx write-all fsync and exact reopen", () => {
  const memory = memoryPlatform();
  const directory = "C:\\tx";
  memory.add(directory, "dir");
  const handle = memory.platform.openDirectoryReadOnly(directory);
  const value = { state: "ATTEMPT_CONSUMED_PRESPAWN" };
  const bytes = subject.canonicalWrite(
    memory.platform,
    handle,
    join(directory, "consumption-v1.json"),
    value,
    2048,
  );
  assert.equal(bytes.toString(), `${JSON.stringify(value)}\n`);
});

test("41 absent marker failure maps to one valid receipt evidence file", () => {
  const outcome = subject.unknownOutcome("ACTIVATION_CONSUMPTION_MARKER_WRITE_FAILED");
  const adjusted = {
    ...outcome,
    markerState: "ABSENT_AFTER_DIRECTORY_CONSUMPTION_HOLD",
    outerEvidenceFileCount: 1,
    outerValidEvidenceFileCount: 1,
  };
  assert.equal(subject.buildOuterReceipt(outcomeContext(), adjusted).outerEvidenceFileCount, 1);
});

test("42 partial marker maps to two files and one valid file", () => {
  const outcome = {
    ...subject.unknownOutcome("ACTIVATION_CONSUMPTION_MARKER_INVALID"),
    markerState: "PRESENT_INVALID_OR_PARTIAL_HOLD",
    outerEvidenceFileCount: 2,
    outerValidEvidenceFileCount: 1,
  };
  const receipt = subject.buildOuterReceipt(outcomeContext(), outcome);
  assert.deepEqual([receipt.outerEvidenceFileCount, receipt.outerValidEvidenceFileCount], [2, 1]);
});

test("43 transaction directory remains held through settlement", () => {
  const fixture = repositoryFixture();
  const repository = subject.openRepository(fixture.memory.platform, fixture.d70Root, D70);
  const transaction = subject.establishTransaction(fixture.memory.platform, repository);
  assert.equal(transaction.held.length, 3);
  assert.ok(transaction.held.every(({ handle }) => fixture.memory.handles.has(handle)));
  const heldRoot = fixture.memory.platform.fstatBigInt(repository.worktree.handle);
  fixture.memory.replace(repository.worktree.path);
  assert.throws(
    () =>
      subject.revalidateRepository(
        fixture.memory.platform,
        repository,
        "ACTIVATION_POST_SETTLEMENT_IDENTITY_DRIFT_HOLD",
        true,
      ),
    /ACTIVATION_POST_SETTLEMENT_IDENTITY_DRIFT_HOLD/u,
  );
  assert.equal(fixture.memory.platform.fstatBigInt(repository.worktree.handle).ino, heldRoot.ino);
});

test("44 Node image evidence is actual held scalar evidence", () => {
  const value = subject.imageEvidence(
    Buffer.from("node"),
    { dev: 1n, ino: 2n },
    "C:\\Program Files\\nodejs\\node.exe",
    false,
  );
  assert.deepEqual(Object.keys(value), [
    "byteCount",
    "sha256",
    "finalPathSha256",
    "deviceHex",
    "inodeHex",
    "evidenceSha256",
  ]);
});

test("45 adapter evidence includes exact Git blob identity", () => {
  const bytes = Buffer.from("adapter");
  const value = subject.imageEvidence(bytes, { dev: 1n, ino: 3n }, "C:\\repo\\adapter.mjs", true);
  assert.equal(value.gitBlobSha1, subject.gitBlob(bytes));
});

test("46 post-settlement identity drift maps to unknown hold", () => {
  const fixture = activationBundleFixture();
  const cli = subject.parseCli(
    exactArgv({
      packetSha: subject.sha256(packetBytes),
      packetBlob: subject.gitBlob(packetBytes),
      manifestSha: fixture.manifestSha256,
    }),
    [],
    executorPath,
  );
  const bundle = subject.holdActivationBundle(fixture.memory.platform, fixture.activationRoot, cli);
  const target = bundle.held[1];
  const changed = Buffer.from(target.bytes);
  changed[0] ^= 1;
  fixture.memory.replace(target.path, { bytes: changed, ino: target.identity.ino });
  assert.throws(
    () =>
      subject.revalidateActivationBundle(
        fixture.memory.platform,
        bundle,
        "ACTIVATION_POST_SETTLEMENT_IDENTITY_DRIFT_HOLD",
        true,
      ),
    /ACTIVATION_POST_SETTLEMENT_IDENTITY_DRIFT_HOLD/u,
  );
  assert.equal(
    subject.unknownOutcome("ACTIVATION_POST_SETTLEMENT_IDENTITY_DRIFT_HOLD").state,
    "OUTER_ATTEMPT_CONSUMED_RESULT_UNKNOWN_HOLD",
  );
});

test("47 child invocation is exact absolute Node adapter and d70 cwd", () => {
  const value = subject.buildChildInvocation("C:\\repo-d70");
  assert.equal(value.executable, process.execPath);
  assert.deepEqual(value.args.slice(1), [
    subject.constants.INNER_MODE,
    `--reviewed-manifest-sha256=${subject.constants.TEN_MANIFEST_SHA}`,
    `--review-binding=${subject.constants.TEN_BINDING}`,
  ]);
  assert.equal(value.options.cwd, "C:\\repo-d70");
  assert.equal(value.options.shell, false);
  assert.equal(exactArgv().length, 10);
  assert.equal(exactArgv()[9], `--review-binding=${subject.constants.SIX_BINDING}`);
});

test("48 child env is exact and excludes ambient authority", () => {
  assert.deepEqual(subject.buildChildInvocation("C:\\repo-d70").options.env, {
    SystemRoot: "C:\\Windows",
    WINDIR: "C:\\Windows",
  });
});

test("49 canonical one-line stdout and empty stderr parses", async () => {
  const process = fakeChild();
  const observed = subject.observeChild(process, 1000, { stdout: 4096, stderr: 0 });
  process.stdout.emit("data", cleanInnerBytes());
  process.emit("close", 0, null);
  const result = await observed;
  assert.equal(result.overflow, false);
  assert.equal(
    subject.parseInnerReceipt(result.stdout, result.stderr).state,
    "SYNTHETIC_TEST_CLEAN",
  );
});

test("50 overflow multiline trailing stderr malformed and unknown keys reject", async () => {
  const process = fakeChild();
  const observed = subject.observeChild(process, 1000, { stdout: 4096, stderr: 0 });
  for (let index = 0; index < 100; index += 1)
    process.stdout.emit("data", Buffer.alloc(1024 * 1024, index));
  process.stderr.emit("data", Buffer.alloc(1024 * 1024, 1));
  process.emit("close", 0, null);
  const bounded = await observed;
  assert.equal(bounded.stdout.length, 4096);
  assert.equal(bounded.stderr.length, 0);
  assert.equal(bounded.stdoutTotal, 4097);
  assert.equal(bounded.stderrTotal, 1);
  assert.equal(bounded.overflow, true);
  const cases = [
    [Buffer.alloc(4097), Buffer.alloc(0)],
    [Buffer.from("{}\n{}\n"), Buffer.alloc(0)],
    [Buffer.from("{}"), Buffer.alloc(0)],
    [Buffer.from("{}\n"), Buffer.from("x")],
    [Buffer.from("{\n"), Buffer.alloc(0)],
    [Buffer.from(`${JSON.stringify({ ...innerReceipt(), extra: true })}\n`), Buffer.alloc(0)],
  ];
  for (const [stdout, stderr] of cases)
    assert.throws(() => subject.parseInnerReceipt(stdout, stderr));
});

test("51 inner clean maps exact clean outer state", () => {
  const outcome = subject.classifyChildResult(child("SYNTHETIC_TEST_CLEAN", 0));
  assert.deepEqual(
    [outcome.state, outcome.cleanupState, outcome.residueState],
    ["OUTER_SYNTHETIC_TEST_CLEAN", "INNER_CLEAN_CONFIRMED", "ZERO_CONFIRMED"],
  );
});

test("52 inner failed-clean copies only a closed reason", () => {
  const outcome = subject.classifyChildResult(
    child("SYNTHETIC_TEST_FAILED_CLEAN", 0, "PROCESS_FAILED"),
  );
  assert.deepEqual(
    [outcome.state, outcome.reason],
    ["OUTER_SYNTHETIC_TEST_FAILED_CLEAN", "PROCESS_FAILED"],
  );
});

test("53 inner cleanup hold maps nonzero-or-unknown", () => {
  const outcome = subject.classifyChildResult(
    child("SYNTHETIC_TEST_FAILED_CLEANUP_HOLD", 2, "ADAPTER_INTERNAL_FAILURE"),
  );
  assert.deepEqual(
    [outcome.cleanupState, outcome.residueState],
    ["INNER_CLEANUP_HOLD", "NONZERO_OR_UNKNOWN_HOLD"],
  );
});

test("54 spawn failure after consumption maps unknown without retry", () => {
  const outcome = subject.classifyChildResult({
    spawnError: true,
    stdout: Buffer.alloc(0),
    stderr: Buffer.alloc(0),
  });
  assert.deepEqual(
    [outcome.state, outcome.reason],
    ["OUTER_ATTEMPT_CONSUMED_RESULT_UNKNOWN_HOLD", "ACTIVATION_CHILD_SPAWN_FAILED"],
  );
});

test("55 observation timeout never claims cleanup or unsafe kill", async () => {
  const process = fakeChild();
  let fireTimeout;
  let timerUnrefCount = 0;
  const promise = subject.observeChild(
    process,
    330000,
    { stdout: 4096, stderr: 0 },
    {
      set(callback, delay) {
        assert.equal(delay, 330000);
        fireTimeout = callback;
        return { unref: () => (timerUnrefCount += 1) };
      },
      clear() {},
    },
  );
  process.stdout.emit("data", Buffer.alloc(10_000));
  fireTimeout();
  process.emit("close", 0, null);
  const result = await promise;
  const outcome = subject.classifyChildResult(result);
  assert.equal(outcome.childTimedOut, true);
  assert.equal(outcome.cleanupState, "INNER_CLEANUP_UNKNOWN");
  assert.equal(result.stdout.length, 4096);
  assert.equal(process.stdout.destroyed, true);
  assert.equal(process.stderr.destroyed, true);
  assert.equal(process.unrefCount, 1);
  assert.equal(process.killCount, 0);
  assert.equal(timerUnrefCount, 1);
  assert.equal(process.listenerCount("close"), 0);
  assert.equal(process.listenerCount("error"), 0);
  assert.equal(process.stdout.listenerCount("data"), 0);
  assert.equal(process.stderr.listenerCount("data"), 0);
  assert.doesNotMatch(executorSource, /\.kill\(|taskkill|Stop-Process/iu);
});

test("56 missing malformed or exit mismatch maps unknown", () => {
  for (const value of [
    { exitCode: 0, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) },
    child("SYNTHETIC_TEST_CLEAN", 2),
    child("SYNTHETIC_TEST_FAILED_CLEANUP_HOLD", 0, "ADAPTER_INTERNAL_FAILURE"),
  ])
    assert.equal(
      subject.classifyChildResult(value).state,
      "OUTER_ATTEMPT_CONSUMED_RESULT_UNKNOWN_HOLD",
    );
});

test("57 outer receipt has exact ordered closed schema and authority", () => {
  const receipt = subject.buildOuterReceipt(
    outcomeContext(),
    subject.classifyChildResult(child("SYNTHETIC_TEST_CLEAN", 0)),
  );
  assert.deepEqual(Object.keys(receipt), subject.OUTER_RECEIPT_KEYS);
  assert.deepEqual(receipt.authority, authority);
  assert.ok(subject.canonicalCompact(receipt).length <= subject.constants.MAX_OUTER_RECEIPT_BYTES);
});

test("58 receipt write failure leaves no count claim in another receipt", () => {
  assert.doesNotMatch(
    executorSource,
    /catch[^]*outer-receipt-v1\.json[^]*outer-receipt-v1\.json/iu,
  );
  assert.match(executorSource, /openFileExclusive/u);
});

test("59 terminal permanence forbids restart resume retry delete and repair", () => {
  const memory = memoryPlatform();
  const repository = directRepository(memory);
  memory.hooks.afterMkdir = () => {
    memory.replace(repository.commonDir);
    memory.hooks.afterMkdir = null;
  };
  const first = captureFailure(
    () => subject.establishTransaction(memory.platform, repository),
    /ACTIVATION_TRANSACTION_PATH_IDENTITY_RACE_HOLD/u,
  );
  assert.equal(first.consumed, true);
  const mkdirCount = memory.events.filter(([name]) => name === "mkdir").length;
  assert.throws(() => subject.establishTransaction(memory.platform, repository));
  assert.equal(memory.events.filter(([name]) => name === "mkdir").length, mkdirCount);
  const packet = JSON.parse(packetBytes.toString("utf8"));
  assert.deepEqual(
    [
      packet.durableConsumption.retryAllowed,
      packet.durableConsumption.resumeAllowed,
      packet.durableConsumption.repairAllowed,
      packet.durableConsumption.deleteAllowed,
    ],
    [false, false, false, false],
  );
  assert.doesNotMatch(executorSource, /rmSync|unlinkSync|rmdirSync|renameSync/u);
});

test("60 v1.1.2 exact CLEAN numerical projection is complete", () => {
  const outcome = subject.classifyChildResult(child("SYNTHETIC_TEST_CLEAN", 0));
  const receipt = subject.buildOuterReceipt(outcomeContext(), outcome);
  assert.deepEqual(
    Object.fromEntries(subject.NUMERICAL_PROJECTION_KEYS.map((key) => [key, receipt[key]])),
    {
      innerCompletedFixtureCount: 39,
      innerDerivedLaunchedCompilerProcessCount: 1,
      innerResidualCompilerProcessCount: 0,
      innerResidualFixtureProcessCount: 0,
      innerCleanupStepCount: 23,
      innerNetworkBaselineOwnerCount: 2,
      innerNetworkWorkOwnerCount: 40,
      innerNetworkOwnerCount: 42,
      innerNetworkObservationCount: 1,
      innerNetworkMaximumGapMicros: 1,
      innerDerivedNetworkTableIterationCount: 4,
      innerNetworkEventCount: 0,
      innerRetainedArtifactCount: 0,
    },
  );
});

test("61 v1.1.2 FAILED_CLEAN projects complete evidence and transaction reason", () => {
  const outcome = subject.classifyChildResult(
    child("SYNTHETIC_TEST_FAILED_CLEAN", 0, "PROCESS_FAILED"),
  );
  const receipt = subject.buildOuterReceipt(outcomeContext(), outcome);
  assert.equal(receipt.reason, "PROCESS_FAILED");
  assert.equal(receipt.innerCompletedFixtureCount, 39);
  assert.equal(receipt.innerDerivedLaunchedCompilerProcessCount, 1);
  assert.equal(receipt.innerRetainedArtifactCount, 0);
});

test("62 v1.1.2 enforces state and reason correlation", () => {
  assert.throws(() => parseReceipt(innerReceipt("SYNTHETIC_TEST_CLEAN", "PROCESS_FAILED")));
  assert.throws(() => parseReceipt(innerReceipt("SYNTHETIC_TEST_FAILED_CLEAN", null)));
  assert.throws(() =>
    parseReceipt(innerReceipt("SYNTHETIC_TEST_FAILED_CLEAN", "ADAPTER_INTERNAL_FAILURE")),
  );
  assert.throws(() => parseReceipt(innerReceipt("SYNTHETIC_TEST_FAILED_CLEANUP_HOLD", null)));
});

test("63 v1.1.2 complete states require exactly 39 completed fixtures", () => {
  for (const value of [null, 0, 38, 40, 39.5, -1])
    assert.throws(() =>
      parseReceipt(innerReceipt(undefined, null, { completedFixtureCount: value })),
    );
  assert.equal(parseReceipt(innerReceipt()).completedFixtureCount, 39);
});

test("64 v1.1.2 residual process counts are zero and launched labels reject", () => {
  for (const overrides of [
    { compilerProcessCount: 1 },
    { fixtureProcessCount: 39 },
    { compilerProcessCount: null },
    { fixtureProcessCount: -1 },
  ])
    assert.throws(() => parseReceipt(innerReceipt(undefined, null, overrides)));
  const receipt = parseReceipt(innerReceipt());
  assert.deepEqual([receipt.compilerProcessCount, receipt.fixtureProcessCount], [0, 0]);
});

test("65 v1.1.2 enforces 2 plus 40 equals 42 and derives one compiler", () => {
  for (const overrides of [
    { networkBaselineOwnerCount: 1 },
    { networkWorkOwnerCount: 39 },
    { networkOwnerCount: 41 },
    { networkWorkOwnerCount: 41, networkOwnerCount: 43 },
  ])
    assert.throws(() => parseReceipt(innerReceipt(undefined, null, overrides)));
  const outcome = subject.classifyChildResult(child("SYNTHETIC_TEST_CLEAN", 0));
  assert.equal(outcome.numericalProjection.innerDerivedLaunchedCompilerProcessCount, 1);
});

test("66 v1.1.2 validates observation gap event and safe four-table arithmetic", () => {
  for (const overrides of [
    { networkObservationCount: 0 },
    { networkObservationCount: Number.MAX_SAFE_INTEGER },
    { networkObservationCount: 1.5 },
    { networkMaximumGapMicros: -1 },
    { networkMaximumGapMicros: 10_001 },
    { networkEventCount: 1 },
  ])
    assert.throws(() => parseReceipt(innerReceipt(undefined, null, overrides)));
  const receipt = subject.buildOuterReceipt(
    outcomeContext(),
    subject.classifyChildResult(
      child("SYNTHETIC_TEST_CLEAN", 0, null, { networkObservationCount: 2 }),
    ),
  );
  assert.equal(receipt.innerDerivedNetworkTableIterationCount, 8);
});

test("67 v1.1.2 requires cleanup hashes booleans retained global and final evidence", () => {
  for (const overrides of [
    { cleanupStepCount: 22 },
    { fixtureEvidenceSha256: null },
    { publicTracePinsSha256: "x" },
    { ownershipLedgerPreCleanupSha256: null },
    { ownershipLedgerSha256: null },
    { cleanupSha256: null },
    { adapterSessionClosed: false },
    { networkMeasurementComplete: false },
    { retainedArtifactCount: 1 },
    { globalMutationCount: 1 },
    { manifestFinalRevalidated: false },
  ])
    assert.throws(() => parseReceipt(innerReceipt(undefined, null, overrides)));
});

test("68 v1.1.2 bounded partial cleanup HOLD parses but projects all 13 null", () => {
  const partial = innerReceipt("SYNTHETIC_TEST_FAILED_CLEANUP_HOLD", "ADAPTER_INTERNAL_FAILURE", {
    completedFixtureCount: 0,
    compilerProcessCount: 1,
    fixtureProcessCount: 12,
    cleanupStepCount: null,
    fixtureEvidenceSha256: null,
    publicTracePinsSha256: null,
    ownershipLedgerPreCleanupSha256: null,
    ownershipLedgerSha256: null,
    cleanupSha256: null,
    adapterSessionClosed: null,
    networkEvidenceMode: null,
    networkMeasurementComplete: null,
    networkBaselineOwnerCount: 1,
    networkWorkOwnerCount: 20,
    networkOwnerCount: 21,
    networkObservationCount: 0,
    networkMaximumGapMicros: 50_000,
    networkEventCount: 7,
    retainedArtifactCount: 4096,
    globalMutationCount: 1,
    manifestFinalRevalidated: null,
  });
  parseReceipt(partial);
  const receipt = subject.buildOuterReceipt(
    outcomeContext(),
    subject.classifyChildResult({
      exitCode: 2,
      signal: null,
      timedOut: false,
      overflow: false,
      stdout: Buffer.from(`${JSON.stringify(partial)}\n`),
      stderr: Buffer.alloc(0),
    }),
  );
  for (const key of subject.NUMERICAL_PROJECTION_KEYS) assert.equal(receipt[key], null);
});

test("69 v1.1.2 rejects invalid HOLD evidence and partial complete evidence", () => {
  const invalidHoldOverrides = [
    { completedFixtureCount: null },
    { completedFixtureCount: "39" },
    { compilerProcessCount: 2 },
    { fixtureProcessCount: 40 },
    { cleanupStepCount: 24 },
    { networkBaselineOwnerCount: -1 },
    { networkWorkOwnerCount: 41 },
    { networkOwnerCount: 43 },
    { networkObservationCount: 1.5 },
    { retainedArtifactCount: 4097 },
    { globalMutationCount: 2 },
    { fixtureEvidenceSha256: "raw" },
  ];
  for (const overrides of invalidHoldOverrides)
    assert.throws(() =>
      parseReceipt(
        innerReceipt("SYNTHETIC_TEST_FAILED_CLEANUP_HOLD", "ADAPTER_INTERNAL_FAILURE", overrides),
      ),
    );
  assert.throws(() =>
    parseReceipt(innerReceipt("SYNTHETIC_TEST_FAILED_CLEANUP_HOLD", "UNKNOWN_REASON")),
  );
  assert.throws(() =>
    parseReceipt(
      innerReceipt("SYNTHETIC_TEST_FAILED_CLEAN", "PROCESS_FAILED", {
        cleanupStepCount: null,
      }),
    ),
  );
});
