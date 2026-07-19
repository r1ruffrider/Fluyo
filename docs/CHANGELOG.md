# Changelog

All notable changes to Fluyo are documented here. Releases follow semantic versioning once public release artifacts exist.

## Unreleased

### Added

- Sprint 1 npm-workspaces monorepo foundation.
- Next.js product web shell with backend availability status.
- NestJS versioned health API with safe database connectivity checks.
- Shared TypeScript health contracts and constants.
- PostgreSQL, Prisma schema, initial migration, and idempotent seed.
- Local Docker Compose database environment.
- ESLint, Prettier, strict type checking, tests, production builds, and GitHub Actions CI.
- Supabase SSR email/password authentication, PKCE callbacks, session refresh, and password recovery for the Next.js app.
- NestJS bearer-token identity guard with JWKS, issuer, audience, expiration, algorithm, and subject validation.
- Provider-neutral authenticated identity contract and protected current-identity endpoint.
- Negative authentication tests, safe API error envelopes, and identity architecture decision record.
- Server-protected account route and a minimal self-owned profile keyed by verified Supabase identity.

### Deferred

- Live Supabase-project verification, social sign-in, MFA, expanded profiles, billing, AI, lessons, translation, and mobile applications.
