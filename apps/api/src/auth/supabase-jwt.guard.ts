import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

import type { AuthenticatedRequest } from "./authenticated-request";
import { SupabaseJwtService } from "./supabase-jwt.service";

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(private readonly jwtService: SupabaseJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match = /^Bearer ([^\s]+)$/u.exec(authorization ?? "");

    if (!match?.[1]) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      request.identity = await this.jwtService.verify(match[1]);
      return true;
    } catch {
      throw new UnauthorizedException("Authentication required");
    }
  }
}
