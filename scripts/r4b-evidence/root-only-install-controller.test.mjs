import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { canonicalJson, parseStrictJson } from "./root-only-closure-plan.generator.mjs";
import {
  INSTALL_RECEIPT_KEYS,
  validateInstallContractShape,
  validateInstallReceiptShape,
} from "./root-only-closure-schema.mjs";

const ASCII_WHITESPACE = String.raw`[ \t\r\n]*`;
const REQUIRED_ASCII_WHITESPACE = String.raw`[ \t\r\n]+`;

function closedOrderedObject(properties) {
  return String.raw`\{${ASCII_WHITESPACE}${properties.join(`${ASCII_WHITESPACE},${ASCII_WHITESPACE}`)}${ASCII_WHITESPACE},?${ASCII_WHITESPACE}\}`;
}

const CONTROLLER_AUTHORITY_PROPERTIES = Object.freeze([
  String.raw`approvedAuthorityDigest${ASCII_WHITESPACE}:${ASCII_WHITESPACE}approvals\.approvedAuthorityDigest`,
  String.raw`approvedHead${ASCII_WHITESPACE}:${ASCII_WHITESPACE}startAuthority\.head`,
  String.raw`approvedTree${ASCII_WHITESPACE}:${ASCII_WHITESPACE}startAuthority\.tree`,
  String.raw`trustedParentHead${ASCII_WHITESPACE}:${ASCII_WHITESPACE}startAuthority\.parentHead`,
  String.raw`trustedParentTree${ASCII_WHITESPACE}:${ASCII_WHITESPACE}startAuthority\.parentTree`,
]);
const HANDOFF_AUTHORITY_PROPERTIES = Object.freeze([
  String.raw`approvedAuthorityDigest${ASCII_WHITESPACE}:${ASCII_WHITESPACE}approvals\.approvedAuthorityDigest`,
  String.raw`approvedHead${ASCII_WHITESPACE}:${ASCII_WHITESPACE}start\.head`,
  String.raw`approvedTree${ASCII_WHITESPACE}:${ASCII_WHITESPACE}start\.tree`,
  String.raw`trustedParentHead${ASCII_WHITESPACE}:${ASCII_WHITESPACE}start\.parentHead`,
  String.raw`trustedParentTree${ASCII_WHITESPACE}:${ASCII_WHITESPACE}start\.parentTree`,
]);
const BROKER_CONNECT_PROPERTIES = Object.freeze([
  String.raw`executablePath${ASCII_WHITESPACE}:${ASCII_WHITESPACE}resolve\(checkoutRoot,${ASCII_WHITESPACE}contract\.executables\.outputBroker\.executable\.path\)`,
  String.raw`phase${ASCII_WHITESPACE}:${ASCII_WHITESPACE}"CONTROLLER"`,
  "checkoutRoot",
  String.raw`brokerContractDigest${ASCII_WHITESPACE}:${ASCII_WHITESPACE}contract\.executables\.outputBroker\.contract\.sha256`,
  "executionContractDigest",
  "approvals",
  "authorityState",
  String.raw`approvedEnvironment${ASCII_WHITESPACE}:${ASCII_WHITESPACE}closedEnvironment\.value`,
  String.raw`timeoutMs${ASCII_WHITESPACE}:${ASCII_WHITESPACE}contract\.brokerExecution\.controller\.limits\.timeoutMs`,
]);
const CONTROLLER_AUTHORITY_PATTERN = new RegExp(
  String.raw`\bconst${REQUIRED_ASCII_WHITESPACE}authorityState\b${ASCII_WHITESPACE}=${ASCII_WHITESPACE}Object\.freeze\(${ASCII_WHITESPACE}${closedOrderedObject(CONTROLLER_AUTHORITY_PROPERTIES)}${ASCII_WHITESPACE}\)`,
  "u",
);
const HANDOFF_AUTHORITY_PATTERN = new RegExp(
  String.raw`\bconst${REQUIRED_ASCII_WHITESPACE}authorityState\b${ASCII_WHITESPACE}=${ASCII_WHITESPACE}Object\.freeze\(${ASCII_WHITESPACE}${closedOrderedObject(HANDOFF_AUTHORITY_PROPERTIES)}${ASCII_WHITESPACE}\)`,
  "u",
);
const BROKER_CONNECT_PATTERN = new RegExp(
  String.raw`\bRootOnlyOutputBrokerClient\.connect\(${ASCII_WHITESPACE}${closedOrderedObject(BROKER_CONNECT_PROPERTIES)}${ASCII_WHITESPACE}\)`,
  "u",
);

function exactMatchCount(source, pattern) {
  return (source.match(new RegExp(pattern.source, "gu")) ?? []).length;
}

test("controller delegates one closed no-shell transaction to the tracked broker with repeated exact-authority checkpoints", () => {
  const source = readFileSync(
    new URL("./root-only-install-controller.mjs", import.meta.url),
    "utf8",
  );
  const handoffSource = readFileSync(
    new URL("./root-only-closure-handoff.mjs", import.meta.url),
    "utf8",
  );
  const brokerClientSource = readFileSync(
    new URL("./root-only-output-broker.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, CONTROLLER_AUTHORITY_PATTERN);
  assert.match(source, BROKER_CONNECT_PATTERN);
  assert.match(handoffSource, HANDOFF_AUTHORITY_PATTERN);
  assert.equal(exactMatchCount(source, CONTROLLER_AUTHORITY_PATTERN), 1);
  assert.equal(exactMatchCount(source, BROKER_CONNECT_PATTERN), 1);
  assert.equal(exactMatchCount(handoffSource, HANDOFF_AUTHORITY_PATTERN), 1);
  for (const candidate of [source, handoffSource]) {
    assert.ok(
      candidate.indexOf("assertTrackedOutputBrokerBuild(checkoutRoot)") <
        candidate.indexOf("RootOnlyOutputBrokerClient.connect"),
    );
    assert.ok(
      candidate.indexOf("assertTrackedOutputBrokerBuild(checkoutRoot)") <
        candidate.indexOf("broker.spawn"),
    );
  }
  assert.match(
    source,
    /broker\.spawnBatch\(\{ attemptId, cacheRoot, spawnPolicyId: "NPM_CI_V1" \}\)/u,
  );
  assert.doesNotMatch(
    source,
    /\bspawn(?:Sync)?\s*\(\s*contract\.executables\.(?:node|npmEntry)\.path/u,
  );
  assert.match(
    brokerClientSource,
    /const child = spawn\(executablePath, args, \{ cwd: checkoutRoot, env: environment, shell: false, windowsHide: true, stdio: \["pipe", "pipe", "pipe"\] \}\)/u,
  );
  assert.equal((brokerClientSource.match(/\bspawn\s*\(/gu) ?? []).length, 1);
  assert.doesNotMatch(brokerClientSource, /\b(?:spawnSync|exec|execSync)\s*\(|shell:\s*true/u);
  assert.match(source, /approvedCheckoutState/u);
  assert.match(source, /outsideAllowedManifestDigest/u);
  assert.match(source, /treeInventory\(contract\.executables\.npmTree\.path\)/u);
  assert.match(source, /parseApprovalArguments/u);
  assert.doesNotMatch(source, /exec\(|execSync\(|shell: true/u);
});

test("closed controller source patterns accept only compact or repository-formatted exact bindings", () => {
  const compactControllerAuthority =
    "const authorityState = Object.freeze({ approvedAuthorityDigest: approvals.approvedAuthorityDigest, approvedHead: startAuthority.head, approvedTree: startAuthority.tree, trustedParentHead: startAuthority.parentHead, trustedParentTree: startAuthority.parentTree })";
  const compactHandoffAuthority =
    "const authorityState = Object.freeze({ approvedAuthorityDigest: approvals.approvedAuthorityDigest, approvedHead: start.head, approvedTree: start.tree, trustedParentHead: start.parentHead, trustedParentTree: start.parentTree })";
  const compactConnect =
    'RootOnlyOutputBrokerClient.connect({ executablePath: resolve(checkoutRoot, contract.executables.outputBroker.executable.path), phase: "CONTROLLER", checkoutRoot, brokerContractDigest: contract.executables.outputBroker.contract.sha256, executionContractDigest, approvals, authorityState, approvedEnvironment: closedEnvironment.value, timeoutMs: contract.brokerExecution.controller.limits.timeoutMs })';
  const formattedControllerAuthority = `const authorityState = Object.freeze({
    approvedAuthorityDigest: approvals.approvedAuthorityDigest,
    approvedHead: startAuthority.head,
    approvedTree: startAuthority.tree,
    trustedParentHead: startAuthority.parentHead,
    trustedParentTree: startAuthority.parentTree,
  })`;
  const formattedHandoffAuthority = `const authorityState = Object.freeze({
    approvedAuthorityDigest: approvals.approvedAuthorityDigest,
    approvedHead: start.head,
    approvedTree: start.tree,
    trustedParentHead: start.parentHead,
    trustedParentTree: start.parentTree,
  })`;
  const formattedConnect = `RootOnlyOutputBrokerClient.connect({
    executablePath: resolve(checkoutRoot, contract.executables.outputBroker.executable.path),
    phase: "CONTROLLER",
    checkoutRoot,
    brokerContractDigest: contract.executables.outputBroker.contract.sha256,
    executionContractDigest,
    approvals,
    authorityState,
    approvedEnvironment: closedEnvironment.value,
    timeoutMs: contract.brokerExecution.controller.limits.timeoutMs,
  })`;

  assert.match(compactControllerAuthority, CONTROLLER_AUTHORITY_PATTERN);
  assert.match(formattedControllerAuthority, CONTROLLER_AUTHORITY_PATTERN);
  assert.match(compactHandoffAuthority, HANDOFF_AUTHORITY_PATTERN);
  assert.match(formattedHandoffAuthority, HANDOFF_AUTHORITY_PATTERN);
  assert.match(compactConnect, BROKER_CONNECT_PATTERN);
  assert.match(formattedConnect, BROKER_CONNECT_PATTERN);

  assert.doesNotMatch(
    compactControllerAuthority.replace(
      "approvedAuthorityDigest: approvals.approvedAuthorityDigest, approvedHead: startAuthority.head",
      "approvedHead: startAuthority.head, approvedAuthorityDigest: approvals.approvedAuthorityDigest",
    ),
    CONTROLLER_AUTHORITY_PATTERN,
  );
  assert.doesNotMatch(
    compactControllerAuthority.replace(", approvedTree: startAuthority.tree", ""),
    CONTROLLER_AUTHORITY_PATTERN,
  );
  assert.doesNotMatch(
    compactControllerAuthority.replace(
      "approvedTree: startAuthority.tree,",
      "approvedTree: startAuthority.tree, unreviewed: true,",
    ),
    CONTROLLER_AUTHORITY_PATTERN,
  );
  assert.doesNotMatch(
    compactControllerAuthority.replace(
      "approvedTree: startAuthority.tree,",
      "approvedTree: startAuthority.tree, approvedTree: startAuthority.tree,",
    ),
    CONTROLLER_AUTHORITY_PATTERN,
  );
  assert.doesNotMatch(
    compactControllerAuthority.replace(
      "approvedHead: startAuthority.head",
      "approvedHead: startAuthority.tree",
    ),
    CONTROLLER_AUTHORITY_PATTERN,
  );
  assert.doesNotMatch(
    compactControllerAuthority.replace("Object.freeze", "Object.seal"),
    CONTROLLER_AUTHORITY_PATTERN,
  );
  assert.doesNotMatch(
    compactControllerAuthority.replace("const authorityState", "constauthorityState"),
    CONTROLLER_AUTHORITY_PATTERN,
  );
  assert.doesNotMatch(
    compactConnect.replace('phase: "CONTROLLER"', 'phase: "HANDOFF"'),
    BROKER_CONNECT_PATTERN,
  );
  assert.doesNotMatch(
    compactConnect.replace(
      "timeoutMs: contract.brokerExecution.controller.limits.timeoutMs",
      "timeoutMs: contract.brokerExecution.handoff.limits.timeoutMs",
    ),
    BROKER_CONNECT_PATTERN,
  );
  assert.doesNotMatch(compactConnect.replace(", authorityState,", ","), BROKER_CONNECT_PATTERN);
  assert.doesNotMatch(`Not${compactConnect}`, BROKER_CONNECT_PATTERN);
});

test("install receipt schema rejects missing, reordered, duplicate, and unknown fields", () => {
  const contract = validateInstallContractShape(
    parseStrictJson(
      readFileSync(new URL("./root-only-install-contract.json", import.meta.url)),
      "install contract",
    ),
  );
  const receipt = {};
  for (const key of [...INSTALL_RECEIPT_KEYS].toSorted()) receipt[key] = "fixture";
  receipt.argv = [];
  receipt.environmentEntries = [];
  receipt.approvedModuleIdentities = [
    {
      blob: "0".repeat(40),
      bytes: 1,
      mode: "100644",
      path: "scripts/r4b-evidence/root-only-install-controller.mjs",
      sha256: "0".repeat(64),
    },
  ];
  for (const key of ["userConfigBytes", "globalConfigBytes", "logBytes"]) receipt[key] = 0;
  receipt.processId = 1;
  for (const key of [
    "argvSha256",
    "environmentSha256",
    "userConfigSha256",
    "globalConfigSha256",
    "logSha256",
    "nodeProcessExecutableSha256",
    "nodeSha256",
    "npmEntrySha256",
    "npmTreeInventorySha256",
    "receiptSha256",
    "approvedAuthorityDigest",
    "authorityDiffSha256",
    "trustedHarnessManifestDigest",
    "installContractSha256",
    "closurePlanDigest",
    "outsideAllowedManifestDigest",
  ])
    receipt[key] = "0".repeat(64);
  for (const key of ["approvedHead", "approvedTree", "trustedParentHead", "trustedParentTree"])
    receipt[key] = "0".repeat(40);
  receipt.schema = contract.receipt.schema;
  assert.doesNotThrow(() => validateInstallReceiptShape(receipt, contract));
  const unknown = { ...receipt, unreviewed: true };
  assert.throws(
    () => validateInstallReceiptShape(unknown, contract),
    /unknown, missing, or reordered/u,
  );
  const missing = structuredClone(receipt);
  delete missing.approvedHead;
  assert.throws(
    () => validateInstallReceiptShape(missing, contract),
    /unknown, missing, or reordered/u,
  );
  assert.throws(() => parseStrictJson(Buffer.from('{"schema":"x","schema":"y"}')), /duplicate/u);
  assert.equal(
    canonicalJson(Object.keys(receipt)),
    canonicalJson([...INSTALL_RECEIPT_KEYS].toSorted()),
  );
});
