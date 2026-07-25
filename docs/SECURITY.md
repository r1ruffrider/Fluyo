# Fluyo Security

## Current Scope

Sprint 1 exposes unauthenticated operational health endpoints. Sprint 2 adds Supabase Auth web sessions, password recovery, a bearer-token boundary for protected API routes, and a minimal self-owned profile. The Sprint 3 billing foundation adds private billing projections, entitlements, server-only configuration validation, and repositories with no public billing routes or Stripe network calls.

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
| Customer-mapping ownership override | Stripe customer mappings live in a separate API-owned table and always use the verified user UUID.                                     |
| Client-selected price or discount   | A validated server catalog resolves plan and interval to Price IDs; Stripe will remain authoritative for coupon validity and math.     |
| Duplicate webhook processing        | A primary-keyed event ledger is prepared for the later signed webhook processor; no webhook transport is claimed in this foundation.   |
| Tier-string authorization bypass    | Protected features must query active provider-neutral entitlements; profile summaries and client UI are not authorization controls.    |

## Secret Handling

- Never commit `.env`, API keys, tokens, credentials, certificates, or production data.
- `.env.example` contains local-only placeholders and variable names.
- `DATABASE_URL` and all future privileged keys are server-only.
- Variables prefixed with `NEXT_PUBLIC_` are public browser configuration and must never contain secrets.
- The Supabase project URL and publishable key are public configuration. Supabase secret/service-role keys and JWT signing secrets must never use `NEXT_PUBLIC_` prefixes or enter browser bundles.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PORTAL_CONFIGURATION_ID` are server-only. Billing startup validation is opt-in until the later integration PRs, and no Stripe value uses a `NEXT_PUBLIC_` prefix.

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

Authentication answers who the caller is. Authorization remains a separate server-side decision. Sprint 2 supplies `AuthenticatedIdentity`; Sprint 3 adds a provider-neutral active-entitlement query. Future protected services must consume the verified UUID and deny access by default when ownership or entitlement cannot be established.

The profile API demonstrates ownership authorization: `GET /profiles/me` and `PUT /profiles/me` use only the UUID attached by the JWT guard. The request body cannot select another user. Display names are presentation data and are never roles, identity proof, or entitlement input.

## Rate Limits

- Supabase Auth provider rate limits apply to sign-up, sign-in, verification, and recovery traffic.
- Public production deployment must add ingress-level request limiting before broad release. Authentication and account-recovery routes require stricter limits than ordinary reads.
- A protected resource must document any additional per-user or per-IP limit appropriate to abuse and cost risk.
- No in-process limiter is claimed in Sprint 2; deployment enforcement remains a pre-production operational requirement.

## Verification

Automated tests cover valid tokens and negative cases for missing credentials, malformed bearer headers, verification failures, wrong issuer, wrong audience, expiration, and invalid subjects. These deterministic tests use an ephemeral local signing key and do not claim that a real Supabase project was contacted.

Live verification requires a configured non-production Supabase project using asymmetric signing keys. Test accounts must use sanctioned Auth APIs and must never be inserted directly into Supabase's internal Auth tables.

Billing-foundation tests cover catalog validation and Price-ID non-disclosure, subscription access-status normalization, time-bounded entitlement lookup, customer mapping, event-ledger behavior, and server-only environment validation. They do not claim live Stripe Checkout, Portal, or webhook verification.

## Dependencies and CI

Pull requests run dependency auditing, committed-secret scanning, Prisma validation, linting, strict type checking, tests, production builds, and formatting as independent CI jobs. One failure does not prevent the other controls from reporting their results.

The dependency-audit policy remains fixed at high severity. Temporary exceptions live in `security/npm-audit-exceptions.json` and must match the exact advisory ID, package, vulnerable range, installed version, and dependency node reported by npm. The policy fails when:

- any new high or critical advisory is present;
- an accepted advisory changes severity, range, installed version, package, or dependency node;
- an exception expires;
- an exception has no Fluyo tracking issue; or
- a stale exception remains after its advisory disappears.

The policy does not use `npm audit fix --force`, broad dependency overrides, severity-threshold changes, advisory ignore files, or `continue-on-error`.

### Temporary Dependency Risk Acceptance

The following exceptions expire after **2026-08-31** and must be reviewed sooner when an upstream supported release becomes available.

| Advisory              | Dependency path                                                                              | Classification                                          | Supported remediation attempted                                                                                                                                     | Tracking                                              |
| --------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `GHSA-mh99-v99m-4gvg` | ESLint and Next ESLint plugins, plus Nest CLI → `minimatch@3.1.5` → `brace-expansion@1.1.16` | Development-only                                        | Patched compatible 5.x copies. ESLint 10 is not yet supported by required plugins, and current Nest CLI still pins the affected chain.                              | [#8](https://github.com/r1ruffrider/Fluyo/issues/8)   |
| `GHSA-6g55-p6wh-862q` | `next@16.2.11` → `postcss@8.4.31`                                                            | Production graph; principally build-time CSS processing | Upgraded to Next 16.2.11, whose supported manifest still pins PostCSS 8.4.31.                                                                                       | [#9](https://github.com/r1ruffrider/Fluyo/issues/9)   |
| `GHSA-r28c-9q8g-f849` | `next@16.2.11` → `postcss@8.4.31`                                                            | Production graph; principally build-time CSS processing | Upgraded to Next 16.2.11, whose supported manifest still pins PostCSS 8.4.31.                                                                                       | [#9](https://github.com/r1ruffrider/Fluyo/issues/9)   |
| `GHSA-f88m-g3jw-g9cj` | `next@16.2.11` → optional `sharp@0.34.5`                                                     | Optional production image-optimization dependency       | Upgraded to Next 16.2.11, whose supported `^0.34.5` range excludes patched Sharp 0.35.x. Fluyo currently has no `next/image` imports or remote-image configuration. | [#10](https://github.com/r1ruffrider/Fluyo/issues/10) |

`GHSA-qx2v-qp2m-jg93` currently appears as a moderate PostCSS advisory. It is tracked in [#9](https://github.com/r1ruffrider/Fluyo/issues/9) but is not allowlisted because it is below the unchanged high-severity threshold.

## Future Security Work

Before production launch, configure ingress rate limiting, alerting for repeated authentication failures, session and account-deletion retention behavior, profile and billing-data export/deletion handling, Stripe reconciliation, webhook replay operations, and a tested signing-key rotation procedure. Checkout, Portal, signed webhook transport, storage, AI, and mobile work require their own threat-model updates and authorization tests.

## Reporting

Do not open a public issue containing a vulnerability, exploit, credential, or customer data. Contact the repository owner privately and include reproduction steps that avoid real secrets or production data.
