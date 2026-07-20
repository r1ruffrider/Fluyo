# Fluyo API

## Status

Sprint 1 implements operational health endpoints. Sprint 2 adds the Supabase bearer-token identity boundary and protected current-identity and self-profile endpoints. The first Sprint 3 increment adds billing data and service foundations only; it adds no billing HTTP endpoints.

## Conventions

- Base URL: `http://localhost:4000/api/v1`
- Versioning: URL-based major version under `/api/v1`
- Content type: JSON
- Property naming: `camelCase`
- Correlation: the API accepts or creates `x-correlation-id` and returns it in the response headers.

## Authentication

- Public endpoints are explicitly documented as public.
- Protected endpoints require `Authorization: Bearer <Supabase access token>`.
- The API validates the JWT signature against the configured Supabase asymmetric JWKS and requires the configured issuer and audience, a valid expiration, an approved algorithm, and a UUID subject.
- Browser cookies and refresh tokens are not accepted by the API. The Next.js server or browser forwards only the short-lived access token when calling a protected API route.
- Authentication establishes identity only. Each product operation must separately enforce ownership, roles, or entitlements.
- Missing or invalid credentials return the same safe response and never reveal whether signature, issuer, audience, expiration, or subject validation failed.

Error responses use this envelope:

```json
{
  "error": {
    "code": "authentication_required",
    "message": "Authentication is required",
    "details": {},
    "correlationId": "request-correlation-id"
  }
}
```

## Endpoints

### `GET /health`

Reports that the API process is available. This endpoint is public.

Success response (`200 OK`):

```json
{
  "status": "ok",
  "service": "fluyo-api"
}
```

### `GET /health/database`

Checks database connectivity without returning connection or error details. This endpoint is public.

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

### `GET /auth/me`

Returns the provider-neutral identity derived from a verified Supabase access token. This endpoint is protected.

Request:

```http
GET /api/v1/auth/me HTTP/1.1
Authorization: Bearer <access-token>
```

Success response (`200 OK`):

```json
{
  "identity": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "learner@example.com"
  }
}
```

The `email` property is nullable. Raw Supabase claims, roles, tokens, session identifiers, and provider metadata are not returned.

Missing or invalid credential response (`401 Unauthorized`):

```json
{
  "error": {
    "code": "authentication_required",
    "message": "Authentication is required",
    "details": {},
    "correlationId": "request-correlation-id"
  }
}
```

### `GET /profiles/me`

Returns the authenticated caller's non-deleted application profile or `null`. The owner UUID always comes from the verified bearer token.

Success response (`200 OK`):

```json
{
  "profile": {
    "id": "11111111-1111-4111-8111-111111111111",
    "displayName": "Ana",
    "createdAt": "2026-07-19T00:00:00.000Z",
    "updatedAt": "2026-07-19T00:01:00.000Z"
  }
}
```

When no profile exists, `profile` is `null`.

### `PUT /profiles/me`

Idempotently creates or updates the authenticated caller's profile. The request cannot contain an owner ID. A `null` display name clears the optional field.

Request body:

```json
{
  "displayName": "Ana"
}
```

`displayName` must be `null` or a trimmed string containing 1–80 characters. Unknown fields are rejected. The success response (`200 OK`) is the updated profile object shown above without the outer `profile` property.

## Future Billing APIs

Checkout, Customer Portal, webhook intake, and subscription/entitlement summary endpoints are intentionally deferred to later focused Sprint 3 pull requests. When implemented, they must authenticate user-facing operations, select Stripe Prices from the server catalog, verify webhook signatures against the unmodified request body, and expose provider-neutral billing summaries rather than secrets or raw Stripe payloads.

New APIs must follow `PLATFORM_STANDARDS.md`, include validation and safe error responses, and update this document. Lessons, progress, translation, and AI endpoints are not part of the billing foundation.
