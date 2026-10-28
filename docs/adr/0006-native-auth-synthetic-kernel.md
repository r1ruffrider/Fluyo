# ADR 0006: Provider-neutral native auth synthetic kernel

Status: accepted for credential-free repository-only implementation

## Decision

iOS and Android contain equivalent pure auth reducers behind serialized coordinators. The kernel exposes a five-field, closed-enum snapshot and generation-bound one-shot presentation effects. It depends on six ports: provider, session vault, callback transaction store, injected monotonic clock/timers, owner data store, and structurally no-op telemetry. Port results are closed categories; private exceptions and provider values do not cross the boundary.

Every async operation atomically reserves the checked auth generation before any port call and revalidates the reservation after every suspension and before reducer, snapshot, effect, navigation, timer, or store mutation. Kotlin reservation owners release their reservation from `NonCancellable` `finally` cleanup; Swift uses matching `defer` release. Fencing installs a dedicated reservation before cancellation, keeps it across every cancellation and activation await, and rejects competitors until publication or the first cleanup mutation is safely reached. Cleanup advances the generation, cancels owned provider, callback-validation, API and timer handles, activates the monotonic shared compare-and-mutate generation, conditionally purges callback, header, vault, and owner state, confirms cleanup, and only then exposes signed-out or replacement-owner state. Failure at any cleanup step and generation overflow permanently latch the coordinator in `safe_terminal_error`.

The callback transaction store owns atomic validation, consumption, and wiping. Validation binds purpose, environment, ASCII host, exact path, state, optional nonce, verifier, and monotonic expiry and rejects noncanonical ingress. The public snapshot and presentation effects cannot carry raw link, identity, provider, session, or exception values.

The shared TSV corpus is an executable test-only contract. Every row supplies ordered typed commands, nondecreasing monotonic times, provider/API completions, every published snapshot in order, one aggregate presentation-effect record per semantic transition, ordered traces, wipe order, and rejected operations. The aggregate record uses only `heading`, `primary_action`, or `safe_destination` focus and the eight auth-state-bound announcement/copy IDs, including `session_ended` for invalidation, repeated-401, and explicit sign-out cleanup. Initialization owns and cancels its generation/state-bound 500 ms `initializing` timer. Native tests parse the same bytes, drive the real coordinator through scriptable ports, and compare each normalized result with the same row. CI accepts only the exact ordered 41 test identities and corpus digest after those semantic assertions pass. No corpus resource is packaged in an app, and no UI, provider SDK, HTTP request, persistence adapter, OS link registration, telemetry transport, or material decision is introduced.

## Consequences

This phase proves deterministic kernel behavior and source-level boundaries only. It provides no live authentication evidence. The fourteen material decisions, 69 readiness requirements, and 24 mirrored live rows retain their existing open or unattempted status. UI-only checks are classified `not_applicable_kernel_only` for this phase.
