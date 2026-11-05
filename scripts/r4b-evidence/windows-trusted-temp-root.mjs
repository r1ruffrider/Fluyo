import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  realpathSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, parse, relative, resolve } from "node:path";

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function inspectDirectory(path) {
  const before = lstatSync(path, { bigint: true });
  if (!before.isDirectory() || before.isSymbolicLink()) throw new Error("unsafe directory");
  const descriptor = openSync(path, constants.O_RDONLY);
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    const repeated = lstatSync(path, { bigint: true });
    const canonical = realpathSync.native(path);
    const canonicalIdentity = statSync(canonical, { bigint: true });
    if (
      !opened.isDirectory() ||
      !repeated.isDirectory() ||
      repeated.isSymbolicLink() ||
      !canonicalIdentity.isDirectory() ||
      !sameIdentity(before, opened) ||
      !sameIdentity(opened, repeated) ||
      !sameIdentity(opened, canonicalIdentity)
    ) {
      throw new Error("identity mismatch");
    }
    return { canonical, descriptor, identity: opened };
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}

function captureTrustedWindowsTempRoot() {
  const heldDescriptors = [];
  try {
    const observed = resolve(tmpdir());
    const root = parse(observed).root;
    if (!isAbsolute(observed) || !/^[a-z]:\\$/iu.test(root)) throw new Error("unsafe root");
    const segments = relative(root, observed).split(/[\\/]/u).filter(Boolean);
    let current = root;
    let finalIdentity;
    for (const segment of ["", ...segments]) {
      if (segment === "." || segment === ".." || segment.includes(":")) {
        throw new Error("unsafe segment");
      }
      if (segment !== "") current = join(current, segment);
      const inspected = inspectDirectory(current);
      heldDescriptors.push(inspected.descriptor);
      current = inspected.canonical;
      finalIdentity = inspected.identity;
    }
    if (!finalIdentity) throw new Error("missing identity");
    return Object.freeze({
      root: current,
      fileIndex: String(finalIdentity.ino),
      heldDescriptors: Object.freeze(heldDescriptors),
    });
  } catch {
    for (const descriptor of heldDescriptors.reverse()) closeSync(descriptor);
    throw new Error("WINDOWS_TRUSTED_TEMP_ROOT_IDENTITY");
  }
}

let trustedWindowsTempState = "UNATTEMPTED";
let trustedWindowsTempCapability;

function trustedWindowsTempFailure() {
  throw new Error("WINDOWS_TRUSTED_TEMP_ROOT_IDENTITY");
}

function requireTrustedWindowsTempCapability() {
  if (trustedWindowsTempState === "READY") return trustedWindowsTempCapability;
  if (trustedWindowsTempState === "FAILED") return trustedWindowsTempFailure();
  if (process.platform !== "win32") {
    trustedWindowsTempState = "FAILED";
    return trustedWindowsTempFailure();
  }
  try {
    trustedWindowsTempCapability = captureTrustedWindowsTempRoot();
    trustedWindowsTempState = "READY";
    return trustedWindowsTempCapability;
  } catch {
    trustedWindowsTempState = "FAILED";
    trustedWindowsTempCapability = undefined;
    return trustedWindowsTempFailure();
  }
}

export function windowsTrustedTempRoot() {
  if (arguments.length !== 0) return trustedWindowsTempFailure();
  return requireTrustedWindowsTempCapability().root;
}

export function windowsTrustedTempEnvironment() {
  if (arguments.length !== 0) return trustedWindowsTempFailure();
  const trustedWindowsTemp = requireTrustedWindowsTempCapability();
  return Object.freeze({
    TEMP: trustedWindowsTemp.root,
    TMP: trustedWindowsTemp.root,
    FLUYO_TRUSTED_TEMP_FILE_INDEX: trustedWindowsTemp.fileIndex,
  });
}
