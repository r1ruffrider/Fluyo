import { Test } from "@nestjs/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("AppModule", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves the profile authorization dependencies", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://fluyo:fluyo@localhost:5432/fluyo");
    vi.stubEnv("SUPABASE_URL", "https://identity.example.com");
    vi.stubEnv("SUPABASE_JWKS_URL", "https://identity.example.com/auth/v1/.well-known/jwks.json");
    vi.stubEnv("SUPABASE_JWT_AUDIENCE", "authenticated");

    const { AppModule } = await import("./app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
