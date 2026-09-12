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
- Authenticated Stripe Checkout session creation for monthly/annual plans and Stripe Customer Portal handoff using the existing server-owned customer mapping.
- Raw-body signed Stripe webhook processor (`POST /api/v1/billing/webhooks/stripe`) making Stripe events the authoritative source for subscription and entitlement state: signature verification, checkout completion, subscription lifecycle, invoice lifecycle, transactional event-ledger idempotency, and concurrent replay protection.
- Independent CI jobs for dependency auditing, committed-secret scanning, Prisma validation, linting, type checking, tests, builds, and formatting.

### Changed

- Updated Next.js and its ESLint configuration to the 16.3.3 security release, resolving two critical remote-code-execution advisories.
- Resolved the dependency-audit policy's four temporary exceptions with real upgrades and npm `overrides` (`sharp`, `postcss`, `brace-expansion` scoped to its affected chain) instead of renewing their expiry; the exception list is now empty. Also fixed two further high-severity findings (`multer`, `deepmerge-ts`) found independently of the original four.
- Updated compatible transitive `fast-uri`, `js-yaml`, `nanoid`, and `browserslist` dependencies to patched releases as part of the same remediation.

### Deferred

- Social sign-in, MFA, expanded profiles, feature gating, subscription-experience UI, billing history, RevenueCat, mobile billing, AI, lessons, translation, and mobile applications.
- Live Stripe test-mode verification of the full billing lifecycle, including a real signed webhook delivery through the running application rather than test fixtures ([#12](https://github.com/r1ruffrider/Fluyo/issues/12)).
- A scheduled (cron) re-run of the dependency-audit policy, independent of push/PR triggers.
