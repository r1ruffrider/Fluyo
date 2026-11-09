import { createHmac, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson, parseStrictJson, sha256 } from "./root-only-closure-plan.generator.mjs";
import {
  assertTrackedOutputBrokerBuild,
  exactKeys,
  validateInstallContractShape,
} from "./root-only-closure-schema.mjs";
import {
  approvedCheckoutState,
  outsideAllowedManifestDigest,
  parseApprovalArguments,
  validateAllowedRootsAndUntracked,
  verifyApprovedTrackedFiles,
} from "./root-only-install-authority.mjs";
import { verifyCacheAndInstalledClosure } from "./root-only-closure-verifier.mjs";
import { RootOnlyOutputBrokerClient } from "./root-only-output-broker.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CONTRACT_PATH = resolve(ROOT, "scripts/r4b-evidence/root-only-install-contract.json");
const SESSION_TIMEOUT_MS = 120_000;
const MAXIMUM_READY_CHARACTERS = 64 * 1024 * 1024;
const MAXIMUM_RECEIPT_BYTES = 16 * 1024 * 1024;
const APPROVED_MODULES = Object.freeze([
  "scripts/r4b-evidence/root-only-install-authority.mjs",
  "scripts/r4b-evidence/root-only-closure-plan.generator.mjs",
  "scripts/r4b-evidence/root-only-closure-schema.mjs",
  "scripts/r4b-evidence/root-only-closure-verifier.mjs",
  "scripts/r4b-evidence/root-only-closure-handoff.mjs",
  "scripts/r4b-evidence/root-only-install-contract.json",
  "scripts/r4b-evidence/root-only-helper-pe-migration-a3.json",
  "scripts/r4b-evidence/root-only-helper-pe-migration-index.json",
  "scripts/r4b-evidence/root-only-helper-pe-migration-gaps.json",
  "scripts/r4b-evidence/root-only-closure-plan.json",
  "scripts/r4b-evidence/root-only-closure-ntfs.cs",
  "scripts/r4b-evidence/root-only-closure-ntfs.exe",
  "scripts/r4b-evidence/root-only-output-broker.cs",
  "scripts/r4b-evidence/root-only-output-broker.exe",
  "scripts/r4b-evidence/root-only-output-broker.mjs",
  "scripts/r4b-evidence/root-only-output-broker-contract.json",
]);

function readRetainedBounded(path, maximumBytes, label) {
  const pathBefore = lstatSync(path);
  if (
    pathBefore.isSymbolicLink() ||
    !pathBefore.isFile() ||
    pathBefore.nlink !== 1 ||
    pathBefore.size > maximumBytes
  )
    throw new Error(`${label} is linked, non-regular, multiply-linked, or oversized`);
  const descriptor = openSync(path, "r");
  try {
    const before = fstatSync(descriptor);
    if (
      before.dev !== pathBefore.dev ||
      before.ino !== pathBefore.ino ||
      before.size !== pathBefore.size
    )
      throw new Error(`${label} identity changed before retained read`);
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    const pathAfter = lstatSync(path);
    if (
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      pathAfter.dev !== before.dev ||
      pathAfter.ino !== before.ino ||
      pathAfter.size !== before.size
    )
      throw new Error(`${label} identity changed during retained read`);
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

function writeExclusiveContained(root, path, bytes, label) {
  root = realpathSync(root);
  const parent = realpathSync(resolve(path, ".."));
  if (parent.toLowerCase() !== root.toLowerCase() || existsSync(path))
    throw new Error(`${label} destination escaped or already exists`);
  const descriptor = openSync(path, "wx", 0o600);
  try {
    writeFileSync(descriptor, bytes);
    const metadata = fstatSync(descriptor);
    if (!metadata.isFile() || metadata.nlink !== 1 || metadata.size !== Buffer.byteLength(bytes))
      throw new Error(`${label} output identity changed during exclusive write`);
  } finally {
    closeSync(descriptor);
  }
  if (realpathSync(path).toLowerCase() !== resolve(path).toLowerCase())
    throw new Error(`${label} final path escaped its retained output directory`);
}

function identity(path) {
  let cursor = resolve(path);
  while (true) {
    if (lstatSync(cursor).isSymbolicLink())
      throw new Error("identity target has a reparse/symlink ancestor");
    const parent = resolve(cursor, "..");
    if (parent === cursor) break;
    cursor = parent;
  }
  const metadata = lstatSync(path);
  if (metadata.isSymbolicLink() || !metadata.isFile() || metadata.nlink !== 1)
    throw new Error("identity target is linked or non-regular");
  const bytes = readFileSync(path);
  return { bytes: bytes.length, sha256: sha256(bytes) };
}

function exactIdentity(path, expected, label) {
  const actual = identity(path);
  if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256)
    throw new Error(`${label} identity changed`);
}

function hmac(token, text) {
  const key = Buffer.isBuffer(token) ? token : Buffer.from(token, "hex");
  if (key.length !== 32) throw new Error("native session token changed");
  return createHmac("sha256", key).update(text).digest("hex");
}

function createNativeSession({
  executablePath,
  installedRoot,
  sourceSha256,
  cwd,
  token = randomBytes(32).toString("hex"),
  authenticationToken = Buffer.from(token, "hex"),
}) {
  const child = spawn(executablePath, ["--serve", installedRoot, sourceSha256], {
    cwd,
    env: { ...process.env, FLUYO_R4B_SESSION_TOKEN: token },
    shell: false,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const stderr = { value: "" };
  child.stderr.on("data", (chunk) => {
    stderr.value += chunk.toString("utf8");
    if (stderr.value.length > 1_048_576 && child.exitCode === null) child.kill();
  });
  let settle;
  const childDone = new Promise((accept, reject) => {
    let settled = false;
    settle = (callback, value) => {
      if (!settled) {
        settled = true;
        callback(value);
      }
    };
    child.once("error", (error) => settle(reject, error));
    child.once("close", (code, signal) =>
      settle(accept, Object.freeze({ code, signal, stderr: stderr.value })),
    );
    if (child.exitCode !== null)
      settle(
        accept,
        Object.freeze({ code: child.exitCode, signal: child.signalCode, stderr: stderr.value }),
      );
  });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  const iterator = lines[Symbol.asyncIterator]();
  let disposed = false;
  const next = async (maximumCharacters, label) => {
    let timer;
    try {
      const outcome = await Promise.race([
        iterator.next().then((value) => ({ kind: "line", value })),
        childDone.then((value) => ({ kind: "exit", value })),
        new Promise((accept) => {
          timer = setTimeout(() => accept({ kind: "timeout" }), SESSION_TIMEOUT_MS);
        }),
      ]);
      if (outcome.kind === "timeout")
        throw new Error(`${label} timed out after ${SESSION_TIMEOUT_MS}ms`);
      if (outcome.kind === "exit")
        throw new Error(
          `${label} unavailable: native exited code=${outcome.value.code} signal=${outcome.value.signal ?? "-"} stderr=${outcome.value.stderr}`,
        );
      if (
        outcome.value.done ||
        typeof outcome.value.value !== "string" ||
        outcome.value.value.length === 0 ||
        outcome.value.value.length > maximumCharacters
      )
        throw new Error(`${label} is EOF, empty, or oversized; stderr=${stderr.value}`);
      return outcome.value.value;
    } finally {
      clearTimeout(timer);
    }
  };
  const dispose = async () => {
    if (disposed) return childDone.catch(() => null);
    disposed = true;
    if (!child.stdin.destroyed) child.stdin.end();
    lines.close();
    if (child.exitCode === null) child.kill();
    let timer;
    try {
      return await Promise.race([
        childDone,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("native child cleanup timed out")),
            SESSION_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  return Object.freeze({
    authenticationToken,
    child,
    childDone,
    dispose,
    next,
    send: (value) => child.stdin.write(`${canonicalJson(value)}\n`),
    stderr,
  });
}

async function runNativeLease({
  session,
  approvals,
  verifyReady,
  stableCheckpoint,
  runtime,
  artifactBroker = null,
}) {
  let pendingPath = null;
  let terminalPath = null;
  try {
    const ready = parseStrictJson(
      Buffer.from(await session.next(MAXIMUM_READY_CHARACTERS, "native READY")),
      "native READY frame",
    );
    exactKeys(ready, ["auth", "frame", "receipt"], "native READY frame");
    if (
      ready.frame !== "READY" ||
      ready.auth !== hmac(session.authenticationToken, `READY\0${ready.receipt.receiptSha256}`)
    )
      throw new Error("native READY frame authentication failed");
    const verified = await verifyReady(ready.receipt);
    stableCheckpoint("native ACCEPT");
    session.send({
      approvedAuthorityDigest: approvals.approvedAuthorityDigest,
      auth: hmac(
        session.authenticationToken,
        `ACCEPT\0${ready.receipt.receiptSha256}\0${approvals.approvedAuthorityDigest}`,
      ),
      frame: "ACCEPT",
      receiptSha256: ready.receipt.receiptSha256,
    });
    const committed = parseStrictJson(
      Buffer.from(await session.next(4096, "native COMMITTED")),
      "native COMMITTED frame",
    );
    exactKeys(committed, ["auth", "frame", "receiptSha256"], "native COMMITTED frame");
    if (
      committed.frame !== "COMMITTED" ||
      committed.receiptSha256 !== ready.receipt.receiptSha256 ||
      committed.auth !==
        hmac(session.authenticationToken, `COMMITTED\0${ready.receipt.receiptSha256}`)
    )
      throw new Error("native COMMITTED frame authentication failed");
    stableCheckpoint("provisional PASS");
    const pass = {
      authorityDigest: approvals.approvedAuthorityDigest,
      nativeReceiptSha256: ready.receipt.receiptSha256,
      planDigest: verified.planDigest,
      protocolMode: "EVIDENCE_ONLY_NO_CONSUMER",
      status: "PASS",
    };
    const passDigest = sha256(canonicalJson(pass));
    pendingPath = resolve(runtime, `pass-${passDigest}.pending`);
    const passPath = resolve(runtime, `pass-${passDigest}.json`);
    let pendingArtifact = null;
    if (artifactBroker === null)
      writeExclusiveContained(runtime, pendingPath, `${canonicalJson(pass)}\n`, "provisional PASS");
    else
      pendingArtifact = await artifactBroker.preparePass({
        bytesBase64: Buffer.from(`${canonicalJson(pass)}\n`).toString("base64"),
        destinationId: "HANDOFF_PASS_PENDING",
        passDigest,
        substitutions: { passDigest },
      });
    session.send({
      auth: hmac(session.authenticationToken, `RELEASE\0${ready.receipt.receiptSha256}`),
      frame: "RELEASE",
      receiptSha256: ready.receipt.receiptSha256,
    });
    const released = parseStrictJson(
      Buffer.from(await session.next(4096, "native RELEASED")),
      "native RELEASED frame",
    );
    exactKeys(released, ["auth", "frame", "receiptSha256"], "native RELEASED frame");
    if (
      released.frame !== "RELEASED" ||
      released.receiptSha256 !== ready.receipt.receiptSha256 ||
      released.auth !==
        hmac(session.authenticationToken, `RELEASED\0${ready.receipt.receiptSha256}`)
    )
      throw new Error("native RELEASED frame authentication failed");
    session.send({
      auth: hmac(session.authenticationToken, `FINALIZE\0${ready.receipt.receiptSha256}`),
      frame: "FINALIZE",
      receiptSha256: ready.receipt.receiptSha256,
    });
    const finalized = parseStrictJson(
      Buffer.from(await session.next(4096, "native FINALIZED")),
      "native FINALIZED frame",
    );
    exactKeys(finalized, ["auth", "frame", "receiptSha256"], "native FINALIZED frame");
    if (
      finalized.frame !== "FINALIZED" ||
      finalized.receiptSha256 !== ready.receipt.receiptSha256 ||
      finalized.auth !==
        hmac(session.authenticationToken, `FINALIZED\0${ready.receipt.receiptSha256}`)
    )
      throw new Error("native FINALIZED frame authentication failed");
    session.child.stdin.end();
    const terminal = await session.childDone;
    if (terminal.code !== 0)
      throw new Error(
        `native terminal exit failed code=${terminal.code} signal=${terminal.signal ?? "-"} stderr=${terminal.stderr}`,
      );
    stableCheckpoint("terminal receipt");
    const terminalReceipt = {
      approvedAuthorityDigest: approvals.approvedAuthorityDigest,
      exitCode: terminal.code,
      finalizedAuth: finalized.auth,
      nativeReceiptSha256: ready.receipt.receiptSha256,
      passSha256: passDigest,
      protocolMode: "EVIDENCE_ONLY_NO_CONSUMER",
      schema: "fluyo:r4b:root-only-native-session-terminal:v2",
    };
    const terminalDigest = sha256(canonicalJson(terminalReceipt));
    terminalPath = resolve(runtime, `terminal-${terminalDigest}.json`);
    let terminalArtifact = null;
    if (artifactBroker === null)
      writeExclusiveContained(
        runtime,
        terminalPath,
        `${canonicalJson(terminalReceipt)}\n`,
        "terminal receipt",
      );
    else
      terminalArtifact = await artifactBroker.writeTerminal({
        bytesBase64: Buffer.from(`${canonicalJson(terminalReceipt)}\n`).toString("base64"),
        finalizedAuth: finalized.auth,
        nativeReceiptSha256: ready.receipt.receiptSha256,
        passDigest,
        substitutions: { terminalDigest },
      });
    stableCheckpoint("final PASS publication");
    let publication = null;
    if (artifactBroker === null) {
      if (existsSync(passPath)) throw new Error("final PASS destination already exists");
      renameSync(pendingPath, passPath);
      if (realpathSync(passPath).toLowerCase() !== resolve(passPath).toLowerCase())
        throw new Error("final PASS escaped the retained output directory");
    } else
      publication = await artifactBroker.publishPass({
        finalDestinationId: "HANDOFF_PASS_FINAL",
        passDigest,
        pendingToken: pendingArtifact.pendingToken,
        terminalToken: terminalArtifact.terminalToken,
      });
    pendingPath = null;
    return Object.freeze({
      ...verified,
      nativeReceiptSha256: ready.receipt.receiptSha256,
      passPath: publication?.finalIdentity?.finalPath ?? passPath,
      terminalPath: terminalArtifact?.artifactIdentity?.finalPath ?? terminalPath,
    });
  } finally {
    if (pendingPath !== null && existsSync(pendingPath)) unlinkSync(pendingPath);
    await session.dispose().catch(() => null);
    if (Buffer.isBuffer(session.authenticationToken)) session.authenticationToken.fill(0);
  }
}

export async function performHandoff({
  checkoutRoot,
  cacheRoot,
  installedRoot,
  installReceiptPath,
  previousReceiptPath,
  approvals,
}) {
  checkoutRoot = realpathSync(checkoutRoot);
  if (checkoutRoot.toLowerCase() !== realpathSync(ROOT).toLowerCase())
    throw new Error("executing module root differs from checkout root");
  installedRoot = resolve(installedRoot);
  if (installedRoot.toLowerCase() !== resolve(checkoutRoot, "node_modules").toLowerCase())
    throw new Error("handoff installed root changed");
  const contract = validateInstallContractShape(
    parseStrictJson(readFileSync(CONTRACT_PATH), "install contract"),
  );
  assertTrackedOutputBrokerBuild(checkoutRoot);
  const checkpoint = () => {
    const state = approvedCheckoutState({ checkoutRoot, ...approvals });
    validateAllowedRootsAndUntracked(checkoutRoot, contract.checkout.allowedWriteRoots);
    return state;
  };
  const start = checkpoint();
  const authorityState = Object.freeze({
    approvedAuthorityDigest: approvals.approvedAuthorityDigest,
    approvedHead: start.head,
    approvedTree: start.tree,
    trustedParentHead: start.parentHead,
    trustedParentTree: start.parentTree,
  });
  const approvedModules = verifyApprovedTrackedFiles(checkoutRoot, APPROVED_MODULES);
  validateAllowedRootsAndUntracked(checkoutRoot, contract.checkout.allowedWriteRoots);
  const outsideBefore = outsideAllowedManifestDigest(
    checkoutRoot,
    contract.checkout.allowedWriteRoots,
  );
  exactIdentity(process.execPath, contract.executables.node, "handoff Node");
  const runtime = resolve(checkoutRoot, ".r4b-preflight/runtime/root-only-install/verifier");
  const brokerEnvironment = Object.fromEntries(
    contract.brokerExecution.handoff.environment.inheritKeys.map((key) => [key, process.env[key]]),
  );
  if (Object.values(brokerEnvironment).some((value) => typeof value !== "string" || value === ""))
    throw new Error("handoff broker environment is incomplete");
  const executionContractDigest = sha256(readFileSync(CONTRACT_PATH));
  const broker = await RootOnlyOutputBrokerClient.connect({
    executablePath: resolve(checkoutRoot, contract.executables.outputBroker.executable.path),
    phase: "HANDOFF",
    checkoutRoot,
    brokerContractDigest: contract.executables.outputBroker.contract.sha256,
    executionContractDigest,
    approvals,
    authorityState,
    approvedEnvironment: brokerEnvironment,
    timeoutMs: contract.brokerExecution.handoff.limits.timeoutMs,
  });
  await broker.open({
    approvedAuthorityDigest: authorityState.approvedAuthorityDigest,
    approvedHead: authorityState.approvedHead,
    approvedTree: authorityState.approvedTree,
    brokerContractDigest: contract.executables.outputBroker.contract.sha256,
    executionContractDigest,
    phase: "HANDOFF",
    trustedParentHead: authorityState.trustedParentHead,
    trustedParentTree: authorityState.trustedParentTree,
  });

  const stableCheckpoint = (label) => {
    if (
      canonicalJson(checkpoint()) !== canonicalJson(start) ||
      outsideAllowedManifestDigest(checkoutRoot, contract.checkout.allowedWriteRoots) !==
        outsideBefore
    )
      throw new Error(`authority or checkout changed before ${label}`);
  };
  const spawned = await broker.spawnInteractive({ spawnPolicyId: "CLOSURE_NTFS_V2" });
  const childToken = spawned.childToken;
  let childTerminal = null;
  let closeStarted = false;
  let startWait;
  const waitGate = new Promise((accept) => {
    startWait = accept;
  });
  const childDone = waitGate.then(async () => {
    childTerminal = await broker.waitChild(childToken);
    return {
      code: childTerminal.childReceipt.exitCode,
      signal: null,
      stderr: childTerminal.stderr ?? "",
    };
  });
  let writeChain = Promise.resolve();
  const closeChildInput = async () => {
    if (!closeStarted) {
      closeStarted = true;
      await writeChain;
      await broker.childCloseStdin(childToken);
      startWait();
    }
  };
  const nativeAuthenticationToken = Buffer.from(spawned.sessionToken, "hex");
  spawned.sessionToken = null;
  if (nativeAuthenticationToken.length !== 32)
    throw new Error("broker native session token changed");
  const session = Object.freeze({
    authenticationToken: nativeAuthenticationToken,
    child: {
      stdin: {
        end: () => {
          void closeChildInput();
        },
      },
      spawnfile: contract.executables.outputBroker.executable.path,
    },
    childDone,
    dispose: async () => {
      await closeChildInput().catch(() => null);
      await childDone.catch(() => null);
    },
    next: async () => {
      await writeChain;
      const value = await broker.childRead(childToken);
      return Buffer.from(value.bytesBase64, "base64")
        .toString("utf8")
        .replace(/\r?\n$/u, "");
    },
    send: (value) => {
      writeChain = writeChain.then(() =>
        broker.childWrite(childToken, Buffer.from(`${canonicalJson(value)}\n`, "utf8")),
      );
    },
  });
  const result = await runNativeLease({
    session,
    artifactBroker: broker,
    approvals,
    runtime,
    stableCheckpoint,
    verifyReady: (receipt) =>
      verifyCacheAndInstalledClosure({
        checkoutRoot,
        cacheRoot,
        installedRoot,
        installReceiptBytes: readRetainedBounded(
          installReceiptPath,
          MAXIMUM_RECEIPT_BYTES,
          "install receipt",
        ),
        nativeReceiptBytes: Buffer.from(canonicalJson(receipt)),
        previousReceiptPath: previousReceiptPath === "-" ? null : previousReceiptPath,
        approvals,
        approvedModules,
      }),
  });
  const brokerReceipt = await broker.close("PASS_PUBLISHED");
  return Object.freeze({ ...result, brokerReceiptSha256: brokerReceipt.receiptSha256 });
}

export const rootOnlyHandoffTesting = Object.freeze({
  createNativeSession,
  hmac,
  identity,
  runNativeLease,
});

async function main() {
  if (process.argv.length !== 14 || process.argv[2] !== "--verify")
    throw new Error(
      "usage: node root-only-closure-handoff.mjs --verify <checkout-root> <cache-root> <node_modules> <install-receipt> <previous-receipt-or-dash> --approved-head <sha> --approved-tree <sha> --approved-authority-digest <sha256>",
    );
  const result = await performHandoff({
    checkoutRoot: resolve(process.argv[3]),
    cacheRoot: resolve(process.argv[4]),
    installedRoot: resolve(process.argv[5]),
    installReceiptPath: resolve(process.argv[6]),
    previousReceiptPath: process.argv[7] === "-" ? "-" : resolve(process.argv[7]),
    approvals: parseApprovalArguments(process.argv.slice(8)),
  });
  process.stdout.write(`${canonicalJson({ status: "PASS", ...result })}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();
