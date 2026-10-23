# Native auth storage and lifecycle candidate evidence

This candidate-only document records the questions and proof obligations for native session storage and lifecycle cleanup. It does not implement, select, approve, install, or verify a Keychain or Keystore adapter.

## Observed repository facts

The provider-neutral auth-state contract supplies state and synthetic scenario context. The repository contains server-side JWT validation and web-session code, but no repository fact proves native secure storage, device backup behavior, migration, corruption recovery, account switching, remote revocation, or deletion orchestration.

## Proposed material choices

- `AUTH-STORAGE-IOS`: choose a Keychain accessibility class only after the iOS floor, threat model, backup/restore rule, migration behavior, wipe ordering, corruption handling, and account-switch isolation are reviewed.
- `AUTH-STORAGE-ANDROID`: choose Keystore-backed encryption only after the Android floor, hardware-backed expectations and fallback, backup exclusion, migration behavior, wipe ordering, corruption handling, and account-switch isolation are reviewed.
- Session lifecycle: perform local credential/token cleanup before any success claim; bound failure states; never promise immediate invalidation of already-issued JWTs without provider and server evidence.
- Account deletion: require recent reauthentication, an owned deletion API, idempotent orchestration, resumable partial-failure handling, audit/retention boundaries, clear irreversible copy, and a non-destructive cancel path.

These statements describe candidate constraints. They do not choose accessibility classes, storage libraries, hardware guarantees, cleanup order, revocation semantics, or deletion behavior.

## External blockers

Security, platform, backend, privacy, retention, support, and destructive-action owners must resolve the material choices. Native SDK decisions and provider capabilities are prerequisites. No external account, credential, device, signing resource, provider configuration, or database was accessed.

## Unattempted runtime

Keychain and Keystore persistence, backup/restore, migration, wipe, corruption, account switching, background/termination recovery, revocation retry, and deletion partial-failure scenarios remain unattempted. All 24 native rows remain unattempted and no secure-persistence or lifecycle claim is allowed.
