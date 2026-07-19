import type { AuthenticatedIdentity, CurrentIdentityResponse } from "@fluyo/shared";
import { Controller, Get, UseGuards } from "@nestjs/common";

import { CurrentIdentity } from "./current-identity.decorator";
import { SupabaseJwtGuard } from "./supabase-jwt.guard";

@Controller("auth")
@UseGuards(SupabaseJwtGuard)
export class AuthController {
  @Get("me")
  getCurrentIdentity(@CurrentIdentity() identity: AuthenticatedIdentity): CurrentIdentityResponse {
    return { identity };
  }
}
