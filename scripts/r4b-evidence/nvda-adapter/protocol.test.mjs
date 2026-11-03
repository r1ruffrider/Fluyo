import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { windowsNativeBoundaryTesting } from "../windows-native-client.mjs";

import {
  NVDA_CONTROL_SCHEMA,
  NVDA_READY_SCHEMA,
  NVDA_PRE_SPEECH_REQUEST_SCHEMA,
  canonicalJsonSha256,
  createNvdaExpectedSpeechContract,
  normalizeNvdaPreSpeechRequestText,
  readValidatedNvdaPreSpeechRequestStream,
  readValidatedNvdaPreSpeechRequestStreams,
  validateNvdaControl,
  validateNvdaReady,
  validateNvdaPreSpeechRequest,
} from "./protocol.mjs";

windowsNativeBoundaryTesting.enableTestRoot();

const observationId = "a".repeat(64);
const pluginSha256 = "b".repeat(64);
const protocolSha256 = "c".repeat(64);
const expected = new Set([observationId]);
const control = {
  schema: NVDA_CONTROL_SCHEMA,
  attemptId: "attempt-002-observer",
  observationId,
  generation: "1",
  phase: "OBSERVE",
  expectedSpeechContract: createNvdaExpectedSpeechContract("ACTIVE"),
  controllerPid: 101,
  controllerCreationIdentity: "101:fixture",
  brokerPid: 151,
  brokerCreationIdentity: "10001",
  expectedNvdaPid: 202,
  nvdaCreationIdentity: "10002",
  capabilities: "CONTROL_READ|READY_WRITE|TRANSCRIPT_WRITE|DIAGNOSTIC_WRITE|OWNED_JOB_STOP",
  pluginSha256,
  protocolSha256,
  createdMonotonicMilliseconds: "1000",
  expiresMonotonicMilliseconds: "2000",
};

function createMandatoryJunction(target, junction) {
  symlinkSync(target, junction, process.platform === "win32" ? "junction" : "dir");
}

function event(overrides = {}) {
  return {
    schema: NVDA_PRE_SPEECH_REQUEST_SCHEMA,
    attemptId: "attempt-002-observer",
    observationId,
    generation: "1",
    sequence: 1,
    monotonicMilliseconds: "1200",
    kind: "SPEAK",
    priority: "NORMAL",
    text: "Choose your answer",
    ...overrides,
  };
}

test("closes control and ready handshakes to the exact plugin, protocol, PID, and lifetime", () => {
  assert.equal(validateNvdaControl(control, expected), control);
  const ready = {
    schema: NVDA_READY_SCHEMA,
    attemptId: "attempt-002-observer",
    observationId,
    generation: "1",
    phase: "OBSERVE",
    status: "CONTROL_LATCHED",
    controllerPid: 101,
    controllerCreationIdentity: "101:fixture",
    brokerPid: 151,
    brokerCreationIdentity: "10001",
    pluginSha256,
    protocolSha256,
    nvdaPid: 202,
    nvdaCreationIdentity: "10002",
    capabilities: "CONTROL_READ|READY_WRITE|TRANSCRIPT_WRITE|DIAGNOSTIC_WRITE|OWNED_JOB_STOP",
    controlSha256: canonicalJsonSha256(control),
    monotonicMilliseconds: "1500",
  };
  assert.equal(validateNvdaReady(ready, control), ready);
  const close = { ...control, phase: "CLOSE" };
  const idle = {
    ...ready,
    phase: "CLOSE",
    status: "OBSERVATION_IDLE",
    controlSha256: canonicalJsonSha256(close),
  };
  assert.equal(validateNvdaReady(idle, close), idle);
  assert.throws(() => validateNvdaReady({ ...idle, generation: "2" }, close), /does not bind/u);
  for (const changed of [
    { pluginSha256: "d".repeat(64) },
    { protocolSha256: "d".repeat(64) },
    { nvdaPid: 203 },
    { controlSha256: "d".repeat(64) },
  ]) {
    assert.throws(() => validateNvdaReady({ ...ready, ...changed }, control), /does not bind/u);
  }
  assert.throws(
    () => validateNvdaControl({ ...control, observationId: "d".repeat(64) }, expected),
    /closed plan/u,
  );
  const reorderedTargets = {
    ...control.expectedSpeechContract,
    orderedTargets: [...control.expectedSpeechContract.orderedTargets].reverse(),
  };
  assert.throws(
    () => validateNvdaControl({ ...control, expectedSpeechContract: reorderedTargets }, expected),
    /expected speech contract/u,
  );
});

test("enforces the exact generation-bound filtered pre-speech request grammar", () => {
  assert.equal(validateNvdaPreSpeechRequest(event(), observationId, 1).text, "Choose your answer");
  assert.equal(
    normalizeNvdaPreSpeechRequestText("  Choose\r\nyour   answer  "),
    "Choose your answer",
  );
  for (const text of [
    "https://example.test",
    "person@example.test",
    "Bearer abc",
    "account id 1234",
    "C:\\Users\\person\\secret.txt",
    "33333333-3333-4333-8333-333333333333",
  ]) {
    assert.throws(
      () => validateNvdaPreSpeechRequest(event({ text }), observationId, 1),
      /forbidden/u,
    );
  }
  assert.throws(
    () => validateNvdaPreSpeechRequest(event({ sequence: 2 }), observationId, 1),
    /ordering/u,
  );
  assert.throws(
    () => validateNvdaPreSpeechRequest(event({ priority: "URGENT" }), observationId, 1),
    /closed enum/u,
  );
  assert.throws(
    () => validateNvdaPreSpeechRequest(event({ extra: true }), observationId, 1),
    /keys/u,
  );
  assert.throws(
    () =>
      validateNvdaPreSpeechRequest(
        event({ text: "Private desktop notification" }),
        observationId,
        1,
      ),
    /exact synthetic grammar/u,
  );
  assert.throws(
    () =>
      validateNvdaPreSpeechRequest(event({ text: "Choose your answer private" }), observationId, 1),
    /exact synthetic grammar/u,
  );
  assert.equal(
    validateNvdaPreSpeechRequest(event({ text: "Choose your answer Correct" }), observationId, 1)
      .text,
    "Choose your answer Correct",
  );
});

test("streams bounded records and rejects gaps and oversize lines", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-nvda-protocol-"));
  try {
    const path = resolve(root, "pre-speech-requests.jsonl");
    const records = [
      event(),
      event({ sequence: 2, monotonicMilliseconds: "1201", text: "Correct" }),
    ];
    writeFileSync(path, `${records.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
    const summary = await readValidatedNvdaPreSpeechRequestStream(path, {
      expectedObservationId: observationId,
    });
    assert.deepEqual(Object.keys(summary), [
      "observationId",
      "eventCount",
      "normalizedTextSha256",
      "duplicateCount",
      "expectedOrderStatus",
      "oneTimeAnnouncementStatus",
    ]);
    assert.equal(summary.eventCount, 2);
    writeFileSync(path, `${JSON.stringify(event({ sequence: 2 }))}\n`);
    await assert.rejects(
      readValidatedNvdaPreSpeechRequestStream(path, { expectedObservationId: observationId }),
      /ordering/u,
    );
    writeFileSync(path, `${JSON.stringify(event({ text: "x".repeat(2049) }))}\n`);
    await assert.rejects(
      readValidatedNvdaPreSpeechRequestStream(path, { expectedObservationId: observationId }),
      /2048|line or total/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("groups the fixed cumulative transcript and rejects replay or observation drift", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-nvda-protocol-groups-"));
  const secondObservationId = "d".repeat(64);
  try {
    const path = resolve(root, "pre-speech-requests.jsonl");
    const records = [
      event(),
      event({ sequence: 2, monotonicMilliseconds: "1201", text: "Correct" }),
      event({
        observationId: secondObservationId,
        generation: "2",
        sequence: 1,
        monotonicMilliseconds: "1202",
        text: "Choose your answer",
      }),
    ];
    writeFileSync(path, `${records.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
    const summaries = await readValidatedNvdaPreSpeechRequestStreams(path, {
      expectedObservationIds: [observationId, secondObservationId],
    });
    assert.deepEqual(
      summaries.map(({ observationId: id, eventCount }) => [id, eventCount]),
      [
        [observationId, 2],
        [secondObservationId, 1],
      ],
    );
    writeFileSync(
      path,
      `${JSON.stringify(records[2])}\n${JSON.stringify(event({ monotonicMilliseconds: "1203" }))}\n`,
    );
    await assert.rejects(
      readValidatedNvdaPreSpeechRequestStreams(path, {
        expectedObservationIds: [observationId, secondObservationId],
      }),
      /replayed, or regressed/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("binds expected state content and rejects late or out-of-generation events", async () => {
  const secondObservationId = "d".repeat(64);
  const activeSpeech = [
    "Choose your answer heading",
    "Activity progress Activity incomplete",
    "Back to dashboard link",
    "Está cerca del parque. not checked radio button",
    "Gracias por la comida. not checked radio button",
    "Está cerca del parque, después del puente y frente a la biblioteca del barrio. not checked radio button",
    "Check answer button unavailable",
  ];
  const preparingSpeech = [
    "Getting your activity ready heading",
    "Activity progress Activity incomplete",
    "Back to dashboard link",
  ];
  const records = [
    ...activeSpeech.map((text, index) =>
      event({ sequence: index + 1, monotonicMilliseconds: String(1200 + index), text }),
    ),
    event({
      sequence: activeSpeech.length + 1,
      monotonicMilliseconds: String(1200 + activeSpeech.length),
      kind: "CANCEL",
      text: "",
    }),
    ...preparingSpeech.map((text, index) =>
      event({
        observationId: secondObservationId,
        generation: "2",
        sequence: index + 1,
        monotonicMilliseconds: String(1300 + index),
        text,
      }),
    ),
  ];
  const bytes = Buffer.from(`${records.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
  const summaries = await readValidatedNvdaPreSpeechRequestStreams(bytes, {
    expectedObservationIds: [observationId, secondObservationId],
    expectedSpeechContracts: [
      createNvdaExpectedSpeechContract("ACTIVE"),
      createNvdaExpectedSpeechContract("PREPARING"),
    ],
  });
  assert.deepEqual(
    summaries.map((entry) => entry.eventCount),
    [8, 3],
  );
  const late = [...records, event({ generation: "1", sequence: 9, monotonicMilliseconds: "1400" })];
  await assert.rejects(
    readValidatedNvdaPreSpeechRequestStreams(
      Buffer.from(`${late.map((entry) => JSON.stringify(entry)).join("\n")}\n`),
      { expectedObservationIds: [observationId, secondObservationId] },
    ),
    /replayed, or regressed/u,
  );
  await assert.rejects(
    readValidatedNvdaPreSpeechRequestStreams(
      Buffer.from(`${JSON.stringify(event({ kind: "CANCEL", text: "", sequence: 1 }))}\n`),
      {
        expectedObservationIds: [observationId],
        expectedSpeechContracts: [createNvdaExpectedSpeechContract("ACTIVE")],
      },
    ),
    /CANCEL lacks/u,
  );
  assert.throws(
    () => validateNvdaPreSpeechRequest(event({ generation: "2" }), observationId, 1, "1"),
    /ordering/u,
  );
});

test("binds reachable ACTIVE, SUBMITTING, and OFFLINE control speech in exact order", async () => {
  const cases = [
    {
      id: "e".repeat(64),
      generation: "1",
      contract: createNvdaExpectedSpeechContract(
        "ACTIVE",
        "en",
        "missing_optional_explanation",
        "active",
      ),
    },
    {
      id: "f".repeat(64),
      generation: "2",
      contract: createNvdaExpectedSpeechContract(
        "SUBMITTING",
        "en",
        "network_loss_during_submit",
        "submitting",
      ),
    },
    {
      id: "1".repeat(64),
      generation: "3",
      contract: createNvdaExpectedSpeechContract(
        "OFFLINE_READ_ONLY",
        "en",
        "offline_saved_material",
        "offline-active",
      ),
    },
  ];
  const records = cases.flatMap(({ id, generation, contract }, caseIndex) =>
    contract.orderedTargets.map((target, targetIndex) =>
      event({
        observationId: id,
        generation,
        sequence: targetIndex + 1,
        monotonicMilliseconds: String(2000 + caseIndex * 100 + targetIndex),
        text: `${target.accessibleNameAlternatives[0]} ${target.requiredStateContentAlternatives[0]}`,
      }),
    ),
  );
  const summaries = await readValidatedNvdaPreSpeechRequestStreams(
    Buffer.from(`${records.map((entry) => JSON.stringify(entry)).join("\n")}\n`),
    {
      expectedObservationIds: cases.map(({ id }) => id),
      expectedSpeechContracts: cases.map(({ contract }) => contract),
    },
  );
  assert.deepEqual(
    summaries.map(({ eventCount }) => eventCount),
    cases.map(({ contract }) => contract.orderedTargets.length),
  );
  assert.equal(
    cases[1].contract.orderedTargets.every((target) =>
      target.targetId.startsWith("choice-") || target.targetId === "primary-action"
        ? target.requiredStateContentAlternatives[0].includes("unavailable")
        : true,
    ),
    true,
  );
  assert.equal(cases[2].contract.orderedTargets.at(-1).targetId, "recovery-action");
});

test("rejects oversized and junction-routed transcript files before parsing", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "fluyo-nvda-bounded-"));
  const outside = mkdtempSync(resolve(tmpdir(), "fluyo-nvda-outside-"));
  try {
    const oversized = resolve(root, "oversized.jsonl");
    writeFileSync(oversized, "x".repeat(17));
    await assert.rejects(
      readValidatedNvdaPreSpeechRequestStream(oversized, {
        expectedObservationId: observationId,
        maximumBytes: 16,
      }),
      /byte bound/u,
    );

    const linked = resolve(root, "linked");
    createMandatoryJunction(outside, linked);
    const routed = resolve(outside, "pre-speech-requests.jsonl");
    writeFileSync(routed, `${JSON.stringify(event())}\n`);
    await assert.rejects(
      readValidatedNvdaPreSpeechRequestStream(resolve(linked, "pre-speech-requests.jsonl"), {
        expectedObservationId: observationId,
      }),
      /junction|link|reparse/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
