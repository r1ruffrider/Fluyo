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
- [ ] A raw-body signed webhook processor synchronizes subscriptions and entitlements transactionally and idempotently.
- [ ] Subscription and entitlement UI displays synchronized state without granting access from redirects.
- [ ] Live Stripe test-mode verification covers Checkout, promotion codes, renewals, payment failures, cancellation, Portal, duplicate events, and reconciliation.

Checkout implementation verification note (2026-07-21): server-controlled monthly and annual catalog resolution, authenticated endpoint enforcement, Stripe Customer creation and reuse, subscription-mode Session construction, promotion-code configuration, safe provider failures, and pricing-page compilation were verified by automated tests and production builds. No live Stripe test-mode purchase was performed or claimed; the broader live billing lifecycle check remains open.

Customer Portal implementation verification note (2026-07-21): authenticated endpoint enforcement, verified-owner Customer lookup, missing-customer rejection, fixed return URL selection, configured and default Stripe Portal behavior, safe provider failures, and protected billing-page compilation were verified by automated tests and production builds. No live Stripe Portal session or subscription mutation was performed or claimed.

RevenueCat remains reserved for future native mobile applications. Checkout and Customer Portal now provide Stripe-hosted purchase and self-service handoffs; webhook transport, subscription synchronization, feature gating, and native billing remain unimplemented.

## Sprint 4 — User Dashboard

Planned: the authenticated product shell and first user-facing account experience, using the identity and entitlement boundaries established in Sprints 2 and 3.
