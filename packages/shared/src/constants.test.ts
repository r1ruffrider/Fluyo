import { describe, expect, it } from "vitest";

import { API_V1_PREFIX, FLUYO_API_SERVICE, HEALTH_PATHS } from "./constants";

describe("shared API constants", () => {
  it("defines the versioned health endpoint contract", () => {
    expect(API_V1_PREFIX).toBe("api/v1");
    expect(FLUYO_API_SERVICE).toBe("fluyo-api");
    expect(HEALTH_PATHS).toEqual({
      service: "/health",
      database: "/health/database",
    });
  });
});
