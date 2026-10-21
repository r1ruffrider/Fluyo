package com.fluyo.app

import android.content.pm.ActivityInfo
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.filters.SdkSuppress
import org.junit.After
import org.junit.Rule
import org.junit.Test

@SdkSuppress(maxSdkVersion = 36)
class NaturalLaunchTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    @After fun resetOrientation() {
        compose.activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    }

    @Test fun naturalFlavorLaunchResolvesToTheOnlyAllowedEndState() {
        val expected = if (BuildConfig.FLUYO_ENVIRONMENT == "production") "error-state" else "signed-out-state"
        compose.waitUntil(5_000) { compose.onAllNodesWithTag(expected).fetchSemanticsNodes().size == 1 }
        compose.onNodeWithTag(expected).assertIsDisplayed()
        compose.onAllNodesWithTag("loading-state").assertCountEquals(0)
        if (BuildConfig.FLUYO_ENVIRONMENT == "production") {
            compose.onAllNodesWithTag("internal-build-marker").assertCountEquals(0)
        } else {
            compose.onNodeWithTag("internal-build-marker").assertIsDisplayed()
            compose.onAllNodesWithTag("error-state").assertCountEquals(0)
        }
    }

    @Test fun landscapeRecreationPreservesAReachableAction() {
        compose.activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        val action = if (BuildConfig.FLUYO_ENVIRONMENT == "production") "retry-button" else "review-build-button"
        compose.waitUntil(5_000) { compose.onAllNodesWithTag(action).fetchSemanticsNodes().size == 1 }
        compose.onNodeWithTag(action).assertIsDisplayed()
    }

    @Test fun systemAnimationScaleZeroKeepsTheSameSemanticEndState() {
        val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
        automation.executeShellCommand("settings put global animator_duration_scale 0").close()
        automation.executeShellCommand("settings put global transition_animation_scale 0").close()
        automation.executeShellCommand("settings put global window_animation_scale 0").close()
        val expected = if (BuildConfig.FLUYO_ENVIRONMENT == "production") "error-state" else "signed-out-state"
        compose.waitUntil(5_000) { compose.onAllNodesWithTag(expected).fetchSemanticsNodes().size == 1 }
        compose.onNodeWithTag(expected).assertIsDisplayed()
    }
}
