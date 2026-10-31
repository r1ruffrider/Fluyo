# ADR 0007: Learning experience and operational boundaries

- Status: proposed
- Date: 2026-10-31
- Decision owners: product, architecture, security, UX, infrastructure, and engineering
- Extends: [ADR 0005](0005-learning-domain-ownership-and-progress.md)
- Evidence: [Duolingo public-evidence study](../research/2026-10-31_duolingo-public-evidence-study_v1.md)
- Plan: [Sprint 6 learning-experience build plan](../2026-10-31_sprint-6-learning-experience-build-plan_v1.md)

## Context

ADR 0005 established the authoritative Learning Core: server-owned catalog content, immutable activity versions, idempotent attempts, transactional progress projections, goals, streaks, preferences, and entitlement enforcement. Sprint 6 needs a calm next-activity experience and stronger operational failure isolation without allowing presentation, offline state, telemetry, or optional policy to become a second source of truth.

A lawful study of public product and engineering evidence identified general patterns worth evaluating. It did not expose a competitor's private implementation and does not authorize copying product expression, code, assets, lesson content, algorithms, metrics, or trade dress.

## Decision

Adopt an additive, dependency-safe experience boundary:

1. **Learning Core remains authoritative.** Only an ADR 0005 server-confirmed attempt transaction changes canonical progress. Client state, presentation, policy, telemetry, cache, or planner output never grants access or progress.
2. **Session Planner is optional and read-only.** Its first version returns zero or one server-derived activity reference with `reason: "next"`. Absence, disablement, invalidity, or failure uses the existing dashboard fallback.
3. **Experience projections are non-authoritative and rebuildable.** They may summarize confirmed state but cannot create learning records, entitlements, rewards, social state, or economy state.
4. **Experience Policy is static and fail-closed.** Its first version is a repository-owned closed record. The only initial switch is `LEARNING_SESSION_PLAN_ENABLED`, default false. It contains no executable content, remote component tree, endpoint, credential, stable identity, or client enable path.
5. **Operational events are typed no-op records.** The first sink retains or sends nothing. A later transport requires separate consent, purpose, retention, deletion, buffering, deduplication, privacy, security, and external-service approval.
6. **Offline starts read-only.** R0–R4 implement no offline write queue. Any future operation journal requires accepted authentication, encrypted owner-partitioned storage, idempotency, conflict UX, account-switch cleanup, and exact runtime evidence.
7. **Notification intent is delivery-independent.** Existing preferences do not imply a delivery channel. R0–R4 add no notification delivery.
8. **Optional failures cannot break core learning.** Planner, projection, policy, and sink failures preserve the existing Learning Core and safe fallback.

## R1 raw contract boundary

R1 is restricted to the seven shared files named in the dated Sprint 6 build plan. The package-internal `learning-contract-json.ts` decoder is not re-exported. Both public contracts accept raw `Uint8Array` JSON and share one immutable-snapshot boundary that measures the 1,024-byte limit, performs fatal UTF-8 decoding, rejects malformed or trailing JSON and duplicate keys after escape decoding, and constructs objects without invoking prototypes, setters, or inherited properties. Fixed failure enums disclose no input, key, offset, path, stack, identifier, or partial object.

The operational-policy evaluator validates its injected expected environment, source digest, and canonical whole-second UTC `nowUtc` before decoding the policy. It reads no global clock or process environment. The exact evaluation order and all closed types, prohibited paths, dependency edges, bounds, production rejection, and tests are specified in the dated plan; R1 adds no runtime consumer.

## State model

The experience state machine is closed:

```text
PREPARING → ACTIVE | EMPTY_REVIEW | ACCESS_BLOCKED | RETRYABLE_ERROR | SESSION_ENDED | OFFLINE_READ_ONLY
ACTIVE → SUBMITTING | ACCESS_BLOCKED | SESSION_ENDED | OFFLINE_READ_ONLY
SUBMITTING → CONFIRMED | RETRYABLE_ERROR | STALE_CONTENT | ACCESS_BLOCKED | SESSION_ENDED | OFFLINE_READ_ONLY
CONFIRMED → ACTIVE | EMPTY_REVIEW | finished
RETRYABLE_ERROR → SUBMITTING | safe exit
STALE_CONTENT → PREPARING | safe exit
SESSION_ENDED → internal sign-in → allowlisted learning destination after identity confirmation
ACCESS_BLOCKED → learning home or server-filtered curriculum
EMPTY_REVIEW → server-selected next available activity | learning home
OFFLINE_READ_ONLY → PREPARING | safe exit
```

Only `CONFIRMED` may display a progress change that the server has already committed. A retry uses the same idempotency key. Duplicate submission is blocked. Late responses after exit, authentication-generation change, or content-version change are discarded.

`SESSION_ENDED`, `ACCESS_BLOCKED`, and `EMPTY_REVIEW` use the exact user copy, primary actions, preservation, safe destinations, focus, one-time announcement, and no-mutation rules in the dated Sprint 6 build plan. Session loss clears or fences auth-bound work and retains no owner-bound client state or unconfirmed answer across the signed-out boundary. Access denial preserves authentication. Empty review never fabricates a review item or completion. Entering, displaying, acting on, or leaving any of these states cannot award or mutate progress.

## Security and privacy boundary

- Owner, age capability, authorization, entitlement, attempts, progress, rewards, social relationships, experiment assignment, notification eligibility, and deletion state remain server-owned.
- Every future mutation requires owner binding, authorization, idempotency, versioning, stale-result rejection, and generation/write fencing.
- Child or unknown cohorts default to no social, public ranking, profiling, targeted ads, purchase pressure, or notification pressure.
- Operational records exclude identity, owner/profile/activity/lesson IDs, answer or free text, email, token, code, URL/query, provider payload, device/install ID, accessibility setting, correlation ID, file path, and raw exception/stack.
- Optional kill switches stop optional collection and processing as well as UI.
- R0–R3 introduce no hosted analytics, crash reporter, remote flag provider, credential, external account, domain, signing, store, production, or spending action.

## UX and visual boundary

The original Fluyo direction is Conversation Canvas, using the accepted paper/ink/cobalt/coral/sun/mint language. It must not recreate Duolingo's game board, characters, reward language, motion, or composition.

The first approved design sequence is setup, editable goal, start from beginning, prepare, answer, check, confirmed feedback, continue/finish, and confirmed progress. Placement, audio, reminders, social, competition, economy, ads, purchases, experiments, offline writes, native learning, and downloadable content remain deferred.

The later web implementation must satisfy one-scroll reading order, 44px minimum targets, 16px inputs, 200% text reflow, named/value progress, deterministic focus/announcements, non-color state, and bounded interruptible motion with a static reduced-motion equivalent. It requires an accepted dated design specification before implementation.

## Operational and rollback boundary

- A planner exception falls back to the existing dashboard.
- An experience-projection exception omits the optional presentation.
- Missing, stale, malformed, expired, or build-incompatible policy disables the optional feature.
- A no-op sink exception cannot change the learner result.
- Cache owner/version mismatch purges the optional cache.
- Invalid catalog candidates preserve the last-known-good published catalog pointer.
- Rollback first disables the optional path, verifies Learning Core health and idempotency, and then reverts the application commit if required.
- R1 has no database migration, so it has no database down migration.

## Rollout

- **R0:** evidence, this ADR, dated build plan, repository links, regression test.
- **R1:** shared closed contracts only; no API, DB, UI, dependency, SDK, or workflow change.
- **R2:** read-only zero-or-one planner with dashboard fallback.
- **R3:** static default-disabled policy, typed no-op sink, failure isolation, rollback drill.
- **R4-A:** accepted UX/visual/Break-UI design specification.
- **R4-B:** web-only original Conversation Canvas implementation with runtime evidence.

Every phase uses a separate small pull request. R1 may begin only after R0 merges, all post-main checks pass, and ADR 0007 is recorded as accepted at an exact head reviewed by the required specialists and Elana. R1 implements only the shared files and closed contracts named above.

## Alternatives considered

1. **Copy a mature competitor's product loop or visual expression.** Rejected: public evidence does not license proprietary expression and a clone would violate Fluyo's originality and claim boundaries.
2. **Add a general remote-UI or hosted flag system first.** Rejected: it expands attack surface, external dependencies, privacy, and rollback complexity before a proven need.
3. **Make the client planner or offline cache authoritative.** Rejected: it conflicts with ADR 0005, owner isolation, idempotency, and explainable progress.
4. **Build social/economy mechanics for retention first.** Rejected: product, child-safety, fairness, privacy, moderation, and coercion decisions are not accepted.
5. **Keep all experience selection inside the dashboard component.** Rejected for later phases because a small read-only contract improves testing and failure isolation, but it remains the R2 fallback until proven.

## Consequences

- The first implementation is intentionally narrow and reversible.
- The repository gains explicit authority, failure, privacy, originality, UX, measurement, and rollback boundaries before code.
- R1 can be tested with zero database, API, UI, dependency, or external-service delta.
- Later phases require more specialist and runtime evidence, not merely acceptance of this ADR.
- The broad Sprint 6 roadmap remains incomplete until its separately gated items pass.

## Deferred decisions

Placement; audio and microphone data; reminders and delivery; child/guardian policy; social graph, quests, rankings, and moderation; streak recovery and economy; advertising and purchases; experiments; offline writes and conflict resolution; native learning; downloadable content; hosted telemetry/crash/flag vendors; performance targets; production rollout; signing; stores; spending; and public claims.

## Recheck triggers

Re-open this decision when a mutation path changes authority, an optional module becomes required, offline writes are proposed, a hosted/provider dependency is introduced, collected fields change, a UI or native client is added, a public claim is drafted, or ADR 0005 authority changes.
