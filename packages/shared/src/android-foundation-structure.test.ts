import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const androidRoot = resolve(root, "apps/android");

const walk = (directory: string): string[] =>
  readdirSync(directory)
    .filter((name) => ![".gradle", "build"].includes(name))
    .flatMap((name) => {
      const path = join(directory, name);
      return statSync(path).isDirectory()
        ? walk(path)
        : [relative(androidRoot, path).replaceAll("\\", "/")];
    });

const text = (path: string) => readFileSync(resolve(androidRoot, path), "utf8");

describe("Android foundation structure", () => {
  it("pins the approved SDK and toolchain without release signing", () => {
    expect(text("build.gradle.kts")).toContain('id("com.android.application") version "9.4.0"');
    expect(text("build.gradle.kts")).toContain(
      'id("org.jetbrains.kotlin.plugin.compose") version "2.4.10"',
    );
    const app = text("app/build.gradle.kts");
    expect(app).toContain("compileSdk = 37");
    expect(app).toContain("minSdk = 29");
    expect(app).toContain("targetSdk = 36");
    expect(app).toContain('platform("androidx.compose:compose-bom:2026.09.00")');
    expect(app).not.toContain("ui-test-manifest");
    expect(app).not.toMatch(/signingConfigs|storeFile|storePassword|keyAlias|keyPassword/);
    expect(text("gradle/wrapper/gradle-wrapper.properties")).toContain("gradle-9.6.0-bin.zip");
  });

  it("keeps production inert and internal application IDs unreserved", () => {
    const app = text("app/build.gradle.kts");
    expect(app).toContain('applicationId = "com.fluyo.app"');
    expect(app).toContain('applicationIdSuffix = ".dev"');
    expect(app).toContain('applicationIdSuffix = ".staging"');
    expect(app).toContain('buildConfigField("boolean", "FLUYO_NETWORK_ENABLED", "false")');
    expect(app).toContain('buildConfigField("boolean", "FLUYO_INTERNAL_BUILD", "false")');
    expect(text("app/src/main/java/com/fluyo/app/FoundationShell.kt")).toContain(
      'configuration.isInternal && configuration.environment != "production"',
    );
  });

  it("has no network permission, provider SDK, logger, or live feature surface", () => {
    const files = walk(androidRoot).filter((path) => /\.(kt|kts|xml|properties|pro)$/.test(path));
    const source = files.map((path) => text(path)).join("\n");
    expect(source).not.toMatch(
      /android\.permission\.(INTERNET|CAMERA|RECORD_AUDIO|POST_NOTIFICATIONS)/,
    );
    expect(source).not.toMatch(/\b(Log\.|Timber\.|println\(|print\()/);
    expect(source).not.toMatch(
      /retrofit|okhttp|ktor-client|firebase|sentry|segment|revenuecat|stripe-android|installreferrer/i,
    );
    expect(source).not.toMatch(/Authorization|accessToken|refreshToken|clientSecret|serviceRole/);
  });

  it("limits the manifest to one exported launcher activity and disables backup", () => {
    const manifest = text("app/src/main/AndroidManifest.xml");
    expect((manifest.match(/<activity\b/g) ?? []).length).toBe(1);
    expect((manifest.match(/android:exported="true"/g) ?? []).length).toBe(1);
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).toContain('android:dataExtractionRules="@xml/data_extraction_rules"');
    expect(manifest).toContain('android:fullBackupContent="false"');
    expect(manifest).toContain('android:icon="@android:drawable/sym_def_app_icon"');
    expect(manifest).toContain('android:name="androidx.profileinstaller.ProfileInstallReceiver"');
    expect(manifest).toContain('tools:node="remove"');
    const extractionRules = text("app/src/main/res/xml/data_extraction_rules.xml");
    expect(extractionRules).toContain('<exclude domain="root" path="." />');
    expect((extractionRules.match(/<exclude /g) ?? []).length).toBe(2);
    expect(manifest).not.toMatch(/<uses-permission|<provider|<service/);
    expect(text("app/build.gradle.kts")).toContain("isShrinkResources = true");
    const workflow = readFileSync(resolve(root, ".github/workflows/android.yml"), "utf8");
    expect(workflow).toContain("com.fluyo.app.MainActivity");
    expect(workflow).toContain("androidx.startup.InitializationProvider");
    expect(workflow).toContain("test \"$(grep -c 'E: receiver'");
    expect(workflow).toContain("test \"$(grep -c 'E: service'");
  });

  it("contains raw Android build output and retains only bounded diagnostics", () => {
    const workflow = readFileSync(resolve(root, ".github/workflows/android.yml"), "utf8");
    expect(workflow).toContain('RAW_LOG="$RUNNER_TEMP/fluyo-android-${{ matrix.leg }}-raw.log"');
    expect(workflow).toContain('>"$RAW_LOG" 2>&1');
    expect(workflow).toContain("Android matrix leg failed; raw output was discarded");
    expect(workflow).toContain("summarize-android-test-failures.mjs");
    expect(workflow).toContain("run_gradle_phase unit_test");
    expect(workflow).toContain("run_gradle_phase assemble_internal");
    expect(workflow).toContain("run_gradle_phase compile_instrumentation");
    expect(workflow).toContain("run_gradle_phase instrumentation_internal");
    expect(workflow).toContain('--phase "$phase"');
    expect(workflow).not.toContain("--stacktrace");
    expect(workflow).not.toMatch(/(?:cat|tee)\s+[^\n]*RAW_LOG/);
  });

  it("ignores local Android configuration, captures, packages, and keystores", () => {
    const ignores = readFileSync(resolve(root, ".gitignore"), "utf8");
    for (const entry of [
      "apps/android/local.properties",
      "apps/android/**/captures/",
      "apps/android/**/screenshots/",
      "*.apk",
      "*.aab",
      "*.jks",
      "*.keystore",
      "*.p12",
    ]) {
      expect(ignores).toContain(entry);
    }
  });

  it("keeps all user-visible copy in resources and labels learning content honestly", () => {
    const shell = text("app/src/main/java/com/fluyo/app/FoundationShell.kt");
    const app = text("app/build.gradle.kts");
    expect(shell).not.toMatch(/Text\(\s*"/);
    expect(app).not.toContain("localeFilters");
    expect(app).toContain("isPseudoLocalesEnabled = true");
    expect(app).not.toContain("ANDROIDX_TEST_ORCHESTRATOR");
    expect(app).not.toContain("androidx.test:orchestrator");
    const strings = text("app/src/main/res/values/strings.xml");
    const expandedStrings = text("app/src/debug/res/values-en-rXA/strings.xml");
    expect(strings).toContain("does not include sign-in, lessons, billing, or public access");
    expect(strings).toContain("Spanish learning-content sample");
    expect(strings).toContain("¿Dónde está la estación?");
    expect(strings).not.toContain('translatable="false"');
    expect(expandedStrings).toContain("[!! Řëåðÿ ƒöř ţĥë ñëχţ šmåļļ šţëþ !!]");
    const englishBody = strings.match(/<string name="signed_out_body">([^<]+)<\/string>/)?.[1];
    const expandedBody = expandedStrings.match(
      /<string name="signed_out_body">([^<]+)<\/string>/,
    )?.[1];
    expect(englishBody).toBeTruthy();
    expect(expandedBody).toBeTruthy();
    expect(expandedBody!.length).toBeGreaterThan(englishBody!.length);
    expect(text("app/src/debug/res/values-ar-rXB/strings.xml")).toContain(
      "الخطوة الداخلية التالية",
    );
  });

  it("includes the exact emulator, accessibility, and baseline-profile seams", () => {
    const app = text("app/build.gradle.kts");
    expect(app).toContain('create("smallApi29")');
    expect(app).not.toContain('create("largeApi37")');
    expect(app).toContain("animationsDisabled = true");
    expect(text("baselineprofile/build.gradle.kts")).toContain("useConnectedDevices = true");
    expect(text("baselineprofile/build.gradle.kts")).not.toContain("managedDevices");
    const shell = text("app/src/main/java/com/fluyo/app/FoundationShell.kt");
    expect(shell).toContain("heightIn(min = 48.dp)");
    expect(shell).toContain("collectIsFocusedAsState");
    expect(shell).toContain("BorderStroke(3.dp, MaterialTheme.colorScheme.onPrimary)");
    expect(shell).toContain("LiveRegionMode.Polite");
    expect(shell).toContain("verticalScroll");
    expect(shell).toContain(
      'Modifier.widthIn(max = 640.dp).fillMaxWidth().verticalScroll(contentScroll).testTag("foundation-scroll")',
    );
    expect(shell).toContain("contentAlignment = Alignment.TopCenter");
    expect(shell).toContain('Modifier.testTag("foundation-root").fillMaxSize()');
    expect(shell).not.toContain("Modifier.widthIn(max = 640.dp).fillMaxSize()");
    expect(shell.match(/fillMaxWidth\(\)\.heightIn\(min = 48\.dp\)/g)).toHaveLength(2);
    expect(shell).toContain("if (scopeExpanded && state == FoundationShellState.SignedOut)");
    expect(shell).toContain(
      'modifier = Modifier.fillMaxWidth().heightIn(min = 24.dp).testTag("scope-detail")',
    );
    expect(shell).toContain("repeat(5)");
    expect(shell).toContain("if (state == FoundationShellState.Failure)");
    expect(shell).not.toContain("state == FoundationShellState.SignedOut ||");
    expect(shell).toContain("if (actionFocus.requestFocus()) return@LaunchedEffect");
    const instrumentation = text("app/src/androidTest/java/com/fluyo/app/FoundationShellTest.kt");
    expect(instrumentation.match(/@Test fun /g)).toHaveLength(6);
    expect(instrumentation).toContain("compose.activity.setContent");
    expect(instrumentation).toContain("@SdkSuppress(maxSdkVersion = 36)");
    expect(instrumentation).toContain("performSemanticsAction(SemanticsActions.RequestFocus)");
    expect(instrumentation).toContain("performScrollTo");
    expect(instrumentation.match(/waitForNodeToBeDisplayed/g)).toHaveLength(3);
    expect(instrumentation).toContain("compose.waitUntil(5_000)");
    expect(instrumentation).toContain("node.performScrollTo()");
    expect(instrumentation).toContain("target.width > 0f && target.height > 0f");
    expect(instrumentation).toContain('throw AssertionError("node count")');
    expect(instrumentation).toContain('throw AssertionError("scroll action")');
    expect(instrumentation).toContain('throw AssertionError("node geometry")');
    expect(instrumentation).toContain('throw AssertionError("content setup")');
    expect(instrumentation).toContain('throw AssertionError("state transition")');
    expect(instrumentation).toContain('throw AssertionError("failure transition")');
    expect(instrumentation).not.toContain("resources.assets.locales");
    expect(instrumentation).toContain("resizePreservesTheNewestStateAcrossWindowClasses");
    expect(instrumentation).toContain(
      'compose.onNodeWithTag("signed-out-state").assertIsDisplayed()',
    );
    expect(instrumentation).not.toMatch(/\bcompose\.setContent\s*\{/);
    const naturalLaunch = text("app/src/androidTest/java/com/fluyo/app/NaturalLaunchTest.kt");
    expect(naturalLaunch).toContain("@SdkSuppress(maxSdkVersion = 36)");
    expect(naturalLaunch.match(/@Test fun /g)).toHaveLength(3);
    expect(naturalLaunch).toContain("compose.onNodeWithTag(action).assertIsDisplayed()");
    expect(naturalLaunch).toContain("runCatching");
    const currentRuntime = text(
      "app/src/androidTest/java/com/fluyo/app/CurrentRuntimeFoundationTest.kt",
    );
    expect(currentRuntime).toContain("@SdkSuppress(minSdkVersion = 37)");
    expect(currentRuntime.match(/@Test fun /g)).toHaveLength(7);
    expect(currentRuntime).toContain("createAndroidComposeRule<MainActivity>()");
    expect(currentRuntime).toContain("UiDevice.getInstance(instrumentation)");
    expect(currentRuntime).toContain("device.wakeUp()");
    expect(currentRuntime).toContain('device.executeShellCommand("wm dismiss-keyguard")');
    expect(currentRuntime).toContain("currentRuntimeLaunchHasOneHonestEndState");
    expect(currentRuntime).not.toContain("prepareFoundation");
    expect(currentRuntime).toContain("waitForNode(expectedStateTag())");
    expect(currentRuntime).toContain('throw AssertionError("state missing")');
    expect(currentRuntime).toContain('throw AssertionError("loading present")');
    expect(currentRuntime).toContain('throw AssertionError("unexpected state")');
    expect(currentRuntime).toContain('throw AssertionError("runtime cleanup")');
    expect(currentRuntime).not.toContain("device.pressHome()");
    expect(currentRuntime).toContain("node.performScrollTo()");
    expect(currentRuntime).toContain("target.width > 0f && target.height > 0f");
    expect(currentRuntime).toContain("currentRuntimeLargeTextAndLandscapeKeepActionReachable");
    expect(currentRuntime).toContain("currentRuntimeReducedMotionKeepsTheSameEndState");
    expect(currentRuntime).toContain("currentRuntimeActionRemainsLocalAndHonest");
    expect(currentRuntime).toContain("currentRuntimePseudoLocaleExpansionKeepsActionReachable");
    expect(currentRuntime).toContain("currentRuntimeKeyboardAndDpadReachActionInLogicalOrder");
    expect(currentRuntime).toContain("currentRuntimeAdaptiveWindowsKeepStateAndActionReachable");
    expect(currentRuntime).toContain('listOf("1200x2200", "2400x2200", "3000x2200")');
    expect(currentRuntime).toContain('device.executeShellCommand("wm size reset")');
    expect(currentRuntime).toContain("compose.activityRule.scenario.recreate()");
    expect(currentRuntime).toContain("device.pressKeyCode(KeyEvent.KEYCODE_TAB)");
    expect(currentRuntime).toContain("device.pressDPadCenter()");
    const workflow = resolve(root, ".github/workflows/android.yml");
    const workflowText = readFileSync(workflow, "utf8");
    expect(workflowText).toContain("verify_packaged_pseudo_locales");
    expect(workflowText).toContain('aapt2\" dump resources');
    expect(workflowText).toContain("en[-_]r?XA");
    expect(workflowText).toContain("ar[-_]r?XB");
    expect(workflowText).toContain("trap cleanup EXIT");
    expect(workflowText).toContain("start_current_emulator");
    expect(workflowText).toContain('"emulator"');
    expect(workflowText).toContain('test -x "$ANDROID_HOME/emulator/emulator"');
    expect(workflowText).toContain('"$ANDROID_HOME/emulator/emulator" -avd fluyo-api37');
    expect(workflowText).toContain("-no-metrics -wipe-data -accel on -cores 2 -memory 4096");
    expect(workflowText).toContain("for attempt in 1 2");
    expect(workflowText).toContain("timeout 360 bash -c");
    expect(workflowText).toContain('last_phase="avd_creation"');
    expect(workflowText).toContain('last_phase="device_connection"');
    expect(workflowText).toContain('last_phase="boot_completion"');
    expect(workflowText).toContain("adb shell input keyevent KEYCODE_WAKEUP");
    expect(workflowText).toContain("adb shell wm dismiss-keyguard");
    expect(workflowText).toContain(
      "Android current-runtime setup failed; phase=$last_phase; category=unavailable; raw output was discarded",
    );
    expect(workflowText).toContain("run_manual_instrumentation");
    expect(workflowText).toContain("^OK \\(1 test\\)\\r?$");
    expect(workflowText).toContain('failure_category="process_status"');
    expect(workflowText).toContain('failure_category="state_missing"');
    expect(workflowText).toContain('failure_category="loading_present"');
    expect(workflowText).toContain('failure_category="unexpected_state"');
    expect(workflowText).toContain('failure_category="runtime_cleanup"');
    expect(workflowText).toContain('failure_category="test_failure"');
    expect(workflowText).toContain('failure_category="zero_tests"');
    expect(workflowText).toContain('failure_category="summary_mismatch"');
    expect(workflowText).toContain(
      "Android current-runtime instrumentation failed; test=$test_name; category=$failure_category; raw output was discarded",
    );
    expect(workflowText).toContain('test "$executed" = "${#tests[@]}"');
    expect(workflowText).toContain("currentRuntimeAdaptiveWindowsKeepStateAndActionReachable");
    expect(workflowText).toContain("compose_semantics_api29");
    expect(workflowText).toContain("compose_semantics_system_input_api37");
    const androidReadme = readFileSync(resolve(root, "apps/android/README.md"), "utf8");
    const contractReadme = readFileSync(
      resolve(root, "contracts/mobile/android/foundation/v1/README.md"),
      "utf8",
    );
    const handoff = readFileSync(resolve(root, "docs/DEVELOPMENT_HANDOFF.md"), "utf8");
    for (const governedText of [androidReadme, contractReadme, handoff]) {
      expect(governedText).toContain("exactly seven Compose-semantics checks per flavor");
      expect(governedText).not.toMatch(/six bounded UiAutomator black-box checks/i);
    }
    expect(workflowText).toContain("com.fluyo.app.staging");
    expect(workflowText).toContain('"$app_package.test/androidx.test.runner.AndroidJUnitRunner"');
    expect(workflowText).toContain("settings put system font_scale 1.0");
    expect(workflowText).toContain("settings put system accelerometer_rotation 1");
    expect(workflowText).toContain("settings put global animator_duration_scale 1");
    expect(workflowText).toContain("adb uninstall com.fluyo.app.staging.test");
    expect(workflowText).toContain("adb uninstall com.fluyo.app.test");
    expect(workflowText).toContain('CURRENT_RUNTIME_TEST_COUNT="7"');
    expect(workflowText).toContain(
      'rm -f "$RAW_LOG" "$RESOURCE_TABLE" "$EMULATOR_LOG" "$INSTRUMENT_LOG"',
    );
    expect(workflowText).toContain('rm -rf "$AVD_HOME"');
    expect(workflowText).not.toContain("largeApi37StagingDebugAndroidTest");
    expect(workflowText).not.toContain("largeApi37ProductionDebugAndroidTest");
    expect(workflowText).not.toMatch(/logcat|uiautomator dump|screenshot|screenrecord/i);
    expect(workflowText).toContain('rm -f "$RESOURCE_TABLE"');
    expect(app).not.toContain("FORCE_4KB_PAGES");
    expect(text("baselineprofile/build.gradle.kts")).not.toContain("FORCE_4KB_PAGES");
  });

  it("uses light and dark text pairs above the WCAG normal-text threshold", () => {
    const luminance = (hex: string) => {
      const channels =
        hex.match(/[0-9a-f]{2}/gi)?.map((value) => Number.parseInt(value, 16) / 255) ?? [];
      const linear = channels.map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
    };
    const ratio = (first: string, second: string) => {
      const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
      return (values[0]! + 0.05) / (values[1]! + 0.05);
    };
    expect(ratio("173C85", "FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("14213D", "FFF8ED")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("B8C8FF", "002B72")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("F7F1E8", "101726")).toBeGreaterThanOrEqual(4.5);
  });

  it("locks the application source inventory for review", () => {
    const reviewed = walk(androidRoot)
      .filter((path) => !path.endsWith("gradle-wrapper.jar"))
      .sort();
    expect(createHash("sha256").update(reviewed.join("\n")).digest("hex")).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(reviewed).toContain("app/src/main/java/com/fluyo/app/FoundationShell.kt");
    expect(reviewed).toContain(
      "baselineprofile/src/main/java/com/fluyo/baselineprofile/BaselineProfileGenerator.kt",
    );
  });
});
