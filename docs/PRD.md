# Fluyo Product Requirements

## Sprint 1 Delivery Scope

Sprint 1 delivers the platform foundation required for future Fluyo product work. It must provide:

- a runnable Next.js web application;
- a runnable NestJS API with service and database health endpoints;
- shared TypeScript contracts consumed by both applications;
- PostgreSQL and Prisma tooling with one minimal metadata model;
- local Docker Compose infrastructure;
- automated quality commands and GitHub Actions CI; and
- complete setup and operational documentation.

## Sprint 1 Acceptance Criteria

- A developer can install all workspaces from the repository root.
- PostgreSQL can start through the committed Compose configuration and becomes healthy.
- The committed migration and seed run successfully.
- The API health endpoints return the documented safe responses.
- The web home page reports API availability.
- Lint, typecheck, unit tests, production builds, and formatting checks pass.
- No secrets or local database data are tracked.

## Sprint 2 Delivery Scope

Sprint 2 establishes identity and authorization foundations only. It provides:

- Supabase Auth email/password sign-up, sign-in, confirmation callback, recovery, password update, and sign-out for the Next.js application;
- cookie-based SSR sessions with PKCE and session refresh;
- a NestJS bearer-token guard backed by the Supabase asymmetric JWKS;
- a provider-neutral authenticated identity contract shared by the web and API;
- one protected identity endpoint proving the API boundary;
- a protected account route and minimal self-owned profile read/update API;
- stable safe error responses and negative authorization tests; and
- identity architecture, security, API, database, setup, and operational documentation.

## Sprint 2 Acceptance Criteria

- Public health endpoints remain accessible without authentication.
- A missing, malformed, expired, incorrectly signed, wrong-issuer, or wrong-audience token cannot access a protected endpoint.
- A valid Supabase access token produces a minimal identity containing the Supabase user UUID and nullable email.
- Browser sessions use Supabase SSR cookies and never expose refresh tokens or privileged keys to application code.
- Recovery requests do not reveal whether an account exists, and password updates require a verified recovery session.
- The API does not trust browser redirects, cookie contents, or unverified JWT claims.
- A minimal application profile stores only a nullable display name and audit/soft-delete fields, keyed by the verified Supabase UUID.
- No local credential directory, role, subscription, entitlement, lesson, translation, or product schema is introduced.
- All automated quality checks pass.
- A live end-to-end registration, recovery, session-refresh, profile, and sign-out check is completed only in a configured Supabase project using asymmetric signing keys.

## Sprint 2 Exclusions

Sprint 2 does not implement arbitrary-user profile access, avatars, application roles, social identity providers, MFA, billing, subscriptions, entitlements, AI, lessons, progress, translation, or mobile applications. These capabilities require later sprint requirements and, where applicable, accepted ADRs.
