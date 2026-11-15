import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const expectedIosFiles = [
  "Config/Base.xcconfig",
  "Config/Debug.xcconfig",
  "Config/Release.xcconfig",
  "Config/Staging.xcconfig",
  "Fluyo.xcodeproj/project.pbxproj",
  "Fluyo.xcodeproj/xcshareddata/xcschemes/Fluyo.xcscheme",
  "Fluyo/AppConfiguration.swift",
  "Fluyo/AuthRuntimeKernel.swift",
  "Fluyo/FluyoApp.swift",
  "Fluyo/FoundationShellModel.swift",
  "Fluyo/FoundationShellView.swift",
  "Fluyo/Info.plist",
  "Fluyo/FoundationDesignTokens.swift",
  "Fluyo/FoundationTelemetry.swift",
  "Fluyo/Localizable.xcstrings",
  "Fluyo/PrivacyInfo.xcprivacy",
  "FluyoTests/AppConfigurationTests.swift",
  "FluyoTests/AuthRuntimeKernelTests.swift",
  "FluyoTests/FoundationShellModelTests.swift",
  "FluyoTests/FoundationTelemetryTests.swift",
  "FluyoTests/FoundationDesignTokensTests.swift",
  "FluyoUITests/FoundationShellUITests.swift",
  "README.md",
].sort();

const listFiles = (directory: string, prefix = ""): string[] =>
  readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listFiles(`${directory}/${entry.name}`, relative) : [relative];
  });

describe("iOS unsigned foundation structure", () => {
  it("contains only the reviewed project, source, resource, and test files", () => {
    expect(listFiles("apps/ios").sort()).toEqual(expectedIosFiles);
  });

  it("targets iOS 17 phones with three isolated configurations", () => {
    const base = read("apps/ios/Config/Base.xcconfig");
    const debug = read("apps/ios/Config/Debug.xcconfig");
    const staging = read("apps/ios/Config/Staging.xcconfig");
    const release = read("apps/ios/Config/Release.xcconfig");

    expect(base).toContain("IPHONEOS_DEPLOYMENT_TARGET = 17.0");
    expect(base).toContain("TARGETED_DEVICE_FAMILY = 1");
    expect(base).toContain("SWIFT_VERSION = 6.0");
    expect(debug).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.fluyo.app.dev");
    expect(staging).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.fluyo.app.staging");
    expect(release).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.fluyo.app");
    const project = read("apps/ios/Fluyo.xcodeproj/project.pbxproj");
    expect(project.match(/GENERATE_INFOPLIST_FILE = NO/g)).toHaveLength(3);
    expect(project.match(/INFOPLIST_FILE = Fluyo\/Info\.plist/g)).toHaveLength(3);
  });

  it("keeps development and staging public while release remains inert", () => {
    const debug = read("apps/ios/Config/Debug.xcconfig");
    const staging = read("apps/ios/Config/Staging.xcconfig");
    const release = read("apps/ios/Config/Release.xcconfig");

    for (const configuration of [debug, staging]) {
      expect(configuration).toContain(
        "FLUYO_CONFIGURATION_CLASSIFICATION = public_non_production_only",
      );
      expect(configuration).toContain("FLUYO_NETWORK_ENABLED = YES");
      expect(configuration).toContain("FLUYO_INTERNAL_BUILD = YES");
      expect(configuration).toContain(
        "FLUYO_API_BASE_URL = https:$(FLUYO_URL_SLASH)$(FLUYO_URL_SLASH)api.staging.fluyo.example.test/api/v1",
      );
      expect(configuration).toContain(
        "FLUYO_SUPABASE_URL = https:$(FLUYO_URL_SLASH)$(FLUYO_URL_SLASH)auth.staging.fluyo.example.test",
      );
      expect(configuration).toContain(
        "FLUYO_SUPABASE_PUBLISHABLE_KEY = synthetic_publishable_value",
      );
    }
    expect(release).toContain("FLUYO_CONFIGURATION_CLASSIFICATION = inert_until_release_gate");
    expect(release).toContain("FLUYO_NETWORK_ENABLED = NO");
    expect(release).toContain("FLUYO_INTERNAL_BUILD = NO");
    expect(release).toMatch(/FLUYO_API_BASE_URL =\s*\r?\n/);
    expect(release).toMatch(/FLUYO_SUPABASE_URL =\s*\r?\n/);
    expect(release).toMatch(/FLUYO_SUPABASE_PUBLISHABLE_KEY =\s*\r?\n/);

    const plist = read("apps/ios/Fluyo/Info.plist");
    for (const key of [
      "FluyoAPIBaseURL",
      "FluyoConfigurationClassification",
      "FluyoEnvironment",
      "FluyoInternalBuild",
      "FluyoNetworkEnabled",
      "FluyoSourceCommitShort",
      "FluyoSupabasePublishableKey",
      "FluyoSupabaseURL",
    ]) {
      expect(plist).toContain(`<key>${key}</key>`);
    }
    expect(plist).toContain("<string>$(FLUYO_ENVIRONMENT)</string>");
    expect(plist).toContain("<string>$(FLUYO_API_BASE_URL)</string>");
  });

  it("keeps the initial privacy manifest empty and tracking disabled", () => {
    const manifest = read("apps/ios/Fluyo/PrivacyInfo.xcprivacy");
    expect(manifest).toContain("<key>NSPrivacyTracking</key>");
    expect(manifest).toContain("<false/>");
    expect(manifest).toMatch(/<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/);
    expect(manifest).toMatch(/<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/);
    expect(manifest).toMatch(/<key>NSPrivacyAccessedAPITypes<\/key>\s*<array\/>/);
  });

  it("implements only honest loading, signed-out, and safe failure states", () => {
    const model = read("apps/ios/Fluyo/FoundationShellModel.swift");
    const view = read("apps/ios/Fluyo/FoundationShellView.swift");

    expect(model).toContain("case loading");
    expect(model).toContain('case signedOut = "signed_out"');
    expect(model).toContain("case failure");
    expect(view).toContain("Live sign-in is planned for a later increment");
    expect(view).toContain("No lessons, billing, audio, AI, account recovery, or store features");
    expect(view).toContain(".frame(minHeight: 44)");
    expect(view).not.toContain("ProgressView(");
    expect(view).not.toContain("withAnimation");
  });

  it("uses a typed no-op telemetry sink with a closed event set", () => {
    const telemetry = read("apps/ios/Fluyo/FoundationTelemetry.swift");
    expect(telemetry.match(/case [A-Za-z]+(?: = )?/g)).toHaveLength(17);
    expect(telemetry).toContain("struct NoOpFoundationTelemetrySink");
    expect(telemetry).toContain("async {}");
    expect(telemetry).not.toContain("URLSession");
  });

  it("has unit and UI targets with deterministic accessibility probes", () => {
    const project = read("apps/ios/Fluyo.xcodeproj/project.pbxproj");
    const uiTests = read("apps/ios/FluyoUITests/FoundationShellUITests.swift");
    expect(project).toContain('productType = "com.apple.product-type.bundle.unit-test"');
    expect(project).toContain('productType = "com.apple.product-type.bundle.ui-testing"');
    expect(uiTests).toContain("UICTContentSizeCategoryAccessibilityXXXL");
    expect(uiTests).toContain("UIAccessibilityReduceMotionEnabled");
    expect(uiTests).toContain("NSForceRightToLeftWritingDirection");
    expect(uiTests).toContain("NSDoubleLocalizedStrings");
    expect(uiTests).toContain("testAccessibleNamesAndReadingOrderAreStable");
    expect(uiTests).toContain("testNaturalDebugLaunchRendersAnInternalMarker");
    expect(uiTests).not.toContain('FLUYO_UI_TEST_CONFIGURATION"] = "valid"');
    expect(uiTests).toMatch(
      /testNaturalDebugLaunchRendersAnInternalMarker[\s\S]*signed-out-state"\]\.waitForExistence\(timeout: 15\)[\s\S]*build-marker"\]\.waitForExistence\(timeout: 5\)[\s\S]*XCTAssertFalse\(app\.staticTexts\["error-state"\]\.exists\)/,
    );
    expect(uiTests).not.toContain("assertHittableAfterBoundedScroll");
    expect(uiTests).toMatch(
      /testLandscapeAndLargeTextKeepPrimaryActionVisible[\s\S]*XCTAssertTrue\(app\.buttons\["review-build-button"\]\.isHittable\)/,
    );
    expect(uiTests).toMatch(
      /testLoadingAndErrorRemainUsableInLandscape[\s\S]*XCTAssertTrue\(app\.buttons\["retry-button"\]\.isHittable\)/,
    );
    expect(uiTests).toMatch(
      /override func setUpWithError\(\) throws \{\s*continueAfterFailure = false\s*\}/,
    );
    expect(uiTests).toContain("private func resetOrientation()");
    expect(uiTests).toContain("XCUIDevice.shared.orientation = .portrait");
    expect(uiTests.match(/resetOrientation\(\)/g)).toHaveLength(4);
    for (const stateIdentifier of ["loading-state", "signed-out-state", "error-state"]) {
      expect(uiTests).toContain(`staticTexts["${stateIdentifier}"]`);
      expect(uiTests).not.toContain(`otherElements["${stateIdentifier}"]`);
    }
    expect(uiTests).toContain("XCTAssertGreaterThanOrEqual(button.frame.height, 44)");
  });

  it("isolates every XCTest case on the main actor", () => {
    for (const testFile of [
      "apps/ios/FluyoTests/AppConfigurationTests.swift",
      "apps/ios/FluyoTests/FoundationDesignTokensTests.swift",
      "apps/ios/FluyoTests/FoundationShellModelTests.swift",
      "apps/ios/FluyoTests/FoundationTelemetryTests.swift",
      "apps/ios/FluyoUITests/FoundationShellUITests.swift",
    ]) {
      expect(read(testFile)).toMatch(/@MainActor\s+final class \w+Tests: XCTestCase/);
    }
  });

  it("keeps async completion checks outside Boolean autoclosures", () => {
    const kernelTests = read("apps/ios/FluyoTests/AuthRuntimeKernelTests.swift");
    expect(kernelTests).not.toMatch(/(?:&&|\|\|)[^;\n{}]*\bawait\b/);
    expect(kernelTests).toContain("let sleepSuspended = suspendSleep");
    expect(kernelTests).toContain("if sleepSuspended { pendingCommands = false }");
    expect(kernelTests).toContain("else { pendingCommands = await completions.hasCommands() }");
    expect(kernelTests).toContain(
      "let shouldSuspend = sleepSuspended || pendingCommands || milliseconds == 500",
    );
    expect(kernelTests).toContain("setSuspendSleep");
    expect(kernelTests).toContain('completions.take(["timer_fired"])');
    expect(kernelTests).toContain("setDelayedElapsed");
  });

  it("observes the delayed refresh boundary with one bounded yield helper", () => {
    const kernelTests = read("apps/ios/FluyoTests/AuthRuntimeKernelTests.swift");
    expect(kernelTests).toContain("private let refreshTimerObservationYieldLimit = 64");
    const observationHelper = kernelTests.match(
      /private func observeRefreshTimerHistory\(_ coordinator: AuthRuntimeCoordinator, expectedCount: Int\) async -> \[AuthPresentationEffect\] \{([\s\S]*?)\n    \}\n\n    private func verifyRefreshTimerBoundaries/,
    )?.[1];
    expect(observationHelper).toBeDefined();
    expect(observationHelper).toContain(
      "var lastSnapshot = await coordinator.presentationEffectHistory()",
    );
    expect(observationHelper).toContain("for _ in 0..<refreshTimerObservationYieldLimit {");
    expect(observationHelper!.match(/await Task\.yield\(\)/g)).toHaveLength(1);
    expect(observationHelper!.match(/coordinator\.presentationEffectHistory\(\)/g)).toHaveLength(2);
    expect(
      observationHelper!.match(
        /if lastSnapshot\.count == expectedCount \{ return lastSnapshot \}/g,
      ),
    ).toHaveLength(2);
    expect(observationHelper!.match(/return lastSnapshot/g)).toHaveLength(3);
    const initialSnapshot = observationHelper!.indexOf(
      "var lastSnapshot = await coordinator.presentationEffectHistory()",
    );
    const initialMatch = observationHelper!.indexOf(
      "if lastSnapshot.count == expectedCount { return lastSnapshot }",
    );
    const yieldLoop = observationHelper!.indexOf(
      "for _ in 0..<refreshTimerObservationYieldLimit {",
    );
    const taskYield = observationHelper!.indexOf("await Task.yield()");
    const postYieldSnapshot = observationHelper!.lastIndexOf(
      "lastSnapshot = await coordinator.presentationEffectHistory()",
    );
    const postYieldMatch = observationHelper!.lastIndexOf(
      "if lastSnapshot.count == expectedCount { return lastSnapshot }",
    );
    const finalReturn = observationHelper!.lastIndexOf("return lastSnapshot");
    expect(initialSnapshot).toBeLessThan(initialMatch);
    expect(initialMatch).toBeLessThan(yieldLoop);
    expect(yieldLoop).toBeLessThan(taskYield);
    expect(taskYield).toBeLessThan(postYieldSnapshot);
    expect(postYieldSnapshot).toBeLessThan(postYieldMatch);
    expect(postYieldMatch).toBeLessThan(finalReturn);
    expect(observationHelper).not.toMatch(/\b(?:while|repeat|retry)\b/);
    expect(observationHelper).not.toMatch(/(?:Task|Thread)\.sleep|\busleep\b/);
    expect(observationHelper).not.toMatch(/\bTask\s*\{/);
    expect(observationHelper).not.toMatch(/\bTask\.detached\b|\basync\s+let\b/);
    expect(observationHelper).not.toMatch(
      /\b(?:withTaskGroup|withThrowingTaskGroup|withDiscardingTaskGroup|withThrowingDiscardingTaskGroup)\b/,
    );
    expect(observationHelper).not.toContain("observeRefreshTimerHistory(");
    expect(observationHelper).not.toMatch(/try\?|\bcatch\b|XCTSkip/);

    const timerBoundary = kernelTests.match(
      /private func verifyRefreshTimerBoundaries\(\) async throws \{([\s\S]*?)\n    \}\n\n    private func verifyMutationBoundaries/,
    )?.[1];
    expect(timerBoundary).toBeDefined();
    expect(timerBoundary).toContain("for elapsed in [UInt64(499), 500, 501] {");
    expect(
      timerBoundary!.match(
        /observeRefreshTimerHistory\(coordinator, expectedCount: elapsed < 500 \? 0 : 1\)/g,
      ),
    ).toHaveLength(1);
    expect(kernelTests.match(/observeRefreshTimerHistory\(/g)).toHaveLength(2);
    const providerStarted = timerBoundary!.indexOf("ports.provider.waitRefreshStarted()");
    const delayedEvaluated = timerBoundary!.indexOf("ports.clock.waitDelayed500SleepEvaluated()");
    const observation = timerBoundary!.indexOf(
      "observeRefreshTimerHistory(coordinator, expectedCount: elapsed < 500 ? 0 : 1)",
    );
    const providerReleased = timerBoundary!.indexOf("ports.provider.releaseRefresh()");
    const workAwaited = timerBoundary!.indexOf("_ = await work");
    const firstAssertion = timerBoundary!.indexOf("try requireCorpusAssertion");
    expect(providerStarted).toBeLessThan(delayedEvaluated);
    expect(delayedEvaluated).toBeLessThan(observation);
    expect(observation).toBeLessThan(providerReleased);
    expect(providerReleased).toBeLessThan(workAwaited);
    expect(workAwaited).toBeLessThan(firstAssertion);
    expect(timerBoundary).toContain("history.count == (elapsed < 500 ? 0 : 1)");
    expect(timerBoundary).toContain("effect.originatingState == .refreshPending");
    expect(timerBoundary).toContain("effect.payload.focus == .heading");
    expect(timerBoundary).toContain("effect.payload.announcement == .refreshPending");
    expect(timerBoundary).toContain("effect.payload.priority == .polite");
    expect(timerBoundary).toContain("effect.payload.navigation == nil");
    expect(timerBoundary).toContain("drained.isEmpty");
    expect(timerBoundary).toContain("finalHistory.count == (elapsed < 500 ? 0 : 1)");
    expect(timerBoundary).not.toMatch(/try\?|\bcatch\b|XCTSkip/);

    const scriptClock = kernelTests.match(
      /private actor ScriptClock: AuthClockPort \{([\s\S]*?)\n\}\nprivate actor ScriptOwner/,
    )?.[1];
    expect(scriptClock).toBeDefined();
    expect(scriptClock!.match(/delayed500SleepEvaluated = OneShotSignal\(\)/g)).toHaveLength(1);
    expect(scriptClock).not.toContain("static let delayed500SleepEvaluated");
    expect(scriptClock).toContain(
      "func waitDelayed500SleepEvaluated() async { await delayed500SleepEvaluated.wait() }",
    );
    expect(scriptClock).toContain(
      "else if milliseconds == 500, let delayedElapsed { await delayed500SleepEvaluated.signal(); fired = delayedElapsed >= milliseconds && !Task.isCancelled }",
    );
    expect(scriptClock!.match(/delayed500SleepEvaluated\.signal\(\)/g)).toHaveLength(1);
    expect(scriptClock!.indexOf("await delayed500SleepEvaluated.signal()")).toBeLessThan(
      scriptClock!.indexOf("fired = delayedElapsed >= milliseconds && !Task.isCancelled"),
    );
  });

  it("keeps synthetic values out of XCTestCase concurrency captures", () => {
    const kernelTests = read("apps/ios/FluyoTests/AuthRuntimeKernelTests.swift");
    const fixtureIndex = kernelTests.indexOf("private enum SyntheticAuthFixture");
    const testCaseIndex = kernelTests.indexOf("final class AuthRuntimeKernelTests: XCTestCase");
    expect(fixtureIndex).toBeGreaterThan(-1);
    expect(fixtureIndex).toBeLessThan(testCaseIndex);
    const testCaseBody = kernelTests.slice(testCaseIndex);
    expect(testCaseBody).not.toContain("private func candidate()");
    expect(testCaseBody).not.toContain("private func ingress()");
    expect(
      testCaseBody
        .replaceAll("SyntheticAuthFixture.candidate()", "")
        .replaceAll("SyntheticAuthFixture.ingress()", ""),
    ).not.toMatch(/\b(?:candidate|ingress)\(\)/);
    expect(
      testCaseBody.match(
        /let \w+(?:Ingress|Candidate) = SyntheticAuthFixture\.(?:ingress|candidate)\(\)\r?\n\s*(?:async let \w+: Void =|let \w+ = Task \{)/g,
      ),
    ).toHaveLength(16);
    for (const start of testCaseBody.match(/(?:async let[^\n]*|Task\s*\{[^{}]*\})/g) ?? []) {
      expect(start).not.toMatch(/SyntheticAuthFixture\.(?:candidate|ingress)\(\)/);
    }
    expect(testCaseBody).toContain("let callback = p.callback, generations = p.generations");
    const detachedBodies = [...testCaseBody.matchAll(/Task\.detached\s*\{([^{}]*)\}/g)].map(
      (match) => match[1],
    );
    expect(detachedBodies).toHaveLength(3);
    expect(detachedBodies.join("\n")).not.toMatch(/\bp\./);
    expect(detachedBodies).toEqual([
      " await callback.purge(generation: 1) ",
      " generations.waitComparisonStarted() ",
      " generations.activate(2) ",
    ]);
  });

  it("pins exact-source split-runtime evidence and uploads only a sanitized union", () => {
    const workflow = read(".github/workflows/ios.yml");
    const script = read("scripts/ios-ci.sh");
    const bootstrap = read("scripts/ios-runtime-bootstrap.mjs");
    const failureSummarizer = read("scripts/summarize-ios-test-failures.mjs");
    const evidence = read("scripts/ios-evidence.mjs");
    const scanner = read("scripts/scan-ios-evidence.mjs");
    expect(workflow).toContain("runs-on: macos-15");
    expect(workflow).toContain("runs-on: macos-26");
    expect(bootstrap).toContain('FLUYO_IOS_EVIDENCE_LEG: "minimum"');
    expect(workflow).toContain("FLUYO_IOS_EVIDENCE_LEG: current");
    expect(workflow).toContain("needs: [minimum-ios, current-ios]");
    expect(workflow).toContain("Validate exact-head evidence union");
    expect(workflow).toContain("ref: ${{ github.event.pull_request.head.sha || github.sha }}");
    expect(workflow).toContain("if: success()");
    expect(workflow).toContain("retention-days: 7");
    expect(workflow.match(/scripts\/github-workflow-annotation\.mjs/g)).toHaveLength(2);
    expect(workflow.match(/scripts\/github-workflow-annotation\.test\.mjs/g)).toHaveLength(2);
    expect(script).toContain("/Applications/Xcode_16.2.app/Contents/Developer");
    expect(script).toContain("/Applications/Xcode_26.6.app/Contents/Developer");
    expect(script).toContain('ACTUAL_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"');
    expect(script).toContain("The approved minimum iOS 17.5 simulator runtime is unavailable");
    expect(script).toContain('xcrun simctl create "Fluyo evidence $LEG"');
    expect(script).toContain('xcrun simctl delete "$DEVICE_UDID"');
    expect(script).toContain(
      'xcrun simctl boot "$DEVICE_UDID" >"$WORK_ROOT/simulator-boot.log" 2>&1',
    );
    expect(script).toContain(
      'xcrun simctl bootstatus "$DEVICE_UDID" -b >>"$WORK_ROOT/simulator-boot.log" 2>&1',
    );
    expect(script).toContain('"deviceTypeIdentifier": device["deviceTypeIdentifier"]');
    expect(script).toContain('"runtimeIdentifier"');
    expect(script).toContain("CODE_SIGNING_ALLOWED=NO");
    expect(script).toContain("CODE_SIGNING_REQUIRED=NO");
    expect(script).toContain('if [[ "${GITHUB_ACTIONS:-}" == "true" ]]');
    expect(script).toContain("summary_args+=(--github-annotation)");
    expect(script).toContain("compile-tests-minimum");
    expect(script).toContain("compile-tests-current");
    expect(script.match(/build-for-testing/g)).toHaveLength(2);
    expect(script.match(/test-without-building/g)).toHaveLength(2);
    expect(script.match(/-derivedDataPath "\$DERIVED_ROOT\/Tests"/g)).toHaveLength(4);
    expect(script).not.toMatch(/resultBundlePath[^\n]+\btest\s/);
    expect(failureSummarizer).toContain(
      'new Set(["AuthRuntimeKernel.swift", "AuthRuntimeKernelTests.swift"])',
    );
    expect(failureSummarizer).toContain("compilerErrorPattern.exec(raw)");
    expect(failureSummarizer).toContain('"compile_tests_minimum"');
    expect(failureSummarizer).toContain('"compile_tests_current"');
    expect(failureSummarizer).toMatch(
      /const phases = new Set\(\[\s*"build_debug",\s*"build_staging",\s*"build_release",\s*"compile_tests_minimum",\s*"compile_tests_current",\s*"test_minimum",\s*"test_current",\s*\]\);/,
    );
    expect(failureSummarizer).toContain("number <= 65_535");
    for (const reason of [
      "task_transfer",
      "sendability",
      "actor_isolation",
      "type_inference",
      "type_mismatch",
      "missing_member",
      "syntax",
      "other",
    ]) {
      expect(failureSummarizer).toContain(`return "${reason}"`);
    }
    expect(failureSummarizer).toContain("source: compilerSources.has(compilerErrorMatch[1])");
    expect(failureSummarizer).toContain('if (category === "compile" && compilerDiagnostic)');
    expect(script).toMatch(
      /"\$NODE_EXECUTABLE" "\$ROOT_DIR\/scripts\/summarize-ios-test-failures\.mjs" "\$\{summary_args\[@\]\}"\s+return 1/,
    );
    expect(script).toContain("validate_app_configuration");
    expect(script).toContain("testNaturalDebugLaunchRendersAnInternalMarker");
    expect(script).toContain("testUnapprovedPublicHostIsRejectedFromInternalConfiguration");
    expect(read("apps/ios/FluyoTests/AppConfigurationTests.swift")).not.toContain("api.fluyo.com");
    expect(script).toContain(
      '"$DERIVED_ROOT/Debug/Build/Products/Debug-iphonesimulator/Fluyo.app"',
    );
    expect(
      script.match(
        /validate_app_configuration "\$DERIVED_ROOT\/Tests\/Build\/Products\/Debug-iphonesimulator\/Fluyo\.app" development/g,
      ),
    ).toHaveLength(1);
    expect(
      script.match(
        /validate_app_configuration "\$DERIVED_ROOT\/Debug\/Build\/Products\/Debug-iphonesimulator\/Fluyo\.app" development/g,
      ),
    ).toHaveLength(2);
    expect(
      script.match(/"\$DERIVED_ROOT\/Tests\/Build\/Products\/Debug-iphonesimulator\/Fluyo\.app"/g),
    ).toHaveLength(3);
    expect(script).toContain("grep -Eaiq");
    expect(script).toContain('"$NODE_EXECUTABLE" "$ROOT_DIR/scripts/ios-evidence.mjs" generate');
    expect(script).toContain('"$NODE_EXECUTABLE" "$ROOT_DIR/scripts/scan-ios-evidence.mjs"');
    expect(script).not.toContain('cp -R "$RESULTS_ROOT"');
    expect(script).toContain("SANITIZED_LOG_DIR");
    expect(evidence).toContain('remainingUnattempted: ["ios_physical_iphone_evidence"]');
    expect(evidence).toContain("Aggregate scenario union is incomplete");
    expect(scanner).toContain('"device identifier"');
    expect(scanner).toContain('"macOS user path"');
    expect(`${workflow}\n${script}`).not.toMatch(/secrets\.[A-Za-z0-9_]+/);
    expect(`${workflow}\n${script}`).not.toMatch(/testflight|app-store|appstore|notarytool/i);
  });

  it("pins the bounded macOS 15 and Xcode 16.2 bootstrap workflow", () => {
    const workflow = read(".github/workflows/ios.yml");
    expect(workflow).toContain("runs-on: macos-15");
    expect(workflow).toContain("timeout-minutes: 50");
    expect(workflow).toContain("timeout-minutes: 42");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("node scripts/ios-runtime-bootstrap.mjs run");
    expect(workflow).toContain("node scripts/ios-runtime-bootstrap.mjs verify-receipt");
    expect(workflow).not.toContain("runs-on: macos-14");
  });

  it("binds the Apple catalog tuple hash without claiming a payload hash", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("com.apple.dmg.iPhoneSimulatorSDK17_5");
    expect(controller).toContain("7336630623");
    expect(controller).toContain("21F79");
    expect(controller).toContain(
      "27c0b7cd887423ccf4ac33c0378accc9b4e659adab748e6b0e66f009b8da0510",
    );
    expect(controller).toContain('"artifactTupleSha256"');
    expect(controller).not.toContain("payloadSha256");
  });

  it("allows exactly one no-retry attempt-one Xcode acquisition", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('"-downloadPlatform"');
    expect(controller).toContain('"-buildVersion"');
    expect(controller).toContain('"17.5"');
    expect(controller).toContain('"-architectureVariant"');
    expect(controller).toContain('env.GITHUB_RUN_ATTEMPT !== "1"');
    expect(controller).not.toMatch(/curl|npm install|brew install|sudo /);
  });

  it("holds one unique CoreSimulator anchor through monitoring and cleanup", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('basename(current) === "CoreSimulator"');
    expect(controller).toContain("unique.length !== 1");
    expect(controller).toContain("fsConstants.O_NOFOLLOW");
    expect(controller).toContain("sampleHeldFilesystem");
    expect(controller).not.toContain('statfsSync("/")');
  });

  it("pins continuous disk, root, and transaction bounds", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    for (const value of [
      "DISK_MONITOR_INTERVAL_MS = 250",
      "DISK_MONITOR_MAX_GAP_MS = 1_000",
      "DISK_MONITOR_MAX_TICKS = 4_802",
      "MAX_ATTEMPT_ROOT_BYTES = 268_435_456",
      "MAX_MINIMUM_WORK_ROOT_BYTES = 4_294_967_296",
      "MAX_COMBINED_OWNED_ROOT_BYTES = 4_563_402_752",
      "TOTAL_TRANSACTION_TIMEOUT_MS = 2_370_000",
    ]) {
      expect(controller).toContain(value);
    }
  });

  it("keeps the controller as the single foreground transaction owner", () => {
    const workflow = read(".github/workflows/ios.yml");
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(workflow.split("  current-ios:")[0]).not.toContain("run: bash scripts/ios-ci.sh");
    expect(controller).toContain('[command, args] = ["/bin/bash"');
    expect(controller).toContain("MINIMUM_EVIDENCE_TIMEOUT_MS = 720_000");
    expect(controller).toContain("requestedArchitectureVariant");
  });

  it("uses a closed dual-failure receipt without privacy-bearing fields", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('"primaryFailureCode"');
    expect(controller).toContain('"cleanupFailureCode"');
    expect(controller).toContain('"minimumEvidenceResult"');
    for (const forbidden of ['storageAnchorDev"', 'storageAnchorIno"', 'processId"']) {
      expect(controller).not.toContain(forbidden);
    }
  });

  it("forces the minimum leg to consume the observed exact runtime and Node host", () => {
    const script = read("scripts/ios-ci.sh");
    expect(script).toContain("FLUYO_IOS_RUNTIME_IDENTIFIER");
    expect(script).toContain('FLUYO_IOS_RUNTIME_VERSION" != "17.5"');
    expect(script).toContain('FLUYO_IOS_RUNTIME_BUILD" != "21F79"');
    expect(script).toContain("FLUYO_NODE_EXECUTABLE");
    expect(script).toContain('"$NODE_EXECUTABLE" "$ROOT_DIR/scripts/ios-evidence.mjs"');
    expect(script).not.toContain("max(candidates, key=lambda row: row[0])");
  });

  it("installs one transaction cancellation latch before any fallible preflight", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const transaction = controller.slice(
      controller.indexOf("export async function runTransaction"),
    );
    expect(transaction.indexOf('signalTarget.once("SIGINT"')).toBeLessThan(
      transaction.indexOf("assertCatalogTuple()"),
    );
    expect(controller).toContain('"PRECONDITION_INTERRUPTED"');
    expect(controller).toContain('"FINALIZATION_INTERRUPTED"');
  });

  it("removes cancellation handlers only after synchronous receipt commit", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const transaction = controller.slice(
      controller.indexOf("export async function runTransaction"),
    );
    expect(transaction.indexOf("renameSync)(temporary, finalPath)")).toBeLessThan(
      transaction.lastIndexOf("releaseTransactionOwnership("),
    );
    expect(controller).toContain('"CLEANUP_INTERRUPTED"');
  });

  it("caps and canonically verifies the sanitized receipt", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("MAX_RECEIPT_BYTES = 8_192");
    expect(controller).toContain('new TextDecoder("utf-8", { fatal: true })');
    expect(controller).toContain("`${JSON.stringify(receipt)}\\n` !== text");
  });

  it("closes receipt state combinations including finalization and cleanup", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('"FINALIZATION_FAILED_CLEAN"');
    expect(controller).toContain('"CLEANUP_FAILED"');
    expect(controller).toContain(
      'state === "CLEANUP_FAILED" ? cleanupFailureCode : primaryFailureCode',
    );
  });

  it("gates every target behind READY identity capture and exact release", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('CHILD_GATE_READY = "READY_V1\\n"');
    expect(controller).toContain("CHILD_GATE_RELEASE_BYTES = 32");
    expect(controller.indexOf("await waitForReady")).toBeLessThan(controller.indexOf("gate.end"));
    expect(controller).toContain(
      'stdio: ["ignore", "pipe", "pipe", "pipe", controllerSource.fd, "pipe"]',
    );
  });

  it("holds unverified wrapper residue without claiming cleanup success", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
    expect(controller).toContain("IOS_RUNTIME_BOOTSTRAP_UNVERIFIED_CHILD_HOLD");
    expect(controller).toContain("await new Promise(() => {})");
  });

  it("uses closed role environments and one positional held source descriptor", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("INTERNAL_ENV_KEYS");
    expect(controller).toContain("plainClosedEnvironment");
    expect(controller).toContain("readSync(fd, value, offset, size - offset, offset)");
    expect(controller).toContain("fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW");
  });

  it("limits the security claim to containment rather than OS authorization", () => {
    const handoff = read("docs/DEVELOPMENT_HANDOFF.md");
    expect(handoff).toContain("gated accidental-invocation and source-mutation containment");
    expect(handoff).toContain("not OS authorization against malicious same-user code");
  });

  it("uses a unique hash-bound release nonce and zeroizes parent and child buffers", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('import { createHash, randomBytes } from "node:crypto"');
    expect(controller).toContain("FLUYO_INTERNAL_RELEASE_SHA256");
    expect(controller).toContain("sha256(releaseToken)");
    expect(controller).toContain("releaseToken.fill(0)");
    expect(controller).toContain("release.fill(0)");
    expect(controller).not.toContain("FLUYO_INTERNAL_RELEASE_TOKEN");
  });

  it("binds all inherited gate descriptors to FIFO or the exact controller inode", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("validateChildGateDescriptors");
    expect(controller).toContain("releaseInfo.isFIFO()");
    expect(controller).toContain("readyInfo.isFIFO()");
    expect(controller).toContain("pathInfo.dev !== heldBefore.dev");
    expect(controller).toContain("heldAfter.ino !== heldBefore.ino");
  });

  it("releases controller source and signal ownership in a true HOLD-aware outer finally", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("releaseTransactionOwnership");
    expect(controller).toMatch(/finally \{[\s\S]*releaseTransactionOwnership/u);
    expect(controller).toContain("if (unverifiedChildHold) return false");
    expect(controller).toContain('signalTarget.off("SIGINT"');
    expect(controller).toContain('signalTarget.off("SIGTERM"');
  });

  it("separates pre-release failure from released child failure for every role", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("let released = false");
    expect(controller).toContain('role === "ACQUIRE"');
    expect(controller).toContain('"PRECONDITION_INTERRUPTED"');
    expect(controller).toContain('"MINIMUM_EVIDENCE_PROCESS_IDENTITY"');
    expect(controller).toContain('"CLEANUP_PROCESS_IDENTITY"');
    expect(controller).toMatch(/beforeRelease\(\);[\s\S]*released = true;[\s\S]*gate\.end/u);
  });

  it("keeps operational termination and residue outcomes independent", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("let operationalFailure = null");
    expect(controller).toContain("let terminationFailure = null");
    expect(controller).toContain("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
    expect(controller).toContain("IOS_RUNTIME_BOOTSTRAP_VERIFIED_CHILD_HOLD");
    expect(controller).not.toContain("runOwnedPhase");
    expect(controller).not.toContain("runCleanupChild");
  });

  it("records nullable bounded runtime cardinalities and truthful retention", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("parsed.runtimes.length > 4096");
    expect(controller).toContain("preExactRuntimeCount");
    expect(controller).toContain("postAcquireExactRuntimeCount");
    expect(controller).toContain("postCleanupExactRuntimeCount");
    expect(controller).toContain("postCleanupExactRuntimeCount === null");
    expect(controller).toContain("runtimeRetained");
  });

  it("records every nullable disk slot before enforcing the closed thresholds", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('"freeBytesAfterMinimumEvidence"');
    expect(controller).toContain("onSample(free)");
    expect(controller).toContain("minimumFreeBytesObserved");
    expect(controller).toContain("acquireDiskDeltaBytes");
    expect(controller).toContain("diskMonitorSampleCount");
    expect(controller).toContain("MIN_FREE_AFTER_ACQUIRE_BYTES");
  });

  it("preserves phase cancellation and cleanup failure provenance", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('transactionPhase = "MINIMUM"');
    expect(controller).toContain('minimumEvidenceResult = "FAILED"');
    expect(controller).toContain("sanitizeCleanupFailure");
    expect(controller).toContain('primaryFailureCode.startsWith("POST_RUNTIME_")');
    expect(controller).toContain('minimumEvidenceResult = "NOT_RUN"');
  });

  it("records the v1.1.11.3 nonlive evidence ledger without broadening authority", () => {
    const handoff = read("docs/DEVELOPMENT_HANDOFF.md");
    expect(handoff).toContain("iOS 17.5 prerequisite lifecycle v1.1.11.3 hardening");
    expect(handoff).toContain("232/232 controller cases");
    expect(handoff).toContain("37/37 shared structure cases");
    expect(handoff).toContain("354 relevant cases");
    expect(handoff).toContain("257 = 232 controller + 25 newly applicable structure cases");
    expect(handoff).toContain("Live acquisition");
  });

  it("preserves an existing primary failure when cancellation reaches finalization", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toMatch(
      /cancellation\.requested[\s\S]*cleanupResult !== "FAILED"[\s\S]*primaryFailureCode === "NONE"/u,
    );
  });

  it("uses one dedicated identity-bound ps verifier for captured subprocesses", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("async function runPsVerifier");
    expect(controller).toContain("async function runCaptured");
    expect(controller).toContain("childLifecycle(child)");
    expect(controller).toContain("detached: true");
    expect(controller).toContain('env: { LANG: "C", LC_ALL: "C" }');
  });

  it("proves child-group absence before captured subprocess settlement", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toMatch(
      /terminateVerifiedProcessGroup\([\s\S]*child,[\s\S]*lifecycle\.close,[\s\S]*captured/u,
    );
    expect(controller).toContain("assertProcessGroupAbsent(captured.pgid");
    expect(controller).toContain("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
    expect(controller).toContain("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
  });

  it("binds every gated role sample to its exact receipt slot before bounds", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('typeof onRoleSample !== "function"');
    expect(controller).toContain("freeAfterAcquire = value;");
    expect(controller).toContain("freeAfterMinimumEvidence = value;");
    expect(controller).toContain("freeAfterCleanup = value;");
    expect(controller.indexOf("onSample(free)")).toBeLessThan(
      controller.indexOf("free < MIN_FREE_AFTER_ACQUIRE_BYTES"),
    );
  });

  it("uses one closed phase-evidence validator for receipt state and cardinality", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("function validateReceiptPhaseEvidence");
    expect(controller).toContain("downloadInvocationCount === 1");
    expect(controller).toContain("postCleanupExactRuntimeCount !== 0");
    expect(controller).toContain("runtimeRetained !== observedRetention");
  });

  it("keeps runtime triples and reached phase slots tied to observed evidence", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("hasRuntime && receipt.postAcquireExactRuntimeCount !== 1");
    expect(controller).toContain('receipt.minimumEvidenceResult === "NOT_RUN"');
    expect(controller).toContain("receipt.freeBytesAfterMinimumEvidence !== null");
    expect(controller).toContain('receipt.cleanupResult === "SUCCEEDED"');
  });

  it("requires the exact offending phase slot for disk floor and delta failures", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("const phaseDiskEvidence");
    expect(controller).toContain('receipt.primaryFailureCode === "ACQUIRE_DISK_FLOOR"');
    expect(controller).toContain('receipt.primaryFailureCode === "MINIMUM_EVIDENCE_DISK_FLOOR"');
    expect(controller).toContain('receipt.cleanupFailureCode === "CLEANUP_DISK_FLOOR"');
    expect(controller).toContain("MAX_ACQUIRE_DISK_DELTA_BYTES");
  });

  it("keeps verified and unverified residue as nonreceipt HOLD outcomes", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("IOS_RUNTIME_BOOTSTRAP_UNVERIFIED_CHILD_HOLD");
    expect(controller).toContain("IOS_RUNTIME_BOOTSTRAP_VERIFIED_CHILD_HOLD");
    expect(controller).toContain("await new Promise(() => {})");
  });

  it("separates first runtime inventory failure from storage-anchor binding", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('"PRECONDITION_RUNTIME_INVENTORY"');
    expect(controller).toContain('"PRECONDITION_STORAGE_ANCHOR"');
    expect(controller).toContain(
      'parseRuntimeInventory(beforeResult.stdout, "PRECONDITION_RUNTIME_INVENTORY")',
    );
    const counted = controller.indexOf("preExactRuntimeCount = exactRuntimeRows(before).length");
    expect(counted).toBeLessThan(controller.indexOf("bindStorageAnchor(", counted));
  });

  it("never signals a live child after an unverified re-probe", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("export async function signalVerifiedProcessGroup");
    const end = controller.indexOf("function waitForClose", start);
    const signal = controller.slice(start, end);
    expect(signal).toContain("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
    expect(signal.indexOf("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD")).toBeLessThan(
      signal.indexOf("-captured.pgid, signal"),
    );
    expect(signal).toContain("proveCapturedGroupAbsent");
  });

  it("preserves verified termination and residue HOLD outcomes", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("export async function terminateVerifiedProcessGroup");
    const end = controller.indexOf("export function assertProcessGroupAbsent", start);
    const terminate = controller.slice(start, end);
    expect(terminate).toContain('"SIGTERM"');
    expect(terminate).toContain('"SIGKILL"');
    expect(terminate).toContain("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
    expect(terminate).toContain("assertProcessGroupAbsent");
  });

  it("races one immutable HOLD settlement against gated child close", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("export async function runGatedPhase");
    const end = controller.indexOf("function transactionReceipt", start);
    const gated = controller.slice(start, end);
    expect(gated).toContain("const holdPromise = new Promise");
    expect(gated).toContain("const settleHold = (code)");
    expect(gated).toContain("Promise.race([");
    expect(gated.lastIndexOf("if (holdCode != null)")).toBeLessThan(
      gated.lastIndexOf("verifyControllerSource(controllerSource)"),
    );
  });

  it("attaches child settlement before inspecting either spawned probe", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    for (const name of ["runPsVerifier", "runCaptured"]) {
      const start = controller.indexOf(`async function ${name}`);
      const end = controller.indexOf("const stdout = []", start);
      const body = controller.slice(start, end);
      expect(body.indexOf("const lifecycle = childLifecycle(child)")).toBeLessThan(
        body.indexOf("child.pid"),
      );
      expect(body).toContain("rejectInvalidSpawn");
    }
    expect(controller).toContain("CHILD_CLOSE_WAIT_MS = 7_000");
  });

  it("preserves pre-release residue HOLD before teardown and mapping", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("export async function runGatedPhase");
    const end = controller.indexOf("const monitorStartedAt", start);
    const prerelease = controller.slice(start, end);
    const caught = prerelease.slice(prerelease.lastIndexOf("} catch (error) {"));
    expect(caught.indexOf("releaseToken.fill(0)")).toBeLessThan(
      caught.indexOf("error instanceof BootstrapFailure"),
    );
    expect(caught.indexOf("throw error")).toBeLessThan(caught.indexOf("gate?.destroy()"));
  });

  it("binds the storage anchor atomically and clears failed candidate evidence", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("export function bindStorageAnchor");
    expect(controller).toContain("if (candidateFd !== null) close(candidateFd)");
    expect(controller).toContain("observations.minimumFree = null");
    expect(controller).toContain("observations.maximumDelta = 0n");
    expect(controller).toContain("observations.samples = 0");
  });

  it("binds cleanup disk failures to cleanup evidence and the v1.1.13 ledger", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const handoff = read("docs/DEVELOPMENT_HANDOFF.md");
    expect(controller).toContain('"CLEANUP_DISK_FLOOR"');
    expect(controller).toContain('"CLEANUP_DISK_LIMIT"');
    expect(controller).toContain("sampleCleanupFilesystem");
    expect(handoff).toContain("iOS 17.5 prerequisite lifecycle v1.1.13 correction");
    expect(handoff).toContain("284/284 controller cases");
    expect(handoff).toContain("53/53 shared structure cases");
    expect(handoff).toContain("422 relevant cases");
    expect(handoff).toContain("325 = 284 controller + 41 newly applicable structure cases");
  });

  it("attaches one immutable lifecycle before inspecting every spawned child", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("function childLifecycle(child)");
    expect(controller).toContain("settlement,");
    expect(controller).toContain("close,");
    expect(controller).toContain("launch,");
    expect(controller).toContain("terminalLaunch,");
    for (const name of ["runPsVerifier", "runCaptured", "runGatedPhase"]) {
      const start = controller.indexOf(`function ${name}`);
      const end = controller.indexOf("const stdout = []", start);
      const body = controller.slice(start, end);
      expect(body.indexOf("childLifecycle(child)")).toBeGreaterThanOrEqual(0);
      expect(body.indexOf("childLifecycle(child)")).toBeLessThan(body.indexOf("child.pid"));
    }
  });

  it("requires actual close and never infers it from exit or signal state", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("function childLifecycle(child)");
    const end = controller.indexOf("function capturedText", start);
    const lifecycle = controller.slice(start, end);
    expect(lifecycle).toContain('child.once("close", onClose)');
    expect(lifecycle).toContain("resolveClose(value)");
    expect(lifecycle).toContain("async function awaitActualClose");
    expect(lifecycle).not.toMatch(/exitCode[^\n]*resolveClose|signalCode[^\n]*resolveClose/u);
  });

  it("threads the same actual-close promise through termination and gated settlement", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toMatch(
      /terminateVerifiedProcessGroup\([\s\S]*child,[\s\S]*lifecycle\.close,[\s\S]*captured/u,
    );
    expect(controller).toContain("awaitActualClose(lifecycle.close, CHILD_CLOSE_WAIT_MS");
    expect(controller).toContain(
      "lifecycle.close.then((result) => Object.freeze({ hold: false, result }))",
    );
    expect(controller).toContain("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
  });

  it("binds post-sample cleanup failures to a reached cleanup observation", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("let cleanupSampleRecorded = false");
    expect(controller).toContain("if (!cleanupSampleRecorded) cleanupSampleRecorded = true");
    for (const code of [
      "CLEANUP_PROCESS_IDENTITY",
      "CLEANUP_DELETE_FAILED",
      "CLEANUP_RAW_RESIDUE",
      "CLEANUP_RECEIPT_INVALID",
    ]) {
      expect(controller).toContain(`\"${code}\"`);
    }
    expect(controller).toContain("receipt.freeBytesAfterCleanup == null");
    expect(controller).toContain(
      "receipt.freeBytesAfterCleanup < Number(MIN_FREE_AFTER_CLEANUP_BYTES)",
    );
  });

  it("sanitizes cleanup failures by the first successful cleanup sample and records v1.1.14.2", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const handoff = read("docs/DEVELOPMENT_HANDOFF.md");
    const start = controller.indexOf("function sanitizeCleanupFailure");
    const end = controller.indexOf("function sampleCleanupFilesystem", start);
    const sanitizer = controller.slice(start, end);
    expect(sanitizer).toMatch(
      /CLEANUP_RECEIPT_INVALID[\s\S]*cleanupSampleRecorded[\s\S]*CLEANUP_FAILURE_CODES[\s\S]*cleanupSampleRecorded/u,
    );
    expect(handoff).toContain("iOS 17.5 prerequisite lifecycle v1.1.14.2 correction");
    expect(handoff).toContain("300/300 controller cases");
    expect(handoff).toContain("58/58 shared structure cases");
    expect(handoff).toContain("443 relevant cases");
    expect(handoff).toContain("346 = 300 controller + 46 newly applicable structure cases");
  });

  it("uses the dedicated ps verifier for parent identity without recursive capture", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("export async function probeParentIdentity");
    const end = controller.indexOf("function positionalSourceBytes", start);
    const parentProbe = controller.slice(start, end);
    expect(parentProbe).toContain("runPsVerifier(");
    expect(parentProbe).not.toContain("runCaptured(");
    expect(parentProbe).toContain('"PRECONDITION_PARENT_IDENTITY"');
  });

  it("closes every precondition stage and restores SOURCE after the time budget", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    for (const stage of [
      "INITIAL",
      "RUNNER",
      "PARENT_IDENTITY",
      "SOURCE",
      "ROOTS",
      "XCODE_VERSION_PROBE",
      "XCODE_VERSION_PARSE",
      "SIMCTL_FIND_V2",
      "SIMCTL_FIND_PATH",
      "RUNTIME_INVENTORY",
      "STORAGE_ANCHOR",
      "DISK",
      "TIME_BUDGET",
    ]) {
      expect(controller).toContain(`"${stage}"`);
    }
    expect(controller).toMatch(
      /preconditionStage = "TIME_BUDGET";[\s\S]*PRECONDITION_INSUFFICIENT_TIME[\s\S]*preconditionStage = "SOURCE";\s*validateFinalScriptIdentity\(paths\.repositoryRoot\);\s*verifyControllerSource\(controllerSource\)/u,
    );
    expect(
      controller.match(
        /preconditionStage = "SOURCE";\s*validateFinalScriptIdentity\(paths\.repositoryRoot\);/gu,
      ),
    ).toHaveLength(2);
  });

  it("sanitizes invocation-zero failures only within the closed precondition namespace", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("function sanitizePrimaryFailure");
    const end = controller.indexOf("function sanitizeCleanupFailure", start);
    const sanitizer = controller.slice(start, end);
    expect(sanitizer).toContain("invocationCount");
    expect(sanitizer).toContain('knownCode?.startsWith("PRECONDITION_")');
    expect(sanitizer).toContain("PRECONDITION_STAGE_FAILURE[preconditionStage]");
    expect(sanitizer).toContain('"ACQUIRE_PROCESS_IDENTITY"');
  });

  it("records the v1.1.15 truthful invocation-zero receipt ledger", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const handoff = read("docs/DEVELOPMENT_HANDOFF.md");
    expect(controller).toContain('"PRECONDITION_PARENT_IDENTITY"');
    expect(controller).toContain('"PRECONDITION_INSUFFICIENT_TIME"');
    expect(handoff).toContain("iOS 17.5 prerequisite parent-identity v1.1.15.1 repair topology");
    expect(handoff).toContain("314/314 controller cases");
    expect(handoff).toContain("62/62 shared structure cases");
    expect(handoff).toContain("469 relevant cases");
    expect(handoff).toContain("364 = 314 controller + 50 newly applicable structure cases");
  });

  it("binds the monotonic default receiver and closes injected clock failures", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("function monotonicNow");
    const end = controller.indexOf("function ensurePhaseBudget", start);
    const helper = controller.slice(start, end);
    expect(helper).toContain("performance.now()");
    expect(helper).toContain('typeof injected !== "function"');
    expect(helper).toContain("Number.isFinite(value)");
    expect(helper).toContain("value < 0");
    expect(helper).not.toContain("performance.now)()");
  });

  it("uses exactly five repaired clock call sites with closed phase codes", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller.match(/monotonicNow\(/gu)).toHaveLength(6);
    expect(
      controller.match(/monotonicNow\(dependencies, "MINIMUM_EVIDENCE_MONITOR"\)/gu),
    ).toHaveLength(2);
    expect(controller).toContain("monotonicNow(dependencies, monitorFailure)");
    expect(controller).toContain('started = monotonicNow(dependencies, "PRECONDITION_ENV")');
    expect(controller).not.toContain("(dependencies.now ?? performance.now)()");
  });

  it("creates exact direct sibling roots without recursion or a legacy parent", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("`fluyo-ios-runtime-bootstrap-${env.GITHUB_RUN_ID}-1`");
    expect(controller).toContain("`fluyo-ios-minimum-${env.GITHUB_RUN_ID}-1`");
    expect(controller).toContain('join(runnerTempBinding.path, "fluyo-ios-runtime-bootstrap")');
    expect(controller).toContain("fs.mkdir(path, { recursive: false, mode: 0o700 })");
    expect(controller).not.toContain('join(env.RUNNER_TEMP, "fluyo-ios-runtime-bootstrap",');
  });

  it("binds runner temp and owned roots to canonical nonsymlink same-device identities", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("function validateRunnerTemp");
    expect(controller).toContain("realpath(path) !== path");
    expect(controller).toContain("info.dev !== parentBinding.dev");
    expect(controller).toContain("dev: info.dev");
    expect(controller).toContain("ino: info.ino");
    expect(controller).toContain("parentDev: parentBinding.dev");
  });

  it("revalidates immutable owned-root bindings before scan and reverse cleanup", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("validateOwnedRootBinding(binding, failureCode, dependencies)");
    expect(controller).toContain("validateOwnedRootBinding(owned.binding, rootIdentityFailure");
    const minimum = controller.indexOf("removeOwnedRoot(minimumRootBinding");
    const bootstrap = controller.indexOf("removeOwnedRoot(bootstrapRootBinding", minimum);
    expect(minimum).toBeGreaterThanOrEqual(0);
    expect(minimum).toBeLessThan(bootstrap);
    expect(controller).toContain('validateOwnedRootBinding(binding, "CLEANUP_RAW_RESIDUE"');
  });

  it("writes truthful invocation-zero receipts without broadening acquisition authority", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller.indexOf("let receipt = baseReceipt")).toBeLessThan(
      controller.indexOf('started = monotonicNow(dependencies, "PRECONDITION_ENV")'),
    );
    expect(controller).toContain('downloadResult = "NOT_ATTEMPTED"');
    expect(controller).toContain('minimumEvidenceResult = "NOT_RUN"');
    expect(controller).toContain('cleanupResult = "NOT_REQUIRED"');
    expect(controller).toContain("XCODE_ARGS");
    expect(controller).toContain("downloadInvocationCount: invocationCount");
  });

  it("binds the exact diagnostic mode and schema-v2 ordered evidence fields", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('"PR94_IOS_XCODE_PRECONDITION_DIAGNOSTIC_V1_2"');
    expect(controller).toContain("receipt.schemaVersion !== 2");
    expect(controller).toMatch(
      /"diagnosticMode",\s*"expectedVersion",\s*"expectedBuild",\s*"observedVersion",\s*"observedBuild"/u,
    );
    expect(controller).not.toMatch(/expectedXcodeVersion|expectedXcodeBuild/u);
    expect(controller).not.toMatch(/observedXcodeVersion|observedXcodeBuild/u);
  });

  it("closes the v1.2 thirteen-code diagnostic table without retired generic codes", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    for (const code of [
      "PRECONDITION_XCODE_VERSION_PROBE",
      "PRECONDITION_XCODE_VERSION_PARSE",
      "PRECONDITION_SIMCTL_FIND_SPAWN",
      "PRECONDITION_SIMCTL_FIND_INVALID_PID",
      "PRECONDITION_SIMCTL_FIND_IDENTITY_AFTER_SETTLEMENT",
      "PRECONDITION_SIMCTL_FIND_TIMEOUT",
      "PRECONDITION_SIMCTL_FIND_OUTPUT_LIMIT",
      "PRECONDITION_SIMCTL_FIND_EXIT",
      "PRECONDITION_SIMCTL_FIND_UTF8",
      "PRECONDITION_SIMCTL_FIND_PATH",
      "PRECONDITION_XCODE_VERSION_INTERNAL",
      "PRECONDITION_SIMCTL_FIND_INTERNAL",
      "PRECONDITION_XCODE_DIAGNOSTIC_READY",
    ]) {
      expect(controller).toContain(`"${code}"`);
    }
    expect(controller).not.toMatch(/"PRECONDITION_XCODE"/u);
    expect(controller).not.toContain('"PRECONDITION_SIMCTL_FIND_PROBE"');
  });

  it("maps each diagnostic stage to its exact sanitized internal fallback", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('XCODE_VERSION_PROBE: "PRECONDITION_XCODE_VERSION_INTERNAL"');
    expect(controller).toContain('XCODE_VERSION_PARSE: "PRECONDITION_XCODE_VERSION_INTERNAL"');
    expect(controller).toContain('SIMCTL_FIND_V2: "PRECONDITION_SIMCTL_FIND_INTERNAL"');
    expect(controller).toContain('SIMCTL_FIND_PATH: "PRECONDITION_SIMCTL_FIND_INTERNAL"');
  });

  it("stores the exact observed tuple only after strict version parsing", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const parsed = controller.indexOf("const parsedXcode = parseXcodeVersion(xcode.stdout)");
    const version = controller.indexOf("observedVersion = parsedXcode.version", parsed);
    const build = controller.indexOf("observedBuild = parsedXcode.build", parsed);
    const simctl = controller.indexOf('preconditionStage = "SIMCTL_FIND_V2"', parsed);
    expect(parsed).toBeGreaterThanOrEqual(0);
    expect(version).toBeGreaterThan(parsed);
    expect(build).toBeGreaterThan(version);
    expect(build).toBeLessThan(simctl);
  });

  it("permits only the exact probe-code set on general captured probes", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("const diagnosticCode = limits.diagnosticCode ?? null");
    expect(controller).toContain("!XCODE_PROBE_FAILURE_CODES.has(diagnosticCode)");
    expect(controller).toContain("diagnosticCode ?? limits.exitCode");
  });

  it("preserves live-child HOLD outcomes beside diagnostic probe failures", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("async function runCaptured");
    const end = controller.indexOf("function canonicalReceipt", start);
    const captured = controller.slice(start, end);
    expect(captured).toContain("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
    expect(captured).toContain("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
    expect(captured).toContain("throw error");
  });

  it("stops at DIAGNOSTIC_READY before inventory or acquisition release", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const ready = controller.indexOf('fail("PRECONDITION_XCODE_DIAGNOSTIC_READY")');
    const inventory = controller.indexOf('preconditionStage = "RUNTIME_INVENTORY"', ready);
    const release = controller.indexOf("invocationCount = 1", ready);
    expect(ready).toBeGreaterThanOrEqual(0);
    expect(inventory).toBeGreaterThan(ready);
    expect(release).toBeGreaterThan(inventory);
  });

  it("validates only the clean and raw-residue diagnostic invocation-zero rows", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("function validateDiagnosticReceipt");
    const end = controller.indexOf("export function validateReceipt", start);
    const validator = controller.slice(start, end);
    expect(validator).toContain('receipt.state === "PRECONDITION_REJECTED"');
    expect(validator).toContain('receipt.state === "CLEANUP_FAILED"');
    expect(validator).toContain('receipt.cleanupFailureCode === "CLEANUP_RAW_RESIDUE"');
    expect(validator).toContain("receipt.rawLogRetained === true");
    expect(validator).toContain("(!cleanRow && !cleanupFailureRow)");
    expect(validator).toContain("receipt.downloadInvocationCount !== 0");
    expect(validator).toContain('receipt.downloadResult !== "NOT_ATTEMPTED"');
    expect(validator).toContain('receipt.cleanupResult === "NOT_REQUIRED"');
    expect(validator).toContain('receipt.cleanupResult === "FAILED"');
    expect(validator).toContain("receipt.diskMonitorSampleCount !== 0");
  });

  it("binds null-versus-exact observation evidence to the closed diagnostic table", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain("const expectsObserved = [");
    expect(controller).toContain("PRECONDITION_SIMCTL_FIND_INTERNAL");
    expect(controller).toContain("PRECONDITION_XCODE_DIAGNOSTIC_READY");
    expect(controller).toContain("!observed.every((value) => value === null)");
  });

  it("keeps workflow and ios-ci acquisition authority unchanged by diagnostic mode", () => {
    const workflow = read(".github/workflows/ios.yml");
    const iosCi = read("scripts/ios-ci.sh");
    expect(workflow).toContain("node scripts/ios-runtime-bootstrap.mjs run");
    expect(workflow).not.toContain("PR94_IOS_XCODE_PRECONDITION_DIAGNOSTIC_V1_2");
    expect(iosCi).not.toContain("PR94_IOS_XCODE_PRECONDITION_DIAGNOSTIC_V1_2");
    expect(iosCi).toContain("FLUYO_IOS_EVIDENCE_LEG");
  });

  it("binds SIMCTL_FIND_V2 to exact xcrun argv without a generic diagnostic key", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    expect(controller).toContain('const SIMCTL_FIND_PROFILE = "SIMCTL_FIND_V2"');
    expect(controller).toContain('Object.freeze([XCRUN, "--find", "simctl"])');
    expect(controller).toContain("async function runSimctlFindV2");
    expect(controller).not.toMatch(/diagnosticCode: "PRECONDITION_SIMCTL_FIND/u);
  });

  it("requires immutable simctl identity and actual close before safe classification", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("function parseSimctlFindIdentity");
    const end = controller.indexOf("export async function probeProcessIdentity", start);
    const runner = controller.slice(start, end);
    for (const field of ["pid", "pgid", "ppid", "executable", "startToken", "commandTokens"]) {
      expect(runner).toContain(field);
    }
    expect(runner).toContain("terminateVerifiedProcessGroup");
    expect(runner).toContain("awaitActualClose");
    expect(runner).toContain("assertProcessGroupAbsent");
    expect(runner).toContain("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
    expect(runner).toContain("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
  });

  it("settles simctl launch by one event-aware pending-state compare-and-set", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("function childLifecycle(child)");
    const end = controller.indexOf("async function awaitActualClose", start);
    const lifecycle = controller.slice(start, end);
    expect(lifecycle).toContain('let launchState = "PENDING"');
    expect(lifecycle).toContain('if (launchState !== "PENDING") return false');
    expect(lifecycle).toContain('terminalLaunch({ state: "SPAWNED" })');
    expect(lifecycle).toContain('terminalLaunch({ state: "ERROR" })');
    expect(lifecycle).toContain('terminalLaunch({ state: "CLOSE", result: value })');
    expect(lifecycle).toContain('child.once("spawn", onSpawn)');
  });

  it("attaches simctl output cancellation and timeout observers before PID inspection", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("async function runSimctlFindV2");
    const end = controller.indexOf("export async function probeProcessIdentity", start);
    const runner = controller.slice(start, end);
    const stdoutListener = runner.indexOf('child.stdout?.on("data"');
    const timeout = runner.indexOf('() => latchAbort("TIMEOUT")');
    const cancellation = runner.indexOf('cancelTarget.on("SIGINT", onCancel)');
    const launch = runner.indexOf("const launch = await Promise.race");
    const pid = runner.indexOf("Number.isSafeInteger(child.pid)");
    expect(stdoutListener).toBeGreaterThanOrEqual(0);
    expect(timeout).toBeGreaterThan(stdoutListener);
    expect(cancellation).toBeGreaterThan(timeout);
    expect(launch).toBeGreaterThan(cancellation);
    expect(pid).toBeGreaterThan(launch);
  });

  it("makes a preidentity abort permanent and forbids signaling", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("async function runSimctlFindV2");
    const end = controller.indexOf("export async function probeProcessIdentity", start);
    const runner = controller.slice(start, end);
    expect(runner).toContain('let identityState = "PENDING"');
    expect(runner).toContain("let preIdentityAbort = false");
    expect(runner).toContain('if (identityState !== "CAPTURED") preIdentityAbort = true');
    expect(runner).toContain('if (preIdentityAbort) return Object.freeze({ state: "ABORTED" })');
    expect(runner).toContain(
      'if (abortEvidence !== null) return Object.freeze({ state: "ABORTED" })',
    );
    expect(runner).toContain('if (first.state === "ABORTED" || preIdentityAbort)');
    expect(runner).toContain('if (launch.state === "ABORTED")');
    expect(runner).toContain("if (preIdentityAbort) await failForAbort(child.pid)");
    const latch = runner.slice(
      runner.indexOf("const latchAbort"),
      runner.indexOf("const add", runner.indexOf("const latchAbort")),
    );
    expect(latch).not.toContain("terminalLaunch");
    const preidentity = runner.slice(
      runner.indexOf('if (first.state === "ABORTED" || preIdentityAbort)'),
      runner.indexOf("let identityOutcome", runner.indexOf('if (first.state === "ABORTED"')),
    );
    expect(preidentity).toContain("await failForAbort(child.pid)");
    expect(preidentity).not.toContain("terminateVerifiedProcessGroup");
    const failedIdentity = runner.slice(
      runner.indexOf('if (identityOutcome?.state === "FAILED")'),
      runner.indexOf("const captured = identityOutcome.captured"),
    );
    expect(failedIdentity).toContain("await awaitCloseAndAbsence(child.pid)");
    expect(failedIdentity).toContain(
      "if (abortEvidence !== null || preIdentityAbort) await failForAbort(child.pid)",
    );
  });

  it("accepts short-lived simctl only after actual close group absence and closed output checks", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("async function runSimctlFindV2");
    const end = controller.indexOf("export async function probeProcessIdentity", start);
    const runner = controller.slice(start, end);
    expect(runner).toContain("await awaitCloseAndAbsence(child.pid)");
    expect(runner).toContain("directGroupAbsent(pid, dependencies)");
    expect(runner).toContain(
      'throw new BootstrapFailure("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD")',
    );
    expect(runner).toContain("result.error || result.code !== 0 || result.signal != null");
    expect(runner).toContain("validatedSimctlFindOutput(stdout, stderr, dependencies)");
    expect(controller).toContain("PRECONDITION_SIMCTL_FIND_UTF8");
    expect(controller).toContain("PRECONDITION_SIMCTL_FIND_PATH");
  });

  it("keeps HOLD precedence while captured identity alone may authorize termination", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("async function runSimctlFindV2");
    const end = controller.indexOf("export async function probeProcessIdentity", start);
    const runner = controller.slice(start, end);
    const capture = runner.indexOf('identityState = "CAPTURED"');
    const termination = runner.indexOf("await terminateVerifiedProcessGroup", capture);
    expect(capture).toBeGreaterThanOrEqual(0);
    expect(termination).toBeGreaterThan(capture);
    expect(runner).toContain("PRECONDITION_UNVERIFIED_CHILD_RESIDUE_HOLD");
    expect(runner).toContain("PRECONDITION_VERIFIED_CHILD_RESIDUE_HOLD");
    expect(runner).toContain('if (abortEvidence === "CANCELLED") fail("PRECONDITION_INTERRUPTED")');
  });

  it("keeps every safe v1.2 simctl result invocation-zero with exact observations", () => {
    const controller = read("scripts/ios-runtime-bootstrap.mjs");
    const start = controller.indexOf("function validateDiagnosticReceipt");
    const end = controller.indexOf("export function validateReceipt", start);
    const receipt = controller.slice(start, end);
    for (const suffix of [
      "SPAWN",
      "INVALID_PID",
      "IDENTITY_AFTER_SETTLEMENT",
      "TIMEOUT",
      "OUTPUT_LIMIT",
      "EXIT",
      "UTF8",
    ]) {
      expect(receipt).toContain(`PRECONDITION_SIMCTL_FIND_${suffix}`);
    }
    expect(receipt).toContain("receipt.downloadInvocationCount !== 0");
    expect(receipt).toContain("EXPECTED_XCODE_VERSION");
    expect(receipt).toContain("EXPECTED_XCODE_BUILD");
  });

  it("invokes current-test sanitization with exact termination and result-bundle argv", () => {
    const iosCi = read("scripts/ios-ci.sh");
    expect(iosCi).toContain(
      'summary_args+=(--termination EXIT_NONZERO --consume-result-bundle "$RESULTS_ROOT/current.xcresult")',
    );
    expect(iosCi).not.toContain("CURRENT_TEST_TIMEOUT");
  });

  it("closes current-test output to one frozen ordered-field classifier", () => {
    const summarizer = read("scripts/summarize-ios-test-failures.mjs");
    expect(summarizer).toContain("export function classifyCurrentTestFailure(raw)");
    expect(summarizer).toContain('"category=xctest"');
    expect(summarizer).toContain('"category=simulator"');
    expect(summarizer).toContain('"category=unknown"');
    expect(summarizer).toContain("Object.freeze(fields)");
    const codes = [
      "CURRENT_TEST_AUTH_INVARIANT",
      "CURRENT_TEST_AUTH_DIAGNOSTIC",
      "CURRENT_TEST_AUTH_ASSERTION_RECORDED",
      "CURRENT_TEST_AUTH_CHECKPOINT",
      "CURRENT_TEST_AUTH_FALLBACK",
      "CURRENT_TEST_AUTH_DIAGNOSTIC_UNAVAILABLE",
      "CURRENT_TEST_LINK",
      "CURRENT_TEST_COMPILE",
      "CURRENT_TEST_AUTH_TEST",
      "CURRENT_TEST_XCTEST_FAILURE",
      "CURRENT_TEST_DESTINATION_UNAVAILABLE",
      "CURRENT_TEST_UNKNOWN",
    ];
    let priorCode = -1;
    for (const code of codes) {
      const codeIndex = summarizer.indexOf(`code=${code}`);
      expect(codeIndex).toBeGreaterThan(priorCode);
      priorCode = codeIndex;
    }
    expect(summarizer).toContain("number <= 65_535");
    expect(summarizer).toContain("const validEarlier =");
    expect(summarizer).toContain("const validFinal = validEarlier && failures > 0");
    expect(summarizer).toContain("value.validEarlier");
    expect(summarizer).toContain("unexpected <= failures");
    expect(summarizer).toContain(
      "Unable to find a destination matching the provided destination specifier:",
    );
  });

  it("cleans both held raw targets in an unconditional finally before output", () => {
    const summarizer = read("scripts/summarize-ios-test-failures.mjs");
    const finalizer = summarizer.indexOf("} finally {");
    const output = summarizer.indexOf('const detail = result.fields.join("; ")');
    expect(finalizer).toBeGreaterThanOrEqual(0);
    expect(output).toBeGreaterThan(finalizer);
    expect(summarizer).toContain("cleanupTarget(logBinding");
    expect(summarizer).toContain(
      'cleanupTarget(bundleBinding, resultBundlePath, results, "current.xcresult")',
    );
    expect(summarizer).toContain("IOS_CURRENT_FAILURE_SANITIZATION_FAILED");
    expect(summarizer).toContain("O_NOFOLLOW");
    const sanitizer = summarizer.slice(
      summarizer.indexOf("export function sanitizeCurrentTestFailure"),
      summarizer.indexOf("const main = () =>"),
    );
    expect(sanitizer).not.toContain("existsSync");
  });

  it("never reads result bundles and preserves success-only evidence upload", () => {
    const summarizer = read("scripts/summarize-ios-test-failures.mjs");
    const iosCi = read("scripts/ios-ci.sh");
    const workflow = read(".github/workflows/ios.yml");
    expect(summarizer).not.toMatch(/readFileSync\(resultBundlePath/u);
    expect(summarizer).toContain('binding.kind === "bundle"');
    expect(summarizer).toContain("filesystem.rmSync(leaf, { recursive: true, force: false })");
    expect(iosCi).toContain("return 1");
    expect(workflow).toContain("if: success()");
  });

  it("authorizes only exact Darwin current-test paths under canonical RUNNER_TEMP", () => {
    const summarizer = read("scripts/summarize-ios-test-failures.mjs");
    expect(summarizer).toContain('platform !== "darwin"');
    expect(summarizer).toContain('joinPath(runnerTemp, "fluyo-ios-current")');
    expect(summarizer).toContain('joinPath(attemptRoot, "logs", "test-current.log")');
    expect(summarizer).toContain('joinPath(attemptRoot, "results", "current.xcresult")');
    expect(summarizer).toContain("logPath !== expectedLog");
    expect(summarizer).toContain("resultBundlePath !== expectedBundle");
  });

  it("holds every ancestor and target with nofollow identity bindings", () => {
    const summarizer = read("scripts/summarize-ios-test-failures.mjs");
    expect(summarizer).toContain(
      "constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW",
    );
    expect(summarizer).toContain("filesystem.fstatSync(fd, { bigint: true })");
    expect(summarizer).toContain("before.uid !== asUid");
    expect(summarizer).toContain("(before.mode & 0o022n) !== 0n");
    expect(summarizer).toContain("held.dev !== before.dev");
    expect(summarizer).toContain("held.ino !== before.ino");
    expect(summarizer.match(/provisionalFds\.add\(fd\)/gu)).toHaveLength(3);
    expect(summarizer).toContain("const closeProvisional = (fd) =>");
    expect(summarizer).toContain("const promoteBinding = (binding) =>");
    expect(summarizer).toContain("closeProvisional(fd)");
  });

  it("uses an exact random held quarantine and lstat-only absence proofs", () => {
    const summarizer = read("scripts/summarize-ios-test-failures.mjs");
    const sanitizer = summarizer.slice(
      summarizer.indexOf("export function sanitizeCurrentTestFailure"),
      summarizer.indexOf("const main = () =>"),
    );
    expect(summarizer).toContain("const random = nonce(16)");
    expect(summarizer).toContain("/^[0-9a-f]{32}$/u.test(hex)");
    expect(summarizer).toContain("`.failure-sanitizer-${hex}`");
    const create = summarizer.indexOf(
      "filesystem.mkdirSync(quarantinePath, { recursive: false, mode: 0o700 })",
    );
    const track = summarizer.indexOf(
      "quarantineCreation = { path: quarantinePath, dev: null, ino: null }",
    );
    const open = summarizer.indexOf("quarantine = openDirectory(quarantinePath, attempt)");
    expect(create).toBeGreaterThanOrEqual(0);
    expect(track).toBeGreaterThan(create);
    expect(open).toBeGreaterThan(track);
    expect(summarizer).toContain(
      "const proveAbsent = (filesystem, path) => lstatOrNull(filesystem, path) === null",
    );
    expect(sanitizer).not.toContain("existsSync");
  });

  it("quarantines only matching held identities and unlinks a replacement symlink", () => {
    const summarizer = read("scripts/summarize-ios-test-failures.mjs");
    expect(summarizer).toContain("if (current.isSymbolicLink())");
    expect(summarizer).toContain("filesystem.unlinkSync(path)");
    expect(summarizer).toContain("filesystem.renameSync(path, leaf)");
    expect(summarizer).toContain("current.dev !== binding.dev");
    expect(summarizer).toContain("current.ino !== binding.ino");
  });

  it("emits no result until cleanup succeeds and preserves one fixed failure", () => {
    const summarizer = read("scripts/summarize-ios-test-failures.mjs");
    const sanitizerCall = summarizer.indexOf("const result = sanitizeCurrentTestFailure");
    const resultGuard = summarizer.indexOf("if (!result.ok)", sanitizerCall);
    const annotation = summarizer.indexOf("githubWorkflowErrorAnnotation(detail)", resultGuard);
    expect(sanitizerCall).toBeGreaterThanOrEqual(0);
    expect(resultGuard).toBeGreaterThan(sanitizerCall);
    expect(annotation).toBeGreaterThan(resultGuard);
    expect(summarizer).toContain(
      'process.stderr.write("IOS_CURRENT_FAILURE_SANITIZATION_FAILED\\n")',
    );
    expect(summarizer).toContain("return Object.freeze({ ok: !failed && fields !== null");
  });
});
