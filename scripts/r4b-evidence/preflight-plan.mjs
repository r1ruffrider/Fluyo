import { createHash } from "node:crypto";

import { loadAcceptedR4aCatalog } from "./catalog.mjs";
import { createAcceptedStateFixtureVariantResolver } from "./canonical.mjs";
import { createAcceptedCellIdentityAuthority, physicalArtifactKey } from "./identity.mjs";
import {
  PREFLIGHT_EVIDENCE_STATUS,
  PREFLIGHT_SCHEMAS,
  validatePreflightPlanEnvelope,
} from "./preflight-contracts.mjs";
import { enumerateAcceptedTransitionIdentities } from "./transition.mjs";

export const APPROVED_PREFLIGHT_SOURCE_COMMIT = "fea1f5fadb2307ca611379f30461a7ee47861fff";
export const PREFLIGHT_ARTIFACT_IDS = Object.freeze([
  "actual.png",
  "baseline.png",
  "diff.png",
  "overflow.json",
  "contrast.json",
  "focus.json",
  "announcements.txt",
  "reduced-motion.json",
]);
export const PREFLIGHT_MOTION_PREFERENCES = Object.freeze(["no-preference", "reduce"]);
export const PREFLIGHT_REPETITIONS = Object.freeze([1, 2]);

const ACCESSIBILITY_CHECK_DEFINITIONS = Object.freeze([
  ["semantic_heading_and_landmarks", "ALL_VISUAL_CELLS"],
  ["keyboard_forward_and_reverse_order", "ALL_VISUAL_CELLS"],
  ["visible_noncolor_focus", "ALL_VISUAL_CELLS"],
  ["primary_action_reachable", "ALL_VISUAL_CELLS"],
  ["target_size_minimum_44_css_px", "ALL_VISUAL_CELLS"],
  ["browser_zoom_200_reflow", "ZOOM_200_VISUAL_CELLS"],
  ["rtl_direction_and_logical_mirroring", "RTL_VISUAL_CELLS"],
  ["one_time_announcement_deduplication", "ALL_VISUAL_CELLS"],
  ["progress_name_value_and_text", "ALL_VISUAL_CELLS"],
  ["reduced_motion_static_equivalent", "ALL_VISUAL_CELLS"],
]);

const RISK_INTERSECTION_DEFINITIONS = Object.freeze([
  [
    "long_content_phone_320_zoom_100",
    "ACTIVE",
    "phone_320x568",
    "light",
    "en",
    "browser_zoom_100",
    "long_localized_prompt_and_choices",
  ],
  [
    "rtl_reference_dark_zoom_100",
    "ACTIVE",
    "reference_390x844",
    "dark",
    "ar-XB",
    "browser_zoom_100",
    "rtl_mixed_script_activity",
  ],
  [
    "large_text_compact_landscape_zoom_200",
    "ACTIVE",
    "compact_landscape_844x390",
    "light",
    "en-XA",
    "browser_zoom_200",
    "large_text_compact_landscape",
  ],
  [
    "network_loss_submit_dark_zoom_100",
    "SUBMITTING",
    "compact_landscape_844x390",
    "dark",
    "en",
    "browser_zoom_100",
    "network_loss_during_submit",
  ],
  [
    "authentication_expired_phone_zoom_200",
    "SESSION_ENDED",
    "phone_320x568",
    "dark",
    "ar-XB",
    "browser_zoom_200",
    "authentication_expired",
  ],
  [
    "offline_saved_material_desktop_dark_zoom_100",
    "OFFLINE_READ_ONLY",
    "desktop_1200x900",
    "dark",
    "en",
    "browser_zoom_100",
    "offline_saved_material",
  ],
]);

const TRANSITION_FAMILY_DEFINITIONS = Object.freeze([
  ["direct_load", (record) => record.entryContextId === "direct_load"],
  ["client_transition", (record) => record.entryContextId === "client_transition"],
  [
    "same_screen_refresh",
    (record) =>
      record.entryContextId === "same_screen_refresh" && record.triggerId === "same_screen_refresh",
  ],
  ["delayed_preparing_refresh", (record) => record.triggerId === "delayed_preparing_refresh"],
  [
    "connectivity_lost_preparing",
    (record) =>
      record.entryContextId === "connectivity_lost" && record.sourcePresentationId === "PREPARING",
  ],
  [
    "connectivity_lost_active",
    (record) =>
      record.entryContextId === "connectivity_lost" && record.sourcePresentationId === "ACTIVE",
  ],
  [
    "connectivity_restored_preparing",
    (record) =>
      record.entryContextId === "connectivity_restored" &&
      record.targetPresentationId === "PREPARING",
  ],
  [
    "connectivity_restored_active",
    (record) =>
      record.entryContextId === "connectivity_restored" && record.targetPresentationId === "ACTIVE",
  ],
]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function createVisualCells() {
  const { axes } = loadAcceptedR4aCatalog();
  const resolveVariant = createAcceptedStateFixtureVariantResolver();
  const identityAuthority = createAcceptedCellIdentityAuthority();
  const cells = [];
  for (const [fixtureIndex, fixtureId] of axes.fixtureIds.entries()) {
    for (let zoomIndex = 0; zoomIndex < axes.textScaleIds.length; zoomIndex += 1) {
      const identity = {
        stateId: axes.stateIds[(fixtureIndex + 5 * zoomIndex) % axes.stateIds.length],
        viewportId: axes.viewportIds[(fixtureIndex + 3 * zoomIndex) % axes.viewportIds.length],
        themeId: axes.themeIds[(fixtureIndex + zoomIndex) % axes.themeIds.length],
        localeId: axes.localeIds[(fixtureIndex + zoomIndex) % axes.localeIds.length],
        textScaleId: axes.textScaleIds[zoomIndex],
        fixtureId,
      };
      const variant = resolveVariant(identity.stateId, fixtureId);
      cells.push({
        ordinal: cells.length + 1,
        ...identity,
        variantId: variant.variantId,
        cellDigest: identityAuthority.digest(identity),
      });
    }
  }
  return cells;
}

function createObservations(cells) {
  const observations = [];
  for (const cell of cells) {
    for (const motionPreferenceId of PREFLIGHT_MOTION_PREFERENCES) {
      for (const repetition of PREFLIGHT_REPETITIONS) {
        const observationId = createHash("sha256")
          .update(
            `fluyo:r4b:preflight-observation:v1\n${cell.cellDigest}\n${motionPreferenceId}\n${repetition}`,
            "utf8",
          )
          .digest("hex");
        observations.push({
          ordinal: observations.length + 1,
          observationId,
          cellOrdinal: cell.ordinal,
          cellDigest: cell.cellDigest,
          motionPreferenceId,
          repetition,
          transientRootClass: "NON_EVIDENCE_DISCARDED_PREFLIGHT",
          artifactKeys: PREFLIGHT_ARTIFACT_IDS.map((artifactId) =>
            physicalArtifactKey(cell.cellDigest, artifactId),
          ),
        });
      }
    }
  }
  return observations;
}

function createTransitionFamilies() {
  const transitions = enumerateAcceptedTransitionIdentities();
  const claimed = new Set();
  const families = TRANSITION_FAMILY_DEFINITIONS.map(([familyId, predicate]) => {
    const records = transitions.filter(predicate);
    if (records.length === 0) throw new Error(`transition family ${familyId} is empty`);
    for (const record of records) {
      if (claimed.has(record.sequence)) {
        throw new Error(`transition ${record.sequence} belongs to more than one family`);
      }
      claimed.add(record.sequence);
    }
    return {
      familyId,
      representativeSequence: records[0].sequence,
      representativeDigest: records[0].transitionDigest,
      transitionSequences: records.map((record) => record.sequence),
      transitionDigests: records.map((record) => record.transitionDigest),
    };
  });
  if (claimed.size !== transitions.length) {
    throw new Error(`transition families cover ${claimed.size} of ${transitions.length} records`);
  }
  return families;
}

function createAccessibilityChecks(visualCells) {
  return ACCESSIBILITY_CHECK_DEFINITIONS.map(([checkId, targetKind], index) => {
    const targetCellOrdinals = visualCells
      .filter((cell) => {
        if (targetKind === "ZOOM_200_VISUAL_CELLS") {
          return cell.textScaleId === "browser_zoom_200";
        }
        if (targetKind === "RTL_VISUAL_CELLS") {
          return cell.localeId === "ar-XB" || cell.fixtureId === "rtl_mixed_script_activity";
        }
        return true;
      })
      .map((cell) => cell.ordinal);
    return {
      ordinal: index + 1,
      checkId,
      targetKind,
      targetCellOrdinals,
      required: true,
    };
  });
}

function createRiskIntersections() {
  const identityAuthority = createAcceptedCellIdentityAuthority();
  const resolveVariant = createAcceptedStateFixtureVariantResolver();
  return RISK_INTERSECTION_DEFINITIONS.map(
    ([intersectionId, stateId, viewportId, themeId, localeId, textScaleId, fixtureId], index) => {
      const identity = { stateId, viewportId, themeId, localeId, textScaleId, fixtureId };
      const variant = resolveVariant(stateId, fixtureId);
      return {
        ordinal: index + 1,
        intersectionId,
        ...identity,
        variantId: variant.variantId,
        cellDigest: identityAuthority.digest(identity),
        required: true,
      };
    },
  );
}

export function createDiscardedPreflightPlan(...callerArguments) {
  if (callerArguments.length !== 0) {
    throw new Error("discarded preflight plan does not accept caller-supplied authority");
  }
  const visualCells = createVisualCells();
  const plan = {
    schema: PREFLIGHT_SCHEMAS.plan,
    creditable: false,
    evidenceStatus: PREFLIGHT_EVIDENCE_STATUS,
    sourceCommit: APPROVED_PREFLIGHT_SOURCE_COMMIT,
    visualCells,
    observations: createObservations(visualCells),
    accessibilityChecks: createAccessibilityChecks(visualCells),
    riskIntersections: createRiskIntersections(),
    transitionFamilies: createTransitionFamilies(),
    gates: {
      pngEncodedMaxBytes: "8388608",
      pngDecodedMaxBytes: "8388608",
      jsonMaxBytes: "262144",
      textMaxBytes: "131072",
      physicalKeyMaxChars: 90,
      transientRootMaxChars: 128,
      fullPathMaxChars: 240,
      cleanRepeatChangedPixels: 0,
      pngNormalization: "RGBA8_SRGB_CRITICAL_CHUNKS_ONLY",
      unexpectedEgress: "FAIL",
      networkIsolationAuthority: "UNATTEMPTED",
      aggregateMaximumBytes: "536870912",
    },
    rawOutputPolicy: "DISCARD_ALL_RETAIN_SANITIZED_AGGREGATES_ONLY",
  };
  validatePreflightPlanEnvelope(plan);
  return deepFreeze(plan);
}

export function discardedPreflightPlanDigest(plan = createDiscardedPreflightPlan()) {
  validatePreflightPlanEnvelope(plan);
  return createHash("sha256").update(JSON.stringify(plan), "utf8").digest("hex");
}
