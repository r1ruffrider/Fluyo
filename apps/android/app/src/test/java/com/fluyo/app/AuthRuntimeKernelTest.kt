package com.fluyo.app

import java.lang.reflect.Modifier
import java.net.URI
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock
import kotlin.io.path.readBytes
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.yield
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

@RunWith(Parameterized::class)
class AuthRuntimeKernelTest(private val vector: Vector) {
    class Vector(val fields: List<String>) {
        val kind = fields[0]; val id = fields[1]; val initial = fields[2]
        val steps = fields[3].split('>'); val times = fields[4].split('>').map(String::toULong)
        val completions = fields[5].split('>'); val snapshots = fields[6].split('>')
        val effects = split(fields[7]); val trace = split(fields[8]); val wipe = fields[9]
        val rejectedWrites = fields[10].toInt(); val generation = fields[11].toULong()
        val terminal = fields[12] == "1"; val digest = fields[13]
        override fun toString() = "$id@$digest"
    }

    @Test fun canonicalScenarioOrInvariant() = runTest {
        assertEquals(DIGEST, vector.digest)
        val ports = ScriptPorts(vector.times, vector.completions.filterNot { it == "none" })
        val coordinator = coordinator(ports, if (vector.initial == "overflow") ULong.MAX_VALUE else 1uL)
        var rejectedWrites = 0
        for (step in vector.steps) {
            rejectedWrites += execute(step, coordinator, ports)
        }
        val snapshots = coordinator.snapshotHistory().map { normalize(it.first, it.second) }
        assertEquals(vector.snapshots, snapshots)
        val generation = coordinator.currentGeneration()
        val fullEffectHistory = coordinator.presentationEffectHistory().map(::normalize)
        assertEquals(vector.effects, fullEffectHistory)
        val firstDrain = coordinator.drainPresentationEffects(generation).map(::normalize)
        assertTrue(firstDrain.all { it.startsWith("$generation:") })
        assertTrue(coordinator.drainPresentationEffects(generation).isEmpty())
        val staleGeneration = if (generation == 1uL) 2uL else 1uL
        assertTrue(coordinator.drainPresentationEffects(staleGeneration).isEmpty())
        assertEquals(vector.trace, coordinator.normalizedTrace().map { it.wire })
        assertEquals(vector.completions.filterNot { it == "none" }, ports.completionValues())
        if (vector.id == "warm_callback_success") assertEquals("opaque-pkce", ports.provider.lastExchangeStorage)
        assertEquals(vector.wipe, ports.wipeSummary())
        assertEquals(vector.rejectedWrites, rejectedWrites)
        assertEquals(vector.generation, generation)
        assertEquals(vector.terminal, coordinator.isTerminalFenced())
        validateInvariant(vector.id, coordinator, ports)
    }

    private suspend fun execute(step: String, coordinator: AuthRuntimeCoordinator, ports: ScriptPorts): Int = when (step) {
        "init_none" -> { ports.vault.readCandidate = false; coordinator.initialize(true); 0 }
        "init_candidate" -> { ports.vault.readCandidate = true; coordinator.initialize(true); 0 }
        "init_offline" -> { ports.vault.readCandidate = true; coordinator.initialize(false); 0 }
        "callback_success" -> { ports.callback.result = CallbackConsumeResult.Consumed(candidate()); coordinator.receiveCallback(ingress()); 0 }
        "callback_malformed", "strict_callback" -> { ports.callback.result = CallbackConsumeResult.Malformed; coordinator.receiveCallback(ingress()); if (step == "strict_callback") strictCallbackChecks() else Unit; 0 }
        "callback_expired" -> { ports.callback.result = CallbackConsumeResult.Expired; coordinator.receiveCallback(ingress()); 0 }
        "callback_replay" -> { ports.callback.result = CallbackConsumeResult.Replayed; coordinator.receiveCallback(ingress()); 0 }
        "callback_duplicate" -> { ports.callback.result = CallbackConsumeResult.Duplicate; coordinator.receiveCallback(ingress()); 0 }
        "callback_unsupported" -> { ports.callback.result = CallbackConsumeResult.Unsupported; coordinator.receiveCallback(ingress()); 0 }
        "callback_store_fail" -> { ports.callback.result = CallbackConsumeResult.Failed; coordinator.receiveCallback(ingress()); 0 }
        "callback_cancel" -> {
            coroutineScope {
                ports.callback.result = CallbackConsumeResult.Consumed(candidate()); ports.provider.suspendExchange = true
                val work = async { coordinator.receiveCallback(ingress()) }; ports.provider.exchangeStarted.await()
                coordinator.cancelCallback(); ports.provider.exchangeRelease.complete(Unit); work.await()
            }
            verifyWarmCancelPreservesCandidate(); verifyCancelAvailabilityBoundaries(); 1
        }
        "callback_overlap" -> {
            coroutineScope {
                ports.callback.result = CallbackConsumeResult.Consumed(candidate()); ports.provider.suspendExchange = true
                val work = launch { coordinator.receiveCallback(ingress()) }; ports.provider.exchangeStarted.await()
                coordinator.receiveCallback(ingress()); work.cancel()
            }; 1
        }
        "refresh_success" -> { ports.provider.refreshResult = AuthPortResult.Success(candidate()); coordinator.handle401(candidate()); 0 }
        "refresh_invalid" -> { ports.provider.refreshResult = AuthPortResult.ExplicitInvalidation; coordinator.handle401(candidate()); 0 }
        "refresh_transient" -> { ports.provider.refreshResult = AuthPortResult.TransientFailure; coordinator.handle401(candidate()); 0 }
        "refresh_repeated" -> { ports.provider.refreshResult = AuthPortResult.Success(candidate()); coordinator.handle401(candidate()); coordinator.handle401(candidate()); 0 }
        "refresh_boundary_checks" -> { verifyRefreshTimerBoundaries(); 0 }
        "forbidden" -> { coordinator.handle403(); 0 }
        "noop", "telemetry_noop", "source_scan" -> 0
        "switch" -> { coordinator.switchAccount(); 0 }
        "signout" -> { coordinator.signOut(); 0 }
        "signout_during_exchange" -> {
            coroutineScope {
                ports.callback.result = CallbackConsumeResult.Consumed(candidate()); ports.provider.suspendExchange = true
                val work = async { coordinator.receiveCallback(ingress()) }; ports.provider.exchangeStarted.await()
                coordinator.signOut(); ports.provider.exchangeRelease.complete(Unit); work.await()
            }; 1
        }
        "signout_during_replace" -> {
            coroutineScope {
                ports.callback.result = CallbackConsumeResult.Consumed(candidate()); ports.vault.suspendReplace = true
                val work = async { coordinator.receiveCallback(ingress()) }; ports.vault.replaceStarted.await()
                coordinator.signOut(); ports.vault.replaceRelease.complete(Unit); work.await()
            }; 1
        }
        "vault_replace_fail" -> { ports.callback.result = CallbackConsumeResult.Consumed(candidate()); ports.vault.replaceResult = ConditionalMutationResult.FAILED; coordinator.receiveCallback(ingress()); 1 }
        "owner_bind_fail" -> { ports.callback.result = CallbackConsumeResult.Consumed(candidate()); ports.owner.bindResult = ConditionalMutationResult.FAILED; coordinator.receiveCallback(ingress()); 1 }
        "timeout15" -> { coordinator.scheduleTimeout(AuthTimeoutKind.PROVIDER_OR_API_STEP); verifyTotalTimeoutBoundary(); 0 }
        "timeout30" -> { coordinator.scheduleTimeout(AuthTimeoutKind.TOTAL_ACTIONABLE); 0 }
        "callback_purge_fail", "cleanup_each_failure" -> {
            ports.callback.purgeResult = ConditionalMutationResult.FAILED; coordinator.signOut()
            if (step == "cleanup_each_failure") verifyEveryCleanupFailureLatches() else Unit; 1
        }
        "terminal_entrypoints" -> { exerciseTerminalEntryPoints(coordinator); 9 }
        "effect_drain" -> 0
        else -> throw AssertionError("unknown closed step")
    }

    private suspend fun validateInvariant(id: String, coordinator: AuthRuntimeCoordinator, ports: ScriptPorts) {
        when (id) {
            "public_state_is_secret_free" -> assertEquals(setOf("state", "hasSessionCandidate", "hasVerifiedOwnerState", "safeDestinationId", "fixedOutcomeCategory"), AuthRuntimeSnapshot::class.java.declaredFields.filter { !it.isSynthetic && !Modifier.isStatic(it.modifiers) }.map { it.name }.toSet())
            "callback_transaction_is_purpose_environment_host_path_and_expiry_bound" -> { assertTrue(ports.callback.calls > 0); verifyCallbackStoreFailure() }
            "callback_transaction_consumes_once_and_wipes" -> {
                val store = StrictCallbackStore(999uL, 1_000uL)
                assertTrue(store.validateConsumeAndWipe(ingress(), 1uL) is CallbackConsumeResult.Consumed)
                assertEquals(CallbackConsumeResult.Replayed, store.validateConsumeAndWipe(ingress(), 1uL))
                assertTrue(store.confirmEmpty(1uL)); assertEquals(0, ports.vault.replaceCallsAfterSeed)
            }
            "valid_verified_session_survives_bad_link" -> { assertEquals(AuthRuntimeState.UNUSABLE_LINK, coordinator.snapshot().state); assertTrue(coordinator.snapshot().hasVerifiedOwnerState) }
            "generation_change_cancels_work_and_blocks_stale_writes" -> { assertTrue(coordinator.normalizedTrace().contains(AuthTraceEntry.STALE_REJECTED)); verifySwitchFencesInFlight(); verifyCallbackValidationCancellationPrecedesPurge(); verifyEveryDestructiveMutationRejectsStaleGeneration() }
            "owner_data_waits_for_private_subject_confirmation" -> { assertFalse(coordinator.snapshot().hasVerifiedOwnerState); verifyMutationBoundaries() }
            "transient_refresh_failure_preserves_candidate" -> assertEquals(SessionCandidateStatus.PRESENT, coordinator.snapshot().hasSessionCandidate)
            "explicit_invalidation_and_repeated_401_clear" -> assertEquals(SessionCandidateStatus.ABSENT, coordinator.snapshot().hasSessionCandidate)
            "403_never_refreshes_or_signs_out" -> { assertEquals(0, ports.provider.refreshCalls); assertEquals(AuthRuntimeState.SAFE_TERMINAL_ERROR, coordinator.snapshot().state); assertTrue(coordinator.snapshot().hasVerifiedOwnerState) }
            "offline_never_confirms_new_owner_or_expands_access" -> { assertEquals(0, ports.provider.verifyCalls); assertFalse(coordinator.snapshot().hasVerifiedOwnerState) }
            "cleanup_precedes_signed_out_or_new_owner_exposure" -> { assertTrue(coordinator.isTerminalFenced()); verifyDelayedEffectCancellation(); verifyCleanupReservationLiveness() }
            "no_op_telemetry_has_zero_retention_and_zero_transport" -> assertEquals(0, TrapTelemetry::class.java.declaredFields.count { !it.isSynthetic })
            "evidence_is_closed_and_mutation_safe" -> assertTrue(coordinator.isTerminalFenced())
        }
    }

    private suspend fun strictCallbackChecks() {
        val valid = StrictCallbackStore(999uL, 1_000uL)
        val consumed = valid.validateConsumeAndWipe(ingress(), 1uL) as CallbackConsumeResult.Consumed
        assertEquals("opaque-pkce", consumed.candidate.storage); assertFalse(consumed.candidate.storage == "expected")
        assertEquals(CallbackConsumeResult.Replayed, valid.validateConsumeAndWipe(ingress(), 1uL))
        val distinctVerifier = StrictCallbackStore(999uL, 1_000uL, oauthState = "state-two", verifier = "verifier-two")
        val distinctIngress = OpaqueCallbackIngress("https://auth.dev.fluyo.test/native/auth/callback?code=x&state=state-two&nonce=expected")
        assertEquals("verifier-two", (distinctVerifier.validateConsumeAndWipe(distinctIngress, 1uL) as CallbackConsumeResult.Consumed).candidate.storage)
        assertEquals(CallbackConsumeResult.Expired, StrictCallbackStore(1_000uL, 1_000uL).validateConsumeAndWipe(ingress(), 1uL))
        assertEquals(CallbackConsumeResult.Expired, StrictCallbackStore(999uL, 2_000uL, issuedAt = 1_000uL).validateConsumeAndWipe(ingress(), 1uL))
        for (store in listOf(
            StrictCallbackStore(999uL, 1_000uL, purpose = "other"),
            StrictCallbackStore(999uL, 1_000uL, environment = "prod"),
            StrictCallbackStore(999uL, 1_000uL, host = "other.dev.fluyo.test"),
            StrictCallbackStore(999uL, 1_000uL, path = "/other"),
            StrictCallbackStore(999uL, 1_000uL, oauthState = "other"),
            StrictCallbackStore(999uL, 1_000uL, nonce = "other"),
        )) assertEquals(CallbackConsumeResult.Malformed, store.validateConsumeAndWipe(ingress(), 1uL))
        val adversaries = listOf(
            "http://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected",
            "https://AUTH.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected",
            "https://auth.dev.fluyo.test/native/auth/%63allback?code=x&state=expected&nonce=expected",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&state=x&nonce=expected",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected#x",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected\u0000",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected\r",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected\n",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected\t",
            "https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expecté",
        )
        for (raw in adversaries) assertEquals(CallbackConsumeResult.Malformed, StrictCallbackStore(999uL, 1_000uL).validateConsumeAndWipe(OpaqueCallbackIngress(raw), 1uL))
    }

    private suspend fun verifyEveryCleanupFailureLatches() {
        for (failure in CleanupFailure.entries) {
            val ports = ScriptPorts(listOf(0uL)); failure.apply(ports)
            val coordinator = coordinator(ports, 1uL); coordinator.signOut()
            assertTrue(failure.name, coordinator.isTerminalFenced())
            assertEquals(failure.name, FixedAuthOutcomeCategory.TRANSIENT_FAILURE, coordinator.snapshot().fixedOutcomeCategory)
            assertTrue(failure.name, coordinator.drainPresentationEffects(coordinator.currentGeneration()).isEmpty())
            assertEquals(failure.name, failure.expectedPrefix, ports.cleanup)
            assertEquals(failure.name, failure.expectedPersistence, ports.persistence())
        }
    }

    private suspend fun verifyWarmCancelPreservesCandidate() = coroutineScope {
        val ports = ScriptPorts(listOf(0uL, 500uL)); val coordinator = coordinator(ports, 1uL)
        ports.vault.readCandidate = true; coordinator.initialize(true)
        ports.callback.result = CallbackConsumeResult.Consumed(candidate()); ports.provider.suspendExchange = true
        val work = async { coordinator.receiveCallback(ingress()) }; ports.provider.exchangeStarted.await()
        coordinator.cancelCallback(); ports.provider.exchangeRelease.complete(Unit); work.await()
        val snapshot = coordinator.snapshot()
        assertEquals(AuthRuntimeState.AUTHENTICATED, snapshot.state); assertEquals(SessionCandidateStatus.PRESENT, snapshot.hasSessionCandidate)
        assertTrue(snapshot.hasVerifiedOwnerState); assertEquals(FixedAuthOutcomeCategory.CANCELED, snapshot.fixedOutcomeCategory)
        assertTrue(coordinator.drainPresentationEffects(coordinator.currentGeneration()).isEmpty())
    }

    private suspend fun verifyCancelAvailabilityBoundaries() {
        for (now in listOf(499uL, 500uL, 501uL)) coroutineScope {
            val ports = ScriptPorts(listOf(0uL, now)); val coordinator = coordinator(ports, 1uL)
            ports.vault.readCandidate = false; coordinator.initialize(true)
            ports.callback.result = CallbackConsumeResult.Consumed(candidate()); ports.provider.suspendExchange = true
            val work = async { coordinator.receiveCallback(ingress()) }; ports.provider.exchangeStarted.await(); coordinator.cancelCallback()
            val afterCancel = coordinator.snapshot()
            if (now < 500uL) { assertEquals(AuthRuntimeState.CALLBACK_PENDING, afterCancel.state); coordinator.signOut() }
            else assertEquals(FixedAuthOutcomeCategory.CANCELED, afterCancel.fixedOutcomeCategory)
            ports.provider.exchangeRelease.complete(Unit); work.await()
        }
    }

    private suspend fun verifyTotalTimeoutBoundary() {
        val ports = ScriptPorts(listOf(0uL, 30_000uL)); val coordinator = coordinator(ports, 1uL)
        coordinator.scheduleTimeout(AuthTimeoutKind.TOTAL_ACTIONABLE)
        assertEquals(listOf(30_000uL), ports.clock.requests())
        assertEquals(FixedAuthOutcomeCategory.TIMED_OUT, coordinator.snapshot().fixedOutcomeCategory)
        verifyCallbackContextTimeouts()
        verifyRefreshContextExits()
    }

    private suspend fun verifyCallbackContextTimeouts() {
        for (warm in listOf(false, true)) for (kind in AuthTimeoutKind.entries) coroutineScope {
            val ports = ScriptPorts(if (warm) listOf(0uL, 0uL, kind.milliseconds) else listOf(0uL, kind.milliseconds)); val coordinator = coordinator(ports, 1uL)
            if (warm) { ports.vault.readCandidate = true; coordinator.initialize(true) }
            ports.callback.result = CallbackConsumeResult.Consumed(candidate()); ports.provider.suspendExchange = true
            val work = async { coordinator.receiveCallback(ingress()) }; ports.provider.exchangeStarted.await(); coordinator.scheduleTimeout(kind); work.await()
            val snapshot = coordinator.snapshot(); assertEquals(AuthRuntimeState.SAFE_TERMINAL_ERROR, snapshot.state); assertEquals(if (warm) SessionCandidateStatus.PRESENT else SessionCandidateStatus.ABSENT, snapshot.hasSessionCandidate)
            assertEquals(warm, snapshot.hasVerifiedOwnerState); assertEquals(if (warm) SafeDestinationId.INTERNAL_FOUNDATION_HOME else SafeDestinationId.SIGNED_OUT, snapshot.safeDestinationId); assertEquals(FixedAuthOutcomeCategory.TIMED_OUT, snapshot.fixedOutcomeCategory)
            assertEquals(listOf(AuthAnnouncementMessageId.CALLBACK_PENDING, AuthAnnouncementMessageId.SAFE_TERMINAL_ERROR), coordinator.presentationEffectHistory().map { it.payload.announcement })
            assertTrue(coordinator.normalizedTrace().contains(AuthTraceEntry.STALE_REJECTED))
        }
    }

    private suspend fun verifyRefreshContextExits() {
        for ((kind, state) in listOf(AuthTimeoutKind.PROVIDER_OR_API_STEP to AuthRuntimeState.OFFLINE_SESSION_CANDIDATE, AuthTimeoutKind.TOTAL_ACTIONABLE to AuthRuntimeState.SAFE_TERMINAL_ERROR)) coroutineScope {
            val ports = ScriptPorts(listOf(0uL, 0uL, kind.milliseconds)); val coordinator = coordinator(ports, 1uL)
            ports.vault.readCandidate = true; coordinator.initialize(true); ports.provider.suspendRefresh = true
            val work = async { coordinator.handle401(candidate()) }; ports.provider.refreshStarted.await(); coordinator.scheduleTimeout(kind); work.await()
            val snapshot = coordinator.snapshot(); assertEquals(state, snapshot.state); assertEquals(SessionCandidateStatus.PRESENT, snapshot.hasSessionCandidate); assertTrue(snapshot.hasVerifiedOwnerState); assertEquals(FixedAuthOutcomeCategory.TIMED_OUT, snapshot.fixedOutcomeCategory)
        }
        coroutineScope {
            val ports = ScriptPorts(listOf(0uL, 0uL, 500uL)); val coordinator = coordinator(ports, 1uL)
            ports.vault.readCandidate = true; coordinator.initialize(true); ports.provider.suspendRefresh = true
            val work = async { coordinator.handle401(candidate()) }; ports.provider.refreshStarted.await(); coordinator.cancelRefresh(); work.await()
            val snapshot = coordinator.snapshot(); assertEquals(AuthRuntimeState.OFFLINE_SESSION_CANDIDATE, snapshot.state); assertEquals(FixedAuthOutcomeCategory.CANCELED, snapshot.fixedOutcomeCategory)
        }
    }

    private suspend fun verifyRefreshTimerBoundaries() {
        for (elapsed in listOf(499uL, 500uL, 501uL)) coroutineScope {
            val ports = ScriptPorts(listOf(0uL, 0uL)); val coordinator = coordinator(ports, 1uL)
            ports.vault.readCandidate = true; coordinator.initialize(true); ports.clock.setDelayedElapsed(elapsed); ports.provider.suspendRefresh = true
            val work = async { coordinator.handle401(candidate()) }; ports.provider.refreshStarted.await()
            val history = coordinator.presentationEffectHistory()
            assertEquals(if (elapsed < 500uL) 0 else 1, history.size)
            if (history.isNotEmpty()) {
                val effect = history.single(); assertEquals(AuthRuntimeState.REFRESH_PENDING, effect.originatingState); assertEquals(AuthFocusTarget.HEADING, effect.payload.focus)
                assertEquals(AuthAnnouncementMessageId.REFRESH_PENDING, effect.payload.announcement); assertEquals(AuthAnnouncementPriority.POLITE, effect.payload.priority); assertTrue(effect.payload.navigation == null)
            }
            ports.provider.refreshRelease.complete(Unit); work.await()
            assertTrue(coordinator.drainPresentationEffects(coordinator.currentGeneration()).isEmpty())
            assertEquals(if (elapsed < 500uL) 0 else 1, coordinator.presentationEffectHistory().size)
        }
    }

    private suspend fun verifyMutationBoundaries() {
        for (result in listOf(ConditionalMutationResult.FAILED, ConditionalMutationResult.STALE_GENERATION)) {
            val vaultPorts = ScriptPorts(listOf(0uL)); val vaultCoordinator = coordinator(vaultPorts, 1uL)
            vaultPorts.vault.readCandidate = false; vaultCoordinator.initialize(true); vaultPorts.callback.result = CallbackConsumeResult.Consumed(candidate()); vaultPorts.vault.replaceResult = result; vaultCoordinator.receiveCallback(ingress())
            assertEquals(AuthRuntimeState.SAFE_TERMINAL_ERROR, vaultCoordinator.snapshot().state); assertEquals(SessionCandidateStatus.ABSENT, vaultCoordinator.snapshot().hasSessionCandidate)
            assertEquals("callback_headers_vault_owner_confirm", vaultPorts.wipeSummary())
            val ownerPorts = ScriptPorts(listOf(0uL)); val ownerCoordinator = coordinator(ownerPorts, 1uL)
            ownerPorts.vault.readCandidate = false; ownerCoordinator.initialize(true); ownerPorts.callback.result = CallbackConsumeResult.Consumed(candidate()); ownerPorts.owner.bindResult = result; ownerCoordinator.receiveCallback(ingress())
            assertEquals(AuthRuntimeState.SAFE_TERMINAL_ERROR, ownerCoordinator.snapshot().state); assertFalse(ownerCoordinator.snapshot().hasVerifiedOwnerState)
            assertEquals("callback_headers_vault_owner_confirm", ownerPorts.wipeSummary())
        }
    }

    private suspend fun verifySwitchFencesInFlight() {
        suspend fun assertSwitched(coordinator: AuthRuntimeCoordinator) { assertEquals(AuthRuntimeState.ACCOUNT_SWITCHING, coordinator.snapshot().state); assertTrue(coordinator.normalizedTrace().contains(AuthTraceEntry.STALE_REJECTED)) }
        coroutineScope {
            val ports = ScriptPorts(listOf(0uL)); val coordinator = coordinator(ports, 1uL); ports.vault.readCandidate = true; coordinator.initialize(true)
            ports.callback.result = CallbackConsumeResult.Consumed(candidate()); ports.provider.suspendExchange = true
            val work = async { coordinator.receiveCallback(ingress()) }; ports.provider.exchangeStarted.await(); coordinator.switchAccount(); ports.provider.exchangeRelease.complete(Unit); work.await(); assertSwitched(coordinator)
        }
        coroutineScope {
            val ports = ScriptPorts(listOf(0uL)); val coordinator = coordinator(ports, 1uL); ports.vault.readCandidate = true; coordinator.initialize(true)
            ports.callback.result = CallbackConsumeResult.Consumed(candidate()); ports.vault.suspendReplace = true
            val work = async { coordinator.receiveCallback(ingress()) }; ports.vault.replaceStarted.await(); coordinator.switchAccount(); ports.vault.replaceRelease.complete(Unit); work.await(); assertSwitched(coordinator); assertEquals(1, ports.vault.staleWrites)
        }
        coroutineScope {
            val ports = ScriptPorts(listOf(0uL, 15_000uL)); val coordinator = coordinator(ports, 1uL); ports.clock.suspendSleep = true
            val work = async { coordinator.scheduleTimeout(AuthTimeoutKind.PROVIDER_OR_API_STEP) }; ports.clock.waitSleepStarted(); coordinator.switchAccount(); ports.clock.releaseSleep(); work.await(); assertSwitched(coordinator)
        }
    }

    private suspend fun verifyEveryDestructiveMutationRejectsStaleGeneration() {
        coroutineScope {
            val p = ScriptPorts(listOf(0uL)); p.callback.pending = true; p.generations.pauseAfterComparison(1uL)
            val mutation = async(Dispatchers.Default) { p.callback.purge(1uL) }; p.generations.waitComparisonStarted()
            val activation = async(Dispatchers.Default) { p.generations.activate(2uL) }; assertFalse(activation.isCompleted)
            p.generations.releaseComparison(); assertEquals(ConditionalMutationResult.APPLIED, mutation.await()); activation.await(); assertFalse(p.callback.pending)
            p.callback.pending = true; assertEquals(ConditionalMutationResult.STALE_GENERATION, p.callback.purge(1uL)); assertTrue(p.callback.pending)
        }
        coroutineScope { val p = ScriptPorts(listOf(0uL)); p.vault.storedCandidate = true; p.generations.activate(2uL); assertEquals(ConditionalMutationResult.STALE_GENERATION, p.vault.clear(1uL)); assertTrue(p.vault.storedCandidate) }
        coroutineScope { val p = ScriptPorts(listOf(0uL)); p.generations.activate(2uL); assertEquals(ConditionalMutationResult.STALE_GENERATION, p.owner.bind(OpaqueOwnerSubject("private"), 1uL)); assertFalse(p.owner.ownerPresent) }
        coroutineScope { val p = ScriptPorts(listOf(0uL)); p.owner.headersPresent = true; p.generations.activate(2uL); assertEquals(ConditionalMutationResult.STALE_GENERATION, p.owner.clearHeadersAndRequests(1uL)); assertTrue(p.owner.headersPresent) }
        coroutineScope { val p = ScriptPorts(listOf(0uL)); p.owner.ownerPresent = true; p.generations.activate(2uL); assertEquals(ConditionalMutationResult.STALE_GENERATION, p.owner.purgeOwnerData(1uL)); assertTrue(p.owner.ownerPresent) }
    }

    private suspend fun verifyCallbackValidationCancellationPrecedesPurge() = coroutineScope {
        val ports = ScriptPorts(listOf(0uL)); val coordinator = coordinator(ports, 1uL)
        ports.vault.readCandidate = false; coordinator.initialize(true); ports.callback.suspendValidation = true
        val work = async { coordinator.receiveCallback(ingress()) }; ports.callback.validationStarted.await()
        coordinator.signOut(); work.await()
        assertTrue(ports.callback.validationCancellationCompleted); assertTrue(ports.callback.purgeObservedValidationCancellation)
    }

    private suspend fun verifyCleanupReservationLiveness() {
        val ports = ScriptPorts(listOf(0uL)); val coordinator = coordinator(ports, 1uL)
        ports.vault.readCandidate = false; coordinator.initialize(true); coordinator.signOut()
        ports.callback.result = CallbackConsumeResult.Duplicate; coordinator.receiveCallback(ingress())
        ports.provider.refreshResult = AuthPortResult.TransientFailure; coordinator.handle401(candidate())
        assertTrue(coordinator.normalizedTrace().contains(AuthTraceEntry.CALLBACK_RESERVED)); assertEquals(1, ports.provider.refreshCalls)
    }

    private suspend fun verifyCallbackStoreFailure() {
        val ports = ScriptPorts(listOf(0uL)); val coordinator = coordinator(ports, 1uL)
        ports.vault.readCandidate = false; coordinator.initialize(true)
        ports.callback.result = CallbackConsumeResult.Failed; coordinator.receiveCallback(ingress())
        assertEquals(FixedAuthOutcomeCategory.TRANSIENT_FAILURE, coordinator.snapshot().fixedOutcomeCategory)
        assertEquals(listOf("callback"), ports.cleanup.take(1)); assertTrue(ports.cleanup.contains("callback_confirm"))
        assertFalse(coordinator.isTerminalFenced())
        for (confirmFailure in listOf(false, true)) {
            val failing = ScriptPorts(listOf(0uL)); val fenced = coordinator(failing, 1uL)
            failing.vault.readCandidate = false; fenced.initialize(true); failing.callback.result = CallbackConsumeResult.Failed
            if (confirmFailure) failing.callback.confirm = false else failing.callback.purgeResult = ConditionalMutationResult.FAILED
            fenced.receiveCallback(ingress())
            assertTrue(fenced.isTerminalFenced()); assertEquals(FixedAuthOutcomeCategory.TRANSIENT_FAILURE, fenced.snapshot().fixedOutcomeCategory)
            assertEquals(if (confirmFailure) listOf("callback", "callback_confirm") else listOf("callback"), failing.cleanup)
        }
    }

    private suspend fun verifyDelayedEffectCancellation() = coroutineScope {
        val ports = ScriptPorts(listOf(0uL, 500uL)); val coordinator = coordinator(ports, 1uL)
        ports.vault.readCandidate = false; coordinator.initialize(true); ports.clock.suspendSleep = true
        val delayed = async { coordinator.scheduleDelayedAnnouncement(AuthAnnouncementMessageId.SAFE_TERMINAL_ERROR, AuthAnnouncementPriority.POLITE) }
        ports.clock.waitSleepStarted(); coordinator.handle403(); ports.clock.releaseSleep(); delayed.await()
        assertTrue(coordinator.drainPresentationEffects(coordinator.currentGeneration()).isEmpty())
    }

    private suspend fun exerciseTerminalEntryPoints(coordinator: AuthRuntimeCoordinator) {
        coordinator.initialize(true); coordinator.receiveCallback(ingress()); coordinator.cancelCallback()
        coordinator.handle401(candidate()); coordinator.handle403(); coordinator.scheduleTimeout(AuthTimeoutKind.PROVIDER_OR_API_STEP)
        coordinator.scheduleDelayedAnnouncement(AuthAnnouncementMessageId.SAFE_TERMINAL_ERROR, AuthAnnouncementPriority.ASSERTIVE)
        coordinator.signOut(); coordinator.switchAccount()
    }

    companion object {
        private const val DIGEST = "0e273eeddffd655f44ad86514da715c8925fadc99f093047e6d6ee1f6d33f214"
        private fun split(value: String) = if (value == "-") emptyList() else value.split('>')
        private fun candidate() = OpaqueSessionCandidate("synthetic")
        private fun ingress() = OpaqueCallbackIngress("https://auth.dev.fluyo.test/native/auth/callback?code=x&state=expected&nonce=expected")
        private fun coordinator(ports: ScriptPorts, generation: ULong) = AuthRuntimeCoordinator(ports.provider, ports.vault, ports.callback, ports.clock, ports.owner, TrapTelemetry(), generation)
        private fun normalize(value: AuthRuntimeSnapshot, generation: ULong) = listOf(value.state.wire, value.hasSessionCandidate.wire, if (value.hasVerifiedOwnerState) "1" else "0", value.safeDestinationId.wire, value.fixedOutcomeCategory?.wire ?: "none", generation.toString()).joinToString(",")
        private fun normalize(effect: AuthPresentationEffect): String {
            val p = effect.payload
            val payload = "aggregate:${p.focus?.wire ?: "none"}:${p.announcement?.wire ?: "none"}:${p.priority?.wire ?: "none"}:${p.navigation?.wire ?: "none"}"
            return "${effect.generation}:${effect.sequence}:${effect.originatingState.wire}:$payload"
        }
        @JvmStatic @Parameterized.Parameters(name = "{index}:{0}") fun rows(): List<Array<Any>> = loadCorpus().map { arrayOf(it) }
        private fun loadCorpus(): List<Vector> {
            var current = Path.of(System.getProperty("user.dir")).toAbsolutePath(); var file: Path? = null
            repeat(8) { val candidate = current.resolve("contracts/mobile/auth-runtime-synthetic/v1/vectors.tsv"); if (Files.isRegularFile(candidate)) file = candidate else current = current.parent ?: current }
            val bytes = requireNotNull(file).readBytes(); assertFalse(bytes.take(3) == listOf(0xef.toByte(), 0xbb.toByte(), 0xbf.toByte()))
            val decoder = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT)
            val text = decoder.decode(java.nio.ByteBuffer.wrap(bytes)).toString(); assertFalse(text.contains('\r')); assertTrue(text.endsWith('\n'))
            val lines = text.dropLast(1).split('\n'); val expectedHeader = "kind\tid\tinitial\tsteps\tmonotonicTimes\tportCompletions\texpectedSnapshots\texpectedEffects\texpectedTrace\twipeOrder\trejectedWrites\tfinalGeneration\tterminal\tcontractFingerprint"
            assertEquals(expectedHeader, lines.first()); val rows = lines.drop(1).map { Vector(it.split('\t')) }
            assertEquals(28, rows.count { it.kind == "scenario" }); assertEquals(13, rows.count { it.kind == "invariant" }); assertEquals(41, rows.map { it.id }.toSet().size); return rows
        }
    }
}

private class TrapTelemetry : StructurallyNoOpTelemetryPort
private class CompletionAudit(private val commands: List<String> = emptyList()) {
    private val values = mutableListOf<String>()
    @Synchronized fun take(vararg allowed: String): String? {
        val command = commands.getOrNull(values.size) ?: return null
        if (command !in allowed) return null
        values += command
        return command
    }
    @Synchronized fun hasCommands() = commands.isNotEmpty()
    @Synchronized fun snapshot(): List<String> = values.toList()
}
private class GenerationCell {
    private val lock = ReentrantLock(); private var value: ULong = 1uL; private var pausedGeneration: ULong? = null
    private var comparisonStarted = CountDownLatch(1); private var comparisonRelease = CountDownLatch(1)
    fun activate(generation: ULong) = lock.withLock { if (generation > value) value = generation }
    fun pauseAfterComparison(generation: ULong) { pausedGeneration = generation; comparisonStarted = CountDownLatch(1); comparisonRelease = CountDownLatch(1) }
    fun waitComparisonStarted() { assertTrue(comparisonStarted.await(5, TimeUnit.SECONDS)) }
    fun releaseComparison() = comparisonRelease.countDown()
    fun compareAndMutate(generation: ULong, mutation: () -> Unit): Boolean = lock.withLock {
        if (value != generation) return@withLock false
        if (pausedGeneration == generation) { comparisonStarted.countDown(); assertTrue(comparisonRelease.await(5, TimeUnit.SECONDS)); pausedGeneration = null }
        mutation(); true
    }
}
private class ScriptPorts(times: List<ULong>, completionCommands: List<String> = emptyList()) {
    val cleanup = mutableListOf<String>()
    private val completions = CompletionAudit(completionCommands)
    val generations = GenerationCell()
    val provider = ScriptProvider(completions); val vault = ScriptVault(cleanup, completions, generations); val callback = ScriptCallback(cleanup, completions, generations); val clock = ScriptClock(times, completions); val owner = ScriptOwner(cleanup, completions, generations)
    fun completionValues() = completions.snapshot()
    fun seedPersistence() { callback.pending = true; vault.storedCandidate = true; owner.headersPresent = true; owner.ownerPresent = true }
    fun persistence() = listOf(callback.pending, owner.headersPresent, vault.storedCandidate, owner.ownerPresent)
    fun wipeSummary(): String = when (cleanup) {
        emptyList<String>() -> if (callback.atomicWipe) "callback" else "none"
        listOf("callback") -> "callback"
        listOf("callback", "headers", "vault", "owner", "callback_confirm", "vault_confirm", "owner_confirm") -> "callback_headers_vault_owner_confirm"
        else -> cleanup.joinToString("_")
    }
}
private class ScriptProvider(private val completions: CompletionAudit) : AuthProviderPort {
    var refreshResult: AuthPortResult<OpaqueSessionCandidate> = AuthPortResult.Success(OpaqueSessionCandidate("synthetic")); var suspendExchange = false; var suspendRefresh = false
    val exchangeStarted = CompletableDeferred<Unit>(); val exchangeRelease = CompletableDeferred<Unit>(); private val cancellationObserved = CompletableDeferred<Unit>()
    val refreshStarted = CompletableDeferred<Unit>(); val refreshRelease = CompletableDeferred<Unit>(); private val refreshCancellationObserved = CompletableDeferred<Unit>()
    var refreshCalls = 0; var verifyCalls = 0; var lastExchangeStorage: String? = null; private val canceled = mutableSetOf<ULong>()
    override suspend fun exchange(candidate: OpaqueSessionCandidate, generation: ULong): AuthPortResult<OpaqueSessionCandidate> { lastExchangeStorage = candidate.storage; val command = completions.take("exchange_success", "suspended"); val shouldSuspend = command == "suspended" || (command == null && suspendExchange); if (shouldSuspend) { exchangeStarted.complete(Unit); exchangeRelease.await(); if (generation in canceled) cancellationObserved.complete(Unit) }; return if (generation in canceled) AuthPortResult.TransientFailure else AuthPortResult.Success(candidate) }
    override suspend fun refresh(candidate: OpaqueSessionCandidate, generation: ULong): AuthPortResult<OpaqueSessionCandidate> { refreshCalls++; if (suspendRefresh) { refreshStarted.complete(Unit); refreshRelease.await(); if (generation in canceled) refreshCancellationObserved.complete(Unit) }; if (generation in canceled) return AuthPortResult.TransientFailure; return when (completions.take("refresh_success", "refresh_invalid", "refresh_transient", "refresh_forbidden", "refresh_malformed")) { "refresh_invalid" -> AuthPortResult.ExplicitInvalidation; "refresh_transient" -> AuthPortResult.TransientFailure; "refresh_forbidden" -> AuthPortResult.Forbidden; "refresh_malformed" -> AuthPortResult.Malformed; "refresh_success" -> AuthPortResult.Success(candidate); else -> refreshResult } }
    override suspend fun verifyOwner(candidate: OpaqueSessionCandidate, generation: ULong): AuthPortResult<OpaqueOwnerSubject> { verifyCalls++; completions.take("verify_success"); return AuthPortResult.Success(OpaqueOwnerSubject("private")) }
    override suspend fun cancelOwnedWork(generation: ULong) { canceled += generation; if (suspendExchange) { exchangeRelease.complete(Unit); cancellationObserved.await() }; if (suspendRefresh) { refreshRelease.complete(Unit); refreshCancellationObserved.await() } }
}
private class ScriptVault(private val cleanup: MutableList<String>, private val completions: CompletionAudit, private val generations: GenerationCell) : SessionVaultPort {
    var readCandidate = false; var storedCandidate = false; var replaceResult = ConditionalMutationResult.APPLIED; var suspendReplace = false; var clearResult = ConditionalMutationResult.APPLIED; var confirm = true; var staleWrites = 0
    private var latestGeneration = 0uL
    val replaceStarted = CompletableDeferred<Unit>(); val replaceRelease = CompletableDeferred<Unit>(); var replaceCalls = 0; var seedReplaces = 0
    val replaceCallsAfterSeed get() = (replaceCalls - seedReplaces).coerceAtLeast(0)
    override suspend fun read(generation: ULong): AuthPortResult<OpaqueSessionCandidate?> { val command = completions.take("vault_candidate", "vault_none"); val hasCandidate = when (command) { "vault_candidate" -> true; "vault_none" -> false; else -> readCandidate }; storedCandidate = hasCandidate; return AuthPortResult.Success(if (hasCandidate) OpaqueSessionCandidate("synthetic") else null) }
    override suspend fun replace(candidate: OpaqueSessionCandidate, generation: ULong): ConditionalMutationResult { replaceCalls++; if (readCandidate && seedReplaces == 0) seedReplaces = 1; val command = completions.take("suspended", "replace_failed"); val shouldSuspend = command == "suspended" || (command == null && suspendReplace); if (shouldSuspend) { replaceStarted.complete(Unit); replaceRelease.await() }; val result = if (command == "replace_failed") ConditionalMutationResult.FAILED else replaceResult; if (!generations.compareAndMutate(generation) { latestGeneration = generation; if (result == ConditionalMutationResult.APPLIED) storedCandidate = true }) { staleWrites++; return ConditionalMutationResult.STALE_GENERATION }; return result }
    override suspend fun clear(generation: ULong): ConditionalMutationResult { cleanup += "vault"; if (!generations.compareAndMutate(generation) { latestGeneration = generation; if (clearResult == ConditionalMutationResult.APPLIED) storedCandidate = false }) { staleWrites++; return ConditionalMutationResult.STALE_GENERATION }; return clearResult }
    override suspend fun confirmEmpty(generation: ULong): Boolean { cleanup += "vault_confirm"; return confirm && !storedCandidate }
}
private class ScriptCallback(private val cleanup: MutableList<String>, private val completions: CompletionAudit, private val generations: GenerationCell) : CallbackTransactionStorePort {
    var result: CallbackConsumeResult = CallbackConsumeResult.Malformed; var purgeResult = ConditionalMutationResult.APPLIED; var confirm = true; var calls = 0
    var atomicWipe = false; var pending = false; var suspendValidation = false; var validationCancellationCompleted = false; var purgeObservedValidationCancellation = false
    val validationStarted = CompletableDeferred<Unit>(); private val validationRelease = CompletableDeferred<Unit>(); private val validationCancellationObserved = CompletableDeferred<Unit>(); private val canceled = mutableSetOf<ULong>()
    override suspend fun validateConsumeAndWipe(ingress: OpaqueCallbackIngress, generation: ULong): CallbackConsumeResult { calls++; if (suspendValidation) { validationStarted.complete(Unit); validationRelease.await(); if (generation in canceled) { validationCancellationCompleted = true; validationCancellationObserved.complete(Unit); return CallbackConsumeResult.StaleGeneration } }; val scripted = when (completions.take("callback_consumed", "callback_malformed", "callback_expired", "callback_replayed", "callback_duplicate", "callback_unsupported", "callback_stale", "callback_failed")) { "callback_consumed" -> CallbackConsumeResult.Consumed(OpaqueSessionCandidate("opaque-pkce")); "callback_malformed" -> CallbackConsumeResult.Malformed; "callback_expired" -> CallbackConsumeResult.Expired; "callback_replayed" -> CallbackConsumeResult.Replayed; "callback_duplicate" -> CallbackConsumeResult.Duplicate; "callback_unsupported" -> CallbackConsumeResult.Unsupported; "callback_stale" -> CallbackConsumeResult.StaleGeneration; "callback_failed" -> CallbackConsumeResult.Failed; else -> result }; atomicWipe = scripted is CallbackConsumeResult.Consumed || scripted is CallbackConsumeResult.Malformed || scripted is CallbackConsumeResult.Expired || scripted is CallbackConsumeResult.Replayed || scripted is CallbackConsumeResult.Unsupported; if (atomicWipe) pending = false; return scripted }
    override suspend fun purge(generation: ULong): ConditionalMutationResult { cleanup += "callback"; purgeObservedValidationCancellation = !suspendValidation || validationCancellationCompleted; val scripted = if (completions.take("purge_failed") == "purge_failed") ConditionalMutationResult.FAILED else purgeResult; if (!generations.compareAndMutate(generation) { if (scripted == ConditionalMutationResult.APPLIED) pending = false }) return ConditionalMutationResult.STALE_GENERATION; return scripted }
    override suspend fun confirmEmpty(generation: ULong): Boolean { cleanup += "callback_confirm"; return confirm && !pending }
    override suspend fun activateGeneration(generation: ULong) { generations.activate(generation) }
    override suspend fun cancelOwnedWork(generation: ULong) { canceled += generation; if (suspendValidation) { validationRelease.complete(Unit); validationCancellationObserved.await() } }
}
private class ScriptClock(private val times: List<ULong>, private val completions: CompletionAudit) : AuthClockPort {
    private var index = 0; val requested = mutableListOf<ULong>(); var suspendSleep = false; @Volatile private var delayedElapsed: ULong? = null
    private class SleepHandle(val id: ULong, val generation: ULong) { val started = CompletableDeferred<Unit>(); val release = CompletableDeferred<Unit>(); val cancellationObserved = CompletableDeferred<Unit>(); @Volatile var canceled = false }
    private var nextHandle = 1uL; private val activeHandles = mutableListOf<SleepHandle>()
    override suspend fun monotonicMilliseconds() = times.getOrElse(index++) { times.lastOrNull() ?: 0uL }
    override suspend fun sleep(milliseconds: ULong, generation: ULong): Boolean { requested += milliseconds; val handle = synchronized(this) { SleepHandle(nextHandle, generation).also { nextHandle += 1uL; activeHandles += it } }; if (completions.take("timer_fired") == "timer_fired") { synchronized(this) { activeHandles.remove(handle) }; return true }; val elapsed = delayedElapsed; if (milliseconds == 500uL && elapsed != null) { synchronized(this) { activeHandles.remove(handle) }; return elapsed >= milliseconds }; val shouldSuspend = suspendSleep || completions.hasCommands() || milliseconds == 500uL; if (shouldSuspend) { handle.started.complete(Unit); handle.release.await() }; synchronized(this) { activeHandles.remove(handle) }; if (handle.canceled) handle.cancellationObserved.complete(Unit); return !shouldSuspend && !handle.canceled }
    override suspend fun cancelOwnedTimers(generation: ULong) { val handles = synchronized(this) { activeHandles.filter { it.generation == generation }.onEach { it.canceled = true } }; handles.forEach { it.release.complete(Unit) }; handles.forEach { it.cancellationObserved.await() } }
    suspend fun waitSleepStarted() { var handle: SleepHandle? = null; while (handle == null) { handle = synchronized(this) { activeHandles.lastOrNull() }; if (handle == null) yield() }; handle!!.started.await() }
    fun releaseSleep() { synchronized(this) { activeHandles.toList() }.forEach { it.release.complete(Unit) } }
    fun setDelayedElapsed(milliseconds: ULong) { delayedElapsed = milliseconds }
    fun requests() = requested.toList()
}
private class ScriptOwner(private val cleanup: MutableList<String>, private val completions: CompletionAudit, private val generations: GenerationCell) : OwnerDataStorePort {
    var bindResult = ConditionalMutationResult.APPLIED; var headersResult = ConditionalMutationResult.APPLIED; var purgeResult = ConditionalMutationResult.APPLIED; var confirm = true; var headersPresent = false; var ownerPresent = false
    override suspend fun bind(owner: OpaqueOwnerSubject, generation: ULong): ConditionalMutationResult { val scripted = if (completions.take("bind_failed") == "bind_failed") ConditionalMutationResult.FAILED else bindResult; if (!generations.compareAndMutate(generation) { if (scripted == ConditionalMutationResult.APPLIED) ownerPresent = true }) return ConditionalMutationResult.STALE_GENERATION; return scripted }
    override suspend fun clearHeadersAndRequests(generation: ULong): ConditionalMutationResult { cleanup += "headers"; if (!generations.compareAndMutate(generation) { if (headersResult == ConditionalMutationResult.APPLIED) headersPresent = false }) return ConditionalMutationResult.STALE_GENERATION; return headersResult }
    override suspend fun purgeOwnerData(generation: ULong): ConditionalMutationResult { cleanup += "owner"; if (!generations.compareAndMutate(generation) { if (purgeResult == ConditionalMutationResult.APPLIED) ownerPresent = false }) return ConditionalMutationResult.STALE_GENERATION; return purgeResult }
    override suspend fun confirmEmpty(generation: ULong): Boolean { cleanup += "owner_confirm"; return confirm && !ownerPresent && !headersPresent }
}
private enum class CleanupFailure {
    CALLBACK_PURGE, HEADERS_CLEAR, VAULT_CLEAR, OWNER_PURGE, CALLBACK_CONFIRM, VAULT_CONFIRM, OWNER_CONFIRM;
    fun apply(ports: ScriptPorts) { ports.seedPersistence(); when (this) {
        CALLBACK_PURGE -> ports.callback.purgeResult = ConditionalMutationResult.FAILED
        HEADERS_CLEAR -> ports.owner.headersResult = ConditionalMutationResult.FAILED
        VAULT_CLEAR -> ports.vault.clearResult = ConditionalMutationResult.FAILED
        OWNER_PURGE -> ports.owner.purgeResult = ConditionalMutationResult.FAILED
        CALLBACK_CONFIRM -> ports.callback.confirm = false
        VAULT_CONFIRM -> ports.vault.confirm = false
        OWNER_CONFIRM -> ports.owner.confirm = false
    } }
    val expectedPrefix: List<String> get() = when (this) {
        CALLBACK_PURGE -> listOf("callback")
        HEADERS_CLEAR -> listOf("callback", "headers")
        VAULT_CLEAR -> listOf("callback", "headers", "vault")
        OWNER_PURGE -> listOf("callback", "headers", "vault", "owner")
        CALLBACK_CONFIRM -> listOf("callback", "headers", "vault", "owner", "callback_confirm")
        VAULT_CONFIRM -> listOf("callback", "headers", "vault", "owner", "callback_confirm", "vault_confirm")
        OWNER_CONFIRM -> listOf("callback", "headers", "vault", "owner", "callback_confirm", "vault_confirm", "owner_confirm")
    }
    val expectedPersistence: List<Boolean> get() = when (this) {
        CALLBACK_PURGE -> listOf(true, true, true, true)
        HEADERS_CLEAR -> listOf(false, true, true, true)
        VAULT_CLEAR -> listOf(false, false, true, true)
        OWNER_PURGE -> listOf(false, false, false, true)
        CALLBACK_CONFIRM, VAULT_CONFIRM, OWNER_CONFIRM -> listOf(false, false, false, false)
    }
}
private class StrictCallbackStore(
    private val now: ULong, expiresAt: ULong, issuedAt: ULong = 0uL,
    purpose: String = "native_auth", environment: String = "dev", host: String = "auth.dev.fluyo.test",
    path: String = "/native/auth/callback", oauthState: String = "expected", nonce: String = "expected", verifier: String = "opaque-pkce",
) : CallbackTransactionStorePort {
    private class Pending(
        val issuedAt: ULong, val expiresAt: ULong, val purpose: String, val environment: String,
        val host: String, val path: String, val oauthState: String, val nonce: String, val verifier: String,
    )
    private var pending: Pending? = Pending(issuedAt, expiresAt, purpose, environment, host, path, oauthState, nonce, verifier)
    override suspend fun validateConsumeAndWipe(ingress: OpaqueCallbackIngress, generation: ULong): CallbackConsumeResult {
        if (generation != 1uL) return CallbackConsumeResult.StaleGeneration
        val expected = pending ?: return CallbackConsumeResult.Replayed; pending = null
        if (now < expected.issuedAt || now >= expected.expiresAt) return CallbackConsumeResult.Expired
        if (expected.purpose != "native_auth" || expected.environment != "dev") return CallbackConsumeResult.Malformed
        val raw = ingress.storage
        if (!raw.all { it.code in 0x20..0x7e } || '\\' in raw || '%' in raw) return CallbackConsumeResult.Malformed
        val uri = runCatching { URI(raw) }.getOrNull() ?: return CallbackConsumeResult.Malformed
        if (uri.scheme != "https" || uri.rawAuthority != expected.host || expected.host.any { it.code !in 0x21..0x7e } || uri.userInfo != null || uri.port != -1 || uri.rawFragment != null || uri.rawPath != expected.path) return CallbackConsumeResult.Malformed
        val parts = uri.rawQuery?.split('&') ?: return CallbackConsumeResult.Malformed
        if (parts.map { it.substringBefore('=') } != listOf("code", "state", "nonce")) return CallbackConsumeResult.Malformed
        val values = parts.associate { it.substringBefore('=') to it.substringAfter('=', "") }
        return if (!values["code"].isNullOrEmpty() && values["state"] == expected.oauthState && values["nonce"] == expected.nonce) CallbackConsumeResult.Consumed(OpaqueSessionCandidate(expected.verifier)) else CallbackConsumeResult.Malformed
    }
    override suspend fun purge(generation: ULong): ConditionalMutationResult { pending = null; return ConditionalMutationResult.APPLIED }
    override suspend fun confirmEmpty(generation: ULong) = pending == null
    override suspend fun activateGeneration(generation: ULong) {}
    override suspend fun cancelOwnedWork(generation: ULong) {}
}
