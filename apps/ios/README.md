# Fluyo iOS foundation

This project is an unsigned, non-production SwiftUI foundation for iPhone simulators. It targets iOS 17 and later and contains only deterministic loading, signed-out, and safe configuration-error states. It does not implement authentication, learning, billing, audio, AI, account recovery, store distribution, or public availability.

## Configurations

- `Debug` uses the development bundle namespace and accepts only public non-production configuration.
- `Staging` uses the staging bundle namespace and accepts only public non-production configuration.
- `Release` is intentionally inert: networking is disabled, endpoint values are empty, and no internal build marker is rendered.

The identifiers are proposed repository settings and have not been reserved with Apple. No signing team, provisioning profile, Apple account, production endpoint, or credential is stored in this project.

Development and staging fail closed until these public client values are supplied at build time:

- `FLUYO_API_BASE_URL`
- `FLUYO_SUPABASE_URL`
- `FLUYO_SUPABASE_PUBLISHABLE_KEY`
- `FLUYO_SOURCE_COMMIT_SHORT`

Values must refer to controlled non-production services. The project rejects local, non-HTTPS, privileged-looking, missing, and malformed values.

## CI evidence

The `iOS foundation` GitHub Actions workflow uses two repository-approved public runners. A temporary macOS 14 / Xcode 16.2 lane records minimum-runtime evidence on iOS 17, and a macOS 26 / Xcode 26.6 lane records current-runtime evidence. Both lanes build without signing, run their assigned unit and UI tests on recorded iPhone simulators, and scan their unsigned app and sanitized log for restricted values. A fail-closed aggregate job verifies that both exact-head manifests form the complete simulator scenario set before it uploads a short-lived evidence bundle. Because GitHub schedules the macOS 14 image for retirement on November 2, 2026, its replacement must be rechecked by November 1, 2026; losing that lane leaves minimum-runtime evidence unattempted rather than weakening the gate.

This evidence is internal only. It does not establish physical-device support, signing readiness, TestFlight or App Store availability, iPad-native support, or a production release.
