import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;

const contractDirectory = resolve(__dirname, "../../../contracts/mobile/auth-state/v1");
const readJson = (name: string) =>
  JSON.parse(readFileSync(resolve(contractDirectory, name), "utf8")) as JsonObject;

const machine = readJson("state-machine.json");
const copy = readJson("copy.json");
const acceptance = readJson("acceptance.json");
const readme = readFileSync(resolve(contractDirectory, "README.md"), "utf8");
const normalizedReadme = readme.replace(/\s+/g, " ");

const asObject = (value: unknown, label = "value"): JsonObject => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonObject;
};

const asObjects = (value: unknown, label: string): JsonObject[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((entry, index) => asObject(entry, `${label}[${index}]`));
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
    const currentPath = `${path}.${key}`;
    const violation = concepts.some((concept) => normalize(key).includes(normalize(concept)))
      ? [currentPath]
      : [];
    return violation.concat(restrictedPaths(child, concepts, currentPath));
  });
};

type PendingTransaction = {
  purpose: "sign_in" | "confirmation" | "recovery";
  environment: "development" | "staging";
  host: string;
  path: string;
  stateValue: string;
  verifier: string;
  expiresAt: number;
};

class InMemoryTransactionStore {
  #pending: PendingTransaction | undefined;

  constructor(transaction: PendingTransaction) {
    this.#pending = transaction;
  }

  consume(input: {
    purpose: PendingTransaction["purpose"];
    environment: PendingTransaction["environment"];
    host: string;
    path: string;
    stateValue: string;
    now: number;
  }): boolean {
    const pending = this.#pending;
    this.#pending = undefined;
    return Boolean(
      pending &&
      pending.purpose === input.purpose &&
      pending.environment === input.environment &&
      pending.host === input.host &&
      pending.path === input.path &&
      pending.stateValue === input.stateValue &&
      input.now <= pending.expiresAt,
    );
  }

  get hasPendingTransaction(): boolean {
    return this.#pending !== undefined;
  }

  clear(): void {
    this.#pending = undefined;
  }
}

const classifySyntheticCallback = (input: {
  url: string;
  purpose: PendingTransaction["purpose"];
  environment: PendingTransaction["environment"];
  now: number;
  store: InMemoryTransactionStore;
}): string => {
  const malformed = () => {
    input.store.clear();
    return "malformed";
  };
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    return malformed();
  }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".test") || parsed.hash !== "") {
    return malformed();
  }
  const keys = [...parsed.searchParams.keys()];
  if (
    keys.length !== 2 ||
    new Set(keys).size !== 2 ||
    !keys.includes("code") ||
    !keys.includes("state") ||
    parsed.searchParams.getAll("code").length !== 1 ||
    parsed.searchParams.getAll("state").length !== 1
  ) {
    return malformed();
  }
  return input.store.consume({
    purpose: input.purpose,
    environment: input.environment,
    host: parsed.hostname,
    path: parsed.pathname,
    stateValue: parsed.searchParams.get("state") ?? "",
    now: input.now,
  })
    ? "success"
    : "replayed_or_unmatched";
};

const evidenceIsClosed = (value: JsonObject): boolean => {
  const allowed = asStrings(acceptance.evidenceAllowedFields, "evidenceAllowedFields");
  const keys = Object.keys(value);
  if (keys.length !== allowed.length || !keys.every((key) => allowed.includes(key))) return false;
  if (!allowed.every((key) => Object.hasOwn(value, key))) return false;
  const constraints = asObject(acceptance.evidenceConstraints);
  const executionCount = value.executionCount;
  return (
    asStrings(acceptance.syntheticScenarioIds, "syntheticScenarioIds").includes(
      String(value.scenarioId),
    ) &&
    asStrings(constraints.platform, "platform").includes(String(value.platform)) &&
    asStrings(constraints.environment, "environment").includes(String(value.environment)) &&
    new RegExp(String(constraints.sourceCommitPattern)).test(String(value.sourceCommit)) &&
    new RegExp(String(constraints.artifactSha256Pattern)).test(String(value.artifactSha256)) &&
    asStrings(constraints.scanResult, "scanResult").includes(String(value.scanResult)) &&
    asStrings(acceptance.fixedDiagnosticCategories, "fixedDiagnosticCategories").includes(
      String(value.outcomeCategory),
    ) &&
    typeof executionCount === "number" &&
    Number.isInteger(executionCount) &&
    executionCount >= Number(asObject(constraints.executionCount).minimum) &&
    executionCount <= Number(asObject(constraints.executionCount).maximum)
  );
};

describe("provider-neutral auth-state contract v1", () => {
  it("is bound to the post-security main baseline and makes no runtime claim", () => {
    expect(machine.schemaVersion).toBe("1.0.0");
    expect(machine.sourceMainCommit).toBe("7df062b51dd3b915d0064879d969c7d52cbc1c8b");
    expect(machine.status).toBe("repository_only_provider_neutral_specification");
    expect(machine.productionDataUsed).toBe(false);
    expect(machine.externalActionsPerformed).toBe(false);
    expect(machine.runtimeEvidenceCount).toBe(0);
    expect(asObject(machine.mirroredRuntimeScenarios)).toEqual({
      planned: 24,
      passed: 0,
      failed: 0,
      status: "unattempted",
    });
    expect(acceptance.completionClaimAllowed).toBe(false);
  });

  it("records the exact provider-neutral ports and named RACI", () => {
    expect(asStrings(machine.ports, "ports")).toEqual([
      "AuthProvider",
      "SessionVault",
      "CallbackTransactionStore",
      "Clock",
      "OwnerDataStore",
      "Telemetry",
    ]);
    expect(asObject(machine.raci)).toEqual({
      uxStateSemanticsAccountable: "Danila",
      repositoryIntegrationResponsible: "Adriana",
      materialProductAndExternalChangesConsulted: "Marlon",
      privacySecurityReviewer: "Fernanda",
      independentQa: "Elana",
    });
  });

  it("defines the exact 12 by 2 mirrored native matrix and keeps every row unattempted", () => {
    const matrix = asObject(acceptance.mirroredNativeRuntimeMatrix);
    const baseScenarios = asObjects(matrix.baseScenarios, "baseScenarios");
    const rows = asObjects(matrix.rows, "rows");
    const expectedBaseIds = [
      "auth_callback_success",
      "auth_callback_canceled",
      "auth_callback_malformed",
      "auth_callback_expired",
      "auth_callback_replayed",
      "auth_returning_valid_session",
      "auth_refresh_success",
      "auth_refresh_failure_requires_sign_in",
      "auth_sign_out_cleanup",
      "auth_deep_link_cold_start",
      "auth_deep_link_warm_start",
      "auth_deep_link_unsupported",
    ];
    expect(baseScenarios.map((scenario) => scenario.id)).toEqual(expectedBaseIds);
    expect(baseScenarios.map((scenario) => scenario.sprintScenario)).toEqual([
      7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ]);
    for (const scenario of baseScenarios) {
      expect(
        asStrings(scenario.criteria, `${String(scenario.id)} criteria`).length,
      ).toBeGreaterThan(0);
    }
    expect(rows).toHaveLength(24);
    expect(new Set(rows.map((row) => row.id)).size).toBe(24);
    expect(rows.map((row) => row.id)).toEqual(
      expectedBaseIds.flatMap((id) => [`ios_${id}`, `android_${id}`]),
    );
    for (const id of expectedBaseIds) {
      expect(rows.filter((row) => row.baseScenarioId === id).map((row) => row.platform)).toEqual([
        "ios",
        "android",
      ]);
    }
    expect(rows.every((row) => row.status === "unattempted")).toBe(true);
    expect(asStrings(matrix.crossCuttingCriteria, "crossCuttingCriteria")).toHaveLength(10);
  });

  it("defines ten secret-free public states with complete copy", () => {
    const states = asObjects(machine.states, "states");
    const expected = [
      "initializing",
      "signed_out",
      "callback_pending",
      "authenticated",
      "offline_session_candidate",
      "refresh_pending",
      "expired_or_revoked",
      "account_switching",
      "unusable_link",
      "safe_terminal_error",
    ];
    expect(states.map((state) => state.id)).toEqual(expected);
    expect(Object.keys(asObject(copy.states))).toEqual(expected);
    expect(copy.identityLabel).toBe("Signed in");
    expect(
      restrictedPaths(states, asStrings(machine.publicStateForbiddenFields, "forbidden")),
    ).toEqual([]);
    expect(JSON.stringify(copy)).not.toMatch(/@|https?:\/\/|[0-9a-f]{8}-[0-9a-f-]{27,}/i);
  });

  it("pins the generation fence and all write/navigation cancellation order", () => {
    const fence = asObject(machine.generationFence);
    expect(fence.storage).toBe("memory_only_never_logged_or_persisted");
    expect(fence.maxCallbackExchanges).toBe(1);
    expect(fence.maxRefreshes).toBe(1);
    expect(asStrings(fence.order, "generation order")).toEqual([
      "increment_generation",
      "cancel_callback_refresh_and_api_work",
      "block_writes_retries_and_navigation",
      "purge_prior_owner_and_pending_flow_state",
      "establish_and_verify_candidate",
      "expose_fixed_identity_state",
    ]);
    expect(asStrings(fence.fences, "fences")).toEqual([
      "response_handling",
      "retries",
      "navigation",
      "cache_writes",
      "storage_writes",
    ]);
  });

  it("atomically consumes one exact synthetic callback and rejects replay", () => {
    const store = new InMemoryTransactionStore({
      purpose: "sign_in",
      environment: "development",
      host: "auth.dev.fluyo.test",
      path: "/native/auth/callback",
      stateValue: "synthetic-state",
      verifier: "opaque-verifier",
      expiresAt: 2_000,
    });
    const callback = {
      url: "https://auth.dev.fluyo.test/native/auth/callback?code=synthetic&state=synthetic-state",
      purpose: "sign_in" as const,
      environment: "development" as const,
      now: 1_000,
      store,
    };
    expect(classifySyntheticCallback(callback)).toBe("success");
    expect(store.hasPendingTransaction).toBe(false);
    expect(classifySyntheticCallback(callback)).toBe("replayed_or_unmatched");
  });

  it("locks callback purpose, environment, host, path, expiry, wipe, and no-retention rules", () => {
    const callback = asObject(machine.callbackTransaction);
    expect(callback.status).toBe("synthetic_contract_only_no_os_link_registration");
    expect(callback.allowedPurposes).toEqual(["sign_in", "confirmation", "recovery"]);
    expect(callback.allowedEnvironments).toEqual(["development", "staging"]);
    expect(callback.scheme).toBe("https");
    expect(callback.fixtureHostSuffix).toBe(".test");
    expect(callback.atomicConsume).toBe(true);
    expect(callback.requiredBindings).toEqual([
      "purpose",
      "environment",
      "exact_host",
      "exact_path",
      "pending_transaction",
      "one_verifier",
      "injected_clock_expiry",
    ]);
    expect(callback.wipeOn).toEqual([
      "success",
      "cancel",
      "malformed_input",
      "timeout",
      "local_sign_out",
      "account_switch",
      "relaunch_without_valid_pending_transaction",
    ]);
    expect(callback.retention).toBe(
      "never_retain_or_emit_url_query_fragment_code_verifier_state_nonce_or_hash",
    );
  });

  it("rejects wrong, expired, fragmented, or duplicated synthetic callbacks and wipes once", () => {
    const makeStore = () =>
      new InMemoryTransactionStore({
        purpose: "recovery",
        environment: "staging",
        host: "auth.staging.fluyo.test",
        path: "/native/recovery/callback",
        stateValue: "synthetic-state",
        verifier: "opaque-verifier",
        expiresAt: 2_000,
      });
    const base = {
      purpose: "recovery" as const,
      environment: "staging" as const,
      now: 1_000,
    };
    expect(
      classifySyntheticCallback({
        ...base,
        url: "https://wrong.test/native/recovery/callback?code=synthetic&state=synthetic-state",
        store: makeStore(),
      }),
    ).toBe("replayed_or_unmatched");
    expect(
      classifySyntheticCallback({
        ...base,
        now: 2_001,
        url: "https://auth.staging.fluyo.test/native/recovery/callback?code=synthetic&state=synthetic-state",
        store: makeStore(),
      }),
    ).toBe("replayed_or_unmatched");
    const duplicateStore = makeStore();
    expect(
      classifySyntheticCallback({
        ...base,
        url: "https://auth.staging.fluyo.test/native/recovery/callback?code=one&code=two&state=synthetic-state",
        store: duplicateStore,
      }),
    ).toBe("malformed");
    expect(duplicateStore.hasPendingTransaction).toBe(false);
    expect(
      classifySyntheticCallback({
        ...base,
        url: "https://auth.staging.fluyo.test/native/recovery/callback?code=synthetic&state=synthetic-state#access_token=forbidden",
        store: makeStore(),
      }),
    ).toBe("malformed");
  });

  it("distinguishes transient refresh, explicit invalidation, repeated 401, and 403", () => {
    expect(asObject(machine.refreshSemantics)).toEqual({
      auth401: "one_refresh_then_clear_on_repeated_401",
      auth403: "never_refresh_and_never_sign_out",
      transientFailure: "preserve_vault_material_and_move_to_offline_or_safe_terminal_state",
      explicitInvalidExpiredOrRevoked: "clear_vault_pending_flow_headers_requests_and_owner_cache",
      revocationClaim: "refresh_capability_only_access_jwt_may_remain_valid_until_expiry",
    });
  });

  it("cleans every lifecycle boundary before exposing signed-out or new-owner state", () => {
    const cleanup = asObject(machine.cleanupMatrix);
    const required = [
      "session_vault",
      "pending_callback",
      "pending_recovery",
      "headers",
      "requests",
      "owner_cache",
    ];
    for (const trigger of [
      "local_sign_out",
      "invalid_expired_or_revoked_refresh",
      "account_switch",
      "vault_corruption",
      "authoritative_deletion_confirmation",
    ]) {
      expect(asStrings(cleanup[trigger], trigger)).toEqual(expect.arrayContaining(required));
    }
    expect(cleanup.remoteDeletionImplementation).toBe("absent_and_blocked");
    expect(cleanup.rule).toBe("cleanup_completes_before_signed_out_or_new_owner_state_is_exposed");
  });

  it("keeps the private owner key out of every observable surface", () => {
    expect(asObject(machine.ownerIsolation)).toEqual({
      confirmationEndpoint: "/api/v1/auth/me",
      ownerKey: "private_uuid_from_server_response",
      ownerKeyExposure: "never_ui_log_telemetry_fixture_report_filename_or_snapshot",
      readRule: "do_not_reveal_or_read_owner_data_before_subject_confirmation",
      mismatchRule: "clear_or_quarantine_candidate_and_emit_fixed_category_only",
      offlineRule:
        "may_show_last_verified_display_state_but_cannot_confirm_new_owner_grant_access_or_expand_data",
    });
  });

  it("makes telemetry structurally zero-retention", () => {
    expect(asObject(machine.telemetry)).toEqual({
      mode: "zero_retention_no_op",
      networkRequests: 0,
      queuedEvents: 0,
      serialization: false,
      diskWrites: 0,
      correlationIdentifiers: false,
      retainedTimestamps: false,
      retries: 0,
    });
    expect(asStrings(acceptance.syntheticScenarioIds, "scenarios")).toEqual(
      expect.arrayContaining([
        "zero_telemetry_launch",
        "zero_telemetry_resume",
        "zero_telemetry_error",
        "callback_duplicate_delivery",
        "refresh_transient_failure_preserves_candidate",
        "account_switch_cleanup",
      ]),
    );
  });

  it("accepts only the closed fixed-category evidence record", () => {
    const valid = {
      scenarioId: "callback_replay",
      platform: "shared_contract",
      environment: "repository_only",
      sourceCommit: "7df062b51dd3b915d0064879d969c7d52cbc1c8b",
      outcomeCategory: "replayed",
      executionCount: 1,
      artifactSha256: "a".repeat(64),
      scanResult: "passed",
    };
    expect(evidenceIsClosed(valid)).toBe(true);
    for (const extra of [
      "email",
      "ownerId",
      "accessToken",
      "callbackUrl",
      "providerError",
      "stdout",
      "stack",
      "deviceId",
      "campaignSource",
      "correlationId",
    ]) {
      expect(evidenceIsClosed({ ...valid, [extra]: "synthetic-forbidden" })).toBe(false);
    }
    expect(evidenceIsClosed({ ...valid, outcomeCategory: "raw failure text" })).toBe(false);
    expect(evidenceIsClosed({ ...valid, scenarioId: "learner@example.test" })).toBe(false);
    expect(evidenceIsClosed({ ...valid, scenarioId: "unlisted_benign_scenario" })).toBe(false);
    expect(evidenceIsClosed({ ...valid, executionCount: 1.5 })).toBe(false);
    expect(evidenceIsClosed({ ...valid, executionCount: 1001 })).toBe(false);
    expect(evidenceIsClosed({ ...valid, sourceCommit: "short" })).toBe(false);
  });

  it("locks adversarial scan families, live blockers, claims, and bundle inventory", () => {
    expect(asStrings(acceptance.adversarialMutationFamilies, "mutations")).toEqual([
      "token_shaped_string",
      "full_email",
      "uuid",
      "windows_path",
      "unix_path",
      "callback_url",
      "query_fragment",
      "provider_exception",
      "private_exception_name",
      "header_body",
      "stdout_stderr",
      "prior_owner_marker",
      "test_account_variable_reference",
    ]);
    expect(asStrings(machine.blockedLiveGates, "blockedLiveGates")).toHaveLength(16);
    expect(String(acceptance.safeClaim)).toContain("Repository-only provider-neutral");
    expect(String(acceptance.safeClaim)).toContain("zero native runtime execution");
    expect(normalizedReadme).toContain(
      "exact 12-by-2 iOS/Android matrix for Sprint 5 scenarios 7–18 remains 24/24 `unattempted`",
    );
    expect(normalizedReadme).toContain("No OS link is registered");
    expect(readdirSync(contractDirectory).sort()).toEqual([
      "README.md",
      "acceptance.json",
      "copy.json",
      "state-machine.json",
    ]);
  });
});
