import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { createNvdaLifecycle, NVDA_ADAPTER_PATHS } from "./nvda-adapter/index.mjs";
import {
  requiredPostBuildExclusionTargets,
  evaluatePostBuildExclusionTargets,
  evaluateLaterPlatformExclusionGates,
  FORBIDDEN_EXACT_FILE_SHA256,
  productionExclusionTesting,
  scanBuiltOutput,
  scanPackagedArtifact,
  scanProductionSourceTrees,
  validateHarnessInertness,
  validateLocalObservationExclusionPrerequisites,
  validateRepositoryDeploymentExclusion,
} from "./production-exclusion.mjs";

function storedZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, body] of entries) {
    const nameBytes = Buffer.from(name);
    const content = Buffer.from(body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, content);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + content.length;
  }
  const centralBytes = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBytes.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, eocd]);
}

test("proves static Vercel, workspace, web, Android, and iOS exclusion", () => {
  assert.deepEqual(validateRepositoryDeploymentExclusion(), {
    rootWorkspaceExcluded: true,
    vercelExcluded: true,
  });
  assert.deepEqual(scanProductionSourceTrees(), {
    scannedRoots: 7,
    rootFiles: 4,
    findingCount: 0,
  });
  assert.deepEqual(validateHarnessInertness(), {
    inert: true,
    outputRoot: "apps/r4b-preflight-harness/.next-attempt-002",
  });
  assert.equal(requiredPostBuildExclusionTargets().length, 7);
  assert.equal(
    evaluatePostBuildExclusionTargets().some(({ status }) => status === "BLOCKED"),
    true,
  );
  assert.deepEqual(evaluateLaterPlatformExclusionGates(), evaluatePostBuildExclusionTargets());
});

test("allows only the exact local evidence test scripts to name the isolated harness", () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-test-script-exclusion-"));
  try {
    writeFileSync(
      resolve(root, "package.json"),
      `${JSON.stringify({ scripts: { "test:audit-policy:unit": "node scripts/r4b-evidence/runner.mjs", "test:ci:portable": "npm run test:r4b:portable", "test:ci:windows-native": "npm run test:r4b:windows-native", "test:r4b:portable": "node scripts/r4b-evidence/runner.mjs", "test:r4b:windows-native": "node scripts/r4b-evidence/runner.mjs", "test:r4b:exact": "node scripts/r4b-evidence/runner.mjs" } })}\n`,
    );
    assert.deepEqual(scanProductionSourceTrees(root), {
      scannedRoots: 7,
      rootFiles: 4,
      findingCount: 0,
    });
    writeFileSync(
      resolve(root, "package.json"),
      `${JSON.stringify({ scripts: { build: "node scripts/r4b-evidence/runner.mjs" } })}\n`,
    );
    assert.throws(() => scanProductionSourceTrees(root), /production source contains preflight/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("separates Windows-local observation prerequisites from later platform artifacts", () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-local-exclusion-"));
  try {
    const harnessBuild = resolve(root, "harness-build");
    mkdirSync(harnessBuild, { recursive: true });
    assert.throws(
      () => validateLocalObservationExclusionPrerequisites(root, harnessBuild),
      /package\.json|workspace|ENOENT/u,
    );
    const later = evaluateLaterPlatformExclusionGates(root);
    assert.equal(later.length, 7);
    assert.equal(
      later.every(({ status }) => status === "BLOCKED"),
      true,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("requires exhaustive post-build output scans and rejects deploy inclusion", () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-production-exclusion-"));
  try {
    const clean = resolve(root, "clean");
    const contaminated = resolve(root, "contaminated");
    mkdirSync(clean);
    mkdirSync(contaminated);
    writeFileSync(resolve(clean, "output.js"), "production output");
    writeFileSync(resolve(contaminated, "output.js"), "attempt-002-observer");
    assert.equal(scanBuiltOutput(clean, { kind: "web-standalone" }).fileCount, 1);
    assert.throws(
      () => scanBuiltOutput(contaminated, { kind: "web-standalone" }),
      /includes preflight bytes/u,
    );
    assert.throws(
      () => scanBuiltOutput(resolve(root, "missing"), { kind: "android-apk-aab" }),
      /required but unattempted/u,
    );
    const cleanArchive = resolve(root, "clean.apk");
    const badArchive = resolve(root, "bad.ipa");
    writeFileSync(cleanArchive, storedZip([["classes.dex", "opaque production package"]]));
    writeFileSync(badArchive, storedZip([["Payload/app.bin", "nvda-adapter"]]));
    assert.match(
      scanPackagedArtifact(cleanArchive, { kind: "android-apk" }).sha256,
      /^[0-9a-f]{64}$/u,
    );
    assert.throws(
      () => scanPackagedArtifact(badArchive, { kind: "ios-ipa" }),
      /preflight markers/u,
    );
    const fixture = readFileSync(
      new URL("./fixtures/attempt-001/sanitized-result.fixture", import.meta.url),
    );
    assert.equal(FORBIDDEN_EXACT_FILE_SHA256.length, 2);
    const fixtureOutput = resolve(root, "fixture-contaminated");
    mkdirSync(fixtureOutput);
    const flattened = resolve(fixtureOutput, "clean-looking-production.json");
    writeFileSync(flattened, fixture);
    assert.throws(
      () => scanBuiltOutput(fixtureOutput, { kind: "web-standalone" }),
      /includes preflight bytes/u,
    );
    const archive = resolve(root, "renamed-fixture.apk");
    writeFileSync(archive, storedZip([["assets/config.json", fixture]]));
    assert.throws(
      () => scanPackagedArtifact(archive, { kind: "android-apk" }),
      /preflight markers/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("scans workflow, shell, PowerShell, and extensionless Docker deployment sources", () => {
  for (const path of [
    "ci.yml",
    "ci.yaml",
    "deploy.ps1",
    "deploy.sh",
    "Dockerfile",
    "Dockerfile.api",
  ]) {
    assert.equal(productionExclusionTesting.isProductionScannableFile(path), true);
  }
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-production-source-negative-"));
  try {
    mkdirSync(resolve(root, ".github/workflows"), { recursive: true });
    mkdirSync(resolve(root, "infrastructure/docker"), { recursive: true });
    writeFileSync(resolve(root, "package.json"), JSON.stringify({ workspaces: [], scripts: {} }));
    writeFileSync(resolve(root, ".github/workflows/ci.yml"), "run: nvda-adapter\n");
    writeFileSync(resolve(root, "infrastructure/docker/Dockerfile"), "COPY .r4b-preflight /x\n");
    assert.throws(() => scanProductionSourceTrees(root), /production source/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("binds NVDA only to the attempt raw root and never treats diagnostics as speech", () => {
  const lifecycle = createNvdaLifecycle(resolve(NVDA_ADAPTER_PATHS.portable, "nvda.exe"));
  assert.equal(lifecycle.diagnosticsAreTranscript, false);
  assert.equal(lifecycle.launch.includes("--disable-addons"), false);
  assert.equal(lifecycle.launch.includes("--no-sr-flag"), true);
  assert.equal(lifecycle.create.includes("--create-portable-silent"), true);
  assert.match(NVDA_ADAPTER_PATHS.preSpeechRequests, /attempt-002-observer[\\/]raw[\\/]nvda/u);
  assert.throws(() => createNvdaLifecycle("nvda.exe"), /fixed portable executable/u);
});
