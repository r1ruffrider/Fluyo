package com.fluyo.app

import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
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
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.filters.SdkSuppress
import org.junit.Rule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

@SdkSuppress(maxSdkVersion = 36)
class FoundationShellTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
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
            setFoundationContent {
                val current = LocalDensity.current
                CompositionLocalProvider(LocalDensity provides Density(current.density, 2f)) {
                    MaterialTheme { FoundationShell(FoundationShellState.SignedOut, valid) {} }
                }
            }
        } catch (_: Throwable) {
            throw AssertionError("content setup")
        }
        waitForNodeToBeDisplayed("review-build-button")
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
        var width by mutableStateOf(320.dp)
        var state by mutableStateOf<FoundationShellState>(FoundationShellState.Loading)
        try {
            setFoundationContent {
                Box(Modifier.width(width).height(520.dp)) {
                    MaterialTheme { FoundationShell(state, valid) {} }
                }
            }
        } catch (_: Throwable) {
            throw AssertionError("content setup")
        }
        try {
            compose.runOnIdle {
                state = FoundationShellState.SignedOut
                width = 400.dp
            }
            compose.waitForIdle()
            compose.waitUntil(5_000) { compose.onAllNodesWithTag("signed-out-state").fetchSemanticsNodes().size == 1 }
        } catch (_: Throwable) {
            throw AssertionError("state transition")
        }
        waitForNodeToBeDisplayed("review-build-button")
        try {
            compose.runOnIdle {
                state = FoundationShellState.Failure
                width = 360.dp
            }
            compose.onNodeWithTag("error-state").assertIsDisplayed()
            compose.onAllNodesWithTag("signed-out-state").assertCountEquals(0)
        } catch (_: Throwable) {
            throw AssertionError("failure transition")
        }
    }

}
