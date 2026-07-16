import { HEALTH_PATHS } from "@fluyo/shared";

import type { HealthResponse } from "@fluyo/shared";

const DEFAULT_API_URL = "http://localhost:4000/api/v1";

export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");

export async function fetchApi<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
    signal: AbortSignal.timeout(2_500),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as TResponse;
}

export function fetchHealth(): Promise<HealthResponse> {
  return fetchApi<HealthResponse>(HEALTH_PATHS.service);
}
