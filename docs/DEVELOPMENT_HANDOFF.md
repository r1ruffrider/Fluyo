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
reviewer fails closed. Gate review ordinals must be unique and gap-free, with Elana's exact-head
review greatest and final.

All initial and superseding values are checked against decision-specific closed shapes plus a
recursive secret/capability boundary; a false top-level boundary cannot hide a nested runtime,
dependency-installation, credential, or token authorization. The PR-B fixture validates an actual
frozen subject `T`, append commit `L`, and squash-equivalent head, and fails stale concurrent bases,
historical index-prefix changes, and unindexed record files. The record's frozen subject commit must
already be an ancestor of the exact PR base; candidate-only provenance is rejected before squash can
discard it.

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

Whenever Marlon must approve an action or make a material decision, Adriana presents mutually exclusive choices as app-native clickable selection buttons. The Recommended choice appears first and each choice states its consequence or tradeoff. The exact selected button is the approval or decision record. No secret value appears in a button or prompt. If app-native controls are unavailable, Adriana says so explicitly and uses concise numbered choice codes.

All independent authorized workstreams continue while approval or access is pending. After a pull request satisfies the standing exact-head gate, Adriana marks it ready, merges it, verifies every applicable post-main workflow, and advances automatically under the existing authorization.

At the start of every current and future phase, Adriana reconciles the complete current agent roster, including newly added agents, and assigns every relevant specialist a bounded responsibility, evidence requirement, and handoff. A newly available specialist is not omitted because an earlier plan predates that role. Adriana remains the orchestration and merge owner, and Elana remains the sole independent exact-head QA and code-review gate. When names or roles are not yet exposed, the phase records that gap and reconciles it as soon as the authoritative roster becomes available; it does not invent an assignment.

Elana PASS on the current exact head is the execution trigger. Adriana immediately reconciles every remaining protected, specialist, and platform gate plus GitHub mergeability. If all standing exact-head conditions pass, Adriana marks the pull request ready, merges under the standing authorization, verifies every post-main workflow, updates the handoff and status, and starts the next authorized phase, pull request, or build-plan step without waiting for another user instruction. If another gate fails, engineering repairs it and obtains a fresh Elana exact-head PASS. If the next step crosses an undelegated approval boundary, Adriana notifies Marlon immediately and continues every independent safe workstream.

Adriana and the roster reconcile every authorized completed-PR handoff and next-phase start immediately and resume or dispatch safe work without avoidable delay. A 12-hour idle period is a hard process breach, not a permitted wait, polling interval, or grace period. App or email notification is escalation only and never substitutes for required approval. Elana remains the sole independent exact-head QA and code-review gate.

## Native-auth approval ledger handoff — 2026-10-24

After Catalina architecture, Natalia security, Renata environment and CI, every relevant domain specialist, protected CI, and Elana exact-head PASS last all pass against the same frozen subject commit and bundle, Adriana may approve and merge a credential-free, repository-only, non-production native-auth phase under the recorded delegation. Adriana cannot accept any of the fourteen material native-auth decisions. Production, credentials or secrets, signing, store or release, spend, destructive or data actions, external accounts or dashboards, domains, physical devices, and publication remain gated to Marlon.

The four genesis paths and digests are recorded in the [approval-history index](../contracts/mobile/auth-readiness/v1/approval-history/index.json). The direct tooling authorization is `DEPENDENCY_LOCK_REMEDIATION_OPTION_A`, record `3300a0d7cc9f6e3661a31946ab20aaf79b3758dd207875a042a5c9b7f554d2e3`; it is distinct from the retired native-auth governance alternatives and authorizes only the exact atomic Vitest development-tool bundle from historical provenance `a886b75af125b5a69e2ee3f42471ceb2700eeec1`. The delegation becomes usable only after the read-only base-controlled `pull_request_target` control plane and ledger merge. That control plane executes exact base validator bytes and treats the candidate checkout only as bounded data. New review and phase records name a frozen subject commit `T` already preserved by the pull-request base; the later ledger append commit `L` cannot self-reference. The full fold reports current effective approvals, and any later superseding FAIL or delegation revocation makes the earlier approval ineffective until fresh PASS gates and a new approval are appended.

## Sprint 6 R0 public-evidence handoff — 2026-10-31

The [Duolingo public-evidence study](research/2026-10-31_duolingo-public-evidence-study_v1.md), [dated build plan](2026-10-31_sprint-6-learning-experience-build-plan_v1.md), and accepted [ADR 0007](adr/0007-learning-experience-and-operational-boundaries.md) define an original, credential-free Fluyo workstream. Controlled-replay ID `ev_929eebe1b1d987c31030811d071ab83ac3563182a8c93c99853f193fce9359af` is session-local evidence currently `UNAVAILABLE/UNKNOWN`: no matching REA record, native dossier, or evidence bundle was retained, so it is not independently auditable and supports no repository claim. The study keeps the exact nine repository-canonical limitations and does not present them as an export of the unavailable replay payload.

Marlon explicitly accepted the byte-unchanged ADR 0007 document in Codex on 2026-10-31 at exact `main` `496518f9c0fc340ac2bc1152076c35381adb9aca`. The accepted blob `78c84f2307f57216ecb8d4ddf8bbdf898bbe2ae1` is unchanged from R0 merge `fa9ecb17180fde1723032ff2c0b43b43cead9d57`. This status record changes no existing boundary and authorizes no production, signing, store, spend, credential, external-account, publication, or destructive action.

The 2026-10-31 US App Store capture labels SRC-013 “Duolingo: Learn Languages.” SRC-014 is labeled descriptively as the Duolingo Android Google Play listing, with its canonical title `dynamic/UNKNOWN`; the US/en capture uses `hl=en&gl=US`. That dated capture observed the title “Duolingo: Learn Languages” and update label Oct 26, 2026, but both are dynamic, region-dependent capture context: no transient Google Play title is canonical, and the canonical update date remains `UNKNOWN`.

The study uses official/public evidence only and separates observation, inference, unknown, and company-reported numerical claims. It excludes Duolingo code, assets, lesson text, screenshots, sounds, characters, algorithms, trade dress, private APIs, traffic interception, DRM bypass, and account automation. Fluyo retains the original Conversation Canvas direction and server-confirmed Learning Core authority from ADR 0005.

R0 is documentation and a regression guard only. R1 may add shared closed contracts with no API, database, UI, dependency, SDK, or external-service change. R2 may add a read-only zero-or-one planner with the existing dashboard fallback. R3 may add a repository-owned default-disabled optional policy and typed no-op sink. R4 requires a separate dated design specification before any web-only UI. Offline writes, social/economy, notifications, audio, native learning, production, signing, stores, spending, credentials, and external accounts remain gated.

The complete 13-agent roster has bounded ownership in the build plan. Elana remains the sole independent exact-head QA and code-review gate. PR #61 remains a separate draft; its required-check external setting is unchanged, native runtime remains zero, and all 24 live-auth rows remain unattempted. This R0 work cannot clear or modify those facts.

## Approved staged R4-B amendment — Choice A — 2026-11-01

Marlon selected **A** and approved this exact staged amendment:

> A — Approve staged R4-B amendment: R4-B1 is a preparatory, credential-free repository phase for
> runtime, dev fixture, zero-egress protection, production exclusion, harness and topology-neutral
> evidence core; its exit gate is bounded specialist review, protected CI, mergeability and Elana
> exact-head code/security/build PASS, and it makes NO runtime/accessibility completion claim. R4-B2
> establishes and approves trusted baseline commit A on main, then captures from descendant source S
> under separately approved pinned tool/provider/install controls. R4-B3 records E1 direct child of S
> with review only and E2 direct child of E1 with cleanup only, and requires the complete 10,800-cell,
> 86,400-artifact, 49-transition browser/AT evidence plus Elana runtime/AT PASS before R4-B
> completion.

This decision amends phase sequencing plus the explicitly enumerated real-capture packaging,
resource-budget, raw-bundle encoding, and manual-review rules in ADR 0008. It preserves the closed
10,800-cell, 86,400-artifact, and 49-transition cardinalities; exhaustive automated validation;
trusted `A`, descendant `S`, exact-source run `R`, review-only `E1`, and cleanup-only `E2` lineage;
content addressing; reviewer attestation; retention; fail-closed behavior; and Elana's final
runtime/browser/assistive-technology authority. It does not convert any historical specialist FAIL
or unattempted runtime or assistive-technology row to PASS.

The exact repository heads and candidate manifests at the amendment boundary are:

- verified `main`: `b0f32d97e6d763e4cf080b1854ac1db4ee695d6a`;
- committed R4-B implementation parent: `6914b5644849f562f38b018814be3f476213be81`;
- historical route-repair ten-path manifest before the zero-egress repair:
  `439854c9967329634a18fc7a45f90371bc797cb73509373a7e41837ee44f5f1c`;
- route plus zero-egress security-repair candidate manifest:
  `3f83f8f19259dbbf377f603fee28668c773301f9a7dd68b754af96338ffc507e`.

The `439854c9…` manifest is historical and cannot clear the repaired candidate. The `3f83f8f1…`
manifest identifies the route/security-repair candidate before this records amendment. Integrating
this record requires a fresh document-inclusive manifest and rerun exact-head gates; neither digest
may be presented as the final post-integration subject.

Current counted evidence remains deliberately separated:

- **PASS, historical only:** Catalina 24/24 and Renata 28/28 on `439854c9…`; these results predate the
  zero-egress repair and do not transfer.
- **FAIL, historical defect finding:** Camila 26/27 on `439854c9…` because the handoff mixed earlier
  specialist evidence with the current manifest. The documentation repair resolves the wording, but
  a fresh Camila gate is still required.
- **FAIL, historical defect finding:** Natalia 17/18 on `439854c9…` because the routable fixture could
  bind the live submission action. The zero-egress repair makes fixture submission inert, omits the
  form action, and preserves the authenticated runtime action, but a fresh Natalia gate is still
  required.
- **PASS, implementation checks on the zero-egress repair:** focused 7/7 files with 814/814 tests;
  full web 10/10 files with 832/832 tests; web typecheck, lint, scoped formatting, and
  `git diff --check` passed. These checks are not independent specialist or Elana clearance.
- **UNATTEMPTED:** browser runtime, assistive technology, rendered contrast, actual 200% zoom/reflow,
  runtime motion/interruption, and computed reduced-motion evidence remain 0 executed. All 10,800
  cells, 86,400 per-cell artifacts, and the separate 49-record transition artifact remain required.

R4-B1 explicitly excludes credentials, live production data, provider/dashboard changes, external
accounts, purchases or spend, deployment, production, signing, device/store actions, publication,
and any runtime/accessibility completion claim. R4-B2 pinned tool, provider, installation, capture,
credential, or external-service actions require their separately approved controls and are not
authorized by Choice A alone. R4-B3 cannot begin from fabricated, caller-supplied, stale, or
pre-repair evidence and cannot complete until the full evidence set, trusted review/cleanup chain,
and Elana runtime/AT PASS exist.

**Next action:** merge this amendment only after its own exact-head documentation gates pass. Then
integrate the route and zero-egress repair with the topology-neutral evidence core, compute a fresh
R4-B1 manifest, rerun the bounded specialist gates on those exact bytes, and obtain protected CI,
mergeability, and Elana's final unchanged-head code/security/build PASS. Only after R4-B1 merges and
its applicable post-main workflows pass may the team prepare R4-B2's trusted baseline `A`; no R4-B2
capture or R4-B3 review/cleanup action is implied by this record.

## R4-B1 working-tree implementation candidate — 2026-11-02

The R4-B1 candidate is an uncommitted and unstaged working-tree integration on verified `main`
`7a31f3b1ff7806419dcde1b0a86cbeb933f1feb1`. It carries the approved authenticated web runtime from
historical implementation commit `6914b5644849f562f38b018814be3f476213be81`, the later development
route and zero-egress repairs, and the six-file topology-neutral evidence core. The twenty-two
application and evidence files comprise nineteen unchanged files that match their reviewed
source-worktree SHA-256 values plus the three Conversation Canvas heading/style files carrying the
documented Camila repair and bound by the current 24-path manifest. The obsolete
`apps/web/app/__fixtures/conversation-canvas` private-folder paths are absent; the development page is
the routable `/dev-fixtures/conversation-canvas` path.

The exact 24-path candidate surface is:

- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/dashboard/page.spec.tsx`
- `apps/web/app/learn/session/actions.ts`
- `apps/web/app/learn/session/conversation-canvas-state.ts`
- `apps/web/app/learn/session/conversation-canvas-state.spec.ts`
- `apps/web/app/learn/session/conversation-canvas.tsx`
- `apps/web/app/learn/session/conversation-canvas.dom.spec.tsx`
- `apps/web/app/learn/session/conversation-canvas.module.css`
- `apps/web/app/learn/session/conversation-canvas.styles.spec.ts`
- `apps/web/app/learn/session/loading.tsx`
- `apps/web/app/learn/session/page.tsx`
- `apps/web/app/learn/session/page.spec.tsx`
- `apps/web/app/dev-fixtures/conversation-canvas/fixture-access.ts`
- `apps/web/app/dev-fixtures/conversation-canvas/fixture-access.spec.ts`
- `apps/web/app/dev-fixtures/conversation-canvas/fixtures.ts`
- `apps/web/app/dev-fixtures/conversation-canvas/page.tsx`
- `scripts/r4b-evidence/catalog.mjs`
- `scripts/r4b-evidence/canonical.mjs`
- `scripts/r4b-evidence/identity.mjs`
- `scripts/r4b-evidence/transition.mjs`
- `scripts/r4b-evidence/core.test.mjs`
- `scripts/r4b-evidence/transition.test.mjs`
- `package.json`
- `docs/DEVELOPMENT_HANDOFF.md`

Catalina approved the only package-script change: `test:audit-policy` now explicitly includes
`scripts/r4b-evidence/*.test.mjs`, so the nested evidence tests participate in the protected root
test path. There is no dependency, lockfile, workflow, API, schema, database, credential, external
service, provider, deployment, production, signing, store, spend, device, or publication change.

The fixture page checks the exact `NODE_ENV === "development"` boundary before reading selectors.
Missing, unknown, array-valued, or case-changed selectors fail closed through `notFound()`. Fixture
submission selects an inert local action, omits the form action attribute, and prevents native form
submission. The normal authenticated `/learn/session` path retains the real server action. Accepted
production exclusion remains a request-time 404 with no synthetic marker; production-manifest
omission is not claimed or required.

The evidence core reads only the accepted repository R4-A specification, rejects a caller-supplied
authority path and symlinked specification, binds the exact accepted specification/catalog byte
counts and SHA-256 values, enumerates the closed 10,800 cells and 49 transitions, and emits only the
closed content-addressed artifact-key shapes. It is repository tooling only and is not imported by
the web or API runtime.

Valentina's development checks on the current application/evidence/package bytes are:

- `npm ci --ignore-scripts`: completed from the tracked lockfile with no tracked-file change;
- evidence syntax: 6/6 modules passed `node --check`;
- focused evidence core: 11/11 tests passed;
- focused web: 7/7 files and 812/812 expanded tests passed;
- full web: 10/10 files and 832/832 tests passed;
- API, rerun with its required localhost-only ephemeral test sockets available: 42/42 files and
  381/381 tests passed;
- expanded root policy suite after the local dependency install: 189/189 tests passed;
- root lint, typecheck, formatting, and `git diff --check`: passed;
- the default `npm run build --workspace @fluyo/web` did not clear on the exact final bytes: three
  attempts ended with the same Turbopack internal child-process error while processing
  `conversation-canvas.module.css`. The webpack-mode production build compiled those exact bytes
  successfully and enabled the production fixture probe below, so this record does not infer a CSS
  defect or fixture exposure. The default protected build path remains required on the later clean
  committed head and protected CI before merge clearance;
- production standalone fixture probe with synthetic localhost-only public configuration: the valid
  fixture URL returned 404 with no synthetic marker; `/learn/session` returned 200, with no
  authenticated learner result or redirect claim inferred from that status;
- development fixture probe: the valid closed selector pair returned 200 with the synthetic marker,
  while missing, case-changed, array-valued, and unknown selectors each returned 404;
- browser zero-egress trace on `http://localhost:3011`: the duplicate-submit synthetic event moved
  the rendered fixture from active to `SUBMITTING`; the drained Next development-server log emitted
  no request after that interaction, and the browser console contained only the normal React
  DevTools and HMR messages. No POST, Next server-action request, or Learning API request occurred;
- Camila's first exact-candidate review found that the exit-dialog title skipped from the page `h1`
  to `h4`. Valentina changed the dialog title and its three scoped CSS/test selectors to `h2`; the
  two affected test files passed 462/462, and fresh Camila clearance remains required on the updated
  manifest;
- full root `npm test`: the policy stage passed 189/189, then the shared workspace passed 466/468.
  Its two failures are independent native-auth repository-state guards that intentionally reject the
  required dirty precommit R4-B1 tree; the API and web stages did not run after that short-circuit.
  Adriana directed the team not to weaken the guards, create a temporary commit, or expand scope.
  The authoritative full-root rerun is required on the later committed exact head after Elana PASS
  and Adriana confirmation;
- specialist gates, protected CI, mergeability, and Elana's unchanged-head audit remain pending at
  this record boundary.

An earlier pre-install root-policy attempt passed 186/189 and failed three existing Multer-policy
checks because the fresh linked worktree had no physical worktree-local `node_modules`. That result
is an environment finding, not a product-code result, and is superseded by the post-install 189/189
run. The observed focused web denominator is 812, so the historical pre-integration 814 count is not
repeated as current evidence.

The code and DOM test prove that fixture mode selects the inert local action, omits the form action,
prevents native submission, and does not call the mocked live submit action. The browser trace above
confirms that the synthetic event settles locally without a runtime request; Natalia and Elana still
retain independent security and exact-candidate review authority.

This is a preparatory R4-B1 code candidate only. Runtime/browser/assistive-technology execution,
rendered contrast, actual 200% zoom/reflow, computed reduced-motion behavior, and the complete
10,800-cell, 86,400-artifact, 49-transition capture remain unattempted. No runtime/accessibility
completion, public availability, R4-B2 baseline, capture, review, or cleanup claim is made. A fresh
document-inclusive manifest must be computed after this record and every applicable specialist plus
Elana must review the same unchanged bytes before Adriana may commit or advance the candidate.

## R4-B1 clean-head compatibility follow-up — 2026-11-02

Adriana governed the 24-path candidate into commit
`32cdc752baedbb800bca6ea6a965fbed46cd6c29`. On that clean head, the root audit-policy suite passed
189/189. The subsequent shared-workspace run exposed two bounded compatibility issues: the
historical auth-runtime completed-phase test read the current `package.json` instead of the immutable
`phaseCompletion` snapshot, and the real-Git tests exceeded their generic 5-second and 15-second
Windows time bounds under contention.

Catalina approved only these exact test-compatibility changes:

- compare `phaseCompletion` with `phaseBase` through `git show` for the completed-phase assertion;
- give `records the exact completed-phase allowlist...` and `prevents acceptance...` 30-second
  timeouts;
- give `proves the approval path...` a 60-second timeout.

The changes do not alter assertions, retries, skips, mocks, operating-system branches, or CI
serialization. Valentina's focused readiness file passed 10/10, the paired runtime-plus-readiness
run passed 19/19, and Prettier plus `git diff --check` passed.

The full shared serial runner and the default-parallel local Windows Vitest runner subsequently
disappeared or stalled before producing authoritative totals. Therefore the full shared suite, full
root suite, and default production build are not cleared locally. Clean Ubuntu protected CI in the
default configuration remains mandatory and merge-blocking. This follow-up changes no product or
runtime behavior, dependency, workflow, or lockfile.

## R4-B1 completion and R4-B2 decision boundary — 2026-11-02

R4-B1 is complete on merged `main` `fea1f5fadb2307ca611379f30461a7ee47861fff`.
All five post-main workflows passed across 16/16 jobs. This closes the R4-B1 runtime/harness phase
only; it does not create an R4-B2 trusted baseline, authorize capture or providers, establish runtime
accessibility, or complete R4-B.

The records-only R4-B2 packet is
`docs/2026-11-02_r4b2_discarded_preflight_decision_v1.md`. It recommends Choice A: a bounded,
credential-free, no-cloud discarded preflight whose outputs remain `NON_EVIDENCE`. Choices B and C
defer the preflight or require a replacement design. No provider/account/credential, UAC/firewall
mutation, storage expansion, spend, full capture, upload, production, or cleanup action is authorized
by the original packet. Marlon selected **A** in Codex on 2026-11-02. Adriana may therefore
coordinate only the bounded credential-free, no-cloud, synthetic-only `NON_EVIDENCE` preflight.
Provider/account/credential actions, UAC/firewall or other administrator mutation, storage or spend,
full capture, upload, production, and destructive cleanup remain separately gated and unauthorized.
Choice A permits deletion only of bytes created by the preflight inside its fresh exclusive temporary
root after sanitized aggregate verification. It never permits deletion of pre-existing/user/provider
data, and the bounded ephemeral deletion is not R4-B3 `E2` proof.

## R4-B2 attempt-001 completion and attempt-002 Choice A — 2026-11-02

The first bounded `NON_EVIDENCE` preflight attempt is sealed. Its loopback Chrome/Driver smoke passed,
but its sanitized result is honestly `BLOCKED` with 0 conducted, 0 passed, 0 failed, 144 blocked, and
144 required-unattempted checks. Its fixed raw root was deleted after validated result binding and the
not-E2 receipt records zero residual bytes. The immutable predecessor records are:

| Attempt-001 record     | SHA-256                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| Tool manifest          | `a9128a28ebb11329eadb40e35adb0eb43e2f970d8f037f380ce7cfeaf0c04738` |
| Smoke result           | `267430f37142d29e9fc8925e7f908ce9449fb53d19100064185ff75705185992` |
| Sanitized result       | `6429c43544f025c9a60ad01e10e5284930b15d952e6467c3a018ad22c1500e1a` |
| Not-E2 discard receipt | `48161fe1845ac28d0b214f7e5ed5c709c102300d30e7752297b06c82446643be` |

Marlon then selected attempt-002 **Choice A** in Codex on 2026-11-02: approve an isolated
production-built test harness plus a bounded local NVDA speech-transcript adapter. This is separate
from the earlier discarded-preflight Choice A. It authorizes repository implementation and review
inside `docs/2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md`; it does not waive pre-execution
gates or authorize deployment, Vercel/mobile/public exposure, production data, provider/account/
credential/admin/system/spend actions, OCR acquisition/build/run, or final-evidence credit.

Attempt 002 remains `NOT_STARTED`. Catalina architecture and Natalia security are mandatory first;
Camila accessibility, Daniela visual/motion, Julieta counts/capacity, Gabriela provenance, Isabella
claims, Fernanda non-coercion, Renata reproducibility/exclusion, and Bianca records follow their
bounded roles. Valentina implements the frozen design and development checks. Every specialist
reports to Adriana. Elana alone provides the final exact-head independent QA/code-review PASS. Only
after the unchanged-head specialist and Elana gates may Adriana advance the commit, draft PR,
protected-CI, and later execution sequence under the standing delegation.

### Attempt-002 implementation gate status — 2026-11-02

The current uncommitted candidate remains on product authority
`fea1f5fadb2307ca611379f30461a7ee47861fff`. Root independently reproduced 48/48 focused Node tests,
the isolated-harness TypeScript check, ESLint, and `git diff --check` with no failures. These are
development checks only and do not establish architecture, security, runtime, or QA approval.

Catalina's strict stable-tree architecture re-review is **FAIL**: 7 architecture checkpoints passed,
9 failed, and 5 remain required-unattempted. The nine required repairs are the static/query route
conflict; live imported product action/navigation edges; incomplete immutable per-role process
identity and pre-kill revalidation; cooperative-only timeout/cancellation; incorrect `BLOCKED`
classification for never-started observations; incomplete persisted runtime lifecycle states;
contradictory canonical plan steps; missing YAML/shell/PowerShell/Dockerfile deployment scans; and a
local observer precondition that incorrectly requires unavailable Vercel, Android, and iOS artifacts.
Valentina owns the bounded remediation and must stop on a stable tree for a fresh Catalina review.
Natalia and all later specialist gates remain pending; no harness build, NVDA launch, attempt
execution, staging, commit, push, PR, deployment, or cleanup is authorized or has occurred.
After that verdict, root used the existing pinned CPython 3.12.5 executable to compile the NVDA
plugin source in memory with bytecode writes disabled; syntax passed. This closes only Catalina's
Python-syntax subcheck. The actual NVDA plugin load/runtime remains required-unattempted, so the
architecture verdict stays FAIL.

Catalina's next exact-tree re-review confirmed six of the nine repairs but remains **FAIL** with
9 checkpoints passed, 3 failed, and 4 required-unattempted. The remaining blockers are: full
harness-only interception and proof for router buttons, callback actions, and pointer/keyboard form
submission; a fresh exact-identity comparison immediately before forced termination; and a single
fixed build/recovery transaction with persisted server, driver, and NVDA readiness boundaries plus
failure-held coverage for every mutation. Valentina owns the implementation corrections, and Renata
is independently reviewing only the build/recovery reproducibility contract. All later gates and all
runtime actions remain on hold.

The implementation has since closed those three repairs and is frozen on candidate manifest
`4b4872e35d27365bdb235c026a37588f9edc77c7bdb37e729de2fb3f55ae8f3a`. Root independently
reproduced 65/65 focused tests plus TypeScript, ESLint, Prettier, `git diff --check`, and direct
CPython plugin parsing with zero failures. Renata's independent exact-byte infrastructure review is
**PASS**: 10 passed, 0 failed, and 4 intentionally unattempted execution-phase checks. Catalina's
fresh architecture review is in progress; Natalia and later specialist/Elana gates remain
required-unattempted. Attempt 002 is still `NOT_STARTED`, and no build, launch, execution, staging,
commit, push, PR, deployment, or cleanup has occurred.

Catalina's third strict review then closed 11/12 architecture checkpoints and found one remaining
critical builder-ownership gap: synchronous Next invocation could leave descendant processes alive
after timeout. Valentina replaced it with an asynchronously registered `harness-builder`, persisted
the eight-field identity, added recursive descendant/socket monitoring, hard cancellation, exact
termination revalidation, zero-process proof before recovery, and adversarial timeout/PID-reuse/
egress/residual tests. Root independently reproduced the resulting 66/66 focused checks with zero
failures. Catalina and Renata are re-reviewing these final frozen bytes. Natalia and all later gates
remain required-unattempted; Attempt 002 remains `NOT_STARTED` and no repository or runtime action
has occurred.

Catalina and Renata's exact-byte reviews of the first asynchronous builder repair are **FAIL**:
5 infrastructure/architecture checkpoints passed, 7 failed, and 4 remain required-unattempted.
Although 66/66 focused tests passed, the live 900,000 ms builder timeout contradicts the shared
120,000 ms ceiling; a spawn-before-receipt crash window remains; current-parent-chain discovery can
lose orphan grandchildren; recovery cannot yet prove every descendant/socket absent; and persisted
receipt/command validation is not exact. Valentina is correcting these seven bounded defects with a
closed builder timeout, durable pre-spawn launch intent or equivalent OS ownership, accumulated
descendant identities, fail-closed ambiguous recovery, exact receipt/argv schemas, and the missing
adversarial tests. Attempt 002 and every repository/runtime action remain on hold.

The seven-point remediation passed 74/74 focused checks, but Catalina and Renata's next exact-byte
reviews remain **FAIL**. Catalina counted 9 passed, 2 failed, and 4 required-unattempted architecture
checkpoints; Renata counted 7 passed, 4 failed, and 1 required-unattempted infrastructure checkpoint.
Both found that polling cannot guarantee ownership of descendants created and orphaned between
snapshots or during termination, and an early unregistered root exit could falsely reach
`ZERO_PROOF`. Valentina is replacing polling authority with an OS-backed Windows Job Object whose
kill-on-close membership atomically covers the exact builder tree, removing the empty-registry zero
path and requiring separated two-pass absence proof before journal removal/cleanup. Attempt 002 and
all repository/runtime actions remain on hold pending fresh exact-byte reviews.

Valentina has now implemented the OS-backed standard-user Windows Job Object repair and frozen
manifest `50874013d28e76752def544afc4595315c49abaa30496b80791a28aef050b996`.
The repository-owned helper creates the exact builder suspended, assigns it to a kill-on-close Job
Object before resume, durably records job assignment plus parent acknowledgement, keeps incomplete
ownership permanently ambiguous, and requires repeated separated process/socket absence proofs
before journal or artifact cleanup. Development evidence is 77/77 focused checks plus static
PowerShell/C#/TypeScript/ESLint/Prettier/Python/diff passes. Catalina and Renata are performing fresh
read-only exact-byte reviews; the helper and builder have not been launched and Attempt 002 remains
`NOT_STARTED`.

Catalina's exact-byte static architecture gate is now **PASS** with 12 passed, 0 failed, and 4
required-unattempted checkpoints. Renata's reproducibility gate remains **FAIL** with 9 passed, 3
failed, and 1 required-unattempted checkpoint because `CreateProcessW` currently inherits the
PowerShell helper environment instead of receiving the exact six-key environment whose digest is
recorded. Valentina is making the bounded final repair: a sorted double-NUL Unicode environment
block, `CREATE_UNICODE_ENVIRONMENT`, exact delivered-byte binding, and adversarial no-inheritance
tests. All later gates and runtime/repository actions remain on hold.

The exact environment repair produced candidate manifest
`e06b4185036b467ca697977d70056b3994a3261ec13daaba18c853b85af3d1c0`. Valentina reported 78/78
development tests passing. Catalina then issued **PASS** with 13 passed, 0 failed, and 4
required-unattempted checkpoints; Renata issued **PASS** with 12 passed, 0 failed, and 1
required-unattempted checkpoint. Those PASS results bind only the unchanged candidate bytes and do
not authorize execution.

Natalia's subsequent exact-byte security review is **FAIL** with 19 passed, 3 failed, 0 blocked, and
4 required-unattempted controls. Two blockers remain: Attempt-002 mutation and cleanup paths do not
yet reject and revalidate every junction/reparse ancestor, and the Windows Job helper does not prove
termination of a suspended unassigned process after Job assignment failure. A third failed control
requires bounded, identity-checked reads that enforce NVDA transcript/control-file limits before
allocation. Valentina owns these three repairs and their adversarial tests. After the bytes change,
Catalina, Renata, and Natalia must re-review the new exact candidate before any later specialist or
Elana gate. Attempt 002 remains `NOT_STARTED`; no helper, production build, server, ChromeDriver,
NVDA, emulator, staging, commit, push, pull request, deployment, or cleanup has been launched.

Valentina completed those three repairs and froze the ordered 45-file candidate digest
`8a65d200ba5505dd663caba2983b4c4d3d5b144291a3f6a26d18b8a56ed55e87`. The implementation adds a
central reparse-aware fixed-root guard with descriptor identity and double-inventory cleanup,
mandatory real Windows-junction regressions, proven assignment-failure termination outcomes in the
Job helper, and pre-allocation bounded identity-checked NVDA reads. Root independently reran the
complete R4-B static suite outside the restricted sandbox so the mandatory temporary junctions could
be created: **82 passed, 0 failed, 0 skipped**. Catalina, Renata, and Natalia are now performing fresh
read-only exact-byte reviews in parallel. Attempt 002 remains `NOT_STARTED`, and no runtime or
repository publication action has occurred.

Catalina's fresh architecture gate on that candidate is **FAIL** with 15 passed, 1 failed, 0 blocked,
and 4 required-unattempted checkpoints. The security controls themselves pass, but the document
declaring itself the canonical Attempt-002 infrastructure plan still omits the repaired boundaries
and current dependency/file map, is absent from `FROZEN_HARNESS_FILES`, and is not the plan digest
bound by A2. Valentina is updating the single canonical plan, freezing its exact bytes into H, and
binding a distinct canonical-infrastructure-plan digest through A2 without conflating it with the
generated observation-plan digest. This byte change invalidates prior exact-byte reviews; fresh
Catalina, Renata, Natalia, and later specialist/Elana gates remain mandatory.

Renata independently confirmed 82/82 R4-B static checks outside the restricted sandbox but issued
**FAIL** with 12 passed, 1 failed, and 1 required-unattempted infrastructure control because the same
canonical-plan omission invalidates frozen authority. The repository-wide policy suite is 257/260;
the three failures are unchanged main-controlled Multer dependency/environment assertions and are
not represented as green CI.

Natalia's review of the now-superseded 45-file candidate is also **FAIL** with 21 passed, 2 failed,
0 blocked, and 4 required-unattempted controls. The first repair must prevent an already-validated
ancestor from being swapped to a junction between validation and a path-based write or delete; the
second must apply pre-allocation size, regular-file/reparse, and descriptor-identity checks to every
ignored lifecycle, builder journal/receipt/recovery, and helper acknowledgement read. Valentina owns
these security corrections together with the canonical-plan binding repair. The candidate bytes are
actively changing, so none of the superseded reviews authorize execution.

Valentina completed the combined repair and froze ordered 46-file candidate digest
`bfcf66d572eea10f71ec89bd52fa5d597bbaa275bb2dbf0ce209e99ec62e7363`. The canonical infrastructure
plan is now the sixth frozen H inventory entry, and closed A2 schema v3 binds distinct
`infrastructurePlanDigest` and `observationPlanDigest` fields while rejecting the old ambiguous
field. Mutation and cleanup boundaries use no-follow descriptor identity plus immediate parent-chain
revalidation and mandatory ancestor-swap junction tests. All ignored runtime-record reads are bounded
before allocation and identity-revalidated, including the PowerShell acknowledgement. Root
independently reproduced the complete static suite outside the restricted sandbox: **84 passed,
0 failed, 0 skipped**. Fresh Catalina, Renata, and Natalia exact-byte reviews are in progress.
Attempt 002 remains `NOT_STARTED`; no runtime or repository publication action has occurred.

Those exact-byte gates are now **FAIL** despite the 84/84 static result. Catalina counted 15 passed,
1 failed, and 4 required-unattempted architecture checkpoints; Renata counted 13 passed, 2 failed,
and 1 required-unattempted infrastructure checkpoint; Natalia counted 13 satisfactory, 2 failed,
and 4 required-unattempted security groups. On Windows, Node and Python `O_NOFOLLOW` fallbacks are
undefined/zero and protect neither ancestor directories nor the final check-to-syscall interval.
Create, mkdir, rename, unlink, recursive cleanup, and Job receipt/ack I/O therefore remain vulnerable
to a same-account ancestor swap after validation. The current test swaps before the call rather than
inside that interval. Natalia also requires bounded identity-checked CLI manifest reads, streaming
inventory hashes, and a bounded Python plugin self-hash. Catalina is defining one retained-handle
Windows-native operation contract; Valentina will implement that frozen contract and synchronized
race fixtures before another exact-byte review cycle. Attempt 002 remains `NOT_STARTED`.

Catalina has now frozen the implementation contract for a single persistent Windows-native broker.
It retains non-reparse ancestor handles without delete sharing across each protected operation,
validates volume/file IDs and final paths, performs handle-bound mutation and deletion, streams
bounded reads/hashes/inventories, owns the Job Object builder boundary, and supplies NVDA only pinned
inherited handles. Closed framed IPC, a native mutation journal, crash-held recovery, exact caps, and
synchronized `TEST_ROOT` race hooks are required. Valentina is implementing the new frozen C#/Node
broker, removing the obsolete PowerShell Job helper, converting all protected call sites, and adding
deterministic concurrent-swap fixtures. Tests may launch only the broker and temporary test actors;
Attempt 002 and all product runtimes remain prohibited and `NOT_STARTED`.

Valentina completed that native-boundary implementation and froze ordered 48-file digest
`410ec2a447e868c1f519cd967d5b330c566adee350ce194a16d004c2db8ab06d`. The new C# boundary hash is
`247923a3fd7d2a58db6dcb5b968094b8b177a134027c4975ae01fd381ae7f9f6`; the Node client hash is
`b06536d8c237534e1fe29ef352ee046c690f362efa5851d61d9dc4b271d2f2ec`. The legacy PowerShell Job
helper is removed. The broker now owns retained-handle filesystem operations, closed IPC, bounded
inventory, Job creation and receipt/ack, and suspended NVDA launch with an explicit four-handle
inheritance list. Root independently recomputed the digest and reproduced **89 passed, 0 failed,
0 skipped** static checks outside the restricted sandbox, including nine synchronized ancestor-swap
operation families. Fresh Catalina, Renata, and Natalia exact-byte gates are in progress. Only test
broker actors have run; Attempt 002 remains `NOT_STARTED` and no product runtime, repository
publication, deployment, or cleanup has occurred.

The 48-file candidate is **rejected** despite 89/89 passing development tests. Catalina's architecture
gate is **FAIL** with 7 passed, 11 failed, and 7 required-unattempted checkpoints. Natalia's security
gate is **FAIL** with 13 passed, 7 failed, 0 blocked, and 4 required attack-grade groups unattempted.
The synchronized race proof was simulated inside the broker rather than coordinated with a separate
attacker; the client spawned a new unchained broker per operation; native source bytes were not
hash-bound before `Add-Type`; framed schemas and root rights were not closed; cleanup adopted a fresh
inventory instead of binding prior exact entry identities; rename used path-based `MoveFileEx`;
Job inputs were not retained and pinned; and NVDA inherited handles were not actually consumed by the
Python plugin. Valentina is replacing every placeholder with the persistent closed broker, real
external attacker barriers, native journal/recovery, exact source/operation/root/inventory identity,
retained-handle Job and rename boundaries, and genuinely consumed NVDA handles. Passing tests may not
be reused as proof unless the new fixtures exercise those exact properties.

Valentina then replaced those gaps with a persistent broker, a broker-created retained exchange root,
exclusive request/response/ready/ack publication, exact source verification before `Add-Type`, closed
schemas/rights/caps, a hash-chained native mutation journal with crash-held recovery, prior exact
inventory identities, retained-handle rename and cleanup, pinned Job inputs, a real suspended
non-evidence Job fixture, a ten-handle NVDA boundary, and a compiled Python inherited-handle consumer.
Separate attacker processes now enter deterministic operation windows and verify attempted
rename/junction substitution, the intended inside-root result, and an unchanged outside sentinel.

Root independently computed the full current frozen inventory as **49 files** with digest
`66aed3a7a6fc506b4be6eb9f763601630153fc152706ef57025ba38133c74d59` and independently reproduced
**95 passed, 0 failed, 0 skipped** R4-B checks outside the restricted sandbox. The native C# exact
hash and embedded client pin are `26440cc26433294dfa58118c70c0af4010d4b252fac312c80291eedd4d6fd8fb`;
the client file hash is `7d0ab74df30d3e0a0b4aef454917fae92de48c44c0ca1b4779adacff674ec11b`;
the plan hash is `ab80b6a983e9e2ae8373c01306949763b0db82aa7fcddcc37b94d5bb2942ac61`.
Fresh Catalina, Renata, and Natalia exact-byte reviews are in progress. Live portable NVDA and every
Attempt-002 product execution remain required-unattempted; only test broker/actor/fixture processes
have run. Nothing is staged, committed, pushed, opened as a pull request, deployed, or cleaned.

That 49-file candidate is **rejected** despite 95/95 development checks. Natalia's security gate is
**FAIL** with 30 passed, 8 failed, 0 blocked, and 4 required-unattempted groups. Renata's
infrastructure gate is **FAIL** with 11 passed, 7 failed, 0 blocked, and 4 required-unattempted
groups. Catalina also identified the transaction/authentication gaps before her detailed report was
interrupted. The actual build root is `.next-attempt-002` but the native map uses `.next`; live
cleanup discards the approved inventory token and adopts a fresh inventory; broker requests can be
rewritten after publication; mutation can commit before response/ready/ack success; journal restart
has no independent anchor or ambiguous-replay state; Job receipt/ack sharing and authority binding
are invalid; NVDA handle sharing/PID/handshake semantics are statically nonfunctional; framed Job and
NVDA operations remain stubs while one-shot helpers bypass the persistent broker; and root rights are
not closed per operation. Catalina is defining the corrected transaction state machine, root/rights
map, journal anchor/recovery, Job acknowledgement, and NVDA handle protocol before Valentina's next
implementation pass. Attempt 002 remains `NOT_STARTED`.

Catalina has now frozen the corrected transaction architecture. One persistent capability-bound
broker must use inherited anonymous request/response pipes only; authoritative exchange files and
one-shot Job/NVDA helpers are forbidden. A frozen native contract defines exact narrower roots,
per-operation rights, schemas, caps, and digests. The transaction advances through durable
`INTENT` → `APPLIED_UNACKED` → capability-ACKed `ACKED_COMMITTED`; replay returns the stored response
without reapplying. The controller retains the journal-anchor handle and exact last digest/sequence;
replacement, truncation, controller loss, or ambiguous recovery is permanently held. Cleanup carries
the original approved root/entry identity token through relative-handle deletion. Job receipt/ACK and
NVDA control/ready are framed broker operations over inherited handles with distinct controller,
broker, builder/NVDA identities. Valentina is implementing the exact contract plus response/ACK loss,
crash-boundary, journal-tamper, original-inventory, relative-delete, real framed Job, and injected NVDA
consumer acceptance tests. Attempt 002 remains `NOT_STARTED`.

### Corrected capability-pipe implementation checkpoint — 2026-11-02

Valentina replaced the authoritative filesystem message exchange with one persistent 64-bit
PowerShell/C# broker per closed command and inherited anonymous stdin/stdout capability pipes. The
new frozen `windows-native-contract.json` orders the exact roots, rights, fields, operations, and
payload caps; `windows-native-worker.mjs` is the synchronous controller bridge. `HELLO` now returns
the actual broker PID, PowerShell path/version/signature, contract digest, and controller-held
journal-anchor handle. The broker and client enforce exact sequence/request replay and a response
digest ACK over the request pipe. Focused fixtures prove response loss and ACK loss replay the same
response without applying `WRITE_NEW` twice.

The native root map now uses the real `.next-attempt-002`, build-temp, nested NVDA config/portable/raw,
raw, attempt, runtime-control, tools-read, downloads-read, repository-read, and test-only roots.
Production cannot select `TEST_ROOT`. Mutation journal states are
`INTENT_DURABLE` → `APPLIED_UNACKED_DURABLE` → `ACKED_COMMITTED_DURABLE`; the journal handle is
duplicated into the controller and a replacement broker can adopt that exact anchor. Inventory now
retains the original root/entry handles without delete sharing until cleanup, rejects fresh token
adoption, detects injected entries, blocks rename-out, and deletes through the original retained
handles.

This is a checkpoint, not an H candidate. The persistent framed Job operations 13–16 now own exact
input pins, suspended creation, Job assignment, response/ACK, resume, status, close, and termination.
NVDA operations 17–18 now own its exact ten pins, explicit seven-handle inheritance list, framed
control/ready/transcript/diagnostic/status, resume-after-control, and termination. Build and observer
consume only framed broker authority. The rejected one-shot Job/NVDA methods and file receipt/control
authority have been removed; the injected Python consumer exercises op 17 with distinct
controller/broker/consumer identities. Live NVDA remains intentionally UNATTEMPTED.
The bootstrap verifies size, final path, stable `fsutil queryFileId` identity, and digest while
holding source/contract streams before the reviewed boundary `Add-Type`. Production recovery is
bound to the exact failure digest/count/state and controller anchor. Explicit fixtures now prove
that controller loss returns `JOURNAL_PERMANENT_HELD`, while coherent journal rewrite, zero-byte
truncation, and same-byte file replacement return `ORPHANED_PERMANENT_HELD`; every case proves zero
retry, mutation, recovery, or cleanup. Therefore H/A2 derivation remains forbidden and Attempt 002
remains `NOT_STARTED`.

Valentina completed the final domain repair and froze a new **57-file** subject. Root independently
reproduced canonical digest
`e572f9490a38292720afcfa5c131fa4a1097ef8bafad686ee943469555ff637f` and independently reran the
full TAP suite outside the sandbox: **128 passed, 0 failed, 0 cancelled, 0 skipped**. Risk cells now
run complete keyboard traces; transition families execute behavior-specific reducer/UI sequences;
NVDA CLOSE waits for queue drain/quiet and rejects late generations; every traversed target has an
ordered speech contract; mobile/RTL/semantic evidence fields gate their named results; contrast uses
adjacent surfaces and logical borders; reduced-motion scroll and sub-320 reflow are explicit; and the
disk sample bytes are bound three ways to the exact cleanup inventory and result. Final Camila,
Daniela, and Julieta gates are in progress. Attempt 002 and all runtime/repository actions remain
unattempted.

The third domain wave on `e572f949…` produced Julieta **PASS** with 64/64 numerical/privacy checks.
Camila remains **FAIL** with 23 passed and 2 failed because NVDA CLOSE waits for a queue barrier while
holding the callback condition, and the ordered speech contract tries to focus native-disabled
controls that cannot expose the required semantics. Daniela remains **FAIL** with 26 passed and 4
failed because progress accessible naming ignores valid `aria-labelledby`, offset focus rings compare
against the control's own fill, pale state tints are incorrectly treated as meaningful 3:1 surfaces
while progress fill/track contrast is insufficient, and the RTL notch check hard-codes 20px despite a
responsive 24px token. Valentina owns this final bounded accessibility/visual correction; all other
domain and core controls remain frozen.

Development verification on the unchanged candidate completed outside the sandbox. The focused
Windows boundary/build/observer/NVDA/fixed-root matrix conducted 51 tests: 51 passed, 0 failed, and
0 required-unattempted. The full R4-B subset conducted 102 tests: 102 passed, 0 failed, and 0
required-unattempted. An earlier complete audit-policy run conducted 276 tests: 273 passed and 3
failed. All R4-B capability-pipe, fixed-root, framed Job, injected NVDA, transaction replay,
permanent-hold, journal-tamper, and crash-boundary tests pass. The three full-repository failures
remain outside this implementation slice in the pre-existing Multer override checks: two behavior
assertions and one missing installed `@nestjs/platform-express` package in this worktree. C#
compilation, JavaScript syntax, Python in-memory compilation, lint, touched-file formatting, and
`git diff --check` passed. Repository TypeScript checking remains failed by pre-existing missing
shared learning/catalog exports and downstream implicit-any errors. Live NVDA remains
required-unattempted; no product runtime was launched and no stage, commit, push, PR, H, or A2
action occurred.

The final uncommitted 51-file `FROZEN_HARNESS_FILES` working-tree inventory digest is
`0fde8d886be910389a7f12da2e22e1e05f58d187268edfa5ba643739ecc63adb`; this is a review aid, not
an H commit digest. The canonical infrastructure plan SHA-256 is
`c4aecd22be09c1ae6ea31748825cfd50ba67590262f0c52ab486ade82db83dae`, and the generated
observation-plan digest is `9ca1c6b7c5ef0b37224e195d755a4f0e53edada58e07ba1ee3bdaeb76fa9e1c3`.
The frozen native contract, C# broker, and JavaScript client SHA-256 values are respectively
`539fe3cc9a62fbf662d4d28c809d81f2efc9a2b261b28efe710056cf515be603`,
`a21ef3a1e5a6de2d24d9a4c94116a1e0db4397ee2f4e89c022ac7f31c6a0d0e7`, and
`c55c95432f2b3ac3e2b6b9fabb0640303a031515e2eec2e7061a85d54d3707c3`.

At the 2026-11-02 16:03Z hourly reconciliation, root independently reran the unchanged 51-file
candidate with the compact Node test reporter and counted 102 dots: **102 passed, 0 failed**. Fresh
read-only exact-byte gates were dispatched to Catalina (architecture), Renata
(infrastructure/reproducibility/rollback), and Natalia (security) against working-tree digest
`0fde8d886be910389a7f12da2e22e1e05f58d187268edfa5ba643739ecc63adb`. Their verdicts remain
pending. Attempt 002 remains `NOT_STARTED`; no stage, commit, push, pull request, product runtime,
Next build, live NVDA, emulator, deployment, or cleanup action has occurred.

Those exact-byte gates rejected the `0fde8d88…` candidate despite its 102/102 development result.
Catalina's architecture gate is **FAIL** with 20 passed, 8 failed, 0 blocked, and 4
required-unattempted checkpoints. Renata's infrastructure gate is **FAIL** with 27 passed, 2 failed,
0 blocked, and 4 required-unattempted checkpoints. Natalia's security gate is **FAIL** with 32
passed, 8 failed, 0 blocked, and 4 required-unattempted checkpoints. The application still releases
the approved inventory lease and adopts a fresh tree at deletion; response ACK lacks a durable final
commit-confirmation frame; production recovery remains an unsafe generic held-state clear; C# does
not enforce the promised root/operation/path matrix; the production Job argument slots are swapped;
NVDA authority remains predictable share-writable named files with incomplete inherited handles and
identity schema; production shutdown still invokes a one-shot NVDA helper; and bootstrap remains a
path-following `FileStream` rather than a no-reparse native open. Valentina owns one consolidated
implementation/fixture repair covering every finding. All downstream domain reviews and Elana's
final gate remain required-unattempted. Attempt 002 remains `NOT_STARTED`, with no repository
publication or product/runtime action authorized on these rejected bytes.

Valentina completed the consolidated repair and stopped on a new stable 51-file candidate. The
working-tree inventory digest is
`fd0361fb6b6f62a7eee73e887387814141dbfd1a470c1a783a6268811d913a4e`; root independently reproduced
that exact count/digest and independently reran the full R4-B development suite outside the sandbox:
**107 passed, 0 failed**. The native contract, C# broker, JavaScript client, and infrastructure plan
SHA-256 values are respectively
`dff0f140ba0794c212a996ca8cd868e857d81edb6ceefe59c0e387857540c812`,
`b52519f762b17921199269a7364704a22207a6f76156d8da6dc7a2ec6d774e9b`,
`da30d476af4e267a259b7c6ec692c03dea0958af6b2bd03dcac1f254a2debfc2`, and
`4c89953f3d8eaf166c0a6a8942791df727b925ad721a35fff0943d39ef9c15ef`.
The repair retains the original approved inventory lease through deletion, adds controller response
validation and final durable `COMMIT_CONFIRMED`, closes production recovery outcomes, enforces C#
root/operation/path rights, exercises the corrected production Job mapping through a persistent
non-Next broker fixture, uses anonymous NVDA control/ready pipes with ten exact inherited handles and
write-forgery refusal, removes one-shot shutdown authority, and pins source/contract through native
no-reparse opens. Fresh Catalina, Renata, and Natalia exact-byte gates are in progress on these bytes.
Attempt 002, H/A2, Next, live NVDA, emulator, deployment, cleanup, staging, commit, push, and pull
request actions remain unattempted.

The exact-byte gates rejected the `fd0361fb…` candidate despite 107/107 development checks.
Catalina's architecture gate is **FAIL** with 13 passed and 4 failed; Renata's infrastructure gate is
**FAIL** with 31 passed and 1 failed; Natalia's security gate is **FAIL** with 17 passed, 3 failed,
and 2 required executable recovery branches unattempted. Remaining defects are: C# relative-path
authorization is still broader than the exact allowlist; recovery trusts caller-asserted identities
and is not wired through production failure paths; partial cleanup cannot resume after one tree is
already durably deleted; NVDA synchronously reads one control frame per speech callback although the
controller sends one per observation; Job output authority omits the real infrastructure-plan digest
and composite root/path/parent/distDir binding; the worker ACKs before operation-specific semantic
validation; and durable Job assignment/close records do not retain/bind the complete receipt and
pins. Valentina owns the consolidated implementation and executable-fixture repair. Downstream domain
gates and Elana remain unattempted, and Attempt 002 remains `NOT_STARTED`.

Valentina completed the seven-family repair and stopped on a new stable **53-file** subject. Root
independently reproduced working-tree digest
`f5c6ca7b418c27ecfc4ca4a3bfa9ecb9f0600509439ca084ed2940fce4eaf86f` and independently reran the
complete R4-B development suite outside the sandbox: **114 passed, 0 failed**. The contract, C#
broker, JavaScript client, infrastructure plan, and pre-ACK response-validator SHA-256 values are
`13b1ce5f32bed39842862d07fc720f25b9280c089a82b8066399294f8bfd8686`,
`37b2f541dd8e19f365570596a4557da48451ad92e2f462a5be5552e200c7f570`,
`5ba879c22dd2dc046de29f364a23b118dba5dc090a1aeb1ce5f1672860a56ab5`,
`5bd42d653239cc771d65d0c3e6561350dbfe70f21f843c4aa0615264a9f20283`, and
`0e266d01eb32d80cec4556f1f37bf043223a9c5a08139d6dd21f3a9c4577edeb`.
The new bytes add exact C# operation/path authorization; broker-derived durable recovery with stored
response replay and production call sites; resumable identity-bound cleanup tombstones; a dedicated
NVDA control reader with latched observation state; real infrastructure-plan and composite output
authority binding; operation-specific response validation before ACK; and complete durable Job
assignment/close receipt binding. Fresh Catalina, Renata, and Natalia exact-byte reviews are in
progress. Attempt 002 and every product/runtime/repository-publication action remain unattempted.

The exact-byte gate on `f5c6ca7…` remains held. Renata issued **PASS** after 57/57 focused checks,
but Catalina issued **FAIL** with 14 passed and 4 failed, and Natalia issued **FAIL** with 14 passed
and 2 failed. The actual observer/config/diagnostic production paths do not match the new exact C#
allowlists; an internally re-created deleted-tree tombstone fails object-identity validation before
the resumable no-op; the NVDA reader emits an unread ready frame for every control and can fill its
4096-byte pipe; `JOB_CLOSED` is still memory-only instead of a durable authority-bound event; and
`RENAME_EXCLUSIVE` recovery proves only the absent source, not the destination file identity/content.
Valentina owns the narrow production-path, tombstone, ready-ACK, durable-close, and composite-rename
recovery repair. The candidate is not eligible for downstream specialists, Elana, H/A2, Attempt 002,
or repository publication.

Valentina closed the five remaining production-path defects and froze a new **53-file** subject.
Root independently reproduced canonical working-tree digest
`62a1fba1945666f69302e9d7a85f17a1927de64d3e4b0329b4146e5909ab16c9` and independently reran the
full R4-B TAP suite: **118 passed, 0 failed, 0 cancelled, 0 skipped**. The contract, C# broker,
JavaScript client, response validator, and infrastructure-plan SHA-256 values are
`ad22a902d1599835b5b30328aa1fcfa41b5525403dfbd1e6b8d6c29f818e2c9e`,
`9facabfa1935fc78eccf05a0272439ca4761e900eddf5aeaf1b0bd1d1cc7e871`,
`5dcb475567b19202fdbf69418451f32ac67d78648e74bc8944a7f1d32d649f54`,
`0daab78941801b33db5015e85a1154a519d6ffe864531f516c56429906ee6c89`, and
`958986bab9e2696930cd41b28ca25f8cee25c91b90a28177e03393062195e060`.
The repairs align exact broker paths with production constructors, authenticate resumable deletion
tombstones, drain and validate one ready ACK per NVDA control with a reader-driven 120-control stress
fixture, append a fully authority-bound durable `JOB_CLOSED` before cleanup, and recover rename only
after proving composite source-plus-destination identity. Fresh Catalina, Renata, and Natalia reviews
are in progress on these exact bytes. Attempt 002 and all repository/product/runtime actions remain
unattempted.

On exact subject `62a1fba1…`, Renata issued **PASS** with 66/66 focused checks. Catalina issued
**FAIL** with 18 passed and 1 failed because the frozen JSON `RAW_ROOT` allowlist omits the exact
intermediate nodes `checks`, `checks/risk`, `checks/transition`, and `profiles` that C# already
authorizes. Natalia issued **FAIL — evidence only** with 17/17 conducted checks passing and two
required controls unattempted: malformed/truncated canonical `JOB_CLOSED` receipt refusal, and
tamper/truncation of a journal specifically containing `JOB_CLOSED_DURABLE` with permanent hold and
zero cleanup. No repaired production-code vulnerability remains known. Valentina owns the bounded
contract-parity and negative-fixture closure; all subsequent exact-byte gates remain required.

Valentina completed the bounded closure and froze a new **53-file** subject. Root independently
reproduced canonical working-tree digest
`8538971f478bc55f59694d6de7bc934dee6797641f99602ae94a30f1d8390fe6` and independently reran the
full TAP suite: **122 passed, 0 failed, 0 cancelled, 0 skipped**. The contract, C# broker, JavaScript
client, response validator, native test, and infrastructure-plan SHA-256 values are
`7deee905e0bae20abd8e7612467c4ffe2cc4cb6929943cf96c9762a33c4c419b`,
`e47649c79cb916c7420a09b216798fc912518d4d5fdd1f49ed921b879efb11c0`,
`26b2364815c130d0e144368879ed90be5b96e5e5be33181681e884a8afe7e0b9`,
`0daab78941801b33db5015e85a1154a519d6ffe864531f516c56429906ee6c89`,
`a665baec73b30f0b4180654f43a056b5b7792cb552124903356dba380e6951e8`, and
`958986bab9e2696930cd41b28ca25f8cee25c91b90a28177e03393062195e060`.
The frozen contract now includes all exact RAW_ROOT intermediate nodes with executable contract↔C#
parity coverage. Direct receipt negatives cover truncated/schema/key/value/digest-binding refusal,
and isolated-controller fixtures corrupt/truncate a real `JOB_CLOSED_DURABLE` journal and prove
permanent hold, unchanged journal after hold, forbidden retry, and zero cleanup. Final Catalina,
Renata, and Natalia exact-byte gates are in progress. Attempt 002 and all repository/product/runtime
actions remain unattempted.

On exact subject `8538971f…`, Catalina issued **PASS** with 20/20 architecture checks and Renata
issued **PASS** with 70/70 infrastructure checks. Natalia issued **FAIL** with 19 passed and 1 failed:
the durable journal hash omits the response digest/bytes, so a same-account attacker can coherently
rewrite a canonical `JOB_CLOSED` receipt, update the stored response digest, and preserve the record
hash and file identity. The negative fixture currently changes only the response bytes and therefore
proves incoherent corruption, not this coherent rewrite. Catalina is defining a minimal non-circular
response/record hash sequence because responses and commit confirmations currently carry predicted
post-ACK anchors. The candidate remains held; no downstream or runtime action may advance.

Valentina implemented Catalina's non-circular J2 journal contract and froze a new **53-file** subject.
Root independently reproduced canonical digest
`7ba44f1d21741777796ca887a90bf52689b27666ee7571dea76ec66d893c4649` and independently reran the
full TAP suite outside the sandbox: **126 passed, 0 failed, 0 cancelled, 0 skipped**. J2 records have
16 exact fields and hash the exact response digest, byte length, canonical Base64 bytes, and prior
record. Initial responses carry only a durable predecessor anchor; exact raw response bytes are
journaled through APPLIED/ACKED, and only final `COMMIT_CONFIRMED` binds that raw digest to the actual
post-ACK head and advances controller state. Replacement recovery verifies the controller's confirmed
prefix, allows only a valid same-request suffix, revalidates exact stored response bytes, and holds
legacy J1. Coherent rewrite, recomputed-chain/prefix mismatch, live-handle, canonical encoding,
raw-response replay, failure-response, legacy, Job-close, rename, truncation, replacement, and
post-ACK-failure fixtures pass. Fresh Catalina, Renata, and Natalia exact-byte gates remain required;
Attempt 002 and repository/product/runtime actions remain unattempted.

The core J2 exact-byte gates are all **PASS** on `7ba44f1d…`: Catalina 26/26, Renata 74/74,
Natalia 20/20, and root 126/126. The first downstream domain wave remains **FAIL**. Camila counted
16 passed and 9 failed UX/accessibility checkpoints: speech semantics and generation barriers are too
weak, transitions are direct-loaded rather than exercised, fixture semantics/focus/primary-action/RTL/
mobile predicates are incomplete, effective radio targets are mismeasured, and progress lacks exact
value text. Daniela counted 16 passed and 8 failed visual/mobile/motion checkpoints: the harness omits
the production global visual context; contrast/focus/overflow/reduced-motion artifacts lack required
measurements; and en-XA/ar-XB are not genuine pseudolocale presentations. Julieta counted 48 passed
and 1 failed numerical/privacy checkpoint: `rawInventory.bytes × 720` is mislabeled as peak usage.
Catalina clarified that ×720 remains valid only as a conservative logical-disk admission budget:
`(10,800 / 30) × (2 / 1)`, with explicit counts/factors, a 100% disk safety margin, separate
`observerPeakRssBytes`, documented inclusions/exclusions, and no memory/concurrency claim. Valentina
owns the consolidated product-observer, harness-fidelity, artifact-traceability, pseudolocale,
transition, NVDA-generation, and capacity-contract repair. Attempt 002 remains `NOT_STARTED`.

Valentina completed the consolidated domain repair and froze a new **56-file** subject. Root
independently reproduced canonical digest
`a55f6c64d651fe93c5fe09296eaa49470e7d9ea73e06af494a9f59d3e7e5c2ba` and independently reran the
full TAP suite outside the sandbox: **128 passed, 0 failed, 0 cancelled, 0 skipped**. The repaired
subject freezes the production visual context and localization boundary, measures effective targets,
records complete focus/geometry/contrast/motion artifacts, adds exact progress value text and logical
RTL/pseudolocale assertions, exercises reducer-driven transitions, and uses expected per-state NVDA
speech contracts with observation close/drain/idle generations. Capacity now reports an explicit
disk-only `(10,800 / 30) × (2 / 1)` conservative budget and a separate observer RSS value. Fresh
Camila, Daniela, and Julieta gates are in progress. Attempt 002, live Next/NVDA, H/A2, platform
artifacts, and repository publication remain unattempted.

The second domain wave remains **FAIL** on `a55f6c64…`. Camila counted 18 passed and 7 failed:
risk cells do not execute keyboard traversal; transition families are self-labeled reset traces;
NVDA IDLE is not a real queue-drain barrier; speech contracts omit traversed controls; and recorded
mobile/RTL/semantic predicates do not all gate their named statuses. Daniela counted 23 passed and 5
failed: boundary contrast compares an opaque surface to itself; reduced-motion global scroll behavior
is missing; clipping/overlap/occlusion/compact-landscape fields are not verdict inputs; the actual
canvas notch is not checked for RTL mirroring; and the 320px/200% reflow contract is not proven.
Julieta counted 60 passed and 1 failed: the explicit disk-budget sample byte count is not required to
equal the exact raw inventory/result byte count, and the current fixture demonstrates the mismatch is
accepted. Valentina owns the final runtime-equivalent observer/product/schema repair. Attempt 002
remains `NOT_STARTED`.

The later **58-file** subject
`ee1d8c7cd2e64174c4c1a31d577bce0dede56b024430ca2e740a8cb3a279eee5` passed root's exact R4-B
development suite with **133 passed, 0 failed**. Valentina also reported **458/458** web DOM checks
and the 120-generation asynchronous NVDA fixture passing. Julieta issued **PASS** with 66/66
numerical/privacy checks. The subject nevertheless remained held: Camila issued **FAIL** with 24/25
checks because the observer counted hidden inputs and every same-name radio as independent Tab stops,
instead of modeling native hidden-control exclusion, one sequential stop per radio group, and separate
Arrow-key traversal. Daniela issued **FAIL** with 21/24 checks because the observer compared the
primary button's cobalt border to its identical fill, the light warning rule was only **1.3316:1**
against its tint, and the exact 600-character prompt plus four 180-character choices could overflow on
the required phone cell. Valentina received one bounded consolidated repair; no runtime or repository
publication action advanced on the rejected bytes.

Valentina froze the repaired **58-file** subject at working-byte digest
`d0b340c38f20de894f5233620bd68291f920666f714f7004ccfbda8a61392bcb`. Root independently
reproduced that count and digest and reran the exact R4-B suite outside the sandbox: **137 passed, 0
failed, 0 cancelled, 0 skipped, 0 todo** in **141,932.2039 ms**. Valentina reported **459/459** web
DOM checks, **20/20** focused observer/production-exclusion checks, and passing harness TypeScript,
lint, formatting, syntax, and diff checks. The repair now models native Tab order and named-radio
grouping with separate guarded Arrow-key fixtures for ACTIVE, SUBMITTING, and CONFIRMED; records
closed contextual state, choice, and primary-control contrast pairs; uses warning rule `#8a5b00` at
**5.4647:1** in light and **9.8842:1** in dark; and proves no document or named-region overflow for
the exact 600-character prompt plus four 180-character unbroken choices.

The full web workspace typecheck remains **HOLD**, not PASS or candidate FAIL. This worktree has no
root `node_modules`; invoking the primary checkout's compiler resolves `@fluyo/shared` through the
main-checkout junction `C:\dev\Fluyo\node_modules\@fluyo\shared` to
`C:\dev\Fluyo\packages\shared`, bypassing the correct R4-B2 worktree exports. The unchanged lockfile
SHA-256 is `DF4A53010F48DA9A7C9448E3FC754AEF6C1C76E7CC360BADE212168140093503`. A broader
audit-policy run counted **312 passed and 3 failed**; those are the same pre-existing Multer behavior
and missing installed dependency-tree failures, not failures of the exact R4-B candidate suite.
Renata still owes the isolated dependency-graph or clean-CI proof, and protected CI remains mandatory.

Fresh exact-byte review begins with Catalina and Natalia, followed by Camila, Daniela, Julieta, the
remaining applicable provenance/claims/non-coercion specialists, Bianca's record reconciliation,
Renata's reproducibility gate, and Elana last. Attempt 002, H/A2, product Next, live browser/NVDA,
platform artifacts, emulator, deployment, cleanup, staging, commit, push, and pull-request creation
all remain unattempted.

The domain wave on `d0b340c3…` produced Camila **PASS** with 25/25 conducted checks and three
runtime-required groups still unattempted, and Julieta **PASS** with 78/78 checks. Daniela remained
**FAIL** with 23/24 checks: whole-element opacity `0.52` changed the actual light-theme disabled
focus/surface composites to approximately **2.5965:1** for ACTIVE and **2.7075:1** for SUBMITTING,
while the observer used raw colors and therefore falsely passed those cells. The exact subject
remained held, and Valentina received only the bounded disabled-state composition repair.

Valentina froze the next **58-file** subject at working-byte digest
`a33152d0ef742bcf726881e4d019a5aa67739727c1812f67f217ac81461b7ef2`. The implementation replaces
whole-element disabled opacity with explicit opaque light/dark disabled tokens; composes focus, text,
surface, and boundary colors through both element and ancestor opacity; parses `rgb()`, `rgba()`, and
`color(srgb ...)`; fails closed on invalid colors; and includes exact negative and positive fixtures.
Root independently reproduced the digest and reran the exact R4-B suite: **139 passed, 0 failed, 0
cancelled, 0 skipped, 0 todo** in **143,895.1672 ms**. Valentina reported **22/22** focused checks,
**459/459** web DOM checks, and passing static gates. These implementation results remain development
evidence only; fresh independent exact-byte gates are underway.

Attempt 002, H/A2, product Next, live browser/NVDA, platform artifacts, emulator, deployment,
cleanup, staging, commit, push, and pull-request creation remain unattempted.

The domain wave on `a33152d0…` produced Camila **PASS** with 30/30 conducted checks and three
runtime-required groups still unattempted, and Daniela **PASS** with 26/26 checks. Julieta remained
**FAIL** with 99/100 checks: the disabled choice's `0.72` whole-element opacity reduced the actual
light-theme unchecked boundary to **2.9073645:1**, below the required 3:1. The same audit confirmed
the dark boundary at **4.6364:1** and light text at **6.9823:1**. The subject remained held, and
Valentina received only the bounded disabled-choice composition repair.

Valentina froze the next **58-file** subject at working-byte digest
`4b2eb65e3cd0c78bfa2616f52f3cb874a3b693e6fc42ec0ff26d564d150899b1`. The implementation replaces
disabled-choice opacity with explicit opaque light/dark surface, text, unchecked-boundary,
checked-boundary, and focus tokens. Exact fixtures cover the **2.9073645:1** regression plus nested
opacity and transparent-color negatives. Root independently reproduced the digest and reran the exact
R4-B suite: **140 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo** in **146,612.8902 ms**.
Valentina reported **23/23** focused checks, **459/459** web DOM checks, and passing static gates.
These implementation results remain development evidence only; final fresh independent exact-byte
gates are underway.

Attempt 002, H/A2, product Next, live browser/NVDA, platform artifacts, emulator, deployment,
cleanup, staging, commit, push, and pull-request creation remain unattempted.

The remaining-roster wave on `4b2eb65e…` produced Fernanda **PASS** with 37/37 checks and Isabella
**PASS** with 14/14 checks. Gabriela issued **FAIL** across 10/11 research audit areas even though the
bounded executable suite passed 35/35 checks: the plan described the NVDA signer and certificate
thumbprint as already verified without a bound manifest or official verification proof, while live
NVDA remained unattempted. The subject remained held, and Valentina received only the bounded
prospective-pin correction.

Valentina froze the next **58-file** subject at working-byte digest
`17c22bde52edd55c37e923a0bec57196c805514ecd025035d0be1b4e9d8a547f`. Manifest v2 now starts with
`UNATTEMPTED` status and null verification fields. Before launch it requires the exact official URL,
download SHA-256, same-byte signature-evidence hash, verification method and status, chain status,
verification time, signer subject, and signer thumbprint. Missing, mismatched, stale, unbound, or
untrusted proof fails closed. This correction performs no download. Root independently reproduced the
digest and reran the exact R4-B suite: **141 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo** in
**144,806.5807 ms**. Valentina reported **29/29** focused checks and passing static gates. These
implementation results remain development evidence only; fresh independent exact-byte gates are
required.

Attempt 002, H/A2, product Next, live browser/NVDA, platform artifacts, emulator, deployment,
cleanup, staging, commit, push, and pull-request creation remain unattempted.

## 2026-11-03 R4-B2 dependency-checker closure and final specialist rebind

The dependency-checker remediation first preserved a **58-file** frozen subject at working-byte
digest `5f525e6deeab00cdea64003bcef98dca122fb6613b53b838e55103863bb6d412`.
Its initial checker split had exact SHA-256 values
`78adf1992a8df4db38e11e6884e572c439a6f650f16a028bbf2f67b95df95df2` for `package.json`,
`56518134fd76250bcb886a6f16a4aa8248d1ea3671a701dbfcb1920c36510c1a` for the checker,
`e2a6c51b5299a28d2f23fa375e04104c5ca260a67eaf922530ec3dcf13b61423` for its tests, and
`d914c69493610a69ab0106e5531855f334780fcd8ca83f0b7eeb1c41e7ac8569` for the integration entry.
Root's independent direct invocation failed with the sanitized `NPM_LS_SPAWN_ERROR`, exposing that
the entry depended only on npm's `npm_execpath` environment. Valentina added deterministic
current-Node layout resolution; the interim checker/test hashes became `2a56400a…ac43f` and
`b37e23e0…db526`. Catalina passed 27/27 architecture checks, but Natalia rejected those exact bytes
with 24/26 security checks: an arbitrary absolute same-basename `npm-cli.js` could expand executable
trust, and a pre-aborted or racing `AbortSignal` could still spawn or lose its abort. Renata's
environment result was therefore recorded as HOLD, superseded by Natalia's FAIL. No rejected subject
advanced.

Valentina's final bounded repair derives the trusted npm CLI set only from fixed layouts relative to
the real current Node executable; `npm_execpath` may select only an already trusted real path.
Pre-aborted signals now settle before spawn, and spawn-time aborts perform exactly one owned-tree
cleanup and one sanitized settlement. The final exact SHA-256 values are
`78adf1992a8df4db38e11e6884e572c439a6f650f16a028bbf2f67b95df95df2` for `package.json`,
`797213b301ca17bdd14c14f196182a55ac43885876cc60d4d4c7f06047402a5e` for the checker,
`f3263f6d3a472bd061a8d5d1d55538a493786fc3d29a4559658b80ef3385da49` for its tests, and
`d914c69493610a69ab0106e5531855f334780fcd8ca83f0b7eeb1c41e7ac8569` for the integration entry.
The lockfile remains unchanged at
`DF4A53010F48DA9A7C9448E3FC754AEF6C1C76E7CC360BADE212168140093503`. Valentina's development
evidence is focused **21/21 PASS**, direct no-`npm_execpath` integration PASS, two final-byte audit
policy runs of **329/329 PASS** followed by exactly one installed-tree PASS each, and passing lint,
workspace typecheck, formatting, and diff checks. Root independently reproduced all final hashes and
the unchanged 58-file digest, then independently passed the direct integration and focused **21/21**
Windows process-tree suite.

Every fresh exact-byte gate now reports PASS on the final subject: Catalina **31/31**, Natalia
**29/29**, and Renata's environment/reproducibility gate with audit policy **329/329** plus one
installed-tree PASS, web **834/834**, API **381/381**, and **466** shared behavioral checks. The two
remaining shared checks are the expected pre-H dirty/phase-allowlist guards and must rerun after H.
The downstream specialist rebinds are Camila **30/30 PASS** with three honest runtime-required groups,
Daniela **26/26 PASS**, Julieta **100/100 PASS**, Gabriela **12/12 PASS** plus provenance **6/6**,
Isabella **18/18 PASS** plus executable claim evidence **36/36**, and Fernanda **37/37 PASS**. All
specialists reported evidence to Adriana within their assigned boundaries; implementation results did
not substitute for independent review.

The candidate remains held for Elana's sole final exact-head QA/code-review verdict. If Elana passes
the unchanged subject, Adriana may advance H, rerun the clean-checkout guards, derive A2, reconcile
protected CI, and continue under the existing standing authorization. Attempt 002, product Next,
live NVDA, the 30 browser-cell observations, 120 live NVDA observations, 49 browser transition
records, deployment, signing, and store actions remain unattempted. No user approval is required at
this point; production, signing, store, spending, credential, destructive, and external-account
actions remain separately gated.

## 2026-11-03 R4-B2 bytecode-residue repair and exact-byte rebind

Elana's sole final read-only QA gate rejected the `5f525e6d…d412` subject despite **2,176**
automated executions: **2,174 passed**, and the only two test failures were the already documented
pre-H dirty-checkout and completed-phase guards. The blocking defect was a **32,745-byte** generated
`fluyoPreflightSpeech.cpython-312.pyc`. The NVDA latch fixture imported the frozen plug-in source
without disabling Python bytecode writes, leaving the nonignored file under the repository's
`scratchpad/globalPlugins/__pycache__` directory. Because A2 validates global clean status, H and A2
remained held; deleting the file once would have been insufficient because the test recreated it.

Valentina made only the bounded fixture/test repair. The dedicated Python fixture now sets
`sys.dont_write_bytecode` before `exec_module`, and the existing native-boundary regression executes
the latch twice and asserts after each run that no `__pycache__` exists. The test detects residue; it
does not delete, ignore, or conceal it. After resolving and verifying the exact target, Valentina
removed only the generated `.pyc` and its now-empty cache directory. No `.gitignore` masking was
added. The new **58-file** frozen working-byte digest is
`34678765c8814e15dd488a68ab9dd4a584f544bec9abc500c67866b5ae0cfa35`. The exact SHA-256 values are
`112a162361d6b2433db7d7712dff140959fa524ed36130f2a1d7325961f22a20` for
`nvda-plugin-latch-fixture.py` and
`7c51f88e82ffef787972dc251ec9a73b2b3cc37b9d93ed46baf984357bb2bd72` for
`windows-native-boundary.test.mjs`; the package, checker, integration-entry, and lockfile seals remain
unchanged.

Valentina's final-byte development evidence is the repeated latch regression **1/1 PASS** with two
internal executions, Windows-native **40/40 PASS**, a clean exact R4-B **141/141 PASS**, production
exclusion **5/5 PASS**, and passing Python in-memory compilation, Node syntax, lint, formatting,
diff, and post-test residue checks. One earlier full R4-B run ended **140/141** only because Windows
returned a transient `rmSync` `EPERM` while deleting a fixed-root fixture's temporary directory. The
exact isolated test then passed **1/1**, and the unchanged clean full repeat passed **141/141**; no
code change or waiver was used. Root independently reproduced the new digest and both changed-file
hashes, passed the exact R4-B suite **141/141** outside the sandbox, and verified no bytecode residue
afterward.

Every fresh applicable specialist gate reports PASS on `34678765…fa35`: Catalina **20/20**,
Natalia **24/24**, and Renata's environment/reproducibility gate with an independent exact R4-B
**141/141** plus passing typecheck, lint, formatting, production exclusion, syntax, diff, and genuine
post-test cleanliness checks. Camila passed **14/14** accessibility checks; Gabriela passed **10/10**
research areas plus **13/13** provenance/protocol tests; Julieta retained the base **100/100**
numerical/privacy ledger and passed **12/12** repair-delta checks. Daniela passed **14/14**, with all
seven presentation bindings, **30/30** observer/plan/exclusion checks, and **464/464** focused canvas
checks. Isabella passed **18/18** claims checks plus **29/29** executable checks, and Fernanda passed
**22/22** non-coercion checks plus **30/30** plan/observer/exclusion checks. No reviewer treated
repository cleanliness as proof of live NVDA, installer authenticity, accessibility conformance, or
completed runtime evidence.

The candidate remains held for Adriana's phase-boundary reconciliation and a fresh Elana exact-state
QA/code-review verdict. H, the two clean-checkout guard reruns, A2, protected CI, Attempt 002, product
Next, live NVDA, the 30 browser-cell observations, 120 live NVDA observations, 49 browser transition
records, deployment, signing, and store actions remain unattempted. No user action is needed now;
production, signing, store, spending, credential, destructive, and external-account actions remain
separately gated.

## 2026-11-03 R4-B2 deterministic worker-cleanup repair and final rebind

Elana's fresh exact-state audit rejected the `34678765…fa35` subject after confirming the bytecode
repair itself was complete. Across **2,546** automated executions, **2,543 passed** and three failed:
the two documented post-H-only shared guards plus one material Windows cleanup failure. The first
full audit-policy unit run completed **328/329** because the retained-inventory fixture passed its
functional assertions but `rmSync` then received `EPERM` while removing its temporary root. The exact
isolated case and one clean policy repeat passed, but that did not erase the failed required run or
the recurring residue.

Read-only inspection identified three persistent test-owned roots under the real Windows temp
directory: `fluyo-fixed-retained-replace-4FmERM`, `fluyo-fixed-retained-replace-qyO62X`, and
`fluyo-fixed-retained-replace-xmR9I9`. Each contained only `owned/seed.txt` with the expected fixture
value `approved`. The defect was `terminateBrokerForTest()`: it initiated
`broker.worker.terminate()` without awaiting worker exit and retained-handle release, removed broker
registry state, and let the caller immediately delete the root. The race made cleanup
nondeterministic and invalidated H/A2 advancement.

Under the separately gated exact cleanup approval, only those three verified Fluyo test roots were
permanently removed; no other path was touched. Valentina then made the bounded three-file repair.
`terminateBrokerForTest()` is now asynchronous, attempts the closed shutdown, awaits
`worker.terminate()`, marks exit, and deletes the registry entry only when it still identifies that
broker. All **18** affected callers await the helper before root deletion. The retained-inventory
test now performs two rounds of `late-new`, `replace`, and `move`, immediately removes the owned root,
and asserts absence. It adds no retry, sleep, `EPERM` masking, or assertion-time residue cleanup.
`crashBrokerForTest` remains the intentional crash-model boundary and `shutdownBrokers` remains
process-exit-only; neither was broadened without evidence.

The new **58-file** frozen working-byte digest is
`e3b07c539e97498b65378c45a3961fb3236b8f20f979bbb9c8bb4f455e9afb21`. Exact SHA-256 values are
`1e73bd7d4753e3e9dfe22dd49c319deaba66b0a34b351ef964557176935b5622` for
`windows-native-client.mjs`,
`c36b95dec5f2d1e779350a596d2e4fd475de8024ed7e3d331a5ebc2ac41208cd` for
`fixed-root-guard.test.mjs`, and
`f5ca862fa539f7626557c3ef59de27c1223d847c31f550d356ac80da7b5bd8fc` for
`windows-native-boundary.test.mjs`. The package, checker, checker-test, integration-entry, and
lockfile pins remain unchanged.

Development and root evidence on the final bytes is focused cleanup **3/3 PASS** from a verified
zero baseline, containing **18/18** nested broker lifecycle observations; fixed-root **5/5 PASS**;
Windows-native **40/40 PASS**; exact R4-B **141/141 PASS**; two audit-policy runs of **329/329 PASS**
followed by exactly one installed-tree PASS each; production exclusion **5/5 PASS**; and passing
typecheck, lint, formatting, Node syntax, diff, topology, and post-run residue checks. Every observed
boundary ended with zero matching `fluyo-fixed-retained-*` roots and zero repository
`.pyc`/`__pycache__` artifacts.

Renata's earlier aggregate of `877` tests is withdrawn. The corrected non-overlapping ledger is
**852/852 Node test executions** (`3 + 5 + 40 + 141 + 329 + 329 + 5`), **18/18 nested broker
lifecycle observations**, and **12/12 static checkpoints**, reported as separate denominators.
Julieta independently reconciled the correction and closed the reporting discrepancy **3/3 PASS**.

Every fresh applicable specialist gate reports PASS on `e3b07c53…afb21`: Catalina **27/27**,
Natalia **26/26**, and Renata's reproducibility gate with **852/852** Node executions, **18/18**
nested lifecycles, and **12/12** static checkpoints. Camila passed **16/16** accessibility checks;
Gabriela passed **12/12** research areas plus **13/13** provenance/protocol and **5/5** exclusion
tests; Julieta's source numerical/privacy gate passed **50/50** and her corrected reporting gate
passed **3/3**. Daniela passed **12/12** static integrity checks plus **494/494** automated visual
checks. Isabella passed **18/18** claim checks plus **36/36** executable checks, and Fernanda passed
**24/24** non-coercion checks plus **30/30** executable checks. All reviews remained read-only and
reported to Adriana.

The candidate remains held for Adriana's phase-boundary reconciliation and a fresh Elana exact-state
QA/code-review verdict. H, both clean-checkout guard reruns, A2, protected CI, Attempt 002, product
Next, live NVDA, the 30 browser-cell observations, 120 live NVDA observations, 49 browser transition
records, deployment, signing, and store actions remain unattempted. No user action is needed now;
production, signing, store, spending, credential, destructive, and external-account actions remain
separately gated.

## Sprint 6 R4-B2 historical journal cleanup decision — 2026-11-04

Marlon selected option **A** in Codex on 2026-11-04 (Asia/Riyadh), explicitly approving permanent
deletion of the exact manifest-bound historical mixed local R4-B journal directory. Immediately
before deletion, the directory still matched the approved boundary: **6,125** files and
**18,534,904** bytes. Both independently defined manifests matched:

- versioned v1 manifest SHA-256:
  `71c80db07f297430f68618254cffc28666e8d8493370283f801e41cb43970567`;
- NUL-delimited manifest SHA-256:
  `0b80905db9fce2aed1cd950fe930f66262ef14a156250a7d5142268e8f5fe13d`.

Only that exact literal directory was permanently deleted. The exact historical journals and their
forensic replay are unrecoverable; the repository test fixtures remain rerunnable. Post-deletion
verification found the historical directory absent and **no dedicated test-journal residue**. This
does not claim that every unrelated temporary or operational path on the machine is residue-free.

Repository state remained unchanged by the cleanup: HEAD
`fea1f5fadb2307ca611379f30461a7ee47861fff`, zero staged paths, and `git diff --check` PASS. The
canonical working subject remains **61** paths and **6,830** manifest bytes with SHA-256
`07b14874f0118cba8a51a4f24f10811df3ff5f9bf615c8cfaf3b45416b3bba42`; this handoff file is
excluded by that canonical subject rule.

Eight exact-subject specialist gates report PASS. Julieta's post-cleanup numerical, privacy, and
claims re-audit is in progress. Elana's sole independent final exact-head QA/code-review gate has not
yet run. Overlapping test commands remain recorded under their own denominators and must not be
presented as one unique aggregate. Production, signing, store, spending, credential, publication,
and external-account actions remain separately gated.

### Final exact-head reconciliation — 2026-11-04

This entry supersedes the pending-Julieta and pending-Elana status above without rewriting that
chronology. Elana issued **FINAL PASS** on unchanged HEAD
`fea1f5fadb2307ca611379f30461a7ee47861fff` and canonical subject
`07b14874f0118cba8a51a4f24f10811df3ff5f9bf615c8cfaf3b45416b3bba42`: **61** paths and
**6,830** manifest bytes, with zero staged paths and `git diff --check` PASS. Her bug table has no
entries, and the final gate has **0 required-unattempted** checks.

Verified command outcomes remain separate because their scopes overlap: exact R4-B **154/154**,
audit policy **342/342**, web **834/834**, and the installed-tree Multer policy PASS. Lint,
typecheck, formatting, and production build also PASS. These results are not presented as one unique
aggregate.

The deleted historical **6,125-file** manifest-bound set remains absent. The current worktree has
exactly one expected content-addressed production-journal identity: one zero-byte `.journal` file.
It contains no historical or test-fixture content. The dedicated test-journal namespace remains at
zero files; this bounded statement does not claim global machine residue absence.

Attempt 002, product Next, live NVDA, physical-device and platform evidence, deployment,
production, signing, and store actions remain nonrequired for this exact-head gate and unattempted.
They are not implied by Elana's PASS and retain their existing authorization boundaries.

## Sprint 6 R4-B2 post-commit hygiene repair — 2026-11-04

Initial local commit `8d0d4e5e831088634467517f1c8f4c24aa051d90` failed Elana's post-commit
hygiene review because seven two-space Markdown hard breaks remained as trailing-space findings in
two R4-B2 documents. That commit was not pushed.

The bounded repair commit `1326394d60c1205150ac6fa0c7cca9b4d18064ab` changes exactly these two
files and no implementation or runtime bytes:

- `docs/2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md`;
- `docs/2026-11-02_r4b2_discarded_preflight_decision_v1.md`.

It replaces exactly seven two-space hard breaks with explicit CommonMark backslash breaks. The
repair has `git diff --check` PASS and a clean tree. It has not been pushed, and no pull request has
been created. The new canonical subject is **61** paths and **6,830** manifest bytes with SHA-256
`8800a0c5a79ebcb8bf3440145e6a831188dbcb73e448fb85007092aa9db7ad64`; the total remains **62**
paths when this excluded handoff is included.

Fresh exact-subject rebinds report PASS with zero failed, blocked, or required-unattempted checks in
each review: Gabriela **10/10**, Isabella **14/14**, Julieta **25/25**, Catalina **14/14**, Natalia
**12/12**, and Renata **15/15**. UI and runtime bytes are unchanged, so the prior applicable UI and
source evidence remains bound to the same implementation.

Elana's final exact-head re-audit is pending. No push or pull-request transition is authorized until
that final unchanged-head gate passes and Adriana reconciles the remaining standing conditions.

## Sprint 6 R4-B2 draft PR and CI portability reconciliation — 2026-11-04

This entry supersedes the final two stale sentences above without rewriting their chronology. Draft
PR [#72](https://github.com/r1ruffrider/Fluyo/pull/72) was opened from
`codex/sprint6-r4b2-decision-brief`. Its currently pushed exact head remains
`1326394d60c1205150ac6fa0c7cca9b4d18064ab`. GitHub reported the PR open, draft, mergeable, and
blocked. On that pushed head, **9** checks passed and the protected `Tests` check failed because the
Ubuntu job attempted Windows-native R4-B tests.

The bounded portability repair is frozen locally as two unpushed commits:

- `1416d45eb432b2537b23004b5d35c7170efb6e5e` splits the complete R4-B inventory into a protected
  portable lane and a separate Windows-native lane, adds sealed predecessor fixtures with
  production-exclusion checks, and updates exact-head workflow assertions;
- `0d1ba1fe69475a81ce1d6d016587bc193c8a1cfe` adds the repository-owned Python 3.12 resolver so CI
  and local Windows-native execution use the same self-contained command with immutable path and
  SHA-256 binding.

Current local exact head is `0d1ba1fe69475a81ce1d6d016587bc193c8a1cfe`, two commits ahead of the
remote PR head. The only remaining working-tree change is this excluded records-only handoff.
Counted local evidence on the repaired content is R4-B portable **71/71 PASS** and Windows-native
**83/83 PASS**, with zero failed or skipped tests in either lane. The audit-policy unit suite passed
**188/188**, the installed-tree probe passed, the corrected shared CI contract passed **9/9**, and
lint, typecheck, formatting, diff checks, and the production build passed. These overlapping scopes
remain separately reported.

Catalina's exact-head architecture gate passed **5/5**, and Renata's exact-head infrastructure gate
passed **10/10**, with no defects. The repair remains unpushed pending the remaining applicable
security, numerical/claims, and Elana sole independent exact-head gates plus Adriana's final
reconciliation. No production, deployment, signing, store, credential, spending, destructive, or
external-account action has been taken. **Marlon action required: none.**

### Exact-head evidence rebind after Julieta audit — 2026-11-04

Julieta's first audit of unchanged local exact head
`0d1ba1fe69475a81ce1d6d016587bc193c8a1cfe` conducted **22** checks and reported
**21 PASS / 1 FAIL**, with **5 required-unattempted** exact-head evidence checks. Her single finding
was an evidence-binding discrepancy in this records-only handoff: five successful command results
had been run before the final resolver commit and therefore could not be attributed to the final
exact head. She did not report a product-code, fixture, numerical, privacy, or production-exclusion
defect.

Root then reran the five required evidence areas on the unchanged exact head. The audit-policy unit
suite passed **188/188**; its R4-B portable phase passed **71/71** with zero failures or skips; the
installed-tree probe reported PASS; the shared CI contract passed **9/9**; typecheck passed; and the
production build passed. These scopes overlap and remain separately reported. This exact-head
rerun supersedes the evidence-binding failure above, subject to Julieta's independent re-audit; it
does not itself constitute Julieta PASS.

Natalia's independent exact-head security review conducted **16** checks and reported
**16 PASS / 0 FAIL / 0 required-unattempted**, with no blocking or should-fix defects. Her review
found no added secret, credential, PII, personal path, production endpoint, dependency change,
product authentication change, deployment action, or external-account action. Her two optional
future-hardening observations about full-SHA Action pinning and a native-test environment allowlist
are nonblocking and are not represented as completed work.

Julieta's re-audit and Elana's sole independent exact-head QA/code-review verdict remain pending.
The local commits remain unpushed, PR #72 remains draft on its older remote head, and this handoff
remains the only excluded working-tree modification. **Marlon action required: none.**

### Final local exact-head gates — 2026-11-04

This entry supersedes the pending-Julieta and pending-Elana wording immediately above without
rewriting that chronology. Julieta's independent final re-audit on unchanged exact local head
`0d1ba1fe69475a81ce1d6d016587bc193c8a1cfe` passed **10/10**, closing her prior evidence-binding
finding after the five required areas were rerun on that exact head.

Elana then issued the sole independent exact-head QA/code-review verdict: **PASS**, with
**177/177 passed**, **0 failed**, **0 blocked**, and **0 required-unattempted**. The reviewed head
remained unchanged throughout both final gates. No defect table entries require a repair, and no
new commit has invalidated either verdict.

The next authorized step is to push the unchanged local exact head, require fresh protected CI on
the pushed head—including `Tests` and `Tests (Windows native)`—and reconcile GitHub mergeability.
PR #72 remains draft on its older remote head until that push. No production, deployment, signing,
store, credential, spending, destructive, or external-account action is authorized or implied by
these local gates. **Marlon action required: none.**

## PR #72 deterministic iOS evidence repair and protected-CI handoff — 2026-11-04

This entry supersedes the stale remote-head and next-step wording immediately above without
rewriting that chronology. Draft PR [#72](https://github.com/r1ruffrider/Fluyo/pull/72) now points
to exact pushed head `e954652baac7b174290f06891284dcb8dc16eaf1`, with parent
`c751559a0f2172c4e3c874ab94ca99799e129f10`, tree
`ea7259dc17a7b2e7d311c6cb1d8acab3ce280378`, and subject
`test(ios): harden deterministic auth evidence`.

The repair commit contains exactly these three reviewed test/evidence files:

- `apps/ios/FluyoTests/AuthRuntimeKernelTests.swift`;
- `packages/shared/src/auth-runtime-synthetic-contract.test.ts`;
- `scripts/summarize-ios-test-failures.test.mjs`.

It replaces XCTest issue interception with deterministic bounded throwing checks, closes the raw
error-payload path, and extends both structural analyzers through initializer bodies including
`Vector.init`. It does not change production runtime, the corpus, workflows, dependencies,
lockfiles, timing values, or the production sanitizer. The exact-commit full shared suite passed
**468/468** across **17/17** files.

Candidate gates on the frozen blobs reported PASS: Catalina **15/15**; Natalia **15/15** plus
focused validation **10/10**; Julieta **19/19**; Gabriela **12/12**; and Renata **20/20**. Elana's
candidate gate also issued strict PASS after **808/810** aggregate executions: the two non-passing
observations were the expected pre-commit clean-tree guard and a concurrent timed test that passed
its isolated rerun, with **0 required candidate tests unattempted**.

After the commit, exact-head rebinds reported PASS on unchanged `e954652b`: Catalina **18/18**,
Natalia **17/17**, Julieta **20/20**, Gabriela **12/12**, and Renata **16/16**. Elana's sole
push-only exact-head gate passed **469/469**, with **0 failed** and **0 required-unattempted**.
Adriana then authorized pushing only this exact commit; the push completed on 2026-11-04 and the
remote PR head was verified as `e954652b`.

Protected CI is still in progress on that unchanged head. At the latest reconciled snapshot,
**8** checks had passed, **0** had failed, and **7** were in progress. PR #72 remains **draft/HOLD**
until all protected checks—including minimum and current iOS, sanitized iOS evidence, Android,
portable, and Windows-native coverage—finish successfully and Adriana reconciles the post-CI
specialist, Elana, platform, and mergeability gates. This is not a final-CI claim.

No production, deployment, signing, store, credential, spending, destructive, publication, or
external-account action was taken or authorized by this repair. **Marlon action required: none.**

## PR #72 protected-CI terminal diagnosis and final repair candidate — 2026-11-04

This append-only entry supersedes the in-progress CI snapshot immediately above without rewriting
that chronology. Remote PR [#72](https://github.com/r1ruffrider/Fluyo/pull/72) still points to exact
head `e954652baac7b174290f06891284dcb8dc16eaf1`. Protected checks on that pushed head are terminal:
**13 success, 3 cancelled, and 1 skipped**. The terminal evidence exposed two independent repair
requirements: the Windows-native path-identity boundary and an iOS deterministic-execution hang.
Those failures apply to the pushed head, not to the repaired working bytes described below.

The current final candidate is local, uncommitted, and unpushed. Its scope is **15 code paths** plus
this separately owned records-only handoff: **6 iOS evidence paths** and **9 Windows-native paths**.
The six iOS paths are:

- `apps/ios/FluyoTests/AuthRuntimeKernelTests.swift`;
- `packages/shared/src/auth-runtime-synthetic-contract.test.ts`;
- `packages/shared/src/ios-foundation-structure.test.ts`;
- `scripts/ios-ci.sh`;
- `scripts/summarize-ios-test-failures.mjs`;
- `scripts/summarize-ios-test-failures.test.mjs`.

The nine Windows-native paths are:

- `scripts/r4b-evidence/preflight-attempts.mjs`;
- `scripts/r4b-evidence/preflight-attempts.test.mjs`;
- `scripts/r4b-evidence/windows-native-boundary.cs`;
- `scripts/r4b-evidence/windows-native-boundary.test.mjs`;
- `scripts/r4b-evidence/windows-native-client.mjs`;
- `scripts/r4b-evidence/windows-native-test-journal-cleanup.cs`;
- `scripts/r4b-evidence/windows-native-test-journal-runner.mjs`;
- `scripts/r4b-evidence/windows-native-test-journal-runner.test.mjs`;
- `scripts/r4b-evidence/windows-trusted-temp-root.mjs`.

Local evidence on these working bytes remains separated by scope because the commands overlap:

- Renata's independent Windows-native run passed **89/89** in **257.052 seconds**, with zero test
  residue, zero active lanes, and the production journal unchanged;
- the portable lane passed **71/71**;
- audit policy passed **188/188**, including a separately reported portable **71/71** phase;
- the current iOS structural set passed **20/20**, and the alternate tracked-index auth simulation
  passed **9/9**;
- the sanitizer passed **1/1**, including **4/4** compile-phase cases.

Specialist evidence to date reports no repaired-byte numerical, privacy, scope, production, signing,
or store defect. Renata's independent Windows result is PASS. Julieta's **40-check** audit reported
**38 PASS / 2 FAIL**, with both failures confined to records: the stale protected-CI snapshot in
this handoff and the stale PR-body head. Valentina's development evidence is not represented as an
independent specialist or QA gate. Further applicable specialist rebinds and Elana's sole final
exact-candidate and exact-head gates remain required.

The PR body is stale: it still names `1326394d…` rather than the authoritative remote head
`e954652b…`. It must be refreshed only after the final candidate is committed and pushed, when the
new immutable head and verified evidence are available. No PR-body mutation is authorized by this
records update.

**HOLD:** no protected CI has run on the repaired 15-path bytes. Do not mark PR #72 ready and do not
merge until the final candidate is committed under the applicable gates, pushed unchanged,
protected CI passes on that exact head, the PR body is reconciled, and Adriana confirms the final
specialist, Elana, platform, and mergeability gates. No production, deployment, signing, store,
credential, spending, destructive, publication, or external-account action was taken. **Marlon
action required: none.**

## PR #72 portable Windows-authority import repair candidate — 2026-11-04

This entry supersedes the prior PR #72 terminal-diagnosis status without rewriting its chronology.
Draft PR [#72](https://github.com/r1ruffrider/Fluyo/pull/72) remains open and blocked at exact pushed
head `9a9810008e93ec9f0e4670a2dd740d363c8726cb`. The last terminal protected ledger on that old head
contains **17** checks: **13 success**, **3 failure** (`Tests`, `Tests (Windows native)`, and current
Android API 37 emulator evidence), and **1 skipped** sanitized Android result. Those results describe
the pushed head only; they do not certify the local repair below.

The current compatibility repair is local, uncommitted, unpushed, and based on
`9a9810008e93ec9f0e4670a2dd740d363c8726cb`. It changes exactly six files:

- `scripts/r4b-evidence/preflight-attempts.test.mjs`;
- `scripts/r4b-evidence/windows-native-boundary.test.mjs`;
- `scripts/r4b-evidence/windows-native-client.mjs`;
- `scripts/r4b-evidence/windows-native-test-journal-runner.mjs`;
- `scripts/r4b-evidence/windows-native-test-journal-runner.test.mjs`;
- `scripts/r4b-evidence/windows-trusted-temp-root.mjs`.

The six-file binary diff has Git SHA-1 `480378cc65338ce6316b0874c50fd4ccf9fe8bdb`, SHA-256
`e8a86d66c678a0ae4c66364c1bbc0f787cf4c8d7c712c8c8c7439ce9e9b40193`, and a stat of **281
insertions / 36 deletions**. It makes Windows temp authority lazy and import-safe on non-Windows
systems, requires authority before every Windows-native mutating or test operation, permanently
fails closed after an invalid capture, freezes the cleanup environment, and preserves the existing
handle-identity, 8.3-alias, reparse, identity-swap, protocol-v3, cleanup, workflow, timeout,
dependency, and product-runtime boundaries.

Independent exact-diff evidence reports PASS: Catalina **106/106**; Natalia **45/45**; Renata
**24/24**, including **888/888** core executions and Windows-native **89/89** in **228.524 seconds**
with zero active lanes or test-journal residue and the production journal unchanged; and Julieta
**109/109**. Portable tests passed **71/71**, audit-policy unit tests passed **188/188** with the
installed-tree check PASS, and shared tests passed **468/468**. Lint, all-workspace typecheck,
formatting, audit policy, and diff checks passed. These command scopes overlap and are intentionally
reported separately.

Gabriela provenance review and Elana's sole independent final exact-candidate QA remain pending at
this record boundary. No repair commit or protected run exists yet. PR #72 must remain draft/HOLD;
any candidate-byte change resets the applicable gates. After exact-candidate PASS, the unchanged
candidate still requires commit/push gates, protected portable, Windows-native, Android,
minimum/current iOS, sanitized platform evidence, live PR-body reconciliation, and a fresh final
Elana exact-head merge gate. No production, deployment, signing, store, credential, spending,
destructive, publication, or external-account action is authorized or implied. **Marlon action
required: none.**

Gabriela's exact six-file provenance/platform review subsequently completed **PASS 99/99**, with
zero defects and zero required-unattempted cases within that gate; only Elana's final
exact-candidate QA remains pending at this record boundary.

## PR #72 combined portable-fixture and cold-HELLO repair candidate — 2026-11-04

This append-only entry supersedes the obsolete PR #72 candidate and protected-ledger wording
above without rewriting that chronology. Draft PR
[#72](https://github.com/r1ruffrider/Fluyo/pull/72) remains open and blocked at exact pushed head
`ddc7c508eb62f002763db7c760a4b10d8aebd45c`. Its terminal protected ledger contains exactly
**17** checks: **13 success**, **2 failure** (`Tests` and `Tests (Windows native)`), **1 cancelled**
current iOS check, and **1 skipped** sanitized iOS result. The current-iOS job acquired no hosted
runner, executed **0** steps, produced no job log, and reported an explicit macOS arm64 hosted-runner
capacity constraint. It is therefore platform-unattempted rather than a product or candidate test
failure. The minimum-iOS check passed. A future immutable candidate head must obtain successful
current-iOS execution and sanitized aggregate evidence before merge.

The current combined repair remains local, uncommitted, unstaged, and unpushed on base
`ddc7c508eb62f002763db7c760a4b10d8aebd45c`. Before this records entry, it changed exactly four
files with **67 insertions / 13 deletions** and Git binary-diff fingerprint
`db470c514aacc27582d70796a95f64fd9d46ce46`:

- `scripts/r4b-evidence/nvda-adapter/protocol.test.mjs` — SHA-256
  `4c507024db7663753e8b6d565b6c224b4f3fdd05d1254afb9c3a8e9ae54f05c9`;
- `scripts/r4b-evidence/preflight-executor.test.mjs` — SHA-256
  `97aba7899c23ce32ce537fddcae7a19e0e734e137fdc4b765f7e6d4163b39843`;
- `scripts/r4b-evidence/windows-native-boundary.test.mjs` — SHA-256
  `63fd41c0f2fd426457f5f4938e54fb7ee5e5e886c0668cbabc72690b8b696f92`;
- `scripts/r4b-evidence/windows-native-client.mjs` — SHA-256
  `2514c99d4b4c019a6c8c9a2a608bc08eec772a259d79e60e05eb9e7be6204e8b`.

The two test-fixture files enable the Windows test-root capability only when
`process.platform === "win32"`, preserving the fixture's Windows behavior while allowing the
portable Linux lane to load the files without widening authority. The client repair gives only the
first broker `HELLO` at sequence `1n` a **120,000 ms (120 second / 2 minute)** deadline. Later
`HELLO` requests, all non-`HELLO` operations, and the ordinary default remain **30,000 ms
(30 seconds)**. There is no retry, fallback, global timeout increase, workflow, protocol, C#,
fixed-root, cleanup, dependency, lockfile, production-runtime, or authority change.

Independent frozen-byte evidence reports PASS: Catalina **191/191**; Natalia **24/24**; and Renata
with Windows-native **90/90** in **266.549 seconds**, including the formerly failing fixed-root
byte-bound subtest in **2.128 seconds**. Renata also reproduced portable **71/71**, audit policy
**188/188** plus portable **71/71** and exactly one installed-tree PASS, and shared **468/468**.
Post-run evidence showed **0** active lanes, **0** test-journal residue, and the historical
production journal unchanged. Julieta's independent **67-check** audit passed all candidate
identity, timing, arithmetic, evidence, and protected-ledger checks; its records-only failures are
superseded by this entry. The command scopes overlap and remain deliberately reported separately.

**HOLD:** adding this handoff produces a fifth candidate path and therefore requires a new exact
candidate fingerprint plus bounded records/applicable specialist rebinds before Elana's sole final
exact-candidate QA. Do not stage, commit, push, mark ready, or merge yet. After an unchanged commit
and push, reconcile the live PR body to that immutable head and require fresh protected portable,
Windows-native, Android, minimum/current iOS, and sanitized platform evidence before the final
Elana merge gate. No production, deployment, signing, store, credential, spending, destructive,
publication, or external-account action was taken or authorized. **Marlon action required: none.**

## PR #72 Android lifecycle and Windows fixture repair candidate — 2026-11-05

This append-only entry supersedes the stale PR #72 head, candidate-scope, evidence, and protected
ledger statements above without rewriting their chronology. Draft PR
[#72](https://github.com/r1ruffrider/Fluyo/pull/72) remains open and blocked at exact pushed head
`50ccc3422a441e16ac6658a131d56001f797bd82`. Its terminal protected ledger contains exactly **17**
checks: **14 success**, **2 failure**, and **1 skipped**. Minimum Android API 29 failed with the
sanitized category `summary_mismatch` in
`FoundationResponsiveDeviceTest#resizePreservesTheNewestStateAcrossWindowClasses`; Windows-native
failed after **89/90** passes when the two-ordinal NVDA latch fixture's Python child exceeded its
test-only **10-second** limit; the sanitized Android aggregate was skipped because the minimum leg
failed. Current Android API 37, minimum and current iOS, sanitized iOS, portable CI, and the other
protected checks passed. These results apply only to pushed head `50ccc342…` and do not certify the
local repair below.

The current repair is local, uncommitted, unstaged, and unpushed on base
`50ccc3422a441e16ac6658a131d56001f797bd82`. Before this records entry it changes exactly three
test/evidence paths with **78 insertions / 5 deletions**, Git binary-diff fingerprint
`a72eae477b19e957cf2a64b70cced0d66a4c6580`, and stable patch ID
`d41477dc44a37c8a00dab1aaf5c80ffad7a31e5d`:

- `apps/android/app/src/androidTest/java/com/fluyo/app/FoundationResponsiveDeviceTest.kt` —
  SHA-256 `baf52f03f581e71410c27c56437626afdb50efb3ca965cae1fa78419ab91f338`;
- `packages/shared/src/android-foundation-structure.test.ts` — SHA-256
  `b2931a167242bb17aea17da3ed96d787a0c3d941b54cd6343f5010c43d2d2c6a`;
- `scripts/r4b-evidence/windows-native-boundary.test.mjs` — SHA-256
  `986017ecfd3df5d186fe49277f2147dcc8d9775ca647f7be7973d649924fd5d2`.

The Android test repair uses **20 probes** with an **up-to-5-second sleep budget** per orientation
settlement, excluding probe and dispatch overhead. A successful settlement may consume from **0 to
4.75 seconds** of sleep. It settles landscape geometry and executes a resumed-activity barrier
before the explicit recreation, then executes a second resumed barrier before retaining the
existing signed-out-state, action, and visible-geometry assertions. Cleanup settles portrait
geometry and executes its resumed barrier before closing. The structural test locks both exact
orders, helper bounds, barrier counts, sentinels, explicit recreation, and forbidden weakening
patterns. No application runtime, API matrix, workflow parser, method timeout, retry, or assertion
was changed.

The Windows repair gives only the existing latch-fixture Python child a named **30-second maximum
per ordinal**. Its two ordinals therefore have a **60-second sequential ceiling**; this is a bound,
not an actual-duration claim. Each ordinal retains **120 observation cycles** and **360 accepted
transcript callbacks**, for **240 generations**, **480 control-phase frames**, and **720 accepted
callbacks** across both ordinals. Exact PASS comparison, interpreter binding, bytecode exclusion,
cleanup, and fail-closed timeout termination remain unchanged. There is no retry, fixture/plugin,
client/runtime, broker, workflow, dependency, or global-timeout change.

Independent exact-byte evidence reports: Catalina architecture **24/24 PASS**; Natalia security and
scope **36/36 PASS**; and Renata reproducibility PASS with Android structure **10/10**, offline
Android compile and both development assemblies successful across **71 actionable Gradle tasks**,
three focused latch passes at **17.346 / 17.845 / 17.216 seconds**, Windows-native **90/90** in
**243.071 seconds**, portable **71/71**, audit policy **188/188** plus its required portable
**71/71** and one installed-tree PASS, and lint/typecheck/format/diff checks PASS. Renata reported
**0** test-journal entries, **0** production-journal entries, and **0** active test handles after
the run. Shared tests reported **467/468**; the sole failure was the expected pre-commit clean-tree
guard observing this approved dirty diff, with **0 unexpected failures**. The command scopes overlap
and are intentionally reported separately.

Julieta conducted **70** audit checks: **67 passed** and **3 records/wording checks failed**. This
entry supersedes those three discrepancies by correcting the Android sleep-budget language, the
NVDA cycle/frame/callback denominators, and the authoritative head/scope/protected ledger. Julieta
found no candidate-code, privacy, credential, production, signing, store, dependency, workflow,
parser, or global-timeout defect. The installed local Android SDK has no API 29 image or AVD, so no
faithful local API 29 execution is claimed. A future immutable candidate head still requires fresh
protected API 29 and API 37 legs plus sanitized Android aggregate evidence.

**HOLD:** this handoff is the fourth candidate path and requires a new exact four-path fingerprint,
records/applicable specialist rebinds, and Elana's sole exact-candidate PASS before any commit.
After an unchanged commit and exact-head push gate, all protected CI and platform evidence must rerun
on that new head. Do not mark PR #72 ready and do not merge until the PR body is reconciled and the
final exact-head specialist, platform, mergeability, and Elana gates pass. No production,
deployment, signing, store, credential, spending, destructive, publication, or external-account
action was taken or authorized. **Marlon action required: none.**

## PR #72 post-commit records status — 2026-11-05

This append-only status supersedes the operational precommit wording above without erasing its
chronology. The exact local repair is now committed at HEAD
`2ec80c6954fa9c277e277ac21fa755e6b8a6aef3`, with parent
`50ccc3422a441e16ac6658a131d56001f797bd82` and tree
`f7f41827b14d8c6daa4ae1de330a2a23cc3d2f61`. The commit changes exactly the four recorded files with
**151 insertions / 5 deletions**. At the post-commit checkpoint, the index and worktree were clean;
this entry is now the sole unstaged records-only diff. The branch is **ahead 1 / behind 0** and
remains unpushed. Post-commit clean-tree shared tests passed **468/468** in **525.80 seconds**.

The committed repair's exact-head rebinds report Catalina **36/36 PASS**, Renata **29/29 PASS**,
Natalia **60/60 PASS**, and Bianca **21/21 PASS**. Julieta's strict records-only verdict remains
**FAIL** pending this correction. This entry creates a new exact records-only candidate that is not
authorized for commit or push until the applicable Bianca records, Natalia security, and Julieta
numerical/claims rebinds pass and Elana issues an exact-candidate **PASS**. After an unchanged records
commit, a clean-tree exact-head rebind is required before push.

PR #72 remains draft/**HOLD**. After an unchanged push, fresh protected API 29, API 37, sanitized
Android aggregate, all other required protected-platform checks, mergeability, and Elana's final
exact-head gate remain mandatory before ready or merge. **Marlon action required: none.**

## PR #72 current-iOS protected failure and test-only candidate — 2026-11-05

At base `e21a2e112a0033c0ae44c5b8a7915a9aa554b406`, the terminal protected ledger is **18** checks:
**16 success**, **1 current-iOS failure**, and **1 aggregate skipped**. Android API 29, API 37, and
the sanitized Android aggregate passed; minimum iOS passed. Current-iOS job `126982548586` compiled
successfully, then exited **1** and skipped evidence upload. Its exact sanitized signature is
`phase=test_current; category=auth_contract; corpus=transient_refresh_failure_preserves_candidate; stage=step; mismatch=assertion_recorded`.
The iOS aggregate job `126987286193` was skipped.

Catalina diagnosed a test-observation race: the provider-start barrier does not prove that the
delayed 500 ms clock path has been evaluated or that its presentation effect is observable before
the immediate history read. The frozen repair remains test-only in
`apps/ios/FluyoTests/AuthRuntimeKernelTests.swift` and
`packages/shared/src/ios-foundation-structure.test.ts`: a per-instance one-shot signal marks delayed
500 ms evaluation, and one bounded 64-yield observation helper reads the existing history. It does
not change production/runtime code, workflows, dependencies, the platform matrix, corpus
assertions, or add sleeps, retries, hidden retries, or assertion weakening.

The exact unstaged two-file candidate is **122 insertions / 4 deletions**, stable patch ID
`b493b9d9c5dc1fc054ed46c223bf3f9536f63987`, and Git binary-diff fingerprint
`17c9a996a6a12c9c4961c786bb28c23ca05e2af5`. The Swift file has SHA-256
`4c3c8ff23c89acfd95f4b4d27f3cff2c381e933b71a695bac8e53d662853a6fa` and blob
`32128584af415c279416aadc5b78541517b7df88`; the structure test has SHA-256
`e692cf9b20d3999a02f0e7dc6d897b3cc2c9924d5ac93b7b461bf6086ee9755b` and blob
`55d08febee76f832181c2100da787fa71f16e182`. Development evidence reports structure **12/12**,
static **29/29**, and lint, typecheck, format, and diff checks PASS. The candidate shared total is
expected to be **469**, but it has not been run. Native Xcode is unavailable locally.

Specialist gates report Catalina **36/36 PASS**, Natalia **46/46 PASS**, Julieta **62/62 PASS**, and
Renata **47/47 PASS**. This candidate is not authorized for commit or push: it still requires
Bianca's exact records rebind and Elana's **COMMIT-ONLY** exact-candidate PASS. After an unchanged
commit, a clean-head exact-candidate rebind is required before push. After an immutable push, fresh
minimum-iOS, current-iOS, and sanitized iOS aggregate evidence must pass, including **3 consecutive
independent canonical current-Xcode current-job/corpus PASS runs** with no hidden retries. All other
protected checks, mergeability, and Elana's final exact-head PASS remain mandatory before ready or
merge. PR #72 remains draft/**HOLD**. **Marlon action required: none.**

## PR #72 four-path iOS candidate and evidence status — 2026-11-05

This append-only entry supersedes the three-path candidate identity and evidence above without
rewriting that chronology. Immediately before this records append, the exact candidate on base
`e21a2e112a0033c0ae44c5b8a7915a9aa554b406` had four paths and **197 insertions / 10 deletions**:
Swift **18/4**, the prior handoff
**37/0**, auth-runtime synthetic contract **38/6**, and iOS structure **104/0**. Its Git binary-diff
fingerprint is `ad1155070c07108c8dba314d71327423a38991e5`, and its stable patch ID is
`26cf1371704474894bf7bd18e396c379af9a1d25`.

The Swift file retains SHA-256
`4c3c8ff23c89acfd95f4b4d27f3cff2c381e933b71a695bac8e53d662853a6fa` and blob
`32128584af415c279416aadc5b78541517b7df88`; the prior handoff retains SHA-256
`da7d2da5a9af45f0c4bc512f48de95da701b42ff4e8fe02cec10679fb55d2d55` and blob
`2b17a0f5baea946b472b9c7d68b6b24518794622`; the auth-runtime synthetic contract has SHA-256
`ebae1cce33a150c7e56ac7685a57b9c12f923038c3a03cc5eed69816f8bd8e08` and blob
`d6e56700eb13d35955e565eba01577a83337d4d9`; and the iOS structure test retains SHA-256
`e692cf9b20d3999a02f0e7dc6d897b3cc2c9924d5ac93b7b461bf6086ee9755b` and blob
`55d08febee76f832181c2100da787fa71f16e182`.

Targeted tests pass **9/9**. Full shared tests report **468/469**, with the sole failure being the
expected dirty-tree guard; an unchanged clean commit is expected to report **469/469**. Lint,
typecheck, format, and diff checks pass. The fourth-path freeze passes **24/24**, and Catalina's final
architecture gate passes **42/42**. Natalia's code/security review passes, but her combined records
verdict is **FAIL 72/74** pending this correction.

Commit and push authority remain closed. This new exact combined candidate requires fresh
applicable records, security, numerical/claims, infrastructure, and architecture rebinds plus
Elana's **COMMIT-ONLY** exact-candidate PASS before commit. After an unchanged commit, a clean-head
exact-candidate rebind is required before push. After an immutable push, the required native iOS
minimum/current/aggregate evidence and **3 consecutive independent canonical current-Xcode
current-job/corpus PASS runs** with no hidden retries remain mandatory, together with all protected
checks, mergeability, and Elana's final exact-head PASS before ready or merge. PR #72 remains
draft/**HOLD**. **Marlon action required: none.**

## PR #72 committed iOS candidate status — 2026-11-05

This append-only entry supersedes the operational precommit state above without rewriting its
chronology. The candidate commit is complete at exact HEAD
`64594890c278465318e172c676b63f5aca3d4508`, with parent
`e21a2e112a0033c0ae44c5b8a7915a9aa554b406` and tree
`c8989df1ed23da8873f28d8fde186cae96bfc267`. It changes exactly the four recorded paths with **232
insertions / 10 deletions**. At the verified post-commit checkpoint, the index and worktree were
clean, the branch was **ahead 1 / behind 0**, and HEAD remained unpushed. Clean shared evidence
passed **17/17 files** and **469/469 tests** in **449.18 seconds** with exit **0**.

Clean-head gates report Bianca **28/28 PASS**, Catalina **60/60 PASS**, Renata **32/32 PASS**, and
Natalia **90/90 PASS**. Julieta's code and numerical review passes, but her combined verdict remains
**FAIL 86/90** on records pending this correction.

The candidate commit is complete; push remains closed. This exact records-only candidate is not
authorized for commit until fresh Bianca records, Natalia security/authority, and Julieta
numerical/claims rebinds all pass and Elana issues an exact-candidate **COMMIT-ONLY PASS**. An
unchanged records commit must then receive a clean exact-head **PUSH-ONLY** gate before push. After
an immutable push, native minimum-iOS, current-iOS, and sanitized iOS aggregate evidence plus **3
consecutive independent canonical current-Xcode current-job/corpus PASS runs** remain mandatory,
together with all protected checks, mergeability, and Elana's final exact-head PASS before ready or
merge. PR #72 remains draft/**HOLD**. **Marlon action required: none.**

## PR #72 final non-recursive records transition — 2026-11-05

This append-only entry preserves the chronology above and anchors the exact clean checkpoint at HEAD
`138402ffb4d3190875976a6c1f2637a041a4c2db`, parent
`64594890c278465318e172c676b63f5aca3d4508`, tree
`0772166e8ede6579fe15148270f118db996f6e4b`, with the branch **ahead 2 / behind 0** and unpushed. The
preceding records commit from `64594890…` to `138402ff…` changes only this handoff by **24 insertions
/ 0 deletions**, with Git binary-diff fingerprint `9bb28343c6d35cafffef0ea8b3b5fe06a89a8f6f`,
stable patch ID `2edf81f94353da76ea5d5cd935eea91aad09edde`, handoff SHA-256
`206a7d9a10a55a0267f241e9116e120eff84cb704d54107509619e6dcadde84e`, and blob
`928762c3545339f077bf7995abe7c2dad5cce101`.

The clean shared result of **469/469 tests** ran at unchanged-code HEAD `64594890…`. It transfers to
`138402ff…` as code evidence because the intervening commit is records-only; it is not claimed as an
exact-`138402ff…` test execution.

The commit containing this entry is the final records transition and **MUST** have parent
`138402ffb4d3190875976a6c1f2637a041a4c2db`. Its resulting HEAD, tree, handoff hash, diff fingerprint,
and patch ID are intentionally derived after commit and reported externally in gate evidence; they
are not embedded or self-hashed here. No further append may be created solely to restate those
derived identifiers.

Before this final records commit, fresh Bianca records, Natalia security/authority, and Julieta
numerical/claims rebinds must all pass, and Elana must issue an exact-candidate **COMMIT-ONLY PASS**.
Push remains closed. After an unchanged records commit, a clean exact-head rebind and **PUSH-ONLY**
gate are required before push. After an immutable push, native minimum-iOS, current-iOS, and
sanitized iOS aggregate evidence plus **3 consecutive independent canonical current-Xcode
current-job/corpus PASS runs**, all protected checks, mergeability, and Elana's final exact-head PASS
remain mandatory before ready or merge. PR #72 remains draft/**HOLD**. **Marlon action required:
none.**

## R4-B A3 privacy migration record — 2026-11-10

This append-only entry records Marlon's explicit **1/A** selection on 2026-11-09 and supersedes
only later status claims; it does not rewrite the earlier chronology. Marlon authorized permanent
deletion of the exact privacy-bearing v1 manifest only after verifying its exact identity. Before
deletion, `scripts/r4b-evidence/root-only-helper-pe-build-manifest.json` was verified as a regular,
non-reparse, untracked file absent from Git history, exactly **8,232 bytes**, with full SHA-256
`ff5f8d8d5d6ea1b3fd1aedfed0508f86452587a5c74cd4e1a433e25c86ced7ce`. That exact file was
permanently deleted. No copy, backup, recovery object, trash entry, archive, retained content, or
future content-reverifiability claim exists. Post-deletion scans found zero same-name files and zero
remaining 8,232-byte files with that digest across the checked worktrees.

The retained A3 record is a derivative migration record, not independent proof from which the
deleted content or its digest can now be re-derived. It retains only the contemporaneously verified
full SHA-256, byte count `8232`, and the fixed migration reason. Claims must rely on the
contemporaneous pre-deletion verification and must never imply recoverability, retained bytes, or
future verification of the deleted content.

The seven retained migration and consumer files are:

- `scripts/r4b-evidence/root-only-helper-pe-migration-a3.json` — **421 bytes**, SHA-256
  `81976d818548318ffef3b68e94e8569f0fe8baca18be1f707dc4dd7cc6bab06c`;
- `scripts/r4b-evidence/root-only-helper-pe-migration-index.json` — **242 bytes**, SHA-256
  `497f68bd47b9f2ac3528699d76a9fd6e2bd1034ae240163e08f29efa0e87791e`;
- `scripts/r4b-evidence/root-only-helper-pe-migration-gaps.json` — **557 bytes**, SHA-256
  `2ef674fa6bb5ef0a5764ba85b8db6706c307d1a108a2ee2da333285e1f206866`;
- `scripts/r4b-evidence/root-only-closure-schema.mjs` — **33,688 bytes**, SHA-256
  `7ffe2dac09581835ec0c919cea964b743468f19747de903aafd7126004cd6b9e`;
- `scripts/r4b-evidence/root-only-output-broker.test.mjs` — **15,233 bytes**, SHA-256
  `0ecd60298ae336e6e5505ce65629a3648671f1bc756e8022ba81615490194ce4`;
- `scripts/r4b-evidence/root-only-install-controller.mjs` — **17,092 bytes**, SHA-256
  `316f7971e637dd6a8fa9cb647558753525fc7e46856a9920463e55eff3f840f4`;
- `scripts/r4b-evidence/root-only-closure-handoff.mjs` — **21,686 bytes**, SHA-256
  `109a59048ceb52e347f9af30e98a4e5ea2ff79473187f42e4db1b935ce396139`.

The canonical retained-manifest digest is computed from exactly those seven rows sorted by
repository-relative path. Each UTF-8 row is encoded exactly as
`repo-relative-path\0byte-count\0sha256\n`; concatenating the seven rows produces an **882-byte**
preimage whose SHA-256 is
`0ebe1259bee322724064c1efa9f82a2acfca7d444bb0227063e252126b63580f`.

The closed migration-gap record contains exactly five ordered entries: two permanent nonblocking
gaps (`V1_CONTENT_UNRECOVERABLE`, `V1_CONTENT_NOT_REVERIFIABLE`) and three open blocking gaps
(`ATTEMPT004_AUTHORITY_NOT_FROZEN`, `ATTEMPT004_BROKER_ONLY_BUILD_NOT_EXECUTED`,
`ATTEMPT004_RESULT_NOT_VALIDATED`). All four consumers were migrated away from the deleted manifest.
`STALE_REBUILD_REQUIRED` remains the first execution barrier, and the three open gaps block
Attempt004.

Development evidence is bounded and reported without inflation: focused migration checks pass
**14/14**; portable R4-B passes **127/127**; and the Node assertion inventory passes **237/237**.
The overall `test:r4b:exact` command nevertheless exits **1** after those tests because its separate
post-test hook reads an unavailable historical Attempt001 operational result. The exact lane is not
claimed as passing, and the missing historical seal must not be recreated, recovered, or fabricated.
Full-workspace lint and typecheck are likewise not claimed green: unrelated pre-existing untracked
root-closure files and stale cross-worktree dependency resolution prevent those claims. Exact-file
lint, syntax, selected formatting, and diff checks pass.

Specialist evidence at this checkpoint is: Catalina **59/59 PASS**; Natalia **187/187 PASS WITH
INTEGRATION HOLD**; Julieta **56/58**, with both records-only failures resolved by this append;
Gabriela **36/38**, with both records-only failures resolved by this append; and Renata **378/378
repository evidence PASS WITH INTEGRATION HOLD**. Attempt004 remains **HOLD** until this sanitized
migration is immutable, a clean isolated install and protected CI pass, exact-head specialist and
Elana gates pass, and a separate broker-only authority/result cycle is frozen. No production,
signing, store, spend, credential, provider, external-account, or public-release action is
authorized. **Marlon action required now: none.**

## R4-B A3 Option-A structural repair record — 2026-11-10

This append-only entry supersedes only the later Option-A candidate status and preserves the
privacy-migration chronology above. The stable seven-file Option-A core contains exactly two
updated core files:

- `scripts/r4b-evidence/root-only-install-controller.mjs` — **17,154 bytes**, SHA-256
  `19b0b77ed266c7c989e2042d4a56430a1f32348b6a1ae53d531304d605a0424e`;
- `scripts/r4b-evidence/root-only-closure-handoff.mjs` — **21,709 bytes**, SHA-256
  `1bbb7a74628faaa38688d1cff9b71065ac81799bb54c298fe32c8f6481924cf4`;

The separately reviewed structural test, which is not part of the core seven, is:

- `scripts/r4b-evidence/root-only-install-controller.test.mjs` — **12,059 bytes**, SHA-256
  `4afc241334962233269aba0777f10c789cdb8c509d63728360dc75cd5535079d`.

The other five core files are unchanged from the preceding migration record:

- A3 SHA-256 `81976d818548318ffef3b68e94e8569f0fe8baca18be1f707dc4dd7cc6bab06c`;
- migration index SHA-256
  `497f68bd47b9f2ac3528699d76a9fd6e2bd1034ae240163e08f29efa0e87791e`;
- migration gaps SHA-256
  `2ef674fa6bb5ef0a5764ba85b8db6706c307d1a108a2ee2da333285e1f206866`;
- closure schema SHA-256
  `7ffe2dac09581835ec0c919cea964b743468f19747de903aafd7126004cd6b9e`;
- output-broker test SHA-256
  `0ecd60298ae336e6e5505ce65629a3648671f1bc756e8022ba81615490194ce4`.

The stable core-seven binding uses seven repository-relative rows sorted by path and encoded exactly
as `repo-relative-path\0byte-count\0sha256\n`. Its UTF-8 preimage is **882 bytes** and has SHA-256
`7dc4b5b40e2248b451e4f98113892d9da6dac0cf39b10619b2c4faecc9416d0a`.

The structural test is the eighth reviewed core artifact. Applying the same sorted-row formula to
the seven core files plus that test produces a **1,012-byte** UTF-8 preimage with SHA-256
`fa26d621158c35c6ffa1d50fe14993ec673c3879916a9489e0d79d59db455c5b`.
That eight-file value is an external review binding. It does not include this handoff, is not a
self-hash, and must change if any reviewed core or test byte changes. No self-inclusive handoff
digest is embedded here.

The repair keeps the controller and handoff authority objects closed, frozen, and exactly ordered;
binds the reviewed authority digest, head, tree, trusted parent head, and trusted parent tree; and
keeps the controller broker connection closed to the exact executable, `CONTROLLER` phase,
checkout, contract digests, approvals, authority state, approved environment, and controller timeout.
The structural adversaries reject reordered, missing, unknown, duplicated, unfrozen, or wrongly
bound authority fields; wrong phase or timeout; omitted authority state; and misleading prefixed
source text. Broker execution remains no-shell and continues behind the tracked-build and repeated
authority checkpoints. No runtime, protocol, dependency, privacy, or Attempt004 authority is
expanded.

Evidence at these exact bytes is: structural tests **3/3 PASS**, focused migration tests **15/15
PASS**, portable R4-B **128/128 PASS**, and the Node assertion inventory **238/238 PASS**. The overall
exact command still exits **1** only at its separate unavailable historical Attempt001 operational
seal; it is not described as a passing exact lane and that evidence must not be recovered or
fabricated. Catalina reports **PASS** and Natalia reports **PASS WITH the existing integration
HOLD**.

The approved deletion, zero-copy privacy boundary, derivative-record limitation, and permanent
non-recoverability/non-reverifiability facts remain unchanged. Attempt004 remains **HOLD** pending
the immutable sanitized migration, clean protected evidence, exact-head specialist and Elana gates,
and a separately frozen broker-only authority/result cycle. No production, signing, store, spend,
credential, provider, external-account, or public-release action is authorized. **Marlon action
required now: none.**

## R4-B A3 non-reproducible verifier hold and pending decision — 2026-11-10

This append-only entry supersedes only later verifier-provenance, candidate-inventory, specialist,
and PR #87 status claims. It preserves every earlier record and does not modify the reviewed source,
tests, executable, or receipt. The retained build-provenance receipt is
`scripts/r4b-evidence/root-only-closure-ntfs-build-provenance.json`, exactly **5,864 bytes**, SHA-256
`10ef452feb0afe309f8e35e1d8e21e6b302fe17f19e792d2535242d45706424f`. Its recorded outcome is
`NON_REPRODUCIBLE_HOLD`.

The receipt records **6 unique builds** across two three-build series. `HISTORICAL_V1` produced
SHA-256 values `337eca65a75b5d85313e3011b244605cc7bd1677a2128e08d39ba89949582935`,
`2b436ea000fd6fb96617357262152b8771a8ca410065d7ffb3bd7374c524f746`, and
`02b7d143693e5f7258ff78f7afd69f35c929108989687fcb5505fc694ddf9dab`.
`CLOSED_V2` produced SHA-256 values
`7b4024f87a77393e3834b8ebc3e5a8b6c447f0f2ab98b846e882e388ca60763e`,
`f3eb3d1abe99c594aa3fc612f2be0403b824a9f30e8872e1702a2a8f2296618a`, and
`ed5a0ceb8c38c81e11bc19675e16d8d476cab36cae3607aab16ad32317eabde7`.
No build matched the current executable. Cleanup is exactly **6 attempt roots created / 0 attempt
roots retained / 0 outputs retained**, with `rawStdoutRetained: false` and
`rawStderrRetained: false`. The raw build outputs were deleted and are not independently
reverifiable from retained bytes; no reconstruction or reproduction claim is made.

The exact source is `scripts/r4b-evidence/root-only-closure-ntfs.cs`, **24,368 bytes**, SHA-256
`c61440ce230cb24257e4bc2c090d2f02a2548134eb0bad977eaa4e423c717f03`. The current executable is
`scripts/r4b-evidence/root-only-closure-ntfs.exe`, **24,576 bytes**, SHA-256
`23099e7d2eabf099ae6e2ca485bde1412b8c171dca3a94867f6f1c05d6b77c5c`, `AMD64`, `CONSOLE`, and
`UNSIGNED`. The compiler pin is
`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`, **2,569,576 bytes**, SHA-256
`eca02e6b15cde93009a59a3d129d5a77fb5008f2e1cf62cf573b6737c747ecc3`, file version
`14.8.10001.0 built by: bd501acdc000004`, with valid Microsoft Windows Authenticode signature and
thumbprint `a28356221f80483a8509067973b88770557c9300`. The response file is **1,329 bytes**, SHA-256
`e2021640c1f8ad500549fc89cd53bc4c2f0fa13fee9034714142d93c5d554042`; the compiler configuration
is **182 bytes**, SHA-256 `2d4610ade011e530d817dd3ba4fc787e5dc0c2297cc520c30a643b8fb13f9093`.
Pinned references are `mscorlib.dll` (**5,495,096 bytes**, SHA-256
`94715f6991e2b9dc7481532c05aa99e74a5fff4ee147be541bca27f99e003fc7`), `System.dll`
(**3,561,272 bytes**, SHA-256
`09787b4f38f4f020c6b8a3894146085d4df7b8ae337577ed42d9acf1419660e8`), and `System.Core.dll`
(**1,540,408 bytes**, SHA-256
`d1bafee1a4dd7e7bd9adf6859e7b1b654d1b4e0d031a38795e33ba040508c09d`).

All receipt claim flags remain false: `attempt004Authorized`,
`currentBinaryProvenanceEstablished`, `productionRuntimeAuthorized`, `replacementAuthorized`, and
`toolInstallAuthorized`. The replacement candidate digest remains `null`. Attempt004, replacement,
tool installation/acquisition, and broker-only authority/result execution remain blocked.

The three current aggregate bindings use repository-relative paths sorted by path and UTF-8 rows
encoded exactly as `path\0decimal-bytes\0lowercase-sha256\n`:

- **NTFS source + receipt:** 2 rows, **254-byte** preimage, SHA-256
  `24c1bf316d34a9c008bfa6e357882096b112df7a6978df5ad94afc5e7e57871f`;
- **provenance implementation + receipt:** 5 rows, **647-byte** preimage, SHA-256
  `b4e91590ac24cf57cc4aa66e997bd917b5dcd5d181da5a863185dce9ae63b007`;
- **full 33-path candidate immediately before this records append:** **4,120-byte** preimage, SHA-256
  `aac93619fefdab70158e86bada6315fa68ec92ac22a21a557832c460895cec5f`.

The `b4e91590…` aggregate is **provenance implementation + receipt** and must never be labeled
“source + receipt.” Its five rows are
`scripts/r4b-evidence/r4b-test-lanes.mjs`,
`scripts/r4b-evidence/root-only-closure-ntfs.test.mjs`,
`scripts/r4b-evidence/root-only-closure-ntfs-build-provenance.mjs`,
`scripts/r4b-evidence/root-only-closure-ntfs-build-provenance.test.mjs`, and
`scripts/r4b-evidence/root-only-closure-ntfs-build-provenance.json`. Only `24c1bf31…` is the
two-row NTFS source + receipt aggregate.

Current specialist records are: Catalina **66/66 PASS**; Renata **118/118 PASS**; Natalia
**79/82**, with **3 PR-integration failures**; Gabriela **50/57 FAIL/HOLD**; and Julieta
**114/119 FAIL/HOLD**, with **36 raw-output measures unattempted**. These results do not authorize
Attempt004, a replacement executable, tool acquisition, broker execution, release, or merge.

The exact pending choices are:

- **A — `Authorize pinned deterministic toolchain (Recommended)`:** approve credential-free
  acquisition/evaluation of a precisely pinned, signature/hash/license-verified deterministic
  Roslyn toolchain; after new architecture/security/reproducibility gates, attempt a deterministic
  rebuild. **Consequence:** authorizes a bounded external tool download/install; Attempt004 remains
  blocked until proof passes.
- **B — `Accept non-reproducible exception`:** explicitly accept an unsigned, non-reproducible
  verifier artifact under a durable exception and compensating controls. **Consequence:** avoids a
  new tool install and can unblock sooner, but materially weakens provenance/audit confidence; no
  claim beyond the exception.
- **C — `Defer native verifier`:** retain strict policy and perform no tool acquisition or exception.
  **Consequence:** safest/no new external action, but native verifier and broker-only Attempt004
  remain blocked.

No A/B/C selection exists. Silence is not C. The release/user decision remains pending.

PR #87 is open, draft, and mergeable but stale/behind at exact head
`6b3a970499bcc73b6749cd74c44345768f2bf04a`. GitHub currently reports **11** checks while its body
reports **9**; the body reports **21** dirty paths while the current candidate contains **33**. The
live checks are **7 success / 4 failure**. The PR body lacks the retained receipt, current candidate
binding, and an Elana exact-head binding. PR #87 must not be marked ready or merged. Attempt004
remains **HOLD**; replacement, install/acquisition, and broker-only authority/result execution remain
blocked pending an explicit A/B/C selection and every resulting fresh gate.

## R4-B Option-A pinned Roslyn toolchain approval and pre-acquisition hold — 2026-11-10

This append-only entry supersedes only the preceding claim that no A/B/C selection exists. Marlon
explicitly selected **A — Authorize pinned deterministic toolchain** and delegated to Adriana the
approval of equivalent bounded steps. The approved direction is a credential-free, zero-spend,
precisely pinned deterministic Roslyn acquisition and evaluation path. It does not accept the
existing non-reproducibility, authorize a replacement executable, or authorize the broker or
Attempt004.

The standing bounded process is now: Adriana may approve acquisition or evaluation of a precisely
pinned deterministic toolchain only after primary-source version and license provenance, an exact
HTTPS origin, pre-known package or file hashes, publisher/signature verification where applicable,
an isolated standard-user and non-global transaction, no `PATH` or global mutation, no scripts
unless separately reviewed, no credentials, bounded network and byte limits, explicit cleanup or
retention rules, an SBOM or package inventory, Catalina architecture acceptance, Natalia security
acceptance, Renata reproducibility acceptance, Julieta numerical/license/claim acceptance,
Gabriela provenance, a Bianca append-only decision record, and Elana exact-head gates before
commit or push. This delegation does **not** cover spending, credentials, production, signing,
stores, arbitrary packages, weakened pins, acceptance of non-reproducibility, the broker,
Attempt004, or unrelated external actions.

The approved Roslyn candidate is the official NuGet package
`Microsoft.Net.Compilers.Toolset.Framework` version **5.9.0**, published
`2026-08-17T16:56:24.777Z`, from exactly
`https://api.nuget.org/v3-flatcontainer/microsoft.net.compilers.toolset.framework/5.9.0/microsoft.net.compilers.toolset.framework.5.9.0.nupkg`.
Official metadata records exactly **12,965,530 bytes** and SHA-512 base64
`ud6t47OkT32uuAivIvQdntunI3BAS/TXwq8+qPk3GwEvPRgPEqIGDeBSChYtV9hPlwT8LZ+6dz4LgMe5+AmWxw==`,
which decodes to SHA-512 hex
`b9deade3b3a44f7daeb808af22f41d9edba72370404bf4d7c2af3ea8f9371b012f3d180f12a2060de0520a162d57d84f9704fc2d9fba773e0b80c7b9f80996c7`.
The source commit is `35d9211b841e7613c1d2f8f5af6d628ace696c4c`; the license is MIT;
license acceptance is required; the package targets `net472`, records no dependencies, and is
officially described as unsupported for direct application reference. Those are metadata facts,
not proof that artifact bytes have been acquired or verified.

The narrowly bounded package-signature verifier is the standalone portable official `nuget.exe`
version **7.9.0**, displayed executable version **7.9.0.83**, from exactly
`https://dist.nuget.org/win-x86-commandline/v7.9.0/nuget.exe`. Microsoft `tools.json` identifies
7.9.0 as `ReleasedAndBlessed` and uploaded `2026-08-11T17:00:00Z`. The Microsoft WinGet manifest
pins SHA-256
`992d70cac5b06c38efec91806caba64cdcc07e6d963a0959dbbbaf264d33b800`, classifies the file as
portable x86, and uses that exact URL. The NuGet.Client license is Apache-2.0. `nuget.exe` 5.0+
requires .NET Framework 4.7.2 or later; the reviewed host has .NET Framework 4.8. This portable
verifier is a direct Option-A supply-chain dependency, not an arbitrary tool or SDK.

Official metadata does **not** publish the exact `nuget.exe` 7.9.0 byte count or a package-specific
Authenticode signer subject or thumbprint. Those facts remain **UNATTEMPTED** and must not be
claimed. `R4B-ROSLYN-VERIFIER-BOOTSTRAP-v1.1` therefore uses two separate commit-bound authorities.
`VERIFIER_DOWNLOAD_AUTHORITY_V1` may authorize one inert GET of the exact URL with an exact
**16,777,216-byte** ceiling and no redirect, retry, resume, proxy, credentials, custom trust, shell,
execution, installer, `PATH` change, or global mutation. The retained bytes must match the exact
pre-known SHA-256 before any later use. Its sanitized receipt must record the observed exact byte
count, executable version 7.9.0/7.9.0.83, Authenticode `Valid` with a trusted code-signing EKU and
timestamp chain, signer subject/thumbprint, license and one-file SBOM/inventory, script absence,
containment, and cleanup or content-addressed retention. Failure is terminal and non-executable.
Only a later separately reviewed and commit-bound `VERIFIER_EXECUTION_AUTHORITY_V1` may permit the
closed local `nuget verify -Signatures` operation against the separately hash-bound Roslyn package.
That operation cannot authorize extraction, compiler execution, replacement, the broker, or
Attempt004.

Catalina froze the six-path repository boundary and
`R4B-ROSLYN-VERIFIER-BOOTSTRAP-v1.1`. Natalia reports **PASS TO IMPLEMENT / HOLD TO ACQUIRE OR
EXECUTE**, with **36 controls = 29 passed / 0 contradicted / 7 required-unattempted**. Renata's host
inventory reports **52 controls = 45 passed / 2 failed / 5 required-unattempted**: the isolation,
TLS, hashing, inert ZIP inspection, resource caps, and cleanup substrate are viable, but the host
currently has no trusted NuGet signature verifier (`nuget.exe`, .NET SDK, Visual Studio, or NuGet
verification assemblies), so package-specific signature validation cannot yet run. Julieta reports
**35 claims/controls = 20 passed / 0 contradicted / 15 required-unattempted or missing**. Gabriela
verified the official package and verifier metadata and found no official exact verifier byte count
or Authenticode identity; those remain acquisition-time evidence only.

Current disposition: **PASS TO IMPLEMENT THE REPOSITORY AUTHORITY CANDIDATE / HOLD TO DOWNLOAD,
INSTALL, EXTRACT, EXECUTE, OR EVALUATE**. No Roslyn package or verifier request, download,
installation, extraction, execution, repository mutation for the authority candidate, broker action,
or Attempt004 action has occurred. PR #87 remains stale, draft, behind, and not merge-ready. The
retained `NON_REPRODUCIBLE_HOLD` receipt and every earlier privacy/provenance record remain
unchanged. **Marlon action required now: none.**

The six-path repository authority candidate is now implemented and remains uncommitted; no
download, installation, extraction, execution, staging, commit, or push has occurred.

### Option-A authority evidence-key repair — 2026-11-10

The uncommitted candidate now includes the exact required authority keys `hostIsolationEvidence`
and `retentionDecision`. The repaired authority JSON is **2,172 bytes**, SHA-256
`4af9da2ceaa5713405ec20ff3c3f190ab14200fb190e2ddb50e503655cc43249`; the validator is **7,206
bytes**, SHA-256 `085a23ac968a1e7fdc4dcf8492e44148d16b2c5259e903c5e51d90c3d5e4c2ca`; and its test is
**5,710 bytes**, SHA-256 `a559ae2f112ec5b464e8c23f5218ed4b59f28d532ebfaf358337111ec99fdd86`.
The plan and lane inventory are unchanged. Valentina's development evidence is focused **6/6 PASS**,
portable **134/134 PASS**, exact-file lint PASS, and exact-file Prettier PASS. These bytes address
Catalina's prior **50/52 FAIL** findings, but they do not substitute for Catalina's fresh exact-byte
review or Elana's final gate. No download, installation, extraction, execution, staging, commit, or
push has occurred; acquisition and execution remain **HOLD**.

### Option-A verifier bootstrap v1.2 superseding evidence — 2026-11-10

Natalia's prior exact-byte review was **94/96 FAIL**. The uncommitted v1.2 candidate addresses those
two findings through an exact same-handle, same-byte verifier identity binding and the closed
revocation mode `OFFLINE_CACHE_ONLY_NO_NETWORK`; no online revocation request or other network path
is authorized. Catalina's v1.2 contract also requires the v2 schema and authority, the closed
36-key receipt inventory, recursively frozen evidence, and strict separation between synthetic test
evidence and an actual receipt. The plan is **4,950 bytes**, SHA-256
`9fe6bc2fa04acf3afb6296ded4ae6652e87379f28873ea6e9f3b5a8731b265fc`; the authority v2 record is
**2,670 bytes**, SHA-256 `bd1a523399a76fdcfd88a2afe0e752e24c4f518500d65a6e6b51ddb0834b59cd`;
the module is **9,528 bytes**, SHA-256
`402a65fef9e67a5672ba2721d5c3073f06f62856867771796282531417170527`; and the test is **11,247
bytes**, SHA-256 `65ba454c1d0240124cc518a2b218177294e16f0353fb6997328bd44dcd6e3842`.
The lane inventory is byte-identical to the preceding candidate. Valentina's development evidence
is focused **6/6 PASS**, portable **134/134 PASS**, exact-file lint PASS, and exact-file Prettier
PASS. These implementation results do not replace fresh Catalina, Natalia, Renata, Julieta,
Gabriela, or Elana review. External action remains false; no acquisition, download, installation,
extraction, execution, staging, commit, or push has occurred.

### Option-A verifier bootstrap v1.2 three-gap repair — 2026-11-10

The refrozen uncommitted candidate closes the remaining three architecture gaps. Its synthetic
receipt exact shape now requires `cookiesUsed: false` and `shellUsed: false`. Recursive immutability
adversaries prove that mutation attempts throw, leave values unchanged, and revalidate across the
verifier, download, isolation, and both array branches. Signer-chain and timestamp-chain
`NoCheck`/`ExcludeRoot` adversaries return the fixed revocation-policy error. Only the module and
test bytes changed: the module is **9,644 bytes**, SHA-256
`c44a6c4d1f0e7b4ea0c017d2ad6fd98b2afff3ed94561bd024bda9e23c18780d`, and the test is **12,340
bytes**, SHA-256 `399c0e6a541aac0573b5644d5f40932524ea3ba016b510b37452892ca92c2ef8`.
The plan, authority, and lane inventory remain unchanged. Valentina's development evidence is
focused **7/7 PASS**, portable **135/135 PASS**, exact-file lint PASS, and exact-file Prettier PASS.
Fresh independent exact-byte reviews remain required. No download, installation, extraction,
execution, staging, commit, or push has occurred.

### Option-A lane snapshot reconstruction supersession — 2026-11-10

Elana's exact reconstruction verdict was **FAIL** because the earlier lane count was erroneously
reported as **17 portable + 7 Windows = 24**. `R4B-ROSLYN-LANE-SNAPSHOT-v1` corrects the closed
inventory to exactly **11 portable + 5 Windows = 16**. Its lane digest is
`6ccc0208c8d7e104d6ebfe2e9b196eb3b5ddbc599ef365ae92c65e6ec712d9f2`; the digest of the eight
excluded paths is `8d875d47149a98760b795907131676b4c334652a679ebe97645c942eae32b3bc`.
Those eight exclusions are unrelated untracked `NON_EVIDENCE`, not lane prerequisites, and the Git
output cap is exactly **1,048,576 bytes**.

The repaired plan is **6,239 bytes**, SHA-256
`58b1ae7cc1a5656b143a6892affa97131aedce68b88b6c23742534aa7f1190d7`; the lane implementation is
**11,847 bytes**, SHA-256 `d724d0d5914d4386200bb6cd2809bbb4317b5499a122f7757f960cd096c88e7f`;
and the Roslyn test is **19,084 bytes**, SHA-256
`daca131050354d749c55a124ffad044cc0ebb06572592ede4be3dfe32cb779c4`. The authority JSON remains
**2,670 bytes**, SHA-256 `bd1a523399a76fdcfd88a2afe0e752e24c4f518500d65a6e6b51ddb0834b59cd`,
and the module remains **9,644 bytes**, SHA-256
`c44a6c4d1f0e7b4ea0c017d2ad6fd98b2afff3ed94561bd024bda9e23c18780d`.
Valentina's development evidence is focused Roslyn/lane **13/13 PASS**, self-contained portable
**106/106 PASS**, Prettier PASS, and lint PASS. Fresh independent exact-byte reviews, including
Elana's sole final gate, remain required. No prerequisite, download, acquisition, extraction,
execution, installation, staging, commit, or push has occurred.

### Option-A lane snapshot three-fix supersession — 2026-11-10

Catalina's exact-byte review of the preceding lane snapshot was **87/90 FAIL**. Natalia's security
review of those prior bytes was **151/151 PASS**; that result does not certify this changed lane.
The bounded repair closes Catalina's three findings: it uses the literal fixed errors
`R4B_LANE_GIT_OUTPUT_LIMIT` and `R4B_LANE_GIT_OUTPUT_MALFORMED`; the path decoder rejects every
control character from U+0000 through U+001F plus U+007F, with tab, U+0001, U+001F, and DEL
adversaries; and count, order, and duplicate inventory branches now return only the fixed
`R4B_LANE_INVENTORY_MISMATCH` error instead of dynamic values. The complete fixed lane-error
vocabulary is `R4B_LANE_GIT_FAILURE`, `R4B_LANE_GIT_OUTPUT_LIMIT`,
`R4B_LANE_GIT_OUTPUT_MALFORMED`, `R4B_LANE_INVENTORY_MISMATCH`, and
`R4B_LANE_PHASE_TEST_NONREGULAR`.

The updated lane is **11,596 bytes**, SHA-256
`2db2129bf70dee01349eec54e658c183697cd0b2ee2acc254fecbef4e6cbce84`; the updated Roslyn test is
**19,922 bytes**, SHA-256 `23de223a0ba49ba36c2fa3434150f1a1f74f69e73f46d0ec9b4236d8a2016c70`.
The plan remains **6,239 bytes**, SHA-256
`58b1ae7cc1a5656b143a6892affa97131aedce68b88b6c23742534aa7f1190d7`; the authority and module
remain unchanged. Valentina's development evidence is focused **13/13 PASS**, portable **106/106
PASS**, Prettier PASS, and ESLint PASS. Fresh exact-byte reviews remain required. No prerequisite,
network, download, acquisition, extraction, execution, installation, staging, commit, or push has
occurred.

### Option-A lane Unicode Cc supersession — 2026-11-10

Catalina's preceding exact-byte review was **90/90 PASS**. Natalia's review was **161/162 FAIL**
because U+0080 through U+009F control characters remained accepted. The bounded repair now rejects
the full Unicode `\p{Cc}` category while retaining every C0 and DEL rejection. Exact U+0080,
U+0085, and U+009F adversaries require the fixed `R4B_LANE_GIT_OUTPUT_MALFORMED` error.
The updated lane is **11,581 bytes**, SHA-256
`62218615e17d92d9fd5d427f33fd7d4d5cf5a7f4005e54a6c236364be74090d0`; the updated Roslyn test is
**19,952 bytes**, SHA-256 `bce20b52ca0aa3000f153da7548e6bdc28270fb9fb49e6f2742fec6e3dbb4aab`.
The plan, authority, and module remain unchanged. Valentina's development evidence is focused
**13/13 PASS**, portable **106/106 PASS**, Prettier PASS, and ESLint PASS. Fresh exact-byte reviews
remain required. No prerequisite, network, download, acquisition, extraction, execution,
installation, staging, commit, or push has occurred.

### Option-A real-staged lane snapshot v1.1 supersession — 2026-11-10

The commit gate was first held because cached diff-check found exactly two trailing spaces on plan
line 3. That formatting-only repair removed only those two bytes. Catalina then required a distinct
v1.1 staged-state architecture repair; its later plan, lane, and test changes must not be described
as whitespace-only. Earlier alternate-index and temporary-unstage evidence is superseded and is not
authoritative.

`R4B-ROSLYN-LANE-SNAPSHOT-v1.1` adds the third exact Git call
`git diff --cached --name-only -z --diff-filter=ACMR` between the `HEAD` and untracked queries,
records `stagedTestPaths`, and validates the four legitimate phase states: precommit, exact-six
staged, postcommit, and clean. Unexpected, excluded, or duplicate staged paths fail closed, as do
staged-command failure, output-limit, and malformed-output adversaries. Before this append, the
actual exact-six staged integration passed with the exact reviewed repository index; that
real-index evidence supersedes the earlier alternate-index reconstruction.

The updated plan is **6,335 bytes**, SHA-256
`cc7f6e418eabb4f854ac8e834cdb627dac044608f869830ed8735a5458eb0b44`; the updated lane is **12,699
bytes**, SHA-256 `709f204a53c3cee5ac01f2a83dca440bc6b98bd8a62705cfdc2c0e52a6c2a8ed`;
and the updated Roslyn test is **21,450 bytes**, SHA-256
`6e8a7b392fc7459c3c6326359937ef8a9b1c1cba4a39b062894a932afffce784`.
The authority remains **2,670 bytes**, SHA-256
`bd1a523399a76fdcfd88a2afe0e752e24c4f518500d65a6e6b51ddb0834b59cd`, and the module remains
**9,644 bytes**, SHA-256 `c44a6c4d1f0e7b4ea0c017d2ad6fd98b2afff3ed94561bd024bda9e23c18780d`.
The pre-append six-row staged manifest was **739 bytes**, SHA-256
`69774627f7ceea060a56973756f64340ea81deb8727d8edd9d824788f0490854`; this append changes the
handoff row and therefore requires a new manifest binding before any commit.

Real-index development evidence is focused **13/13 PASS**, portable **106/106 PASS**, Prettier
PASS, ESLint PASS, cached diff-check PASS, and worktree diff-check PASS. Fresh exact-byte reviews
and a new handoff-inclusive manifest remain required. No download, acquisition, extraction,
execution, installation, commit, or push has occurred.

### Option-A real-staged lane snapshot v1.2 supersession — 2026-11-10

Natalia's review of the preceding staged snapshot was **44/45 FAIL with one Blocker** because the
staged query omitted deletion status. `R4B-ROSLYN-LANE-SNAPSHOT-v1.2` replaces it with the exact
status-bearing, no-renames query
`git diff --cached --name-status -z --no-renames --diff-filter=ACMRD`. Its dedicated decoder permits
only `A` and `M`; a syntactically valid `D` returns the fixed `R4B_LANE_INVENTORY_MISMATCH` error.
Copy or rename scores and malformed, bare, unknown, four-digit, truncated, extra, duplicate, or
noncanonical records fail closed. The testing seam exposes exactly three members. The actual
real-staged integration passes the closed **11 portable + 5 Windows = 16** inventory.

The updated plan is **6,538 bytes**, SHA-256
`95000c31e448c4e9b64a63106a04dfbe74bb527db78e3336382360d0041adc52`; the updated lane is **14,729
bytes**, SHA-256 `4cd47182c0abb97f41ce3414e35268d9475b6320c92e8f547723aeb776f0c94d`;
and the updated Roslyn test is **23,728 bytes**, SHA-256
`787bac3803d3b43b64feed6ba1c423d94d1a107df01d53cd3e52bc3a68133ad2`.
The authority and module remain unchanged. Valentina's development evidence is focused **13/13
PASS**, authoritative portable **106/106 PASS**, Prettier PASS, and ESLint PASS. Fresh exact-byte
reviews remain required. No prerequisite, network, download, acquisition, extraction, execution,
installation, commit, or push has occurred.

### Option-A real-staged lane snapshot v1.3 supersession — 2026-11-10

Natalia's review of v1.2 was **51/52 FAIL with one Blocker** because the staged command's
`diff-filter` could hide a `T` type-change status. `R4B-ROSLYN-LANE-SNAPSHOT-v1.3` removes the
diff-filter and closes the complete status model. `A` and `M` are allowed. `D`, `T`, `U`, `X`, and
`B` must carry exactly one valid path and then return the fixed `R4B_LANE_INVENTORY_MISMATCH`
error. Scored `C` and `R` records and every malformed, bare, unknown, truncated, extra, duplicate,
or noncanonical status fail closed.

The retained v1.2 adversaries are supplemented by `T` cases for a phase path, the lane module, and
a non-test path; `U`, `X`, `B`, and unknown `Q` cases; and an executable isolated temporary-Git
fixture that changes a regular file to mode **120000**, observes the raw `T` status, proves its
rejection, and cleans itself in `finally`. The fixture never touches the production index.

The updated plan is **6,645 bytes**, SHA-256
`9fc89d301aaaabe8f52c6574ca9e518d09a6af4296130d03d3baf71122baef9f`; the updated lane is **14,752
bytes**, SHA-256 `205665c87b2d88b2f8a80e635570f5c7e45fe7043fc9ce8e7681e10480c9153c`;
and the updated Roslyn test is **25,922 bytes**, SHA-256
`0da37f316e501d840a999bd3805350b3a97f0570e0e5ce2a49001df978104755`.
The authority and module remain unchanged. Real-staged development evidence is focused **14/14
PASS**, authoritative portable **107/107 PASS**, Prettier PASS, and ESLint PASS. Fresh exact-byte
reviews remain required. No prerequisite, network, download, acquisition, extraction, execution,
installation, commit, or push has occurred.

### Closed Add-Type/PInvoke bootstrap selection and delegation — 2026-11-11

Marlon explicitly selected the recommended **1/A closed Add-Type/PInvoke lease bootstrap** and
delegated to Adriana approval of this bounded class of non-production evidence and test processes.
The authoritative decision record is
`docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md`. This delegation permits repository
implementation, synthetic zero-network tests, exact-byte reviews, and normal commit/push/draft-PR
gate transitions after the applicable specialist and Elana gates pass. It does not authorize
production, signing, stores, spend, credentials, external accounts, a real download, downloaded
verifier execution, broker execution, Attempt004, or unrelated external actions.

Remote `main` is exactly `d6607300e52219c5d534e70c17e00e2e717e505b`. Existing draft PRs #87,
#77, #61, and #58 remain preserved and untouched. Catalina's closed architecture preflight is
**128/128 PASS** and Natalia's security preflight is **64/64 PASS**, with runtime/download **0**.
The authority is `CLOSED_ADD_TYPE_PINVOKE_LEASE_BOOTSTRAP_V1`; it is not generic shell authority and
permits only the pinned, committed, byte-equal EncodedCommand/Add-Type lease design recorded in the
decision file.

The immutable phase disposition remains `PRECONDITION_HOLD_NO_GET` with
`externalActionAuthorized:false`, `downloadAuthorityPresent:false`, and
`executionAuthorityPresent:false`. No helper execution, GET, package retention, NuGet execution,
Roslyn execution, broker action, Attempt004, production action, staging, commit, or push has occurred
under this new phase. Bianca owns only the two records paths; Valentina may next implement only the
seven frozen code/test paths. Any literal or file drift resets Catalina and Natalia's passes. Elana
remains the sole final independent exact-head QA/code-review gate.

### Closed synthetic compiler exception — 2026-11-11

Roslyn and toolchain execution remain forbidden except for the single pinned, zero-network
`CONTRACT_SELF_TEST_V1` csc compile-and-39-fixture run authorized by
`syntheticBootstrapTestAuthorized`. That synthetic transaction may execute only on unchanged bytes
after Catalina architecture PASS, Natalia security PASS, and Renata reproducibility PASS; it cannot
consume activation authority or authorize a GET, download, retained package, live helper, NuGet
execution, broker, Attempt004, production, signing, store, spend, credential, or external-account
action. All other compiler, helper, download, and toolchain execution remains forbidden.

The exception does not change `externalActionAuthorized:false`,
`downloadAuthorityPresent:false`, `executionAuthorityPresent:false`, or
`PRECONDITION_HOLD_NO_GET`. It authorizes no compile or fixture execution on repository bytes until
the unchanged exact candidate has Catalina, Natalia, and Renata pre-execution PASS verdicts. Any byte
change resets those gates.

### 2026-11-11 — v1.4 pre-execution repair contract

- Natalia accepted the complete v1.4 architecture contract at 64/64 controls before implementation.
- The repair remains confined to the existing nine-path repository boundary. It closes pinned input/output identity continuity, opaque held-root containment, process-bound zero-network measurement, bounded cleanup and post-delete proof, exact trace/resource pins, revocation precedence, catalog-content rejection, unique issuer-and-serial certificate selection, and native-handle adoption cleanup.
- externalActionAuthorized, downloadAuthorityPresent, and executionAuthorityPresent remain false. PRECONDITION_HOLD_NO_GET remains active. No compile, PowerShell/helper execution, GET, download, NuGet execution, broker, or Attempt004 is authorized by this record.
- After implementation, unchanged bytes require Catalina architecture PASS, Natalia security PASS, and Renata reproducibility PASS before the separately approved zero-network CONTRACT_SELF_TEST_V1 transaction may run.

2026-11-12 — v1.5 architecture freeze:

R4B-AUTHENTICODE-OPERATIONAL-RESOLVER-v1.5 is approved for repository implementation and zero-network synthetic contract testing only after unchanged Catalina, Natalia, and Renata pre-execution PASSes. It removes WinVerifyTrust path authority and verifies embedded Authenticode through held-handle PE digest plus decoded-message signature, while catalog presence is rejection-only. externalActionAuthorized, downloadAuthorityPresent, and executionAuthorityPresent remain false. PRECONDITION_HOLD_NO_GET remains mandatory. This does not authorize a download, live verifier/helper execution, NuGet execution, broker, Attempt004, production, signing, store, spend, credential, or external-account action.

### 2026-11-12 — v1.6 bounded repair freeze

`R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.6` passed Natalia's pre-implementation security review at 64/64 controls. The unchanged nine-path implementation must bind armed work/global deadlines, forced process-tree stop, universal adapter quarantine, honest partial-token cleanup, full strong-signature and resource-ledger ownership, operational certificate-store and catalog semantics, and regenerated 39-fixture trace pins. The synthetic terminal is `SYNTHETIC_TEST_FAILED_CLEANUP_HOLD`; the separate future-activation `FAILED_CLEANUP_HOLD` literal remains unchanged. No compile, synthetic fixture run, PowerShell/helper execution, GET, download, NuGet execution, broker, Attempt004, production, signing, store, spend, credential, or external-account action is authorized by this freeze. The one previously approved zero-network synthetic compile-and-39-fixture transaction remains held until unchanged Catalina, Natalia, and Renata static PASSes. Any byte or literal drift resets those gates.

### 2026-11-12 — v1.7 ownership and deadline repair freeze

Catalina froze R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.7 within the existing nine paths after the v1.6 exact-byte gate found incomplete native ownership and synthetic operational coverage. Implementation must pass the exact 38-test static suite and fresh Catalina, Natalia, and Renata static reviews before the separately approved zero-network 39-fixture transaction may run. PRECONDITION_HOLD_NO_GET and all false authority flags remain unchanged; no compile, fixture run, helper, GET, download, NuGet, broker, Attempt004, production, signing, store, spend, credential, or external-account action is authorized.

### 2026-11-12 — v1.8 operational cleanup and dispatch-deadline repair freeze

Catalina froze R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.8 after the v1.7 exact-byte wave found three native-ownership/catalog defects and one dispatch-microtask deadline defect. The bounded repair requires exact closer execution for real synthetic allocations with fake-native discrimination confined to CloseRaw and truthful close/rollback rows; operational execution of NONE plus the four failing AdoptionInjection positions with exact allocator, close-count, ledger, and trace expectations; dependency-aware CATALOG_CLOSE_REVERSED adoption, rejection, and info-before-admin cleanup; and a finite positive phase/global deadline recheck inside each invokeAdapter and forceStop dispatch microtask immediately before the adapter call. The exact nine-path boundary is retained. Only the decision record, this handoff, policy, controller, Authenticode helper, and focused test may change; the PowerShell bootstrap, lease C# source, and verifier-bytes receipt remain byte-identical. The focused target is 42/42. The 39 public fixture IDs and public resolver/resource trace pins remain byte-identical; internal adoption/catalog self-checks do not become public fixtures. All authority flags remain false and PRECONDITION_HOLD_NO_GET remains active. No compile, C# or PowerShell execution, helper/fixture run, GET, download, acquisition, NuGet execution, broker, Attempt004, production, signing, store, spend, credential, external-account action, stage, commit, or push has occurred or is authorized. Pending gates are a frozen nine-row manifest and development checks, fresh Catalina and Natalia exact-byte reviews, Renata static review only after both pass, then applicable Julieta, Gabriela, Bianca, and sole final Elana review; any path, public trace, authority, or byte drift resets the sequence.

## 2026-11-12 — v1.10 concrete synthetic adapter/launcher handoff

- Decision: `R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.10` supersedes v1.9 for repository implementation only.
- Boundary: exactly ten paths; the sole new path is `scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs`; `roslyn-verifier-authenticode.cs` and `root-only-closure-verifier-bytes-receipt-v1.mjs` remain byte-identical.
- Required implementation evidence: 72/72 non-executing focused checks, followed by unchanged exact-byte Catalina and Natalia PASSes and Renata pre-execution PASS before any real synthetic transaction.
- Evidence claim: `ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1` is bounded owned-process endpoint observation, not packet capture or proof that no packet existed.
- Fail-closed boundary: any pre-READY timeout, unproven descendant, transient-artifact uncertainty, crash residue, pipe/RPC identity failure or cleanup failure remains HOLD; no automatic recovery or deletion is authorized.
- Authority: `externalActionAuthorized:false`, `downloadAuthorityPresent:false`, `executionAuthorityPresent:false`, `PRECONDITION_HOLD_NO_GET`; no GET, download, acquisition, real NuGet/verifier, broker, Attempt004, production, signing, store, spend, credentials, external accounts, stage, commit or push.

## 2026-11-12 — v1.10.2 committed audit-source lease

- Boundary: exact ten paths unchanged; no source copy or new assembly path.
- Lease: Node and PowerShell hold the same committed audit source; PowerShell uses FileShare.Read and denies new write/delete opens.
- Validation: strict UTF-8, no BOM, LF-only, 1..65,536 bytes, exact source-control SHA-256 and live identity bound before READY.
- Lifecycle: seventh pinned input; revalidated and closed with pinned inputs; never ledger-owned or deleted.
- Caps/gate: PS1 8,192 bytes, audit C# 65,536 bytes, 76/76 non-executing checks, then Catalina/Natalia/Renata; no execution/acquisition/stage/commit/push.

## 2026-11-12 — R4-B Add-Type bootstrap v1.11 architecture handoff

- Current disposition: `IMPLEMENTATION_AUTHORIZED_EXECUTION_HELD`.
- v1.10.2 exact-byte review: Catalina 34 controls, 16 passed and 18 failed; Natalia 64 controls, 56 passed and 8 failed. Static 76/76 did not establish a reachable broker transaction. Renata and Elana were not eligible on that candidate.
- Frozen replacement literals: controller `R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.11`; adapter `R4B-SYNTHETIC-ADAPTER-v1.11`; protocol `R4B-ADDTYPE-PIPE-RPC-v1.11`; manifest binding `HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1`.
- Exact boundary: the same ten decision, handoff, policy, controller, PS1, broker C#, adapter, immutable helper, immutable receipt, and regression-test paths. No eleventh path is authorized.
- Required implementation: held exact-ten observational manifest; pinned Node and PowerShell identity; held audit-source lease; current-logon-SID-only medium-integrity overlapped pipe; canonical `HELLO`/`CHALLENGE`/`AUTH`/`READY`; all nine RPC methods; independent cancellation; broker-derived pinned compiler and 39 fixtures in kill-on-close jobs; owner-scoped network observation; bounded metadata snapshots; append-only ownership ledger; exact 23-step cleanup; `CLOSE`/`CLOSED`; fixed sanitized receipt; and outer cleanup or fixed residue hold.
- Required adapter correction: method arities and nested identity/lease mapping must match the controller calls exactly; no caller-controlled path, command, argument, environment, or handle may cross the RPC boundary.
- Required native corrections: aligned `TOKEN_GROUPS`/`SID_AND_ATTRIBUTES`; real overlapped `ConnectNamedPipe`, `ReadFile`, and `WriteFile`; exact client/server PID, creation-time, image, volume, and file-identity checks; and broker validation of the Node audit-source file-index pin while retaining its authoritative held handle.
- Required QA: 96 nonexecuting tests total, with the 54 v1.11 tests exercising the executable adapter boundary through a strict injected broker oracle. Exact-byte Catalina and Natalia reviews restart after any edit; Renata follows both; Elana remains the final unchanged-head gate.
- Implementation does not authorize execution. Keep `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` until the later separately gated one-run decision.
- No PowerShell, Add-Type, csc, helper, network, acquisition, download, broker, synthetic transaction, Attempt004, stage, commit, or push occurred as part of this architecture freeze.

## 2026-11-12 — R4-B Add-Type bootstrap v1.12 implementation handoff

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.12 supersedes v1.11 and is approved for repository implementation and non-executing contract tests only. It establishes one UTF-8-bytewise canonical ten-path manifest, explicit non-self-referential reviewed-digest CLI binding, held-byte execution, OS-bound peer identities, strict canonical RPC, independent cancellation and measured force-stop, held segment-root trust, truthful READY/CodeDOM inventory, owner-scoped network evidence, live metadata snapshots, canonical identity-ledger rows, identity-revalidated nonrecursive cleanup, bounded outer settlement and sanitized receipt arithmetic. The pre-execution target is 120/120. The eight operational tests remain required and unattempted until separately authorized; no fake controller, transport, identity or result can satisfy them. externalActionAuthorized=false, downloadAuthorityPresent=false, executionAuthorityPresent=false and PRECONDITION_HOLD_NO_GET remain mandatory. This amendment authorizes no PowerShell, Add-Type, C#, compiler, helper, network, transaction, GET, acquisition, NuGet, broker, Attempt004, production, signing, store, spend, credential, external-account, stage, commit or push action.

## 2026-11-12 — R4-B Add-Type bootstrap v1.12.1 identity handoff

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.12.1 supersedes only the v1.12 peer-identity handshake contract. Node retains and presents pinned Node and PowerShell image-file byte, SHA-256 and final-path digests plus documented process IDs, but does not claim OS process creation time or use an undocumented child handle. After HELLO, the broker authoritatively observes both pipe peer PIDs, retains both process and image handles, derives creation FILETIME and file identities from those handles, compares the observed image claims to Node's held files, and returns the complete observed identities in CHALLENGE. SERVER_V1, CLIENT_V1 and READY_V1 bind the same broker-observed identity digests in one exact proof domain. This removes the circular pre-broker creation-time requirement without adding a helper, native path, authority or execution. All remaining v1.12 boundaries, the 120/120 pre-execution target, eight held operational tests, false authority flags and PRECONDITION_HOLD_NO_GET remain unchanged.

## 2026-11-12 — R4-B Add-Type bootstrap v1.12.2 path-identity handoff

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.12.2 supersedes only the v1.12.1 held-image path claim. Node's retained Node and PowerShell image descriptors bind byte count, content SHA-256 and documented device/inode continuity only; they do not claim a handle-derived final path. The held policy pins one exact normalized host-image path digest for each host. The broker derives each final path from its retained image handle, normalizes it with the closed local-DOS algorithm, and requires the digest to equal held policy before CHALLENGE. Node validates the broker-observed final-path digests against the same held policy while retaining its descriptors through CLOSED and final revalidation. No caller path, undocumented process handle, helper, native path, authority or execution is added. All remaining v1.12.1 and v1.12 boundaries, test counts, false authority flags and PRECONDITION_HOLD_NO_GET remain unchanged.

## 2026-11-12 — R4-B Add-Type bootstrap v1.12.3 receipt-evidence handoff

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.12.3 supersedes only the v1.12.2 receipt-evidence plumbing. Terminal network observation count and maximum poll gap are measured by STOP_MEASUREMENT, owner arithmetic is measured by BIND_OWNER_SCOPE, and zero endpoint events are measured separately by VERIFY_ZERO_EVENTS; event count is never relabeled as observation count. SCAN_LEDGER_INVENTORY records ownershipLedgerPreCleanupSha256 over the complete canonical current ledger rows before filesystem deletion transitions, while CLOSE_OWNERSHIP_LEDGER records ownershipLedgerSha256 over the final append-only transition journal after all legal transitions and close. The sanitized receipt carries both distinctly named ledger digests and copies every network and ledger field only from its validated cleanup operation. No RPC, path, authority or execution is added. All remaining v1.12.2, v1.12.1 and v1.12 boundaries, test counts, false authority flags and PRECONDITION_HOLD_NO_GET remain unchanged.

## 2026-11-12 — R4-B Add-Type bootstrap v1.12.4 network-event handoff

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.12.4 supersedes only the v1.12.3 receipt key list and source map. The sanitized receipt adds networkEventCount immediately after networkMaximumGapMicros. networkEventCount is copied only from validated VERIFY_ZERO_EVENTS operation-nine evidence, is exactly zero for a clean result, and is null when that cleanup evidence is unavailable or incomplete; it is never derived from poll observations, table iterations, owner counts or a default. All v1.12.3 poll, gap, owner and dual-ledger schemas, all earlier boundaries, test counts, false authority flags and PRECONDITION_HOLD_NO_GET remain unchanged.

## 2026-11-12 — R4-B Add-Type bootstrap v1.13 implementation handoff

`R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13` replaces fixed or inferred readiness, IPv6, process, quoting, lease, cleanup, and receipt claims with checked and measured evidence. The contract requires manifest-policy-PowerShell audit-pin parity, exact TCP6 60-byte rows with owning PID at offset 56, bounded returned-buffer arithmetic, measured process/job census, canonical CRT quoting, stateful observer and baseline-token closure, and receipt values copied only from validated operation evidence. This is repository implementation and non-executing test authority only.

## 2026-11-12 — R4-B Add-Type bootstrap v1.13.1 readiness handoff

`R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.1` adds the exact closed 12-row environment, a held Node-created temporary-root lease and pre-`READY` inventory, actual reader/worker/observer startup, the truthful exact 21-key `READY` record, one receive pump with separate handshake and operation routing, measured process/job totals, `OPEN` to `STOPPED` to `CLOSED` observer settlement, and real baseline-token closure. No authority boundary changes.

## 2026-11-12 — R4-B Add-Type bootstrap v1.13.2 terminal-state handoff

`R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.2` adds closed control-state routing, `RESPONSE_ACK`, broker terminal tombstones, all six cancellation permutations, and bilateral proof of empty pending, drain, and tombstone state before close. Non-executing evidence is **148/148 PASS**, with **0 failed, 0 skipped, and 0 todo**. Operational scenarios `E01` through `E08` remain **8/8 required-unattempted**.

The authoritative pre-record evidence table is in `docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md`. Before the record append, the canonical ten-row stream was **1,753 bytes** with SHA-256 `44d1c3a7cd79306250594ea204a9d99bf1d5d40a30412bf31717d4fa963a792a`; the decision record was **24,418 bytes** with SHA-256 `4130fe6857f4e9273ea15f090703a94246bfe9effcb173a231c8d01a99df3bb7`, and this handoff was **237,601 bytes** with SHA-256 `03e72b427a67f9934e8b0e05b7861f8a666a657cce9a7c37be63147bd9c34b93`. These are explicitly pre-record transition values, not the final reviewed manifest.

The final canonical manifest is recomputed only after both appends and the final two-pass source-pin refresh. Its digest remains external review evidence and is not embedded into any covered manifest member. `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` remain mandatory. No PowerShell, Add-Type, C#, compiler, helper, network, synthetic transaction, GET, acquisition, NuGet, broker, Attempt004, production, signing, store, spend, credential, external-account, stage, commit, or push action occurred.

## 2026-11-12 — R4-B Add-Type bootstrap v1.13.3 correction handoff

Independent exact-byte review reproduced the v1.13.2 **148/148 PASS** result but found non-operative routing and drain coverage, an inconsistent environment contract, and hard-coded `READY` census evidence. V1.13.2 did not clear architecture or security review.

V1.13.3 supersedes only environment identity, pre-`READY` measurement, RPC routing, and terminal settlement. The bounded implementation reached **164/164 nonlive PASS**; `E01` through `E08` remain **8 required-unattempted**. The exact five-file freeze is:

- Policy: 56059 bytes; SHA-256 `5bc741c5c3afceef195da3e00ae24340c6b2adacb74d630fe83c26a8bdfe50b5`; blob `8ff385058a1f8c3c3f3df2ad18eda040443c2d84`.
- Controller: 116155 bytes; SHA-256 `a8e8810a7861a91e50d385f2dc2deef3b13261f0a81545ae059dcf5c5f4c778f`; blob `03a99baf87d2f2cd7a0b1092380ae34e2c34bdcf`.
- Adapter: 61555 bytes; SHA-256 `d15d5468e94d8cc22a046d8440d1d9fbd2d0b3d2046ede3d142d436ec2aa7387`; blob `8e11cdea462e8268bfd4326b1380cb27685ab5f4`.
- Broker C#: 117351 bytes; SHA-256 `69e82e6a1947b41cca6deb69d017ffe1f2e6b7bc6c3ecd76ca6b62603eb0c8ee`; blob `8c424ea6c17204f70b24c6ada32824a82931134d`.
- Focused test: 165324 bytes; SHA-256 `3a40356797c3db5cdba42c6b1232fd6edba4d9b6c6792345e4445ef067811cf4`; blob `07ea579e89f043c64e6ea4d4e76ad9dddb6c2e99`.

The PowerShell bootstrap, verifier-bytes receipt, and Authenticode helper remain byte-immutable. The final ten-path manifest remains external review evidence and is not embedded. `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` remain unchanged. No live execution, acquisition, stage, commit, or push is authorized or recorded.

## 2026-11-12 — R4-B Add-Type bootstrap v1.13.4 correction handoff

Independent review reproduced **164/164 PASS** for v1.13.3 but found non-cooperative cancellation result leakage, source-only C# lifecycle assertions, unbounded EOF settlement, unchecked pre-newline input growth, and pathname inventory recursion risk. The prior v1.13.3 five-file freeze was a pre-record, pre-pin snapshot only; policy and controller changed during final pin refresh, and it was never the final manifest.

V1.13.4 supersedes only those bounded defects. The repository implementation reached **172/172 nonlive PASS**; `E01` through `E08` remain **8 required-unattempted**. The exact five-file freeze is:

- Policy: 56059 bytes; SHA-256 `088edf24616dc82a6819b245988061dc2a37590de3597a4e4220f10a2b0694fd`; blob `5f5bb766644e338447d53838f1e15a98f80b2306`.
- Controller: 116155 bytes; SHA-256 `68f6c9331bc3b5b79d9ca122121715d9b0aa3763d38b8329fe806b84d5888203`; blob `ba1328cff2b4c989e158dd1c8ce58e38afa10683`.
- Adapter: 64299 bytes; SHA-256 `49114fe254ae4b5795a017ffbf79a01c0c069f91826cfe1bd2a01e85efc0a4d0`; blob `55aa90c61de56372fef4de7224060a450a1c1fd9`.
- Broker C#: 117470 bytes; SHA-256 `03391653b8bc56985c0c6ba90eed3904a31ea590ee4a15e12692973d80201409`; blob `f2ffed78c007b33739a6c3e1fdbff81a2c17ca0e`.
- Focused test: 179487 bytes; SHA-256 `ada07fb192fb40875b47c2fb4a869ca621c43da37767c8a005eb638d0bd982d5`; blob `d09c5779e9c02a30176833e8c6edf6373e91010c`.

The PowerShell bootstrap, verifier-bytes receipt, and Authenticode helper remain byte-immutable. The final ten-path manifest remains external review evidence and no self hash is embedded. `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` remain unchanged. No live execution, acquisition, stage, commit, or push is authorized or recorded.

## 2026-11-12 — R4-B Add-Type bootstrap v1.13.5 correction handoff

Independent review reproduced **172/172 PASS** for v1.13.4 but found incomplete session-failure quarantine, a masked `CLOSE`-send failure, broker and inventory source-bound oracles that duplicated JavaScript semantics, and rejection of the terminal-cancel late `CANCEL`. The prior v1.13.4 five-file freeze was a pre-record, pre-pin snapshot only; policy and controller changed during final pin refresh, and it was never the final manifest.

V1.13.5 supersedes only failure quarantine, close settlement, declarative semantic ownership, terminal `CANCEL` acknowledgement, and records terminology. The repository implementation reached **178/178 nonlive PASS**; `E01` through `E08` remain **8 required-unattempted**. The exact five-file freeze is:

- Policy: 56059 bytes; SHA-256 `7b83decfa81f42b4b1c1ee861c7e1f7288a38a27894b26decfa887bbf6b574f4`; blob `85e1d0980a455bb41def98287bb0ff228f8c3fa0`.
- Controller: 116155 bytes; SHA-256 `014294851ce6d8ebf84037331a1b7a63beff074da5b71abc3e296a05064d1ada`; blob `98578fd610a706972bee07cfcb56d78a168ba6bb`.
- Adapter: 65904 bytes; SHA-256 `ae828734eef96225f535245f02a08d6583a3a6e59ce1b150c98e452c54cc7195`; blob `a4232aa8a8e05a44aa8aa5d134be0c1b5c47335d`.
- Broker C#: 120913 bytes; SHA-256 `a2c21f4575dce662ac18d99f24260aa88cf1650b3112b96dec3fcb1222a03c38`; blob `10ce3f43fc31592d37562d26d44a12e9275ffca3`.
- Focused test: 189213 bytes; SHA-256 `c1dbe4033d0cc219e603d1b89b4f4a0a7d2d69edb8d649e53010d143ece38305`; blob `f13c0d9b08a466b87b27a9142351d49ddc25aa54`.

The PowerShell bootstrap, verifier-bytes receipt, and Authenticode helper remain byte-immutable. The final ten-path manifest remains external review evidence and no self hash is embedded. `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` remain unchanged. No live execution, acquisition, stage, commit, or push is authorized or recorded.

## 2026-11-12 — R4-B Add-Type bootstrap v1.13.6 correction handoff

Independent review reproduced **178/178 PASS** for v1.13.5 but found that a permanently pending `CLOSE` write stayed outside the effective deadline because close awaited the write before settlement. The prior v1.13.5 five-file values were a pre-record, pre-pin implementation snapshot only and never the final reviewed manifest.

V1.13.6 supersedes only close-write deadline participation, late-write quarantine, and records terminology. The repository implementation reached **180/180 nonlive PASS**; `E01` through `E08` remain **8 required-unattempted**. The exact five-file snapshot is:

- Policy: 56059 bytes; SHA-256 `f54e04ed96a7b281163e987497ea7d4ed816ac922ec004c44d69f540e8897251`; blob `6d4c80777958bb57eb8c290886d2b3edacbfe7ff`.
- Controller: 116155 bytes; SHA-256 `f640d3091116c7a8cfe015698076e6c5278e40a803f5433c2635d7b77c25ba16`; blob `4e956a51b074e54152b33d59cb203da3d89c7af8`.
- Adapter: 67453 bytes; SHA-256 `96b2a2142fa21d0aab1cc16c124f4ed825a1a23c46450afc751dff9270ee95b7`; blob `000f0e24e45295c4ca63006500da79173812ed8c`.
- Broker C#: 120913 bytes; SHA-256 `165d4d0abd02ac300f997775b3c95dddcd7c1f1085b12406c8b9330763d89885`; blob `86b630b7b095beb5e6e33fa738adf98531592aa5`.
- Focused test: 191213 bytes; SHA-256 `bd58bd81f4df57ca909a3e82ebad0e3ce9396acfe1f3f496f965e0302ff524fd`; blob `39fb0e2a5b24648a5d0d95bf00bfed4afb54537a`.

The PowerShell bootstrap, verifier-bytes receipt, and Authenticode helper remain byte-immutable. The final ten-path manifest remains external review evidence and no self hash is embedded. `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` remain unchanged. No live execution, acquisition, stage, commit, or push is authorized or recorded.

## 2026-11-12 — v1.13.6 records clarification

The v1.13.6 five-file values above are an exact **pre-record, pre-pin implementation snapshot only**. They were captured before this append-only records update and the final mechanical source-pin refresh, and they were never the final reviewed manifest. Final canonical identity remains external review evidence and is not embedded in any covered member.

No implementation, protocol, schema, test-count, authority, or execution boundary changes. V1.13.6 remains **180/180 nonlive PASS** with `E01` through `E08` **8 required-unattempted** and all false-authority / `PRECONDITION_HOLD_NO_GET` controls unchanged.

## 2026-11-12 — PR #89 portable normalized-image digest repair handoff

At exact head `ad259f5`, protected Linux portable Tests failed `I03` because the validated DOS path used host `path.resolve`; Windows-native passed. The repair uses `node:path.win32.resolve` only inside `normalizedImagePathSha256`, preserving host `resolve` elsewhere and leaving all guards, C# semantics, protocol/version boundaries, authority controls, and reviewed digest contracts unchanged.

The two-file pre-record, pre-pin snapshot is:

- Adapter: 67466 bytes; SHA-256 `a86fafac5f55f9d93308484bc54fb2a815bd264e7f558a6e0f9b79ba98cb950f`; blob `7ed73973cc5fad445cda7d7dc872609dc8796c97`.
- Focused test: 191918 bytes; SHA-256 `1f86ec949db4942b2206eb11fe453a082d40aad3ccd070793c216c1192ee6959`; blob `9729f79b86860ec77382dd187a446a0d6184d732`.

These values are not the final reviewed manifest; final canonical identity remains external review evidence and is not embedded. Fresh protected Linux portable, Windows-native, and full pinned gates remain required. `E01` through `E08` remain **8 required-unattempted**; all false-authority and `PRECONDITION_HOLD_NO_GET` controls remain unchanged. No live execution, acquisition, stage, commit, or push is authorized or recorded.

## 2026-11-14 — Recommended Option A iOS 17.5 prerequisite CI repair

Marlon explicitly selected Recommended Option A for a separate prerequisite CI repair. This scoped approval covers only the minimum-iOS protected job on exact `macos-15` ARM64 with `/Applications/Xcode_16.2.app` build `16C5032a`, and exactly one no-retry Apple/Xcode-managed acquisition per distinct authorized `GITHUB_RUN_ATTEMPT=1` minimum job:

```text
xcodebuild -downloadPlatform iOS -buildVersion 17.5 -architectureVariant arm64
```

The source-bound Apple catalog tuple is 261 UTF-8 bytes with SHA-256 `27c0b7cd887423ccf4ac33c0378accc9b4e659adab748e6b0e66f009b8da0510`. It binds `com.apple.dmg.iPhoneSimulatorSDK17_5`, version `17.5`, simulator build `21F79`, and catalog file size `7,336,630,623` bytes. That hash is the metadata-tuple hash, not a downloaded-payload hash or signature. The CoreSimulator identifier remains post-install observed and must be validated before use.

The v1.1.6 implementation is repository-only until independent gates pass. It uses one foreground controller to hold the unique CoreSimulator storage anchor through acquisition, exact minimum evidence, cleanup, and sanitized receipt finalization. The controller continuously enforces the held-filesystem disk floor/delta and two owned-root ceilings, launches only the exact pinned acquisition and minimum-evidence children, and keeps raw output, paths, PIDs, device identifiers, environment values, and credentials out of the receipt. The minimum script consumes exact runtime `17.5` / `21F79` and the controller-validated Node executable; the current-iOS leg remains unchanged.

Implementation development evidence is nonlive only. The frozen inventory is **128 injected Node cases plus 8 shared structure cases**. Live Xcode acquisition, simulator installation, protected minimum/current evidence, cleanup, and receipt upload remain required downstream protected-run proofs and are not development-test passes.

This approval does not authorize credentials, `sudo`, `curl` or a custom URL, a package manager, proxy use, cache/retry/fallback, direct payload execution, iOS 18 substitution, production, signing, store actions, spending, or unrelated runtime actions. PR #93 remains draft/HOLD until this prerequisite PR passes all specialist, Elana exact-head, protected CI, merge, and post-main gates, after which PR #93 must be refreshed and fully re-gated.

## 2026-11-14 — iOS 17.5 prerequisite child-gate v1.1.10.2 handoff

The prerequisite controller now places ACQUIRE, MINIMUM, and CLEANUP behind one source-bound child gate. Each wrapper validates the exact runner/source/parent tuple, the inherited held controller descriptor, the closed role environment, and the detached checkout before emitting `READY_V1`; the parent then captures the immutable wrapper process identity before releasing exactly 32 bytes. Unverified children receive no signal. An unverified wrapper that remains open after the bounded close wait enters `PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD`, emits only `IOS_RUNTIME_BOOTSTRAP_UNVERIFIED_CHILD_HOLD`, writes no receipt, claims no cleanup success, and awaits the protected workflow timeout.

The security claim is limited to **gated accidental-invocation and source-mutation containment**. It is **not OS authorization against malicious same-user code**; same-user code could already invoke `xcodebuild`. Transaction cancellation is phase-bound and idempotent. Receipt finalization is synchronous, canonical, capped at 8,192 bytes, and uses closed primary/cleanup failure-state combinations. The controller source is opened once with `O_NOFOLLOW`, held through all wrappers and receipt finalization, and revalidated with positional reads without relying on shared file offsets.

Development evidence remains nonlive: **182/182 controller cases**, **28/28 shared structure cases**, and **105/105 phase-guard cases** are required, for **287 relevant cases**. The phase-specific required ledger is **198 = 182 controller + 16 newly applicable structure cases**. Live acquisition, Xcode execution, simulator installation, protected minimum/current evidence, cleanup, receipt upload, stage, commit, and push are not implementation-test passes and remain gated. All credentials, `sudo`, custom downloads, package managers, retries, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-14 — iOS 17.5 prerequisite child-gate v1.1.10.3 hardening

V1.1.10.3 closes the remaining child-gate release, descriptor-identity, and controller-ownership defects without changing the authorized acquisition, minimum-evidence, or cleanup targets. Each wrapper now receives one unique 32-byte `node:crypto.randomBytes` release value only through the held release pipe. Only its SHA-256 enters the closed internal environment; the raw value never enters argv, logs, errors, or the receipt, and both parent and wrapper zero their buffers after release or abort.

Before `READY_V1`, the wrapper requires fd3 and fd5 to be FIFOs and fd4 to be the same regular, nonsymlink controller source object identified by canonical path, device, inode, size, positional bytes, and pre/post descriptor checks. A same-content different inode, nonpipe descriptor, nonregular source, or source swap fails before any target or network action.

Every non-HOLD return or throw now releases the held controller source exactly once and removes both transaction signal handlers exactly once through a true outer `finally`, including receipt validation, write, removal, rename, and terminal-error paths. Only `PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD` retains the workflow-owned process and descriptor state until the protected workflow kill; it still writes no receipt and makes no cleanup-success claim.

Development evidence remains nonlive: **193/193 controller cases**, **31/31 shared structure cases**, and **105/105 phase-guard cases** are required, for **309 relevant cases**. The phase-specific required ledger is **212 = 193 controller + 19 newly applicable structure cases**. Live acquisition, Xcode execution, simulator installation, protected minimum/current evidence, cleanup, receipt upload, stage, commit, and push remain gated and are not development-test passes. All credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-14 — iOS 17.5 prerequisite lifecycle v1.1.11.3 hardening

V1.1.11.3 closes the remaining release-boundary, termination, residue, phase-cancellation, and receipt-truthfulness defects without changing the authorized acquisition, minimum-evidence, or cleanup targets. A wrapper remains unreleased until its exact synchronous release boundary; pre-release failure retains the closed role-specific meaning, while released-child operational failure, verified termination failure, and verified process-group residue remain independent outcomes. A live or unprovable verified child enters a fixed nonreceipt HOLD and cannot be followed by cleanup or a cleanup-success claim. The obsolete owned-phase and cleanup-child helpers are absent.

Runtime inventory counts are now nullable, bounded to 0 through 4,096, and copied only from observations. The selected runtime triple exists only for one uniquely introduced runtime. Retention reports the observed post-cleanup fact, including unknown post-cleanup inventory. Disk receipt slots are nullable, observed zero is valid, and the controller records each sample before applying the exact floor or delta threshold. The receipt adds `freeBytesAfterMinimumEvidence`; a nonzero sample count requires the initial and minimum observations, while zero samples require all five disk observations to remain null and the delta to remain zero.

Development evidence remains nonlive: **232/232 controller cases**, **37/37 shared structure cases**, and **105/105 phase-guard cases** are required, for **354 relevant cases**. The phase-specific required ledger is **257 = 232 controller + 25 newly applicable structure cases**. Live acquisition, Xcode execution, simulator installation, protected minimum/current evidence, cleanup, receipt upload, stage, commit, and push remain gated and are not development-test passes. All credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-14 — iOS 17.5 prerequisite lifecycle v1.1.12.1 correction

V1.1.12.1 preserves an existing precondition, acquisition, minimum-evidence, or cleanup failure when cancellation is observed during finalization. It separates the fixed `/bin/ps` verifier runner from the general captured-probe runner. Both use direct, no-shell, detached children with immediate settlement, exact tokens and environments, bounded output and time, identity-bound termination, awaited close, and process-group absence proof. A live or unprovable unverified child and a surviving verified child remain fixed nonreceipt HOLD outcomes; they do not claim cleanup or continue to another action.

Every ACQUIRE, MINIMUM, and CLEANUP filesystem sample now writes its exact receipt slot synchronously before the floor or delta check. Receipt validation uses one closed phase-evidence validator for invocation count, runtime cardinalities, runtime selection, retention, reached and unreached disk slots, and code-specific thresholds. `PRECONDITION_RUNTIME_INVENTORY` identifies only first-inventory process, UTF-8, JSON, schema, or 4,096-row-cap failure before a successful count. `PRECONDITION_STORAGE_ANCHOR` begins only after a parsed exact-runtime count of zero and identifies canonical held-storage binding failure.

Development evidence remains nonlive: **264/264 controller cases**, **46/46 shared structure cases**, and **105/105 phase-guard cases** are required, for **395 relevant cases**. The phase-specific required ledger is **298 = 264 controller + 34 newly applicable structure cases**. Live acquisition, Xcode execution, simulator installation, protected minimum/current evidence, cleanup, receipt upload, stage, commit, and push remain gated and are not development-test passes. Workflow and `scripts/ios-ci.sh` bytes remain identical to the v1.1.11.3 candidate. All credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-14 — iOS 17.5 prerequisite lifecycle v1.1.12.2 HOLD correction

V1.1.12.2 closes the remaining verified-child termination boundary without changing the authorized acquisition, minimum-evidence, or cleanup targets. A live wrapper whose fresh process-identity re-probe errors or differs from the immutable capture enters `PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD` and receives no signal. If the wrapper closes during that re-probe, the captured process group must be proven absent before the close is accepted. Only an exact fresh identity may be signaled. A non-`ESRCH` signal failure, bounded KILL timeout, or surviving process group enters `PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD`.

The gated-phase supervisor preserves those two internal HOLD classifications instead of converting them to a generic signal failure. One immutable HOLD settlement is raced against child close. HOLD wins immediately without waiting for an unbounded close, receipt, or cleanup; close-first awaits bounded termination and rechecks the latched HOLD before any source, group, or result processing. Controller ownership remains with the protected workflow until its existing timeout.

Development evidence remains nonlive: **270/270 controller cases**, **49/49 shared structure cases**, and **105/105 phase-guard cases** are required, for **404 relevant cases**. The phase-specific required ledger is **307 = 270 controller + 37 newly applicable structure cases**. Live acquisition, Xcode execution, simulator installation, protected minimum/current evidence, cleanup, receipt upload, stage, commit, and push remain gated and are not development-test passes. Workflow and `scripts/ios-ci.sh` bytes remain identical to the v1.1.11.3 candidate. All credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-14 — iOS 17.5 prerequisite lifecycle v1.1.12.3 executable HOLD proof

V1.1.12.3 changes no controller, workflow, or minimum-evidence implementation bytes. It replaces the prior source-shape assertion for the gated HOLD/close race with an injected executable fixture. The fixture releases a wrapper that never closes, forces its live termination-ownership re-probe to become unprovable, and proves prompt `PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD` settlement before close with zero signals, bounded monitor/listener state, and no downstream receipt or cleanup callback.

Development evidence remains nonlive and count-stable: **270/270 controller cases**, **49/49 shared structure cases**, and **105/105 phase-guard cases** are required, for **404 relevant cases**. The phase-specific required ledger remains **307 = 270 controller + 37 newly applicable structure cases**. Live acquisition, Xcode execution, simulator installation, protected minimum/current evidence, cleanup, receipt upload, stage, commit, and push remain gated and are not development-test passes. All credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-14 — iOS 17.5 prerequisite lifecycle v1.1.13 correction

V1.1.13 closes four remaining evidence-bound lifecycle defects without changing the authorized acquisition, minimum-evidence, or cleanup targets. The dedicated `/bin/ps` verifier and general captured runner attach child settlement before reading the spawned PID or streams. A synchronous spawn rejection maps only to its fixed phase code. An invalid spawned PID receives no signal: close or error maps to the fixed phase exit code after listener and timer cleanup, while no settlement within exactly 7,000 ms enters `PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD`. A gated pre-release residue HOLD is rethrown before gate teardown or role mapping and therefore cannot continue to receipt or cleanup.

After the first runtime inventory parses with an exact-runtime count of zero, storage discovery, canonical validation, `O_NOFOLLOW` open, held binding, and the first unbounded sample form one atomic storage-anchor operation. A failed candidate descriptor closes exactly once, clears its binding, resets all disk evidence to null/zero, and reports only `PRECONDITION_STORAGE_ANCHOR`. Only a successful first sample can be compared to the preflight floor and retained for later phases.

Cleanup disk observations now use the closed `CLEANUP_DISK_FLOOR` and `CLEANUP_DISK_LIMIT` codes. Receipt validation requires the cleanup slot and aggregate minimum or delta that justify the exact cleanup code, rejects low or over-limit evidence attributed to another phase, and permits a null cleanup slot only when a non-disk cleanup failure occurred before that sample. All other cleanup sample faults remain `CLEANUP_STORAGE_IDENTITY`.

Development evidence remains nonlive: **284/284 controller cases**, **53/53 shared structure cases**, and **105/105 phase-guard cases** are required, for **422 relevant cases**. The phase-specific required ledger is **325 = 284 controller + 41 newly applicable structure cases**. Live acquisition, Xcode execution, simulator installation, protected minimum/current evidence, cleanup, receipt upload, stage, commit, and push remain gated and are not development-test passes. Workflow and `scripts/ios-ci.sh` bytes remain identical to the v1.1.11.3 candidate. All credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-15 — iOS 17.5 prerequisite lifecycle v1.1.14.2 correction

V1.1.14.2 makes actual child-process close the only close authority without changing the authorized acquisition, minimum-evidence, or cleanup targets. Every successful spawn synchronously attaches one immutable lifecycle pair: settlement records the first error or actual close, while the independent close promise resolves only on the child `close` event. Exit or signal state alone never proves close. The same close promise is threaded through the dedicated `/bin/ps` verifier, captured subprocesses, verified termination, and gated roles. A pre-release wrapper without identity and close enters the unverified nonreceipt HOLD; a released or identity-captured wrapper without actual close enters the verified nonreceipt HOLD. Neither HOLD can continue to cleanup or receipt.

Cleanup evidence now records whether the first successful cleanup filesystem sample occurred. Invocation-one cleanup failures that arise after sampling require a nonnull cleanup slot at or above the cleanup floor. The closed pre-sample failure set may retain a null cleanup slot, while invocation-zero raw residue remains truthful. Explicit receipt-invalid and unknown cleanup failures sanitize to residue before that first successful sample and to receipt-invalid afterward; known cleanup failures retain their exact code. Existing cleanup floor and delta rules are unchanged.

Development evidence remains nonlive: **300/300 controller cases**, **58/58 shared structure cases**, **77/77 activation cases**, and **8/8 readiness cases** are required, for **443 relevant cases** and an exact focused total of **443/443 = 300 + 58 + 77 + 8**. The phase-specific required ledger is **346 = 300 controller + 46 newly applicable structure cases**. Live acquisition, Xcode execution, simulator installation, protected minimum/current evidence, cleanup, receipt upload, stage, commit, and push remain gated and are not development-test passes. Workflow and `scripts/ios-ci.sh` bytes remain identical to the v1.1.11.3 candidate. All credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-15 — iOS 17.5 prerequisite parent-identity v1.1.15 correction

V1.1.15 corrects the protected-run pre-acquisition parent-identity failure without changing the authorized acquisition, minimum-evidence, or cleanup targets. Parent identity now uses the dedicated direct `/bin/ps` verifier and cannot recursively enter the general captured runner. `PRECONDITION_PARENT_IDENTITY` records a bounded parent-verifier failure, while `PRECONDITION_INSUFFICIENT_TIME` records the reached preflight time-budget boundary. A closed precondition-stage table sanitizes invocation-zero failures only to exact `PRECONDITION_*` codes; it never fabricates an acquisition failure. Invocation-one failure behavior is unchanged.

The stage advances through runner, parent identity, controller source, owned roots, Xcode, first runtime inventory, storage anchor, disk, and time budget. It returns to source before the final pre-release controller-source verification, so a time-budget fallback cannot mask source drift. Invocation-zero receipts remain `PRECONDITION_REJECTED`, `NOT_ATTEMPTED`, `NOT_RUN`, and `NOT_REQUIRED` with no runtime retention or downstream callbacks. Parent-identity rejection has no fabricated runtime or disk evidence. Insufficient-time rejection records the already observed exact-runtime count and initial disk sample truthfully.

Development evidence remains nonlive: **314/314 controller cases**, **62/62 shared structure cases**, **77/77 activation cases**, and **8/8 readiness cases** are required, for **461 relevant cases** and an exact focused total of **461/461 = 314 + 62 + 77 + 8**. The phase-specific required ledger is **364 = 314 controller + 50 newly applicable structure cases**. Live acquisition, Xcode execution, simulator installation, protected minimum/current evidence, cleanup, receipt upload, stage, commit, and push remain gated and are not development-test passes. Workflow and `scripts/ios-ci.sh` bytes remain unchanged. PR #94 remains draft/HOLD. All credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-15 — iOS 17.5 prerequisite parent-identity v1.1.15.1 repair topology

V1.1.15.1 changes no controller, workflow, or minimum-evidence implementation behavior. It binds the bounded repair to exact base `b3203f0b96db5efca6d3cd16e6eb39d80a9cd3a5` and its immutable eight-path blob/mode table. The repair topology permits exactly six changed paths: the handoff, structure test, activation guard, readiness guard, controller, and controller test. Workflow and `scripts/ios-ci.sh` must remain byte-identical and absent from the repair diff.

One bounded atomic porcelain-v2 snapshot classifies only exact unstaged, exact staged, or clean postcommit state. Unstaged and staged states require all six paths with exact base and candidate identities and reject mixed state, drift, duplicates, extra paths, or unsafe status records. A clean postcommit state must be one direct child of the exact repair base and change exactly those six blobs and modes. At most one exact `.tmp-auth-readiness-approval-<six alphanumeric>/` root is ignored; near matches, nested paths, siblings, and a second root remain failures.

Development evidence remains nonlive: **314/314 controller cases**, **62/62 shared structure cases**, **85/85 activation cases**, and **8/8 readiness cases** are required, for **469 relevant cases** and an exact focused total of **469/469 = 314 + 62 + 85 + 8**. The phase-specific required ledger remains **364 = 314 controller + 50 newly applicable structure cases**. Live acquisition, protected CI rerun, simulator installation, stage, commit, push, ready, and merge remain gated. PR #94 remains draft/HOLD.

## 2026-11-15 — iOS 17.5 prerequisite parent-identity v1.1.15.2 executable repair proof

V1.1.15.2 preserves the exact six-path repair topology while making both previously structural failure claims executable. The production controller exposes one local, dependency-injected final-source validator used at exactly the two final source-validation sites; the initial and middle source validations remain direct. The precondition stage changes back to `SOURCE` before each final validation, so raw final-source failure records only `PRECONDITION_SOURCE` with the already reached runtime-count and disk observations and cannot start an acquisition, minimum-evidence, or cleanup child.

The test-only Windows oracle copies the exact controller and `ios-ci.sh` bytes into one held, canonical temporary root, rewrites only the three cardinality-checked fixture tokens for the contained path grammar, developer directory, and host architecture, disables auto-main through module import, and injects every external boundary. It invokes no shell, real tool, subprocess, network, or live runtime action. Raw parent failure now proves a canonical invocation-zero `PRECONDITION_PARENT_IDENTITY` receipt with zero downstream callbacks. Raw final-source failure proves exactly three injected preflight tool observations, one final validator call, zero child spawns, truthful disk evidence, no private error text, and exact owned-leaf cleanup. The immutable repair base assertion also binds exact parent, tree, subject, modes, and blobs for `b3203f0b96db5efca6d3cd16e6eb39d80a9cd3a5`.

Development evidence remains nonlive: **316/316 controller cases**, **62/62 shared structure cases**, **85/85 activation cases**, and **8/8 readiness cases** are required, for **471 relevant cases** and an exact focused total of **471/471 = 316 + 62 + 85 + 8**. The phase-specific required ledger is **366 = 316 controller + 50 newly applicable structure cases**. Live acquisition, protected CI rerun, simulator installation, stage, commit, push, ready, and merge remain gated. PR #94 remains draft/HOLD. Workflow and `scripts/ios-ci.sh` bytes remain unchanged. All credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-15 — iOS 17.5 prerequisite parent-identity v1.1.15.3 oracle hardening

V1.1.15.3 changes no production controller, workflow, or minimum-evidence bytes. The test-only Windows oracle now binds the production controller as raw bytes to exact SHA-256 `64acf8d9b930b7d8a4780c1e766937819668b98e2a01b7e6dbbe497d937871e2`, decodes with fatal UTF-8, requires already-normalized NFC and an exact UTF-8 round trip, and re-reads the unchanged production bytes before and after each fixture action. Malformed UTF-8 and non-NFC fixture sources are rejected.

Each transformed oracle module receives one test-local 16-byte cryptographic random query rendered as exactly 32 lowercase hexadecimal characters. The query is unique within the module, is used once only to isolate the import, and is absent from the sanitized receipt. The held temporary root remains the sole cleanup boundary on every success or failure. Both final source-validation sites are now mechanically bound to an immediately preceding `SOURCE` stage assignment; the final-source failure remains executable and callback-free.

Development evidence remains nonlive: **318/318 controller cases**, **62/62 shared structure cases**, **85/85 activation cases**, and **8/8 readiness cases** are required, for **473 relevant cases** and an exact focused total of **473/473 = 318 + 62 + 85 + 8**. The phase-specific required ledger is **368 = 318 controller + 50 newly applicable structure cases**. Live acquisition, protected CI rerun, simulator installation, stage, commit, push, ready, and merge remain gated. PR #94 remains draft/HOLD. All credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-15 — iOS 17.5 prerequisite v1.1.15.3 specialist gate record

The current exact eight-row candidate identity before this append-only records correction is SHA-256 `8c04e6d67d7a9d59f066f51ae23f20b803392574f6df5ca2127142665b07407e`. Exact-byte specialist gates report Catalina **105/105 PASS**, Natalia **204/204 PASS**, Renata **42/42 PASS** plus **1,107/1,107 executions PASS** with zero residue and zero owned processes, Julieta **60/60 PASS**, and Gabriela **28/28 PASS**. Protected macOS execution remains downstream evidence and is not claimed by these development gates.

Development evidence is **473/473 focused PASS**, with phase-specific required ledger **368**, readiness **150/150 PASS**, shared **634/634 PASS**, and static and diff checks PASS. Recommended Option A remains limited to the exact prerequisite CI scope recorded above. No acquisition, runtime action, simulator installation, stage, commit, or push is authorized or recorded by this entry. PR #94 remains draft/HOLD; all credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

The next gate is Elana's exact-candidate **COMMIT-ONLY** review, and it may start only after this handoff's new full hash and the exact candidate manifest are re-pinned and all applicable exact-byte rebinds pass. Any byte drift resets those gates.

## 2026-11-15 — iOS 17.5 prerequisite v1.1.15.4 postcommit records repair

Exact commit `22dede4b31071aad68c607eabf3aec0a46544fe3` has parent `b3203f0b96db5efca6d3cd16e6eb39d80a9cd3a5`, tree `8dab199f420d3d06ef76035495d166aa227d8c0b`, and subject `fix(ci): bind iOS bootstrap parent identity`. It changes exactly the reviewed six-path parent-identity repair and leaves the workflow and `scripts/ios-ci.sh` unchanged. Elana's candidate gate was **1,286/1,286 PASS-COMMIT-ONLY** before that exact commit.

The mandatory clean-tree shared run on the exact commit completed **633/634 PASS**. Its sole failure was the activation guard's stale live-state expectation: the clean exact commit was correctly classified as `POSTCOMMIT`, while case 26 still required `PRECOMMIT_UNSTAGED`. No controller, runtime, acquisition, workflow, minimum-evidence, or cleanup failure was observed by that repository-only gate.

V1.1.15.4 is a three-record repair only: this append-only handoff entry, the activation guard, and the readiness pins. The activation guard binds the full exact commit through Git objects, permits only those exact three paths in a single unstaged or staged records phase, rejects every other status or path including untracked authorization-temporary roots, and requires any later postcommit state to be one direct child changing exactly those three modes and blobs. The original `b3203f0b96db5efca6d3cd16e6eb39d80a9cd3a5` six-path repair fixtures remain unchanged.

Development evidence remains nonlive and count-preserving for the implementation: **318/318 controller cases**, **62/62 shared structure cases**, **90/90 activation cases**, and **8/8 readiness cases** are required, for **478 relevant cases**. The phase-specific required ledger remains **368 = 318 controller + 50 newly applicable structure cases**. No acquisition, live controller execution, simulator installation, push, ready, or merge is authorized or recorded by this entry. PR #94 remains draft/HOLD, and all credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-15 — iOS 17.5 prerequisite v1.1.15.4 specialist gate record

The current exact three-row records candidate before this append-only correction contains **3 rows**, **361,866 source bytes**, and **388 manifest bytes**, with SHA-256 `a6894a81aee0006c4f697321058ce4c3af31c3ba231cfb47521df552d75515f8`. Its enclosing exact eight-row candidate contains **8 rows**, **669,480 source bytes**, and **914 manifest bytes**, with SHA-256 `54639291237223c8f31d2f01e179efd17f497c96372147631a26b420894070ae`.

Current exact-byte gates report Catalina **54/54 PASS**, Natalia **60/60 PASS**, Renata **38/38 PASS** plus **737/737 executions PASS**, and Julieta **36/36 PASS**. Activation plus readiness is **98/98 PASS**, shared is **639/639 PASS**, and static and diff checks PASS.

No acquisition, runtime action, simulator installation, stage, commit, or push is authorized or recorded by this entry. PR #94 remains draft/HOLD; all credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

The fresh next gate is Elana's exact-candidate **COMMIT-ONLY** review, and it may start only after this append's new full hash and the exact three-row and eight-row pins are refreshed and all applicable exact-byte rebinds pass. Any byte drift resets those gates.

## 2026-11-15 — iOS 17.5 prerequisite v1.1.15.5 amend-only topology correction

Local commit `18bd6b055065bd703ec3c8746666951315a8684d` is unpushed, predates this amendment, and is superseded as candidate evidence. Its identity is informational only and is not protected-CI, merge, or runtime authority. The pre-amend clean-tree shared run was honestly **638/639 PASS** and activation was **89/90 PASS**; the sole failure was case 34's stale clean-tree expectation after the exact three-path records commit. All other synthetic checks, static checks, and diff integrity passed.

V1.1.15.5 changes no classifier, controller, workflow, `scripts/ios-ci.sh`, minimum-evidence, acquisition, cleanup, or receipt behavior. Case 34 now proves the exact three-path unstaged state with a frozen synthetic `.M` snapshot, takes exactly one live clean snapshot, requires that live snapshot to contain no status entries, and classifies it as `POSTCOMMIT` through the existing exact direct-child records verifier. No fresh **90/90** activation or **639/639** shared claim is made by this entry before those gates execute on the final bytes.

PR #94 remains draft/HOLD. No acquisition, live controller execution, simulator installation, amend, push, ready, or merge is authorized or recorded by this entry. All credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-15 — iOS 17.5 prerequisite v1.1.16 portable oracle repair

Protected CI on exact pushed head `02b28be6d7a6bc5fe60ee1e73caa579ff33874a0` completed the Ubuntu portable audit with **504/506 PASS**. The only two failures were the executable Windows-oracle cases for raw parent and final-source failure: both stopped with the fixed code `PRECONDITION_RUNNER` because the test-only transformed canonical-path regular expression required `\` separators while hosted Ubuntu paths use `/`. This is a test-fixture portability defect only; it does not establish any production, runtime, acquisition, simulator, cleanup, or receipt claim. The separate protected minimum-iOS failure remains pending independent diagnosis.

V1.1.16 makes the oracle path pattern separator-aware while retaining a closed contained-path grammar and rejecting literal `.` and `..` segments, sibling or prefix paths, alternate separators, NUL and control characters, newlines, empty segments, and doubled separators. The four-path repair topology is bound to exact base `02b28be6d7a6bc5fe60ee1e73caa579ff33874a0`; the sole live snapshot is accepted only after the independent classifier proves either the exact dirty four-path state or a clean one-direct-child exact four-path postcommit state.

Required development evidence is **320/320 controller cases**, **62/62 shared structure cases**, **95/95 activation cases**, and **8/8 readiness cases**, for **485 focused cases**. The phase-specific required ledger is **370**, the portable audit-policy unit target is **508/508**, and the full shared target is **644/644**. No acquisition, live controller execution, simulator installation, stage, commit, push, ready, or merge is authorized or recorded by this entry. PR #94 remains draft/HOLD, and all credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-15 — iOS 17.5 prerequisite v1.1.16 current evidence and transition

Current development evidence reports structure plus activation plus readiness **165/165 PASS** and portable **273/273 PASS**. Renata's bounded recovery record reports that the first fixed 5-second timeout was superseded by an isolated **150/150 PASS** and one authorized full shared **644/644 PASS**. The final bounded state contained zero candidate processes, zero candidate residue, and zero candidate artifacts.

This evidence is repository-only and does not establish acquisition, live controller execution, simulator installation, protected minimum-iOS recovery, or any production/runtime claim. PR #94 remains draft/HOLD; no acquisition, runtime action, stage, commit, or push is authorized or recorded by this entry, and all credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

The fresh next gate is Elana's exact-candidate **COMMIT-ONLY** review, and it may start only after this append's new full hash and exact candidate pins are refreshed and all applicable exact-byte rebinds pass. Any byte drift resets those gates.

## 2026-11-15 — iOS 17.5 prerequisite v1.1.17 minimum-lane repair record

The repair base is exact commit `a1e43d4f0494a23019f4712d3bb292bd9af83296`, tree `0fed24af5507eca32477280aa9775ee3dc21c065`, subject `test(ci): make iOS bootstrap fixtures portable`. PR #94's protected rollup contained **14** terminal results: **12 success**, **1 minimum-iOS failure**, and **1 skipped**. Minimum job `132743943026` first reported fixed `ACQUIRE_PROCESS_IDENTITY`, then `CLEANUP_RECEIPT_INVALID`; it produced no receipt and no minimum artifact. Current-iOS, Windows, portable, and every other protected gate passed. This record makes no protected-recovery claim.

Source review identifies five unbound `(dependencies.now ?? performance.now)()` extractions, which violate the Node.js 19-or-later receiver requirement. The transaction sampled time before establishing its receipt state. A subsequent direct-root production defect also left the nested parent absent. These are source-proven failure facts, not evidence that the protected minimum lane recovered.

The approved repair remains an exact six-path repository/test scope only: this handoff, the shared iOS structure test, activation guard, readiness guard, controller, and controller test. It does not change the workflow or `scripts/ios-ci.sh` and grants no acquisition, simulator, production, or runtime authority.

Stable source facts before this append are:

- Controller: **114,337 bytes**; SHA-256 `91485c4ba0830da497e4d9992dd5afd4764dabab9b00085dc51221ac12969139`; Git blob prefix `29e7d92bb88c75f261054f8e20155b18f6348a63`.
- Controller test: **141,960 bytes**; SHA-256 `0eaf40d4ae4cb62233f39516f65b6404899815a3e69ac692488790f9b10dcd6b`; Git blob prefix `c0442379d30599d69ebde0ab2f30adbfa1c93b53`.
- Shared structure test: **54,746 bytes**; SHA-256 `29c27f7bcb62e6ae97251b1b40c2968b23ccff9b8215208e1e93b659f448896e`; Git blob prefix `02f274964ace424365132940b2f11cdd1f67902a`.
- Activation guard: **94,574 bytes**; SHA-256 `5894e8d64288560065a431525679a5eeaa6b50d59f7e6b681f1e44998ffec339`; Git blob prefix `dcea881d56d9d1c93bbd84c938877d0d141c6008`.

Current development evidence is controller **338/338 PASS**, shared structure **68/68 PASS**, and activation **99/100 PASS**. The sole expected activation failure is live topology case 34 while this handoff and the readiness guard remain incomplete. Prettier and Node syntax checks PASS.

The required final targets remain pending and are not claimed as executed by this entry: controller **338/338**, shared structure **68/68**, activation **100/100**, readiness **8/8**, focused **514/514**, phase-specific required ledger **394**, shared **655/655**, audit-policy unit **526/526**, portable **273/273**, and isolated readiness **150/150**. Valentina must mechanically refresh the handoff and readiness pins after this append before those gates can be evaluated.

PR #94 remains draft/HOLD. No acquisition, live controller execution, simulator installation, protected recovery, stage, commit, push, ready, or merge is authorized or recorded by this entry. All credential, `sudo`, custom-download, package-manager, retry, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-15 — iOS 17.5 prerequisite v1.1.17 source-fact supersession

The preceding v1.1.17 source-fact record remains preserved as historical evidence. Final lint identified one missing contract assertion in the already-required partial-second-create case: `minimumLeaf` was destructured but unused. The controller test now asserts the required absence; the case count remains unchanged, controller evidence remains **338/338 PASS**, and lint passes.

This entry supersedes only the controller-test source fact: `scripts/ios-runtime-bootstrap.test.mjs` is now **142,016 bytes**, SHA-256 `fd470f24392fc64a5475a42badffa7711946c51447f86426915ea222738654a7`, Git blob `94af350afb70d43131c167479edd1689d58c4ce2`. The controller, shared structure test, and activation-guard source facts in the preceding record remain unchanged.

This repository/test correction makes no protected-recovery, acquisition, simulator, production, or runtime claim. PR #94 remains draft/HOLD; no stage, commit, push, ready, or merge is authorized or recorded by this entry, and all existing prohibitions remain unchanged.

## 2026-11-15 — PR #94 Xcode precondition diagnostic v1.1 record

The diagnostic repair base is exact commit `ea651344e5fee88e73ded66ecf9c1c770afa5d34`, tree `ffb2c3fa53efe88f235975d722946d71a869f1e0`, subject `fix(ci): bind iOS bootstrap clock and temp roots`. Its protected rollup contained **14** terminal results: **12 success**, **1 minimum-iOS failure**, and **1 aggregate skipped**. The sanitized minimum receipt was `PRECONDITION_REJECTED` with `PRECONDITION_XCODE`, invocation count **0**, no acquisition, and no runtime retention. Current-iOS, Windows, portable, and all other protected gates passed.

That generic code did not prove the exact failing Xcode subcheck because it collapsed both the Xcode version probe/parse boundary and the `simctl` probe/path boundary. No protected recovery is claimed.

The approved repository/test-only diagnostic mode is `PR94_IOS_XCODE_PRECONDITION_DIAGNOSTIC_V1_1`. It does not change the workflow or `scripts/ios-ci.sh` and grants no acquisition or runtime authority. Its receipt schema v2 keeps the expected Xcode version and build exact while the observed version and build remain nullable. It permits exactly seven closed primary codes:

1. `PRECONDITION_XCODE_VERSION_PROBE`
2. `PRECONDITION_XCODE_VERSION_PARSE`
3. `PRECONDITION_SIMCTL_FIND_PROBE`
4. `PRECONDITION_SIMCTL_FIND_PATH`
5. `PRECONDITION_XCODE_VERSION_INTERNAL`
6. `PRECONDITION_SIMCTL_FIND_INTERNAL`
7. `PRECONDITION_XCODE_DIAGNOSTIC_READY`

Child-residue HOLD outcomes retain precedence over diagnostic classification. `PRECONDITION_XCODE_DIAGNOSTIC_READY` stops before runtime inventory or acquisition. At most one protected diagnostic attempt may run later. Its success criterion is one closed sanitized receipt with one exact code; a green protected job is not required and is not claimed. The diagnostic authorizes no retry, acquisition, merge, or broader runtime action.

Stable source facts before this append are:

- Controller: **119,516 bytes**; SHA-256 `ee8245134facede4824f6a7ee3c44256c375ecd6ce741025d43dcb5bd345c149`; Git blob `df4f2c8070cb464271af332eb8551798c76b3412`.
- Controller test: **156,773 bytes**; SHA-256 `604dee8e33a474ec9b24be51328fedc69a3d777666e66c6d58422c7774616c1f`; Git blob `3fb9590e0803ca0d3f4e164c259a1bdd85ea1c01`.
- Shared structure test: **60,310 bytes**; SHA-256 `b4ae9e1722c6dccaf33dc057e6243c94589ece79cb154f3ad0b609bed93c5a51`; Git blob `ec16ffedbdc3a7a66d3be4e54bc105bd7061621e`.
- Activation guard: **94,590 bytes**; SHA-256 `a672e7d4fa5b5eec25d69e0ea55d7c52ad95cffbe668cb08a0676039ddc13ce7`; Git blob `112be37063ec2cc40ae6ed2b5161dc14a19198f8`.

Executed development evidence is controller **370/370 PASS** and shared structure **78/78 PASS**. Prettier for all four reviewed paths and diff integrity PASS. Activation **100/100** remains pending until the exact six-path handoff/readiness topology is complete.

The required final targets remain pending and are not claimed as executed by this entry: controller **370/370**, shared structure **78/78**, activation **100/100**, readiness **8/8**, focused **556/556**, phase-specific required ledger **436**, shared **665/665**, audit-policy unit **558/558**, portable **273/273**, and full repository **2,712/2,712**.

PR #94 remains draft/HOLD. No acquisition, live controller execution, simulator installation, retry, stage, commit, push, ready, or merge is authorized or recorded by this entry. All credential, `sudo`, custom-download, package-manager, proxy, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged.

## 2026-11-15 — PR #94 Xcode precondition diagnostic v1.1.1 supersession

Final exact-byte review of the unexecuted diagnostic v1.1 found a cleanup-failure receipt-validator defect and an initial schema-name conflict. Catalina and Natalia converged before any diagnostic execution on the canonical short keys `expectedVersion`, `expectedBuild`, `observedVersion`, and `observedBuild`. This v1.1.1 record explicitly supersedes the unexecuted full-name requirement; all preceding v1.1 history remains preserved.

The cleanup contract is a closed two-row table. It distinguishes the clean row from the exact failure row `CLEANUP_FAILED` / `CLEANUP_RAW_RESIDUE` / `FAILED` / `raw=true`, with `fallbackUsed=false`. The observed-version/build table is selected by the exact primary code. A child HOLD retains precedence and writes no receipt.

The repair adds exactly two controller cases and leaves the shared-structure count unchanged. Executed development evidence is controller **372/372 PASS** and shared structure **78/78 PASS**; Prettier and diff integrity PASS. Activation **100/100** remains pending until the exact handoff/readiness pins are refreshed.

Current frozen source facts before this append are:

- Controller: **119,783 bytes**; SHA-256 `65136f954db6c64d6806bce1c37fc91f756c951a7cb87cc4bc8d8a3a7a100a1a`; Git blob `d712c4c0bcc0087225df406e602b9bae3dd70425`.
- Controller test: **160,587 bytes**; SHA-256 `681f1c1a35832e8170f572c945bfa7a5ebdeceef7c7dea6cf6425df65d3cabef`; Git blob `912e5c717301590a7e73daac4fa38a80a453eccf`.
- Shared structure test: **60,850 bytes**; SHA-256 `6b21265ef0ae98ffde2dc83e426e29e7b337faaae4a3ba6d850e1935c4bb3aae`; Git blob `bfd701ad2958393e46cd51d63a180e0d865d850a`.
- Activation guard: **94,590 bytes**; SHA-256 `4a2fed88583b24cd0aaaef81f7920eac3913eb8a156c450635b4fba7e142455e`; Git blob `91b218c3235d9c2a4bafd094c6ac8f31a172ad43`.

The required final targets remain pending and are not claimed as executed by this entry: controller **372/372**, shared structure **78/78**, activation **100/100**, readiness **8/8**, focused **558/558**, phase-specific required ledger **438**, shared **665/665**, audit-policy unit **560/560**, portable **273/273**, isolated readiness **150/150**, and full repository **2,714/2,714**.

This repository/test correction makes no protected-recovery, acquisition, simulator, production, or runtime claim. PR #94 remains draft/HOLD; no diagnostic execution, retry, stage, commit, push, ready, or merge is authorized or recorded by this entry, and all existing prohibitions remain unchanged.

## 2026-11-15 — PR #94 dual iOS diagnostic v1 design and development record

Catalina's `PR94-IOS-DUAL-DIAGNOSTIC-v1` design gate is **96/96 PASS**, and Natalia's corresponding security and privacy design gate is **96/96 PASS**. The planned commit subject is `test(ci): refine iOS failure localization`. The exact nine-path scope is closed to:

1. `docs/DEVELOPMENT_HANDOFF.md`
2. `packages/shared/src/ios-foundation-structure.test.ts`
3. `packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts`
4. `packages/shared/src/sprint-6-r4b-addtype-postmain-readiness.test.ts`
5. `scripts/ios-ci.sh`
6. `scripts/ios-runtime-bootstrap.mjs`
7. `scripts/ios-runtime-bootstrap.test.mjs`
8. `scripts/summarize-ios-test-failures.mjs`
9. `scripts/summarize-ios-test-failures.test.mjs`

The workflow remains pinned. This repository/test-only diagnostic grants no acquisition or runtime authority, adds no retry authority, and leaves both minimum-iOS and current-iOS outcomes unresolved until protected evidence exists. PR #94 remains draft/HOLD.

Current executed development evidence is controller **381/381 PASS**, shared structure **85/85 PASS**, and the direct sanitizer current-failure **23-row suite PASS**. Activation is **97/100**, not green: exactly two restricted-sandbox Git-clone fixtures and the live-status case remain outstanding, and authoritative outside-sandbox **100/100** is pending. No readiness or final handoff/manifest pin is invented or claimed by this record.

Current frozen source facts before this append are:

- Shared structure test: **65,482 bytes**; SHA-256 `bc5d448f12561f77812119292ebbc9ff12f6eb390ec3cb226e97a18118a8f905`; Git blob `47d4f304513bf1c26578d54487a4038f64122431`.
- Activation guard: **95,849 bytes**; SHA-256 `433e46c6ea7b57e296f4b8d0da833fbd0999367c05f292183f3bd97b4d9b4f43`; Git blob `44ca9ae2a86cb50a4c67a4633dd32c0606aec8c6`.
- iOS CI script: **17,695 bytes**; SHA-256 `8de79ce3d2715f68b23930d4e4b601dba232494e789338d25405a5b065248c0c`; Git blob `0b84abbd35ebc8e3ca28ec672ca513b288fec94b`.
- Controller: **126,052 bytes**; SHA-256 `71b83aaf821a05093131087a9d30e2834437e96cebe6cf6dcd24515ffa2b298e`; Git blob `fad08d9b91f008b40a81ceddd58fe7c8cb3cd84b`.
- Controller test: **162,291 bytes**; SHA-256 `128533346f837dd2541d3e984bff67feb4da5e3a8b717b3146b76768abe083eb`; Git blob `dd6014b9b27df5b42331cd1f4d06cb61e2e0af71`.
- iOS failure summarizer: **20,597 bytes**; SHA-256 `0f74bbcdeec96d331a9a0cc33a8da1a7d134b3ec8fd41342304d2b629f401c79`; Git blob `0d4fe7a679e5d3a5c3881c41bc6862e4b943ba26`.
- iOS failure summarizer test: **61,023 bytes**; SHA-256 `7a74f2d8df4cb0480fc37fa3217f0e18291fd0bd00a3d32e3104616d66c2ebb6`; Git blob `08c4d75325ff9cc4161d7d21ce77602b2442dbad`.

No acquisition, live controller execution, simulator installation, protected recovery, runtime action, retry, stage, commit, push, ready, or merge is authorized or recorded by this entry. All credential, `sudo`, custom-download, package-manager, proxy, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged. Valentina must mechanically bind the readiness, handoff, and final manifest pins only after this append freezes.

## 2026-11-15 — PR #94 dual iOS diagnostic v1.2 sanitizer recovery checkpoint

Catalina's sanitizer-recovery freeze is **72/72 PASS**, and Natalia's corresponding security and privacy design gate is **72/72 PASS**. This bounded repository/test recovery changes only the iOS failure summarizer and its test, the shared structure test, the activation guard, the readiness guard, and this append-only handoff. The controller, controller test, `simctl` behavior, `scripts/ios-ci.sh`, and the workflow remain preserved.

Functional development evidence only is the exact sanitizer **35/35 PASS**, shared structure **90/90 PASS**, and focused formatter, ESLint, and Node syntax PASS. This evidence makes no protected recovery, acquisition, simulator, production, or runtime-success claim. Activation **100/100**, readiness **8/8**, focused **579/579**, the phase-specific required ledger **459**, audit-policy unit **569/569**, shared **677/677**, portable **273/273**, and full repository **2,735/2,735** remain pending after the append's mechanical pins and final gates.

Current frozen source facts before this append are:

- Shared structure test: **69,370 bytes**; SHA-256 `b9a3fda060432df495115dc1bb0ee88deb668e4b13afe6f6ea0513eba9ab3dca`; Git blob `379a5d3376f6ac4331b415166727d8bbee919690`.
- iOS failure summarizer: **36,268 bytes**; SHA-256 `48914ef84623bb627650c3748cc3351ff6bad5bc735088cf66538fcc8484897f`; Git blob `304a8306a7fab2165f03852c6cf31dce0623fb77`.
- iOS failure summarizer test: **67,405 bytes**; SHA-256 `e9c1697e683cec350bbde0fb1e1f0f7affe2d43f9e0b48b01f7e8d6a3165255e`; Git blob `4600785f4703469cfdabc4020087ec53bc297b87`.
- Controller: **126,052 bytes**; SHA-256 `71b83aaf821a05093131087a9d30e2834437e96cebe6cf6dcd24515ffa2b298e`; Git blob `fad08d9b91f008b40a81ceddd58fe7c8cb3cd84b`.
- Controller test: **162,291 bytes**; SHA-256 `128533346f837dd2541d3e984bff67feb4da5e3a8b717b3146b76768abe083eb`; Git blob `dd6014b9b27df5b42331cd1f4d06cb61e2e0af71`.
- iOS CI script: **17,695 bytes**; SHA-256 `8de79ce3d2715f68b23930d4e4b601dba232494e789338d25405a5b065248c0c`; Git blob `0b84abbd35ebc8e3ca28ec672ca513b288fec94b`.

PR #94 remains draft/HOLD. No acquisition, live controller execution, simulator installation, protected recovery, runtime action, retry, stage, commit, push, ready, or merge is authorized or recorded by this entry. All credential, `sudo`, custom-download, package-manager, proxy, fallback, production, signing, store, spend, and unrelated-runtime prohibitions remain unchanged. Valentina must mechanically refresh the activation, readiness, handoff, and final manifest pins after this append freezes.

## 2026-11-15 — PR #94 dual iOS diagnostic v1.2 three-defect repair supersession

This append preserves the preceding v1.2 checkpoint as historical evidence and supersedes its functional sanitizer count and three repaired source identities. The exact repairs cover the **12 code fields**, the earlier-zero nested summary, and provisional file-descriptor/quarantine tracking.

Current functional evidence is sanitizer semantic **43/43 PASS**, comprising **30 classifier** plus **13 lifecycle/oracle** cases. The prior **35/35** count is superseded by eight required `fstat`/quarantine cases. Shared structure is **90/90 PASS**, and focused ESLint, Prettier, and Node syntax PASS.

Current repaired source facts before this append are:

- Shared structure test: **70,736 bytes**; SHA-256 `d984964245b49fb07135bd47bba6a82ced44c83c8c9302b7828fe94c1da14b7a`; Git blob `d80d6d536a458df9cc5a8818879ab484a30cb397`.
- iOS failure summarizer: **39,102 bytes**; SHA-256 `5f1ea392c303a281a421bf685331d5fad68962dbce11ec59c08408644492ee36`; Git blob `d516dbe6b10629e5e5684226d5522339cd35f756`.
- iOS failure summarizer test: **72,804 bytes**; SHA-256 `8f0116ff167f0681020f7c1f33abd09e462a882d11eb74bdd7948e0cb85c96cd`; Git blob `f3e9097fd34a950a61aff23e566d9d061cc0d458`.

The controller remains **126,052 bytes**, SHA-256 `71b83aaf821a05093131087a9d30e2834437e96cebe6cf6dcd24515ffa2b298e`, Git blob `fad08d9b91f008b40a81ceddd58fe7c8cb3cd84b`; the controller test remains **162,291 bytes**, SHA-256 `128533346f837dd2541d3e984bff67feb4da5e3a8b717b3146b76768abe083eb`, Git blob `dd6014b9b27df5b42331cd1f4d06cb61e2e0af71`; and `scripts/ios-ci.sh` remains **17,695 bytes**, SHA-256 `8de79ce3d2715f68b23930d4e4b601dba232494e789338d25405a5b065248c0c`, Git blob `0b84abbd35ebc8e3ca28ec672ca513b288fec94b`. Controller behavior, its test, `simctl` behavior, the iOS CI script, and the workflow remain preserved.

Audit TAP topology remains **569**. Focused **579/579**, the phase-specific required ledger **459**, shared **677/677**, portable **273/273**, and full repository **2,735/2,735** targets are unchanged because the semantic cases remain inside one top-level script. Activation, readiness, and the full gates remain pending.

PR #94 remains draft/HOLD. No protected recovery, acquisition, live controller execution, simulator installation, production or runtime success, retry, stage, commit, push, ready, or merge is authorized or recorded by this entry. All existing prohibitions remain unchanged, and Valentina must mechanically refresh the downstream pins after this append freezes.

## 2026-11-15 — PR #94 SIMCTL short-lived v1.2 functional freeze

Protected execution on exact head `afd3f53145efb311396c1f20fed82129d1dad1d7` produced `receipt.json` at **1,441 bytes** with SHA-256 `64681d648f2f3ea0c4765486e3816bf523d70df4a49f2ef1b15ee20c42ef83a0`. The receipt records mode `PR94-IOS-SIMCTL-SHORT-LIVED-v1.2`, primary code `PRECONDITION_SIMCTL_FIND_INVALID_PID`, invocation count **0**, download `NOT_ATTEMPTED`, minimum `NOT_RUN`, no retention, and no fallback. This evidence diagnoses the precondition only; the repair remains unexecuted and no recovery is claimed.

Catalina's architecture design gate is **52/52 PASS**, and Natalia's security and privacy design gate is **52/52 PASS**. Functional development evidence is controller **397/397 PASS**, shared structure **95/95 PASS**, activation topology subset **5/5 PASS**, and Prettier and Node syntax PASS.

Current frozen source facts before this append are:

- Controller: **130,684 bytes**; SHA-256 `44f809aaf5e8693464f5ac016a57fd7536286599b0430d64649a5662966ef189`; Git blob `72c6d99ad1f4eac6b7785e880919d9780dec5a8a`.
- Controller test: **172,838 bytes**; SHA-256 `fa0794c123f8a6ad18ac19717babaae7616ef2e5c6133fda05580be5e26db87c`; Git blob `7c0c0e54bf6884abc4f1be868bf22e720e4b7727`.
- Shared structure test: **75,468 bytes**; SHA-256 `fe15d1cc300647132c95be282c49ce1cdb8adac0cae8f5ed1233213f2650ff71`; Git blob `e1fde4451bd5bcded134f0b410f1e481a73247ae`.
- Activation guard: **105,937 bytes**; SHA-256 `c2488558e0cc0b757a43d92bb3e4699e60373dd42c63ebd51f56de77bcd166fa`; Git blob `0b762a3e3822aa6f41715809a27e797c518b47b0`.

Final activation **100/100**, readiness **8/8**, focused **600/600**, the phase-specific required ledger **480**, audit-policy unit **585/585**, shared **682/682**, and full repository **2,756/2,756** remain pending after the append's mechanical pins and final gates.

PR #94 remains draft/HOLD. No protected recovery, acquisition, live controller execution, simulator installation, production or runtime success, retry, stage, commit, push, ready, or merge is authorized or recorded by this entry. All existing prohibitions remain unchanged, and Valentina must mechanically refresh the downstream pins after this append freezes.

## 2026-11-15 — PR #94 SIMCTL short-lived v1.2 lifecycle-repair supersession

This append preserves the preceding SIMCTL v1.2 record as historical evidence and supersedes its functional source facts and counts after Catalina's **18/18 PASS** count ruling. Three bounded lifecycle defects are corrected in repository/test bytes; the repair remains unexecuted in protected execution and no recovery is claimed.

Functional development evidence is controller **400/400 PASS**, shared structure **95/95 PASS**, and Prettier, Node syntax, and diff integrity PASS.

Current repaired source facts before this append are:

- Controller: **131,609 bytes**; SHA-256 `0975fd028e63ef76e7c0ed844c9192687526279480e7271dd6c69d87fab622e1`; Git blob `dab0d1fdf323eaa1e68ed6f58efd02104d2ed2ae`.
- Controller test: **175,245 bytes**; SHA-256 `f73eff66e1fe813ca74b20347a060d67e0c15d54d7a4c41b11342a33d0f63e6d`; Git blob `8da13b4ea6b885875c7d60a27c6ef8b82d30555c`.
- Shared structure test: **75,936 bytes**; SHA-256 `046aac08dd96653212c5b68d71328bb2f3d3403ea87f531071f70c6204a4a2b5`; Git blob `d24e2e324a8b2a159407edff0c7b079119be92f8`.

The exact final targets are activation **100/100**, readiness **8/8**, focused **603/603**, the phase-specific required ledger **483**, audit-policy unit **588/588**, portable **273/273**, shared **682/682**, installed-tree **1/1**, API **381/381**, web **834/834**, and full repository **2,759/2,759**. Sanitizer semantic **43/43**, isolated readiness **150/150**, and static checks remain supporting requirements. Activation, readiness, the final manifest pins, and these final gates remain pending mechanical binding and execution.

PR #94 remains draft/HOLD. No protected recovery, acquisition, live controller execution, simulator installation, production or runtime success, retry, stage, commit, push, ready, or merge is authorized or recorded by this entry. All existing prohibitions remain unchanged, and Valentina must mechanically refresh the activation, readiness, handoff, and final manifest pins after this append freezes.

## 2026-11-15 — PR #94 SIMCTL short-lived v1.2 lifecycle-race supersession

This append preserves the preceding lifecycle-repair record as historical evidence. Catalina's HOLD race is corrected in repository/test bytes, but the repair remains unexecuted in protected execution and no recovery is claimed. The correction is count-stable.

Functional development evidence remains controller **400/400 PASS**, shared structure **95/95 PASS**, and Prettier, Node syntax, and diff integrity PASS.

Current repaired source facts before this append are:

- Controller: **131,777 bytes**; SHA-256 `12425795f01ea4c723a514ebcf1664bd939dd2381ea950a685fb6e42f2cbd147`; Git blob `88202502447ebfddc0b7fc476b7821404151dd74`.
- Controller test: **175,348 bytes**; SHA-256 `1bc53a0bd6ff0af57bb21f9a64d645f54708346d91da47e801fc4350475213bb`; Git blob `4e8e97b24a84c5a72e14a9fa439cedee759f24a7`.
- Shared structure test: **76,446 bytes**; SHA-256 `cb950e40caf83d768052909c7f4553fb7c4732c238de4b216af8237499b38fca`; Git blob `786917046c0f41b458bfe84170a8e958da685f7e`.

Final targets remain activation **100/100**, readiness **8/8**, focused **603/603**, the phase-specific required ledger **483**, audit-policy unit **588/588**, portable **273/273**, shared **682/682**, installed-tree **1/1**, API **381/381**, web **834/834**, and full repository **2,759/2,759**. These targets and the downstream mechanical pins remain pending.

PR #94 remains draft/HOLD. No protected recovery, acquisition, live controller execution, simulator installation, production or runtime success, retry, stage, commit, push, ready, or merge is authorized or recorded by this entry. All existing prohibitions remain unchanged, and Valentina must mechanically refresh the activation, readiness, handoff, and final manifest pins after this append freezes.

## 2026-11-15 — PR #94 SIMCTL spawn diagnostic v1.3 development checkpoint

Protected execution on exact head `a721ff8df68f621b3eb4afcddd168ab52567f38f` produced a sanitized diagnostic receipt with primary code `PRECONDITION_SIMCTL_FIND_SPAWN`, invocation count **0**, download `NOT_ATTEMPTED`, minimum `NOT_RUN`, no runtime or disk evidence, no retention, and no fallback. That receipt is preserved only as historical diagnosis of the retired generic spawn category. It does not establish recovery, simulator acquisition, or runtime success.

Catalina's architecture gate for `PR94-IOS-SIMCTL-SPAWN-DIAGNOSTIC-v1.3` is PASS, and Natalia's independent security gate is **64/64 STRICT PASS-TO-IMPLEMENT**. The bounded repository/test change pins the exact Xcode 16.2 `xcrun`, holds and revalidates its executable identity, and replaces the generic spawn result with one closed executable-identity code and six closed spawn categories. Functional development evidence is controller **412/412 PASS** and shared structure **100/100 PASS**.

Current frozen source facts before this append are:

- Controller: **138,001 bytes**; SHA-256 `b341b58c07492b7a5450753c67c33366cbd793b007ae7955957b5fb7dcd23579`; Git blob `5400ac205a1598e83f6058891a863ecf52f3c87a`.
- Controller test: **181,835 bytes**; SHA-256 `29eda1edfa606264db650a0c7557dcf435334155d62f40eccee3ce6f200383bb`; Git blob `41fb5f926c96d870e8531f0cbf6e7028189f0cef`.
- Shared structure test: **80,538 bytes**; SHA-256 `71791a4fdf60c4eb97be45f18157f3565a9d42adcc323a4b7191b0fa2d18d725`; Git blob `c00966608b05a12c4c3a2e29728da0881b2c6e48`.
- Activation guard before its final mechanical manifest pin: **105,977 bytes**; SHA-256 `3ce8910bb0e5fda00025473d2dc1f402422b88b3d80fb41657b9c3290cafd24e`; Git blob `58b8d86669d701f69131dba645f7a0feaeecd496`.

Final targets are activation **100/100**, readiness **8/8**, focused **620/620**, the phase-specific required ledger **500**, audit-policy unit **600/600**, portable **273/273**, shared **687/687**, installed-tree **1/1**, API **381/381**, web **834/834**, and full repository **2,776/2,776**. Sanitizer semantic **43/43**, isolated readiness **150/150**, and static checks remain supporting requirements. These final gates and the exact six-path manifest remain pending mechanical pins.

PR #94 remains draft/HOLD. No protected rerun, acquisition, live diagnostic, simulator installation, production or runtime success, retry, stage, commit, push, ready, or merge is authorized or recorded by this entry. Workflow, `scripts/ios-ci.sh`, the summarizer and its test, dependencies, and lockfiles remain byte-identical.

## 2026-11-16 — PR #94 SIMCTL spawn diagnostic v1.3 formatter supersession

This append preserves the preceding v1.3 checkpoint as historical development evidence and supersedes only its four source identities after the required formatter pass. No behavior, authority, protected execution, or recovery claim changed. Final functional evidence remains controller **412/412 PASS** and shared structure **100/100 PASS**.

The formatter-stable source facts are:

- Controller: **137,977 bytes**; SHA-256 `1d8a91f5eb81ce003e485af7c58effad047bebbf40e3097a5a6e4fe5bd28ec14`; Git blob `5f26ea395886431bcd6517acd6f2f9d7d3a51234`.
- Controller test: **181,835 bytes**; SHA-256 `7cebec379071b594abc95e6948f92907789914e4974096397ff80b32d8b73c73`; Git blob `3413fcc9c123b27fd277c66f9f15f3af9ace2906`.
- Shared structure test: **80,576 bytes**; SHA-256 `902d984ab60bc035054aceba9dc63019896bbd1d045fd9345464774731608627`; Git blob `19c0c1d3277def1e7eaebf06ca7a7cd1ccb82ac1`.
- Activation guard before its final mechanical manifest pin: **105,977 bytes**; SHA-256 `a30691f96d00ad6b781dd493f8ce10c81c1f4aadaff44e35f894b1987ec5574f`; Git blob `5dee30784ac0339b922c36b79d59548304d251ff`.

The final repository-only development gates are audit-policy unit **600/600 PASS**, portable **273/273 PASS**, installed-tree **1/1 PASS**, shared **687/687 PASS**, isolated readiness **150/150 PASS**, API **381/381 PASS**, web **834/834 PASS**, and full repository **2,776/2,776 PASS**. Lint and typecheck PASS. The readiness/activation handoff pins and final exact-six manifest remain mechanical work after this append.

PR #94 remains draft/HOLD. The `a721ff8` protected receipt remains historical diagnosis only. No protected rerun, acquisition, live diagnostic, simulator installation, production or runtime success, retry, stage, commit, push, ready, or merge is authorized or recorded by this entry.

## 2026-11-16 — PR #94 SIMCTL spawn diagnostic v1.3 listener-order supersession

This true-EOF append explicitly supersedes the pre-repair formatter-source record's statement that no behavior changed. Listener-before-lifecycle ordering was materially corrected in repository/test bytes, with an adversarial fixture covering the repaired ordering. The repair is count-stable: controller **412/412 PASS** and shared structure **100/100 PASS**.

Exact repaired source identities are:

- Controller: **137,977 bytes**; SHA-256 `f07d3ba75a73f725cdb91c5a95e75dd873ada708f3f7fd0480e78ff5974b3d92`; Git blob `3ba34cff3d7c82ef812fea08ed732a2056072ae3`.
- Controller test: **182,168 bytes**; SHA-256 `7e1bc745fc04e30f3de8a6351e034f7a8d9dbb436470b9cbf0a27065b1137eb6`; Git blob `525f1019e7b9a61c925ccb13fc805596f994f500`.
- Shared structure test: **80,884 bytes**; SHA-256 `b2867d64e06e8c6d2cf8f1ab1e98c9b28b93547e827fd9acd198ecef23b8e87a`; Git blob `64b92e92847efa448b3fa79f5926f823c0c71e2f`.

The existing bounded repository/test authority is unchanged; no broader authority is created. PR #94 remains draft/HOLD. The repair has no protected execution or recovery evidence and makes no acquisition, live diagnostic, simulator installation, production, runtime-success, retry, stage, commit, push, ready, or merge claim. Valentina must mechanically refresh activation, readiness, handoff, and final manifest pins after this append freezes.

## 2026-11-16 — PR #94 XCRUN identity diagnostic v1.4 record

Protected evidence from exact head `1c1464ea0d5807313802d269f82facef84f523d7`, run `43772642056`, artifact `14185291221`, remains historical diagnosis only. Its `receipt.json` is **1,449 bytes** with SHA-256 `10b92b3e820aed560a7563e44be3c49a605018b85d626b8e9e3ab23d27bf8775` and records `PRECONDITION_REJECTED` / `PRECONDITION_SIMCTL_FIND_EXECUTABLE_IDENTITY`, invocation count **0**, no acquisition or runtime action, and cleanup `NONE` / `NOT_REQUIRED`. Current iOS succeeded, minimum iOS failed, and the aggregate skipped; the overall protected rollup is **12 success / 1 failure / 1 skipped**. The executable-identity subtype is not provable from that receipt, and no recovery is claimed.

Catalina's `PR94-IOS-XCRUN-IDENTITY-DIAGNOSTIC-v1.4` architecture gate is **64/64 PASS**, and Natalia's security and privacy gate is **64/64 PASS**. Schema **2** adds no fields and exposes no raw identity. The exact closed executable-identity codes are:

1. `PRECONDITION_SIMCTL_FIND_EXECUTABLE_LSTAT`
2. `PRECONDITION_SIMCTL_FIND_EXECUTABLE_TYPE`
3. `PRECONDITION_SIMCTL_FIND_EXECUTABLE_OWNER`
4. `PRECONDITION_SIMCTL_FIND_EXECUTABLE_MODE`
5. `PRECONDITION_SIMCTL_FIND_EXECUTABLE_SIZE`
6. `PRECONDITION_SIMCTL_FIND_EXECUTABLE_REALPATH`
7. `PRECONDITION_SIMCTL_FIND_EXECUTABLE_OPEN`
8. `PRECONDITION_SIMCTL_FIND_EXECUTABLE_FSTAT`
9. `PRECONDITION_SIMCTL_FIND_EXECUTABLE_PRESPAWN_DRIFT`
10. `PRECONDITION_SIMCTL_FIND_EXECUTABLE_POSTSETTLEMENT_DRIFT`
11. `PRECONDITION_SIMCTL_FIND_EXECUTABLE_CLOSE`

The repository/test-only scope remains the same exact six paths: this handoff, the shared structure test, activation guard, readiness guard, controller, and controller test. Functional development evidence is controller **428/428 PASS**, shared structure **108/108 PASS**, and format, syntax, and diff integrity PASS.

Current frozen source facts before this append are:

- Controller: **142,239 bytes**; SHA-256 `bd5644f8a46b1dcd43fc9e3d60f006cc925bd037e3b0c1c2aa5cc2d34bebb58b`; Git blob `42121be695f8ef4d40238f787a74f7efbd30d027`.
- Controller test: **195,954 bytes**; SHA-256 `156ba96f7881f67e92fc11d9b73083545735aa8a304c14b3cd88308c1de01f76`; Git blob `462892e57f45359abfac992ef590518212921e8c`.
- Shared structure test: **88,985 bytes**; SHA-256 `ab8abbf2b8ee8c8073dcbee0ba3874babb77151594b51513e290b30fc1690b9e`; Git blob `1e73fc64a3fdce7088b5c981e21ecbfc5ad202c5`.

The v1.4 diagnostic remains unexecuted. At most one no-retry protected diagnostic execution may occur only after future mechanical pins and all applicable gates pass. PR #94 remains draft/HOLD. No protected recovery, acquisition, live diagnostic, simulator installation, production or runtime success, stage, commit, push, ready, or merge is authorized or recorded by this entry. Valentina must mechanically refresh activation, readiness, handoff, and final manifest pins after this append freezes.

## 2026-11-16 — PR #94 XCRUN identity diagnostic v1.4 architecture-label supersession

Catalina amended close precedence to Natalia as: **HOLD > first identity-stage failure > CLOSE (only when spawn was invoked and no earlier identity failure exists) > prior nonidentity result**. No close behavior change is required.

The sole label correction is that an initial named-to-held tuple mismatch is now `PRECONDITION_SIMCTL_FIND_EXECUTABLE_PRESPAWN_DRIFT`. `PRECONDITION_SIMCTL_FIND_EXECUTABLE_FSTAT` remains reserved for an `fstat` throw, malformed result, or invalid type. This correction changes no closed code, code cardinality, schema, authority, or execution boundary.

Current formatter-stable source identities are:

- Controller: **142,254 bytes**; SHA-256 `4186b07230826224bb29fa1b80abdce5d52968d65dae4492440459388d8fceb8`; Git blob `86c3ea50da2335d0f8fba0cd3ba860e93ef241b1`.
- Controller test: **195,972 bytes**; SHA-256 `e2458513c474be77d4169e1bd5d5689eb520c3a8572a65ada4a78080907c8983`; Git blob `b25c6e21553cfdb17ec81c42f198671bda90e164`.
- Shared structure test: **88,994 bytes**; SHA-256 `b36271e35ce8dc045ef0396b5c4a40919143fc012be770b311056c250b03b07a`; Git blob `7a898bccb29910cef2434c536659cafd37363bbd`.

Functional counts remain controller **428/428 PASS** and shared structure **108/108 PASS**; format, syntax, and diff integrity PASS. The v1.4 diagnostic remains unexecuted. PR #94 remains draft/HOLD, and no protected recovery, acquisition, live diagnostic, simulator installation, production or runtime success, stage, commit, push, ready, or merge is authorized or recorded by this entry. Valentina must mechanically refresh the downstream pins after this append freezes.

## 2026-11-16 — PR #94 XCRUN documented-interface diagnostic v1.5 record

Official-source provenance is bounded to Apple's documented interface. Technical Note TN2339, published in 2014 and updated in 2017, documents `xcrun` as the `/usr/bin` shim. Apple's current Configuring command-line tools settings documentation and Xcode command-line reference, observed **2026-11-16**, corroborate `xcrun` and `DEVELOPER_DIR`; TN3147 provides an example. This record makes no claim that a bundle-local executable is missing or forbidden.

Protected v1.4 evidence from exact head `d2ba16c09392289b66a7ba26f47ba2468b2e64ec`, run `43784914905`, artifact `14189594106`, remains historical diagnosis only. Its receipt is **1,446 bytes** with SHA-256 `3ad052f522cfa4b57d65546026bb28547792ba267a51eb0fefab062d2b8afb71`, records `PRECONDITION_SIMCTL_FIND_EXECUTABLE_LSTAT`, and has invocation count **0** with no acquisition or runtime action. The cause within that LSTAT stage remains unknown; no `ENOENT` conclusion or recovery claim is made.

The v1.5 repository/test contract binds exact executable path `/usr/bin/xcrun`, keeps `DEVELOPER_DIR` pinned, and uses mode `PR94-IOS-XCRUN-IDENTITY-DIAGNOSTIC-v1.5`. Catalina's architecture gate is **52/52 PASS**, Natalia's security and privacy gate is **52/52 PASS**, and Gabriela's provenance gate is **8/8 PASS**.

The scope remains exactly six paths: this handoff, the shared structure test, activation guard, readiness guard, controller, and controller test. Functional development evidence is controller **428/428 PASS** and shared structure **108/108 PASS**.

Current frozen source identities before this append are:

- Controller: **142,232 bytes**; SHA-256 `dbbd8a0064a5b19c4f22e224806360079985a650b66a7c63352b8da7cdd01d2b`; Git blob `d1b4458a562226781f6625117fee5e6b3781b0fa`.
- Controller test: **197,127 bytes**; SHA-256 `c89c3bb101ca9d1db479fa645d81e4f9cd69d92fdb8315422178b26b0fa56b2f`; Git blob `99db9ab58b1507515c540af5ca720605e66ef7c8`.
- Shared structure test: **89,528 bytes**; SHA-256 `b016da0ab08c3b7e3ad8f1323a29f40dd2fed4008c6d5b5f6f808e6add89aaac`; Git blob `e9230387656c1e05bee015030ea9de65ee8553c1`.

The v1.5 diagnostic remains unexecuted. PR #94 remains draft/HOLD. No protected recovery, acquisition, live diagnostic, simulator installation, production or runtime success, retry, stage, commit, push, ready, or merge is authorized or recorded by this entry. Valentina must mechanically refresh activation, readiness, handoff, and final manifest pins after this append freezes.

## 2026-11-16 — PR #94 XCRUN identity diagnostic v1.5 serialized-mode supersession

The v1.5 contract PR94-IOS-XCRUN-IDENTITY-DIAGNOSTIC-v1.5 binds receipt diagnosticMode PR94_IOS_XCODE_PRECONDITION_DIAGNOSTIC_V1_5.

This true-EOF append explicitly supersedes line 3457's use of the architecture label as the serialized mode. It changes no functional behavior, code, schema, authority, or evidence count. The v1.5 diagnostic remains unexecuted; PR #94 remains draft/HOLD; and no protected execution, recovery, acquisition, live diagnostic, simulator installation, production or runtime success, retry, stage, commit, push, ready, or merge is authorized or recorded.

## 2026-11-16 — PR #94 XCRUN identity diagnostic v1.5 protected-run record

Protected run `43797213642`, attempt **1**, executed on exact head `5817425e97e036c0855c8c00b7defbfa46bf5bdc`. The minimum job is `133068638703`. Artifact `14194787766` has a name containing the exact head and expires **2026-11-23**.

The extracted `receipt.json` is **1,441 bytes** with SHA-256 `73e93216d2e63baaf5b1fc79baed58b6e4ae23a422b694ed61025d3afa2300c8`. The uploaded artifact ZIP/log is **858 bytes** with ZIP SHA-256 `c638f99fa4aee1824540feaa683c73c0f8d5d447bd636b3eca47d7a595ff70e8`; this ZIP identity is distinct from the receipt identity.

The schema **2** receipt binds diagnostic mode `PR94_IOS_XCODE_PRECONDITION_DIAGNOSTIC_V1_5`, Xcode **16.2** build `16C5032a`, `PRECONDITION_REJECTED` with `READY`, cleanup `NONE` / `NOT_REQUIRED`, invocation count **0**, download `NOT_ATTEMPTED`, minimum `NOT_RUN`, runtime and disk evidence null or zero, and retained and fallback flags false. Invocation count **0** does not mean zero precondition subprocesses.

The protected rollup is **12 success / 1 intentional diagnostic failure / 1 aggregate skipped**. CI is **9/9 PASS**, both auth workflows are **2/2 PASS**, and current iOS PASS.

The diagnostic objective is achieved: held `/usr/bin/xcrun` identity validation and contained `simctl` discovery passed. This evidence establishes no acquisition, installed iOS 17.5 runtime, minimum-iOS execution, recovery, protected-green phase, or merge claim. PR #94 remains draft/HOLD, and the next activation contract is separately gated.

Minimum job 133068638703 ran 2026-11-16T03:16:47Z–03:16:57Z; its failing diagnostic step ran 03:16:50Z–03:16:54Z, and artifact 14194787766 was created at 03:16:55Z.

Exact-head outcome gates are Catalina 16/16 PASS, Natalia 24/24 PASS, and Renata 26/26 PASS.

## 2026-11-16 — PR #94 v1.5 receipt-code wording supersession

This true-EOF correction supersedes the earlier clause saying the receipt records `PRECONDITION_REJECTED` “with `READY`”. The exact corrected wording is: records state `PRECONDITION_REJECTED` with primary failure code `PRECONDITION_XCODE_DIAGNOSTIC_READY`.

## 2026-11-16 — PR #94 v1.5 records-topology repair

The frozen architecture is `PR94-V1.5-RECORDS-TOPOLOGY-v1`. On exact records commit `8982998958e0edb8c49d30c7c053efb88e1b88fb`, tree `3d43d750`, direct parent `5817425e`, and subject `docs(ci): record xcrun diagnostic outcome`, the shared postcommit suite passed **692/695**. The exactly three failures are mechanical records topology only: the activation current ten-path manifest, activation explicit direct-child topology, and readiness suffix pin. The records suite passed **108/108**. No functional or runtime defect was found.

The repair scope is exactly `docs/DEVELOPMENT_HANDOFF.md`, the activation test, and the readiness test. The future repair commit must be a direct child with exact subject `test(ci): bind xcrun diagnostic records topology`. Exact current source pins and the final manifest remain pending Valentina's mechanical frozen-byte handoff and will not be inferred here.

PR #94 remains draft/HOLD. This record makes no protected recovery, acquisition, runtime, ready, or merge claim and authorizes no stage, commit, push, protected execution, or external action.

## 2026-11-16 — PR94 iOS 17.5 runtime activation v1 — authorized design; execution pending

- Packet ID: `PR94-IOS17-RUNTIME-ACTIVATION-v1`.
- Authority: existing bounded Option A; exactly one Apple/Xcode-managed no-retry iOS 17.5 arm64 runtime acquisition after all repository gates; no broader network/runtime/production authority.
- Base: commit `71b8ef0ebe5c1ce3a3305606715f1cbee128c11d`, tree `d423980bfb098b798df15f90522eafa4b9f5208b`.
- Scope: exactly six mode-`100644` paths; workflow `3b1dc703dca499a5f365f4059ca0f40efdca63b4` and ios-ci `0b84abbd35ebc8e3ca28ec672ca513b288fec94b` are unchanged protected inputs.
- Behavior: removes diagnostic READY/mode authority; preserves pinned Xcode `/usr/bin/xcrun` identity boundary; enables exactly one `/Applications/Xcode_16.2.app/Contents/Developer/usr/bin/xcodebuild -downloadPlatform iOS -buildVersion 17.5 -architectureVariant arm64`; preserves finite disk/time/output bounds, strict runtime verification, cleanup, receipt privacy, and fail-closed HOLD semantics.
- Receipt rule: schema `2`; `diagnosticMode` is always null; invocation-`0` observed tuple is null; invocation-`1` observed tuple is exactly `16.2` / `16C5032a`.
- Candidate exact-six: rows `6`, source bytes `898780`, manifest bytes `749`, SHA-256 `50ae3efda136bacc846318c52485102208770305caa980914359a8a166e0ff2f`.
- Candidate exact-eight: rows `8`, source bytes `922667`, manifest bytes `940`, SHA-256 `1557b3f28751bc81655f7535d40be34f20f697bb289aae3d15ffcc63bcfe78a0`.
- Counts: controller `428`; structure `108`; activation `100`; readiness `8`; focused `644`; ledger `524`; audit `616`; portable `273`; installed-tree `1`; shared `695`; API `381`; web `834`; full `2800`.
- Status: `PRECONDITION_HOLD_NO_GET` remains for every action except the one gated Apple/Xcode acquisition above; PR stays draft/HOLD until protected minimum, current, and aggregate are green and receipt/cleanup evidence passes independent audit.

## 2026-11-16 — PR94 iOS 17.5 runtime activation v1 — reviewedCandidate manifest supersession

The earlier recorded reviewedCandidate exact-six SHA-256 `50ae3efda136bacc846318c52485102208770305caa980914359a8a166e0ff2f` and exact-eight SHA-256 `1557b3f28751bc81655f7535d40be34f20f697bb289aae3d15ffcc63bcfe78a0` are retired as non-authoritative. A later count-stable activation-pin correction changed the reviewed bytes, and the earlier recorded manifest byte counts **749** and **940** were noncanonical; the canonical manifest byte counts are **731** and **916**.

The immediately-pre-supersession authoritative external reviewedCandidate manifests are exact-six rows **6**, source bytes **900,730**, manifest bytes **731**, SHA-256 `37b416baa1e79170569253eb3992e029530878a46ef69fbf14019cc67ffc6477`; and exact-eight rows **8**, source bytes **924,617**, manifest bytes **916**, SHA-256 `ce25e60c02199ab67274ded21505fee2908bcb360526550fdf3c8fa0f005f6c4`. The corrected activation identity is **128,336 bytes**, SHA-256 `dc4a9558284b09a8bf847bc190d37a1728405afbf09643b903ac7cec9d6ce004`, Git blob `d99a762869c4268d3ea2bccee41738fb30813d91`.

These are external reviewedCandidate bindings, not a handoff self-hash. Final exact-six and exact-eight manifests must be mechanically re-pinned after this append. No other content, authority, runtime, stage, commit, or push is changed or authorized by this supersession.

## 2026-11-16 — PR94 iOS 17.5 runtime activation v1.0.1 runtime-privacy supersession

PR94-IOS17-RUNTIME-ACTIVATION-v1.0.1-RUNTIME-PRIVACY supersedes the earlier phrase “no runtime identifier retained after cleanup” with the stronger exact rule: no receipt ever serializes runtimeIdentifier; normalized version/build are retained iff postAcquireExactRuntimeCount is exactly one; runtimeRetained independently reports unproved or positive postcleanup cardinality. This changes no runtime cleanup authority, schema version, acquisition authority, command, retry, or protected input.

Exact current functional identities/evidence: controller **139,295 bytes**, SHA-256 `e63655a7380b2c7e180efe873f374f091801b278c6103b2f944f8aa728b520a9`, Git blob prefix `2f26b909`; controller test **202,352 bytes**, SHA-256 `51fd6bc035efd68c16b3e45f9b1da298c8df5c21cab4666373eac7ca8e110df7`, Git blob prefix `17bcd7c3`; shared structure test **91,410 bytes**, SHA-256 `2dda0b9805e89da33ad7f52b963f0959583c5ab40589b55e14eea48d0e677342`, Git blob prefix `ed061ea1`; activation pre-repin **128,336 bytes**, SHA-256 prefix `5b644609`, Git blob prefix `8ad6f6c4`. Current evidence is controller **428/428 PASS**, structure **108/108 PASS**, Prettier **PASS**, and Node syntax **PASS**. These are current functional and pre-repin identities only; final manifests are not inferred by this append.

## 2026-11-16 — PR94 iOS 17.5 runtime activation v1.0.1 receipt-construction correction

`PR94-IOS17-RUNTIME-ACTIVATION-v1.0.1-RUNTIME-PRIVACY` requires every receipt to serialize `runtimeIdentifier: null`. It retains normalized runtime evidence only when `postAcquireExactRuntimeCount === 1`, using the exact construction literals `runtimeVersion: postAcquireExactRuntimeCount === 1 ? "17.5" : null` and `runtimeBuild: postAcquireExactRuntimeCount === 1 ? "21F79" : null`.

This corrects the rejected optional-runtime construction that derived those fields from `runtime?.version` and `runtime?.build`. That derivation was not truthful for the closed `POST_RUNTIME_IDENTITY` and `POST_RUNTIME_STORAGE_VOLUME` failure paths: one exact iOS 17.5 / `21F79` row can already be counted while `validatePostInventory` throws before assigning its returned row to the internal `runtime` deletion-authority object. The corrected receipt therefore records the already normalized version/build evidence from the exact count while continuing to redact the runtime identifier. The internal identifier remains memory-only cleanup authority and is never serialized.

This correction changes no schema version, field order, acquisition command, invocation cardinality, retry policy, network authority, runtime cleanup authority, HOLD precedence, protected workflow, `ios-ci.sh`, dependency, timeout, disk ceiling, or production boundary. Counts remain controller **428**, structure **108**, activation **100**, readiness **8**, focused **644**, ledger **524**, audit **616**, portable **273**, installed-tree **1**, shared **695**, API **381**, web **834**, and full **2800**.

Final controller, controller-test, structure, activation, readiness, handoff, exact-six, and exact-eight identities remain pending the frozen-byte mechanical pin pass and must not be inferred by this append. PR #94 remains draft/HOLD. No runtime execution, acquisition, simulator installation, stage, commit, push, ready, merge, production, signing, store, spend, credential, or external-account action is performed or authorized by this record.

## 2026-11-18 — PR94 activation v1.0.1 canonical-manifest grammar supersession

This true-EOF append preserves the prior records as historical evidence and supersedes only their canonical-manifest labels. The previously recorded exact-six / exact-eight manifest byte counts **749 / 940** and **731 / 916**, together with every digest derived from either incomplete grammar, are retired as non-authoritative. The **731 / 916** form omitted the Git blob identity field. The **749 / 940** form is not produced by the repository’s authoritative canonicalizer. Neither form may be used for candidate, commit, receipt, readiness, or merge claims.

The authoritative canonical row grammar is exactly `${path}\0${byteCount}\0${sha256}\0${gitBlobSha1}\n`: UTF-8 repo-relative path; byte `0x00`; unsigned unpadded decimal file-byte count; byte `0x00`; lowercase full 64-hex SHA-256 of the file bytes; byte `0x00`; lowercase full 40-hex Git blob SHA-1 computed over `blob ${byteCount}\0` followed by the same file bytes; and byte `0x0a`. Rows contain no BOM or CR. Paths are ordered by unsigned UTF-8 byte order. This grammar is defined by `docs/2026-11-13_r4b_addtype_contract_self_test_activation_v1.md`, implemented by `canonicalManifest` / `canonicalManifestAt` in `packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts`, and enforced by the held-manifest implementation in `scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.mjs`.

The immediate-pre-append authoritative external exact-six order is `docs/DEVELOPMENT_HANDOFF.md`; `packages/shared/src/ios-foundation-structure.test.ts`; `packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts`; `packages/shared/src/sprint-6-r4b-addtype-postmain-readiness.test.ts`; `scripts/ios-runtime-bootstrap.mjs`; `scripts/ios-runtime-bootstrap.test.mjs`. It is rows **6**, source bytes **907,428**, manifest bytes **977**, SHA-256 `b5d66d6e406f697d392c9b715d8d22d40a84842d5a1f103528224378441b69ca`.

The immediate-pre-append authoritative external exact-eight order is `.github/workflows/ios.yml`; `docs/DEVELOPMENT_HANDOFF.md`; `packages/shared/src/ios-foundation-structure.test.ts`; `packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts`; `packages/shared/src/sprint-6-r4b-addtype-postmain-readiness.test.ts`; `scripts/ios-ci.sh`; `scripts/ios-runtime-bootstrap.mjs`; `scripts/ios-runtime-bootstrap.test.mjs`. It is rows **8**, source bytes **931,315**, manifest bytes **1,244**, SHA-256 `5a4481d3aabe8f54f894666e2891683a0b0daee80bcd4972e3d2e7af6518c49b`.

These values bind the bytes immediately before this append and are not a self-hash of the resulting handoff. Final post-append and post-pin exact-six and exact-eight identities remain pending, must be recomputed externally with the same four-field grammar after all mechanical handoff, activation, and readiness pins stabilize, and must not be embedded into a covered member.

This supersession changes no activation behavior, receipt schema, runtime privacy rule, acquisition command, invocation cardinality, retry policy, network authority, cleanup authority, HOLD precedence, timeout, disk ceiling, protected workflow, `ios-ci.sh`, dependency, test count, or production boundary. PR #94 remains draft/HOLD. No runtime execution, acquisition, simulator installation, stage, commit, push, ready, merge, production, signing, store, spend, credential, or external-account action is performed or authorized by this record.

## 2026-11-18 — PR94 activation v1.0.1 final pre-commit candidate evidence

This true-EOF candidate-evidence record preserves all prior history and is not a handoff self-hash. The worktreeConfig Option A repair completed successfully with abbreviated identity prefixes common `d20653ad…`, main `bc6c44e1…`, and backup `a56903f1…`; no residue or locks remain.

The final case07g fixture-reuse repair preserves the default **5 seconds**, case43 uses **30 seconds**, and the focused suite is **644/644 PASS**. Exactly one full session, `74180`, ran with no retry: audit **616** + portable **273** + installed-tree **1** + shared **695** + API **381** + web **834** = **2800/2800 PASS**.

Format, lint, typecheck, Node syntax, Bash syntax, Git porcelain, and diff are **PASS**. Shared and API builds are **PASS**. Web compile, typecheck, and static generation succeeded, but the local command exited **1** solely because of the CI-suppressed agent security nudge on pinned Next.js **16.4.2**. The protected Build remains authoritative; a separate dependency upgrade is outside this candidate.

The immediate-pre-append external four-field exact-six binding is rows **6**, source bytes **910,957**, manifest bytes **977**, SHA-256 `0e6747a28f2499a918eb1a2fb5917d9ec42183718e6d0e0887a11901b944938b`. The immediate-pre-append external four-field exact-eight binding is rows **8**, source bytes **934,844**, manifest bytes **1,244**, SHA-256 `566f8360bd111ad1c7aa675d847f9fbbe62ffda4e67212af6fec993c8c2704a2`. These values bind the bytes immediately before this append and are not a self-hash. Final post-append and post-pin exact-six and exact-eight identities remain pending, must be recomputed externally, and must not be inferred by this record.

PR #94 remains draft/HOLD. No runtime execution, acquisition, simulator installation, stage, commit, push, ready, merge, production, signing, store, spend, credential, or external-account action is performed or authorized by this record.

## 2026-11-18 — PR94 holistic activation-test timeout policy

This true-EOF records-only entry preserves all prior history, is not a handoff self-hash, and supersedes the prior final-candidate readiness only to the extent that Elana found the case38 timeout.

The exact holistic activation-test timeout policy is: case09 changes from **20 seconds** to **30 seconds**; cases11, 25, 33, and 44 add **30-second** timeouts; cases10, 38, and 43 remain **30 seconds**; case23 remains **90 seconds**; and case07g remains at the default **5 seconds**. There is no body, assertion, helper, constant, count, runtime, or authority change.

The recorded gates are policy **8/8 PASS**, activation **100/100 PASS**, readiness **8/8 PASS**, focused **644/644 PASS**, Prettier **PASS**, and diff **PASS**. The activation functional identity is **128,385 bytes**, SHA-256 `d46efb441ea49f4e75daae08d3852821e143704833b994d2c2be897ad20ecffc`, Git blob `df47bae80d2c9a3250acd21cf91a96d82cf7f398`.

The immediate-pre-append external four-field exact-six binding is rows **6**, source bytes **912,987**, manifest bytes **977**, SHA-256 `31a70e60684445205f655cf75f43ee853b9b0e921f01f184184352118623fda4`. The immediate-pre-append external four-field exact-eight binding is rows **8**, source bytes **936,874**, manifest bytes **1,244**, SHA-256 `04f0010a2bfc5e0d9a9c22d0af7d86958d876164a0616d3fed82e43f5491e389`. These values bind the bytes immediately before this append and are not a self-hash. Final post-append and post-pin exact-six and exact-eight identities remain pending, must be recomputed externally, and must not be inferred by this record.

PR #94 remains draft/HOLD. No runtime execution, acquisition, simulator installation, stage, commit, push, ready, merge, production, signing, store, spend, credential, or external-account action is performed or authorized by this record.
