package com.fluyo.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface FoundationShellState {
    data object Loading : FoundationShellState
    data object SignedOut : FoundationShellState
    data object Failure : FoundationShellState
}

class FoundationShellModel(
    private val configuration: AppConfiguration = AppConfiguration.fromBuild(),
    private val loadingDelayMs: Long = 200,
) : ViewModel() {
    private val mutableState = MutableStateFlow<FoundationShellState>(FoundationShellState.Loading)
    val state: StateFlow<FoundationShellState> = mutableState.asStateFlow()
    private var transitionJob: Job? = null

    fun start() {
        transitionJob?.cancel()
        transitionJob = viewModelScope.launch {
            mutableState.value = FoundationShellState.Loading
            delay(loadingDelayMs)
            mutableState.value = if (configuration.isValidFoundationConfiguration() && configuration.environment != "production") FoundationShellState.SignedOut else FoundationShellState.Failure
        }
    }

    fun retry() = start()
}
