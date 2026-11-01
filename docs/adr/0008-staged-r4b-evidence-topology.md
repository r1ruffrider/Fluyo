# ADR 0008: Staged R4-B evidence topology

- Status: accepted
- Accepted by: Marlon on 2026-11-01
- Acceptance reference: explicit Codex selection of the recommended staged R4-B topology and feasibility amendment; exact repository acceptance head is pending this records-only change
- Acceptance scope: authorizes staged non-production R4-B delivery and amends evidence packaging and review topology; it authorizes no tool installation, credential, external account, provider configuration, administrator action, spending, deployment, production, signing, store, publication, or public accessibility claim
- Date: 2026-11-01
- Decision owners: product, architecture, security, UX/accessibility, visual design, infrastructure, numerical/privacy audit, QA, and engineering
- Extends: [ADR 0007](0007-learning-experience-and-operational-boundaries.md)
- Plan: [Sprint 6 learning-experience build plan](../2026-10-31_sprint-6-learning-experience-build-plan_v1.md)

## Context

ADR 0007 and the accepted R4-A specification require R4-B to produce complete browser and assistive-technology evidence for 10,800 cells, 86,400 per-cell artifacts, and 49 transition records. The original topology also requires baseline approval commit `A` to be a trusted-main ancestor of source commit `S`, followed by capture run `R`, Elana review commit `E1`, and cleanup commit `E2`.

The first runtime cannot both remain unmerged until full R4-B evidence passes and already exist in trusted `main` for baseline approval. That creates a baseline-lineage cycle. The simulated monolithic raw-payload ceilings are also too small for real screenshots and structured evidence, and requiring manual inspection of every artifact plus every OCR result would require hundreds to thousands of reviewer hours without improving automated completeness.

The R4-B implementation work passed bounded development automation and several specialist review cycles, and those cycles found route, documentation, and zero-egress defects that were repaired. The final integrated exact head has not yet received fresh specialist or Elana clearance. Elana also correctly withheld the aggregate R4-B phase PASS because the required runtime matrix and NVDA evidence remained unexecuted. This ADR converts neither the historical specialist failures nor the aggregate R4-B FAIL into a PASS.

## Decision

Amend R4-B into three separately gated subphases while preserving the evidence cardinalities and Learning Core authority.

### R4-B1: Preparatory runtime, fixture, and harness

R4-B1 contains the web-only Conversation Canvas runtime, synthetic development fixture, zero-egress fixture behavior, production exclusion, and topology-neutral evidence identity/harness code. It may merge to trusted `main` only after the unchanged exact head passes the full repository checks and applicable architecture, security, UX/accessibility, infrastructure, numerical/privacy, and Elana code-scope gates.

R4-B1 does not execute or claim the browser/AT matrix. Its merge establishes trusted runtime and harness bytes only. It cannot support an accessibility, responsive-runtime, production-readiness, public-availability, deployment, native, or store claim and does not complete R4-B.

### R4-B2: Trusted-main baseline and descendant capture

After R4-B1 and its post-main checks pass, the approved Windows evidence lane captures a complete comparable baseline from trusted-main bytes. Daniela owns visual baseline approval; Camila owns UX/accessibility acceptance; Natalia owns privacy and zero-egress review; Renata owns reproducibility and provider provenance; Julieta owns counts and capacity reconciliation; Elana remains independent.

The baseline approval record is merged as trusted-main commit `A`. Candidate source commit `S` must descend from `A`. Capture run `R` executes the exact `S` and fixed workflow blob and must produce all 10,800 candidate cells, all 86,400 per-cell artifacts, and the separate 49 transition records. Missing, failed, stale, incomparable, or scan-rejected evidence is `UNATTEMPTED`, never PASS.

### R4-B3: Review, cleanup, and final PASS

`E1` is the direct child of `S` and changes only the Elana review record. Provider-issued reviewer attestation must bind the exact source, run, workflow, baseline, complete-results, transition, shard inventory, and artifact-set digests. `E2` is the direct child of `E1` and changes only the cleanup record. Provider cleanup evidence and an absence receipt must prove that the exact reviewed raw inventory is no longer resolvable while permitted sanitized durable evidence remains resolvable.

R4-B completes only when the full `A/S/R/E1/E2` chain resolves, every required automated and manual gate passes, raw cleanup is proven, all protected repository and provider checks pass, and Elana issues the final unchanged-head runtime/browser/AT PASS.

## Evidence packaging amendment

The 10,800-cell, eight-artifact-per-cell, 86,400-artifact, and 49-transition requirements remain unchanged. For real R4-B evidence, this ADR explicitly supersedes the R4-A `artifactResourceBudgets` values of 2 MiB PNG bytes, 1 MiB compressed IDAT bytes, 5 MiB decoded RGBA bytes, 64 KiB JSON bytes, and 32 KiB text bytes with 8 MiB, 8 MiB, 8 MiB, 256 KiB, and 128 KiB respectively. It also supersedes the earlier monolithic 32 MiB decoded-bundle, 64 MiB encoded-bundle, and 512 MiB aggregate raw-payload ceilings. The original R4-A values remain authoritative only for the closed simulated R4-A fixture and cannot reject or authorize real R4-B evidence.

Raw evidence is content-addressed and streamed in bounded shards:

- Each PNG is metadata-free sRGB, at most 8 MiB encoded and 8 MiB decoded pixel data. PNG shards close at 128 members, 512 MiB decoded payload, or 768 MiB canonical base64 JSONL, whichever occurs first.
- Each JSON artifact is at most 256 KiB. Each `announcements.txt` artifact is at most 128 KiB. Structured shards close at 1,024 members, 128 MiB raw payload, or 192 MiB canonical JSONL, whichever occurs first.
- Every shard is an internal, content-addressed file within one of the existing three authoritative provider targets. It binds ordered members, logical-member count, byte count, cumulative SHA-256, source/run identity, provider-target role, and canonical relative shard path. Validation is incremental and no complete run is buffered in memory.
- The resolved shard inventory must reconcile exactly 32,400 PNG and 54,000 structured logical members without gap, duplicate, extra, reorder, or substitution.
- A discarded representative preflight must project capture and scratch capacity. Immediately before capture, the base-controlled runner records canonical decimal-string `initialFreeBytes` and the closed literal `volumeRole: "ephemeral_evidence_volume"`. Using unsigned arbitrary-precision integer arithmetic, it derives `aggregateMaximumBytes = min(floor(initialFreeBytes × 3 / 5), initialFreeBytes − 68719476736)`. `capacityMeasurementDigest` is SHA-256 of exactly one canonical UTF-8 JSON object with keys in this closed order: `schema`, `sourceCommit`, `workflowDigest`, `runId`, `attempt`, `volumeRole`, `initialFreeBytes`, `aggregateMaximumBytes`. Every value is a JSON string; `schema` is the literal `fluyo:r4b:capacity:v1`; `sourceCommit` and `workflowDigest` are lowercase hexadecimal; `runId`, `attempt`, `initialFreeBytes`, and `aggregateMaximumBytes` are canonical unsigned decimal strings; and `volumeRole` is the closed literal above. Unknown fields, alternate key order, whitespace, escapes, numeric JSON values, leading zeroes, or noncanonical case are rejected. The manifest and provider attestation bind the exact eight preimage fields plus the digest. EvidenceResolver reconstructs the canonical bytes, recomputes the digest, and fails closed on any mismatch. All capacity fields are runner/resolver-derived and never caller-supplied. Capture fails closed when `initialFreeBytes ≤ 68719476736`, either subtraction or multiplication would be invalid, the derived maximum is not positive, or projected peak use exceeds the derived maximum. Same-volume continuity is verified only during the live run with a non-retained OS handle. No raw or hashed volume GUID, serial, device/install ID, mount path, file path, or filesystem identity is emitted or retained. While resolving evidence, the validator streams every file in the three provider targets and requires the cumulative persisted byte count—including indexes, shard envelopes, member payloads, and representative files—never to exceed `aggregateMaximumBytes`; overflow, missing bytes, or unsafe numeric coercion fails the run.

For real R4-B evidence, this ADR explicitly supersedes the R4-A `rawBundleEncoding` rule that made each primary target one canonical JSONL byte stream. The provider topology remains the closed three-target R4-A topology with logical member counts `[32400, 54000, 0]`, but each outer target is an immutable provider file collection. Its canonical UTF-8 `index.json` lists exactly the payload files in path order with provider-target role, canonical relative path, SHA-256, byte size, shard member count, and ordinal range; it never lists or hashes itself. The outer target file set is exactly `index.json` plus those listed payload files. Shard paths are `shards/<six-digit-ordinal>.jsonl`; no unlisted file, alternate path, duplicate ordinal, traversal segment, or metadata-derived member is accepted. The retained R4-A `artifactDigest` and `targetContentDigest` both equal the SHA-256 of the canonical `index.json` bytes. The retained `artifactByteSize` equals the index byte size plus the unsigned arbitrary-precision sum of every listed payload-file byte size; overflow, numeric coercion, or disagreement with the streamed provider bytes fails closed. The index transitively binds every payload byte through each entry's path, SHA-256, and byte size. Every listed file is streamed from the same immutable outer target, rehashed, resized, and reconciled before its members are decoded. The PNG target contains only `index.json` plus ordered PNG shard files; the structured target contains only `index.json` plus ordered structured shard files; the representative target contains `index.json` plus the closed representative files and retains its existing zero-primary-member semantics. The canonical ordered shard inventory binds every shard path, digest, byte size, member count, ordinal range, owning provider target, target-content digest, and outer artifact byte size. The same inventory digest is bound into the complete results, artifact-set digest, E1 provider attestation, E2 cleanup record, deletion operation, and absence receipt. Cleanup and absence verification operate on the same three outer provider target IDs; an internal shard never creates, replaces, or independently authorizes a provider target. A provider that cannot return an immutable exact file listing and stream each indexed file from the bound outer target is ineligible and R4-B2 cannot start.

## Review amendment

Automated validation remains exhaustive for every artifact and every local OCR result. It covers schema, semantics, identity, dimensions, hash, byte size, contrast, overflow, focus, announcements, reduced motion, forbidden payloads, OCR findings, and network isolation.

Manual review is exhaustive for all failures, warnings, non-zero diffs, scan findings, and all 49 transition records. Passing controls use a deterministic 360-cell set: one cell for each state × viewport × theme × locale combination, with the closed 30 fixture × zoom pairs rotating in canonical order so every pair appears exactly 12 times. This changes manual workload, not the evidence count or automated completeness. A missing manual review, required reviewer, or automated result prevents PASS.

## Security, privacy, and authority

- All evidence is synthetic-only. No real account, cookie, session, identity, answer, content, provider payload, credential, or production snapshot enters the harness or artifacts.
- Learning Core authority, authentication, authorization, entitlement, idempotency, and confirmed progress remain unchanged.
- Capture uses a dedicated Windows Chromium/NVDA profile with external egress denied and explicit loopback-only access. Browser interception is defense in depth, not the primary isolation proof.
- OCR is local and network-disabled. Raw OCR text is discarded after bounded forbidden-payload validation; only permitted digests and statuses may remain.
- Any source, fixture, font, tool, workflow, profile, baseline, or evidence byte change invalidates the affected comparison or exact-head evidence.

## Separate approvals

This ADR does not install or configure Chromium automation, NVDA, local OCR, Windows runners, protected provider environments, firewall rules, storage, or credentials. Those actions require separate explicit approval through secure mechanisms. Administrator/UAC actions must be narrowly scoped and reversible. Spending requires measured preflight evidence and separate approval.

## Consequences

- R4-B1 may merge without pretending the runtime evidence exists, breaking the baseline-lineage cycle honestly.
- R4-B2 and R4-B3 remain blocked until separately approved tools and provider controls exist.
- Evidence remains complete and deterministic, while packaging becomes streamable and manual review becomes feasible.
- The additional phases and provider records increase implementation and review time.
- No production, native, signing, store, deployment, spending, or public claim is cleared by this decision.

## Alternatives considered

1. **Keep one R4-B phase and merge nothing until final evidence.** Rejected because trusted-main baseline ancestry cannot be established for the first runtime.
2. **Self-baseline the candidate branch.** Rejected because it defeats independent trusted-main ancestry and comparable-baseline authority.
3. **Reduce the matrix or artifact counts.** Rejected; Marlon approved preserving 10,800 cells, 86,400 artifacts, and 49 transitions.
4. **Keep simulated monolithic payload ceilings.** Rejected because real evidence cannot fit them.
5. **Treat static tests as runtime or accessibility proof.** Rejected; R4-B2 capture and R4-B3 Elana PASS remain mandatory.

## Recheck triggers

Re-open this decision if evidence cardinalities change, manual review coverage changes, the `A/S/R/E1/E2` order changes, a provider or tool changes, source/profile/font/fixture identity changes, real data is proposed, zero-egress cannot be proven, storage preflight fails, or a public accessibility/runtime claim is drafted.
