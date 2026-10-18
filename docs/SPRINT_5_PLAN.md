# Sprint 5 Plan — Native Mobile Foundations

Status: accepted implementation plan; material prerequisites remain gated
Architecture: [ADR 0004](adr/0004-native-mobile-app-architecture.md) (accepted 2026-10-17)
Release program: [Mobile release plan](MOBILE_RELEASE_PLAN.md)

## Phase brief

Establish installable, authenticated SwiftUI and Jetpack Compose foundations that use Fluyo's existing server-owned identity, data, and entitlement boundaries, with reviewable internal-build evidence and no production release activity.

## Scope and boundaries

Sprint 5 covers native project foundations, environment-safe configuration, authentication, secure session storage, deep links, generated or validated API clients, shared design and localization inputs, accessibility, privacy-bounded telemetry, remote feature flags, and reproducible internal builds.

Sprint 5 does not implement the Sprint 6 learning MVP, RevenueCat commerce, AI conversation or interpreter features, production billing, production deployment, store submission, paid account enrollment, advertising, or public launch. Native clients must not contain privileged Supabase, Stripe, RevenueCat, or AI-provider credentials. The NestJS API, PostgreSQL ownership model, and normalized server-side entitlements remain authoritative.

## Evidence and public-claim boundary

Native claims advance through a fixed evidence ladder: concept, implemented locally, counted phase-audit PASS, installable internal-build proof, then separately approved public availability. Screens remain labeled concept or in development until their exact build passes audit. During Sprint 5, honest native proof is limited to the audited application shell, secure authentication and recovery, environment handling, accessibility and reduced-motion behavior, localization, failure recovery, feature controls, telemetry, and internal artifacts.

Do not claim iOS or Android availability, native lessons, cross-device or synchronized learning, offline lesson completion, audio, reminder delivery, AI or interpreter behavior, native purchases, TestFlight or Play availability, downloads, or store release during this sprint. Any product capture uses a synthetic non-production account and excludes email, billing data, tokens, correlation or internal identifiers, provider payloads, and logs. App-store badges, download links, tester calls to action, and campaign deep links require a real approved destination, consent flow, attribution contract, and separately authorized release step.

Sprint 5 is a market-preparation lane for the traveler beachhead, not an acquisition or launch phase. Permitted preparation includes consented tester recruitment, a claims inventory, store-account readiness, ASO research, a localization glossary, screenshot storyboards, and privacy-metadata drafting. Before marketing uses a product claim, a release-by-release claim matrix must identify the exact environment/build and be signed by product, engineering, and marketing. README and pricing copy must also be reconciled with the audited product state so stale or broad promises are not used as evidence.

## Decisions and prerequisites

Active evidence register: [SPRINT_5_DECISION_REGISTER.md](SPRINT_5_DECISION_REGISTER.md). A proposed row is not an approved decision, and no dependent increment may infer approval from ADR acceptance.

The following record must be complete before an increment that depends on it can merge:

| Decision or prerequisite                | Proposed baseline                                                                                                    | Required evidence and owner                                                                                         | Blocks                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Supported OS versions and device matrix | Product-supported iPhone and Android phone baselines, plus the tablet behavior promised by each store listing        | Product approval; engineering records exact OS/API versions and representative devices                              | Native project deployment targets and release CI    |
| Application identifiers                 | `com.fluyo.app` for production, with distinct development and staging identifiers                                    | Product/legal confirms the final namespace; account owner verifies availability before reservation                  | Signing, verified links, store records              |
| Apple and Google organization accounts  | Role-based organization ownership; no personal credential sharing                                                    | Account owner records access, legal-entity, agreement, tax, banking, and verification status outside the repository | Store registration, signing, TestFlight/Play tracks |
| Signing and CI hosts                    | Protected CI credentials with a macOS executor for iOS and pinned Android/JDK tooling                                | Engineering and security document owners, rotation, environment protection, artifact retention, and provenance      | Signed internal builds                              |
| Link domains and callback routes        | Environment-specific HTTPS universal/App Links using Supabase PKCE                                                   | Backend/security verifies redirect allowlists, association files, ownership, and negative cases                     | Authentication and account recovery                 |
| Privacy and support ownership           | Named owner for privacy inventory, account deletion, support URL, privacy URL, terms, age rating, and target markets | Product/privacy records the accountable owner and approved URLs before store-facing use                             | Permission prompts and store readiness              |
| Platform and experience ownership       | Named iOS, Android, UX/accessibility, localization, privacy/telemetry, and test owners                               | Product and engineering record accountable owners, initial locales, orientation policy, and physical test devices   | Platform scaffolds and final phase audit            |

Repository documentation may record status and non-secret identifiers. Passwords, signing material, API secrets, tax/banking data, and private account details remain in approved external systems.

## Increment sequence

Each increment is a small pull request. It must preserve the repository's eight required checks and add platform-specific checks when the corresponding project exists.

### 1. Decision register and contract inventory

- Record the approved OS/device baseline, application identifiers, account owners, CI-host availability, link domains, privacy owner, support/legal URL owners, and open external dependencies.
- Inventory the existing `/api/v1` authentication, profile, dashboard, catalog, attempt, settings, and billing-status contracts needed by mobile foundations. Record the learning export/deletion capability separately as internal `LearningDataLifecycleService` hooks with no HTTP endpoint.
- Define the missing authenticated account-lifecycle orchestration and public API, including reauthentication, export delivery, deletion confirmation, billing/store guidance, idempotency, auditability, and safe recovery. Treat it as an explicit dependency for later mobile settings and store-readiness work; do not generate client fixtures for an endpoint until its contract and implementation are independently approved.
- Define compatibility and error-envelope rules without copying provider payloads or answer/validation internals into public contracts.

Exit gate: every later increment has an owner, dependency, testable acceptance criteria, and an explicit block when its prerequisite is unresolved. Existing HTTP contracts and internal-only hooks are labeled accurately, and the missing account-lifecycle orchestration/API remains visible as a blocker for dependent mobile/store work. Any external account creation, purchase, identifier reservation, or production-system change retains its separate approval gate.

### 2. Versioned mobile contract and fixture baseline

- Commit provider-neutral schemas or generated-client inputs for the mobile-facing API surface.
- Commit sanitized success, empty, unauthorized, forbidden, validation, rate-limit, conflict, and server-failure fixtures.
- Add compatibility tests that detect breaking contract changes and secret/provider-field disclosure.
- Define correlation-ID and retry behavior; retries must preserve idempotency keys and must not retry unsafe writes blindly.

Exit gate: fixtures validate against the server contracts, negative envelopes remain safe, and no private answer, provider, owner, or credential field is exposed.

Implementation artifact: [`contracts/mobile/v1`](../contracts/mobile/v1/README.md) versions the exact
implemented route inventory and deterministic synthetic fixtures. Learning operations carry a Sprint 6 stage
marker and are not presented in the Sprint 5 native shell. The implementation head
`a697d6bd1576ca59fd0d6f6cb5897d7d676f90b0` passed Isabella, Fernanda, Danila, and Elana's counted gates.
PR #36 merged as `b6a3243981f74b3c3436862ba3c84472ba77d7a0`, and post-merge `main` run `39103456847`
passed all eight required jobs.

### 3. iOS foundation

Readiness artifact: [`contracts/mobile/ios/foundation/v1`](../contracts/mobile/ios/foundation/v1/README.md)
defines configuration, privacy, no-op telemetry, capture, asset-provenance, and evidence rules. PR #38 merged
as `4dc05e81b3fae101077025f4ccb28f82bf48e72d` and post-main run `39166750258` passed all eight required jobs.
Marlon then accepted the recorded iOS 17, iPhone-native, portrait-primary/functional-landscape, English UI,
Spanish-learning, pseudo/RTL, proposed-unreserved identifier, interim ownership, and free public macOS 26 /
Xcode 26.6 unsigned-simulator baselines. The policy now authorizes the smallest repository scaffold while
keeping `completionClaimAllowed` false until exact-head Mac, simulator, accessibility, artifact, roster, and
Elana evidence passes. Apple accounts, identifier reservation, signing, production endpoints, physical-device
claims, TestFlight/App Store work, and spending remain separately gated.

- Add a SwiftUI workspace with unit and UI test targets and Debug, Staging, and Release configurations.
- Load only non-secret endpoints and public client configuration through checked templates and protected CI values.
- Establish dependency injection, structured concurrency boundaries, network reachability, localization, design-token ingestion, Dynamic Type through at least 200%, VoiceOver semantics, 44-by-44-point minimum targets, reduced motion, and a privacy-manifest baseline.
- Add repository-owned vector artwork, app-icon, and static launch assets with recorded provenance, phone-safe crops, no baked-in text, correct decorative/meaningful semantics, and only short interruptible native transitions with static reduced-motion equivalents.
- Add deterministic sandbox/demo configuration. Production endpoints remain inert until their release gate.

Exit gate: the project builds and its automated tests pass on a documented supported macOS/Xcode toolchain; an unsigned simulator artifact contains no secret and renders loading, signed-out, error, and reduced-motion states accessibly.

### 4. Android foundation

- Add a Kotlin/Jetpack Compose project with unit and instrumentation test targets and development, staging, and production flavors.
- Pin Gradle, Android, Kotlin, Compose, and JDK versions; use only non-secret endpoints and public client configuration.
- Establish dependency injection, coroutines/Flow boundaries, connectivity state, localization, design-token ingestion, font scaling through at least 200%, TalkBack semantics, 48-by-48-dp minimum targets, reduced animation, and baseline-profile structure.
- Add repository-owned vector artwork, app-icon, and static launch assets with recorded provenance, phone-safe crops, no baked-in text, correct decorative/meaningful semantics, and only short interruptible native transitions with static reduced-motion equivalents.
- Add deterministic sandbox/demo configuration. Production endpoints remain inert until their release gate.

Exit gate: the project builds and its automated tests pass on the documented toolchain; an emulator artifact contains no secret and renders loading, signed-out, error, and reduced-motion states accessibly.

### 5. Supabase PKCE and secure session lifecycle

- Implement browser-mediated Supabase PKCE with environment-specific universal links/App Links.
- Store refresh material only in Keychain or Keystore-backed encrypted storage; never log tokens, authorization codes, full email addresses, or provider errors.
- Cover sign-up handoff, confirmation, sign-in, recovery, sign-out, token refresh, expiry, revocation, deep-link replay, malformed links, account switching, offline startup, and clock skew.
- Validate tokens only at the existing API boundary and keep authorization decisions server-side.

Exit gate: both clients authenticate against non-production services, restore and revoke sessions correctly, reject invalid/replayed callbacks, and pass owner-isolation and log-redaction checks.

### 6. API client, application shell, and state boundaries

- Add typed API clients with bounded timeouts, cancellation, correlation IDs, safe error mapping, and idempotency-key support.
- Add an authenticated internal-foundation shell with deterministic initialization; signed-out and privacy-safe signed-in identity; non-production environment/build marker; connectivity and safe API-health state; sign-out; loading, offline, partial-failure, total-failure, unauthorized, forbidden, and retry states; and no indefinite spinner. It must not imitate a dashboard, lesson, deck, progress, streak, audio, notification, microphone, camera, billing, or AI control from later sprints.
- Read normalized entitlement status for display and routing while leaving all grants and feature authorization on the server.
- Prove that account switching clears owner-scoped caches and that stale responses cannot overwrite the active owner's state.

Exit gate: contract tests and adversarial owner/session tests pass on both clients; failure states remain actionable and do not claim that access or progress changed before the server confirms it.

### 7. Shared experience foundations

- Generate platform-native design constants from a reviewed neutral token source while preserving native controls and accessibility behavior.
- Add English source strings, Spanish-learning content separation, pseudolocalization, right-to-left layout probes, truncation checks, and locale-safe date/number formatting.
- Define motion as optional feedback, honor system reduced-motion settings, and avoid motion-dependent meaning.
- Add privacy-bounded telemetry names and outcomes, remote feature flags, and server-controlled kill switches for later AI, interpreter, billing-offer, and notification work. The initial taxonomy covers bounded outcomes for shell load, authentication, deep-link resolution, session restoration or expiry, token refresh, network recovery, and feature-flag exposure, plus approved build, install, crash, and launch-performance signals. Properties may include platform, build, environment, coarse campaign source, consent state, and a safe correlation identifier; they exclude email, tokens, provider payloads, answer text, audio or transcripts, and sensitive accessibility or profile data.

Exit gate: product, UX, accessibility, privacy, and engineering reviews agree that both shells are coherent, usable at supported text sizes, keyboard/switch/screen-reader reachable where applicable, and free of unsupported claims or sensitive telemetry. The analytics specification defines durable deduplication and retention rules and distinguishes marketing signals from canonical server evidence. For the current web alpha, activation means the first server-confirmed correct unique activity within 24 hours; D1, D7, and W4 retention require a new server-confirmed activity in the corresponding window. Native activation and retention definitions remain unset until later native learning behavior passes its own audit.

### 8. Internal-build CI and foundation closeout

- Extend GitHub Actions with pinned platform tooling, dependency/secret/static analysis, unit and UI tests, contract tests, reproducible builds, artifact retention, and provenance.
- Produce traceable non-production internal artifacts. Signing credentials use protected environments and least-privilege access; logs and artifacts are scanned for secrets.
- Exercise failed-build, expired-credential, rollback, feature-flag, and last-known-good procedures without publishing to a production track.
- Record the supported matrix, test totals, residual risks, external blockers, artifact identifiers, and recovery steps in the handoff.

Exit gate: a reviewed commit produces installable internal builds for both platforms on the approved matrix, authenticates against staging, recovers from offline/token-expiry states, exposes no secrets, and passes the independent phase audit. Store upload and production promotion remain separately approval-gated.

## Native state contract

Every authentication, shell, and link surface defines initializing, signed out, callback in progress, authenticated, offline with a valid session, token expired or revoked, slow network, API unavailable, unsupported link, feature flag unavailable or disabled, resumed after background, relaunched after termination, and signed out after local cleanup. Each empty or error state has one safe primary action and preserves recoverable input or session state. Reload resolves server-verified identity and configuration; client display state never grants access. Cold and warm links are handled once, invalid and replayed callbacks fail safely, returning sessions do not flash signed-out UI, and account switching clears owner-scoped state.

## Quality and security matrix

Every applicable increment must count and report conducted, passed, failed, and unattempted checks. A material failure keeps the phase open. The Sprint 5 closeout audit has a minimum of 78 planned executions: 36 mirrored scenarios run independently on iOS and Android (72), plus six shared evidence checks. PASS requires 78 passed, zero failed, and zero unattempted, in addition to the repository and increment-specific checks.

The 36 mirrored scenarios are fresh install; development, staging, and inert production configuration; upgrade with a valid session; deterministic cold launch; successful, canceled, malformed, expired, and replayed PKCE callback; returning valid session; refresh success and refresh failure requiring sign-in; sign-out with local identity cleanup; cold, warm, and unsupported links; signed-out and valid-session offline launch; slow network; API failure; retry recovery; background and foreground; force termination and relaunch; repeated resume without duplicate navigation or telemetry; screen-reader traversal; actionable labels and errors; 200% text; smallest and largest supported phones; contrast and non-color status; touch targets and keyboard/switch focus where supported; reduced motion; repository-owned asset rendering with no baked-in text; and motion interruption with a static equivalent.

The six shared checks prove traceable signed iOS and Android internal artifacts; no privileged secret in binaries or configuration; no token or personal-data leakage in device, network, or telemetry logs; safe remote-flag disable and failure behavior on both apps; and contract/parity evidence that both clients use the versioned server boundary and equivalent state semantics.

- Core behavior: first launch, returning session, sign-in/recovery/sign-out, deep-link replay, account switching, retry, cancellation, offline startup, background/termination, and token expiry.
- Failure behavior: slow network, DNS/TLS failure, safe 4xx/5xx mapping, partial and total API failure, rate limit with bounded `Retry-After`, stale responses, and dependency unavailability.
- Security and ownership: secure storage, log/artifact secret scan, owner-isolated caches, server-side authorization, entitlement filtering, idempotency, callback validation, and no privileged provider configuration.
- Experience: supported phone sizes, promised tablet behavior, large text/font scaling, screen readers, focus order, accessible names and live feedback, color contrast, reduced motion, localization expansion, and right-to-left probes.
- Delivery: clean dependency resolution, pinned toolchains, platform lint/static analysis, unit/UI/contract tests, signed or explicitly unsigned artifact policy, provenance, rollback, and all eight repository checks.

## Phase completion

Sprint 5 closes only when all eight increments meet their exit gates, Elana's independent exact-head audit reports PASS with zero unresolved material defects, all repository and platform checks are green, and the handoff records installable non-production artifacts for both platforms. External account, store, privacy, signing, or infrastructure dependencies remain visible as blockers and cannot be replaced by simulated evidence.
