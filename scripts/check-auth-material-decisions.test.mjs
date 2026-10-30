import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ANCHOR_COMMIT,
  DECISION_IDS,
  DEFERRED_IDS,
  EVENT_TYPES,
  FORBIDDEN_FLAGS,
  GENESIS_FOREIGN_REFERENCE,
  LEDGER_ID,
  MANIFEST_DIGEST,
  SELECTED_IDS,
  VALUES_RELATIVE,
  canonicalText,
  checkAuthMaterialDecisions,
  closureGatesFor,
  foldRecords,
  isCanonicalDate,
  isCanonicalTimestamp,
  parseCanonical,
  sha256,
  subjectDigest,
  validateAuthorityReferences,
  validateDecisionManifest,
  validateCanonicalValue,
  validateClosureProofs,
  validateManifest,
  validatePayload,
  validateRepositoryPath,
} from "./check-auth-material-decisions.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(repoRoot, VALUES_RELATIVE, `${MANIFEST_DIGEST}.json`);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const digest = (character) => character.repeat(64);
const initialization = {
  digest: digest("1"),
  record: {
    actor: "Adriana",
    eventType: "MATERIAL_DECISION_LEDGER_INITIALIZATION",
    sequence: 1,
  },
};
const selectionEntries = () =>
  DECISION_IDS.map((decisionId) => {
    const expected = manifest.decisionValues[decisionId];
    return {
      decisionId,
      decisionManifestSha256: MANIFEST_DIGEST,
      decisionValueSha256: sha256(Buffer.from(canonicalText(expected.selectedValue))),
      selectionState: expected.selectionState,
    };
  });
const selection = {
  digest: digest("2"),
  record: {
    actor: "Marlon",
    eventType: "MATERIAL_DECISION_SELECTION",
    payload: { entries: selectionEntries() },
    sequence: 2,
  },
};
const capture = (operation) => {
  try {
    operation();
  } catch (error) {
    return error;
  }
  assert.fail("expected operation to fail");
};
const clone = (value) => structuredClone(value);
const git = (root, ...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }).trim();
const commit = (root, message) => {
  git(root, "add", ".");
  git(root, "commit", "--quiet", "-m", message);
  return git(root, "rev-parse", "HEAD");
};

function initializeFixtureRoot(prefix) {
  const root = mkdtempSync(resolve(tmpdir(), prefix));
  git(root, "init", "--quiet");
  const commonGitDir = git(repoRoot, "rev-parse", "--git-common-dir");
  const objectDirectory = resolve(
    isAbsolute(commonGitDir) ? commonGitDir : resolve(repoRoot, commonGitDir),
    "objects",
  );
  writeFileSync(
    resolve(root, ".git/objects/info/alternates"),
    `${objectDirectory.replaceAll("\\", "/")}\n`,
    "utf8",
  );
  git(root, "config", "user.name", "Fluyo material ledger test");
  git(root, "config", "user.email", "material-ledger-test@invalid.local");
  git(root, "config", "core.autocrlf", "false");
  git(root, "config", "core.longpaths", "true");
  git(root, "config", "commit.gpgsign", "false");
  git(root, "checkout", "--quiet", ANCHOR_COMMIT);
  return root;
}

function buildBootstrapFixture() {
  const root = initializeFixtureRoot("fluyo-material-v2-");
  mkdirSync(resolve(root, "contracts/mobile/auth-readiness/v2"), { recursive: true });
  cpSync(
    resolve(repoRoot, "contracts/mobile/auth-readiness/v2"),
    resolve(root, "contracts/mobile/auth-readiness/v2"),
    { recursive: true },
  );
  mkdirSync(resolve(root, "scripts"), { recursive: true });
  cpSync(
    resolve(repoRoot, "scripts/check-auth-material-decisions.mjs"),
    resolve(root, "scripts/check-auth-material-decisions.mjs"),
  );
  mkdirSync(resolve(root, ".github/workflows"), { recursive: true });
  cpSync(
    resolve(repoRoot, ".github/workflows/auth-material-decisions.yml"),
    resolve(root, ".github/workflows/auth-material-decisions.yml"),
  );
  const head = commit(root, "bootstrap material decision ledger v2");
  return { root, head };
}

const methodRequirements = [
  "exact_enabled_method_list",
  "unsupported_flow_list",
  "copy_and_recovery_review",
  "context_specific_copy_primary_and_cancel_actions",
  "bounded_loading_error_and_recovery_states",
  "focus_one_time_announcement_screen_reader_order",
  "two_hundred_percent_text_target_reachability_and_reduced_motion",
];

function buildClosureProofFixture() {
  const root = initializeFixtureRoot("fluyo-material-closure-");
  const evidencePaths = Object.fromEntries(
    methodRequirements.map((requirement) => [requirement, `evidence/${requirement}.txt`]),
  );
  for (const [requirement, path] of Object.entries(evidencePaths)) {
    mkdirSync(resolve(root, dirname(path)), { recursive: true });
    writeFileSync(resolve(root, path), `${requirement}\n`, "utf8");
  }
  const evidenceCommit = commit(root, "add frozen auth method evidence");
  const selected = selectionEntries().find(({ decisionId }) => decisionId === "AUTH-METHODS");
  const gatePaths = {};
  for (const gate of closureGatesFor("AUTH-METHODS")) {
    const path = `gates/${gate.toLowerCase()}.json`;
    gatePaths[gate] = path;
    mkdirSync(resolve(root, dirname(path)), { recursive: true });
    writeFileSync(
      resolve(root, path),
      canonicalText({
        decisionId: "AUTH-METHODS",
        decisionManifestSha256: selected.decisionManifestSha256,
        decisionValueSha256: selected.decisionValueSha256,
        gate,
        reviewedHead: evidenceCommit,
        status: "PASS",
      }),
      "utf8",
    );
  }
  const source = commit(root, "record exact-head gate attestations");
  const allPaths = [...Object.values(evidencePaths), ...Object.values(gatePaths)].sort();
  const subjectFiles = new Map(
    allPaths.map((path) => [path, sha256(readFileSync(resolve(root, path)))]),
  );
  const entry = {
    decisionId: "AUTH-METHODS",
    decisionManifestSha256: selected.decisionManifestSha256,
    decisionValueSha256: selected.decisionValueSha256,
    evidenceByRequirement: Object.fromEntries(
      Object.entries(evidencePaths).map(([requirement, path]) => [
        requirement,
        `git:${evidenceCommit}:${path}`,
      ]),
    ),
    evidenceCommit,
    gateAttestations: Object.fromEntries(
      Object.entries(gatePaths).map(([gate, path]) => [gate, `git:${source}:${path}`]),
    ),
    latestRecordDigest: selection.digest,
  };
  return {
    entry,
    record: { payload: { entries: [entry] } },
    root,
    source,
    subjectFiles,
  };
}

test("v2 declares a closed fourteen-decision and five-event inventory", () => {
  assert.equal(DECISION_IDS.length, 14);
  assert.equal(new Set(DECISION_IDS).size, 14);
  assert.equal(SELECTED_IDS.length, 7);
  assert.equal(DEFERRED_IDS.length, 7);
  assert.equal(EVENT_TYPES.length, 5);
  assert.equal(LEDGER_ID, "fluyo-native-auth-material-decisions-v2");
});

test("selection manifest is canonical and content addressed", () => {
  const bytes = readFileSync(manifestPath);
  assert.equal(bytes.toString(), canonicalText(manifest));
  assert.equal(sha256(bytes), MANIFEST_DIGEST);
  assert.doesNotThrow(() => validateManifest(manifest));
});

test("Prettier cannot rewrite immutable canonical v2 data", () => {
  const ignored = new Set(
    readFileSync(resolve(repoRoot, ".prettierignore"), "utf8").split(/\r?\n/u).filter(Boolean),
  );
  for (const path of [
    "contracts/mobile/auth-readiness/v2/decision-values/*.json",
    "contracts/mobile/auth-readiness/v2/material-decision-history/records/*.json",
    "contracts/mobile/auth-readiness/v2/material-decision-history/schema.json",
  ])
    assert.equal(ignored.has(path), true, `${path} must remain canonical-validator owned`);
});

test("canonical values reject non-NFC strings, non-NFC keys, and unsafe integers", () => {
  assert.match(capture(() => validateCanonicalValue("e\u0301")).message, /non-NFC string/u);
  assert.match(capture(() => validateCanonicalValue({ "e\u0301": true })).message, /non-NFC key/u);
  assert.match(
    capture(() => validateCanonicalValue(9_007_199_254_740_992)).message,
    /non-safe integer/u,
  );
  const unsafeBytes = Buffer.from("9007199254740992\n");
  assert.match(capture(() => parseCanonical(unsafeBytes, "unsafe")).message, /non-safe integer/u);
});

test("record timestamps and selection dates require real canonical UTC calendar values", () => {
  assert.equal(isCanonicalTimestamp("2026-10-30T08:47:46.627Z"), true);
  assert.equal(isCanonicalTimestamp("2026-02-30T08:47:46.627Z"), false);
  assert.equal(isCanonicalTimestamp("2026-10-30T08:47:46Z"), false);
  assert.equal(isCanonicalDate("2026-10-30"), true);
  assert.equal(isCanonicalDate("2026-02-30"), false);
});

test("manifest maps seven selections and seven deferrals without acceptance", () => {
  assert.deepEqual(
    Object.entries(manifest.decisionValues)
      .filter(([, value]) => value.selectionState === "OWNER_SELECTED_EVIDENCE_PENDING")
      .map(([id]) => id)
      .sort(),
    [...SELECTED_IDS].sort(),
  );
  assert.deepEqual(
    Object.entries(manifest.decisionValues)
      .filter(([, value]) => value.selectionState === "DEFERRED_OPEN")
      .map(([id]) => id)
      .sort(),
    [...DEFERRED_IDS].sort(),
  );
  assert.equal(JSON.stringify(manifest).includes('"ACCEPTED"'), false);
});

for (const flag of FORBIDDEN_FLAGS)
  test(`manifest rejects forbidden authorization flag ${flag}`, () => {
    const candidate = clone(manifest);
    candidate.boundaries[flag] = true;
    assert.match(capture(() => validateManifest(candidate)).message, /forbidden flag/u);
  });

test("manifest rejects a missing decision", () => {
  const candidate = clone(manifest);
  delete candidate.decisionValues["AUTH-AASA"];
  assert.match(capture(() => validateManifest(candidate)).message, /exactly fourteen/u);
});

test("manifest rejects iOS dependency installation or runtime authorization", () => {
  for (const key of [
    "productDependencySelected",
    "productDependencyInstallationAuthorized",
    "nativeRuntimeAuthorized",
  ]) {
    const candidate = clone(manifest);
    candidate.decisionValues["AUTH-SDK-IOS"].selectedValue[key] = true;
    assert.match(capture(() => validateManifest(candidate)).message, /iOS selection/u);
  }
});

test("manifest rejects Android beta, coordinate, or runtime authorization", () => {
  const candidates = [
    ["betaAccepted", true],
    ["coordinate", "io.github.jan-tennert.supabase:auth-kt"],
    ["nativeRuntimeAuthorized", true],
  ];
  for (const [key, value] of candidates) {
    const candidate = clone(manifest);
    candidate.decisionValues["AUTH-SDK-ANDROID"].selectedValue[key] = value;
    assert.match(capture(() => validateManifest(candidate)).message, /Android selection/u);
  }
});

test("genesis alone folds to fourteen open decisions", () => {
  const state = foldRecords([initialization], manifest);
  assert.equal(state.size, 14);
  assert.equal(
    [...state.values()].every(({ status }) => status === "OPEN"),
    true,
  );
});

test("atomic selection folds to seven evidence-pending and seven deferred", () => {
  const state = foldRecords([initialization, selection], manifest);
  assert.equal(
    [...state.values()].filter(({ status }) => status === "OWNER_SELECTED_EVIDENCE_PENDING").length,
    7,
  );
  assert.equal([...state.values()].filter(({ status }) => status === "DEFERRED_OPEN").length, 7);
  assert.equal(
    [...state.values()].some(({ status }) => status === "ACCEPTED"),
    false,
  );
});

test("initial selection rejects a partial bundle", () => {
  const candidate = clone(selection);
  candidate.record.payload.entries.pop();
  assert.match(
    capture(() => foldRecords([initialization, candidate], manifest)).message,
    /all fourteen/u,
  );
});

test("initial selection rejects duplicate and unknown decisions", () => {
  const duplicate = clone(selection);
  duplicate.record.payload.entries[1].decisionId = duplicate.record.payload.entries[0].decisionId;
  assert.match(
    capture(() => foldRecords([initialization, duplicate], manifest)).message,
    /duplicate/u,
  );
  const unknown = clone(selection);
  unknown.record.payload.entries[0].decisionId = "AUTH-UNKNOWN";
  assert.match(capture(() => foldRecords([initialization, unknown], manifest)).message, /unknown/u);
});

test("initial selection rejects value drift from the frozen manifest", () => {
  const candidate = clone(selection);
  candidate.record.payload.entries[0].decisionValueSha256 = digest("f");
  assert.match(
    capture(() => foldRecords([initialization, candidate], manifest)).message,
    /does not match/u,
  );
});

test("initial selection cannot be replayed", () => {
  const replay = clone(selection);
  replay.digest = digest("3");
  replay.record.sequence = 3;
  assert.match(
    capture(() => foldRecords([initialization, selection, replay], manifest)).message,
    /only once/u,
  );
});

test("event payloads reject extra fields and impossible supersession dates", () => {
  const subjectFiles = new Map([[`${VALUES_RELATIVE}/${MANIFEST_DIGEST}.json`, MANIFEST_DIGEST]]);
  const selected = {
    eventType: "MATERIAL_DECISION_SELECTION",
    payload: {
      entries: selectionEntries(),
      selectionChoiceCode: "APPROVE_RECOMMENDED_BUNDLE",
      selectionChoiceLabel: "Approve recommended bundle",
      selectionRecordedDate: "2026-10-30",
      selectionSource:
        "Marlon directly selected “Approve recommended bundle” in Codex on 2026-10-30 against the merged decision brief",
    },
    sequence: 2,
  };
  assert.doesNotThrow(() => validatePayload(selected, subjectFiles, repoRoot, ANCHOR_COMMIT));
  const extra = clone(selected);
  extra.payload.approvalTime = "invented";
  assert.match(
    capture(() => validatePayload(extra, subjectFiles, repoRoot, ANCHOR_COMMIT)).message,
    /source mismatch/u,
  );
  const supersession = {
    eventType: "MATERIAL_DECISION_SUPERSESSION",
    payload: {
      entries: [],
      selectionChoiceCode: "REPLACE_NATIVE_METHOD_BUNDLE",
      selectionChoiceLabel: "Replace native method bundle",
      selectionRecordedDate: "2026-02-30",
      selectionSource: "Marlon selected a replacement value",
    },
    sequence: 3,
  };
  assert.match(
    capture(() => validatePayload(supersession, new Map(), repoRoot, ANCHOR_COMMIT)).message,
    /source mismatch/u,
  );
});

const closureEntry = () => {
  const selected = selectionEntries().find(({ decisionId }) => decisionId === "AUTH-METHODS");
  return {
    decisionId: "AUTH-METHODS",
    decisionManifestSha256: selected.decisionManifestSha256,
    decisionValueSha256: selected.decisionValueSha256,
    evidenceByRequirement: {},
    evidenceCommit: digest("a").slice(0, 40),
    gateAttestations: Object.fromEntries(
      closureGatesFor("AUTH-METHODS").map((gate) => [
        gate,
        `git:${digest("a").slice(0, 40)}:${gate}.json`,
      ]),
    ),
    latestRecordDigest: selection.digest,
  };
};

test("evidence closure requires the latest pointer and unchanged selected value", () => {
  const close = {
    digest: digest("3"),
    record: {
      actor: "Adriana",
      eventType: "MATERIAL_DECISION_EVIDENCE_CLOSURE",
      payload: { entries: [closureEntry()] },
      sequence: 3,
    },
  };
  close.record.payload.entries[0].latestRecordDigest = digest("9");
  assert.match(
    capture(() => foldRecords([initialization, selection, close], manifest)).message,
    /stale/u,
  );
  close.record.payload.entries[0].latestRecordDigest = selection.digest;
  close.record.payload.entries[0].decisionValueSha256 = digest("f");
  assert.match(
    capture(() => foldRecords([initialization, selection, close], manifest)).message,
    /incomplete/u,
  );
});

test("evidence closure alone transitions a selected decision to accepted", () => {
  const close = {
    digest: digest("3"),
    record: {
      actor: "Adriana",
      eventType: "MATERIAL_DECISION_EVIDENCE_CLOSURE",
      payload: { entries: [closureEntry()] },
      sequence: 3,
    },
  };
  const state = foldRecords([initialization, selection, close], manifest);
  assert.equal(state.get("AUTH-METHODS").status, "ACCEPTED");
  assert.equal(state.get("AUTH-SDK-IOS").status, "OWNER_SELECTED_EVIDENCE_PENDING");
});

test("evidence closure requires every frozen requirement and applicable domain gate", () => {
  const fixture = buildClosureProofFixture();
  try {
    assert.doesNotThrow(() =>
      validateClosureProofs(fixture.record, fixture.subjectFiles, fixture.root, fixture.source),
    );
    const missingEvidence = clone(fixture.record);
    delete missingEvidence.payload.entries[0].evidenceByRequirement[methodRequirements[0]];
    assert.match(
      capture(() =>
        validateClosureProofs(missingEvidence, fixture.subjectFiles, fixture.root, fixture.source),
      ).message,
      /required evidence is incomplete/u,
    );
    const missingDomainGate = clone(fixture.record);
    delete missingDomainGate.payload.entries[0].gateAttestations.CAMILA_UX;
    assert.match(
      capture(() =>
        validateClosureProofs(
          missingDomainGate,
          fixture.subjectFiles,
          fixture.root,
          fixture.source,
        ),
      ).message,
      /gate inventory mismatch/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("evidence closure rejects mutable, arbitrary, or non-PASS proof references", () => {
  const fixture = buildClosureProofFixture();
  try {
    const arbitrary = clone(fixture.record);
    arbitrary.payload.entries[0].evidenceByRequirement[methodRequirements[0]] = "not-a-git-ref";
    assert.match(
      capture(() =>
        validateClosureProofs(arbitrary, fixture.subjectFiles, fixture.root, fixture.source),
      ).message,
      /not bound to evidence head/u,
    );
    const wrongHead = clone(fixture.record);
    wrongHead.payload.entries[0].gateAttestations.CATALINA_ARCHITECTURE =
      wrongHead.payload.entries[0].gateAttestations.CATALINA_ARCHITECTURE.replace(
        fixture.source,
        fixture.entry.evidenceCommit,
      );
    assert.match(
      capture(() =>
        validateClosureProofs(wrongHead, fixture.subjectFiles, fixture.root, fixture.source),
      ).message,
      /not bound to evidence head/u,
    );
    const wrongGate = clone(fixture.record);
    wrongGate.payload.entries[0].gateAttestations.CATALINA_ARCHITECTURE =
      wrongGate.payload.entries[0].gateAttestations.RENATA_INFRASTRUCTURE;
    assert.match(
      capture(() =>
        validateClosureProofs(wrongGate, fixture.subjectFiles, fixture.root, fixture.source),
      ).message,
      /not an exact-head PASS/u,
    );
    const rejectedSubject = new Map(fixture.subjectFiles);
    rejectedSubject.delete("gates/elana_exact_head.json");
    assert.match(
      capture(() =>
        validateClosureProofs(fixture.record, rejectedSubject, fixture.root, fixture.source),
      ).message,
      /absent from the frozen subject/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("revocation returns a decision to open without resurrecting prior state", () => {
  const revoke = {
    digest: digest("3"),
    record: {
      actor: "Marlon",
      eventType: "MATERIAL_DECISION_REVOCATION",
      payload: {
        entries: [
          {
            decisionId: "AUTH-METHODS",
            latestRecordDigest: selection.digest,
            reason: "owner revoked the pending value",
          },
        ],
      },
      sequence: 3,
    },
  };
  const state = foldRecords([initialization, selection, revoke], manifest);
  assert.equal(state.get("AUTH-METHODS").status, "OPEN_REQUIRES_MARLON");
  assert.equal(Object.hasOwn(state.get("AUTH-METHODS"), "valueSha256"), false);
});

test("supersession and revocation reject stale latest pointers", () => {
  for (const eventType of ["MATERIAL_DECISION_SUPERSESSION", "MATERIAL_DECISION_REVOCATION"]) {
    const entry = {
      decisionId: "AUTH-METHODS",
      latestRecordDigest: digest("9"),
    };
    if (eventType === "MATERIAL_DECISION_SUPERSESSION")
      Object.assign(
        entry,
        selectionEntries().find(({ decisionId }) => decisionId === "AUTH-METHODS"),
      );
    else entry.reason = "owner revoked the pending value";
    const candidate = {
      digest: digest("3"),
      record: { actor: "Marlon", eventType, payload: { entries: [entry] }, sequence: 3 },
    };
    assert.match(
      capture(() => foldRecords([initialization, selection, candidate], manifest)).message,
      /stale/u,
    );
  }
});

test("supersession uses an indexed changed-value manifest and rejects value replay", () => {
  const changedManifest = clone(manifest);
  changedManifest.selectionLabel = "Replace native method bundle";
  changedManifest.decisionValues = {
    "AUTH-METHODS": {
      selectedValue: {
        ...manifest.decisionValues["AUTH-METHODS"].selectedValue,
        excluded: [
          "social_oauth",
          "phone_otp",
          "passkeys",
          "magic_link_sign_in",
          "password_recovery",
        ],
      },
      selectionState: "OWNER_SELECTED_EVIDENCE_PENDING",
    },
  };
  assert.doesNotThrow(() => validateDecisionManifest(changedManifest));
  const changedDigest = sha256(Buffer.from(canonicalText(changedManifest)));
  const changedValue = changedManifest.decisionValues["AUTH-METHODS"];
  const supersede = {
    digest: digest("3"),
    record: {
      actor: "Marlon",
      eventType: "MATERIAL_DECISION_SUPERSESSION",
      payload: {
        entries: [
          {
            decisionId: "AUTH-METHODS",
            decisionManifestSha256: changedDigest,
            decisionValueSha256: sha256(Buffer.from(canonicalText(changedValue.selectedValue))),
            latestRecordDigest: selection.digest,
            selectionState: changedValue.selectionState,
          },
        ],
      },
      sequence: 3,
    },
  };
  const manifests = new Map([
    [MANIFEST_DIGEST, manifest],
    [changedDigest, changedManifest],
  ]);
  const state = foldRecords([initialization, selection, supersede], manifests);
  assert.equal(state.get("AUTH-METHODS").manifestSha256, changedDigest);
  const replay = clone(supersede);
  const original = selectionEntries().find(({ decisionId }) => decisionId === "AUTH-METHODS");
  replay.record.payload.entries[0].decisionManifestSha256 = MANIFEST_DIGEST;
  replay.record.payload.entries[0].decisionValueSha256 = original.decisionValueSha256;
  assert.match(
    capture(() => foldRecords([initialization, selection, replay], manifests)).message,
    /replays/u,
  );
});

test("subject bundle digest is independent of filesystem enumeration order", () => {
  const files = [
    { path: "z.txt", sha256: digest("a") },
    { path: "a.txt", sha256: digest("b") },
  ];
  assert.equal(subjectDigest(files), subjectDigest([...files].reverse()));
});

test("subject paths reject traversal, absolute paths, backslashes, and Git metadata", () => {
  for (const path of ["../secret", "/absolute", "folder\\file", ".git/config", "a//b"])
    assert.match(
      capture(() => validateRepositoryPath(path, "test path")).message,
      /safe repository path/u,
    );
  assert.doesNotThrow(() => validateRepositoryPath("docs/evidence.json", "test path"));
});

test("v2 bootstrap validates the fixed genesis and no selection record", () => {
  const fixture = buildBootstrapFixture();
  try {
    const result = checkAuthMaterialDecisions({
      root: fixture.root,
      base: ANCHOR_COMMIT,
      head: fixture.head,
    });
    assert.equal(result.mode, "bootstrap");
    assert.equal(result.records, 1);
    assert.equal(result.appended, 1);
    assert.equal(result.counts.OPEN, 14);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("v2 initialization is the only allowed cross-ledger reference", () => {
  const authority = {
    grantedBy: "Marlon",
    kind: "direct_material_owner_authority",
    referenceRecordDigests: [GENESIS_FOREIGN_REFERENCE],
  };
  assert.doesNotThrow(() =>
    validateAuthorityReferences(
      {
        authority: { ...authority, kind: "governance_installation" },
        eventType: "MATERIAL_DECISION_LEDGER_INITIALIZATION",
      },
      new Set(),
    ),
  );
  assert.match(
    capture(() =>
      validateAuthorityReferences(
        { authority, eventType: "MATERIAL_DECISION_SELECTION" },
        new Set(),
      ),
    ).message,
    /cross-ledger/u,
  );
});
