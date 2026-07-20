import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedRequest } from "./authenticated-request";
import { SupabaseJwtGuard } from "./supabase-jwt.guard";
import type { SupabaseJwtService } from "./supabase-jwt.service";

const IDENTITY = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "learner@example.com",
};

function createContext(authorization?: string): {
  context: ExecutionContext;
  request: AuthenticatedRequest;
} {
  const request = {
    headers: authorization ? { authorization } : {},
  } as AuthenticatedRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;

  return { context, request };
}

describe("SupabaseJwtGuard", () => {
  it("denies a request without an Authorization header", async () => {
    const jwtService = { verify: vi.fn() } as unknown as SupabaseJwtService;
    const guard = new SupabaseJwtGuard(jwtService);

    await expect(guard.canActivate(createContext().context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it("denies a malformed bearer credential", async () => {
    const jwtService = { verify: vi.fn() } as unknown as SupabaseJwtService;
    const guard = new SupabaseJwtGuard(jwtService);

    await expect(
      guard.canActivate(createContext("Basic credentials").context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it("denies a token that fails verification without exposing the cause", async () => {
    const jwtService = {
      verify: vi.fn().mockRejectedValue(new Error("signature mismatch")),
    } as unknown as SupabaseJwtService;
    const guard = new SupabaseJwtGuard(jwtService);

    await expect(
      guard.canActivate(createContext("Bearer invalid-token").context),
    ).rejects.toMatchObject({ message: "Authentication required" });
  });

  it("attaches the verified identity to an authenticated request", async () => {
    const jwtService = {
      verify: vi.fn().mockResolvedValue(IDENTITY),
    } as unknown as SupabaseJwtService;
    const guard = new SupabaseJwtGuard(jwtService);
    const { context, request } = createContext("Bearer valid-token");

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith("valid-token");
    expect(request.identity).toEqual(IDENTITY);
  });
});
