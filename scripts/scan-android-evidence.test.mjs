import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

import { scanTargets, scanText } from "./scan-android-evidence.mjs";

function zipWith(name, content) {
  const nameBytes = Buffer.from(name);
  const value = Buffer.from(content);
  const compressed = deflateRawSync(value);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(value.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(value.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  const centralOffset = local.length + nameBytes.length + compressed.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length + nameBytes.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([local, nameBytes, compressed, central, nameBytes, eocd]);
}

test("accepts bounded generic foundation evidence", () => {
  assert.deepEqual(scanText("platform=android\nidentity=Signed in\nresult=passed"), []);
});

for (const [name, value] of [
  ["synthetic email", "learner@example.test"],
  ["mixed-case email", "Learner@Example.TEST"],
  ["credential variable", "FLUYO_TEST_ADRIANA_PASSWORD"],
  ["Elana credential variable", "FLUYO_TEST_ELANA_EMAIL"],
  ["campaign", "utm_source=instagram"],
  ["click id", "gclid=abc123"],
  ["device id", "advertisingId=abc123"],
  ["install referrer", "installReferrer=campaign"],
  ["local path", "/home/runner/work/Fluyo"],
  ["Windows path", "C:\\Users\\person\\project"],
  ["production endpoint", "https://api.fluyo.com/api/v1"],
  ["signing value", "storePassword=secret"],
  ["JWT", "eyJabcdefghijkl.abcdefghijkl.abcdefgh"],
  ["Stripe secret", `STRIPE_SECRET_KEY=${"sk_"}${"live_"}1234567890abcdef`],
  ["raw Stripe test secret", `${"sk_"}${"test_"}1234567890abcdef`],
  ["raw Stripe restricted test secret", `${"rk_"}${"test_"}1234567890abcdef`],
  ["AWS secret", "AWS_SECRET_ACCESS_KEY=abcdef1234567890"],
  ["Supabase service role", "SUPABASE_SERVICE_ROLE_KEY=service-role-secret"],
  ["generic password", "password=hunter2"],
]) {
  test(`rejects ${name}`, () => assert.ok(scanText(value).length > 0));
}

test("rejects restricted content compressed inside an APK or ZIP", () => {
  const directory = mkdtempSync(join(tmpdir(), "fluyo-android-scan-"));
  try {
    const archive = join(directory, "fixture.apk");
    writeFileSync(archive, zipWith("assets/evidence.txt", "learner@example.test"));
    assert.ok(scanTargets([archive]).some((finding) => finding.includes("email-shaped identity")));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("recursively scans an APK compressed inside an aggregate ZIP", () => {
  const directory = mkdtempSync(join(tmpdir(), "fluyo-android-scan-"));
  try {
    const aggregate = join(directory, "aggregate.zip");
    const apk = zipWith("classes.dex", `${"sk_"}${"test_"}1234567890abcdef`);
    writeFileSync(aggregate, zipWith("Fluyo-development-debug.apk", apk));
    assert.ok(
      scanTargets([aggregate]).some((finding) => finding.includes("known provider secret")),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("fails closed for malformed and encrypted-looking archive containers", () => {
  const directory = mkdtempSync(join(tmpdir(), "fluyo-android-scan-"));
  try {
    const archive = join(directory, "fixture.zip");
    writeFileSync(archive, Buffer.from("PK\u0003\u0004truncated", "latin1"));
    assert.ok(scanTargets([archive]).some((finding) => finding.includes("malformed")));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("CLI diagnostics expose only bounded artifact coordinates and categories", () => {
  const directory = mkdtempSync(join(tmpdir(), "fluyo-android-scan-person@example.test-"));
  try {
    const archive = join(directory, "C-Users-person-secret.zip");
    writeFileSync(
      archive,
      zipWith(
        "home/runner/person@example.test.txt",
        "password=hunter2 stdout-sentinel stderr-sentinel /home/runner/private",
      ),
    );
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./scan-android-evidence.mjs", import.meta.url)), archive],
      { encoding: "utf8" },
    );
    const diagnostics = `${result.stdout}${result.stderr}`;
    assert.equal(result.status, 1);
    assert.match(diagnostics, /artifact 1 file 1 archive entry 1 type other/);
    assert.match(diagnostics, /provider or generic credential/);
    for (const restricted of [
      directory,
      archive,
      "person@example.test",
      "hunter2",
      "stdout-sentinel",
      "stderr-sentinel",
      "/home/runner/private",
    ]) {
      assert.ok(!diagnostics.includes(restricted));
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
