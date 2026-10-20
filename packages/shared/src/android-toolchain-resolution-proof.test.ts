import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;

const root = resolve(__dirname, "../../..");
const contractDirectory = resolve(root, "contracts/mobile/android/foundation/v1");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const proof = JSON.parse(
  readFileSync(resolve(contractDirectory, "toolchain-resolution-proof.json"), "utf8"),
) as JsonObject;
const metadata = read("contracts/mobile/android/foundation/v1/verification-metadata.xml");
const settings = read("contracts/mobile/android/foundation/v1/probe/settings.gradle.kts");
const build = read("contracts/mobile/android/foundation/v1/probe/build.gradle.kts");
const driver = read("scripts/android-toolchain-proof.mjs");

const asObject = (value: unknown, label: string): JsonObject => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonObject;
};

const asObjects = (value: unknown, label: string): JsonObject[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((entry, index) => asObject(entry, `${label}[${index}]`));
};

const asStrings = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  return value;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

describe("Android toolchain resolution proof", () => {
  it("binds the reproducible proof to merged main without authorizing a scaffold", () => {
    expect(proof).toMatchObject({
      schemaVersion: "1.1.0",
      status: "reproducible_coordinate_and_binary_checksum_proof_passed_pending_user_acceptance",
      sourceMainCommit: "55c6f16f1418d83e7711b632b75c6573c3190ca3",
      verifiedDate: "2026-10-20",
      productionDataUsed: false,
      externalActionsPerformed: false,
      projectScaffoldCreated: false,
      repositoryModifiedByProbe: false,
    });
    expect(asStrings(proof.remainingGates, "remainingGates")).toHaveLength(9);
  });

  it("locks the exact reproducible fixture and driver bytes", () => {
    const fixture = asObject(proof.probeFixture, "probeFixture");
    expect(fixture).toEqual({
      settingsPath: "contracts/mobile/android/foundation/v1/probe/settings.gradle.kts",
      settingsSha256: sha256(settings),
      buildPath: "contracts/mobile/android/foundation/v1/probe/build.gradle.kts",
      buildSha256: sha256(build),
      driverPath: "scripts/android-toolchain-proof.mjs",
      driverSha256: sha256(driver),
    });
  });

  it("uses only the approved repositories and exact coordinates", () => {
    const reproduction = asObject(proof.reproduction, "reproduction");
    expect(reproduction).toMatchObject({
      freshTemporaryProject: true,
      freshGradleUserHome: true,
      metadataLineEndings: "LF",
      repositories: ["google", "mavenCentral", "gradlePluginPortal"],
      retainedRawLogs: false,
    });
    expect(asStrings(reproduction.coordinates, "coordinates")).toEqual([
      "com.android.application:9.4.0",
      "org.jetbrains.kotlin.android:2.4.10",
      "org.jetbrains.kotlin.plugin.compose:2.4.10",
      "androidx.baselineprofile:1.5.0",
      "androidx.compose:compose-bom:2026.09.00",
      "androidx.compose.ui:ui:1.12.1",
      "androidx.profileinstaller:profileinstaller:1.4.1",
      "androidx.benchmark:benchmark-macro-junit4:1.5.0",
      "androidx.compose.ui:ui-android:1.12.1@aar",
      "androidx.profileinstaller:profileinstaller:1.4.1@aar",
      "androidx.benchmark:benchmark-macro-junit4:1.5.0@aar",
    ]);
  });

  it("retains the complete LF-normalized checksum graph", () => {
    expect(metadata).not.toContain("\r");
    expect(metadata.match(/<component /g)).toHaveLength(270);
    expect(metadata.match(/<artifact /g)).toHaveLength(440);
    expect(metadata.match(/<sha256 /g)).toHaveLength(440);
    expect(metadata.match(/<artifact name="[^"]+\.aar">/g)).toHaveLength(22);
    expect(asObject(proof.dependencyVerification, "dependencyVerification")).toEqual({
      mode: "strict_sha256",
      components: 270,
      artifacts: 440,
      sha256Entries: 440,
      aarEntries: 22,
      metadataPath: "contracts/mobile/android/foundation/v1/verification-metadata.xml",
      metadataSha256: sha256(metadata),
      freshOnlineGeneration: "passed",
      strictOfflineReplay: "passed",
    });
  });

  it("locks exact Compose, Profile Installer, and Macrobenchmark AAR bytes", () => {
    expect(asObjects(proof.binaryResolution, "binaryResolution")).toEqual([
      {
        coordinate: "androidx.compose.ui:ui-android:1.12.1@aar",
        fileName: "ui-android-1.12.1.aar",
        sha256: "3f1ae17e237d9dc0a2a0f42cb04b85b8de6e12f67adc5f5c12173fe31e501cb2",
      },
      {
        coordinate: "androidx.profileinstaller:profileinstaller:1.4.1@aar",
        fileName: "profileinstaller-1.4.1.aar",
        sha256: "b519f9317ded1e2c1c2993038c0692e30da326ca99097d9331ff2d3a5861a428",
      },
      {
        coordinate: "androidx.benchmark:benchmark-macro-junit4:1.5.0@aar",
        fileName: "benchmark-macro-junit4-1.5.0.aar",
        sha256: "a931079e084f7abdce788272ebaa67584a95a88214d214b409342d865df32c67",
      },
    ]);
    for (const entry of asObjects(proof.binaryResolution, "binaryResolution")) {
      expect(metadata).toMatch(
        new RegExp(
          `<artifact name="${entry.fileName as string}">[\\s\\S]*?<sha256 value="${entry.sha256 as string}"`,
        ),
      );
    }
  });

  it("records the exact JDK and Gradle runtime inputs", () => {
    expect(asObject(proof.probeEnvironment, "probeEnvironment")).toEqual({
      platform: "windows_x64",
      jdkVendor: "Eclipse Temurin",
      jdkVersion: "17.0.20.1+1",
      jdkArchiveSha256: "e53a79c3c3d86865bd7e787903884331068e71321714ffd44f145785affc7cb0",
      gradleVersion: "9.6.0",
      gradleDistributionSha256: "bbaeb2fef8710818cf0e261201dab964c572f92b942812df0c3620d62a529a01",
    });
  });

  it("keeps the probe outside apps/android and retains no generated Android project", () => {
    expect(settings).toContain('rootProject.name = "fluyo-android-toolchain-proof"');
    expect(build).toContain('tasks.register("resolveProof")');
    expect(build).not.toContain("android {");
    expect(driver).toContain("freshly generated metadata differs from retained metadata");
  });

  it("does not claim that coordinate proof is runtime or device evidence", () => {
    expect(asStrings(proof.observedResolutionNotes, "observedResolutionNotes")).toEqual([
      "AGP 9.4.0 requested Kotlin Gradle Plugin 2.2.10 transitively; the explicit root plugin pin selected 2.4.10.",
      "Compose BOM 2026.09.00 maps Compose UI to 1.12.1; both the mapped component and the exact ui-android AAR resolved.",
      "The proof resolved coordinates and exact AAR bytes only; it did not install Android SDK packages or compile an Android application.",
    ]);
  });

  it("contains no local path, identity, credential, production endpoint, or generated-only digest", () => {
    const serialized = [JSON.stringify(proof), settings, build, driver, metadata].join("\n");
    expect(serialized).not.toMatch(/[A-Z]:\\Users\\/i);
    expect(serialized).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(serialized).not.toMatch(/(?:password|accessToken|refreshToken|serviceRole)/i);
    expect(serialized).not.toMatch(/https?:\/\/(?:api|auth)\.fluyo\./i);
    expect(serialized).not.toContain("generatedMetadataSha256");
  });

  it("keeps every implementation and external gate open", () => {
    expect(asStrings(proof.remainingGates, "remainingGates")).toEqual([
      "marlon_accepts_android_baselines",
      "marlon_assigns_android_owner",
      "android_sdk_package_installation",
      "android_project_scaffold",
      "android_compile_and_test",
      "android_emulator_evidence",
      "physical_device_evidence",
      "release_or_play_signing",
      "production_or_store_actions",
    ]);
  });
});
