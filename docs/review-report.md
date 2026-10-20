**Phase:** Sprint 5 Increment 4 preparation — reproducible Android toolchain resolution proof
**Brief:** Retain an independently reproducible, repository-only Android coordinate and binary-checksum proof while keeping `apps/android` absent, all 29 runtime rows unattempted, and every baseline, ownership, scaffold, completion, signing, Play, production, device, and external-action gate closed.
**Audited implementation head:** 070a1e926aac49990e3cf7008142cf300d7356d8
**Tests conducted:** 407
**Passed:** 407
**Failed:** 0
**Unattempted:** 29 — the complete Android runtime/device/accessibility/privacy/artifact matrix; no Android application exists in this phase

### What was tested

| Tests   | Count | Scope and evidence                                                                                                                                                                                | Result |
| ------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1–323   |   323 | Full repository suite: 48 policy/script, 57 shared, 194 API, and 24 web tests.                                                                                                                    | PASS   |
| 324–343 |    20 | Focused Android readiness and toolchain-proof shared suites.                                                                                                                                      | PASS   |
| 344–357 |    14 | Proof-driver suite: normalization, minimal child environment, bounded diagnostics, actual failing-child privacy mutation, descriptor/source/metadata/AAR validation, and fail-closed drift cases. | PASS   |
| 358–365 |     8 | Local gates: dependency policy, Prisma generation, Prisma validation, lint, typecheck, formatting, production build, and diff integrity.                                                          | PASS   |
| 366–373 |     8 | Protected run 39480523952: dependency policy, committed-secret scan, Prisma schema, lint, typecheck, tests, build, and formatting.                                                                | PASS   |
| 374     |     1 | Exact-head proof run 39480523881: fresh online generation, LF byte comparison, and strict offline replay.                                                                                         | PASS   |
| 375–377 |     3 | Independent official-repository SHA-256 verification of Compose UI, Profile Installer, and Macrobenchmark AARs.                                                                                   | PASS   |
| 378–387 |    10 | Verification-metadata integrity: unique components/artifacts, one checksum per artifact, AAR count, enabled verification, and no signing-key exceptions.                                          | PASS   |
| 388–407 |    20 | Independent exact-head code, policy, workflow, privacy, source-binding, gate, scenario, documentation, and claim review.                                                                          | PASS   |

The 29 future Android scenarios are not counted as conducted. They remain structured, immutable, and unattempted until Marlon accepts the five Android baseline/ownership groups and a separately authorized Android project produces exact-head runtime evidence.

### Code, workflow, and policy review

The review covered the complete 14-file PR implementation: the path-scoped workflow; Android foundation policy, README, Gradle probe, resolution descriptor, and full verification metadata; shared readiness/proof tests; the cross-platform driver and its Node tests; and the decision register, Sprint plan, and development handoff.

The retained Gradle probe applies no Android plugin and creates no Android project. It uses only `google()`, Maven Central, and the Gradle Plugin Portal with exact coordinates for AGP 9.4.0, Kotlin and Compose Compiler 2.4.10, Compose BOM 2026.09.00, Compose UI 1.12.1, Baseline Profile 1.5.0, Profile Installer 1.4.1, and Macrobenchmark 1.5.0.

The driver creates a fresh OS temporary project and Gradle user home, generates dependency verification metadata online, normalizes it to LF, compares it byte for byte with the retained file, then performs strict offline replay. Cleanup is bounded to the expected temporary parent and prefix. The proof is bound to exact settings, build, driver, and metadata digests.

The retained graph contains 270 components, 440 artifacts, 440 SHA-256 entries, and 22 AARs. Exact hashes for Compose UI `ui-android-1.12.1.aar`, Profile Installer 1.4.1, and Macrobenchmark JUnit4 1.5.0 match the retained metadata and independent official-repository downloads.

Gradle receives only an explicit host/runtime environment allowlist. Inherited provider, account, test-account, proxy-credential, cloud, Stripe, and CI secret values are excluded. Failure diagnostics contain only a bounded phase label and process status. A mutation-sensitive test executes the actual failing child-process path with injected secret, email, Windows path, command, argument, stdout, and stderr sentinels and proves none enters the child environment or thrown diagnostic.

The exact-head workflow has read-only repository permission, checks out the pull-request head, installs only Node 24, Temurin JDK 17, and Gradle 9.6, disables Gradle caching, and runs the proof driver. It does not install an Android SDK, create `apps/android`, compile an application, start an emulator, upload an artifact, or invoke an external account or store action.

Policy remains `specification_only`; `projectScaffoldAuthorized`, `completionClaimAllowed`, `productionDataUsed`, `externalActionsPerformed`, `projectScaffoldCreated`, and `repositoryModifiedByProbe` remain false. The five material Android baseline/ownership decisions remain open, the accountable Android owner remains unassigned, and all 29 source scenarios remain unattempted.

### Specialist gates

- Isabella: **PASS** — 49/49 product, claim, disclosure, source-binding, toolchain, and external-gate checks.
- Fernanda: **PASS** — 43/43 privacy, environment, diagnostics, evidence-sanitization, social, capture, and claim-boundary checks.
- Danila: **PASS** — 76/76 UX, readiness, toolchain-boundary, matrix, workflow, and privacy-diagnostic checks.
- Elana: **PASS** — 407/407 independent phase-quality and code-review checks; 0 failed; 29 runtime rows separately unattempted.

### Bug and remediation table

| Severity        | Location                                                  | Problem                                                                                                                                       | Action                                                                                                                                                           |
| --------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High — resolved | Initial toolchain proof                                   | The first draft recorded a result without retaining a reconstructible Gradle probe/driver and exact online/offline reproduction path.         | Fixed: retain exact settings/build sources, a cross-platform driver, source digests, fresh online generation, LF byte comparison, and strict offline replay.     |
| High — resolved | Initial binary evidence                                   | The first draft recorded coordinate resolution without proving Android AAR bytes.                                                             | Fixed: resolve 22 AARs, bind all 440 artifacts to SHA-256 metadata, and independently verify three required AAR hashes.                                          |
| High — resolved | `scripts/android-toolchain-proof.mjs` child environment   | The prior head passed the complete parent environment to Gradle/plugins, exposing inherited credentials to third-party build code.            | Fixed: use a minimal host/runtime allowlist and test the actual child path with injected GitHub, cloud, Stripe, test-account, email, password, and proxy values. |
| High — resolved | `scripts/android-toolchain-proof.mjs` failure diagnostics | The prior head could retain executable, arguments, temporary paths, and raw Gradle stdout/stderr on failure.                                  | Fixed: emit phase/status only and mutation-test command, arguments, path, identity, secret, stdout, and stderr sentinels.                                        |
| None unresolved | Exact implementation head                                 | No unresolved correctness, security, privacy, reproducibility, test-integrity, UX/readiness, documentation, or claim-boundary defect remains. | No further implementation repair required.                                                                                                                       |

### Evidence limits and remaining gates

This PASS clears only repository availability and exact dependency-byte reproducibility for the proposed Android toolchain. It does not clear Android scaffolding or Increment 4 implementation.

Marlon must still accept:

1. minSdk 29, compileSdk 37, and targetSdk 36;
2. phone-first, portrait-primary, functional-landscape, state-preserving adaptive-window behavior with no tablet/foldable support claim;
3. proposed unreserved Android repository identifiers;
4. the exact free hosted CI/toolchain proposal now supported by this checksum proof;
5. one accountable Android implementation, accessibility, asset, and maintenance owner.

Google Play accounts, package reservation, release/upload/Play signing, production endpoints, App Links, physical Pixel/Samsung evidence, Play tracks, store work, publication, and spending remain separately gated. No Android SDK was installed, no project or APK/AAB was created, no emulator or physical device ran, and no runtime, accessibility, device-support, production, store, or public-availability claim is authorized.

### Verdict

**PASS** — the Sprint 5 Increment 4 Android toolchain-resolution proof is cleared with 407 of 407 conducted checks passed and zero failed. All 29 future Android runtime/evidence rows remain correctly unattempted, and Android scaffolding remains blocked pending Marlon’s five material baseline/ownership decisions.
