import type {
  BillingStatusResponse,
  LearningDashboardResponse,
  PublishedActivity,
} from "@fluyo/shared";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchBillingStatusMock, fetchLearningDashboardMock, getVerifiedWebIdentityMock } =
  vi.hoisted(() => ({
    fetchBillingStatusMock: vi.fn(),
    fetchLearningDashboardMock: vi.fn(),
    getVerifiedWebIdentityMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new Error(`redirect:${destination}`);
  },
}));
vi.mock("../../lib/supabase/identity", () => ({
  getVerifiedWebIdentity: getVerifiedWebIdentityMock,
}));
vi.mock("../../lib/learning-api", () => ({
  fetchLearningDashboard: fetchLearningDashboardMock,
  LearningApiError: class LearningApiError extends Error {
    status: number;

    constructor(status: number) {
      super(`learning:${status}`);
      this.status = status;
    }
  },
}));
vi.mock("../../lib/billing-api", () => ({
  fetchBillingStatus: fetchBillingStatusMock,
  BillingApiError: class BillingApiError extends Error {
    status: number;

    constructor(status: number) {
      super(`billing:${status}`);
      this.status = status;
    }
  },
}));

import { ActivityCard } from "./activity-card";
import DashboardPage from "./page";

const ACTIVITY_A: PublishedActivity = {
  id: "22222222-2222-4222-8222-222222222222",
  kind: "phrase_choice",
  contentVersion: 1,
  prompt: "Choose A",
  choices: [{ id: "a", label: "A" }],
};
const ACTIVITY_B: PublishedActivity = {
  id: "33333333-3333-4333-8333-333333333333",
  kind: "phrase_choice",
  contentVersion: 1,
  prompt: "Choose B",
  choices: [{ id: "b", label: "B" }],
};
const BILLING: BillingStatusResponse = { entitlements: [], subscription: null };

function dashboard(nextActivity: PublishedActivity): LearningDashboardResponse {
  const updatedAt = "2026-10-18T00:00:00.000Z";
  return {
    access: { nextActivityAvailable: true, unavailableReason: null },
    goal: { dailyTarget: 3, updatedAt },
    learningPreference: { timezone: "UTC", updatedAt },
    nextActivity,
    notificationPreference: {
      deliveryAvailable: false,
      practiceReminderEnabled: false,
      reminderLocalTime: "09:00",
      updatedAt,
    },
    recentProgress: [],
    streak: { currentDays: 0, practicedToday: false, todayCompletedActivities: 0 },
  };
}

function findActivityCard(node: ReactNode): ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findActivityCard(child);
      if (match) return match;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  if (node.type === ActivityCard) return node;
  return findActivityCard((node.props as { children?: ReactNode }).children);
}

describe("dashboard activity transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVerifiedWebIdentityMock.mockResolvedValue({ accessToken: "test-access-token" });
    fetchBillingStatusMock.mockResolvedValue(BILLING);
  });

  it("gives the next activity a new component key and attempt key without a page reload", async () => {
    fetchLearningDashboardMock
      .mockResolvedValueOnce(dashboard(ACTIVITY_A))
      .mockResolvedValueOnce(dashboard(ACTIVITY_B));

    const firstCard = findActivityCard(await DashboardPage());
    const secondCard = findActivityCard(await DashboardPage());

    expect(firstCard?.key).toBe(ACTIVITY_A.id);
    expect(secondCard?.key).toBe(ACTIVITY_B.id);
    expect(firstCard?.key).not.toBe(secondCard?.key);

    const firstAttemptKey = (firstCard?.props as { initialIdempotencyKey?: string })
      .initialIdempotencyKey;
    const secondAttemptKey = (secondCard?.props as { initialIdempotencyKey?: string })
      .initialIdempotencyKey;
    expect(firstAttemptKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(secondAttemptKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(firstAttemptKey).not.toBe(secondAttemptKey);
  });
});
