import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { aggregateEvidence, generateEvidence } from "./ios-evidence.mjs";

const scenarioIds = [
  "ios_config_development",
  "ios_config_staging",
  "ios_release_inert",
  "ios_deterministic_launch",
  "ios_loading_accessible_state",
  "ios_signed_out_accessible_state",
  "ios_safe_error_accessible_state",
  "ios_system_reduce_motion",
  "ios_motion_interruption_static_equivalent",
  "ios_dynamic_type_200_percent",
  "ios_voiceover_order_and_names",
  "ios_minimum_touch_targets",
  "ios_focus_order_and_target",
  "ios_contrast_and_non_color_status",
  "ios_keyboard_and_switch_focus",
  "ios_smallest_supported_iphone_simulator",
  "ios_large_current_iphone_simulator",
  "ios_portrait_layout",
  "ios_landscape_fallback",
  "ios_asset_rendering_provenance_semantics",
  "ios_privacy_manifest_inventory",
  "ios_artifact_secret_scan",
  "ios_physical_iphone_evidence",
];
const fields = [
  "sourceCommit",
  "buildIdentifier",
  "platform",
  "macosVersion",
  "xcodeVersion",
  "swiftVersion",
  "deviceModel",
  "deviceClass",
  "deviceKind",
  "deviceOsVersion",
  "environment",
  "accessibilitySetting",
  "command",
  "expected",
  "observed",
  "result",
  "artifactHash",
  "secretScanResult",
];
const policy = {
  acceptance: {
    evidenceRequiredFields: fields,
    scenarios: scenarioIds.map((id) => ({ id, expectedCriteria: [`criterion for ${id}`] })),
  },
};
const base = {
  sourceCommit: "a".repeat(40),
  macosVersion: "26.0",
  xcodeVersion: "Xcode 26.6",
  swiftVersion: "Swift 6",
  deviceKind: "simulator",
};
const dir = mkdtempSync(join(tmpdir(), "fluyo-ios-evidence-"));
const minimumArtifact = join(dir, "minimum.zip");
const currentArtifact = join(dir, "current.zip");
writeFileSync(minimumArtifact, "minimum");
writeFileSync(currentArtifact, "current");

const minimum = generateEvidence({
  leg: "minimum",
  policy,
  metadata: {
    ...base,
    xcodeVersion: "Xcode 16.2",
    buildIdentifier: "1-minimum",
    deviceModel: "iPhone SE",
    deviceClass: "smallest_supported",
    deviceOsVersion: "17.5",
    command: "xcodebuild test minimum",
  },
  artifactPath: minimumArtifact,
});
const current = generateEvidence({
  leg: "current",
  policy,
  metadata: {
    ...base,
    buildIdentifier: "1-current",
    deviceModel: "iPhone Pro Max",
    deviceClass: "large_current",
    deviceOsVersion: "26.0",
    command: "xcodebuild test current",
  },
  artifactPath: currentArtifact,
});

test("minimum leg contains only the minimum-runtime scenario", () => {
  assert.deepEqual(
    minimum.executions.map((row) => row.scenarioId),
    ["ios_smallest_supported_iphone_simulator"],
  );
});

test("current leg excludes minimum and physical scenarios", () => {
  assert.equal(current.executions.length, 21);
  assert(
    !current.executions.some((row) => row.scenarioId === "ios_smallest_supported_iphone_simulator"),
  );
  assert(!current.executions.some((row) => row.scenarioId === "ios_physical_iphone_evidence"));
});

test("aggregate requires and orders the complete simulator scenario union", () => {
  const result = aggregateEvidence({
    policy,
    minimum,
    current,
    minimumArtifactPath: minimumArtifact,
    currentArtifactPath: currentArtifact,
  });
  assert.deepEqual(
    result.executions.map((row) => row.scenarioId),
    scenarioIds.slice(0, -1),
  );
  assert.deepEqual(result.remainingUnattempted, ["ios_physical_iphone_evidence"]);
});

test("aggregate rejects different source commits", () => {
  assert.throws(
    () =>
      aggregateEvidence({
        policy,
        minimum,
        current: { ...current, sourceCommit: "b".repeat(40) },
        minimumArtifactPath: minimumArtifact,
        currentArtifactPath: currentArtifact,
      }),
    /different source commits/,
  );
});

test("aggregate rejects an incomplete current leg", () => {
  assert.throws(
    () =>
      aggregateEvidence({
        policy,
        minimum,
        current: { ...current, executions: current.executions.slice(1) },
        minimumArtifactPath: minimumArtifact,
        currentArtifactPath: currentArtifact,
      }),
    /remaining-unattempted set|scope drift/,
  );
});

test("aggregate rejects root-schema drift", () => {
  assert.throws(
    () =>
      aggregateEvidence({
        policy,
        minimum: { ...minimum, unexpected: true },
        current,
        minimumArtifactPath: minimumArtifact,
        currentArtifactPath: currentArtifact,
      }),
    /root schema/,
  );
});

test("aggregate rejects minimum-runtime provenance drift", () => {
  const executions = minimum.executions.map((row) => ({ ...row, deviceOsVersion: "18.2" }));
  assert.throws(
    () =>
      aggregateEvidence({
        policy,
        minimum: { ...minimum, executions },
        current,
        minimumArtifactPath: minimumArtifact,
        currentArtifactPath: currentArtifact,
      }),
    /minimum-runtime provenance/,
  );
});

test("aggregate rejects remaining-scenario metadata drift", () => {
  assert.throws(
    () =>
      aggregateEvidence({
        policy,
        minimum: { ...minimum, remainingUnattempted: [] },
        current,
        minimumArtifactPath: minimumArtifact,
        currentArtifactPath: currentArtifact,
      }),
    /remaining-unattempted set/,
  );
});
test("CLI generates and aggregates a sanitized two-leg bundle", () => {
  const cliDir = mkdtempSync(join(tmpdir(), "fluyo-ios-evidence-cli-"));
  const policyPath = join(cliDir, "policy.json");
  const minimumMetadataPath = join(cliDir, "minimum-metadata.json");
  const currentMetadataPath = join(cliDir, "current-metadata.json");
  const minimumArtifactPath = join(cliDir, "Fluyo-minimum-simulator.zip");
  const currentArtifactPath = join(cliDir, "Fluyo-current-simulator.zip");
  const minimumEvidencePath = join(cliDir, "evidence-minimum.json");
  const currentEvidencePath = join(cliDir, "evidence-current.json");
  const minimumLogPath = join(cliDir, "minimum.log");
  const currentLogPath = join(cliDir, "current.log");
  const outputDir = join(cliDir, "aggregate");
  writeFileSync(policyPath, JSON.stringify(policy));
  writeFileSync(minimumArtifactPath, "minimum-cli");
  writeFileSync(currentArtifactPath, "current-cli");
  writeFileSync(minimumLogPath, "result=passed\n");
  writeFileSync(currentLogPath, "result=passed\n");
  writeFileSync(
    minimumMetadataPath,
    JSON.stringify({
      ...base,
      xcodeVersion: "Xcode 16.2",
      buildIdentifier: "cli-minimum",
      deviceModel: "iPhone SE",
      deviceClass: "smallest_supported",
      deviceOsVersion: "17.5",
      command: "xcodebuild minimum",
    }),
  );
  writeFileSync(
    currentMetadataPath,
    JSON.stringify({
      ...base,
      buildIdentifier: "cli-current",
      deviceModel: "iPhone Pro Max",
      deviceClass: "large_current",
      deviceOsVersion: "26.0",
      command: "xcodebuild current",
    }),
  );
  const run = (...args) => {
    const result = spawnSync(
      process.execPath,
      [join(import.meta.dirname, "ios-evidence.mjs"), ...args],
      {
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
  };
  run(
    "generate",
    "minimum",
    policyPath,
    minimumMetadataPath,
    minimumArtifactPath,
    minimumEvidencePath,
  );
  run(
    "generate",
    "current",
    policyPath,
    currentMetadataPath,
    currentArtifactPath,
    currentEvidencePath,
  );
  run(
    "aggregate",
    policyPath,
    minimumEvidencePath,
    currentEvidencePath,
    minimumArtifactPath,
    currentArtifactPath,
    minimumLogPath,
    currentLogPath,
    outputDir,
  );
  assert.deepEqual(readdirSync(outputDir).sort(), [
    "Fluyo-current-simulator.zip",
    "Fluyo-minimum-simulator.zip",
    "evidence.json",
    "logs",
  ]);
  assert.deepEqual(readdirSync(join(outputDir, "logs")).sort(), ["current.log", "minimum.log"]);
});
test("aggregate rejects artifact tampering", () => {
  writeFileSync(currentArtifact, "tampered");
  assert.throws(
    () =>
      aggregateEvidence({
        policy,
        minimum,
        current,
        minimumArtifactPath: minimumArtifact,
        currentArtifactPath: currentArtifact,
      }),
    /artifact binding/,
  );
});
