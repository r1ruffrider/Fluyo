#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const LEDGER_RELATIVE = "contracts/mobile/auth-readiness/v1/approval-history";
export const INSTALLATION_BASE = "0b5032b0e05539f31ad7efe1b8806ec55f5f91a2";
export const HISTORICAL_SNAPSHOT = "8ce28a7e57150ebf30499a447faee686ca50f3ce";
export const TOOLING_SOURCE = "a886b75af125b5a69e2ee3f42471ceb2700eeec1";
export const EVENT_TYPES = [
  "GOVERNANCE_SELECTION",
  "DELEGATION_GRANT",
  "DELEGATION_REVOCATION",
  "MIGRATION_SNAPSHOT",
  "REVIEW_ATTESTATION",
  "PHASE_APPROVAL",
  "TOOLING_CHANGE_AUTHORIZATION",
];
export const MATERIAL_DECISION_IDS = [
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
export const DENIED_FLAG_KEYS = [
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
export const FIXED_REVIEWERS = {
  ARCHITECTURE: "Catalina",
  SECURITY: "Natalia",
  ENVIRONMENT_AND_CI: "Renata",
  PROTECTED_CI: "GitHub Actions",
  INDEPENDENT_EXACT_HEAD_QA: "Elana",
};
const RECORD_KEYS = [
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
const PAYLOAD_KEYS = {
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
  DELEGATION_REVOCATION: ["delegationRecordDigest", "reason"],
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
};
const DIGEST = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_CONTROL_BYTES = 1024 * 1024;
const MAX_RECORD_BYTES = 1024 * 1024;

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const asObject = (value, label = "value") => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value;
};
export const asObjects = (value, label = "value") => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((item, index) => asObject(item, `${label}[${index}]`));
};
export const asStrings = (value, label = "value") => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
    throw new Error(`${label} must be strings`);
  return value;
};
const exactKeys = (value, expected) =>
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
const compareUtf8 = (left, right) => Buffer.from(left).compare(Buffer.from(right));
export const canonicalValue = (value) => {
  if (typeof value === "string") return value.normalize("NFC") === value;
  if (typeof value === "number") return Number.isSafeInteger(value);
  if (value === null || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every(canonicalValue);
  if (typeof value === "object")
    return Object.entries(value).every(
      ([key, nested]) => key.normalize("NFC") === key && canonicalValue(nested),
    );
  return false;
};
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => compareUtf8(a, b))
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
    return `[
${value.map((item) => `${"  ".repeat(depth + 1)}${renderCanonical(item, depth + 1)}`).join(",\n")}
${"  ".repeat(depth)}]`;
  }
  const entries = Object.entries(value).sort(([left], [right]) => compareUtf8(left, right));
  if (entries.length === 0) return "{}";
  return `{
${entries
  .map(([key, nested]) => {
    const label = `${JSON.stringify(key)}: `;
    return `${"  ".repeat(depth + 1)}${label}${renderCanonical(nested, depth + 1, label.length)}`;
  })
  .join(",\n")}
${"  ".repeat(depth)}}`;
};
export const canonicalText = (value) => `${renderCanonical(canonicalize(value))}\n`;
export const parseCanonicalJson = (bytes, label, maximumBytes = MAX_CONTROL_BYTES) => {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > maximumBytes)
    throw new Error(`${label} is not bounded canonical JSON`);
  if (
    (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) ||
    bytes.includes(Buffer.from("\r"))
  )
    throw new Error(`${label} is not canonical JSON`);
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} is not valid UTF-8 JSON`);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
  if (!canonicalValue(value) || text !== canonicalText(value))
    throw new Error(`${label} is not canonical JSON`);
  return value;
};
export const subjectBytes = (files) =>
  Buffer.concat(
    [...files]
      .sort((a, b) => compareUtf8(a.path, b.path))
      .flatMap(({ path, sha256: digest }) => [
        Buffer.from(path, "utf8"),
        Buffer.from([0]),
        Buffer.from(digest, "ascii"),
        Buffer.from([10]),
      ]),
  );
export const subjectDigest = (files) => sha256(subjectBytes(files));
const normalizedPath = (path) => {
  const parts = path.split("/");
  return (
    path.length > 0 &&
    !path.startsWith("/") &&
    !/^[A-Za-z]:/.test(path) &&
    !path.includes("\\") &&
    parts.every((part) => part && part !== "." && part !== "..") &&
    !path.startsWith(`${LEDGER_RELATIVE}/`)
  );
};
const gitDirectory = (root) => {
  const dotGit = resolve(root, ".git");
  const metadata = lstatSync(dotGit);
  if (metadata.isDirectory()) return dotGit;
  if (!metadata.isFile()) throw new Error("repository metadata is invalid");
  const pointer = readFileSync(dotGit, "utf8").trim();
  if (!pointer.startsWith("gitdir: ")) throw new Error("repository metadata is invalid");
  return resolve(root, pointer.slice("gitdir: ".length));
};
const gitArguments = (root, args) => [
  `--git-dir=${gitDirectory(root)}`,
  `--work-tree=${resolve(root)}`,
  ...args,
];
const git = (root, ...args) =>
  execFileSync("git", gitArguments(root, args), {
    cwd: root,
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
  }).trim();
const gitBytes = (root, ...args) =>
  execFileSync("git", gitArguments(root, args), {
    cwd: root,
    timeout: 15_000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
const gitExists = (root, ...args) => {
  try {
    execFileSync("git", gitArguments(root, args), {
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
const commitExists = (root, commit) =>
  COMMIT.test(commit) && gitExists(root, "cat-file", "-e", `${commit}^{commit}`);
const isAncestor = (root, older, newer) =>
  gitExists(root, "merge-base", "--is-ancestor", older, newer);
const readAt = (root, commit, path) => gitBytes(root, "show", `${commit}:${path}`);
const objectExists = (root, object) => gitExists(root, "cat-file", "-e", object);

const containedPath = (root, relativePath) => {
  const rootPath = resolve(root);
  const candidate = resolve(rootPath, relativePath);
  const foldedRoot = process.platform === "win32" ? rootPath.toLowerCase() : rootPath;
  const foldedCandidate = process.platform === "win32" ? candidate.toLowerCase() : candidate;
  if (!foldedCandidate.startsWith(`${foldedRoot}${sep}`))
    throw new Error("candidate file is outside the repository root");
  return candidate;
};
const assertTrackedRegularBlob = (root, commit, relativePath, label) => {
  const line = git(root, "ls-tree", commit, "--", relativePath);
  const [metadata, listedPath, extra] = line.split("\t");
  const [mode, type, object] = (metadata ?? "").split(" ");
  if (
    extra !== undefined ||
    listedPath !== relativePath ||
    mode !== "100644" ||
    type !== "blob" ||
    !/^[0-9a-f]{40,64}$/.test(object ?? "")
  )
    throw new Error(`${label} is not a regular tracked blob`);
};
const readCandidateFile = (root, commit, relativePath, label, maximumBytes) => {
  const path = containedPath(root, relativePath);
  assertTrackedRegularBlob(root, commit, relativePath, label);
  let metadata;
  try {
    metadata = lstatSync(path);
  } catch {
    throw new Error(`${label} is unavailable`);
  }
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > maximumBytes)
    throw new Error(`${label} is not a bounded regular file`);
  return readFileSync(path);
};

const resolveRef = (rootSchema, reference) => {
  if (!reference.startsWith("#/$defs/"))
    throw new Error(`schema uses unsupported ref ${reference}`);
  const target = rootSchema.$defs?.[reference.slice(8)];
  if (!target) throw new Error(`schema ref ${reference} is missing`);
  return target;
};
const schemaType = (value) =>
  value === null
    ? "null"
    : Array.isArray(value)
      ? "array"
      : Number.isInteger(value)
        ? "integer"
        : typeof value;
export function validateSchemaSubset(schema, value, rootSchema = schema, path = "$", errors = []) {
  const allowed = new Set([
    "$schema",
    "$id",
    "title",
    "$defs",
    "$ref",
    "type",
    "additionalProperties",
    "required",
    "properties",
    "enum",
    "const",
    "pattern",
    "minimum",
    "minLength",
    "minItems",
    "minProperties",
    "uniqueItems",
    "items",
    "oneOf",
    "allOf",
    "if",
    "then",
  ]);
  for (const keyword of Object.keys(schema))
    if (!allowed.has(keyword)) errors.push(`${path}: unsupported schema keyword ${keyword}`);
  if (schema.$ref)
    return validateSchemaSubset(
      resolveRef(rootSchema, schema.$ref),
      value,
      rootSchema,
      path,
      errors,
    );
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.includes(schemaType(value))) {
      errors.push(`${path}: expected ${types.join("|")}`);
      return errors;
    }
  }
  if (Object.hasOwn(schema, "const") && JSON.stringify(value) !== JSON.stringify(schema.const))
    errors.push(`${path}: const mismatch`);
  if (schema.enum && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value)))
    errors.push(`${path}: enum mismatch`);
  if (typeof value === "string") {
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value))
      errors.push(`${path}: pattern mismatch`);
    if (schema.minLength !== undefined && [...value].length < schema.minLength)
      errors.push(`${path}: too short`);
  }
  if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum)
    errors.push(`${path}: below minimum`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems)
      errors.push(`${path}: too few items`);
    if (
      schema.uniqueItems &&
      new Set(value.map((item) => JSON.stringify(item))).size !== value.length
    )
      errors.push(`${path}: duplicate items`);
    if (schema.items)
      value.forEach((item, index) =>
        validateSchemaSubset(schema.items, item, rootSchema, `${path}[${index}]`, errors),
      );
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties)
      errors.push(`${path}: too few properties`);
    for (const required of schema.required ?? [])
      if (!Object.hasOwn(value, required)) errors.push(`${path}: missing ${required}`);
    if (schema.additionalProperties === false)
      for (const key of Object.keys(value))
        if (!Object.hasOwn(schema.properties ?? {}, key)) errors.push(`${path}: unknown ${key}`);
    for (const [key, child] of Object.entries(schema.properties ?? {}))
      if (Object.hasOwn(value, key))
        validateSchemaSubset(child, value[key], rootSchema, `${path}.${key}`, errors);
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter(
      (branch) => validateSchemaSubset(branch, value, rootSchema, path, []).length === 0,
    ).length;
    if (matches !== 1) errors.push(`${path}: oneOf matched ${matches}`);
  }
  for (const branch of schema.allOf ?? [])
    validateSchemaSubset(branch, value, rootSchema, path, errors);
  if (
    schema.if &&
    validateSchemaSubset(schema.if, value, rootSchema, path, []).length === 0 &&
    schema.then
  )
    validateSchemaSubset(schema.then, value, rootSchema, path, errors);
  return errors;
}

const filesFrom = (subject) =>
  asObjects(subject.files, "subject.files").map((file) => ({
    path: String(file.path),
    sha256: String(file.sha256),
  }));
const verifySubject = (root, subject, sourceCommit, ledgerHead, reviewBase) => {
  if (!commitExists(root, sourceCommit))
    throw new Error(`subject source commit ${sourceCommit} does not exist`);
  if (sourceCommit === ledgerHead)
    throw new Error("ledger append head L must not self-reference as subject T");
  if (!isAncestor(root, sourceCommit, ledgerHead))
    throw new Error(
      `subject source ${sourceCommit} is not an ancestor of ledger head ${ledgerHead}`,
    );
  if (!commitExists(root, reviewBase) || !isAncestor(root, sourceCommit, reviewBase))
    throw new Error("subject T must be preserved by and resolvable from the pull-request base");
  const files = filesFrom(asObject(subject));
  const paths = files.map(({ path }) => path);
  if (
    JSON.stringify(paths) !== JSON.stringify([...paths].sort(compareUtf8)) ||
    new Set(paths).size !== paths.length
  )
    throw new Error("subject paths must be sorted and unique");
  for (const file of files) {
    if (!normalizedPath(file.path) || !DIGEST.test(file.sha256))
      throw new Error(`invalid subject path or digest ${file.path}`);
    const parts = file.path.split("/");
    for (let index = 1; index <= parts.length; index += 1) {
      const prefix = parts.slice(0, index).join("/");
      const line = git(root, "ls-tree", sourceCommit, "--", prefix);
      if (!line) throw new Error(`subject path missing at T: ${file.path}`);
      const [metadata] = line.split("\t");
      const [mode, type] = metadata.split(" ");
      if (mode === "120000" || (index === parts.length ? type !== "blob" : type !== "tree"))
        throw new Error(`subject path is not a regular tracked blob: ${file.path}`);
    }
    if (sha256(readAt(root, sourceCommit, file.path)) !== file.sha256)
      throw new Error(`subject digest mismatch: ${file.path}`);
  }
  if (subject.bundleSha256 !== subjectDigest(files))
    throw new Error("subject bundle digest mismatch");
  return files;
};

const validateEvent = (record, earlier, state) => {
  if (!EVENT_TYPES.includes(record.eventType))
    throw new Error(`event ${record.eventType} is denied in ledger v1`);
  const payload = asObject(record.payload, "payload");
  if (!exactKeys(payload, PAYLOAD_KEYS[record.eventType]))
    throw new Error(`${record.eventType} payload keys mismatch`);
  const authority = asObject(record.authority, "authority");
  if (
    !exactKeys(authority, ["grantedBy", "kind", "referenceRecordDigests"]) ||
    authority.grantedBy !== "Marlon"
  )
    throw new Error("authority mismatch");
  const references = asStrings(authority.referenceRecordDigests, "authority references");
  if (
    new Set(references).size !== references.length ||
    references.some((digest) => !earlier.has(digest))
  )
    throw new Error("authority references must be unique earlier records");
  if (
    [
      "GOVERNANCE_SELECTION",
      "DELEGATION_GRANT",
      "DELEGATION_REVOCATION",
      "TOOLING_CHANGE_AUTHORIZATION",
    ].includes(record.eventType) &&
    (record.actor !== "Marlon" || authority.kind !== "direct_material_owner_authority")
  )
    throw new Error("direct owner authority required");
  if (
    record.eventType === "MIGRATION_SNAPSHOT" &&
    (record.actor !== "Adriana" || authority.kind !== "administrative_migration_recording")
  )
    throw new Error("migration authority mismatch");
  if (record.eventType === "GOVERNANCE_SELECTION") {
    if (
      payload.selection !== "APPEND_ONLY_CONTENT_ADDRESSED_SQUASH_COMPATIBLE" ||
      payload.installationBaseCommit !== INSTALLATION_BASE ||
      payload.historicalSnapshotCommit !== HISTORICAL_SNAPSHOT
    )
      throw new Error("governance selection mismatch");
  }
  if (record.eventType === "DELEGATION_GRANT") {
    if (
      payload.delegate !== "Adriana" ||
      payload.scope !== state.policy.delegation.scope ||
      JSON.stringify(payload.requiredPhaseGates) !==
        JSON.stringify(state.policy.delegation.requiredPhaseGates) ||
      JSON.stringify(payload.deniedActions) !==
        JSON.stringify(state.policy.delegation.deniedActions) ||
      JSON.stringify(payload.materialDecisionIds) !== JSON.stringify(MATERIAL_DECISION_IDS)
    )
      throw new Error("delegation grant mismatch");
    state.activeDelegations.add(state.digest);
  }
  if (record.eventType === "DELEGATION_REVOCATION") {
    if (
      !state.activeDelegations.has(payload.delegationRecordDigest) ||
      state.revokedDelegations.has(payload.delegationRecordDigest)
    )
      throw new Error("revocation does not name an active grant");
    state.revokedDelegations.add(payload.delegationRecordDigest);
  }
  if (
    record.eventType === "TOOLING_CHANGE_AUTHORIZATION" &&
    classifyToolingBundle(payload.baseFiles, record) !== "base"
  )
    throw new Error("tooling authorization is not the exact historical base bundle");
  if (record.eventType === "REVIEW_ATTESTATION") {
    if (
      record.actor !== payload.reviewer ||
      (payload.outcome !== "PASS" && payload.outcome !== "FAIL")
    )
      throw new Error("review actor or outcome mismatch");
    const expectedKind =
      payload.gate === "PROTECTED_CI"
        ? "protected_ci_attestation"
        : "delegated_specialist_review_authority";
    if (authority.kind !== expectedKind) throw new Error("review authority kind mismatch");
    if (payload.gate === "DOMAIN_SPECIALIST") {
      if (typeof payload.domain !== "string" || !payload.domain)
        throw new Error("domain review requires domain");
    } else if (payload.domain !== null || FIXED_REVIEWERS[payload.gate] !== payload.reviewer)
      throw new Error("fixed gate reviewer mismatch");
    if (
      payload.reviewedHead !== record.provenance.sourceCommit ||
      payload.subjectBundleSha256 !== record.subject.bundleSha256
    )
      throw new Error("review must bind the same frozen T and subject");
    const slot = `${payload.phaseId}\0${payload.gate}\0${payload.domain ?? ""}`;
    const previous = state.latestReviews.get(slot);
    if ((previous?.digest ?? null) !== payload.supersedesReviewRecordDigest)
      throw new Error("review must explicitly supersede the latest review for its slot");
    state.latestReviews.set(slot, { digest: state.digest, record });
    state.reviews.set(state.digest, { slot, record });
  }
  if (record.eventType === "PHASE_APPROVAL") {
    if (
      record.actor !== "Adriana" ||
      authority.kind !== "delegated_credential_free_repository_authority"
    )
      throw new Error("phase authority mismatch");
    const grant = payload.delegationGrantRecordDigest;
    if (!state.activeDelegations.has(grant) || state.revokedDelegations.has(grant))
      throw new Error("phase delegation is inactive");
    if (
      payload.scope !== state.policy.delegation.scope ||
      payload.reviewedHead !== record.provenance.sourceCommit ||
      payload.subjectBundleSha256 !== record.subject.bundleSha256
    )
      throw new Error("phase T, bundle, or scope mismatch");
    const flags = asObject(payload.deniedActionFlags);
    if (
      !exactKeys(flags, DENIED_FLAG_KEYS) ||
      !Object.values(flags).every((flag) => flag === false)
    )
      throw new Error("phase denied-action flags must all remain false");
    const gateDigests = asStrings(payload.gateRecordDigests);
    const gates = gateDigests.map((digest) => {
      const review = state.reviews.get(digest);
      if (!review || state.latestReviews.get(review.slot)?.digest !== digest)
        throw new Error("phase cites stale or missing review");
      return { digest, ...review };
    });
    for (const { record: review } of gates) {
      const gate = review.payload;
      if (
        gate.outcome !== "PASS" ||
        gate.phaseId !== payload.phaseId ||
        gate.reviewedHead !== payload.reviewedHead ||
        gate.subjectBundleSha256 !== payload.subjectBundleSha256
      )
        throw new Error("phase review mismatch");
    }
    for (const category of Object.keys(FIXED_REVIEWERS))
      if (gates.filter(({ record: review }) => review.payload.gate === category).length !== 1)
        throw new Error(`phase requires exactly one ${category} gate`);
    const domains = asObjects(payload.requiredDomainGates);
    if (!domains.length) throw new Error("phase requires a nonempty domain-gate inventory");
    const domainPairs = domains.map(({ domain, reviewer }) => ({ domain, reviewer }));
    const canonicalDomainPairs = [...domainPairs].sort(
      (left, right) =>
        compareUtf8(left.domain, right.domain) || compareUtf8(left.reviewer, right.reviewer),
    );
    const citedDomainPairs = gates
      .filter(({ record: review }) => review.payload.gate === "DOMAIN_SPECIALIST")
      .map(({ record: review }) => ({
        domain: review.payload.domain,
        reviewer: review.payload.reviewer,
      }));
    if (
      new Set(domainPairs.map(({ domain }) => domain)).size !== domainPairs.length ||
      new Set(domainPairs.map((pair) => JSON.stringify(pair))).size !== domainPairs.length ||
      JSON.stringify(domainPairs) !== JSON.stringify(canonicalDomainPairs) ||
      JSON.stringify(citedDomainPairs) !== JSON.stringify(domainPairs)
    )
      throw new Error(
        "phase domain-gate inventory must exactly match cited gates in canonical order",
      );
    const elana = gates.find(
      ({ record: review }) => review.payload.gate === "INDEPENDENT_EXACT_HEAD_QA",
    );
    if (
      !elana ||
      elana.record.sequence !== Math.max(...gates.map(({ record: review }) => review.sequence)) ||
      gateDigests.at(-1) !== elana.digest
    )
      throw new Error("Elana exact-head PASS must be the greatest and final gate");
    const requiredReferences = new Set([grant, ...gateDigests]);
    if (
      references.length !== requiredReferences.size ||
      references.some((digest) => !requiredReferences.has(digest))
    )
      throw new Error("phase authority references must equal grant plus gates");
    const slot = `${payload.phaseId}\0${payload.reviewedHead}\0${payload.subjectBundleSha256}`;
    state.latestPhaseApprovals.set(slot, {
      digest: state.digest,
      grant,
      gateDigests,
      gateSlots: gates.map(({ slot: gateSlot }) => gateSlot),
      record,
    });
  }
};

export function classifyToolingBundle(filesInput, authorization) {
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
  const files = filesInput.map(({ path, sha256: digest }) => ({ path, sha256: digest }));
  if (
    JSON.stringify(files) === JSON.stringify(payload.baseFiles) &&
    subjectDigest(files) === payload.baseBundleSha256
  )
    return "base";
  if (
    JSON.stringify(files) === JSON.stringify(payload.targetFiles) &&
    subjectDigest(files) === payload.targetBundleSha256
  )
    return "target";
  return "rejected";
}

const readLedger = (root, ledgerHead) => {
  const directory = resolve(root, LEDGER_RELATIVE);
  const indexBytes = readCandidateFile(
    root,
    ledgerHead,
    `${LEDGER_RELATIVE}/index.json`,
    "approval-history index",
    MAX_CONTROL_BYTES,
  );
  const policyBytes = readCandidateFile(
    root,
    ledgerHead,
    `${LEDGER_RELATIVE}/policy.json`,
    "approval-history policy",
    MAX_CONTROL_BYTES,
  );
  const schemaBytes = readCandidateFile(
    root,
    ledgerHead,
    `${LEDGER_RELATIVE}/schema.json`,
    "approval-history schema",
    MAX_CONTROL_BYTES,
  );
  const index = parseCanonicalJson(indexBytes, "approval-history index");
  const policy = parseCanonicalJson(policyBytes, "approval-history policy");
  const schema = parseCanonicalJson(schemaBytes, "approval-history schema");
  const entries = asObjects(index.records, "index.records");
  for (let offset = 0; offset < entries.length; offset += 1) {
    const entry = entries[offset];
    if (
      !exactKeys(entry, ["sequence", "digest", "path"]) ||
      entry.sequence !== offset + 1 ||
      !DIGEST.test(entry.digest) ||
      entry.path !== `${LEDGER_RELATIVE}/records/${entry.digest}.json`
    )
      throw new Error(`record ${offset + 1} index binding mismatch`);
  }
  const records = entries.map((entry, offset) => {
    const path = entry.path;
    const bytes = readCandidateFile(
      root,
      ledgerHead,
      path,
      `record ${offset + 1}`,
      MAX_RECORD_BYTES,
    );
    return {
      entry,
      path,
      bytes,
      value: parseCanonicalJson(bytes, `record ${offset + 1}`, MAX_RECORD_BYTES),
    };
  });
  return { directory, indexBytes, policyBytes, schemaBytes, index, policy, schema, records };
};
const fixedIndexHeader = (index) =>
  Object.fromEntries(Object.entries(index).filter(([key]) => key !== "records"));

export function validateLedger(
  root,
  ledgerHead,
  reviewBase,
  trustedRoot = root,
  trustedHead = ledgerHead,
) {
  if (!commitExists(root, ledgerHead) || !commitExists(root, reviewBase))
    throw new Error("ledger head and review base must be commits");
  const ledger = readLedger(root, ledgerHead);
  const { index, policy, schema, records, schemaBytes, policyBytes, directory } = ledger;
  if (!exactKeys(index, ["schemaVersion", "ledgerId", "schemaSha256", "policySha256", "records"]))
    throw new Error("index header keys mismatch");
  if (index.schemaSha256 !== sha256(schemaBytes) || index.policySha256 !== sha256(policyBytes))
    throw new Error("index schema or policy digest mismatch");
  const bootstrap = asObject(policy.bootstrap);
  if (
    bootstrap.installationBaseCommit !== INSTALLATION_BASE ||
    bootstrap.historicalSnapshotCommit !== HISTORICAL_SNAPSHOT ||
    bootstrap.schemaSha256 !== sha256(schemaBytes)
  )
    throw new Error("policy bootstrap binding mismatch");
  const scriptBytes = readCandidateFile(
    root,
    ledgerHead,
    "scripts/check-auth-approval-history.mjs",
    "candidate validator",
    MAX_CONTROL_BYTES,
  );
  const workflowBytes = readCandidateFile(
    root,
    ledgerHead,
    ".github/workflows/auth-approval-history.yml",
    "candidate workflow",
    MAX_CONTROL_BYTES,
  );
  const trustedScriptBytes =
    trustedRoot === root
      ? scriptBytes
      : readCandidateFile(
          trustedRoot,
          trustedHead,
          "scripts/check-auth-approval-history.mjs",
          "trusted validator",
          MAX_CONTROL_BYTES,
        );
  const trustedWorkflowBytes =
    trustedRoot === root
      ? workflowBytes
      : readCandidateFile(
          trustedRoot,
          trustedHead,
          ".github/workflows/auth-approval-history.yml",
          "trusted workflow",
          MAX_CONTROL_BYTES,
        );
  if (
    !scriptBytes.equals(trustedScriptBytes) ||
    !workflowBytes.equals(trustedWorkflowBytes) ||
    bootstrap.validatorSha256 !== sha256(trustedScriptBytes) ||
    bootstrap.workflowSha256 !== sha256(trustedWorkflowBytes)
  )
    throw new Error("trusted validator or workflow digest mismatch");
  if (JSON.stringify(policy.eventTypes) !== JSON.stringify(EVENT_TYPES))
    throw new Error("policy event inventory mismatch");
  const inventory = readdirSync(resolve(directory, "records")).sort();
  if (
    JSON.stringify(inventory) !==
    JSON.stringify(records.map(({ entry }) => `${entry.digest}.json`).sort())
  )
    throw new Error("record inventory contains missing or unindexed files");
  if (records.length < bootstrap.genesisRecordCount || bootstrap.genesisRecordCount !== 4)
    throw new Error("genesis record count mismatch");
  const genesisEvents = [
    "GOVERNANCE_SELECTION",
    "DELEGATION_GRANT",
    "TOOLING_CHANGE_AUTHORIZATION",
    "MIGRATION_SNAPSHOT",
  ];
  if (
    JSON.stringify(records.slice(0, 4).map(({ value }) => value.eventType)) !==
    JSON.stringify(genesisEvents)
  )
    throw new Error("canonical genesis event sequence mismatch");
  let previous = null;
  let previousTime = 0;
  const earlier = new Set();
  const state = {
    policy,
    activeDelegations: new Set(),
    revokedDelegations: new Set(),
    reviews: new Map(),
    latestReviews: new Map(),
    latestPhaseApprovals: new Map(),
    digest: null,
  };
  records.forEach(({ entry, path, bytes, value }, offset) => {
    if (
      !exactKeys(entry, ["sequence", "digest", "path"]) ||
      entry.sequence !== offset + 1 ||
      entry.digest !== sha256(bytes) ||
      entry.path !== `${LEDGER_RELATIVE}/records/${entry.digest}.json` ||
      path !== entry.path
    )
      throw new Error(`record ${offset + 1} index binding mismatch`);
    const schemaErrors = validateSchemaSubset(schema, value);
    if (schemaErrors.length)
      throw new Error(`record ${offset + 1} schema failed: ${schemaErrors.join("; ")}`);
    if (
      !exactKeys(value, RECORD_KEYS) ||
      value.schemaVersion !== index.schemaVersion ||
      value.ledgerId !== index.ledgerId ||
      value.sequence !== offset + 1 ||
      value.previousRecordDigest !== previous
    )
      throw new Error(`record ${offset + 1} chain mismatch`);
    const time = Date.parse(value.recordedAtUtc);
    if (
      !TIMESTAMP.test(value.recordedAtUtc) ||
      new Date(time).toISOString() !== value.recordedAtUtc ||
      time < previousTime
    )
      throw new Error(`record ${offset + 1} chronology mismatch`);
    previousTime = time;
    const provenance = asObject(value.provenance);
    if (
      !exactKeys(provenance, [
        "integrityScope",
        "nonRepudiationLimitation",
        "recordedBy",
        "recordingMethod",
        "sourceCommit",
      ])
    )
      throw new Error("provenance keys mismatch");
    verifySubject(root, value.subject, provenance.sourceCommit, ledgerHead, reviewBase);
    state.digest = entry.digest;
    validateEvent(value, earlier, state);
    earlier.add(entry.digest);
    previous = entry.digest;
  });
  const effectivePhaseApprovals = [...state.latestPhaseApprovals.values()]
    .filter(
      ({ grant, gateDigests, gateSlots }) =>
        state.activeDelegations.has(grant) &&
        !state.revokedDelegations.has(grant) &&
        gateDigests.every(
          (digest, index) => state.latestReviews.get(gateSlots[index])?.digest === digest,
        ),
    )
    .map(({ digest, record }) => ({
      digest,
      phaseId: record.payload.phaseId,
      reviewedHead: record.payload.reviewedHead,
      subjectBundleSha256: record.payload.subjectBundleSha256,
    }));
  return {
    ...ledger,
    recordCount: records.length,
    tipDigest: previous,
    effectivePhaseApprovals,
  };
}

export function validateAppendOnly(root, base, head, ledger) {
  if (!commitExists(root, base) || !commitExists(root, head) || !isAncestor(root, base, head))
    throw new Error("base/head commits must exist with base ancestor of head");
  const baseIndexObject = `${base}:${LEDGER_RELATIVE}/index.json`;
  if (!objectExists(root, baseIndexObject)) {
    if (base !== INSTALLATION_BASE && !isAncestor(root, INSTALLATION_BASE, base))
      throw new Error("ledger bootstrap base must descend from the recorded installation baseline");
    if (ledger.records.length !== 4)
      throw new Error("bootstrap may contain only the four canonical genesis records");
    return { mode: "bootstrap", appended: 4 };
  }
  for (const name of ["schema.json", "policy.json"])
    if (
      !readFileSync(resolve(root, LEDGER_RELATIVE, name)).equals(
        readAt(root, base, `${LEDGER_RELATIVE}/${name}`),
      )
    )
      throw new Error(`${name} is frozen after bootstrap`);
  const baseIndex = parseCanonicalJson(
    readAt(root, base, `${LEDGER_RELATIVE}/index.json`),
    "base approval-history index",
  );
  if (
    JSON.stringify(fixedIndexHeader(ledger.index)) !== JSON.stringify(fixedIndexHeader(baseIndex))
  )
    throw new Error("fixed index header changed");
  const oldRecords = asObjects(baseIndex.records);
  if (
    ledger.records.length < oldRecords.length ||
    JSON.stringify(ledger.index.records.slice(0, oldRecords.length)) !== JSON.stringify(oldRecords)
  )
    throw new Error("record index prefix changed or was truncated");
  for (const old of oldRecords) {
    if (
      !exactKeys(old, ["sequence", "digest", "path"]) ||
      !Number.isSafeInteger(old.sequence) ||
      !DIGEST.test(old.digest) ||
      old.path !== `${LEDGER_RELATIVE}/records/${old.digest}.json`
    )
      throw new Error("base record index binding mismatch");
    const candidateBytes = readCandidateFile(
      root,
      head,
      old.path,
      `historical record ${old.sequence}`,
      MAX_RECORD_BYTES,
    );
    if (!candidateBytes.equals(readAt(root, base, old.path)))
      throw new Error(`historical record ${old.sequence} bytes changed`);
  }
  return { mode: "append", appended: ledger.records.length - oldRecords.length };
}

export function checkAuthApprovalHistory({
  root,
  base,
  head,
  trustedRoot = root,
  trustedHead = head,
}) {
  const ledger = validateLedger(root, head, base, trustedRoot, trustedHead);
  const append = validateAppendOnly(root, base, head, ledger);
  return {
    mode: append.mode,
    appended: append.appended,
    records: ledger.recordCount,
    tipDigest: ledger.tipDigest,
    effectivePhaseApprovals: ledger.effectivePhaseApprovals,
  };
}

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const base = process.env.FLUYO_APPROVAL_HISTORY_BASE;
  const root = process.env.FLUYO_APPROVAL_HISTORY_ROOT
    ? resolve(process.env.FLUYO_APPROVAL_HISTORY_ROOT)
    : defaultRoot;
  const head = process.env.FLUYO_APPROVAL_HISTORY_HEAD ?? git(root, "rev-parse", "HEAD");
  const trustedRoot = process.env.FLUYO_APPROVAL_HISTORY_TRUSTED_ROOT
    ? resolve(process.env.FLUYO_APPROVAL_HISTORY_TRUSTED_ROOT)
    : root;
  const trustedHead = process.env.FLUYO_APPROVAL_HISTORY_TRUSTED_HEAD ?? head;
  if (!base) throw new Error("FLUYO_APPROVAL_HISTORY_BASE is required");
  const result = checkAuthApprovalHistory({ root, base, head, trustedRoot, trustedHead });
  console.log(
    `Auth approval history passed: ${result.mode}, ${result.records} records, ${result.appended} appended, ${result.effectivePhaseApprovals.length} effective phase approvals, tip ${result.tipDigest}.`,
  );
}
