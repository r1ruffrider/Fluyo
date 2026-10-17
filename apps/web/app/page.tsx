import Image from "next/image";
import Link from "next/link";

import { fetchHealth } from "../lib/api-client";
import { getVerifiedWebIdentity } from "../lib/supabase/identity";
import { signOut } from "./auth/actions";

export const dynamic = "force-dynamic";

async function getBackendStatus(): Promise<boolean> {
  try {
    return (await fetchHealth()).status === "ok";
  } catch {
    return false;
  }
}

async function getCurrentIdentity(): Promise<{ email: string | null; id: string } | null> {
  try {
    return await getVerifiedWebIdentity();
  } catch {
    return null;
  }
}

const moments = [
  {
    accent: "coral",
    eyebrow: "At the café",
    phrase: "¿Me trae un café, por favor?",
    translation: "Could you bring me a coffee, please?",
    icon: "☕",
  },
  {
    accent: "sun",
    eyebrow: "On the move",
    phrase: "¿Dónde está la estación?",
    translation: "Where is the station?",
    icon: "🚌",
  },
  {
    accent: "mint",
    eyebrow: "With new friends",
    phrase: "¡Qué gusto conocerte!",
    translation: "It’s great to meet you!",
    icon: "👋",
  },
] as const;

export default async function HomePage() {
  const [backendAvailable, identity] = await Promise.all([
    getBackendStatus(),
    getCurrentIdentity(),
  ]);

  return (
    <main className="site-shell">
      <header className="site-nav">
        <div className="site-wrap nav-inner">
          <Link aria-label="Fluyo home" className="wordmark" href="/">
            flu<span>yo</span>
          </Link>
          <nav aria-label="Primary navigation" className="nav-links">
            <a href="#moments">Practice</a>
            <a href="#how-it-works">How it works</a>
            <Link href="/pricing">Pricing</Link>
          </nav>
          <div className="nav-actions">
            {identity ? (
              <>
                <Link className="nav-account" href="/account">
                  My account
                </Link>
                <form action={signOut}>
                  <button className="nav-signout" type="submit">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link className="nav-account" href="/login">
                Sign in
              </Link>
            )}
            <Link className="button button-small button-sun" href="/learn">
              Try a phrase sprint
            </Link>
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div aria-hidden="true" className="hero-orb hero-orb-one" />
        <div aria-hidden="true" className="hero-orb hero-orb-two" />
        <div className="site-wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-light">A playful Spanish practice preview</p>
            <h1>
              Spanish for the moments that <em>matter.</em>
            </h1>
            <p className="hero-lede">
              Build the courage to speak with quick, real-world phrase sprints. Practice a tiny
              conversation, get friendly feedback, and leave with something useful to say.
            </p>
            <div className="hero-actions">
              <Link className="button button-sun" href="/learn">
                Try the 2-minute preview <span aria-hidden="true">→</span>
              </Link>
              <a className="button button-ghost" href="#how-it-works">
                See how it flows
              </a>
            </div>
            <ul aria-label="Preview details" className="hero-notes">
              <li>No card required</li>
              <li>Works on phone or desktop</li>
              <li>Progress stays in this browser</li>
            </ul>
          </div>

          <div className="hero-visual">
            <Image
              alt="Two friends sharing Spanish and English phrases in colorful speech bubbles"
              className="hero-illustration"
              height={700}
              priority
              src="/fluyo-conversation.svg"
              width={760}
            />
            <div className="floating-phrase floating-phrase-one">
              <span>Today&apos;s tiny win</span>
              <strong>¡Hola! Mucho gusto.</strong>
            </div>
            <div className="floating-phrase floating-phrase-two" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <span>speaking</span>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="paper-wave" />
      </section>

      <section className="content-section" id="moments">
        <div className="site-wrap">
          <div className="section-heading">
            <p className="eyebrow">Pick a moment, not a textbook chapter</p>
            <h2>Learn the Spanish you want to use next.</h2>
            <p>
              These sample moments show the direction of Fluyo&apos;s conversation-first experience.
              Start with the café sprint and see the learning loop in action.
            </p>
          </div>
          <div className="moment-grid">
            {moments.map((moment, index) => (
              <article className={`moment-card moment-${moment.accent}`} key={moment.eyebrow}>
                <div className="moment-topline">
                  <span aria-hidden="true" className="moment-icon">
                    {moment.icon}
                  </span>
                  <span>0{index + 1}</span>
                </div>
                <p>{moment.eyebrow}</p>
                <h3 lang="es">{moment.phrase}</h3>
                <span>{moment.translation}</span>
                <Link aria-label={`Practice ${moment.eyebrow}`} href="/learn">
                  Practice this moment <span aria-hidden="true">↗</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="loop-section" id="how-it-works">
        <div className="site-wrap loop-grid">
          <div className="loop-copy">
            <p className="eyebrow eyebrow-light">The Fluyo loop</p>
            <h2>Small steps. Real words. More courage.</h2>
            <p>
              The current local preview demonstrates a simple three-step phrase sprint. It does not
              yet include speech scoring, an adaptive course, or saved cross-device progress.
            </p>
            <Link className="text-link-light" href="/learn">
              Open the working preview <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ol className="loop-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Meet the moment</strong>
                <p>Start with a situation you can picture yourself in.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Choose your Spanish</strong>
                <p>Try an answer and get immediate, low-pressure feedback.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Carry a phrase with you</strong>
                <p>Finish with a useful phrase and a clear sense of progress.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="content-section roadmap-section">
        <div className="site-wrap roadmap-grid">
          <div className="roadmap-card available-card">
            <p className="eyebrow">Ready to explore locally</p>
            <h2>A real preview, clearly labeled.</h2>
            <ul>
              <li>Interactive café phrase sprint</li>
              <li>Account creation and profile</li>
              <li>Test-mode subscription flow</li>
              <li>Responsive web experience</li>
            </ul>
          </div>
          <div className="roadmap-card building-card">
            <p className="eyebrow">On the product roadmap</p>
            <h2>Where Fluyo flows next.</h2>
            <ul>
              <li>Structured lessons and saved learning progress</li>
              <li>Speaking and pronunciation feedback</li>
              <li>Adaptive practice and conversation tools</li>
              <li>Native iOS and Android applications</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div aria-hidden="true" className="cta-spark cta-spark-left">
          ✦
        </div>
        <div className="site-wrap final-cta-inner">
          <p className="eyebrow">¿Listo para empezar?</p>
          <h2>One tiny conversation starts here.</h2>
          <p>Try the working lesson preview, then create an account when you&apos;re ready.</p>
          <div className="hero-actions final-actions">
            <Link className="button button-ink" href="/learn">
              Start the phrase sprint
            </Link>
            {identity ? (
              <Link className="button button-paper" href="/account">
                Go to my account
              </Link>
            ) : (
              <Link className="button button-paper" href="/login">
                Create an account
              </Link>
            )}
          </div>
        </div>
        <div aria-hidden="true" className="cta-spark cta-spark-right">
          ●
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-wrap footer-inner">
          <Link aria-label="Fluyo home" className="wordmark" href="/">
            flu<span>yo</span>
          </Link>
          <p>Conversation-first Spanish, taking shape one useful phrase at a time.</p>
          <span className={`service-chip ${backendAvailable ? "is-online" : "is-offline"}`}>
            <i aria-hidden="true" />
            Local API {backendAvailable ? "connected" : "offline"}
          </span>
        </div>
      </footer>
    </main>
  );
}
