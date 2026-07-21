# Fluyo

Spanish that flows both ways.

Fluyo is a TypeScript monorepo containing the product web application, backend API, shared contracts, and local platform infrastructure. Sprint 1 establishes the platform foundation. Sprint 2 adds Supabase Auth sessions, a server-verified identity boundary, password recovery, and a minimal self-owned profile. The current billing increments add a Forge-compatible billing foundation and secure Stripe Checkout initiation. Customer Portal, webhook synchronization, entitlement-gated product UI, AI, lessons, translation, and mobile applications remain deferred.

## Project Structure

```text
apps/
  api/                  NestJS API and Prisma database tooling
  web/                  Next.js App Router web application
packages/
  shared/               Shared TypeScript API contracts and constants
infrastructure/
  docker/               Local PostgreSQL Docker Compose configuration
docs/                   Product and engineering documentation
landing/                Existing standalone marketing landing page
```

## Prerequisites

- Node.js 24 (see `.nvmrc`; Node.js 22.12 or newer is supported)
- npm 10 or newer
- Docker with Docker Compose v2

## Installation

Install all workspace dependencies from the repository root:

```bash
npm install
```

The post-install step generates the Prisma client.

## Environment Setup

Copy the safe local example file and review the values:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

`.env` is ignored by Git. Never place production credentials in `.env.example` or commit local environment files.

For Sprint 2 identity development, replace the Supabase placeholders with one non-production project's public configuration:

- `SUPABASE_URL`: server-side project URL used to derive the trusted issuer;
- `SUPABASE_JWKS_URL`: asymmetric public signing-key discovery endpoint;
- `SUPABASE_JWT_AUDIENCE`: expected access-token audience, normally `authenticated`;
- `NEXT_PUBLIC_SUPABASE_URL`: the same project URL for the web client; and
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the project's browser-safe publishable key.

The project must use Supabase asymmetric JWT signing keys. Do not add a service-role key or legacy JWT secret for Sprint 2.

In the Supabase Auth URL configuration, set the local site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback` as a redirect URL. Use the corresponding HTTPS URLs for each deployed environment.

Billing is disabled by default. To enable Stripe Checkout, configure the server-only `STRIPE_SECRET_KEY`, `STRIPE_PRICE_FLUYO_PLUS_MONTHLY`, and `STRIPE_PRICE_FLUYO_PLUS_ANNUAL` values, then set `BILLING_ENABLED=true`. Checkout startup validation rejects missing or malformed values. Do not prefix any of these values with `NEXT_PUBLIC_`.

`STRIPE_PORTAL_CONFIGURATION_ID` optionally selects a server-owned Stripe Portal configuration; when omitted, Stripe uses the account default. `STRIPE_WEBHOOK_SECRET` remains reserved for the later webhook increment. Neither value is exposed to the browser.

## Local PostgreSQL

Start PostgreSQL:

```bash
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d postgres
```

View database logs:

```bash
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml logs -f postgres
```

Stop PostgreSQL without deleting data:

```bash
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml down
```

Reset the local database and delete its named volume:

```bash
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml down -v
```

The reset command permanently removes local database data. Start PostgreSQL again and rerun the migration and seed afterward.

## Database Migrations and Seed

With PostgreSQL healthy, apply the committed migrations:

```bash
npm run db:migrate
```

Seed the harmless platform metadata record:

```bash
npm run db:seed
```

Regenerate the Prisma client after schema changes:

```bash
npm run prisma:generate
```

See [`docs/DATABASE.md`](docs/DATABASE.md) for the data model and migration rules.

## Development

Start the API and web application together:

```bash
npm run dev
```

Local URLs use the values in `.env`:

- Web: `http://localhost:3000`
- API base: `http://localhost:4000/api/v1`
- Service health: `http://localhost:4000/api/v1/health`
- Database health: `http://localhost:4000/api/v1/health/database`
- Sign in and sign up: `http://localhost:3000/login`
- Password recovery request: `http://localhost:3000/forgot-password`
- Protected account and profile: `http://localhost:3000/account`
- Pricing and Checkout initiation: `http://localhost:3000/pricing`
- Billing and Customer Portal handoff: `http://localhost:3000/billing`
- Protected identity: `http://localhost:4000/api/v1/auth/me`
- Protected profile: `http://localhost:4000/api/v1/profiles/me`
- Protected Checkout Session creation: `POST http://localhost:4000/api/v1/billing/checkout-sessions`
- Protected Customer Portal Session creation: `POST http://localhost:4000/api/v1/billing/portal-sessions`

The home page checks the service health endpoint on the server and displays whether the backend is reachable.

## Identity Development

The Next.js application uses Supabase SSR cookie sessions. Email/password sign-up may require the user to follow the confirmation link generated by Supabase before sign-in, depending on project settings. Forgot-password requests use the same fixed callback route with a recovery marker; successful password updates sign out the recovery session.

The protected account route reads and updates the minimal Fluyo profile through NestJS. The profile primary key always comes from the verified Supabase token and is never accepted from form input.

Protected API requests send the current access token as a bearer credential:

```bash
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <supabase-access-token>"
```

Do not place tokens in documentation, shell history, logs, source files, or committed environment files. See [`docs/SECURITY.md`](docs/SECURITY.md) and [ADR 0001](docs/adr/0001-supabase-identity-boundary.md).

## Stripe Billing, Checkout, and Customer Portal

The API contains private Prisma models and server-side services for Stripe customer mapping, normalized subscription projections, provider-neutral entitlements, processed-event idempotency, and an injectable plan catalog. The configured Fluyo Plus catalog entry maps monthly and annual choices to server-only Stripe Price IDs; no Price ID is accepted from the browser or committed to the repository.

Authenticated users can initiate Stripe-hosted subscription Checkout from `/pricing`. The API finds or creates one Stripe Customer per verified Supabase user, attaches only server-derived user and plan metadata, enables Stripe promotion codes, and returns a secure Checkout URL. Success and cancellation return to the pricing page, but neither redirect grants paid access.

Users with an existing server-owned Stripe Customer mapping can open Stripe Customer Portal from `/billing`. The API derives the Customer from the verified Supabase identity, applies only server configuration, and returns to the billing page. Stripe owns payment-method changes, invoices, subscription changes, and cancellations; Fluyo does not recreate those controls.

Feature authorization must query active entitlement keys. Neither a profile tier, browser value, Checkout redirect, Portal return, nor Stripe Price ID grants access. Webhook synchronization and subscription-state UI remain later milestones. See [ADR 0003](docs/adr/0003-forge-compatible-billing-foundation.md).

## Quality Commands

Run these commands from the repository root:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run format
npm run format:check
```

GitHub Actions runs Prisma generation, linting, type checking, tests, production builds, and formatting checks for pull requests and pushes to `main`.

## Documentation

- [Platform Standards](docs/PLATFORM_STANDARDS.md)
- [Business Plan](docs/BUSINESS_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Product Requirements](docs/PRD.md)
- [API](docs/API.md)
- [Database](docs/DATABASE.md)
- [Security](docs/SECURITY.md)
- [Changelog](docs/CHANGELOG.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, coding standards, and contributor requirements.

## Landing Page

- [Open the existing landing page](landing/index.html)
