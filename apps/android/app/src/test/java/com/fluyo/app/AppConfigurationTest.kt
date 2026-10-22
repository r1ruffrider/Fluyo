package com.fluyo.app

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AppConfigurationTest {
    private fun config(environment: String = "development", api: String = "https://api.dev.fluyo.example.test/api/v1", auth: String = "https://auth.dev.fluyo.example.test", key: String = "synthetic_public_value", network: Boolean = true, internal: Boolean = true) =
        AppConfiguration(environment, api, auth, key, network, internal, "0.1.0", 1, "abcdef1")

    @Test fun developmentAndStagingAcceptOnlyPublicTestConfiguration() {
        assertTrue(config().isValidFoundationConfiguration())
        assertTrue(config(environment = "staging").isValidFoundationConfiguration())
        assertFalse(config(api = "https://api.invalid/api/v1").isValidFoundationConfiguration())
        assertFalse(config(api = "http://api.dev.fluyo.example.test/api/v1").isValidFoundationConfiguration())
        assertFalse(config(key = "short").isValidFoundationConfiguration())
    }

    @Test fun productionIsInertAndDoesNotAcceptInheritedValues() {
        assertTrue(config("production", "", "", "", network = false, internal = false).isValidFoundationConfiguration())
        assertFalse(config("production", network = false, internal = false).isValidFoundationConfiguration())
        assertFalse(config("production", "", "", "", network = true, internal = false).isValidFoundationConfiguration())
    }

    @Test fun unknownEnvironmentFailsClosed() { assertFalse(config(environment = "release").isValidFoundationConfiguration()) }
}
