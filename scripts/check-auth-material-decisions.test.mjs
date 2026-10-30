import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ANCHOR_COMMIT,
  DECISION_DOMAIN_GATES,
  DECISION_IDS,
  DEFERRED_IDS,
  EVENT_TYPES,
  FORBIDDEN_FLAGS,
  GENESIS_FOREIGN_REFERENCE,
  GATE_REVIEWERS,
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
  validateSelectedValueSafety,
} from "./check-auth-material-decisions.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BOOTSTRAP_COMMIT = "80563fee339a07bd2ab9706b8186ed772a3b9a1a";
const SELECTION_RECORD_DIGEST = "e3a9efb3651d990fd2c3f2cea0e6bcd2456ed7107f6fefc8fe09f92909f9cae1";
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

function initializeFixtureRoot(prefix, startRef = ANCHOR_COMMIT) {
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
  git(root, "checkout", "--quiet", startRef);
  return root;
}

function buildBootstrapFixture() {
  const root = initializeFixtureRoot("fluyo-material-v2-", BOOTSTRAP_COMMIT);
  return { root, head: BOOTSTRAP_COMMIT };
}

function appendSelectionRecord(root, base, { useChildOnlySource = false } = {}) {
  writeFileSync(
    resolve(root, "docs/material-v2-fixture-note.txt"),
    "intermediate implementation commit retained by the candidate tree\n",
    "utf8",
  );
  const intermediate = commit(root, "prepare material selection append");
  const sourceCommit = useChildOnlySource ? intermediate : base;
  const indexPath = "contracts/mobile/auth-readiness/v2/material-decision-history/index.json";
  const index = JSON.parse(readFileSync(resolve(root, indexPath), "utf8"));
  const subject = {
    bundleSha256: "",
    files: [
      {
        path: `${VALUES_RELATIVE}/${MANIFEST_DIGEST}.json`,
        sha256: MANIFEST_DIGEST,
      },
    ],
  };
  subject.bundleSha256 = subjectDigest(subject.files);
  const record = {
    actor: "Marlon",
    authority: {
      grantedBy: "Marlon",
      kind: "direct_material_owner_authority",
      referenceRecordDigests: [],
    },
    eventType: "MATERIAL_DECISION_SELECTION",
    ledgerId: LEDGER_ID,
    payload: {
      entries: selectionEntries(),
      selectionChoiceCode: "APPROVE_RECOMMENDED_BUNDLE",
      selectionChoiceLabel: "Approve recommended bundle",
      selectionRecordedDate: "2026-10-30",
      selectionSource:
        "Marlon directly selected “Approve recommended bundle” in Codex on 2026-10-30 against the merged decision brief",
    },
    previousRecordDigest: index.records.at(-1).digest,
    provenance: {
      integrityScope: "canonical_record_bytes_and_declared_subject_bytes",
      nonRepudiationLimitation:
        "repository_records_prove_integrity_and_declared_authority_after_recording_not_cryptographic_human_nonrepudiation",
      recordedBy: "Adriana",
      recordingMethod: "repository_governance_record",
      sourceCommit,
    },
    recordedAtUtc: "2026-10-30T09:00:00.000Z",
    schemaVersion: "2.0.0",
    sequence: 2,
    subject,
  };
  const bytes = Buffer.from(canonicalText(record));
  const recordDigest = sha256(bytes);
  const recordPath = `contracts/mobile/auth-readiness/v2/material-decision-history/records/${recordDigest}.json`;
  writeFileSync(resolve(root, recordPath), bytes);
  index.records.push({ digest: recordDigest, path: recordPath, sequence: 2 });
  writeFileSync(resolve(root, indexPath), canonicalText(index), "utf8");
  const head = commit(root, "append atomic material selection record");
  return { base, head, intermediate, indexPath, recordDigest, recordPath };
}

function buildSelectionAppendFixture(options) {
  const bootstrap = buildBootstrapFixture();
  return {
    root: bootstrap.root,
    ...appendSelectionRecord(bootstrap.root, bootstrap.head, options),
  };
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
  for (const [gateIndex, gate] of closureGatesFor("AUTH-METHODS").entries()) {
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
        reviewer: GATE_REVIEWERS[gate],
        reviewOrdinal: gateIndex + 1,
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

function mutateGateProof(fixture, mutations, message) {
  const changedPaths = [];
  for (const [gate, mutate] of Object.entries(mutations)) {
    const reference = fixture.record.payload.entries[0].gateAttestations[gate];
    const path = reference.split(":", 3)[2];
    const attestation = JSON.parse(readFileSync(resolve(fixture.root, path), "utf8"));
    mutate(attestation);
    writeFileSync(resolve(fixture.root, path), canonicalText(attestation), "utf8");
    changedPaths.push(path);
  }
  const source = commit(fixture.root, message);
  const record = clone(fixture.record);
  for (const gate of Object.keys(record.payload.entries[0].gateAttestations)) {
    const gatePath = record.payload.entries[0].gateAttestations[gate].split(":", 3)[2];
    record.payload.entries[0].gateAttestations[gate] = `git:${source}:${gatePath}`;
  }
  const subjectFiles = new Map(fixture.subjectFiles);
  for (const path of changedPaths)
    subjectFiles.set(path, sha256(readFileSync(resolve(fixture.root, path))));
  return { record, source, subjectFiles };
}

test("v2 declares a closed fourteen-decision and five-event inventory", () => {
  assert.equal(DECISION_IDS.length, 14);
  assert.equal(new Set(DECISION_IDS).size, 14);
  assert.equal(SELECTED_IDS.length, 7);
  assert.equal(DEFERRED_IDS.length, 7);
  assert.equal(EVENT_TYPES.length, 5);
  assert.equal(LEDGER_ID, "fluyo-native-auth-material-decisions-v2");
});

test("closure gate and reviewer inventories are exact for every decision", () => {
  assert.deepEqual(DECISION_DOMAIN_GATES, {
    "AUTH-AASA": [],
    "AUTH-ACCOUNT-DELETION": ["CAMILA_UX", "DANIELA_VISUAL", "ISABELLA_CLAIMS"],
    "AUTH-ASSETLINKS": [],
    "AUTH-CALLBACK-DOMAINS": ["CAMILA_UX", "DANIELA_VISUAL"],
    "AUTH-METHODS": ["CAMILA_UX", "DANIELA_VISUAL", "ISABELLA_CLAIMS"],
    "AUTH-NONPROD-CUSTODY": ["BIANCA_RECORDS"],
    "AUTH-RECOVERY-DELIVERY": ["CAMILA_UX", "DANIELA_VISUAL", "ISABELLA_CLAIMS"],
    "AUTH-REVOCATION": ["CAMILA_UX", "DANIELA_VISUAL", "ISABELLA_CLAIMS"],
    "AUTH-SDK-ANDROID": ["GABRIELA_RESEARCH"],
    "AUTH-SDK-IOS": ["GABRIELA_RESEARCH"],
    "AUTH-SIGNOUT-SCOPE": ["CAMILA_UX", "DANIELA_VISUAL", "ISABELLA_CLAIMS"],
    "AUTH-STORAGE-ANDROID": [],
    "AUTH-STORAGE-IOS": [],
    "AUTH-SUPABASE-ALLOWLIST": [],
  });
  assert.deepEqual(GATE_REVIEWERS, {
    BIANCA_RECORDS: "Bianca Morales",
    CAMILA_UX: "Camila Reyes",
    CATALINA_ARCHITECTURE: "Catalina Moreno",
    DANIELA_VISUAL: "Daniela Vargas",
    ELANA_EXACT_HEAD: "Elana Castillo",
    GABRIELA_RESEARCH: "Gabriela Mendoza",
    ISABELLA_CLAIMS: "Isabella Navarro",
    NATALIA_SECURITY: "Natalia Ortega",
    PROTECTED_CI: "GitHub Actions",
    RENATA_INFRASTRUCTURE: "Renata Vega",
  });
  for (const decisionId of DECISION_IDS) {
    assert.equal(closureGatesFor(decisionId).at(-1), "ELANA_EXACT_HEAD");
    for (const gate of closureGatesFor(decisionId))
      assert.equal(typeof GATE_REVIEWERS[gate], "string", `${gate} reviewer must be fixed`);
  }
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
    assert.match(
      capture(() => validateManifest(candidate)).message,
      /iOS selection|forbidden capability/u,
    );
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
    assert.match(
      capture(() => validateManifest(candidate)).message,
      /Android selection|forbidden capability/u,
    );
  }
});

test("all selected values use closed per-decision schemas", () => {
  const changed = clone(manifest);
  changed.decisionValues["AUTH-SDK-IOS"].selectedValue.unreviewedField = false;
  assert.match(capture(() => validateDecisionManifest(changed)).message, /keys mismatch/u);
});

test("selected values cannot recursively enable forbidden capabilities", () => {
  for (const key of ["nativeRuntimeAuthorized", "productDependencyInstallationAuthorized"]) {
    const changed = clone(manifest);
    changed.decisionValues["AUTH-SDK-IOS"].selectedValue[key] = true;
    assert.match(
      capture(() => validateDecisionManifest(changed)).message,
      /enables a forbidden capability/u,
    );
  }
  assert.match(
    capture(() =>
      validateSelectedValueSafety({ nested: { nativeRuntime: true } }, "dangerous value"),
    ).message,
    /enables a forbidden capability/u,
  );
});

test("selected values reject secret-bearing keys and values", () => {
  assert.match(
    capture(() =>
      validateSelectedValueSafety({ nested: { credentialCanary: "not-a-secret" } }, "canary"),
    ).message,
    /secret-bearing field/u,
  );
  const changed = clone(manifest);
  changed.decisionValues["AUTH-SDK-IOS"].selectedValue.candidatePackage = [
    "sk",
    "test",
    "1234567890abcdef",
  ].join("_");
  assert.match(capture(() => validateDecisionManifest(changed)).message, /secret-like material/u);
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

test("repository records the exact atomic selection without acceptance", () => {
  const ledgerRoot = resolve(
    repoRoot,
    "contracts/mobile/auth-readiness/v2/material-decision-history",
  );
  const index = parseCanonical(readFileSync(resolve(ledgerRoot, "index.json")), "material index");
  assert.equal(index.records.length, 2);
  assert.deepEqual(index.records[1], {
    digest: SELECTION_RECORD_DIGEST,
    path: `contracts/mobile/auth-readiness/v2/material-decision-history/records/${SELECTION_RECORD_DIGEST}.json`,
    sequence: 2,
  });

  const genesis = parseCanonical(
    readFileSync(resolve(ledgerRoot, "records", `${index.records[0].digest}.json`)),
    "genesis record",
  );
  const selected = parseCanonical(
    readFileSync(resolve(ledgerRoot, "records", `${SELECTION_RECORD_DIGEST}.json`)),
    "selection record",
  );
  assert.equal(sha256(Buffer.from(canonicalText(selected))), SELECTION_RECORD_DIGEST);
  assert.equal(selected.provenance.sourceCommit, BOOTSTRAP_COMMIT);
  assert.deepEqual(
    selected.subject.files.map(({ path }) => path),
    [`${VALUES_RELATIVE}/${MANIFEST_DIGEST}.json`, "docs/NATIVE_AUTH_DECISION_BRIEF_2026-10-29.md"],
  );
  assert.equal(selected.payload.selectionChoiceCode, "APPROVE_RECOMMENDED_BUNDLE");
  assert.equal(selected.payload.selectionChoiceLabel, "Approve recommended bundle");
  assert.equal(selected.payload.selectionRecordedDate, "2026-10-30");

  const state = foldRecords(
    [
      { digest: index.records[0].digest, record: genesis },
      { digest: SELECTION_RECORD_DIGEST, record: selected },
    ],
    new Map([[MANIFEST_DIGEST, manifest]]),
  );
  assert.equal(
    [...state.values()].filter(({ status }) => status === "OWNER_SELECTED_EVIDENCE_PENDING").length,
    7,
  );
  assert.equal([...state.values()].filter(({ status }) => status === "DEFERRED_OPEN").length, 7);
  assert.equal([...state.values()].filter(({ status }) => status === "ACCEPTED").length, 0);

  const readme = readFileSync(resolve(ledgerRoot, "..", "README.md"), "utf8");
  assert.match(
    readme,
    /Live native-runtime executions remain 0; all 24 native\s+scenarios remain unattempted\./u,
  );
  assert.doesNotMatch(readme, /0 of 24 attempted/u);
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

test("evidence closure rejects a gate attested by the wrong reviewer", () => {
  const fixture = buildClosureProofFixture();
  try {
    const { record, source, subjectFiles } = mutateGateProof(
      fixture,
      { ELANA_EXACT_HEAD: (attestation) => (attestation.reviewer = "Adriana Solano") },
      "tamper with exact-head reviewer identity",
    );
    assert.match(
      capture(() => validateClosureProofs(record, subjectFiles, fixture.root, source)).message,
      /not an exact-head PASS/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("evidence closure requires unique gap-free gate order with Elana final", () => {
  const gates = closureGatesFor("AUTH-METHODS");
  const ordinal = Object.fromEntries(gates.map((gate, index) => [gate, index + 1]));
  const variants = [
    {
      label: "early Elana",
      mutations: { ELANA_EXACT_HEAD: (attestation) => (attestation.reviewOrdinal = 1) },
    },
    {
      label: "duplicate ordinal",
      mutations: {
        DANIELA_VISUAL: (attestation) => (attestation.reviewOrdinal = ordinal.CAMILA_UX),
      },
    },
    {
      label: "ordinal gap",
      mutations: {
        DANIELA_VISUAL: (attestation) => (attestation.reviewOrdinal = ordinal.DANIELA_VISUAL + 1),
      },
    },
    {
      label: "reordered fixed gates",
      mutations: {
        CATALINA_ARCHITECTURE: (attestation) =>
          (attestation.reviewOrdinal = ordinal.NATALIA_SECURITY),
        NATALIA_SECURITY: (attestation) =>
          (attestation.reviewOrdinal = ordinal.CATALINA_ARCHITECTURE),
      },
    },
  ];
  for (const variant of variants) {
    const fixture = buildClosureProofFixture();
    try {
      const { record, source, subjectFiles } = mutateGateProof(
        fixture,
        variant.mutations,
        `tamper with ${variant.label}`,
      );
      assert.match(
        capture(() => validateClosureProofs(record, subjectFiles, fixture.root, source)).message,
        /not an exact-head PASS/u,
      );
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
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

test("base-controlled validation accepts a real T-to-L append and its squash head", () => {
  const fixture = buildSelectionAppendFixture();
  try {
    const appended = checkAuthMaterialDecisions({
      root: fixture.root,
      base: fixture.base,
      head: fixture.head,
    });
    assert.equal(appended.mode, "append");
    assert.equal(appended.appended, 1);
    assert.equal(appended.records, 2);
    assert.equal(appended.counts.OWNER_SELECTED_EVIDENCE_PENDING, 7);
    assert.equal(appended.counts.DEFERRED_OPEN, 7);

    const tree = git(fixture.root, "rev-parse", `${fixture.head}^{tree}`);
    const squashHead = git(
      fixture.root,
      "commit-tree",
      tree,
      "-p",
      fixture.base,
      "-m",
      "squash material selection append",
    );
    assert.notEqual(squashHead, fixture.head);
    const squashed = checkAuthMaterialDecisions({
      root: fixture.root,
      base: fixture.base,
      head: squashHead,
    });
    assert.equal(squashed.mode, "append");
    assert.equal(squashed.appended, 1);
    assert.equal(squashed.tipDigest, fixture.recordDigest);
    const postMain = checkAuthMaterialDecisions({
      root: fixture.root,
      base: squashHead,
      head: squashHead,
    });
    assert.equal(postMain.mode, "append");
    assert.equal(postMain.appended, 0);
    assert.equal(postMain.tipDigest, fixture.recordDigest);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("append validation rejects a source T created only on the candidate branch", () => {
  const fixture = buildSelectionAppendFixture({ useChildOnlySource: true });
  try {
    assert.match(
      capture(() =>
        checkAuthMaterialDecisions({
          root: fixture.root,
          base: fixture.base,
          head: fixture.head,
        }),
      ).message,
      /source commit is not preserved by the exact base/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("append validation rejects a stale candidate after a concurrent base update", () => {
  const fixture = buildSelectionAppendFixture();
  try {
    const baseTree = git(fixture.root, "rev-parse", `${fixture.base}^{tree}`);
    const concurrentBase = git(
      fixture.root,
      "commit-tree",
      baseTree,
      "-p",
      fixture.base,
      "-m",
      "concurrent base update",
    );
    assert.match(
      capture(() =>
        checkAuthMaterialDecisions({
          root: fixture.root,
          base: concurrentBase,
          head: fixture.head,
        }),
      ).message,
      /base\/head must exist with base ancestor/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("append validation rejects index-prefix tampering", () => {
  const fixture = buildSelectionAppendFixture();
  try {
    const index = JSON.parse(readFileSync(resolve(fixture.root, fixture.indexPath), "utf8"));
    index.records[0].sequence = 2;
    writeFileSync(resolve(fixture.root, fixture.indexPath), canonicalText(index), "utf8");
    const tampered = commit(fixture.root, "tamper with material record index prefix");
    assert.match(
      capture(() =>
        checkAuthMaterialDecisions({ root: fixture.root, base: fixture.base, head: tampered }),
      ).message,
      /record index binding mismatch/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("append validation rejects an unindexed content-addressed record", () => {
  const fixture = buildSelectionAppendFixture();
  try {
    const bytes = Buffer.from(canonicalText({ unindexed: true }));
    const path = `contracts/mobile/auth-readiness/v2/material-decision-history/records/${sha256(bytes)}.json`;
    writeFileSync(resolve(fixture.root, path), bytes);
    const tampered = commit(fixture.root, "add unindexed material decision record");
    assert.match(
      capture(() =>
        checkAuthMaterialDecisions({ root: fixture.root, base: fixture.base, head: tampered }),
      ).message,
      /unindexed material decision record exists/u,
    );
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
