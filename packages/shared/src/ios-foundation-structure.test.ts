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
  "Fluyo/FoundationTelemetry.swift",
  "Fluyo/Localizable.xcstrings",
  "Fluyo/PrivacyInfo.xcprivacy",
  "FluyoTests/AppConfigurationTests.swift",
  "FluyoTests/FoundationShellModelTests.swift",
  "FluyoTests/FoundationTelemetryTests.swift",
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
    expect(telemetry.match(/case [A-Za-z]+(?: = )?/g)).toHaveLength(15);
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
    expect(uiTests).toContain("XCTAssertGreaterThanOrEqual(button.frame.height, 44)");
  });

  it("pins unsigned macOS and Xcode evidence without secrets or release actions", () => {
    const workflow = read(".github/workflows/ios.yml");
    const script = read("scripts/ios-ci.sh");
    expect(workflow).toContain("runs-on: macos-26");
    expect(workflow).toContain("retention-days: 7");
    expect(script).toContain("/Applications/Xcode_26.6.app/Contents/Developer");
    expect(script).toContain("CODE_SIGNING_ALLOWED=NO");
    expect(script).toContain("CODE_SIGNING_REQUIRED=NO");
    expect(script).toContain("restrictedValueScan");
    expect(`${workflow}\n${script}`).not.toMatch(/secrets\.[A-Za-z0-9_]+/);
    expect(`${workflow}\n${script}`).not.toMatch(/testflight|app-store|appstore|notarytool/i);
  });
});
