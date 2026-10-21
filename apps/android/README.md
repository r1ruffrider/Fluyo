# Fluyo Android internal foundation

This project implements Sprint 5 Increment 4's internal, non-production Android shell.
It is a phone-first Kotlin/Jetpack Compose foundation with three flavors:

- `development` and `staging` use bounded public `.test` configuration and display an
  internal build marker;
- `production` has empty client configuration, networking disabled, and no marker.

The shell renders deterministic loading, signed-out, and safe configuration-error
states. Its only action explains the current build scope. There is no network client,
live authentication, account storage, lesson/progress surface, billing, audio, AI,
analytics transport, permission, deep link, or Play integration.

The repository identifiers are unreserved settings only. Emulator APK evidence uses
ordinary non-production Android debug signing. Release/upload/Play signing, package
reservation, physical-device support, tablet/foldable support, production, Play Console,
public availability, and spending remain separately gated.

The approved build line is JDK 17, Gradle 9.6, AGP 9.4, Kotlin/Compose Compiler 2.4.10,
Compose BOM 2026.09, minSdk 29, compileSdk 37, and targetSdk 36. Compiling with API 37
does not establish public API 37 support. The evidence matrix records only the exact
API 29 and API 37 emulator executions that pass.

The API 29 lane runs the full Compose semantics and accessibility instrumentation suite.
The API 37 lane runs exactly six bounded UiAutomator black-box checks per flavor for the
honest end state and action, 200% text in landscape, reduced motion, local-only action
behavior, en-XA expansion, and keyboard/D-pad action access. Raw
emulator and instrumentation output is temporary and deleted unconditionally. This
current-runtime lane does not claim Compose-rule parity, general accessibility
compliance, device support, capture readiness, or Play readiness.
