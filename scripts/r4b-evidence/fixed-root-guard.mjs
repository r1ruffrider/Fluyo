import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fsyncSync,
  fstatSync,
  ftruncateSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import {
  nativeCreateDirectory,
  nativeInventory,
  nativeOverwriteExisting,
  nativeReadBounded,
  nativeRemoveTree,
  nativeRename,
  nativeUnlink,
  nativeWrite,
} from "./windows-native-client.mjs";

const RETAINED_OWNED_INVENTORIES = new Map();
const ISSUED_DELETION_TOMBSTONES = new WeakMap();

function comparable(path) {
  const value = resolve(path).replace(/^\\\\\?\\/u, "");
  return process.platform === "win32" ? value.toLowerCase() : value;
}

export function isPathWithin(child, parent) {
  const fromParent = relative(resolve(parent), resolve(child));
  return (
    fromParent === "" ||
    (fromParent !== ".." && !fromParent.startsWith(`..${sep}`) && !isAbsolute(fromParent))
  );
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function assertExistingRealPath(path, expectedKind, label) {
  const before = lstatSync(path, { bigint: true });
  if (before.isSymbolicLink()) throw new Error(`${label} rejects a link or reparse component`);
  if (expectedKind === "directory" && !before.isDirectory()) {
    throw new Error(`${label} requires a real directory`);
  }
  if (expectedKind === "file" && !before.isFile()) {
    throw new Error(`${label} requires a real regular file`);
  }
  if (comparable(realpathSync.native(path)) !== comparable(path)) {
    throw new Error(`${label} rejects a junction, mount, alias, or reparse component`);
  }
  const after = lstatSync(path, { bigint: true });
  if (!sameIdentity(before, after) || before.mode !== after.mode) {
    throw new Error(`${label} identity changed during validation`);
  }
  return after;
}

function captureExistingChain(repositoryRoot, target, label, includeTarget = false) {
  const exactRoot = resolve(repositoryRoot);
  const exactTarget = resolve(target);
  const boundary = includeTarget ? exactTarget : dirname(exactTarget);
  if (!isPathWithin(boundary, exactRoot)) throw new Error(`${label} escaped the repository root`);
  const records = [];
  const segments = relative(exactRoot, boundary).split(sep).filter(Boolean);
  let current = exactRoot;
  for (const segment of [null, ...segments]) {
    if (segment !== null) current = resolve(current, segment);
    if (!existsSync(current)) break;
    const metadata = assertExistingRealPath(current, "directory", label);
    records.push(
      Object.freeze({
        path: current,
        dev: metadata.dev,
        ino: metadata.ino,
        mode: metadata.mode,
        realPath: comparable(realpathSync.native(current)),
      }),
    );
  }
  return Object.freeze(records);
}

function assertExistingChainUnchanged(records, label) {
  for (const record of records) {
    const metadata = assertExistingRealPath(record.path, "directory", label);
    if (
      metadata.dev !== record.dev ||
      metadata.ino !== record.ino ||
      metadata.mode !== record.mode ||
      comparable(realpathSync.native(record.path)) !== record.realPath
    ) {
      throw new Error(`${label} ancestor identity changed at the mutation boundary`);
    }
  }
}

export function assertFixedRootGuard(
  repositoryRoot,
  target,
  { leafKind = "any", allowAbsentLeaf = true, label = "fixed-root guard" } = {},
) {
  const exactRepositoryRoot = resolve(repositoryRoot);
  const exactTarget = resolve(target);
  if (!isPathWithin(exactTarget, exactRepositoryRoot)) {
    throw new Error(`${label} escaped the repository root`);
  }
  assertExistingRealPath(exactRepositoryRoot, "directory", label);
  const segments = relative(exactRepositoryRoot, exactTarget).split(sep).filter(Boolean);
  let current = exactRepositoryRoot;
  let absent = false;
  for (const [index, segment] of segments.entries()) {
    current = resolve(current, segment);
    if (absent || !existsSync(current)) {
      absent = true;
      continue;
    }
    const isLeaf = index === segments.length - 1;
    assertExistingRealPath(current, isLeaf ? leafKind : "directory", label);
  }
  if (absent && !allowAbsentLeaf) throw new Error(`${label} requires an existing target`);
  return Object.freeze({
    repositoryRoot: exactRepositoryRoot,
    target: exactTarget,
    exists: !absent,
  });
}

export function readBoundedRegularFile(path, repositoryRoot, maximumBytes, label) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) {
    throw new Error(`${label} byte bound is invalid`);
  }
  assertFixedRootGuard(repositoryRoot, path, {
    allowAbsentLeaf: false,
    leafKind: "file",
    label,
  });
  if (process.platform === "win32") {
    return nativeReadBounded(path, repositoryRoot, maximumBytes, label);
  }
  const before = lstatSync(path, { bigint: true });
  if (before.size > BigInt(maximumBytes)) throw new Error(`${label} exceeds its byte bound`);
  const noFollow = constants.O_NOFOLLOW ?? 0;
  const descriptor = openSync(path, constants.O_RDONLY | noFollow);
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || !sameIdentity(before, opened)) {
      throw new Error(`${label} handle identity changed or is not a regular file`);
    }
    const chunks = [];
    let total = 0;
    while (true) {
      const remaining = maximumBytes + 1 - total;
      if (remaining <= 0) throw new Error(`${label} exceeds its byte bound`);
      const chunk = Buffer.allocUnsafe(Math.min(4096, remaining));
      const count = readSync(descriptor, chunk, 0, chunk.length, null);
      if (count === 0) break;
      total += count;
      if (total > maximumBytes) throw new Error(`${label} exceeds its byte bound`);
      chunks.push(chunk.subarray(0, count));
    }
    const openedAfter = fstatSync(descriptor, { bigint: true });
    const pathAfter = lstatSync(path, { bigint: true });
    if (
      !sameIdentity(opened, openedAfter) ||
      !sameIdentity(openedAfter, pathAfter) ||
      openedAfter.size !== BigInt(total)
    ) {
      throw new Error(`${label} changed while being read`);
    }
    assertFixedRootGuard(repositoryRoot, path, {
      allowAbsentLeaf: false,
      leafKind: "file",
      label,
    });
    return Buffer.concat(chunks, total);
  } finally {
    closeSync(descriptor);
  }
}

export function createFixedDirectory(
  path,
  repositoryRoot,
  { recursive = false, label = "fixed directory creation" } = {},
) {
  const exactRoot = resolve(repositoryRoot);
  const exactPath = resolve(path);
  if (!isPathWithin(exactPath, exactRoot)) throw new Error(`${label} escaped the repository root`);
  if (process.platform === "win32") {
    const segments = relative(exactRoot, exactPath).split(sep).filter(Boolean);
    let current = exactRoot;
    for (const [index, segment] of segments.entries()) {
      current = resolve(current, segment);
      if (existsSync(current)) {
        assertExistingRealPath(current, "directory", label);
        continue;
      }
      if (!recursive && index !== segments.length - 1) {
        throw new Error(`${label} parent directory is absent`);
      }
      nativeCreateDirectory(current, exactRoot, { recursive: false, label });
    }
    return assertFixedRootGuard(exactRoot, exactPath, {
      allowAbsentLeaf: false,
      leafKind: "directory",
      label,
    });
  }
  const segments = relative(exactRoot, exactPath).split(sep).filter(Boolean);
  let current = exactRoot;
  for (const [index, segment] of segments.entries()) {
    current = resolve(current, segment);
    if (existsSync(current)) {
      assertExistingRealPath(current, "directory", label);
      continue;
    }
    if (!recursive && index !== segments.length - 1) {
      throw new Error(`${label} parent directory is absent`);
    }
    const parentSnapshot = captureExistingChain(exactRoot, current, label);
    mkdirSync(current, { recursive: false });
    assertExistingChainUnchanged(parentSnapshot, label);
    assertExistingRealPath(current, "directory", label);
  }
  return assertFixedRootGuard(exactRoot, exactPath, {
    allowAbsentLeaf: false,
    leafKind: "directory",
    label,
  });
}

function numericWriteFlags(flag, label) {
  const noFollow = constants.O_NOFOLLOW ?? 0;
  if (flag === "wx") return constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow;
  if (flag === "ax")
    return (
      constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_EXCL | noFollow
    );
  if (flag === "a") return constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | noFollow;
  throw new Error(`${label} accepts only wx, ax, or a`);
}

export function writeFixedRegularFile(
  path,
  repositoryRoot,
  bytes,
  { encoding = "utf8", flag = "wx", label = "fixed regular-file write" } = {},
) {
  const exactRoot = resolve(repositoryRoot);
  const exactPath = resolve(path);
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, encoding);
  if (process.platform === "win32") {
    if (!new Set(["wx", "ax", "a"]).has(flag)) {
      throw new Error(`${label} accepts only wx, ax, or a`);
    }
    nativeWrite(exactPath, exactRoot, buffer, { encoding, flag, label });
    return assertFixedRootGuard(exactRoot, exactPath, {
      allowAbsentLeaf: false,
      leafKind: "file",
      label,
    });
  }
  const parentSnapshot = captureExistingChain(exactRoot, exactPath, label);
  if (!parentSnapshot.length || parentSnapshot.at(-1).path !== resolve(dirname(exactPath))) {
    throw new Error(`${label} requires an existing validated parent`);
  }
  const before = existsSync(exactPath) ? lstatSync(exactPath, { bigint: true }) : null;
  if (before && (before.isSymbolicLink() || !before.isFile())) {
    throw new Error(`${label} rejects a link, reparse point, or non-file target`);
  }
  const descriptor = openSync(exactPath, numericWriteFlags(flag, label), 0o600);
  try {
    assertExistingChainUnchanged(parentSnapshot, label);
    const opened = fstatSync(descriptor, { bigint: true });
    const pathEntry = lstatSync(exactPath, { bigint: true });
    if (
      !opened.isFile() ||
      !sameIdentity(opened, pathEntry) ||
      (before && !sameIdentity(before, opened))
    ) {
      throw new Error(`${label} target identity changed before mutation`);
    }
    let offset = 0;
    while (offset < buffer.length) {
      offset += writeSync(descriptor, buffer, offset, buffer.length - offset, null);
    }
    fsyncSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    const pathAfter = lstatSync(exactPath, { bigint: true });
    assertExistingChainUnchanged(parentSnapshot, label);
    if (!sameIdentity(opened, after) || !sameIdentity(after, pathAfter)) {
      throw new Error(`${label} target identity changed during mutation`);
    }
  } finally {
    closeSync(descriptor);
  }
  return assertFixedRootGuard(exactRoot, exactPath, {
    allowAbsentLeaf: false,
    leafKind: "file",
    label,
  });
}

export function overwriteFixedRegularFile(
  path,
  repositoryRoot,
  bytes,
  { encoding = "utf8", label = "fixed regular-file overwrite" } = {},
) {
  const exactRoot = resolve(repositoryRoot);
  const exactPath = resolve(path);
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, encoding);
  assertFixedRootGuard(exactRoot, exactPath, { allowAbsentLeaf: false, leafKind: "file", label });
  if (process.platform === "win32") {
    nativeOverwriteExisting(exactPath, exactRoot, buffer, { encoding, label });
    return assertFixedRootGuard(exactRoot, exactPath, {
      allowAbsentLeaf: false,
      leafKind: "file",
      label,
    });
  }
  const parentSnapshot = captureExistingChain(exactRoot, exactPath, label);
  const before = lstatSync(exactPath, { bigint: true });
  const descriptor = openSync(exactPath, constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || !sameIdentity(before, opened))
      throw new Error(`${label} target identity changed`);
    ftruncateSync(descriptor, 0);
    let offset = 0;
    while (offset < buffer.length)
      offset += writeSync(descriptor, buffer, offset, buffer.length - offset, null);
    fsyncSync(descriptor);
    assertExistingChainUnchanged(parentSnapshot, label);
  } finally {
    closeSync(descriptor);
  }
  return assertFixedRootGuard(exactRoot, exactPath, {
    allowAbsentLeaf: false,
    leafKind: "file",
    label,
  });
}

export function renameFixedRegularFile(
  source,
  destination,
  repositoryRoot,
  label = "fixed regular-file rename",
) {
  const exactRoot = resolve(repositoryRoot);
  const exactSource = resolve(source);
  const exactDestination = resolve(destination);
  if (existsSync(exactDestination)) throw new Error(`${label} destination already exists`);
  if (process.platform === "win32") {
    nativeRename(exactSource, exactDestination, exactRoot);
    return assertFixedRootGuard(exactRoot, exactDestination, {
      allowAbsentLeaf: false,
      leafKind: "file",
      label,
    });
  }
  const sourceParent = captureExistingChain(exactRoot, exactSource, label);
  const destinationParent = captureExistingChain(exactRoot, exactDestination, label);
  const descriptor = openSync(exactSource, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    const sourceEntry = lstatSync(exactSource, { bigint: true });
    if (!opened.isFile() || !sameIdentity(opened, sourceEntry)) {
      throw new Error(`${label} source identity changed before rename`);
    }
    assertExistingChainUnchanged(sourceParent, label);
    assertExistingChainUnchanged(destinationParent, label);
    renameSync(exactSource, exactDestination);
    assertExistingChainUnchanged(sourceParent, label);
    assertExistingChainUnchanged(destinationParent, label);
    const destinationEntry = lstatSync(exactDestination, { bigint: true });
    if (!sameIdentity(opened, destinationEntry)) {
      throw new Error(`${label} destination identity changed during rename`);
    }
  } finally {
    closeSync(descriptor);
  }
  return assertFixedRootGuard(exactRoot, exactDestination, {
    allowAbsentLeaf: false,
    leafKind: "file",
    label,
  });
}

export function inventoryFixedOwnedTree(path, repositoryRoot, label = "fixed owned tree") {
  const retainedKey = `${comparable(repositoryRoot)}\0${comparable(path)}`;
  const prior = RETAINED_OWNED_INVENTORIES.get(retainedKey);
  if (prior) {
    if (prior.deleted === true) {
      const tombstone = Object.freeze({
        files: 0,
        directories: 0,
        bytes: 0n,
        reparsePoints: 0,
        digest: digestRecords([]),
        originalLeaseDigest: prior.publicInventory.digest,
      });
      ISSUED_DELETION_TOMBSTONES.set(tombstone, Object.freeze({ retainedKey }));
      return tombstone;
    }
    return prior.publicInventory;
  }
  const guarded = assertFixedRootGuard(repositoryRoot, path, { label });
  if (!guarded.exists) {
    return Object.freeze({ files: 0, directories: 0, bytes: 0n, digest: digestRecords([]) });
  }
  if (process.platform === "win32") {
    const inventory = nativeInventory(path, repositoryRoot);
    const publicInventory = Object.freeze({
      files: Number(inventory.files),
      directories: Number(inventory.directories),
      bytes: BigInt(inventory.bytes),
      digest: inventory.inventoryDigest,
      reparsePoints: 0,
    });
    RETAINED_OWNED_INVENTORIES.set(retainedKey, {
      nativeInventory: inventory,
      publicInventory,
    });
    return publicInventory;
  }
  assertFixedRootGuard(repositoryRoot, path, {
    allowAbsentLeaf: false,
    leafKind: "directory",
    label,
  });
  const records = [];
  const pending = [resolve(path)];
  let directories = 0;
  let bytes = 0n;
  while (pending.length) {
    const directory = pending.pop();
    assertFixedRootGuard(repositoryRoot, directory, {
      allowAbsentLeaf: false,
      leafKind: "directory",
      label,
    });
    directories += 1;
    for (const name of readdirSync(directory)) {
      const child = resolve(directory, name);
      const metadata = assertExistingRealPath(child, "any", label);
      if (metadata.isDirectory()) pending.push(child);
      else if (metadata.isFile()) {
        if (metadata.size > BigInt(Number.MAX_SAFE_INTEGER)) {
          throw new Error(`${label} file is too large to inventory safely: ${child}`);
        }
        const content = readBoundedRegularFile(child, repositoryRoot, Number(metadata.size), label);
        bytes += metadata.size;
        records.push({
          path: relative(resolve(path), child).replaceAll("\\", "/"),
          bytes: String(metadata.size),
          sha256: createHash("sha256").update(content).digest("hex"),
        });
      } else throw new Error(`${label} contains an unsupported filesystem entry`);
    }
  }
  records.sort((left, right) => left.path.localeCompare(right.path));
  const publicInventory = Object.freeze({
    files: records.length,
    directories,
    bytes,
    reparsePoints: 0,
    digest: digestRecords(records),
  });
  RETAINED_OWNED_INVENTORIES.set(retainedKey, { publicInventory });
  return publicInventory;
}

function digestRecords(records) {
  return createHash("sha256").update(JSON.stringify(records), "utf8").digest("hex");
}

export function removeFixedOwnedTree(
  path,
  repositoryRoot,
  approvedInventory,
  label = "fixed owned cleanup",
) {
  if (!approvedInventory) {
    throw new Error(`${label} requires the original approved inventory lease`);
  }
  const retainedKey = `${comparable(repositoryRoot)}\0${comparable(path)}`;
  const retained = RETAINED_OWNED_INVENTORIES.get(retainedKey);
  const issuedTombstone = ISSUED_DELETION_TOMBSTONES.get(approvedInventory);
  const originalLease = retained?.publicInventory === approvedInventory;
  const retainedTombstone =
    retained?.deleted === true &&
    issuedTombstone?.retainedKey === retainedKey &&
    approvedInventory.originalLeaseDigest === retained.publicInventory.digest;
  if (!retained || (!originalLease && !retainedTombstone)) {
    throw new Error(`${label} rejects a fresh, released, or substituted inventory`);
  }
  if (retained.deleted === true) {
    if (existsSync(path))
      throw new Error(`${label} rejects a recreated tree after its original tombstone`);
    return retained.publicInventory;
  }
  if (!existsSync(path)) {
    throw new Error(`${label} original approved tree disappeared before deletion`);
  }
  if (process.platform === "win32") {
    assertFixedRootGuard(repositoryRoot, path, { label });
    nativeRemoveTree(path, repositoryRoot, approvedInventory.digest, {
      inventory: retained.nativeInventory,
    });
    if (existsSync(path)) throw new Error(`${label} remains after deletion`);
    retained.deleted = true;
    retained.deleteOutcome = "ORIGINAL_INVENTORY_DELETED";
    return approvedInventory;
  }
  const parentSnapshot = captureExistingChain(repositoryRoot, path, label);
  const second = inventoryFixedOwnedTree(path, repositoryRoot, label);
  if (
    JSON.stringify(second, (_, value) => (typeof value === "bigint" ? String(value) : value)) !==
    JSON.stringify(approvedInventory, (_, value) =>
      typeof value === "bigint" ? String(value) : value,
    )
  ) {
    throw new Error(`${label} changed before deletion`);
  }
  assertFixedRootGuard(repositoryRoot, path, {
    allowAbsentLeaf: false,
    leafKind: "directory",
    label,
  });
  assertExistingChainUnchanged(parentSnapshot, label);
  rmSync(path, { recursive: true, force: false });
  assertExistingChainUnchanged(parentSnapshot, label);
  if (existsSync(path)) throw new Error(`${label} remains after deletion`);
  assertFixedRootGuard(repositoryRoot, path, { label });
  retained.deleted = true;
  retained.deleteOutcome = "ORIGINAL_INVENTORY_DELETED";
  return approvedInventory;
}

export function unlinkFixedRegularFile(path, repositoryRoot, label = "fixed file cleanup") {
  const exactPath = resolve(path);
  if (process.platform === "win32") {
    nativeUnlink(exactPath, repositoryRoot);
    if (existsSync(exactPath)) throw new Error(`${label} remains after deletion`);
    return;
  }
  const parentSnapshot = captureExistingChain(repositoryRoot, exactPath, label);
  const descriptor = openSync(exactPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    const pathEntry = lstatSync(exactPath, { bigint: true });
    if (!opened.isFile() || !sameIdentity(opened, pathEntry)) {
      throw new Error(`${label} target identity changed before deletion`);
    }
    assertExistingChainUnchanged(parentSnapshot, label);
    unlinkSync(exactPath);
    assertExistingChainUnchanged(parentSnapshot, label);
    if (existsSync(exactPath)) throw new Error(`${label} remains after deletion`);
  } finally {
    closeSync(descriptor);
  }
}

export const fixedRootGuardTesting = Object.freeze({
  assertExistingRealPath,
  captureExistingChain,
  assertExistingChainUnchanged,
});
