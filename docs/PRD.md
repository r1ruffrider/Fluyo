# Fluyo Product Requirements

## Current Delivery Scope

Sprint 1 delivers the platform foundation required for future Fluyo product work. It must provide:

- a runnable Next.js web application;
- a runnable NestJS API with service and database health endpoints;
- shared TypeScript contracts consumed by both applications;
- PostgreSQL and Prisma tooling with one minimal metadata model;
- local Docker Compose infrastructure;
- automated quality commands and GitHub Actions CI; and
- complete setup and operational documentation.

## Sprint 1 Acceptance Criteria

- A developer can install all workspaces from the repository root.
- PostgreSQL can start through the committed Compose configuration and becomes healthy.
- The committed migration and seed run successfully.
- The API health endpoints return the documented safe responses.
- The web home page reports API availability.
- Lint, typecheck, unit tests, production builds, and formatting checks pass.
- No secrets or local database data are tracked.

## Exclusions

Sprint 1 must not implement authentication, billing, subscriptions, entitlements, AI, lessons, user profiles, or mobile applications. These capabilities require later sprint requirements and, where applicable, accepted ADRs.
