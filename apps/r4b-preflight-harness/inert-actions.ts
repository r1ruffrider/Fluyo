import type { AttemptActionState } from "../web/app/learn/session/conversation-canvas-state";

export const R4B_INERT_ACTION_ALIAS = "fluyo:r4b:inert-conversation-action:v1";

export async function submitConversationAttempt(
  previousState: AttemptActionState,
  formData: FormData,
): Promise<AttemptActionState> {
  void formData;
  return previousState;
}
