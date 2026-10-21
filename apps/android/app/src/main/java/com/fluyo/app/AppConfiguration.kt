package com.fluyo.app

import java.net.URI

data class AppConfiguration(
    val environment: String,
    val apiBaseUrl: String,
    val supabaseUrl: String,
    val supabasePublishableKey: String,
    val networkEnabled: Boolean,
    val isInternal: Boolean,
    val semanticVersion: String,
    val versionCode: Int,
    val sourceCommitShort: String,
) {
    fun isValidFoundationConfiguration(): Boolean {
        if (environment == "production") {
            return !networkEnabled && !isInternal && apiBaseUrl.isEmpty() && supabaseUrl.isEmpty() && supabasePublishableKey.isEmpty()
        }
        if (environment !in setOf("development", "staging") || !networkEnabled || !isInternal) return false
        return isApprovedTestUrl(apiBaseUrl) && isApprovedTestUrl(supabaseUrl) &&
            supabasePublishableKey.matches(Regex("^[A-Za-z0-9_]{8,64}$")) &&
            sourceCommitShort.matches(Regex("^[0-9a-f]{7,12}$"))
    }

    private fun isApprovedTestUrl(value: String): Boolean = runCatching {
        val uri = URI(value)
        uri.scheme == "https" && uri.userInfo == null && uri.host?.endsWith(".test") == true
    }.getOrDefault(false)

    companion object {
        fun fromBuild(): AppConfiguration = AppConfiguration(
            environment = BuildConfig.FLUYO_ENVIRONMENT,
            apiBaseUrl = BuildConfig.FLUYO_API_BASE_URL,
            supabaseUrl = BuildConfig.FLUYO_SUPABASE_URL,
            supabasePublishableKey = BuildConfig.FLUYO_SUPABASE_PUBLISHABLE_KEY,
            networkEnabled = BuildConfig.FLUYO_NETWORK_ENABLED,
            isInternal = BuildConfig.FLUYO_INTERNAL_BUILD,
            semanticVersion = BuildConfig.VERSION_NAME,
            versionCode = BuildConfig.VERSION_CODE,
            sourceCommitShort = BuildConfig.FLUYO_SOURCE_COMMIT_SHORT,
        )
    }
}
