package com.fluyo.app

import android.content.res.Configuration
import android.os.LocaleList
import android.view.View
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FoundationShellTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val valid = AppConfiguration("development", "https://api.dev.fluyo.example.test/api/v1", "https://auth.dev.fluyo.example.test", "synthetic_public_value", true, true, "0.1.0", 1, "abcdef1")

    @Test fun loadingHasOneSemanticStateAndMarker() {
        compose.setContent { MaterialTheme { FoundationShell(FoundationShellState.Loading, valid) {} } }
        val loading = compose.onNodeWithTag("loading-state").assertIsDisplayed().fetchSemanticsNode()
        assertEquals(LiveRegionMode.Polite, loading.config[SemanticsProperties.LiveRegion])
        compose.onAllNodesWithTag("signed-out-state").assertCountEquals(0)
        compose.onAllNodesWithTag("error-state").assertCountEquals(0)
        compose.onNodeWithTag("internal-build-marker").assertIsDisplayed()
    }

    @Test fun signedOutActionIsHonestFocusedAndAtLeast48Dp() {
        compose.setContent { MaterialTheme { FoundationShell(FoundationShellState.SignedOut, valid) {} } }
        compose.onNodeWithTag("signed-out-state").assertIsDisplayed()
        val action = compose.onNodeWithTag("review-build-button")
        action.assertIsDisplayed().assertHeightIsAtLeast(48.dp)
        compose.waitUntil(5_000) {
            runCatching {
                action.fetchSemanticsNode().config[SemanticsProperties.Focused]
            }.getOrDefault(false)
        }
        action.assertIsFocused().performClick()
        compose.onNodeWithTag("scope-detail").assertIsDisplayed().assertTextContains("local shell")
    }

    @Test fun safeErrorFocusesRetryAndOmitsInternalDetail() {
        compose.setContent { MaterialTheme { FoundationShell(FoundationShellState.Failure, valid.copy(apiBaseUrl = "")) {} } }
        compose.onNodeWithTag("error-state").assertIsDisplayed()
        compose.onNodeWithTag("retry-button").assertHeightIsAtLeast(48.dp).assertIsFocused()
        compose.onNodeWithTag("internal-build-marker").assertIsDisplayed()
    }

    @Test fun twoHundredPercentFontKeepsThePrimaryActionReachable() {
        compose.setContent {
            val current = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(current.density, 2f)) {
                MaterialTheme { FoundationShell(FoundationShellState.SignedOut, valid) {} }
            }
        }
        val action = compose.onNodeWithTag("review-build-button")
        compose.waitUntil(5_000) { runCatching { action.fetchSemanticsNode().boundsInRoot.height > 0f }.getOrDefault(false) }
        action.performScrollTo()
        compose.waitForIdle()
        action.assertIsDisplayed().assertHeightIsAtLeast(48.dp)
    }

    @Test fun rtlMirrorsLeadingGeometryAndKeepsActionSemantics() {
        var direction by mutableStateOf(LayoutDirection.Ltr)
        compose.setContent { CompositionLocalProvider(LocalLayoutDirection provides direction) { MaterialTheme { FoundationShell(FoundationShellState.SignedOut, valid) {} } } }
        val ltr = compose.onNodeWithTag("brand-heading").assertIsDisplayed().fetchSemanticsNode().boundsInRoot
        compose.runOnIdle { direction = LayoutDirection.Rtl }
        compose.waitForIdle()
        val rtl = compose.onNodeWithTag("brand-heading").assertIsDisplayed().fetchSemanticsNode().boundsInRoot
        assertTrue(ltr.width > 0f && rtl.width > 0f && rtl.left > ltr.left)
        compose.onNodeWithTag("review-build-button").assertIsDisplayed()
    }

    @Test fun pseudoLocalesExpandResourcesAndReportRtlDirection() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val english = context.getString(R.string.signed_out_body)
        val expandedConfiguration = Configuration(context.resources.configuration).apply {
            setLocales(LocaleList.forLanguageTags("en-XA"))
        }
        val expanded = context.createConfigurationContext(expandedConfiguration).getString(R.string.signed_out_body)
        assertNotEquals(english, expanded)
        assertTrue(expanded.length >= english.length)

        val rtlConfiguration = Configuration(context.resources.configuration).apply {
            setLocales(LocaleList.forLanguageTags("ar-XB"))
        }
        val rtlContext = context.createConfigurationContext(rtlConfiguration)
        assertEquals(View.LAYOUT_DIRECTION_RTL, rtlContext.resources.configuration.layoutDirection)
    }

    @Test fun resizePreservesTheNewestStateAndExpandedScope() {
        var width by mutableStateOf(320.dp)
        var state by mutableStateOf<FoundationShellState>(FoundationShellState.Loading)
        compose.setContent {
            Box(Modifier.width(width).height(520.dp)) {
                MaterialTheme { FoundationShell(state, valid) {} }
            }
        }
        compose.runOnIdle {
            state = FoundationShellState.SignedOut
            width = 840.dp
        }
        compose.onNodeWithTag("review-build-button").assertIsDisplayed().performClick()
        compose.onNodeWithTag("scope-detail").assertIsDisplayed()
        compose.runOnIdle {
            state = FoundationShellState.Failure
            width = 600.dp
        }
        compose.onNodeWithTag("error-state").assertIsDisplayed()
        compose.onAllNodesWithTag("signed-out-state").assertCountEquals(0)
    }

}
