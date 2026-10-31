# Duolingo public-evidence study

## Document control

| Field            | Value                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Status           | Proposed R0 evidence record; implementation remains zero                                               |
| Date             | 2026-10-31                                                                                             |
| Source commit    | `80563fee339a07bd2ab9706b8186ed772a3b9a1a`                                                             |
| Scope            | Official and publicly available evidence only                                                          |
| Owner            | Adriana Solano                                                                                         |
| Research         | Gabriela Mendoza                                                                                       |
| Related decision | [ADR 0007](../adr/0007-learning-experience-and-operational-boundaries.md)                              |
| Build plan       | [Sprint 6 learning-experience build plan](../2026-10-31_sprint-6-learning-experience-build-plan_v1.md) |

Gabriela rechecked the direct public URLs and titles on 2026-10-31. When a retrieved public page did not expose an exact publication or update date, the ledger records `not shown in retrieved page (UNKNOWN)`; search-result age estimates are not dates.

## Lawful method and limits

The study uses official public product, engineering, investor, status, and platform-store material. A controlled public-page replay retained evidence ID `ev_929eebe1b1d987c31030811d071ab83ac3563182a8c93c99853f193fce9359af`; it contains one record and nine recorded limitations and is not a native-app dossier.

The study did not:

- obtain or decompile an IPA, APK, executable, or proprietary source code;
- bypass DRM, authentication, access controls, rate limits, or platform protections;
- use a private account, inspect authenticated traffic, discover private APIs, or automate an account;
- extract or reuse Duolingo lesson text, screenshots, code, mascots, characters, illustrations, sounds, animations, or trade dress; or
- establish the internal behavior of Duolingo's native applications, backend, security controls, ranking models, experimentation systems, or release thresholds.

Every finding is labeled `OBSERVATION`, `INFERENCE`, or `UNKNOWN`:

- `OBSERVATION` is a narrow claim directly supported by a source row.
- `INFERENCE` is an original Fluyo design or engineering conclusion derived from observations.
- `UNKNOWN` records a question the public evidence does not answer.

## Source ledger

| ID      | Public source                                                            | URL                                                                              | Class                        | Published / updated                      | Accessed   | Scope limitation                                                                                   |
| ------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| SRC-001 | Duolingo, “How to Use Duolingo for Language Learning”                    | https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/      | Official product guide       | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Availability varies by course, platform, and experiment                                            |
| SRC-002 | Duolingo, “The Science Behind Duolingo's Home Screen Redesign”           | https://blog.duolingo.com/new-duolingo-home-screen-design/                       | Official product/learning    | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | No current algorithm detail or portable efficacy proof                                             |
| SRC-003 | Duolingo, “The Duolingo Practice Tab Is Free for Learners”               | https://blog.duolingo.com/guide-to-duolingo-practice-hub/                        | Official product             | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Does not prove universal course or web parity                                                      |
| SRC-004 | Duolingo, “The Duolingo Score Tracks Your Learning Progress”             | https://blog.duolingo.com/duolingo-score/                                        | Official product             | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Do not copy scoring or infer Fluyo proficiency                                                     |
| SRC-005 | Duolingo, “How To Add (or Remove) a Course From the Duolingo App”        | https://blog.duolingo.com/add-new-course/                                        | Official product             | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Does not establish reversible placement                                                            |
| SRC-006 | Duolingo, “Friends Quests Are Duolingo’s Newest Social Feature”          | https://blog.duolingo.com/friends-quests/                                        | Official product             | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Describes accountability, reminders, XP, and gem rewards; no transferable safety or efficacy proof |
| SRC-007 | Duolingo, “Friend Streak Is Duolingo’s Latest Social Feature”            | https://blog.duolingo.com/friend-streak/                                         | Official product             | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Describes friend-directed nudges/notifications; no moderation, minor-safety, or suitability proof  |
| SRC-008 | Duolingo, “How Duolingo Leaderboards and Leagues Work”                   | https://blog.duolingo.com/duolingo-leagues-leaderboards/                         | Official product             | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | No fairness, efficacy, or child-safety proof                                                       |
| SRC-009 | Duolingo, “Why Duolingo Switched From Hearts to a Battery”               | https://blog.duolingo.com/duolingo-energy/                                       | Official product/experiment  | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Rollout is time-sensitive; no Fluyo economy recommendation                                         |
| SRC-010 | Duolingo, “Is Duolingo Free for All Learners?”                           | https://blog.duolingo.com/is-duolingo-free/                                      | Official business/product    | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | No Fluyo monetization recommendation                                                               |
| SRC-011 | Duolingo, “Duolingo Max Uses OpenAI’s GPT-4 For New Learning Features”   | https://blog.duolingo.com/duolingo-max/                                          | Official product             | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Feature, version, and region availability is unstable                                              |
| SRC-012 | Duolingo, “11 Tips For Learning a Language With Hearing Impairment”      | https://blog.duolingo.com/learning-with-hearing-aids/                            | Official editorial guidance  | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Not an accessibility or assistive-technology audit                                                 |
| SRC-013 | Apple App Store, “Duolingo: Language Lessons”                            | https://apps.apple.com/us/app/duolingo-learn-languages/id570060128               | Official US platform listing | not shown in retrieved listing (UNKNOWN) | 2026-10-31 | Listing says iOS/iPadOS 17 and visionOS 1; does not prove runtime quality or all regions           |
| SRC-014 | Google Play, “Duolingo: Language Lessons”                                | https://play.google.com/store/apps/details?id=com.duolingo&hl=en                 | Official platform listing    | updated 2026-09-08                       | 2026-10-31 | Does not expose a verified minimum Android version or all-device support                           |
| SRC-015 | Duolingo homepage                                                        | https://www.duolingo.com/                                                        | Official product page        | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Web availability does not prove parity or offline coverage                                         |
| SRC-016 | Duolingo, “Improving Duolingo, One Experiment at a Time”                 | https://blog.duolingo.com/improving-duolingo-one-experiment-at-a-time/           | Official engineering/product | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Internal service, thresholds, and current rollout unavailable                                      |
| SRC-017 | Duolingo, “Dogfooding Culture at Duolingo”                               | https://blog.duolingo.com/dogfooding-app/                                        | Official engineering         | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | No internal threshold, SLO, or retention detail                                                    |
| SRC-018 | Duolingo, “How we reduced manual regression tests by 70% using AI tools” | https://blog.duolingo.com/reduced-regression-testing/                            | Official engineering         | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Company-reported workflow result, not a Fluyo target                                               |
| SRC-019 | Duolingo, “Duolingo's Android performance case study and DAU growth”     | https://blog.duolingo.com/android-app-performance/                               | Official engineering         | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Company-reported scoped figures, not a Fluyo target                                                |
| SRC-020 | Duolingo, “Frontend Prediction in Mobile Apps: Tradeoffs and Lessons”    | https://blog.duolingo.com/frontend-prediction/                                   | Official engineering         | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Public principles only; implementation is not copied                                               |
| SRC-021 | Duolingo Status                                                          | https://status.duolingo.com/                                                     | Official status page         | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Does not expose private SLOs or prove Fluyo reliability                                            |
| SRC-022 | Duolingo Inc., Form 10-K for fiscal year ended December 31, 2025         | https://investors.duolingo.com/static-files/f19d76fb-dee4-4f13-96ae-138ebfd0f2d3 | Official SEC filing          | filed 2026-02-27                         | 2026-10-31 | Forward-looking statements are not guarantees                                                      |
| SRC-023 | Duolingo, “Improving the streak”                                         | https://blog.duolingo.com/improving-the-streak/                                  | Official product/experiment  | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Company-reported figures lack complete transferable baselines                                      |
| SRC-024 | Duolingo, “Understanding Duolingo’s Time Spent Learning Well Metric”     | https://blog.duolingo.com/time-spent-learning-well/                              | Official product/measurement | not shown in retrieved page (UNKNOWN)    | 2026-10-31 | Proprietary proxy; do not copy its weight or universalize its threshold                            |

## Observation, inference, and unknown register

| ID      | Class       | Statement                                                                                                                                                                                                   | Sources                   | Confidence                                   | Fluyo implication                                                                                                                                                     | Prohibited claim                                                                                       |
| ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| OBS-001 | OBSERVATION | Duolingo's public guide describes motivation/goal setup, start-from-beginning or placement entry, a path of units, practice, XP, leagues, streaks, gems, friends, hearts, and paid tiers.                   | SRC-001                   | High for the public guide only               | Study abstract learning-loop principles, not its expression.                                                                                                          | Does not prove current availability, lesson timing, algorithms, offline coverage, or parity.           |
| OBS-002 | OBSERVATION | Duolingo publicly describes frontend prediction tradeoffs and reserves high-stakes values for backend authority.                                                                                            | SRC-020                   | High for the published article               | Preserve server-confirmed progress and treat any future local projection as pending and reversible.                                                                   | Does not authorize Fluyo offline writes or client-awarded progress.                                    |
| OBS-003 | OBSERVATION | Duolingo publicly describes gradual control/treatment experiments that can be monitored, paused, ramped, or shut down.                                                                                      | SRC-016                   | Medium                                       | Use narrow, typed, fail-closed optional controls with original Fluyo acceptance criteria.                                                                             | Does not prove current internal controls, signing, thresholds, or safety.                              |
| OBS-004 | OBSERVATION | Duolingo publicly describes dogfooding, crash/ANR/OOM/frame investigation, weekly release QA, and reviewed AI-assisted regression.                                                                          | SRC-017, SRC-018          | Medium                                       | Add original Fluyo fixtures, staged evidence, rollback drills, and independent QA.                                                                                    | Does not prove comprehensive coverage or transfer its reported workflow reduction.                     |
| OBS-005 | OBSERVATION | Duolingo publicly describes scoped Android performance investigations and staged improvements.                                                                                                              | SRC-019                   | Medium                                       | Measure Fluyo's own paths before setting any budget or performance claim.                                                                                             | Does not establish a transferable target, device matrix, or improvement.                               |
| OBS-006 | OBSERVATION | The official stores and homepage expose iOS, Android, and web surfaces, with store-specific ads, purchase, OS, and data-safety statements.                                                                  | SRC-013, SRC-014, SRC-015 | High for the observed listings               | Bind every future Fluyo platform claim to its own exact build and matrix.                                                                                             | Does not prove parity, accessibility, offline behavior, or all-device support.                         |
| OBS-007 | OBSERVATION | Duolingo publicly describes optional social quests, friend streaks, leagues, and opt-out or privacy controls at a product level.                                                                            | SRC-006, SRC-007, SRC-008 | Medium                                       | Keep any future Fluyo motivation optional, private by default, server-owned, and separately safety-reviewed.                                                          | Does not prove fairness, efficacy, moderation, or minor suitability.                                   |
| OBS-008 | OBSERVATION | The official filing describes business, risk, and cybersecurity context at a company-disclosure level.                                                                                                      | SRC-022                   | Medium                                       | Define Fluyo's own minimization, deletion, threat, and incident boundaries before collection.                                                                         | Does not prove runtime enforcement, audit effectiveness, or Fluyo compliance.                          |
| OBS-009 | OBSERVATION | The cited Friends Quests and Friend Streak pages publicly describe social-accountability prompts, friend-directed nudges/notifications, reminders, and rewards framed through shared progress, XP, or gems. | SRC-006, SRC-007          | Medium for the retrieved public descriptions | Treat peer-obligation reminders, nudges, and reward pressure as patterns to evaluate and reject, not reproduce.                                                       | Does not establish current rollout, frequency, user sentiment, causal effect, intent, or harm.         |
| INF-001 | INFERENCE   | Fluyo can offer a calm deterministic loop: new content, correction, review, and server-confirmed progress.                                                                                                  | OBS-001, OBS-002          | Proposed                                     | Preserve ADR 0005 authority; only `CONFIRMED` changes canonical progress.                                                                                             | Not an efficacy or retention claim.                                                                    |
| INF-002 | INFERENCE   | Mastery, social participation, and economy counters should remain separate.                                                                                                                                 | OBS-001                   | Proposed                                     | Keep R0–R4 free of economy and competitive mechanics.                                                                                                                 | Does not establish how Duolingo calculates any counter.                                                |
| INF-003 | INFERENCE   | Placement should be reversible and explainable if later approved.                                                                                                                                           | OBS-001                   | Proposed                                     | Omit placement until a separate accepted contract exists.                                                                                                             | The public source does not establish reversible placement or a learning benefit.                       |
| INF-004 | INFERENCE   | Recovery should preserve work and avoid punitive mistake gates or purchase pressure.                                                                                                                        | OBS-001, OBS-002          | Proposed                                     | Use supportive copy, bounded retry, idempotency, and stale-result fencing.                                                                                            | Not a comparison or superiority claim.                                                                 |
| INF-005 | INFERENCE   | Release controls should be independent, default-disabled, source-bound, and unable to change Learning Core authority.                                                                                       | OBS-003, OBS-004          | Proposed                                     | Add static, repository-owned controls only after R1 contracts pass.                                                                                                   | Not a claim that remote operations or crash reporting exist.                                           |
| INF-006 | INFERENCE   | Peer obligation, accountability/reminder pressure, and social reward/XP/gem pressure conflict with Fluyo's calm, safely reversible learning boundary.                                                       | OBS-007, OBS-009          | Proposed                                     | Any future social participation must be affirmative opt-in, cooperative-only, private by default, safely reversible, non-punitive, and free of notification pressure. | This is a Fluyo design constraint, not a claim about competitor intent, harm, prevalence, or efficacy. |
| UNK-001 | UNKNOWN     | Exact current lesson counts, timing, retry rules, ranking algorithms, ad cadence, paywall behavior, and Energy rollout.                                                                                     | —                         | Unknown                                      | Do not reproduce or claim them.                                                                                                                                       | No product inference is permitted.                                                                     |
| UNK-002 | UNKNOWN     | Current offline coverage and conflict behavior.                                                                                                                                                             | —                         | Unknown                                      | Fluyo R0–R4 stays read-only offline.                                                                                                                                  | No offline-learning claim.                                                                             |
| UNK-003 | UNKNOWN     | Complete accessibility support and parity across platforms, locales, devices, and assistive technologies.                                                                                                   | —                         | Unknown                                      | Test Fluyo's own 200% text, focus, semantics, contrast, RTL, and reduced motion.                                                                                      | No broad accessibility claim.                                                                          |
| UNK-004 | UNKNOWN     | Native storage, certificate pinning, anti-tamper, crash scrubbing, private API, key management, and exact SDK inventory.                                                                                    | —                         | Unknown                                      | Apply Natalia's independent threat model to Fluyo; do not infer competitor controls.                                                                                  | No native-security or backend-architecture claim.                                                      |
| UNK-005 | UNKNOWN     | Current crash, performance, release, experiment, and service-level thresholds.                                                                                                                              | —                         | Unknown                                      | Record exact Fluyo counts and measured observations only.                                                                                                             | No SLO, reliability, or performance claim.                                                             |
| UNK-006 | UNKNOWN     | Private personalization and spaced-practice algorithms.                                                                                                                                                     | —                         | Unknown                                      | Do not copy or claim an algorithm; define only independently accepted deterministic contracts.                                                                        | No personalization or spaced-repetition claim.                                                         |

## Original Fluyo adaptation boundary

The approved direction is Fluyo's original **Conversation Canvas**: paper, ink, cobalt, coral, sun, mint, a clipped lower-start corner, one calm reading order, and supportive state-specific feedback. It is not a reconstruction of another product's game board, characters, reward language, animation, or visual hierarchy.

The first possible learner flow is:

`setup → editable goal → start from beginning → prepare → answer → check → confirmed feedback → continue or finish → confirmed progress`

The flow remains a design contract, not implemented runtime. Placement, audio, notifications, social features, competition, economy, ads, purchases, experiments, child-specific behavior, offline writes, native learning, and downloadable content all require later decisions.

## Security, privacy, and reliability constraints

- The server exclusively owns identity, authorization, entitlements, catalog authority, attempts, progress, goals, streaks, rewards, social relationships, experiments, and deletion state.
- Every future mutation requires owner binding, authorization, idempotency, versioning, stale-response rejection, and an in-memory generation fence.
- Optional modules cannot award progress, expand access, or make Learning Core unavailable.
- Child or unknown cohorts default to the protective state: no social, public ranking, profiling, targeted advertising, purchase pressure, or notification pressure.
- Any future separately accepted social/retention feature must be affirmative opt-in, cooperative-only, private by default, safely reversible, and non-punitive. Fluyo rejects guilt/shame, peer-obligation reminders or nudges, threatened streak loss, learning gates, paid recovery, scarcity/loss-pressure economy, reward transfers, rankings, and notification pressure.
- Optional operational events use a closed schema and exclude identity, activity or lesson IDs, answer text, free text, email, tokens, URLs, provider data, device/install IDs, accessibility settings, correlation IDs, file paths, and raw stacks.
- Kill switches stop optional collection and processing, not only presentation.
- R0–R3 add no hosted analytics, crash vendor, remote flag service, credentials, external account, database migration, production action, signing, store action, or spending.

## UX and accessibility acceptance boundary

The future web surface must use one scroll surface, logical semantic groups, at least 44px targets, 16px form inputs, reachable actions at 200% text, named/value progress, one-time announcements, visible non-color focus/status, and bounded interruptible motion with a static reduced-motion equivalent.

Required terminal and recovery states are `PREPARING`, `ACTIVE`, `SUBMITTING`, `CONFIRMED`, `RETRYABLE_ERROR`, `STALE_CONTENT`, `SESSION_ENDED`, `ACCESS_BLOCKED`, `EMPTY_REVIEW`, and `OFFLINE_READ_ONLY`. Only `CONFIRMED` changes canonical progress. Late results after exit, authentication change, or content-version change cannot navigate or mutate state.

The future Break-UI catalog contains these 15 fixtures:

1. `long_localized_prompt_and_choices`
2. `rtl_mixed_script_activity`
3. `large_text_compact_landscape`
4. `one_character_and_multiline_answers`
5. `empty_activity_catalog`
6. `network_loss_during_submit`
7. `duplicate_submit`
8. `stale_content_version`
9. `late_confirmation_after_exit`
10. `authentication_expired`
11. `entitlement_blocked`
12. `offline_saved_material`
13. `corrupt_cache_recovery`
14. `protected_mode_unknown_cohort`
15. `missing_optional_explanation`

## Numerical claim register

Julieta independently reviewed the following `COMPANY-REPORTED` figures as non-transferable historical claims. The transferability verdict for every row is `DO NOT USE AS FLUYO TARGET/FORECAST`.

| Source  | Reported figure                 | Correct reading                                                            | Why Fluyo cannot reuse it                                                                   |
| ------- | ------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| SRC-018 | `70%`                           | `COMPANY-REPORTED` workflow result; methodology and baseline are `UNKNOWN` | `DO NOT USE AS FLUYO TARGET/FORECAST`; not a Fluyo quality, coverage, or efficiency target. |
| SRC-023 | `2.4×`                          | 140% higher relative, not percentage points                                | Baseline, cohort, confidence, and transferability are missing.                              |
| SRC-023 | `>40%` streak change            | Direction, denominator, and comparison window are ambiguous/rounded        | Company reporting is not a Fluyo forecast.                                                  |
| SRC-023 | `+3.3%` D14                     | Relative unless the source explicitly says points                          | Baseline is required.                                                                       |
| SRC-006 | `5.6×`                          | 460% higher relative                                                       | Self-selection and denominator prevent causal transfer.                                     |
| SRC-009 | `2×` beginner result            | 100% relative risk                                                         | Baseline, assignment, and confidence are required.                                          |
| SRC-024 | `+1.1M` and `+1.8M` minutes/day | Absolute totals with no user denominator                                   | They cannot be combined into a sequential `+64%` claim.                                     |
| SRC-024 | TSLW weight `0.5`               | Proprietary proxy setting                                                  | Do not copy the metric or weight.                                                           |
| SRC-024 | `15 minutes/day`                | A reported standard, not a universal learning rule                         | It is not a Fluyo default or efficacy target.                                               |
| SRC-019 | `39% → 8%`                      | −31 percentage points; about 79.5% relative reduction                      | Limited to the described entry-level Android work.                                          |
| SRC-019 | `91% → 94.7%`                   | +3.7 points; about 4.1% relative increase; failure reduction about 41.1%   | Limited to the described entry-level Android work.                                          |

The existing ADR 0005 range of 1–20 completed activities per day is an accepted repository rule, not evidence from this study and not an efficacy claim.

## Safe claim language

Before implementation, safe wording is limited to:

> Fluyo is studying public learning-product and engineering evidence to define an original, calm learning-session contract.

After exact R1–R4 evidence, claims may describe only the recorded behavior, such as one clear next activity, supportive feedback, and server-confirmed progress. The following remain forbidden without matching release evidence: Duolingo alternative, clone, or killer; science-backed or efficacy claims; retention or conversion forecasts; personalized or spaced-repetition claims; offline learning; reminder delivery; social features; broad accessibility; reliability or performance improvements; store availability; native parity; or public launch.

## Recheck triggers

Re-run the relevant specialist review when a source changes, a finding gains or loses provenance, a numerical claim is introduced, the R0–R4 scope changes, a hosted/vendor dependency is proposed, any collection or external call is added, a UI is implemented, or a public claim is drafted.

## Review ledger

The bounded responsibilities, evidence, and handoffs for all 13 factory agents are recorded in the [build plan](../2026-10-31_sprint-6-learning-experience-build-plan_v1.md). Elana Castillo remains the sole independent exact-head QA and code-review gate.
