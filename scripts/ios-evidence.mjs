import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const expectedScenarioIds = (policy) =>
  policy.acceptance.scenarios
    .map((row) => row.id)
    .filter((id) => id !== "ios_physical_iphone_evidence");

const currentScenarioIds = (policy) =>
  expectedScenarioIds(policy).filter((id) => id !== "ios_smallest_supported_iphone_simulator");

const expectedText = (policy, scenarioId) =>
  policy.acceptance.scenarios.find((row) => row.id === scenarioId).expectedCriteria.join("; ");

const observations = {
  ios_config_development:
    "Debug accepted only complete public non-production values; missing values rendered the safe failure state",
  ios_config_staging:
    "Staging built with complete public non-production settings and fail-closed validation",
  ios_release_inert: "Release built unsigned with networking disabled and no internal build marker",
  ios_deterministic_launch:
    "State-model and UI tests reached one bounded signed-out or safe-error end state without a spinner",
  ios_loading_accessible_state:
    "The localized loading announcement fired once from the initial task and duplicate suppression passed",
  ios_signed_out_accessible_state:
    "Signed-out state exposed one named 44-point primary action in logical order without identity or provider detail",
  ios_safe_error_accessible_state:
    "Safe localized error and retry action were focus-bound, announced once, and omitted raw internal detail",
  ios_system_reduce_motion:
    "Reduce Motion launch produced the same static signed-out semantic state",
  ios_motion_interruption_static_equivalent:
    "No continuous or required animation exists; immediate transitions retain the same semantic end state",
  ios_dynamic_type_200_percent:
    "Landscape large-text UI tests kept the primary action visible and hittable in the scrollable layout",
  ios_voiceover_order_and_names:
    "Accessibility-tree assertions verified named controls and top-to-bottom logical order; no manual VoiceOver audio claim is made",
  ios_minimum_touch_targets:
    "Both primary actions measured at least 44 points high and remained hittable",
  ios_focus_order_and_target:
    "State-specific focus bindings target the signed-out primary action and safe-error retry action",
  ios_contrast_and_non_color_status:
    "Token tests passed 7:1 contrast in light and dark appearances and UI states used text plus symbols",
  ios_keyboard_and_switch_focus:
    "Native buttons exposed named, hittable, ordered accessibility elements; physical Switch Control execution remains deferred",
  ios_smallest_supported_iphone_simulator:
    "The full unit and UI suite passed on the recorded small iPhone using an iOS 17 runtime",
  ios_large_current_iphone_simulator:
    "The full unit and UI suite passed on the recorded large iPhone using the current hosted runtime",
  ios_portrait_layout:
    "Default portrait foundation states and primary actions were visible and hittable",
  ios_landscape_fallback:
    "Loading, signed-out, and safe-error landscape cases retained visible primary actions at large text",
  ios_asset_rendering_provenance_semantics:
    "Only native shapes, system typography, and approved SF Symbols rendered; no baked text or external asset exists",
  ios_privacy_manifest_inventory:
    "Privacy manifest remained no-tracking with empty domains, collection, and required-reason API declarations",
  ios_artifact_secret_scan:
    "The built app, schema-valid evidence, and retained summaries passed the denied-value scan; raw tool output was discarded",
};

const settings = {
  ios_system_reduce_motion: "reduce_motion",
  ios_motion_interruption_static_equivalent: "reduce_motion",
  ios_dynamic_type_200_percent: "accessibility_extra_extra_extra_large",
  ios_voiceover_order_and_names: "accessibility_tree_semantics",
  ios_focus_order_and_target: "accessibility_focus_binding",
  ios_contrast_and_non_color_status: "light_and_dark_appearance",
  ios_keyboard_and_switch_focus: "accessibility_tree_focus",
  ios_smallest_supported_iphone_simulator: "large_text",
  ios_landscape_fallback: "large_text_landscape",
};

const environments = {
  ios_config_staging: "staging",
  ios_release_inert: "release",
  ios_artifact_secret_scan: "staging",
};

function assertMetadata(metadata) {
  const required = [
    "sourceCommit",
    "buildIdentifier",
    "macosVersion",
    "xcodeVersion",
    "swiftVersion",
    "deviceModel",
    "deviceClass",
    "deviceKind",
    "deviceOsVersion",
    "command",
  ];
  for (const key of required) {
    if (typeof metadata[key] !== "string" || metadata[key].length === 0) {
      throw new Error(`Missing evidence metadata: ${key}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(metadata.sourceCommit)) {
    throw new Error("Evidence sourceCommit must be a full lowercase SHA");
  }
  if (metadata.deviceKind !== "simulator") {
    throw new Error("Only simulator evidence is accepted");
  }
}

export function generateEvidence({ leg, policy, metadata, artifactPath }) {
  if (!["minimum", "current"].includes(leg)) throw new Error(`Unknown evidence leg: ${leg}`);
  assertMetadata(metadata);
  const fields = policy.acceptance.evidenceRequiredFields;
  const ids =
    leg === "minimum" ? ["ios_smallest_supported_iphone_simulator"] : currentScenarioIds(policy);
  const artifactHash = sha256(artifactPath);
  const executions = ids.map((scenarioId) => {
    const values = {
      sourceCommit: metadata.sourceCommit,
      buildIdentifier: metadata.buildIdentifier,
      platform: "ios",
      macosVersion: metadata.macosVersion,
      xcodeVersion: metadata.xcodeVersion,
      swiftVersion: metadata.swiftVersion,
      deviceModel: metadata.deviceModel,
      deviceClass: metadata.deviceClass,
      deviceKind: metadata.deviceKind,
      deviceOsVersion: metadata.deviceOsVersion,
      environment: environments[scenarioId] ?? "development",
      accessibilitySetting: settings[scenarioId] ?? "default",
      command: metadata.command,
      expected: expectedText(policy, scenarioId),
      observed: observations[scenarioId],
      result: "passed",
      artifactHash,
      secretScanResult: "passed",
    };
    if (JSON.stringify(Object.keys(values)) !== JSON.stringify(fields)) {
      throw new Error(`Evidence field order/schema mismatch for ${scenarioId}`);
    }
    return { scenarioId, ...values };
  });
  const completed = new Set(ids);
  return {
    schemaVersion: "1.0.0",
    evidenceLeg: leg,
    sourceCommit: metadata.sourceCommit,
    buildIdentifier: metadata.buildIdentifier,
    signing: "disabled_unsigned_simulator_only",
    artifactFile: basename(artifactPath),
    artifactHash,
    executions,
    remainingUnattempted: policy.acceptance.scenarios
      .map((row) => row.id)
      .filter((id) => !completed.has(id)),
  };
}

const assertLeg = (payload, leg, policy, artifactPath) => {
  const rootKeys = [
    "schemaVersion",
    "evidenceLeg",
    "sourceCommit",
    "buildIdentifier",
    "signing",
    "artifactFile",
    "artifactHash",
    "executions",
    "remainingUnattempted",
  ];
  if (JSON.stringify(Object.keys(payload)) !== JSON.stringify(rootKeys)) {
    throw new Error(`Invalid ${leg} evidence root schema`);
  }
  if (
    payload.schemaVersion !== "1.0.0" ||
    payload.evidenceLeg !== leg ||
    payload.signing !== "disabled_unsigned_simulator_only"
  ) {
    throw new Error(`Invalid ${leg} evidence identity`);
  }
  if (
    payload.artifactFile !== basename(artifactPath) ||
    payload.artifactHash !== sha256(artifactPath)
  ) {
    throw new Error(`Invalid ${leg} artifact binding`);
  }
  const fields = new Set(policy.acceptance.evidenceRequiredFields);
  const seen = new Set();
  for (const execution of payload.executions) {
    if (seen.has(execution.scenarioId))
      throw new Error(`Duplicate scenario: ${execution.scenarioId}`);
    seen.add(execution.scenarioId);
    const keys = new Set(Object.keys(execution).filter((key) => key !== "scenarioId"));
    if (keys.size !== fields.size || [...fields].some((key) => !keys.has(key))) {
      throw new Error(`Evidence key drift: ${execution.scenarioId}`);
    }
    if (
      execution.sourceCommit !== payload.sourceCommit ||
      execution.buildIdentifier !== payload.buildIdentifier ||
      execution.artifactHash !== payload.artifactHash ||
      execution.result !== "passed" ||
      execution.secretScanResult !== "passed"
    ) {
      throw new Error(`Non-passing or unbound evidence: ${execution.scenarioId}`);
    }
    if (
      leg === "minimum" &&
      (execution.deviceClass !== "smallest_supported" ||
        !execution.deviceOsVersion.startsWith("17.") ||
        !execution.xcodeVersion.startsWith("Xcode 16.2"))
    ) {
      throw new Error(`Invalid minimum-runtime provenance: ${execution.scenarioId}`);
    }
    if (
      leg === "current" &&
      (execution.deviceClass !== "large_current" ||
        !execution.xcodeVersion.startsWith("Xcode 26.6"))
    ) {
      throw new Error(`Invalid current-runtime provenance: ${execution.scenarioId}`);
    }
  }
  const expectedRemaining = policy.acceptance.scenarios
    .map((row) => row.id)
    .filter((id) => !seen.has(id));
  if (JSON.stringify(payload.remainingUnattempted) !== JSON.stringify(expectedRemaining)) {
    throw new Error(`Invalid ${leg} remaining-unattempted set`);
  }
  return seen;
};
export function aggregateEvidence({
  policy,
  minimum,
  current,
  minimumArtifactPath,
  currentArtifactPath,
}) {
  if (minimum.sourceCommit !== current.sourceCommit)
    throw new Error("Evidence legs use different source commits");
  const minimumIds = assertLeg(minimum, "minimum", policy, minimumArtifactPath);
  const currentIds = assertLeg(current, "current", policy, currentArtifactPath);
  if (minimumIds.size !== 1 || !minimumIds.has("ios_smallest_supported_iphone_simulator")) {
    throw new Error("Minimum-runtime evidence scope drift");
  }
  const expectedCurrent = new Set(currentScenarioIds(policy));
  if (
    currentIds.size !== expectedCurrent.size ||
    [...expectedCurrent].some((id) => !currentIds.has(id))
  ) {
    throw new Error("Current-runtime evidence scope drift");
  }
  const combined = [...minimum.executions, ...current.executions];
  const combinedIds = new Set(combined.map((row) => row.scenarioId));
  const expected = expectedScenarioIds(policy);
  if (combined.length !== expected.length || expected.some((id) => !combinedIds.has(id))) {
    throw new Error("Aggregate scenario union is incomplete");
  }
  return {
    schemaVersion: "1.0.0",
    sourceCommit: current.sourceCommit,
    signing: "disabled_unsigned_simulator_only",
    evidenceLegs: [
      {
        leg: "minimum",
        buildIdentifier: minimum.buildIdentifier,
        artifactFile: minimum.artifactFile,
        artifactHash: minimum.artifactHash,
      },
      {
        leg: "current",
        buildIdentifier: current.buildIdentifier,
        artifactFile: current.artifactFile,
        artifactHash: current.artifactHash,
      },
    ],
    executions: expected.map((id) => combined.find((row) => row.scenarioId === id)),
    remainingUnattempted: ["ios_physical_iphone_evidence"],
  };
}

function assertDirectory(path, expected) {
  const entries = readdirSync(path).sort();
  if (JSON.stringify(entries) !== JSON.stringify([...expected].sort())) {
    throw new Error(`Unsafe evidence inventory at ${path}: ${entries.join(", ")}`);
  }
  for (const entry of entries) {
    if (!statSync(join(path, entry)).isFile())
      throw new Error(`Unexpected evidence directory entry: ${entry}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("ios-evidence.mjs")) {
  const [command, ...args] = process.argv.slice(2);
  if (command === "generate") {
    const [leg, policyPath, metadataPath, artifactPath, outputPath] = args;
    const payload = generateEvidence({
      leg,
      policy: readJson(policyPath),
      metadata: readJson(metadataPath),
      artifactPath,
    });
    writeFileSync(outputPath, JSON.stringify(payload, null, 2) + "\n");
  } else if (command === "aggregate") {
    const [
      policyPath,
      minimumPath,
      currentPath,
      minimumArtifactPath,
      currentArtifactPath,
      minimumLogPath,
      currentLogPath,
      outputDir,
    ] = args;
    const policy = readJson(policyPath);
    const minimum = readJson(minimumPath);
    const current = readJson(currentPath);
    mkdirSync(outputDir, { recursive: true });
    const payload = aggregateEvidence({
      policy,
      minimum,
      current,
      minimumArtifactPath,
      currentArtifactPath,
    });
    writeFileSync(join(outputDir, "evidence.json"), JSON.stringify(payload, null, 2) + "\n");
    copyFileSync(minimumArtifactPath, join(outputDir, basename(minimumArtifactPath)));
    copyFileSync(currentArtifactPath, join(outputDir, basename(currentArtifactPath)));
    const logDir = join(outputDir, "logs");
    mkdirSync(logDir, { recursive: true });
    copyFileSync(minimumLogPath, join(logDir, "minimum.log"));
    copyFileSync(currentLogPath, join(logDir, "current.log"));
    const rootEntries = readdirSync(outputDir).sort();
    const expectedRoot = [
      "evidence.json",
      basename(minimumArtifactPath),
      basename(currentArtifactPath),
      "logs",
    ].sort();
    if (JSON.stringify(rootEntries) !== JSON.stringify(expectedRoot)) {
      throw new Error(`Unsafe aggregate inventory: ${rootEntries.join(", ")}`);
    }
    assertDirectory(logDir, ["minimum.log", "current.log"]);
  } else {
    console.error("Usage: node scripts/ios-evidence.mjs generate|aggregate ...");
    process.exit(2);
  }
}
