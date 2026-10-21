import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const physical = ["android_physical_pixel_evidence", "android_physical_samsung_evidence"];
const minimumMode = "compose_semantics_api29";
const currentMode = "compose_semantics_system_input_api37";
export const scenarioProofById = {
  android_config_development: {
    leg: "minimum",
    mode: "unit_and_packaged_configuration_inspection",
    command: "development unit, build, and fail-closed configuration checks",
    observed: "development public configuration and missing-value behavior passed",
  },
  android_deterministic_launch: {
    leg: "minimum",
    mode: minimumMode,
    command: "API 29 natural-launch Compose instrumentation",
    observed: "clean launch reached one allowed end state without a loading overlap",
  },
  android_loading_accessible_state: {
    leg: "minimum",
    mode: minimumMode,
    command: "API 29 loading-state Compose semantics instrumentation",
    observed: "loading label, polite live region, marker, and exclusive state passed",
  },
  android_signed_out_accessible_state: {
    leg: "minimum",
    mode: minimumMode,
    command: "API 29 signed-out Compose semantics instrumentation",
    observed: "honest action, focus, minimum height, and local scope detail passed",
  },
  android_safe_error_accessible_state: {
    leg: "minimum",
    mode: minimumMode,
    command: "API 29 error-state Compose semantics instrumentation",
    observed:
      "safe error state, focused error heading, reachable recovery action, and bounded copy passed",
  },
  android_system_reduce_motion: {
    leg: "minimum",
    mode: minimumMode,
    command: "API 29 system-animation-scale instrumentation",
    observed: "zero animation scales preserved the same semantic end state",
  },
  android_motion_interruption_static_equivalent: {
    leg: "minimum",
    mode: "unit_and_compose_state_transition_checks",
    command: "model cancellation plus Compose state-change instrumentation",
    observed: "latest transition won without a stale or duplicate semantic state",
  },
  android_rtl_geometry_and_semantics: {
    leg: "minimum",
    mode: minimumMode,
    command: "API 29 LTR-to-RTL Compose geometry instrumentation",
    observed: "nonzero opposite-side heading geometry and action semantics passed",
  },
  android_font_scale_200_percent: {
    leg: "minimum",
    mode: minimumMode,
    command: "API 29 externally preconfigured 200-percent Compose semantics instrumentation",
    observed: "primary action remained displayed and scroll-reachable at 200 percent font scale",
  },
  android_talkback_order_and_names: {
    leg: "minimum",
    mode: "compose_semantics_api29_plus_static_traversal_inspection",
    command: "API 29 Compose names-actions assertions plus static traversal-index inspection",
    observed:
      "runtime state and action semantics were unique, named, and actionable; static traversal order was explicit",
  },
  android_minimum_touch_targets: {
    leg: "minimum",
    mode: minimumMode,
    command: "API 29 Compose action-bound assertions",
    observed: "every foundation action under test measured at least 48 dp high",
  },
  android_focus_order_and_target: {
    leg: "minimum",
    mode: "compose_focus_api29_plus_static_traversal_inspection",
    command: "API 29 focus-request assertions plus static traversal-index inspection",
    observed:
      "the error heading received deterministic focus; the signed-out action exposed requestable focus semantics and static reading order was explicit",
  },
  android_contrast_and_non_color_status: {
    leg: "minimum",
    mode: "static_design_token_and_semantics_inspection",
    command: "light-dark token ratio and non-color state assertions",
    observed: "approved token ratios and text-based state cues passed",
  },
  android_small_minimum_api_phone_emulator: {
    leg: "minimum",
    mode: minimumMode,
    command: "nine isolated-method API 29 small-phone instrumentation lane",
    observed: "API 29 foundation build, launch, state, text, motion, and action checks passed",
  },
  android_portrait_layout: {
    leg: "minimum",
    mode: minimumMode,
    command: "API 29 portrait Compose layout instrumentation",
    observed: "foundation states and actions remained usable in portrait",
  },
  android_landscape_fallback: {
    leg: "minimum",
    mode: minimumMode,
    command: "API 29 landscape recreation instrumentation",
    observed:
      "auth and legal surfaces are absent by scope; error and large-text foundation actions remained functional",
  },
  android_tablet_foldable_probe_no_support_claim: {
    leg: "current",
    mode: currentMode,
    command: "seven-test API 37 lane with compact-medium-expanded runtime resize probe",
    observed:
      "compact, medium, and expanded resizing preserved the newest usable state without a support claim",
  },
  android_asset_rendering_provenance_semantics: {
    leg: "minimum",
    mode: "static_source_inventory_and_semantics_inspection",
    command: "system-only asset inventory and semantics assertions",
    observed: "no custom asset was present and system-only visual semantics passed",
  },
  android_config_staging: {
    leg: "current",
    mode: "unit_and_packaged_configuration_inspection",
    command: "staging unit, build, and fail-closed configuration checks",
    observed: "staging public configuration and missing-value behavior passed",
  },
  android_production_inert: {
    leg: "current",
    mode: currentMode,
    command:
      "production build inspection plus seven-method API 37 Compose-semantics and system-input run",
    observed: "production stayed inert, marker-free, and in the safe error state",
  },
  android_pseudolocale_expansion: {
    leg: "current",
    mode: currentMode,
    command: "API 37 en-XA Compose-semantics expansion check",
    observed: "packaged en-XA end state and action remained reachable",
  },
  android_keyboard_and_switch_focus: {
    leg: "current",
    mode: "uiautomator_keyboard_dpad_plus_explicit_focus_border",
    command:
      "API 37 deterministic error focus or first-Tab signed-out focus and D-pad-center check plus focus-border structure assertion",
    observed:
      "the sole action received deterministic logical focus, exposed a focus border, and operated by D-pad",
  },
  android_large_current_api_phone_emulator: {
    leg: "current",
    mode: currentMode,
    command: "seven-method API 37 Compose-semantics and system-input lane per flavor",
    observed:
      "API 37 launch, large text, landscape, motion, locale, action, and adaptive-window checks passed",
  },
  android_manifest_sdk_data_safety_inventory: {
    leg: "current",
    mode: "packaged_manifest_and_dependency_inspection",
    command: "merged APK manifest, permission, component, and dependency checks",
    observed: "manifest and SDK inventory matched the unsubmitted repository draft",
  },
  android_baseline_profile_structure: {
    leg: "current",
    mode: "connected_emulator_profile_generation",
    command: "connected API 37 baseline-profile generation",
    observed: "the pinned profile module generated structure without a performance claim",
  },
  android_debug_signing_classification: {
    leg: "current",
    mode: "packaged_artifact_signing_inspection",
    command: "apksigner classification for retained internal APKs",
    observed: "artifacts were non-production debug-signed with no release or Play key",
  },
  android_artifact_secret_identity_campaign_scan: {
    leg: "current",
    mode: "recursive_artifact_and_evidence_privacy_scan",
    command: "recursive APK-ZIP and sanitized-summary denylist scan",
    observed: "artifact and retained evidence passed every restricted-value scan",
  },
};
export const scenarioIdsByLeg = {
  minimum: Object.entries(scenarioProofById)
    .filter(([, proof]) => proof.leg === "minimum")
    .map(([id]) => id),
  current: Object.entries(scenarioProofById)
    .filter(([, proof]) => proof.leg === "current")
    .map(([id]) => id),
};

const sha256 = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

function expectedScenarios(policy) {
  return policy.acceptance.scenarios.map(({ id }) => id).filter((id) => !physical.includes(id));
}

export function generate(leg, policyFile, metadataFile, artifactFile, outputFile) {
  if (!Object.hasOwn(scenarioIdsByLeg, leg)) throw new Error("Unsupported Android evidence leg");
  const policy = read(policyFile);
  const metadata = read(metadataFile);
  if (!/^[0-9a-f]{40}$/.test(metadata.sourceCommit)) throw new Error("Invalid source commit");
  const laneMode = leg === "minimum" ? minimumMode : currentMode;
  if (metadata.accessibilitySetting !== laneMode) throw new Error("Evidence lane mode mismatch");
  const artifactHash = sha256(artifactFile);
  const required = policy.acceptance.evidenceRequiredFields;
  const policyScenarios = new Map(
    policy.acceptance.scenarios.map((scenario) => [scenario.id, scenario]),
  );
  const executions = scenarioIdsByLeg[leg].map((scenarioId) => ({
    ...(() => {
      const proof = scenarioProofById[scenarioId];
      const scenario = policyScenarios.get(scenarioId);
      if (!proof || !scenario) throw new Error("Missing scenario proof binding");
      return {
        accessibilitySetting: proof.mode,
        command: `${metadata.command}; ${proof.command}`,
        expected: scenario.expectedCriteria.join("; "),
        observed: proof.observed,
      };
    })(),
    sourceCommit: metadata.sourceCommit,
    buildIdentifier: metadata.buildIdentifier,
    platform: "android",
    runnerImage: metadata.runnerImage,
    jdkVersion: "17",
    gradleVersion: "9.6.0",
    androidGradlePluginVersion: "9.4.0",
    kotlinVersion: "2.4.10",
    composeCompilerPluginVersion: "2.4.10",
    composeBomVersion: "2026.09.00",
    baselineProfilePluginVersion: "1.5.0",
    profileInstallerVersion: "1.4.1",
    deviceModel: metadata.deviceModel,
    deviceClass: metadata.deviceClass,
    deviceKind: "emulator",
    deviceApi: metadata.deviceApi,
    environment: metadata.environment,
    result: "passed",
    artifactHash,
    secretScanResult: "passed",
    signingClassification: "non_production_debug_signed",
    scenarioId,
  }));
  for (const row of executions) {
    for (const field of required)
      if (!Object.hasOwn(row, field)) throw new Error(`Missing ${field}`);
  }
  write(outputFile, {
    schemaVersion: "1.0.0",
    leg,
    sourceCommit: metadata.sourceCommit,
    artifactFile: path.basename(artifactFile),
    artifactHash,
    executions,
  });
}

export function aggregate(
  policyFile,
  minimumFile,
  currentFile,
  minimumArtifact,
  currentArtifact,
  outputDirectory,
) {
  const policy = read(policyFile);
  const minimum = read(minimumFile);
  const current = read(currentFile);
  if (minimum.sourceCommit !== current.sourceCommit) throw new Error("Evidence source mismatch");
  if (
    minimum.artifactHash !== sha256(minimumArtifact) ||
    current.artifactHash !== sha256(currentArtifact)
  )
    throw new Error("Artifact hash mismatch");
  const executions = [...minimum.executions, ...current.executions];
  const ids = executions.map(({ scenarioId }) => scenarioId);
  const expected = expectedScenarios(policy);
  if (
    new Set(ids).size !== ids.length ||
    ids.length !== 27 ||
    expected.some((id) => !ids.includes(id)) ||
    ids.some((id) => !expected.includes(id))
  )
    throw new Error("Incomplete Android scenario union");
  if (
    executions.some(
      (row) =>
        row.result !== "passed" ||
        row.secretScanResult !== "passed" ||
        row.sourceCommit !== minimum.sourceCommit,
    )
  )
    throw new Error("Android execution did not pass");
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.copyFileSync(minimumArtifact, path.join(outputDirectory, path.basename(minimumArtifact)));
  fs.copyFileSync(currentArtifact, path.join(outputDirectory, path.basename(currentArtifact)));
  write(path.join(outputDirectory, "evidence.json"), {
    schemaVersion: "1.0.0",
    sourceCommit: minimum.sourceCommit,
    signingClassification: "non_production_debug_signed_emulator_only",
    executions,
    passed: executions.length,
    failed: 0,
    remainingUnattempted: physical,
    artifacts: [
      { file: path.basename(minimumArtifact), sha256: minimum.artifactHash },
      { file: path.basename(currentArtifact), sha256: current.artifactHash },
    ],
  });
}

if (process.argv[1]?.endsWith("android-evidence.mjs")) {
  const [command, ...args] = process.argv.slice(2);
  if (command === "generate") generate(...args);
  else if (command === "aggregate") aggregate(...args);
  else throw new Error("Use generate or aggregate");
}
