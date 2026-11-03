# R4-B2 discarded-preflight decision packet

Date: 2026-11-02\
Decision owner: Marlon\
Coordinator: Adriana Solano\
Status: **CHOICE A SELECTED — BOUNDED DISCARDED PREFLIGHT AUTHORIZED**

## Decision record

Marlon selected **A** in Codex on 2026-11-02. That exact selection authorizes only the bounded,
credential-free, no-cloud, synthetic-only discarded preflight described by this packet. It does not
broaden any exclusion in the Choice A authorization boundary below.

## Why a decision is required

R4-B1 is complete on merged `main` commit
`fea1f5fadb2307ca611379f30461a7ee47861fff`. Its five post-main workflows completed successfully
across 16/16 jobs. That closes only the R4-B1 runtime/harness phase. It does not create the trusted
R4-B2 baseline, run the full capture, establish runtime accessibility, authorize a provider, or
complete R4-B.

R4-B2 requires a separately authorized, discarded preflight before the team can responsibly ask for
provider, storage, privilege, or spending decisions. The preflight is a feasibility exercise only.
Every output is classified `NON_EVIDENCE`, must remain outside the accepted evidence chain, and is
discarded after reconciliation.

## Recommendation

Select **Choice A — bounded credential-free, no-cloud discarded preflight**. It resolves tool,
host, provenance, isolation, and capacity unknowns without creating an R4-B2 baseline or incurring
provider/storage spend. It preserves separate approval for every action with external, privileged,
destructive, production, or financial effect.

## Mutually exclusive choices

### Choice A — approve bounded discarded preflight (**Recommended**)

Authorize Adriana to coordinate a local, synthetic-only feasibility preflight using the pinned tool
records and gates below. The team may produce only `NON_EVIDENCE` tool-verification, host-capability,
isolation, smoke-run, and capacity-projection records. Any permitted acquisition must use the pinned
official source, be checksum/provenance verified before execution, remain isolated and reversible,
and avoid system-default or security-policy changes.

Consequence: the team can replace assumptions with measured local facts and return a smaller,
evidence-backed R4-B2 execution decision. R4-B2 capture, baseline approval commit `A`, provider use,
and all separately gated actions remain unauthorized.

### Choice B — defer the discarded preflight

Do not run or acquire anything. Preserve this packet and return only when Marlon requests the
decision again.

Consequence: no new risk or machine change occurs, but R4-B2 remains paused because tool,
reproducibility, isolation, and live capacity facts remain unresolved.

### Choice C — reject this preflight design and require a new plan

Do not run or acquire anything. Route the boundary back to Catalina, Natalia, Camila, Renata, and
Julieta for a replacement architecture and decision packet.

Consequence: the current preflight cannot proceed; R4-B2 remains paused and the next step is a new
records-only design review.

The decision was captured by Marlon's exact `A` response in Codex. Silence, commentary, a tool
download, or a prior R4-B1 approval would not have been a selection.

## Choice A authorization boundary

Choice A does **not** authorize any of the following:

- provider, cloud, account, credential, token, or external-account configuration;
- administrator, UAC, registry, system-PATH, default-browser, firewall, endpoint-policy, or network
  security mutation;
- storage provisioning or expansion, provider retention, purchase, subscription, or other spend;
- a full 10,800-cell, 86,400-artifact, or 49-transition capture;
- upload, publication, deployment, production access, signing, store action, or public claim;
- trusted baseline approval commit `A`, candidate source `S`, capture run `R`, Elana record `E1`,
  cleanup record `E2`, or any substitution for those records;
- provider cleanup, deletion of any pre-existing or user/provider data, or deletion offered as R4-B3
  proof.

Choice A does authorize deletion of bytes that this preflight itself creates inside one fresh,
exclusive, validated temporary/profile root, but only after the sanitized aggregate record is
verified. That bounded ephemeral deletion is required to make the selected preflight "discarded";
it is not an R4-B3 `E2` cleanup or absence receipt and cannot be credited as one.

If the bounded preflight encounters any excluded action, it must stop at that boundary and present a
new decision. Safe independent records work may continue.

## Researched tool pins

These are research pins, not installation claims:

| Tool               | Pin                                                                                                            | Acceptance boundary                                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome for Testing | `156.0.8078.80`                                                                                                | The installed host Chrome is not an accepted substitute. A preflight archive must resolve from the official Chrome for Testing source and be version/hash verified before use. It must not become the system default browser. |
| ChromeDriver       | revision `1706539`, paired with Chrome for Testing `156.0.8078.80`                                             | Version pairing and official provenance must resolve before execution. A mismatch is a fail-closed preflight result.                                                                                                          |
| NVDA               | stable `2026.3`; official installer SHA-256 `a8a87cb823da0c62cfbae4a444ae5ae238d54dc82ad6d46d3fdb3fef082799b2` | The package must come from NV Access and match the official release hash before execution. Installation or launch that requires privilege or system mutation is outside Choice A.                                             |
| Tesseract          | source `5.5.4`; `tessdata_fast` `4.1.0`                                                                        | OCR acquisition remains conditional on a reproducible-build and no-`curl` provenance plan. Until that plan passes, OCR is unavailable rather than silently substituted.                                                       |

Primary pin references:

- Chrome for Testing version/revision research is recorded for this decision boundary; exact archive
  digest resolution remains a pre-execution gate.
- NV Access release announcement: <https://www.nvaccess.org/post/nvda-2026-3/>
- Tesseract source releases: <https://github.com/tesseract-ocr/tesseract/releases>
- `tessdata_fast` releases: <https://github.com/tesseract-ocr/tessdata_fast/releases>

## Current host facts

- Chrome is installed, but its installed bytes are not the accepted Chrome for Testing pin.
- NVDA is absent.
- Tesseract is absent.
- Free-space snapshots on drive `C:` are time-sensitive observations and cannot be reused as capture
  capacity evidence.
- Windows `LongPathsEnabled` is `0`. Choice A does not authorize changing it.

These facts describe the current host only. They are not tool clearance, capacity approval, or
runtime/accessibility evidence.

## Julieta capacity and count reconciliation

The closed R4-B cardinalities remain 10,800 cells, eight artifacts per cell, 86,400 per-cell
artifacts, and 49 separate transition records.

For the 32,400 PNG members, an individual 8 MiB encoded file expands to at most 11,184,812 base64
bytes using `4 × ceil(8,388,608 / 3)`. Summed independently per file, that upper bound is:

`32,400 × 11,184,812 = 362,387,908,800` base64 bytes.

This number is **not** a full-capture capacity estimate. It excludes JSONL syntax and line
delimiters, shard envelopes, indexes, the 54,000 structured members, representative files,
transition records, temporary browser/AT/OCR output, visual-diff scratch space, filesystem
allocation effects, provider overhead, and concurrency peaks. A current `C:` free-space reading is
also not a durable capacity claim. Choice A may measure and project; it may not authorize full
capture, storage expansion, or spend.

## Catalina architecture boundary

Every preflight output must be unambiguously classified `NON_EVIDENCE`. The only permitted record
classes are tool-pin/provenance, host capability, isolation, bounded smoke-run, and capacity
projection. They may describe what was attempted and observed, including failure, but they may not:

- use or impersonate accepted R4-B provider, baseline, capture, review, or cleanup schemas;
- enter the three authoritative provider targets or the `A/S/R/E1/E2` lineage;
- count toward 10,800 cells, 86,400 artifacts, 49 transitions, automated completeness, manual
  controls, or Elana's final verdict;
- be promoted, renamed, copied, or reinterpreted as capture evidence;
- make an accessibility, responsive-runtime, production-readiness, deployment, or public claim.

Discarding a preflight record proves only that the non-evidence record was discarded. It is not the
R4-B3 cleanup or absence receipt.

## Natalia security gates

Choice A must fail closed unless all applicable controls hold:

- official HTTPS source and pinned version are resolved before acquisition;
- expected digest and provenance are recorded before any downloaded executable is launched;
- no secret, cookie, account, credential, session, real learner content, or production payload is
  supplied;
- all fixture content is synthetic, and browser/AT/OCR profiles are isolated and disposable;
- the evaluated application is loopback-only; unexpected external egress is a failure;
- the browser pin, driver pair, NVDA hash, OCR provenance, and source/workflow identity match exactly;
- unexpected privilege, UAC, firewall, registry, system-PATH, provider, upload, or spend requests
  stop the preflight;
- logs and retained records exclude raw OCR text, filesystem identity, volume GUID/serial, device or
  install identifiers, credentials, and forbidden payloads.

## Camila UX/accessibility preflight criteria

The bounded preflight may establish feasibility only. It should determine whether the pinned browser
and driver can launch an isolated loopback fixture, whether keyboard focus and state transitions can
be observed without egress, whether the pinned NVDA package can be provenance-verified and—only
within the approved non-privileged boundary—used with the fixture, and whether the proposed capture
path can preserve viewport, zoom, theme, locale, reduced-motion, focus, and announcement identity.

A missing tool, unavailable non-privileged execution path, unobservable focus/announcement state,
unexpected egress, or unverifiable pin is a preflight finding, not a waived test. Choice A does not
authorize the complete matrix, assistive-technology PASS, baseline approval, or product claim.

## Daniela visual/repeatability preflight criteria

The minimum deterministic visual sample is 30 synthetic cells: each of the closed 15 fixtures at
both exact Chromium browser zoom values, 100% and 200%. State, viewport, theme, and locale rotation
must preserve complete coverage of all closed values. Each cell runs both motion preferences from
two independent clean profiles, yielding 120 transient screenshot observations. Camila's additional
focus, announcement, one-factor, risk-intersection, and eight transition-family checks are additive;
the 30-cell visual sample does not replace them.

Each cell must instantiate all eight class-shaped outputs only beneath the discarded preflight
namespace. Clean repetitions require identical normalized PNG hashes and exactly zero changed
pixels. No fuzzy visual threshold, ignored region, manual waiver, evidence locator, or final-evidence
credit is permitted. All raw screenshots, OCR text, traces, profiles, and class-shaped outputs are
deleted after sanitized aggregate measurements are retained.

## Separate later decisions

After Choice A completes, Adriana must return measured results and present separate decisions for any
provider/account/credential action, storage provisioning or spend, administrator/UAC action,
firewall or endpoint-policy mutation, full capture, upload, production action, or cleanup. No later
decision is implied by selecting Choice A.
