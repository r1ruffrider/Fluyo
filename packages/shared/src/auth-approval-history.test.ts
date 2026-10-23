import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
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
const compareUtf8 = (left: string, right: string): number =>
  Buffer.from(left).compare(Buffer.from(right));
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonObject)
        .sort(([left], [right]) => compareUtf8(left, right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
};
const canonicalText = (value: JsonObject): string =>
  JSON.stringify(canonicalize(value), null, 2) + "\n";
const git = (...args: string[]): string =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const gitBytes = (...args: string[]): Buffer => execFileSync("git", args, { cwd: root }) as Buffer;
const gitExists = (...args: string[]): boolean => {
  try {
    execFileSync("git", args, { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
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

const expectedSchemaSha256 = "d456f233d914802b29967889191414fbc591427ff568051381bba8dc06b14c03";
const expectedPolicySha256 = "26d20521f83f075794ae20ee062b51e4607c0fd67b3f9b86f32ba3e813400dbb";
const genesisDigests = [
  "484955bab2c34feb77c1e2d277a7a75dd259b27404f2f75cc75aa93f6c37acf6",
  "290b5310d65e92a4d7784a68a5ca748de98b8d39dae8de1469d20f048c6a5fb9",
  "6802aa47e8a2aad4da7ae4c8391b40098e008862c62acc2edb77a488c478faed",
  "ed9ad08433fd2f7ad225f97e4bb691ad161c1023ab9974745f934d137cf8f033",
];
const fixedReviewers: Record<string, string> = {
  ARCHITECTURE: "Catalina",
  SECURITY: "Natalia",
  ENVIRONMENT_AND_CI: "Renata",
  PROTECTED_CI: "GitHub Actions",
  INDEPENDENT_EXACT_HEAD_QA: "Elana",
};
const deniedFlagKeys = [
  "credentialsOrSecrets",
  "destructiveOrData",
  "domains",
  "externalAccountsOrDashboards",
  "materialNativeAuthDecisions",
  "physicalDevices",
  "production",
  "publication",
  "signing",
  "spend",
  "storeOrRelease",
];
type TestRecord = {
  entry: { sequence: number; digest: string; path: string };
  bytes: Buffer;
  value: JsonObject;
};
type FoldRecord = { digest: string; value: JsonObject };
const cloneRecords = (): TestRecord[] =>
  records.map(({ entry, bytes, value }) => ({
    entry: {
      sequence: Number(entry.sequence),
      digest: String(entry.digest),
      path: String(entry.path),
    },
    bytes: Buffer.from(bytes),
    value: structuredClone(value),
  }));
const genesisSubject = structuredClone(records[0]!.value.subject);
const recordTemplate = (
  eventType: string,
  actor: string,
  kind: string,
  payload: JsonObject,
  references = [genesisDigests[1]!],
): JsonObject => ({
  actor,
  authority: { grantedBy: "Marlon", kind, referenceRecordDigests: references },
  eventType,
  ledgerId: "fluyo-native-auth-approval-history-v1",
  payload,
  previousRecordDigest: null,
  provenance: {
    integrityScope: "canonical_record_bytes_and_declared_subject_bytes",
    nonRepudiationLimitation:
      "repository_records_prove_integrity_and_declared_authority_after_recording_not_cryptographic_human_nonrepudiation",
    recordedBy: "Adriana",
    recordingMethod: "repository_governance_record",
    sourceCommit: "8ce28a7e57150ebf30499a447faee686ca50f3ce",
  },
  recordedAtUtc: "2026-10-24T00:00:00.000Z",
  schemaVersion: "1.0.0",
  sequence: 0,
  subject: genesisSubject,
});
const reviewTemplate = (
  gate: string,
  reviewer: string,
  phaseId = "native-auth-foundation",
  domain: string | null = null,
  outcome = "PASS",
): JsonObject =>
  recordTemplate(
    "REVIEW_ATTESTATION",
    reviewer,
    gate === "PROTECTED_CI" ? "protected_ci_attestation" : "delegated_specialist_review_authority",
    {
      domain,
      gate,
      outcome,
      phaseId,
      reviewedHead: "a886b75af125b5a69e2ee3f42471ceb2700eeec1",
      reviewer,
      subjectBundleSha256: asObject(genesisSubject).bundleSha256,
      supersedesReviewRecordDigest: null,
    },
  );
const appendTestRecord = (
  current: TestRecord[],
  template: JsonObject,
): { records: TestRecord[]; appended: TestRecord } => {
  const value = structuredClone(template);
  value.sequence = current.length + 1;
  value.previousRecordDigest = current.at(-1)?.entry.digest ?? null;
  const bytes = Buffer.from(canonicalText(value));
  const digest = sha256(bytes);
  const appended = {
    entry: {
      sequence: current.length + 1,
      digest,
      path: ledgerRelative + "/records/" + digest + ".json",
    },
    bytes,
    value,
  };
  return { records: [...current, appended], appended };
};
const validateEventPair = (value: JsonObject): void => {
  if (!eventTypes.includes(String(value.eventType))) throw new Error("event");
  const payload = asObject(value.payload);
  if (!exactKeys(payload, payloadKeys[String(value.eventType)] ?? [])) throw new Error("payload");
  const actor = String(value.actor);
  const authority = asObject(value.authority);
  if (!exactKeys(authority, ["grantedBy", "kind", "referenceRecordDigests"]))
    throw new Error("authority");
  const direct = new Set([
    "GOVERNANCE_SELECTION",
    "DELEGATION_GRANT",
    "DELEGATION_REVOCATION",
    "DECISION_APPROVAL",
    "DECISION_SUPERSESSION",
    "TOOLING_CHANGE_AUTHORIZATION",
  ]);
  if (
    direct.has(String(value.eventType)) &&
    (actor !== "Marlon" || authority.kind !== "direct_material_owner_authority")
  )
    throw new Error("direct authority");
  if (
    value.eventType === "MIGRATION_SNAPSHOT" &&
    (actor !== "Adriana" || authority.kind !== "administrative_migration_recording")
  )
    throw new Error("migration authority");
  if (value.eventType === "REVIEW_ATTESTATION") {
    if (actor !== payload.reviewer) throw new Error("review actor");
    const expectedKind =
      payload.gate === "PROTECTED_CI"
        ? "protected_ci_attestation"
        : "delegated_specialist_review_authority";
    if (authority.kind !== expectedKind) throw new Error("review authority");
    if (payload.gate === "DOMAIN_SPECIALIST") {
      if (typeof payload.domain !== "string" || !payload.domain) throw new Error("domain");
    } else if (payload.domain !== null || fixedReviewers[String(payload.gate)] !== payload.reviewer)
      throw new Error("reviewer");
  }
  if (
    value.eventType === "PHASE_APPROVAL" &&
    (actor !== "Adriana" || authority.kind !== "delegated_credential_free_repository_authority")
  )
    throw new Error("phase authority");
  if (
    ["DECISION_APPROVAL", "DECISION_SUPERSESSION"].includes(String(value.eventType)) &&
    (actor !== "Marlon" || !decisionIds.includes(String(payload.decisionId)))
  )
    throw new Error("material decision authority");
};
const validateTestChain = (candidate: TestRecord[]): void => {
  if (candidate.length < 4) throw new Error("truncated");
  if (
    JSON.stringify(candidate.slice(0, 4).map(({ entry }) => entry.digest)) !==
    JSON.stringify(genesisDigests)
  )
    throw new Error("genesis prefix");
  let previous: string | null = null;
  const earlier = new Set<string>();
  candidate.forEach(({ entry, bytes, value }, offset) => {
    if (entry.sequence !== offset + 1 || value.sequence !== offset + 1) throw new Error("sequence");
    if (value.previousRecordDigest !== previous) throw new Error("chain");
    if (entry.digest !== sha256(bytes)) throw new Error("digest");
    if (entry.path !== ledgerRelative + "/records/" + entry.digest + ".json")
      throw new Error("path");
    if (bytes.toString("utf8") !== canonicalText(value) || !canonicalValue(value))
      throw new Error("canonical");
    validateEventPair(value);
    for (const reference of asStrings(asObject(value.authority).referenceRecordDigests))
      if (!earlier.has(reference)) throw new Error("reference");
    const sourceCommit = String(asObject(value.provenance).sourceCommit);
    for (const file of filesFrom(asObject(value.subject)))
      if (
        !isNormalizedPath(file.path) ||
        !isTrackedNonSymlinkBlob(sourceCommit, file.path, file.sha256)
      )
        throw new Error("subject");
    earlier.add(entry.digest);
    previous = entry.digest;
  });
};
const foldAuthority = (candidate: FoldRecord[]): void => {
  const active = new Set<string>();
  const revoked = new Set<string>();
  const reviews = new Map<string, JsonObject>();
  const stale = new Set<string>();
  const decisions = new Map<string, string>();
  for (const { digest, value } of candidate) {
    validateEventPair(value);
    const payload = asObject(value.payload);
    if (value.eventType === "DELEGATION_GRANT") active.add(digest);
    if (value.eventType === "DELEGATION_REVOCATION") {
      const grant = String(payload.delegationRecordDigest);
      if (!active.has(grant)) throw new Error("revocation");
      revoked.add(grant);
    }
    if (value.eventType === "REVIEW_ATTESTATION") {
      const supersedes = payload.supersedesReviewRecordDigest;
      if (typeof supersedes === "string") {
        if (!reviews.has(supersedes)) throw new Error("review supersession");
        stale.add(supersedes);
      }
      reviews.set(digest, value);
    }
    if (value.eventType === "DECISION_APPROVAL") {
      if (value.actor !== "Marlon" || decisions.has(String(payload.decisionId)))
        throw new Error("decision");
      decisions.set(String(payload.decisionId), digest);
    }
    if (value.eventType === "DECISION_SUPERSESSION") {
      if (
        value.actor !== "Marlon" ||
        decisions.get(String(payload.decisionId)) !== payload.supersedesRecordDigest
      )
        throw new Error("supersession");
      decisions.set(String(payload.decisionId), digest);
    }
    if (value.eventType !== "PHASE_APPROVAL") continue;
    const grant = String(payload.delegationGrantRecordDigest);
    if (!active.has(grant) || revoked.has(grant)) throw new Error("delegation");
    const gateDigests = asStrings(payload.gateRecordDigests);
    const gates = gateDigests.map((gateDigest) => {
      if (!reviews.has(gateDigest) || stale.has(gateDigest)) throw new Error("gate");
      return { digest: gateDigest, value: reviews.get(gateDigest)! };
    });
    for (const gate of gates) {
      const gatePayload = asObject(gate.value.payload);
      if (
        gatePayload.outcome !== "PASS" ||
        gatePayload.phaseId !== payload.phaseId ||
        gatePayload.reviewedHead !== payload.reviewedHead ||
        gatePayload.subjectBundleSha256 !== payload.subjectBundleSha256
      )
        throw new Error("gate mismatch");
    }
    for (const required of Object.keys(fixedReviewers))
      if (gates.filter(({ value: gate }) => asObject(gate.payload).gate === required).length !== 1)
        throw new Error("fixed gate");
    const domains = asObjects(payload.requiredDomainGates);
    if (!domains.length) throw new Error("domain inventory");
    for (const item of domains)
      if (
        !gates.some(({ value: gate }) => {
          const gatePayload = asObject(gate.payload);
          return (
            gatePayload.gate === "DOMAIN_SPECIALIST" &&
            gatePayload.domain === item.domain &&
            gatePayload.reviewer === item.reviewer
          );
        })
      )
        throw new Error("domain gate");
    const elana = gates.find(
      ({ value: gate }) => asObject(gate.payload).gate === "INDEPENDENT_EXACT_HEAD_QA",
    );
    if (
      !elana ||
      Number(elana.value.sequence) !==
        Math.max(...gates.map(({ value: gate }) => Number(gate.sequence))) ||
      gateDigests.at(-1) !== elana.digest
    )
      throw new Error("Elana last");
    const references = new Set(asStrings(asObject(value.authority).referenceRecordDigests));
    if (
      references.size !== gateDigests.length + 1 ||
      ![grant, ...gateDigests].every((reference) => references.has(reference))
    )
      throw new Error("references");
    const flags = asObject(payload.deniedActionFlags);
    if (!exactKeys(flags, deniedFlagKeys) || !Object.values(flags).every((flag) => flag === false))
      throw new Error("denied action");
  }
};
const phaseFixture = (): {
  contexts: FoldRecord[];
  phaseIndex: number;
  reviewDigests: string[];
} => {
  let current = cloneRecords();
  const reviewDigests: string[] = [];
  const specifications: Array<[string, string, string | null]> = [
    ["ARCHITECTURE", "Catalina", null],
    ["SECURITY", "Natalia", null],
    ["ENVIRONMENT_AND_CI", "Renata", null],
    ["DOMAIN_SPECIALIST", "Bianca", "records"],
    ["PROTECTED_CI", "GitHub Actions", null],
    ["INDEPENDENT_EXACT_HEAD_QA", "Elana", null],
  ];
  for (const [gate, reviewer, domain] of specifications) {
    const result = appendTestRecord(current, reviewTemplate(gate, reviewer, undefined, domain));
    current = result.records;
    reviewDigests.push(result.appended.entry.digest);
  }
  const phase = recordTemplate(
    "PHASE_APPROVAL",
    "Adriana",
    "delegated_credential_free_repository_authority",
    {
      delegationGrantRecordDigest: genesisDigests[1],
      deniedActionFlags: Object.fromEntries(deniedFlagKeys.map((key) => [key, false])),
      gateRecordDigests: reviewDigests,
      phaseId: "native-auth-foundation",
      requiredDomainGates: [{ domain: "records", reviewer: "Bianca" }],
      reviewedHead: "a886b75af125b5a69e2ee3f42471ceb2700eeec1",
      scope: "credential_free_repository_only_nonproduction_phase_after_required_gates",
      subjectBundleSha256: asObject(genesisSubject).bundleSha256,
    },
    [genesisDigests[1]!, ...reviewDigests],
  );
  const result = appendTestRecord(current, phase);
  return {
    contexts: result.records.map(({ entry, value }) => ({
      digest: entry.digest,
      value,
    })),
    phaseIndex: result.records.length - 1,
    reviewDigests,
  };
};

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

const ledgerRelative = "contracts/mobile/auth-readiness/v1/approval-history";
const isNormalizedPath = (path: string): boolean => {
  const segments = path.split("/");
  return (
    path.length > 0 &&
    !path.startsWith("/") &&
    !/^[A-Za-z]:/.test(path) &&
    !path.includes("\\") &&
    segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..") &&
    !path.startsWith(`${ledgerRelative}/`)
  );
};
const isAllowedTreeEntry = (line: string, final: boolean): boolean => {
  const [metadata] = line.split("\t");
  const [mode, type] = String(metadata).split(" ");
  return mode !== "120000" && (final ? type === "blob" : type === "tree");
};
const isTrackedNonSymlinkBlob = (commit: string, path: string, digest: string): boolean => {
  if (!gitExists("cat-file", "-e", `${commit}^{commit}`)) return false;
  if (!gitExists("merge-base", "--is-ancestor", commit, "HEAD")) return false;
  const segments = path.split("/");
  for (let offset = 1; offset <= segments.length; offset += 1) {
    const prefix = segments.slice(0, offset).join("/");
    const line = git("ls-tree", commit, "--", prefix);
    if (!line) return false;
    if (!isAllowedTreeEntry(line, offset === segments.length)) return false;
  }
  return sha256(gitBytes("show", `${commit}:${path}`)) === digest;
};

const payloadKeys: Record<string, string[]> = {
  GOVERNANCE_SELECTION: [
    "selection",
    "effectiveFor",
    "retiredMechanism",
    "historicalSnapshotCommit",
    "installationBaseCommit",
    "schemaSha256",
    "policySha256",
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
  DELEGATION_REVOCATION: ["delegationRecordDigest", "reason"],
  REVIEW_ATTESTATION: [
    "phaseId",
    "gate",
    "reviewer",
    "domain",
    "outcome",
    "subjectBundleSha256",
    "reviewedHead",
    "supersedesReviewRecordDigest",
  ],
  DECISION_APPROVAL: ["decisionId", "approvedValue", "evidenceByRequirement"],
  DECISION_SUPERSESSION: [
    "decisionId",
    "supersedesRecordDigest",
    "approvedValue",
    "evidenceByRequirement",
  ],
  PHASE_APPROVAL: [
    "phaseId",
    "scope",
    "delegationGrantRecordDigest",
    "gateRecordDigests",
    "requiredDomainGates",
    "subjectBundleSha256",
    "reviewedHead",
    "deniedActionFlags",
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
    expect(
      exactKeys(index, ["schemaVersion", "ledgerId", "schemaSha256", "policySha256", "records"]),
    ).toBe(true);
    expect(index.schemaSha256).toBe(sha256(schemaBytes));
    expect(index.policySha256).toBe(sha256(policyBytes));
    expect(asObject(schema).additionalProperties).toBe(false);
    expect(asObject(ledgerPolicy.bootstrap).genesisRecordCount).toBe(4);
    expect(records.length).toBeGreaterThanOrEqual(4);
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
      const provenance = asObject(value.provenance);
      const sourceCommit = String(provenance.sourceCommit);
      expect(exactKeys(subject, ["files", "bundleSha256"])).toBe(true);
      const files = filesFrom(subject);
      expect(files.map(({ path }) => path)).toEqual(
        [...files.map(({ path }) => path)].sort((a, b) => Buffer.from(a).compare(Buffer.from(b))),
      );
      expect(new Set(files.map(({ path }) => path)).size).toBe(files.length);
      for (const file of files) {
        expect(isNormalizedPath(file.path)).toBe(true);
        expect(digestPattern.test(file.sha256)).toBe(true);
        expect(isTrackedNonSymlinkBlob(sourceCommit, file.path, file.sha256)).toBe(true);
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
      process.env.FLUYO_APPROVAL_HISTORY_BASE ?? "a886b75af125b5a69e2ee3f42471ceb2700eeec1";
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
      expect(base).toBe("a886b75af125b5a69e2ee3f42471ceb2700eeec1");
      expect(records.length).toBeGreaterThanOrEqual(4);
    } else {
      expect(policyBytes.equals(gitBytes("show", `${base}:${ledgerRelative}/policy.json`))).toBe(
        true,
      );
      expect(schemaBytes.equals(gitBytes("show", `${base}:${ledgerRelative}/schema.json`))).toBe(
        true,
      );
      const baseIndex = JSON.parse(
        git("show", `${base}:contracts/mobile/auth-readiness/v1/approval-history/index.json`),
      ) as JsonObject;
      expect(
        Object.fromEntries(Object.entries(index).filter(([key]) => key !== "records")),
      ).toEqual(Object.fromEntries(Object.entries(baseIndex).filter(([key]) => key !== "records")));
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

describe("native-auth approval history adversarial architecture matrix", () => {
  it("A rejects every ledger-absent base except the installation base", () => {
    const assertBootstrap = (base: string, hasLedger: boolean): void => {
      if (!hasLedger && base !== "a886b75af125b5a69e2ee3f42471ceb2700eeec1")
        throw new Error("bootstrap base");
    };
    expect(() => assertBootstrap("a886b75af125b5a69e2ee3f42471ceb2700eeec1", false)).not.toThrow();
    expect(() => assertBootstrap("8ce28a7e57150ebf30499a447faee686ca50f3ce", false)).toThrow();
    expect(() => assertBootstrap("0".repeat(40), false)).toThrow();
    expect(() => assertBootstrap("a886b75af125b5a69e2ee3f42471ceb2700eeec1", true)).not.toThrow();
  });

  it("B accepts a valid fifth append and rejects prefix, fork, path, and inventory attacks", () => {
    const fifth = appendTestRecord(
      cloneRecords(),
      reviewTemplate("ARCHITECTURE", "Catalina", "append-probe"),
    ).records;
    expect(() => validateTestChain(fifth)).not.toThrow();
    const attacks: TestRecord[][] = [];
    attacks.push(fifth.slice(0, 3));
    const reorder = structuredClone(fifth);
    [reorder[0], reorder[1]] = [reorder[1]!, reorder[0]!];
    attacks.push(reorder);
    const insertion = structuredClone(fifth);
    insertion.splice(1, 0, structuredClone(insertion[4]!));
    attacks.push(insertion);
    const fork = structuredClone(fifth);
    fork[4]!.value.previousRecordDigest = genesisDigests[2];
    fork[4]!.bytes = Buffer.from(canonicalText(fork[4]!.value));
    fork[4]!.entry.digest = sha256(fork[4]!.bytes);
    attacks.push(fork);
    const edit = structuredClone(fifth);
    edit[0]!.value.actor = "Adriana";
    edit[0]!.bytes = Buffer.from(canonicalText(edit[0]!.value));
    edit[0]!.entry.digest = sha256(edit[0]!.bytes);
    attacks.push(edit);
    const rename = structuredClone(fifth);
    rename[0]!.entry.path = ledgerRelative + "/records/renamed.json";
    attacks.push(rename);
    const deletion = structuredClone(fifth);
    deletion.splice(2, 1);
    attacks.push(deletion);
    for (const attack of attacks) expect(() => validateTestChain(attack)).toThrow();
    expect(readdirSync(recordsDirectory).sort()).toEqual(
      records.map(({ entry }) => String(entry.digest) + ".json").sort(),
    );
  });

  it("C detects policy, schema, and fixed index header mutation with recomputed hashes", () => {
    expect(sha256(schemaBytes)).toBe(expectedSchemaSha256);
    expect(sha256(policyBytes)).toBe(expectedPolicySha256);
    expect(index.schemaSha256).toBe(expectedSchemaSha256);
    expect(index.policySha256).toBe(expectedPolicySha256);
    const fixed = {
      ledgerId: index.ledgerId,
      policySha256: index.policySha256,
      schemaSha256: index.schemaSha256,
      schemaVersion: index.schemaVersion,
    };
    const policyMutation = structuredClone(ledgerPolicy);
    asObject(policyMutation.foldRules).appendOnly = false;
    expect({ ...fixed, policySha256: sha256(JSON.stringify(policyMutation)) }).not.toEqual(fixed);
    const schemaMutation = structuredClone(schema);
    schemaMutation.additionalProperties = true;
    expect({ ...fixed, schemaSha256: sha256(JSON.stringify(schemaMutation)) }).not.toEqual(fixed);
    expect({ ...fixed, ledgerId: "other" }).not.toEqual(fixed);
  });

  it("D discriminates nine events and rejects key, number, Unicode, and byte attacks", () => {
    const samples: JsonObject[] = [
      records[0]!.value,
      records[1]!.value,
      recordTemplate("DELEGATION_REVOCATION", "Marlon", "direct_material_owner_authority", {
        delegationRecordDigest: genesisDigests[1],
        reason: "probe",
      }),
      records[3]!.value,
      reviewTemplate("ARCHITECTURE", "Catalina"),
      recordTemplate("DECISION_APPROVAL", "Marlon", "direct_material_owner_authority", {
        approvedValue: "probe",
        decisionId: decisionIds[0],
        evidenceByRequirement: { requirement: genesisDigests[0] },
      }),
      recordTemplate("DECISION_SUPERSESSION", "Marlon", "direct_material_owner_authority", {
        approvedValue: "probe-2",
        decisionId: decisionIds[0],
        evidenceByRequirement: { requirement: genesisDigests[0] },
        supersedesRecordDigest: genesisDigests[0],
      }),
      phaseFixture().contexts.at(-1)!.value,
      records[2]!.value,
    ];
    samples.forEach((sample) => expect(() => validateEventPair(sample)).not.toThrow());
    samples.forEach((sample, offset) => {
      const mismatch = structuredClone(sample);
      mismatch.payload = structuredClone(samples[(offset + 1) % samples.length]!.payload);
      expect(() => validateEventPair(mismatch)).toThrow();
    });
    const unknown = structuredClone(samples[0]!);
    unknown.eventType = "UNKNOWN";
    expect(() => validateEventPair(unknown)).toThrow();
    const extra = structuredClone(samples[0]!);
    asObject(extra.payload).unknown = true;
    expect(() => validateEventPair(extra)).toThrow();
    const unsafe = structuredClone(samples[0]!);
    unsafe.sequence = Number.MAX_SAFE_INTEGER + 1;
    expect(canonicalValue(unsafe)).toBe(false);
    const nonNfc = structuredClone(samples[0]!);
    nonNfc.actor = "Marlo\u0301n";
    expect(canonicalValue(nonNfc)).toBe(false);
    for (const bytes of [
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), records[0]!.bytes]),
      Buffer.from(records[0]!.bytes.toString("utf8").replaceAll("\n", "\r\n")),
      Buffer.from(records[0]!.bytes.toString("utf8").replace('"actor"', '"act\\u0000or"')),
      Buffer.concat([records[0]!.bytes, Buffer.from("\n")]),
    ])
      expect(bytes.toString("utf8")).not.toBe(canonicalText(records[0]!.value));
    expect(asObjects(schema.allOf)).toHaveLength(9);
  });

  it("E rejects aliases, untracked/non-blob paths, symlinks, and ledger self-reference", () => {
    for (const { value } of records) {
      const sourceCommit = String(asObject(value.provenance).sourceCommit);
      for (const file of filesFrom(asObject(value.subject)))
        expect(isTrackedNonSymlinkBlob(sourceCommit, file.path, file.sha256)).toBe(true);
    }
    for (const path of [
      "./apps/api/package.json",
      "apps//api/package.json",
      "apps/api/../api/package.json",
      ledgerRelative + "/index.json",
    ])
      expect(isNormalizedPath(path)).toBe(false);
    expect(
      isTrackedNonSymlinkBlob(
        "a886b75af125b5a69e2ee3f42471ceb2700eeec1",
        "node_modules/vitest/package.json",
        "0".repeat(64),
      ),
    ).toBe(false);
    expect(isAllowedTreeEntry("120000 blob deadbeef\tapps/link", true)).toBe(false);
    expect(isAllowedTreeEntry("040000 tree deadbeef\tapps/api/package.json", true)).toBe(false);
    expect(classifyToolingBundle(targetFiles, records[2]!.value)).toBe("target");
  });

  it("F rejects every non-atomic or semantically expanded Vitest bundle", () => {
    expect(baseFiles.map(({ sha256: digest }) => digest)).toEqual([
      "6e4562fdc68730e6630b5e56bc74fd2f4622c02c82c10b7fcc1db4db6d4d68a0",
      "055cf50ecd5c82f751af4bf4a306adccf00a3e8b28c0e7fa4071c73fe88caeb2",
      "34b42e520583bd00ae79d682fe1e39b4c0145800fc4efaf483b056b41e12cefe",
    ]);
    expect(targetFiles.map(({ sha256: digest }) => digest)).toEqual([
      "fa9d0b1598e0b6453d16551ecde04fb4220b1ac49962e06014cb88f89d706d38",
      "025d0a914a31dc77cfa8fabcb2a9445b658333fbd3148d89cfe42b3637a94249",
      "6c2a592699e6ed188cbdf1826578320fd6b3bb7504579709cb6875a727bdc82e",
    ]);
    expect(subjectDigest(baseFiles)).toBe(
      "7c19687d547d1bf56c9989d22a77b3534faf054460f0ae18c9283312e1f26119",
    );
    expect(subjectDigest(targetFiles)).toBe(
      "a39114aac53673c51d57eb6341e4a17da9575d64a5dc17b1d092bc250a5c2ab5",
    );
    expect(classifyToolingBundle(baseFiles, records[2]!.value)).toBe("base");
    expect(classifyToolingBundle(targetFiles, records[2]!.value)).toBe("target");
    expect(
      classifyToolingBundle([targetFiles[0]!, baseFiles[1]!, targetFiles[2]!], records[2]!.value),
    ).toBe("rejected");
    expect(
      classifyToolingBundle(
        [...targetFiles, { path: "apps/web/package.json", sha256: "0".repeat(64) }],
        records[2]!.value,
      ),
    ).toBe("rejected");
    const semantics = asObject(toolingPayload.atomicSemantics);
    const manifests = asStrings(semantics.manifestChanges);
    const lock = asStrings(semantics.lockfileChanges);
    expect(manifests).toHaveLength(2);
    expect(lock).toHaveLength(10);
    for (const mutation of [
      manifests.map((item) => item.replace("devDependencies", "dependencies")),
      manifests.map((item) => item.replace("4.1.12", "4.1.13")),
      manifests.map((item) => item.replace("vitest", "vite")),
    ])
      expect(mutation).not.toEqual(manifests);
    expect(lock.slice(0, 9)).not.toEqual(lock);
    expect([...lock, "unrelated lock leaf"]).not.toEqual(lock);
  });

  it("G rejects inactive authority and incomplete, stale, mismatched, or misordered gates", () => {
    const valid = phaseFixture();
    expect(() => foldAuthority(valid.contexts)).not.toThrow();
    const mutate = (change: (candidate: FoldRecord[]) => void): FoldRecord[] => {
      const candidate = structuredClone(valid.contexts);
      change(candidate);
      return candidate;
    };
    expect(() =>
      foldAuthority(
        mutate((candidate) => {
          asObject(candidate[valid.phaseIndex]!.value.payload).delegationGrantRecordDigest =
            "0".repeat(64);
        }),
      ),
    ).toThrow();
    expect(() =>
      foldAuthority(
        mutate((candidate) => {
          const phasePayload = asObject(candidate[valid.phaseIndex]!.value.payload);
          const flags = asObject(phasePayload.deniedActionFlags);
          flags.production = true;
        }),
      ),
    ).toThrow();
    expect(() =>
      foldAuthority(
        mutate((candidate) => {
          candidate.splice(valid.phaseIndex, 0, {
            digest: "1".repeat(64),
            value: recordTemplate(
              "DELEGATION_REVOCATION",
              "Marlon",
              "direct_material_owner_authority",
              { delegationRecordDigest: genesisDigests[1], reason: "probe" },
            ),
          });
        }),
      ),
    ).toThrow();
    expect(() =>
      validateEventPair(
        recordTemplate(
          "DECISION_APPROVAL",
          "Adriana",
          "delegated_credential_free_repository_authority",
          {
            approvedValue: "forbidden",
            decisionId: decisionIds[0],
            evidenceByRequirement: { requirement: genesisDigests[0] },
          },
        ),
      ),
    ).toThrow();
    for (const [recordOffset, field, value] of [
      [4, "outcome", "FAIL"],
      [4, "reviewer", "Wrong"],
      [4, "subjectBundleSha256", "0".repeat(64)],
      [4, "phaseId", "wrong"],
      [4, "reviewedHead", "0".repeat(40)],
    ] as Array<[number, string, unknown]>) {
      expect(() =>
        foldAuthority(
          mutate((candidate) => {
            asObject(candidate[recordOffset]!.value.payload)[field] = value;
          }),
        ),
      ).toThrow();
    }
    expect(() =>
      foldAuthority(
        mutate((candidate) => {
          asObject(candidate[valid.phaseIndex]!.value.payload).gateRecordDigests =
            valid.reviewDigests.slice(1);
        }),
      ),
    ).toThrow();
    expect(() =>
      foldAuthority(
        mutate((candidate) => {
          candidate[valid.phaseIndex - 1]!.value.sequence = 5;
        }),
      ),
    ).toThrow();
    expect(() =>
      foldAuthority(
        mutate((candidate) => {
          asObject(candidate[valid.phaseIndex]!.value.payload).requiredDomainGates = [];
        }),
      ),
    ).toThrow();
    expect(() =>
      foldAuthority(
        mutate((candidate) => {
          const replacement = reviewTemplate("DOMAIN_SPECIALIST", "Bianca", undefined, "records");
          asObject(replacement.payload).supersedesReviewRecordDigest = valid.reviewDigests[3];
          candidate.splice(valid.phaseIndex, 0, {
            digest: "2".repeat(64),
            value: replacement,
          });
        }),
      ),
    ).toThrow();
  });

  it("H preserves counts and protected historical, runtime, app, and package bytes", () => {
    const packet = JSON.parse(decisionPolicyBytes.toString("utf8")) as JsonObject;
    const decisions = asObjects(packet.decisions);
    expect(decisions.filter(({ status }) => status === "PROPOSED")).toHaveLength(5);
    expect(decisions.filter(({ status }) => status === "BLOCKED")).toHaveLength(9);
    expect(decisions.filter(({ status }) => status === "ACCEPTED")).toHaveLength(0);
    expect(asObject(packet.scope).runtimeEvidence).toEqual({
      conducted: 0,
      failed: 0,
      passed: 0,
      unattempted: 24,
    });
    expect(asObjects(asObject(authAcceptance.mirroredNativeRuntimeMatrix).rows)).toHaveLength(24);
    for (const protectedPath of [
      "contracts/mobile/auth-readiness/v1/decision-policy.json",
      "contracts/mobile/auth-readiness/v1/evidence/index.json",
      "contracts/mobile/auth-state/v1/acceptance.json",
      "apps/api/package.json",
      "apps/web/package.json",
      "package.json",
      "package-lock.json",
      "packages/shared/package.json",
    ])
      expect(readFileSync(resolve(root, protectedPath))).toEqual(
        gitBytes("show", "a886b75af125b5a69e2ee3f42471ceb2700eeec1:" + protectedPath),
      );
  });

  it("I keeps record digests and fold state independent of squash commit identity", () => {
    const before = records.map(({ entry }) => String(entry.digest));
    expect("f".repeat(40)).not.toBe("a886b75af125b5a69e2ee3f42471ceb2700eeec1");
    expect(records.map(({ value }) => sha256(canonicalText(value)))).toEqual(before);
    expect(() =>
      foldAuthority(records.map(({ entry, value }) => ({ digest: String(entry.digest), value }))),
    ).not.toThrow();
    for (const { value } of records)
      for (const file of filesFrom(asObject(value.subject)))
        expect(file.path.startsWith(ledgerRelative + "/")).toBe(false);
  });
});
