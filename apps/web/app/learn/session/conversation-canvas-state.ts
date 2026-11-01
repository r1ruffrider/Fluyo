export const CONVERSATION_CANVAS_STATE_IDS = [
  "PREPARING",
  "ACTIVE",
  "SUBMITTING",
  "CONFIRMED",
  "RETRYABLE_ERROR",
  "STALE_CONTENT",
  "SESSION_ENDED",
  "ACCESS_BLOCKED",
  "EMPTY_REVIEW",
  "OFFLINE_READ_ONLY",
] as const;

export type ConversationCanvasStateId = (typeof CONVERSATION_CANVAS_STATE_IDS)[number];
export type AttemptResult = "correct" | "incorrect";

export const CONVERSATION_CANVAS_PRESENTATION_IDS = [
  "preparing",
  "active",
  "submitting",
  "confirmed-correct-continue",
  "confirmed-correct-finish",
  "confirmed-incorrect-continue",
  "confirmed-incorrect-finish",
  "retryable-prepare",
  "retryable-submit",
  "stale-content",
  "session-ended",
  "access-blocked",
  "empty-review",
  "offline-prepare",
  "offline-active",
] as const;

export type ConversationCanvasPresentationId =
  (typeof CONVERSATION_CANVAS_PRESENTATION_IDS)[number];

export type InitialConversationCanvasPresentation =
  "active" | "access_blocked" | "empty_review" | "retryable_prepare";

export type AttemptActionErrorKind =
  "validation" | "retryable" | "stale_content" | "session_ended" | "access_blocked";

export interface AttemptEnvelope {
  activityId: string;
  contentVersion: number;
  selectedChoiceId: string;
  idempotencyKey: string;
  operationGeneration: number;
}

export interface AttemptActionState {
  attempt: AttemptEnvelope | null;
  feedback: string | null;
  result: AttemptResult | null;
  nextActivityAvailable: boolean | null;
  errorKind: AttemptActionErrorKind | null;
}

export const initialAttemptState: AttemptActionState = {
  attempt: null,
  feedback: null,
  result: null,
  nextActivityAvailable: null,
  errorKind: null,
};

type PreparingState = {
  id: "PREPARING";
  operationGeneration: number;
};

type ActiveState = {
  id: "ACTIVE";
  activityId: string;
  contentVersion: number;
  selectedChoiceId: string | null;
  idempotencyKey: string;
  operationGeneration: number;
};

type SubmittingState = {
  id: "SUBMITTING";
  attempt: AttemptEnvelope;
};

type ConfirmedState = {
  id: "CONFIRMED";
  attempt: AttemptEnvelope;
  result: AttemptResult;
  feedback: string;
  nextActivityAvailable: boolean;
};

type RetryableErrorState = {
  id: "RETRYABLE_ERROR";
  origin: "prepare" | "submit";
  attempt: AttemptEnvelope | null;
  operationGeneration: number;
};

type TerminalState = {
  id: "STALE_CONTENT" | "SESSION_ENDED" | "ACCESS_BLOCKED" | "EMPTY_REVIEW";
  operationGeneration: number;
};

type OfflineReadOnlyState = {
  id: "OFFLINE_READ_ONLY";
  origin: "prepare" | "active";
  active: ActiveState | null;
  operationGeneration: number;
};

export type ConversationCanvasState =
  | PreparingState
  | ActiveState
  | SubmittingState
  | ConfirmedState
  | RetryableErrorState
  | TerminalState
  | OfflineReadOnlyState;

export type ConversationCanvasEvent =
  | { type: "AUTHORITATIVE_RESET"; state: ConversationCanvasState }
  | {
      type: "ACTIVITY_READY";
      activityId: string;
      contentVersion: number;
      idempotencyKey: string;
    }
  | { type: "SELECT_CHOICE"; selectedChoiceId: string; idempotencyKey: string }
  | { type: "SUBMIT" }
  | {
      type: "CONFIRM";
      attempt: AttemptEnvelope;
      result: AttemptResult;
      feedback: string;
      nextActivityAvailable: boolean;
    }
  | { type: "PREPARE_FAILED" }
  | { type: "SUBMIT_FAILED"; attempt: AttemptEnvelope }
  | { type: "TRY_AGAIN" }
  | { type: "CONTENT_STALE" }
  | { type: "SESSION_ENDED" }
  | { type: "ACCESS_BLOCKED" }
  | { type: "EMPTY_REVIEW" }
  | { type: "CONNECTIVITY_LOST" }
  | { type: "LEAVE" };

export const initialConversationCanvasState = (): PreparingState => ({
  id: "PREPARING",
  operationGeneration: 1,
});

export function conversationCanvasInstanceKey({
  activityId,
  contentVersion,
  presentation,
  revalidationToken,
}: {
  activityId: string | null;
  contentVersion: number | null;
  presentation: InitialConversationCanvasPresentation;
  revalidationToken: string;
}): string {
  return [
    presentation,
    activityId ?? "no-activity",
    contentVersion === null ? "no-version" : String(contentVersion),
    revalidationToken,
  ].join(":");
}

export interface ConversationCanvasPresentationCopy {
  heading: string;
  body: string;
  primaryAction: string | null;
}

export function conversationCanvasPresentationCopy(
  state: ConversationCanvasState,
): ConversationCanvasPresentationCopy {
  switch (state.id) {
    case "PREPARING":
      return {
        heading: "Getting your activity ready",
        body: "Checking the latest activity and your confirmed progress.",
        primaryAction: null,
      };
    case "ACTIVE":
      return {
        heading: "Choose your answer",
        body: "Select one answer, then check it.",
        primaryAction: "Check answer",
      };
    case "SUBMITTING":
      return {
        heading: "Checking your answer",
        body: "Waiting for a confirmed result.",
        primaryAction: "Checking…",
      };
    case "CONFIRMED":
      return {
        heading: state.result === "correct" ? "Correct" : "Not quite",
        body: state.feedback,
        primaryAction: state.nextActivityAvailable ? "Continue" : "Finish",
      };
    case "RETRYABLE_ERROR":
      return state.origin === "prepare"
        ? {
            heading: "We couldn’t load the activity",
            body: "Nothing changed. Check your connection and try again.",
            primaryAction: "Try again",
          }
        : {
            heading: "We couldn’t check your answer",
            body: "Your answer wasn’t confirmed. Try again to finish checking it.",
            primaryAction: "Try again",
          };
    case "STALE_CONTENT":
      return {
        heading: "This activity changed",
        body: "Refresh to get the latest version before you continue.",
        primaryAction: "Refresh activity",
      };
    case "SESSION_ENDED":
      return {
        heading: "Your session ended",
        body: "Sign in again to continue safely. Your confirmed progress hasn’t changed.",
        primaryAction: "Sign in",
      };
    case "ACCESS_BLOCKED":
      return {
        heading: "You can’t open this activity",
        body: "This activity isn’t available for your account right now. Return to learning to choose something available.",
        primaryAction: "Return to learning",
      };
    case "EMPTY_REVIEW":
      return {
        heading: "Nothing to review right now",
        body: "You can continue with your next activity.",
        primaryAction: "Continue learning",
      };
    case "OFFLINE_READ_ONLY":
      return {
        heading: "You’re offline",
        body:
          state.origin === "active"
            ? "Your answer is kept for this session. Reconnect to check it."
            : "Reconnect to load your activity.",
        primaryAction: "Try again",
      };
  }
}

export const ATTEMPT_PRIMARY_ACTION_DOM_ID = "conversation-canvas-attempt-action";

export function ownsStableAttemptAction(state: ConversationCanvasState): boolean {
  return (
    state.id === "ACTIVE" ||
    state.id === "SUBMITTING" ||
    (state.id === "RETRYABLE_ERROR" && state.origin === "submit")
  );
}

export function shouldMoveFocusToStateHeading(
  previousStateId: ConversationCanvasStateId,
  nextStateId: ConversationCanvasStateId,
): boolean {
  if (previousStateId === nextStateId || nextStateId === "SUBMITTING") return false;
  return [
    "CONFIRMED",
    "RETRYABLE_ERROR",
    "STALE_CONTENT",
    "SESSION_ENDED",
    "ACCESS_BLOCKED",
    "EMPTY_REVIEW",
    "OFFLINE_READ_ONLY",
  ].includes(nextStateId);
}

export function attemptEnvelopesMatch(
  expected: AttemptEnvelope,
  observed: AttemptEnvelope,
): boolean {
  return (
    expected.activityId === observed.activityId &&
    expected.contentVersion === observed.contentVersion &&
    expected.selectedChoiceId === observed.selectedChoiceId &&
    expected.idempotencyKey === observed.idempotencyKey &&
    expected.operationGeneration === observed.operationGeneration
  );
}

const fencedPreparing = (state: ConversationCanvasState): PreparingState => ({
  id: "PREPARING",
  operationGeneration:
    "operationGeneration" in state
      ? state.operationGeneration + 1
      : state.attempt.operationGeneration + 1,
});

export function conversationCanvasReducer(
  state: ConversationCanvasState,
  event: ConversationCanvasEvent,
): ConversationCanvasState {
  if (event.type === "AUTHORITATIVE_RESET") return event.state;
  if (event.type === "LEAVE") return fencedPreparing(state);
  if (event.type === "SESSION_ENDED") {
    return { id: "SESSION_ENDED", operationGeneration: fencedPreparing(state).operationGeneration };
  }
  if (event.type === "ACCESS_BLOCKED") {
    return {
      id: "ACCESS_BLOCKED",
      operationGeneration: fencedPreparing(state).operationGeneration,
    };
  }
  if (event.type === "CONTENT_STALE") {
    return { id: "STALE_CONTENT", operationGeneration: fencedPreparing(state).operationGeneration };
  }
  if (event.type === "EMPTY_REVIEW") {
    return { id: "EMPTY_REVIEW", operationGeneration: fencedPreparing(state).operationGeneration };
  }
  if (event.type === "CONNECTIVITY_LOST") {
    if (state.id === "ACTIVE") {
      return {
        id: "OFFLINE_READ_ONLY",
        origin: "active",
        active: state,
        operationGeneration: state.operationGeneration,
      };
    }
    if (state.id === "PREPARING") {
      return {
        id: "OFFLINE_READ_ONLY",
        origin: "prepare",
        active: null,
        operationGeneration: state.operationGeneration,
      };
    }
    return state;
  }
  if (event.type === "PREPARE_FAILED" && state.id === "PREPARING") {
    return {
      id: "RETRYABLE_ERROR",
      origin: "prepare",
      attempt: null,
      operationGeneration: state.operationGeneration,
    };
  }
  if (event.type === "ACTIVITY_READY" && state.id === "PREPARING") {
    return {
      id: "ACTIVE",
      activityId: event.activityId,
      contentVersion: event.contentVersion,
      selectedChoiceId: null,
      idempotencyKey: event.idempotencyKey,
      operationGeneration: state.operationGeneration,
    };
  }
  if (event.type === "SELECT_CHOICE" && state.id === "ACTIVE") {
    return {
      ...state,
      selectedChoiceId: event.selectedChoiceId,
      idempotencyKey: event.idempotencyKey,
    };
  }
  if (event.type === "SUBMIT" && state.id === "ACTIVE" && state.selectedChoiceId) {
    return {
      id: "SUBMITTING",
      attempt: {
        activityId: state.activityId,
        contentVersion: state.contentVersion,
        selectedChoiceId: state.selectedChoiceId,
        idempotencyKey: state.idempotencyKey,
        operationGeneration: state.operationGeneration,
      },
    };
  }
  if (event.type === "SUBMIT_FAILED" && state.id === "SUBMITTING") {
    if (!attemptEnvelopesMatch(state.attempt, event.attempt)) return state;
    return {
      id: "RETRYABLE_ERROR",
      origin: "submit",
      attempt: state.attempt,
      operationGeneration: state.attempt.operationGeneration,
    };
  }
  if (event.type === "CONFIRM" && state.id === "SUBMITTING") {
    if (!attemptEnvelopesMatch(state.attempt, event.attempt)) return state;
    return {
      id: "CONFIRMED",
      attempt: state.attempt,
      result: event.result,
      feedback: event.feedback,
      nextActivityAvailable: event.nextActivityAvailable,
    };
  }
  if (event.type === "TRY_AGAIN" && state.id === "RETRYABLE_ERROR") {
    if (state.origin === "submit" && state.attempt) {
      return { id: "SUBMITTING", attempt: state.attempt };
    }
    return { id: "PREPARING", operationGeneration: state.operationGeneration };
  }
  return state;
}

export function activeStateFromAuthority({
  activityId,
  contentVersion,
  idempotencyKey,
  selectedChoiceId = null,
}: {
  activityId: string;
  contentVersion: number;
  idempotencyKey: string;
  selectedChoiceId?: string | null;
}): ConversationCanvasState {
  return {
    id: "ACTIVE",
    activityId,
    contentVersion,
    selectedChoiceId,
    idempotencyKey,
    operationGeneration: 1,
  };
}

export function rebindOfflineSelection(
  previousState: ConversationCanvasState,
  freshState: ConversationCanvasState,
): ConversationCanvasState {
  if (
    previousState.id !== "OFFLINE_READ_ONLY" ||
    previousState.origin !== "active" ||
    !previousState.active ||
    freshState.id !== "ACTIVE" ||
    previousState.active.activityId !== freshState.activityId ||
    previousState.active.contentVersion !== freshState.contentVersion
  ) {
    return freshState;
  }
  return {
    ...freshState,
    selectedChoiceId: previousState.active.selectedChoiceId,
  };
}

export type DevelopmentConversationEventScript =
  | "none"
  | "network_loss_during_submit"
  | "duplicate_submit"
  | "stale_content_version"
  | "late_confirmation_after_exit"
  | "authentication_expired"
  | "entitlement_blocked"
  | "offline_saved_material"
  | "corrupt_cache_recovery"
  | "protected_mode_unknown_cohort";

export interface DevelopmentConversationEventTrace {
  requestedPresentation: ConversationCanvasStateId;
  settledOutcome: ConversationCanvasStateId;
}

export function browserConnectivityInstruction(browserEvent: "offline" | "online"): {
  reducerEvent: ConversationCanvasEvent | null;
  revalidate: boolean;
} {
  return browserEvent === "offline"
    ? { reducerEvent: { type: "CONNECTIVITY_LOST" }, revalidate: false }
    : { reducerEvent: null, revalidate: true };
}

function developmentSubmittingState(
  state: ConversationCanvasState,
  selectedChoiceId: string,
): ConversationCanvasState {
  if (state.id === "SUBMITTING") return state;
  if (state.id !== "ACTIVE") return state;
  const selected = conversationCanvasReducer(state, {
    type: "SELECT_CHOICE",
    selectedChoiceId,
    idempotencyKey: state.idempotencyKey,
  });
  return conversationCanvasReducer(selected, { type: "SUBMIT" });
}

export function applyDevelopmentConversationEventScript(
  state: ConversationCanvasState,
  script: DevelopmentConversationEventScript,
  selectedChoiceId: string,
): ConversationCanvasState {
  switch (script) {
    case "none":
      return state;
    case "duplicate_submit": {
      const submitting = developmentSubmittingState(state, selectedChoiceId);
      return conversationCanvasReducer(submitting, { type: "SUBMIT" });
    }
    case "network_loss_during_submit": {
      const submitting = developmentSubmittingState(state, selectedChoiceId);
      if (submitting.id !== "SUBMITTING") return submitting;
      return conversationCanvasReducer(submitting, {
        type: "SUBMIT_FAILED",
        attempt: submitting.attempt,
      });
    }
    case "stale_content_version":
      return conversationCanvasReducer(state, { type: "CONTENT_STALE" });
    case "late_confirmation_after_exit": {
      const submitting = developmentSubmittingState(state, selectedChoiceId);
      if (submitting.id !== "SUBMITTING") return submitting;
      const left = conversationCanvasReducer(submitting, { type: "LEAVE" });
      return conversationCanvasReducer(left, {
        type: "CONFIRM",
        attempt: submitting.attempt,
        result: "correct",
        feedback: "Your result was confirmed.",
        nextActivityAvailable: false,
      });
    }
    case "authentication_expired":
      return conversationCanvasReducer(state, { type: "SESSION_ENDED" });
    case "entitlement_blocked":
    case "protected_mode_unknown_cohort":
      return conversationCanvasReducer(state, { type: "ACCESS_BLOCKED" });
    case "offline_saved_material":
      return conversationCanvasReducer(state, { type: "CONNECTIVITY_LOST" });
    case "corrupt_cache_recovery":
      return conversationCanvasReducer(state, {
        type: "AUTHORITATIVE_RESET",
        state: initialConversationCanvasState(),
      });
  }
}

export function traceDevelopmentConversationEventScript(
  initialState: ConversationCanvasState,
  script: DevelopmentConversationEventScript,
  selectedChoiceId: string,
): { settledState: ConversationCanvasState; trace: DevelopmentConversationEventTrace } {
  const settledState = applyDevelopmentConversationEventScript(
    initialState,
    script,
    selectedChoiceId,
  );
  return {
    settledState,
    trace: {
      requestedPresentation: initialState.id,
      settledOutcome: settledState.id,
    },
  };
}

export function shouldRotateAttemptKey(
  submittedChoiceId: string | null,
  nextChoiceId: string,
): boolean {
  return submittedChoiceId !== null && nextChoiceId !== submittedChoiceId;
}

const feedbackFallback = "Your result was confirmed.";
const feedbackSegmenter = new Intl.Segmenter("und", { granularity: "grapheme" });
const feedbackGraphemeCount = (value: string): number =>
  [...feedbackSegmenter.segment(value)].length;

function feedbackDetectionShadow(value: string): string | undefined {
  const compatibilityInput = value.normalize("NFKC");
  if (/%(?![0-9a-f]{2})/iu.test(compatibilityInput)) return undefined;
  let onceDecoded: string;
  try {
    onceDecoded = decodeURIComponent(compatibilityInput);
  } catch {
    return undefined;
  }
  if (/%[0-9a-f]{2}/iu.test(onceDecoded)) return undefined;
  return onceDecoded
    .normalize("NFKC")
    .replace(/[\u2044\u2215\u29f8\uff0f]/gu, "/")
    .replace(/[\u2216\u29f5\u29f9\ufe68\uff3c]/gu, "\\");
}

const containsPhoneContact = (value: string): boolean =>
  [
    ...value.matchAll(
      /(?<![\p{L}\p{N}])\+?\p{Nd}[\p{Nd} ()./\-\u00a0\u00b7\u202f]{5,}\p{Nd}(?![\p{L}\p{N}])/gu,
    ),
  ].some(([candidate]) => {
    const digitCount = candidate.match(/\p{Nd}/gu)?.length ?? 0;
    return digitCount >= 7 && digitCount <= 15;
  });

export function sanitizeConfirmedFeedback(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value !== value.normalize("NFC")) {
    return feedbackFallback;
  }
  if (value.trim() !== value || value.trim().length === 0) return feedbackFallback;
  if (new TextEncoder().encode(value).byteLength > 512 || feedbackGraphemeCount(value) > 160) {
    return feedbackFallback;
  }
  const shadow = feedbackDetectionShadow(value);
  if (shadow === undefined || containsPhoneContact(shadow)) return feedbackFallback;
  const forbiddenFamilies = [
    /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u,
    /[<>]/u,
    /&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);/iu,
    /[*_`\[\]]/u,
    /~{2,}/u,
    /(?:^|\n)\s{0,3}(?:(?:-\s*){3,}|(?:_\s*){3,}|(?:\*\s*){3,})(?:\n|$)/mu,
    /(?:^|\n)\s{0,3}(?:#{1,6}|>|[-+]|\d+[.)])\s/mu,
    /\[[^\]\r\n]*\]\s*(?:\([^\)\r\n]*\)|\[[^\]\r\n]*\])/u,
    /(?:^|[^\p{L}\p{N}+.-])[a-z][a-z0-9+.-]{0,31}:(?=\S)/iu,
    /(?:www\.|\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b)/iu,
    /(?:\b[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[:/]\d*)?\b|[?&#][a-z0-9_.-]+=)/iu,
    /\b(?:google|microsoft|apple|github|stripe|supabase|vercel|openai|auth0|okta)\b/iu,
    /\b(?:error|exception|diagnostic|stack|trace|provider|correlation|request|operation)\b/iu,
    /\b(?:token|code|state|nonce|verifier|credential|secret|password|session|cookie|bearer|authorization)\b/iu,
    /\b(?:user|account|owner|profile|device|install(?:ation)?|app[_-]?set|advertis(?:ing|ement)|ad|aaid|gaid|idfa|idfv|oaid|android|activity|attempt|request|operation|correlation|session)[_-]?(?:id|identifier)\b/iu,
    /(?:^|[\s,{])["']?[a-z][a-z0-9_-]*(?:id|uuid|guid)["']?\s*[:=]/iu,
    /(?<![0-9a-f])(?:\{[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|[0-9a-f]{32})(?![0-9a-f])/iu,
    /(?:[A-Za-z]:\\|\\\\|\/(?:home|users?|var|tmp|private|etc|srv|opt)\/|\.\.[\\/])/u,
    /(?:^|[\s("'`])(?:(?:[A-Za-z]:)?[\\/]|\.{1,2}[\\/])?(?=[^\s"'`]*[A-Za-z._-])(?:[A-Za-z0-9._-]+[\\/]){1,}[A-Za-z0-9._-]+(?=$|[\s)"'`,.;])/u,
  ];
  return forbiddenFamilies.some((pattern) => pattern.test(shadow)) ? feedbackFallback : value;
}
