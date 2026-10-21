# Android foundation readiness contract v1

This bundle governs the **authorized internal Android foundation implementation** for
Sprint 5 Increment 4. Marlon accepted the five recorded Android baseline and ownership
groups on 2026-10-21. The authorization is limited to a non-production,
debug-signed emulator foundation. It does not claim Android support or availability,
physical-device coverage, release/upload/Play signing, Google Play, production,
authentication, learning, billing, AI, or release behavior.

The approved internal foundation is deliberately narrow: a Kotlin/Jetpack Compose phone
shell with deterministic loading, signed-out, and safe configuration-error states.
Development and staging may later use checked public non-production configuration.
Production remains inert until its separate release gate. Real connectivity belongs with
the first authorized live client in Increment 6.

## Accepted implementation baseline

The repository records these accepted internal implementation inputs:

- Android 10 / API 29 minimum, with compileSdk 37 and targetSdk 36;
- phone-first scope, portrait-primary layouts, and functional landscape, with no tablet
  or foldable support claim;
- the accepted English UI / Spanish learning-content / pseudo and RTL probe boundary;
- unreserved repository identifiers com.fluyo.app, .staging, and .dev
  for Android project settings only;
- the pinned free hosted CI/toolchain: JDK 17, AGP 9.4.0, Gradle 9.6.0,
  Kotlin and Compose Compiler plugin 2.4.10, Compose BOM 2026.09.00, AndroidX Baseline
  Profile plugin 1.5.0, Profile Installer 1.4.1, and their checksums. An
  isolated coordinate and checksum-resolution proof has passed;
- Adriana as interim Android implementation, accessibility, asset, and maintenance owner,
  with Elana retaining independent QA and code-review ownership.

The accepted emulator matrix uses a small API 29 phone and a large current API 37
Pixel-class profile. Physical Pixel- and Samsung-class evidence remains a separately
approved Sprint 5 closeout gate.

## Toolchain resolution proof

toolchain-resolution-proof.json records the 2026-10-20 reproducible coordinate and
binary checksum proof against merged main 55c6f16f1418d83e7711b632b75c6573c3190ca3.
The repository retains the exact Gradle settings/build probe, a cross-platform driver,
and LF-normalized verification metadata. The driver creates a fresh temporary project
and Gradle user home, regenerates the online graph, compares it byte for byte with the
retained metadata, then performs strict offline replay. The graph locks 440 SHA-256
artifact entries across 270 components, including 22 AARs and exact Compose UI, Profile
Installer, and Macrobenchmark AAR hashes.

Gradle receives only a minimal allowlist of host/runtime variables; inherited account,
provider, test-account, proxy-credential, and CI secret variables are excluded. Failure
diagnostics retain only the named phase and process status. Commands, arguments, paths,
identities, and raw Gradle output are never written to retained proof logs.

The path-scoped Android toolchain-proof workflow independently repeats that process on
the exact pull-request head. It is not an Android application or emulator workflow.
This proves repository availability and exact dependency-byte reproducibility only. It
did not install Android SDK packages, create apps/android, compile an application,
start an emulator, or authorize any baseline, owner, signing, production, Play,
physical-device, or spending decision. The later user approval authorizes the scaffold;
completionClaimAllowed remains false until exact-head runtime evidence and independent
QA pass.

## Signing terminology

An APK installed on an emulator is digitally signed. A future Increment 4 artifact must
therefore be described as **non-production debug-signed emulator evidence**. This
contract does not authorize or claim a release key, upload key, Play App Signing,
keystore custody, AAB publication, Play Console application, tester track, or store
availability.

## Privacy and evidence boundary

The repository Data safety inventory is an unsubmitted draft with no ads, tracking,
collection, sharing, runtime permissions, third-party telemetry SDKs, or sensitive
backup. Its exact component inventory contains the exported app launcher and the
non-exported AndroidX Startup provider used by Profile Installer. The dependency's
debug command receiver is deliberately removed during manifest merging. Any change
requires an exact merged-manifest/dependency/SDK inventory and privacy approval. This
is not a submitted Google Play Data safety form.

Shell telemetry remains typed no-op. Product capture remains blocked by
[TEST_ACCOUNT_GOVERNANCE](../../../../../docs/TEST_ACCOUNT_GOVERNANCE.md). Retained
evidence must exclude every email-shaped identity, test-account variable reference,
token, credential, provider identifier, private/release/upload/Play signing identifier
or signing material, Android/advertising/app-set identifier, Install Referrer value,
campaign parameter, path, raw log, raw test result, and production value. The retained
debug-signed APK may expose only the standard non-account Android debug
certificate/public-signer metadata needed to classify and bind that artifact. This does
not authorize or evidence a private, release, upload, or Play signing identity. The
exact-head scanner opens APK and ZIP entries recursively rather than treating their
compressed containers as plain text. Android build/test output is captured only in
temporary storage, reduced to bounded structured failure categories, and then deleted.

The immutable source acceptance matrix contains 29 structured unattempted rows. The
accepted implementation must produce a separate exact-head execution aggregate rather
than rewriting those source rows. That workflow generates minimum and current emulator
evidence, source-bound artifact hashes, a non-production debug-signing classification,
and a fail-closed sanitized aggregate. Physical Pixel and Samsung rows stay unattempted
until their separate device/custody gate.

## Claim boundary

Safe during implementation:

> Fluyo is building an internal Android emulator foundation on the approved repository
> baseline.

Safe only after a future exact-head implementation audit passes:

> An internal, non-production, debug-signed Android emulator foundation renders the
> audited shell states on the recorded emulator matrix.

This bundle does not establish Android or Google Play availability, physical-device,
tablet or foldable support, production readiness, live native authentication, native
learning, synchronized progress, offline learning, reminders, audio, AI, commerce,
RevenueCat, signing readiness, or public availability.
