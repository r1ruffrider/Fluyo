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
import { beforeAll, describe, expect, it } from "vitest";

import "./sprint-6-r4b-addtype-contract-self-test-executor.test.mjs";

type LifecycleEvidence = Readonly<{
  schema: "fluyo:r4b:addtype:lifecycle-evidence:v1";
  mode: "PRECOMMIT" | "BRANCH" | "SQUASH_MAIN";
  head: string;
  anchor: string;
  firstChild: string | null;
  recordsSnapshot: "ee4e77996d646cb880e9a86ea5003c4edce470c5";
  repairPathCount: 2;
  protectedPathCount: 12;
}>;
const lifecycleHelperSymbol = Symbol.for("fluyo:r4b:addtype:lifecycle-helper-only:v1");
const lifecycleHelperQuery = "./sprint-6-r4b-addtype-postmain-readiness.test?lifecycle-helper-v1";
let verifyAddTypeLifecycleAt: (cwd: string) => LifecycleEvidence;
beforeAll(async () => {
  if (Reflect.has(globalThis, lifecycleHelperSymbol))
    throw new Error("ACTIVATION_LIFECYCLE_HELPER_STATE_INVALID");
  Reflect.set(globalThis, lifecycleHelperSymbol, true);
  try {
    const helper = (await import(lifecycleHelperQuery)) as {
      verifyAddTypeLifecycleAt: (cwd: string) => LifecycleEvidence;
    };
    verifyAddTypeLifecycleAt = helper.verifyAddTypeLifecycleAt;
  } finally {
    Reflect.deleteProperty(globalThis, lifecycleHelperSymbol);
  }
  if (typeof verifyAddTypeLifecycleAt !== "function")
    throw new Error("ACTIVATION_LIFECYCLE_HELPER_INVALID");
});

const root = resolve(__dirname, "../../..");
const d660 = "d6607300e52219c5d534e70c17e00e2e717e505b";
const source = "7220bef062a93142f5bcde07de89199355eb5837";
const merge = "7a5b345846eb29928dacb8f01b96796c01182dc2";
const d70 = "d70d8d9f3510b8b4a83f18478dc79dece39094d6";
const activationSourceCommit = "a2485dc12c231dd482799834d5aca2966a6db494";
const reviewedBranchRoot = "c579699c273301599d81c89cec6ba0696e34e313";
const recordsParentCommit = "2ee6312b02ad1393456603fe2a519cf3c20cce8c";
const recordsSnapshotCommit = "ee4e77996d646cb880e9a86ea5003c4edce470c5";
const manifestSha = "15b3ff5f2158b0eb7839591a0aad3373491afff45b2e7dc6a4eda2e3f607ea2b";
const recordsSnapshotManifestSha =
  "6f6641a6e74c7d7242c8912963853fd705b1f83217bd765acf5bafa9994e249c";
const packetPath =
  "scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-activation-v1.json";
const planPath = "docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md";
const recordPath = "docs/2026-11-13_r4b_addtype_contract_self_test_activation_v1.md";
const testPath = "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts";
const executorPath =
  "scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.mjs";
const executorTestPath =
  "packages/shared/src/sprint-6-r4b-addtype-contract-self-test-executor.test.mjs";
const readinessTestPath = "packages/shared/src/sprint-6-r4b-addtype-postmain-readiness.test.ts";
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
const repairPaths = [testPath, readinessTestPath].sort(compareUtf8);
const reviewedLocalCumulativePaths = [
  "docs/2026-11-14_r4b_windows_python_reviewed_local_binding_v2.md",
  "docs/DEVELOPMENT_HANDOFF.md",
  "packages/shared/src/auth-runtime-synthetic-contract.test.ts",
  testPath,
  readinessTestPath,
  "scripts/r4b-evidence/r4b-test-lanes.mjs",
  "scripts/r4b-evidence/reviewed-local-python-native-lease-v2.cs",
  "scripts/r4b-evidence/reviewed-local-python-transaction.mjs",
  "scripts/r4b-evidence/reviewed-local-python-transaction.test.mjs",
  "scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs",
  "scripts/r4b-evidence/test-python-binding.mjs",
  "scripts/r4b-evidence/windows-native-test-journal-runner.test.mjs",
] as const;
const recordsSnapshotMembers = {
  "docs/DEVELOPMENT_HANDOFF.md": {
    bytes: 259_496,
    sha256: "28c0ed4cb1292d0351a74848abd88c2a308f7d3d3f63691fbffd884a36bc3f5b",
    blob: "ac27214f98de252a2a4e07b4421971bb9639c12d",
  },
  "scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs": {
    bytes: 196_187,
    sha256: "0610699e1570dbeb6f5e74fc99930ee2468c03a33571496e351402f5accf413d",
    blob: "394d2cca3f9f36f381bb7c5ef32ffa2ec7a0ca75",
  },
} as const;
const recordsSnapshotPaths = Object.keys(recordsSnapshotMembers).sort(compareUtf8);

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
const gitBytesAt = (cwd: string, commit: string, path: string): Buffer =>
  execFileSync("git", ["show", `${commit}:${path}`], { cwd, windowsHide: true });
const lines = (args: string[]): string[] => {
  const output = git(args);
  return output === "" ? [] : output.split(/\r?\n/u).filter(Boolean);
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
const canonicalGitManifest = (commit: string, paths: string[]) => {
  const value = Buffer.from(
    paths
      .map((path) => {
        const value = gitBytes(commit, path);
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

  it("07 historical d70-to-source candidate is exactly six paths", () => {
    const concurrentRowPattern = /^\.tmp-auth-readiness-approval-[A-Za-z0-9]{6}\/$/u;
    const partitionUntracked = (rows: string[]) => {
      if (new Set(rows).size !== rows.length) throw new Error("duplicate untracked row");
      const concurrent = rows.filter((row) => concurrentRowPattern.test(row));
      if (concurrent.length > 1) throw new Error("multiple concurrent approval roots");
      return {
        candidate: rows.filter((row) => !concurrentRowPattern.test(row)),
        concurrent,
      };
    };
    const historicalCandidate = lines([
      "diff",
      "--name-only",
      `${d70}...${activationSourceCommit}`,
    ]);
    expect(historicalCandidate).toHaveLength(6);
    expect([...new Set(historicalCandidate)].sort(compareUtf8)).toEqual(sixPaths);
    const positive = ".tmp-auth-readiness-approval-abc123/";
    expect(concurrentRowPattern.test(positive)).toBe(true);
    expect(partitionUntracked([positive])).toEqual({ candidate: [], concurrent: [positive] });
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
      expect(concurrentRowPattern.test(negative)).toBe(false);
      expect(partitionUntracked([negative])).toEqual({ candidate: [negative], concurrent: [] });
    }
    expect(() => partitionUntracked([positive, positive])).toThrow("duplicate untracked row");
    expect(() => partitionUntracked([positive, ".tmp-auth-readiness-approval-def456/"])).toThrow(
      "multiple concurrent approval roots",
    );
    expect(
      new Set([
        ...[positive],
        ...[positive],
        ...[positive],
        ...partitionUntracked([positive]).candidate,
      ]),
    ).toEqual(new Set([positive]));
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
      activationSource.indexOf('it("07 historical d70-to-source candidate is exactly six paths"'),
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
  });

  it("08 locks ten runtime paths and excludes packet", () => {
    expect(packet().executionBinding.manifestPaths).toEqual(tenPaths);
    expect(tenPaths).not.toContain(packetPath);
    expect(repairPaths).toEqual([readinessTestPath, testPath].sort(compareUtf8));
  });

  it("09 historical ten-path Git objects remain immutable", () => {
    for (const path of tenPaths) {
      const historical = gitBytes(d70, path);
      expect(gitBytes(source, path)).toEqual(historical);
      expect(gitBytes(merge, path)).toEqual(historical);
    }
    for (const commit of [source, merge, d70]) {
      expect(canonicalGitManifest(commit, tenPaths)).toEqual({
        rows: 10,
        bytes: 1753,
        sha256: manifestSha,
      });
    }
    expect(git(["rev-parse", `${recordsSnapshotCommit}^`])).toBe(recordsParentCommit);
    expect(git(["rev-list", "--parents", "-n", "1", recordsSnapshotCommit]).split(" ")).toEqual([
      recordsSnapshotCommit,
      recordsParentCommit,
    ]);
  }, 20_000);

  it("10 records snapshot overlay and closed precommit status are exact", () => {
    const changed = tenPaths.filter(
      (path) => !gitBytes(recordsSnapshotCommit, path).equals(gitBytes(d70, path)),
    );
    expect(changed).toEqual(recordsSnapshotPaths);

    for (const path of tenPaths) {
      const value = gitBytes(recordsSnapshotCommit, path);
      if (!recordsSnapshotPaths.includes(path)) {
        expect(value).toEqual(gitBytes(d70, path));
        continue;
      }
      const expected = recordsSnapshotMembers[path as keyof typeof recordsSnapshotMembers];
      expect({ bytes: value.length, sha256: sha(value), blob: blob(value) }).toEqual(expected);
    }

    const acceptsOverlay = (
      rows: Array<{ path: string; bytes: number; sha256: string; blob: string }>,
    ) =>
      rows.length === recordsSnapshotPaths.length &&
      new Set(rows.map(({ path }) => path)).size === recordsSnapshotPaths.length &&
      rows.every(({ path, bytes, sha256, blob: objectId }) => {
        const expected = recordsSnapshotMembers[path as keyof typeof recordsSnapshotMembers];
        return (
          expected !== undefined &&
          bytes === expected.bytes &&
          sha256 === expected.sha256 &&
          objectId === expected.blob
        );
      });
    const exactRows = recordsSnapshotPaths.map((path) => ({
      path,
      ...recordsSnapshotMembers[path as keyof typeof recordsSnapshotMembers],
    }));
    expect(acceptsOverlay(exactRows)).toBe(true);
    for (const invalid of [
      exactRows.slice(0, 1),
      [...exactRows, exactRows[0]!],
      [...exactRows, { ...exactRows[0]!, path: `${exactRows[0]!.path}.bak` }],
      exactRows.map((row, index) => (index === 0 ? { ...row, path: row.path.slice(0, -3) } : row)),
      exactRows.map((row, index) => (index === 0 ? { ...row, sha256: "0".repeat(64) } : row)),
    ]) {
      expect(acceptsOverlay(invalid)).toBe(false);
    }
  }, 30_000);

  it("11 recomputes exact historical and snapshot manifests and classifies lifecycle", () => {
    expect(canonicalGitManifest(d70, tenPaths)).toEqual({
      rows: 10,
      bytes: 1753,
      sha256: manifestSha,
    });
    expect(canonicalGitManifest(recordsSnapshotCommit, tenPaths)).toEqual({
      rows: 10,
      bytes: 1753,
      sha256: recordsSnapshotManifestSha,
    });
    expect(canonicalGitManifest(recordsParentCommit, tenPaths).sha256).not.toBe(
      recordsSnapshotManifestSha,
    );
    expect(
      canonicalGitManifest(recordsSnapshotCommit, [...tenPaths, tenPaths[0]!]).sha256,
    ).not.toBe(recordsSnapshotManifestSha);
    expect(canonicalGitManifest(recordsSnapshotCommit, tenPaths.slice(1)).sha256).not.toBe(
      recordsSnapshotManifestSha,
    );
    const lifecycle = verifyAddTypeLifecycleAt(root);
    expect(lifecycle).toMatchObject({
      schema: "fluyo:r4b:addtype:lifecycle-evidence:v1",
      head: git(["rev-parse", "HEAD"]),
      recordsSnapshot: recordsSnapshotCommit,
      repairPathCount: 2,
      protectedPathCount: 12,
    });
    expect(["PRECOMMIT", "BRANCH", "SQUASH_MAIN"]).toContain(lifecycle.mode);
    if (lifecycle.mode === "PRECOMMIT") {
      expect(lifecycle.anchor).toBe(recordsSnapshotCommit);
      expect(lifecycle.firstChild).toBeNull();
    } else if (lifecycle.mode === "BRANCH") {
      expect(lifecycle.anchor).toBe(recordsSnapshotCommit);
      expect(lifecycle.firstChild).toMatch(/^[0-9a-f]{40}$/u);
    } else {
      expect(lifecycle.anchor).toBe(activationSourceCommit);
      expect(lifecycle.firstChild).toMatch(/^[0-9a-f]{40}$/u);
    }
  });

  it("12 adapter retains exact CLI/binding/revalidation and no governance import", () => {
    const text = bytes(tenPaths[6]!).toString("utf8");
    expect(text).toContain('export const CLI_MODE = "--execute-authorized-contract-self-test-v1"');
    expect(text).toContain(
      'export const MANIFEST_BINDING = "HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1"',
    );
    expect(text).toContain("manifest.revalidate();");
    expect(text).not.toContain(packetPath);
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

      const lifecycleRepository = resolve(temporary, "lifecycle");
      execFileSync("git", ["clone", "--no-local", root, lifecycleRepository], {
        windowsHide: true,
        stdio: "ignore",
      });
      gitAt(lifecycleRepository, ["config", "user.name", "R4B Lifecycle Fixture"]);
      gitAt(lifecycleRepository, ["config", "user.email", "r4b-lifecycle@example.invalid"]);
      gitAt(lifecycleRepository, ["config", "core.autocrlf", "false"]);
      const historyNegatives = new Set<string>();
      const rejectHistory = (label: string): void => {
        expect(() => verifyAddTypeLifecycleAt(lifecycleRepository), label).toThrow();
        historyNegatives.add(label);
      };
      const commitAll = (message: string): string => {
        gitAt(lifecycleRepository, ["add", "-A"]);
        gitAt(lifecycleRepository, ["-c", "commit.gpgsign=false", "commit", "-m", message]);
        return gitAt(lifecycleRepository, ["rev-parse", "HEAD"]);
      };
      const startLifecycleBranch = (name: string, start = recordsSnapshotCommit): void => {
        gitAt(lifecycleRepository, ["checkout", "--detach", start]);
        gitAt(lifecycleRepository, ["switch", "-c", name]);
      };
      const writeRepairs = (): void => {
        for (const path of repairPaths)
          writeFileSync(resolve(lifecycleRepository, path), bytes(path));
      };
      gitAt(lifecycleRepository, ["checkout", "--detach", recordsSnapshotCommit]);
      gitAt(lifecycleRepository, ["switch", "-c", "lifecycle-repair"]);
      rejectHistory("stale/no-diff");
      for (const path of repairPaths)
        writeFileSync(resolve(lifecycleRepository, path), bytes(path));
      expect(verifyAddTypeLifecycleAt(lifecycleRepository).mode).toBe("PRECOMMIT");
      gitAt(lifecycleRepository, ["add", "--", repairPaths[0]!]);
      expect(() => verifyAddTypeLifecycleAt(lifecycleRepository)).toThrow();
      gitAt(lifecycleRepository, ["reset", "--", repairPaths[0]!]);
      writeFileSync(resolve(lifecycleRepository, "unexpected.txt"), "unexpected\n");
      expect(() => verifyAddTypeLifecycleAt(lifecycleRepository)).toThrow();
      unlinkSync(resolve(lifecycleRepository, "unexpected.txt"));
      expect(verifyAddTypeLifecycleAt(lifecycleRepository).mode).toBe("PRECOMMIT");
      gitAt(lifecycleRepository, ["add", "--", ...repairPaths]);
      gitAt(lifecycleRepository, [
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        "repair lifecycle tests",
      ]);
      const repairChild = gitAt(lifecycleRepository, ["rev-parse", "HEAD"]);
      expect(verifyAddTypeLifecycleAt(lifecycleRepository).mode).toBe("BRANCH");

      const firstChildCases = [
        {
          label: "one repair",
          write: () =>
            writeFileSync(resolve(lifecycleRepository, repairPaths[0]!), bytes(repairPaths[0]!)),
        },
        {
          label: "missing first-child path",
          write: () =>
            writeFileSync(resolve(lifecycleRepository, repairPaths[1]!), bytes(repairPaths[1]!)),
        },
        {
          label: "extra first-child path",
          write: () => {
            writeRepairs();
            writeFileSync(resolve(lifecycleRepository, "unexpected.txt"), "unexpected\n");
          },
        },
        {
          label: "sibling first-child path",
          write: () => {
            writeFileSync(resolve(lifecycleRepository, repairPaths[0]!), bytes(repairPaths[0]!));
            writeFileSync(
              resolve(lifecycleRepository, `${repairPaths[1]}.bak`),
              bytes(repairPaths[1]!),
            );
          },
        },
        {
          label: "prefix first-child path",
          write: () => {
            writeFileSync(resolve(lifecycleRepository, repairPaths[0]!), bytes(repairPaths[0]!));
            writeFileSync(
              resolve(lifecycleRepository, repairPaths[1]!.slice(0, -3)),
              bytes(repairPaths[1]!),
            );
          },
        },
        {
          label: "wrong first-child status",
          write: () => {
            writeFileSync(resolve(lifecycleRepository, repairPaths[0]!), bytes(repairPaths[0]!));
            rmSync(resolve(lifecycleRepository, repairPaths[1]!));
          },
        },
      ] as const;
      for (const [index, fixture] of firstChildCases.entries()) {
        startLifecycleBranch(`first-child-negative-${index}`);
        fixture.write();
        commitAll(fixture.label);
        rejectHistory(fixture.label);
      }

      startLifecycleBranch("wrong-parent", "e0325f067330a095aa337790d771ed2027204bbb");
      writeRepairs();
      commitAll("wrong parent");
      rejectHistory("wrong parent");

      startLifecycleBranch("merge-child-side");
      writeRepairs();
      commitAll("merge child side");
      startLifecycleBranch("merge-child");
      gitAt(lifecycleRepository, [
        "-c",
        "commit.gpgsign=false",
        "merge",
        "--no-ff",
        "merge-child-side",
        "-m",
        "merge child",
      ]);
      rejectHistory("merge child");

      gitAt(lifecycleRepository, ["checkout", "--detach", recordsSnapshotCommit]);
      gitAt(lifecycleRepository, ["switch", "-c", "second-repair-child"]);
      for (const path of repairPaths)
        writeFileSync(resolve(lifecycleRepository, path), bytes(path));
      gitAt(lifecycleRepository, ["add", "--", ...repairPaths]);
      gitAt(lifecycleRepository, [
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        "second repair child",
      ]);
      gitAt(lifecycleRepository, ["switch", "lifecycle-repair"]);
      expect(verifyAddTypeLifecycleAt(lifecycleRepository).mode).toBe("BRANCH");
      gitAt(lifecycleRepository, ["branch", "-D", "second-repair-child"]);
      expect(verifyAddTypeLifecycleAt(lifecycleRepository).mode).toBe("BRANCH");

      const safeAppend = Buffer.from(
        "\nexternalActionAuthorized=false\ndownloadAuthorityPresent=false\nexecutionAuthorityPresent=false\nPRECONDITION_HOLD_NO_GET\n",
      );
      writeFileSync(
        resolve(lifecycleRepository, "docs/DEVELOPMENT_HANDOFF.md"),
        Buffer.concat([
          gitBytesAt(lifecycleRepository, repairChild, "docs/DEVELOPMENT_HANDOFF.md"),
          safeAppend,
        ]),
      );
      gitAt(lifecycleRepository, ["add", "--", "docs/DEVELOPMENT_HANDOFF.md"]);
      gitAt(lifecycleRepository, [
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        "safe handoff append",
      ]);
      const safeBranchHead = gitAt(lifecycleRepository, ["rev-parse", "HEAD"]);
      expect(verifyAddTypeLifecycleAt(lifecycleRepository).mode).toBe("BRANCH");

      gitAt(lifecycleRepository, ["switch", "-c", "merge-side", safeBranchHead]);
      writeFileSync(resolve(lifecycleRepository, "outside-protected-set.txt"), "fixture\n");
      gitAt(lifecycleRepository, ["add", "--", "outside-protected-set.txt"]);
      gitAt(lifecycleRepository, ["-c", "commit.gpgsign=false", "commit", "-m", "side"]);
      gitAt(lifecycleRepository, ["switch", "-c", "merge-case", safeBranchHead]);
      gitAt(lifecycleRepository, [
        "-c",
        "commit.gpgsign=false",
        "merge",
        "--no-ff",
        "merge-side",
        "-m",
        "merge",
      ]);
      rejectHistory("later merge");
      gitAt(lifecycleRepository, ["switch", "lifecycle-repair"]);
      gitAt(lifecycleRepository, ["branch", "-D", "merge-case", "merge-side"]);

      gitAt(lifecycleRepository, ["switch", "-c", "repair-drift"]);
      writeFileSync(resolve(lifecycleRepository, repairPaths[0]!), Buffer.from("drift\n"));
      commitAll("repair drift");
      rejectHistory("repair drift");
      gitAt(lifecycleRepository, ["switch", "lifecycle-repair"]);
      gitAt(lifecycleRepository, ["branch", "-D", "repair-drift"]);

      gitAt(lifecycleRepository, ["switch", "-c", "drift-revert"]);
      writeFileSync(resolve(lifecycleRepository, repairPaths[0]!), Buffer.from("drift\n"));
      gitAt(lifecycleRepository, ["add", "--", repairPaths[0]!]);
      gitAt(lifecycleRepository, ["-c", "commit.gpgsign=false", "commit", "-m", "drift"]);
      writeFileSync(resolve(lifecycleRepository, repairPaths[0]!), bytes(repairPaths[0]!));
      gitAt(lifecycleRepository, ["add", "--", repairPaths[0]!]);
      gitAt(lifecycleRepository, ["-c", "commit.gpgsign=false", "commit", "-m", "revert"]);
      rejectHistory("drift plus revert");
      gitAt(lifecycleRepository, ["switch", "lifecycle-repair"]);
      gitAt(lifecycleRepository, ["branch", "-D", "drift-revert"]);

      gitAt(lifecycleRepository, ["switch", "-c", "protected-drift"]);
      const protectedDriftPath = "packages/shared/src/auth-runtime-synthetic-contract.test.ts";
      writeFileSync(resolve(lifecycleRepository, protectedDriftPath), Buffer.from("drift\n"));
      commitAll("protected drift");
      rejectHistory("non-handoff protected drift");
      gitAt(lifecycleRepository, ["switch", "lifecycle-repair"]);
      gitAt(lifecycleRepository, ["branch", "-D", "protected-drift"]);

      gitAt(lifecycleRepository, ["switch", "-c", "unsafe-handoff"]);
      writeFileSync(
        resolve(lifecycleRepository, "docs/DEVELOPMENT_HANDOFF.md"),
        Buffer.concat([
          gitBytesAt(lifecycleRepository, safeBranchHead, "docs/DEVELOPMENT_HANDOFF.md"),
          Buffer.from("\nexternalActionAuthorized=true\n"),
        ]),
      );
      gitAt(lifecycleRepository, ["add", "--", "docs/DEVELOPMENT_HANDOFF.md"]);
      gitAt(lifecycleRepository, ["-c", "commit.gpgsign=false", "commit", "-m", "unsafe handoff"]);
      writeFileSync(
        resolve(lifecycleRepository, "docs/DEVELOPMENT_HANDOFF.md"),
        Buffer.concat([
          gitBytesAt(lifecycleRepository, "HEAD", "docs/DEVELOPMENT_HANDOFF.md"),
          safeAppend,
        ]),
      );
      commitAll("safe append after unsafe handoff");
      rejectHistory("unsafe intermediate handoff then safe append");
      gitAt(lifecycleRepository, ["switch", "lifecycle-repair"]);
      gitAt(lifecycleRepository, ["branch", "-D", "unsafe-handoff"]);

      gitAt(lifecycleRepository, ["checkout", "--detach", activationSourceCommit]);
      gitAt(lifecycleRepository, ["switch", "-c", "squash-main"]);
      gitAt(lifecycleRepository, ["merge", "--squash", recordsSnapshotCommit]);
      for (const path of repairPaths)
        writeFileSync(resolve(lifecycleRepository, path), bytes(path));
      gitAt(lifecycleRepository, ["add", "--", ...repairPaths]);
      gitAt(lifecycleRepository, ["-c", "commit.gpgsign=false", "commit", "-m", "squash repair"]);
      expect(verifyAddTypeLifecycleAt(lifecycleRepository).mode).toBe("SQUASH_MAIN");
      const squashCommit = gitAt(lifecycleRepository, ["rev-parse", "HEAD"]);

      const mainOnlyBare = resolve(temporary, "main-only.git");
      const mainOnlyRepository = resolve(temporary, "main-only");
      execFileSync("git", ["init", "--bare", mainOnlyBare], {
        windowsHide: true,
        stdio: "ignore",
      });
      gitAt(lifecycleRepository, ["push", mainOnlyBare, `${squashCommit}:refs/heads/main`]);
      execFileSync(
        "git",
        [
          "clone",
          "--no-local",
          "--no-tags",
          "--single-branch",
          "--branch",
          "main",
          mainOnlyBare,
          mainOnlyRepository,
        ],
        { windowsHide: true, stdio: "ignore" },
      );
      gitAt(mainOnlyRepository, ["config", "user.name", "R4B Main Only Fixture"]);
      gitAt(mainOnlyRepository, ["config", "user.email", "r4b-main-only@example.invalid"]);
      gitAt(mainOnlyRepository, ["config", "core.autocrlf", "false"]);
      gitAt(mainOnlyRepository, ["remote", "remove", "origin"]);
      gitAt(mainOnlyRepository, ["reflog", "expire", "--expire=now", "--all"]);
      gitAt(mainOnlyRepository, ["gc", "--prune=now"]);
      expect(gitAt(mainOnlyRepository, ["for-each-ref", "--format=%(refname)"])).toBe(
        "refs/heads/main",
      );
      const objectExists = (commit: string): boolean => {
        const result = spawnSync(
          "git",
          ["rev-parse", "--verify", "--quiet", `${commit}^{commit}`],
          {
            cwd: mainOnlyRepository,
            windowsHide: true,
            stdio: "ignore",
            timeout: 5_000,
          },
        );
        if (result.signal !== null || result.error !== undefined || result.status === null)
          throw new Error("MAIN_ONLY_OBJECT_PROBE_INVALID");
        if (result.status === 0) return true;
        if (result.status === 1) return false;
        throw new Error("MAIN_ONLY_OBJECT_PROBE_INVALID");
      };
      expect(objectExists(activationSourceCommit)).toBe(true);
      expect(objectExists(squashCommit)).toBe(true);
      for (const absent of [
        reviewedBranchRoot,
        "e0325f067330a095aa337790d771ed2027204bbb",
        recordsParentCommit,
        recordsSnapshotCommit,
      ])
        expect(objectExists(absent)).toBe(false);
      expect(verifyAddTypeLifecycleAt(mainOnlyRepository).mode).toBe("SQUASH_MAIN");
      writeFileSync(
        resolve(mainOnlyRepository, "docs/DEVELOPMENT_HANDOFF.md"),
        Buffer.concat([
          readFileSync(resolve(mainOnlyRepository, "docs/DEVELOPMENT_HANDOFF.md")),
          safeAppend,
        ]),
      );
      gitAt(mainOnlyRepository, ["add", "--", "docs/DEVELOPMENT_HANDOFF.md"]);
      gitAt(mainOnlyRepository, [
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        "safe main-only handoff append",
      ]);
      expect(verifyAddTypeLifecycleAt(mainOnlyRepository).mode).toBe("SQUASH_MAIN");

      const writeMainOnlySquashMembers = (): void => {
        for (const path of reviewedLocalCumulativePaths) {
          const target = resolve(mainOnlyRepository, path);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, bytes(path));
        }
      };
      const rejectMainOnlyFirstChild = (name: string, mutate: () => void): void => {
        gitAt(mainOnlyRepository, ["checkout", "--detach", activationSourceCommit]);
        gitAt(mainOnlyRepository, ["switch", "-c", `negative-${name}`]);
        writeMainOnlySquashMembers();
        mutate();
        gitAt(mainOnlyRepository, ["add", "-A"]);
        gitAt(mainOnlyRepository, [
          "-c",
          "commit.gpgsign=false",
          "commit",
          "-m",
          `negative ${name}`,
        ]);
        expect(() => verifyAddTypeLifecycleAt(mainOnlyRepository)).toThrow();
      };
      rejectMainOnlyFirstChild("missing", () => {
        rmSync(resolve(mainOnlyRepository, reviewedLocalCumulativePaths[6]));
      });
      rejectMainOnlyFirstChild("extra", () => {
        writeFileSync(resolve(mainOnlyRepository, "unexpected-reviewed-path.txt"), "unexpected\n");
      });
      rejectMainOnlyFirstChild("wrong-status", () => {
        rmSync(resolve(mainOnlyRepository, reviewedLocalCumulativePaths[2]));
      });
      rejectMainOnlyFirstChild("wrong-literal", () => {
        writeFileSync(resolve(mainOnlyRepository, reviewedLocalCumulativePaths[2]), "drift\n");
      });
      rejectMainOnlyFirstChild("wrong-repair", () => {
        writeFileSync(resolve(mainOnlyRepository, repairPaths[0]!), "drift\n");
      });

      const commitMainOnlyAll = (message: string): string => {
        gitAt(mainOnlyRepository, ["add", "-A"]);
        gitAt(mainOnlyRepository, ["-c", "commit.gpgsign=false", "commit", "-m", message]);
        return gitAt(mainOnlyRepository, ["rev-parse", "HEAD"]);
      };
      gitAt(mainOnlyRepository, ["switch", "main"]);
      gitAt(mainOnlyRepository, ["switch", "-c", "later-protected-drift"]);
      writeFileSync(resolve(mainOnlyRepository, reviewedLocalCumulativePaths[2]), "drift\n");
      commitMainOnlyAll("later protected drift");
      expect(() => verifyAddTypeLifecycleAt(mainOnlyRepository)).toThrow();

      gitAt(mainOnlyRepository, ["switch", "main"]);
      gitAt(mainOnlyRepository, ["switch", "-c", "later-unsafe-handoff"]);
      writeFileSync(
        resolve(mainOnlyRepository, "docs/DEVELOPMENT_HANDOFF.md"),
        Buffer.concat([
          readFileSync(resolve(mainOnlyRepository, "docs/DEVELOPMENT_HANDOFF.md")),
          Buffer.from("\nexternalActionAuthorized=true\n"),
        ]),
      );
      commitMainOnlyAll("later unsafe handoff");
      expect(() => verifyAddTypeLifecycleAt(mainOnlyRepository)).toThrow();

      gitAt(mainOnlyRepository, ["switch", "main"]);
      gitAt(mainOnlyRepository, ["switch", "-c", "later-merge-side"]);
      writeFileSync(resolve(mainOnlyRepository, "unrelated-side.txt"), "side\n");
      commitMainOnlyAll("later merge side");
      gitAt(mainOnlyRepository, ["switch", "main"]);
      gitAt(mainOnlyRepository, ["switch", "-c", "later-merge"]);
      gitAt(mainOnlyRepository, [
        "-c",
        "commit.gpgsign=false",
        "merge",
        "--no-ff",
        "later-merge-side",
        "-m",
        "later merge",
      ]);
      expect(() => verifyAddTypeLifecycleAt(mainOnlyRepository)).toThrow();

      const unrelatedRepository = resolve(temporary, "unrelated");
      execFileSync("git", ["init", unrelatedRepository], { windowsHide: true, stdio: "ignore" });
      gitAt(unrelatedRepository, ["config", "user.name", "R4B Unrelated Fixture"]);
      gitAt(unrelatedRepository, ["config", "user.email", "r4b-unrelated@example.invalid"]);
      writeFileSync(resolve(unrelatedRepository, "README.md"), "unrelated\n");
      gitAt(unrelatedRepository, ["add", "README.md"]);
      gitAt(unrelatedRepository, ["-c", "commit.gpgsign=false", "commit", "-m", "unrelated"]);
      expect(() => verifyAddTypeLifecycleAt(unrelatedRepository)).toThrow();

      expect(
        spawnSync("git", ["cat-file", "-e", `${recordsSnapshotCommit}^{commit}`], {
          cwd: lifecycleRepository,
          windowsHide: true,
          stdio: "ignore",
        }).status,
      ).toBe(0);
      gitAt(lifecycleRepository, ["switch", "squash-main"]);
      expect(verifyAddTypeLifecycleAt(lifecycleRepository).mode).toBe("SQUASH_MAIN");

      const squashNegative = (label: string, mutate: () => void): void => {
        startLifecycleBranch(`squash-${label.replaceAll(" ", "-")}`, activationSourceCommit);
        gitAt(lifecycleRepository, ["merge", "--squash", recordsSnapshotCommit]);
        writeRepairs();
        mutate();
        commitAll(label);
        rejectHistory(label);
      };
      squashNegative("missing add reviewed path", () => {
        rmSync(
          resolve(
            lifecycleRepository,
            "scripts/r4b-evidence/reviewed-local-python-native-lease-v2.cs",
          ),
        );
        writeFileSync(resolve(lifecycleRepository, "unexpected-reviewed-path.txt"), "unexpected\n");
      });
      squashNegative("squash status drift", () => {
        const path = "scripts/r4b-evidence/reviewed-local-python-native-lease-v2.cs";
        const renamed = `${path}.renamed`;
        writeFileSync(
          resolve(lifecycleRepository, renamed),
          readFileSync(resolve(lifecycleRepository, path)),
        );
        rmSync(resolve(lifecycleRepository, path));
      });
      squashNegative("squash nonrepair byte drift", () => {
        writeFileSync(
          resolve(
            lifecycleRepository,
            "packages/shared/src/auth-runtime-synthetic-contract.test.ts",
          ),
          Buffer.from("drift\n"),
        );
      });
      squashNegative("squash repair mismatch", () => {
        writeFileSync(resolve(lifecycleRepository, repairPaths[0]!), Buffer.from("drift\n"));
      });

      gitAt(lifecycleRepository, ["switch", "squash-main"]);
      const reviewedRootTree = gitAt(lifecycleRepository, [
        "rev-parse",
        `${reviewedBranchRoot}^{tree}`,
      ]);
      const replacement = gitAt(lifecycleRepository, [
        "commit-tree",
        reviewedRootTree,
        "-p",
        recordsSnapshotCommit,
        "-m",
        "invalid reviewed chain parent",
      ]);
      gitAt(lifecycleRepository, ["replace", reviewedBranchRoot, replacement]);
      expect(verifyAddTypeLifecycleAt(lifecycleRepository).mode).toBe("SQUASH_MAIN");
      gitAt(lifecycleRepository, ["replace", "-d", reviewedBranchRoot]);

      expect([...historyNegatives].sort(compareUtf8)).toEqual(
        [
          "drift plus revert",
          "extra first-child path",
          "later merge",
          "merge child",
          "missing add reviewed path",
          "missing first-child path",
          "non-handoff protected drift",
          "one repair",
          "prefix first-child path",
          "repair drift",
          "sibling first-child path",
          "squash nonrepair byte drift",
          "squash repair mismatch",
          "squash status drift",
          "stale/no-diff",
          "unsafe intermediate handoff then safe append",
          "wrong first-child status",
          "wrong parent",
        ].sort(compareUtf8),
      );

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
});
