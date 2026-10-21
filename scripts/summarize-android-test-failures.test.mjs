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
          frameworkFailureCategory: null,
          runtimeCategories: [],
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
        frameworkFailureCategory: null,
        runtimeCategories: [],
        sourceLine: null,
      },
    ]);
    assert.doesNotMatch(result.stdout, /example\.test|raw details/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("maps only exact bounded reachability sentinels from the failure body", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-summary-stage-"));
  try {
    const cases = [
      ["node count", "node_count"],
      ["scroll action", "scroll_action"],
      ["node geometry", "node_geometry"],
    ];
    for (const [sentinel, category] of cases) {
      fs.writeFileSync(
        path.join(root, "TEST-stage.xml"),
        `<testsuite><testcase classname="Shell" name="reachability"><failure message="opaque">java.lang.AssertionError: ${sentinel}\nlearner@example.test C:\\private\\path</failure></testcase></testsuite>`,
      );
      const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
      assert.equal(result.status, 0);
      assert.equal(JSON.parse(result.stdout).failures[0].category, category);
      assert.doesNotMatch(
        result.stdout,
        /example\.test|private|node count|scroll action|node geometry/i,
      );
    }
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
        frameworkFailureCategory: null,
        runtimeCategories: [],
        sourceLine: 109,
      },
    ]);
    assert.doesNotMatch(result.stdout, /bounds|width|height|example\.test/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("maps known runtime types to closed categories without retaining raw identifiers", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-summary-exception-"));
  try {
    fs.writeFileSync(
      path.join(root, "TEST-runtime.xml"),
      '<testsuite><testcase classname="Shell" name="launch"><error message="runtime error">java.lang.IllegalStateException: learner@example.test\nCaused by: opaque_sensitive_exception: C:\\private\\CustomerAccountError</error></testcase></testsuite>',
    );
    const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout).failures, [
      {
        className: "Shell",
        testName: "launch",
        kind: "error",
        category: "runtime_error",
        frameworkFailureCategory: null,
        runtimeCategories: ["illegal_state"],
        sourceLine: null,
      },
    ]);
    assert.doesNotMatch(
      result.stdout,
      /example\.test|private|runtime error|opaque_sensitive_exception|CustomerAccount/i,
    );
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

test("reports a fixed phase and category when failure occurs before structured reports", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-summary-phase-"));
  try {
    const result = spawnSync(process.execPath, [script, root, "--phase", "assemble_internal"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), {
      structuredReports: 0,
      failures: [],
      diagnostic: { phase: "assemble_internal", category: "pre_report_failure" },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects unapproved phase text without echoing it", () => {
  const result = spawnSync(
    process.execPath,
    [script, os.tmpdir(), "--phase", "learner@example.test/private"],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /example\.test|private/i);
});

test("maps orchestration crashes to fixed categories without retaining diagnostics", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-summary-crash-"));
  try {
    fs.writeFileSync(
      path.join(root, "TEST-crash.xml"),
      '<testsuite><testcase classname="Shell" name="launch"><failure message="Test failed to run to completion. Instrumentation run failed because process crashed: learner@example.test provider-private-sentinel">raw detail</failure></testcase></testsuite>',
    );
    const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout).failures[0].runtimeCategories, [
      "instrumentation_abort",
      "process_crash",
    ]);
    assert.doesNotMatch(result.stdout, /example\.test|provider-private-sentinel|raw detail/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("maps infrastructure and launch failures to fixed categories without retaining diagnostics", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-summary-infrastructure-"));
  try {
    fs.writeFileSync(
      path.join(root, "TEST-infrastructure.xml"),
      '<testsuite><testcase classname="Shell" name="launch"><failure message="Test run failed to complete because the emulator became unavailable: learner@example.test">Unable to resolve activity C:\\private\\path</failure></testcase></testsuite>',
    );
    const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout).failures[0].runtimeCategories, [
      "instrumentation_abort",
      "activity_launch",
      "device_infrastructure",
    ]);
    assert.doesNotMatch(result.stdout, /example\.test|private|emulator became unavailable/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("maps only exact framework failure types to fixed categories", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-summary-type-"));
  try {
    fs.writeFileSync(
      path.join(root, "TEST-type.xml"),
      '<testsuite><testcase classname="Shell" name="launch"><failure type="java.lang.AssertionError" message="learner@example.test">C:\\private\\path</failure></testcase></testsuite>',
    );
    const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).failures[0].frameworkFailureCategory, "assertion");
    assert.doesNotMatch(result.stdout, /example\.test|private/i);

    fs.writeFileSync(
      path.join(root, "TEST-type.xml"),
      '<testsuite><testcase classname="Shell" name="launch"><failure type="com.android.provider.private.CustomerIdentityException">raw</failure></testcase></testsuite>',
    );
    const denied = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
    assert.equal(JSON.parse(denied.stdout).failures[0].frameworkFailureCategory, null);
    assert.doesNotMatch(denied.stdout, /provider|CustomerIdentity|com\.android/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
