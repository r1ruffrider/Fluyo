import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;

const contractDirectory = resolve(__dirname, "../../../contracts/mobile/auth-readiness/v1");
const authStateDirectory = resolve(__dirname, "../../../contracts/mobile/auth-state/v1");
const docsDirectory = resolve(__dirname, "../../../docs");
const repositoryRoot = resolve(__dirname, "../../..");
const policyRelativePath = "contracts/mobile/auth-readiness/v1/decision-policy.json";
const ciWorkflow = readFileSync(resolve(repositoryRoot, ".github/workflows/ci.yml"), "utf8");
const policyText = readFileSync(resolve(contractDirectory, "decision-policy.json"), "utf8");
const policy = JSON.parse(policyText) as JsonObject;
const readme = readFileSync(resolve(contractDirectory, "README.md"), "utf8");
const authAcceptance = JSON.parse(
  readFileSync(resolve(authStateDirectory, "acceptance.json"), "utf8"),
) as JsonObject;

const asObject = (value: unknown, label = "value"): JsonObject => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " must be an object");
  }
  return value as JsonObject;
};

const asObjects = (value: unknown, label: string): JsonObject[] => {
  if (!Array.isArray(value)) throw new Error(label + " must be an array");
  return value.map((entry, index) => asObject(entry, label + "[" + index + "]"));
};

const asStrings = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(label + " must be an array of strings");
  }
  return value;
};

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

const git = (...args: string[]): string =>
  execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();

const checkoutHead = git("rev-parse", "HEAD");
const runnerValidationHead = process.env.FLUYO_PACKET_VALIDATION_HEAD ?? checkoutHead;
const authoritativeReviewedPacketHead = git("rev-parse", `${runnerValidationHead}^`);
const priorPacketHead = git("rev-parse", `${authoritativeReviewedPacketHead}^`);
const directParentByCommit = new Map<string, string>([
  [runnerValidationHead, authoritativeReviewedPacketHead],
  [authoritativeReviewedPacketHead, priorPacketHead],
]);
const commitExistence = new Map<string, boolean>();
const gitObjectExistence = new Map<string, boolean>();

const gitFileAtCommit = (sha: string, path: string): string =>
  execFileSync("git", ["show", `${sha}:${path}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

const reviewedPolicyText = gitFileAtCommit(authoritativeReviewedPacketHead, policyRelativePath);

const directParentOf = (sha: string): string => {
  const cached = directParentByCommit.get(sha);
  if (cached) return cached;
  const parent = git("rev-parse", `${sha}^`);
  directParentByCommit.set(sha, parent);
  return parent;
};

const commitExists = (sha: string): boolean => {
  const cached = commitExistence.get(sha);
  if (cached !== undefined) return cached;
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
    commitExistence.set(sha, true);
    return true;
  } catch {
    commitExistence.set(sha, false);
    return false;
  }
};

const gitObjectExists = (object: string): boolean => {
  const cached = gitObjectExistence.get(object);
  if (cached !== undefined) return cached;
  try {
    execFileSync("git", ["cat-file", "-e", object], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
    gitObjectExistence.set(object, true);
    return true;
  } catch {
    gitObjectExistence.set(object, false);
    return false;
  }
};

const repositoryEvidenceExists = (
  reference: unknown,
  evidenceCommit: unknown,
  referencePattern: RegExp,
): boolean => {
  if (typeof reference !== "string" || typeof evidenceCommit !== "string") return false;
  const match = referencePattern.exec(reference);
  if (!match) return false;
  const [, sha, path] = match;
  if (!sha || !path) return false;
  if (sha !== evidenceCommit || path.startsWith("/") || path.split("/").includes("..")) {
    return false;
  }
  return gitObjectExists(`${sha}:${path}`);
};

const approvalFieldsAreComplete = (
  decisionValue: JsonObject,
  runnerSuppliedReviewedPacketHead: string,
  packetPolicy: JsonObject,
): boolean => {
  if (decisionValue.status !== "ACCEPTED") return false;
  const approval = asObject(decisionValue.approval, "approval");
  const approvers = asStrings(decisionValue.approvers, "approvers");
  const requiredEvidence = asStrings(decisionValue.requiredEvidence, "requiredEvidence");
  const evidenceByRequirement = asObject(approval.evidenceByRequirement, "evidenceByRequirement");
  const timestamp = approval.approvedAtUtc;
  const acceptancePolicy = asObject(packetPolicy.approvalPolicy);
  const approvalNotBefore = String(acceptancePolicy.approvalNotBeforeUtc);
  const validationClock = String(acceptancePolicy.validationClockUtc);
  const evidencePattern = new RegExp(String(acceptancePolicy.evidenceReferencePattern));
  const evidenceArtifactPattern = new RegExp(
    String(acceptancePolicy.evidenceArtifactReferencePattern),
  );
  const timestampIsReal =
    typeof timestamp === "string" &&
    new RegExp(String(acceptancePolicy.approvedAtUtcPattern)).test(timestamp) &&
    !Number.isNaN(Date.parse(timestamp)) &&
    new Date(timestamp).toISOString().replace(".000Z", "Z") === timestamp &&
    Date.parse(timestamp) >= Date.parse(approvalNotBefore) &&
    Date.parse(timestamp) <= Date.parse(validationClock);
  const evidenceKeys = Object.keys(evidenceByRequirement).sort();
  const packetDecision = asObjects(packetPolicy.decisions, "packet decisions").find(
    (entry) => entry.id === decisionValue.id,
  );
  return (
    /^[0-9a-f]{40}$/.test(runnerSuppliedReviewedPacketHead) &&
    commitExists(runnerSuppliedReviewedPacketHead) &&
    packetPolicy.reviewedPacketHead === runnerSuppliedReviewedPacketHead &&
    runnerSuppliedReviewedPacketHead !== packetPolicy.sourceMainCommit &&
    packetDecision !== undefined &&
    JSON.stringify(packetDecision) === JSON.stringify(decisionValue) &&
    timestampIsReal &&
    typeof approval.approvedBy === "string" &&
    approvers.includes(approval.approvedBy) &&
    typeof approval.approvalReference === "string" &&
    evidencePattern.test(approval.approvalReference) &&
    typeof approval.approvedValue === "string" &&
    approval.approvedValue.trim().length > 0 &&
    approval.approvedValue === approval.approvedValue.trim() &&
    typeof approval.evidenceCommit === "string" &&
    approval.evidenceCommit === packetPolicy.reviewedPacketHead &&
    /^[0-9a-f]{40}$/.test(approval.evidenceCommit) &&
    typeof approval.decisionValueDigest === "string" &&
    approval.decisionValueDigest === sha256(approval.approvedValue) &&
    JSON.stringify(evidenceKeys) === JSON.stringify([...requiredEvidence].sort()) &&
    evidenceKeys.every((key) =>
      repositoryEvidenceExists(
        evidenceByRequirement[key],
        approval.evidenceCommit,
        evidenceArtifactPattern,
      ),
    )
  );
};

const approvalIsCompleteForTrustedState = (
  decisionValue: JsonObject,
  packetPolicy: JsonObject,
  currentPacketText: string,
  reviewedPacketText: string,
  validationHead: string,
  checkedOutHead: string,
  reviewedPacketHead: string,
): boolean =>
  validationHead === checkedOutHead &&
  commitExists(validationHead) &&
  commitExists(reviewedPacketHead) &&
  directParentOf(validationHead) === reviewedPacketHead &&
  currentPacketText === reviewedPacketText &&
  approvalFieldsAreComplete(decisionValue, reviewedPacketHead, packetPolicy);

const approvalIsComplete = (decisionValue: JsonObject): boolean =>
  approvalIsCompleteForTrustedState(
    decisionValue,
    policy,
    policyText,
    reviewedPolicyText,
    runnerValidationHead,
    checkoutHead,
    authoritativeReviewedPacketHead,
  );

const decisions = asObjects(policy.decisions, "decisions");

describe("native live-auth readiness decision packet v1", () => {
  it("is bound to merged main and authorizes no implementation or external action", () => {
    expect(policy).toMatchObject({
      schemaVersion: "1.0.0",
      status: "repository_decision_packet",
      sourceMainCommit: "c6db1e3ded889eac5851eda7cc6d0891bf6d456a",
      recordedDate: "2026-10-23",
      reviewedPacketHead: null,
    });
    expect(asObject(policy.scope)).toEqual({
      credentialFree: true,
      repositoryOnly: true,
      liveAuthImplementationAuthorized: false,
      completionClaimAllowed: false,
      productionDataUsed: false,
      externalActionsPerformed: false,
      runtimeEvidence: { conducted: 0, passed: 0, failed: 0, unattempted: 24 },
      preservedAuthStateContract: { states: 10, transitions: 50, syntheticScenarios: 28 },
    });
  });

  it("records the complete stable decision inventory with no accepted row", () => {
    expect(decisions.map((decision) => decision.id)).toEqual([
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
    ]);
    expect(new Set(decisions.map((decision) => decision.id)).size).toBe(14);
    expect(
      decisions.every((decision) => ["PROPOSED", "BLOCKED"].includes(String(decision.status))),
    ).toBe(true);
    expect(decisions.filter((decision) => decision.status === "ACCEPTED")).toEqual([]);
  });

  it("requires owners reviewers evidence fallbacks rechecks and explicit claim boundaries", () => {
    for (const decision of decisions) {
      expect(decision.accountableOwner).toBe("Marlon");
      expect(decision.responsibleAfterApproval).toBe("Adriana");
      expect(asStrings(decision.approvers, "approvers")).toEqual(["Marlon"]);
      expect(asStrings(decision.reviewers, "reviewers").length).toBeGreaterThan(0);
      expect(asStrings(decision.requiredEvidence, "requiredEvidence").length).toBeGreaterThan(0);
      expect(typeof decision.question).toBe("string");
      expect(typeof decision.fallback).toBe("string");
      expect(typeof decision.recheckTrigger).toBe("string");
      expect(typeof decision.claimBoundary).toBe("string");
      expect(decision.externalActionAuthorized).toBe(false);
    }
  });

  it("prevents acceptance without authorized complete current evidence", () => {
    const acceptancePolicy = asObject(policy.approvalPolicy);
    expect(asStrings(acceptancePolicy.acceptanceRequires, "acceptanceRequires")).toEqual([
      "approvedAtUtc",
      "approvedBy",
      "approvalReference",
      "approvedValue",
      "evidenceCommit",
      "decisionValueDigest",
      "evidenceByRequirement",
    ]);
    expect(acceptancePolicy.approvedAtUtcPattern).toBe(
      "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$",
    );
    expect(acceptancePolicy.approvalNotBeforeUtc).toBe("2026-10-23T08:51:30Z");
    expect(acceptancePolicy.approvalNotBeforeSourceCommit).toBe(
      "36875cfd33bee2b81e29b434de791198d854e885",
    );
    expect(acceptancePolicy.validationClockUtc).toBe("2026-10-23T08:59:12Z");
    expect(acceptancePolicy.rule).toBe("ci_or_merge_never_substitutes_for_dated_material_approval");
    expect(acceptancePolicy.reviewedPacketHeadSource).toBe(
      "direct_parent_of_runner_validation_head_with_git_commit_verification",
    );
    expect(acceptancePolicy.reviewedPolicyRule).toBe(
      "accepted_policy_bytes_must_equal_the_git_blob_at_the_reviewed_direct_parent",
    );
    expect(acceptancePolicy.evidenceArtifactRule).toBe(
      "every_required_evidence_reference_must_name_an_existing_repository_path_at_the_evidence_commit",
    );
    expect(acceptancePolicy.evidenceArtifactReferencePattern).toBe(
      "^git:([0-9a-f]{40}):([A-Za-z0-9._/-]+)$",
    );
    expect(runnerValidationHead).toBe(checkoutHead);
    expect(commitExists(runnerValidationHead)).toBe(true);
    expect(commitExists(authoritativeReviewedPacketHead)).toBe(true);
    expect(commitExists(priorPacketHead)).toBe(true);
    expect(git("rev-parse", `${runnerValidationHead}^`)).toBe(authoritativeReviewedPacketHead);
    expect(authoritativeReviewedPacketHead).not.toBe(priorPacketHead);
    expect(ciWorkflow).toContain(
      "FLUYO_PACKET_VALIDATION_HEAD: ${{ github.event.pull_request.head.sha || github.sha }}",
    );
    expect(ciWorkflow).toContain(
      "ref: ${{ github.event.pull_request.head.sha || github.sha }}\n          fetch-depth: 3",
    );

    const actualAcceptedRows = decisions.filter((decision) => decision.status === "ACCEPTED");
    if (actualAcceptedRows.length > 0) {
      expect(policyText).toBe(reviewedPolicyText);
    }
    for (const decision of decisions) {
      expect(approvalIsComplete(decision)).toBe(false);

      const required = asStrings(decision.requiredEvidence, "requiredEvidence");
      const firstRequired = required[0];
      if (!firstRequired) throw new Error("required evidence must not be empty");
      const approvedValue = "bounded_exact_value";
      const reviewedPacketHead = authoritativeReviewedPacketHead;
      const evidenceReference = `git:${reviewedPacketHead}:contracts/mobile/auth-readiness/v1/README.md`;
      const completeApproval = {
        approvedAtUtc: "2026-10-23T08:55:00Z",
        approvedBy: "Marlon",
        approvalReference: "ticket:direct_user_approval_2026-10-23",
        approvedValue,
        evidenceCommit: reviewedPacketHead,
        decisionValueDigest: sha256(approvedValue),
        evidenceByRequirement: Object.fromEntries(
          required.map((item) => [item, evidenceReference]),
        ),
      };
      const accepted = { ...decision, status: "ACCEPTED", approval: completeApproval };
      const acceptedPolicy = {
        ...policy,
        reviewedPacketHead,
        decisions: decisions.map((entry) => (entry.id === decision.id ? accepted : entry)),
      };
      const validateFields = (value: JsonObject): boolean =>
        approvalFieldsAreComplete(value, reviewedPacketHead, {
          ...acceptedPolicy,
          decisions: decisions.map((entry) => (entry.id === decision.id ? value : entry)),
        });
      const acceptedPolicyText = JSON.stringify(acceptedPolicy);

      expect(validateFields(accepted)).toBe(true);
      expect(approvalIsComplete(accepted)).toBe(false);
      expect(
        approvalIsCompleteForTrustedState(
          accepted,
          acceptedPolicy,
          acceptedPolicyText,
          reviewedPolicyText,
          runnerValidationHead,
          checkoutHead,
          reviewedPacketHead,
        ),
      ).toBe(false);
      expect(
        approvalIsCompleteForTrustedState(
          accepted,
          acceptedPolicy,
          acceptedPolicyText,
          acceptedPolicyText,
          runnerValidationHead,
          checkoutHead,
          reviewedPacketHead,
        ),
      ).toBe(true);
      expect(
        approvalIsCompleteForTrustedState(
          accepted,
          acceptedPolicy,
          acceptedPolicyText,
          acceptedPolicyText,
          "a".repeat(40),
          "a".repeat(40),
          reviewedPacketHead,
        ),
      ).toBe(false);
      expect(
        approvalIsCompleteForTrustedState(
          accepted,
          acceptedPolicy,
          acceptedPolicyText,
          acceptedPolicyText,
          runnerValidationHead,
          checkoutHead,
          priorPacketHead,
        ),
      ).toBe(false);
      expect(
        approvalIsCompleteForTrustedState(
          accepted,
          acceptedPolicy,
          acceptedPolicyText,
          acceptedPolicyText,
          runnerValidationHead,
          checkoutHead,
          runnerValidationHead,
        ),
      ).toBe(false);
      expect(validateFields(decision)).toBe(false);
      expect(validateFields({ ...decision, status: "ACCEPTED" })).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: { ...completeApproval, approvedBy: "Unauthorized Reviewer" },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: { ...completeApproval, approvalReference: "informal approval" },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: { ...completeApproval, approvedValue: "", decisionValueDigest: sha256("") },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: { ...completeApproval, approvedValue: " ", decisionValueDigest: sha256(" ") },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: {
            ...completeApproval,
            approvedValue: " bounded_exact_value ",
            decisionValueDigest: sha256(" bounded_exact_value "),
          },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: { ...completeApproval, approvedAtUtc: "2026-13-40T25:61:61Z" },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: { ...completeApproval, approvedAtUtc: "2026-10-23T08:51:29Z" },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: { ...completeApproval, approvedAtUtc: "2026-10-23T08:59:13Z" },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: { ...completeApproval, approvedAtUtc: "2026-10-23T08:51:30Z" },
        }),
      ).toBe(true);
      expect(
        validateFields({
          ...accepted,
          approval: { ...completeApproval, approvedAtUtc: "2026-10-23T08:51:31Z" },
        }),
      ).toBe(true);
      expect(
        validateFields({
          ...accepted,
          approval: { ...completeApproval, approvedAtUtc: "2026-10-23T08:59:12Z" },
        }),
      ).toBe(true);
      expect(
        validateFields({
          ...accepted,
          approval: { ...completeApproval, decisionValueDigest: "0".repeat(64) },
        }),
      ).toBe(false);

      const missingEvidence = { ...completeApproval.evidenceByRequirement };
      delete missingEvidence[firstRequired];
      expect(
        validateFields({
          ...accepted,
          approval: { ...completeApproval, evidenceByRequirement: missingEvidence },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: {
            ...completeApproval,
            evidenceByRequirement: {
              ...completeApproval.evidenceByRequirement,
              extra: evidenceReference,
            },
          },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: {
            ...completeApproval,
            evidenceByRequirement: {
              ...completeApproval.evidenceByRequirement,
              [firstRequired]: "",
            },
          },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: {
            ...completeApproval,
            evidenceByRequirement: {
              ...completeApproval.evidenceByRequirement,
              [firstRequired]: `report:${firstRequired}`,
            },
          },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: {
            ...completeApproval,
            evidenceByRequirement: {
              ...completeApproval.evidenceByRequirement,
              [firstRequired]: `git:${reviewedPacketHead}:contracts/mobile/auth-readiness/v1/missing.md`,
            },
          },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: {
            ...completeApproval,
            evidenceByRequirement: {
              ...completeApproval.evidenceByRequirement,
              [firstRequired]: `git:${priorPacketHead}:contracts/mobile/auth-readiness/v1/README.md`,
            },
          },
        }),
      ).toBe(false);
    }
  });

  it("locks deep-link UX reviewers and product-facing accessibility evidence", () => {
    const byId = new Map(decisions.map((decision) => [String(decision.id), decision]));
    for (const id of [
      "AUTH-CALLBACK-DOMAINS",
      "AUTH-AASA",
      "AUTH-ASSETLINKS",
      "AUTH-SUPABASE-ALLOWLIST",
    ]) {
      expect(asStrings(byId.get(id)?.reviewers, id + " reviewers")).toContain("Danila");
    }
    for (const id of [
      "AUTH-METHODS",
      "AUTH-SIGNOUT-SCOPE",
      "AUTH-RECOVERY-DELIVERY",
      "AUTH-REVOCATION",
      "AUTH-ACCOUNT-DELETION",
    ]) {
      const evidence = asStrings(byId.get(id)?.requiredEvidence, id + " evidence");
      expect(evidence.some((item) => item.includes("copy") && item.includes("action"))).toBe(true);
      expect(evidence).toContain("focus_one_time_announcement_screen_reader_order");
      expect(evidence).toContain("two_hundred_percent_text_target_reachability_and_reduced_motion");
    }
    const deletionEvidence = asStrings(
      byId.get("AUTH-ACCOUNT-DELETION")?.requiredEvidence,
      "deletion evidence",
    );
    expect(deletionEvidence).toEqual(
      expect.arrayContaining([
        "recent_reauthentication_before_destructive_confirmation",
        "clear_irreversible_consequence_copy_primary_delete_action_and_non_destructive_cancel",
        "idempotent_progress_partial_failure_and_recovery_states",
      ]),
    );
  });

  it("keeps Android logging and every external custodian prerequisite explicit", () => {
    const byId = new Map(decisions.map((decision) => [String(decision.id), decision]));
    expect(asStrings(byId.get("AUTH-SDK-ANDROID")?.requiredEvidence, "android evidence")).toContain(
      "reviewed_release_contains_credential_logging_fix",
    );
    expect(asStrings(byId.get("AUTH-SDK-ANDROID")?.requiredEvidence, "android evidence")).toContain(
      "fluyo_logger_retains_no_sdk_message_or_throwable",
    );
    for (const id of [
      "AUTH-CALLBACK-DOMAINS",
      "AUTH-AASA",
      "AUTH-ASSETLINKS",
      "AUTH-SUPABASE-ALLOWLIST",
      "AUTH-NONPROD-CUSTODY",
      "AUTH-RECOVERY-DELIVERY",
      "AUTH-ACCOUNT-DELETION",
    ]) {
      expect(byId.get(id)?.status).toBe("BLOCKED");
      expect(String(byId.get(id)?.requiredCustodian)).toMatch(/^unassigned_/);
    }
  });

  it("preserves zero runtime and all twenty-four native rows as unattempted", () => {
    expect(authAcceptance.runtimeExecutions).toBe(0);
    const matrix = asObject(authAcceptance.mirroredNativeRuntimeMatrix, "matrix");
    const rows = asObjects(matrix.rows, "matrix rows");
    expect(rows).toHaveLength(24);
    expect(rows.every((row) => row.status === "unattempted")).toBe(true);
    expect(new Set(rows.map((row) => row.id)).size).toBe(24);
    expect(readme).toContain("Runtime executions remain 0");
    expect(readme).toContain("24 native evidence rows remain unattempted");
  });

  it("retains the immediate escalation and no-twelve-hour-idle SOP in both governance files", () => {
    for (const name of ["DEVELOPMENT_HANDOFF.md", "TEST_ACCOUNT_GOVERNANCE.md"]) {
      const text = readFileSync(resolve(docsDirectory, name), "utf8").replace(/\s+/g, " ");
      expect(text).toContain("notifies Marlon immediately through the Codex app");
      expect(text).toContain(
        "exact requested action, the reason, the affected pull request or phase, and the safe work already completed",
      );
      expect(text).toContain("All independent authorized workstreams continue");
      expect(text).toContain(
        "reconciles the complete current agent roster, including newly added agents",
      );
      expect(text).toContain(
        "assigns every relevant specialist a bounded responsibility, evidence requirement, and handoff",
      );
      expect(text).toContain(
        "A newly available specialist is not omitted because an earlier plan predates that role",
      );
      expect(text).toContain("Adriana remains the orchestration and merge owner");
      expect(text).toContain("does not invent an assignment");
      expect(text).toContain("Elana PASS on the current exact head is the execution trigger");
      expect(text).toContain(
        "immediately reconciles every remaining protected, specialist, and platform gate plus GitHub mergeability",
      );
      expect(text).toContain(
        "marks the pull request ready, merges under the standing authorization",
      );
      expect(text).toContain(
        "starts the next authorized phase, pull request, or build-plan step without waiting for another user instruction",
      );
      expect(text).toContain("repairs it and obtains a fresh Elana exact-head PASS");
      expect(text).toContain(
        "reconcile every authorized completed-PR handoff and next-phase start immediately",
      );
      expect(text).toContain(
        "A 12-hour idle period is a hard process breach, not a permitted wait",
      );
      expect(text).toContain(
        "App or email notification is escalation only and never substitutes for required approval",
      );
      expect(text).toContain(
        "Elana remains the sole independent exact-head QA and code-review gate",
      );
    }
  });

  it("keeps the contract bundle limited to the decision policy and README", () => {
    expect(readdirSync(contractDirectory).sort()).toEqual(["README.md", "decision-policy.json"]);
  });
});
