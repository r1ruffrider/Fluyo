import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

import { validateNativeResponseFrame } from "./windows-native-response.mjs";
import {
  windowsTrustedTempRoot,
  windowsTrustedTempEnvironment,
} from "./windows-trusted-temp-root.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SOURCE_PATH = resolve(REPOSITORY_ROOT, "scripts/r4b-evidence/windows-native-boundary.cs");
const CONTRACT_PATH = resolve(REPOSITORY_ROOT, "scripts/r4b-evidence/windows-native-contract.json");
const WORKER_PATH = new URL("./windows-native-worker.mjs", import.meta.url);
const POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const MAGIC = Buffer.from("FLUYONR1", "ascii");
const RESPONSE_MAGIC = "FLUYONS1";
const VERSION = 1;
const MAX_SOURCE_BYTES = 512 * 1024;
const MAX_RESPONSE_BYTES = 32 * 1024 * 1024;
const ORDINARY_NATIVE_TRANSACTION_TIMEOUT_MILLISECONDS = 30_000;
const FIRST_BROKER_HELLO_BOOTSTRAP_TIMEOUT_MILLISECONDS = 120_000;
// Updated only after the C# source has passed the native compile and protocol suite.
// The PowerShell loader independently recomputes this value before Add-Type.
const EXPECTED_SOURCE_SHA256 = "f8457acbd177b9f1179ef6ce39fd401569eadab14ef6c5a71cf94715581c2b28";
const EXPECTED_CONTRACT_SHA256 = "828b1756539f143369b728ef0ac27c4dd379346e664199153eea8be82b72e1d6";
const BROKERS = new Map();
const SESSION_ANCHORS = new Map();
const TEST_JOURNAL_RUN_ID_PATTERN = /^[0-9a-f]{64}$/u;
let testRootCapability = null;

const OPERATIONS = Object.freeze({
  HELLO: 1,
  READ_BOUNDED: 2,
  HASH_BOUNDED: 3,
  INVENTORY_TREE: 4,
  CREATE_DIRECTORY: 5,
  WRITE_NEW: 6,
  APPEND_DURABLE: 7,
  RENAME_EXCLUSIVE: 8,
  UNLINK_EXACT: 9,
  REMOVE_TREE_EXACT: 10,
  PIN_FILE: 11,
  UNPIN_FILE: 12,
  JOB_CREATE_SUSPENDED: 13,
  JOB_RESUME: 14,
  JOB_STATUS: 15,
  JOB_TERMINATE: 16,
  NVDA_START_WITH_HANDLES: 17,
  NVDA_STOP: 18,
  TEST_SYNCHRONIZED_SWAP: 19,
  SHUTDOWN: 20,
  RECOVER_SESSION: 21,
  TEST_CRASH_AFTER_INTENT: 22,
  REPLACE_EXISTING_EXACT: 23,
  TEST_POST_ACK_JOURNAL_FAILURE: 24,
});
const MUTATION_OPERATIONS = new Set([
  "CREATE_DIRECTORY",
  "WRITE_NEW",
  "APPEND_DURABLE",
  "RENAME_EXCLUSIVE",
  "UNLINK_EXACT",
  "REMOVE_TREE_EXACT",
  "UNPIN_FILE",
  "JOB_CREATE_SUSPENDED",
  "JOB_RESUME",
  "JOB_STATUS",
  "JOB_TERMINATE",
  "NVDA_START_WITH_HANDLES",
  "NVDA_STOP",
  "TEST_CRASH_AFTER_INTENT",
  "REPLACE_EXISTING_EXACT",
  "TEST_POST_ACK_JOURNAL_FAILURE",
]);

const BOOTSTRAP_PIN_SOURCE = String.raw`
using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32.SafeHandles;
public sealed class FluyoBootstrapPin : IDisposable {
  const uint GENERIC_READ=0x80000000, FILE_READ_ATTRIBUTES=0x80, FILE_SHARE_READ=1, OPEN_EXISTING=3;
  const uint FILE_FLAG_OPEN_REPARSE_POINT=0x00200000, FILE_ATTRIBUTE_REPARSE_POINT=0x400;
  [StructLayout(LayoutKind.Sequential)] struct BY_HANDLE_FILE_INFORMATION { public uint Attr; public System.Runtime.InteropServices.ComTypes.FILETIME Creation,Access,Write; public uint Volume,SizeHigh,SizeLow,Links,IndexHigh,IndexLow; }
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern SafeFileHandle CreateFileW(string p,uint a,uint s,IntPtr sa,uint d,uint f,IntPtr t);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetFileInformationByHandle(SafeFileHandle h,out BY_HANDLE_FILE_INFORMATION i);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern uint GetFinalPathNameByHandleW(SafeFileHandle h,StringBuilder p,uint n,uint f);
  public SafeFileHandle Handle; public byte[] Bytes; public string FinalPath; public string FileId; public long Size;
  static string Hex(byte[] b){var s=new StringBuilder(b.Length*2);foreach(byte v in b)s.Append(v.ToString("x2"));return s.ToString();}
  static string Canon(string p){p=p.StartsWith(@"\\?\")?p.Substring(4):p;return Path.GetFullPath(p).TrimEnd(Path.DirectorySeparatorChar);}
  public static FluyoBootstrapPin Open(string path,int maximum,string expectedDigest){
    var h=CreateFileW(path,GENERIC_READ|FILE_READ_ATTRIBUTES,FILE_SHARE_READ,IntPtr.Zero,OPEN_EXISTING,FILE_FLAG_OPEN_REPARSE_POINT,IntPtr.Zero);
    if(h==null||h.IsInvalid)throw new Win32Exception(Marshal.GetLastWin32Error(),"CreateFileW(bootstrap pin)");
    try { BY_HANDLE_FILE_INFORMATION i; if(!GetFileInformationByHandle(h,out i))throw new Win32Exception(Marshal.GetLastWin32Error(),"GetFileInformationByHandle(bootstrap pin)");
      if((i.Attr&FILE_ATTRIBUTE_REPARSE_POINT)!=0)throw new InvalidDataException("bootstrap pin rejects reparse points");
      long size=((long)i.SizeHigh<<32)|i.SizeLow;if(size<=0||size>maximum)throw new InvalidDataException("bootstrap pin size");
      var name=new StringBuilder(32768);uint count=GetFinalPathNameByHandleW(h,name,(uint)name.Capacity,0);if(count==0||count>=name.Capacity)throw new Win32Exception(Marshal.GetLastWin32Error(),"GetFinalPathNameByHandleW(bootstrap pin)");
      if(!String.Equals(Canon(name.ToString()),Canon(path),StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("bootstrap pin final path");
      byte[] bytes=new byte[size];using(var stream=new FileStream(new SafeFileHandle(h.DangerousGetHandle(),false),FileAccess.Read,65536,false)){int o=0;while(o<bytes.Length){int n=stream.Read(bytes,o,bytes.Length-o);if(n==0)throw new EndOfStreamException("bootstrap pin truncated");o+=n;}}
      string digest;using(var sha=SHA256.Create())digest=Hex(sha.ComputeHash(bytes));if(digest!=expectedDigest)throw new InvalidDataException("bootstrap pin digest");
      return new FluyoBootstrapPin{Handle=h,Bytes=bytes,FinalPath=Canon(name.ToString()),FileId=i.Volume.ToString("x8")+i.IndexHigh.ToString("x8")+i.IndexLow.ToString("x8"),Size=size};
    } catch {h.Dispose();throw;}
  }
  public void Dispose(){if(Handle!=null)Handle.Dispose();}
}`;
const BOOTSTRAP_PIN_SOURCE_BASE64 = Buffer.from(BOOTSTRAP_PIN_SOURCE, "utf8").toString("base64");

const FIELD_IDS = Object.freeze({
  sessionNonce: 1,
  rootId: 2,
  relativePath: 3,
  relativePath2: 4,
  maximumBytes: 5,
  maximumEntries: 6,
  maximumDirectories: 7,
  maximumDepth: 8,
  maximumTotalBytes: 9,
  expectedDigest: 10,
  expectedVolumeSerial: 11,
  expectedFileId: 12,
  testOperation: 13,
  environmentDigest: 14,
  argvDigest: 15,
  inventoryToken: 16,
  idempotencyKey: 17,
  controllerPid: 18,
  controllerCreationIdentity: 19,
  expectedJournalSequence: 20,
  expectedJournalDigest: 21,
  capability: 22,
  argumentsJson: 23,
  recoveryRecord: 24,
});

const BROKER_BOOTSTRAP = [
  "& {",
  "$repositoryRoot=$env:FLUYO_BROKER_ROOT",
  "$nonce=$env:FLUYO_BROKER_NONCE",
  "$parentPid=[int]$env:FLUYO_BROKER_PARENT_PID",
  "$controllerCreationIdentity=$env:FLUYO_BROKER_CONTROLLER_CREATION_IDENTITY",
  "$sourceDigest=$env:FLUYO_BROKER_SOURCE_SHA256",
  "$journalPath=$env:FLUYO_BROKER_JOURNAL",
  "$testMode=$env:FLUYO_BROKER_TEST_MODE",
  "$sourcePath=$env:FLUYO_BROKER_SOURCE_PATH",
  "$contractPath=$env:FLUYO_BROKER_CONTRACT_PATH",
  "$contractDigest=$env:FLUYO_BROKER_CONTRACT_SHA256",
  "$capability=$env:FLUYO_BROKER_CAPABILITY",
  "$recoveryAnchor=[long]$env:FLUYO_BROKER_RECOVERY_ANCHOR",
  "$confirmedPrefixSequence=[long]$env:FLUYO_BROKER_CONFIRMED_PREFIX_SEQUENCE",
  "$confirmedPrefixDigest=$env:FLUYO_BROKER_CONFIRMED_PREFIX_DIGEST",
  "$ErrorActionPreference='Stop'",
  `$pinSource=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${BOOTSTRAP_PIN_SOURCE_BASE64}'))`,
  "Add-Type -TypeDefinition $pinSource -Language CSharp -ErrorAction Stop",
  "$sourcePin=[FluyoBootstrapPin]::Open($sourcePath,524288,$sourceDigest)",
  "$contractPin=[FluyoBootstrapPin]::Open($contractPath,262144,$contractDigest)",
  "$source=[Text.Encoding]::UTF8.GetString($sourcePin.Bytes)",
  "Add-Type -TypeDefinition $source -Language CSharp -ErrorAction Stop",
  "$signature=Get-AuthenticodeSignature -LiteralPath (Get-Process -Id $PID).Path",
  "$signatureIdentity=$signature.Status.ToString()+':'+$signature.SignerCertificate.Thumbprint",
  "$code=[FluyoNativeBoundary]::RunPipeServer($repositoryRoot,$nonce,$parentPid,$controllerCreationIdentity,$journalPath,$testMode -eq '1',$contractDigest,$capability,$recoveryAnchor,$confirmedPrefixSequence,$confirmedPrefixDigest,(Get-Process -Id $PID).Path,$PSVersionTable.PSVersion.ToString(),$signatureIdentity)",
  "$sourcePin.Dispose();$contractPin.Dispose()",
  "exit $code",
  "}",
].join(";");

const DIRECT_TEST_BOOTSTRAP = [
  "$ErrorActionPreference='Stop'",
  "$stream=New-Object IO.FileStream($env:FLUYO_BROKER_SOURCE_PATH,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)",
  "try{if($stream.Length -eq 0 -or $stream.Length -gt 524288){throw 'native boundary source is invalid'};$sourceBytes=New-Object byte[] ([int]$stream.Length);$offset=0;while($offset -lt $sourceBytes.Length){$n=$stream.Read($sourceBytes,$offset,$sourceBytes.Length-$offset);if($n -eq 0){throw 'native boundary source is truncated'};$offset+=$n}}finally{$stream.Dispose()}",
  "$actual=([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($sourceBytes))).Replace('-','').ToLowerInvariant()",
  "if($actual -cne $env:FLUYO_BROKER_SOURCE_SHA256){throw 'native boundary source digest mismatch'}",
  "Add-Type -TypeDefinition ([Text.Encoding]::UTF8.GetString($sourceBytes)) -Language CSharp -ErrorAction Stop",
  "$reader=New-Object IO.BinaryReader([Console]::OpenStandardInput())",
  "$request=$reader.ReadBytes(1048576)",
  "$response=[FluyoNativeBoundary]::RunBytes($request)",
  "$stdout=[Console]::OpenStandardOutput()",
  "$stdout.Write($response,0,$response.Length)",
  "$stdout.Flush()",
].join(";");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function encodeFields(fields) {
  const entries = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([name, value]) => {
      const fieldId = FIELD_IDS[name];
      if (!fieldId) throw new Error(`unknown native-boundary field: ${name}`);
      const bytes = Buffer.from(String(value), "utf8");
      if (bytes.length > 65536) throw new Error(`native-boundary field is oversized: ${name}`);
      return { fieldId, bytes };
    })
    .sort((left, right) => left.fieldId - right.fieldId);
  const chunks = [];
  for (const { fieldId, bytes } of entries) {
    const prefix = Buffer.alloc(6);
    prefix.writeUInt16LE(fieldId, 0);
    prefix.writeUInt32LE(bytes.length, 2);
    chunks.push(prefix, bytes);
  }
  return Buffer.concat(chunks);
}

function encodeRequest(operation, fields, payload = Buffer.alloc(0), sequence = 1n) {
  const operationCode = OPERATIONS[operation];
  if (!operationCode) throw new Error(`unknown native-boundary operation: ${operation}`);
  const header = encodeFields(fields);
  if (header.length > 65536) throw new Error("native-boundary header exceeds 65,536 bytes");
  const prefix = Buffer.alloc(36);
  MAGIC.copy(prefix, 0);
  prefix.writeUInt32LE(VERSION, 8);
  prefix.writeBigUInt64LE(sequence, 12);
  prefix.writeUInt32LE(operationCode, 20);
  prefix.writeUInt32LE(header.length, 24);
  prefix.writeBigUInt64LE(BigInt(payload.length), 28);
  return Buffer.concat([prefix, header, payload]);
}

function loadBoundarySource() {
  const bytes = readFileSync(SOURCE_PATH);
  if (bytes.length === 0 || bytes.length > MAX_SOURCE_BYTES) {
    throw new Error("native boundary source is absent or oversized");
  }
  if (sha256(bytes) !== EXPECTED_SOURCE_SHA256) {
    throw new Error("native boundary source does not match its reviewed frozen digest");
  }
  return bytes;
}

function loadBoundaryContract() {
  const bytes = readFileSync(CONTRACT_PATH);
  if (bytes.length === 0 || bytes.length > 256 * 1024) {
    throw new Error("native boundary contract is absent or oversized");
  }
  if (sha256(bytes) !== EXPECTED_CONTRACT_SHA256) {
    throw new Error("native boundary contract does not match its reviewed frozen digest");
  }
  const contract = JSON.parse(bytes.toString("utf8"));
  if (
    contract.schema !== "fluyo:r4b:windows-native-contract:v3" ||
    contract.protocolVersion !== 3 ||
    contract.transport?.kind !== "inherited-anonymous-pipes" ||
    contract.transport?.authoritativeFilesystemMessages !== false
  ) {
    throw new Error("native boundary contract escaped its closed transport schema");
  }
  return Object.freeze(contract);
}

function requireTestJournalRunId() {
  windowsTrustedTempRoot();
  const runId = process.env.FLUYO_TEST_JOURNAL_RUN_ID;
  if (!TEST_JOURNAL_RUN_ID_PATTERN.test(runId ?? "")) {
    throw new Error("test native boundary requires an outer-runner journal identity");
  }
  return runId;
}

function journalPathFor(root, testMode) {
  const trustedTempRoot = windowsTrustedTempRoot();
  const directory = testMode
    ? resolve(trustedTempRoot, "fluyo-native-test-broker-journals", requireTestJournalRunId())
    : resolve(trustedTempRoot, "fluyo-native-broker-journals");
  return resolve(
    directory,
    `${sha256(Buffer.from(`${normalizeRoot(root)}\0${testMode ? "test" : "production"}`))}.journal`,
  );
}

function brokerKey(repositoryRoot, testMode) {
  return `${normalizeRoot(repositoryRoot).toLowerCase()}\0${testMode ? `test\0${requireTestJournalRunId()}` : "production"}`;
}

function ensureBroker(repositoryRoot, testMode) {
  const key = brokerKey(repositoryRoot, testMode);
  const existing = BROKERS.get(key);
  if (existing && !existing.exited) return existing;
  loadBoundarySource();
  loadBoundaryContract();
  const nonce = randomBytes(16).toString("hex");
  const capability = randomBytes(32).toString("hex");
  const controllerCreationIdentity = `${process.pid}:${new Date(Date.now() - process.uptime() * 1000).toISOString()}`;
  const journal = journalPathFor(repositoryRoot, testMode);
  const priorAnchor = SESSION_ANCHORS.get(key);
  const worker = new Worker(WORKER_PATH, {
    execArgv: [],
    workerData: {
      powerShell: POWERSHELL,
      arguments: [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        BROKER_BOOTSTRAP,
      ],
      environment: {
        ComSpec: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
        SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
        ...windowsTrustedTempEnvironment(),
        FLUYO_BROKER_ROOT: normalizeRoot(repositoryRoot),
        FLUYO_BROKER_NONCE: nonce,
        FLUYO_BROKER_PARENT_PID: String(process.pid),
        FLUYO_BROKER_CONTROLLER_CREATION_IDENTITY: controllerCreationIdentity,
        FLUYO_BROKER_SOURCE_SHA256: EXPECTED_SOURCE_SHA256,
        FLUYO_BROKER_CONTRACT_SHA256: EXPECTED_CONTRACT_SHA256,
        FLUYO_BROKER_JOURNAL: journal,
        FLUYO_BROKER_TEST_MODE: testMode ? "1" : "0",
        FLUYO_BROKER_TEST_RUN_ID: testMode ? requireTestJournalRunId() : "",
        FLUYO_BROKER_SOURCE_PATH: SOURCE_PATH,
        FLUYO_BROKER_CONTRACT_PATH: CONTRACT_PATH,
        FLUYO_BROKER_CAPABILITY: capability,
        FLUYO_BROKER_RECOVERY_ANCHOR: String(priorAnchor?.handle ?? 0),
        FLUYO_BROKER_CONFIRMED_PREFIX_SEQUENCE: String(priorAnchor?.journalSequence ?? 0),
        FLUYO_BROKER_CONFIRMED_PREFIX_DIGEST: priorAnchor?.journalDigest ?? "0".repeat(64),
      },
    },
  });
  worker.unref();
  const broker = {
    worker,
    key,
    nonce,
    repositoryRoot: normalizeRoot(repositoryRoot),
    sequence: 0n,
    controllerCreationIdentity,
    capability,
    journalSequence: priorAnchor?.journalSequence ?? 0,
    journalDigest: priorAnchor?.journalDigest ?? "0".repeat(64),
    exited: false,
  };
  worker.once("exit", () => {
    broker.exited = true;
    BROKERS.delete(key);
  });
  BROKERS.set(key, broker);
  return broker;
}

function nativeTransactionTimeoutMilliseconds(operation, sequence) {
  return operation === "HELLO" && sequence === 1n
    ? FIRST_BROKER_HELLO_BOOTSTRAP_TIMEOUT_MILLISECONDS
    : ORDINARY_NATIVE_TRANSACTION_TIMEOUT_MILLISECONDS;
}

function transactWithBroker(
  broker,
  request,
  options = {},
  timeoutMilliseconds = ORDINARY_NATIVE_TRANSACTION_TIMEOUT_MILLISECONDS,
) {
  const controlBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 4);
  const dataBuffer = new SharedArrayBuffer(MAX_RESPONSE_BYTES);
  const control = new Int32Array(controlBuffer);
  broker.worker.postMessage({
    request,
    control: controlBuffer,
    data: dataBuffer,
    testDropResponse: options.testDropResponse === true,
    testDropAck: options.testDropAck === true,
    testMalformedResponseBeforeAck: options.testMalformedResponseBeforeAck === true,
    expected: options.expected,
  });
  const outcome = Atomics.wait(control, 0, 0, timeoutMilliseconds);
  if (outcome === "timed-out") {
    const diagnosticLength = Atomics.load(control, 1);
    const diagnostic = Buffer.from(new Uint8Array(dataBuffer, 0, diagnosticLength)).toString(
      "utf8",
    );
    broker.exited = true;
    BROKERS.delete(broker.key);
    void broker.worker.terminate();
    throw new Error(
      `native capability-pipe response timed out at stage ${Atomics.load(control, 3)}${diagnostic ? `: ${diagnostic}` : ""}`,
    );
  }
  const length = Atomics.load(control, 1);
  const status = Atomics.load(control, 2);
  const bytes = Buffer.from(new Uint8Array(dataBuffer, 0, length));
  if (status === 3) throw new Error(bytes.toString("utf8"));
  if (status !== 1) {
    broker.exited = true;
    BROKERS.delete(broker.key);
    void broker.worker.terminate();
    throw new Error(bytes.toString("utf8"));
  }
  return bytes;
}

function normalizeRoot(root) {
  return resolve(root);
}

function relativeSegments(root, target) {
  const exactRoot = normalizeRoot(root);
  const exactTarget = resolve(target);
  const value = relative(exactRoot, exactTarget);
  if (value === "" || value === ".") return "";
  if (value === ".." || value.startsWith(`..${sep}`)) {
    throw new Error("native boundary target escaped its fixed root");
  }
  return value.replaceAll("\\", "/");
}

function responseResultVariant(operation, argumentsJson) {
  if (operation !== "NVDA_START_WITH_HANDLES") return undefined;
  const values = JSON.parse(argumentsJson ?? "[]");
  if (values.length === 13) return "CREATE";
  return values[0];
}

function executeNative(operation, rootId, root, relativePath, options = {}) {
  windowsTrustedTempRoot();
  const testMode = rootId === "TEST_ROOT";
  if (testMode && options.testCapability !== testRootCapability) {
    throw new Error("TEST_ROOT requires the in-process non-production test capability");
  }
  const broker = ensureBroker(root, testMode);
  // The controller must retain the broker-issued journal anchor before the
  // first mutation is allowed to start.  This also gives a replacement broker
  // an inherited, already-open journal handle after a lost response/process.
  if (operation !== "HELLO" && broker.sequence === 0n && options.sequence === undefined) {
    executeNative("HELLO", rootId, root, "", {
      testCapability: options.testCapability,
    });
  }
  const sessionNonce = broker.nonce;
  const sequence = options.sequence === undefined ? ++broker.sequence : BigInt(options.sequence);
  const sessionOnly =
    operation === "HELLO" ||
    operation === "SHUTDOWN" ||
    operation === "RECOVER_SESSION" ||
    [
      "UNPIN_FILE",
      "JOB_CREATE_SUSPENDED",
      "JOB_RESUME",
      "JOB_STATUS",
      "JOB_TERMINATE",
      "NVDA_START_WITH_HANDLES",
      "NVDA_STOP",
      "TEST_POST_ACK_JOURNAL_FAILURE",
    ].includes(operation);
  const request = encodeRequest(
    operation,
    {
      sessionNonce,
      rootId: sessionOnly ? undefined : rootId,
      relativePath: sessionOnly ? undefined : relativePath,
      relativePath2: options.relativePath2,
      maximumBytes: options.maximumBytes,
      maximumEntries: options.maximumEntries,
      maximumDirectories: options.maximumDirectories,
      maximumDepth: options.maximumDepth,
      maximumTotalBytes: options.maximumTotalBytes,
      expectedDigest: operation === "RECOVER_SESSION" ? undefined : options.expectedDigest,
      expectedVolumeSerial: options.expectedVolumeSerial,
      expectedFileId: options.expectedFileId,
      testOperation: options.testOperation,
      environmentDigest: options.environmentDigest,
      argvDigest: options.argvDigest,
      inventoryToken: options.inventoryToken,
      idempotencyKey: sha256(Buffer.from(`${sessionNonce}\0${sequence}\0${operation}`, "utf8")),
      controllerPid: process.pid,
      controllerCreationIdentity: broker.controllerCreationIdentity,
      expectedJournalSequence: broker.journalSequence,
      expectedJournalDigest: broker.journalDigest,
      capability:
        operation === "HELLO" || operation === "SHUTDOWN" || operation === "RECOVER_SESSION"
          ? undefined
          : broker.capability,
      argumentsJson: options.argumentsJson,
      recoveryRecord:
        operation === "RECOVER_SESSION" ? options.recoveryRecord : options.recoveryRecord,
    },
    options.payload ?? Buffer.alloc(0),
    sequence,
  );
  let output;
  try {
    output = transactWithBroker(
      broker,
      request,
      {
        ...options,
        expected: {
          sessionNonce,
          sequence: String(sequence),
          operation,
          requestSha256: sha256(request),
          resultVariant: responseResultVariant(operation, options.argumentsJson),
          mutation: MUTATION_OPERATIONS.has(operation),
        },
      },
      nativeTransactionTimeoutMilliseconds(operation, sequence),
    );
  } catch (error) {
    error.nativeRecoveryRequired = true;
    error.nativeTransportFailure = true;
    error.nativeOperation = operation;
    throw error;
  }
  const envelope = JSON.parse(output.toString("utf8"));
  const responseBytes = Buffer.from(envelope.responseBase64 ?? "", "base64");
  if (
    responseBytes.toString("base64") !== envelope.responseBase64 ||
    sha256(responseBytes) !== envelope.responseSha256
  ) {
    throw new Error("native worker did not preserve the exact raw response bytes");
  }
  const response = JSON.parse(responseBytes.toString("utf8"));
  const commitConfirmation = envelope.commitConfirmation;
  const expectedResponse = {
    sessionNonce,
    sequence: String(sequence),
    operation,
    requestSha256: sha256(request),
    resultVariant: responseResultVariant(operation, options.argumentsJson),
  };
  validateNativeResponseFrame(response, expectedResponse, "controller pre-ACK response");
  validateNativeResponseFrame(commitConfirmation, expectedResponse, "commit confirmation");
  if (
    response.magic !== RESPONSE_MAGIC ||
    response.version !== VERSION ||
    response.sessionNonce !== sessionNonce ||
    response.sequence !== String(sequence) ||
    response.operation !== operation ||
    response.requestSha256 !== sha256(request)
  ) {
    throw new Error("native boundary returned a response outside the closed frame contract");
  }
  if (
    !commitConfirmation ||
    commitConfirmation.commitStatus !== "COMMIT_CONFIRMED" ||
    commitConfirmation.sessionNonce !== sessionNonce ||
    commitConfirmation.sequence !== String(sequence) ||
    commitConfirmation.operation !== operation ||
    commitConfirmation.requestSha256 !== sha256(request) ||
    commitConfirmation.acknowledgedResponseSha256 !== envelope.responseSha256
  ) {
    throw new Error("native boundary omitted its durable COMMIT_CONFIRMED frame");
  }
  if (
    !/^[0-9a-f]{64}$/u.test(response.journalBeforeResponseSha256 ?? "") ||
    !/^(0|[1-9][0-9]*)$/u.test(response.journalBeforeResponseSequence ?? "") ||
    !/^[0-9a-f]{64}$/u.test(commitConfirmation.journalAfterAckSha256 ?? "") ||
    !/^(0|[1-9][0-9]*)$/u.test(commitConfirmation.journalAfterAckSequence ?? "")
  ) {
    throw new Error("native boundary omitted its exact post-ACK journal anchor");
  }
  broker.journalDigest = commitConfirmation.journalAfterAckSha256;
  broker.journalSequence = Number(commitConfirmation.journalAfterAckSequence);
  if (/^[1-9][0-9]*$/u.test(response.controllerJournalAnchorHandle ?? "")) {
    SESSION_ANCHORS.set(broker.key, {
      handle: response.controllerJournalAnchorHandle,
      journalSequence: broker.journalSequence,
      journalDigest: broker.journalDigest,
    });
  } else if (SESSION_ANCHORS.has(broker.key)) {
    const anchor = SESSION_ANCHORS.get(broker.key);
    SESSION_ANCHORS.set(broker.key, {
      ...anchor,
      journalSequence: broker.journalSequence,
      journalDigest: broker.journalDigest,
    });
  }
  if (response.status !== "PASS") {
    const readable = String(response.errorCode).replaceAll("_", " ").toLowerCase();
    const error = new Error(`native boundary ${operation} failed: ${readable}`);
    error.nativeRecoveryRequired = true;
    error.nativeOperation = operation;
    error.nativeResponseSha256 = envelope.responseSha256;
    throw error;
  }
  Object.defineProperty(response, "nativeResponseSha256", {
    value: envelope.responseSha256,
    enumerable: false,
  });
  return Object.freeze(response);
}

function isWithin(path, root) {
  const value = relative(normalizeRoot(root), normalizeRoot(path));
  return value === "" || (!value.startsWith(`..${sep}`) && value !== ".." && !isAbsolute(value));
}

function rootForTarget(target, repositoryRoot, mutation) {
  const exactRepository = normalizeRoot(repositoryRoot);
  if (exactRepository !== normalizeRoot(REPOSITORY_ROOT)) {
    if (testRootCapability === null)
      throw new Error("arbitrary native roots are disabled outside explicit tests");
    return { id: "TEST_ROOT", base: exactRepository, capability: testRootCapability };
  }
  const roots = [
    ["BUILD_OUTPUT_ROOT", resolve(REPOSITORY_ROOT, "apps/r4b-preflight-harness/.next-attempt-002")],
    ["BUILD_TEMP_ROOT", resolve(REPOSITORY_ROOT, ".r4b-preflight/runtime/attempt-002-build-temp")],
    [
      "NVDA_CONFIG_ROOT",
      resolve(
        REPOSITORY_ROOT,
        ".r4b-preflight/runtime/attempts/attempt-002-observer/raw/nvda/config",
      ),
    ],
    [
      "NVDA_PORTABLE_ROOT",
      resolve(
        REPOSITORY_ROOT,
        ".r4b-preflight/runtime/attempts/attempt-002-observer/raw/nvda/portable",
      ),
    ],
    [
      "NVDA_RAW_ROOT",
      resolve(REPOSITORY_ROOT, ".r4b-preflight/runtime/attempts/attempt-002-observer/raw/nvda"),
    ],
    [
      "RAW_ROOT",
      resolve(REPOSITORY_ROOT, ".r4b-preflight/runtime/attempts/attempt-002-observer/raw"),
    ],
    [
      "ATTEMPT_ROOT",
      resolve(REPOSITORY_ROOT, ".r4b-preflight/runtime/attempts/attempt-002-observer"),
    ],
    ["RUNTIME_CONTROL_ROOT", resolve(REPOSITORY_ROOT, ".r4b-preflight/runtime")],
    ["TOOLS_READ", resolve(REPOSITORY_ROOT, ".r4b-preflight/tools")],
    ["DOWNLOADS_READ", resolve(REPOSITORY_ROOT, ".r4b-preflight/downloads")],
  ];
  const match = roots.find(([, base]) => isWithin(target, base));
  if (match) return { id: match[0], base: match[1] };
  if (mutation) throw new Error("native mutation target is outside every closed writable root");
  return { id: "FROZEN_REPOSITORY_READ", base: REPOSITORY_ROOT };
}

export function nativeReadBounded(path, repositoryRoot, maximumBytes, label) {
  windowsTrustedTempRoot();
  const root = rootForTarget(path, repositoryRoot, false);
  const response = executeNative(
    "READ_BOUNDED",
    root.id,
    repositoryRoot,
    relativeSegments(root.base, path),
    {
      maximumBytes,
      expectedDigest: sha256(Buffer.from(label, "utf8")),
      testCapability: root.capability,
    },
  );
  return Buffer.from(response.payloadBase64, "base64");
}

export function nativeHashBounded(path, repositoryRoot, maximumBytes, label) {
  windowsTrustedTempRoot();
  const root = rootForTarget(path, repositoryRoot, false);
  return executeNative("HASH_BOUNDED", root.id, repositoryRoot, relativeSegments(root.base, path), {
    maximumBytes,
    expectedDigest: sha256(Buffer.from(label, "utf8")),
    testCapability: root.capability,
  }).contentSha256;
}

export function nativeCreateDirectory(path, repositoryRoot) {
  windowsTrustedTempRoot();
  const root = rootForTarget(path, repositoryRoot, true);
  return executeNative(
    "CREATE_DIRECTORY",
    root.id,
    repositoryRoot,
    relativeSegments(root.base, path),
    { testCapability: root.capability },
  );
}

export function nativeWrite(path, repositoryRoot, bytes, options = {}) {
  windowsTrustedTempRoot();
  const root = rootForTarget(path, repositoryRoot, true);
  const operation = options.flag === "a" ? "APPEND_DURABLE" : "WRITE_NEW";
  const identity = operation === "APPEND_DURABLE" ? nativePin(path, repositoryRoot) : null;
  return executeNative(operation, root.id, repositoryRoot, relativeSegments(root.base, path), {
    payload: Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, options.encoding ?? "utf8"),
    expectedVolumeSerial: identity?.volumeSerial,
    expectedFileId: identity?.fileId,
    testCapability: root.capability,
  });
}

export function nativeOverwriteExisting(path, repositoryRoot, bytes, options = {}) {
  windowsTrustedTempRoot();
  const root = rootForTarget(path, repositoryRoot, true);
  const identity = nativePin(path, repositoryRoot);
  return executeNative(
    "REPLACE_EXISTING_EXACT",
    root.id,
    repositoryRoot,
    relativeSegments(root.base, path),
    {
      payload: Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, options.encoding ?? "utf8"),
      expectedVolumeSerial: identity.volumeSerial,
      expectedFileId: identity.fileId,
      testCapability: root.capability,
    },
  );
}

export function nativeRename(source, destination, repositoryRoot) {
  windowsTrustedTempRoot();
  const root = rootForTarget(source, repositoryRoot, true);
  const destinationRoot = rootForTarget(destination, repositoryRoot, true);
  if (root.id !== destinationRoot.id) throw new Error("native rename cannot cross a closed root");
  const identity = nativePin(source, repositoryRoot);
  return executeNative(
    "RENAME_EXCLUSIVE",
    root.id,
    repositoryRoot,
    relativeSegments(root.base, source),
    {
      relativePath2: relativeSegments(root.base, destination),
      expectedVolumeSerial: identity.volumeSerial,
      expectedFileId: identity.fileId,
      testCapability: root.capability,
    },
  );
}

export function nativeUnlink(path, repositoryRoot) {
  windowsTrustedTempRoot();
  const root = rootForTarget(path, repositoryRoot, true);
  const identity = nativePin(path, repositoryRoot);
  return executeNative("UNLINK_EXACT", root.id, repositoryRoot, relativeSegments(root.base, path), {
    expectedVolumeSerial: identity.volumeSerial,
    expectedFileId: identity.fileId,
    testCapability: root.capability,
  });
}

export function nativeInventory(path, repositoryRoot, options = {}) {
  windowsTrustedTempRoot();
  const root = rootForTarget(path, repositoryRoot, false);
  return executeNative(
    "INVENTORY_TREE",
    root.id,
    repositoryRoot,
    relativeSegments(root.base, path),
    {
      maximumBytes: options.maximumFileBytes ?? 64 * 1024 * 1024,
      maximumTotalBytes: options.maximumTotalBytes ?? 512 * 1024 * 1024,
      maximumEntries: options.maximumEntries ?? 50000,
      maximumDirectories: options.maximumDirectories ?? 10000,
      maximumDepth: options.maximumDepth ?? 32,
      testCapability: root.capability,
    },
  );
}

export function nativeReleaseInventory(path, repositoryRoot, inventory) {
  windowsTrustedTempRoot();
  if (!inventory?.inventoryLeaseId || !inventory?.inventoryTokenBase64) {
    throw new Error("inventory release requires the original retained lease and token");
  }
  const root = rootForTarget(path, repositoryRoot, false);
  return executeNative("UNPIN_FILE", root.id, repositoryRoot, "", {
    argumentsJson: JSON.stringify([inventory.inventoryLeaseId, inventory.inventoryTokenBase64]),
    testCapability: root.capability,
  });
}

export function nativeRemoveTree(path, repositoryRoot, expectedDigest, options = {}) {
  windowsTrustedTempRoot();
  const root = rootForTarget(path, repositoryRoot, true);
  const prior = options.inventory;
  if (!prior?.inventoryTokenBase64) {
    throw new Error("cleanup requires the original approved retained inventory token");
  }
  if (prior.inventoryDigest !== expectedDigest)
    throw new Error("cleanup digest does not match the retained prior inventory");
  return executeNative(
    "REMOVE_TREE_EXACT",
    root.id,
    repositoryRoot,
    relativeSegments(root.base, path),
    {
      expectedDigest,
      inventoryToken: prior.inventoryTokenBase64,
      maximumBytes: options.maximumFileBytes ?? 64 * 1024 * 1024,
      maximumTotalBytes: options.maximumTotalBytes ?? 512 * 1024 * 1024,
      maximumEntries: options.maximumEntries ?? 50000,
      maximumDirectories: options.maximumDirectories ?? 10000,
      maximumDepth: options.maximumDepth ?? 32,
      testCapability: root.capability,
    },
  );
}

export function nativeSynchronizedSwapTest(root, operation) {
  windowsTrustedTempRoot();
  return executeNative("TEST_SYNCHRONIZED_SWAP", "TEST_ROOT", root, "owned", {
    testOperation: operation,
    testCapability: testRootCapability,
  });
}

function nativePin(path, repositoryRoot) {
  const root = rootForTarget(path, repositoryRoot, false);
  return executeNative("PIN_FILE", root.id, repositoryRoot, relativeSegments(root.base, path), {
    maximumBytes: 536870912,
    testCapability: root.capability,
  });
}

function enableTestRoot() {
  windowsTrustedTempRoot();
  if (testRootCapability === null) testRootCapability = randomBytes(32).toString("hex");
  return testRootCapability;
}

function runDirectFrameForTest(request) {
  windowsTrustedTempRoot();
  const output = execFileSync(
    POWERSHELL,
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      DIRECT_TEST_BOOTSTRAP,
    ],
    {
      input: request,
      env: {
        ComSpec: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
        SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
        FLUYO_BROKER_SOURCE_PATH: SOURCE_PATH,
        FLUYO_BROKER_SOURCE_SHA256: EXPECTED_SOURCE_SHA256,
      },
      maxBuffer: MAX_RESPONSE_BYTES,
      windowsHide: true,
    },
  );
  return JSON.parse(output.toString("utf8"));
}

function executeTestNative(operation, root, relativePath = "", options = {}) {
  windowsTrustedTempRoot();
  enableTestRoot();
  return executeNative(operation, "TEST_ROOT", root, relativePath, {
    ...options,
    testCapability: testRootCapability,
  });
}

function brokerStateForTest(root) {
  windowsTrustedTempRoot();
  const broker = BROKERS.get(brokerKey(root, true));
  if (!broker) throw new Error("test broker is not active");
  return Object.freeze({
    nextSequence: broker.sequence + 1n,
    workerThreadId: broker.worker.threadId,
  });
}

async function terminateBrokerForTest(root) {
  windowsTrustedTempRoot();
  const key = brokerKey(root, true);
  const broker = BROKERS.get(key);
  if (!broker) return;
  try {
    executeNative("SHUTDOWN", "TEST_ROOT", root, "", {
      testCapability: testRootCapability,
    });
  } catch {
    // A deliberately orphaned/permanently-held fixture may refuse every
    // operation except its closed recovery surface. Termination is still the
    // only test-only release path for that broker; production never uses it.
  }
  await broker.worker.terminate();
  broker.exited = true;
  if (BROKERS.get(key) === broker) BROKERS.delete(key);
}

function crashBrokerForTest(root) {
  windowsTrustedTempRoot();
  const key = brokerKey(root, true);
  const broker = BROKERS.get(key);
  if (!broker) return Promise.resolve();
  broker.exited = true;
  BROKERS.delete(key);
  broker.worker.postMessage({ type: "crash-broker-for-test" });
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  return broker.worker.terminate();
}

function shutdownBrokers() {
  for (const broker of BROKERS.values()) {
    try {
      executeNative(
        "SHUTDOWN",
        broker.repositoryRoot === normalizeRoot(REPOSITORY_ROOT)
          ? "FROZEN_REPOSITORY_READ"
          : "TEST_ROOT",
        broker.repositoryRoot,
        "",
        {
          testCapability:
            broker.repositoryRoot === normalizeRoot(REPOSITORY_ROOT)
              ? undefined
              : testRootCapability,
        },
      );
    } catch {
      void broker.worker.terminate();
    }
    broker.exited = true;
    void broker.worker.terminate();
  }
  BROKERS.clear();
}

process.once("exit", shutdownBrokers);

function recoverNativeSessionAt(
  rootId,
  root,
  testCapability,
  { failureEvent, requestId, controllerCreationIdentity, journalSequence, journalDigest },
) {
  const events = new Set([
    "BUILD_TRANSACTION_FAILED",
    "OBSERVATION_TRANSACTION_FAILED",
    "NATIVE_TRANSACTION_FAILED",
  ]);
  if (
    !events.has(failureEvent) ||
    !/^[0-9a-f]{64}$/u.test(requestId ?? "") ||
    typeof controllerCreationIdentity !== "string" ||
    controllerCreationIdentity.length === 0 ||
    !Number.isSafeInteger(journalSequence) ||
    journalSequence < 0 ||
    !/^[0-9a-f]{64}$/u.test(journalDigest ?? "")
  ) {
    throw new Error("RECOVER_SESSION requires the exact closed production failure record");
  }
  return executeNative("RECOVER_SESSION", rootId, root, "", {
    recoveryRecord: [
      failureEvent,
      requestId,
      controllerCreationIdentity,
      String(journalSequence),
      journalDigest,
    ].join("|"),
    testCapability,
  });
}

export function recoverNativeSession(record) {
  windowsTrustedTempRoot();
  return recoverNativeSessionAt("FROZEN_REPOSITORY_READ", REPOSITORY_ROOT, undefined, record);
}

function recoverValidatedFailureAt(rootId, root, testCapability, failureRecord) {
  const expectedKeys = ["failureEvent"];
  if (
    !failureRecord ||
    Array.isArray(failureRecord) ||
    JSON.stringify(Object.keys(failureRecord)) !== JSON.stringify(expectedKeys)
  ) {
    throw new Error("native recovery failure record has extra, missing, or reordered fields");
  }
  const hello = executeNative("HELLO", rootId, root, "", { testCapability });
  if (
    !new Set(["FAILED_HELD", "APPLIED_UNACKED_DURABLE", "ACKED_COMMITTED_DURABLE"]).has(
      hello.lastJournalState,
    ) ||
    !/^[0-9a-f]{64}$/u.test(hello.lastRequestId ?? "") ||
    !Number.isSafeInteger(Number(hello.journalSequence)) ||
    !/^[0-9a-f]{64}$/u.test(hello.journalSha256 ?? "")
  ) {
    throw new Error("native recovery has no exact held transaction anchor");
  }
  return recoverNativeSessionAt(rootId, root, testCapability, {
    ...failureRecord,
    requestId: hello.lastRequestId,
    controllerCreationIdentity: hello.controllerCreationIdentity,
    journalSequence: Number(hello.journalSequence),
    journalDigest: hello.journalSha256,
  });
}

export function recoverNativeSessionFromFailureRecord(failureRecord) {
  windowsTrustedTempRoot();
  return recoverValidatedFailureAt(
    "FROZEN_REPOSITORY_READ",
    REPOSITORY_ROOT,
    undefined,
    failureRecord,
  );
}

export function recoverNativeFailure(error, failureEvent) {
  windowsTrustedTempRoot();
  if (error?.nativeRecoveryRequired !== true) return null;
  if (error.nativeTransportFailure === true) {
    const key = brokerKey(REPOSITORY_ROOT, false);
    const broker = BROKERS.get(key);
    if (broker) {
      broker.exited = true;
      BROKERS.delete(key);
      void broker.worker.terminate();
    }
  }
  return recoverNativeSessionFromFailureRecord({ failureEvent });
}

function spawnNativeJobBoundaryWith(arguments_, options, invoke) {
  windowsTrustedTempRoot();
  if (!Array.isArray(arguments_) || arguments_.length !== 23) {
    throw new Error("native Job boundary requires exactly 23 closed caller arguments");
  }
  const response = invoke("JOB_CREATE_SUSPENDED", {
    argumentsJson: JSON.stringify(arguments_),
    environmentDigest: arguments_[12],
    argvDigest: arguments_[5],
  });
  const pinnedIdentity = (value) => /^(0|[1-9][0-9]*):[0-9A-Fa-f]{32}$/u.test(value ?? "");
  const expectedOutputAuthority = sha256(
    Buffer.from(
      [
        "BUILD_OUTPUT_ROOT",
        arguments_[20],
        response.cwdIdentity,
        arguments_[22],
        ".next-attempt-002",
      ].join("\n"),
      "utf8",
    ),
  );
  const assignmentBytes = Buffer.from(response.assignmentReceiptBase64 ?? "", "base64");
  if (
    response.outputAuthorityRootId !== "BUILD_OUTPUT_ROOT" ||
    response.distDir !== ".next-attempt-002" ||
    response.infrastructurePlanDigest !== arguments_[22] ||
    response.outputPathSha256 !== arguments_[20] ||
    response.outputAuthoritySha256 !== expectedOutputAuthority ||
    response.retainedOutputParentIdentity !== response.cwdIdentity ||
    sha256(assignmentBytes) !== response.assignmentReceiptSha256 ||
    ![
      response.nodeIdentity,
      response.nextIdentity,
      response.powerShellIdentity,
      response.clientIdentity,
      response.cwdIdentity,
      response.tempIdentity,
    ].every(pinnedIdentity)
  ) {
    throw new Error("native Job response omitted its complete pinned output authority");
  }
  const proxy = new EventEmitter();
  proxy.pid = Number(response.brokerPid);
  proxy.builderPid = Number(response.builderPid);
  proxy.exitCode = null;
  proxy.signalCode = null;
  proxy.stdout = new PassThrough();
  proxy.stderr = new PassThrough();
  proxy.assignmentReceipt = Object.freeze({
    assigned: Object.freeze({
      schema: "fluyo:r4b:attempt-002-builder-job:v2",
      attemptId: "attempt-002-observer",
      event: "JOB_ASSIGNED",
      helperPid: proxy.pid,
      builderPid: proxy.builderPid,
      canonicalArgvSha256: response.canonicalArgvSha256,
      environmentSha256: response.environmentSha256,
      outputAuthoritySha256: response.outputAuthoritySha256,
      outputPathSha256: response.outputPathSha256,
      infrastructurePlanDigest: response.infrastructurePlanDigest,
      outputAuthorityRootId: response.outputAuthorityRootId,
      retainedOutputParentIdentity: response.retainedOutputParentIdentity,
      distDir: response.distDir,
      nodeIdentity: response.nodeIdentity,
      nextIdentity: response.nextIdentity,
      powerShellIdentity: response.powerShellIdentity,
      clientIdentity: response.clientIdentity,
      cwdIdentity: response.cwdIdentity,
      tempIdentity: response.tempIdentity,
      limitFlags: response.limitFlags,
      status: "PASS",
    }),
    assignedReceiptSha256: response.assignmentReceiptSha256,
  });
  let poll;
  proxy.resume = () => {
    const resumed = invoke("JOB_RESUME", {
      argumentsJson: JSON.stringify([response.jobToken]),
    });
    if (!poll) {
      poll = setInterval(() => {
        try {
          const status = invoke("JOB_STATUS", {
            argumentsJson: JSON.stringify([response.jobToken]),
          });
          if (status.jobState !== "CLOSED") return;
          clearInterval(poll);
          poll = undefined;
          proxy.exitCode = Number(status.exitCode);
          proxy.closedReceipt = Object.freeze(
            Object.fromEntries(
              Buffer.from(status.closedReceiptBase64, "base64")
                .toString("utf8")
                .split("\n")
                .map((line) => line.split("=")),
            ),
          );
          proxy.stdout.end();
          proxy.stderr.end();
          proxy.emit("exit", proxy.exitCode, null);
        } catch (error) {
          clearInterval(poll);
          poll = undefined;
          proxy.emit("error", error);
        }
      }, 100);
      poll.unref?.();
    }
    return resumed;
  };
  proxy.kill = () => {
    if (poll) clearInterval(poll);
    const terminated = invoke("JOB_TERMINATE", {
      argumentsJson: JSON.stringify([response.jobToken]),
    });
    proxy.exitCode = Number(terminated.exitCode || 0);
    proxy.signalCode = "SIGTERM";
    proxy.stdout.end();
    proxy.stderr.end();
    proxy.emit("exit", proxy.exitCode, proxy.signalCode);
    return true;
  };
  Object.defineProperty(proxy, "nativeJobToken", { value: response.jobToken });
  Object.defineProperty(proxy, "spawnOptions", { value: options });
  return proxy;
}

export function spawnNativeJobBoundary(arguments_, options = {}) {
  windowsTrustedTempRoot();
  return spawnNativeJobBoundaryWith(arguments_, options, (operation, nativeOptions) =>
    executeNative(operation, "FROZEN_REPOSITORY_READ", REPOSITORY_ROOT, "", nativeOptions),
  );
}

export function spawnNativeNvdaBoundary(arguments_, options = {}) {
  windowsTrustedTempRoot();
  if (!Array.isArray(arguments_) || arguments_.length !== 13) {
    throw new Error("native NVDA boundary requires exactly 13 closed arguments");
  }
  const response = executeNative(
    "NVDA_START_WITH_HANDLES",
    "FROZEN_REPOSITORY_READ",
    REPOSITORY_ROOT,
    "",
    { argumentsJson: JSON.stringify(arguments_) },
  );
  const identities = [response.controllerPid, response.brokerPid, response.nvdaPid];
  if (
    new Set(identities).size !== 3 ||
    !identities.every((value) => /^[1-9][0-9]*$/u.test(value ?? "")) ||
    response.pinnedHandleCount !== "8" ||
    response.inheritedHandleCount !== "10" ||
    response.controlTransport !== "INHERITED_ANONYMOUS_PIPE" ||
    response.readyTransport !== "INHERITED_ANONYMOUS_PIPE" ||
    response.transcriptExternalWriteShare !== "DENIED" ||
    response.diagnosticExternalWriteShare !== "DENIED" ||
    response.capabilities !==
      "CONTROL_WRITE|READY_READ|TRANSCRIPT_READ|DIAGNOSTIC_READ|OWNED_JOB_STOP" ||
    typeof response.controllerCreationIdentity !== "string" ||
    !/^[1-9][0-9]*$/u.test(response.brokerCreationIdentity ?? "") ||
    !/^[1-9][0-9]*$/u.test(response.nvdaCreationIdentity ?? "")
  ) {
    throw new Error("native NVDA response omitted its exact identities, handles, or capabilities");
  }
  const proxy = new EventEmitter();
  proxy.pid = Number(response.nvdaPid);
  proxy.brokerPid = Number(response.brokerPid);
  proxy.controllerPid = Number(response.controllerPid);
  proxy.exitCode = null;
  proxy.signalCode = null;
  proxy.stdout = new PassThrough();
  proxy.stderr = new PassThrough();
  const invoke = (values) =>
    executeNative("NVDA_START_WITH_HANDLES", "FROZEN_REPOSITORY_READ", REPOSITORY_ROOT, "", {
      argumentsJson: JSON.stringify(values),
    });
  proxy.writeControl = (control) =>
    invoke(["CONTROL", response.nvdaToken, JSON.stringify(control)]);
  proxy.readReady = () =>
    Buffer.from(invoke(["READY", response.nvdaToken]).payloadBase64, "base64");
  proxy.readTranscript = () =>
    Buffer.from(invoke(["TRANSCRIPT", response.nvdaToken]).payloadBase64, "base64");
  proxy.readDiagnostic = () =>
    Buffer.from(invoke(["DIAGNOSTIC", response.nvdaToken]).payloadBase64, "base64");
  proxy.status = () => invoke(["STATUS", response.nvdaToken]);
  proxy.kill = () => {
    const terminated = executeNative("NVDA_STOP", "FROZEN_REPOSITORY_READ", REPOSITORY_ROOT, "", {
      argumentsJson: JSON.stringify([response.nvdaToken]),
    });
    proxy.exitCode = Number(terminated.exitCode || 0);
    proxy.signalCode = "SIGTERM";
    proxy.stdout.end();
    proxy.stderr.end();
    proxy.emit("exit", proxy.exitCode, proxy.signalCode);
    return true;
  };
  proxy.nativeReceipt = Object.freeze({ ...response });
  Object.defineProperty(proxy, "nativeNvdaToken", { value: response.nvdaToken });
  Object.defineProperty(proxy, "spawnOptions", { value: options });
  return proxy;
}

export const windowsNativeBoundaryTesting = Object.freeze({
  ORDINARY_NATIVE_TRANSACTION_TIMEOUT_MILLISECONDS,
  FIRST_BROKER_HELLO_BOOTSTRAP_TIMEOUT_MILLISECONDS,
  nativeTransactionTimeoutMilliseconds,
  BROKER_BOOTSTRAP,
  DIRECT_TEST_BOOTSTRAP,
  FIELD_IDS,
  OPERATIONS,
  encodeRequest,
  executeNative,
  enableTestRoot,
  executeTestNative,
  renameTestNativeWithDroppedAck: (root, source, destination) => {
    enableTestRoot();
    const identity = nativePin(source, root);
    return executeNative("RENAME_EXCLUSIVE", "TEST_ROOT", root, relativeSegments(root, source), {
      relativePath2: relativeSegments(root, destination),
      expectedVolumeSerial: identity.volumeSerial,
      expectedFileId: identity.fileId,
      testCapability: testRootCapability,
      testDropAck: true,
    });
  },
  recoverTestNativeSessionFromFailureRecord: (root, failureRecord) => {
    enableTestRoot();
    return recoverValidatedFailureAt("TEST_ROOT", root, testRootCapability, failureRecord);
  },
  spawnTestJobBoundary: (arguments_, root, options = {}) => {
    enableTestRoot();
    return spawnNativeJobBoundaryWith(arguments_, options, (operation, nativeOptions) =>
      executeNative(operation, "TEST_ROOT", root, "", {
        ...nativeOptions,
        testCapability: testRootCapability,
      }),
    );
  },
  brokerStateForTest,
  terminateBrokerForTest,
  crashBrokerForTest,
  journalPathFor,
  requireTestJournalRunId,
  runDirectFrameForTest,
  shutdownBrokers: () => {
    windowsTrustedTempRoot();
    return shutdownBrokers();
  },
  loadBoundarySource: () => {
    windowsTrustedTempRoot();
    return loadBoundarySource();
  },
  loadBoundaryContract: () => {
    windowsTrustedTempRoot();
    return loadBoundaryContract();
  },
  relativeSegments,
  sourcePath: SOURCE_PATH,
});
