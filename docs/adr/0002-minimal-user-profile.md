# ADR 0002: Minimal User Profile

- **Status:** Accepted
- **Date:** 2026-07-19
- **Decision owners:** Fluyo platform team

## Context and Constraints

Sprint 2 now includes a minimal application-profile foundation in addition to the Supabase identity boundary. Supabase Auth remains responsible for credentials, verified email addresses, sessions, and provider metadata. Fluyo needs a provider-neutral place for application-owned profile fields without copying the Auth directory or coupling future product code to Supabase user metadata.

The profile must be self-owned, use the verified Supabase UUID, and avoid introducing billing, entitlement, lesson, progress, translation, or mobile fields.

## Options Considered

1. Store application profile fields only in Supabase Auth user metadata. This avoids a migration but couples product data to the identity provider and makes application-data lifecycle and authorization less explicit.
2. Create a minimal Fluyo profile keyed by the verified Supabase UUID. This separates identity from application data and lets the NestJS API enforce ownership.
3. Copy Supabase Auth users into a local user directory. This duplicates the identity system of record and creates unnecessary synchronization and privacy risk.

## Decision

- Add `user_profiles` as an application-owned PostgreSQL table accessed only through Prisma and NestJS.
- Use the verified Supabase `sub` UUID directly as the profile primary key. Do not accept a profile owner ID from clients.
- Store only nullable `display_name`, creation/update timestamps, and a nullable soft-deletion timestamp in Sprint 2.
- Expose protected `GET /api/v1/profiles/me` and idempotent `PUT /api/v1/profiles/me` endpoints. Both derive ownership from `AuthenticatedIdentity`.
- Provide a server-protected Next.js `/account` route that reads and updates only the caller's profile through the API.
- Do not add email, credentials, roles, subscription tiers, RevenueCat identifiers, lessons, progress, or translation preferences to the profile.
- Do not add a database foreign key to Supabase's internal Auth schema. The provider boundary is external to the application database, and its UUID is the cross-system identity contract.

## Consequences

- Supabase remains the identity system of record while Fluyo owns only application profile data.
- Authorization is deny-by-default: profile routes use the verified bearer identity and expose no arbitrary user-ID parameter.
- Account deletion and provider/profile reconciliation require an explicit future lifecycle workflow. Soft deletion provides a safe local foundation without claiming that workflow is complete.
- This ADR supersedes only ADR 0001's Sprint 2 statement that no local profile table is created. ADR 0001's authentication, JWT, session, and provider-boundary decisions remain unchanged.

## Related Documentation

- [ADR 0001](0001-supabase-identity-boundary.md)
- [Architecture](../ARCHITECTURE.md)
- [API](../API.md)
- [Database](../DATABASE.md)
- [Security](../SECURITY.md)
