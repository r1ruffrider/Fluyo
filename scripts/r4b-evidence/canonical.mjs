import { loadAcceptedR4aCatalog } from "./catalog.mjs";
import { createAcceptedCellIdentityAuthority } from "./identity.mjs";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function createStateFixtureVariantResolver(catalog) {
  const variants = catalog.stateFixtureVariants;
  const byKey = new Map(
    variants.map((variant) => [`${variant.stateId}\u0000${variant.fixtureId}`, variant]),
  );
  return (stateId, fixtureId) => {
    const variant = byKey.get(`${stateId}\u0000${fixtureId}`);
    if (!variant) throw new Error(`unknown state/fixture pair ${stateId}/${fixtureId}`);
    return variant;
  };
}

export function createAcceptedStateFixtureVariantResolver(...callerArguments) {
  if (callerArguments.length !== 0) {
    throw new Error("variant resolver does not accept caller-supplied catalog authority");
  }
  return createStateFixtureVariantResolver(loadAcceptedR4aCatalog().catalog);
}

export function enumerateCanonicalCells(...callerArguments) {
  if (callerArguments.length !== 0) {
    throw new Error("enumerateCanonicalCells does not accept caller-supplied catalog authority");
  }
  const accepted = loadAcceptedR4aCatalog();
  const { catalog, axes } = accepted;
  const resolveVariant = createStateFixtureVariantResolver(catalog);
  const identityAuthority = createAcceptedCellIdentityAuthority();
  const cells = [];
  let ordinal = 1;
  for (const stateId of axes.stateIds) {
    for (const viewportId of axes.viewportIds) {
      for (const themeId of axes.themeIds) {
        for (const localeId of axes.localeIds) {
          for (const textScaleId of axes.textScaleIds) {
            for (const fixtureId of axes.fixtureIds) {
              const identity = {
                stateId,
                viewportId,
                themeId,
                localeId,
                textScaleId,
                fixtureId,
              };
              const variant = resolveVariant(stateId, fixtureId);
              cells.push(
                deepFreeze({
                  ordinal,
                  ...identity,
                  variantId: variant.variantId,
                  cellDigest: identityAuthority.digest(identity),
                }),
              );
              ordinal += 1;
            }
          }
        }
      }
    }
  }
  if (cells.length !== 10_800)
    throw new Error(`canonical enumeration produced ${cells.length} cells`);
  if (new Set(cells.map((cell) => cell.cellDigest)).size !== cells.length) {
    throw new Error("canonical enumeration produced a cell-digest collision");
  }
  return deepFreeze(cells);
}
