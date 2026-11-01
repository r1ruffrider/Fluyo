import type { PublishedActivity } from "@fluyo/shared";

import {
  type AttemptEnvelope,
  type ConversationCanvasPresentationId,
  type ConversationCanvasState,
  conversationCanvasReducer,
  initialConversationCanvasState,
} from "../../learn/session/conversation-canvas-state";

const activityId = "22222222-2222-4222-8222-222222222222";
const idempotencyKey = "33333333-3333-4333-8333-333333333333";

export const syntheticConversationActivity: PublishedActivity = {
  id: activityId,
  kind: "phrase_choice",
  contentVersion: 4,
  prompt: "A friend asks: ¿Dónde está la estación?",
  choices: [
    { id: "cerca", label: "Está cerca del parque." },
    { id: "gracias", label: "Gracias por la comida." },
    {
      id: "long",
      label: "Está cerca del parque, después del puente y frente a la biblioteca del barrio.",
    },
  ],
};

const attempt: AttemptEnvelope = {
  activityId,
  contentVersion: 4,
  selectedChoiceId: "cerca",
  idempotencyKey,
  operationGeneration: 1,
};

export interface ConversationCanvasFixture {
  id: ConversationCanvasPresentationId;
  state: ConversationCanvasState;
}

export const CONVERSATION_CANVAS_BREAK_UI_IDS = [
  "long_localized_prompt_and_choices",
  "rtl_mixed_script_activity",
  "large_text_compact_landscape",
  "one_character_and_multiline_answers",
  "empty_activity_catalog",
  "network_loss_during_submit",
  "duplicate_submit",
  "stale_content_version",
  "late_confirmation_after_exit",
  "authentication_expired",
  "entitlement_blocked",
  "offline_saved_material",
  "corrupt_cache_recovery",
  "protected_mode_unknown_cohort",
  "missing_optional_explanation",
] as const;

export type ConversationCanvasBreakUiId = (typeof CONVERSATION_CANVAS_BREAK_UI_IDS)[number];

export function conversationCanvasFixtureHref(
  presentationId: ConversationCanvasPresentationId,
  breakCaseId: ConversationCanvasBreakUiId,
): string {
  const params = new URLSearchParams({
    fixture: presentationId,
    breakCase: breakCaseId,
  });
  return `/dev-fixtures/conversation-canvas?${params.toString()}`;
}

export interface ConversationCanvasBreakCase {
  id: ConversationCanvasBreakUiId;
  label: string;
}

type BreakUiEventScript =
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

export interface ConversationCanvasScenario {
  activity: PublishedActivity;
  state: ConversationCanvasState;
  direction: "ltr" | "rtl";
  eventScript: BreakUiEventScript;
  environment: {
    browserZoomPercent?: 200;
    cachePayload?: string;
    catalog?: "empty";
    cohort?: "unknown";
    connectivity?: "offline";
    entitlement?: "blocked";
    session?: "expired";
    storage?: "memory_only";
    viewport?: "844x390";
  };
  optionalExplanation?: string | null;
}

export const conversationCanvasBreakCases: ConversationCanvasBreakCase[] = [
  { id: "long_localized_prompt_and_choices", label: "Long localized prompt and choices" },
  { id: "rtl_mixed_script_activity", label: "RTL mixed-script activity" },
  { id: "large_text_compact_landscape", label: "Large text in compact landscape" },
  { id: "one_character_and_multiline_answers", label: "One-character and multiline answers" },
  { id: "empty_activity_catalog", label: "Empty activity catalog" },
  { id: "network_loss_during_submit", label: "Network loss during submit" },
  { id: "duplicate_submit", label: "Duplicate submit" },
  { id: "stale_content_version", label: "Stale content version" },
  { id: "late_confirmation_after_exit", label: "Late confirmation after exit" },
  { id: "authentication_expired", label: "Authentication expired" },
  { id: "entitlement_blocked", label: "Entitlement blocked" },
  { id: "offline_saved_material", label: "Offline saved material" },
  { id: "corrupt_cache_recovery", label: "Corrupt-cache recovery" },
  { id: "protected_mode_unknown_cohort", label: "Protected mode for unknown cohort" },
  { id: "missing_optional_explanation", label: "Missing optional explanation" },
];

export const conversationCanvasFixtures: ConversationCanvasFixture[] = [
  { id: "preparing", state: { id: "PREPARING", operationGeneration: 1 } },
  {
    id: "active",
    state: {
      id: "ACTIVE",
      activityId,
      contentVersion: 4,
      selectedChoiceId: null,
      idempotencyKey,
      operationGeneration: 1,
    },
  },
  { id: "submitting", state: { id: "SUBMITTING", attempt } },
  {
    id: "confirmed-correct-continue",
    state: {
      id: "CONFIRMED",
      attempt,
      result: "correct",
      feedback: "You used the right form.",
      nextActivityAvailable: true,
    },
  },
  {
    id: "confirmed-correct-finish",
    state: {
      id: "CONFIRMED",
      attempt,
      result: "correct",
      feedback: "Your result was confirmed.",
      nextActivityAvailable: false,
    },
  },
  {
    id: "confirmed-incorrect-continue",
    state: {
      id: "CONFIRMED",
      attempt,
      result: "incorrect",
      feedback: "Try the phrase that gives a location.",
      nextActivityAvailable: true,
    },
  },
  {
    id: "confirmed-incorrect-finish",
    state: {
      id: "CONFIRMED",
      attempt,
      result: "incorrect",
      feedback: "Your result was confirmed.",
      nextActivityAvailable: false,
    },
  },
  {
    id: "retryable-prepare",
    state: {
      id: "RETRYABLE_ERROR",
      origin: "prepare",
      attempt: null,
      operationGeneration: 1,
    },
  },
  {
    id: "retryable-submit",
    state: {
      id: "RETRYABLE_ERROR",
      origin: "submit",
      attempt,
      operationGeneration: 1,
    },
  },
  { id: "stale-content", state: { id: "STALE_CONTENT", operationGeneration: 2 } },
  { id: "session-ended", state: { id: "SESSION_ENDED", operationGeneration: 2 } },
  { id: "access-blocked", state: { id: "ACCESS_BLOCKED", operationGeneration: 2 } },
  { id: "empty-review", state: { id: "EMPTY_REVIEW", operationGeneration: 2 } },
  {
    id: "offline-prepare",
    state: {
      id: "OFFLINE_READ_ONLY",
      origin: "prepare",
      active: null,
      operationGeneration: 1,
    },
  },
  {
    id: "offline-active",
    state: {
      id: "OFFLINE_READ_ONLY",
      origin: "active",
      active: {
        id: "ACTIVE",
        activityId,
        contentVersion: 4,
        selectedChoiceId: "cerca",
        idempotencyKey,
        operationGeneration: 1,
      },
      operationGeneration: 1,
    },
  },
];

export const conversationCanvasFixture = (
  id: string | undefined,
): ConversationCanvasFixture | undefined =>
  conversationCanvasFixtures.find((fixture) => fixture.id === id);

export const conversationCanvasBreakCase = (
  id: string | undefined,
): ConversationCanvasBreakCase | undefined =>
  conversationCanvasBreakCases.find((breakCase) => breakCase.id === id);

const longStressActivity = (): PublishedActivity => ({
  ...syntheticConversationActivity,
  prompt: "P".repeat(600),
  choices: Array.from({ length: 4 }, (_, index) => ({
    id: `stress-${index + 1}`,
    label: String(index + 1).repeat(180),
  })),
});

export function conversationCanvasScenario(
  fixture: ConversationCanvasFixture,
  breakCase: ConversationCanvasBreakCase,
): ConversationCanvasScenario {
  const base: ConversationCanvasScenario = {
    activity: syntheticConversationActivity,
    state: fixture.state,
    direction: "ltr",
    eventScript: "none",
    environment: {},
    optionalExplanation: "Synthetic optional explanation.",
  };
  switch (breakCase.id) {
    case "long_localized_prompt_and_choices":
      return { ...base, activity: longStressActivity() };
    case "rtl_mixed_script_activity":
      return {
        ...base,
        direction: "rtl",
        activity: {
          ...syntheticConversationActivity,
          prompt: "أين تقع estación 12 المركزية؟",
          choices: [{ id: "rtl", label: "تقع قرب parque 7 المركزي." }],
        },
      };
    case "large_text_compact_landscape":
      return {
        ...base,
        environment: { browserZoomPercent: 200, viewport: "844x390" },
      };
    case "one_character_and_multiline_answers":
      return {
        ...base,
        activity: {
          ...syntheticConversationActivity,
          prompt: "?",
          choices: [
            { id: "one", label: "A" },
            { id: "multiline", label: "Primera línea\nSegunda línea" },
          ],
        },
      };
    case "empty_activity_catalog":
      return { ...base, environment: { catalog: "empty" } };
    case "network_loss_during_submit":
      return {
        ...base,
        eventScript: "network_loss_during_submit",
        environment: { connectivity: "offline" },
      };
    case "duplicate_submit":
      return { ...base, eventScript: "duplicate_submit" };
    case "stale_content_version":
      return { ...base, eventScript: "stale_content_version" };
    case "late_confirmation_after_exit":
      return { ...base, eventScript: "late_confirmation_after_exit" };
    case "authentication_expired":
      return {
        ...base,
        eventScript: "authentication_expired",
        environment: { session: "expired" },
      };
    case "entitlement_blocked":
      return {
        ...base,
        eventScript: "entitlement_blocked",
        environment: { entitlement: "blocked" },
      };
    case "offline_saved_material":
      return {
        ...base,
        eventScript: "offline_saved_material",
        environment: { connectivity: "offline", storage: "memory_only" },
      };
    case "corrupt_cache_recovery":
      return {
        ...base,
        eventScript: "corrupt_cache_recovery",
        environment: { cachePayload: "{not-json" },
      };
    case "protected_mode_unknown_cohort":
      return {
        ...base,
        eventScript: "protected_mode_unknown_cohort",
        environment: { cohort: "unknown" },
      };
    case "missing_optional_explanation":
      return { ...base, optionalExplanation: null };
  }
}

function selectedActiveState(): ConversationCanvasState {
  return {
    id: "ACTIVE",
    activityId,
    contentVersion: 4,
    selectedChoiceId: "cerca",
    idempotencyKey,
    operationGeneration: 1,
  };
}

function submitSelected(): ConversationCanvasState {
  return conversationCanvasReducer(selectedActiveState(), { type: "SUBMIT" });
}

export function recoverConversationCanvasCache(payload: string): ConversationCanvasState {
  try {
    JSON.parse(payload);
  } catch {
    return initialConversationCanvasState();
  }
  return initialConversationCanvasState();
}

export function exerciseConversationCanvasBreakCase(
  breakCaseId: ConversationCanvasBreakUiId,
): ConversationCanvasState {
  switch (breakCaseId) {
    case "network_loss_during_submit": {
      const submitting = submitSelected();
      if (submitting.id !== "SUBMITTING") return submitting;
      return conversationCanvasReducer(submitting, {
        type: "SUBMIT_FAILED",
        attempt: submitting.attempt,
      });
    }
    case "duplicate_submit": {
      const submitting = submitSelected();
      return conversationCanvasReducer(submitting, { type: "SUBMIT" });
    }
    case "stale_content_version":
      return conversationCanvasReducer(submitSelected(), { type: "CONTENT_STALE" });
    case "late_confirmation_after_exit": {
      const submitting = submitSelected();
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
      return conversationCanvasReducer(selectedActiveState(), { type: "SESSION_ENDED" });
    case "entitlement_blocked":
    case "protected_mode_unknown_cohort":
      return conversationCanvasReducer(selectedActiveState(), { type: "ACCESS_BLOCKED" });
    case "offline_saved_material":
      return conversationCanvasReducer(selectedActiveState(), { type: "CONNECTIVITY_LOST" });
    case "corrupt_cache_recovery":
      return recoverConversationCanvasCache("{not-json");
    case "empty_activity_catalog":
      return conversationCanvasReducer(initialConversationCanvasState(), { type: "EMPTY_REVIEW" });
    case "long_localized_prompt_and_choices":
    case "rtl_mixed_script_activity":
    case "large_text_compact_landscape":
    case "one_character_and_multiline_answers":
    case "missing_optional_explanation":
      return selectedActiveState();
  }
}
