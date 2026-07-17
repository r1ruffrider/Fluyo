import { Controller, Get, HttpStatus, Res } from "@nestjs/common";

import type { DatabaseHealthResponse, HealthResponse } from "@fluyo/shared";
import type { Response } from "express";

import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthResponse {
    return this.healthService.getHealth();
  }

  @Get("database")
  async getDatabaseHealth(
    @Res({ passthrough: true }) response: Response,
  ): Promise<DatabaseHealthResponse> {
    const health = await this.healthService.getDatabaseHealth();

    if (health.status === "error") {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return health;
  }
}
