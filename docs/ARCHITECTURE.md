# Fluyo Architecture

## Implemented platform foundation

Sprint 1 establishes a TypeScript npm-workspaces monorepo with three independently buildable packages:

```text
apps/web        Next.js App Router web application
apps/api        NestJS REST API and Prisma database integration
packages/shared Shared API response types and constants
```

The existing `landing/` page remains a standalone marketing artifact. It is not copied into or coupled to the product web application.

### Runtime boundaries

- **Web:** React and Next.js render the initial product shell. A reusable server-side API client reads `NEXT_PUBLIC_API_URL` and checks the API health endpoint without making the build depend on a running backend.
- **API:** NestJS owns the versioned `/api/v1` boundary, validates its environment at startup, limits CORS to the configured web origin, and emits structured request logs with correlation IDs.
- **Shared package:** `@fluyo/shared` is the only source for health response interfaces, service identifiers, API prefix, and health paths used by both applications.
- **Database:** PostgreSQL is accessed only through the API's Prisma integration. The initial schema contains `SystemMetadata` only; no product, identity, billing, lesson, or entitlement data exists yet.
- **Local infrastructure:** Docker Compose runs PostgreSQL with a health check and persistent named volume. Node applications run directly on the host during local development.

### Foundation request flow

```text
Browser -> Next.js web -> NestJS /api/v1/health -> health response
                              |
                              +-> /api/v1/health/database -> Prisma -> PostgreSQL
```

The database health route returns only `reachable` or `unreachable` and never returns connection strings, credentials, driver errors, or infrastructure details. Failed database checks use HTTP 503 while the general service health endpoint remains available.

### Deferred boundaries

Authentication, authorization, billing, entitlements, AI, lessons, user profiles, and mobile applications are outside Sprint 1. Their documented architecture remains a constraint on future work; no placeholder tables or provider integrations are introduced in this foundation.

## Identity and authorization — Sprint 2

Sprint 2 adds Supabase Auth as the identity provider while keeping authentication and authorization distinct. The accepted design is recorded in [ADR 0001](adr/0001-supabase-identity-boundary.md).

```text
Browser
  -> Next.js sign-in/sign-up/recovery server action
  -> Supabase Auth (PKCE and cookie-backed session)
  -> Next.js root proxy refreshes session cookies

Browser/Next.js
  -> Authorization: Bearer <Supabase access token>
  -> NestJS SupabaseJwtGuard
  -> Supabase JWKS signature + issuer + audience + expiration validation
  -> provider-neutral AuthenticatedIdentity
  -> protected controller/service
```

### Web session boundary

- `@supabase/ssr` owns cookie serialization, refresh-token rotation, and the PKCE exchange.
- Sign-in, sign-up, callback exchange, password recovery, password update, and sign-out execute in server code.
- Only the Supabase project URL and publishable key are browser-visible. Service-role keys and signing secrets are not part of this flow.
- The Next.js root proxy refreshes sessions but is not the final authorization control. Protected operations remain enforced by the API or the data owner.

### API identity boundary

- Public health endpoints do not run the identity guard.
- `GET /api/v1/auth/me` requires a bearer access token and returns only the normalized user UUID and nullable email.
- The API accepts asymmetric Supabase tokens using `ES256` or `RS256`. It validates signature, issuer, audience, expiration, and UUID subject against the configured project JWKS.
- Invalid or missing credentials receive a stable, safe HTTP 401 error envelope. Verification causes, raw claims, and tokens are not returned or logged.
- Authentication attaches a provider-neutral identity to the request. Future ownership, role, and entitlement services perform authorization separately.

### Data boundary

Supabase Auth is the identity system of record. Fluyo does not copy credentials, sessions, verified email state, or the Auth directory into PostgreSQL.

Sprint 2 adds the minimal application-owned `user_profiles` table recorded in [ADR 0002](adr/0002-minimal-user-profile.md). Its primary key is the verified Supabase user UUID. It contains only a nullable display name, audit timestamps, and a nullable soft-deletion timestamp. Protected self-service API routes derive the owner from `AuthenticatedIdentity`; clients cannot select another profile ID. Billing, roles, entitlements, lessons, progress, translation preferences, and mobile identifiers are not part of this table.

### Protected web route

`/account` verifies the Supabase session on the server before rendering. It obtains the short-lived access token only after verified claims are available, then calls the protected profile API. Redirecting an unauthenticated browser is a user-experience control; NestJS bearer validation and profile ownership remain the security controls.

## Billing and entitlements — shared with Forge

### Decision

Fluyo must use the exact same web billing patterns and physical billing data model as Forge. This is a shared architecture contract, not a suggestion. Do not implement a Fluyo-specific billing service, custom checkout, custom coupon engine, or parallel subscription schema.

Forge's monetization phase is the source of truth. It specifies Stripe monthly and annual subscriptions, coupons, Stripe Customer Portal, entitlement-based access, and RevenueCat/native in-app purchases deferred to the mobile phase. Forge already establishes the shared profile fields `subscription_tier` (default `free`) and nullable `revenuecat_app_user_id`.

Forge's complete billing migration has not yet landed. When it does, Fluyo must reuse the same migrations, table and column names, enum values, constraints, indexes, webhook event ledger, generated database types, and service-layer shapes. Do not finalize look-alike Fluyo tables independently. If Fluyo implementation starts first, extract and approve the canonical schema for both repositories before either repository ships billing.

### Provider responsibilities

| Concern                 | System of record                   | Rule                                                                                                                                              |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web purchase            | Stripe Checkout                    | The server creates subscription-mode Checkout Sessions from an allowlist of configured Stripe Price IDs.                                          |
| Plan management         | Stripe Customer Portal             | Payment methods, invoices, upgrades, downgrades, renewals, and cancellations use a server-created Portal session. Do not rebuild these screens.   |
| Billing state           | Stripe                             | Stripe subscription and invoice state is authoritative. Local records are a synchronized projection.                                              |
| Product access          | Fluyo/Forge entitlement model      | Application code authorizes capabilities from normalized entitlements, never directly from a client claim, Checkout redirect, or Stripe Price ID. |
| Discounts               | Stripe coupons and promotion codes | Coupon validity, duration, redemption limits, and discount calculations remain in Stripe. Do not create a custom coupon table or calculator.      |
| Future native purchases | RevenueCat                         | Reserved for future iOS and Android apps. RevenueCat maps native purchases into the same user identity and entitlement keys used by web billing.  |

### Subscription catalog

- Recurring web plans use Stripe subscriptions through Checkout.
- Each purchasable product may have separate monthly and annual Stripe Prices. Both intervals grant the same product entitlement set; only billing cadence and price differ.
- Price IDs are server configuration and are selected through a server-side allowlist. The client may request a published plan and interval, but it may not submit an arbitrary Stripe Price ID.
- Coupons are accepted through Stripe Checkout promotion-code support or applied by trusted server-side rules using Stripe coupon/promotion-code identifiers.
- One Stripe Customer is associated with one authenticated application user. Reuse the existing customer rather than creating a new customer for every Checkout Session.
- Fluyo's Free, Plus, Pro, Family, and Classroom packaging may differ from Forge's catalog, but both repositories use the same billing schema, lifecycle, and entitlement representation.

### Checkout flow

1. Require an authenticated user and validate the requested plan and monthly/annual interval against server configuration.
2. Find or create that user's Stripe Customer using the shared Forge customer-mapping pattern.
3. Create a Stripe Checkout Session in `subscription` mode, attach the authenticated user/customer correlation metadata required by Forge, and enable only approved coupons or promotion codes.
4. Redirect the browser to Stripe-hosted Checkout.
5. Treat success and cancel redirects as user experience only. The success page may show a pending state, but it must not grant paid access.
6. Grant or change access only after a verified webhook synchronizes the subscription and recomputes entitlements.

### Customer Portal flow

1. Require an authenticated user.
2. Resolve the user's existing Stripe Customer on the server.
3. Create a short-lived Stripe Customer Portal session using the same Portal configuration as Forge.
4. Redirect to Stripe. After return, display locally synchronized billing state; do not trust return URL parameters as proof of a change.

### Webhooks and synchronization

The Stripe webhook endpoint is the only path that turns Stripe billing events into local subscription state and entitlements.

- Verify the Stripe signature against the unmodified request body before parsing or processing the event.
- Record Stripe event IDs using the shared Forge event-ledger schema and process each event idempotently.
- Handle the same event set as Forge, including Checkout completion, subscription creation/update/deletion, successful renewal, and failed payment events.
- Design for duplicate and out-of-order delivery. When necessary, retrieve the current Stripe Customer or Subscription before applying state.
- Store the normalized subscription status, product/price reference, billing interval, current period boundary, and cancellation state using Forge's exact schema.
- Recompute entitlements transactionally whenever relevant subscription state changes.
- Webhook handlers and reconciliation jobs use server-only credentials. Clients cannot write billing records or entitlements.
- Provide a reconciliation path that can rebuild the local projection from Stripe if an event is delayed or missed.

### Shared data-model contract

The logical model is identical in both repositories:

1. **Profile summary.** The user profile retains Forge's `subscription_tier` field, defaulting to `free`, as a convenient display/cache value. It is not the fine-grained authorization source. The nullable `revenuecat_app_user_id` field remains reserved until mobile billing is introduced.
2. **Stripe customer mapping.** A durable one-to-one mapping connects the authenticated user ID to a Stripe Customer ID.
3. **Subscription projection.** Local rows mirror the Stripe subscription lifecycle and its active product/price, interval, status, renewal period, and cancellation state.
4. **Entitlements.** Normalized entitlement rows answer whether a user can access a product or capability. They support product-scoped access and bundle/All-Access grants without scattering tier comparisons through application code.
5. **Webhook ledger.** Processed Stripe event IDs provide idempotency and an operational audit trail.

The items above describe responsibilities, not permission to invent Fluyo-specific table names. The physical schema must be copied from the canonical Forge billing migration and kept migration-compatible across both repositories. Any future schema change must be applied to both repositories as the same shared billing-model revision.

### Entitlement rules

- Gate paid features through a shared entitlement service or database function, not checks such as `subscription_tier === "pro"` distributed through UI components.
- Entitlement keys are stable product capabilities. Stripe Price IDs and RevenueCat product IDs map to those keys at the billing boundary and do not leak into feature code.
- Active, trialing, grace-period, past-due, canceled, refunded, and expired behavior follows the same normalized policy in Forge and Fluyo.
- Bundle entitlements expand into the applicable product entitlements using the shared model. Fluyo may use this for plan bundles; Forge uses it for per-track and All-Access access.
- The backend enforces entitlements for protected operations. The client may use the same state to hide or explain unavailable UI, but client checks are not security controls.

### RevenueCat boundary

RevenueCat is not part of the initial web billing path. Do not send Stripe web Checkout through RevenueCat and do not introduce native in-app-purchase code during web monetization.

When native mobile billing is added:

- use the existing `revenuecat_app_user_id` link rather than a separate mobile identity;
- map App Store and Play Store products to the same entitlement keys used by Stripe;
- ingest RevenueCat state into the same canonical entitlement store;
- define deterministic conflict and precedence rules for users who have both Stripe and native purchases; and
- keep feature authorization provider-neutral so product code does not care whether an entitlement came from Stripe or RevenueCat.

### Security and configuration

- Stripe secret keys, webhook secrets, and privileged database credentials are server-side only and never use public/client environment-variable prefixes.
- Return URLs are configured allowlists, not arbitrary client-provided URLs.
- Billing mutations require an authenticated user and server-side ownership checks.
- Users may read only their own billing summary and entitlements. Only trusted webhook/reconciliation code may mutate them.
- Log Stripe object and event identifiers needed for diagnosis, but never log secrets, full payment details, or raw sensitive payloads.

### Non-negotiable parity checklist

Before Fluyo billing can ship, verify all of the following against Forge:

- identical billing migrations and generated database types;
- identical Checkout, Portal, webhook, reconciliation, and entitlement service patterns;
- the same subscription-status normalization and grace-period policy;
- the same webhook event coverage and idempotency behavior;
- monthly and annual Prices mapped to provider-neutral entitlements;
- Stripe coupons/promotion codes with no local discount engine;
- authorization based on entitlements, not redirects or UI tier strings; and
- RevenueCat still isolated to the future mobile adapter boundary.
