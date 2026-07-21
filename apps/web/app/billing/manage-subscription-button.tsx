"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { openCustomerPortal, type PortalActionState } from "./actions";

const INITIAL_STATE: PortalActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full rounded-full bg-[#1726a5] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#101c80] disabled:cursor-wait disabled:opacity-65"
      disabled={pending}
      type="submit"
    >
      {pending ? "Opening Stripe Portal..." : "Manage Subscription"}
    </button>
  );
}

export function ManageSubscriptionButton() {
  const [state, action] = useActionState(openCustomerPortal, INITIAL_STATE);

  return (
    <div>
      <form action={action}>
        <SubmitButton />
      </form>
      {state.error ? (
        <p
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
