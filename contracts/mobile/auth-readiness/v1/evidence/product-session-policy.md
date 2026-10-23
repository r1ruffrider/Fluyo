# Native auth product and session policy candidate evidence

This document separates repository observations from proposed product choices, external blockers, and runtime evidence. Every material choice remains unapproved.

## Observed repository facts

The bound provider-neutral auth contract defines exactly 10 public states, 50 transitions, and 28 synthetic scenarios. Its copy and state-machine fixtures describe deterministic synthetic behavior. The existing web and API code provide repository context for Supabase-backed web identity, but they do not prove native SDK behavior, native recovery delivery, provider-wide revocation, or native account deletion.

## Proposed material choices

- `AUTH-METHODS`: prepare an exact enabled-method list, an explicit unsupported-flow list, reviewed recovery and action copy, bounded loading/error/recovery behavior, one-time announcements, screen-reader order, 200% text reachability, target sizing, and reduced-motion behavior.
- `AUTH-SIGNOUT-SCOPE`: retain local cleanup as the safe fallback unless a separately approved provider-wide revocation capability is proven. Any copy must disclose issued-JWT expiry limits.
- `AUTH-RECOVERY-DELIVERY`: keep recovery unavailable until a sender, template, expiry, throttling, support path, and failure contract have named custodians and evidence.
- `AUTH-REVOCATION`: use expiry-bounded wording and local cleanup as the candidate fallback until exact provider capability, retry behavior, and runtime proof exist.
- `AUTH-ACCOUNT-DELETION`: no native deletion action is available. A future candidate requires a separately selected API owner, idempotent orchestration, partial-failure recovery, an audit contract, recent reauthentication, and irreversible-consequence copy.

These are candidate directions only. They do not enable a method, choose sign-out scope, create delivery, prove revocation, or authorize deletion.

## Candidate-only objective accessibility closeout matrix

This matrix records closeout obligations only. It supplies no visible product copy, runtime result, accessibility support claim, or approval. Every accepted-copy reference and exact behavior remains unset, every platform execution remains `UNATTEMPTED`, and every requirement result remains `false`.

| Flow decision            | Platform | acceptedCopyReference | Exact focus destination and order          | Exact announcement text, live priority, and one-time count | Platform screen-reader evidence | 200% text, reflow, and action reachability                  | Minimum target dimensions and spacing           | Reduced-motion static equivalent                  | executionState | requirementsSatisfied |
| ------------------------ | -------- | --------------------- | ------------------------------------------ | ---------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------- | -------------- | --------------------- |
| `AUTH-METHODS`           | iOS      | required; unset       | required; destination and full order unset | required; text and priority unset; count must equal 1      | VoiceOver run required          | no loss; reflow and every action reachable; run unattempted | ≥44×44 pt and ≥8 pt separation; run unattempted | required for any motion; exact static state unset | UNATTEMPTED    | false                 |
| `AUTH-METHODS`           | Android  | required; unset       | required; destination and full order unset | required; text and priority unset; count must equal 1      | TalkBack run required           | no loss; reflow and every action reachable; run unattempted | ≥48×48 dp and ≥8 dp separation; run unattempted | required for any motion; exact static state unset | UNATTEMPTED    | false                 |
| `AUTH-SIGNOUT-SCOPE`     | iOS      | required; unset       | required; destination and full order unset | required; text and priority unset; count must equal 1      | VoiceOver run required          | no loss; reflow and every action reachable; run unattempted | ≥44×44 pt and ≥8 pt separation; run unattempted | required for any motion; exact static state unset | UNATTEMPTED    | false                 |
| `AUTH-SIGNOUT-SCOPE`     | Android  | required; unset       | required; destination and full order unset | required; text and priority unset; count must equal 1      | TalkBack run required           | no loss; reflow and every action reachable; run unattempted | ≥48×48 dp and ≥8 dp separation; run unattempted | required for any motion; exact static state unset | UNATTEMPTED    | false                 |
| `AUTH-RECOVERY-DELIVERY` | iOS      | required; unset       | required; destination and full order unset | required; text and priority unset; count must equal 1      | VoiceOver run required          | no loss; reflow and every action reachable; run unattempted | ≥44×44 pt and ≥8 pt separation; run unattempted | required for any motion; exact static state unset | UNATTEMPTED    | false                 |
| `AUTH-RECOVERY-DELIVERY` | Android  | required; unset       | required; destination and full order unset | required; text and priority unset; count must equal 1      | TalkBack run required           | no loss; reflow and every action reachable; run unattempted | ≥48×48 dp and ≥8 dp separation; run unattempted | required for any motion; exact static state unset | UNATTEMPTED    | false                 |
| `AUTH-REVOCATION`        | iOS      | required; unset       | required; destination and full order unset | required; text and priority unset; count must equal 1      | VoiceOver run required          | no loss; reflow and every action reachable; run unattempted | ≥44×44 pt and ≥8 pt separation; run unattempted | required for any motion; exact static state unset | UNATTEMPTED    | false                 |
| `AUTH-REVOCATION`        | Android  | required; unset       | required; destination and full order unset | required; text and priority unset; count must equal 1      | TalkBack run required           | no loss; reflow and every action reachable; run unattempted | ≥48×48 dp and ≥8 dp separation; run unattempted | required for any motion; exact static state unset | UNATTEMPTED    | false                 |
| `AUTH-ACCOUNT-DELETION`  | iOS      | required; unset       | required; destination and full order unset | required; text and priority unset; count must equal 1      | VoiceOver run required          | no loss; reflow and every action reachable; run unattempted | ≥44×44 pt and ≥8 pt separation; run unattempted | required for any motion; exact static state unset | UNATTEMPTED    | false                 |
| `AUTH-ACCOUNT-DELETION`  | Android  | required; unset       | required; destination and full order unset | required; text and priority unset; count must equal 1      | TalkBack run required           | no loss; reflow and every action reachable; run unattempted | ≥48×48 dp and ≥8 dp separation; run unattempted | required for any motion; exact static state unset | UNATTEMPTED    | false                 |

## External blockers

Marlon must make every material product choice. Named provider, delivery, support, backend, privacy, and destructive-action custodians remain required where the decision row identifies them. No external account, sender, provider setting, credential, production system, or destructive endpoint was accessed.

## Unattempted runtime

Native sign-in, confirmation, recovery, sign-out, session expiry, remote revocation, and account deletion remain unattempted. Runtime remains 0 conducted, 0 passed, 0 failed, and 24 unattempted.

## Approval-governance decision remains blocked

The current three-commit validator and a future squash-compatible record cannot be treated as interchangeable. Marlon must select one of these alternatives before any row can be accepted:

### Alternative A — preserve a special merge-commit P → A → V flow

Create a finalized reviewed packet/evidence commit `P`, an approval-record commit `A` directly after `P`, and a validation commit `V` directly after `A`, then preserve that ancestry through merge. This retains the current validator model but requires a merge path that does not squash away `P → A → V`.

### Alternative B — adopt an append-only content-addressed squash-compatible approval record

Design and separately review an append-only record whose immutable content digests bind the reviewed packet, approved value, evidence, approver, and fresh chronology even after a squash merge. The current validator does not implement or authorize this model.

The validation cutoff `2026-10-23T08:59:12Z` is closed. A future reviewed packet `P` requires fresh, non-backdated chronology and a new bounded validation clock. Neither alternative is selected. Acceptance remains blocked until Marlon chooses one and the selected mechanism receives its own exact-head review.

No field in this candidate packet is an approval record, and no CI, merge, digest, or review result substitutes for Marlon's decision.
