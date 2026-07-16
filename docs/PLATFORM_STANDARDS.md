# Platform Standards

## Purpose

This document is the single source of truth for engineering, architecture, security, billing, deployment, documentation, and coding standards shared across the Forge ecosystem. Every repository must follow these standards so products can reuse patterns, data models, operational practices, and contributor knowledge without unnecessary divergence.

Product-specific documents may add detail, but they may not silently contradict this document. A justified exception requires an approved Architecture Decision Record (ADR) that identifies the affected standard, explains the tradeoff, and defines the scope and duration of the exception.

## Supported Applications

These standards apply to:

- Forge
- Fluyo
- Future products in the Forge ecosystem

## Technology Standards

### Frontend

- React is the approved component model.
- Use Next.js where server rendering, routing, server components, or an integrated web application framework is appropriate.
- All frontend application code must use TypeScript.
- Tailwind CSS is the approved styling foundation.
- Shared components should remain accessible, composable, and product-neutral where practical.

### Backend

- NestJS is the approved framework for standalone backend services.
- Node.js is the approved JavaScript runtime.
- All backend application code must use TypeScript.
- Business rules belong in services or domain modules, not controllers, route handlers, or UI components.
- A product may use Next.js server capabilities for a tightly scoped web backend or backend-for-frontend when appropriate; a materially different backend architecture requires an ADR.

### Database

- PostgreSQL is the approved relational database.
- Prisma ORM is the approved schema, migration, and application data-access layer.
- Database constraints must enforce invariants that cannot safely depend on application code alone.
- Raw SQL is permitted for PostgreSQL features that Prisma cannot express cleanly, but it must be reviewed, migrated, and documented.

### Authentication

- Supabase Auth is the approved identity provider.
- JWTs are used to transport authenticated identity and claims.
- Tokens must be validated server-side for issuer, audience, signature, and expiration.
- Authorization must be enforced separately from authentication and must use server-trusted roles, ownership, or entitlements.

### Storage

- Supabase Storage is the approved object-storage service.
- Buckets must be private by default.
- Access must use storage policies or short-lived signed URLs.
- File type, size, ownership, and malware-risk validation must occur before content becomes available to other users.

### Payments

- Stripe is the system of record for web billing.
- Use Stripe Checkout for purchases. Do not build a custom card-entry or checkout flow.
- Use Stripe Customer Portal for payment methods, invoices, subscription management, and cancellations.
- Use signed Stripe Webhooks as the authoritative source for local subscription state.
- Support Monthly and Annual subscriptions using recurring Stripe Prices.
- Use Stripe Coupons and promotion codes; do not implement a separate discount engine.
- All products use the shared entitlement model. Feature code checks provider-neutral entitlements rather than Stripe Price IDs or UI tier labels.
- Checkout success redirects do not grant access. Verified, idempotently processed webhooks update subscription projections and entitlements.
- Stripe keys and billing mutations are server-side only.
- RevenueCat is reserved for future native mobile purchases. It must map App Store and Play Store products into the same identity and entitlement model used by Stripe rather than introduce a second authorization system.
- Billing migrations, lifecycle normalization, webhook processing, and entitlement service patterns must remain compatible across Forge, Fluyo, and future products.

### AI

- OpenAI is the approved default AI platform.
- Prompt versioning is required, and prompts must be centrally managed rather than embedded across UI components and route handlers.
- Each production AI request must identify the prompt version, model, feature, and correlation ID in server-side telemetry.
- AI logging must protect secrets and personal data while retaining the metadata required for debugging, cost analysis, and quality measurement.
- AI-backed features require repeatable evaluation datasets and acceptance criteria appropriate to their risk.
- Model or provider changes must be evaluated before rollout. A different primary provider or materially different AI architecture requires an ADR.
- User-visible AI output must be treated as untrusted input before storage, rendering, or execution.

### Mobile

Approved mobile approaches are:

- React Native; or
- native iOS and Android applications.

The choice depends on future product requirements, platform capabilities, performance, staffing, and store constraints. Record the decision in an ADR before starting a mobile implementation. Mobile applications must reuse the platform's authentication, API, billing entitlements, observability, and security contracts.

### Infrastructure

- Docker defines reproducible service build and runtime environments.
- GitHub Actions is the approved CI/CD automation platform.
- Vercel is the preferred host for Next.js web applications.
- Railway or Render is approved for backend services and workers where appropriate.
- Cloudflare manages public DNS and may provide edge security, caching, and traffic controls.
- Development, staging, and production must use separate configuration and credentials.
- Infrastructure choices outside this approved set require an ADR.

### Infrastructure Verification Boundaries

Development environments may not have access to local virtualization technologies (Docker Desktop, Hyper-V, WSL2, etc.).

Infrastructure verification should be clearly separated from application verification.

AI assistants must never fabricate infrastructure verification that could not actually be performed.

When required infrastructure is unavailable, contributors must record the unverified checks explicitly, complete all independent application verification, and leave the infrastructure checks as pre-merge requirements for a developer or CI environment with the necessary capabilities.

## Documentation Standards

Every repository must contain the following maintained documents. `README.md` lives at the repository root; the remaining documents should live in `docs/` unless an established repository layout documents another location.

| Document           | Required content                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `README.md`        | Product summary, setup, local development, commands, and links to all primary documentation.                   |
| `BUSINESS_PLAN.md` | Product positioning, audience, business model, pricing assumptions, and commercial goals.                      |
| `ARCHITECTURE.md`  | System boundaries, components, data flows, integrations, deployment topology, and important constraints.       |
| `ROADMAP.md`       | Sequenced milestones, status, dependencies, and known blockers.                                                |
| `PRD.md`           | Product requirements, user journeys, acceptance criteria, and non-functional requirements.                     |
| `API.md`           | API conventions, authentication, endpoints or schemas, examples, and compatibility policy.                     |
| `DATABASE.md`      | Data model, ownership, relationships, migrations, retention, and recovery expectations.                        |
| `SECURITY.md`      | Threat model, secret handling, authentication, authorization, vulnerability reporting, and incident practices. |
| `CHANGELOG.md`     | User-visible and operationally significant changes organized by release.                                       |

Documentation changes are part of feature completion. Architecture, API, database, security, billing, or operational behavior must not exist only in code or chat history. Use relative links, keep examples current, and mark planned behavior clearly so it is not confused with implemented behavior.

## Coding Standards

- Enable TypeScript strict mode in every TypeScript project.
- Use ESLint with a shared ecosystem configuration.
- Use Prettier for deterministic formatting.
- Use Conventional Commits for commit messages.
- Organize application code by feature or domain, with shared infrastructure isolated from product features.
- Prefer small modules with explicit inputs and outputs over hidden global state.
- Keep controllers and UI components thin; business logic belongs in testable services or domain modules.
- Validate all data crossing a trust boundary.
- Avoid provider-specific identifiers and behavior outside integration adapters.
- Do not duplicate shared billing, authentication, logging, or error-handling patterns inside features.

## Git Standards

- Protect the `main` branch from direct, unreviewed changes.
- Develop changes on short-lived feature branches.
- Merge through pull requests.
- Require code review for production changes.
- Require applicable CI checks to pass before merge.
- Use Conventional Commits and meaningful pull-request descriptions.
- Use semantic versioning for released applications, services, libraries, and public APIs.
- Keep commits focused and do not mix unrelated refactors with feature changes.
- Delete merged feature branches unless an active release process requires them.

## Security Standards

- Never commit secrets, credentials, private keys, tokens, or production data.
- Supply configuration through environment variables or an approved secret manager.
- Stripe secret keys, webhook secrets, Supabase service credentials, AI provider keys, and other privileged credentials are server-side only.
- Use HTTPS for all network communication outside a local development environment.
- Follow current OWASP recommendations, including the OWASP Top 10 and applicable API Security guidance.
- Apply least privilege to database roles, service accounts, storage policies, CI tokens, and third-party integrations.
- Validate and sanitize untrusted input at every boundary.
- Protect state-changing browser requests against cross-site attacks and use secure cookie settings where cookies are used.
- Rate-limit sensitive and resource-intensive endpoints.
- Do not expose internal errors, stack traces, secrets, or provider payloads to clients.
- Maintain dependency and container vulnerability scanning in CI.
- Document data classification, retention, deletion, backup, and incident-response expectations in `SECURITY.md` and `DATABASE.md`.

## Database Standards

Use these PostgreSQL naming and lifecycle conventions:

- **Tables:** plural `snake_case` names, such as `user_entitlements`.
- **Columns:** `snake_case` names. Foreign keys use `<entity>_id`, such as `user_id` or `subscription_id`.
- **Primary keys:** use a UUID column named `id` unless an ADR documents a strong reason for another key.
- **Indexes:** use `<table>_<column_or_purpose>_idx`; unique indexes use `<table>_<column_or_purpose>_key`.
- **Constraints:** use descriptive names ending in `_fkey`, `_check`, or `_key` as appropriate.
- **Migrations:** use an immutable, ordered timestamp plus a descriptive `snake_case` name, for example `20260716093000_create_user_entitlements`.
- **Timestamps:** use timezone-aware UTC timestamps. Standard lifecycle fields are `created_at` and `updated_at`.
- **Soft deletes:** when retention or recovery requires them, use nullable `deleted_at`. Queries must exclude soft-deleted rows by default. Do not add soft deletes without a defined retention and uniqueness strategy.
- **Audit fields:** add `created_by` and `updated_by` UUIDs when actor attribution is required. Security-sensitive transitions may require a dedicated append-only audit table.
- **Booleans:** use affirmative names such as `is_active` or `has_access`.
- **Enums/statuses:** use explicit, documented values and safe migrations. Do not overload a status field with unrelated concepts.

Prisma model names may follow TypeScript conventions, but database mappings must preserve the PostgreSQL naming rules. Every migration must be reviewed for locking, reversibility or forward recovery, data backfill, indexes, constraints, and production rollout risk.

## API Standards

- Use resource-oriented REST paths with plural nouns, such as `/api/v1/subscriptions`.
- Version public and cross-application APIs in the URL using `/api/v1`. Breaking changes require a new major API version and a documented migration window.
- Use standard HTTP methods and status codes consistently.
- JSON request and response properties use `camelCase` even when database columns use `snake_case`.
- Validate path parameters, query parameters, headers, and bodies at the API boundary. Reject unknown or malformed input with actionable errors.
- Use a consistent error envelope:

```json
{
  "error": {
    "code": "stable_machine_code",
    "message": "Safe human-readable message",
    "details": {},
    "correlationId": "request-correlation-id"
  }
}
```

- Never expose stack traces, SQL errors, secrets, or raw provider errors.
- Prefer cursor pagination for mutable or large collections. Responses include `items` and pagination metadata such as `nextCursor` and `hasMore`.
- Document filtering, sorting, default limits, and maximum limits.
- Require idempotency for retryable create or billing operations where duplicate execution would be harmful.
- Document authentication, authorization, rate limits, and examples in `API.md`.

## Logging

- Emit structured JSON logs in deployed environments.
- Correlation IDs are required: assign or propagate one for every request, job, webhook, and cross-service operation.
- Include timestamp, severity, service, environment, event name, and correlation ID in every log entry.
- Use stable event names and machine-queryable fields rather than relying on prose alone.
- Redact credentials, tokens, payment details, sensitive personal information, and unnecessary request or provider payloads.
- Use centralized error tracking for unhandled exceptions and actionable failures.
- Connect logs, traces, metrics, and error reports through correlation identifiers where supported.
- Define retention and access controls appropriate to the data in the logs.

## Testing

- Unit-test business rules, transformations, validation, and failure handling.
- Integration-test database behavior, service boundaries, authentication, authorization, storage, and provider adapters.
- End-to-end test critical user journeys in a production-like environment.
- Billing tests must cover Checkout creation, webhook signature rejection, duplicate delivery, out-of-order events, renewals, failed payments, cancellations, coupons, and entitlement changes.
- Security-sensitive authorization must include negative tests proving unauthorized access is denied.
- Tests must be deterministic, isolated, and safe to run repeatedly.
- External providers should be mocked or sandboxed in automated tests; live verification must use non-production accounts and be separately documented.
- Repositories define meaningful coverage thresholds in CI, but coverage percentage does not replace risk-based test quality.

## CI/CD

Every repository must use GitHub Actions. Pull-request workflows must, as applicable:

1. install dependencies from the committed lockfile;
2. verify formatting;
3. run ESLint;
4. run TypeScript type checking in strict mode;
5. run unit and integration tests;
6. build deployable applications and containers;
7. validate Prisma schema and migrations;
8. scan for committed secrets, vulnerable dependencies, and vulnerable container layers; and
9. publish test and build results that are visible on the pull request.

Protected-branch rules must require the applicable checks before merge. Deployment workflows must promote an identified commit or immutable artifact, keep staging and production credentials separate, run database migrations through a controlled step, perform post-deployment health checks, and provide a documented rollback or forward-recovery path. Production deployments should require approval when risk, compliance, or customer impact warrants it.

## Architecture Decision Records

Use ADRs for significant or difficult-to-reverse decisions, including:

- deviations from this document;
- new frameworks, infrastructure providers, databases, or major dependencies;
- authentication, authorization, billing, entitlement, or security model changes;
- public API compatibility decisions;
- data ownership, retention, or migration strategies; and
- native versus cross-platform mobile architecture.

Store ADRs in `docs/adr/` and name them `NNNN-short-descriptive-title.md`. Each ADR includes:

- title and status (`proposed`, `accepted`, `superseded`, or `rejected`);
- date and decision owners;
- context and constraints;
- considered options;
- decision and rationale;
- security, operational, data, cost, and compatibility consequences; and
- links to superseded or related ADRs.

Accepted ADRs are immutable historical records. If a decision changes, add a new ADR that supersedes the old one rather than rewriting history.

## Repository Layout

Use this layout as the default. Omit folders that do not apply; document meaningful deviations in `ARCHITECTURE.md` or an ADR.

```text
/
├── README.md
├── src/
│   ├── features/            # Product features grouped by domain
│   ├── common/              # Shared types, utilities, errors, and middleware
│   ├── config/              # Validated runtime configuration
│   ├── integrations/        # Stripe, Supabase, OpenAI, and other adapters
│   └── main.ts              # Service entry point, when applicable
├── app/                     # Next.js App Router, when applicable
├── components/              # Shared/presentation components, when applicable
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── PLATFORM_STANDARDS.md
│   ├── BUSINESS_PLAN.md
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   ├── PRD.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── SECURITY.md
│   ├── CHANGELOG.md
│   └── adr/
├── .github/
│   └── workflows/
├── Dockerfile
├── package.json
└── tsconfig.json
```

Monorepositories may place products under `apps/` and shared packages under `packages/`. The same feature boundaries, documentation requirements, and platform standards still apply.

## AI Development Standards

This ecosystem is designed to be developed with assistance from multiple AI coding tools.

Approved AI assistants include, but are not limited to:

- ChatGPT
- ChatGPT Codex
- Claude
- GitHub Copilot
- Gemini
- Cursor
- Windsurf
- Future AI development tools

No repository documentation, architecture, workflow, or coding convention may assume a specific AI assistant. All contributors, human or AI, must follow the standards defined in this document.

Repository decisions are based on documented product requirements, architecture, and ADRs—not the preferences, defaults, or generated conventions of an individual AI tool. AI-generated changes receive the same validation, review, security scrutiny, and testing as human-authored changes.

### AI Context Files

Repository documentation must provide sufficient context for any approved AI assistant to contribute effectively. AI assistants should review these primary documents before proposing architectural or implementation changes, in this order of precedence:

1. `PLATFORM_STANDARDS.md`
2. `BUSINESS_PLAN.md`
3. `ARCHITECTURE.md`
4. `ROADMAP.md`
5. `PRD.md`
6. `API.md`

If documents conflict, the higher-precedence document controls unless an accepted ADR explicitly approves an exception. Missing or ambiguous product decisions must be surfaced rather than silently filled with an AI tool's defaults. Relevant ADRs, `DATABASE.md`, and `SECURITY.md` must also be reviewed when a change affects their scope.

## Future Expansion

All future applications in the Forge ecosystem must adopt this standard at repository creation. New products should reuse shared templates, CI workflows, billing and entitlement patterns, security controls, and documentation structure wherever possible.

A future application may depart from a standard only through an accepted ADR. The ADR must demonstrate a product or operational need, assess ecosystem compatibility and migration cost, and identify whether the exception is temporary or permanent. Convenience, tool defaults, and individual contributor preference are not sufficient reasons to diverge.
