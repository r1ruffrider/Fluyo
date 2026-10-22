# Provider-neutral native auth-state contract v1

This bundle defines a repository-only state, copy, privacy, and synthetic-test contract for Sprint 5 Increment 5.
It does not implement native authentication. Runtime executions are `0`, and the exact 12-by-2 iOS/Android
matrix for Sprint 5 scenarios 7–18 remains 24/24 `unattempted`.

The contract is provider-neutral. `AuthProvider`, `SessionVault`, `CallbackTransactionStore`, `Clock`,
`OwnerDataStore`, and `Telemetry` are ports, not SDK adapters. No Supabase native dependency, Keychain or
Keystore adapter, operating-system link registration, association file, redirect allowlist, dashboard change,
email delivery, account action, network client, signing resource, production value, physical-device action,
capture, store action, or spend is included.

## State and privacy boundary

The ten public states expose no token, code, verifier, nonce, callback URL, email, UUID, owner/profile/session ID,
provider detail, device identifier, correlation ID, campaign field, or raw diagnostic. The offline state is an
`offline_session_candidate`: it can preserve an already verified display state but cannot confirm a new owner,
grant access, expand data, or prove secure persistence. The identity label is always `Signed in`.

Secrets exist only as opaque values behind the future provider and vault ports. Synthetic fakes remain memory
only and never write them to disk. `/api/v1/auth/me` is the existing identity confirmation boundary; its UUID is
private and may not enter UI, logs, telemetry, fixtures, reports, filenames, or snapshots. No callback or refresh
HTTP endpoint is invented.

One in-memory `authGeneration` fences callback exchange, refresh, response handling, retry, navigation, and all
cache/storage writes. A generation change first cancels work and blocks writes, then clears previous-owner and
pending-flow state, verifies a candidate, and only then exposes the fixed identity state. One callback exchange
and one refresh may be in flight.

## Callback and lifecycle boundary

Synthetic callback classification accepts only exact HTTPS `.test` environment/host/path fixtures with one
purpose-bound pending transaction, one verifier, and injected-clock expiry. Consumption is atomic and single-use.
Success, cancel, malformed input, timeout, local sign-out, account switch, or a relaunch without a valid pending
transaction wipes the pending flow. Incoming URL, query, fragment, code, state, nonce, verifier, and their hashes
are never retained or emitted. No OS link is registered.

Transient refresh failure preserves the opaque vault candidate and moves to an offline or safe state. Explicit
invalid/expired/revoked refresh or a second authentication `401` clears local material. A `403` never refreshes
or signs out. Revocation wording is limited to refresh capability: an already issued access JWT may remain valid
until expiry. Remote deletion is absent and blocked; no deletion endpoint or fixture exists.

## Diagnostics and telemetry

Diagnostics use a closed enum. Retained evidence is limited to scenario ID, platform, `repository_only`
environment, exact source SHA, fixed outcome, count, artifact hash, and scan result. Mutation tests reject raw
exceptions, stack traces, stdout/stderr, commands, arguments, paths, URLs, headers/bodies, contact or owner data,
credentials, provider/signing/account data, device identifiers, and campaign data.

Telemetry is structurally no-op: zero transport, queue, serialization, disk write, correlation identifier,
retained timestamp, or retry. Tests cover launch, resume, duplicate callback, refresh, offline, switch, and errors.

## Remaining live gates

Live Increment 5 remains blocked by native SDK selection and checksum proof, encrypted platform adapters,
controlled callback domains, AASA/assetlinks, exact Supabase allowlists, auth-method and sign-out-scope decisions,
non-production service and recovery-delivery custody, signing, physical devices, and independent live evidence.
The Android stable client line also requires a separately reviewed release containing its credential-logging fix
plus a Fluyo logger that emits no SDK message or throwable.

Safe claim: **Repository-only provider-neutral auth-state contract and in-memory synthetic tests; zero native
runtime execution.**
