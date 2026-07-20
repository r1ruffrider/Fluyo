# ADR 0001: Supabase Identity Boundary

- **Status:** Accepted
- **Date:** 2026-07-17
- **Decision owners:** Fluyo platform team

## Context and Constraints

Sprint 2 introduces identity without introducing user profiles or product data. Platform standards require Supabase Auth, server-side JWT validation of signature, issuer, audience, and expiration, and a separate authorization layer. The Next.js application needs cookie-based server-rendered sessions, while the NestJS API receives stateless bearer tokens.

Fluyo must not store passwords, duplicate Supabase's user directory, trust browser session objects as API authorization, or expose provider-specific claims throughout product code.

## Options Considered

1. **Supabase SSR for the web and a dedicated JWKS verifier for the API.** This keeps each session transport appropriate to its runtime and permits explicit claim constraints.
2. **Call the Supabase Auth user endpoint for every API request.** This supports legacy symmetric tokens but places Supabase Auth in the request hot path and adds regional latency and availability coupling.
3. **Use the `@supabase/server` NestJS adapter without an additional verifier.** Version 1.4.0 verifies the signature, expiration, and subject but does not constrain issuer or audience, so it does not satisfy `PLATFORM_STANDARDS.md` by itself.
4. **Verify tokens with the legacy shared JWT secret.** This expands secret distribution, complicates rotation, and uses Supabase's deprecated signing model.

## Decision

- The Next.js application uses `@supabase/ssr` with PKCE and cookie-backed sessions. A Next.js 16 root proxy refreshes sessions and propagates the private, no-store response headers supplied by the library.
- Sign-up, sign-in, callback exchange, and sign-out execute on the server. Browser code receives only the Supabase project URL and publishable key.
- The NestJS API accepts Supabase access tokens only through `Authorization: Bearer <token>` on protected routes.
- A dedicated integration guard verifies tokens with the project's remote asymmetric JWKS through `jose`. Verification requires an approved `ES256` or `RS256` algorithm, the configured issuer and audience, a valid expiration, and a UUID subject.
- The API maps trusted claims into the provider-neutral `AuthenticatedIdentity` contract containing only `id` and nullable `email`. Raw claims are not attached to business services.
- Health endpoints remain public. Protected routes opt into the guard explicitly; future authorization checks must use server-trusted ownership, roles, or entitlements after authentication.
- Sprint 2 creates no local user or profile table. Supabase Auth remains the identity system of record.
- Legacy `HS256` access tokens are not accepted. The Supabase project must use asymmetric signing keys before live verification or deployment.

## Consequences

### Security

- The API independently enforces signature, issuer, audience, expiration, algorithm, and subject checks.
- Refresh tokens remain in the web session cookie flow and are never forwarded to the API.
- Generic 401 responses avoid exposing verification or provider details.
- A compromised publishable key does not authenticate a user; a valid user access token is still required.

### Operations

- The API needs `SUPABASE_URL`, `SUPABASE_JWKS_URL`, and `SUPABASE_JWT_AUDIENCE`.
- The web needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- JWKS retrieval is cached by the verification library. Key rotation follows Supabase's discovery and cache propagation behavior.
- A configured Supabase project with asymmetric signing keys is required for live end-to-end verification. Unit tests use an ephemeral local key pair and do not claim live provider verification.

### Data and Privacy

- Supabase stores credentials and Auth records. Fluyo's PostgreSQL schema remains unchanged.
- The API exposes only the minimum identity fields required to establish the boundary.

### Compatibility and Cost

- The pattern matches Forge's cookie-based Supabase web sessions while preserving Fluyo's standalone NestJS API boundary.
- No per-request Auth server call is required for valid asymmetric tokens.
- Future profile, billing, storage, and product modules can reference the same UUID identity without changing authentication providers.

## Related Documentation

- [Platform Standards](../PLATFORM_STANDARDS.md)
- [Architecture](../ARCHITECTURE.md)
- [API](../API.md)
- [Database](../DATABASE.md)
- [Security](../SECURITY.md)
