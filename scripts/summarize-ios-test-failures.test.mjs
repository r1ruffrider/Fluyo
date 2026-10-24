import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "fluyo-ios-summary-"));
try {
  const file = join(root, "raw.log");
  const privateValues = [
    "learner@example.test",
    "Authorization: Bearer header.payload.signature",
    "https://auth.example.test/callback?code=private",
    "/Users/private/DerivedData/result.xcresult",
    "ProviderPrivateException",
  ];
  writeFileSync(file, `AuthRuntimeKernelTests assertion failed ${privateValues.join(" ")}`);
  const result = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const output = `${result.stdout}${result.stderr}`;
  assert.match(
    output,
    /phase=test_current; category=auth_contract; test=unknown; raw output discarded/,
  );
  for (const value of privateValues) assert.equal(output.includes(value), false);
} finally {
  rmSync(root, { recursive: true, force: true });
}
