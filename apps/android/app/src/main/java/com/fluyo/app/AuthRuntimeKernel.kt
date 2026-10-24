package com.fluyo.app

import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

enum class AuthRuntimeState(val wire: String) {
    INITIALIZING("initializing"), SIGNED_OUT("signed_out"), CALLBACK_PENDING("callback_pending"),
    AUTHENTICATED("authenticated"), OFFLINE_SESSION_CANDIDATE("offline_session_candidate"),
    REFRESH_PENDING("refresh_pending"), EXPIRED_OR_REVOKED("expired_or_revoked"),
    ACCOUNT_SWITCHING("account_switching"), UNUSABLE_LINK("unusable_link"), SAFE_TERMINAL_ERROR("safe_terminal_error"),
}
enum class SessionCandidateStatus(val wire: String) { UNKNOWN("unknown"), ABSENT("absent"), PRESENT("present") }
enum class SafeDestinationId(val wire: String) {
    SIGNED_OUT("signed_out"), INTERNAL_FOUNDATION_HOME("internal_foundation_home"),
    RECOVERY_START("recovery_start"), PREVIOUS_SAFE_SCREEN("previous_safe_screen"),
}
enum class FixedAuthOutcomeCategory(val wire: String) {
    SUCCESS("success"), CANCELED("canceled"), MALFORMED("malformed"), EXPIRED("expired"),
    REPLAYED("replayed"), DUPLICATE("duplicate"), UNSUPPORTED("unsupported"), OVERLAP_REJECTED("overlap_rejected"), TRANSIENT_FAILURE("transient_failure"),
    REAUTHENTICATION_REQUIRED("reauthentication_required"), FORBIDDEN("forbidden"),
    OWNER_MISMATCH("owner_mismatch"), STALE_GENERATION_DISCARDED("stale_generation_discarded"),
    VAULT_CORRUPT("vault_corrupt"), TIMED_OUT("timed_out"),
}
class AuthRuntimeSnapshot(
    val state: AuthRuntimeState, val hasSessionCandidate: SessionCandidateStatus,
    val hasVerifiedOwnerState: Boolean, val safeDestinationId: SafeDestinationId,
    val fixedOutcomeCategory: FixedAuthOutcomeCategory?,
)

enum class AuthFocusTarget(val wire: String) {
    HEADING("heading"), PRIMARY_ACTION("primary_action"), SAFE_DESTINATION("safe_destination"),
}
enum class AuthAnnouncementMessageId(val wire: String) {
    INITIALIZING("initializing"), CALLBACK_PENDING("callback_pending"), AUTHENTICATED_AFTER_CALLBACK("authenticated_after_callback"),
    OFFLINE_CANDIDATE("offline_candidate"), REFRESH_PENDING("refresh_pending"), ACCOUNT_SWITCHING("account_switching"), UNUSABLE_LINK("unusable_link"), SAFE_TERMINAL_ERROR("safe_terminal_error"),
    SESSION_ENDED("session_ended"),
}
enum class AuthAnnouncementPriority(val wire: String) { POLITE("polite"), ASSERTIVE("assertive") }
class AuthPresentationPayload(
    val focus: AuthFocusTarget?, val announcement: AuthAnnouncementMessageId?,
    val priority: AuthAnnouncementPriority?, val navigation: SafeDestinationId?,
)
class AuthPresentationEffect(
    val generation: ULong, val sequence: ULong, val originatingState: AuthRuntimeState,
    val payload: AuthPresentationPayload,
)
enum class AuthTimeoutKind(val milliseconds: ULong) { PROVIDER_OR_API_STEP(15_000uL), TOTAL_ACTIONABLE(30_000uL) }
enum class AuthTraceEntry(val wire: String) {
    INIT_READ("init_read"), CALLBACK_RESERVED("callback_reserved"), CALLBACK_CONSUMED("callback_consumed"),
    CALLBACK_REJECTED("callback_rejected"), CALLBACK_DUPLICATE("callback_duplicate"), CALLBACK_OVERLAP("callback_overlap"),
    PROVIDER_EXCHANGE("provider_exchange"), PROVIDER_REFRESH("provider_refresh"), OWNER_VERIFY("owner_verify"),
    VAULT_REPLACE("vault_replace"), OWNER_BIND("owner_bind"), TIMER_500("timer_500"),
    TIMER_15000("timer_15000"), TIMER_30000("timer_30000"), GENERATION_FENCE("generation_fence"),
    CALLBACK_PURGE("callback_purge"), HEADERS_CLEAR("headers_clear"), VAULT_CLEAR("vault_clear"),
    OWNER_PURGE("owner_purge"), CALLBACK_CONFIRM("callback_confirm"), VAULT_CONFIRM("vault_confirm"),
    OWNER_CONFIRM("owner_confirm"), STALE_REJECTED("stale_rejected"), SNAPSHOT_PUBLISHED("snapshot_published"),
    EFFECT_ENQUEUED("effect_enqueued"), TERMINAL_LATCHED("terminal_latched"),
}

class OpaqueSessionCandidate internal constructor(internal val storage: String) { override fun toString() = "<opaque-session-candidate>" }
class OpaqueOwnerSubject internal constructor(internal val storage: String) { override fun toString() = "<opaque-owner-subject>" }
class OpaqueCallbackIngress internal constructor(internal val storage: String) { override fun toString() = "<opaque-callback-ingress>" }

sealed interface AuthPortResult<out T> {
    class Success<T>(val value: T) : AuthPortResult<T>
    object TransientFailure : AuthPortResult<Nothing>
    object ExplicitInvalidation : AuthPortResult<Nothing>
    object Forbidden : AuthPortResult<Nothing>
    object Malformed : AuthPortResult<Nothing>
}
enum class ConditionalMutationResult { APPLIED, STALE_GENERATION, FAILED }
sealed interface CallbackConsumeResult {
    class Consumed(val candidate: OpaqueSessionCandidate) : CallbackConsumeResult
    object Malformed : CallbackConsumeResult
    object Expired : CallbackConsumeResult
    object Replayed : CallbackConsumeResult
    object Duplicate : CallbackConsumeResult
    object Unsupported : CallbackConsumeResult
    object StaleGeneration : CallbackConsumeResult
    object Failed : CallbackConsumeResult
}
interface AuthProviderPort {
    suspend fun exchange(candidate: OpaqueSessionCandidate, generation: ULong): AuthPortResult<OpaqueSessionCandidate>
    suspend fun refresh(candidate: OpaqueSessionCandidate, generation: ULong): AuthPortResult<OpaqueSessionCandidate>
    suspend fun verifyOwner(candidate: OpaqueSessionCandidate, generation: ULong): AuthPortResult<OpaqueOwnerSubject>
    suspend fun cancelOwnedWork(generation: ULong)
}
interface SessionVaultPort {
    suspend fun read(generation: ULong): AuthPortResult<OpaqueSessionCandidate?>
    suspend fun replace(candidate: OpaqueSessionCandidate, generation: ULong): ConditionalMutationResult
    suspend fun clear(generation: ULong): ConditionalMutationResult
    suspend fun confirmEmpty(generation: ULong): Boolean
}
interface CallbackTransactionStorePort {
    suspend fun validateConsumeAndWipe(ingress: OpaqueCallbackIngress, generation: ULong): CallbackConsumeResult
    suspend fun purge(generation: ULong): ConditionalMutationResult
    suspend fun confirmEmpty(generation: ULong): Boolean
    suspend fun activateGeneration(generation: ULong)
    suspend fun cancelOwnedWork(generation: ULong)
}
interface AuthClockPort {
    suspend fun monotonicMilliseconds(): ULong
    suspend fun sleep(milliseconds: ULong, generation: ULong): Boolean
    suspend fun cancelOwnedTimers(generation: ULong)
}
interface OwnerDataStorePort {
    suspend fun bind(owner: OpaqueOwnerSubject, generation: ULong): ConditionalMutationResult
    suspend fun clearHeadersAndRequests(generation: ULong): ConditionalMutationResult
    suspend fun purgeOwnerData(generation: ULong): ConditionalMutationResult
    suspend fun confirmEmpty(generation: ULong): Boolean
}
interface StructurallyNoOpTelemetryPort

private enum class OperationKind { INITIALIZE, CALLBACK, REFRESH, TIMER, CLEANUP }
private enum class InternalTerminalCause { CLEANUP_FAILURE, GENERATION_EXHAUSTED }
private class Reservation(
    val generation: ULong, val id: ULong, val kind: OperationKind,
    val stable: AuthRuntimeSnapshot, val stateVersion: ULong, val startedAt: ULong,
)

class AuthRuntimeCoordinator(
    private val provider: AuthProviderPort, private val vault: SessionVaultPort,
    private val callbackStore: CallbackTransactionStorePort, private val clock: AuthClockPort,
    private val ownerStore: OwnerDataStorePort, @Suppress("UNUSED_PARAMETER") telemetry: StructurallyNoOpTelemetryPort,
    initialGeneration: ULong = 1uL,
) {
    private val boundary = ReentrantLock()
    private var generationValue = initialGeneration
    private var stateVersion = 0uL
    private var nextReservation = 1uL
    private var nextEffectSequence = 1uL
    private var terminal = false
    private var terminalCause: InternalTerminalCause? = null
    private var active: Reservation? = null
    private var refreshAttemptedGeneration: ULong? = null
    private var snapshotValue = AuthRuntimeSnapshot(AuthRuntimeState.INITIALIZING, SessionCandidateStatus.UNKNOWN, false, SafeDestinationId.SIGNED_OUT, null)
    private val effects = ArrayDeque<AuthPresentationEffect>()
    private val effectHistory = mutableListOf<AuthPresentationEffect>()
    private val trace = mutableListOf<AuthTraceEntry>()
    private val publishedSnapshots = mutableListOf<Pair<AuthRuntimeSnapshot, ULong>>()
    private val staleOutcomeSuppressedGenerations = mutableSetOf<ULong>()

    fun snapshot(): AuthRuntimeSnapshot = boundary.withLock { snapshotValue }
    fun currentGeneration(): ULong = boundary.withLock { generationValue }
    fun normalizedTrace(): List<AuthTraceEntry> = boundary.withLock { trace.toList() }
    fun snapshotHistory(): List<Pair<AuthRuntimeSnapshot, ULong>> = boundary.withLock { publishedSnapshots.toList() }
    fun presentationEffectHistory(): List<AuthPresentationEffect> = boundary.withLock { effectHistory.toList() }
    fun isTerminalFenced(): Boolean = boundary.withLock { terminal }
    fun drainPresentationEffects(forGeneration: ULong): List<AuthPresentationEffect> = boundary.withLock {
        if (terminal || forGeneration != generationValue) return@withLock emptyList()
        buildList { while (effects.isNotEmpty()) add(effects.removeFirst()) }
    }

    suspend fun initialize(online: Boolean) = coroutineScope {
        val startedAt = clock.monotonicMilliseconds()
        val reservation = reserve(OperationKind.INITIALIZE, startedAt) ?: return@coroutineScope
        val initializingEffect = async(start = CoroutineStart.UNDISPATCHED) {
            val fired = clock.sleep(500uL, reservation.generation)
            boundary.withLock {
                if (fired && validLocked(reservation) && stateVersion == reservation.stateVersion && snapshotValue.state == AuthRuntimeState.INITIALIZING) {
                    trace += AuthTraceEntry.TIMER_500
                    enqueueLocked(reservation.generation, AuthRuntimeState.INITIALIZING, AuthPresentationPayload(null, AuthAnnouncementMessageId.INITIALIZING, AuthAnnouncementPriority.POLITE, null))
                }
            }
        }
        try {
        append(AuthTraceEntry.INIT_READ, reservation)
        val result = vault.read(reservation.generation)
        if (!valid(reservation)) return@coroutineScope
        when (result) {
            is AuthPortResult.Success -> when {
                result.value == null -> publish(signedOut(FixedAuthOutcomeCategory.SUCCESS), reservation)
                !online -> publishWithEffect(offline(false), reservation, offlineEntryEffect())
                else -> verify(result.value, reservation, false)
            }
            AuthPortResult.TransientFailure -> publishWithEffect(terminalSnapshot(FixedAuthOutcomeCategory.TIMED_OUT), reservation, terminalEntryEffect())
            AuthPortResult.Forbidden -> publishWithEffect(safeTerminalFrom(reservation.stable, FixedAuthOutcomeCategory.FORBIDDEN), reservation, terminalEntryEffect())
            AuthPortResult.ExplicitInvalidation, AuthPortResult.Malformed -> cleanup(AuthRuntimeState.SAFE_TERMINAL_ERROR, reservation, FixedAuthOutcomeCategory.VAULT_CORRUPT)
        }
        } finally {
            withContext(NonCancellable) {
                clock.cancelOwnedTimers(reservation.generation)
                initializingEffect.join()
                finish(reservation)
            }
        }
    }

    suspend fun receiveCallback(ingress: OpaqueCallbackIngress) {
        val startedAt = clock.monotonicMilliseconds()
        val reservation = reserveCallback(startedAt) ?: return
        try {
        val consumed = callbackStore.validateConsumeAndWipe(ingress, reservation.generation)
        if (!valid(reservation)) return
        when (consumed) {
            is CallbackConsumeResult.Consumed -> {
                append(AuthTraceEntry.CALLBACK_CONSUMED, reservation)
                val retainedCandidate = if (reservation.stable.hasVerifiedOwnerState) reservation.stable.hasSessionCandidate else SessionCandidateStatus.ABSENT
                publishWithEffect(AuthRuntimeSnapshot(AuthRuntimeState.CALLBACK_PENDING, retainedCandidate, reservation.stable.hasVerifiedOwnerState, reservation.stable.safeDestinationId, null), reservation, callbackEntryEffect())
                append(AuthTraceEntry.PROVIDER_EXCHANGE, reservation)
                val exchanged = provider.exchange(consumed.candidate, reservation.generation)
                if (!valid(reservation)) return
                when (exchanged) {
                    is AuthPortResult.Success -> verify(exchanged.value, reservation, true)
                    AuthPortResult.TransientFailure -> failCallback(FixedAuthOutcomeCategory.TRANSIENT_FAILURE, reservation)
                    AuthPortResult.Forbidden -> failCallback(FixedAuthOutcomeCategory.FORBIDDEN, reservation)
                    AuthPortResult.Malformed -> rejectCallback(FixedAuthOutcomeCategory.MALFORMED, reservation)
                    AuthPortResult.ExplicitInvalidation -> cleanup(AuthRuntimeState.EXPIRED_OR_REVOKED, reservation, FixedAuthOutcomeCategory.REAUTHENTICATION_REQUIRED)
                }
            }
            CallbackConsumeResult.Duplicate -> append(AuthTraceEntry.CALLBACK_DUPLICATE, reservation)
            CallbackConsumeResult.Replayed -> rejectCallback(FixedAuthOutcomeCategory.REPLAYED, reservation)
            CallbackConsumeResult.Expired -> rejectCallback(FixedAuthOutcomeCategory.EXPIRED, reservation)
            CallbackConsumeResult.Unsupported -> rejectCallback(FixedAuthOutcomeCategory.UNSUPPORTED, reservation)
            CallbackConsumeResult.Malformed -> rejectCallback(FixedAuthOutcomeCategory.MALFORMED, reservation)
            CallbackConsumeResult.StaleGeneration -> append(AuthTraceEntry.STALE_REJECTED, reservation)
            CallbackConsumeResult.Failed -> callbackStoreFailure(reservation)
        }
        } finally { withContext(NonCancellable) { finish(reservation) } }
    }

    suspend fun cancelCallback() {
        val reservation = boundary.withLock { active?.takeIf { !terminal && it.kind == OperationKind.CALLBACK && it.generation == generationValue } } ?: return
        val now = clock.monotonicMilliseconds(); if (now < reservation.startedAt || now - reservation.startedAt < 500uL) return
        append(AuthTraceEntry.TIMER_500, reservation)
        val canceled = if (reservation.stable.hasVerifiedOwnerState) reservation.stable.withOutcome(FixedAuthOutcomeCategory.CANCELED) else signedOut(FixedAuthOutcomeCategory.CANCELED)
        transitionAfterFence(reservation.generation, canceled, emptyList())
    }

    suspend fun handle401(candidate: OpaqueSessionCandidate) = coroutineScope {
        val reservation = reserve(OperationKind.REFRESH, clock.monotonicMilliseconds()) ?: return@coroutineScope
        val repeated = boundary.withLock {
            if (!validLocked(reservation) || refreshAttemptedGeneration == reservation.generation) true
            else { refreshAttemptedGeneration = reservation.generation; false }
        }
        if (repeated) {
            try { cleanup(AuthRuntimeState.EXPIRED_OR_REVOKED, reservation, FixedAuthOutcomeCategory.REAUTHENTICATION_REQUIRED) }
            finally { withContext(NonCancellable) { finish(reservation) } }
            return@coroutineScope
        }
        publish(AuthRuntimeSnapshot(AuthRuntimeState.REFRESH_PENDING, SessionCandidateStatus.PRESENT, reservation.stable.hasVerifiedOwnerState, reservation.stable.safeDestinationId, null), reservation)
        val refreshEffect = async(start = CoroutineStart.UNDISPATCHED) {
            val fired = clock.sleep(500uL, reservation.generation)
            boundary.withLock {
                if (fired && validLocked(reservation) && snapshotValue.state == AuthRuntimeState.REFRESH_PENDING) {
                    trace += AuthTraceEntry.TIMER_500
                    enqueueLocked(reservation.generation, AuthRuntimeState.REFRESH_PENDING, AuthPresentationPayload(AuthFocusTarget.HEADING, AuthAnnouncementMessageId.REFRESH_PENDING, AuthAnnouncementPriority.POLITE, null))
                }
            }
        }
        try {
        append(AuthTraceEntry.PROVIDER_REFRESH, reservation)
        val refreshed = provider.refresh(candidate, reservation.generation)
        if (!valid(reservation)) return@coroutineScope
        when (refreshed) {
            is AuthPortResult.Success -> verify(refreshed.value, reservation, false)
            AuthPortResult.TransientFailure -> publishWithEffect(offlineFrom(reservation.stable, FixedAuthOutcomeCategory.TRANSIENT_FAILURE), reservation, offlineEntryEffect())
            AuthPortResult.Forbidden -> publishWithEffect(safeTerminalFrom(reservation.stable, FixedAuthOutcomeCategory.FORBIDDEN), reservation, terminalEntryEffect())
            AuthPortResult.ExplicitInvalidation, AuthPortResult.Malformed -> cleanup(AuthRuntimeState.EXPIRED_OR_REVOKED, reservation, FixedAuthOutcomeCategory.REAUTHENTICATION_REQUIRED)
        }
        } finally {
            withContext(NonCancellable) {
                clock.cancelOwnedTimers(reservation.generation)
                refreshEffect.join()
                boundary.withLock { effects.removeAll { it.generation == reservation.generation && it.originatingState == AuthRuntimeState.REFRESH_PENDING } }
                finish(reservation)
            }
        }
    }

    fun handle403() {
        boundary.withLock {
            if (!terminal && active == null) {
                val forbidden = safeTerminalFrom(snapshotValue, FixedAuthOutcomeCategory.FORBIDDEN)
                publishLocked(forbidden)
                enqueueLocked(generationValue, forbidden.state, terminalEntryEffect())
            }
        }
    }
    suspend fun signOut() { cleanup(AuthRuntimeState.SIGNED_OUT, null, FixedAuthOutcomeCategory.SUCCESS) }
    suspend fun switchAccount() { cleanup(AuthRuntimeState.ACCOUNT_SWITCHING, null, FixedAuthOutcomeCategory.SUCCESS) }

    suspend fun scheduleTimeout(kind: AuthTimeoutKind) {
        val reservation = reserveTimeout(clock.monotonicMilliseconds()) ?: return
        try {
        append(if (kind == AuthTimeoutKind.PROVIDER_OR_API_STEP) AuthTraceEntry.TIMER_15000 else AuthTraceEntry.TIMER_30000, reservation)
        val fired = clock.sleep(kind.milliseconds, reservation.generation)
        if (!valid(reservation) || !fired) return
        val timed: AuthRuntimeSnapshot
        val effect: AuthPresentationPayload
        if (reservation.kind == OperationKind.REFRESH && kind == AuthTimeoutKind.PROVIDER_OR_API_STEP) {
            timed = offlineFrom(reservation.stable, FixedAuthOutcomeCategory.TIMED_OUT)
            effect = offlineEntryEffect()
        } else {
            timed = when (reservation.kind) {
                OperationKind.CALLBACK -> callbackTerminal(reservation.stable, FixedAuthOutcomeCategory.TIMED_OUT)
                OperationKind.REFRESH -> safeTerminalFrom(reservation.stable, FixedAuthOutcomeCategory.TIMED_OUT)
                else -> safeTerminalFrom(reservation.stable, FixedAuthOutcomeCategory.TIMED_OUT)
            }
            effect = terminalEntryEffect()
        }
        transitionAfterFence(reservation.generation, timed, listOf(effect))
        } finally { withContext(NonCancellable) { finish(reservation) } }
    }

    suspend fun cancelRefresh() {
        val reservation = boundary.withLock { active?.takeIf { !terminal && it.kind == OperationKind.REFRESH && it.generation == generationValue } } ?: return
        val now = clock.monotonicMilliseconds(); if (now < reservation.startedAt || now - reservation.startedAt < 500uL) return
        append(AuthTraceEntry.TIMER_500, reservation)
        transitionAfterFence(reservation.generation, offlineFrom(reservation.stable, FixedAuthOutcomeCategory.CANCELED), listOf(offlineEntryEffect()))
    }

    suspend fun scheduleDelayedAnnouncement(messageId: AuthAnnouncementMessageId, priority: AuthAnnouncementPriority) {
        val captured = boundary.withLock { if (terminal) null else Triple(generationValue, stateVersion, snapshotValue.state) } ?: return
        boundary.withLock { trace += AuthTraceEntry.TIMER_500 }
        val fired = clock.sleep(500uL, captured.first)
        boundary.withLock {
            if (!terminal && fired && generationValue == captured.first && stateVersion == captured.second && snapshotValue.state == captured.third) {
                enqueueLocked(captured.first, captured.third, AuthPresentationPayload(null, messageId, priority, null))
            }
        }
    }

    private suspend fun verify(candidate: OpaqueSessionCandidate, reservation: Reservation, announceSuccess: Boolean) {
        append(AuthTraceEntry.OWNER_VERIFY, reservation)
        val owner = provider.verifyOwner(candidate, reservation.generation)
        if (!valid(reservation)) return
        when (owner) {
            is AuthPortResult.Success -> {
                append(AuthTraceEntry.VAULT_REPLACE, reservation)
                val vaultMutation = vault.replace(candidate, reservation.generation)
                if (!valid(reservation)) return
                if (vaultMutation != ConditionalMutationResult.APPLIED) { cleanup(AuthRuntimeState.SAFE_TERMINAL_ERROR, reservation, FixedAuthOutcomeCategory.VAULT_CORRUPT); return }
                append(AuthTraceEntry.OWNER_BIND, reservation)
                val ownerMutation = ownerStore.bind(owner.value, reservation.generation)
                if (!valid(reservation)) return
                if (ownerMutation != ConditionalMutationResult.APPLIED) { cleanup(AuthRuntimeState.SAFE_TERMINAL_ERROR, reservation, FixedAuthOutcomeCategory.OWNER_MISMATCH); return }
                val authenticated = AuthRuntimeSnapshot(AuthRuntimeState.AUTHENTICATED, SessionCandidateStatus.PRESENT, true, SafeDestinationId.INTERNAL_FOUNDATION_HOME, FixedAuthOutcomeCategory.SUCCESS)
                publish(authenticated, reservation)
                if (announceSuccess) {
                    enqueue(reservation, authenticated.state, AuthPresentationPayload(AuthFocusTarget.SAFE_DESTINATION, AuthAnnouncementMessageId.AUTHENTICATED_AFTER_CALLBACK, AuthAnnouncementPriority.POLITE, SafeDestinationId.INTERNAL_FOUNDATION_HOME))
                }
            }
            AuthPortResult.TransientFailure -> publishWithEffect(offline(reservation.stable.hasVerifiedOwnerState), reservation, offlineEntryEffect())
            AuthPortResult.Forbidden -> publishWithEffect(safeTerminalFrom(reservation.stable, FixedAuthOutcomeCategory.FORBIDDEN), reservation, terminalEntryEffect())
            AuthPortResult.ExplicitInvalidation -> cleanup(AuthRuntimeState.EXPIRED_OR_REVOKED, reservation, FixedAuthOutcomeCategory.REAUTHENTICATION_REQUIRED)
            AuthPortResult.Malformed -> cleanup(AuthRuntimeState.SAFE_TERMINAL_ERROR, reservation, FixedAuthOutcomeCategory.OWNER_MISMATCH)
        }
    }

    private fun reserve(kind: OperationKind, startedAt: ULong = 0uL): Reservation? = boundary.withLock {
        if (terminal || active != null || generationValue == ULong.MAX_VALUE) {
            if (!terminal && generationValue == ULong.MAX_VALUE) latchTerminalLocked(InternalTerminalCause.GENERATION_EXHAUSTED)
            return@withLock null
        }
        Reservation(generationValue, nextReservation++, kind, snapshotValue, stateVersion, startedAt).also { active = it }
    }
    private fun reserveCallback(startedAt: ULong): Reservation? = boundary.withLock {
        if (terminal) return@withLock null
        if (active?.kind == OperationKind.CALLBACK && active?.generation == generationValue) { trace += AuthTraceEntry.CALLBACK_OVERLAP; return@withLock null }
        if (active != null) return@withLock null
        if (generationValue == ULong.MAX_VALUE) { latchTerminalLocked(InternalTerminalCause.GENERATION_EXHAUSTED); return@withLock null }
        Reservation(generationValue, nextReservation++, OperationKind.CALLBACK, snapshotValue, stateVersion, startedAt).also { active = it; trace += AuthTraceEntry.CALLBACK_RESERVED }
    }
    private fun reserveTimeout(startedAt: ULong): Reservation? = boundary.withLock {
        if (terminal) return@withLock null
        active?.let { return@withLock if (it.kind == OperationKind.CLEANUP) null else it }
        if (generationValue == ULong.MAX_VALUE) { latchTerminalLocked(InternalTerminalCause.GENERATION_EXHAUSTED); return@withLock null }
        Reservation(generationValue, nextReservation++, OperationKind.TIMER, snapshotValue, stateVersion, startedAt).also { active = it }
    }
    private fun valid(reservation: Reservation): Boolean = boundary.withLock { validLocked(reservation).also { if (!it && !terminal) trace += AuthTraceEntry.STALE_REJECTED } }
    private fun validLocked(reservation: Reservation) = !terminal && generationValue == reservation.generation && active?.id == reservation.id
    private fun finish(reservation: Reservation) = boundary.withLock { if (active?.id == reservation.id) active = null }
    private fun append(entry: AuthTraceEntry, reservation: Reservation) = boundary.withLock { if (validLocked(reservation)) trace += entry }
    private fun publish(snapshot: AuthRuntimeSnapshot, reservation: Reservation) = boundary.withLock { if (validLocked(reservation)) publishLocked(snapshot) }
    private fun publishWithEffect(snapshot: AuthRuntimeSnapshot, reservation: Reservation, payload: AuthPresentationPayload) = boundary.withLock {
        if (validLocked(reservation)) { publishLocked(snapshot); enqueueLocked(reservation.generation, snapshot.state, payload) }
    }
    private fun publishLocked(snapshot: AuthRuntimeSnapshot) { snapshotValue = snapshot; stateVersion += 1uL; publishedSnapshots += snapshot to generationValue; trace += AuthTraceEntry.SNAPSHOT_PUBLISHED }
    private fun enqueue(reservation: Reservation, origin: AuthRuntimeState, payload: AuthPresentationPayload) = boundary.withLock { if (validLocked(reservation)) enqueueLocked(reservation.generation, origin, payload) }
    private fun enqueueLocked(generation: ULong, origin: AuthRuntimeState, payload: AuthPresentationPayload) {
        val effect = AuthPresentationEffect(generation, nextEffectSequence++, origin, payload)
        effects.addLast(effect); effectHistory += effect; trace += AuthTraceEntry.EFFECT_ENQUEUED
    }

    private suspend fun transitionAfterFence(expected: ULong, snapshot: AuthRuntimeSnapshot, payloads: List<AuthPresentationPayload>): Boolean =
        withContext(NonCancellable) { transitionAfterFenceIrrevocably(expected, snapshot, payloads) }

    private suspend fun transitionAfterFenceIrrevocably(expected: ULong, snapshot: AuthRuntimeSnapshot, payloads: List<AuthPresentationPayload>): Boolean {
        val fencing = installFence(expected, OperationKind.CLEANUP, suppressStaleOutcome = true) ?: return false
        return try {
            provider.cancelOwnedWork(expected); if (!valid(fencing)) return false
            callbackStore.cancelOwnedWork(expected); if (!valid(fencing)) return false
            clock.cancelOwnedTimers(expected); if (!valid(fencing)) return false
            callbackStore.activateGeneration(fencing.generation); if (!valid(fencing)) return false
            boundary.withLock {
                if (!validLocked(fencing)) false
                else { publishLocked(snapshot); payloads.forEach { enqueueLocked(fencing.generation, snapshot.state, it) }; true }
            }
        } finally { withContext(NonCancellable) { finish(fencing) } }
    }

    private suspend fun rejectCallback(category: FixedAuthOutcomeCategory, reservation: Reservation) {
        append(AuthTraceEntry.CALLBACK_REJECTED, reservation)
        val rejected = AuthRuntimeSnapshot(
            AuthRuntimeState.UNUSABLE_LINK,
            if (reservation.stable.hasVerifiedOwnerState) reservation.stable.hasSessionCandidate else SessionCandidateStatus.ABSENT,
            reservation.stable.hasVerifiedOwnerState,
            reservation.stable.safeDestinationId,
            category,
        )
        transitionAfterFence(reservation.generation, rejected, listOf(AuthPresentationPayload(AuthFocusTarget.HEADING, AuthAnnouncementMessageId.UNUSABLE_LINK, AuthAnnouncementPriority.ASSERTIVE, null)))
    }

    private suspend fun failCallback(category: FixedAuthOutcomeCategory, reservation: Reservation) {
        append(AuthTraceEntry.CALLBACK_REJECTED, reservation)
        val failed = callbackTerminal(reservation.stable, category)
        transitionAfterFence(reservation.generation, failed, listOf(terminalEntryEffect()))
    }

    private suspend fun callbackStoreFailure(reservation: Reservation) =
        withContext(NonCancellable) { callbackStoreFailureIrrevocably(reservation) }

    private suspend fun callbackStoreFailureIrrevocably(reservation: Reservation) {
        val cleanup = fenceForCleanup(reservation.generation) ?: return
        try {
        if (!valid(cleanup)) return
        append(AuthTraceEntry.CALLBACK_PURGE, cleanup)
        val purged = callbackStore.purge(cleanup.generation); if (!valid(cleanup)) return
        if (purged != ConditionalMutationResult.APPLIED) { latchCleanupFailure(cleanup); return }
        append(AuthTraceEntry.CALLBACK_CONFIRM, cleanup)
        val empty = callbackStore.confirmEmpty(cleanup.generation); if (!valid(cleanup)) return
        if (!empty) { latchCleanupFailure(cleanup); return }
        val failed = callbackTerminal(reservation.stable, FixedAuthOutcomeCategory.TRANSIENT_FAILURE)
        publish(failed, cleanup)
        enqueue(cleanup, failed.state, AuthPresentationPayload(AuthFocusTarget.HEADING, AuthAnnouncementMessageId.SAFE_TERMINAL_ERROR, AuthAnnouncementPriority.ASSERTIVE, null))
        } finally { withContext(NonCancellable) { finish(cleanup) } }
    }

    private suspend fun cleanup(destination: AuthRuntimeState, reservation: Reservation?, outcome: FixedAuthOutcomeCategory) =
        withContext(NonCancellable) { cleanupIrrevocably(destination, reservation, outcome) }

    private suspend fun cleanupIrrevocably(destination: AuthRuntimeState, reservation: Reservation?, outcome: FixedAuthOutcomeCategory) {
        val expected = reservation?.generation ?: currentGeneration()
        val cleanup = fenceForCleanup(expected) ?: return
        try {
        if (!valid(cleanup)) return
        append(AuthTraceEntry.CALLBACK_PURGE, cleanup)
        val callbackPurge = callbackStore.purge(cleanup.generation); if (!valid(cleanup)) return
        if (callbackPurge != ConditionalMutationResult.APPLIED) { latchCleanupFailure(cleanup); return }
        append(AuthTraceEntry.HEADERS_CLEAR, cleanup)
        val headersClear = ownerStore.clearHeadersAndRequests(cleanup.generation); if (!valid(cleanup)) return
        if (headersClear != ConditionalMutationResult.APPLIED) { latchCleanupFailure(cleanup); return }
        append(AuthTraceEntry.VAULT_CLEAR, cleanup)
        val vaultClear = vault.clear(cleanup.generation); if (!valid(cleanup)) return
        if (vaultClear != ConditionalMutationResult.APPLIED) { latchCleanupFailure(cleanup); return }
        append(AuthTraceEntry.OWNER_PURGE, cleanup)
        val ownerPurge = ownerStore.purgeOwnerData(cleanup.generation); if (!valid(cleanup)) return
        if (ownerPurge != ConditionalMutationResult.APPLIED) { latchCleanupFailure(cleanup); return }
        append(AuthTraceEntry.CALLBACK_CONFIRM, cleanup)
        val callbackEmpty = callbackStore.confirmEmpty(cleanup.generation); if (!valid(cleanup)) return
        if (!callbackEmpty) { latchCleanupFailure(cleanup); return }
        append(AuthTraceEntry.VAULT_CONFIRM, cleanup)
        val vaultEmpty = vault.confirmEmpty(cleanup.generation); if (!valid(cleanup)) return
        if (!vaultEmpty) { latchCleanupFailure(cleanup); return }
        append(AuthTraceEntry.OWNER_CONFIRM, cleanup)
        val ownerEmpty = ownerStore.confirmEmpty(cleanup.generation); if (!valid(cleanup)) return
        if (!ownerEmpty) { latchCleanupFailure(cleanup); return }
        val next = when (destination) {
            AuthRuntimeState.ACCOUNT_SWITCHING -> AuthRuntimeSnapshot(AuthRuntimeState.ACCOUNT_SWITCHING, SessionCandidateStatus.ABSENT, false, SafeDestinationId.SIGNED_OUT, outcome)
            AuthRuntimeState.EXPIRED_OR_REVOKED -> AuthRuntimeSnapshot(AuthRuntimeState.EXPIRED_OR_REVOKED, SessionCandidateStatus.ABSENT, false, SafeDestinationId.SIGNED_OUT, outcome)
            AuthRuntimeState.SAFE_TERMINAL_ERROR -> AuthRuntimeSnapshot(AuthRuntimeState.SAFE_TERMINAL_ERROR, SessionCandidateStatus.ABSENT, false, SafeDestinationId.SIGNED_OUT, outcome)
            else -> signedOut(outcome)
        }
        publish(next, cleanup)
        when (destination) {
            AuthRuntimeState.ACCOUNT_SWITCHING -> enqueue(cleanup, next.state, accountSwitchingEntryEffect())
            AuthRuntimeState.EXPIRED_OR_REVOKED -> enqueue(cleanup, next.state, sessionEndedEffect())
            AuthRuntimeState.SIGNED_OUT -> if (outcome == FixedAuthOutcomeCategory.SUCCESS) enqueue(cleanup, next.state, sessionEndedEffect())
            AuthRuntimeState.SAFE_TERMINAL_ERROR -> enqueue(cleanup, next.state, terminalEntryEffect())
            else -> Unit
        }
        } finally { withContext(NonCancellable) { finish(cleanup) } }
    }

    private fun latchCleanupFailure(reservation: Reservation) = boundary.withLock { if (validLocked(reservation)) latchTerminalLocked(InternalTerminalCause.CLEANUP_FAILURE) }
    private suspend fun fenceForCleanup(expected: ULong): Reservation? {
        val reservation = installFence(expected, OperationKind.CLEANUP, suppressStaleOutcome = false) ?: return null
        try {
            provider.cancelOwnedWork(expected); if (!valid(reservation)) return null
            callbackStore.cancelOwnedWork(expected); if (!valid(reservation)) return null
            clock.cancelOwnedTimers(expected); if (!valid(reservation)) return null
            callbackStore.activateGeneration(reservation.generation); if (!valid(reservation)) return null
            return reservation
        } catch (failure: Throwable) {
            withContext(NonCancellable) { finish(reservation) }
            throw failure
        }
    }
    private fun installFence(expected: ULong, kind: OperationKind, suppressStaleOutcome: Boolean): Reservation? = boundary.withLock {
        if (terminal || generationValue != expected) return@withLock null
        if (generationValue == ULong.MAX_VALUE) { latchTerminalLocked(InternalTerminalCause.GENERATION_EXHAUSTED); return@withLock null }
        if (suppressStaleOutcome) staleOutcomeSuppressedGenerations += expected
        generationValue += 1uL; effects.clear(); refreshAttemptedGeneration = null; trace += AuthTraceEntry.GENERATION_FENCE
        Reservation(generationValue, nextReservation++, kind, snapshotValue, stateVersion, 0uL).also { active = it }
    }
    private fun latchTerminalLocked(cause: InternalTerminalCause) {
        terminal = true; terminalCause = cause; active = null; effects.clear(); snapshotValue = terminalSnapshot(FixedAuthOutcomeCategory.TRANSIENT_FAILURE); stateVersion += 1uL; publishedSnapshots += snapshotValue to generationValue
        trace += AuthTraceEntry.TERMINAL_LATCHED
    }
    private fun signedOut(outcome: FixedAuthOutcomeCategory) = AuthRuntimeSnapshot(AuthRuntimeState.SIGNED_OUT, SessionCandidateStatus.ABSENT, false, SafeDestinationId.SIGNED_OUT, outcome)
    private fun offline(owner: Boolean) = AuthRuntimeSnapshot(AuthRuntimeState.OFFLINE_SESSION_CANDIDATE, SessionCandidateStatus.PRESENT, owner, SafeDestinationId.SIGNED_OUT, FixedAuthOutcomeCategory.SUCCESS)
    private fun offlineFrom(stable: AuthRuntimeSnapshot, outcome: FixedAuthOutcomeCategory) = AuthRuntimeSnapshot(AuthRuntimeState.OFFLINE_SESSION_CANDIDATE, SessionCandidateStatus.PRESENT, stable.hasVerifiedOwnerState, stable.safeDestinationId, outcome)
    private fun terminalSnapshot(outcome: FixedAuthOutcomeCategory) = AuthRuntimeSnapshot(AuthRuntimeState.SAFE_TERMINAL_ERROR, SessionCandidateStatus.UNKNOWN, false, SafeDestinationId.SIGNED_OUT, outcome)
    private fun safeTerminalFrom(stable: AuthRuntimeSnapshot, outcome: FixedAuthOutcomeCategory) = AuthRuntimeSnapshot(AuthRuntimeState.SAFE_TERMINAL_ERROR, stable.hasSessionCandidate, stable.hasVerifiedOwnerState, stable.safeDestinationId, outcome)
    private fun callbackTerminal(stable: AuthRuntimeSnapshot, outcome: FixedAuthOutcomeCategory) = AuthRuntimeSnapshot(AuthRuntimeState.SAFE_TERMINAL_ERROR, if (stable.hasVerifiedOwnerState) stable.hasSessionCandidate else SessionCandidateStatus.ABSENT, stable.hasVerifiedOwnerState, stable.safeDestinationId, outcome)
    private fun callbackEntryEffect() = AuthPresentationPayload(AuthFocusTarget.HEADING, AuthAnnouncementMessageId.CALLBACK_PENDING, AuthAnnouncementPriority.POLITE, null)
    private fun offlineEntryEffect() = AuthPresentationPayload(AuthFocusTarget.HEADING, AuthAnnouncementMessageId.OFFLINE_CANDIDATE, AuthAnnouncementPriority.POLITE, null)
    private fun accountSwitchingEntryEffect() = AuthPresentationPayload(AuthFocusTarget.HEADING, AuthAnnouncementMessageId.ACCOUNT_SWITCHING, AuthAnnouncementPriority.POLITE, null)
    private fun terminalEntryEffect() = AuthPresentationPayload(AuthFocusTarget.HEADING, AuthAnnouncementMessageId.SAFE_TERMINAL_ERROR, AuthAnnouncementPriority.ASSERTIVE, null)
    private fun sessionEndedEffect() = AuthPresentationPayload(AuthFocusTarget.HEADING, AuthAnnouncementMessageId.SESSION_ENDED, AuthAnnouncementPriority.ASSERTIVE, null)
    private fun AuthRuntimeSnapshot.withOutcome(outcome: FixedAuthOutcomeCategory) = AuthRuntimeSnapshot(state, hasSessionCandidate, hasVerifiedOwnerState, safeDestinationId, outcome)
}
