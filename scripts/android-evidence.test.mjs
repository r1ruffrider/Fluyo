import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { aggregate, generate, scenarioIdsByLeg } from "./android-evidence.mjs";

const policyPath = path.resolve("contracts/mobile/android/foundation/v1/foundation-policy.json");
const metadata = (source, leg) => ({
  sourceCommit: source,
  buildIdentifier: `1-1-${leg}`,
  runnerImage: "ubuntu-24.04",
  deviceModel: leg === "minimum" ? "small phone" : "large phone",
  deviceClass: leg === "minimum" ? "smallest_supported" : "large_current",
  deviceApi: leg === "minimum" ? 29 : 37,
  environment: leg === "minimum" ? "development" : "staging_and_inert_production",
  accessibilitySetting: "automated_matrix",
  command: "bounded Android foundation gate",
});

test("partitions all 27 applicable scenarios and leaves two physical rows", () => {
  assert.equal(scenarioIdsByLeg.minimum.length, 13);
  assert.equal(scenarioIdsByLeg.current.length, 14);
  assert.equal(new Set([...scenarioIdsByLeg.minimum, ...scenarioIdsByLeg.current]).size, 27);
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
