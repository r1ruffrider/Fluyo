# Development and billing verification handoff

## Sprint 5 Increment 5 material-decision v2 control-plane bootstrap — 2026-10-30

This branch installs a separate `fluyo-native-auth-material-decisions-v2` control plane, a canonical
14-ID decision-value manifest, and a genesis record anchored to `main`
`6af78d83f6144cb7d89b01d7f1c748d2d3155637`. It does not append Marlon's selection record and
does not modify the v1 ledger, decision policy, or evidence snapshot.

Marlon directly selected “Approve recommended bundle” in Codex on 2026-10-30 against the merged
decision brief. The exact selection is intentionally recorded only in a later pull request after the
trusted v2 validator is merged. That future record must atomically preserve seven
`OWNER_SELECTED_EVIDENCE_PENDING` values and seven `DEFERRED_OPEN` values; backup custody maps to
deferred `AUTH-NONPROD-CUSTODY` with no inferred custodian. Selection is not acceptance. Only a
separate evidence-closure record can produce `ACCEPTED`, and runtime may consume only `ACCEPTED`.

All excluded authorization flags remain false. Native runtime evidence remains 0 conducted, 0
passed, 0 failed, and 24 unattempted. This branch authorizes no credentials, live adapter, native
runtime, dependency selection or installation, production, signing, store/release, device, spend,
publication, destructive/data, domain, or external-account/dashboard action. The new
`pull_request_target` workflow becomes base-controlled only after bootstrap merge and therefore
cannot protect this bootstrap pull request. Branch-protection configuration remains a separate,
unauthorized external action. The later selection-record pull request is the first pull request that
can receive base-controlled v2 record validation. This bootstrap relies on local validation, existing
protected CI, applicable specialist gates, and Elana's final exact-head audit.

Evidence closure fixes the reviewer identity for every gate: Catalina Moreno for architecture,
Natalia Ortega for security, Renata Vega for infrastructure, GitHub Actions for protected CI, Elana
Castillo alone for the final exact-head QA gate, and the named UX, visual, claims, records, or research
specialist for each applicable domain gate. The per-decision gate inventory is closed. In particular,
`AUTH-REVOCATION` requires Camila Reyes, Daniela Vargas, and Isabella Navarro because its frozen
evidence covers UX/accessibility, visual/mobile/motion, and claims concerns. A missing gate or wrong
reviewer fails closed.

All initial and superseding values are checked against decision-specific closed shapes plus a
recursive secret/capability boundary; a false top-level boundary cannot hide a nested runtime,
dependency-installation, credential, or token authorization. The PR-B fixture validates an actual
frozen subject `T`, append commit `L`, and squash-equivalent head, and fails stale concurrent bases,
historical index-prefix changes, and unindexed record files.

## Engineering execution and test-account governance — 2026-10-18

Authenticated development checks use role-specific, non-production accounts under
[TEST_ACCOUNT_GOVERNANCE.md](TEST_ACCOUNT_GOVERNANCE.md). Adriana and Elana keep isolated browser and
session state, use only their own locally referenced credentials, and never use Marlon's account as a
fallback. Elana remains the independent QA and code-review owner and must use her separate account.

Engineering commits and pushes completed work and reconciles the pull request and report before Elana's final
exact-head audit. After that exact head passes Elana's counted audit and every required check, engineering
applies the standing authorized merge gate, verifies all required post-merge `main` checks, and immediately
starts the next documented increment. Any post-audit commit invalidates the evidence and requires a fresh audit
and protected-check run. A new start instruction is not required. Work pauses only for an undelegated explicit
approval boundary, missing secure access or secrets, an external account or spending action, destructive or
irreversible work, or a material product decision. When one workstream is blocked, independent authorized
workstreams continue.

Marlon directly authorized Adriana on 2026-10-22 to mark ready and merge future PRs without a new per-PR prompt
only when the current exact head has Elana PASS with zero unresolved material defects, every protected and
phase-specific specialist/platform gate PASS, and GitHub reports clean/mergeable. Any head change invalidates
approval evidence and requires fresh gates. This standing merge approval excludes production, signing, store,
spending, destructive, external-account, credential actions, and material product decisions. After merge,
Adriana verifies post-main workflows and starts the next documented increment automatically. An external
approval system rejection pauses only the rejected merge and must be reported.

## Sprint 5 Increment 5 native-auth decision brief checkpoint — 2026-10-29

PR #56 merged the proposal-only
[native-auth decision brief](NATIVE_AUTH_DECISION_BRIEF_2026-10-29.md) as
`b8919d2fc5cfd530bace711c51aba3726daf763e`. Elana's independent audit passed 159 of 159 conducted
checks on the unchanged review head `da468ee1d5f324cff232bcf1389ef07e2e25d39f`. Catalina's architecture
and contract review passed 34 of 34 checks, and Natalia's security review passed 153 of 153 checks on that
same exact head. All nine pull-request gates passed. After merge, protected CI run `40893241156` and Auth
approval history run `40893240963` completed successfully on merged `main`.

The brief organizes recommendations and tradeoffs; it does not accept or authorize any material choice. All
14 native-auth decisions remain unaccepted: five are `PROPOSED` and nine are `BLOCKED`. Live native runtime
evidence remains zero conducted, zero passed, zero failed, and 24 unattempted. No SDK, runtime adapter,
credential, domain, callback registration, dashboard value, external account, production, signing, store,
spending, destructive action, or completion claim is authorized by this checkpoint.

Marlon has been notified to approve the recommended native-auth bundle or list deviations and to name a backup
non-production custodian. While that material decision boundary remains open, the safe fallback continues:
credential-free repository contracts, specifications, validators, and synthetic evidence only. Any accepted
decision must be recorded through the existing content-addressed approval-history process before implementation
or external action can rely on it.

## Sprint 5 Increment 5 synthetic native-auth kernel completion — 2026-10-29

PR #54 merged the credential-free, repository-only provider-neutral native-auth synthetic kernel as
`a5658045cd7d780665cf11cedfb5daccc2c6fc82`. Its frozen review head was
`9eaaf29e59bcb29e76461b8ff702a5f5025ec0da`. The final two-file repair moved the Android diagnostic
`Provider<RegularFile>` into each Gradle `Test` task configuration, removing the Kotlin build-script-object
configuration-cache capture while preserving the existing sanitized diagnostic behavior.

Catalina's architecture review, Renata's environment and CI review, and Natalia's security review all passed on
that unchanged head. Elana's independent exact-head audit then passed 634 of 634 conducted tests with zero
failed and no missing required phase evidence. All 15 pull-request checks passed, including the eight protected
repository jobs, approval history, three Android foundation jobs, and three iOS foundation jobs. After merge,
the protected CI run `40769872899`, Android foundation run `40769872908`, iOS foundation run `40769872904`,
and Auth approval history run `40769872676` all completed successfully on merged `main`.

Two low, non-blocking stability observations remain recorded: the first minimum-iOS attempt named the canonical
corpus test before the unchanged-head rerun passed, and one shared phase-allowlist test reached its five-second
timeout before immediate and later full reruns passed. Renata and Valentina monitor recurrence; neither changes
the exact-head PASS or requires a code change at this checkpoint.

The permitted claim remains: credential-free, repository-only, non-production synthetic kernel evidence. Live
native authentication runtime remains zero, and all 24 mirrored live-auth rows remain unattempted. Increment 5
live implementation is therefore still gated by the 14 material decisions in the
[native live-auth readiness packet](../contracts/mobile/auth-readiness/v1/README.md): five are proposed and nine
remain blocked by exact values, named human custodians, or external evidence. Adriana cannot accept those
decisions. Safe provider-neutral evidence, specifications, validators, copy, accessibility states, and synthetic
tests continue while Marlon resolves the material decision boundary.

## Sprint 5 Increment 5 provider-neutral auth-state prerequisite — 2026-10-22

PR #43 merged the October 22 Next.js advisory repair as
`7df062b51dd3b915d0064879d969c7d52cbc1c8b`; post-main run `39841371052` passed all eight protected jobs.
The [provider-neutral auth-state contract](../contracts/mobile/auth-state/v1/README.md) is bound to that merged
baseline and contains repository-only state, copy, privacy, lifecycle, and in-memory synthetic-test rules.
Runtime executions are zero and all 24 mirrored native auth/link scenarios remain unattempted.

The contract names Danila accountable for UX state semantics, Adriana responsible for interim repository
integration, Marlon consulted for material product or external changes, Fernanda as the auth-state privacy-
boundary reviewer, and Elana as independent QA. This scoped assignment does not fill the repository-wide privacy
owner. The contract defines a secret-free ten-state model, one in-memory generation fence, a single callback
exchange and refresh, purpose/environment/host/path/expiry-bound atomic callback consumption, private owner
confirmation through the existing `/api/v1/auth/me` boundary, explicit cleanup and refresh semantics, fixed
diagnostics, and structurally zero-retention telemetry.

Live native authentication remains blocked. This slice adds no native SDK, secure-storage adapter, callback
domain, AASA/assetlinks file, Supabase redirect allowlist, dashboard/account/email-template change, signing,
production, physical-device, capture, TestFlight/Play/store, public availability, or spend action. Recovery
delivery, provider revocation proof, and account-deletion orchestration also remain absent. Safe wording is:
“Repository-only provider-neutral auth-state contract and in-memory synthetic tests; zero native runtime
execution.”

## Sprint 5 Increment 4 readiness checkpoint — 2026-10-19

Increment 3 merged through PR #39 as c68faf7b7284d8c111aec93db4f982ee7ea3e5e0. Post-main protected run
39308241296 passed all eight required jobs, and post-main iOS foundation run 39308241391 passed the minimum
iOS 17 lane, current unsigned-simulator lane, and sanitized aggregate. Physical-iPhone evidence and every Apple
account, identifier-reservation, signing, production, TestFlight/App Store, and spending action remain gated.

Marlon accepted the five Android baseline and ownership groups on 2026-10-21. Increment 4 is authorized to add
the smallest internal, non-production, debug-signed emulator foundation. The Android foundation readiness bundle
records the accepted minSdk 29,
compileSdk 37, targetSdk 36, phone-first scope, accepted locale/motion boundaries, non-production configuration,
exact minimal repository Data safety inventory, typed no-op telemetry, blocked capture, empty asset ledger, and 29
structured future evidence rows. It correctly describes a future installed APK as non-production debug-signed
emulator evidence; no release/upload/Play signing is implied.

The prior prerequisite created no Android project or runtime evidence. projectScaffoldAuthorized is true.
Candidate `04fb0b04b49a94f129b73c8f80f5e5af3d1c15d4` subsequently passed 376/376 repository tests, the 8/8
protected run `39627266023`, dependency proof `39627266093`, and all three jobs in Android run `39627266112`.
The sanitized aggregate contains 27 unique applicable PASS rows with zero failures; physical Pixel and Samsung
remain the only two unattempted rows. Isabella passed 15/15 product checks, Danila passed 466/466 UX and evidence
executions, Fernanda passed 27/27 privacy/evidence checks, and Elana passed 531/531 independent checks. The
policy now permits only the internal, non-production, debug-signed emulator-foundation completion claim, subject
to fresh finalization-head checks. Adriana remains interim Android implementation, accessibility, asset, and
maintenance owner. Package reservation, release/upload/Play signing, Play Console, production, physical-device
claims, public capture, spending, and all other external actions remain blocked.

The runtime evidence split is deliberate: API 29 runs exactly nine isolated Compose semantics and accessibility
methods, applying 200% system font scale before that method's process starts and resetting it afterward, while
API 37 runs exactly seven Compose-semantics checks per flavor, with system input and window controls for the
honest end state/action, 200% text in landscape, reduced motion, local-only behavior, en-XA expansion,
keyboard/D-pad action access, and adaptive-window usability. The workflow restores emulator settings and deletes
raw emulator and instrumentation output unconditionally. API 37 evidence does not claim broad accessibility
compliance, physical-device support, capture readiness, or Play readiness.

PR #40 merged the readiness prerequisite as 55c6f16f1418d83e7711b632b75c6573c3190ca3; post-main run
39471055292 passed all eight required jobs. On 2026-10-20, a retained Gradle fixture and cross-platform driver
regenerated the proposed graph in a fresh temporary project and Gradle user home, matched the LF-normalized
metadata byte for byte, and passed strict offline replay. The graph verifies 440 SHA-256 artifact entries across
270 components, including 22 AARs and exact Compose UI, Profile Installer, and Macrobenchmark AAR bytes. A
path-scoped exact-head proof workflow repeats this dependency-only check; it is not an Android application or
emulator workflow. The durable proof records exact JDK/Gradle hashes, plugin mappings, BOM resolution, binary
hashes, and remaining gates. It did not install an Android SDK, create or compile an app, run an emulator, or
change any approval gate.

## Sprint 5 Increment 3 implementation checkpoint — 2026-10-19

Increment 2 merged through PR #36 as `b6a3243981f74b3c3436862ba3c84472ba77d7a0`; post-merge
`main` run `39103456847` passed all eight required jobs. The test-account governance follow-up merged through
PR #37 as `a0c7b63b9c6dd560c763fc1cc9df5d6e1dc4cfb1`; post-merge run `39162465474` also passed all
eight jobs.

The readiness contract merged through PR #38 as `4dc05e81b3fae101077025f4ccb28f82bf48e72d`;
post-main run `39166750258` passed all eight required jobs. Marlon accepted iOS 17+, an iPhone-native
phone-first target, portrait-primary layouts with functional landscape, no iPad-native support claim, English
UI with Spanish learning content and pseudo/RTL probes, proposed unreserved repository identifiers, Adriana as
interim iOS/accessibility/asset implementer, and free public `macos-26` / Xcode 26.6 unsigned simulator CI. The hosted current runner does not include an iOS 17 runtime, so minimum-version compatibility is a separate free public `macos-14` / Xcode 16.2 lane. A third job accepts only the exact-head sanitized union. GitHub schedules `macos-14` retirement for 2026-11-02; recheck or replace that lane by 2026-11-01 while preserving the accepted iOS 17 baseline.

Increment 3 now implements the smallest internal SwiftUI foundation: Debug/Staging/Release configurations,
checked public non-production configuration with an inert Release path, deterministic loading/signed-out/safe
error states, Dynamic Type and VoiceOver semantics, 44-point actions, static reduced-motion behavior, an empty
no-tracking privacy manifest, typed no-op telemetry, system-only visuals, unit/UI targets, and traceable unsigned
simulator evidence. Constructor injection is limited to configuration and shell-state seams. There is no network client in this increment, so reachability/connectivity behavior remains explicitly ordered with the first authorized live client in Increment 6. The current Windows host still cannot produce Mac or simulator evidence; the approved GitHub
workflow compiled and tested candidate head `11e59c7ebe9e6b489bd239d6f78ac0fb59875ddd`. Protected run
`39177793990` passed all eight jobs, and iOS run `39177793985` passed the minimum-iOS-17 lane, current-runtime
lane, and sanitized aggregate. Generated evidence records 22 of 22 simulator-applicable rows passing; the 23
source rows remain an immutable readiness matrix and physical-iPhone evidence remains unattempted for Sprint 5
closeout. Isabella's product boundary review, Fernanda's 35/35 privacy gate, Danila's 31/31 UX/accessibility
gate, and Elana's 423/423 independent candidate audit cleared the narrow internal Increment 3 completion claim.
The final documentation/policy head still requires the same exact-head protected, platform, specialist, and
Elana gates before merge.

A 2026-10-19 local audit response briefly omitted the tracked braces advisory and correctly caused the stale-exception guard to fail. GitHub Actions and Elana then returned GHSA-vfj7-8cjw-p6xm for the same lockfile, so PR #39 retained the exact `braces@3.0.3` exception at that checkpoint. On 2026-10-23, a fresh audit no longer reported that advisory; the policy therefore removed its stale exception as required. The dependency and lock files remain unchanged. The High-threshold audit policy passes with zero exceptions and zero unapproved High or Critical findings, and the production-only `npm audit --omit=dev` reports zero vulnerabilities across all severities. The full `npm audit` currently reports two Moderate development-only findings in `@vitest/mocker` (GHSA-qxg6-89mg-rqv8 and GHSA-xp26-3454-mjgp), propagated to the direct `vitest@4.1.11` development dependency. The non-major `vitest@4.1.12` fix is available and must be tracked as a separate dependency slice; this documentation-only packet does not change any package manifest or lockfile.
Apple accounts, identifier reservation, signing, production endpoints, physical-device claims, TestFlight or
App Store actions, and spending remain separately gated. The proposed identifiers are repository settings only.

## Sprint 5 Increment 2 implementation checkpoint — 2026-10-18

Increment 1 merged through PR #35 as `8b506202319dacd4635d20787cd47e1ef1d5b7b8`; post-merge
`main` run `39101496376` passed all eight protected jobs. Increment 2 now adds the versioned
[mobile contract v1](../contracts/mobile/v1/README.md) and deterministic synthetic fixture bundle for
implemented HTTP endpoints only, plus shared-package compatibility, disclosure, privacy, retry, ownership,
and UUID-v4 boundary tests.

The bundle separates exact HTTP responses from nine no-response transport scenarios, models server-authoritative
billing projection and ADR 0003 past-due grace access, and records factual dashboard empty/complete/entitlement,
attempt replay/conflict, settings, failure, and account-switch behavior. Stripe Checkout/Portal/webhooks,
Supabase provider payloads, internal learning lifecycle hooks, native callback/telemetry/RevenueCat, tester,
campaign, social, store, and public-release APIs remain excluded. The audited implementation head `a697d6bd1576ca59fd0d6f6cb5897d7d676f90b0` passed all specialist gates:
Isabella 31/31 combined checks, Fernanda 27/27, Danila 42/42, and Elana 295/295 independent checks with zero
failed or unattempted. GitHub run `39102720332` passed all eight protected jobs. The full counted report is in
[review-report.md](review-report.md). Any later documentation-only head still requires a fresh eight-check run
before merge. PR #36 merged as `b6a3243981f74b3c3436862ba3c84472ba77d7a0`; post-merge `main` run `39103456847` passed all eight required jobs.

## Sprint 5 Increment 1 checkpoint — 2026-10-18

The accepted [Sprint 5 plan](SPRINT_5_PLAN.md) is merged on `main` as
`2457d5eb11d5034a6d93d6b0b10aaab21acb9ee6`; post-merge run `39100845190` passed all eight
required jobs. [SPRINT_5_DECISION_REGISTER.md](SPRINT_5_DECISION_REGISTER.md) is the active Increment 1
artifact. It separates proposed choices from approvals, names accountable review owners, inventories the actual
HTTP surface, labels learning export/deletion as internal-only hooks, and keeps the missing verified account
lifecycle API visible as a mobile/store blocker.

Isabella, Fernanda, and Danila supplied the decision evidence, market/social readiness, device/state,
accessibility, motion, asset, and acceptance-traceability gates. Material OS, form-factor, locale, identifier,
account, signing, domain, privacy, device, staffing, social, destination, rights, analytics, and release choices
remain proposed or blocked until their dated evidence exists. This increment performs no native scaffold,
credential, account, identifier, store, production, database, publishing, or spending action. Elana's independent
exact-head audit and all eight protected checks remain required before merge.

## Sprint 5 planning checkpoint — 2026-10-18

Sprint 4 is closed: PR #33 merged its reconciled roadmap and handoff as
`d85f6dcbe731b5a5890ab76672e08b4b1d1eef07`, and post-merge `main` run
`39100051441` passed all eight required checks. ADR 0004 and the mobile release plan are accepted.

[SPRINT_5_PLAN.md](SPRINT_5_PLAN.md) converts that architecture into eight dependency-safe increments:
decision and ownership records; versioned contracts and fixtures; separate iOS and Android foundations;
secure Supabase PKCE/session lifecycle; API shell and owner-safe state; shared experience foundations; and
traceable internal-build CI. The plan keeps Sprint 6 learning, Sprint 7 AI, Sprint 8 commerce/store release,
production changes, external account actions, and spend outside this phase.

Isabella, Fernanda, and Danila reviewed the planning boundary. Their gates require traveler-focused but
evidence-bounded claims, a no-acquisition internal-foundation phase, privacy-safe capture and analytics,
native state/motion/accessibility contracts, no imitation of later learning or commerce controls, and a
78-execution minimum cross-platform closeout matrix. Elana's independent exact-head audit remains required
before this planning increment can merge. No native project, credential, identifier reservation, store action,
production deployment, or database change was made by this planning work.

## Sprint 4 checkpoint — 2026-10-18

ADR 0005 and the Sprint 4 implementation plan are accepted. PR #26 recorded the contract and merged
as `ceefdc0edeb2b8dd77b86f32c2a7acdc1d13fcaa`. PR #27 added the safe learning error boundary,
replay-first attempt admission, and local 30-per-60-second limiter. Adriana's final audit counted 140
tests/checks, all passed; PR #27 merged as `9d3554436efef752c2dfbe196ea0d32ac0fc0b90`, and all eight
post-merge `main` checks passed.

PR #28 added the versioned catalog and owned learning projections and merged as
`e223f69b1604d40d5e8103e03fd1644d29ef5cfc`. Its forward-only migrations passed from an empty
database and on the preserved development database without changing existing billing/profile counts.
Adriana's exact-head audit counted 179 tests/checks, all passed, and all eight post-merge `main`
checks passed.

[PR #29](https://github.com/r1ruffrider/Fluyo/pull/29) is Sprint 4 increment 4. It adds
idempotent server-managed starter catalog content and protected, cursor-paginated lesson and
phrase-deck reads. Local validation passed the audit policy, Prisma
schema, lint, typecheck, 149 tests, production build, formatting, and diff check. Running the seed
twice preserved exact catalog counts (one lesson, three activities and immutable versions, one deck,
four phrases, and one lesson/deck membership). A read-only database smoke returned the complete
starter catalog without validation or answer fields. An isolated built API on port 4001 returned 200
for health and 401 for unauthenticated catalog requests; it was stopped after verification. The
existing services on ports 3000 and 4000 remain untouched. The primary checkout's local changes,
stashes, credentials, and database contents remain preserved.

Adriana's first PR #29 audit counted 167 checks: 165 passed and two adversarial cursor checks failed.
A forged lesson cursor could carry a sort key outside PostgreSQL's integer range, and a phrase-deck
cursor could carry a NUL byte; both reached Prisma instead of returning `400 invalid_request`. The
decoder now bounds lesson sort keys to positive PostgreSQL integers and rejects NUL-bearing deck
slugs. Boundary regression tests cover the maximum integer, maximum plus one, unsafe integers, and
NUL text. The repaired head then received a fresh eight-check CI run and exact-head re-audit.

The repaired head passed Adriana's 159-check re-audit and all eight exact-head checks. PR #29 merged
as `0ee6f74bc536ea3d5e145c1bc780157f31e27336`; post-merge `main` CI run `39081587057` passed all
eight jobs. [PR #30](https://github.com/r1ruffrider/Fluyo/pull/30) is Sprint 4 increment 5. It adds protected,
idempotent activity submission; one-transaction attempt, progress, and practice-day writes; UTC
bootstrap; streak calculation; goals; IANA timezone preferences; and reminder-preference storage.
A scoped real-database smoke used only a synthetic owner and cleaned it afterward: one first attempt
created one attempt/progress/practice-day row, identical replay returned the same attempt without an
increment, changed content returned `idempotency_conflict`, invalid choice rolled back, and the
preference bootstrapped to UTC.

A follow-up concurrency probe initially failed because Prisma cannot deserialize PostgreSQL's `void`
return from a direct advisory-lock select; its transaction rolled back and cleanup found no retained
synthetic rows. The query now selects an integer marker from the transaction lock function. The same
real-database probe then created the attempt successfully and removed its scoped synthetic rows.
A two-request real-database concurrency probe completed two different activities for one synthetic
owner and retained both completed activity IDs, two attempts, and a practice count of two; its rows
were also removed afterward.

The final local gate passed the dependency policy, Prisma schema, lint, typecheck, 176 tests (six
policy, four shared, and 166 API), production build, formatting, and diff check. An isolated built API
on port 4001 returned 200 for API/database health and 401 for unauthenticated attempt, goal, timezone,
and reminder requests; it was stopped after verification without touching the development services.

Adriana's first exact-head PR #30 audit counted 189 checks: 184 passed and five adversarial checks
failed across four defects. The repair removes boolean-to-number body coercion, awards progress and
daily practice only for the first correct completion, canonicalizes path/key UUIDs before replay
hashing and persistence, and keeps the in-memory write limiter unavailable in production through a
validated `LEARNING_WRITES_ENABLED` gate. Focused HTTP/service regressions cover boolean rejection,
incorrect-answer retryability, repeat-correct non-counting, case-variant replay with changed-payload
conflict, local enablement, and disabled/production behavior.

The repaired local gate passed the dependency policy, Prisma schema, lint, typecheck, 183 tests
(six policy, four shared, and 173 API), production build, formatting, and diff check. Gitleaks is not
installed locally, so the required committed-secret scan remains assigned to the exact-head GitHub
job. A new scoped real-database smoke used a synthetic owner and cleaned all of its rows: an incorrect
answer remained retryable with no progress/practice award, an upper/lowercase UUID retry returned the
same attempt, changed payload returned `idempotency_conflict`, the first correct answer awarded one
completion, and a second correct attempt left both completed IDs and daily practice at one.

Adriana's repaired-head audit passed 199/199. She marked PR #30 ready and squash-merged it as
`342f2edf751fc0b19e45ade6434794654f80bd0a`; post-merge `main` run `39083416521` passed all eight
jobs. Sprint 4 increment 6 now runs on `codex/sprint-4-lifecycle-observability`. It adds a module-
exported, provider-neutral learning-data export/delete hook and a bounded structured event/metric
contract. No public deletion endpoint or identity-provider deletion orchestration is claimed in this
increment.

The increment 6 real-database smoke created two scoped synthetic owners and cleaned every synthetic
row in `finally`. The export contained all six owned learning groups; the first delete removed six
rows, the retry removed zero, and the other owner's six learning rows remained. The target owner's
profile and Stripe-customer mapping remained present. A Prisma query-extension fault injected after
two delete statements proved the real PostgreSQL transaction rolled the whole learning deletion back,
leaving all six rows until final cleanup.

The increment 6 local gate passes the dependency policy, Prisma schema, lint, typecheck, 196 tests
(six policy, four shared, and 186 API), production build, formatting, and diff integrity. Gitleaks is
assigned to the exact-head GitHub job because it is not installed locally. One pre-final typecheck
caught a Prisma/local JSON type-boundary mismatch and passed after an explicit JSON boundary cast.
One combined focused run hit the existing five-second AppModule test timeout during a cold import;
the isolated module test and the subsequent complete API suite passed without a timeout change.

Adriana's independent increment 6 audit passed 215/215 with no blocked or unattempted checks. She
marked PR #31 ready and squash-merged it as `5d14bc21dfc6431a00f891e96196e2b398e2275f`;
post-merge run `39084682709` passed all eight required jobs. Increment 7 now runs on
`codex/sprint-4-dashboard` from that exact main commit.

Increment 7 adds the protected `GET /learning/dashboard` aggregate and `/dashboard` web route. The
aggregate selects the first accessible activity not completed across any owned progress row while
returning only five recent progress summaries. The web route uses verified Supabase server sessions,
safe allowlisted return routing, idempotent server-action submissions, confirmed-result refresh,
first-use/ready/completed/catalog-empty/entitlement-required/total-failure states, and an independent
billing-status fallback. Next.js 16.3.8 runs with Webpack on port 3000; the current Nest branch runs
on port 4000, and database health reports reachable against the preserved Compose volume.

The increment 7 local gate passes 228 tests (six policy, four shared, 194 API, and 24 web), lint,
typecheck, Prisma validation through the preserved root environment, formatting, the exact audit
policy, production build, and diff integrity. Eight live HTTP/service assertions pass. A dedicated
visible audit profile completed the authenticated activity, reload/sign-in persistence,
320/390/768/1440, keyboard/focus/reduced-motion, failure-state, and console/network matrix. No browser
cookies or credentials were copied from another profile, and no real database rows were changed for
failure-state simulation.

Draft PR #32 initially passed seven of eight required jobs. Tests run `39086066850` exposed a clean-
checkout-only package-resolution defect: the web Vitest suite found `@fluyo/shared` locally only
because `packages/shared/dist` already existed. `apps/web/vitest.config.ts` now aliases the shared
workspace source, matching the API test configuration. All 17 web tests pass with the shared `dist`
directory temporarily absent. PR #32 remains draft and Adriana retains the phase gate.

Adriana's responsive code audit also found that the first mobile rule hid Account and the only Sign
out control at 320/390 widths. The header now wraps onto a second navigation row and preserves
Account, Billing, and Sign out as 44px targets. Her exact-head browser re-audit remains required.

The same audit found two state defects. Auth errors now preserve the allowlisted encoded `next` path,
with four action-level regression tests. Activity attempts now track the last submitted choice in a
synchronous ref, so a choice changed while the previous request is pending rotates the idempotency key
before the next submission. The same-choice retry still retains its key after an ambiguous failure.

Elana's independent audit then found that a correct server action could refresh to the next activity
without remounting the client card, preserving the prior correct state and idempotency key. The card
is now keyed by activity ID, and its defensive disabled state applies only when the result belongs to
the current activity. State tests and a rendered-page structural regression prove the cross-activity
key changes. A live no-reload A-to-B transition also passed against a temporary in-memory API without
touching the real database; the real API/database were restored healthy with 3/3 progress preserved.
Elana's independent exact-head audit passed 255 of 255 checks with zero failed or unattempted. PR #32 merged as `0ced1d4a80a42ac1cdf6d2bcee63a3d64cb78f59`; post-merge `main` run `39099767691` passed all eight required jobs. Sprint 4 is complete, and the next roadmap phase is Sprint 5 after its ADR 0004 prerequisite is reconciled.

## Sprint 3.5 completion — 2026-10-17

Marlon delegated the Fluyo phase merge gate to Adriana and approved the pending merge sequence.
Adriana independently confirmed the exact heads, required checks, merge order, and phase evidence.
The pull requests were updated as needed, marked ready, and squash-merged without bypassing branch
protection:

- PR #23, launch marketing and native mobile release plans: `f34836f28eb14e731136835ed67d0003af974890`
- PR #24, playful learner-facing phrase sprint: `4870a957f69da07706522333bffac7728f97e61c`

PR #24's standing phase audit counted 58 executions: 54 passed and four pre-fix or diagnostic checks
failed; all four affected areas subsequently passed retests included in the 54 passes, leaving no
blocker. After PR #23 merged, PR #24 was updated from `main`; the new exact head
`4fd9ce8775a9eb46ddc93a36bcf450d632b33803` then passed all eight protected CI checks before merge.
The localhost experience remains available at
`http://localhost:3000` for review. No production deployment, store publication, production billing,
or advertising spend occurred.

Sprint 3.5 is complete. The next governed phase is Sprint 4: define the authenticated dashboard
acceptance criteria and canonical owned learning-domain schema/API contracts before implementation.

## Merge completion — 2026-10-17

Marlon explicitly approved the final merge sequence. The four remaining pull requests were updated
from the latest `main`, required all eight protected CI jobs to pass, were marked ready for review,
and were squash-merged in order:

- PR #16, Windows setup and handoff: `c3acaadd2ec4dea74542fab904f1ec97b57725a4`
- PR #18, Webpack development fallback: `5c333437b7216c9bb2945f724489eb3085ce3598`
- PR #19, cancellation projection and billing verification: `a101f70394105da475a4a0ffcccde49a68a6f904`
- PR #20, Checkout return billing-status copy: `3501096f400622696836efee2892e67057e83935`

Issue #12 was closed as completed after PR #19 merged. Its completion comment links the merged
implementation and the full test-mode lifecycle report. Both test subscriptions remain canceled
with no active entitlement grants. No production billing or deployment was used.

Final local service checks return 200 for the API, database health, and login page. The development
stack continues to use Webpack on port 3000, the API on port 4000, the existing PostgreSQL volume,
and the test-mode Stripe listener forwarding signed events to
`http://localhost:4000/api/v1/billing/webhooks/stripe`. The primary checkout's known generated and
CRLF-only status entries, both stashes, credentials, and database contents remain preserved.

PR #18 required one safe CI retrigger after GitHub reported the workflow and every Build step as
successful while leaving the required Build check-run in progress. The replacement run completed
all eight checks successfully; no check, severity threshold, or protection was weakened. Issue #21
remains open for the exact `braces@3.0.3` exception that expires October 30, 2026.

## Continuation checkpoint — 2026-10-17

Adriana took over the engineering-owner task with access to the shared checkout, GitHub connector,
development services, and team mailbox. Read-only reconciliation confirms that PR #17 is merged at
`b1548087`; draft PRs #16, #18, #19, and #20 remain open and mergeable against that main baseline.
Each latest workflow has exactly the eight required jobs, and all eight pass. Issues #12 and #21
remain open. The four draft PRs still require Marlon's explicit merge approval.

The local checkout remains on `codex/stripe-cancel-at-projection` and is behind the remote PR head.
The known CRLF-only status entries, Next-generated files, unrelated files, two stashes, credentials,
and database contents were left intact. No broad stage, reset, install, migration, reseed, or volume
replacement was performed.

Docker Desktop again encountered inaccessible AF_UNIX runtime sockets. With Docker stopped, the
new runtime directories were renamed in place and preserved:

- `%LOCALAPPDATA%/Docker/run.stale-20261017-adriana`
- `%LOCALAPPDATA%/Docker/run.stale-20261017-adriana-retry`
- `%LOCALAPPDATA%/docker-secrets-engine.stale-20261017-adriana`

The third start brought the existing engine back without a factory reset. Compose reused the
three-month-old `fluyo-postgres-1` container and existing volume; PostgreSQL reports healthy.

A direct `npm run dev` recheck reproduced the Next.js 16.3.8 Turbopack panic on the first
`/login` request and returned HTTP 500. The API and database health endpoints returned 200.
Restarting the web application explicitly with Webpack made `/login` return 200 and unauthenticated
`/billing` redirect with 307, reinforcing the fix already isolated in draft PR #18.

Stripe CLI 1.53.1 now requires an explicit event selection. The test-mode listener was restarted with
`--all-snapshot`, forwarding to
`http://localhost:4000/api/v1/billing/webhooks/stripe`. A read-only comparison confirmed that the
listener's signing secret still matches root `.env` without printing either secret. The authenticated
lifecycle evidence remains the completed report in PR #19; no production billing was used.

## Current result — 2026-10-16

The original startup and billing blockers below were resolved later on October 16. The
authenticated [issue #12 billing run](https://github.com/r1ruffrider/Fluyo/pull/19)
and its [full evidence report](https://github.com/r1ruffrider/Fluyo/blob/codex/stripe-cancel-at-projection/docs/BILLING_VERIFICATION_2026-10-16.md)
now show real monthly and annual test-mode Checkout, a redeemed one-use promotion,
signed webhooks, Customer ownership, ACTIVE and TRIALING projection, payment failure and
recovery, Portal cancellation, entitlement revocation, and duplicate-event handling.
Both test subscriptions were left CANCELED with no active grants.

The API and PostgreSQL health endpoints return 200. Next.js 16.3.8 Turbopack later
panicked on the first billing request in Windows, so the verified browser run uses
Webpack. [Draft PR #18](https://github.com/r1ruffrider/Fluyo/pull/18) makes that
development default. [PR #17](https://github.com/r1ruffrider/Fluyo/pull/17) merged
the critical shell-quote patch and the authorized, time-boxed braces exception into
main at `b1548087`. [Draft PR #19](https://github.com/r1ruffrider/Fluyo/pull/19)
fixes scheduled-cancellation projection and the canceled date shown in billing.
[Draft PR #20](https://github.com/r1ruffrider/Fluyo/pull/20) corrects stale Checkout
return copy and links to the current billing status. The four remaining PRs are
draft and unmerged.

Current local verification has 110 passing tests, with schema, lint, typecheck,
formatting, production build, and production-only audit passing. The eight required CI
jobs remain in place, and all eight pass on each of the four remaining draft PRs after
updating them from main. Marlon confirmed that `past_due` retains grace-period access
under ADR 0003. Issue #12's conflicting wording was corrected; the issue remains open
until draft PR #19's UI fix is merged.

Automatic time-advanced renewal is blocked because Stripe test clocks attach to new
Customers and the authenticated user already has a preserved Customer mapping. A
second-user Checkout is blocked because only one confirmed non-production Supabase
identity was available. PR #19 now includes focused ownership tests proving that
conflicting Customer metadata and a second Customer for an already-mapped user roll
back before subscription or entitlement writes. These two blocked matrix items are
additional coverage and are not issue #12 acceptance criteria.

Read-only audit reconciliation traced `braces@3.0.3` through
`eslint-config-next@16.3.8` → `@next/eslint-plugin-next` → `fast-glob` →
`micromatch`. The npm registry's latest `braces` release is still 3.0.3 and
the advisory covers that version. npm's offered path downgrades
`eslint-config-next` to 14.2.35, conflicting with pinned Next.js 16.3.8.
The exact development-only exception is tracked in
[issue #21](https://github.com/r1ruffrider/Fluyo/issues/21), expires October 30,
2026, and cannot extend automatically. No threshold reduction, broad suppression,
or check bypass was made.

The sections below preserve the earlier startup checkpoint. Their billing blockers
and initial Turbopack observation were superseded by the results above.

## Initial scope and reconciliation — 2026-10-16

Work is limited to reliable local startup and [issue #12](https://github.com/r1ruffrider/Fluyo/issues/12).
No later sprint, production billing, deployment, or merge is authorized.

- Remote main remains `7cb59328812c64274af8ffdfb44e66b1c6a4b947`; no open PRs at initial reconciliation.
- Local main is one commit ahead: `3864bd1` adds only `.claude/launch.json`. It remains on local main.
- Both existing stashes were preserved. No credentials, database rows, or Docker volumes were deleted.
- Work branches start from remote main so the unrelated local commit is excluded.
- GitHub CI run `37067759148` passed on remote main. Branch protection still requires the eight
  original jobs, with strict checks and administrator enforcement. This is historical CI evidence,
  not proof that a fresh audit passes today.

## Initial startup findings and recovery

The previous `npm ci` failed with `EPERM` while unlinking the Windows Lightning CSS native module.
The incomplete install had no `node_modules/.bin/dotenv.cmd`; later `npx dotenv` attempts resolved
the non-executable `dotenv` library. A single fresh `npm ci` completed with npm 11.13.0 and Node
24.17.0, including Prisma Client 6.19.3 generation. No force upgrade was used.

`npm run dev` now starts both applications from root `.env`. Next.js 16.3.8 serves pages with
Turbopack in this run; a Webpack fallback was not necessary. The browser rendered the home page
with “Backend available” and the sign-in form.

Docker Desktop initially crashed on inaccessible stale AF_UNIX socket files. With Docker stopped,
the runtime directories were renamed in place and retained, rather than resetting Docker:

- `%LOCALAPPDATA%/Docker/run.stale-20261016`
- `%LOCALAPPDATA%/Docker/run.stale-20261016-retry`
- `%LOCALAPPDATA%/docker-secrets-engine.stale-20261016`

Docker Engine 29.6.1 then started. The existing `fluyo-postgres-1` container and
`fluyo_postgres_data` volume were reused; PostgreSQL is healthy and all three migrations are current.
No migration, reseed, or database reset was needed.

## Initial verification results (superseded where noted above)

| Check                                        | Result                       | Evidence / limitation                                                           |
| -------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| Clean lockfile install and Prisma generation | Passed                       | `npm ci` completed                                                              |
| Shared-package build                         | Passed                       | TypeScript build completed                                                      |
| API health                                   | Passed                       | `GET /api/v1/health` returned 200                                               |
| PostgreSQL and API database health           | Passed                       | Healthy Compose service; `GET /api/v1/health/database` returned 200             |
| Migration status and Prisma schema           | Passed                       | Three migrations current; schema valid                                          |
| Browser startup                              | Passed                       | Home and login rendered; backend available                                      |
| Lint and typecheck                           | Passed                       | All workspaces                                                                  |
| Tests                                        | Passed                       | 6 audit-policy + 1 shared + 100 API tests; these are not live billing proof     |
| Production-only audit                        | Passed                       | Zero vulnerabilities                                                            |
| Full audit and dependency policy             | Failed                       | `shell-quote` critical advisory and `braces` high advisory; no exceptions added |
| Formatting                                   | Passed after checkout repair | Exact committed LF bytes restored only for verified unchanged files             |
| Production build                             | Passed                       | Shared, API and web builds passed with NODE_ENV=production                      |
| Fresh committed secret scan                  | Unattempted                  | Pending draft PR CI                                                             |
| Unauthenticated billing status               | Passed                       | HTTP 401 with safe error envelope                                               |
| Missing / invalid webhook signatures         | Passed                       | Real HTTP requests returned 400 with safe errors                                |
| Stripe test configuration                    | Blocked                      | Read-only price lookup returned HTTP 401 `api_key_expired`                      |
| Authenticated Fluyo flow                     | Blocked                      | Available browser has no session; secure user sign-in requested                 |

`.gitattributes` now declares LF checkouts to match `.editorconfig` and Prettier without reducing the
formatting check. A broad rewrite was rejected by automatic approval review. Read-only comparison
then proved each remaining failure was CRLF-only in an unchanged file. The approved repair restored
exact HEAD bytes only when normalization matched HEAD and Prettier, rechecking before writing and
skipping modified files. This produced no source-content diff.

The first production build inherited development NODE_ENV from .env and failed prerendering;
explicitly selecting production corrected it without an application change. Read-only baseline counts
were zero for customer mappings, subscriptions, entitlements, and the webhook ledger.

Next development generates
`apps/web/AGENTS.md`, `apps/web/CLAUDE.md`, and changes `next-env.d.ts` to development type paths;
these generated changes are not billing implementation changes.

## Initial issue #12 lifecycle matrix (superseded by linked report)

At this initial checkpoint, all rows below were **blocked / unattempted** because the
local Stripe test key and authenticated session were not yet available. Later results appear
in the linked billing report.

| Scenario                      | Required evidence                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monthly / annual Checkout     | Initiate from authenticated `/pricing`; server chooses configured Price and Customer; complete test payment                                                |
| Promotion code                | Stripe applies an eligible test promotion and invoice reflects it                                                                                          |
| Signed delivery               | Listener forwards to `http://localhost:4000/api/v1/billing/webhooks/stripe`; its signing secret equals the API's root `.env` value; real event returns 2xx |
| Ownership                     | Verified Supabase UUID, Customer mapping, subscription metadata, projection and entitlements agree; a second user cannot select that Customer              |
| Active state                  | Database projection and entitlements match Stripe; `/billing` shows plan, Active badge, renewal date and keys                                              |
| Trialing state                | Real test subscription trial; synchronized trial-end date renders                                                                                          |
| Renewal / payment failure     | Provider event and invoice evidence; current projection and entitlement policy agree                                                                       |
| No-access state               | `unpaid`, `paused`, or canceled subscription revokes access; warning renders with no active grants                                                         |
| Portal / cancellation         | Portal derives Customer server-side; cancellation webhook updates state and UI                                                                             |
| Replay / idempotency          | Redeliver the same real event; one ledger row and no duplicate side effects                                                                                |
| Out-of-order / reconciliation | Delayed real event retrieves current Stripe state and cannot revert it; distinguish replay of processed event from reconciliation                          |
| Redirect independence         | Success/Portal return alone leaves database and grants unchanged                                                                                           |

At this initial checkpoint, issue #12's “past_due / no-access” wording conflicted with accepted
ADR 0003: `past_due`, `active`, and `trialing` grant access under the shared policy. Marlon later
confirmed grace-period access and the issue wording was corrected.

Code inspection at this checkpoint found that the billing page used renewal wording for an
immediately canceled subscription and did not receive `canceledAt` in its summary contract.
This gap was reproduced and fixed in draft PR #19.

## Secure configuration used

The user updated the ignored root `.env` to a valid `sk_test_` key for the account holding
the monthly and annual Prices. The user signed in through the local browser. The CLI listener
forwarded to the local API, and its `whsec_` matched the server configuration without
printing either value. Root `.env.local` is not the source for `npm run dev`.

## Increment 5 live-auth readiness checkpoint — 2026-10-23

PR #44 merged the provider-neutral auth-state contract as `c6db1e3ded889eac5851eda7cc6d0891bf6d456a`; post-main run `39857882291` passed all eight protected jobs. PR #45 then merged the credential-free [live-auth readiness packet](../contracts/mobile/auth-readiness/v1/README.md) as `7ac566231a2e26fc1043aab40d33a24964127355`. PR #46 merged the squash-ancestry repair as `c97fffbb48d5c35e38a103a4b68e1a4cbaaf69ee`, and post-main protected run `39941301847` passed 8/8 jobs. The current branch slice is the candidate-only [pre-approval evidence packet](../contracts/mobile/auth-readiness/v1/evidence/index.json) bound to `c97fffbb48d5c35e38a103a4b68e1a4cbaaf69ee`.

The packet records prerequisites only. All decisions remain proposed or blocked; native runtime remains 0; all 24 native rows remain unattempted. No SDK, callback domain, AASA, assetlinks file, Supabase allowlist, Keychain or Keystore adapter, service account, recovery delivery, revocation, deletion, signing, production, device, capture, store, public claim, credential, or spend action is authorized by this checkpoint.

### Candidate-only evidence handoff

The credential-free [pre-approval evidence index](../contracts/mobile/auth-readiness/v1/evidence/index.json) is bound to main `c97fffbb48d5c35e38a103a4b68e1a4cbaaf69ee` and the unchanged decision-policy raw SHA-256 `3e2aa6dabb4e9fe28b1b80e10f705f3df3968f85ed0e4e18ca8a0eb97ff9d696`. Four digest-bound documents separate observed repository fact, proposed material choice, external blocker, and unattempted runtime. Every packet, row, and requirement satisfaction flag is false, so this candidate-only packet satisfies no approval requirement. Runtime remains 0 conducted, 0 passed, 0 failed, and 24 unattempted; the provider-neutral contract remains 10 states, 50 transitions, and 28 synthetic scenarios.

Marlon selected the append-only, content-addressed, squash-compatible model. The earlier `P → A → V` proposal is retained only in the immutable historical packet. The operative governance record is `contracts/mobile/auth-readiness/v1/approval-history/records/7ba81df658a221c77dbe83f57057aceae2e166af73751afcf94f540c00a3cd75.json` (`7ba81df658a221c77dbe83f57057aceae2e166af73751afcf94f540c00a3cd75`).

The reconciled division is: Adriana is orchestrator and merge owner; Bianca owns administration and records; Camila owns UX and accessibility; Daniela owns visual, mobile, and motion; Elana is the sole independent exact-head QA gate; Fernanda owns social plus the scoped auth privacy boundary only; Gabriela owns research; Isabella owns marketing and claims; Julieta owns numbers and financial claims; Catalina owns architecture and contracts; Valentina is the primary implementation owner for backend, frontend, and database work; Renata owns environment and CI; Natalia owns security. Adriana implements directly only for a small urgent repair when delegation is riskier and must record why.

No SDK is selected, approved, installed, or verified. No link, host, association file, dashboard value, storage adapter, external account, credential, signing asset, production value, device evidence, recovery delivery, revocation, deletion, store action, spending action, or public availability claim is created by this slice.

## Immediate escalation and no-idle rule — 2026-10-23

Whenever work reaches a boundary requiring Marlon's explicit approval, secure access or a secret, an external-account or spending action, a destructive or irreversible action, or a material product decision, Adriana notifies Marlon immediately through the Codex app. The notice states the exact requested action, the reason, the affected pull request or phase, and the safe work already completed. It contains no credential or secret.

All independent authorized workstreams continue while approval or access is pending. After a pull request satisfies the standing exact-head gate, Adriana marks it ready, merges it, verifies every applicable post-main workflow, and advances automatically under the existing authorization.

At the start of every current and future phase, Adriana reconciles the complete current agent roster, including newly added agents, and assigns every relevant specialist a bounded responsibility, evidence requirement, and handoff. A newly available specialist is not omitted because an earlier plan predates that role. Adriana remains the orchestration and merge owner, and Elana remains the sole independent exact-head QA and code-review gate. When names or roles are not yet exposed, the phase records that gap and reconciles it as soon as the authoritative roster becomes available; it does not invent an assignment.

Elana PASS on the current exact head is the execution trigger. Adriana immediately reconciles every remaining protected, specialist, and platform gate plus GitHub mergeability. If all standing exact-head conditions pass, Adriana marks the pull request ready, merges under the standing authorization, verifies every post-main workflow, updates the handoff and status, and starts the next authorized phase, pull request, or build-plan step without waiting for another user instruction. If another gate fails, engineering repairs it and obtains a fresh Elana exact-head PASS. If the next step crosses an undelegated approval boundary, Adriana notifies Marlon immediately and continues every independent safe workstream.

Adriana and the roster reconcile every authorized completed-PR handoff and next-phase start immediately and resume or dispatch safe work without avoidable delay. A 12-hour idle period is a hard process breach, not a permitted wait, polling interval, or grace period. App or email notification is escalation only and never substitutes for required approval. Elana remains the sole independent exact-head QA and code-review gate.

## Native-auth approval ledger handoff — 2026-10-24

After Catalina architecture, Natalia security, Renata environment and CI, every relevant domain specialist, protected CI, and Elana exact-head PASS last all pass against the same frozen subject commit and bundle, Adriana may approve and merge a credential-free, repository-only, non-production native-auth phase under the recorded delegation. Adriana cannot accept any of the fourteen material native-auth decisions. Production, credentials or secrets, signing, store or release, spend, destructive or data actions, external accounts or dashboards, domains, physical devices, and publication remain gated to Marlon.

The four genesis paths and digests are recorded in the [approval-history index](../contracts/mobile/auth-readiness/v1/approval-history/index.json). The direct tooling authorization is `DEPENDENCY_LOCK_REMEDIATION_OPTION_A`, record `3300a0d7cc9f6e3661a31946ab20aaf79b3758dd207875a042a5c9b7f554d2e3`; it is distinct from the retired native-auth governance alternatives and authorizes only the exact atomic Vitest development-tool bundle from historical provenance `a886b75af125b5a69e2ee3f42471ceb2700eeec1`. The delegation becomes usable only after the read-only base-controlled `pull_request_target` control plane and ledger merge. That control plane executes exact base validator bytes and treats the candidate checkout only as bounded data. New review and phase records name a frozen subject commit `T` already preserved by the pull-request base; the later ledger append commit `L` cannot self-reference. The full fold reports current effective approvals, and any later superseding FAIL or delegation revocation makes the earlier approval ineffective until fresh PASS gates and a new approval are appended.
