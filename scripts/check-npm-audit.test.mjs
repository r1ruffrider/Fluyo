import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAuditPolicy } from "./check-npm-audit.mjs";

const advisory = {
  source: 1,
  name: "example-package",
  dependency: "example-package",
  title: "Example high advisory",
  url: "https://github.com/advisories/GHSA-1111-2222-3333",
  severity: "high",
  range: "<2.0.0",
};

function fixture() {
  return {
    audit: {
      vulnerabilities: {
        "example-package": {
          name: "example-package",
          severity: "high",
          isDirect: false,
          via: [{ ...advisory }],
          effects: ["parent-package"],
          range: "<2.0.0",
          nodes: ["node_modules/example-package"],
          fixAvailable: false,
        },
        "parent-package": {
          name: "parent-package",
          severity: "high",
          isDirect: true,
          via: ["example-package"],
          effects: [],
          range: "*",
          nodes: ["node_modules/parent-package"],
          fixAvailable: false,
        },
      },
    },
    lock: {
      packages: {
        "node_modules/example-package": {
          version: "1.2.3",
        },
      },
    },
    policy: {
      schemaVersion: 1,
      minimumSeverity: "high",
      exceptions: [
        {
          advisoryId: "GHSA-1111-2222-3333",
          package: "example-package",
          severity: "high",
          vulnerableRange: "<2.0.0",
          nodes: ["node_modules/example-package"],
          installedVersions: ["1.2.3"],
          classification: "development-only",
          dependencyPath: "parent-package -> example-package",
          attemptedRemediation: "No supported parent release is available.",
          trackingIssue: "https://github.com/r1ruffrider/Fluyo/issues/123",
          expiresOn: "2026-08-31",
        },
      ],
    },
    now: new Date("2026-07-25T00:00:00Z"),
  };
}

test("accepts only an exact, unexpired advisory match", () => {
  const result = evaluateAuditPolicy(fixture());

  assert.equal(result.ok, true);
  assert.equal(result.accepted.length, 1);
  assert.deepEqual(result.errors, []);
});

test("rejects a new high-severity advisory", () => {
  const input = fixture();
  input.audit.vulnerabilities["new-package"] = {
    name: "new-package",
    severity: "high",
    isDirect: false,
    via: [
      {
        ...advisory,
        name: "new-package",
        dependency: "new-package",
        url: "https://github.com/advisories/GHSA-4444-5555-6666",
      },
    ],
    effects: [],
    range: "<2.0.0",
    nodes: ["node_modules/new-package"],
    fixAvailable: false,
  };

  const result = evaluateAuditPolicy(input);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Unapproved high advisory GHSA-4444-5555-6666/);
});

test("rejects an expired exception", () => {
  const input = fixture();
  input.now = new Date("2026-09-01T00:00:00Z");

  const result = evaluateAuditPolicy(input);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /expired on 2026-08-31/);
});

test("rejects dependency-node or installed-version drift", () => {
  const input = fixture();
  input.audit.vulnerabilities["example-package"].nodes = [
    "node_modules/parent-package/node_modules/example-package",
  ];

  const result = evaluateAuditPolicy(input);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /dependency nodes changed/);
  assert.match(result.errors.join("\n"), /installed version changed/);
});

test("rejects severity escalation", () => {
  const input = fixture();
  input.audit.vulnerabilities["example-package"].via[0].severity = "critical";
  input.audit.vulnerabilities["example-package"].severity = "critical";

  const result = evaluateAuditPolicy(input);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /severity changed/);
});

test("rejects stale exceptions after an advisory disappears", () => {
  const input = fixture();
  input.audit.vulnerabilities = {};

  const result = evaluateAuditPolicy(input);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Remove its stale exception/);
});
