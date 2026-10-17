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
- Published activity content has an integer `content_version`. An attempted version is immutable; material editorial changes create a new version before new attempts are accepted.
- Each completion request carries a UUID `Idempotency-Key`. The API stores the verified user, activity, normalized request hash, response, and result under a unique owner/key constraint. A same-key retry returns the original result; a same-key request with a different payload returns `409 idempotency_conflict`.
- An activity attempt, lesson-progress projection, and practice-day projection update in one database transaction. The server clock is authoritative.
- A practice day is recorded on the first completed activity for the user's saved IANA timezone. The current streak is the consecutive sequence ending on the current or immediately previous local date, so it does not disappear before the learner has had a chance to practice that day. Timezone changes apply only to future practice days.
- Goals initially use a daily completed-activity target from 1 through 20. Notification preferences store a practice-reminder toggle, local time, and IANA timezone. Sprint 4 stores and displays the preference but does not claim that a delivery channel exists.
- Catalog resources may carry a nullable `required_entitlement_key`. `null` means the resource is available to the authenticated learner. Any non-null value is enforced by the API through the existing server-side entitlement service; client state never grants access.

## Proposed records

| Record                       | Ownership and purpose                                      | Key constraints                                         |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| `lessons`                    | Server-managed lesson metadata and order                   | unique `slug`; nullable `archived_at`                   |
| `activities`                 | Server-managed, versioned activity content within a lesson | unique lesson/order; indexed lesson; positive version   |
| `phrase_decks` and `phrases` | Server-managed reusable bilingual phrase content           | unique deck slug and deck/order                         |
| `lesson_phrase_decks`        | Server-managed lesson-to-deck membership                   | unique lesson/deck                                      |
| `activity_attempts`          | Append-only user attempt and idempotent response source    | unique user/idempotency key; indexed user/activity/time |
| `lesson_progress`            | User projection for next activity and completion           | unique user/lesson; indexed user/update time            |
| `practice_days`              | User projection for daily goal and streak calculation      | unique user/local date                                  |
| `learning_goals`             | One current daily target per user                          | unique user; target check 1–20                          |
| `notification_preferences`   | One practice-reminder preference per user                  | unique user; validated timezone and local time          |

Exact columns, PostgreSQL constraints, and indexes remain reviewable in the migration. Prisma names may use TypeScript conventions while database names follow `PLATFORM_STANDARDS.md`.

## Retention and deletion

- Published catalog versions are archived instead of destructively rewritten when historical attempts refer to them.
- User attempts, projections, goals, and preferences are retained while the account exists and are included in the application data export/delete workflow before production release.
- Verified account deletion removes the user's learning rows together in a controlled transaction or background job. Catalog content remains.
- Sprint 4 stores no raw audio, video, transcript, contact list, device token, or free-form sensitive answer.
- Logs contain stable event names, record identifiers, correlation IDs, and outcome codes; they exclude answer text, tokens, email addresses, and provider payloads.

## Consequences

- Web, iOS, and Android can share stable `/api/v1` contracts and server-owned progress.
- Retry and replay behavior is deterministic and testable.
- Projections improve dashboard reads but must update only through the domain service transaction.
- Content versioning and account deletion require explicit operational paths.
- Notification delivery, AI evaluation, audio capture, offline conflict resolution, and production entitlement tiers remain later decisions.
