#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const EXPECTED_MULTER_VERSION = "2.5.0";
export const EXPECTED_NEST_VERSION = "11.2.7";
export const EXPECTED_NEST_MULTER_PIN = "2.4.0";
export const EXPECTED_MULTER_RESOLVED = "https://registry.npmjs.org/multer/-/multer-2.5.0.tgz";
export const EXPECTED_MULTER_INTEGRITY =
  "sha512-BsqOzYGVq49JcW2IzoSAxeKYRevb+dGGPPWleOR8Lrlk4igwxu1/9pwSXlByhCb7MVZDrNJFC0IBP5/O5nLYRw==";
export const NPM_LS_TIMEOUT_MS = 30_000;
export const NPM_LS_MAX_OUTPUT_BYTES = 1024 * 1024;
export const NPM_LS_CLEANUP_TIMEOUT_MS = 5_000;

export const NPM_LS_FAILURES = Object.freeze({
  timeout: "NPM_LS_TIMEOUT",
  outputOverflow: "NPM_LS_OUTPUT_OVERFLOW",
  spawnError: "NPM_LS_SPAWN_ERROR",
  signal: "NPM_LS_SIGNAL",
  exit: "NPM_LS_EXIT",
  nullStatus: "NPM_LS_NULL_STATUS",
  invalidJson: "NPM_LS_INVALID_JSON",
  cleanupFailure: "NPM_LS_CLEANUP_FAILURE",
});

function fixedFailure(code) {
  const error = new Error(code);
  error.code = code;
  error.stack = `Error: ${code}`;
  return error;
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const mismatch = (errors, label, actual, expected) => {
  if (actual !== expected)
    errors.push(
      `${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}.`,
    );
};

function exactVersionAtLeast(value, minimum) {
  const parse = (version) =>
    /^(\d+)\.(\d+)\.(\d+)$/
      .exec(version ?? "")
      ?.slice(1)
      .map(Number);
  const [actual, floor] = [parse(value), parse(minimum)];
  if (!actual || !floor) return false;
  for (let index = 0; index < 3; index += 1)
    if (actual[index] !== floor[index]) return actual[index] > floor[index];
  return true;
}

export function validateMulterOverrideState(state) {
  const errors = [];
  const rootMulter = state.lock.packages?.["node_modules/multer"];
  const rootNest = state.lock.packages?.["node_modules/@nestjs/platform-express"];
  const multerNodes = Object.keys(state.lock.packages ?? {}).filter((key) =>
    /(^|\/)node_modules\/multer$/.test(key.replaceAll("\\", "/")),
  );
  for (const [label, actual, expected] of [
    ["Root Multer override", state.packageJson.overrides?.multer, EXPECTED_MULTER_VERSION],
    ["Locked Multer version", rootMulter?.version, EXPECTED_MULTER_VERSION],
    ["Locked Multer registry URL", rootMulter?.resolved, EXPECTED_MULTER_RESOLVED],
    ["Locked Multer integrity", rootMulter?.integrity, EXPECTED_MULTER_INTEGRITY],
    ["Installed Multer version", state.installedMulter?.version, EXPECTED_MULTER_VERSION],
    ["Installed Nest platform version", state.nestPackage?.version, EXPECTED_NEST_VERSION],
    ["Locked Nest platform version", rootNest?.version, EXPECTED_NEST_VERSION],
    ["API createRequire Multer version", state.apiResolvedVersion, EXPECTED_MULTER_VERSION],
    ["Nest createRequire Multer version", state.nestResolvedVersion, EXPECTED_MULTER_VERSION],
    ["API createRequire Multer path", state.apiResolvedPackage, state.expectedResolvedPackage],
    ["Nest createRequire Multer path", state.nestResolvedPackage, state.expectedResolvedPackage],
  ])
    mismatch(errors, label, actual, expected);
  if (multerNodes.length !== 1 || multerNodes[0] !== "node_modules/multer")
    errors.push(
      `Expected one root Multer lock node and no nested install: ${JSON.stringify(multerNodes)}.`,
    );

  const installedPin = state.nestPackage?.dependencies?.multer;
  const lockedPin = rootNest?.dependencies?.multer;
  if (installedPin !== EXPECTED_NEST_MULTER_PIN || lockedPin !== EXPECTED_NEST_MULTER_PIN) {
    errors.push(
      exactVersionAtLeast(installedPin, EXPECTED_MULTER_VERSION) && installedPin === lockedPin
        ? `STALE_OVERRIDE_REMOVAL: Nest now pins patched Multer ${installedPin}; remove the temporary override after compatibility review.`
        : `NEST_PIN_CHANGED: expected ${EXPECTED_NEST_MULTER_PIN}, installed Nest requests ${JSON.stringify(installedPin)}, and the lock records ${JSON.stringify(lockedPin)}; reassess without treating this as an override-removal signal.`,
    );
  }
  return errors;
}

function dependencyFlags(value, location = "root", found = []) {
  if (!value || typeof value !== "object") return found;
  for (const key of ["invalid", "missing", "extraneous"])
    if (Object.hasOwn(value, key)) found.push({ location, key, value: value[key] });
  for (const [key, child] of Object.entries(value))
    if (key !== "problems" && key !== "error") dependencyFlags(child, `${location}.${key}`, found);
  return found;
}

function dependencyLocations(value, name, location = "root", found = []) {
  for (const [key, child] of Object.entries(value?.dependencies ?? {})) {
    const childLocation = `${location}.dependencies.${key}`;
    if (key === name) found.push(childLocation);
    dependencyLocations(child, name, childLocation, found);
  }
  return found;
}

function diagnosticKeys(value, location = "root", found = []) {
  if (!value || typeof value !== "object") return found;
  for (const [key, child] of Object.entries(value)) {
    if (key === "problems" || key === "error") found.push({ location, key });
    diagnosticKeys(child, `${location}.${key}`, found);
  }
  return found;
}

const parseProblem = (problem) => {
  const match = /^invalid: multer@(\S+) (.+)$/.exec(problem ?? "");
  return match && { version: match[1], path: match[2] };
};
const sameRealPath = (left, right) => {
  try {
    return realpathSync(left) === realpathSync(right);
  } catch {
    return false;
  }
};

export function validateScopedNpmLs({ status, tree, expectedMulterDirectory }) {
  const errors = [];
  const expectedLocation =
    "root.dependencies.@fluyo/api.dependencies.@nestjs/platform-express.dependencies.multer";
  const multer =
    tree?.dependencies?.["@fluyo/api"]?.dependencies?.["@nestjs/platform-express"]?.dependencies
      ?.multer;
  const validProblem = (problems) => {
    const problem = problems?.length === 1 && parseProblem(problems[0]);
    return (
      problem?.version === EXPECTED_MULTER_VERSION &&
      sameRealPath(problem.path, expectedMulterDirectory)
    );
  };
  mismatch(errors, "Scoped npm ls Multer version", multer?.version, EXPECTED_MULTER_VERSION);
  mismatch(errors, "Scoped npm ls Multer registry URL", multer?.resolved, EXPECTED_MULTER_RESOLVED);
  const flags = dependencyFlags(tree);
  const diagnostics = diagnosticKeys(tree);
  const locations = dependencyLocations(tree, "multer");
  if (locations.length !== 1 || locations[0] !== expectedLocation)
    errors.push("Scoped npm ls must contain exactly one Multer node under Nest platform-express.");

  if (status === 0) {
    if (diagnostics.length !== 0 || flags.length !== 0)
      errors.push(
        "Scoped npm ls clean-success mode must contain no diagnostic keys or dependency flags.",
      );
  } else if (status === 1) {
    const allowedDiagnostics = new Set([
      "root:problems",
      `${expectedLocation}:problems`,
      "root:error",
    ]);
    if (
      diagnostics.length !== allowedDiagnostics.size ||
      diagnostics.some(({ location, key }) => !allowedDiagnostics.has(`${location}:${key}`))
    )
      errors.push(
        "Scoped npm ls invalid-edge mode contains diagnostics outside approved locations.",
      );
    if (!validProblem(tree?.problems))
      errors.push("Scoped npm ls root problem is not the sole installed Multer invalid edge.");
    if (!validProblem(multer?.problems))
      errors.push("Scoped npm ls Multer node does not repeat the sole installed invalid edge.");
    if (
      flags.length !== 1 ||
      flags[0].location !== expectedLocation ||
      flags[0].key !== "invalid" ||
      !/^"2\.4\.0" from node_modules[/\\]@nestjs[/\\]platform-express$/.test(flags[0].value ?? "")
    )
      errors.push(
        "Scoped npm ls invalid-edge mode must contain only the exact Nest-to-Multer edge.",
      );
    if (tree?.error?.code !== "ELSPROBLEMS")
      errors.push("Scoped npm ls invalid-edge mode must be classified as ELSPROBLEMS.");
  } else {
    errors.push(
      `Scoped npm ls exited ${status}; expected clean success or the known invalid edge.`,
    );
  }
  return errors;
}

const outputBytes = (value) =>
  Buffer.isBuffer(value) ? value.length : Buffer.byteLength(value ?? "", "utf8");

export function parseScopedNpmLsResult(result, maxOutputBytes = NPM_LS_MAX_OUTPUT_BYTES) {
  const code = result.error?.code;
  if (code === "ETIMEDOUT") throw fixedFailure(NPM_LS_FAILURES.timeout);
  if (
    code === "ENOBUFS" ||
    outputBytes(result.stdout) + outputBytes(result.stderr) > maxOutputBytes
  )
    throw fixedFailure(NPM_LS_FAILURES.outputOverflow);
  if (result.error) throw fixedFailure(NPM_LS_FAILURES.spawnError);
  if (result.signal != null) throw fixedFailure(NPM_LS_FAILURES.signal);
  if (result.status == null) throw fixedFailure(NPM_LS_FAILURES.nullStatus);
  if (result.status !== 0 && result.status !== 1) throw fixedFailure(NPM_LS_FAILURES.exit);
  try {
    return { status: result.status, tree: JSON.parse(result.stdout) };
  } catch {
    throw fixedFailure(NPM_LS_FAILURES.invalidJson);
  }
}

function childHasExited(child) {
  return child.exitCode != null || child.signalCode != null;
}

function waitForChildExit(child, timeoutMs) {
  if (childHasExited(child)) return Promise.resolve(true);
  return new Promise((resolveWait) => {
    let finished = false;
    const finish = (value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      child.off("close", onClose);
      resolveWait(value);
    };
    const onClose = () => finish(true);
    const timer = setTimeout(() => finish(childHasExited(child)), timeoutMs);
    timer.unref?.();
    child.once("close", onClose);
  });
}

function runCleanupCommand(command, args, timeoutMs) {
  return new Promise((resolveCleanup, rejectCleanup) => {
    let terminal = false;
    let cleanup;
    try {
      cleanup = spawn(command, args, {
        detached: false,
        shell: false,
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      rejectCleanup(fixedFailure(NPM_LS_FAILURES.cleanupFailure));
      return;
    }
    const finish = (error) => {
      if (terminal) return;
      terminal = true;
      clearTimeout(timer);
      if (error) rejectCleanup(fixedFailure(NPM_LS_FAILURES.cleanupFailure));
      else resolveCleanup();
    };
    const timer = setTimeout(() => {
      cleanup.kill("SIGKILL");
      finish(true);
    }, timeoutMs);
    timer.unref?.();
    cleanup.once("error", () => finish(true));
    cleanup.once("close", () => finish(false));
  });
}

export async function terminateOwnedProcessTree(
  child,
  { platform = process.platform, cleanupTimeoutMs = NPM_LS_CLEANUP_TIMEOUT_MS } = {},
) {
  if (!Number.isSafeInteger(child.pid) || child.pid <= 0)
    throw fixedFailure(NPM_LS_FAILURES.cleanupFailure);
  if (childHasExited(child)) return;

  if (platform === "win32") {
    const taskkill = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe");
    await runCleanupCommand(taskkill, ["/PID", String(child.pid), "/T", "/F"], cleanupTimeoutMs);
    if (!(await waitForChildExit(child, cleanupTimeoutMs)))
      throw fixedFailure(NPM_LS_FAILURES.cleanupFailure);
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if (error?.code !== "ESRCH") throw fixedFailure(NPM_LS_FAILURES.cleanupFailure);
  }
  if (await waitForChildExit(child, Math.min(500, cleanupTimeoutMs))) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch (error) {
    if (error?.code !== "ESRCH") throw fixedFailure(NPM_LS_FAILURES.cleanupFailure);
  }
  if (!(await waitForChildExit(child, cleanupTimeoutMs)))
    throw fixedFailure(NPM_LS_FAILURES.cleanupFailure);
}

export function runBoundedSubprocess(
  {
    command,
    args,
    cwd,
    timeoutMs = NPM_LS_TIMEOUT_MS,
    maxOutputBytes = NPM_LS_MAX_OUTPUT_BYTES,
    signal,
  },
  dependencies = {},
) {
  const spawnProcess = dependencies.spawnProcess ?? spawn;
  const terminateTree = dependencies.terminateTree ?? terminateOwnedProcessTree;
  const platform = dependencies.platform ?? process.platform;
  return new Promise((resolveRun, rejectRun) => {
    let child;
    let timer;
    let terminal = false;
    let terminating = false;
    let abortObserved = false;
    let totalBytes = 0;
    const stdout = [];
    const stderr = [];

    const finish = (error, result) => {
      if (terminal) return;
      terminal = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (error) rejectRun(error);
      else resolveRun(result);
    };
    const terminate = async (failureCode) => {
      if (terminal || terminating) return;
      terminating = true;
      try {
        await terminateTree(child, { platform });
      } catch {
        finish(fixedFailure(NPM_LS_FAILURES.cleanupFailure));
        return;
      }
      finish(fixedFailure(failureCode));
    };
    const onAbort = () => {
      abortObserved = true;
      if (child) void terminate(NPM_LS_FAILURES.timeout);
    };
    const onChunk = (target, chunk) => {
      if (terminal || terminating) return;
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += bytes.length;
      if (totalBytes > maxOutputBytes) {
        void terminate(NPM_LS_FAILURES.outputOverflow);
        return;
      }
      target.push(bytes);
    };

    if (signal?.aborted) {
      finish(fixedFailure(NPM_LS_FAILURES.timeout));
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted || abortObserved) {
      finish(fixedFailure(NPM_LS_FAILURES.timeout));
      return;
    }
    try {
      child = spawnProcess(command, args, {
        cwd,
        detached: platform !== "win32",
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch {
      finish(fixedFailure(NPM_LS_FAILURES.spawnError));
      return;
    }
    timer = setTimeout(() => void terminate(NPM_LS_FAILURES.timeout), timeoutMs);
    timer.unref?.();
    child.stdout?.on("data", (chunk) => onChunk(stdout, chunk));
    child.stderr?.on("data", (chunk) => onChunk(stderr, chunk));
    child.once("error", () => {
      if (!terminating) finish(fixedFailure(NPM_LS_FAILURES.spawnError));
    });
    child.once("close", (status, childSignal) => {
      if (terminal || terminating) return;
      finish(null, {
        status,
        signal: childSignal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
    if (signal?.aborted || abortObserved) void terminate(NPM_LS_FAILURES.timeout);
  });
}

export function resolveNpmCli({ env = process.env, nodeExecutable = process.execPath } = {}) {
  let nodeDirectory;
  try {
    nodeDirectory = dirname(realpathSync(nodeExecutable));
  } catch {
    throw fixedFailure(NPM_LS_FAILURES.spawnError);
  }
  const candidates = [
    join(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js"),
    resolve(nodeDirectory, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
    resolve(nodeDirectory, "..", "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  const trusted = [];
  for (const candidate of candidates) {
    try {
      const resolved = realpathSync(candidate);
      if (basename(resolved) === "npm-cli.js" && !trusted.includes(resolved))
        trusted.push(resolved);
    } catch {
      // Try only the next fixed layout derived from the current Node executable.
    }
  }
  if (trusted.length === 0) throw fixedFailure(NPM_LS_FAILURES.spawnError);
  if (env.npm_execpath && isAbsolute(env.npm_execpath)) {
    try {
      const configured = realpathSync(env.npm_execpath);
      if (trusted.includes(configured)) return configured;
    } catch {
      // An environment value never expands the Node-derived trust set.
    }
  }
  return trusted[0];
}

export async function runScopedNpmLs(repoRoot, options = {}) {
  const npmArgs = ["ls", "@nestjs/platform-express", "multer", "--all", "--json"];
  const npmCli = options.npmCli ?? resolveNpmCli();
  const result = await runBoundedSubprocess(
    {
      command: realpathSync(process.execPath),
      args: [npmCli, ...npmArgs],
      cwd: repoRoot,
      timeoutMs: options.timeoutMs,
      maxOutputBytes: options.maxOutputBytes,
      signal: options.signal,
    },
    options.dependencies,
  );
  return parseScopedNpmLsResult(result, options.maxOutputBytes);
}

export async function checkMulterOverride(repoRoot, options = {}) {
  const packageJson = readJson(join(repoRoot, "package.json"));
  const lock = readJson(join(repoRoot, "package-lock.json"));
  const nestPath = join(repoRoot, "node_modules", "@nestjs", "platform-express", "package.json");
  const multerPath = join(repoRoot, "node_modules", "multer", "package.json");
  const nestPackage = readJson(nestPath);
  const installedMulter = readJson(multerPath);
  const apiResolvedPackage = realpathSync(
    createRequire(join(repoRoot, "apps", "api", "package.json")).resolve("multer/package.json"),
  );
  const nestResolvedPackage = realpathSync(createRequire(nestPath).resolve("multer/package.json"));
  const expectedResolvedPackage = realpathSync(multerPath);
  const errors = validateMulterOverrideState({
    packageJson,
    lock,
    nestPackage,
    installedMulter,
    expectedResolvedPackage,
    apiResolvedPackage,
    nestResolvedPackage,
    apiResolvedVersion: readJson(apiResolvedPackage).version,
    nestResolvedVersion: readJson(nestResolvedPackage).version,
  });
  errors.push(
    ...validateScopedNpmLs({
      ...(await runScopedNpmLs(repoRoot, options)),
      expectedMulterDirectory: dirname(expectedResolvedPackage),
    }),
  );
  if (errors.length) throw new Error(`Multer override policy failed:\n- ${errors.join("\n- ")}`);
  return { multerVersion: installedMulter.version, nestVersion: nestPackage.version };
}

export function publicMulterFailure(error) {
  return Object.values(NPM_LS_FAILURES).includes(error?.message)
    ? error.message
    : NPM_LS_FAILURES.exit;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await checkMulterOverride(
      resolve(dirname(fileURLToPath(import.meta.url)), ".."),
    );
    console.log(
      `Multer override policy passed: Multer ${result.multerVersion} with Nest ${result.nestVersion}.`,
    );
  } catch (error) {
    process.stderr.write(`${publicMulterFailure(error)}\n`);
    process.exitCode = 1;
  }
}
