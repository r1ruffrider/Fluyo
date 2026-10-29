# Native Auth Decision Brief — 2026-10-29

## Purpose and authority boundary

This brief turns the current native-auth research into a reviewable decision checklist for Marlon. It does **not** accept a decision, authorize a dependency, enable a runtime, change a provider dashboard, or approve an external action.

The authoritative baseline is `main` commit `fa3d8500bc1d8763cd828e837d9261a6e8d85561`. Decision status and acceptance requirements remain controlled by:

- `contracts/mobile/auth-readiness/v1/decision-policy.json`
- `contracts/mobile/auth-readiness/v1/evidence/index.json`
- `contracts/mobile/auth-readiness/v1/README.md`
- `docs/DEVELOPMENT_HANDOFF.md`
- `docs/ROADMAP.md`

If this brief conflicts with those files, those files win. A decision becomes accepted only through the repository's approval-history process with the complete dated, content-addressed evidence required by the policy.

## Current verified boundary

- Live native-auth implementation authorization: **false**.
- Native runtime evidence: **0 conducted, 0 passed, 0 failed, 24 unattempted**.
- Material decisions: **14 total — 5 `PROPOSED`, 9 `BLOCKED`, 0 accepted**.
- Current deliverable: a credential-free, provider-neutral, repository-only synthetic kernel.
- No native SDK, secure persistence adapter, verified link, provider redirect entry, recovery delivery, revocation behavior, or account-deletion flow is approved, configured, or verified.
- No production, signing, store, spending, credential, destructive, or external-account action is authorized by this brief.

## Recommended decision package

Every recommendation below is **proposal-only and unapproved**.

### 1. `AUTH-METHODS` — `PROPOSED`

**Recommendation:** enable only email/password sign-up, email confirmation, email/password sign-in, and password recovery for the non-production phase. Explicitly exclude social OAuth, phone/OTP, passkeys, and magic-link sign-in.

**Why:** this is the smallest coherent method set that proves account creation, confirmation, sign-in, and recovery without multiplying provider, platform, callback, and support surfaces. Unsupported methods should have no control, route, placeholder, provider logo, or accessibility node.

**Conditions:** recovery and confirmation controls remain absent until their delivery and callback gates are accepted and operational. Provider session creation alone cannot grant access; the private `/api/v1/auth/me` ownership check remains authoritative.

### 2. `AUTH-NONPROD-CUSTODY` — `BLOCKED`

**Recommendation:** name Marlon as primary human custodian and name a separate backup custodian for the non-production provider project, delivery configuration, incident response, and rotation handoff.

**Why:** a named primary and backup prevent a single-person recovery failure while keeping access accountable.

**Conditions:** individual identities, MFA, least privilege, documented recovery and rotation, and no shared credentials in Git, issues, PRs, logs, screenshots, or chat. Naming custodians does not itself authorize a dashboard change or credential transfer.

### 3. `AUTH-SDK-IOS` — `BLOCKED`

**Recommendation:** upgrade the minimum iOS CI/toolchain lane from Xcode 16.2 to Xcode 16.3 or newer, rebaseline it, and then evaluate exact `supabase-swift` version `2.55.5` and its resolved graph. Do not select an older SDK only to preserve Xcode 16.2.

**Tradeoff:** upgrading the lane adds toolchain validation work, but retaining Xcode 16.2 would require an older SDK with additional currentness and security risk. Until the lane upgrade and exact dependency review pass, keep the live iOS adapter absent.

**Required proof before acceptance:** source and checksum, license and advisory review, iOS floor and full dependency graph, disabled/nil SDK logging, and credential/callback canary scans.

### 4. `AUTH-SDK-ANDROID` — `BLOCKED`

**Recommendation:** do not select stable `auth-kt` `3.8.0` because the research review found credential/token logging paths. Prefer waiting for an eligible stable release containing the fix.

**Alternative requiring an explicit risk choice:** allow `3.9.0-beta-1` only for a bounded non-production evaluation after explicit prerelease acceptance, exact graph/provenance review, and proof that Fluyo retains no SDK message or throwable.

**Tradeoff:** waiting protects the stable-only posture but delays the Android live adapter. A beta can unblock evaluation sooner but increases compatibility, support, and supply-chain uncertainty. Until one option is accepted and proven, keep the live Android adapter absent.

### 5. `AUTH-SIGNOUT-SCOPE` — `PROPOSED`

**Recommendation:** guarantee local-device cleanup only. Attempt remote revocation only as a separately proven, best-effort capability.

**Required user-facing boundary:** “This signs out this device only. Other sessions may remain active.” Secondary detail may state that an already-issued access token can remain valid until expiry.

**Why:** local cleanup is under the client's control; immediate global revocation and issued-JWT invalidation are not yet proven. Cleanup failure must block signed-out or replacement-owner UI and must never be reported as success.

### 6. `AUTH-STORAGE-IOS` — `PROPOSED`

**Recommendation:** use Keychain with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, no sync, no backup/restore migration, a versioned fail-closed envelope, and ordered wipe before account switch or signed-out success.

**Tradeoff:** device-only accessibility sacrifices migration convenience in exchange for a tighter non-production secret boundary. Corruption, incompatible version, or incomplete cleanup should fail closed rather than silently restore or expose prior-owner data.

### 7. `AUTH-STORAGE-ANDROID` — `PROPOSED`

**Recommendation:** use a per-install Android Keystore AES-256-GCM key, unique 96-bit IVs, no backup, a versioned fail-closed envelope, and ordered wipe. Prefer hardware-backed protection when available without claiming it is universal.

**Tradeoff:** the design supports a broad device range while avoiding a false universal hardware-backed claim. Corruption, migration failure, or cleanup failure must fail closed.

## Remaining decisions and recommended order

| Decision                  | Current status | Recommendation / next evidence                                                                                                                                                                                                              |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH-CALLBACK-DOMAINS`   | `BLOCKED`      | Name the controlled development and staging HTTPS hosts, exact confirmation and recovery routes, TLS evidence, and domain custodian. Do not use a production host.                                                                          |
| `AUTH-AASA`               | `BLOCKED`      | After callback domains and the Apple application identity are fixed, review exact AASA bytes/checksum, hosting owner, app binding, retrieval, and negative-route tests. No Universal Link registration before then.                         |
| `AUTH-ASSETLINKS`         | `BLOCKED`      | After callback domains and Android package/certificate identities are fixed, review exact assetlinks bytes/checksum, hosting owner, binding, retrieval, and negative-route tests. No App Link registration before then.                     |
| `AUTH-SUPABASE-ALLOWLIST` | `BLOCKED`      | Derive an exact non-production redirect list only after the callback decisions are accepted. Any dashboard change remains a separately authorized external-account action.                                                                  |
| `AUTH-RECOVERY-DELIVERY`  | `BLOCKED`      | Name a delivery custodian and approve sender/template, expiry, throttling, enumeration-safe response, support, and failure behavior. Keep recovery absent until the capability is operational and tested.                                   |
| `AUTH-REVOCATION`         | `PROPOSED`     | Keep remote revocation optional/best-effort until the exact provider capability, retry/failure contract, runtime proof, and issued-JWT limitation are accepted. Never block local cleanup on remote success.                                |
| `AUTH-ACCOUNT-DELETION`   | `BLOCKED`      | Defer the client flow until a server-owned API, owner, idempotent orchestration, recent reauthentication, irreversible confirmation, audit behavior, and partial-failure recovery are approved. This remains a destructive-action boundary. |

Callback decisions should be accepted in this order: domains and exact routes, application identities, AASA/assetlinks artifacts, then the non-production provider allowlist. This avoids approving redirect entries before the owned platform bindings exist.

## Proposed implementation sequence after acceptance

1. Record each approved value through the existing content-addressed approval-history process.
2. Add provider-neutral live contracts, capability gates, method-specific private substates, and fakes.
3. Add purpose-bound confirmation/recovery callback routing and the durable cleanup barrier.
4. Rebaseline the iOS toolchain if the iOS recommendation is accepted.
5. Lock exact eligible dependency graphs, checksums, licenses, advisories, and verification metadata.
6. Implement Keychain and Keystore storage adapters and their corruption, migration, backup, wipe, restart, and account-switch tests.
7. Implement callback transaction stores and platform link adapters.
8. Implement SDK facades with logging disabled and canary scans.
9. Implement first-party owner verification independently of the provider SDK.
10. Implement only the accepted method UI, copy, accessibility behavior, loading bounds, cancellation, and reduced-motion behavior.
11. Execute the 24 mirrored live non-production lifecycle rows plus security, accessibility, storage, callback, logging, and failure-path suites.
12. Require Elana's counted exact-head PASS and all protected platform/repository checks before merge.

## Explicit decision checklist for Marlon

The following list is a decision request, not a record of approval. Approval should state the exact accepted value and decision IDs.

1. **Methods:** approve or revise the proposed email/password sign-up, confirmation, sign-in, and recovery set; confirm the explicit exclusions.
2. **Custody:** name the primary and backup non-production custodians and accept the MFA, least-privilege, recovery, rotation, and incident-handoff requirements.
3. **iOS SDK/toolchain:** approve upgrading the minimum lane to Xcode 16.3+ for an exact `supabase-swift` `2.55.5` evaluation, or reject/defer it.
4. **Android SDK:** choose “wait for an eligible stable fixed release” or explicitly accept a bounded `3.9.0-beta-1` non-production evaluation risk.
5. **Sign-out:** approve local-device cleanup as the only guarantee and remote revocation as separately proven best effort.
6. **iOS storage:** approve or revise the proposed device-only Keychain policy.
7. **Android storage:** approve or revise the proposed per-install AES-256-GCM/Keystore policy.
8. **Callbacks:** provide or defer the owned non-production hosts, exact confirmation/recovery routes, and named domain custodian.
9. **Platform link ownership:** identify the Apple identity/hosting owner and Android package/certificate/hosting owner, or defer both link integrations.
10. **Provider allowlist:** authorize only the decision value; any actual dashboard change still requires its separately authorized external action and evidence.
11. **Recovery delivery:** name the custodian and approve or defer sender, template, expiry, throttling, support, and enumeration-safe behavior.
12. **Revocation:** approve or revise the best-effort remote-revocation boundary and issued-JWT wording.
13. **Account deletion:** defer it, or provide the approved server API/owner and separately authorize the destructive workflow design.

Marlon may accept decisions separately. Unaccepted decisions retain their existing `PROPOSED` or `BLOCKED` status and fallback behavior.

## Claims and UI boundary while decisions remain open

- Do not render functional native auth entry controls before `AUTH-METHODS` and its prerequisite runtime gates are accepted.
- Do not claim native auth is implemented, available, secure, complete, persisted, globally revoked, store-ready, or production-ready.
- Keep unsupported methods absent rather than disabled or labeled “coming soon.”
- Confirmation and recovery responses must not echo an email or disclose whether an account exists.
- Authenticated-success copy requires private owner verification, not a successful SDK response or redirect.
- Preferred verified-session copy: “Your account is verified for this session.”
- Preferred local sign-out disclosure: “This signs out this device only. Other sessions may remain active.”
- Keep the persistent “internal non-production build” boundary visible when a live auth surface eventually becomes eligible.

## Handoff ownership after decisions

- **Adriana:** orchestrates accepted decision records, specialist gates, and merge progression.
- **Bianca:** maintains the decision/action record and prevents proposed values from being presented as accepted.
- **Catalina:** owns provider-neutral architecture, callback purpose separation, capability gates, and cleanup-barrier contracts.
- **Valentina:** implements only accepted contracts, adapters, and UI.
- **Renata:** owns toolchain/dependency provenance, CI, and reproducibility.
- **Natalia:** approves storage, callback, logging, custody, cleanup, and revocation security boundaries.
- **Camila and Daniela:** own the accessible phone-first flow, platform behavior, copy presentation, motion, and visual evidence.
- **Isabella:** clears claims and user-facing copy only after the matching runtime evidence exists.
- **Elana:** performs the independent counted exact-head code review and phase audit.

This brief can be superseded only by later repository evidence and accepted decision records. It must not be treated as an approval artifact.
