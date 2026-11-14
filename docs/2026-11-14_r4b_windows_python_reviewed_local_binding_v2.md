# R4-B Windows Python reviewed-local binding v2

Date: 2026-11-14

## Decision and authority

Adriana selected recommended Option A under Marlon's standing delegation on
2026-11-14: replace ambiguous ambient-PATH authority for the next bounded local
proof with one explicitly reviewed CPython packet and a fail-closed, one-shot
transaction. This record authorizes repository implementation and nonexecuting
injected tests only.

Catalina's v2 architecture preflight passed 103/103 controls. Natalia reconciled
the exact v2 contract and passed 64/64 mandatory security controls with no
findings. The earlier v1 design passed only 51/64 security controls, was held,
and was never implemented.

Live authority remains false. Native-helper compilation, packet or evidence
creation, Python execution, network observation, cleanup execution, and the
reviewed-local transaction remain separately held behind post-merge source-to-
helper identity and fresh Catalina, Natalia, Renata, and Elana gates.

## Exact packet schema

The sole private input is the canonical v2 reviewed-local packet defined by
`R4B-WINDOWS-PYTHON-REVIEWED-LOCAL-BINDING-v2`. It binds one transaction ID,
one private canonical local root, exact CPython 3.12.5 identity, complete root
manifest counts and digest, offline WinCrypt Authenticode evidence, and one
public binding digest. The root, raw packet, signer subject, and signer
thumbprint are private and must never enter repository records or logs.

The public binding digest covers every non-private packet field. The exact
packet schemas, key order, literals, size limits, signature evidence, and root-
manifest algorithm are owned by Catalina's frozen v2 contract. Any drift resets
the architecture and security gates.

## Private-data boundary

The repository phase creates no reviewed packet, private root, signature
evidence, live root manifest, transaction ID, public binding digest, or runtime
receipt. Later public evidence may disclose only the approved digests, counts,
version tuple, provenance literal, and closed settlement facts. It must not
disclose paths, packet contents, raw process output, environment values,
certificate bodies, signer subject, signer thumbprint, exception causes, or
command lines.

## Selection and one-child state machine

Reviewed-local mode never reads PATH, the registry, a launcher, `py.exe`, an App
Execution Alias, a venv, sibling roots, or fallback candidates. The source-only
native lease remains unavailable in this phase and must return the fixed
`REVIEWED_LOCAL_NATIVE_LEASE_UNAVAILABLE_HOLD` state. No native helper may be
compiled or executed from this repository implementation.

A future separately gated transaction must durably consume its ID before any
child, permit at most one held CPython child, use an exclusive owned cwd and
TEMP/TMP, prove complete root and executable identity before and after, observe
owned process and TCP/UDP boundaries, prove the closed global snapshot, settle
durably before cleanup, and never retry, resume, repair, reuse, or fall back.

## Closed settlement

The durable evidence order is an exclusive permanent transaction directory,
`consumption-v1.json`, `settlement-v1.json`, and
`outer-receipt-v1.json`. Normal terminal evidence is exactly 3/3 valid files.
Preexisting or partial transaction state is permanently consumed and held.
The final closed states are the contract's `REVIEWED_LOCAL_*` states; unknown,
incomplete, cleanup-uncertain, process-residual, network-event, global-mutation,
or root-drift evidence is HOLD, never success.

The previous one-shot diagnostic bound to manifest
`9c20d7bea8ebd5fb2144659b96745dbf43415c134fb283cf5943eaeea10b874b`
settled exactly
`LOCAL_PATH / CHILD_NONZERO_OR_SIGNAL / TEST_PYTHON_INTROSPECTION_FAILED`.
That transaction is permanently consumed. Its private child cause is unknown;
the record proves a fail-closed result, not a corrupt or malicious interpreter.

## Test inventory

The v2.0.1 repository candidate is exactly ten paths:

1. `scripts/r4b-evidence/test-python-binding.mjs`
2. `scripts/r4b-evidence/windows-native-test-journal-runner.test.mjs`
3. `scripts/r4b-evidence/reviewed-local-python-transaction.mjs`
4. `scripts/r4b-evidence/reviewed-local-python-transaction.test.mjs`
5. `scripts/r4b-evidence/r4b-test-lanes.mjs`
6. `packages/shared/src/auth-runtime-synthetic-contract.test.ts`
7. `docs/2026-11-14_r4b_windows_python_reviewed_local_binding_v2.md`
8. `docs/DEVELOPMENT_HANDOFF.md`
9. `scripts/r4b-evidence/reviewed-local-python-native-lease-v2.cs`
10. `scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs`

The frozen target is 50 existing binding children, 12 historical diagnostic
children, and 60 reviewed-local children: 122 child assertions and 125 Node
test executions including three parents, with zero skipped, todo, or cancelled.
The sole v2.0.1 transitive-consumer repair is path 10. The targeted lane-snapshot
contract is 3/3. The portable inventory becomes exactly 12 rows, the Windows
inventory remains exactly five, and the total is exactly 17. The canonical lane
JSON is 926 bytes with SHA-256
`dcb968f685a4c7c2b271a2d32d7d2f7c3765f34e8c531831e932e1e3f9b5a1f5`.
The exclusions digest remains byte-identical at
`8d875d47149a98760b795907131676b4c334652a679ebe97645c942eae32b3bc`.
The earlier 11-portable + 5-Windows = 16 inventory, 860-byte lane JSON, and
SHA-256 `6ccc0208c8d7e104d6ebfe2e9b196eb3b5ddbc599ef365ae92c65e6ec712d9f2`
are historical and superseded; they are not execution evidence. The focused
target remains 125 Node executions.

The v2.0.3 per-path state table uses bit order
`tracked / staged / untracked`. The phase set is exactly `[100, 110]`; the
reviewed set is exactly `[001, 010, 100, 110]`. Its lifecycle is exactly:

- A: phase `100`, reviewed `001`
- B: phase `110`, reviewed `010`
- C: phase `100`, reviewed `100`
- D: phase `110`, reviewed `110`

The earlier shared-union interpretation was a pre-implementation ambiguity and
is superseded before execution. This clarification changes no inventory count,
test count, lane JSON byte count, lane digest, exclusion digest, or authority.

### Exact implementation freeze

Valentina froze the candidate on base
`a2485dc12c231dd482799834d5aca2966a6db494`. The eight non-record paths are:

| Path                                                               |   Bytes | SHA-256                                                            |
| ------------------------------------------------------------------ | ------: | ------------------------------------------------------------------ |
| `packages/shared/src/auth-runtime-synthetic-contract.test.ts`      |  39,393 | `f248b5256b7e356ad2693600aa5acd8b275cf97a01e02d009f9a2c3f50f99d2c` |
| `scripts/r4b-evidence/r4b-test-lanes.mjs`                          |  16,061 | `1175b9e2e020cc2a1afbfcf393a349d2f585a6a3e229526be02bbffb6b74cc33` |
| `scripts/r4b-evidence/reviewed-local-python-native-lease-v2.cs`    |  83,099 | `94680fca6a0de04efbb46b5ab40f84ac3f885bbeeb167e8ebb6c60bc7d7b7d4d` |
| `scripts/r4b-evidence/reviewed-local-python-transaction.mjs`       |  60,857 | `87f2ef4cd8e5b3c76175abf5bc173f8309ed5511a441345004487484925ce3cb` |
| `scripts/r4b-evidence/reviewed-local-python-transaction.test.mjs`  |  56,031 | `c7187201657e0302c663d786205b231556fe8a749b26eb0e627c556f09574146` |
| `scripts/r4b-evidence/root-only-closure-roslyn-toolchain.test.mjs` | 196,187 | `0610699e1570dbeb6f5e74fc99930ee2468c03a33571496e351402f5accf413d` |
| `scripts/r4b-evidence/test-python-binding.mjs`                     |  38,042 | `3562a581f8dc5d88b180ce496778d32393bbd34a21d5400de2894b4bbc5e19ae` |
| `scripts/r4b-evidence/windows-native-test-journal-runner.test.mjs` |  93,129 | `4f67a0ee7aced308b8e45d1731792fbfe26ddfa4796b9c98c111f269e424a970` |

The first exact-byte review of the pre-repair implementation did not pass:
Catalina counted **138/146**, while Natalia counted **56/64** plus **27/28**.
Their failures identified stubbed or shallow transaction/native-lease behavior,
insufficient executable tests, and incomplete transitive-consumer coverage.
That pre-repair status is historical and superseded; it is not a PASS and did
not authorize execution.

Valentina's first material repair of paths 3, 4, 5, 9, and 10 reached
reviewed-local **61/61 PASS**, focused **125/125 PASS**, lane/current **4/4
PASS**, portable **334/334 PASS**, and shared **562/568** with the six expected
precommit/history guards. This is retained as intermediate v2.0.3 evidence and
is superseded by v2.0.4.

The v2.0.4 repair candidate reached reviewed-local **70/70 PASS**, focused
**134/134 PASS**, portable **343/343 PASS**, and path 10 **180/180 PASS**. It is
retained as intermediate evidence and is superseded by v2.0.5.

The v2.0.5 repair candidate reached reviewed-local **76/76 PASS**, focused
**140/140 PASS**, portable **349/349 PASS**, and path 10 **180/180 PASS**. It is
retained as intermediate evidence and is superseded by v2.0.6.

The v2.0.6 repair candidate makes terminal-module evidence live-only,
requires post-signal revalidation, and applies one shared **4,096-byte** combined
output cap. Tests 76-79 cover those exact boundaries. Development evidence is
reviewed-local **80/80 PASS**, focused **144/144 PASS**, portable **353/353
PASS**, and path 10 **180/180 PASS**. These are repository development results,
not live execution evidence. The terminal audit passed **542/542**. Shared is
**562/568** with zero behavioral failures and exactly six expected
precommit/current-head guards: auth allowlist **1**, readiness record pin **1**,
and activation identity **4**. Full lint, typecheck, formatting, and diff checks
PASS. It is retained as intermediate evidence and is superseded by v2.0.7.

The current v2.0.7 code freeze binds the exact bootstrap and SHA evidence,
requires the READY and LOADED state boundary, captures the two barriers, routes
them through the closed coordinator, and freezes the concurrency oracles. Its
two closed oracles reject proxy, mutable, accessor, symbol, extra, and nested
data forms. Its
repository-only counts remain reviewed-local **80/80 PASS**, focused **144/144
PASS**, portable **353/353 PASS**, and path 10 **180/180 PASS**. Path 9 remains
source-only and uncompiled/unexecuted; these are not live execution results.

An unfiltered **336/337** invocation was a command-selection error and is
excluded from evidence. It is not a candidate result, regression count, or gate
verdict.

Path 9 remains source-only and has not been compiled or executed. No live
packet, Python child, native lease, network observer, marker, settlement,
receipt, or cleanup transaction ran. Authority remains false.

The two record paths intentionally do not embed their own final hashes. The
canonical full ten-row manifest is external gate evidence and must be recomputed
after this records freeze. Any earlier provisional ten-row manifest identity is
pre-record evidence and must not be treated as the final reviewed manifest.

## Required-unattempted execution

The following remain required-unattempted in this repository phase: native-
lease compilation or activation; offline WinCrypt evidence collection; private
packet and complete live root-manifest preparation; live CPython execution;
owned process, network, global-snapshot, and cleanup observation; and durable
marker, settlement, and receipt creation.

After implementation, the exact bytes require Catalina architecture, Natalia
security/privacy, Renata synthetic reproducibility, Gabriela provenance,
Julieta numerical/claim, Bianca records, and sole final Elana QA gates. Commit,
protected CI, mergeability, merge, and post-main verification follow only after
their applicable exact-byte and exact-head passes.

## Forbidden actions

`externalActionAuthorized=false`, `downloadAuthorityPresent=false`,
`executionAuthorityPresent=false`, and `PRECONDITION_HOLD_NO_GET` remain
mandatory. This record does not authorize acquisition, download, install,
manager execution, PATH or global mutation, native-helper compilation,
PowerShell, Add-Type, a live reviewed-local transaction, verifier or NuGet
execution, broker, Attempt004, E01-E08, production, signing, store, spend,
credentials, external-account changes, stage, commit, or push.
