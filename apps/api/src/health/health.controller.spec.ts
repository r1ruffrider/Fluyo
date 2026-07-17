import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Response } from "express";

import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  let service: {
    getHealth: ReturnType<typeof vi.fn>;
    getDatabaseHealth: ReturnType<typeof vi.fn>;
  };
  let controller: HealthController;

  beforeEach(() => {
    service = {
      getHealth: vi.fn(),
      getDatabaseHealth: vi.fn(),
    };
    controller = new HealthController(service as unknown as HealthService);
  });

  it("delegates the service health response", () => {
    service.getHealth.mockReturnValue({ status: "ok", service: "fluyo-api" });

    expect(controller.getHealth()).toEqual({ status: "ok", service: "fluyo-api" });
  });

  it("sets a service-unavailable status when the database cannot be reached", async () => {
    service.getDatabaseHealth.mockResolvedValue({
      status: "error",
      service: "fluyo-api",
      database: "unreachable",
    });
    const status = vi.fn();
    const response = { status } as unknown as Response;

    await expect(controller.getDatabaseHealth(response)).resolves.toMatchObject({
      status: "error",
      database: "unreachable",
    });
    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });
});
