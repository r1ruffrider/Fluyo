import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, type JWTVerifyGetKey } from "jose";

import { SUPABASE_JWKS } from "./auth.tokens";

export const supabaseJwksProvider = {
  provide: SUPABASE_JWKS,
  inject: [ConfigService],
  useFactory(config: ConfigService): JWTVerifyGetKey {
    return createRemoteJWKSet(new URL(config.getOrThrow<string>("auth.jwksUrl")), {
      cooldownDuration: 60_000,
      timeoutDuration: 3_000,
    });
  },
};
