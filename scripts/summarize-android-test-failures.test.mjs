import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = path.resolve("scripts/summarize-android-test-failures.mjs");

test("reports only bounded test identity and failure kind", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-summary-"));
  try {
    fs.writeFileSync(
      path.join(root, "TEST-foundation.xml"),
      '<testsuite><testcase classname="com.fluyo.FoundationShellTest" name="loadingHasOneState"><failure message="learner@example.test C:\\private\\path">raw token</failure></testcase></testsuite>',
    );
    const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), {
      structuredReports: 1,
      failures: [
        {
          className: "com.fluyo.FoundationShellTest",
          testName: "loadingHasOneState",
          kind: "failure",
          category: "assertion",
          exceptionTypes: [],
          sourceLine: null,
        },
      ],
    });
    assert.doesNotMatch(result.stdout, /example\.test|private|token/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("maps raw assertion details to a closed category without retaining text", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-summary-category-"));
  try {
    fs.writeFileSync(
      path.join(root, "TEST-visibility.xml"),
      '<testsuite><testcase classname="Shell" name="largeText"><failure message="Node is not displayed; learner@example.test">raw details</failure></testcase></testsuite>',
    );
    const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout).failures, [
      {
        className: "Shell",
        testName: "largeText",
        kind: "failure",
        category: "visibility",
        exceptionTypes: [],
        sourceLine: null,
      },
    ]);
    assert.doesNotMatch(result.stdout, /example\.test|raw details/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("ignores semantics-tree bounds outside the failure message", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-summary-body-"));
  try {
    fs.writeFileSync(
      path.join(root, "TEST-count.xml"),
      '<testsuite><testcase classname="Shell" name="marker"><failure message="Expected exactly 0 nodes but found 1">at com.fluyo.app.FoundationShellTest.marker(FoundationShellTest.kt:109) boundsInRoot width height learner@example.test</failure></testcase></testsuite>',
    );
    const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout).failures, [
      {
        className: "Shell",
        testName: "marker",
        kind: "failure",
        category: "count",
        exceptionTypes: [],
        sourceLine: 109,
      },
    ]);
    assert.doesNotMatch(result.stdout, /bounds|width|height|example\.test/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports only bounded exception class names from runtime failures", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-summary-exception-"));
  try {
    fs.writeFileSync(
      path.join(root, "TEST-runtime.xml"),
      '<testsuite><testcase classname="Shell" name="launch"><error message="runtime error">java.lang.IllegalStateException: learner@example.test\nCaused by: android.app.ForegroundServiceStartNotAllowedException: C:\\private\\path</error></testcase></testsuite>',
    );
    const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout).failures, [
      {
        className: "Shell",
        testName: "launch",
        kind: "error",
        category: "runtime_error",
        exceptionTypes: [
          "android.app.ForegroundServiceStartNotAllowedException",
          "java.lang.IllegalStateException",
        ],
        sourceLine: null,
      },
    ]);
    assert.doesNotMatch(result.stdout, /example\.test|private|runtime error/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports an empty bounded summary when failure occurred before instrumentation", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-summary-empty-"));
  try {
    const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), { structuredReports: 0, failures: [] });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
