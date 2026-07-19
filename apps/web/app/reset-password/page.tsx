import { redirect } from "next/navigation";

import { getVerifiedWebIdentity } from "../../lib/supabase/identity";
import { updatePassword } from "../auth/actions";

export const dynamic = "force-dynamic";

interface ResetPasswordPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const identity = await getVerifiedWebIdentity();

  if (!identity) {
    redirect("/forgot-password?error=invalid_recovery");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <main className="min-h-screen bg-[#f7f1e7] px-6 py-12 text-[#15123a]">
      <section className="mx-auto max-w-lg rounded-3xl border border-[#15123a]/10 bg-white/80 p-7 shadow-[0_20px_60px_rgba(23,38,165,0.1)]">
        <h1 className="text-3xl font-black tracking-[-0.04em]">Choose a new password</h1>
        <p className="mt-3 text-sm leading-6 text-[#15123a]/65">
          Use between 8 and 128 characters. Completing the reset signs out the recovery session.
        </p>
        <form action={updatePassword} className="mt-6 space-y-4">
          <PasswordInput label="New password" name="password" />
          <PasswordInput label="Confirm password" name="passwordConfirmation" />
          <button
            className="w-full rounded-full bg-[#1726a5] px-5 py-3 text-sm font-bold text-white"
            type="submit"
          >
            Update password
          </button>
        </form>
        {error === "invalid_password" ? (
          <p className="mt-5 text-sm text-red-800">
            Passwords must match and contain 8–128 characters.
          </p>
        ) : null}
        {error === "update_failed" ? (
          <p className="mt-5 text-sm text-red-800">
            The password could not be updated. Request a new recovery link.
          </p>
        ) : null}
      </section>
    </main>
  );
}

function PasswordInput({ label, name }: { label: string; name: string }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        autoComplete="new-password"
        className="mt-2 w-full rounded-xl border border-[#15123a]/20 bg-white px-4 py-3 font-normal outline-none focus:border-[#1726a5]"
        maxLength={128}
        minLength={8}
        name={name}
        required
        type="password"
      />
    </label>
  );
}
