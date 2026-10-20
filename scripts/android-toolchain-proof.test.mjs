import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  inspectVerificationMetadata,
  normalizeLf,
  validateProofDescriptor,
} from "./android-toolchain-proof.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const proof = JSON.parse(
  read("contracts/mobile/android/foundation/v1/toolchain-resolution-proof.json"),
);
const sources = {
  settings: read("contracts/mobile/android/foundation/v1/probe/settings.gradle.kts"),
  build: read("contracts/mobile/android/foundation/v1/probe/build.gradle.kts"),
  driver: read("scripts/android-toolchain-proof.mjs"),
  metadata: read("contracts/mobile/android/foundation/v1/verification-metadata.xml"),
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const expectFailure = (label, callback) => {
  assert.throws(callback, undefined, label);
};

test("normalizes CRLF and CR bytes deterministically", () => {
  assert.equal(normalizeLf("one\r\ntwo\rthree\n"), "one\ntwo\nthree\n");
});

test("validates the retained descriptor, sources, binaries, and metadata", () => {
  const result = validateProofDescriptor(proof, sources);
  assert.deepEqual(
    {
      components: result.components,
      artifacts: result.artifacts,
      sha256Entries: result.sha256Entries,
      aarEntries: result.aarEntries,
    },
    { components: 270, artifacts: 440, sha256Entries: 440, aarEntries: 22 },
  );
});

test("fails closed on source baseline drift", () => {
  const changed = clone(proof);
  changed.sourceMainCommit = "0000000000000000000000000000000000000000";
  expectFailure("source drift", () => validateProofDescriptor(changed, sources));
});

test("fails closed on repository allowlist drift", () => {
  const changed = clone(proof);
  changed.reproduction.repositories.push("mavenLocal");
  expectFailure("repository drift", () => validateProofDescriptor(changed, sources));
});

test("fails closed on coordinate drift", () => {
  const changed = clone(proof);
  changed.reproduction.coordinates[0] = "com.android.application:9.4.1";
  expectFailure("coordinate drift", () => validateProofDescriptor(changed, sources));
});

test("fails closed on probe source drift", () => {
  expectFailure("build drift", () =>
    validateProofDescriptor(proof, {
      ...sources,
      build: sources.build.replace("9.4.0", "9.4.1"),
    }),
  );
});

test("fails closed on checksum metadata mutation", () => {
  const changedMetadata = sources.metadata.replace(
    /<sha256 value="[0-9a-f]{64}"/,
    '<sha256 value="' + "0".repeat(64) + '"',
  );
  expectFailure("checksum drift", () =>
    validateProofDescriptor(proof, { ...sources, metadata: changedMetadata }),
  );
});

test("fails closed when a required AAR is missing", () => {
  const changedMetadata = sources.metadata.replace(
    /\s*<artifact name="ui-android-1\.12\.1\.aar">[\s\S]*?<\/artifact>/,
    "",
  );
  expectFailure("AAR drift", () =>
    validateProofDescriptor(proof, { ...sources, metadata: changedMetadata }),
  );
});

test("locks exact required AAR bytes", () => {
  const inspected = inspectVerificationMetadata(sources.metadata);
  assert.deepEqual(
    Object.fromEntries(
      proof.binaryResolution.map((entry) => [
        entry.fileName,
        inspected.artifactsByName.get(entry.fileName),
      ]),
    ),
    {
      "ui-android-1.12.1.aar": "3f1ae17e237d9dc0a2a0f42cb04b85b8de6e12f67adc5f5c12173fe31e501cb2",
      "profileinstaller-1.4.1.aar":
        "b519f9317ded1e2c1c2993038c0692e30da326ca99097d9331ff2d3a5861a428",
      "benchmark-macro-junit4-1.5.0.aar":
        "a931079e084f7abdce788272ebaa67584a95a88214d214b409342d865df32c67",
    },
  );
});

test("retained proof sources contain no identity, credential, local path, or production endpoint", () => {
  const serialized = [JSON.stringify(proof), ...Object.values(sources)].join("\n");
  assert.doesNotMatch(serialized, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(serialized, /(?:password|accessToken|refreshToken|serviceRole)/i);
  assert.doesNotMatch(serialized, /[A-Z]:\\Users\\/i);
  assert.doesNotMatch(serialized, /https?:\/\/(?:api|auth)\.fluyo\./i);
});

test("retained metadata is LF-only and bound to its declared digest", () => {
  assert.equal(sources.metadata.includes("\r"), false);
  assert.equal(
    createHash("sha256").update(sources.metadata).digest("hex"),
    proof.dependencyVerification.metadataSha256,
  );
});
