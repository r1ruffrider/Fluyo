import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SupabaseJwtGuard } from "../auth/supabase-jwt.guard";
import { SupabaseJwtService } from "../auth/supabase-jwt.service";
import { ActivityAttemptController } from "./activity-attempt.controller";
import { ActivityAttemptService } from "./activity-attempt.service";
import { LearningSettingsController } from "./learning-settings.controller";
import { LearningSettingsService } from "./learning-settings.service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ACTIVITY_ID = "22222222-2222-4222-8222-222222222222";
const KEY = "33333333-3333-4333-8333-333333333333";

describe("learning write controllers", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function startApplication() {
    const verify = vi.fn().mockResolvedValue({ id: USER_ID, email: null });
    const submit = vi.fn().mockResolvedValue({ attemptId: "attempt" });
    const updateGoal = vi.fn().mockResolvedValue({ dailyTarget: 4 });
    const getGoal = vi.fn().mockResolvedValue({ dailyTarget: 3 });
    const getLearningPreference = vi.fn();
    const updateLearningPreference = vi.fn();
    const getNotificationPreference = vi.fn();
    const updateNotificationPreference = vi.fn().mockResolvedValue({
      practiceReminderEnabled: true,
      reminderLocalTime: "08:15",
      deliveryAvailable: false,
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [ActivityAttemptController, LearningSettingsController],
      providers: [
        SupabaseJwtGuard,
        { provide: SupabaseJwtService, useValue: { verify } },
        { provide: ActivityAttemptService, useValue: { submit } },
        {
          provide: LearningSettingsService,
          useValue: {
            getGoal,
            updateGoal,
            getLearningPreference,
            updateLearningPreference,
            getNotificationPreference,
            updateNotificationPreference,
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
    );
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as { port: number };
    return {
      baseUrl: `http://127.0.0.1:${address.port}`,
      submit,
      updateGoal,
      updateNotificationPreference,
    };
  }

  it("requires authentication for attempt writes", async () => {
    const fixture = await startApplication();

    const response = await fetch(`${fixture.baseUrl}/activities/${ACTIVITY_ID}/attempts`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": KEY },
      body: JSON.stringify({ contentVersion: 1, selectedChoiceId: "hola" }),
    });

    expect(response.status).toBe(401);
    expect(fixture.submit).not.toHaveBeenCalled();
  });

  it("requires a UUID v4 idempotency key and rejects unknown body fields", async () => {
    const fixture = await startApplication();
    const authorization = "Bearer valid-token";
    const missingKey = await fetch(`${fixture.baseUrl}/activities/${ACTIVITY_ID}/attempts`, {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify({ contentVersion: 1, selectedChoiceId: "hola" }),
    });
    const invalidKey = await fetch(`${fixture.baseUrl}/activities/${ACTIVITY_ID}/attempts`, {
      method: "POST",
      headers: {
        authorization,
        "content-type": "application/json",
        "idempotency-key": "not-a-uuid",
      },
      body: JSON.stringify({ contentVersion: 1, selectedChoiceId: "hola" }),
    });
    const unknownField = await fetch(`${fixture.baseUrl}/activities/${ACTIVITY_ID}/attempts`, {
      method: "POST",
      headers: { authorization, "content-type": "application/json", "idempotency-key": KEY },
      body: JSON.stringify({ contentVersion: 1, selectedChoiceId: "hola", userId: USER_ID }),
    });

    expect(missingKey.status).toBe(400);
    expect(invalidKey.status).toBe(400);
    expect(unknownField.status).toBe(400);
    expect(fixture.submit).not.toHaveBeenCalled();
  });

  it("passes only the verified owner and validated request to the attempt service", async () => {
    const fixture = await startApplication();
    const response = await fetch(`${fixture.baseUrl}/activities/${ACTIVITY_ID}/attempts`, {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
        "idempotency-key": KEY,
      },
      body: JSON.stringify({ contentVersion: 1, selectedChoiceId: "hola" }),
    });

    expect(response.status).toBe(201);
    expect(fixture.submit).toHaveBeenCalledWith(USER_ID, ACTIVITY_ID, KEY, {
      contentVersion: 1,
      selectedChoiceId: "hola",
    });
  });

  it("enforces goal bounds and rejects owner selection", async () => {
    const fixture = await startApplication();
    const headers = { authorization: "Bearer valid-token", "content-type": "application/json" };
    const low = await fetch(`${fixture.baseUrl}/learning-goals/me`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ dailyTarget: 0 }),
    });
    const high = await fetch(`${fixture.baseUrl}/learning-goals/me`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ dailyTarget: 21 }),
    });
    const owner = await fetch(`${fixture.baseUrl}/learning-goals/me`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ dailyTarget: 4, userId: USER_ID }),
    });
    const valid = await fetch(`${fixture.baseUrl}/learning-goals/me`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ dailyTarget: 4 }),
    });

    expect([low.status, high.status, owner.status, valid.status]).toEqual([400, 400, 400, 200]);
    expect(fixture.updateGoal).toHaveBeenCalledOnce();
    expect(fixture.updateGoal).toHaveBeenCalledWith(USER_ID, { dailyTarget: 4 });
  });

  it("validates reminder booleans and local HH:mm times", async () => {
    const fixture = await startApplication();
    const headers = { authorization: "Bearer valid-token", "content-type": "application/json" };
    const invalid = await fetch(`${fixture.baseUrl}/notification-preferences/me`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ practiceReminderEnabled: "yes", reminderLocalTime: "25:00" }),
    });
    const valid = await fetch(`${fixture.baseUrl}/notification-preferences/me`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ practiceReminderEnabled: true, reminderLocalTime: "08:15" }),
    });

    expect(invalid.status).toBe(400);
    expect(valid.status).toBe(200);
    expect(fixture.updateNotificationPreference).toHaveBeenCalledWith(USER_ID, {
      practiceReminderEnabled: true,
      reminderLocalTime: "08:15",
    });
  });
});
