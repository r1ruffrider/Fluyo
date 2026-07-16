import Link from "next/link";

import { apiBaseUrl, fetchHealth } from "../lib/api-client";

export const dynamic = "force-dynamic";

async function getBackendStatus(): Promise<{ available: boolean; detail: string }> {
  try {
    const health = await fetchHealth();

    return {
      available: health.status === "ok",
      detail: `${health.service} responded successfully`,
    };
  } catch {
    return {
      available: false,
      detail: "The API is not reachable from the web server",
    };
  }
}

export default async function HomePage() {
  const backend = await getBackendStatus();

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f1e7] text-[#15123a]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between border-b border-[#15123a]/15 pb-6">
          <span className="text-2xl font-black tracking-[-0.04em] text-[#1726a5]">
            flu<span className="text-[#ef4d4d]">yo</span>
          </span>
          <span className="rounded-full border border-[#1726a5]/20 bg-white/60 px-3 py-1 font-mono text-xs uppercase tracking-[0.16em] text-[#1726a5]">
            Platform foundation
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.35fr_0.65fr] lg:py-24">
          <div>
            <p className="mb-5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#ef4d4d]">
              Spanish that flows both ways
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.96] tracking-[-0.055em] sm:text-7xl">
              The foundation for conversations that flow.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#15123a]/70">
              Sprint 1 establishes Fluyo&apos;s web, API, shared types, and local data platform.
              Product experiences arrive in later sprints.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-[#1726a5] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#101c80]"
                href="https://github.com/r1ruffrider/Fluyo/blob/main/landing/index.html"
              >
                View landing page source
              </Link>
              <Link
                className="rounded-full border border-[#15123a]/20 bg-white/60 px-6 py-3 text-sm font-bold transition hover:border-[#1726a5]/50 hover:bg-white"
                href="https://github.com/r1ruffrider/Fluyo/tree/main/docs"
              >
                Read project documentation
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-[#15123a]/10 bg-white/75 p-6 shadow-[0_24px_80px_rgba(23,38,165,0.12)] backdrop-blur">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#15123a]/50">
              System status
            </p>
            <div className="mt-6 flex items-start gap-4">
              <span
                aria-hidden="true"
                className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                  backend.available
                    ? "bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]"
                    : "bg-amber-500 shadow-[0_0_0_6px_rgba(245,158,11,0.12)]"
                }`}
              />
              <div>
                <h2 className="text-lg font-extrabold">
                  Backend {backend.available ? "available" : "unavailable"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#15123a]/60">{backend.detail}</p>
              </div>
            </div>
            <dl className="mt-7 border-t border-[#15123a]/10 pt-5">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#15123a]/45">
                  Health endpoint
                </dt>
                <dd className="mt-2 break-all font-mono text-xs text-[#1726a5]">
                  {apiBaseUrl}/health
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        <footer className="border-t border-[#15123a]/15 pt-6 text-sm text-[#15123a]/50">
          Fluyo Platform · Sprint 1
        </footer>
      </div>
    </main>
  );
}
