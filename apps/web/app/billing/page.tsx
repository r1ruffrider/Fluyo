import Link from "next/link";
import { redirect } from "next/navigation";

import { getVerifiedWebIdentity } from "../../lib/supabase/identity";
import { ManageSubscriptionButton } from "./manage-subscription-button";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const identity = await getVerifiedWebIdentity();

  if (!identity) {
    redirect("/login?error=authentication_required");
  }

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
            Stripe Customer Portal
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Manage your subscription</h1>
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
