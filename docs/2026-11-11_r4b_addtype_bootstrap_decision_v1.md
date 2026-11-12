# R4-B closed Add-Type bootstrap decision record

Date: 2026-11-11\
Decision owner: Marlon\
Coordinator: Adriana Solano\
Status: **RECOMMENDED 1/A SELECTED — REPOSITORY IMPLEMENTATION AUTHORIZED, EXECUTION HELD**

## Exact decision and delegated process

Marlon explicitly approved all recommended actions and selected the recommended **1/A — closed
Add-Type/PInvoke lease bootstrap**. He also delegated to Adriana approval of this bounded class of
non-production evidence and test processes. This selection supersedes the earlier infeasible
no-Add-Type PowerShell design; it does not broaden authority to generic shell or toolchain use.

As a standard process for this bounded class, Adriana may approve repository implementation,
synthetic zero-network tests, exact-byte review, commits, pushes, draft pull requests, and normal
gate transitions after the applicable specialist and Elana exact-head gates pass. The delegation
does **not** cover production, signing, stores, spending, credentials, external accounts, a real
download, downloaded-verifier execution, broker execution, Attempt004, or any unrelated external
action. Those boundaries remain separately gated.

## Source and topology binding

- Authoritative remote `main`: `d6607300e52219c5d534e70c17e00e2e717e505b`.
- PR #87 remains preserved, draft, and untouched at `6b3a970499bcc73b6749cd74c44345768f2bf04a`.
- PR #77 remains preserved and draft at `b8e4bfadb3b24b1390536b8108712fb310018fd8`.
- PR #61 remains preserved and draft at `119c8b5dbbff8b2a07027b463f1cc88fee66f94d`.
- PR #58 remains preserved and draft at `3dbc1f587560847be3c7f75ce873df0e8ba3f7d2`.
- This phase requires a fresh branch and small draft PR from exact `d6607300`.

## Frozen authority boundary

Authority identifier: `CLOSED_ADD_TYPE_PINVOKE_LEASE_BOOTSTRAP_V1`.

The approved repository design uses one committed PowerShell script whose exact bytes are read once,
hash verified, capped, and encoded as a UTF-16LE `-EncodedCommand`; it never uses `-File`. The script
may compile only the byte-identical committed Add-Type audit source. The contract pins the
Microsoft-signed Windows PowerShell host, required module, CLR, compiler, source, arguments,
environment, and working directory. Its P/Invoke surface is closed to the reviewed lease, process,
job, file-identity, and verification functions.

The bootstrap must retain identity leases for the script, audit source, policy, helper source,
ancestors, build root, build output, and future download target. A future helper launch must use a
suspended direct `CreateProcess` boundary, job containment, and process-image identity proof. A
future download target must be opened with `CREATE_NEW` before any request. The signature helper may
receive only a duplicated inherited target handle and must not reopen `nuget.exe` by path.

This is not generic shell authority. It forbids dynamic or unbounded Add-Type source, arbitrary
commands, network extras, proxy use, credentials, cookies, PATH or global mutation, NuGet execution,
broker execution, and Attempt004.

Roslyn and toolchain execution remain forbidden except for the single pinned, zero-network
`CONTRACT_SELF_TEST_V1` csc compile-and-39-fixture run authorized by
`syntheticBootstrapTestAuthorized`. That synthetic transaction may execute only on unchanged bytes
after Catalina architecture PASS, Natalia security PASS, and Renata reproducibility PASS; it cannot
consume activation authority or authorize a GET, download, retained package, live helper, NuGet
execution, broker, Attempt004, production, signing, store, spend, credential, or external-account
action. All other compiler, helper, download, and toolchain execution remains forbidden.

The v1.4 repair is repository implementation only. Its opaque leases, identity continuity, trace pins, network ownership, bounded cleanup, catalog classification, revocation classification, and certificate-uniqueness controls grant no execution or external authority. PRECONDITION_HOLD_NO_GET remains active until unchanged v1.4 bytes receive Catalina, Natalia, and Renata pre-execution PASS.

## Immutable hold

The repository record and implementation must retain all of these values:

- `externalActionAuthorized: false`
- `downloadAuthorityPresent: false`
- `executionAuthorityPresent: false`
- terminal state `PRECONDITION_HOLD_NO_GET`

No repository implementation, synthetic fixture, commit, push, or passing test changes those
values. A real helper launch, GET, package retention, verifier execution, broker action, or Attempt004
requires a later, separately reviewed and commit-bound authority.

## Exact nine-path boundary

The permitted path inventory is exact and ordered:

1. `docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md`
2. `docs/DEVELOPMENT_HANDOFF.md`
3. `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json`
4. `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs`
5. `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.ps1`
6. `scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs`
7. `scripts/r4b-evidence/roslyn-verifier-authenticode.cs`
8. `scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs`
9. `scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs`

Bianca owns paths 1–2. Valentina owns paths 3–9 only after this decision record is frozen. No
workflow, lane, dependency, lockfile, historical authority, production, or PR #87 path belongs to
this phase.

## Pre-implementation evidence and gates

- Catalina architecture preflight: **128/128 PASS**.
- Natalia security preflight: **64/64 PASS**, 0 failed, runtime/download 0.
- Required runtime/download evidence: **0 attempted**; this is an honest phase boundary, not a pass.

The next gates are:

1. Freeze these two records and their exact hashes.
2. Valentina implements only paths 3–9 with zero-network synthetic seams.
3. Catalina and Natalia re-review the exact bytes.
4. Renata verifies reproducibility, isolation, cleanup, and zero residue.
5. Julieta audits counts, caps, timing, receipt claims, and authority booleans; Gabriela verifies
   provenance; Bianca reconciles the append-only record.
6. Elana performs the sole final independent exact-head QA/code-review gate.
7. Only unchanged bytes may proceed to an authorized commit, draft PR, protected CI, and later
   merge review. Execution and download remain held throughout this repository phase.

Any path, literal, source, pin, state, receipt, privacy, or authority drift invalidates the
pre-implementation passes and returns the phase to specialist review.

R4B-AUTHENTICODE-OPERATIONAL-RESOLVER-v1.5 is approved for repository implementation and zero-network synthetic contract testing only after unchanged Catalina, Natalia, and Renata pre-execution PASSes. It removes WinVerifyTrust path authority and verifies embedded Authenticode through held-handle PE digest plus decoded-message signature, while catalog presence is rejection-only. externalActionAuthorized, downloadAuthorityPresent, and executionAuthorityPresent remain false. PRECONDITION_HOLD_NO_GET remains mandatory. This does not authorize a download, live verifier/helper execution, NuGet execution, broker, Attempt004, production, signing, store, spend, credential, or external-account action.

## v1.6 bounded repair contract — 2026-11-12

`R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.6` is approved for repository implementation only after Natalia's 64/64 pre-implementation PASS. It replaces the synthetic controller with armed bounded deadlines, forced owned-process-tree stop and universal quarantine for unsettled aborted adapter work; makes partial-token cleanup and the terminal `SYNTHETIC_TEST_FAILED_CLEANUP_HOLD` truthful; restores full strong-signature chain and legacy countersignature controls; binds every native allocation and rollback to the resource ledger; and requires the same operational resolver to exercise certificate decoys, duplicate and reordered stores, mixed revocation errors, catalog classification, strong-signature failures, trace pins, and zero-network evidence. The exact nine-path boundary is unchanged. A zero-network synthetic compile-and-39-fixture run remains separately gated on unchanged Catalina, Natalia, and Renata static PASSes. `externalActionAuthorized:false`, `downloadAuthorityPresent:false`, `executionAuthorityPresent:false`, and `PRECONDITION_HOLD_NO_GET` remain unchanged. This record authorizes no compile or fixture execution before those gates and no GET, download, live verifier/helper execution, NuGet execution, broker, Attempt004, production, signing, store, spend, credential, or external-account action.

## v1.7 ownership and deadline repair contract — 2026-11-12

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.7 is approved for repository implementation only. It preserves the exact nine-path boundary and PRECONDITION_HOLD_NO_GET while making all native memory, handles, pins, certificate stores, catalog resources, network counters, adoption rollback, and process deadlines operationally owned and trace-bound. No adapter call may start at or after its phase deadline, and any unsettled aborted invocation quarantines all later adapter work. The 39-fixture zero-network synthetic transaction remains prohibited until unchanged Catalina, Natalia, and Renata static PASSes. externalActionAuthorized, downloadAuthorityPresent, and executionAuthorityPresent remain false. This record authorizes no compile, fixture execution, PowerShell/helper execution, GET, download, NuGet execution, broker, Attempt004, production, signing, store, spend, credential, or external-account action.

## v1.8 operational cleanup and dispatch-deadline repair contract — 2026-11-12

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.8 is approved for repository implementation only within the existing exact nine-path boundary. It repairs four exact blockers: every real synthetic-owned HGlobal, GCHandle, pin, and digest allocation must invoke its exact closer while closed fake native handles remain distinguished inside CloseRaw and no false CLOSE or ROLLBACK_CLOSE evidence may be recorded; all five AdoptionInjection cases must execute operationally with exact allocator, rollback, close-count, ledger, and trace assertions; CATALOG_CLOSE_REVERSED must adopt both catalog-admin and catalog-info resources, reject the forbidden admin-first dependency close without mutating ownership, then clean info before admin; and invokeAdapter plus forceStop must recheck finite positive phase/global time inside the dispatch microtask immediately before every adapter call. The exact boundary remains nine paths with only the decision record, handoff, policy, controller, Authenticode helper, and focused test expected to change; the PowerShell bootstrap, lease C# source, and verifier-bytes receipt must remain byte-identical. The focused target is 42/42 tests. All 39 public fixture IDs and public resolver/resource trace pins must remain byte-identical; new adoption and catalog adversaries are internal pre-output self-checks only. externalActionAuthorized, downloadAuthorityPresent, and executionAuthorityPresent remain false, and PRECONDITION_HOLD_NO_GET remains mandatory. This record authorizes no C# or PowerShell execution, compile, helper or fixture run, GET, download, acquisition, NuGet execution, broker, Attempt004, production, signing, store, spend, credential, external-account action, staging, commit, or push. After a frozen manifest and 42/42 development result, fresh Catalina and Natalia exact-byte PASSes are required; Renata static review follows only if both pass, then the applicable Julieta, Gabriela, Bianca, and sole final Elana gates apply before any commit or later separately authorized synthetic transaction.

## Closed concrete synthetic adapter/launcher approval — 2026-11-12

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.10 supersedes v1.9 and is approved for repository implementation only under the existing syntheticBootstrapTestAuthorized delegation. It adds one repository-owned concrete adapter/launcher inside an exact ten-path boundary. The adapter is inert on import and may execute only through the exact `--execute-authorized-contract-self-test-v1` command after unchanged Catalina, Natalia and Renata pre-execution PASSes. It requires a pinned clean Node host, closed ambient/import gate, trusted pre-bootstrap exclusive-root lease, direct pinned PowerShell launch, exact committed PS1 bytes over stdin, one local first-instance logon-SID-only medium-integrity named pipe, mutual OS process identity and nonce challenge, closed canonical RPC schemas, independently cancellable process ownership, broker-derived compiler and fixture commands, bounded metadata-only snapshots, the truthful `ZERO_OBSERVED_OWNED_TCP_UDP_ENDPOINTS_V1` evidence, ledger-backed cleanup and fixed sanitized receipts. Pre-READY Add-Type failure retains the owned root and terminates in `ADAPTER_BOOTSTRAP_DESCENDANT_UNPROVEN_HOLD`; it never claims transient-artifact absence or performs unproven cleanup. Hard-crash residue is a HOLD and is never automatically deleted. `externalActionAuthorized`, `downloadAuthorityPresent` and `executionAuthorityPresent` remain false, and `PRECONDITION_HOLD_NO_GET` remains mandatory. This record authorizes no GET, download, acquisition, real verifier or NuGet execution, broker, Attempt004, production, signing, store, spend, credential, external-account action, stage, commit or push.

## Committed audit-source lease amendment — 2026-11-12

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.10.2 supersedes v1.10.1. The committed Add-Type audit source is an exact pinned input lease, not an exclusive-root copy or ledger artifact. Node holds the verified source-control file; PowerShell opens the same fixed file read-only with FileShare.Read, revalidates its bounded strict-UTF8 bytes and exact SHA-256, holds the stream through Add-Type and the broker session, and passes only the decoded in-memory string to TypeDefinition. The PowerShell lease denies new write/delete opens; the broker binds its live file identity to the Node-held identity before READY, then revalidates and closes it with the other pinned inputs. The file is never copied, ledger-owned or deleted. Script bytes remain capped at 8,192 and audit-source bytes at 65,536; obsolete EncodedCommand, embedded-source and root-copy literals are absent. All v1.10 authority restrictions and PRECONDITION_HOLD_NO_GET remain unchanged.

## 2026-11-12 — v1.11 runnable adapter/broker architecture frozen; execution held

- Record state: `IMPLEMENTATION_AUTHORIZED_EXECUTION_HELD`.
- Superseded implementation claim: v1.10.2 remains `STRICT_FAIL_HOLD`; its static 76/76 result did not prove a runnable transaction.
- Frozen controller contract: `R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.11`.
- Frozen adapter contract: `R4B-SYNTHETIC-ADAPTER-v1.11`.
- Frozen pipe protocol: `R4B-ADDTYPE-PIPE-RPC-v1.11`.
- Frozen manifest binding: `HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1`.
- Bootstrap mechanism remains `CLOSED_ADD_TYPE_PINVOKE_LEASE_BOOTSTRAP_V1`.
- CLI mode remains `--execute-authorized-contract-self-test-v1`.
- Authority remains exactly: `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, `state=PRECONDITION_HOLD_NO_GET`.
- Exact file boundary remains ten paths: this decision file; `docs/DEVELOPMENT_HANDOFF.md`; the bootstrap policy JSON; controller MJS; bootstrap PS1; lease/broker C#; synthetic adapter MJS; immutable Authenticode helper C#; immutable verifier-bytes receipt MJS; and `scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs`.
- `scripts/r4b-evidence/roslyn-verifier-authenticode.cs` and `scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs` remain byte-immutable.
- The runnable flow is frozen as: exact CLI → held ten-path manifest → pinned Node host → exclusive local root → pinned direct PowerShell stdin bootstrap → authenticated overlapped named-pipe handshake → `CanonicalRpcSession` → `ConcreteSyntheticAdapter` → `runSyntheticCompileTransaction` → pinned compiler plus 39 fixtures → exact 23-step cleanup → `CLOSE`/`CLOSED` → sanitized receipt → outer settlement.
- The ten-path runtime manifest is observational and is bound to the separately recorded pre-execution exact-byte review digest. No content hash of the ten-path set may be embedded inside that same set as an authorization self-reference.
- The pipe protocol retains the exact nine ordered outer keys: `schemaVersion`, `frameType`, `directionSequence`, `sessionId`, `operationId`, `method`, `timeoutMs`, `payloadSha256`, `payload`.
- Pipe security requires current-logon-SID-only access, medium integrity with no-write-up, non-elevated medium Node and PowerShell processes, exact client/server process identity, image and creation-time binding, aligned `SID_AND_ATTRIBUTES` parsing, and real overlapped connect/read/write operations.
- The broker must implement all nine RPC methods: `beginOwnedNetworkMeasurement`, `captureGlobalMutationSnapshot`, `openPinnedInputLeases`, `revalidatePinnedInputLeases`, `allocateOwnedRoot`, `createOwnershipLedger`, `runOwnedProcess`, `forceStopOwnedProcessTree`, and `performCleanupStep`.
- The broker derives every compiler and fixture command from reviewed constants; callers cannot supply a path, command, argument vector, environment, or handle.
- The broker must run one independent reader/cancel path, one serialized worker, and one locked writer. `CANCEL_ACK` is independent of the active worker and remains bounded to 500 ms.
- `READY` is truthful only after source, root, manifest, process identity, pipe security, observer, reader, and worker prerequisites are complete and before any compiler or fixture child exists.
- The local evidence boundary remains observed-only: no network observation is a zero-observed-event claim, not proof that networking is impossible.
- Pre-`READY` descendant uncertainty is a fixed cleanup hold and cannot authorize speculative deletion. After `READY`, any residue, live owned process, identity drift, session-close failure, or incomplete cleanup remains `SYNTHETIC_TEST_FAILED_CLEANUP_HOLD`.
- Repository implementation is authorized only as nonexecuting, credential-free, zero-spend work. PowerShell, Add-Type, csc, helper, network, download, acquisition, broker execution, and the synthetic transaction remain prohibited during implementation review.
- A later single local synthetic run is a distinct gate. It requires a frozen exact-byte manifest, Catalina architecture PASS, Natalia security PASS, Renata reproducibility PASS, applicable records/numerical/provenance review, and Elana final exact-head PASS before separate orchestration authorization.
- The v1.11 regression inventory is frozen at 96 tests: 42 preserved legacy tests plus 54 named operational v1.11 tests. The injected end-to-end test must execute the production `runAuthorizedCli` path through a strict duplex broker oracle, all nine RPC methods, the compiler request, all 39 fixture requests, all 23 cleanup operations, and `CLOSE`/`CLOSED`; a substring test or two-method fake is not sufficient.
- No production, signing, store, spending, credential, external-account, generic-shell, generic-toolchain, download, broker-run, or Attempt004 authority is created by this record.

## 2026-11-12 — v1.12 runnable-boundary repair contract frozen; execution held

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.12 supersedes v1.11 and is approved for repository implementation and non-executing contract tests only. It establishes one UTF-8-bytewise canonical ten-path manifest, explicit non-self-referential reviewed-digest CLI binding, held-byte execution, OS-bound peer identities, strict canonical RPC, independent cancellation and measured force-stop, held segment-root trust, truthful READY/CodeDOM inventory, owner-scoped network evidence, live metadata snapshots, canonical identity-ledger rows, identity-revalidated nonrecursive cleanup, bounded outer settlement and sanitized receipt arithmetic. The pre-execution target is 120/120. The eight operational tests remain required and unattempted until separately authorized; no fake controller, transport, identity or result can satisfy them. externalActionAuthorized=false, downloadAuthorityPresent=false, executionAuthorityPresent=false and PRECONDITION_HOLD_NO_GET remain mandatory. This amendment authorizes no PowerShell, Add-Type, C#, compiler, helper, network, transaction, GET, acquisition, NuGet, broker, Attempt004, production, signing, store, spend, credential, external-account, stage, commit or push action.

## 2026-11-12 — v1.12.1 broker-authoritative peer identity amendment

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.12.1 supersedes only the v1.12 peer-identity handshake contract. Node retains and presents pinned Node and PowerShell image-file byte, SHA-256 and final-path digests plus documented process IDs, but does not claim OS process creation time or use an undocumented child handle. After HELLO, the broker authoritatively observes both pipe peer PIDs, retains both process and image handles, derives creation FILETIME and file identities from those handles, compares the observed image claims to Node's held files, and returns the complete observed identities in CHALLENGE. SERVER_V1, CLIENT_V1 and READY_V1 bind the same broker-observed identity digests in one exact proof domain. This removes the circular pre-broker creation-time requirement without adding a helper, native path, authority or execution. All remaining v1.12 boundaries, the 120/120 pre-execution target, eight held operational tests, false authority flags and PRECONDITION_HOLD_NO_GET remain unchanged.

## 2026-11-12 — v1.12.2 held-image path-authority correction

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.12.2 supersedes only the v1.12.1 held-image path claim. Node's retained Node and PowerShell image descriptors bind byte count, content SHA-256 and documented device/inode continuity only; they do not claim a handle-derived final path. The held policy pins one exact normalized host-image path digest for each host. The broker derives each final path from its retained image handle, normalizes it with the closed local-DOS algorithm, and requires the digest to equal held policy before CHALLENGE. Node validates the broker-observed final-path digests against the same held policy while retaining its descriptors through CLOSED and final revalidation. No caller path, undocumented process handle, helper, native path, authority or execution is added. All remaining v1.12.1 and v1.12 boundaries, test counts, false authority flags and PRECONDITION_HOLD_NO_GET remain unchanged.

## 2026-11-12 — v1.12.3 receipt-evidence plumbing correction

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.12.3 supersedes only the v1.12.2 receipt-evidence plumbing. Terminal network observation count and maximum poll gap are measured by STOP_MEASUREMENT, owner arithmetic is measured by BIND_OWNER_SCOPE, and zero endpoint events are measured separately by VERIFY_ZERO_EVENTS; event count is never relabeled as observation count. SCAN_LEDGER_INVENTORY records ownershipLedgerPreCleanupSha256 over the complete canonical current ledger rows before filesystem deletion transitions, while CLOSE_OWNERSHIP_LEDGER records ownershipLedgerSha256 over the final append-only transition journal after all legal transitions and close. The sanitized receipt carries both distinctly named ledger digests and copies every network and ledger field only from its validated cleanup operation. No RPC, path, authority or execution is added. All remaining v1.12.2, v1.12.1 and v1.12 boundaries, test counts, false authority flags and PRECONDITION_HOLD_NO_GET remain unchanged.

## 2026-11-12 — v1.12.4 network-event receipt correction

R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.12.4 supersedes only the v1.12.3 receipt key list and source map. The sanitized receipt adds networkEventCount immediately after networkMaximumGapMicros. networkEventCount is copied only from validated VERIFY_ZERO_EVENTS operation-nine evidence, is exactly zero for a clean result, and is null when that cleanup evidence is unavailable or incomplete; it is never derived from poll observations, table iterations, owner counts or a default. All v1.12.3 poll, gap, owner and dual-ledger schemas, all earlier boundaries, test counts, false authority flags and PRECONDITION_HOLD_NO_GET remain unchanged.

## 2026-11-12 — v1.13 measured-boundary repair contract

`R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13` supersedes the v1.12.4 implementation contract for repository implementation and non-executing contract tests only. It requires strict manifest-to-policy-to-PowerShell audit-source pin parity; canonical decimal and lowercase-hex pin parsing without fallback; the exact 60-byte `MIB_TCP6ROW_OWNER_PID` layout with owning PID at offset 56 and checked 16 MiB, count, stride, and returned-buffer bounds; measured retained-process and job-object census; canonical Windows CRT argument quoting; stateful observer and baseline-token closure; and receipt values copied only from measured operation evidence. It does not authorize PowerShell, Add-Type, C#, compiler, helper, network, transaction, GET, acquisition, NuGet, broker, Attempt004, production, signing, store, spend, credential, external-account, stage, commit, or push action.

## 2026-11-12 — v1.13.1 truthful readiness and closure amendment

`R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.1` supersedes only the v1.13 readiness, environment, process-census, transport-demultiplexing, and closure contract. The environment is the exact closed 12-row environment; the Node-created temporary root is held and inventoried before `READY`; the reader, worker, and observer are actually started before `READY`; and the exact 21-key `READY` record is a point-in-time statement with current descendant count and digest plus zero unexpected root and temporary entries. IPv6 ownership uses the exact v1.13 layout and bounds. One receive pump owns frame ingestion, handshake control states remain separate from operation response routing, measured process and job totals replace fixed census claims, the observer transitions `OPEN` to `STOPPED` to `CLOSED`, and the baseline token is closed from actual state. All earlier authority restrictions remain unchanged.

## 2026-11-12 — v1.13.2 terminal control-state amendment; execution held

`R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.2` supersedes only the v1.13.1 control-state and terminal-settlement contract. Node uses one receive pump and closed control-state routing; every terminal operation response is retired through `RESPONSE_ACK`; the broker retains a terminal tombstone so a late `CANCEL` cannot revive, reclassify, or duplicate a completed operation; all six cancellation permutations are covered; and both peers prove empty pending, drain, and tombstone state before transport close. Process/job census, network and baseline leases, cleanup, and receipt fields remain measured rather than hard-coded.

The non-executing focused regression inventory is exactly **148 passed, 0 failed, 0 skipped, and 0 todo**. Operational scenarios `E01` through `E08` remain exactly **8 required-unattempted**. No PowerShell, Add-Type, C#, compiler, helper, network, synthetic transaction, GET, acquisition, NuGet, broker, Attempt004, production, signing, store, spend, credential, external-account, stage, commit, or push action occurred. `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` remain mandatory.

### v1.13.2 pre-record implementation-evidence snapshot

This table is the closed **pre-record** ten-path snapshot taken before this append. It is retained only to explain the transition into the final freeze. It is not the final reviewed manifest, is not an execution authority, and must not be substituted for the post-append exact-byte manifest.

| Path                                                                            |  Bytes | SHA-256                                                            |
| ------------------------------------------------------------------------------- | -----: | ------------------------------------------------------------------ |
| `docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md`                          |  24418 | `4130fe6857f4e9273ea15f090703a94246bfe9effcb173a231c8d01a99df3bb7` |
| `docs/DEVELOPMENT_HANDOFF.md`                                                   | 237601 | `03e72b427a67f9934e8b0e05b7861f8a666a657cce9a7c37be63147bd9c34b93` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json` |  56105 | `626c356ed7ceb805cc1d2d3916d7d83f89258afcef7428284672da1b331ae4cf` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs`         | 116078 | `9b3f562a50258e9d6daca0f13ff9f57c4eb1652ed87b8f5459c717abc4e939fa` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.ps1`         |   4079 | `6197c44cebbde77791e1257037bc357d3cb76af3079d32f6775d6205e03721fb` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs`              | 110236 | `838c444dd161991f098651fc66ff7be8cf1b759e77f17ff4f1220f639fb2891b` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs` |  56845 | `12107a361ed9da402150a70f1753fc045ec7530dadb242ec8ff06060d4d770e4` |
| `scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs`              | 151430 | `d3f908df0eebee6c4fbb557201bec4d5c7785d94fee26a47b18ee76c8d57e457` |
| `scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs`          |  23874 | `39cab857a72e75c5e461646ae6644d0a6f04e800541b0ec470c598410d782e93` |
| `scripts/r4b-evidence/roslyn-verifier-authenticode.cs`                          | 116075 | `15a10f93570477ef4add20397a8dc0c2709ecd94d37710dacded26cb8d89d5ad` |

The pre-record canonical row stream contains exactly **10 rows** and **1,753 bytes**, with SHA-256 `44d1c3a7cd79306250594ea204a9d99bf1d5d40a30412bf31717d4fa963a792a`. Its closed test tuple is **148 passed, 0 failed, 8 required-unattempted**.

The final canonical ten-path manifest must be recomputed only after both record appends and the final two-pass source-pin refresh. Its digest must remain external review evidence and must not be embedded into either record or any other member of the covered ten-path set. No post-append hash or byte count for either record belongs inside that same record.

## 2026-11-12 — v1.13.3 exact-byte correction and nonlive evidence

Independent exact-byte review of v1.13.2 reproduced **148/148 PASS** but found non-operative routing and drain coverage, an inconsistent environment contract, and hard-coded `READY` census evidence. V1.13.2 therefore did not clear the architecture or security gates.

`R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.3` supersedes only the environment identity, pre-`READY` measurement, RPC routing, and terminal-settlement portions of v1.13.2. The bounded repository implementation reached **164/164 nonlive PASS**. Operational scenarios `E01` through `E08` remain **8 required-unattempted**. `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` remain unchanged. This record authorizes no live execution, acquisition, stage, commit, or push.

### v1.13.3 exact five-file freeze

| Path                                                                            |  Bytes | SHA-256                                                            | Git blob                                   |
| ------------------------------------------------------------------------------- | -----: | ------------------------------------------------------------------ | ------------------------------------------ |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json` |  56059 | `5bc741c5c3afceef195da3e00ae24340c6b2adacb74d630fe83c26a8bdfe50b5` | `8ff385058a1f8c3c3f3df2ad18eda040443c2d84` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs`         | 116155 | `a8e8810a7861a91e50d385f2dc2deef3b13261f0a81545ae059dcf5c5f4c778f` | `03a99baf87d2f2cd7a0b1092380ae34e2c34bdcf` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs` |  61555 | `d15d5468e94d8cc22a046d8440d1d9fbd2d0b3d2046ede3d142d436ec2aa7387` | `8e11cdea462e8268bfd4326b1380cb27685ab5f4` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs`              | 117351 | `69e82e6a1947b41cca6deb69d017ffe1f2e6b7bc6c3ecd76ca6b62603eb0c8ee` | `8c424ea6c17204f70b24c6ada32824a82931134d` |
| `scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs`              | 165324 | `3a40356797c3db5cdba42c6b1232fd6edba4d9b6c6792345e4445ef067811cf4` | `07ea579e89f043c64e6ea4d4e76ad9dddb6c2e99` |

`scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.ps1`, `scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs`, and `scripts/r4b-evidence/roslyn-verifier-authenticode.cs` remain byte-immutable. The final ten-path manifest remains external review evidence and is not embedded in this record.

## 2026-11-12 — v1.13.4 bounded lifecycle and input correction

Independent review reproduced the v1.13.3 **164/164 PASS** result but found non-cooperative cancellation result leakage, source-only C# lifecycle assertions, unbounded EOF settlement, unchecked pre-newline input growth, and pathname inventory recursion risk. The prior “v1.13.3 exact five-file freeze” is only a pre-record, pre-pin snapshot: policy and controller changed during the final pin refresh, and that snapshot was never the final manifest.

`R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.4` supersedes only those cancellation, lifecycle-proof, EOF-settlement, bounded-input, inventory, and snapshot-classification boundaries. The bounded repository implementation reached **172/172 nonlive PASS**. Operational scenarios `E01` through `E08` remain **8 required-unattempted**. `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` remain unchanged. This record authorizes no live execution, acquisition, stage, commit, or push.

### v1.13.4 exact five-file freeze

| Path                                                                            |  Bytes | SHA-256                                                            | Git blob                                   |
| ------------------------------------------------------------------------------- | -----: | ------------------------------------------------------------------ | ------------------------------------------ |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json` |  56059 | `088edf24616dc82a6819b245988061dc2a37590de3597a4e4220f10a2b0694fd` | `5f5bb766644e338447d53838f1e15a98f80b2306` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs`         | 116155 | `68f6c9331bc3b5b79d9ca122121715d9b0aa3763d38b8329fe806b84d5888203` | `ba1328cff2b4c989e158dd1c8ce58e38afa10683` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs` |  64299 | `49114fe254ae4b5795a017ffbf79a01c0c069f91826cfe1bd2a01e85efc0a4d0` | `55aa90c61de56372fef4de7224060a450a1c1fd9` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs`              | 117470 | `03391653b8bc56985c0c6ba90eed3904a31ea590ee4a15e12692973d80201409` | `f2ffed78c007b33739a6c3e1fdbff81a2c17ca0e` |
| `scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs`              | 179487 | `ada07fb192fb40875b47c2fb4a869ca621c43da37767c8a005eb638d0bd982d5` | `d09c5779e9c02a30176833e8c6edf6373e91010c` |

`scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.ps1`, `scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs`, and `scripts/r4b-evidence/roslyn-verifier-authenticode.cs` remain byte-immutable. The final ten-path manifest remains external review evidence and no self hash is embedded in this record.

## 2026-11-12 — v1.13.5 quarantine, settlement, and semantic-ownership correction

Independent review reproduced the v1.13.4 **172/172 PASS** result but found incomplete session-failure quarantine, a masked `CLOSE`-send failure, broker and inventory source-bound oracles that duplicated JavaScript semantics, and rejection of the terminal-cancel late `CANCEL`. The prior “v1.13.4 exact five-file freeze” is only a pre-record, pre-pin snapshot: policy and controller changed during final pin refresh, and that snapshot was never the final manifest.

`R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.5` supersedes only failure quarantine, close settlement, declarative semantic ownership, terminal `CANCEL` acknowledgement, and records terminology. The bounded repository implementation reached **178/178 nonlive PASS**. Operational scenarios `E01` through `E08` remain **8 required-unattempted**. `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` remain unchanged. This record authorizes no live execution, acquisition, stage, commit, or push.

### v1.13.5 exact five-file freeze

| Path                                                                            |  Bytes | SHA-256                                                            | Git blob                                   |
| ------------------------------------------------------------------------------- | -----: | ------------------------------------------------------------------ | ------------------------------------------ |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json` |  56059 | `7b83decfa81f42b4b1c1ee861c7e1f7288a38a27894b26decfa887bbf6b574f4` | `85e1d0980a455bb41def98287bb0ff228f8c3fa0` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs`         | 116155 | `014294851ce6d8ebf84037331a1b7a63beff074da5b71abc3e296a05064d1ada` | `98578fd610a706972bee07cfcb56d78a168ba6bb` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs` |  65904 | `ae828734eef96225f535245f02a08d6583a3a6e59ce1b150c98e452c54cc7195` | `a4232aa8a8e05a44aa8aa5d134be0c1b5c47335d` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs`              | 120913 | `a2c21f4575dce662ac18d99f24260aa88cf1650b3112b96dec3fcb1222a03c38` | `10ce3f43fc31592d37562d26d44a12e9275ffca3` |
| `scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs`              | 189213 | `c1dbe4033d0cc219e603d1b89b4f4a0a7d2d69edb8d649e53010d143ece38305` | `f13c0d9b08a466b87b27a9142351d49ddc25aa54` |

`scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.ps1`, `scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs`, and `scripts/r4b-evidence/roslyn-verifier-authenticode.cs` remain byte-immutable. The final ten-path manifest remains external review evidence and no self hash is embedded in this record.

## 2026-11-12 — v1.13.6 close-write deadline and quarantine correction

Independent review reproduced the v1.13.5 **178/178 PASS** result but found that a permanently pending `CLOSE` write stayed outside the effective deadline because close awaited the write before settlement. The prior “v1.13.5 exact five-file freeze” is only a pre-record, pre-pin implementation snapshot and was never the final reviewed manifest.

`R4B-CLOSED-ADDTYPE-BOOTSTRAP-v1.13.6` supersedes only close-write deadline participation, late-write quarantine, and records terminology. The bounded repository implementation reached **180/180 nonlive PASS**. Operational scenarios `E01` through `E08` remain **8 required-unattempted**. `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` remain unchanged. This record authorizes no live execution, acquisition, stage, commit, or push.

### v1.13.6 exact five-file snapshot

| Path                                                                            |  Bytes | SHA-256                                                            | Git blob                                   |
| ------------------------------------------------------------------------------- | -----: | ------------------------------------------------------------------ | ------------------------------------------ |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json` |  56059 | `f54e04ed96a7b281163e987497ea7d4ed816ac922ec004c44d69f540e8897251` | `6d4c80777958bb57eb8c290886d2b3edacbfe7ff` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs`         | 116155 | `f640d3091116c7a8cfe015698076e6c5278e40a803f5433c2635d7b77c25ba16` | `4e956a51b074e54152b33d59cb203da3d89c7af8` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs` |  67453 | `96b2a2142fa21d0aab1cc16c124f4ed825a1a23c46450afc751dff9270ee95b7` | `000f0e24e45295c4ca63006500da79173812ed8c` |
| `scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs`              | 120913 | `165d4d0abd02ac300f997775b3c95dddcd7c1f1085b12406c8b9330763d89885` | `86b630b7b095beb5e6e33fa738adf98531592aa5` |
| `scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs`              | 191213 | `bd58bd81f4df57ca909a3e82ebad0e3ce9396acfe1f3f496f965e0302ff524fd` | `39fb0e2a5b24648a5d0d95bf00bfed4afb54537a` |

`scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.ps1`, `scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs`, and `scripts/r4b-evidence/roslyn-verifier-authenticode.cs` remain byte-immutable. The final ten-path manifest remains external review evidence and no self hash is embedded in this record.

## 2026-11-12 — v1.13.6 pre-pin snapshot clarification

The section titled “v1.13.6 exact five-file snapshot” records an exact **pre-record, pre-pin implementation snapshot only**. Its policy and controller values were captured before the append-only record update and the required final mechanical source-pin refresh. Those values were never the final reviewed manifest. The word “exact” applies only to that historical pre-pin boundary.

The final canonical ten-path identity remains external exact-byte review evidence and is not embedded in this or any other covered manifest member. This clarification changes no v1.13.6 implementation, test, protocol, schema, authority, or execution boundary. The nonlive result remains **180/180 PASS**; `E01` through `E08` remain **8 required-unattempted**; `externalActionAuthorized=false`, `downloadAuthorityPresent=false`, `executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` remain unchanged. No live execution, acquisition, stage, commit, or push is authorized or recorded.
