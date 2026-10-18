# Fluyo mobile contract v1

This directory versions provider-neutral wire contracts and deterministic synthetic examples for Fluyo HTTP endpoints that already exist. It supports native client development and compatibility testing. It does not announce a native app, a store release, or public mobile availability.

## Sources and validation

`openapi.json` is reconciled with the route constants in `packages/shared/src`, the NestJS controllers, DTO validation, domain errors, and `docs/API.md`. `fixtures.json` contains repository-authored synthetic examples; it was not captured from a user, production database, Supabase, Stripe, or another provider. The shared-package test validates route inventory, reachable statuses, every fixture body, schema references, UUID-v4 request identifiers, error disclosure, idempotency, privacy restrictions, and excluded APIs.

Each operation carries an `x-fluyo-stage` marker. `foundation` operations may be used by the Sprint 5 shell. `display_only` billing status may be rendered but does not grant client authority. `sprint_6` learning operations are versioned now for compatibility work and remain outside the Sprint 5 native-foundation product surface. Database health is monitoring-only.

## Client rules

- The bearer identity determines the owner. No mobile request accepts an owner ID. On account switch, cancel or ignore prior-owner work, clear owner-scoped caches, and revalidate identity before showing the new account.
- Billing webhooks and server projection remain authoritative. Render the projected `accessGranted` and `entitlements`; never infer access from a subscription status. In particular, `past_due` retains grace-period access under accepted ADR 0003.
- Safe reads may use bounded exponential backoff and cancellation. Preserve last confirmed state during transient failures.
- A new logical activity attempt gets a fresh UUID-v4 `Idempotency-Key`. If a write outcome is ambiguous, retain the same key and exact payload while reconciling or retrying that logical attempt. An identical replay returns the stored response. Never change a payload under the same key after an `idempotency_conflict`.
- Honor a valid positive `Retry-After` value. Use a bounded fallback for missing or malformed values. Do not run an announced second-by-second accessibility countdown.
- Treat `x-correlation-id` as an ephemeral support identifier. It must not encode identity, contact, provider, or campaign data; become a stable user or analytics key; or appear in primary user copy, screenshots, marketing, or ad platforms.
- Server English error messages are diagnostic wire data. Native UI maps stable codes and transport states to localized, actionable copy, focus, announcements, and retry behavior through `clientExpectations`.
- `transportScenarios` describes no-response client states such as offline, timeout, cancellation, reconnect, and account switching. These are not fabricated HTTP status codes or response bodies.

## Privacy and synthetic data

Fixture data is deterministic and synthetic. Emails use `.test`; identifiers are reserved UUID-shaped examples; timestamps are fixed. Identity, profile, learning, attempt, billing, and preference values remain restricted product data even in provider-neutral contracts. Production captures, real provider IDs, tokens, authorization codes, cookies, secrets, request bodies, arbitrary headers, selected answers, short-lived destination URLs, device fingerprints, advertising IDs, campaign fields, and internal stack/database details are prohibited from fixtures and client logs.

Marketing attribution and marketing consent are absent, and ad-platform export is prohibited. Any future attribution or consent feature requires a separate accepted contract with purpose, consent, minimization, retention, deletion, deduplication, and reconciliation rules.

## Deliberate exclusions

The native contract excludes Stripe Checkout, Customer Portal, and webhooks; Supabase PKCE callback and token-provider payloads; internal learning export/deletion hooks; offline learning sync; notification delivery; telemetry ingestion; feature-flag services; RevenueCat; tester enrollment; campaign attribution; social publishing; and store APIs. Their absence is explicit and must not be filled by client assumptions.

## Versioning

The committed schemas validate exact fixtures and detect server drift; their `additionalProperties: false` setting is not a direction to reject future response keys at runtime. Swift and Kotlin response decoders must be configured and tested to ignore unknown keys. An optional response field can then be introduced server-first with fixture coverage. Enum or const expansion is safe only after both clients have a tested unknown-case decoder.

New required request fields; any type, nullability, or requiredness change; removals or renames; response additions consumed by strict decoders; enum/const expansion without unknown-case handling; and changes to statuses, routes, ownership, retry, or idempotency semantics are breaking. They require a new major contract directory, an explicit client/server deployment order, and a migration plan. Update the source commit and validation date whenever the bundle changes.
