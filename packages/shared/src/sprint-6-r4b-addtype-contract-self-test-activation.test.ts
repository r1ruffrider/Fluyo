import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import "./sprint-6-r4b-addtype-contract-self-test-executor.test.mjs";

const root = resolve(__dirname, "../../..");
const d660 = "d6607300e52219c5d534e70c17e00e2e717e505b";
const source = "7220bef062a93142f5bcde07de89199355eb5837";
const merge = "7a5b345846eb29928dacb8f01b96796c01182dc2";
const d70 = "d70d8d9f3510b8b4a83f18478dc79dece39094d6";
const manifestSha = "15b3ff5f2158b0eb7839591a0aad3373491afff45b2e7dc6a4eda2e3f607ea2b";
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
const validatorRejectsAll = (candidates: unknown[]): boolean => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import { readFileSync } from "node:fs"; import { outerActivationTesting as s } from ${JSON.stringify(executorUrl)}; const values=JSON.parse(readFileSync(0,"utf8")); for (let index=0; index<values.length; index+=1) { const bytes=Buffer.from(JSON.stringify(values[index],null,2)+"\\n"); try { s.validatePacket(bytes,{reviewBinding:s.constants.SIX_BINDING,activationManifestSha256:"0".repeat(64)}); process.stdout.write(String(index)); process.exit(1); } catch {} } process.exit(0);`,
    ],
    { cwd: root, windowsHide: true, input: JSON.stringify(candidates), encoding: "utf8" },
  );
  if (result.status !== 0)
    throw new Error(
      `validator accepted mutation ${result.stdout || "unknown"}: ${result.error?.message ?? result.stderr}`,
    );
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

  it("07 candidate union is exactly six paths", () => {
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
    const committed = lines(["diff", "--name-only", `${d70}...HEAD`]);
    const cached = lines(["diff", "--cached", "--name-only"]);
    const unstaged = lines(["diff", "--name-only"]);
    const untracked = lines(["ls-files", "--others", "--exclude-standard"]);
    const partitioned = partitionUntracked(untracked);
    const union = [...committed, ...cached, ...unstaged, ...partitioned.candidate];
    expect([...new Set(union)].sort(compareUtf8)).toEqual(sixPaths);
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
    expect(partitioned.concurrent.length).toBeLessThanOrEqual(1);
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
    expect(activationSource).not.toMatch(/\blstat(?:Sync)?\b/u);
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
  });

  it("09 current ten-path bytes equal d70 objects", () => {
    for (const path of tenPaths) expect(bytes(path)).toEqual(gitBytes(d70, path));
  }, 20_000);

  it("10 ten-path bytes equal reviewed source and design merge", () => {
    for (const path of tenPaths) {
      expect(bytes(path)).toEqual(gitBytes(source, path));
      expect(bytes(path)).toEqual(gitBytes(merge, path));
    }
  }, 30_000);

  it("11 recomputes exact ten-path manifest", () => {
    expect(canonicalManifest(tenPaths)).toEqual({ rows: 10, bytes: 1753, sha256: manifestSha });
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
});
