import Link from "next/link";

import { requestPasswordReset } from "../auth/actions";

interface ForgotPasswordPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";

  return (
    <main className="min-h-screen bg-[#f7f1e7] px-6 py-12 text-[#15123a]">
      <section className="mx-auto max-w-lg rounded-3xl border border-[#15123a]/10 bg-white/80 p-7 shadow-[0_20px_60px_rgba(23,38,165,0.1)]">
        <Link className="font-bold text-[#1726a5]" href="/login">
          &larr; Back to sign in
        </Link>
        <h1 className="mt-8 text-3xl font-black tracking-[-0.04em]">Reset your password</h1>
        <p className="mt-3 text-sm leading-6 text-[#15123a]/65">
          Enter your email. If an account exists, Supabase will send a secure recovery link.
        </p>
        <form action={requestPasswordReset} className="mt-6 space-y-4">
          <label className="block text-sm font-bold">
            Email
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-[#15123a]/20 bg-white px-4 py-3 font-normal outline-none focus:border-[#1726a5]"
              maxLength={254}
              name="email"
              required
              type="email"
            />
          </label>
          <button
            className="w-full rounded-full bg-[#1726a5] px-5 py-3 text-sm font-bold text-white"
            type="submit"
          >
            Send recovery link
          </button>
        </form>
        {error === "invalid_email" ? (
          <p className="mt-5 text-sm text-red-800">Enter a valid email address.</p>
        ) : null}
        {error === "invalid_recovery" ? (
          <p className="mt-5 text-sm text-red-800">The recovery session is invalid or expired.</p>
        ) : null}
        {message === "check_email" ? (
          <p className="mt-5 text-sm text-emerald-800">
            If an account exists, a recovery link has been sent.
          </p>
        ) : null}
      </section>
    </main>
  );
}
