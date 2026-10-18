**Phase:** Sprint 4 increment 7 — authenticated dashboard UI
**Brief:** Deliver a protected, responsive dashboard that reads and advances real owned learning progress through the existing authenticated API boundary.
**Tests conducted:** 240
**Passed:** 240
**Failed:** 0 outstanding in the completed automated, gate, and live-service checks
**Unattempted:** 12 browser-only scenarios blocked by the local-browser security gate

### What was tested

- 225 automated tests: six dependency-policy validator tests, four shared-contract tests, 194 API tests, and 21 web security/request-state tests.
- Protected dashboard authentication, verified-owner handoff, entitlement-filtered catalog and recent-progress queries, next-activity selection across all owned completion projections, stable recent ordering, empty/blocked/completed access states, safe telemetry outcomes, and Nest module resolution.
- Exact local return-path allowlist, rejection of absolute/protocol-relative/query-bearing return values, protected API headers, no-store dashboard reads, activity path/body/idempotency wiring, typed 401 handling, retry-key preservation, and new-answer key rotation.
- Seven local gates: dependency audit policy, Prisma schema, lint, typecheck, formatting, production build, and `git diff --check`.
- Eight live service checks: API health 200, database health 200/reachable, home page 200, unauthenticated learning API 401, streamed dashboard redirect marker, accepted `/dashboard` return field, rejected external return field, and rejected protocol-relative return field.
- Code review of the complete API, server-action, session-return, data-exposure, responsive CSS, documentation, and test changes.
- One clean-checkout package-resolution check: the first GitHub Tests job exposed a web-test dependency on a prebuilt shared-package artifact; the source alias fix then passed all 17 web tests with `packages/shared/dist` temporarily absent.

### Results

- The API returns the first accessible published activity that is absent from all currently accessible owned progress projections, plus at most five entitlement-filtered recent progress summaries.
- Recent progress does not disclose titles or activity IDs that are no longer accessible after an entitlement change.
- The server action re-verifies the Supabase session, validates bounded UUID/version/choice inputs, preserves an idempotency key for an ambiguous retry, rotates it for a new submitted answer, and refreshes the server-rendered aggregate only after a confirmed correct result.
- Billing status loads independently. A non-auth billing failure produces an honest unavailable state; a typed billing or learning 401 returns to sign-in.
- Next.js 16.3.8 built `/dashboard` as a dynamic route. The exact branch served successfully with Webpack on port 3000, the Nest API on port 4000, and the preserved PostgreSQL Compose volume reachable.
- No secret, answer key, entitlement source, owner ID, provider payload, or raw provider identifier was added to browser responses or telemetry.

### Bugs

| Severity   | Location                                  | Problem                                                                                                                                                | Action                                                                                                                                       |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Should fix | `learning-dashboard.service.ts`           | The first implementation owner-scoped recent progress but could show a protected lesson title or inaccessible next-activity ID after entitlement loss. | Fixed by engineering owner: applied entitlement filters to displayed progress and removed inaccessible activity IDs; regression test passes. |
| Should fix | `dashboard/activity-card.tsx`             | A changed answer after an ambiguous transport failure could reuse the previous payload's idempotency key and receive a conflict.                       | Fixed by engineering owner: preserve the key for the same retry and rotate it when a submitted answer changes; three state tests pass.       |
| Should fix | `dashboard/page.tsx` and `billing-api.ts` | Billing-side authentication expiry was indistinguishable from an ordinary optional billing outage.                                                     | Fixed by engineering owner: preserve HTTP status in a typed billing error and return a 401 to sign-in; web regression test passes.           |
| Must fix   | `apps/web` test configuration             | GitHub's clean checkout could not collect `learning-api.spec.ts` because `@fluyo/shared` resolved only through a locally prebuilt `dist` artifact.     | Fixed by engineering owner: added a Vitest source alias matching the API workspace; all 17 web tests pass with shared `dist` absent.         |
| Must fix   | `apps/web/app/globals.css`                | The 320/390-width rule hid both Account and the only dashboard Sign out control, blocking mobile account access and session exit.                      | Fixed by engineering owner: the mobile header now wraps and retains all three 44px navigation targets; browser re-audit pending.             |
| Must fix   | `apps/web/app/auth/actions.ts`            | A failed sign-in or sign-up discarded the safe dashboard return path, so the next successful attempt fell back to Account.                             | Fixed by engineering owner: every auth error keeps the allowlisted encoded path; four action-level regression tests pass.                    |
| Must fix   | `dashboard/activity-card.tsx`             | Changing a choice during a pending request could retain that request's key and cause a conflict on the next submission.                                | Fixed by engineering owner: a synchronous ref tracks the submitted choice independently; pending-change regression passes.                   |

### Unattempted browser matrix

- Authenticated first-use, ready, incorrect, confirmed-correct, completed-today, entitlement-blocked, partial-billing-failure, and total-learning-failure screens in a real browser session.
- Reload and sign-out/sign-in persistence through the visible application.
- Visual overflow/layout checks at 320, 390, 768, and 1440 CSS pixels.
- Keyboard order, visible focus, accessible names/live regions, and reduced-motion behavior in a browser.
- Browser console and network cleanliness during the full activity loop.

The Codex in-app browser security policy refused agent observation of the localhost tab. HTTP/runtime checks continued without accessing or extracting browser cookies. No alternate browser-control or cookie-extraction workaround was used.

### Verdict

- **FAIL** — automated, code, build, and service checks pass, but the phase is not cleared until Adriana completes the required authenticated browser, responsive, accessibility, persistence, and console matrix on the exact PR head.
