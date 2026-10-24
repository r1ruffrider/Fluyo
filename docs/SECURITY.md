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
| Open redirect through Auth links           | Sign-in and confirmation returns accept only an exact server allowlist of local application paths; recovery keeps its fixed server-controlled destination.                                                                           |
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

- Dedicated development and QA credentials live only in the ignored `.env.agent-test-accounts.local` file and
  are referenced by the variable names documented in
  [TEST_ACCOUNT_GOVERNANCE.md](TEST_ACCOUNT_GOVERNANCE.md). Values must never be printed, logged, committed,
  pasted into chat, copied between agents, or exposed in screenshots and recordings.
- Each agent uses its own isolated non-production account and browser/session state. An unavailable agent
  account blocks that agent's authenticated checks; it does not authorize fallback to Marlon's account or to
  another agent's account.

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
- Sprint 4 activity attempts use a per-user in-memory limiter only in development and tests.
  `LEARNING_WRITES_ENABLED` defaults to false in production, and startup validation rejects enabling
  it while that local adapter is registered. Production activation requires a shared limiter and
  ingress abuse controls.

## Learning data lifecycle and telemetry

- The exported lifecycle service receives one verified owner UUID from a future account orchestrator;
  every export/delete query is owner-scoped. It has no public route in this increment.
- Learning deletion is one database transaction across attempts, progress, practice days, goals, and
  preferences. It leaves profiles, billing rows, entitlements, the webhook ledger, and catalog data
  untouched. A failure rolls back the complete learning deletion.
- Learning observability accepts only fixed event names, enumerated outcomes, bounded correlation
  IDs, UUID record IDs, durations, and fixed operation/preference labels. Answer text and choice IDs,
  email addresses, tokens, arbitrary user input, provider payloads, and database request hashes are
  absent from telemetry.
- The current telemetry sink emits structured event and metric samples through the server logger.
  External aggregation/retention is a deployment concern; telemetry failure is best effort and never
  changes a learning result.

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

An earlier revision of this policy carried four time-boxed exceptions (expiring 2026-08-31) for advisories in `brace-expansion`, `postcss` (×2), and `sharp`, each reachable only through Next.js's own pinned transitive versions at the time. All four were superseded by real upgrades and npm `overrides` rather than renewed: `next` moved to 16.3.3 (the vendor security release), and scoped overrides now pin `sharp`, `postcss`, and (for the affected `minimatch@3.1.5` chain specifically) `brace-expansion` to patched versions. `security/npm-audit-exceptions.json` currently holds zero exceptions. Two further high-severity findings in `multer` and `deepmerge-ts`, identified independently of the original four, were fixed the same way. Issues [#8](https://github.com/r1ruffrider/Fluyo/issues/8), [#9](https://github.com/r1ruffrider/Fluyo/issues/9), and [#10](https://github.com/r1ruffrider/Fluyo/issues/10), opened to track the original exceptions, were closed as resolved on 2026-09-12.

### October 2026 Dependency Remediation

A fresh audit of the September 16 lockfile reported new advisories after its last green CI run. The remediation uses patched releases without adding exceptions or changing the audit validator:

| Dependency                       | Patched version   | Advisory coverage                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js and `eslint-config-next` | 16.3.8            | Critical [GHSA-vcvr-r3jv-pc5j](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j), plus the vendor's [16.3.8 security release](https://github.com/vercel/next.js/releases/tag/v16.3.8).                                                                                                                                                       |
| `brace-expansion`                | 1.1.21 and 5.0.12 | High [GHSA-qhr7-859c-m2p7](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-qhr7-859c-m2p7) and [GHSA-6j4f-fj2g-mc7p](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-6j4f-fj2g-mc7p), plus Moderate [GHSA-q2hr-2g5m-vwhr](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-q2hr-2g5m-vwhr). |
| body-parser                      | 2.4.0             | High [GHSA-27R3-JXMH-P828](https://github.com/advisories/GHSA-27R3-JXMH-P828).                                                                                                                                                                                                                                                                                        |
| Multer                           | 2.5.0             | Moderate [GHSA-3pph-fpjx-jg34](https://github.com/expressjs/multer/security/advisories/GHSA-3pph-fpjx-jg34) and High [GHSA-Q7QP-RJG7-Q26M](https://github.com/advisories/GHSA-Q7QP-RJG7-Q26M).                                                                                                                                                                        |
| fast-uri                         | 3.1.8             | Moderate [GHSA-hrr3-gc8f-f4qj](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj).                                                                                                                                                                                                                                                                                    |
| Vitest and its mocker            | 4.1.11            | Moderate [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).                                                                                                                                                                                                                                                                                    |

The body-parser 2.4.0 remediation requires `qs` 6.16.1 through its declared `^6.16.1` dependency; the lockfile resolves the shared root copy to that exact version. The `minimatch@3.1.5` override remains scoped to the compatible `brace-expansion` 1.x API. The separate 5.x copies are refreshed within their existing dependency ranges; no blanket cross-major override is used. `@nestjs/platform-express` 11.2.7 still pins the vulnerable Multer 2.4.0, so this documented material compatibility decision temporarily uses a root override to install Multer 2.5.0. The wired `scripts/check-multer-override.mjs` gate confirms that the API and Nest resolve the same root Multer 2.5.0 package, rejects nested installs, and parses only the stable structure of the scoped Multer/Nest `npm ls` result. Depending on npm's platform-specific override reporting, it accepts either a clean successful tree with no diagnostic keys or dependency flags, or exit 1 with the single exact Nest-to-Multer 2.4.0 invalid edge and `ELSPROBLEMS`; mixed or expanded results fail. Neither reporting mode permits removal: that signal is raised only after both the installed Nest package and lockfile pin an exact Multer 2.5.0 or newer. Remove the override and its bounded verification after that signal and a compatibility review. Nest 11 peer ranges remain compatible with the existing core, common, and testing packages. Stripe and React pins, billing authorization, and server-only configuration are preserved. Live Stripe verification remains open in [#12](https://github.com/r1ruffrider/Fluyo/issues/12).

The policy currently has no scheduled (cron) re-run — it only evaluates on push and pull request. A future exception's expiry or a newly published advisory could go unnoticed until the next PR forces a fresh run. A scheduled daily run is a recommended follow-up, not yet implemented.

## Future Security Work

### Verification on 2026-10-16

Fresh audit results differ from the earlier clean October checkpoint. The development dependency
`shell-quote` 1.10.0 is affected by critical
[GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv). The existing override is
updated to compatible 1.12.0; the lockfile changes only that package. Next.js remains 16.3.8.

At the 2026-10-16 checkpoint, the full audit reported five high-severity findings in the `braces`
dependency chain used by Next.js lint tooling
([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)). The exact-match,
development-only exception was tracked in [issue #21](https://github.com/r1ruffrider/Fluyo/issues/21)
and remained subject to the policy's stale-exception and expiry checks. On 2026-10-23, a fresh audit
no longer reported the advisory, so the stale exception was removed. No dependency or lockfile change
was needed. The High threshold remains unchanged, the exception list is empty, and the exact policy
passes with zero exceptions and zero unapproved High or Critical findings. The production-only
`npm audit --omit=dev` reports zero vulnerabilities across all severities. The full `npm audit`
currently reports two Moderate development-only findings in `@vitest/mocker`:
[GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) and
[GHSA-xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp). Both propagate to the
direct `vitest@4.1.11` development dependency. The non-major `vitest@4.1.12` fix is available and
must be tracked as a separate dependency slice; this documentation-only packet does not change any
package manifest or lockfile.

Before production launch, configure ingress rate limiting, alerting for repeated authentication failures, session and account-deletion retention behavior, profile and billing-data export/deletion handling, Stripe reconciliation, webhook replay operations, and a tested signing-key rotation procedure. Verify live webhook delivery through a real Stripe-signed payload ([#12](https://github.com/r1ruffrider/Fluyo/issues/12)) and complete the broader live Stripe test-mode lifecycle check (Checkout, promotion codes, renewals, payment failures, cancellation, Portal, duplicate events, reconciliation) before accepting production billing traffic. Feature gating, subscription-experience UI, storage, AI, and mobile work still require their own threat-model updates and authorization tests. Add a scheduled re-run of the dependency-audit policy so a future exception's expiry cannot again go unnoticed between CI runs.

## Reporting

Do not open a public issue containing a vulnerability, exploit, credential, or customer data. Contact the repository owner privately and include reproduction steps that avoid real secrets or production data.
