**Phase:** Sprint 5 Increment 4 prerequisite — Android foundation readiness
**Brief:** Add only a specification-level Android foundation readiness contract and regression tests while keeping apps/android, scaffolding, runtime/completion, public/store/signing, production, and external-action claims blocked.
**Audited implementation head:** 951a0e8fbe41b7f81038207a4302cdda85c09d2a
**Tests conducted:** 356
**Passed:** 356
**Failed:** 0
**Unattempted:** 29 — the complete future Android runtime/evidence matrix; no Android application exists in this prerequisite

### What was tested

| Tests   | Count | Scope and evidence                                                                                                                                        | Result |
| ------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1–299   |   299 | Full repository suite: 34 policy/evidence, 47 shared, 194 API, and 24 web tests.                                                                          | PASS   |
| 300–309 |    10 | Focused Android readiness suite: exact gates, proposed baselines, negative mutations, scenario digest, leakage patterns, and absence of apps/android.     | PASS   |
| 310–317 |     8 | Protected run 39312211887: dependency policy, committed-secret scan, Prisma schema, lint, typecheck, tests, production build, and formatting.             | PASS   |
| 318–356 |    39 | Independent policy, documentation, scope, source-binding, privacy, telemetry, capture, asset, toolchain, decision, evidence-arithmetic, and claim checks. | PASS   |

The 29 future Android rows are not counted as conducted. They remain immutable unattempted inputs until a separately authorized Android project and exact-head emulator evidence exist.

### Code and policy review

The review covered the complete six-file prerequisite:

- contracts/mobile/android/foundation/v1/foundation-policy.json
- contracts/mobile/android/foundation/v1/README.md
- packages/shared/src/android-foundation-readiness.test.ts
- docs/SPRINT_5_DECISION_REGISTER.md
- docs/SPRINT_5_PLAN.md
- docs/DEVELOPMENT_HANDOFF.md

The policy binds to main commit c68faf7b7284d8c111aec93db4f982ee7ea3e5e0 and keeps status specification_only, projectScaffoldAuthorized false, completionClaimAllowed false, productionDataUsed false, and externalActionsPerformed false. No apps/android directory, Gradle wrapper, Android workflow, downloaded dependency, manifest, APK/AAB, keystore, account resource, production value, or binary artifact exists.

The proposed technical packet is minSdk 29, compileSdk 37, targetSdk 36, AGP 9.4.0, Gradle 9.6.0, JDK 17, Kotlin and Compose Compiler 2.4.10, Compose BOM 2026.09.00, Build Tools 36.0.0, Baseline Profile plugin 1.5.0, and Profile Installer 1.4.1. Every pin remains proposed and requires clean dependency-resolution and checksum proof before scaffold authorization. compileSdk 37 is build compatibility only and does not establish an API 37 runtime-support claim.

Development and staging permit only checked public non-production configuration; production stays inert and fail-closed. The build marker and typed no-op telemetry use closed field sets and reject identity, token, provider, signing, device, campaign, path, answer, progress, billing, and diagnostic concepts. Future attribution requires a separate accepted contract.

The repository Data safety record is an unsubmitted empty draft: no ads, tracking, collection, sharing, runtime permissions, exported components, third-party telemetry SDKs, or sensitive backup. Product capture remains blocked by test-account governance and the asset ledger remains empty.

The 29 future scenarios cover configuration, deterministic shell states, TalkBack/focus/touch/contrast/font scaling, reduced motion, pseudolocale and RTL probes, API 29/current API 37 emulators, portrait/landscape/adaptive windows, asset provenance, manifest/SDK/Data safety inventory, baseline-profile structure, non-production debug-signing classification, privacy scanning, and separately staged physical Pixel/Samsung evidence. All remain unattempted.

### Specialist gates

- Isabella: PASS — 334/334 product, claim, decision, and factual-toolchain checks.
- Fernanda: PASS — 30/30 privacy, signing, capture, attribution, device-ID, evidence, and external-action checks.
- Danila: PASS — 26/26 UX, accessibility, toolchain, scenario, and governance checks.
- Elana: PASS — 356/356 independent QA/code-review checks, zero failed; 29 future runtime rows intentionally unattempted.

### Bug and remediation table

| Severity | Location                  | Problem                                                                                                                                                                        | Action                                                                                                                                 |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Android artifact claim    | The original plan called an emulator artifact unsigned, but installed Android APKs are signed.                                                                                 | Fixed: all governing wording now says non-production debug-signed emulator evidence and separately blocks release/upload/Play signing. |
| High     | Android SDK decision      | Earlier proposal coupled compileSdk and targetSdk at API 36, which is stale for the current Compose line.                                                                      | Fixed: compileSdk 37 and targetSdk 36 are separated, with no API 37 support inference.                                                 |
| High     | Acceptance matrix         | Pseudolocale, RTL, baseline-profile, and adaptive-window behavior were incomplete.                                                                                             | Fixed: the digest-locked matrix has 29 criteria-complete unattempted rows.                                                             |
| High     | Telemetry regression test | An unknown debugNote field incorrectly received a forbidden-concept assertion.                                                                                                 | Fixed: closed-record rejection and declared forbidden-concept checks are tested separately; focused suite passes 10/10.                |
| None     | Final audited head        | No unresolved correctness, security, privacy, accessibility, test-integrity, decision-coherence, documentation, or claim-boundary defect remains in the repository-only slice. | No further remediation required.                                                                                                       |

### Evidence limits and required decisions

This PASS clears only the reversible repository readiness prerequisite. It does not clear Android scaffolding or Increment 4 implementation.

Marlon must still accept:

1. minSdk 29, compileSdk 37, targetSdk 36;
2. phone-first, portrait-primary, functional-landscape, state-preserving adaptive-window behavior, with no tablet/foldable support claim;
3. proposed unreserved Android repository identifiers;
4. the exact free hosted CI/toolchain proposal after dependency/checksum proof;
5. one accountable Android implementation, accessibility, asset, and maintenance owner.

Google Play accounts, package reservation, release/upload signing, production endpoints, App Links, physical Pixel/Samsung evidence, Play tracks, store work, and spending remain separate external gates.

### Verdict

**PASS** — the Sprint 5 Increment 4 Android readiness prerequisite is cleared with 356 of 356 conducted checks passed and zero failed. All 29 future Android runtime/evidence rows remain correctly unattempted, and Android project scaffolding remains blocked pending the five material decisions above.
