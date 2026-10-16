# Development and billing verification handoff

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
development default. [Draft PR #17](https://github.com/r1ruffrider/Fluyo/pull/17)
patches the critical shell-quote dependency; a separate high braces advisory remains
without a patched upstream release. [Draft PR #19](https://github.com/r1ruffrider/Fluyo/pull/19)
fixes scheduled-cancellation projection and the canceled date shown in billing.
[Draft PR #20](https://github.com/r1ruffrider/Fluyo/pull/20) corrects stale Checkout
return copy and links to the current billing status. All five PRs remain draft and unmerged.

Current local verification has 108 passing tests, with schema, lint, typecheck,
formatting, production build, and production-only audit passing. The eight required CI
jobs remain in place. Completed CI runs have seven passing jobs per PR; the full
dependency audit fails on the inherited advisory or advisories. Marlon confirmed that
`past_due` retains grace-period access under ADR 0003. Issue #12's conflicting wording
was corrected; the issue remains open until draft PR #19's UI fix is merged. Automatic
time-advanced renewal and a second-user ownership attempt remain unattempted.

Read-only audit reconciliation traced `braces@3.0.3` through
`eslint-config-next@16.3.8` → `@next/eslint-plugin-next` → `fast-glob` →
`micromatch`. The npm registry's latest `braces` release is still 3.0.3 and
the advisory covers that version. npm's offered path downgrades
`eslint-config-next` to 14.2.35, conflicting with pinned Next.js 16.3.8.
No dependency install, security-policy exception, or check bypass was made.

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
