#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const EXPECTED_MULTER_VERSION = "2.5.0";
export const EXPECTED_NEST_VERSION = "11.2.7";
export const EXPECTED_NEST_MULTER_PIN = "2.4.0";
export const EXPECTED_MULTER_RESOLVED = "https://registry.npmjs.org/multer/-/multer-2.5.0.tgz";
export const EXPECTED_MULTER_INTEGRITY =
  "sha512-BsqOzYGVq49JcW2IzoSAxeKYRevb+dGGPPWleOR8Lrlk4igwxu1/9pwSXlByhCb7MVZDrNJFC0IBP5/O5nLYRw==";
export const NPM_LS_TIMEOUT_MS = 15_000;
export const NPM_LS_MAX_BUFFER_BYTES = 1024 * 1024;

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

export function parseScopedNpmLsResult(result, maxBuffer = NPM_LS_MAX_BUFFER_BYTES) {
  const code = result.error?.code;
  if (code === "ETIMEDOUT")
    throw new Error(`NPM_LS_TIMEOUT: scoped npm ls exceeded ${NPM_LS_TIMEOUT_MS}ms.`);
  if (
    code === "ENOBUFS" ||
    outputBytes(result.stdout) > maxBuffer ||
    outputBytes(result.stderr) > maxBuffer
  )
    throw new Error(`NPM_LS_OUTPUT_OVERFLOW: scoped npm ls exceeded ${maxBuffer} bytes.`);
  if (result.error) throw new Error(`NPM_LS_SPAWN_ERROR: ${code ?? "unknown"}.`);
  if (result.signal != null)
    throw new Error(`NPM_LS_SIGNAL: scoped npm ls ended with ${result.signal}.`);
  if (result.status == null)
    throw new Error("NPM_LS_NULL_STATUS: scoped npm ls returned no exit status.");
  try {
    return { status: result.status, tree: JSON.parse(result.stdout) };
  } catch (error) {
    throw new Error("NPM_LS_INVALID_JSON: scoped npm ls did not produce JSON.", { cause: error });
  }
}

function runScopedNpmLs(repoRoot) {
  const npmArgs = ["ls", "@nestjs/platform-express", "multer", "--all", "--json"];
  const win = process.platform === "win32";
  return parseScopedNpmLsResult(
    spawnSync(
      win ? (process.env.ComSpec ?? "cmd.exe") : "npm",
      win ? ["/d", "/s", "/c", "npm", ...npmArgs] : npmArgs,
      {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: NPM_LS_MAX_BUFFER_BYTES,
        timeout: NPM_LS_TIMEOUT_MS,
        windowsHide: true,
      },
    ),
  );
}

export function checkMulterOverride(repoRoot) {
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
      ...runScopedNpmLs(repoRoot),
      expectedMulterDirectory: dirname(expectedResolvedPackage),
    }),
  );
  if (errors.length) throw new Error(`Multer override policy failed:\n- ${errors.join("\n- ")}`);
  return { multerVersion: installedMulter.version, nestVersion: nestPackage.version };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = checkMulterOverride(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
  console.log(
    `Multer override policy passed: Multer ${result.multerVersion} with Nest ${result.nestVersion}.`,
  );
}
