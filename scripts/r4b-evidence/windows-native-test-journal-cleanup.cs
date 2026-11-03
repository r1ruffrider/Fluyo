using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32.SafeHandles;

public static class FluyoTestJournalCleanup
{
    private const uint GENERIC_READ = 0x80000000;
    private const uint FILE_READ_ATTRIBUTES = 0x00000080;
    private const uint FILE_LIST_DIRECTORY = 0x00000001;
    private const uint DELETE = 0x00010000;
    private const uint SYNCHRONIZE = 0x00100000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint OPEN_EXISTING = 3;
    private const uint FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;
    private const uint FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000;
    private const uint FILE_ATTRIBUTE_NORMAL = 0x00000080;
    private const uint FILE_ATTRIBUTE_DIRECTORY = 0x00000010;
    private const uint FILE_ATTRIBUTE_REPARSE_POINT = 0x00000400;
    private const uint DRIVE_FIXED = 3;
    private const uint FILE_DISPOSITION_FLAG_DELETE = 0x00000001;
    private const uint FILE_DISPOSITION_FLAG_POSIX_SEMANTICS = 0x00000002;
    private const uint FILE_DISPOSITION_FLAG_IGNORE_READONLY_ATTRIBUTE = 0x00000010;
    private const int FileAttributeTagInfo = 9;
    private const int FileIdInfo = 18;
    private const int FileDispositionInfo = 4;
    private const int FileDispositionInfoEx = 21;
    private const int ErrorFileNotFound = 2;
    private const int ErrorPathNotFound = 3;
    private const int MaximumFiles = 1024;
    private const long MaximumFileBytes = 16L * 1024L * 1024L;
    private const long MaximumTotalBytes = 512L * 1024L * 1024L;

    [StructLayout(LayoutKind.Sequential)]
    private struct FILE_ATTRIBUTE_TAG_INFO { public uint FileAttributes; public uint ReparseTag; }

    [StructLayout(LayoutKind.Sequential)]
    private struct FILE_ID_INFO
    {
        public ulong VolumeSerialNumber;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 16)] public byte[] FileId;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct FILE_DISPOSITION_INFO { [MarshalAs(UnmanagedType.Bool)] public bool DeleteFile; }

    [StructLayout(LayoutKind.Sequential)]
    private struct FILE_DISPOSITION_INFO_EX { public uint Flags; }

    private sealed class Identity
    {
        public ulong Volume;
        public string FileId;
        public string FinalPath;
    }

    private sealed class Record
    {
        public string Name;
        public long Bytes;
        public string Sha256;
        public Identity Identity;
        public SafeFileHandle Handle;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFileW(string path, uint access, uint share, IntPtr security,
        uint disposition, uint flags, IntPtr template);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetFileInformationByHandleEx(SafeFileHandle handle, int infoClass,
        out FILE_ATTRIBUTE_TAG_INFO info, uint size);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetFileInformationByHandleEx(SafeFileHandle handle, int infoClass,
        out FILE_ID_INFO info, uint size);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern uint GetFinalPathNameByHandleW(SafeFileHandle handle, StringBuilder path,
        uint count, uint flags);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetFileInformationByHandle(SafeFileHandle handle, int infoClass,
        IntPtr info, uint size);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool GetVolumePathNameW(string fileName, StringBuilder volumePath, uint count);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool GetVolumeInformationW(string rootPath, StringBuilder volumeName,
        uint volumeNameSize, out uint serial, out uint maximumComponentLength, out uint flags,
        StringBuilder fileSystemName, uint fileSystemNameSize);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern uint GetDriveTypeW(string rootPath);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern uint GetFileAttributesW(string path);

    private static void Win32(bool result, string operation)
    {
        if (!result) throw new Win32Exception(Marshal.GetLastWin32Error(), operation);
    }

    private static string Canonical(string path)
    {
        string value = path.StartsWith("\\\\?\\", StringComparison.Ordinal) ? path.Substring(4) : path;
        return Path.GetFullPath(value).TrimEnd(Path.DirectorySeparatorChar);
    }

    private static string Hex(byte[] value)
    {
        StringBuilder result = new StringBuilder(value.Length * 2);
        foreach (byte item in value) result.Append(item.ToString("x2", CultureInfo.InvariantCulture));
        return result.ToString();
    }

    private static bool LowerHex(string value, int length)
    {
        return value != null && value.Length == length && value.All(character =>
            (character >= '0' && character <= '9') || (character >= 'a' && character <= 'f'));
    }

    private static SafeFileHandle Open(string path, uint access, uint share, bool directory)
    {
        uint flags = FILE_FLAG_OPEN_REPARSE_POINT | (directory ? FILE_FLAG_BACKUP_SEMANTICS : FILE_ATTRIBUTE_NORMAL);
        SafeFileHandle handle = CreateFileW(path, access, share, IntPtr.Zero, OPEN_EXISTING, flags, IntPtr.Zero);
        if (handle == null || handle.IsInvalid)
        {
            int error = Marshal.GetLastWin32Error();
            if (handle != null) handle.Dispose();
            throw new Win32Exception(error, "CreateFileW(test journal cleanup)");
        }
        return handle;
    }

    private static Identity Inspect(SafeFileHandle handle, string expectedPath, bool directory)
    {
        FILE_ATTRIBUTE_TAG_INFO tags;
        Win32(GetFileInformationByHandleEx(handle, FileAttributeTagInfo, out tags,
            (uint)Marshal.SizeOf(typeof(FILE_ATTRIBUTE_TAG_INFO))), "GetFileInformationByHandleEx(attributes)");
        if ((tags.FileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0)
            throw new InvalidDataException("TEST_JOURNAL_REPARSE");
        if (((tags.FileAttributes & FILE_ATTRIBUTE_DIRECTORY) != 0) != directory)
            throw new InvalidDataException("TEST_JOURNAL_KIND");
        FILE_ID_INFO id;
        id.FileId = new byte[16];
        Win32(GetFileInformationByHandleEx(handle, FileIdInfo, out id,
            (uint)Marshal.SizeOf(typeof(FILE_ID_INFO))), "GetFileInformationByHandleEx(identity)");
        StringBuilder final = new StringBuilder(32768);
        uint length = GetFinalPathNameByHandleW(handle, final, (uint)final.Capacity, 0);
        if (length == 0 || length >= final.Capacity)
            throw new Win32Exception(Marshal.GetLastWin32Error(), "GetFinalPathNameByHandleW");
        string actual = Canonical(final.ToString());
        string expected = Canonical(expectedPath);
        if (!String.Equals(actual, expected, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("TEST_JOURNAL_FINAL_PATH");
        return new Identity { Volume = id.VolumeSerialNumber, FileId = Hex(id.FileId), FinalPath = expected };
    }

    private static void AssertFixedNtfs(string path)
    {
        if (path.StartsWith("\\\\", StringComparison.Ordinal)) throw new InvalidDataException("TEST_JOURNAL_REMOTE");
        StringBuilder volume = new StringBuilder(260);
        Win32(GetVolumePathNameW(path, volume, (uint)volume.Capacity), "GetVolumePathNameW");
        if (GetDriveTypeW(volume.ToString()) != DRIVE_FIXED) throw new InvalidDataException("TEST_JOURNAL_NON_FIXED");
        StringBuilder name = new StringBuilder(260);
        StringBuilder fileSystem = new StringBuilder(64);
        uint serial, maximumComponent, flags;
        Win32(GetVolumeInformationW(volume.ToString(), name, (uint)name.Capacity, out serial,
            out maximumComponent, out flags, fileSystem, (uint)fileSystem.Capacity), "GetVolumeInformationW");
        if (!String.Equals(fileSystem.ToString(), "NTFS", StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("TEST_JOURNAL_NON_NTFS");
    }

    private static byte[] ReadBounded(SafeFileHandle handle, long maximum)
    {
        using (FileStream stream = new FileStream(new SafeFileHandle(handle.DangerousGetHandle(), false),
            FileAccess.Read, 65536, false))
        {
            if (stream.Length < 0 || stream.Length > maximum) throw new InvalidDataException("TEST_JOURNAL_FILE_BOUND");
            stream.Position = 0;
            byte[] bytes = new byte[stream.Length];
            int offset = 0;
            while (offset < bytes.Length)
            {
                int count = stream.Read(bytes, offset, bytes.Length - offset);
                if (count == 0) throw new EndOfStreamException("TEST_JOURNAL_TRUNCATED");
                offset += count;
            }
            return bytes;
        }
    }

    private static string Sha256(byte[] value)
    {
        using (SHA256 hash = SHA256.Create()) return Hex(hash.ComputeHash(value));
    }

    private static void MarkDelete(SafeFileHandle handle)
    {
        FILE_DISPOSITION_INFO_EX extended = new FILE_DISPOSITION_INFO_EX
        {
            Flags = FILE_DISPOSITION_FLAG_DELETE | FILE_DISPOSITION_FLAG_POSIX_SEMANTICS |
                FILE_DISPOSITION_FLAG_IGNORE_READONLY_ATTRIBUTE
        };
        IntPtr pointer = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(FILE_DISPOSITION_INFO_EX)));
        try
        {
            Marshal.StructureToPtr(extended, pointer, false);
            if (!SetFileInformationByHandle(handle, FileDispositionInfoEx, pointer,
                (uint)Marshal.SizeOf(typeof(FILE_DISPOSITION_INFO_EX))))
            {
                FILE_DISPOSITION_INFO fallback = new FILE_DISPOSITION_INFO { DeleteFile = true };
                Marshal.StructureToPtr(fallback, pointer, false);
                Win32(SetFileInformationByHandle(handle, FileDispositionInfo, pointer,
                    (uint)Marshal.SizeOf(typeof(FILE_DISPOSITION_INFO))), "SetFileInformationByHandle");
            }
        }
        finally { Marshal.FreeHGlobal(pointer); }
    }

    public static string Cleanup(string runId)
    {
        if (!LowerHex(runId, 64)) throw new InvalidDataException("TEST_JOURNAL_RUN_ID");
        string temp = Canonical(Path.GetTempPath());
        string parent = Path.Combine(temp, "fluyo-native-test-broker-journals");
        string run = Path.Combine(parent, runId);
        AssertFixedNtfs(temp);
        uint attributes = GetFileAttributesW(run);
        if (attributes == 0xffffffff)
        {
            int error = Marshal.GetLastWin32Error();
            if (error == ErrorFileNotFound || error == ErrorPathNotFound) return "ABSENT";
            throw new Win32Exception(error, "GetFileAttributesW(test journal run)");
        }
        List<Record> records = new List<Record>();
        using (SafeFileHandle tempHandle = Open(temp, FILE_READ_ATTRIBUTES | FILE_LIST_DIRECTORY | SYNCHRONIZE,
            FILE_SHARE_READ | FILE_SHARE_WRITE, true))
        using (SafeFileHandle parentHandle = Open(parent, FILE_READ_ATTRIBUTES | FILE_LIST_DIRECTORY | SYNCHRONIZE,
            FILE_SHARE_READ | FILE_SHARE_WRITE, true))
        using (SafeFileHandle runHandle = Open(run, FILE_READ_ATTRIBUTES | FILE_LIST_DIRECTORY | DELETE | SYNCHRONIZE,
            FILE_SHARE_READ | FILE_SHARE_WRITE, true))
        {
            Inspect(tempHandle, temp, true);
            Inspect(parentHandle, parent, true);
            Inspect(runHandle, run, true);
            long total = 0;
            try
            {
                foreach (string path in Directory.EnumerateFileSystemEntries(run).OrderBy(value => value, StringComparer.Ordinal))
                {
                    string name = Path.GetFileName(path);
                    if (!name.EndsWith(".journal", StringComparison.Ordinal) ||
                        !LowerHex(name.Substring(0, name.Length - 8), 64))
                        throw new InvalidDataException("TEST_JOURNAL_NAME");
                    if (records.Count >= MaximumFiles) throw new InvalidDataException("TEST_JOURNAL_FILE_COUNT");
                    SafeFileHandle file = Open(path, GENERIC_READ | FILE_READ_ATTRIBUTES | DELETE | SYNCHRONIZE,
                        FILE_SHARE_READ, false);
                    try
                    {
                        Identity identity = Inspect(file, path, false);
                        byte[] bytes = ReadBounded(file, MaximumFileBytes);
                        total += bytes.LongLength;
                        if (total > MaximumTotalBytes) throw new InvalidDataException("TEST_JOURNAL_TOTAL_BOUND");
                        records.Add(new Record { Name = name, Bytes = bytes.LongLength, Sha256 = Sha256(bytes),
                            Identity = identity, Handle = file });
                        file = null;
                    }
                    finally { if (file != null) file.Dispose(); }
                }
                string[] current = Directory.EnumerateFileSystemEntries(run)
                    .Select(Path.GetFileName).OrderBy(value => value, StringComparer.Ordinal).ToArray();
                string[] expected = records.Select(value => value.Name)
                    .OrderBy(value => value, StringComparer.Ordinal).ToArray();
                if (!current.SequenceEqual(expected)) throw new InvalidDataException("TEST_JOURNAL_ENTRY_DRIFT");
                foreach (Record record in records)
                {
                    string path = Path.Combine(run, record.Name);
                    Identity identity = Inspect(record.Handle, path, false);
                    if (identity.Volume != record.Identity.Volume || identity.FileId != record.Identity.FileId)
                        throw new InvalidDataException("TEST_JOURNAL_IDENTITY_DRIFT");
                    byte[] bytes = ReadBounded(record.Handle, record.Bytes);
                    if (bytes.LongLength != record.Bytes || Sha256(bytes) != record.Sha256)
                        throw new InvalidDataException("TEST_JOURNAL_CONTENT_DRIFT");
                }
                foreach (Record record in records)
                {
                    MarkDelete(record.Handle);
                    record.Handle.Dispose();
                    record.Handle = null;
                }
                MarkDelete(runHandle);
            }
            finally
            {
                foreach (Record record in records) if (record.Handle != null) record.Handle.Dispose();
            }
        }
        if (Directory.Exists(run)) throw new InvalidDataException("TEST_JOURNAL_RUN_REMAINS");
        return "REMOVED";
    }
}
