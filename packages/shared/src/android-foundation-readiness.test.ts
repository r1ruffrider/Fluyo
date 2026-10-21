import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;

const contractDirectory = resolve(__dirname, "../../../contracts/mobile/android/foundation/v1");
const policy = JSON.parse(
  readFileSync(resolve(contractDirectory, "foundation-policy.json"), "utf8"),
) as JsonObject;

const asObject = (value: unknown, label = "value"): JsonObject => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " must be an object");
  }
  return value as JsonObject;
};

const asStrings = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(label + " must be an array of strings");
  }
  return value;
};

const normalize = (value: string) => value.replace(/[^a-z0-9]/gi, "").toLowerCase();

const restrictedPaths = (value: unknown, concepts: string[], path = "value"): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      restrictedPaths(entry, concepts, path + "[" + index + "]"),
    );
  }
  if (value === null || typeof value !== "object") return [];

  return Object.entries(value as JsonObject).flatMap(([key, child]) => {
    const normalizedKey = normalize(key);
    const currentPath = path + "." + key;
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
  if (typeof constraint.maxLength === "number" && value.length > constraint.maxLength) {
    return false;
  }
  return typeof constraint.pattern !== "string" || new RegExp(constraint.pattern).test(value);
};

const validatesClosedRecord = (
  value: JsonObject,
  allowedKeys: string[],
  constraints: JsonObject,
): boolean => {
  const keys = Object.keys(value);
  return (
    keys.length === allowedKeys.length &&
    keys.every(
      (key) => allowedKeys.includes(key) && matchesConstraint(value[key], constraints[key]),
    ) &&
    allowedKeys.every((key) => Object.hasOwn(value, key))
  );
};

const acceptedBaselines = asObject(policy.acceptedBaselines);
const configuration = asObject(policy.configuration);
const telemetry = asObject(policy.telemetry);
const buildMarker = asObject(policy.buildMarker);
const privacy = asObject(policy.androidPrivacyBaseline);
const capture = asObject(policy.syntheticCapture);
const assets = asObject(policy.assets);
const acceptance = asObject(policy.acceptance);

describe("Android foundation readiness contract v1", () => {
  it("records the accepted scaffold gate while keeping completion closed", () => {
    expect(policy.schemaVersion).toBe("1.1.0");
    expect(policy.status).toBe("implementation_authorized");
    expect(policy.sourceMainCommit).toBe("b8a1ca5f84d91575f3e67983291dcb29c5b4e113");
    expect(policy.lastReviewedDate).toBe("2026-10-21");
    expect(policy.productionDataUsed).toBe(false);
    expect(policy.externalActionsPerformed).toBe(false);
    expect(policy.projectScaffoldAuthorized).toBe(true);
    expect(policy.completionClaimAllowed).toBe(false);
    expect(asStrings(policy.remainingDecisionGates, "remainingDecisionGates")).toEqual([]);
    expect(asObject(policy.approval)).toEqual({
      date: "2026-10-21",
      approvedBy: "Marlon",
      scope: "internal_non_production_debug_signed_emulator_foundation",
    });
  });

  it("records the accepted Android baselines without inferring external approval", () => {
    expect(acceptedBaselines).toEqual({
      minimumApi: 29,
      compileSdk: 37,
      targetSdk: 36,
      formFactor: "android_phone_first",
      tabletSupportClaim: false,
      foldableSupportClaim: false,
      orientation: "portrait_primary_landscape_functional",
      interfaceLocale: "en",
      learningContentLanguage: "es",
      pseudoAndRtlTesting: true,
      identifiers: {
        status: "accepted_unreserved_repository_settings_only",
        development: "com.fluyo.app.dev",
        staging: "com.fluyo.app.staging",
        production: "com.fluyo.app",
      },
      implementationOwner: "Adriana",
      accessibilityOwner: "Adriana",
      assetOwner: "Adriana",
      maintenanceOwner: "Adriana",
      independentQaOwner: "Elana",
      ci: {
        status: "accepted_reproducible_resolution_and_binary_checksum_proof_passed",
        runner: "ubuntu-24.04",
        jdk: "17",
        androidGradlePlugin: "9.4.0",
        gradle: "9.6.0",
        buildTools: "36.0.0",
        minimumRuntimeApi: 29,
        currentRuntimeApi: 37,
        kotlinVersion: "2.4.10",
        composeCompilerPlugin: "2.4.10",
        composeBom: "2026.09.00",
        baselineProfilePlugin: "1.5.0",
        profileInstaller: "1.4.1",
        artifact: "non_production_debug_signed_emulator_only",
        resolutionProof: "contracts/mobile/android/foundation/v1/toolchain-resolution-proof.json",
      },
    });
    expect(asStrings(policy.remainingExternalGates, "remainingExternalGates")).toEqual([
      "google_play_account",
      "package_name_reservation",
      "release_signing",
      "upload_signing",
      "production_endpoints",
      "physical_pixel_evidence",
      "physical_samsung_evidence",
      "app_links",
      "play_internal_testing",
      "play_store",
      "spending",
    ]);
  });

  it("retains every parent and granular decision prerequisite", () => {
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
        "UX-DEVICE-ANDROID",
        "UX-FORM-FACTOR",
        "UX-LOCALE",
        "UX-ORIENTATION",
        "UX-OS-ANDROID",
        "UX-PSEUDO-RTL",
        "UX-REDUCED-MOTION",
        "UX-TEST-TRACEABILITY",
      ].sort(),
    );
  });

  it("defines public non-production configuration and inert production", () => {
    expect(asStrings(configuration.allowedEnvironments, "allowedEnvironments")).toEqual([
      "development",
      "staging",
      "production",
    ]);
    expect(asObject(configuration.development)).toEqual({
      classification: "public_non_production_only",
      networkEnabled: true,
      failClosedOnMissingValue: true,
    });
    expect(asObject(configuration.staging)).toEqual({
      classification: "public_non_production_only",
      networkEnabled: true,
      failClosedOnMissingValue: true,
    });
    expect(asObject(configuration.production)).toEqual({
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
      "versionCode",
      "sourceCommitShort",
    ]);

    const forbidden = asStrings(configuration.forbiddenConcepts, "forbiddenConcepts");
    for (const mutation of [
      { serviceRoleKey: "synthetic" },
      { clientSecret: "synthetic" },
      { access_token: "synthetic" },
      { refreshToken: "synthetic" },
      { authorizationCode: "synthetic" },
      { cookieHeader: "synthetic" },
      { keyStorePath: "synthetic" },
      { keyAlias: "synthetic" },
      { storePassword: "synthetic" },
      { keyPassword: "synthetic" },
      { uploadKey: "synthetic" },
      { signingCertificate: "synthetic" },
    ]) {
      expect(restrictedPaths(mutation, forbidden)).not.toEqual([]);
    }
  });

  it("permits only bounded non-sensitive internal marker fields", () => {
    expect(asStrings(buildMarker.requiredForEnvironments, "requiredForEnvironments")).toEqual([
      "development",
      "staging",
    ]);
    expect(buildMarker.productionBehavior).toBe(
      "not_rendered_while_production_networking_is_inert",
    );
    const allowedFields = asStrings(buildMarker.allowedFields, "allowedFields");
    expect(allowedFields).toEqual([
      "platform",
      "environment",
      "isInternal",
      "semanticVersion",
      "versionCode",
      "sourceCommitShort",
    ]);
    const constraints = asObject(buildMarker.propertyConstraints);
    expect(Object.keys(constraints).sort()).toEqual([...allowedFields].sort());
    const safeMarker = {
      platform: "android",
      environment: "development",
      isInternal: true,
      semanticVersion: "1.0.0",
      versionCode: "1",
      sourceCommitShort: "c68faf7",
    };
    expect(validatesClosedRecord(safeMarker, allowedFields, constraints)).toBe(true);
    for (const mutation of [
      { ...safeMarker, platform: "ios" },
      { ...safeMarker, environment: "production" },
      { ...safeMarker, isInternal: false },
      { ...safeMarker, semanticVersion: "learner@example.test" },
      { ...safeMarker, versionCode: "0" },
      { ...safeMarker, versionCode: "1".repeat(11) },
      { ...safeMarker, sourceCommitShort: "not-a-sha" },
      { ...safeMarker, debugNote: "synthetic" },
    ]) {
      expect(validatesClosedRecord(mutation, allowedFields, constraints)).toBe(false);
    }
  });

  it("starts with an unsubmitted empty Android privacy inventory", () => {
    expect(privacy).toEqual({
      status: "repository_draft_not_submitted",
      ads: false,
      tracking: false,
      collectedDataTypes: [],
      sharedDataTypes: [],
      runtimePermissions: [],
      thirdPartyTelemetrySdks: [],
      components: [
        {
          name: "com.fluyo.app.MainActivity",
          kind: "activity",
          exported: true,
          permission: null,
          purpose: "launcher_only",
        },
        {
          name: "androidx.startup.InitializationProvider",
          kind: "provider",
          exported: false,
          permission: null,
          purpose: "profile_installer_initialization",
        },
      ],
      exportedComponents: ["com.fluyo.app.MainActivity"],
      removedDependencyComponents: ["androidx.profileinstaller.ProfileInstallReceiver"],
      backupOfSensitiveDataAllowed: false,
      rule: "declare_only_after_exact_manifest_dependency_and_sdk_inventory_and_privacy_approval",
    });
  });

  it("keeps telemetry no-op and rejects identity, campaign, device, and diagnostics", () => {
    expect(telemetry.mode).toBe("no_op");
    expect(asStrings(telemetry.allowedEvents, "allowedEvents")).toEqual([
      "app_shell_loaded",
      "app_shell_failed",
      "app_shell_state_changed",
      "network_state_changed",
      "reduced_motion_applied",
    ]);
    const allowedProperties = asStrings(telemetry.allowedProperties, "allowedProperties");
    expect(allowedProperties).toEqual([
      "platform",
      "environment",
      "isInternal",
      "semanticVersion",
      "versionCode",
      "sourceCommitShort",
      "outcome",
      "durationBucket",
    ]);
    const constraints = asObject(telemetry.propertyConstraints);
    expect(Object.keys(constraints).sort()).toEqual([...allowedProperties].sort());
    const safeEvent = {
      platform: "android",
      environment: "staging",
      isInternal: true,
      semanticVersion: "1.0.0",
      versionCode: "1",
      sourceCommitShort: "c68faf7",
      outcome: "loaded",
      durationBucket: "under_100ms",
    };
    expect(validatesClosedRecord(safeEvent, allowedProperties, constraints)).toBe(true);
    expect(telemetry.futureAttributionRequiresSeparateAcceptedContract).toBe(true);
    const forbidden = asStrings(telemetry.forbiddenConcepts, "forbiddenConcepts");
    expect(
      validatesClosedRecord(
        { ...safeEvent, debugNote: "synthetic" },
        allowedProperties,
        constraints,
      ),
    ).toBe(false);

    for (const mutation of [
      { ...safeEvent, email: "learner@example.test" },
      { ...safeEvent, utmCampaign: "synthetic" },
      { ...safeEvent, advertisingId: "synthetic" },
      { ...safeEvent, androidId: "synthetic" },
      { ...safeEvent, installReferrer: "synthetic" },
      { ...safeEvent, providerPayload: "synthetic" },
      { ...safeEvent, accessibilitySetting: "synthetic" },
      { ...safeEvent, crashStack: "synthetic" },
    ]) {
      expect(validatesClosedRecord(mutation, allowedProperties, constraints)).toBe(false);
      expect(restrictedPaths(mutation, forbidden)).not.toEqual([]);
    }
  });

  it("blocks capture and keeps the asset ledger empty", () => {
    expect(capture.policyReference).toBe("docs/TEST_ACCOUNT_GOVERNANCE.md");
    expect(capture.status).toBe("blocked_until_capture_owners_and_checklist_are_approved");
    expect(capture.allowedIdentityLabel).toBe("Signed in");
    expect(asStrings(capture.requiredChecks, "requiredChecks")).toEqual([
      "isolated_non_production_session",
      "internal_environment_marker_visible",
      "deterministic_synthetic_state",
      "personal_status_bar_data_hidden",
      "logs_and_developer_overlays_hidden",
      "identity_and_billing_values_absent",
      "product_and_privacy_review_complete",
    ]);
    expect(assets.status).toBe("empty_until_asset_ownership_is_approved");
    expect(assets.items).toEqual([]);
    expect(asStrings(assets.allowedInterimSources, "allowedInterimSources")).toEqual([
      "jetpack_compose_primitives",
      "system_typography",
      "approved_material_symbols",
    ]);
    expect(asStrings(assets.requiredItemFields, "requiredItemFields")).toHaveLength(12);
  });

  it("locks the 29 future evidence scenarios and exact record fields", () => {
    const scenarios = acceptance.scenarios;
    if (!Array.isArray(scenarios)) throw new Error("acceptance.scenarios must be an array");
    expect(scenarios).toHaveLength(29);
    expect(createHash("sha256").update(JSON.stringify(scenarios)).digest("hex")).toBe(
      "8afaa854f4d6eeab73f9af5f3d80e0761df301afbb2f6f447db21029ba1fed20",
    );
    expect(scenarios.map((scenario) => asObject(scenario).id)).toEqual([
      "android_config_development",
      "android_config_staging",
      "android_production_inert",
      "android_deterministic_launch",
      "android_loading_accessible_state",
      "android_signed_out_accessible_state",
      "android_safe_error_accessible_state",
      "android_system_reduce_motion",
      "android_motion_interruption_static_equivalent",
      "android_pseudolocale_expansion",
      "android_rtl_geometry_and_semantics",
      "android_font_scale_200_percent",
      "android_talkback_order_and_names",
      "android_minimum_touch_targets",
      "android_focus_order_and_target",
      "android_contrast_and_non_color_status",
      "android_keyboard_and_switch_focus",
      "android_small_minimum_api_phone_emulator",
      "android_large_current_api_phone_emulator",
      "android_physical_pixel_evidence",
      "android_physical_samsung_evidence",
      "android_portrait_layout",
      "android_landscape_fallback",
      "android_tablet_foldable_probe_no_support_claim",
      "android_asset_rendering_provenance_semantics",
      "android_manifest_sdk_data_safety_inventory",
      "android_baseline_profile_structure",
      "android_debug_signing_classification",
      "android_artifact_secret_identity_campaign_scan",
    ]);
    expect(scenarios.every((scenario) => asObject(scenario).status === "unattempted")).toBe(true);
    for (const scenario of scenarios) {
      expect(
        asStrings(asObject(scenario).expectedCriteria, "expectedCriteria").length,
      ).toBeGreaterThan(0);
    }
    expect(asObject(scenarios[19]).stage).toBe("sprint_5_closeout");
    expect(asObject(scenarios[20]).stage).toBe("sprint_5_closeout");
    expect(asStrings(acceptance.evidenceRequiredFields, "evidenceRequiredFields")).toEqual([
      "sourceCommit",
      "buildIdentifier",
      "platform",
      "runnerImage",
      "jdkVersion",
      "gradleVersion",
      "androidGradlePluginVersion",
      "kotlinVersion",
      "composeCompilerPluginVersion",
      "composeBomVersion",
      "baselineProfilePluginVersion",
      "profileInstallerVersion",
      "deviceModel",
      "deviceClass",
      "deviceKind",
      "deviceApi",
      "environment",
      "accessibilitySetting",
      "command",
      "expected",
      "observed",
      "result",
      "artifactHash",
      "secretScanResult",
      "signingClassification",
    ]);
  });

  it("contains no endpoint, account, credential, or signing value and has the approved scaffold", () => {
    const serialized = JSON.stringify(policy);
    expect(serialized).not.toMatch(/https?:\\?\//i);
    expect(serialized).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(serialized).not.toMatch(/(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+/);
    expect(serialized).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/);
    expect(serialized).not.toMatch(/-----BEGIN [A-Z ]+PRIVATE KEY-----/);
    expect(readdirSync(contractDirectory).sort()).toEqual([
      "README.md",
      "foundation-policy.json",
      "probe",
      "toolchain-resolution-proof.json",
      "verification-metadata.xml",
    ]);
    expect(
      readdirSync(resolve(__dirname, "../../../apps/android"))
        .filter((entry) => ![".gradle", "build"].includes(entry))
        .sort(),
    ).toEqual([
      "README.md",
      "app",
      "baselineprofile",
      "build.gradle.kts",
      "gradle",
      "gradle.properties",
      "gradlew",
      "gradlew.bat",
      "settings.gradle.kts",
    ]);
  });
});
