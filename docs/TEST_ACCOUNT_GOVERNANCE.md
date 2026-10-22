# Test Account and Engineering Execution Governance

## Purpose

Authenticated development and QA checks use dedicated non-production identities. This keeps personal account
data out of engineering evidence and preserves independent QA separation.

## Local credential references

Credentials are stored only in the ignored `.env.agent-test-accounts.local` file. Repository documentation,
scripts, logs, pull requests, issues, chat, screenshots, and recordings may identify only these variable names:

- `FLUYO_TEST_ADRIANA_EMAIL`
- `FLUYO_TEST_ADRIANA_PASSWORD`
- `FLUYO_TEST_ELANA_EMAIL`
- `FLUYO_TEST_ELANA_PASSWORD`

Values must never be printed, logged, committed, pasted into chat, included in command output, or shared between
agents. Automated checks must load values directly from the ignored file and report only bounded success,
failure, and non-sensitive diagnostic status.

## Verification status

Both dedicated variable sets were verified through successful non-production Supabase password authentication on
2026-10-18. Verification evidence records only success and account-role separation; it does not store identity,
credential, token, cookie, or provider-response values.

## Account and session isolation

- Adriana uses only the dedicated Adriana account for authenticated development verification.
- Elana uses only the dedicated Elana account for independent QA and code review.
- Each account uses isolated browser profiles, cookies, local storage, and session state.
- Test data must remain non-production and must be recorded in the applicable handoff or audit without exposing
  identity, credential, token, billing, provider, correlation, or internal identifiers.
- Server-controlled billing and entitlement decisions remain authoritative. Account separation never permits
  client-selected billing state, price identifiers, ownership, or access.
- If a dedicated account is unavailable, its authenticated checks are blocked and reported. Do not use Marlon's
  account, another agent's account, or copied cookies or tokens as a fallback.
- Preserve unrelated account and database data. Clean up only synthetic records created by the documented test
  when cleanup is safe and part of that test's evidence.

## Independent QA boundary

Elana remains the independent QA and code-review owner. Engineering supplies the exact commit, pull request,
phase brief, acceptance criteria, repository paths, service URLs, known risks, and non-secret test setup. Elana
runs the counted exact-head audit with her separate account. A material failure or unattempted required scenario
keeps the increment open.

## Standing execution and merge rule

Marlon directly authorized Adriana on 2026-10-22 to mark ready and merge future Fluyo pull requests without a
new per-PR prompt only when the current exact head has Elana PASS with zero unresolved material defects, every
protected and phase-specific specialist/platform gate PASS, and GitHub reports clean/mergeable. Any head change
invalidates approval evidence and requires fresh gates. This standing merge approval excludes production,
signing, store, spending, destructive, external-account, credential actions, and material product decisions.
After merge, Adriana verifies every applicable post-main workflow and starts the next documented increment
automatically. An external approval system rejection pauses only the rejected merge and must be reported.

Engineering commits and pushes completed work and reconciles the pull request description, audit report, and
handoff before the final exact-head gate. After Elana reports PASS with every required scenario executed and all
required repository checks pass on that same head, engineering:

1. verifies that the reviewed head has not changed;
2. applies the standing authorized merge gate;
3. verifies all required checks on post-merge `main`; and
4. immediately begins the next documented phase or increment.

Any commit or push after the audit changes the exact head, invalidates the earlier gate evidence, and requires a
fresh Elana exact-head audit and all required checks before merge.

Engineering does not wait for another start instruction. Work pauses only for an explicit approval boundary
that has not already been delegated, missing secure access or secrets, an external account or spending action,
destructive or irreversible work, or a material product decision. If one workstream is blocked, every independent
authorized workstream continues.
