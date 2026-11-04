import Foundation
import XCTest
@testable import Fluyo

private enum SyntheticAuthFixture {
    static func candidate() -> OpaqueSessionCandidate { .init("synthetic") }
    static func ingress() -> OpaqueCallbackIngress { .init("https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected") }
}

final class AuthRuntimeKernelTests: XCTestCase {
    private enum DiagnosticStage: String { case snapshot, trace }
    private enum CorpusCheckpointStage: String, CaseIterable {
        case manifest, fingerprint, step, snapshot, effects, drain, trace, wipe
        case rejectedWrites = "rejected_writes"
        case completions, exchange, generation, terminal, invariant
    }
    private final class CorpusStageObserver {
        struct ActiveStage {
            let corpusId: String, stage: CorpusCheckpointStage
        }
        private var activeStage: ActiveStage?

        func begin(_ corpusId: String, _ stage: CorpusCheckpointStage) {
            activeStage = .init(corpusId: corpusId, stage: stage)
        }
        func finishStage() -> ActiveStage? {
            defer { activeStage = nil }
            return activeStage
        }
        func currentStage() -> ActiveStage? { activeStage }
        func reset() { activeStage = nil }
    }
    private let corpusStageObserver = CorpusStageObserver()
    private static let regularFailureStages: Set<CorpusCheckpointStage> = [
        .fingerprint, .step, .snapshot, .effects, .drain, .trace, .wipe, .rejectedWrites,
        .completions, .generation, .terminal, .invariant,
    ]
    private static let invariantDiagnosticsByCorpus: [String: Set<String>] = [
        "generation_change_cancels_work_and_blocks_stale_writes": [
            "comparison_start_timeout", "comparison_release_timeout",
        ],
        "evidence_is_closed_and_mutation_safe": [
            "terminal_not_fenced_after_initialize", "terminal_not_fenced_after_receive_callback",
            "terminal_not_fenced_after_cancel_callback", "terminal_not_fenced_after_handle_401",
            "terminal_not_fenced_after_handle_403", "terminal_not_fenced_after_schedule_timeout",
            "terminal_not_fenced_after_delayed_announcement", "terminal_not_fenced_after_sign_out",
            "terminal_not_fenced_after_switch_account", "terminal_not_fenced_after_entrypoint_sequence",
        ],
    ]
    private static let diagnosticCorpusId = "cold_start_without_candidate"
    private static let checkpointCorpusIds: Set<String> = [
        "corpus_manifest",
        "cold_start_without_candidate", "cold_start_with_candidate", "warm_callback_success", "cold_callback_success",
        "callback_cancel", "callback_malformed", "callback_expired", "callback_replay", "callback_duplicate_delivery",
        "callback_unsupported", "callback_overlap_rejected", "refresh_success", "refresh_explicit_revocation",
        "refresh_transient_failure_preserves_candidate", "refresh_repeated_401_clears", "forbidden_403_preserves_session",
        "offline_startup_preserves_verified_display_only", "background_foreground", "termination_relaunch_without_transaction",
        "account_switch_cleanup", "stale_response_discarded", "stale_storage_write_discarded", "vault_corruption_cleanup",
        "clock_skew", "owner_subject_mismatch", "zero_telemetry_launch", "zero_telemetry_resume", "zero_telemetry_error",
        "public_state_is_secret_free", "callback_transaction_is_purpose_environment_host_path_and_expiry_bound",
        "callback_transaction_consumes_once_and_wipes", "valid_verified_session_survives_bad_link",
        "generation_change_cancels_work_and_blocks_stale_writes", "owner_data_waits_for_private_subject_confirmation",
        "transient_refresh_failure_preserves_candidate", "explicit_invalidation_and_repeated_401_clear",
        "403_never_refreshes_or_signs_out", "offline_never_confirms_new_owner_or_expands_access",
        "cleanup_precedes_signed_out_or_new_owner_exposure", "no_op_telemetry_has_zero_retention_and_zero_transport",
        "evidence_is_closed_and_mutation_safe",
    ]
    private struct Vector {
        let kind: String, id: String, initial: String
        let steps: [String], times: [UInt64], completions: [String], snapshots: [String]
        let effects: [String], trace: [String], wipe: String, rejectedWrites: Int
        let generation: UInt64, terminal: Bool, digest: String
        init(_ f: [String]) throws {
            guard f.count == 14, let generation = UInt64(f[11]), let rejected = Int(f[10]) else { throw CorpusError.invalid }
            kind = f[0]; id = f[1]; initial = f[2]; steps = f[3].split(separator: ">").map(String.init)
            times = try f[4].split(separator: ">").map { guard let value = UInt64($0) else { throw CorpusError.invalid }; return value }
            completions = f[5].split(separator: ">").map(String.init); snapshots = f[6].split(separator: ">").map(String.init)
            effects = Self.split(f[7]); trace = Self.split(f[8]); wipe = f[9]; rejectedWrites = rejected
            self.generation = generation; terminal = f[12] == "1"; digest = f[13]
        }
        private static func split(_ value: String) -> [String] { value == "-" ? [] : value.split(separator: ">").map(String.init) }
    }

    func testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups() async throws {
        let observer = corpusStageObserver
        observer.reset()
        defer { observer.reset() }
        let rows = try await observeStage("corpus_manifest", .manifest, observer: observer) {
            let rows = try loadCorpus(); try requireCorpusAssertion(rows.filter { $0.kind == "scenario" }.count == 28); try requireCorpusAssertion(rows.filter { $0.kind == "invariant" }.count == 13); return rows
        }
        for (index, vector) in rows.enumerated() { try await run(vector, observer: observer); print("AUTH_KERNEL_VECTOR \(index) \(vector.id) \(vector.digest) PASS") }
        closeObservedStage(observer)
    }

    func testSerializedCoordinatorFencesEveryCleanupAwaitAndPublishesOnlyAfterConfirmation() async throws {
        let row = try XCTUnwrap(try loadCorpus().first { $0.id == "account_switch_cleanup" }); try await run(row)
    }

    func testCleanupFailureIsFencedAndDelayedEffectsAreGenerationBoundOneShot() async throws {
        let row = try XCTUnwrap(try loadCorpus().first { $0.id == "cleanup_precedes_signed_out_or_new_owner_exposure" }); try await run(row)
    }

    func testExactStepAndTotalTimeoutBoundariesAndGenerationOverflowFailClosed() async throws {
        let timeout = try XCTUnwrap(try loadCorpus().first { $0.id == "zero_telemetry_error" }); try await run(timeout)
        let overflow = try XCTUnwrap(try loadCorpus().first { $0.id == "evidence_is_closed_and_mutation_safe" }); try await run(overflow)
        let ports = ScriptPorts(times: [30_000]); let coordinator = makeCoordinator(ports); await coordinator.scheduleTimeout(.totalActionable)
        let requests = await ports.clock.requests(); XCTAssertEqual(requests, [30_000])
        await verifyLateTimerRegistrationCancellation()
    }

    func testDiagnosticGrammarAndFallbackSelectionAreTotalAndClosed() {
        let snapshots = ["count", "shape", "state", "candidate", "owner", "destination", "outcome", "generation"]
        for mismatch in snapshots {
            XCTAssertEqual(selectBoundedDiagnostic(Self.diagnosticCorpusId, .snapshot, mismatch), "[auth_corpus_\(Self.diagnosticCorpusId)_stage_snapshot_\(mismatch)]")
        }
        XCTAssertEqual(selectBoundedDiagnostic(Self.diagnosticCorpusId, .snapshot, "none"), "[auth_corpus_stage_snapshot_diagnostic_inconsistent]")

        XCTAssertEqual(selectBoundedDiagnostic(Self.diagnosticCorpusId, .trace, "sequence_unavailable"), "[auth_corpus_\(Self.diagnosticCorpusId)_stage_trace_sequence_unavailable]")
        let counts = (0...63).map(String.init) + ["64_plus"]
        for expected in counts { for actual in counts {
            let mismatch = "count_expected_\(expected)_actual_\(actual)"
            XCTAssertEqual(selectBoundedDiagnostic(Self.diagnosticCorpusId, .trace, mismatch), "[auth_corpus_\(Self.diagnosticCorpusId)_stage_trace_\(mismatch)]")
        }}
        let traceValues = traceDiagnosticValues.sorted()
        for index in 0...63 { for expected in traceValues { for actual in traceValues {
            let mismatch = "sequence_index_\(index)_expected_\(expected)_actual_\(actual)"
            XCTAssertEqual(selectBoundedDiagnostic(Self.diagnosticCorpusId, .trace, mismatch), "[auth_corpus_\(Self.diagnosticCorpusId)_stage_trace_\(mismatch)]")
        }}}
        XCTAssertEqual(selectBoundedDiagnostic(Self.diagnosticCorpusId, .trace, "none"), "[auth_corpus_stage_trace_diagnostic_inconsistent]")

        let privateInput = "private_value"
        for stage in [DiagnosticStage.snapshot, .trace] {
            let invalid = selectBoundedDiagnostic(Self.diagnosticCorpusId, stage, privateInput)
            let wrongCorpus = selectBoundedDiagnostic("callback_cancel", stage, "none")
            XCTAssertEqual(invalid, "[auth_corpus_stage_\(stage.rawValue)_diagnostic_rejected]")
            XCTAssertEqual(wrongCorpus, "[auth_corpus_stage_\(stage.rawValue)_diagnostic_rejected]")
            XCTAssertFalse(invalid.contains(privateInput)); XCTAssertFalse(wrongCorpus.contains("callback_cancel"))
        }
        for stage in CorpusCheckpointStage.allCases {
            XCTAssertEqual(selectCorpusCheckpoint(Self.diagnosticCorpusId, stage), "[auth_corpus_\(Self.diagnosticCorpusId)_stage_\(stage.rawValue)_checkpoint]")
        }
        let rejectedCheckpoint = selectCorpusCheckpoint(privateInput, .step)
        XCTAssertEqual(rejectedCheckpoint, "[auth_corpus_stage_diagnostic_rejected]")
        XCTAssertFalse(rejectedCheckpoint.contains(privateInput))
        for (corpusId, mismatches) in Self.invariantDiagnosticsByCorpus {
            for mismatch in mismatches {
                XCTAssertEqual(selectInvariantDiagnostic(corpusId, mismatch), "[auth_corpus_\(corpusId)_stage_invariant_\(mismatch)]")
            }
        }
        let rejectedInvariant = selectInvariantDiagnostic(privateInput, privateInput)
        XCTAssertEqual(rejectedInvariant, "[auth_corpus_stage_diagnostic_rejected]")
        XCTAssertFalse(rejectedInvariant.contains(privateInput))
        for corpusId in Self.checkpointCorpusIds where corpusId != "corpus_manifest" {
            for stage in Self.regularFailureStages {
                XCTAssertEqual(selectRecordedAssertionDiagnostic(corpusId, stage), "[auth_corpus_\(corpusId)_stage_\(stage.rawValue)_assertion_recorded]")
            }
        }
        XCTAssertEqual(selectRecordedAssertionDiagnostic("corpus_manifest", .manifest), "[auth_corpus_corpus_manifest_stage_manifest_assertion_recorded]")
        XCTAssertEqual(selectRecordedAssertionDiagnostic("warm_callback_success", .exchange), "[auth_corpus_warm_callback_success_stage_exchange_assertion_recorded]")
        XCTAssertEqual(selectRecordedAssertionDiagnostic(privateInput, .step), "[auth_corpus_stage_diagnostic_rejected]")
        XCTAssertEqual(selectRecordedAssertionDiagnostic("callback_cancel", .exchange), "[auth_corpus_stage_diagnostic_rejected]")
    }

    func testUnexpectedCorpusErrorIsConvertedToPayloadFreeSentinel() async {
        struct PrivateUnexpectedCorpusError: Error, CustomStringConvertible {
            let description = "private_unexpected_corpus_token"
        }
        do {
            let _: Void = try await observeStage("callback_cancel", .step, observer: nil) {
                throw PrivateUnexpectedCorpusError()
            }
            XCTFail("expected payload-free corpus sentinel")
        } catch CorpusError.diagnosticAbort {
            // The closed sentinel is the only permitted escaping value.
        } catch {
            XCTFail("unexpected error type escaped corpus observation")
        }
    }

    private func run(_ vector: Vector, observer: CorpusStageObserver? = nil) async throws {
        try await observeStage(vector.id, .fingerprint, observer: observer) { try requireCorpusAssertion(vector.digest == Self.digest) }
        let ports = ScriptPorts(times: vector.times, completionCommands: vector.completions.filter { $0 != "none" })
        let coordinator = makeCoordinator(ports, generation: vector.initial == "overflow" ? .max : 1)
        var rejected = 0
        for step in vector.steps {
            rejected += try await observeStage(vector.id, .step, observer: observer) {
                try await execute(step, coordinator, ports)
            }
        }
        try await observeStage(vector.id, .snapshot, observer: observer) {
            let snapshots = await coordinator.snapshotHistory().map { normalize($0.0, $0.1) }
            try requireCorpusMatch(snapshots == vector.snapshots, vector.id, .snapshot, snapshotMismatch(vector.snapshots, snapshots))
        }
        try await observeStage(vector.id, .effects, observer: observer) {
            let fullEffectHistory = await coordinator.presentationEffectHistory().map(normalize); try requireCorpusAssertion(fullEffectHistory == vector.effects)
        }
        let generation = try await observeStage(vector.id, .drain, observer: observer) {
            let generation = await coordinator.currentGeneration(); let firstDrain = await coordinator.drainPresentationEffects(for: generation)
            let secondDrain = await coordinator.drainPresentationEffects(for: generation); let staleDrain = await coordinator.drainPresentationEffects(for: generation == 1 ? 2 : 1)
            try requireCorpusAssertion(firstDrain.allSatisfy { $0.generation == generation }); try requireCorpusAssertion(secondDrain.isEmpty); try requireCorpusAssertion(staleDrain.isEmpty); return generation
        }
        let trace = await coordinator.normalizedTrace().map(\.rawValue); let wipe = await ports.wipeSummary(); let terminal = await coordinator.isTerminalFenced(); let completions = await ports.completionValues()
        try await observeStage(vector.id, .trace, observer: observer) { try assertFenceTraceSemantics(vector.id, trace); try requireCorpusMatch(trace == vector.trace, vector.id, .trace, traceMismatch(vector.trace, trace)) }
        try await observeStage(vector.id, .wipe, observer: observer) { try requireCorpusAssertion(wipe == vector.wipe) }
        try await observeStage(vector.id, .rejectedWrites, observer: observer) { try requireCorpusAssertion(rejected == vector.rejectedWrites) }
        try await observeStage(vector.id, .completions, observer: observer) { try requireCorpusAssertion(completions == vector.completions.filter { $0 != "none" }) }
        if vector.id == "warm_callback_success" { try await observeStage(vector.id, .exchange, observer: observer) { let exchanged = await ports.provider.lastExchangeValue(); try requireCorpusAssertion(exchanged == "opaque-pkce") } }
        try await observeStage(vector.id, .generation, observer: observer) { try requireCorpusAssertion(generation == vector.generation) }
        try await observeStage(vector.id, .terminal, observer: observer) { try requireCorpusAssertion(terminal == vector.terminal) }
        try await observeStage(vector.id, .invariant, observer: observer) { try await validateInvariant(vector.id, coordinator, ports) }
    }

    private func assertFenceTraceSemantics(_ id: String, _ trace: [String]) throws {
        switch id {
        case "callback_cancel":
            guard let fence = trace.firstIndex(of: AuthTraceEntry.generationFence.rawValue) else { try failCurrentStageAssertion() }
            guard let snapshot = trace.indices.first(where: { $0 > fence && trace[$0] == AuthTraceEntry.snapshotPublished.rawValue }) else { try failCurrentStageAssertion() }
            guard let stale = trace.firstIndex(of: AuthTraceEntry.staleRejected.rawValue) else { try failCurrentStageAssertion() }
            try requireCorpusAssertion(fence < snapshot); try requireCorpusAssertion(snapshot < stale)
            try requireCorpusAssertion(trace.filter { $0 == AuthTraceEntry.staleRejected.rawValue }.count == 1)
        case "stale_response_discarded", "generation_change_cancels_work_and_blocks_stale_writes":
            guard let fence = trace.firstIndex(of: AuthTraceEntry.generationFence.rawValue) else { try failCurrentStageAssertion() }
            guard let stale = trace.firstIndex(of: AuthTraceEntry.staleRejected.rawValue) else { try failCurrentStageAssertion() }
            guard let purge = trace.firstIndex(of: AuthTraceEntry.callbackPurge.rawValue) else { try failCurrentStageAssertion() }
            try requireCorpusAssertion(fence < stale); try requireCorpusAssertion(stale < purge)
            try requireCorpusAssertion(trace.filter { $0 == AuthTraceEntry.staleRejected.rawValue }.count == 1)
        case "callback_malformed":
            try requireCorpusAssertion(!trace.contains(AuthTraceEntry.staleRejected.rawValue))
        default: break
        }
    }

    private func execute(_ step: String, _ coordinator: AuthRuntimeCoordinator, _ ports: ScriptPorts) async throws -> Int {
        switch step {
        case "init_none": await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true)
        case "init_candidate": await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true)
        case "init_offline": await ports.vault.setReadCandidate(true); await coordinator.initialize(online: false)
        case "callback_success": await ports.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await coordinator.receiveCallback(SyntheticAuthFixture.ingress())
        case "callback_malformed", "strict_callback":
            await ports.callback.setResult(.malformed); await coordinator.receiveCallback(SyntheticAuthFixture.ingress()); if step == "strict_callback" { try await strictCallbackChecks() }
        case "callback_expired": await ports.callback.setResult(.expired); await coordinator.receiveCallback(SyntheticAuthFixture.ingress())
        case "callback_replay": await ports.callback.setResult(.replayed); await coordinator.receiveCallback(SyntheticAuthFixture.ingress())
        case "callback_duplicate": await ports.callback.setResult(.duplicate); await coordinator.receiveCallback(SyntheticAuthFixture.ingress())
        case "callback_unsupported": await ports.callback.setResult(.unsupported); await coordinator.receiveCallback(SyntheticAuthFixture.ingress())
        case "callback_store_fail": await ports.callback.setResult(.failed); await coordinator.receiveCallback(SyntheticAuthFixture.ingress())
        case "callback_cancel":
            await ports.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await ports.provider.setSuspendExchange(true)
            let callbackCancelIngress = SyntheticAuthFixture.ingress()
            async let work: Void = coordinator.receiveCallback(callbackCancelIngress); await ports.provider.waitExchangeStarted(); await coordinator.cancelCallback(); await ports.provider.releaseExchange(); _ = await work; try await verifyWarmCancelPreservesCandidate(); try await verifyCancelAvailabilityBoundaries(); return 1
        case "callback_overlap":
            await ports.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await ports.provider.setSuspendExchange(true)
            let callbackOverlapIngress = SyntheticAuthFixture.ingress()
            let task = Task { await coordinator.receiveCallback(callbackOverlapIngress) }
            await ports.provider.waitExchangeStarted(); await coordinator.receiveCallback(SyntheticAuthFixture.ingress()); task.cancel(); await ports.provider.releaseExchange(); _ = await task.value; return 1
        case "refresh_success": await ports.provider.setRefreshResult(.success(SyntheticAuthFixture.candidate())); await coordinator.handle401(SyntheticAuthFixture.candidate())
        case "refresh_invalid": await ports.provider.setRefreshResult(.explicitInvalidation); await coordinator.handle401(SyntheticAuthFixture.candidate())
        case "refresh_transient": await ports.provider.setRefreshResult(.transientFailure); await coordinator.handle401(SyntheticAuthFixture.candidate())
        case "refresh_repeated": await ports.provider.setRefreshResult(.success(SyntheticAuthFixture.candidate())); await coordinator.handle401(SyntheticAuthFixture.candidate()); await coordinator.handle401(SyntheticAuthFixture.candidate())
        case "refresh_boundary_checks": try await verifyRefreshTimerBoundaries()
        case "forbidden": await coordinator.handle403()
        case "noop", "telemetry_noop", "source_scan": break
        case "switch": await coordinator.switchAccount()
        case "signout": await coordinator.signOut()
        case "signout_during_exchange":
            await ports.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await ports.provider.setSuspendExchange(true)
            let signOutExchangeIngress = SyntheticAuthFixture.ingress()
            async let work: Void = coordinator.receiveCallback(signOutExchangeIngress); await ports.provider.waitExchangeStarted(); await coordinator.signOut(); await ports.provider.releaseExchange(); _ = await work; return 1
        case "signout_during_replace":
            await ports.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await ports.vault.setSuspendReplace(true)
            let signOutReplaceIngress = SyntheticAuthFixture.ingress()
            async let work: Void = coordinator.receiveCallback(signOutReplaceIngress); await ports.vault.waitReplaceStarted(); await coordinator.signOut(); await ports.vault.releaseReplace(); _ = await work; return 1
        case "vault_replace_fail": await ports.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await ports.vault.setReplaceResult(.failed); await coordinator.receiveCallback(SyntheticAuthFixture.ingress()); return 1
        case "owner_bind_fail": await ports.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await ports.owner.setBindResult(.failed); await coordinator.receiveCallback(SyntheticAuthFixture.ingress()); return 1
        case "timeout15": await coordinator.scheduleTimeout(.providerOrApiStep); try await verifyTotalTimeoutBoundary()
        case "timeout30": await coordinator.scheduleTimeout(.totalActionable)
        case "callback_purge_fail", "cleanup_each_failure":
            await ports.callback.setPurgeResult(.failed); await coordinator.signOut(); if step == "cleanup_each_failure" { try await verifyEveryCleanupFailureLatches() }; return 1
        case "terminal_entrypoints": try await exerciseTerminalEntryPoints(coordinator); return 9
        case "effect_drain": break
        default: try failCurrentStageAssertion()
        }
        return 0
    }

    private func validateInvariant(_ id: String, _ coordinator: AuthRuntimeCoordinator, _ ports: ScriptPorts) async throws {
        switch id {
        case "public_state_is_secret_free": let snapshot = await coordinator.snapshot(); try requireCorpusAssertion(Mirror(reflecting: snapshot).children.compactMap(\.label) == ["state", "hasSessionCandidate", "hasVerifiedOwnerState", "safeDestinationId", "fixedOutcomeCategory"]); try await verifyCompletionAuditTracksRemainingCommands()
        case "callback_transaction_is_purpose_environment_host_path_and_expiry_bound": let calls = await ports.callback.callCount(); try requireCorpusAssertion(calls > 0); try await verifyCallbackStoreFailure()
        case "callback_transaction_consumes_once_and_wipes":
            let store = StrictCallbackStore(now: 999, expiresAt: 1_000); let first = await store.validateConsumeAndWipe(SyntheticAuthFixture.ingress(), generation: 1); let second = await store.validateConsumeAndWipe(SyntheticAuthFixture.ingress(), generation: 1); let empty = await store.confirmEmpty(generation: 1); let calls = await ports.vault.replaceCallsAfterSeed()
            guard case .consumed = first else { try failCurrentStageAssertion() }; guard case .replayed = second else { try failCurrentStageAssertion() }; try requireCorpusAssertion(empty); try requireCorpusAssertion(calls == 0)
        case "valid_verified_session_survives_bad_link": let snapshot = await coordinator.snapshot(); try requireCorpusAssertion(snapshot.state == .unusableLink); try requireCorpusAssertion(snapshot.hasVerifiedOwnerState)
        case "generation_change_cancels_work_and_blocks_stale_writes": let trace = await coordinator.normalizedTrace(); try requireCorpusAssertion(trace.contains(.staleRejected)); try await verifySwitchFencesInFlight(); try await verifyCallbackValidationCancellationPrecedesPurge(); try await verifyEveryDestructiveMutationRejectsStaleGeneration()
        case "owner_data_waits_for_private_subject_confirmation": let snapshot = await coordinator.snapshot(); try requireCorpusAssertion(!snapshot.hasVerifiedOwnerState); try await verifyMutationBoundaries()
        case "transient_refresh_failure_preserves_candidate": let snapshot = await coordinator.snapshot(); try requireCorpusAssertion(snapshot.hasSessionCandidate == .present)
        case "explicit_invalidation_and_repeated_401_clear": let snapshot = await coordinator.snapshot(); try requireCorpusAssertion(snapshot.hasSessionCandidate == .absent)
        case "403_never_refreshes_or_signs_out": let calls = await ports.provider.refreshCallCount(); let snapshot = await coordinator.snapshot(); try requireCorpusAssertion(calls == 0); try requireCorpusAssertion(snapshot.state == .safeTerminalError); try requireCorpusAssertion(snapshot.hasVerifiedOwnerState)
        case "offline_never_confirms_new_owner_or_expands_access": let calls = await ports.provider.verifyCallCount(); let snapshot = await coordinator.snapshot(); try requireCorpusAssertion(calls == 0); try requireCorpusAssertion(!snapshot.hasVerifiedOwnerState)
        case "cleanup_precedes_signed_out_or_new_owner_exposure": let terminal = await coordinator.isTerminalFenced(); try requireCorpusAssertion(terminal); try await verifyDelayedEffectCancellation(); try await verifyCleanupReservationLiveness(); try await verifyPostFenceCancellationIsIrrevocable(); try await verifySuppressedStaleLifecycle()
        case "evidence_is_closed_and_mutation_safe":
            let terminal = await coordinator.isTerminalFenced()
            if !terminal { try failInvariant(id, "terminal_not_fenced_after_entrypoint_sequence") }
        case "no_op_telemetry_has_zero_retention_and_zero_transport": try requireCorpusAssertion(Mirror(reflecting: TrapTelemetry()).children.count == 0)
        default: break
        }
    }

    private func verifyCompletionAuditTracksRemainingCommands() async throws {
        let audit = CompletionAudit(["vault_none"])
        let before = await audit.hasCommands(), consumed = await audit.take(["vault_none"]), after = await audit.hasCommands()
        try requireCorpusAssertion(before); try requireCorpusAssertion(consumed == "vault_none"); try requireCorpusAssertion(!after)
    }

    private func verifyLateTimerRegistrationCancellation() async {
        do {
            let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports)
            await ports.clock.setSuspendRegistration(true); await ports.vault.setSuspendRead(true)
            let work = Task { await coordinator.initialize(online: true) }
            await ports.vault.waitReadStarted(); await ports.clock.waitRegistrationStarted(); await ports.vault.releaseRead(); await work.value
            let snapshot = await coordinator.snapshot(), history = await coordinator.presentationEffectHistory()
            XCTAssertEqual(snapshot.state, .signedOut); XCTAssertTrue(history.isEmpty)
        }
        do {
            let ports = ScriptPorts(times: [0, 0]); let coordinator = makeCoordinator(ports)
            await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true)
            await ports.clock.setSuspendRegistration(true); await ports.provider.setSuspendRefresh(true)
            let refreshCandidate = SyntheticAuthFixture.candidate()
            let work = Task { await coordinator.handle401(refreshCandidate) }
            await ports.provider.waitRefreshStarted(); await ports.clock.waitRegistrationStarted(); await ports.provider.releaseRefresh(); await work.value
            let snapshot = await coordinator.snapshot(), history = await coordinator.presentationEffectHistory()
            XCTAssertEqual(snapshot.state, .authenticated); XCTAssertTrue(history.isEmpty)
        }
    }

    private func strictCallbackChecks() async throws {
        let valid = StrictCallbackStore(now: 999, expiresAt: 1_000); guard case let .consumed(candidate) = await valid.validateConsumeAndWipe(SyntheticAuthFixture.ingress(), generation: 1) else { try failCurrentStageAssertion() }; try requireCorpusAssertion(candidate.storage == "opaque-pkce"); try requireCorpusAssertion(candidate.storage != "expected")
        guard case .replayed = await valid.validateConsumeAndWipe(SyntheticAuthFixture.ingress(), generation: 1) else { try failCurrentStageAssertion() }
        let distinct = StrictCallbackStore(now: 999, expiresAt: 1_000, oauthState: "state-two", verifier: "verifier-two")
        let distinctIngress = OpaqueCallbackIngress("https://auth.dev.fluyo.test/native/auth/callback?code=x&state=state-two&nonce=expected")
        guard case let .consumed(verifier) = await distinct.validateConsumeAndWipe(distinctIngress, generation: 1) else { try failCurrentStageAssertion() }; try requireCorpusAssertion(verifier.storage == "verifier-two")
        let expired = StrictCallbackStore(now: 1_000, expiresAt: 1_000); guard case .expired = await expired.validateConsumeAndWipe(SyntheticAuthFixture.ingress(), generation: 1) else { try failCurrentStageAssertion() }
        let rollback = StrictCallbackStore(now: 999, expiresAt: 2_000, issuedAt: 1_000); guard case .expired = await rollback.validateConsumeAndWipe(SyntheticAuthFixture.ingress(), generation: 1) else { try failCurrentStageAssertion() }
        let pendingAdversaries = [
            StrictCallbackStore(now: 999, expiresAt: 1_000, purpose: "other"), StrictCallbackStore(now: 999, expiresAt: 1_000, environment: "prod"),
            StrictCallbackStore(now: 999, expiresAt: 1_000, host: "other.dev.fluyo.test"), StrictCallbackStore(now: 999, expiresAt: 1_000, path: "/other"),
            StrictCallbackStore(now: 999, expiresAt: 1_000, oauthState: "other"), StrictCallbackStore(now: 999, expiresAt: 1_000, nonce: "other"),
        ]
        for store in pendingAdversaries { guard case .malformed = await store.validateConsumeAndWipe(SyntheticAuthFixture.ingress(), generation: 1) else { try failCurrentStageAssertion() } }
        let adversaries = [
            "http://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected",
            "https://AUTH.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected",
            "https://auth.dev.fluyo.test/native/auth/%63allback?code=x&state=expected&nonce=expected",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&state=x&nonce=expected",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected#x",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected\0",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected\r",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected\n",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected\t",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expecté",
        ]
        for raw in adversaries { let store = StrictCallbackStore(now: 999, expiresAt: 1_000); guard case .malformed = await store.validateConsumeAndWipe(.init(raw), generation: 1) else { try failCurrentStageAssertion() } }
    }

    private func verifyEveryCleanupFailureLatches() async throws {
        for failure in CleanupFailure.allCases {
            let ports = ScriptPorts(times: [0]); await failure.apply(ports); let coordinator = makeCoordinator(ports); await coordinator.signOut()
            let terminal = await coordinator.isTerminalFenced(); let snapshot = await coordinator.snapshot(); let generation = await coordinator.currentGeneration()
            let effects = await coordinator.drainPresentationEffects(for: generation); let audit = await ports.audit.values(); let persistence = await ports.persistence()
            try requireCorpusAssertion(terminal); try requireCorpusAssertion(snapshot.fixedOutcomeCategory == .transientFailure)
            try requireCorpusAssertion(effects.count == 1); if let effect = effects.first { try assertTerminalEffect(effect, generation) }
            let secondDrain = await coordinator.drainPresentationEffects(for: generation); let staleDrain = await coordinator.drainPresentationEffects(for: generation == 1 ? 2 : 1)
            try requireCorpusAssertion(secondDrain.isEmpty); try requireCorpusAssertion(staleDrain.isEmpty); try requireCorpusAssertion(audit == failure.expectedPrefix)
            try requireCorpusAssertion(persistence == failure.expectedPersistence)
        }
    }

    private func verifyWarmCancelPreservesCandidate() async throws {
        let ports = ScriptPorts(times: [0, 0, 500]); let coordinator = makeCoordinator(ports)
        await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true)
        await ports.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await ports.provider.setSuspendExchange(true)
        let warmCancelIngress = SyntheticAuthFixture.ingress()
        async let work: Void = coordinator.receiveCallback(warmCancelIngress); await ports.provider.waitExchangeStarted(); await coordinator.cancelCallback(); await ports.provider.releaseExchange(); _ = await work
        let snapshot = await coordinator.snapshot(); let generation = await coordinator.currentGeneration(); let effects = await coordinator.drainPresentationEffects(for: generation)
        try requireCorpusAssertion(snapshot.state == .authenticated); try requireCorpusAssertion(snapshot.hasSessionCandidate == .present); try requireCorpusAssertion(snapshot.hasVerifiedOwnerState)
        try requireCorpusAssertion(snapshot.fixedOutcomeCategory == .canceled); try requireCorpusAssertion(effects.isEmpty)
    }

    private func verifyCancelAvailabilityBoundaries() async throws {
        for now in [UInt64(499), 500, 501] {
            let ports = ScriptPorts(times: [0, 0, now]); let coordinator = makeCoordinator(ports)
            await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true)
            await ports.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await ports.provider.setSuspendExchange(true)
            let boundaryIngress = SyntheticAuthFixture.ingress()
            async let work: Void = coordinator.receiveCallback(boundaryIngress); await ports.provider.waitExchangeStarted(); await coordinator.cancelCallback()
            let afterCancel = await coordinator.snapshot()
            if now < 500 { await coordinator.signOut() }
            await ports.provider.releaseExchange(); _ = await work
            if now < 500 { try requireCorpusAssertion(afterCancel.state == .callbackPending) }
            else { try requireCorpusAssertion(afterCancel.fixedOutcomeCategory == .canceled) }
        }
    }

    private func verifyTotalTimeoutBoundary() async throws {
        let ports = ScriptPorts(times: [0, 30_000]); let coordinator = makeCoordinator(ports); await coordinator.scheduleTimeout(.totalActionable)
        let requests = await ports.clock.requests(); let snapshot = await coordinator.snapshot(); try requireCorpusAssertion(requests == [30_000]); try requireCorpusAssertion(snapshot.fixedOutcomeCategory == .timedOut)
        try await verifyCallbackContextTimeouts()
        try await verifyRefreshContextExits()
    }

    private func verifyCallbackContextTimeouts() async throws {
        for warm in [false, true] {
            for kind in [AuthTimeoutKind.providerOrApiStep, .totalActionable] {
                let times: [UInt64] = warm ? [0, 0, kind.milliseconds] : [0, kind.milliseconds]; let ports = ScriptPorts(times: times); let coordinator = makeCoordinator(ports)
                if warm { await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true) }
                await ports.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await ports.provider.setSuspendExchange(true)
                let timeoutIngress = SyntheticAuthFixture.ingress()
                async let work: Void = coordinator.receiveCallback(timeoutIngress); await ports.provider.waitExchangeStarted(); await coordinator.scheduleTimeout(kind); _ = await work
                let snapshot = await coordinator.snapshot(); try requireCorpusAssertion(snapshot.state == .safeTerminalError); try requireCorpusAssertion(snapshot.hasSessionCandidate == (warm ? .present : .absent)); try requireCorpusAssertion(snapshot.hasVerifiedOwnerState == warm); try requireCorpusAssertion(snapshot.safeDestinationId == (warm ? .internalFoundationHome : .signedOut)); try requireCorpusAssertion(snapshot.fixedOutcomeCategory == .timedOut)
                let history = await coordinator.presentationEffectHistory(); try requireCorpusAssertion(history.compactMap { $0.payload.announcement } == [.callbackPending, .safeTerminalError]); let trace = await coordinator.normalizedTrace(); try requireCorpusAssertion(trace.contains(.staleRejected))
            }
        }
    }

    private func verifyRefreshContextExits() async throws {
        for (kind, expectedState) in [(AuthTimeoutKind.providerOrApiStep, AuthRuntimeState.offlineSessionCandidate), (.totalActionable, .safeTerminalError)] {
            let ports = ScriptPorts(times: [0, 0, kind.milliseconds]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true); await ports.provider.setSuspendRefresh(true)
            let timeoutCandidate = SyntheticAuthFixture.candidate()
            async let work: Void = coordinator.handle401(timeoutCandidate); await ports.provider.waitRefreshStarted(); await coordinator.scheduleTimeout(kind); _ = await work
            let snapshot = await coordinator.snapshot(); try requireCorpusAssertion(snapshot.state == expectedState); try requireCorpusAssertion(snapshot.hasSessionCandidate == .present); try requireCorpusAssertion(snapshot.hasVerifiedOwnerState); try requireCorpusAssertion(snapshot.fixedOutcomeCategory == .timedOut)
        }
        let ports = ScriptPorts(times: [0, 0, 500]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true); await ports.provider.setSuspendRefresh(true)
        let cancelCandidate = SyntheticAuthFixture.candidate()
        async let work: Void = coordinator.handle401(cancelCandidate); await ports.provider.waitRefreshStarted(); await coordinator.cancelRefresh(); _ = await work
        let snapshot = await coordinator.snapshot(); try requireCorpusAssertion(snapshot.state == .offlineSessionCandidate); try requireCorpusAssertion(snapshot.fixedOutcomeCategory == .canceled)
    }

    private func verifyRefreshTimerBoundaries() async throws {
        for elapsed in [UInt64(499), 500, 501] {
            let ports = ScriptPorts(times: [0, 0]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true); await ports.clock.setDelayedElapsed(elapsed); await ports.provider.setSuspendRefresh(true)
            let timerCandidate = SyntheticAuthFixture.candidate()
            async let work: Void = coordinator.handle401(timerCandidate); await ports.provider.waitRefreshStarted()
            let history = await coordinator.presentationEffectHistory()
            await ports.provider.releaseRefresh(); _ = await work
            try requireCorpusAssertion(history.count == (elapsed < 500 ? 0 : 1))
            if let effect = history.first { try requireCorpusAssertion(effect.originatingState == .refreshPending); try requireCorpusAssertion(effect.payload.focus == .heading); try requireCorpusAssertion(effect.payload.announcement == .refreshPending); try requireCorpusAssertion(effect.payload.priority == .polite); try requireCorpusAssertion(effect.payload.navigation == nil) }
            let generation = await coordinator.currentGeneration(); let drained = await coordinator.drainPresentationEffects(for: generation); try requireCorpusAssertion(drained.isEmpty); let finalHistory = await coordinator.presentationEffectHistory(); try requireCorpusAssertion(finalHistory.count == (elapsed < 500 ? 0 : 1))
        }
    }

    private func verifyMutationBoundaries() async throws {
        for result in [ConditionalMutationResult.failed, .staleGeneration] {
            let vaultPorts = ScriptPorts(times: [0]); let vaultCoordinator = makeCoordinator(vaultPorts); await vaultPorts.vault.setReadCandidate(false); await vaultCoordinator.initialize(online: true); await vaultPorts.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await vaultPorts.vault.setReplaceResult(result); await vaultCoordinator.receiveCallback(SyntheticAuthFixture.ingress())
            let vaultSnapshot = await vaultCoordinator.snapshot(); let vaultWipe = await vaultPorts.wipeSummary(); try requireCorpusAssertion(vaultSnapshot.state == .safeTerminalError); try requireCorpusAssertion(vaultSnapshot.hasSessionCandidate == .absent); try requireCorpusAssertion(vaultWipe == "callback_headers_vault_owner_confirm")
            let ownerPorts = ScriptPorts(times: [0]); let ownerCoordinator = makeCoordinator(ownerPorts); await ownerPorts.vault.setReadCandidate(false); await ownerCoordinator.initialize(online: true); await ownerPorts.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await ownerPorts.owner.setBindResult(result); await ownerCoordinator.receiveCallback(SyntheticAuthFixture.ingress())
            let ownerSnapshot = await ownerCoordinator.snapshot(); let ownerWipe = await ownerPorts.wipeSummary(); try requireCorpusAssertion(ownerSnapshot.state == .safeTerminalError); try requireCorpusAssertion(!ownerSnapshot.hasVerifiedOwnerState); try requireCorpusAssertion(ownerWipe == "callback_headers_vault_owner_confirm")
        }
    }

    private func verifySwitchFencesInFlight() async throws {
        func assertSwitched(_ coordinator: AuthRuntimeCoordinator) async throws { let snapshot = await coordinator.snapshot(); let trace = await coordinator.normalizedTrace(); try requireCorpusAssertion(snapshot.state == .accountSwitching); try requireCorpusAssertion(trace.contains(.staleRejected)) }
        do {
            let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true); await ports.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await ports.provider.setSuspendExchange(true)
            let switchExchangeIngress = SyntheticAuthFixture.ingress()
            async let work: Void = coordinator.receiveCallback(switchExchangeIngress); await ports.provider.waitExchangeStarted(); await coordinator.switchAccount(); await ports.provider.releaseExchange(); _ = await work; try await assertSwitched(coordinator)
        }
        do {
            let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true); await ports.callback.setResult(.consumed(SyntheticAuthFixture.candidate())); await ports.vault.setSuspendReplace(true)
            let switchReplaceIngress = SyntheticAuthFixture.ingress()
            async let work: Void = coordinator.receiveCallback(switchReplaceIngress); await ports.vault.waitReplaceStarted(); await coordinator.switchAccount(); await ports.vault.releaseReplace(); _ = await work; try await assertSwitched(coordinator); let staleWrites = await ports.vault.staleWriteCount(); try requireCorpusAssertion(staleWrites == 1)
        }
        do {
            let ports = ScriptPorts(times: [0, 15_000]); let coordinator = makeCoordinator(ports); await ports.clock.setSuspendSleep(true)
            async let work: Void = coordinator.scheduleTimeout(.providerOrApiStep); await ports.clock.waitSleepStarted(); await coordinator.switchAccount(); await ports.clock.releaseSleep(); _ = await work; try await assertSwitched(coordinator)
        }
    }

    private func verifyEveryDestructiveMutationRejectsStaleGeneration() async throws {
        do {
            let p = ScriptPorts(times: [0]); await p.callback.seed(); p.generations.pauseAfterComparison(1)
            let callback = p.callback, generations = p.generations
            let mutation = Task.detached { await callback.purge(generation: 1) }
            let comparisonStarted = await Task.detached { generations.waitComparisonStarted() }.value
            if !comparisonStarted {
                generations.releaseComparison()
                _ = await mutation.value
                try failInvariant("generation_change_cancels_work_and_blocks_stale_writes", "comparison_start_timeout")
            }
            let activation = Task.detached { generations.activate(2) }; await Task.yield(); generations.releaseComparison()
            let applied = await mutation.value; await activation.value
            if generations.comparisonReleaseTimedOut() {
                try failInvariant("generation_change_cancels_work_and_blocks_stale_writes", "comparison_release_timeout")
            }
            try requireCorpusAssertion(applied == .applied); let pendingAfterMutation = await p.callback.hasPending(); try requireCorpusAssertion(!pendingAfterMutation)
            await p.callback.seed(); let stale = await p.callback.purge(generation: 1), pendingAfterStale = await p.callback.hasPending(); try requireCorpusAssertion(stale == .staleGeneration); try requireCorpusAssertion(pendingAfterStale)
        }
        do { let p = ScriptPorts(times: [0]); await p.vault.seed(); p.generations.activate(2); let outcome = await p.vault.clear(generation: 1), stored = await p.vault.hasStoredCandidate(); try requireCorpusAssertion(outcome == .staleGeneration); try requireCorpusAssertion(stored) }
        do { let p = ScriptPorts(times: [0]); p.generations.activate(2); let outcome = await p.owner.bind(.init("private"), generation: 1), owner = await p.owner.hasOwner(); try requireCorpusAssertion(outcome == .staleGeneration); try requireCorpusAssertion(!owner) }
        do { let p = ScriptPorts(times: [0]); await p.owner.seed(); p.generations.activate(2); let outcome = await p.owner.clearHeadersAndRequests(generation: 1), headers = await p.owner.hasHeaders(); try requireCorpusAssertion(outcome == .staleGeneration); try requireCorpusAssertion(headers) }
        do { let p = ScriptPorts(times: [0]); await p.owner.seed(); p.generations.activate(2); let outcome = await p.owner.purgeOwnerData(generation: 1), owner = await p.owner.hasOwner(); try requireCorpusAssertion(outcome == .staleGeneration); try requireCorpusAssertion(owner) }
    }

    private func verifyCallbackValidationCancellationPrecedesPurge() async throws {
        let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports)
        await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true); await ports.callback.setSuspendValidation(true)
        let validationIngress = SyntheticAuthFixture.ingress()
        async let work: Void = coordinator.receiveCallback(validationIngress); await ports.callback.waitValidationStarted(); await coordinator.signOut(); _ = await work
        let canceled = await ports.callback.validationCancellationDidComplete(), purgeAfter = await ports.callback.purgeObservedCancellation(); try requireCorpusAssertion(canceled); try requireCorpusAssertion(purgeAfter)
    }

    private func verifyCleanupReservationLiveness() async throws {
        let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports)
        await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true); await coordinator.signOut()
        await ports.callback.setResult(.duplicate); await coordinator.receiveCallback(SyntheticAuthFixture.ingress())
        await ports.provider.setRefreshResult(.transientFailure); await coordinator.handle401(SyntheticAuthFixture.candidate())
        let trace = await coordinator.normalizedTrace(), refreshes = await ports.provider.refreshCallCount(); try requireCorpusAssertion(trace.contains(.callbackReserved)); try requireCorpusAssertion(refreshes == 1)
    }

    private func verifyPostFenceCancellationIsIrrevocable() async throws {
        do {
            let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports)
            await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true); await ports.callback.setSuspendActivation(true)
            let work = Task { await coordinator.signOut() }; await ports.callback.waitActivationStarted(); work.cancel(); await ports.callback.releaseActivation(); await work.value
            let snapshot = await coordinator.snapshot(), generation = await coordinator.currentGeneration(), terminal = await coordinator.isTerminalFenced(), persistence = await ports.persistence(), wipe = await ports.wipeSummary(), activationCanceled = await ports.callback.activationWasCancelled()
            try requireCorpusAssertion(snapshot.state == .signedOut); try requireCorpusAssertion(snapshot.hasSessionCandidate == .absent); try requireCorpusAssertion(!snapshot.hasVerifiedOwnerState)
            try requireCorpusAssertion(generation == 2); try requireCorpusAssertion(!terminal); try requireCorpusAssertion(persistence == [false, false, false, false]); try requireCorpusAssertion(wipe == "callback_headers_vault_owner_confirm"); try requireCorpusAssertion(!activationCanceled)
        }
        do {
            let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports)
            await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true); await ports.callback.setResult(.malformed); await ports.callback.setSuspendActivation(true)
            let activationIngress = SyntheticAuthFixture.ingress()
            let work = Task { await coordinator.receiveCallback(activationIngress) }; await ports.callback.waitActivationStarted(); work.cancel(); await ports.callback.releaseActivation(); await work.value
            let snapshot = await coordinator.snapshot(), generation = await coordinator.currentGeneration(), terminal = await coordinator.isTerminalFenced(), history = await coordinator.presentationEffectHistory(), activationCanceled = await ports.callback.activationWasCancelled()
            try requireCorpusAssertion(snapshot.state == .unusableLink); try requireCorpusAssertion(snapshot.hasSessionCandidate == .absent); try requireCorpusAssertion(!snapshot.hasVerifiedOwnerState)
            try requireCorpusAssertion(generation == 2); try requireCorpusAssertion(!terminal); try requireCorpusAssertion(history.count == 1); try requireCorpusAssertion(!activationCanceled)
        }
    }

    private func verifySuppressedStaleLifecycle() async throws {
        do {
            let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports)
            await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true); await ports.callback.setResult(.malformed)
            await coordinator.receiveCallback(SyntheticAuthFixture.ingress()); await coordinator.receiveCallback(SyntheticAuthFixture.ingress())
            let trace = await coordinator.normalizedTrace()
            try requireCorpusAssertion(trace.filter { $0 == .generationFence }.count == 2); try requireCorpusAssertion(!trace.contains(.staleRejected))
        }
        do {
            let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports)
            await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true); await ports.callback.setResult(.malformed)
            await ports.callback.setSuspendActivation(true); await ports.callback.setPurgeResult(.failed)
            let interruptedIngress = SyntheticAuthFixture.ingress()
            async let rejected: Void = coordinator.receiveCallback(interruptedIngress)
            await ports.callback.waitActivationStarted()
            async let terminalCleanup: Void = coordinator.signOut()
            while true {
                let currentGeneration = await coordinator.currentGeneration()
                if currentGeneration == 3 { break }
                await Task.yield()
            }
            await ports.callback.releaseActivation()
            _ = await (rejected, terminalCleanup)
            let terminal = await coordinator.isTerminalFenced(), trace = await coordinator.normalizedTrace()
            try requireCorpusAssertion(terminal); try requireCorpusAssertion(!trace.contains(.staleRejected))
        }
    }

    private func verifyCallbackStoreFailure() async throws {
        let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true)
        await ports.callback.setResult(.failed); await coordinator.receiveCallback(SyntheticAuthFixture.ingress())
        let snapshot = await coordinator.snapshot(); let audit = await ports.audit.values(); let terminal = await coordinator.isTerminalFenced()
        try requireCorpusAssertion(snapshot.fixedOutcomeCategory == .transientFailure); try requireCorpusAssertion(audit == ["callback", "callback_confirm"]); try requireCorpusAssertion(!terminal)
        for confirmFailure in [false, true] {
            let failing = ScriptPorts(times: [0]); let fenced = makeCoordinator(failing); await failing.vault.setReadCandidate(false); await fenced.initialize(online: true); await failing.callback.setResult(.failed)
            if confirmFailure { await failing.callback.setConfirm(false) } else { await failing.callback.setPurgeResult(.failed) }; await fenced.receiveCallback(SyntheticAuthFixture.ingress())
            let isTerminal = await fenced.isTerminalFenced(); let failedSnapshot = await fenced.snapshot(); let failedAudit = await failing.audit.values()
            try requireCorpusAssertion(isTerminal); try requireCorpusAssertion(failedSnapshot.fixedOutcomeCategory == .transientFailure); try requireCorpusAssertion(failedAudit == (confirmFailure ? ["callback", "callback_confirm"] : ["callback"]))
        }
    }

    private func verifyDelayedEffectCancellation() async throws {
        let ports = ScriptPorts(times: [0, 500]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true); await ports.clock.setSuspendSleep(true)
        async let delayed: Void = coordinator.scheduleDelayedAnnouncement(.safeTerminalError, priority: .polite); await ports.clock.waitSleepStarted(); await coordinator.handle403(); await ports.clock.releaseSleep(); _ = await delayed
        let generation = await coordinator.currentGeneration(); let effects = await coordinator.drainPresentationEffects(for: generation); try requireCorpusAssertion(effects.count == 1)
        guard let effect = effects.first else { try failCurrentStageAssertion() }; try requireCorpusAssertion(effect.originatingState == .safeTerminalError); try requireCorpusAssertion(effect.payload.focus == .heading); try requireCorpusAssertion(effect.payload.announcement == .safeTerminalError); try requireCorpusAssertion(effect.payload.priority == .assertive); try requireCorpusAssertion(effect.payload.navigation == nil)
        let history = await coordinator.presentationEffectHistory(); try requireCorpusAssertion(history.count == 1); try requireCorpusAssertion(history.first?.sequence == effect.sequence)
    }

    private func exerciseTerminalEntryPoints(_ coordinator: AuthRuntimeCoordinator) async throws {
        await coordinator.initialize(online: true); try await requireTerminalFence(coordinator, "terminal_not_fenced_after_initialize")
        await coordinator.receiveCallback(SyntheticAuthFixture.ingress()); try await requireTerminalFence(coordinator, "terminal_not_fenced_after_receive_callback")
        await coordinator.cancelCallback(); try await requireTerminalFence(coordinator, "terminal_not_fenced_after_cancel_callback")
        await coordinator.handle401(SyntheticAuthFixture.candidate()); try await requireTerminalFence(coordinator, "terminal_not_fenced_after_handle_401")
        await coordinator.handle403(); try await requireTerminalFence(coordinator, "terminal_not_fenced_after_handle_403")
        await coordinator.scheduleTimeout(.providerOrApiStep); try await requireTerminalFence(coordinator, "terminal_not_fenced_after_schedule_timeout")
        await coordinator.scheduleDelayedAnnouncement(.safeTerminalError, priority: .assertive); try await requireTerminalFence(coordinator, "terminal_not_fenced_after_delayed_announcement")
        await coordinator.signOut(); try await requireTerminalFence(coordinator, "terminal_not_fenced_after_sign_out")
        await coordinator.switchAccount(); try await requireTerminalFence(coordinator, "terminal_not_fenced_after_switch_account")
    }

    private func requireTerminalFence(_ coordinator: AuthRuntimeCoordinator, _ mismatch: String) async throws {
        guard await coordinator.isTerminalFenced() else { try failInvariant("evidence_is_closed_and_mutation_safe", mismatch) }
    }

    private func makeCoordinator(_ ports: ScriptPorts, generation: UInt64 = 1) -> AuthRuntimeCoordinator { .init(provider: ports.provider, vault: ports.vault, callbackStore: ports.callback, clock: ports.clock, ownerStore: ports.owner, telemetry: TrapTelemetry(), initialGeneration: generation) }
    private func normalize(_ value: AuthRuntimeSnapshot, _ generation: UInt64) -> String { [value.state.rawValue, value.hasSessionCandidate.rawValue, value.hasVerifiedOwnerState ? "1" : "0", value.safeDestinationId.rawValue, value.fixedOutcomeCategory?.rawValue ?? "none", String(generation)].joined(separator: ",") }
    private func snapshotMismatch(_ expected: [String], _ actual: [String]) -> String {
        guard expected.count == actual.count else { return "count" }
        let fields = ["state", "candidate", "owner", "destination", "outcome", "generation"]
        for index in expected.indices {
            let expectedFields = expected[index].split(separator: ",", omittingEmptySubsequences: false)
            let actualFields = actual[index].split(separator: ",", omittingEmptySubsequences: false)
            guard expectedFields.count == fields.count, actualFields.count == fields.count else { return "shape" }
            for field in fields.indices where expectedFields[field] != actualFields[field] { return fields[field] }
        }
        return "none"
    }
    private func traceMismatch(_ expected: [String], _ actual: [String]) -> String {
        guard expected.count == actual.count else { return "count_expected_\(boundedTraceCount(expected.count))_actual_\(boundedTraceCount(actual.count))" }
        guard let index = expected.indices.first(where: { expected[$0] != actual[$0] }) else { return "none" }
        guard index < 64, traceDiagnosticValues.contains(expected[index]), traceDiagnosticValues.contains(actual[index]) else { return "sequence_unavailable" }
        return "sequence_index_\(index)_expected_\(expected[index])_actual_\(actual[index])"
    }
    private func boundedTraceCount(_ count: Int) -> String { count < 64 ? String(count) : "64_plus" }
    private let traceDiagnosticValues: [String] = [
        AuthTraceEntry.initRead, .callbackReserved, .callbackConsumed, .callbackRejected, .callbackDuplicate, .callbackOverlap,
        .providerExchange, .providerRefresh, .ownerVerify, .vaultReplace, .ownerBind, .timer500, .timer15000, .timer30000,
        .generationFence, .callbackPurge, .headersClear, .vaultClear, .ownerPurge, .callbackConfirm, .vaultConfirm, .ownerConfirm,
        .staleRejected, .snapshotPublished, .effectEnqueued, .terminalLatched,
    ].map(\.rawValue)
    private func selectBoundedDiagnostic(_ corpusId: String, _ stage: DiagnosticStage, _ mismatch: String) -> String {
        let detailed = "[auth_corpus_\(corpusId)_stage_\(stage.rawValue)_\(mismatch)]"
        if detailed.range(of: boundedDiagnosticPattern, options: .regularExpression) != nil { return detailed }
        let reason = corpusId == Self.diagnosticCorpusId && mismatch == "none" ? "diagnostic_inconsistent" : "diagnostic_rejected"
        return "[auth_corpus_stage_\(stage.rawValue)_\(reason)]"
    }
    private func selectCorpusCheckpoint(_ corpusId: String, _ stage: CorpusCheckpointStage) -> String {
        guard Self.checkpointCorpusIds.contains(corpusId) else { return "[auth_corpus_stage_diagnostic_rejected]" }
        return "[auth_corpus_\(corpusId)_stage_\(stage.rawValue)_checkpoint]"
    }
    private func selectInvariantDiagnostic(_ corpusId: String, _ mismatch: String) -> String {
        guard Self.invariantDiagnosticsByCorpus[corpusId]?.contains(mismatch) == true else { return "[auth_corpus_stage_diagnostic_rejected]" }
        return "[auth_corpus_\(corpusId)_stage_invariant_\(mismatch)]"
    }
    private func selectRecordedAssertionDiagnostic(_ corpusId: String, _ stage: CorpusCheckpointStage) -> String {
        let isManifest = corpusId == "corpus_manifest" && stage == .manifest
        let isRegular = corpusId != "corpus_manifest" && Self.checkpointCorpusIds.contains(corpusId) && Self.regularFailureStages.contains(stage)
        let isExchange = corpusId == "warm_callback_success" && stage == .exchange
        guard isManifest || isRegular || isExchange else { return "[auth_corpus_stage_diagnostic_rejected]" }
        return "[auth_corpus_\(corpusId)_stage_\(stage.rawValue)_assertion_recorded]"
    }
    private func observeStage<T>(_ corpusId: String, _ stage: CorpusCheckpointStage, observer: CorpusStageObserver?, operation: () async throws -> T) async throws -> T {
        guard let observer else {
            do {
                return try await operation()
            } catch CorpusError.diagnosticAbort {
                throw CorpusError.diagnosticAbort
            } catch {
                throw CorpusError.diagnosticAbort
            }
        }
        closeObservedStage(observer)
        observer.begin(corpusId, stage)
        emitCorpusCheckpoint(corpusId, stage)
        do {
            let result = try await operation()
            _ = observer.finishStage()
            return result
        } catch CorpusError.diagnosticAbort {
            observer.reset()
            throw CorpusError.diagnosticAbort
        } catch {
            if let active = observer.finishStage() { try failRecordedAssertion(active) }
            throw CorpusError.diagnosticAbort
        }
    }
    private func closeObservedStage(_ observer: CorpusStageObserver) { _ = observer.finishStage() }
    private func requireCorpusAssertion(_ matches: Bool) throws {
        guard matches else { try failCurrentStageAssertion() }
    }
    private func failCurrentStageAssertion() throws -> Never {
        guard let active = corpusStageObserver.currentStage() else { throw CorpusError.invalid }
        try failRecordedAssertion(active)
    }
    private func failRecordedAssertion(_ active: CorpusStageObserver.ActiveStage) throws -> Never {
        let marker = selectRecordedAssertionDiagnostic(active.corpusId, active.stage)
        print(marker)
        throw CorpusError.diagnosticAbort
    }
    private func failInvariant(_ corpusId: String, _ mismatch: String) throws -> Never {
        let marker = selectInvariantDiagnostic(corpusId, mismatch)
        print(marker)
        throw CorpusError.diagnosticAbort
    }
    private func emitCorpusCheckpoint(_ corpusId: String, _ stage: CorpusCheckpointStage, enabled: Bool = true) {
        guard enabled else { return }
        print(selectCorpusCheckpoint(corpusId, stage))
    }
    private func requireCorpusMatch(_ matches: Bool, _ corpusId: String, _ stage: DiagnosticStage, _ boundedMismatch: String) throws {
        guard !matches else { return }
        let boundedMarker = selectBoundedDiagnostic(corpusId, stage, boundedMismatch)
        print(boundedMarker)
        throw CorpusError.diagnosticAbort
    }
    private let boundedDiagnosticPattern = #"^\[auth_corpus_cold_start_without_candidate_stage_(?:snapshot_(?:count|shape|state|candidate|owner|destination|outcome|generation)|trace_(?:sequence_unavailable|count_expected_(?:[0-9]|[1-5][0-9]|6[0-3]|64_plus)_actual_(?:[0-9]|[1-5][0-9]|6[0-3]|64_plus)|sequence_index_(?:[0-9]|[1-5][0-9]|6[0-3])_expected_(?:init_read|callback_reserved|callback_consumed|callback_rejected|callback_duplicate|callback_overlap|provider_exchange|provider_refresh|owner_verify|vault_replace|owner_bind|timer_500|timer_15000|timer_30000|generation_fence|callback_purge|headers_clear|vault_clear|owner_purge|callback_confirm|vault_confirm|owner_confirm|stale_rejected|snapshot_published|effect_enqueued|terminal_latched)_actual_(?:init_read|callback_reserved|callback_consumed|callback_rejected|callback_duplicate|callback_overlap|provider_exchange|provider_refresh|owner_verify|vault_replace|owner_bind|timer_500|timer_15000|timer_30000|generation_fence|callback_purge|headers_clear|vault_clear|owner_purge|callback_confirm|vault_confirm|owner_confirm|stale_rejected|snapshot_published|effect_enqueued|terminal_latched)))\]$"#
    private func assertTerminalEffect(_ effect: AuthPresentationEffect, _ generation: UInt64) throws {
        try requireCorpusAssertion(effect.generation == generation)
        try requireCorpusAssertion(effect.originatingState == .safeTerminalError)
        try requireCorpusAssertion(effect.payload.focus == .heading)
        try requireCorpusAssertion(effect.payload.announcement == .safeTerminalError)
        try requireCorpusAssertion(effect.payload.priority == .assertive)
        try requireCorpusAssertion(effect.payload.navigation == nil)
    }
    private func normalize(_ effect: AuthPresentationEffect) -> String {
        let payload = "aggregate:\(effect.payload.focus?.rawValue ?? "none"):\(effect.payload.announcement?.rawValue ?? "none"):\(effect.payload.priority?.rawValue ?? "none"):\(effect.payload.navigation?.rawValue ?? "none")"
        return "\(effect.generation):\(effect.sequence):\(effect.originatingState.rawValue):\(payload)"
    }
    private func loadCorpus() throws -> [Vector] {
        var root = URL(fileURLWithPath: #filePath); for _ in 0..<4 { root.deleteLastPathComponent() }
        let data = try Data(contentsOf: root.appendingPathComponent("contracts/mobile/auth-runtime-synthetic/v1/vectors.tsv")); try requireCorpusAssertion(!data.starts(with: [0xef, 0xbb, 0xbf]))
        guard let text = String(data: data, encoding: .utf8) else { try failCurrentStageAssertion() }; try requireCorpusAssertion(!text.contains("\r")); try requireCorpusAssertion(text.hasSuffix("\n"))
        let lines = text.dropLast().split(separator: "\n", omittingEmptySubsequences: false); guard let header = lines.first else { try failCurrentStageAssertion() }; try requireCorpusAssertion(String(header) == "kind\tid\tinitial\tsteps\tmonotonicTimes\tportCompletions\texpectedSnapshots\texpectedEffects\texpectedTrace\twipeOrder\trejectedWrites\tfinalGeneration\tterminal\tcontractFingerprint")
        let rows = try lines.dropFirst().map { try Vector($0.split(separator: "\t", omittingEmptySubsequences: false).map(String.init)) }; try requireCorpusAssertion(Set(rows.map(\.id)).count == 41); return rows
    }
    private static let digest = "0e273eeddffd655f44ad86514da715c8925fadc99f093047e6d6ee1f6d33f214"
}

private enum CorpusError: Error { case invalid, diagnosticAbort }
private struct TrapTelemetry: StructurallyNoOpTelemetryPort {}
private actor Audit {
    private var entries: [String] = []
    func add(_ value: String) { entries.append(value) }
    func values() -> [String] { entries }
    func summary() -> String {
        if entries.isEmpty { return "none" }; if entries == ["callback"] { return "callback" }
        if entries == ["callback", "headers", "vault", "owner", "callback_confirm", "vault_confirm", "owner_confirm"] { return "callback_headers_vault_owner_confirm" }
        return entries.joined(separator: "_")
    }
}
private actor CompletionAudit {
    private let commands: [String]; private var entries: [String] = []
    init(_ commands: [String] = []) { self.commands = commands }
    func take(_ allowed: Set<String>) -> String? { guard commands.indices.contains(entries.count) else { return nil }; let command = commands[entries.count]; guard allowed.contains(command) else { return nil }; entries.append(command); return command }
    func hasCommands() -> Bool { entries.count < commands.count }
    func values() -> [String] { entries }
}
private final class GenerationCell: @unchecked Sendable {
    private let lock = NSLock(); private var value: UInt64 = 1, pausedGeneration: UInt64?, releaseTimedOut = false; private var comparisonStarted = DispatchSemaphore(value: 0), comparisonRelease = DispatchSemaphore(value: 0)
    func activate(_ generation: UInt64) { lock.lock(); defer { lock.unlock() }; if generation > value { value = generation } }
    func pauseAfterComparison(_ generation: UInt64) { lock.lock(); pausedGeneration = generation; releaseTimedOut = false; comparisonStarted = .init(value: 0); comparisonRelease = .init(value: 0); lock.unlock() }
    func waitComparisonStarted() -> Bool { comparisonStarted.wait(timeout: .now() + 5) == .success }
    func releaseComparison() { comparisonRelease.signal() }
    func comparisonReleaseTimedOut() -> Bool { lock.lock(); defer { lock.unlock() }; return releaseTimedOut }
    func compareAndMutate(_ generation: UInt64, _ mutation: () -> Void) -> Bool { lock.lock(); defer { lock.unlock() }; guard value == generation else { return false }; if pausedGeneration == generation { comparisonStarted.signal(); let released = comparisonRelease.wait(timeout: .now() + 5) == .success; releaseTimedOut = !released; pausedGeneration = nil; guard released else { return false } }; mutation(); return true }
}
private final class ScriptPorts {
    let audit: Audit, completions: CompletionAudit, generations: GenerationCell, provider: ScriptProvider, vault: ScriptVault, callback: ScriptCallback, clock: ScriptClock, owner: ScriptOwner
    init(times: [UInt64], completionCommands: [String] = []) { let a = Audit(), c = CompletionAudit(completionCommands), g = GenerationCell(); audit = a; completions = c; generations = g; provider = .init(c); clock = .init(times, c); vault = .init(a, c, g); callback = .init(a, c, g); owner = .init(a, c, g) }
    func completionValues() async -> [String] { await completions.values() }
    func seedPersistence() async { await callback.seed(); await vault.seed(); await owner.seed() }
    func persistence() async -> [Bool] { let pending = await callback.hasPending(); let headers = await owner.hasHeaders(); let candidate = await vault.hasStoredCandidate(); let ownerState = await owner.hasOwner(); return [pending, headers, candidate, ownerState] }
    func wipeSummary() async -> String { let values = await audit.values(); let atomic = await callback.didAtomicWipe(); if values.isEmpty, atomic { return "callback" }; return await audit.summary() }
}
private actor Gate {
    private var started = false, released = false
    private var startWaiters: [CheckedContinuation<Void, Never>] = [], releaseWaiters: [CheckedContinuation<Void, Never>] = []
    func suspendPoint() async { started = true; startWaiters.forEach { $0.resume() }; startWaiters.removeAll(); if !released { await withCheckedContinuation { releaseWaiters.append($0) } } }
    func waitUntilStarted() async { if started { return }; await withCheckedContinuation { startWaiters.append($0) } }
    func release() { released = true; releaseWaiters.forEach { $0.resume() }; releaseWaiters.removeAll() }
}
private actor CancellationAwareGate {
    private var started = false, released = false, canceled = false
    private var startWaiters: [CheckedContinuation<Void, Never>] = [], releaseWaiters: [CheckedContinuation<Bool, Never>] = []
    func suspendPoint() async -> Bool {
        started = true; startWaiters.forEach { $0.resume() }; startWaiters.removeAll()
        if released { return true }; if Task.isCancelled { canceled = true; return false }
        let completed = await withTaskCancellationHandler(operation: {
            if Task.isCancelled { canceled = true; return false }
            return await withCheckedContinuation { releaseWaiters.append($0) }
        }, onCancel: { Task { await self.cancel() } })
        if Task.isCancelled { canceled = true; return false }
        return completed
    }
    func waitUntilStarted() async { if started { return }; await withCheckedContinuation { startWaiters.append($0) } }
    func release() { released = true; releaseWaiters.forEach { $0.resume(returning: !canceled) }; releaseWaiters.removeAll() }
    func wasCanceled() -> Bool { canceled }
    private func cancel() { canceled = true; releaseWaiters.forEach { $0.resume(returning: false) }; releaseWaiters.removeAll() }
}
private actor OneShotSignal {
    private var signaled = false; private var waiters: [CheckedContinuation<Void, Never>] = []
    func wait() async { if signaled { return }; await withCheckedContinuation { waiters.append($0) } }
    func signal() { signaled = true; waiters.forEach { $0.resume() }; waiters.removeAll() }
}
private actor ScriptProvider: AuthProviderPort {
    private let completions: CompletionAudit
    private let exchangeGate = Gate(), cancellationObserved = OneShotSignal(), refreshGate = Gate(), refreshCancellationObserved = OneShotSignal(); private var suspendExchange = false, suspendRefresh = false, refreshCalls = 0, verifyCalls = 0
    private var refreshResult: AuthPortResult<OpaqueSessionCandidate> = .success(.init("synthetic")); private var canceled: Set<UInt64> = []
    init(_ completions: CompletionAudit) { self.completions = completions }
    func setSuspendExchange(_ value: Bool) { suspendExchange = value }
    func setSuspendRefresh(_ value: Bool) { suspendRefresh = value }
    func waitExchangeStarted() async { await exchangeGate.waitUntilStarted() }
    func releaseExchange() async { await exchangeGate.release() }
    func waitRefreshStarted() async { await refreshGate.waitUntilStarted() }
    func releaseRefresh() async { await refreshGate.release() }
    func setRefreshResult(_ value: AuthPortResult<OpaqueSessionCandidate>) { refreshResult = value }
    func refreshCallCount() -> Int { refreshCalls }; func verifyCallCount() -> Int { verifyCalls }
    private var lastExchangeStorage: String?
    func lastExchangeValue() -> String? { lastExchangeStorage }
    func exchange(_ candidate: OpaqueSessionCandidate, generation: UInt64) async -> AuthPortResult<OpaqueSessionCandidate> { lastExchangeStorage = candidate.storage; let command = await completions.take(["exchange_success", "suspended"]); let shouldSuspend = command == "suspended" || (command == nil && suspendExchange); if shouldSuspend { await exchangeGate.suspendPoint(); if canceled.contains(generation) { await cancellationObserved.signal() } }; return canceled.contains(generation) ? .transientFailure : .success(candidate) }
    func refresh(_ candidate: OpaqueSessionCandidate, generation: UInt64) async -> AuthPortResult<OpaqueSessionCandidate> { refreshCalls += 1; if suspendRefresh { await refreshGate.suspendPoint(); if canceled.contains(generation) { await refreshCancellationObserved.signal() } }; if canceled.contains(generation) { return .transientFailure }; switch await completions.take(["refresh_success", "refresh_invalid", "refresh_transient", "refresh_forbidden", "refresh_malformed"]) { case "refresh_success": return .success(candidate); case "refresh_invalid": return .explicitInvalidation; case "refresh_transient": return .transientFailure; case "refresh_forbidden": return .forbidden; case "refresh_malformed": return .malformed; default: return refreshResult } }
    func verifyOwner(_ candidate: OpaqueSessionCandidate, generation: UInt64) async -> AuthPortResult<OpaqueOwnerSubject> { verifyCalls += 1; _ = await completions.take(["verify_success"]); return .success(.init("private")) }
    func cancelOwnedWork(generation: UInt64) async { canceled.insert(generation); if suspendExchange { await exchangeGate.release(); await cancellationObserved.wait() }; if suspendRefresh { await refreshGate.release(); await refreshCancellationObserved.wait() } }
}
private actor ScriptVault: SessionVaultPort {
    private let readGate = Gate(), replaceGate = Gate(); private let audit: Audit; private let completions: CompletionAudit; private let generations: GenerationCell; private var readCandidate = false, suspendRead = false, suspendReplace = false
    private var replaceResult = ConditionalMutationResult.applied, clearResult = ConditionalMutationResult.applied, confirm = true, replaceCalls = 0, seedReplaces = 0, storedCandidate = false, latestGeneration: UInt64 = 0, staleWrites = 0
    init(_ audit: Audit, _ completions: CompletionAudit, _ generations: GenerationCell) { self.audit = audit; self.completions = completions; self.generations = generations }
    func setReadCandidate(_ value: Bool) { readCandidate = value }; func setSuspendRead(_ value: Bool) { suspendRead = value }; func setSuspendReplace(_ value: Bool) { suspendReplace = value }; func setReplaceResult(_ value: ConditionalMutationResult) { replaceResult = value }
    func waitReadStarted() async { await readGate.waitUntilStarted() }
    func releaseRead() async { await readGate.release() }
    func waitReplaceStarted() async { await replaceGate.waitUntilStarted() }
    func releaseReplace() async { await replaceGate.release() }
    func setClearResult(_ value: ConditionalMutationResult) { clearResult = value }; func setConfirm(_ value: Bool) { confirm = value }; func replaceCallsAfterSeed() -> Int { max(0, replaceCalls - seedReplaces) }
    func seed() { storedCandidate = true }; func hasStoredCandidate() -> Bool { storedCandidate }; func staleWriteCount() -> Int { staleWrites }
    func read(generation: UInt64) async -> AuthPortResult<OpaqueSessionCandidate?> { if suspendRead { await readGate.suspendPoint() }; let command = await completions.take(["vault_candidate", "vault_none"]); let hasCandidate = command == "vault_candidate" || (command == nil && readCandidate); storedCandidate = hasCandidate; return .success(hasCandidate ? .init("synthetic") : nil) }
    func replace(_ candidate: OpaqueSessionCandidate, generation: UInt64) async -> ConditionalMutationResult { replaceCalls += 1; if readCandidate, seedReplaces == 0 { seedReplaces = 1 }; let command = await completions.take(["suspended", "replace_failed"]); if command == "suspended" || (command == nil && suspendReplace) { await replaceGate.suspendPoint() }; let result: ConditionalMutationResult = command == "replace_failed" ? .failed : replaceResult; guard generations.compareAndMutate(generation, { latestGeneration = generation; if result == .applied { storedCandidate = true } }) else { staleWrites += 1; return .staleGeneration }; return result }
    func clear(generation: UInt64) async -> ConditionalMutationResult { await audit.add("vault"); guard generations.compareAndMutate(generation, { latestGeneration = generation; if clearResult == .applied { storedCandidate = false } }) else { staleWrites += 1; return .staleGeneration }; return clearResult }
    func confirmEmpty(generation: UInt64) async -> Bool { await audit.add("vault_confirm"); return confirm && !storedCandidate }
}
private actor ScriptCallback: CallbackTransactionStorePort {
    private let audit: Audit; private let completions: CompletionAudit; private let generations: GenerationCell; private let validationGate = Gate(), activationGate = CancellationAwareGate(), validationCancellationObserved = OneShotSignal()
    private var result = CallbackConsumeResult.malformed, purgeResult = ConditionalMutationResult.applied, confirm = true, calls = 0, atomicWipe = false, pending = false, suspendValidation = false, suspendActivation = false, validationCanceled = false, purgeAfterValidationCancellation = false; private var canceled: Set<UInt64> = []
    init(_ audit: Audit, _ completions: CompletionAudit, _ generations: GenerationCell) { self.audit = audit; self.completions = completions; self.generations = generations }
    func setResult(_ value: CallbackConsumeResult) { result = value }; func setPurgeResult(_ value: ConditionalMutationResult) { purgeResult = value }; func setConfirm(_ value: Bool) { confirm = value }; func callCount() -> Int { calls }
    func setSuspendValidation(_ value: Bool) { suspendValidation = value }; func waitValidationStarted() async { await validationGate.waitUntilStarted() }; func validationCancellationDidComplete() -> Bool { validationCanceled }; func purgeObservedCancellation() -> Bool { purgeAfterValidationCancellation }
    func setSuspendActivation(_ value: Bool) { suspendActivation = value }; func waitActivationStarted() async { await activationGate.waitUntilStarted() }; func releaseActivation() async { await activationGate.release() }; func activationWasCancelled() async -> Bool { await activationGate.wasCanceled() }
    func didAtomicWipe() -> Bool { atomicWipe }
    func seed() { pending = true }; func hasPending() -> Bool { pending }
    func validateConsumeAndWipe(_ ingress: OpaqueCallbackIngress, generation: UInt64) async -> CallbackConsumeResult { calls += 1; if suspendValidation { await validationGate.suspendPoint(); if canceled.contains(generation) { validationCanceled = true; await validationCancellationObserved.signal(); return .staleGeneration } }; let scripted: CallbackConsumeResult; switch await completions.take(["callback_consumed", "callback_malformed", "callback_expired", "callback_replayed", "callback_duplicate", "callback_unsupported", "callback_stale", "callback_failed"]) { case "callback_consumed": scripted = .consumed(.init("opaque-pkce")); case "callback_malformed": scripted = .malformed; case "callback_expired": scripted = .expired; case "callback_replayed": scripted = .replayed; case "callback_duplicate": scripted = .duplicate; case "callback_unsupported": scripted = .unsupported; case "callback_stale": scripted = .staleGeneration; case "callback_failed": scripted = .failed; default: scripted = result }; switch scripted { case .consumed, .malformed, .expired, .replayed, .unsupported: atomicWipe = true; default: atomicWipe = false }; if atomicWipe { pending = false }; return scripted }
    func purge(generation: UInt64) async -> ConditionalMutationResult { await audit.add("callback"); purgeAfterValidationCancellation = !suspendValidation || validationCanceled; let scripted: ConditionalMutationResult = await completions.take(["purge_failed"]) == "purge_failed" ? .failed : purgeResult; guard generations.compareAndMutate(generation, { if scripted == .applied { pending = false } }) else { return .staleGeneration }; return scripted }
    func confirmEmpty(generation: UInt64) async -> Bool { await audit.add("callback_confirm"); return confirm && !pending }
    func activateGeneration(_ generation: UInt64) async { if suspendActivation, !(await activationGate.suspendPoint()) { return }; generations.activate(generation) }
    func cancelOwnedWork(generation: UInt64) async { canceled.insert(generation); if suspendValidation { await validationGate.release(); await validationCancellationObserved.wait() } }
}
private actor ScriptClock: AuthClockPort {
    private final class SleepHandle: @unchecked Sendable { let generation: UInt64, gate = Gate(), cancellationObserved = OneShotSignal(); var canceled = false; init(_ generation: UInt64) { self.generation = generation } }
    private let times: [UInt64]; private let registrationGate = Gate(); private let completions: CompletionAudit; private var index = 0, sleeps: [UInt64] = [], suspendSleep = false, suspendRegistration = false; private var delayedElapsed: UInt64?; private var active: [SleepHandle] = []
    init(_ times: [UInt64], _ completions: CompletionAudit) { self.times = times; self.completions = completions }
    func monotonicMilliseconds() async -> UInt64 { defer { index += 1 }; return times.indices.contains(index) ? times[index] : (times.last ?? 0) }
    func setSuspendSleep(_ value: Bool) { suspendSleep = value }
    func setSuspendRegistration(_ value: Bool) { suspendRegistration = value }
    func setDelayedElapsed(_ value: UInt64) { delayedElapsed = value }
    func waitRegistrationStarted() async { await registrationGate.waitUntilStarted() }
    func waitSleepStarted() async { while active.isEmpty { await Task.yield() }; if let handle = active.last { await handle.gate.waitUntilStarted() } }
    func releaseSleep() async { for handle in active { await handle.gate.release() } }
    func sleep(milliseconds: UInt64, generation: UInt64) async -> Bool {
        sleeps.append(milliseconds)
        if suspendRegistration {
            let gate = registrationGate
            await withTaskCancellationHandler(operation: { await gate.suspendPoint() }, onCancel: { Task { await gate.release() } })
        }
        guard !Task.isCancelled else { return false }
        let handle = SleepHandle(generation); active.append(handle); defer { active.removeAll { $0 === handle } }
        let fired: Bool
        if await completions.take(["timer_fired"]) == "timer_fired" { fired = !Task.isCancelled }
        else if milliseconds == 500, let delayedElapsed { fired = delayedElapsed >= milliseconds && !Task.isCancelled }
        else {
            let sleepSuspended = suspendSleep
            let pendingCommands: Bool
            if sleepSuspended { pendingCommands = false } else { pendingCommands = await completions.hasCommands() }
            let shouldSuspend = sleepSuspended || pendingCommands || milliseconds == 500
            if shouldSuspend { await withTaskCancellationHandler(operation: { await handle.gate.suspendPoint() }, onCancel: { Task { await handle.gate.release() } }) }
            fired = !shouldSuspend && !Task.isCancelled
        }
        if handle.canceled { await handle.cancellationObserved.signal(); return false }
        return fired
    }
    func cancelOwnedTimers(generation: UInt64) async { let handles = active.filter { $0.generation == generation }; for handle in handles { handle.canceled = true; await handle.gate.release() }; for handle in handles { await handle.cancellationObserved.wait() } }
    func requests() -> [UInt64] { sleeps }
}
private actor ScriptOwner: OwnerDataStorePort {
    private let audit: Audit; private let completions: CompletionAudit; private let generations: GenerationCell; private var bindResult = ConditionalMutationResult.applied, headersResult = ConditionalMutationResult.applied, purgeResult = ConditionalMutationResult.applied, confirm = true, headersPresent = false, ownerPresent = false
    init(_ audit: Audit, _ completions: CompletionAudit, _ generations: GenerationCell) { self.audit = audit; self.completions = completions; self.generations = generations }
    func setBindResult(_ value: ConditionalMutationResult) { bindResult = value }; func setHeadersResult(_ value: ConditionalMutationResult) { headersResult = value }; func setPurgeResult(_ value: ConditionalMutationResult) { purgeResult = value }; func setConfirm(_ value: Bool) { confirm = value }
    func seed() { headersPresent = true; ownerPresent = true }; func hasHeaders() -> Bool { headersPresent }; func hasOwner() -> Bool { ownerPresent }
    func bind(_ owner: OpaqueOwnerSubject, generation: UInt64) async -> ConditionalMutationResult { let scripted: ConditionalMutationResult = await completions.take(["bind_failed"]) == "bind_failed" ? .failed : bindResult; guard generations.compareAndMutate(generation, { if scripted == .applied { ownerPresent = true } }) else { return .staleGeneration }; return scripted }
    func clearHeadersAndRequests(generation: UInt64) async -> ConditionalMutationResult { await audit.add("headers"); guard generations.compareAndMutate(generation, { if headersResult == .applied { headersPresent = false } }) else { return .staleGeneration }; return headersResult }
    func purgeOwnerData(generation: UInt64) async -> ConditionalMutationResult { await audit.add("owner"); guard generations.compareAndMutate(generation, { if purgeResult == .applied { ownerPresent = false } }) else { return .staleGeneration }; return purgeResult }
    func confirmEmpty(generation: UInt64) async -> Bool { await audit.add("owner_confirm"); return confirm && !headersPresent && !ownerPresent }
}
private enum CleanupFailure: String, CaseIterable {
    case callbackPurge, headersClear, vaultClear, ownerPurge, callbackConfirm, vaultConfirm, ownerConfirm
    var expectedPrefix: [String] { switch self {
        case .callbackPurge: return ["callback"]; case .headersClear: return ["callback", "headers"]; case .vaultClear: return ["callback", "headers", "vault"]
        case .ownerPurge: return ["callback", "headers", "vault", "owner"]; case .callbackConfirm: return ["callback", "headers", "vault", "owner", "callback_confirm"]
        case .vaultConfirm: return ["callback", "headers", "vault", "owner", "callback_confirm", "vault_confirm"]
        case .ownerConfirm: return ["callback", "headers", "vault", "owner", "callback_confirm", "vault_confirm", "owner_confirm"] }
    }
    var expectedPersistence: [Bool] { switch self {
        case .callbackPurge: return [true, true, true, true]; case .headersClear: return [false, true, true, true]
        case .vaultClear: return [false, false, true, true]; case .ownerPurge: return [false, false, false, true]
        case .callbackConfirm, .vaultConfirm, .ownerConfirm: return [false, false, false, false] }
    }
    func apply(_ ports: ScriptPorts) async { await ports.seedPersistence(); switch self {
        case .callbackPurge: await ports.callback.setPurgeResult(.failed); case .headersClear: await ports.owner.setHeadersResult(.failed)
        case .vaultClear: await ports.vault.setClearResult(.failed); case .ownerPurge: await ports.owner.setPurgeResult(.failed)
        case .callbackConfirm: await ports.callback.setConfirm(false); case .vaultConfirm: await ports.vault.setConfirm(false); case .ownerConfirm: await ports.owner.setConfirm(false) }
    }
}
private actor StrictCallbackStore: CallbackTransactionStorePort {
    private struct Pending { let issuedAt: UInt64, expiresAt: UInt64, purpose: String, environment: String, host: String, path: String, oauthState: String, nonce: String, verifier: String }
    private var pending: Pending?; private let now: UInt64
    init(now: UInt64, expiresAt: UInt64, issuedAt: UInt64 = 0, purpose: String = "native_auth", environment: String = "dev", host: String = "auth.dev.fluyo.test", path: String = "/native/auth/callback", oauthState: String = "expected", nonce: String = "expected", verifier: String = "opaque-pkce") {
        self.now = now; pending = .init(issuedAt: issuedAt, expiresAt: expiresAt, purpose: purpose, environment: environment, host: host, path: path, oauthState: oauthState, nonce: nonce, verifier: verifier)
    }
    func validateConsumeAndWipe(_ ingress: OpaqueCallbackIngress, generation: UInt64) async -> CallbackConsumeResult {
        guard generation == 1 else { return .staleGeneration }; guard let expected = pending else { return .replayed }; pending = nil
        guard now >= expected.issuedAt, now < expected.expiresAt else { return .expired }; guard expected.purpose == "native_auth", expected.environment == "dev" else { return .malformed }; let raw = ingress.storage
        guard raw.unicodeScalars.allSatisfy({ $0.value >= 0x20 && $0.value <= 0x7e }), expected.host.unicodeScalars.allSatisfy({ $0.value >= 0x21 && $0.value <= 0x7e }), !raw.contains("\\"), !raw.contains("%"), let parts = URLComponents(string: raw), parts.scheme == "https", parts.user == nil, parts.password == nil, parts.port == nil, parts.fragment == nil, parts.host == expected.host, parts.path == expected.path, raw.hasPrefix("https://\(expected.host)\(expected.path)?") else { return .malformed }
        let items = parts.queryItems ?? []; guard items.map(\.name) == ["code", "state", "nonce"], Set(items.map(\.name)).count == 3, items[0].value?.isEmpty == false, items[1].value == expected.oauthState, items[2].value == expected.nonce else { return .malformed }
        return .consumed(.init(expected.verifier))
    }
    func purge(generation: UInt64) async -> ConditionalMutationResult { pending = nil; return .applied }
    func confirmEmpty(generation: UInt64) async -> Bool { pending == nil }
    func activateGeneration(_ generation: UInt64) async {}
    func cancelOwnedWork(generation: UInt64) async {}
}
