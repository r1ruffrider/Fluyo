import { Inject, Injectable, Logger } from "@nestjs/common";

export const LEARNING_TELEMETRY_SINK = Symbol("LEARNING_TELEMETRY_SINK");

export const LEARNING_EVENT_NAMES = [
  "learning.dashboard.loaded",
  "learning.attempt.processed",
  "learning.progress.updated",
  "learning.goal.updated",
  "learning.preference.updated",
  "learning.lifecycle.processed",
] as const;

export const LEARNING_METRIC_NAMES = {
  attemptOutcomes: "learning.attempt.outcomes",
  attemptDuplicates: "learning.attempt.duplicates",
  attemptConflicts: "learning.attempt.conflicts",
  attemptRateLimits: "learning.attempt.rate_limits",
  attemptFailures: "learning.attempt.failures",
  attemptDuration: "learning.attempt.duration_ms",
  dashboardDuration: "learning.dashboard.duration_ms",
} as const;

export type LearningMetricName = (typeof LEARNING_METRIC_NAMES)[keyof typeof LEARNING_METRIC_NAMES];

type LearningEventName = (typeof LEARNING_EVENT_NAMES)[number];
type AttemptOutcome =
  "correct" | "incorrect" | "duplicate" | "conflict" | "denied" | "rate_limited" | "failed";

export type LearningTelemetryOutcome =
  AttemptOutcome | "empty" | "ready" | "updated" | "unchanged" | "deleted";

export interface LearningTelemetryEvent {
  eventName: LearningEventName;
  outcome: LearningTelemetryOutcome;
  durationMs?: number;
  correlationId?: string;
  activityId?: string;
  lessonId?: string;
  operation?: "export" | "delete";
  preference?: "timezone" | "notification";
}

export interface LearningTelemetrySink {
  emit(event: LearningTelemetryEvent): void;
  incrementCounter(metricName: LearningMetricName, outcome: LearningTelemetryOutcome): void;
  observeDuration(
    metricName: LearningMetricName,
    durationMs: number,
    outcome: LearningTelemetryOutcome,
  ): void;
}

@Injectable()
export class LoggerLearningTelemetrySink implements LearningTelemetrySink {
  private readonly logger = new Logger("LearningTelemetry");

  emit(event: LearningTelemetryEvent): void {
    this.logger.log(event);
  }

  incrementCounter(metricName: LearningMetricName, outcome: LearningTelemetryOutcome): void {
    this.logger.log({ metricName, metricType: "counter", outcome, value: 1 });
  }

  observeDuration(
    metricName: LearningMetricName,
    durationMs: number,
    outcome: LearningTelemetryOutcome,
  ): void {
    this.logger.log({ metricName, metricType: "histogram", outcome, value: durationMs });
  }
}

function safeCorrelationId(value: string | undefined): string | undefined {
  return value && value.length <= 100 && /^[A-Za-z0-9._:-]+$/u.test(value) ? value : undefined;
}

function safeUuid(value: string | undefined): string | undefined {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
    ? value.toLowerCase()
    : undefined;
}

function safeDuration(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
}

@Injectable()
export class LearningTelemetryService {
  constructor(
    @Inject(LEARNING_TELEMETRY_SINK)
    private readonly sink: LearningTelemetrySink,
  ) {}

  recordAttempt(input: {
    outcome: AttemptOutcome;
    durationMs: number;
    correlationId?: string;
    activityId?: string;
    lessonId?: string;
  }): void {
    const event = this.event("learning.attempt.processed", input.outcome, input);
    this.publish(() => {
      this.sink.emit(event);
      this.sink.incrementCounter(LEARNING_METRIC_NAMES.attemptOutcomes, input.outcome);
      if (input.outcome === "duplicate") {
        this.sink.incrementCounter(LEARNING_METRIC_NAMES.attemptDuplicates, input.outcome);
      }
      if (input.outcome === "conflict") {
        this.sink.incrementCounter(LEARNING_METRIC_NAMES.attemptConflicts, input.outcome);
      }
      if (input.outcome === "rate_limited") {
        this.sink.incrementCounter(LEARNING_METRIC_NAMES.attemptRateLimits, input.outcome);
      }
      if (input.outcome === "failed") {
        this.sink.incrementCounter(LEARNING_METRIC_NAMES.attemptFailures, input.outcome);
      }
      this.sink.observeDuration(
        LEARNING_METRIC_NAMES.attemptDuration,
        event.durationMs ?? 0,
        input.outcome,
      );
    });
  }

  recordDashboard(input: {
    outcome: "empty" | "ready" | "failed";
    durationMs: number;
    correlationId?: string;
  }): void {
    const event = this.event("learning.dashboard.loaded", input.outcome, input);
    this.publish(() => {
      this.sink.emit(event);
      this.sink.observeDuration(
        LEARNING_METRIC_NAMES.dashboardDuration,
        event.durationMs ?? 0,
        input.outcome,
      );
    });
  }

  recordProgress(input: {
    outcome: "updated" | "unchanged";
    activityId?: string;
    lessonId?: string;
  }): void {
    this.publish(() =>
      this.sink.emit(this.event("learning.progress.updated", input.outcome, input)),
    );
  }

  recordGoal(outcome: "updated" | "failed"): void {
    this.publish(() => this.sink.emit(this.event("learning.goal.updated", outcome)));
  }

  recordPreference(input: {
    outcome: "updated" | "failed";
    preference: "timezone" | "notification";
  }): void {
    this.publish(() =>
      this.sink.emit({
        ...this.event("learning.preference.updated", input.outcome),
        preference: input.preference,
      }),
    );
  }

  recordLifecycle(input: {
    outcome: "ready" | "deleted" | "empty" | "failed";
    operation: "export" | "delete";
    durationMs: number;
  }): void {
    this.publish(() =>
      this.sink.emit({
        ...this.event("learning.lifecycle.processed", input.outcome, input),
        operation: input.operation,
      }),
    );
  }

  private event(
    eventName: LearningEventName,
    outcome: LearningTelemetryOutcome,
    optional: {
      durationMs?: number;
      correlationId?: string;
      activityId?: string;
      lessonId?: string;
    } = {},
  ): LearningTelemetryEvent {
    const correlationId = safeCorrelationId(optional.correlationId);
    const activityId = safeUuid(optional.activityId);
    const lessonId = safeUuid(optional.lessonId);

    return {
      eventName,
      outcome,
      ...(optional.durationMs === undefined
        ? {}
        : { durationMs: safeDuration(optional.durationMs) }),
      ...(correlationId ? { correlationId } : {}),
      ...(activityId ? { activityId } : {}),
      ...(lessonId ? { lessonId } : {}),
    };
  }

  private publish(action: () => void): void {
    try {
      action();
    } catch {
      // Observability is best effort and must never change learning behavior.
    }
  }
}
