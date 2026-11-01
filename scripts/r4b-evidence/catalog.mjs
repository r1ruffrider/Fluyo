import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export const R4A_CATALOG_MARKER = "The following is the single closed";
export const ACCEPTED_R4A_CATALOG_SHA256 =
  "93571a5b5068faa6f5ec4e93986f6555220e281730744df39984fec708255bf8";
export const ACCEPTED_R4A_CATALOG_UTF8_BYTES = 272_510;
export const ACCEPTED_R4A_SPEC_UTF8_BYTES = 284_463;
export const ACCEPTED_R4A_SPEC_SHA256 =
  "bcda3295a5a1ba4dbeb2b286a96c485c979d9f809911e83d02211d10bd7b8343";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_R4A_SPEC_PATH = resolve(
  moduleDirectory,
  "../../docs/2026-10-31_sprint-6-r4a-conversation-canvas-spec_v1.md",
);

function requireArray(value, name, expectedLength) {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    throw new Error(`${name} must contain exactly ${expectedLength} entries`);
  }
  return value;
}

function requireUniqueStrings(value, name, expectedLength) {
  const entries = requireArray(value, name, expectedLength);
  if (entries.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    throw new Error(`${name} must contain only nonempty strings`);
  }
  if (new Set(entries).size !== entries.length) {
    throw new Error(`${name} must not contain duplicate entries`);
  }
  return entries;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function extractAcceptedCatalogBytes(specText) {
  if (typeof specText !== "string") throw new TypeError("specText must be a string");
  const markerParts = specText.split(R4A_CATALOG_MARKER);
  if (markerParts.length !== 2)
    throw new Error("accepted R4-A catalog marker must occur exactly once");
  const block = markerParts[1].match(/```json\s*([\s\S]*?)\r?\n```/u);
  if (!block?.[1]) throw new Error("accepted R4-A catalog JSON block is missing");
  return block[1];
}

export function validateAcceptedCatalog(catalog) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new Error("accepted R4-A catalog must be an object");
  }
  if (catalog.phase !== "Sprint 6 R4-A" || catalog.status !== "repository_specification_only") {
    throw new Error("catalog phase/status does not identify the accepted R4-A contract");
  }

  const stateIds = requireUniqueStrings(catalog.stateIds, "stateIds", 10);
  const viewports = requireArray(catalog.matrix?.viewports, "matrix.viewports", 6);
  const viewportIds = requireUniqueStrings(
    viewports.map((viewport) => viewport?.id),
    "matrix viewport IDs",
    6,
  );
  const themeIds = requireUniqueStrings(catalog.matrix?.themes, "matrix.themes", 2);
  const localeIds = requireUniqueStrings(catalog.matrix?.locales, "matrix.locales", 3);
  const textScales = requireArray(catalog.matrix?.textScales, "matrix.textScales", 2);
  const textScaleIds = requireUniqueStrings(
    textScales.map((scale) => scale?.id),
    "matrix text-scale IDs",
    2,
  );
  const fixtureIds = requireUniqueStrings(
    catalog.matrix?.breakUiFixtures,
    "matrix.breakUiFixtures",
    15,
  );

  if (catalog.matrix?.cellCount !== 10_800 || catalog.evidence?.cellCount !== 10_800) {
    throw new Error("catalog cell count must be exactly 10,800");
  }
  if (catalog.evidence?.artifactPairCount !== 86_400) {
    throw new Error("catalog artifact count must be exactly 86,400");
  }

  const variants = requireArray(catalog.stateFixtureVariants, "stateFixtureVariants", 150);
  const stateVariants = requireArray(catalog.stateVariants, "stateVariants", 8);
  const variantOwners = new Map();
  const variantStates = new Set();
  for (const variant of stateVariants) {
    if (
      typeof variant?.variantId !== "string" ||
      !stateIds.includes(variant?.stateId) ||
      variantOwners.has(variant.variantId)
    ) {
      throw new Error("stateVariants contains an invalid or duplicate variant owner");
    }
    variantOwners.set(variant.variantId, variant.stateId);
    variantStates.add(variant.stateId);
  }
  const variantKeys = new Set();
  for (const variant of variants) {
    if (!stateIds.includes(variant?.stateId) || !fixtureIds.includes(variant?.fixtureId)) {
      throw new Error("stateFixtureVariants contains an unknown state or fixture");
    }
    const key = `${variant.stateId}\u0000${variant.fixtureId}`;
    if (variantKeys.has(key)) throw new Error(`duplicate state/fixture variant ${key}`);
    if (variant.variantId === null) {
      if (variantStates.has(variant.stateId)) {
        throw new Error("variant state cannot use a null state-fixture variantId");
      }
    } else if (variantOwners.get(variant.variantId) !== variant.stateId) {
      throw new Error("state-fixture variantId is unknown or owned by another state");
    }
    variantKeys.add(key);
  }
  if (variantKeys.size !== stateIds.length * fixtureIds.length) {
    throw new Error("stateFixtureVariants does not cover the full 10 by 15 grid");
  }

  return {
    stateIds,
    viewportIds,
    themeIds,
    localeIds,
    textScaleIds,
    fixtureIds,
    variants,
  };
}

export function parseAcceptedR4aCatalogText(specText) {
  if (typeof specText !== "string") throw new TypeError("specText must be a string");
  const specByteLength = Buffer.byteLength(specText, "utf8");
  if (specByteLength !== ACCEPTED_R4A_SPEC_UTF8_BYTES) {
    throw new Error(
      `R4-A specification must contain exactly ${ACCEPTED_R4A_SPEC_UTF8_BYTES} UTF-8 bytes`,
    );
  }
  const specSha256 = createHash("sha256").update(specText, "utf8").digest("hex");
  if (specSha256 !== ACCEPTED_R4A_SPEC_SHA256) {
    throw new Error(`R4-A specification bytes do not match the accepted binding (${specSha256})`);
  }
  const rawCatalog = extractAcceptedCatalogBytes(specText);
  const byteLength = Buffer.byteLength(rawCatalog, "utf8");
  const sha256 = createHash("sha256").update(rawCatalog, "utf8").digest("hex");
  if (byteLength !== ACCEPTED_R4A_CATALOG_UTF8_BYTES || sha256 !== ACCEPTED_R4A_CATALOG_SHA256) {
    throw new Error(
      `R4-A catalog bytes do not match the accepted binding (${byteLength} bytes, ${sha256})`,
    );
  }
  const catalog = deepFreeze(JSON.parse(rawCatalog));
  const axes = validateAcceptedCatalog(catalog);
  return deepFreeze({
    catalog,
    axes,
    rawCatalog,
    byteLength,
    sha256,
    specByteLength,
    specSha256,
  });
}

export function loadAcceptedR4aCatalog(...callerArguments) {
  if (callerArguments.length !== 0) {
    throw new Error("loadAcceptedR4aCatalog does not accept a caller-supplied path");
  }
  const file = lstatSync(DEFAULT_R4A_SPEC_PATH);
  if (!file.isFile() || file.isSymbolicLink()) {
    throw new Error("accepted R4-A specification must be one regular repository file");
  }
  if (file.size !== ACCEPTED_R4A_SPEC_UTF8_BYTES) {
    throw new Error(
      `accepted R4-A specification must be exactly ${ACCEPTED_R4A_SPEC_UTF8_BYTES} bytes before read`,
    );
  }
  return parseAcceptedR4aCatalogText(readFileSync(DEFAULT_R4A_SPEC_PATH, "utf8"));
}
