import Link from "next/link";

import { signIn, signUp } from "../auth/actions";

const errorMessages: Record<string, string> = {
  authentication_required: "Sign in to continue.",
  invalid_callback: "The authentication link is invalid or expired.",
  invalid_credentials: "The email or password is incorrect.",
  invalid_input: "Enter a valid email and a password between 8 and 128 characters.",
  signup_failed: "The account could not be created. Try again later.",
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorKey = typeof params.error === "string" ? params.error : "";
  const messageKey = typeof params.message === "string" ? params.message : "";
  const error = errorMessages[errorKey];

  return (
    <main className="min-h-screen bg-[#f7f1e7] px-6 py-12 text-[#15123a]">
      <div className="mx-auto max-w-4xl">
        <Link className="font-bold text-[#1726a5]" href="/">
          &larr; Back to Fluyo
        </Link>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <AuthCard action={signIn} submitLabel="Sign in" title="Welcome back" />
          <AuthCard action={signUp} submitLabel="Create account" title="Start flowing" />
        </div>
        {error ? (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {messageKey === "check_email" ? (
          <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Check your email to confirm the account, then return to sign in.
          </p>
        ) : null}
        {messageKey === "password_updated" ? (
          <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Your password was updated. Sign in with the new password.
          </p>
        ) : null}
        <p className="mt-6 text-center text-sm">
          <Link className="font-bold text-[#1726a5]" href="/forgot-password">
            Forgot your password?
          </Link>
        </p>
      </div>
    </main>
  );
}

interface AuthCardProps {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  title: string;
}

function AuthCard({ action, submitLabel, title }: AuthCardProps) {
  return (
    <section className="rounded-3xl border border-[#15123a]/10 bg-white/80 p-7 shadow-[0_20px_60px_rgba(23,38,165,0.1)]">
      <h1 className="text-2xl font-black tracking-[-0.03em]">{title}</h1>
      <form action={action} className="mt-6 space-y-4">
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
        <label className="block text-sm font-bold">
          Password
          <input
            autoComplete={submitLabel === "Sign in" ? "current-password" : "new-password"}
            className="mt-2 w-full rounded-xl border border-[#15123a]/20 bg-white px-4 py-3 font-normal outline-none focus:border-[#1726a5]"
            maxLength={128}
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
        <button
          className="w-full rounded-full bg-[#1726a5] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#101c80]"
          type="submit"
        >
          {submitLabel}
        </button>
      </form>
    </section>
  );
}
