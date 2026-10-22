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

const resolveSafeDestinationId = (value: string): string | undefined =>
  asStrings(machine.safeDestinationIds, "safeDestinationIds").includes(value) ? value : undefined;

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
  }):
    | { kind: "consumed"; transaction: PendingTransaction }
    | { kind: "expired" }
    | { kind: "unmatched" } {
    const pending = this.#pending;
    this.#pending = undefined;
    if (!pending) return { kind: "unmatched" };
    if (input.now > pending.expiresAt) return { kind: "expired" };
    return pending.purpose === input.purpose &&
      pending.environment === input.environment &&
      pending.host === input.host &&
      pending.path === input.path &&
      pending.stateValue === input.stateValue
      ? { kind: "consumed", transaction: pending }
      : { kind: "unmatched" };
  }

  get hasPendingTransaction(): boolean {
    return this.#pending !== undefined;
  }

  clear(): void {
    this.#pending = undefined;
  }
}

class InMemoryAuthProvider {
  exchangeCount = 0;
  verifierWasUsed = false;

  exchange(code: string, verifier: string): boolean {
    this.exchangeCount += 1;
    this.verifierWasUsed = code.length > 0 && verifier.length > 0;
    return this.verifierWasUsed;
  }
}

type SyntheticState =
  | "initializing"
  | "signed_out"
  | "callback_pending"
  | "authenticated"
  | "offline_session_candidate"
  | "refresh_pending"
  | "expired_or_revoked"
  | "account_switching"
  | "unusable_link"
  | "safe_terminal_error";

class ObservingTelemetry {
  calls = 0;
  queuedEvents = 0;
  serializations = 0;
  diskWrites = 0;
  networkRequests = 0;
  retainedTimestamps = 0;
  correlationIdentifiers = 0;
  retries = 0;

  emit(): void {
    this.calls += 1;
  }
}

class SyntheticAuthCoordinator {
  #generation = 1;
  #state: SyntheticState = "initializing";
  #hasCandidate = false;
  #verifiedOwner: symbol | undefined;
  #ownerWriteCount = 0;
  #auth401Count = 0;
  #pendingTimerGeneration: number | undefined;
  #outcomeCategory = "success";
  #trace: string[] = [];
  #exchangeCount = 0;
  #hasPendingTransaction = false;
  readonly telemetry = new ObservingTelemetry();

  publicSnapshot(): JsonObject {
    return {
      state: this.#state,
      hasSessionCandidate: this.#hasCandidate,
      hasVerifiedOwnerState: this.#verifiedOwner !== undefined,
      safeDestinationId:
        this.#state === "authenticated" ? "internal_foundation_home" : "signed_out",
      fixedOutcomeCategory: this.#outcomeCategory,
    };
  }

  captureGeneration(): number {
    return this.#generation;
  }

  get testTrace(): readonly string[] {
    return this.#trace;
  }

  get generation(): number {
    return this.#generation;
  }

  get exchangeCount(): number {
    return this.#exchangeCount;
  }

  get hasPendingTransaction(): boolean {
    return this.#hasPendingTransaction;
  }

  recordCallbackEvidence(exchangeCount: number, hasPendingTransaction: boolean): void {
    this.#exchangeCount = exchangeCount;
    this.#hasPendingTransaction = hasPendingTransaction;
  }

  initialize(hasCandidate: boolean, online: boolean): void {
    this.#trace.push("initialize");
    this.#hasCandidate = hasCandidate;
    if (!hasCandidate) {
      this.#state = "signed_out";
    } else if (!online) {
      this.#state = "offline_session_candidate";
    } else {
      const owner = Symbol.for("verified");
      this.confirmOwner(this.#generation, owner, owner);
    }
  }

  beginCallback(kind: "cold" | "warm" = "cold"): boolean {
    if (this.#state === "callback_pending") {
      this.#outcomeCategory = "overlap_rejected";
      this.#trace.push("callback_overlap_rejected");
      return false;
    }
    if (kind === "warm" && (this.#state !== "authenticated" || this.#verifiedOwner === undefined))
      return false;
    if (kind === "cold" && this.#state !== "initializing" && this.#state !== "signed_out")
      return false;
    this.#state = "callback_pending";
    this.#trace.push(kind === "warm" ? "warm_callback_received" : "cold_callback_received");
    return true;
  }

  cancelCallback(): void {
    this.#state = "signed_out";
    this.#outcomeCategory = "canceled";
    this.#trace.push("callback_canceled");
  }

  markCallbackUnusable(
    category: "malformed" | "expired" | "replayed" | "duplicate" | "unsupported",
    preserveVerified = false,
  ): void {
    this.#state = preserveVerified && this.#verifiedOwner ? "authenticated" : "unusable_link";
    this.#outcomeCategory = category;
    this.#trace.push(`callback_${category}`);
  }

  confirmOwner(generation: number, candidate: symbol, response: symbol): boolean {
    if (generation !== this.#generation) {
      this.#outcomeCategory = "stale_generation_discarded";
      return false;
    }
    if (candidate !== response) {
      this.#hasCandidate = false;
      this.#verifiedOwner = undefined;
      this.#state = "expired_or_revoked";
      this.#outcomeCategory = "owner_mismatch";
      return false;
    }
    this.#hasCandidate = true;
    this.#verifiedOwner = response;
    this.#state = "authenticated";
    this.#outcomeCategory = "success";
    this.#trace.push("owner_confirmed");
    return true;
  }

  seedVerifiedOwner(): void {
    const owner = Symbol.for("verified");
    this.#hasCandidate = true;
    this.#verifiedOwner = owner;
    this.#state = "authenticated";
    this.#outcomeCategory = "success";
    this.#trace.push("verified_owner_seeded");
  }

  applyOwnerWrite(generation: number): boolean {
    if (generation !== this.#generation || this.#verifiedOwner === undefined) {
      this.#outcomeCategory = "stale_generation_discarded";
      return false;
    }
    this.#ownerWriteCount += 1;
    return true;
  }

  get ownerWriteCount(): number {
    return this.#ownerWriteCount;
  }

  switchAccount(): void {
    this.#generation += 1;
    this.#pendingTimerGeneration = undefined;
    this.#state = "account_switching";
    this.#hasCandidate = false;
    this.#verifiedOwner = undefined;
    this.#ownerWriteCount = 0;
    this.#outcomeCategory = "success";
    this.#trace.push("account_switch_started");
  }

  signOut(): void {
    this.#generation += 1;
    this.#pendingTimerGeneration = undefined;
    this.#hasCandidate = false;
    this.#verifiedOwner = undefined;
    this.#ownerWriteCount = 0;
    this.#state = "signed_out";
    this.#outcomeCategory = "success";
    this.#trace.push("signed_out");
  }

  refresh(outcome: "success" | "transient" | "invalid" | "forbidden"): void {
    if (outcome === "success") {
      this.seedVerifiedOwner();
    } else if (outcome === "transient") {
      this.#state = "offline_session_candidate";
      this.#outcomeCategory = "transient_failure";
    } else if (outcome === "forbidden") {
      this.#state = this.#verifiedOwner ? "authenticated" : "signed_out";
      this.#outcomeCategory = "forbidden";
    } else {
      this.signOut();
      this.#state = "expired_or_revoked";
      this.#outcomeCategory = "reauthentication_required";
    }
  }

  auth401(): void {
    this.#auth401Count += 1;
    if (this.#auth401Count === 1) {
      this.#state = "refresh_pending";
    } else {
      this.refresh("invalid");
    }
  }

  goOffline(): void {
    this.#state = this.#hasCandidate ? "offline_session_candidate" : "signed_out";
    this.#outcomeCategory = "success";
    this.#trace.push("offline");
  }

  corruptVault(): void {
    this.signOut();
    this.#outcomeCategory = "vault_corrupt";
    this.#trace.push("vault_corrupt");
  }

  background(): void {
    this.#trace.push("background");
  }

  foreground(): void {
    this.#trace.push("foreground");
  }

  terminateAndRelaunchWithoutTransaction(): void {
    this.#generation += 1;
    this.#pendingTimerGeneration = undefined;
    this.#hasCandidate = false;
    this.#verifiedOwner = undefined;
    this.#ownerWriteCount = 0;
    this.#state = "signed_out";
    this.#outcomeCategory = "success";
    this.#trace.push("terminated", "relaunch_without_transaction");
  }

  scheduleBoundedWork(): number {
    this.#pendingTimerGeneration = this.#generation;
    return this.#generation;
  }

  settleTimer(generation: number): boolean {
    if (generation !== this.#generation || this.#pendingTimerGeneration !== generation)
      return false;
    this.#pendingTimerGeneration = undefined;
    this.#state = "safe_terminal_error";
    this.#outcomeCategory = "timed_out";
    return true;
  }
}

const classifySyntheticCallback = (input: {
  url: string;
  purpose: PendingTransaction["purpose"];
  environment: PendingTransaction["environment"];
  now: number;
  store: InMemoryTransactionStore;
  provider: InMemoryAuthProvider;
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
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".test") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "" ||
    parsed.hash !== ""
  ) {
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
  const code = parsed.searchParams.get("code") ?? "";
  const stateValue = parsed.searchParams.get("state") ?? "";
  if (
    code.trim() === "" ||
    stateValue.trim() === "" ||
    code.length > 512 ||
    stateValue.length > 512
  ) {
    return malformed();
  }
  const consumed = input.store.consume({
    purpose: input.purpose,
    environment: input.environment,
    host: parsed.hostname,
    path: parsed.pathname,
    stateValue,
    now: input.now,
  });
  if (consumed.kind === "expired") return "expired";
  if (consumed.kind === "unmatched") return "replayed_or_unmatched";
  return input.provider.exchange(code, consumed.transaction.verifier)
    ? "success"
    : "provider_failure";
};

const evidenceIsClosed = (value: JsonObject, expectedSourceCommit: string): boolean => {
  const allowed = asStrings(acceptance.evidenceAllowedFields, "evidenceAllowedFields");
  const keys = Object.keys(value);
  if (keys.length !== allowed.length || !keys.every((key) => allowed.includes(key))) return false;
  if (!allowed.every((key) => Object.hasOwn(value, key))) return false;
  const constraints = asObject(acceptance.evidenceConstraints);
  const executionCount = value.executionCount;
  return (
    /^[0-9a-f]{40}$/.test(expectedSourceCommit) &&
    asStrings(acceptance.syntheticScenarioIds, "syntheticScenarioIds").includes(
      String(value.scenarioId),
    ) &&
    asStrings(constraints.platform, "platform").includes(String(value.platform)) &&
    asStrings(constraints.environment, "environment").includes(String(value.environment)) &&
    constraints.sourceCommit === "exact_head_supplied_by_runner" &&
    value.sourceCommit === expectedSourceCommit &&
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
      authStatePrivacyBoundaryReviewer: "Fernanda",
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
    expect(asObject(asObject(asObject(copy.states).unusable_link).primaryActionsByVariant)).toEqual(
      {
        withoutVerifiedSession: "Start again",
        withVerifiedSession: "Return to safe screen",
      },
    );
    expect(copy.identityLabel).toBe("Signed in");
    expect(asStrings(machine.publicStateFields, "publicStateFields")).toEqual([
      "state",
      "hasSessionCandidate",
      "hasVerifiedOwnerState",
      "safeDestinationId",
      "fixedOutcomeCategory",
    ]);
    expect(asStrings(machine.publicStateFields, "publicStateFields")).not.toContain(
      "authGeneration",
    );
    expect(
      restrictedPaths(states, asStrings(machine.publicStateForbiddenFields, "forbidden")),
    ).toEqual([]);
    expect(JSON.stringify(copy)).not.toMatch(/@|https?:\/\/|[0-9a-f]{8}-[0-9a-f-]{27,}/i);
  });

  it("accepts only fixed safe-destination identifiers and rejects route material", () => {
    expect(asStrings(machine.safeDestinationIds, "safeDestinationIds")).toEqual([
      "signed_out",
      "internal_foundation_home",
      "recovery_start",
      "previous_safe_screen",
    ]);
    for (const id of asStrings(machine.safeDestinationIds, "safeDestinationIds")) {
      expect(resolveSafeDestinationId(id)).toBe(id);
    }
    for (const unsafe of [
      "https://outside.example.test/path?next=/private#token",
      "/private/path",
      "%2Fprivate%3Ftoken%3Dsynthetic",
      "unknown_destination",
      "internal_foundation_home?next=outside",
    ]) {
      expect(resolveSafeDestinationId(unsafe)).toBeUndefined();
    }
    expect(machine.safeDestinationRule).toBe(
      "public_state_uses_only_fixed_ids_route_resolution_is_internal_and_never_accepts_uri_path_query_or_fragment",
    );
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

  it("defines a closed current-generation transition graph with bounded cancel and timeout targets", () => {
    const contract = asObject(machine.transitionContract);
    const transitions = asObjects(contract.transitions, "transitions");
    const stateIds = new Set(asObjects(machine.states, "states").map((state) => state.id));
    expect(contract).toMatchObject({
      clock: "injected",
      currentGenerationRequired: true,
      terminalRule: "exactly_one_target_state_after_ordered_effects_complete",
    });
    expect(asObject(contract.actionAvailabilityMilliseconds)).toEqual({
      cancel_after_bound: 500,
      provider_or_api_step_timeout: 15000,
      total_actionable_timeout: 30000,
    });
    expect(transitions.length).toBe(38);
    for (const transition of transitions) {
      expect(Object.keys(transition)).toEqual(["source", "event", "guard", "effects", "target"]);
      expect(stateIds.has(transition.source)).toBe(true);
      expect(stateIds.has(transition.target)).toBe(true);
      expect(String(transition.guard)).toContain("current_generation");
      expect(asStrings(transition.effects, "transition effects")[0]).toBe(
        "require_current_auth_generation",
      );
    }
    const eventKeys = transitions.map(
      (transition) =>
        `${String(transition.source)}:${String(transition.event)}:${String(transition.guard)}`,
    );
    expect(new Set(eventKeys).size).toBe(transitions.length);
    expect(
      transitions.find(
        (transition) =>
          transition.source === "initializing" && transition.event === "cold_callback_received",
      ),
    ).toMatchObject({ target: "callback_pending" });
    expect(
      transitions.find(
        (transition) =>
          transition.source === "authenticated" && transition.event === "warm_callback_received",
      ),
    ).toMatchObject({ target: "callback_pending" });
    expect(
      transitions.filter(
        (transition) => transition.source === "unusable_link" && transition.event === "start_again",
      ),
    ).toEqual([
      expect.objectContaining({
        guard: "current_generation_and_user_action_and_no_verified_session",
        target: "signed_out",
      }),
    ]);
    expect(
      transitions.filter(
        (transition) =>
          transition.source === "unusable_link" && transition.event === "return_to_safe_screen",
      ),
    ).toEqual([
      expect.objectContaining({
        guard: "current_generation_and_user_action_and_existing_session_and_get_auth_me_200",
        target: "authenticated",
      }),
    ]);
    for (const action of [
      "sign_in",
      "cancel_after_bound",
      "continue",
      "try_again",
      "return_to_sign_in",
      "start_again",
      "return_to_safe_screen",
    ]) {
      expect(transitions.some((transition) => transition.event === action)).toBe(true);
    }
    const stepTimeouts = transitions.filter(
      (transition) => transition.event === "provider_or_api_step_timeout",
    );
    expect(stepTimeouts).toHaveLength(4);
    expect(stepTimeouts.every((transition) => String(transition.guard).endsWith("15000"))).toBe(
      true,
    );
    const totalTimeouts = transitions.filter(
      (transition) => transition.event === "total_actionable_timeout",
    );
    expect(totalTimeouts).toHaveLength(4);
    expect(totalTimeouts.every((transition) => String(transition.guard).endsWith("30000"))).toBe(
      true,
    );
  });

  it("atomically consumes one exact synthetic callback and rejects replay", () => {
    const provider = new InMemoryAuthProvider();
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
      provider,
    };
    expect(classifySyntheticCallback(callback)).toBe("success");
    expect(store.hasPendingTransaction).toBe(false);
    expect(provider.exchangeCount).toBe(1);
    expect(provider.verifierWasUsed).toBe(true);
    expect(classifySyntheticCallback(callback)).toBe("replayed_or_unmatched");
    expect(provider.exchangeCount).toBe(1);
  });

  it("preserves a verified warm session when an unusable callback arrives", () => {
    const model = new SyntheticAuthCoordinator();
    model.seedVerifiedOwner();
    expect(model.beginCallback("warm")).toBe(true);
    const store = new InMemoryTransactionStore({
      purpose: "sign_in",
      environment: "development",
      host: "auth.dev.fluyo.test",
      path: "/native/auth/callback",
      stateValue: "synthetic-state",
      verifier: "opaque-verifier",
      expiresAt: 2_000,
    });
    const provider = new InMemoryAuthProvider();
    expect(
      classifySyntheticCallback({
        url: "not-a-url",
        purpose: "sign_in",
        environment: "development",
        now: 1_000,
        store,
        provider,
      }),
    ).toBe("malformed");
    model.markCallbackUnusable("malformed", true);
    expect(model.publicSnapshot()).toEqual({
      state: "authenticated",
      hasSessionCandidate: true,
      hasVerifiedOwnerState: true,
      safeDestinationId: "internal_foundation_home",
      fixedOutcomeCategory: "malformed",
    });
    expect(store.hasPendingTransaction).toBe(false);
    expect(provider.exchangeCount).toBe(0);
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
      "opaque_state_nonce_and_verifier_exist_only_in_memory_inside_callback_transaction_store_until_atomic_consume_expiry_cancel_or_cleanup_then_are_wiped_and_are_never_emitted",
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
      provider: new InMemoryAuthProvider(),
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
    ).toBe("expired");
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
    for (const url of [
      "https://user:password@auth.staging.fluyo.test/native/recovery/callback?code=synthetic&state=synthetic-state",
      "https://auth.staging.fluyo.test:444/native/recovery/callback?code=synthetic&state=synthetic-state",
      "https://auth.staging.fluyo.test/native/recovery/callback?code=&state=synthetic-state",
      "https://auth.staging.fluyo.test/native/recovery/callback?code=synthetic&state=",
    ]) {
      const store = makeStore();
      const provider = new InMemoryAuthProvider();
      expect(classifySyntheticCallback({ ...base, url, store, provider })).toBe("malformed");
      expect(store.hasPendingTransaction).toBe(false);
      expect(provider.exchangeCount).toBe(0);
    }
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

  it("executes every shared synthetic lifecycle path with private generation and zero telemetry", () => {
    const runCallback = (
      url: string,
      now = 1_000,
      repeatCategory?: "replayed" | "duplicate",
      warm = false,
    ): SyntheticAuthCoordinator => {
      const model = new SyntheticAuthCoordinator();
      if (warm) model.seedVerifiedOwner();
      expect(model.beginCallback(warm ? "warm" : "cold")).toBe(true);
      const store = new InMemoryTransactionStore({
        purpose: "sign_in",
        environment: "development",
        host: "auth.dev.fluyo.test",
        path: "/native/auth/callback",
        stateValue: "synthetic-state",
        verifier: "opaque-verifier",
        expiresAt: 2_000,
      });
      const provider = new InMemoryAuthProvider();
      const input = {
        url,
        purpose: "sign_in" as const,
        environment: "development" as const,
        now,
        store,
        provider,
      };
      const outcome = classifySyntheticCallback(input);
      if (outcome === "success") model.seedVerifiedOwner();
      else if (outcome === "expired") model.markCallbackUnusable("expired", warm);
      else if (outcome === "malformed") model.markCallbackUnusable("malformed", warm);
      else model.markCallbackUnusable("unsupported", warm);
      if (repeatCategory) {
        expect(classifySyntheticCallback(input)).toBe("replayed_or_unmatched");
        expect(provider.exchangeCount).toBe(1);
        model.markCallbackUnusable(repeatCategory, true);
      }
      model.recordCallbackEvidence(provider.exchangeCount, store.hasPendingTransaction);
      return model;
    };
    const validCallback =
      "https://auth.dev.fluyo.test/native/auth/callback?code=synthetic&state=synthetic-state";
    const executions: Record<string, () => SyntheticAuthCoordinator> = {
      cold_start_without_candidate: () => {
        const model = new SyntheticAuthCoordinator();
        model.initialize(false, true);
        return model;
      },
      cold_start_with_candidate: () => {
        const model = new SyntheticAuthCoordinator();
        model.initialize(true, true);
        return model;
      },
      warm_callback_success: () => runCallback(validCallback, 1_000, undefined, true),
      cold_callback_success: () => runCallback(validCallback),
      callback_cancel: () => {
        const model = new SyntheticAuthCoordinator();
        expect(model.beginCallback("cold")).toBe(true);
        const store = new InMemoryTransactionStore({
          purpose: "sign_in",
          environment: "development",
          host: "auth.dev.fluyo.test",
          path: "/native/auth/callback",
          stateValue: "synthetic-state",
          verifier: "opaque-verifier",
          expiresAt: 2_000,
        });
        store.clear();
        model.cancelCallback();
        model.recordCallbackEvidence(0, store.hasPendingTransaction);
        return model;
      },
      callback_malformed: () => runCallback("not-a-url"),
      callback_expired: () => runCallback(validCallback, 2_001),
      callback_replay: () => runCallback(validCallback, 1_000, "replayed"),
      callback_duplicate_delivery: () => runCallback(validCallback, 1_000, "duplicate"),
      callback_unsupported: () =>
        runCallback("https://outside.test/unsupported?code=synthetic&state=synthetic-state"),
      callback_overlap_rejected: () => {
        const model = new SyntheticAuthCoordinator();
        expect(model.beginCallback("cold")).toBe(true);
        expect(model.beginCallback("cold")).toBe(false);
        model.recordCallbackEvidence(0, true);
        return model;
      },
      refresh_success: () => {
        const model = new SyntheticAuthCoordinator();
        model.seedVerifiedOwner();
        model.refresh("success");
        return model;
      },
      refresh_explicit_revocation: () => {
        const model = new SyntheticAuthCoordinator();
        model.seedVerifiedOwner();
        model.refresh("invalid");
        return model;
      },
      refresh_transient_failure_preserves_candidate: () => {
        const model = new SyntheticAuthCoordinator();
        model.seedVerifiedOwner();
        model.refresh("transient");
        return model;
      },
      refresh_repeated_401_clears: () => {
        const model = new SyntheticAuthCoordinator();
        model.seedVerifiedOwner();
        model.auth401();
        model.auth401();
        return model;
      },
      forbidden_403_preserves_session: () => {
        const model = new SyntheticAuthCoordinator();
        model.seedVerifiedOwner();
        model.refresh("forbidden");
        return model;
      },
      offline_startup_preserves_verified_display_only: () => {
        const model = new SyntheticAuthCoordinator();
        model.initialize(true, false);
        return model;
      },
      background_foreground: () => {
        const model = new SyntheticAuthCoordinator();
        model.seedVerifiedOwner();
        model.background();
        model.foreground();
        return model;
      },
      termination_relaunch_without_transaction: () => {
        const model = new SyntheticAuthCoordinator();
        expect(model.beginCallback("cold")).toBe(true);
        const store = new InMemoryTransactionStore({
          purpose: "sign_in",
          environment: "development",
          host: "auth.dev.fluyo.test",
          path: "/native/auth/callback",
          stateValue: "synthetic-state",
          verifier: "opaque-verifier",
          expiresAt: 2_000,
        });
        store.clear();
        model.terminateAndRelaunchWithoutTransaction();
        model.recordCallbackEvidence(0, store.hasPendingTransaction);
        return model;
      },
      account_switch_cleanup: () => {
        const model = new SyntheticAuthCoordinator();
        model.seedVerifiedOwner();
        const oldGeneration = model.captureGeneration();
        const oldTimerGeneration = model.scheduleBoundedWork();
        expect(model.applyOwnerWrite(oldGeneration)).toBe(true);
        model.switchAccount();
        expect(model.settleTimer(oldTimerGeneration)).toBe(false);
        expect(model.applyOwnerWrite(oldGeneration)).toBe(false);
        expect(model.ownerWriteCount).toBe(0);
        return model;
      },
      stale_response_discarded: () => {
        const model = new SyntheticAuthCoordinator();
        model.seedVerifiedOwner();
        const staleGeneration = model.captureGeneration();
        model.switchAccount();
        expect(model.confirmOwner(staleGeneration, Symbol.for("old"), Symbol.for("old"))).toBe(
          false,
        );
        return model;
      },
      stale_storage_write_discarded: () => {
        const model = new SyntheticAuthCoordinator();
        model.seedVerifiedOwner();
        const staleGeneration = model.captureGeneration();
        model.signOut();
        expect(model.applyOwnerWrite(staleGeneration)).toBe(false);
        return model;
      },
      vault_corruption_cleanup: () => {
        const model = new SyntheticAuthCoordinator();
        model.seedVerifiedOwner();
        model.corruptVault();
        return model;
      },
      clock_skew: () => runCallback(validCallback, Number.MAX_SAFE_INTEGER),
      owner_subject_mismatch: () => {
        const model = new SyntheticAuthCoordinator();
        const generation = model.captureGeneration();
        expect(model.confirmOwner(generation, Symbol("candidate"), Symbol("response"))).toBe(false);
        return model;
      },
      zero_telemetry_launch: () => {
        const model = new SyntheticAuthCoordinator();
        model.initialize(false, true);
        return model;
      },
      zero_telemetry_resume: () => {
        const model = new SyntheticAuthCoordinator();
        model.seedVerifiedOwner();
        model.goOffline();
        return model;
      },
      zero_telemetry_error: () => {
        const model = new SyntheticAuthCoordinator();
        const timerGeneration = model.scheduleBoundedWork();
        expect(model.settleTimer(timerGeneration)).toBe(true);
        return model;
      },
    };
    type Expected = readonly [
      SyntheticState,
      string,
      boolean,
      boolean,
      string,
      number,
      boolean,
      number,
      number,
      readonly string[],
    ];
    const expected: Record<string, Expected> = {
      cold_start_without_candidate: [
        "signed_out",
        "success",
        false,
        false,
        "signed_out",
        0,
        false,
        1,
        0,
        ["initialize"],
      ],
      cold_start_with_candidate: [
        "authenticated",
        "success",
        true,
        true,
        "internal_foundation_home",
        0,
        false,
        1,
        0,
        ["initialize", "owner_confirmed"],
      ],
      warm_callback_success: [
        "authenticated",
        "success",
        true,
        true,
        "internal_foundation_home",
        1,
        false,
        1,
        0,
        ["verified_owner_seeded", "warm_callback_received"],
      ],
      cold_callback_success: [
        "authenticated",
        "success",
        true,
        true,
        "internal_foundation_home",
        1,
        false,
        1,
        0,
        ["cold_callback_received"],
      ],
      callback_cancel: [
        "signed_out",
        "canceled",
        false,
        false,
        "signed_out",
        0,
        false,
        1,
        0,
        ["cold_callback_received", "callback_canceled"],
      ],
      callback_malformed: [
        "unusable_link",
        "malformed",
        false,
        false,
        "signed_out",
        0,
        false,
        1,
        0,
        ["callback_malformed"],
      ],
      callback_expired: [
        "unusable_link",
        "expired",
        false,
        false,
        "signed_out",
        0,
        false,
        1,
        0,
        ["callback_expired"],
      ],
      callback_replay: [
        "authenticated",
        "replayed",
        true,
        true,
        "internal_foundation_home",
        1,
        false,
        1,
        0,
        ["callback_replayed"],
      ],
      callback_duplicate_delivery: [
        "authenticated",
        "duplicate",
        true,
        true,
        "internal_foundation_home",
        1,
        false,
        1,
        0,
        ["callback_duplicate"],
      ],
      callback_unsupported: [
        "unusable_link",
        "unsupported",
        false,
        false,
        "signed_out",
        0,
        false,
        1,
        0,
        ["callback_unsupported"],
      ],
      callback_overlap_rejected: [
        "callback_pending",
        "overlap_rejected",
        false,
        false,
        "signed_out",
        0,
        true,
        1,
        0,
        ["callback_overlap_rejected"],
      ],
      refresh_success: [
        "authenticated",
        "success",
        true,
        true,
        "internal_foundation_home",
        0,
        false,
        1,
        0,
        ["verified_owner_seeded"],
      ],
      refresh_explicit_revocation: [
        "expired_or_revoked",
        "reauthentication_required",
        false,
        false,
        "signed_out",
        0,
        false,
        2,
        0,
        ["signed_out"],
      ],
      refresh_transient_failure_preserves_candidate: [
        "offline_session_candidate",
        "transient_failure",
        true,
        true,
        "signed_out",
        0,
        false,
        1,
        0,
        ["verified_owner_seeded"],
      ],
      refresh_repeated_401_clears: [
        "expired_or_revoked",
        "reauthentication_required",
        false,
        false,
        "signed_out",
        0,
        false,
        2,
        0,
        ["signed_out"],
      ],
      forbidden_403_preserves_session: [
        "authenticated",
        "forbidden",
        true,
        true,
        "internal_foundation_home",
        0,
        false,
        1,
        0,
        ["verified_owner_seeded"],
      ],
      offline_startup_preserves_verified_display_only: [
        "offline_session_candidate",
        "success",
        true,
        false,
        "signed_out",
        0,
        false,
        1,
        0,
        ["initialize"],
      ],
      background_foreground: [
        "authenticated",
        "success",
        true,
        true,
        "internal_foundation_home",
        0,
        false,
        1,
        0,
        ["background", "foreground"],
      ],
      termination_relaunch_without_transaction: [
        "signed_out",
        "success",
        false,
        false,
        "signed_out",
        0,
        false,
        2,
        0,
        ["terminated", "relaunch_without_transaction"],
      ],
      account_switch_cleanup: [
        "account_switching",
        "stale_generation_discarded",
        false,
        false,
        "signed_out",
        0,
        false,
        2,
        0,
        ["account_switch_started"],
      ],
      stale_response_discarded: [
        "account_switching",
        "stale_generation_discarded",
        false,
        false,
        "signed_out",
        0,
        false,
        2,
        0,
        ["account_switch_started"],
      ],
      stale_storage_write_discarded: [
        "signed_out",
        "stale_generation_discarded",
        false,
        false,
        "signed_out",
        0,
        false,
        2,
        0,
        ["signed_out"],
      ],
      vault_corruption_cleanup: [
        "signed_out",
        "vault_corrupt",
        false,
        false,
        "signed_out",
        0,
        false,
        2,
        0,
        ["vault_corrupt"],
      ],
      clock_skew: [
        "unusable_link",
        "expired",
        false,
        false,
        "signed_out",
        0,
        false,
        1,
        0,
        ["callback_expired"],
      ],
      owner_subject_mismatch: [
        "expired_or_revoked",
        "owner_mismatch",
        false,
        false,
        "signed_out",
        0,
        false,
        1,
        0,
        [],
      ],
      zero_telemetry_launch: [
        "signed_out",
        "success",
        false,
        false,
        "signed_out",
        0,
        false,
        1,
        0,
        ["initialize"],
      ],
      zero_telemetry_resume: [
        "offline_session_candidate",
        "success",
        true,
        true,
        "signed_out",
        0,
        false,
        1,
        0,
        ["offline"],
      ],
      zero_telemetry_error: [
        "safe_terminal_error",
        "timed_out",
        false,
        false,
        "signed_out",
        0,
        false,
        1,
        0,
        [],
      ],
    };
    expect(Object.keys(executions)).toEqual(
      asStrings(acceptance.syntheticScenarioIds, "syntheticScenarioIds"),
    );
    expect(Object.keys(expected)).toEqual(Object.keys(executions));
    for (const [scenarioId, execute] of Object.entries(executions)) {
      const model = execute();
      const snapshot = model.publicSnapshot();
      const wanted = expected[scenarioId];
      expect(wanted, scenarioId).toBeDefined();
      const [
        state,
        outcome,
        candidate,
        owner,
        destination,
        exchanges,
        pending,
        generation,
        writes,
        trace,
      ] = wanted!;
      expect(Object.keys(snapshot)).toEqual(
        asStrings(machine.publicStateFields, "publicStateFields"),
      );
      expect(
        restrictedPaths(snapshot, asStrings(machine.publicStateForbiddenFields, "forbidden")),
      ).toEqual([]);
      expect(resolveSafeDestinationId(String(snapshot.safeDestinationId))).toBeDefined();
      expect(snapshot, scenarioId).toEqual({
        state,
        hasSessionCandidate: candidate,
        hasVerifiedOwnerState: owner,
        safeDestinationId: destination,
        fixedOutcomeCategory: outcome,
      });
      expect(model.exchangeCount, scenarioId).toBe(exchanges);
      expect(model.hasPendingTransaction, scenarioId).toBe(pending);
      expect(model.generation, scenarioId).toBe(generation);
      expect(model.ownerWriteCount, scenarioId).toBe(writes);
      for (const marker of trace) expect(model.testTrace, scenarioId).toContain(marker);
      expect(model.telemetry, scenarioId).toEqual({
        calls: 0,
        queuedEvents: 0,
        serializations: 0,
        diskWrites: 0,
        networkRequests: 0,
        retainedTimestamps: 0,
        correlationIdentifiers: 0,
        retries: 0,
      });
    }
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
    const expectedSourceCommit = "b".repeat(40);
    const valid = {
      scenarioId: "callback_replay",
      platform: "shared_contract",
      environment: "repository_only",
      sourceCommit: expectedSourceCommit,
      outcomeCategory: "replayed",
      executionCount: 1,
      artifactSha256: "a".repeat(64),
      scanResult: "passed",
    };
    expect(evidenceIsClosed(valid, expectedSourceCommit)).toBe(true);
    expect(evidenceIsClosed({ ...valid, sourceCommit: "not-a-sha" }, "not-a-sha")).toBe(false);
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
      expect(
        evidenceIsClosed({ ...valid, [extra]: "synthetic-forbidden" }, expectedSourceCommit),
      ).toBe(false);
    }
    expect(
      evidenceIsClosed({ ...valid, outcomeCategory: "raw failure text" }, expectedSourceCommit),
    ).toBe(false);
    expect(
      evidenceIsClosed({ ...valid, scenarioId: "learner@example.test" }, expectedSourceCommit),
    ).toBe(false);
    expect(
      evidenceIsClosed({ ...valid, scenarioId: "unlisted_benign_scenario" }, expectedSourceCommit),
    ).toBe(false);
    expect(evidenceIsClosed({ ...valid, executionCount: 1.5 }, expectedSourceCommit)).toBe(false);
    expect(evidenceIsClosed({ ...valid, executionCount: 1001 }, expectedSourceCommit)).toBe(false);
    expect(evidenceIsClosed({ ...valid, sourceCommit: "a".repeat(40) }, expectedSourceCommit)).toBe(
      false,
    );
    expect(evidenceIsClosed({ ...valid, platform: "ios_future" }, expectedSourceCommit)).toBe(
      false,
    );
    expect(evidenceIsClosed({ ...valid, platform: "android_future" }, expectedSourceCommit)).toBe(
      false,
    );
  });

  it("rejects every adversarial family through the closed evidence boundary", () => {
    const expectedSourceCommit = "c".repeat(40);
    const valid = {
      scenarioId: "callback_replay",
      platform: "shared_contract",
      environment: "repository_only",
      sourceCommit: expectedSourceCommit,
      outcomeCategory: "replayed",
      executionCount: 1,
      artifactSha256: "d".repeat(64),
      scanResult: "passed",
    };
    const mutations: Record<string, string> = {
      token_shaped_string: "header.payload.signature",
      full_email: "learner@example.test",
      uuid: "11111111-2222-4333-8444-555555555555",
      windows_path: "C:\\Users\\private\\result.txt",
      unix_path: "/home/private/result.txt",
      callback_url: "https://auth.example.test/callback",
      query_fragment: "?code=secret#token=secret",
      provider_exception: "ProviderException: private detail",
      private_exception_name: "PrivateAuthCoordinatorException",
      header_body: "Authorization: Bearer secret body=private",
      stdout_stderr: "stdout private stderr private",
      prior_owner_marker: "previous-owner-private",
      test_account_variable_reference: "FLUYO_TEST_ADRIANA_EMAIL",
    };
    expect(Object.keys(mutations)).toEqual(
      asStrings(acceptance.adversarialMutationFamilies, "adversarialMutationFamilies"),
    );
    for (const value of Object.values(mutations)) {
      for (const field of [
        "scenarioId",
        "platform",
        "environment",
        "outcomeCategory",
        "artifactSha256",
        "scanResult",
      ]) {
        expect(evidenceIsClosed({ ...valid, [field]: value }, expectedSourceCommit)).toBe(false);
      }
      expect(evidenceIsClosed({ ...valid, sourceCommit: value }, value)).toBe(false);
    }
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
