import assert from "node:assert/strict";
import test from "node:test";

import {
  TRANSITION_DIGEST_PREFIX,
  enumerateAcceptedTransitionIdentities,
  isTransitionIdentityKey,
  transitionIdentityDigest,
  transitionIdentityKey,
} from "./transition.mjs";

test("enumerates the 49 accepted transitions in canonical order", () => {
  const identities = enumerateAcceptedTransitionIdentities();
  assert.equal(identities.length, 49);
  assert.deepEqual(
    Object.fromEntries(
      [...new Set(identities.map((identity) => identity.entryContextId))].map((contextId) => [
        contextId,
        identities.filter((identity) => identity.entryContextId === contextId).length,
      ]),
    ),
    {
      direct_load: 15,
      client_transition: 15,
      same_screen_refresh: 15,
      connectivity_lost: 2,
      connectivity_restored: 2,
    },
  );
  assert.deepEqual(
    identities.map((identity) => identity.sequence),
    Array.from({ length: 49 }, (_, index) => index + 1),
  );
  assert.deepEqual(identities[0], {
    sequence: 1,
    scenarioId: "transition_01",
    entryContextId: "direct_load",
    sourcePresentationId: "none",
    targetPresentationId: "PREPARING",
    triggerId: "direct_load",
    transitionDigest: identities[0].transitionDigest,
    transitionKey: identities[0].transitionKey,
  });
  assert.deepEqual(identities.at(-1), {
    sequence: 49,
    scenarioId: "transition_49",
    entryContextId: "connectivity_restored",
    sourcePresentationId: "OFFLINE_READ_ONLY:offline_read_only_active",
    targetPresentationId: "ACTIVE",
    triggerId: "fresh_validation_completed",
    transitionDigest: identities.at(-1).transitionDigest,
    transitionKey: identities.at(-1).transitionKey,
  });
});

test("constructs unique stable transition digests and keys", () => {
  const identities = enumerateAcceptedTransitionIdentities();
  assert.equal(TRANSITION_DIGEST_PREFIX, "fluyo:r4a:transition:v1\n");
  assert.equal(new Set(identities.map((identity) => identity.transitionDigest)).size, 49);
  assert.equal(new Set(identities.map((identity) => identity.transitionKey)).size, 49);
  assert.equal(
    identities[0].transitionDigest,
    "e3369003bd42419f32381cc8ad851e41298e7fecaf13145648662226fed3c08f",
  );
  assert.equal(
    identities.at(-1).transitionDigest,
    "d42c429ceb655d268a614d8576f6c4cdaa5296ad3759a2770e32cd6820f7f5b6",
  );
  for (const identity of identities) {
    const closedIdentity = {
      sequence: identity.sequence,
      scenarioId: identity.scenarioId,
      entryContextId: identity.entryContextId,
      sourcePresentationId: identity.sourcePresentationId,
      targetPresentationId: identity.targetPresentationId,
      triggerId: identity.triggerId,
    };
    assert.equal(identity.transitionDigest, transitionIdentityDigest(closedIdentity));
    assert.equal(identity.transitionKey, transitionIdentityKey(closedIdentity));
    assert.equal(isTransitionIdentityKey(identity.transitionKey), true);
  }
});

test("freezes transition identities and canonical order", () => {
  const identities = enumerateAcceptedTransitionIdentities();
  const first = { ...identities[0] };
  assert.equal(Object.isFrozen(identities), true);
  assert.equal(Object.isFrozen(identities[0]), true);
  assert.throws(() => {
    identities[0].targetPresentationId = "ACTIVE";
  }, /read only/u);
  assert.throws(() => {
    identities[0] = identities[1];
  }, /read only/u);
  assert.throws(() => identities.push(identities[0]), /not extensible/u);
  assert.throws(() => identities.splice(0, 1), /read only/u);
  assert.deepEqual(identities[0], first);
  assert.equal(identities.length, 49);
  assert.equal(identities.at(-1).sequence, 49);
});

test("rejects unknown, malformed, traversal, control, oversized, and forged identities", () => {
  const accepted = enumerateAcceptedTransitionIdentities()[0];
  const identity = {
    sequence: accepted.sequence,
    scenarioId: accepted.scenarioId,
    entryContextId: accepted.entryContextId,
    sourcePresentationId: accepted.sourcePresentationId,
    targetPresentationId: accepted.targetPresentationId,
    triggerId: accepted.triggerId,
  };
  for (const mutation of [
    { sequence: 50 },
    { scenarioId: "transition_50" },
    { entryContextId: "unknown" },
    { sourcePresentationId: "../none" },
    { targetPresentationId: "ACTIVE\u0000" },
    { triggerId: "x".repeat(129) },
    { targetPresentationId: "ACTIVE" },
  ]) {
    assert.throws(
      () => transitionIdentityDigest({ ...identity, ...mutation }),
      /integer from 1|safe bounded|accepted closed/u,
    );
  }
  assert.throws(() => transitionIdentityDigest({ ...identity, extra: "forged" }), /six closed/u);
  assert.throws(
    () => enumerateAcceptedTransitionIdentities({ records: [] }),
    /does not accept caller-supplied authority/u,
  );
});

test("accepts only closed lowercase digest transition keys", () => {
  const key = enumerateAcceptedTransitionIdentities()[0].transitionKey;
  const digest = key.slice("transitions/".length, -".json".length);
  for (const invalid of [
    `transitions/${"0".repeat(64)}.json`,
    `transitions/${digest.toUpperCase()}.json`,
    `transitions/${digest}/record.json`,
    `transitions/${digest}.txt`,
    `../transitions/${digest}.json`,
    `C:/private/${digest}.json`,
  ]) {
    assert.equal(isTransitionIdentityKey(invalid), false);
  }
});
