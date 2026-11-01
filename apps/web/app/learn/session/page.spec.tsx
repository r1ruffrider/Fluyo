import type { LearningDashboardResponse, PublishedActivity } from "@fluyo/shared";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchLearningDashboardMock, getVerifiedWebIdentityMock } = vi.hoisted(() => ({
  fetchLearningDashboardMock: vi.fn(),
  getVerifiedWebIdentityMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new Error(`redirect:${destination}`);
  },
}));
vi.mock("../../../lib/supabase/identity", () => ({
  getVerifiedWebIdentity: getVerifiedWebIdentityMock,
}));
vi.mock("../../../lib/learning-api", () => ({
  fetchLearningDashboard: fetchLearningDashboardMock,
  LearningApiError: class LearningApiError extends Error {
    status: number;

    constructor(status: number) {
      super(`learning:${status}`);
      this.status = status;
    }
  },
}));

import LearningSessionPage from "./page";

const ACTIVITY: PublishedActivity = {
  id: "22222222-2222-4222-8222-222222222222",
  kind: "phrase_choice",
  contentVersion: 4,
  prompt: "Choose one",
  choices: [{ id: "one", label: "One" }],
};

function dashboard(nextActivity: PublishedActivity | null): LearningDashboardResponse {
  const updatedAt = "2026-10-18T00:00:00.000Z";
  return {
    access: {
      nextActivityAvailable: nextActivity !== null,
      unavailableReason: nextActivity ? null : "catalog_empty",
    },
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

function canvasElement(node: ReactNode): ReactElement {
  if (!isValidElement(node)) throw new Error("Expected page element");
  const children = (node.props as { children?: ReactNode }).children;
  if (!isValidElement(children)) throw new Error("Expected ConversationCanvas child");
  return children;
}

describe("learning session authoritative remount boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVerifiedWebIdentityMock.mockResolvedValue({ accessToken: "test-access-token" });
  });

  it("binds the key to authoritative presentation, activity, version, and fresh revalidation", async () => {
    fetchLearningDashboardMock.mockResolvedValue(dashboard(ACTIVITY));

    const first = canvasElement(await LearningSessionPage());
    const second = canvasElement(await LearningSessionPage());

    const firstIdentity = (first.props as { authoritativeInstanceKey: string })
      .authoritativeInstanceKey;
    const secondIdentity = (second.props as { authoritativeInstanceKey: string })
      .authoritativeInstanceKey;
    expect(firstIdentity).toContain(`active:${ACTIVITY.id}:${ACTIVITY.contentVersion}:`);
    expect(secondIdentity).not.toBe(firstIdentity);
  });

  it("changes the key when the authorized activity content version changes", async () => {
    fetchLearningDashboardMock
      .mockResolvedValueOnce(dashboard(ACTIVITY))
      .mockResolvedValueOnce(dashboard({ ...ACTIVITY, contentVersion: 5 }));

    const first = canvasElement(await LearningSessionPage());
    const second = canvasElement(await LearningSessionPage());

    const firstIdentity = (first.props as { authoritativeInstanceKey: string })
      .authoritativeInstanceKey;
    const secondIdentity = (second.props as { authoritativeInstanceKey: string })
      .authoritativeInstanceKey;
    expect(firstIdentity).toContain(":4:");
    expect(secondIdentity).toContain(":5:");
    expect(secondIdentity).not.toBe(firstIdentity);
  });

  it("keys the empty presentation separately from an active activity", async () => {
    fetchLearningDashboardMock.mockResolvedValue(dashboard(null));
    const empty = canvasElement(await LearningSessionPage());
    expect(
      (empty.props as { authoritativeInstanceKey: string }).authoritativeInstanceKey,
    ).toContain("empty_review:no-activity:no-version:");
  });
});
