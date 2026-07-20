# Fluyo Security

## Current Scope

Sprint 1 exposes unauthenticated operational health endpoints. Sprint 2 adds Supabase Auth web sessions, password recovery, a bearer-token boundary for protected API routes, and a minimal self-owned profile. It does not implement product data, billing, AI, lessons, progress, translation, or mobile identity.

## Identity Threat Model

### Assets

- Supabase access and refresh tokens;
- user UUIDs and email addresses;
- Supabase signing-key trust configuration;
- authenticated request context; and
- future user-owned product resources.

### Trust Boundaries

- The browser crosses into the Next.js server through form actions, callback requests, and session cookies.
- The Next.js application crosses into Supabase Auth for sign-up, sign-in, callback exchange, refresh, and sign-out.
- API clients cross into NestJS through the `Authorization` header.
- NestJS crosses into the Supabase JWKS endpoint to discover trusted public signing keys.

### Primary Threats and Controls

| Threat                              | Control                                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Forged or modified access token     | Verify the signature through the configured asymmetric JWKS and allow only `ES256` or `RS256`.                                         |
| Token issued by another project     | Require the exact configured issuer.                                                                                                   |
| Token intended for another audience | Require the configured audience.                                                                                                       |
| Expired or identity-free token      | Enforce expiration and require a UUID subject.                                                                                         |
| Refresh token or session leakage    | Use Supabase SSR cookie handling, HTTPS outside local development, private no-store refresh responses, and header/log redaction.       |
| Privileged-key exposure             | Browser code receives only the project URL and publishable key; no service key or signing secret is used in Sprint 2.                  |
| User enumeration                    | Return fixed sign-in, sign-up, callback, and API authentication errors without provider details.                                       |
| Client-side authorization bypass    | Treat web redirects and visibility checks as user experience only; the API enforces protected operations.                              |
| Cross-user access                   | Future data services must enforce ownership or entitlements using the verified UUID, with negative tests for every protected resource. |
| Profile ownership override          | Self-profile routes derive the UUID from the verified token and accept no client-selected owner ID.                                    |
| Account enumeration during recovery | Recovery requests return the same success state regardless of whether Supabase reports an account.                                     |
| Open redirect through Auth links    | Confirmation and recovery callbacks use fixed server-controlled destinations only.                                                     |

## Secret Handling

- Never commit `.env`, API keys, tokens, credentials, certificates, or production data.
- `.env.example` contains local-only placeholders and variable names.
- `DATABASE_URL` and all future privileged keys are server-only.
- Variables prefixed with `NEXT_PUBLIC_` are public browser configuration and must never contain secrets.
- The Supabase project URL and publishable key are public configuration. Supabase secret/service-role keys and JWT signing secrets must never use `NEXT_PUBLIC_` prefixes or enter browser bundles.

## API Controls

- Environment values are validated at API startup.
- CORS is limited to the configured `WEB_ORIGIN`.
- Request logs are structured, use correlation IDs, and redact sensitive headers.
- Database health failures return a fixed safe response without driver or connection details.
- Protected API routes accept short-lived bearer access tokens only.
- JWT validation requires signature, issuer, audience, expiration, approved algorithm, and UUID subject checks.
- Missing and invalid tokens return the same safe HTTP 401 envelope with a correlation ID.
- HTTPS is required outside local development.

## Session Handling

- `@supabase/ssr` uses the PKCE flow and cookie-backed sessions for Next.js.
- The Next.js root proxy refreshes sessions early in the request and applies Supabase's private, no-store response headers when cookies change.
- Server Components use verified claims for display decisions. They do not treat the unverified user object from `getSession()` as an authorization decision.
- Refresh tokens are not forwarded to NestJS. Protected API calls use only the current short-lived access token.
- Sign-out invalidates the Supabase session and clears its cookies through the server session client.
- Password recovery uses a fixed callback marker, requires a verified recovery session before update, and signs out after a successful password change.

## Authorization

Authentication answers who the caller is. Authorization remains a separate server-side decision. Sprint 2 supplies `AuthenticatedIdentity`; it does not define application roles, administrative access, resource ownership policies, or paid entitlements. Future protected services must consume the verified UUID and deny access by default when ownership or entitlement cannot be established.

The profile API demonstrates ownership authorization: `GET /profiles/me` and `PUT /profiles/me` use only the UUID attached by the JWT guard. The request body cannot select another user. Display names are presentation data and are never roles, identity proof, or entitlement input.

## Rate Limits

- Supabase Auth provider rate limits apply to sign-up, sign-in, verification, and recovery traffic.
- Public production deployment must add ingress-level request limiting before broad release. Authentication and account-recovery routes require stricter limits than ordinary reads.
- A protected resource must document any additional per-user or per-IP limit appropriate to abuse and cost risk.
- No in-process limiter is claimed in Sprint 2; deployment enforcement remains a pre-production operational requirement.

## Verification

Automated tests cover valid tokens and negative cases for missing credentials, malformed bearer headers, verification failures, wrong issuer, wrong audience, expiration, and invalid subjects. These deterministic tests use an ephemeral local signing key and do not claim that a real Supabase project was contacted.

Live verification requires a configured non-production Supabase project using asymmetric signing keys. Test accounts must use sanctioned Auth APIs and must never be inserted directly into Supabase's internal Auth tables.

## Dependencies and CI

Pull requests must pass linting, strict type checking, tests, production builds, and formatting checks. Dependency and secret scanning should be enabled in repository settings and expanded in later hardening sprints.

## Future Security Work

Before production launch, configure ingress rate limiting, alerting for repeated authentication failures, session and account-deletion retention behavior, live recovery-flow tests, profile export/deletion handling, and a tested signing-key rotation procedure. Billing, storage, AI, and mobile work require their own threat models and authorization tests.

## Reporting

Do not open a public issue containing a vulnerability, exploit, credential, or customer data. Contact the repository owner privately and include reproduction steps that avoid real secrets or production data.
