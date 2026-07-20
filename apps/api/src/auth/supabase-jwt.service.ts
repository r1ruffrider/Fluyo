import type { AuthenticatedIdentity } from "@fluyo/shared";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { jwtVerify, type JWTVerifyGetKey } from "jose";

import { SUPABASE_JWKS } from "./auth.tokens";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

@Injectable()
export class SupabaseJwtService {
  private readonly audience: string;
  private readonly issuer: string;

  constructor(
    @Inject(SUPABASE_JWKS) private readonly jwks: JWTVerifyGetKey,
    config: ConfigService,
  ) {
    this.audience = config.getOrThrow<string>("auth.audience");
    this.issuer = config.getOrThrow<string>("auth.issuer");
  }

  async verify(token: string): Promise<AuthenticatedIdentity> {
    const { payload } = await jwtVerify(token, this.jwks, {
      algorithms: ["ES256", "RS256"],
      audience: this.audience,
      issuer: this.issuer,
      requiredClaims: ["exp", "sub"],
    });

    if (typeof payload.sub !== "string" || !UUID_PATTERN.test(payload.sub)) {
      throw new Error("Supabase access token has an invalid subject");
    }

    return {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
    };
  }
}
