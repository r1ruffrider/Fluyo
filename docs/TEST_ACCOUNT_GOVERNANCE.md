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

## Immediate escalation and no-idle rule — 2026-10-23

Whenever work reaches a boundary requiring Marlon's explicit approval, secure access or a secret, an external-account or spending action, a destructive or irreversible action, or a material product decision, Adriana notifies Marlon immediately through the Codex app. The notice states the exact requested action, the reason, the affected pull request or phase, and the safe work already completed. It contains no credential or secret.

All independent authorized workstreams continue while approval or access is pending. After a pull request satisfies the standing exact-head gate, Adriana marks it ready, merges it, verifies every applicable post-main workflow, and advances automatically under the existing authorization.

At the start of every current and future phase, Adriana reconciles the complete current agent roster, including newly added agents, and assigns every relevant specialist a bounded responsibility, evidence requirement, and handoff. A newly available specialist is not omitted because an earlier plan predates that role. Adriana remains the orchestration and merge owner, and Elana remains the sole independent exact-head QA and code-review gate. When names or roles are not yet exposed, the phase records that gap and reconciles it as soon as the authoritative roster becomes available; it does not invent an assignment.

Elana PASS on the current exact head is the execution trigger. Adriana immediately reconciles every remaining protected, specialist, and platform gate plus GitHub mergeability. If all standing exact-head conditions pass, Adriana marks the pull request ready, merges under the standing authorization, verifies every post-main workflow, updates the handoff and status, and starts the next authorized phase, pull request, or build-plan step without waiting for another user instruction. If another gate fails, engineering repairs it and obtains a fresh Elana exact-head PASS. If the next step crosses an undelegated approval boundary, Adriana notifies Marlon immediately and continues every independent safe workstream.

Adriana and the roster reconcile every authorized completed-PR handoff and next-phase start immediately and resume or dispatch safe work without avoidable delay. A 1-hour idle period is a hard process breach, not a permitted wait, polling interval, or grace period. App or email notification is escalation only and never substitutes for required approval. Elana remains the sole independent exact-head QA and code-review gate.

## Clickable approval and decision requests — 2026-10-30

Whenever Marlon must approve an action or choose a material product, security, release, store, signing, spending,
credential, external-account, or destructive-work decision, the request must be presented through the Codex app's
native clickable selection controls. The request must:

1. present mutually exclusive choices whenever possible;
2. put the recommended choice first and label it `Recommended`;
3. state the consequence or tradeoff of every choice;
4. keep the exact requested authority bounded to the affected phase or action; and
5. use the exact button selection as the approval or decision record.

Explanatory prose may precede the choices, but it cannot be the only actionable approval path. Secrets,
credentials, tokens, signing material, and private account identifiers must never appear in a button label or
prompt. If app-native controls are unavailable, the request must say so explicitly and use concise numbered
choice codes as the fallback. Routine status updates and work already covered by standing delegation do not need
selection controls.

## Append-only native-auth phase authority

After Catalina architecture, Natalia security, Renata environment and CI, every relevant domain specialist, protected CI, and Elana exact-head PASS last all pass against the same frozen subject commit and bundle, Adriana may approve and merge a credential-free, repository-only, non-production native-auth phase under the recorded delegation. Adriana cannot accept any of the fourteen material native-auth decisions. Production, credentials or secrets, signing, store or release, spend, destructive or data actions, external accounts or dashboards, domains, physical devices, and publication remain gated to Marlon.

The operative authority is the content-addressed [approval-history ledger](../contracts/mobile/auth-readiness/v1/approval-history/index.json). Its read-only `pull_request_target` control plane executes only exact base validator bytes and treats candidate files as bounded data. Revocation and review supersession require new records; concurrent writers rebase onto the latest validated chain. Latest-review-wins folding makes an earlier attestation stale and removes any dependent phase approval from current effective state; recovery requires fresh PASS gates and a new approval. Every review and phase record binds the same separate frozen subject commit `T`, which must already be an ancestor of the pull-request base; the later ledger append commit `L` cannot self-reference. Repository records prove integrity and declared authority after recording, not cryptographic human nonrepudiation.
