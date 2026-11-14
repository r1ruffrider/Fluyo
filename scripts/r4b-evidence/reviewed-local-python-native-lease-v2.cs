using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using Microsoft.Win32;
using Microsoft.Win32.SafeHandles;

namespace Fluyo.R4B.ReviewedLocalPython
{
    internal sealed class RootManifestFile
    {
        internal string path = "";
        internal string identity = "";
        internal string volumeIdentity = "";
        internal long byteCount;
        internal string sha256 = "";
    }

    internal sealed class Request
    {
        internal string transactionId = "";
        internal string executablePath = "";
        internal string executableSha256 = "";
        internal string rootPath = "";
        internal string trustedTempRootPath = "";
        internal string ownedPath = "";
        internal RootManifestFile[] rootManifestFiles = Array.Empty<RootManifestFile>();
        internal string systemRoot = "";
        internal string introspectionUtf8 = "";
        internal string introspectionSha256 = "";
        internal int timeoutMs;
        internal int combinedCapBytes;
        internal int networkPollTargetMicros;
        internal int networkMaximumGapMicros;
    }

    internal sealed class Result
    {
        internal bool childStarted;
        internal bool exitObserved;
        internal int? exitCode;
        internal string signalClass = "NONE";
        internal byte[] stdoutBytes = Array.Empty<byte>();
        internal byte[] stderrBytes = Array.Empty<byte>();
        internal int processOwnerCount;
        internal int processResidualCount;
        internal int networkObservationCount;
        internal int networkMaximumGapMicros;
        internal int networkEventCount;
        internal bool loadedImageBoundaryValid;
        internal int loadedImageCount;
        internal int rootManifestImageCount;
        internal int system32ImageCount;
        internal string loadedImageEvidenceSha256 = "";
        internal string globalBefore = "";
        internal string globalAfter = "";
        internal int ownedResidueCount;
    }

    internal interface IReviewedLocalPythonNativeLeaseV2
    {
        Result Execute(Request request);
    }

    // This source is reviewable but deliberately not built or wired in the repository phase.
    // A separately reviewed source-to-helper receipt is required before an adapter may exist.
    internal sealed class UnavailableReviewedLocalPythonNativeLeaseV2 : IReviewedLocalPythonNativeLeaseV2
    {
        public Result Execute(Request request)
        {
            throw new InvalidOperationException("REVIEWED_LOCAL_NATIVE_LEASE_UNAVAILABLE_HOLD");
        }
    }

    // Closed implementation blueprint. It is source-only until the post-merge build receipt
    // binds these exact bytes, compiler identity, and resulting helper identity.
    internal sealed class ReviewedLocalPythonNativeLeaseV2 : IReviewedLocalPythonNativeLeaseV2
    {
        private const int ActiveProcessLimit = 1;
        private const int TimeoutMs = 10000;
        private const int CombinedCapBytes = 4096;
        private const int PollTargetMicros = 2500;
        private const int MaximumGapMicros = 10000;
        private const string BootstrapV2 = "import hashlib,json,msvcrt,os,sys\n" +
            "r=msvcrt.open_osfhandle(int(sys.argv[1]),os.O_RDONLY)\n" +
            "w=msvcrt.open_osfhandle(int(sys.argv[2]),os.O_WRONLY)\n" +
            "def recv(expected):\n b=os.read(r,len(expected))\n if b!=expected: raise SystemExit(121)\n" +
            "def send(value):\n if os.write(w,value)!=len(value): raise SystemExit(122)\n" +
            "send(b\"READY_V1\\n\")\nrecv(b\"L\")\n" +
            "p=os.path.realpath(sys.executable)\nwith open(p,\"rb\",buffering=0) as f:\n h=hashlib.file_digest(f,\"sha256\").hexdigest()\n" +
            "payload=(json.dumps({\"executable\":p,\"sha256\":h,\"version\":list(sys.version_info[:3])},ensure_ascii=False,separators=(\",\",\":\"))+\"\\r\\n\").encode(\"utf-8\")\n" +
            "send(b\"LOADED_V1\\n\")\nrecv(b\"G\")\nos.write(1,payload)\nos.close(r)\nos.close(w)\n";
        private const string BootstrapV2Sha256 = "7c32a2cdf883ba5ea149f24bf59e53310dc2c393cb05d475c79a9e579774585f";
        private const uint FileFlagBackupSemantics = 0x02000000;
        // FILE_FLAG_OPEN_REPARSE_POINT / OPEN_REPARSE_POINT is mandatory for each held segment.
        private const uint FileFlagOpenReparsePoint = 0x00200000;
        private const uint FileShareRead = 0x00000001;

        public Result Execute(Request request)
        {
            ValidateRequest(request);
            using (HeldDirectory root = HeldDirectory.OpenTrustedRoot(request.rootPath))
            using (HeldDirectory windowsRoot = HeldDirectory.OpenAuthoritativeWindowsRoot())
            using (HeldDirectory system32Root = HeldDirectory.OpenAuthoritativeSystem32Root(windowsRoot))
            using (HeldDirectory trustedTemp = HeldDirectory.OpenAuthoritativeTrustedTempRoot(windowsRoot))
            using (HeldDirectory owned = HeldDirectory.OpenEmptyOwnedDirectory(request.ownedPath, trustedTemp, request.transactionId))
            using (HeldFile image = HeldFile.OpenRegularImage(request.executablePath, root))
            using (OwnedJob job = OwnedJob.Create(ActiveProcessLimit))
            using (ContinuousNetworkObserver network = ContinuousNetworkObserver.Start(
                request.networkPollTargetMicros,
                request.networkMaximumGapMicros))
            {
                if (!String.Equals(request.systemRoot, windowsRoot.FinalPath, StringComparison.OrdinalIgnoreCase) ||
                    !String.Equals(request.trustedTempRootPath, trustedTemp.FinalPath, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                image.VerifySha256(request.executableSha256);
                using (RootManifestBoundary manifest = RootManifestBoundary.Hold(root, request.rootManifestFiles)) {
                string globalBefore = GlobalSnapshot.CaptureClosedDigest();
                ChildOutcome child = ChildOutcome.StartAndWait(
                    image,
                    owned,
                    manifest,
                    job,
                    network,
                    windowsRoot,
                    system32Root,
                    BootstrapV2,
                    request.timeoutMs,
                    request.combinedCapBytes);
                NetworkOutcome networkOutcome = network.StopAndValidateZero();
                image.RevalidateIdentityAndHash(request.executableSha256);
                manifest.RevalidateAll();
                root.RevalidateNoReparseNoMountNoIdentityDrift();
                trustedTemp.RevalidateNoReparseNoMountNoIdentityDrift();
                owned.RevalidateNoReparseNoMountNoIdentityDrift();
                string globalAfter = GlobalSnapshot.CaptureClosedDigest();
                int residual = job.CountResidualProcesses();
                if (job.TotalOwnedProcesses != 1 || residual != 0)
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                if (!String.Equals(globalBefore, globalAfter, StringComparison.Ordinal))
                    throw new InvalidOperationException("REVIEWED_LOCAL_GLOBAL_MUTATION_INVALID");
                return new Result {
                    childStarted = child.Started,
                    exitObserved = child.ExitObserved,
                    exitCode = child.ExitCode,
                    signalClass = child.SignalClass,
                    stdoutBytes = child.Stdout,
                    stderrBytes = child.Stderr,
                    processOwnerCount = job.TotalOwnedProcesses,
                    processResidualCount = residual,
                    networkObservationCount = networkOutcome.ObservationCount,
                    networkMaximumGapMicros = networkOutcome.MaximumGapMicros,
                    networkEventCount = networkOutcome.EventCount,
                    loadedImageBoundaryValid = child.LoadedImagesAreWithin(manifest, system32Root),
                    loadedImageCount = child.LoadedImageCount,
                    rootManifestImageCount = child.RootManifestImageCount,
                    system32ImageCount = child.System32ImageCount,
                    loadedImageEvidenceSha256 = child.LoadedImageEvidenceSha256,
                    globalBefore = globalBefore,
                    globalAfter = globalAfter,
                    ownedResidueCount = owned.CountIdentityStableRegularDescendants()
                };
                }
            }
        }

        private static void ValidateRequest(Request request)
        {
            if (request == null || request.timeoutMs != TimeoutMs ||
                request.combinedCapBytes != CombinedCapBytes ||
                request.networkPollTargetMicros <= 0 || request.networkPollTargetMicros > PollTargetMicros ||
                request.networkMaximumGapMicros != MaximumGapMicros ||
                request.transactionId.Length != 64 || request.executableSha256.Length != 64 ||
                !String.Equals(request.introspectionUtf8, BootstrapV2, StringComparison.Ordinal) ||
                Encoding.UTF8.GetByteCount(BootstrapV2) != 678 ||
                !String.Equals(request.introspectionSha256, BootstrapV2Sha256, StringComparison.Ordinal) ||
                !String.Equals(Sha256Utf8(BootstrapV2), BootstrapV2Sha256, StringComparison.Ordinal) ||
                request.rootManifestFiles == null || request.rootManifestFiles.Length == 0)
                throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
        }

        private sealed class HeldDirectory : IDisposable
        {
            internal readonly ulong VolumeSerial;
            private readonly List<IntPtr> handles;
            private readonly IntPtr handle;
            private readonly byte[] identity;
            private readonly string finalPath;
            private readonly string sha256;
            internal string FinalPath { get { return finalPath; } }

            private HeldDirectory(List<IntPtr> retained, IntPtr value, ulong volume, byte[] fileIdentity, string path)
            {
                handles = retained; handle = value; VolumeSerial = volume; identity = fileIdentity;
                finalPath = path;
            }

            internal static HeldDirectory OpenTrustedRoot(string path)
            {
                RejectNamespace(path);
                return WalkEverySegment(path, null, false);
            }

            internal static HeldDirectory OpenAuthoritativeWindowsRoot()
            {
                return WalkEverySegment(ReadWindowsDirectory(), null, false);
            }

            internal static HeldDirectory OpenAuthoritativeSystem32Root(HeldDirectory windowsRoot)
            {
                HeldDirectory directory = WalkEverySegment(ReadSystemDirectory(), windowsRoot.VolumeSerial, false);
                directory.RevalidateContainedBy(windowsRoot);
                return directory;
            }

            internal static HeldDirectory OpenAuthoritativeTrustedTempRoot(HeldDirectory windowsRoot)
            {
                string expected = Path.Combine(windowsRoot.FinalPath, "Temp");
                HeldDirectory directory = WalkEverySegment(expected, windowsRoot.VolumeSerial, false);
                directory.RevalidateContainedBy(windowsRoot);
                return directory;
            }

            internal static HeldDirectory OpenEmptyOwnedDirectory(string requestedOwnedPath,
                HeldDirectory heldTrustedTempRoot, string transactionId)
            {
                string expected = Path.Combine(heldTrustedTempRoot.FinalPath, "fluyo-r4b",
                    "python-reviewed-local-v2", transactionId);
                if (!String.Equals(requestedOwnedPath, expected, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("REVIEWED_LOCAL_OWNED_TEMP_INVALID");
                RejectNamespace(requestedOwnedPath);
                HeldDirectory directory = WalkDescendantsFromHeld(heldTrustedTempRoot,
                    new[] { "fluyo-r4b", "python-reviewed-local-v2", transactionId });
                directory.RevalidateContainedBy(heldTrustedTempRoot);
                if (directory.CountIdentityStableRegularDescendants() != 0)
                    throw new InvalidOperationException("REVIEWED_LOCAL_OWNED_TEMP_INVALID");
                return directory;
            }

            private static HeldDirectory WalkDescendantsFromHeld(HeldDirectory ancestor,
                string[] segments)
            {
                List<IntPtr> retained = new List<IntPtr>();
                string current = ancestor.FinalPath;
                try {
                    foreach (string segment in segments) {
                        if (String.IsNullOrEmpty(segment) || segment.Contains("\\") || segment.Contains("/") ||
                            segment == "." || segment == "..")
                            throw new InvalidOperationException("REVIEWED_LOCAL_OWNED_TEMP_INVALID");
                        current = Path.Combine(current, segment);
                        IntPtr opened = CreateFileW(current, 0, FileShareRead, IntPtr.Zero, 3,
                            FileFlagBackupSemantics | FileFlagOpenReparsePoint, IntPtr.Zero);
                        if (opened == new IntPtr(-1))
                            throw new InvalidOperationException("REVIEWED_LOCAL_OWNED_TEMP_INVALID");
                        retained.Add(opened);
                        RejectReparseMountOrWrongKind(opened);
                        if (QueryVolumeSerial(opened) != ancestor.VolumeSerial)
                            throw new InvalidOperationException("REVIEWED_LOCAL_OWNED_TEMP_INVALID");
                    }
                    IntPtr value = retained[retained.Count - 1];
                    return new HeldDirectory(retained, value, ancestor.VolumeSerial,
                        QueryFileIdentity(value), QueryFinalPath(value));
                } catch {
                    for (int index = retained.Count - 1; index >= 0; index--) CloseHandle(retained[index]);
                    throw;
                }
            }

            private static HeldDirectory WalkEverySegment(string path, ulong? expectedVolume, bool requireEmpty)
            {
                string drive = Path.GetPathRoot(path) ?? "";
                if (drive.Length == 0 || !String.Equals(Path.GetFullPath(path), path, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
                string[] segments = path.Substring(drive.Length).Split(new[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
                List<IntPtr> retained = new List<IntPtr>();
                string current = drive;
                ulong? volume = expectedVolume;
                try {
                    for (int index = -1; index < segments.Length; index++) {
                        if (index >= 0) current = Path.Combine(current, segments[index]);
                        IntPtr opened = CreateFileW(current, 0, FileShareRead, IntPtr.Zero, 3,
                            FileFlagBackupSemantics | FileFlagOpenReparsePoint, IntPtr.Zero);
                        if (opened == new IntPtr(-1))
                            throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
                        retained.Add(opened);
                        RejectReparseMountOrWrongKind(opened);
                        ulong observedVolume = QueryVolumeSerial(opened);
                        if (volume.HasValue && volume.Value != observedVolume)
                            throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
                        volume = observedVolume;
                    }
                    IntPtr value = retained[retained.Count - 1];
                    HeldDirectory result = new HeldDirectory(retained, value, volume ?? 0UL,
                        QueryFileIdentity(value), current);
                    if (requireEmpty && result.CountIdentityStableRegularDescendants() != 0)
                        throw new InvalidOperationException("REVIEWED_LOCAL_OWNED_TEMP_INVALID");
                    return result;
                } catch {
                    for (int index = retained.Count - 1; index >= 0; index--) CloseHandle(retained[index]);
                    throw;
                }
            }

            internal void RevalidateNoReparseNoMountNoIdentityDrift()
            {
                RejectReparseMountOrWrongKind(handle);
                if (!CryptographicOperations.FixedTimeEquals(identity, QueryFileIdentity(handle)))
                    throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
            }

            internal void RevalidateContainedBy(HeldDirectory ancestor)
            {
                RevalidateNoReparseNoMountNoIdentityDrift();
                ancestor.RevalidateNoReparseNoMountNoIdentityDrift();
                string prefix = ancestor.FinalPath.TrimEnd('\\') + "\\";
                if (VolumeSerial != ancestor.VolumeSerial ||
                    !FinalPath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("REVIEWED_LOCAL_OWNED_TEMP_INVALID");
            }

            internal int CountIdentityStableRegularDescendants()
            {
                int count = 0;
                foreach (string child in Directory.EnumerateFileSystemEntries(finalPath)) {
                    FileAttributes attributes = File.GetAttributes(child);
                    if ((attributes & FileAttributes.ReparsePoint) != 0)
                        throw new InvalidOperationException("REVIEWED_LOCAL_CLEANUP_INVALID");
                    checked { count++; }
                }
                return count;
            }
            internal bool Contains(HeldFile file) {
                string prefix = finalPath.TrimEnd('\\') + "\\";
                return file.VolumeSerial == VolumeSerial &&
                    file.FinalPath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase);
            }
            public void Dispose() {
                for (int index = handles.Count - 1; index >= 0; index--) CloseHandle(handles[index]);
                handles.Clear();
            }
        }

        private sealed class HeldFile : IDisposable
        {
            internal readonly ulong VolumeSerial;
            private readonly IntPtr handle;
            private readonly byte[] identity;
            private readonly string finalPath;
            internal string FinalPath { get { return finalPath; } }

            private HeldFile(IntPtr value, ulong volume, byte[] fileIdentity, string path)
            { handle = value; VolumeSerial = volume; identity = fileIdentity; finalPath = path; sha256 = HashHeldHandleSha256(value); }

            internal static HeldFile OpenRegularImage(string path, HeldDirectory root)
            {
                HeldFile file = OpenObservedImage(path);
                if (!root.Contains(file)) { file.Dispose(); throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID"); }
                return file;
            }

            internal static HeldFile OpenObservedImage(string path)
            {
                RejectNamespace(path);
                IntPtr value = CreateFileW(path, 0x80000000, FileShareRead, IntPtr.Zero, 3,
                    FileFlagOpenReparsePoint, IntPtr.Zero);
                if (value == new IntPtr(-1))
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                RejectReparseMountOrWrongKind(value);
                HeldFile file = new HeldFile(value, QueryVolumeSerial(value), QueryFileIdentity(value),
                    QueryFinalPath(value));
                return file;
            }

            internal void VerifySha256(string expected) { VerifyHeldHandleSha256(handle, expected); }
            internal string IdentityHex { get { return ToLowerHex(identity); } }
            internal long ByteCount { get { return QueryFileLength(handle); } }
            internal string Sha256Hex { get { return sha256; } }
            internal void RevalidateIdentityAndHash(string expected) {
                if (!CryptographicOperations.FixedTimeEquals(identity, QueryFileIdentity(handle)))
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                VerifySha256(expected);
            }
            public void Dispose() { if (handle != IntPtr.Zero) CloseHandle(handle); }
        }

        private sealed class RootManifestBoundary : IDisposable
        {
            private readonly HeldDirectory root;
            private readonly List<HeldFile> files;
            private readonly Dictionary<string, RootManifestFile> rows;

            private RootManifestBoundary(HeldDirectory heldRoot, List<HeldFile> heldFiles,
                Dictionary<string, RootManifestFile> expectedRows) {
                root = heldRoot; files = heldFiles; rows = expectedRows;
            }

            internal static RootManifestBoundary Hold(HeldDirectory root,
                RootManifestFile[] rootManifestFiles) {
                if (root == null || rootManifestFiles == null || rootManifestFiles.Length == 0)
                    throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
                Dictionary<string, RootManifestFile> expected = new Dictionary<string, RootManifestFile>(
                    StringComparer.Ordinal);
                List<HeldFile> held = new List<HeldFile>();
                try {
                    foreach (RootManifestFile row in rootManifestFiles) {
                        if (row == null || String.IsNullOrEmpty(row.path) || row.path.Contains("\\") ||
                            row.path.StartsWith("/", StringComparison.Ordinal) ||
                            row.path.Contains("../") || !expected.TryAdd(row.path, row))
                            throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
                        string candidate = Path.Combine(root.FinalPath,
                            row.path.Replace('/', Path.DirectorySeparatorChar));
                        HeldFile file = HeldFile.OpenRegularImage(candidate, root);
                        VerifyManifestRow(root, file, row);
                        held.Add(file);
                    }
                    return new RootManifestBoundary(root, held, expected);
                } catch {
                    foreach (HeldFile file in held) file.Dispose();
                    throw;
                }
            }

            private static void VerifyManifestRow(HeldDirectory root, HeldFile file,
                RootManifestFile row) {
                string relative = file.FinalPath.Substring(root.FinalPath.TrimEnd('\\').Length)
                    .TrimStart('\\').Replace('\\', '/');
                if (!String.Equals(relative, row.path, StringComparison.Ordinal) ||
                    !String.Equals(file.IdentityHex, row.identity, StringComparison.Ordinal) ||
                    !String.Equals(file.VolumeSerial.ToString("x16"), row.volumeIdentity,
                        StringComparison.Ordinal) || file.ByteCount != row.byteCount)
                    throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
                file.VerifySha256(row.sha256);
            }

            internal void RevalidateAll() {
                if (files.Count != rows.Count)
                    throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
                foreach (HeldFile file in files) {
                    string relative = file.FinalPath.Substring(root.FinalPath.TrimEnd('\\').Length)
                        .TrimStart('\\').Replace('\\', '/');
                    RootManifestFile row;
                    if (!rows.TryGetValue(relative, out row))
                        throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
                    VerifyManifestRow(root, file, row);
                }
            }

            internal bool ContainsLoadedImage(HeldFile file) {
                try {
                    if (!root.Contains(file)) return false;
                    string relative = file.FinalPath.Substring(root.FinalPath.TrimEnd('\\').Length)
                        .TrimStart('\\').Replace('\\', '/');
                    RootManifestFile row;
                    if (!rows.TryGetValue(relative, out row)) return false;
                    VerifyManifestRow(root, file, row);
                    return true;
                } catch { return false; }
            }

            public void Dispose() { foreach (HeldFile file in files) file.Dispose(); }
        }

        private sealed class OwnedJob : IDisposable
        {
            private readonly SafeWaitHandle handle;
            internal int TotalOwnedProcesses { get; private set; }

            private OwnedJob(SafeWaitHandle value) { handle = value; }

            internal static OwnedJob Create(int activeProcessLimit) {
                if (activeProcessLimit != 1)
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                SafeWaitHandle value = CreateJobObjectW(IntPtr.Zero, null);
                if (value == null || value.IsInvalid)
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                JobExtendedLimitInformation limits = new JobExtendedLimitInformation();
                limits.BasicLimitInformation.LimitFlags = JobObjectLimitActiveProcess |
                    JobObjectLimitKillOnJobClose;
                limits.BasicLimitInformation.ActiveProcessLimit = 1;
                if (!SetInformationJobObject(value, 9, ref limits,
                    (uint)Marshal.SizeOf(typeof(JobExtendedLimitInformation)))) {
                    value.Dispose();
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                }
                return new OwnedJob(value);
            }

            internal void AssignSuspended(SafeWaitHandle process) {
                if (TotalOwnedProcesses != 0 || !AssignProcessToJobObject(handle, process))
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                TotalOwnedProcesses = 1;
            }

            internal void Terminate() { TerminateJobObject(handle, 1); }

            internal int CountResidualProcesses() {
                JobBasicAccountingInformation accounting;
                if (!QueryInformationJobObject(handle, 1, out accounting,
                    (uint)Marshal.SizeOf(typeof(JobBasicAccountingInformation)), IntPtr.Zero) ||
                    accounting.TotalProcesses > 1)
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                return checked((int)accounting.ActiveProcesses);
            }

            public void Dispose() { handle.Dispose(); }
        }

        private sealed class ContinuousNetworkObserver : IDisposable
        {
            private const string EvidenceMode = "ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1";
            private readonly object gate = new object();
            private readonly HashSet<uint> owners = new HashSet<uint>();
            private readonly int target;
            private readonly int maximum;
            private readonly Stopwatch clock = Stopwatch.StartNew();
            private readonly Thread worker;
            private volatile bool stopping;
            private bool available = true;
            private int observations;
            private int events;
            private long lastPollTicks;
            private long maximumGapTicks;

            private ContinuousNetworkObserver(int pollTarget, int maximumGap) {
                target = pollTarget;
                maximum = maximumGap;
                lastPollTicks = clock.ElapsedTicks;
                worker = new Thread(PollLoop);
                worker.IsBackground = true;
                worker.Name = "FLUYO_REVIEWED_LOCAL_TCP_UDP_OBSERVER_V1";
                worker.Start();
            }

            internal static ContinuousNetworkObserver Start(int pollTarget, int maximumGap) {
                if (pollTarget <= 0 || pollTarget > PollTargetMicros || maximumGap != MaximumGapMicros)
                    throw new InvalidOperationException("REVIEWED_LOCAL_NETWORK_OBSERVATION_INVALID");
                return new ContinuousNetworkObserver(pollTarget, maximumGap);
            }

            internal void AddOwner(uint processId) {
                lock (gate) {
                    if (processId == 0 || stopping || !owners.Add(processId))
                        throw new InvalidOperationException("REVIEWED_LOCAL_NETWORK_OBSERVATION_INVALID");
                }
            }

            private void PollLoop() {
                try {
                    while (!stopping) {
                        long now = clock.ElapsedTicks;
                        long gap = now - lastPollTicks;
                        if (gap > maximumGapTicks) maximumGapTicks = gap;
                        lastPollTicks = now;
                        HashSet<uint> snapshot;
                        lock (gate) snapshot = new HashSet<uint>(owners);
                        int observed = CountOwnedEndpoints(snapshot);
                        lock (gate) { checked { observations++; events += observed; } }
                        int sleep = Math.Max(1, target / 1000);
                        Thread.Sleep(sleep);
                    }
                } catch { available = false; }
            }

            private static int CountOwnedEndpoints(HashSet<uint> ownerSet) {
                return CountTable(2, 5, 24, 20, ownerSet, true) +
                    CountTable(23, 5, 60, 56, ownerSet, true) +
                    CountTable(2, 1, 12, 8, ownerSet, false) +
                    CountTable(23, 1, 28, 24, ownerSet, false);
            }

            private static int CountTable(uint family, int tableClass, int rowSize, int pidOffset,
                HashSet<uint> ownerSet, bool tcp) {
                uint size = 0;
                uint first = tcp
                    ? GetExtendedTcpTable(IntPtr.Zero, ref size, false, family, tableClass, 0)
                    : GetExtendedUdpTable(IntPtr.Zero, ref size, false, family, tableClass, 0);
                if ((first != 122 && first != 0) || size < 4 || size > 16 * 1024 * 1024)
                    throw new InvalidOperationException("REVIEWED_LOCAL_NETWORK_OBSERVATION_INVALID");
                IntPtr buffer = Marshal.AllocHGlobal(checked((int)size));
                try {
                    uint capacity = size;
                    uint result = tcp
                        ? GetExtendedTcpTable(buffer, ref size, false, family, tableClass, 0)
                        : GetExtendedUdpTable(buffer, ref size, false, family, tableClass, 0);
                    if (result != 0 || size > capacity)
                        throw new InvalidOperationException("REVIEWED_LOCAL_NETWORK_OBSERVATION_INVALID");
                    int count = Marshal.ReadInt32(buffer);
                    if (count < 0 || count > 100000 || checked(4L + (long)count * rowSize) > size)
                        throw new InvalidOperationException("REVIEWED_LOCAL_NETWORK_OBSERVATION_INVALID");
                    int found = 0;
                    for (int index = 0; index < count; index++) {
                        int offset = checked(4 + index * rowSize + pidOffset);
                        uint processId = unchecked((uint)Marshal.ReadInt32(buffer, offset));
                        if (ownerSet.Contains(processId)) checked { found++; }
                    }
                    return found;
                } finally { Marshal.FreeHGlobal(buffer); }
            }

            internal NetworkOutcome StopAndValidateZero() {
                stopping = true;
                if (!worker.Join(5000)) available = false;
                lock (gate) {
                    long observedGap = maximumGapTicks * 1000000L / Stopwatch.Frequency;
                    if (EvidenceMode.Length == 0 || !available || observations < 1 ||
                        observedGap > maximum || events != 0 || owners.Count != 1)
                        throw new InvalidOperationException("REVIEWED_LOCAL_NETWORK_OBSERVATION_INVALID");
                    return new NetworkOutcome(observations, checked((int)observedGap), events);
                }
            }

            public void Dispose() {
                stopping = true;
                if (worker != null && worker.IsAlive) worker.Join(5000);
            }
        }

        private sealed class NetworkOutcome {
            internal readonly int ObservationCount, MaximumGapMicros, EventCount;
            internal NetworkOutcome(int count, int gap, int events) { ObservationCount = count; MaximumGapMicros = gap; EventCount = events; }
        }

        private sealed class LoadedImageEvidence : IDisposable
        {
            private readonly RootManifestBoundary rootManifest;
            private readonly HeldDirectory system32Root;
            private readonly Dictionary<string, HeldFile> held = new Dictionary<string, HeldFile>(StringComparer.Ordinal);
            private readonly Dictionary<string, string> rows = new Dictionary<string, string>(StringComparer.Ordinal);
            internal int RootManifestImageCount { get; private set; }
            internal int System32ImageCount { get; private set; }
            internal int LoadedImageCount { get { return held.Count; } }
            internal string EvidenceSha256 {
                get {
                    List<string> ordered = new List<string>(rows.Values);
                    ordered.Sort(StringComparer.Ordinal);
                    return Sha256Utf8(String.Join("", ordered.ToArray()));
                }
            }

            internal LoadedImageEvidence(RootManifestBoundary manifest, HeldDirectory system32)
            { rootManifest = manifest; system32Root = system32; }

            internal void Observe(uint processId)
            {
                HashSet<string> observed = new HashSet<string>(StringComparer.Ordinal);
                try {
                    using (Process process = Process.GetProcessById(checked((int)processId))) {
                        foreach (ProcessModule module in process.Modules) {
                            HeldFile candidate = HeldFile.OpenObservedImage(module.FileName);
                            string key = candidate.VolumeSerial.ToString("x16") + "\0" + candidate.IdentityHex;
                            if (!observed.Add(key)) { candidate.Dispose(); throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID"); }
                            HeldFile prior;
                            if (held.TryGetValue(key, out prior)) {
                                if (!String.Equals(prior.FinalPath, candidate.FinalPath,
                                    StringComparison.OrdinalIgnoreCase) || prior.ByteCount != candidate.ByteCount ||
                                    !String.Equals(prior.Sha256Hex, candidate.Sha256Hex, StringComparison.Ordinal)) {
                                    candidate.Dispose();
                                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                                }
                                candidate.Dispose();
                                continue;
                            }
                            bool inRoot = rootManifest.ContainsLoadedImage(candidate);
                            bool inSystem32 = system32Root.Contains(candidate);
                            if (inRoot == inSystem32) { candidate.Dispose(); throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID"); }
                            string classification = inRoot ? "ROOT_MANIFEST" : "SYSTEM32";
                            string row = classification + "\0" + candidate.VolumeSerial.ToString("x16") +
                                "\0" + candidate.IdentityHex + "\0" + candidate.ByteCount.ToString() +
                                "\0" + candidate.Sha256Hex + "\n";
                            held.Add(key, candidate);
                            rows.Add(key, row);
                            if (inRoot) RootManifestImageCount++; else System32ImageCount++;
                        }
                    }
                } catch {
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                }
                if (observed.Count == 0)
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
            }

            internal void RevalidateAll()
            {
                rootManifest.RevalidateAll();
                system32Root.RevalidateNoReparseNoMountNoIdentityDrift();
                foreach (HeldFile file in held.Values)
                    file.RevalidateIdentityAndHash(file.Sha256Hex);
                if (LoadedImageCount != RootManifestImageCount + System32ImageCount)
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
            }

            public void Dispose() { foreach (HeldFile file in held.Values) file.Dispose(); held.Clear(); }
        }

        private sealed class ChildOutcome
        {
            internal bool Started, ExitObserved;
            internal int? ExitCode;
            internal string SignalClass = "NONE";
            internal byte[] Stdout = Array.Empty<byte>(), Stderr = Array.Empty<byte>();
            private bool loadedImagesValid;
            internal int LoadedImageCount, RootManifestImageCount, System32ImageCount;
            internal string LoadedImageEvidenceSha256 = "";

            internal static ChildOutcome StartAndWait(HeldFile image, HeldDirectory owned,
                RootManifestBoundary rootManifestFiles, OwnedJob job,
                ContinuousNetworkObserver network, HeldDirectory windowsRoot,
                HeldDirectory system32Root, string introspection, int timeout, int cap)
            {
                if (timeout != TimeoutMs || cap != CombinedCapBytes)
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                string environmentBlock = "SystemRoot=" + windowsRoot.FinalPath + "\0WINDIR=" + windowsRoot.FinalPath +
                    "\0TEMP=" + owned.FinalPath + "\0TMP=" + owned.FinalPath +
                    "\0PYTHONUTF8=1\0PYTHONDONTWRITEBYTECODE=1\0PYTHONNOUSERSITE=1\0\0";
                SecurityAttributes attributes = new SecurityAttributes();
                attributes.Length = Marshal.SizeOf(typeof(SecurityAttributes));
                attributes.InheritHandle = 1;
                SafeFileHandle stdinRead, stdinWrite, stdoutRead, stdoutWrite, stderrRead, stderrWrite;
                SafeFileHandle controlRead, controlWrite, statusRead, statusWrite;
                if (!CreatePipe(out stdinRead, out stdinWrite, ref attributes, 0) ||
                    !CreatePipe(out stdoutRead, out stdoutWrite, ref attributes, 0) ||
                    !CreatePipe(out stderrRead, out stderrWrite, ref attributes, 0) ||
                    !CreatePipe(out controlRead, out controlWrite, ref attributes, 0) ||
                    !CreatePipe(out statusRead, out statusWrite, ref attributes, 0))
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                using (stdinRead) using (stdinWrite) using (stdoutRead) using (stdoutWrite)
                using (stderrRead) using (stderrWrite) using (controlRead) using (controlWrite)
                using (statusRead) using (statusWrite) {
                    if (!SetHandleInformation(stdinWrite, 1, 0) ||
                        !SetHandleInformation(stdoutRead, 1, 0) ||
                        !SetHandleInformation(stderrRead, 1, 0) ||
                        !SetHandleInformation(controlWrite, 1, 0) ||
                        !SetHandleInformation(statusRead, 1, 0))
                        throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                    stdinWrite.Dispose();
                    StartupInfoEx startup = new StartupInfoEx();
                    startup.StartupInfo.cb = Marshal.SizeOf(typeof(StartupInfoEx));
                    startup.StartupInfo.dwFlags = StartfUseStdHandles;
                    startup.StartupInfo.hStdInput = stdinRead.DangerousGetHandle();
                    startup.StartupInfo.hStdOutput = stdoutWrite.DangerousGetHandle();
                    startup.StartupInfo.hStdError = stderrWrite.DangerousGetHandle();
                    IntPtr attributeSize = IntPtr.Zero;
                    InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref attributeSize);
                    startup.AttributeList = Marshal.AllocHGlobal(attributeSize);
                    IntPtr inherited = Marshal.AllocHGlobal(IntPtr.Size * 5);
                    IntPtr environment = Marshal.StringToHGlobalUni(environmentBlock);
                    try {
                        if (!InitializeProcThreadAttributeList(startup.AttributeList, 1, 0, ref attributeSize))
                            throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                        Marshal.WriteIntPtr(inherited, 0, stdinRead.DangerousGetHandle());
                        Marshal.WriteIntPtr(inherited, IntPtr.Size, stdoutWrite.DangerousGetHandle());
                        Marshal.WriteIntPtr(inherited, IntPtr.Size * 2, stderrWrite.DangerousGetHandle());
                        Marshal.WriteIntPtr(inherited, IntPtr.Size * 3, controlRead.DangerousGetHandle());
                        Marshal.WriteIntPtr(inherited, IntPtr.Size * 4, statusWrite.DangerousGetHandle());
                        if (!UpdateProcThreadAttribute(startup.AttributeList, 0, ProcThreadAttributeHandleList,
                            inherited, new IntPtr(IntPtr.Size * 5), IntPtr.Zero, IntPtr.Zero))
                            throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                        ProcessInformation processInformation;
                        string commandLine = Quote(image.FinalPath) + " -I -S -B -c " + Quote(introspection) +
                            " " + unchecked((ulong)controlRead.DangerousGetHandle().ToInt64()).ToString(CultureInfo.InvariantCulture) +
                            " " + unchecked((ulong)statusWrite.DangerousGetHandle().ToInt64()).ToString(CultureInfo.InvariantCulture);
                        StringBuilder mutableCommand = new StringBuilder(commandLine);
                        if (!CreateProcessW(image.FinalPath, mutableCommand, IntPtr.Zero, IntPtr.Zero, true,
                            CreateSuspended | CreateNoWindow | CreateUnicodeEnvironment |
                            ExtendedStartupInfoPresent, environment, owned.FinalPath, ref startup,
                            out processInformation))
                            throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                        using (SafeWaitHandle process = new SafeWaitHandle(processInformation.Process, true))
                        using (SafeWaitHandle thread = new SafeWaitHandle(processInformation.Thread, true)) {
                            job.AssignSuspended(process);
                            VerifySpawnedImage(process, image);
                            network.AddOwner(processInformation.ProcessId);
                            using (LoadedImageEvidence loaded = new LoadedImageEvidence(
                                rootManifestFiles, system32Root))
                            using (TerminalCoordinator coordinator = new TerminalCoordinator(job))
                            using (BarrierStatusReader status = new BarrierStatusReader(statusRead))
                            using (FileStream control = new FileStream(controlWrite, FileAccess.Write, 1, false)) {
                                controlRead.Dispose();
                                statusWrite.Dispose();
                                stdoutWrite.Dispose();
                                stderrWrite.Dispose();
                                SharedCaptureBudget budget = new SharedCaptureBudget(
                                    cap, coordinator.RequestTermination);
                                BoundedCapture stdout = new BoundedCapture(stdoutRead, budget);
                                BoundedCapture stderr = new BoundedCapture(stderrRead, budget);
                                try {
                                    status.Start(); stdout.Start(); stderr.Start();
                                    // OBSERVE_SUSPENDED
                                    loaded.Observe(processInformation.ProcessId);
                                    // RESUME
                                    if (ResumeThread(thread) == UInt32.MaxValue)
                                        throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                                    status.WaitReady(process, coordinator, 2500); // READY_RECEIVED
                                    coordinator.ObserveAtBarrier(process, delegate {
                                        loaded.Observe(processInformation.ProcessId); // OBSERVE_READY
                                    });
                                    WriteControl(control, (byte)'L'); // SEND_LOAD
                                    status.WaitLoaded(process, coordinator, 2500); // LOADED_RECEIVED
                                    coordinator.ObserveAtBarrier(process, delegate {
                                        loaded.Observe(processInformation.ProcessId); // OBSERVE_LOADED
                                    });
                                    WriteControl(control, (byte)'G'); // SEND_GO
                                    control.Dispose();
                                    Stopwatch deadline = Stopwatch.StartNew();
                                    bool timedOut = false;
                                    while (true) {
                                        uint wait = WaitForSingleObject(process, 25);
                                        if (wait == WaitObject0) {
                                            coordinator.MarkExitSignaled(); // WAIT_SIGNALED
                                            break;
                                        }
                                        if (wait != WaitTimeout)
                                            throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                                        if (coordinator.TerminationRequested || deadline.ElapsedMilliseconds >= timeout) {
                                            timedOut = deadline.ElapsedMilliseconds >= timeout;
                                            coordinator.RequestTermination();
                                            if (WaitForSingleObject(process, 5000) != WaitObject0)
                                                throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                                            coordinator.MarkExitSignaled();
                                            break;
                                        }
                                    }
                                    loaded.RevalidateAll(); // REVALIDATE_HELD; no enumeration after SEND_GO.
                                    bool stdoutJoined = stdout.JoinAndReport();
                                    bool stderrJoined = stderr.JoinAndReport();
                                    bool statusJoined = status.JoinAndReport(); // JOIN_STREAMS
                                    if (!stdoutJoined || !stderrJoined || !statusJoined ||
                                        budget.Overflowed ||
                                        budget.AcceptedByteCount != checked(stdout.Count + stderr.Count))
                                        throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                                    uint exitCode;
                                    if (!GetExitCodeProcess(process, out exitCode)) // READ_EXIT_CODE
                                        throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                                    return new ChildOutcome { // COMPLETE
                                        Started = true, ExitObserved = true,
                                        ExitCode = unchecked((int)exitCode),
                                        SignalClass = timedOut ? "TIMEOUT" : "NONE",
                                        Stdout = stdout.Bytes, Stderr = stderr.Bytes,
                                        loadedImagesValid = status.SawReady && status.SawLoaded,
                                        LoadedImageCount = loaded.LoadedImageCount,
                                        RootManifestImageCount = loaded.RootManifestImageCount,
                                        System32ImageCount = loaded.System32ImageCount,
                                        LoadedImageEvidenceSha256 = loaded.EvidenceSha256
                                    };
                                } catch {
                                    coordinator.RequestTermination();
                                    WaitForSingleObject(process, 5000);
                                    stdout.JoinAndReport(); stderr.JoinAndReport(); status.JoinAndReport();
                                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                                }
                            }
                        }
                    } finally {
                        Marshal.FreeHGlobal(environment);
                        Marshal.FreeHGlobal(inherited);
                        if (startup.AttributeList != IntPtr.Zero) {
                            DeleteProcThreadAttributeList(startup.AttributeList);
                            Marshal.FreeHGlobal(startup.AttributeList);
                        }
                    }
                }
            }

            internal bool LoadedImagesAreWithin(RootManifestBoundary rootManifestFiles,
                HeldDirectory system32Root) {
                return loadedImagesValid && rootManifestFiles != null && system32Root != null &&
                    LoadedImageCount == RootManifestImageCount + System32ImageCount &&
                    LoadedImageCount > 0 && LoadedImageEvidenceSha256.Length == 64;
            }
        }

        private static void WriteControl(FileStream control, byte value) {
            control.WriteByte(value);
            control.Flush();
        }

        private sealed class TerminalCoordinator : IDisposable
        {
            private readonly object gate = new object();
            private readonly OwnedJob job;
            private readonly ManualResetEvent terminationEvent = new ManualResetEvent(false);
            private bool terminationRequested;
            private bool exitSignaled;

            internal TerminalCoordinator(OwnedJob ownedJob) { job = ownedJob; }

            internal bool TerminationRequested { get { lock (gate) return terminationRequested; } }

            internal void ObserveAtBarrier(SafeWaitHandle process, Action action) {
                lock (gate) {
                    if (terminationRequested || exitSignaled ||
                        WaitForSingleObject(process, 0) != WaitTimeout)
                        throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                    action();
                    if (terminationRequested || exitSignaled ||
                        WaitForSingleObject(process, 0) != WaitTimeout)
                        throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                }
            }

            internal void RequestTermination() {
                lock (gate) {
                    if (terminationRequested) return;
                    terminationRequested = true;
                    terminationEvent.Set();
                    job.Terminate();
                }
            }

            internal void MarkExitSignaled() {
                lock (gate) {
                    if (exitSignaled) throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                    exitSignaled = true;
                }
            }

            public void Dispose() { terminationEvent.Dispose(); }
        }

        private sealed class BarrierStatusReader : IDisposable
        {
            private static readonly byte[] Ready = Encoding.ASCII.GetBytes("READY_V1\n");
            private static readonly byte[] Loaded = Encoding.ASCII.GetBytes("LOADED_V1\n");
            private readonly SafeFileHandle handle;
            private readonly ManualResetEvent ready = new ManualResetEvent(false);
            private readonly ManualResetEvent loaded = new ManualResetEvent(false);
            private Thread worker;
            private Exception failure;
            internal bool SawReady { get; private set; }
            internal bool SawLoaded { get; private set; }

            internal BarrierStatusReader(SafeFileHandle statusHandle) { handle = statusHandle; }
            internal void Start() { worker = new Thread(ReadFrames); worker.IsBackground = true; worker.Start(); }

            private static void ReadExact(FileStream stream, byte[] expected) {
                byte[] value = new byte[expected.Length];
                int offset = 0;
                while (offset < value.Length) {
                    int count = stream.Read(value, offset, value.Length - offset);
                    if (count == 0) throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                    offset += count;
                }
                for (int index = 0; index < value.Length; index++)
                    if (value[index] != expected[index])
                        throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
            }

            private void ReadFrames() {
                try {
                    using (FileStream stream = new FileStream(handle, FileAccess.Read, 19, false)) {
                        ReadExact(stream, Ready); SawReady = true; ready.Set();
                        ReadExact(stream, Loaded); SawLoaded = true; loaded.Set();
                        if (stream.ReadByte() != -1)
                            throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                    }
                } catch (Exception error) { failure = error; ready.Set(); loaded.Set(); }
            }

            private void WaitFrame(ManualResetEvent frame, SafeWaitHandle process,
                TerminalCoordinator coordinator, int milliseconds) {
                Stopwatch timer = Stopwatch.StartNew();
                while (!frame.WaitOne(5)) {
                    if (coordinator.TerminationRequested ||
                        WaitForSingleObject(process, 0) == WaitObject0 ||
                        timer.ElapsedMilliseconds >= milliseconds)
                        throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
                }
                if (failure != null)
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
            }

            internal void WaitReady(SafeWaitHandle process, TerminalCoordinator coordinator, int milliseconds)
            { WaitFrame(ready, process, coordinator, milliseconds); }
            internal void WaitLoaded(SafeWaitHandle process, TerminalCoordinator coordinator, int milliseconds)
            { WaitFrame(loaded, process, coordinator, milliseconds); }
            internal bool JoinAndReport() { return worker.Join(5000) && failure == null; }
            public void Dispose() { ready.Dispose(); loaded.Dispose(); }
        }

        private sealed class SharedCaptureBudget
        {
            private readonly object sync = new object();
            private readonly int cap;
            private readonly Action terminate;
            private int accepted;
            private bool overflowed;
            private bool terminationSignaled;

            internal SharedCaptureBudget(int maximum, Action terminateOnce) {
                cap = maximum; terminate = terminateOnce;
            }

            internal bool TryReserve(int count) {
                bool signal = false;
                lock (sync) {
                    if (overflowed) return false;
                    if (count < 1 || accepted > cap - count) {
                        overflowed = true;
                        if (!terminationSignaled) { terminationSignaled = true; signal = true; }
                    } else {
                        accepted = checked(accepted + count);
                        return true;
                    }
                }
                if (signal) terminate();
                return false;
            }

            internal int AcceptedByteCount { get { lock (sync) return accepted; } }
            internal bool Overflowed { get { lock (sync) return overflowed; } }
        }

        private sealed class BoundedCapture
        {
            private readonly SafeFileHandle handle;
            private readonly SharedCaptureBudget budget;
            private readonly MemoryStream bytes = new MemoryStream();
            private Thread worker;
            private Exception failure;
            internal BoundedCapture(SafeFileHandle value, SharedCaptureBudget sharedBudget) {
                handle = value; budget = sharedBudget;
            }
            internal void Start() { worker = new Thread(ReadAll); worker.IsBackground = true; worker.Start(); }
            private void ReadAll() {
                try {
                    byte[] buffer = new byte[512];
                    using (FileStream stream = new FileStream(handle, FileAccess.Read, 512, false)) {
                        while (true) {
                            int count = stream.Read(buffer, 0, buffer.Length);
                            if (count == 0) break;
                            if (budget.TryReserve(count)) bytes.Write(buffer, 0, count);
                        }
                    }
                } catch (Exception error) { failure = error; }
            }
            internal bool JoinAndReport() { return worker.Join(5000) && failure == null; }
            internal int Count { get { return checked((int)bytes.Length); } }
            internal byte[] Bytes { get { return bytes.ToArray(); } }
        }

        private static class GlobalSnapshot
        {
            private static readonly string[] ComponentNames = new[] {
                "pathEnvironmentSha256", "modulePathSha256", "nugetEnvironmentSha256",
                "proxyEnvironmentSha256", "powerShellProfileInventorySha256", "gacInventorySha256",
                "nugetCacheInventorySha256", "repositoryStatusSha256", "serviceTaskInventorySha256",
                "autorunRegistrySha256"
            };

            internal static string CaptureClosedDigest() {
                Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.Ordinal) {
                    { "pathEnvironmentSha256", HashEnvironment(new[] { "PATH" }) },
                    { "modulePathSha256", HashEnvironment(new[] { "PSModulePath" }) },
                    { "nugetEnvironmentSha256", HashEnvironment(new[] { "NUGET_PACKAGES", "NUGET_HTTP_CACHE_PATH", "NUGET_PLUGINS_CACHE_PATH" }) },
                    { "proxyEnvironmentSha256", HashEnvironment(new[] { "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY" }) },
                    { "powerShellProfileInventorySha256", HashFixedInventory(PowerShellProfileRoots()) },
                    { "gacInventorySha256", HashFixedInventory(GacRoots()) },
                    { "nugetCacheInventorySha256", HashFixedInventory(NuGetCacheRoots()) },
                    { "repositoryStatusSha256", HashFixedInventory(new[] { Environment.CurrentDirectory }) },
                    { "serviceTaskInventorySha256", HashServiceAndTaskInventory() },
                    { "autorunRegistrySha256", HashAutorunRegistry() }
                };
                StringBuilder canonical = new StringBuilder("schemaVersion\01\ncomplete\0true\n");
                foreach (string name in ComponentNames)
                    canonical.Append(name).Append('\0').Append(values[name]).Append('\n');
                string aggregate = Sha256Utf8(canonical.ToString());
                canonical.Append("aggregateSha256\0").Append(aggregate).Append('\n');
                return canonical.ToString();
            }

            private static string HashEnvironment(string[] names) {
                StringBuilder rows = new StringBuilder();
                foreach (string name in names)
                    rows.Append(name).Append('\0').Append(Environment.GetEnvironmentVariable(name) ?? "").Append('\n');
                return Sha256Utf8(rows.ToString());
            }

            private static string HashFixedInventory(IEnumerable<string> roots) {
                List<string> rows = new List<string>();
                long byteCount = 0;
                int entryCount = 0;
                foreach (string root in roots) {
                    if (String.IsNullOrEmpty(root)) continue;
                    string full = Path.GetFullPath(root);
                    if (!Directory.Exists(full)) { rows.Add("A\0" + Sha256Utf8(full) + "\n"); continue; }
                    WalkInventory(full, full, rows, ref entryCount, ref byteCount);
                }
                rows.Sort(StringComparer.Ordinal);
                return Sha256Utf8(String.Join("", rows.ToArray()));
            }

            private static void WalkInventory(string root, string current, List<string> rows,
                ref int entryCount, ref long byteCount) {
                foreach (string entry in Directory.EnumerateFileSystemEntries(current, "*",
                    SearchOption.TopDirectoryOnly)) {
                    checked { entryCount++; }
                    if (entryCount > 100000)
                        throw new InvalidOperationException("REVIEWED_LOCAL_GLOBAL_MUTATION_INVALID");
                    FileAttributes attributes = File.GetAttributes(entry);
                    string relative = entry.Substring(root.Length).TrimStart('\\').Replace('\\', '/');
                    if ((attributes & FileAttributes.ReparsePoint) != 0) {
                        rows.Add("L\0" + Sha256Utf8(root) + "\0" + relative + "\0" +
                            ((uint)attributes).ToString(System.Globalization.CultureInfo.InvariantCulture) + "\n");
                        continue;
                    }
                    if ((attributes & FileAttributes.Directory) != 0) {
                        rows.Add("D\0" + Sha256Utf8(root) + "\0" + relative + "/\n");
                        WalkInventory(root, entry, rows, ref entryCount, ref byteCount);
                        continue;
                    }
                    FileInfo information = new FileInfo(entry);
                    checked { byteCount += information.Length; }
                    if (byteCount > 16L * 1024L * 1024L * 1024L)
                        throw new InvalidOperationException("REVIEWED_LOCAL_GLOBAL_MUTATION_INVALID");
                    string contentHash;
                    using (FileStream stream = new FileStream(entry, FileMode.Open, FileAccess.Read,
                        FileShare.Read))
                    using (SHA256 digest = SHA256.Create())
                        contentHash = Convert.ToHexString(digest.ComputeHash(stream)).ToLowerInvariant();
                    rows.Add("F\0" + Sha256Utf8(root) + "\0" + relative + "\0" +
                        information.Length.ToString(System.Globalization.CultureInfo.InvariantCulture) +
                        "\0" + contentHash + "\n");
                }
            }

            private static IEnumerable<string> PowerShellProfileRoots() {
                string documents = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
                return new[] { Path.Combine(documents, "WindowsPowerShell"), Path.Combine(documents, "PowerShell") };
            }
            private static IEnumerable<string> GacRoots() {
                string windows = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
                return new[] { Path.Combine(windows, "assembly"), Path.Combine(windows, "Microsoft.NET", "assembly") };
            }
            private static IEnumerable<string> NuGetCacheRoots() {
                string explicitRoot = Environment.GetEnvironmentVariable("NUGET_PACKAGES") ?? "";
                string profile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                return new[] { explicitRoot, Path.Combine(profile, ".nuget", "packages") };
            }
            private static string HashServiceAndTaskInventory() {
                string windows = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
                string tasks = Path.Combine(windows, "System32", "Tasks");
                string serviceHash = HashRegistryTree(Registry.LocalMachine,
                    @"SYSTEM\CurrentControlSet\Services");
                return Sha256Utf8(serviceHash + "\n" + HashFixedInventory(new[] { tasks }) + "\n");
            }
            private static string HashAutorunRegistry() {
                return Sha256Utf8(
                    HashRegistryTree(Registry.LocalMachine, @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run") + "\n" +
                    HashRegistryTree(Registry.CurrentUser, @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run") + "\n");
            }
            private static string HashRegistryTree(RegistryKey hive, string path) {
                List<string> rows = new List<string>();
                using (RegistryKey key = hive.OpenSubKey(path, false)) {
                    if (key == null) return Sha256Utf8("ABSENT\n");
                    WalkRegistry(key, "", rows);
                }
                rows.Sort(StringComparer.Ordinal);
                return Sha256Utf8(String.Join("", rows.ToArray()));
            }
            private static void WalkRegistry(RegistryKey key, string relative, List<string> rows) {
                foreach (string name in key.GetValueNames()) {
                    object value = key.GetValue(name, null, RegistryValueOptions.DoNotExpandEnvironmentNames);
                    rows.Add("V\0" + relative + "\0" + name + "\0" +
                        Sha256Utf8(value == null ? "NULL" : value.ToString()) + "\n");
                }
                foreach (string childName in key.GetSubKeyNames()) {
                    using (RegistryKey child = key.OpenSubKey(childName, false)) {
                        if (child == null) throw new InvalidOperationException("REVIEWED_LOCAL_GLOBAL_MUTATION_INVALID");
                        string childRelative = relative.Length == 0 ? childName : relative + "/" + childName;
                        rows.Add("K\0" + childRelative + "\n");
                        WalkRegistry(child, childRelative, rows);
                    }
                }
            }
        }

        private static string ReadWindowsDirectory() {
            StringBuilder value = new StringBuilder(32768);
            uint count = GetWindowsDirectoryW(value, (uint)value.Capacity);
            if (count == 0 || count >= value.Capacity)
                throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
            return Path.GetFullPath(value.ToString());
        }

        private static string ReadSystemDirectory() {
            StringBuilder value = new StringBuilder(32768);
            uint count = GetSystemDirectoryW(value, (uint)value.Capacity);
            if (count == 0 || count >= value.Capacity)
                throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
            return Path.GetFullPath(value.ToString());
        }

        private static string Quote(string value) {
            if (value == null) throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
            StringBuilder result = new StringBuilder("\"");
            int slashes = 0;
            foreach (char character in value) {
                if (character == '\\') { slashes++; continue; }
                if (character == '"') {
                    result.Append('\\', checked(slashes * 2 + 1)).Append('"');
                    slashes = 0;
                    continue;
                }
                result.Append('\\', slashes).Append(character);
                slashes = 0;
            }
            result.Append('\\', checked(slashes * 2)).Append('"');
            return result.ToString();
        }

        private static string Sha256Utf8(string value) {
            return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
        }

        private static void VerifySpawnedImage(SafeWaitHandle process, HeldFile expected) {
            StringBuilder observedPath = new StringBuilder(32768);
            uint length = (uint)observedPath.Capacity;
            if (!QueryFullProcessImageNameW(process, 0, observedPath, ref length) || length == 0)
                throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
            string observed = Path.GetFullPath(observedPath.ToString());
            if (!String.Equals(observed, expected.FinalPath, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
            IntPtr observedHandle = CreateFileW(observed, 0x80000000, FileShareRead, IntPtr.Zero, 3,
                FileFlagOpenReparsePoint, IntPtr.Zero);
            if (observedHandle == new IntPtr(-1))
                throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
            try {
                RejectReparseMountOrWrongKind(observedHandle);
                if (QueryVolumeSerial(observedHandle) != expected.VolumeSerial)
                    throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
            } finally { CloseHandle(observedHandle); }
        }

        private static void RejectNamespace(string path)
        {
            if (String.IsNullOrEmpty(path) || path.StartsWith("\\\\", StringComparison.Ordinal) ||
                path.StartsWith("\\\\?\\", StringComparison.Ordinal) || path.Contains("GLOBALROOT") ||
                path.IndexOf(':', 2) >= 0 || path.Contains(".."))
                throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
        }
        private static void RejectReparseMountOrWrongKind(IntPtr handle)
        {
            ByHandleFileInformation information;
            if (handle == IntPtr.Zero || !GetFileInformationByHandle(handle, out information) ||
                (information.FileAttributes & (uint)FileAttributes.ReparsePoint) != 0)
                throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
        }
        private static ulong QueryVolumeSerial(IntPtr handle)
        {
            FileIdInfo information;
            if (!GetFileInformationByHandleEx(handle, 18, out information, Marshal.SizeOf(typeof(FileIdInfo))))
                throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
            return information.VolumeSerialNumber;
        }
        private static byte[] QueryFileIdentity(IntPtr handle)
        {
            FileIdInfo information;
            if (!GetFileInformationByHandleEx(handle, 18, out information, Marshal.SizeOf(typeof(FileIdInfo))))
                throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
            byte[] identity = new byte[24];
            Buffer.BlockCopy(BitConverter.GetBytes(information.VolumeSerialNumber), 0, identity, 0, 8);
            Buffer.BlockCopy(information.FileId, 0, identity, 8, 16);
            return identity;
        }
        private static string ToLowerHex(byte[] value) {
            return Convert.ToHexString(value).ToLowerInvariant();
        }
        private static long QueryFileLength(IntPtr handle) {
            using (SafeFileHandle safe = new SafeFileHandle(handle, false))
            using (FileStream stream = new FileStream(safe, FileAccess.Read)) return stream.Length;
        }
        private static string QueryFinalPath(IntPtr handle) {
            StringBuilder value = new StringBuilder(32768);
            uint count = GetFinalPathNameByHandleW(handle, value, (uint)value.Capacity, 0);
            if (count == 0 || count >= value.Capacity)
                throw new InvalidOperationException("REVIEWED_LOCAL_ROOT_MANIFEST_INVALID");
            string path = value.ToString();
            return path.StartsWith("\\\\?\\", StringComparison.Ordinal) ? path.Substring(4) : path;
        }
        private static void VerifyHeldHandleSha256(IntPtr handle, string expected)
        {
            if (expected.Length != 64) throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
            string observed = HashHeldHandleSha256(handle);
            if (!String.Equals(observed, expected, StringComparison.Ordinal))
                throw new InvalidOperationException("REVIEWED_LOCAL_PROCESS_OWNERSHIP_INVALID");
        }

        private static string HashHeldHandleSha256(IntPtr handle)
        {
            using (SafeFileHandle safe = new SafeFileHandle(handle, false))
            using (FileStream stream = new FileStream(safe, FileAccess.Read)) {
                stream.Position = 0;
                return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
            }
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct FileIdInfo { internal ulong VolumeSerialNumber; [MarshalAs(UnmanagedType.ByValArray, SizeConst = 16)] internal byte[] FileId; }
        [StructLayout(LayoutKind.Sequential)]
        private struct ByHandleFileInformation {
            internal uint FileAttributes; internal System.Runtime.InteropServices.ComTypes.FILETIME CreationTime;
            internal System.Runtime.InteropServices.ComTypes.FILETIME LastAccessTime; internal System.Runtime.InteropServices.ComTypes.FILETIME LastWriteTime;
            internal uint VolumeSerialNumber, FileSizeHigh, FileSizeLow, NumberOfLinks, FileIndexHigh, FileIndexLow;
        }
        [StructLayout(LayoutKind.Sequential)]
        private struct SecurityAttributes { internal int Length; internal IntPtr SecurityDescriptor; internal int InheritHandle; }
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct StartupInfo {
            internal int cb; internal string reserved, desktop, title;
            internal int x, y, xSize, ySize, xChars, yChars, fill, dwFlags;
            internal short showWindow, reservedBytes; internal IntPtr reservedPointer, hStdInput, hStdOutput, hStdError;
        }
        [StructLayout(LayoutKind.Sequential)]
        private struct StartupInfoEx { internal StartupInfo StartupInfo; internal IntPtr AttributeList; }
        [StructLayout(LayoutKind.Sequential)]
        private struct ProcessInformation { internal IntPtr Process, Thread; internal uint ProcessId, ThreadId; }
        [StructLayout(LayoutKind.Sequential)]
        private struct JobBasicLimitInformation {
            internal long PerProcessUserTime, PerJobUserTime; internal uint LimitFlags;
            internal UIntPtr MinimumWorkingSet, MaximumWorkingSet; internal uint ActiveProcessLimit;
            internal UIntPtr Affinity; internal uint PriorityClass, SchedulingClass;
        }
        [StructLayout(LayoutKind.Sequential)]
        private struct IoCounters { internal ulong ReadOperations, WriteOperations, OtherOperations, ReadBytes, WriteBytes, OtherBytes; }
        [StructLayout(LayoutKind.Sequential)]
        private struct JobExtendedLimitInformation {
            internal JobBasicLimitInformation BasicLimitInformation; internal IoCounters IoInfo;
            internal UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemory, PeakJobMemory;
        }
        [StructLayout(LayoutKind.Sequential)]
        private struct JobBasicAccountingInformation {
            internal long TotalUserTime, TotalKernelTime, PeriodUserTime, PeriodKernelTime;
            internal uint TotalPageFaultCount, TotalProcesses, ActiveProcesses, TotalTerminatedProcesses;
        }

        private const uint StartfUseStdHandles = 0x00000100;
        private const uint CreateSuspended = 0x00000004;
        private const uint CreateNoWindow = 0x08000000;
        private const uint CreateUnicodeEnvironment = 0x00000400;
        private const uint ExtendedStartupInfoPresent = 0x00080000;
        private const uint JobObjectLimitActiveProcess = 0x00000008;
        private const uint JobObjectLimitKillOnJobClose = 0x00002000;
        private const uint WaitObject0 = 0;
        private const uint WaitTimeout = 258;
        private static readonly IntPtr ProcThreadAttributeHandleList = new IntPtr(0x00020002);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr CreateFileW(string name, uint access, uint share, IntPtr security,
            uint creation, uint flags, IntPtr template);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern uint GetWindowsDirectoryW(StringBuilder path, uint pathLength);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern uint GetSystemDirectoryW(StringBuilder path, uint pathLength);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern uint GetFinalPathNameByHandleW(IntPtr handle, StringBuilder path,
            uint pathLength, uint flags);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr handle);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool GetFileInformationByHandle(IntPtr handle, out ByHandleFileInformation information);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool GetFileInformationByHandleEx(IntPtr handle, int informationClass,
            out FileIdInfo information, int informationSize);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CreatePipe(out SafeFileHandle read, out SafeFileHandle write,
            ref SecurityAttributes attributes, uint size);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetHandleInformation(SafeFileHandle handle, uint mask, uint flags);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool CreateProcessW(string application, StringBuilder command,
            IntPtr processAttributes, IntPtr threadAttributes, bool inheritHandles, uint flags,
            IntPtr environment, string currentDirectory, ref StartupInfoEx startup,
            out ProcessInformation processInformation);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags,
            ref IntPtr size);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attribute,
            IntPtr value, IntPtr size, IntPtr previous, IntPtr returnedSize);
        [DllImport("kernel32.dll")]
        private static extern void DeleteProcThreadAttributeList(IntPtr list);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern SafeWaitHandle CreateJobObjectW(IntPtr attributes, string name);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetInformationJobObject(SafeWaitHandle job, int informationClass,
            ref JobExtendedLimitInformation information, uint informationLength);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool AssignProcessToJobObject(SafeWaitHandle job, SafeWaitHandle process);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool QueryInformationJobObject(SafeWaitHandle job, int informationClass,
            out JobBasicAccountingInformation information, uint informationLength, IntPtr returnedLength);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool TerminateJobObject(SafeWaitHandle job, uint exitCode);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern uint ResumeThread(SafeWaitHandle thread);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern uint WaitForSingleObject(SafeWaitHandle handle, uint milliseconds);
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool GetExitCodeProcess(SafeWaitHandle process, out uint exitCode);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool QueryFullProcessImageNameW(SafeWaitHandle process, uint flags,
            StringBuilder imagePath, ref uint size);
        [DllImport("iphlpapi.dll", SetLastError = true)]
        private static extern uint GetExtendedTcpTable(IntPtr table, ref uint size, bool order,
            uint family, int tableClass, uint reserved);
        [DllImport("iphlpapi.dll", SetLastError = true)]
        private static extern uint GetExtendedUdpTable(IntPtr table, ref uint size, bool order,
            uint family, int tableClass, uint reserved);
    }
}
