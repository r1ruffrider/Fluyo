# iOS Foundation Readiness Contract v1

This directory contains the governing policy and evidence matrix for Sprint 5 Increment 3. Marlon approved the
smallest unsigned SwiftUI simulator implementation on October 19, 2026. The implementation remains internal,
non-production, unsigned, and unavailable through TestFlight or the App Store.

The active product, ownership, identifier, device, accessibility, asset, and toolchain decisions remain in
[`docs/SPRINT_5_DECISION_REGISTER.md`](../../../../../docs/SPRINT_5_DECISION_REGISTER.md). The policy keeps
`projectScaffoldAuthorized` true for the approved repository scaffold and `completionClaimAllowed` false until
the exact-head Mac, simulator, accessibility, artifact, secret-scan, roster, and Elana gates pass. It contains no
account, signing credential, production endpoint, physical-device evidence, or capture value.
It also records that no production data or external action was used to prepare this bundle.

## Boundaries

- Development and staging may use checked public, non-production client configuration. Missing values fail
  closed and must show the constrained internal build marker. Release networking remains inert, and the marker
  is not rendered there, until its separately approved release gate.
- The initial privacy-manifest baseline declares no tracking, tracking domains, collected data, or required-reason
  API categories. Exact code and SDK inventory plus privacy approval must precede any addition.
- Shell telemetry remains a no-op. Exact property constraints permit only iOS, development/staging, an internal
  marker, bounded build metadata, bounded outcomes, and coarse duration buckets. The denylist excludes
  identity, contact, credentials, bodies, URLs, campaign data, device identifiers, accessibility settings,
  diagnostics, learning, billing, and stable join keys. Attribution requires a separately accepted contract.
- Captures remain blocked and defer to
  [`docs/TEST_ACCOUNT_GOVERNANCE.md`](../../../../../docs/TEST_ACCOUNT_GOVERNANCE.md).
- The asset manifest is empty until ownership and provenance are approved. Native shapes, system typography, and
  approved SF Symbols are the only interim sources.
- The 23 evidence rows begin `unattempted`. The approved macOS/Xcode workflow may convert applicable unsigned
  simulator, accessibility, asset, artifact, and binary/log rows only when it records exact execution evidence.
  The physical-iPhone row remains unattempted until the separate Sprint 5 closeout device gate.

## Evidence rule

The macOS/Xcode run must record the exact source commit and build identity; platform; host and
toolchain versions; device model, class, kind, and OS; environment and accessibility setting; command; expected
and observed result; artifact hash; and secret-scan result. A physical iPhone row remains separately unattempted
until the Sprint 5 closeout device gate. Any head change invalidates earlier exact-head audit and protected-check evidence under
[`docs/TEST_ACCOUNT_GOVERNANCE.md`](../../../../../docs/TEST_ACCOUNT_GOVERNANCE.md).

Reference sources for the eventual toolchain decision:

- [Apple Xcode SDK and system requirements](https://developer.apple.com/xcode/system-requirements/)
- [Apple simulated and physical-device testing](https://developer.apple.com/documentation/Xcode/running-your-app-on-simulated-or-physical-devices)
- [GitHub-hosted runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

The iOS 17 deployment target and free public `macos-26` / Xcode 26.6 unsigned simulator CI are approved for this
increment. The links do not authorize an Apple account, identifier reservation, signing, physical-device claim,
production configuration, TestFlight, App Store activity, or spend.
