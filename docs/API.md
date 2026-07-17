# Fluyo API

## Status

Sprint 1 implements operational health endpoints only. Authentication and product APIs are deferred.

## Conventions

- Base URL: `http://localhost:4000/api/v1`
- Versioning: URL-based major version under `/api/v1`
- Content type: JSON
- Property naming: `camelCase`
- Correlation: the API accepts or creates `x-correlation-id` and returns it in the response headers.

## Endpoints

### `GET /health`

Reports that the API process is available.

Success response (`200 OK`):

```json
{
  "status": "ok",
  "service": "fluyo-api"
}
```

### `GET /health/database`

Checks database connectivity without returning connection or error details.

Success response (`200 OK`):

```json
{
  "status": "ok",
  "service": "fluyo-api",
  "database": "reachable"
}
```

Failure response (`503 Service Unavailable`):

```json
{
  "status": "error",
  "service": "fluyo-api",
  "database": "unreachable"
}
```

## Future APIs

New APIs must follow `PLATFORM_STANDARDS.md`, include validation and safe error responses, and update this document. Authentication, billing, lessons, users, and AI endpoints are not part of Sprint 1.
