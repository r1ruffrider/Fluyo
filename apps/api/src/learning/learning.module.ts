import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { DatabaseModule } from "../database/database.module";
import {
  ActivityAttemptAdmissionService,
  ACTIVITY_ATTEMPT_REPLAY_STORE,
} from "./activity-attempt-admission.service";
import { ActivityAttemptController } from "./activity-attempt.controller";
import {
  ACTIVITY_ATTEMPT_RATE_LIMITER,
  InMemoryActivityAttemptRateLimiter,
} from "./activity-attempt-rate-limiter";
import { ActivityAttemptService } from "./activity-attempt.service";
import { LearningSettingsController } from "./learning-settings.controller";
import { LearningSettingsService } from "./learning-settings.service";
import { PrismaActivityAttemptReplayStore } from "./prisma-activity-attempt-replay.store";

@Module({
  imports: [AuthModule, BillingModule, DatabaseModule],
  controllers: [ActivityAttemptController, LearningSettingsController],
  providers: [
    PrismaActivityAttemptReplayStore,
    {
      provide: ACTIVITY_ATTEMPT_REPLAY_STORE,
      useExisting: PrismaActivityAttemptReplayStore,
    },
    {
      provide: ACTIVITY_ATTEMPT_RATE_LIMITER,
      useFactory: () => new InMemoryActivityAttemptRateLimiter(),
    },
    ActivityAttemptAdmissionService,
    ActivityAttemptService,
    LearningSettingsService,
  ],
  exports: [ActivityAttemptService, LearningSettingsService],
})
export class LearningModule {}
