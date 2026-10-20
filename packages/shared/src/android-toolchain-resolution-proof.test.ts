import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;

const contractDirectory = resolve(__dirname, "../../../contracts/mobile/android/foundation/v1");
const proof = JSON.parse(
  readFileSync(resolve(contractDirectory, "toolchain-resolution-proof.json"), "utf8"),
) as JsonObject;
const verificationMetadata = readFileSync(
  resolve(contractDirectory, "verification-metadata.xml"),
  "utf8",
);

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

const sha256Pattern = /^[0-9a-f]{64}$/;

describe("Android toolchain resolution proof", () => {
  it("binds the isolated proof to merged main without authorizing a scaffold", () => {
    expect(proof).toMatchObject({
      schemaVersion: "1.0.0",
      status: "coordinate_resolution_and_checksum_proof_passed_pending_user_acceptance",
      sourceMainCommit: "55c6f16f1418d83e7711b632b75c6573c3190ca3",
      verifiedDate: "2026-10-20",
      productionDataUsed: false,
      externalActionsPerformed: false,
      projectScaffoldCreated: false,
      repositoryModifiedByProbe: false,
    });
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

  it("records the exact JDK and checksum-verified Gradle runtime", () => {
    expect(asObject(proof.probeEnvironment, "probeEnvironment")).toEqual({
      platform: "windows_x64",
      jdkVendor: "Eclipse Temurin",
      jdkVersion: "17.0.20.1+1",
      jdkArchiveSha256: "e53a79c3c3d86865bd7e787903884331068e71321714ffd44f145785affc7cb0",
      gradleVersion: "9.6.0",
      gradleDistributionSha256: "bbaeb2fef8710818cf0e261201dab964c572f92b942812df0c3620d62a529a01",
    });
  });

  it("locks every proposed plugin marker and implementation coordinate", () => {
    expect(asObjects(proof.pluginResolution, "pluginResolution")).toEqual([
      {
        pluginId: "com.android.application",
        version: "9.4.0",
        marker: "com.android.application:com.android.application.gradle.plugin:9.4.0",
        implementation: "com.android.tools.build:gradle:9.4.0",
      },
      {
        pluginId: "org.jetbrains.kotlin.android",
        version: "2.4.10",
        marker: "org.jetbrains.kotlin.android:org.jetbrains.kotlin.android.gradle.plugin:2.4.10",
        implementation: "org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.10",
      },
      {
        pluginId: "org.jetbrains.kotlin.plugin.compose",
        version: "2.4.10",
        marker:
          "org.jetbrains.kotlin.plugin.compose:org.jetbrains.kotlin.plugin.compose.gradle.plugin:2.4.10",
        implementation: "org.jetbrains.kotlin:compose-compiler-gradle-plugin:2.4.10",
      },
      {
        pluginId: "androidx.baselineprofile",
        version: "1.5.0",
        marker: "androidx.baselineprofile:androidx.baselineprofile.gradle.plugin:1.5.0",
        implementation: "androidx.benchmark:benchmark-baseline-profile-gradle-plugin:1.5.0",
      },
    ]);
  });

  it("records the BOM mapping and libraries resolved in both modes", () => {
    expect(asObjects(proof.libraryResolution, "libraryResolution")).toEqual([
      { coordinate: "androidx.compose:compose-bom:2026.09.00", resolution: "passed" },
      {
        coordinate: "androidx.compose.ui:ui:1.12.1",
        resolution: "passed",
        source: "compose_bom_2026.09.00_mapping",
      },
      {
        coordinate: "androidx.profileinstaller:profileinstaller:1.4.1",
        resolution: "passed",
      },
      {
        coordinate: "androidx.benchmark:benchmark-macro-junit4:1.5.0",
        resolution: "passed",
      },
    ]);
    expect(asObjects(proof.executions, "executions")).toEqual([
      {
        mode: "online_refresh",
        command:
          "gradle --no-daemon --non-interactive --refresh-dependencies buildEnvironment resolveProof --console=plain",
        result: "passed",
      },
      {
        mode: "offline_strict",
        command:
          "gradle --offline --dependency-verification strict --no-daemon --non-interactive buildEnvironment resolveProof --console=plain",
        result: "passed",
      },
    ]);
  });

  it("locks strict checksum evidence for the complete resolved graph", () => {
    expect(asObject(proof.dependencyVerification, "dependencyVerification")).toEqual({
      mode: "strict_sha256",
      components: 267,
      artifacts: 378,
      sha256Entries: 378,
      metadataPath: "contracts/mobile/android/foundation/v1/verification-metadata.xml",
      generatedMetadataSha256: "c596b254b195a8d32a9d67fa49f45d6740e763ca062cfe4dc93c20ec765939c0",
      metadataSha256: "1b38f10259fd74e2220cb4e98e6900be57fe0787622ec0928638a1a0b1571a8f",
      strictOfflineReplay: "passed",
    });
  });

  it("retains the complete sanitized Gradle verification graph", () => {
    expect(verificationMetadata.match(/<component /g)).toHaveLength(267);
    expect(verificationMetadata.match(/<artifact /g)).toHaveLength(378);
    expect(verificationMetadata.match(/<sha256 /g)).toHaveLength(378);
    expect(createHash("sha256").update(verificationMetadata).digest("hex")).toBe(
      "1b38f10259fd74e2220cb4e98e6900be57fe0787622ec0928638a1a0b1571a8f",
    );
    expect(verificationMetadata).not.toMatch(/[A-Z]:\\/i);
    expect(verificationMetadata).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(verificationMetadata).not.toMatch(
      /(?:password|secret|token|service.?role|private.?key)/i,
    );
  });

  it("restricts metadata evidence to official repositories and exact hashes", () => {
    const checks = asObjects(proof.artifactMetadataChecks, "artifactMetadataChecks");
    expect(checks).toHaveLength(12);
    const names = checks.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
    for (const entry of checks) {
      expect(typeof entry.url).toBe("string");
      const url = new URL(entry.url as string);
      expect(["dl.google.com", "repo1.maven.org"]).toContain(url.hostname);
      expect(url.protocol).toBe("https:");
      expect(url.search).toBe("");
      expect(entry.sha256).toMatch(sha256Pattern);
    }
  });

  it("contains no local path, identity, credential, or completion claim", () => {
    const serialized = JSON.stringify(proof);
    expect(serialized).not.toMatch(/[A-Z]:\\/i);
    expect(serialized).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(serialized).not.toMatch(/(?:password|accessToken|refreshToken|serviceRole)/i);
    expect(serialized).not.toMatch(/(?:scaffoldAuthorized|completionClaimAllowed)":true/i);
    expect(asStrings(proof.observedResolutionNotes, "observedResolutionNotes")).toHaveLength(3);
  });
});
