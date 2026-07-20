# ADR 0003: Forge-Compatible Billing Foundation

- **Status:** Accepted
- **Date:** 2026-07-20
- **Decision owners:** Fluyo platform team

## Context and Constraints

Fluyo needs Stripe web subscriptions without creating a billing system that diverges from Forge. Forge supplies the proven architecture for Checkout, Customer Portal, signed webhook processing, event idempotency, customer mapping, entitlement synchronization, server-side Price selection, and security boundaries. Fluyo must retain freedom to define its own commercial catalog, including plan names, prices, monthly and annual intervals, trials, promotion-code availability, free-tier limits, and capability packaging.

This first Sprint 3 increment must create only the data and service foundation. It must not create Checkout Sessions, Portal Sessions, a webhook endpoint, billing UI, or live Stripe network calls.

## Options Considered

1. Copy Forge's current commercial plan configuration exactly. This preserves surface similarity but incorrectly couples two products' packaging and would omit Fluyo's required coupon support.
2. Build a Fluyo-specific billing service and coupon database. This duplicates Stripe behavior and breaks shared architecture compatibility.
3. Share the normalized billing lifecycle and entitlement interfaces while injecting a product-specific plan catalog. This keeps provider integration reusable and commercial choices independent.

## Decision

- Adopt Stripe as the only web payment provider and retain RevenueCat solely as a future native-mobile adapter.
- Add dedicated `stripe_customers`, `stripe_subscriptions`, `stripe_webhook_events`, and provider-neutral `entitlements` tables.
- Keep Stripe customer mapping separate from user-editable profile fields. All mappings use the verified Supabase user UUID.
- Store a normalized local subscription projection and treat Stripe as authoritative once webhook synchronization is implemented.
- Authorize product capabilities from active entitlements, never from Checkout redirects, client claims, profile tier strings, or Stripe Price IDs.
- Preserve the shared access-status policy: `trialing`, `active`, and `past_due` grant access; other stored subscription states do not.
- Make the plan catalog injectable and server-controlled. Every configured paid plan declares monthly and annual Price IDs, capability keys, optional trial days, and whether Stripe promotion codes are allowed.
- Publish plan metadata without Stripe Price IDs. The browser may later request only a plan key and interval; the server resolves the Price ID.
- Keep Stripe responsible for coupon validity, redemption rules, and discount calculations. Do not add a coupon table or local discount engine. A later Checkout PR may set `allow_promotion_codes: true` from the trusted plan configuration.
- Validate Stripe credentials only when billing is enabled. Secrets, signing secrets, and Portal configuration IDs remain server-only and never use browser-public environment prefixes.
- Use `stripe_webhook_events` as the future idempotency ledger. The later webhook processor must verify the signature against the raw body and complete the subscription/entitlement transaction before recording an event as processed.
- Do not add a foreign key from billing tables to `user_profiles`; authenticated users may have billing state before they create an optional profile.
- Add `subscription_tier` to the profile only as a server-maintained summary/cache and reserve `revenuecat_app_user_id` for future mobile work. Neither is an authorization source or part of self-service profile input.

## Compatibility Rule

Forge and Fluyo are compatible when they can share the same customer-mapping, Checkout, Portal, normalized subscription, signed webhook, idempotency, reconciliation, and entitlement modules while supplying different plan catalogs. Their database security mechanisms may reflect their runtimes: Forge uses Supabase RLS; Fluyo exposes PostgreSQL only through NestJS.

## Consequences

- This ADR supersedes ADR 0002 only where that Sprint 2 decision deferred `subscription_tier` and `revenuecat_app_user_id`; all identity ownership and self-service profile boundaries remain unchanged.
- The foundation is inert until later PRs add Stripe SDK integration and authenticated or signed HTTP boundaries.
- Fluyo can retain monthly/annual subscriptions, trials, coupons, and product-specific gating without forking the billing lifecycle.
- Feature code receives stable capability keys and does not depend on Stripe or RevenueCat.
- Webhook concurrency, out-of-order delivery, reconciliation, event coverage, and live Stripe verification remain mandatory work for the dedicated webhook PR.
- Any change to the normalized model or access-status policy requires comparison with Forge and a new ADR when significant.

## Related Documentation

- [Platform Standards](../PLATFORM_STANDARDS.md)
- [Architecture](../ARCHITECTURE.md)
- [Database](../DATABASE.md)
- [API](../API.md)
- [Security](../SECURITY.md)
