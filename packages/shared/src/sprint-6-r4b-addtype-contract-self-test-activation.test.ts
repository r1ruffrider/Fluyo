import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import "./sprint-6-r4b-addtype-contract-self-test-executor.test.mjs";

const root = resolve(__dirname, "../../..");
const d660 = "d6607300e52219c5d534e70c17e00e2e717e505b";
const source = "7220bef062a93142f5bcde07de89199355eb5837";
const merge = "7a5b345846eb29928dacb8f01b96796c01182dc2";
const d70 = "d70d8d9f3510b8b4a83f18478dc79dece39094d6";
const phaseBase = "a2485dc12c231dd482799834d5aca2966a6db494";
const repairBase = "b3203f0b96db5efca6d3cd16e6eb39d80a9cd3a5";
const recordsBase = "22dede4b31071aad68c607eabf3aec0a46544fe3";
const recordsBaseTreeId = "8dab199f420d3d06ef76035495d166aa227d8c0b";
const recordsBaseSubject = "fix(ci): bind iOS bootstrap parent identity";
const manifestSha = "15b3ff5f2158b0eb7839591a0aad3373491afff45b2e7dc6a4eda2e3f607ea2b";
const currentTenManifestSha = "8536cceb435bb5dcafb9e62727fc36d1b4f29bc850bcf2266e0ff381127db73b";
const packetPath =
  "scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-activation-v1.json";
const planPath = "docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md";
const recordPath = "docs/2026-11-13_r4b_addtype_contract_self_test_activation_v1.md";
const testPath = "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts";
const executorPath =
  "scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.mjs";
const executorTestPath =
  "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-executor.test.mjs";
const sixPaths = [planPath, recordPath, testPath, packetPath, executorPath, executorTestPath].sort(
  compareUtf8,
);
const tenPaths = [
  "docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md",
  "docs/DEVELOPMENT_HANDOFF.md",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.ps1",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs",
  "scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs",
  "scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs",
  "scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs",
  "scripts/r4b-evidence/roslyn-verifier-authenticode.cs",
].sort(compareUtf8);
const phasePaths = [
  ".github/workflows/ios.yml",
  "docs/DEVELOPMENT_HANDOFF.md",
  "packages/shared/src/ios-foundation-structure.test.ts",
  testPath,
  "packages/shared/src/sprint-6-r4b-addtype-postmain-readiness.test.ts",
  "scripts/ios-ci.sh",
  "scripts/ios-runtime-bootstrap.mjs",
  "scripts/ios-runtime-bootstrap.test.mjs",
].sort(compareUtf8);
const phaseModifiedPaths = phasePaths.filter(
  (path) =>
    path !== "scripts/ios-runtime-bootstrap.mjs" &&
    path !== "scripts/ios-runtime-bootstrap.test.mjs",
);
const phaseAddedPaths = [
  "scripts/ios-runtime-bootstrap.mjs",
  "scripts/ios-runtime-bootstrap.test.mjs",
].sort(compareUtf8);
const repairPaths = phasePaths.filter(
  (path) => ![".github/workflows/ios.yml", "scripts/ios-ci.sh"].includes(path),
);
const recordsRepairPaths = [
  "docs/DEVELOPMENT_HANDOFF.md",
  testPath,
  "packages/shared/src/sprint-6-r4b-addtype-postmain-readiness.test.ts",
].sort(compareUtf8);
const oracleRepairBase = "02b28be6d7a6bc5fe60ee1e73caa579ff33874a0";
const oracleRepairBaseTreeId = "6418b87563d090a8913626e86b1fcdf042a23ada";
const oracleRepairBaseSubject = "test(ci): bind iOS bootstrap postcommit topology";
const oracleRepairPaths = [
  "docs/DEVELOPMENT_HANDOFF.md",
  testPath,
  "packages/shared/src/sprint-6-r4b-addtype-postmain-readiness.test.ts",
  "scripts/ios-runtime-bootstrap.test.mjs",
].sort(compareUtf8);
const oracleRepairBaseTree = Object.freeze({
  ".github/workflows/ios.yml": Object.freeze({
    mode: "100644",
    blob: "3b1dc703dca499a5f365f4059ca0f40efdca63b4",
  }),
  "docs/DEVELOPMENT_HANDOFF.md": Object.freeze({
    mode: "100644",
    blob: "43057431f4fa54e418c70da90627994a99ed62c9",
  }),
  "packages/shared/src/ios-foundation-structure.test.ts": Object.freeze({
    mode: "100644",
    blob: "d3adcee7a2697ef731880b9bd4406d1ed7cbafa6",
  }),
  "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts": Object.freeze({
    mode: "100644",
    blob: "fbc3d45624d2fcac11269e35fa2bf7a54da4c535",
  }),
  "packages/shared/src/sprint-6-r4b-addtype-postmain-readiness.test.ts": Object.freeze({
    mode: "100644",
    blob: "d4438a84a0bcd0ddec2e555314e2cc7b7a9fc7e4",
  }),
  "scripts/ios-ci.sh": Object.freeze({
    mode: "100755",
    blob: "49fa4b91fde699af34cf3d218cc82026b0d57746",
  }),
  "scripts/ios-runtime-bootstrap.mjs": Object.freeze({
    mode: "100644",
    blob: "dbc2dd366cf9a9716fce0680616d9c0824d10e73",
  }),
  "scripts/ios-runtime-bootstrap.test.mjs": Object.freeze({
    mode: "100644",
    blob: "a13d394954304f7fb06e9cc6d19c7a17f04380d0",
  }),
});
const repairBaseTree = Object.freeze({
  ".github/workflows/ios.yml": Object.freeze({
    mode: "100644",
    blob: "3b1dc703dca499a5f365f4059ca0f40efdca63b4",
  }),
  "docs/DEVELOPMENT_HANDOFF.md": Object.freeze({
    mode: "100644",
    blob: "b387c3975acdb2070598c97904783e92d0e0cf31",
  }),
  "packages/shared/src/ios-foundation-structure.test.ts": Object.freeze({
    mode: "100644",
    blob: "5ba0842184b3303cd1b756d1c8e59281a7b6c7a0",
  }),
  "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts": Object.freeze({
    mode: "100644",
    blob: "9da45b36bcf3fea1ae305907a9852428ae29c0b5",
  }),
  "packages/shared/src/sprint-6-r4b-addtype-postmain-readiness.test.ts": Object.freeze({
    mode: "100644",
    blob: "938fd06ee609e9b12a4e9c5179890bea39696eb1",
  }),
  "scripts/ios-ci.sh": Object.freeze({
    mode: "100755",
    blob: "49fa4b91fde699af34cf3d218cc82026b0d57746",
  }),
  "scripts/ios-runtime-bootstrap.mjs": Object.freeze({
    mode: "100644",
    blob: "eb848f7eadd188e75799f631a5ca9a24763c06ad",
  }),
  "scripts/ios-runtime-bootstrap.test.mjs": Object.freeze({
    mode: "100644",
    blob: "103d685ebecfbc118c2f0d1b0c48a5c23eb8a4dc",
  }),
});
const recordsBaseTree = Object.freeze({
  ".github/workflows/ios.yml": Object.freeze({
    mode: "100644",
    blob: "3b1dc703dca499a5f365f4059ca0f40efdca63b4",
  }),
  "docs/DEVELOPMENT_HANDOFF.md": Object.freeze({
    mode: "100644",
    blob: "14355b6d469a9e351c40aa9ea8a4ab440b1c76cb",
  }),
  "packages/shared/src/ios-foundation-structure.test.ts": Object.freeze({
    mode: "100644",
    blob: "d3adcee7a2697ef731880b9bd4406d1ed7cbafa6",
  }),
  "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts": Object.freeze({
    mode: "100644",
    blob: "d92686dd24b2b1200b3f8366001a8e41919eb0a3",
  }),
  "packages/shared/src/sprint-6-r4b-addtype-postmain-readiness.test.ts": Object.freeze({
    mode: "100644",
    blob: "69a321c7b7c26126ae33b177ccaa5dbf2afe1a7a",
  }),
  "scripts/ios-ci.sh": Object.freeze({
    mode: "100755",
    blob: "49fa4b91fde699af34cf3d218cc82026b0d57746",
  }),
  "scripts/ios-runtime-bootstrap.mjs": Object.freeze({
    mode: "100644",
    blob: "dbc2dd366cf9a9716fce0680616d9c0824d10e73",
  }),
  "scripts/ios-runtime-bootstrap.test.mjs": Object.freeze({
    mode: "100644",
    blob: "a13d394954304f7fb06e9cc6d19c7a17f04380d0",
  }),
});
const statusArguments = Object.freeze([
  "status",
  "--porcelain=v2",
  "-z",
  "--branch",
  "--no-ahead-behind",
  "--untracked-files=normal",
  "--ignore-submodules=none",
]);
const statusTimeoutMs = 5_000;
const statusOutputCap = 1_048_576;
const zeroObjectId = "0".repeat(40);
const concurrentApprovalRoot = /^\.tmp-auth-readiness-approval-[A-Za-z0-9]{6}\/$/u;

function compareUtf8(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left), Buffer.from(right));
}
const bytes = (path: string): Buffer => readFileSync(resolve(root, path));
const sha = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");
const blob = (value: Buffer): string =>
  createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${value.length}\0`), value]))
    .digest("hex");
const git = (args: string[]): string =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }).trim();
const gitBytes = (commit: string, path: string): Buffer =>
  execFileSync("git", ["show", `${commit}:${path}`], { cwd: root, windowsHide: true });
const lines = (args: string[]): string[] => {
  const output = git(args);
  return output === "" ? [] : output.split(/\r?\n/u).filter(Boolean);
};
const sortedLines = (args: string[]): string[] => lines(args).sort(compareUtf8);
type StatusEntry = Readonly<{
  kind: "1" | "?";
  path: string;
  xy: string | null;
  sub: string | null;
  headMode: string | null;
  indexMode: string | null;
  worktreeMode: string | null;
  headObject: string | null;
  indexObject: string | null;
}>;
type StatusSnapshot = Readonly<{
  oid: string;
  head: string;
  entries: readonly StatusEntry[];
}>;
type StatusRunner = typeof spawnSync;
const topologyFailure = (): never => {
  throw new Error("IOS17_PHASE_TOPOLOGY_INVALID");
};
const decodeStatus = (value: Buffer): string => {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(value);
    if (text !== text.normalize("NFC")) topologyFailure();
    return text;
  } catch {
    return topologyFailure();
  }
};
const safeStatusPath = (path: string): boolean =>
  path !== "" &&
  path === path.normalize("NFC") &&
  !path.startsWith("/") &&
  !path.includes("\\") &&
  !/[\x00-\x1f\x7f]/u.test(path) &&
  !path.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
const parseStatusSnapshot = (value: Buffer): StatusSnapshot => {
  if (value.length === 0 || value.length > statusOutputCap || value.at(-1) !== 0) topologyFailure();
  const records = decodeStatus(value).split("\0");
  if (records.pop() !== "" || records.length < 2) topologyFailure();
  const oidMatch = /^# branch\.oid ([0-9a-f]{40})$/u.exec(records[0] ?? "") ?? topologyFailure();
  const headMatch =
    /^# branch\.head (\(detached\)|[A-Za-z0-9._/-]+)$/u.exec(records[1] ?? "") ?? topologyFailure();
  if (headMatch[1]!.includes("..")) topologyFailure();
  const entries: StatusEntry[] = [];
  const paths = new Set<string>();
  for (const record of records.slice(2)) {
    let entry: StatusEntry | null = null;
    if (record.startsWith("1 ")) {
      const match =
        /^1 ([.MADRCUT?!]{2}) (N\.\.\.) ([0-7]{6}) ([0-7]{6}) ([0-7]{6}) ([0-9a-f]{40}) ([0-9a-f]{40}) (.+)$/u.exec(
          record,
        ) ?? topologyFailure();
      entry = Object.freeze({
        kind: "1",
        xy: match[1]!,
        sub: match[2]!,
        headMode: match[3]!,
        indexMode: match[4]!,
        worktreeMode: match[5]!,
        headObject: match[6]!,
        indexObject: match[7]!,
        path: match[8]!,
      });
    } else if (record.startsWith("? ")) {
      entry = Object.freeze({
        kind: "?",
        xy: null,
        sub: null,
        headMode: null,
        indexMode: null,
        worktreeMode: null,
        headObject: null,
        indexObject: null,
        path: record.slice(2),
      });
    } else topologyFailure();
    const checkedEntry = entry ?? topologyFailure();
    if (
      (!safeStatusPath(checkedEntry.path) && !concurrentApprovalRoot.test(checkedEntry.path)) ||
      paths.has(checkedEntry.path)
    )
      topologyFailure();
    paths.add(checkedEntry.path);
    entries.push(checkedEntry);
  }
  return Object.freeze({
    oid: oidMatch[1]!,
    head: headMatch[1]!,
    entries: Object.freeze(entries),
  });
};
const runBoundedGit = (args: readonly string[], runner: StatusRunner = spawnSync): Buffer => {
  const result = runner("git", [...args], {
    cwd: root,
    shell: false,
    timeout: statusTimeoutMs,
    maxBuffer: statusOutputCap,
    encoding: "buffer",
    windowsHide: true,
  });
  const stdout = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0);
  const stderr = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.alloc(0);
  if (
    result.error ||
    result.status !== 0 ||
    result.signal !== null ||
    stderr.length !== 0 ||
    stdout.length + stderr.length > statusOutputCap
  )
    topologyFailure();
  return stdout;
};
const captureStatusSnapshot = (runner: StatusRunner = spawnSync): StatusSnapshot =>
  parseStatusSnapshot(runBoundedGit(statusArguments, runner));
const expectedTracked = (path: string) => {
  const mode = path === "scripts/ios-ci.sh" ? "100755" : "100644";
  return {
    mode,
    baseObject: git(["rev-parse", `${phaseBase}:${path}`]),
    candidateObject: blob(bytes(path)),
  };
};
const expectedRepairTracked = (path: string) => {
  const base = repairBaseTree[path as keyof typeof repairBaseTree] ?? topologyFailure();
  const candidate = recordsBaseTree[path as keyof typeof recordsBaseTree] ?? topologyFailure();
  return { mode: base.mode, baseObject: base.blob, candidateObject: candidate.blob };
};
const expectedRecordsRepairTracked = (path: string) => {
  const base = recordsBaseTree[path as keyof typeof recordsBaseTree] ?? topologyFailure();
  return { mode: base.mode, baseObject: base.blob, candidateObject: blob(bytes(path)) };
};
const expectedOracleRepairTracked = (path: string) => {
  const base = oracleRepairBaseTree[path as keyof typeof oracleRepairBaseTree] ?? topologyFailure();
  return { mode: base.mode, baseObject: base.blob, candidateObject: blob(bytes(path)) };
};
const exactType1 = (
  entry: StatusEntry,
  expected: ReturnType<typeof expectedTracked>,
  xy: ".M" | "M.",
): boolean =>
  entry.kind === "1" &&
  entry.xy === xy &&
  entry.sub === "N..." &&
  entry.headMode === expected.mode &&
  entry.indexMode === expected.mode &&
  entry.worktreeMode === expected.mode &&
  entry.headObject === expected.baseObject &&
  entry.indexObject === (xy === ".M" ? expected.baseObject : expected.candidateObject);
const exactAdded = (entry: StatusEntry): boolean =>
  entry.kind === "1" &&
  entry.xy === "A." &&
  entry.sub === "N..." &&
  entry.headMode === "000000" &&
  entry.indexMode === "100644" &&
  entry.worktreeMode === "100644" &&
  entry.headObject === zeroObjectId &&
  entry.indexObject === blob(bytes(entry.path));
const assertDirectChildCommit = (commitBytes: Buffer): void => {
  const commit = decodeStatus(commitBytes);
  const boundary = commit.indexOf("\n\n");
  if (boundary < 0) topologyFailure();
  const parents = commit
    .slice(0, boundary)
    .split("\n")
    .filter((line) => line.startsWith("parent "));
  if (parents.length !== 1 || parents[0] !== `parent ${phaseBase}`) topologyFailure();
};
const verifyPostcommitObject = (oid: string): void => {
  assertDirectChildCommit(runBoundedGit(["cat-file", "commit", oid]));
  const diff = runBoundedGit(["diff-tree", "--no-commit-id", "--raw", "-z", "-r", phaseBase, oid]);
  if (diff.length === 0 || diff.at(-1) !== 0) topologyFailure();
  const records = decodeStatus(diff).split("\0");
  if (records.pop() !== "") topologyFailure();
  const observed = new Map<string, string>();
  for (let index = 0; index < records.length; index += 2) {
    const metadata = records[index] ?? "";
    const path = records[index + 1] ?? "";
    const match =
      /^:([0-7]{6}) ([0-7]{6}) ([0-9a-f]{40}) ([0-9a-f]{40}) ([AM])$/u.exec(metadata) ??
      topologyFailure();
    if (!safeStatusPath(path) || observed.has(path)) topologyFailure();
    observed.set(path, `${match[5]}\0${match[1]}\0${match[2]}\0${match[3]}\0${match[4]}`);
  }
  if (JSON.stringify([...observed.keys()].sort(compareUtf8)) !== JSON.stringify(phasePaths))
    topologyFailure();
  for (const path of phaseModifiedPaths) {
    const expected = expectedTracked(path);
    if (
      observed.get(path) !==
      `M\0${expected.mode}\0${expected.mode}\0${expected.baseObject}\0${expected.candidateObject}`
    )
      topologyFailure();
  }
  for (const path of phaseAddedPaths)
    if (
      observed.get(path) !== ["A", "000000", "100644", zeroObjectId, blob(bytes(path))].join("\0")
    )
      topologyFailure();
};
const assertRepairDirectChildCommit = (commitBytes: Buffer): void => {
  const commit = decodeStatus(commitBytes);
  const boundary = commit.indexOf("\n\n");
  if (boundary < 0) topologyFailure();
  const parents = commit
    .slice(0, boundary)
    .split("\n")
    .filter((line) => line.startsWith("parent "));
  if (parents.length !== 1 || parents[0] !== `parent ${repairBase}`) topologyFailure();
};
const verifyRepairPostcommitObject = (oid: string): void => {
  assertRepairDirectChildCommit(runBoundedGit(["cat-file", "commit", oid]));
  const diff = runBoundedGit(["diff-tree", "--no-commit-id", "--raw", "-z", "-r", repairBase, oid]);
  if (diff.length === 0 || diff.at(-1) !== 0) topologyFailure();
  const records = decodeStatus(diff).split("\0");
  if (records.pop() !== "") topologyFailure();
  const observed = new Map<string, string>();
  for (let index = 0; index < records.length; index += 2) {
    const metadata = records[index] ?? "";
    const path = records[index + 1] ?? "";
    const match =
      /^:([0-7]{6}) ([0-7]{6}) ([0-9a-f]{40}) ([0-9a-f]{40}) M$/u.exec(metadata) ??
      topologyFailure();
    if (!safeStatusPath(path) || observed.has(path)) topologyFailure();
    observed.set(path, `${match[1]}\0${match[2]}\0${match[3]}\0${match[4]}`);
  }
  if (JSON.stringify([...observed.keys()].sort(compareUtf8)) !== JSON.stringify(repairPaths))
    topologyFailure();
  for (const path of repairPaths) {
    const expected = expectedRepairTracked(path);
    if (
      observed.get(path) !==
      `${expected.mode}\0${expected.mode}\0${expected.baseObject}\0${expected.candidateObject}`
    )
      topologyFailure();
  }
};
const assertRecordsDirectChildCommit = (commitBytes: Buffer): void => {
  const commit = decodeStatus(commitBytes);
  const boundary = commit.indexOf("\n\n");
  if (boundary < 0) topologyFailure();
  const parents = commit
    .slice(0, boundary)
    .split("\n")
    .filter((line) => line.startsWith("parent "));
  if (parents.length !== 1 || parents[0] !== `parent ${recordsBase}`) topologyFailure();
};
const verifyRecordsPostcommitObject = (oid: string): void => {
  assertRecordsDirectChildCommit(runBoundedGit(["cat-file", "commit", oid]));
  const diff = runBoundedGit([
    "diff-tree",
    "--no-commit-id",
    "--raw",
    "-z",
    "-r",
    recordsBase,
    oid,
  ]);
  if (diff.length === 0 || diff.at(-1) !== 0) topologyFailure();
  const records = decodeStatus(diff).split("\0");
  if (records.pop() !== "") topologyFailure();
  const observed = new Map<string, string>();
  for (let index = 0; index < records.length; index += 2) {
    const metadata = records[index] ?? "";
    const path = records[index + 1] ?? "";
    const match =
      /^:([0-7]{6}) ([0-7]{6}) ([0-9a-f]{40}) ([0-9a-f]{40}) M$/u.exec(metadata) ??
      topologyFailure();
    if (!safeStatusPath(path) || observed.has(path)) topologyFailure();
    observed.set(path, `${match[1]}\0${match[2]}\0${match[3]}\0${match[4]}`);
  }
  if (JSON.stringify([...observed.keys()].sort(compareUtf8)) !== JSON.stringify(recordsRepairPaths))
    topologyFailure();
  for (const path of recordsRepairPaths) {
    const expected = expectedRecordsRepairTracked(path);
    if (
      observed.get(path) !==
      `${expected.mode}\0${expected.mode}\0${expected.baseObject}\0${expected.candidateObject}`
    )
      topologyFailure();
  }
};
const assertOracleRepairDirectChildCommit = (commitBytes: Buffer): void => {
  const commit = decodeStatus(commitBytes);
  const boundary = commit.indexOf("\n\n");
  if (boundary < 0) topologyFailure();
  const parents = commit
    .slice(0, boundary)
    .split("\n")
    .filter((line) => line.startsWith("parent "));
  if (parents.length !== 1 || parents[0] !== `parent ${oracleRepairBase}`) topologyFailure();
};
const assertOracleRepairRawDiff = (diff: Buffer): void => {
  if (diff.length === 0 || diff.at(-1) !== 0) topologyFailure();
  const records = decodeStatus(diff).split("\0");
  if (records.pop() !== "") topologyFailure();
  const observed = new Map<string, string>();
  for (let index = 0; index < records.length; index += 2) {
    const metadata = records[index] ?? "";
    const path = records[index + 1] ?? "";
    const match =
      /^:([0-7]{6}) ([0-7]{6}) ([0-9a-f]{40}) ([0-9a-f]{40}) M$/u.exec(metadata) ??
      topologyFailure();
    if (!safeStatusPath(path) || observed.has(path)) topologyFailure();
    observed.set(path, `${match[1]}\0${match[2]}\0${match[3]}\0${match[4]}`);
  }
  if (JSON.stringify([...observed.keys()].sort(compareUtf8)) !== JSON.stringify(oracleRepairPaths))
    topologyFailure();
  for (const path of oracleRepairPaths) {
    const expected = expectedOracleRepairTracked(path);
    if (
      observed.get(path) !==
      `${expected.mode}\0${expected.mode}\0${expected.baseObject}\0${expected.candidateObject}`
    )
      topologyFailure();
  }
};
const verifyOracleRepairPostcommitObject = (oid: string): void => {
  assertOracleRepairDirectChildCommit(runBoundedGit(["cat-file", "commit", oid]));
  assertOracleRepairRawDiff(
    runBoundedGit(["diff-tree", "--no-commit-id", "--raw", "-z", "-r", oracleRepairBase, oid]),
  );
};
const verifyCurrentPostcommitObject = (oid: string): void => {
  const commit = decodeStatus(runBoundedGit(["cat-file", "commit", oid]));
  const boundary = commit.indexOf("\n\n");
  if (boundary < 0) topologyFailure();
  const parents = commit
    .slice(0, boundary)
    .split("\n")
    .filter((line) => line.startsWith("parent "));
  if (parents.length !== 1) topologyFailure();
  if (parents[0] === `parent ${repairBase}`) verifyRepairPostcommitObject(oid);
  else if (parents[0] === `parent ${recordsBase}`) verifyRecordsPostcommitObject(oid);
  else if (parents[0] === `parent ${oracleRepairBase}`) verifyOracleRepairPostcommitObject(oid);
  else topologyFailure();
};
const classifyStatusSnapshot = (
  snapshot: StatusSnapshot,
  verifyPostcommit: (oid: string) => void = verifyCurrentPostcommitObject,
): "PRECOMMIT_UNSTAGED" | "PRECOMMIT_STAGED" | "POSTCOMMIT" => {
  const concurrent = snapshot.entries.filter(
    (entry) => entry.kind === "?" && concurrentApprovalRoot.test(entry.path),
  );
  if (concurrent.length > 1) topologyFailure();
  const entries = snapshot.entries
    .filter((entry) => !concurrentApprovalRoot.test(entry.path))
    .sort((left, right) => compareUtf8(left.path, right.path));
  if (snapshot.oid === phaseBase) {
    if (JSON.stringify(entries.map((entry) => entry.path)) !== JSON.stringify(phasePaths))
      topologyFailure();
    const unstaged = entries.every((entry) =>
      phaseModifiedPaths.includes(entry.path)
        ? exactType1(entry, expectedTracked(entry.path), ".M")
        : phaseAddedPaths.includes(entry.path) && entry.kind === "?",
    );
    const staged = entries.every((entry) =>
      phaseModifiedPaths.includes(entry.path)
        ? exactType1(entry, expectedTracked(entry.path), "M.")
        : phaseAddedPaths.includes(entry.path) && exactAdded(entry),
    );
    if (unstaged === staged) topologyFailure();
    return unstaged ? "PRECOMMIT_UNSTAGED" : "PRECOMMIT_STAGED";
  }
  if (snapshot.oid === repairBase) {
    if (JSON.stringify(entries.map((entry) => entry.path)) !== JSON.stringify(repairPaths))
      topologyFailure();
    const unstaged = entries.every((entry) =>
      exactType1(entry, expectedRepairTracked(entry.path), ".M"),
    );
    const staged = entries.every((entry) =>
      exactType1(entry, expectedRepairTracked(entry.path), "M."),
    );
    if (unstaged === staged) topologyFailure();
    return unstaged ? "PRECOMMIT_UNSTAGED" : "PRECOMMIT_STAGED";
  }
  if (snapshot.oid === recordsBase) {
    const recordEntries = [...snapshot.entries].sort((left, right) =>
      compareUtf8(left.path, right.path),
    );
    if (recordEntries.length === 0) {
      verifyPostcommit(snapshot.oid);
      return "POSTCOMMIT";
    }
    if (
      JSON.stringify(recordEntries.map((entry) => entry.path)) !==
      JSON.stringify(recordsRepairPaths)
    )
      topologyFailure();
    const unstaged = recordEntries.every((entry) =>
      exactType1(entry, expectedRecordsRepairTracked(entry.path), ".M"),
    );
    const staged = recordEntries.every((entry) =>
      exactType1(entry, expectedRecordsRepairTracked(entry.path), "M."),
    );
    if (unstaged === staged) topologyFailure();
    return unstaged ? "PRECOMMIT_UNSTAGED" : "PRECOMMIT_STAGED";
  }
  if (snapshot.oid === oracleRepairBase) {
    if (snapshot.entries.length === 0) {
      verifyPostcommit(snapshot.oid);
      return "POSTCOMMIT";
    }
    if (entries.length === 0) topologyFailure();
    if (JSON.stringify(entries.map((entry) => entry.path)) !== JSON.stringify(oracleRepairPaths))
      topologyFailure();
    const unstaged = entries.every((entry) =>
      exactType1(entry, expectedOracleRepairTracked(entry.path), ".M"),
    );
    const staged = entries.every((entry) =>
      exactType1(entry, expectedOracleRepairTracked(entry.path), "M."),
    );
    if (unstaged === staged) topologyFailure();
    return unstaged ? "PRECOMMIT_UNSTAGED" : "PRECOMMIT_STAGED";
  }
  if (snapshot.entries.length !== 0) topologyFailure();
  verifyPostcommit(snapshot.oid);
  return "POSTCOMMIT";
};
const statusType1Record = (path: string, xy: ".M" | "M."): string => {
  const expected = expectedTracked(path);
  return [
    "1",
    xy,
    "N...",
    expected.mode,
    expected.mode,
    expected.mode,
    expected.baseObject,
    xy === ".M" ? expected.baseObject : expected.candidateObject,
    path,
  ].join(" ");
};
const statusAddedRecord = (path: string): string =>
  ["1", "A.", "N...", "000000", "100644", "100644", zeroObjectId, blob(bytes(path)), path].join(
    " ",
  );
const statusSnapshotBytes = (
  oid: string,
  records: readonly string[],
  head = "codex/ios175-runtime-bootstrap-prereq",
): Buffer =>
  Buffer.from([`# branch.oid ${oid}`, `# branch.head ${head}`, ...records, ""].join("\0"));
const unstagedStatusRecords = (): string[] => [
  ...phaseModifiedPaths.map((path) => statusType1Record(path, ".M")),
  ...phaseAddedPaths.map((path) => `? ${path}`),
];
const stagedStatusRecords = (): string[] => [
  ...phaseModifiedPaths.map((path) => statusType1Record(path, "M.")),
  ...phaseAddedPaths.map(statusAddedRecord),
];
const repairStatusRecords = (xy: ".M" | "M."): string[] =>
  repairPaths.map((path) => {
    const expected = expectedRepairTracked(path);
    return [
      "1",
      xy,
      "N...",
      expected.mode,
      expected.mode,
      expected.mode,
      expected.baseObject,
      xy === ".M" ? expected.baseObject : expected.candidateObject,
      path,
    ].join(" ");
  });
const recordsRepairStatusRecords = (xy: ".M" | "M."): string[] =>
  recordsRepairPaths.map((path) => {
    const expected = expectedRecordsRepairTracked(path);
    return [
      "1",
      xy,
      "N...",
      expected.mode,
      expected.mode,
      expected.mode,
      expected.baseObject,
      xy === ".M" ? expected.baseObject : expected.candidateObject,
      path,
    ].join(" ");
  });
const oracleRepairStatusRecords = (xy: ".M" | "M."): string[] =>
  oracleRepairPaths.map((path) => {
    const expected = expectedOracleRepairTracked(path);
    return [
      "1",
      xy,
      "N...",
      expected.mode,
      expected.mode,
      expected.mode,
      expected.baseObject,
      xy === ".M" ? expected.baseObject : expected.candidateObject,
      path,
    ].join(" ");
  });
const oracleRepairRawDiff = (mutate: (rows: string[]) => string[] = (rows) => rows): Buffer => {
  const rows = oracleRepairPaths.flatMap((path) => {
    const expected = expectedOracleRepairTracked(path);
    return [
      `:${expected.mode} ${expected.mode} ${expected.baseObject} ${expected.candidateObject} M`,
      path,
    ];
  });
  return Buffer.from([...mutate(rows), ""].join("\0"));
};
const ancestor = (left: string, right: string): boolean => {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", left, right], {
      cwd: root,
      stdio: "ignore",
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
};
const packet = () => JSON.parse(bytes(packetPath).toString("utf8"));
const executorUrl = pathToFileURL(resolve(root, executorPath)).href;
const executorExpectedPacket = () =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `import { outerActivationTesting as s } from ${JSON.stringify(executorUrl)}; process.stdout.write(JSON.stringify(s.EXPECTED_PACKET));`,
      ],
      { encoding: "utf8", windowsHide: true },
    ),
  );
const validatorHarnessFailure = (reason = "ACTIVATION_VALIDATOR_HARNESS_INVALID"): Error =>
  new Error(reason);
const normalizeValidatorPath = (value: string): string => {
  const normalized = resolve(value).normalize("NFC");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
};
const sameValidatorIdentity = (
  left: { dev: bigint; ino: bigint },
  right: { dev: bigint; ino: bigint },
): boolean =>
  left.dev !== 0n && left.ino !== 0n && left.dev === right.dev && left.ino === right.ino;
const captureValidatorDirectory = (path: string) => {
  const stat = lstatSync(path, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw validatorHarnessFailure();
  const finalPath = realpathSync.native(path);
  if (normalizeValidatorPath(finalPath) !== normalizeValidatorPath(path))
    throw validatorHarnessFailure();
  return { stat, finalPath };
};
const captureValidatorFile = (path: string, held: { dev: bigint; ino: bigint }) => {
  const stat = lstatSync(path, { bigint: true });
  if (!stat.isFile() || stat.isSymbolicLink() || !sameValidatorIdentity(stat, held))
    throw validatorHarnessFailure();
  const finalPath = realpathSync.native(path);
  if (normalizeValidatorPath(finalPath) !== normalizeValidatorPath(path))
    throw validatorHarnessFailure();
  return { stat, finalPath };
};
type ValidatorRunOptions = {
  cwd: string;
  windowsHide: boolean;
  shell: false;
  timeout: number;
  maxBuffer: number;
  env: Record<string, string>;
  stdio: ["ignore", "pipe", "ignore"];
};
type ValidatorRunResult = {
  status: number | null;
  signal: string | null;
  error?: Error;
  stdout: Buffer | string | null;
};
type ValidatorRunner = (
  executable: string,
  args: string[],
  options: ValidatorRunOptions,
) => ValidatorRunResult;
const runValidatorProcess: ValidatorRunner = (executable, args, options) => {
  const result = spawnSync(executable, args, options);
  return {
    status: result.status,
    signal: result.signal,
    error: result.error,
    stdout: result.stdout,
  };
};
const validatorAccepts = (candidate: unknown): boolean => {
  const value = Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`).toString("base64");
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import { outerActivationTesting as s } from ${JSON.stringify(executorUrl)}; const b=Buffer.from(process.argv[1],"base64"); try { s.validatePacket(b,{reviewBinding:s.constants.SIX_BINDING,activationManifestSha256:"0".repeat(64)}); process.exit(0); } catch { process.exit(1); }`,
      value,
    ],
    { cwd: root, windowsHide: true },
  );
  return result.status === 0;
};
const validatorRejectsAll = (
  candidates: unknown[],
  runner: ValidatorRunner = runValidatorProcess,
): boolean => {
  const input = Buffer.from(`${JSON.stringify(candidates)}\n`);
  if (input.length > 1024 * 1024) throw validatorHarnessFailure();

  let directory = "";
  let inputPath = "";
  let inputHandle: number | null = null;
  let directoryIdentity: ReturnType<typeof captureValidatorDirectory> | null = null;
  let inputIdentity: { dev: bigint; ino: bigint } | null = null;
  let result: ValidatorRunResult | null = null;
  let failure: Error | null = null;
  let cleanupFailure = false;

  try {
    directory = mkdtempSync(resolve(tmpdir(), "fluyo-r4b-activation-validator-"));
    directoryIdentity = captureValidatorDirectory(directory);
    inputPath = resolve(directory, "mutations-v1.json");
    if (dirname(inputPath) !== resolve(directory)) throw validatorHarnessFailure();

    inputHandle = openSync(inputPath, "wx", 0o600);
    let offset = 0;
    while (offset < input.length) {
      const written = writeSync(inputHandle, input, offset, input.length - offset, offset);
      if (!Number.isSafeInteger(written) || written <= 0) throw validatorHarnessFailure();
      offset += written;
    }
    fsyncSync(inputHandle);
    const heldInput = fstatSync(inputHandle, { bigint: true });
    if (!heldInput.isFile()) throw validatorHarnessFailure();
    inputIdentity = { dev: heldInput.dev, ino: heldInput.ino };
    const capturedInput = captureValidatorFile(inputPath, inputIdentity);
    if (
      dirname(normalizeValidatorPath(capturedInput.finalPath)) !== normalizeValidatorPath(directory)
    )
      throw validatorHarnessFailure();

    const nodePath = resolve(process.execPath);
    if (!isAbsolute(nodePath)) throw validatorHarnessFailure();
    const nodeStat = lstatSync(nodePath, { bigint: true });
    if (!nodeStat.isFile() || nodeStat.isSymbolicLink()) throw validatorHarnessFailure();
    if (normalizeValidatorPath(realpathSync.native(nodePath)) !== normalizeValidatorPath(nodePath))
      throw validatorHarnessFailure();

    captureValidatorDirectory(directory);
    captureValidatorFile(inputPath, inputIdentity);
    result = runner(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `import { lstatSync, readFileSync, realpathSync } from "node:fs"; import { isAbsolute, resolve } from "node:path"; import { outerActivationTesting as s } from ${JSON.stringify(executorUrl)}; if (process.argv.length!==2||!isAbsolute(process.argv[1])) process.exit(3); const p=resolve(process.argv[1]); const st=lstatSync(p); if (!st.isFile()||st.isSymbolicLink()||resolve(realpathSync.native(p))!==p) process.exit(3); const input=readFileSync(p); if (input.length>1048576) process.exit(3); const values=JSON.parse(input.toString("utf8")); if (!Array.isArray(values)) process.exit(3); for (let index=0; index<values.length; index+=1) { const bytes=Buffer.from(JSON.stringify(values[index],null,2)+"\\n"); try { s.validatePacket(bytes,{reviewBinding:s.constants.SIX_BINDING,activationManifestSha256:"0".repeat(64)}); process.stdout.write(String(index)); process.exit(1); } catch {} } process.exit(0);`,
        capturedInput.finalPath,
      ],
      {
        cwd: root,
        windowsHide: true,
        shell: false,
        timeout: 30_000,
        maxBuffer: 4096,
        env: {},
        stdio: ["ignore", "pipe", "ignore"],
      },
    );

    captureValidatorDirectory(directory);
    captureValidatorFile(inputPath, inputIdentity);
    if (result.status === 0 && result.signal === null && !result.error) {
      if (!Buffer.isBuffer(result.stdout) || result.stdout.length !== 0)
        throw validatorHarnessFailure();
    } else if (
      result.status === 1 &&
      result.signal === null &&
      !result.error &&
      Buffer.isBuffer(result.stdout) &&
      /^(?:0|[1-9][0-9]*)$/u.test(result.stdout.toString("ascii"))
    ) {
      const acceptedIndex = Number(result.stdout.toString("ascii"));
      if (!Number.isSafeInteger(acceptedIndex) || acceptedIndex >= candidates.length)
        throw validatorHarnessFailure();
      throw validatorHarnessFailure("ACTIVATION_VALIDATOR_MUTATION_ACCEPTED");
    } else {
      throw validatorHarnessFailure();
    }
  } catch (error) {
    failure =
      error instanceof Error &&
      ["ACTIVATION_VALIDATOR_HARNESS_INVALID", "ACTIVATION_VALIDATOR_MUTATION_ACCEPTED"].includes(
        error.message,
      )
        ? error
        : validatorHarnessFailure();
  } finally {
    try {
      if (inputHandle !== null) closeSync(inputHandle);
      if (!directoryIdentity || !inputIdentity || directory === "" || inputPath === "") {
        cleanupFailure = directory !== "";
      } else {
        const currentDirectory = captureValidatorDirectory(directory);
        const currentInput = captureValidatorFile(inputPath, inputIdentity);
        if (
          !sameValidatorIdentity(currentDirectory.stat, directoryIdentity.stat) ||
          normalizeValidatorPath(currentDirectory.finalPath) !==
            normalizeValidatorPath(directoryIdentity.finalPath) ||
          dirname(normalizeValidatorPath(currentInput.finalPath)) !==
            normalizeValidatorPath(directory)
        ) {
          cleanupFailure = true;
        } else {
          unlinkSync(inputPath);
          rmdirSync(directory);
          cleanupFailure = existsSync(directory);
        }
      }
    } catch {
      cleanupFailure = true;
    }
  }

  if (cleanupFailure) throw validatorHarnessFailure("ACTIVATION_VALIDATOR_CLEANUP_HOLD");
  if (failure) throw failure;
  return true;
};
const canonicalManifest = (paths: string[]) => {
  const value = Buffer.from(
    paths
      .map((path) => {
        const value = bytes(path);
        return `${path}\0${value.length}\0${sha(value)}\0${blob(value)}\n`;
      })
      .join(""),
  );
  return { rows: paths.length, bytes: value.length, sha256: sha(value) };
};
describe("R4B Add-Type outer activation v1.1.2", () => {
  it("01 packet is canonical NFC UTF-8 pretty JSON", () => {
    const value = bytes(packetPath);
    const text = value.toString("utf8");
    expect(value.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(false);
    expect(text).toBe(text.normalize("NFC"));
    expect(text).not.toContain("\r");
    expect(text).toBe(`${JSON.stringify(JSON.parse(text), null, 2)}\n`);
  });

  it("02 packet recursively locks exact ordered shape", () => {
    const value = packet();
    expect(value).toEqual(executorExpectedPacket());
    expect(validatorAccepts(value)).toBe(true);
  });

  it("03 records exact delegated Option A literals", () => {
    expect(packet().decision).toEqual({
      selection: "RECOMMENDED_OPTION_A",
      approvedBy: "Adriana Solano",
      approvalBasis: "MARLON_DELEGATED_BOUNDED_NON_PRODUCTION_EVIDENCE_TEST_APPROVAL",
      authorityId: "CLOSED_ADD_TYPE_PINVOKE_LEASE_BOOTSTRAP_V1",
      decisionReference: "MARLON_RECOMMENDED_1A_CLOSED_ADDTYPE_PINVOKE_2026-11-11",
    });
  });

  it("04 distinguishes historical and executable commits", () => {
    const value = packet();
    expect(value.historicalDesignProvenance).toEqual({
      sourceMainCommit: d660,
      reviewedSourceHead: source,
      designMergeCommit: merge,
      readinessMergeCommit: d70,
      semantics: "IMMUTABLE_HISTORICAL_PROVENANCE_NOT_EXECUTION_AUTHORITY",
    });
    expect(value.executionBinding.executionCheckoutCommit).toBe(d70);
  });

  it("05 proves ancestry and squash-source classification", () => {
    expect(ancestor(d660, merge)).toBe(true);
    expect(ancestor(merge, d70)).toBe(true);
    expect(ancestor(source, merge)).toBe(false);
  });

  it("06 candidate is based on exact d70 and models a one-child squash", () => {
    expect(ancestor(d70, "HEAD")).toBe(true);
    expect(packet().executionBinding.headDriftInvalidates).toBe(true);
    expect(packet().historicalDesignProvenance.readinessMergeCommit).toBe(d70);
  });

  it("07 preserves the historical six-path candidate and closes the current eight-path phase", () => {
    expect(sortedLines(["diff", "--name-only", `${d70}...${phaseBase}`])).toEqual(sixPaths);
    const phaseSnapshot = parseStatusSnapshot(
      statusSnapshotBytes(phaseBase, unstagedStatusRecords()),
    );
    expect(classifyStatusSnapshot(phaseSnapshot)).toBe("PRECOMMIT_UNSTAGED");
    const positive = ".tmp-auth-readiness-approval-abc123/";
    expect(concurrentApprovalRoot.test(positive)).toBe(true);
    for (const negative of [
      ".tmp-auth-readiness-approval-abc123",
      ".tmp-auth-readiness-approval-abc12/",
      ".tmp-auth-readiness-approval-abc1234/",
      ".tmp-auth-readiness-approval-abc-12/",
      ".tmp-auth-readiness-approval-abc123/file",
      ".tmp-auth-readiness-approvals-abc123/",
      "parent/.tmp-auth-readiness-approval-abc123/",
      ".tmp/",
      ".security-tmp/",
      "unexpected.txt",
    ]) {
      expect(concurrentApprovalRoot.test(negative)).toBe(false);
    }
    const activationSource = bytes(testPath).toString("utf8");
    expect(
      activationSource.match(
        /import "\.\/sprint-6-r4b-addtype-contract-self-test-executor\.test\.mjs";/gu,
      ),
    ).toHaveLength(1);
    const vitestConfig = bytes("packages/shared/vitest.config.ts").toString("utf8");
    expect(vitestConfig).toContain('include: ["src/**/*.test.ts"]');
    expect(vitestConfig).not.toContain(".test.mjs");
    const producerSource = bytes("packages/shared/src/auth-readiness-decision.test.ts").toString(
      "utf8",
    );
    expect(
      producerSource.match(
        /mkdtempSync\(\s*resolve\(repositoryRoot, "\.tmp-auth-readiness-approval-"\),\s*\)/gu,
      ),
    ).toHaveLength(1);
    expect(producerSource.match(/\.tmp-auth-readiness-approval-/gu)).toHaveLength(1);
    const concurrencyContractSource = activationSource.slice(
      activationSource.indexOf(
        'it("07 preserves the historical six-path candidate and closes the current eight-path phase"',
      ),
      activationSource.indexOf('it("08 keeps exact ordered ten-path manifest"'),
    );
    expect(concurrencyContractSource).not.toMatch(/\blstat(?:Sync)?\b/u);
    expect(bytes("packages/shared/src/index.ts").toString("utf8")).not.toContain(
      "sprint-6-r4b-addtype-contract-self-test-executor",
    );
    expect(
      existsSync(
        resolve(
          root,
          "scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.test.mjs",
        ),
      ),
    ).toBe(false);
    expect(activationSource).not.toContain(
      ["sprint-6-r4b-addtype-postmain-readiness.test", "?lifecycle-helper-v1"].join(""),
    );
    expect(activationSource).not.toContain(
      ["docs/2026-11-14_r4b_windows_python_", "reviewed_local_binding_v2.md"].join(""),
    );
    expect(activationSource).not.toContain(blob(bytes(testPath)));
  });

  it("07a captures one bounded porcelain-v2 snapshot with exact invocation", () => {
    const output = statusSnapshotBytes(phaseBase, unstagedStatusRecords());
    let calls = 0;
    const runner = ((executable: string, args: string[], options: Record<string, unknown>) => {
      calls += 1;
      expect(executable).toBe("git");
      expect(args).toEqual(statusArguments);
      expect(options).toMatchObject({
        cwd: root,
        shell: false,
        timeout: statusTimeoutMs,
        maxBuffer: statusOutputCap,
        encoding: "buffer",
        windowsHide: true,
      });
      return {
        pid: 1,
        output: [null, output, Buffer.alloc(0)],
        stdout: output,
        stderr: Buffer.alloc(0),
        status: 0,
        signal: null,
      };
    }) as unknown as StatusRunner;
    const snapshot = captureStatusSnapshot(runner);
    expect(calls).toBe(1);
    expect(snapshot.oid).toBe(phaseBase);
    expect(classifyStatusSnapshot(snapshot)).toBe("PRECOMMIT_UNSTAGED");
    const noisy = (() => ({
      pid: 1,
      output: [null, output, Buffer.from("private")],
      stdout: output,
      stderr: Buffer.from("private"),
      status: 0,
      signal: null,
    })) as unknown as StatusRunner;
    expect(() => captureStatusSnapshot(noisy)).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
    const oversized = (() => ({
      pid: 1,
      output: [null, Buffer.alloc(statusOutputCap + 1), Buffer.alloc(0)],
      stdout: Buffer.alloc(statusOutputCap + 1),
      stderr: Buffer.alloc(0),
      status: 0,
      signal: null,
    })) as unknown as StatusRunner;
    expect(() => captureStatusSnapshot(oversized)).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
  });

  it("07b accepts only the exact fully staged eight-path snapshot", () => {
    const snapshot = parseStatusSnapshot(statusSnapshotBytes(phaseBase, stagedStatusRecords()));
    expect(classifyStatusSnapshot(snapshot)).toBe("PRECOMMIT_STAGED");
  });

  it("07c binds postcommit classification to the captured oid and one direct parent", () => {
    const oid = "1".repeat(40);
    const snapshot = parseStatusSnapshot(statusSnapshotBytes(oid, [], "(detached)"));
    let observed = "";
    expect(
      classifyStatusSnapshot(snapshot, (captured) => {
        observed = captured;
      }),
    ).toBe("POSTCOMMIT");
    expect(observed).toBe(oid);
    const commit = Buffer.from(
      `tree ${"2".repeat(40)}\nparent ${phaseBase}\nauthor a\n\nmessage\n`,
    );
    expect(() => assertDirectChildCommit(commit)).not.toThrow();
    expect(() =>
      assertDirectChildCommit(
        Buffer.from(
          `tree ${"2".repeat(40)}\nparent ${phaseBase}\nparent ${"3".repeat(40)}\nauthor a\n\nmessage\n`,
        ),
      ),
    ).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
  });

  it("07d rejects noncanonical framing encoding normalization and branch headers", () => {
    const valid = statusSnapshotBytes(phaseBase, unstagedStatusRecords());
    const invalidUtf8 = Buffer.concat([valid.subarray(0, -1), Buffer.from([0xff, 0])]);
    const decomposed = statusSnapshotBytes(phaseBase, ["? cafe\u0301"]);
    const missingTerminator = valid.subarray(0, -1);
    const extraHeader = Buffer.from(
      [`# branch.oid ${phaseBase}`, "# branch.head main", "# branch.upstream origin/main", ""].join(
        "\0",
      ),
    );
    for (const candidate of [invalidUtf8, decomposed, missingTerminator, extraHeader])
      expect(() => parseStatusSnapshot(candidate)).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
  });

  it("07e rejects rename unmerged ignored and unknown record types", () => {
    for (const record of [
      `2 R. N... 100644 100644 100644 ${"1".repeat(40)} ${"2".repeat(40)} R100 new\0old`,
      `u UU N... 100644 100644 100644 100644 ${"1".repeat(40)} ${"2".repeat(40)} ${"3".repeat(40)} file`,
      "! ignored",
      "x unknown",
    ])
      expect(() => parseStatusSnapshot(statusSnapshotBytes(phaseBase, [record]))).toThrow(
        "IOS17_PHASE_TOPOLOGY_INVALID",
      );
  });

  it("07f rejects duplicate unsafe and non-NFC paths", () => {
    const record = `? ${phaseAddedPaths[0]}`;
    for (const records of [
      [record, record],
      ["? ../escape"],
      ["? /absolute"],
      ["? parent\\child"],
      ["? nested//child"],
      ["? cafe\u0301"],
    ])
      expect(() => parseStatusSnapshot(statusSnapshotBytes(phaseBase, records))).toThrow(
        "IOS17_PHASE_TOPOLOGY_INVALID",
      );
  });

  it("07g permits one exact concurrent auth root and rejects near nested or second roots", () => {
    const exact = ".tmp-auth-readiness-approval-abc123/";
    const allowed = parseStatusSnapshot(
      statusSnapshotBytes(phaseBase, [...unstagedStatusRecords(), `? ${exact}`]),
    );
    expect(classifyStatusSnapshot(allowed)).toBe("PRECOMMIT_UNSTAGED");
    for (const row of [
      "? .tmp-auth-readiness-approval-abc12/",
      "? .tmp-auth-readiness-approval-abc123/file",
      "? parent/.tmp-auth-readiness-approval-abc123/",
    ])
      expect(() =>
        classifyStatusSnapshot(
          parseStatusSnapshot(statusSnapshotBytes(phaseBase, [...unstagedStatusRecords(), row])),
        ),
      ).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
    const second = parseStatusSnapshot(
      statusSnapshotBytes(phaseBase, [
        ...unstagedStatusRecords(),
        `? ${exact}`,
        "? .tmp-auth-readiness-approval-def456/",
      ]),
    );
    expect(() => classifyStatusSnapshot(second)).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
  });

  it("07h rejects mixed status mode object and path-set drift", () => {
    const unstaged = unstagedStatusRecords();
    const mixed = [...unstaged];
    mixed[0] = statusType1Record(phaseModifiedPaths[0]!, "M.");
    const wrongMode = [...unstaged];
    wrongMode[0] = wrongMode[0]!.replace("100644 100644 100644", "100755 100755 100755");
    const wrongObject = [...unstaged];
    wrongObject[0] = wrongObject[0]!.replace(
      expectedTracked(phaseModifiedPaths[0]!).baseObject,
      zeroObjectId,
    );
    const extra = [...unstaged, "? unexpected.txt"];
    for (const records of [mixed, wrongMode, wrongObject, extra]) {
      const snapshot = parseStatusSnapshot(statusSnapshotBytes(phaseBase, records));
      expect(() => classifyStatusSnapshot(snapshot)).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
    }
  });

  it("08 locks ten runtime paths and excludes packet", () => {
    expect(packet().executionBinding.manifestPaths).toEqual(tenPaths);
    expect(tenPaths).not.toContain(packetPath);
  });

  it("09 historical ten-path Git objects remain immutable", () => {
    for (const path of tenPaths) {
      const historical = gitBytes(d70, path);
      expect(gitBytes(source, path)).toEqual(historical);
      expect(gitBytes(merge, path)).toEqual(historical);
    }
  }, 20_000);

  it("10 current ten-path overlay changes only the append-only handoff", () => {
    const changed = tenPaths.filter((path) => !bytes(path).equals(gitBytes(d70, path)));
    expect(changed).toEqual(["docs/DEVELOPMENT_HANDOFF.md"]);
  }, 30_000);

  it("11 recomputes historical and exact current ten-path manifests", () => {
    const historical = Buffer.from(
      tenPaths
        .map((path) => {
          const value = gitBytes(d70, path);
          return `${path}\0${value.length}\0${sha(value)}\0${blob(value)}\n`;
        })
        .join(""),
    );
    expect({ rows: tenPaths.length, bytes: historical.length, sha256: sha(historical) }).toEqual({
      rows: 10,
      bytes: 1753,
      sha256: manifestSha,
    });
    expect(canonicalManifest(tenPaths)).toEqual({
      rows: 10,
      bytes: 1753,
      sha256: currentTenManifestSha,
    });
  });

  it("12 adapter retains exact CLI/binding/revalidation and no governance import", () => {
    const text = bytes(tenPaths[6]!).toString("utf8");
    expect(text).toContain('export const CLI_MODE = "--execute-authorized-contract-self-test-v1"');
    expect(text).toContain(
      'export const MANIFEST_BINDING = "HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1"',
    );
    expect(text).toContain("manifest.revalidate();");
    expect(text).not.toContain(packetPath);
    const executorText = bytes(executorPath).toString("utf8");
    expect(executorText).toContain(manifestSha);
    expect(executorText).not.toContain(currentTenManifestSha);
    const addTypeSources = tenPaths
      .filter((path) => path.startsWith("scripts/"))
      .map((path) => bytes(path).toString("utf8"))
      .join("\n");
    expect(addTypeSources).not.toMatch(
      /ios-runtime-bootstrap|iOS 17\.5|Xcode_16\.2|downloadPlatform/u,
    );
  });

  it("13 locks transaction hash, modes, counts, caps and timeout", () => {
    const value = packet().transaction;
    expect(value).toMatchObject({
      transactionId: "R4B-ADDTYPE-CONTRACT-SELF-TEST-D70D8D9F-001",
      transactionIdSha256: "ac17e1dfe4c2f08c719eb89a73756e0f426f81d407ed4d38482fd07e4853c576",
      mode: "CONTRACT_SELF_TEST_V1_13_6",
      maximumAttempts: 1,
      cleanCompletedFixtureCount: 39,
      cleanDerivedLaunchedCompilerProcessCount: 1,
      cleanResidualCompilerProcessCount: 0,
      cleanResidualFixtureProcessCount: 0,
      cleanResidualOwnedProcessCount: 0,
      cleanNetworkBaselineOwnerCount: 2,
      cleanNetworkWorkOwnerCount: 40,
      cleanNetworkOwnerCount: 42,
      cleanNetworkEventCount: 0,
      networkTablesPerObservation: 4,
      innerReceiptMaximumBytes: 4096,
      outerReceiptMaximumBytes: 8192,
      outerObservationTimeoutMs: 330000,
    });
    expect(value).not.toHaveProperty("cleanCompilerProcessCount");
    expect(value).not.toHaveProperty("cleanFixtureProcessCount");
    expect(value).not.toHaveProperty("cleanOwnedChildProcessCount");
  });

  it("14 consumes at exclusive directory creation with no retry repair or delete", () => {
    expect(packet().transaction.attemptConsumedAt).toBe(
      "EXCLUSIVE_TRANSACTION_DIRECTORY_CREATE_SUCCESS",
    );
    expect(packet().durableConsumption).toMatchObject({
      directoryExistenceConsumesAttempt: true,
      retryAllowed: false,
      resumeAllowed: false,
      repairAllowed: false,
      deleteAllowed: false,
      retention: "PERMANENT_DO_NOT_DELETE_REPAIR_REUSE",
    });
  });

  it("15 locks marker receipt states schemas counts and retention", () => {
    expect(packet().outerReceipt).toEqual({
      schema: "R4B-ADDTYPE-CONTRACT-SELF-TEST-OUTER-RECEIPT-v1.1.2",
      maximumBytes: 8192,
      canonicalEncoding: "UTF8_NFC_COMPACT_JSON_ONE_LF",
      rawPathAllowed: false,
      rawOutputAllowed: false,
      innerRetainedArtifactCountRequired: 0,
      innerNumericalEvidenceProjection: {
        sourceReceiptKeyCount: 29,
        cleanAndFailedCleanRequireCompleteEvidence: true,
        cleanupHoldOuterProjection: "ALL_NUMERICAL_FIELDS_NULL",
        networkTablesPerObservation: 4,
        sourceFields: [
          "completedFixtureCount",
          "compilerProcessCount",
          "fixtureProcessCount",
          "cleanupStepCount",
          "networkBaselineOwnerCount",
          "networkWorkOwnerCount",
          "networkOwnerCount",
          "networkObservationCount",
          "networkMaximumGapMicros",
          "networkEventCount",
          "retainedArtifactCount",
        ],
        derivedFields: [
          "innerDerivedLaunchedCompilerProcessCount=networkWorkOwnerCount-completedFixtureCount",
          "innerDerivedNetworkTableIterationCount=networkObservationCount*4",
        ],
      },
      markerStateValues: [
        "VALID_CANONICAL",
        "ABSENT_AFTER_DIRECTORY_CONSUMPTION_HOLD",
        "PRESENT_INVALID_OR_PARTIAL_HOLD",
      ],
      retention: "PERMANENT_DO_NOT_DELETE_REPAIR_REUSE",
    });
  });

  it("16 locks pre/post tuple specialist CI and Elana gates", () => {
    expect(packet().preExecutionGates).toEqual({
      packetExactHeadElana: "REQUIRED_PASS_BEFORE_MERGE",
      protectedCi: "REQUIRED_SUCCESS",
      postMain: "REQUIRED_SUCCESS",
      postMainRepositoryIdentityTuple: "REQUIRED_FRESH_REVIEW",
      catalina: "REQUIRED_FRESH_PASS_ON_M_D70_IDENTITY_TUPLE",
      natalia: "REQUIRED_FRESH_PASS_ON_M_D70_IDENTITY_TUPLE",
      renata: "REQUIRED_FRESH_PASS_ON_M_D70_IDENTITY_TUPLE",
      postRunJulieta: "REQUIRED",
      postRunElana: "REQUIRED",
    });
  });

  it("17 leaves only synthetic authorization true", () => {
    expect(packet().authority).toEqual({
      syntheticBootstrapTestAuthorized: true,
      transactionAuthorizationPresent: true,
      externalActionAuthorized: false,
      downloadAuthorityPresent: false,
      executionAuthorityPresent: false,
      state: "PRECONDITION_HOLD_NO_GET",
    });
  });

  it("18 keeps E01-E08 ordered unattempted and forbidden", () => {
    const value = packet();
    expect(value.operationalScenarios).toEqual(
      Array.from({ length: 8 }, (_, index) => ({
        id: `E${String(index + 1).padStart(2, "0")}`,
        status: "REQUIRED_UNATTEMPTED",
      })),
    );
    for (const row of value.operationalScenarios) expect(value.forbiddenActions).toContain(row.id);
  });

  it("19 keeps completion and claim boundary closed", () => {
    expect(packet().completion).toEqual({
      r4b2: false,
      r4b3: false,
      aggregateR4b: false,
      sprint6: false,
    });
    expect(packet().claimBoundary).toBe(
      "ONE_ZERO_NETWORK_SYNTHETIC_CONTRACT_SELF_TEST_ONLY_NO_OPERATIONAL_OR_EXTERNAL_AUTHORITY",
    );
  });

  it("20 mutation table rejects authority and identity drift", () => {
    const original = packet();
    const mutations = [
      { ...original, schemaVersion: 1 },
      { ...original, packetId: `${original.packetId}-drift` },
      { ...original, recordedDate: "2026-11-14" },
      { ...original, decision: { ...original.decision, selection: "OPTION_B" } },
      {
        ...original,
        historicalDesignProvenance: {
          ...original.historicalDesignProvenance,
          sourceMainCommit: d70,
        },
      },
      { ...original, extra: true },
      {
        ...original,
        executionBinding: { ...original.executionBinding, executionCheckoutCommit: d660 },
      },
      {
        ...original,
        executionBinding: {
          ...original.executionBinding,
          repositoryIdentityBinding: {
            ...original.executionBinding.repositoryIdentityBinding,
            crossCloneAllowed: true,
          },
        },
      },
      {
        ...original,
        activationBundleBinding: { ...original.activationBundleBinding, pathCount: 7 },
      },
      {
        ...original,
        activationBundleBinding: {
          ...original.activationBundleBinding,
          reviewBinding: "DRIFT",
        },
      },
      {
        ...original,
        executorBinding: {
          ...original.executorBinding,
          nodeHost: { ...original.executorBinding.nodeHost, byteCount: 1 },
        },
      },
      { ...original, transaction: { ...original.transaction, maximumAttempts: 2 } },
      {
        ...original,
        transaction: { ...original.transaction, childStdoutMaximumBytes: 8192 },
      },
      {
        ...original,
        durableConsumption: { ...original.durableConsumption, deleteAllowed: true },
      },
      {
        ...original,
        outerReceipt: { ...original.outerReceipt, rawOutputAllowed: true },
      },
      {
        ...original,
        outerReceipt: {
          ...original.outerReceipt,
          innerNumericalEvidenceProjection: {
            ...original.outerReceipt.innerNumericalEvidenceProjection,
            cleanupHoldOuterProjection: "PARTIAL",
          },
        },
      },
      {
        ...original,
        preExecutionGates: { ...original.preExecutionGates, protectedCi: "OPTIONAL" },
      },
      { ...original, authority: { ...original.authority, executionAuthorityPresent: true } },
      {
        ...original,
        operationalScenarios: [
          { id: "E01", status: "PASS" },
          ...original.operationalScenarios.slice(1),
        ],
      },
      {
        ...original,
        forbiddenActions: original.forbiddenActions.filter((v: string) => v !== "GET"),
      },
      { ...original, completion: { ...original.completion, r4b2: true } },
      { ...original, claimBoundary: "EXPANDED" },
    ];
    expect(mutations).toHaveLength(22);
    expect(validatorRejectsAll(mutations)).toBe(true);

    const invocations: Array<{
      executable: string;
      args: readonly string[];
      options: ValidatorRunOptions;
    }> = [];
    const successfulRunner: ValidatorRunner = (
      executable: string,
      args: string[],
      options: ValidatorRunOptions,
    ) => {
      invocations.push({ executable, args, options });
      return {
        stdout: Buffer.alloc(0),
        status: 0,
        signal: null,
        error: undefined,
      };
    };
    expect(validatorRejectsAll([mutations[0]], successfulRunner)).toBe(true);
    expect(invocations).toHaveLength(1);
    expect(invocations[0]?.executable).toBe(process.execPath);
    expect(invocations[0]?.args.slice(0, 2)).toEqual(["--input-type=module", "--eval"]);
    const validatorInputPath = invocations[0]?.args.at(-1) ?? "";
    expect(isAbsolute(validatorInputPath)).toBe(true);
    expect(resolve(validatorInputPath)).toBe(validatorInputPath);
    expect(dirname(validatorInputPath)).toContain("fluyo-r4b-activation-validator-");
    expect(existsSync(dirname(validatorInputPath))).toBe(false);
    expect(invocations[0]?.options).toMatchObject({
      cwd: root,
      windowsHide: true,
      shell: false,
      timeout: 30_000,
      maxBuffer: 4096,
      env: {},
      stdio: ["ignore", "pipe", "ignore"],
    });
    expect(invocations[0]?.options).not.toHaveProperty("input");

    const fixedFailure = (result: ValidatorRunResult, expected: string) => {
      const runner: ValidatorRunner = () => result;
      let observed: unknown;
      try {
        validatorRejectsAll([{ privateSentinel: "MUST_NOT_LEAK" }], runner);
      } catch (error) {
        observed = error;
      }
      expect(observed).toBeInstanceOf(Error);
      expect((observed as Error).message).toBe(expected);
      expect((observed as Error).message).not.toContain("MUST_NOT_LEAK");
    };
    fixedFailure(
      {
        status: 1,
        signal: null,
        stdout: Buffer.from("0"),
        error: undefined,
      },
      "ACTIVATION_VALIDATOR_MUTATION_ACCEPTED",
    );
    for (const stdout of ["00", "-1", "1.0", "1", "raw-output-MUST_NOT_LEAK"])
      fixedFailure(
        { status: 1, signal: null, stdout: Buffer.from(stdout), error: undefined },
        "ACTIVATION_VALIDATOR_HARNESS_INVALID",
      );
    fixedFailure(
      {
        status: null,
        signal: "SIGTERM",
        stdout: Buffer.alloc(0),
        error: new Error("MUST_NOT_LEAK"),
      },
      "ACTIVATION_VALIDATOR_HARNESS_INVALID",
    );
  });

  it("21 activation record carries exact normative language", () => {
    const text = bytes(recordPath).toString("utf8");
    expect(text).toContain(
      [
        "1. `docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md`",
        "2. `docs/2026-11-13_r4b_addtype_contract_self_test_activation_v1.md`",
        "3. `packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts`",
        "4. `packages/shared/src/sprint-6-r4b-addtype-contract-self-test-executor.test.mjs`",
        "5. `scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-activation-v1.json`",
        "6. `scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.mjs`",
      ].join("\n"),
    );
    for (const sentence of [
      "The activation merge and execution checkout must be linked worktrees of one reviewed Git common-directory identity; cross-clone replay is forbidden.",
      "The exclusive transaction directory consumes the single attempt before marker creation or child spawn and is never deleted, repaired, resumed, retried, or reused.",
      "The outer marker and receipt are permanent governance evidence; they are not inner adapter artifacts and do not alter retainedArtifactCount=0.",
      "Renata alone may execute the one transaction after every post-main tuple gate passes.",
      "Elana remains the sole final independent exact-head and post-run QA owner.",
      "ONE_ZERO_NETWORK_SYNTHETIC_CONTRACT_SELF_TEST_ONLY_NO_OPERATIONAL_OR_EXTERNAL_AUTHORITY",
    ])
      expect(text).toContain(sentence);
    for (const numericalLiteral of [
      "completedFixtureCount=39",
      "compilerProcessCount=0",
      "fixtureProcessCount=0",
      "networkBaselineOwnerCount=2",
      "networkWorkOwnerCount=40",
      "networkOwnerCount=42",
      "innerDerivedLaunchedCompilerProcessCount=40-39=1",
      "innerDerivedNetworkTableIterationCount=networkObservationCount*4",
      "all-null",
    ])
      expect(text).toContain(numericalLiteral);
    expect(text).not.toMatch(/execution (?:occurred|completed)|phase complete/iu);
  });

  it("22 preserves exact d70 plan prefix and one approved append", () => {
    const value = bytes(planPath);
    expect(value.subarray(0, 99_892)).toEqual(gitBytes(d70, planPath));
    expect(sha(value.subarray(0, 99_892))).toBe(
      "b03b1101e21dcaec39a93b9886e7b6cac7282462155992a174e5078b0e45b3b7",
    );
    const append = value.subarray(99_892).toString("utf8");
    expect(
      append.match(/## 2026-11-13 — R4-B Add-Type contract self-test activation v1\.1\.2/gu),
    ).toHaveLength(1);
    expect(append).toContain(
      "Version v1.1.2 supersedes v1.1.1 only for numerical receipt semantics.",
    );
  });

  it("23 models a one-commit candidate and direct-child squash rule", () => {
    const temporary = mkdtempSync(resolve(tmpdir(), "fluyo-r4b-activation-git-"));
    const repository = resolve(temporary, "repo");
    const gitAt = (cwd: string, args: string[]): string =>
      execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true }).trim();
    try {
      execFileSync("git", ["clone", "--no-local", root, repository], {
        windowsHide: true,
        stdio: "ignore",
      });
      gitAt(repository, ["config", "user.name", "R4B Fixture"]);
      gitAt(repository, ["config", "user.email", "r4b-fixture@example.invalid"]);
      gitAt(repository, ["config", "core.autocrlf", "false"]);
      gitAt(repository, ["checkout", "--detach", d70]);
      gitAt(repository, ["switch", "-c", "candidate"]);
      for (const path of sixPaths) {
        const target = resolve(repository, path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, bytes(path));
      }
      gitAt(repository, ["add", "--", ...sixPaths]);
      gitAt(repository, ["-c", "commit.gpgsign=false", "commit", "-m", "candidate"]);
      const candidate = gitAt(repository, ["rev-parse", "HEAD"]);
      expect(gitAt(repository, ["rev-list", "--count", `${d70}..${candidate}`])).toBe("1");
      expect(gitAt(repository, ["diff", "--name-only", d70, candidate]).split(/\r?\n/u)).toEqual(
        sixPaths,
      );

      gitAt(repository, ["checkout", "--detach", d70]);
      gitAt(repository, ["switch", "-c", "activation-merge"]);
      gitAt(repository, ["merge", "--squash", candidate]);
      gitAt(repository, ["-c", "commit.gpgsign=false", "commit", "-m", "activation merge"]);
      const activationMerge = gitAt(repository, ["rev-parse", "HEAD"]);
      expect(gitAt(repository, ["rev-parse", `${activationMerge}^`])).toBe(d70);
      expect(gitAt(repository, ["rev-parse", `${activationMerge}:${packetPath}`])).toBe(
        blob(bytes(packetPath)),
      );
      expect(gitAt(repository, ["rev-parse", `${candidate}^{tree}`])).toBe(
        gitAt(repository, ["rev-parse", `${activationMerge}^{tree}`]),
      );

      const mergeWorktree = resolve(temporary, "wt-m");
      const executionWorktree = resolve(temporary, "wt-d70");
      gitAt(repository, ["worktree", "add", "--detach", mergeWorktree, activationMerge]);
      gitAt(repository, ["worktree", "add", "--detach", executionWorktree, d70]);
      expect(resolve(mergeWorktree, gitAt(mergeWorktree, ["rev-parse", "--git-common-dir"]))).toBe(
        resolve(executionWorktree, gitAt(executionWorktree, ["rev-parse", "--git-common-dir"])),
      );

      gitAt(repository, ["switch", "candidate"]);
      writeFileSync(
        resolve(repository, packetPath),
        Buffer.concat([bytes(packetPath), Buffer.from(" ")]),
      );
      gitAt(repository, ["add", "--", packetPath]);
      gitAt(repository, ["-c", "commit.gpgsign=false", "commit", "-m", "second candidate"]);
      const twoCommitCandidate = gitAt(repository, ["rev-parse", "HEAD"]);
      expect(gitAt(repository, ["rev-list", "--count", `${d70}..${twoCommitCandidate}`])).toBe("2");
      expect(gitAt(repository, ["rev-parse", `${twoCommitCandidate}:${packetPath}`])).not.toBe(
        blob(bytes(packetPath)),
      );

      gitAt(repository, ["switch", "activation-merge"]);
      writeFileSync(
        resolve(repository, packetPath),
        Buffer.concat([bytes(packetPath), Buffer.from("\n")]),
      );
      gitAt(repository, ["add", "--", packetPath]);
      gitAt(repository, ["-c", "commit.gpgsign=false", "commit", "-m", "later head"]);
      const laterHead = gitAt(repository, ["rev-parse", "HEAD"]);
      expect(gitAt(repository, ["rev-parse", `${laterHead}^`])).toBe(activationMerge);
      expect(gitAt(repository, ["rev-parse", `${laterHead}^`])).not.toBe(d70);
      expect(gitAt(repository, ["rev-parse", `${d70}^`])).not.toBe(d70);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  }, 90_000);

  it("24 locks six-row manifest formula while keeping digest external", () => {
    const value = packet();
    const computed = canonicalManifest(sixPaths);
    expect(value.activationBundleBinding.paths).toEqual(sixPaths);
    expect(value.activationBundleBinding.pathCount).toBe(6);
    expect(value.activationBundleBinding.manifestDigestCommitted).toBe(false);
    expect(value.activationBundleBinding).not.toHaveProperty("manifestSha256");
    expect(computed.rows).toBe(6);
    const originalRows = sixPaths.map((path) => {
      const value = bytes(path);
      return Buffer.from(`${path}\0${value.length}\0${sha(value)}\0${blob(value)}\n`);
    });
    expect(Buffer.concat(originalRows).length).toBe(computed.bytes);
    expect(sha(Buffer.concat(originalRows))).toBe(computed.sha256);
    for (let index = 0; index < sixPaths.length; index += 1) {
      const mutated = originalRows.map((row, rowIndex) =>
        rowIndex === index ? Buffer.concat([row, Buffer.from("x")]) : row,
      );
      expect(sha(Buffer.concat(mutated))).not.toBe(computed.sha256);
    }
    expect(canonicalManifest([...sixPaths].reverse()).sha256).not.toBe(computed.sha256);
    expect(canonicalManifest(sixPaths.slice(1)).sha256).not.toBe(computed.sha256);
  });

  it("25 binds the repair base and immutable exact-eight tree", () => {
    expect(repairBase).toBe("b3203f0b96db5efca6d3cd16e6eb39d80a9cd3a5");
    const commit = git(["cat-file", "commit", repairBase]);
    const [headers, ...messageParts] = commit.split("\n\n");
    const headerLines = headers?.split("\n") ?? [];
    expect(headerLines.filter((line) => line.startsWith("parent "))).toEqual([
      "parent a2485dc12c231dd482799834d5aca2966a6db494",
    ]);
    expect(headerLines.filter((line) => line.startsWith("tree "))).toEqual([
      "tree 8e7ee267b8bd93ca05cfe07e9bff05c8f66c70fb",
    ]);
    expect(messageParts.join("\n\n").split("\n")[0]).toBe(
      "ci(ios): bootstrap pinned iOS 17.5 runtime",
    );
    expect(typeof verifyPostcommitObject).toBe("function");
    expect(Object.keys(repairBaseTree).sort(compareUtf8)).toEqual(phasePaths);
    for (const path of phasePaths) {
      const expected = repairBaseTree[path as keyof typeof repairBaseTree];
      expect(git(["rev-parse", `${repairBase}:${path}`])).toBe(expected.blob);
      expect(git(["ls-tree", repairBase, "--", path]).split(/\s+/u)[0]).toBe(expected.mode);
    }
  });

  it("26 classifies the exact committed six-path repair as postcommit", () => {
    expect(repairPaths).toHaveLength(6);
    expect(repairPaths).not.toContain(".github/workflows/ios.yml");
    expect(repairPaths).not.toContain("scripts/ios-ci.sh");
    expect(classifyStatusSnapshot(parseStatusSnapshot(statusSnapshotBytes(recordsBase, [])))).toBe(
      "POSTCOMMIT",
    );
  });

  it("27 classifies the exact six-path staged repair", () => {
    const snapshot = parseStatusSnapshot(
      statusSnapshotBytes(repairBase, repairStatusRecords("M.")),
    );
    expect(classifyStatusSnapshot(snapshot)).toBe("PRECOMMIT_STAGED");
  });

  it("28 rejects mixed staged and unstaged repair state", () => {
    const records = repairStatusRecords(".M");
    records[0] = repairStatusRecords("M.")[0]!;
    expect(() =>
      classifyStatusSnapshot(parseStatusSnapshot(statusSnapshotBytes(repairBase, records))),
    ).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
  });

  it("29 rejects immutable workflow or ios-ci drift in the repair", () => {
    for (const path of [".github/workflows/ios.yml", "scripts/ios-ci.sh"]) {
      const expected = repairBaseTree[path as keyof typeof repairBaseTree];
      const row = [
        "1",
        ".M",
        "N...",
        expected.mode,
        expected.mode,
        expected.mode,
        expected.blob,
        expected.blob,
        path,
      ].join(" ");
      expect(() =>
        classifyStatusSnapshot(
          parseStatusSnapshot(statusSnapshotBytes(repairBase, [...repairStatusRecords(".M"), row])),
        ),
      ).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
    }
  });

  it("30 permits one exact auth temp root but rejects near matches", () => {
    const exact = parseStatusSnapshot(
      statusSnapshotBytes(repairBase, [
        ...repairStatusRecords(".M"),
        "? .tmp-auth-readiness-approval-Ab12z9/",
      ]),
    );
    expect(classifyStatusSnapshot(exact)).toBe("PRECOMMIT_UNSTAGED");
    for (const path of [
      ".tmp-auth-readiness-approval-Ab12z9.bak/",
      ".tmp-auth-readiness-approval-Ab12z/",
      "parent/.tmp-auth-readiness-approval-Ab12z9/",
    ]) {
      expect(() =>
        classifyStatusSnapshot(
          parseStatusSnapshot(
            statusSnapshotBytes(repairBase, [...repairStatusRecords(".M"), `? ${path}`]),
          ),
        ),
      ).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
    }
  });

  it("31 rejects every extra repair path", () => {
    expect(() =>
      classifyStatusSnapshot(
        parseStatusSnapshot(
          statusSnapshotBytes(repairBase, [...repairStatusRecords(".M"), "? unexpected.txt"]),
        ),
      ),
    ).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
  });

  it("32 requires one direct repair child of b320", () => {
    expect(() =>
      assertRepairDirectChildCommit(
        Buffer.from(`tree ${"2".repeat(40)}\nparent ${repairBase}\nauthor a\n\nmessage\n`),
      ),
    ).not.toThrow();
    expect(() =>
      assertRepairDirectChildCommit(
        Buffer.from(
          `tree ${"2".repeat(40)}\nparent ${repairBase}\nparent ${"3".repeat(40)}\nauthor a\n\nmessage\n`,
        ),
      ),
    ).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
  });

  it("33 binds the immutable 22dede repair commit and exact-eight tree", () => {
    expect(recordsBase).toBe("22dede4b31071aad68c607eabf3aec0a46544fe3");
    const commit = git(["cat-file", "commit", recordsBase]);
    const [headers, ...messageParts] = commit.split("\n\n");
    const headerLines = headers?.split("\n") ?? [];
    expect(headerLines.filter((line) => line.startsWith("parent "))).toEqual([
      `parent ${repairBase}`,
    ]);
    expect(headerLines.filter((line) => line.startsWith("tree "))).toEqual([
      `tree ${recordsBaseTreeId}`,
    ]);
    expect(messageParts.join("\n\n").split("\n")[0]).toBe(recordsBaseSubject);
    expect(Object.keys(recordsBaseTree).sort(compareUtf8)).toEqual(phasePaths);
    for (const path of phasePaths) {
      const expected = recordsBaseTree[path as keyof typeof recordsBaseTree];
      expect(git(["rev-parse", `${recordsBase}:${path}`])).toBe(expected.blob);
      expect(git(["ls-tree", recordsBase, "--", path]).split(/\s+/u)[0]).toBe(expected.mode);
    }
  });

  it("34 classifies the exact three-path records repair before and after commit", () => {
    expect(recordsRepairPaths).toEqual([
      "docs/DEVELOPMENT_HANDOFF.md",
      "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts",
      "packages/shared/src/sprint-6-r4b-addtype-postmain-readiness.test.ts",
    ]);
    const precommit = parseStatusSnapshot(
      statusSnapshotBytes(recordsBase, recordsRepairStatusRecords(".M")),
    );
    expect(classifyStatusSnapshot(precommit)).toBe("PRECOMMIT_UNSTAGED");
    const live = captureStatusSnapshot();
    const livePhase = classifyStatusSnapshot(live);
    if (live.entries.length === 0) {
      expect(livePhase).toBe("POSTCOMMIT");
    } else {
      expect(live.oid).toBe(oracleRepairBase);
      const liveXy = [...new Set(live.entries.map((entry) => entry.xy))];
      expect(liveXy).toHaveLength(1);
      expect(livePhase).toBe(liveXy[0] === ".M" ? "PRECOMMIT_UNSTAGED" : "PRECOMMIT_STAGED");
    }
  });

  it("35 classifies only the exact three-path records repair as staged", () => {
    const snapshot = parseStatusSnapshot(
      statusSnapshotBytes(recordsBase, recordsRepairStatusRecords("M.")),
    );
    expect(classifyStatusSnapshot(snapshot)).toBe("PRECOMMIT_STAGED");
  });

  it("36 keeps the original 22dede state postcommit and requires one direct records child", () => {
    expect(classifyStatusSnapshot(parseStatusSnapshot(statusSnapshotBytes(recordsBase, [])))).toBe(
      "POSTCOMMIT",
    );
    expect(() =>
      assertRecordsDirectChildCommit(
        Buffer.from(`tree ${"4".repeat(40)}\nparent ${recordsBase}\nauthor a\n\nmessage\n`),
      ),
    ).not.toThrow();
    expect(() =>
      assertRecordsDirectChildCommit(
        Buffer.from(`tree ${"4".repeat(40)}\nparent ${repairBase}\nauthor a\n\nmessage\n`),
      ),
    ).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
  });

  it("37 rejects mixed, unknown, added, deleted, renamed, duplicate, extra, or untracked records", () => {
    const mixed = recordsRepairStatusRecords(".M");
    mixed[0] = recordsRepairStatusRecords("M.")[0]!;
    const expected = expectedRecordsRepairTracked(recordsRepairPaths[0]!);
    const wrongStatuses = ["A.", "C.", "D.", "R.", "T.", "U."] as const;
    const malformed = wrongStatuses.map((xy) =>
      [
        "1",
        xy,
        "N...",
        expected.mode,
        expected.mode,
        expected.mode,
        expected.baseObject,
        expected.candidateObject,
        recordsRepairPaths[0],
      ].join(" "),
    );
    const invalidRows = [
      mixed,
      [...recordsRepairStatusRecords(".M"), recordsRepairStatusRecords(".M")[0]!],
      [...recordsRepairStatusRecords(".M"), "? .tmp-auth-readiness-approval-Ab12z9/"],
      [...recordsRepairStatusRecords(".M"), "? unexpected.txt"],
      ...malformed.map((row) => [row, ...recordsRepairStatusRecords(".M").slice(1)]),
    ];
    for (const rows of invalidRows)
      expect(() =>
        classifyStatusSnapshot(parseStatusSnapshot(statusSnapshotBytes(recordsBase, rows))),
      ).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
    for (const row of ["2 R. N... unsafe", "u UU N... unsafe", "! ignored", "x unknown"])
      expect(() => parseStatusSnapshot(statusSnapshotBytes(recordsBase, [row]))).toThrow(
        "IOS17_PHASE_TOPOLOGY_INVALID",
      );
  });

  it("38 binds immutable 02b portable-repair base and exact-eight tree", () => {
    expect(oracleRepairBase).toBe("02b28be6d7a6bc5fe60ee1e73caa579ff33874a0");
    const commit = git(["cat-file", "commit", oracleRepairBase]);
    const [headers, ...messageParts] = commit.split("\n\n");
    const headerLines = headers?.split("\n") ?? [];
    expect(headerLines.filter((line) => line.startsWith("parent "))).toEqual([
      `parent ${recordsBase}`,
    ]);
    expect(headerLines.filter((line) => line.startsWith("tree "))).toEqual([
      `tree ${oracleRepairBaseTreeId}`,
    ]);
    expect(messageParts.join("\n\n").split("\n")[0]).toBe(oracleRepairBaseSubject);
    expect(Object.keys(oracleRepairBaseTree).sort(compareUtf8)).toEqual(phasePaths);
    for (const path of phasePaths) {
      const expected = oracleRepairBaseTree[path as keyof typeof oracleRepairBaseTree];
      expect(git(["rev-parse", `${oracleRepairBase}:${path}`])).toBe(expected.blob);
      expect(git(["ls-tree", oracleRepairBase, "--", path]).split(/\s+/u)[0]).toBe(expected.mode);
    }
  });

  it("39 classifies exact four-path portable repair unstaged and staged", () => {
    for (const [xy, expected] of [
      [".M", "PRECOMMIT_UNSTAGED"],
      ["M.", "PRECOMMIT_STAGED"],
    ] as const) {
      const snapshot = parseStatusSnapshot(
        statusSnapshotBytes(oracleRepairBase, oracleRepairStatusRecords(xy)),
      );
      expect(classifyStatusSnapshot(snapshot)).toBe(expected);
    }
  });

  it("40 rejects mixed, extra, untracked, or production portable-repair drift", () => {
    const mixed = oracleRepairStatusRecords(".M");
    mixed[0] = oracleRepairStatusRecords("M.")[0]!;
    const baseRows = oracleRepairStatusRecords(".M");
    const expected = expectedOracleRepairTracked(oracleRepairPaths[0]!);
    const wrongStatuses = ["A.", "C.", "D.", "R.", "T.", "U."] as const;
    const statusMutations = wrongStatuses.map((xy) => [
      [
        "1",
        xy,
        "N...",
        expected.mode,
        expected.mode,
        expected.mode,
        expected.baseObject,
        expected.baseObject,
        oracleRepairPaths[0],
      ].join(" "),
      ...baseRows.slice(1),
    ]);
    const productionRows = [
      ".github/workflows/ios.yml",
      "packages/shared/src/ios-foundation-structure.test.ts",
      "scripts/ios-ci.sh",
      "scripts/ios-runtime-bootstrap.mjs",
    ].map((path) => {
      const production = oracleRepairBaseTree[path as keyof typeof oracleRepairBaseTree];
      return [
        ...baseRows,
        [
          "1",
          ".M",
          "N...",
          production.mode,
          production.mode,
          production.mode,
          production.blob,
          production.blob,
          path,
        ].join(" "),
      ];
    });
    const exactConcurrent = "? .tmp-auth-readiness-approval-Ab12z9/";
    for (const xy of [".M", "M."] as const) {
      const accepted = parseStatusSnapshot(
        statusSnapshotBytes(oracleRepairBase, [...oracleRepairStatusRecords(xy), exactConcurrent]),
      );
      expect(classifyStatusSnapshot(accepted)).toBe(
        xy === ".M" ? "PRECOMMIT_UNSTAGED" : "PRECOMMIT_STAGED",
      );
    }
    const invalidRows = [
      mixed,
      [...baseRows, baseRows[0]!],
      [...baseRows, exactConcurrent, "? .tmp-auth-readiness-approval-Cd34x8/"],
      [...baseRows, "? .tmp-auth-readiness-approval-Ab12z9.bak/"],
      [...baseRows, "? nested/.tmp-auth-readiness-approval-Ab12z9/"],
      [...baseRows, "? unexpected.txt"],
      ...productionRows,
      ...statusMutations,
    ];
    for (const rows of invalidRows)
      expect(() =>
        classifyStatusSnapshot(parseStatusSnapshot(statusSnapshotBytes(oracleRepairBase, rows))),
      ).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");

    expect(() =>
      classifyStatusSnapshot(
        parseStatusSnapshot(statusSnapshotBytes(oracleRepairBase, [exactConcurrent])),
      ),
    ).toThrow("IOS17_PHASE_TOPOLOGY_INVALID");
  });

  it("41 requires one direct 02b child with exact four-path raw diff", () => {
    expect(() =>
      assertOracleRepairDirectChildCommit(
        Buffer.from(`tree ${"4".repeat(40)}\nparent ${oracleRepairBase}\nauthor a\n\nmessage\n`),
      ),
    ).not.toThrow();
    expect(() => assertOracleRepairRawDiff(oracleRepairRawDiff())).not.toThrow();
    for (const commit of [
      `tree ${"4".repeat(40)}\nparent ${recordsBase}\nauthor a\n\nmessage\n`,
      `tree ${"4".repeat(40)}\nparent ${oracleRepairBase}\nparent ${recordsBase}\nauthor a\n\nmessage\n`,
    ])
      expect(() => assertOracleRepairDirectChildCommit(Buffer.from(commit))).toThrow(
        "IOS17_PHASE_TOPOLOGY_INVALID",
      );
  });

  it("42 rejects portable-repair mode, base blob, candidate blob, path, or row drift", () => {
    const mutations = [
      (rows: string[]) => [rows[0]!.replace(/^:100644/u, ":100755"), ...rows.slice(1)],
      (rows: string[]) => [rows[0]!.replace(/[0-9a-f]{40}/u, "0".repeat(40)), ...rows.slice(1)],
      (rows: string[]) => {
        const parts = rows[0]!.split(" ");
        parts[3] = "1".repeat(40);
        return [parts.join(" "), ...rows.slice(1)];
      },
      (rows: string[]) => [rows[0]!, "unexpected.txt", ...rows.slice(2)],
      (rows: string[]) => [rows[0]!.replace(/ M$/u, " A"), ...rows.slice(1)],
    ];
    for (const mutate of mutations)
      expect(() => assertOracleRepairRawDiff(oracleRepairRawDiff(mutate))).toThrow(
        "IOS17_PHASE_TOPOLOGY_INVALID",
      );
  });
});
