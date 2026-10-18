import { afterEach, describe, expect, it, vi } from "vitest";

import { BillingApiError, fetchBillingStatus } from "./billing-api";
import { fetchLearningDashboard, LearningApiError, submitLearningAttempt } from "./learning-api";

const ACTIVITY_ID = "22222222-2222-4222-8222-222222222222";
const KEY = "33333333-3333-4333-8333-333333333333";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("learning API client", () => {
  it("requests the protected dashboard without caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ nextActivity: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchLearningDashboard("access-token")).resolves.toEqual({ nextActivity: null });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/learning/dashboard",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({ authorization: "Bearer access-token" }),
      }),
    );
  });

  it("submits the server-issued activity fields with one idempotency key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: "correct" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await submitLearningAttempt("access-token", ACTIVITY_ID, KEY, {
      contentVersion: 2,
      selectedChoiceId: "hola",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:4000/api/v1/activities/${ACTIVITY_ID}/attempts`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer access-token",
          "idempotency-key": KEY,
        }),
        body: JSON.stringify({ contentVersion: 2, selectedChoiceId: "hola" }),
      }),
    );
  });

  it("preserves learning and billing HTTP status for safe UI handling", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(fetchLearningDashboard("expired")).rejects.toEqual(new LearningApiError(401));
    await expect(fetchBillingStatus("expired")).rejects.toEqual(new BillingApiError(401));
  });
});
