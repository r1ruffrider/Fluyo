using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;
using Microsoft.Win32.SafeHandles;

// Future-activation helper. It accepts one inherited read-only file HANDLE, never a path.
internal static class RoslynVerifierAuthenticode
{
    private const uint CERT_QUERY_OBJECT_BLOB = 2, CERT_QUERY_CONTENT_CATALOG = 6u, CERT_QUERY_CONTENT_PKCS7_SIGNED = 8u, CERT_QUERY_CONTENT_PKCS7_SIGNED_EMBED = 10u, CERT_QUERY_CONTENT_FLAG_CATALOG = 0x00000040u, CERT_QUERY_CONTENT_FLAG_PKCS7_SIGNED = 0x00000100u, CERT_QUERY_CONTENT_FLAG_PKCS7_SIGNED_EMBED = 0x00000400u, CERT_QUERY_CONTENT_FLAGS_V16 = 0x00000540u, CERT_QUERY_FORMAT_BINARY = 1u, CERT_QUERY_FORMAT_FLAG_BINARY = 0x00000002u;
    private const uint CERT_TRUST_REVOCATION_STATUS_UNKNOWN = 0x00000040u, CERT_TRUST_IS_OFFLINE_REVOCATION = 0x01000000u, REVOCATION_UNAVAILABLE_MASK = 0x01000040u;
    private const int CRYPT_E_NO_MATCH = unchecked((int)0x80092009);
    private const uint CERT_CHAIN_REVOCATION_CHECK_CHAIN = 0x20000000, CERT_CHAIN_CACHE_ONLY_URL_RETRIEVAL = 0x80000000;
    private const string CODE_SIGNING_EKU = "1.3.6.1.5.5.7.3.3", TIMESTAMP_EKU = "1.3.6.1.5.5.7.3.8";
    private const string LEGACY_COUNTERSIGN_OID = "1.2.840.113549.1.9.6", RFC3161_COUNTERSIGN_OID = "1.3.6.1.4.1.311.3.3.1", SIGNING_TIME_OID = "1.2.840.113549.1.9.5";
    private const uint X509_ASN_ENCODING_PKCS7 = 0x00010001, CMSG_SIGNER_COUNT_PARAM = 5, CMSG_SIGNER_INFO_PARAM = 6, CMSG_SIGNER_CERT_INFO_PARAM = 7, CMSG_ENCODED_SIGNER = 28;
    private const uint CMSG_CONTENT_PARAM = 2, CMSG_CTRL_VERIFY_SIGNATURE_EX = 19, CMSG_VERIFY_SIGNER_CERT = 2, CMSG_CTRL_ENABLE_STRONG_SIGNATURE = 21, CERT_STRONG_SIGN_OID_INFO_CHOICE = 2, CMSG_VERIFY_COUNTER_SIGN_ENABLE_STRONG_FLAG = 1;
    private const uint IMAGE_DIGEST_LEVEL_V16 = 0x7u;
    private const string SPC_INDIRECT_DATA_OBJID = "1.3.6.1.4.1.311.2.1.4", SHA256_OID = "2.16.840.1.101.3.4.2.1", STRONG_SIGN_OID = "1.3.6.1.4.1.311.72.1.1";
    private static readonly string[] EvidenceKeys = new string[] { "observedSha256","authenticodeObservedSha256","authenticodeFileIdentityBefore","authenticodeFileIdentityAfter","authenticodeHandlePolicy","authenticodeIdentityStable","authenticodeStatus","authenticodeSignatureType","codeSigningEku","signerSubject","signerThumbprint","signerIssuer","signerSerial","signerNotBeforeUtc","signerNotAfterUtc","signatureChainStatus","revocationNetworkPolicy","signerChainRevocationMode","signerChainRevocationFlag","signerChainVerificationFlags","signerRevocationEvidenceStatus","timestampSubject","timestampThumbprint","timestampUtc","timestampChainStatus","timestampChainRevocationMode","timestampChainRevocationFlag","timestampChainVerificationFlags","timestampRevocationEvidenceStatus","productVersion","fileVersion" };
    private static readonly Guid DriverActionVerify = new Guid("F750E6C3-38EE-11D1-85E-00C04FC295EE");
    private static readonly object ImageDigestLock = new object();

    [StructLayout(LayoutKind.Sequential)] private struct CryptDataBlob { public uint cbData; public IntPtr pbData; }
    [StructLayout(LayoutKind.Sequential)] private struct CmsgCtrlVerifySignatureExPara { public uint cbSize; public IntPtr hCryptProv; public uint dwSignerIndex,dwSignerType; public IntPtr pvSigner; }
    [StructLayout(LayoutKind.Sequential)] private struct CertStrongSignPara { public uint cbSize,dwInfoChoice; public IntPtr pszOID; }
    [StructLayout(LayoutKind.Sequential)] private struct CryptAttributeTypeValue { public IntPtr pszObjId; public CryptDataBlob Value; }
    [StructLayout(LayoutKind.Sequential)] private struct SipIndirectData { public CryptAttributeTypeValue Data; public CryptAlgorithmIdentifier DigestAlgorithm; public CryptDataBlob Digest; }
    [StructLayout(LayoutKind.Sequential)] private struct FileIdInfo { public ulong VolumeSerialNumber; [MarshalAs(UnmanagedType.ByValArray,SizeConst=16)] public byte[] FileId; }
    [StructLayout(LayoutKind.Sequential)] private struct CertEnhKeyUsage { public uint cUsageIdentifier; public IntPtr rgpszUsageIdentifier; }
    [StructLayout(LayoutKind.Sequential)] private struct CertUsageMatch { public uint dwType; public CertEnhKeyUsage Usage; }
    [StructLayout(LayoutKind.Sequential)] private struct CertChainParaV16 { public uint cbSize; public CertUsageMatch RequestedUsage; public CertUsageMatch RequestedIssuancePolicy; public uint dwUrlRetrievalTimeout; public int fCheckRevocationFreshnessTime; public uint dwRevocationFreshnessTime; public IntPtr pftCacheResync; public IntPtr pStrongSignPara; public uint dwStrongSignFlags; }
    [StructLayout(LayoutKind.Sequential)] private struct CertChainPolicyPara { public uint cbSize,dwFlags; public IntPtr pvExtraPolicyPara; }
    [StructLayout(LayoutKind.Sequential)] private struct CertChainPolicyStatus { public uint cbSize,dwError; public int lChainIndex,lElementIndex; public IntPtr pvExtraPolicyStatus; }
    [StructLayout(LayoutKind.Sequential)] private struct NativeFileTime { public uint Low,High; }
    [StructLayout(LayoutKind.Sequential)] private struct CryptAlgorithmIdentifier { public IntPtr pszObjId; public CryptDataBlob Parameters; }
    [StructLayout(LayoutKind.Sequential)] private struct CryptBitBlob { public uint cbData; public IntPtr pbData; public uint cUnusedBits; }
    [StructLayout(LayoutKind.Sequential)] private struct CertPublicKeyInfo { public CryptAlgorithmIdentifier Algorithm; public CryptBitBlob PublicKey; }
    [StructLayout(LayoutKind.Sequential)] private struct CryptAttribute { public IntPtr pszObjId; public uint cValue; public IntPtr rgValue; }
    [StructLayout(LayoutKind.Sequential)] private struct CryptAttributes { public uint cAttr; public IntPtr rgAttr; }
    [StructLayout(LayoutKind.Sequential)] private struct CmsgSignerInfo { public uint dwVersion; public CryptDataBlob Issuer,SerialNumber; public CryptAlgorithmIdentifier HashAlgorithm,HashEncryptionAlgorithm; public CryptDataBlob EncryptedHash; public CryptAttributes AuthAttrs,UnauthAttrs; }
    [StructLayout(LayoutKind.Sequential)] private struct CertInfo { public uint dwVersion; public CryptDataBlob SerialNumber; public CryptAlgorithmIdentifier SignatureAlgorithm; public CryptDataBlob Issuer; public NativeFileTime NotBefore,NotAfter; public CryptDataBlob Subject; public CertPublicKeyInfo SubjectPublicKeyInfo; public CryptBitBlob IssuerUniqueId,SubjectUniqueId; public uint cExtension; public IntPtr rgExtension; }
    [StructLayout(LayoutKind.Sequential)] private struct CertContext { public uint dwCertEncodingType; public IntPtr pbCertEncoded; public uint cbCertEncoded; public IntPtr pCertInfo,hCertStore; }
    [StructLayout(LayoutKind.Sequential)] private struct CertTrustStatus { public uint dwErrorStatus,dwInfoStatus; }
    [StructLayout(LayoutKind.Sequential)] private struct CertChainContext { public uint cbSize; public CertTrustStatus TrustStatus; public uint cChain; public IntPtr rgpChain; public uint cLowerQualityChainContext; public IntPtr rgpLowerQualityChainContext; public bool fHasRevocationFreshnessTime; public uint dwRevocationFreshnessTime,dwCreateFlags; public Guid ChainId; }
    [StructLayout(LayoutKind.Sequential)] private struct CryptTimestampContext { public uint cbEncoded; public IntPtr pbEncoded,pTimeStamp; }
    [StructLayout(LayoutKind.Sequential)] private struct CryptTimestampInfo { public uint dwVersion; public IntPtr pszTSAPolicyId; public CryptAlgorithmIdentifier HashAlgorithm; public CryptDataBlob HashedMessage,SerialNumber; public NativeFileTime ftTime; }

    [DllImport("kernel32.dll",SetLastError=true)] private static extern bool GetFileInformationByHandleEx(SafeFileHandle file,int infoClass,out FileIdInfo info,uint size);
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] private static extern uint GetFinalPathNameByHandleW(SafeFileHandle file,StringBuilder path,uint length,uint flags);
    [DllImport("kernel32.dll",SetLastError=true)] private static extern bool GetFileSizeEx(SafeFileHandle file,out long size);
    [DllImport("kernel32.dll",SetLastError=true)] private static extern bool SetFilePointerEx(SafeFileHandle file,long distance,out long position,uint method);
    [DllImport("kernel32.dll",SetLastError=true)] private static extern bool ReadFile(SafeFileHandle file,byte[] buffer,uint count,out uint read,IntPtr overlapped);
    [DllImport("crypt32.dll",SetLastError=true)] private static extern bool CryptQueryObject(uint objectType,IntPtr pvObject,uint expectedContent,uint expectedFormat,uint flags,out uint encoding,out uint content,out uint format,out IntPtr store,out IntPtr message,out IntPtr context);
    [DllImport("crypt32.dll",SetLastError=true)] private static extern bool CryptMsgGetParam(IntPtr message,uint parameter,uint index,IntPtr data,ref uint dataSize);
    [DllImport("crypt32.dll",SetLastError=true)] private static extern bool CryptMsgControl(IntPtr message,uint flags,uint controlType,IntPtr parameters);
    [DllImport("crypt32.dll",SetLastError=true)] private static extern IntPtr CertEnumCertificatesInStore(IntPtr store,IntPtr previous);
    [DllImport("crypt32.dll",SetLastError=true)] private static extern IntPtr CertDuplicateCertificateContext(IntPtr context);
    [DllImport("crypt32.dll",SetLastError=true)] private static extern bool CryptDecodeObjectEx(uint encoding,IntPtr structType,IntPtr encoded,uint encodedSize,uint flags,IntPtr decodeParameters,IntPtr decoded,ref uint decodedSize);
    [DllImport("crypt32.dll",SetLastError=true)] private static extern bool CryptMsgVerifyCountersignatureEncodedEx(IntPtr cryptProv,uint encoding,IntPtr signerInfo,uint signerInfoSize,IntPtr counterSignerInfo,uint counterSignerInfoSize,uint signerType,IntPtr signer,uint flags,IntPtr reserved);
    [DllImport("crypt32.dll",SetLastError=true)] private static extern bool CryptVerifyTimeStampSignature(IntPtr timestamp,uint timestampSize,IntPtr data,uint dataSize,IntPtr additionalStore,out IntPtr timestampContext,out IntPtr timestampSigner,out IntPtr timestampStore);
    [DllImport("crypt32.dll",SetLastError=true)] private static extern bool CertGetCertificateChain(IntPtr engine,IntPtr cert,IntPtr time,IntPtr additionalStore,ref CertChainParaV16 parameters,uint flags,IntPtr reserved,out IntPtr chain);
    [DllImport("crypt32.dll",SetLastError=true)] private static extern bool CertVerifyCertificateChainPolicy(IntPtr policy,IntPtr chain,ref CertChainPolicyPara parameters,ref CertChainPolicyStatus status);
    [DllImport("crypt32.dll")] private static extern void CertFreeCertificateChain(IntPtr chain);
    [DllImport("crypt32.dll")] private static extern bool CertFreeCertificateContext(IntPtr context);
    [DllImport("crypt32.dll")] private static extern bool CertCloseStore(IntPtr store,uint flags);
    [DllImport("crypt32.dll")] private static extern bool CryptMsgClose(IntPtr message);
    [DllImport("crypt32.dll")] private static extern void CryptMemFree(IntPtr value);
    private delegate bool DigestFunction(IntPtr digestHandle,IntPtr digestBuffer,uint digestStreamLength);
    [DllImport("imagehlp.dll",SetLastError=true)] private static extern bool ImageGetDigestStream(IntPtr file,uint digestLevel,DigestFunction digestFunction,IntPtr digestHandle);
    [DllImport("wintrust.dll",CharSet=CharSet.Unicode,SetLastError=true)] private static extern bool CryptCATAdminAcquireContext2(out IntPtr catAdmin,ref Guid subsystem,string hashAlgorithm,IntPtr strongHashPolicy,uint flags);
    [DllImport("wintrust.dll",SetLastError=true)] private static extern bool CryptCATAdminCalcHashFromFileHandle2(IntPtr catAdmin,IntPtr file,ref uint hashSize,byte[] hash,uint flags);
    [DllImport("wintrust.dll",SetLastError=true)] private static extern IntPtr CryptCATAdminEnumCatalogFromHash(IntPtr catAdmin,byte[] hash,uint hashSize,uint flags,ref IntPtr previous);
    [DllImport("wintrust.dll",SetLastError=true)] private static extern bool CryptCATAdminReleaseCatalogContext(IntPtr catAdmin,IntPtr catalogInfo,uint flags);
    [DllImport("wintrust.dll",SetLastError=true)] private static extern bool CryptCATAdminReleaseContext(IntPtr catAdmin,uint flags);

    private sealed class ClosedFailure : Exception { internal readonly string Code; internal ClosedFailure(string code) { Code=code; } }
    private sealed class ByteString
    {
        private readonly byte[] bytes;
        internal ByteString(byte[] source) { if(source==null) ClosedFail("CERTIFICATE_FIELDS_INVALID"); bytes=(byte[])source.Clone(); }
        internal int Length { get { return bytes.Length; } }
        internal byte this[int index] { get { return bytes[index]; } }
        internal bool FixedTimeEquals(ByteString other) { if(other==null||other.Length!=Length) return false; int difference=0; for(int i=0;i<Length;i++) difference|=bytes[i]^other[i]; return difference==0; }
        internal void CopyTo(byte[] destination,int offset) { if(destination==null||offset<0||destination.Length-offset<Length) ClosedFail("CERTIFICATE_FIELDS_INVALID"); Buffer.BlockCopy(bytes,0,destination,offset,Length); }
        internal byte[] ToArray() { return (byte[])bytes.Clone(); }
    }
    private enum ContentKind { EMBEDDED_SIGNED,NO_EMBEDDED,DETACHED }
    private enum CatalogClassification { CATALOG_PRESENT,CATALOG_ABSENT,CLASSIFICATION_ERROR }
    private enum TimestampKind { LEGACY,RFC3161 }
    private enum StoreRole { NONE,ORIGINAL_STORE,RFC_TS_STORE }
    private interface IOwnedResource : IDisposable { IntPtr Handle { get; } string ResourceId { get; } StoreRole StoreRole { get; } bool IsOpen { get; } }
    private interface IOwnedMessage : IOwnedResource { }
    private interface IOwnedStore : IOwnedResource { }
    private interface IOwnedCertificate : IOwnedResource { }
    private interface IOwnedChain : IOwnedResource { }
    private interface IOwnedTimestampContext : IOwnedResource { }
    private interface IOwnedBuffer : IOwnedResource { int ByteCount { get; } }
    private interface IOwnedCatalogAdmin : IOwnedResource { }
    private interface IOwnedCatalogInfo : IOwnedResource { }
    private interface IOwnedDigestCallback : IOwnedResource { DigestFunction Callback { get; } }
    private interface IOwnedSha256Digest : IOwnedResource { SHA256Managed Digest { get; } }
    private interface IOwnedPinnedBytes : IOwnedResource { int ByteCount { get; } IntPtr Pointer { get; } byte[] ToArray(); }
    private interface IResourceFactory
    {
        IOwnedMessage AdoptMessage(ref IntPtr handle);
        IOwnedStore AdoptStore(ref IntPtr handle,StoreRole role);
        IOwnedCertificate AdoptCertificate(ref IntPtr handle,StoreRole sourceRole);
        IOwnedChain AdoptChain(ref IntPtr handle,StoreRole role);
        IOwnedTimestampContext AdoptTimestampContext(ref IntPtr handle);
        IOwnedBuffer AdoptHGlobal(ref IntPtr pointer,int byteCount,string resourceType);
        IOwnedCatalogAdmin AdoptCatalogAdmin(ref IntPtr handle);
        IOwnedCatalogInfo AdoptCatalogInfo(ref IntPtr handle,IOwnedCatalogAdmin admin);
        IOwnedDigestCallback AdoptDigestCallback(DigestFunction callback);
        IOwnedSha256Digest AdoptSha256Digest(SHA256Managed digest);
        IOwnedPinnedBytes PinBytes(byte[] value,string resourceType);
        IOwnedBuffer AllocateBytes(byte[] value,string resourceType);
        IOwnedBuffer AllocateAscii(string value,string resourceType);
        IOwnedBuffer AllocateStruct<T>(T value,string resourceType) where T:struct;
        bool Owns(IOwnedResource value);
    }
    private sealed class TargetSnapshot
    {
        private readonly ByteString bytes; private readonly long byteCount; private readonly string sha256,fileIdentitySha256,finalPathSha256; private readonly SafeFileHandle heldFile;
        internal TargetSnapshot(ByteString bytes,long byteCount,string sha256,string fileIdentitySha256,string finalPathSha256,SafeFileHandle heldFile) { if(bytes==null||byteCount<=0||byteCount!=bytes.Length||!LowerHex64(sha256)||!LowerHex64(fileIdentitySha256)||!LowerHex64(finalPathSha256)||heldFile==null||heldFile.IsInvalid) ClosedFail("FILE_IDENTITY_DRIFT"); this.bytes=new ByteString(bytes.ToArray()); this.byteCount=byteCount; this.sha256=sha256; this.fileIdentitySha256=fileIdentitySha256; this.finalPathSha256=finalPathSha256; this.heldFile=heldFile; }
        internal ByteString Bytes { get { return bytes; } } internal long ByteCount { get { return byteCount; } } internal string Sha256 { get { return sha256; } } internal string FileIdentitySha256 { get { return fileIdentitySha256; } } internal string FinalPathSha256 { get { return finalPathSha256; } } internal SafeFileHandle HeldFile { get { return heldFile; } }
    }
    private sealed class ContentEnvelope
    {
        private readonly ContentKind kind; private readonly IOwnedStore originalStore; private readonly IOwnedMessage message;
        internal ContentEnvelope(ContentKind kind,IOwnedStore originalStore,IOwnedMessage message) { if((kind==ContentKind.EMBEDDED_SIGNED)!=(originalStore!=null&&message!=null)) ClosedFail("SIGNATURE_INVALID"); this.kind=kind; this.originalStore=originalStore; this.message=message; }
        internal ContentKind Kind { get { return kind; } } internal IOwnedStore OriginalStore { get { return originalStore; } } internal IOwnedMessage Message { get { return message; } }
    }
    private sealed class TimestampAttribute { private readonly TimestampKind kind; private readonly ByteString encoded; internal TimestampAttribute(TimestampKind kind,ByteString encoded) { if(encoded==null||encoded.Length==0) ClosedFail("CERTIFICATE_FIELDS_INVALID"); this.kind=kind; this.encoded=new ByteString(encoded.ToArray()); } internal TimestampKind Kind { get { return kind; } } internal ByteString Encoded { get { return encoded; } } }
    private sealed class SignerInfoRecord
    {
        private readonly ByteString encodedSigner,issuer,serial,encryptedHash; private readonly ReadOnlyCollection<TimestampAttribute> timestampAttributes;
        internal SignerInfoRecord(ByteString encodedSigner,ByteString issuer,ByteString serial,ByteString encryptedHash,ReadOnlyCollection<TimestampAttribute> timestampAttributes) { if(encodedSigner==null||issuer==null||serial==null||encryptedHash==null||timestampAttributes==null||issuer.Length==0||serial.Length==0) ClosedFail("CERTIFICATE_FIELDS_INVALID"); this.encodedSigner=new ByteString(encodedSigner.ToArray()); this.issuer=new ByteString(issuer.ToArray()); this.serial=new ByteString(serial.ToArray()); this.encryptedHash=new ByteString(encryptedHash.ToArray()); this.timestampAttributes=CloneTimestamps(timestampAttributes); }
        internal ByteString EncodedSigner { get { return encodedSigner; } } internal ByteString Issuer { get { return issuer; } } internal ByteString Serial { get { return serial; } } internal ByteString EncryptedHash { get { return encryptedHash; } } internal ReadOnlyCollection<TimestampAttribute> TimestampAttributes { get { return timestampAttributes; } }
    }
    private sealed class SignerCertInfoRecord { private readonly ByteString issuer,serial; internal SignerCertInfoRecord(ByteString issuer,ByteString serial) { if(issuer==null||serial==null||issuer.Length==0||serial.Length==0) ClosedFail("CERTIFICATE_FIELDS_INVALID"); this.issuer=new ByteString(issuer.ToArray()); this.serial=new ByteString(serial.ToArray()); } internal ByteString Issuer { get { return issuer; } } internal ByteString Serial { get { return serial; } } }
    private sealed class CertificateRecord
    {
        private readonly IOwnedCertificate lease; private readonly ByteString issuer,serial; private readonly string subject,issuerSubject,thumbprint; private readonly DateTime notBeforeUtc,notAfterUtc; private readonly ReadOnlyCollection<string> ekuOids;
        internal CertificateRecord(IOwnedCertificate lease,ByteString issuer,ByteString serial,string subject,string issuerSubject,string thumbprint,DateTime notBeforeUtc,DateTime notAfterUtc,ReadOnlyCollection<string> ekuOids) { if(lease==null||issuer==null||serial==null||issuer.Length==0||serial.Length==0||!BoundedText(subject)||!BoundedText(issuerSubject)||!UpperHex(thumbprint,40)||notBeforeUtc.Kind!=DateTimeKind.Utc||notAfterUtc.Kind!=DateTimeKind.Utc||notBeforeUtc>notAfterUtc||ekuOids==null) ClosedFail("CERTIFICATE_FIELDS_INVALID"); string[] copy=new string[ekuOids.Count]; for(int i=0;i<copy.Length;i++) { if(!OidText(ekuOids[i])) ClosedFail("CERTIFICATE_FIELDS_INVALID"); copy[i]=ekuOids[i]; } this.lease=lease; this.issuer=new ByteString(issuer.ToArray()); this.serial=new ByteString(serial.ToArray()); this.subject=subject; this.issuerSubject=issuerSubject; this.thumbprint=thumbprint; this.notBeforeUtc=notBeforeUtc; this.notAfterUtc=notAfterUtc; this.ekuOids=new ReadOnlyCollection<string>(copy); }
        internal IOwnedCertificate Lease { get { return lease; } } internal ByteString Issuer { get { return issuer; } } internal ByteString Serial { get { return serial; } } internal string Subject { get { return subject; } } internal string IssuerSubject { get { return issuerSubject; } } internal string Thumbprint { get { return thumbprint; } } internal DateTime NotBeforeUtc { get { return notBeforeUtc; } } internal DateTime NotAfterUtc { get { return notAfterUtc; } } internal ReadOnlyCollection<string> EkuOids { get { return ekuOids; } }
    }
    private sealed class LegacyCounterSigner { private readonly ByteString encoded,issuer,serial; private readonly long signingTimeFileTime; internal LegacyCounterSigner(ByteString encoded,ByteString issuer,ByteString serial,long signingTimeFileTime) { if(encoded==null||issuer==null||serial==null) ClosedFail("CERTIFICATE_FIELDS_INVALID"); this.encoded=new ByteString(encoded.ToArray()); this.issuer=new ByteString(issuer.ToArray()); this.serial=new ByteString(serial.ToArray()); this.signingTimeFileTime=signingTimeFileTime; } internal ByteString Encoded { get { return encoded; } } internal ByteString Issuer { get { return issuer; } } internal ByteString Serial { get { return serial; } } internal long SigningTimeFileTime { get { return signingTimeFileTime; } } }
    private sealed class Rfc3161Record { private readonly CertificateRecord tsa; private readonly IOwnedStore timestampStore; private readonly ByteString hashedMessage; private readonly long timestampFileTime; private readonly IOwnedTimestampContext context; internal Rfc3161Record(CertificateRecord tsa,IOwnedStore timestampStore,ByteString hashedMessage,long timestampFileTime,IOwnedTimestampContext context) { if(tsa==null||timestampStore==null||hashedMessage==null||context==null) ClosedFail("SIGNATURE_INVALID"); this.tsa=tsa; this.timestampStore=timestampStore; this.hashedMessage=new ByteString(hashedMessage.ToArray()); this.timestampFileTime=timestampFileTime; this.context=context; } internal CertificateRecord Tsa { get { return tsa; } } internal IOwnedStore TimestampStore { get { return timestampStore; } } internal ByteString HashedMessage { get { return hashedMessage; } } internal long TimestampFileTime { get { return timestampFileTime; } } internal IOwnedTimestampContext Context { get { return context; } } }
    private sealed class ChainResult { private readonly uint trustError,revocationBits,otherTrustBits; private readonly IOwnedChain lease; internal ChainResult(uint trustError,uint revocationBits,uint otherTrustBits,IOwnedChain lease) { if(lease==null||revocationBits!=(trustError&REVOCATION_UNAVAILABLE_MASK)||otherTrustBits!=(trustError&~REVOCATION_UNAVAILABLE_MASK)) ClosedFail("SIGNATURE_INVALID"); this.trustError=trustError; this.revocationBits=revocationBits; this.otherTrustBits=otherTrustBits; this.lease=lease; } internal uint TrustError { get { return trustError; } } internal uint RevocationBits { get { return revocationBits; } } internal uint OtherTrustBits { get { return otherTrustBits; } } internal IOwnedChain Lease { get { return lease; } } }
    private sealed class PolicyResult { private readonly uint policyError; internal PolicyResult(uint policyError) { this.policyError=policyError; } internal uint PolicyError { get { return policyError; } } }
    private sealed class VersionRecord { private readonly string productVersion,fileVersion; internal VersionRecord(string productVersion,string fileVersion) { if(productVersion==null||fileVersion==null) ClosedFail("VERSION_INVALID"); this.productVersion=productVersion; this.fileVersion=fileVersion; } internal string ProductVersion { get { return productVersion; } } internal string FileVersion { get { return fileVersion; } } }
    private interface IAuthenticodeBackend
    {
        TargetSnapshot CaptureTargetBefore();
        ContentEnvelope OpenEmbeddedMessage(ByteString heldBytes);
        CatalogClassification ClassifyCatalogIfNoEmbedded(TargetSnapshot heldTarget);
        uint GetSignerCount(ContentEnvelope content);
        SignerInfoRecord GetPrimarySignerInfo(ContentEnvelope content,uint index);
        SignerCertInfoRecord GetSignerCertInfo(ContentEnvelope content,uint index);
        ReadOnlyCollection<CertificateRecord> EnumerateCertificates(IOwnedStore store);
        void EnablePrimaryStrongSignature(ContentEnvelope content);
        bool VerifyPrimaryMessageSignature(ContentEnvelope content,CertificateRecord signer);
        bool VerifyPeIndirectDigest(ContentEnvelope content,TargetSnapshot heldTarget);
        ReadOnlyCollection<TimestampAttribute> GetTimestampAttributes(SignerInfoRecord signer);
        LegacyCounterSigner DecodeLegacyCounterSigner(TimestampAttribute attribute);
        bool VerifyLegacyCounterSignature(ByteString encodedPrimary,LegacyCounterSigner counter,CertificateRecord timestampCert);
        Rfc3161Record VerifyRfc3161(TimestampAttribute attribute,ByteString encryptedHash,IOwnedStore originalStore);
        ChainResult BuildChain(CertificateRecord cert,IOwnedStore additionalStore,DateTime verificationUtc,string ekuOid);
        PolicyResult VerifyPolicy(ChainResult chain,uint policyOid);
        VersionRecord ReadVersions(ByteString heldBytes);
        TargetSnapshot CaptureTargetAfter();
        int ObservedNetworkRequestCount { get; }
    }
    private sealed class ResourceLedger
    {
        private sealed class Row { internal int Sequence,LiveCount; internal string Action,ResourceId,ResourceType,ResultCode; }
        internal sealed class LedgerToken { internal readonly string Id,Type; internal readonly StoreRole Role; internal bool Live; internal LedgerToken(string id,string type,StoreRole role){Id=id;Type=type;Role=role;Live=true;} }
        private readonly List<Row> rows=new List<Row>(); private readonly Dictionary<string,int> ordinals=new Dictionary<string,int>(); private readonly HashSet<string> live=new HashSet<string>();
        internal ResourceLedger(TraceRecorder trace){if(trace==null)ClosedFail("SIGNATURE_INVALID");}
        internal int LiveCount { get { return live.Count; } }
        internal LedgerToken Open(string type,StoreRole role) { int ordinal; ordinals.TryGetValue(type,out ordinal); ordinal++; ordinals[type]=ordinal; string id=type+"#"+ordinal; if(!live.Add(id)) ClosedFail("SIGNATURE_INVALID"); rows.Add(new Row { Sequence=rows.Count+1,Action="OPEN",ResourceId=id,ResourceType=type,ResultCode="OK",LiveCount=live.Count });return new LedgerToken(id,type,role); }
        internal bool IsLive(LedgerToken token){return token!=null&&token.Live&&live.Contains(token.Id);}
        internal void Close(LedgerToken token) { if(!IsLive(token)||!live.Remove(token.Id)) ClosedFail("SIGNATURE_INVALID");token.Live=false; rows.Add(new Row { Sequence=rows.Count+1,Action="CLOSE",ResourceId=token.Id,ResourceType=token.Type,ResultCode="OK",LiveCount=live.Count }); }
        internal void RollbackOpen(LedgerToken token) { if(!IsLive(token)||!live.Remove(token.Id)) ClosedFail("SIGNATURE_INVALID");token.Live=false; rows.Add(new Row { Sequence=rows.Count+1,Action="ROLLBACK_CLOSE",ResourceId=token.Id,ResourceType=token.Type,ResultCode="ADOPT_FAIL_CLOSED",LiveCount=live.Count }); }
        internal void AssertBalanced() { if(live.Count!=0) ClosedFail("SIGNATURE_INVALID"); Dictionary<string,int> balance=new Dictionary<string,int>(); foreach(Row row in rows) { int value; balance.TryGetValue(row.ResourceId,out value); value+=row.Action=="OPEN"?1:-1; balance[row.ResourceId]=value; } foreach(int value in balance.Values) if(value!=0) ClosedFail("SIGNATURE_INVALID"); }
        internal string CanonicalRows() { StringBuilder text=new StringBuilder(); foreach(Row row in rows) text.Append("{\"sequence\":").Append(row.Sequence).Append(",\"action\":\"").Append(row.Action).Append("\",\"resourceType\":\"").Append(row.ResourceType).Append("\",\"resourceId\":\"").Append(row.ResourceId).Append("\",\"resultCode\":\"").Append(row.ResultCode).Append("\",\"liveCount\":").Append(row.LiveCount).Append("}\n"); return text.ToString(); }
        internal string Digest() { return Hash(Encoding.UTF8.GetBytes(CanonicalRows())); }
    }
    private sealed class ResourceFactory : IResourceFactory
    {
        private enum AdoptionInjection { NONE,BEFORE_LEDGER_TOKEN,AFTER_LEDGER_OPEN_BEFORE_LEASE,AFTER_LEASE_BEFORE_PUBLISH,AFTER_PUBLISH_BEFORE_RETURN }
        private delegate bool RawCloser(IntPtr value);
        private delegate OwnedResource LeaseBuilder(IntPtr value,ResourceLedger.LedgerToken token,object nonce,RawCloser closer);
        private abstract class OwnedResource : IOwnedResource
        {
            private readonly ResourceFactory owner; private readonly ResourceLedger.LedgerToken token; private readonly object nonce; private readonly RawCloser closer; private IntPtr handle; private int disposed;
            protected OwnedResource(ResourceFactory owner,IntPtr handle,ResourceLedger.LedgerToken token,object nonce,RawCloser closer) { if(owner==null||handle==IntPtr.Zero||token==null||nonce==null||closer==null) ClosedFail("SIGNATURE_INVALID"); this.owner=owner;this.handle=handle;this.token=token;this.nonce=nonce;this.closer=closer; }
            public IntPtr Handle { get { if(!IsOpen) ClosedFail("SIGNATURE_INVALID"); return handle; } } public string ResourceId { get { return token.Id; } } public StoreRole StoreRole { get { return token.Role; } } public bool IsOpen { get { return Volatile.Read(ref disposed)==0&&owner.ledger.IsLive(token); } }
            internal bool IsOwnedBy(ResourceFactory expected,object expectedNonce){return ReferenceEquals(owner,expected)&&ReferenceEquals(nonce,expectedNonce)&&IsOpen;}
            internal ResourceLedger.LedgerToken Token{get{return token;}}
            public void Dispose() { if(!owner.CanClose(this))ClosedFail("SIGNATURE_INVALID");if(Interlocked.Exchange(ref disposed,1)!=0) return; IntPtr value=handle;handle=IntPtr.Zero;bool closed=owner.InvokeCloser(closer,value);if(!closed){owner.closeFailed=true;return;}owner.ledger.Close(token);owner.OnClosed(this);owner.open.Remove(this); }
        }
        private sealed class MessageLease : OwnedResource,IOwnedMessage { internal MessageLease(ResourceFactory o,IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c):base(o,v,t,n,c){} }
        private sealed class StoreLease : OwnedResource,IOwnedStore { internal StoreLease(ResourceFactory o,IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c):base(o,v,t,n,c){} }
        private sealed class CertificateLease : OwnedResource,IOwnedCertificate { internal CertificateLease(ResourceFactory o,IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c):base(o,v,t,n,c){} }
        private sealed class ChainLease : OwnedResource,IOwnedChain { internal ChainLease(ResourceFactory o,IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c):base(o,v,t,n,c){} }
        private sealed class TimestampLease : OwnedResource,IOwnedTimestampContext { internal TimestampLease(ResourceFactory o,IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c):base(o,v,t,n,c){} }
        private sealed class BufferLease : OwnedResource,IOwnedBuffer { private readonly int byteCount; internal BufferLease(ResourceFactory o,IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c,int count):base(o,v,t,n,c){byteCount=count;}public int ByteCount{get{return byteCount;}} }
        private sealed class CatalogAdminLease : OwnedResource,IOwnedCatalogAdmin { internal CatalogAdminLease(ResourceFactory o,IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c):base(o,v,t,n,c){} }
        private sealed class CatalogInfoLease : OwnedResource,IOwnedCatalogInfo { private readonly IOwnedCatalogAdmin admin;internal CatalogInfoLease(ResourceFactory o,IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c,IOwnedCatalogAdmin a):base(o,v,t,n,c){admin=a;}internal IOwnedCatalogAdmin Admin{get{return admin;}} }
        private sealed class DigestCallbackLease : OwnedResource,IOwnedDigestCallback { internal DigestCallbackLease(ResourceFactory o,IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c):base(o,v,t,n,c){}public DigestFunction Callback{get{return (DigestFunction)GCHandle.FromIntPtr(Handle).Target;}} }
        private sealed class Sha256DigestLease : OwnedResource,IOwnedSha256Digest { internal Sha256DigestLease(ResourceFactory o,IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c):base(o,v,t,n,c){}public SHA256Managed Digest{get{return (SHA256Managed)GCHandle.FromIntPtr(Handle).Target;}} }
        private sealed class PinnedBytesLease : OwnedResource,IOwnedPinnedBytes { private readonly byte[] bytes;internal PinnedBytesLease(ResourceFactory o,IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c,byte[] b):base(o,v,t,n,c){bytes=(byte[])b.Clone();}public int ByteCount{get{return bytes.Length;}}public IntPtr Pointer{get{GCHandle h=GCHandle.FromIntPtr(Handle);return h.AddrOfPinnedObject();}}public byte[] ToArray(){return(byte[])bytes.Clone();} }
        private readonly ResourceLedger ledger;private readonly TraceRecorder trace;private readonly List<OwnedResource> open=new List<OwnedResource>();private readonly Dictionary<IOwnedCatalogAdmin,int> catalogDependencies=new Dictionary<IOwnedCatalogAdmin,int>();private readonly bool synthetic;private readonly object nonce=new object();private bool closeFailed;private int syntheticCloseAttemptCount,syntheticCloseCompletionCount;
#if FLUYO_SYNTHETIC_TESTS
        private AdoptionInjection injection;
        internal void SetSyntheticInjection(string value){injection=(AdoptionInjection)Enum.Parse(typeof(AdoptionInjection),value,false);}
#else
        private const AdoptionInjection injection=AdoptionInjection.NONE;
#endif
        internal ResourceFactory(bool synthetic,TraceRecorder trace) { if(trace==null)ClosedFail("SIGNATURE_INVALID");this.synthetic=synthetic;this.trace=trace;ledger=new ResourceLedger(trace);trace.Bind(delegate{return ledger.LiveCount;}); }
        private static bool IsSyntheticFakeNativeType(string type){switch(type){case "MESSAGE":case "STORE":case "CERTIFICATE":case "CHAIN":case "TIMESTAMP_CONTEXT":case "CATALOG_ADMIN_CONTEXT":case "CATALOG_INFO_CONTEXT":return true;default:return false;}}
        private bool CloseRaw(string type,IntPtr raw,IOwnedCatalogAdmin admin){if(raw==IntPtr.Zero)return false;if(synthetic&&IsSyntheticFakeNativeType(type))return true;if(type=="MESSAGE")return CryptMsgClose(raw);if(type=="STORE")return CertCloseStore(raw,0);if(type=="CERTIFICATE")return CertFreeCertificateContext(raw);if(type=="CHAIN"){CertFreeCertificateChain(raw);return true;}if(type=="TIMESTAMP_CONTEXT"){CryptMemFree(raw);return true;}if(type=="CATALOG_ADMIN_CONTEXT")return CryptCATAdminReleaseContext(raw,0);if(type=="CATALOG_INFO_CONTEXT")return admin!=null&&Owns(admin)&&CryptCATAdminReleaseCatalogContext(admin.Handle,raw,0);if(type=="IMAGE_DIGEST_CALLBACK_HANDLE"||type=="SHA256_DIGEST"||AllowedPinnedType(type)){GCHandle h=GCHandle.FromIntPtr(raw);object target=h.IsAllocated?h.Target:null;if(type=="SHA256_DIGEST"&&target is IDisposable)((IDisposable)target).Dispose();if(h.IsAllocated)h.Free();return true;}Marshal.FreeHGlobal(raw);return true;}
        private bool InvokeCloser(RawCloser closer,IntPtr value){if(synthetic)syntheticCloseAttemptCount++;bool closed=false;try{closed=closer(value);}catch{closeFailed=true;return false;}if(synthetic&&closed)syntheticCloseCompletionCount++;return closed;}
        private bool CanClose(OwnedResource value){CatalogAdminLease admin=value as CatalogAdminLease;int count;if(admin!=null&&catalogDependencies.TryGetValue(admin,out count)&&count>0)return false;return true;}
        private void OnClosed(OwnedResource value){CatalogInfoLease info=value as CatalogInfoLease;if(info==null)return;int count;if(!catalogDependencies.TryGetValue(info.Admin,out count)||count<=0)ClosedFail("SIGNATURE_INVALID");if(count==1)catalogDependencies.Remove(info.Admin);else catalogDependencies[info.Admin]=count-1;}
        private T AdoptCore<T>(ref IntPtr source,string type,StoreRole role,IOwnedCatalogAdmin admin,LeaseBuilder build) where T:class,IOwnedResource {if(source==IntPtr.Zero||build==null)ClosedFail("SIGNATURE_INVALID");IntPtr raw=source;source=IntPtr.Zero;ResourceLedger.LedgerToken token=null;OwnedResource lease=null;bool published=false;RawCloser closer=delegate(IntPtr value){return CloseRaw(type,value,admin);};try{if(injection==AdoptionInjection.BEFORE_LEDGER_TOKEN)throw new Exception();token=ledger.Open(type,role);if(injection==AdoptionInjection.AFTER_LEDGER_OPEN_BEFORE_LEASE)throw new Exception();lease=build(raw,token,nonce,closer);if(injection==AdoptionInjection.AFTER_LEASE_BEFORE_PUBLISH)throw new Exception();open.Add(lease);published=true;if(injection==AdoptionInjection.AFTER_PUBLISH_BEFORE_RETURN)throw new Exception();return(T)(object)lease;}catch{if(published)open.Remove(lease);bool closed=InvokeCloser(closer,raw);if(!closed){closeFailed=true;}else if(token!=null&&ledger.IsLive(token))ledger.RollbackOpen(token);trace.Add("ADOPT_FAIL_CLOSED","ADOPT_FAIL_CLOSED",ledger.LiveCount);ClosedFail("SIGNATURE_INVALID");return null;}}
        public IOwnedMessage AdoptMessage(ref IntPtr h){return AdoptCore<IOwnedMessage>(ref h,"MESSAGE",StoreRole.NONE,null,delegate(IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c){return new MessageLease(this,v,t,n,c);});}
        public IOwnedStore AdoptStore(ref IntPtr h,StoreRole role){if(role==StoreRole.NONE)ClosedFail("SIGNATURE_INVALID");return AdoptCore<IOwnedStore>(ref h,"STORE",role,null,delegate(IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c){return new StoreLease(this,v,t,n,c);});}
        public IOwnedCertificate AdoptCertificate(ref IntPtr h,StoreRole role){if(role==StoreRole.NONE)ClosedFail("SIGNATURE_INVALID");return AdoptCore<IOwnedCertificate>(ref h,"CERTIFICATE",role,null,delegate(IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c){return new CertificateLease(this,v,t,n,c);});}
        public IOwnedChain AdoptChain(ref IntPtr h,StoreRole role){if(role==StoreRole.NONE)ClosedFail("SIGNATURE_INVALID");return AdoptCore<IOwnedChain>(ref h,"CHAIN",role,null,delegate(IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c){return new ChainLease(this,v,t,n,c);});}
        public IOwnedTimestampContext AdoptTimestampContext(ref IntPtr h){return AdoptCore<IOwnedTimestampContext>(ref h,"TIMESTAMP_CONTEXT",StoreRole.NONE,null,delegate(IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c){return new TimestampLease(this,v,t,n,c);});}
        private static bool AllowedBufferType(string type){switch(type){case "MESSAGE_PARAMETER":case "QUERY_BLOB":case "SIGNER_COUNT":case "DECODE_BUFFER":case "STRONG_SIGN_OID":case "STRONG_SIGN_PARA":case "PRIMARY_VERIFY_PARA":case "SIP_ENCODED_CONTENT":case "SIP_DECODE_BUFFER":case "SIP_STRUCT_TYPE_OID":case "LEGACY_STRONG_SIGN_OID":case "LEGACY_STRONG_SIGN_PARA":case "CHAIN_EKU_OID":case "CHAIN_EKU_POINTER":case "CHAIN_FILETIME":return true;default:return false;}}
        private static bool AllowedPinnedType(string type){switch(type){case "QUERY_IMAGE_PIN":case "LEGACY_PRIMARY_PIN":case "LEGACY_COUNTER_PIN":case "RFC_TIMESTAMP_PIN":case "RFC_HASH_PIN":return true;default:return false;}}
        private static IntPtr AllocateNativeBytes(int byteCount){try{return Marshal.AllocHGlobal(byteCount);}catch{ClosedFail("SIGNATURE_INVALID");return IntPtr.Zero;}}
        private static GCHandle AllocateNativePin(object value,GCHandleType type){try{return GCHandle.Alloc(value,type);}catch{ClosedFail("SIGNATURE_INVALID");return new GCHandle();}}
        public IOwnedBuffer AdoptHGlobal(ref IntPtr p,int count,string type){if(count<=0||!AllowedBufferType(type))ClosedFail("SIGNATURE_INVALID");return AdoptCore<IOwnedBuffer>(ref p,type,StoreRole.NONE,null,delegate(IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c){return new BufferLease(this,v,t,n,c,count);});}
        public IOwnedBuffer AllocateBytes(byte[] value,string type){if(value==null||value.Length==0||!AllowedBufferType(type))ClosedFail("SIGNATURE_INVALID");IntPtr raw=AllocateNativeBytes(value.Length);try{Marshal.Copy(value,0,raw,value.Length);return AdoptHGlobal(ref raw,value.Length,type);}catch(ClosedFailure){throw;}catch{ClosedFail("SIGNATURE_INVALID");return null;}finally{if(raw!=IntPtr.Zero)Marshal.FreeHGlobal(raw);}}
        public IOwnedBuffer AllocateAscii(string value,string type){if(String.IsNullOrEmpty(value)||!AllowedBufferType(type))ClosedFail("SIGNATURE_INVALID");return AllocateBytes(Encoding.ASCII.GetBytes(value+"\0"),type);}
        public IOwnedBuffer AllocateStruct<T>(T value,string type) where T:struct {int size=Marshal.SizeOf(typeof(T));IntPtr raw=AllocateNativeBytes(size);try{Marshal.StructureToPtr(value,raw,false);return AdoptHGlobal(ref raw,size,type);}catch(ClosedFailure){throw;}catch{ClosedFail("SIGNATURE_INVALID");return null;}finally{if(raw!=IntPtr.Zero)Marshal.FreeHGlobal(raw);}}
        public IOwnedPinnedBytes PinBytes(byte[] value,string type){if(value==null||value.Length==0||!AllowedPinnedType(type))ClosedFail("SIGNATURE_INVALID");byte[] copy=(byte[])value.Clone();GCHandle pin=AllocateNativePin(copy,GCHandleType.Pinned);IntPtr raw=GCHandle.ToIntPtr(pin);return AdoptCore<IOwnedPinnedBytes>(ref raw,type,StoreRole.NONE,null,delegate(IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c){return new PinnedBytesLease(this,v,t,n,c,copy);});}
        public IOwnedCatalogAdmin AdoptCatalogAdmin(ref IntPtr h){return AdoptCore<IOwnedCatalogAdmin>(ref h,"CATALOG_ADMIN_CONTEXT",StoreRole.NONE,null,delegate(IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c){return new CatalogAdminLease(this,v,t,n,c);});}
        public IOwnedCatalogInfo AdoptCatalogInfo(ref IntPtr h,IOwnedCatalogAdmin admin){if(!Owns(admin))ClosedFail("SIGNATURE_INVALID");IOwnedCatalogInfo info=AdoptCore<IOwnedCatalogInfo>(ref h,"CATALOG_INFO_CONTEXT",StoreRole.NONE,admin,delegate(IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c){return new CatalogInfoLease(this,v,t,n,c,admin);});int count;catalogDependencies.TryGetValue(admin,out count);catalogDependencies[admin]=count+1;return info;}
        public IOwnedDigestCallback AdoptDigestCallback(DigestFunction callback){if(callback==null)ClosedFail("SIGNATURE_INVALID");GCHandle pin=AllocateNativePin(callback,GCHandleType.Normal);IntPtr raw=GCHandle.ToIntPtr(pin);return AdoptCore<IOwnedDigestCallback>(ref raw,"IMAGE_DIGEST_CALLBACK_HANDLE",StoreRole.NONE,null,delegate(IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c){return new DigestCallbackLease(this,v,t,n,c);});}
        public IOwnedSha256Digest AdoptSha256Digest(SHA256Managed digest){if(digest==null)ClosedFail("SIGNATURE_INVALID");GCHandle pin=AllocateNativePin(digest,GCHandleType.Normal);IntPtr raw=GCHandle.ToIntPtr(pin);return AdoptCore<IOwnedSha256Digest>(ref raw,"SHA256_DIGEST",StoreRole.NONE,null,delegate(IntPtr v,ResourceLedger.LedgerToken t,object n,RawCloser c){return new Sha256DigestLease(this,v,t,n,c);});}
        public bool Owns(IOwnedResource value){OwnedResource item=value as OwnedResource;return item!=null&&item.IsOwnedBy(this,nonce)&&open.Contains(item)&&ledger.IsLive(item.Token);}
        internal void DisposeAll(){for(int i=open.Count-1;i>=0;i--){try{open[i].Dispose();}catch{closeFailed=true;}}} internal void AssertBalanced(){ledger.AssertBalanced();if(closeFailed||open.Count!=0||catalogDependencies.Count!=0)ClosedFail("SIGNATURE_INVALID");} internal string Digest(){return ledger.Digest();} internal string CanonicalRows(){return ledger.CanonicalRows();} internal int SyntheticCloseAttemptCount{get{return syntheticCloseAttemptCount;}} internal int SyntheticCloseCompletionCount{get{return syntheticCloseCompletionCount;}} internal int OpenCount{get{return open.Count;}}
    }
    private sealed class TraceRecorder
    {
        private static readonly string[] ResultCodes=new string[]{"NONE","OK","SIGNATURE_INVALID","CATALOG_SIGNATURE_REJECTED","OFFLINE_REVOCATION_UNAVAILABLE","CERTIFICATE_FIELDS_INVALID","VERSION_INVALID","FILE_IDENTITY_DRIFT","ADOPT_FAIL_CLOSED"};
        private sealed class Row { internal int Sequence,ResourceLiveCount; internal string Operation,ResultCode; }
        private readonly List<Row> rows=new List<Row>(); private Func<int> liveCount;
        private static bool AllowedResult(string value){foreach(string item in ResultCodes)if(item==value)return true;return false;}
        internal void Bind(Func<int> provider){if(provider==null||liveCount!=null)ClosedFail("SIGNATURE_INVALID");liveCount=provider;}
        internal void Add(string operation,string result){Add(operation,result,liveCount==null?0:liveCount());}
        internal void Add(string operation,string result,int resourceLiveCount){if(!AllowedResult(result)||resourceLiveCount<0)ClosedFail("SIGNATURE_INVALID");rows.Add(new Row{Sequence=rows.Count+1,Operation=operation,ResultCode=result,ResourceLiveCount=resourceLiveCount});}
        internal string CanonicalRows(){StringBuilder text=new StringBuilder();foreach(Row row in rows)text.Append("{\"sequence\":").Append(row.Sequence).Append(",\"operation\":\"").Append(row.Operation).Append("\",\"resultCode\":\"").Append(row.ResultCode).Append("\",\"resourceLiveCount\":").Append(row.ResourceLiveCount).Append("}\n");return text.ToString();}
        internal string Digest(){return Hash(Encoding.UTF8.GetBytes(CanonicalRows()));}
    }
    private sealed class ResolutionResult { internal string Output,Reason,TraceSha256,ResourceSha256; internal bool Success { get { return Reason==null; } } }

    private static void ClosedFail(string reason)
    {
        switch(reason) { case "SIGNATURE_INVALID": case "CATALOG_SIGNATURE_REJECTED": case "OFFLINE_REVOCATION_UNAVAILABLE": case "CERTIFICATE_FIELDS_INVALID": case "VERSION_INVALID": case "FILE_IDENTITY_DRIFT": throw new ClosedFailure(reason); default: throw new ClosedFailure("SIGNATURE_INVALID"); }
    }
    private static string Hex(byte[] value) { return BitConverter.ToString(value).Replace("-","").ToLowerInvariant(); }
    private static string Hash(byte[] bytes) { using(SHA256 sha=SHA256.Create()) return Hex(sha.ComputeHash(bytes)); }
    private static bool LowerHex64(string value) { if(value==null||value.Length!=64) return false; foreach(char c in value) if(!((c>='0'&&c<='9')||(c>='a'&&c<='f'))) return false; return true; }
    private static bool UpperHex(string value,int length) { if(value==null||value.Length!=length) return false; foreach(char c in value) if(!((c>='0'&&c<='9')||(c>='A'&&c<='F'))) return false; return true; }
    private static bool BoundedText(string value) { if(String.IsNullOrEmpty(value)||value.Length>512) return false; foreach(char c in value) if(c<0x20) return false; return true; }
    private static bool OidText(string value) { if(String.IsNullOrEmpty(value)||value.Length>128) return false; foreach(char c in value) if(!((c>='0'&&c<='9')||c=='.')) return false; return true; }
    private static ReadOnlyCollection<TimestampAttribute> CloneTimestamps(ReadOnlyCollection<TimestampAttribute> source) { TimestampAttribute[] values=new TimestampAttribute[source.Count]; for(int i=0;i<values.Length;i++) { if(source[i]==null) ClosedFail("CERTIFICATE_FIELDS_INVALID"); values[i]=new TimestampAttribute(source[i].Kind,source[i].Encoded); } return new ReadOnlyCollection<TimestampAttribute>(values); }
    private static string Json(string value)
    {
        if(value==null) ClosedFail("CERTIFICATE_FIELDS_INVALID");
        StringBuilder result=new StringBuilder(value.Length);
        foreach(char current in value) { if(current<0x20) ClosedFail("CERTIFICATE_FIELDS_INVALID"); if(current=='\\'||current=='\"') result.Append('\\'); result.Append(current); }
        return result.ToString();
    }
    private static string FinalPath(SafeFileHandle handle) { StringBuilder value=new StringBuilder(32768); uint count=GetFinalPathNameByHandleW(handle,value,(uint)value.Capacity,0); if(count==0||count>=value.Capacity) ClosedFail("FILE_IDENTITY_DRIFT"); return value.ToString(); }
    private static byte[] ReadAll(SafeFileHandle handle)
    {
        long size,ignored; if(!GetFileSizeEx(handle,out size)||size<=0||size>16777216) ClosedFail("FILE_IDENTITY_DRIFT"); if(!SetFilePointerEx(handle,0,out ignored,0)) ClosedFail("FILE_IDENTITY_DRIFT");
        byte[] all=new byte[(int)size]; int offset=0; while(offset<all.Length) { int count=Math.Min(65536,all.Length-offset); byte[] chunk=new byte[count]; uint read; if(!ReadFile(handle,chunk,(uint)count,out read,IntPtr.Zero)||read==0) ClosedFail("FILE_IDENTITY_DRIFT"); Buffer.BlockCopy(chunk,0,all,offset,(int)read); offset+=(int)read; }
        if(!SetFilePointerEx(handle,0,out ignored,0)) ClosedFail("FILE_IDENTITY_DRIFT"); return all;
    }
    private static string Identity(SafeFileHandle handle) { FileIdInfo info; if(!GetFileInformationByHandleEx(handle,18,out info,(uint)Marshal.SizeOf(typeof(FileIdInfo)))) ClosedFail("FILE_IDENTITY_DRIFT"); byte[] volume=BitConverter.GetBytes(info.VolumeSerialNumber),all=new byte[volume.Length+16]; Buffer.BlockCopy(volume,0,all,0,volume.Length); Buffer.BlockCopy(info.FileId,0,all,volume.Length,16); return Hash(all); }
    private static IOwnedBuffer MessageParameter(IntPtr message,uint parameter,uint index,IResourceFactory resources)
    {
        uint size=0;if(!CryptMsgGetParam(message,parameter,index,IntPtr.Zero,ref size)||size==0||size>1048576)ClosedFail("SIGNATURE_INVALID");IOwnedBuffer value=resources.AllocateBytes(new byte[(int)size],"MESSAGE_PARAMETER");uint actual=size;if(!CryptMsgGetParam(message,parameter,index,value.Handle,ref actual)||actual!=size)ClosedFail("SIGNATURE_INVALID");return value;
    }
    private static byte[] MessageParameterBytes(IntPtr message,uint parameter,uint index,IResourceFactory resources){IOwnedBuffer value=MessageParameter(message,parameter,index,resources);byte[] bytes=new byte[value.ByteCount];Marshal.Copy(value.Handle,bytes,0,bytes.Length);return bytes;}
    private static bool HasEku(X509Certificate2 cert,string oid) { foreach(X509Extension extension in cert.Extensions) { X509EnhancedKeyUsageExtension eku=extension as X509EnhancedKeyUsageExtension; if(eku!=null) foreach(Oid item in eku.EnhancedKeyUsages) if(item.Value==oid) return true; } return false; }
    private static bool BlobEquals(CryptDataBlob left,CryptDataBlob right)
    {
        if(left.cbData!=right.cbData||left.cbData==0||left.pbData==IntPtr.Zero||right.pbData==IntPtr.Zero) return false;
        for(int i=0;i<(int)left.cbData;i++) if(Marshal.ReadByte(left.pbData,i)!=Marshal.ReadByte(right.pbData,i)) return false;
        return true;
    }
    private static DateTime FromFileTime(NativeFileTime value)
    {
        long raw=((long)value.High<<32)|value.Low;
        if(raw<=0||raw%TimeSpan.TicksPerSecond!=0) ClosedFail("CERTIFICATE_FIELDS_INVALID");
        return DateTime.FromFileTimeUtc(raw);
    }
    private static ByteString CopyBlob(CryptDataBlob value) { if(value.pbData==IntPtr.Zero||value.cbData==0||value.cbData>1048576) ClosedFail("CERTIFICATE_FIELDS_INVALID"); byte[] bytes=new byte[(int)value.cbData]; Marshal.Copy(value.pbData,bytes,0,bytes.Length); return new ByteString(bytes); }
    private sealed class WinCryptBackend : IAuthenticodeBackend
    {
        private readonly SafeFileHandle target; private readonly IResourceFactory resources; private int networkRequestCount;
        internal WinCryptBackend(SafeFileHandle target,IResourceFactory resources){if(target==null||target.IsInvalid||resources==null)ClosedFail("FILE_IDENTITY_DRIFT");this.target=target;this.resources=resources;}
        public int ObservedNetworkRequestCount { get { return networkRequestCount; } }
        private TargetSnapshot Capture(){byte[] bytes=ReadAll(target);string finalPath=FinalPath(target);return new TargetSnapshot(new ByteString(bytes),bytes.Length,Hash(bytes),Identity(target),Hash(Encoding.UTF8.GetBytes(finalPath)),target);}
        public TargetSnapshot CaptureTargetBefore(){return Capture();}
        public ContentEnvelope OpenEmbeddedMessage(ByteString heldBytes)
        {
            byte[] image=heldBytes.ToArray();IOwnedPinnedBytes pin=resources.PinBytes(image,"QUERY_IMAGE_PIN");CryptDataBlob blob=new CryptDataBlob{cbData=(uint)image.Length,pbData=pin.Pointer};IOwnedBuffer blobPointer=resources.AllocateStruct<CryptDataBlob>(blob,"QUERY_BLOB");IntPtr rawStore=IntPtr.Zero,rawMessage=IntPtr.Zero,rawContext=IntPtr.Zero;
            try
            {
                uint encoding,content,format;
                if(!CryptQueryObject(CERT_QUERY_OBJECT_BLOB,blobPointer.Handle,CERT_QUERY_CONTENT_FLAGS_V16,CERT_QUERY_FORMAT_FLAG_BINARY,0,out encoding,out content,out format,out rawStore,out rawMessage,out rawContext))
                {
                    if(Marshal.GetLastWin32Error()==CRYPT_E_NO_MATCH)return new ContentEnvelope(ContentKind.NO_EMBEDDED,null,null);
                    ClosedFail("SIGNATURE_INVALID");
                }
                if(rawContext!=IntPtr.Zero){IOwnedCertificate context=resources.AdoptCertificate(ref rawContext,StoreRole.ORIGINAL_STORE);context.Dispose();}
                if(content==CERT_QUERY_CONTENT_PKCS7_SIGNED_EMBED)
                {
                    if(format!=CERT_QUERY_FORMAT_BINARY)ClosedFail("SIGNATURE_INVALID");
                    IOwnedStore store=resources.AdoptStore(ref rawStore,StoreRole.ORIGINAL_STORE);
                    IOwnedMessage message=resources.AdoptMessage(ref rawMessage);
                    return new ContentEnvelope(ContentKind.EMBEDDED_SIGNED,store,message);
                }
                if(rawMessage!=IntPtr.Zero){CryptMsgClose(rawMessage);rawMessage=IntPtr.Zero;}
                if(rawStore!=IntPtr.Zero){CertCloseStore(rawStore,0);rawStore=IntPtr.Zero;}
                if(content==CERT_QUERY_CONTENT_PKCS7_SIGNED)return new ContentEnvelope(ContentKind.DETACHED,null,null);
                return new ContentEnvelope(ContentKind.NO_EMBEDDED,null,null);
            }
            finally{if(rawContext!=IntPtr.Zero)CertFreeCertificateContext(rawContext);if(rawMessage!=IntPtr.Zero)CryptMsgClose(rawMessage);if(rawStore!=IntPtr.Zero)CertCloseStore(rawStore,0);}
        }
        public CatalogClassification ClassifyCatalogIfNoEmbedded(TargetSnapshot heldTarget)
        {
            IntPtr rawAdmin=IntPtr.Zero,rawInfo=IntPtr.Zero,previous=IntPtr.Zero;IOwnedCatalogAdmin admin=null;IOwnedCatalogInfo info=null;
            try
            {
                Guid action=DriverActionVerify;
                if(!CryptCATAdminAcquireContext2(out rawAdmin,ref action,"SHA256",IntPtr.Zero,0)||rawAdmin==IntPtr.Zero)return CatalogClassification.CLASSIFICATION_ERROR;
                admin=resources.AdoptCatalogAdmin(ref rawAdmin);
                uint size=0;
                if(!CryptCATAdminCalcHashFromFileHandle2(admin.Handle,heldTarget.HeldFile.DangerousGetHandle(),ref size,null,0)||size==0||size>64)return CatalogClassification.CLASSIFICATION_ERROR;
                byte[] digest=new byte[size];
                if(!CryptCATAdminCalcHashFromFileHandle2(admin.Handle,heldTarget.HeldFile.DangerousGetHandle(),ref size,digest,0)||size!=digest.Length)return CatalogClassification.CLASSIFICATION_ERROR;
                rawInfo=CryptCATAdminEnumCatalogFromHash(admin.Handle,digest,size,0,ref previous);
                if(rawInfo==IntPtr.Zero){admin.Dispose();return CatalogClassification.CATALOG_ABSENT;}
                info=resources.AdoptCatalogInfo(ref rawInfo,admin);info.Dispose();admin.Dispose();return CatalogClassification.CATALOG_PRESENT;
            }
            catch(ClosedFailure){return CatalogClassification.CLASSIFICATION_ERROR;}
            finally{if(rawInfo!=IntPtr.Zero&&rawAdmin!=IntPtr.Zero)CryptCATAdminReleaseCatalogContext(rawAdmin,rawInfo,0);if(rawAdmin!=IntPtr.Zero)CryptCATAdminReleaseContext(rawAdmin,0);}
        }
        public uint GetSignerCount(ContentEnvelope content){if(!resources.Owns(content.Message))ClosedFail("SIGNATURE_INVALID");IOwnedBuffer pointer=resources.AllocateBytes(new byte[4],"SIGNER_COUNT");uint size=4;if(!CryptMsgGetParam(content.Message.Handle,CMSG_SIGNER_COUNT_PARAM,0,pointer.Handle,ref size)||size!=4)ClosedFail("SIGNATURE_INVALID");return unchecked((uint)Marshal.ReadInt32(pointer.Handle));}
        private ReadOnlyCollection<TimestampAttribute> TimestampAttributes(CryptAttributes attributes){List<TimestampAttribute> values=new List<TimestampAttribute>();int stride=Marshal.SizeOf(typeof(CryptAttribute));for(uint i=0;i<attributes.cAttr;i++){CryptAttribute attribute=(CryptAttribute)Marshal.PtrToStructure(IntPtr.Add(attributes.rgAttr,(int)i*stride),typeof(CryptAttribute));string oid=Marshal.PtrToStringAnsi(attribute.pszObjId);if(oid==LEGACY_COUNTERSIGN_OID||oid==RFC3161_COUNTERSIGN_OID){if(attribute.cValue!=1)ClosedFail("SIGNATURE_INVALID");CryptDataBlob blob=(CryptDataBlob)Marshal.PtrToStructure(attribute.rgValue,typeof(CryptDataBlob));values.Add(new TimestampAttribute(oid==LEGACY_COUNTERSIGN_OID?TimestampKind.LEGACY:TimestampKind.RFC3161,CopyBlob(blob)));}}return new ReadOnlyCollection<TimestampAttribute>(values.ToArray());}
        public SignerInfoRecord GetPrimarySignerInfo(ContentEnvelope content,uint index){if(!resources.Owns(content.Message))ClosedFail("SIGNATURE_INVALID");IOwnedBuffer pointer=MessageParameter(content.Message.Handle,CMSG_SIGNER_INFO_PARAM,index,resources);CmsgSignerInfo signer=(CmsgSignerInfo)Marshal.PtrToStructure(pointer.Handle,typeof(CmsgSignerInfo));return new SignerInfoRecord(new ByteString(MessageParameterBytes(content.Message.Handle,CMSG_ENCODED_SIGNER,index,resources)),CopyBlob(signer.Issuer),CopyBlob(signer.SerialNumber),CopyBlob(signer.EncryptedHash),TimestampAttributes(signer.UnauthAttrs));}
        public SignerCertInfoRecord GetSignerCertInfo(ContentEnvelope content,uint index){if(!resources.Owns(content.Message))ClosedFail("SIGNATURE_INVALID");IOwnedBuffer pointer=MessageParameter(content.Message.Handle,CMSG_SIGNER_CERT_INFO_PARAM,index,resources);CertInfo info=(CertInfo)Marshal.PtrToStructure(pointer.Handle,typeof(CertInfo));return new SignerCertInfoRecord(CopyBlob(info.Issuer),CopyBlob(info.SerialNumber));}
        private CertificateRecord CertificateRecordFromLease(IOwnedCertificate lease,ByteString expectedIssuer,ByteString expectedSerial){if(!resources.Owns(lease))ClosedFail("CERTIFICATE_FIELDS_INVALID");CertContext context=(CertContext)Marshal.PtrToStructure(lease.Handle,typeof(CertContext));if(context.pCertInfo==IntPtr.Zero)ClosedFail("CERTIFICATE_FIELDS_INVALID");CertInfo info=(CertInfo)Marshal.PtrToStructure(context.pCertInfo,typeof(CertInfo));ByteString issuer=CopyBlob(info.Issuer),serial=CopyBlob(info.SerialNumber);if(!issuer.FixedTimeEquals(expectedIssuer)||!serial.FixedTimeEquals(expectedSerial))ClosedFail("CERTIFICATE_FIELDS_INVALID");using(X509Certificate2 cert=new X509Certificate2(lease.Handle)){List<string> eku=new List<string>();foreach(X509Extension extension in cert.Extensions){X509EnhancedKeyUsageExtension enhanced=extension as X509EnhancedKeyUsageExtension;if(enhanced!=null)foreach(Oid oid in enhanced.EnhancedKeyUsages)eku.Add(oid.Value);}return new CertificateRecord(lease,issuer,serial,cert.Subject,cert.Issuer,Thumb(cert),cert.NotBefore.ToUniversalTime(),cert.NotAfter.ToUniversalTime(),new ReadOnlyCollection<string>(eku.ToArray()));}}
        public ReadOnlyCollection<CertificateRecord> EnumerateCertificates(IOwnedStore store){if(!resources.Owns(store)||store.StoreRole==StoreRole.NONE)ClosedFail("SIGNATURE_INVALID");List<CertificateRecord> values=new List<CertificateRecord>();IntPtr cursor=IntPtr.Zero,duplicate=IntPtr.Zero;try{while(true){IntPtr previous=cursor;cursor=IntPtr.Zero;IntPtr next=CertEnumCertificatesInStore(store.Handle,previous);cursor=next;if(next==IntPtr.Zero)break;duplicate=CertDuplicateCertificateContext(next);if(duplicate==IntPtr.Zero)ClosedFail("CERTIFICATE_FIELDS_INVALID");IOwnedCertificate lease=resources.AdoptCertificate(ref duplicate,store.StoreRole);CertContext context=(CertContext)Marshal.PtrToStructure(lease.Handle,typeof(CertContext));if(context.pCertInfo==IntPtr.Zero)ClosedFail("CERTIFICATE_FIELDS_INVALID");CertInfo info=(CertInfo)Marshal.PtrToStructure(context.pCertInfo,typeof(CertInfo));values.Add(CertificateRecordFromLease(lease,CopyBlob(info.Issuer),CopyBlob(info.SerialNumber)));}return new ReadOnlyCollection<CertificateRecord>(values.ToArray());}finally{if(cursor!=IntPtr.Zero)CertFreeCertificateContext(cursor);if(duplicate!=IntPtr.Zero)CertFreeCertificateContext(duplicate);}}
        public void EnablePrimaryStrongSignature(ContentEnvelope content)
        {
            if(!resources.Owns(content.Message))ClosedFail("SIGNATURE_INVALID");IOwnedBuffer oid=resources.AllocateAscii(STRONG_SIGN_OID,"STRONG_SIGN_OID");CertStrongSignPara strong=new CertStrongSignPara{cbSize=(uint)Marshal.SizeOf(typeof(CertStrongSignPara)),dwInfoChoice=CERT_STRONG_SIGN_OID_INFO_CHOICE,pszOID=oid.Handle};IOwnedBuffer strongPointer=resources.AllocateStruct<CertStrongSignPara>(strong,"STRONG_SIGN_PARA");if(!CryptMsgControl(content.Message.Handle,0,CMSG_CTRL_ENABLE_STRONG_SIGNATURE,strongPointer.Handle))ClosedFail("SIGNATURE_INVALID");
        }
        public bool VerifyPrimaryMessageSignature(ContentEnvelope content,CertificateRecord signer)
        {
            if(!resources.Owns(content.Message)||!resources.Owns(signer.Lease))ClosedFail("SIGNATURE_INVALID");CmsgCtrlVerifySignatureExPara verify=new CmsgCtrlVerifySignatureExPara{cbSize=(uint)Marshal.SizeOf(typeof(CmsgCtrlVerifySignatureExPara)),hCryptProv=IntPtr.Zero,dwSignerIndex=0,dwSignerType=CMSG_VERIFY_SIGNER_CERT,pvSigner=signer.Lease.Handle};IOwnedBuffer verifyPointer=resources.AllocateStruct<CmsgCtrlVerifySignatureExPara>(verify,"PRIMARY_VERIFY_PARA");return CryptMsgControl(content.Message.Handle,0,CMSG_CTRL_VERIFY_SIGNATURE_EX,verifyPointer.Handle);
        }
        public bool VerifyPeIndirectDigest(ContentEnvelope content,TargetSnapshot heldTarget)
        {
            if(!resources.Owns(content.Message))return false;uint encodedSize=0,decodedSize=0;
                if(!CryptMsgGetParam(content.Message.Handle,CMSG_CONTENT_PARAM,0,IntPtr.Zero,ref encodedSize)||encodedSize==0||encodedSize>1048576)return false;
                IOwnedBuffer encoded=resources.AllocateBytes(new byte[(int)encodedSize],"SIP_ENCODED_CONTENT");if(!CryptMsgGetParam(content.Message.Handle,CMSG_CONTENT_PARAM,0,encoded.Handle,ref encodedSize))return false;
                IOwnedBuffer structType=resources.AllocateAscii(SPC_INDIRECT_DATA_OBJID,"SIP_STRUCT_TYPE_OID");if(!CryptDecodeObjectEx(X509_ASN_ENCODING_PKCS7,structType.Handle,encoded.Handle,encodedSize,0,IntPtr.Zero,IntPtr.Zero,ref decodedSize)||decodedSize==0||decodedSize>1048576)return false;
                IOwnedBuffer decoded=resources.AllocateBytes(new byte[(int)decodedSize],"SIP_DECODE_BUFFER");if(!CryptDecodeObjectEx(X509_ASN_ENCODING_PKCS7,structType.Handle,encoded.Handle,encodedSize,0,IntPtr.Zero,decoded.Handle,ref decodedSize))return false;
                SipIndirectData indirect=(SipIndirectData)Marshal.PtrToStructure(decoded.Handle,typeof(SipIndirectData));
                string oid=Marshal.PtrToStringAnsi(indirect.DigestAlgorithm.pszObjId);
                if(oid!=SHA256_OID||indirect.Digest.cbData!=32||indirect.Digest.pbData==IntPtr.Zero)return false;
                if(indirect.DigestAlgorithm.Parameters.cbData!=0)
                {
                    if(indirect.DigestAlgorithm.Parameters.cbData!=2||Marshal.ReadByte(indirect.DigestAlgorithm.Parameters.pbData,0)!=5||Marshal.ReadByte(indirect.DigestAlgorithm.Parameters.pbData,1)!=0)return false;
                }
                byte[] expected=new byte[32];Marshal.Copy(indirect.Digest.pbData,expected,0,32);
                byte[] actual;
                lock(ImageDigestLock)
                {
                    SHA256Managed rawDigest=new SHA256Managed();
                    DigestFunction rawCallback=delegate(IntPtr state,IntPtr data,uint count){byte[] block=new byte[count];Marshal.Copy(data,block,0,(int)count);rawDigest.TransformBlock(block,0,block.Length,block,0);return true;};
                    IOwnedDigestCallback callback=resources.AdoptDigestCallback(rawCallback);
                    IOwnedSha256Digest digest=resources.AdoptSha256Digest(rawDigest);
                    if(!ImageGetDigestStream(heldTarget.HeldFile.DangerousGetHandle(),IMAGE_DIGEST_LEVEL_V16,callback.Callback,IntPtr.Zero))return false;
                    digest.Digest.TransformFinalBlock(new byte[0],0,0);actual=(byte[])digest.Digest.Hash.Clone();digest.Dispose();callback.Dispose();
                }
                int difference=0;for(int i=0;i<32;i++)difference|=expected[i]^actual[i];return difference==0;
        }
        public ReadOnlyCollection<TimestampAttribute> GetTimestampAttributes(SignerInfoRecord signer){return CloneTimestamps(signer.TimestampAttributes);}
        public LegacyCounterSigner DecodeLegacyCounterSigner(TimestampAttribute attribute){byte[] encoded=attribute.Encoded.ToArray();IOwnedPinnedBytes pin=resources.PinBytes(encoded,"LEGACY_COUNTER_PIN");uint size=0;if(!CryptDecodeObjectEx(X509_ASN_ENCODING_PKCS7,new IntPtr(500),pin.Pointer,(uint)encoded.Length,0,IntPtr.Zero,IntPtr.Zero,ref size)||size==0||size>1048576)ClosedFail("SIGNATURE_INVALID");IOwnedBuffer lease=resources.AllocateBytes(new byte[(int)size],"DECODE_BUFFER");uint actual=size;if(!CryptDecodeObjectEx(X509_ASN_ENCODING_PKCS7,new IntPtr(500),pin.Pointer,(uint)encoded.Length,0,IntPtr.Zero,lease.Handle,ref actual)||actual!=size)ClosedFail("SIGNATURE_INVALID");CmsgSignerInfo counter=(CmsgSignerInfo)Marshal.PtrToStructure(lease.Handle,typeof(CmsgSignerInfo));DateTime time=DecodeSigningTime(counter.AuthAttrs);return new LegacyCounterSigner(new ByteString(encoded),CopyBlob(counter.Issuer),CopyBlob(counter.SerialNumber),time.ToFileTimeUtc());}
        public bool VerifyLegacyCounterSignature(ByteString encodedPrimary,LegacyCounterSigner counter,CertificateRecord timestampCert){if(!resources.Owns(timestampCert.Lease))ClosedFail("SIGNATURE_INVALID");byte[] primary=encodedPrimary.ToArray(),encoded=counter.Encoded.ToArray();IOwnedPinnedBytes primaryPin=resources.PinBytes(primary,"LEGACY_PRIMARY_PIN"),counterPin=resources.PinBytes(encoded,"LEGACY_COUNTER_PIN");IOwnedBuffer oid=resources.AllocateAscii(STRONG_SIGN_OID,"LEGACY_STRONG_SIGN_OID");CertStrongSignPara strong=new CertStrongSignPara{cbSize=(uint)Marshal.SizeOf(typeof(CertStrongSignPara)),dwInfoChoice=CERT_STRONG_SIGN_OID_INFO_CHOICE,pszOID=oid.Handle};IOwnedBuffer strongPointer=resources.AllocateStruct<CertStrongSignPara>(strong,"LEGACY_STRONG_SIGN_PARA");return CryptMsgVerifyCountersignatureEncodedEx(IntPtr.Zero,X509_ASN_ENCODING_PKCS7,primaryPin.Pointer,(uint)primary.Length,counterPin.Pointer,(uint)encoded.Length,CMSG_VERIFY_SIGNER_CERT,timestampCert.Lease.Handle,CMSG_VERIFY_COUNTER_SIGN_ENABLE_STRONG_FLAG,strongPointer.Handle);}
        public Rfc3161Record VerifyRfc3161(TimestampAttribute attribute,ByteString encryptedHash,IOwnedStore originalStore){if(!resources.Owns(originalStore)||originalStore.StoreRole!=StoreRole.ORIGINAL_STORE)ClosedFail("SIGNATURE_INVALID");byte[] encoded=attribute.Encoded.ToArray(),hash=encryptedHash.ToArray();IOwnedPinnedBytes encodedPin=resources.PinBytes(encoded,"RFC_TIMESTAMP_PIN"),hashPin=resources.PinBytes(hash,"RFC_HASH_PIN");IntPtr rawContext=IntPtr.Zero,rawSigner=IntPtr.Zero,rawStore=IntPtr.Zero;try{if(!CryptVerifyTimeStampSignature(encodedPin.Pointer,(uint)encoded.Length,hashPin.Pointer,(uint)hash.Length,originalStore.Handle,out rawContext,out rawSigner,out rawStore)||rawContext==IntPtr.Zero||rawSigner==IntPtr.Zero||rawStore==IntPtr.Zero)ClosedFail("SIGNATURE_INVALID");IOwnedTimestampContext context=resources.AdoptTimestampContext(ref rawContext);IOwnedStore store=resources.AdoptStore(ref rawStore,StoreRole.RFC_TS_STORE);IOwnedCertificate certLease=resources.AdoptCertificate(ref rawSigner,StoreRole.RFC_TS_STORE);CryptTimestampContext outer=(CryptTimestampContext)Marshal.PtrToStructure(context.Handle,typeof(CryptTimestampContext));if(outer.pTimeStamp==IntPtr.Zero)ClosedFail("SIGNATURE_INVALID");CryptTimestampInfo info=(CryptTimestampInfo)Marshal.PtrToStructure(outer.pTimeStamp,typeof(CryptTimestampInfo));CertContext certContext=(CertContext)Marshal.PtrToStructure(certLease.Handle,typeof(CertContext));if(certContext.pCertInfo==IntPtr.Zero)ClosedFail("SIGNATURE_INVALID");CertInfo certInfo=(CertInfo)Marshal.PtrToStructure(certContext.pCertInfo,typeof(CertInfo));CertificateRecord cert=CertificateRecordFromLease(certLease,CopyBlob(certInfo.Issuer),CopyBlob(certInfo.SerialNumber));return new Rfc3161Record(cert,store,CopyBlob(info.HashedMessage),((long)info.ftTime.High<<32)|info.ftTime.Low,context);}finally{if(rawContext!=IntPtr.Zero)CryptMemFree(rawContext);if(rawSigner!=IntPtr.Zero)CertFreeCertificateContext(rawSigner);if(rawStore!=IntPtr.Zero)CertCloseStore(rawStore,0);}}
        public ChainResult BuildChain(CertificateRecord cert,IOwnedStore additionalStore,DateTime verificationUtc,string ekuOid){long rawTime=verificationUtc.ToFileTimeUtc();NativeFileTime nativeTime=new NativeFileTime{Low=(uint)rawTime,High=(uint)(rawTime>>32)};IOwnedBuffer when=resources.AllocateStruct<NativeFileTime>(nativeTime,"CHAIN_FILETIME"),oid=resources.AllocateAscii(ekuOid,"CHAIN_EKU_OID"),array=resources.AllocateBytes(new byte[IntPtr.Size],"CHAIN_EKU_POINTER"),strongOid=resources.AllocateAscii(STRONG_SIGN_OID,"STRONG_SIGN_OID");Marshal.WriteIntPtr(array.Handle,oid.Handle);CertStrongSignPara strong=new CertStrongSignPara{cbSize=(uint)Marshal.SizeOf(typeof(CertStrongSignPara)),dwInfoChoice=CERT_STRONG_SIGN_OID_INFO_CHOICE,pszOID=strongOid.Handle};IOwnedBuffer strongLease=resources.AllocateStruct<CertStrongSignPara>(strong,"STRONG_SIGN_PARA");CertChainParaV16 para=new CertChainParaV16{cbSize=(uint)Marshal.SizeOf(typeof(CertChainParaV16)),RequestedUsage=new CertUsageMatch{dwType=0,Usage=new CertEnhKeyUsage{cUsageIdentifier=1,rgpszUsageIdentifier=array.Handle}},RequestedIssuancePolicy=new CertUsageMatch(),dwUrlRetrievalTimeout=0,fCheckRevocationFreshnessTime=0,dwRevocationFreshnessTime=0,pftCacheResync=IntPtr.Zero,pStrongSignPara=strongLease.Handle,dwStrongSignFlags=0};IntPtr raw=IntPtr.Zero;try{if(!CertGetCertificateChain(IntPtr.Zero,cert.Lease.Handle,when.Handle,additionalStore.Handle,ref para,CERT_CHAIN_REVOCATION_CHECK_CHAIN|CERT_CHAIN_CACHE_ONLY_URL_RETRIEVAL,IntPtr.Zero,out raw)||raw==IntPtr.Zero)ClosedFail("OFFLINE_REVOCATION_UNAVAILABLE");IOwnedChain lease=resources.AdoptChain(ref raw,additionalStore.StoreRole);CertChainContext context=(CertChainContext)Marshal.PtrToStructure(lease.Handle,typeof(CertChainContext));uint trust=context.TrustStatus.dwErrorStatus,revocation=trust&REVOCATION_UNAVAILABLE_MASK,other=trust&~REVOCATION_UNAVAILABLE_MASK;return new ChainResult(trust,revocation,other,lease);}finally{if(raw!=IntPtr.Zero)CertFreeCertificateChain(raw);}}
        public PolicyResult VerifyPolicy(ChainResult chain,uint policyOid){CertChainPolicyPara para=new CertChainPolicyPara{cbSize=(uint)Marshal.SizeOf(typeof(CertChainPolicyPara))};CertChainPolicyStatus status=new CertChainPolicyStatus{cbSize=(uint)Marshal.SizeOf(typeof(CertChainPolicyStatus))};if(!CertVerifyCertificateChainPolicy(new IntPtr(policyOid),chain.Lease.Handle,ref para,ref status))ClosedFail("SIGNATURE_INVALID");return new PolicyResult(status.dwError);}
        public VersionRecord ReadVersions(ByteString heldBytes){byte[] bytes=heldBytes.ToArray();return new VersionRecord(VersionValue(bytes,"ProductVersion"),VersionValue(bytes,"FileVersion"));}
        public TargetSnapshot CaptureTargetAfter(){return Capture();}
    }
    private static class AuthenticodeResolver
    {
        private static T Run<T>(TraceRecorder trace,string operation,Func<T> action)
        {
            try{T value=action();trace.Add(operation,"OK");return value;}
            catch(ClosedFailure failure){trace.Add(operation,failure.Code);throw;}
            catch(Exception){trace.Add(operation,"SIGNATURE_INVALID");throw new ClosedFailure("SIGNATURE_INVALID");}
        }
        private static void Run(TraceRecorder trace,string operation,Action action){Run<int>(trace,operation,delegate{action();return 0;});}
        private static bool HasOid(CertificateRecord cert,string oid){foreach(string value in cert.EkuOids)if(value==oid)return true;return false;}
        private static CertificateRecord SelectUniqueCertificate(IResourceFactory resources,ReadOnlyCollection<CertificateRecord> candidates,ByteString issuer,ByteString serial,StoreRole role)
        {
            if(candidates==null)ClosedFail("CERTIFICATE_FIELDS_INVALID");CertificateRecord selected=null;int matches=0;
            foreach(CertificateRecord candidate in candidates){if(candidate==null||candidate.Lease==null||!resources.Owns(candidate.Lease)||candidate.Lease.StoreRole!=role)ClosedFail("CERTIFICATE_FIELDS_INVALID");if(candidate.Issuer.FixedTimeEquals(issuer)&&candidate.Serial.FixedTimeEquals(serial)){selected=candidate;matches++;}}
            if(matches!=1||selected==null)ClosedFail("CERTIFICATE_FIELDS_INVALID");return selected;
        }
        private static void ValidateOfflineChain(ChainResult chain,PolicyResult policy)
        {
            if(chain.OtherTrustBits!=0)ClosedFail("SIGNATURE_INVALID");
            if(chain.RevocationBits!=0)
            {
                if(policy.PolicyError==0||policy.PolicyError==0x80092012u||policy.PolicyError==0x80092013u)ClosedFail("OFFLINE_REVOCATION_UNAVAILABLE");
                ClosedFail("SIGNATURE_INVALID");
            }
            if(policy.PolicyError!=0)ClosedFail("SIGNATURE_INVALID");
        }
        private static DateTime IntegralFileTime(long value){if(value<=0||value%TimeSpan.TicksPerSecond!=0)ClosedFail("CERTIFICATE_FIELDS_INVALID");return DateTime.FromFileTimeUtc(value);}
        private static string Upper(ByteString value){return BitConverter.ToString(value.ToArray()).Replace("-",String.Empty);}
        private static string BuildEvidence(TargetSnapshot target,CertificateRecord signer,CertificateRecord timestamp,DateTime timestampUtc,VersionRecord versions)
        {
            string serial=Upper(signer.Serial);if(serial.Length<1||serial.Length>80)ClosedFail("CERTIFICATE_FIELDS_INVALID");
            return "{\"observedSha256\":\""+target.Sha256+"\",\"authenticodeObservedSha256\":\""+target.Sha256+"\",\"authenticodeFileIdentityBefore\":\""+target.FileIdentitySha256+"\",\"authenticodeFileIdentityAfter\":\""+target.FileIdentitySha256+"\",\"authenticodeHandlePolicy\":\"READ_ONLY_DENY_WRITE_DELETE_HELD\",\"authenticodeIdentityStable\":true,\"authenticodeStatus\":\"Valid\",\"authenticodeSignatureType\":\"Authenticode\",\"codeSigningEku\":\""+CODE_SIGNING_EKU+"\",\"signerSubject\":\""+Json(signer.Subject)+"\",\"signerThumbprint\":\""+signer.Thumbprint+"\",\"signerIssuer\":\""+Json(signer.IssuerSubject)+"\",\"signerSerial\":\""+serial+"\",\"signerNotBeforeUtc\":\""+Utc(signer.NotBeforeUtc)+"\",\"signerNotAfterUtc\":\""+Utc(signer.NotAfterUtc)+"\",\"signatureChainStatus\":\"Trusted\",\"revocationNetworkPolicy\":\"OFFLINE_CACHE_ONLY_NO_NETWORK\",\"signerChainRevocationMode\":\"Offline\",\"signerChainRevocationFlag\":\"EntireChain\",\"signerChainVerificationFlags\":\"NoFlag\",\"signerRevocationEvidenceStatus\":\"VALID_WITH_COMPLETE_OFFLINE_REVOCATION\",\"timestampSubject\":\""+Json(timestamp.Subject)+"\",\"timestampThumbprint\":\""+timestamp.Thumbprint+"\",\"timestampUtc\":\""+Utc(timestampUtc)+"\",\"timestampChainStatus\":\"Trusted\",\"timestampChainRevocationMode\":\"Offline\",\"timestampChainRevocationFlag\":\"EntireChain\",\"timestampChainVerificationFlags\":\"NoFlag\",\"timestampRevocationEvidenceStatus\":\"VALID_WITH_COMPLETE_OFFLINE_REVOCATION\",\"productVersion\":\""+Json(versions.ProductVersion)+"\",\"fileVersion\":\""+Json(versions.FileVersion)+"\"}";
        }
        internal static ResolutionResult Execute(Func<IResourceFactory,IAuthenticodeBackend> createBackend,bool synthetic,Func<string,string> evidenceMutation)
        {
            TraceRecorder trace=new TraceRecorder();ResourceFactory resources=new ResourceFactory(synthetic,trace);ResolutionResult result=new ResolutionResult();string output=null,reason=null;
            try
            {
                IAuthenticodeBackend backend=createBackend(resources);if(backend==null)ClosedFail("SIGNATURE_INVALID");
                TargetSnapshot before=Run(trace,"CAPTURE_TARGET_BEFORE",backend.CaptureTargetBefore);if(before.ByteCount<=0||before.ByteCount>16777216||before.ByteCount!=before.Bytes.Length||Hash(before.Bytes.ToArray())!=before.Sha256)ClosedFail("FILE_IDENTITY_DRIFT");
                ContentEnvelope content=Run(trace,"OPEN_EMBEDDED_MESSAGE",delegate{ContentEnvelope value=backend.OpenEmbeddedMessage(before.Bytes);if(value==null||value.Kind==ContentKind.DETACHED)ClosedFail("SIGNATURE_INVALID");return value;});
                if(content.Kind==ContentKind.NO_EMBEDDED)Run(trace,"CLASSIFY_CATALOG_IF_NO_EMBEDDED",delegate{CatalogClassification value=backend.ClassifyCatalogIfNoEmbedded(before);if(value==CatalogClassification.CATALOG_PRESENT)ClosedFail("CATALOG_SIGNATURE_REJECTED");ClosedFail("SIGNATURE_INVALID");});
                if(content.Kind!=ContentKind.EMBEDDED_SIGNED||!resources.Owns(content.OriginalStore)||!resources.Owns(content.Message)||content.OriginalStore.StoreRole!=StoreRole.ORIGINAL_STORE)ClosedFail("SIGNATURE_INVALID");
                Run(trace,"GET_SIGNER_COUNT",delegate{uint value=backend.GetSignerCount(content);if(value!=1)ClosedFail("SIGNATURE_INVALID");});
                SignerInfoRecord signerInfo=Run(trace,"GET_PRIMARY_SIGNER_INFO",delegate{return backend.GetPrimarySignerInfo(content,0);});SignerCertInfoRecord certInfo=Run(trace,"GET_SIGNER_CERT_INFO",delegate{return backend.GetSignerCertInfo(content,0);});
                Run(trace,"COMPARE_SIGNER_IDENTITIES",delegate{if(!signerInfo.Issuer.FixedTimeEquals(certInfo.Issuer)||!signerInfo.Serial.FixedTimeEquals(certInfo.Serial))ClosedFail("CERTIFICATE_FIELDS_INVALID");});
                CertificateRecord signer=Run(trace,"RESOLVE_PRIMARY_CERT",delegate{return SelectUniqueCertificate(resources,backend.EnumerateCertificates(content.OriginalStore),signerInfo.Issuer,signerInfo.Serial,StoreRole.ORIGINAL_STORE);});Run(trace,"COMPARE_RESOLVED_CERT_IDENTITY",delegate{if(!signer.Issuer.FixedTimeEquals(signerInfo.Issuer)||!signer.Serial.FixedTimeEquals(signerInfo.Serial)||!resources.Owns(signer.Lease)||signer.Lease.StoreRole!=StoreRole.ORIGINAL_STORE)ClosedFail("CERTIFICATE_FIELDS_INVALID");});
                Run(trace,"ENABLE_PRIMARY_STRONG_SIGNATURE",delegate{backend.EnablePrimaryStrongSignature(content);});
                Run(trace,"VERIFY_PRIMARY_MESSAGE_SIGNATURE",delegate{if(!backend.VerifyPrimaryMessageSignature(content,signer))ClosedFail("SIGNATURE_INVALID");});
                Run(trace,"VERIFY_PE_INDIRECT_DIGEST",delegate{if(!backend.VerifyPeIndirectDigest(content,before))ClosedFail("SIGNATURE_INVALID");});
                ReadOnlyCollection<TimestampAttribute> attributes=Run(trace,"GET_TIMESTAMP_ATTRIBUTES",delegate{ReadOnlyCollection<TimestampAttribute> value=backend.GetTimestampAttributes(signerInfo);if(value==null||value.Count!=1)ClosedFail("SIGNATURE_INVALID");return value;});
                CertificateRecord timestamp;IOwnedStore timestampStore;long rawTime;
                if(attributes[0].Kind==TimestampKind.LEGACY)
                {
                    LegacyCounterSigner counter=Run(trace,"DECODE_LEGACY_COUNTERSIGNER",delegate{return backend.DecodeLegacyCounterSigner(attributes[0]);});timestamp=Run(trace,"RESOLVE_LEGACY_TIMESTAMP_CERT",delegate{return SelectUniqueCertificate(resources,backend.EnumerateCertificates(content.OriginalStore),counter.Issuer,counter.Serial,StoreRole.ORIGINAL_STORE);});Run(trace,"VERIFY_LEGACY_COUNTERSIGNATURE",delegate{if(!backend.VerifyLegacyCounterSignature(signerInfo.EncodedSigner,counter,timestamp))ClosedFail("SIGNATURE_INVALID");});rawTime=counter.SigningTimeFileTime;timestampStore=content.OriginalStore;
                }
                else
                {
                    Rfc3161Record rfc=Run(trace,"VERIFY_RFC3161",delegate{Rfc3161Record value=backend.VerifyRfc3161(attributes[0],signerInfo.EncryptedHash,content.OriginalStore);if(value==null||value.TimestampStore==null||!resources.Owns(value.TimestampStore)||value.TimestampStore.StoreRole!=StoreRole.RFC_TS_STORE||value.Tsa==null||!resources.Owns(value.Tsa.Lease)||!value.HashedMessage.FixedTimeEquals(signerInfo.EncryptedHash))ClosedFail("SIGNATURE_INVALID");return value;});timestamp=rfc.Tsa;timestampStore=rfc.TimestampStore;rawTime=rfc.TimestampFileTime;
                }
                DateTime timestampUtc=Run(trace,"VALIDATE_TIMESTAMP_FILETIME",delegate{return IntegralFileTime(rawTime);});Run(trace,"VERIFY_PRIMARY_EKU",delegate{if(!HasOid(signer,CODE_SIGNING_EKU))ClosedFail("CERTIFICATE_FIELDS_INVALID");});Run(trace,"VERIFY_TIMESTAMP_EKU",delegate{if(!HasOid(timestamp,TIMESTAMP_EKU))ClosedFail("CERTIFICATE_FIELDS_INVALID");});
                ChainResult primaryChain=Run(trace,"BUILD_PRIMARY_CHAIN",delegate{return backend.BuildChain(signer,content.OriginalStore,timestampUtc,CODE_SIGNING_EKU);});Run(trace,"VERIFY_PRIMARY_POLICY",delegate{ValidateOfflineChain(primaryChain,backend.VerifyPolicy(primaryChain,2));});
                ChainResult timestampChain=Run(trace,"BUILD_TIMESTAMP_CHAIN",delegate{return backend.BuildChain(timestamp,timestampStore,timestampUtc,TIMESTAMP_EKU);});Run(trace,"VERIFY_TIMESTAMP_POLICY",delegate{ValidateOfflineChain(timestampChain,backend.VerifyPolicy(timestampChain,3));});
                Run(trace,"VALIDATE_TIMESTAMP_VALIDITY",delegate{if(timestampUtc<signer.NotBeforeUtc||timestampUtc>signer.NotAfterUtc||timestampUtc<timestamp.NotBeforeUtc||timestampUtc>timestamp.NotAfterUtc)ClosedFail("CERTIFICATE_FIELDS_INVALID");});VersionRecord versions=Run(trace,"READ_VERSIONS",delegate{VersionRecord value=backend.ReadVersions(before.Bytes);if(value.ProductVersion!="7.9.0"||value.FileVersion!="7.9.0.83")ClosedFail("VERSION_INVALID");return value;});TargetSnapshot after=Run(trace,"CAPTURE_TARGET_AFTER",backend.CaptureTargetAfter);
                Run(trace,"COMPARE_TARGET_SNAPSHOTS",delegate{if(before.ByteCount!=after.ByteCount||!before.Bytes.FixedTimeEquals(after.Bytes)||before.Sha256!=after.Sha256||before.FileIdentitySha256!=after.FileIdentitySha256||before.FinalPathSha256!=after.FinalPathSha256)ClosedFail("FILE_IDENTITY_DRIFT");if(backend.ObservedNetworkRequestCount!=0)ClosedFail("SIGNATURE_INVALID");});output=Run(trace,"BUILD_EVIDENCE",delegate{if(backend.ObservedNetworkRequestCount!=0)ClosedFail("SIGNATURE_INVALID");string value=BuildEvidence(before,signer,timestamp,timestampUtc,versions);if(evidenceMutation!=null)value=evidenceMutation(value);return BindEvidenceJson(value);});
            }
            catch(ClosedFailure failure){reason=failure.Code;}
            catch(Exception){reason="SIGNATURE_INVALID";}
            try{resources.DisposeAll();resources.AssertBalanced();}catch(Exception){output=null;reason="SIGNATURE_INVALID";}
            result.Output=reason==null?output:null;result.Reason=reason;result.TraceSha256=trace.Digest();result.ResourceSha256=resources.Digest();return result;
        }
    }
    private static CryptDataBlob AttributeValue(CryptAttributes attributes,string oid)
    {
        int found=0; CryptDataBlob selected=new CryptDataBlob(); int stride=Marshal.SizeOf(typeof(CryptAttribute));
        for(uint i=0;i<attributes.cAttr;i++) { CryptAttribute attribute=(CryptAttribute)Marshal.PtrToStructure(IntPtr.Add(attributes.rgAttr,(int)i*stride),typeof(CryptAttribute)); string current=Marshal.PtrToStringAnsi(attribute.pszObjId); if(current==oid) { if(attribute.cValue!=1) ClosedFail("CERTIFICATE_FIELDS_INVALID"); selected=(CryptDataBlob)Marshal.PtrToStructure(attribute.rgValue,typeof(CryptDataBlob)); found++; } }
        if(found!=1||selected.pbData==IntPtr.Zero||selected.cbData==0) ClosedFail("CERTIFICATE_FIELDS_INVALID"); return selected;
    }
    private static DateTime DecodeSigningTime(CryptAttributes attributes)
    {
        CryptDataBlob value=AttributeValue(attributes,SIGNING_TIME_OID); byte[] bytes=new byte[(int)value.cbData]; Marshal.Copy(value.pbData,bytes,0,(int)value.cbData); int offset=0; if(bytes.Length>=2&&bytes[0]==0x04&&bytes[1]<=bytes.Length-2) offset=2; if(offset+2>bytes.Length) ClosedFail("CERTIFICATE_FIELDS_INVALID"); int tag=bytes[offset],length=bytes[offset+1]; if((tag!=0x17&&tag!=0x18)||length<=0||offset+2+length!=bytes.Length) ClosedFail("CERTIFICATE_FIELDS_INVALID"); string text=Encoding.ASCII.GetString(bytes,offset+2,length); DateTime parsed; string format=tag==0x17?"yyMMddHHmmss'Z'":"yyyyMMddHHmmss'Z'"; if(!DateTime.TryParseExact(text,format,System.Globalization.CultureInfo.InvariantCulture,System.Globalization.DateTimeStyles.AdjustToUniversal|System.Globalization.DateTimeStyles.AssumeUniversal,out parsed)) ClosedFail("CERTIFICATE_FIELDS_INVALID"); return parsed.ToUniversalTime();
    }
    private static string VersionValue(byte[] bytes,string name)
    {
        byte[] marker=Encoding.Unicode.GetBytes(name); for(int i=0;i<=bytes.Length-marker.Length;i++) { bool match=true; for(int j=0;j<marker.Length;j++) if(bytes[i+j]!=marker[j]) { match=false; break; } if(!match) continue; int cursor=i+marker.Length; while(cursor+1<bytes.Length&&bytes[cursor]==0&&bytes[cursor+1]==0) cursor+=2; StringBuilder value=new StringBuilder(); while(cursor+1<bytes.Length) { ushort ch=BitConverter.ToUInt16(bytes,cursor); if(ch==0) break; if(ch<0x20||ch>0x7e) { value.Length=0; break; } value.Append((char)ch); cursor+=2; } if(value.Length>0&&value.Length<=128) return value.ToString(); } ClosedFail("VERSION_INVALID"); return String.Empty;
    }
    private static string Thumb(X509Certificate2 cert) { return (cert.Thumbprint??String.Empty).Replace(" ",String.Empty).ToUpperInvariant(); }
    private static string Utc(DateTime value) { return value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"); }
    private sealed class JsonField { internal string Key,Value; internal bool IsBoolean; }
    private static string ParseJsonString(string json,ref int cursor)
    {
        if(cursor>=json.Length||json[cursor]!='\"') ClosedFail("CERTIFICATE_FIELDS_INVALID"); cursor++; StringBuilder value=new StringBuilder();
        while(cursor<json.Length)
        {
            char current=json[cursor++]; if(current=='\"') return value.ToString(); if(current<0x20) ClosedFail("CERTIFICATE_FIELDS_INVALID");
            if(current=='\\') { if(cursor>=json.Length) ClosedFail("CERTIFICATE_FIELDS_INVALID"); current=json[cursor++]; if(current!='\\'&&current!='\"') ClosedFail("CERTIFICATE_FIELDS_INVALID"); }
            value.Append(current);
        }
        ClosedFail("CERTIFICATE_FIELDS_INVALID"); return String.Empty;
    }
    private static JsonField[] ParseEvidenceJson(string json)
    {
        if(json==null||Encoding.UTF8.GetByteCount(json)==0||Encoding.UTF8.GetByteCount(json)>16384||json[0]!='{'||json[json.Length-1]!='}'||json.IndexOf('\r')>=0||json.IndexOf('\n')>=0||json[0]=='\ufeff') ClosedFail("CERTIFICATE_FIELDS_INVALID");
        JsonField[] fields=new JsonField[EvidenceKeys.Length]; int cursor=1,count=0;
        while(cursor<json.Length-1)
        {
            if(count>=fields.Length) ClosedFail("CERTIFICATE_FIELDS_INVALID");
            JsonField field=new JsonField(); field.Key=ParseJsonString(json,ref cursor); if(cursor>=json.Length||json[cursor++]!=':') ClosedFail("CERTIFICATE_FIELDS_INVALID");
            if(cursor<json.Length&&json[cursor]=='\"') field.Value=ParseJsonString(json,ref cursor);
            else if(cursor+4<=json.Length&&json.Substring(cursor,4)=="true") { field.Value="true"; field.IsBoolean=true; cursor+=4; }
            else ClosedFail("CERTIFICATE_FIELDS_INVALID");
            fields[count++]=field; if(cursor==json.Length-1) break; if(json[cursor++]!=',') ClosedFail("CERTIFICATE_FIELDS_INVALID");
        }
        if(cursor!=json.Length-1||count!=EvidenceKeys.Length) ClosedFail("CERTIFICATE_FIELDS_INVALID");
        return fields;
    }
    private static bool IsHex(string value,int length,bool upper)
    {
        if(value==null||value.Length!=length) return false;
        foreach(char item in value) { bool digit=item>='0'&&item<='9',letter=upper?item>='A'&&item<='F':item>='a'&&item<='f'; if(!digit&&!letter) return false; }
        return true;
    }
    private static bool IsCanonicalUtc(string value)
    {
        DateTime parsed; return value!=null&&value.Length==20&&DateTime.TryParseExact(value,"yyyy-MM-ddTHH:mm:ss'Z'",System.Globalization.CultureInfo.InvariantCulture,System.Globalization.DateTimeStyles.AssumeUniversal|System.Globalization.DateTimeStyles.AdjustToUniversal,out parsed);
    }
    private static string BindEvidenceJson(string json)
    {
        JsonField[] fields=ParseEvidenceJson(json); for(int i=0;i<EvidenceKeys.Length;i++) if(fields[i].Key!=EvidenceKeys[i]) ClosedFail("CERTIFICATE_FIELDS_INVALID");
        if(!IsHex(fields[0].Value,64,false)||fields[1].Value!=fields[0].Value||!IsHex(fields[2].Value,64,false)||fields[3].Value!=fields[2].Value) ClosedFail("FILE_IDENTITY_DRIFT");
        if(fields[4].Value!="READ_ONLY_DENY_WRITE_DELETE_HELD"||!fields[5].IsBoolean||fields[5].Value!="true"||fields[6].Value!="Valid"||fields[7].Value!="Authenticode"||fields[8].Value!=CODE_SIGNING_EKU) ClosedFail("CERTIFICATE_FIELDS_INVALID");
        if(fields[9].Value.Length<1||fields[9].Value.Length>512||!IsHex(fields[10].Value,40,true)||fields[11].Value.Length<1||fields[11].Value.Length>512||!IsHex(fields[12].Value,fields[12].Value.Length,true)||fields[12].Value.Length<1||fields[12].Value.Length>80) ClosedFail("CERTIFICATE_FIELDS_INVALID");
        if(!IsCanonicalUtc(fields[13].Value)||!IsCanonicalUtc(fields[14].Value)||String.CompareOrdinal(fields[13].Value,fields[14].Value)>0||fields[15].Value!="Trusted"||fields[16].Value!="OFFLINE_CACHE_ONLY_NO_NETWORK"||fields[17].Value!="Offline"||fields[18].Value!="EntireChain"||fields[19].Value!="NoFlag"||fields[20].Value!="VALID_WITH_COMPLETE_OFFLINE_REVOCATION") ClosedFail("CERTIFICATE_FIELDS_INVALID");
        if(fields[21].Value.Length<1||fields[21].Value.Length>512||!IsHex(fields[22].Value,40,true)||!IsCanonicalUtc(fields[23].Value)||String.CompareOrdinal(fields[23].Value,fields[13].Value)<0||String.CompareOrdinal(fields[23].Value,fields[14].Value)>0||fields[24].Value!="Trusted"||fields[25].Value!="Offline"||fields[26].Value!="EntireChain"||fields[27].Value!="NoFlag"||fields[28].Value!="VALID_WITH_COMPLETE_OFFLINE_REVOCATION"||fields[29].Value!="7.9.0"||fields[30].Value!="7.9.0.83") ClosedFail("CERTIFICATE_FIELDS_INVALID");
        return json;
    }
#if FLUYO_SYNTHETIC_TESTS
    private static readonly string[] InternalResultKeys = new string[] { "schemaVersion","fixtureId","observedOutcome","fixedReason","productionOutputByteCount","productionOutputSha256","resolverTraceSha256","resourceTraceSha256","networkRequestCount" };
    private sealed class FixtureDefinition
    {
        internal readonly string Id;
        internal FixtureDefinition(string id) { Id=id; }
    }
    private static readonly FixtureDefinition[] SyntheticFixtures = new FixtureDefinition[] {
        new FixtureDefinition("VALID_LEGACY"),new FixtureDefinition("VALID_RFC_TSSTORE_ONLY"),new FixtureDefinition("CERT_BAG_DECOY"),new FixtureDefinition("SIGNER_COUNT_ZERO"),new FixtureDefinition("SIGNER_COUNT_TWO"),new FixtureDefinition("SIGNER_INFO_CERT_INFO_MISMATCH"),new FixtureDefinition("RESOLVED_CERT_MISMATCH"),new FixtureDefinition("TIMESTAMP_NONE"),new FixtureDefinition("TIMESTAMP_BOTH"),new FixtureDefinition("TIMESTAMP_DUPLICATE"),new FixtureDefinition("LEGACY_COUNTERSIGN_INVALID"),new FixtureDefinition("LEGACY_WRONG_STORE"),new FixtureDefinition("RFC_HASH_MISMATCH"),new FixtureDefinition("RFC_TSSTORE_EMPTY"),new FixtureDefinition("RFC_TSSTORE_UNRELATED"),new FixtureDefinition("RFC_TSSTORE_CLOSED"),new FixtureDefinition("SIGNER_EKU_MISSING"),new FixtureDefinition("TSA_EKU_MISSING"),new FixtureDefinition("SIGNER_CHAIN_TRUST_ERROR"),new FixtureDefinition("TSA_CHAIN_TRUST_ERROR"),new FixtureDefinition("SIGNER_POLICY_ERROR"),new FixtureDefinition("TSA_POLICY_ERROR"),new FixtureDefinition("OFFLINE_REVOCATION_MISSING"),new FixtureDefinition("FRACTIONAL_FILETIME"),new FixtureDefinition("TIMESTAMP_OUTSIDE_SIGNER_VALIDITY"),new FixtureDefinition("TIMESTAMP_OUTSIDE_TSA_VALIDITY"),new FixtureDefinition("HANDLE_IDENTITY_DRIFT"),new FixtureDefinition("HANDLE_HASH_DRIFT"),new FixtureDefinition("HANDLE_PATH_DRIFT"),new FixtureDefinition("CONTENT_UNSIGNED"),new FixtureDefinition("CONTENT_DETACHED"),new FixtureDefinition("CONTENT_CATALOG_ONLY"),new FixtureDefinition("VERSION_INVALID"),new FixtureDefinition("OUTPUT_EXTRA_FIELD"),new FixtureDefinition("OUTPUT_MISSING_FIELD"),new FixtureDefinition("OUTPUT_REORDERED"),new FixtureDefinition("OUTPUT_WRONG_TYPE"),new FixtureDefinition("OUTPUT_OVERSIZE"),new FixtureDefinition("OUTPUT_TRAILING")
    };
    private enum SyntheticMutation { NONE,REVERSE_STORE_ORDER,PRIMARY_ENABLE_FAIL,LEGACY_FLAGS_ZERO,LEGACY_EXTRA_NULL,CATALOG_CLOSE_REVERSED,NETWORK_ATTEMPT_BEFORE_OUTPUT }
    private sealed class SyntheticStoreModel
    {
        internal readonly string CertificateId,Subject,Issuer,Thumbprint;internal readonly ByteString IssuerBytes,SerialBytes;internal readonly StoreRole StoreRole;internal readonly DateTime NotBeforeUtc,NotAfterUtc;internal readonly ReadOnlyCollection<string> EkuOids;internal readonly bool IsDecoy;
        internal SyntheticStoreModel(string id,ByteString issuer,ByteString serial,StoreRole role,string subject,string issuerSubject,string thumbprint,DateTime notBefore,DateTime notAfter,string[] eku,bool decoy){if(String.IsNullOrEmpty(id)||issuer==null||serial==null||role==StoreRole.NONE||eku==null)ClosedFail("SIGNATURE_INVALID");CertificateId=id;IssuerBytes=new ByteString(issuer.ToArray());SerialBytes=new ByteString(serial.ToArray());StoreRole=role;Subject=subject;Issuer=issuerSubject;Thumbprint=thumbprint;NotBeforeUtc=notBefore;NotAfterUtc=notAfter;EkuOids=new ReadOnlyCollection<string>((string[])eku.Clone());IsDecoy=decoy;}
    }
    private sealed class SyntheticBackend : IAuthenticodeBackend
    {
        private readonly string fixture;private readonly IResourceFactory resources;private readonly SyntheticMutation mutation;private int nextHandle=100;private int observedNetworkRequestCount;private int enumerationCount;private IOwnedStore rfcStore;
        private static readonly byte[] TargetBytes=Encoding.ASCII.GetBytes("FLUYO_SYNTHETIC_AUTHENTICODE_TARGET_V1");private static readonly ByteString PrimaryIssuer=new ByteString(new byte[]{1,2}),PrimarySerial=new ByteString(new byte[]{3}),TimestampIssuer=new ByteString(new byte[]{4,5}),TimestampSerial=new ByteString(new byte[]{6}),EncryptedHash=new ByteString(new byte[]{7,8,9});
        internal SyntheticBackend(string fixture,IResourceFactory resources):this(fixture,resources,SyntheticMutation.NONE){}
        internal SyntheticBackend(string fixture,IResourceFactory resources,SyntheticMutation mutation){this.fixture=fixture;this.resources=resources;this.mutation=mutation;}
        private IntPtr Handle(){return new IntPtr(nextHandle++);} public int ObservedNetworkRequestCount{get{return observedNetworkRequestCount;}}
        private IOwnedStore Store(StoreRole role){IntPtr raw=Handle();return resources.AdoptStore(ref raw,role);} private IOwnedMessage Message(){IntPtr raw=Handle();return resources.AdoptMessage(ref raw);} private IOwnedCertificate CertificateLease(StoreRole role){IntPtr raw=Handle();return resources.AdoptCertificate(ref raw,role);} private IOwnedTimestampContext TimestampContext(){IntPtr raw=Handle();return resources.AdoptTimestampContext(ref raw);} private IOwnedChain Chain(StoreRole role){IntPtr raw=Handle();return resources.AdoptChain(ref raw,role);}
        private TargetSnapshot Snapshot(bool after){byte[] bytes=(byte[])TargetBytes.Clone();string sha=Hash(bytes),identity=Hash(Encoding.ASCII.GetBytes("identity")),path=Hash(Encoding.ASCII.GetBytes("path"));if(after&&fixture=="HANDLE_HASH_DRIFT")sha=new string('0',64);if(after&&fixture=="HANDLE_IDENTITY_DRIFT")identity=new string('1',64);if(after&&fixture=="HANDLE_PATH_DRIFT")path=new string('2',64);return new TargetSnapshot(new ByteString(bytes),bytes.Length,sha,identity,path,new SafeFileHandle(new IntPtr(1),false));}
        public TargetSnapshot CaptureTargetBefore(){return Snapshot(false);} public TargetSnapshot CaptureTargetAfter(){if(mutation==SyntheticMutation.NETWORK_ATTEMPT_BEFORE_OUTPUT)observedNetworkRequestCount++;return Snapshot(true);}
        public ContentEnvelope OpenEmbeddedMessage(ByteString heldBytes){IOwnedPinnedBytes pin=resources.PinBytes(heldBytes.ToArray(),"QUERY_IMAGE_PIN");resources.AllocateStruct<CryptDataBlob>(new CryptDataBlob{cbData=(uint)pin.ByteCount,pbData=pin.Pointer},"QUERY_BLOB");ContentKind kind=(fixture=="CONTENT_CATALOG_ONLY"||fixture=="CONTENT_UNSIGNED")?ContentKind.NO_EMBEDDED:fixture=="CONTENT_DETACHED"?ContentKind.DETACHED:ContentKind.EMBEDDED_SIGNED;if(kind!=ContentKind.EMBEDDED_SIGNED)return new ContentEnvelope(kind,null,null);return new ContentEnvelope(kind,Store(StoreRole.ORIGINAL_STORE),Message());}
        public CatalogClassification ClassifyCatalogIfNoEmbedded(TargetSnapshot heldTarget){if(mutation==SyntheticMutation.NETWORK_ATTEMPT_BEFORE_OUTPUT)observedNetworkRequestCount++;IntPtr rawAdmin=Handle();IOwnedCatalogAdmin admin=resources.AdoptCatalogAdmin(ref rawAdmin);if(mutation==SyntheticMutation.CATALOG_CLOSE_REVERSED){if(fixture!="CONTENT_CATALOG_ONLY")ClosedFail("SIGNATURE_INVALID");ResourceFactory concrete=resources as ResourceFactory;if(concrete==null)ClosedFail("SIGNATURE_INVALID");IntPtr reversedRawInfo=Handle();IOwnedCatalogInfo reversedInfo=resources.AdoptCatalogInfo(ref reversedRawInfo,admin);string beforeRejectedClose=concrete.CanonicalRows();bool rejected=false;try{admin.Dispose();}catch(ClosedFailure failure){if(failure.Code!="SIGNATURE_INVALID")throw;rejected=true;}if(!rejected||beforeRejectedClose!=concrete.CanonicalRows()||!resources.Owns(admin)||!resources.Owns(reversedInfo))ClosedFail("SIGNATURE_INVALID");reversedInfo.Dispose();admin.Dispose();if(resources.Owns(reversedInfo)||resources.Owns(admin)||concrete.OpenCount!=0)ClosedFail("SIGNATURE_INVALID");ClosedFail("SIGNATURE_INVALID");}if(fixture=="CONTENT_CATALOG_ONLY"){IntPtr rawInfo=Handle();IOwnedCatalogInfo info=resources.AdoptCatalogInfo(ref rawInfo,admin);info.Dispose();admin.Dispose();return CatalogClassification.CATALOG_PRESENT;}if(fixture=="CONTENT_UNSIGNED"){admin.Dispose();return CatalogClassification.CATALOG_ABSENT;}return CatalogClassification.CLASSIFICATION_ERROR;}
        public uint GetSignerCount(ContentEnvelope content){resources.AllocateBytes(new byte[4],"SIGNER_COUNT");return fixture=="SIGNER_COUNT_ZERO"?0u:fixture=="SIGNER_COUNT_TWO"?2u:1u;}
        private ReadOnlyCollection<TimestampAttribute> Attributes(){List<TimestampAttribute> values=new List<TimestampAttribute>();bool rfc=fixture.StartsWith("RFC_",StringComparison.Ordinal)||fixture=="VALID_RFC_TSSTORE_ONLY";if(fixture=="TIMESTAMP_NONE")return new ReadOnlyCollection<TimestampAttribute>(values);values.Add(new TimestampAttribute(rfc?TimestampKind.RFC3161:TimestampKind.LEGACY,new ByteString(new byte[]{10,11})));if(fixture=="TIMESTAMP_BOTH")values.Add(new TimestampAttribute(TimestampKind.RFC3161,new ByteString(new byte[]{12})));if(fixture=="TIMESTAMP_DUPLICATE")values.Add(new TimestampAttribute(TimestampKind.LEGACY,new ByteString(new byte[]{13})));return new ReadOnlyCollection<TimestampAttribute>(values);}
        public SignerInfoRecord GetPrimarySignerInfo(ContentEnvelope content,uint index){resources.AllocateBytes(new byte[]{1},"MESSAGE_PARAMETER");resources.AllocateBytes(new byte[]{2},"MESSAGE_PARAMETER");return new SignerInfoRecord(new ByteString(new byte[]{14,15}),PrimaryIssuer,PrimarySerial,EncryptedHash,Attributes());}
        public SignerCertInfoRecord GetSignerCertInfo(ContentEnvelope content,uint index){resources.AllocateBytes(new byte[]{3},"MESSAGE_PARAMETER");return new SignerCertInfoRecord(fixture=="SIGNER_INFO_CERT_INFO_MISMATCH"?new ByteString(new byte[]{99,2}):PrimaryIssuer,PrimarySerial);}
        private CertificateRecord Certificate(bool primary,StoreRole role,ByteString issuer,ByteString serial,bool decoy){List<string> eku=new List<string>();if(primary&&fixture!="SIGNER_EKU_MISSING")eku.Add(CODE_SIGNING_EKU);if(!primary&&fixture!="TSA_EKU_MISSING")eku.Add(TIMESTAMP_EKU);DateTime before=new DateTime(2026,1,1,0,0,0,DateTimeKind.Utc),after=new DateTime(2027,1,1,0,0,0,DateTimeKind.Utc);if(primary&&fixture=="TIMESTAMP_OUTSIDE_SIGNER_VALIDITY")before=new DateTime(2026,11,12,0,0,0,DateTimeKind.Utc);if(!primary&&fixture=="TIMESTAMP_OUTSIDE_TSA_VALIDITY")after=new DateTime(2026,11,10,0,0,0,DateTimeKind.Utc);SyntheticStoreModel row=new SyntheticStoreModel(decoy?"DECOY":"EXACT",issuer,serial,role,primary?"CN=Fluyo Synthetic Signer":"CN=Fluyo Synthetic Timestamp","CN=Fluyo Synthetic Issuer",primary?new string('A',40):new string('B',40),before,after,eku.ToArray(),decoy);return new CertificateRecord(CertificateLease(row.StoreRole),row.IssuerBytes,row.SerialBytes,row.Subject,row.Issuer,row.Thumbprint,row.NotBeforeUtc,row.NotAfterUtc,row.EkuOids);}
        public ReadOnlyCollection<CertificateRecord> EnumerateCertificates(IOwnedStore store){if(!resources.Owns(store))ClosedFail("SIGNATURE_INVALID");enumerationCount++;List<CertificateRecord> values=new List<CertificateRecord>();if(store.StoreRole==StoreRole.ORIGINAL_STORE){if(fixture=="CERT_BAG_DECOY"&&enumerationCount==1){values.Add(Certificate(true,store.StoreRole,new ByteString(new byte[]{0x44,0x45}),new ByteString(new byte[]{0x99}),true));values.Add(Certificate(true,store.StoreRole,PrimaryIssuer,PrimarySerial,false));values.Add(Certificate(true,store.StoreRole,new ByteString(new byte[]{0x46,0x47}),new ByteString(new byte[]{0x98}),true));}else if(fixture=="CERT_BAG_DECOY"){values.Add(Certificate(false,store.StoreRole,TimestampIssuer,TimestampSerial,false));}else{values.Add(Certificate(true,store.StoreRole,PrimaryIssuer,PrimarySerial,false));if(fixture=="RESOLVED_CERT_MISMATCH")values.Add(Certificate(true,store.StoreRole,PrimaryIssuer,PrimarySerial,false));if(fixture!="LEGACY_WRONG_STORE"&&fixture!="VALID_RFC_TSSTORE_ONLY"&&!fixture.StartsWith("RFC_",StringComparison.Ordinal))values.Add(Certificate(false,store.StoreRole,TimestampIssuer,TimestampSerial,false));}}if(mutation==SyntheticMutation.REVERSE_STORE_ORDER)values.Reverse();return new ReadOnlyCollection<CertificateRecord>(values.ToArray());}
        public void EnablePrimaryStrongSignature(ContentEnvelope content){if(content==null||content.Message==null||!resources.Owns(content.Message)||mutation==SyntheticMutation.PRIMARY_ENABLE_FAIL)ClosedFail("SIGNATURE_INVALID");IOwnedBuffer oid=resources.AllocateAscii(STRONG_SIGN_OID,"STRONG_SIGN_OID");resources.AllocateStruct<CertStrongSignPara>(new CertStrongSignPara{cbSize=(uint)Marshal.SizeOf(typeof(CertStrongSignPara)),dwInfoChoice=CERT_STRONG_SIGN_OID_INFO_CHOICE,pszOID=oid.Handle},"STRONG_SIGN_PARA");}
        public bool VerifyPrimaryMessageSignature(ContentEnvelope content,CertificateRecord signer){resources.AllocateStruct<CmsgCtrlVerifySignatureExPara>(new CmsgCtrlVerifySignatureExPara{cbSize=(uint)Marshal.SizeOf(typeof(CmsgCtrlVerifySignatureExPara)),hCryptProv=IntPtr.Zero,dwSignerIndex=0,dwSignerType=CMSG_VERIFY_SIGNER_CERT,pvSigner=signer.Lease.Handle},"PRIMARY_VERIFY_PARA");return true;}
        public bool VerifyPeIndirectDigest(ContentEnvelope content,TargetSnapshot heldTarget){resources.AllocateBytes(new byte[]{1},"SIP_ENCODED_CONTENT");resources.AllocateAscii(SPC_INDIRECT_DATA_OBJID,"SIP_STRUCT_TYPE_OID");resources.AllocateBytes(new byte[]{2},"SIP_DECODE_BUFFER");SHA256Managed rawDigest=new SHA256Managed();DigestFunction rawCallback=delegate(IntPtr state,IntPtr data,uint count){return true;};IOwnedDigestCallback callback=resources.AdoptDigestCallback(rawCallback);IOwnedSha256Digest digest=resources.AdoptSha256Digest(rawDigest);digest.Dispose();callback.Dispose();return true;}
        public ReadOnlyCollection<TimestampAttribute> GetTimestampAttributes(SignerInfoRecord signer){return CloneTimestamps(signer.TimestampAttributes);}
        public LegacyCounterSigner DecodeLegacyCounterSigner(TimestampAttribute attribute){resources.PinBytes(attribute.Encoded.ToArray(),"LEGACY_COUNTER_PIN");resources.AllocateBytes(new byte[]{1},"DECODE_BUFFER");long time=new DateTime(2026,11,11,0,0,0,DateTimeKind.Utc).ToFileTimeUtc();if(fixture=="FRACTIONAL_FILETIME")time++;return new LegacyCounterSigner(attribute.Encoded,TimestampIssuer,TimestampSerial,time);}
        public bool VerifyLegacyCounterSignature(ByteString encodedPrimary,LegacyCounterSigner counter,CertificateRecord timestampCert){resources.PinBytes(encodedPrimary.ToArray(),"LEGACY_PRIMARY_PIN");resources.PinBytes(counter.Encoded.ToArray(),"LEGACY_COUNTER_PIN");if(mutation==SyntheticMutation.LEGACY_FLAGS_ZERO||mutation==SyntheticMutation.LEGACY_EXTRA_NULL)return false;IOwnedBuffer oid=resources.AllocateAscii(STRONG_SIGN_OID,"LEGACY_STRONG_SIGN_OID");resources.AllocateStruct<CertStrongSignPara>(new CertStrongSignPara{cbSize=(uint)Marshal.SizeOf(typeof(CertStrongSignPara)),dwInfoChoice=CERT_STRONG_SIGN_OID_INFO_CHOICE,pszOID=oid.Handle},"LEGACY_STRONG_SIGN_PARA");return fixture!="LEGACY_COUNTERSIGN_INVALID";}
        public Rfc3161Record VerifyRfc3161(TimestampAttribute attribute,ByteString encryptedHash,IOwnedStore originalStore){resources.PinBytes(attribute.Encoded.ToArray(),"RFC_TIMESTAMP_PIN");resources.PinBytes(encryptedHash.ToArray(),"RFC_HASH_PIN");if(fixture=="RFC_TSSTORE_EMPTY"||fixture=="RFC_TSSTORE_UNRELATED")ClosedFail("SIGNATURE_INVALID");rfcStore=Store(StoreRole.RFC_TS_STORE);CertificateRecord tsa=Certificate(false,StoreRole.RFC_TS_STORE,TimestampIssuer,TimestampSerial,false);ByteString hash=fixture=="RFC_HASH_MISMATCH"?new ByteString(new byte[]{99}):encryptedHash;return new Rfc3161Record(tsa,rfcStore,hash,new DateTime(2026,11,11,0,0,0,DateTimeKind.Utc).ToFileTimeUtc(),TimestampContext());}
        public ChainResult BuildChain(CertificateRecord cert,IOwnedStore additionalStore,DateTime verificationUtc,string ekuOid){bool primary=cert.Subject.IndexOf("Signer",StringComparison.Ordinal)>=0;if(!primary&&fixture=="RFC_TSSTORE_CLOSED"&&rfcStore!=null)rfcStore.Dispose();if(!additionalStore.IsOpen)ClosedFail("SIGNATURE_INVALID");IOwnedBuffer eku=resources.AllocateAscii(ekuOid,"CHAIN_EKU_OID"),ekuPointer=resources.AllocateBytes(new byte[IntPtr.Size],"CHAIN_EKU_POINTER");Marshal.WriteIntPtr(ekuPointer.Handle,eku.Handle);resources.AllocateStruct<NativeFileTime>(new NativeFileTime(),"CHAIN_FILETIME");IOwnedBuffer strong=resources.AllocateAscii(STRONG_SIGN_OID,"STRONG_SIGN_OID");resources.AllocateStruct<CertStrongSignPara>(new CertStrongSignPara{cbSize=(uint)Marshal.SizeOf(typeof(CertStrongSignPara)),dwInfoChoice=CERT_STRONG_SIGN_OID_INFO_CHOICE,pszOID=strong.Handle},"STRONG_SIGN_PARA");uint trust=(primary&&fixture=="SIGNER_CHAIN_TRUST_ERROR")?0x60u:(!primary&&fixture=="TSA_CHAIN_TRUST_ERROR")?0x20u:primary&&fixture=="OFFLINE_REVOCATION_MISSING"?REVOCATION_UNAVAILABLE_MASK:0u;return new ChainResult(trust,trust&REVOCATION_UNAVAILABLE_MASK,trust&~REVOCATION_UNAVAILABLE_MASK,Chain(additionalStore.StoreRole));}
        public PolicyResult VerifyPolicy(ChainResult chain,uint policyOid){bool fail=(policyOid==2&&fixture=="SIGNER_POLICY_ERROR")||(policyOid==3&&fixture=="TSA_POLICY_ERROR");return new PolicyResult(fail?1u:0u);}
        public VersionRecord ReadVersions(ByteString heldBytes){return new VersionRecord(fixture=="VERSION_INVALID"?"7.8.0":"7.9.0","7.9.0.83");}
    }
    private static FixtureDefinition FindFixture(string id) { foreach(FixtureDefinition fixture in SyntheticFixtures) if(fixture.Id==id) return fixture; throw new Exception(); }
    private static string MutateEvidence(string id,string value){if(id=="OUTPUT_EXTRA_FIELD")return value.Substring(0,value.Length-1)+",\"extra\":true}";if(id=="OUTPUT_MISSING_FIELD")return "{"+value.Substring(value.IndexOf(',')+1);if(id=="OUTPUT_REORDERED")return value.Replace("\"observedSha256\"","\"__swap__\"").Replace("\"authenticodeObservedSha256\"","\"observedSha256\"").Replace("\"__swap__\"","\"authenticodeObservedSha256\"");if(id=="OUTPUT_WRONG_TYPE")return value.Replace("\"authenticodeIdentityStable\":true","\"authenticodeIdentityStable\":\"true\"");if(id=="OUTPUT_OVERSIZE")return value+new string('A',17000);if(id=="OUTPUT_TRAILING")return value+"\n";return value;}
    private sealed class FakeOwnedStore : IOwnedStore { public IntPtr Handle{get{return new IntPtr(77);}}public string ResourceId{get{return"FAKE";}}public StoreRole StoreRole{get{return StoreRole.ORIGINAL_STORE;}}public bool IsOpen{get{return true;}}public void Dispose(){} }
    private static void RequireMutation(string fixture,SyntheticMutation mutation,bool success,string reason)
    {
        ResolutionResult result=AuthenticodeResolver.Execute(delegate(IResourceFactory resources){return new SyntheticBackend(fixture,resources,mutation);},true,null);if(result.Success!=success||result.Reason!=reason)throw new Exception();
    }
    private static void RequireAdoptionCase(string point)
    {
        TraceRecorder trace=new TraceRecorder();ResourceFactory factory=new ResourceFactory(true,trace);factory.SetSyntheticInjection(point);bool succeeded=false;try{IOwnedBuffer buffer=factory.AllocateBytes(new byte[]{1},"MESSAGE_PARAMETER");if(point!="NONE")throw new Exception();buffer.Dispose();succeeded=true;}catch(ClosedFailure failure){if(point=="NONE"||failure.Code!="SIGNATURE_INVALID")throw;}
        string open="{\"sequence\":1,\"action\":\"OPEN\",\"resourceType\":\"MESSAGE_PARAMETER\",\"resourceId\":\"MESSAGE_PARAMETER#1\",\"resultCode\":\"OK\",\"liveCount\":1}\n";
        string expectedLedger=point=="BEFORE_LEDGER_TOKEN"?String.Empty:open+(point=="NONE"?"{\"sequence\":2,\"action\":\"CLOSE\",\"resourceType\":\"MESSAGE_PARAMETER\",\"resourceId\":\"MESSAGE_PARAMETER#1\",\"resultCode\":\"OK\",\"liveCount\":0}\n":"{\"sequence\":2,\"action\":\"ROLLBACK_CLOSE\",\"resourceType\":\"MESSAGE_PARAMETER\",\"resourceId\":\"MESSAGE_PARAMETER#1\",\"resultCode\":\"ADOPT_FAIL_CLOSED\",\"liveCount\":0}\n");
        string expectedTrace=point=="NONE"?String.Empty:"{\"sequence\":1,\"operation\":\"ADOPT_FAIL_CLOSED\",\"resultCode\":\"ADOPT_FAIL_CLOSED\",\"resourceLiveCount\":0}\n";
        if(succeeded!=(point=="NONE")||factory.SyntheticCloseAttemptCount!=1||factory.SyntheticCloseCompletionCount!=1||factory.OpenCount!=0||factory.CanonicalRows()!=expectedLedger||trace.CanonicalRows()!=expectedTrace||factory.Digest()!=Hash(Encoding.UTF8.GetBytes(expectedLedger))||trace.Digest()!=Hash(Encoding.UTF8.GetBytes(expectedTrace)))throw new Exception();factory.AssertBalanced();
    }
    private static void SyntheticOwnershipInvariantSelfCheck()
    {
        foreach(string point in new string[]{"NONE","BEFORE_LEDGER_TOKEN","AFTER_LEDGER_OPEN_BEFORE_LEASE","AFTER_LEASE_BEFORE_PUBLISH","AFTER_PUBLISH_BEFORE_RETURN"})RequireAdoptionCase(point);
        TraceRecorder firstTrace=new TraceRecorder(),secondTrace=new TraceRecorder();ResourceFactory first=new ResourceFactory(true,firstTrace),second=new ResourceFactory(true,secondTrace);IntPtr raw=new IntPtr(88);IOwnedStore store=first.AdoptStore(ref raw,StoreRole.ORIGINAL_STORE);if(!first.Owns(store)||second.Owns(store)||first.Owns(new FakeOwnedStore()))throw new Exception();store.Dispose();if(first.Owns(store))throw new Exception();first.DisposeAll();first.AssertBalanced();second.DisposeAll();second.AssertBalanced();
        RequireMutation("CERT_BAG_DECOY",SyntheticMutation.REVERSE_STORE_ORDER,true,null);RequireMutation("RESOLVED_CERT_MISMATCH",SyntheticMutation.REVERSE_STORE_ORDER,false,"CERTIFICATE_FIELDS_INVALID");RequireMutation("VALID_LEGACY",SyntheticMutation.PRIMARY_ENABLE_FAIL,false,"SIGNATURE_INVALID");RequireMutation("VALID_LEGACY",SyntheticMutation.LEGACY_FLAGS_ZERO,false,"SIGNATURE_INVALID");RequireMutation("VALID_LEGACY",SyntheticMutation.LEGACY_EXTRA_NULL,false,"SIGNATURE_INVALID");RequireMutation("CONTENT_CATALOG_ONLY",SyntheticMutation.CATALOG_CLOSE_REVERSED,false,"SIGNATURE_INVALID");RequireMutation("VALID_LEGACY",SyntheticMutation.NETWORK_ATTEMPT_BEFORE_OUTPUT,false,"SIGNATURE_INVALID");
    }
    private static string InternalEnvelope(FixtureDefinition fixture,ResolutionResult result)
    {
        if(InternalResultKeys.Length!=9)throw new Exception();byte[] output=result.Output==null?new byte[0]:new UTF8Encoding(false,true).GetBytes(result.Output);string outputHash=result.Output==null?"null":"\""+Hash(output)+"\"",reason=result.Reason==null?"null":"\""+result.Reason+"\"";return "{\"schemaVersion\":1,\"fixtureId\":\""+fixture.Id+"\",\"observedOutcome\":\""+(result.Success?"SUCCESS":"FAILURE")+"\",\"fixedReason\":"+reason+",\"productionOutputByteCount\":"+output.Length+",\"productionOutputSha256\":"+outputHash+",\"resolverTraceSha256\":\""+result.TraceSha256+"\",\"resourceTraceSha256\":\""+result.ResourceSha256+"\",\"networkRequestCount\":0}";
    }
    private static int Main(string[] args)
    {
        try
        {
            if(args.Length!=2||args[0]!="--synthetic-fixture-v1") throw new Exception();SyntheticOwnershipInvariantSelfCheck();FixtureDefinition fixture=FindFixture(args[1]);Func<string,string> mutation=fixture.Id.StartsWith("OUTPUT_",StringComparison.Ordinal)?delegate(string value){return MutateEvidence(fixture.Id,value);}:null;ResolutionResult result=AuthenticodeResolver.Execute(delegate(IResourceFactory resources){return new SyntheticBackend(fixture.Id,resources);},true,mutation);byte[] bytes=new UTF8Encoding(false,true).GetBytes(InternalEnvelope(fixture,result)+"\n");if(bytes.Length==0||bytes.Length>16384)throw new Exception();using(Stream stream=Console.OpenStandardOutput())stream.Write(bytes,0,bytes.Length);return 0;
        }
        catch(Exception) { Console.Error.Write("SYNTHETIC_CONTRACT_INVALID\n"); return 2; }
    }
#else
    private static int Main(string[] args)
    {
        try { if(args.Length!=1) ClosedFail("SIGNATURE_INVALID");long raw;if(!long.TryParse(args[0],out raw)||raw<=0)ClosedFail("SIGNATURE_INVALID");using(SafeFileHandle handle=new SafeFileHandle(new IntPtr(raw),true)){ResolutionResult result=AuthenticodeResolver.Execute(delegate(IResourceFactory resources){return new WinCryptBackend(handle,resources);},false,null);if(!result.Success)ClosedFail(result.Reason);byte[] output=new UTF8Encoding(false,true).GetBytes(result.Output);if(output.Length==0||output.Length>16384)ClosedFail("CERTIFICATE_FIELDS_INVALID");using(Stream stream=Console.OpenStandardOutput())stream.Write(output,0,output.Length);}return 0;}
        catch(ClosedFailure failure) { Console.Error.Write(failure.Code); return 1; }
        catch(Exception) { Console.Error.Write("SIGNATURE_INVALID"); return 1; }
    }
#endif
}
