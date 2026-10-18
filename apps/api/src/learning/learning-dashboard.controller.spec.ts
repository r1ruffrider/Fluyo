import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SupabaseJwtGuard } from "../auth/supabase-jwt.guard";
import { SupabaseJwtService } from "../auth/supabase-jwt.service";
import { LearningDashboardController } from "./learning-dashboard.controller";
import { LearningDashboardService } from "./learning-dashboard.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("LearningDashboardController", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function startApplication() {
    const getDashboard = vi.fn().mockResolvedValue({ nextActivity: null });
    const moduleRef = await Test.createTestingModule({
      controllers: [LearningDashboardController],
      providers: [
        SupabaseJwtGuard,
        {
          provide: SupabaseJwtService,
          useValue: { verify: vi.fn().mockResolvedValue({ id: USER_ID, email: null }) },
        },
        { provide: LearningDashboardService, useValue: { getDashboard } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as { port: number };
    return { baseUrl: `http://127.0.0.1:${address.port}`, getDashboard };
  }

  it("requires authentication", async () => {
    const fixture = await startApplication();

    const response = await fetch(`${fixture.baseUrl}/learning/dashboard`);

    expect(response.status).toBe(401);
    expect(fixture.getDashboard).not.toHaveBeenCalled();
  });

  it("passes only the verified owner to the aggregate", async () => {
    const fixture = await startApplication();

    const response = await fetch(`${fixture.baseUrl}/learning/dashboard`, {
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(200);
    expect(fixture.getDashboard).toHaveBeenCalledWith(USER_ID);
  });
});
