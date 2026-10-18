"use server";

import { refresh } from "next/cache";

import { LearningApiError, submitLearningAttempt } from "../../lib/learning-api";
import { getVerifiedWebIdentity } from "../../lib/supabase/identity";
import { type AttemptActionState, initialAttemptState } from "./attempt-state";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function messageFor(error: unknown): string {
  if (!(error instanceof LearningApiError)) {
    return "Your answer could not be saved. Your selection is still here; try again.";
  }

  if (error.status === 401) return "Your session expired. Sign in again before retrying.";
  if (error.status === 404)
    return "This activity is no longer available. Refresh for the next one.";
  if (error.status === 409) return "This activity changed. Refresh it before answering again.";
  if (error.status === 429) return "You are moving quickly. Wait a moment, then retry this answer.";
  if (error.status === 503) return "Saved learning is temporarily unavailable. Try again shortly.";
  return "Your answer could not be saved. Your selection is still here; try again.";
}

export async function submitDashboardAttempt(
  previousState: AttemptActionState,
  formData: FormData,
): Promise<AttemptActionState> {
  void previousState;
  const identity = await getVerifiedWebIdentity();
  if (!identity) {
    return {
      ...initialAttemptState,
      error: "Your session expired. Sign in again before retrying.",
    };
  }

  const activityId = String(formData.get("activityId") ?? "").toLowerCase();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").toLowerCase();
  const selectedChoiceId = String(formData.get("selectedChoiceId") ?? "");
  const contentVersion = Number(formData.get("contentVersion"));

  if (
    !UUID_V4.test(activityId) ||
    !UUID_V4.test(idempotencyKey) ||
    !selectedChoiceId ||
    selectedChoiceId.length > 100 ||
    !Number.isInteger(contentVersion) ||
    contentVersion < 1
  ) {
    return {
      ...initialAttemptState,
      activityId,
      selectedChoiceId: selectedChoiceId || null,
      error: "Choose an answer and try again.",
    };
  }

  try {
    const response = await submitLearningAttempt(identity.accessToken, activityId, idempotencyKey, {
      contentVersion,
      selectedChoiceId,
    });
    if (response.result === "correct") {
      refresh();
    }
    return {
      activityId,
      feedback: response.feedback,
      result: response.result,
      error: null,
      selectedChoiceId,
    };
  } catch (error) {
    return { ...initialAttemptState, activityId, selectedChoiceId, error: messageFor(error) };
  }
}
