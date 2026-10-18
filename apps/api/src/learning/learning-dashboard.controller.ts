import type { AuthenticatedIdentity, LearningDashboardResponse } from "@fluyo/shared";
import { Controller, Get, UseGuards } from "@nestjs/common";

import { CurrentIdentity } from "../auth/current-identity.decorator";
import { SupabaseJwtGuard } from "../auth/supabase-jwt.guard";
import { LearningDashboardService } from "./learning-dashboard.service";

@Controller("learning")
@UseGuards(SupabaseJwtGuard)
export class LearningDashboardController {
  constructor(private readonly dashboard: LearningDashboardService) {}

  @Get("dashboard")
  getDashboard(
    @CurrentIdentity() identity: AuthenticatedIdentity,
  ): Promise<LearningDashboardResponse> {
    return this.dashboard.getDashboard(identity.id);
  }
}
