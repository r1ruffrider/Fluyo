package com.fluyo.app

import android.app.LocaleManager
import android.os.LocaleList
import android.view.KeyEvent
import androidx.test.filters.SdkSuppress
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiObject2
import androidx.test.uiautomator.Until
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@SdkSuppress(minSdkVersion = 37)
class CurrentRuntimeFoundationTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext
    private val device = UiDevice.getInstance(instrumentation)

    @Before fun resetRuntimeSettings() {
        context.getSystemService(LocaleManager::class.java).applicationLocales =
            LocaleList.getEmptyLocaleList()
        device.setOrientationNatural()
        device.executeShellCommand("settings put system font_scale 1.0")
        device.executeShellCommand("settings put global animator_duration_scale 1")
        device.executeShellCommand("settings put global transition_animation_scale 1")
        device.executeShellCommand("settings put global window_animation_scale 1")
        device.executeShellCommand("wm size reset")
    }

    @After fun restoreRuntimeSettings() {
        resetRuntimeSettings()
        device.pressHome()
    }

    private fun launchFoundation() {
        device.wakeUp()
        device.executeShellCommand("wm dismiss-keyguard")
        device.executeShellCommand("am force-stop ${context.packageName}")
        device.executeShellCommand(
            "am start -W -n ${context.packageName}/${MainActivity::class.java.name}",
        )
        assertTrue(
            device.wait(Until.hasObject(By.pkg(context.packageName)), 5_000),
        )
        device.waitForIdle()
    }

    private fun expectedTitle() = if (BuildConfig.FLUYO_ENVIRONMENT == "production") {
        context.getString(R.string.error_title)
    } else {
        context.getString(R.string.signed_out_title)
    }

    private fun expectedAction() = if (BuildConfig.FLUYO_ENVIRONMENT == "production") {
        context.getString(R.string.retry_action)
    } else {
        context.getString(R.string.review_scope_action)
    }

    private fun expectedBody() = if (BuildConfig.FLUYO_ENVIRONMENT == "production") {
        context.getString(R.string.error_body)
    } else {
        context.getString(R.string.signed_out_body)
    }

    private fun waitForText(value: String): UiObject2 {
        repeat(10) {
            device.wait(Until.findObject(By.text(value)), 1_000)?.let { return it }
            device.swipe(
                device.displayWidth / 2,
                device.displayHeight * 3 / 4,
                device.displayWidth / 2,
                device.displayHeight / 4,
                12,
            )
        }
        val node = device.findObject(By.text(value))
        assertNotNull(node)
        return node
    }

    @Test fun currentRuntimeLaunchHasOneHonestEndState() {
        launchFoundation()
        waitForText(expectedTitle())
        assertFalse(device.hasObject(By.text(context.getString(R.string.loading_title))))
        val unexpected = if (BuildConfig.FLUYO_ENVIRONMENT == "production") {
            context.getString(R.string.signed_out_title)
        } else {
            context.getString(R.string.error_title)
        }
        assertFalse(device.hasObject(By.text(unexpected)))
    }

    @Test fun currentRuntimeLargeTextAndLandscapeKeepActionReachable() {
        device.executeShellCommand("settings put system font_scale 2.0")
        device.setOrientationLeft()
        launchFoundation()
        assertTrue(waitForText(expectedAction()).visibleBounds.height() > 0)
    }

    @Test fun currentRuntimeReducedMotionKeepsTheSameEndState() {
        device.executeShellCommand("settings put global animator_duration_scale 0")
        device.executeShellCommand("settings put global transition_animation_scale 0")
        device.executeShellCommand("settings put global window_animation_scale 0")
        launchFoundation()
        waitForText(expectedTitle())
        waitForText(expectedAction())
    }

    @Test fun currentRuntimeActionRemainsLocalAndHonest() {
        launchFoundation()
        val action = waitForText(expectedAction())
        action.click()
        if (BuildConfig.FLUYO_ENVIRONMENT != "production") {
            waitForText(context.getString(R.string.scope_detail))
        } else {
            waitForText(context.getString(R.string.error_title))
        }
    }

    @Test fun currentRuntimePseudoLocaleExpansionKeepsActionReachable() {
        context.getSystemService(LocaleManager::class.java).applicationLocales =
            LocaleList.forLanguageTags("en-XA")
        launchFoundation()
        val title = waitForText(expectedTitle())
        val body = waitForText(expectedBody())
        val action = waitForText(expectedAction())
        assertTrue(title.visibleBounds.height() > 0)
        assertTrue(body.visibleBounds.height() > 0)
        assertTrue(action.visibleBounds.height() > 0)
        assertTrue(title.visibleBounds.bottom <= body.visibleBounds.top)
        assertTrue(body.visibleBounds.bottom <= action.visibleBounds.top)
    }

    @Test fun currentRuntimeKeyboardAndDpadReachActionInLogicalOrder() {
        launchFoundation()
        val action = waitForText(expectedAction())
        if (BuildConfig.FLUYO_ENVIRONMENT == "production") {
            assertTrue(action.isFocused)
        } else {
            assertFalse(action.isFocused)
            device.pressKeyCode(KeyEvent.KEYCODE_TAB)
        }
        assertTrue(device.findObject(By.text(expectedAction()))?.isFocused == true)
        device.pressDPadCenter()
        if (BuildConfig.FLUYO_ENVIRONMENT != "production") {
            waitForText(context.getString(R.string.scope_detail))
        } else {
            waitForText(context.getString(R.string.error_title))
        }
    }

    @Test fun currentRuntimeExpandedWindowKeepsStateAndActionReachable() {
        device.executeShellCommand("wm size 3000x2200")
        launchFoundation()
        waitForText(expectedTitle())
        val action = waitForText(expectedAction())
        assertTrue(action.visibleBounds.width() > 0)
        assertTrue(action.visibleBounds.height() > 0)
    }
}
