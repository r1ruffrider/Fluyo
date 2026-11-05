#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkMulterOverride, publicMulterFailure } from "./check-multer-override.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

try {
  const result = await checkMulterOverride(repoRoot);
  process.stdout.write(
    `MULTER_OVERRIDE_INSTALLED_TREE_PASS ${result.multerVersion} ${result.nestVersion}\n`,
  );
} catch (error) {
  process.stderr.write(`${publicMulterFailure(error)}\n`);
  process.exitCode = 1;
}
