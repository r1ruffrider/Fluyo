package com.fluyo.app

import android.content.pm.ActivityInfo
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.filters.SdkSuppress
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Direction
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiObject2
import androidx.test.uiautomator.Until
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@SdkSuppress(maxSdkVersion = 36)
class FoundationResponsiveDeviceTest {
    @get:Rule val activityRule = ActivityScenarioRule(MainActivity::class.java)
    private val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
    private var changedFontScale = false
    private var changedOrientation = false

    @After fun restoreRuntimeSettings() {
        if (changedFontScale) device.executeShellCommand("settings put system font_scale 1.0")
        if (changedOrientation) {
            activityRule.scenario.onActivity {
                it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            }
        }
    }

    private fun waitForNode(tag: String, scroll: Boolean = false): UiObject2 {
        repeat(8) {
            device.wait(Until.findObject(By.res(tag)), 1_500)?.let { node ->
                val bounds = node.visibleBounds
                if (bounds.width() > 0 && bounds.height() > 0) return node
            }
            if (scroll) {
                device.wait(Until.findObject(By.res("foundation-scroll")), 1_000)
                    ?.scroll(Direction.DOWN, 0.8f)
            }
            device.waitForIdle()
        }
        throw AssertionError("node missing")
    }

    private fun waitForFontScale(expected: Float) {
        repeat(20) {
            var applied = false
            activityRule.scenario.onActivity { activity ->
                applied = activity.resources.configuration.fontScale >= expected
            }
            if (applied) return
            Thread.sleep(250)
        }
        throw AssertionError("font scale")
    }

    private fun waitForSystemFontScaleSetting(expected: Float) {
        repeat(20) {
            val current = device.executeShellCommand("settings get system font_scale")
                .trim()
                .toFloatOrNull()
            if (current != null && current >= expected) return
            Thread.sleep(250)
        }
        throw AssertionError("font scale")
    }

    @Test fun twoHundredPercentFontKeepsThePrimaryActionReachable() {
        changedFontScale = true
        device.executeShellCommand("settings put system font_scale 2.0")
        waitForSystemFontScaleSetting(1.9f)
        activityRule.scenario.recreate()
        waitForFontScale(1.9f)
        waitForNode("signed-out-state")
        waitForNode("review-build-button", scroll = true)
    }

    @Test fun resizePreservesTheNewestStateAcrossWindowClasses() {
        changedOrientation = true
        activityRule.scenario.onActivity {
            it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        }
        activityRule.scenario.recreate()
        waitForNode("signed-out-state")
        val action = waitForNode("review-build-button", scroll = true)
        assertTrue(action.visibleBounds.width() > 0 && action.visibleBounds.height() > 0)
    }
}
