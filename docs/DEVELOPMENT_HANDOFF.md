# Development and billing verification handoff

## Scope and reconciliation — 2026-10-16

Work is limited to reliable local startup and [issue #12](https://github.com/r1ruffrider/Fluyo/issues/12).
No later sprint, production billing, deployment, or merge is authorized.

- Remote main remains `7cb59328812c64274af8ffdfb44e66b1c6a4b947`; no open PRs at initial reconciliation.
- Local main is one commit ahead: `3864bd1` adds only `.claude/launch.json`. It remains on local main.
- Both existing stashes were preserved. No credentials, database rows, or Docker volumes were deleted.
- Work branches start from remote main so the unrelated local commit is excluded.
- GitHub CI run `37067759148` passed on remote main. Branch protection still requires the eight
  original jobs, with strict checks and administrator enforcement. This is historical CI evidence,
  not proof that a fresh audit passes today.

## Startup findings and recovery

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

## Verification results

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

## Issue #12 lifecycle matrix

All rows below remain **blocked / unattempted** until a valid local Stripe test key and an
authenticated non-production Fluyo session are available. No real Checkout, subscription mutation,
or signed provider delivery has been claimed.

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

Issue #12's “past_due / no-access” wording conflicts with accepted ADR 0003: `past_due`, `active`,
and `trialing` grant access under the shared policy. Verify `past_due` grace access separately from
no-access states; do not change that policy without a product decision and the required ADR process.

Code inspection also found that the current billing page uses renewal wording for an immediately
canceled subscription and does not receive `canceledAt` in its summary contract. This is an
unverified UI acceptance gap to reproduce during authenticated lifecycle testing, not a passed check.

## Resume securely

Replace only `STRIPE_SECRET_KEY` in ignored root `.env` with a valid test-mode key for the account
holding the configured monthly and annual prices. Never paste the key into chat, logs, or a PR.
Sign in through `http://localhost:3000/login` in the available browser; no password is required in chat.
Recheck the test key and both prices before making test-mode mutations, then establish the signed
listener and compare its secret in memory without printing either value. Root `.env.local` is not
the source for `npm run dev`.
