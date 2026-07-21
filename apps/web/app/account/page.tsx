import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchCurrentProfile } from "../../lib/profile-api";
import { getVerifiedWebIdentity } from "../../lib/supabase/identity";
import { signOut } from "../auth/actions";
import { saveProfile } from "./actions";

export const dynamic = "force-dynamic";

interface AccountPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const identity = await getVerifiedWebIdentity();

  if (!identity) {
    redirect("/login?error=authentication_required");
  }

  const profileResult = await fetchCurrentProfile(identity.accessToken)
    .then((profile) => ({ available: true, profile }))
    .catch(() => ({ available: false, profile: null }));
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";

  return (
    <main className="min-h-screen bg-[#f7f1e7] px-6 py-12 text-[#15123a]">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between gap-4">
          <Link className="font-bold text-[#1726a5]" href="/">
            &larr; Back to Fluyo
          </Link>
          <div className="flex items-center gap-4">
            <Link className="font-bold text-[#1726a5]" href="/pricing">
              Pricing
            </Link>
            <form action={signOut}>
              <button className="font-bold text-[#1726a5]" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <section className="mt-8 rounded-3xl border border-[#15123a]/10 bg-white/80 p-7 shadow-[0_20px_60px_rgba(23,38,165,0.1)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ef4d4d]">
            Protected route
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Your Fluyo profile</h1>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="font-bold text-[#15123a]/55">Email</dt>
              <dd className="mt-1 break-all">{identity.email ?? "Not provided"}</dd>
            </div>
            <div>
              <dt className="font-bold text-[#15123a]/55">Identity ID</dt>
              <dd className="mt-1 break-all font-mono text-xs">{identity.id}</dd>
            </div>
          </dl>
          <form action={saveProfile} className="mt-8 space-y-4 border-t border-[#15123a]/10 pt-6">
            <label className="block text-sm font-bold">
              Display name
              <input
                className="mt-2 w-full rounded-xl border border-[#15123a]/20 bg-white px-4 py-3 font-normal outline-none focus:border-[#1726a5]"
                defaultValue={profileResult.profile?.displayName ?? ""}
                maxLength={80}
                name="displayName"
                placeholder="How should Fluyo address you?"
                type="text"
              />
            </label>
            <button
              className="rounded-full bg-[#1726a5] px-6 py-3 text-sm font-bold text-white"
              type="submit"
            >
              Save profile
            </button>
          </form>
          {!profileResult.available || error === "profile_unavailable" ? (
            <p className="mt-5 text-sm text-red-800">
              The profile service is temporarily unavailable.
            </p>
          ) : null}
          {error === "invalid_profile" ? (
            <p className="mt-5 text-sm text-red-800">
              The display name must be 80 characters or fewer.
            </p>
          ) : null}
          {message === "profile_saved" ? (
            <p className="mt-5 text-sm text-emerald-800">Profile saved.</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
