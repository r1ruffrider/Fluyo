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

Planned: Supabase Auth, JWT validation, user identity boundaries, authorization foundations, and required security documentation. Do not begin until Sprint 1 is verified.

## Sprint 3 — Billing

Planned: the canonical Forge-compatible Stripe architecture only after Forge Phase 14 defines the shared physical billing schema. Stripe Checkout, Customer Portal, signed webhooks, coupons, monthly/annual subscriptions, and provider-neutral entitlements remain required. RevenueCat remains deferred to native mobile work.

## Sprint 4 — User Dashboard

Planned: the authenticated product shell and first user-facing account experience, using the identity and entitlement boundaries established in Sprints 2 and 3.
