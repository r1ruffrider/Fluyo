# Fluyo Security

## Current Scope

Sprint 1 exposes unauthenticated operational health endpoints. Sprint 2 adds Supabase Auth web sessions, password recovery, a bearer-token boundary for protected API routes, and a minimal self-owned profile. Sprint 3 adds the billing foundation's private projections and entitlements, authenticated Stripe Checkout and Customer Portal handoffs, and a signed webhook processor that makes Stripe events the authoritative source for local subscription and entitlement state.

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
- Stripe crosses into NestJS through the unauthenticated `POST /api/v1/billing/webhooks/stripe` route; the Stripe signature over the raw request body is that boundary's sole authentication, since Stripe cannot supply a Supabase bearer token. No global auth guard exists in this API — guards are applied per route — and the webhook controller intentionally carries none.

### Primary Threats and Controls

| Threat                                     | Control                                                                                                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Forged or modified access token            | Verify the signature through the configured asymmetric JWKS and allow only `ES256` or `RS256`.                                                                                                                                       |
| Token issued by another project            | Require the exact configured issuer.                                                                                                                                                                                                 |
| Token intended for another audience        | Require the configured audience.                                                                                                                                                                                                     |
| Expired or identity-free token             | Enforce expiration and require a UUID subject.                                                                                                                                                                                       |
| Refresh token or session leakage           | Use Supabase SSR cookie handling, HTTPS outside local development, private no-store refresh responses, and header/log redaction.                                                                                                     |
| Privileged-key exposure                    | Browser code receives only the project URL and publishable key; no service key or signing secret is used in Sprint 2.                                                                                                                |
| User enumeration                           | Return fixed sign-in, sign-up, callback, and API authentication errors without provider details.                                                                                                                                     |
| Client-side authorization bypass           | Treat web redirects and visibility checks as user experience only; the API enforces protected operations.                                                                                                                            |
| Cross-user access                          | Future data services must enforce ownership or entitlements using the verified UUID, with negative tests for every protected resource.                                                                                               |
| Profile ownership override                 | Self-profile routes derive the UUID from the verified token and accept no client-selected owner ID.                                                                                                                                  |
| Account enumeration during recovery        | Recovery requests return the same success state regardless of whether Supabase reports an account.                                                                                                                                   |
| Open redirect through Auth links           | Confirmation and recovery callbacks use fixed server-controlled destinations only.                                                                                                                                                   |
| Customer-mapping ownership override        | Stripe customer mappings live in a separate API-owned table and always use the verified user UUID.                                                                                                                                   |
| Client-selected price or discount          | A validated server catalog resolves plan and interval to Price IDs; Stripe will remain authoritative for coupon validity and math.                                                                                                   |
| Forged or replayed webhook delivery        | The Stripe signature is verified against the untouched raw body before any parsing; missing or invalid signatures are rejected without reaching the processor.                                                                       |
| Duplicate or concurrent webhook processing | A primary-keyed event ledger is checked and written inside the same Prisma transaction as the state change; a concurrent unique-constraint conflict (`P2002`) is treated as replay protection rather than a synchronization failure. |
| Non-replay webhook processing failure      | Errors other than the handled duplicate case propagate uncaught to the global exception filter, which maps them to HTTP 500 so Stripe retries delivery instead of the event being silently dropped.                                  |
| Tier-string authorization bypass           | Protected features must query active provider-neutral entitlements; profile summaries and client UI are not authorization controls.                                                                                                  |

## Secret Handling

- Never commit `.env`, API keys, tokens, credentials, certificates, or production data.
- `.env.example` contains local-only placeholders and variable names.
- `DATABASE_URL` and all future privileged keys are server-only.
- Variables prefixed with `NEXT_PUBLIC_` are public browser configuration and must never contain secrets.
- The Supabase project URL and publishable key are public configuration. Supabase secret/service-role keys and JWT signing secrets must never use `NEXT_PUBLIC_` prefixes or enter browser bundles.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PORTAL_CONFIGURATION_ID` are server-only. Startup validation requires all Stripe values, including `STRIPE_WEBHOOK_SECRET`, whenever `BILLING_ENABLED=true`, and no Stripe value uses a `NEXT_PUBLIC_` prefix.
- The Stripe signature header (`stripe-signature`) is redacted from request logs alongside `authorization`, `apikey`, and `cookie` headers. Webhook logs record event identifiers and types only, never payloads, signatures, credentials, or payment details.

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

Billing tests cover catalog validation and Price-ID non-disclosure, subscription access-status normalization, time-bounded entitlement lookup, customer mapping, event-ledger behavior, server-only environment validation, authenticated Checkout and Portal session creation, and the webhook path: valid- and invalid-signature handling against fixture payloads, all six supported event types, duplicate delivery, concurrent replay protection, entitlement activation and revocation, and transaction-failure rollback. They do not claim live Stripe Checkout, Portal, or webhook verification — no real Stripe test-mode purchase or event delivery has been performed.

A real signed delivery through the full HTTP stack (`stripe listen` / `stripe trigger` against a running instance with a genuine Stripe-issued signature, rather than a self-generated fixture) remains unverified and is tracked in [#12](https://github.com/r1ruffrider/Fluyo/issues/12). This does not gate merging further billing work while Fluyo is undeployed, but it must close before this billing path receives production traffic — it is the one path no unit test can exercise, since the fixture and the verifier share the same test-authored code path.

## Dependencies and CI

Pull requests run dependency auditing, committed-secret scanning, Prisma validation, linting, strict type checking, tests, production builds, and formatting as independent CI jobs. One failure does not prevent the other controls from reporting their results.

The dependency-audit policy remains fixed at high severity. Temporary exceptions live in `security/npm-audit-exceptions.json` and must match the exact advisory ID, package, vulnerable range, installed version, and dependency node reported by npm. The policy fails when:

- any new high or critical advisory is present;
- an accepted advisory changes severity, range, installed version, package, or dependency node;
- an exception expires;
- an exception has no Fluyo tracking issue; or
- a stale exception remains after its advisory disappears.

The policy does not use `npm audit fix --force`, broad dependency overrides, severity-threshold changes, advisory ignore files, or `continue-on-error`.

### Dependency Risk History

An earlier revision of this policy carried four time-boxed exceptions (expiring 2026-08-31) for advisories in `brace-expansion`, `postcss` (×2), and `sharp`, each reachable only through Next.js's own pinned transitive versions at the time. All four were superseded by real upgrades and npm `overrides` rather than renewed: `next` moved to 16.3.3 (the vendor security release), and scoped overrides now pin `sharp`, `postcss`, and (for the affected `minimatch@3.1.5` chain specifically) `brace-expansion` to patched versions. `security/npm-audit-exceptions.json` currently holds zero exceptions. Two further high-severity findings in `multer` and `deepmerge-ts`, identified independently of the original four, were fixed the same way. Issues [#8](https://github.com/r1ruffrider/Fluyo/issues/8), [#9](https://github.com/r1ruffrider/Fluyo/issues/9), and [#10](https://github.com/r1ruffrider/Fluyo/issues/10), opened to track the original exceptions, should be closed as resolved by the real fix rather than left open.

The policy currently has no scheduled (cron) re-run — it only evaluates on push and pull request. A future exception's expiry could again go unnoticed until the next PR forces a fresh run, as happened here. A scheduled daily run is a recommended follow-up, not yet implemented.

## Future Security Work

Before production launch, configure ingress rate limiting, alerting for repeated authentication failures, session and account-deletion retention behavior, profile and billing-data export/deletion handling, Stripe reconciliation, webhook replay operations, and a tested signing-key rotation procedure. Verify live webhook delivery through a real Stripe-signed payload ([#12](https://github.com/r1ruffrider/Fluyo/issues/12)) and complete the broader live Stripe test-mode lifecycle check (Checkout, promotion codes, renewals, payment failures, cancellation, Portal, duplicate events, reconciliation) before accepting production billing traffic. Feature gating, subscription-experience UI, storage, AI, and mobile work still require their own threat-model updates and authorization tests. Add a scheduled re-run of the dependency-audit policy so a future exception's expiry cannot again go unnoticed between CI runs.

## Reporting

Do not open a public issue containing a vulnerability, exploit, credential, or customer data. Contact the repository owner privately and include reproduction steps that avoid real secrets or production data.
