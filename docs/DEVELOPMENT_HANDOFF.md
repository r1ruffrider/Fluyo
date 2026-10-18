# Development and billing verification handoff

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

The increment 7 local gate passes 221 tests (six policy, four shared, 194 API, and 17 web), lint,
typecheck, Prisma validation through the preserved root environment, formatting, the exact audit
policy, production build, and diff integrity. Eight live HTTP/service assertions pass. The browser
security gate refused agent observation of the localhost tab, so the preliminary review remains FAIL
until Adriana completes the authenticated activity, reload/sign-in persistence, 320/390/768/1440,
keyboard/focus/reduced-motion, and browser-console matrix on the exact PR head. No browser cookies or
database rows were extracted or changed to bypass that gate.

Draft PR #32 initially passed seven of eight required jobs. Tests run `39086066850` exposed a clean-
checkout-only package-resolution defect: the web Vitest suite found `@fluyo/shared` locally only
because `packages/shared/dist` already existed. `apps/web/vitest.config.ts` now aliases the shared
workspace source, matching the API test configuration. All 17 web tests pass with the shared `dist`
directory temporarily absent, and the complete 225-test local gate remains green. The replacement
exact-head GitHub run is pending; PR #32 remains draft and Adriana retains the phase gate.

Adriana's responsive code audit also found that the first mobile rule hid Account and the only Sign
out control at 320/390 widths. The header now wraps onto a second navigation row and preserves
Account, Billing, and Sign out as 44px targets. Her exact-head browser re-audit remains required.

The same audit found two state defects. Auth errors now preserve the allowlisted encoded `next` path,
with four action-level regression tests. Activity attempts now track the last submitted choice in a
synchronous ref, so a choice changed while the previous request is pending rotates the idempotency key
before the next submission. The same-choice retry still retains its key after an ambiguous failure.

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
