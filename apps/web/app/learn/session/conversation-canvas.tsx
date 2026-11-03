"use client";

import type { PublishedActivity } from "@fluyo/shared";
import {
  type FormEvent,
  useActionState,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { submitConversationAttempt } from "./actions";
import {
  ATTEMPT_PRIMARY_ACTION_DOM_ID,
  activeStateFromAuthority,
  browserConnectivityInstruction,
  conversationCanvasPresentationCopy,
  initialAttemptState,
  ownsStableAttemptAction,
  rebindOfflineSelection,
  shouldMoveFocusToStateHeading,
  shouldRotateAttemptKey,
  traceDevelopmentConversationEventScript,
  type AttemptActionState,
  type AttemptEnvelope,
  type ConversationCanvasState,
  type DevelopmentConversationEventTrace,
  type DevelopmentConversationEventScript,
  type InitialConversationCanvasPresentation,
  conversationCanvasReducer,
  initialConversationCanvasState,
} from "./conversation-canvas-state";
import styles from "./conversation-canvas.module.css";

type ConversationAttemptAction = (
  previousState: AttemptActionState,
  formData: FormData,
) => Promise<AttemptActionState>;

async function keepDevelopmentFixtureAttemptLocal(
  previousState: AttemptActionState,
  formData: FormData,
): Promise<AttemptActionState> {
  void formData;
  return previousState;
}

export function conversationCanvasAttemptAction(
  isDevelopmentFixture: boolean,
): ConversationAttemptAction {
  return isDevelopmentFixture ? keepDevelopmentFixtureAttemptLocal : submitConversationAttempt;
}

function AttemptActionButton({ state }: { state: ConversationCanvasState }) {
  const { pending } = useFormStatus();
  const copy = conversationCanvasPresentationCopy(state);
  const disabled =
    state.id === "SUBMITTING" ||
    (state.id === "ACTIVE" && state.selectedChoiceId === null) ||
    pending;
  return (
    <button
      aria-disabled={disabled || undefined}
      className={styles.primaryButton}
      data-focus-owner="attempt-action"
      id={ATTEMPT_PRIMARY_ACTION_DOM_ID}
      onClick={(event) => {
        if (disabled) event.preventDefault();
      }}
      type="submit"
    >
      {pending ? "Checking…" : copy.primaryAction}
    </button>
  );
}

function activeAttempt(state: ConversationCanvasState): AttemptEnvelope | null {
  if (state.id === "SUBMITTING" || state.id === "CONFIRMED") return state.attempt;
  if (state.id === "RETRYABLE_ERROR" && state.attempt) return state.attempt;
  if (state.id === "ACTIVE" && state.selectedChoiceId) {
    return {
      activityId: state.activityId,
      contentVersion: state.contentVersion,
      selectedChoiceId: state.selectedChoiceId,
      idempotencyKey: state.idempotencyKey,
      operationGeneration: state.operationGeneration,
    };
  }
  return null;
}

function announcementFor(state: ConversationCanvasState): string {
  switch (state.id) {
    case "PREPARING":
      return "Getting your activity ready. Checking the latest activity and your confirmed progress.";
    case "SUBMITTING":
      return "Checking your answer. Waiting for a confirmed result.";
    case "CONFIRMED":
      return `${state.result === "correct" ? "Correct" : "Not quite"}. ${state.feedback}`;
    case "RETRYABLE_ERROR":
      return state.origin === "prepare"
        ? "We couldn’t load the activity. Nothing changed. Check your connection and try again."
        : "We couldn’t check your answer. Your answer wasn’t confirmed. Try again to finish checking it.";
    case "STALE_CONTENT":
      return "This activity changed. Refresh to get the latest version before you continue.";
    case "SESSION_ENDED":
      return "Your session ended. Sign in again to continue safely. Your confirmed progress hasn’t changed.";
    case "ACCESS_BLOCKED":
      return "You can’t open this activity. This activity isn’t available for your account right now. Return to learning to choose something available.";
    case "EMPTY_REVIEW":
      return "Nothing to review right now. You can continue with your next activity.";
    case "OFFLINE_READ_ONLY":
      return state.origin === "active"
        ? "You’re offline. Your answer is kept for this session. Reconnect to check it."
        : "You’re offline. Reconnect to load your activity.";
    case "ACTIVE":
      return "Choose your answer";
  }
}

function statusMarkFor(state: ConversationCanvasState): string {
  if (state.id === "CONFIRMED") return state.result === "correct" ? "✓" : "!";
  if (state.id === "ACCESS_BLOCKED") return "×";
  if (state.id === "EMPTY_REVIEW") return "—";
  if (state.id === "ACTIVE") return "1";
  if (state.id === "PREPARING" || state.id === "SUBMITTING" || state.id === "OFFLINE_READ_ONLY") {
    return "…";
  }
  return "!";
}

function authoritativeState({
  activity,
  initialIdempotencyKey,
  initialPresentation,
}: {
  activity: PublishedActivity | null;
  initialIdempotencyKey: string;
  initialPresentation: InitialConversationCanvasPresentation;
}): ConversationCanvasState {
  const initial = initialConversationCanvasState();
  if (initialPresentation === "access_blocked") {
    return conversationCanvasReducer(initial, { type: "ACCESS_BLOCKED" });
  }
  if (initialPresentation === "empty_review") {
    return conversationCanvasReducer(initial, { type: "EMPTY_REVIEW" });
  }
  if (initialPresentation === "retryable_prepare") {
    return conversationCanvasReducer(initial, { type: "PREPARE_FAILED" });
  }
  if (!activity) return conversationCanvasReducer(initial, { type: "EMPTY_REVIEW" });
  return activeStateFromAuthority({
    activityId: activity.id,
    contentVersion: activity.contentVersion,
    idempotencyKey: initialIdempotencyKey,
  });
}

export function ConversationCanvas({
  activity,
  authoritativeInstanceKey,
  developmentFixtureScript = "none",
  developmentFixtureState,
  initialIdempotencyKey,
  initialPresentation = "active",
}: {
  activity: PublishedActivity | null;
  authoritativeInstanceKey?: string;
  developmentFixtureScript?: DevelopmentConversationEventScript;
  developmentFixtureState?: ConversationCanvasState;
  initialIdempotencyKey: string;
  initialPresentation?: InitialConversationCanvasPresentation;
}) {
  const router = useRouter();
  const isDevelopmentFixture = developmentFixtureState !== undefined;
  const [actionState, formAction] = useActionState(
    conversationCanvasAttemptAction(isDevelopmentFixture),
    initialAttemptState,
  );
  const [state, dispatch] = useReducer(
    conversationCanvasReducer,
    undefined,
    (): ConversationCanvasState => {
      if (developmentFixtureState) return developmentFixtureState;
      return authoritativeState({
        activity,
        initialIdempotencyKey,
        initialPresentation,
      });
    },
  );
  const [exitOpen, setExitOpen] = useState(false);
  const [developmentTrace, setDevelopmentTrace] =
    useState<DevelopmentConversationEventTrace | null>(null);
  const lastSubmittedChoice = useRef<string | null>(null);
  const previousAuthoritativeInstance = useRef(authoritativeInstanceKey);
  const previousStateId = useRef(state.id);
  const restoreExitFocus = useRef(false);
  const stateHeading = useRef<HTMLHeadingElement>(null);
  const canvasBackground = useRef<HTMLDivElement>(null);
  const exitButton = useRef<HTMLAnchorElement>(null);
  const stayButton = useRef<HTMLButtonElement>(null);
  const leaveButton = useRef<HTMLButtonElement>(null);
  const attempt = useMemo(() => activeAttempt(state), [state]);
  const presentationCopy = conversationCanvasPresentationCopy(state);

  useEffect(() => {
    if (
      developmentFixtureState ||
      authoritativeInstanceKey === undefined ||
      previousAuthoritativeInstance.current === authoritativeInstanceKey
    ) {
      return;
    }
    previousAuthoritativeInstance.current = authoritativeInstanceKey;
    lastSubmittedChoice.current = null;
    const fresh = authoritativeState({ activity, initialIdempotencyKey, initialPresentation });
    dispatch({
      type: "AUTHORITATIVE_RESET",
      state: rebindOfflineSelection(state, fresh),
    });
  }, [
    activity,
    authoritativeInstanceKey,
    developmentFixtureState,
    initialIdempotencyKey,
    initialPresentation,
    state,
  ]);

  useEffect(() => {
    if (actionState.errorKind === "session_ended") dispatch({ type: "SESSION_ENDED" });
    else if (!actionState.attempt) return;
    else if (actionState.errorKind === "stale_content") dispatch({ type: "CONTENT_STALE" });
    else if (actionState.errorKind === "access_blocked") dispatch({ type: "ACCESS_BLOCKED" });
    else if (actionState.errorKind) {
      dispatch({ type: "SUBMIT_FAILED", attempt: actionState.attempt });
    } else if (actionState.result && actionState.feedback) {
      dispatch({
        type: "CONFIRM",
        attempt: actionState.attempt,
        result: actionState.result,
        feedback: actionState.feedback,
        nextActivityAvailable: actionState.nextActivityAvailable === true,
      });
    }
  }, [actionState]);

  useEffect(() => {
    function onOffline() {
      const instruction = browserConnectivityInstruction("offline");
      if (instruction.reducerEvent) dispatch(instruction.reducerEvent);
    }
    function onOnline() {
      const instruction = browserConnectivityInstruction("online");
      if (instruction.revalidate) router.refresh();
    }
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    if (!navigator.onLine) onOffline();
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [router]);

  useEffect(() => {
    const previousId = previousStateId.current;
    previousStateId.current = state.id;
    if (shouldMoveFocusToStateHeading(previousId, state.id)) {
      stateHeading.current?.focus({ preventScroll: true });
    }
  }, [state.id]);

  useEffect(() => {
    const background = canvasBackground.current;
    if (!exitOpen) {
      background?.removeAttribute("inert");
      if (restoreExitFocus.current) {
        restoreExitFocus.current = false;
        requestAnimationFrame(() => exitButton.current?.focus());
      }
      return;
    }
    background?.setAttribute("inert", "");
    stayButton.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        restoreExitFocus.current = true;
        setExitOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const first = stayButton.current;
      const last = leaveButton.current;
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      background?.removeAttribute("inert");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [exitOpen]);

  function chooseAnswer(choiceId: string) {
    if (state.id !== "ACTIVE") return;
    const idempotencyKey = shouldRotateAttemptKey(lastSubmittedChoice.current, choiceId)
      ? crypto.randomUUID()
      : state.idempotencyKey;
    dispatch({ type: "SELECT_CHOICE", selectedChoiceId: choiceId, idempotencyKey });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    const canSubmit =
      (state.id === "ACTIVE" && state.selectedChoiceId !== null) ||
      (state.id === "RETRYABLE_ERROR" && state.origin === "submit");
    if (isDevelopmentFixture || !canSubmit) event.preventDefault();
    if (!canSubmit) return;
    if (state.id === "ACTIVE" && state.selectedChoiceId) {
      lastSubmittedChoice.current = state.selectedChoiceId;
      dispatch({ type: "SUBMIT" });
    } else if (state.id === "RETRYABLE_ERROR" && state.origin === "submit") {
      dispatch({ type: "TRY_AGAIN" });
    }
  }

  function continueAfterConfirmation() {
    router.refresh();
  }

  function runDevelopmentFixtureEvent() {
    if (!developmentFixtureState) return;
    const result = traceDevelopmentConversationEventScript(
      developmentFixtureState,
      developmentFixtureScript,
      activity?.choices[0]?.id ?? "fixture-choice",
    );
    setDevelopmentTrace(result.trace);
    dispatch({ type: "AUTHORITATIVE_RESET", state: result.settledState });
  }

  const selectedChoiceId =
    state.id === "ACTIVE"
      ? state.selectedChoiceId
      : state.id === "OFFLINE_READ_ONLY" && state.active
        ? state.active.selectedChoiceId
        : (attempt?.selectedChoiceId ?? null);
  const isBusy = state.id === "SUBMITTING";
  const showChoices =
    state.id === "ACTIVE" ||
    state.id === "SUBMITTING" ||
    (state.id === "OFFLINE_READ_ONLY" && state.origin === "active");

  return (
    <section
      aria-labelledby="conversation-canvas-title"
      className={styles.canvas}
      data-development-event-outcome={
        developmentFixtureState ? (developmentTrace?.settledOutcome ?? "not-triggered") : undefined
      }
      data-development-requested-presentation={developmentFixtureState?.id}
    >
      <div ref={canvasBackground}>
        <a className={styles.skipLink} href="#conversation-canvas-title">
          Skip to activity
        </a>
        <div className={styles.sessionBar}>
          <a
            className={styles.backLink}
            href="/dashboard"
            onClick={(event) => {
              if ((state.id === "ACTIVE" && state.selectedChoiceId) || state.id === "SUBMITTING") {
                event.preventDefault();
                setExitOpen(true);
              }
            }}
            ref={exitButton}
          >
            Back to dashboard
          </a>
          <div className={styles.progressGroup}>
            <span id="conversation-canvas-progress-label">Activity progress</span>
            <div
              aria-labelledby="conversation-canvas-progress-label"
              aria-valuemax={1}
              aria-valuemin={0}
              aria-valuenow={state.id === "CONFIRMED" ? 1 : 0}
              aria-valuetext={
                state.id === "CONFIRMED" ? "Activity complete" : "Activity incomplete"
              }
              className={styles.sessionProgress}
              role="progressbar"
            >
              <span data-complete={state.id === "CONFIRMED" ? "true" : "false"} />
            </div>
          </div>
        </div>
        <div className={styles.topline}>
          <div>
            <p className={styles.eyebrow}>Conversation Canvas</p>
            <h1 id="conversation-canvas-title" ref={stateHeading} tabIndex={-1}>
              {presentationCopy.heading}
            </h1>
          </div>
        </div>

        <p
          aria-atomic="true"
          aria-live={
            state.id === "RETRYABLE_ERROR" ||
            state.id === "STALE_CONTENT" ||
            state.id === "SESSION_ENDED" ||
            state.id === "ACCESS_BLOCKED"
              ? "assertive"
              : "polite"
          }
          className={styles.visuallyHidden}
        >
          {announcementFor(state)}
        </p>

        <form
          action={isDevelopmentFixture ? undefined : formAction}
          className={styles.form}
          onSubmit={submit}
        >
          {attempt ? (
            <>
              <input name="activityId" type="hidden" value={attempt.activityId} />
              <input name="contentVersion" type="hidden" value={attempt.contentVersion} />
              <input name="selectedChoiceId" type="hidden" value={attempt.selectedChoiceId} />
              <input name="idempotencyKey" type="hidden" value={attempt.idempotencyKey} />
              <input name="operationGeneration" type="hidden" value={attempt.operationGeneration} />
            </>
          ) : null}

          {showChoices && activity ? (
            <fieldset
              aria-disabled={isBusy || state.id === "OFFLINE_READ_ONLY" || undefined}
              className={styles.fieldset}
            >
              <legend>{activity.prompt}</legend>
              <div className={styles.choiceList}>
                {activity.choices.map((choice) => (
                  <label className={styles.choice} key={choice.id}>
                    <input
                      aria-disabled={isBusy || state.id === "OFFLINE_READ_ONLY" || undefined}
                      checked={selectedChoiceId === choice.id}
                      name="selectedChoiceId"
                      onChange={() => chooseAnswer(choice.id)}
                      onClick={(event) => {
                        if (isBusy || state.id === "OFFLINE_READ_ONLY") event.preventDefault();
                      }}
                      onKeyDown={(event) => {
                        if (
                          (isBusy || state.id === "OFFLINE_READ_ONLY") &&
                          [" ", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(
                            event.key,
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                      type="radio"
                      value={choice.id}
                    />
                    <span lang="es">{choice.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div
            className={styles.statePanel}
            data-result={state.id === "CONFIRMED" ? state.result : undefined}
            data-state={state.id}
          >
            <span aria-hidden="true" className={styles.statusMark}>
              {statusMarkFor(state)}
            </span>
            {state.id === "PREPARING" ? <p>{presentationCopy.body}</p> : null}
            {state.id === "ACTIVE" ? (
              <>
                <p>{presentationCopy.body}</p>
                <p className={styles.supporting}>
                  Progress changes only after the server confirms it.
                </p>
              </>
            ) : null}
            {state.id === "SUBMITTING" ? <p>{presentationCopy.body}</p> : null}
            {state.id === "CONFIRMED" ? (
              <>
                <p>{presentationCopy.body}</p>
                <button
                  className={styles.primaryButton}
                  id="conversation-canvas-primary-action"
                  onClick={() => {
                    if (state.nextActivityAvailable) continueAfterConfirmation();
                    else router.push("/dashboard");
                  }}
                  type="button"
                >
                  {presentationCopy.primaryAction}
                </button>
              </>
            ) : null}
            {state.id === "RETRYABLE_ERROR" ? (
              <>
                <p>{presentationCopy.body}</p>
                {state.origin === "prepare" ? (
                  <button
                    className={styles.primaryButton}
                    id="conversation-canvas-primary-action"
                    onClick={() => router.refresh()}
                    type="button"
                  >
                    Try again
                  </button>
                ) : null}
              </>
            ) : null}
            {state.id === "STALE_CONTENT" ? (
              <StateMessage
                action="Refresh activity"
                body="Refresh to get the latest version before you continue."
                onAction={() => router.refresh()}
              />
            ) : null}
            {state.id === "SESSION_ENDED" ? (
              <StateLink
                action="Sign in"
                body={presentationCopy.body}
                href="/login?next=%2Flearn%2Fsession"
              />
            ) : null}
            {state.id === "ACCESS_BLOCKED" ? (
              <StateLink
                action="Return to learning"
                body={presentationCopy.body}
                href="/dashboard"
              />
            ) : null}
            {state.id === "EMPTY_REVIEW" ? (
              <StateLink
                action="Continue learning"
                body={presentationCopy.body}
                href="/dashboard"
              />
            ) : null}
            {state.id === "OFFLINE_READ_ONLY" ? (
              <StateMessage
                action="Try again"
                body={presentationCopy.body}
                onAction={() => router.refresh()}
              />
            ) : null}
            {ownsStableAttemptAction(state) ? <AttemptActionButton state={state} /> : null}
          </div>
        </form>
        {developmentFixtureState ? (
          <div className={styles.fixtureTrace}>
            <button
              className={styles.secondaryButton}
              onClick={runDevelopmentFixtureEvent}
              type="button"
            >
              Run synthetic event
            </button>
            <output>
              Settled synthetic outcome: {developmentTrace?.settledOutcome ?? "not triggered"}
            </output>
          </div>
        ) : null}
      </div>

      {exitOpen ? (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              restoreExitFocus.current = true;
              setExitOpen(false);
            }
          }}
        >
          <div
            aria-labelledby="exit-dialog-title"
            aria-modal="true"
            className={styles.dialog}
            role="dialog"
          >
            <h2 id="exit-dialog-title">
              {state.id === "SUBMITTING" ? "Leave while checking?" : "Leave this activity?"}
            </h2>
            <p>
              {state.id === "SUBMITTING"
                ? "Fluyo will stop waiting here. If the server already confirmed the attempt, your progress may appear when you return."
                : "Your unsubmitted answer will be discarded."}
            </p>
            <div className={styles.dialogActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  restoreExitFocus.current = true;
                  setExitOpen(false);
                }}
                ref={stayButton}
                type="button"
              >
                Stay
              </button>
              <button
                className={styles.primaryButton}
                onClick={() => {
                  dispatch({ type: "LEAVE" });
                  setExitOpen(false);
                  router.push("/dashboard");
                }}
                ref={leaveButton}
                type="button"
              >
                Leave activity
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StateMessage({
  action,
  body,
  onAction,
}: {
  action: string;
  body: string;
  onAction: () => void;
}) {
  return (
    <>
      <p>{body}</p>
      <button
        className={styles.primaryButton}
        id="conversation-canvas-primary-action"
        onClick={onAction}
        type="button"
      >
        {action}
      </button>
    </>
  );
}

function StateLink({ action, body, href }: { action: string; body: string; href: string }) {
  return (
    <>
      <p>{body}</p>
      <a className={styles.primaryButton} href={href} id="conversation-canvas-primary-action">
        {action}
      </a>
    </>
  );
}
