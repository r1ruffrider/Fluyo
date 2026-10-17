# Fluyo API

## Status

Sprint 1 implements operational health endpoints. Sprint 2 adds the Supabase bearer-token identity boundary and protected current-identity and self-profile endpoints. Sprint 3 adds protected Stripe Checkout, Customer Portal, a signed webhook receiver, and a protected subscription/entitlement status endpoint.

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

### `GET /billing/status`

Returns the authenticated caller's current subscription summary and active entitlements. This endpoint is protected. It never grants access itself; it only reports the state already synchronized by the Stripe webhook processor.

Request:

```http
GET /api/v1/billing/status HTTP/1.1
Authorization: Bearer <access-token>
```

Success response (`200 OK`) for a caller with a subscription:

```json
{
  "subscription": {
    "planKey": "fluyo_plus",
    "displayName": "Fluyo Plus",
    "status": "active",
    "billingInterval": "monthly",
    "currentPeriodEnd": "2026-08-20T12:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "canceledAt": null,
    "trialEnd": null,
    "accessGranted": true
  },
  "entitlements": [{ "key": "practice.unlimited", "startsAt": null, "endsAt": null }]
}
```

`subscription` is `null` when the caller has never started billing. `status` is one of `trialing`, `active`, `past_due`, `canceled`, `unpaid`, `incomplete`, `incomplete_expired`, or `paused`. `accessGranted` mirrors the shared `trialing`/`active`/`past_due` access policy and is display data only; product features must still query active entitlements directly rather than trust this field or any client value. When a caller holds more than one local subscription record, the response reports the access-granting one, tie-broken by the most recently updated record. No Stripe customer, subscription, or Price identifier is returned.

## Learning catalog APIs

All learning catalog routes require a verified Supabase bearer token. Catalog records are
server-managed. Responses never include answer-validation data, request hashes, stored replay
payloads, provider identifiers, entitlement sources, or another user's data.

### `GET /lessons?cursor=&limit=`

Returns accessible, non-archived lessons that have at least one accessible published activity.
Ordering is stable by lesson order and UUID. `limit` defaults to 20 and accepts 1–50. `cursor` is an
opaque value returned by the previous page; malformed, oversized, or cross-resource cursors return
`400 invalid_request`.

```json
{
  "items": [
    {
      "id": "10000000-0000-4000-8000-000000000001",
      "slug": "first-conversations",
      "title": "First conversations",
      "description": "Build a friendly first exchange with greetings and everyday courtesy.",
      "activityCount": 3
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

### `GET /lessons/:lessonId`

Returns one accessible lesson with its accessible published activities and phrase decks. Activity
responses include only the stable activity ID, kind, published content version, prompt, and labeled
choice IDs. Archived, missing, and entitlement-inaccessible lessons all return
`404 resource_not_found` so the API does not reveal protected catalog existence. Invalid non-v4 UUID
paths return `400 invalid_request`.

### `GET /phrase-decks?cursor=&limit=`

Returns accessible, non-archived phrase-deck summaries in stable slug/UUID order. It uses the same
20-item default, 50-item maximum, opaque cursor rules, and verified-user entitlement lookup as the
lesson endpoints. Full starter-deck phrases are included through the lesson detail response.

The starter catalog is free because its entitlement requirement is `null`. For protected future
catalog rows, the API derives active provider-neutral entitlement keys for the verified caller and
applies them inside every parent and nested catalog query. Clients cannot submit an owner ID or an
entitlement key.

## Future Billing APIs

Live Stripe test-mode lifecycle verification is complete. Subscription-experience gating beyond this status summary, progress writes, translation, and AI endpoints remain future work.

New APIs must follow `PLATFORM_STANDARDS.md`, include validation and safe error responses, and update this document.
