import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { isPathWithin, readBoundedRegularFile } from "../fixed-root-guard.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

export const NVDA_PRE_SPEECH_REQUEST_SCHEMA = "fluyo:r4b:nvda-filtered-pre-speech-request:v1";
export const NVDA_CONTROL_SCHEMA = "fluyo:r4b:nvda-control:v1";
export const NVDA_READY_SCHEMA = "fluyo:r4b:nvda-ready:v1";
export const NVDA_PRE_SPEECH_REQUEST_KEYS = Object.freeze([
  "schema",
  "attemptId",
  "observationId",
  "generation",
  "sequence",
  "monotonicMilliseconds",
  "kind",
  "priority",
  "text",
]);
export const NVDA_CONTROL_KEYS = Object.freeze([
  "schema",
  "attemptId",
  "observationId",
  "generation",
  "phase",
  "expectedSpeechContract",
  "controllerPid",
  "controllerCreationIdentity",
  "brokerPid",
  "brokerCreationIdentity",
  "expectedNvdaPid",
  "nvdaCreationIdentity",
  "capabilities",
  "pluginSha256",
  "protocolSha256",
  "createdMonotonicMilliseconds",
  "expiresMonotonicMilliseconds",
]);
export const NVDA_READY_KEYS = Object.freeze([
  "schema",
  "attemptId",
  "observationId",
  "generation",
  "phase",
  "status",
  "controllerPid",
  "controllerCreationIdentity",
  "brokerPid",
  "brokerCreationIdentity",
  "pluginSha256",
  "protocolSha256",
  "nvdaPid",
  "nvdaCreationIdentity",
  "capabilities",
  "controlSha256",
  "monotonicMilliseconds",
]);

const ATTEMPT_ID = "attempt-002-observer";
const SHA256 = /^[0-9a-f]{64}$/u;
const DECIMAL = /^(?:0|[1-9][0-9]*)$/u;
const PRIORITIES = new Set(["NORMAL", "NEXT", "NOW"]);
const KINDS = new Set(["SPEAK", "CANCEL"]);
const CONTROL_PHASES = new Set(["OBSERVE", "CLOSE"]);

const EXPECTED_SPEECH_BY_STATE = Object.freeze({
  PREPARING: Object.freeze(["Getting your activity ready"]),
  ACTIVE: Object.freeze(["Choose your answer"]),
  SUBMITTING: Object.freeze(["Checking your answer"]),
  CONFIRMED: Object.freeze(["Correct", "Not quite"]),
  RETRYABLE_ERROR: Object.freeze([
    "We couldn’t load the activity",
    "We couldn’t check your answer",
  ]),
  STALE_CONTENT: Object.freeze(["This activity changed"]),
  SESSION_ENDED: Object.freeze(["Your session ended"]),
  ACCESS_BLOCKED: Object.freeze(["You can’t open this activity"]),
  EMPTY_REVIEW: Object.freeze(["Nothing to review right now"]),
  OFFLINE_READ_ONLY: Object.freeze(["You’re offline"]),
});

function pseudoSpeech(value, localeId) {
  if (localeId === "en") return value;
  if (localeId === "en-XA") return `⟦${value} ···⟧`;
  if (localeId === "ar-XB") return `⟦عَرَبِيّ ${value} ···⟧`;
  throw new Error("NVDA expected speech locale is outside the closed set");
}

const DEFAULT_CHOICES = Object.freeze([
  "Está cerca del parque.",
  "Gracias por la comida.",
  "Está cerca del parque, después del puente y frente a la biblioteca del barrio.",
]);
const EXPECTED_FIXTURE_IDS = new Set([
  "long_localized_prompt_and_choices",
  "rtl_mixed_script_activity",
  "large_text_compact_landscape",
  "one_character_and_multiline_answers",
  "empty_activity_catalog",
  "network_loss_during_submit",
  "duplicate_submit",
  "stale_content_version",
  "late_confirmation_after_exit",
  "authentication_expired",
  "entitlement_blocked",
  "offline_saved_material",
  "corrupt_cache_recovery",
  "protected_mode_unknown_cohort",
  "missing_optional_explanation",
]);

function expectedChoices(fixtureId) {
  if (!EXPECTED_FIXTURE_IDS.has(fixtureId))
    throw new Error("NVDA expected speech fixture is outside the closed set");
  if (fixtureId === "long_localized_prompt_and_choices")
    return Object.freeze(Array.from({ length: 4 }, (_, index) => String(index + 1).repeat(180)));
  if (fixtureId === "rtl_mixed_script_activity")
    return Object.freeze(["تقع قرب parque 7 المركزي."]);
  if (fixtureId === "one_character_and_multiline_answers")
    return Object.freeze(["A", "Primera línea Segunda línea"]);
  return DEFAULT_CHOICES;
}

function expectedPrimaryName(stateId, variantId) {
  if (stateId === "ACTIVE") return "Check answer";
  if (stateId === "SUBMITTING") return "Checking…";
  if (stateId === "CONFIRMED") return variantId?.endsWith("finish") ? "Finish" : "Continue";
  if (stateId === "RETRYABLE_ERROR") return variantId?.endsWith("prepare") ? "Try again" : null;
  if (stateId === "STALE_CONTENT") return "Refresh activity";
  if (stateId === "SESSION_ENDED") return "Sign in";
  if (stateId === "ACCESS_BLOCKED") return "Return to learning";
  if (stateId === "EMPTY_REVIEW") return "Continue learning";
  if (stateId === "OFFLINE_READ_ONLY") return "Try again";
  return null;
}

function speechTarget(targetId, names, stateContent) {
  return Object.freeze({
    targetId,
    accessibleNameAlternatives: Object.freeze(names),
    requiredStateContentAlternatives: Object.freeze(stateContent),
  });
}

export function createNvdaExpectedSpeechContract(
  stateId,
  localeId = "en",
  fixtureId = "missing_optional_explanation",
  variantId = null,
) {
  const alternatives = EXPECTED_SPEECH_BY_STATE[stateId];
  if (!alternatives) throw new Error("NVDA expected speech state is outside the closed set");
  const disabled = stateId === "SUBMITTING" || stateId === "OFFLINE_READ_ONLY";
  const selected =
    stateId === "SUBMITTING" || (stateId === "OFFLINE_READ_ONLY" && variantId?.endsWith("active"));
  const orderedTargets = [
    speechTarget(
      "heading",
      alternatives.map((entry) => pseudoSpeech(entry, localeId)),
      ["heading"],
    ),
    speechTarget(
      "progress",
      [pseudoSpeech("Activity progress", localeId)],
      [stateId === "CONFIRMED" ? "Activity complete" : "Activity incomplete"],
    ),
    speechTarget("back-link", [pseudoSpeech("Back to dashboard", localeId)], ["link"]),
  ];
  if (["ACTIVE", "SUBMITTING", "OFFLINE_READ_ONLY"].includes(stateId)) {
    expectedChoices(fixtureId).forEach((choice, index) => {
      const stateTokens = [selected && index === 0 ? "checked" : "not checked", "radio button"];
      if (disabled) stateTokens.push("unavailable");
      orderedTargets.push(
        speechTarget(
          `choice-${index + 1}`,
          [pseudoSpeech(choice, localeId)],
          [stateTokens.join(" ")],
        ),
      );
    });
  }
  const primary = expectedPrimaryName(stateId, variantId);
  if (primary) {
    orderedTargets.push(
      speechTarget(
        stateId === "ACTIVE" || stateId === "SUBMITTING" ? "primary-action" : "recovery-action",
        [pseudoSpeech(primary, localeId)],
        [disabled || (stateId === "ACTIVE" && !selected) ? "button unavailable" : "button"],
      ),
    );
  }
  return Object.freeze({
    stateId,
    localeId,
    fixtureId,
    variantId,
    orderedTargets: Object.freeze(orderedTargets),
    legalTerminalKinds: Object.freeze(["SPEAK", "CANCEL"]),
  });
}

function validateExpectedSpeechContract(value) {
  exactKeys(
    value,
    ["stateId", "localeId", "fixtureId", "variantId", "orderedTargets", "legalTerminalKinds"],
    "NVDA expected speech contract",
  );
  const expected = createNvdaExpectedSpeechContract(
    value.stateId,
    value.localeId,
    value.fixtureId,
    value.variantId,
  );
  if (JSON.stringify(value) !== JSON.stringify(expected))
    throw new Error("NVDA expected speech contract changed");
  return value;
}
const FORBIDDEN_TEXT =
  /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:bearer|password|passwd|secret|token|api[_ -]?key)\b|\baccount(?:\s+(?:id|number)|:)|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b|(?:[a-z]:\\|\\\\|\/(?:users|home|var|etc|tmp)\/))/iu;
const SYNTHETIC_TEXT_ATOMS = Object.freeze([
  "Back to dashboard",
  "Activity progress",
  "Activity complete",
  "Activity incomplete",
  "heading",
  "link",
  "radio button",
  "checked",
  "not checked",
  "unavailable",
  "button",
  "button unavailable",
  "Conversation Canvas",
  "Getting your activity ready",
  "Checking the latest activity",
  "Choose your answer",
  "Select one answer",
  "Checking your answer",
  "Waiting for a confirmed result",
  "Correct",
  "Not quite",
  "We couldn’t",
  "We couldn’t load the activity",
  "We couldn’t check your answer",
  "Nothing changed",
  "Your answer wasn’t confirmed",
  "This activity changed",
  "Your session ended",
  "Your confirmed progress hasn’t changed",
  "You can’t open this activity",
  "This activity isn’t available for your account right now",
  "Nothing to review right now",
  "You can continue with your next activity",
  "You’re offline",
  "Your answer is kept for this session",
  "Reconnect to load your activity",
  "Check answer",
  "Checking…",
  "Continue",
  "Finish",
  "Try again",
  "Refresh activity",
  "Sign in",
  "Return to learning",
  "Continue learning",
  "Synthetic confirmed feedback",
  "A friend asks",
  "Está cerca del parque",
  "Está cerca del parque.",
  "Está cerca del parque, después del puente y frente a la biblioteca del barrio.",
  "Gracias por la comida",
  "Gracias por la comida.",
  "Primera línea Segunda línea",
  "أين تقع",
  "تقع قرب",
]);

function isClosedSyntheticText(value) {
  if (value === "" || value === "A" || value === "P".repeat(600)) return true;
  if (/^(\d)\1{179}$/u.test(value) && /^[1-4]+$/u.test(value)) return true;
  const atoms = new Set(
    SYNTHETIC_TEXT_ATOMS.flatMap((atom) => [
      atom,
      pseudoSpeech(atom, "en-XA"),
      pseudoSpeech(atom, "ar-XB"),
    ]),
  );
  const reachable = new Set([0]);
  for (let start = 0; start <= value.length; start += 1) {
    if (!reachable.has(start)) continue;
    for (const atom of atoms) {
      if (value.startsWith(atom, start)) {
        const end = start + atom.length;
        if (end === value.length) return true;
        if (value[end] === " ") reachable.add(end + 1);
      }
    }
  }
  return false;
}

function exactKeys(value, expected, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  if (JSON.stringify(Object.keys(value)) !== JSON.stringify(expected)) {
    throw new Error(`${name} keys or canonical order changed`);
  }
}

function positivePid(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive PID`);
}

export function canonicalJsonSha256(value) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function normalizeNvdaPreSpeechRequestText(value) {
  if (typeof value !== "string") throw new Error("NVDA pre-speech request text must be a string");
  const normalized = value
    .normalize("NFC")
    .replace(/[\r\n]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (normalized.length > 2048)
    throw new Error("NVDA pre-speech request text exceeds 2048 characters");
  if (FORBIDDEN_TEXT.test(normalized))
    throw new Error("NVDA pre-speech request text contains forbidden payload");
  if (!isClosedSyntheticText(normalized)) {
    throw new Error("NVDA pre-speech request text is outside the exact synthetic grammar");
  }
  return normalized;
}

export function validateNvdaControl(value, expectedObservationIds) {
  exactKeys(value, NVDA_CONTROL_KEYS, "NVDA control");
  if (value.schema !== NVDA_CONTROL_SCHEMA || value.attemptId !== ATTEMPT_ID) {
    throw new Error("NVDA control identity changed");
  }
  if (!expectedObservationIds?.has(value.observationId) || !SHA256.test(value.observationId)) {
    throw new Error("NVDA control observation is outside the closed plan");
  }
  if (
    !DECIMAL.test(value.generation) ||
    BigInt(value.generation) < 1n ||
    !CONTROL_PHASES.has(value.phase)
  ) {
    throw new Error("NVDA control generation or phase changed");
  }
  validateExpectedSpeechContract(value.expectedSpeechContract);
  positivePid(value.controllerPid, "NVDA control controllerPid");
  positivePid(value.brokerPid, "NVDA control brokerPid");
  positivePid(value.expectedNvdaPid, "NVDA control expectedNvdaPid");
  if (
    typeof value.controllerCreationIdentity !== "string" ||
    !DECIMAL.test(value.brokerCreationIdentity) ||
    !DECIMAL.test(value.nvdaCreationIdentity) ||
    value.capabilities !==
      "CONTROL_READ|READY_WRITE|TRANSCRIPT_WRITE|DIAGNOSTIC_WRITE|OWNED_JOB_STOP"
  ) {
    throw new Error("NVDA control creation identities or capabilities changed");
  }
  if (!SHA256.test(value.pluginSha256) || !SHA256.test(value.protocolSha256)) {
    throw new Error("NVDA control source digests are invalid");
  }
  if (
    !DECIMAL.test(value.createdMonotonicMilliseconds) ||
    !DECIMAL.test(value.expiresMonotonicMilliseconds) ||
    BigInt(value.expiresMonotonicMilliseconds) <= BigInt(value.createdMonotonicMilliseconds) ||
    BigInt(value.expiresMonotonicMilliseconds) - BigInt(value.createdMonotonicMilliseconds) >
      120000n
  ) {
    throw new Error("NVDA control monotonic window is invalid");
  }
  return value;
}

export function validateNvdaReady(value, control) {
  exactKeys(value, NVDA_READY_KEYS, "NVDA ready");
  if (
    value.schema !== NVDA_READY_SCHEMA ||
    value.attemptId !== ATTEMPT_ID ||
    value.observationId !== control.observationId ||
    value.generation !== control.generation ||
    value.phase !== control.phase ||
    value.status !== (control.phase === "OBSERVE" ? "CONTROL_LATCHED" : "OBSERVATION_IDLE") ||
    value.controllerPid !== control.controllerPid ||
    value.controllerCreationIdentity !== control.controllerCreationIdentity ||
    value.brokerPid !== control.brokerPid ||
    value.brokerCreationIdentity !== control.brokerCreationIdentity ||
    value.pluginSha256 !== control.pluginSha256 ||
    value.protocolSha256 !== control.protocolSha256 ||
    value.nvdaPid !== control.expectedNvdaPid ||
    value.nvdaCreationIdentity !== control.nvdaCreationIdentity ||
    value.capabilities !== control.capabilities ||
    value.controlSha256 !== canonicalJsonSha256(control) ||
    !DECIMAL.test(value.monotonicMilliseconds) ||
    BigInt(value.monotonicMilliseconds) < BigInt(control.createdMonotonicMilliseconds) ||
    BigInt(value.monotonicMilliseconds) > BigInt(control.expiresMonotonicMilliseconds)
  ) {
    throw new Error("NVDA ready handshake does not bind the active control and writer");
  }
  return value;
}

export function validateNvdaPreSpeechRequest(
  value,
  expectedObservationId,
  expectedSequence,
  expectedGeneration = "1",
) {
  exactKeys(value, NVDA_PRE_SPEECH_REQUEST_KEYS, "NVDA filtered pre-speech request");
  if (
    value.schema !== NVDA_PRE_SPEECH_REQUEST_SCHEMA ||
    value.attemptId !== ATTEMPT_ID ||
    value.observationId !== expectedObservationId ||
    value.generation !== expectedGeneration ||
    !SHA256.test(value.observationId) ||
    value.sequence !== expectedSequence ||
    !Number.isSafeInteger(value.sequence) ||
    !DECIMAL.test(value.monotonicMilliseconds) ||
    !KINDS.has(value.kind) ||
    !PRIORITIES.has(value.priority)
  ) {
    throw new Error("NVDA pre-speech request identity, ordering, or closed enum changed");
  }
  const normalized = normalizeNvdaPreSpeechRequestText(value.text);
  if (normalized !== value.text || (value.kind === "SPEAK" && normalized.length === 0)) {
    throw new Error("NVDA pre-speech request text is not canonical");
  }
  if (value.kind === "CANCEL" && value.text !== "") {
    throw new Error("NVDA CANCEL event must have empty text");
  }
  return value;
}

function boundedTranscriptBytes(bytes, maximumBytes, maximumLineBytes) {
  if (
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes < 1 ||
    maximumBytes > 2097152 ||
    !Number.isSafeInteger(maximumLineBytes) ||
    maximumLineBytes < 1 ||
    maximumLineBytes > maximumBytes
  ) {
    throw new Error("NVDA filtered pre-speech request byte bounds are outside the closed contract");
  }
  if (!Buffer.isBuffer(bytes) || bytes.length > maximumBytes) {
    throw new Error("NVDA filtered pre-speech request exceeds the total byte bound");
  }
  const lines = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== 0x0a) continue;
    const lineLength = index - start + 1;
    if (lineLength > maximumLineBytes) {
      throw new Error("NVDA filtered pre-speech request exceeds the line or total byte bound");
    }
    const end = index > start && bytes[index - 1] === 0x0d ? index - 1 : index;
    lines.push(bytes.subarray(start, end).toString("utf8"));
    start = index + 1;
  }
  if (start !== bytes.length) {
    if (bytes.length - start > maximumLineBytes) {
      throw new Error("NVDA filtered pre-speech request exceeds the line or total byte bound");
    }
    lines.push(bytes.subarray(start).toString("utf8"));
  }
  return Object.freeze(lines);
}

function boundedTranscriptLines(path, maximumBytes, maximumLineBytes) {
  const guardRoot = isPathWithin(path, REPOSITORY_ROOT) ? REPOSITORY_ROOT : dirname(path);
  return boundedTranscriptBytes(
    readBoundedRegularFile(path, guardRoot, maximumBytes, "NVDA filtered pre-speech request"),
    maximumBytes,
    maximumLineBytes,
  );
}

export async function readValidatedNvdaPreSpeechRequestStream(
  path,
  {
    expectedObservationId,
    expectedGeneration = "1",
    expectedSpeechContract = null,
    maximumBytes = 2097152,
    maximumLineBytes = 4096,
    timeoutMs = 10000,
  },
) {
  if (!SHA256.test(expectedObservationId))
    throw new Error("expected observation identity is invalid");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) {
    throw new Error("NVDA filtered pre-speech request timeout is outside the closed bound");
  }
  const deadline = Date.now() + timeoutMs;
  let sequence = 0;
  let previousMonotonic = -1n;
  let duplicateCount = 0;
  const normalized = [];
  const events = [];
  const seen = new Set();
  const lines = Buffer.isBuffer(path)
    ? boundedTranscriptBytes(path, maximumBytes, maximumLineBytes)
    : boundedTranscriptLines(path, maximumBytes, maximumLineBytes);
  for (const line of lines) {
    if (Date.now() > deadline)
      throw new Error("NVDA filtered pre-speech request streaming timeout");
    const event = validateNvdaPreSpeechRequest(
      JSON.parse(line),
      expectedObservationId,
      sequence + 1,
      expectedGeneration,
    );
    const monotonic = BigInt(event.monotonicMilliseconds);
    if (monotonic < previousMonotonic)
      throw new Error("NVDA filtered pre-speech request monotonic order regressed");
    previousMonotonic = monotonic;
    sequence += 1;
    events.push(event);
    const identity = `${event.kind}\n${event.priority}\n${event.text}`;
    if (seen.has(identity)) duplicateCount += 1;
    seen.add(identity);
    normalized.push(event.text);
  }
  if (expectedSpeechContract) {
    validateExpectedSpeechContract(expectedSpeechContract);
    const speechEvents = events.filter((event) => event.kind === "SPEAK");
    for (let index = 0; index < events.length; index += 1) {
      if (events[index].kind === "CANCEL" && (index === 0 || events[index - 1].kind !== "SPEAK"))
        throw new Error("NVDA CANCEL lacks its legal SPEAK predecessor");
    }
    let cursor = 0;
    for (const targetContract of expectedSpeechContract.orderedTargets) {
      const relative = speechEvents
        .slice(cursor)
        .findIndex(
          (event) =>
            targetContract.accessibleNameAlternatives.some((token) => event.text.includes(token)) &&
            targetContract.requiredStateContentAlternatives.some((token) =>
              event.text.includes(token),
            ),
        );
      if (relative < 0)
        throw new Error(
          `NVDA expected ordered name/state/content speech was not observed for ${targetContract.targetId}`,
        );
      cursor += relative + 1;
    }
    if (sequence === 0 || !expectedSpeechContract.legalTerminalKinds.includes(events.at(-1)?.kind))
      throw new Error("NVDA terminal event order is outside the expected contract");
  }
  return Object.freeze({
    observationId: expectedObservationId,
    eventCount: sequence,
    normalizedTextSha256: createHash("sha256").update(normalized.join("\n"), "utf8").digest("hex"),
    duplicateCount,
    expectedOrderStatus: "PASS",
    oneTimeAnnouncementStatus: duplicateCount === 0 ? "PASS" : "FAIL",
  });
}

export async function readValidatedNvdaPreSpeechRequestStreams(
  path,
  {
    expectedObservationIds,
    expectedSpeechContracts = null,
    maximumBytes = 2097152,
    maximumLineBytes = 4096,
    timeoutMs = 10000,
  },
) {
  if (
    !Array.isArray(expectedObservationIds) ||
    expectedObservationIds.length === 0 ||
    new Set(expectedObservationIds).size !== expectedObservationIds.length ||
    expectedObservationIds.some((value) => !SHA256.test(value))
  ) {
    throw new Error("closed NVDA observation order is invalid");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) {
    throw new Error("NVDA filtered pre-speech request timeout is outside the closed bound");
  }
  const deadline = Date.now() + timeoutMs;
  const order = new Map(expectedObservationIds.map((value, index) => [value, index]));
  const states = expectedObservationIds.map((observationId) => ({
    observationId,
    eventCount: 0,
    previousMonotonic: -1n,
    duplicateCount: 0,
    normalized: [],
    seen: new Set(),
    kinds: [],
    events: [],
  }));
  let highestObservedIndex = -1;
  const lines = Buffer.isBuffer(path)
    ? boundedTranscriptBytes(path, maximumBytes, maximumLineBytes)
    : boundedTranscriptLines(path, maximumBytes, maximumLineBytes);
  for (const line of lines) {
    if (Date.now() > deadline)
      throw new Error("NVDA filtered pre-speech request streaming timeout");
    const parsed = JSON.parse(line);
    const index = order.get(parsed?.observationId);
    if (index === undefined || index < highestObservedIndex) {
      throw new Error(
        "NVDA filtered pre-speech request observation order is unknown, replayed, or regressed",
      );
    }
    highestObservedIndex = index;
    const state = states[index];
    const event = validateNvdaPreSpeechRequest(
      parsed,
      state.observationId,
      state.eventCount + 1,
      String(index + 1),
    );
    const monotonic = BigInt(event.monotonicMilliseconds);
    if (monotonic < state.previousMonotonic) {
      throw new Error("NVDA filtered pre-speech request monotonic order regressed");
    }
    state.previousMonotonic = monotonic;
    state.eventCount += 1;
    const identity = `${event.kind}\n${event.priority}\n${event.text}`;
    if (state.seen.has(identity)) state.duplicateCount += 1;
    state.seen.add(identity);
    state.normalized.push(event.text);
    state.kinds.push(event.kind);
    state.events.push(event);
  }
  if (expectedSpeechContracts) {
    if (expectedSpeechContracts.length !== states.length) {
      throw new Error("NVDA expected speech contracts do not cover the closed observation order");
    }
    for (const [index, state] of states.entries()) {
      const contract = validateExpectedSpeechContract(expectedSpeechContracts[index]);
      if (state.eventCount > 0) {
        const speechEvents = state.events.filter((event) => event.kind === "SPEAK");
        for (let eventIndex = 0; eventIndex < state.events.length; eventIndex += 1) {
          if (
            state.events[eventIndex].kind === "CANCEL" &&
            (eventIndex === 0 || state.events[eventIndex - 1].kind !== "SPEAK")
          )
            throw new Error("NVDA CANCEL lacks its legal SPEAK predecessor");
        }
        let cursor = 0;
        for (const targetContract of contract.orderedTargets) {
          const relative = speechEvents
            .slice(cursor)
            .findIndex(
              (event) =>
                targetContract.accessibleNameAlternatives.some((token) =>
                  event.text.includes(token),
                ) &&
                targetContract.requiredStateContentAlternatives.some((token) =>
                  event.text.includes(token),
                ),
            );
          if (relative < 0)
            throw new Error(
              `NVDA expected ordered target ${targetContract.targetId} was not spoken`,
            );
          cursor += relative + 1;
        }
        if (!contract.legalTerminalKinds.includes(state.kinds.at(-1)))
          throw new Error("NVDA terminal event order changed");
      }
    }
  }
  return Object.freeze(
    states.map((state) =>
      Object.freeze({
        observationId: state.observationId,
        eventCount: state.eventCount,
        normalizedTextSha256: createHash("sha256")
          .update(state.normalized.join("\n"), "utf8")
          .digest("hex"),
        duplicateCount: state.duplicateCount,
        expectedOrderStatus: "PASS",
        oneTimeAnnouncementStatus: state.duplicateCount === 0 ? "PASS" : "FAIL",
      }),
    ),
  );
}

export function protocolSourceSha256(path = new URL(import.meta.url)) {
  const exactPath = path instanceof URL ? fileURLToPath(path) : path;
  return createHash("sha256")
    .update(readBoundedRegularFile(exactPath, REPOSITORY_ROOT, 1048576, "NVDA protocol read"))
    .digest("hex");
}

export const nvdaProtocolTesting = Object.freeze({
  ATTEMPT_ID,
  FORBIDDEN_TEXT,
  SYNTHETIC_TEXT_ATOMS,
  isClosedSyntheticText,
});
