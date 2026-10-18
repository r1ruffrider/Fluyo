import type { BillingStatusResponse, LearningDashboardResponse } from "@fluyo/shared";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BillingApiError, fetchBillingStatus } from "../../lib/billing-api";
import { fetchLearningDashboard, LearningApiError } from "../../lib/learning-api";
import { getVerifiedWebIdentity } from "../../lib/supabase/identity";
import { signOut } from "../auth/actions";
import { ActivityCard } from "./activity-card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your learning flow | Fluyo",
  description: "Continue your saved Spanish practice, daily goal, and learning streak.",
};

function progressPercent(dashboard: LearningDashboardResponse): number {
  return Math.min(
    100,
    Math.round((dashboard.streak.todayCompletedActivities / dashboard.goal.dailyTarget) * 100),
  );
}

function billingLabel(status: BillingStatusResponse): string {
  if (!status.subscription) return "Free access";
  return status.subscription.accessGranted
    ? `${status.subscription.displayName} · active access`
    : `${status.subscription.displayName} · action needed`;
}

function UnavailableDashboard() {
  return (
    <main className="dashboard-shell">
      <section className="dashboard-state-card" role="alert">
        <span aria-hidden="true" className="dashboard-state-icon">
          ↻
        </span>
        <p className="eyebrow">Saved learning unavailable</p>
        <h1>We couldn&apos;t load your flow.</h1>
        <p>No progress has been changed. Retry when the API and database are available.</p>
        <Link className="button button-cobalt" href="/dashboard">
          Try again
        </Link>
        <Link className="dashboard-text-link" href="/">
          Back to Fluyo
        </Link>
      </section>
    </main>
  );
}

export default async function DashboardPage() {
  const identity = await getVerifiedWebIdentity();
  if (!identity) redirect("/login?error=authentication_required&next=%2Fdashboard");

  const [dashboardResult, billingResult] = await Promise.allSettled([
    fetchLearningDashboard(identity.accessToken),
    fetchBillingStatus(identity.accessToken),
  ]);

  if (dashboardResult.status === "rejected") {
    if (
      dashboardResult.reason instanceof LearningApiError &&
      dashboardResult.reason.status === 401
    ) {
      redirect("/login?error=authentication_required&next=%2Fdashboard");
    }
    return <UnavailableDashboard />;
  }
  if (
    billingResult.status === "rejected" &&
    billingResult.reason instanceof BillingApiError &&
    billingResult.reason.status === 401
  ) {
    redirect("/login?error=authentication_required&next=%2Fdashboard");
  }
  const dashboard = dashboardResult.value;
  const billing = billingResult.status === "fulfilled" ? billingResult.value : null;
  const firstUse = dashboard.recentProgress.length === 0;
  const goalComplete = dashboard.streak.todayCompletedActivities >= dashboard.goal.dailyTarget;
  const percent = progressPercent(dashboard);

  return (
    <main className="dashboard-shell">
      <header className="dashboard-nav">
        <Link aria-label="Fluyo home" className="wordmark" href="/">
          flu<span>yo</span>
        </Link>
        <nav aria-label="Dashboard navigation">
          <Link href="/account">Account</Link>
          <Link href="/billing">Billing</Link>
          <form action={signOut}>
            <button type="submit">Sign out</button>
          </form>
        </nav>
      </header>

      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Your learning flow</p>
          <h1>
            {goalComplete
              ? "Goal met. Keep the spark going."
              : firstUse
                ? "Ready for your first tiny win?"
                : "Pick up right where you left off."}
          </h1>
          <p>
            {goalComplete
              ? `You completed ${dashboard.streak.todayCompletedActivities} activities today.`
              : `${dashboard.streak.todayCompletedActivities} of ${dashboard.goal.dailyTarget} activities complete today.`}
          </p>
        </div>
        <div className="dashboard-streak" aria-label={`${dashboard.streak.currentDays} day streak`}>
          <span aria-hidden="true">🔥</span>
          <strong>{dashboard.streak.currentDays}</strong>
          <small>day streak</small>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-primary" aria-labelledby="next-practice-title">
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">Practice now</p>
              <h2 id="next-practice-title">
                {firstUse ? "Start your first lesson" : "Your next phrase"}
              </h2>
            </div>
            <span className="dashboard-time">About 2 min</span>
          </div>

          {dashboard.nextActivity ? (
            <ActivityCard
              activity={dashboard.nextActivity}
              initialIdempotencyKey={randomUUID()}
              key={dashboard.nextActivity.id}
            />
          ) : dashboard.access.unavailableReason === "entitlement_required" ? (
            <div className="dashboard-empty-card">
              <span aria-hidden="true">🔒</span>
              <h3>This lesson needs Fluyo Plus.</h3>
              <p>
                Your current access remains unchanged. Choose a plan to unlock the next activity.
              </p>
              <Link className="button button-cobalt" href="/pricing">
                See plans
              </Link>
            </div>
          ) : dashboard.access.unavailableReason === "catalog_empty" ? (
            <div className="dashboard-empty-card">
              <span aria-hidden="true">☕</span>
              <h3>The saved lesson catalog is empty.</h3>
              <p>You can still use the clearly labeled browser-only café preview.</p>
              <Link className="button button-cobalt" href="/learn">
                Open preview
              </Link>
            </div>
          ) : (
            <div className="dashboard-empty-card">
              <span aria-hidden="true">🎉</span>
              <h3>You completed every available activity.</h3>
              <p>Your confirmed progress is saved. Return when a new lesson is published.</p>
              <Link className="button button-outline" href="/">
                Explore Fluyo
              </Link>
            </div>
          )}
        </section>

        <aside className="dashboard-side" aria-label="Learning summary">
          <section className="dashboard-stat-card">
            <div className="dashboard-stat-heading">
              <div>
                <p className="eyebrow">Today&apos;s goal</p>
                <h2>
                  {dashboard.streak.todayCompletedActivities} / {dashboard.goal.dailyTarget}
                </h2>
              </div>
              <span>{percent}%</span>
            </div>
            <div
              aria-label={`${percent}% of today's goal complete`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={percent}
              className="dashboard-progress"
              role="progressbar"
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            <p>
              {goalComplete ? "Daily goal achieved." : "Each new correct activity counts once."}
            </p>
          </section>

          <section className="dashboard-stat-card dashboard-access-card">
            <p className="eyebrow">Access</p>
            {billing ? (
              <>
                <h2>{billingLabel(billing)}</h2>
                <p>Billing access comes from signed Stripe webhook state.</p>
              </>
            ) : (
              <>
                <h2>Status unavailable</h2>
                <p role="status">
                  Learning remains usable where access was already confirmed by the API.
                </p>
              </>
            )}
            <Link className="dashboard-text-link" href="/billing">
              Manage billing →
            </Link>
          </section>

          <section className="dashboard-stat-card">
            <p className="eyebrow">Practice settings</p>
            <h2>{dashboard.learningPreference.timezone}</h2>
            <p>
              Reminder{" "}
              {dashboard.notificationPreference.practiceReminderEnabled
                ? `set for ${dashboard.notificationPreference.reminderLocalTime}`
                : "is off"}
              . Delivery is not available yet.
            </p>
            <Link className="dashboard-text-link" href="/account">
              Open account →
            </Link>
          </section>
        </aside>
      </div>

      <section className="dashboard-recent" aria-labelledby="recent-progress-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">Saved progress</p>
            <h2 id="recent-progress-title">Recent lessons</h2>
          </div>
        </div>
        {dashboard.recentProgress.length ? (
          <ul>
            {dashboard.recentProgress.map((progress) => (
              <li key={progress.lessonId}>
                <span aria-hidden="true">{progress.completedAt ? "✓" : "→"}</span>
                <div>
                  <strong>{progress.lessonTitle}</strong>
                  <p>{progress.completedActivityIds.length} confirmed activities</p>
                </div>
                <small>{progress.completedAt ? "Complete" : "In progress"}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dashboard-recent-empty">
            Your server-confirmed lesson progress will appear here.
          </p>
        )}
      </section>
    </main>
  );
}
