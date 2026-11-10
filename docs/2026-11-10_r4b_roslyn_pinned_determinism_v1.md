# R4-B pinned Roslyn determinism and verifier bootstrap v1.2

Date: 2026-11-10
Status: repository implementation approved; every external action remains blocked

## Decision and scope

Marlon selected Option A: evaluate a precisely pinned deterministic Roslyn toolchain. This document
records only the credential-free repository control plane needed to make a later acquisition
fail-closed. It does not authorize a download, installation, extraction, execution, replacement,
broker run, or Attempt004.

The candidate compiler package is `Microsoft.Net.Compilers.Toolset.Framework` version `5.9.0` from
its exact versioned NuGet flat-container URL. Official metadata records exactly 12,965,530 bytes and
SHA-512
`b9deade3b3a44f7daeb808af22f41d9edba72370404bf4d7c2af3ea8f9371b012f3d180f12a2060de0520a162d57d84f9704fc2d9fba773e0b80c7b9f80996c7`.
The package is MIT-licensed, targets .NET Framework 4.7.2, has no dependencies, and is explicitly an
unsupported implementation-detail distribution. Those facts are metadata, not acquired-artifact
evidence.

The narrow verifier is the official portable `nuget.exe` 7.9.0 (`7.9.0.83`), x86, released
2026-08-11:

- URL: `https://dist.nuget.org/win-x86-commandline/v7.9.0/nuget.exe`
- Microsoft WinGet SHA-256:
  `992d70cac5b06c38efec91806caba64cdcc07e6d963a0959dbbbaf264d33b800`
- license: Apache-2.0
- runtime floor: .NET Framework 4.7.2; the reviewed host has .NET Framework 4.8

Microsoft does not publish the exact executable byte count or a package-specific Authenticode
signer thumbprint. Those values are `UNATTEMPTED`, not inferred. The official version-specific URL
and WinGet hash pre-bind byte identity for one inert acquisition. Signer, chain, timestamp, byte
count, file version, inventory, and license observations must be captured only after a hash match
and reviewed in a later immutable receipt before any execution.

## Two-authority boundary

`DOWNLOAD_AUTHORIZED_V1` may be created only from the exact reviewed repository bytes and exact
head after Catalina, Natalia, Renata, Julieta, Gabriela, Bianca, and Elana gates. The checked-in JSON
is deliberately non-authorizing: `externalActionAuthorized` and `executionAuthorityPresent` are
both `false`.

A later download authority may permit exactly one HTTPS GET of the exact URL into a fresh exclusive
standard-user root with a hard 16,777,216-byte body cap. Redirect, retry, resume, credentials,
cookies, proxy, custom trust, shell, installer, execution, PATH mutation, global cache, and global
configuration are forbidden. Early EOF, an extra byte, a second request, identity drift, or cleanup
failure is terminal HOLD.

Before execution, retained bytes must match the exact WinGet SHA-256. Windows Authenticode must be
`Valid` with a trusted code-signing chain, code-signing EKU `1.3.6.1.5.5.7.3.3`, and valid timestamp
chain. Product version must normalize to `7.9.0`; raw file version must equal `7.9.0.83`. A sanitized
`VERIFIER_BYTES_VERIFIED_V1` receipt must record the observed byte count, file hash, versions,
signer/timestamp identities and chain statuses, license evidence, one-file SBOM/inventory, script
absence, host/isolation facts, retention decision, and cleanup evidence.

The same read-only file handle must be held from the pre-Authenticode SHA-256 and sanitized file
identity through Authenticode, both chain checks, the post-Authenticode SHA-256, and the final file
identity. Its policy is exactly `READ_ONLY_DENY_WRITE_DELETE_HELD`; both hashes must equal the pinned
lowercase SHA-256 and both volume-serial-plus-128-bit-file-ID digests must match. Revocation checking
is exactly `OFFLINE_CACHE_ONLY_NO_NETWORK`. Signer and timestamp chains both use `Offline`,
`EntireChain`, and `NoFlag`, and both must produce `VALID_WITH_COMPLETE_OFFLINE_REVOCATION`.
Unavailable or nonempty raw revocation-chain status is terminal `REVOCATION_EVIDENCE_UNAVAILABLE`;
online revocation traffic is forbidden.

That receipt requires a separate commit-bound review. Only a later
`VERIFIER_EXECUTION_AUTHORIZED_V1` may permit the closed local `nuget verify -Signatures` operation
against one separately hashed Roslyn package. No execution authority exists in this phase.

## Non-circular trust and exclusions

The pre-known Microsoft WinGet hash plus Windows Authenticode establish `nuget.exe` before it can
run; the verifier never verifies itself. NuGet then verifies only the separately hashed Roslyn
container. Inner `csc.exe` identity and Authenticode remain independent gates.

This phase never authorizes production, signing, stores, spending, credentials, external accounts,
global tools, PATH changes, Roslyn extraction, compiler execution, acceptance of
non-reproducibility, replacement, broker execution, or Attempt004. Any verifier version, URL, hash,
distribution, redirect, installer/SDK, alternate verifier, missing signature control, or evidence
failure outside this exact contract returns to material-decision HOLD.

## Closed phase test snapshot

`R4B-ROSLYN-LANE-SNAPSHOT-v1` binds this phase to exactly 11 portable tests and 5 Windows-native
tests. Their canonical no-whitespace JSON is 860 bytes with SHA-256
`6ccc0208c8d7e104d6ebfe2e9b196eb3b5ddbc599ef365ae92c65e6ec712d9f2`. Eight earlier root-closure
tests are an exact out-of-scope untracked set; its 483-byte canonical JSON array has SHA-256
`8d875d47149a98760b795907131676b4c334652a679ebe97645c942eae32b3bc`. Exact exclusions are not
prefixes or ignores: a near-match, unexpected test, tracked exclusion, duplicate, missing phase test,
or nonregular phase test fails closed.

The inventory is derived read-only from three exact bounded Git commands: tracked paths from
`ls-tree` at `HEAD`, unfiltered staged name/status records from `diff --cached --no-renames`, and
untracked paths from `ls-files --others --exclude-standard`. All three commands are restricted to
`scripts/r4b-evidence`, NUL-delimited, and have quoting disabled. Output is raw-buffered with a
1,048,576-byte combined cap, empty stderr, status zero, fatal UTF-8, terminal NUL, canonical paths,
and fixed sanitized errors. Staged `A` and `M` records carry one canonical path. `D`, `T`, `U`,
`X`, and `B` are inventory violations after path validation; every copy/rename status or malformed
token stream fails closed. An isolated Git fixture proves an index-only regular-file-to-symlink
type change emits `T` and is rejected. The validator supports the exact phase test as untracked,
staged, tracked, or tracked and modified while retaining one logical inventory identity. It never
discovers tests by walking the filesystem and does not authorize staging or committing any
excluded path.
