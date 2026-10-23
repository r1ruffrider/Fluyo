import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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

type GitRepository = {
  root: string;
  git: (...args: string[]) => string;
  fileAtCommit: (sha: string, path: string) => string;
  directParentOf: (sha: string) => string;
  commitExists: (sha: string) => boolean;
  objectExists: (object: string) => boolean;
};

const makeGitRepository = (root: string): GitRepository => {
  const directParents = new Map<string, string>();
  const commits = new Map<string, boolean>();
  const objects = new Map<string, boolean>();
  const files = new Map<string, string>();
  const run = (...args: string[]): string =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  return {
    root,
    git: run,
    fileAtCommit: (sha, path) => {
      const object = `${sha}:${path}`;
      const cached = files.get(object);
      if (cached !== undefined) return cached;
      const value = execFileSync("git", ["show", object], {
        cwd: root,
        encoding: "utf8",
      });
      files.set(object, value);
      return value;
    },
    directParentOf: (sha) => {
      const cached = directParents.get(sha);
      if (cached) return cached;
      const parent = run("rev-parse", `${sha}^`);
      directParents.set(sha, parent);
      return parent;
    },
    commitExists: (sha) => {
      const cached = commits.get(sha);
      if (cached !== undefined) return cached;
      try {
        execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], {
          cwd: root,
          stdio: "ignore",
        });
        commits.set(sha, true);
        return true;
      } catch {
        commits.set(sha, false);
        return false;
      }
    },
    objectExists: (object) => {
      const cached = objects.get(object);
      if (cached !== undefined) return cached;
      try {
        execFileSync("git", ["cat-file", "-e", object], {
          cwd: root,
          stdio: "ignore",
        });
        objects.set(object, true);
        return true;
      } catch {
        objects.set(object, false);
        return false;
      }
    },
  };
};

const currentRepository = makeGitRepository(repositoryRoot);
const git = currentRepository.git;
const commitExists = currentRepository.commitExists;
const checkoutHead = git("rev-parse", "HEAD");
const runnerValidationHead = process.env.FLUYO_PACKET_VALIDATION_HEAD ?? checkoutHead;
const approvalRecordHead = currentRepository.directParentOf(runnerValidationHead);
const authoritativeReviewedPacketHead = currentRepository.directParentOf(approvalRecordHead);
const approvalRecordPolicyText = currentRepository.fileAtCommit(
  approvalRecordHead,
  policyRelativePath,
);

const repositoryEvidenceExists = (
  reference: unknown,
  evidenceCommit: unknown,
  referencePattern: RegExp,
  trustedRepository: GitRepository,
): boolean => {
  if (typeof reference !== "string" || typeof evidenceCommit !== "string") return false;
  const match = referencePattern.exec(reference);
  if (!match) return false;
  const [, sha, path] = match;
  if (!sha || !path) return false;
  if (sha !== evidenceCommit || path.startsWith("/") || path.split("/").includes("..")) {
    return false;
  }
  return trustedRepository.objectExists(`${sha}:${path}`);
};

const approvalFieldsAreComplete = (
  decisionValue: JsonObject,
  runnerSuppliedReviewedPacketHead: string,
  packetPolicy: JsonObject,
  trustedRepository: GitRepository,
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
  const approvalReferencePattern = new RegExp(String(acceptancePolicy.evidenceReferencePattern));
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
    trustedRepository.commitExists(runnerSuppliedReviewedPacketHead) &&
    packetPolicy.reviewedPacketHead === runnerSuppliedReviewedPacketHead &&
    runnerSuppliedReviewedPacketHead !== packetPolicy.sourceMainCommit &&
    packetDecision !== undefined &&
    JSON.stringify(packetDecision) === JSON.stringify(decisionValue) &&
    timestampIsReal &&
    typeof approval.approvedBy === "string" &&
    approvers.includes(approval.approvedBy) &&
    repositoryEvidenceExists(
      approval.approvalReference,
      approval.evidenceCommit,
      approvalReferencePattern,
      trustedRepository,
    ) &&
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
        trustedRepository,
      ),
    )
  );
};

const immutableDecisionFields = (decision: JsonObject): JsonObject => {
  const immutable = { ...decision };
  delete immutable.status;
  delete immutable.approval;
  return immutable;
};

const approvalRecordIsEmpty = (decision: JsonObject): boolean => {
  const approval = asObject(decision.approval, "reviewed decision approval");
  return Object.entries(approval).every(
    ([key, value]) =>
      value === null ||
      (key === "evidenceByRequirement" &&
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0),
  );
};

const approvalRecordPolicyMatchesReviewedPacket = (
  approvalRecordPolicy: JsonObject,
  reviewedPacketPolicy: JsonObject,
  reviewedPacketHead: string,
): boolean => {
  const approvalRoot = { ...approvalRecordPolicy };
  const reviewedRoot = { ...reviewedPacketPolicy };
  delete approvalRoot.reviewedPacketHead;
  delete approvalRoot.decisions;
  delete reviewedRoot.reviewedPacketHead;
  delete reviewedRoot.decisions;
  if (
    approvalRecordPolicy.reviewedPacketHead !== reviewedPacketHead ||
    JSON.stringify(approvalRoot) !== JSON.stringify(reviewedRoot)
  ) {
    return false;
  }
  const approvalDecisions = asObjects(approvalRecordPolicy.decisions, "approval record decisions");
  const reviewedDecisions = asObjects(reviewedPacketPolicy.decisions, "reviewed packet decisions");
  if (approvalDecisions.length !== reviewedDecisions.length) return false;
  return approvalDecisions.every((approvalDecision, index) => {
    const reviewedDecision = reviewedDecisions[index];
    if (!reviewedDecision || approvalDecision.id !== reviewedDecision.id) return false;
    if (JSON.stringify(approvalDecision) === JSON.stringify(reviewedDecision)) return true;
    return (
      approvalDecision.status === "ACCEPTED" &&
      reviewedDecision.status !== "ACCEPTED" &&
      approvalRecordIsEmpty(reviewedDecision) &&
      JSON.stringify(immutableDecisionFields(approvalDecision)) ===
        JSON.stringify(immutableDecisionFields(reviewedDecision))
    );
  });
};

const allNewAcceptancesAreComplete = (
  approvalRecordPolicy: JsonObject,
  reviewedPacketPolicy: JsonObject,
  reviewedPacketHead: string,
  trustedRepository: GitRepository,
): boolean => {
  const approvalDecisions = asObjects(approvalRecordPolicy.decisions, "approval record decisions");
  const reviewedDecisions = asObjects(reviewedPacketPolicy.decisions, "reviewed packet decisions");
  return approvalDecisions.every((approvalDecision, index) => {
    const reviewedDecision = reviewedDecisions[index];
    if (!reviewedDecision) return false;
    if (JSON.stringify(approvalDecision) === JSON.stringify(reviewedDecision)) return true;
    return approvalFieldsAreComplete(
      approvalDecision,
      reviewedPacketHead,
      approvalRecordPolicy,
      trustedRepository,
    );
  });
};

const approvalIsCompleteForTrustedState = (
  decisionValue: JsonObject,
  packetPolicy: JsonObject,
  currentPacketText: string,
  validationHead: string,
  checkedOutHead: string,
  trustedRepository: GitRepository,
): boolean => {
  if (validationHead !== checkedOutHead || !trustedRepository.commitExists(validationHead)) {
    return false;
  }
  let approvalHead: string;
  let reviewedPacketHead: string;
  let validationPacketText: string;
  let approvalRecordPacketText: string;
  let reviewedPacketText: string;
  try {
    approvalHead = trustedRepository.directParentOf(validationHead);
    reviewedPacketHead = trustedRepository.directParentOf(approvalHead);
    if (
      !trustedRepository.commitExists(approvalHead) ||
      !trustedRepository.commitExists(reviewedPacketHead)
    ) {
      return false;
    }
    validationPacketText = trustedRepository.fileAtCommit(validationHead, policyRelativePath);
    approvalRecordPacketText = trustedRepository.fileAtCommit(approvalHead, policyRelativePath);
    reviewedPacketText = trustedRepository.fileAtCommit(reviewedPacketHead, policyRelativePath);
  } catch {
    return false;
  }
  if (
    currentPacketText !== validationPacketText ||
    validationPacketText !== approvalRecordPacketText ||
    JSON.stringify(packetPolicy) !== JSON.stringify(JSON.parse(currentPacketText))
  ) {
    return false;
  }
  const approvalRecordPolicy = asObject(
    JSON.parse(approvalRecordPacketText),
    "approval record policy",
  );
  const reviewedPacketPolicy = asObject(JSON.parse(reviewedPacketText), "reviewed packet policy");
  const approvalRecordDecision = asObjects(
    approvalRecordPolicy.decisions,
    "approval record decisions",
  ).find((entry) => entry.id === decisionValue.id);
  const reviewedDecision = asObjects(
    reviewedPacketPolicy.decisions,
    "reviewed packet decisions",
  ).find((entry) => entry.id === decisionValue.id);
  return (
    approvalRecordPolicyMatchesReviewedPacket(
      approvalRecordPolicy,
      reviewedPacketPolicy,
      reviewedPacketHead,
    ) &&
    allNewAcceptancesAreComplete(
      approvalRecordPolicy,
      reviewedPacketPolicy,
      reviewedPacketHead,
      trustedRepository,
    ) &&
    approvalRecordDecision !== undefined &&
    reviewedDecision !== undefined &&
    JSON.stringify(approvalRecordDecision) === JSON.stringify(decisionValue) &&
    reviewedDecision.status !== "ACCEPTED" &&
    approvalRecordIsEmpty(reviewedDecision) &&
    JSON.stringify(immutableDecisionFields(approvalRecordDecision)) ===
      JSON.stringify(immutableDecisionFields(reviewedDecision)) &&
    approvalFieldsAreComplete(decisionValue, reviewedPacketHead, packetPolicy, trustedRepository)
  );
};

const approvalIsComplete = (decisionValue: JsonObject): boolean =>
  approvalIsCompleteForTrustedState(
    decisionValue,
    policy,
    policyText,
    runnerValidationHead,
    checkoutHead,
    currentRepository,
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
      "direct_parent_of_approval_record_commit_with_git_commit_verification",
    );
    expect(acceptancePolicy.reviewedPolicyRule).toBe(
      "validation_policy_must_equal_approval_record_policy_and_immutable_decision_fields_must_equal_the_reviewed_packet",
    );
    expect(acceptancePolicy.evidenceArtifactRule).toBe(
      "every_required_evidence_reference_must_name_an_existing_repository_path_at_the_evidence_commit",
    );
    expect(acceptancePolicy.evidenceArtifactReferencePattern).toBe(
      "^git:([0-9a-f]{40}):([A-Za-z0-9._/-]+)$",
    );
    expect(acceptancePolicy.evidenceReferencePattern).toBe(
      "^git:([0-9a-f]{40}):([A-Za-z0-9._/-]+)$",
    );
    expect(runnerValidationHead).toBe(checkoutHead);
    expect(commitExists(runnerValidationHead)).toBe(true);
    expect(commitExists(approvalRecordHead)).toBe(true);
    expect(commitExists(authoritativeReviewedPacketHead)).toBe(true);
    expect(git("rev-parse", `${runnerValidationHead}^`)).toBe(approvalRecordHead);
    expect(git("rev-parse", `${approvalRecordHead}^`)).toBe(authoritativeReviewedPacketHead);
    expect(approvalRecordHead).not.toBe(authoritativeReviewedPacketHead);
    expect(ciWorkflow).toContain(
      "FLUYO_PACKET_VALIDATION_HEAD: ${{ github.event.pull_request.head.sha || github.sha }}",
    );
    expect(ciWorkflow).toContain(
      "ref: ${{ github.event.pull_request.head.sha || github.sha }}\n          fetch-depth: 3",
    );

    const actualAcceptedRows = decisions.filter((decision) => decision.status === "ACCEPTED");
    if (actualAcceptedRows.length > 0) {
      expect(policyText).toBe(approvalRecordPolicyText);
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
        approvalReference: evidenceReference,
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
        approvalFieldsAreComplete(
          value,
          reviewedPacketHead,
          {
            ...acceptedPolicy,
            decisions: decisions.map((entry) => (entry.id === decision.id ? value : entry)),
          },
          currentRepository,
        );
      const acceptedPolicyText = JSON.stringify(acceptedPolicy);

      expect(validateFields(accepted)).toBe(true);
      expect(approvalIsComplete(accepted)).toBe(false);
      expect(
        approvalIsCompleteForTrustedState(
          accepted,
          acceptedPolicy,
          acceptedPolicyText,
          runnerValidationHead,
          checkoutHead,
          currentRepository,
        ),
      ).toBe(false);
      expect(
        approvalIsCompleteForTrustedState(
          accepted,
          acceptedPolicy,
          acceptedPolicyText,
          "a".repeat(40),
          "a".repeat(40),
          currentRepository,
        ),
      ).toBe(false);
      expect(
        approvalIsCompleteForTrustedState(
          accepted,
          acceptedPolicy,
          acceptedPolicyText,
          approvalRecordHead,
          approvalRecordHead,
          currentRepository,
        ),
      ).toBe(false);
      expect(
        approvalIsCompleteForTrustedState(
          accepted,
          acceptedPolicy,
          acceptedPolicyText,
          runnerValidationHead,
          approvalRecordHead,
          currentRepository,
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
          approval: {
            ...completeApproval,
            approvalReference: `git:${reviewedPacketHead}:contracts/mobile/auth-readiness/v1/missing-approval.md`,
          },
        }),
      ).toBe(false);
      expect(
        validateFields({
          ...accepted,
          approval: {
            ...completeApproval,
            approvalReference: `git:${approvalRecordHead}:contracts/mobile/auth-readiness/v1/README.md`,
          },
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
              [firstRequired]: `git:${approvalRecordHead}:contracts/mobile/auth-readiness/v1/README.md`,
            },
          },
        }),
      ).toBe(false);
    }
  });

  it("proves the approval path against a real three-commit Git history", () => {
    const temporaryRepositoryRoot = mkdtempSync(
      resolve(repositoryRoot, ".tmp-auth-readiness-approval-"),
    );
    try {
      const temporaryRepository = makeGitRepository(temporaryRepositoryRoot);
      temporaryRepository.git("init", "--quiet");
      temporaryRepository.git("config", "user.name", "Fluyo approval test");
      temporaryRepository.git("config", "user.email", "approval-test@invalid.local");
      temporaryRepository.git("config", "core.autocrlf", "false");
      mkdirSync(resolve(temporaryRepositoryRoot, "contracts/mobile/auth-readiness/v1"), {
        recursive: true,
      });
      const temporaryPolicyPath = resolve(
        temporaryRepositoryRoot,
        "contracts/mobile/auth-readiness/v1/decision-policy.json",
      );
      const temporaryReadmePath = resolve(
        temporaryRepositoryRoot,
        "contracts/mobile/auth-readiness/v1/README.md",
      );
      const writePolicy = (value: JsonObject): string => {
        const text = JSON.stringify(value, null, 2) + "\n";
        writeFileSync(temporaryPolicyPath, text, "utf8");
        return text;
      };
      const commitAll = (message: string): string => {
        temporaryRepository.git("add", ".");
        temporaryRepository.git("commit", "--quiet", "-m", message);
        return temporaryRepository.git("rev-parse", "HEAD");
      };

      writeFileSync(temporaryReadmePath, "# Reviewed evidence\n", "utf8");
      writeFileSync(resolve(temporaryRepositoryRoot, "base.txt"), "base\n", "utf8");
      const basePolicy = JSON.parse(JSON.stringify(policy)) as JsonObject;
      writePolicy(basePolicy);
      commitAll("base");

      writeFileSync(resolve(temporaryRepositoryRoot, "packet.txt"), "reviewed\n", "utf8");
      const reviewedPacketTextForGraph = writePolicy(basePolicy);
      const reviewedHead = commitAll("reviewed packet P");

      const reviewedDecision = asObjects(basePolicy.decisions, "temporary decisions")[0];
      if (!reviewedDecision) throw new Error("temporary decision is required");
      const requiredEvidence = asStrings(
        reviewedDecision.requiredEvidence,
        "temporary required evidence",
      );
      const approvedValue = "bounded_exact_value";
      const evidenceReference = `git:${reviewedHead}:contracts/mobile/auth-readiness/v1/README.md`;
      const acceptedDecision: JsonObject = {
        ...reviewedDecision,
        status: "ACCEPTED",
        approval: {
          approvedAtUtc: "2026-10-23T08:55:00Z",
          approvedBy: "Marlon",
          approvalReference: evidenceReference,
          approvedValue,
          evidenceCommit: reviewedHead,
          decisionValueDigest: sha256(approvedValue),
          evidenceByRequirement: Object.fromEntries(
            requiredEvidence.map((item) => [item, evidenceReference]),
          ),
        },
      };
      const approvalPolicy = {
        ...basePolicy,
        reviewedPacketHead: reviewedHead,
        decisions: asObjects(basePolicy.decisions, "temporary decisions").map((entry) =>
          entry.id === acceptedDecision.id ? acceptedDecision : entry,
        ),
      };
      const approvalRecordText = writePolicy(approvalPolicy);
      const approvalHead = commitAll("approval record A");

      writeFileSync(resolve(temporaryRepositoryRoot, "validation.txt"), "validate\n", "utf8");
      const validationHead = commitAll("validation V");
      const validationPolicyText = temporaryRepository.fileAtCommit(
        validationHead,
        policyRelativePath,
      );
      const approvalRecordPolicyFromGit = temporaryRepository.fileAtCommit(
        approvalHead,
        policyRelativePath,
      );
      const reviewedPolicyFromGit = temporaryRepository.fileAtCommit(
        reviewedHead,
        policyRelativePath,
      );
      expect(temporaryRepository.directParentOf(validationHead)).toBe(approvalHead);
      expect(temporaryRepository.directParentOf(approvalHead)).toBe(reviewedHead);
      expect(validationPolicyText).toBe(approvalRecordPolicyFromGit);
      expect(immutableDecisionFields(acceptedDecision)).toEqual(
        immutableDecisionFields(reviewedDecision),
      );
      expect(
        approvalFieldsAreComplete(
          acceptedDecision,
          reviewedHead,
          approvalPolicy,
          temporaryRepository,
        ),
      ).toBe(true);
      expect(
        approvalIsCompleteForTrustedState(
          acceptedDecision,
          approvalPolicy,
          validationPolicyText,
          validationHead,
          validationHead,
          temporaryRepository,
        ),
      ).toBe(true);
      expect(reviewedPacketTextForGraph).toBe(reviewedPolicyFromGit);
      expect(approvalRecordText).toBe(
        temporaryRepository.fileAtCommit(approvalHead, policyRelativePath),
      );

      writeFileSync(resolve(temporaryRepositoryRoot, "later.txt"), "later\n", "utf8");
      const laterHead = commitAll("later head");
      expect(
        approvalIsCompleteForTrustedState(
          acceptedDecision,
          approvalPolicy,
          temporaryRepository.fileAtCommit(laterHead, policyRelativePath),
          laterHead,
          laterHead,
          temporaryRepository,
        ),
      ).toBe(false);

      temporaryRepository.git("checkout", "--quiet", validationHead);
      const changedPolicy = { ...approvalPolicy, recordedDate: "2026-10-24" };
      writePolicy(changedPolicy);
      const changedHead = commitAll("changed policy");
      expect(
        approvalIsCompleteForTrustedState(
          acceptedDecision,
          changedPolicy,
          temporaryRepository.fileAtCommit(changedHead, policyRelativePath),
          changedHead,
          changedHead,
          temporaryRepository,
        ),
      ).toBe(false);

      temporaryRepository.git("checkout", "--quiet", reviewedHead);
      const weakenedApprovalPolicy = JSON.parse(JSON.stringify(approvalPolicy)) as JsonObject;
      asObject(weakenedApprovalPolicy.approvalPolicy).validationClockUtc = "2099-12-31T23:59:59Z";
      writePolicy(weakenedApprovalPolicy);
      commitAll("mutated approval policy A");
      writeFileSync(
        resolve(temporaryRepositoryRoot, "weakened-validation.txt"),
        "validate\n",
        "utf8",
      );
      const weakenedValidationHead = commitAll("mutated approval policy V");
      expect(
        approvalIsCompleteForTrustedState(
          acceptedDecision,
          weakenedApprovalPolicy,
          temporaryRepository.fileAtCommit(weakenedValidationHead, policyRelativePath),
          weakenedValidationHead,
          weakenedValidationHead,
          temporaryRepository,
        ),
      ).toBe(false);

      temporaryRepository.git("checkout", "--quiet", reviewedHead);
      const mutatedScopeClaimsPolicy = JSON.parse(JSON.stringify(approvalPolicy)) as JsonObject;
      asObject(mutatedScopeClaimsPolicy.scope).completionClaimAllowed = true;
      mutatedScopeClaimsPolicy.safeClaims = [
        ...asStrings(mutatedScopeClaimsPolicy.safeClaims, "mutated safe claims"),
        "unreviewed_claim",
      ];
      writePolicy(mutatedScopeClaimsPolicy);
      commitAll("mutated scope and claims A");
      writeFileSync(
        resolve(temporaryRepositoryRoot, "scope-claims-validation.txt"),
        "validate\n",
        "utf8",
      );
      const scopeClaimsValidationHead = commitAll("mutated scope and claims V");
      expect(
        approvalIsCompleteForTrustedState(
          acceptedDecision,
          mutatedScopeClaimsPolicy,
          temporaryRepository.fileAtCommit(scopeClaimsValidationHead, policyRelativePath),
          scopeClaimsValidationHead,
          scopeClaimsValidationHead,
          temporaryRepository,
        ),
      ).toBe(false);

      temporaryRepository.git("checkout", "--quiet", reviewedHead);
      const unrelatedDecisionPolicy = JSON.parse(JSON.stringify(approvalPolicy)) as JsonObject;
      const unrelatedDecisions = asObjects(
        unrelatedDecisionPolicy.decisions,
        "unrelated mutation decisions",
      );
      const unrelatedDecision = unrelatedDecisions[1];
      if (!unrelatedDecision) throw new Error("unrelated decision is required");
      unrelatedDecisions[1] = {
        ...unrelatedDecision,
        fallback: "unreviewed unrelated fallback",
      };
      unrelatedDecisionPolicy.decisions = unrelatedDecisions;
      writePolicy(unrelatedDecisionPolicy);
      commitAll("mutated unrelated decision A");
      writeFileSync(
        resolve(temporaryRepositoryRoot, "unrelated-validation.txt"),
        "validate\n",
        "utf8",
      );
      const unrelatedValidationHead = commitAll("mutated unrelated decision V");
      expect(
        approvalIsCompleteForTrustedState(
          acceptedDecision,
          unrelatedDecisionPolicy,
          temporaryRepository.fileAtCommit(unrelatedValidationHead, policyRelativePath),
          unrelatedValidationHead,
          unrelatedValidationHead,
          temporaryRepository,
        ),
      ).toBe(false);

      expect(
        approvalIsCompleteForTrustedState(
          acceptedDecision,
          approvalPolicy,
          temporaryRepository.fileAtCommit(approvalHead, policyRelativePath),
          approvalHead,
          approvalHead,
          temporaryRepository,
        ),
      ).toBe(false);
    } finally {
      rmSync(temporaryRepositoryRoot, { recursive: true, force: true });
    }
  }, 15_000);

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
