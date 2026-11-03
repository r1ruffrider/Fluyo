using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using Microsoft.Win32.SafeHandles;

public static class FluyoNativeBoundary
{
    private const string EmbeddedContractSha256 = "828b1756539f143369b728ef0ac27c4dd379346e664199153eea8be82b72e1d6";
    private const uint GENERIC_READ = 0x80000000;
    private const uint GENERIC_WRITE = 0x40000000;
    private const uint FILE_APPEND_DATA = 0x00000004;
    private const uint FILE_LIST_DIRECTORY = 0x00000001;
    private const uint FILE_ADD_FILE = 0x00000002;
    private const uint FILE_READ_ATTRIBUTES = 0x00000080;
    private const uint DELETE = 0x00010000;
    private const uint SYNCHRONIZE = 0x00100000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint FILE_SHARE_DELETE = 0x00000004;
    private const uint CREATE_NEW = 1;
    private const uint OPEN_EXISTING = 3;
    private const uint OPEN_ALWAYS = 4;
    private const uint FILE_ATTRIBUTE_NORMAL = 0x00000080;
    private const uint FILE_ATTRIBUTE_DIRECTORY = 0x00000010;
    private const uint FILE_ATTRIBUTE_REPARSE_POINT = 0x00000400;
    private const uint FILE_FLAG_WRITE_THROUGH = 0x80000000;
    private const uint FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000;
    private const uint FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;
    private const uint FILE_DISPOSITION_FLAG_DELETE = 0x00000001;
    private const uint FILE_DISPOSITION_FLAG_POSIX_SEMANTICS = 0x00000002;
    private const uint FILE_DISPOSITION_FLAG_IGNORE_READONLY_ATTRIBUTE = 0x00000010;
    private const int FileAttributeTagInfo = 9;
    private const int FileIdInfo = 18;
    private const int FileRenameInfo = 3;
    private const int FileDispositionInfo = 4;
    private const int FileDispositionInfoEx = 21;
    private const int DRIVE_FIXED = 3;
    private const int ERROR_ALREADY_EXISTS = 183;
    private const int ERROR_FILE_EXISTS = 80;
    private const int MaxHeaderBytes = 65536;
    private const long MaxPayloadBytes = 536870912;
    private static string BrokerRepositoryRoot;
    private static string BrokerSessionNonce;
    private static string BrokerJournalPath;
    private static bool BrokerTestMode;
    private static ulong BrokerNextSequence = 1;
    private static bool BrokerCrashHeld;
    private static string BrokerHoldState = "CLOSED";
    private static string BrokerJournalFailureReason = "NONE";
    private static bool BrokerJournalWasCreated;
    private static string BrokerLastJournalHash = new string('0', 64);
    private static long BrokerJournalRecordCount;
    private static SafeFileHandle BrokerJournalHandle;
    private static HeldChain BrokerJournalChain;
    private static Frame BrokerPendingFrame;
    private static byte[] BrokerPendingResponse;
    private static string BrokerPendingOperation;
    private static bool BrokerPendingMutation;
    private static bool BrokerResponseNeedsCommit;
    private static string BrokerPowerShellIdentity;
    private static string BrokerPowerShellVersion;
    private static string BrokerPowerShellSignature;
    private static string BrokerContractDigest;
    private static string BrokerCapability;
    private static long BrokerControllerJournalAnchor;
    private static int BrokerControllerPid;
    private static string BrokerControllerCreationIdentity;
    private static string BrokerLastJournalState = "EMPTY";
    private static string BrokerLastRequestSha256 = new string('0', 64);
    private static string BrokerLastSessionNonce = new string('0', 32);
    private static string BrokerLastOperation = "NONE";
    private static ulong BrokerLastRequestSequence;
    private static string BrokerLastRootId = "SESSION";
    private static string BrokerLastRelativePath = "";
    private static string BrokerLastRelativePath2 = "";
    private static string BrokerLastBeforeIdentity = "ABSENT";
    private static string BrokerLastAfterIdentity = "ABSENT";
    private static string BrokerLastResponseBase64 = "";
    private static string BrokerLastResponseSha256 = new string('0', 64);
    private static string BrokerPendingBeforeIdentity = "ABSENT";
    private static string BrokerPendingAfterIdentity = "ABSENT";
    private static readonly Dictionary<string, InventoryLease> BrokerInventoryLeases = new Dictionary<string, InventoryLease>(StringComparer.Ordinal);
    private static BrokerJobState BrokerJob;
    private static BrokerNvdaState BrokerNvda;
    private static uint BrokerLastInjectedConsumerPid;

    [StructLayout(LayoutKind.Sequential)]
    private struct FILE_ATTRIBUTE_TAG_INFO
    {
        public uint FileAttributes;
        public uint ReparseTag;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct SECURITY_ATTRIBUTES
    {
        public int nLength;
        public IntPtr lpSecurityDescriptor;
        [MarshalAs(UnmanagedType.Bool)] public bool bInheritHandle;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct FILE_ID_INFO
    {
        public ulong VolumeSerialNumber;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 16)]
        public byte[] FileId;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct FILE_DISPOSITION_INFO
    {
        [MarshalAs(UnmanagedType.Bool)] public bool DeleteFile;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct FILE_DISPOSITION_INFO_EX
    {
        public uint Flags;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFileW(
        string fileName,
        uint desiredAccess,
        uint shareMode,
        IntPtr securityAttributes,
        uint creationDisposition,
        uint flagsAndAttributes,
        IntPtr templateFile);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CreateDirectoryW(string path, IntPtr securityAttributes);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetFileInformationByHandleEx(
        SafeFileHandle handle,
        int informationClass,
        out FILE_ATTRIBUTE_TAG_INFO information,
        uint bufferSize);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetFileInformationByHandleEx(
        SafeFileHandle handle,
        int informationClass,
        out FILE_ID_INFO information,
        uint bufferSize);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern uint GetFinalPathNameByHandleW(
        SafeFileHandle handle,
        StringBuilder path,
        uint pathLength,
        uint flags);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetVolumePathNameW(string fileName, StringBuilder volumePath, uint size);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetVolumeInformationW(
        string rootPathName,
        StringBuilder volumeName,
        uint volumeNameSize,
        out uint volumeSerial,
        out uint maximumComponentLength,
        out uint fileSystemFlags,
        StringBuilder fileSystemName,
        uint fileSystemNameSize);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern uint GetDriveTypeW(string rootPathName);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetFileInformationByHandle(
        SafeFileHandle handle,
        int informationClass,
        IntPtr information,
        uint bufferSize);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool FlushFileBuffers(SafeFileHandle handle);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetHandleInformation(IntPtr handle, uint mask, uint flags);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CreatePipe(out SafeFileHandle readPipe, out SafeFileHandle writePipe,
        ref SECURITY_ATTRIBUTES pipeAttributes, uint size);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint desiredAccess, bool inheritHandle, int processId);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool DuplicateHandle(IntPtr sourceProcess, IntPtr sourceHandle, IntPtr targetProcess,
        out IntPtr targetHandle, uint desiredAccess, bool inheritHandle, uint options);

    [DllImport("kernel32.dll")]
    private static extern IntPtr GetCurrentProcess();

    private const uint PROCESS_DUP_HANDLE = 0x00000040;
    private const uint DUPLICATE_SAME_ACCESS = 0x00000002;

    private sealed class HandleIdentity
    {
        public ulong Volume;
        public string FileId;
        public string FinalPath;
        public bool Directory;
    }

    private sealed class HeldChain : IDisposable
    {
        public readonly string Root;
        public readonly List<SafeFileHandle> Handles = new List<SafeFileHandle>();
        public readonly List<HandleIdentity> Identities = new List<HandleIdentity>();
        public HeldChain(string root) { Root = root; }
        public void Dispose()
        {
            for (int index = Handles.Count - 1; index >= 0; index--) Handles[index].Dispose();
            Handles.Clear();
        }
    }

    private sealed class Frame
    {
        public ulong Sequence;
        public uint Operation;
        public byte[] RequestSha256;
        public byte[] Payload;
        public readonly Dictionary<ushort, string> Fields = new Dictionary<ushort, string>();
    }

    private sealed class InventoryRecord
    {
        public string RelativePath;
        public bool Directory;
        public long Bytes;
        public string Sha256;
        public ulong Volume;
        public string FileId;
        public SafeFileHandle Handle;
    }

    private sealed class InventoryResult
    {
        public readonly List<InventoryRecord> Records = new List<InventoryRecord>();
        public long TotalBytes;
        public int Directories;
        public string Digest;
    }

    private sealed class InventoryLease : IDisposable
    {
        public string RootId;
        public string Target;
        public string Token;
        public InventoryResult Inventory;
        public bool Deleted;
        public readonly List<SafeFileHandle> Handles = new List<SafeFileHandle>();
        public void Dispose()
        {
            foreach (SafeFileHandle handle in Handles) handle.Dispose();
            Handles.Clear();
        }
    }

    private static void Win32(bool value, string operation)
    {
        if (!value) throw new Win32Exception(Marshal.GetLastWin32Error(), operation);
    }

    private static string Hex(byte[] bytes)
    {
        StringBuilder output = new StringBuilder(bytes.Length * 2);
        foreach (byte value in bytes) output.Append(value.ToString("x2", CultureInfo.InvariantCulture));
        return output.ToString();
    }

    private static byte[] Sha256(byte[] bytes)
    {
        using (SHA256 hash = SHA256.Create()) return hash.ComputeHash(bytes);
    }

    private static string Sha256Hex(byte[] bytes) { return Hex(Sha256(bytes)); }

    private static string JsonEscape(string value)
    {
        if (value == null) return "";
        StringBuilder output = new StringBuilder();
        foreach (char character in value)
        {
            switch (character)
            {
                case '\\': output.Append("\\\\"); break;
                case '"': output.Append("\\\""); break;
                case '\n': output.Append("\\n"); break;
                case '\r': output.Append("\\r"); break;
                case '\t': output.Append("\\t"); break;
                default:
                    if (character < 0x20) output.Append("\\u" + ((int)character).ToString("x4"));
                    else output.Append(character);
                    break;
            }
        }
        return output.ToString();
    }

    private static Frame ParseFrame(byte[] request)
    {
        if (request == null || request.Length < 36) throw new InvalidDataException("FRAME_TRUNCATED");
        string magic = Encoding.ASCII.GetString(request, 0, 8);
        if (magic != "FLUYONR1") throw new InvalidDataException("FRAME_MAGIC");
        uint version = BitConverter.ToUInt32(request, 8);
        if (version != 1) throw new InvalidDataException("FRAME_VERSION");
        Frame frame = new Frame();
        frame.Sequence = BitConverter.ToUInt64(request, 12);
        frame.Operation = BitConverter.ToUInt32(request, 20);
        uint headerBytes = BitConverter.ToUInt32(request, 24);
        ulong payloadBytes = BitConverter.ToUInt64(request, 28);
        if (headerBytes > MaxHeaderBytes || payloadBytes > MaxPayloadBytes) throw new InvalidDataException("FRAME_BOUND");
        if ((ulong)request.Length != 36UL + headerBytes + payloadBytes) throw new InvalidDataException("FRAME_LENGTH");
        int offset = 36;
        ushort previous = 0;
        int headerEnd = 36 + checked((int)headerBytes);
        while (offset < headerEnd)
        {
            if (offset + 6 > headerEnd) throw new InvalidDataException("FIELD_TRUNCATED");
            ushort id = BitConverter.ToUInt16(request, offset);
            uint length = BitConverter.ToUInt32(request, offset + 2);
            offset += 6;
            if (id <= previous || offset + length > headerEnd) throw new InvalidDataException("FIELD_ORDER_OR_LENGTH");
            previous = id;
            string value = new UTF8Encoding(false, true).GetString(request, offset, checked((int)length));
            if (frame.Fields.ContainsKey(id)) throw new InvalidDataException("FIELD_DUPLICATE");
            frame.Fields.Add(id, value);
            offset += checked((int)length);
        }
        frame.Payload = new byte[checked((int)payloadBytes)];
        Buffer.BlockCopy(request, headerEnd, frame.Payload, 0, frame.Payload.Length);
        frame.RequestSha256 = Sha256(request);
        return frame;
    }

    private static void ExactSchema(Frame frame, uint operation, long maximumPayload, params ushort[] ids)
    {
        ushort[] actual = frame.Fields.Keys.OrderBy(value => value).ToArray();
        ushort[] expected = ids.OrderBy(value => value).ToArray();
        if (!actual.SequenceEqual(expected)) throw new InvalidDataException("FIELD_SCHEMA_" + operation.ToString(CultureInfo.InvariantCulture));
        if (frame.Payload.LongLength > maximumPayload) throw new InvalidDataException("PAYLOAD_CAP_" + operation.ToString(CultureInfo.InvariantCulture));
        if (maximumPayload == 0 && frame.Payload.Length != 0) throw new InvalidDataException("PAYLOAD_FORBIDDEN_" + operation.ToString(CultureInfo.InvariantCulture));
    }

    private static void ValidateOperationSchema(Frame frame)
    {
        switch (frame.Operation)
        {
            case 1: ExactSchema(frame, frame.Operation, 0, 1, 17, 18, 19, 20, 21); break;
            case 2:
            case 3: ExactSchema(frame, frame.Operation, 0, 1, 2, 3, 5, 10, 17, 18, 19, 20, 21, 22); break;
            case 4: ExactSchema(frame, frame.Operation, 0, 1, 2, 3, 5, 6, 7, 8, 9, 17, 18, 19, 20, 21, 22); break;
            case 5: ExactSchema(frame, frame.Operation, 0, 1, 2, 3, 17, 18, 19, 20, 21, 22); break;
            case 6: ExactSchema(frame, frame.Operation, 67108864, 1, 2, 3, 17, 18, 19, 20, 21, 22); break;
            case 7: ExactSchema(frame, frame.Operation, 67108864, 1, 2, 3, 11, 12, 17, 18, 19, 20, 21, 22); break;
            case 8: ExactSchema(frame, frame.Operation, 0, 1, 2, 3, 4, 11, 12, 17, 18, 19, 20, 21, 22); break;
            case 9: ExactSchema(frame, frame.Operation, 0, 1, 2, 3, 11, 12, 17, 18, 19, 20, 21, 22); break;
            case 10: ExactSchema(frame, frame.Operation, 0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 16, 17, 18, 19, 20, 21, 22); break;
            case 11: ExactSchema(frame, frame.Operation, 0, 1, 2, 3, 5, 17, 18, 19, 20, 21, 22); break;
            case 12: ExactSchema(frame, frame.Operation, 0, 1, 17, 18, 19, 20, 21, 22, 23); break;
            case 13: ExactSchema(frame, frame.Operation, 0, 1, 14, 15, 17, 18, 19, 20, 21, 22, 23); break;
            case 14:
            case 15:
            case 16:
            case 17:
            case 18: ExactSchema(frame, frame.Operation, 0, 1, 17, 18, 19, 20, 21, 22, 23); break;
            case 19: ExactSchema(frame, frame.Operation, 0, 1, 2, 3, 13, 17, 18, 19, 20, 21, 22); break;
            case 20: ExactSchema(frame, frame.Operation, 0, 1, 17, 18, 19, 20, 21); break;
            case 21: ExactSchema(frame, frame.Operation, 0, 1, 17, 18, 19, 20, 21, 24); break;
            case 22: ExactSchema(frame, frame.Operation, 0, 1, 2, 3, 17, 18, 19, 20, 21, 22); break;
            case 23: ExactSchema(frame, frame.Operation, 67108864, 1, 2, 3, 11, 12, 17, 18, 19, 20, 21, 22); break;
            case 24: ExactSchema(frame, frame.Operation, 0, 1, 17, 18, 19, 20, 21, 22); break;
            default: throw new InvalidDataException("OPERATION_UNIMPLEMENTED");
        }
    }

    private static string Required(Frame frame, ushort id)
    {
        string value;
        if (!frame.Fields.TryGetValue(id, out value)) throw new InvalidDataException("FIELD_REQUIRED_" + id);
        return value;
    }

    private static long OptionalLong(Frame frame, ushort id, long fallback, long maximum)
    {
        string value;
        if (!frame.Fields.TryGetValue(id, out value)) return fallback;
        long parsed;
        if (!long.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out parsed) || parsed < 0 || parsed > maximum)
            throw new InvalidDataException("FIELD_NUMBER_" + id);
        return parsed;
    }

    private static string ResolveRoot(Frame frame)
    {
        string rootId = Required(frame, 2);
        string repository = BrokerRepositoryRoot;
        if (String.IsNullOrWhiteSpace(repository)) throw new InvalidDataException("ROOT_ENVIRONMENT");
        repository = Path.GetFullPath(repository).TrimEnd(Path.DirectorySeparatorChar);
        switch (rootId)
        {
            case "FROZEN_REPOSITORY_READ": return repository;
            case "RUNTIME_CONTROL_ROOT": return Path.Combine(repository, ".r4b-preflight", "runtime");
            case "ATTEMPT_ROOT": return Path.Combine(repository, ".r4b-preflight", "runtime", "attempts", "attempt-002-observer");
            case "RAW_ROOT": return Path.Combine(repository, ".r4b-preflight", "runtime", "attempts", "attempt-002-observer", "raw");
            case "NVDA_RAW_ROOT": return Path.Combine(repository, ".r4b-preflight", "runtime", "attempts", "attempt-002-observer", "raw", "nvda");
            case "NVDA_CONFIG_ROOT": return Path.Combine(repository, ".r4b-preflight", "runtime", "attempts", "attempt-002-observer", "raw", "nvda", "config");
            case "NVDA_PORTABLE_ROOT": return Path.Combine(repository, ".r4b-preflight", "runtime", "attempts", "attempt-002-observer", "raw", "nvda", "portable");
            case "BUILD_OUTPUT_ROOT": return Path.Combine(repository, "apps", "r4b-preflight-harness", ".next-attempt-002");
            case "BUILD_TEMP_ROOT": return Path.Combine(repository, ".r4b-preflight", "runtime", "attempt-002-build-temp");
            case "TOOLS_READ": return Path.Combine(repository, ".r4b-preflight", "tools");
            case "DOWNLOADS_READ": return Path.Combine(repository, ".r4b-preflight", "downloads");
            case "TEST_ROOT":
                if (!BrokerTestMode) throw new InvalidDataException("TEST_ROOT_DISABLED");
                return repository;
            default: throw new InvalidDataException("ROOT_ID");
        }
    }

    private static void AssertRootRight(string rootId, string operation, string relative)
    {
        string[] readOperations = { "READ_BOUNDED", "HASH_BOUNDED", "INVENTORY_TREE", "PIN_FILE" };
        string[] fileMutations = { "CREATE_DIRECTORY", "WRITE_NEW", "APPEND_DURABLE", "RENAME_EXCLUSIVE", "UNLINK_EXACT", "REPLACE_EXISTING_EXACT" };
        string[] regularFileMutations = { "WRITE_NEW", "APPEND_DURABLE", "RENAME_EXCLUSIVE", "UNLINK_EXACT", "REPLACE_EXISTING_EXACT" };
        string[] ownedTreeMutations = fileMutations.Concat(new[] { "REMOVE_TREE_EXACT" }).ToArray();
        bool allowed;
        switch (rootId)
        {
            case "FROZEN_REPOSITORY_READ":
                string[] frozenFiles = {
                    ".gitignore", ".vercelignore", "package.json", "package-lock.json", "tsconfig.base.json",
                    "docs/2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md",
                    "apps/r4b-preflight-harness/package.json", "apps/r4b-preflight-harness/next-env.d.ts",
                    "apps/r4b-preflight-harness/next.config.ts", "apps/r4b-preflight-harness/tsconfig.json",
                    "apps/r4b-preflight-harness/app/layout.tsx", "apps/r4b-preflight-harness/app/page.tsx",
                    "apps/r4b-preflight-harness/inert-client-boundary.tsx", "apps/r4b-preflight-harness/source-contract.tsx",
                    "apps/r4b-preflight-harness/inert-actions.ts", "apps/web/package.json",
                    "apps/web/app/learn/session/conversation-canvas.tsx",
                    "apps/web/app/learn/session/conversation-canvas.module.css",
                    "apps/web/app/learn/session/conversation-canvas-state.ts",
                    "apps/web/app/dev-fixtures/conversation-canvas/fixtures.ts",
                    "scripts/r4b-evidence/nvda-adapter/index.mjs", "scripts/r4b-evidence/nvda-adapter/protocol.mjs",
                    "scripts/r4b-evidence/nvda-adapter/inherited-handle-consumer-fixture.py",
                    "scripts/r4b-evidence/nvda-adapter/scratchpad/globalPlugins/fluyoPreflightSpeech.py",
                    "scripts/r4b-evidence/windows-native-boundary.cs", "scripts/r4b-evidence/windows-native-client.mjs",
                    "scripts/r4b-evidence/windows-native-contract.json", "scripts/r4b-evidence/windows-native-worker.mjs"
                };
                allowed = readOperations.Contains(operation) && frozenFiles.Contains(relative, StringComparer.Ordinal);
                break;
            case "TOOLS_READ":
                allowed = readOperations.Contains(operation) && new[] { "", "chromedriver.exe", "nvda/nvda.exe" }.Contains(relative, StringComparer.Ordinal);
                break;
            case "DOWNLOADS_READ":
                allowed = readOperations.Contains(operation) && new[] { "", "chromedriver-win64.zip", "nvda_2026.3.exe" }.Contains(relative, StringComparer.Ordinal);
                break;
            case "BUILD_OUTPUT_ROOT":
                allowed = (operation == "INVENTORY_TREE" || operation == "REMOVE_TREE_EXACT") && relative == "" ||
                    readOperations.Contains(operation) && new[] { "BUILD_ID", "required-server-files.json", "routes-manifest.json", "prerender-manifest.json" }.Contains(relative, StringComparer.Ordinal);
                break;
            case "BUILD_TEMP_ROOT":
                allowed = new[] { "CREATE_DIRECTORY", "INVENTORY_TREE", "REMOVE_TREE_EXACT" }.Contains(operation) && relative == "";
                break;
            case "NVDA_CONFIG_ROOT":
                bool nvdaConfigDirectory = relative == "" || relative == "scratchpad" || relative == "scratchpad/globalPlugins";
                bool nvdaConfigFile = new[] { "nvda.ini", "scratchpad/globalPlugins/fluyoPreflightSpeech.py" }.Contains(relative, StringComparer.Ordinal);
                allowed = operation == "CREATE_DIRECTORY" && nvdaConfigDirectory ||
                    operation == "INVENTORY_TREE" && relative == "" || operation == "REMOVE_TREE_EXACT" && relative == "" ||
                    (readOperations.Contains(operation) || regularFileMutations.Contains(operation)) && nvdaConfigFile;
                break;
            case "NVDA_PORTABLE_ROOT":
                allowed = new[] { "CREATE_DIRECTORY", "INVENTORY_TREE", "REMOVE_TREE_EXACT" }.Contains(operation) && relative == "";
                break;
            case "NVDA_RAW_ROOT":
                allowed = new[] { "CREATE_DIRECTORY", "INVENTORY_TREE", "REMOVE_TREE_EXACT" }.Contains(operation) && relative == "" ||
                    new[] { "READ_BOUNDED", "HASH_BOUNDED", "PIN_FILE", "WRITE_NEW", "APPEND_DURABLE", "UNLINK_EXACT", "REPLACE_EXISTING_EXACT" }.Contains(operation) &&
                    new[] { "pre-speech-requests.jsonl", "diagnostics.log", "protocol.sha256" }.Contains(relative, StringComparer.Ordinal);
                break;
            case "RAW_ROOT":
                bool rawArtifact = IsRawObservationArtifact(relative);
                bool rawDirectory = IsRawObservationDirectory(relative);
                allowed = operation == "CREATE_DIRECTORY" && rawDirectory ||
                    new[] { "INVENTORY_TREE", "REMOVE_TREE_EXACT" }.Contains(operation) && relative == "" ||
                    (readOperations.Contains(operation) || regularFileMutations.Contains(operation)) && rawArtifact;
                break;
            case "ATTEMPT_ROOT":
                string[] attemptFiles = { "authority.json", "tool-manifest.json", "synthetic-observation-aggregate.json",
                    "sanitized-result.json", "discard-receipt.json", "failed-held.json", "server-ready.json",
                    "driver-ready.json", "nvda-ready.json" };
                allowed = operation == "CREATE_DIRECTORY" && relative == "" ||
                    (readOperations.Contains(operation) || regularFileMutations.Contains(operation)) && attemptFiles.Contains(relative, StringComparer.Ordinal);
                break;
            case "RUNTIME_CONTROL_ROOT":
                string[] runtimeFiles = { "attempt-002-lifecycle.jsonl", "attempt-002-tool-manifest.json",
                    "attempt-002-build-failed-held.json", "attempt-002-builder-ownership.jsonl",
                    "attempt-002-build-failure-recovery.json", "attempt-002-build-ready.json",
                    "sanitized-result.json", "discard-receipt.json", "tool-manifest.json" };
                allowed = (readOperations.Contains(operation) || regularFileMutations.Contains(operation)) &&
                    runtimeFiles.Contains(relative, StringComparer.Ordinal);
                break;
            case "TEST_ROOT":
                if (!BrokerTestMode) throw new InvalidDataException("TEST_ROOT_DISABLED");
                allowed = readOperations.Contains(operation) || ownedTreeMutations.Contains(operation) ||
                    operation == "TEST_SYNCHRONIZED_SWAP" || operation == "TEST_CRASH_AFTER_INTENT";
                break;
            default: throw new InvalidDataException("ROOT_ID");
        }
        if (!allowed) throw new InvalidDataException("ROOT_RIGHT_DENIED");
    }

    private static bool IsRawObservationArtifact(string relative)
    {
        string[] parts = (relative ?? "").Split('/');
        if (parts.Length == 1 && new[] { "observation-plan.json", "browser-console.jsonl" }.Contains(parts[0], StringComparer.Ordinal)) return true;
        if (parts.Length != 5 || parts[0] != "o" || !IsSha256Segment(parts[1]) || parts[2] != "cells" || !IsSha256Segment(parts[3])) return false;
        return new[] { "actual.png", "baseline.png", "diff.png", "overflow.json", "contrast.json", "focus.json",
            "announcements.txt", "reduced-motion.json" }.Contains(parts[4], StringComparer.Ordinal);
    }

    private static bool IsSha256Segment(string value)
    {
        return value != null && value.Length == 64 && value.All(character => Uri.IsHexDigit(character));
    }

    private static bool IsRawObservationDirectory(string relative)
    {
        if (relative == "" || relative == "o" || relative == "checks" || relative == "checks/risk" ||
            relative == "checks/transition" || relative == "profiles") return true;
        string[] parts = (relative ?? "").Split('/');
        return parts.Length == 2 && ((parts[0] == "o" || parts[0] == "profiles") && IsSha256Segment(parts[1])) ||
            parts.Length == 3 && parts[0] == "o" && IsSha256Segment(parts[1]) && parts[2] == "cells" ||
            parts.Length == 4 && parts[0] == "o" && IsSha256Segment(parts[1]) && parts[2] == "cells" && IsSha256Segment(parts[3]) ||
            parts.Length == 3 && parts[0] == "checks" && new[] { "risk", "transition" }.Contains(parts[1], StringComparer.Ordinal) && IsSha256Segment(parts[2]);
    }

    public static string ValidateRootRightForTest(string rootId, string operation, string relative, bool testMode)
    {
        bool prior = BrokerTestMode;
        BrokerTestMode = testMode;
        try { AssertRootRight(rootId, operation, relative); return "PASS"; }
        catch (Exception error) { return error.Message; }
        finally { BrokerTestMode = prior; }
    }

    private static string[] ValidateSegments(string relative)
    {
        if (relative == null) throw new InvalidDataException("RELATIVE_PATH");
        if (relative.Length == 0) return new string[0];
        if (relative.Length > 4096 || relative.IndexOf('\\') >= 0 || relative.StartsWith("/") || relative.EndsWith("/"))
            throw new InvalidDataException("RELATIVE_PATH");
        string[] segments = relative.Split('/');
        foreach (string segment in segments)
        {
            string trimmed = segment.TrimEnd(' ', '.');
            string upper = trimmed.ToUpperInvariant();
            if (segment.Length == 0 || segment == "." || segment == ".." || segment.IndexOf('\0') >= 0 ||
                segment.IndexOf(':') >= 0 || segment.IndexOf('*') >= 0 || segment.IndexOf('?') >= 0 ||
                segment != trimmed || segment.Length > 255 || upper == "CON" || upper == "PRN" || upper == "AUX" || upper == "NUL" ||
                upper.StartsWith("COM") && upper.Length == 4 && Char.IsDigit(upper[3]) ||
                upper.StartsWith("LPT") && upper.Length == 4 && Char.IsDigit(upper[3]))
                throw new InvalidDataException("RELATIVE_SEGMENT");
        }
        if (segments.Length > 32) throw new InvalidDataException("RELATIVE_DEPTH");
        return segments;
    }

    private static string Combine(string root, string[] segments, int count)
    {
        string path = root;
        for (int index = 0; index < count; index++) path = Path.Combine(path, segments[index]);
        return Path.GetFullPath(path);
    }

    private static void AssertFixedNtfs(string path)
    {
        if (path.StartsWith("\\\\", StringComparison.Ordinal)) throw new InvalidDataException("REMOTE_ROOT");
        StringBuilder volume = new StringBuilder(260);
        Win32(GetVolumePathNameW(path, volume, (uint)volume.Capacity), "GetVolumePathNameW");
        if (GetDriveTypeW(volume.ToString()) != DRIVE_FIXED) throw new InvalidDataException("NON_FIXED_VOLUME");
        StringBuilder name = new StringBuilder(260);
        StringBuilder fileSystem = new StringBuilder(64);
        uint serial, maximumComponent, flags;
        Win32(GetVolumeInformationW(volume.ToString(), name, (uint)name.Capacity, out serial, out maximumComponent, out flags, fileSystem, (uint)fileSystem.Capacity), "GetVolumeInformationW");
        if (!String.Equals(fileSystem.ToString(), "NTFS", StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("NON_NTFS_VOLUME");
    }

    private static SafeFileHandle OpenHandle(string path, uint access, uint share, uint disposition, bool directory, bool writeThrough)
    {
        uint flags = FILE_FLAG_OPEN_REPARSE_POINT | (directory ? FILE_FLAG_BACKUP_SEMANTICS : FILE_ATTRIBUTE_NORMAL);
        if (writeThrough) flags |= FILE_FLAG_WRITE_THROUGH;
        SafeFileHandle handle = CreateFileW(path, access, share, IntPtr.Zero, disposition, flags, IntPtr.Zero);
        if (handle == null || handle.IsInvalid) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateFileW");
        return handle;
    }

    private static HandleIdentity Inspect(SafeFileHandle handle, string expectedPath, bool expectDirectory)
    {
        FILE_ATTRIBUTE_TAG_INFO tags;
        Win32(GetFileInformationByHandleEx(handle, FileAttributeTagInfo, out tags, (uint)Marshal.SizeOf(typeof(FILE_ATTRIBUTE_TAG_INFO))), "GetFileInformationByHandleEx(FileAttributeTagInfo)");
        if ((tags.FileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0) throw new InvalidDataException("REPARSE_COMPONENT");
        bool directory = (tags.FileAttributes & FILE_ATTRIBUTE_DIRECTORY) != 0;
        if (directory != expectDirectory) throw new InvalidDataException("ENTRY_KIND");
        FILE_ID_INFO id;
        id.FileId = new byte[16];
        Win32(GetFileInformationByHandleEx(handle, FileIdInfo, out id, (uint)Marshal.SizeOf(typeof(FILE_ID_INFO))), "GetFileInformationByHandleEx(FileIdInfo)");
        StringBuilder final = new StringBuilder(32768);
        uint length = GetFinalPathNameByHandleW(handle, final, (uint)final.Capacity, 0);
        if (length == 0 || length >= final.Capacity) throw new Win32Exception(Marshal.GetLastWin32Error(), "GetFinalPathNameByHandleW");
        string actual = final.ToString().Replace("\\\\?\\", "").TrimEnd('\\');
        string expected = Path.GetFullPath(expectedPath).TrimEnd('\\');
        if (!String.Equals(actual, expected, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("FINAL_PATH_IDENTITY:" + actual + ":" + expected);
        return new HandleIdentity { Volume = id.VolumeSerialNumber, FileId = Hex(id.FileId), FinalPath = expected, Directory = directory };
    }

    private static HeldChain HoldExistingAncestors(string root, string[] segments, int count)
    {
        AssertFixedNtfs(root);
        HeldChain chain = new HeldChain(root);
        try
        {
            for (int index = 0; index <= count; index++)
            {
                string path = Combine(root, segments, index);
                SafeFileHandle handle = OpenHandle(path, FILE_READ_ATTRIBUTES | FILE_LIST_DIRECTORY | SYNCHRONIZE, FILE_SHARE_READ | FILE_SHARE_WRITE, OPEN_EXISTING, true, false);
                chain.Handles.Add(handle);
                chain.Identities.Add(Inspect(handle, path, true));
            }
            return chain;
        }
        catch { chain.Dispose(); throw; }
    }

    private static HeldChain HoldTestWindow(string root, string[] segments)
    {
        AssertFixedNtfs(root);
        HeldChain chain = new HeldChain(root);
        try
        {
            SafeFileHandle rootHandle = OpenHandle(root, FILE_READ_ATTRIBUTES | FILE_LIST_DIRECTORY | SYNCHRONIZE,
                FILE_SHARE_READ | FILE_SHARE_WRITE, OPEN_EXISTING, true, false);
            chain.Handles.Add(rootHandle);
            chain.Identities.Add(Inspect(rootHandle, root, true));
            string owned = Combine(root, segments, segments.Length);
            string seed = Path.Combine(owned, "seed.txt");
            SafeFileHandle seedHandle = OpenHandle(seed, GENERIC_READ | GENERIC_WRITE | FILE_APPEND_DATA | FILE_READ_ATTRIBUTES | DELETE | SYNCHRONIZE,
                FILE_SHARE_READ | FILE_SHARE_WRITE, OPEN_EXISTING, false, true);
            chain.Handles.Add(seedHandle);
            chain.Identities.Add(Inspect(seedHandle, seed, false));
            return chain;
        }
        catch { chain.Dispose(); throw; }
    }

    private static HandleIdentity TestWriteFile(string path, byte[] bytes, bool append)
    {
        using (SafeFileHandle file = OpenHandle(path, GENERIC_WRITE | FILE_READ_ATTRIBUTES | SYNCHRONIZE | (append ? FILE_APPEND_DATA : 0),
            FILE_SHARE_READ, append ? OPEN_EXISTING : CREATE_NEW, false, true))
        {
            HandleIdentity identity = Inspect(file, path, false);
            using (FileStream stream = new FileStream(new SafeFileHandle(file.DangerousGetHandle(), false), FileAccess.Write, 4096, false))
            {
                if (append) stream.Seek(0, SeekOrigin.End);
                stream.Write(bytes, 0, bytes.Length);
                stream.Flush(true);
            }
            return identity;
        }
    }

    private static byte[] ReadAllBounded(SafeFileHandle handle, long maximumBytes)
    {
        using (FileStream stream = new FileStream(new SafeFileHandle(handle.DangerousGetHandle(), false), FileAccess.Read, 65536, false))
        {
            if (stream.Length < 0 || stream.Length > maximumBytes) throw new InvalidDataException("BYTE_BOUND");
            stream.Seek(0, SeekOrigin.Begin);
            using (MemoryStream output = new MemoryStream((int)Math.Min(stream.Length, Int32.MaxValue)))
            {
                byte[] buffer = new byte[65536];
                long total = 0;
                while (true)
                {
                    int count = stream.Read(buffer, 0, buffer.Length);
                    if (count == 0) break;
                    total += count;
                    if (total > maximumBytes) throw new InvalidDataException("BYTE_BOUND");
                    output.Write(buffer, 0, count);
                }
                if (stream.Length != total) throw new InvalidDataException("READ_DRIFT");
                return output.ToArray();
            }
        }
    }

    private static string RecordDigest(List<InventoryRecord> records)
    {
        StringBuilder canonical = new StringBuilder();
        foreach (InventoryRecord record in records.OrderBy(value => value.RelativePath, StringComparer.Ordinal))
        {
            canonical.Append(record.RelativePath).Append('\0')
                .Append(record.Directory ? "D" : "F").Append('\0')
                .Append(record.Bytes.ToString(CultureInfo.InvariantCulture)).Append('\0')
                .Append(record.Sha256 ?? "").Append('\0')
                .Append(record.Volume.ToString(CultureInfo.InvariantCulture)).Append('\0')
                .Append(record.FileId).Append('\n');
        }
        return Sha256Hex(Encoding.UTF8.GetBytes(canonical.ToString()));
    }

    private static void InventoryDirectory(string rootPath, string currentPath, string relativePrefix, int depth, int maxDepth, long maxFileBytes, long maxTotalBytes, int maxEntries, int maxDirectories, InventoryResult result, List<SafeFileHandle> retained)
    {
        if (depth > maxDepth) throw new InvalidDataException("INVENTORY_DEPTH");
        SafeFileHandle directory = OpenHandle(currentPath, FILE_LIST_DIRECTORY | FILE_READ_ATTRIBUTES | DELETE | SYNCHRONIZE, FILE_SHARE_READ | FILE_SHARE_WRITE, OPEN_EXISTING, true, false);
        retained.Add(directory);
        HandleIdentity directoryIdentity = Inspect(directory, currentPath, true);
        result.Directories += 1;
        if (result.Directories > maxDirectories) throw new InvalidDataException("INVENTORY_DIRECTORIES");
        result.Records.Add(new InventoryRecord { RelativePath = relativePrefix, Directory = true, Volume = directoryIdentity.Volume, FileId = directoryIdentity.FileId, Handle = directory });
        foreach (string child in Directory.EnumerateFileSystemEntries(currentPath).OrderBy(value => value, StringComparer.OrdinalIgnoreCase))
        {
            string name = Path.GetFileName(child);
            ValidateSegments(name);
            string relative = relativePrefix.Length == 0 ? name : relativePrefix + "/" + name;
            uint attributes = GetFileAttributesSafe(child);
            bool isDirectory = (attributes & FILE_ATTRIBUTE_DIRECTORY) != 0;
            if ((attributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0) throw new InvalidDataException("INVENTORY_REPARSE");
            if (isDirectory)
            {
                InventoryDirectory(rootPath, child, relative, depth + 1, maxDepth, maxFileBytes, maxTotalBytes, maxEntries, maxDirectories, result, retained);
            }
            else
            {
                SafeFileHandle file = OpenHandle(child, GENERIC_READ | FILE_READ_ATTRIBUTES | DELETE | SYNCHRONIZE, FILE_SHARE_READ, OPEN_EXISTING, false, false);
                retained.Add(file);
                HandleIdentity identity = Inspect(file, child, false);
                byte[] bytes = ReadAllBounded(file, maxFileBytes);
                result.TotalBytes += bytes.LongLength;
                if (result.TotalBytes > maxTotalBytes) throw new InvalidDataException("INVENTORY_TOTAL_BYTES");
                result.Records.Add(new InventoryRecord { RelativePath = relative, Directory = false, Bytes = bytes.LongLength, Sha256 = Sha256Hex(bytes), Volume = identity.Volume, FileId = identity.FileId, Handle = file });
            }
            if (result.Records.Count > maxEntries) throw new InvalidDataException("INVENTORY_ENTRIES");
        }
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern uint GetFileAttributesW(string name);

    private static uint GetFileAttributesSafe(string path)
    {
        uint value = GetFileAttributesW(path);
        if (value == 0xffffffff) throw new Win32Exception(Marshal.GetLastWin32Error(), "GetFileAttributesW");
        return value;
    }

    private static InventoryResult Inventory(string path, long maxFileBytes, long maxTotalBytes, int maxEntries, int maxDirectories, int maxDepth, List<SafeFileHandle> retained)
    {
        InventoryResult result = new InventoryResult();
        InventoryDirectory(path, path, "", 0, maxDepth, maxFileBytes, maxTotalBytes, maxEntries, maxDirectories, result, retained);
        result.Digest = RecordDigest(result.Records);
        return result;
    }

    private static string InventoryToken(List<InventoryRecord> records)
    {
        StringBuilder canonical = new StringBuilder();
        foreach (InventoryRecord record in records.OrderBy(value => value.RelativePath, StringComparer.Ordinal))
        {
            canonical.Append(Convert.ToBase64String(Encoding.UTF8.GetBytes(record.RelativePath))).Append('|')
                .Append(record.Directory ? "D" : "F").Append('|')
                .Append(record.Bytes.ToString(CultureInfo.InvariantCulture)).Append('|')
                .Append(record.Sha256 ?? "").Append('|')
                .Append(record.Volume.ToString(CultureInfo.InvariantCulture)).Append('|')
                .Append(record.FileId).Append('\n');
        }
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(canonical.ToString()));
    }

    private static List<InventoryRecord> ParseInventoryToken(string token)
    {
        byte[] bytes;
        try { bytes = Convert.FromBase64String(token); }
        catch (FormatException) { throw new InvalidDataException("INVENTORY_TOKEN_BASE64"); }
        if (bytes.Length == 0 || bytes.Length > 16777216) throw new InvalidDataException("INVENTORY_TOKEN_BOUND");
        string text = new UTF8Encoding(false, true).GetString(bytes);
        List<InventoryRecord> records = new List<InventoryRecord>();
        string previous = null;
        foreach (string line in text.Split(new[] { '\n' }, StringSplitOptions.RemoveEmptyEntries))
        {
            string[] parts = line.Split('|');
            if (parts.Length != 6) throw new InvalidDataException("INVENTORY_TOKEN_FIELDS");
            string relative;
            try { relative = new UTF8Encoding(false, true).GetString(Convert.FromBase64String(parts[0])); }
            catch { throw new InvalidDataException("INVENTORY_TOKEN_PATH"); }
            ValidateSegments(relative);
            if (previous != null && StringComparer.Ordinal.Compare(previous, relative) >= 0) throw new InvalidDataException("INVENTORY_TOKEN_ORDER");
            previous = relative;
            ulong volume;
            long count;
            if (!ulong.TryParse(parts[4], NumberStyles.None, CultureInfo.InvariantCulture, out volume) ||
                !long.TryParse(parts[2], NumberStyles.None, CultureInfo.InvariantCulture, out count) || count < 0 ||
                (parts[1] != "D" && parts[1] != "F") || parts[5].Length != 32 || parts[5].Any(value => !Uri.IsHexDigit(value)) ||
                (parts[1] == "F" && (parts[3].Length != 64 || parts[3].Any(value => !Uri.IsHexDigit(value)))))
                throw new InvalidDataException("INVENTORY_TOKEN_VALUE");
            records.Add(new InventoryRecord { RelativePath = relative, Directory = parts[1] == "D", Bytes = count, Sha256 = parts[3], Volume = volume, FileId = parts[5] });
        }
        if (records.Count == 0 || records[0].RelativePath != "" || !records[0].Directory) throw new InvalidDataException("INVENTORY_TOKEN_ROOT");
        return records;
    }

    private static void AssertInventoryMatches(List<InventoryRecord> expected, InventoryResult actual)
    {
        if (expected.Count != actual.Records.Count) throw new InvalidDataException("DELETE_UNKNOWN_OR_MISSING_ENTRY");
        for (int index = 0; index < expected.Count; index++)
        {
            InventoryRecord left = expected[index];
            InventoryRecord right = actual.Records.OrderBy(value => value.RelativePath, StringComparer.Ordinal).ElementAt(index);
            if (left.RelativePath != right.RelativePath || left.Directory != right.Directory || left.Bytes != right.Bytes ||
                left.Sha256 != (right.Sha256 ?? "") || left.Volume != right.Volume || left.FileId != right.FileId)
                throw new InvalidDataException("DELETE_REPLACED_ENTRY");
        }
    }

    private static void AssertRetainedInventoryCurrent(string rootPath, InventoryResult retained)
    {
        HashSet<string> actual = new HashSet<string>(StringComparer.Ordinal);
        actual.Add("");
        foreach (string child in Directory.EnumerateFileSystemEntries(rootPath, "*", SearchOption.AllDirectories))
        {
            uint attributes = GetFileAttributesSafe(child);
            if ((attributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0) throw new InvalidDataException("DELETE_REPARSE");
            string relative = child.Substring(rootPath.TrimEnd(Path.DirectorySeparatorChar).Length).TrimStart(Path.DirectorySeparatorChar).Replace('\\', '/');
            ValidateSegments(relative);
            actual.Add(relative);
        }
        HashSet<string> expected = new HashSet<string>(retained.Records.Select(value => value.RelativePath), StringComparer.Ordinal);
        if (!actual.SetEquals(expected)) throw new InvalidDataException("DELETE_UNKNOWN_OR_MISSING_ENTRY");
        foreach (InventoryRecord record in retained.Records)
        {
            string path = record.RelativePath.Length == 0 ? rootPath : Combine(rootPath, ValidateSegments(record.RelativePath), ValidateSegments(record.RelativePath).Length);
            HandleIdentity identity = Inspect(record.Handle, path, record.Directory);
            if (identity.Volume != record.Volume || identity.FileId != record.FileId) throw new InvalidDataException("DELETE_REPLACED_ENTRY");
            if (!record.Directory)
            {
                byte[] bytes = ReadAllBounded(record.Handle, record.Bytes);
                if (bytes.LongLength != record.Bytes || Sha256Hex(bytes) != record.Sha256) throw new InvalidDataException("DELETE_CONTENT_DRIFT");
            }
        }
    }

    private static void DeleteRetainedInventory(string rootPath, InventoryResult inventory)
    {
        foreach (InventoryRecord record in inventory.Records.OrderByDescending(value => value.RelativePath.Count(character => character == '/')).ThenByDescending(value => value.RelativePath.Length))
        {
            string path = record.RelativePath.Length == 0 ? rootPath : Combine(rootPath, ValidateSegments(record.RelativePath), ValidateSegments(record.RelativePath).Length);
            HandleIdentity identity = Inspect(record.Handle, path, record.Directory);
            if (identity.Volume != record.Volume || identity.FileId != record.FileId) throw new InvalidDataException("DELETE_RETAINED_IDENTITY");
            MarkDelete(record.Handle);
            record.Handle.Dispose();
        }
    }

    private static void MarkDelete(SafeFileHandle handle)
    {
        FILE_DISPOSITION_INFO_EX extended = new FILE_DISPOSITION_INFO_EX { Flags = FILE_DISPOSITION_FLAG_DELETE | FILE_DISPOSITION_FLAG_POSIX_SEMANTICS | FILE_DISPOSITION_FLAG_IGNORE_READONLY_ATTRIBUTE };
        IntPtr pointer = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(FILE_DISPOSITION_INFO_EX)));
        try
        {
            Marshal.StructureToPtr(extended, pointer, false);
            if (!SetFileInformationByHandle(handle, FileDispositionInfoEx, pointer, (uint)Marshal.SizeOf(typeof(FILE_DISPOSITION_INFO_EX))))
            {
                FILE_DISPOSITION_INFO fallback = new FILE_DISPOSITION_INFO { DeleteFile = true };
                Marshal.StructureToPtr(fallback, pointer, false);
                Win32(SetFileInformationByHandle(handle, FileDispositionInfo, pointer, (uint)Marshal.SizeOf(typeof(FILE_DISPOSITION_INFO))), "SetFileInformationByHandle(FileDispositionInfo)");
            }
        }
        finally { Marshal.FreeHGlobal(pointer); }
    }

    private static void RenameByHandle(SafeFileHandle handle, string destinationPath)
    {
        byte[] name = Encoding.Unicode.GetBytes(Path.GetFullPath(destinationPath));
        // FILE_RENAME_INFO has a 20-byte variable-data offset on x64, but its
        // native sizeof is padded to 24 bytes. Supplying that padded tail (and
        // an explicit UTF-16 terminator outside FileNameLength) prevents the
        // kernel from observing uninitialised bytes after FileName.
        int bufferBytes = 24 + name.Length + 2;
        IntPtr pointer = Marshal.AllocHGlobal(bufferBytes);
        try
        {
            for (int index = 0; index < bufferBytes; index++) Marshal.WriteByte(pointer, index, 0);
            Marshal.WriteInt32(pointer, 0, 0);
            Marshal.WriteIntPtr(pointer, 8, IntPtr.Zero);
            Marshal.WriteInt32(pointer, 16, name.Length);
            Marshal.Copy(name, 0, IntPtr.Add(pointer, 20), name.Length);
            Win32(SetFileInformationByHandle(handle, FileRenameInfo, pointer, (uint)bufferBytes), "SetFileInformationByHandle(FileRenameInfo)");
        }
        finally { Marshal.FreeHGlobal(pointer); }
    }

    private static void DeleteInventory(string rootPath, string currentPath, string relativePrefix, Dictionary<string, InventoryRecord> expected)
    {
        using (SafeFileHandle directory = OpenHandle(currentPath, FILE_LIST_DIRECTORY | FILE_READ_ATTRIBUTES | DELETE | SYNCHRONIZE, FILE_SHARE_READ | FILE_SHARE_WRITE, OPEN_EXISTING, true, false))
        {
            HandleIdentity currentIdentity = Inspect(directory, currentPath, true);
            if (relativePrefix.Length > 0)
            {
                InventoryRecord expectedDirectory;
                if (!expected.TryGetValue(relativePrefix, out expectedDirectory) || !expectedDirectory.Directory || expectedDirectory.Volume != currentIdentity.Volume || expectedDirectory.FileId != currentIdentity.FileId)
                    throw new InvalidDataException("DELETE_IDENTITY");
            }
            foreach (string child in Directory.EnumerateFileSystemEntries(currentPath).OrderBy(value => value, StringComparer.OrdinalIgnoreCase))
            {
                string name = Path.GetFileName(child);
                string relative = relativePrefix.Length == 0 ? name : relativePrefix + "/" + name;
                InventoryRecord record;
                if (!expected.TryGetValue(relative, out record)) throw new InvalidDataException("DELETE_UNKNOWN_ENTRY");
                uint attributes = GetFileAttributesSafe(child);
                if ((attributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0) throw new InvalidDataException("DELETE_REPARSE");
                if ((attributes & FILE_ATTRIBUTE_DIRECTORY) != 0) DeleteInventory(rootPath, child, relative, expected);
                else
                {
                    using (SafeFileHandle file = OpenHandle(child, FILE_READ_ATTRIBUTES | DELETE | SYNCHRONIZE, FILE_SHARE_READ, OPEN_EXISTING, false, false))
                    {
                        HandleIdentity identity = Inspect(file, child, false);
                        if (record.Directory || record.Volume != identity.Volume || record.FileId != identity.FileId) throw new InvalidDataException("DELETE_IDENTITY");
                        MarkDelete(file);
                    }
                }
            }
            if (relativePrefix.Length > 0) MarkDelete(directory);
        }
    }

    private static string Response(Frame frame, string sessionNonce, string operation, string status, string errorCode, Dictionary<string, string> values)
    {
        StringBuilder json = new StringBuilder();
        json.Append("{\"magic\":\"FLUYONS1\",\"version\":1,\"sessionNonce\":\"").Append(JsonEscape(sessionNonce))
            .Append("\",\"sequence\":\"").Append(frame.Sequence.ToString(CultureInfo.InvariantCulture))
            .Append("\",\"operation\":\"").Append(JsonEscape(operation))
            .Append("\",\"requestSha256\":\"").Append(Hex(frame.RequestSha256))
            .Append("\",\"status\":\"").Append(status).Append("\"");
        if (!String.IsNullOrEmpty(errorCode)) json.Append(",\"errorCode\":\"").Append(JsonEscape(errorCode)).Append("\"");
        if (values != null)
        {
            foreach (KeyValuePair<string, string> value in values)
                json.Append(",\"").Append(JsonEscape(value.Key)).Append("\":\"").Append(JsonEscape(value.Value)).Append("\"");
        }
        json.Append("}");
        return json.ToString();
    }

    private static string OperationName(uint operation)
    {
        string[] names = { "", "HELLO", "READ_BOUNDED", "HASH_BOUNDED", "INVENTORY_TREE", "CREATE_DIRECTORY", "WRITE_NEW", "APPEND_DURABLE", "RENAME_EXCLUSIVE", "UNLINK_EXACT", "REMOVE_TREE_EXACT", "PIN_FILE", "UNPIN_FILE", "JOB_CREATE_SUSPENDED", "JOB_RESUME", "JOB_STATUS", "JOB_TERMINATE", "NVDA_START_WITH_HANDLES", "NVDA_STOP", "TEST_SYNCHRONIZED_SWAP", "SHUTDOWN", "RECOVER_SESSION", "TEST_CRASH_AFTER_INTENT", "REPLACE_EXISTING_EXACT", "TEST_POST_ACK_JOURNAL_FAILURE" };
        if (operation == 0 || operation >= names.Length) throw new InvalidDataException("OPERATION");
        return names[operation];
    }

    private static bool RecoveryIdentity(string value)
    {
        return value == "ABSENT" || (value != null && value.Length == 64 && value.All(character => Uri.IsHexDigit(character)));
    }

    private static Dictionary<string, string> Execute(Frame frame, string operation)
    {
        Dictionary<string, string> result = new Dictionary<string, string>();
        if (operation == "HELLO")
        {
            result["boundary"] = "WINDOWS_PERSISTENT_CAPABILITY_PIPE_V4_J2";
            result["contractSha256"] = BrokerContractDigest ?? "";
            result["brokerPid"] = Process.GetCurrentProcess().Id.ToString(CultureInfo.InvariantCulture);
            result["controllerJournalAnchorHandle"] = BrokerControllerJournalAnchor.ToString(CultureInfo.InvariantCulture);
            result["powerShellIdentity"] = BrokerPowerShellIdentity ?? "";
            result["powerShellVersion"] = BrokerPowerShellVersion ?? "";
            result["powerShellSignature"] = BrokerPowerShellSignature ?? "";
            result["journalSha256"] = BrokerLastJournalHash;
            result["journalSequence"] = BrokerJournalRecordCount.ToString(CultureInfo.InvariantCulture);
            result["lastRequestId"] = BrokerLastRequestSha256;
            result["lastJournalState"] = BrokerLastJournalState;
            result["controllerCreationIdentity"] = BrokerControllerCreationIdentity;
            result["journalState"] = BrokerHoldState;
            result["journalFailureReason"] = BrokerJournalFailureReason;
            result["outcome"] = BrokerHoldState == "CLOSED" ? "SESSION_READY" : BrokerHoldState;
            return result;
        }
        if (operation == "SHUTDOWN") { result["outcome"] = "SESSION_CLOSED"; return result; }
        if (operation == "TEST_POST_ACK_JOURNAL_FAILURE" && BrokerTestMode)
        {
            result["outcome"] = "APPLIED_PENDING_ACK";
            return result;
        }
        if (operation == "RECOVER_SESSION")
        {
            string[] recovery = Required(frame, 24).Split('|');
            if (recovery.Length != 5) throw new InvalidDataException("RECOVERY_RECORD_SCHEMA");
            string failureEvent = recovery[0];
            string requestId = recovery[1];
            string controllerCreation = recovery[2];
            long anchorSequence;
            if (!new[] { "BUILD_TRANSACTION_FAILED", "OBSERVATION_TRANSACTION_FAILED", "NATIVE_TRANSACTION_FAILED" }.Contains(failureEvent) ||
                requestId.Length != 64 || requestId.Any(value => !Uri.IsHexDigit(value)) ||
                !String.Equals(controllerCreation, BrokerControllerCreationIdentity, StringComparison.Ordinal) ||
                !Int64.TryParse(recovery[3], NumberStyles.None, CultureInfo.InvariantCulture, out anchorSequence) ||
                anchorSequence != BrokerJournalRecordCount || recovery[4] != BrokerLastJournalHash ||
                requestId != BrokerLastRequestSha256)
                throw new InvalidDataException("RECOVERY_RECORD_BINDING");
            if (BrokerHoldState == "LEGACY_JOURNAL_PERMANENT_HELD")
            {
                BrokerCrashHeld = true;
                result["outcome"] = "LEGACY_JOURNAL_PERMANENT_HELD";
                return result;
            }
            if (BrokerHoldState == "JOURNAL_PERMANENT_HELD" || BrokerHoldState == "ORPHANED_PERMANENT_HELD" ||
                BrokerLastJournalState == "PERMANENT_HELD")
            {
                BrokerCrashHeld = true;
                BrokerHoldState = BrokerHoldState == "ORPHANED_PERMANENT_HELD" ? BrokerHoldState : "JOURNAL_PERMANENT_HELD";
                result["outcome"] = "JOURNAL_PERMANENT_HELD";
                return result;
            }
            if (BrokerLastJournalState == "ACKED_COMMITTED_DURABLE")
            {
                result["outcome"] = "VERIFIED_COMMITTED";
                result["replayResponseBase64"] = BrokerLastResponseBase64;
                result["replayResponseSha256"] = BrokerLastResponseSha256;
                result["replaySessionNonce"] = BrokerLastSessionNonce;
                result["replaySequence"] = BrokerLastRequestSequence.ToString(CultureInfo.InvariantCulture);
                result["replayOperation"] = BrokerLastOperation;
                result["replayRequestSha256"] = BrokerLastRequestSha256;
                return result;
            }
            Frame original = new Frame {
                Sequence = BrokerLastRequestSequence,
                RequestSha256 = Enumerable.Range(0, 32).Select(index => Byte.Parse(BrokerLastRequestSha256.Substring(index * 2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture)).ToArray()
            };
            if (BrokerLastRootId != "SESSION") {
                original.Fields[2] = BrokerLastRootId;
                original.Fields[3] = BrokerLastRelativePath;
            }
            if (!String.IsNullOrEmpty(BrokerLastRelativePath2)) original.Fields[4] = BrokerLastRelativePath2;
            string currentIdentity = CaptureLastRecoveryIdentity(original);
            if (BrokerLastJournalState == "APPLIED_UNACKED_DURABLE" &&
                currentIdentity == BrokerLastAfterIdentity && !String.IsNullOrEmpty(BrokerLastResponseBase64) &&
                Sha256Hex(Convert.FromBase64String(BrokerLastResponseBase64)) == BrokerLastResponseSha256)
            {
                BrokerPendingBeforeIdentity = BrokerLastBeforeIdentity;
                BrokerPendingAfterIdentity = BrokerLastAfterIdentity;
                AppendJournal("ACKED_COMMITTED_DURABLE", original, BrokerLastOperation,
                    BrokerLastBeforeIdentity, BrokerLastAfterIdentity, Convert.FromBase64String(BrokerLastResponseBase64), BrokerLastSessionNonce);
                BrokerCrashHeld = false;
                BrokerHoldState = "CLOSED";
                result["outcome"] = "VERIFIED_APPLIED_UNACKED";
                result["replayResponseBase64"] = BrokerLastResponseBase64;
                result["replayResponseSha256"] = BrokerLastResponseSha256;
                result["replaySessionNonce"] = BrokerLastSessionNonce;
                result["replaySequence"] = BrokerLastRequestSequence.ToString(CultureInfo.InvariantCulture);
                result["replayOperation"] = BrokerLastOperation;
                result["replayRequestSha256"] = BrokerLastRequestSha256;
                return result;
            }
            if ((BrokerLastJournalState == "INTENT_DURABLE" || BrokerLastJournalState == "FAILED_HELD") &&
                currentIdentity == BrokerLastBeforeIdentity)
            {
                BrokerCrashHeld = false;
                BrokerHoldState = "CLOSED";
                result["outcome"] = "VERIFIED_NOT_APPLIED";
                return result;
            }
            BrokerCrashHeld = true;
            BrokerHoldState = "AMBIGUOUS_PERMANENT_HELD";
            result["outcome"] = "AMBIGUOUS_PERMANENT_HELD";
            return result;
        }
        if (operation == "UNPIN_FILE")
        {
            string[] arguments = ParseJsonStringArray(Required(frame, 23));
            if (arguments.Length != 2) throw new InvalidDataException("UNPIN_ARGUMENTS");
            InventoryLease lease;
            if (!BrokerInventoryLeases.TryGetValue(arguments[0], out lease) || lease.Token != arguments[1])
                throw new InvalidDataException("UNPIN_ORIGINAL_LEASE_REQUIRED");
            BrokerInventoryLeases.Remove(arguments[0]);
            lease.Dispose();
            result["inventoryLeaseId"] = arguments[0];
            result["outcome"] = "ORIGINAL_INVENTORY_RELEASED";
            return result;
        }
        if (operation == "JOB_CREATE_SUSPENDED")
            return CreateBrokerJob(ParseJsonStringArray(Required(frame, 23)), Required(frame, 14), Required(frame, 15));
        if (operation == "JOB_RESUME")
        {
            string[] arguments = ParseJsonStringArray(Required(frame, 23));
            if (arguments.Length != 1) throw new InvalidDataException("JOB_RESUME_ARGUMENTS");
            return ResumeBrokerJob(arguments[0]);
        }
        if (operation == "JOB_STATUS")
        {
            string[] arguments = ParseJsonStringArray(Required(frame, 23));
            if (arguments.Length != 1) throw new InvalidDataException("JOB_STATUS_ARGUMENTS");
            return BrokerJobStatus(RequireBrokerJob(arguments[0]));
        }
        if (operation == "JOB_TERMINATE")
        {
            string[] arguments = ParseJsonStringArray(Required(frame, 23));
            if (arguments.Length != 1) throw new InvalidDataException("JOB_TERMINATE_ARGUMENTS");
            return TerminateBrokerJob(arguments[0]);
        }
        if (operation == "NVDA_START_WITH_HANDLES")
            return BrokerNvdaCommand(ParseJsonStringArray(Required(frame, 23)));
        if (operation == "NVDA_STOP")
        {
            string[] arguments = ParseJsonStringArray(Required(frame, 23));
            if (arguments.Length != 1) throw new InvalidDataException("NVDA_STOP_ARGUMENTS");
            return StopBrokerNvda(arguments[0]);
        }
        string root = ResolveRoot(frame);
        string rootId = Required(frame, 2);
        string relative = Required(frame, 3);
        string[] segments = ValidateSegments(relative);
        AssertRootRight(rootId, operation, relative);
        string target = Combine(root, segments, segments.Length);
        int parentCount = Math.Max(0, segments.Length - 1);
        if (operation == "CREATE_DIRECTORY")
        {
            using (HeldChain chain = HoldExistingAncestors(root, segments, parentCount))
            {
                Win32(CreateDirectoryW(target, IntPtr.Zero), "CreateDirectoryW");
                using (SafeFileHandle created = OpenHandle(target, FILE_READ_ATTRIBUTES | FILE_LIST_DIRECTORY | SYNCHRONIZE, FILE_SHARE_READ | FILE_SHARE_WRITE, OPEN_EXISTING, true, true))
                {
                    HandleIdentity identity = Inspect(created, target, true);
                    FlushFileBuffers(created);
                    result["volumeSerial"] = identity.Volume.ToString(CultureInfo.InvariantCulture);
                    result["fileId"] = identity.FileId;
                }
            }
            return result;
        }

        if (operation == "READ_BOUNDED" || operation == "HASH_BOUNDED")
        {
            long maximum = OptionalLong(frame, 5, 1048576, MaxPayloadBytes);
            using (HeldChain chain = HoldExistingAncestors(root, segments, parentCount))
            using (SafeFileHandle file = OpenHandle(target, GENERIC_READ | FILE_READ_ATTRIBUTES | SYNCHRONIZE, FILE_SHARE_READ, OPEN_EXISTING, false, false))
            {
                HandleIdentity identity = Inspect(file, target, false);
                byte[] bytes = ReadAllBounded(file, maximum);
                result["contentSha256"] = Sha256Hex(bytes);
                result["bytes"] = bytes.LongLength.ToString(CultureInfo.InvariantCulture);
                result["volumeSerial"] = identity.Volume.ToString(CultureInfo.InvariantCulture);
                result["fileId"] = identity.FileId;
                if (operation == "READ_BOUNDED") result["payloadBase64"] = Convert.ToBase64String(bytes);
            }
            return result;
        }

        if (operation == "PIN_FILE")
        {
            long maximum = OptionalLong(frame, 5, 1048576, MaxPayloadBytes);
            using (HeldChain chain = HoldExistingAncestors(root, segments, parentCount))
            using (SafeFileHandle file = OpenHandle(target, GENERIC_READ | FILE_READ_ATTRIBUTES | SYNCHRONIZE, FILE_SHARE_READ, OPEN_EXISTING, false, false))
            {
                HandleIdentity identity = Inspect(file, target, false);
                byte[] bytes = ReadAllBounded(file, maximum);
                result["contentSha256"] = Sha256Hex(bytes);
                result["bytes"] = bytes.LongLength.ToString(CultureInfo.InvariantCulture);
                result["volumeSerial"] = identity.Volume.ToString(CultureInfo.InvariantCulture);
                result["fileId"] = identity.FileId;
            }
            return result;
        }

        if (operation == "WRITE_NEW" || operation == "APPEND_DURABLE" || operation == "REPLACE_EXISTING_EXACT")
        {
            using (HeldChain chain = HoldExistingAncestors(root, segments, parentCount))
            using (SafeFileHandle file = OpenHandle(target, GENERIC_WRITE | FILE_READ_ATTRIBUTES | SYNCHRONIZE | (operation == "APPEND_DURABLE" ? FILE_APPEND_DATA : 0), FILE_SHARE_READ | FILE_SHARE_WRITE, operation == "WRITE_NEW" ? CREATE_NEW : OPEN_EXISTING, false, true))
            {
                HandleIdentity identity = Inspect(file, target, false);
                if (operation == "APPEND_DURABLE" || operation == "REPLACE_EXISTING_EXACT") AssertExpectedIdentity(frame, identity);
                using (FileStream stream = new FileStream(new SafeFileHandle(file.DangerousGetHandle(), false), FileAccess.Write, 65536, false))
                {
                    if (operation == "APPEND_DURABLE") stream.Seek(0, SeekOrigin.End);
                    if (operation == "REPLACE_EXISTING_EXACT") stream.SetLength(0);
                    stream.Write(frame.Payload, 0, frame.Payload.Length);
                    stream.Flush(true);
                }
                result["contentSha256"] = Sha256Hex(frame.Payload);
                result["bytes"] = frame.Payload.LongLength.ToString(CultureInfo.InvariantCulture);
                result["volumeSerial"] = identity.Volume.ToString(CultureInfo.InvariantCulture);
                result["fileId"] = identity.FileId;
            }
            return result;
        }

        if (operation == "RENAME_EXCLUSIVE")
        {
            string destinationRelative = Required(frame, 4);
            AssertRootRight(rootId, operation, destinationRelative);
            string[] destinationSegments = ValidateSegments(destinationRelative);
            string destination = Combine(root, destinationSegments, destinationSegments.Length);
            HandleIdentity identity;
            using (HeldChain sourceChain = HoldExistingAncestors(root, segments, parentCount))
            using (HeldChain destinationChain = HoldExistingAncestors(root, destinationSegments, Math.Max(0, destinationSegments.Length - 1)))
            using (SafeFileHandle file = OpenHandle(target, FILE_READ_ATTRIBUTES | DELETE | SYNCHRONIZE, FILE_SHARE_READ, OPEN_EXISTING, false, true))
            using (SafeFileHandle destinationParent = OpenHandle(Combine(root, destinationSegments, Math.Max(0, destinationSegments.Length - 1)), FILE_LIST_DIRECTORY | FILE_ADD_FILE | FILE_READ_ATTRIBUTES | SYNCHRONIZE, FILE_SHARE_READ | FILE_SHARE_WRITE, OPEN_EXISTING, true, true))
            {
                identity = Inspect(file, target, false);
                AssertExpectedIdentity(frame, identity);
                Inspect(destinationParent, Combine(root, destinationSegments, Math.Max(0, destinationSegments.Length - 1)), true);
                RenameByHandle(file, destination);
                FlushFileBuffers(file);
                using (SafeFileHandle destinationHandle = OpenHandle(destination, FILE_READ_ATTRIBUTES | SYNCHRONIZE, FILE_SHARE_READ, OPEN_EXISTING, false, false))
                {
                    HandleIdentity destinationIdentity = Inspect(destinationHandle, destination, false);
                    if (destinationIdentity.Volume != identity.Volume || destinationIdentity.FileId != identity.FileId)
                        throw new InvalidDataException("RENAME_IDENTITY");
                }
            }
            result["volumeSerial"] = identity.Volume.ToString(CultureInfo.InvariantCulture);
            result["fileId"] = identity.FileId;
            return result;
        }

        if (operation == "UNLINK_EXACT")
        {
            using (HeldChain chain = HoldExistingAncestors(root, segments, parentCount))
            using (SafeFileHandle file = OpenHandle(target, FILE_READ_ATTRIBUTES | DELETE | SYNCHRONIZE, FILE_SHARE_READ, OPEN_EXISTING, false, false))
            {
                HandleIdentity identity = Inspect(file, target, false);
                AssertExpectedIdentity(frame, identity);
                MarkDelete(file);
                result["volumeSerial"] = identity.Volume.ToString(CultureInfo.InvariantCulture);
                result["fileId"] = identity.FileId;
            }
            return result;
        }

        if (operation == "INVENTORY_TREE" || operation == "REMOVE_TREE_EXACT")
        {
            long maxFile = OptionalLong(frame, 5, 67108864, MaxPayloadBytes);
            long maxTotal = OptionalLong(frame, 9, 536870912, MaxPayloadBytes);
            int maxEntries = (int)OptionalLong(frame, 6, 50000, 50000);
            int maxDirectories = (int)OptionalLong(frame, 7, 10000, 10000);
            int maxDepth = (int)OptionalLong(frame, 8, 32, 32);
            using (HeldChain chain = HoldExistingAncestors(root, segments, parentCount))
            {
                if (operation == "INVENTORY_TREE")
                {
                    List<SafeFileHandle> retained = new List<SafeFileHandle>();
                    InventoryResult inventory = Inventory(target, maxFile, maxTotal, maxEntries, maxDirectories, maxDepth, retained);
                    string token = InventoryToken(inventory.Records);
                    string leaseId = Sha256Hex(Encoding.UTF8.GetBytes(rootId + "\0" + target + "\0" + token));
                    if (BrokerInventoryLeases.ContainsKey(leaseId))
                    {
                        foreach (SafeFileHandle handle in retained) handle.Dispose();
                        throw new InvalidDataException("INVENTORY_LEASE_DUPLICATE");
                    }
                    InventoryLease lease = new InventoryLease { RootId = rootId, Target = target, Token = token, Inventory = inventory };
                    lease.Handles.AddRange(retained);
                    BrokerInventoryLeases.Add(leaseId, lease);
                    result["inventoryDigest"] = inventory.Digest;
                    result["inventoryTokenBase64"] = token;
                    result["inventoryLeaseId"] = leaseId;
                    result["files"] = inventory.Records.Count(value => !value.Directory).ToString(CultureInfo.InvariantCulture);
                    result["directories"] = inventory.Directories.ToString(CultureInfo.InvariantCulture);
                    result["bytes"] = inventory.TotalBytes.ToString(CultureInfo.InvariantCulture);
                }
                else
                {
                    string expected = Required(frame, 10);
                    string token = Required(frame, 16);
                    string leaseId = Sha256Hex(Encoding.UTF8.GetBytes(rootId + "\0" + target + "\0" + token));
                    InventoryLease lease;
                    if (!BrokerInventoryLeases.TryGetValue(leaseId, out lease) || lease.RootId != rootId || lease.Target != target || lease.Token != token)
                        throw new InvalidDataException("INVENTORY_ORIGINAL_LEASE_REQUIRED");
                    if (lease.Inventory.Digest != expected) throw new InvalidDataException("INVENTORY_TOKEN_DIGEST");
                    if (lease.Deleted)
                    {
                        if (Directory.Exists(target) || File.Exists(target)) throw new InvalidDataException("DELETE_RECREATED_AFTER_TOMBSTONE");
                        result["inventoryDigest"] = expected;
                        result["inventoryLeaseId"] = leaseId;
                        result["outcome"] = "ORIGINAL_INVENTORY_ALREADY_DELETED";
                        return result;
                    }
                    AssertRetainedInventoryCurrent(target, lease.Inventory);
                    DeleteRetainedInventory(target, lease.Inventory);
                    lease.Deleted = true;
                    result["inventoryDigest"] = expected;
                    result["inventoryLeaseId"] = leaseId;
                    result["outcome"] = "ORIGINAL_INVENTORY_DELETED";
                }
            }
            return result;
        }

        if (operation == "TEST_SYNCHRONIZED_SWAP")
        {
            if (!BrokerTestMode) throw new InvalidDataException("TEST_OPERATION_DISABLED");
            string requested = Required(frame, 13);
            string[] allowed = { "mkdir", "create-write", "append", "rename", "read-hash", "unlink", "remove-tree", "job-receipt-ack", "pinned-nvda" };
            if (!allowed.Contains(requested)) throw new InvalidDataException("TEST_OPERATION_NAME");
            string owned = target;
            string moved = Path.Combine(root, "moved");
            string outside = Path.Combine(root, "outside");
            string sentinel = Path.Combine(outside, "sentinel.txt");
            string sentinelBefore;
            using (SafeFileHandle sentinelHandle = OpenHandle(sentinel, GENERIC_READ | FILE_READ_ATTRIBUTES | SYNCHRONIZE, FILE_SHARE_READ, OPEN_EXISTING, false, false))
            {
                Inspect(sentinelHandle, sentinel, false);
                sentinelBefore = Encoding.UTF8.GetString(ReadAllBounded(sentinelHandle, 4096));
            }
            using (HeldChain chain = HoldTestWindow(root, segments))
            {
                ProcessStartInfo attack = new ProcessStartInfo(Environment.GetEnvironmentVariable("ComSpec") ?? "C:\\Windows\\System32\\cmd.exe");
                attack.UseShellExecute = false;
                attack.CreateNoWindow = true;
                attack.RedirectStandardOutput = true;
                attack.RedirectStandardError = true;
                attack.Arguments = "/d /s /c \"echo TEST_WINDOW_OPEN& move /Y " + QuoteArgument(owned) + " " + QuoteArgument(moved) +
                    "& echo RENAME_ATTEMPTED:%ERRORLEVEL%& mklink /J " + QuoteArgument(owned) + " " + QuoteArgument(outside) +
                    "& echo JUNCTION_ATTEMPTED:%ERRORLEVEL%& echo TEST_WINDOW_CONTINUE\"";
                using (Process attacker = Process.Start(attack))
                {
                    string output = attacker.StandardOutput.ReadToEnd() + attacker.StandardError.ReadToEnd();
                    if (!attacker.WaitForExit(10000)) { attacker.Kill(); throw new TimeoutException("TEST_ATTACKER_TIMEOUT"); }
                    if (!output.Contains("TEST_WINDOW_OPEN") || !output.Contains("RENAME_ATTEMPTED:") ||
                        !output.Contains("JUNCTION_ATTEMPTED:") || !output.Contains("TEST_WINDOW_CONTINUE"))
                        throw new InvalidDataException("TEST_ATTACKER_DID_NOT_ATTEMPT");
                    if (!Directory.Exists(owned) || Directory.Exists(moved) || (GetFileAttributesSafe(owned) & FILE_ATTRIBUTE_REPARSE_POINT) != 0)
                        throw new InvalidDataException("TEST_SWAP_NOT_DENIED");
                    result["attackerPid"] = attacker.Id.ToString(CultureInfo.InvariantCulture);
                    result["attackerOutputSha256"] = Sha256Hex(Encoding.UTF8.GetBytes(output));
                    result["testWindow"] = "TEST_WINDOW_OPEN/CONTINUE";
                }

                string seed = Path.Combine(owned, "seed.txt");
                SafeFileHandle retainedSeed = chain.Handles[1];
                if (requested == "mkdir")
                {
                    string child = Path.Combine(owned, "child");
                    Win32(CreateDirectoryW(child, IntPtr.Zero), "CreateDirectoryW(TEST_WINDOW)");
                    using (SafeFileHandle created = OpenHandle(child, FILE_READ_ATTRIBUTES | FILE_LIST_DIRECTORY | SYNCHRONIZE, FILE_SHARE_READ | FILE_SHARE_WRITE, OPEN_EXISTING, true, false)) Inspect(created, child, true);
                }
                else if (requested == "create-write") TestWriteFile(Path.Combine(owned, "created.txt"), Encoding.UTF8.GetBytes("created"), false);
                else if (requested == "append")
                {
                    using (FileStream stream = new FileStream(new SafeFileHandle(retainedSeed.DangerousGetHandle(), false), FileAccess.Write, 4096, false))
                    {
                        stream.Seek(0, SeekOrigin.End);
                        byte[] bytes = Encoding.UTF8.GetBytes("-append");
                        stream.Write(bytes, 0, bytes.Length);
                        stream.Flush(true);
                    }
                }
                else if (requested == "rename")
                {
                    string renamed = Path.Combine(owned, "renamed.txt");
                    HandleIdentity before = Inspect(retainedSeed, seed, false);
                    RenameByHandle(retainedSeed, renamed);
                    HandleIdentity after = Inspect(retainedSeed, renamed, false);
                    if (before.Volume != after.Volume || before.FileId != after.FileId) throw new InvalidDataException("TEST_RENAME_IDENTITY");
                }
                else if (requested == "read-hash" || requested == "pinned-nvda")
                {
                    Inspect(retainedSeed, seed, false);
                    result["actualContentSha256"] = Sha256Hex(ReadAllBounded(retainedSeed, 4096));
                }
                else if (requested == "unlink")
                {
                    Inspect(retainedSeed, seed, false);
                    MarkDelete(retainedSeed);
                }
                else if (requested == "remove-tree")
                {
                    Inspect(retainedSeed, seed, false);
                    MarkDelete(retainedSeed);
                    retainedSeed.Dispose();
                    using (SafeFileHandle ownedHandle = OpenHandle(owned, FILE_READ_ATTRIBUTES | DELETE | SYNCHRONIZE, FILE_SHARE_READ | FILE_SHARE_WRITE, OPEN_EXISTING, true, false)) { Inspect(ownedHandle, owned, true); MarkDelete(ownedHandle); }
                }
                else if (requested == "job-receipt-ack")
                {
                    string receipt = Path.Combine(owned, "job-receipt.jsonl");
                    TestWriteFile(receipt, Encoding.UTF8.GetBytes("assigned\n"), false);
                    TestWriteFile(receipt, Encoding.UTF8.GetBytes("closed\n"), true);
                    TestWriteFile(Path.Combine(owned, "job-ack.json"), Encoding.UTF8.GetBytes("resume\n"), false);
                }

                using (SafeFileHandle sentinelAfterHandle = OpenHandle(sentinel, GENERIC_READ | FILE_READ_ATTRIBUTES | SYNCHRONIZE, FILE_SHARE_READ, OPEN_EXISTING, false, false))
                {
                    Inspect(sentinelAfterHandle, sentinel, false);
                    string sentinelAfter = Encoding.UTF8.GetString(ReadAllBounded(sentinelAfterHandle, 4096));
                    if (sentinelAfter != sentinelBefore) throw new InvalidDataException("TEST_OUTSIDE_SENTINEL_CHANGED");
                }
                result["testOperation"] = requested;
                result["actualOperation"] = "PASS";
                result["swapOutcome"] = "BLOCKED_OR_REFUSED";
                result["outsideSentinel"] = "UNCHANGED";
            }
            return result;
        }

        throw new InvalidDataException("OPERATION_UNIMPLEMENTED");
    }

    private static void AssertExpectedIdentity(Frame frame, HandleIdentity identity)
    {
        ulong expectedVolume;
        string expectedFileId = Required(frame, 12);
        if (!ulong.TryParse(Required(frame, 11), NumberStyles.None, CultureInfo.InvariantCulture, out expectedVolume) ||
            expectedFileId.Length != 32 || expectedFileId.Any(value => !Uri.IsHexDigit(value)) ||
            expectedVolume != identity.Volume || !String.Equals(expectedFileId, identity.FileId, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("EXPECTED_IDENTITY");
    }

    private static bool IsMutation(string operation)
    {
        return operation == "CREATE_DIRECTORY" || operation == "WRITE_NEW" || operation == "APPEND_DURABLE" ||
            operation == "RENAME_EXCLUSIVE" || operation == "UNLINK_EXACT" || operation == "REMOVE_TREE_EXACT" || operation == "UNPIN_FILE" ||
            operation == "JOB_CREATE_SUSPENDED" || operation == "JOB_RESUME" || operation == "JOB_STATUS" || operation == "JOB_TERMINATE" ||
            operation == "NVDA_START_WITH_HANDLES" || operation == "NVDA_STOP" ||
            operation == "TEST_CRASH_AFTER_INTENT" || operation == "REPLACE_EXISTING_EXACT" ||
            operation == "TEST_POST_ACK_JOURNAL_FAILURE";
    }

    private static string FrameRootId(Frame frame) { return frame.Fields.ContainsKey(2) ? Required(frame, 2) : "SESSION"; }
    private static string FrameRelative(Frame frame, ushort field) { return frame.Fields.ContainsKey(field) ? Required(frame, field) : ""; }

    private static string CaptureFrameIdentity(Frame frame, string operation)
    {
        if (operation == "REMOVE_TREE_EXACT")
        {
            string deleteRoot = ResolveRoot(frame);
            string deleteRelative = Required(frame, 3);
            string target = Combine(deleteRoot, ValidateSegments(deleteRelative), ValidateSegments(deleteRelative).Length);
            string token = Required(frame, 16);
            string leaseId = Sha256Hex(Encoding.UTF8.GetBytes(Required(frame, 2) + "\0" + target + "\0" + token));
            InventoryLease retained;
            if (!BrokerInventoryLeases.TryGetValue(leaseId, out retained) || retained.Token != token)
                return "ABSENT";
            return retained.Deleted ? "ABSENT" : Sha256Hex(Encoding.UTF8.GetBytes("ORIGINAL_LEASE|" + leaseId + "|" + retained.Inventory.Digest));
        }
        if (!frame.Fields.ContainsKey(2) || !frame.Fields.ContainsKey(3))
        {
            string state = operation.StartsWith("JOB_", StringComparison.Ordinal) && BrokerJob != null ?
                "JOB:" + BrokerJob.Token + ":" + BrokerJob.Pid.ToString(CultureInfo.InvariantCulture) + ":" + BrokerJob.Resumed.ToString() :
                operation.StartsWith("NVDA_", StringComparison.Ordinal) && BrokerNvda != null ?
                "NVDA:" + BrokerNvda.Token + ":" + BrokerNvda.Pid.ToString(CultureInfo.InvariantCulture) + ":" + BrokerNvda.Resumed.ToString() : "ABSENT";
            return state == "ABSENT" ? state : Sha256Hex(Encoding.UTF8.GetBytes(state));
        }
        string targetRoot = ResolveRoot(frame);
        string targetRelative = Required(frame, 3);
        AssertRootRight(Required(frame, 2), operation, targetRelative);
        if (operation == "RENAME_EXCLUSIVE")
        {
            string destinationRelative = Required(frame, 4);
            AssertRootRight(Required(frame, 2), operation, destinationRelative);
            string sourceIdentity = CapturePathIdentity(targetRoot, targetRelative);
            string destinationIdentity = CapturePathIdentity(targetRoot, destinationRelative);
            return Sha256Hex(Encoding.UTF8.GetBytes("RENAME_EXCLUSIVE|SOURCE=" + sourceIdentity + "|DESTINATION=" + destinationIdentity));
        }
        return CapturePathIdentity(targetRoot, targetRelative);
    }

    private static string CapturePathIdentity(string targetRoot, string targetRelative)
    {
        string[] segments = ValidateSegments(targetRelative);
        string path = Combine(targetRoot, segments, segments.Length);
        try
        {
            uint attributes = GetFileAttributesSafe(path);
            bool directory = (attributes & FILE_ATTRIBUTE_DIRECTORY) != 0;
            using (SafeFileHandle handle = OpenHandle(path, GENERIC_READ | FILE_READ_ATTRIBUTES | SYNCHRONIZE,
                FILE_SHARE_READ | FILE_SHARE_WRITE, OPEN_EXISTING, directory, false))
            {
                HandleIdentity identity = Inspect(handle, path, directory);
                string content = directory ? "DIRECTORY" : Sha256Hex(ReadAllBounded(handle, MaxPayloadBytes));
                return Sha256Hex(Encoding.UTF8.GetBytes(identity.Volume.ToString(CultureInfo.InvariantCulture) + "|" +
                    identity.FileId + "|" + (directory ? "D" : "F") + "|" + content));
            }
        }
        catch (Win32Exception error)
        {
            if (error.NativeErrorCode == 2 || error.NativeErrorCode == 3) return "ABSENT";
            throw;
        }
    }

    private static string CaptureLastRecoveryIdentity(Frame frame)
    {
        if (BrokerLastOperation == "REMOVE_TREE_EXACT")
        {
            string root = ResolveRoot(frame);
            string target = Combine(root, ValidateSegments(BrokerLastRelativePath), ValidateSegments(BrokerLastRelativePath).Length);
            InventoryLease lease = BrokerInventoryLeases.Values.SingleOrDefault(value => value.RootId == BrokerLastRootId && value.Target == target);
            if (lease == null) return "ABSENT";
            string leaseId = Sha256Hex(Encoding.UTF8.GetBytes(lease.RootId + "\0" + lease.Target + "\0" + lease.Token));
            return lease.Deleted ? "ABSENT" : Sha256Hex(Encoding.UTF8.GetBytes("ORIGINAL_LEASE|" + leaseId + "|" + lease.Inventory.Digest));
        }
        return CaptureFrameIdentity(frame, BrokerLastOperation);
    }

    private static string JournalHash(string state, Frame frame, string operation, string previous,
        string beforeIdentity, string afterIdentity, byte[] responseBytes, string sessionNonce)
    {
        byte[] exactResponse = responseBytes ?? new byte[0];
        string responseDigest = exactResponse.Length == 0 ? new string('0', 64) : Sha256Hex(exactResponse);
        string responseBase64 = exactResponse.Length == 0 ? "" : Convert.ToBase64String(exactResponse);
        string[] fields = {
            "J2", state, frame.Sequence.ToString(CultureInfo.InvariantCulture), sessionNonce, operation,
            Hex(frame.RequestSha256), FrameRootId(frame), Convert.ToBase64String(Encoding.UTF8.GetBytes(FrameRelative(frame, 3))),
            Convert.ToBase64String(Encoding.UTF8.GetBytes(FrameRelative(frame, 4))), beforeIdentity, afterIdentity,
            responseDigest, exactResponse.Length.ToString(CultureInfo.InvariantCulture), responseBase64, previous
        };
        return Sha256Hex(Encoding.UTF8.GetBytes(String.Join("|", fields)));
    }

    private static void AppendJournal(string state, Frame frame, string operation, string beforeIdentity, string afterIdentity,
        byte[] responseBytes, string sessionNonce)
    {
        if (responseBytes == null && state == "ACKED_COMMITTED_DURABLE" && !String.IsNullOrEmpty(BrokerLastResponseBase64))
            responseBytes = Convert.FromBase64String(BrokerLastResponseBase64);
        byte[] exactResponse = responseBytes ?? new byte[0];
        string responseDigest = exactResponse.Length == 0 ? new string('0', 64) : Sha256Hex(exactResponse);
        string responseBase64 = exactResponse.Length == 0 ? "" : Convert.ToBase64String(exactResponse);
        string hash = JournalHash(state, frame, operation, BrokerLastJournalHash, beforeIdentity, afterIdentity, exactResponse, sessionNonce);
        string line = "J2|" + state + "|" + frame.Sequence.ToString(CultureInfo.InvariantCulture) + "|" + sessionNonce + "|" + operation + "|" +
            Hex(frame.RequestSha256) + "|" + FrameRootId(frame) + "|" + Convert.ToBase64String(Encoding.UTF8.GetBytes(FrameRelative(frame, 3))) + "|" +
            Convert.ToBase64String(Encoding.UTF8.GetBytes(FrameRelative(frame, 4))) + "|" + beforeIdentity + "|" + afterIdentity + "|" +
            responseDigest + "|" + exactResponse.Length.ToString(CultureInfo.InvariantCulture) + "|" + responseBase64 + "|" +
            BrokerLastJournalHash + "|" + hash + "\n";
        if (BrokerJournalHandle == null || BrokerJournalHandle.IsInvalid || BrokerJournalHandle.IsClosed) throw new InvalidDataException("JOURNAL_HANDLE");
        Inspect(BrokerJournalHandle, BrokerJournalPath, false);
        using (FileStream stream = new FileStream(new SafeFileHandle(BrokerJournalHandle.DangerousGetHandle(), false), FileAccess.Write, 4096, false))
        {
            stream.Seek(0, SeekOrigin.End);
            byte[] bytes = Encoding.UTF8.GetBytes(line);
            stream.Write(bytes, 0, bytes.Length);
            stream.Flush(true);
        }
        Inspect(BrokerJournalHandle, BrokerJournalPath, false);
        BrokerLastJournalHash = hash;
        BrokerJournalRecordCount += 1;
        BrokerLastJournalState = state;
        BrokerLastRequestSha256 = Hex(frame.RequestSha256);
        BrokerLastSessionNonce = sessionNonce;
        BrokerLastOperation = operation;
        BrokerLastRequestSequence = frame.Sequence;
        BrokerLastRootId = FrameRootId(frame);
        BrokerLastRelativePath = FrameRelative(frame, 3);
        BrokerLastRelativePath2 = FrameRelative(frame, 4);
        BrokerLastBeforeIdentity = beforeIdentity;
        BrokerLastAfterIdentity = afterIdentity;
        BrokerLastResponseSha256 = responseDigest;
        BrokerLastResponseBase64 = responseBase64;
    }

    private static void AppendJournal(string state, Frame frame, string operation, string beforeIdentity, string afterIdentity, byte[] responseBytes)
    {
        AppendJournal(state, frame, operation, beforeIdentity, afterIdentity, responseBytes, BrokerSessionNonce);
    }

    private static void AppendJournal(string state, Frame frame, string operation)
    {
        AppendJournal(state, frame, operation, BrokerPendingBeforeIdentity, BrokerPendingAfterIdentity, null);
    }

    private static void ValidateJobClosedReceipt(byte[] bytes)
    {
        string[] expectedKeys = { "assignmentReceiptSha256", "clientIdentity", "cwdIdentity", "distDir", "event", "exitCode",
            "infrastructurePlanDigest", "nextIdentity", "nodeIdentity", "outputAuthorityRootId", "outputAuthoritySha256",
            "powerShellIdentity", "retainedOutputParentIdentity", "schema", "status", "tempIdentity" };
        string[] lines = new UTF8Encoding(false, true).GetString(bytes).Split(new[] { '\n' }, StringSplitOptions.None);
        if (lines.Length != expectedKeys.Length) throw new InvalidDataException("JOB_CLOSED_RECEIPT_SCHEMA");
        Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (int index = 0; index < lines.Length; index++)
        {
            int separator = lines[index].IndexOf('=');
            if (separator <= 0 || lines[index].Substring(0, separator) != expectedKeys[index])
                throw new InvalidDataException("JOB_CLOSED_RECEIPT_KEYS");
            values.Add(expectedKeys[index], lines[index].Substring(separator + 1));
        }
        string[] digestKeys = { "assignmentReceiptSha256", "infrastructurePlanDigest", "outputAuthoritySha256" };
        string[] identityKeys = { "clientIdentity", "cwdIdentity", "nextIdentity", "nodeIdentity", "powerShellIdentity", "retainedOutputParentIdentity", "tempIdentity" };
        if (digestKeys.Any(key => !IsSha256Segment(values[key])) ||
            identityKeys.Any(key => !System.Text.RegularExpressions.Regex.IsMatch(values[key], "^[1-9][0-9]*:[0-9a-fA-F]{32}$")) ||
            values["cwdIdentity"] != values["retainedOutputParentIdentity"] || values["distDir"] != ".next-attempt-002" ||
            values["event"] != "JOB_CLOSED" || values["schema"] != "fluyo:r4b:attempt-002-builder-job-closed:v1" ||
            values["outputAuthorityRootId"] != "BUILD_OUTPUT_ROOT" || !new[] { "PASS", "FAIL" }.Contains(values["status"]) ||
            !System.Text.RegularExpressions.Regex.IsMatch(values["exitCode"], "^(0|[1-9][0-9]*)$") ||
            (values["exitCode"] == "0") != (values["status"] == "PASS"))
            throw new InvalidDataException("JOB_CLOSED_RECEIPT_BINDING");
    }

    public static string ValidateJobClosedReceiptForTest(string payloadBase64)
    {
        try { ValidateJobClosedReceipt(Convert.FromBase64String(payloadBase64)); return "PASS"; }
        catch (Exception error) { return error.Message; }
    }

    private static bool CanonicalUnsignedDecimal(string value)
    {
        ulong parsed;
        return value != null && UInt64.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out parsed) &&
            parsed.ToString(CultureInfo.InvariantCulture) == value;
    }

    private static byte[] DecodeCanonicalBase64(string value, string label)
    {
        try
        {
            byte[] bytes = Convert.FromBase64String(value);
            if (Convert.ToBase64String(bytes) != value) throw new InvalidDataException(label);
            return bytes;
        }
        catch (FormatException) { throw new InvalidDataException(label); }
    }

    private static string DecodeCanonicalUtf8Base64(string value, string label)
    {
        byte[] bytes = DecodeCanonicalBase64(value, label);
        string decoded;
        try { decoded = new UTF8Encoding(false, true).GetString(bytes); }
        catch (DecoderFallbackException) { throw new InvalidDataException(label); }
        if (!Encoding.UTF8.GetBytes(decoded).SequenceEqual(bytes)) throw new InvalidDataException(label);
        return decoded;
    }

    private static void ValidateStoredResponseIdentity(byte[] bytes, string sessionNonce, string requestSequence,
        string operation, string requestSha256)
    {
        string json;
        try { json = new UTF8Encoding(false, true).GetString(bytes); }
        catch (DecoderFallbackException) { throw new InvalidDataException("JOURNAL_RESPONSE_UTF8"); }
        string prefix = "{\"magic\":\"FLUYONS1\",\"version\":1,\"sessionNonce\":\"" + sessionNonce +
            "\",\"sequence\":\"" + requestSequence + "\",\"operation\":\"" + operation +
            "\",\"requestSha256\":\"" + requestSha256 + "\",\"status\":\"";
        if (!json.StartsWith(prefix, StringComparison.Ordinal) || !json.EndsWith("}", StringComparison.Ordinal) ||
            !(json.Substring(prefix.Length).StartsWith("PASS\"", StringComparison.Ordinal) ||
              json.Substring(prefix.Length).StartsWith("FAIL\"", StringComparison.Ordinal)))
            throw new InvalidDataException("JOURNAL_RESPONSE_IDENTITY");
        foreach (string marker in new[] { "\"magic\":", "\"version\":", "\"sessionNonce\":", "\"sequence\":",
            "\"operation\":", "\"requestSha256\":", "\"status\":" })
            if (json.IndexOf(marker, StringComparison.Ordinal) != json.LastIndexOf(marker, StringComparison.Ordinal))
                throw new InvalidDataException("JOURNAL_RESPONSE_DUPLICATE");
    }

    private static void LoadJournal(bool trustedControllerAnchor, long confirmedPrefixSequence, string confirmedPrefixDigest)
    {
        BrokerCrashHeld = false;
        BrokerHoldState = "CLOSED";
        BrokerJournalFailureReason = "NONE";
        BrokerLastJournalHash = new string('0', 64);
        BrokerJournalRecordCount = 0;
        BrokerLastJournalState = "EMPTY";
        BrokerLastRequestSha256 = new string('0', 64);
        BrokerLastSessionNonce = new string('0', 32);
        BrokerLastOperation = "NONE";
        BrokerLastRequestSequence = 0;
        BrokerLastRootId = "SESSION";
        BrokerLastRelativePath = "";
        BrokerLastRelativePath2 = "";
        BrokerLastBeforeIdentity = "ABSENT";
        BrokerLastAfterIdentity = "ABSENT";
        BrokerLastResponseBase64 = "";
        BrokerLastResponseSha256 = new string('0', 64);
        if (BrokerJournalHandle == null || BrokerJournalHandle.IsInvalid || BrokerJournalHandle.IsClosed) throw new InvalidDataException("JOURNAL_HANDLE");
        Inspect(BrokerJournalHandle, BrokerJournalPath, false);
        {
            byte[] bytes = ReadAllBounded(BrokerJournalHandle, 16777216);
            string text = new UTF8Encoding(false, true).GetString(bytes);
            if (bytes.Length > 0 && !text.EndsWith("\n", StringComparison.Ordinal)) throw new InvalidDataException("JOURNAL_TRUNCATED");
            if (bytes.Length > 0 && !text.StartsWith("J2|", StringComparison.Ordinal))
            {
                BrokerCrashHeld = true;
                BrokerHoldState = "LEGACY_JOURNAL_PERMANENT_HELD";
                BrokerJournalFailureReason = "LEGACY_JOURNAL";
                BrokerLastJournalState = "LEGACY_JOURNAL";
                return;
            }
            string lastState = "";
            string lastRequestIdentity = "";
            string prefixRequestIdentity = "";
            bool prefixVerified = confirmedPrefixSequence == 0 && confirmedPrefixDigest == new string('0', 64);
            foreach (string line in text.Split(new[] { '\n' }, StringSplitOptions.RemoveEmptyEntries))
            {
                string[] fields = line.Split('|');
                if (fields.Length != 16 || fields[0] != "J2" || fields[14] != BrokerLastJournalHash || fields[15].Length != 64)
                    throw new InvalidDataException("JOURNAL_CHAIN");
                ulong sequence;
                ulong responseLength;
                if (!CanonicalUnsignedDecimal(fields[2]) || !UInt64.TryParse(fields[2], NumberStyles.None, CultureInfo.InvariantCulture, out sequence) ||
                    fields[3].Length != 32 || fields[3].Any(value => !Uri.IsHexDigit(value)) || fields[5].Length != 64 ||
                    fields[5].Any(value => !Uri.IsHexDigit(value)) || fields[9].Length == 0 || fields[10].Length == 0 ||
                    fields[11].Length != 64 || fields[11].Any(value => !Uri.IsHexDigit(value)) ||
                    !CanonicalUnsignedDecimal(fields[12]) || !UInt64.TryParse(fields[12], NumberStyles.None, CultureInfo.InvariantCulture, out responseLength) ||
                    fields[14].Length != 64 || fields[15].Any(value => !Uri.IsHexDigit(value)))
                    throw new InvalidDataException("JOURNAL_RECORD");
                string relativePath;
                string relativePath2;
                byte[] responseBytes;
                relativePath = DecodeCanonicalUtf8Base64(fields[7], "JOURNAL_ENCODING");
                relativePath2 = DecodeCanonicalUtf8Base64(fields[8], "JOURNAL_ENCODING");
                responseBytes = DecodeCanonicalBase64(fields[13], "JOURNAL_RESPONSE_BASE64");
                if ((ulong)responseBytes.Length != responseLength ||
                    (responseBytes.Length == 0 ? new string('0', 64) : Sha256Hex(responseBytes)) != fields[11])
                    throw new InvalidDataException("JOURNAL_RESPONSE_DIGEST");
                bool responseRequired = new[] { "JOB_CLOSED_DURABLE", "APPLIED_UNACKED_DURABLE", "ACKED_COMMITTED_DURABLE", "FAILED_HELD" }.Contains(fields[1]);
                bool responseForbidden = new[] { "INTENT_DURABLE", "PERMANENT_HELD" }.Contains(fields[1]);
                if ((!responseRequired && !responseForbidden) || (responseRequired && responseBytes.Length == 0) ||
                    (responseForbidden && (responseBytes.Length != 0 || fields[11] != new string('0', 64) || fields[13] != "")))
                    throw new InvalidDataException("JOURNAL_STATE_SCHEMA");
                if (fields[1] == "JOB_CLOSED_DURABLE") ValidateJobClosedReceipt(responseBytes);
                if (new[] { "APPLIED_UNACKED_DURABLE", "ACKED_COMMITTED_DURABLE", "FAILED_HELD" }.Contains(fields[1]))
                    ValidateStoredResponseIdentity(responseBytes, fields[3], fields[2], fields[4], fields[5]);
                if (Sha256Hex(Encoding.UTF8.GetBytes(String.Join("|", fields.Take(15)))) != fields[15])
                    throw new InvalidDataException("JOURNAL_HASH");
                string requestIdentity = fields[2] + "|" + fields[3] + "|" + fields[4] + "|" + fields[5] + "|" + fields[6] + "|" + fields[7] + "|" + fields[8];
                bool sameRequest = requestIdentity == lastRequestIdentity;
                if (BrokerJournalRecordCount == 0)
                {
                    if (fields[1] != "INTENT_DURABLE") throw new InvalidDataException("JOURNAL_TRANSITION");
                }
                else if (!sameRequest)
                {
                    if (!new[] { "ACKED_COMMITTED_DURABLE", "FAILED_HELD" }.Contains(lastState) || fields[1] != "INTENT_DURABLE")
                        throw new InvalidDataException("JOURNAL_TRANSITION");
                }
                else
                {
                    bool valid = (lastState == "INTENT_DURABLE" && new[] { "JOB_CLOSED_DURABLE", "APPLIED_UNACKED_DURABLE", "FAILED_HELD", "PERMANENT_HELD" }.Contains(fields[1])) ||
                        (lastState == "JOB_CLOSED_DURABLE" && new[] { "APPLIED_UNACKED_DURABLE", "FAILED_HELD", "PERMANENT_HELD" }.Contains(fields[1])) ||
                        (lastState == "APPLIED_UNACKED_DURABLE" && new[] { "ACKED_COMMITTED_DURABLE", "PERMANENT_HELD" }.Contains(fields[1]));
                    if (!valid) throw new InvalidDataException("JOURNAL_TRANSITION");
                    if (fields[1] == "ACKED_COMMITTED_DURABLE" &&
                        (fields[11] != BrokerLastResponseSha256 || fields[12] != Convert.FromBase64String(BrokerLastResponseBase64).Length.ToString(CultureInfo.InvariantCulture) ||
                         fields[13] != BrokerLastResponseBase64)) throw new InvalidDataException("JOURNAL_RESPONSE_REPLAY");
                }
                BrokerLastJournalHash = fields[15];
                BrokerJournalRecordCount += 1;
                if (trustedControllerAnchor && BrokerJournalRecordCount == confirmedPrefixSequence)
                {
                    if (BrokerLastJournalHash != confirmedPrefixDigest) throw new InvalidDataException("JOURNAL_PREFIX_MISMATCH");
                    prefixVerified = true;
                    prefixRequestIdentity = "";
                }
                else if (trustedControllerAnchor && BrokerJournalRecordCount > confirmedPrefixSequence)
                {
                    if (prefixRequestIdentity.Length == 0) prefixRequestIdentity = requestIdentity;
                    else if (requestIdentity != prefixRequestIdentity) throw new InvalidDataException("JOURNAL_SUFFIX_REQUEST");
                }
                lastState = fields[1];
                lastRequestIdentity = requestIdentity;
                BrokerLastJournalState = fields[1];
                BrokerLastRequestSequence = sequence;
                BrokerLastSessionNonce = fields[3];
                BrokerLastOperation = fields[4];
                BrokerLastRequestSha256 = fields[5];
                BrokerLastRootId = fields[6];
                BrokerLastRelativePath = relativePath;
                BrokerLastRelativePath2 = relativePath2;
                BrokerLastBeforeIdentity = fields[9];
                BrokerLastAfterIdentity = fields[10];
                BrokerLastResponseSha256 = fields[11];
                BrokerLastResponseBase64 = fields[13];
            }
            if (trustedControllerAnchor && (!prefixVerified || confirmedPrefixSequence > BrokerJournalRecordCount))
                throw new InvalidDataException("JOURNAL_PREFIX_MISSING");
            if (lastState == "PERMANENT_HELD" || lastState == "JOB_CLOSED_DURABLE" || (!trustedControllerAnchor &&
                (lastState == "INTENT_DURABLE" || lastState == "APPLIED_UNACKED_DURABLE" || lastState == "FAILED_HELD")))
            {
                BrokerCrashHeld = true;
                BrokerHoldState = "JOURNAL_PERMANENT_HELD";
            }
            else if (trustedControllerAnchor && (lastState == "INTENT_DURABLE" ||
                lastState == "APPLIED_UNACKED_DURABLE" || lastState == "FAILED_HELD"))
            {
                BrokerCrashHeld = true;
                BrokerHoldState = "FAILED_HELD";
            }
            else if (!trustedControllerAnchor && !BrokerJournalWasCreated)
            {
                BrokerCrashHeld = true;
                BrokerHoldState = "ORPHANED_PERMANENT_HELD";
            }
        }
    }

    public static string ValidateJ2JournalForTest(string journalBase64, long confirmedPrefixSequence, string confirmedPrefixDigest)
    {
        string path = Path.Combine(Path.GetTempPath(), "fluyo-j2-validate-" + Guid.NewGuid().ToString("N") + ".journal");
        try
        {
            File.WriteAllBytes(path, Convert.FromBase64String(journalBase64));
            BrokerJournalPath = path;
            BrokerJournalHandle = OpenHandle(path, GENERIC_READ | GENERIC_WRITE | FILE_APPEND_DATA | FILE_READ_ATTRIBUTES | SYNCHRONIZE,
                FILE_SHARE_READ, OPEN_EXISTING, false, false);
            LoadJournal(true, confirmedPrefixSequence, confirmedPrefixDigest);
            return BrokerHoldState == "CLOSED" ? "PASS" : BrokerHoldState + ":" + BrokerJournalFailureReason;
        }
        catch (Exception error) { return error.Message; }
        finally
        {
            if (BrokerJournalHandle != null) { BrokerJournalHandle.Dispose(); BrokerJournalHandle = null; }
            try { new FileInfo(path).Delete(); } catch { }
        }
    }

    private static bool IsLowerHex(string value, int length)
    {
        return value != null && value.Length == length && value.All(character =>
            (character >= '0' && character <= '9') || (character >= 'a' && character <= 'f'));
    }

    private static string JournalDirectoryForMode(string tempRoot, bool create)
    {
        if (!BrokerTestMode) return Path.Combine(tempRoot, "fluyo-native-broker-journals");
        string parent = Path.Combine(tempRoot, "fluyo-native-test-broker-journals");
        string directory = Path.GetDirectoryName(BrokerJournalPath);
        string runId = Path.GetFileName(directory);
        if (!IsLowerHex(runId, 64) ||
            !String.Equals(directory, Path.Combine(parent, runId), StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("TEST_JOURNAL_RUN_ID");
        if (create)
        {
            if (!CreateDirectoryW(parent, IntPtr.Zero) && Marshal.GetLastWin32Error() != ERROR_ALREADY_EXISTS)
                throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateDirectoryW(test journal parent)");
            if (!CreateDirectoryW(directory, IntPtr.Zero) && Marshal.GetLastWin32Error() != ERROR_ALREADY_EXISTS)
                throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateDirectoryW(test journal run)");
        }
        return directory;
    }

    private static string[] JournalSegmentsForMode(string journalDirectory)
    {
        return BrokerTestMode
            ? ValidateSegments("fluyo-native-test-broker-journals/" + Path.GetFileName(journalDirectory))
            : ValidateSegments("fluyo-native-broker-journals");
    }

    private static void OpenJournalBoundary()
    {
        string tempRoot = Path.GetFullPath(Path.GetTempPath()).TrimEnd(Path.DirectorySeparatorChar);
        string journalDirectory = JournalDirectoryForMode(tempRoot, true);
        string name = Path.GetFileName(BrokerJournalPath);
        string expectedName = Sha256Hex(Encoding.UTF8.GetBytes(BrokerRepositoryRoot + "\0" + (BrokerTestMode ? "test" : "production"))) + ".journal";
        if (!String.Equals(Path.GetDirectoryName(BrokerJournalPath), journalDirectory, StringComparison.OrdinalIgnoreCase) ||
            !String.Equals(name, expectedName, StringComparison.Ordinal) || name.Length != 72 ||
            name.Substring(0, 64).Any(value => !Uri.IsHexDigit(value)))
            throw new InvalidDataException("JOURNAL_PATH_CONTRACT");
        if (!BrokerTestMode && !CreateDirectoryW(journalDirectory, IntPtr.Zero) && Marshal.GetLastWin32Error() != ERROR_ALREADY_EXISTS)
            throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateDirectoryW(journalDirectory)");
        BrokerJournalChain = HoldExistingAncestors(tempRoot, JournalSegmentsForMode(journalDirectory), BrokerTestMode ? 2 : 1);
        uint access = GENERIC_READ | GENERIC_WRITE | FILE_APPEND_DATA | FILE_READ_ATTRIBUTES | SYNCHRONIZE;
        SafeFileHandle created = CreateFileW(BrokerJournalPath, access, FILE_SHARE_READ, IntPtr.Zero, CREATE_NEW,
            FILE_FLAG_OPEN_REPARSE_POINT | FILE_ATTRIBUTE_NORMAL | FILE_FLAG_WRITE_THROUGH, IntPtr.Zero);
        if (created == null || created.IsInvalid)
        {
            int error = Marshal.GetLastWin32Error();
            if (created != null) created.Dispose();
            if (error != ERROR_FILE_EXISTS && error != ERROR_ALREADY_EXISTS)
                throw new Win32Exception(error, "CreateFileW(JOURNAL_CREATE_NEW)");
            BrokerJournalHandle = OpenHandle(BrokerJournalPath, access, FILE_SHARE_READ, OPEN_EXISTING, false, true);
            BrokerJournalWasCreated = false;
        }
        else
        {
            BrokerJournalHandle = created;
            BrokerJournalWasCreated = true;
        }
        Inspect(BrokerJournalHandle, BrokerJournalPath, false);
    }

    private static void AdoptJournalBoundaryFromController(int controllerPid, long controllerAnchor)
    {
        string tempRoot = Path.GetFullPath(Path.GetTempPath()).TrimEnd(Path.DirectorySeparatorChar);
        string journalDirectory = JournalDirectoryForMode(tempRoot, false);
        string expectedName = Sha256Hex(Encoding.UTF8.GetBytes(BrokerRepositoryRoot + "\0" + (BrokerTestMode ? "test" : "production"))) + ".journal";
        if (!String.Equals(Path.GetDirectoryName(BrokerJournalPath), journalDirectory, StringComparison.OrdinalIgnoreCase) ||
            !String.Equals(Path.GetFileName(BrokerJournalPath), expectedName, StringComparison.Ordinal))
            throw new InvalidDataException("JOURNAL_PATH_CONTRACT");
        BrokerJournalChain = HoldExistingAncestors(tempRoot, JournalSegmentsForMode(journalDirectory), BrokerTestMode ? 2 : 1);
        IntPtr controllerProcess = OpenProcess(PROCESS_DUP_HANDLE, false, controllerPid);
        if (controllerProcess == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(), "OpenProcess(CONTROLLER_ANCHOR)");
        try
        {
            IntPtr localAnchor;
            Win32(DuplicateHandle(controllerProcess, new IntPtr(controllerAnchor), GetCurrentProcess(), out localAnchor,
                0, false, DUPLICATE_SAME_ACCESS), "DuplicateHandle(ADOPT_CONTROLLER_JOURNAL_ANCHOR)");
            BrokerJournalHandle = new SafeFileHandle(localAnchor, true);
            Inspect(BrokerJournalHandle, BrokerJournalPath, false);
            BrokerControllerJournalAnchor = controllerAnchor;
            BrokerJournalWasCreated = false;
        }
        finally { CloseHandle(controllerProcess); }
    }

    private static byte[] ProcessRequest(byte[] request, bool enforceSession)
    {
        Frame frame = null;
        string session = "";
        string operation = "UNKNOWN";
        bool intentWritten = false;
        BrokerResponseNeedsCommit = false;
        try
        {
            frame = ParseFrame(request);
            ValidateOperationSchema(frame);
            session = Required(frame, 1);
            if (session.Length != 32 || session.Any(character => !Uri.IsHexDigit(character))) throw new InvalidDataException("SESSION_NONCE");
            operation = OperationName(frame.Operation);
            string idempotencyKey = Required(frame, 17);
            int controllerPid;
            long expectedJournalSequence;
            if (idempotencyKey.Length != 64 || idempotencyKey.Any(value => !Uri.IsHexDigit(value)) ||
                !Int32.TryParse(Required(frame, 18), NumberStyles.None, CultureInfo.InvariantCulture, out controllerPid) || controllerPid != BrokerControllerPid ||
                String.IsNullOrWhiteSpace(Required(frame, 19)) ||
                !Int64.TryParse(Required(frame, 20), NumberStyles.None, CultureInfo.InvariantCulture, out expectedJournalSequence))
                throw new InvalidDataException("CAPABILITY_FRAME_IDENTITY");
            string controllerCreationIdentity = Required(frame, 19);
            if (BrokerControllerCreationIdentity == null)
            {
                if (frame.Operation != 1) throw new InvalidDataException("CONTROLLER_CREATION_IDENTITY_UNBOUND");
                BrokerControllerCreationIdentity = controllerCreationIdentity;
            }
            else if (!String.Equals(BrokerControllerCreationIdentity, controllerCreationIdentity, StringComparison.Ordinal))
                throw new InvalidDataException("CONTROLLER_CREATION_IDENTITY_CHANGED");
            bool journalAnchorMatches = expectedJournalSequence == BrokerJournalRecordCount && Required(frame, 21) == BrokerLastJournalHash;
            if (frame.Operation != 1 && !journalAnchorMatches) throw new InvalidDataException("CAPABILITY_FRAME_JOURNAL_ANCHOR");
            if (frame.Operation != 1 && frame.Operation != 20 && frame.Operation != 21 && Required(frame, 22) != BrokerCapability)
                throw new InvalidDataException("CAPABILITY_TOKEN");
            if (enforceSession)
            {
                if (!String.Equals(session, BrokerSessionNonce, StringComparison.Ordinal)) throw new InvalidDataException("SESSION_NONCE_MISMATCH");
                if (frame.Sequence != BrokerNextSequence) throw new InvalidDataException("SEQUENCE_CLOSED");
            }
            if (BrokerCrashHeld && IsMutation(operation)) throw new InvalidDataException(BrokerHoldState);
            if (IsMutation(operation))
            {
                BrokerPendingBeforeIdentity = CaptureFrameIdentity(frame, operation);
                BrokerPendingAfterIdentity = BrokerPendingBeforeIdentity;
                AppendJournal("INTENT_DURABLE", frame, operation, BrokerPendingBeforeIdentity, BrokerPendingAfterIdentity, null);
                intentWritten = true;
                if (operation == "TEST_CRASH_AFTER_INTENT" && BrokerTestMode) Environment.FailFast("TEST_CRASH_AFTER_INTENT");
            }
            Dictionary<string, string> values = Execute(frame, operation);
            byte[] encodedResponse;
            if (intentWritten)
            {
                BrokerPendingAfterIdentity = CaptureFrameIdentity(frame, operation);
                if (new[] { "JOB_STATUS", "JOB_TERMINATE" }.Contains(operation) && BrokerJob != null &&
                    values.ContainsKey("jobState") && new[] { "CLOSED", "TERMINATED_CLOSED" }.Contains(values["jobState"]) &&
                    !BrokerJob.ClosedDurable)
                {
                    byte[] closedReceipt = Convert.FromBase64String(values["closedReceiptBase64"]);
                    if (Sha256Hex(closedReceipt) != values["closedReceiptSha256"])
                        throw new InvalidDataException("JOB_CLOSED_RECEIPT_DIGEST");
                    AppendJournal("JOB_CLOSED_DURABLE", frame, operation, BrokerPendingBeforeIdentity,
                        BrokerPendingAfterIdentity, closedReceipt);
                    BrokerJob.ClosedDurable = true;
                }
                if (operation == "JOB_TERMINATE" && BrokerJob != null)
                {
                    BrokerJob.Dispose();
                    BrokerJob = null;
                }
                BrokerResponseNeedsCommit = true;
                values["journalBeforeResponseSha256"] = BrokerLastJournalHash;
                values["journalBeforeResponseSequence"] = BrokerJournalRecordCount.ToString(CultureInfo.InvariantCulture);
                encodedResponse = Encoding.UTF8.GetBytes(Response(frame, session, operation, "PASS", null, values));
                AppendJournal("APPLIED_UNACKED_DURABLE", frame, operation, BrokerPendingBeforeIdentity,
                    BrokerPendingAfterIdentity, encodedResponse);
            }
            else
            {
                values["journalBeforeResponseSha256"] = BrokerLastJournalHash;
                values["journalBeforeResponseSequence"] = BrokerJournalRecordCount.ToString(CultureInfo.InvariantCulture);
                encodedResponse = Encoding.UTF8.GetBytes(Response(frame, session, operation, "PASS", null, values));
            }
            return encodedResponse;
        }
        catch (Exception error)
        {
            if (frame == null) frame = new Frame { Sequence = 0, Operation = 0, RequestSha256 = Sha256(request ?? new byte[0]) };
            Win32Exception native = error as Win32Exception;
            string nativeCode = native == null ? "" : ":" + native.NativeErrorCode.ToString(CultureInfo.InvariantCulture);
            Dictionary<string, string> failure = new Dictionary<string, string>();
            failure["journalBeforeResponseSha256"] = BrokerLastJournalHash;
            failure["journalBeforeResponseSequence"] = BrokerJournalRecordCount.ToString(CultureInfo.InvariantCulture);
            byte[] failureResponse = Encoding.UTF8.GetBytes(Response(frame, session, operation, "FAIL",
                error.GetType().Name + nativeCode + ":" + error.Message, failure));
            if (intentWritten && frame != null)
            {
                try { AppendJournal("FAILED_HELD", frame, operation, BrokerPendingBeforeIdentity, BrokerPendingAfterIdentity, failureResponse); }
                finally { BrokerCrashHeld = true; BrokerHoldState = "FAILED_HELD"; }
            }
            return failureResponse;
        }
    }

    public static byte[] RunBytes(byte[] request)
    {
        return ProcessRequest(request, false);
    }

    private static byte[] ReadPipeFrame(BinaryReader reader, int maximum)
    {
        byte[] lengthBytes = reader.ReadBytes(4);
        if (lengthBytes.Length == 0) return null;
        if (lengthBytes.Length != 4) throw new EndOfStreamException("PIPE_LENGTH_TRUNCATED");
        int length = BitConverter.ToInt32(lengthBytes, 0);
        if (length <= 0 || length > maximum) throw new InvalidDataException("PIPE_FRAME_BOUND");
        byte[] value = reader.ReadBytes(length);
        if (value.Length != length) throw new EndOfStreamException("PIPE_FRAME_TRUNCATED");
        return value;
    }

    private static void WritePipeFrame(BinaryWriter writer, byte[] value)
    {
        writer.Write(value.Length);
        writer.Write(value);
        writer.Flush();
    }

    public static int RunPipeServer(string repositoryRoot, string sessionNonce, int controllerPid, string controllerCreationIdentity,
        string journalPath, bool testMode, string contractDigest, string capability, long recoveryAnchorHandle,
        long confirmedPrefixSequence, string confirmedPrefixDigest, string powerShellIdentity,
        string powerShellVersion, string powerShellSignature)
    {
        BrokerRepositoryRoot = Path.GetFullPath(repositoryRoot).TrimEnd(Path.DirectorySeparatorChar);
        BrokerSessionNonce = sessionNonce;
        BrokerJournalPath = Path.GetFullPath(journalPath);
        BrokerTestMode = testMode;
        BrokerNextSequence = 1;
        BrokerPendingFrame = null;
        BrokerPendingResponse = null;
        BrokerPendingOperation = null;
        BrokerPendingMutation = false;
        BrokerContractDigest = contractDigest;
        BrokerCapability = capability;
        BrokerControllerPid = controllerPid;
        BrokerControllerCreationIdentity = controllerCreationIdentity;
        BrokerPowerShellIdentity = powerShellIdentity;
        BrokerPowerShellVersion = powerShellVersion;
        BrokerPowerShellSignature = powerShellSignature;
        if (sessionNonce == null || sessionNonce.Length != 32 || sessionNonce.Any(value => !Uri.IsHexDigit(value))) throw new InvalidDataException("SESSION_NONCE");
        if (!String.Equals(contractDigest, EmbeddedContractSha256, StringComparison.Ordinal)) throw new InvalidDataException("CONTRACT_DIGEST");
        if (capability == null || capability.Length != 64 || capability.Any(value => !Uri.IsHexDigit(value))) throw new InvalidDataException("CAPABILITY");
        if (String.IsNullOrWhiteSpace(controllerCreationIdentity)) throw new InvalidDataException("CONTROLLER_CREATION_IDENTITY");
        Process controller = Process.GetProcessById(controllerPid);
        if (controller.HasExited) throw new InvalidDataException("CONTROLLER_EXITED");
        if (recoveryAnchorHandle > 0) AdoptJournalBoundaryFromController(controllerPid, recoveryAnchorHandle);
        else OpenJournalBoundary();
        try
        {
            if (recoveryAnchorHandle <= 0)
            {
                IntPtr controllerProcess = OpenProcess(PROCESS_DUP_HANDLE, false, controllerPid);
                if (controllerProcess == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(), "OpenProcess(CONTROLLER_DUP_HANDLE)");
                try
                {
                    IntPtr controllerAnchor;
                    Win32(DuplicateHandle(GetCurrentProcess(), BrokerJournalHandle.DangerousGetHandle(), controllerProcess,
                        out controllerAnchor, 0, false, DUPLICATE_SAME_ACCESS), "DuplicateHandle(CONTROLLER_JOURNAL_ANCHOR)");
                    BrokerControllerJournalAnchor = controllerAnchor.ToInt64();
                }
                finally { CloseHandle(controllerProcess); }
            }
            try
            {
                if (confirmedPrefixSequence < 0 || confirmedPrefixDigest == null || confirmedPrefixDigest.Length != 64 ||
                    confirmedPrefixDigest.Any(value => !Uri.IsHexDigit(value))) throw new InvalidDataException("JOURNAL_PREFIX_ARGUMENT");
                LoadJournal(recoveryAnchorHandle > 0, confirmedPrefixSequence, confirmedPrefixDigest);
            }
            catch (InvalidDataException error)
            {
                BrokerCrashHeld = true;
                BrokerHoldState = recoveryAnchorHandle > 0 ? "JOURNAL_PERMANENT_HELD" : "ORPHANED_PERMANENT_HELD";
                BrokerJournalFailureReason = error.Message;
                BrokerLastJournalHash = new string('0', 64);
                BrokerJournalRecordCount = 0;
            }
            try
            {
                using (BinaryReader reader = new BinaryReader(Console.OpenStandardInput(), Encoding.UTF8, true))
                using (BinaryWriter writer = new BinaryWriter(Console.OpenStandardOutput(), Encoding.UTF8, true))
                {
                    bool stop = false;
                    while (!stop && !controller.HasExited)
                    {
                        byte[] request = ReadPipeFrame(reader, 67174400);
                        if (request == null) break;
                        Frame frame = ParseFrame(request);
                        byte[] requestDigest = frame.RequestSha256;
                        if (BrokerPendingFrame != null)
                        {
                            if (frame.Sequence != BrokerPendingFrame.Sequence || !requestDigest.SequenceEqual(BrokerPendingFrame.RequestSha256))
                                throw new InvalidDataException("PENDING_REPLAY_IDENTITY");
                        }
                        else
                        {
                            if (frame.Sequence != BrokerNextSequence) throw new InvalidDataException("SEQUENCE_CLOSED");
                            BrokerPendingFrame = frame;
                            BrokerPendingOperation = OperationName(frame.Operation);
                            BrokerPendingMutation = false;
                            BrokerPendingResponse = ProcessRequest(request, true);
                            BrokerPendingMutation = BrokerResponseNeedsCommit;
                        }
                        WritePipeFrame(writer, BrokerPendingResponse);
                        while (true)
                        {
                            byte[] capabilityFrame = ReadPipeFrame(reader, 67174400);
                            if (capabilityFrame == null) throw new EndOfStreamException("PIPE_ACK_MISSING");
                            if (capabilityFrame.Length == 32)
                            {
                                if (!capabilityFrame.SequenceEqual(Sha256(BrokerPendingResponse))) throw new InvalidDataException("PIPE_ACK_DIGEST");
                                break;
                            }
                            Frame replay = ParseFrame(capabilityFrame);
                            if (replay.Sequence != BrokerPendingFrame.Sequence || !replay.RequestSha256.SequenceEqual(BrokerPendingFrame.RequestSha256))
                                throw new InvalidDataException("PENDING_REPLAY_IDENTITY");
                            WritePipeFrame(writer, BrokerPendingResponse);
                        }
                        if (BrokerPendingOperation == "TEST_POST_ACK_JOURNAL_FAILURE" && BrokerTestMode)
                            throw new IOException("TEST_POST_ACK_JOURNAL_FAILURE");
                        if (BrokerPendingMutation) AppendJournal("ACKED_COMMITTED_DURABLE", BrokerPendingFrame, BrokerPendingOperation);
                        Dictionary<string, string> commit = new Dictionary<string, string>();
                        commit["commitStatus"] = "COMMIT_CONFIRMED";
                        commit["acknowledgedResponseSha256"] = Sha256Hex(BrokerPendingResponse);
                        commit["journalAfterAckSha256"] = BrokerLastJournalHash;
                        commit["journalAfterAckSequence"] = BrokerJournalRecordCount.ToString(CultureInfo.InvariantCulture);
                        WritePipeFrame(writer, Encoding.UTF8.GetBytes(Response(BrokerPendingFrame, BrokerSessionNonce,
                            BrokerPendingOperation, "PASS", null, commit)));
                        stop = BrokerPendingFrame.Operation == 20;
                        BrokerNextSequence += 1;
                        BrokerPendingFrame = null;
                        BrokerPendingResponse = null;
                        BrokerPendingOperation = null;
                        BrokerPendingMutation = false;
                    }
                    if (!stop && controller.HasExited && BrokerPendingFrame != null && BrokerPendingMutation)
                    {
                        AppendJournal("PERMANENT_HELD", BrokerPendingFrame, BrokerPendingOperation);
                        BrokerCrashHeld = true;
                        BrokerHoldState = "JOURNAL_PERMANENT_HELD";
                    }
                }
            }
            catch (EndOfStreamException)
            {
                if (BrokerPendingFrame == null || !BrokerPendingMutation || !controller.WaitForExit(2000)) throw;
                AppendJournal("PERMANENT_HELD", BrokerPendingFrame, BrokerPendingOperation);
                BrokerCrashHeld = true;
                BrokerHoldState = "JOURNAL_PERMANENT_HELD";
            }
        }
        finally
        {
            if (BrokerJob != null) { BrokerJob.Dispose(); BrokerJob = null; }
            if (BrokerNvda != null) { BrokerNvda.Dispose(); BrokerNvda = null; }
            foreach (InventoryLease lease in BrokerInventoryLeases.Values) lease.Dispose();
            BrokerInventoryLeases.Clear();
            if (BrokerJournalHandle != null) { BrokerJournalHandle.Dispose(); BrokerJournalHandle = null; }
            if (BrokerJournalChain != null) { BrokerJournalChain.Dispose(); BrokerJournalChain = null; }
        }
        return 0;
    }

    private const uint CREATE_SUSPENDED = 0x00000004;
    private const uint CREATE_NO_WINDOW = 0x08000000;
    private const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
    private const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    private const uint WAIT_OBJECT_0 = 0;
    private const uint WAIT_TIMEOUT = 258;
    private const uint STILL_ACTIVE = 259;
    private const uint HANDLE_FLAG_INHERIT = 0x00000001;
    private const int STARTF_USESTDHANDLES = 0x00000100;
    private const int JobObjectExtendedLimitInformation = 9;
    private static readonly IntPtr PROC_THREAD_ATTRIBUTE_HANDLE_LIST = new IntPtr(0x00020002);

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct STARTUPINFO
    {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct STARTUPINFOEX
    {
        public STARTUPINFO StartupInfo;
        public IntPtr lpAttributeList;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_INFORMATION
    {
        public IntPtr hProcess;
        public IntPtr hThread;
        public uint dwProcessId;
        public uint dwThreadId;
    }

    private sealed class BrokerJobState : IDisposable
    {
        public string Token;
        public string ArgvDigest;
        public string EnvironmentDigest;
        public string OutputPath;
        public string OutputPathDigest;
        public string OutputAuthorityDigest;
        public string InfrastructurePlanDigest;
        public string AssignmentReceiptDigest;
        public string NodeIdentity;
        public string NextIdentity;
        public string PowerShellIdentity;
        public string ClientIdentity;
        public string CwdIdentity;
        public string TempIdentity;
        public string ClosedReceiptDigest = new string('0', 64);
        public string ClosedReceiptBase64 = "";
        public bool ClosedDurable;
        public IntPtr Job;
        public IntPtr Process;
        public IntPtr Thread;
        public uint Pid;
        public bool Resumed;
        public readonly List<SafeFileHandle> Pins = new List<SafeFileHandle>();
        public void Dispose()
        {
            if (Thread != IntPtr.Zero) { CloseHandle(Thread); Thread = IntPtr.Zero; }
            if (Process != IntPtr.Zero) { CloseHandle(Process); Process = IntPtr.Zero; }
            if (Job != IntPtr.Zero) { CloseHandle(Job); Job = IntPtr.Zero; }
            foreach (SafeFileHandle pin in Pins) pin.Dispose();
            Pins.Clear();
        }
    }

    private sealed class BrokerNvdaState : IDisposable
    {
        public string Token;
        public IntPtr Job;
        public IntPtr Process;
        public IntPtr Thread;
        public uint Pid;
        public bool Resumed;
        public readonly List<SafeFileHandle> Pins = new List<SafeFileHandle>();
        public SafeFileHandle ControlReadChild;
        public SafeFileHandle ControlWriteBroker;
        public SafeFileHandle ReadyReadBroker;
        public SafeFileHandle ReadyWriteChild;
        public SafeFileHandle Transcript { get { return Pins[6]; } }
        public SafeFileHandle Diagnostic { get { return Pins[7]; } }
        public void Dispose()
        {
            if (Thread != IntPtr.Zero) { CloseHandle(Thread); Thread = IntPtr.Zero; }
            if (Process != IntPtr.Zero) { CloseHandle(Process); Process = IntPtr.Zero; }
            if (Job != IntPtr.Zero) { CloseHandle(Job); Job = IntPtr.Zero; }
            foreach (SafeFileHandle pin in Pins) pin.Dispose();
            Pins.Clear();
            if (ControlReadChild != null) ControlReadChild.Dispose();
            if (ControlWriteBroker != null) ControlWriteBroker.Dispose();
            if (ReadyReadBroker != null) ReadyReadBroker.Dispose();
            if (ReadyWriteChild != null) ReadyWriteChild.Dispose();
        }
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateJobObjectW(IntPtr attributes, string name);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CreateProcessW(
        string applicationName,
        StringBuilder commandLine,
        IntPtr processAttributes,
        IntPtr threadAttributes,
        [MarshalAs(UnmanagedType.Bool)] bool inheritHandles,
        uint creationFlags,
        IntPtr environment,
        string currentDirectory,
        ref STARTUPINFO startup,
        out PROCESS_INFORMATION processInformation);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "CreateProcessW")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CreateProcessExtendedW(
        string applicationName,
        StringBuilder commandLine,
        IntPtr processAttributes,
        IntPtr threadAttributes,
        [MarshalAs(UnmanagedType.Bool)] bool inheritHandles,
        uint creationFlags,
        IntPtr environment,
        string currentDirectory,
        ref STARTUPINFOEX startup,
        out PROCESS_INFORMATION processInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool InitializeProcThreadAttributeList(IntPtr attributeList, int attributeCount, int flags, ref IntPtr size);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UpdateProcThreadAttribute(IntPtr attributeList, uint flags, IntPtr attribute, IntPtr value, IntPtr size, IntPtr previousValue, IntPtr returnSize);

    [DllImport("kernel32.dll")]
    private static extern void DeleteProcThreadAttributeList(IntPtr attributeList);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint ResumeThread(IntPtr thread);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool TerminateProcess(IntPtr process, uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CloseHandle(IntPtr handle);

    private static string QuoteArgument(string value)
    {
        return "\"" + value.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
    }

    private static byte[] ExactEnvironmentBlock(string[] entries, string expectedDigest)
    {
        string[] keys = { "ComSpec", "NEXT_TELEMETRY_DISABLED", "NODE_ENV", "SystemRoot", "TEMP", "TMP" };
        if (entries == null || entries.Length != keys.Length) throw new InvalidDataException("JOB_ENVIRONMENT_COUNT");
        HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (int index = 0; index < entries.Length; index++)
        {
            int separator = entries[index].IndexOf('=');
            if (separator <= 0 || entries[index].IndexOf('\0') >= 0) throw new InvalidDataException("JOB_ENVIRONMENT_ENTRY");
            string key = entries[index].Substring(0, separator);
            if (key != keys[index] || !seen.Add(key)) throw new InvalidDataException("JOB_ENVIRONMENT_ORDER");
        }
        byte[] bytes = Encoding.Unicode.GetBytes(String.Join("\0", entries) + "\0\0");
        if (Sha256Hex(bytes) != expectedDigest) throw new InvalidDataException("JOB_ENVIRONMENT_DIGEST");
        return bytes;
    }

    private static string RepositoryRelative(string repositoryRoot, string path)
    {
        string root = Path.GetFullPath(repositoryRoot).TrimEnd(Path.DirectorySeparatorChar);
        string exact = Path.GetFullPath(path);
        string prefix = root + Path.DirectorySeparatorChar;
        if (!exact.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("JOB_PATH_ROOT");
        return exact.Substring(prefix.Length).Replace('\\', '/');
    }

    private static void ProtectedWrite(string repositoryRoot, string path, byte[] bytes, bool append)
    {
        string[] segments = ValidateSegments(RepositoryRelative(repositoryRoot, path));
        using (HeldChain chain = HoldExistingAncestors(repositoryRoot, segments, Math.Max(0, segments.Length - 1)))
        using (SafeFileHandle file = OpenHandle(
            path,
            GENERIC_WRITE | FILE_READ_ATTRIBUTES | SYNCHRONIZE | (append ? FILE_APPEND_DATA : 0),
            FILE_SHARE_READ,
            append ? OPEN_ALWAYS : CREATE_NEW,
            false,
            true))
        {
            Inspect(file, path, false);
            using (FileStream stream = new FileStream(new SafeFileHandle(file.DangerousGetHandle(), false), FileAccess.Write, 4096, false))
            {
                if (append) stream.Seek(0, SeekOrigin.End);
                stream.Write(bytes, 0, bytes.Length);
                stream.Flush(true);
            }
        }
    }

    private static byte[] ProtectedRead(string repositoryRoot, string path, int maximumBytes)
    {
        string[] segments = ValidateSegments(RepositoryRelative(repositoryRoot, path));
        using (HeldChain chain = HoldExistingAncestors(repositoryRoot, segments, Math.Max(0, segments.Length - 1)))
        using (SafeFileHandle file = OpenHandle(path, GENERIC_READ | FILE_READ_ATTRIBUTES | SYNCHRONIZE, FILE_SHARE_READ, OPEN_EXISTING, false, false))
        {
            Inspect(file, path, false);
            return ReadAllBounded(file, maximumBytes);
        }
    }

    private static string ExactPathDigest(string path)
    {
        return Sha256Hex(Encoding.UTF8.GetBytes(Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar).ToLowerInvariant()));
    }

    private static SafeFileHandle PinExactFile(string path, string expectedDigest, long maximumBytes)
    {
        SafeFileHandle handle = OpenHandle(path, GENERIC_READ | FILE_READ_ATTRIBUTES | SYNCHRONIZE, FILE_SHARE_READ, OPEN_EXISTING, false, false);
        try
        {
            Inspect(handle, path, false);
            if (Sha256Hex(ReadAllBounded(handle, maximumBytes)) != expectedDigest) throw new InvalidDataException("PINNED_FILE_DIGEST");
            return handle;
        }
        catch { handle.Dispose(); throw; }
    }

    private static SafeFileHandle PinExactDirectory(string path, string expectedPathDigest)
    {
        if (ExactPathDigest(path) != expectedPathDigest) throw new InvalidDataException("PINNED_DIRECTORY_DIGEST");
        SafeFileHandle handle = OpenHandle(path, FILE_LIST_DIRECTORY | FILE_READ_ATTRIBUTES | SYNCHRONIZE, FILE_SHARE_READ | FILE_SHARE_WRITE, OPEN_EXISTING, true, false);
        try { Inspect(handle, path, true); return handle; }
        catch { handle.Dispose(); throw; }
    }

    private static void WriteRetained(SafeFileHandle handle, byte[] bytes, bool append)
    {
        using (FileStream stream = new FileStream(new SafeFileHandle(handle.DangerousGetHandle(), false), FileAccess.Write, 4096, false))
        {
            if (append) stream.Seek(0, SeekOrigin.End);
            else { stream.Seek(0, SeekOrigin.Begin); stream.SetLength(0); }
            stream.Write(bytes, 0, bytes.Length);
            stream.Flush(true);
        }
    }

    private static void WriteAnonymousPipeFrame(SafeFileHandle handle, byte[] bytes)
    {
        if (bytes == null || bytes.Length == 0 || bytes.Length > 4096) throw new InvalidDataException("NVDA_PIPE_FRAME_BOUND");
        using (FileStream stream = new FileStream(new SafeFileHandle(handle.DangerousGetHandle(), false), FileAccess.Write, 4096, false))
        {
            byte[] length = BitConverter.GetBytes(bytes.Length);
            stream.Write(length, 0, length.Length);
            stream.Write(bytes, 0, bytes.Length);
            stream.Flush();
        }
    }

    private static byte[] ReadAnonymousPipeFrame(SafeFileHandle handle, int maximum)
    {
        using (FileStream stream = new FileStream(new SafeFileHandle(handle.DangerousGetHandle(), false), FileAccess.Read, 4096, false))
        {
            byte[] lengthBytes = new byte[4];
            int offset = 0;
            while (offset < 4)
            {
                int count = stream.Read(lengthBytes, offset, 4 - offset);
                if (count == 0) throw new EndOfStreamException("NVDA_PIPE_LENGTH_TRUNCATED");
                offset += count;
            }
            int length = BitConverter.ToInt32(lengthBytes, 0);
            if (length <= 0 || length > maximum) throw new InvalidDataException("NVDA_PIPE_FRAME_BOUND");
            byte[] bytes = new byte[length];
            offset = 0;
            while (offset < length)
            {
                int count = stream.Read(bytes, offset, length - offset);
                if (count == 0) throw new EndOfStreamException("NVDA_PIPE_FRAME_TRUNCATED");
                offset += count;
            }
            return bytes;
        }
    }

    private static void ProveUnassignedProcessTerminated(IntPtr process)
    {
        uint wait = WaitForSingleObject(process, 10000);
        if (wait == WAIT_TIMEOUT) throw new TimeoutException("UNASSIGNED_PROCESS_TERMINATION_TIMEOUT");
        if (wait != WAIT_OBJECT_0) throw new Win32Exception(Marshal.GetLastWin32Error(), "UNASSIGNED_PROCESS_WAIT_FAILED");
        uint exitCode;
        Win32(GetExitCodeProcess(process, out exitCode), "UNASSIGNED_PROCESS_EXIT_QUERY_FAILED");
        if (exitCode == STILL_ACTIVE) throw new InvalidOperationException("UNASSIGNED_PROCESS_REMAINS_ACTIVE");
    }

    public static string ValidateUnassignedTerminationProofForTest(bool terminateSucceeded, int terminateError, uint waitResult, bool exitQuerySucceeded, uint exitCode)
    {
        try
        {
            if (!terminateSucceeded && terminateError != 5) throw new Win32Exception(terminateError, "UNASSIGNED_PROCESS_TERMINATE_FAILED");
            if (waitResult == WAIT_TIMEOUT) throw new TimeoutException("UNASSIGNED_PROCESS_TERMINATION_TIMEOUT");
            if (waitResult != WAIT_OBJECT_0) throw new Win32Exception(6, "UNASSIGNED_PROCESS_WAIT_FAILED");
            if (!exitQuerySucceeded) throw new Win32Exception(6, "UNASSIGNED_PROCESS_EXIT_QUERY_FAILED");
            if (exitCode == STILL_ACTIVE) throw new InvalidOperationException("UNASSIGNED_PROCESS_REMAINS_ACTIVE");
            return "PASS";
        }
        catch (Exception error) { return error.GetType().Name + ":" + error.Message; }
    }

    public static string RunJobFixtureForTest(string executable, string currentDirectory)
    {
        executable = Path.GetFullPath(executable);
        currentDirectory = Path.GetFullPath(currentDirectory);
        using (SafeFileHandle executablePin = OpenHandle(executable, GENERIC_READ | FILE_READ_ATTRIBUTES | SYNCHRONIZE, FILE_SHARE_READ, OPEN_EXISTING, false, false))
        using (SafeFileHandle directoryPin = PinExactDirectory(currentDirectory, ExactPathDigest(currentDirectory)))
        {
            Inspect(executablePin, executable, false);
            if (ReadAllBounded(executablePin, 536870912).Length == 0) throw new InvalidDataException("JOB_FIXTURE_EXECUTABLE_EMPTY");
            IntPtr job = IntPtr.Zero;
            PROCESS_INFORMATION process = new PROCESS_INFORMATION();
            try
            {
                job = CreateJobObjectW(IntPtr.Zero, null);
                if (job == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateJobObjectW(fixture)");
                JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
                limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
                IntPtr limitsPointer = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION)));
                try
                {
                    Marshal.StructureToPtr(limits, limitsPointer, false);
                    Win32(SetInformationJobObject(job, JobObjectExtendedLimitInformation, limitsPointer, (uint)Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION))), "SetInformationJobObject(fixture)");
                }
                finally { Marshal.FreeHGlobal(limitsPointer); }
                STARTUPINFO startup = new STARTUPINFO();
                startup.cb = Marshal.SizeOf(typeof(STARTUPINFO));
                StringBuilder command = new StringBuilder(QuoteArgument(executable) + " /d /c exit 0");
                Win32(CreateProcessW(executable, command, IntPtr.Zero, IntPtr.Zero, false,
                    CREATE_SUSPENDED | CREATE_NO_WINDOW, IntPtr.Zero, currentDirectory, ref startup, out process),
                    "CreateProcessW(fixture suspended)");
                if (!AssignProcessToJobObject(job, process.hProcess))
                {
                    int assignmentError = Marshal.GetLastWin32Error();
                    bool terminated = TerminateProcess(process.hProcess, 0xDEAD);
                    if (!terminated && Marshal.GetLastWin32Error() != 5) throw new Win32Exception(Marshal.GetLastWin32Error(), "TerminateProcess(fixture)");
                    ProveUnassignedProcessTerminated(process.hProcess);
                    throw new Win32Exception(assignmentError, "AssignProcessToJobObject(fixture)");
                }
                if (ResumeThread(process.hThread) == UInt32.MaxValue) throw new Win32Exception(Marshal.GetLastWin32Error(), "ResumeThread(fixture)");
                if (WaitForSingleObject(process.hProcess, 10000) != WAIT_OBJECT_0) throw new TimeoutException("JOB_FIXTURE_WAIT");
                uint exitCode;
                Win32(GetExitCodeProcess(process.hProcess, out exitCode), "GetExitCodeProcess(fixture)");
                if (exitCode != 0) throw new InvalidDataException("JOB_FIXTURE_EXIT");
                Inspect(executablePin, executable, false);
                Inspect(directoryPin, currentDirectory, true);
                return "PASS";
            }
            finally
            {
                if (process.hThread != IntPtr.Zero) CloseHandle(process.hThread);
                if (process.hProcess != IntPtr.Zero) CloseHandle(process.hProcess);
                if (job != IntPtr.Zero) CloseHandle(job);
            }
        }
    }


    public static string RunExactNvdaHandleConsumerFixtureForTest(string python, string script, string root)
    {
        python = Path.GetFullPath(python);
        script = Path.GetFullPath(script);
        root = Path.GetFullPath(root);
        string config = Path.Combine(root, "config");
        if (!Directory.Exists(config)) Directory.CreateDirectory(config);
        string protocol = Path.Combine(root, "protocol.sha256");
        string transcript = Path.Combine(root, "transcript.jsonl");
        string diagnostic = Path.Combine(root, "diagnostic.log");
        string protocolDigest = Sha256Hex(Encoding.UTF8.GetBytes("fixture-protocol"));
        TestWriteFile(protocol, Encoding.ASCII.GetBytes(protocolDigest + "\n"), false);
        List<SafeFileHandle> pins = new List<SafeFileHandle>();
        SafeFileHandle controlRead = null, controlWrite = null, readyRead = null, readyWrite = null;
        IntPtr job = IntPtr.Zero, attributeList = IntPtr.Zero, inheritedList = IntPtr.Zero;
        PROCESS_INFORMATION process = new PROCESS_INFORMATION();
        try
        {
            pins.Add(PinExactFile(python, Sha256Hex(File.ReadAllBytes(python)), 268435456));
            pins.Add(PinExactFile(script, Sha256Hex(File.ReadAllBytes(script)), 1048576));
            pins.Add(PinExactFile(protocol, Sha256Hex(File.ReadAllBytes(protocol)), 4096));
            pins.Add(PinExactDirectory(root, ExactPathDigest(root)));
            pins.Add(PinExactDirectory(config, ExactPathDigest(config)));
            pins.Add(PinExactDirectory(root, ExactPathDigest(root)));
            pins.Add(OpenHandle(transcript, GENERIC_READ | GENERIC_WRITE | FILE_APPEND_DATA | FILE_READ_ATTRIBUTES | DELETE | SYNCHRONIZE, FILE_SHARE_READ, CREATE_NEW, false, true));
            pins.Add(OpenHandle(diagnostic, GENERIC_READ | GENERIC_WRITE | FILE_APPEND_DATA | FILE_READ_ATTRIBUTES | DELETE | SYNCHRONIZE, FILE_SHARE_READ, CREATE_NEW, false, true));
            SECURITY_ATTRIBUTES sa = new SECURITY_ATTRIBUTES { nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES)), bInheritHandle = true };
            Win32(CreatePipe(out controlRead, out controlWrite, ref sa, 4096), "CreatePipe(EXACT_NVDA_CONTROL)");
            Win32(CreatePipe(out readyRead, out readyWrite, ref sa, 4096), "CreatePipe(EXACT_NVDA_READY)");
            Win32(SetHandleInformation(controlWrite.DangerousGetHandle(), HANDLE_FLAG_INHERIT, 0), "SetHandleInformation(EXACT_CONTROL_PARENT)");
            Win32(SetHandleInformation(readyRead.DangerousGetHandle(), HANDLE_FLAG_INHERIT, 0), "SetHandleInformation(EXACT_READY_PARENT)");
            foreach (SafeFileHandle pin in pins) Win32(SetHandleInformation(pin.DangerousGetHandle(), HANDLE_FLAG_INHERIT, HANDLE_FLAG_INHERIT), "SetHandleInformation(EXACT_NVDA_PIN)");
            List<IntPtr> inherited = new List<IntPtr> {
                pins[0].DangerousGetHandle(), pins[1].DangerousGetHandle(), pins[2].DangerousGetHandle(),
                controlRead.DangerousGetHandle(), readyWrite.DangerousGetHandle(),
                pins[6].DangerousGetHandle(), pins[7].DangerousGetHandle(),
                pins[3].DangerousGetHandle(), pins[4].DangerousGetHandle(), pins[5].DangerousGetHandle()
            };
            if (inherited.Count != 10) throw new InvalidDataException("EXACT_NVDA_HANDLE_COUNT");
            IntPtr attributeBytes = IntPtr.Zero;
            InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref attributeBytes);
            attributeList = Marshal.AllocHGlobal(attributeBytes);
            Win32(InitializeProcThreadAttributeList(attributeList, 1, 0, ref attributeBytes), "InitializeProcThreadAttributeList(EXACT_NVDA)");
            inheritedList = Marshal.AllocHGlobal(IntPtr.Size * inherited.Count);
            for (int index = 0; index < inherited.Count; index++) Marshal.WriteIntPtr(inheritedList, index * IntPtr.Size, inherited[index]);
            Win32(UpdateProcThreadAttribute(attributeList, 0, PROC_THREAD_ATTRIBUTE_HANDLE_LIST, inheritedList,
                new IntPtr(IntPtr.Size * inherited.Count), IntPtr.Zero, IntPtr.Zero), "UpdateProcThreadAttribute(EXACT_NVDA)");
            job = CreateJobObjectW(IntPtr.Zero, null);
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            IntPtr limitBytes = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION)));
            try { Marshal.StructureToPtr(limits, limitBytes, false); Win32(SetInformationJobObject(job, JobObjectExtendedLimitInformation, limitBytes, (uint)Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION))), "SetInformationJobObject(EXACT_NVDA)"); }
            finally { Marshal.FreeHGlobal(limitBytes); }
            STARTUPINFOEX startup = new STARTUPINFOEX(); startup.StartupInfo.cb = Marshal.SizeOf(typeof(STARTUPINFOEX)); startup.lpAttributeList = attributeList;
            string[] launch = new[] { python, script }.Concat(inherited.Select(handle => handle.ToInt64().ToString(CultureInfo.InvariantCulture))).ToArray();
            StringBuilder command = new StringBuilder(String.Join(" ", launch.Select(QuoteArgument)));
            Win32(CreateProcessExtendedW(python, command, IntPtr.Zero, IntPtr.Zero, true,
                CREATE_SUSPENDED | CREATE_NO_WINDOW | EXTENDED_STARTUPINFO_PRESENT, IntPtr.Zero, root, ref startup, out process), "CreateProcessW(EXACT_NVDA)");
            controlRead.Dispose(); controlRead = null;
            readyWrite.Dispose(); readyWrite = null;
            BrokerLastInjectedConsumerPid = process.dwProcessId;
            Win32(AssignProcessToJobObject(job, process.hProcess), "AssignProcessToJobObject(EXACT_NVDA)");
            bool forgeryDenied = false;
            try { using (FileStream forged = new FileStream(transcript, FileMode.Open, FileAccess.Write, FileShare.ReadWrite)) { } }
            catch (IOException) { forgeryDenied = true; }
            if (!forgeryDenied) throw new InvalidDataException("EXACT_NVDA_EXTERNAL_WRITE_FORGERY_ALLOWED");
            if (ResumeThread(process.hThread) == UInt32.MaxValue) throw new Win32Exception(Marshal.GetLastWin32Error(), "ResumeThread(EXACT_NVDA)");
            string pluginDigest = Sha256Hex(File.ReadAllBytes(script));
            string observation = new string('a', 64);
            string brokerCreationIdentity = Process.GetCurrentProcess().StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture);
            string consumerCreationIdentity = Process.GetProcessById((int)process.dwProcessId).StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture);
            string control = "{\"schema\":\"fluyo:r4b:nvda-control:v1\",\"attemptId\":\"attempt-002-observer\",\"observationId\":\"" + observation +
                "\",\"generation\":\"1\",\"phase\":\"OBSERVE\",\"expectedSpeechContract\":{\"stateId\":\"ACTIVE\",\"localeId\":\"en\",\"fixtureId\":\"missing_optional_explanation\",\"variantId\":null,\"orderedTargets\":[{\"targetId\":\"heading\",\"accessibleNameAlternatives\":[\"Choose your answer\"],\"requiredStateContentAlternatives\":[\"heading\"]},{\"targetId\":\"progress\",\"accessibleNameAlternatives\":[\"Activity progress\"],\"requiredStateContentAlternatives\":[\"Activity incomplete\"]},{\"targetId\":\"back-link\",\"accessibleNameAlternatives\":[\"Back to dashboard\"],\"requiredStateContentAlternatives\":[\"link\"]},{\"targetId\":\"choice-1\",\"accessibleNameAlternatives\":[\"Está cerca del parque.\"],\"requiredStateContentAlternatives\":[\"not checked radio button\"]},{\"targetId\":\"choice-2\",\"accessibleNameAlternatives\":[\"Gracias por la comida.\"],\"requiredStateContentAlternatives\":[\"not checked radio button\"]},{\"targetId\":\"choice-3\",\"accessibleNameAlternatives\":[\"Está cerca del parque, después del puente y frente a la biblioteca del barrio.\"],\"requiredStateContentAlternatives\":[\"not checked radio button\"]},{\"targetId\":\"primary-action\",\"accessibleNameAlternatives\":[\"Check answer\"],\"requiredStateContentAlternatives\":[\"button unavailable\"]}],\"legalTerminalKinds\":[\"SPEAK\",\"CANCEL\"]},\"controllerPid\":" + BrokerControllerPid.ToString(CultureInfo.InvariantCulture) + ",\"controllerCreationIdentity\":\"" + BrokerControllerCreationIdentity +
                "\",\"brokerPid\":" + Process.GetCurrentProcess().Id.ToString(CultureInfo.InvariantCulture) + ",\"brokerCreationIdentity\":\"" + brokerCreationIdentity +
                "\",\"expectedNvdaPid\":" + process.dwProcessId.ToString(CultureInfo.InvariantCulture) + ",\"nvdaCreationIdentity\":\"" + consumerCreationIdentity +
                "\",\"capabilities\":\"CONTROL_READ|READY_WRITE|TRANSCRIPT_WRITE|DIAGNOSTIC_WRITE|OWNED_JOB_STOP\",\"pluginSha256\":\"" + pluginDigest +
                "\",\"protocolSha256\":\"" + protocolDigest + "\",\"createdMonotonicMilliseconds\":\"0\",\"expiresMonotonicMilliseconds\":\"999999999999\"}";
            WriteAnonymousPipeFrame(controlWrite, Encoding.UTF8.GetBytes(control));
            string ready = Encoding.UTF8.GetString(ReadAnonymousPipeFrame(readyRead, 4096));
            string controlDigest = Sha256Hex(Encoding.UTF8.GetBytes(control));
            if (ready.IndexOf("\"observationId\":\"" + observation + "\"", StringComparison.Ordinal) < 0 ||
                ready.IndexOf("\"generation\":\"1\"", StringComparison.Ordinal) < 0 ||
                ready.IndexOf("\"phase\":\"OBSERVE\"", StringComparison.Ordinal) < 0 ||
                ready.IndexOf("\"status\":\"CONTROL_LATCHED\"", StringComparison.Ordinal) < 0 ||
                ready.IndexOf("\"controllerCreationIdentity\":\"" + BrokerControllerCreationIdentity + "\"", StringComparison.Ordinal) < 0 ||
                ready.IndexOf("\"brokerCreationIdentity\":\"" + brokerCreationIdentity + "\"", StringComparison.Ordinal) < 0 ||
                ready.IndexOf("\"nvdaPid\":" + process.dwProcessId.ToString(CultureInfo.InvariantCulture), StringComparison.Ordinal) < 0 ||
                ready.IndexOf("\"nvdaCreationIdentity\":\"" + consumerCreationIdentity + "\"", StringComparison.Ordinal) < 0 ||
                ready.IndexOf("\"capabilities\":\"CONTROL_READ|READY_WRITE|TRANSCRIPT_WRITE|DIAGNOSTIC_WRITE|OWNED_JOB_STOP\"", StringComparison.Ordinal) < 0 ||
                ready.IndexOf("\"controlSha256\":\"" + controlDigest + "\"", StringComparison.Ordinal) < 0)
                throw new InvalidDataException("EXACT_NVDA_READY_ECHO");
            if (WaitForSingleObject(process.hProcess, 10000) != WAIT_OBJECT_0) throw new TimeoutException("EXACT_NVDA_WAIT");
            uint exitCode; Win32(GetExitCodeProcess(process.hProcess, out exitCode), "GetExitCodeProcess(EXACT_NVDA)");
            if (exitCode != 0 || ReadAllBounded(pins[6], 4096).Length != 65 || ReadAllBounded(pins[7], 4096).Length != 65)
                throw new InvalidDataException("EXACT_NVDA_CONSUMER_OUTPUT");
            MarkDelete(pins[6]); MarkDelete(pins[7]);
            return "PASS";
        }
        finally
        {
            if (process.hThread != IntPtr.Zero) CloseHandle(process.hThread);
            if (process.hProcess != IntPtr.Zero) CloseHandle(process.hProcess);
            if (job != IntPtr.Zero) CloseHandle(job);
            if (attributeList != IntPtr.Zero) { DeleteProcThreadAttributeList(attributeList); Marshal.FreeHGlobal(attributeList); }
            if (inheritedList != IntPtr.Zero) Marshal.FreeHGlobal(inheritedList);
            if (controlRead != null) controlRead.Dispose(); if (controlWrite != null) controlWrite.Dispose();
            if (readyRead != null) readyRead.Dispose(); if (readyWrite != null) readyWrite.Dispose();
            foreach (SafeFileHandle pin in pins) pin.Dispose();
        }
    }

    private static string[] ParseJsonStringArray(string json)
    {
        if (json == null || json.Length < 2 || json.Length > 131072 || json[0] != '[' || json[json.Length - 1] != ']')
            throw new InvalidDataException("ARGUMENTS_JSON_SHAPE");
        List<string> values = new List<string>();
        int index = 1;
        while (index < json.Length - 1)
        {
            while (index < json.Length - 1 && Char.IsWhiteSpace(json[index])) index++;
            if (index < json.Length - 1 && json[index] == ',') { index++; continue; }
            if (index >= json.Length - 1 || json[index] != '"') throw new InvalidDataException("ARGUMENTS_JSON_STRING");
            index++;
            StringBuilder value = new StringBuilder();
            bool closed = false;
            while (index < json.Length - 1)
            {
                char character = json[index++];
                if (character == '"') { closed = true; break; }
                if (character != '\\') { if (character < 0x20) throw new InvalidDataException("ARGUMENTS_JSON_CONTROL"); value.Append(character); continue; }
                if (index >= json.Length - 1) throw new InvalidDataException("ARGUMENTS_JSON_ESCAPE");
                char escaped = json[index++];
                if (escaped == '"' || escaped == '\\' || escaped == '/') value.Append(escaped);
                else if (escaped == 'b') value.Append('\b');
                else if (escaped == 'f') value.Append('\f');
                else if (escaped == 'n') value.Append('\n');
                else if (escaped == 'r') value.Append('\r');
                else if (escaped == 't') value.Append('\t');
                else if (escaped == 'u')
                {
                    if (index + 4 > json.Length - 1) throw new InvalidDataException("ARGUMENTS_JSON_UNICODE");
                    int code;
                    if (!Int32.TryParse(json.Substring(index, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out code)) throw new InvalidDataException("ARGUMENTS_JSON_UNICODE");
                    value.Append((char)code);
                    index += 4;
                }
                else throw new InvalidDataException("ARGUMENTS_JSON_ESCAPE");
            }
            if (!closed) throw new InvalidDataException("ARGUMENTS_JSON_STRING");
            values.Add(value.ToString());
            while (index < json.Length - 1 && Char.IsWhiteSpace(json[index])) index++;
            if (index < json.Length - 1 && json[index] != ',') throw new InvalidDataException("ARGUMENTS_JSON_SEPARATOR");
        }
        return values.ToArray();
    }

    private static string BrokerJobToken(string[] arguments)
    {
        return Sha256Hex(Encoding.UTF8.GetBytes(BrokerSessionNonce + "\0JOB\0" + String.Join("\0", arguments)));
    }

    private static string PinnedIdentity(SafeFileHandle handle, string path, bool directory)
    {
        HandleIdentity identity = Inspect(handle, path, directory);
        return identity.Volume.ToString(CultureInfo.InvariantCulture) + ":" + identity.FileId;
    }

    private static Dictionary<string, string> CreateBrokerJob(string[] arguments, string environmentDigest, string argvDigest)
    {
        if (BrokerJob != null) throw new InvalidDataException("JOB_ALREADY_ACTIVE");
        if (arguments == null || arguments.Length != 23) throw new InvalidDataException("JOB_ARGUMENT_COUNT");
        string node = Path.GetFullPath(arguments[0]);
        string nextCli = Path.GetFullPath(arguments[1]);
        string cwd = Path.GetFullPath(arguments[2]);
        string argvSha = arguments[5];
        string[] entries = arguments.Skip(6).Take(6).ToArray();
        string environmentSha = arguments[12];
        string expectedNodeDigest = arguments[13];
        string expectedNextDigest = arguments[14];
        string powershell = Path.GetFullPath(arguments[15]);
        string expectedPowerShellDigest = arguments[16];
        string client = Path.GetFullPath(arguments[17]);
        string expectedClientDigest = arguments[18];
        string expectedCwdDigest = arguments[19];
        string expectedOutputPathDigest = arguments[20];
        string expectedTempDigest = arguments[21];
        string infrastructurePlanDigest = arguments[22];
        if (infrastructurePlanDigest.Length != 64 || infrastructurePlanDigest.Any(value => !Uri.IsHexDigit(value)))
            throw new InvalidDataException("JOB_INFRASTRUCTURE_PLAN_DIGEST");
        if (argvSha != argvDigest || environmentSha != environmentDigest) throw new InvalidDataException("JOB_FRAME_DIGEST");
        string outputPath = Path.Combine(cwd, ".next-attempt-002");
        if (ExactPathDigest(outputPath) != expectedOutputPathDigest) throw new InvalidDataException("JOB_OUTPUT_PATH_DIGEST");
        byte[] environmentBytes = ExactEnvironmentBlock(entries, environmentSha);
        BrokerJobState state = new BrokerJobState();
        IntPtr environment = IntPtr.Zero;
        PROCESS_INFORMATION process = new PROCESS_INFORMATION();
        try
        {
            state.Token = BrokerJobToken(arguments);
            state.ArgvDigest = argvSha;
            state.EnvironmentDigest = environmentSha;
            state.OutputPath = outputPath;
            state.OutputPathDigest = expectedOutputPathDigest;
            state.InfrastructurePlanDigest = infrastructurePlanDigest;
            state.Pins.Add(PinExactFile(node, expectedNodeDigest, 536870912));
            state.Pins.Add(PinExactFile(nextCli, expectedNextDigest, 67108864));
            state.Pins.Add(PinExactFile(powershell, expectedPowerShellDigest, 536870912));
            state.Pins.Add(PinExactFile(client, expectedClientDigest, 1048576));
            state.Pins.Add(PinExactDirectory(cwd, expectedCwdDigest));
            string tempPath = entries.Single(value => value.StartsWith("TEMP=", StringComparison.Ordinal)).Substring(5);
            state.Pins.Add(PinExactDirectory(tempPath, expectedTempDigest));
            string infrastructurePlanPath = Path.Combine(BrokerRepositoryRoot, "docs", "2026-11-02_r4b2_attempt002_infrastructure_plan_v1.md");
            state.Pins.Add(PinExactFile(infrastructurePlanPath, infrastructurePlanDigest, 1048576));
            state.NodeIdentity = PinnedIdentity(state.Pins[0], node, false);
            state.NextIdentity = PinnedIdentity(state.Pins[1], nextCli, false);
            state.PowerShellIdentity = PinnedIdentity(state.Pins[2], powershell, false);
            state.ClientIdentity = PinnedIdentity(state.Pins[3], client, false);
            state.CwdIdentity = PinnedIdentity(state.Pins[4], cwd, true);
            state.TempIdentity = PinnedIdentity(state.Pins[5], tempPath, true);
            string authorityCanonical = "BUILD_OUTPUT_ROOT\n" + state.OutputPathDigest + "\n" + state.CwdIdentity + "\n" +
                state.InfrastructurePlanDigest + "\n.next-attempt-002";
            state.OutputAuthorityDigest = Sha256Hex(Encoding.UTF8.GetBytes(authorityCanonical));
            state.Job = CreateJobObjectW(IntPtr.Zero, null);
            if (state.Job == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateJobObjectW(BROKER_JOB)");
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            IntPtr limitsPointer = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION)));
            try
            {
                Marshal.StructureToPtr(limits, limitsPointer, false);
                Win32(SetInformationJobObject(state.Job, JobObjectExtendedLimitInformation, limitsPointer,
                    (uint)Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION))), "SetInformationJobObject(BROKER_JOB)");
            }
            finally { Marshal.FreeHGlobal(limitsPointer); }
            environment = Marshal.AllocHGlobal(environmentBytes.Length);
            Marshal.Copy(environmentBytes, 0, environment, environmentBytes.Length);
            STARTUPINFO startup = new STARTUPINFO();
            startup.cb = Marshal.SizeOf(typeof(STARTUPINFO));
            StringBuilder command = new StringBuilder(QuoteArgument(node) + " " + QuoteArgument(nextCli) + " build");
            Win32(CreateProcessW(node, command, IntPtr.Zero, IntPtr.Zero, false,
                CREATE_SUSPENDED | CREATE_NO_WINDOW | CREATE_UNICODE_ENVIRONMENT, environment, cwd,
                ref startup, out process), "CreateProcessW(BROKER_JOB_SUSPENDED)");
            if (!AssignProcessToJobObject(state.Job, process.hProcess))
            {
                int assignmentError = Marshal.GetLastWin32Error();
                bool terminated = TerminateProcess(process.hProcess, 0xDEAD);
                int terminateError = terminated ? 0 : Marshal.GetLastWin32Error();
                if (!terminated && terminateError != 5) throw new Win32Exception(terminateError, "BROKER_JOB_UNASSIGNED_TERMINATE");
                ProveUnassignedProcessTerminated(process.hProcess);
                throw new Win32Exception(assignmentError, "AssignProcessToJobObject(BROKER_JOB)");
            }
            state.Process = process.hProcess;
            state.Thread = process.hThread;
            state.Pid = process.dwProcessId;
            process.hProcess = IntPtr.Zero;
            process.hThread = IntPtr.Zero;
            BrokerJob = state;
            Dictionary<string, string> assigned = new Dictionary<string, string> {
                { "jobToken", state.Token },
                { "brokerPid", Process.GetCurrentProcess().Id.ToString(CultureInfo.InvariantCulture) },
                { "builderPid", state.Pid.ToString(CultureInfo.InvariantCulture) },
                { "canonicalArgvSha256", state.ArgvDigest },
                { "environmentSha256", state.EnvironmentDigest },
                { "outputAuthoritySha256", state.OutputAuthorityDigest },
                { "outputPathSha256", state.OutputPathDigest },
                { "outputAuthorityRootId", "BUILD_OUTPUT_ROOT" },
                { "retainedOutputParentIdentity", state.CwdIdentity },
                { "infrastructurePlanDigest", state.InfrastructurePlanDigest },
                { "distDir", ".next-attempt-002" },
                { "nodeIdentity", state.NodeIdentity },
                { "nextIdentity", state.NextIdentity },
                { "powerShellIdentity", state.PowerShellIdentity },
                { "clientIdentity", state.ClientIdentity },
                { "cwdIdentity", state.CwdIdentity },
                { "tempIdentity", state.TempIdentity },
                { "limitFlags", "JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE" },
                { "jobState", "ASSIGNED_SUSPENDED" }
            };
            string assignmentCanonical = String.Join("\n", assigned.OrderBy(value => value.Key, StringComparer.Ordinal)
                .Select(value => value.Key + "=" + value.Value));
            state.AssignmentReceiptDigest = Sha256Hex(Encoding.UTF8.GetBytes(assignmentCanonical));
            assigned["assignmentReceiptSha256"] = state.AssignmentReceiptDigest;
            assigned["assignmentReceiptBase64"] = Convert.ToBase64String(Encoding.UTF8.GetBytes(assignmentCanonical));
            return assigned;
        }
        catch { state.Dispose(); throw; }
        finally
        {
            if (environment != IntPtr.Zero) Marshal.FreeHGlobal(environment);
            if (process.hThread != IntPtr.Zero) CloseHandle(process.hThread);
            if (process.hProcess != IntPtr.Zero) CloseHandle(process.hProcess);
        }
    }

    private static BrokerJobState RequireBrokerJob(string token)
    {
        if (BrokerJob == null || token != BrokerJob.Token) throw new InvalidDataException("JOB_TOKEN");
        return BrokerJob;
    }

    private static Dictionary<string, string> ResumeBrokerJob(string token)
    {
        BrokerJobState state = RequireBrokerJob(token);
        if (state.Resumed) throw new InvalidDataException("JOB_ALREADY_RESUMED");
        if (ResumeThread(state.Thread) == UInt32.MaxValue) throw new Win32Exception(Marshal.GetLastWin32Error(), "ResumeThread(BROKER_JOB)");
        CloseHandle(state.Thread);
        state.Thread = IntPtr.Zero;
        state.Resumed = true;
        return BrokerJobStatus(state);
    }

    private static Dictionary<string, string> BrokerJobStatus(BrokerJobState state)
    {
        uint wait = WaitForSingleObject(state.Process, 0);
        uint exitCode;
        Win32(GetExitCodeProcess(state.Process, out exitCode), "GetExitCodeProcess(BROKER_JOB)");
        bool closed = wait == WAIT_OBJECT_0;
        if (wait != WAIT_OBJECT_0 && wait != WAIT_TIMEOUT) throw new Win32Exception(Marshal.GetLastWin32Error(), "WaitForSingleObject(BROKER_JOB)");
        Dictionary<string, string> result = new Dictionary<string, string> {
            { "jobToken", state.Token },
            { "brokerPid", Process.GetCurrentProcess().Id.ToString(CultureInfo.InvariantCulture) },
            { "builderPid", state.Pid.ToString(CultureInfo.InvariantCulture) },
            { "jobState", closed ? "CLOSED" : (state.Resumed ? "RUNNING" : "ASSIGNED_SUSPENDED") },
            { "exitCode", closed ? exitCode.ToString(CultureInfo.InvariantCulture) : "" },
            { "canonicalArgvSha256", state.ArgvDigest },
            { "environmentSha256", state.EnvironmentDigest },
            { "outputAuthoritySha256", state.OutputAuthorityDigest },
            { "outputPathSha256", state.OutputPathDigest },
            { "outputAuthorityRootId", "BUILD_OUTPUT_ROOT" },
            { "retainedOutputParentIdentity", state.CwdIdentity },
            { "infrastructurePlanDigest", state.InfrastructurePlanDigest },
            { "assignmentReceiptSha256", state.AssignmentReceiptDigest },
            { "distDir", ".next-attempt-002" },
            { "nodeIdentity", state.NodeIdentity },
            { "nextIdentity", state.NextIdentity },
            { "powerShellIdentity", state.PowerShellIdentity },
            { "clientIdentity", state.ClientIdentity },
            { "cwdIdentity", state.CwdIdentity },
            { "tempIdentity", state.TempIdentity },
            { "closedReceiptSha256", "" },
            { "closedReceiptBase64", "" }
        };
        if (closed)
        {
            SortedDictionary<string, string> receipt = new SortedDictionary<string, string>(StringComparer.Ordinal) {
                { "schema", "fluyo:r4b:attempt-002-builder-job-closed:v1" }, { "event", "JOB_CLOSED" },
                { "status", exitCode == 0 ? "PASS" : "FAIL" }, { "exitCode", exitCode.ToString(CultureInfo.InvariantCulture) },
                { "assignmentReceiptSha256", state.AssignmentReceiptDigest }, { "outputAuthoritySha256", state.OutputAuthorityDigest },
                { "infrastructurePlanDigest", state.InfrastructurePlanDigest }, { "outputAuthorityRootId", "BUILD_OUTPUT_ROOT" },
                { "retainedOutputParentIdentity", state.CwdIdentity }, { "distDir", ".next-attempt-002" },
                { "nodeIdentity", state.NodeIdentity }, { "nextIdentity", state.NextIdentity },
                { "powerShellIdentity", state.PowerShellIdentity }, { "clientIdentity", state.ClientIdentity },
                { "cwdIdentity", state.CwdIdentity }, { "tempIdentity", state.TempIdentity }
            };
            string canonical = String.Join("\n", receipt.Select(value => value.Key + "=" + value.Value));
            state.ClosedReceiptDigest = Sha256Hex(Encoding.UTF8.GetBytes(canonical));
            state.ClosedReceiptBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(canonical));
            result["closedReceiptSha256"] = state.ClosedReceiptDigest;
            result["closedReceiptBase64"] = state.ClosedReceiptBase64;
        }
        return result;
    }

    private static Dictionary<string, string> TerminateBrokerJob(string token)
    {
        BrokerJobState state = RequireBrokerJob(token);
        uint exitCode;
        Win32(GetExitCodeProcess(state.Process, out exitCode), "GetExitCodeProcess(BROKER_JOB_TERMINATE)");
        if (exitCode == STILL_ACTIVE)
        {
            bool terminated = TerminateProcess(state.Process, 0xDEAD);
            if (!terminated && Marshal.GetLastWin32Error() != 5) throw new Win32Exception(Marshal.GetLastWin32Error(), "TerminateProcess(BROKER_JOB)");
            ProveUnassignedProcessTerminated(state.Process);
        }
        Dictionary<string, string> result = BrokerJobStatus(state);
        result["jobState"] = "TERMINATED_CLOSED";
        return result;
    }

    private static string BrokerNvdaToken(string[] arguments)
    {
        return Sha256Hex(Encoding.UTF8.GetBytes(BrokerSessionNonce + "\0NVDA\0" + String.Join("\0", arguments)));
    }

    private static byte[] NvdaEnvironmentBlock(BrokerNvdaState state, string rawRoot)
    {
        string systemRoot = Environment.GetEnvironmentVariable("SystemRoot") ?? "C:\\Windows";
        string comSpec = Environment.GetEnvironmentVariable("ComSpec") ?? Path.Combine(systemRoot, "System32", "cmd.exe");
        string[] entries = {
            "ComSpec=" + comSpec,
            "FLUYO_NVDA_CONTROL_HANDLE=" + state.ControlReadChild.DangerousGetHandle().ToInt64().ToString(CultureInfo.InvariantCulture),
            "FLUYO_NVDA_CONTROLLER_PID=" + BrokerControllerPid.ToString(CultureInfo.InvariantCulture),
            "FLUYO_NVDA_DIAGNOSTIC_HANDLE=" + state.Diagnostic.DangerousGetHandle().ToInt64().ToString(CultureInfo.InvariantCulture),
            "FLUYO_NVDA_EXECUTABLE_HANDLE=" + state.Pins[1].DangerousGetHandle().ToInt64().ToString(CultureInfo.InvariantCulture),
            "FLUYO_NVDA_PLUGIN_HANDLE=" + state.Pins[4].DangerousGetHandle().ToInt64().ToString(CultureInfo.InvariantCulture),
            "FLUYO_NVDA_PROTOCOL_HANDLE=" + state.Pins[5].DangerousGetHandle().ToInt64().ToString(CultureInfo.InvariantCulture),
            "FLUYO_NVDA_READY_HANDLE=" + state.ReadyWriteChild.DangerousGetHandle().ToInt64().ToString(CultureInfo.InvariantCulture),
            "FLUYO_NVDA_TRANSCRIPT_HANDLE=" + state.Transcript.DangerousGetHandle().ToInt64().ToString(CultureInfo.InvariantCulture),
            "FLUYO_NVDA_RAW_HANDLE=" + state.Pins[2].DangerousGetHandle().ToInt64().ToString(CultureInfo.InvariantCulture),
            "FLUYO_NVDA_CONFIG_HANDLE=" + state.Pins[3].DangerousGetHandle().ToInt64().ToString(CultureInfo.InvariantCulture),
            "FLUYO_NVDA_CWD_HANDLE=" + state.Pins[0].DangerousGetHandle().ToInt64().ToString(CultureInfo.InvariantCulture),
            "SystemRoot=" + systemRoot,
            "TEMP=" + rawRoot,
            "TMP=" + rawRoot,
            "WINDIR=" + systemRoot
        };
        return Encoding.Unicode.GetBytes(String.Join("\0", entries) + "\0\0");
    }

    private static long DecimalJsonField(string json, string name)
    {
        string marker = "\"" + name + "\":";
        int offset = json.IndexOf(marker, StringComparison.Ordinal);
        if (offset < 0 || json.IndexOf(marker, offset + marker.Length, StringComparison.Ordinal) >= 0)
            throw new InvalidDataException("NVDA_CONTROL_FIELD");
        offset += marker.Length;
        int end = offset;
        while (end < json.Length && Char.IsDigit(json[end])) end++;
        long value;
        if (end == offset || !Int64.TryParse(json.Substring(offset, end - offset), NumberStyles.None, CultureInfo.InvariantCulture, out value))
            throw new InvalidDataException("NVDA_CONTROL_DECIMAL");
        return value;
    }

    private static void ValidateNvdaControl(string json, BrokerNvdaState state)
    {
        if (json == null || Encoding.UTF8.GetByteCount(json) > 4096 || json.IndexOf('\0') >= 0)
            throw new InvalidDataException("NVDA_CONTROL_BOUND");
        string[] ordered = {
            "\"schema\":\"fluyo:r4b:nvda-control:v1\"", "\"attemptId\":\"attempt-002-observer\"",
            "\"observationId\":", "\"generation\":", "\"phase\":", "\"expectedSpeechContract\":",
            "\"controllerPid\":", "\"controllerCreationIdentity\":",
            "\"brokerPid\":", "\"brokerCreationIdentity\":", "\"expectedNvdaPid\":",
            "\"nvdaCreationIdentity\":", "\"capabilities\":",
            "\"pluginSha256\":", "\"protocolSha256\":", "\"createdMonotonicMilliseconds\":",
            "\"expiresMonotonicMilliseconds\":"
        };
        int cursor = 0;
        foreach (string marker in ordered)
        {
            int found = json.IndexOf(marker, cursor, StringComparison.Ordinal);
            if (found < 0) throw new InvalidDataException("NVDA_CONTROL_SCHEMA");
            cursor = found + marker.Length;
        }
        if (!json.StartsWith("{", StringComparison.Ordinal) || !json.EndsWith("}", StringComparison.Ordinal) ||
            DecimalJsonField(json, "controllerPid") != BrokerControllerPid ||
            DecimalJsonField(json, "brokerPid") != Process.GetCurrentProcess().Id ||
            DecimalJsonField(json, "expectedNvdaPid") != state.Pid)
            throw new InvalidDataException("NVDA_CONTROL_IDENTITY");
    }

    private static Dictionary<string, string> NvdaStateResponse(BrokerNvdaState state)
    {
        uint wait = WaitForSingleObject(state.Process, 0);
        uint exitCode;
        Win32(GetExitCodeProcess(state.Process, out exitCode), "GetExitCodeProcess(BROKER_NVDA)");
        bool closed = wait == WAIT_OBJECT_0;
        if (!closed && wait != WAIT_TIMEOUT) throw new Win32Exception(Marshal.GetLastWin32Error(), "WaitForSingleObject(BROKER_NVDA)");
        return new Dictionary<string, string> {
            { "nvdaToken", state.Token },
            { "controllerPid", BrokerControllerPid.ToString(CultureInfo.InvariantCulture) },
            { "controllerCreationIdentity", BrokerControllerCreationIdentity },
            { "brokerPid", Process.GetCurrentProcess().Id.ToString(CultureInfo.InvariantCulture) },
            { "brokerCreationIdentity", Process.GetCurrentProcess().StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture) },
            { "nvdaPid", state.Pid.ToString(CultureInfo.InvariantCulture) },
            { "nvdaCreationIdentity", Process.GetProcessById((int)state.Pid).StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture) },
            { "nvdaState", closed ? "CLOSED" : (state.Resumed ? "RUNNING" : "ASSIGNED_SUSPENDED") },
            { "exitCode", closed ? exitCode.ToString(CultureInfo.InvariantCulture) : "" },
            { "pinnedHandleCount", "8" },
            { "inheritedHandleCount", "10" },
            { "controlTransport", "INHERITED_ANONYMOUS_PIPE" },
            { "readyTransport", "INHERITED_ANONYMOUS_PIPE" },
            { "transcriptExternalWriteShare", "DENIED" },
            { "diagnosticExternalWriteShare", "DENIED" },
            { "capabilities", "CONTROL_WRITE|READY_READ|TRANSCRIPT_READ|DIAGNOSTIC_READ|OWNED_JOB_STOP" }
        };
    }

    private static Dictionary<string, string> CreateBrokerNvda(string[] arguments)
    {
        if (BrokerNvda != null) throw new InvalidDataException("NVDA_ALREADY_ACTIVE");
        if (arguments.Length != 13) throw new InvalidDataException("NVDA_ARGUMENT_COUNT");
        string executable = Path.GetFullPath(arguments[0]);
        string cwd = Path.GetFullPath(arguments[1]);
        string rawRoot = Path.GetFullPath(arguments[2]);
        string config = Path.GetFullPath(arguments[3]);
        string plugin = Path.GetFullPath(arguments[4]);
        string protocol = Path.GetFullPath(arguments[5]);
        string diagnostics = Path.GetFullPath(arguments[6]);
        string receiptNonce = arguments[7];
        if (receiptNonce.Length != 32 || receiptNonce.Any(character => !Uri.IsHexDigit(character))) throw new InvalidDataException("NVDA_RECEIPT_NONCE");
        if (ExactPathDigest(config) != arguments[11] || ExactPathDigest(rawRoot) != arguments[12]) throw new InvalidDataException("NVDA_ROOT_DIGEST");
        string transcript = Path.Combine(rawRoot, "pre-speech-requests.jsonl");
        BrokerNvdaState state = new BrokerNvdaState();
        IntPtr attributeList = IntPtr.Zero;
        IntPtr inheritedHandleList = IntPtr.Zero;
        IntPtr environment = IntPtr.Zero;
        PROCESS_INFORMATION process = new PROCESS_INFORMATION();
        try
        {
            AssertFixedNtfs(cwd);
            state.Token = BrokerNvdaToken(arguments);
            state.Pins.Add(PinExactDirectory(cwd, ExactPathDigest(cwd)));
            state.Pins.Add(PinExactFile(executable, arguments[8], 268435456));
            state.Pins.Add(PinExactDirectory(rawRoot, arguments[12]));
            state.Pins.Add(PinExactDirectory(config, arguments[11]));
            state.Pins.Add(PinExactFile(plugin, arguments[9], 65536));
            state.Pins.Add(PinExactFile(protocol, arguments[10], 4096));
            state.Pins.Add(OpenHandle(transcript, GENERIC_READ | GENERIC_WRITE | FILE_APPEND_DATA | FILE_READ_ATTRIBUTES | SYNCHRONIZE, FILE_SHARE_READ, CREATE_NEW, false, true));
            state.Pins.Add(OpenHandle(diagnostics, GENERIC_READ | GENERIC_WRITE | FILE_APPEND_DATA | FILE_READ_ATTRIBUTES | SYNCHRONIZE, FILE_SHARE_READ, CREATE_NEW, false, true));
            SECURITY_ATTRIBUTES pipeAttributes = new SECURITY_ATTRIBUTES {
                nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES)),
                lpSecurityDescriptor = IntPtr.Zero,
                bInheritHandle = true
            };
            Win32(CreatePipe(out state.ControlReadChild, out state.ControlWriteBroker, ref pipeAttributes, 4096), "CreatePipe(BROKER_NVDA_CONTROL)");
            Win32(CreatePipe(out state.ReadyReadBroker, out state.ReadyWriteChild, ref pipeAttributes, 4096), "CreatePipe(BROKER_NVDA_READY)");
            Win32(SetHandleInformation(state.ControlWriteBroker.DangerousGetHandle(), HANDLE_FLAG_INHERIT, 0), "SetHandleInformation(BROKER_CONTROL_PARENT)");
            Win32(SetHandleInformation(state.ReadyReadBroker.DangerousGetHandle(), HANDLE_FLAG_INHERIT, 0), "SetHandleInformation(BROKER_READY_PARENT)");
            foreach (SafeFileHandle pin in state.Pins)
                Win32(SetHandleInformation(pin.DangerousGetHandle(), HANDLE_FLAG_INHERIT, HANDLE_FLAG_INHERIT), "SetHandleInformation(BROKER_NVDA_PIN)");
            state.Job = CreateJobObjectW(IntPtr.Zero, null);
            if (state.Job == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateJobObjectW(BROKER_NVDA)");
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            IntPtr limitsPointer = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION)));
            try
            {
                Marshal.StructureToPtr(limits, limitsPointer, false);
                Win32(SetInformationJobObject(state.Job, JobObjectExtendedLimitInformation, limitsPointer,
                    (uint)Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION))), "SetInformationJobObject(BROKER_NVDA)");
            }
            finally { Marshal.FreeHGlobal(limitsPointer); }
            List<IntPtr> inheritedHandles = state.Pins.Select(pin => pin.DangerousGetHandle()).ToList();
            inheritedHandles.Add(state.ControlReadChild.DangerousGetHandle());
            inheritedHandles.Add(state.ReadyWriteChild.DangerousGetHandle());
            IntPtr attributeBytes = IntPtr.Zero;
            InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref attributeBytes);
            if (attributeBytes == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(), "InitializeProcThreadAttributeList(BROKER_NVDA_SIZE)");
            attributeList = Marshal.AllocHGlobal(attributeBytes);
            Win32(InitializeProcThreadAttributeList(attributeList, 1, 0, ref attributeBytes), "InitializeProcThreadAttributeList(BROKER_NVDA)");
            inheritedHandleList = Marshal.AllocHGlobal(IntPtr.Size * inheritedHandles.Count);
            for (int index = 0; index < inheritedHandles.Count; index++) Marshal.WriteIntPtr(inheritedHandleList, index * IntPtr.Size, inheritedHandles[index]);
            Win32(UpdateProcThreadAttribute(attributeList, 0, PROC_THREAD_ATTRIBUTE_HANDLE_LIST, inheritedHandleList,
                new IntPtr(IntPtr.Size * inheritedHandles.Count), IntPtr.Zero, IntPtr.Zero), "UpdateProcThreadAttribute(BROKER_NVDA)");
            byte[] environmentBytes = NvdaEnvironmentBlock(state, rawRoot);
            environment = Marshal.AllocHGlobal(environmentBytes.Length);
            Marshal.Copy(environmentBytes, 0, environment, environmentBytes.Length);
            STARTUPINFOEX startup = new STARTUPINFOEX();
            startup.StartupInfo.cb = Marshal.SizeOf(typeof(STARTUPINFOEX));
            startup.lpAttributeList = attributeList;
            string[] launch = { executable, "--minimal", "--no-sr-flag", "--lang=en", "--config-path=" + config, "--log-file=NUL", "--log-level=20" };
            StringBuilder command = new StringBuilder(String.Join(" ", launch.Select(QuoteArgument)));
            Win32(CreateProcessExtendedW(executable, command, IntPtr.Zero, IntPtr.Zero, true,
                CREATE_SUSPENDED | CREATE_NO_WINDOW | CREATE_UNICODE_ENVIRONMENT | EXTENDED_STARTUPINFO_PRESENT,
                environment, cwd, ref startup, out process), "CreateProcessW(BROKER_NVDA_SUSPENDED)");
            state.ControlReadChild.Dispose(); state.ControlReadChild = null;
            state.ReadyWriteChild.Dispose(); state.ReadyWriteChild = null;
            if (!AssignProcessToJobObject(state.Job, process.hProcess))
            {
                int assignmentError = Marshal.GetLastWin32Error();
                bool terminated = TerminateProcess(process.hProcess, 0xDEAD);
                int terminateError = terminated ? 0 : Marshal.GetLastWin32Error();
                if (!terminated && terminateError != 5) throw new Win32Exception(terminateError, "BROKER_NVDA_UNASSIGNED_TERMINATE");
                ProveUnassignedProcessTerminated(process.hProcess);
                throw new Win32Exception(assignmentError, "AssignProcessToJobObject(BROKER_NVDA)");
            }
            state.Process = process.hProcess;
            state.Thread = process.hThread;
            state.Pid = process.dwProcessId;
            process.hProcess = IntPtr.Zero;
            process.hThread = IntPtr.Zero;
            BrokerNvda = state;
            Dictionary<string, string> result = NvdaStateResponse(state);
            result["receiptNonce"] = receiptNonce;
            return result;
        }
        catch { state.Dispose(); throw; }
        finally
        {
            if (environment != IntPtr.Zero) Marshal.FreeHGlobal(environment);
            if (attributeList != IntPtr.Zero) { DeleteProcThreadAttributeList(attributeList); Marshal.FreeHGlobal(attributeList); }
            if (inheritedHandleList != IntPtr.Zero) Marshal.FreeHGlobal(inheritedHandleList);
            if (process.hThread != IntPtr.Zero) CloseHandle(process.hThread);
            if (process.hProcess != IntPtr.Zero) CloseHandle(process.hProcess);
        }
    }

    private static BrokerNvdaState RequireBrokerNvda(string token)
    {
        if (BrokerNvda == null || token != BrokerNvda.Token) throw new InvalidDataException("NVDA_TOKEN");
        return BrokerNvda;
    }

    private static Dictionary<string, string> BrokerNvdaCommand(string[] arguments)
    {
        if (BrokerTestMode && arguments.Length == 7 && arguments[0] == "TEST_INJECTED_CONSUMER")
        {
            string python = Path.GetFullPath(arguments[1]);
            string script = Path.GetFullPath(arguments[2]);
            string root = Path.GetFullPath(arguments[3]);
            using (SafeFileHandle pythonPin = PinExactFile(python, arguments[4], 268435456))
            using (SafeFileHandle scriptPin = PinExactFile(script, arguments[5], 1048576))
            using (SafeFileHandle rootPin = PinExactDirectory(root, arguments[6]))
            {
                string outcome = RunExactNvdaHandleConsumerFixtureForTest(python, script, root);
                Inspect(pythonPin, python, false);
                Inspect(scriptPin, script, false);
                Inspect(rootPin, root, true);
                return new Dictionary<string, string> {
                    { "outcome", outcome },
                    { "controllerPid", BrokerControllerPid.ToString(CultureInfo.InvariantCulture) },
                    { "brokerPid", Process.GetCurrentProcess().Id.ToString(CultureInfo.InvariantCulture) },
                    { "consumerPid", BrokerLastInjectedConsumerPid.ToString(CultureInfo.InvariantCulture) },
                    { "consumerSchema", "TEST_INJECTED_EXACT_NVDA_HANDLES_V1" },
                    { "inheritedHandleCount", "10" },
                    { "externalWriteForgery", "DENIED" }
                };
            }
        }
        if (arguments.Length == 13) return CreateBrokerNvda(arguments);
        if (arguments.Length < 2) throw new InvalidDataException("NVDA_COMMAND_ARGUMENTS");
        string command = arguments[0];
        BrokerNvdaState state = RequireBrokerNvda(arguments[1]);
        if (command == "CONTROL" && arguments.Length == 3)
        {
            ValidateNvdaControl(arguments[2], state);
            WriteAnonymousPipeFrame(state.ControlWriteBroker, Encoding.UTF8.GetBytes(arguments[2]));
            if (!state.Resumed)
            {
                if (ResumeThread(state.Thread) == UInt32.MaxValue) throw new Win32Exception(Marshal.GetLastWin32Error(), "ResumeThread(BROKER_NVDA)");
                CloseHandle(state.Thread);
                state.Thread = IntPtr.Zero;
                state.Resumed = true;
            }
            Dictionary<string, string> result = NvdaStateResponse(state);
            result["controlSha256"] = Sha256Hex(Encoding.UTF8.GetBytes(arguments[2]));
            return result;
        }
        SafeFileHandle output;
        long maximum;
        if (command == "READY" && arguments.Length == 2)
        {
            byte[] readyBytes = ReadAnonymousPipeFrame(state.ReadyReadBroker, 4096);
            Dictionary<string, string> ready = NvdaStateResponse(state);
            ready["payloadBase64"] = Convert.ToBase64String(readyBytes);
            ready["contentSha256"] = Sha256Hex(readyBytes);
            ready["bytes"] = readyBytes.Length.ToString(CultureInfo.InvariantCulture);
            return ready;
        }
        else if (command == "TRANSCRIPT" && arguments.Length == 2) { output = state.Transcript; maximum = 2097152; }
        else if (command == "DIAGNOSTIC" && arguments.Length == 2) { output = state.Diagnostic; maximum = 65536; }
        else if (command == "STATUS" && arguments.Length == 2) return NvdaStateResponse(state);
        else throw new InvalidDataException("NVDA_COMMAND");
        byte[] bytes = ReadAllBounded(output, maximum);
        Dictionary<string, string> read = NvdaStateResponse(state);
        read["payloadBase64"] = Convert.ToBase64String(bytes);
        read["contentSha256"] = Sha256Hex(bytes);
        read["bytes"] = bytes.Length.ToString(CultureInfo.InvariantCulture);
        return read;
    }

    private static Dictionary<string, string> StopBrokerNvda(string token)
    {
        BrokerNvdaState state = RequireBrokerNvda(token);
        uint exitCode;
        Win32(GetExitCodeProcess(state.Process, out exitCode), "GetExitCodeProcess(BROKER_NVDA_STOP)");
        if (exitCode == STILL_ACTIVE)
        {
            bool terminated = TerminateProcess(state.Process, 0xDEAD);
            if (!terminated && Marshal.GetLastWin32Error() != 5) throw new Win32Exception(Marshal.GetLastWin32Error(), "TerminateProcess(BROKER_NVDA)");
            ProveUnassignedProcessTerminated(state.Process);
        }
        Dictionary<string, string> result = NvdaStateResponse(state);
        state.Dispose();
        BrokerNvda = null;
        result["nvdaState"] = "TERMINATED_CLOSED";
        return result;
    }

}
