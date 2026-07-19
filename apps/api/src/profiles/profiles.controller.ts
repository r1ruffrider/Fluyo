import type { AuthenticatedIdentity, CurrentProfileResponse, UserProfile } from "@fluyo/shared";
import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";

import { CurrentIdentity } from "../auth/current-identity.decorator";
import { SupabaseJwtGuard } from "../auth/supabase-jwt.guard";
import { UpdateCurrentProfileDto } from "./dto/update-current-profile.dto";
import { ProfilesService } from "./profiles.service";

@Controller("profiles")
@UseGuards(SupabaseJwtGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get("me")
  async getCurrent(
    @CurrentIdentity() identity: AuthenticatedIdentity,
  ): Promise<CurrentProfileResponse> {
    return { profile: await this.profiles.findCurrent(identity.id) };
  }

  @Put("me")
  updateCurrent(
    @CurrentIdentity() identity: AuthenticatedIdentity,
    @Body() input: UpdateCurrentProfileDto,
  ): Promise<UserProfile> {
    return this.profiles.updateCurrent(identity.id, input);
  }
}
