# R4-B Add-Type contract self-test activation v1.1.2

Date: 2026-11-13
Phase: R4B-ADDTYPE-CONTRACT-SELF-TEST-ACTIVATION-v1.1.2
Status: **RECOMMENDED OPTION A SELECTED — PACKET AUTHORIZED; EXECUTION HELD**

## Decision and delegated authority

Marlon approved the recommended closed Add-Type/PInvoke direction and delegated
to Adriana approval of this bounded class of non-production evidence and test
processes. Adriana selected `RECOMMENDED_OPTION_A` under authority
`CLOSED_ADD_TYPE_PINVOKE_LEASE_BOOTSTRAP_V1`, with decision reference
`MARLON_RECOMMENDED_1A_CLOSED_ADDTYPE_PINVOKE_2026-11-11` and approval basis
`MARLON_DELEGATED_BOUNDED_NON_PRODUCTION_EVIDENCE_TEST_APPROVAL`.

This repository packet authorizes only a future activation transaction after
every repository, post-main, identity-tuple, and pre-execution gate passes. It
does not itself execute the transaction or grant general operational or
external authority.

## Historical provenance and exact execution checkout

Historical source and design provenance remains
`d6607300e52219c5d534e70c17e00e2e717e505b`. Reviewed PR #89 source
`7220bef062a93142f5bcde07de89199355eb5837` remains a `SQUASH_SOURCE`, not an
ancestor claim. Design merge `7a5b345846eb29928dacb8f01b96796c01182dc2`
and readiness merge `d70d8d9f3510b8b4a83f18478dc79dece39094d6` remain
separate recorded events. Historical semantics are
`IMMUTABLE_HISTORICAL_PROVENANCE_NOT_EXECUTION_AUTHORITY`.

The exact clean detached execution checkout is
`d70d8d9f3510b8b4a83f18478dc79dece39094d6`. It must descend from the historical
`d6607300` source and retain the relationship
`DESCENDANT_WITH_BYTE_IDENTICAL_TEN_PATH_SUBJECT`. Existing historical policy
pins are not rewritten or treated as current execution permission.

## Immutable ten-path subject

The reviewed runtime subject remains exactly 10 rows, 1,753 canonical bytes,
SHA-256
`15b3ff5f2158b0eb7839591a0aad3373491afff45b2e7dc6a4eda2e3f607ea2b`, with
review binding `HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1`. Its exact ordered paths
are:

1. `docs/2026-11-11_r4b_addtype_bootstrap_decision_v1.md`
2. `docs/DEVELOPMENT_HANDOFF.md`
3. `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-policy-v1.json`
4. `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.mjs`
5. `scripts/r4b-evidence/root-only-closure-nuget-addtype-bootstrap-v1.ps1`
6. `scripts/r4b-evidence/root-only-closure-nuget-addtype-lease-v1.cs`
7. `scripts/r4b-evidence/root-only-closure-nuget-addtype-synthetic-adapter-v1.mjs`
8. `scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs`
9. `scripts/r4b-evidence/root-only-closure-verifier-bytes-receipt-v1.mjs`
10. `scripts/r4b-evidence/roslyn-verifier-authenticode.cs`

The adapter remains bound to CLI
`--execute-authorized-contract-self-test-v1`. None of these ten paths belongs to
the activation diff, and none of the six activation paths becomes an inner
runtime manifest member.

## Exact six-path repository scope

The candidate scope is exactly these six paths in canonical UTF-8 byte order:

1. `docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md`
2. `docs/2026-11-13_r4b_addtype_contract_self_test_activation_v1.md`
3. `packages/shared/src/sprint-6-r4b-addtype-contract-self-test-activation.test.ts`
4. `packages/shared/src/sprint-6-r4b-addtype-contract-self-test-executor.test.mjs`
5. `scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-activation-v1.json`
6. `scripts/r4b-evidence/root-only-closure-addtype-contract-self-test-executor-v1.mjs`

The bundle review binding is `HELD_SIX_PATH_ACTIVATION_REVIEW_BINDING_V1`. Each
canonical manifest row is
`${path}\0${byteCount}\0${sha256}\0${gitBlobSha1}\n`. The six-row digest is
fresh exact-head evidence and is not embedded in a covered member because that
would self-reference. No package, lockfile, workflow, schema, ten-path runtime,
product, preserved-draft, or external/admin mutation belongs to this phase.

The non-executing regression target is 69 tests.

The activation `.test.ts` imports
`./sprint-6-r4b-addtype-contract-self-test-executor.test.mjs` exactly once; the
executor MJS is not independently glob-discovered. The focused total is
`24+45=69`. The existing R4-B lane remains exactly 11 portable plus 5 Windows
tests, 16 total, at SHA-256
`6ccc0208c8d7e104d6ebfe2e9b196eb3b5ddbc599ef365ae92c65e6ec712d9f2`.
No config, tsconfig, package, lane, or ten-path change occurs. The immutable d70
ten-path subject remains 10 rows, 1,753 bytes, SHA-256
`15b3ff5f2158b0eb7839591a0aad3373491afff45b2e7dc6a4eda2e3f607ea2b`.

## Post-main repository identity tuple

The activation pull request must remain one commit directly based on `d70d8d9f`.
Its future squash merge `M` must be a direct child of `d70d8d9f` and is never the
execution checkout. After protected CI and post-main verification, reviewers
derive this exact ordered tuple as external gate evidence:

1. `activationMergeCommit`
2. `executionCheckoutCommit`
3. `activationPacketSha256`
4. `activationPacketGitBlobSha1`
5. `reviewedSixRowManifestSha256`
6. `reviewBinding`
7. `expectedRepositoryCommonDirIdentitySha256`

The repository identity mode is
`EXPECTED_REPOSITORY_COMMON_DIR_IDENTITY_V1`, derived by
`R4B_REPOSITORY_COMMON_DIR_IDENTITY_V1`. Its expected value is not committed.
The activation merge and execution checkout must be linked worktrees of one reviewed Git common-directory identity; cross-clone replay is forbidden.

No tuple substitution is permitted. Any merge, checkout, packet, six-row
manifest, repository identity, host image, adapter image, transaction-directory,
or gate drift returns the transaction to HOLD and requires fresh review.

## Durable one-attempt transaction

The sole transaction is
`R4B-ADDTYPE-CONTRACT-SELF-TEST-D70D8D9F-001`, whose UTF-8 SHA-256 is
`ac17e1dfe4c2f08c719eb89a73756e0f426f81d407ed4d38482fd07e4853c576`.
Its mode is `CONTRACT_SELF_TEST_V1_13_6`; its outer CLI mode is
`--execute-authorized-contract-self-test-activation-v1`; its inner CLI mode is
`--execute-authorized-contract-self-test-v1`.

The durable mode is `GIT_COMMON_DIR_DURABLE_TRANSACTION_V1`. Under the reviewed
Git common directory, the fixed relative directory is
`fluyo-r4b/transactions/ac17e1dfe4c2f08c719eb89a73756e0f426f81d407ed4d38482fd07e4853c576`.
It is created through `EXCLUSIVE_NONRECURSIVE_SEGMENT_CHAIN_V1`. Cross-clone
execution is forbidden, and the same reviewed common-directory identity is
required.

The exclusive transaction directory consumes the single attempt before marker creation or child spawn and is never deleted, repaired, resumed, retried, or reused.

Maximum attempts is 1. Retry, resume, repair, and deletion are false. Directory existence consumes the attempt. Complete clean numerical evidence records 39 completed fixtures, one derived launched compiler, 40 measured work owners, and 42 measured total owners including the two baseline owners. The inner `compilerProcessCount` and `fixtureProcessCount` fields are post-quiescence residual-live counts and must both be zero; they are never launched-process counts. The exact cleanup step count is 23. The outer observation timeout is 330,000 ms. Child stdout is capped at 4,096 bytes and child stderr at 0 bytes. The inner receipt cap is 4,096 bytes; the outer receipt cap is 8,192 bytes.

## Marker and outer receipt

The marker is `consumption-v1.json`; the outer receipt is
`outer-receipt-v1.json`. Both use `WX_CANONICAL_FSYNC_V1` and retention
`PERMANENT_DO_NOT_DELETE_REPAIR_REUSE`. The outer receipt schema is
`R4B-ADDTYPE-CONTRACT-SELF-TEST-OUTER-RECEIPT-v1.1.2`, encoded as
`UTF8_NFC_COMPACT_JSON_ONE_LF`, with raw paths and raw output forbidden.

The outer marker and receipt are permanent governance evidence; they are not inner adapter artifacts and do not alter retainedArtifactCount=0.

Marker and receipt counts are state-dependent: canonical completion is 2/2;
marker-absent after consumed directory creation plus receipt is 1/1; a partial
or invalid marker plus receipt is 2/1. Receipt failure makes no count claim,
while directory existence still consumes the attempt. Allowed marker states are
`VALID_CANONICAL`, `ABSENT_AFTER_DIRECTORY_CONSUMPTION_HOLD`, and
`PRESENT_INVALID_OR_PARTIAL_HOLD`.

The inner terminal states are `SYNTHETIC_TEST_CLEAN`,
`SYNTHETIC_TEST_FAILED_CLEAN`, and `SYNTHETIC_TEST_FAILED_CLEANUP_HOLD`. The
outer terminal states are `OUTER_SYNTHETIC_TEST_CLEAN`,
`OUTER_SYNTHETIC_TEST_FAILED_CLEAN`,
`OUTER_SYNTHETIC_TEST_FAILED_CLEANUP_HOLD`,
`OUTER_ATTEMPT_CONSUMED_MARKER_INCOMPLETE_HOLD`, and
`OUTER_ATTEMPT_CONSUMED_RESULT_UNKNOWN_HOLD`.

## Numerical evidence semantics

The immutable d70 inner receipt has 29 ordered keys. For both `SYNTHETIC_TEST_CLEAN` and `SYNTHETIC_TEST_FAILED_CLEAN`, numerical evidence is complete: `completedFixtureCount=39`, `compilerProcessCount=0`, `fixtureProcessCount=0`, `cleanupStepCount=23`, `networkBaselineOwnerCount=2`, `networkWorkOwnerCount=40`, `networkOwnerCount=42`, `networkObservationCount>=1`, `0<=networkMaximumGapMicros<=10000`, `networkEventCount=0`, and `retainedArtifactCount=0`. The outer projection records `innerDerivedLaunchedCompilerProcessCount=40-39=1` and `innerDerivedNetworkTableIterationCount=networkObservationCount*4`; both operations must remain safe integers. The owner arithmetic is `2+40=42`, and the completed-work arithmetic is `1+39=40`.

The validated clean and failed-clean inner receipt also requires
`globalMutationCount=0`; that source field is not one of the 13 projected outer
numerical fields.

Outer numerical evidence is all-present for `SYNTHETIC_TEST_CLEAN` and `SYNTHETIC_TEST_FAILED_CLEAN`, and all-null for `SYNTHETIC_TEST_FAILED_CLEANUP_HOLD` and every outer HOLD without a validated clean inner settlement. Partial outer numerical evidence is forbidden. A HOLD may contain bounded partial inner source measurements, but none becomes an outer numerical claim. The clean/failed-clean `innerRetainedArtifactCount=0` truth is preserved; the outer retained-artifact projection is null for HOLD.

The exact outer numerical field order immediately after `innerPrimaryFailureReason`
and before `childSpawnAttempted` is:

1. `innerCompletedFixtureCount`
2. `innerDerivedLaunchedCompilerProcessCount`
3. `innerResidualCompilerProcessCount`
4. `innerResidualFixtureProcessCount`
5. `innerCleanupStepCount`
6. `innerNetworkBaselineOwnerCount`
7. `innerNetworkWorkOwnerCount`
8. `innerNetworkOwnerCount`
9. `innerNetworkObservationCount`
10. `innerNetworkMaximumGapMicros`
11. `innerDerivedNetworkTableIterationCount`
12. `innerNetworkEventCount`
13. `innerRetainedArtifactCount`

The packet's closed `outerReceipt.innerNumericalEvidenceProjection` records
`sourceReceiptKeyCount=29`,
`cleanAndFailedCleanRequireCompleteEvidence=true`,
`cleanupHoldOuterProjection=ALL_NUMERICAL_FIELDS_NULL`, and
`networkTablesPerObservation=4`. Its ordered source fields are
`completedFixtureCount`, `compilerProcessCount`, `fixtureProcessCount`,
`cleanupStepCount`, `networkBaselineOwnerCount`, `networkWorkOwnerCount`,
`networkOwnerCount`, `networkObservationCount`,
`networkMaximumGapMicros`, `networkEventCount`, and `retainedArtifactCount`.
Its derived fields are
`innerDerivedLaunchedCompilerProcessCount=networkWorkOwnerCount-completedFixtureCount`
and
`innerDerivedNetworkTableIterationCount=networkObservationCount*4`.

## Host, child, and privacy boundary

The executor contract is `R4B-ADDTYPE-OUTER-ACTIVATION-EXECUTOR-v1.1.2`. The
Node host is exactly `C:\Program Files\nodejs\node.exe`, version `24.22.1`,
93,915,464 bytes, SHA-256
`d702daa815eabbff763c7d3808e235cf031cf2ca70211b56847bc72f51e240e5`,
with normalized image-path SHA-256
`46674df7e50081977073a3d38239a6782e73328bda5843f5d5a85d4118d98357`.
Only `node:child_process`, `node:crypto`, `node:fs`, `node:path`, `node:process`,
and `node:url` are allowed. Dynamic imports, shell use, network use, and unknown
arguments are forbidden; `process.execArgv` must be empty.

The outer invocation binds `M`, the absolute clean `d70` checkout, packet
SHA-256 and Git blob SHA-1, reviewed six-row digest, expected repository
common-directory identity SHA-256, and
`HELD_SIX_PATH_ACTIVATION_REVIEW_BINDING_V1` in the exact reviewed order. The
inner child is the pinned Node host plus the immutable adapter, inner CLI, exact
ten-path manifest SHA-256, and
`HELD_TEN_PATH_PREEXEC_REVIEW_BINDING_V1`.

The receipt is bounded canonical metadata only. It retains no raw path, raw
child output, credential, proxy, token, nonce, environment, certificate/store
detail, private value, or inner artifact. Zero-network observation starts before
the child and ends only after the owned process tree and cleanup settle. Any
uncertainty, malformed evidence, residue, or cleanup failure remains HOLD and
never authorizes a retry or broad deletion.

## Required gates and owners

Catalina owns architecture, schema, and topology; Natalia owns security,
privacy, and TOCTOU review; Renata owns linked-worktree identity,
reproducibility, and the sole execution; Julieta owns arithmetic, hashes,
counts, timings, and claims; Gabriela owns provenance when needed; Bianca owns
append-only records; Valentina owns only the six-file repository implementation;
Elana owns final independent QA.

The candidate requires development evidence, Catalina/Natalia/Renata/Julieta/
Bianca exact-byte PASSes, and Elana's sole candidate PASS before commit. Exact
commit rebinds and Elana PUSH-ONLY PASS precede a draft pull request. Every
protected check, exact-head specialist rebind, and Elana merge PASS precedes a
squash merge. Base movement or head drift invalidates the candidate.

After merge, Auth approval history, Auth material decisions, and full CI must
pass without retry. Reviewers then compute the external six-row identities and
the exact post-main tuple. Fresh Catalina, Natalia, Renata, and Elana tuple gates
must pass before execution.

Renata alone may execute the one transaction after every post-main tuple gate passes.

Julieta audits fixed counts, hashes, timings, and claims after the run. Elana
independently audits the permanent marker, receipt, cleanup, held states, and
required-unattempted scenarios before any evidence append or claim.

Elana remains the sole final independent exact-head and post-run QA owner.

The v1.1.2 numerical-evidence amendment requires a 69-test focused result and fresh Catalina, Natalia, Renata, Julieta, Bianca, and Elana exact-byte gates. No v1.1.2 implementation PASS, packet merge, post-main tuple review, or transaction execution is claimed by this records update.

## Forbidden actions and completion

General authority remains exact:

- `syntheticBootstrapTestAuthorized=true`
- `transactionAuthorizationPresent=true`
- `externalActionAuthorized=false`
- `downloadAuthorityPresent=false`
- `executionAuthorityPresent=false`
- `state=PRECONDITION_HOLD_NO_GET`

GET, download, acquisition, live verifier, NuGet execution, broker, Attempt004,
E01 through E08, production, signing, store, spend, credentials, external
accounts, provider administration, firewall changes, storage expansion, and
publication are forbidden. Operational scenarios E01 through E08 remain ordered
and `REQUIRED_UNATTEMPTED`.

R4-B2, R4-B3, aggregate R4-B, and Sprint 6 remain incomplete. This packet and a
future contract self-test cannot substantiate provider evidence, runtime
capture, production readiness, public accessibility, or phase completion.

## Claim boundary

`ONE_ZERO_NETWORK_SYNTHETIC_CONTRACT_SELF_TEST_ONLY_NO_OPERATIONAL_OR_EXTERNAL_AUTHORITY`
