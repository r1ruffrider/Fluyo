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
  "Fluyo/FluyoApp.swift",
  "Fluyo/FoundationShellModel.swift",
  "Fluyo/FoundationShellView.swift",
  "Fluyo/FoundationDesignTokens.swift",
  "Fluyo/FoundationTelemetry.swift",
  "Fluyo/Localizable.xcstrings",
  "Fluyo/PrivacyInfo.xcprivacy",
  "FluyoTests/AppConfigurationTests.swift",
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
    }
    expect(release).toContain("FLUYO_CONFIGURATION_CLASSIFICATION = inert_until_release_gate");
    expect(release).toContain("FLUYO_NETWORK_ENABLED = NO");
    expect(release).toContain("FLUYO_INTERNAL_BUILD = NO");
    expect(release).toMatch(/FLUYO_API_BASE_URL =\s*\r?\n/);
    expect(release).toMatch(/FLUYO_SUPABASE_URL =\s*\r?\n/);
    expect(release).toMatch(/FLUYO_SUPABASE_PUBLISHABLE_KEY =\s*\r?\n/);
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

  it("pins exact-source split-runtime evidence and uploads only a sanitized union", () => {
    const workflow = read(".github/workflows/ios.yml");
    const script = read("scripts/ios-ci.sh");
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
    expect(script).toContain("/Applications/Xcode_16.2.app/Contents/Developer");
    expect(script).toContain("/Applications/Xcode_26.6.app/Contents/Developer");
    expect(script).toContain('ACTUAL_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"');
    expect(script).toContain("The approved minimum iOS 17 simulator runtime is unavailable");
    expect(script).toContain("CODE_SIGNING_ALLOWED=NO");
    expect(script).toContain("CODE_SIGNING_REQUIRED=NO");
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
