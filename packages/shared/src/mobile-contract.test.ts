import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { BILLING_PATHS } from "./billing";
import { HEALTH_PATHS, IDENTITY_PATHS, PROFILE_PATHS } from "./constants";
import { LEARNING_PATHS } from "./learning";

type JsonObject = Record<string, unknown>;

const contractDirectory = resolve(__dirname, "../../../contracts/mobile/v1");
const openapi = JSON.parse(
  readFileSync(resolve(contractDirectory, "openapi.json"), "utf8"),
) as JsonObject;
const bundle = JSON.parse(
  readFileSync(resolve(contractDirectory, "fixtures.json"), "utf8"),
) as JsonObject;
const manifest = JSON.parse(
  readFileSync(resolve(contractDirectory, "manifest.json"), "utf8"),
) as JsonObject;

const asObject = (value: unknown, label = "value"): JsonObject => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonObject;
};

const schemaMap = asObject(asObject(openapi.components).schemas);
const cases = asObject(bundle.cases);
const paths = asObject(openapi.paths);

const resolveSchema = (schema: JsonObject): JsonObject => {
  const reference = schema.$ref;
  if (typeof reference !== "string") return schema;
  const name = reference.split("/").at(-1);
  if (!name) throw new Error(`Invalid schema reference: ${reference}`);
  return asObject(schemaMap[name], name);
};

const validate = (value: unknown, unresolved: JsonObject, path = "body"): string[] => {
  const schema = resolveSchema(unresolved);
  const oneOf = schema.oneOf;
  if (Array.isArray(oneOf)) {
    const branches = oneOf.map((branch) => validate(value, asObject(branch), path));
    return branches.some((errors) => errors.length === 0)
      ? []
      : [`${path} did not match any oneOf branch`];
  }

  if (Object.hasOwn(schema, "const") && value !== schema.const) {
    return [`${path} must equal ${String(schema.const)}`];
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return [`${path} is outside the enum`];
  }

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (value === null) return types.includes("null") ? [] : [`${path} must not be null`];
  const actualType = Array.isArray(value) ? "array" : typeof value;
  const typeMatches =
    types.includes(actualType) || (actualType === "number" && types.includes("integer"));
  if (schema.type !== undefined && !typeMatches) {
    return [`${path} expected ${types.join("|")} but received ${actualType}`];
  }

  if (actualType === "object") {
    const objectValue = asObject(value, path);
    const properties = asObject(schema.properties ?? {});
    const required = Array.isArray(schema.required) ? schema.required : [];
    const errors = required
      .filter((key): key is string => typeof key === "string" && !(key in objectValue))
      .map((key) => `${path}.${key} is required`);
    if (schema.additionalProperties === false) {
      errors.push(
        ...Object.keys(objectValue)
          .filter((key) => !(key in properties))
          .map((key) => `${path}.${key} is not allowed`),
      );
    }
    for (const [key, child] of Object.entries(objectValue)) {
      if (key in properties)
        errors.push(...validate(child, asObject(properties[key]), `${path}.${key}`));
    }
    return errors;
  }

  if (actualType === "array") {
    const arrayValue = value as unknown[];
    const errors: string[] = [];
    if (typeof schema.minItems === "number" && arrayValue.length < schema.minItems) {
      errors.push(`${path} has too few items`);
    }
    if (schema.items) {
      arrayValue.forEach((item, index) => {
        errors.push(...validate(item, asObject(schema.items), `${path}[${index}]`));
      });
    }
    return errors;
  }

  if (actualType === "string") {
    const stringValue = value as string;
    const errors: string[] = [];
    if (typeof schema.minLength === "number" && stringValue.length < schema.minLength) {
      errors.push(`${path} is shorter than minLength`);
    }
    if (typeof schema.maxLength === "number" && stringValue.length > schema.maxLength) {
      errors.push(`${path} is longer than maxLength`);
    }
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(stringValue)) {
      errors.push(`${path} does not match pattern`);
    }
    if (
      schema.format === "uuid" &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        stringValue,
      )
    ) {
      errors.push(`${path} is not a UUID`);
    }
    if (schema.format === "date-time" && Number.isNaN(Date.parse(stringValue))) {
      errors.push(`${path} is not a date-time`);
    }
    return errors;
  }

  if (actualType === "number") {
    const numberValue = value as number;
    const errors: string[] = [];
    if (schema.type === "integer" && !Number.isInteger(numberValue))
      errors.push(`${path} is not an integer`);
    if (typeof schema.minimum === "number" && numberValue < schema.minimum)
      errors.push(`${path} is below minimum`);
    if (typeof schema.maximum === "number" && numberValue > schema.maximum)
      errors.push(`${path} is above maximum`);
    return errors;
  }

  return [];
};

const dereferenceName = (schema: JsonObject): string | null => {
  const reference = schema.$ref;
  return typeof reference === "string" ? (reference.split("/").at(-1) ?? null) : null;
};

const operationEntries = () =>
  Object.entries(paths).flatMap(([path, pathValue]) =>
    Object.entries(asObject(pathValue))
      .filter(([method]) => ["get", "post", "put", "patch", "delete"].includes(method))
      .map(([method, operation]) => ({
        path,
        method: method.toUpperCase(),
        operation: asObject(operation),
      })),
  );

const expectedOperations: Record<string, [string, string, boolean]> = {
  getHealth: ["GET", HEALTH_PATHS.service, false],
  getDatabaseHealth: ["GET", HEALTH_PATHS.database, false],
  getCurrentIdentity: ["GET", IDENTITY_PATHS.current, true],
  getCurrentProfile: ["GET", PROFILE_PATHS.current, true],
  updateCurrentProfile: ["PUT", PROFILE_PATHS.current, true],
  getBillingStatus: ["GET", BILLING_PATHS.status, true],
  getLearningDashboard: ["GET", LEARNING_PATHS.dashboard, true],
  listLessons: ["GET", LEARNING_PATHS.lessons, true],
  getLesson: ["GET", LEARNING_PATHS.lesson.replace(":lessonId", "{lessonId}"), true],
  listPhraseDecks: ["GET", LEARNING_PATHS.phraseDecks, true],
  submitActivityAttempt: [
    "POST",
    LEARNING_PATHS.activityAttempts.replace(":activityId", "{activityId}"),
    true,
  ],
  getLearningGoal: ["GET", LEARNING_PATHS.goal, true],
  updateLearningGoal: ["PUT", LEARNING_PATHS.goal, true],
  getLearningPreference: ["GET", LEARNING_PATHS.preferences, true],
  updateLearningPreference: ["PUT", LEARNING_PATHS.preferences, true],
  getNotificationPreference: ["GET", LEARNING_PATHS.notificationPreferences, true],
  updateNotificationPreference: ["PUT", LEARNING_PATHS.notificationPreferences, true],
};

describe("mobile v1 contract bundle", () => {
  it("keeps the manifest, OpenAPI version, fixture header, and bundle files consistent", () => {
    const version = manifest.bundleVersion;
    expect(version).toBe("1.0.0");
    expect(asObject(openapi.info).version).toBe(version);
    expect(bundle.contractVersion).toBe(version);
    expect(bundle.sourceCommit).toBe(manifest.sourceImplementationCommit);
    expect(bundle.lastValidationDate).toBe(manifest.lastValidationDate);
    expect(String(manifest.sourceImplementationCommit)).toMatch(/^[0-9a-f]{40}$/);
    expect(String(manifest.lastValidationDate)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(manifest.productionDataUsed).toBe(false);
    expect(readdirSync(contractDirectory).sort()).toEqual(
      (manifest.files as string[]).slice().sort(),
    );
  });

  it("matches the implemented route inventory and excludes non-mobile or nonexistent APIs", () => {
    const actual = Object.fromEntries(
      operationEntries().map(({ path, method, operation }) => [
        String(operation.operationId),
        [method, path, Array.isArray(operation.security) && operation.security.length > 0],
      ]),
    );
    expect(actual).toEqual(expectedOperations);
    const serializedPaths = JSON.stringify(Object.keys(paths));
    for (const excluded of [
      BILLING_PATHS.checkoutSessions,
      BILLING_PATHS.portalSessions,
      "/billing/webhooks/stripe",
      "/learning/export",
      "/learning/delete",
      "/auth/callback",
      "/telemetry",
      "/revenuecat",
      "/campaigns",
      "/testers",
    ])
      expect(serializedPaths).not.toContain(excluded);
  });

  it("uses exact reachable status sets for every operation", () => {
    const expected: Record<string, string[]> = {
      getHealth: ["200", "500"],
      getDatabaseHealth: ["200", "503"],
      getCurrentIdentity: ["200", "401", "500"],
      getCurrentProfile: ["200", "401", "500"],
      updateCurrentProfile: ["200", "400", "401", "500"],
      getBillingStatus: ["200", "401", "500"],
      getLearningDashboard: ["200", "401", "500"],
      listLessons: ["200", "400", "401", "500"],
      getLesson: ["200", "400", "401", "404", "500"],
      listPhraseDecks: ["200", "400", "401", "500"],
      submitActivityAttempt: ["200", "400", "401", "404", "409", "429", "500", "503"],
      getLearningGoal: ["200", "401", "500"],
      updateLearningGoal: ["200", "400", "401", "500"],
      getLearningPreference: ["200", "401", "500"],
      updateLearningPreference: ["200", "400", "401", "500"],
      getNotificationPreference: ["200", "401", "500"],
      updateNotificationPreference: ["200", "400", "401", "500"],
    };
    for (const { operation } of operationEntries()) {
      const expectedStatuses = expected[String(operation.operationId)];
      expect(expectedStatuses).toBeDefined();
      expect(Object.keys(asObject(operation.responses)).sort()).toEqual(expectedStatuses?.sort());
    }
  });

  it("validates every fixture against its request or response schema", () => {
    const operations = new Map(
      operationEntries().map(({ operation }) => [String(operation.operationId), operation]),
    );
    for (const [fixtureId, rawFixture] of Object.entries(cases)) {
      const fixture = asObject(rawFixture, fixtureId);
      const schemaName = String(fixture.schema);
      expect(validate(fixture.body, asObject(schemaMap[schemaName]), fixtureId)).toEqual([]);
      expect(fixture.fixtureId).toBe(fixtureId);
      expect(fixture.fixturePath).toBe(`fixtures.json#/cases/${fixtureId}`);
      if (fixture.operationId === "sharedErrorEnvelope") continue;
      const operation = operations.get(String(fixture.operationId));
      expect(operation, fixtureId).toBeDefined();
      if (fixture.direction === "request") {
        const requestBody = asObject(operation?.requestBody);
        const content = asObject(requestBody.content);
        const wireSchema = asObject(asObject(content["application/json"]).schema);
        expect(dereferenceName(wireSchema)).toBe(schemaName);
      } else {
        const responses = asObject(operation?.responses);
        const wireResponse = asObject(responses[String(fixture.status)]);
        const content = asObject(wireResponse.content);
        const wireSchema = asObject(asObject(content["application/json"]).schema);
        expect(dereferenceName(wireSchema)).toBe(schemaName);
      }
    }
  });

  it("provides a success fixture for every operation and complete client state fixtures", () => {
    const successOperations = new Set(
      Object.values(cases)
        .map((value) => asObject(value))
        .filter((fixture) => fixture.direction === "response" && fixture.status === 200)
        .map((fixture) => String(fixture.operationId)),
    );
    for (const operationId of Object.keys(expectedOperations))
      expect(successOperations.has(operationId)).toBe(true);
    for (const fixtureId of [
      "identity_email_absent",
      "identity_second_owner",
      "profile_empty",
      "profile_updated",
      "profile_cleared",
      "billing_empty",
      "billing_active",
      "billing_past_due_grace",
      "billing_no_access",
      "dashboard_first_use",
      "dashboard_all_visible_complete",
      "dashboard_catalog_empty",
      "dashboard_entitlement_required",
      "lessons_empty",
      "phrase_decks_empty",
      "attempt_correct",
      "attempt_incorrect",
      "attempt_replay",
      "attempt_repeat_correct_no_second_award",
      "goal_updated",
      "learning_preference_updated",
      "notification_preference_updated",
    ])
      expect(cases).toHaveProperty(fixtureId);
  });

  it("models idempotent replay, conflicts, and no second progress award", () => {
    const request = asObject(cases.attempt_request_initial);
    const replayRequest = asObject(cases.attempt_request_replay);
    const conflictRequest = asObject(cases.attempt_request_conflict);
    expect(replayRequest.body).toEqual(request.body);
    expect(replayRequest.headers).toEqual(request.headers);
    expect(conflictRequest.headers).toEqual(request.headers);
    expect(conflictRequest.body).not.toEqual(request.body);
    expect(asObject(cases.attempt_replay).body).toEqual(asObject(cases.attempt_correct).body);
    const firstProgress = asObject(asObject(cases.attempt_correct).body).progress;
    const repeatProgress = asObject(
      asObject(cases.attempt_repeat_correct_no_second_award).body,
    ).progress;
    expect(repeatProgress).toEqual(firstProgress);
  });

  it("keeps errors safe, correlation-consistent, and Retry-After bounded", () => {
    const errorCases = Object.entries(cases).filter(([id]) => id.startsWith("error_"));
    const covered = new Set<string>();
    for (const [id, raw] of errorCases) {
      const fixture = asObject(raw);
      const body = asObject(fixture.body);
      const error = asObject(body.error);
      const headers = asObject(fixture.headers);
      expect(Object.keys(body)).toEqual(["error"]);
      expect(Object.keys(error).sort()).toEqual(["code", "correlationId", "details", "message"]);
      expect(headers["x-correlation-id"]).toBe(error.correlationId);
      expect(String(error.correlationId)).toMatch(/^[A-Za-z0-9_-]{1,200}$/);
      covered.add(String(fixture.status));
      if (fixture.status === 429) {
        expect(headers["Retry-After"]).toBe("12");
        expect(asObject(error.details).retryAfterSeconds).toBe(12);
      } else {
        expect(error.details, id).toEqual({});
      }
    }
    expect([...covered].sort()).toEqual(["400", "401", "403", "404", "409", "429", "500", "503"]);
    expect(asObject(cases.error_access_denied).operationId).toBe("sharedErrorEnvelope");
  });

  it("separates database health 503 from the safe learning-write 503 envelope", () => {
    expect(asObject(cases.database_health_unavailable).schema).toBe("DatabaseHealthResponse");
    expect(asObject(cases.error_service_unavailable).schema).toBe("ApiErrorResponse");
  });

  it("contains deterministic synthetic data and no provider, secret, or campaign leakage", () => {
    expect(bundle.productionDataUsed).toBe(false);
    expect(bundle.marketingAttribution).toBe("absent");
    expect(bundle.marketingConsent).toBe("absent");
    expect(bundle.adPlatformExport).toBe("prohibited");
    const portableOpenapi = structuredClone(openapi);
    delete asObject(portableOpenapi.components).securitySchemes;
    const inspected = JSON.stringify({ openapi: portableOpenapi, bundle, manifest });
    for (const denied of [
      /utm_/i,
      /gclid|gbraid|wbraid|fbclid|ttclid/i,
      /advertising.?id|install.?referrer/i,
      /campaign.?id|ad.?set.?id/i,
      /authorization.?code|cookie|pkce|client.?secret|webhook.?signature/i,
      /access.?token|refresh.?token|id.?token|session.?token|purchase.?token|api.?key/i,
      /\b(?:cus|sub|price|evt|sk|whsec)_[A-Za-z0-9_]+/,
      /supabase|stripe|revenuecat/i,
      /apple.?receipt|google.?receipt|provider.?payload/i,
      /ip.?address|user.?agent|device.?id|hardware.?serial|push.?token/i,
      /stack.?trace|sql.?query|filesystem.?path|DATABASE_URL|NODE_ENV|[A-Z]:\\Users\\|\/home\//i,
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    ])
      expect(inspected).not.toMatch(denied);
    const bodyText = JSON.stringify(
      Object.fromEntries(Object.entries(cases).map(([id, value]) => [id, asObject(value).body])),
    );
    const emails = bodyText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
    expect(emails.every((email) => email.endsWith(".test"))).toBe(true);
    expect(bodyText).not.toMatch(/https?:\/\//i);
  });

  it("rejects answer, validation, request-hash, owner, and provider internals in public schemas", () => {
    const forbiddenProperty =
      /(?:answer|correct(?:choice|answer)|validation|requesthash|ownerid|userid|provider(?:id|payload|object)|stripecustomerid|customerid|subscriptionid|subjectid|receipt|purchase.?token|device.?id|advertising.?id|access.?token|refresh.?token|session.?token|authorization|cookie|password|secret|private.?key|stack.?trace|sql|file.?path|environment)/i;
    const visitProperties = (
      schemaName: string,
      schema: JsonObject,
      prefix = schemaName,
    ): string[] => {
      const properties = schema.properties;
      if (properties === undefined) return [];
      return Object.entries(asObject(properties)).flatMap(([name, child]) => {
        const path = `${prefix}.${name}`;
        const errors =
          forbiddenProperty.test(name) &&
          !(schemaName === "SubmitActivityAttemptRequest" && name === "selectedChoiceId")
            ? [path]
            : [];
        return errors.concat(visitProperties(schemaName, asObject(child), path));
      });
    };
    const violations = Object.entries(schemaMap).flatMap(([name, schema]) =>
      visitProperties(name, asObject(schema)),
    );
    expect(violations).toEqual([]);

    for (const fixture of Object.values(cases).map((value) => asObject(value))) {
      const bodyKeys: string[] = [];
      const visitBody = (value: unknown): void => {
        if (Array.isArray(value)) return value.forEach(visitBody);
        if (value === null || typeof value !== "object") return;
        for (const [key, child] of Object.entries(asObject(value))) {
          if (forbiddenProperty.test(key) && key !== "selectedChoiceId") bodyKeys.push(key);
          visitBody(child);
        }
      };
      visitBody(fixture.body);
      expect(bodyKeys).toEqual([]);
      if (JSON.stringify(fixture.body).includes("selectedChoiceId")) {
        expect(fixture.operationId).toBe("submitActivityAttempt");
        expect(fixture.direction).toBe("request");
      }
    }

    for (const mutation of [
      { answerKey: "x" },
      { correctChoiceId: "x" },
      { validation: {} },
      { requestHash: "x" },
      { ownerId: "x" },
      { userId: "x" },
      { providerPayload: {} },
      { stripeCustomerId: "x" },
      { deviceId: "x" },
      { receipt: "x" },
      { purchaseToken: "x" },
      { accessToken: "x" },
      { stackTrace: "x" },
      { sqlQuery: "x" },
      { environment: "production" },
    ]) {
      expect(Object.keys(mutation).some((key) => forbiddenProperty.test(key))).toBe(true);
    }
  });

  it("validates every fixture metadata record and the future-consent boundary", () => {
    for (const [fixtureId, value] of Object.entries(cases)) {
      const fixture = asObject(value);
      expect(fixture.dataClass, fixtureId).toBe("synthetic");
      expect(fixture.generationSource, fixtureId).toBe("repository_authored_deterministic");
      expect(fixture.productionDataUsed, fixtureId).toBe(false);
      expect(fixture.marketingAttribution, fixtureId).toBe("absent");
      expect(fixture.marketingConsent, fixtureId).toBe("absent");
      expect(fixture.adPlatformExport, fixtureId).toBe("prohibited");
      expect(fixture.sensitiveFieldPolicy, fixtureId).toBe(
        "whole_wire_body_restricted_never_marketing_logging_or_ad_export",
      );
      expect(fixture.sourceCommit, fixtureId).toBe(manifest.sourceImplementationCommit);
      expect(["public", "authenticated_bearer", "cross_cutting"], fixtureId).toContain(
        fixture.auth,
      );
      expect(fixture.restrictedFields, fixtureId).toEqual(expect.arrayContaining(["body"]));
      if (asObject(fixture.headers)["Idempotency-Key"] !== undefined) {
        expect(fixture.restrictedFields, fixtureId).toContain("headers.Idempotency-Key");
      }
    }
    expect(asObject(bundle.futureAttributionContractRequired)).toEqual({
      separateAcceptance: true,
      purpose: "required",
      consent: "required",
      minimization: "required",
      retention: "required",
      deletion: "required",
      deduplication: "required",
      serverReconciliation: "required",
    });
  });

  it("defines owner isolation, billing projection, restricted fields, and privacy-safe logging", () => {
    expect(String(bundle.billingProjectionPolicy)).toContain("must never infer access");
    const ownerPolicy = asObject(bundle.ownerIsolationPolicy);
    expect(String(ownerPolicy.ownerSource)).toContain("never accepted from request input");
    expect(String(ownerPolicy.inaccessibleCatalogBehavior)).toContain("same resource_not_found");
    const logPolicy = asObject(bundle.clientLogPolicy);
    expect(logPolicy.allowed).toEqual([
      "method",
      "routeTemplate",
      "status",
      "safeErrorCode",
      "durationMs",
      "correlationId",
    ]);
    expect(logPolicy.prohibited).toEqual(
      expect.arrayContaining(["body", "headers", "email", "selectedChoiceId", "destinationUrl"]),
    );
    expect(asObject(cases.identity_ok).restrictedFields).toEqual(["body"]);
  });

  it("defines nine non-HTTP transport scenarios and actionable accessible client expectations", () => {
    const transport = asObject(bundle.transportScenarios);
    expect(Object.keys(transport)).toHaveLength(9);
    for (const scenario of Object.values(transport)) {
      const expectation = asObject(scenario);
      expect(Object.keys(expectation).sort()).toEqual(
        [
          "announcement",
          "disposition",
          "expected",
          "focusTarget",
          "messageKey",
          "noHttpResponse",
          "preserveState",
          "primaryAction",
        ].sort(),
      );
      expect(expectation.noHttpResponse).toBe(true);
      expect(String(expectation.expected).length).toBeGreaterThan(20);
      expect(typeof expectation.preserveState).toBe("boolean");
      expect(String(expectation.disposition).length).toBeGreaterThan(5);
      expect(expectation.messageKey === null || typeof expectation.messageKey === "string").toBe(
        true,
      );
      expect(
        expectation.primaryAction === null || typeof expectation.primaryAction === "string",
      ).toBe(true);
      expect(expectation.focusTarget === null || typeof expectation.focusTarget === "string").toBe(
        true,
      );
      expect(expectation.announcement).toMatch(
        /^(none|polite_once|polite_delayed_once|assertive_once)$/,
      );
    }
    const expectations = asObject(bundle.clientExpectations);
    const apiErrorProperties = asObject(asObject(schemaMap.ApiError).properties);
    const declaredCodes = asObject(apiErrorProperties.code).enum as string[];
    for (const code of declaredCodes.concat("unknown")) {
      const expectation = asObject(expectations[code]);
      expect(expectation.messageKey).toMatch(/^error\./);
      expect(expectation.primaryAction).toBeTruthy();
      expect(expectation.focusTarget).toBeTruthy();
      expect(expectation.announcement).toBeTruthy();
    }
  });

  it("requires UUID v4 for request-bound identifiers", () => {
    const lessonOperation = asObject(asObject(paths["/lessons/{lessonId}"]).get);
    const attemptOperation = asObject(asObject(paths["/activities/{activityId}/attempts"]).post);
    const parameterSchemas = [
      ...((lessonOperation.parameters as unknown[]) ?? []),
      ...((attemptOperation.parameters as unknown[]) ?? []),
    ].map((parameter) => asObject(asObject(parameter).schema));
    expect(parameterSchemas).toHaveLength(3);
    for (const schema of parameterSchemas) {
      expect(schema.format).toBe("uuid");
      expect(schema.pattern).toContain("-4");
      expect(validate("88888888-8888-4888-8888-888888888888", schema)).toEqual([]);
      expect(validate("88888888-8888-1888-8888-888888888888", schema)).not.toEqual([]);
    }
  });
});
