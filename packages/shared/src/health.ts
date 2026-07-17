import type { FLUYO_API_SERVICE } from "./constants";

export type HealthStatus = "ok" | "error";
export type DatabaseStatus = "reachable" | "unreachable";

export interface HealthResponse {
  status: "ok";
  service: typeof FLUYO_API_SERVICE;
}

export interface DatabaseHealthResponse {
  status: HealthStatus;
  service: typeof FLUYO_API_SERVICE;
  database: DatabaseStatus;
}
