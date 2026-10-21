import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inflateRawSync } from "node:zlib";

const restrictedPatterns = [
  ["email-shaped identity", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ["agent test credential", /\bFLUYO_TEST_(?:ADRIANA|ELANA)_(?:EMAIL|PASSWORD)\b/i],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i],
  ["bearer or JWT credential", /(?:Authorization\s*:\s*Bearer\s+|\beyJ[A-Za-z0-9_-]{12,}\.)/i],
  [
    "provider or generic credential",
    /\b(?:STRIPE_SECRET_KEY|AWS_SECRET_ACCESS_KEY|SUPABASE_SERVICE_ROLE_KEY|service[_-]?role[_-]?key|client[_-]?secret|api[_-]?secret|password|access[_-]?token|refresh[_-]?token)\s*[=:]\s*["']?[A-Za-z0-9_+./=-]{6,}/i,
  ],
  [
    "known provider secret",
    /\b(?:sk_(?:live|test)_|rk_(?:live|test)_|ghp_|github_pat_|AKIA|AIza)[A-Za-z0-9_\-]{8,}/i,
  ],
  ["Stripe or provider object", /\b(?:cus|sub|price|evt|cs_(?:test|live))_[A-Za-z0-9]{8,}\b/i],
  [
    "campaign attribution",
    /\b(?:utm_(?:source|medium|campaign|content)|gclid|gbraid|wbraid|fbclid|ttclid)\s*[=:]/i,
  ],
  ["Android stable identifier", /\b(?:advertisingId|androidId|appSetId|installReferrer)\s*[=:]/i],
  ["local user path", /(?:\/home\/[^/\s]+\/|[A-Za-z]:\\Users\\[^\\\s]+\\)/],
  ["production Fluyo endpoint", /https?:\/\/(?:api|auth)\.fluyo\.(?!example\.test)[^\s"']*/i],
  [
    "release signing value",
    /\b(?:storePassword|keyPassword|keyAlias|storeFile|uploadKey|PLAY_SIGNING)\s*[=:]/i,
  ],
];

const MAX_ARCHIVE_ENTRIES = 10_000;
const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;
const MAX_ARCHIVE_DEPTH = 3;

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
  return restrictedPatterns.flatMap(([name, pattern]) =>
    pattern.test(text) ? [`${label}: ${name}`] : [],
  );
}

function looksLikeZip(buffer) {
  return buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50;
}

function archiveEntries(buffer) {
  const lowerBound = Math.max(0, buffer.length - 65_557);
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= lowerBound; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("missing archive directory");

  const count = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (count === 0xffff || centralOffset === 0xffffffff || count > MAX_ARCHIVE_ENTRIES) {
    throw new Error("unsupported archive size");
  }

  const entries = [];
  let offset = centralOffset;
  let totalBytes = 0;
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("invalid archive directory");
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const nameEnd = offset + 46 + nameLength;
    if (nameEnd > buffer.length || localOffset + 30 > buffer.length) {
      throw new Error("invalid archive entry");
    }
    const name = buffer.subarray(offset + 46, nameEnd).toString("utf8");
    offset = nameEnd + extraLength + commentLength;
    if (name.endsWith("/")) continue;
    if ((flags & 0x1) !== 0) throw new Error("encrypted archive entry");
    if (uncompressedSize > MAX_ENTRY_BYTES || totalBytes + uncompressedSize > MAX_ARCHIVE_BYTES) {
      throw new Error("archive expansion limit exceeded");
    }
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error("invalid local archive entry");
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) throw new Error("truncated archive entry");
    const compressed = buffer.subarray(dataStart, dataEnd);
    let content;
    if (method === 0) content = Buffer.from(compressed);
    else if (method === 8)
      content = inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY_BYTES });
    else throw new Error("unsupported archive compression");
    if (content.length !== uncompressedSize) throw new Error("archive entry size mismatch");
    totalBytes += content.length;
    entries.push({ name, content });
  }
  return entries;
}

function scanBuffer(buffer, label, depth = 0) {
  const raw = buffer.toString("latin1");
  const findings = [...scanText(raw, label), ...scanText(raw.replaceAll("\0", ""), label)];
  if (!looksLikeZip(buffer)) return [...new Set(findings)];
  if (depth >= MAX_ARCHIVE_DEPTH) {
    return [...new Set([...findings, `${label}: archive nesting limit`])];
  }

  let entries;
  try {
    entries = archiveEntries(buffer);
  } catch {
    return [...new Set([...findings, `${label}: malformed or unsupported archive`])];
  }
  entries.forEach((entry, index) => {
    const entryLabel = `${label} archive entry ${index + 1}`;
    findings.push(...scanText(entry.name, entryLabel));
    findings.push(...scanBuffer(entry.content, entryLabel, depth + 1));
  });
  return [...new Set(findings)];
}

export function scanTargets(targets) {
  return targets.flatMap((target, targetIndex) =>
    filesUnder(target).flatMap((file, fileIndex) =>
      scanBuffer(fs.readFileSync(file), `artifact ${targetIndex + 1} file ${fileIndex + 1}`),
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    console.error("Usage: node scripts/scan-android-evidence.mjs <target> [...]");
    process.exit(2);
  }
  const findings = scanTargets(targets);
  if (findings.length > 0) {
    console.error(findings.join("\n"));
    process.exit(1);
  }
  console.log(`Android evidence scan passed for ${targets.length} target(s)`);
}
