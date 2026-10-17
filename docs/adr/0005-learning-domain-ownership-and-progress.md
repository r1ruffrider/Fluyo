# ADR 0005: Learning-domain ownership and progress writes

- Status: proposed
- Date: 2026-10-17
- Decision owners: product and engineering
- Related: [ADR 0002](0002-minimal-user-profile.md), [ADR 0003](0003-forge-compatible-billing-foundation.md), [ADR 0004](0004-native-mobile-app-architecture.md)

## Context

Sprint 4 introduces the first durable learning data shared by the web application and future native clients. The model must support curated lessons, activities, phrase decks, cross-session progress, streaks, goals, and notification preferences without creating a second identity directory or allowing clients to award their own progress or access.

Activity completion is retryable across unreliable networks. A duplicate request must not create a second attempt, advance progress twice, or inflate a streak. Published content also needs stable versions so historical attempts remain explainable after editorial changes.

## Considered options

1. Keep progress in browser storage. This is fast, but it cannot provide cross-device ownership, reliable reload behavior, or a canonical mobile contract.
2. Store only a mutable completion counter. This is simple, but duplicate writes and content changes cannot be audited or reconstructed safely.
3. Store server-owned catalog content, an append-only attempt record, and transactionally maintained user projections. This adds schema and service work, but gives every client one owned source of truth and makes retries deterministic.

## Proposed decision

Adopt option 3.

- Supabase remains the identity provider. Every user-owned row stores the verified JWT subject as `user_id`; request bodies and paths never select another owner. This is a logical identity reference, not a local credential directory.
- Lessons, activities, phrase decks, and phrases are server-managed catalog records. Client APIs are read-only for catalog content.
- An activity has a stable identity and separately stored immutable versions. Each published version has an integer `content_version`; material editorial changes create a new version and update the activity's published-version pointer. Attempts reference the exact version they received. Wording and feedback revisions preserve completion of the stable activity; a changed learning objective requires a new activity identity.
- Each completion request carries a UUID `Idempotency-Key`. The API stores the verified user, activity, normalized request hash, response, and result under a unique owner/key constraint. Existing owner/key lookup precedes rate limiting: the same normalized request returns the original result and a changed payload returns `409 idempotency_conflict`, neither consuming limiter capacity. Only a new key reaches the limiter before any write.
- An activity attempt, lesson-progress projection, and practice-day projection update in one database transaction. The server clock is authoritative.
- A learning-preferences row holds the user's IANA timezone. It defaults deterministically to `UTC` when the first learning write occurs before a preference is saved. A practice day is recorded on the first completed activity for the effective timezone. The current streak is the consecutive sequence ending on the current or immediately previous local date, so it does not disappear before the learner has had a chance to practice that day. Timezone changes apply only to future practice days.
- Goals initially use a daily completed-activity target from 1 through 20. Notification preferences store a practice-reminder toggle and local time, resolved against the learning timezone. Sprint 4 stores and displays the preference but does not claim that a delivery channel exists.
- Catalog resources may carry a nullable `required_entitlement_key`. `null` means the resource is available to the authenticated learner. Any non-null value is enforced by the API through the existing server-side entitlement service; client state never grants access.
- Stable domain errors extend the existing API exception boundary through an allowlisted domain exception type. Known resource, version, idempotency, and rate-limit failures retain safe machine codes; unknown exceptions still collapse to `internal_error`.
- Authenticated activity submissions are limited to 30 requests per rolling 60 seconds per verified user. Rejected requests return `429 rate_limited` plus `Retry-After` and do not write attempts or projections. Sprint 4 provides a replaceable limiter contract and local adapter; a shared deployed adapter is a production prerequisite.

## Proposed records

| Record                       | Ownership and purpose                                       | Key constraints                                         |
| ---------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| `lessons`                    | Server-managed lesson metadata and order                    | unique `slug`; nullable `archived_at`                   |
| `activities`                 | Stable server-managed activity identity and lesson order    | unique lesson/order; nullable published-version number  |
| `activity_versions`          | Immutable prompt, choices, feedback, and validation data    | unique activity/version; publication timestamp          |
| `phrase_decks` and `phrases` | Server-managed reusable bilingual phrase content            | unique deck slug and deck/order                         |
| `lesson_phrase_decks`        | Server-managed lesson-to-deck membership                    | unique lesson/deck                                      |
| `activity_attempts`          | User attempt, exact version, and idempotent response source | unique user/idempotency key; indexed user/activity/time |
| `lesson_progress`            | User projection for next activity and completion            | unique user/lesson; indexed user/update time            |
| `practice_days`              | User projection for daily goal and streak calculation       | unique user/local date                                  |
| `learning_goals`             | One current daily target per user                           | unique user; target check 1–20                          |
| `learning_preferences`       | User timezone used for practice-day boundaries              | unique user; validated IANA zone; default UTC           |
| `notification_preferences`   | One practice-reminder preference per user                   | unique user; validated local time                       |

Exact columns, PostgreSQL constraints, and indexes remain reviewable in the migration. Prisma names may use TypeScript conventions while database names follow `PLATFORM_STANDARDS.md`.

The migration must enforce a composite relationship from an activity's `(id, published_version)` to an `activity_versions(activity_id, version)` row belonging to that activity. Draft activities may have no published version. Attempts hold a foreign key to the immutable activity-version row. Lesson progress completes stable activity IDs, so a wording/feedback revision does not erase progress; a new learning objective creates a new stable activity ID.

## Retention and deletion

- Published catalog versions are archived instead of destructively rewritten when historical attempts refer to them.
- User attempts, projections, goals, and preferences are retained while the account exists. Sprint 4 adds a provider-neutral learning-data lifecycle service that exports those owned records and deletes them together in a controlled transaction. The future account export/deletion workflow must call this service before production release; catalog content remains.
- Lifecycle integration tests prove a complete export, complete deletion, idempotent retry, rollback on failure, and isolation from another user's learning, profile, and billing rows.
- Sprint 4 stores no raw audio, video, transcript, contact list, device token, or free-form sensitive answer.
- Telemetry uses `learning.dashboard.loaded`, `learning.attempt.processed`, `learning.progress.updated`, `learning.goal.updated`, `learning.preference.updated`, and `learning.lifecycle.processed`. Allowed fields are correlation ID, internal record IDs, duration, and enumerated outcome such as `empty`, `ready`, `correct`, `incorrect`, `duplicate`, `conflict`, `denied`, or `failed`. Counters track attempt outcomes, duplicate replays, conflicts, rate limits, and failures; a duration histogram covers dashboard reads and attempt processing. Logs and metrics exclude answer text, tokens, email addresses, provider payloads, and unbounded user input.

## Consequences

- Web, iOS, and Android can share stable `/api/v1` contracts and server-owned progress.
- Retry and replay behavior is deterministic and testable.
- Projections improve dashboard reads but must update only through the domain service transaction.
- Content versioning and learning-data lifecycle operations require explicit operational paths.
- The per-process rate limiter is suitable for local development and contract testing; production requires a shared adapter and ingress controls.
- Notification delivery, AI evaluation, audio capture, offline conflict resolution, and production entitlement tiers remain later decisions.
