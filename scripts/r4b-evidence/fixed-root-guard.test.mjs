import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  assertFixedRootGuard,
  createFixedDirectory,
  fixedRootGuardTesting,
  inventoryFixedOwnedTree,
  readBoundedRegularFile,
  renameFixedRegularFile,
  removeFixedOwnedTree,
  writeFixedRegularFile,
} from "./fixed-root-guard.mjs";
import { windowsNativeBoundaryTesting } from "./windows-native-client.mjs";

windowsNativeBoundaryTesting.enableTestRoot();

function createMandatoryJunction(target, junction) {
  symlinkSync(target, junction, process.platform === "win32" ? "junction" : "dir");
}

test("rejects a real junction in every existing fixed-root ancestor", () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-fixed-root-"));
  const outside = mkdtempSync(resolve(tmpdir(), "fluyo-fixed-outside-"));
  try {
    const runtime = resolve(root, ".r4b-preflight/runtime");
    mkdirSync(resolve(root, ".r4b-preflight"));
    createMandatoryJunction(outside, runtime);
    assert.throws(
      () => assertFixedRootGuard(root, resolve(runtime, "attempt/result.json")),
      /junction|link|reparse/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("bounds regular-file allocation and revalidates an owned tree before deletion", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-fixed-read-"));
  try {
    const owned = resolve(root, "owned");
    const file = resolve(owned, "value.txt");
    mkdirSync(owned);
    writeFileSync(file, "0123456789");
    assert.throws(() => readBoundedRegularFile(file, root, 9, "bounded fixture"), /byte bound/u);
    assert.equal(
      readBoundedRegularFile(file, root, 10, "bounded fixture").toString(),
      "0123456789",
    );
    const approvedInventory = inventoryFixedOwnedTree(owned, root);
    assert.deepEqual(
      { ...approvedInventory, bytes: "10" },
      {
        files: 1,
        directories: 1,
        bytes: "10",
        reparsePoints: 0,
        digest: inventoryFixedOwnedTree(owned, root).digest,
      },
    );
    assert.equal(removeFixedOwnedTree(owned, root, approvedInventory).bytes, 10n);
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

test("accepts only an internally issued original-lease tombstone for a deleted tree retry", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-fixed-tombstone-"));
  try {
    const owned = resolve(root, "owned");
    mkdirSync(owned);
    writeFileSync(resolve(owned, "value.txt"), "approved");
    const approved = inventoryFixedOwnedTree(owned, root, "approved tombstone inventory");
    removeFixedOwnedTree(owned, root, approved, "first cleanup");
    const tombstone = inventoryFixedOwnedTree(owned, root, "resumed cleanup tombstone");
    assert.equal(tombstone.originalLeaseDigest, approved.digest);
    assert.equal(
      removeFixedOwnedTree(owned, root, tombstone, "resumed cleanup").digest,
      approved.digest,
    );
    assert.throws(
      () =>
        removeFixedOwnedTree(
          owned,
          root,
          Object.freeze({ ...tombstone }),
          "forged cleanup tombstone",
        ),
      /fresh, released, or substituted inventory/u,
    );
    mkdirSync(owned);
    assert.throws(
      () => removeFixedOwnedTree(owned, root, tombstone, "recreated cleanup tombstone"),
      /recreated tree/u,
    );
  } finally {
    await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false);
  }
});

test(
  "retains the original native inventory across late-new, replacement, and move attempts",
  {
    skip: process.platform !== "win32",
  },
  async () => {
    for (let round = 0; round < 2; round += 1) {
      for (const attack of ["late-new", "replace", "move"]) {
        const root = mkdtempSync(resolve(tmpdir(), `fluyo-fixed-retained-${attack}-`));
        const owned = resolve(root, "owned");
        const seed = resolve(owned, "seed.txt");
        try {
          mkdirSync(owned);
          writeFileSync(seed, "approved");
          const approved = inventoryFixedOwnedTree(owned, root, "application approved inventory");
          if (attack === "late-new") {
            writeFileSync(resolve(owned, "late.txt"), "late");
            assert.throws(
              () => removeFixedOwnedTree(owned, root, approved, "application retained cleanup"),
              /unknown|missing|inventory|held/iu,
            );
            assert.equal(readFileSync(seed, "utf8"), "approved");
            assert.equal(readFileSync(resolve(owned, "late.txt"), "utf8"), "late");
          } else if (attack === "replace") {
            assert.throws(() => unlinkSync(seed), /EPERM|EBUSY|access|used/iu);
            assert.equal(readFileSync(seed, "utf8"), "approved");
          } else {
            assert.throws(
              () => renameSync(seed, resolve(owned, "moved.txt")),
              /EPERM|EBUSY|access|used/iu,
            );
            assert.equal(existsSync(seed), true);
            assert.equal(readFileSync(seed, "utf8"), "approved");
          }
        } finally {
          await windowsNativeBoundaryTesting.terminateBrokerForTest(root);
          rmSync(root, { recursive: true, force: true });
          assert.equal(existsSync(root), false);
        }
      }
    }
  },
);

test("anchors writes and detects an adversarial ancestor swap before mutation", () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-fixed-mutation-"));
  const outside = mkdtempSync(resolve(tmpdir(), "fluyo-fixed-mutation-outside-"));
  try {
    const owned = resolve(root, "owned");
    const moved = resolve(root, "owned-original");
    createFixedDirectory(owned, root);
    const first = resolve(owned, "first.json");
    const second = resolve(owned, "second.json");
    writeFixedRegularFile(first, root, "one\n", { flag: "wx", label: "mutation fixture" });
    writeFixedRegularFile(first, root, "two\n", { flag: "a", label: "mutation fixture" });
    writeFixedRegularFile(second, root, "three\n", { flag: "wx", label: "mutation fixture" });
    renameFixedRegularFile(second, resolve(owned, "renamed.json"), root, "mutation fixture");
    assert.equal(
      readBoundedRegularFile(first, root, 8, "mutation fixture").toString(),
      "one\ntwo\n",
    );

    const snapshot = fixedRootGuardTesting.captureExistingChain(
      root,
      resolve(owned, "blocked.json"),
      "ancestor-swap fixture",
    );
    renameSync(owned, moved);
    createMandatoryJunction(outside, owned);
    assert.throws(
      () => fixedRootGuardTesting.assertExistingChainUnchanged(snapshot, "ancestor-swap fixture"),
      /identity changed|junction|link|reparse/u,
    );
    assert.throws(
      () =>
        writeFixedRegularFile(resolve(owned, "blocked.json"), root, "blocked", {
          flag: "wx",
          label: "ancestor-swap fixture",
        }),
      /junction|link|reparse/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
