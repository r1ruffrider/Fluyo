# Fluyo Roadmap

This roadmap tracks implementation milestones. An item is marked complete only after its acceptance checks have been run successfully in the current repository state.

## Sprint 1 — Platform Foundation

Goal: establish a runnable web application, backend API, shared package, local PostgreSQL environment, database tooling, tests, linting, formatting, and CI.

- [x] npm-workspaces monorepo installs successfully.
- [x] `apps/web` builds and displays backend availability.
- [x] `apps/api` builds and serves `/api/v1/health`.
- [x] `/api/v1/health/database` returns HTTP 200 and a safe success response against PostgreSQL.
- [x] `packages/shared` is consumed by both applications and its test passes.
- [x] The initial Prisma migration applies successfully to the Docker PostgreSQL database.
- [x] The database seed inserts the `platform.foundation` `SystemMetadata` record.
- [x] The Docker Compose PostgreSQL container becomes healthy.
- [x] Lint, typecheck, tests, production builds, and format check pass.
- [x] GitHub Actions CI workflow is present and passes local syntax/format validation.

Application verification note (2026-07-16): the workspace install, Prisma Client generation and schema validation, shared package, API liveness endpoint, tests, linting, type checking, production builds, formatting, and CI workflow configuration were verified independently of local infrastructure.

Infrastructure verification note (2026-07-17): Docker Desktop 4.82.0, Docker CLI and Engine 29.6.1, Docker Compose 5.3.0, and WSL 2.7.10 were verified locally. The repository's PostgreSQL 17 Docker container reached healthy status, the committed initial Prisma migration applied successfully, the seed completed, and a read-only query confirmed the `platform.foundation` `SystemMetadata` record with value `sprint-1`. The connected API database-health endpoint returned HTTP 200 with the safe `database: reachable` response, and the web application returned HTTP 200 while reporting the API available.

Explicitly excluded: authentication, billing, AI, lessons, user profiles, and mobile applications.

## Sprint 2 — Identity

Goal: establish Supabase Auth, trusted JWT validation, provider-neutral identity, a minimal self-owned profile, and authorization foundations without introducing product schemas.

- [x] Next.js supports email/password sign-up, sign-in, confirmation callback, and sign-out through Supabase Auth.
- [x] Forgot-password requests and recovery-session password updates use fixed, server-controlled callback destinations and safe responses.
- [x] Supabase SSR uses PKCE, cookie-backed sessions, and Next.js proxy refresh handling.
- [x] `/account` is a server-protected example route and never sends the refresh token to NestJS.
- [x] NestJS protects `GET /api/v1/auth/me` with signature, issuer, audience, expiration, algorithm, and UUID-subject validation.
- [x] Public health endpoints remain accessible without authentication.
- [x] Missing and invalid credentials return a safe HTTP 401 error envelope.
- [x] Negative tests cover missing and malformed credentials plus missing-expiration, expired, wrong-signature, wrong-issuer, wrong-audience, and invalid-subject tokens.
- [x] A minimal `user_profiles` table is keyed by verified Supabase UUID and exposes protected self-service read/update operations.
- [x] The Sprint 2 profile migration applies successfully against local PostgreSQL.
- [x] No local credential, Auth-directory, role, billing, entitlement, lesson, progress, translation, or mobile schema is introduced.
- [x] ADR, architecture, API, database, security, setup, and product documentation describe the implemented identity boundary.
- [x] Lint, typecheck, tests, production builds, formatting, audit, and diff checks pass.
- [x] A real non-production Supabase project completes sign-up, email confirmation, sign-in, persisted and refreshed sessions, protected web/API/profile access, UUID-keyed profile ownership, safe failure handling, sign-out, and disposable-account cleanup.
- [x] Password recovery is verified end to end through a real provider email: the recovery link opens the application reset flow, the password update succeeds, the old password is rejected, and the new password restores authenticated protected-route access.

Application verification note (2026-07-19): Prisma Client generation and schema validation, lint, strict type checking, 26 tests, production builds, formatting, the high-severity audit threshold, and `git diff --check` passed against the current working tree. JWT tests use ephemeral asymmetric key pairs and cover successful identity normalization plus negative signature, claim, and credential cases. Docker Desktop is currently unavailable, so the new profile migration remains an explicit local PostgreSQL check. No live Supabase project or user token was used, so registration, email delivery, recovery, session refresh, and authenticated profile access still require configured-provider verification.

Infrastructure verification note (2026-07-20): Docker Engine 29.6.1 and Docker Compose 5.3.0 were available, PostgreSQL 17 reached healthy status, Prisma reported both migrations applied, and the `user_profiles` UUID primary-key structure was verified against the local database.

Live identity verification note (2026-07-20): an approved non-production Supabase project with asymmetric signing completed registration, confirmation, application login, cookie-session persistence, provider token refresh, protected `/account`, `/api/v1/auth/me`, and `/api/v1/profiles/me` access, profile creation keyed to the verified Supabase UUID, ownership-injection rejection, safe unauthenticated and invalid-token responses, logout, and protected-route redirection. After the provider email-rate quiet window, a fresh disposable account also completed real recovery-email delivery, recovery-link handling, the application password-reset flow, old-password rejection, new-password login, and protected-session persistence. The disposable Supabase user and inbox were deleted after verification; no local profile row remained to clean up.

Final verification rerun (2026-07-20): lint, strict type checking, 27 tests across 10 test files, production builds, formatting, the high-severity audit threshold, and `git diff --check` passed. Two moderate transitive PostCSS advisories remain; the available automated fix would install a breaking Next.js version.

## Sprint 3 — Billing

Goal: implement Forge-compatible Stripe billing through small reviewable pull requests while allowing Fluyo to own its plan catalog, prices, trials, coupons, free-tier limits, and feature packaging.

### Billing Foundation

- [x] Normalized Stripe customer and subscription projections are defined in Prisma.
- [x] Provider-neutral entitlement storage and active-entitlement checks are defined.
- [x] A processed Stripe-event ledger is available for the future idempotent webhook processor.
- [x] The server-only plan-catalog contract requires monthly and annual Price mappings without exposing Price IDs publicly.
- [x] Coupon and promotion-code support remains a trusted catalog option with Stripe reserved as the source of truth.
- [x] Billing environment validation rejects browser/public Stripe keys and requires no live Stripe values while billing is disabled.
- [x] The migration applies successfully against local PostgreSQL.
- [x] Unit tests, lint, typecheck, builds, formatting, audit, and diff checks pass.
- [x] ADR, architecture, API, database, security, setup, and changelog documentation describe the implemented boundary.

Billing Foundation verification note (2026-07-20): Docker PostgreSQL 17 was healthy, Prisma Client generation and schema validation passed, the committed billing migration applied successfully, and Prisma reported all three migrations current. A safe schema query confirmed the four new billing tables and the UUID ownership key on `stripe_customers`. The shared and API suites passed 49 tests across 16 files; lint, strict type checking, production builds, formatting, the high-severity audit threshold, and `git diff --check` also passed. Two moderate transitive PostCSS advisories remain; the available automated fix would install a breaking Next.js version. No live Stripe API call was made or claimed.

### Later Sprint 3 Pull Requests

- [x] Stripe Checkout creates subscription-mode sessions from the authenticated user, selected plan, and monthly/annual interval.
- [x] Stripe Customer Portal sessions use the existing server-owned customer mapping.
- [x] A raw-body signed webhook processor synchronizes subscriptions and entitlements transactionally and idempotently.
- [x] Subscription and entitlement UI displays synchronized state without granting access from redirects.
- [x] Live Stripe test-mode verification covers Checkout, promotion codes, renewals, payment failures, cancellation, Portal, duplicate events, and reconciliation, including a real signed webhook delivery through the running application rather than test fixtures ([#12](https://github.com/r1ruffrider/Fluyo/issues/12)).

Live Stripe test-mode verification note (2026-10-16): authenticated monthly and annual Checkout, a one-use promotion, real signed CLI webhook delivery, Customer ownership, subscription projection, entitlements, past-due grace behavior per ADR 0003, recovery, Portal cancellation, immediate cancellation, event replay/idempotency, signature rejection, and final access revocation were verified against the running application. Both test subscriptions were left canceled with no active grants. Automatic time-advanced renewal and a second confirmed Supabase identity were additional matrix items that remained unavailable without bypassing real ownership; they were not issue #12 acceptance blockers. Issue #12 was closed after PR #19 merged.

Subscription and entitlement UI verification note (2026-09-16): a protected `GET /api/v1/billing/status` endpoint reports the caller's normalized subscription summary and active entitlements, selecting the access-granting subscription when more than one local record exists and tie-breaking by the most recently updated record. The `/billing` page renders plan, status, renewal/trial/cancellation date, and entitlement keys purely from this server-verified response; it reads no query parameters and grants no access itself. Lint and strict type checking passed across all workspaces; the API workspace's 98 tests across 25 files (7 new), the shared workspace's 1 test, and 6 dependency-audit-policy tests all passed, and production builds succeeded. No live Stripe test-mode verification was performed or claimed; that item remains open.

Checkout implementation verification note (2026-07-21): server-controlled monthly and annual catalog resolution, authenticated endpoint enforcement, Stripe Customer creation and reuse, subscription-mode Session construction, promotion-code configuration, safe provider failures, and pricing-page compilation were verified by automated tests and production builds. No live Stripe test-mode purchase was performed or claimed; the broader live billing lifecycle check remains open.

Customer Portal implementation verification note (2026-07-21): authenticated endpoint enforcement, verified-owner Customer lookup, missing-customer rejection, fixed return URL selection, configured and default Stripe Portal behavior, safe provider failures, and protected billing-page compilation were verified by automated tests and production builds. No live Stripe Portal session or subscription mutation was performed or claimed.

Webhook implementation verification note (2026-07-25): automated tests verify raw-body Stripe signature acceptance and rejection, supported and unsupported event routing, current-subscription retrieval, subscription lifecycle normalization, invoice lifecycle routing, transactional customer/subscription/entitlement/ledger writes, replay suppression, entitlement revocation, and transaction failure propagation. Lint, strict type checking, 91 tests across 25 files, production builds, formatting, and `git diff --check` passed. The high-severity audit threshold currently reports 15 existing dependency advisories; the offered aggregate fix includes breaking dependency changes and was not applied in this focused billing PR. No live Stripe test-mode event delivery or purchase was performed or claimed; the broader live billing lifecycle check remains open.

Dependency remediation note (2026-09-12): the 15 dependency advisories noted above, along with the four temporary exceptions carried since the billing-foundation PR, were resolved with real upgrades and `overrides` (Next.js to its 16.3.3 security release, plus scoped fixes for `sharp`, `postcss`, `brace-expansion`, `multer`, and `deepmerge-ts`) rather than by renewing or extending any exception. `security/npm-audit-exceptions.json` now holds zero exceptions. A second review of the webhook implementation traced the non-duplicate transaction-failure path to a genuine HTTP 500 (so Stripe retries rather than silently losing the event) and confirmed the webhook route's only protection is Stripe's own signature check, since this API applies auth guards per route and none is applied here. The one path still unverified is a real Stripe-signed delivery through the running application rather than a test fixture, tracked in [#12](https://github.com/r1ruffrider/Fluyo/issues/12).

Dependency remediation verification note (2026-10-02): new advisories published after the September 16 CI run were removed with Next.js and `eslint-config-next` 16.3.8, `brace-expansion` 1.1.21/5.0.12, fast-uri 3.1.8, and Vitest 4.1.11. `@nestjs/platform-express` 11.2.7 declares patched Multer 2.4.0 directly, replacing the earlier Multer override while retaining compatible Nest 11 peers. A clean npm 11.13.0 install, Prisma generation/schema validation, all 107 tests, lint, typecheck, production builds, formatting, and HTTP smoke checks passed locally. Full and production-only audits report zero vulnerabilities, and the unchanged High-threshold policy accepts zero exceptions. Lockfile regeneration also refreshed compatible transitive releases; Stripe and React pins remain unchanged. The original baseline's `deepmerge-ts` override mismatch in Prisma tooling still appears in `npm ls --all` and was not changed by this remediation. No live Stripe or database verification was performed; [#12](https://github.com/r1ruffrider/Fluyo/issues/12) remains open, and no later sprint scope was started.

RevenueCat remains reserved for future native mobile applications. Checkout and Customer Portal provide Stripe-hosted purchase and self-service handoffs, signed webhooks synchronize the local billing projection, and the status endpoint/UI expose it for display. Live Stripe test-mode lifecycle verification is complete. Feature gating, the product experience beyond the billing status summary, and native billing remain future work.

## Sprint 3.5 — Product Experience and Launch Readiness

Goal: turn the completed identity and billing foundations into a locally reviewable product direction, an implementation-ready mobile/store plan, and measurable launch operations before product-domain schemas expand.

- [x] Replace internal foundation copy on the web home page with an honest learner-facing experience and working local CTAs.
- [x] Add a small, accessible language-learning interaction that demonstrates the intended product tone without claiming unimplemented AI behavior.
- [x] Add purposeful motion and local visual assets with reduced-motion support and no unlicensed media.
- [x] Complete the product-experience review, marketing plan, TikTok/Instagram plan, three-posts-per-day calendar, and UGC advertising plan.
- [x] Accept ADR 0004 for native SwiftUI and Kotlin/Jetpack Compose applications before implementation.
- [x] Approve the end-to-end iOS/App Store and Android/Google Play release plan, MVP scope, privacy inventory, account ownership, and quality gates.
- [x] Verify the localhost experience, responsive layouts, CTA destinations, reduced motion, claims, console, code quality, and all eight CI checks using the standing counted-test audit.

Completion evidence (2026-10-17): [PR #23](https://github.com/r1ruffrider/Fluyo/pull/23) records the accepted native architecture, end-to-end mobile release plan, launch marketing plan, and TikTok/Instagram/UGC operating plan. [PR #24](https://github.com/r1ruffrider/Fluyo/pull/24) delivers the learner-facing home experience, accessible local phrase sprint, local artwork, and reduced-motion behavior. Its independent phase audit counted 58 executions: 54 passed and four pre-fix or diagnostic checks failed; all four affected areas subsequently passed retests included in the 54 passes, leaving no blocker. Both exact PR heads passed the eight protected CI checks before merge.

## Sprint 4 — User Dashboard and Learning Domain

Goal: deliver the authenticated product shell and canonical learning domain used by web and future mobile clients.

- [x] Accept ADR 0005 and the Sprint 4 implementation plan before creating learning-domain tables.
- [x] Define and implement lessons, activities, phrase decks, progress, streak, goals, and notification preferences with ownership and retention rules.
- [x] Provide the next activity, recent progress, subscription/access state, loading/empty/error states, and accessible navigation.
- [x] Add versioned API contracts, authorization failures, idempotent progress writes, pagination, migrations, telemetry, and end-to-end tests.
- [x] Pass the standing counted phase audit for real reload, failure, mobile layout, accessibility, cross-session persistence, code quality, console, and all eight required checks.

Implementation contract: [SPRINT_4_PLAN.md](SPRINT_4_PLAN.md).

Completion evidence (2026-10-18): PRs #26–#32 delivered the accepted contract, request boundary, versioned schema and shared types, catalog reads, transactional progress writes, lifecycle/observability hooks, and authenticated dashboard. Elana's independent final phase audit counted 255 checks: 255 passed, zero failed, and zero unattempted. PR #32 merged as `0ced1d4a80a42ac1cdf6d2bcee63a3d64cb78f59`; post-merge `main` run `39099767691` passed all eight required jobs.

## Sprint 5 — Native Mobile Foundations

Goal: establish installable authenticated iOS and Android applications after ADR 0004 is accepted.

Planning contract: [SPRINT_5_PLAN.md](SPRINT_5_PLAN.md). Active prerequisite and evidence register: [SPRINT_5_DECISION_REGISTER.md](SPRINT_5_DECISION_REGISTER.md). Status: the native planning, contract inventory, iOS foundation, Android foundation, provider-neutral auth-state contract, live-auth readiness governance, and credential-free synthetic auth kernel are implemented and audited. Live authentication is not implemented: 14 material decisions remain open, live runtime evidence is zero, and all 24 mirrored live-auth rows remain unattempted. No store, signing, production, credential, domain, dashboard, or external-account action is authorized by this status.

Synthetic-kernel completion evidence (2026-10-28): PR #54 merged as
`a5658045cd7d780665cf11cedfb5daccc2c6fc82` after Catalina, Renata, Natalia, and Elana passed the unchanged
review head `9eaaf29e59bcb29e76461b8ff702a5f5025ec0da`. Elana counted 634 conducted tests: 634 passed and zero
failed. All 15 pull-request checks passed, and post-main protected CI `40769872899`, Android foundation
`40769872908`, iOS foundation `40769872904`, and approval history `40769872676` all succeeded. The safe claim
is limited to a credential-free, repository-only, non-production synthetic kernel. Increment 5 live auth remains
gated by five proposed and nine blocked material decisions; safe evidence and specification work continues.

- Create SwiftUI and Kotlin/Compose projects with development, staging, and production configurations.
- Implement Supabase PKCE, secure token storage, universal/App Links, API clients, design tokens, localization, accessibility, telemetry, feature flags, and CI-signed internal builds.
- Reserve production identifiers and complete store-account, privacy, signing, and compliance prerequisites.

## Sprint 6 — Core Learning MVP

Goal: ship onboarding, dashboard, short lessons, phrase review, progress synchronization, audio controls, safe offline behavior, and notification preferences across web, iOS, and Android.

## Sprint 7 — Conversation and Interpreter Betas

Goal: add server-controlled, evaluated Charla conversations and a remotely gated two-way interpreter beta with explicit recording state, privacy controls, latency/cost thresholds, and kill switches.

## Sprint 8 — Native Commerce and Store Launch

Goal: map App Store and Play subscriptions through RevenueCat into the existing entitlement model, complete sandbox lifecycle matrices, pass store/privacy/accessibility review gates, and release through TestFlight and Play closed testing before staged production rollout.

## Later phases

Video translation/dubbing, tutors, social exchange, dialects, broader offline packs, classroom/B2B, certification, music, widgets, and wearables follow only after the core learning, reliability, privacy, unit economics, and retention gates are met.
