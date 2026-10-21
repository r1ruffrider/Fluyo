import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { aggregate, generate, scenarioIdsByLeg, scenarioProofById } from "./android-evidence.mjs";

const policyPath = path.resolve("contracts/mobile/android/foundation/v1/foundation-policy.json");
const metadata = (source, leg) => ({
  sourceCommit: source,
  buildIdentifier: `1-1-${leg}`,
  runnerImage: "ubuntu-24.04",
  deviceModel: leg === "minimum" ? "small phone" : "large phone",
  deviceClass: leg === "minimum" ? "smallest_supported" : "large_current",
  deviceApi: leg === "minimum" ? 29 : 37,
  environment: leg === "minimum" ? "development" : "staging_and_inert_production",
  accessibilitySetting:
    leg === "minimum" ? "compose_semantics_api29" : "compose_semantics_system_input_api37",
  command:
    leg === "minimum"
      ? "pinned API 29 Compose semantics lane"
      : "pinned API 37 Compose-semantics plus system-input lane",
});

test("partitions all 27 applicable scenarios and leaves two physical rows", () => {
  assert.equal(scenarioIdsByLeg.minimum.length, 17);
  assert.equal(scenarioIdsByLeg.current.length, 10);
  assert.equal(new Set([...scenarioIdsByLeg.minimum, ...scenarioIdsByLeg.current]).size, 27);
  assert.equal(scenarioProofById.android_rtl_geometry_and_semantics.leg, "minimum");
  assert.equal(scenarioProofById.android_tablet_foldable_probe_no_support_claim.leg, "current");
  assert.match(
    scenarioProofById.android_tablet_foldable_probe_no_support_claim.command,
    /seven-test API 37 lane with compact-medium-expanded runtime resize probe/,
  );
  assert.match(
    scenarioProofById.android_large_current_api_phone_emulator.command,
    /seven-method API 37 Compose-semantics and system-input lane per flavor/,
  );
  assert.doesNotMatch(
    scenarioProofById.android_font_scale_200_percent.observed,
    /48 dp|touch target|pinned/i,
  );
  assert.match(scenarioProofById.android_minimum_touch_targets.observed, /at least 48 dp/i);
  assert.equal(scenarioProofById.android_pseudolocale_expansion.leg, "current");
  assert.equal(scenarioProofById.android_keyboard_and_switch_focus.leg, "current");
});

test("each scenario carries specific criteria and proof provenance", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-specific-proof-"));
  try {
    const source = "c".repeat(40);
    const metadataFile = path.join(dir, "minimum-metadata.json");
    const artifactFile = path.join(dir, "minimum.zip");
    const evidenceFile = path.join(dir, "minimum.json");
    fs.writeFileSync(metadataFile, JSON.stringify(metadata(source, "minimum")));
    fs.writeFileSync(artifactFile, "minimum artifact");
    generate("minimum", policyPath, metadataFile, artifactFile, evidenceFile);
    const result = JSON.parse(fs.readFileSync(evidenceFile, "utf8"));
    for (const row of result.executions) {
      assert.notEqual(row.expected, "all policy criteria for the named scenario");
      assert.notEqual(row.observed, "automated build, test, inspection, and privacy checks passed");
      assert.match(row.command, /; /);
      assert.equal(row.observed, scenarioProofById[row.scenarioId].observed);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("rejects evidence metadata that misstates the lane mode", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-lane-mode-"));
  try {
    const metadataFile = path.join(dir, "metadata.json");
    const artifactFile = path.join(dir, "artifact.zip");
    fs.writeFileSync(
      metadataFile,
      JSON.stringify({
        ...metadata("d".repeat(40), "current"),
        accessibilitySetting: "compose_semantics_api29",
      }),
    );
    fs.writeFileSync(artifactFile, "artifact");
    assert.throws(
      () => generate("current", policyPath, metadataFile, artifactFile, path.join(dir, "out.json")),
      /lane mode mismatch/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("generates and aggregates source-bound evidence", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-evidence-"));
  try {
    const source = "a".repeat(40);
    const files = Object.fromEntries(
      ["minimum", "current"].map((leg) => [
        leg,
        {
          metadata: path.join(dir, `${leg}-metadata.json`),
          artifact: path.join(dir, `${leg}.zip`),
          evidence: path.join(dir, `${leg}.json`),
        },
      ]),
    );
    for (const leg of ["minimum", "current"]) {
      fs.writeFileSync(files[leg].metadata, JSON.stringify(metadata(source, leg)));
      fs.writeFileSync(files[leg].artifact, `${leg} artifact`);
      generate(leg, policyPath, files[leg].metadata, files[leg].artifact, files[leg].evidence);
    }
    const output = path.join(dir, "aggregate");
    aggregate(
      policyPath,
      files.minimum.evidence,
      files.current.evidence,
      files.minimum.artifact,
      files.current.artifact,
      output,
    );
    const result = JSON.parse(fs.readFileSync(path.join(output, "evidence.json"), "utf8"));
    assert.equal(result.passed, 27);
    assert.equal(result.failed, 0);
    assert.deepEqual(result.remainingUnattempted, [
      "android_physical_pixel_evidence",
      "android_physical_samsung_evidence",
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("rejects source and artifact drift", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-drift-"));
  try {
    const source = "b".repeat(40);
    for (const leg of ["minimum", "current"]) {
      fs.writeFileSync(
        path.join(dir, `${leg}-metadata.json`),
        JSON.stringify(metadata(source, leg)),
      );
      fs.writeFileSync(path.join(dir, `${leg}.zip`), leg);
      generate(
        leg,
        policyPath,
        path.join(dir, `${leg}-metadata.json`),
        path.join(dir, `${leg}.zip`),
        path.join(dir, `${leg}.json`),
      );
    }
    fs.appendFileSync(path.join(dir, "current.zip"), "tamper");
    assert.throws(
      () =>
        aggregate(
          policyPath,
          path.join(dir, "minimum.json"),
          path.join(dir, "current.json"),
          path.join(dir, "minimum.zip"),
          path.join(dir, "current.zip"),
          path.join(dir, "out"),
        ),
      /hash mismatch/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
