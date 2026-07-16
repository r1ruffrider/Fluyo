import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Mock } from "vitest";

import { DatabaseService } from "../database/database.service";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  let isReachable: Mock<() => Promise<boolean>>;
  let service: HealthService;

  beforeEach(() => {
    isReachable = vi.fn();
    service = new HealthService({ isReachable } as unknown as DatabaseService);
  });

  it("returns the service health response", () => {
    expect(service.getHealth()).toEqual({
      status: "ok",
      service: "fluyo-api",
    });
  });

  it("returns a safe reachable database response", async () => {
    isReachable.mockResolvedValue(true);

    await expect(service.getDatabaseHealth()).resolves.toEqual({
      status: "ok",
      service: "fluyo-api",
      database: "reachable",
    });
  });

  it("returns a safe failure response without connection details", async () => {
    isReachable.mockResolvedValue(false);

    await expect(service.getDatabaseHealth()).resolves.toEqual({
      status: "error",
      service: "fluyo-api",
      database: "unreachable",
    });
  });
});
