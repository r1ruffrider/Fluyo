import { Injectable } from "@nestjs/common";
import { FLUYO_API_SERVICE } from "@fluyo/shared";

import type { DatabaseHealthResponse, HealthResponse } from "@fluyo/shared";

import { DatabaseService } from "../database/database.service";

@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}

  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: FLUYO_API_SERVICE,
    };
  }

  async getDatabaseHealth(): Promise<DatabaseHealthResponse> {
    const isReachable = await this.database.isReachable();

    return {
      status: isReachable ? "ok" : "error",
      service: FLUYO_API_SERVICE,
      database: isReachable ? "reachable" : "unreachable",
    };
  }
}
