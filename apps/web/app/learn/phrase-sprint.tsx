"use client";

import { useState } from "react";

const progressCookie = "fluyo_phrase_sprint_step";

const prompts = [
  {
    scene: "You walk into a café and greet the barista.",
    question: "Which phrase means “Good morning”?",
    choices: ["Buenas noches", "Buenos días", "Hasta luego"],
    answer: "Buenos días",
    note: "¡Muy bien! Use buenos días from morning until around lunchtime.",
  },
  {
    scene: "You are ready to order a coffee.",
    question: "How do you politely say “I would like a coffee”?",
    choices: ["Quisiera un café", "Busco el café", "Tengo un café"],
    answer: "Quisiera un café",
    note: "Perfecto. Quisiera is a friendly, polite way to ask for something.",
  },
  {
    scene: "The barista hands you your drink.",
    question: "Finish with a warm “Thank you very much.”",
    choices: ["De nada", "Lo siento", "Muchas gracias"],
    answer: "Muchas gracias",
    note: "¡Lo lograste! You just completed a tiny café conversation.",
  },
] as const;

interface PhraseSprintProps {
  initialStep: number;
}

export function PhraseSprint({ initialStep }: PhraseSprintProps) {
  const [step, setStep] = useState(initialStep);
  const [selected, setSelected] = useState<string | null>(null);
  const completed = step === prompts.length;
  const prompt = prompts[step] ?? prompts[0];
  const correct = selected === prompt.answer;

  function chooseAnswer(choice: string) {
    setSelected(choice);
  }

  function continueSprint() {
    const nextStep = Math.min(step + 1, prompts.length);
    document.cookie = `${progressCookie}=${nextStep}; Path=/; Max-Age=2592000; SameSite=Lax`;
    setStep(nextStep);
    setSelected(null);
  }

  function restartSprint() {
    document.cookie = `${progressCookie}=0; Path=/; Max-Age=2592000; SameSite=Lax`;
    setStep(0);
    setSelected(null);
  }

  if (completed) {
    return (
      <div className="sprint-card completion-card">
        <div aria-hidden="true" className="completion-burst">
          <span>✦</span>
          <span>●</span>
          <span>◆</span>
          <span>✦</span>
          <span>●</span>
        </div>
        <span aria-hidden="true" className="completion-icon">
          ☕
        </span>
        <p className="eyebrow">Phrase sprint complete</p>
        <h2>¡Lo lograste!</h2>
        <p>You can now greet someone, order a coffee, and say thanks.</p>
        <blockquote lang="es">Buenos días. Quisiera un café. Muchas gracias.</blockquote>
        <div className="completion-actions">
          <button className="button button-cobalt" onClick={restartSprint} type="button">
            Practice again
          </button>
          <a className="button button-outline" href="/login">
            Create an account
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="sprint-card">
      <div className="progress-row">
        <span>
          Moment {step + 1} of {prompts.length}
        </span>
        <span>{Math.round((step / prompts.length) * 100)}% complete</span>
      </div>
      <div
        aria-label={`${step} of ${prompts.length} moments complete`}
        aria-valuemax={prompts.length}
        aria-valuemin={0}
        aria-valuenow={step}
        className="progress-track"
        role="progressbar"
      >
        <span style={{ width: `${(step / prompts.length) * 100}%` }} />
      </div>
      <div className="scene-card">
        <span aria-hidden="true">☕</span>
        <p>{prompt.scene}</p>
      </div>
      <fieldset className="choice-fieldset">
        <legend>{prompt.question}</legend>
        <div className="choice-list">
          {prompt.choices.map((choice) => {
            const isSelected = selected === choice;
            const state = isSelected ? (choice === prompt.answer ? "correct" : "incorrect") : "";

            return (
              <button
                className={`choice-button ${state}`}
                key={choice}
                lang="es"
                onClick={() => chooseAnswer(choice)}
                type="button"
              >
                <span>{choice}</span>
                <i aria-hidden="true">
                  {state === "correct" ? "✓" : state === "incorrect" ? "×" : "→"}
                </i>
              </button>
            );
          })}
        </div>
      </fieldset>
      <div aria-live="polite" className={`feedback-panel ${selected ? "is-visible" : ""}`}>
        {selected ? (
          <>
            <strong>{correct ? "That flows!" : "Almost — give it another go."}</strong>
            <p>
              {correct
                ? prompt.note
                : "Look for the phrase that fits this exact moment. You can try every option."}
            </p>
          </>
        ) : (
          <span>Choose an answer to continue.</span>
        )}
      </div>
      <button
        className="button button-cobalt sprint-continue"
        disabled={!correct}
        onClick={continueSprint}
        type="button"
      >
        {step === prompts.length - 1 ? "Finish sprint" : "Next moment"}
      </button>
    </div>
  );
}
