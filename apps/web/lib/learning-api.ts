import {
  LEARNING_PATHS,
  type LearningDashboardResponse,
  type SubmitActivityAttemptRequest,
  type SubmitActivityAttemptResponse,
} from "@fluyo/shared";

import { apiBaseUrl } from "./api-client";

export class LearningApiError extends Error {
  constructor(readonly status: number) {
    super(`Learning API request failed with status ${status}`);
  }
}

async function readResponse<TResponse>(response: Response): Promise<TResponse> {
  if (!response.ok) {
    throw new LearningApiError(response.status);
  }

  return (await response.json()) as TResponse;
}

export async function fetchLearningDashboard(
  accessToken: string,
): Promise<LearningDashboardResponse> {
  const response = await fetch(`${apiBaseUrl}${LEARNING_PATHS.dashboard}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(5_000),
  });
  return readResponse<LearningDashboardResponse>(response);
}

export async function submitLearningAttempt(
  accessToken: string,
  activityId: string,
  idempotencyKey: string,
  input: SubmitActivityAttemptRequest,
): Promise<SubmitActivityAttemptResponse> {
  const path = LEARNING_PATHS.activityAttempts.replace(":activityId", activityId);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(10_000),
  });
  return readResponse<SubmitActivityAttemptResponse>(response);
}
