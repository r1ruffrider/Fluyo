import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const digest = "0e273eeddffd655f44ad86514da715c8925fadc99f093047e6d6ee1f6d33f214";
const ids = readFileSync("contracts/mobile/auth-runtime-synthetic/v1/vectors.tsv", "utf8")
  .trimEnd()
  .split("\n")
  .slice(1)
  .map((line) => line.split("\t")[1]);
const root = mkdtempSync(join(tmpdir(), "fluyo-android-auth-results-"));
const run = (...args) =>
  execFileSync(process.execPath, ["scripts/verify-android-auth-kernel-results.mjs", ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });
const testcase = (id, index, className = "com.fluyo.app.AuthRuntimeKernelTest") =>
  `<testcase name="canonicalScenarioOrInvariant[${index}:${id}@${digest}]" classname="${className}"/>`;
const xml = (cases, tests = 41) =>
  `<testsuite name="com.fluyo.app.AuthRuntimeKernelTest" tests="${tests}" skipped="0" failures="0" errors="0">${cases}</testsuite>`;

try {
  const dir = join(root, "results");
  mkdirSync(dir);
  const file = join(dir, "TEST-com.fluyo.app.AuthRuntimeKernelTest.xml");
  const validCases = ids.map((id, index) => testcase(id, index));
  writeFileSync(file, xml(validCases.join("")));
  assert.match(run(dir), /41 exact semantic identities/);

  const mutations = [
    validCases.slice(0, -1),
    [...validCases.slice(0, -1), validCases[0]],
    [validCases[1], validCases[0], ...validCases.slice(2)],
    [testcase(ids[0], 0, "wrong.Class"), ...validCases.slice(1)],
    [validCases[0].replace(digest, "f".repeat(64)), ...validCases.slice(1)],
  ];
  for (const cases of mutations) {
    writeFileSync(file, xml(cases.join(""), cases.length));
    assert.throws(() => run(dir));
  }

  const ios = join(root, "ios.log");
  const markers = ids.map((id, index) => `AUTH_KERNEL_VECTOR ${index} ${id} ${digest} PASS`);
  writeFileSync(ios, `${markers.join("\n")}\n`);
  assert.match(run("--ios-log", ios), /41 exact semantic identities/);
  for (const lines of [
    markers.slice(0, -1),
    [...markers.slice(0, -1), markers[0]],
    [markers[1], markers[0], ...markers.slice(2)],
  ]) {
    writeFileSync(ios, `${lines.join("\n")}\n`);
    assert.throws(() => run("--ios-log", ios));
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
