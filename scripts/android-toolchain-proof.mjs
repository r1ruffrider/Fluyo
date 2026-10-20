import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "..");
const contractDirectory = path.join(
  repositoryRoot,
  "contracts",
  "mobile",
  "android",
  "foundation",
  "v1",
);
const proofPath = path.join(contractDirectory, "toolchain-resolution-proof.json");
const retainedMetadataPath = path.join(contractDirectory, "verification-metadata.xml");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export const normalizeLf = (value) => value.replace(/\r\n?/g, "\n");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const count = (text, expression) => [...text.matchAll(expression)].length;

export function inspectVerificationMetadata(text) {
  const normalized = normalizeLf(text);
  const artifacts = new Map();
  for (const match of normalized.matchAll(
    /<artifact name="([^"]+)">[\s\S]*?<sha256 value="([0-9a-f]{64})"[^>]*\/>[\s\S]*?<\/artifact>/g,
  )) {
    artifacts.set(match[1], match[2]);
  }
  return {
    normalized,
    sha256: sha256(normalized),
    components: count(normalized, /<component /g),
    artifacts: count(normalized, /<artifact /g),
    sha256Entries: count(normalized, /<sha256 /g),
    aarEntries: count(normalized, /<artifact name="[^"]+\.aar">/g),
    artifactsByName: artifacts,
  };
}

export function validateProofDescriptor(proof, sources) {
  assert(
    proof.sourceMainCommit === "55c6f16f1418d83e7711b632b75c6573c3190ca3",
    "source baseline drift",
  );
  assert(proof.projectScaffoldCreated === false, "scaffold claim must remain false");
  assert(proof.repositoryModifiedByProbe === false, "probe must not modify the repository");
  assert(proof.reproduction?.freshTemporaryProject === true, "fresh project is required");
  assert(proof.reproduction?.freshGradleUserHome === true, "fresh Gradle home is required");
  assert(proof.reproduction?.metadataLineEndings === "LF", "metadata must use LF");

  const expectedRepositories = ["google", "mavenCentral", "gradlePluginPortal"];
  assert(
    JSON.stringify(proof.reproduction?.repositories) === JSON.stringify(expectedRepositories),
    "repository allowlist drift",
  );
  for (const repository of ["google()", "mavenCentral()", "gradlePluginPortal()"]) {
    assert(sources.settings.includes(repository), `missing repository: ${repository}`);
  }

  const expectedCoordinates = [
    "com.android.application:9.4.0",
    "org.jetbrains.kotlin.android:2.4.10",
    "org.jetbrains.kotlin.plugin.compose:2.4.10",
    "androidx.baselineprofile:1.5.0",
    "androidx.compose:compose-bom:2026.09.00",
    "androidx.compose.ui:ui:1.12.1",
    "androidx.profileinstaller:profileinstaller:1.4.1",
    "androidx.benchmark:benchmark-macro-junit4:1.5.0",
    "androidx.compose.ui:ui-android:1.12.1@aar",
    "androidx.profileinstaller:profileinstaller:1.4.1@aar",
    "androidx.benchmark:benchmark-macro-junit4:1.5.0@aar",
  ];
  assert(
    JSON.stringify(proof.reproduction?.coordinates) === JSON.stringify(expectedCoordinates),
    "coordinate inventory drift",
  );
  for (const coordinate of expectedCoordinates) {
    const [name, version] = coordinate.split(/:(?=[^:]+$)/);
    assert(
      sources.build.includes(coordinate) ||
        sources.build.includes(`id("${name}") version "${version}"`),
      `probe source is missing ${coordinate}`,
    );
  }

  for (const [label, text, expected] of [
    ["settings", sources.settings, proof.probeFixture.settingsSha256],
    ["build", sources.build, proof.probeFixture.buildSha256],
    ["driver", sources.driver, proof.probeFixture.driverSha256],
  ]) {
    assert(sha256(normalizeLf(text)) === expected, `${label} source digest drift`);
  }

  const inspected = inspectVerificationMetadata(sources.metadata);
  assert(!inspected.normalized.includes("\r"), "metadata is not LF-normalized");
  const verification = proof.dependencyVerification;
  assert(inspected.sha256 === verification.metadataSha256, "metadata digest drift");
  assert(inspected.components === verification.components, "component count drift");
  assert(inspected.artifacts === verification.artifacts, "artifact count drift");
  assert(inspected.sha256Entries === verification.sha256Entries, "checksum count drift");
  assert(inspected.aarEntries === verification.aarEntries, "AAR count drift");

  const binaries = proof.binaryResolution;
  assert(Array.isArray(binaries) && binaries.length === 3, "three binary checks are required");
  for (const binary of binaries) {
    assert(
      inspected.artifactsByName.get(binary.fileName) === binary.sha256,
      `missing or changed binary: ${binary.fileName}`,
    );
  }
  return inspected;
}

const parseArguments = (arguments_) => {
  const result = {
    command: arguments_[0] ?? "",
    gradle: "gradle",
    javaHome: process.env.JAVA_HOME,
  };
  for (let index = 1; index < arguments_.length; index += 1) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (key === "--gradle" && value) {
      result.gradle = value;
      index += 1;
    } else if (key === "--java-home" && value) {
      result.javaHome = value;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${key}`);
    }
  }
  return result;
};

const childEnvironmentAllowlist = new Set([
  "APPDATA",
  "CI",
  "ComSpec",
  "GITHUB_ACTIONS",
  "HOME",
  "JAVA_HOME",
  "LANG",
  "LC_ALL",
  "LOCALAPPDATA",
  "PATH",
  "PATHEXT",
  "Path",
  "PROGRAMDATA",
  "RUNNER_ARCH",
  "RUNNER_OS",
  "SystemRoot",
  "TEMP",
  "TMP",
  "TMPDIR",
  "USERPROFILE",
  "WINDIR",
]);

export function buildChildEnvironment(parent = process.env, overrides = {}) {
  const environment = {};
  for (const [key, value] of Object.entries({ ...parent, ...overrides })) {
    if (childEnvironmentAllowlist.has(key) && typeof value === "string") {
      environment[key] = value;
    }
  }
  return environment;
}

export const commandFailureMessage = (label, status) =>
  `Android toolchain proof ${label} failed (status: ${status ?? "spawn_error"})`;

export const runCommand = (executable, args, options = {}) => {
  const environment = buildChildEnvironment(process.env, options.env);
  let command = executable;
  let commandArgs = args;
  if (process.platform === "win32" && /\.(?:bat|cmd)$/i.test(executable)) {
    command = "powershell.exe";
    const quotePowerShell = (part) => `'${part.replaceAll("'", "''")}'`;
    const invocation = [
      "&",
      quotePowerShell(executable),
      ...args.map(quotePowerShell),
      "; exit $LASTEXITCODE",
    ].join(" ");
    commandArgs = ["-NoProfile", "-NonInteractive", "-Command", invocation];
  }
  const spawn = options.spawn ?? spawnSync;
  const result = spawn(command, commandArgs, {
    cwd: options.cwd,
    env: environment,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(commandFailureMessage(options.label ?? "command", result.status));
  }
  return normalizeLf(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
};

const copyFixture = (source, destination) => {
  fs.copyFileSync(source, destination);
};

const safeRemove = (target) => {
  const parent = path.resolve(os.tmpdir());
  const resolved = path.resolve(target);
  assert(
    path.dirname(resolved) === parent &&
      path.basename(resolved).startsWith("fluyo-android-toolchain-proof-run-"),
    `refusing to remove unexpected path: ${resolved}`,
  );
  fs.rmSync(resolved, { recursive: true, force: true });
};

export async function verify({ gradle, javaHome }) {
  assert(javaHome, "JAVA_HOME or --java-home is required");
  const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  const fixtureDirectory = path.join(contractDirectory, "probe");
  const settingsPath = path.join(fixtureDirectory, "settings.gradle.kts");
  const buildPath = path.join(fixtureDirectory, "build.gradle.kts");
  const sources = {
    settings: fs.readFileSync(settingsPath, "utf8"),
    build: fs.readFileSync(buildPath, "utf8"),
    driver: fs.readFileSync(scriptPath, "utf8"),
    metadata: fs.readFileSync(retainedMetadataPath, "utf8"),
  };
  validateProofDescriptor(proof, sources);

  const version = runCommand(gradle, ["--version"], {
    env: { JAVA_HOME: javaHome },
    label: "runtime check",
  });
  assert(/Gradle 9\.6\.0\b/.test(version), "Gradle 9.6.0 is required");
  assert(/JVM:\s+17(?:\.|\s)/.test(version), "JDK 17 is required");

  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "fluyo-android-toolchain-proof-run-"));
  try {
    const projectDirectory = path.join(workspace, "project");
    const gradleUserHome = path.join(workspace, "gradle-user-home");
    fs.mkdirSync(projectDirectory, { recursive: true });
    fs.mkdirSync(gradleUserHome, { recursive: true });
    copyFixture(settingsPath, path.join(projectDirectory, "settings.gradle.kts"));
    copyFixture(buildPath, path.join(projectDirectory, "build.gradle.kts"));

    const shared = [
      "--project-dir",
      projectDirectory,
      "--gradle-user-home",
      gradleUserHome,
      "--no-daemon",
      "--non-interactive",
    ];
    runCommand(
      gradle,
      [
        ...shared,
        "--refresh-dependencies",
        "--write-verification-metadata",
        "sha256",
        "buildEnvironment",
        "resolveProof",
        "--console=plain",
      ],
      { env: { JAVA_HOME: javaHome }, label: "online generation" },
    );

    const generatedPath = path.join(projectDirectory, "gradle", "verification-metadata.xml");
    const generated = normalizeLf(fs.readFileSync(generatedPath, "utf8"));
    fs.writeFileSync(generatedPath, generated, "utf8");
    const retained = normalizeLf(sources.metadata);
    assert(generated === retained, "freshly generated metadata differs from retained metadata");

    runCommand(
      gradle,
      [
        ...shared,
        "--offline",
        "--dependency-verification",
        "strict",
        "buildEnvironment",
        "resolveProof",
        "--console=plain",
      ],
      { env: { JAVA_HOME: javaHome }, label: "strict offline replay" },
    );
  } finally {
    safeRemove(workspace);
  }

  console.log(
    "Android toolchain proof reproduced: online generation and strict offline replay passed",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = parseArguments(process.argv.slice(2));
  if (options.command !== "verify") {
    console.error(
      "Usage: node scripts/android-toolchain-proof.mjs verify [--gradle <path>] [--java-home <path>]",
    );
    process.exit(2);
  }
  verify(options).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
