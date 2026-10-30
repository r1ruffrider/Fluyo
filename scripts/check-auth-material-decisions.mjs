#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const LEDGER_RELATIVE = "contracts/mobile/auth-readiness/v2/material-decision-history";
export const VALUES_RELATIVE = "contracts/mobile/auth-readiness/v2/decision-values";
export const LEDGER_ID = "fluyo-native-auth-material-decisions-v2";
export const ANCHOR_COMMIT = "6af78d83f6144cb7d89b01d7f1c748d2d3155637";
export const MANIFEST_DIGEST = "cf87faa8ac8c8a3cec1cd4ff62864cd4ad7af771b4e5734b0c6ca5b4d75c0ebf";
export const GENESIS_FOREIGN_REFERENCE =
  "7ba81df658a221c77dbe83f57057aceae2e166af73751afcf94f540c00a3cd75";
export const DECISION_IDS = [
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
export const SELECTED_IDS = [
  "AUTH-SDK-IOS",
  "AUTH-SDK-ANDROID",
  "AUTH-METHODS",
  "AUTH-SIGNOUT-SCOPE",
  "AUTH-STORAGE-IOS",
  "AUTH-STORAGE-ANDROID",
  "AUTH-REVOCATION",
];
export const DEFERRED_IDS = DECISION_IDS.filter((id) => !SELECTED_IDS.includes(id));
export const EVENT_TYPES = [
  "MATERIAL_DECISION_LEDGER_INITIALIZATION",
  "MATERIAL_DECISION_SELECTION",
  "MATERIAL_DECISION_SUPERSESSION",
  "MATERIAL_DECISION_EVIDENCE_CLOSURE",
  "MATERIAL_DECISION_REVOCATION",
];
export const FORBIDDEN_FLAGS = [
  "credentialsOrSecrets",
  "destructiveOrData",
  "domains",
  "externalAccountsOrDashboards",
  "liveAdapters",
  "nativeRuntime",
  "physicalDevices",
  "productDependencyInstallation",
  "productDependencySelection",
  "production",
  "publication",
  "signing",
  "spend",
  "storeOrRelease",
];
export const REQUIRED_CLOSURE_GATES = [
  "CATALINA_ARCHITECTURE",
  "NATALIA_SECURITY",
  "RENATA_INFRASTRUCTURE",
  "PROTECTED_CI",
  "ELANA_EXACT_HEAD",
];
export const GATE_REVIEWERS = Object.freeze({
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
export const DECISION_DOMAIN_GATES = Object.freeze({
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
export const closureGatesFor = (decisionId) => [
  ...REQUIRED_CLOSURE_GATES,
  ...(DECISION_DOMAIN_GATES[decisionId] ?? []),
];

const DIGEST = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const REPOSITORY_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/;
const GIT_REFERENCE = /^git:([0-9a-f]{40}):([A-Za-z0-9._/-]+)$/;
const MAX_BYTES = 1024 * 1024;
const compareUtf8 = (left, right) => Buffer.from(left).compare(Buffer.from(right));
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareUtf8(left, right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  return value;
};
const renderCanonical = (value, depth = 0, prefixWidth = 0) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((item) => item === null || typeof item !== "object")) {
      const inline = `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
      if (depth * 2 + prefixWidth + inline.length <= 80) return inline;
    }
    return `[\n${value
      .map((item) => `${"  ".repeat(depth + 1)}${renderCanonical(item, depth + 1)}`)
      .join(",\n")}\n${"  ".repeat(depth)}]`;
  }
  const entries = Object.entries(value).sort(([left], [right]) => compareUtf8(left, right));
  if (entries.length === 0) return "{}";
  return `{\n${entries
    .map(([key, nested]) => {
      const label = `${JSON.stringify(key)}: `;
      return `${"  ".repeat(depth + 1)}${label}${renderCanonical(nested, depth + 1, label.length)}`;
    })
    .join(",\n")}\n${"  ".repeat(depth)}}`;
};
export const canonicalText = (value) => `${renderCanonical(canonicalize(value))}\n`;
export const subjectDigest = (files) =>
  sha256(
    Buffer.concat(
      [...files]
        .sort((a, b) => compareUtf8(a.path, b.path))
        .flatMap(({ path, sha256: digest }) => [
          Buffer.from(path, "utf8"),
          Buffer.from([0]),
          Buffer.from(digest, "ascii"),
          Buffer.from([10]),
        ]),
    ),
  );
const asObject = (value, label) => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value;
};
const exactKeys = (value, keys) =>
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
export const isCanonicalTimestamp = (value) =>
  typeof value === "string" && TIMESTAMP.test(value) && new Date(value).toISOString() === value;
export const isCanonicalDate = (value) => {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};
export const validateCanonicalValue = (value, label = "canonical value") => {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") {
    if (value !== value.normalize("NFC")) throw new Error(`${label} contains a non-NFC string`);
    return;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error(`${label} contains a non-safe integer`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateCanonicalValue(item, `${label}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (key !== key.normalize("NFC")) throw new Error(`${label} contains a non-NFC key`);
      validateCanonicalValue(nested, `${label}.${key}`);
    }
    return;
  }
  throw new Error(`${label} contains a non-JSON value`);
};
export const parseCanonical = (bytes, label) => {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_BYTES)
    throw new Error(`${label} is not bounded canonical JSON`);
  if (bytes.includes(Buffer.from("\r"))) throw new Error(`${label} contains CR bytes`);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const value = JSON.parse(text);
  validateCanonicalValue(value, label);
  if (text !== canonicalText(value)) throw new Error(`${label} is not canonical JSON`);
  return value;
};

const gitDirectory = (root) => {
  const metadata = lstatSync(resolve(root, ".git"));
  if (metadata.isDirectory()) return resolve(root, ".git");
  const pointer = readFileSync(resolve(root, ".git"), "utf8").trim();
  if (!pointer.startsWith("gitdir: ")) throw new Error("repository metadata is invalid");
  return resolve(root, pointer.slice(8));
};
const gitArgs = (root, args) => [
  `--git-dir=${gitDirectory(root)}`,
  `--work-tree=${resolve(root)}`,
  ...args,
];
const git = (root, ...args) =>
  execFileSync("git", gitArgs(root, args), {
    cwd: root,
    encoding: "utf8",
    timeout: 15_000,
    windowsHide: true,
  }).trim();
const gitBytes = (root, ...args) =>
  execFileSync("git", gitArgs(root, args), {
    cwd: root,
    timeout: 15_000,
    windowsHide: true,
  });
const gitExists = (root, ...args) => {
  try {
    execFileSync("git", gitArgs(root, args), {
      cwd: root,
      stdio: "ignore",
      timeout: 15_000,
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
};
const readAt = (root, commit, path) => gitBytes(root, "show", `${commit}:${path}`);
const objectExists = (root, object) => gitExists(root, "cat-file", "-e", object);
const isAncestor = (root, older, newer) =>
  gitExists(root, "merge-base", "--is-ancestor", older, newer);
const readJsonAt = (root, commit, path, label) => parseCanonical(readAt(root, commit, path), label);

const validateBoundaries = (boundaries) => {
  asObject(boundaries, "decision manifest boundaries");
  if (
    !exactKeys(boundaries, [
      "credentialFreeDependencyEvaluation",
      "credentialFreeRepositoryWork",
      "toolchainRebaseline",
      ...FORBIDDEN_FLAGS,
    ]) ||
    boundaries.credentialFreeRepositoryWork !== true ||
    boundaries.credentialFreeDependencyEvaluation !== true ||
    boundaries.toolchainRebaseline !== true
  )
    throw new Error("decision manifest safe work boundary mismatch");
  for (const flag of FORBIDDEN_FLAGS)
    if (boundaries[flag] !== false)
      throw new Error(`decision manifest forbidden flag ${flag} must be false`);
};

const requireClosedValue = (value, keys, label) => {
  asObject(value, label);
  if (!exactKeys(value, keys)) throw new Error(`${label} keys mismatch`);
};
const requireString = (value, label) => {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a string`);
};
const requireBoolean = (value, label) => {
  if (typeof value !== "boolean") throw new Error(`${label} must be a boolean`);
};
const requireStringList = (value, label) => {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    new Set(value).size !== value.length ||
    value.some((item) => typeof item !== "string" || item.length === 0)
  )
    throw new Error(`${label} must be a nonempty unique string list`);
};
const forbiddenCapabilityKeys = new Set(
  [...FORBIDDEN_FLAGS, "productDependencySelected"].map((key) => key.toLowerCase()),
);
const secretKey =
  /(credential(?!free)|secret|password|privatekey|apikey|clientsecret|accesstoken|refreshtoken)/iu;
const secretValue =
  /(?:sk_(?:live|test)_|sbp_|-----BEGIN [A-Z ]*PRIVATE KEY-----|bearer\s+[A-Za-z0-9._~-]{8,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.)/iu;
export const validateSelectedValueSafety = (value, label = "selected value") => {
  const visit = (current, path) => {
    if (typeof current === "string") {
      if (secretValue.test(current)) throw new Error(`${path} contains secret-like material`);
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (current === null || typeof current !== "object") return;
    for (const [key, nested] of Object.entries(current)) {
      const normalized = key.replaceAll(/[^A-Za-z0-9]/gu, "").toLowerCase();
      if (secretKey.test(normalized)) throw new Error(`${path}.${key} is a secret-bearing field`);
      if (
        nested === true &&
        [...forbiddenCapabilityKeys].some(
          (capability) =>
            normalized === capability ||
            normalized === `${capability}authorized` ||
            normalized === `${capability}enabled`,
        )
      )
        throw new Error(`${path}.${key} enables a forbidden capability`);
      visit(nested, `${path}.${key}`);
    }
  };
  visit(value, label);
};

const selectedValueValidators = {
  "AUTH-AASA": (value, label) => {
    requireClosedValue(value, ["appIdentifier", "contentSha256", "hostingOwner", "path"], label);
    requireString(value.appIdentifier, `${label}.appIdentifier`);
    if (!DIGEST.test(value.contentSha256)) throw new Error(`${label}.contentSha256 is invalid`);
    requireString(value.hostingOwner, `${label}.hostingOwner`);
    validateRepositoryPath(value.path, `${label}.path`);
  },
  "AUTH-ACCOUNT-DELETION": (value, label) => {
    requireClosedValue(
      value,
      [
        "apiRoute",
        "auditBehavior",
        "idempotencyKeyScope",
        "owner",
        "partialFailureRecovery",
        "recentReauthenticationRequired",
      ],
      label,
    );
    for (const key of [
      "apiRoute",
      "auditBehavior",
      "idempotencyKeyScope",
      "owner",
      "partialFailureRecovery",
    ])
      requireString(value[key], `${label}.${key}`);
    requireBoolean(value.recentReauthenticationRequired, `${label}.recentReauthenticationRequired`);
  },
  "AUTH-ASSETLINKS": (value, label) => {
    requireClosedValue(
      value,
      ["certificateSha256", "contentSha256", "hostingOwner", "packageName", "path"],
      label,
    );
    if (!DIGEST.test(value.certificateSha256) || !DIGEST.test(value.contentSha256))
      throw new Error(`${label} digest is invalid`);
    requireString(value.hostingOwner, `${label}.hostingOwner`);
    requireString(value.packageName, `${label}.packageName`);
    validateRepositoryPath(value.path, `${label}.path`);
  },
  "AUTH-CALLBACK-DOMAINS": (value, label) => {
    requireClosedValue(
      value,
      ["confirmationRoute", "custodian", "developmentHosts", "recoveryRoute", "stagingHosts"],
      label,
    );
    requireString(value.confirmationRoute, `${label}.confirmationRoute`);
    requireString(value.custodian, `${label}.custodian`);
    requireStringList(value.developmentHosts, `${label}.developmentHosts`);
    requireString(value.recoveryRoute, `${label}.recoveryRoute`);
    requireStringList(value.stagingHosts, `${label}.stagingHosts`);
  },
  "AUTH-METHODS": (value, label) => {
    requireClosedValue(
      value,
      [
        "enabled",
        "excluded",
        "ownerVerificationAuthority",
        "recoveryControlGate",
        "unsupportedControlPolicy",
      ],
      label,
    );
    requireStringList(value.enabled, `${label}.enabled`);
    requireStringList(value.excluded, `${label}.excluded`);
    requireString(value.ownerVerificationAuthority, `${label}.ownerVerificationAuthority`);
    requireString(value.recoveryControlGate, `${label}.recoveryControlGate`);
    requireString(value.unsupportedControlPolicy, `${label}.unsupportedControlPolicy`);
  },
  "AUTH-NONPROD-CUSTODY": (value, label) => {
    requireClosedValue(
      value,
      [
        "backupCustodian",
        "incidentHandoff",
        "primaryCustodian",
        "projectReference",
        "rotationHandoff",
      ],
      label,
    );
    for (const key of Object.keys(value)) requireString(value[key], `${label}.${key}`);
  },
  "AUTH-RECOVERY-DELIVERY": (value, label) => {
    requireClosedValue(
      value,
      [
        "custodian",
        "expirySeconds",
        "failureBehavior",
        "sender",
        "supportOwner",
        "templateSha256",
        "throttlePolicy",
      ],
      label,
    );
    for (const key of ["custodian", "failureBehavior", "sender", "supportOwner", "throttlePolicy"])
      requireString(value[key], `${label}.${key}`);
    if (!Number.isSafeInteger(value.expirySeconds) || value.expirySeconds <= 0)
      throw new Error(`${label}.expirySeconds is invalid`);
    if (!DIGEST.test(value.templateSha256)) throw new Error(`${label}.templateSha256 is invalid`);
  },
  "AUTH-REVOCATION": (value, label) => {
    requireClosedValue(
      value,
      [
        "issuedJwtDisclosure",
        "localCleanupDependsOnRemote",
        "remoteRevocation",
        "runtimeProofRequired",
      ],
      label,
    );
    requireString(value.issuedJwtDisclosure, `${label}.issuedJwtDisclosure`);
    requireBoolean(value.localCleanupDependsOnRemote, `${label}.localCleanupDependsOnRemote`);
    requireString(value.remoteRevocation, `${label}.remoteRevocation`);
    requireBoolean(value.runtimeProofRequired, `${label}.runtimeProofRequired`);
  },
  "AUTH-SDK-ANDROID": (value, label) => {
    requireClosedValue(
      value,
      [
        "betaAccepted",
        "coordinate",
        "direction",
        "nativeRuntimeAuthorized",
        "productDependencyInstallationAuthorized",
        "productDependencySelected",
        "rejectedStableVersion",
        "version",
      ],
      label,
    );
    for (const key of [
      "betaAccepted",
      "nativeRuntimeAuthorized",
      "productDependencyInstallationAuthorized",
      "productDependencySelected",
    ])
      requireBoolean(value[key], `${label}.${key}`);
    if (value.coordinate !== null) requireString(value.coordinate, `${label}.coordinate`);
    requireString(value.direction, `${label}.direction`);
    requireString(value.rejectedStableVersion, `${label}.rejectedStableVersion`);
    if (value.version !== null) requireString(value.version, `${label}.version`);
  },
  "AUTH-SDK-IOS": (value, label) => {
    requireClosedValue(
      value,
      [
        "candidatePackage",
        "candidateVersion",
        "credentialFreeGraphEvaluationAuthorized",
        "minimumToolchain",
        "nativeRuntimeAuthorized",
        "productDependencyInstallationAuthorized",
        "productDependencySelected",
        "toolchainRebaselineAuthorized",
      ],
      label,
    );
    requireString(value.candidatePackage, `${label}.candidatePackage`);
    requireString(value.candidateVersion, `${label}.candidateVersion`);
    requireString(value.minimumToolchain, `${label}.minimumToolchain`);
    for (const key of [
      "credentialFreeGraphEvaluationAuthorized",
      "nativeRuntimeAuthorized",
      "productDependencyInstallationAuthorized",
      "productDependencySelected",
      "toolchainRebaselineAuthorized",
    ])
      requireBoolean(value[key], `${label}.${key}`);
  },
  "AUTH-SIGNOUT-SCOPE": (value, label) => {
    requireClosedValue(
      value,
      ["cleanupFailure", "guarantee", "issuedJwt", "remoteRevocation"],
      label,
    );
    for (const key of Object.keys(value)) requireString(value[key], `${label}.${key}`);
  },
  "AUTH-STORAGE-ANDROID": (value, label) => {
    requireClosedValue(
      value,
      [
        "accountSwitch",
        "adapter",
        "backupAllowed",
        "envelope",
        "hardwareBacked",
        "ivBits",
        "keyScope",
        "uniqueIvRequired",
      ],
      label,
    );
    for (const key of ["accountSwitch", "adapter", "envelope", "hardwareBacked", "keyScope"])
      requireString(value[key], `${label}.${key}`);
    requireBoolean(value.backupAllowed, `${label}.backupAllowed`);
    if (!Number.isSafeInteger(value.ivBits) || value.ivBits <= 0)
      throw new Error(`${label}.ivBits is invalid`);
    requireBoolean(value.uniqueIvRequired, `${label}.uniqueIvRequired`);
  },
  "AUTH-STORAGE-IOS": (value, label) => {
    requireClosedValue(
      value,
      [
        "accessibility",
        "accountSwitch",
        "adapter",
        "backupRestoreMigration",
        "envelope",
        "synchronizable",
      ],
      label,
    );
    for (const key of ["accessibility", "accountSwitch", "adapter", "envelope"])
      requireString(value[key], `${label}.${key}`);
    requireBoolean(value.backupRestoreMigration, `${label}.backupRestoreMigration`);
    requireBoolean(value.synchronizable, `${label}.synchronizable`);
  },
  "AUTH-SUPABASE-ALLOWLIST": (value, label) => {
    requireClosedValue(value, ["custodian", "redirectUrls"], label);
    requireString(value.custodian, `${label}.custodian`);
    requireStringList(value.redirectUrls, `${label}.redirectUrls`);
  },
};

export const validateSelectedValue = (decisionId, value) => {
  const label = `decision manifest ${decisionId} selected value`;
  const validator = selectedValueValidators[decisionId];
  if (!validator) throw new Error(`${label} has no closed schema`);
  validator(value, label);
  validateSelectedValueSafety(value, label);
};

export function validateDecisionManifest(manifest) {
  if (
    !exactKeys(manifest, [
      "schemaVersion",
      "selectionLabel",
      "sourceDecisionBriefSha256",
      "boundaries",
      "decisionValues",
    ]) ||
    manifest.schemaVersion !== "2.0.0" ||
    typeof manifest.selectionLabel !== "string" ||
    manifest.selectionLabel.length === 0 ||
    !DIGEST.test(manifest.sourceDecisionBriefSha256)
  )
    throw new Error("decision manifest header mismatch");
  validateBoundaries(manifest.boundaries);
  const values = asObject(manifest.decisionValues, "decision manifest decisionValues");
  const ids = Object.keys(values);
  if (ids.length === 0 || ids.some((id) => !DECISION_IDS.includes(id)))
    throw new Error("decision manifest contains no values or an unknown decision ID");
  for (const id of ids) {
    const entry = asObject(values[id], `decision manifest ${id}`);
    if (!exactKeys(entry, ["selectionState", "selectedValue"]))
      throw new Error(`decision manifest ${id} keys mismatch`);
    if (entry.selectionState === "OWNER_SELECTED_EVIDENCE_PENDING") {
      if (entry.selectedValue === null || typeof entry.selectedValue !== "object")
        throw new Error(`decision manifest ${id} selected value is missing`);
      validateSelectedValue(id, entry.selectedValue);
    } else if (entry.selectionState !== "DEFERRED_OPEN" || entry.selectedValue !== null) {
      throw new Error(`decision manifest ${id} state/value mismatch`);
    }
  }
  return manifest;
}

export function validateManifest(manifest) {
  validateDecisionManifest(manifest);
  if (
    manifest.selectionLabel !== "Approve recommended bundle" ||
    manifest.sourceDecisionBriefSha256 !==
      "e7d55724bddefb384d9e60134dae4beb4c194eb6908c45fc9c09dc8852e36c17"
  )
    throw new Error("selection manifest header mismatch");
  const values = asObject(manifest.decisionValues, "selection manifest decisionValues");
  if (JSON.stringify(Object.keys(values).sort()) !== JSON.stringify([...DECISION_IDS].sort()))
    throw new Error("selection manifest must contain exactly fourteen decision IDs");
  for (const id of DECISION_IDS) {
    const entry = values[id];
    if (SELECTED_IDS.includes(id)) {
      if (entry.selectionState !== "OWNER_SELECTED_EVIDENCE_PENDING")
        throw new Error(`selection manifest ${id} must be selected evidence pending`);
    } else if (entry.selectionState !== "DEFERRED_OPEN") {
      throw new Error(`selection manifest ${id} must remain deferred and open`);
    }
  }
  const ios = values["AUTH-SDK-IOS"].selectedValue;
  if (
    ios.minimumToolchain !== "XCODE_16_3_OR_NEWER" ||
    ios.candidatePackage !== "supabase-swift" ||
    ios.candidateVersion !== "2.55.5" ||
    ios.credentialFreeGraphEvaluationAuthorized !== true ||
    ios.productDependencySelected !== false ||
    ios.productDependencyInstallationAuthorized !== false ||
    ios.nativeRuntimeAuthorized !== false
  )
    throw new Error("iOS selection exceeds the approved evaluation direction");
  const android = values["AUTH-SDK-ANDROID"].selectedValue;
  if (
    android.direction !== "WAIT_FOR_ELIGIBLE_STABLE_FIXED_RELEASE" ||
    android.rejectedStableVersion !== "3.8.0" ||
    android.betaAccepted !== false ||
    android.coordinate !== null ||
    android.version !== null ||
    android.productDependencySelected !== false ||
    android.productDependencyInstallationAuthorized !== false ||
    android.nativeRuntimeAuthorized !== false
  )
    throw new Error("Android selection must wait for an eligible stable fixed release");
  return manifest;
}

const initialState = () =>
  new Map(DECISION_IDS.map((decisionId) => [decisionId, { decisionId, status: "OPEN" }]));
export function validateAuthorityReferences(record, earlier) {
  const authority = asObject(record.authority, "material record authority");
  const allowedForeign =
    record.eventType === "MATERIAL_DECISION_LEDGER_INITIALIZATION"
      ? new Set([GENESIS_FOREIGN_REFERENCE])
      : new Set();
  if (
    !Array.isArray(authority.referenceRecordDigests) ||
    authority.referenceRecordDigests.some(
      (digest) => !earlier.has(digest) && !allowedForeign.has(digest),
    )
  )
    throw new Error("material record contains a cross-ledger or forward reference");
}
const asManifestRegistry = (manifests) =>
  manifests instanceof Map ? manifests : new Map([[MANIFEST_DIGEST, manifests]]);
const validateSelectionEntries = (entries, manifests, requireAll) => {
  if (!Array.isArray(entries) || entries.length === 0)
    throw new Error("selection entries must be non-empty");
  const ids = entries.map((entry) => entry.decisionId);
  if (new Set(ids).size !== ids.length || ids.some((id) => !DECISION_IDS.includes(id)))
    throw new Error("selection entries contain duplicate or unknown IDs");
  if (
    requireAll &&
    (entries.length !== DECISION_IDS.length ||
      JSON.stringify([...ids].sort()) !== JSON.stringify([...DECISION_IDS].sort()))
  )
    throw new Error("initial selection must atomically include all fourteen decisions");
  for (const entry of entries) {
    const keys = requireAll
      ? ["decisionId", "decisionManifestSha256", "decisionValueSha256", "selectionState"]
      : [
          "decisionId",
          "decisionManifestSha256",
          "decisionValueSha256",
          "latestRecordDigest",
          "selectionState",
        ];
    if (!exactKeys(entry, keys))
      throw new Error(`selection entry ${entry.decisionId} keys mismatch`);
    if (!DIGEST.test(entry.decisionManifestSha256))
      throw new Error(`selection entry ${entry.decisionId} manifest digest is invalid`);
    if (requireAll && entry.decisionManifestSha256 !== MANIFEST_DIGEST)
      throw new Error("initial selection must use the frozen recommended manifest");
    const expected = manifests.get(entry.decisionManifestSha256)?.decisionValues?.[
      entry.decisionId
    ];
    if (!expected) throw new Error(`selection entry ${entry.decisionId} manifest is not indexed`);
    if (
      entry.selectionState !== expected.selectionState ||
      entry.decisionValueSha256 !== sha256(Buffer.from(canonicalText(expected.selectedValue)))
    )
      throw new Error(`selection entry ${entry.decisionId} does not match manifest`);
  }
};

export function foldRecords(records, manifestsInput) {
  const manifests = asManifestRegistry(manifestsInput);
  validateManifest(manifests.get(MANIFEST_DIGEST));
  const state = initialState();
  let initialized = false;
  const known = new Set();
  for (const { digest, record } of records) {
    if (!DIGEST.test(digest) || known.has(digest)) throw new Error("record digest is invalid");
    known.add(digest);
    if (!EVENT_TYPES.includes(record.eventType)) throw new Error("unknown material decision event");
    if (record.eventType === "MATERIAL_DECISION_LEDGER_INITIALIZATION") {
      if (initialized || record.sequence !== 1 || record.actor !== "Adriana")
        throw new Error("invalid material decision ledger initialization");
      initialized = true;
      continue;
    }
    if (!initialized) throw new Error("material decision event precedes initialization");
    const evidenceClosure = record.eventType === "MATERIAL_DECISION_EVIDENCE_CLOSURE";
    if (
      (!evidenceClosure && record.actor !== "Marlon") ||
      (evidenceClosure && record.actor !== "Adriana")
    )
      throw new Error("material decision event actor is not authorized");
    const entries = record.payload.entries;
    if (record.eventType === "MATERIAL_DECISION_SELECTION") {
      if ([...state.values()].some(({ status }) => status !== "OPEN"))
        throw new Error("initial selection may occur only once");
      validateSelectionEntries(entries, manifests, true);
      for (const entry of entries)
        state.set(entry.decisionId, {
          decisionId: entry.decisionId,
          manifestSha256: entry.decisionManifestSha256,
          status: entry.selectionState,
          latestRecordDigest: digest,
          valueSha256: entry.decisionValueSha256,
        });
      continue;
    }
    if (!Array.isArray(entries) || entries.length === 0)
      throw new Error("material decision event entries must be non-empty");
    const ids = entries.map(({ decisionId }) => decisionId);
    if (new Set(ids).size !== ids.length || ids.some((id) => !DECISION_IDS.includes(id)))
      throw new Error("material decision event contains duplicate or unknown IDs");
    for (const entry of entries) {
      const current = state.get(entry.decisionId);
      if (entry.latestRecordDigest !== current.latestRecordDigest)
        throw new Error(`stale latest record pointer for ${entry.decisionId}`);
      if (record.eventType === "MATERIAL_DECISION_SUPERSESSION") {
        validateSelectionEntries([entry], manifests, false);
        if (entry.decisionValueSha256 === current.valueSha256)
          throw new Error(`supersession replays current value for ${entry.decisionId}`);
        state.set(entry.decisionId, {
          decisionId: entry.decisionId,
          manifestSha256: entry.decisionManifestSha256,
          status: entry.selectionState,
          latestRecordDigest: digest,
          valueSha256: entry.decisionValueSha256,
        });
      } else if (record.eventType === "MATERIAL_DECISION_EVIDENCE_CLOSURE") {
        if (
          !exactKeys(entry, [
            "decisionId",
            "decisionManifestSha256",
            "decisionValueSha256",
            "evidenceByRequirement",
            "evidenceCommit",
            "gateAttestations",
            "latestRecordDigest",
          ]) ||
          current.status !== "OWNER_SELECTED_EVIDENCE_PENDING" ||
          entry.decisionManifestSha256 !== current.manifestSha256 ||
          entry.decisionValueSha256 !== current.valueSha256
        )
          throw new Error(`evidence closure is incomplete for ${entry.decisionId}`);
        state.set(entry.decisionId, {
          ...current,
          status: "ACCEPTED",
          latestRecordDigest: digest,
        });
      } else if (record.eventType === "MATERIAL_DECISION_REVOCATION") {
        if (
          !exactKeys(entry, ["decisionId", "latestRecordDigest", "reason"]) ||
          typeof entry.reason !== "string" ||
          entry.reason.length === 0
        )
          throw new Error(`revocation entry is invalid for ${entry.decisionId}`);
        state.set(entry.decisionId, {
          decisionId: entry.decisionId,
          status: "OPEN_REQUIRES_MARLON",
          latestRecordDigest: digest,
        });
      } else {
        throw new Error("unsupported material decision event");
      }
    }
  }
  if (!initialized) throw new Error("material decision ledger is not initialized");
  return state;
}

const exactReferenceSet = (actual, expected, label) => {
  if (
    !Array.isArray(actual) ||
    new Set(actual).size !== actual.length ||
    JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())
  )
    throw new Error(`${label} references mismatch`);
};
export const validateRepositoryPath = (path, label) => {
  if (
    typeof path !== "string" ||
    !REPOSITORY_PATH.test(path) ||
    path.includes("//") ||
    path.startsWith(".git/")
  )
    throw new Error(`${label} is not a safe repository path`);
};
const validateSubject = (subject, root, source, sequence) => {
  asObject(subject, `record ${sequence} subject`);
  if (!exactKeys(subject, ["bundleSha256", "files"]) || !DIGEST.test(subject.bundleSha256))
    throw new Error(`record ${sequence} subject keys mismatch`);
  if (!Array.isArray(subject.files) || subject.files.length === 0)
    throw new Error(`record ${sequence} subject files are missing`);
  const paths = [];
  const files = new Map();
  for (const file of subject.files) {
    if (!exactKeys(asObject(file, `record ${sequence} subject file`), ["path", "sha256"]))
      throw new Error(`record ${sequence} subject file keys mismatch`);
    validateRepositoryPath(file.path, `record ${sequence} subject path`);
    if (!DIGEST.test(file.sha256) || files.has(file.path))
      throw new Error(`record ${sequence} subject file digest or uniqueness mismatch`);
    const treeEntry = git(root, "ls-tree", source, "--", file.path);
    if (!/^(100644|100755) blob [0-9a-f]{40}\t/u.test(treeEntry))
      throw new Error(`record ${sequence} subject file is not a regular Git blob`);
    if (sha256(readAt(root, source, file.path)) !== file.sha256)
      throw new Error(`record ${sequence} subject file mismatch`);
    paths.push(file.path);
    files.set(file.path, file.sha256);
  }
  if (JSON.stringify(paths) !== JSON.stringify([...paths].sort(compareUtf8)))
    throw new Error(`record ${sequence} subject paths are not canonical`);
  if (subject.bundleSha256 !== subjectDigest(subject.files))
    throw new Error(`record ${sequence} subject bundle mismatch`);
  return files;
};
const referencedPath = (reference, expectedCommit, label) => {
  const match = typeof reference === "string" ? GIT_REFERENCE.exec(reference) : null;
  if (!match || match[1] !== expectedCommit)
    throw new Error(`${label} is not bound to evidence head`);
  validateRepositoryPath(match[2], label);
  return match[2];
};
const requireSubjectReference = (reference, expectedCommit, subjectFiles, root, label) => {
  const path = referencedPath(reference, expectedCommit, label);
  if (!subjectFiles.has(path)) throw new Error(`${label} is absent from the frozen subject`);
  if (sha256(readAt(root, expectedCommit, path)) !== subjectFiles.get(path))
    throw new Error(`${label} changed after its referenced commit`);
  return path;
};
const frozenDecisionPolicy = (root) => {
  const bytes = readAt(
    root,
    ANCHOR_COMMIT,
    "contracts/mobile/auth-readiness/v1/decision-policy.json",
  );
  if (sha256(bytes) !== "3e2aa6dabb4e9fe28b1b80e10f705f3df3968f85ed0e4e18ca8a0eb97ff9d696")
    throw new Error("frozen v1 decision policy digest mismatch");
  const policy = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  validateCanonicalValue(policy, "frozen v1 decision policy");
  return new Map(policy.decisions.map((decision) => [decision.id, decision]));
};
export const validateClosureProofs = (record, subjectFiles, root, source) => {
  const policy = frozenDecisionPolicy(root);
  for (const closure of record.payload.entries) {
    const decision = policy.get(closure.decisionId);
    if (!decision) throw new Error(`closure decision ${closure.decisionId} is unknown`);
    if (
      !COMMIT.test(closure.evidenceCommit) ||
      !objectExists(root, `${closure.evidenceCommit}^{commit}`) ||
      !isAncestor(root, closure.evidenceCommit, source)
    )
      throw new Error(`closure ${closure.decisionId} evidence commit is not preserved`);
    const evidence = asObject(
      closure.evidenceByRequirement,
      `closure ${closure.decisionId} evidenceByRequirement`,
    );
    if (!exactKeys(evidence, decision.requiredEvidence))
      throw new Error(`closure ${closure.decisionId} required evidence is incomplete`);
    for (const requirement of decision.requiredEvidence)
      requireSubjectReference(
        evidence[requirement],
        closure.evidenceCommit,
        subjectFiles,
        root,
        `closure ${closure.decisionId} evidence ${requirement}`,
      );
    const requiredGates = closureGatesFor(closure.decisionId);
    const gates = asObject(closure.gateAttestations, `closure ${closure.decisionId} gates`);
    if (!exactKeys(gates, requiredGates))
      throw new Error(`closure ${closure.decisionId} gate inventory mismatch`);
    const gatePaths = [];
    for (const gate of requiredGates) {
      const path = requireSubjectReference(
        gates[gate],
        source,
        subjectFiles,
        root,
        `closure ${closure.decisionId} gate ${gate}`,
      );
      gatePaths.push(path);
      const attestation = parseCanonical(
        readAt(root, source, path),
        `closure ${closure.decisionId} gate ${gate}`,
      );
      if (
        !exactKeys(attestation, [
          "decisionId",
          "decisionManifestSha256",
          "decisionValueSha256",
          "gate",
          "reviewer",
          "reviewedHead",
          "status",
        ]) ||
        attestation.decisionId !== closure.decisionId ||
        attestation.decisionManifestSha256 !== closure.decisionManifestSha256 ||
        attestation.decisionValueSha256 !== closure.decisionValueSha256 ||
        attestation.gate !== gate ||
        attestation.reviewer !== GATE_REVIEWERS[gate] ||
        attestation.reviewedHead !== closure.evidenceCommit ||
        attestation.status !== "PASS"
      )
        throw new Error(`closure ${closure.decisionId} gate ${gate} is not an exact-head PASS`);
    }
    if (new Set(gatePaths).size !== gatePaths.length)
      throw new Error(`closure ${closure.decisionId} gate attestations are not distinct`);
  }
};
export const validatePayload = (record, subjectFiles, root, source) => {
  const payload = asObject(record.payload, `record ${record.sequence} payload`);
  if (record.eventType === "MATERIAL_DECISION_LEDGER_INITIALIZATION") {
    if (
      !exactKeys(payload, [
        "anchorCommit",
        "bootstrapContainsSelectionRecord",
        "decisionManifestPath",
        "decisionManifestSha256",
        "materialSelectionMayBeRecordedAfterBootstrapMerge",
        "v1HistoricalSnapshotImmutable",
        "v1LedgerId",
        "v1TipDigestAtAnchor",
        "v1TipSequenceAtAnchor",
      ]) ||
      payload.anchorCommit !== ANCHOR_COMMIT ||
      payload.bootstrapContainsSelectionRecord !== false ||
      payload.decisionManifestPath !== `${VALUES_RELATIVE}/${MANIFEST_DIGEST}.json` ||
      payload.decisionManifestSha256 !== MANIFEST_DIGEST ||
      payload.materialSelectionMayBeRecordedAfterBootstrapMerge !== true ||
      payload.v1HistoricalSnapshotImmutable !== true ||
      payload.v1LedgerId !== "fluyo-native-auth-approval-history-v1" ||
      payload.v1TipDigestAtAnchor !==
        "cd6e350fe979c25cfbb6e659930137b681424904680b952bc10b996584d037cb" ||
      payload.v1TipSequenceAtAnchor !== 5
    )
      throw new Error("initialization payload mismatch");
    return;
  }
  if (record.eventType === "MATERIAL_DECISION_SELECTION") {
    if (
      !exactKeys(payload, [
        "entries",
        "selectionChoiceCode",
        "selectionChoiceLabel",
        "selectionRecordedDate",
        "selectionSource",
      ]) ||
      payload.selectionChoiceCode !== "APPROVE_RECOMMENDED_BUNDLE" ||
      payload.selectionChoiceLabel !== "Approve recommended bundle" ||
      payload.selectionRecordedDate !== "2026-10-30" ||
      payload.selectionSource !==
        "Marlon directly selected “Approve recommended bundle” in Codex on 2026-10-30 against the merged decision brief"
    )
      throw new Error("initial selection source mismatch");
  } else if (record.eventType === "MATERIAL_DECISION_SUPERSESSION") {
    if (
      !exactKeys(payload, [
        "entries",
        "selectionChoiceCode",
        "selectionChoiceLabel",
        "selectionRecordedDate",
        "selectionSource",
      ]) ||
      !/^[A-Z][A-Z0-9_]*$/u.test(payload.selectionChoiceCode) ||
      typeof payload.selectionChoiceLabel !== "string" ||
      payload.selectionChoiceLabel.length === 0 ||
      !isCanonicalDate(payload.selectionRecordedDate) ||
      typeof payload.selectionSource !== "string" ||
      payload.selectionSource.length === 0
    )
      throw new Error("supersession source mismatch");
  } else if (
    !exactKeys(payload, ["entries"]) ||
    !Array.isArray(payload.entries) ||
    payload.entries.length === 0
  ) {
    throw new Error(`record ${record.sequence} payload mismatch`);
  }
  for (const value of payload.entries) {
    if (value.decisionManifestSha256) {
      const path = `${VALUES_RELATIVE}/${value.decisionManifestSha256}.json`;
      if (subjectFiles.get(path) !== value.decisionManifestSha256)
        throw new Error(`record ${record.sequence} decision manifest is absent from subject`);
    }
  }
  if (record.eventType === "MATERIAL_DECISION_EVIDENCE_CLOSURE")
    validateClosureProofs(record, subjectFiles, root, source);
};

const validateRecord = (record, entry, previous, earlier, root, head) => {
  if (
    !exactKeys(record, [
      "actor",
      "authority",
      "eventType",
      "ledgerId",
      "payload",
      "previousRecordDigest",
      "provenance",
      "recordedAtUtc",
      "schemaVersion",
      "sequence",
      "subject",
    ]) ||
    record.schemaVersion !== "2.0.0" ||
    record.ledgerId !== LEDGER_ID ||
    record.sequence !== entry.sequence ||
    record.previousRecordDigest !== previous ||
    !isCanonicalTimestamp(record.recordedAtUtc) ||
    !EVENT_TYPES.includes(record.eventType) ||
    sha256(Buffer.from(canonicalText(record))) !== entry.digest
  )
    throw new Error(`record ${entry.sequence} header mismatch`);
  const authority = asObject(record.authority, `record ${entry.sequence} authority`);
  if (
    !exactKeys(authority, ["grantedBy", "kind", "referenceRecordDigests"]) ||
    authority.grantedBy !== "Marlon" ||
    !Array.isArray(authority.referenceRecordDigests) ||
    new Set(authority.referenceRecordDigests).size !== authority.referenceRecordDigests.length ||
    authority.referenceRecordDigests.some((digest) => !DIGEST.test(digest))
  )
    throw new Error(`record ${entry.sequence} authority mismatch`);
  validateAuthorityReferences(record, earlier);
  const initialization = record.eventType === "MATERIAL_DECISION_LEDGER_INITIALIZATION";
  const closure = record.eventType === "MATERIAL_DECISION_EVIDENCE_CLOSURE";
  if (
    (initialization &&
      (record.actor !== "Adriana" || authority.kind !== "governance_installation")) ||
    (closure && (record.actor !== "Adriana" || authority.kind !== "delegated_evidence_closure")) ||
    (!initialization &&
      !closure &&
      (record.actor !== "Marlon" || authority.kind !== "direct_material_owner_authority"))
  )
    throw new Error("material decision event authority mismatch");
  const provenance = asObject(record.provenance, `record ${entry.sequence} provenance`);
  if (
    !exactKeys(provenance, [
      "integrityScope",
      "nonRepudiationLimitation",
      "recordedBy",
      "recordingMethod",
      "sourceCommit",
    ]) ||
    provenance.integrityScope !== "canonical_record_bytes_and_declared_subject_bytes" ||
    provenance.nonRepudiationLimitation !==
      "repository_records_prove_integrity_and_declared_authority_after_recording_not_cryptographic_human_nonrepudiation" ||
    provenance.recordedBy !== "Adriana" ||
    provenance.recordingMethod !== "repository_governance_record"
  )
    throw new Error(`record ${entry.sequence} provenance mismatch`);
  const source = provenance.sourceCommit;
  if (
    !COMMIT.test(source) ||
    !objectExists(root, `${source}^{commit}`) ||
    !isAncestor(root, source, head)
  )
    throw new Error(`record ${entry.sequence} source commit is not preserved`);
  if (source === head)
    throw new Error(`record ${entry.sequence} cannot self-reference append head`);
  const subjectFiles = validateSubject(record.subject, root, source, entry.sequence);
  validatePayload(record, subjectFiles, root, source);
  const referencedLatest =
    initialization || record.eventType === "MATERIAL_DECISION_SELECTION"
      ? []
      : record.payload.entries.map((item) => item.latestRecordDigest);
  exactReferenceSet(
    authority.referenceRecordDigests,
    initialization ? [GENESIS_FOREIGN_REFERENCE] : referencedLatest,
    `record ${entry.sequence} authority`,
  );
};

const fixedHeader = ({ ledgerId, schemaVersion, schemaSha256, policySha256 }) => ({
  ledgerId,
  schemaVersion,
  schemaSha256,
  policySha256,
});

export function validateRepositoryLedger(root, head) {
  const index = readJsonAt(root, head, `${LEDGER_RELATIVE}/index.json`, "material index");
  const policyBytes = readAt(root, head, `${LEDGER_RELATIVE}/policy.json`);
  const schemaBytes = readAt(root, head, `${LEDGER_RELATIVE}/schema.json`);
  parseCanonical(policyBytes, "material policy");
  parseCanonical(schemaBytes, "material schema");
  if (
    !exactKeys(index, [
      "decisionValues",
      "ledgerId",
      "policySha256",
      "records",
      "schemaSha256",
      "schemaVersion",
    ]) ||
    index.ledgerId !== LEDGER_ID ||
    index.schemaVersion !== "2.0.0" ||
    index.policySha256 !== sha256(policyBytes) ||
    index.schemaSha256 !== sha256(schemaBytes)
  )
    throw new Error("material index control-plane hash mismatch");
  if (!Array.isArray(index.decisionValues) || !Array.isArray(index.records))
    throw new Error("material index arrays are missing");
  const manifests = new Map();
  for (const valueEntry of index.decisionValues) {
    if (
      !exactKeys(asObject(valueEntry, "decision value index entry"), ["digest", "path"]) ||
      !DIGEST.test(valueEntry.digest) ||
      valueEntry.path !== `${VALUES_RELATIVE}/${valueEntry.digest}.json` ||
      manifests.has(valueEntry.digest)
    )
      throw new Error("decision value index entry is invalid or duplicated");
    const bytes = readAt(root, head, valueEntry.path);
    if (sha256(bytes) !== valueEntry.digest) throw new Error("decision value digest mismatch");
    manifests.set(
      valueEntry.digest,
      validateDecisionManifest(parseCanonical(bytes, `decision value ${valueEntry.digest}`)),
    );
  }
  const manifest = validateManifest(manifests.get(MANIFEST_DIGEST));
  const listedValues = new Set(index.decisionValues.map(({ path }) => path));
  const trackedValues = git(root, "ls-tree", "-r", "--name-only", head, "--", VALUES_RELATIVE)
    .split(/\r?\n/u)
    .filter(Boolean);
  if (
    trackedValues.some((path) => !listedValues.has(path)) ||
    trackedValues.length !== listedValues.size
  )
    throw new Error("decision value index is incomplete or invalid");
  let previous = null;
  let priorTimestamp = null;
  const earlier = new Set();
  const records = index.records.map((entry, offset) => {
    if (
      !exactKeys(asObject(entry, "material record index entry"), ["digest", "path", "sequence"]) ||
      entry.sequence !== offset + 1 ||
      !DIGEST.test(entry.digest) ||
      entry.path !== `${LEDGER_RELATIVE}/records/${entry.digest}.json`
    )
      throw new Error("material record index binding mismatch");
    const bytes = readAt(root, head, entry.path);
    if (sha256(bytes) !== entry.digest) throw new Error("material record filename digest mismatch");
    const record = parseCanonical(bytes, `material record ${entry.sequence}`);
    validateRecord(record, entry, previous, earlier, root, head);
    if (priorTimestamp !== null && record.recordedAtUtc < priorTimestamp)
      throw new Error("material record chronology rolled back");
    priorTimestamp = record.recordedAtUtc;
    earlier.add(entry.digest);
    previous = entry.digest;
    return { digest: entry.digest, record };
  });
  const listedRecords = new Set(index.records.map(({ path }) => path));
  const trackedRecords = git(
    root,
    "ls-tree",
    "-r",
    "--name-only",
    head,
    "--",
    `${LEDGER_RELATIVE}/records`,
  )
    .split(/\r?\n/u)
    .filter(Boolean);
  if (trackedRecords.some((path) => !listedRecords.has(path)))
    throw new Error("unindexed material decision record exists");
  return {
    index,
    manifest,
    manifests,
    records,
    state: foldRecords(records, manifests),
    tipDigest: previous,
  };
}

export function validateAppendOnly(root, base, head, ledger) {
  if (
    !objectExists(root, `${base}^{commit}`) ||
    !objectExists(root, `${head}^{commit}`) ||
    !isAncestor(root, base, head)
  )
    throw new Error("base/head must exist with base ancestor of head");
  const baseIndexPath = `${LEDGER_RELATIVE}/index.json`;
  if (!objectExists(root, `${base}:${baseIndexPath}`)) {
    if (base !== ANCHOR_COMMIT || ledger.records.length !== 1)
      throw new Error("v2 bootstrap must descend directly from the fixed anchor with genesis only");
    if (ledger.records[0].record.eventType !== "MATERIAL_DECISION_LEDGER_INITIALIZATION")
      throw new Error("v2 bootstrap contains a material selection record");
    return { mode: "bootstrap", appended: 1 };
  }
  for (const path of [
    `${LEDGER_RELATIVE}/policy.json`,
    `${LEDGER_RELATIVE}/schema.json`,
    "scripts/check-auth-material-decisions.mjs",
    ".github/workflows/auth-material-decisions.yml",
  ])
    if (!readAt(root, head, path).equals(readAt(root, base, path)))
      throw new Error(`${path} is frozen after v2 bootstrap`);
  const baseIndex = readJsonAt(root, base, baseIndexPath, "base material index");
  if (JSON.stringify(fixedHeader(ledger.index)) !== JSON.stringify(fixedHeader(baseIndex)))
    throw new Error("material fixed index header changed");
  for (const field of ["records", "decisionValues"]) {
    const prior = baseIndex[field];
    if (
      ledger.index[field].length < prior.length ||
      JSON.stringify(ledger.index[field].slice(0, prior.length)) !== JSON.stringify(prior)
    )
      throw new Error(`material ${field} prefix changed or was truncated`);
    for (const entry of prior)
      if (!readAt(root, head, entry.path).equals(readAt(root, base, entry.path)))
        throw new Error(`historical material ${field} bytes changed`);
  }
  return { mode: "append", appended: ledger.records.length - baseIndex.records.length };
}

export function checkAuthMaterialDecisions({ root, base, head }) {
  const ledger = validateRepositoryLedger(root, head);
  const append = validateAppendOnly(root, base, head, ledger);
  const counts = [...ledger.state.values()].reduce((result, { status }) => {
    result[status] = (result[status] ?? 0) + 1;
    return result;
  }, {});
  return { ...append, records: ledger.records.length, tipDigest: ledger.tipDigest, counts };
}

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.env.FLUYO_MATERIAL_DECISIONS_ROOT
    ? resolve(process.env.FLUYO_MATERIAL_DECISIONS_ROOT)
    : defaultRoot;
  const base = process.env.FLUYO_MATERIAL_DECISIONS_BASE;
  const head = process.env.FLUYO_MATERIAL_DECISIONS_HEAD ?? git(root, "rev-parse", "HEAD");
  if (!base) throw new Error("FLUYO_MATERIAL_DECISIONS_BASE is required");
  const result = checkAuthMaterialDecisions({ root, base, head });
  console.log(
    `Auth material decisions passed: ${result.mode}, ${result.records} records, ${result.appended} appended, tip ${result.tipDigest}.`,
  );
}
