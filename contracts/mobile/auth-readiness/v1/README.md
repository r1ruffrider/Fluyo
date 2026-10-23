# Native live-auth readiness decision packet v1

This credential-free repository packet records the material choices that must be approved before any native live-auth implementation begins. It is bound to merged main c6db1e3ded889eac5851eda7cc6d0891bf6d456a.

Every row remains PROPOSED or BLOCKED. A green pull request or CI run cannot accept a material decision. Acceptance uses a realizable three-commit chain: finalized reviewed packet/evidence `P`, approval-record commit `A` directly after `P`, and validation commit `V` directly after `A` with unchanged policy bytes. `A` records `reviewedPacketHead=P`, the exact approved row, a Git-resolvable approval artifact at `P`, and evidence references bound to `P`; `V` changes no policy bytes. The validator proves `V^=A` and `A^=P`, requires the policy at `V` to equal the policy at `A`, and requires every top-level policy field and every unrelated decision at `A` to equal `P`. Only `reviewedPacketHead` and the status/approval records of newly accepted rows may differ. Acceptance also requires a nonblank canonical approved value, an approver named by that row, a canonical ISO UTC approval time between the immutable first packet-commit timestamp and the exact recorded validation cutoff, a digest of the approved value, one `git:<P>:<repository-path>` approval reference, and one keyed `git:<P>:<repository-path>` reference for every required evidence item. The approval artifact and every evidence path must exist at `P`. The protected Test job checks out the exact validation head with three commits of history and supplies that head to the validator. The current reviewed-packet-head field is null because no row is accepted. Any later head, policy mutation, unrelated-row mutation, stale approval, fabricated approval reference, or child-only acceptance fails until fresh review and validation. Updating the reviewed packet head, either chronology bound, or the decision value requires fresh gates. The row's recheck conditions remain binding after acceptance.

The existing provider-neutral contract remains unchanged at ten public states, fifty transitions, and twenty-eight synthetic scenarios. Native runtime execution remains 0. The exact twelve-by-two iOS and Android matrix remains 0 passed, 0 failed, and 24 unattempted.

## Decision coverage

The packet covers exact iOS and Android SDK provenance; Android credential-logging remediation and a zero-message/zero-throwable Fluyo logger; enabled auth methods; local or global sign-out scope; callback domains; AASA; assetlinks.json; exact Supabase redirect prerequisites; Keychain and Keystore policies; non-production service and recovery custody; recovery delivery; provider revocation; and account-deletion orchestration.

Marlon remains accountable for material decisions. Adriana may implement only after approval. Isabella reviews product claims, Danila reviews UX and accessibility semantics, Fernanda reviews the auth-state privacy boundary, and Elana performs independent exact-head QA. Missing domain, account, security, delivery, signing, backend, privacy, support, and device custodians remain explicitly unassigned.

## Boundaries

No SDK is selected, approved, installed, or exercised. No callback domain, association file, Supabase dashboard value, Keychain or Keystore adapter, email delivery, provider revocation, account deletion, signing resource, production value, physical-device action, capture, store action, public claim, credential, account, or spend is created or changed.

Safe claim: This is a credential-free repository decision packet; all live-auth choices remain proposed or blocked. Runtime executions remain 0 and all 24 native evidence rows remain unattempted.

Forbidden claim: Increment 5, native authentication, PKCE, secure persistence, links, recovery, revocation, deletion, production, signing, store, or public availability is implemented, proven, supported, or complete.
