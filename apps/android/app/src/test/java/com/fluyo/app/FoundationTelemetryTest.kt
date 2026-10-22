package com.fluyo.app

import org.junit.Test

class FoundationTelemetryTest {
    @Test fun noOpSinkAcceptsOnlyTheTypedRecordAndRetainsNothing() {
        NoOpFoundationTelemetry.record(
            FoundationEvent.SHELL_LOADED,
            FoundationEventProperties("android", "development", true, "0.1.0", "1", "abcdef1", "loaded", "100_to_499ms"),
        )
    }
}
