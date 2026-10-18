export interface AttemptActionState {
  activityId: string | null;
  feedback: string | null;
  result: "correct" | "incorrect" | null;
  error: string | null;
  selectedChoiceId: string | null;
}

export const initialAttemptState: AttemptActionState = {
  activityId: null,
  feedback: null,
  result: null,
  error: null,
  selectedChoiceId: null,
};

export function shouldRotateAttemptKey(
  state: AttemptActionState,
  activityId: string,
  nextChoiceId: string,
): boolean {
  return (
    state.activityId === activityId &&
    state.selectedChoiceId !== null &&
    nextChoiceId !== state.selectedChoiceId
  );
}
