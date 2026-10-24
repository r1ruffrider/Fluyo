import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  DENIED_FLAG_KEYS,
  EVENT_TYPES,
  FIXED_REVIEWERS,
  HISTORICAL_SNAPSHOT,
  INSTALLATION_BASE,
  LEDGER_RELATIVE,
  MATERIAL_DECISION_IDS,
  TOOLING_SOURCE,
  canonicalText,
  canonicalValue,
  checkAuthApprovalHistory,
  classifyToolingBundle,
  sha256,
  subjectBytes,
  subjectDigest,
  validateLedger,
  validateSchemaSubset,
} from "./check-auth-approval-history.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ledgerDir = resolve(repoRoot, LEDGER_RELATIVE);
const index = JSON.parse(readFileSync(resolve(ledgerDir, "index.json"), "utf8"));
const policy = JSON.parse(readFileSync(resolve(ledgerDir, "policy.json"), "utf8"));
const schema = JSON.parse(readFileSync(resolve(ledgerDir, "schema.json"), "utf8"));
const records = index.records.map((entry) => ({
  entry,
  value: JSON.parse(readFileSync(resolve(repoRoot, entry.path), "utf8")),
}));
const git = (root, ...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }).trim();
const gitBytes = (root, ...args) => execFileSync("git", args, { cwd: root, windowsHide: true });
const commit = (root, message) => {
  git(root, "add", ".");
  git(root, "commit", "--quiet", "-m", message);
  return git(root, "rev-parse", "HEAD");
};

function appendRecord(root, value) {
  const indexPath = resolve(root, LEDGER_RELATIVE, "index.json");
  const current = JSON.parse(readFileSync(indexPath, "utf8"));
  value.sequence = current.records.length + 1;
  value.previousRecordDigest = current.records.at(-1)?.digest ?? null;
  const bytes = Buffer.from(canonicalText(value));
  const digest = sha256(bytes);
  const path = `${LEDGER_RELATIVE}/records/${digest}.json`;
  writeFileSync(resolve(root, path), bytes);
  current.records.push({ sequence: value.sequence, digest, path });
  writeFileSync(indexPath, canonicalText(current));
  return digest;
}

function baseRecord(eventType, actor, kind, subject, sourceCommit, payload, references) {
  return {
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
      sourceCommit,
    },
    recordedAtUtc: "2026-10-24T12:00:00.000Z",
    schemaVersion: "1.0.0",
    sequence: 0,
    subject,
  };
}

function buildAppendFixture() {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-auth-ledger-"));
  git(root, "init", "--quiet");
  git(root, "config", "user.name", "Fluyo ledger test");
  git(root, "config", "user.email", "ledger-test@invalid.local");
  git(root, "config", "core.autocrlf", "false");
  git(root, "fetch", "--quiet", repoRoot, HISTORICAL_SNAPSHOT, TOOLING_SOURCE, INSTALLATION_BASE);
  git(root, "checkout", "--quiet", INSTALLATION_BASE);
  mkdirSync(resolve(root, LEDGER_RELATIVE), { recursive: true });
  cpSync(ledgerDir, resolve(root, LEDGER_RELATIVE), { recursive: true });
  mkdirSync(resolve(root, "scripts"), { recursive: true });
  cpSync(
    resolve(repoRoot, "scripts/check-auth-approval-history.mjs"),
    resolve(root, "scripts/check-auth-approval-history.mjs"),
  );
  mkdirSync(resolve(root, ".github/workflows"), { recursive: true });
  cpSync(
    resolve(repoRoot, ".github/workflows/auth-approval-history.yml"),
    resolve(root, ".github/workflows/auth-approval-history.yml"),
  );
  const bootstrapHead = commit(root, "bootstrap ledger L0");
  assert.deepEqual(
    checkAuthApprovalHistory({ root, base: INSTALLATION_BASE, head: bootstrapHead }).mode,
    "bootstrap",
  );

  writeFileSync(resolve(root, "reviewed-subject.txt"), "frozen subject T\n");
  const subjectHead = commit(root, "freeze reviewed subject T");
  const subject = {
    bundleSha256: "",
    files: [
      {
        path: "reviewed-subject.txt",
        sha256: sha256(readFileSync(resolve(root, "reviewed-subject.txt"))),
      },
    ],
  };
  subject.bundleSha256 = subjectDigest(subject.files);
  const grant = index.records[1].digest;
  const gates = [];
  const specs = [
    ["ARCHITECTURE", "Catalina", null],
    ["SECURITY", "Natalia", null],
    ["ENVIRONMENT_AND_CI", "Renata", null],
    ["DOMAIN_SPECIALIST", "Bianca", "records"],
    ["PROTECTED_CI", "GitHub Actions", null],
    ["INDEPENDENT_EXACT_HEAD_QA", "Elana", null],
  ];
  for (const [gate, reviewer, domain] of specs) {
    gates.push(
      appendRecord(
        root,
        baseRecord(
          "REVIEW_ATTESTATION",
          reviewer,
          gate === "PROTECTED_CI"
            ? "protected_ci_attestation"
            : "delegated_specialist_review_authority",
          subject,
          subjectHead,
          {
            domain,
            gate,
            outcome: "PASS",
            phaseId: "fixture-phase",
            reviewedHead: subjectHead,
            reviewer,
            subjectBundleSha256: subject.bundleSha256,
            supersedesReviewRecordDigest: null,
          },
          [grant],
        ),
      ),
    );
  }
  const phaseDigest = appendRecord(
    root,
    baseRecord(
      "PHASE_APPROVAL",
      "Adriana",
      "delegated_credential_free_repository_authority",
      subject,
      subjectHead,
      {
        delegationGrantRecordDigest: grant,
        deniedActionFlags: Object.fromEntries(DENIED_FLAG_KEYS.map((key) => [key, false])),
        gateRecordDigests: gates,
        phaseId: "fixture-phase",
        requiredDomainGates: [{ domain: "records", reviewer: "Bianca" }],
        reviewedHead: subjectHead,
        scope: policy.delegation.scope,
        subjectBundleSha256: subject.bundleSha256,
      },
      [grant, ...gates],
    ),
  );
  const appendHead = commit(root, "append reviews and phase approval L");
  return { root, bootstrapHead, subjectHead, appendHead, phaseDigest, gates };
}

function mutateRecord(root, sequence, mutation) {
  const indexPath = resolve(root, LEDGER_RELATIVE, "index.json");
  const candidate = JSON.parse(readFileSync(indexPath, "utf8"));
  const entry = candidate.records[sequence - 1];
  const oldPath = resolve(root, entry.path);
  const value = JSON.parse(readFileSync(oldPath, "utf8"));
  mutation(value);
  const bytes = Buffer.from(canonicalText(value));
  const digest = sha256(bytes);
  const nextPath = `${LEDGER_RELATIVE}/records/${digest}.json`;
  rmSync(oldPath);
  writeFileSync(resolve(root, nextPath), bytes);
  entry.digest = digest;
  entry.path = nextPath;
  writeFileSync(indexPath, canonicalText(candidate));
}

test("freezes trusted schema, validator, workflow, policy, inventory, and four-record bootstrap", () => {
  assert.deepEqual(policy.eventTypes, EVENT_TYPES);
  assert.equal(policy.foldRules.decisionEventsDeniedInV1, true);
  assert.equal(policy.bootstrap.installationBaseCommit, INSTALLATION_BASE);
  assert.equal(policy.bootstrap.historicalSnapshotCommit, HISTORICAL_SNAPSHOT);
  assert.equal(
    policy.bootstrap.schemaSha256,
    sha256(readFileSync(resolve(ledgerDir, "schema.json"))),
  );
  assert.equal(
    policy.bootstrap.validatorSha256,
    sha256(readFileSync(resolve(repoRoot, "scripts/check-auth-approval-history.mjs"))),
  );
  assert.equal(
    policy.bootstrap.workflowSha256,
    sha256(readFileSync(resolve(repoRoot, ".github/workflows/auth-approval-history.yml"))),
  );
  assert.equal(index.policySha256, sha256(readFileSync(resolve(ledgerDir, "policy.json"))));
  assert.equal(index.schemaSha256, policy.bootstrap.schemaSha256);
  assert.equal(records.length, 4);
  assert.deepEqual(
    records.map(({ value }) => value.eventType),
    [
      "GOVERNANCE_SELECTION",
      "DELEGATION_GRANT",
      "TOOLING_CHANGE_AUTHORIZATION",
      "MIGRATION_SNAPSHOT",
    ],
  );
  assert.deepEqual(
    readdirSync(resolve(ledgerDir, "records")).sort(),
    index.records.map(({ digest }) => `${digest}.json`).sort(),
  );
  const result = checkAuthApprovalHistory({
    root: repoRoot,
    base: INSTALLATION_BASE,
    head: INSTALLATION_BASE,
  });
  assert.deepEqual(
    { mode: result.mode, records: result.records, appended: result.appended },
    { mode: "bootstrap", records: 4, appended: 4 },
  );
});

test("executes the closed JSON Schema subset and rejects decision events, unknown fields, and unsupported schema keywords", () => {
  for (const { value } of records) assert.deepEqual(validateSchemaSubset(schema, value), []);
  const decision = structuredClone(records[0].value);
  decision.eventType = "DECISION_APPROVAL";
  assert.notDeepEqual(validateSchemaSubset(schema, decision), []);
  const expanded = structuredClone(records[1].value);
  expanded.authority.productionAuthority = true;
  assert.notDeepEqual(validateSchemaSubset(schema, expanded), []);
  assert.match(
    validateSchemaSubset({ type: "string", format: "email" }, "x").join("\n"),
    /unsupported schema keyword format/,
  );
});

test("canonical encoding requires NFC, safe integers, UTF-8 key order, NUL separators, and one LF", () => {
  assert.equal(canonicalValue({ value: "é", count: Number.MAX_SAFE_INTEGER }), true);
  assert.equal(canonicalValue({ value: "e\u0301" }), false);
  assert.equal(canonicalValue({ count: Number.MAX_SAFE_INTEGER + 1 }), false);
  assert.equal(canonicalText({ z: 1, a: 2 }), '{\n  "a": 2,\n  "z": 1\n}\n');
  const tooling = records[2].value.payload;
  assert.equal(subjectDigest(tooling.baseFiles), tooling.baseBundleSha256);
  assert.equal(subjectDigest(tooling.targetFiles), tooling.targetBundleSha256);
  assert.equal(subjectBytes(tooling.baseFiles).includes(Buffer.from([0])), true);
  assert.notEqual(
    sha256(
      Buffer.from(tooling.baseFiles.map((file) => `${file.path}\\0${file.sha256}\\n`).join("")),
    ),
    tooling.baseBundleSha256,
  );
});

test("keeps the exact historical Vitest authorization atomic and dormant on the current main bundle", () => {
  const authorization = records[2].value;
  const payload = authorization.payload;
  assert.equal(classifyToolingBundle(payload.baseFiles, authorization), "base");
  assert.equal(classifyToolingBundle(payload.targetFiles, authorization), "target");
  for (const files of [
    [payload.targetFiles[0], payload.baseFiles[1], payload.baseFiles[2]],
    payload.targetFiles.slice(0, 2),
    [...payload.targetFiles, { path: "package.json", sha256: "0".repeat(64) }],
    payload.targetFiles.map((file, index) =>
      index === 1 ? { ...file, sha256: "0".repeat(64) } : file,
    ),
  ])
    assert.equal(classifyToolingBundle(files, authorization), "rejected");
  const current = payload.baseFiles.map(({ path }) => ({
    path,
    sha256: sha256(gitBytes(repoRoot, "show", `${INSTALLATION_BASE}:${path}`)),
  }));
  assert.equal(classifyToolingBundle(current, authorization), "rejected");
  assert.equal(payload.atomicSemantics.lockfileChanges.length, 10);
  assert.equal(payload.baseFiles.length + payload.targetFiles.length, 6);
});

test("preserves 14 open decisions, 69 unsatisfied requirements, zero runtime, and 24 unattempted rows", () => {
  const packet = JSON.parse(
    readFileSync(
      resolve(repoRoot, "contracts/mobile/auth-readiness/v1/decision-policy.json"),
      "utf8",
    ),
  );
  const acceptance = JSON.parse(
    readFileSync(resolve(repoRoot, "contracts/mobile/auth-state/v1/acceptance.json"), "utf8"),
  );
  assert.deepEqual(
    packet.decisions.map(({ id }) => id),
    MATERIAL_DECISION_IDS,
  );
  assert.deepEqual(
    {
      proposed: packet.decisions.filter(({ status }) => status === "PROPOSED").length,
      blocked: packet.decisions.filter(({ status }) => status === "BLOCKED").length,
      accepted: packet.decisions.filter(({ status }) => status === "ACCEPTED").length,
    },
    { proposed: 5, blocked: 9, accepted: 0 },
  );
  assert.equal(packet.decisions.flatMap(({ requiredEvidence }) => requiredEvidence).length, 69);
  assert.equal(acceptance.runtimeExecutions, 0);
  assert.equal(acceptance.mirroredNativeRuntimeMatrix.rows.length, 24);
  assert.equal(
    acceptance.mirroredNativeRuntimeMatrix.rows.every(({ status }) => status === "unattempted"),
    true,
  );
});

test(
  "accepts a real T then L append with active delegation, same-subject PASS gates, and Elana last",
  () => {
    const fixture = buildAppendFixture();
    try {
      assert.notEqual(fixture.subjectHead, fixture.appendHead);
      const result = checkAuthApprovalHistory({
        root: fixture.root,
        base: fixture.bootstrapHead,
        head: fixture.appendHead,
      });
      assert.deepEqual(
        { mode: result.mode, appended: result.appended, records: result.records },
        { mode: "append", appended: 7, records: 11 },
      );
      assert.equal(result.tipDigest, fixture.phaseDigest);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  },
  { timeout: 30_000 },
);

test(
  "rejects prefix rewriting even when an attacker recomputes the changed record digest",
  () => {
    const fixture = buildAppendFixture();
    try {
      mutateRecord(fixture.root, 1, (value) => {
        value.recordedAtUtc = "2026-10-23T21:00:36.373Z";
      });
      const attacked = commit(fixture.root, "rewrite historical prefix");
      assert.throws(
        () =>
          checkAuthApprovalHistory({
            root: fixture.root,
            base: fixture.bootstrapHead,
            head: attacked,
          }),
        /prefix changed|historical record bytes changed|chain mismatch/,
      );
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  },
  { timeout: 30_000 },
);

test(
  "rejects policy, schema, validator, workflow, index-header, and unindexed-record mutations",
  () => {
    const fixture = buildAppendFixture();
    try {
      const attacks = [
        [resolve(fixture.root, LEDGER_RELATIVE, "policy.json"), " {}\n"],
        [resolve(fixture.root, LEDGER_RELATIVE, "schema.json"), " {}\n"],
        [resolve(fixture.root, "scripts/check-auth-approval-history.mjs"), "\n// weakened\n"],
        [resolve(fixture.root, ".github/workflows/auth-approval-history.yml"), "\n# weakened\n"],
      ];
      for (const [path, suffix] of attacks) {
        const original = readFileSync(path);
        writeFileSync(path, Buffer.concat([original, Buffer.from(suffix)]));
        assert.throws(() => validateLedger(fixture.root, fixture.appendHead));
        writeFileSync(path, original);
      }
      const indexPath = resolve(fixture.root, LEDGER_RELATIVE, "index.json");
      const originalIndex = readFileSync(indexPath);
      const changed = JSON.parse(originalIndex);
      changed.ledgerId = "attacker";
      writeFileSync(indexPath, canonicalText(changed));
      assert.throws(
        () => validateLedger(fixture.root, fixture.appendHead),
        /index|ledgerId|schema|chain/,
      );
      writeFileSync(indexPath, originalIndex);
      writeFileSync(
        resolve(fixture.root, LEDGER_RELATIVE, "records", `${"f".repeat(64)}.json`),
        "{}\n",
      );
      assert.throws(() => validateLedger(fixture.root, fixture.appendHead), /inventory/);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  },
  { timeout: 30_000 },
);

test("default-denies stale review, wrong subject, inactive delegation, missing domains, denied flags, and Elana reordering", () => {
  const required = Object.keys(FIXED_REVIEWERS);
  assert.deepEqual(required, [
    "ARCHITECTURE",
    "SECURITY",
    "ENVIRONMENT_AND_CI",
    "PROTECTED_CI",
    "INDEPENDENT_EXACT_HEAD_QA",
  ]);
  assert.equal(policy.delegation.requiredPhaseGates.at(-1), "Elana exact-head PASS last");
  assert.equal(new Set(policy.delegation.requiredPhaseGates).size, 6);
  for (const fragment of [
    "production",
    "credential",
    "external_account",
    "dashboard",
    "domain",
    "signing",
    "store",
    "physical_device",
    "spend",
    "publication",
    "destructive",
    "material_native_auth",
  ])
    assert.equal(
      policy.delegation.deniedActions.some((item) => item.includes(fragment)),
      true,
      fragment,
    );
  const phaseSchema = schema.allOf.find(
    (branch) => branch.if?.properties?.eventType?.const === "PHASE_APPROVAL",
  );
  const sample = structuredClone(records[1].value);
  sample.eventType = "PHASE_APPROVAL";
  sample.payload = {};
  sample.actor = "Adriana";
  sample.authority.kind = "delegated_credential_free_repository_authority";
  assert.notDeepEqual(validateSchemaSubset(phaseSchema.then, sample, schema), []);
});

test(
  "rejects phase attacks with recomputed last-record digests and latest-review-wins staleness",
  () => {
    const fixture = buildAppendFixture();
    const phaseSequence = 11;
    const reset = () => {
      git(fixture.root, "reset", "--hard", fixture.appendHead);
      git(fixture.root, "clean", "-fd");
    };
    try {
      const attacks = [
        (value) => {
          value.payload.deniedActionFlags.production = true;
        },
        (value) => {
          value.payload.requiredDomainGates = [];
        },
        (value) => {
          value.payload.reviewedHead = INSTALLATION_BASE;
        },
        (value) => {
          value.payload.gateRecordDigests = [...value.payload.gateRecordDigests].reverse();
        },
        (value) => {
          value.payload.delegationGrantRecordDigest = index.records[0].digest;
        },
      ];
      for (const attack of attacks) {
        mutateRecord(fixture.root, phaseSequence, attack);
        assert.throws(() => validateLedger(fixture.root, fixture.appendHead));
        reset();
      }

      const subject = JSON.parse(
        readFileSync(resolve(fixture.root, index.records[0].path), "utf8"),
      ).subject;
      const grant = index.records[1].digest;
      const superseding = baseRecord(
        "REVIEW_ATTESTATION",
        "Catalina",
        "delegated_specialist_review_authority",
        subject,
        HISTORICAL_SNAPSHOT,
        {
          domain: null,
          gate: "ARCHITECTURE",
          outcome: "PASS",
          phaseId: "fixture-phase",
          reviewedHead: HISTORICAL_SNAPSHOT,
          reviewer: "Catalina",
          subjectBundleSha256: subject.bundleSha256,
          supersedesReviewRecordDigest: fixture.gates[0],
        },
        [grant, fixture.gates[0]],
      );
      appendRecord(fixture.root, superseding);
      const stalePhase = JSON.parse(
        readFileSync(
          resolve(fixture.root, `${LEDGER_RELATIVE}/records/${fixture.phaseDigest}.json`),
          "utf8",
        ),
      );
      stalePhase.authority.referenceRecordDigests = [grant, ...fixture.gates];
      appendRecord(fixture.root, stalePhase);
      assert.throws(
        () => validateLedger(fixture.root, fixture.appendHead),
        /stale or missing review/,
      );
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  },
  { timeout: 90_000 },
);
test("genesis records contain no credential, secret, private-account, or PII-bearing fields", () => {
  const forbiddenKey =
    /(?:secret|password|token|credential|privatekey|email|phone|address|udid|accountid)/i;
  const forbiddenValue =
    /(?:-----BEGIN [A-Z ]+PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{10,}|sk_(?:live|test)_|ghp_|AKIA[0-9A-Z]{16})/;
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value !== null && typeof value === "object")
      return Object.entries(value).forEach(([key, nested]) => {
        assert.doesNotMatch(key, forbiddenKey);
        walk(nested);
      });
    if (typeof value === "string") assert.doesNotMatch(value, forbiddenValue);
  };
  records.forEach(({ value }) => walk(value));
});
