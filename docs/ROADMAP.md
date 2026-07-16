# Fluyo Roadmap

This roadmap tracks implementation milestones. An item is marked complete only after its acceptance checks have been run successfully in the current repository state.

## Sprint 1 — Platform Foundation

Goal: establish a runnable web application, backend API, shared package, local PostgreSQL environment, database tooling, tests, linting, formatting, and CI.

- [x] npm-workspaces monorepo installs successfully.
- [x] `apps/web` builds and displays backend availability.
- [x] `apps/api` builds and serves `/api/v1/health`.
- [ ] **Requires local Docker verification:** `/api/v1/health/database` returns HTTP 200 and a safe success response against PostgreSQL.
- [x] `packages/shared` is consumed by both applications and its test passes.
- [ ] **Requires local Docker verification:** the initial Prisma migration applies successfully to the Docker PostgreSQL database.
- [ ] **Requires local Docker verification:** the database seed inserts the `platform.foundation` `SystemMetadata` record.
- [ ] **Requires local Docker verification:** the Docker Compose PostgreSQL container becomes healthy.
- [x] Lint, typecheck, tests, production builds, and format check pass.
- [x] GitHub Actions CI workflow is present and passes local syntax/format validation.

Application verification note (2026-07-16): the workspace install, Prisma Client generation and schema validation, shared package, API liveness endpoint, tests, linting, type checking, production builds, formatting, and CI workflow configuration were verified independently of local infrastructure.

Infrastructure verification note (2026-07-16): Docker, another container runtime, and a local PostgreSQL service are unavailable in the execution environment. The API database endpoint's safe HTTP 503 failure path was verified. The four unchecked items above require local Docker verification before this branch may merge into `main`; no successful Docker execution is claimed.

Explicitly excluded: authentication, billing, AI, lessons, user profiles, and mobile applications.

## Sprint 2 — Identity

Planned: Supabase Auth, JWT validation, user identity boundaries, authorization foundations, and required security documentation. Do not begin until Sprint 1 is verified.

## Sprint 3 — Billing

Planned: the canonical Forge-compatible Stripe architecture only after Forge Phase 14 defines the shared physical billing schema. Stripe Checkout, Customer Portal, signed webhooks, coupons, monthly/annual subscriptions, and provider-neutral entitlements remain required. RevenueCat remains deferred to native mobile work.

## Sprint 4 — User Dashboard

Planned: the authenticated product shell and first user-facing account experience, using the identity and entitlement boundaries established in Sprints 2 and 3.
