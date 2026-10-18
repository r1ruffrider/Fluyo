import type {
  AuthenticatedIdentity,
  LearningGoal,
  LearningPreference,
  NotificationPreference,
} from "@fluyo/shared";
import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";

import { CurrentIdentity } from "../auth/current-identity.decorator";
import { SupabaseJwtGuard } from "../auth/supabase-jwt.guard";
import { UpdateLearningGoalDto } from "./dto/update-learning-goal.dto";
import { UpdateLearningPreferenceDto } from "./dto/update-learning-preference.dto";
import { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto";
import { LearningSettingsService } from "./learning-settings.service";

@Controller()
@UseGuards(SupabaseJwtGuard)
export class LearningSettingsController {
  constructor(private readonly settings: LearningSettingsService) {}

  @Get("learning-goals/me")
  getGoal(@CurrentIdentity() identity: AuthenticatedIdentity): Promise<LearningGoal> {
    return this.settings.getGoal(identity.id);
  }

  @Put("learning-goals/me")
  updateGoal(
    @CurrentIdentity() identity: AuthenticatedIdentity,
    @Body() input: UpdateLearningGoalDto,
  ): Promise<LearningGoal> {
    return this.settings.updateGoal(identity.id, input);
  }

  @Get("learning-preferences/me")
  getLearningPreference(
    @CurrentIdentity() identity: AuthenticatedIdentity,
  ): Promise<LearningPreference> {
    return this.settings.getLearningPreference(identity.id);
  }

  @Put("learning-preferences/me")
  updateLearningPreference(
    @CurrentIdentity() identity: AuthenticatedIdentity,
    @Body() input: UpdateLearningPreferenceDto,
  ): Promise<LearningPreference> {
    return this.settings.updateLearningPreference(identity.id, input);
  }

  @Get("notification-preferences/me")
  getNotificationPreference(
    @CurrentIdentity() identity: AuthenticatedIdentity,
  ): Promise<NotificationPreference> {
    return this.settings.getNotificationPreference(identity.id);
  }

  @Put("notification-preferences/me")
  updateNotificationPreference(
    @CurrentIdentity() identity: AuthenticatedIdentity,
    @Body() input: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    return this.settings.updateNotificationPreference(identity.id, input);
  }
}
