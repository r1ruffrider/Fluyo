# Native-auth material-decision ledger v2

This directory installs the trusted v2 control plane for native-auth material decisions. It is a
two-stage, fail-closed ledger separate from the v1 phase-approval ledger. V1 files remain immutable.

## Bootstrap state

The canonical decision-value manifest is anchored to `main`
`6af78d83f6144cb7d89b01d7f1c748d2d3155637` and the merged decision brief. It contains the exact
14-ID recommended bundle: seven `OWNER_SELECTED_EVIDENCE_PENDING` values and seven
`DEFERRED_OPEN` values. The manifest is proposed input to a later selection record; it is not itself
an approval event or effective runtime state.

Marlon directly selected “Approve recommended bundle” in Codex on 2026-10-30 against the merged
decision brief. This bootstrap intentionally does not record that selection. After this trusted
control plane is merged, a separate pull request must append one atomic 14-ID selection record
against the frozen base through the base-controlled validator.

The deferred `AUTH-NONPROD-CUSTODY` value remains `null`; the selection does not infer a custodian.
All fallback, claim, evidence, and recheck obligations from the decision brief remain in force.

## Effective-state boundary

A selection or supersession produces `OWNER_SELECTED_EVIDENCE_PENDING`, never `ACCEPTED`.
Only a later `MATERIAL_DECISION_EVIDENCE_CLOSURE` record may move the latest selected value to
`ACCEPTED`. Runtime consumers may use only `ACCEPTED` values. Revocation fails closed to
`OPEN_REQUIRES_MARLON`; a revoked value never revives an older selection.

The manifest authorizes only credential-free repository work, credential-free dependency
evaluation, and the documented toolchain rebaseline. It does not authorize credentials, live
adapters, native runtime, product dependency selection or installation, production, signing,
store/release work, physical-device work, spend, publication, destructive/data actions, domains,
or external-account/dashboard changes. Live native-runtime evidence remains 0 of 24 attempted.

## Trust and rollout limits

The workflow uses `pull_request_target` only after this control plane is present on the base branch.
It checks candidate data with the exact base-controlled validator and read-only permissions. The
bootstrap pull request cannot protect itself with that new workflow, so its exact head still needs
the existing protected checks, specialist gates, and independent Elana review before merge. The
separate selection-record pull request is the first change validated by the base-controlled v2
workflow.

Evidence closure must retain the unchanged selected value, satisfy every exact requirement from the
frozen v1 decision policy through durable Git references, and carry exact-head PASS attestations for
architecture, security, infrastructure, protected CI, Elana, and each applicable UX, visual, claims,
records, or research domain. Arbitrary strings and incomplete gate sets cannot produce `ACCEPTED`.

Branch-protection configuration is an external repository action and is not authorized by this
bootstrap. It must be handled separately under the repository's external-action approval process.
