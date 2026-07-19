import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { supabaseJwksProvider } from "./supabase-jwks.provider";
import { SupabaseJwtGuard } from "./supabase-jwt.guard";
import { SupabaseJwtService } from "./supabase-jwt.service";

@Module({
  controllers: [AuthController],
  providers: [supabaseJwksProvider, SupabaseJwtService, SupabaseJwtGuard],
  exports: [SupabaseJwtGuard],
})
export class AuthModule {}
