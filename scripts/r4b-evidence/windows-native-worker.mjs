import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { parentPort, workerData } from "node:worker_threads";

import { validateNativeResponseFrame } from "./windows-native-response.mjs";

const MAX_RESPONSE_BYTES = 32 * 1024 * 1024;
const child = spawn(workerData.powerShell, workerData.arguments, {
  env: workerData.environment,
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});

let stdout = Buffer.alloc(0);
let stderr = "";
let exited = null;
let pendingStdoutResolve;
let activeMessage;

child.stdout.on("data", (chunk) => {
  stdout = Buffer.concat([stdout, chunk]);
  pendingStdoutResolve?.();
  pendingStdoutResolve = undefined;
});
child.stderr.on("data", (chunk) => {
  stderr = `${stderr}${chunk.toString("utf8")}`.slice(-8192);
  if (activeMessage) {
    const control = new Int32Array(activeMessage.control);
    const data = new Uint8Array(activeMessage.data);
    const diagnostic = Buffer.from(stderr, "utf8").subarray(0, data.length);
    data.set(diagnostic);
    Atomics.store(control, 1, diagnostic.length);
  }
});
child.once("exit", (code, signal) => {
  exited = { code, signal };
  pendingStdoutResolve?.();
  pendingStdoutResolve = undefined;
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest();
}

function validateIdentityFrame(bytes, expected, phase, requirePass = false) {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`native broker ${phase} frame is not JSON`);
  }
  validateNativeResponseFrame(value, expected, phase);
  if (requirePass && value.status !== "PASS")
    throw new Error(`native broker ${phase} frame is not PASS`);
  return value;
}

function writeFrame(bytes) {
  return new Promise((accept, reject) => {
    const length = Buffer.alloc(4);
    length.writeUInt32LE(bytes.length);
    child.stdin.write(Buffer.concat([length, bytes]), (error) =>
      error ? reject(error) : accept(),
    );
  });
}

async function waitForBytes(length) {
  while (stdout.length < length) {
    if (exited) {
      throw new Error(
        `native broker exited (${exited.code ?? exited.signal ?? "unknown"}): ${stderr || "no diagnostic"}`,
      );
    }
    await new Promise((accept) => {
      pendingStdoutResolve = accept;
    });
  }
}

async function readFrame() {
  await waitForBytes(4);
  const length = stdout.readUInt32LE(0);
  if (length <= 0 || length > MAX_RESPONSE_BYTES) throw new Error("native broker response bound");
  await waitForBytes(4 + length);
  const value = stdout.subarray(4, 4 + length);
  stdout = stdout.subarray(4 + length);
  return value;
}

let queue = Promise.resolve();

function complete(controlBuffer, dataBuffer, value, status) {
  const control = new Int32Array(controlBuffer);
  const data = new Uint8Array(dataBuffer);
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  const length = Math.min(bytes.length, data.length);
  data.set(bytes.subarray(0, length));
  Atomics.store(control, 1, length);
  Atomics.store(control, 2, status);
  Atomics.store(control, 0, 1);
  Atomics.notify(control, 0);
}

parentPort.on("message", (message) => {
  if (message?.type === "crash-broker-for-test") {
    child.kill();
    return;
  }
  queue = queue.then(async () => {
    activeMessage = message;
    const control = new Int32Array(message.control);
    try {
      const request = Buffer.from(message.request);
      Atomics.store(control, 3, 1);
      await writeFrame(request);
      Atomics.store(control, 3, 2);
      let response = await readFrame();
      if (message.testMalformedResponseBeforeAck === true) {
        const malformed = JSON.parse(response.toString("utf8"));
        malformed.forbiddenTransportField = "must-never-be-acked";
        response = Buffer.from(JSON.stringify(malformed), "utf8");
      }
      const responseSha256 = sha256(response);
      const initial = validateIdentityFrame(response, message.expected, "pre-ACK response");
      Atomics.store(control, 3, 3);
      if (message.testDropResponse === true) {
        complete(message.control, message.data, "TEST_RESPONSE_LOSS", 3);
        return;
      }
      if (message.testDropAck === true) {
        complete(message.control, message.data, "TEST_ACK_LOSS", 3);
        return;
      }
      await writeFrame(responseSha256);
      Atomics.store(control, 3, 4);
      const confirmationBytes = await readFrame();
      const confirmation = validateIdentityFrame(
        confirmationBytes,
        message.expected,
        "commit confirmation",
        true,
      );
      if (
        confirmation.commitStatus !== "COMMIT_CONFIRMED" ||
        confirmation.acknowledgedResponseSha256 !== responseSha256.toString("hex")
      ) {
        throw new Error("native broker commit confirmation does not bind the raw response digest");
      }
      const beforeSequence = BigInt(initial.journalBeforeResponseSequence);
      const afterSequence = BigInt(confirmation.journalAfterAckSequence);
      const actualDelta = afterSequence - beforeSequence;
      const validDelta =
        initial.status === "FAIL"
          ? message.expected.mutation
            ? actualDelta === 0n || actualDelta === 1n
            : actualDelta === 0n
          : actualDelta === (message.expected.mutation ? 2n : 0n);
      if (!validDelta) {
        throw new Error(
          `native broker commit confirmation journal delta changed (${beforeSequence}->${afterSequence})`,
        );
      }
      if (
        actualDelta === 0n &&
        confirmation.journalAfterAckSha256 !== initial.journalBeforeResponseSha256
      ) {
        throw new Error("native broker nonmutation changed the journal head");
      }
      complete(
        message.control,
        message.data,
        Buffer.from(
          JSON.stringify({
            responseBase64: response.toString("base64"),
            responseSha256: responseSha256.toString("hex"),
            commitConfirmation: confirmation,
          }),
          "utf8",
        ),
        1,
      );
    } catch (error) {
      complete(message.control, message.data, error?.stack ?? error, 2);
    } finally {
      activeMessage = undefined;
    }
  });
});

parentPort.postMessage({ type: "spawned", pid: child.pid });
