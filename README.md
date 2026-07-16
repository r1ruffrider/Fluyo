# Fluyo

Spanish that flows both ways.

Fluyo is a TypeScript monorepo containing the product web application, backend API, shared contracts, and local platform infrastructure. Sprint 1 establishes the production-oriented foundation only; authentication, billing, AI, lessons, user profiles, and mobile applications are intentionally deferred.

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

The home page checks the service health endpoint on the server and displays whether the backend is reachable.

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
