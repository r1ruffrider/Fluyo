import { createHash } from "node:crypto";

import { loadAcceptedR4aCatalog } from "./catalog.mjs";

export const TRANSITION_DIGEST_PREFIX = "fluyo:r4a:transition:v1\n";

const TRANSITION_IDENTITY_FIELDS = Object.freeze([
  "sequence",
  "scenarioId",
  "entryContextId",
  "sourcePresentationId",
  "targetPresentationId",
  "triggerId",
]);
const ENTRY_CONTEXT_COUNTS = Object.freeze(
  new Map([
    ["direct_load", 15],
    ["client_transition", 15],
    ["same_screen_refresh", 15],
    ["connectivity_lost", 2],
    ["connectivity_restored", 2],
  ]),
);
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/u;

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireSafeId(value, field) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    throw new Error(`${field} is not a safe bounded transition identifier`);
  }
  return value;
}

function identityValues(identity) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    throw new TypeError("transition identity must be an object");
  }
  const keys = Object.keys(identity);
  if (
    keys.length !== TRANSITION_IDENTITY_FIELDS.length ||
    !TRANSITION_IDENTITY_FIELDS.every((field) => keys.includes(field))
  ) {
    throw new Error("transition identity must contain exactly the six closed fields");
  }
  if (!Number.isSafeInteger(identity.sequence) || identity.sequence < 1 || identity.sequence > 49) {
    throw new Error("transition sequence must be an integer from 1 through 49");
  }
  return [
    identity.sequence,
    ...TRANSITION_IDENTITY_FIELDS.slice(1).map((field) => requireSafeId(identity[field], field)),
  ];
}

function digestIdentityValues(values) {
  const input = `${TRANSITION_DIGEST_PREFIX}${JSON.stringify(values)}`;
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function acceptedTransitionAuthority() {
  const { catalog } = loadAcceptedR4aCatalog();
  const contract = catalog.evidence?.transitionEvidence;
  if (
    contract?.recordCount !== 49 ||
    contract?.records?.length !== 49 ||
    contract?.presentationIds?.length !== 15
  ) {
    throw new Error("accepted transition contract must contain 49 records and 15 presentations");
  }
  if (
    contract.entryContextIds.length !== ENTRY_CONTEXT_COUNTS.size ||
    !contract.entryContextIds.every(
      (entry, index) => entry === [...ENTRY_CONTEXT_COUNTS.keys()][index],
    )
  ) {
    throw new Error("accepted transition entry-context order is not closed");
  }

  const presentations = new Set(contract.presentationIds);
  if (presentations.size !== 15) {
    throw new Error("accepted transition presentation IDs must be unique");
  }
  for (const presentationId of presentations) requireSafeId(presentationId, "presentationId");

  const expectedBySequence = new Map();
  const contextCounts = new Map([...ENTRY_CONTEXT_COUNTS.keys()].map((id) => [id, 0]));
  for (const [index, record] of contract.records.entries()) {
    const sequence = index + 1;
    const identity = deepFreeze({
      sequence: record.sequence,
      scenarioId: record.scenarioId,
      entryContextId: record.entryContextId,
      sourcePresentationId: record.sourcePresentationId,
      targetPresentationId: record.targetPresentationId,
      triggerId: record.triggerId,
    });
    identityValues(identity);
    if (
      identity.sequence !== sequence ||
      identity.scenarioId !== `transition_${String(sequence).padStart(2, "0")}`
    ) {
      throw new Error("accepted transition sequence/scenario order is not canonical");
    }
    if (!ENTRY_CONTEXT_COUNTS.has(identity.entryContextId)) {
      throw new Error("accepted transition contains an unknown entry context");
    }
    if (
      !presentations.has(identity.targetPresentationId) ||
      (!presentations.has(identity.sourcePresentationId) &&
        identity.sourcePresentationId !== "none" &&
        identity.sourcePresentationId !== "current_presentation")
    ) {
      throw new Error("accepted transition contains an unknown presentation ID");
    }
    contextCounts.set(identity.entryContextId, contextCounts.get(identity.entryContextId) + 1);
    expectedBySequence.set(sequence, identity);
  }
  for (const [contextId, expectedCount] of ENTRY_CONTEXT_COUNTS) {
    if (contextCounts.get(contextId) !== expectedCount) {
      throw new Error(`accepted transition count for ${contextId} must be ${expectedCount}`);
    }
  }

  function requireAcceptedIdentity(identity) {
    const values = identityValues(identity);
    const expected = expectedBySequence.get(identity.sequence);
    if (
      !expected ||
      TRANSITION_IDENTITY_FIELDS.some((field) => identity[field] !== expected[field])
    ) {
      throw new Error("transition identity is not in the accepted closed contract");
    }
    return values;
  }

  const acceptedDigests = new Set(
    [...expectedBySequence.values()].map((identity) =>
      digestIdentityValues(identityValues(identity)),
    ),
  );
  return Object.freeze({ contract, requireAcceptedIdentity, acceptedDigests });
}

export function transitionIdentityDigest(identity) {
  const { requireAcceptedIdentity } = acceptedTransitionAuthority();
  return digestIdentityValues(requireAcceptedIdentity(identity));
}

export function transitionIdentityKey(identity) {
  return `transitions/${transitionIdentityDigest(identity)}.json`;
}

export function isTransitionIdentityKey(value) {
  if (typeof value !== "string") return false;
  const match = value.match(/^transitions\/([0-9a-f]{64})\.json$/u);
  if (!match || !LOWERCASE_SHA256.test(match[1])) return false;
  return acceptedTransitionAuthority().acceptedDigests.has(match[1]);
}

export function enumerateAcceptedTransitionIdentities(...callerArguments) {
  if (callerArguments.length !== 0) {
    throw new Error("transition enumeration does not accept caller-supplied authority");
  }
  const { contract, requireAcceptedIdentity } = acceptedTransitionAuthority();
  const identities = contract.records.map((record) => {
    const identity = {
      sequence: record.sequence,
      scenarioId: record.scenarioId,
      entryContextId: record.entryContextId,
      sourcePresentationId: record.sourcePresentationId,
      targetPresentationId: record.targetPresentationId,
      triggerId: record.triggerId,
    };
    const transitionDigest = digestIdentityValues(requireAcceptedIdentity(identity));
    return deepFreeze({
      ...identity,
      transitionDigest,
      transitionKey: `transitions/${transitionDigest}.json`,
    });
  });
  if (
    identities.length !== 49 ||
    new Set(identities.map((identity) => identity.transitionDigest)).size !== 49 ||
    new Set(identities.map((identity) => identity.transitionKey)).size !== 49
  ) {
    throw new Error("accepted transition enumeration is incomplete or contains collisions");
  }
  return deepFreeze(identities);
}
