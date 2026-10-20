# Android foundation readiness contract v1

This bundle is a **specification-only prerequisite** for Sprint 5 Increment 4. It does
not authorize an Android project scaffold, claim Android support or availability, or
prove any emulator, physical-device, signing, Google Play, production, authentication,
learning, billing, AI, or release behavior.

The proposed internal foundation is deliberately narrow: a Kotlin/Jetpack Compose phone
shell with deterministic loading, signed-out, and safe configuration-error states.
Development and staging may later use checked public non-production configuration.
Production remains inert until its separate release gate. Real connectivity belongs with
the first authorized live client in Increment 6.

## Decisions still required

Marlon must explicitly accept the Android portions of the decision register before an
apps/android project is created:

- Android 10 / API 29 minimum, with compileSdk 37 and targetSdk 36;
- phone-first scope, portrait-primary layouts, and functional landscape, with no tablet
  or foldable support claim;
- the accepted English UI / Spanish learning-content / pseudo and RTL probe boundary;
- proposed, unreserved repository identifiers com.fluyo.app, .staging, and .dev
  for Android project settings only;
- the pinned free hosted CI/toolchain proposal: JDK 17, AGP 9.4.0, Gradle 9.6.0,
  Kotlin and Compose Compiler plugin 2.4.10, Compose BOM 2026.09.00, AndroidX Baseline
  Profile plugin 1.5.0, Profile Installer 1.4.1, and their checksums after
  dependency-resolution proof;
- one accountable Android implementation, accessibility, asset, and maintenance owner.

The proposed emulator matrix uses a small API 29 phone and a large current API 37
Pixel-class profile. Physical Pixel- and Samsung-class evidence remains a separately
approved Sprint 5 closeout gate.

## Signing terminology

An APK installed on an emulator is digitally signed. A future Increment 4 artifact must
therefore be described as **non-production debug-signed emulator evidence**. This
contract does not authorize or claim a release key, upload key, Play App Signing,
keystore custody, AAB publication, Play Console application, tester track, or store
availability.

## Privacy and evidence boundary

The repository Data safety inventory starts as an unsubmitted draft with no ads,
tracking, collection, sharing, runtime permissions, third-party telemetry SDKs, or
sensitive backup. Any change requires an exact manifest/dependency/SDK inventory and
privacy approval. It is not a submitted Google Play Data safety form.

Shell telemetry remains typed no-op. Product capture remains blocked by
[TEST_ACCOUNT_GOVERNANCE](../../../../../docs/TEST_ACCOUNT_GOVERNANCE.md). Retained
evidence must exclude every email-shaped identity, test-account variable reference,
token, provider/signing identifier, Android/advertising/app-set identifier, Install
Referrer value, campaign parameter, path, raw log, raw test result, and production value.

The source acceptance matrix contains 29 structured unattempted rows. Static review on
Windows does not convert any row to PASS. After the product, ownership, and toolchain
decisions are accepted, an exact-head Android workflow must generate separate minimum
and current emulator evidence, a source-bound artifact hash, a non-production
debug-signing classification, and a fail-closed sanitized aggregate. Physical Pixel and
Samsung rows stay unattempted until their separate device/custody gate.

## Claim boundary

Safe before implementation:

> Fluyo has a proposed Android foundation readiness specification. Android
> implementation and support decisions remain open.

Safe only after a future exact-head implementation audit passes:

> An internal, non-production, debug-signed Android emulator foundation renders the
> audited shell states on the recorded emulator matrix.

This bundle does not establish Android or Google Play availability, physical-device,
tablet or foldable support, production readiness, live native authentication, native
learning, synchronized progress, offline learning, reminders, audio, AI, commerce,
RevenueCat, signing readiness, or public availability.
