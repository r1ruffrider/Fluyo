import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ACCEPTED_R4A_CATALOG_SHA256,
  ACCEPTED_R4A_CATALOG_UTF8_BYTES,
  ACCEPTED_R4A_SPEC_UTF8_BYTES,
  ACCEPTED_R4A_SPEC_SHA256,
  DEFAULT_R4A_SPEC_PATH,
  extractAcceptedCatalogBytes,
  loadAcceptedR4aCatalog,
  parseAcceptedR4aCatalogText,
  validateAcceptedCatalog,
} from "./catalog.mjs";
import {
  createAcceptedStateFixtureVariantResolver,
  enumerateCanonicalCells,
} from "./canonical.mjs";
import {
  CELL_DIGEST_PREFIX,
  IDENTITY_FIELDS,
  createAcceptedCellIdentityAuthority,
  isPhysicalArtifactKey,
  physicalArtifactKey,
} from "./identity.mjs";

test("binds the loader to the single accepted R4-A catalog bytes", () => {
  const accepted = loadAcceptedR4aCatalog();
  assert.equal(accepted.sha256, ACCEPTED_R4A_CATALOG_SHA256);
  assert.equal(accepted.byteLength, ACCEPTED_R4A_CATALOG_UTF8_BYTES);
  assert.equal(accepted.specSha256, ACCEPTED_R4A_SPEC_SHA256);
  assert.equal(
    Buffer.byteLength(readFileSync(DEFAULT_R4A_SPEC_PATH), "utf8"),
    ACCEPTED_R4A_SPEC_UTF8_BYTES,
  );
  assert.equal(accepted.axes.stateIds.length, 10);
  assert.equal(accepted.axes.fixtureIds.length, 15);
  assert.equal(accepted.axes.variants.length, 150);
  assert.equal(Object.isFrozen(accepted), true);
  assert.equal(Object.isFrozen(accepted.catalog), true);
  assert.equal(Object.isFrozen(accepted.axes), true);
  assert.equal(Object.isFrozen(accepted.axes.stateIds), true);
  assert.throws(() => accepted.axes.stateIds.push("FORGED"), /not extensible/u);
});

test("rejects caller paths, missing, duplicate, oversized, and byte-changed authority", () => {
  assert.throws(
    () => loadAcceptedR4aCatalog("Z:\\definitely-not-read\\catalog.md"),
    /does not accept a caller-supplied path/u,
  );
  assert.throws(() => extractAcceptedCatalogBytes("missing"), /marker must occur exactly once/u);
  assert.throws(
    () =>
      extractAcceptedCatalogBytes(
        `The following is the single closed x\n${"The following is the single closed"}`,
      ),
    /marker must occur exactly once/u,
  );
  const directory = mkdtempSync(join(tmpdir(), "fluyo-r4b-catalog-"));
  try {
    const acceptedSpec = readFileSync(DEFAULT_R4A_SPEC_PATH, "utf8");
    const outsideCatalogChanged = acceptedSpec.replace(
      "# Sprint 6 R4-A Conversation Canvas specification",
      "! Sprint 6 R4-A Conversation Canvas specification",
    );
    assert.equal(Buffer.byteLength(outsideCatalogChanged, "utf8"), ACCEPTED_R4A_SPEC_UTF8_BYTES);
    assert.throws(
      () => parseAcceptedR4aCatalogText(outsideCatalogChanged),
      /specification bytes do not match the accepted binding/u,
    );

    const changed = acceptedSpec.replace('"schemaVersion": 1', '"schemaVersion": 2');
    const changedPath = join(directory, "changed.md");
    writeFileSync(changedPath, changed, "utf8");
    assert.throws(() => parseAcceptedR4aCatalogText(changed), /do not match the accepted binding/u);
    assert.throws(
      () => parseAcceptedR4aCatalogText(`${changed}x`),
      /must contain exactly 284463 UTF-8 bytes/u,
    );
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("validates closed axes and the complete state-fixture mapping", () => {
  const { catalog } = loadAcceptedR4aCatalog();
  const duplicateState = structuredClone(catalog);
  duplicateState.stateIds[1] = duplicateState.stateIds[0];
  assert.throws(() => validateAcceptedCatalog(duplicateState), /duplicate/u);

  const missingVariant = structuredClone(catalog);
  missingVariant.stateFixtureVariants.pop();
  assert.throws(() => validateAcceptedCatalog(missingVariant), /exactly 150/u);

  const unknownVariant = structuredClone(catalog);
  unknownVariant.stateFixtureVariants[0].stateId = "UNKNOWN";
  assert.throws(() => validateAcceptedCatalog(unknownVariant), /unknown state or fixture/u);

  const unknownVariantId = structuredClone(catalog);
  unknownVariantId.stateFixtureVariants.find((entry) => entry.stateId === "CONFIRMED").variantId =
    "unknown_variant";
  assert.throws(() => validateAcceptedCatalog(unknownVariantId), /unknown or owned/u);

  const crossStateVariant = structuredClone(catalog);
  crossStateVariant.stateFixtureVariants.find(
    (entry) => entry.stateId === "RETRYABLE_ERROR",
  ).variantId = "confirmed_correct_continue";
  assert.throws(() => validateAcceptedCatalog(crossStateVariant), /owned by another state/u);

  const nullVariant = structuredClone(catalog);
  nullVariant.stateFixtureVariants.find((entry) => entry.stateId === "CONFIRMED").variantId = null;
  assert.throws(() => validateAcceptedCatalog(nullVariant), /cannot use a null/u);

  const duplicateVariantOwner = structuredClone(catalog);
  duplicateVariantOwner.stateVariants[1].variantId =
    duplicateVariantOwner.stateVariants[0].variantId;
  assert.throws(() => validateAcceptedCatalog(duplicateVariantOwner), /duplicate variant owner/u);
});

test("enumerates exactly 10,800 canonical cells in accepted catalog order", () => {
  const identityAuthority = createAcceptedCellIdentityAuthority();
  const cells = enumerateCanonicalCells();
  assert.equal(cells.length, 10_800);
  assert.equal(new Set(cells.map((cell) => cell.cellDigest)).size, 10_800);
  assert.equal(Object.isFrozen(cells), true);
  assert.equal(Object.isFrozen(cells[0]), true);
  assert.deepEqual(cells[0], {
    ordinal: 1,
    stateId: "PREPARING",
    viewportId: "phone_320x568",
    themeId: "light",
    localeId: "en",
    textScaleId: "browser_zoom_100",
    fixtureId: "long_localized_prompt_and_choices",
    variantId: null,
    cellDigest: identityAuthority.digest({
      stateId: "PREPARING",
      viewportId: "phone_320x568",
      themeId: "light",
      localeId: "en",
      textScaleId: "browser_zoom_100",
      fixtureId: "long_localized_prompt_and_choices",
    }),
  });
  assert.deepEqual(cells.at(-1), {
    ordinal: 10_800,
    stateId: "OFFLINE_READ_ONLY",
    viewportId: "desktop_1200x900",
    themeId: "dark",
    localeId: "ar-XB",
    textScaleId: "browser_zoom_200",
    fixtureId: "missing_optional_explanation",
    variantId: "offline_read_only_prepare",
    cellDigest: cells.at(-1).cellDigest,
  });
  const firstCellSnapshot = { ...cells[0] };
  const lastCellSnapshot = { ...cells.at(-1) };
  assert.throws(() => {
    cells[0].stateId = "ACTIVE";
  }, /read only/u);
  assert.throws(() => {
    cells[0].cellDigest = "0".repeat(64);
  }, /read only/u);
  assert.throws(() => {
    cells[0] = cells[1];
  }, /read only/u);
  assert.throws(() => cells.push(cells[0]), /not extensible/u);
  assert.throws(() => cells.splice(0, 1), /read only/u);
  assert.deepEqual(cells[0], firstCellSnapshot);
  assert.deepEqual(cells.at(-1), lastCellSnapshot);
  assert.equal(cells.length, 10_800);
  assert.equal(cells[0].ordinal, 1);
  assert.equal(cells.at(-1).ordinal, 10_800);
  assert.throws(
    () => enumerateCanonicalCells({ catalog: {}, axes: {} }),
    /does not accept caller-supplied catalog authority/u,
  );
});

test("resolves all 150 state-fixture pairs and rejects unknown pairs", () => {
  const { axes } = loadAcceptedR4aCatalog();
  const resolveVariant = createAcceptedStateFixtureVariantResolver();
  const resolved = axes.stateIds.flatMap((stateId) =>
    axes.fixtureIds.map((fixtureId) => resolveVariant(stateId, fixtureId)),
  );
  assert.equal(resolved.length, 150);
  assert.equal(
    new Set(resolved.map((variant) => `${variant.stateId}\u0000${variant.fixtureId}`)).size,
    150,
  );
  assert.throws(
    () => resolveVariant("UNKNOWN", axes.fixtureIds[0]),
    /unknown state\/fixture pair/u,
  );
  assert.throws(() => resolveVariant(axes.stateIds[0], "UNKNOWN"), /unknown state\/fixture pair/u);
  assert.throws(
    () => createAcceptedStateFixtureVariantResolver({ stateFixtureVariants: [] }),
    /does not accept caller-supplied catalog authority/u,
  );
});

test("constructs canonical collision-safe cell digests and physical keys", () => {
  const identityAuthority = createAcceptedCellIdentityAuthority();
  const identity = {
    stateId: "ACTIVE",
    viewportId: "reference_390x844",
    themeId: "dark",
    localeId: "ar-XB",
    textScaleId: "browser_zoom_200",
    fixtureId: "rtl_mixed_script_activity",
  };
  assert.deepEqual(identityAuthority.values(identity), Object.values(identity));
  assert.match(identityAuthority.digest(identity), /^[0-9a-f]{64}$/u);
  assert.notEqual(
    identityAuthority.digest(identity),
    identityAuthority.digest({ ...identity, themeId: "light" }),
  );
  assert.equal(
    identityAuthority.digest(identity),
    "59307a64cc6d67691aef8c2b9106fac23dc46b5174e4acd5b0dff87a3de8914e",
  );
  assert.equal(CELL_DIGEST_PREFIX, "fluyo:r4a:cell:v1\n");
  const expectedIdentityFields = [
    "stateId",
    "viewportId",
    "themeId",
    "localeId",
    "textScaleId",
    "fixtureId",
  ];
  assert.deepEqual(IDENTITY_FIELDS, expectedIdentityFields);
  assert.equal(Object.isFrozen(IDENTITY_FIELDS), true);
  assert.throws(() => IDENTITY_FIELDS.reverse(), /read only/u);
  assert.throws(() => IDENTITY_FIELDS.push("forged"), /not extensible/u);
  assert.deepEqual(IDENTITY_FIELDS, expectedIdentityFields);
  assert.equal(
    identityAuthority.digest(identity),
    "59307a64cc6d67691aef8c2b9106fac23dc46b5174e4acd5b0dff87a3de8914e",
  );

  const digest = identityAuthority.digest(identity);
  for (const artifactId of [
    "actual.png",
    "baseline.png",
    "diff.png",
    "overflow.json",
    "contrast.json",
    "focus.json",
    "announcements.txt",
    "reduced-motion.json",
  ]) {
    const key = physicalArtifactKey(digest, artifactId);
    assert.equal(isPhysicalArtifactKey(key), true);
    assert.equal(key, `cells/${digest}/${artifactId}`);
  }
  for (const invalid of [
    `cells/${digest.toUpperCase()}/actual.png`,
    `cells/${digest}/../actual.png`,
    `cells/${digest}/unknown.json`,
    `cell/${digest}/actual.png`,
    "C:/private/actual.png",
  ]) {
    assert.equal(isPhysicalArtifactKey(invalid), false);
  }
  assert.throws(() => physicalArtifactKey(digest, "../actual.png"), /closed set/u);
  assert.throws(() => physicalArtifactKey("A".repeat(64), "actual.png"), /lowercase/u);
  assert.throws(() => identityAuthority.values({ ...identity, extra: "x" }), /exactly the six/u);
  for (const mutation of [
    { stateId: "UNKNOWN" },
    { viewportId: "../phone_320x568" },
    { themeId: "dark\u0000" },
    { localeId: "x".repeat(65) },
    { textScaleId: "browser_zoom_300" },
    { fixtureId: "missing/optional" },
  ]) {
    assert.throws(
      () => identityAuthority.digest({ ...identity, ...mutation }),
      /safe bounded|closed axis/u,
    );
  }
});
