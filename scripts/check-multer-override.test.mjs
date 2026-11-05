import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { EventEmitter, getEventListeners } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  EXPECTED_MULTER_INTEGRITY,
  EXPECTED_MULTER_RESOLVED,
  EXPECTED_MULTER_VERSION,
  EXPECTED_NEST_MULTER_PIN,
  EXPECTED_NEST_VERSION,
  NPM_LS_FAILURES,
  NPM_LS_MAX_OUTPUT_BYTES,
  NPM_LS_TIMEOUT_MS,
  parseScopedNpmLsResult,
  publicMulterFailure,
  resolveNpmCli,
  runBoundedSubprocess,
  terminateOwnedProcessTree,
  validateMulterOverrideState,
  validateScopedNpmLs,
} from "./check-multer-override.mjs";

const require = createRequire(import.meta.url);
const multer = require("multer");
const testFile = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(testFile), "..");
const multerDirectory = dirname(require.resolve("multer/package.json"));
const delay = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));
const packageJsonPath = join(repoRoot, "package.json");

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function waitForProcessDeath(pid, timeout = 5_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (!processIsAlive(pid)) return true;
    await delay(25);
  }
  return !processIsAlive(pid);
}

function multipart(parts, boundary = "fluyo-boundary") {
  const chunks = [];
  for (const part of parts) {
    const disposition = `form-data; name="${part.name}"${part.filename ? `; filename="${part.filename}"` : ""}`;
    chunks.push(`--${boundary}\r\nContent-Disposition: ${disposition}\r\n`);
    if (part.filename) chunks.push("Content-Type: application/octet-stream\r\n");
    chunks.push(`\r\n${part.value}\r\n`);
  }
  chunks.push(`--${boundary}--\r\n`);
  return { body: Buffer.from(chunks.join("")), boundary };
}

async function runUpload(upload, form, { settle = 0, timeout = 1_000 } = {}) {
  let terminalCalls = 0;
  const req = new PassThrough();
  req.headers = {
    "content-type": `multipart/form-data; boundary=${form.boundary}`,
    "content-length": form.body.length,
  };
  try {
    return await new Promise((resolveRequest, reject) => {
      const timer = setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), timeout);
      upload(req, {}, async (error) => {
        terminalCalls += 1;
        if (settle) await delay(settle);
        clearTimeout(timer);
        resolveRequest({
          error: error?.code ?? error?.message ?? null,
          terminalCalls,
          body: req.body,
        });
      });
      req.end(form.body);
    });
  } finally {
    req.destroy();
  }
}

function validState() {
  return {
    packageJson: { overrides: { multer: EXPECTED_MULTER_VERSION } },
    lock: {
      packages: {
        "node_modules/multer": {
          version: EXPECTED_MULTER_VERSION,
          resolved: EXPECTED_MULTER_RESOLVED,
          integrity: EXPECTED_MULTER_INTEGRITY,
        },
        "node_modules/@nestjs/platform-express": {
          version: EXPECTED_NEST_VERSION,
          dependencies: { multer: EXPECTED_NEST_MULTER_PIN },
        },
      },
    },
    nestPackage: {
      version: EXPECTED_NEST_VERSION,
      dependencies: { multer: EXPECTED_NEST_MULTER_PIN },
    },
    installedMulter: { version: EXPECTED_MULTER_VERSION },
    expectedResolvedPackage: join(multerDirectory, "package.json"),
    apiResolvedPackage: join(multerDirectory, "package.json"),
    nestResolvedPackage: join(multerDirectory, "package.json"),
    apiResolvedVersion: EXPECTED_MULTER_VERSION,
    nestResolvedVersion: EXPECTED_MULTER_VERSION,
  };
}

function validTree() {
  const problem = `invalid: multer@${EXPECTED_MULTER_VERSION} ${multerDirectory}`;
  return {
    problems: [problem],
    dependencies: {
      "@fluyo/api": {
        dependencies: {
          "@nestjs/platform-express": {
            dependencies: {
              multer: {
                version: EXPECTED_MULTER_VERSION,
                resolved: EXPECTED_MULTER_RESOLVED,
                invalid: `"${EXPECTED_NEST_MULTER_PIN}" from node_modules/@nestjs/platform-express`,
                problems: [problem],
              },
            },
          },
        },
      },
    },
    error: { code: "ELSPROBLEMS" },
  };
}

function cleanTree() {
  const tree = validTree();
  const multerNode =
    tree.dependencies["@fluyo/api"].dependencies["@nestjs/platform-express"].dependencies.multer;
  delete tree.problems;
  delete tree.error;
  delete multerNode.invalid;
  delete multerNode.problems;
  return tree;
}

async function lateFilterFixture() {
  let filterCallbacks = 0;
  const upload = multer({
    fileFilter(_req, file, callback) {
      const first = file.originalname === "first.bin";
      setTimeout(
        () => {
          filterCallbacks += 1;
          callback(first ? new Error("first rejected") : null, !first);
        },
        first ? 5 : 40,
      );
    },
  }).array("files", 2);
  const result = await runUpload(
    upload,
    multipart([
      { name: "files", filename: "first.bin", value: "one" },
      { name: "files", filename: "later.bin", value: "two" },
    ]),
    { settle: 80 },
  );
  await delay(25);
  return { ...result, filterCallbacks };
}

function treeHangFixture(pidFile) {
  const grandchild = spawn(process.execPath, [testFile, "--grandchild-hang-fixture"], {
    detached: false,
    stdio: "ignore",
    windowsHide: true,
  });
  writeFileSync(pidFile, JSON.stringify({ parentPid: process.pid, grandchildPid: grandchild.pid }));
  setInterval(() => {}, 1_000);
}

if (process.argv.includes("--grandchild-hang-fixture")) {
  setInterval(() => {}, 1_000);
} else if (process.argv.includes("--tree-hang-fixture")) {
  treeHangFixture(process.argv.at(-1));
} else if (process.argv.includes("--late-filter-fixture")) {
  console.log(JSON.stringify(await lateFilterFixture()));
} else {
  test("accepts the exact override, runtime resolution, and both safe scoped npm modes", () => {
    assert.deepEqual(validateMulterOverrideState(validState()), []);
    for (const [status, tree] of [
      [0, cleanTree()],
      [1, validTree()],
    ])
      assert.deepEqual(
        validateScopedNpmLs({ status, tree, expectedMulterDirectory: multerDirectory }),
        [],
      );
    assert.deepEqual(
      parseScopedNpmLsResult({
        status: 1,
        signal: null,
        stdout: JSON.stringify(validTree()),
        stderr: "",
      }).status,
      1,
    );
  });

  test("keeps override removal distinct from other Nest pin changes", () => {
    const stale = validState();
    stale.nestPackage.dependencies.multer = "2.5.0";
    stale.lock.packages["node_modules/@nestjs/platform-express"].dependencies.multer = "2.5.0";
    assert.match(validateMulterOverrideState(stale).join("\n"), /STALE_OVERRIDE_REMOVAL/);
    const changed = validState();
    changed.nestPackage.dependencies.multer = "^2.5.0";
    changed.lock.packages["node_modules/@nestjs/platform-express"].dependencies.multer = "^2.5.0";
    const message = validateMulterOverrideState(changed).join("\n");
    assert.match(message, /NEST_PIN_CHANGED/);
    assert.doesNotMatch(message, /STALE_OVERRIDE_REMOVAL/);
  });

  test("rejects mixed, expanded, and malformed scoped npm modes", () => {
    const mixedSuccess = validTree();
    assert.match(
      validateScopedNpmLs({
        status: 0,
        tree: mixedSuccess,
        expectedMulterDirectory: multerDirectory,
      }).join("\n"),
      /clean-success mode/,
    );
    const mixedFailure = cleanTree();
    assert.notDeepEqual(
      validateScopedNpmLs({
        status: 1,
        tree: mixedFailure,
        expectedMulterDirectory: multerDirectory,
      }),
      [],
    );
    const extraFlag = cleanTree();
    extraFlag.dependencies["@fluyo/api"].extraneous = true;
    assert.match(
      validateScopedNpmLs({
        status: 0,
        tree: extraFlag,
        expectedMulterDirectory: multerDirectory,
      }).join("\n"),
      /clean-success mode/,
    );
    const extraProblem = validTree();
    extraProblem.problems.push("missing: other@1.0.0");
    assert.match(
      validateScopedNpmLs({
        status: 1,
        tree: extraProblem,
        expectedMulterDirectory: multerDirectory,
      }).join("\n"),
      /root problem/,
    );
    const otherInvalid = validTree();
    otherInvalid.dependencies["@fluyo/api"].invalid = '"0.0.0" from root';
    assert.match(
      validateScopedNpmLs({
        status: 1,
        tree: otherInvalid,
        expectedMulterDirectory: multerDirectory,
      }).join("\n"),
      /invalid-edge mode/,
    );
    const missing = cleanTree();
    delete missing.dependencies["@fluyo/api"].dependencies["@nestjs/platform-express"].dependencies
      .multer;
    assert.match(
      validateScopedNpmLs({
        status: 0,
        tree: missing,
        expectedMulterDirectory: multerDirectory,
      }).join("\n"),
      /exactly one Multer node/,
    );
    assert.match(
      validateScopedNpmLs({
        status: 2,
        tree: cleanTree(),
        expectedMulterDirectory: multerDirectory,
      }).join("\n"),
      /expected clean success or the known invalid edge/,
    );
  });

  test("rejects hidden nested diagnostics in both scoped npm modes", () => {
    for (const [status, makeTree] of [
      [0, cleanTree],
      [1, validTree],
    ]) {
      for (const diagnostic of ["problems", "error"]) {
        const tree = makeTree();
        tree.dependencies["@fluyo/api"].dependencies.unrelated = {
          [diagnostic]: diagnostic === "problems" ? ["hidden"] : { code: "HIDDEN" },
        };
        assert.notDeepEqual(
          validateScopedNpmLs({ status, tree, expectedMulterDirectory: multerDirectory }),
          [],
        );
      }
    }
  });

  test("uses fixed sanitized npm-ls failures and a shared combined output cap", () => {
    for (const [result, expected] of [
      [{ error: { code: "ETIMEDOUT" } }, NPM_LS_FAILURES.timeout],
      [{ error: { code: "ENOBUFS" } }, NPM_LS_FAILURES.outputOverflow],
      [{ error: { code: "ENOENT" } }, NPM_LS_FAILURES.spawnError],
      [{ signal: "SIGTERM" }, NPM_LS_FAILURES.signal],
      [{ status: 2, signal: null, stdout: "{}", stderr: "" }, NPM_LS_FAILURES.exit],
      [{ status: null }, NPM_LS_FAILURES.nullStatus],
      [{ status: 1, signal: null, stdout: "xx", stderr: "xx" }, NPM_LS_FAILURES.outputOverflow],
      [{ status: 1, signal: null, stdout: "x", stderr: "" }, NPM_LS_FAILURES.invalidJson],
    ])
      assert.throws(
        () => parseScopedNpmLsResult(result, 3),
        (error) => error.message === expected && error.stack === `Error: ${expected}`,
      );
  });

  test("drops invalid-JSON secret, path, and command sentinels without a cause", () => {
    const sentinels = ["SECRET_SENTINEL", "C:\\private\\sentinel", "npm ls sentinel-command"];
    let caught;
    try {
      parseScopedNpmLsResult({
        status: 1,
        signal: null,
        stdout: sentinels.join(" "),
        stderr: "",
      });
    } catch (error) {
      caught = error;
    }
    assert.equal(caught.message, NPM_LS_FAILURES.invalidJson);
    assert.equal(caught.cause, undefined);
    const serialized = `${caught.message}\n${caught.stack}\n${JSON.stringify(caught)}`;
    for (const sentinel of sentinels) assert.equal(serialized.includes(sentinel), false);
    assert.equal(publicMulterFailure(new Error(sentinels.join(" "))), NPM_LS_FAILURES.exit);
  });

  test("resolves the trusted npm CLI from the current Node installation without npm_execpath", () => {
    const direct = resolveNpmCli({ env: {}, nodeExecutable: process.execPath });
    assert.match(direct.replaceAll("\\", "/"), /\/npm\/bin\/npm-cli\.js$/u);
    assert.equal(
      resolveNpmCli({ env: { npm_execpath: direct }, nodeExecutable: process.execPath }),
      direct,
    );
    assert.throws(
      () => resolveNpmCli({ env: {}, nodeExecutable: join(repoRoot, "missing-node") }),
      (error) =>
        error.message === NPM_LS_FAILURES.spawnError &&
        error.stack === `Error: ${NPM_LS_FAILURES.spawnError}`,
    );

    const root = mkdtempSync(join(tmpdir(), "fluyo-untrusted-npm-cli-"));
    const arbitraryCli = join(root, "npm-cli.js");
    try {
      writeFileSync(arbitraryCli, "throw new Error('untrusted')\n");
      assert.equal(
        resolveNpmCli({
          env: { npm_execpath: arbitraryCli },
          nodeExecutable: process.execPath,
        }),
        direct,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("times out once without retry and kills the exact owned child", async () => {
    let spawns = 0;
    await assert.rejects(
      runBoundedSubprocess(
        {
          command: process.execPath,
          args: ["-e", "setInterval(() => {}, 1000)"],
          cwd: repoRoot,
          timeoutMs: 50,
        },
        {
          spawnProcess(...args) {
            spawns += 1;
            return spawn(...args);
          },
        },
      ),
      (error) => error.message === NPM_LS_FAILURES.timeout,
    );
    assert.equal(spawns, 1);
    assert.equal(NPM_LS_TIMEOUT_MS, 30_000);
  });

  test("enforces one MiB across stdout and stderr together", async () => {
    const script =
      "process.stdout.write('o'.repeat(614400));process.stderr.write('e'.repeat(614400));setInterval(()=>{},1000)";
    await assert.rejects(
      runBoundedSubprocess({
        command: process.execPath,
        args: ["-e", script],
        cwd: repoRoot,
        timeoutMs: 2_000,
      }),
      (error) => error.message === NPM_LS_FAILURES.outputOverflow,
    );
    assert.equal(NPM_LS_MAX_OUTPUT_BYTES, 1024 * 1024);
  });

  test("aborts once and cleans the owned process tree", async () => {
    const controller = new AbortController();
    let spawns = 0;
    const pending = runBoundedSubprocess(
      {
        command: process.execPath,
        args: ["-e", "setInterval(() => {}, 1000)"],
        cwd: repoRoot,
        timeoutMs: 2_000,
        signal: controller.signal,
      },
      {
        spawnProcess(...args) {
          spawns += 1;
          return spawn(...args);
        },
      },
    );
    controller.abort();
    await assert.rejects(pending, (error) => error.message === NPM_LS_FAILURES.timeout);
    assert.equal(spawns, 1);
  });

  test("rejects a pre-aborted signal before spawning", async () => {
    const controller = new AbortController();
    controller.abort();
    let spawns = 0;
    await assert.rejects(
      runBoundedSubprocess(
        {
          command: process.execPath,
          args: ["-e", "setInterval(() => {}, 1000)"],
          cwd: repoRoot,
          signal: controller.signal,
        },
        {
          spawnProcess() {
            spawns += 1;
            throw new Error("must not spawn");
          },
        },
      ),
      (error) => error.message === NPM_LS_FAILURES.timeout,
    );
    assert.equal(spawns, 0);
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  });

  test("settles a spawn-time abort once and removes its listener", async () => {
    const controller = new AbortController();
    const fakeChild = new EventEmitter();
    fakeChild.pid = 4243;
    fakeChild.exitCode = null;
    fakeChild.signalCode = null;
    fakeChild.stdout = new PassThrough();
    fakeChild.stderr = new PassThrough();
    let spawns = 0;
    let cleanups = 0;
    await assert.rejects(
      runBoundedSubprocess(
        {
          command: process.execPath,
          args: [],
          cwd: repoRoot,
          timeoutMs: 2_000,
          signal: controller.signal,
        },
        {
          spawnProcess() {
            spawns += 1;
            controller.abort();
            return fakeChild;
          },
          async terminateTree(child) {
            cleanups += 1;
            child.exitCode = 1;
            child.emit("close", 1, null);
          },
        },
      ),
      (error) => error.message === NPM_LS_FAILURES.timeout,
    );
    assert.equal(spawns, 1);
    assert.equal(cleanups, 1);
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  });

  test("kills a timed-out child and grandchild without touching an unrelated process", async () => {
    const root = mkdtempSync(join(tmpdir(), "fluyo-multer-tree-"));
    const pidFile = join(root, "tree.json");
    const unrelated = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      detached: false,
      stdio: "ignore",
      windowsHide: true,
    });
    try {
      await assert.rejects(
        runBoundedSubprocess({
          command: process.execPath,
          args: [testFile, "--tree-hang-fixture", pidFile],
          cwd: repoRoot,
          timeoutMs: 500,
        }),
        (error) => error.message === NPM_LS_FAILURES.timeout,
      );
      const identities = JSON.parse(readFileSync(pidFile, "utf8"));
      assert.equal(await waitForProcessDeath(identities.parentPid), true);
      assert.equal(await waitForProcessDeath(identities.grandchildPid), true);
      assert.equal(processIsAlive(unrelated.pid), true);
    } finally {
      unrelated.kill("SIGKILL");
      await waitForProcessDeath(unrelated.pid);
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("reports only cleanup failure when owned-tree cleanup fails", async () => {
    let ownedChild;
    await assert.rejects(
      runBoundedSubprocess(
        {
          command: process.execPath,
          args: ["-e", "setInterval(() => {}, 1000)"],
          cwd: repoRoot,
          timeoutMs: 50,
        },
        {
          spawnProcess(...args) {
            ownedChild = spawn(...args);
            return ownedChild;
          },
          async terminateTree() {
            throw new Error("SECRET CLEANUP DIAGNOSTIC");
          },
        },
      ),
      (error) =>
        error.message === NPM_LS_FAILURES.cleanupFailure &&
        error.stack === `Error: ${NPM_LS_FAILURES.cleanupFailure}` &&
        error.cause === undefined,
    );
    await terminateOwnedProcessTree(ownedChild);
  });

  test("settles once when output arrives after termination begins", async () => {
    const fakeChild = new EventEmitter();
    fakeChild.pid = 4242;
    fakeChild.exitCode = null;
    fakeChild.signalCode = null;
    fakeChild.stdout = new PassThrough();
    fakeChild.stderr = new PassThrough();
    let cleanupCalls = 0;
    await assert.rejects(
      runBoundedSubprocess(
        {
          command: process.execPath,
          args: [],
          cwd: repoRoot,
          timeoutMs: 10,
          maxOutputBytes: 3,
        },
        {
          spawnProcess: () => fakeChild,
          async terminateTree() {
            cleanupCalls += 1;
            fakeChild.stdout.write("late-secret");
            fakeChild.stderr.write("late-path");
            fakeChild.exitCode = 1;
            fakeChild.emit("close", 1, null);
          },
        },
      ),
      (error) => error.message === NPM_LS_FAILURES.timeout,
    );
    assert.equal(cleanupCalls, 1);
  });

  test("keeps the installed-tree probe in one ordered integration phase", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    assert.equal(
      packageJson.scripts["test:audit-policy"],
      "npm run test:audit-policy:unit && npm run test:audit-policy:installed-tree",
    );
    assert.equal(
      packageJson.scripts["test:audit-policy:installed-tree"],
      "node scripts/check-multer-override.integration.mjs",
    );
    assert.doesNotMatch(packageJson.scripts["test:audit-policy:unit"], /test-concurrency|retry/iu);
    const unitSource = readFileSync(testFile, "utf8");
    const integrationSource = readFileSync(
      join(repoRoot, "scripts", "check-multer-override.integration.mjs"),
      "utf8",
    );
    const installedTreeCall = ["checkMulter", "Override(repoRoot)"].join("");
    assert.equal(unitSource.includes(installedTreeCall), false);
    assert.equal(integrationSource.match(/checkMulterOverride\(repoRoot\)/gu)?.length, 1);
    const checkerSource = readFileSync(
      join(repoRoot, "scripts", "check-multer-override.mjs"),
      "utf8",
    );
    assert.doesNotMatch(checkerSource, /spawnSync|cmd\.exe|ComSpec/u);
    assert.match(checkerSource, /command:\s*realpathSync\(process\.execPath\)/u);
    assert.match(checkerSource, /args:\s*\[npmCli,\s*\.\.\.npmArgs\]/u);
    const workflow = readFileSync(join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");
    assert.match(workflow, /test:\s*\n\s*name:\s*Tests\s*\n[\s\S]*?timeout-minutes:\s*15/u);
  });

  test("survives asynchronous two-file filter teardown with one terminal result", () => {
    const child = spawnSync(process.execPath, [testFile, "--late-filter-fixture"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 5_000,
      maxBuffer: 64 * 1024,
      windowsHide: true,
    });
    assert.equal(child.error, undefined);
    assert.equal(child.status, 0, child.stderr);
    const result = JSON.parse(child.stdout.trim());
    assert.deepEqual(
      {
        error: result.error,
        terminalCalls: result.terminalCalls,
        filterCallbacks: result.filterCallbacks,
      },
      { error: "first rejected", terminalCalls: 1, filterCallbacks: 2 },
    );
  });

  test("bounds a hung compatibility child", () => {
    const child = spawnSync(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      timeout: 50,
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(child.error?.code, "ETIMEDOUT");
  });

  test("does not clean up an unstored file after size limit and delayed storage failure", async () => {
    let removals = 0;
    const storage = {
      _handleFile(_req, file, callback) {
        file.stream.resume();
        file.stream.once("end", () =>
          setTimeout(() => callback(new Error("pathless failure")), 20),
        );
      },
      _removeFile(_req, _file, callback) {
        removals += 1;
        callback();
      },
    };
    const result = await runUpload(
      multer({ storage, limits: { fileSize: 3 } }).single("file"),
      multipart([{ name: "file", filename: "large.bin", value: "four" }]),
    );
    assert.equal(result.error, "LIMIT_FILE_SIZE");
    assert.equal(removals, 0);
  });

  test("accepts field size exactly at the limit and rejects one byte over", async () => {
    const upload = multer({ limits: { fieldSize: 5 } }).none();
    const exact = await runUpload(upload, multipart([{ name: "value", value: "12345" }]));
    const over = await runUpload(upload, multipart([{ name: "value", value: "123456" }]));
    assert.deepEqual(
      { error: exact.error, value: exact.body.value },
      { error: null, value: "12345" },
    );
    assert.equal(over.error, "LIMIT_FIELD_VALUE");
  });

  test("bounds a hung multipart request", async () => {
    await assert.rejects(
      runUpload(() => {}, multipart([{ name: "value", value: "x" }]), { timeout: 50 }),
      /REQUEST_TIMEOUT/,
    );
  });
}
