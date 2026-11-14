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
    expect(controller).toContain("return Object.freeze({ settlement, close })");
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
});
