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
            Choose your flow
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
            Practice every day, without limits.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#15123a]/65">
            Start free, then upgrade through Stripe-hosted Checkout when you want the complete
            experience.
          </p>
        </section>

        {checkout === "cancelled" ? (
          <p className="mx-auto mt-8 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
            Checkout was cancelled. Nothing was charged.
          </p>
        ) : null}
        {checkout === "success" ? (
          <p className="mx-auto mt-8 max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-900">
            Stripe completed Checkout. Subscription access will be synchronized by the later webhook
            milestone.
          </p>
        ) : null}

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <section className="rounded-[2rem] border border-[#15123a]/10 bg-white/55 p-7 sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#15123a]/45">Free</p>
            <p className="mt-3 text-5xl font-black tracking-[-0.055em]">$0</p>
            <p className="mt-5 leading-7 text-[#15123a]/65">
              Build a daily Spanish habit with the essential Fluyo experience.
            </p>
            <ul className="mt-6 list-disc space-y-3 pl-5 text-sm font-semibold text-[#15123a]/70">
              <li>Core daily practice</li>
              <li>Basic review</li>
              <li>No payment method required</li>
            </ul>
            <Link
              className="mt-7 block rounded-full border border-[#15123a]/20 px-6 py-3 text-center text-sm font-bold text-[#15123a]/65"
              href="/account"
            >
              Continue free
            </Link>
          </section>
          <PricingCard />
        </div>
      </div>
    </main>
  );
}
