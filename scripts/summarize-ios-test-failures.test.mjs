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

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed auth_corpus_callback_cancel_stage_snapshot_state ${privateValues.join(" ")}`,
  );
  const bounded = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_minimum"],
    { encoding: "utf8" },
  );
  const boundedOutput = `${bounded.stdout}${bounded.stderr}`;
  assert.match(
    boundedOutput,
    /phase=test_minimum; category=auth_contract; test=unknown; corpus=callback_cancel; stage=snapshot; mismatch=state; raw output discarded/,
  );
  for (const value of privateValues) assert.equal(boundedOutput.includes(value), false);

  writeFileSync(
    file,
    `AuthRuntimeKernelTests assertion failed auth_corpus_callback_cancel_private_stage_snapshot_state ${privateValues.join(" ")}`,
  );
  const adversarial = spawnSync(
    process.execPath,
    ["scripts/summarize-ios-test-failures.mjs", file, "--phase", "test_current"],
    { encoding: "utf8" },
  );
  const adversarialOutput = `${adversarial.stdout}${adversarial.stderr}`;
  assert.doesNotMatch(adversarialOutput, /vector=|stage=|mismatch=/);
  for (const value of privateValues) assert.equal(adversarialOutput.includes(value), false);
} finally {
  rmSync(root, { recursive: true, force: true });
}
