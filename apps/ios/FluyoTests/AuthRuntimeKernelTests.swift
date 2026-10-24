import Foundation
import XCTest
@testable import Fluyo

final class AuthRuntimeKernelTests: XCTestCase {
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
        let rows = try loadCorpus(); XCTAssertEqual(rows.filter { $0.kind == "scenario" }.count, 28); XCTAssertEqual(rows.filter { $0.kind == "invariant" }.count, 13)
        for (index, vector) in rows.enumerated() { try await run(vector); print("AUTH_KERNEL_VECTOR \(index) \(vector.id) \(vector.digest) PASS") }
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
    }

    private func run(_ vector: Vector) async throws {
        XCTAssertEqual(vector.digest, Self.digest, vector.id)
        let ports = ScriptPorts(times: vector.times, completionCommands: vector.completions.filter { $0 != "none" })
        let coordinator = makeCoordinator(ports, generation: vector.initial == "overflow" ? .max : 1)
        var rejected = 0
        for step in vector.steps { rejected += try await execute(step, coordinator, ports) }
        let snapshots = await coordinator.snapshotHistory().map { normalize($0.0, $0.1) }
        XCTAssertTrue(snapshots == vector.snapshots, "[auth_corpus_\(vector.id)_stage_snapshot_\(snapshotMismatch(vector.snapshots, snapshots))]")
        let fullEffectHistory = await coordinator.presentationEffectHistory().map(normalize); XCTAssertEqual(fullEffectHistory, vector.effects, vector.id)
        let generation = await coordinator.currentGeneration(); let firstDrain = await coordinator.drainPresentationEffects(for: generation)
        let secondDrain = await coordinator.drainPresentationEffects(for: generation); let staleDrain = await coordinator.drainPresentationEffects(for: generation == 1 ? 2 : 1)
        let trace = await coordinator.normalizedTrace().map(\.rawValue); let wipe = await ports.wipeSummary(); let terminal = await coordinator.isTerminalFenced(); let completions = await ports.completionValues()
        XCTAssertTrue(firstDrain.allSatisfy { $0.generation == generation }, vector.id); XCTAssertTrue(secondDrain.isEmpty, vector.id); XCTAssertTrue(staleDrain.isEmpty, vector.id)
        XCTAssertTrue(trace == vector.trace, "[auth_corpus_\(vector.id)_stage_trace_\(traceMismatch(vector.trace, trace))]"); XCTAssertEqual(wipe, vector.wipe, vector.id); XCTAssertEqual(rejected, vector.rejectedWrites, vector.id)
        XCTAssertEqual(completions, vector.completions.filter { $0 != "none" }, vector.id)
        if vector.id == "warm_callback_success" { let exchanged = await ports.provider.lastExchangeValue(); XCTAssertEqual(exchanged, "opaque-pkce") }
        XCTAssertEqual(generation, vector.generation, vector.id); XCTAssertEqual(terminal, vector.terminal, vector.id)
        try await validateInvariant(vector.id, coordinator, ports)
    }

    private func execute(_ step: String, _ coordinator: AuthRuntimeCoordinator, _ ports: ScriptPorts) async throws -> Int {
        switch step {
        case "init_none": await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true)
        case "init_candidate": await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true)
        case "init_offline": await ports.vault.setReadCandidate(true); await coordinator.initialize(online: false)
        case "callback_success": await ports.callback.setResult(.consumed(candidate())); await coordinator.receiveCallback(ingress())
        case "callback_malformed", "strict_callback":
            await ports.callback.setResult(.malformed); await coordinator.receiveCallback(ingress()); if step == "strict_callback" { try await strictCallbackChecks() }
        case "callback_expired": await ports.callback.setResult(.expired); await coordinator.receiveCallback(ingress())
        case "callback_replay": await ports.callback.setResult(.replayed); await coordinator.receiveCallback(ingress())
        case "callback_duplicate": await ports.callback.setResult(.duplicate); await coordinator.receiveCallback(ingress())
        case "callback_unsupported": await ports.callback.setResult(.unsupported); await coordinator.receiveCallback(ingress())
        case "callback_store_fail": await ports.callback.setResult(.failed); await coordinator.receiveCallback(ingress())
        case "callback_cancel":
            await ports.callback.setResult(.consumed(candidate())); await ports.provider.setSuspendExchange(true)
            async let work: Void = coordinator.receiveCallback(ingress()); await ports.provider.waitExchangeStarted(); await coordinator.cancelCallback(); await ports.provider.releaseExchange(); _ = await work; try await verifyWarmCancelPreservesCandidate(); try await verifyCancelAvailabilityBoundaries(); return 1
        case "callback_overlap":
            await ports.callback.setResult(.consumed(candidate())); await ports.provider.setSuspendExchange(true)
            let task = Task { await coordinator.receiveCallback(ingress()) }; await ports.provider.waitExchangeStarted(); await coordinator.receiveCallback(ingress()); task.cancel(); await ports.provider.releaseExchange(); _ = await task.value; return 1
        case "refresh_success": await ports.provider.setRefreshResult(.success(candidate())); await coordinator.handle401(candidate())
        case "refresh_invalid": await ports.provider.setRefreshResult(.explicitInvalidation); await coordinator.handle401(candidate())
        case "refresh_transient": await ports.provider.setRefreshResult(.transientFailure); await coordinator.handle401(candidate())
        case "refresh_repeated": await ports.provider.setRefreshResult(.success(candidate())); await coordinator.handle401(candidate()); await coordinator.handle401(candidate())
        case "refresh_boundary_checks": try await verifyRefreshTimerBoundaries()
        case "forbidden": await coordinator.handle403()
        case "noop", "telemetry_noop", "source_scan": break
        case "switch": await coordinator.switchAccount()
        case "signout": await coordinator.signOut()
        case "signout_during_exchange":
            await ports.callback.setResult(.consumed(candidate())); await ports.provider.setSuspendExchange(true)
            async let work: Void = coordinator.receiveCallback(ingress()); await ports.provider.waitExchangeStarted(); await coordinator.signOut(); await ports.provider.releaseExchange(); _ = await work; return 1
        case "signout_during_replace":
            await ports.callback.setResult(.consumed(candidate())); await ports.vault.setSuspendReplace(true)
            async let work: Void = coordinator.receiveCallback(ingress()); await ports.vault.waitReplaceStarted(); await coordinator.signOut(); await ports.vault.releaseReplace(); _ = await work; return 1
        case "vault_replace_fail": await ports.callback.setResult(.consumed(candidate())); await ports.vault.setReplaceResult(.failed); await coordinator.receiveCallback(ingress()); return 1
        case "owner_bind_fail": await ports.callback.setResult(.consumed(candidate())); await ports.owner.setBindResult(.failed); await coordinator.receiveCallback(ingress()); return 1
        case "timeout15": await coordinator.scheduleTimeout(.providerOrApiStep); try await verifyTotalTimeoutBoundary()
        case "timeout30": await coordinator.scheduleTimeout(.totalActionable)
        case "callback_purge_fail", "cleanup_each_failure":
            await ports.callback.setPurgeResult(.failed); await coordinator.signOut(); if step == "cleanup_each_failure" { try await verifyEveryCleanupFailureLatches() }; return 1
        case "terminal_entrypoints": await exerciseTerminalEntryPoints(coordinator); return 9
        case "effect_drain": break
        default: XCTFail("unknown closed step"); throw CorpusError.invalid
        }
        return 0
    }

    private func validateInvariant(_ id: String, _ coordinator: AuthRuntimeCoordinator, _ ports: ScriptPorts) async throws {
        switch id {
        case "public_state_is_secret_free": let snapshot = await coordinator.snapshot(); XCTAssertEqual(Mirror(reflecting: snapshot).children.compactMap(\.label), ["state", "hasSessionCandidate", "hasVerifiedOwnerState", "safeDestinationId", "fixedOutcomeCategory"])
        case "callback_transaction_is_purpose_environment_host_path_and_expiry_bound": let calls = await ports.callback.callCount(); XCTAssertGreaterThan(calls, 0); try await verifyCallbackStoreFailure()
        case "callback_transaction_consumes_once_and_wipes":
            let store = StrictCallbackStore(now: 999, expiresAt: 1_000); let first = await store.validateConsumeAndWipe(ingress(), generation: 1); let second = await store.validateConsumeAndWipe(ingress(), generation: 1); let empty = await store.confirmEmpty(generation: 1); let calls = await ports.vault.replaceCallsAfterSeed()
            guard case .consumed = first else { return XCTFail("not consumed") }; guard case .replayed = second else { return XCTFail("not replay protected") }; XCTAssertTrue(empty); XCTAssertEqual(calls, 0)
        case "valid_verified_session_survives_bad_link": let snapshot = await coordinator.snapshot(); XCTAssertEqual(snapshot.state, .unusableLink); XCTAssertTrue(snapshot.hasVerifiedOwnerState)
        case "generation_change_cancels_work_and_blocks_stale_writes": let trace = await coordinator.normalizedTrace(); XCTAssertTrue(trace.contains(.staleRejected)); try await verifySwitchFencesInFlight(); try await verifyCallbackValidationCancellationPrecedesPurge(); try await verifyEveryDestructiveMutationRejectsStaleGeneration()
        case "owner_data_waits_for_private_subject_confirmation": let snapshot = await coordinator.snapshot(); XCTAssertFalse(snapshot.hasVerifiedOwnerState); try await verifyMutationBoundaries()
        case "transient_refresh_failure_preserves_candidate": let snapshot = await coordinator.snapshot(); XCTAssertEqual(snapshot.hasSessionCandidate, .present)
        case "explicit_invalidation_and_repeated_401_clear": let snapshot = await coordinator.snapshot(); XCTAssertEqual(snapshot.hasSessionCandidate, .absent)
        case "403_never_refreshes_or_signs_out": let calls = await ports.provider.refreshCallCount(); let snapshot = await coordinator.snapshot(); XCTAssertEqual(calls, 0); XCTAssertEqual(snapshot.state, .safeTerminalError); XCTAssertTrue(snapshot.hasVerifiedOwnerState)
        case "offline_never_confirms_new_owner_or_expands_access": let calls = await ports.provider.verifyCallCount(); let snapshot = await coordinator.snapshot(); XCTAssertEqual(calls, 0); XCTAssertFalse(snapshot.hasVerifiedOwnerState)
        case "cleanup_precedes_signed_out_or_new_owner_exposure": let terminal = await coordinator.isTerminalFenced(); XCTAssertTrue(terminal); try await verifyDelayedEffectCancellation(); try await verifyCleanupReservationLiveness(); try await verifyPostFenceCancellationIsIrrevocable()
        case "evidence_is_closed_and_mutation_safe": let terminal = await coordinator.isTerminalFenced(); XCTAssertTrue(terminal)
        case "no_op_telemetry_has_zero_retention_and_zero_transport": XCTAssertEqual(Mirror(reflecting: TrapTelemetry()).children.count, 0)
        default: break
        }
    }

    private func strictCallbackChecks() async throws {
        let valid = StrictCallbackStore(now: 999, expiresAt: 1_000); guard case let .consumed(candidate) = await valid.validateConsumeAndWipe(ingress(), generation: 1) else { return XCTFail("valid callback") }; XCTAssertEqual(candidate.storage, "opaque-pkce"); XCTAssertNotEqual(candidate.storage, "expected")
        guard case .replayed = await valid.validateConsumeAndWipe(ingress(), generation: 1) else { return XCTFail("replay") }
        let distinct = StrictCallbackStore(now: 999, expiresAt: 1_000, oauthState: "state-two", verifier: "verifier-two")
        let distinctIngress = OpaqueCallbackIngress("https://auth.dev.fluyo.test/native/auth/callback?code=x&state=state-two&nonce=expected")
        guard case let .consumed(verifier) = await distinct.validateConsumeAndWipe(distinctIngress, generation: 1) else { return XCTFail("distinct verifier") }; XCTAssertEqual(verifier.storage, "verifier-two")
        let expired = StrictCallbackStore(now: 1_000, expiresAt: 1_000); guard case .expired = await expired.validateConsumeAndWipe(ingress(), generation: 1) else { return XCTFail("expiry") }
        let rollback = StrictCallbackStore(now: 999, expiresAt: 2_000, issuedAt: 1_000); guard case .expired = await rollback.validateConsumeAndWipe(ingress(), generation: 1) else { return XCTFail("rollback") }
        let pendingAdversaries = [
            StrictCallbackStore(now: 999, expiresAt: 1_000, purpose: "other"), StrictCallbackStore(now: 999, expiresAt: 1_000, environment: "prod"),
            StrictCallbackStore(now: 999, expiresAt: 1_000, host: "other.dev.fluyo.test"), StrictCallbackStore(now: 999, expiresAt: 1_000, path: "/other"),
            StrictCallbackStore(now: 999, expiresAt: 1_000, oauthState: "other"), StrictCallbackStore(now: 999, expiresAt: 1_000, nonce: "other"),
        ]
        for store in pendingAdversaries { guard case .malformed = await store.validateConsumeAndWipe(ingress(), generation: 1) else { return XCTFail("accepted mismatched pending transaction") } }
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
        for raw in adversaries { let store = StrictCallbackStore(now: 999, expiresAt: 1_000); guard case .malformed = await store.validateConsumeAndWipe(.init(raw), generation: 1) else { return XCTFail("accepted control or non-ASCII callback") } }
    }

    private func verifyEveryCleanupFailureLatches() async throws {
        for failure in CleanupFailure.allCases {
            let ports = ScriptPorts(times: [0]); await failure.apply(ports); let coordinator = makeCoordinator(ports); await coordinator.signOut()
            let terminal = await coordinator.isTerminalFenced(); let snapshot = await coordinator.snapshot(); let generation = await coordinator.currentGeneration()
            let effects = await coordinator.drainPresentationEffects(for: generation); let audit = await ports.audit.values(); let persistence = await ports.persistence()
            XCTAssertTrue(terminal, failure.rawValue); XCTAssertEqual(snapshot.fixedOutcomeCategory, .transientFailure, failure.rawValue)
            XCTAssertTrue(effects.isEmpty, failure.rawValue); XCTAssertEqual(audit, failure.expectedPrefix, failure.rawValue)
            XCTAssertEqual(persistence, failure.expectedPersistence, failure.rawValue)
        }
    }

    private func verifyWarmCancelPreservesCandidate() async throws {
        let ports = ScriptPorts(times: [0, 0, 500]); let coordinator = makeCoordinator(ports)
        await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true)
        await ports.callback.setResult(.consumed(candidate())); await ports.provider.setSuspendExchange(true)
        async let work: Void = coordinator.receiveCallback(ingress()); await ports.provider.waitExchangeStarted(); await coordinator.cancelCallback(); await ports.provider.releaseExchange(); _ = await work
        let snapshot = await coordinator.snapshot(); let generation = await coordinator.currentGeneration(); let effects = await coordinator.drainPresentationEffects(for: generation)
        XCTAssertEqual(snapshot.state, .authenticated); XCTAssertEqual(snapshot.hasSessionCandidate, .present); XCTAssertTrue(snapshot.hasVerifiedOwnerState)
        XCTAssertEqual(snapshot.fixedOutcomeCategory, .canceled); XCTAssertTrue(effects.isEmpty)
    }

    private func verifyCancelAvailabilityBoundaries() async throws {
        for now in [UInt64(499), 500, 501] {
            let ports = ScriptPorts(times: [0, 0, now]); let coordinator = makeCoordinator(ports)
            await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true)
            await ports.callback.setResult(.consumed(candidate())); await ports.provider.setSuspendExchange(true)
            async let work: Void = coordinator.receiveCallback(ingress()); await ports.provider.waitExchangeStarted(); await coordinator.cancelCallback()
            let afterCancel = await coordinator.snapshot()
            if now < 500 { XCTAssertEqual(afterCancel.state, .callbackPending); await coordinator.signOut() }
            else { XCTAssertEqual(afterCancel.fixedOutcomeCategory, .canceled) }
            await ports.provider.releaseExchange(); _ = await work
        }
    }

    private func verifyTotalTimeoutBoundary() async throws {
        let ports = ScriptPorts(times: [0, 30_000]); let coordinator = makeCoordinator(ports); await coordinator.scheduleTimeout(.totalActionable)
        let requests = await ports.clock.requests(); let snapshot = await coordinator.snapshot(); XCTAssertEqual(requests, [30_000]); XCTAssertEqual(snapshot.fixedOutcomeCategory, .timedOut)
        try await verifyCallbackContextTimeouts()
        try await verifyRefreshContextExits()
    }

    private func verifyCallbackContextTimeouts() async throws {
        for warm in [false, true] {
            for kind in [AuthTimeoutKind.providerOrApiStep, .totalActionable] {
                let times: [UInt64] = warm ? [0, 0, kind.milliseconds] : [0, kind.milliseconds]; let ports = ScriptPorts(times: times); let coordinator = makeCoordinator(ports)
                if warm { await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true) }
                await ports.callback.setResult(.consumed(candidate())); await ports.provider.setSuspendExchange(true)
                async let work: Void = coordinator.receiveCallback(ingress()); await ports.provider.waitExchangeStarted(); await coordinator.scheduleTimeout(kind); _ = await work
                let snapshot = await coordinator.snapshot(); XCTAssertEqual(snapshot.state, .safeTerminalError); XCTAssertEqual(snapshot.hasSessionCandidate, warm ? .present : .absent); XCTAssertEqual(snapshot.hasVerifiedOwnerState, warm); XCTAssertEqual(snapshot.safeDestinationId, warm ? .internalFoundationHome : .signedOut); XCTAssertEqual(snapshot.fixedOutcomeCategory, .timedOut)
                let history = await coordinator.presentationEffectHistory(); XCTAssertEqual(history.compactMap { $0.payload.announcement }, [.callbackPending, .safeTerminalError]); let trace = await coordinator.normalizedTrace(); XCTAssertTrue(trace.contains(.staleRejected))
            }
        }
    }

    private func verifyRefreshContextExits() async throws {
        for (kind, expectedState) in [(AuthTimeoutKind.providerOrApiStep, AuthRuntimeState.offlineSessionCandidate), (.totalActionable, .safeTerminalError)] {
            let ports = ScriptPorts(times: [0, 0, kind.milliseconds]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true); await ports.provider.setSuspendRefresh(true)
            async let work: Void = coordinator.handle401(candidate()); await ports.provider.waitRefreshStarted(); await coordinator.scheduleTimeout(kind); _ = await work
            let snapshot = await coordinator.snapshot(); XCTAssertEqual(snapshot.state, expectedState); XCTAssertEqual(snapshot.hasSessionCandidate, .present); XCTAssertTrue(snapshot.hasVerifiedOwnerState); XCTAssertEqual(snapshot.fixedOutcomeCategory, .timedOut)
        }
        let ports = ScriptPorts(times: [0, 0, 500]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true); await ports.provider.setSuspendRefresh(true)
        async let work: Void = coordinator.handle401(candidate()); await ports.provider.waitRefreshStarted(); await coordinator.cancelRefresh(); _ = await work
        let snapshot = await coordinator.snapshot(); XCTAssertEqual(snapshot.state, .offlineSessionCandidate); XCTAssertEqual(snapshot.fixedOutcomeCategory, .canceled)
    }

    private func verifyRefreshTimerBoundaries() async throws {
        for elapsed in [UInt64(499), 500, 501] {
            let ports = ScriptPorts(times: [0, 0]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true); await ports.clock.setDelayedElapsed(elapsed); await ports.provider.setSuspendRefresh(true)
            async let work: Void = coordinator.handle401(candidate()); await ports.provider.waitRefreshStarted()
            let history = await coordinator.presentationEffectHistory(); XCTAssertEqual(history.count, elapsed < 500 ? 0 : 1)
            if let effect = history.first { XCTAssertEqual(effect.originatingState, .refreshPending); XCTAssertEqual(effect.payload.focus, .heading); XCTAssertEqual(effect.payload.announcement, .refreshPending); XCTAssertEqual(effect.payload.priority, .polite); XCTAssertNil(effect.payload.navigation) }
            await ports.provider.releaseRefresh(); _ = await work
            let generation = await coordinator.currentGeneration(); let drained = await coordinator.drainPresentationEffects(for: generation); XCTAssertTrue(drained.isEmpty); let finalHistory = await coordinator.presentationEffectHistory(); XCTAssertEqual(finalHistory.count, elapsed < 500 ? 0 : 1)
        }
    }

    private func verifyMutationBoundaries() async throws {
        for result in [ConditionalMutationResult.failed, .staleGeneration] {
            let vaultPorts = ScriptPorts(times: [0]); let vaultCoordinator = makeCoordinator(vaultPorts); await vaultPorts.vault.setReadCandidate(false); await vaultCoordinator.initialize(online: true); await vaultPorts.callback.setResult(.consumed(candidate())); await vaultPorts.vault.setReplaceResult(result); await vaultCoordinator.receiveCallback(ingress())
            let vaultSnapshot = await vaultCoordinator.snapshot(); let vaultWipe = await vaultPorts.wipeSummary(); XCTAssertEqual(vaultSnapshot.state, .safeTerminalError); XCTAssertEqual(vaultSnapshot.hasSessionCandidate, .absent); XCTAssertEqual(vaultWipe, "callback_headers_vault_owner_confirm")
            let ownerPorts = ScriptPorts(times: [0]); let ownerCoordinator = makeCoordinator(ownerPorts); await ownerPorts.vault.setReadCandidate(false); await ownerCoordinator.initialize(online: true); await ownerPorts.callback.setResult(.consumed(candidate())); await ownerPorts.owner.setBindResult(result); await ownerCoordinator.receiveCallback(ingress())
            let ownerSnapshot = await ownerCoordinator.snapshot(); let ownerWipe = await ownerPorts.wipeSummary(); XCTAssertEqual(ownerSnapshot.state, .safeTerminalError); XCTAssertFalse(ownerSnapshot.hasVerifiedOwnerState); XCTAssertEqual(ownerWipe, "callback_headers_vault_owner_confirm")
        }
    }

    private func verifySwitchFencesInFlight() async throws {
        func assertSwitched(_ coordinator: AuthRuntimeCoordinator) async { let snapshot = await coordinator.snapshot(); let trace = await coordinator.normalizedTrace(); XCTAssertEqual(snapshot.state, .accountSwitching); XCTAssertTrue(trace.contains(.staleRejected)) }
        do {
            let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true); await ports.callback.setResult(.consumed(candidate())); await ports.provider.setSuspendExchange(true)
            async let work: Void = coordinator.receiveCallback(ingress()); await ports.provider.waitExchangeStarted(); await coordinator.switchAccount(); await ports.provider.releaseExchange(); _ = await work; await assertSwitched(coordinator)
        }
        do {
            let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true); await ports.callback.setResult(.consumed(candidate())); await ports.vault.setSuspendReplace(true)
            async let work: Void = coordinator.receiveCallback(ingress()); await ports.vault.waitReplaceStarted(); await coordinator.switchAccount(); await ports.vault.releaseReplace(); _ = await work; await assertSwitched(coordinator); let staleWrites = await ports.vault.staleWriteCount(); XCTAssertEqual(staleWrites, 1)
        }
        do {
            let ports = ScriptPorts(times: [0, 15_000]); let coordinator = makeCoordinator(ports); await ports.clock.setSuspendSleep(true)
            async let work: Void = coordinator.scheduleTimeout(.providerOrApiStep); await ports.clock.waitSleepStarted(); await coordinator.switchAccount(); await ports.clock.releaseSleep(); _ = await work; await assertSwitched(coordinator)
        }
    }

    private func verifyEveryDestructiveMutationRejectsStaleGeneration() async throws {
        do {
            let p = ScriptPorts(times: [0]); await p.callback.seed(); p.generations.pauseAfterComparison(1)
            let mutation = Task.detached { await p.callback.purge(generation: 1) }; await Task.detached { p.generations.waitComparisonStarted() }.value
            let activation = Task.detached { p.generations.activate(2) }; await Task.yield(); p.generations.releaseComparison()
            let applied = await mutation.value; XCTAssertEqual(applied, .applied); await activation.value; let pendingAfterMutation = await p.callback.hasPending(); XCTAssertFalse(pendingAfterMutation)
            await p.callback.seed(); let stale = await p.callback.purge(generation: 1), pendingAfterStale = await p.callback.hasPending(); XCTAssertEqual(stale, .staleGeneration); XCTAssertTrue(pendingAfterStale)
        }
        do { let p = ScriptPorts(times: [0]); await p.vault.seed(); p.generations.activate(2); let outcome = await p.vault.clear(generation: 1), stored = await p.vault.hasStoredCandidate(); XCTAssertEqual(outcome, .staleGeneration); XCTAssertTrue(stored) }
        do { let p = ScriptPorts(times: [0]); p.generations.activate(2); let outcome = await p.owner.bind(.init("private"), generation: 1), owner = await p.owner.hasOwner(); XCTAssertEqual(outcome, .staleGeneration); XCTAssertFalse(owner) }
        do { let p = ScriptPorts(times: [0]); await p.owner.seed(); p.generations.activate(2); let outcome = await p.owner.clearHeadersAndRequests(generation: 1), headers = await p.owner.hasHeaders(); XCTAssertEqual(outcome, .staleGeneration); XCTAssertTrue(headers) }
        do { let p = ScriptPorts(times: [0]); await p.owner.seed(); p.generations.activate(2); let outcome = await p.owner.purgeOwnerData(generation: 1), owner = await p.owner.hasOwner(); XCTAssertEqual(outcome, .staleGeneration); XCTAssertTrue(owner) }
    }

    private func verifyCallbackValidationCancellationPrecedesPurge() async throws {
        let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports)
        await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true); await ports.callback.setSuspendValidation(true)
        async let work: Void = coordinator.receiveCallback(ingress()); await ports.callback.waitValidationStarted(); await coordinator.signOut(); _ = await work
        let canceled = await ports.callback.validationCancellationDidComplete(), purgeAfter = await ports.callback.purgeObservedCancellation(); XCTAssertTrue(canceled); XCTAssertTrue(purgeAfter)
    }

    private func verifyCleanupReservationLiveness() async throws {
        let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports)
        await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true); await coordinator.signOut()
        await ports.callback.setResult(.duplicate); await coordinator.receiveCallback(ingress())
        await ports.provider.setRefreshResult(.transientFailure); await coordinator.handle401(candidate())
        let trace = await coordinator.normalizedTrace(), refreshes = await ports.provider.refreshCallCount(); XCTAssertTrue(trace.contains(.callbackReserved)); XCTAssertEqual(refreshes, 1)
    }

    private func verifyPostFenceCancellationIsIrrevocable() async throws {
        do {
            let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports)
            await ports.vault.setReadCandidate(true); await coordinator.initialize(online: true); await ports.callback.setSuspendActivation(true)
            let work = Task { await coordinator.signOut() }; await ports.callback.waitActivationStarted(); work.cancel(); await ports.callback.releaseActivation(); await work.value
            let snapshot = await coordinator.snapshot(), generation = await coordinator.currentGeneration(), terminal = await coordinator.isTerminalFenced(), persistence = await ports.persistence(), wipe = await ports.wipeSummary()
            XCTAssertEqual(snapshot.state, .signedOut); XCTAssertEqual(snapshot.hasSessionCandidate, .absent); XCTAssertFalse(snapshot.hasVerifiedOwnerState)
            XCTAssertEqual(generation, 2); XCTAssertFalse(terminal); XCTAssertEqual(persistence, [false, false, false, false]); XCTAssertEqual(wipe, "callback_headers_vault_owner_confirm")
        }
        do {
            let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports)
            await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true); await ports.callback.setResult(.malformed); await ports.callback.setSuspendActivation(true)
            let work = Task { await coordinator.receiveCallback(ingress()) }; await ports.callback.waitActivationStarted(); work.cancel(); await ports.callback.releaseActivation(); await work.value
            let snapshot = await coordinator.snapshot(), generation = await coordinator.currentGeneration(), terminal = await coordinator.isTerminalFenced(), history = await coordinator.presentationEffectHistory()
            XCTAssertEqual(snapshot.state, .unusableLink); XCTAssertEqual(snapshot.hasSessionCandidate, .absent); XCTAssertFalse(snapshot.hasVerifiedOwnerState)
            XCTAssertEqual(generation, 2); XCTAssertFalse(terminal); XCTAssertEqual(history.count, 1)
        }
    }

    private func verifyCallbackStoreFailure() async throws {
        let ports = ScriptPorts(times: [0]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true)
        await ports.callback.setResult(.failed); await coordinator.receiveCallback(ingress())
        let snapshot = await coordinator.snapshot(); let audit = await ports.audit.values(); let terminal = await coordinator.isTerminalFenced()
        XCTAssertEqual(snapshot.fixedOutcomeCategory, .transientFailure); XCTAssertEqual(audit, ["callback", "callback_confirm"]); XCTAssertFalse(terminal)
        for confirmFailure in [false, true] {
            let failing = ScriptPorts(times: [0]); let fenced = makeCoordinator(failing); await failing.vault.setReadCandidate(false); await fenced.initialize(online: true); await failing.callback.setResult(.failed)
            if confirmFailure { await failing.callback.setConfirm(false) } else { await failing.callback.setPurgeResult(.failed) }; await fenced.receiveCallback(ingress())
            let isTerminal = await fenced.isTerminalFenced(); let failedSnapshot = await fenced.snapshot(); let failedAudit = await failing.audit.values()
            XCTAssertTrue(isTerminal); XCTAssertEqual(failedSnapshot.fixedOutcomeCategory, .transientFailure); XCTAssertEqual(failedAudit, confirmFailure ? ["callback", "callback_confirm"] : ["callback"])
        }
    }

    private func verifyDelayedEffectCancellation() async throws {
        let ports = ScriptPorts(times: [0, 500]); let coordinator = makeCoordinator(ports); await ports.vault.setReadCandidate(false); await coordinator.initialize(online: true); await ports.clock.setSuspendSleep(true)
        async let delayed: Void = coordinator.scheduleDelayedAnnouncement(.safeTerminalError, priority: .polite); await ports.clock.waitSleepStarted(); await coordinator.handle403(); await ports.clock.releaseSleep(); _ = await delayed
        let generation = await coordinator.currentGeneration(); let effects = await coordinator.drainPresentationEffects(for: generation); XCTAssertEqual(effects.count, 1)
        let effect = try XCTUnwrap(effects.first); XCTAssertEqual(effect.originatingState, .safeTerminalError); XCTAssertEqual(effect.payload.focus, .heading); XCTAssertEqual(effect.payload.announcement, .safeTerminalError); XCTAssertEqual(effect.payload.priority, .assertive); XCTAssertNil(effect.payload.navigation)
        let history = await coordinator.presentationEffectHistory(); XCTAssertEqual(history.count, 1); XCTAssertEqual(history.first?.sequence, effect.sequence)
    }

    private func exerciseTerminalEntryPoints(_ coordinator: AuthRuntimeCoordinator) async {
        await coordinator.initialize(online: true); await coordinator.receiveCallback(ingress()); await coordinator.cancelCallback(); await coordinator.handle401(candidate()); await coordinator.handle403(); await coordinator.scheduleTimeout(.providerOrApiStep); await coordinator.scheduleDelayedAnnouncement(.safeTerminalError, priority: .assertive); await coordinator.signOut(); await coordinator.switchAccount()
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
    private let traceDiagnosticValues: Set<String> = [
        "init_read", "callback_reserved", "callback_consumed", "callback_rejected", "callback_duplicate", "callback_overlap",
        "provider_exchange", "provider_refresh", "owner_verify", "vault_replace", "owner_bind", "timer_500", "timer_15000",
        "timer_30000", "generation_fence", "callback_purge", "headers_clear", "vault_clear", "owner_purge", "callback_confirm",
        "vault_confirm", "owner_confirm", "stale_rejected", "snapshot_published", "effect_enqueued", "terminal_latched",
    ]
    private func normalize(_ effect: AuthPresentationEffect) -> String {
        let payload = "aggregate:\(effect.payload.focus?.rawValue ?? "none"):\(effect.payload.announcement?.rawValue ?? "none"):\(effect.payload.priority?.rawValue ?? "none"):\(effect.payload.navigation?.rawValue ?? "none")"
        return "\(effect.generation):\(effect.sequence):\(effect.originatingState.rawValue):\(payload)"
    }
    private func candidate() -> OpaqueSessionCandidate { .init("synthetic") }
    private func ingress() -> OpaqueCallbackIngress { .init("https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected") }

    private func loadCorpus() throws -> [Vector] {
        var root = URL(fileURLWithPath: #filePath); for _ in 0..<4 { root.deleteLastPathComponent() }
        let data = try Data(contentsOf: root.appendingPathComponent("contracts/mobile/auth-runtime-synthetic/v1/vectors.tsv")); XCTAssertFalse(data.starts(with: [0xef, 0xbb, 0xbf]))
        let text = try XCTUnwrap(String(data: data, encoding: .utf8)); XCTAssertFalse(text.contains("\r")); XCTAssertTrue(text.hasSuffix("\n"))
        let lines = text.dropLast().split(separator: "\n", omittingEmptySubsequences: false); XCTAssertEqual(String(lines[0]), "kind\tid\tinitial\tsteps\tmonotonicTimes\tportCompletions\texpectedSnapshots\texpectedEffects\texpectedTrace\twipeOrder\trejectedWrites\tfinalGeneration\tterminal\tcontractFingerprint")
        let rows = try lines.dropFirst().map { try Vector($0.split(separator: "\t", omittingEmptySubsequences: false).map(String.init)) }; XCTAssertEqual(Set(rows.map(\.id)).count, 41); return rows
    }
    private static let digest = "0e273eeddffd655f44ad86514da715c8925fadc99f093047e6d6ee1f6d33f214"
}

private enum CorpusError: Error { case invalid }
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
    func hasCommands() -> Bool { !commands.isEmpty }
    func values() -> [String] { entries }
}
private final class GenerationCell: @unchecked Sendable {
    private let lock = NSLock(); private var value: UInt64 = 1, pausedGeneration: UInt64?; private var comparisonStarted = DispatchSemaphore(value: 0), comparisonRelease = DispatchSemaphore(value: 0)
    func activate(_ generation: UInt64) { lock.lock(); defer { lock.unlock() }; if generation > value { value = generation } }
    func pauseAfterComparison(_ generation: UInt64) { lock.lock(); pausedGeneration = generation; comparisonStarted = .init(value: 0); comparisonRelease = .init(value: 0); lock.unlock() }
    func waitComparisonStarted() { XCTAssertEqual(comparisonStarted.wait(timeout: .now() + 5), .success) }
    func releaseComparison() { comparisonRelease.signal() }
    func compareAndMutate(_ generation: UInt64, _ mutation: () -> Void) -> Bool { lock.lock(); defer { lock.unlock() }; guard value == generation else { return false }; if pausedGeneration == generation { comparisonStarted.signal(); XCTAssertEqual(comparisonRelease.wait(timeout: .now() + 5), .success); pausedGeneration = nil }; mutation(); return true }
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
    private let replaceGate = Gate(); private let audit: Audit; private let completions: CompletionAudit; private let generations: GenerationCell; private var readCandidate = false, suspendReplace = false
    private var replaceResult = ConditionalMutationResult.applied, clearResult = ConditionalMutationResult.applied, confirm = true, replaceCalls = 0, seedReplaces = 0, storedCandidate = false, latestGeneration: UInt64 = 0, staleWrites = 0
    init(_ audit: Audit, _ completions: CompletionAudit, _ generations: GenerationCell) { self.audit = audit; self.completions = completions; self.generations = generations }
    func setReadCandidate(_ value: Bool) { readCandidate = value }; func setSuspendReplace(_ value: Bool) { suspendReplace = value }; func setReplaceResult(_ value: ConditionalMutationResult) { replaceResult = value }
    func waitReplaceStarted() async { await replaceGate.waitUntilStarted() }
    func releaseReplace() async { await replaceGate.release() }
    func setClearResult(_ value: ConditionalMutationResult) { clearResult = value }; func setConfirm(_ value: Bool) { confirm = value }; func replaceCallsAfterSeed() -> Int { max(0, replaceCalls - seedReplaces) }
    func seed() { storedCandidate = true }; func hasStoredCandidate() -> Bool { storedCandidate }; func staleWriteCount() -> Int { staleWrites }
    func read(generation: UInt64) async -> AuthPortResult<OpaqueSessionCandidate?> { let command = await completions.take(["vault_candidate", "vault_none"]); let hasCandidate = command == "vault_candidate" || (command == nil && readCandidate); storedCandidate = hasCandidate; return .success(hasCandidate ? .init("synthetic") : nil) }
    func replace(_ candidate: OpaqueSessionCandidate, generation: UInt64) async -> ConditionalMutationResult { replaceCalls += 1; if readCandidate, seedReplaces == 0 { seedReplaces = 1 }; let command = await completions.take(["suspended", "replace_failed"]); if command == "suspended" || (command == nil && suspendReplace) { await replaceGate.suspendPoint() }; let result: ConditionalMutationResult = command == "replace_failed" ? .failed : replaceResult; guard generations.compareAndMutate(generation, { latestGeneration = generation; if result == .applied { storedCandidate = true } }) else { staleWrites += 1; return .staleGeneration }; return result }
    func clear(generation: UInt64) async -> ConditionalMutationResult { await audit.add("vault"); guard generations.compareAndMutate(generation, { latestGeneration = generation; if clearResult == .applied { storedCandidate = false } }) else { staleWrites += 1; return .staleGeneration }; return clearResult }
    func confirmEmpty(generation: UInt64) async -> Bool { await audit.add("vault_confirm"); return confirm && !storedCandidate }
}
private actor ScriptCallback: CallbackTransactionStorePort {
    private let audit: Audit; private let completions: CompletionAudit; private let generations: GenerationCell; private let validationGate = Gate(), activationGate = Gate(), validationCancellationObserved = OneShotSignal()
    private var result = CallbackConsumeResult.malformed, purgeResult = ConditionalMutationResult.applied, confirm = true, calls = 0, atomicWipe = false, pending = false, suspendValidation = false, suspendActivation = false, validationCanceled = false, purgeAfterValidationCancellation = false; private var canceled: Set<UInt64> = []
    init(_ audit: Audit, _ completions: CompletionAudit, _ generations: GenerationCell) { self.audit = audit; self.completions = completions; self.generations = generations }
    func setResult(_ value: CallbackConsumeResult) { result = value }; func setPurgeResult(_ value: ConditionalMutationResult) { purgeResult = value }; func setConfirm(_ value: Bool) { confirm = value }; func callCount() -> Int { calls }
    func setSuspendValidation(_ value: Bool) { suspendValidation = value }; func waitValidationStarted() async { await validationGate.waitUntilStarted() }; func validationCancellationDidComplete() -> Bool { validationCanceled }; func purgeObservedCancellation() -> Bool { purgeAfterValidationCancellation }
    func setSuspendActivation(_ value: Bool) { suspendActivation = value }; func waitActivationStarted() async { await activationGate.waitUntilStarted() }; func releaseActivation() async { await activationGate.release() }
    func didAtomicWipe() -> Bool { atomicWipe }
    func seed() { pending = true }; func hasPending() -> Bool { pending }
    func validateConsumeAndWipe(_ ingress: OpaqueCallbackIngress, generation: UInt64) async -> CallbackConsumeResult { calls += 1; if suspendValidation { await validationGate.suspendPoint(); if canceled.contains(generation) { validationCanceled = true; await validationCancellationObserved.signal(); return .staleGeneration } }; let scripted: CallbackConsumeResult; switch await completions.take(["callback_consumed", "callback_malformed", "callback_expired", "callback_replayed", "callback_duplicate", "callback_unsupported", "callback_stale", "callback_failed"]) { case "callback_consumed": scripted = .consumed(.init("opaque-pkce")); case "callback_malformed": scripted = .malformed; case "callback_expired": scripted = .expired; case "callback_replayed": scripted = .replayed; case "callback_duplicate": scripted = .duplicate; case "callback_unsupported": scripted = .unsupported; case "callback_stale": scripted = .staleGeneration; case "callback_failed": scripted = .failed; default: scripted = result }; switch scripted { case .consumed, .malformed, .expired, .replayed, .unsupported: atomicWipe = true; default: atomicWipe = false }; if atomicWipe { pending = false }; return scripted }
    func purge(generation: UInt64) async -> ConditionalMutationResult { await audit.add("callback"); purgeAfterValidationCancellation = !suspendValidation || validationCanceled; let scripted: ConditionalMutationResult = await completions.take(["purge_failed"]) == "purge_failed" ? .failed : purgeResult; guard generations.compareAndMutate(generation, { if scripted == .applied { pending = false } }) else { return .staleGeneration }; return scripted }
    func confirmEmpty(generation: UInt64) async -> Bool { await audit.add("callback_confirm"); return confirm && !pending }
    func activateGeneration(_ generation: UInt64) async { if suspendActivation { await activationGate.suspendPoint() }; generations.activate(generation) }
    func cancelOwnedWork(generation: UInt64) async { canceled.insert(generation); if suspendValidation { await validationGate.release(); await validationCancellationObserved.wait() } }
}
private actor ScriptClock: AuthClockPort {
    private final class SleepHandle: @unchecked Sendable { let generation: UInt64, gate = Gate(), cancellationObserved = OneShotSignal(); var canceled = false; init(_ generation: UInt64) { self.generation = generation } }
    private let times: [UInt64]; private let completions: CompletionAudit; private var index = 0, sleeps: [UInt64] = [], suspendSleep = false; private var delayedElapsed: UInt64?; private var active: [SleepHandle] = []
    init(_ times: [UInt64], _ completions: CompletionAudit) { self.times = times; self.completions = completions }
    func monotonicMilliseconds() async -> UInt64 { defer { index += 1 }; return times.indices.contains(index) ? times[index] : (times.last ?? 0) }
    func setSuspendSleep(_ value: Bool) { suspendSleep = value }
    func setDelayedElapsed(_ value: UInt64) { delayedElapsed = value }
    func waitSleepStarted() async { while active.isEmpty { await Task.yield() }; if let handle = active.last { await handle.gate.waitUntilStarted() } }
    func releaseSleep() async { for handle in active { await handle.gate.release() } }
    func sleep(milliseconds: UInt64, generation: UInt64) async -> Bool { sleeps.append(milliseconds); let handle = SleepHandle(generation); active.append(handle); if await completions.take(["timer_fired"]) == "timer_fired" { active.removeAll { $0 === handle }; return true }; if milliseconds == 500, let delayedElapsed { active.removeAll { $0 === handle }; return delayedElapsed >= milliseconds }; let shouldSuspend = suspendSleep || (await completions.hasCommands()) || milliseconds == 500; if shouldSuspend { await handle.gate.suspendPoint() }; active.removeAll { $0 === handle }; if handle.canceled { await handle.cancellationObserved.signal() }; return !shouldSuspend && !handle.canceled }
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
