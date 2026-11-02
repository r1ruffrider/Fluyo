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

function findSessionLink(node: ReactNode): ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findSessionLink(child);
      if (match) return match;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  if ((node.props as { href?: string }).href === "/learn/session") return node;
  return findSessionLink((node.props as { children?: ReactNode }).children);
}

describe("dashboard activity transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVerifiedWebIdentityMock.mockResolvedValue({ accessToken: "test-access-token" });
    fetchBillingStatusMock.mockResolvedValue(BILLING);
  });

  it("links each server-authorized next activity to the dedicated session document", async () => {
    fetchLearningDashboardMock
      .mockResolvedValueOnce(dashboard(ACTIVITY_A))
      .mockResolvedValueOnce(dashboard(ACTIVITY_B));

    const firstLink = findSessionLink(await DashboardPage());
    const secondLink = findSessionLink(await DashboardPage());

    expect((firstLink?.props as { href?: string }).href).toBe("/learn/session");
    expect((secondLink?.props as { href?: string }).href).toBe("/learn/session");
  });
});
