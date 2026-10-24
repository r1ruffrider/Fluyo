import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
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
  checkMulterOverride,
  parseScopedNpmLsResult,
  validateMulterOverrideState,
  validateScopedNpmLs,
} from "./check-multer-override.mjs";

const require = createRequire(import.meta.url);
const multer = require("multer");
const testFile = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(testFile), "..");
const multerDirectory = dirname(require.resolve("multer/package.json"));
const delay = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));

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

if (process.argv.includes("--late-filter-fixture")) {
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

  test("bounds scoped npm process failures and output", () => {
    for (const [result, pattern] of [
      [{ error: { code: "ETIMEDOUT" } }, /NPM_LS_TIMEOUT/],
      [{ error: { code: "ENOBUFS" } }, /NPM_LS_OUTPUT_OVERFLOW/],
      [{ error: { code: "ENOENT" } }, /NPM_LS_SPAWN_ERROR/],
      [{ signal: "SIGTERM" }, /NPM_LS_SIGNAL/],
      [{ status: null }, /NPM_LS_NULL_STATUS/],
      [{ status: 1, signal: null, stdout: "xxxx", stderr: "" }, /NPM_LS_OUTPUT_OVERFLOW/],
      [{ status: 1, signal: null, stdout: "x", stderr: "" }, /NPM_LS_INVALID_JSON/],
    ])
      assert.throws(() => parseScopedNpmLsResult(result, 3), pattern);
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

  test("passes against the installed dependency tree", () => {
    assert.deepEqual(checkMulterOverride(repoRoot), {
      multerVersion: "2.5.0",
      nestVersion: "11.2.7",
    });
  });
}
