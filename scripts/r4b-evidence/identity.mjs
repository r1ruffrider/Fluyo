import { createHash } from "node:crypto";

import { loadAcceptedR4aCatalog } from "./catalog.mjs";

export const CELL_DIGEST_PREFIX = "fluyo:r4a:cell:v1\n";
export const IDENTITY_FIELDS = Object.freeze([
  "stateId",
  "viewportId",
  "themeId",
  "localeId",
  "textScaleId",
  "fixtureId",
]);

const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const CLOSED_ARTIFACT_IDS = new Set([
  "actual.png",
  "baseline.png",
  "diff.png",
  "overflow.json",
  "contrast.json",
  "focus.json",
  "announcements.txt",
  "reduced-motion.json",
]);

function acceptedAxisSets() {
  const { axes } = loadAcceptedR4aCatalog();
  return new Map([
    ["stateId", new Set(axes.stateIds)],
    ["viewportId", new Set(axes.viewportIds)],
    ["themeId", new Set(axes.themeIds)],
    ["localeId", new Set(axes.localeIds)],
    ["textScaleId", new Set(axes.textScaleIds)],
    ["fixtureId", new Set(axes.fixtureIds)],
  ]);
}

function identityValues(identity, axisSets) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    throw new TypeError("cell identity must be an object");
  }
  const keys = Object.keys(identity);
  if (
    keys.length !== IDENTITY_FIELDS.length ||
    !IDENTITY_FIELDS.every((field) => keys.includes(field))
  ) {
    throw new Error("cell identity must contain exactly the six closed fields");
  }
  return IDENTITY_FIELDS.map((field) => {
    const value = identity[field];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`${field} must be a nonempty string`);
    }
    if (!SAFE_SEGMENT.test(value) || value.includes("__") || value === "." || value === "..") {
      throw new Error(`${field} is not a safe bounded segment`);
    }
    if (!axisSets.get(field)?.has(value)) {
      throw new Error(`${field} is not in the accepted closed axis`);
    }
    return value;
  });
}

export function createAcceptedCellIdentityAuthority() {
  const axisSets = acceptedAxisSets();
  return Object.freeze({
    values(identity) {
      return identityValues(identity, axisSets);
    },
    digest(identity) {
      const input = `${CELL_DIGEST_PREFIX}${JSON.stringify(identityValues(identity, axisSets))}`;
      return createHash("sha256").update(input, "utf8").digest("hex");
    },
  });
}

export function physicalArtifactKey(digest, artifactId) {
  if (!LOWERCASE_SHA256.test(digest)) throw new Error("digest must be lowercase SHA-256");
  if (!CLOSED_ARTIFACT_IDS.has(artifactId)) throw new Error("artifactId is not in the closed set");
  return `cells/${digest}/${artifactId}`;
}

export function isPhysicalArtifactKey(value) {
  if (typeof value !== "string") return false;
  const match = value.match(/^cells\/([0-9a-f]{64})\/([^/]+)$/u);
  return Boolean(match && CLOSED_ARTIFACT_IDS.has(match[2]));
}
