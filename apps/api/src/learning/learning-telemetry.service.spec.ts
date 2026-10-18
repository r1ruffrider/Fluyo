import { describe, expect, it, vi } from "vitest";

import {
  LEARNING_EVENT_NAMES,
  LEARNING_METRIC_NAMES,
  LearningTelemetryService,
  type LearningTelemetrySink,
} from "./learning-telemetry.service";

const ACTIVITY_ID = "11111111-1111-4111-8111-111111111111";
const LESSON_ID = "22222222-2222-4222-8222-222222222222";

function createFixture() {
  const sink = {
    emit: vi.fn(),
    incrementCounter: vi.fn(),
    observeDuration: vi.fn(),
  } satisfies LearningTelemetrySink;
  return { sink, service: new LearningTelemetryService(sink) };
}

describe("LearningTelemetryService", () => {
  it("keeps the accepted event-name contract stable", () => {
    expect(LEARNING_EVENT_NAMES).toEqual([
      "learning.dashboard.loaded",
      "learning.attempt.processed",
      "learning.progress.updated",
      "learning.goal.updated",
      "learning.preference.updated",
      "learning.lifecycle.processed",
    ]);
  });

  it("records bounded attempt events, outcome counters, and duration histograms", () => {
    const { service, sink } = createFixture();

    service.recordAttempt({
      outcome: "correct",
      durationMs: 12.6,
      correlationId: "request-123",
      activityId: ACTIVITY_ID.toUpperCase(),
      lessonId: LESSON_ID,
    });

    expect(sink.emit).toHaveBeenCalledWith({
      eventName: "learning.attempt.processed",
      outcome: "correct",
      durationMs: 13,
      correlationId: "request-123",
      activityId: ACTIVITY_ID,
      lessonId: LESSON_ID,
    });
    expect(sink.incrementCounter).toHaveBeenCalledWith(
      LEARNING_METRIC_NAMES.attemptOutcomes,
      "correct",
    );
    expect(sink.observeDuration).toHaveBeenCalledWith(
      LEARNING_METRIC_NAMES.attemptDuration,
      13,
      "correct",
    );
  });

  it.each([
    ["duplicate", LEARNING_METRIC_NAMES.attemptDuplicates],
    ["conflict", LEARNING_METRIC_NAMES.attemptConflicts],
    ["rate_limited", LEARNING_METRIC_NAMES.attemptRateLimits],
    ["failed", LEARNING_METRIC_NAMES.attemptFailures],
  ] as const)("tracks the %s attempt counter", (outcome, metricName) => {
    const { service, sink } = createFixture();

    service.recordAttempt({ outcome, durationMs: 1 });

    expect(sink.incrementCounter).toHaveBeenCalledWith(metricName, outcome);
  });

  it("drops unbounded or malformed fields instead of logging sensitive input", () => {
    const { service, sink } = createFixture();

    service.recordAttempt({
      outcome: "failed",
      durationMs: Number.POSITIVE_INFINITY,
      correlationId: "person@example.com bearer secret",
      activityId: "selected-answer-text",
      lessonId: "provider-payload",
    });

    expect(sink.emit).toHaveBeenCalledWith({
      eventName: "learning.attempt.processed",
      outcome: "failed",
      durationMs: 0,
    });
    expect(JSON.stringify(sink.emit.mock.calls)).not.toContain("example.com");
    expect(JSON.stringify(sink.emit.mock.calls)).not.toContain("selected-answer-text");
    expect(JSON.stringify(sink.emit.mock.calls)).not.toContain("provider-payload");
  });

  it("never lets a telemetry sink failure change learning behavior", () => {
    const sink = {
      emit: vi.fn(() => {
        throw new Error("telemetry unavailable");
      }),
      incrementCounter: vi.fn(),
      observeDuration: vi.fn(),
    } satisfies LearningTelemetrySink;
    const service = new LearningTelemetryService(sink);

    expect(() => service.recordAttempt({ outcome: "correct", durationMs: 2 })).not.toThrow();
  });

  it("records the dashboard, progress, settings, and lifecycle contracts", () => {
    const { service, sink } = createFixture();

    service.recordDashboard({ outcome: "ready", durationMs: 8 });
    service.recordProgress({ outcome: "updated", activityId: ACTIVITY_ID, lessonId: LESSON_ID });
    service.recordGoal("updated");
    service.recordPreference({ outcome: "updated", preference: "timezone" });
    service.recordLifecycle({ outcome: "deleted", operation: "delete", durationMs: 4 });

    expect(sink.emit.mock.calls.map(([event]) => event.eventName)).toEqual([
      "learning.dashboard.loaded",
      "learning.progress.updated",
      "learning.goal.updated",
      "learning.preference.updated",
      "learning.lifecycle.processed",
    ]);
    expect(sink.observeDuration).toHaveBeenCalledWith(
      LEARNING_METRIC_NAMES.dashboardDuration,
      8,
      "ready",
    );
    expect(sink.emit).toHaveBeenLastCalledWith({
      eventName: "learning.lifecycle.processed",
      outcome: "deleted",
      durationMs: 4,
      operation: "delete",
    });
  });
});
