# Fluyo iOS and Google Play Release Plan

Status: proposed implementation plan
Owners: product, mobile engineering, backend, design, growth, privacy/security
Last updated: 2026-10-17

## Objective

Ship a reviewable, secure Fluyo MVP to the Apple App Store and Google Play with one Supabase identity, synchronized progress, native in-app subscriptions mapped into the existing provider-neutral entitlement model, and a controlled path from internal testing to staged production release.

The business plan calls for native SwiftUI on iOS and Kotlin/Jetpack Compose on Android. [ADR 0004](adr/0004-native-mobile-app-architecture.md) records that recommendation as proposed and must be accepted before implementation begins.

## Launch scope

The first store release should prove a focused learning loop rather than attempt all twenty long-term features:

1. Sign up, sign in, confirmation, recovery, sign out, account deletion, and cross-device session recovery.
2. Onboarding that captures level, goal, daily commitment, and relevant Spanish-learning context without sensitive profiling.
3. A dashboard showing the next activity, current streak, recent progress, and subscription state.
4. Short structured lessons with listen, repeat, choose, type, and complete interactions.
5. A saved phrase deck with spaced review, audio playback, and basic offline access.
6. A constrained Charla conversation beta with explicit AI disclosure, safe failure behavior, and post-session feedback.
7. A constrained two-way interpreter beta after latency, consent, privacy, and cost gates pass.
8. Notifications and reminders that are opt-in, quiet-hour aware, and configurable.
9. Monthly and annual native subscriptions, free limits, purchase restoration, and provider-neutral access enforcement.
10. Settings for accessibility, privacy, data export/deletion request, support, legal documents, and subscription management.

Video dubbing, tutor marketplace, social exchange, classroom mode, wearables, certification, and broad offline packs remain later releases.

## Architecture and shared contracts

- Keep the existing NestJS API, PostgreSQL data ownership, Supabase identity, and canonical entitlement store.
- Build separate native clients: Swift/SwiftUI for iOS and Kotlin/Jetpack Compose for Android.
- Version mobile-facing REST endpoints under `/api/v1`; generate or validate typed client models from committed schemas instead of duplicating provider payloads.
- Use Supabase PKCE with universal links on iOS and verified App Links on Android. Store refresh material only in Keychain or Android Keystore-backed encrypted storage.
- Use RevenueCat only for App Store and Play purchases. RevenueCat webhooks project verified native subscription state into the existing entitlement service. Stripe remains authoritative for web purchases.
- Define deterministic precedence for users with Stripe and native purchases. Product features ask only for normalized entitlements.
- Keep AI prompts server-managed and versioned. Mobile clients never hold privileged OpenAI, Stripe, RevenueCat, or Supabase service credentials.
- Add mobile release, billing, identity, telemetry, notification, offline-sync, and privacy behavior to the relevant ADRs and platform documentation before production.

## Workstreams and exit gates

### 0. Product and account prerequisites

Deliverables:

- Accept ADR 0004 and define the minimum supported OS versions and device matrix.
- Establish Apple Developer Program and Google Play Console organization accounts using the legal entity; complete agreements, tax, banking, D-U-N-S or organization verification, and role-based team access.
- Reserve the final bundle/package identifier, recommended as `com.fluyo.app`, plus separate development and staging identifiers.
- Confirm product name, age rating, target markets, support URL, privacy-policy URL, terms, account-deletion process, and customer-support ownership.
- Create a store compliance inventory covering microphone, speech recognition, camera/media, notifications, analytics, identifiers, purchases, AI processing, and any data sent to third parties.

Exit gate: account access, legal identity, application identifiers, privacy owner, and mobile architecture decision are recorded. No credential is committed to Git.

### 1. API and data readiness

Deliverables:

- Define Sprint 4 dashboard, lesson, activity, progress, deck, notification-preference, deletion, and AI-session contracts with authorization and negative tests.
- Add schema migrations with ownership, retention, deletion, and offline-conflict rules.
- Implement cursor pagination and idempotency for retryable writes.
- Add mobile-compatible Supabase redirect allowlists and server verification using the existing JWT boundary.
- Add RevenueCat customer mapping, signed webhook verification, event ledger/idempotency, subscription projection, and entitlement reconciliation.
- Add structured telemetry with correlation IDs, privacy redaction, latency/cost measures, and safe provider errors.

Exit gate: API, schema, security, billing, and recovery tests pass; destructive account deletion is verified in a non-production environment; native purchases cannot grant access without a signed authoritative event.

### 2. Native foundations

iOS:

- Create an Xcode workspace with SwiftUI, Swift concurrency, dependency injection, design tokens, localization, and unit/UI test targets.
- Add Debug, Staging, and Release configurations with `.xcconfig`-based non-secret endpoints and signing managed through protected CI credentials.
- Implement Keychain session storage, universal links, network reachability, accessible navigation, dynamic type, VoiceOver labels, reduced motion, and privacy manifests.

Android:

- Create a Gradle project with Kotlin, Jetpack Compose, coroutines/Flow, dependency injection, design tokens, localization, and unit/instrumentation test targets.
- Add development, staging, and production product flavors; use protected Play signing/upload credentials in CI.
- Implement encrypted session storage, verified App Links, connectivity state, TalkBack semantics, font scaling, reduced animation, and baseline profiles.

Both:

- Share API contracts, fixtures, content identifiers, analytics taxonomy, and design tokens at the specification level.
- Add remote feature flags and kill switches for AI, interpreter, billing offers, and notifications.
- Provide deterministic demo/test modes using sandbox services only.

Exit gate: signed internal builds install on the supported device matrix, authenticate against staging, recover cleanly from offline/token-expiry states, and expose no secrets.

### 3. Core learning loop

Implement onboarding, dashboard, lesson player, phrase deck, progress synchronization, streak rules, audio controls, accessibility, empty/error/loading states, and safe offline queuing.

Required tests include first launch, returning user, wrong input, skipped activity, interrupted audio, app background/termination, offline completion, conflict reconciliation, token expiry, slow network, API failure, notification denial, large text, screen reader, reduced motion, and reload on both platforms.

Exit gate: the same account can complete an assigned lesson on one platform and see canonical progress on web and the other platform without duplicate awards or lost completion.

### 4. AI conversation and interpreter beta

- Start with explicit scenarios and constrained session lengths.
- Show when audio is recording, processing, translated, or unavailable; provide stop and delete controls.
- Evaluate Spanish quality, unsafe output, latency, interruption handling, accent coverage, error recovery, privacy, and per-session cost with a versioned test set.
- Require consent before microphone/camera access and explain server-side processing before the permission prompt.
- Gate rollout remotely and retain an immediate server-side kill switch.

Exit gate: accepted evaluation thresholds, cost ceiling, incident runbook, privacy disclosure, deletion behavior, and graceful fallback are independently verified. A prototype alone does not clear this gate.

### 5. Native commerce

- Configure matching monthly and annual products in App Store Connect, Play Console, and RevenueCat for development, staging/sandbox, and production.
- Map both stores to the same Fluyo entitlement keys used by Stripe.
- Implement paywall eligibility, purchase, pending purchase, cancellation display, billing retry/grace behavior, expiration, restore purchases, account switching, family/region constraints where applicable, and subscription-management links.
- Reconcile RevenueCat webhooks into canonical entitlements and display access from the server-verified status response.
- Explain that purchases are managed by the originating store; never route native digital subscriptions through Stripe Checkout.

Exit gate: sandbox purchase matrices pass on physical iOS and Android devices, including duplicate/replayed events, refund/revocation, pending payment, grace period, failed renewal, cancellation, restore, and cross-platform access.

### 6. Release engineering and observability

- Use GitHub Actions with pinned actions and protected environments for lint, static analysis, unit tests, UI tests, API contract tests, secret scanning, dependency scanning, build, signing, artifact retention, and provenance.
- Use Fastlane or platform-supported command-line automation for TestFlight and Play tracks after a security review; production promotion remains approval-gated.
- Upload dSYMs and Android mapping files to the approved crash-reporting service.
- Define crash-free sessions, ANR, launch time, API latency, lesson completion, activation, retention, purchase conversion, restore success, AI latency/cost, and support-volume dashboards.
- Write rollback/kill-switch procedures and identify the last known good build.

Exit gate: a commit produces traceable staging artifacts, store uploads are repeatable, alerts and rollback are exercised, and no production secret appears in a client or log.

### 7. Store readiness

Apple App Store:

- Complete app record, categories, age rating, privacy nutrition labels, export-compliance answers, review notes, demo account, subscription metadata, in-app purchase review, support/privacy URLs, screenshots for required device classes, app preview if used, and Sign in with Apple assessment if third-party social sign-in is later added.
- Validate account deletion, restore purchases, subscription terms, permission purpose strings, privacy manifest, accessibility, and review access to gated features.
- Run TestFlight internal testing, then an external group with review-compliant notes.

Google Play:

- Complete app record, category/tags, content rating, Data safety, ads declaration, target audience, app access instructions, account deletion URL, subscription/base-plan/offer metadata, support/privacy URLs, phone/tablet screenshots, feature graphic, and release notes.
- Meet current target API, 64-bit, App Bundle, Play App Signing, permission, background-work, billing-library, and pre-launch-report requirements at submission time.
- Run internal testing, closed testing, and any account-specific production-access requirement shown in Play Console.

Exit gate: store listings match actual behavior and supported claims; privacy forms match the audited SDK/data inventory; reviewer credentials contain no production customer data.

### 8. Controlled launch

1. Dogfood with employees/owners on staging.
2. Internal TestFlight and Play internal tracks.
3. External TestFlight and Play closed cohort, with feedback triage and two clean release candidates.
4. Submit both stores with a coordinated review plan; expect different approval dates.
5. Release to a small production cohort using phased release/staged rollout.
6. Hold or roll back on crash, ANR, auth, purchase, entitlement, privacy, or severe learning-flow thresholds.
7. Expand only after 24-hour, 72-hour, and 7-day gates pass.

## Current store-policy checkpoints

Validated against official documentation on 2026-10-17; recheck immediately before every submission because store rules change.

- Google Play requires new apps and updates submitted after August 31, 2026 to target Android 16/API 36 or higher, with different thresholds for Wear OS, Automotive, TV, and XR. Track the [current target API requirement](https://developer.android.com/google/play/requirements/target-sdk) in every release checklist.
- A new personal Play developer account created after November 13, 2023 must complete a closed test with at least 12 continuously opted-in testers for at least 14 days before applying for production access. Organization-account rules can differ; confirm the actual account in Play Console. See [Play testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).
- New personal Play accounts may also require real Android-device verification through the Play Console mobile app. See [device verification requirements](https://support.google.com/googleplay/android-developer/answer/14316361).
- Google requires an accurate Data safety form for closed, open, and production tracks, including collection by third-party SDKs; internal-only testing is exempt while it remains internal-only. See [Data safety requirements](https://support.google.com/googleplay/android-developer/answer/10787469).
- If the Android app permits account creation, it must provide an in-app deletion path and an external deletion resource as required by Google Play. See [Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111).
- Apple requires apps that support account creation to let users initiate full account deletion inside the app. Subscription users must be told that store billing can continue and be given an appropriate subscription-management path. See [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
- App Store Connect requires a privacy policy URL and complete app-level data-practice answers. See [App privacy management](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy).
- TestFlight requires beta test information and supports internal and external distribution; resolve beta issues before App Review. See the [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).
- RevenueCat emits different lifecycle events across stores, including purchase, renewal, cancellation, billing issue, expiration, pause, product change, transfer, and temporary grants. The canonical entitlement projector must tolerate duplicates and out-of-order delivery and apply the configured grace-period policy. See [RevenueCat webhook events](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields) and [event flows](https://www.revenuecat.com/docs/integrations/webhooks/event-flows).

## Quality matrix

Every release candidate must be tested on:

- minimum and current iOS versions, small and large iPhones, and a supported iPad layout if the listing permits iPad;
- minimum and current Android versions, small/large phones, representative Samsung and Pixel devices, and tablet/foldable behavior if listed as supported;
- fresh install, upgrade, reload, background/foreground, forced termination, low storage, low memory, offline, slow network, locale/time-zone changes, permissions denied/revoked, and accessibility settings;
- Supabase signup/login/recovery/deletion, API failure, progress conflict, notifications, audio route changes, microphone interruptions, native purchases, restore, cancellation, refund/revocation, and cross-platform entitlement reconciliation;
- console/device logs, crash reports, network failures, sensitive-data leakage, and analytics-event correctness.

Adriana's standing phase-audit process applies to each gate: enumerate and count each executed test, record passed and failed counts, provide a bug table, and issue a strict PASS or FAIL. A failed gate cannot be cleared.

## Suggested delivery sequence

Assuming one iOS engineer, one Android engineer, one backend engineer, shared design/QA, completed store enrollment, and no major interpreter research blocker:

| Window      | Outcome                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Weeks 1–2   | ADR accepted, accounts/identifiers reserved, Sprint 4 contracts and privacy inventory approved |
| Weeks 3–6   | API/data foundations and installable authenticated native shells                               |
| Weeks 7–11  | Dashboard, lesson loop, phrase deck, progress sync, offline/error behavior                     |
| Weeks 12–14 | RevenueCat sandbox lifecycle and native paywalls                                               |
| Weeks 15–17 | Constrained Charla beta, interpreter kept behind its quality gate                              |
| Weeks 18–20 | Accessibility, performance, security, device matrix, store assets and compliance               |
| Weeks 21–22 | TestFlight/Play closed tests, defect closure, release candidates                               |
| Weeks 23–24 | Store review and staged production rollout                                                     |

This is a planning estimate, not a launch promise. Account verification, store review, AI quality, audio latency, privacy findings, or staffing can change it.

## Decisions required before implementation

1. Accept or revise ADR 0004's native SwiftUI plus Kotlin/Compose recommendation.
2. Confirm legal entity, store-account owners, initial countries, age target, minimum OS versions, and whether iPad/tablets are supported at launch.
3. Approve the exact MVP feature list and whether the interpreter is a launch feature or a remotely gated beta.
4. Approve privacy/analytics/crash vendors and retention limits.
5. Approve subscription products and regional pricing after store fees and taxes are modeled.
