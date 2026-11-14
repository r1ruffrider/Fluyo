import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const recordPath = "docs/2026-11-12_r4b_addtype_postmain_readiness_v1.md";
const planPath = "docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md";
const handoffPath = "docs/DEVELOPMENT_HANDOFF.md";
const decisionPath = "docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md";
const canonicalRecordHeading = "## Canonical readiness record";
const reviewedSourceCommit = "7220bef062a93142f5bcde07de89199355eb5837";
const designMergeCommit = "7a5b345846eb29928dacb8f01b96796c01182dc2";
const readinessMergeCommit = "d70d8d9f3510b8b4a83f18478dc79dece39094d6";
const candidateBase = "a2485dc12c231dd482799834d5aca2966a6db494";
const reviewedBranchRoot = "c579699c273301599d81c89cec6ba0696e34e313";
const overlayRepairCommit = "e0325f067330a095aa337790d771ed2027204bbb";
const recordsParentCommit = "2ee6312b02ad1393456603fe2a519cf3c20cce8c";
const recordsSnapshotCommit = "ee4e77996d646cb880e9a86ea5003c4edce470c5";
const activationTestPath =
  "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts";
const readinessTestPath = "packages/shared/src/sprint-6-r4b-addtype-postmain-readiness.test.ts";
const repairPaths = [activationTestPath, readinessTestPath] as const;
const reviewedLocalCumulativePaths = [
  "docs/2026-11-14_r4b_windows_python_reviewed_local_binding_v2.md",
  "docs/DEVELOPMENT_HANDOFF.md",
  "packages/shared/src/auth-runtime-synthetic-contract.test.ts",
  activationTestPath,
  readinessTestPath,
  "scripts/r4b-evidence/r4b-test-lanes.mjs",
  "scripts/r4b-evidence/reviewed-local-python-native-lease-v2.cs",
  "scripts/r4b-evidence/reviewed-local-python-transaction.mjs",
  "scripts/r4b-evidence/reviewed-local-python-transaction.test.mjs",
  "scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs",
  "scripts/r4b-evidence/test-python-binding.mjs",
  "scripts/r4b-evidence/windows-native-test-journal-runner.test.mjs",
] as const;
const reviewedLocalCumulativeStatuses = [
  "A",
  "M",
  "M",
  "M",
  "M",
  "M",
  "A",
  "A",
  "A",
  "M",
  "M",
  "M",
] as const;
const durableSquashMembers = [
  {
    path: reviewedLocalCumulativePaths[0],
    status: "A",
    bytes: 12_245,
    sha256: "a82ff2f9bd724bd9711af577332cb9f221c96d6dedac47e57cd3700e85ed72d6",
    blob: "14214bb9c401b52d97f7c45c3942549091b8e979",
  },
  {
    path: reviewedLocalCumulativePaths[1],
    status: "M",
    bytes: 259_496,
    sha256: "28c0ed4cb1292d0351a74848abd88c2a308f7d3d3f63691fbffd884a36bc3f5b",
    blob: "ac27214f98de252a2a4e07b4421971bb9639c12d",
  },
  {
    path: reviewedLocalCumulativePaths[2],
    status: "M",
    bytes: 39_393,
    sha256: "f248b5256b7e356ad2693600aa5acd8b275cf97a01e02d009f9a2c3f50f99d2c",
    blob: "c35df7e1d738d9a6f547232d3c2abfb6f3a23e46",
  },
  { path: reviewedLocalCumulativePaths[3], status: "M", bytes: null, sha256: null, blob: null },
  { path: reviewedLocalCumulativePaths[4], status: "M", bytes: null, sha256: null, blob: null },
  {
    path: reviewedLocalCumulativePaths[5],
    status: "M",
    bytes: 16_061,
    sha256: "1175b9e2e020cc2a1afbfcf393a349d2f585a6a3e229526be02bbffb6b74cc33",
    blob: "baa29d3e92aaeb6e2328829254997c351937ae0e",
  },
  {
    path: reviewedLocalCumulativePaths[6],
    status: "A",
    bytes: 83_099,
    sha256: "94680fca6a0de04efbb46b5ab40f84ac3f885bbeeb167e8ebb6c60bc7d7b7d4d",
    blob: "54d8fa97799cea2064194775a790f611594f8605",
  },
  {
    path: reviewedLocalCumulativePaths[7],
    status: "A",
    bytes: 60_857,
    sha256: "87f2ef4cd8e5b3c76175abf5bc173f8309ed5511a441345004487484925ce3cb",
    blob: "de98c5b5f7d3aa74e836c2a408be0dd4c0bdd5c7",
  },
  {
    path: reviewedLocalCumulativePaths[8],
    status: "A",
    bytes: 56_031,
    sha256: "c7187201657e0302c663d786205b231556fe8a749b26eb0e627c556f09574146",
    blob: "458f11978f75e0d355c06afd9ed9efaf0b7b8e37",
  },
  {
    path: reviewedLocalCumulativePaths[9],
    status: "M",
    bytes: 196_187,
    sha256: "0610699e1570dbeb6f5e74fc99930ee2468c03a33571496e351402f5accf413d",
    blob: "394d2cca3f9f36f381bb7c5ef32ffa2ec7a0ca75",
  },
  {
    path: reviewedLocalCumulativePaths[10],
    status: "M",
    bytes: 38_042,
    sha256: "3562a581f8dc5d88b180ce496778d32393bbd34a21d5400de2894b4bbc5e19ae",
    blob: "e9fcf37968723579aba54363bd70ad31a238e2bc",
  },
  {
    path: reviewedLocalCumulativePaths[11],
    status: "M",
    bytes: 93_129,
    sha256: "4f67a0ee7aced308b8e45d1731792fbfe26ddfa4796b9c98c111f269e424a970",
    blob: "82796332c0dc54325e8e3b0064342d2547a337cb",
  },
] as const;
const lifecycleHelperSymbol = Symbol.for("fluyo:r4b:addtype:lifecycle-helper-only:v1");

const sha256 = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");
const blob = (bytes: Buffer): string =>
  createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
    .digest("hex");

const expectedRecord = {
  schema: "fluyo:r4b:addtype-postmain-readiness:v1",
  recordedDate: "2026-11-12",
  repositoryMainCommit: "7a5b345846eb29928dacb8f01b96796c01182dc2",
  reviewedPullRequest: {
    number: 89,
    reviewedHead: "7220bef062a93142f5bcde07de89199355eb5837",
    relationship: "SQUASH_SOURCE",
    mergeCommit: "7a5b345846eb29928dacb8f01b96796c01182dc2",
    mergedAtUtc: "2026-11-12T12:22:17Z",
  },
  reviewedManifest: {
    rowCount: 10,
    byteCount: 1753,
    sha256: "15b3ff5f2158b0eb7839591a0aad3373491afff45b2e7dc6a4eda2e3f607ea2b",
  },
  postMainVerification: {
    workflowCount: 3,
    successfulWorkflowCount: 3,
    ciJobCount: 9,
    successfulCiJobCount: 9,
    retryCount: 0,
    status: "SUCCESS",
  },
  operationalScenarios: [
    { id: "E01", status: "REQUIRED_UNATTEMPTED" },
    { id: "E02", status: "REQUIRED_UNATTEMPTED" },
    { id: "E03", status: "REQUIRED_UNATTEMPTED" },
    { id: "E04", status: "REQUIRED_UNATTEMPTED" },
    { id: "E05", status: "REQUIRED_UNATTEMPTED" },
    { id: "E06", status: "REQUIRED_UNATTEMPTED" },
    { id: "E07", status: "REQUIRED_UNATTEMPTED" },
    { id: "E08", status: "REQUIRED_UNATTEMPTED" },
  ],
  authority: {
    externalActionAuthorized: false,
    downloadAuthorityPresent: false,
    executionAuthorityPresent: false,
    draftMutationAuthorized: false,
    state: "PRECONDITION_HOLD_NO_GET",
  },
  completion: {
    r4b2: false,
    aggregateR4b: false,
    sprint6: false,
  },
  observedOpenDraftPullRequests: [87, 77, 61, 58],
  claimBoundary: "REPOSITORY_ONLY_POST_MAIN_VERIFIED_NO_OPERATIONAL_AUTHORITY",
} as const;

const readBytes = (path: string): Buffer => readFileSync(resolve(root, path));
const gitBytes = (commit: string, path: string): Buffer =>
  execFileSync("git", ["show", `${commit}:${path}`], { cwd: root, windowsHide: true });
const compareUtf8 = (left: string, right: string): number =>
  Buffer.compare(Buffer.from(left), Buffer.from(right));
const lifecycleFailure = (): never => {
  throw new Error("ADDTYPE_LIFECYCLE_INVALID");
};
const gitAt = (cwd: string, args: string[]): string =>
  execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true }).trim();
const gitRawAt = (cwd: string, args: string[]): Buffer =>
  execFileSync("git", args, { cwd, windowsHide: true });
const bytesAt = (cwd: string, path: string): Buffer => readFileSync(resolve(cwd, path));
const gitBytesAt = (cwd: string, commit: string, path: string): Buffer =>
  execFileSync("git", ["show", `${commit}:${path}`], { cwd, windowsHide: true });
const gitLinesAt = (cwd: string, args: string[]): string[] => {
  const output = gitAt(cwd, args);
  return output === "" ? [] : output.split(/\r?\n/u).filter(Boolean);
};
const commitParentsAt = (cwd: string, commit: string): string[] => {
  const row = gitAt(cwd, ["rev-list", "--parents", "-n", "1", commit]).split(" ");
  if (row[0] !== commit) lifecycleFailure();
  return row.slice(1);
};
const isAncestorAt = (cwd: string, left: string, right: string): boolean => {
  const result = spawnSync("git", ["merge-base", "--is-ancestor", left, right], {
    cwd,
    windowsHide: true,
    stdio: "ignore",
  });
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  return lifecycleFailure();
};
const fixedCommitExistsAt = (cwd: string, commit: string): boolean => {
  const result = spawnSync("git", ["rev-parse", "--verify", "--quiet", `${commit}^{commit}`], {
    cwd,
    windowsHide: true,
    stdio: "ignore",
    timeout: 5_000,
  });
  if (result.signal !== null || result.error !== undefined || result.status === null)
    return lifecycleFailure();
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  return lifecycleFailure();
};
const ancestryChainAt = (cwd: string, from: string, to: string): string[] =>
  gitLinesAt(cwd, ["rev-list", "--reverse", "--ancestry-path", `${from}..${to}`]);

type PorcelainEntry = Readonly<{ path: string; xy: ".M" | "M." }>;
const parsePorcelainV2 = (input: Buffer): PorcelainEntry[] => {
  const rows = input.toString("utf8").split("\0");
  if (rows.pop() !== "") lifecycleFailure();
  const entries: PorcelainEntry[] = [];
  for (const row of rows) {
    if (!row.startsWith("1 ")) lifecycleFailure();
    const fields = row.split(" ");
    if (
      fields.length < 9 ||
      fields[2] !== "N..." ||
      fields[3] !== "100644" ||
      fields[4] !== "100644" ||
      fields[5] !== "100644" ||
      !/^[0-9a-f]{40}$/u.test(fields[6] ?? "") ||
      !/^[0-9a-f]{40}$/u.test(fields[7] ?? "")
    )
      lifecycleFailure();
    const candidateXy = fields[1];
    const xy: PorcelainEntry["xy"] =
      candidateXy === ".M" || candidateXy === "M." ? candidateXy : lifecycleFailure();
    const path = fields.slice(8).join(" ");
    if (
      path === "" ||
      path !== path.normalize("NFC") ||
      path.includes("\\") ||
      entries.some((entry) => entry.path === path)
    )
      lifecycleFailure();
    entries.push(Object.freeze({ path, xy }));
  }
  return entries.sort((left, right) => compareUtf8(left.path, right.path));
};
const statusAt = (cwd: string): PorcelainEntry[] =>
  parsePorcelainV2(gitRawAt(cwd, ["status", "--porcelain=v2", "-z", "--untracked-files=all"]));
const isExactPrecommitStatus = (status: PorcelainEntry[]): boolean =>
  JSON.stringify(status.map(({ path }) => path)) === JSON.stringify(repairPaths) &&
  new Set(status.map(({ xy }) => xy)).size === 1;

const sensitiveHandoffKeys = [
  "externalactionauthorized",
  "downloadauthoritypresent",
  "executionauthoritypresent",
  "draftmutationauthorized",
  "selftestauthorized",
  "acquisitionauthorized",
  "verifierexecutionauthorized",
  "helperexecutionauthorized",
  "brokerauthorized",
  "attempt004authorized",
  "precondition_hold_no_get",
  "r4b2",
  "aggregater4b",
  "sprint6",
] as const;
const requiredFalseHandoffKeys = sensitiveHandoffKeys.slice(0, 3);
const holdToken = "precondition_hold_no_get";
const asciiWhitespace = /[\u0009-\u000d\u0020]+/gu;
type HandoffAssignment = Readonly<{ key: string; value: boolean }>;
const canonicalAssignment = (value: string): HandoffAssignment | "HOLD" | null => {
  const compact = value
    .toLowerCase()
    .replace(asciiWhitespace, "")
    .replace(/^[-*+]/u, "");
  if (compact === holdToken) return "HOLD";
  if (/^["']?state["']?[:=]["']?precondition_hold_no_get["']?$/u.test(compact)) return "HOLD";
  const match = compact.match(/^["']?([a-z0-9_]+)["']?[:=]["']?(true|false)["']?$/u);
  if (match === null) return null;
  return Object.freeze({ key: match[1]!, value: match[2] === "true" });
};
const countSubstring = (value: string, needle: string): number => {
  let count = 0;
  for (
    let offset = value.indexOf(needle);
    offset !== -1;
    offset = value.indexOf(needle, offset + 1)
  )
    count += 1;
  return count;
};
const scanHandoffAuthority = (suffix: string): boolean => {
  const recognized: Array<HandoffAssignment | "HOLD"> = [];
  for (const line of suffix.split("\n")) {
    const candidate = canonicalAssignment(line);
    if (candidate !== null) recognized.push(candidate);
  }
  for (const match of suffix.matchAll(/`([^`\r\n]+)`/gu)) {
    const candidate = canonicalAssignment(match[1]!);
    if (candidate !== null) recognized.push(candidate);
  }
  for (const match of suffix.matchAll(/(?:\{|,)([^,}\]]+)(?=,|\}|\])/gu)) {
    const candidate = canonicalAssignment(match[1]!);
    if (candidate !== null) recognized.push(candidate);
  }

  const compact = suffix.toLowerCase().replace(asciiWhitespace, "");
  for (const token of sensitiveHandoffKeys) {
    const observed = countSubstring(compact, token);
    const consumed = recognized.filter((entry) =>
      entry === "HOLD" ? token === holdToken : entry.key === token,
    ).length;
    if (observed !== consumed) return false;
  }

  const assignments = recognized.filter((entry): entry is HandoffAssignment => entry !== "HOLD");
  if (
    assignments.some(
      ({ key, value }) =>
        !sensitiveHandoffKeys.includes(key as (typeof sensitiveHandoffKeys)[number]) ||
        (key === holdToken ? true : value),
    )
  )
    return false;
  if (
    !requiredFalseHandoffKeys.every((key) =>
      assignments.some((entry) => entry.key === key && entry.value === false),
    )
  )
    return false;
  return recognized.includes("HOLD");
};
const safeHandoffAppend = (previous: Buffer, current: Buffer): boolean => {
  if (current.length < previous.length || !current.subarray(0, previous.length).equals(previous))
    return false;
  const suffixBytes = current.subarray(previous.length);
  if (suffixBytes.length === 0) return true;
  if (suffixBytes[0] !== 0x0a || suffixBytes.at(-1) !== 0x0a || suffixBytes.includes(0x00))
    return false;
  let suffix: string;
  try {
    suffix = new TextDecoder("utf-8", { fatal: true }).decode(suffixBytes);
  } catch {
    return false;
  }
  if (suffix !== suffix.normalize("NFC")) return false;
  return scanHandoffAuthority(suffix);
};

type ChangedEntry = Readonly<{ path: string; status: "A" | "M" }>;
const changedEntriesAt = (cwd: string, before: string, after: string): ChangedEntry[] => {
  const entries: ChangedEntry[] = [];
  for (const row of gitLinesAt(cwd, ["diff", "--name-status", before, after])) {
    const fields = row.split("\t");
    if (fields.length !== 2 || (fields[0] !== "A" && fields[0] !== "M")) lifecycleFailure();
    const status: ChangedEntry["status"] =
      fields[0] === "A" || fields[0] === "M" ? fields[0] : lifecycleFailure();
    const path = fields[1] ?? "";
    if (
      path === "" ||
      path !== path.normalize("NFC") ||
      path.includes("\\") ||
      entries.some((entry) => entry.path === path)
    )
      lifecycleFailure();
    entries.push(Object.freeze({ path, status }));
  }
  return entries.sort((left, right) => compareUtf8(left.path, right.path));
};
const expectedSquashEntries = reviewedLocalCumulativePaths.map((path, index) =>
  Object.freeze({ path, status: reviewedLocalCumulativeStatuses[index]! }),
);
const verifyImmutableReviewedChain = (cwd: string): void => {
  for (const [commit, parent] of [
    [reviewedBranchRoot, candidateBase],
    [overlayRepairCommit, reviewedBranchRoot],
    [recordsParentCommit, overlayRepairCommit],
    [recordsSnapshotCommit, recordsParentCommit],
  ] as const)
    if (JSON.stringify(commitParentsAt(cwd, commit)) !== JSON.stringify([parent]))
      lifecycleFailure();
};
const bindRepairBytes = (cwd: string, commit: string): void => {
  for (const path of repairPaths)
    if (!gitBytesAt(cwd, commit, path).equals(readBytes(path))) lifecycleFailure();
};
const verifyDurableSquashMembers = (cwd: string, commit: string): void => {
  for (const member of durableSquashMembers) {
    const value = gitBytesAt(cwd, commit, member.path);
    if (repairPaths.includes(member.path as (typeof repairPaths)[number])) {
      if (!value.equals(readBytes(member.path))) lifecycleFailure();
      continue;
    }
    if (
      value.length !== member.bytes ||
      sha256(value) !== member.sha256 ||
      blob(value) !== member.blob
    )
      lifecycleFailure();
  }
};
const verifyLaterHistory = (cwd: string, firstChild: string, commits: string[]): void => {
  let previous = firstChild;
  let previousHandoff = gitBytesAt(cwd, firstChild, handoffPath);
  for (const commit of commits) {
    if (JSON.stringify(commitParentsAt(cwd, commit)) !== JSON.stringify([previous]))
      lifecycleFailure();
    for (const path of reviewedLocalCumulativePaths) {
      if (path === handoffPath) continue;
      if (!gitBytesAt(cwd, commit, path).equals(gitBytesAt(cwd, previous, path)))
        lifecycleFailure();
    }
    const currentHandoff = gitBytesAt(cwd, commit, handoffPath);
    if (!safeHandoffAppend(previousHandoff, currentHandoff)) lifecycleFailure();
    previousHandoff = currentHandoff;
    previous = commit;
  }
};

export type AddTypeLifecycleMode = "PRECOMMIT" | "BRANCH" | "SQUASH_MAIN";
export const verifyAddTypeLifecycleAt = (
  cwd: string,
): Readonly<{
  schema: "fluyo:r4b:addtype:lifecycle-evidence:v1";
  mode: AddTypeLifecycleMode;
  head: string;
  anchor: string;
  firstChild: string | null;
  recordsSnapshot: "ee4e77996d646cb880e9a86ea5003c4edce470c5";
  repairPathCount: 2;
  protectedPathCount: 12;
}> => {
  const head = gitAt(cwd, ["rev-parse", "HEAD"]);
  const status = statusAt(cwd);
  let mode: AddTypeLifecycleMode;
  let anchor: string;
  let firstChild: string | null = null;

  if (head === recordsSnapshotCommit) {
    verifyImmutableReviewedChain(cwd);
    if (!isExactPrecommitStatus(status)) lifecycleFailure();
    for (const path of repairPaths) {
      const workingBytes = bytesAt(cwd, path);
      if (
        workingBytes.equals(gitBytesAt(cwd, recordsSnapshotCommit, path)) ||
        !workingBytes.equals(readBytes(path))
      )
        lifecycleFailure();
    }
    mode = "PRECOMMIT";
    anchor = recordsSnapshotCommit;
  } else {
    if (status.length !== 0) lifecycleFailure();
    const recordsSnapshotExists = fixedCommitExistsAt(cwd, recordsSnapshotCommit);
    if (recordsSnapshotExists && isAncestorAt(cwd, recordsSnapshotCommit, head)) {
      verifyImmutableReviewedChain(cwd);
      const commits = ancestryChainAt(cwd, recordsSnapshotCommit, head);
      firstChild = commits[0] ?? lifecycleFailure();
      if (
        JSON.stringify(commitParentsAt(cwd, firstChild)) !==
          JSON.stringify([recordsSnapshotCommit]) ||
        JSON.stringify(changedEntriesAt(cwd, recordsSnapshotCommit, firstChild)) !==
          JSON.stringify(repairPaths.map((path) => ({ path, status: "M" })))
      )
        lifecycleFailure();
      bindRepairBytes(cwd, firstChild);
      if (
        !safeHandoffAppend(
          gitBytesAt(cwd, recordsSnapshotCommit, handoffPath),
          gitBytesAt(cwd, firstChild, handoffPath),
        )
      )
        lifecycleFailure();
      verifyLaterHistory(cwd, firstChild, commits.slice(1));
      mode = "BRANCH";
      anchor = recordsSnapshotCommit;
    } else {
      if (!isAncestorAt(cwd, candidateBase, head)) lifecycleFailure();
      const commits = ancestryChainAt(cwd, candidateBase, head);
      firstChild = commits[0] ?? lifecycleFailure();
      if (
        JSON.stringify(commitParentsAt(cwd, firstChild)) !== JSON.stringify([candidateBase]) ||
        JSON.stringify(changedEntriesAt(cwd, candidateBase, firstChild)) !==
          JSON.stringify(expectedSquashEntries)
      )
        lifecycleFailure();
      verifyDurableSquashMembers(cwd, firstChild);
      verifyLaterHistory(cwd, firstChild, commits.slice(1));
      mode = "SQUASH_MAIN";
      anchor = candidateBase;
    }
  }

  return Object.freeze({
    schema: "fluyo:r4b:addtype:lifecycle-evidence:v1",
    mode,
    head,
    anchor,
    firstChild,
    recordsSnapshot: recordsSnapshotCommit,
    repairPathCount: 2,
    protectedPathCount: 12,
  });
};

const canonicalJsonBlocks = (source: string): string[] => {
  const markerParts = source.split(canonicalRecordHeading);
  if (markerParts.length !== 2) return [];
  const matches = [...markerParts[1]!.matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g)];
  return matches.map((match) => match[1] ?? "");
};

const hasExactKeys = (value: unknown, keys: readonly string[]): boolean => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value)) === JSON.stringify(keys);
};

const isClosedRecord = (value: unknown): boolean => {
  if (!hasExactKeys(value, Object.keys(expectedRecord))) return false;
  return JSON.stringify(value) === JSON.stringify(expectedRecord);
};

const lifecycleHelperOnly = Reflect.get(globalThis, lifecycleHelperSymbol) === true;
if (!lifecycleHelperOnly)
  describe("R4B Add-Type post-main readiness", () => {
    it("preserves the historical build-plan prefix byte for byte", () => {
      const planBytes = readBytes(planPath);
      const prefix = planBytes.subarray(0, 96_127);

      expect(planBytes.byteLength).toBeGreaterThan(96_127);
      expect(prefix.byteLength).toBe(96_127);
      expect(sha256(prefix)).toBe(
        "05ac348eb3160e4514c1ebfba3daeace40bd29286af4687c777282b5df153a0a",
      );
    });

    it("keeps historical records immutable and pins the sole current handoff overlay", () => {
      const handoff = readBytes(handoffPath);
      const decision = readBytes(decisionPath);
      const historicalHandoff = gitBytes(readinessMergeCommit, handoffPath);
      const historicalDecision = gitBytes(readinessMergeCommit, decisionPath);
      const recordsParentHandoff = gitBytes(recordsParentCommit, handoffPath);
      const recordsSnapshotHandoff = gitBytes(recordsSnapshotCommit, handoffPath);

      expect(historicalHandoff.byteLength).toBe(249_789);
      expect(sha256(historicalHandoff)).toBe(
        "78788e3bf3b0a54ef3bccb4b0aec804ad3db406976dfede4963bf1d2c083889f",
      );
      expect(historicalDecision.byteLength).toBe(44_712);
      expect(sha256(historicalDecision)).toBe(
        "60593b594f000cc8abeba4dfed36068bfb104fbbe76215712b740bda1f7c3605",
      );

      for (const commit of [reviewedSourceCommit, designMergeCommit, readinessMergeCommit]) {
        expect(gitBytes(commit, handoffPath)).toEqual(historicalHandoff);
        expect(gitBytes(commit, decisionPath)).toEqual(historicalDecision);
      }

      expect(decision).toEqual(historicalDecision);
      expect(decision).toEqual(gitBytes(recordsParentCommit, decisionPath));
      expect(decision).toEqual(gitBytes(recordsSnapshotCommit, decisionPath));
      expect(recordsParentHandoff.length).toBe(256_652);
      expect(sha256(recordsParentHandoff)).toBe(
        "154984bb347861ea28767551fa587fe835aaf9981385f26c5e4f1a5e549c1302",
      );
      expect(safeHandoffAppend(recordsParentHandoff, recordsSnapshotHandoff)).toBe(true);
      expect({
        bytes: recordsSnapshotHandoff.length,
        sha256: sha256(recordsSnapshotHandoff),
        blob: blob(recordsSnapshotHandoff),
      }).toEqual({
        bytes: 259_496,
        sha256: "28c0ed4cb1292d0351a74848abd88c2a308f7d3d3f63691fbffd884a36bc3f5b",
        blob: "ac27214f98de252a2a4e07b4421971bb9639c12d",
      });
      expect(changedEntriesAt(root, recordsParentCommit, recordsSnapshotCommit)).toEqual([
        { path: handoffPath, status: "M" },
      ]);
      expect(safeHandoffAppend(recordsSnapshotHandoff, handoff)).toBe(true);

      const requiredLines = [
        "externalActionAuthorized=false",
        "downloadAuthorityPresent=false",
        "executionAuthorityPresent=false",
        "PRECONDITION_HOLD_NO_GET",
      ];
      const appended = (lines: string[], leading = true, trailing = true): Buffer =>
        Buffer.concat([
          recordsSnapshotHandoff,
          Buffer.from(`${leading ? "\n" : ""}${lines.join("\n")}${trailing ? "\n" : ""}`),
        ]);
      const appendedText = (value: string): Buffer =>
        Buffer.concat([recordsSnapshotHandoff, Buffer.from(`\n${value}\n`)]);
      const handoffPositives = [
        appendedText(
          "`externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, `PRECONDITION_HOLD_NO_GET`",
        ),
        appended(requiredLines),
        appended([
          "externalActionAuthorized: false",
          "downloadAuthorityPresent: false",
          "executionAuthorityPresent: false",
          "- PRECONDITION_HOLD_NO_GET",
        ]),
        appendedText(
          '{"externalActionAuthorized":false,"downloadAuthorityPresent":false,"executionAuthorityPresent":false,"state":"PRECONDITION_HOLD_NO_GET"}',
        ),
        appended([
          "ExTeRnAl\t\v\f\r AcTiOnAuThOrIzEd\t\v\f\r =\t\v\f\r FaLsE",
          "DoWnLoAd\t\v\f\r AuThOrItYpReSeNt\t\v\f\r :\t\v\f\r FaLsE",
          "ExEcUtIoN\t\v\f\r AuThOrItYpReSeNt\t\v\f\r =\t\v\f\r FaLsE",
          "`PrEcOnDiTiOn_HoLd_No_GeT`",
        ]),
      ];
      for (const candidate of handoffPositives)
        expect(safeHandoffAppend(recordsSnapshotHandoff, candidate)).toBe(true);
      const prefixMutation = Buffer.from(recordsSnapshotHandoff);
      prefixMutation[0] = (prefixMutation[0] ?? 0) ^ 1;
      const handoffNegatives = [
        recordsSnapshotHandoff.subarray(0, -1),
        prefixMutation,
        appended(requiredLines, false, true),
        appended(requiredLines, true, false),
        Buffer.concat([recordsSnapshotHandoff, Buffer.from([0x0a, 0xc3, 0x28, 0x0a])]),
        appended([...requiredLines, "NUL\u0000BYTE"]),
        appended([...requiredLines, "cafe\u0301"]),
        appended(requiredLines.filter((line) => !line.startsWith("externalActionAuthorized"))),
        appended(requiredLines.filter((line) => !line.startsWith("downloadAuthorityPresent"))),
        appended(requiredLines.filter((line) => !line.startsWith("executionAuthorityPresent"))),
        appended(requiredLines.filter((line) => line !== "PRECONDITION_HOLD_NO_GET")),
        appended([...requiredLines, "externalActionAuthorized: true"]),
        appended([...requiredLines, "downloadAuthorityPresent = true"]),
        appended([...requiredLines, '{"executionAuthorityPresent": true}']),
        appended([...requiredLines, "draftMutationAuthorized: true"]),
        appended([
          ...requiredLines,
          "SeLf\u0009\u000a\u000b\u000c\u000d\u0020TeStAuThOrIzEd\u0009\u000a\u000b\u000c\u000d\u0020:\u0009\u000a\u000b\u000c\u000d\u0020TrUe",
        ]),
        appended([...requiredLines, "externalActionAuthorized\n=\ntrue"]),
        appended([
          ...requiredLines,
          "draftMutationAuthorized=true",
          "selfTestAuthorized=true",
          "acquisitionAuthorized=true",
          "verifierExecutionAuthorized=true",
          "helperExecutionAuthorized=true",
          "brokerAuthorized=true",
          "attempt004Authorized=true",
        ]),
        appended([...requiredLines, "r4b2=true", "aggregateR4b=true", "sprint6=true"]),
        appended([...requiredLines, "PRECONDITION_HOLD_NO_GET=false"]),
      ];
      expect(handoffNegatives).toHaveLength(20);
      handoffNegatives.forEach((candidate, index) =>
        expect(
          safeHandoffAppend(recordsSnapshotHandoff, candidate),
          `handoff negative ${index}`,
        ).toBe(false),
      );
      const grammarNegatives = [
        appended([...requiredLines, "externalActionAuthorized=falsehood"]),
        appended([...requiredLines, "externalActionAuthorized_extra=false"]),
        appended([...requiredLines, "prefixexternalActionAuthorized=false"]),
        appended([...requiredLines, "externalActionAuthorized is false"]),
        appended([...requiredLines, "PRECONDITION_HOLD_NO_GETTING"]),
        appended([...requiredLines, "prefixPRECONDITION_HOLD_NO_GET"]),
        appended([...requiredLines, "PRECONDITION_HOLD_NO_GET remains"]),
        appended([...requiredLines, '{"externalActionAuthorized" false}']),
        appended([...requiredLines, "externalActionAuthorized=true"]),
      ];
      for (const candidate of grammarNegatives)
        expect(safeHandoffAppend(recordsSnapshotHandoff, candidate)).toBe(false);

      const ordinary = (
        xy: string,
        path: string,
        sub = "N...",
        mode = "100644",
        hash = "1".repeat(40),
      ) => `1 ${xy} ${sub} ${mode} 100644 100644 ${hash} ${"2".repeat(40)} ${path}\0`;
      const exactStatus = Buffer.from(repairPaths.map((path) => ordinary(".M", path)).join(""));
      expect(isExactPrecommitStatus(parsePorcelainV2(exactStatus))).toBe(true);
      const statusRejected = (candidate: Buffer): boolean => {
        try {
          return !isExactPrecommitStatus(parsePorcelainV2(candidate));
        } catch {
          return true;
        }
      };
      const porcelainNegatives = [
        Buffer.from(ordinary(".M", repairPaths[0])),
        Buffer.from(`${ordinary(".M", repairPaths[0])}${ordinary(".M", repairPaths[0])}`),
        Buffer.from(`${exactStatus.toString("utf8")}${ordinary(".M", "unexpected.ts")}`),
        Buffer.from(`${ordinary(".M", repairPaths[0])}${ordinary(".M", `${repairPaths[1]}.bak`)}`),
        Buffer.from(
          `${ordinary(".M", repairPaths[0])}${ordinary(".M", repairPaths[1].slice(0, -3))}`,
        ),
        Buffer.from(
          `2 R. N... 100644 100644 100644 ${"1".repeat(40)} ${"2".repeat(40)} R100 ${repairPaths[0]}\0old.ts\0`,
        ),
        Buffer.from(
          `2 C. N... 100644 100644 100644 ${"1".repeat(40)} ${"2".repeat(40)} C100 ${repairPaths[0]}\0old.ts\0`,
        ),
        Buffer.from(ordinary(".D", repairPaths[0])),
        Buffer.from(ordinary(".T", repairPaths[0])),
        Buffer.from(
          `u UU N... 100644 100644 100644 100644 ${"1".repeat(40)} ${"2".repeat(40)} ${"3".repeat(40)} ${repairPaths[0]}\0`,
        ),
        Buffer.from(ordinary(".A", repairPaths[0])),
        Buffer.from(`? ${repairPaths[0]}\0`),
        Buffer.from(`${ordinary("M.", repairPaths[0])}${ordinary(".M", repairPaths[1])}`),
        exactStatus.subarray(0, -1),
        Buffer.from(
          `${ordinary(".M", repairPaths[0].replaceAll("/", "\\"))}${ordinary(".M", repairPaths[1])}`,
        ),
        Buffer.from(
          `${ordinary(".M", `${repairPaths[0]}e\u0301`)}${ordinary(".M", repairPaths[1])}`,
        ),
        Buffer.from(`${ordinary(".M", repairPaths[0], "N..X")}${ordinary(".M", repairPaths[1])}`),
      ];
      expect(porcelainNegatives).toHaveLength(17);
      for (const candidate of porcelainNegatives) expect(statusRejected(candidate)).toBe(true);

      const lifecycleFixture = mkdtempSync(resolve(tmpdir(), "fluyo-r4b-readiness-lifecycle-"));
      const lifecycleRepository = resolve(lifecycleFixture, "repo");
      try {
        execFileSync("git", ["clone", "--no-local", root, lifecycleRepository], {
          stdio: "ignore",
          windowsHide: true,
        });
        gitAt(lifecycleRepository, ["checkout", "--detach", recordsSnapshotCommit]);
        for (const path of repairPaths)
          writeFileSync(resolve(lifecycleRepository, path), readBytes(path));
        expect(verifyAddTypeLifecycleAt(lifecycleRepository)).toEqual({
          schema: "fluyo:r4b:addtype:lifecycle-evidence:v1",
          mode: "PRECOMMIT",
          head: recordsSnapshotCommit,
          anchor: recordsSnapshotCommit,
          firstChild: null,
          recordsSnapshot: recordsSnapshotCommit,
          repairPathCount: 2,
          protectedPathCount: 12,
        });
      } finally {
        rmSync(lifecycleFixture, { recursive: true, force: true });
      }

      expect(
        [handoffPath, decisionPath].filter(
          (path) => !readBytes(path).equals(gitBytes(readinessMergeCommit, path)),
        ),
      ).toEqual([handoffPath]);
    }, 30_000);

    it("duplicates one exact canonical readiness object across both records surfaces", () => {
      const datedRecordBlocks = canonicalJsonBlocks(readBytes(recordPath).toString("utf8"));
      const planBlocks = canonicalJsonBlocks(readBytes(planPath).toString("utf8"));

      expect(datedRecordBlocks).toHaveLength(1);
      expect(planBlocks).toHaveLength(1);
      expect(datedRecordBlocks[0]).toBe(planBlocks[0]);
      expect(isClosedRecord(JSON.parse(datedRecordBlocks[0]!))).toBe(true);
    });

    it("keeps the closed key order, scalar types, and exact squash-source relationship", () => {
      const parsed = JSON.parse(
        canonicalJsonBlocks(readBytes(recordPath).toString("utf8"))[0] ?? "null",
      ) as unknown;

      expect(isClosedRecord(parsed)).toBe(true);
      expect(Object.keys(parsed as object)).toEqual(Object.keys(expectedRecord));
      expect(expectedRecord.reviewedPullRequest.relationship).toBe("SQUASH_SOURCE");
      expect(expectedRecord.reviewedPullRequest.reviewedHead).not.toBe(
        expectedRecord.repositoryMainCommit,
      );
      expect(expectedRecord.reviewedPullRequest.mergeCommit).toBe(
        expectedRecord.repositoryMainCommit,
      );
    });

    it("keeps E01 through E08 ordered and required-unattempted", () => {
      expect(expectedRecord.operationalScenarios).toEqual(
        Array.from({ length: 8 }, (_, index) => ({
          id: `E${String(index + 1).padStart(2, "0")}`,
          status: "REQUIRED_UNATTEMPTED",
        })),
      );
    });

    it("keeps all authority and completion values fail-closed", () => {
      expect(expectedRecord.authority).toEqual({
        externalActionAuthorized: false,
        downloadAuthorityPresent: false,
        executionAuthorityPresent: false,
        draftMutationAuthorized: false,
        state: "PRECONDITION_HOLD_NO_GET",
      });
      expect(expectedRecord.completion).toEqual({
        r4b2: false,
        aggregateR4b: false,
        sprint6: false,
      });
    });

    it("rejects extra authority, readiness, completion, and operational fields", () => {
      const mutations: unknown[] = [
        { ...expectedRecord, externalActionAuthorized: true },
        { ...expectedRecord, selfTestAuthorized: true },
        { ...expectedRecord, acquisitionAuthorized: true },
        { ...expectedRecord, verifierExecutionAuthorized: true },
        { ...expectedRecord, helperExecutionAuthorized: true },
        { ...expectedRecord, brokerAuthorized: true },
        { ...expectedRecord, attempt004Authorized: true },
        {
          ...expectedRecord,
          authority: { ...expectedRecord.authority, executionAuthorityPresent: true },
        },
        { ...expectedRecord, completion: { ...expectedRecord.completion, r4b2: true } },
        {
          ...expectedRecord,
          operationalScenarios: expectedRecord.operationalScenarios.map((scenario, index) =>
            index === 0 ? { ...scenario, status: "PASS" } : scenario,
          ),
        },
      ];

      for (const mutation of mutations) expect(isClosedRecord(mutation)).toBe(false);
    });

    it("binds only the observed open draft identities and repository-only claim", () => {
      expect(expectedRecord.observedOpenDraftPullRequests).toEqual([87, 77, 61, 58]);
      expect(expectedRecord.claimBoundary).toBe(
        "REPOSITORY_ONLY_POST_MAIN_VERIFIED_NO_OPERATIONAL_AUTHORITY",
      );
    });
  });
