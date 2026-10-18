"use client";

import type { PublishedActivity } from "@fluyo/shared";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { submitDashboardAttempt } from "./actions";
import {
  initialAttemptState,
  isCorrectResultForActivity,
  shouldRotateAttemptKey,
} from "./attempt-state";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="button button-cobalt dashboard-submit"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Saving your answer…" : "Check my answer"}
    </button>
  );
}

export function ActivityCard({
  activity,
  initialIdempotencyKey,
}: {
  activity: PublishedActivity;
  initialIdempotencyKey: string;
}) {
  const [state, formAction] = useActionState(submitDashboardAttempt, initialAttemptState);
  const [selectedChoiceId, setSelectedChoiceId] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(initialIdempotencyKey);
  const submittedChoiceId = useRef<string | null>(null);

  function chooseAnswer(choiceId: string) {
    if (shouldRotateAttemptKey(submittedChoiceId.current, choiceId)) {
      setIdempotencyKey(crypto.randomUUID());
    }
    setSelectedChoiceId(choiceId);
  }

  return (
    <form
      action={formAction}
      className="dashboard-activity-card"
      onSubmit={() => {
        submittedChoiceId.current = selectedChoiceId;
      }}
    >
      <input name="activityId" type="hidden" value={activity.id} />
      <input name="contentVersion" type="hidden" value={activity.contentVersion} />
      <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
      <div className="dashboard-card-topline">
        <span>Next tiny win</span>
        <span aria-hidden="true">✦</span>
      </div>
      <fieldset className="dashboard-choice-fieldset">
        <legend>{activity.prompt}</legend>
        <div className="dashboard-choice-list">
          {activity.choices.map((choice) => (
            <label className="dashboard-choice" key={choice.id}>
              <input
                checked={selectedChoiceId === choice.id}
                name="selectedChoiceId"
                onChange={() => chooseAnswer(choice.id)}
                type="radio"
                value={choice.id}
              />
              <span lang="es">{choice.label}</span>
              <i aria-hidden="true">→</i>
            </label>
          ))}
        </div>
      </fieldset>
      <div aria-live="polite" className="dashboard-feedback">
        {state.error ? (
          <p className="dashboard-error" role="alert">
            {state.error}
          </p>
        ) : state.activityId === activity.id &&
          state.result &&
          state.selectedChoiceId === selectedChoiceId ? (
          <p className={state.result === "correct" ? "dashboard-success" : "dashboard-error"}>
            <strong>
              {state.result === "correct" ? "That flows!" : "Almost — try another answer."}
            </strong>{" "}
            {state.feedback}
          </p>
        ) : (
          <p>
            Choose the phrase that fits the moment. Progress changes only after the server confirms
            it.
          </p>
        )}
      </div>
      {state.error?.startsWith("Your session expired") ? (
        <a className="button button-outline dashboard-submit" href="/login?next=%2Fdashboard">
          Sign in again
        </a>
      ) : (
        <SubmitButton
          disabled={!selectedChoiceId || isCorrectResultForActivity(state, activity.id)}
        />
      )}
    </form>
  );
}
