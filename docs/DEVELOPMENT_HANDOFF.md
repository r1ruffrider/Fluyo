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
