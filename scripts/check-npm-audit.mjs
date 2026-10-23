#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const severityRank = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sameValues(left, right) {
  return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}

function advisoryIdFromUrl(url) {
  const match = /\/(GHSA-[a-z0-9-]+)$/i.exec(url ?? "");
  return match?.[1]?.toUpperCase();
}

function dependencyCoordinate(value) {
  const separator = value.lastIndexOf("@");
  if (separator <= 0 || separator === value.length - 1) {
    return undefined;
  }

  return {
    name: value.slice(0, separator),
    version: value.slice(separator + 1),
  };
}

function lockEntriesForPackage(lock, name) {
  const suffix = `node_modules/${name}`;
  return Object.entries(lock.packages ?? {}).filter(
    ([path]) => path === suffix || path.endsWith(`/${suffix}`),
  );
}

function validateDependencyPath(exception, lock, errors) {
  if (typeof exception.dependencyPath !== "string" || exception.dependencyPath.trim() === "") {
    return;
  }

  const coordinates = exception.dependencyPath
    .split(/\s*->\s*/)
    .map((value) => dependencyCoordinate(value));

  if (coordinates.some((coordinate) => coordinate === undefined)) {
    errors.push(
      `${exception.advisoryId ?? "Unknown exception"} dependencyPath must use exact package@version coordinates.`,
    );
    return;
  }

  for (let index = 0; index < coordinates.length; index += 1) {
    const coordinate = coordinates[index];
    const entries = lockEntriesForPackage(lock, coordinate.name).filter(
      ([, metadata]) => metadata.version === coordinate.version,
    );

    if (entries.length === 0) {
      errors.push(
        `${exception.advisoryId} dependencyPath version is not installed: ${coordinate.name}@${coordinate.version}.`,
      );
      continue;
    }

    const child = coordinates[index + 1];
    if (
      child &&
      !entries.some(([, metadata]) =>
        [metadata.dependencies, metadata.optionalDependencies, metadata.peerDependencies].some(
          (dependencies) => Object.hasOwn(dependencies ?? {}, child.name),
        ),
      )
    ) {
      errors.push(
        `${exception.advisoryId} dependencyPath edge is not present: ${coordinate.name} -> ${child.name}.`,
      );
    }
  }

  const leaf = coordinates.at(-1);
  if (
    leaf &&
    (leaf.name !== exception.package || !exception.installedVersions?.includes(leaf.version))
  ) {
    errors.push(`${exception.advisoryId} dependencyPath leaf does not match the accepted package.`);
  }
}

function validateException(exception, errors, now) {
  const requiredStrings = [
    "advisoryId",
    "package",
    "severity",
    "vulnerableRange",
    "classification",
    "dependencyPath",
    "attemptedRemediation",
    "trackingIssue",
    "expiresOn",
  ];

  for (const field of requiredStrings) {
    if (typeof exception[field] !== "string" || exception[field].trim() === "") {
      errors.push(`${exception.advisoryId ?? "Unknown exception"} is missing ${field}.`);
    }
  }

  if (!/^GHSA-[A-Z0-9-]+$/i.test(exception.advisoryId ?? "")) {
    errors.push(`${exception.advisoryId ?? "Unknown exception"} has an invalid advisory ID.`);
  }

  if ((severityRank[exception.severity] ?? -1) < severityRank.high) {
    errors.push(`${exception.advisoryId} is below the high-severity policy threshold.`);
  }

  if (!Array.isArray(exception.nodes) || exception.nodes.length === 0) {
    errors.push(`${exception.advisoryId} must declare at least one exact dependency node.`);
  }

  if (!Array.isArray(exception.installedVersions) || exception.installedVersions.length === 0) {
    errors.push(`${exception.advisoryId} must declare at least one exact installed version.`);
  }

  if (
    typeof exception.trackingIssue === "string" &&
    !/^https:\/\/github\.com\/r1ruffrider\/Fluyo\/issues\/\d+$/.test(exception.trackingIssue)
  ) {
    errors.push(`${exception.advisoryId} must reference a Fluyo GitHub tracking issue.`);
  }

  const expiresAt = new Date(`${exception.expiresOn}T23:59:59.999Z`);
  if (Number.isNaN(expiresAt.getTime())) {
    errors.push(`${exception.advisoryId} has an invalid expiration date.`);
  } else if (now.getTime() > expiresAt.getTime()) {
    errors.push(`${exception.advisoryId} expired on ${exception.expiresOn}.`);
  }
}

export function evaluateAuditPolicy({ audit, lock, policy, now = new Date() }) {
  const errors = [];
  const accepted = [];

  if (policy.schemaVersion !== 1) {
    errors.push(`Unsupported audit-policy schema version: ${policy.schemaVersion}.`);
  }

  if (policy.minimumSeverity !== "high") {
    errors.push("The audit-policy threshold must remain high.");
  }

  if (!Array.isArray(policy.exceptions)) {
    return { ok: false, errors: ["Audit-policy exceptions must be an array."], accepted };
  }

  const exceptions = new Map();
  for (const exception of policy.exceptions) {
    validateException(exception, errors, now);
    validateDependencyPath(exception, lock, errors);
    const advisoryId = exception.advisoryId?.toUpperCase();
    if (exceptions.has(advisoryId)) {
      errors.push(`Duplicate exception for ${exception.advisoryId}.`);
    }
    exceptions.set(advisoryId, exception);
  }

  const observed = new Set();
  const acceptedObjects = new Set();
  const vulnerabilities = audit.vulnerabilities ?? {};

  for (const [entryName, vulnerability] of Object.entries(vulnerabilities)) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via !== "object" || severityRank[via.severity] < severityRank.high) {
        continue;
      }

      const advisoryId = advisoryIdFromUrl(via.url);
      const exception = advisoryId ? exceptions.get(advisoryId) : undefined;
      if (!exception) {
        errors.push(
          `Unapproved ${via.severity} advisory ${advisoryId ?? via.url ?? "without an ID"} affects ${via.name ?? entryName}.`,
        );
        continue;
      }

      observed.add(advisoryId);

      if (exception.package !== via.name || exception.package !== entryName) {
        errors.push(
          `${advisoryId} package changed: expected ${exception.package}, observed ${via.name ?? entryName}.`,
        );
      }

      if (exception.severity !== via.severity) {
        errors.push(
          `${advisoryId} severity changed: expected ${exception.severity}, observed ${via.severity}.`,
        );
      }

      if (exception.vulnerableRange !== via.range) {
        errors.push(
          `${advisoryId} vulnerable range changed: expected ${exception.vulnerableRange}, observed ${via.range}.`,
        );
      }

      const nodes = vulnerability.nodes ?? [];
      if (!sameValues(exception.nodes, nodes)) {
        errors.push(
          `${advisoryId} dependency nodes changed: expected ${sorted(exception.nodes).join(", ")}, observed ${sorted(nodes).join(", ")}.`,
        );
      }

      const versions = nodes.map((node) => lock.packages?.[node]?.version ?? "missing");
      if (!versions.every((version) => exception.installedVersions.includes(version))) {
        errors.push(
          `${advisoryId} installed version changed: expected ${exception.installedVersions.join(", ")}, observed ${versions.join(", ")}.`,
        );
      }

      acceptedObjects.add(via);
      accepted.push({
        advisoryId,
        package: exception.package,
        nodes,
        versions,
        expiresOn: exception.expiresOn,
      });
    }
  }

  function isAcceptedVulnerability(name, visiting = new Set()) {
    if (visiting.has(name)) {
      return true;
    }

    const vulnerability = vulnerabilities[name];
    if (!vulnerability || severityRank[vulnerability.severity] < severityRank.high) {
      return true;
    }

    const nextVisiting = new Set(visiting).add(name);
    return (vulnerability.via ?? []).every((via) => {
      if (typeof via === "string") {
        return isAcceptedVulnerability(via, nextVisiting);
      }

      if (severityRank[via.severity] < severityRank.high) {
        return true;
      }

      return acceptedObjects.has(via);
    });
  }

  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    if (
      severityRank[vulnerability.severity] >= severityRank.high &&
      !isAcceptedVulnerability(name)
    ) {
      errors.push(`High-severity dependency chain for ${name} is not fully accepted.`);
    }
  }

  for (const advisoryId of exceptions.keys()) {
    if (!observed.has(advisoryId)) {
      errors.push(
        `${advisoryId} is no longer present. Remove its stale exception before continuing.`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    accepted,
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function runAudit() {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
  const args = npmExecPath ? [npmExecPath, "audit", "--json"] : ["audit", "--json"];
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (![0, 1].includes(result.status)) {
    throw new Error(`npm audit failed to produce a usable report (exit ${result.status}).`);
  }

  return JSON.parse(result.stdout.replace(/^\uFEFF/, ""));
}

export function formatAuditPolicySuccess(accepted) {
  if (accepted.length === 0) {
    return [
      "Dependency audit policy passed with zero temporary exceptions.",
      "No unapproved high or critical advisories were found.",
    ];
  }

  return [
    "Dependency audit policy passed with temporary exact-match exceptions:",
    ...accepted.map(
      (exception) =>
        `- ${exception.advisoryId}: ${exception.package}@${exception.versions.join(", ")} (${exception.nodes.join(", ")}), expires ${exception.expiresOn}`,
    ),
    "No unapproved high or critical advisories were found.",
  ];
}

function main() {
  const root = process.cwd();
  const audit = runAudit();
  const lock = readJson(resolve(root, "package-lock.json"));
  const policy = readJson(resolve(root, "security/npm-audit-exceptions.json"));
  const now = process.env.AUDIT_POLICY_NOW ? new Date(process.env.AUDIT_POLICY_NOW) : new Date();
  const result = evaluateAuditPolicy({ audit, lock, policy, now });

  if (!result.ok) {
    console.error("Dependency audit policy failed:");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  for (const line of formatAuditPolicySuccess(result.accepted)) {
    console.log(line);
  }
}

const executedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (executedPath === import.meta.url) {
  main();
}
