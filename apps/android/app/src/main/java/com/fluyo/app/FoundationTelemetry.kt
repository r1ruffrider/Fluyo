package com.fluyo.app

enum class FoundationEvent { SHELL_LOADED, SHELL_FAILED, SHELL_STATE_CHANGED }

data class FoundationEventProperties(
    val platform: String,
    val environment: String,
    val isInternal: Boolean,
    val semanticVersion: String,
    val versionCode: String,
    val sourceCommitShort: String,
    val outcome: String,
    val durationBucket: String,
)

fun interface FoundationTelemetry { fun record(event: FoundationEvent, properties: FoundationEventProperties) }

object NoOpFoundationTelemetry : FoundationTelemetry {
    override fun record(event: FoundationEvent, properties: FoundationEventProperties) = Unit
}
