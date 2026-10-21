package com.fluyo.app

import android.app.LocaleManager
import android.content.pm.ActivityInfo
import android.os.LocaleList
import android.os.SystemClock
import android.view.KeyEvent
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.filters.SdkSuppress
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Direction
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiObject2
import androidx.test.uiautomator.Until
import org.junit.After
import org.junit.Before
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@SdkSuppress(minSdkVersion = 37)
class CurrentRuntimeFoundationTest {
    @get:Rule val activityRule = ActivityScenarioRule(MainActivity::class.java)
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext
    private val device = UiDevice.getInstance(instrumentation)
    private var changedLocale = false
    private var changedOrientation = false
    private var changedFontScale = false
    private var changedMotionScale = false
    private var changedWindowSize = false
    private val scenario get() = activityRule.scenario

    @Before fun launchFoundation() {
        try {
            device.wakeUp()
            device.executeShellCommand("wm dismiss-keyguard")
            scenario.onActivity { }
        } catch (_: Throwable) {
            throw AssertionError("runtime launch")
        }
    }

    @After fun restoreRuntimeSettings() {
        try {
            if (changedLocale) {
                context.getSystemService(LocaleManager::class.java).applicationLocales =
                    LocaleList.getEmptyLocaleList()
            }
            if (changedOrientation) {
                scenario.onActivity {
                    it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                }
            }
            if (changedFontScale) {
                device.executeShellCommand("settings put system font_scale 1.0")
            }
            if (changedMotionScale) {
                device.executeShellCommand("settings put global animator_duration_scale 1")
                device.executeShellCommand("settings put global transition_animation_scale 1")
                device.executeShellCommand("settings put global window_animation_scale 1")
            }
            if (changedWindowSize) {
                device.executeShellCommand("wm size reset")
            }
        } catch (_: Throwable) {
            throw AssertionError("runtime cleanup")
        }
    }

    private fun expectedStateTag() =
        if (BuildConfig.FLUYO_ENVIRONMENT == "production") "error-state" else "signed-out-state"

    private fun unexpectedStateTag() =
        if (BuildConfig.FLUYO_ENVIRONMENT == "production") "signed-out-state" else "error-state"

    private fun expectedActionTag() =
        if (BuildConfig.FLUYO_ENVIRONMENT == "production") "retry-button" else "review-build-button"

    private fun recreateFoundation() {
        device.wakeUp()
        device.executeShellCommand("wm dismiss-keyguard")
        scenario.recreate()
    }

    private fun waitForSystemFontScale(minimum: Float) {
        repeat(20) {
            val scale =
                device.executeShellCommand("settings get system font_scale").trim().toFloatOrNull()
            if (scale != null && scale >= minimum) return
            SystemClock.sleep(250)
        }
        throw AssertionError("font scale")
    }

    private fun waitForLandscapeDisplay() {
        repeat(20) {
            if (device.displayWidth > device.displayHeight) return
            SystemClock.sleep(250)
        }
        throw AssertionError("runtime launch")
    }

    private fun waitForApplicationLocale(languageTag: String) {
        repeat(20) {
            val locales = context.getSystemService(LocaleManager::class.java).applicationLocales
            if (!locales.isEmpty && locales[0].toLanguageTag().equals(languageTag, ignoreCase = true)) {
                return
            }
            SystemClock.sleep(250)
        }
        throw AssertionError("runtime launch")
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

    private fun focusActionWithKeyboard(): UiObject2 {
        repeat(4) {
            val action = waitForNode(expectedActionTag(), scroll = true)
            if (action.isFocused) return action
            device.pressKeyCode(KeyEvent.KEYCODE_TAB)
            device.waitForIdle()
        }
        throw AssertionError("keyboard focus")
    }

    @Test fun currentRuntimeLaunchHasOneHonestEndState() {
        try {
            waitForNode(expectedStateTag())
        } catch (_: Throwable) {
            throw AssertionError("state missing")
        }
        try {
            assertTrue(device.findObject(By.res("loading-state")) == null)
        } catch (_: Throwable) {
            throw AssertionError("loading present")
        }
        try {
            assertTrue(device.findObject(By.res(unexpectedStateTag())) == null)
        } catch (_: Throwable) {
            throw AssertionError("unexpected state")
        }
    }

    @Test fun currentRuntimeLargeTextAndLandscapeKeepActionReachable() {
        changedFontScale = true
        device.executeShellCommand("settings put system font_scale 2.0")
        waitForSystemFontScale(1.9f)
        changedOrientation = true
        scenario.onActivity {
            it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        }
        waitForLandscapeDisplay()
        try {
            scenario.onActivity { }
            waitForNode(expectedStateTag())
            waitForNode(expectedActionTag(), scroll = true)
        } catch (_: Throwable) {
            throw AssertionError("node missing")
        }
    }

    @Test fun currentRuntimeReducedMotionKeepsTheSameEndState() {
        changedMotionScale = true
        device.executeShellCommand("settings put global animator_duration_scale 0")
        device.executeShellCommand("settings put global transition_animation_scale 0")
        device.executeShellCommand("settings put global window_animation_scale 0")
        recreateFoundation()
        waitForNode(expectedStateTag())
        waitForNode(expectedActionTag(), scroll = true)
    }

    @Test fun currentRuntimeActionRemainsLocalAndHonest() {
        recreateFoundation()
        val action = waitForNode(expectedActionTag(), scroll = true)
        action.click()
        if (BuildConfig.FLUYO_ENVIRONMENT != "production") {
            waitForNode("scope-detail", scroll = true)
        } else {
            waitForNode("error-state")
        }
    }

    @Test fun currentRuntimePseudoLocaleExpansionKeepsActionReachable() {
        changedLocale = true
        context.getSystemService(LocaleManager::class.java).applicationLocales =
            LocaleList.forLanguageTags("en-XA")
        waitForApplicationLocale("en-XA")
        try {
            scenario.onActivity { }
            waitForNode(expectedStateTag())
            waitForNode(expectedActionTag(), scroll = true)
        } catch (_: Throwable) {
            throw AssertionError("node missing")
        }
    }

    @Test fun currentRuntimeKeyboardAndDpadReachActionInLogicalOrder() {
        recreateFoundation()
        focusActionWithKeyboard()
        device.pressDPadCenter()
        if (BuildConfig.FLUYO_ENVIRONMENT != "production") {
            waitForNode("scope-detail", scroll = true)
        } else {
            waitForNode("error-state")
        }
    }

    @Test fun currentRuntimeAdaptiveWindowsKeepStateAndActionReachable() {
        changedWindowSize = true
        listOf("1200x2200", "2400x2200", "3000x2200").forEach { size ->
            device.executeShellCommand("wm size $size")
            recreateFoundation()
            waitForNode(expectedStateTag())
            waitForNode(expectedActionTag(), scroll = true)
        }
    }
}
