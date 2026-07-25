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
- Forge-compatible billing data foundation with Stripe customer mapping, normalized subscription projections, provider-neutral entitlements, and an event idempotency ledger.
- Server-only monthly/annual plan-catalog contracts, promotion-code capability, Stripe environment validation, billing tests, and ADR 0003.
- Exact-match, expiring dependency-audit exceptions with tracked upstream remediation issues and negative policy tests.
- Independent CI jobs for dependency auditing, committed-secret scanning, Prisma validation, linting, type checking, tests, builds, and formatting.

### Changed

- Updated Next.js and its ESLint configuration to the 16.2.11 security release.
- Updated compatible transitive `fast-uri` and `brace-expansion` dependencies to patched releases.

### Deferred

- Social sign-in, MFA, expanded profiles, Stripe Checkout, Customer Portal, signed webhook transport, billing UI, AI, lessons, translation, and mobile applications.
