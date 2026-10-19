import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const restrictedPatterns = [
  ["stripe secret key", /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}\b/i],
  ["JWT", /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i],
  ["bearer credential", /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._~-]{8,}/i],
  ["agent test credential", /\bFLUYO_TEST_(?:ADRIANA|ELANA)_(?:EMAIL|PASSWORD)\b/i],
  ["Stripe object identifier", /\b(?:cus|sub|price|evt|cs_(?:test|live))_[A-Za-z0-9]{8,}\b/],
  [
    "device identifier",
    /\b[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\b/,
  ],
  ["macOS user path", /\/Users\/[^/\s]+\//],
  ["Windows user path", /[A-Za-z]:\\Users\\[^\\\s]+\\/],
  ["production Fluyo endpoint", /https?:\/\/(?:api|auth)\.fluyo\.(?!example\.test)[^\s"']*/i],
  [
    "signing identifier",
    /\b(?:DEVELOPMENT_TEAM|PROVISIONING_PROFILE_SPECIFIER|CODE_SIGN_IDENTITY)\s*[=:]\s*\S+/i,
  ],
];

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

function filesUnder(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(target, entry.name);
    if (entry.isSymbolicLink()) return [];
    return entry.isDirectory() ? filesUnder(child) : [child];
  });
}

export function scanText(text, label = "value") {
  const findings = [];
  for (const [name, pattern] of restrictedPatterns) {
    if (pattern.test(text)) findings.push(`${label}: ${name}`);
  }
  if (emailPattern.test(text)) findings.push(`${label}: email-shaped identity`);
  return findings;
}

export function scanTargets(targets) {
  return targets.flatMap((target) =>
    filesUnder(target).flatMap((file) => {
      const text = fs.readFileSync(file).toString("latin1");
      return scanText(text, path.relative(process.cwd(), file));
    }),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    console.error("Usage: node scripts/scan-ios-evidence.mjs <file-or-directory> [...]");
    process.exit(2);
  }
  const findings = scanTargets(targets);
  if (findings.length > 0) {
    console.error(findings.join("\n"));
    process.exit(1);
  }
  console.log(`iOS evidence scan passed for ${targets.length} target(s)`);
}
