# Fluyo Security

## Sprint 1 Scope

Sprint 1 exposes unauthenticated operational health endpoints only. It does not implement identity, customer data, billing, AI, lessons, or user profiles.

## Secret Handling

- Never commit `.env`, API keys, tokens, credentials, certificates, or production data.
- `.env.example` contains local-only placeholders and variable names.
- `DATABASE_URL` and all future privileged keys are server-only.
- Variables prefixed with `NEXT_PUBLIC_` are public browser configuration and must never contain secrets.

## API Controls

- Environment values are validated at API startup.
- CORS is limited to the configured `WEB_ORIGIN`.
- Request logs are structured, use correlation IDs, and redact sensitive headers.
- Database health failures return a fixed safe response without driver or connection details.
- HTTPS is required outside local development.

## Dependencies and CI

Pull requests must pass linting, strict type checking, tests, production builds, and formatting checks. Dependency and secret scanning should be enabled in repository settings and expanded in later hardening sprints.

## Future Security Work

Sprint 2 must document the Supabase Auth and JWT threat model, server-side authorization, session handling, rate limits, and negative authorization tests before identity features ship. Billing and AI work require their own security reviews.

## Reporting

Do not open a public issue containing a vulnerability, exploit, credential, or customer data. Contact the repository owner privately and include reproduction steps that avoid real secrets or production data.
