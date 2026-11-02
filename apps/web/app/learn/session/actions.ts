"use server";

import { LearningApiError, submitLearningAttempt } from "../../../lib/learning-api";
import { getVerifiedWebIdentity } from "../../../lib/supabase/identity";
import {
  type AttemptActionErrorKind,
  type AttemptActionState,
  type AttemptEnvelope,
  initialAttemptState,
  sanitizeConfirmedFeedback,
} from "./conversation-canvas-state";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function errorKindFor(error: unknown): AttemptActionErrorKind {
  if (!(error instanceof LearningApiError)) return "retryable";
  if (error.status === 401) return "session_ended";
  if (error.status === 403 || error.status === 404) return "access_blocked";
  if (error.status === 409) return "stale_content";
  return "retryable";
}

export async function submitConversationAttempt(
  previousState: AttemptActionState,
  formData: FormData,
): Promise<AttemptActionState> {
  void previousState;
  const identity = await getVerifiedWebIdentity();
  if (!identity) return { ...initialAttemptState, errorKind: "session_ended" };

  const attempt: AttemptEnvelope = {
    activityId: String(formData.get("activityId") ?? "").toLowerCase(),
    contentVersion: Number(formData.get("contentVersion")),
    selectedChoiceId: String(formData.get("selectedChoiceId") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? "").toLowerCase(),
    operationGeneration: Number(formData.get("operationGeneration")),
  };

  if (
    !UUID_V4.test(attempt.activityId) ||
    !UUID_V4.test(attempt.idempotencyKey) ||
    !attempt.selectedChoiceId ||
    attempt.selectedChoiceId.length > 100 ||
    !Number.isInteger(attempt.contentVersion) ||
    attempt.contentVersion < 1 ||
    !Number.isSafeInteger(attempt.operationGeneration) ||
    attempt.operationGeneration < 1
  ) {
    return { ...initialAttemptState, attempt, errorKind: "validation" };
  }

  try {
    const response = await submitLearningAttempt(
      identity.accessToken,
      attempt.activityId,
      attempt.idempotencyKey,
      {
        contentVersion: attempt.contentVersion,
        selectedChoiceId: attempt.selectedChoiceId,
      },
    );
    if (
      response.activityId !== attempt.activityId ||
      response.contentVersion !== attempt.contentVersion
    ) {
      return { ...initialAttemptState, attempt, errorKind: "stale_content" };
    }
    return {
      attempt,
      feedback: sanitizeConfirmedFeedback(response.feedback),
      result: response.result,
      nextActivityAvailable: response.progress.nextActivityId !== null,
      errorKind: null,
    };
  } catch (error) {
    return { ...initialAttemptState, attempt, errorKind: errorKindFor(error) };
  }
}
