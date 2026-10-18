import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;

const contractDirectory = resolve(__dirname, "../../../contracts/mobile/ios/foundation/v1");
const policy = JSON.parse(
  readFileSync(resolve(contractDirectory, "foundation-policy.json"), "utf8"),
) as JsonObject;

const asObject = (value: unknown, label = "value"): JsonObject => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonObject;
};

const asStrings = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  return value;
};

const normalize = (value: string) => value.replace(/[^a-z0-9]/gi, "").toLowerCase();

const restrictedPaths = (value: unknown, concepts: string[], path = "value"): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => restrictedPaths(entry, concepts, `${path}[${index}]`));
  }
  if (value === null || typeof value !== "object") return [];

  return Object.entries(value as JsonObject).flatMap(([key, child]) => {
    const normalizedKey = normalize(key);
    const currentPath = `${path}.${key}`;
    const violations = concepts.some((concept) => normalizedKey.includes(normalize(concept)))
      ? [currentPath]
      : [];
    return violations.concat(restrictedPaths(child, concepts, currentPath));
  });
};

const matchesConstraint = (value: unknown, constraintValue: unknown): boolean => {
  const constraint = asObject(constraintValue, "property constraint");
  if (Object.hasOwn(constraint, "const")) return value === constraint.const;
  if (Array.isArray(constraint.enum)) return constraint.enum.includes(value);
  if (typeof value !== "string") return false;
  if (typeof constraint.maxLength === "number" && value.length > constraint.maxLength) return false;
  return typeof constraint.pattern !== "string" || new RegExp(constraint.pattern).test(value);
};

const configuration = asObject(policy.configuration);
const telemetry = asObject(policy.telemetry);
const buildMarker = asObject(policy.buildMarker);
const privacyManifest = asObject(policy.privacyManifestBaseline);
const syntheticCapture = asObject(policy.syntheticCapture);
const assets = asObject(policy.assets);
const acceptance = asObject(policy.acceptance);

describe("iOS foundation readiness contract v1", () => {
  it("stays specification-only until every recorded decision and owner gate closes", () => {
    expect(policy.schemaVersion).toBe("1.0.0");
    expect(policy.status).toBe("specification_only");
    expect(policy.sourceMainCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(policy.lastReviewedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(policy.productionDataUsed).toBe(false);
    expect(policy.externalActionsPerformed).toBe(false);
    expect(policy.projectScaffoldAuthorized).toBe(false);
    expect(policy.completionClaimAllowed).toBe(false);
    expect(asStrings(policy.requiredDecisions, "requiredDecisions").sort()).toEqual(
      [
        "S5-D01",
        "S5-D02",
        "S5-D03",
        "S5-D04",
        "S5-D06",
        "S5-D10",
        "UX-A11Y-OWNERSHIP",
        "UX-ASSET-OWNERSHIP",
        "UX-DEVICE-IOS",
        "UX-FORM-FACTOR",
        "UX-LOCALE",
        "UX-ORIENTATION",
        "UX-OS-IOS",
        "UX-REDUCED-MOTION",
        "UX-TEST-TRACEABILITY",
      ].sort(),
    );
  });

  it("defines public non-production configuration and keeps release networking inert", () => {
    expect(asStrings(configuration.allowedEnvironments, "allowedEnvironments")).toEqual([
      "development",
      "staging",
      "release",
    ]);
    expect(asObject(configuration.development).classification).toBe("public_non_production_only");
    expect(asObject(configuration.staging).classification).toBe("public_non_production_only");
    expect(asObject(configuration.release)).toEqual({
      classification: "inert_until_release_gate",
      networkEnabled: false,
      failClosedOnMissingValue: true,
    });
    expect(asStrings(configuration.publicFieldNames, "publicFieldNames")).toEqual([
      "apiBaseUrl",
      "supabaseUrl",
      "supabasePublishableKey",
      "environment",
      "isInternal",
      "semanticVersion",
      "buildNumber",
      "sourceCommitShort",
    ]);

    const forbidden = asStrings(configuration.forbiddenConcepts, "configuration.forbiddenConcepts");
    for (const mutation of [
      { serviceRoleKey: "synthetic" },
      { clientSecret: "synthetic" },
      { access_token: "synthetic" },
      { refreshToken: "synthetic" },
      { authorizationCode: "synthetic" },
      { cookieHeader: "synthetic" },
      { teamIdentifier: "synthetic" },
      { provisioningProfile: "synthetic" },
      { signingCertificate: "synthetic" },
    ]) {
      expect(restrictedPaths(mutation, forbidden)).not.toEqual([]);
    }
  });

  it("permits only bounded non-sensitive build marker fields", () => {
    expect(buildMarker.required).toBe(true);
    expect(asStrings(buildMarker.allowedFields, "buildMarker.allowedFields")).toEqual([
      "environment",
      "isInternal",
      "semanticVersion",
      "buildNumber",
      "sourceCommitShort",
    ]);
    expect(asStrings(buildMarker.forbiddenFields, "buildMarker.forbiddenFields")).toEqual(
      expect.arrayContaining([
        "email",
        "ownerId",
        "correlationId",
        "deviceId",
        "endpoint",
        "branch",
        "filesystemPath",
      ]),
    );
  });

  it("starts with an empty no-tracking privacy-manifest declaration", () => {
    expect(privacyManifest.tracking).toBe(false);
    expect(privacyManifest.trackingDomains).toEqual([]);
    expect(privacyManifest.collectedDataTypes).toEqual([]);
    expect(privacyManifest.accessedApiCategories).toEqual([]);
    expect(privacyManifest.rule).toBe(
      "declare_only_after_exact_code_or_sdk_inventory_and_privacy_approval",
    );
  });

  it("keeps shell telemetry no-op and rejects restricted mutation families", () => {
    expect(telemetry.mode).toBe("no_op");
    expect(asStrings(telemetry.allowedEvents, "allowedEvents")).toEqual([
      "app_shell_loaded",
      "app_shell_failed",
      "app_shell_state_changed",
      "network_state_changed",
      "reduced_motion_applied",
    ]);
    const allowedProperties = asStrings(telemetry.allowedProperties, "allowedProperties");
    const forbidden = asStrings(telemetry.forbiddenConcepts, "forbiddenConcepts");
    const propertyConstraints = asObject(telemetry.propertyConstraints, "propertyConstraints");
    expect(Object.keys(propertyConstraints).sort()).toEqual([...allowedProperties].sort());
    const safeEvent = {
      platform: "ios",
      environment: "staging",
      isInternal: true,
      semanticVersion: "1.0.0",
      buildNumber: "1",
      sourceCommitShort: "a0c7b63",
      outcome: "loaded",
      durationBucket: "under_100ms",
    };
    expect(restrictedPaths(safeEvent, forbidden)).toEqual([]);
    for (const [key, value] of Object.entries(safeEvent)) {
      expect(matchesConstraint(value, propertyConstraints[key])).toBe(true);
    }
    expect(matchesConstraint("release", propertyConstraints.environment)).toBe(false);
    expect(matchesConstraint("production", propertyConstraints.environment)).toBe(false);
    expect(matchesConstraint(false, propertyConstraints.isInternal)).toBe(false);
    expect(matchesConstraint("user@example.test", propertyConstraints.outcome)).toBe(false);
    expect(telemetry.futureAttributionRequiresSeparateAcceptedContract).toBe(true);

    for (const mutation of [
      { email: "learner@example.test" },
      { access_token: "synthetic" },
      { requestBody: { selectedChoiceId: "synthetic" } },
      { utmCampaign: "synthetic" },
      { deviceIdentifier: "synthetic" },
      { providerPayload: { subject: "synthetic" } },
      { accessibilitySettings: "synthetic" },
      { crashStack: "synthetic" },
      { billingStatus: "synthetic" },
      { correlationId: "synthetic" },
    ]) {
      expect(restrictedPaths(mutation, forbidden)).not.toEqual([]);
    }
  });

  it("blocks capture and references the dedicated test-account policy", () => {
    expect(syntheticCapture.policyReference).toBe("docs/TEST_ACCOUNT_GOVERNANCE.md");
    expect(syntheticCapture.status).toBe("blocked_until_capture_owners_and_checklist_are_approved");
    expect(syntheticCapture.allowedIdentityLabel).toBe("Signed in");
    expect(asStrings(syntheticCapture.requiredChecks, "requiredChecks")).toEqual(
      expect.arrayContaining([
        "isolated_non_production_session",
        "internal_environment_marker_visible",
        "identity_and_billing_values_absent",
        "product_and_privacy_review_complete",
      ]),
    );
  });

  it("keeps the asset manifest empty and requires complete provenance later", () => {
    expect(assets.status).toBe("empty_until_asset_ownership_is_approved");
    expect(assets.items).toEqual([]);
    expect(asStrings(assets.requiredItemFields, "requiredItemFields")).toEqual(
      expect.arrayContaining([
        "repositorySourcePath",
        "sourceHash",
        "author",
        "license",
        "semanticRole",
        "accessibilityLabel",
        "containsBakedText",
        "metadataStripped",
      ]),
    );
    expect(asStrings(assets.allowedInterimSources, "allowedInterimSources")).toEqual([
      "native_swiftui_shapes",
      "system_typography",
      "approved_sf_symbols",
    ]);
  });

  it("keeps every macOS, simulator, accessibility, and artifact scenario unattempted", () => {
    const scenarios = acceptance.scenarios;
    if (!Array.isArray(scenarios)) throw new Error("acceptance.scenarios must be an array");
    expect(scenarios).toHaveLength(15);
    expect(scenarios.map((scenario) => asObject(scenario).id)).toEqual([
      "ios_config_development",
      "ios_config_staging",
      "ios_release_inert",
      "ios_deterministic_launch",
      "ios_loading_state",
      "ios_signed_out_state",
      "ios_safe_error_state",
      "ios_reduce_motion",
      "ios_dynamic_type_200_percent",
      "ios_voiceover_order_and_names",
      "ios_minimum_touch_targets",
      "ios_portrait_layout",
      "ios_landscape_fallback",
      "ios_privacy_manifest_inventory",
      "ios_artifact_secret_scan",
    ]);
    expect(scenarios.every((scenario) => asObject(scenario).status === "unattempted")).toBe(true);
    expect(asStrings(acceptance.evidenceRequiredFields, "evidenceRequiredFields")).toEqual(
      expect.arrayContaining([
        "sourceCommit",
        "macosVersion",
        "xcodeVersion",
        "simulatorModel",
        "configuration",
        "command",
        "observed",
        "result",
        "artifactHash",
        "secretScanResult",
      ]),
    );
  });

  it("contains no concrete endpoint, bundle identifier, account, or secret value", () => {
    const serialized = JSON.stringify(policy);
    expect(serialized).not.toMatch(/https?:\\?\//i);
    expect(serialized).not.toMatch(/com\.fluyo\./i);
    expect(serialized).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(serialized).not.toMatch(/(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+/);
    expect(serialized).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/);
    expect(serialized).not.toMatch(/-----BEGIN [A-Z ]+PRIVATE KEY-----/);
  });

  it("keeps the specification bundle intentionally limited to the policy and README", () => {
    expect(readdirSync(contractDirectory).sort()).toEqual(["README.md", "foundation-policy.json"]);
  });
});
