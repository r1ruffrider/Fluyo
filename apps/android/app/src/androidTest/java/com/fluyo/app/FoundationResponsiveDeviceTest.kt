package com.fluyo.app

import android.content.pm.ActivityInfo
import androidx.test.core.app.ActivityScenario
import androidx.test.filters.SdkSuppress
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Direction
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiObject2
import androidx.test.uiautomator.Until
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Test

@SdkSuppress(maxSdkVersion = 36)
class FoundationResponsiveDeviceTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext
    private val device = UiDevice.getInstance(instrumentation)
    private var activeScenario: ActivityScenario<MainActivity>? = null
    private var changedFontScale = false
    private var changedOrientation = false

    @After fun restoreRuntimeSettings() {
        var cleanupFailed = false
        if (changedOrientation) {
            try {
                activeScenario?.onActivity {
                    it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                }
            } catch (_: Throwable) {
                cleanupFailed = true
            }
        }
        try {
            activeScenario?.close()
        } catch (_: Throwable) {
            cleanupFailed = true
        }
        activeScenario = null
        if (changedFontScale) {
            try {
                device.executeShellCommand("settings put system font_scale 1.0")
            } catch (_: Throwable) {
                cleanupFailed = true
            }
        }
        if (cleanupFailed) throw AssertionError("runtime cleanup")
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

    private fun waitForSystemFontScale(expected: Float) {
        repeat(20) {
            val applied = device.executeShellCommand("settings get system font_scale")
                .trim()
                .toFloatOrNull()
            if (applied != null && applied >= expected) return
            Thread.sleep(250)
        }
        throw AssertionError("font scale")
    }

    private fun launchFoundationAtAppliedFontScale() {
        val packageName = context.packageName
        try {
            device.wakeUp()
            device.executeShellCommand("wm dismiss-keyguard")
            val scenario =
                ActivityScenario.launch(MainActivity::class.java).also { activeScenario = it }
            scenario.onActivity { }
            check(device.wait(Until.hasObject(By.pkg(packageName).depth(0)), 5_000))
        } catch (_: Throwable) {
            throw AssertionError("runtime launch")
        }
    }

    @Test fun twoHundredPercentFontKeepsThePrimaryActionReachable() {
        changedFontScale = true
        device.executeShellCommand("settings put system font_scale 2.0")
        waitForSystemFontScale(1.9f)
        launchFoundationAtAppliedFontScale()
        waitForNode("signed-out-state")
        waitForNode("review-build-button", scroll = true)
    }

    @Test fun resizePreservesTheNewestStateAcrossWindowClasses() {
        changedOrientation = true
        val scenario = ActivityScenario.launch(MainActivity::class.java).also { activeScenario = it }
        scenario.onActivity {
            it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        }
        scenario.recreate()
        waitForNode("signed-out-state")
        val action = waitForNode("review-build-button", scroll = true)
        assertTrue(action.visibleBounds.width() > 0 && action.visibleBounds.height() > 0)
    }
}
