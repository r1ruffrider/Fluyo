Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSModuleAutoLoadingPreference = 'None'
[System.Threading.Thread]::CurrentThread.CurrentCulture = [System.Globalization.CultureInfo]::InvariantCulture
[System.Threading.Thread]::CurrentThread.CurrentUICulture = [System.Globalization.CultureInfo]::InvariantCulture

$expectedModule = 'C:\Windows\System32\WindowsPowerShell\v1.0\Modules\Microsoft.PowerShell.Utility\Microsoft.PowerShell.Utility.psd1'
Import-Module -Name $expectedModule -Force -ErrorAction Stop
if ((Get-Module).Count -ne 1 -or (Get-Module).Name -ne 'Microsoft.PowerShell.Utility') { throw 'BOOTSTRAP_MODULE_INVALID' }
if ($ExecutionContext.SessionState.LanguageMode -ne 'FullLanguage') { throw 'ADDTYPE_UNAVAILABLE' }

$auditRelativePath = 'scripts\r4b-evidence\root-only-closure-nuget-addtype-lease-v1.cs'
$auditExpectedByteCountText = $env:FLUYO_R4B_AUDIT_SOURCE_BYTE_COUNT
$auditExpectedSha256 = $env:FLUYO_R4B_AUDIT_SOURCE_SHA256
if ($auditExpectedByteCountText -notmatch '^[1-9][0-9]{0,6}$') { throw 'ADAPTER_AUDIT_SOURCE_PIN_INVALID' }
$auditExpectedByteCount = 0L
if (-not [Int64]::TryParse($auditExpectedByteCountText, [Globalization.NumberStyles]::None, [Globalization.CultureInfo]::InvariantCulture, [ref]$auditExpectedByteCount)) { throw 'ADAPTER_AUDIT_SOURCE_PIN_INVALID' }
if ($auditExpectedByteCount -lt 1 -or $auditExpectedByteCount -gt 131072 -or $auditExpectedByteCount.ToString([Globalization.CultureInfo]::InvariantCulture) -cne $auditExpectedByteCountText) { throw 'ADAPTER_AUDIT_SOURCE_PIN_INVALID' }
if ($auditExpectedSha256 -cnotmatch '^[0-9a-f]{64}$') { throw 'ADAPTER_AUDIT_SOURCE_PIN_INVALID' }
$checkoutRoot = $env:FLUYO_R4B_CHECKOUT_ROOT
if ([String]::IsNullOrEmpty($checkoutRoot) -or -not [IO.Path]::IsPathRooted($checkoutRoot)) { throw 'ADDTYPE_SOURCE_MISMATCH' }
$auditPath = [IO.Path]::GetFullPath([IO.Path]::Combine($checkoutRoot, $auditRelativePath))
$expectedAuditPath = [IO.Path]::GetFullPath($checkoutRoot.TrimEnd('\') + '\' + $auditRelativePath)
if (-not [String]::Equals($auditPath, $expectedAuditPath, [StringComparison]::OrdinalIgnoreCase)) { throw 'ADDTYPE_SOURCE_MISMATCH' }

$auditStream = [IO.FileStream]::new($auditPath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
try {
    $auditLength = $auditStream.Length
    if ($auditLength -lt 1 -or $auditLength -gt 131072 -or $auditLength -ne $auditExpectedByteCount) { throw 'ADDTYPE_SOURCE_MISMATCH' }
    $auditBytes = [byte[]]::new([int]$auditLength)
    $offset = 0
    while ($offset -lt $auditBytes.Length) {
        $read = $auditStream.Read($auditBytes, $offset, $auditBytes.Length - $offset)
        if ($read -le 0) { throw 'ADDTYPE_SOURCE_MISMATCH' }
        $offset += $read
    }
    if ($auditStream.ReadByte() -ne -1) { throw 'ADDTYPE_SOURCE_MISMATCH' }
    if ($auditBytes.Length -ge 3 -and $auditBytes[0] -eq 0xEF -and $auditBytes[1] -eq 0xBB -and $auditBytes[2] -eq 0xBF) { throw 'ADDTYPE_SOURCE_MISMATCH' }
    foreach ($value in $auditBytes) { if ($value -eq 0x0D) { throw 'ADDTYPE_SOURCE_MISMATCH' } }
    $utf8 = [Text.UTF8Encoding]::new($false, $true)
    try { $auditSource = $utf8.GetString($auditBytes) } catch { throw 'ADDTYPE_SOURCE_MISMATCH' }
    if ($auditSource.IndexOf("`r", [StringComparison]::Ordinal) -ge 0) { throw 'ADDTYPE_SOURCE_MISMATCH' }
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $observedSha256 = [Convert]::ToHexString($sha.ComputeHash($auditBytes)).ToLowerInvariant() } finally { $sha.Dispose() }
    if (-not [String]::Equals($observedSha256, $auditExpectedSha256, [StringComparison]::Ordinal)) { throw 'ADDTYPE_SOURCE_MISMATCH' }

    Add-Type -TypeDefinition $auditSource -Language CSharp -ErrorAction Stop
    if ($null -eq ('FluyoClosedLeaseV1' -as [type])) { throw 'ADDTYPE_COMPILE_FAILED' }
    if ([String]::IsNullOrEmpty($env:FLUYO_R4B_PIPE_TOKEN)) { throw 'ADAPTER_BOOTSTRAP_INVALID' }
    [FluyoClosedLeaseV1]::RunSyntheticBrokerV12($auditStream.SafeFileHandle, $auditPath, $auditExpectedSha256, $auditExpectedByteCount)
} finally {
    $auditStream.Dispose()
}
