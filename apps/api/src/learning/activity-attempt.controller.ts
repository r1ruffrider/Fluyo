import type { AuthenticatedIdentity, SubmitActivityAttemptResponse } from "@fluyo/shared";
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { isUUID } from "class-validator";

import { CurrentIdentity } from "../auth/current-identity.decorator";
import { SupabaseJwtGuard } from "../auth/supabase-jwt.guard";
import { ActivityAttemptService } from "./activity-attempt.service";
import { SubmitActivityAttemptDto } from "./dto/submit-activity-attempt.dto";

@Controller("activities")
@UseGuards(SupabaseJwtGuard)
export class ActivityAttemptController {
  constructor(private readonly attempts: ActivityAttemptService) {}

  @Post(":activityId/attempts")
  submit(
    @CurrentIdentity() identity: AuthenticatedIdentity,
    @Param("activityId", new ParseUUIDPipe({ version: "4" })) activityId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() input: SubmitActivityAttemptDto,
  ): Promise<SubmitActivityAttemptResponse> {
    if (!idempotencyKey || !isUUID(idempotencyKey, 4)) {
      throw new BadRequestException("A UUID v4 Idempotency-Key header is required");
    }
    return this.attempts.submit(identity.id, activityId, idempotencyKey, input);
  }
}
