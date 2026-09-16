import type { BillingSubscriptionSummary } from "@fluyo/shared";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchBillingStatus } from "../../lib/billing-api";
import { getVerifiedWebIdentity } from "../../lib/supabase/identity";
import { ManageSubscriptionButton } from "./manage-subscription-button";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<BillingSubscriptionSummary["status"], string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Incomplete (expired)",
  paused: "Paused",
};

function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function renewalCopy(subscription: BillingSubscriptionSummary): string | null {
  if (subscription.cancelAtPeriodEnd) {
    const endsAt = formatDate(subscription.currentPeriodEnd);
    return endsAt ? `Access ends on ${endsAt}` : "Access ends at the end of the current period";
  }

  if (subscription.status === "trialing") {
    const trialEnd = formatDate(subscription.trialEnd);
    return trialEnd ? `Trial ends on ${trialEnd}` : null;
  }

  const renewsAt = formatDate(subscription.currentPeriodEnd);
  return renewsAt ? `Renews on ${renewsAt}` : null;
}

export default async function BillingPage() {
  const identity = await getVerifiedWebIdentity();

  if (!identity) {
    redirect("/login?error=authentication_required");
  }

  const statusResult = await fetchBillingStatus(identity.accessToken)
    .then((status) => ({ available: true, ...status }))
    .catch(() => ({ available: false, subscription: null, entitlements: [] }));

  return (
    <main className="min-h-screen bg-[#f7f1e7] px-6 py-12 text-[#15123a]">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between gap-4">
          <Link className="font-bold text-[#1726a5]" href="/account">
            &larr; Back to account
          </Link>
          <Link className="font-bold text-[#1726a5]" href="/pricing">
            Pricing
          </Link>
        </header>

        <section className="mt-8 rounded-3xl border border-[#15123a]/10 bg-white/80 p-7 shadow-[0_20px_60px_rgba(23,38,165,0.1)] sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ef4d4d]">
            Subscription status
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Your Fluyo plan</h1>

          {!statusResult.available ? (
            <p className="mt-5 text-sm text-red-800" role="alert">
              Subscription status is temporarily unavailable.
            </p>
          ) : statusResult.subscription ? (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-lg font-extrabold">
                  {statusResult.subscription.displayName}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${
                    statusResult.subscription.accessGranted
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {STATUS_LABELS[statusResult.subscription.status]}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#15123a]/65">
                {statusResult.subscription.billingInterval === "monthly"
                  ? "Billed monthly"
                  : "Billed annually"}
                {renewalCopy(statusResult.subscription)
                  ? ` · ${renewalCopy(statusResult.subscription)}`
                  : ""}
              </p>
              {!statusResult.subscription.accessGranted ? (
                <p className="mt-3 text-sm font-semibold text-amber-800" role="alert">
                  This plan does not currently grant access. Use the Stripe Customer Portal below to
                  resolve payment issues or restart a subscription.
                </p>
              ) : null}
              {statusResult.entitlements.length > 0 ? (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {statusResult.entitlements.map((entitlement) => (
                    <li
                      className="rounded-full border border-[#15123a]/15 bg-white px-3 py-1 font-mono text-xs text-[#15123a]/70"
                      key={entitlement.key}
                    >
                      {entitlement.key}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-sm leading-6 text-[#15123a]/65">
                You don&apos;t have an active Fluyo Plus subscription yet.
              </p>
              <Link
                className="mt-4 inline-block rounded-full bg-[#1726a5] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#101c80]"
                href="/pricing"
              >
                View plans
              </Link>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-[#15123a]/10 bg-white/80 p-7 shadow-[0_20px_60px_rgba(23,38,165,0.1)] sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ef4d4d]">
            Stripe Customer Portal
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Manage your subscription</h2>
          <p className="mt-4 leading-7 text-[#15123a]/65">
            Continue to Stripe&apos;s secure portal to manage billing. Fluyo does not collect card
            details or recreate Stripe&apos;s account-management screens.
          </p>

          <ul className="my-7 list-disc space-y-3 border-y border-[#15123a]/10 py-6 pl-5 text-sm font-semibold text-[#15123a]/70">
            <li>Update payment and billing information</li>
            <li>Download invoices</li>
            <li>Change or cancel a subscription when enabled in Stripe</li>
          </ul>

          <ManageSubscriptionButton />
          <p className="mt-4 text-center text-xs leading-5 text-[#15123a]/45">
            Users without an existing Stripe billing account must start with Checkout.
          </p>
        </section>
      </div>
    </main>
  );
}
