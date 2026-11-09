import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { canonicalJson, parseStrictJson, sha256 } from "./root-only-closure-plan.generator.mjs";
import {
  assertAttempt004MigrationReady,
  assertTrackedOutputBrokerBuild,
  validateHelperPeMigrationA3Shape,
  validateHelperPeMigrationBundle,
  validateHelperPeMigrationGapsShape,
  validateHelperPeMigrationIndexShape,
  validateInstallContractShape,
  validateOutputBrokerContractShape,
} from "./root-only-closure-schema.mjs";
import { outputBrokerTesting } from "./root-only-output-broker.mjs";

const CONTRACT = new URL("./root-only-output-broker-contract.json", import.meta.url);
const MIGRATION_A3 = new URL("./root-only-helper-pe-migration-a3.json", import.meta.url);
const MIGRATION_GAPS = new URL("./root-only-helper-pe-migration-gaps.json", import.meta.url);
const MIGRATION_INDEX = new URL("./root-only-helper-pe-migration-index.json", import.meta.url);
const INSTALL_CONTRACT = new URL("./root-only-install-contract.json", import.meta.url);
const ROOT = new URL("../../", import.meta.url);
const SOURCE = new URL("./root-only-output-broker.cs", import.meta.url);
const EXECUTABLE = new URL("./root-only-output-broker.exe", import.meta.url);

test("output broker contract binds repaired source while failing closed on the stale production PE", () => {
  const contract = validateOutputBrokerContractShape(
    parseStrictJson(readFileSync(CONTRACT), "output broker contract"),
  );
  const source = readFileSync(SOURCE);
  assert.equal(source.length, contract.source.bytes);
  assert.equal(sha256(source), contract.source.sha256);
  assert.equal(contract.productionExecutable.status, "STALE_REBUILD_REQUIRED");
  assert.equal(
    contract.productionExecutable.sourceSha256,
    "76d42ad509a4b83757d32df6ca1214eb49d62f07ebf52953fde9e79aa521e691",
  );
  assert.notEqual(contract.productionExecutable.sourceSha256, sha256(source));
  assert.equal(contract.testingExecutable.status, "PENDING_APPROVED_BUILD");
  assert.deepEqual(contract.authorityBinding.receiptFields, [
    "approvedAuthorityDigest",
    "approvedHead",
    "approvedTree",
    "trustedParentHead",
    "trustedParentTree",
  ]);
});

test("tracked-build guard rejects the stale PE before reading execution authority and leaves tracked artifacts unchanged", () => {
  const retained = [EXECUTABLE, MIGRATION_A3, MIGRATION_GAPS, MIGRATION_INDEX, INSTALL_CONTRACT];
  const before = retained.map((path) => sha256(readFileSync(path)));
  assert.throws(
    () => assertTrackedOutputBrokerBuild(fileURLToPath(ROOT)),
    /STALE_REBUILD_REQUIRED/u,
  );
  assert.deepEqual(
    retained.map((path) => sha256(readFileSync(path))),
    before,
  );
  const schemaSource = readFileSync(
    new URL("./root-only-closure-schema.mjs", import.meta.url),
    "utf8",
  );
  assert.ok(
    schemaSource.indexOf('status === "STALE_REBUILD_REQUIRED"') <
      schemaSource.indexOf("const installContractPath"),
  );
  assert.doesNotMatch(
    schemaSource,
    /validateHelperPeBuildManifestShape|Attempt003 manifest|helper PE build manifest/u,
  );
  assert.doesNotMatch(
    schemaSource,
    /\b(?:spawn|spawnSync|exec|execSync|writeFileSync|mkdirSync|renameSync|unlinkSync|rmSync|openSync)\s*\(/u,
  );
});

test("output broker schemas reject fake status, authority, install, source, PE, and migration identities", () => {
  const contract = parseStrictJson(readFileSync(CONTRACT), "output broker contract");
  const fakeStatus = structuredClone(contract);
  fakeStatus.productionExecutable.status = "APPROVED_BUILD";
  assert.throws(
    () => validateOutputBrokerContractShape(fakeStatus),
    /production executable identity/u,
  );
  const falseEquality = structuredClone(contract);
  falseEquality.productionExecutable.sourceSha256 = falseEquality.source.sha256;
  assert.throws(
    () => validateOutputBrokerContractShape(falseEquality),
    /stale production executable binding/u,
  );
  const fakeAuthority = structuredClone(contract);
  fakeAuthority.authorityBinding.relation = "ANY_PARENT";
  assert.throws(() => validateOutputBrokerContractShape(fakeAuthority), /authority binding/u);
  const install = parseStrictJson(readFileSync(INSTALL_CONTRACT), "install contract");
  const fakeInstallSource = structuredClone(install);
  fakeInstallSource.executables.outputBroker.source.mode = "100755";
  assert.throws(() => validateInstallContractShape(fakeInstallSource), /path\/mode/u);
  const fakeInstallPe = structuredClone(install);
  fakeInstallPe.executables.outputBroker.executable.machine = "ARM64";
  assert.throws(() => validateInstallContractShape(fakeInstallPe), /PE identity/u);
  const a3 = parseStrictJson(readFileSync(MIGRATION_A3), "helper PE migration A3");
  const fakeA3 = structuredClone(a3);
  fakeA3.v1.bytes = 8233;
  assert.throws(() => validateHelperPeMigrationA3Shape(fakeA3), /v1 facts/u);
  const rawRetention = structuredClone(a3);
  rawRetention.v1.content = "private";
  assert.throws(
    () => validateHelperPeMigrationA3Shape(rawRetention),
    /unknown, missing, or reordered/u,
  );
  const gaps = parseStrictJson(readFileSync(MIGRATION_GAPS), "helper PE migration gaps");
  const reorderedGaps = structuredClone(gaps);
  reorderedGaps.gaps.reverse();
  assert.throws(() => validateHelperPeMigrationGapsShape(reorderedGaps), /gaps changed/u);
  const changedGap = structuredClone(gaps);
  changedGap.gaps[2].status = "CLOSED";
  assert.throws(() => validateHelperPeMigrationGapsShape(changedGap), /gaps changed/u);
  const index = parseStrictJson(readFileSync(MIGRATION_INDEX), "helper PE migration index");
  assert.throws(
    () => validateHelperPeMigrationIndexShape({ ...index, v1Sha256: a3.v1.sha256 }),
    /unknown, missing, or reordered/u,
  );
});

test("sanitized A3 migration retains only approved v1 facts and blocks Attempt004", () => {
  const a3Bytes = readFileSync(MIGRATION_A3);
  const gapsBytes = readFileSync(MIGRATION_GAPS);
  const indexBytes = readFileSync(MIGRATION_INDEX);
  const index = validateHelperPeMigrationIndexShape(
    parseStrictJson(indexBytes, "helper PE migration index"),
  );
  const a3 = validateHelperPeMigrationA3Shape(parseStrictJson(a3Bytes, "helper PE migration A3"));
  const gaps = validateHelperPeMigrationGapsShape(
    parseStrictJson(gapsBytes, "helper PE migration gaps"),
  );
  assert.equal(index.a3Sha256, sha256(a3Bytes));
  assert.equal(index.migrationGapsSha256, sha256(gapsBytes));
  assert.deepEqual(Object.keys(a3.v1), ["sha256", "bytes", "migrationReason"]);
  assert.deepEqual(
    gaps.gaps.map((gap) => gap.status),
    [
      "PERMANENT_NONBLOCKING",
      "PERMANENT_NONBLOCKING",
      "OPEN_BLOCKING",
      "OPEN_BLOCKING",
      "OPEN_BLOCKING",
    ],
  );
  const retainedText = `${a3Bytes.toString("utf8")}\n${gapsBytes.toString("utf8")}\n${indexBytes.toString("utf8")}`;
  for (const forbidden of [
    "buildRoot",
    "compiler",
    "environment",
    "references",
    "helpers",
    "argv",
    "attempt-003",
    "C:\\\\",
    "recoveryPointer",
    "contentExcerpt",
  ])
    assert.equal(
      retainedText.includes(forbidden),
      false,
      `retained forbidden v1 field: ${forbidden}`,
    );
  const bundle = validateHelperPeMigrationBundle(fileURLToPath(ROOT));
  assert.throws(() => assertAttempt004MigrationReady(bundle), /migration gaps remain open/u);
  assert.equal(
    validateOutputBrokerContractShape(
      parseStrictJson(readFileSync(CONTRACT), "output broker contract"),
    ).productionExecutable.status,
    "STALE_REBUILD_REQUIRED",
  );
});

test("production broker source exposes the frozen protocol surface without testing hooks", () => {
  const source = readFileSync(SOURCE, "utf8");
  for (const primitive of [
    "NtCreateFile",
    "NtSetInformationFile",
    "FlushFileBuffers",
    "ObjDontReparse",
    "ROOT_ONLY_OUTPUT_BROKER_V1",
    "CHALLENGE",
    "ENSURE_DESTINATION",
    "BEGIN_FILE",
    "WRITE",
    "COMMIT_FILE",
    "ABORT_FILE",
    "SPAWN_BATCH",
    "SPAWN_INTERACTIVE",
    "CHILD_WRITE",
    "CHILD_READ",
    "CHILD_CLOSE_STDIN",
    "WAIT_CHILD",
    "PREPARE_PASS",
    "WRITE_TERMINAL",
    "PUBLISH_PASS",
    "CLOSE",
  ])
    assert.equal(source.includes(primitive), true, `missing ${primitive}`);
  assert.doesNotMatch(
    source,
    /(?<![A-Za-z0-9])(?:TEST_(?:ARM|BARRIER|RESUME)|fault(?:Hook|Injection|Point|Mode|Barrier|Trigger)?|injection(?:Hook|Fault|Point|Mode|Barrier|Trigger)?)(?![A-Za-z0-9])/iu,
  );
});

test("broker client frame uses uint32be, canonical payload, and domain-separated authentication", () => {
  const body = { approvedHead: "1".repeat(40) };
  const envelope = {
    auth: "2".repeat(64),
    body,
    direction: "REQUEST",
    seq: 1,
    sessionId: "3".repeat(64),
    type: "OPEN",
  };
  const frame = outputBrokerTesting.encodeFrame(envelope);
  assert.equal(frame.readUInt32BE(0), frame.length - 4);
  assert.equal(frame.subarray(4).toString("utf8"), canonicalJson(envelope));
  assert.match(
    outputBrokerTesting.frameAuth("4".repeat(64), "REQUEST", "5".repeat(64), 1, "OPEN", body),
    /^[0-9a-f]{64}$/u,
  );
});

test("broker authority state keeps operator-approved child A distinct from derived parent P", () => {
  const approvals = {
    approvedHead: "a".repeat(40),
    approvedTree: "b".repeat(40),
    approvedAuthorityDigest: "e".repeat(64),
  };
  const authorityState = {
    approvedAuthorityDigest: approvals.approvedAuthorityDigest,
    approvedHead: approvals.approvedHead,
    approvedTree: approvals.approvedTree,
    trustedParentHead: "c".repeat(40),
    trustedParentTree: "d".repeat(40),
  };
  assert.equal(
    outputBrokerTesting.validateAuthorityState(approvals, authorityState),
    authorityState,
  );
  const args = outputBrokerTesting.brokerArguments({
    phase: "CONTROLLER",
    checkoutRoot: "C:\\repo",
    brokerContractRelative: "scripts/r4b-evidence/root-only-output-broker-contract.json",
    brokerContractDigest: "1".repeat(64),
    executionContractRelative: "scripts/r4b-evidence/root-only-install-contract.json",
    executionContractDigest: "2".repeat(64),
    authorityState,
  });
  assert.equal(args.length, 23);
  assert.deepEqual(args.slice(13), [
    "--approved-head",
    authorityState.approvedHead,
    "--approved-tree",
    authorityState.approvedTree,
    "--trusted-parent-head",
    authorityState.trustedParentHead,
    "--trusted-parent-tree",
    authorityState.trustedParentTree,
    "--approved-authority-digest",
    authorityState.approvedAuthorityDigest,
  ]);
  for (const key of ["approvedHead", "approvedTree", "approvedAuthorityDigest"]) {
    const changed = {
      ...authorityState,
      [key]: key === "approvedAuthorityDigest" ? "f".repeat(64) : "f".repeat(40),
    };
    assert.throws(
      () => outputBrokerTesting.validateAuthorityState(approvals, changed),
      /differs from operator approvals/u,
    );
  }
  for (const key of ["trustedParentHead", "trustedParentTree"]) {
    const changed = {
      ...authorityState,
      [key]: authorityState[key === "trustedParentHead" ? "approvedHead" : "approvedTree"],
    };
    assert.throws(
      () => outputBrokerTesting.validateAuthorityState(approvals, changed),
      /must differ/u,
    );
  }
  const reordered = {
    approvedHead: authorityState.approvedHead,
    approvedAuthorityDigest: authorityState.approvedAuthorityDigest,
    approvedTree: authorityState.approvedTree,
    trustedParentHead: authorityState.trustedParentHead,
    trustedParentTree: authorityState.trustedParentTree,
  };
  assert.throws(
    () => outputBrokerTesting.validateAuthorityState(approvals, reordered),
    /reordered/u,
  );
});

test("OPEN and session receipt bind all five authority identities with exact schemas", () => {
  const authorityState = {
    approvedAuthorityDigest: "e".repeat(64),
    approvedHead: "a".repeat(40),
    approvedTree: "b".repeat(40),
    trustedParentHead: "c".repeat(40),
    trustedParentTree: "d".repeat(40),
  };
  const open = {
    approvedAuthorityDigest: authorityState.approvedAuthorityDigest,
    approvedHead: authorityState.approvedHead,
    approvedTree: authorityState.approvedTree,
    brokerContractDigest: "1".repeat(64),
    executionContractDigest: "2".repeat(64),
    phase: "CONTROLLER",
    trustedParentHead: authorityState.trustedParentHead,
    trustedParentTree: authorityState.trustedParentTree,
  };
  assert.equal(outputBrokerTesting.validateOpenBody(authorityState, open), open);
  for (const key of [
    "approvedHead",
    "approvedTree",
    "trustedParentHead",
    "trustedParentTree",
    "approvedAuthorityDigest",
  ])
    assert.throws(
      () =>
        outputBrokerTesting.validateOpenBody(authorityState, {
          ...open,
          [key]: key.endsWith("Digest") ? "f".repeat(64) : "f".repeat(40),
        }),
      /changed/u,
    );
  assert.throws(
    () => outputBrokerTesting.validateOpenBody(authorityState, { ...open, unknown: true }),
    /unknown/u,
  );
  const unsigned = {
    approvedAuthorityDigest: authorityState.approvedAuthorityDigest,
    approvedHead: authorityState.approvedHead,
    approvedTree: authorityState.approvedTree,
    artifacts: [],
    brokerIdentity: {},
    checkoutIdentity: {},
    contractDigest: "2".repeat(64),
    finalState: "CLOSED",
    phase: "CONTROLLER",
    publicationDigest: null,
    sequenceFinal: 2,
    spawns: [],
    trustedParentHead: authorityState.trustedParentHead,
    trustedParentTree: authorityState.trustedParentTree,
  };
  const receipt = {
    ...unsigned,
    receiptSha256: sha256(`fluyo:r4b:output-broker-session:v1\0${canonicalJson(unsigned)}`),
  };
  assert.equal(outputBrokerTesting.validateSessionReceipt(authorityState, receipt), receipt);
  for (const key of [
    "approvedHead",
    "approvedTree",
    "trustedParentHead",
    "trustedParentTree",
    "approvedAuthorityDigest",
  ])
    assert.throws(
      () =>
        outputBrokerTesting.validateSessionReceipt(authorityState, {
          ...receipt,
          [key]: key.endsWith("Digest") ? "f".repeat(64) : "f".repeat(40),
        }),
      /changed/u,
    );
  const missing = { ...receipt };
  delete missing.trustedParentTree;
  assert.throws(
    () => outputBrokerTesting.validateSessionReceipt(authorityState, missing),
    /unknown, missing, or reordered/u,
  );
  assert.throws(
    () =>
      outputBrokerTesting.validateSessionReceipt(authorityState, {
        ...receipt,
        receiptSha256: "0".repeat(64),
      }),
    /digest changed/u,
  );
});

test("native broker source freezes the 23-argument P/A CLI and exact eight-field OPEN body", () => {
  const source = readFileSync(SOURCE, "utf8");
  assert.match(source, /args\.Length != 23/u);
  assert.match(source, /args\[17\] != "--trusted-parent-head"/u);
  assert.match(source, /args\[19\] != "--trusted-parent-tree"/u);
  assert.match(source, /args\[21\] != "--approved-authority-digest"/u);
  assert.match(source, /open\.Count != 8/u);
  assert.match(
    source,
    /"approvedAuthorityDigest", "approvedHead", "approvedTree", "brokerContractDigest", "executionContractDigest", "phase", "trustedParentHead", "trustedParentTree"/u,
  );
});
