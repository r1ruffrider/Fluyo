# Stripe test-mode billing verification — 2026-10-16

Scope: [issue #12](https://github.com/r1ruffrider/Fluyo/issues/12), using one authenticated
Supabase user, Fluyo's `/pricing` Checkout action and `/billing` page, the existing local PostgreSQL
volume, and Stripe test mode only. No secret or Portal session URL is recorded here.

## Environment and delivery

- The configured monthly and annual Prices were read successfully with an `sk_test_` key; both are
  active, recurring, and `livemode: false`. `BILLING_ENABLED=true`.
- PostgreSQL was healthy. The API started on port 4000. Next.js 16.3.8 Turbopack started but the
  first `/billing` request panicked in its CSS worker (HTTP 500). Development with `--webpack`
  returned HTTP 200 and rendered the authenticated billing page; see draft PR #18.
- Stripe CLI 1.53.1 was obtained from Stripe's official release and its SHA-256 checksum verified.
  The test listener's signing secret exactly matched ignored local `.env`; it forwarded snapshot
  events to `http://localhost:4000/api/v1/billing/webhooks/stripe`. Relevant deliveries returned
  HTTP 200. The server's `constructEvent` accepted Stripe's actual signed deliveries.

## Observed lifecycle

| Check                  | Result          | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free baseline          | Pass            | Authenticated `/billing` showed no subscription; local billing customer, subscription, entitlement, and event tables were empty.                                                                                                                                                                                                                                                                                                                                                                                             |
| Checkout and ownership | Pass            | `/pricing` opened Stripe-hosted sandbox Checkout for the configured monthly Price. After a successful test-card payment, signed `checkout.session.completed`, `customer.subscription.created`, and `invoice.paid` deliveries created one Customer mapping and one ACTIVE monthly subscription for the authenticated user's UUID. No client-supplied Customer or Price decided ownership.                                                                                                                                     |
| Active projection      | Pass            | Six Stripe entitlements were ACTIVE. `/billing` displayed Fluyo Plus, ACTIVE, the monthly renewal date, and all six keys. A redirect alone was not used as proof of access.                                                                                                                                                                                                                                                                                                                                                  |
| Trialing               | Pass            | Updating that test subscription's `trial_end` produced a signed `customer.subscription.updated` event. The DB stored TRIALING and the trial-end date; `/billing` showed TRIAL and the date, with six active entitlements.                                                                                                                                                                                                                                                                                                    |
| Payment failure        | Pass (ADR 0003) | Stripe's official decline-after-attaching test PaymentMethod and ending the trial produced `invoice.payment_failed` and `customer.subscription.updated`. The DB and UI showed PAST DUE. All six entitlements remained active, as required by ADR 0003. Marlon confirmed on October 16 that grace-period access is the intended behavior.                                                                                                                                                                                     |
| Recovery               | Pass            | Restoring the original working test PaymentMethod and paying the open test invoice produced signed `invoice.paid` and subscription-update events. The DB and UI returned to ACTIVE. This was an invoice retry after trial end, not a time-advanced monthly renewal.                                                                                                                                                                                                                                                          |
| Customer Portal        | Pass            | The authenticated `/billing` action opened the correct test Customer Portal subscription. Portal cancellation scheduled access to end at the current period end. Stripe set `cancel_at` to that date while leaving `cancel_at_period_end=false`; Fluyo initially said “Renews on.” This PR projects that observed Stripe combination as period-end cancellation; fresh signed events made `/billing` show “Access ends on Nov 16, 2026.”                                                                                     |
| Final cancellation     | Pass            | Immediately canceling the same test subscription produced signed `customer.subscription.deleted`. The DB stored CANCELED and all six Stripe entitlements became CANCELED. `/billing` showed CANCELED, the actual cancellation date, a no-access warning, and no active entitlement list. This PR adds the cancellation date to the status response and display.                                                                                                                                                              |
| Replay and signature   | Pass            | Replaying the real Checkout event ID with a fresh valid local signature returned HTTP 200 with `duplicate: true`; event, subscription, and entitlement row counts did not change. Tampering with the signed body returned HTTP 400 with no row changes. The first delivery itself was Stripe-signed through the CLI listener.                                                                                                                                                                                                |
| Annual and promotion   | Pass            | A second authenticated `/pricing` Checkout selected the configured annual Price. Stripe Checkout accepted a one-use 25% test promotion; the paid USD invoice had a $95.88 subtotal and $71.91 total. The completed Checkout Session, Stripe Customer, subscription metadata, local Customer mapping, annual Price, and user UUID matched. Signed Checkout and subscription-created events were in the local webhook ledger. `/billing` showed ACTIVE, billed annually, renewal on Oct 16, 2027, and six active entitlements. |
| Ownership rejection    | Pass (unit)     | Focused processor tests now prove that a webhook transaction rolls back before subscription or entitlement writes when subscription metadata conflicts with the mapped Customer owner or when an already-mapped user is presented with a second Stripe Customer. The real Checkout path positively verified the matching ownership case.                                                                                                                                                                                     |
| Automatic renewal      | Blocked         | The authenticated user already has a mapped Stripe Customer with no test clock. Stripe test clocks can be attached to new Customers and quotes, not retrofitted onto that existing Customer. A clock-based renewal would require replacing preserved ownership data or bypassing the authenticated Checkout flow, so it was not attempted.                                                                                                                                                                                   |
| Cross-account Checkout | Blocked         | Only one confirmed non-production Supabase session was available. Creating or impersonating a second confirmed identity would require additional identity access. Positive real ownership and both negative ownership guards were verified without weakening that boundary.                                                                                                                                                                                                                                                  |

Customer ownership was confirmed positively by matching Stripe subscription metadata, its Customer,
the local Customer/subscription mapping, and the existing profile UUID. No Stripe entitlements
belonged to another local user. The annual test promotion was redeemed once and became inactive
under its one-use limit. Stripe documents that test clocks attach to
[new Customers and quotes](https://docs.stripe.com/api/test_clocks/create), which is why the
existing authenticated Customer could not be time-advanced without changing the preserved mapping.
The Stripe Customer Portal's period-end cancellation and immediate test-mode cancellation were
exercised; no production billing was touched.

Both test subscriptions were left CANCELED with no active Stripe entitlements. After the annual
Checkout check, immediate test-mode cancellation produced a signed update, the annual database
projection became CANCELED, its six entitlements became CANCELED, and `/billing` showed the
annual cancellation date and no-access warning. The existing database volume, local credentials,
stashes, and unrelated working-tree files were preserved.

The accepted grace policy is status-based: `past_due` retains access while Stripe continues to
report that status. Fluyo has no separate fixed-duration grace timer; signed webhook updates
revoke the Stripe-sourced entitlements when the subscription becomes a no-access status.

## Repository checks and follow-up

The local suite passed 110 tests, lint, typecheck, Prisma validation, production build, formatting,
and a production-only audit with zero findings. The eight required CI jobs remain enabled. The
full dependency audit on this PR fails on the inherited `braces` high-severity chain and critical
`shell-quote` advisory. Draft PR #17 patches `shell-quote` separately, leaving the unpatched
`braces` chain without weakening policy. Marlon confirmed that `past_due` keeps grace-period access
under ADR 0003. Issue #12's conflicting no-access wording was corrected; the real PAST DUE UI and
entitlement behavior passed that accepted policy. Do not treat this report as approval for
production billing or deployment.

The real annual Checkout return exposed stale pricing-page copy about a “later webhook milestone.”
Draft PR #20 replaces it with a link to the current `/billing` status, without treating a return
URL as proof of access.
