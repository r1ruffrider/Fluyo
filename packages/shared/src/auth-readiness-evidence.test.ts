import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;
type SourceReference = { commit: string; path: string; sha256: string };
type EvidenceRepository = {
  lsTree: (commit: string, path: string) => string;
  blobAt: (commit: string, path: string) => Buffer;
};

const repositoryRoot = resolve(__dirname, "../../..");
const contractDirectory = resolve(repositoryRoot, "contracts/mobile/auth-readiness/v1");
const evidenceDirectory = resolve(contractDirectory, "evidence");
const docsDirectory = resolve(repositoryRoot, "docs");
const baseCommit = "c97fffbb48d5c35e38a103a4b68e1a4cbaaf69ee";
const policyRelativePath = "contracts/mobile/auth-readiness/v1/decision-policy.json";
const policyBytes = readFileSync(resolve(contractDirectory, "decision-policy.json"));
const policy = JSON.parse(policyBytes.toString("utf8")) as JsonObject;
const index = JSON.parse(
  readFileSync(resolve(evidenceDirectory, "index.json"), "utf8"),
) as JsonObject;
const readme = readFileSync(resolve(contractDirectory, "README.md"), "utf8");
const register = readFileSync(resolve(docsDirectory, "SPRINT_5_DECISION_REGISTER.md"), "utf8");
const handoff = readFileSync(resolve(docsDirectory, "DEVELOPMENT_HANDOFF.md"), "utf8");

const asObject = (value: unknown, label = "value"): JsonObject => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonObject;
};

const asObjects = (value: unknown, label: string): JsonObject[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((entry, position) => asObject(entry, `${label}[${position}]`));
};

const asStrings = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  return value;
};

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");

const gitText = (...args: string[]): string =>
  execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();

const gitBuffer = (...args: string[]): Buffer => execFileSync("git", args, { cwd: repositoryRoot });

const currentRepository: EvidenceRepository = {
  lsTree: (commit, path) => gitText("ls-tree", commit, "--", path),
  blobAt: (commit, path) => gitBuffer("show", `${commit}:${path}`),
};

const sourceReferenceIsTrackedRegularBlob = (
  reference: SourceReference,
  expectedCommit: string,
  repository: EvidenceRepository,
): boolean => {
  if (
    reference.commit !== expectedCommit ||
    !/^[0-9a-f]{40}$/.test(reference.commit) ||
    !/^[A-Za-z0-9._/-]+$/.test(reference.path) ||
    reference.path.startsWith("/") ||
    reference.path.includes("\\") ||
    reference.path
      .split("/")
      .some(
        (part) => part === "" || part === "." || part === ".." || part.toLowerCase() === ".git",
      ) ||
    !/^[0-9a-f]{64}$/.test(reference.sha256)
  ) {
    return false;
  }
  const treeEntry = repository.lsTree(reference.commit, reference.path);
  const match = /^(100644|100755) blob [0-9a-f]{40}\t(.+)$/.exec(treeEntry);
  if (!match || match[2] !== reference.path) return false;
  try {
    return sha256(repository.blobAt(reference.commit, reference.path)) === reference.sha256;
  } catch {
    return false;
  }
};

type NativeManifestPlatform = "ios" | "android";

const nativeDependencyReferences = (
  manifest: string,
  platform: NativeManifestPlatform,
): string[] => {
  const patterns =
    platform === "ios"
      ? [
          /\brepositoryURL\s*=\s*"?([^";]+)"?;/g,
          /\bisa\s*=\s*XCSwiftPackageProductDependency;[\s\S]{0,500}?\bproductName\s*=\s*"?([^";]+)"?;/g,
        ]
      : [
          /\b(?:api|implementation|compileOnly|runtimeOnly|debugImplementation|testImplementation|androidTestImplementation)\s*\(\s*(?:platform\s*\(\s*)?["']([^"']+)["']/g,
        ];
  return patterns.flatMap((pattern) =>
    [...manifest.matchAll(pattern)].map((match) => String(match[1]).trim()),
  );
};

const authProviderOrArtifactToken =
  /(?:^|[./:_-])(?:supabase|firebase(?:-auth)?|auth0|clerk|amplify(?:-auth)?|appauth|oauth|oidc|msal|identity)(?:$|[./:_-])/i;

const nativeAuthSdkReferences = (manifest: string, platform: NativeManifestPlatform): string[] => {
  const signals = new Set(
    nativeDependencyReferences(manifest, platform).filter((reference) =>
      authProviderOrArtifactToken.test(reference),
    ),
  );
  if (platform === "android") {
    for (const match of manifest.matchAll(
      /["']([A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+(?::[^"'\r\n]+)?)["']/g,
    )) {
      const coordinate = String(match[1]).trim();
      if (authProviderOrArtifactToken.test(coordinate)) signals.add(coordinate);
    }
    for (const match of manifest.matchAll(
      /\b(?:api|implementation|compileOnly|runtimeOnly|debugImplementation|testImplementation|androidTestImplementation)\s*\(\s*([^\r\n)]+)\s*\)/g,
    )) {
      const argument = String(match[1])
        .trim()
        .replace(/^platform\s*\(\s*/, "")
        .replace(/\s*\)$/, "")
        .replace(/^["']|["']$/g, "");
      if (
        authProviderOrArtifactToken.test(argument) ||
        /\bauth(?:sdk|client|provider|library|lib|dependency)\b/i.test(argument)
      ) {
        signals.add(argument);
      }
    }
  } else {
    for (const match of manifest.matchAll(
      /\b((?:supabase|firebaseauth|auth0|clerk|appauth|oauth|oidc|msal|identity)[A-Za-z0-9_.-]*\.(?:xcframework|framework|a|dylib|swiftmodule))\b/gi,
    )) {
      signals.add(String(match[1]));
    }
    for (const line of manifest.split(/\r?\n/)) {
      if (
        /(?:PBXFileReference|PBXBuildFile|XCRemoteSwiftPackageReference|XCSwiftPackageProductDependency|packageProductDependencies|Frameworks)/.test(
          line,
        ) &&
        authProviderOrArtifactToken.test(line)
      ) {
        const match =
          /\b((?:supabase|firebase(?:-auth)?|auth0|clerk|amplify(?:-auth)?|appauth|oauth|oidc|msal|identity)[A-Za-z0-9_.:/-]*)\b/i.exec(
            line,
          );
        if (match) signals.add(String(match[1]));
      }
    }
  }
  return [...signals];
};

const collectKeys = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value as JsonObject).flatMap(([key, child]) => [
    key,
    ...collectKeys(child),
  ]);
};

const collectSourceReferences = (decisions: JsonObject[]): SourceReference[] =>
  decisions.flatMap((decision) =>
    Object.values(asObject(decision.candidateEvidenceByRequirement)).flatMap((candidate) => {
      const candidateValue = asObject(candidate);
      return asObjects(candidateValue.sourceReferences, "sourceReferences").map((reference) => {
        const value = asObject(reference);
        return {
          commit: String(value.commit),
          path: String(value.path),
          sha256: String(value.sha256),
        };
      });
    }),
  );

const expectedDecisionIds = [
  "AUTH-SDK-IOS",
  "AUTH-SDK-ANDROID",
  "AUTH-METHODS",
  "AUTH-SIGNOUT-SCOPE",
  "AUTH-CALLBACK-DOMAINS",
  "AUTH-AASA",
  "AUTH-ASSETLINKS",
  "AUTH-SUPABASE-ALLOWLIST",
  "AUTH-STORAGE-IOS",
  "AUTH-STORAGE-ANDROID",
  "AUTH-NONPROD-CUSTODY",
  "AUTH-RECOVERY-DELIVERY",
  "AUTH-REVOCATION",
  "AUTH-ACCOUNT-DELETION",
];

const affectedProductFlowDecisionIds = [
  "AUTH-METHODS",
  "AUTH-SIGNOUT-SCOPE",
  "AUTH-RECOVERY-DELIVERY",
  "AUTH-REVOCATION",
  "AUTH-ACCOUNT-DELETION",
];

const expectedPhaseRoster = [
  {
    name: "Adriana Solano",
    role: "orchestrator_merge_owner",
    evidenceOwnership: ["phase_orchestration", "merge_custody"],
    reviewerForDecisionIds: [],
  },
  {
    name: "Bianca Morales",
    role: "administration_records",
    evidenceOwnership: ["administrative_records"],
    reviewerForDecisionIds: [],
  },
  {
    name: "Camila Reyes",
    role: "ux_accessibility",
    evidenceOwnership: ["product_flow_accessibility_closeout"],
    reviewerForDecisionIds: affectedProductFlowDecisionIds,
  },
  {
    name: "Daniela Vargas",
    role: "visual_mobile_motion",
    evidenceOwnership: ["product_flow_visual_mobile_motion_closeout"],
    reviewerForDecisionIds: affectedProductFlowDecisionIds,
  },
  {
    name: "Elana Castillo",
    role: "sole_independent_exact_head_qa",
    evidenceOwnership: ["independent_exact_head_qa"],
    reviewerForDecisionIds: expectedDecisionIds,
  },
  {
    name: "Fernanda Ortiz",
    role: "social_scoped_auth_privacy_boundary_only",
    evidenceOwnership: ["social", "scoped_auth_privacy_boundary_only"],
    reviewerForDecisionIds: [],
  },
  {
    name: "Gabriela Mendoza",
    role: "research",
    evidenceOwnership: ["research"],
    reviewerForDecisionIds: [],
  },
  {
    name: "Isabella Navarro",
    role: "marketing_claims",
    evidenceOwnership: ["marketing_claim_boundaries"],
    reviewerForDecisionIds: [],
  },
  {
    name: "Julieta Herrera",
    role: "numbers_financial_claims",
    evidenceOwnership: ["numeric_and_financial_claim_boundaries"],
    reviewerForDecisionIds: [],
  },
  {
    name: "Catalina Moreno",
    role: "architecture_contracts",
    evidenceOwnership: ["architecture", "contracts"],
    reviewerForDecisionIds: [],
  },
  {
    name: "Valentina Cruz",
    role: "primary_implementation_backend_frontend_database",
    evidenceOwnership: ["backend_frontend_database_implementation"],
    reviewerForDecisionIds: [],
  },
  {
    name: "Renata Vega",
    role: "environment_ci",
    evidenceOwnership: ["environment", "continuous_integration"],
    reviewerForDecisionIds: [],
  },
  {
    name: "Natalia Ortega",
    role: "security",
    evidenceOwnership: ["security"],
    reviewerForDecisionIds: expectedDecisionIds,
  },
];

const expectedDependencyOrder = [
  "AUTH-METHODS",
  "AUTH-NONPROD-CUSTODY",
  "AUTH-SDK-IOS",
  "AUTH-SDK-ANDROID",
  "AUTH-CALLBACK-DOMAINS",
  "AUTH-SIGNOUT-SCOPE",
  "AUTH-STORAGE-IOS",
  "AUTH-STORAGE-ANDROID",
  "AUTH-AASA",
  "AUTH-ASSETLINKS",
  "AUTH-RECOVERY-DELIVERY",
  "AUTH-SUPABASE-ALLOWLIST",
  "AUTH-REVOCATION",
  "AUTH-ACCOUNT-DELETION",
];

const expectedEvidenceDocuments = [
  "contracts/mobile/auth-readiness/v1/evidence/link-and-custody.md",
  "contracts/mobile/auth-readiness/v1/evidence/product-session-policy.md",
  "contracts/mobile/auth-readiness/v1/evidence/sdk-provenance.md",
  "contracts/mobile/auth-readiness/v1/evidence/storage-and-lifecycle.md",
];

const expectedEvidenceDocumentByDecision: Record<string, string> = {
  "AUTH-SDK-IOS": expectedEvidenceDocuments[2] as string,
  "AUTH-SDK-ANDROID": expectedEvidenceDocuments[2] as string,
  "AUTH-METHODS": expectedEvidenceDocuments[1] as string,
  "AUTH-SIGNOUT-SCOPE": expectedEvidenceDocuments[1] as string,
  "AUTH-CALLBACK-DOMAINS": expectedEvidenceDocuments[0] as string,
  "AUTH-AASA": expectedEvidenceDocuments[0] as string,
  "AUTH-ASSETLINKS": expectedEvidenceDocuments[0] as string,
  "AUTH-SUPABASE-ALLOWLIST": expectedEvidenceDocuments[0] as string,
  "AUTH-STORAGE-IOS": expectedEvidenceDocuments[3] as string,
  "AUTH-STORAGE-ANDROID": expectedEvidenceDocuments[3] as string,
  "AUTH-NONPROD-CUSTODY": expectedEvidenceDocuments[0] as string,
  "AUTH-RECOVERY-DELIVERY": expectedEvidenceDocuments[1] as string,
  "AUTH-REVOCATION": expectedEvidenceDocuments[1] as string,
  "AUTH-ACCOUNT-DELETION": expectedEvidenceDocuments[3] as string,
};

const expectedSourcePathsByDecision: Record<string, string[]> = {
  "AUTH-SDK-IOS": [
    "contracts/mobile/ios/foundation/v1/foundation-policy.json",
    "apps/ios/Fluyo.xcodeproj/project.pbxproj",
  ],
  "AUTH-SDK-ANDROID": [
    "contracts/mobile/android/foundation/v1/foundation-policy.json",
    "contracts/mobile/android/foundation/v1/toolchain-resolution-proof.json",
    "apps/android/app/build.gradle.kts",
  ],
  "AUTH-METHODS": [
    "contracts/mobile/auth-state/v1/state-machine.json",
    "contracts/mobile/auth-state/v1/copy.json",
    "contracts/mobile/auth-state/v1/acceptance.json",
  ],
  "AUTH-SIGNOUT-SCOPE": [
    "contracts/mobile/auth-state/v1/state-machine.json",
    "contracts/mobile/auth-state/v1/copy.json",
    "contracts/mobile/auth-state/v1/acceptance.json",
    "apps/api/src/auth/supabase-jwt.service.ts",
  ],
  "AUTH-CALLBACK-DOMAINS": [
    "apps/web/app/auth/callback/route.ts",
    "apps/web/lib/supabase/config.ts",
    "contracts/mobile/ios/foundation/v1/foundation-policy.json",
    "contracts/mobile/android/foundation/v1/foundation-policy.json",
  ],
  "AUTH-AASA": [
    "contracts/mobile/ios/foundation/v1/foundation-policy.json",
    "apps/web/app/auth/callback/route.ts",
  ],
  "AUTH-ASSETLINKS": [
    "contracts/mobile/android/foundation/v1/foundation-policy.json",
    "apps/web/app/auth/callback/route.ts",
  ],
  "AUTH-SUPABASE-ALLOWLIST": [
    "apps/web/app/auth/callback/route.ts",
    "apps/web/lib/supabase/config.ts",
  ],
  "AUTH-STORAGE-IOS": [
    "contracts/mobile/auth-state/v1/acceptance.json",
    "docs/adr/0001-supabase-identity-boundary.md",
  ],
  "AUTH-STORAGE-ANDROID": [
    "contracts/mobile/auth-state/v1/acceptance.json",
    "docs/adr/0001-supabase-identity-boundary.md",
  ],
  "AUTH-NONPROD-CUSTODY": [
    "apps/web/lib/supabase/config.ts",
    "docs/adr/0001-supabase-identity-boundary.md",
  ],
  "AUTH-RECOVERY-DELIVERY": [
    "contracts/mobile/auth-state/v1/state-machine.json",
    "contracts/mobile/auth-state/v1/copy.json",
    "contracts/mobile/auth-state/v1/acceptance.json",
  ],
  "AUTH-REVOCATION": [
    "contracts/mobile/auth-state/v1/state-machine.json",
    "contracts/mobile/auth-state/v1/acceptance.json",
    "apps/api/src/auth/supabase-jwt.service.ts",
  ],
  "AUTH-ACCOUNT-DELETION": [
    "contracts/mobile/auth-state/v1/state-machine.json",
    "contracts/mobile/auth-state/v1/acceptance.json",
    "docs/adr/0001-supabase-identity-boundary.md",
    "apps/api/src/auth/supabase-jwt.service.ts",
  ],
};

const expectedSourceDigestByPath = new Map(
  [...new Set(Object.values(expectedSourcePathsByDecision).flat())].map((path) => [
    path,
    sha256(gitBuffer("show", `${baseCommit}:${path}`)),
  ]),
);

const expectedDependencies: Record<string, string[]> = {
  "AUTH-METHODS": [],
  "AUTH-NONPROD-CUSTODY": [],
  "AUTH-SDK-IOS": ["AUTH-METHODS"],
  "AUTH-SDK-ANDROID": ["AUTH-METHODS"],
  "AUTH-CALLBACK-DOMAINS": ["AUTH-METHODS", "AUTH-NONPROD-CUSTODY"],
  "AUTH-SIGNOUT-SCOPE": ["AUTH-METHODS", "AUTH-NONPROD-CUSTODY"],
  "AUTH-STORAGE-IOS": ["AUTH-METHODS", "AUTH-SDK-IOS"],
  "AUTH-STORAGE-ANDROID": ["AUTH-METHODS", "AUTH-SDK-ANDROID"],
  "AUTH-AASA": ["AUTH-CALLBACK-DOMAINS", "AUTH-SDK-IOS"],
  "AUTH-ASSETLINKS": ["AUTH-CALLBACK-DOMAINS", "AUTH-SDK-ANDROID"],
  "AUTH-RECOVERY-DELIVERY": ["AUTH-METHODS", "AUTH-CALLBACK-DOMAINS", "AUTH-NONPROD-CUSTODY"],
  "AUTH-SUPABASE-ALLOWLIST": [
    "AUTH-CALLBACK-DOMAINS",
    "AUTH-AASA",
    "AUTH-ASSETLINKS",
    "AUTH-NONPROD-CUSTODY",
  ],
  "AUTH-REVOCATION": ["AUTH-SIGNOUT-SCOPE", "AUTH-NONPROD-CUSTODY"],
  "AUTH-ACCOUNT-DELETION": [
    "AUTH-METHODS",
    "AUTH-NONPROD-CUSTODY",
    "AUTH-STORAGE-IOS",
    "AUTH-STORAGE-ANDROID",
    "AUTH-REVOCATION",
  ],
};

type ExpectedDecisionDisposition = {
  proposalState: "PROPOSED_MATERIAL_CHOICE" | "BLOCKED_EXTERNAL_CUSTODIAN";
  requiredCustodian: string;
  unresolvedBlockers: string[];
  nextApprovalAction: string;
};

const materialChoiceBlockers = [
  "MARLON_MATERIAL_DECISION_PENDING",
  "NATIVE_RUNTIME_UNATTEMPTED",
  "APPROVAL_GOVERNANCE_SELECTION_PENDING",
];
const externalCustodianBlockers = [
  "MARLON_MATERIAL_DECISION_PENDING",
  "EXTERNAL_CUSTODIAN_OR_ACTION_EVIDENCE_MISSING",
  "NATIVE_RUNTIME_UNATTEMPTED",
  "APPROVAL_GOVERNANCE_SELECTION_PENDING",
];
const nextApprovalAction =
  "Marlon selects approval-governance alternative A or B, then reviews a fresh non-backdated packet.";

const expectedDecisionDispositionById: Record<string, ExpectedDecisionDisposition> = {
  "AUTH-SDK-IOS": {
    proposalState: "BLOCKED_EXTERNAL_CUSTODIAN",
    requiredCustodian: "Marlon for selection; Natalia for security and provenance review",
    unresolvedBlockers: externalCustodianBlockers,
    nextApprovalAction,
  },
  "AUTH-SDK-ANDROID": {
    proposalState: "BLOCKED_EXTERNAL_CUSTODIAN",
    requiredCustodian: "Marlon for selection; Natalia for security and provenance review",
    unresolvedBlockers: externalCustodianBlockers,
    nextApprovalAction,
  },
  "AUTH-METHODS": {
    proposalState: "PROPOSED_MATERIAL_CHOICE",
    requiredCustodian:
      "Marlon for product choice; Camila for accessibility; Daniela for mobile interaction",
    unresolvedBlockers: materialChoiceBlockers,
    nextApprovalAction,
  },
  "AUTH-SIGNOUT-SCOPE": {
    proposalState: "PROPOSED_MATERIAL_CHOICE",
    requiredCustodian:
      "Marlon for product choice; Catalina for session contract; Natalia for security",
    unresolvedBlockers: materialChoiceBlockers,
    nextApprovalAction,
  },
  "AUTH-CALLBACK-DOMAINS": {
    proposalState: "BLOCKED_EXTERNAL_CUSTODIAN",
    requiredCustodian: "Named domain and TLS custodian; Marlon for exact host selection",
    unresolvedBlockers: externalCustodianBlockers,
    nextApprovalAction,
  },
  "AUTH-AASA": {
    proposalState: "BLOCKED_EXTERNAL_CUSTODIAN",
    requiredCustodian: "Named domain and Apple binding custodian; Natalia for security review",
    unresolvedBlockers: externalCustodianBlockers,
    nextApprovalAction,
  },
  "AUTH-ASSETLINKS": {
    proposalState: "BLOCKED_EXTERNAL_CUSTODIAN",
    requiredCustodian: "Named domain and Android signing custodian; Natalia for security review",
    unresolvedBlockers: externalCustodianBlockers,
    nextApprovalAction,
  },
  "AUTH-SUPABASE-ALLOWLIST": {
    proposalState: "BLOCKED_EXTERNAL_CUSTODIAN",
    requiredCustodian: "Named non-production Supabase custodian; Marlon for external action",
    unresolvedBlockers: externalCustodianBlockers,
    nextApprovalAction,
  },
  "AUTH-STORAGE-IOS": {
    proposalState: "PROPOSED_MATERIAL_CHOICE",
    requiredCustodian:
      "Marlon for material choice; Natalia for security; Catalina for lifecycle contract",
    unresolvedBlockers: materialChoiceBlockers,
    nextApprovalAction,
  },
  "AUTH-STORAGE-ANDROID": {
    proposalState: "PROPOSED_MATERIAL_CHOICE",
    requiredCustodian:
      "Marlon for material choice; Natalia for security; Catalina for lifecycle contract",
    unresolvedBlockers: materialChoiceBlockers,
    nextApprovalAction,
  },
  "AUTH-NONPROD-CUSTODY": {
    proposalState: "BLOCKED_EXTERNAL_CUSTODIAN",
    requiredCustodian: "Named project, service, recovery, and incident custodians",
    unresolvedBlockers: externalCustodianBlockers,
    nextApprovalAction,
  },
  "AUTH-RECOVERY-DELIVERY": {
    proposalState: "BLOCKED_EXTERNAL_CUSTODIAN",
    requiredCustodian: "Named delivery and support custodians; Marlon for product choice",
    unresolvedBlockers: externalCustodianBlockers,
    nextApprovalAction,
  },
  "AUTH-REVOCATION": {
    proposalState: "PROPOSED_MATERIAL_CHOICE",
    requiredCustodian: "Named provider and backend custodians; Marlon for product choice",
    unresolvedBlockers: materialChoiceBlockers,
    nextApprovalAction,
  },
  "AUTH-ACCOUNT-DELETION": {
    proposalState: "BLOCKED_EXTERNAL_CUSTODIAN",
    requiredCustodian:
      "Named backend, privacy, retention, and support custodians; Marlon for destructive action",
    unresolvedBlockers: externalCustodianBlockers,
    nextApprovalAction,
  },
};

const expectedPolicyForbiddenClaims = [
  "native_authentication_implemented_complete_supported_or_available",
  "sdk_selected_approved_installed_safe_or_verified",
  "pkce_keychain_keystore_links_redirects_recovery_revocation_or_deletion_verified",
  "signing_production_physical_device_store_public_availability_or_spending_approved",
  "increment_five_complete",
];

type ExpectedEvidenceMetadata = {
  state: string;
  evidenceClass: string;
  blockerIds: string[];
};

const metadataForRecords = (
  state: string,
  evidenceClass: string,
  blockerIds: string[],
  records: string[],
): Record<string, ExpectedEvidenceMetadata> =>
  Object.fromEntries(
    records.map((record) => [record, { state, evidenceClass, blockerIds: [...blockerIds] }]),
  );

const materialDecisionBlockers = [
  "MARLON_MATERIAL_DECISION_PENDING",
  "APPROVAL_GOVERNANCE_SELECTION_PENDING",
];
const externalEvidenceBlockers = ["EXTERNAL_CUSTODIAN_OR_ACTION_EVIDENCE_MISSING"];
const runtimeBlockers = ["NATIVE_RUNTIME_UNATTEMPTED"];

const expectedEvidenceMetadataByRecord: Record<string, ExpectedEvidenceMetadata> = {
  ...metadataForRecords("PROPOSED_MATERIAL_CHOICE", "proposal", materialDecisionBlockers, [
    "AUTH-SDK-IOS/exact_package_version_source_and_sha256",
    "AUTH-SDK-IOS/license_and_advisory_review",
    "AUTH-SDK-IOS/credential_and_diagnostic_logging_review",
    "AUTH-SDK-ANDROID/exact_coordinate_version_repository_and_sha256",
    "AUTH-SDK-ANDROID/license_and_advisory_review",
    "AUTH-SDK-ANDROID/reviewed_release_contains_credential_logging_fix",
    "AUTH-SDK-ANDROID/fluyo_logger_retains_no_sdk_message_or_throwable",
    "AUTH-SIGNOUT-SCOPE/exact_local_or_global_scope",
    "AUTH-CALLBACK-DOMAINS/exact_environment_route_inventory",
    "AUTH-AASA/exact_aasa_bytes_and_sha256",
    "AUTH-ASSETLINKS/exact_assetlinks_bytes_and_sha256",
    "AUTH-SUPABASE-ALLOWLIST/approved_callback_decisions",
    "AUTH-STORAGE-IOS/keychain_accessibility_choice",
    "AUTH-STORAGE-ANDROID/keystore_and_encryption_choice",
    "AUTH-NONPROD-CUSTODY/least_privilege_access_and_recovery",
    "AUTH-NONPROD-CUSTODY/incident_and_rotation_handoff",
    "AUTH-METHODS/context_specific_copy_primary_and_cancel_actions",
    "AUTH-SIGNOUT-SCOPE/context_specific_signout_copy_primary_and_cancel_actions",
    "AUTH-RECOVERY-DELIVERY/context_specific_recovery_copy_primary_and_cancel_actions",
    "AUTH-REVOCATION/context_specific_session_ended_copy_primary_and_cancel_actions",
    "AUTH-ACCOUNT-DELETION/clear_irreversible_consequence_copy_primary_delete_action_and_non_destructive_cancel",
  ]),
  ...metadataForRecords(
    "REPOSITORY_SUPPORTED_CANDIDATE",
    "repository_observation",
    materialDecisionBlockers,
    [
      "AUTH-METHODS/exact_enabled_method_list",
      "AUTH-METHODS/copy_and_recovery_review",
      "AUTH-SIGNOUT-SCOPE/issued_jwt_expiry_limitation",
      "AUTH-STORAGE-IOS/backup_and_migration_rules",
      "AUTH-STORAGE-ANDROID/hardware_and_backup_expectations",
      "AUTH-REVOCATION/issued_jwt_expiry_limitation",
      "AUTH-ACCOUNT-DELETION/orchestration_and_idempotency",
      "AUTH-ACCOUNT-DELETION/recent_reauthentication_before_destructive_confirmation",
    ],
  ),
  ...metadataForRecords("BLOCKED_EXTERNAL_CUSTODIAN", "external_fact", externalEvidenceBlockers, [
    "AUTH-SDK-IOS/supported_ios_floor_and_dependency_graph",
    "AUTH-SDK-ANDROID/supported_android_floor_and_dependency_graph",
    "AUTH-METHODS/unsupported_flow_list",
    "AUTH-CALLBACK-DOMAINS/named_domain_custodian",
    "AUTH-AASA/hosting_owner",
    "AUTH-ASSETLINKS/hosting_owner",
    "AUTH-NONPROD-CUSTODY/named_project_and_service_custodians",
    "AUTH-RECOVERY-DELIVERY/named_delivery_custodian",
    "AUTH-ACCOUNT-DELETION/approved_deletion_api_and_owner",
  ]),
  ...metadataForRecords("BLOCKED_EXTERNAL_ACTION", "external_fact", externalEvidenceBlockers, [
    "AUTH-CALLBACK-DOMAINS/host_control_and_tls",
    "AUTH-AASA/app_binding",
    "AUTH-ASSETLINKS/package_and_certificate_binding",
    "AUTH-SUPABASE-ALLOWLIST/exact_redirect_entry_list",
    "AUTH-SUPABASE-ALLOWLIST/separately_authorized_dashboard_change_evidence",
    "AUTH-RECOVERY-DELIVERY/sender_and_template_review",
    "AUTH-REVOCATION/exact_provider_capability",
  ]),
  ...metadataForRecords("UNATTEMPTED_RUNTIME", "runtime_result", runtimeBlockers, [
    "AUTH-METHODS/bounded_loading_error_and_recovery_states",
    "AUTH-METHODS/focus_one_time_announcement_screen_reader_order",
    "AUTH-METHODS/two_hundred_percent_text_target_reachability_and_reduced_motion",
    "AUTH-SIGNOUT-SCOPE/cleanup_order_and_failure_behavior",
    "AUTH-SIGNOUT-SCOPE/bounded_cleanup_error_and_recovery_states",
    "AUTH-SIGNOUT-SCOPE/focus_one_time_announcement_screen_reader_order",
    "AUTH-SIGNOUT-SCOPE/two_hundred_percent_text_target_reachability_and_reduced_motion",
    "AUTH-AASA/negative_and_retrieval_checks",
    "AUTH-ASSETLINKS/negative_and_retrieval_checks",
    "AUTH-STORAGE-IOS/wipe_corruption_and_account_switch_tests",
    "AUTH-STORAGE-ANDROID/migration_wipe_corruption_and_account_switch_tests",
    "AUTH-RECOVERY-DELIVERY/expiry_throttling_support_and_failure_contract",
    "AUTH-RECOVERY-DELIVERY/bounded_delivery_error_and_recovery_states",
    "AUTH-RECOVERY-DELIVERY/focus_one_time_announcement_screen_reader_order",
    "AUTH-RECOVERY-DELIVERY/two_hundred_percent_text_target_reachability_and_reduced_motion",
    "AUTH-REVOCATION/failure_and_retry_contract",
    "AUTH-REVOCATION/runtime_proof",
    "AUTH-REVOCATION/bounded_revocation_error_and_recovery_states",
    "AUTH-REVOCATION/focus_one_time_announcement_screen_reader_order",
    "AUTH-REVOCATION/two_hundred_percent_text_target_reachability_and_reduced_motion",
    "AUTH-ACCOUNT-DELETION/partial_failure_recovery_and_audit_contract",
    "AUTH-ACCOUNT-DELETION/idempotent_progress_partial_failure_and_recovery_states",
    "AUTH-ACCOUNT-DELETION/focus_one_time_announcement_screen_reader_order",
    "AUTH-ACCOUNT-DELETION/two_hundred_percent_text_target_reachability_and_reduced_motion",
  ]),
};

const rootKeys = [
  "schemaVersion",
  "packetKind",
  "sourceMainCommit",
  "decisionPolicy",
  "scope",
  "phaseRoster",
  "documents",
  "dependencyOrder",
  "approvalGovernanceDecision",
  "decisions",
  "forbiddenContent",
  "packetClaimBoundary",
  "satisfiesApprovalRequirement",
];
const decisionKeys = [
  "id",
  "policyStatus",
  "evidenceDocument",
  "proposalState",
  "proposedValue",
  "proposedValueSha256",
  "dependsOnDecisionIds",
  "requiredCustodian",
  "candidateEvidenceByRequirement",
  "unresolvedBlockers",
  "nextApprovalAction",
  "recheckTrigger",
  "claimBoundary",
  "satisfiesApprovalRequirement",
];
const requirementKeys = [
  "state",
  "evidenceClass",
  "evidenceRecord",
  "summary",
  "sourceReferences",
  "blockerIds",
  "satisfiesApprovalRequirement",
];

const canonicalKey = (key: string): string => key.toLowerCase().replaceAll(/[_\-.]/g, "");
const forbiddenCanonicalKeys = new Set([
  "approval",
  "approvals",
  "accepted",
  "acceptance",
  "approvedatutc",
  "approvedby",
  "approvalreference",
  "approvedvalue",
  "evidencecommit",
  "decisionvaluedigest",
  "evidencebyrequirement",
  "reviewedpackethead",
  "password",
  "passwd",
  "secret",
  "clientsecret",
  "apikey",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "bearertoken",
  "authcode",
  "authorizationcode",
  "otp",
  "recoverycode",
  "recoverykey",
  "privatekey",
  "signingkey",
  "cookie",
  "email",
  "emailaddress",
  "phone",
  "phonenumber",
  "deviceid",
  "privateid",
  "credential",
  "credentials",
  "pii",
  "personallyidentifiableinformation",
]);
const allowedSchemaCanonicalKeys = new Set([
  "approvalgovernancedecision",
  "satisfiesapprovalrequirement",
  "nextapprovalaction",
  "acceptedcount",
  "credentialfree",
  "forbiddencontent",
]);

const exactKeys = (value: JsonObject, expected: string[]): boolean =>
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());

const hasForbiddenCanonicalKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(hasForbiddenCanonicalKey);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value as JsonObject).some(([key, child]) => {
    const normalized = canonicalKey(key);
    return (
      (forbiddenCanonicalKeys.has(normalized) && !allowedSchemaCanonicalKeys.has(normalized)) ||
      hasForbiddenCanonicalKey(child)
    );
  });
};

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const proposedValuePairIsValid = (value: unknown, digest: unknown): boolean => {
  if (value === null) return digest === null;
  if (typeof value !== "string" || typeof digest !== "string") return false;
  return (
    value.length > 0 &&
    value.length <= 512 &&
    value === value.trim() &&
    value === value.normalize("NFC") &&
    !/[\u0000-\u001f\u007f-\u009f]/.test(value) &&
    /^[0-9a-f]{64}$/.test(digest) &&
    digest === sha256(value)
  );
};

const requirementStateIsValid = (value: JsonObject): boolean => {
  const state = String(value.state);
  const evidenceClass = String(value.evidenceClass);
  const blockers = asStrings(value.blockerIds, "blockerIds");
  const sources = asObjects(value.sourceReferences, "sourceReferences");
  if (value.satisfiesApprovalRequirement !== false || new Set(blockers).size !== blockers.length) {
    return false;
  }
  if (state === "REPOSITORY_SUPPORTED_CANDIDATE") {
    return evidenceClass === "repository_observation" && sources.length > 0;
  }
  if (state === "PROPOSED_MATERIAL_CHOICE") {
    return (
      evidenceClass === "proposal" &&
      blockers.includes("MARLON_MATERIAL_DECISION_PENDING") &&
      blockers.includes("APPROVAL_GOVERNANCE_SELECTION_PENDING")
    );
  }
  if (state === "BLOCKED_EXTERNAL_CUSTODIAN" || state === "BLOCKED_EXTERNAL_ACTION") {
    return (
      evidenceClass === "external_fact" &&
      blockers.includes("EXTERNAL_CUSTODIAN_OR_ACTION_EVIDENCE_MISSING")
    );
  }
  if (state === "UNATTEMPTED_RUNTIME") {
    return evidenceClass === "runtime_result" && blockers.includes("NATIVE_RUNTIME_UNATTEMPTED");
  }
  return false;
};

const dependencyGraphIsExact = (candidate: JsonObject): boolean => {
  const order = asStrings(candidate.dependencyOrder, "dependencyOrder");
  if (
    JSON.stringify(order) !== JSON.stringify(expectedDependencyOrder) ||
    new Set(order).size !== order.length
  ) {
    return false;
  }
  const positions = new Map(order.map((id, position) => [id, position]));
  const decisions = asObjects(candidate.decisions, "decisions");
  return decisions.every((decision) => {
    const id = String(decision.id);
    const dependencies = asStrings(decision.dependsOnDecisionIds, "dependsOnDecisionIds");
    const expected = expectedDependencies[id];
    return (
      expected !== undefined &&
      JSON.stringify(dependencies) === JSON.stringify(expected) &&
      new Set(dependencies).size === dependencies.length &&
      dependencies.every(
        (dependency) =>
          positions.has(dependency) &&
          (positions.get(dependency) as number) < (positions.get(id) as number),
      )
    );
  });
};

const schemaKeysetsAreExact = (candidate: JsonObject): boolean => {
  const phaseRoster = asObjects(candidate.phaseRoster, "phaseRoster");
  if (
    !exactKeys(candidate, rootKeys) ||
    !exactKeys(asObject(candidate.decisionPolicy), [
      "path",
      "sha256",
      "allowedStatuses",
      "acceptedCount",
    ]) ||
    !exactKeys(asObject(candidate.scope), [
      "credentialFree",
      "repositoryOnly",
      "candidateOnly",
      "liveAuthImplementationAuthorized",
      "externalActionsPerformed",
      "satisfiesApprovalRequirement",
      "runtimeEvidence",
      "preservedAuthStateContract",
    ]) ||
    !exactKeys(asObject(asObject(candidate.scope).runtimeEvidence), [
      "conducted",
      "passed",
      "failed",
      "unattempted",
    ]) ||
    !exactKeys(asObject(asObject(candidate.scope).preservedAuthStateContract), [
      "states",
      "transitions",
      "syntheticScenarios",
    ]) ||
    JSON.stringify(phaseRoster) !== JSON.stringify(expectedPhaseRoster) ||
    !phaseRoster.every((member) =>
      exactKeys(member, ["name", "role", "evidenceOwnership", "reviewerForDecisionIds"]),
    ) ||
    !exactKeys(asObject(candidate.approvalGovernanceDecision), [
      "state",
      "alternatives",
      "currentValidationCutoffUtc",
      "currentCutoffClosed",
      "futureReviewedPacketRequiresFreshNonBackdatedChronology",
      "selectedAlternative",
      "satisfiesApprovalRequirement",
    ])
  ) {
    return false;
  }
  const documents = asObjects(candidate.documents, "documents");
  if (!documents.every((document) => exactKeys(document, ["path", "sha256"]))) return false;
  return asObjects(candidate.decisions, "decisions").every(
    (decision) =>
      exactKeys(decision, decisionKeys) &&
      Object.values(asObject(decision.candidateEvidenceByRequirement)).every((requirement) => {
        const value = asObject(requirement);
        return (
          exactKeys(value, requirementKeys) &&
          asObjects(value.sourceReferences, "sourceReferences").every((reference) =>
            exactKeys(reference, ["commit", "path", "sha256"]),
          )
        );
      }),
  );
};

const evidenceIndexIsValid = (candidate: JsonObject): boolean => {
  try {
    if (!schemaKeysetsAreExact(candidate) || hasForbiddenCanonicalKey(candidate)) return false;
    if (
      candidate.satisfiesApprovalRequirement !== false ||
      asObject(candidate.scope).satisfiesApprovalRequirement !== false ||
      asObject(candidate.approvalGovernanceDecision).satisfiesApprovalRequirement !== false ||
      !dependencyGraphIsExact(candidate)
    ) {
      return false;
    }
    const documents = asObjects(candidate.documents, "documents");
    if (
      JSON.stringify(documents.map((document) => document.path)) !==
        JSON.stringify(expectedEvidenceDocuments) ||
      new Set(documents.map((document) => document.path)).size !== 4 ||
      documents.some(
        (document) =>
          document.sha256 !== sha256(readFileSync(resolve(repositoryRoot, String(document.path)))),
      )
    ) {
      return false;
    }
    const decisions = asObjects(candidate.decisions, "decisions");
    const policyDecisions = asObjects(policy.decisions, "policy decisions");
    if (
      JSON.stringify(decisions.map((decision) => decision.id)) !==
        JSON.stringify(expectedDecisionIds) ||
      new Set(decisions.map((decision) => decision.id)).size !== 14
    ) {
      return false;
    }
    let requirementCount = 0;
    for (const [position, decision] of decisions.entries()) {
      const id = String(decision.id);
      const policyDecision = policyDecisions[position];
      const expectedDisposition = expectedDecisionDispositionById[id];
      if (
        !policyDecision ||
        !expectedDisposition ||
        decision.policyStatus !== policyDecision.status ||
        decision.evidenceDocument !== expectedEvidenceDocumentByDecision[id] ||
        JSON.stringify({
          proposalState: decision.proposalState,
          requiredCustodian: decision.requiredCustodian,
          unresolvedBlockers: decision.unresolvedBlockers,
          nextApprovalAction: decision.nextApprovalAction,
        }) !== JSON.stringify(expectedDisposition) ||
        decision.satisfiesApprovalRequirement !== false ||
        !proposedValuePairIsValid(decision.proposedValue, decision.proposedValueSha256)
      ) {
        return false;
      }
      const requiredEvidence = asStrings(policyDecision.requiredEvidence, "requiredEvidence");
      const evidence = asObject(decision.candidateEvidenceByRequirement);
      if (
        JSON.stringify(Object.keys(evidence)) !== JSON.stringify(requiredEvidence) ||
        new Set(Object.keys(evidence)).size !== requiredEvidence.length
      ) {
        return false;
      }
      requirementCount += requiredEvidence.length;
      for (const requirement of requiredEvidence) {
        const value = asObject(evidence[requirement]);
        const sources = asObjects(value.sourceReferences, "sourceReferences");
        const expectedMetadata = expectedEvidenceMetadataByRecord[`${id}/${requirement}`];
        if (
          value.evidenceRecord !== `${id}/${requirement}` ||
          expectedMetadata === undefined ||
          JSON.stringify({
            state: value.state,
            evidenceClass: value.evidenceClass,
            blockerIds: value.blockerIds,
          }) !== JSON.stringify(expectedMetadata) ||
          !requirementStateIsValid(value) ||
          JSON.stringify(sources.map((source) => source.path)) !==
            JSON.stringify(expectedSourcePathsByDecision[id]) ||
          new Set(sources.map((source) => source.path)).size !== sources.length ||
          sources.some(
            (source) =>
              source.commit !== baseCommit ||
              source.sha256 !== expectedSourceDigestByPath.get(String(source.path)),
          )
        ) {
          return false;
        }
      }
    }
    return requirementCount === 69 && Object.keys(expectedEvidenceMetadataByRecord).length === 69;
  } catch {
    return false;
  }
};

const normalizeProseUnit = (value: string): string =>
  value.normalize("NFC").replace(/\s+/g, " ").trim();

const splitCompleteSentences = (value: string): string[] =>
  normalizeProseUnit(value)
    .split(/(?<=[.!?])\s+/)
    .map(normalizeProseUnit)
    .filter((unit) => unit.length > 0);

const collectJsonProseUnits = (value: unknown, units: string[] = []): string[] => {
  if (typeof value === "string") {
    if (/\s/.test(value)) units.push(...splitCompleteSentences(value));
    return units;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectJsonProseUnits(item, units);
    return units;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) collectJsonProseUnits(item, units);
  }
  return units;
};

const tokenizeProseUnits = (text: string): string[] => {
  try {
    return collectJsonProseUnits(JSON.parse(text) as unknown);
  } catch {
    return text.split(/\r?\n/).flatMap((line) => {
      const normalized = normalizeProseUnit(line);
      if (normalized.length === 0) return [];
      if (/^(?:[-*]|\d+\.)\s+/.test(normalized) || /^\|.*\|$/.test(normalized)) {
        return [normalized];
      }
      return splitCompleteSentences(normalized);
    });
  }
};

type ReviewedEvidenceProseModel = {
  documentSha256: string;
  proseUnitCount: number;
  proseUnitsSha256: string;
};

const reviewedEvidenceProseModelByPath: Record<string, ReviewedEvidenceProseModel> = {
  "contracts/mobile/auth-readiness/v1/evidence/index.json": {
    documentSha256: "162c0a25f5a4779b8e60abda00c9a9bf452a85cd7ea0a6b30cfe69d911ce96de",
    proseUnitCount: 110,
    proseUnitsSha256: "356377e57e41ae8ecec02c15f78405737d5b0f28287c11130ec8e372bba98347",
  },
  "contracts/mobile/auth-readiness/v1/evidence/link-and-custody.md": {
    documentSha256: "fb177501fbb19fc7d48253a9a4f5c912f76041fa57c1a31d55fe57f982dc6192",
    proseUnitCount: 25,
    proseUnitsSha256: "6b19a433795f6d278c927d4b2eeba39151744a0c1e31ac4247c0139ad01b5033",
  },
  "contracts/mobile/auth-readiness/v1/evidence/product-session-policy.md": {
    documentSha256: "6645cd554f21746edfd017ba7a13a7995a663d21f4f9a3572d5391148d8a58a1",
    proseUnitCount: 52,
    proseUnitsSha256: "a2f25b04ad52eb6569b004d9bd84bbc1076a0df4b3606f332318ce7f5ced9662",
  },
  "contracts/mobile/auth-readiness/v1/evidence/sdk-provenance.md": {
    documentSha256: "1dc4257ee9266ac2d72f13ebd1690579c081e5857598e5b2718a0d8f6f6a8909",
    proseUnitCount: 26,
    proseUnitsSha256: "d9ac3bdff390c22ceaf40935900fc2d4ffeaa40867aecfa4c566302df328b1fd",
  },
  "contracts/mobile/auth-readiness/v1/evidence/storage-and-lifecycle.md": {
    documentSha256: "255400a4814a238149602c360ae041dc1f017f169a06a68590f869da68dfb49f",
    proseUnitCount: 20,
    proseUnitsSha256: "8b84bfcdaeeeeea91baca24c23f4fa7d6d5c490d2ce883f75cde1d77e40c2b8d",
  },
};

const reviewedEvidenceProseReasons = (relativePath: string, text: string): string[] => {
  const model = reviewedEvidenceProseModelByPath[relativePath];
  if (!model) return [`unreviewed evidence document: ${relativePath}`];
  const units = tokenizeProseUnits(text);
  const reasons: string[] = [];
  if (sha256(text) !== model.documentSha256)
    reasons.push(`unreviewed document bytes: ${relativePath}`);
  if (units.length !== model.proseUnitCount)
    reasons.push(`unreviewed prose-unit count: ${relativePath}`);
  if (sha256(JSON.stringify(units)) !== model.proseUnitsSha256) {
    reasons.push(`unreviewed prose-unit sequence: ${relativePath}`);
  }
  return reasons;
};

const forbiddenClaimPredicateStem =
  /\b(?:implement(?:ed|ation)?|complet(?:e|ed|ion)?|support(?:ed)?|availab(?:le|ility)|select(?:ed|ion)?|approv(?:e|ed|al)|install(?:ed|ation)?|safe|verif(?:y|ied|ication)|configur(?:e|ed|ation)|ready)\b/i;

const nativeAuthReadinessSubject =
  /\b(?:(?:native|mobile|live)\s+(?:auth(?:entication)?|login|sign[ -]?in)|authentication\s+(?:runtime|flow|experience|capability|integration|service)|identity\s+flow|sign[ -]?in\s+(?:flow|experience)|oauth\b.*\b(?:ios|android|mobile|native)|(?:ios|android|mobile|native)\b.*\boauth)\b/i;

const reviewedNegativeNativeAuthBoundaryUnits = new Set([
  "Native authentication is not implemented.",
  "Native authentication is not enabled.",
  "Native auth is not operational.",
  "Native auth is not, under any circumstances, operational.",
  "Native auth has never worked.",
  "Native auth does not work.",
  "Native authentication is absolutely not enabled.",
  "Native login remains entirely unattempted.",
  "No native authentication is enabled.",
  "Native authentication remains unavailable.",
  "Native login is not currently operational.",
  "The native sign-in flow remains unattempted.",
  "OAuth is not enabled on iOS.",
  "Mobile login remains blocked.",
  "The identity flow is not functioning.",
  "The sign-in experience has not been implemented.",
  "Native auth doesn't work.",
  "Native auth is by no means operational.",
  "Native auth is neither enabled nor operational.",
  "Neither native auth nor mobile login is operational.",
  "Native authentication cannot be operational.",
  "Native authentication can't be operational.",
  "The SDK remains blocked, but native authentication remains unattempted.",
]);

const containsUnreviewedNativeAuthClaim = (unit: string): boolean =>
  nativeAuthReadinessSubject.test(unit) && !reviewedNegativeNativeAuthBoundaryUnits.has(unit);

const reviewedClaimBearingUnits = new Set([
  "# Native auth links and custody candidate evidence",
  "# Native auth product and session policy candidate evidence",
  "# Native auth SDK provenance candidate evidence",
  "# Native auth storage and lifecycle candidate evidence",
  "Native sign-in, confirmation, recovery, sign-out, session expiry, remote revocation, and account deletion remain unattempted.",
  "Marlon for selection; Natalia for security and provenance review",
  "Candidate review criteria are documented for exact_package_version_source_and_sha256; no value is selected.",
  "Candidate review criteria are documented for license_and_advisory_review; no value is selected.",
  "Candidate review criteria are documented for credential_and_diagnostic_logging_review; no value is selected.",
  "Marlon selects approval-governance alternative A or B, then reviews a fresh non-backdated packet.",
  "Candidate review criteria are documented for exact_coordinate_version_repository_and_sha256; no value is selected.",
  "Candidate review criteria are documented for reviewed_release_contains_credential_logging_fix; no value is selected.",
  "Candidate review criteria are documented for fluyo_logger_retains_no_sdk_message_or_throwable; no value is selected.",
  "Candidate review criteria are documented for exact_local_or_global_scope; no value is selected.",
  "Named domain and TLS custodian; Marlon for exact host selection",
  "Candidate review criteria are documented for exact_environment_route_inventory; no value is selected.",
  "Candidate review criteria are documented for exact_aasa_bytes_and_sha256; no value is selected.",
  "Candidate review criteria are documented for exact_assetlinks_bytes_and_sha256; no value is selected.",
  "Candidate review criteria are documented for approved_callback_decisions; no value is selected.",
  "Candidate review criteria are documented for keychain_accessibility_choice; no value is selected.",
  "Candidate review criteria are documented for keystore_and_encryption_choice; no value is selected.",
  "Candidate review criteria are documented for least_privilege_access_and_recovery; no value is selected.",
  "Candidate review criteria are documented for incident_and_rotation_handoff; no value is selected.",
  "Named delivery and support custodians; Marlon for product choice",
  "Named backend, privacy, retention, and support custodians; Marlon for destructive action",
  "- Do not derive a Supabase redirect allowlist unless the callback, AASA, and assetlinks decisions have been separately approved. Treat any dashboard mutation as a separate external action.",
  "These are proposed review steps, not selected values.",
  "Required domain, TLS, Apple binding, Android signing/certificate, Supabase project, delivery, support, recovery, and incident custodians have not supplied approved evidence.",
  "Universal-link retrieval, Android App Link retrieval, positive/negative routing, provider callback completion, allowlist enforcement, recovery delivery, device association, and external custody drills remain unattempted.",
  "The safe fallback is synthetic in-memory callback fixtures and unchanged external dashboards.",
  "No native callback domain or native redirect entry is selected, configured, or authorized by this packet; existing web callback and redirect configuration is out of scope and unchanged.",
  "It supplies no visible product copy, runtime result, accessibility support claim, or approval.",
  "- `AUTH-SIGNOUT-SCOPE`: retain local cleanup as the safe fallback unless a separately approved provider-wide revocation capability is proven. Any copy must disclose issued-JWT expiry limits.",
  "- `AUTH-RECOVERY-DELIVERY`: keep recovery unavailable until a sender, template, expiry, throttling, support path, and failure contract have named custodians and evidence.",
  "- `AUTH-ACCOUNT-DELETION`: no native deletion action is available. A future candidate requires a separately selected API owner, idempotent orchestration, partial-failure recovery, an audit contract, recent reauthentication, and irreversible-consequence copy.",
  "Named provider, delivery, support, backend, privacy, and destructive-action custodians remain required where the decision row identifies them.",
  "## Approval-governance decision remains blocked",
  "Marlon must select one of these alternatives before any row can be accepted:",
  "Create a finalized reviewed packet/evidence commit `P`, an approval-record commit `A` directly after `P`, and a validation commit `V` directly after `A`, then preserve that ancestry through merge.",
  "### Alternative B — adopt an append-only content-addressed squash-compatible approval record",
  "Design and separately review an append-only record whose immutable content digests bind the reviewed packet, approved value, evidence, approver, and fresh chronology even after a squash merge.",
  "The current validator does not implement or authorize this model.",
  "Neither alternative is selected.",
  "Acceptance remains blocked until Marlon chooses one and the selected mechanism receives its own exact-head review.",
  "No field in this candidate packet is an approval record, and no CI, merge, digest, or review result substitutes for Marlon's decision.",
  "It records repository facts and a review procedure; it does not select, approve, install, resolve, or exercise an iOS or Android authentication SDK.",
  "| Observed repository fact | The bound base contains iOS and Android native foundation policies with Supabase public configuration fields, SDK-neutral native dependency manifests, and a provider-neutral auth-state contract. The bound iOS project manifest and Android app Gradle manifest contain no native authentication SDK package or coordinate selection. No native auth runtime result exists. | This observation is limited to the exact bound policy, manifest, and contract bytes. |",
  "| Proposed material choice | Before selection, record the exact package or coordinate, version, upstream source/repository, artifact SHA-256, license, advisories, supported OS floor, transitive graph, and credential/diagnostic logging behavior. | The review procedure is a proposal, not a package decision. |",
  "| External blocker | No approved package/version, artifact digest, upstream advisory snapshot, license disposition, or platform security custodian is recorded. | Repository inspection cannot substitute for external provenance or Marlon's material choice. |",
  "| Unattempted runtime | Native SDK resolution, installation, initialization, sign-in, logging capture, and device execution remain unattempted. | Runtime is 0 passed, 0 failed, and 24 unattempted across the native matrix. |",
  "A future reviewed packet must name one exact package and version, bind the downloaded artifact and complete dependency graph by digest, record license and advisory review, confirm the supported iOS floor, and demonstrate that credentials and diagnostic data are not retained or emitted.",
  "A future reviewed packet must name one exact coordinate, version, repository, AAR and transitive graph; bind those bytes by digest; record license and advisory review; confirm the supported Android floor; prove the reviewed release contains the relevant credential-logging fix; and prove the Fluyo logging boundary retains neither SDK messages nor throwable contents.",
  "5. Marlon may then select a value through the separately accepted approval-governance mechanism.",
  "Until every step is complete, the fallback remains provider-neutral ports with zero native runtime.",
  "No wording may claim that an SDK is selected, approved, installed, safe, verified, supported, or exercised.",
  "It does not implement, select, approve, install, or verify a Keychain or Keystore adapter.",
  "Security, platform, backend, privacy, retention, support, and destructive-action owners must resolve the material choices.",
  "No external account, credential, device, signing resource, provider configuration, or database was accessed.",
  "No SDK is selected or approved.",
  "No SDK is approved; no SDK is installed.",
  "The SDK is not selected.",
  "SDK installation remains unattempted.",
  "Native authentication is not implemented.",
  "The sign-in experience has not been implemented.",
  "Keychain persistence is not verified.",
  "Production use is not approved.",
]);

const accessibilityMatrixHeaderCells = [
  "Flow decision",
  "Platform",
  "acceptedCopyReference",
  "Exact focus destination and order",
  "Exact announcement text, live priority, and one-time count",
  "Platform screen-reader evidence",
  "200% text, reflow, and action reachability",
  "Minimum target dimensions and spacing",
  "Reduced-motion static equivalent",
  "executionState",
  "requirementsSatisfied",
];
const expectedAccessibilityMatrixKeys = affectedProductFlowDecisionIds.flatMap((decisionId) =>
  ["iOS", "Android"].map((platform) => `\`${decisionId}\`|${platform}`),
);

const parseMarkdownTableCells = (line: string): string[] | null => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
};

const accessibilityMatrixRows = (markdown: string): string[][] | null => {
  const lines = markdown.split(/\r?\n/);
  let headerIndex = -1;
  let headerCount = 0;
  for (const [index, line] of lines.entries()) {
    const cells = parseMarkdownTableCells(line);
    if (cells && JSON.stringify(cells) === JSON.stringify(accessibilityMatrixHeaderCells)) {
      headerIndex = index;
      headerCount += 1;
    }
  }
  if (headerCount !== 1 || headerIndex < 0) return null;
  const separator = parseMarkdownTableCells(lines[headerIndex + 1] ?? "");
  if (
    !separator ||
    separator.length !== accessibilityMatrixHeaderCells.length ||
    separator.some((cell) => !/^:?-{3,}:?$/.test(cell))
  ) {
    return null;
  }
  const rows: string[][] = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const cells = parseMarkdownTableCells(lines[index] ?? "");
    if (!cells) break;
    rows.push(cells);
  }
  return rows;
};

const accessibilityMatrixIsValid = (markdown: string): boolean => {
  const rows = accessibilityMatrixRows(markdown);
  if (!rows || rows.length !== 10) return false;
  const expectedDecisionCells = new Set(
    affectedProductFlowDecisionIds.map((decisionId) => `\`${decisionId}\``),
  );
  const keys = rows.map((cells) => `${cells[0]}|${cells[1]}`);
  if (
    new Set(keys).size !== 10 ||
    JSON.stringify(keys) !== JSON.stringify(expectedAccessibilityMatrixKeys)
  ) {
    return false;
  }
  return rows.every((cells) => {
    if (
      cells.length !== accessibilityMatrixHeaderCells.length ||
      !expectedDecisionCells.has(cells[0] ?? "") ||
      (cells[1] !== "iOS" && cells[1] !== "Android")
    ) {
      return false;
    }
    const platform = cells[1];
    return (
      cells[2] === "required; unset" &&
      cells[3] === "required; destination and full order unset" &&
      cells[4] === "required; text and priority unset; count must equal 1" &&
      cells[5] === (platform === "iOS" ? "VoiceOver run required" : "TalkBack run required") &&
      cells[6] === "no loss; reflow and every action reachable; run unattempted" &&
      cells[7] ===
        (platform === "iOS"
          ? "≥44×44 pt and ≥8 pt separation; run unattempted"
          : "≥48×48 dp and ≥8 dp separation; run unattempted") &&
      cells[8] === "required for any motion; exact static state unset" &&
      cells[9] === "UNATTEMPTED" &&
      cells[10] === "false"
    );
  });
};

const replaceAccessibilityMatrixRows = (markdown: string, rows: string[][]): string => {
  const lines = markdown.split(/\r?\n/);
  let headerIndex = -1;
  for (const [index, line] of lines.entries()) {
    const cells = parseMarkdownTableCells(line);
    if (cells && JSON.stringify(cells) === JSON.stringify(accessibilityMatrixHeaderCells)) {
      if (headerIndex !== -1) throw new Error("duplicate accessibility matrix header");
      headerIndex = index;
    }
  }
  if (headerIndex < 0) throw new Error("missing accessibility matrix header");
  let endIndex = headerIndex + 2;
  while (endIndex < lines.length && parseMarkdownTableCells(lines[endIndex] ?? "")) endIndex += 1;
  const renderedRows = rows.map((cells) => `| ${cells.join(" | ")} |`);
  return [...lines.slice(0, headerIndex + 2), ...renderedRows, ...lines.slice(endIndex)].join("\n");
};

const unsafeContentReasons = (text: string): string[] => {
  const reasons: string[] = [];
  const patterns: Array<[string, RegExp]> = [
    ["pem", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i],
    ["jwt", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/],
    ["bearer", /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/i],
    ["authorization", /\bAuthorization\s*:\s*(?:Basic|Bearer)\s+[A-Za-z0-9._~+/-]{8,}={0,2}/i],
    ["cookie", /\b(?:Set-Cookie|Cookie)\s*:\s*[^\s;=]+=[^\s;]+/i],
    [
      "assigned credential",
      /\b(?:service[ _.-]?role(?:[ _.-]?key)?|anon[ _.-]?key|api[ _.-]?key|client[ _.-]?secret|access[ _.-]?token|refresh[ _.-]?token|id[ _.-]?token|auth(?:orization)?[ _.-]?code|password|otp|recovery[ _.-]?(?:code|key)|private[ _.-]?key|signing[ _.-]?key)\s*[:=]\s*["']?[^\s"']{4,}/i,
    ],
    ["provider key", /\b(?:sk_(?:live|test)|pk_live|service_role)[A-Za-z0-9_-]{8,}/i],
    ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
    ["phone", /\+(?:[0-9][ -]?){8,15}\b/],
    [
      "private identifier",
      /\b(?:(?:device|private)[ _.-]?id|(?:private[ _.-]?)?account[ _.-]?id)\s*[:=]\s*[A-Za-z0-9._:-]{6,}/i,
    ],
    [
      "private ip",
      /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/,
    ],
    ["credential url", /https?:\/\/[^\s/:@]+:[^\s/@]+@[^\s/]+/i],
  ];
  for (const [label, pattern] of patterns) if (pattern.test(text)) reasons.push(label);
  for (const unit of tokenizeProseUnits(text)) {
    if (reviewedNegativeNativeAuthBoundaryUnits.has(unit)) continue;
    if (
      (forbiddenClaimPredicateStem.test(unit) || containsUnreviewedNativeAuthClaim(unit)) &&
      !reviewedClaimBearingUnits.has(unit)
    ) {
      reasons.push(`unreviewed claim-bearing unit: ${unit}`);
    }
  }
  return reasons;
};

const evidencePacketContentReasons = (relativePath: string, text: string): string[] => [
  ...reviewedEvidenceProseReasons(relativePath, text),
  ...unsafeContentReasons(text),
];

const syntheticJwtFixture = [
  Buffer.from('{"alg":"HS256"}').toString("base64url"),
  Buffer.from('{"sub":"1234567890"}').toString("base64url"),
  Buffer.from("signature1234").toString("base64url"),
].join(".");
const syntheticAssignedCredential = (...nameParts: string[]): string =>
  `${nameParts.join("_")}=${["abcdefgh", "ijklmnop"].join("")}`;

describe("native auth pre-approval decision evidence", () => {
  const decisions = asObjects(index.decisions, "evidence decisions");
  const policyDecisions = asObjects(policy.decisions, "policy decisions");

  it("has the exact five-file evidence inventory and binds all four markdown documents", () => {
    expect(readdirSync(evidenceDirectory).sort()).toEqual([
      "index.json",
      "link-and-custody.md",
      "product-session-policy.md",
      "sdk-provenance.md",
      "storage-and-lifecycle.md",
    ]);
    const documents = asObjects(index.documents, "documents");
    expect(documents.map((document) => document.path)).toEqual(expectedEvidenceDocuments);
    for (const document of documents) {
      const documentPath = String(document.path);
      expect(document.sha256).toBe(sha256(readFileSync(resolve(repositoryRoot, documentPath))));
    }
  });

  it("is bound to the exact base and unchanged raw decision policy", () => {
    expect(index).toMatchObject({
      schemaVersion: "1.0.0",
      packetKind: "pre_approval_decision_evidence",
      sourceMainCommit: baseCommit,
      satisfiesApprovalRequirement: false,
    });
    expect(asObject(index.decisionPolicy)).toEqual({
      path: policyRelativePath,
      sha256: "3e2aa6dabb4e9fe28b1b80e10f705f3df3968f85ed0e4e18ca8a0eb97ff9d696",
      allowedStatuses: ["PROPOSED", "BLOCKED"],
      acceptedCount: 0,
    });
    const basePolicy = gitBuffer("show", `${baseCommit}:${policyRelativePath}`);
    expect(policyBytes.equals(basePolicy)).toBe(true);
    expect(sha256(policyBytes)).toBe(asObject(index.decisionPolicy).sha256);
    expect(gitText("diff", "--name-only", baseCommit, "--", "apps", policyRelativePath)).toBe("");
    expect(gitText("status", "--porcelain=v1", "--untracked-files=all", "--", "apps")).toBe("");
  });

  it("records the exact thirteen-person phase roster and bounded reviewer ownership", () => {
    const phaseRoster = asObjects(index.phaseRoster, "phaseRoster");
    expect(phaseRoster).toEqual(expectedPhaseRoster);
    expect(new Set(phaseRoster.map((member) => member.name)).size).toBe(13);
    for (const member of phaseRoster) {
      expect(asStrings(member.evidenceOwnership, "evidenceOwnership").length).toBeGreaterThan(0);
      expect(
        asStrings(member.reviewerForDecisionIds, "reviewerForDecisionIds").every((decisionId) =>
          expectedDecisionIds.includes(decisionId),
        ),
      ).toBe(true);
    }
    for (const name of ["Camila Reyes", "Daniela Vargas"]) {
      expect(phaseRoster.find((member) => member.name === name)?.reviewerForDecisionIds).toEqual(
        affectedProductFlowDecisionIds,
      );
    }
    expect(
      phaseRoster.filter((member) => member.role === "sole_independent_exact_head_qa"),
    ).toEqual([expect.objectContaining({ name: "Elana Castillo" })]);
    expect(phaseRoster).toContainEqual(
      expect.objectContaining({ name: "Adriana Solano", role: "orchestrator_merge_owner" }),
    );
    expect(phaseRoster).toContainEqual(
      expect.objectContaining({
        name: "Valentina Cruz",
        role: "primary_implementation_backend_frontend_database",
      }),
    );
  });

  it("maps the exact fourteen policy rows and every required-evidence key", () => {
    expect(policyDecisions.map((decision) => decision.id)).toEqual(expectedDecisionIds);
    expect(decisions.map((decision) => decision.id)).toEqual(expectedDecisionIds);
    expect(new Set(decisions.map((decision) => decision.id)).size).toBe(14);
    for (const [position, decision] of decisions.entries()) {
      const policyDecision = policyDecisions[position];
      expect(policyDecision).toBeDefined();
      expect(decision.policyStatus).toBe(policyDecision?.status);
      expect(["PROPOSED", "BLOCKED"]).toContain(decision.policyStatus);
      expect(Object.keys(asObject(decision.candidateEvidenceByRequirement)).sort()).toEqual(
        [...asStrings(policyDecision?.requiredEvidence, "requiredEvidence")].sort(),
      );
      expect(decision.recheckTrigger).toBe(policyDecision?.recheckTrigger);
      expect(decision.claimBoundary).toBe(policyDecision?.claimBoundary);
      expect(typeof decision.requiredCustodian).toBe("string");
      expect(String(decision.requiredCustodian).length).toBeGreaterThan(0);
      expect(asStrings(decision.unresolvedBlockers, "unresolvedBlockers").length).toBeGreaterThan(
        0,
      );
    }
  });

  it.each([
    [
      "proposalState",
      (decision: JsonObject) => {
        decision.proposalState = "REPOSITORY_SUPPORTED_CANDIDATE";
      },
    ],
    [
      "requiredCustodian",
      (decision: JsonObject) => {
        decision.requiredCustodian = "Nobody";
      },
    ],
    [
      "unresolvedBlockers",
      (decision: JsonObject) => {
        decision.unresolvedBlockers = ["BOGUS"];
      },
    ],
    [
      "nextApprovalAction",
      (decision: JsonObject) => {
        decision.nextApprovalAction = "No action remains.";
      },
    ],
  ] as const)("rejects every per-decision %s mutation", (_field, mutate) => {
    for (const decisionId of expectedDecisionIds) {
      const candidate = deepClone(index);
      const decision = asObjects(candidate.decisions, "decisions").find(
        (entry) => entry.id === decisionId,
      );
      expect(decision, decisionId).toBeDefined();
      mutate(decision as JsonObject);
      expect(evidenceIndexIsValid(candidate), decisionId).toBe(false);
    }
  });

  it("enforces exact object keysets and recursively denies canonicalized sensitive keys", () => {
    expect(schemaKeysetsAreExact(index)).toBe(true);
    expect(hasForbiddenCanonicalKey(index)).toBe(false);
    expect(evidenceIndexIsValid(index)).toBe(true);

    const unknownFieldMutations: Array<(candidate: JsonObject) => void> = [
      (candidate) => {
        candidate.unknown = true;
      },
      (candidate) => {
        asObject(candidate.scope).unknown = true;
      },
      (candidate) => {
        asObjects(candidate.phaseRoster, "phaseRoster")[0]!.unknown = true;
      },
      (candidate) => {
        asObjects(candidate.documents, "documents")[0]!.unknown = true;
      },
      (candidate) => {
        asObjects(candidate.decisions, "decisions")[0]!.unknown = true;
      },
      (candidate) => {
        const decision = asObjects(candidate.decisions, "decisions")[0]!;
        const requirement = Object.values(asObject(decision.candidateEvidenceByRequirement))[0];
        asObject(requirement).unknown = true;
      },
      (candidate) => {
        const decision = asObjects(candidate.decisions, "decisions")[0]!;
        const requirement = asObject(
          Object.values(asObject(decision.candidateEvidenceByRequirement))[0],
        );
        asObjects(requirement.sourceReferences, "sourceReferences")[0]!.unknown = true;
      },
    ];
    for (const mutate of unknownFieldMutations) {
      const candidate = deepClone(index);
      mutate(candidate);
      expect(evidenceIndexIsValid(candidate)).toBe(false);
    }

    for (const dangerousKey of [
      "Approved_By",
      "approved-by",
      "APPROVED.BY",
      "client_secret",
      "Access-Token",
      "email.address",
      "DEVICE_ID",
      "private-key",
    ]) {
      const candidate = deepClone(index);
      candidate[dangerousKey] = "mutation";
      expect(hasForbiddenCanonicalKey(candidate)).toBe(true);
      expect(evidenceIndexIsValid(candidate)).toBe(false);
    }
  });

  it("binds every row and requirement to its exact document, stable record, and source set", () => {
    for (const decision of decisions) {
      const id = String(decision.id);
      expect(decision.evidenceDocument).toBe(expectedEvidenceDocumentByDecision[id]);
      const requirements = asObject(decision.candidateEvidenceByRequirement);
      for (const [requirement, candidateValue] of Object.entries(requirements)) {
        const candidate = asObject(candidateValue);
        expect(candidate.evidenceRecord).toBe(`${id}/${requirement}`);
        expect(
          asObjects(candidate.sourceReferences, "sourceReferences").map((reference) =>
            String(reference.path),
          ),
        ).toEqual(expectedSourcePathsByDecision[id]);
      }
    }

    const mutateFirstRequirement = (
      mutate: (decision: JsonObject, requirement: JsonObject) => void,
    ): JsonObject => {
      const candidate = deepClone(index);
      const decision = asObjects(candidate.decisions, "decisions")[0]!;
      const requirement = asObject(
        Object.values(asObject(decision.candidateEvidenceByRequirement))[0],
      );
      mutate(decision, requirement);
      return candidate;
    };
    expect(
      evidenceIndexIsValid(
        mutateFirstRequirement((decision) => {
          decision.evidenceDocument = expectedEvidenceDocuments[0];
        }),
      ),
    ).toBe(false);
    expect(
      evidenceIndexIsValid(
        mutateFirstRequirement((decision) => {
          decision.evidenceDocument = "contracts/mobile/auth-readiness/v1/evidence/../README.md";
        }),
      ),
    ).toBe(false);
    expect(
      evidenceIndexIsValid(
        mutateFirstRequirement((_decision, requirement) => {
          requirement.evidenceRecord = "AUTH-SDK-ANDROID/license_and_advisory_review";
        }),
      ),
    ).toBe(false);
    expect(
      evidenceIndexIsValid(
        mutateFirstRequirement((_decision, requirement) => {
          asObjects(requirement.sourceReferences, "sourceReferences")[0]!.path = "README.md";
        }),
      ),
    ).toBe(false);
    expect(
      evidenceIndexIsValid(
        mutateFirstRequirement((_decision, requirement) => {
          asObjects(requirement.sourceReferences, "sourceReferences")[0]!.path = "../package.json";
        }),
      ),
    ).toBe(false);
    expect(
      evidenceIndexIsValid(
        mutateFirstRequirement((_decision, requirement) => {
          asObjects(requirement.sourceReferences, "sourceReferences")[0]!.sha256 = "0".repeat(64);
        }),
      ),
    ).toBe(false);
  });

  it("requires exactly 69 false requirement flags and exact state-to-class blocker rules", () => {
    const requirements = decisions.flatMap((decision) =>
      Object.values(asObject(decision.candidateEvidenceByRequirement)).map((value) =>
        asObject(value),
      ),
    );
    expect(requirements).toHaveLength(69);
    expect(Object.keys(expectedEvidenceMetadataByRecord)).toHaveLength(69);
    expect(
      requirements.every((requirement) => requirement.satisfiesApprovalRequirement === false),
    ).toBe(true);
    expect(requirements.every(requirementStateIsValid)).toBe(true);
    expect(index.satisfiesApprovalRequirement).toBe(false);
    expect(asObject(index.scope).satisfiesApprovalRequirement).toBe(false);
    expect(asObject(index.approvalGovernanceDecision).satisfiesApprovalRequirement).toBe(false);
    expect(decisions.every((decision) => decision.satisfiesApprovalRequirement === false)).toBe(
      true,
    );

    const satisfactionMutations: Array<(candidate: JsonObject) => void> = [
      (candidate) => {
        candidate.satisfiesApprovalRequirement = true;
      },
      (candidate) => {
        asObject(candidate.approvalGovernanceDecision).satisfiesApprovalRequirement = true;
      },
      (candidate) => {
        asObjects(candidate.decisions, "decisions")[0]!.satisfiesApprovalRequirement = true;
      },
      (candidate) => {
        const decision = asObjects(candidate.decisions, "decisions")[0]!;
        asObject(
          Object.values(asObject(decision.candidateEvidenceByRequirement))[0],
        ).satisfiesApprovalRequirement = true;
      },
    ];
    for (const mutate of satisfactionMutations) {
      const candidate = deepClone(index);
      mutate(candidate);
      expect(evidenceIndexIsValid(candidate)).toBe(false);
    }

    const source = { commit: baseCommit, path: "package-lock.json", sha256: "a".repeat(64) };
    const baseRequirement = {
      state: "REPOSITORY_SUPPORTED_CANDIDATE",
      evidenceClass: "repository_observation",
      evidenceRecord: "AUTH-SDK-IOS/example",
      summary: "candidate",
      sourceReferences: [source],
      blockerIds: [],
      satisfiesApprovalRequirement: false,
    };
    expect(requirementStateIsValid(baseRequirement)).toBe(true);
    expect(requirementStateIsValid({ ...baseRequirement, sourceReferences: [] })).toBe(false);
    expect(requirementStateIsValid({ ...baseRequirement, evidenceClass: "proposal" })).toBe(false);
    const proposed = {
      ...baseRequirement,
      state: "PROPOSED_MATERIAL_CHOICE",
      evidenceClass: "proposal",
      blockerIds: ["MARLON_MATERIAL_DECISION_PENDING", "APPROVAL_GOVERNANCE_SELECTION_PENDING"],
    };
    expect(requirementStateIsValid(proposed)).toBe(true);
    expect(requirementStateIsValid({ ...proposed, blockerIds: [] })).toBe(false);
    const external = {
      ...baseRequirement,
      state: "BLOCKED_EXTERNAL_ACTION",
      evidenceClass: "external_fact",
      blockerIds: ["EXTERNAL_CUSTODIAN_OR_ACTION_EVIDENCE_MISSING"],
    };
    expect(requirementStateIsValid(external)).toBe(true);
    expect(requirementStateIsValid({ ...external, blockerIds: [] })).toBe(false);
    const runtime = {
      ...baseRequirement,
      state: "UNATTEMPTED_RUNTIME",
      evidenceClass: "runtime_result",
      blockerIds: ["NATIVE_RUNTIME_UNATTEMPTED"],
    };
    expect(requirementStateIsValid(runtime)).toBe(true);
    expect(requirementStateIsValid({ ...runtime, blockerIds: [] })).toBe(false);

    const mutateRecord = (
      record: string,
      mutate: (requirement: JsonObject) => void,
    ): JsonObject => {
      const candidate = deepClone(index);
      for (const decision of asObjects(candidate.decisions, "decisions")) {
        for (const requirement of Object.values(
          asObject(decision.candidateEvidenceByRequirement),
        )) {
          const value = asObject(requirement);
          if (value.evidenceRecord === record) {
            mutate(value);
            return candidate;
          }
        }
      }
      throw new Error(`missing evidence record ${record}`);
    };

    const runtimeToRepository = mutateRecord("AUTH-REVOCATION/runtime_proof", (requirement) => {
      requirement.state = "REPOSITORY_SUPPORTED_CANDIDATE";
      requirement.evidenceClass = "repository_observation";
      requirement.blockerIds = [...materialDecisionBlockers];
    });
    expect(
      requirementStateIsValid(
        asObject(
          asObject(
            asObjects(runtimeToRepository.decisions, "decisions").find(
              (decision) => decision.id === "AUTH-REVOCATION",
            )?.candidateEvidenceByRequirement,
          ).runtime_proof,
        ),
      ),
    ).toBe(true);
    expect(evidenceIndexIsValid(runtimeToRepository)).toBe(false);

    const externalToProposal = mutateRecord("AUTH-AASA/app_binding", (requirement) => {
      requirement.state = "PROPOSED_MATERIAL_CHOICE";
      requirement.evidenceClass = "proposal";
      requirement.blockerIds = [...materialDecisionBlockers];
    });
    expect(evidenceIndexIsValid(externalToProposal)).toBe(false);

    const blockerMutations: Array<(blockers: string[]) => string[]> = [
      (blockers) => blockers.slice(0, 1),
      (blockers) => [...blockers, "NATIVE_RUNTIME_UNATTEMPTED"],
      (blockers) => [...blockers].reverse(),
      () => ["UNKNOWN_BLOCKER"],
    ];
    for (const mutateBlockers of blockerMutations) {
      const candidate = mutateRecord(
        "AUTH-SDK-IOS/exact_package_version_source_and_sha256",
        (requirement) => {
          requirement.blockerIds = mutateBlockers(asStrings(requirement.blockerIds, "blockerIds"));
        },
      );
      expect(evidenceIndexIsValid(candidate)).toBe(false);
    }
  });

  it("keeps all five exact product-flow copy and action records proposed and blocked", () => {
    const recordIds = [
      "AUTH-METHODS/context_specific_copy_primary_and_cancel_actions",
      "AUTH-SIGNOUT-SCOPE/context_specific_signout_copy_primary_and_cancel_actions",
      "AUTH-RECOVERY-DELIVERY/context_specific_recovery_copy_primary_and_cancel_actions",
      "AUTH-REVOCATION/context_specific_session_ended_copy_primary_and_cancel_actions",
      "AUTH-ACCOUNT-DELETION/clear_irreversible_consequence_copy_primary_delete_action_and_non_destructive_cancel",
    ];
    const requirements = decisions.flatMap((decision) =>
      Object.values(asObject(decision.candidateEvidenceByRequirement)).map((value) =>
        asObject(value),
      ),
    );
    for (const recordId of recordIds) {
      const requirement = requirements.find((value) => value.evidenceRecord === recordId);
      expect(requirement).toMatchObject({
        state: "PROPOSED_MATERIAL_CHOICE",
        evidenceClass: "proposal",
        blockerIds: materialDecisionBlockers,
        satisfiesApprovalRequirement: false,
      });
      expect(String(requirement?.summary)).toContain("exact flow copy and actions remain unset");
    }
  });

  it("requires the exact unique dependency arrays and rejects missing, extra, duplicate, and cyclic mutations", () => {
    expect(dependencyGraphIsExact(index)).toBe(true);
    for (const decision of decisions) {
      expect(decision.dependsOnDecisionIds).toEqual(expectedDependencies[String(decision.id)]);
    }
    const mutations: Array<(candidate: JsonObject) => void> = [
      (candidate) => {
        asObjects(candidate.decisions, "decisions").find(
          (decision) => decision.id === "AUTH-SDK-IOS",
        )!.dependsOnDecisionIds = [];
      },
      (candidate) => {
        asObjects(candidate.decisions, "decisions").find(
          (decision) => decision.id === "AUTH-SDK-IOS",
        )!.dependsOnDecisionIds = ["AUTH-METHODS", "AUTH-NONPROD-CUSTODY"];
      },
      (candidate) => {
        asObjects(candidate.decisions, "decisions").find(
          (decision) => decision.id === "AUTH-SDK-IOS",
        )!.dependsOnDecisionIds = ["AUTH-METHODS", "AUTH-METHODS"];
      },
      (candidate) => {
        asObjects(candidate.decisions, "decisions").find(
          (decision) => decision.id === "AUTH-METHODS",
        )!.dependsOnDecisionIds = ["AUTH-ACCOUNT-DELETION"];
      },
      (candidate) => {
        const order = asStrings(candidate.dependencyOrder, "dependencyOrder");
        order[1] = order[0] as string;
      },
    ];
    for (const mutate of mutations) {
      const candidate = deepClone(index);
      mutate(candidate);
      expect(dependencyGraphIsExact(candidate)).toBe(false);
      expect(evidenceIndexIsValid(candidate)).toBe(false);
    }
  });

  it("validates non-null proposed values as canonical bounded digest-bound strings", () => {
    expect(proposedValuePairIsValid(null, null)).toBe(true);
    const valid = "Candidate package A";
    expect(proposedValuePairIsValid(valid, sha256(valid))).toBe(true);
    for (const [value, digest] of [
      [42, sha256("42")],
      [" candidate", sha256(" candidate")],
      ["candidate ", sha256("candidate ")],
      ["e\u0301", sha256("e\u0301")],
      ["candidate\u0000value", sha256("candidate\u0000value")],
      ["candidate\u0085value", sha256("candidate\u0085value")],
      ["x".repeat(513), sha256("x".repeat(513))],
      [valid, "0".repeat(64)],
      [valid, null],
      [null, sha256(valid)],
    ] as Array<[unknown, unknown]>) {
      expect(proposedValuePairIsValid(value, digest)).toBe(false);
    }
    const candidate = deepClone(index);
    const firstDecision = asObjects(candidate.decisions, "decisions")[0]!;
    firstDecision.proposedValue = valid;
    firstDecision.proposedValueSha256 = sha256(valid);
    expect(evidenceIndexIsValid(candidate)).toBe(true);
    firstDecision.proposedValueSha256 = "0".repeat(64);
    expect(evidenceIndexIsValid(candidate)).toBe(false);
  });

  it("records Natalia's acyclic dependency order exactly", () => {
    expect(index.dependencyOrder).toEqual(expectedDependencyOrder);
    const position = new Map(expectedDependencyOrder.map((id, order) => [id, order]));
    expect(new Set(expectedDependencyOrder).size).toBe(14);
    for (const decision of decisions) {
      const decisionPosition = position.get(String(decision.id));
      expect(decisionPosition).toBeDefined();
      for (const dependency of asStrings(decision.dependsOnDecisionIds, "dependsOnDecisionIds")) {
        expect(position.has(dependency)).toBe(true);
        expect(position.get(dependency)).toBeLessThan(decisionPosition as number);
      }
    }
  });

  it("uses only candidate evidence enums and leaves every satisfaction flag false", () => {
    const allowedStates = new Set([
      "REPOSITORY_SUPPORTED_CANDIDATE",
      "PROPOSED_MATERIAL_CHOICE",
      "BLOCKED_EXTERNAL_CUSTODIAN",
      "BLOCKED_EXTERNAL_ACTION",
      "UNATTEMPTED_RUNTIME",
    ]);
    const allowedClasses = new Set([
      "repository_observation",
      "proposal",
      "external_fact",
      "runtime_result",
    ]);
    let satisfactionFlagCount = 0;
    const inspect = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(inspect);
        return;
      }
      if (value === null || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value as JsonObject)) {
        if (key === "satisfiesApprovalRequirement") {
          satisfactionFlagCount += 1;
          expect(child).toBe(false);
        }
        inspect(child);
      }
    };
    inspect(index);
    expect(satisfactionFlagCount).toBe(86);
    for (const decision of decisions) {
      expect(allowedStates.has(String(decision.proposalState))).toBe(true);
      for (const candidate of Object.values(asObject(decision.candidateEvidenceByRequirement))) {
        const value = asObject(candidate);
        expect(allowedStates.has(String(value.state))).toBe(true);
        expect(allowedClasses.has(String(value.evidenceClass))).toBe(true);
      }
      if (decision.proposedValue === null) {
        expect(decision.proposedValueSha256).toBeNull();
      } else {
        const proposedValue = String(decision.proposedValue);
        expect(proposedValue).toBe(proposedValue.trim());
        expect(proposedValue.length).toBeGreaterThan(0);
        expect(decision.proposedValueSha256).toBe(sha256(proposedValue));
      }
    }
  });

  it("contains no acceptance record or policy-approval fields", () => {
    const forbiddenKeys = [
      "approvedAtUtc",
      "approvedBy",
      "approvalReference",
      "approvedValue",
      "evidenceCommit",
      "decisionValueDigest",
      "evidenceByRequirement",
      "reviewedPacketHead",
    ];
    const keys = collectKeys(index);
    for (const forbiddenKey of forbiddenKeys) expect(keys).not.toContain(forbiddenKey);
    expect(JSON.stringify(index)).not.toContain('"status":"ACCEPTED"');
    expect(decisions.every((decision) => decision.satisfiesApprovalRequirement === false)).toBe(
      true,
    );
  });

  it("preserves zero runtime and the canonical auth-state counts", () => {
    const scope = asObject(index.scope);
    expect(scope).toMatchObject({
      credentialFree: true,
      repositoryOnly: true,
      candidateOnly: true,
      liveAuthImplementationAuthorized: false,
      externalActionsPerformed: false,
      satisfiesApprovalRequirement: false,
      runtimeEvidence: { conducted: 0, passed: 0, failed: 0, unattempted: 24 },
      preservedAuthStateContract: { states: 10, transitions: 50, syntheticScenarios: 28 },
    });
    expect(asObject(policy.scope)).toMatchObject({
      runtimeEvidence: { conducted: 0, passed: 0, failed: 0, unattempted: 24 },
      preservedAuthStateContract: { states: 10, transitions: 50, syntheticScenarios: 28 },
    });
  });

  it("binds every source reference to a tracked regular blob and its raw digest", () => {
    const references = collectSourceReferences(decisions);
    expect(references).toHaveLength(201);
    const uniqueReferences = [
      ...new Map(
        references.map((reference) => [
          `${reference.commit}:${reference.path}:${reference.sha256}`,
          reference,
        ]),
      ).values(),
    ];
    expect(uniqueReferences.length).toBeGreaterThan(10);
    for (const reference of uniqueReferences) {
      expect(sourceReferenceIsTrackedRegularBlob(reference, baseCommit, currentRepository)).toBe(
        true,
      );
    }
  });

  it("scans the bound native dependency manifests and rejects injected auth SDK references", () => {
    const manifests: Array<{
      decisionId: string;
      path: string;
      platform: NativeManifestPlatform;
    }> = [
      {
        decisionId: "AUTH-SDK-IOS",
        path: "apps/ios/Fluyo.xcodeproj/project.pbxproj",
        platform: "ios",
      },
      {
        decisionId: "AUTH-SDK-ANDROID",
        path: "apps/android/app/build.gradle.kts",
        platform: "android",
      },
    ];
    for (const manifest of manifests) {
      const decision = decisions.find((candidate) => candidate.id === manifest.decisionId);
      expect(decision).toBeDefined();
      for (const requirement of Object.values(asObject(decision?.candidateEvidenceByRequirement))) {
        expect(
          asObjects(asObject(requirement).sourceReferences, "sourceReferences").map(
            (reference) => reference.path,
          ),
        ).toContain(manifest.path);
      }
      const blob = gitBuffer("show", `${baseCommit}:${manifest.path}`).toString("utf8");
      expect(nativeAuthSdkReferences(blob, manifest.platform)).toEqual([]);
      if (manifest.platform === "android") {
        expect(nativeDependencyReferences(blob, manifest.platform).length).toBeGreaterThan(0);
      }
    }

    const iosManifest = gitBuffer(
      "show",
      `${baseCommit}:apps/ios/Fluyo.xcodeproj/project.pbxproj`,
    ).toString("utf8");
    const injectedIos = `${iosManifest}\nrepositoryURL = "https://github.com/supabase/supabase-swift";`;
    expect(nativeAuthSdkReferences(injectedIos, "ios")).toEqual([
      "https://github.com/supabase/supabase-swift",
    ]);

    const androidManifest = gitBuffer(
      "show",
      `${baseCommit}:apps/android/app/build.gradle.kts`,
    ).toString("utf8");
    const injectedAndroid = `${androidManifest}\nimplementation("io.github.jan-tennert.supabase:auth-kt:3.0.0")`;
    expect(nativeAuthSdkReferences(injectedAndroid, "android")).toEqual([
      "io.github.jan-tennert.supabase:auth-kt:3.0.0",
    ]);

    const variableAndroid = `${androidManifest}
val authSdk = "io.github.jan-tennert.supabase:auth-kt:3.0.0"
implementation(authSdk)`;
    expect(nativeAuthSdkReferences(variableAndroid, "android")).toEqual([
      "io.github.jan-tennert.supabase:auth-kt:3.0.0",
      "authSdk",
    ]);
    const aliasAndroid = `${androidManifest}\nimplementation(libs.supabase.auth)`;
    expect(nativeAuthSdkReferences(aliasAndroid, "android")).toEqual(["libs.supabase.auth"]);

    const frameworkIos = `${iosManifest}
AA0000000000000000000099 /* Supabase.xcframework in Frameworks */ = {isa = PBXBuildFile; fileRef = BB0000000000000000000099 /* Supabase.xcframework */; };`;
    expect(nativeAuthSdkReferences(frameworkIos, "ios")).toEqual(["Supabase.xcframework"]);

    const benignVariableAndroid = `${androidManifest}
val uiToolkit = "androidx.compose.ui:ui:1.0.0"
implementation(uiToolkit)`;
    expect(nativeAuthSdkReferences(benignVariableAndroid, "android")).toEqual([]);
    const benignAliasAndroid = `${androidManifest}\nimplementation(libs.androidx.compose.ui)`;
    expect(nativeAuthSdkReferences(benignAliasAndroid, "android")).toEqual([]);
    const benignFrameworkIos = `${iosManifest}
AA0000000000000000000098 /* Alamofire.xcframework in Frameworks */ = {isa = PBXBuildFile; fileRef = BB0000000000000000000098 /* Alamofire.xcframework */; };`;
    expect(nativeAuthSdkReferences(benignFrameworkIos, "ios")).toEqual([]);
  });

  it("rejects traversal, backslashes, git internals, symlinks, missing blobs, and hash drift", () => {
    const validReference = collectSourceReferences(decisions)[0];
    expect(validReference).toBeDefined();
    expect(
      sourceReferenceIsTrackedRegularBlob(
        validReference as SourceReference,
        baseCommit,
        currentRepository,
      ),
    ).toBe(true);
    for (const path of [
      "../package.json",
      "apps\\web\\package.json",
      ".git/config",
      "/package.json",
    ]) {
      expect(
        sourceReferenceIsTrackedRegularBlob(
          { ...(validReference as SourceReference), path },
          baseCommit,
          currentRepository,
        ),
      ).toBe(false);
    }
    expect(
      sourceReferenceIsTrackedRegularBlob(
        { ...(validReference as SourceReference), path: "missing-evidence-file" },
        baseCommit,
        currentRepository,
      ),
    ).toBe(false);
    expect(
      sourceReferenceIsTrackedRegularBlob(
        { ...(validReference as SourceReference), sha256: "0".repeat(64) },
        baseCommit,
        currentRepository,
      ),
    ).toBe(false);
    const symlinkRepository: EvidenceRepository = {
      lsTree: (_commit, path) => `120000 blob ${"a".repeat(40)}\t${path}`,
      blobAt: () => Buffer.from("target"),
    };
    expect(
      sourceReferenceIsTrackedRegularBlob(
        { commit: baseCommit, path: "link", sha256: sha256("target") },
        baseCommit,
        symlinkRepository,
      ),
    ).toBe(false);
  });

  it("has positive digest controls and fails mutated document bytes", () => {
    const documents = asObjects(index.documents, "documents");
    for (const document of documents) {
      const bytes = readFileSync(resolve(repositoryRoot, String(document.path)));
      expect(sha256(bytes)).toBe(document.sha256);
      expect(sha256(Buffer.concat([bytes, Buffer.from("mutation")]))).not.toBe(document.sha256);
    }
  });

  const unsupportedNativeAuthReadinessClaims = [
    "Native authentication is enabled.",
    "Native authentication works.",
    "Native authentication is deployed.",
    "Live auth is operational.",
    "Native auth has been enabled.",
    "Native authentication was working.",
    "Native authentication has been deployed.",
    "Live authentication became operational.",
    "Authentication runtime is running.",
    "Enabled native authentication.",
    "Native sign-in works.",
    "Native login is operational.",
    "The native sign-in flow is live.",
    "OAuth works on iOS.",
    "Mobile login is active.",
    "The identity flow is functioning.",
    "The sign-in experience works.",
    "Native authentication is now enabled.",
    "Native authentication is fully operational.",
    "Native authentication: enabled.",
    "The native authentication capability is deployed.",
    "Native authentication has successfully been deployed.",
    "Native authentication is not enabled, but works.",
    "Native authentication is not only enabled.",
    "No native authentication is not enabled.",
    "Native authentication does work.",
    "Native sign-in functions.",
    "Native login operates.",
    "OAuth succeeds on iOS.",
    "Mobile login is usable.",
    "Native auth is online.",
    "The native authentication flow passes its checks.",
    "Native auth is not enabled, but it does work.",
    "Native auth is not enabled though it is operational.",
    "We enable native authentication.",
    "We deploy native authentication.",
    "Native authentication can work.",
    "Native authentication should work.",
  ];

  it.each(unsupportedNativeAuthReadinessClaims)(
    "default-denies reviewed evidence prose mutation regardless of claim grammar: %s",
    (sample) => {
      const relativePath = "contracts/mobile/auth-readiness/v1/evidence/sdk-provenance.md";
      const original = readFileSync(resolve(repositoryRoot, relativePath), "utf8");
      const mutated = original.replace("No native auth runtime result exists.", sample);
      expect(mutated, sample).not.toBe(original);
      expect(evidencePacketContentReasons(relativePath, mutated), sample).not.toEqual([]);
    },
  );

  it("default-denies an unlisted evidence document path", () => {
    expect(
      evidencePacketContentReasons(
        "contracts/mobile/auth-readiness/v1/evidence/unreviewed.md",
        "Native authentication is not enabled.",
      ),
    ).toContain(
      "unreviewed evidence document: contracts/mobile/auth-readiness/v1/evidence/unreviewed.md",
    );
  });

  it("forbids normalized secrets, PII, credentials, and escalated positive claims", () => {
    expect(index.forbiddenContent).toEqual([
      "secrets_or_credentials",
      "personal_data_or_private_identifiers",
      "production_values",
      "signing_material",
      "external_account_or_dashboard_mutation_evidence_without_separate_authorization",
    ]);
    expect(index.packetClaimBoundary).toBe(
      "candidate_only_no_selection_approval_installation_configuration_runtime_verification_or_completion_claim",
    );
    const packetTexts: Array<[string, string]> = [
      [
        "contracts/mobile/auth-readiness/v1/evidence/index.json",
        readFileSync(resolve(evidenceDirectory, "index.json"), "utf8"),
      ],
      ...readdirSync(evidenceDirectory)
        .filter((name) => name.endsWith(".md"))
        .map((name): [string, string] => [
          `contracts/mobile/auth-readiness/v1/evidence/${name}`,
          readFileSync(resolve(evidenceDirectory, name), "utf8"),
        ]),
    ];
    expect(
      packetTexts.flatMap(([relativePath, packetText]) =>
        evidencePacketContentReasons(relativePath, packetText),
      ),
    ).toEqual([]);
    expect(policy.forbiddenClaims).toEqual(expectedPolicyForbiddenClaims);

    const positiveControls = [
      "-----BEGIN PRIVATE KEY-----",
      syntheticJwtFixture,
      "Bearer abcdefghijklmnopqrstuvwxyz",
      "Authorization: Basic dXNlcjpwYXNzd29yZA==",
      "Authorization: Bearer abcdefghijklmnopqrstuvwxyz",
      "Cookie: session=abcdefghijklmnop",
      "Set-Cookie: session=abcdefghijklmnop",
      "service_role=abcdefghijklmnop",
      "service_role_key=abcdefghijklmnop",
      syntheticAssignedCredential("anon", "key"),
      syntheticAssignedCredential("api", "key"),
      "client_secret=abcdefghijklmnop",
      "access-token: abcdefghijklmnop",
      "refresh_token=abcdefghijklmnop",
      "id.token=abcdefghijklmnop",
      "auth code: abcdefghijklmnop",
      "password=abcdefghijklmnop",
      "OTP: 123456",
      "recovery-key=abcdefghijklmnop",
      syntheticAssignedCredential("signing", "key"),
      "person@example.com",
      "+1 415 555 0100",
      "device_id=ABCDEF123456",
      "private-id: ABCDEF123456",
      "account_id=ABCDEF123456",
      "private_account_id=ABCDEF123456",
      "10.1.2.3",
      "https://user:password@example.com/path",
      "Native authentication is implemented.",
      "Native authentication is enabled.",
      "Native authentication works.",
      "Native authentication is deployed.",
      "Live auth is operational.",
      "Native auth has been enabled.",
      "Native authentication was working.",
      "Native authentication has been deployed.",
      "Live authentication became operational.",
      "Authentication runtime is running.",
      "Enabled native authentication.",
      "The SDK is selected and approved.",
      "The SDK is approved, but not installed.",
      "The SDK is not only approved.",
      "No SDK is not approved.",
      "The SDK is not approved and the SDK is installed.",
      "The SDK is not approved, but is installed.",
      "No SDK is approved, but is installed.",
      "Keychain persistence is verified.",
      "Production release is ready.",
      "Increment five is complete.",
    ];
    for (const positiveControl of positiveControls) {
      expect(unsafeContentReasons(positiveControl), positiveControl).not.toEqual([]);
    }
    for (const negativeControl of [
      "No SDK is selected or approved.",
      "No SDK is approved; no SDK is installed.",
      "The SDK is not selected.",
      "SDK installation remains unattempted.",
      "Native authentication is not implemented.",
      "Native authentication is not enabled.",
      "Native auth is not operational.",
      "Keychain persistence is not verified.",
      "Production use is not approved.",
      "Increment five remains blocked and incomplete.",
      "The SDK remains blocked, but native authentication remains unattempted.",
    ]) {
      expect(unsafeContentReasons(negativeControl), negativeControl).toEqual([]);
    }
  });

  it.each([
    ["PEM", "-----BEGIN PRIVATE KEY-----"],
    ["JWT", syntheticJwtFixture],
    ["Authorization Basic", "Authorization: Basic dXNlcjpwYXNzd29yZA=="],
    ["Authorization Bearer", "Authorization: Bearer abcdefghijklmnopqrstuvwxyz"],
    ["Set-Cookie", "Set-Cookie: session=abcdefghijklmnop"],
    ["service role", "service_role=abcdefghijklmnop"],
    ["service role key", "service_role_key=abcdefghijklmnop"],
    ["anonymous key", syntheticAssignedCredential("anon", "key")],
    ["API key", syntheticAssignedCredential("api", "key")],
    ["client secret", "client_secret=abcdefghijklmnop"],
    ["access token", "access_token=abcdefghijklmnop"],
    ["refresh token", "refresh_token=abcdefghijklmnop"],
    ["ID token", "id_token=abcdefghijklmnop"],
    ["authorization code", "auth_code=abcdefghijklmnop"],
    ["password", "password=abcdefghijklmnop"],
    ["OTP", "OTP: 123456"],
    ["recovery key", "recovery_key=abcdefghijklmnop"],
    ["signing key", syntheticAssignedCredential("signing", "key")],
    ["email", "person@example.com"],
    ["phone", "+1 415 555 0100"],
    ["account ID", "account_id=ABCDEF123456"],
    ["private account ID", "private_account_id=ABCDEF123456"],
    ["private IP", "10.1.2.3"],
    ["credential-bearing URL", "https://user:password@example.com/path"],
    ["coordinated positive claim", "The SDK is approved, but not installed."],
  ])("rejects SEC-5 bypass: %s", (_label, sample) => {
    expect(unsafeContentReasons(sample), sample).not.toEqual([]);
  });

  it.each(unsupportedNativeAuthReadinessClaims)(
    "rejects native-auth positive-claim diagnostic: %s",
    (sample) => {
      expect(unsafeContentReasons(sample), sample).not.toEqual([]);
    },
  );

  it.each([
    "Native authentication is not enabled.",
    "Native auth is not operational.",
    "Native auth is not, under any circumstances, operational.",
    "Native auth has never worked.",
    "Native auth does not work.",
    "Native authentication is absolutely not enabled.",
    "Native login remains entirely unattempted.",
    "No native authentication is enabled.",
    "Native authentication remains unavailable.",
    "Native login is not currently operational.",
    "The native sign-in flow remains unattempted.",
    "OAuth is not enabled on iOS.",
    "Mobile login remains blocked.",
    "The identity flow is not functioning.",
    "The sign-in experience has not been implemented.",
    "Native auth doesn't work.",
    "Native auth is by no means operational.",
    "Native auth is neither enabled nor operational.",
    "Neither native auth nor mobile login is operational.",
    "Native authentication cannot be operational.",
    "Native authentication can't be operational.",
  ])("accepts explicit native-auth negative boundary: %s", (sample) => {
    expect(unsafeContentReasons(sample), sample).toEqual([]);
  });

  it("limits callback claims to native scope and records the ten unattempted accessibility closeouts", () => {
    const linkEvidence = readFileSync(resolve(evidenceDirectory, "link-and-custody.md"), "utf8");
    expect(linkEvidence).toContain(
      "No native callback domain or native redirect entry is selected, configured, or authorized by this packet; existing web callback and redirect configuration is out of scope and unchanged.",
    );
    expect(linkEvidence).not.toContain("No callback domain is configured.");
    expect(linkEvidence).not.toContain("No redirect entry is configured.");
    expect(linkEvidence).toContain(
      "No native AASA or assetlinks file is committed or authorized by this packet; any external association-file state is out of scope and unasserted.",
    );
    expect(linkEvidence).not.toContain("No AASA file is configured.");
    expect(linkEvidence).not.toContain("No assetlinks file is configured.");

    const productEvidence = readFileSync(
      resolve(evidenceDirectory, "product-session-policy.md"),
      "utf8",
    );
    expect(productEvidence).toContain("## Candidate-only objective accessibility closeout matrix");
    expect(productEvidence).toContain(
      "It supplies no visible product copy, runtime result, accessibility support claim, or approval.",
    );
    const matrixRows = accessibilityMatrixRows(productEvidence);
    expect(matrixRows).not.toBeNull();
    const matrixKeys = (matrixRows ?? []).map((cells) => `${cells[0]}|${cells[1]}`);
    expect(matrixKeys).toEqual(expectedAccessibilityMatrixKeys);
    expect(new Set(matrixKeys).size).toBe(10);
    expect(accessibilityMatrixIsValid(productEvidence)).toBe(true);
  });

  it("rejects malformed accessibility matrix identities, platforms, multiplicity, and order", () => {
    const productEvidence = readFileSync(
      resolve(evidenceDirectory, "product-session-policy.md"),
      "utf8",
    );
    const validRows = accessibilityMatrixRows(productEvidence);
    expect(validRows).not.toBeNull();
    const cloneRows = (): string[][] => (validRows ?? []).map((cells) => [...cells]);

    const duplicate = cloneRows();
    duplicate[1] = [...(duplicate[0] as string[])];
    const missing = cloneRows().slice(0, -1);
    const reordered = cloneRows();
    [reordered[0], reordered[1]] = [reordered[1] as string[], reordered[0] as string[]];
    const crossTagged = cloneRows();
    crossTagged[0]![0] = "`AUTH-METHODS` / `AUTH-SIGNOUT-SCOPE`";
    const invalidPlatform = cloneRows();
    invalidPlatform[0]![1] = "iPadOS";
    const allIdsInOneCell = cloneRows();
    allIdsInOneCell[0]![0] = affectedProductFlowDecisionIds
      .map((decisionId) => `\`${decisionId}\``)
      .join(" ");

    for (const [label, rows] of [
      ["duplicate", duplicate],
      ["missing", missing],
      ["reordered", reordered],
      ["cross-tagged", crossTagged],
      ["invalid platform", invalidPlatform],
      ["all IDs in one cell", allIdsInOneCell],
    ] as Array<[string, string[][]]>) {
      expect(
        accessibilityMatrixIsValid(replaceAccessibilityMatrixRows(productEvidence, rows)),
        label,
      ).toBe(false);
    }
  });

  it("documents the closed chronology and two still-blocked governance alternatives", () => {
    const governance = asObject(index.approvalGovernanceDecision);
    expect(governance).toEqual({
      state: "BLOCKED_MARLON_SELECTION_REQUIRED",
      alternatives: [
        "A_PRESERVE_SPECIAL_MERGE_COMMIT_P_TO_A_TO_V",
        "B_APPEND_ONLY_CONTENT_ADDRESSED_SQUASH_COMPATIBLE_RECORD",
      ],
      currentValidationCutoffUtc: "2026-10-23T08:59:12Z",
      currentCutoffClosed: true,
      futureReviewedPacketRequiresFreshNonBackdatedChronology: true,
      selectedAlternative: null,
      satisfiesApprovalRequirement: false,
    });
    const productPolicy = readFileSync(
      resolve(evidenceDirectory, "product-session-policy.md"),
      "utf8",
    );
    expect(productPolicy).toContain(
      "Alternative A — preserve a special merge-commit P → A → V flow",
    );
    expect(productPolicy).toContain(
      "Alternative B — adopt an append-only content-addressed squash-compatible approval record",
    );
    expect(productPolicy).toContain("The validation cutoff `2026-10-23T08:59:12Z` is closed.");
    expect(productPolicy).toContain(
      "future reviewed packet `P` requires fresh, non-backdated chronology",
    );
    expect(productPolicy).toContain("Acceptance remains blocked until Marlon chooses one");
  });

  it("keeps the README, decision register, and handoff on candidate-only boundaries", () => {
    for (const document of [readme, register, handoff]) {
      expect(document).toContain("candidate-only");
      expect(document).toContain("0 conducted, 0 passed, 0 failed, and 24 unattempted");
      expect(document).toContain("Marlon");
      expect(document).toContain("Elana");
      expect(document).toContain("satisfies no approval requirement");
    }
    expect(readme).toContain("evidence/index.json");
    expect(readme).toContain("Camila reviews UX and accessibility semantics");
    expect(readme).toContain("Daniela reviews visual, mobile, and motion");
    expect(readme).not.toContain("Danila reviews UX and accessibility semantics");
    expect(register).toContain(
      "The immutable decision-policy bytes retain Isabella, Danila, Fernanda, and Elana as legacy packet-policy role names; those bytes are historical context and do not assign current evidence-slice ownership.",
    );
    expect(register).not.toContain(
      "Isabella, Danila, Fernanda, and Elana retain their product, UX, privacy, and independent-QA roles",
    );
    expect(register).toContain("approval-governance alternative A or B");
    expect(handoff).toContain(
      "PR #45 then merged the credential-free [live-auth readiness packet](../contracts/mobile/auth-readiness/v1/README.md) as `7ac566231a2e26fc1043aab40d33a24964127355`.",
    );
    expect(handoff).toContain(
      "PR #46 merged the squash-ancestry repair as `c97fffbb48d5c35e38a103a4b68e1a4cbaaf69ee`, and post-main protected run `39941301847` passed 8/8 jobs.",
    );
    expect(handoff).toContain(
      "The current branch slice is the candidate-only [pre-approval evidence packet](../contracts/mobile/auth-readiness/v1/evidence/index.json) bound to `c97fffbb48d5c35e38a103a4b68e1a4cbaaf69ee`.",
    );
    expect(handoff).not.toContain(
      "The next independent slice is the credential-free [live-auth readiness packet]",
    );
    expect(handoff).toContain("Valentina is the primary implementation owner");
    expect(handoff).toContain("Adriana implements directly only for a small urgent repair");
  });
});
