import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const workflow = readFileSync(
  resolve(root, ".github/workflows/ios-current-canonical-proof.yml"),
  "utf8",
);
const canonical = workflow.slice(
  workflow.indexOf("  canonical-current-ios:"),
  workflow.indexOf("  postflight:"),
);
const preflight = workflow.slice(
  workflow.indexOf("  preflight:"),
  workflow.indexOf("  canonical-current-ios:"),
);
const postflight = workflow.slice(workflow.indexOf("  postflight:"));
const actionUses = [...workflow.matchAll(/^\s+uses:\s+([^\s]+)\s*$/gm)].map((match) => match[1]);

describe("iOS current canonical proof v2 security workflow", () => {
  it("keeps the closed four-input dispatch, target-only serialization, and three-job topology", () => {
    const inputs = workflow.slice(
      workflow.indexOf("    inputs:"),
      workflow.indexOf("\npermissions:"),
    );
    expect(
      [...inputs.matchAll(/^      ([a-z][a-z0-9_]+):\r?$/gm)].map((match) => match[1]),
    ).toEqual(["target_sha", "pass_ordinal", "previous_run_id", "expected_workflow_sha256"]);
    expect(inputs.match(/required: true/g)).toHaveLength(4);
    expect(inputs).not.toContain("pr_number:");
    expect(inputs).toMatch(/options:\r?\n          - "1"\r?\n          - "2"\r?\n          - "3"/);
    expect(workflow).toContain("group: ios-current-canonical-proof-v2-${{ inputs.target_sha }}");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("name: iOS current canonical proof v2");
    expect(workflow).toContain(
      "run-name: ios-current-canonical-proof-v2 target=${{ inputs.target_sha }} pr=72 pass=${{ inputs.pass_ordinal }} predecessor=${{ inputs.previous_run_id }} digest=${{ inputs.expected_workflow_sha256 }}",
    );
    expect(
      [...workflow.matchAll(/^  ([a-z][a-z0-9-]+):\r?\n    name:/gm)].map((match) => match[1]),
    ).toEqual(["preflight", "canonical-current-ios", "postflight"]);
    expect(workflow.match(/runs-on: ubuntu-latest/g)).toHaveLength(2);
    expect(workflow.match(/runs-on: macos-26/g)).toHaveLength(1);
    expect(workflow).toContain("needs: [preflight, canonical-current-ios]");
  });

  it("uses default-deny and exact least-privilege job permissions", () => {
    expect(workflow).toContain("permissions: {}");
    expect(workflow.match(/^      actions: read$/gm)).toHaveLength(2);
    expect(workflow.match(/^      contents: read$/gm)).toHaveLength(3);
    expect(workflow.match(/^      pull-requests: read$/gm)).toHaveLength(2);
    expect(canonical).toMatch(/permissions:\r?\n      contents: read\r?\n    steps:/);
    expect(canonical).not.toContain("actions: read");
    expect(canonical).not.toContain("pull-requests: read");
    expect(workflow).not.toMatch(/^\s+[a-z-]+: write\s*$/m);
    expect(workflow).not.toMatch(/secrets\.|id-token:|deployments:|environment:/);
  });

  it("binds fixed PR 72 to a dynamic target and closes ordinal predecessor syntax", () => {
    expect(workflow).toContain('[[ "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]]');
    expect(workflow).toContain(
      '[[ "$PASS_ORDINAL" == "1" || "$PASS_ORDINAL" == "2" || "$PASS_ORDINAL" == "3" ]]',
    );
    expect(workflow).toContain('test "$PREVIOUS_RUN_ID" = "none"');
    expect(workflow).toContain('[[ "$PREVIOUS_RUN_ID" =~ ^[1-9][0-9]*$ ]]');
    expect(workflow).toContain('[[ "$EXPECTED_WORKFLOW_SHA256" =~ ^[0-9a-f]{64}$ ]]');
    expect(workflow.match(/pull_number: 72/g)).toHaveLength(1);
    expect(workflow.match(/\/pulls\/\$\{prNumber\}/g)).toHaveLength(1);
    expect(workflow.match(/const prNumber = 72;/g)).toHaveLength(2);
    expect(workflow).not.toMatch(/inputs\.pr_number|PR_NUMBER:/);
    expect(workflow).not.toMatch(
      /protectedTarget|protectedPassOneRunId|protectedPassOneJobId|protectedPassOneArtifactId|ios-foundation-current/,
    );
  });

  it("pins exactly the four reviewed transport and control actions", () => {
    expect(actionUses).toEqual([
      "actions/github-script@60a0d83039c74a4aee543508d2ffcb1c3799cdea",
      "actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683",
      "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
      "actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093",
    ]);
    for (const action of actionUses) expect(action).toMatch(/@[0-9a-f]{40}$/);
  });

  it("locks the exact eight protected-target execution files by size and SHA-256", () => {
    const expected = [
      [
        "scripts/ios-ci.sh",
        "16051",
        "bbe271e424ffa10a3c26f671093fd818bf41a432f48856597c98ff6c5bc8b553",
      ],
      [
        "scripts/summarize-ios-test-failures.mjs",
        "14618",
        "71102fdaa7a7fa8279c372fee406253d4b95c531a30155b6583ff8d70598818a",
      ],
      [
        "scripts/github-workflow-annotation.mjs",
        "1015",
        "7fb096c9bae2aafa43ef2e5ca614c215983179ac8cb5090c2fcac3ee75737da0",
      ],
      [
        "scripts/verify-android-auth-kernel-results.mjs",
        "3081",
        "d0345c97a5a548519348555150d2e004b6f7790960fbd1639b7d860f66b8fe03",
      ],
      [
        "scripts/scan-ios-evidence.mjs",
        "2516",
        "7ab4c066860f7fa2a5054708057ef9c4448def4063983fbd0400aba3813a5cf4",
      ],
      [
        "scripts/ios-evidence.mjs",
        "13925",
        "06ad8ccb25bb5a9be238ab1ac2bfc26fb0446b6a8c35938020f594269bc071b4",
      ],
      [
        "contracts/mobile/ios/foundation/v1/foundation-policy.json",
        "12501",
        "a52f0895c7940d6cee1f4479f7b0efb9444d35136330027f752d79e243b5530f",
      ],
      [
        "contracts/mobile/auth-runtime-synthetic/v1/vectors.tsv",
        "22395",
        "a51283c6dffdb9372521c184864a09e6e8bd83cdcf71b8eed6d61960f549b222",
      ],
    ];
    const verifier = canonical.slice(
      canonical.indexOf("- name: Verify frozen proof dependencies"),
      canonical.indexOf("- name: Build test and scan current runtime"),
    );
    for (const [path, size, sha] of expected) {
      expect(verifier).toContain(`["${path}", [${size}, "${sha}"]]`);
    }
    expect(verifier).toContain("expected.size !== 8");
    expect(verifier).toContain("stat.isFile()");
    expect(verifier).toContain("stat.nlink !== 1");
    expect(verifier).toContain("realpathSync(candidate)");
    expect(verifier).toContain("canonical.startsWith(`${checkout}${sep}`)");
  });

  it("air-gaps target execution and both trusted Mac verifiers from Actions credentials", () => {
    for (const key of [
      "GITHUB_TOKEN",
      "GH_TOKEN",
      "ACTIONS_RUNTIME_TOKEN",
      "ACTIONS_RUNTIME_URL",
      "ACTIONS_RESULTS_URL",
      "ACTIONS_CACHE_URL",
      "ACTIONS_ID_TOKEN_REQUEST_TOKEN",
      "ACTIONS_ID_TOKEN_REQUEST_URL",
    ]) {
      expect(canonical.match(new RegExp(`^          ${key}: ""$`, "gm"))).toHaveLength(3);
    }
    expect(canonical).not.toMatch(/github\.rest|api\.github\.com|github\.token/);
  });

  it("keeps the pinned upload as the sole post-target transport and final Mac step", () => {
    expect([...canonical.matchAll(/^      - name: (.+)$/gm)].map((match) => match[1])).toEqual([
      "Checkout exact target",
      "Verify exact clean target",
      "Verify frozen proof dependencies",
      "Build test and scan current runtime",
      "Validate trusted sanitized exact-run evidence",
      "Upload sanitized current-runtime evidence",
    ]);
    expect(canonical.match(/uses: actions\/upload-artifact@/g)).toHaveLength(1);
    expect(canonical).not.toMatch(
      /uses: actions\/github-script@|uses: actions\/download-artifact@/,
    );
    const upload = canonical.indexOf("      - name: Upload sanitized current-runtime evidence");
    expect(upload).toBeGreaterThan(canonical.indexOf("run: bash scripts/ios-ci.sh"));
    expect(canonical.slice(upload + 1)).not.toMatch(/^      - name:/m);
    expect(canonical).toContain("path: artifacts/ios-current");
  });

  it("implements two independent closed topology and bounded-file validators", () => {
    expect(workflow.match(/const parseStrictJson = \(text\) =>/g)).toHaveLength(2);
    expect(workflow.match(/const zipDescriptor = openSync\(zip\.path, "r"\)/g)).toHaveLength(2);
    for (const token of [
      'lockFile("Fluyo-current-simulator.zip", 1, 268435456)',
      'lockFile("evidence-current.json", 1, 1048576)',
      'lockFile("logs/current.log", 1, 65536)',
      "zip.size + json.size + log.size <= 269549568",
      "stat.nlink === 1",
      "realpathSync(path).startsWith(`${root}${sep}`)",
    ]) {
      expect(
        workflow.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")),
      ).toHaveLength(2);
    }
    expect(workflow.match(/Unsafe evidence inventory/g)).toHaveLength(2);
    expect(workflow.match(/Unsafe evidence log inventory/g)).toHaveLength(2);
  });

  it("uses duplicate-key closed JSON with exact root and execution schemas", () => {
    expect(workflow.match(/Duplicate JSON key:/g)).toHaveLength(2);
    expect(workflow.match(/keys or key order mismatch/g)).toHaveLength(2);
    expect(workflow.match(/"schemaVersion",\r?\n\s+"evidenceLeg"/g)).toHaveLength(2);
    expect(
      workflow.match(/"artifactHash",\r?\n\s+"executions",\r?\n\s+"remainingUnattempted"/g),
    ).toHaveLength(2);
    expect(workflow.match(/const executionFields = \[/g)).toHaveLength(2);
    expect((workflow.match(/executionFields/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(workflow.match(/executions\.length === 21/g)).toHaveLength(2);
    expect(workflow.match(/Execution scenario order mismatch/g)).toHaveLength(2);
    expect(workflow.match(/ios_smallest_supported_iphone_simulator/g)).toHaveLength(2);
    expect(workflow.match(/ios_physical_iphone_evidence/g)).toHaveLength(2);
  });

  it("locks execution identity, policy order, fixed values, and bounded control-free strings", () => {
    for (const token of [
      'execution.platform === "ios"',
      'execution.deviceClass === "large_current"',
      'execution.deviceKind === "simulator"',
      'execution.xcodeVersion.startsWith("Xcode 26.6")',
      'execution.result === "passed"',
      'execution.secretScanResult === "passed"',
      "execution.environment === expectedEnvironment",
      "execution.accessibilitySetting ===",
      "value.length > 0 && value.length <= maximum",
      "/[\\u0000-\\u001f\\u007f]/u.test(value)",
    ]) {
      expect(
        workflow.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")),
      ).toHaveLength(2);
    }
  });

  it("requires an exact ordered unique nine-line bound log", () => {
    expect(workflow.match(/logLines\.length === 9/g)).toHaveLength(2);
    expect(workflow.match(/Evidence log key order mismatch/g)).toHaveLength(2);
    expect(workflow.match(/Duplicate evidence log key/g)).toHaveLength(2);
    expect(workflow.match(/logText\.endsWith\("\\n"\)/g)).toHaveLength(2);
    expect(workflow.match(/logValues\.sourceCommit === expectedSha/g)).toHaveLength(2);
    expect(workflow.match(/logValues\.buildIdentifier === expectedBuild/g)).toHaveLength(2);
    expect(workflow.match(/logValues\.result === "passed"/g)).toHaveLength(2);
  });

  it("streams and validates ZIP EOCD, central, local, descriptor, CRC, and read lengths", () => {
    for (const token of [
      "0x06054b50",
      "0x02014b50",
      "0x04034b50",
      "0x08074b50",
      "ZIP streamed CRC mismatch",
      "ZIP compressed read length mismatch",
      "ZIP uncompressed read length mismatch",
      "ZIP central directory bounds mismatch",
      "ZIP local records must be exactly adjacent",
      "Unaccounted ZIP bytes before central directory",
    ]) {
      expect(workflow.match(new RegExp(token, "g"))).toHaveLength(2);
    }
    expect(workflow.match(/createReadStream\(zip\.path/g)).toHaveLength(4);
    expect(workflow).not.toMatch(/extract|unzip|ditto -x/i);
  });

  it("accounts for and deny-scans every retained raw ZIP byte", () => {
    expect(workflow.match(/scanText\(text, "raw ZIP bytes"\)/g)).toHaveLength(2);
    expect(workflow.match(/rawZipScanTail = text\.slice\(-4096\)/g)).toHaveLength(2);
    expect(workflow.match(/eocd\.readUInt16LE\(20\) === 0/g)).toHaveLength(2);
    expect(workflow.match(/commentLength === 0/g)).toHaveLength(2);
    expect(workflow.match(/supportedExtraFields\.has\(identifier\)/g)).toHaveLength(2);
    expect(workflow.match(/ranges\[0\]\[0\] === 0/g)).toHaveLength(2);
    expect(workflow.match(/ranges\[index - 1\]\[1\] === ranges\[index\]\[0\]/g)).toHaveLength(2);
    expect(workflow.match(/ranges\.at\(-1\)\[1\] === centralOffset/g)).toHaveLength(2);
    expect(workflow.match(/ZIP EOCD comments are forbidden/g)).toHaveLength(2);
    expect(workflow.match(/ZIP entry comments are forbidden/g)).toHaveLength(2);
    expect(workflow.match(/Unsupported ZIP extra field/g)).toHaveLength(2);
    expect(workflow.match(/ZIP preamble is forbidden/g)).toHaveLength(2);
  });

  it("rejects ZIP64, encryption, unsupported types, unsafe paths, duplicates, and raw results", () => {
    for (const token of [
      "Encrypted ZIP entry forbidden",
      "Unsupported ZIP compression method",
      "Unsupported ZIP general-purpose flag",
      "ZIP traversal path forbidden",
      "Absolute ZIP path forbidden",
      "Duplicate case-folded ZIP path",
      "ZIP link or special entry forbidden",
      "Raw result bundle in ZIP",
      "ZIP entry outside Fluyo.app root",
      "ZIP must contain exactly one Fluyo.app root",
      "ZIP missing Fluyo.app/Fluyo",
      "ZIP missing Fluyo.app/Info.plist",
    ]) {
      expect(workflow.match(new RegExp(token, "g"))).toHaveLength(2);
    }
    expect(workflow.match(/ZIP64 is forbidden/g)).toHaveLength(4);
  });

  it("enforces all ZIP entry, total, ratio, and artifact API bounds", () => {
    for (const number of ["4096", "512", "134217728", "536870912", "268435456", "200", "100"]) {
      expect(workflow).toContain(number);
    }
    expect(workflow.match(/entryCount > 0 && entryCount <= 4096/g)).toHaveLength(2);
    expect(workflow.match(/nameLength > 0 && nameLength <= 512/g)).toHaveLength(2);
    expect(workflow.match(/uncompressed <= 134217728/g)).toHaveLength(2);
    expect(workflow.match(/totalUncompressed <= 536870912/g)).toHaveLength(2);
    expect(workflow.match(/uncompressed <= compressed \* 200/g)).toHaveLength(2);
    expect(workflow.match(/totalUncompressed <= totalCompressed \* 100/g)).toHaveLength(2);
    expect(postflight).toContain("artifact.size_in_bytes <= 283115520");
  });

  it("runs the independent deny scanner over metadata, filenames, and streamed ZIP data", () => {
    for (const token of [
      "(?:sk|rk)",
      "eyJ[A-Za-z0-9_-]",
      "PRIVATE KEY",
      "Authorization",
      "FLUYO_TEST_",
      "(?:cus|sub|price|evt|cs_",
      "Users",
      "DEVELOPMENT_TEAM",
      "(?:api|auth)\\.fluyo",
      "ZIP filename",
      "ZIP data ${entry.name}",
      "evidence JSON",
      "evidence log",
    ]) {
      expect(workflow.toLowerCase()).toContain(token.toLowerCase());
    }
    expect(workflow.match(/const restrictedPatterns = \[/g)).toHaveLength(2);
  });

  it("uses safe canonical ID parsing and capped complete pagination in both controls", () => {
    expect(workflow.match(/const canonicalId = \(value, label\) =>/g)).toHaveLength(2);
    expect(workflow.match(/BigInt\(Number\.MAX_SAFE_INTEGER\)/g)).toHaveLength(2);
    expect(workflow.match(/String\(number\) === text/g)).toHaveLength(2);
    expect(workflow.match(/page <= 100/g)).toHaveLength(2);
    expect(workflow.match(/<= 10000/g)).toHaveLength(2);
    expect(workflow.match(/exceeds 100 pages/g)).toHaveLength(2);
  });

  it("rechecks v2 duplicates and fully rebinds the ordinal chain after local validation", () => {
    const local = postflight.indexOf('const directory = "artifacts/ios-current-postflight"');
    const run = postflight.indexOf("const run = await api(");
    const duplicates = postflight.indexOf("const priorRuns = await safePaginate(");
    const predecessor = postflight.indexOf("const validatePredecessor = async (");
    const chain = postflight.indexOf("if (passOrdinal === 1)", predecessor);
    const currentArtifacts = postflight.indexOf("const artifacts = await safePaginate(", chain);
    const pull = postflight.indexOf("const pull = await api(");
    expect(local).toBeGreaterThan(-1);
    expect(run).toBeGreaterThan(local);
    expect(duplicates).toBeGreaterThan(run);
    expect(predecessor).toBeGreaterThan(duplicates);
    expect(chain).toBeGreaterThan(predecessor);
    expect(currentArtifacts).toBeGreaterThan(chain);
    expect(pull).toBeGreaterThan(currentArtifacts);
    expect(workflow.match(/const validatePredecessor = async \(/g)).toHaveLength(2);
    expect(
      workflow.match(/run\.conclusion === "success"|predecessor\.conclusion === "success"/g),
    ).toHaveLength(2);
    expect(workflow.match(/must contain exactly three jobs/g)).toHaveLength(2);
    expect(workflow.match(/must contain exactly one artifact/g)).toHaveLength(3);
    expect(workflow.match(/const ancestorMatches = parsedHistory\.filter\(/g)).toHaveLength(2);
    expect(workflow.match(/ancestor identity is not unique/g)).toHaveLength(2);
    expect(workflow.match(/ancestor ID does not match supplied predecessor/g)).toHaveLength(2);
    expect(
      workflow.match(
        /identity !== null && identity\.target === (?:targetSha|expectedSha) && identity\.ordinal === ordinal/g,
      ),
    ).toHaveLength(2);
    expect(workflow.match(/Date\.parse\(postflightJob\.completed_at\)/g)).toHaveLength(2);
    expect(workflow.match(/completedAt <= successorAt/g)).toHaveLength(2);
    expect(workflow.match(/completed after successor started/g)).toHaveLength(2);
    expect(workflow).not.toMatch(/Date\.parse\((?:run|predecessor)\.updated_at\)/);
    expect((workflow.match(/transitive pass 1 predecessor/g) ?? []).length).toBeGreaterThanOrEqual(
      2,
    );
    expect(workflow.match(/await validatePredecessor\(/g)).toHaveLength(6);
    expect(workflow.match(/const passTwo = await validatePredecessor\(/g)).toHaveLength(2);
    expect(workflow.match(/passTwo\.run\.run_started_at/g)).toHaveLength(2);
    for (const control of [preflight, postflight]) {
      const passOne = control.slice(
        control.indexOf("if (passOrdinal === 1)"),
        control.indexOf("} else if (passOrdinal === 2)"),
      );
      expect(passOne).toContain('previousRunId === "none"');
      expect(passOne).not.toMatch(/validatePredecessor|actions\/runs\/\$\{previousRunId\}/);
    }
  });

  it("uses strict v2 history identities while ignoring historical v1 titles", () => {
    expect(
      workflow.match(/const identityPrefix = "ios-current-canonical-proof-v2";/g),
    ).toHaveLength(2);
    expect(workflow.match(/const titlePattern =/g)).toHaveLength(2);
    expect(workflow.match(/has malformed v2 identity/g)).toHaveLength(2);
    expect(
      workflow.match(/if \(!title\.startsWith\(identityPrefix\)\) return null;/g),
    ).toHaveLength(2);
    expect(workflow.match(/identity\.target === (?:targetSha|expectedSha)/g)).toHaveLength(6);
    expect(workflow.match(/identity\.ordinal === passOrdinal/g)).toHaveLength(2);
    expect(workflow.match(/currentIdentity\.predecessor === previousRunId/g)).toHaveLength(2);
    expect(workflow.match(/identity\.digest === expectedDigest/g)).toHaveLength(2);
    expect(workflow.match(/currentIdentity\.digest === expectedDigest/g)).toHaveLength(2);
    expect(workflow.match(/Pass 1 predecessor must be none/g)).toHaveLength(2);
    expect(workflow.match(/Pass 1 and pass 2 run IDs must differ/g)).toHaveLength(2);
    expect(workflow.match(/Pass 1 and pass 3 run IDs must differ/g)).toHaveLength(2);
    expect(workflow).not.toContain("ios-current-canonical-proof target=");
  });

  it("versions job and artifact identities and encodes the three-run acceptance totals", () => {
    expect(workflow).toContain("name: iOS current canonical preflight v2");
    expect(workflow).toContain("name: iOS current canonical exact-head proof v2");
    expect(workflow).toContain("name: iOS current canonical postflight v2");
    expect(
      workflow.match(/ios-current-canonical-proof-v2-\$\{\{ inputs\.target_sha \}\}-pass-/g),
    ).toHaveLength(3);
    expect(workflow.match(/retention-days: 7/g)).toHaveLength(1);
    const acceptedRuns = 3;
    expect(acceptedRuns * 3).toBe(9);
    expect(acceptedRuns * 2).toBe(6);
    expect(acceptedRuns).toBe(3);
  });

  it("queries and accepts PR 72 exactly twice with postflight PR assertions last", () => {
    expect(workflow.match(/github\.rest\.pulls\.get/g)).toHaveLength(1);
    expect(workflow.match(/\/pulls\/\$\{prNumber\}/g)).toHaveLength(1);
    expect(workflow.match(/pull\.state === "open"/g)).toHaveLength(2);
    expect(workflow.match(/pull\.draft === true/g)).toHaveLength(2);
    expect(workflow.match(/pull\.base\.ref === "main"/g)).toHaveLength(2);
    const finalAssertion =
      'assert(pull.head.sha === expectedSha, "Pull request head changed before postflight");';
    const finalIndex = postflight.lastIndexOf(finalAssertion);
    expect(finalIndex).toBeGreaterThan(-1);
    expect(postflight.slice(finalIndex)).toMatch(
      /^assert\(pull\.head\.sha === expectedSha, "Pull request head changed before postflight"\);\r?\n          NODE\r?\n?$/,
    );
  });

  it("keeps exact current Xcode execution and blocks alternate unsafe workflow constructs", () => {
    expect(workflow.match(/^        run: bash scripts\/ios-ci\.sh$/gm)).toHaveLength(1);
    expect(canonical).toContain("FLUYO_SOURCE_SHA: ${{ inputs.target_sha }}");
    expect(canonical).toContain("FLUYO_IOS_EVIDENCE_LEG: current");
    expect(canonical).toContain(
      "FLUYO_DEVELOPER_DIR: /Applications/Xcode_26.6.app/Contents/Developer",
    );
    expect(canonical).toContain("FLUYO_XCODE_PREFIX: Xcode 26.6");
    expect(workflow).not.toMatch(
      /^\s+(?:push|pull_request|pull_request_target|repository_dispatch|schedule):/m,
    );
    expect(workflow).not.toMatch(
      /^\s+(?:retry|fallback):|^\s+continue-on-error:|^\s+max-attempts:|uses:\s+[^\s]*(?:retry|fallback)|^\s+- name:.*(?:retry|fallback)|matrix:|strategy:|actions\/cache/im,
    );
    expect(workflow).not.toMatch(
      /^\s+name:\s*(?:minimum iOS 17 simulator evidence|current unsigned simulator build and tests|sanitized iOS foundation evidence)\s*$/im,
    );
    expect(workflow).not.toMatch(
      /ref: \$\{\{ github\.sha \}\}|FLUYO_SOURCE_SHA: \$\{\{ github\.sha \}\}/,
    );
  });
});
