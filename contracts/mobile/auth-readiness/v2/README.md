# Native-auth material-decision ledger v2

This directory installs the trusted v2 control plane for native-auth material decisions. It is a
two-stage, fail-closed ledger separate from the v1 phase-approval ledger. V1 files remain immutable.

## Recorded selection state

The canonical decision-value manifest is anchored to `main`
`6af78d83f6144cb7d89b01d7f1c748d2d3155637` and the merged decision brief. It contains the exact
14-ID recommended bundle. Sequence 2 records Marlon's exact “Approve recommended bundle” choice
against the merged PR-A base `80563fee339a07bd2ab9706b8186ed772a3b9a1a`: seven values fold to
`OWNER_SELECTED_EVIDENCE_PENDING`, seven remain `DEFERRED_OPEN`, and zero are `ACCEPTED`.

Marlon directly selected “Approve recommended bundle” in Codex on 2026-10-30 against the merged
decision brief. The append records only that known date and source statement; its UTC timestamp is
the repository recording time, not an invented human approval time. Selection remains evidence
pending and cannot be consumed by runtime.

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
or external-account/dashboard changes. Live native-runtime executions remain 0; all 24 native
scenarios remain unattempted.

Every selected value, including a future superseding manifest, must match its decision-specific
closed shape. Recursive validation rejects forbidden capability enablement, secret-bearing fields,
and secret-like values even when the manifest's top-level boundaries remain false.

## Trust and rollout limits

The workflow uses `pull_request_target` now that this control plane is present on the base branch.
It checks candidate data with the exact base-controlled validator and read-only permissions. This
selection-record pull request is the first change validated by the base-controlled v2 workflow.
The workflow passing is necessary but is not equivalent to configuring it as a required protected
check.

Evidence closure must retain the unchanged selected value, satisfy every exact requirement from the
frozen v1 decision policy through durable Git references, and carry exact-head PASS attestations for
architecture, security, infrastructure, protected CI, Elana, and each applicable UX, visual, claims,
records, or research domain. Each attestation has a closed `reviewer` field that must match the
trusted gate-to-reviewer map; Elana Castillo is the only accepted reviewer for `ELANA_EXACT_HEAD`.
`AUTH-REVOCATION` specifically requires Camila's UX/accessibility, Daniela's visual/mobile/motion,
and Isabella's claims gates in addition to the fixed gates. Arbitrary strings, wrong reviewers, and
incomplete gate sets cannot produce `ACCEPTED`. Review ordinals are unique, gap-free, and fixed by
the required gate order; Elana's ordinal must be greatest and final.

Branch-protection configuration is an external repository action and is not authorized by this
append. Until the `Auth material decisions` check is separately configured and verified as required,
the recorded selection must not be described as authoritative repository governance or used to
unlock runtime. It must be handled separately under the repository's external-action approval
process.
The validator's append fixtures exercise the full frozen-subject `T` to ledger append `L` path and
the equivalent squash head, and reject stale concurrent bases, historical index-prefix edits, and
unindexed content-addressed records. Every appended record's frozen subject commit must already be
an ancestor of the exact pull-request base, so a candidate-created subject cannot disappear during
squash merge.
