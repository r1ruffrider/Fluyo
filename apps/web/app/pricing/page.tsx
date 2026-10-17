import Link from "next/link";

import { PricingCard } from "./pricing-card";

interface PricingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams;
  const checkout = typeof params.checkout === "string" ? params.checkout : "";

  return (
    <main className="min-h-screen bg-[#f7f1e7] px-6 py-10 text-[#15123a] sm:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link className="text-2xl font-black tracking-[-0.04em] text-[#1726a5]" href="/">
            flu<span className="text-[#ef4d4d]">yo</span>
          </Link>
          <Link className="text-sm font-bold text-[#1726a5]" href="/account">
            Account
          </Link>
        </header>

        <section className="mx-auto mt-14 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ef4d4d]">
            Billing preview
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
            Explore Fluyo&apos;s test-mode plans.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#15123a]/65">
            The current build uses Stripe test mode to demonstrate Checkout and verified billing
            status. Paid learning features are still on the product roadmap.
          </p>
        </section>

        {checkout === "cancelled" ? (
          <p className="mx-auto mt-8 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
            Checkout was cancelled. Nothing was charged.
          </p>
        ) : null}
        {checkout === "success" ? (
          <p className="mx-auto mt-8 max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-900">
            Stripe completed Checkout. Signed webhooks update billing status; this redirect does not
            grant product access.
          </p>
        ) : null}

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <section className="rounded-[2rem] border border-[#15123a]/10 bg-white/55 p-7 sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#15123a]/45">Free</p>
            <p className="mt-3 text-5xl font-black tracking-[-0.055em]">$0</p>
            <p className="mt-5 leading-7 text-[#15123a]/65">
              Explore the working product preview without starting a test subscription.
            </p>
            <ul className="mt-6 list-disc space-y-3 pl-5 text-sm font-semibold text-[#15123a]/70">
              <li>Three-step café phrase sprint</li>
              <li>Account and profile foundation</li>
              <li>No payment method required</li>
            </ul>
            <Link
              className="mt-7 block rounded-full border border-[#15123a]/20 px-6 py-3 text-center text-sm font-bold text-[#15123a]/65"
              href="/account"
            >
              Open my account
            </Link>
          </section>
          <PricingCard />
        </div>
      </div>
    </main>
  );
}
