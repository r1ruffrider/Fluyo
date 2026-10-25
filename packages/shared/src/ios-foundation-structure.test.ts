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
    const failureSummarizer = read("scripts/summarize-ios-test-failures.mjs");
    const evidence = read("scripts/ios-evidence.mjs");
    const scanner = read("scripts/scan-ios-evidence.mjs");
    expect(workflow).toContain("runs-on: macos-14");
    expect(workflow).toContain("runs-on: macos-26");
    expect(workflow).toContain("FLUYO_IOS_EVIDENCE_LEG: minimum");
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
    expect(script).toContain("The approved minimum iOS 17 simulator runtime is unavailable");
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
    expect(failureSummarizer).toContain(
      'new Set(["AuthRuntimeKernel.swift", "AuthRuntimeKernelTests.swift"])',
    );
    expect(failureSummarizer).toContain("compilerErrorPattern.exec(raw)");
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
      /node "\$ROOT_DIR\/scripts\/summarize-ios-test-failures\.mjs" "\$\{summary_args\[@\]\}"\s+return 1/,
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
    expect(script).toContain('node "$ROOT_DIR/scripts/ios-evidence.mjs" generate');
    expect(script).toContain('node "$ROOT_DIR/scripts/scan-ios-evidence.mjs"');
    expect(script).not.toContain('cp -R "$RESULTS_ROOT"');
    expect(script).toContain("SANITIZED_LOG_DIR");
    expect(evidence).toContain('remainingUnattempted: ["ios_physical_iphone_evidence"]');
    expect(evidence).toContain("Aggregate scenario union is incomplete");
    expect(scanner).toContain('"device identifier"');
    expect(scanner).toContain('"macOS user path"');
    expect(`${workflow}\n${script}`).not.toMatch(/secrets\.[A-Za-z0-9_]+/);
    expect(`${workflow}\n${script}`).not.toMatch(/testflight|app-store|appstore|notarytool/i);
  });
});
