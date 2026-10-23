import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;
type FileDigest = { path: string; sha256: string };

const root = resolve(__dirname, "../../..");
const ledgerDirectory = resolve(root, "contracts/mobile/auth-readiness/v1/approval-history");
const recordsDirectory = resolve(ledgerDirectory, "records");
const indexBytes = readFileSync(resolve(ledgerDirectory, "index.json"));
const policyBytes = readFileSync(resolve(ledgerDirectory, "policy.json"));
const schemaBytes = readFileSync(resolve(ledgerDirectory, "schema.json"));
const index = JSON.parse(indexBytes.toString("utf8")) as JsonObject;
const ledgerPolicy = JSON.parse(policyBytes.toString("utf8")) as JsonObject;
const schema = JSON.parse(schemaBytes.toString("utf8")) as JsonObject;
const decisionPolicyBytes = readFileSync(
  resolve(root, "contracts/mobile/auth-readiness/v1/decision-policy.json"),
);
const evidenceIndexBytes = readFileSync(
  resolve(root, "contracts/mobile/auth-readiness/v1/evidence/index.json"),
);
const authAcceptance = JSON.parse(
  readFileSync(resolve(root, "contracts/mobile/auth-state/v1/acceptance.json"), "utf8"),
) as JsonObject;
const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const asObject = (value: unknown, label = "value"): JsonObject => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonObject;
};
const asObjects = (value: unknown, label = "value"): JsonObject[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((entry, index) => asObject(entry, `${label}[${index}]`));
};
const asStrings = (value: unknown, label = "value"): string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be strings`);
  }
  return value;
};
const exactKeys = (value: JsonObject, expected: string[]): boolean =>
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
const canonicalText = (value: JsonObject): string => JSON.stringify(value, null, 2) + "\n";
const git = (...args: string[]): string =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const digestPattern = /^[0-9a-f]{64}$/;
const timestampPattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;
const recordKeys = [
  "schemaVersion",
  "ledgerId",
  "sequence",
  "previousRecordDigest",
  "recordedAtUtc",
  "eventType",
  "actor",
  "authority",
  "subject",
  "payload",
  "provenance",
];
const eventTypes = [
  "GOVERNANCE_SELECTION",
  "DELEGATION_GRANT",
  "DELEGATION_REVOCATION",
  "MIGRATION_SNAPSHOT",
  "REVIEW_ATTESTATION",
  "DECISION_APPROVAL",
  "DECISION_SUPERSESSION",
  "PHASE_APPROVAL",
  "TOOLING_CHANGE_AUTHORIZATION",
];
const decisionIds = [
  "AUTH-SDK-IOS",
  "AUTH-SDK-ANDROID",
  "AUTH-METHODS",
  "AUTH-SIGNOUT-SCOPE",
  "AUTH-CALLBACK-DOMAINS",
  "AUTH-AASA",
  "AUTH-ASSETLINKS",
  "AUTH-SUPABASE-ALLOWLIST",
  "AUTH-STORAGE-IOS",
  "AUTH-STORAGE-ANDROID",
  "AUTH-NONPROD-CUSTODY",
  "AUTH-RECOVERY-DELIVERY",
  "AUTH-REVOCATION",
  "AUTH-ACCOUNT-DELETION",
];

const subjectBytes = (files: FileDigest[]): Buffer =>
  Buffer.concat(
    [...files]
      .sort((a, b) => Buffer.from(a.path).compare(Buffer.from(b.path)))
      .flatMap(({ path, sha256: digest }) => [
        Buffer.from(path, "utf8"),
        Buffer.from([0]),
        Buffer.from(digest, "ascii"),
        Buffer.from([10]),
      ]),
  );
const subjectDigest = (files: FileDigest[]): string => sha256(subjectBytes(files));
const filesFrom = (subject: JsonObject): FileDigest[] =>
  asObjects(subject.files, "subject.files").map((file) => ({
    path: String(file.path),
    sha256: String(file.sha256),
  }));

const records = asObjects(index.records, "index.records").map((entry) => {
  const path = String(entry.path);
  const bytes = readFileSync(resolve(root, path));
  return { entry, path, bytes, value: JSON.parse(bytes.toString("utf8")) as JsonObject };
});

const canonicalValue = (value: unknown): boolean => {
  if (typeof value === "string") return value.normalize("NFC") === value;
  if (typeof value === "number") return Number.isSafeInteger(value);
  if (value === null || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every(canonicalValue);
  if (typeof value === "object") {
    return Object.entries(value as JsonObject).every(
      ([key, nested]) => key.normalize("NFC") === key && canonicalValue(nested),
    );
  }
  return false;
};

const isSafePath = (path: string): boolean =>
  path.length > 0 &&
  !path.startsWith("/") &&
  !/^[A-Za-z]:/.test(path) &&
  !path.includes("\\") &&
  !path.split("/").includes("..") &&
  lstatSync(resolve(root, path)).isFile() &&
  !lstatSync(resolve(root, path)).isSymbolicLink();

const payloadKeys: Record<string, string[]> = {
  GOVERNANCE_SELECTION: [
    "selection",
    "effectiveFor",
    "retiredMechanism",
    "bootstrapCommit",
    "decisionPolicySha256",
    "evidenceIndexSha256",
  ],
  DELEGATION_GRANT: [
    "delegate",
    "scope",
    "requiredPhaseGates",
    "sameSubjectBundleRequired",
    "deniedActions",
    "materialDecisionIds",
    "usableOnlyAfterLedgerMerge",
  ],
  TOOLING_CHANGE_AUTHORIZATION: [
    "decision",
    "classification",
    "runtimeOrProductAuthorization",
    "nativeEvidenceSatisfaction",
    "externalActionAuthorization",
    "baseFiles",
    "targetFiles",
    "baseBundleSha256",
    "targetBundleSha256",
    "atomicSemantics",
  ],
  MIGRATION_SNAPSHOT: [
    "governanceSelectionRecordDigest",
    "delegationGrantRecordDigest",
    "toolingAuthorizationRecordDigest",
    "materialDecisionIds",
    "decisionCounts",
    "evidenceRequirements",
    "runtimeEvidence",
    "nativeMatrix",
    "materialDecisionApprover",
    "responsibleAfterApproval",
  ],
};

const toolingPayload = asObject(records[2]?.value.payload, "tooling payload");
const baseFiles = asObjects(toolingPayload.baseFiles).map((entry) => ({
  path: String(entry.path),
  sha256: String(entry.sha256),
}));
const targetFiles = asObjects(toolingPayload.targetFiles).map((entry) => ({
  path: String(entry.path),
  sha256: String(entry.sha256),
}));
const classifyToolingBundle = (
  files: FileDigest[],
  authorization: JsonObject | undefined,
): "base" | "target" | "rejected" => {
  if (
    !authorization ||
    authorization.eventType !== "TOOLING_CHANGE_AUTHORIZATION" ||
    authorization.actor !== "Marlon"
  )
    return "rejected";
  const payload = asObject(authorization.payload);
  if (
    payload.decision !== "DEPENDENCY_LOCK_REMEDIATION_OPTION_A" ||
    payload.classification !== "credential_free_dev_tool_only" ||
    payload.runtimeOrProductAuthorization !== false ||
    payload.nativeEvidenceSatisfaction !== false ||
    payload.externalActionAuthorization !== false
  )
    return "rejected";
  const digest = subjectDigest(files);
  if (digest === payload.baseBundleSha256 && JSON.stringify(files) === JSON.stringify(baseFiles))
    return "base";
  if (
    digest === payload.targetBundleSha256 &&
    JSON.stringify(files) === JSON.stringify(targetFiles)
  )
    return "target";
  return "rejected";
};

describe("native-auth append-only approval history", () => {
  it("binds the fixed policy, schema, index, inventory, and content-addressed filenames", () => {
    expect(index).toMatchObject({
      schemaVersion: "1.0.0",
      ledgerId: "fluyo-native-auth-approval-history-v1",
    });
    expect(exactKeys(index, ["schemaVersion", "ledgerId", "policySha256", "records"])).toBe(true);
    expect(index.policySha256).toBe(sha256(policyBytes));
    expect(asObject(schema).additionalProperties).toBe(false);
    expect(asObject(ledgerPolicy.bootstrap).genesisRecordCount).toBe(4);
    expect(records).toHaveLength(4);
    expect(readdirSync(recordsDirectory).sort()).toEqual(
      records.map(({ entry }) => `${String(entry.digest)}.json`).sort(),
    );
    records.forEach(({ entry, path, bytes, value }, indexValue) => {
      expect(exactKeys(entry, ["sequence", "digest", "path"])).toBe(true);
      expect(entry.sequence).toBe(indexValue + 1);
      expect(entry.digest).toBe(sha256(bytes));
      expect(path.endsWith(`/${String(entry.digest)}.json`)).toBe(true);
      expect(bytes.toString("utf8")).toBe(canonicalText(value));
      expect(bytes[0]).not.toBe(0xef);
      expect(bytes.includes(Buffer.from("\r\n"))).toBe(false);
    });
  });

  it("enforces canonical values, chronology, chain continuity, closed keys, and earlier-only references", () => {
    let previousTime = 0;
    const earlier = new Set<string>();
    records.forEach(({ entry, value }, offset) => {
      expect(exactKeys(value, recordKeys)).toBe(true);
      expect(canonicalValue(value)).toBe(true);
      expect(value.schemaVersion).toBe("1.0.0");
      expect(value.ledgerId).toBe(index.ledgerId);
      expect(value.sequence).toBe(offset + 1);
      expect(value.previousRecordDigest).toBe(
        offset === 0 ? null : records[offset - 1]?.entry.digest,
      );
      expect(eventTypes).toContain(value.eventType);
      expect(timestampPattern.test(String(value.recordedAtUtc))).toBe(true);
      const time = Date.parse(String(value.recordedAtUtc));
      expect(new Date(time).toISOString()).toBe(value.recordedAtUtc);
      expect(time).toBeGreaterThanOrEqual(previousTime);
      previousTime = time;
      const authority = asObject(value.authority);
      expect(exactKeys(authority, ["kind", "grantedBy", "referenceRecordDigests"])).toBe(true);
      for (const reference of asStrings(authority.referenceRecordDigests))
        expect(earlier.has(reference)).toBe(true);
      const expectedPayloadKeys = payloadKeys[String(value.eventType)];
      expect(expectedPayloadKeys).toBeDefined();
      expect(exactKeys(asObject(value.payload), expectedPayloadKeys ?? [])).toBe(true);
      earlier.add(String(entry.digest));
    });
  });

  it("binds sorted unique regular-file subjects with actual 0x00 and 0x0a bytes", () => {
    for (const { value } of records) {
      const subject = asObject(value.subject);
      expect(exactKeys(subject, ["files", "bundleSha256"])).toBe(true);
      const files = filesFrom(subject);
      expect(files.map(({ path }) => path)).toEqual(
        [...files.map(({ path }) => path)].sort((a, b) => Buffer.from(a).compare(Buffer.from(b))),
      );
      expect(new Set(files.map(({ path }) => path)).size).toBe(files.length);
      for (const file of files) {
        expect(isSafePath(file.path)).toBe(true);
        expect(digestPattern.test(file.sha256)).toBe(true);
        expect(sha256(readFileSync(resolve(root, file.path)))).toBe(file.sha256);
      }
      expect(subject.bundleSha256).toBe(subjectDigest(files));
    }
    expect(subjectBytes(baseFiles)).toHaveLength(264);
    expect(subjectDigest(baseFiles)).toBe(
      "7c19687d547d1bf56c9989d22a77b3534faf054460f0ae18c9283312e1f26119",
    );
    expect(subjectDigest(targetFiles)).toBe(
      "a39114aac53673c51d57eb6341e4a17da9575d64a5dc17b1d092bc250a5c2ab5",
    );
    const escaped = Buffer.from(
      baseFiles.map(({ path, sha256: digest }) => `${path}\\0${digest}\\n`).join(""),
    );
    expect(sha256(escaped)).toBe(
      "3c723ff4b1638b85454fe8a4673d5f5d7c1beb8c020f2df9eab56fb1ff0db81b",
    );
    expect(sha256(escaped)).not.toBe(toolingPayload.baseBundleSha256);
    for (const invalid of [
      baseFiles.map((file) => ({ ...file, sha256: file.sha256.toUpperCase() })),
    ])
      expect(subjectDigest(invalid)).not.toBe(toolingPayload.baseBundleSha256);
    expect(sha256(Buffer.concat([subjectBytes(baseFiles), Buffer.from([10])]))).not.toBe(
      toolingPayload.baseBundleSha256,
    );
    expect(
      sha256(
        Buffer.from(subjectBytes(baseFiles).toString("latin1").replaceAll("\n", "\r\n"), "latin1"),
      ),
    ).not.toBe(toolingPayload.baseBundleSha256);
  });

  it("folds the selected governance model, active bounded delegation, tooling authority, and migration snapshot", () => {
    const governance = asObject(records[0]?.value.payload);
    const delegation = asObject(records[1]?.value.payload);
    const tooling = asObject(records[2]?.value.payload);
    const snapshot = asObject(records[3]?.value.payload);
    expect(governance.selection).toBe("APPEND_ONLY_CONTENT_ADDRESSED_SQUASH_COMPATIBLE");
    expect(governance.retiredMechanism).toBe("P_TO_A_TO_V_GIT_ANCESTRY_FOR_FUTURE_APPROVALS");
    expect(delegation.scope).toBe(
      "credential_free_repository_only_nonproduction_phase_after_required_gates",
    );
    expect(delegation.requiredPhaseGates).toEqual(
      asObject(ledgerPolicy.delegation).requiredPhaseGates,
    );
    expect(delegation.deniedActions).toEqual(asObject(ledgerPolicy.delegation).deniedActions);
    expect(delegation.materialDecisionIds).toEqual(decisionIds);
    expect(tooling.decision).toBe("DEPENDENCY_LOCK_REMEDIATION_OPTION_A");
    expect(tooling.classification).toBe("credential_free_dev_tool_only");
    expect(snapshot.materialDecisionIds).toEqual(decisionIds);
    expect(snapshot.decisionCounts).toEqual({ proposed: 5, blocked: 9, accepted: 0 });
    expect(snapshot.evidenceRequirements).toEqual({ total: 69, unsatisfied: 69 });
    expect(snapshot.runtimeEvidence).toEqual({
      conducted: 0,
      passed: 0,
      failed: 0,
      unattempted: 24,
    });
    expect(snapshot.nativeMatrix).toEqual({ total: 24, unattempted: 24 });
    expect(snapshot.materialDecisionApprover).toBe("Marlon");
    expect(snapshot.responsibleAfterApproval).toBe("Adriana");
  });

  it("keeps the historical packet byte-identical and all material decisions open", () => {
    expect(sha256(decisionPolicyBytes)).toBe(
      "3e2aa6dabb4e9fe28b1b80e10f705f3df3968f85ed0e4e18ca8a0eb97ff9d696",
    );
    expect(sha256(evidenceIndexBytes)).toBe(
      "162c0a25f5a4779b8e60abda00c9a9bf452a85cd7ea0a6b30cfe69d911ce96de",
    );
    const packet = JSON.parse(decisionPolicyBytes.toString("utf8")) as JsonObject;
    const decisions = asObjects(packet.decisions);
    expect(decisions.map(({ id }) => id)).toEqual(decisionIds);
    expect(decisions.filter(({ status }) => status === "PROPOSED")).toHaveLength(5);
    expect(decisions.filter(({ status }) => status === "BLOCKED")).toHaveLength(9);
    expect(decisions.filter(({ status }) => status === "ACCEPTED")).toHaveLength(0);
    expect(asObject(packet.scope).runtimeEvidence).toEqual({
      conducted: 0,
      passed: 0,
      failed: 0,
      unattempted: 24,
    });
    const rows = asObjects(asObject(authAcceptance.mirroredNativeRuntimeMatrix).rows);
    expect(rows).toHaveLength(24);
    expect(rows.every(({ status }) => status === "unattempted")).toBe(true);
  });

  it("authorizes only the atomic all-base or all-target Vitest bundle", () => {
    expect(classifyToolingBundle(baseFiles, records[2]?.value)).toBe("base");
    expect(classifyToolingBundle(targetFiles, records[2]?.value)).toBe("target");
    const mutations: FileDigest[][] = [
      [targetFiles[0]!, baseFiles[1]!, baseFiles[2]!],
      [baseFiles[0]!, targetFiles[1]!, targetFiles[2]!],
      targetFiles.map((file, index) => (index === 0 ? { ...file, sha256: "0".repeat(64) } : file)),
      [...targetFiles, { path: "apps/web/package.json", sha256: "0".repeat(64) }],
      targetFiles.map((file) =>
        file.path === "packages/shared/package.json" ? { ...file, sha256: sha256("4.1.13") } : file,
      ),
      targetFiles.map((file) =>
        file.path === "package-lock.json"
          ? { ...file, sha256: sha256("Vite Rolldown OXC PostCSS integrity") }
          : file,
      ),
    ];
    for (const mutation of mutations)
      expect(classifyToolingBundle(mutation, records[2]?.value)).toBe("rejected");
    const wrongActor = structuredClone(records[2]!.value);
    wrongActor.actor = "Adriana";
    expect(classifyToolingBundle(targetFiles, wrongActor)).toBe("rejected");
    const productClaim = structuredClone(records[2]!.value);
    asObject(productClaim.payload).runtimeOrProductAuthorization = true;
    expect(classifyToolingBundle(targetFiles, productClaim)).toBe("rejected");
    const absent = undefined;
    expect(classifyToolingBundle(targetFiles, absent)).toBe("rejected");
  });

  it("default-denies authority expansion, missing or reordered gates, and legacy or ambiguous option claims", () => {
    const denied = asStrings(asObject(records[1]!.value.payload).deniedActions);
    for (const boundary of [
      "production",
      "credential",
      "signing",
      "store",
      "release",
      "spend",
      "destructive",
      "external_account",
      "dashboard",
      "domain",
      "physical_device",
      "publication",
    ]) {
      expect(denied.some((entry) => entry.includes(boundary))).toBe(true);
    }
    const gates = asStrings(asObject(records[1]!.value.payload).requiredPhaseGates);
    expect(gates.at(-1)).toBe("Elana exact-head PASS last");
    expect(new Set(gates).size).toBe(6);
    expect(gates.slice(0, -1)).not.toContain("Elana exact-head PASS last");
    const documentation = [
      resolve(root, "contracts/mobile/auth-readiness/v1/README.md"),
      resolve(root, "docs/DEVELOPMENT_HANDOFF.md"),
      resolve(root, "docs/TEST_ACCOUNT_GOVERNANCE.md"),
      resolve(root, "docs/SPRINT_5_DECISION_REGISTER.md"),
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(documentation).toContain("DEPENDENCY_LOCK_REMEDIATION_OPTION_A");
    expect(documentation).not.toMatch(/approval-governance (?:alternative )?A or B/i);
    expect(documentation).not.toMatch(/Acceptance remains blocked until Marlon chooses one/i);
  });

  it("checks exact CI base/head endpoints, full history, ancestry, and append-only bootstrap rules", () => {
    expect(ci).toContain(
      "FLUYO_APPROVAL_HISTORY_BASE: ${{ github.event.pull_request.base.sha || github.event.before }}",
    );
    expect(ci).toContain(
      "FLUYO_APPROVAL_HISTORY_HEAD: ${{ github.event.pull_request.head.sha || github.sha }}",
    );
    expect(ci).toContain(
      "ref: ${{ github.event.pull_request.head.sha || github.sha }}\n          fetch-depth: 0",
    );
    expect(ci).toContain('git cat-file -e "${FLUYO_APPROVAL_HISTORY_BASE}^{commit}"');
    expect(ci).toContain('git cat-file -e "${FLUYO_APPROVAL_HISTORY_HEAD}^{commit}"');
    expect(ci).toContain(
      'git merge-base --is-ancestor "${FLUYO_APPROVAL_HISTORY_BASE}" "${FLUYO_APPROVAL_HISTORY_HEAD}"',
    );
    const base =
      process.env.FLUYO_APPROVAL_HISTORY_BASE ?? "8ce28a7e57150ebf30499a447faee686ca50f3ce";
    expect(git("cat-file", "-t", base)).toBe("commit");
    expect(git("merge-base", "--is-ancestor", base, "HEAD")).toBe("");
    let baseHasLedger = true;
    try {
      git(
        "cat-file",
        "-e",
        `${base}:contracts/mobile/auth-readiness/v1/approval-history/index.json`,
      );
    } catch {
      baseHasLedger = false;
    }
    if (!baseHasLedger) {
      expect(base).toBe("8ce28a7e57150ebf30499a447faee686ca50f3ce");
      expect(records).toHaveLength(4);
    } else {
      const baseIndex = JSON.parse(
        git("show", `${base}:contracts/mobile/auth-readiness/v1/approval-history/index.json`),
      ) as JsonObject;
      const oldRecords = asObjects(baseIndex.records);
      expect(records.slice(0, oldRecords.length).map(({ entry }) => entry)).toEqual(oldRecords);
      for (const old of oldRecords) {
        const path = String(old.path);
        expect(readFileSync(resolve(root, path), "utf8")).toBe(
          git("show", `${base}:${path}`) + "\n",
        );
      }
    }
  });

  it("contains no secret, credential, private-account, or PII-bearing fields and rejects unknown authority", () => {
    const forbiddenKeys =
      /(?:secret|password|token|credential|privatekey|email|phone|address|udid|accountid)/i;
    const forbiddenValues =
      /(?:-----BEGIN [A-Z ]+PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{10,}|sk_(?:live|test)_|ghp_|AKIA[0-9A-Z]{16})/;
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (value !== null && typeof value === "object") {
        for (const [key, nested] of Object.entries(value as JsonObject)) {
          expect(key).not.toMatch(forbiddenKeys);
          walk(nested);
        }
        return;
      }
      if (typeof value === "string") expect(value).not.toMatch(forbiddenValues);
    };
    records.forEach(({ value }) => walk(value));
    const expanded = structuredClone(records[1]!.value);
    asObject(expanded.authority).productionAuthority = true;
    expect(
      exactKeys(asObject(expanded.authority), ["kind", "grantedBy", "referenceRecordDigests"]),
    ).toBe(false);
    const expandedPayload = structuredClone(records[1]!.value);
    asObject(expandedPayload.payload).signingAuthority = true;
    expect(exactKeys(asObject(expandedPayload.payload), payloadKeys.DELEGATION_GRANT ?? [])).toBe(
      false,
    );
    expect(JSON.stringify(schema)).toContain('"additionalProperties":false');
  });
});
