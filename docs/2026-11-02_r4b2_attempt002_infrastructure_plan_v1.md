# R4-B2 attempt-002 canonical infrastructure plan

Status: **CHOICE A SELECTED; IMPLEMENTATION IN REVIEW; EXECUTION GATED**\
Owner: Renata Vega\
Product source: `fea1f5fadb2307ca611379f30461a7ee47861fff`\
Attempt: `attempt-002-observer`\
Qualification: `NON_EVIDENCE`

This file is the canonical attempt-002 plan. It replaces older instructions that built or
served `apps/web`, used the development fixture route, or placed the harness only under
`scripts/r4b-evidence`. The approved implementation is the isolated repository-only app
`apps/r4b-preflight-harness`, with orchestration and the NVDA adapter under
`scripts/r4b-evidence`. Nothing in this plan enables a Fluyo production route.

## Fixed boundary

- The harness imports the exact frozen product `ConversationCanvas`, CSS, state, and
  fixture bytes. A deterministic harness-only replacement supplies the inert action, and
  a harness-only client boundary prevents non-fragment navigation while preserving the
  rendered presentation and focus.
- The production harness output is exactly
  `apps/r4b-preflight-harness/.next-attempt-002`. It is ignored by Git and excluded from
  Vercel. It is never copied into web, API, Android, iOS, or deploy outputs.
- The server is `next start` from `apps/r4b-preflight-harness`, bound only to an
  internally allocated `127.0.0.1` port. No caller supplies a path, port, URL, fixture,
  command, environment value, attempt ID, or cleanup target.
- The only query keys are `breakCase`, `fixture`, `locale`, and `transition`. `locale` is one of
  `en`, `en-XA`, or `ar-XB`; `transition` is `none` or one of the eight closed transition families.
  Runtime readiness requires two
  distinct valid cells to return 200 and render different exact product cells; a missing
  key and an extra key must each return 404.
- Inputs are synthetic. Provider, cloud, account, credential, secret, production data,
  external speech/OCR, admin/UAC, firewall, registry, service, system PATH, spending,
  deployment, and publication actions are forbidden.
- The whole attempt has one 3,600,000 ms abort scope. Timeout, SIGINT, and SIGTERM use the
  same cancellation signal. Once aborted, no new browser, NVDA, observation, transition,
  or cleanup work is started.

## Canonical module and containment map

This document is the single canonical infrastructure plan. It is a frozen member of `H` and
`A2.infrastructurePlanDigest` is its exact file SHA-256. The separately named
`A2.observationPlanDigest` binds only the generated 30-cell/120-observation plan. Authority schema
`fluyo:r4b:preflight-attempt-authority:v3` requires both fields; neither digest may substitute for
the other.

```text
canonical infrastructure plan (this file)
        | frozen in FROZEN_HARNESS_FILES and harnessTreeDigest
        | exact file SHA-256 in infrastructurePlanDigest
        v
A2 authority-only record
        |
        +-- build transaction --------> fixed-root-guard
        |                               windows-native-client.mjs
        |                               windows-native-boundary.cs
        |                               isolated Next harness
        |
        +-- observer/executor --------> fixed-root-guard
                                        retained-handle native boundary
                                        process/socket ownership
                                        bounded NVDA adapter + plugin
                                        sanitized NON_EVIDENCE result
```

The implementation dependency map is closed:

- `preflight-attempts.mjs` owns H/A2 authority, the frozen file inventory, lifecycle, and fixed
  paths. Its authority record has distinct `infrastructurePlanDigest` and
  `observationPlanDigest` fields.
- `fixed-root-guard.mjs` is the shared JavaScript contract used by attempts, build, observer,
  executor, and NVDA protocol reads. On Windows it delegates protected reads, mutations,
  inventory, and cleanup to `windows-native-client.mjs`; non-Windows fixture checks retain the
  descriptor-based implementation.
- `preflight-build.mjs` owns the fixed build transaction and calls the repository-owned
  native boundary. `windows-native-client.mjs` starts one persistent broker per closed root/session.
  `windows-native-contract.json` is the exact ordered schema/root/right/cap manifest and
  `windows-native-worker.mjs` is the controller-side synchronous bridge. The bootstrap opens and
  pins both the bounded C# source and frozen contract without write/delete sharing, validates their
  sizes, pinned-path file IDs before and after the bounded read, final paths, and exact SHA-256 values
  before loading the reviewed C# source, and reports the
  actual 64-bit PowerShell identity/version/signature in `HELLO`. The broker accepts only length-
  framed messages on its inherited anonymous request pipe and writes only length-framed responses on
  its inherited anonymous response pipe. No authoritative request, response, ready, receipt, or ACK
  file exists. The response SHA-256 ACK is written back on the request capability. A lost response or
  ACK is retried with the identical session/sequence/request digest and returns the retained response
  without reapplying the operation. The frozen J2 journal is an exact 16-field, canonical-base64,
  hash-chained record format. A response carries only its durable predecessor anchor. For a
  successful mutation the broker serializes the exact raw response once, hashes those bytes, appends
  `APPLIED_UNACKED_DURABLE` with the exact bytes/digest/length, flushes, and only then sends those
  bytes. The controller validates and hashes the raw frame before parsing it and ACKs only that
  digest. The broker appends `ACKED_COMMITTED_DURABLE` with the identical bytes/digest/length and
  returns `COMMIT_CONFIRMED` bound to the acknowledged response digest and actual post-ACK journal
  sequence/digest. Failed mutations durably journal their exact failure response in `FAILED_HELD`
  before sending it and confirm that durable failure after its digest ACK. Nonmutation responses use
  the unchanged journal anchor. Only the validated final confirmation advances the controller
  anchor. A nonempty legacy J1 journal is `LEGACY_JOURNAL_PERMANENT_HELD` and is never reinterpreted,
  rewritten, or abandoned. Production recovery accepts only
  `VERIFIED_APPLIED_UNACKED`, `VERIFIED_NOT_APPLIED`, `VERIFIED_COMMITTED`,
  `AMBIGUOUS_PERMANENT_HELD`, or `JOURNAL_PERMANENT_HELD`, each bound to the exact controller
  creation identity, failure event, request ID, and journal anchor. The caller never supplies an
  outcome or before/after identity: the broker derives both from the chained journal, retained
  handles, and current filesystem identity, and replays only the exact persisted response bytes. The
  controller owns a duplicated journal
  anchor and replacement brokers adopt that exact handle. A valid incomplete transaction observed
  after controller loss returns `JOURNAL_PERMANENT_HELD`; any nonempty, empty-truncated, coherently
  rewritten, or file-replaced journal without the controller anchor returns
  `ORPHANED_PERMANENT_HELD`. Both states forbid recovery, retry, mutation, and cleanup. Retained
  inventory ownership and original-token cleanup are implemented. Framed Job
  assignment/resume/status/termination and framed NVDA control/evidence/termination now execute
  inside that same persistent broker. The build and observer receive authority only through the
  framed broker response and capability ACK; the rejected one-shot and file-message paths are gone.
  Job assignment separately pins and verifies the canonical infrastructure-plan file/digest and
  binds it with the exact build-output root ID, normalized `.next-attempt-002` path digest, retained
  cwd/output-parent identity, and dist directory into one composite output-authority digest. The
  durable complete `JOB_ASSIGNED` receipt and every `JOB_CLOSED` receipt retain that binding and all
  Node, Next, PowerShell, native-client, cwd, and temp identities. Before any closed Job state is
  released, the broker appends an exact hash-chained `JOB_CLOSED_DURABLE` record containing the
  canonical receipt bytes and digest; journal loading revalidates its exact keys and bindings.
- Native development tests never write into the production recovery namespace. The canonical
  `test:r4b:exact` and audit-policy unit commands run through
  `windows-native-test-journal-runner.mjs`, which creates one internal cryptographic 64-hex run ID,
  passes it only to its child Node test process, waits for the child's `close`, and then invokes the
  hash-bound standalone `windows-native-test-journal-cleanup.cs`. Test brokers may write only under
  `%TEMP%/fluyo-native-test-broker-journals/<run-id>/<root-hash>.journal`; a missing or malformed
  outer-runner identity fails closed. Production remains under the unchanged
  `%TEMP%/fluyo-native-broker-journals/<root-hash>.journal` contract and is outside test cleanup
  authority. The cleanup helper starts no broker, holds the fixed NTFS temp/test/run chain and every
  journal by original non-delete-sharing handles, rejects reparse points, nested or unknown entries,
  substitutions, and drift, and accepts at most 1,024 lowercase hash-named journals, 16 MiB per file,
  and 512 MiB total. It deletes its one quiescent run through retained handles once and asserts the
  run directory absent. Normal termination, crash/recovery, permanent-hold, malformed, and failed
  child fixtures retain their journals while the child is live; cleanup begins only after final child
  closure. Parallel wrappers own distinct run directories, cleanup failure is terminal, and there is
  no retry, sleep, force masking, broad parent deletion, migration, or production-journal mutation.
  The runner captures one canonical host temp root at module initialization and forces that exact
  root into both child and cleanup environments; later `TEMP`/`TMP` mutation cannot redirect either
  side. Raw cleanup-by-run-ID authority remains private to the owning wrapper. The executable test
  fixture invokes the fixed native helper directly for negative boundary coverage and is not an
  exported canonical-runner API.
- `preflight-observer.mjs` owns only the fixed loopback server/driver/NVDA observation flow.
  `preflight-executor.mjs` validates the sanitized result and performs the only cleanup flow.
- `nvda-adapter/protocol.mjs`, `nvda-adapter/index.mjs`, and
  `scratchpad/globalPlugins/fluyoPreflightSpeech.py` implement the closed filtered pre-speech
  protocol. They do not accept provider, account, credential, product-data, or external paths.

The isolated harness imports an exact minimal local copy of the production global presentation
context: `--display`, `--body`, border-box sizing, the 320 px document floor, body/link/form resets,
and the non-color focus ring. Its file path, digest, and production provenance are frozen with the
product component/CSS/state/fixture bindings. The locale boundary deterministically transforms every
visible product text node for `en-XA` and `ar-XB`; it does not merely change `lang`/`dir`. Runtime
checks cover the exact primary-action ID/name, associated-label activation rectangles, every forward
and reverse focus stop, alpha-composited semantic contrast pairs, named-region clipping/overlap,
logical RTL mirroring from the computed responsive notch token, progress IDREF name/value text, and
equivalent reduced-motion outcomes. Focus outlines are compared with the parent/adjacent surface
exposed by their offset. Sequential focus follows native behavior: hidden, non-rendered, inert,
disabled, and negative-tab-index controls are excluded; an enabled named radio group contributes
only its checked member or first enabled member to Tab order. ACTIVE/SUBMITTING/CONFIRMED retain
exact forward/reverse browser traces, while radio Arrow traversal and the pending-state activation
guard are tested separately. State meaning is carried by the exact logical rule against its state
fill, each choice boundary is measured against its choice fill, and primary surface/boundary are
measured against the adjacent parent—never against the primary's own same-color decorative border.
The light warning rule is independently >=3:1 against `#fff7d8` and retains its dark-theme ratio;
progress fill is measured against its track at 3:1 without treating a pale panel tint as meaningful.
The exact phone risk cell (one unbroken 600-character prompt and four unbroken 180-character choices)
must fit both the document and every named region, using resilient wrapping and zero-minimum inline
size through the form, fieldset, choice grid, choice row, and text item. Transition samples
invoke the inert harness reducer boundary and retain target/focus/announcement/recovery/answer/
retry/cancel/connectivity/reload/persistence assertions rather than navigating directly to a target.
Focusable `aria-disabled` primary controls remain fully opaque and use explicit light/dark disabled
surface, text, boundary, and focus tokens; whole-control opacity is forbidden. Runtime contrast
measurement alpha-composites RGBA plus the effective element/ancestor opacity chain for text,
surface, boundary, and focus evidence, and fails closed when a computed color or opacity cannot be
parsed. This prevents an apparently compliant raw token from hiding a sub-3:1 rendered focus ring.
Busy choice rows remain keyboard-inspectable through `aria-disabled` and therefore also remain
fully opaque. Exact disabled-choice surface, text, unchecked boundary, checked boundary, and focus
tokens preserve selected hierarchy while meeting 4.5:1 text and 3:1 boundary/focus contrast in
light and dark themes. The observer measures every fieldset label's effective choice boundary
against its effective choice surface; the previous `opacity: 0.72` composition is an explicit
failing regression fixture.

The NVDA control protocol assigns every observation a closed generation and an ordered target speech
contract. That contract binds accessible name plus required state/content for the heading, progress,
back link, every rendered choice (including checked/unchecked and unavailable state), the primary
action, and each recovery action. The controller deliberately traverses only that closed target list.
Choices and pending/offline actions use focusable `aria-disabled` semantics with strict change/click/
submit guards, so NVDA can inspect selected and unavailable state without activating it; no native
disabled node is programmatically focused or redirected to a label.
After traversal it sends an exact `CLOSE` frame and waits for `OBSERVATION_IDLE`; the plugin crosses
NVDA's supported event queue with `queueHandler.eventQueue`. It marks the generation closing under
the condition, releases that lock before enqueueing/awaiting the barrier so earlier callbacks cannot
deadlock, then reacquires for zero-in-flight and bounded-quiet checks before closing. A later event,
cancel, replay, or
out-of-generation record is rejected before the next control is latched. The reader-driven fixture
queues the next control before the prior drain, injects a late prior callback, and exercises all 120
observation generations beyond pipe capacity without forward attribution.

Capacity fields are canonical decimal strings. `observerPeakRssBytes` is memory only and is never
compared with disk. Disk uses `sampleRawInventoryLogicalBytes`, `sampleDistinctCellCount=30`,
`sampleObservationCount=120`, `sampleObservationArtifactFileCount=960`, `fullRunCellCount=10800`,
`fullRunArtifactCount=86400`, `diskScaleNumerator=10800`, `diskScaleDenominator=30`,
`diskSafetyFactorNumerator=2`, `diskSafetyFactorDenominator=1`, and
`conservativeFullRunDiskBudgetBytes`. The budget equals, with exact BigInt divisibility,
`sampleRawInventoryLogicalBytes × (10800 / 30) × (2 / 1)` and is compared only with
`aggregateMaximumBytes`. It includes the sample raw logical artifact inventory and the explicit
two-times disk safety factor. It excludes observer RSS, build bytes, provider indexes/envelopes,
filesystem allocation overhead, and retained provider payloads; those remain separate live-run
capacity obligations.
Initial derivation and recovery additionally require byte-for-byte decimal equality among
`aggregate.sampleRawInventoryLogicalBytes`, the retained raw inventory byte count, and
`result.rawBytesBeforeDiscard`; no caller or recovered result may substitute a projected sample size.

Every Attempt-002 Windows write, read, inventory, and deletion enters the retained-handle native
boundary. The boundary opens the fixed root and every existing ancestor with
`FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_BACKUP_SEMANTICS`, omits `FILE_SHARE_DELETE`, verifies
file IDs, final paths, fixed-drive type, and NTFS, and retains those handles through the protected
operation. Destructive cleanup requires a bounded content-addressed inventory and deletes by
validated handles. A junction or reparse point in any existing ancestor is a terminal refusal,
never a cleanup target. Real Windows junction and synchronized ancestor-swap regressions are
mandatory and may not be silently skipped.

The immutable root matrix authorizes the exact production constructors only: raw observation
artifacts are `o/{observationId}/cells/{cellDigest}/{closedArtifactName}` with only their exact
intermediate directories; NVDA config permits only `nvda.ini` and
`scratchpad/globalPlugins/fluyoPreflightSpeech.py`; NVDA raw permits only
`pre-speech-requests.jsonl`, `diagnostics.log`, and `protocol.sha256`. Cleanup retains the original
native inventory lease through all raw/build/temp attempts. An internally issued tombstone bound to
that original lease makes an already-deleted tree an identity-bound no-op, while a recreated,
substituted, moved, or caller-forged tree remains a terminal refusal.

File creation, append, atomic rename, unlink, directory creation, and recursive cleanup use the
validated leaf handle or retained-parent-safe native call; Windows path-based mutation is not a
fallback. Synchronized TEST_ROOT race regressions cover mkdir, create/write, append, rename,
read/hash, unlink, remove-tree, framed Job lifecycle, and pinned NVDA files while proving the outside
sentinel unchanged. Every ignored runtime record is streamed through a regular-file,
non-reparse, size-bounded, identity-checked native reader before parsing or digesting. This includes
lifecycle, authority/tool manifest, builder journal,
failure/recovery records, aggregate, result, and
discard records.

`RENAME_EXCLUSIVE` journals one composite identity covering the canonical source and destination.
The applied state requires source absence plus the exact destination volume/file ID and content
digest. Recovery replays only that exact composite; destination deletion or same-byte substitution
after response loss is `AMBIGUOUS_PERMANENT_HELD`.

The native development suite includes a real suspended non-evidence Job fixture that assigns a
harmless local `cmd.exe /d /c exit 0` process before resume. It also compiles and launches a separate
Python 3.12 inherited-handle consumer through an explicit native handle list; the consumer calls
`msvcrt.open_osfhandle`, reads and writes only the injected retained descriptors, and returns an exact
digest. These fixtures do not launch Next, the harness, NVDA, or Attempt-002. A live portable NVDA
launch remains a required unattempted execution gate until the pre-execution authority permits it.

## Authority and lifecycle

`H` is the clean frozen implementation commit. Its frozen inventory includes this canonical plan.
`A2` is its exact single-parent, authority-only child. Execution requires a clean checkout at `A2`,
exact parent `H`, unchanged frozen inventories and digests, an exact
`infrastructurePlanDigest` for this file, and a distinct exact `observationPlanDigest` for the
generated observation plan.

Runtime state is an append-only hash-chained JSONL ledger at
`.r4b-preflight/runtime/attempt-002-lifecycle.jsonl`. The closed normal sequence is:

`NOT_STARTED -> BUILDING -> BUILD_READY -> PREPARING -> PREPARED -> OBSERVING -> SERVER_READY -> DRIVER_READY -> NVDA_READY -> OBSERVED -> RESULT_RECORDED -> CLEANING -> SEALED`

Any active state may enter `FAILED_HELD` only through its closed transition. A failure after
the attempt root exists recovers through `FAILED_HELD -> CLEANING -> SEALED`; recovery
re-derives or re-reads the byte-identical sanitized result, accepts no caller data, and never
overwrites a conflicting result or receipt. A build failure before the attempt root exists
instead closes through `BUILDING -> FAILED_HELD -> BUILD_ABORTED`. `BUILD_ABORTED` is a
distinct terminal state: its fixed recovery receipt binds the failure record and discarded
build/temp inventories, both roots must re-inventory to zero on every resume, no attempt root,
result, or not-E2 receipt exists, and that ordinal can never restart.

Attempt-001 remains immutable:

| Record           | SHA-256                                                            |
| ---------------- | ------------------------------------------------------------------ |
| Tool manifest    | `a9128a28ebb11329eadb40e35adb0eb43e2f970d8f037f380ce7cfeaf0c04738` |
| Smoke result     | `267430f37142d29e9fc8925e7f908ce9449fb53d19100064185ff75705185992` |
| Sanitized result | `6429c43544f025c9a60ad01e10e5284930b15d952e6467c3a018ad22c1500e1a` |
| not-E2 receipt   | `48161fe1845ac28d0b214f7e5ed5c709c102300d30e7752297b06c82446643be` |

## Build and local runtime order

1. Validate the clean `A2` checkout, `H/A2` chain, product binding, plan digest,
   predecessor seals, lockfile, the declared package-manager version, the supported Node
   range, the actual Node version and executable digests, Windows standard-user identity, static
   production exclusion, and an attempt-002 tool manifest with a nonempty hashed NVDA
   license/notice inventory. Before any NVDA installer launch, that same manifest must also carry
   the closed runtime-observed installer-byte and Authenticode record defined below; its current
   state is `UNATTEMPTED`.
2. Run the single no-argument `build-attempt-002` transaction. It validates A2, the
   repository lock/runtime declarations, the exact runtime executable binding, and
   absent/non-reparse attempt/build roots before it
   appends `BUILDING`.
3. The transaction invokes the hash-bound repository-owned `windows-native-client.mjs`, which
   compiles the frozen `windows-native-boundary.cs` through the exact absolute 64-bit Windows
   PowerShell executable under the standard user. The broker pins the exact Node, Next CLI,
   PowerShell, and native-client files by retained handle and content digest, and pins the cwd,
   output authority, and temp directory identities/path digests before suspended creation. It also
   receives six exact validated
   environment entries (`ComSpec`, `NEXT_TELEMETRY_DISABLED`, `NODE_ENV`, `SystemRoot`, `TEMP`,
   and `TMP`) in case-insensitive canonical key order, rejects missing, extra, duplicate,
   case-colliding, reordered, or changed entries, constructs their exact double-NUL-terminated
   UTF-16LE block, verifies its SHA-256, and passes that pointer with
   `CREATE_UNICODE_ENVIRONMENT`; `CreateProcessW` never inherits the PowerShell environment.
   That exact delivered-block digest is bound into `LAUNCH_INTENT`, `JOB_ASSIGNED`, and
   `BUILD_READY`. The broker then uses
   dependency-free C# P/Invoke to create the exact Node/Next builder with `CREATE_SUSPENDED`,
   configures a Windows Job Object with only `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, assigns the
   suspended process, returns the exact bounded assignment response over the inherited response
   pipe, waits for the response-digest capability ACK and the controller's separate framed resume
   operation, and only then calls `ResumeThread`.
   If Job assignment fails, the helper proves the suspended unassigned process is terminal before
   it closes the native process handle. It validates `TerminateProcess`, handles the already-exited
   race with `GetExitCodeProcess`, requires `WAIT_OBJECT_0`, rechecks terminal exit, and emits a
   distinct API-failure, wait-timeout, wait-failure, or still-active failure. Any inability to prove
   termination remains an ambiguous fail-closed state: no assignment/ownership receipt removal,
   repository inventory, or cleanup is permitted. The helper holds the Job handle until the build
   exits; helper failure or termination closes the
   handle and Windows terminates every job member, including descendants created between
   polls, after an intermediate exits, or during termination. The builder retains the fixed
   harness working directory. `TEMP` and `TMP` are the same exclusive ignored
   `.r4b-preflight/runtime/attempt-002-build-temp` root; no caller environment values are
   inherited. Output remains fixed at `.next-attempt-002`. A build failure writes the
   external closed failure record before deterministic exact-root build/temp recovery.
   Before spawn, the transaction fsyncs the first record of the fixed ignored append-only
   builder journal: an exact `LAUNCH_INTENT` binding the Node, Next, PowerShell, and helper
   paths and bytes, both exact argv arrays and digests, the working directory, allowed roots,
   and exact output-authority digest. The broker and builder PIDs are durably appended immediately
   after the framed assignment response. Any `SPAWNED` state without both a complete hash-bound
   `JOB_ASSIGNED` response and exact immutable broker/builder ownership records is permanently
   ambiguous: recovery performs no build inventory or build/temp cleanup.
   There is no empty-registry zero path. Once complete ownership exists, discovered descendants
   may also be appended for diagnostics, but safety and termination lineage come from the OS Job
   Object, not polling. The build is bounded by the exact hard 900000 ms cancellation timeout
   (900001 ms is rejected). Recovery revalidates and terminates only the helper, causing the Job
   handle to close. Two complete process/socket absence snapshots separated by an awaited
   event-loop turn must pass before fsynced `ZERO_PROOF`; the two-pass proof repeats after broker
   termination and again after journal removal before any build/temp inventory or
   deletion. Re-entry never starts a second build.
4. Validate `BUILD_ID`, the exact product markers, inert boundary/action markers, and the
   absence of live learning/auth/API/action bytes. Inventory and seal the build; append
   `BUILD_READY`.
5. The no-argument observer appends `PREPARING`, creates only the fixed attempt root,
   copies the exact authority and tool manifest, creates the exclusive raw root, and
   appends `PREPARED` then `OBSERVING`. Every mutation after `PREPARING`, including root
   creation, manifest copy, process spawn, and ownership registration, is inside the
   closed failure-held transaction.
6. Start the harness and ChromeDriver as registered owned roles. Persist `SERVER_READY`
   after the four query/loopback checks, `DRIVER_READY` after the exact WebDriver status
   and ownership checks, and `NVDA_READY` after the hash-bound filtered pre-speech
   adapter handshake. Each state has a fixed sanitized receipt before the 120-observation
   matrix begins.
   The inert client runtime proof covers anchor navigation, router buttons, action
   callback buttons, pointer submit, and keyboard submit, preserving focus and
   presentation with zero request or action activation.
   The portable NVDA writer is launched only by the native boundary. The broker retains eight exact
   non-reparse pins: working directory, executable, raw root, config root, installed plugin,
   protocol binding, filtered transcript, and diagnostic stream. Control and ready are unguessable
   inherited anonymous pipes, not filesystem messages. The broker inherits exactly those eight pins
   plus the control-read and ready-write child pipe ends through the explicit ten-handle process
   list, creates NVDA suspended, assigns it to a kill-on-close Job, and returns the bounded distinct
   controller/broker/NVDA PIDs, creation identities, capabilities, and 8-pin/10-inherited-handle
   receipt over the response pipe. Transcript and diagnostic handles deny external write sharing.
   The controller sends exact control JSON through a framed capability operation; the broker writes
   it to the anonymous control pipe and only then resumes NVDA. A dedicated plugin reader validates
   and atomically latches each observation control; every speech/cancel callback consumes that
   latched observation and monotonically sequences multiple events until the next control is latched,
   so the 120-observation controller sends one control frame per observation rather than one per
   callback. The controller consumes and validates the exact ready ACK for each control before
   driving that observation, so 120 frames cannot fill the 4096-byte pipe or be misattributed. The
   executable development fixture drives all 120 reader-thread controls with asynchronous ordered
   speech and cancel callbacks ahead of the NVDA event-queue drain marker, and rejects a retained
   prior-generation callback after the next control is latched without attributing it forward. The
   Python plugin consumes inherited handles with
   `msvcrt.open_osfhandle`; control, protocol, ready, filtered transcript, and plugin self-hash do
   not reopen paths. NVDA's ordinary path log is sent to `NUL`; the retained diagnostic handle is
   non-evidence. Ready, transcript, diagnostic, status, control updates, and stop are broker frames;
   the observer never reopens those channel paths. The broker remains the Job lifetime owner, and
   terminating it closes the Job and all pins. Live NVDA execution remains explicitly UNATTEMPTED
   until the frozen H/A2 authority and all independent gates permit Attempt 002.
7. Run 120 observations plus 10 accessibility, 6 risk-intersection, and 8 transition
   family checks. Completed work is PASS or FAIL; work not started after cancellation is
   UNATTEMPTED. The ledger always contains all 144 statuses.
8. Validate and write the sanitized aggregate. Append `OBSERVED`, or write the closed
   `FAILED_HELD` record when an operational/cleanup failure occurred.
9. The no-argument executor validates or derives the byte-identical sanitized result,
   appends `RESULT_RECORDED` and `CLEANING` as applicable, revalidates exact process and
   inventory ownership, deletes only the fixed raw and build roots, validates zero
   residual bytes, writes the not-E2 receipt, and appends `SEALED`.

No build or execution occurs until all specialist gates and Elana's exact-head PASS.

## Process and network ownership

Every launched role, including `harness-builder`, is registered immutably with exactly:

`role`, `pid`, `parentPid`, `executablePathDigest`, `executableSha256`,
`commandLineSha256`, `creationTimeUtc`, `allowedRoot`.

The journal and registry are append-only. Every journal event has exact top-level keys and
hash-chain order; every process record has exactly the eight fields above even when its root is
already absent. Role and PID replacement is forbidden. The canonical builder argv is exactly
`[absolute-node, absolute-next-cli, "build"]`; missing or extra arguments fail closed. Identity
is re-read and compared immediately before graceful or forced helper termination. The assigned
Windows Job Object is the authoritative recursive ownership boundary; polling is not used to
prove lineage. Discovered descendants may still be recorded and owned sockets may only be
state-valid IPv4 loopback sockets. Receipt removal and build/temp cleanup require the ordered,
yield-separated, repeated absence proofs described above. No unrelated process is stopped.

WebDriver calls, readiness probes, process waits, NVDA waits, and shutdown waits use real
rejecting timeout races tied to the global abort. A signal-ignoring operation still
rejects at its bound.

Performance-network logs are parsed fail-closed. Only the internal loopback origin plus
`data:`, `blob:`, and `devtools:` are allowed. The sanitized aggregate retains no URL,
port, PID, path, device identity, query string, or raw transcript.

## NVDA 2026.3 filtered pre-speech request transcript

The prospective NVDA 2026.3 installer pin is
`https://download.nvaccess.org/releases/2026.3/nvda_2026.3.exe` with expected SHA-256
`a8a87cb823da0c62cfbae4a444ae5ae238d54dc82ad6d46d3fdb3fef082799b2`.
Live Authenticode observation is `UNATTEMPTED`. The subject
`CN=NV Access Limited, O=NV Access Limited, L=Camp Mountain, S=Queensland, C=AU` and thumbprint
`4E9A772A99C1A3B713766DAC4B3545236CC2AE72` are prospective expected pins only; the official NV
Access version/hash evidence does not prove that signer observation. They become verified only when
the non-secret, hash-bound Attempt-002 tool manifest records the exact installer URL and observed
installer SHA-256, `POWERSHELL_GET_AUTHENTICODE_SIGNATURE_V1`, signature and certificate-chain
status, subject, thumbprint, canonical verification time, and the same byte hash for the signature
observation, and the closed manifest validator passes before launch. A missing record, stale or
unbound byte hash, URL/hash/signer/thumbprint mismatch, untrusted chain, or expired/invalid result
fails closed before launch. The existing license/notice, malware-scan, PE-version, and executable
inventory gates remain independently required.

The attempt creates a fresh portable copy and config under the raw root. The config has
no add-ons and contains only `nvda.ini` plus the exact hash-bound scratchpad global
plugin. `--disable-addons` is not used. Diagnostics are not transcript evidence.

The raw file is `raw/nvda/pre-speech-requests.jsonl`. The bounded cumulative stream permits at most
2 MiB so 120 observations can carry every ordered target event without truncation. Each canonical
record has nine
fields in this order:

`schema`, `attemptId`, `observationId`, `generation`, `sequence`, `monotonicMilliseconds`, `kind`,
`priority`, `text`.

The plugin accepts only the exact synthetic grammar and closed enum values. Substring
matches, URLs, account/credential/token content, UUIDs, paths, unknown observations,
sequence gaps/replay, oversized lines/streams, and wrong writer/handshake hashes fail.
Only the sanitized per-observation counts/statuses and normalized-text digest survive.

Every control or transcript input must be the exact non-reparse regular file handle created and
retained by the native broker inside the fixed raw root. Node writes the control only through the
previously pinned identity. The Python plugin seeks, sizes, and consumes bounded chunks directly
from inherited descriptors before decoding JSON; it writes ready/transcript bytes only through the
corresponding inherited descriptors. Whole-file allocation before enforcing a declared limit and
path reopening inside the plugin are forbidden.

## Production exclusion: local versus later gates

Windows-local observation prerequisites are:

- repository/workspace/Vercel ignore separation;
- static scans of web, API, shared, Android, iOS, infrastructure, `.github`, root scripts,
  lockfile, YAML, shell, PowerShell, and extensionless Dockerfiles;
- exact harness import/action/navigation boundaries; and
- the isolated harness production bundle proof.

These local prerequisites do not claim Android, iOS, or Vercel artifact exclusion.
Later platform gates separately inspect shared/API/web/standalone outputs, Vercel output,
APK/AAB contents, and iOS bundle/archive contents. Missing Windows-local targets remain
`BLOCKED`; Mac/iOS and Vercel outputs remain honestly `BLOCKED` until produced by their
authorized platforms. Their absence does not prevent the bounded Windows local observer
from running after its own gates pass.

## Counts and qualification

- Visual cells: 30.
- Repetitions: 4.
- Observations: 120.
- Additive checks: 24.
- Required statuses: 144.
- Maximum wall time: 3,600,000 ms.
- Evidence qualification: always `NON_EVIDENCE`; cleanup receipt is always `NOT_E2`.
- OCR remains `BLOCKED` and outside attempt-002 execution.

## Required unchanged-head gates

Catalina architecture, Natalia security, Camila accessibility, Daniela visual/motion,
Julieta numerical/privacy, Gabriela provenance, Renata reproducibility/exclusion, and
Elana exact-head QA must PASS. Adriana alone reconciles the gates and authorizes the next
commit/PR step under the standing delegation.
