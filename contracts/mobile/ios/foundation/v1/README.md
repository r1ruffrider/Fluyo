# iOS Foundation Readiness Contract v1

This directory contains specification-only inputs for Sprint 5 Increment 3. It is not an Xcode project, does not
authorize a SwiftUI scaffold, and does not establish an iOS availability or support claim.

The active product, ownership, identifier, device, accessibility, asset, and toolchain decisions remain in
[`docs/SPRINT_5_DECISION_REGISTER.md`](../../../../../docs/SPRINT_5_DECISION_REGISTER.md). The policy keeps
`projectScaffoldAuthorized` and `completionClaimAllowed` false until those gates close. It contains no endpoint,
bundle identifier, account, signing, credential, device, production, or capture value.
It also records that no production data or external action was used to prepare this bundle.

## Boundaries

- Development and staging may eventually use public, non-production client configuration. Missing values fail
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
- All 23 macOS, simulator, later physical-device, accessibility, asset, artifact, and binary/log scenarios remain
  `unattempted`. Each scenario has explicit expected criteria. Windows or static review cannot convert any row
  to PASS.

## Evidence rule

The eventual macOS/Xcode run must record the exact source commit and build identity; platform; host and
toolchain versions; device model, class, kind, and OS; environment and accessibility setting; command; expected
and observed result; artifact hash; and secret-scan result. A physical iPhone row remains separately unattempted
until the Sprint 5 closeout device gate. Any head change invalidates earlier exact-head audit and protected-check evidence under
[`docs/TEST_ACCOUNT_GOVERNANCE.md`](../../../../../docs/TEST_ACCOUNT_GOVERNANCE.md).

Reference sources for the eventual toolchain decision:

- [Apple Xcode SDK and system requirements](https://developer.apple.com/xcode/system-requirements/)
- [Apple simulated and physical-device testing](https://developer.apple.com/documentation/Xcode/running-your-app-on-simulated-or-physical-devices)
- [GitHub-hosted runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

These links are evidence sources, not approval of a deployment target, runner, account, identifier, or spend.
