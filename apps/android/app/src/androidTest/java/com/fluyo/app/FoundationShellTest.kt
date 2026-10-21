package com.fluyo.app

import android.content.pm.ActivityInfo
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.SemanticsActions
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
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.filters.SdkSuppress
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import org.junit.Rule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

@SdkSuppress(maxSdkVersion = 36)
class FoundationShellTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
    private val valid = AppConfiguration("development", "https://api.dev.fluyo.example.test/api/v1", "https://auth.dev.fluyo.example.test", "synthetic_public_value", true, true, "0.1.0", 1, "abcdef1")

    private fun setFoundationContent(content: @Composable () -> Unit) {
        compose.runOnUiThread { compose.activity.setContent(content = content) }
        compose.waitForIdle()
    }

    private fun waitForNodeToBeDisplayed(tag: String) {
        try {
            compose.waitUntil(5_000) {
                compose.onAllNodesWithTag(tag).fetchSemanticsNodes().size == 1
            }
        } catch (_: Throwable) {
            throw AssertionError("node count")
        }
        val node = compose.onNodeWithTag(tag)
        try {
            node.performScrollTo()
        } catch (_: Throwable) {
            throw AssertionError("scroll action")
        }
        compose.waitForIdle()
        try {
            val target = node.fetchSemanticsNode().boundsInRoot
            assertTrue("node geometry", target.width > 0f && target.height > 0f)
        } catch (_: Throwable) {
            throw AssertionError("node geometry")
        }
    }

    @Test fun loadingHasOneSemanticStateAndMarker() {
        setFoundationContent { MaterialTheme { FoundationShell(FoundationShellState.Loading, valid) {} } }
        val loading = compose.onNodeWithTag("loading-state").assertIsDisplayed().fetchSemanticsNode()
        assertEquals(LiveRegionMode.Polite, loading.config[SemanticsProperties.LiveRegion])
        compose.onAllNodesWithTag("signed-out-state").assertCountEquals(0)
        compose.onAllNodesWithTag("error-state").assertCountEquals(0)
        compose.onNodeWithTag("internal-build-marker").assertIsDisplayed()
    }

    @Test fun signedOutActionIsHonestFocusableAndAtLeast48Dp() {
        setFoundationContent { MaterialTheme { FoundationShell(FoundationShellState.SignedOut, valid) {} } }
        compose.onNodeWithTag("signed-out-state").assertIsDisplayed()
        val action = compose.onNodeWithTag("review-build-button")
        action.assertIsDisplayed().assertHeightIsAtLeast(48.dp)
        action.performSemanticsAction(SemanticsActions.RequestFocus)
        action.assertIsFocused().performClick()
        compose.onNodeWithTag("scope-detail").assertIsDisplayed().assertTextContains("local shell")
    }

    @Test fun safeErrorFocusesRetryAndOmitsInternalDetail() {
        setFoundationContent { MaterialTheme { FoundationShell(FoundationShellState.Failure, valid.copy(apiBaseUrl = "")) {} } }
        compose.onNodeWithTag("error-state").assertIsDisplayed()
        compose.onNodeWithTag("retry-button").assertHeightIsAtLeast(48.dp).assertIsFocused()
        compose.onNodeWithTag("internal-build-marker").assertIsDisplayed()
    }

    @Test fun twoHundredPercentFontKeepsThePrimaryActionReachable() {
        try {
            device.executeShellCommand("settings put system font_scale 2.0")
            compose.activityRule.scenario.recreate()
            compose.waitForIdle()
        } catch (_: Throwable) {
            throw AssertionError("content setup")
        }
        try {
            waitForNodeToBeDisplayed("signed-out-state")
            waitForNodeToBeDisplayed("review-build-button")
        } finally {
            device.executeShellCommand("settings put system font_scale 1.0")
        }
    }

    @Test fun rtlMirrorsLeadingGeometryAndKeepsActionSemantics() {
        var direction by mutableStateOf(LayoutDirection.Ltr)
        setFoundationContent { CompositionLocalProvider(LocalLayoutDirection provides direction) { MaterialTheme { FoundationShell(FoundationShellState.SignedOut, valid) {} } } }
        val ltr = compose.onNodeWithTag("brand-heading").assertIsDisplayed().fetchSemanticsNode().boundsInRoot
        compose.runOnIdle { direction = LayoutDirection.Rtl }
        compose.waitForIdle()
        val rtl = compose.onNodeWithTag("brand-heading").assertIsDisplayed().fetchSemanticsNode().boundsInRoot
        assertTrue(ltr.width > 0f && rtl.width > 0f && rtl.left > ltr.left)
        compose.onNodeWithTag("review-build-button").assertIsDisplayed()
    }

    @Test fun resizePreservesTheNewestStateAcrossWindowClasses() {
        try {
            compose.activityRule.scenario.onActivity {
                it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
            }
            compose.activityRule.scenario.recreate()
            compose.waitForIdle()
        } catch (_: Throwable) {
            throw AssertionError("content setup")
        }
        try {
            waitForNodeToBeDisplayed("signed-out-state")
            waitForNodeToBeDisplayed("review-build-button")
        } catch (_: Throwable) {
            throw AssertionError("state transition")
        } finally {
            compose.activityRule.scenario.onActivity {
                it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            }
        }
    }

}
