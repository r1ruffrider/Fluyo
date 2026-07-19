import {
  PROFILE_PATHS,
  type CurrentProfileResponse,
  type UpdateCurrentProfileRequest,
  type UserProfile,
} from "@fluyo/shared";

import { apiBaseUrl } from "./api-client";

function authorizationHeaders(accessToken: string): HeadersInit {
  return {
    accept: "application/json",
    authorization: `Bearer ${accessToken}`,
  };
}

export async function fetchCurrentProfile(accessToken: string): Promise<UserProfile | null> {
  const response = await fetch(`${apiBaseUrl}${PROFILE_PATHS.current}`, {
    cache: "no-store",
    headers: authorizationHeaders(accessToken),
    signal: AbortSignal.timeout(2_500),
  });

  if (!response.ok) {
    throw new Error(`Profile request failed with status ${response.status}`);
  }

  const data = (await response.json()) as CurrentProfileResponse;
  return data.profile;
}

export async function updateCurrentProfile(
  accessToken: string,
  input: UpdateCurrentProfileRequest,
): Promise<UserProfile> {
  const response = await fetch(`${apiBaseUrl}${PROFILE_PATHS.current}`, {
    method: "PUT",
    cache: "no-store",
    headers: {
      ...authorizationHeaders(accessToken),
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(2_500),
  });

  if (!response.ok) {
    throw new Error(`Profile update failed with status ${response.status}`);
  }

  return (await response.json()) as UserProfile;
}
