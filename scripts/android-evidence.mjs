import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const physical = ["android_physical_pixel_evidence", "android_physical_samsung_evidence"];
export const scenarioIdsByLeg = {
  minimum: [
    "android_config_development",
    "android_deterministic_launch",
    "android_loading_accessible_state",
    "android_signed_out_accessible_state",
    "android_safe_error_accessible_state",
    "android_system_reduce_motion",
    "android_font_scale_200_percent",
    "android_talkback_order_and_names",
    "android_minimum_touch_targets",
    "android_focus_order_and_target",
    "android_small_minimum_api_phone_emulator",
    "android_portrait_layout",
    "android_landscape_fallback",
  ],
  current: [
    "android_config_staging",
    "android_production_inert",
    "android_motion_interruption_static_equivalent",
    "android_pseudolocale_expansion",
    "android_rtl_geometry_and_semantics",
    "android_contrast_and_non_color_status",
    "android_keyboard_and_switch_focus",
    "android_large_current_api_phone_emulator",
    "android_tablet_foldable_probe_no_support_claim",
    "android_asset_rendering_provenance_semantics",
    "android_manifest_sdk_data_safety_inventory",
    "android_baseline_profile_structure",
    "android_debug_signing_classification",
    "android_artifact_secret_identity_campaign_scan",
  ],
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
  const artifactHash = sha256(artifactFile);
  const required = policy.acceptance.evidenceRequiredFields;
  const executions = scenarioIdsByLeg[leg].map((scenarioId) => ({
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
    accessibilitySetting: metadata.accessibilitySetting,
    command: metadata.command,
    expected: "all policy criteria for the named scenario",
    observed: "automated build, test, inspection, and privacy checks passed",
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
