import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const FORBIDDEN_DEPLOYMENT_MARKERS = Object.freeze([
  "r4b-preflight-harness",
  "scripts/r4b-evidence",
  "attempt-002-observer",
  ".next-attempt-002",
  "fluyoPreflightSpeech",
  "nvda-adapter",
  "pre-speech-requests.jsonl",
  ".r4b-preflight",
]);
const ALLOWED_LOCAL_TEST_SCRIPTS = new Set([
  "test:audit-policy",
  "test:audit-policy:unit",
  "test:r4b:exact",
]);
const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".kt",
  ".kts",
  ".java",
  ".swift",
  ".m",
  ".mm",
  ".pbxproj",
  ".json",
  ".plist",
  ".xcconfig",
  ".yml",
  ".yaml",
  ".ps1",
  ".sh",
]);
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  ".next-attempt-002",
  "build",
  "dist",
  ".gradle",
  "DerivedData",
]);
const PRODUCT_PRESENTATION_BINDINGS = Object.freeze([
  [
    "apps/web/app/globals.css",
    "02072d8dcaae7a69d4ced3fc8fc91f349f23fb7088bfb79f74be04756bdf7b32",
    "cb22edae44662c50788d2e726a1a22a4b286b36d77b2ff5ad4a2d70508775659",
  ],
  [
    "apps/web/app/learn/session/conversation-canvas.tsx",
    "0e62e6112791e84142e2c062f6ed1fda30e988d9e56a8521574ee37e1be43e7e",
    "409debb768328e20b33dc7e2a884b744dce1ad7a6ee37ef734d569be0c0300b6",
  ],
  [
    "apps/web/app/learn/session/conversation-canvas.module.css",
    "f4d9180738c84b06d1331c76ec1710b4447ba320f8545fddb377fab377733828",
    "39a3c28b290d13a00d31b724b781fe3edb59f1cbc365f9976ef86022a4605486",
  ],
  [
    "apps/web/app/learn/session/conversation-canvas-state.ts",
    "865ef1029899343ffc46862a42ea3a04fb3e91b1dc76fd0b1abedd8cf9a0a4e1",
  ],
  [
    "apps/web/app/dev-fixtures/conversation-canvas/fixtures.ts",
    "7598e27c1d6a7ff5d970395bc13038f96d38fdbe8ee3653c643d84a3f081e191",
  ],
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function regularFiles(root) {
  if (!existsSync(root)) return [];
  const result = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    const metadata = lstatSync(current);
    if (metadata.isSymbolicLink()) throw new Error("production exclusion scan rejects links");
    if (metadata.isDirectory()) {
      for (const name of readdirSync(current)) {
        if (!SKIP_DIRECTORIES.has(name)) pending.push(resolve(current, name));
      }
    } else if (metadata.isFile()) result.push(current);
    else throw new Error("production exclusion scan found unsupported filesystem entry");
  }
  return result.sort();
}

function markerHits(bytes) {
  const text = bytes.toString("utf8");
  return FORBIDDEN_DEPLOYMENT_MARKERS.filter((marker) => text.includes(marker));
}

function isProductionScannableFile(path) {
  const name = basename(path).toLowerCase();
  return SOURCE_EXTENSIONS.has(extname(path).toLowerCase()) || /^dockerfile(?:\..+)?$/u.test(name);
}

function zipEntries(bytes) {
  const minimumEocd = Math.max(0, bytes.length - 65557);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= minimumEocd; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("packaged artifact is not a canonical ZIP archive");
  const count = bytes.readUInt16LE(eocd + 10);
  let cursor = bytes.readUInt32LE(eocd + 16);
  const entries = [];
  let expanded = 0n;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > bytes.length || bytes.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("packaged artifact central directory is malformed");
    }
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const uncompressedSize = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      !name ||
      name.includes("\\") ||
      name.startsWith("/") ||
      /^[a-z]:/iu.test(name) ||
      name.split("/").includes("..")
    ) {
      throw new Error("packaged artifact contains an encrypted, unsupported, or unsafe entry");
    }
    if (localOffset + 30 > bytes.length || bytes.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error("packaged artifact local header is malformed");
    }
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const end = start + compressedSize;
    if (end > bytes.length || uncompressedSize > 268435456) {
      throw new Error("packaged artifact entry exceeds the closed 256 MiB scan bound");
    }
    const payload = bytes.subarray(start, end);
    const content =
      method === 0
        ? Buffer.from(payload)
        : inflateRawSync(payload, {
            maxOutputLength: 268435456,
          });
    if (content.length !== uncompressedSize) {
      throw new Error("packaged artifact expanded length changed");
    }
    expanded += BigInt(content.length);
    if (expanded > 2147483648n) {
      throw new Error("packaged artifact exceeds the closed 2 GiB expanded scan bound");
    }
    entries.push(Object.freeze({ name, content }));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return Object.freeze(entries);
}

function packagedMarkerFindings(bytes) {
  const findings = [];
  for (const entry of zipEntries(bytes)) {
    const hits = [
      ...markerHits(entry.content),
      ...FORBIDDEN_DEPLOYMENT_MARKERS.filter((marker) => entry.name.includes(marker)),
    ];
    if (hits.length) findings.push({ path: entry.name, markers: [...new Set(hits)] });
  }
  return findings;
}

export function scanProductionSourceTrees(root = ROOT) {
  const findings = [];
  const sourceRoots = [
    "apps/web",
    "apps/api",
    "apps/android",
    "apps/ios",
    "packages/shared",
    "infrastructure",
    ".github",
  ];
  for (const sourceRoot of sourceRoots) {
    for (const path of regularFiles(resolve(root, sourceRoot))) {
      if (!isProductionScannableFile(path) || /(?:^|[\\/])[^\\/]*\.test\./u.test(path)) continue;
      const hits = markerHits(readFileSync(path));
      if (hits.length)
        findings.push({ path: relative(root, path).replaceAll("\\", "/"), markers: hits });
    }
  }
  for (const relativePath of ["package-lock.json", "tsconfig.base.json", "eslint.config.mjs"]) {
    const path = resolve(root, relativePath);
    if (!existsSync(path)) continue;
    const hits = markerHits(readFileSync(path));
    if (hits.length) findings.push({ path: relativePath, markers: hits });
  }
  const rootPackage = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  for (const [name, command] of Object.entries(rootPackage.scripts ?? {})) {
    const hits = FORBIDDEN_DEPLOYMENT_MARKERS.filter((marker) => String(command).includes(marker));
    if (hits.length && !ALLOWED_LOCAL_TEST_SCRIPTS.has(name)) {
      findings.push({ path: `package.json#scripts.${name}`, markers: hits });
    }
  }
  if (findings.length)
    throw new Error(`production source contains preflight references: ${JSON.stringify(findings)}`);
  return Object.freeze({ scannedRoots: sourceRoots.length, rootFiles: 4, findingCount: 0 });
}

export function validateHarnessInertness(root = ROOT) {
  const harnessRoot = resolve(root, "apps/r4b-preflight-harness");
  const forbidden = [
    /from\s+["'][^"']*apps[\\/]web[\\/]/u,
    /(?:^|["'])use server["']/mu,
    /\bfetch\s*\(/u,
    /\bXMLHttpRequest\b/u,
    /\bWebSocket\b/u,
    /\bEventSource\b/u,
    /\bserver action\b/iu,
    /\bauth(?:entication|orization)?\b/iu,
    /\btelemetry\b/iu,
    /\brouter\.(?:push|replace|refresh)\b/u,
  ];
  const allowedImports = new Map([
    ["app/layout.tsx", new Set(["react"])],
    [
      "app/page.tsx",
      new Set([
        "next/navigation",
        "../inert-client-boundary",
        "../source-contract",
        "../transition-intent-boundary",
      ]),
    ],
    ["next.config.ts", new Set(["next", "node:path"])],
    [
      "source-contract.tsx",
      new Set([
        "../web/app/learn/session/conversation-canvas",
        "../web/app/dev-fixtures/conversation-canvas/fixtures",
        "../web/app/learn/session/conversation-canvas-state",
        "./localized-boundary",
        "./transition-intent-boundary",
      ]),
    ],
    ["inert-actions.ts", new Set(["../web/app/learn/session/conversation-canvas-state"])],
    ["inert-client-boundary.tsx", new Set(["react", "./inert-actions"])],
    ["localized-boundary.tsx", new Set(["react"])],
    [
      "transition-intent-boundary.tsx",
      new Set(["react", "../web/app/learn/session/conversation-canvas-state"]),
    ],
  ]);
  for (const path of regularFiles(harnessRoot)) {
    if (!SOURCE_EXTENSIONS.has(extname(path))) continue;
    const text = readFileSync(path, "utf8");
    if (forbidden.some((pattern) => pattern.test(text))) {
      throw new Error(`preflight harness is not presentation-only: ${relative(root, path)}`);
    }
    const relativePath = relative(harnessRoot, path).replaceAll("\\", "/");
    const imports = [...text.matchAll(/\bfrom\s+["']([^"']+)["']/gu)].map((match) => match[1]);
    const allowed = allowedImports.get(relativePath) ?? new Set();
    if (imports.some((specifier) => !allowed.has(specifier))) {
      throw new Error(
        `preflight harness import graph escaped its closed allowlist: ${relativePath}`,
      );
    }
  }
  for (const [
    productPath,
    expectedSha256,
    frozenSha256 = expectedSha256,
  ] of PRODUCT_PRESENTATION_BINDINGS) {
    const current = readFileSync(resolve(root, productPath));
    const frozen = execFileSync(
      "git",
      ["show", `fea1f5fadb2307ca611379f30461a7ee47861fff:${productPath}`],
      { cwd: root },
    );
    if (sha256(current) !== expectedSha256 || sha256(frozen) !== frozenSha256) {
      throw new Error("harness presentation binding drifted from the frozen product source");
    }
    if (
      productPath.endsWith("conversation-canvas-state.ts") &&
      /\bfrom\s+["']/u.test(current.toString("utf8"))
    ) {
      throw new Error("harness state import is not the exact import-free frozen product state");
    }
  }
  const config = readFileSync(resolve(harnessRoot, "next.config.ts"), "utf8");
  const clientBoundary = readFileSync(resolve(harnessRoot, "inert-client-boundary.tsx"), "utf8");
  if (
    !/distDir:\s*["']\.next-attempt-002["']/u.test(config) ||
    !config.includes("new webpack.NormalModuleReplacementPlugin") ||
    !config.includes("/^\\.\\/actions$/u") ||
    !config.includes("resolve(resource.context) === productActionContext") ||
    !config.includes("../web/app/learn/session") ||
    !config.includes("resource.request = inertAction")
  ) {
    throw new Error("harness output or exact inert product-action alias changed");
  }
  for (const marker of [
    "onAuxClickCapture={preventActionActivation}",
    "onClickCapture={preventActionActivation}",
    "onKeyDownCapture={preventKeyboardActivation}",
    "onSubmitCapture={preventFormSubmission}",
    'target.closest("button,a[href]")',
    "actionable.matches(\"a[href^='#']\")",
  ]) {
    if (!clientBoundary.includes(marker)) {
      throw new Error(`harness inert client activation boundary omitted ${marker}`);
    }
  }
  return Object.freeze({ inert: true, outputRoot: "apps/r4b-preflight-harness/.next-attempt-002" });
}

export function validateHarnessProductionBuildProof(
  buildRoot = resolve(ROOT, "apps/r4b-preflight-harness/.next-attempt-002"),
) {
  if (!existsSync(resolve(buildRoot, "BUILD_ID"))) {
    throw new Error("isolated harness production BUILD_ID is absent");
  }
  const files = regularFiles(buildRoot);
  const scriptText = files
    .filter((path) => new Set([".js", ".mjs", ".json"]).has(extname(path)))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  for (const marker of [
    "data-development-requested-presentation",
    "Run synthetic event",
    "Long localized prompt and choices",
    "A friend asks: ¿Dónde está la estación?",
    "data-exact-query-keys",
    "data-r4b-inert-navigation-boundary",
    "data-r4b-blocked-activation-count",
    "fluyo:r4b:inert-conversation-action:v1",
  ]) {
    if (!scriptText.includes(marker)) {
      throw new Error(`harness production bundle omitted exact product marker ${marker}`);
    }
  }
  for (const forbidden of [
    "getVerifiedWebIdentity",
    "submitLearningAttempt",
    "LearningApiError",
    "lib/supabase/identity",
    "lib/learning-api",
  ]) {
    if (scriptText.includes(forbidden)) {
      throw new Error(`harness production bundle retained live action bytes ${forbidden}`);
    }
  }
  return Object.freeze({
    fileCount: files.length,
    inventorySha256: sha256(
      Buffer.from(
        files
          .map((path) => {
            const bytes = readFileSync(path);
            return `${relative(buildRoot, path).replaceAll("\\", "/")}:${bytes.length}:${sha256(bytes)}`;
          })
          .join("\n"),
        "utf8",
      ),
    ),
  });
}

export function validateRepositoryDeploymentExclusion(root = ROOT) {
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  if (packageJson.workspaces.includes("apps/r4b-preflight-harness")) {
    throw new Error("root workspace includes the preflight harness");
  }
  const ignore = readFileSync(resolve(root, ".vercelignore"), "utf8").split(/\r?\n/u);
  for (const expected of [
    "apps/r4b-preflight-harness/",
    "scripts/r4b-evidence/",
    "scripts/r4b-evidence/nvda-adapter/",
    ".r4b-preflight/",
  ]) {
    if (!ignore.includes(expected)) throw new Error(`Vercel exclusion is missing ${expected}`);
  }
  return Object.freeze({ rootWorkspaceExcluded: true, vercelExcluded: true });
}

export function scanBuiltOutput(path, { kind }) {
  if (!existsSync(path)) throw new Error(`${kind} output is required but unattempted`);
  const files = regularFiles(path);
  const findings = [];
  let bytes = 0n;
  for (const file of files) {
    const content = readFileSync(file);
    bytes += BigInt(content.length);
    const archive = new Set([".apk", ".aab", ".ipa", ".zip"]).has(extname(file).toLowerCase());
    const archiveFindings = archive ? packagedMarkerFindings(content) : [];
    const hits = archive ? [] : markerHits(content);
    const relativePath = relative(path, file).replaceAll("\\", "/");
    const pathHits = FORBIDDEN_DEPLOYMENT_MARKERS.filter((marker) => relativePath.includes(marker));
    if (hits.length || pathHits.length)
      findings.push({ path: relativePath, markers: [...new Set([...hits, ...pathHits])] });
    findings.push(
      ...archiveFindings.map((entry) => ({
        path: `${relativePath}!/${entry.path}`,
        markers: entry.markers,
      })),
    );
  }
  if (findings.length)
    throw new Error(`${kind} output includes preflight bytes: ${JSON.stringify(findings)}`);
  return Object.freeze({
    kind,
    fileCount: files.length,
    bytes: String(bytes),
    inventorySha256: sha256(
      Buffer.from(
        files
          .map(
            (file) =>
              `${relative(path, file).replaceAll("\\", "/")}:${statSync(file).size}:${sha256(readFileSync(file))}`,
          )
          .join("\n"),
        "utf8",
      ),
    ),
  });
}

export function scanPackagedArtifact(path, { kind }) {
  if (!existsSync(path)) throw new Error(`${kind} artifact is required but unattempted`);
  const bytes = readFileSync(path);
  const findings = packagedMarkerFindings(bytes);
  if (findings.length)
    throw new Error(`${kind} artifact contains preflight markers: ${JSON.stringify(findings)}`);
  return Object.freeze({ kind, bytes: String(bytes.length), sha256: sha256(bytes) });
}

export function requiredLaterPlatformExclusionTargets(root = ROOT) {
  return Object.freeze([
    Object.freeze({ kind: "shared-build", path: resolve(root, "packages/shared/dist") }),
    Object.freeze({ kind: "api-build", path: resolve(root, "apps/api/dist") }),
    Object.freeze({ kind: "web-build", path: resolve(root, "apps/web/.next") }),
    Object.freeze({ kind: "web-standalone", path: resolve(root, "apps/web/.next/standalone") }),
    Object.freeze({ kind: "vercel-build", path: resolve(root, ".vercel/output") }),
    Object.freeze({
      kind: "android-apk-aab",
      path: resolve(root, "apps/android/app/build/outputs"),
    }),
    Object.freeze({ kind: "ios-bundle-archive", path: resolve(root, "apps/ios/build") }),
  ]);
}

export function evaluateLaterPlatformExclusionGates(root = ROOT) {
  return Object.freeze(
    requiredLaterPlatformExclusionTargets(root).map((target) => {
      if (!existsSync(target.path)) {
        return Object.freeze({ kind: target.kind, status: "BLOCKED", reason: "UNAVAILABLE" });
      }
      try {
        const result = scanBuiltOutput(target.path, { kind: target.kind });
        return Object.freeze({
          kind: target.kind,
          status: "PASS",
          inventorySha256: result.inventorySha256,
        });
      } catch (error) {
        return Object.freeze({
          kind: target.kind,
          status: "FAIL",
          reason: error instanceof Error ? error.message : "scan failed",
        });
      }
    }),
  );
}

export const requiredPostBuildExclusionTargets = requiredLaterPlatformExclusionTargets;
export const evaluatePostBuildExclusionTargets = evaluateLaterPlatformExclusionGates;

export function validateLocalObservationExclusionPrerequisites(
  root = ROOT,
  harnessBuildRoot = resolve(root, "apps/r4b-preflight-harness/.next-attempt-002"),
) {
  validateRepositoryDeploymentExclusion(root);
  validateHarnessInertness(root);
  scanProductionSourceTrees(root);
  const harnessBuild = validateHarnessProductionBuildProof(harnessBuildRoot);
  return Object.freeze({
    status: "PASS",
    scope: "WINDOWS_LOCAL_OBSERVATION_ONLY",
    harnessBuildInventorySha256: harnessBuild.inventorySha256,
  });
}

export const productionExclusionTesting = Object.freeze({
  isProductionScannableFile,
  markerHits,
  regularFiles,
  zipEntries,
});
