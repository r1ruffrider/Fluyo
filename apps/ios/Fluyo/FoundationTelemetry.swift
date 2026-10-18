import Foundation

enum FoundationTelemetryEvent: String, CaseIterable, Sendable {
    case appShellLoaded = "app_shell_loaded"
    case appShellFailed = "app_shell_failed"
    case appShellStateChanged = "app_shell_state_changed"
    case networkStateChanged = "network_state_changed"
    case reducedMotionApplied = "reduced_motion_applied"
}

enum FoundationTelemetryEnvironment: String, CaseIterable, Sendable {
    case development
    case staging
}

enum FoundationTelemetryOutcome: String, CaseIterable, Sendable {
    case loaded
    case failed
    case changed
    case online
    case offline
    case applied
}

enum FoundationDurationBucket: String, CaseIterable, Sendable {
    case under100Milliseconds = "under_100ms"
    case between100And499Milliseconds = "100_to_499ms"
    case between500And1999Milliseconds = "500_to_1999ms"
    case twoSecondsOrMore = "2000ms_or_more"
}

struct FoundationTelemetryContext: Equatable, Sendable {
    let platform = "ios"
    let environment: FoundationTelemetryEnvironment
    let isInternal = true
    let semanticVersion: String
    let buildNumber: String
    let sourceCommitShort: String
    let outcome: FoundationTelemetryOutcome
    let durationBucket: FoundationDurationBucket
}

protocol FoundationTelemetrySink: Sendable {
    func record(_ event: FoundationTelemetryEvent, context: FoundationTelemetryContext) async
}

struct NoOpFoundationTelemetrySink: FoundationTelemetrySink {
    func record(_: FoundationTelemetryEvent, context _: FoundationTelemetryContext) async {}
}
