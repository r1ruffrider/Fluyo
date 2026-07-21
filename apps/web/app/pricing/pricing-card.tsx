"use client";

import type { BillingInterval } from "@fluyo/shared";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { startCheckout, type CheckoutActionState } from "./actions";

const INITIAL_STATE: CheckoutActionState = { error: null };

function CheckoutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-7 w-full rounded-full bg-[#1726a5] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#101c80] disabled:cursor-wait disabled:opacity-65"
      disabled={pending}
      type="submit"
    >
      {pending ? "Opening secure checkout..." : "Upgrade with Stripe"}
    </button>
  );
}

export function PricingCard() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [state, action] = useActionState(startCheckout, INITIAL_STATE);
  const annual = interval === "annual";

  return (
    <section className="rounded-[2rem] border border-[#1726a5]/15 bg-white p-7 shadow-[0_24px_80px_rgba(23,38,165,0.13)] sm:p-9">
      <div
        aria-label="Billing interval"
        className="grid grid-cols-2 rounded-full bg-[#f1ecdf] p-1"
        role="group"
      >
        {(["monthly", "annual"] as const).map((value) => (
          <button
            aria-pressed={interval === value}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              interval === value ? "bg-white text-[#1726a5] shadow-sm" : "text-[#15123a]/55"
            }`}
            key={value}
            onClick={() => setInterval(value)}
            type="button"
          >
            {value === "monthly" ? "Monthly" : "Annual - save 38%"}
          </button>
        ))}
      </div>

      <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[#ef4d4d]">
        Fluyo Plus
      </p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-5xl font-black tracking-[-0.055em]">
          {annual ? "$95.88" : "$12.99"}
        </span>
        <span className="pb-1 text-sm text-[#15123a]/55">/{annual ? "year" : "month"}</span>
      </div>
      {annual ? (
        <p className="mt-2 text-sm font-bold text-emerald-700">Equivalent to $7.99 per month</p>
      ) : null}
      <p className="mt-5 leading-7 text-[#15123a]/65">
        Unlimited daily practice, full review tools, offline packs, and the complete Fluyo learning
        experience.
      </p>
      <ul className="mt-6 list-disc space-y-3 pl-5 text-sm font-semibold text-[#15123a]/75">
        <li>Unlimited lessons and Charla practice</li>
        <li>Full grammar and spaced-repetition review</li>
        <li>Offline packs and camera translation</li>
        <li>Promotion codes accepted in secure Checkout</li>
      </ul>

      <form action={action}>
        <input name="interval" type="hidden" value={interval} />
        <CheckoutButton />
      </form>
      {state.error ? (
        <p
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <p className="mt-4 text-center text-xs leading-5 text-[#15123a]/45">
        Stripe securely handles payment details. Fluyo never receives your card number.
      </p>
    </section>
  );
}
