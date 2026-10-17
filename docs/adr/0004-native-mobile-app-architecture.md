# ADR 0004: Native mobile application architecture

- **Status:** Proposed
- **Date:** 2026-10-17
- **Decision owners:** Product and engineering

## Context

Fluyo's business plan calls for iOS and Android applications with real-time audio, future camera/video translation, offline learning packs, platform widgets, wearables, and store subscriptions. The current product is a TypeScript web/API monorepo. Platform standards permit React Native or separate native applications and require an ADR before mobile implementation. Identity, billing entitlements, progress, and AI policy must remain server-controlled and shared across platforms.

## Options considered

### React Native

Advantages include a shared TypeScript client layer, one feature team, and faster parity for conventional screens. Risks include added native bridging and debugging around low-latency audio, background work, media pipelines, widgets, watch surfaces, offline storage, and platform release behavior.

### Native SwiftUI and Kotlin/Jetpack Compose

Advantages include direct access to audio/media, background execution, accessibility, widgets, Apple Watch/Wear OS, store billing, platform diagnostics, and platform release tooling. Costs include two client implementations, higher staffing needs, and deliberate parity management.

### Progressive web application only

This minimizes client work but does not meet the stated store, native billing, offline, media, notification, widget, and wearable goals.

## Proposed decision

Use Swift with SwiftUI for iOS and Kotlin with Jetpack Compose for Android. Share backend APIs, provider-neutral domain contracts, content identifiers, analytics taxonomy, design tokens, fixtures, and acceptance tests at the specification level. Do not attempt to share UI or security-sensitive session code across platforms.

Keep Supabase as the identity provider, the NestJS API as the trusted application boundary, PostgreSQL as canonical product storage, and normalized entitlements as the only feature-authorization source. Use RevenueCat as the native-store adapter; signed RevenueCat events feed the same entitlement system used by Stripe. Mobile clients contain only public configuration and sandbox/production endpoints appropriate to their build environment.

## Consequences

- The plan requires dedicated iOS and Android ownership and explicit parity tracking.
- Native audio, camera, offline, accessibility, widgets, wearables, and diagnostics remain first-class.
- Backend and product contracts must be documented before parallel client implementation.
- CI must build, sign, test, and retain separate artifacts for each platform.
- Store-account, signing, privacy, billing, and release operations become permanent capabilities.
- A later switch to cross-platform UI would require a superseding ADR and measured evidence.

## Security, data, cost, and compatibility

- Tokens use Keychain or Keystore-backed encrypted storage; privileged provider keys stay server-side.
- Microphone, camera, media, analytics, and AI processing require purpose-specific disclosure, consent, minimization, retention, and deletion behavior.
- RevenueCat identifiers map to the existing user and entitlement model; provider IDs never become feature checks.
- Two native teams cost more than a shared UI stack; the recommendation accepts that cost for the product's media and platform roadmap.
- API versioning and contract tests protect web/mobile compatibility during independent store-release cycles.

## Acceptance

This ADR remains proposed until the product owner accepts the native staffing/cost tradeoff, initial OS/device support, and MVP store scope.
