# Sprint 4 — Authenticated dashboard and learning domain

Status: proposed implementation plan pending acceptance of [ADR 0005](adr/0005-learning-domain-ownership-and-progress.md)

Success task: an authenticated learner opens Fluyo, sees the next real activity, completes it once, and can reload or return in another session with the same progress, goal, and streak.

## Smallest end-to-end path

1. Sign in and land on `/dashboard`. The client offers its detected IANA timezone for the owned learning preference; until a valid zone is saved, the server uses `UTC`.
2. See an honest first-use state with one primary action: **Start first lesson**.
3. Open a server-provided phrase-choice activity, select an answer, and receive visible feedback.
4. Submit completion with an idempotency key; the API records one attempt and advances owned progress in one transaction.
5. Return to the dashboard and see the next activity, recent progress, daily goal, streak, and current billing/access summary.
6. Refresh, sign out/in, or repeat the same request without losing or duplicating progress.

The current `/learn` cookie-based phrase sprint remains a clearly labeled preview until the persisted flow replaces it. Preview cookies are not migrated into canonical progress.

## Shared API contract

All endpoints use `/api/v1`, Supabase bearer authentication, camel-case JSON, the repository error envelope, and correlation IDs. Owner IDs never appear in client write payloads.

| Method and path                         | Purpose                                          | Key behavior                                                                                             |
| --------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `GET /learning/dashboard`               | Mobile-ready dashboard aggregate                 | next activity, recent progress, streak, goal, notification preference, and server-derived access summary |
| `GET /lessons?cursor=&limit=`           | Browse published lessons                         | stable order; default 20, maximum 50; cursor pagination                                                  |
| `GET /lessons/:lessonId`                | Read a lesson and its published activities/decks | `404 resource_not_found` for missing, archived, or inaccessible content                                  |
| `GET /phrase-decks?cursor=&limit=`      | Browse published phrase decks                    | same pagination and access rules                                                                         |
| `POST /activities/:activityId/attempts` | Submit one versioned activity result             | required UUID `Idempotency-Key`; transactional projections; no client-awarded streak/access              |
| `GET /learning-goals/me`                | Read the current daily target                    | default target is three completed activities                                                             |
| `PUT /learning-goals/me`                | Idempotently replace the target                  | integer 1–20; unknown fields rejected                                                                    |
| `GET /learning-preferences/me`          | Read the practice-day timezone                   | deterministic `UTC` default until a valid zone is saved                                                  |
| `PUT /learning-preferences/me`          | Idempotently replace the timezone                | validated IANA timezone; changes apply only to future practice days                                      |
| `GET /notification-preferences/me`      | Read practice-reminder preference                | delivery availability is reported honestly                                                               |
| `PUT /notification-preferences/me`      | Idempotently replace preference                  | validated boolean and local time; uses the learning timezone                                             |

The activity submission includes `contentVersion` and the selected server-issued choice identifier. The attempt references the immutable activity-version row. Published wording or feedback revisions preserve progress for the stable activity; a changed learning objective receives a new activity identity. Stale versions return `409 content_version_conflict` with a safe retry instruction. Existing owner/key lookup precedes rate limiting: a repeated key with the same normalized request returns the stored response, and a repeated key with changed content returns `409 idempotency_conflict`. Neither consumes limiter capacity. Only a new key proceeds to the limiter before any write.

The first API increment adds an allowlisted domain exception type and extends `ApiExceptionFilter` so `resource_not_found`, `content_version_conflict`, `idempotency_conflict`, and `rate_limited` survive with safe messages and details. Unknown 409s and unexpected exceptions remain `internal_error`.

Activity submissions allow 30 requests per rolling 60 seconds per verified user. The 31st returns `429 rate_limited` with `Retry-After` and performs no write. A replaceable limiter interface uses a deterministic local adapter for development/tests; production cannot enable the learning write endpoint until a shared adapter and ingress abuse controls are configured.

Shared TypeScript request/response types and path constants live in `@fluyo/shared`. Provider identifiers, database row shapes, answer keys, entitlement sources, and internal scoring details stay server-side.

## Dashboard experience contract

| State                      | Required behavior                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Unauthenticated            | Redirect to `/login` and preserve a safe local return destination.                                                              |
| Loading                    | Show a stable skeleton with meaningful accessible labels; do not flash invented streak or progress values.                      |
| First use                  | Explain that no saved learning activity exists and offer **Start first lesson**.                                                |
| Ready                      | Show one next action first, then goal/streak, recent lessons, access status, and secondary account/billing links.               |
| Completed for today        | Celebrate without blocking navigation; offer the next activity and show the achieved goal.                                      |
| Partial dependency failure | Keep available learning data usable. Mark billing or preference data unavailable instead of fabricating a free/paid state.      |
| Request failure            | Preserve the learner's selection, show a safe error, and provide retry. Never display completion before the server confirms it. |
| Expired session            | Return to sign-in with no progress claim.                                                                                       |
| Inaccessible content       | Explain that the activity is unavailable and return to the next allowed activity; never unlock it from client state.            |

The page is phone-first at 320, 390, 768, and 1440 CSS pixels. It uses semantic headings, landmarks, forms, buttons, and progress values; visible focus; keyboard operation; at least 44 by 44 pixel primary touch targets; readable contrast; and reduced-motion behavior. Motion may reinforce completion but cannot be the only feedback.

Screen recordings for marketing use synthetic accounts only and hide email, billing details, correlation IDs, and internal identifiers. The safe capture path is dashboard → activity → confirmed completion. Captions describe the real saved-progress behavior and do not imply AI speech scoring, native apps, or reminder delivery.

## Delivery sequence

Each increment uses a short-lived branch and draft PR. Every exact PR head must pass the eight protected checks before Adriana's delegated merge gate applies.

1. **Contract and decision:** accept ADR 0005, this plan, endpoint shapes, states, and retention rules.
2. **API error and abuse boundary:** add allowlisted domain errors, safe filter mappings, the attempt-rate-limiter interface/local adapter, `Retry-After`, and focused 404/409/429 tests.
3. **Schema and shared types:** add reviewed Prisma migration, stable activities plus immutable versions, catalog/progress models, enum mappings, constraints, indexes, shared contracts, and schema tests. Do not seed or expose UI yet.
4. **Catalog reads:** add server-managed starter lesson/deck seed, protected paginated read endpoints, access checks, and two-user authorization tests.
5. **Progress writes:** add idempotent attempt submission, transactional lesson/practice projections, UTC preference bootstrap, streak calculation, goals, preferences, and duplicate/conflict/failure tests.
6. **Lifecycle and observability:** add the learning-data export/delete service hooks, privacy-safe event/metric contract, and complete/rollback/isolation/telemetry tests.
7. **Dashboard UI:** add `/dashboard`, session return routing, responsive states, real API wiring, accessible activity flow, and honest error/retry behavior.
8. **Phase audit:** run the standing counted audit, fix every blocker, reconcile API/database/security/handoff docs, and close Sprint 4 only after a PASS verdict.

## Required verification

- Migration applies to an empty database and upgrades the preserved development database without deleting billing, profile, or webhook data.
- Schema validation checks mappings, foreign-key behavior, uniqueness, checks, indexes, and forward recovery.
- Missing/invalid auth is `401`; one identity cannot read or mutate another identity's progress, goals, preferences, attempts, or dashboard.
- Catalog pagination is deterministic and rejects invalid or oversized cursors/limits.
- Domain-error filter tests prove the safe codes and statuses for resource, version, idempotency, and rate-limit failures while unknown exceptions remain `internal_error`.
- New, correct, incorrect, stale-version, duplicate, conflicting-idempotency, archived-content, and transaction-failure attempts are covered.
- Duplicate submissions never double-count progress, daily completion, or streaks.
- Stable-activity tests prove that wording/feedback versions preserve progress, exact versions remain attributable, and a changed objective uses a new activity identity.
- Server-time and timezone boundary tests cover the UTC first-write default, saved IANA zones, same-day repeats, midnight, missed days, and future-only timezone changes.
- The 31st attempt inside a rolling minute returns `429` with `Retry-After`; expiry permits a later request; rejected requests do not write data.
- With the limiter saturated, an existing identical owner/key still returns its stored response, an existing changed payload still returns `409`, and only a new key returns `429`; replay and conflict paths do not consume limiter capacity.
- Learning-data export/delete hooks cover complete output, complete deletion, idempotent retry, transactional rollback, and two-user isolation without touching profile or billing rows.
- Telemetry tests assert stable event names, enumerated outcomes, counters, durations, and redaction of answers, email, tokens, provider payloads, and unbounded input.
- First-use, loading, ready, completed, partial-failure, total-failure, expired-session, and inaccessible-content UI states are exercised.
- Reload and sign-out/sign-in preserve server-confirmed progress; failed writes do not appear completed.
- Narrow/wide responsive layouts, keyboard, visible focus, screen reader names, contrast, reduced motion, CTA destinations, and browser console are checked.
- Lint, typecheck, tests, build, formatting, Prisma schema, committed secret scan, and dependency audit policy all pass on the exact head.

## Out of scope

AI evaluation, speech recording, free-form learner answers, translation history, notification delivery, offline sync, XP/leagues/badges, placement testing, content-authoring UI, RevenueCat/mobile billing, App Store or Play publication, production deployment, and paid acquisition remain later governed work.
