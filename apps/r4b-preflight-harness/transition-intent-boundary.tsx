"use client";

import { useRef, useState } from "react";

import {
  browserConnectivityInstruction,
  conversationCanvasPresentationCopy,
  conversationCanvasReducer,
  initialConversationCanvasState,
  rebindOfflineSelection,
  shouldMoveFocusToStateHeading,
  type ConversationCanvasEvent,
  type ConversationCanvasState,
} from "../web/app/learn/session/conversation-canvas-state";

export const TRANSITION_FAMILY_IDS = Object.freeze([
  "direct_load",
  "client_transition",
  "same_screen_refresh",
  "delayed_preparing_refresh",
  "connectivity_lost_preparing",
  "connectivity_lost_active",
  "connectivity_restored_preparing",
  "connectivity_restored_active",
] as const);

export type TransitionFamilyId = (typeof TRANSITION_FAMILY_IDS)[number] | "none";

function selectedActiveState(): ConversationCanvasState {
  const ready = conversationCanvasReducer(initialConversationCanvasState(), {
    type: "ACTIVITY_READY",
    activityId: "22222222-2222-4222-8222-222222222222",
    contentVersion: 4,
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
  });
  return conversationCanvasReducer(ready, {
    type: "SELECT_CHOICE",
    selectedChoiceId: "cerca",
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
  });
}

function answerOf(state: ConversationCanvasState): string | null {
  if (state.id === "ACTIVE") return state.selectedChoiceId;
  if (state.id === "OFFLINE_READ_ONLY" && state.active) return state.active.selectedChoiceId;
  if ("attempt" in state && state.attempt) return state.attempt.selectedChoiceId;
  return null;
}

function exerciseRecoveryProbes() {
  const selected = selectedActiveState();
  const submitting = conversationCanvasReducer(selected, { type: "SUBMIT" });
  if (submitting.id !== "SUBMITTING") throw new Error("synthetic submit probe did not submit");
  const submitFailure = conversationCanvasReducer(submitting, {
    type: "SUBMIT_FAILED",
    attempt: submitting.attempt,
  });
  const retriedSubmit = conversationCanvasReducer(submitFailure, { type: "TRY_AGAIN" });
  const prepareFailure = conversationCanvasReducer(initialConversationCanvasState(), {
    type: "PREPARE_FAILED",
  });
  const retriedPrepare = conversationCanvasReducer(prepareFailure, { type: "TRY_AGAIN" });
  const canceled = conversationCanvasReducer(submitting, { type: "LEAVE" });
  const lateConfirmation = conversationCanvasReducer(canceled, {
    type: "CONFIRM",
    attempt: submitting.attempt,
    result: "correct",
    feedback: "Synthetic confirmed feedback",
    nextActivityAvailable: false,
  });
  const offline = conversationCanvasReducer(selected, { type: "CONNECTIVITY_LOST" });
  const fresh = conversationCanvasReducer(initialConversationCanvasState(), {
    type: "ACTIVITY_READY",
    activityId: "22222222-2222-4222-8222-222222222222",
    contentVersion: 4,
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
  });
  const rebound = rebindOfflineSelection(offline, fresh);
  const cleared = conversationCanvasReducer(selected, { type: "LEAVE" });
  return {
    retrySubmitState: retriedSubmit.id,
    retryPrepareState: retriedPrepare.id,
    cancelState: canceled.id,
    lateConfirmationIgnored: lateConfirmation.id === "PREPARING",
    offlineState: offline.id,
    restoredState: rebound.id,
    answerRetained: answerOf(rebound) === "cerca",
    answerCleared: answerOf(cleared) === null,
  };
}

function runFamilySequence(
  familyId: Exclude<TransitionFamilyId, "none">,
  sourceState: ConversationCanvasState,
  targetState: ConversationCanvasState,
) {
  let state = sourceState;
  const reducerEvents: ConversationCanvasEvent["type"][] = [];
  let navigationIntent = "NONE";
  if (familyId === "direct_load") {
    state = initialConversationCanvasState();
    navigationIntent = "DIRECT_LOAD";
  } else if (familyId === "client_transition") {
    reducerEvents.push("LEAVE");
    state = conversationCanvasReducer(state, { type: "LEAVE" });
    navigationIntent = "CLIENT_TRANSITION";
  } else if (familyId === "same_screen_refresh" || familyId === "delayed_preparing_refresh") {
    const instruction = browserConnectivityInstruction("online");
    if (!instruction.revalidate)
      throw new Error("online refresh probe did not request revalidation");
    navigationIntent = familyId === "same_screen_refresh" ? "REFRESH" : "DELAYED_REFRESH";
  } else if (familyId.startsWith("connectivity_lost_")) {
    const instruction = browserConnectivityInstruction("offline");
    if (!instruction.reducerEvent) throw new Error("offline probe did not produce a reducer event");
    reducerEvents.push(instruction.reducerEvent.type);
    state = conversationCanvasReducer(state, instruction.reducerEvent);
  } else {
    const instruction = browserConnectivityInstruction("online");
    if (!instruction.revalidate)
      throw new Error("connectivity recovery did not request revalidation");
    navigationIntent = "REVALIDATE";
    state = rebindOfflineSelection(sourceState, targetState);
  }
  return { state, reducerEvents, navigationIntent };
}

export function TransitionIntentBoundary({
  children,
  familyId,
  sourceState,
  targetState,
}: {
  children: React.ReactNode;
  familyId: TransitionFamilyId;
  sourceState: ConversationCanvasState;
  targetState: ConversationCanvasState;
}) {
  const [trace, setTrace] = useState<null | Record<string, unknown>>(null);
  const intent = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  function exerciseIntent() {
    if (familyId === "none") return;
    const executed = runFamilySequence(familyId, sourceState, targetState);
    const copy = conversationCanvasPresentationCopy(executed.state);
    const focusTarget = shouldMoveFocusToStateHeading(sourceState.id, executed.state.id)
      ? "transition-heading"
      : "transition-intent";
    setTrace({
      familyId,
      sourceState: sourceState.id,
      targetState: executed.state.id,
      reducerEvents: executed.reducerEvents,
      navigationIntent: executed.navigationIntent,
      focusTarget,
      announcement: copy.heading,
      recoveryAction: copy.primaryAction,
      sourceAnswer: answerOf(sourceState),
      targetAnswer: answerOf(executed.state),
      probes: exerciseRecoveryProbes(),
    });
    queueMicrotask(() => {
      if (focusTarget === "transition-heading") heading.current?.focus();
      else intent.current?.focus();
    });
  }
  return (
    <div data-r4b-transition-family={familyId}>
      {children}
      {familyId === "none" ? null : (
        <>
          <button
            data-r4b-transition-intent={familyId}
            onClick={exerciseIntent}
            ref={intent}
            style={{ position: "fixed", insetInlineEnd: 0, bottom: 0, opacity: 0.001 }}
            tabIndex={-1}
            type="button"
          >
            Exercise inert transition intent
          </button>
          <section
            aria-labelledby="r4b-transition-heading"
            data-r4b-transition-state={trace?.targetState ?? "pending"}
          >
            <h2 id="r4b-transition-heading" ref={heading} tabIndex={-1}>
              {String(trace?.announcement ?? "")}
            </h2>
            <p aria-live="polite" data-r4b-transition-announcement>
              {String(trace?.announcement ?? "")}
            </p>
            <output data-r4b-transition-trace={trace ? "complete" : "pending"}>
              {trace ? JSON.stringify(trace) : ""}
            </output>
          </section>
        </>
      )}
    </div>
  );
}
