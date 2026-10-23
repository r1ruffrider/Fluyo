# Native live-auth readiness decision packet v1

This credential-free repository packet records the material choices that must be approved before any native live-auth implementation begins. It is bound to merged main c6db1e3ded889eac5851eda7cc6d0891bf6d456a.

Every row remains PROPOSED or BLOCKED. A green pull request or CI run cannot accept a material decision. Acceptance requires an exact approved value, an approver named by that row, a canonical ISO UTC approval time between the immutable first packet-commit timestamp and the exact recorded validation cutoff, a durable approval reference, a runner-supplied reviewed packet head distinct from the pre-packet main baseline, a matching evidence commit, a digest of the approved value, and one durable keyed reference for every required evidence item. The current reviewed-packet-head field is null because no row is accepted. Updating the reviewed packet head, either chronology bound, or the decision value requires fresh gates. The row's recheck conditions remain binding after acceptance.

The existing provider-neutral contract remains unchanged at ten public states, fifty transitions, and twenty-eight synthetic scenarios. Native runtime execution remains 0. The exact twelve-by-two iOS and Android matrix remains 0 passed, 0 failed, and 24 unattempted.

## Decision coverage

The packet covers exact iOS and Android SDK provenance; Android credential-logging remediation and a zero-message/zero-throwable Fluyo logger; enabled auth methods; local or global sign-out scope; callback domains; AASA; assetlinks.json; exact Supabase redirect prerequisites; Keychain and Keystore policies; non-production service and recovery custody; recovery delivery; provider revocation; and account-deletion orchestration.

Marlon remains accountable for material decisions. Adriana may implement only after approval. Isabella reviews product claims, Danila reviews UX and accessibility semantics, Fernanda reviews the auth-state privacy boundary, and Elana performs independent exact-head QA. Missing domain, account, security, delivery, signing, backend, privacy, support, and device custodians remain explicitly unassigned.

## Boundaries

No SDK is selected, approved, installed, or exercised. No callback domain, association file, Supabase dashboard value, Keychain or Keystore adapter, email delivery, provider revocation, account deletion, signing resource, production value, physical-device action, capture, store action, public claim, credential, account, or spend is created or changed.

Safe claim: This is a credential-free repository decision packet; all live-auth choices remain proposed or blocked. Runtime executions remain 0 and all 24 native evidence rows remain unattempted.

Forbidden claim: Increment 5, native authentication, PKCE, secure persistence, links, recovery, revocation, deletion, production, signing, store, or public availability is implemented, proven, supported, or complete.
