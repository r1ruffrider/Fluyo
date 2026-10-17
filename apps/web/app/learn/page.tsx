import Link from "next/link";
import { cookies } from "next/headers";

import { PhraseSprint } from "./phrase-sprint";

export const metadata = {
  title: "Café Phrase Sprint | Fluyo",
  description: "Try a short, interactive Spanish phrase practice preview.",
};

const progressCookie = "fluyo_phrase_sprint_step";

export default async function LearnPage() {
  const cookieStore = await cookies();
  const parsedStep = Number(cookieStore.get(progressCookie)?.value ?? "0");
  const initialStep =
    Number.isInteger(parsedStep) && parsedStep >= 0 && parsedStep <= 3 ? parsedStep : 0;

  return (
    <main className="lesson-shell">
      <header className="lesson-nav site-wrap">
        <Link aria-label="Back to Fluyo home" className="wordmark" href="/">
          flu<span>yo</span>
        </Link>
        <Link className="lesson-exit" href="/">
          Exit preview
        </Link>
      </header>
      <div className="lesson-backdrop" aria-hidden="true">
        <span>hola</span>
        <span>café</span>
        <span>gracias</span>
      </div>
      <section className="lesson-stage">
        <div className="lesson-intro">
          <p className="eyebrow">2-minute phrase sprint · Preview</p>
          <h1>Your first café chat.</h1>
          <p>
            Three quick choices. One phrase you can actually use. Your preview progress stays in
            this browser until you choose to practice again.
          </p>
        </div>
        <PhraseSprint initialStep={initialStep} />
      </section>
    </main>
  );
}
