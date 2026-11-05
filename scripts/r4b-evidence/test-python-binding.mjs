import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { basename, delimiter, isAbsolute, resolve } from "node:path";

const INTROSPECTION = [
  "import json, os, sys",
  "print(json.dumps({'executable': os.path.realpath(sys.executable), 'version': list(sys.version_info[:3])}, separators=(',', ':')))",
].join(";");

function pathEntries(environment) {
  const path = environment.PATH ?? environment.Path;
  if (typeof path !== "string" || !path) {
    throw new Error("test-only Python resolver requires a nonempty PATH");
  }
  return path
    .split(delimiter)
    .map((entry) => entry.trim().replace(/^"|"$/gu, ""))
    .filter((entry) => entry && isAbsolute(entry));
}

function inspectCandidate(candidate, environment) {
  let metadata;
  try {
    metadata = lstatSync(candidate);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "EACCES" || error?.code === "EPERM")
      return null;
    throw error;
  }
  if (!metadata.isFile() || metadata.isSymbolicLink()) return null;
  const realExecutable = realpathSync.native(candidate);
  if (resolve(candidate).toLowerCase() !== realExecutable.toLowerCase()) return null;
  if (basename(realExecutable).toLowerCase() !== "python.exe") return null;

  const inspected = spawnSync(realExecutable, ["-I", "-c", INTROSPECTION], {
    encoding: "utf8",
    env: environment,
    timeout: 10_000,
    windowsHide: true,
  });
  if (inspected.error || inspected.status !== 0) return null;

  let payload;
  try {
    payload = JSON.parse(inspected.stdout.trim());
  } catch {
    return null;
  }
  if (
    !payload ||
    JSON.stringify(Object.keys(payload)) !== JSON.stringify(["executable", "version"]) ||
    typeof payload.executable !== "string" ||
    !Array.isArray(payload.version) ||
    payload.version.length !== 3 ||
    payload.version.some((part) => !Number.isSafeInteger(part) || part < 0) ||
    payload.version[0] !== 3 ||
    payload.version[1] !== 12
  ) {
    return null;
  }
  const reportedExecutable = realpathSync.native(payload.executable);
  if (reportedExecutable.toLowerCase() !== realExecutable.toLowerCase()) return null;

  return Object.freeze({
    path: realExecutable,
    sha256: createHash("sha256").update(readFileSync(realExecutable)).digest("hex"),
    version: payload.version.join("."),
  });
}

export function resolveTestPythonBinding(environment = process.env) {
  if (process.platform !== "win32") {
    throw new Error("test-only Python resolver requires process.platform === win32");
  }
  const seen = new Set();
  for (const entry of pathEntries(environment)) {
    const candidate = resolve(entry, "python.exe");
    const identity = candidate.toLowerCase();
    if (seen.has(identity)) continue;
    seen.add(identity);
    const binding = inspectCandidate(candidate, environment);
    if (binding) return binding;
  }
  throw new Error("PATH does not contain a validated Python 3.12 python.exe interpreter");
}

export function bindTestPythonEnvironment(environment = process.env) {
  const binding = resolveTestPythonBinding(environment);
  return Object.freeze({
    binding,
    environment: Object.freeze({
      ...environment,
      FLUYO_R4B_TEST_PYTHON: binding.path,
      FLUYO_R4B_TEST_PYTHON_SHA256: binding.sha256,
    }),
  });
}
