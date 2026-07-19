export const API_V1_PREFIX = "api/v1";
export const FLUYO_API_SERVICE = "fluyo-api";

export const HEALTH_PATHS = {
  service: "/health",
  database: "/health/database",
} as const;

export const IDENTITY_PATHS = {
  current: "/auth/me",
} as const;

export const PROFILE_PATHS = {
  current: "/profiles/me",
} as const;
