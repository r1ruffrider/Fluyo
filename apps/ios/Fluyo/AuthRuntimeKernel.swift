import Foundation

enum AuthRuntimeState: String { case initializing, signedOut = "signed_out", callbackPending = "callback_pending", authenticated, offlineSessionCandidate = "offline_session_candidate", refreshPending = "refresh_pending", expiredOrRevoked = "expired_or_revoked", accountSwitching = "account_switching", unusableLink = "unusable_link", safeTerminalError = "safe_terminal_error" }
enum SessionCandidateStatus: String { case unknown, absent, present }
enum SafeDestinationId: String { case signedOut = "signed_out", internalFoundationHome = "internal_foundation_home", recoveryStart = "recovery_start", previousSafeScreen = "previous_safe_screen" }
enum FixedAuthOutcomeCategory: String { case success, canceled, malformed, expired, replayed, duplicate, unsupported, overlapRejected = "overlap_rejected", transientFailure = "transient_failure", reauthenticationRequired = "reauthentication_required", forbidden, ownerMismatch = "owner_mismatch", staleGenerationDiscarded = "stale_generation_discarded", vaultCorrupt = "vault_corrupt", timedOut = "timed_out" }

struct AuthRuntimeSnapshot {
    let state: AuthRuntimeState
    let hasSessionCandidate: SessionCandidateStatus
    let hasVerifiedOwnerState: Bool
    let safeDestinationId: SafeDestinationId
    let fixedOutcomeCategory: FixedAuthOutcomeCategory?
}

enum AuthFocusTarget: String { case heading, primaryAction = "primary_action", safeDestination = "safe_destination" }
enum AuthAnnouncementMessageId: String { case initializing, callbackPending = "callback_pending", authenticatedAfterCallback = "authenticated_after_callback", offlineCandidate = "offline_candidate", refreshPending = "refresh_pending", accountSwitching = "account_switching", unusableLink = "unusable_link", safeTerminalError = "safe_terminal_error", sessionEnded = "session_ended" }
enum AuthAnnouncementPriority: String { case polite, assertive }
struct AuthPresentationPayload {
    let focus: AuthFocusTarget?
    let announcement: AuthAnnouncementMessageId?
    let priority: AuthAnnouncementPriority?
    let navigation: SafeDestinationId?
}
struct AuthPresentationEffect {
    let generation: UInt64
    let sequence: UInt64
    let originatingState: AuthRuntimeState
    let payload: AuthPresentationPayload
}
enum AuthTimeoutKind { case providerOrApiStep, totalActionable; var milliseconds: UInt64 { self == .providerOrApiStep ? 15_000 : 30_000 } }
enum AuthTraceEntry: String {
    case initRead = "init_read", callbackReserved = "callback_reserved", callbackConsumed = "callback_consumed"
    case callbackRejected = "callback_rejected", callbackDuplicate = "callback_duplicate", callbackOverlap = "callback_overlap"
    case providerExchange = "provider_exchange", providerRefresh = "provider_refresh", ownerVerify = "owner_verify"
    case vaultReplace = "vault_replace", ownerBind = "owner_bind", timer500 = "timer_500"
    case timer15000 = "timer_15000", timer30000 = "timer_30000", generationFence = "generation_fence"
    case callbackPurge = "callback_purge", headersClear = "headers_clear", vaultClear = "vault_clear"
    case ownerPurge = "owner_purge", callbackConfirm = "callback_confirm", vaultConfirm = "vault_confirm"
    case ownerConfirm = "owner_confirm", staleRejected = "stale_rejected", snapshotPublished = "snapshot_published"
    case effectEnqueued = "effect_enqueued", terminalLatched = "terminal_latched"
}

final class OpaqueSessionCandidate: CustomStringConvertible, Sendable { let storage: String; init(_ storage: String) { self.storage = storage }; var description: String { "<opaque-session-candidate>" } }
final class OpaqueOwnerSubject: CustomStringConvertible, Sendable { let storage: String; init(_ storage: String) { self.storage = storage }; var description: String { "<opaque-owner-subject>" } }
final class OpaqueCallbackIngress: CustomStringConvertible, Sendable { let storage: String; init(_ storage: String) { self.storage = storage }; var description: String { "<opaque-callback-ingress>" } }

enum AuthPortResult<T: Sendable>: Sendable { case success(T), transientFailure, explicitInvalidation, forbidden, malformed }
enum ConditionalMutationResult: Sendable { case applied, staleGeneration, failed }
enum CallbackConsumeResult: Sendable { case consumed(OpaqueSessionCandidate), malformed, expired, replayed, duplicate, unsupported, staleGeneration, failed }

protocol AuthProviderPort: Sendable {
    func exchange(_ candidate: OpaqueSessionCandidate, generation: UInt64) async -> AuthPortResult<OpaqueSessionCandidate>
    func refresh(_ candidate: OpaqueSessionCandidate, generation: UInt64) async -> AuthPortResult<OpaqueSessionCandidate>
    func verifyOwner(_ candidate: OpaqueSessionCandidate, generation: UInt64) async -> AuthPortResult<OpaqueOwnerSubject>
    func cancelOwnedWork(generation: UInt64) async
}
protocol SessionVaultPort: Sendable {
    func read(generation: UInt64) async -> AuthPortResult<OpaqueSessionCandidate?>
    func replace(_ candidate: OpaqueSessionCandidate, generation: UInt64) async -> ConditionalMutationResult
    func clear(generation: UInt64) async -> ConditionalMutationResult
    func confirmEmpty(generation: UInt64) async -> Bool
}
protocol CallbackTransactionStorePort: Sendable {
    func validateConsumeAndWipe(_ ingress: OpaqueCallbackIngress, generation: UInt64) async -> CallbackConsumeResult
    func purge(generation: UInt64) async -> ConditionalMutationResult
    func confirmEmpty(generation: UInt64) async -> Bool
    func activateGeneration(_ generation: UInt64) async
    func cancelOwnedWork(generation: UInt64) async
}
protocol AuthClockPort: Sendable {
    func monotonicMilliseconds() async -> UInt64
    func sleep(milliseconds: UInt64, generation: UInt64) async -> Bool
    func cancelOwnedTimers(generation: UInt64) async
}
protocol OwnerDataStorePort: Sendable {
    func bind(_ owner: OpaqueOwnerSubject, generation: UInt64) async -> ConditionalMutationResult
    func clearHeadersAndRequests(generation: UInt64) async -> ConditionalMutationResult
    func purgeOwnerData(generation: UInt64) async -> ConditionalMutationResult
    func confirmEmpty(generation: UInt64) async -> Bool
}
protocol StructurallyNoOpTelemetryPort: Sendable {}

actor AuthRuntimeCoordinator {
    private enum OperationKind { case initialize, callback, refresh, timer, cleanup }
    private struct Reservation { let generation: UInt64; let id: UInt64; let kind: OperationKind; let stable: AuthRuntimeSnapshot; let stateVersion: UInt64; let startedAt: UInt64 }
    private let provider: any AuthProviderPort
    private let vault: any SessionVaultPort
    private let callbackStore: any CallbackTransactionStorePort
    private let clock: any AuthClockPort
    private let ownerStore: any OwnerDataStorePort
    private var generation: UInt64
    private var stateVersion: UInt64 = 0
    private var nextReservation: UInt64 = 1
    private var nextEffectSequence: UInt64 = 1
    private var terminal = false
    private var active: Reservation?
    private var refreshAttemptedGeneration: UInt64?
    private var snapshotValue = AuthRuntimeSnapshot(state: .initializing, hasSessionCandidate: .unknown, hasVerifiedOwnerState: false, safeDestinationId: .signedOut, fixedOutcomeCategory: nil)
    private var effects: [AuthPresentationEffect] = []
    private var effectHistory: [AuthPresentationEffect] = []
    private var trace: [AuthTraceEntry] = []
    private var publishedSnapshots: [(AuthRuntimeSnapshot, UInt64)] = []
    private var staleOutcomeSuppressedGenerations: Set<UInt64> = []

    init(provider: any AuthProviderPort, vault: any SessionVaultPort, callbackStore: any CallbackTransactionStorePort, clock: any AuthClockPort, ownerStore: any OwnerDataStorePort, telemetry: any StructurallyNoOpTelemetryPort, initialGeneration: UInt64 = 1) {
        self.provider = provider; self.vault = vault; self.callbackStore = callbackStore
        self.clock = clock; self.ownerStore = ownerStore; generation = initialGeneration; _ = telemetry
    }

    func snapshot() -> AuthRuntimeSnapshot { snapshotValue }
    func currentGeneration() -> UInt64 { generation }
    func normalizedTrace() -> [AuthTraceEntry] { trace }
    func snapshotHistory() -> [(AuthRuntimeSnapshot, UInt64)] { publishedSnapshots }
    func presentationEffectHistory() -> [AuthPresentationEffect] { effectHistory }
    func isTerminalFenced() -> Bool { terminal }
    func drainPresentationEffects(for requestedGeneration: UInt64) -> [AuthPresentationEffect] {
        guard requestedGeneration == generation else { return [] }
        let drained = effects; effects.removeAll(keepingCapacity: false); return drained
    }

    func initialize(online: Bool) async {
        let startedAt = await clock.monotonicMilliseconds()
        guard let reservation = reserve(.initialize, startedAt: startedAt) else { return }
        let initializingEffect = Task { [clock] in
            let fired = await clock.sleep(milliseconds: 500, generation: reservation.generation)
            await self.initializingTimerFired(fired, reservation)
        }
        await Task.yield()
        append(.initRead, reservation); let result = await vault.read(generation: reservation.generation)
        guard valid(reservation) else { await finishInitialization(reservation, initializingEffect); return }
        switch result {
        case .success(nil): publish(signedOut(.success), reservation)
        case let .success(.some(candidate)) where !online: _ = candidate; publishWithEffect(offline(false), reservation, offlineEntryEffect())
        case let .success(.some(candidate)): await verify(candidate, reservation, announceSuccess: false)
        case .transientFailure: publishWithEffect(terminalSnapshot(.timedOut), reservation, terminalEntryEffect())
        case .forbidden: publishWithEffect(safeTerminal(from: reservation.stable, outcome: .forbidden), reservation, terminalEntryEffect())
        case .explicitInvalidation, .malformed: await cleanup(.safeTerminalError, reservation, .vaultCorrupt)
        }
        await finishInitialization(reservation, initializingEffect)
    }

    private func initializingTimerFired(_ fired: Bool, _ reservation: Reservation) {
        guard fired, valid(reservation), stateVersion == reservation.stateVersion, snapshotValue.state == .initializing else { return }
        trace.append(.timer500)
        enqueueLocked(reservation.generation, .initializing, .init(focus: nil, announcement: .initializing, priority: .polite, navigation: nil))
    }
    private func finishInitialization(_ reservation: Reservation, _ task: Task<Void, Never>) async {
        task.cancel()
        await clock.cancelOwnedTimers(generation: reservation.generation)
        await task.value
        finish(reservation)
    }

    func receiveCallback(_ ingress: OpaqueCallbackIngress) async {
        let startedAt = await clock.monotonicMilliseconds()
        guard let reservation = reserveCallback(startedAt: startedAt) else { return }
        defer { finish(reservation) }
        let consumed = await callbackStore.validateConsumeAndWipe(ingress, generation: reservation.generation)
        guard valid(reservation) else { return }
        switch consumed {
        case let .consumed(candidate):
            append(.callbackConsumed, reservation)
            let retainedCandidate = reservation.stable.hasVerifiedOwnerState ? reservation.stable.hasSessionCandidate : .absent
            publishWithEffect(.init(state: .callbackPending, hasSessionCandidate: retainedCandidate, hasVerifiedOwnerState: reservation.stable.hasVerifiedOwnerState, safeDestinationId: reservation.stable.safeDestinationId, fixedOutcomeCategory: nil), reservation, callbackEntryEffect())
            append(.providerExchange, reservation)
            let exchanged = await provider.exchange(candidate, generation: reservation.generation)
            guard !Task.isCancelled, valid(reservation) else { finish(reservation); return }
            switch exchanged {
            case let .success(session): await verify(session, reservation, announceSuccess: true)
            case .transientFailure: await failCallback(.transientFailure, reservation)
            case .forbidden: await failCallback(.forbidden, reservation)
            case .malformed: await rejectCallback(.malformed, reservation)
            case .explicitInvalidation: await cleanup(.expiredOrRevoked, reservation, .reauthenticationRequired)
            }
        case .duplicate: append(.callbackDuplicate, reservation)
        case .replayed: await rejectCallback(.replayed, reservation)
        case .expired: await rejectCallback(.expired, reservation)
        case .unsupported: await rejectCallback(.unsupported, reservation)
        case .malformed: await rejectCallback(.malformed, reservation)
        case .staleGeneration: append(.staleRejected, reservation)
        case .failed: await callbackStoreFailure(reservation)
        }
        finish(reservation)
    }

    func cancelCallback() async {
        guard let reservation = active, !terminal, reservation.kind == .callback, reservation.generation == generation else { return }
        let now = await clock.monotonicMilliseconds(); guard now >= reservation.startedAt else { return }
        let elapsed = now - reservation.startedAt; guard elapsed >= 500 else { return }
        append(.timer500, reservation)
        let canceled = reservation.stable.hasVerifiedOwnerState ? reservation.stable.withOutcome(.canceled) : signedOut(.canceled)
        _ = await transitionAfterFence(reservation.generation, canceled, [])
    }

    func handle401(_ candidate: OpaqueSessionCandidate) async {
        let startedAt = await clock.monotonicMilliseconds()
        guard let reservation = reserve(.refresh, startedAt: startedAt) else { return }
        if refreshAttemptedGeneration == reservation.generation { await cleanup(.expiredOrRevoked, reservation, .reauthenticationRequired); finish(reservation); return }
        refreshAttemptedGeneration = reservation.generation
        publish(.init(state: .refreshPending, hasSessionCandidate: .present, hasVerifiedOwnerState: reservation.stable.hasVerifiedOwnerState, safeDestinationId: reservation.stable.safeDestinationId, fixedOutcomeCategory: nil), reservation)
        let refreshEffect = Task { [clock] in
            let fired = await clock.sleep(milliseconds: 500, generation: reservation.generation)
            await self.refreshTimerFired(fired, reservation)
        }
        append(.providerRefresh, reservation); let refreshed = await provider.refresh(candidate, generation: reservation.generation)
        guard valid(reservation) else { await finishRefresh(reservation, refreshEffect); return }
        switch refreshed {
        case let .success(value): await verify(value, reservation, announceSuccess: false)
        case .transientFailure: publishWithEffect(offline(from: reservation.stable, outcome: .transientFailure), reservation, offlineEntryEffect())
        case .forbidden: publishWithEffect(safeTerminal(from: reservation.stable, outcome: .forbidden), reservation, terminalEntryEffect())
        case .explicitInvalidation, .malformed: await cleanup(.expiredOrRevoked, reservation, .reauthenticationRequired)
        }
        await finishRefresh(reservation, refreshEffect)
    }

    private func refreshTimerFired(_ fired: Bool, _ reservation: Reservation) {
        guard fired, valid(reservation), snapshotValue.state == .refreshPending else { return }
        trace.append(.timer500)
        enqueueLocked(reservation.generation, .refreshPending, .init(focus: .heading, announcement: .refreshPending, priority: .polite, navigation: nil))
    }
    private func finishRefresh(_ reservation: Reservation, _ task: Task<Void, Never>) async {
        task.cancel()
        await clock.cancelOwnedTimers(generation: reservation.generation)
        await task.value
        effects.removeAll { $0.generation == reservation.generation && $0.originatingState == .refreshPending }
        finish(reservation)
    }

    func handle403() {
        guard !terminal, active == nil else { return }
        let forbidden = safeTerminal(from: snapshotValue, outcome: .forbidden)
        publishLocked(forbidden); enqueueLocked(generation, forbidden.state, terminalEntryEffect())
    }
    func signOut() async { await cleanup(.signedOut, nil, .success) }
    func switchAccount() async { await cleanup(.accountSwitching, nil, .success) }

    func scheduleTimeout(_ kind: AuthTimeoutKind) async {
        let startedAt = await clock.monotonicMilliseconds()
        guard let reservation = reserveTimeout(startedAt: startedAt) else { return }
        defer { finish(reservation) }
        append(kind == .providerOrApiStep ? .timer15000 : .timer30000, reservation)
        let fired = await clock.sleep(milliseconds: kind.milliseconds, generation: reservation.generation)
        guard valid(reservation), fired else { return }
        let timed: AuthRuntimeSnapshot
        let effect: AuthPresentationPayload
        if reservation.kind == .refresh, kind == .providerOrApiStep {
            timed = offline(from: reservation.stable, outcome: .timedOut)
            effect = offlineEntryEffect()
        } else {
            switch reservation.kind {
            case .callback: timed = callbackTerminal(from: reservation.stable, outcome: .timedOut)
            case .refresh: timed = safeTerminal(from: reservation.stable, outcome: .timedOut)
            default: timed = safeTerminal(from: reservation.stable, outcome: .timedOut)
            }
            effect = terminalEntryEffect()
        }
        _ = await transitionAfterFence(reservation.generation, timed, [effect])
    }

    func cancelRefresh() async {
        guard let reservation = active, !terminal, reservation.kind == .refresh, reservation.generation == generation else { return }
        let now = await clock.monotonicMilliseconds(); guard now >= reservation.startedAt, now - reservation.startedAt >= 500 else { return }
        append(.timer500, reservation)
        _ = await transitionAfterFence(reservation.generation, offline(from: reservation.stable, outcome: .canceled), [offlineEntryEffect()])
    }

    func scheduleDelayedAnnouncement(_ messageId: AuthAnnouncementMessageId, priority: AuthAnnouncementPriority) async {
        guard !terminal else { return }; let captured = (generation, stateVersion, snapshotValue.state); trace.append(.timer500)
        let fired = await clock.sleep(milliseconds: 500, generation: captured.0)
        guard !terminal, fired, generation == captured.0, stateVersion == captured.1, snapshotValue.state == captured.2 else { return }
        enqueueLocked(captured.0, captured.2, .init(focus: nil, announcement: messageId, priority: priority, navigation: nil))
    }

    private func verify(_ candidate: OpaqueSessionCandidate, _ reservation: Reservation, announceSuccess: Bool) async {
        append(.ownerVerify, reservation); let owner = await provider.verifyOwner(candidate, generation: reservation.generation)
        guard valid(reservation) else { return }
        switch owner {
        case let .success(subject):
            append(.vaultReplace, reservation); let vaultMutation = await vault.replace(candidate, generation: reservation.generation)
            guard valid(reservation) else { return }
            guard vaultMutation == .applied else { await cleanup(.safeTerminalError, reservation, .vaultCorrupt); return }
            append(.ownerBind, reservation); let ownerMutation = await ownerStore.bind(subject, generation: reservation.generation)
            guard valid(reservation) else { return }
            guard ownerMutation == .applied else { await cleanup(.safeTerminalError, reservation, .ownerMismatch); return }
            let authenticated = AuthRuntimeSnapshot(state: .authenticated, hasSessionCandidate: .present, hasVerifiedOwnerState: true, safeDestinationId: .internalFoundationHome, fixedOutcomeCategory: .success)
            publish(authenticated, reservation)
            if announceSuccess { enqueue(reservation, authenticated.state, .init(focus: .safeDestination, announcement: .authenticatedAfterCallback, priority: .polite, navigation: .internalFoundationHome)) }
        case .transientFailure: publishWithEffect(offline(reservation.stable.hasVerifiedOwnerState), reservation, offlineEntryEffect())
        case .forbidden: publishWithEffect(safeTerminal(from: reservation.stable, outcome: .forbidden), reservation, terminalEntryEffect())
        case .explicitInvalidation: await cleanup(.expiredOrRevoked, reservation, .reauthenticationRequired)
        case .malformed: await cleanup(.safeTerminalError, reservation, .ownerMismatch)
        }
    }

    private func reserve(_ kind: OperationKind, startedAt: UInt64 = 0) -> Reservation? {
        guard !terminal, active == nil else { return nil }
        guard generation < UInt64.max else { latchTerminal(.transientFailure); return nil }
        let reservation = Reservation(generation: generation, id: nextReservation, kind: kind, stable: snapshotValue, stateVersion: stateVersion, startedAt: startedAt)
        nextReservation += 1; active = reservation; return reservation
    }
    private func reserveCallback(startedAt: UInt64) -> Reservation? {
        guard !terminal else { return nil }
        if active?.kind == .callback, active?.generation == generation { trace.append(.callbackOverlap); return nil }
        guard active == nil else { return nil }
        guard generation < UInt64.max else { latchTerminal(.transientFailure); return nil }
        let reservation = Reservation(generation: generation, id: nextReservation, kind: .callback, stable: snapshotValue, stateVersion: stateVersion, startedAt: startedAt)
        nextReservation += 1; active = reservation; trace.append(.callbackReserved); return reservation
    }
    private func reserveTimeout(startedAt: UInt64) -> Reservation? {
        guard !terminal else { return nil }; if let active { return active.kind == .cleanup ? nil : active }
        guard generation < UInt64.max else { latchTerminal(.transientFailure); return nil }
        let reservation = Reservation(generation: generation, id: nextReservation, kind: .timer, stable: snapshotValue, stateVersion: stateVersion, startedAt: startedAt)
        nextReservation += 1; active = reservation; return reservation
    }
    private func valid(_ reservation: Reservation) -> Bool { let result = !terminal && generation == reservation.generation && active?.id == reservation.id; if !result, !terminal { trace.append(.staleRejected) }; return result }
    private func finish(_ reservation: Reservation) { if active?.id == reservation.id { active = nil } }
    private func append(_ entry: AuthTraceEntry, _ reservation: Reservation) { if valid(reservation) { trace.append(entry) } }
    private func publish(_ snapshot: AuthRuntimeSnapshot, _ reservation: Reservation) { if valid(reservation) { publishLocked(snapshot) } }
    private func publishWithEffect(_ snapshot: AuthRuntimeSnapshot, _ reservation: Reservation, _ payload: AuthPresentationPayload) { if valid(reservation) { publishLocked(snapshot); enqueueLocked(reservation.generation, snapshot.state, payload) } }
    private func publishUnreserved(_ snapshot: AuthRuntimeSnapshot, _ requestedGeneration: UInt64) { if !terminal, generation == requestedGeneration { publishLocked(snapshot) } }
    private func publishLocked(_ snapshot: AuthRuntimeSnapshot) { snapshotValue = snapshot; stateVersion += 1; publishedSnapshots.append((snapshot, generation)); trace.append(.snapshotPublished) }
    private func enqueue(_ reservation: Reservation, _ origin: AuthRuntimeState, _ payload: AuthPresentationPayload) { if valid(reservation) { enqueueLocked(reservation.generation, origin, payload) } }
    private func enqueueUnreserved(_ requestedGeneration: UInt64, _ origin: AuthRuntimeState, _ payload: AuthPresentationPayload) { if !terminal, generation == requestedGeneration { enqueueLocked(requestedGeneration, origin, payload) } }
    private func enqueueLocked(_ requestedGeneration: UInt64, _ origin: AuthRuntimeState, _ payload: AuthPresentationPayload) { let effect = AuthPresentationEffect(generation: requestedGeneration, sequence: nextEffectSequence, originatingState: origin, payload: payload); effects.append(effect); effectHistory.append(effect); nextEffectSequence += 1; trace.append(.effectEnqueued) }
    private func transitionAfterFence(_ expected: UInt64, _ snapshot: AuthRuntimeSnapshot, _ payloads: [AuthPresentationPayload]) async -> Bool {
        let completion = Task { await self.transitionAfterFenceIrrevocably(expected, snapshot, payloads) }
        return await withTaskCancellationHandler(operation: { await completion.value }, onCancel: {})
    }
    private func transitionAfterFenceIrrevocably(_ expected: UInt64, _ snapshot: AuthRuntimeSnapshot, _ payloads: [AuthPresentationPayload]) async -> Bool {
        guard let fencing = installFence(expected, kind: .cleanup, suppressStaleOutcome: true) else { return false }
        defer { finish(fencing) }
        await provider.cancelOwnedWork(generation: expected); guard valid(fencing) else { return false }
        await callbackStore.cancelOwnedWork(generation: expected); guard valid(fencing) else { return false }
        await clock.cancelOwnedTimers(generation: expected); guard valid(fencing) else { return false }
        await callbackStore.activateGeneration(fencing.generation); guard valid(fencing) else { return false }
        publish(snapshot, fencing); for payload in payloads { enqueue(fencing, snapshot.state, payload) }; return true
    }

    private func rejectCallback(_ category: FixedAuthOutcomeCategory, _ reservation: Reservation) async {
        append(.callbackRejected, reservation)
        let rejected = AuthRuntimeSnapshot(state: .unusableLink, hasSessionCandidate: reservation.stable.hasVerifiedOwnerState ? reservation.stable.hasSessionCandidate : .absent, hasVerifiedOwnerState: reservation.stable.hasVerifiedOwnerState, safeDestinationId: reservation.stable.safeDestinationId, fixedOutcomeCategory: category)
        _ = await transitionAfterFence(reservation.generation, rejected, [.init(focus: .heading, announcement: .unusableLink, priority: .assertive, navigation: nil)])
    }
    private func failCallback(_ category: FixedAuthOutcomeCategory, _ reservation: Reservation) async {
        append(.callbackRejected, reservation)
        _ = await transitionAfterFence(reservation.generation, callbackTerminal(from: reservation.stable, outcome: category), [terminalEntryEffect()])
    }
    private func callbackStoreFailure(_ reservation: Reservation) async {
        let completion = Task { await self.callbackStoreFailureIrrevocably(reservation) }
        await withTaskCancellationHandler(operation: { await completion.value }, onCancel: {})
    }
    private func callbackStoreFailureIrrevocably(_ reservation: Reservation) async {
        guard let cleanup = await fenceForCleanup(reservation.generation) else { return }
        defer { finish(cleanup) }
        guard valid(cleanup) else { return }
        append(.callbackPurge, cleanup); let purged = await callbackStore.purge(generation: cleanup.generation); guard valid(cleanup) else { return }
        guard purged == .applied else { latchCleanupFailure(cleanup); return }
        append(.callbackConfirm, cleanup); let empty = await callbackStore.confirmEmpty(generation: cleanup.generation); guard valid(cleanup) else { return }
        guard empty else { latchCleanupFailure(cleanup); return }
        let failed = callbackTerminal(from: reservation.stable, outcome: .transientFailure); publish(failed, cleanup); enqueue(cleanup, failed.state, terminalEntryEffect())
    }

    private func cleanup(_ destination: AuthRuntimeState, _ reservation: Reservation?, _ outcome: FixedAuthOutcomeCategory) async {
        let completion = Task { await self.cleanupIrrevocably(destination, reservation, outcome) }
        await withTaskCancellationHandler(operation: { await completion.value }, onCancel: {})
    }
    private func cleanupIrrevocably(_ destination: AuthRuntimeState, _ reservation: Reservation?, _ outcome: FixedAuthOutcomeCategory) async {
        let expected = reservation?.generation ?? generation; guard let cleanup = await fenceForCleanup(expected) else { return }
        defer { finish(cleanup) }
        guard valid(cleanup) else { return }
        append(.callbackPurge, cleanup); let callbackPurge = await callbackStore.purge(generation: cleanup.generation); guard valid(cleanup) else { return }; guard callbackPurge == .applied else { latchCleanupFailure(cleanup); return }
        append(.headersClear, cleanup); let headers = await ownerStore.clearHeadersAndRequests(generation: cleanup.generation); guard valid(cleanup) else { return }; guard headers == .applied else { latchCleanupFailure(cleanup); return }
        append(.vaultClear, cleanup); let vaultClear = await vault.clear(generation: cleanup.generation); guard valid(cleanup) else { return }; guard vaultClear == .applied else { latchCleanupFailure(cleanup); return }
        append(.ownerPurge, cleanup); let ownerPurge = await ownerStore.purgeOwnerData(generation: cleanup.generation); guard valid(cleanup) else { return }; guard ownerPurge == .applied else { latchCleanupFailure(cleanup); return }
        append(.callbackConfirm, cleanup); let callbackEmpty = await callbackStore.confirmEmpty(generation: cleanup.generation); guard valid(cleanup) else { return }; guard callbackEmpty else { latchCleanupFailure(cleanup); return }
        append(.vaultConfirm, cleanup); let vaultEmpty = await vault.confirmEmpty(generation: cleanup.generation); guard valid(cleanup) else { return }; guard vaultEmpty else { latchCleanupFailure(cleanup); return }
        append(.ownerConfirm, cleanup); let ownerEmpty = await ownerStore.confirmEmpty(generation: cleanup.generation); guard valid(cleanup) else { return }; guard ownerEmpty else { latchCleanupFailure(cleanup); return }
        let next: AuthRuntimeSnapshot
        if destination == .accountSwitching { next = .init(state: .accountSwitching, hasSessionCandidate: .absent, hasVerifiedOwnerState: false, safeDestinationId: .signedOut, fixedOutcomeCategory: outcome) }
        else if destination == .expiredOrRevoked { next = .init(state: .expiredOrRevoked, hasSessionCandidate: .absent, hasVerifiedOwnerState: false, safeDestinationId: .signedOut, fixedOutcomeCategory: outcome) }
        else if destination == .safeTerminalError { next = .init(state: .safeTerminalError, hasSessionCandidate: .absent, hasVerifiedOwnerState: false, safeDestinationId: .signedOut, fixedOutcomeCategory: outcome) }
        else { next = signedOut(outcome) }
        publish(next, cleanup)
        switch destination {
        case .accountSwitching: enqueue(cleanup, next.state, accountSwitchingEntryEffect())
        case .expiredOrRevoked: enqueue(cleanup, next.state, sessionEndedEffect())
        case .signedOut: if outcome == .success { enqueue(cleanup, next.state, sessionEndedEffect()) }
        case .safeTerminalError: enqueue(cleanup, next.state, terminalEntryEffect())
        default: break
        }
    }

    private func latchCleanupFailure(_ reservation: Reservation) { if valid(reservation) { latchTerminal(.transientFailure) } }
    private func fenceForCleanup(_ expected: UInt64) async -> Reservation? {
        guard let reservation = installFence(expected, kind: .cleanup, suppressStaleOutcome: false) else { return nil }
        await provider.cancelOwnedWork(generation: expected); guard valid(reservation) else { finish(reservation); return nil }
        await callbackStore.cancelOwnedWork(generation: expected); guard valid(reservation) else { finish(reservation); return nil }
        await clock.cancelOwnedTimers(generation: expected); guard valid(reservation) else { finish(reservation); return nil }
        await callbackStore.activateGeneration(reservation.generation); guard valid(reservation) else { finish(reservation); return nil }
        return reservation
    }
    private func installFence(_ expected: UInt64, kind: OperationKind, suppressStaleOutcome: Bool) -> Reservation? {
        guard !terminal, generation == expected else { return nil }
        guard generation < UInt64.max else { latchTerminal(.transientFailure); return nil }
        if suppressStaleOutcome { staleOutcomeSuppressedGenerations.insert(expected) }
        generation += 1; effects.removeAll(keepingCapacity: false); refreshAttemptedGeneration = nil; trace.append(.generationFence)
        let reservation = Reservation(generation: generation, id: nextReservation, kind: kind, stable: snapshotValue, stateVersion: stateVersion, startedAt: 0)
        nextReservation += 1; active = reservation; return reservation
    }
    private func latchTerminal(_ category: FixedAuthOutcomeCategory) { terminal = true; active = nil; effects.removeAll(keepingCapacity: false); snapshotValue = terminalSnapshot(category); stateVersion += 1; publishedSnapshots.append((snapshotValue, generation)); trace.append(.terminalLatched); enqueueLocked(generation, .safeTerminalError, terminalEntryEffect()) }
    private func signedOut(_ outcome: FixedAuthOutcomeCategory) -> AuthRuntimeSnapshot { .init(state: .signedOut, hasSessionCandidate: .absent, hasVerifiedOwnerState: false, safeDestinationId: .signedOut, fixedOutcomeCategory: outcome) }
    private func offline(_ owner: Bool) -> AuthRuntimeSnapshot { .init(state: .offlineSessionCandidate, hasSessionCandidate: .present, hasVerifiedOwnerState: owner, safeDestinationId: .signedOut, fixedOutcomeCategory: .success) }
    private func offline(from stable: AuthRuntimeSnapshot, outcome: FixedAuthOutcomeCategory) -> AuthRuntimeSnapshot { .init(state: .offlineSessionCandidate, hasSessionCandidate: .present, hasVerifiedOwnerState: stable.hasVerifiedOwnerState, safeDestinationId: stable.safeDestinationId, fixedOutcomeCategory: outcome) }
    private func terminalSnapshot(_ outcome: FixedAuthOutcomeCategory) -> AuthRuntimeSnapshot { .init(state: .safeTerminalError, hasSessionCandidate: .unknown, hasVerifiedOwnerState: false, safeDestinationId: .signedOut, fixedOutcomeCategory: outcome) }
    private func safeTerminal(from stable: AuthRuntimeSnapshot, outcome: FixedAuthOutcomeCategory) -> AuthRuntimeSnapshot { .init(state: .safeTerminalError, hasSessionCandidate: stable.hasSessionCandidate, hasVerifiedOwnerState: stable.hasVerifiedOwnerState, safeDestinationId: stable.safeDestinationId, fixedOutcomeCategory: outcome) }
    private func callbackTerminal(from stable: AuthRuntimeSnapshot, outcome: FixedAuthOutcomeCategory) -> AuthRuntimeSnapshot { .init(state: .safeTerminalError, hasSessionCandidate: stable.hasVerifiedOwnerState ? stable.hasSessionCandidate : .absent, hasVerifiedOwnerState: stable.hasVerifiedOwnerState, safeDestinationId: stable.safeDestinationId, fixedOutcomeCategory: outcome) }
    private func callbackEntryEffect() -> AuthPresentationPayload { .init(focus: .heading, announcement: .callbackPending, priority: .polite, navigation: nil) }
    private func offlineEntryEffect() -> AuthPresentationPayload { .init(focus: .heading, announcement: .offlineCandidate, priority: .polite, navigation: nil) }
    private func accountSwitchingEntryEffect() -> AuthPresentationPayload { .init(focus: .heading, announcement: .accountSwitching, priority: .polite, navigation: nil) }
    private func terminalEntryEffect() -> AuthPresentationPayload { .init(focus: .heading, announcement: .safeTerminalError, priority: .assertive, navigation: nil) }
    private func sessionEndedEffect() -> AuthPresentationPayload { .init(focus: .heading, announcement: .sessionEnded, priority: .assertive, navigation: nil) }
}

private extension AuthRuntimeSnapshot {
    func withOutcome(_ outcome: FixedAuthOutcomeCategory) -> AuthRuntimeSnapshot { .init(state: state, hasSessionCandidate: hasSessionCandidate, hasVerifiedOwnerState: hasVerifiedOwnerState, safeDestinationId: safeDestinationId, fixedOutcomeCategory: outcome) }
}
