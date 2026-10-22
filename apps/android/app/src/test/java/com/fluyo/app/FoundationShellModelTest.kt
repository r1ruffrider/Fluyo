package com.fluyo.app

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class FoundationShellModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val valid = AppConfiguration(
        environment = "development",
        apiBaseUrl = "https://api.dev.fluyo.example.test/api/v1",
        supabaseUrl = "https://auth.dev.fluyo.example.test",
        supabasePublishableKey = "synthetic_public_value",
        networkEnabled = true,
        isInternal = true,
        semanticVersion = "0.1.0",
        versionCode = 1,
        sourceCommitShort = "abcdef1",
    )

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun validInternalConfigurationResolvesToSignedOut() = runTest(dispatcher) {
        val model = FoundationShellModel(valid, loadingDelayMs = 200)
        model.start()
        assertEquals(FoundationShellState.Loading, model.state.value)
        advanceUntilIdle()
        assertEquals(FoundationShellState.SignedOut, model.state.value)
    }

    @Test fun invalidOrProductionConfigurationResolvesToFailure() = runTest(dispatcher) {
        val model = FoundationShellModel(
            valid.copy(
                environment = "production",
                apiBaseUrl = "",
                supabaseUrl = "",
                supabasePublishableKey = "",
                networkEnabled = false,
                isInternal = false,
            ),
            loadingDelayMs = 0,
        )
        model.start()
        advanceUntilIdle()
        assertEquals(FoundationShellState.Failure, model.state.value)
    }

    @Test fun retryCancelsThePriorTransitionAndSettlesOnce() = runTest(dispatcher) {
        val model = FoundationShellModel(valid, loadingDelayMs = 200)
        model.start()
        model.retry()
        advanceUntilIdle()
        assertEquals(FoundationShellState.SignedOut, model.state.value)
    }
}
