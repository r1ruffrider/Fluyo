import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson, parseStrictJson, sha256 } from "./root-only-closure-plan.generator.mjs";
import {
  assertTrackedOutputBrokerBuild,
  contentDigest,
  validateInstallContractShape,
  validatePlanShape,
} from "./root-only-closure-schema.mjs";
import {
  approvedCheckoutState,
  outsideAllowedManifestDigest,
  parseApprovalArguments,
  validateAllowedRootsAndUntracked,
  verifyApprovedTrackedFiles,
} from "./root-only-install-authority.mjs";
import { RootOnlyOutputBrokerClient } from "./root-only-output-broker.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CONTRACT_PATH = resolve(ROOT, "scripts/r4b-evidence/root-only-install-contract.json");
const ATTEMPT = /^build-attempt-[0-9]{3}$/u;
const MAXIMUM_RECEIPT_BYTES = 16 * 1024 * 1024;
const APPROVED_MODULES = Object.freeze([
  "scripts/r4b-evidence/root-only-install-authority.mjs",
  "scripts/r4b-evidence/root-only-closure-plan.generator.mjs",
  "scripts/r4b-evidence/root-only-closure-schema.mjs",
  "scripts/r4b-evidence/root-only-install-controller.mjs",
  "scripts/r4b-evidence/root-only-install-contract.json",
  "scripts/r4b-evidence/root-only-helper-pe-migration-a3.json",
  "scripts/r4b-evidence/root-only-helper-pe-migration-index.json",
  "scripts/r4b-evidence/root-only-helper-pe-migration-gaps.json",
  "scripts/r4b-evidence/root-only-closure-plan.json",
  "scripts/r4b-evidence/root-only-output-broker.cs",
  "scripts/r4b-evidence/root-only-output-broker.exe",
  "scripts/r4b-evidence/root-only-output-broker.mjs",
  "scripts/r4b-evidence/root-only-output-broker-contract.json",
]);

function readRetainedBounded(path, maximumBytes, label) {
  const beforePath = lstatSync(path);
  if (
    beforePath.isSymbolicLink() ||
    !beforePath.isFile() ||
    beforePath.nlink !== 1 ||
    beforePath.size > maximumBytes
  )
    throw new Error(`${label} is linked, non-regular, multiply-linked, or oversized`);
  const descriptor = openSync(path, "r");
  try {
    const before = fstatSync(descriptor);
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    const afterPath = lstatSync(path);
    if (
      before.dev !== beforePath.dev ||
      before.ino !== beforePath.ino ||
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      afterPath.dev !== before.dev ||
      afterPath.ino !== before.ino
    )
      throw new Error(`${label} identity changed during retained read`);
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

function hashFile(path) {
  const bytes = readFileSync(path);
  return { bytes: bytes.length, sha256: sha256(bytes) };
}

function treeInventory(root) {
  const files = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    const metadata = lstatSync(current);
    if (metadata.isSymbolicLink()) throw new Error("npm executable tree contains a link");
    if (metadata.isDirectory())
      for (const name of readdirSync(current)) pending.push(resolve(current, name));
    else if (metadata.isFile()) files.push(current);
    else throw new Error("npm executable tree contains a special entry");
  }
  files.sort((left, right) =>
    relative(root, left)
      .replaceAll("\\", "/")
      .localeCompare(relative(root, right).replaceAll("\\", "/"), "en"),
  );
  let bytes = 0;
  const lines = [];
  for (const path of files) {
    const content = readFileSync(path);
    bytes += content.length;
    lines.push(
      `${relative(root, path).replaceAll("\\", "/")}\0${content.length}\0${sha256(content)}\n`,
    );
  }
  return { files: files.length, bytes, inventorySha256: sha256(lines.join("")) };
}

function git(checkoutRoot, arguments_) {
  const result = spawnSync("git", ["-C", checkoutRoot, ...arguments_], {
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
  if (result.status !== 0) throw new Error(`git ${arguments_.join(" ")} failed`);
  return result.stdout.trim();
}

function environment(contract) {
  const entries = contract.configuration.environmentKeys.map((key) => {
    const value = process.env[key];
    if (typeof value !== "string" || value === "")
      throw new Error(`required environment key ${key} is absent`);
    return { key, value };
  });
  if (new Set(entries.map((entry) => entry.key)).size !== entries.length)
    throw new Error("environment keys are duplicated");
  return { entries, value: Object.fromEntries(entries.map((entry) => [entry.key, entry.value])) };
}

async function execute({ checkoutRoot, cacheRoot, attemptId, previousReceiptPath, approvals }) {
  if (!ATTEMPT.test(attemptId)) throw new Error("attempt id is outside the closed grammar");
  const contract = validateInstallContractShape(
    parseStrictJson(readFileSync(CONTRACT_PATH), "install contract"),
  );
  const plan = validatePlanShape(
    parseStrictJson(readFileSync(resolve(ROOT, contract.closurePlan.path)), "closure plan"),
  );
  if (plan.digest !== contract.closurePlan.digest) throw new Error("contract/plan digest changed");
  checkoutRoot = realpathSync(checkoutRoot);
  if (checkoutRoot.toLowerCase() !== realpathSync(ROOT).toLowerCase())
    throw new Error("executing controller module root differs from checkout root");
  assertTrackedOutputBrokerBuild(checkoutRoot);
  cacheRoot = realpathSync(cacheRoot);
  const checkpoint = () => {
    const state = approvedCheckoutState({ checkoutRoot, ...approvals });
    validateAllowedRootsAndUntracked(checkoutRoot, contract.checkout.allowedWriteRoots);
    return state;
  };
  const startAuthority = checkpoint();
  const authorityState = Object.freeze({
    approvedAuthorityDigest: approvals.approvedAuthorityDigest,
    approvedHead: startAuthority.head,
    approvedTree: startAuthority.tree,
    trustedParentHead: startAuthority.parentHead,
    trustedParentTree: startAuthority.parentTree,
  });
  const approvedModuleIdentities = verifyApprovedTrackedFiles(checkoutRoot, APPROVED_MODULES);
  validateAllowedRootsAndUntracked(checkoutRoot, contract.checkout.allowedWriteRoots);
  const outsideBefore = outsideAllowedManifestDigest(
    checkoutRoot,
    contract.checkout.allowedWriteRoots,
  );
  if (existsSync(resolve(checkoutRoot, "node_modules")))
    throw new Error("node_modules must be absent before the bounded install");
  if (
    sha256(readFileSync(resolve(checkoutRoot, "package-lock.json"))) !== plan.source.lockSha256 ||
    sha256(readFileSync(resolve(checkoutRoot, "package.json"))) !== plan.source.packageSha256
  )
    throw new Error("target checkout package/lock bytes differ from the reviewed plan");
  const head = git(checkoutRoot, ["rev-parse", "HEAD"]);
  const tree = git(checkoutRoot, ["rev-parse", "HEAD^{tree}"]);
  if (!/^[0-9a-f]{40}$/u.test(head) || !/^[0-9a-f]{40}$/u.test(tree))
    throw new Error("checkout Git identity is invalid");

  const closedEnvironment = environment(contract);
  const executionContractDigest = sha256(readFileSync(CONTRACT_PATH));
  const broker = await RootOnlyOutputBrokerClient.connect({
    executablePath: resolve(checkoutRoot, contract.executables.outputBroker.executable.path),
    phase: "CONTROLLER",
    checkoutRoot,
    brokerContractDigest: contract.executables.outputBroker.contract.sha256,
    executionContractDigest,
    approvals,
    authorityState,
    approvedEnvironment: closedEnvironment.value,
    timeoutMs: contract.brokerExecution.controller.limits.timeoutMs,
  });
  await broker.open({
    approvedAuthorityDigest: authorityState.approvedAuthorityDigest,
    approvedHead: authorityState.approvedHead,
    approvedTree: authorityState.approvedTree,
    brokerContractDigest: contract.executables.outputBroker.contract.sha256,
    executionContractDigest,
    phase: "CONTROLLER",
    trustedParentHead: authorityState.trustedParentHead,
    trustedParentTree: authorityState.trustedParentTree,
  });
  const substitutions = { attemptId };
  await broker.ensureDestination({ destinationId: "CTRL_USER_CONFIG", substitutions });
  const userConfig = await broker.beginFile({
    destinationId: "CTRL_USER_CONFIG",
    expectedBytes: 0,
    expectedSha256: contract.configuration.emptyConfigSha256,
    maxBytes: 0,
    purpose: "EMPTY_USER_CONFIG",
    substitutions,
  });
  const { artifactIdentity: userConfigIdentity } = await broker.commitFile(userConfig.fileToken);
  await broker.ensureDestination({ destinationId: "CTRL_GLOBAL_CONFIG", substitutions });
  const globalConfig = await broker.beginFile({
    destinationId: "CTRL_GLOBAL_CONFIG",
    expectedBytes: 0,
    expectedSha256: contract.configuration.emptyConfigSha256,
    maxBytes: 0,
    purpose: "EMPTY_GLOBAL_CONFIG",
    substitutions,
  });
  const { artifactIdentity: globalConfigIdentity } = await broker.commitFile(
    globalConfig.fileToken,
  );
  const npmLogDirectoryIdentity = await broker.ensureDestination({
    destinationId: "CTRL_NPM_LOG_DIR",
    substitutions,
  });
  const userConfigPath = userConfigIdentity.finalPath;
  const globalConfigPath = globalConfigIdentity.finalPath;
  const npmLogDirectory = npmLogDirectoryIdentity.directoryIdentity.finalPath;
  const configIdentity = { bytes: 0, sha256: contract.configuration.emptyConfigSha256 };
  const argv = contract.argv.map((argument) =>
    argument
      .replace("${EMPTY_USER_CONFIG}", userConfigPath)
      .replace("${EMPTY_GLOBAL_CONFIG}", globalConfigPath)
      .replace("${READ_ONLY_CACHE_ROOT}", cacheRoot)
      .replace("${NPM_LOG_DIRECTORY}", npmLogDirectory),
  );
  if (argv.some((argument) => argument.includes("${")))
    throw new Error("install argv has an unresolved placeholder");
  const preSpawnAuthority = checkpoint();
  if (canonicalJson(preSpawnAuthority) !== canonicalJson(startAuthority))
    throw new Error("authority changed before spawn");
  validateAllowedRootsAndUntracked(checkoutRoot, contract.checkout.allowedWriteRoots);
  if (
    outsideAllowedManifestDigest(checkoutRoot, contract.checkout.allowedWriteRoots) !==
    outsideBefore
  )
    throw new Error("outside-allowed checkout changed before spawn");
  const observedExecutables = {
    node: hashFile(contract.executables.node.path),
    npmEntry: hashFile(contract.executables.npmEntry.path),
    npmTree: treeInventory(contract.executables.npmTree.path),
  };
  if (
    canonicalJson(observedExecutables.node) !==
      canonicalJson({
        bytes: contract.executables.node.bytes,
        sha256: contract.executables.node.sha256,
      }) ||
    canonicalJson(observedExecutables.npmEntry) !==
      canonicalJson({
        bytes: contract.executables.npmEntry.bytes,
        sha256: contract.executables.npmEntry.sha256,
      }) ||
    canonicalJson(observedExecutables.npmTree) !==
      canonicalJson({
        files: contract.executables.npmTree.files,
        bytes: contract.executables.npmTree.bytes,
        inventorySha256: contract.executables.npmTree.inventorySha256,
      })
  )
    throw new Error("observed Node/npm identity differs from the contract");
  if (canonicalJson(checkpoint()) !== canonicalJson(startAuthority))
    throw new Error("authority changed while observing Node/npm identity");
  const startedUtc = new Date().toISOString();
  const batch = await broker.spawnBatch({ attemptId, cacheRoot, spawnPolicyId: "NPM_CI_V1" });
  const endedUtc = new Date().toISOString();
  const { childReceipt, logIdentity } = batch;
  const exitCode = childReceipt.exitCode;
  const processStartUtc = childReceipt.processStartUtc ?? startedUtc;
  const postExitAuthority = checkpoint();
  if (canonicalJson(postExitAuthority) !== canonicalJson(startAuthority))
    throw new Error("authority changed during install");
  const postExecutables = {
    node: hashFile(contract.executables.node.path),
    npmEntry: hashFile(contract.executables.npmEntry.path),
    npmTree: treeInventory(contract.executables.npmTree.path),
  };
  if (canonicalJson(postExecutables) !== canonicalJson(observedExecutables))
    throw new Error("Node/npm identity changed during install");
  validateAllowedRootsAndUntracked(checkoutRoot, contract.checkout.allowedWriteRoots);
  if (
    outsideAllowedManifestDigest(checkoutRoot, contract.checkout.allowedWriteRoots) !==
    outsideBefore
  )
    throw new Error("install changed a path outside allowed write roots");
  const logPath = logIdentity.finalPath;
  const previousReceiptSha256 =
    previousReceiptPath === "-"
      ? null
      : sha256(
          readRetainedBounded(
            realpathSync(previousReceiptPath),
            MAXIMUM_RECEIPT_BYTES,
            "previous install receipt",
          ),
        );
  const unsigned = {
    schema: contract.receipt.schema,
    attemptId,
    checkoutHead: head,
    checkoutTree: tree,
    approvedHead: approvals.approvedHead,
    approvedTree: approvals.approvedTree,
    approvedAuthorityDigest: approvals.approvedAuthorityDigest,
    trustedParentHead: startAuthority.parentHead,
    trustedParentTree: startAuthority.parentTree,
    authorityPath: startAuthority.authority.authorityPath,
    authorityChange: startAuthority.authority.authorityChange,
    authorityDiffSha256: startAuthority.authorityDiffSha256,
    trustedHarnessManifestDigest: startAuthority.trustedHarnessManifestDigest,
    installContractSha256: startAuthority.authority.installContractSha256,
    closurePlanDigest: startAuthority.authority.closurePlanDigest,
    outsideAllowedManifestDigest: outsideBefore,
    approvedModuleIdentities,
    cwd: checkoutRoot,
    nodeProcessExecutable: contract.executables.node.path,
    nodeProcessExecutableSha256: observedExecutables.node.sha256,
    nodeExecutable: contract.executables.node.path,
    nodeSha256: observedExecutables.node.sha256,
    npmEntry: contract.executables.npmEntry.path,
    npmEntrySha256: observedExecutables.npmEntry.sha256,
    npmTreeInventorySha256: observedExecutables.npmTree.inventorySha256,
    argv,
    argvSha256: sha256(canonicalJson(argv)),
    environmentEntries: closedEnvironment.entries,
    environmentSha256: sha256(canonicalJson(closedEnvironment.entries)),
    userConfigPath,
    userConfigBytes: configIdentity.bytes,
    userConfigSha256: configIdentity.sha256,
    globalConfigPath,
    globalConfigBytes: configIdentity.bytes,
    globalConfigSha256: configIdentity.sha256,
    cacheRoot,
    logPath,
    logBytes: logIdentity.bytes,
    logSha256: logIdentity.sha256,
    startedUtc,
    endedUtc,
    processId: childReceipt.processId,
    processStartUtc,
    exitCode,
    networkObservation: "NOT_OBSERVED",
    previousReceiptSha256,
  };
  const preReceiptAuthority = checkpoint();
  if (
    canonicalJson(preReceiptAuthority) !== canonicalJson(startAuthority) ||
    outsideAllowedManifestDigest(checkoutRoot, contract.checkout.allowedWriteRoots) !==
      outsideBefore
  )
    throw new Error("authority/checkout changed before receipt");
  const receipt = { ...unsigned, receiptSha256: contentDigest(contract.receipt.domain, unsigned) };
  const receiptBytes = Buffer.from(`${canonicalJson(receipt)}\n`, "utf8");
  await broker.ensureDestination({
    destinationId: "CTRL_INSTALL_RECEIPT",
    substitutions: { attemptId, receiptSha256: receipt.receiptSha256 },
  });
  const receiptFile = await broker.beginFile({
    destinationId: "CTRL_INSTALL_RECEIPT",
    expectedBytes: receiptBytes.length,
    expectedSha256: sha256(receiptBytes),
    maxBytes: 16777216,
    purpose: "INSTALL_RECEIPT",
    substitutions: { attemptId, receiptSha256: receipt.receiptSha256 },
  });
  for (let offset = 0; offset < receiptBytes.length; offset += 32768)
    await broker.write(
      receiptFile.fileToken,
      offset,
      receiptBytes.subarray(offset, offset + 32768),
    );
  const { artifactIdentity: receiptArtifact } = await broker.commitFile(receiptFile.fileToken);
  const brokerReceipt = await broker.close("ACTIVE");
  process.stdout.write(
    `${canonicalJson({ brokerReceiptSha256: brokerReceipt.receiptSha256, receiptPath: relative(checkoutRoot, receiptArtifact.finalPath).replaceAll("\\", "/"), receiptSha256: receipt.receiptSha256, exitCode })}\n`,
  );
  if (exitCode !== 0) process.exitCode = exitCode ?? 1;
}

async function main() {
  if (process.argv.length !== 13 || process.argv[2] !== "--execute")
    throw new Error(
      "usage: node root-only-install-controller.mjs --execute <checkout-root> <cache-root> <attempt-id> <previous-receipt-or-dash> --approved-head <sha> --approved-tree <sha> --approved-authority-digest <sha256>",
    );
  await execute({
    checkoutRoot: resolve(process.argv[3]),
    cacheRoot: resolve(process.argv[4]),
    attemptId: process.argv[5],
    previousReceiptPath: process.argv[6],
    approvals: parseApprovalArguments(process.argv.slice(7)),
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();
