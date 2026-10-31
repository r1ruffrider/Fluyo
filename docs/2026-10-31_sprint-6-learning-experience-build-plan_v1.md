# Sprint 6 learning-experience build plan

## Document control

| Field               | Value                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Status              | Proposed; R0 documentation only                                                            |
| Date                | 2026-10-31                                                                                 |
| Source commit       | `80563fee339a07bd2ab9706b8186ed772a3b9a1a`                                                 |
| Orchestration owner | Adriana Solano                                                                             |
| Architecture        | [ADR 0007](adr/0007-learning-experience-and-operational-boundaries.md)                     |
| Evidence            | [Duolingo public-evidence study](research/2026-10-31_duolingo-public-evidence-study_v1.md) |

R0 records a lawful public-evidence study, original Fluyo boundaries, architecture, risks, and the dependency-safe sequence. It changes no application runtime, dependency, database schema, API, UI, native project, hosted service, credential, production setting, branch protection, signing configuration, store, or external account. It does not modify or clear PR #61.

## Existing authority and conflicts

- [ADR 0005](adr/0005-learning-domain-ownership-and-progress.md) remains authoritative for catalog content, immutable activity versions, attempts, progress, goals, streaks, and notification preferences.
- ADR 0007 extends experience planning and operational safety. It does not redefine ADR 0005 schemas or permit client-awarded progress.
- Sprint 5 still states that native learning and live native authentication are not implemented. R4 is web-only unless separate native gates later pass.
- Existing ADR 0005 telemetry permits internal IDs and a correlation ID for its historical server boundary. The proposed experience-operational contract is a stricter independent no-op boundary and does not silently rewrite ADR 0005.
- [ROADMAP](ROADMAP.md) retains the broad Sprint 6 goal. This dated plan is the canonical staged subset; completing R0–R4 does not complete every broad Sprint 6 item.

## Architecture boundary

```text
ADR 0005 Learning Core (authoritative)
  ├─ catalog/version reads
  ├─ attempt write + idempotency
  └─ confirmed progress projections
          │ one-way read
          ▼
Learning Session Planner (optional, read-only)
  └─ zero or one next item, reason = "next"
          │ optional presentation input
          ▼
Experience Projection / Conversation Canvas (rebuildable)

Static Experience Policy (default disabled)
  └─ can disable optional experience only

Closed No-op Operational Sink
  └─ cannot affect Learning Core or user state
```

The planner, projections, policy, and sink are optional. Their absence or failure leaves the existing Learning Core and dashboard fallback usable.
Optional modules cannot award progress, expand access, or make Learning Core unavailable.

## State and authority contract

### Canonical ordered learning transition manifest

This 48-row manifest is the only authoritative transition graph for R0. Its object key order is `id`, `source`, `event`, `guards`, `effects`, `target`, `externalDestination`, `durableEffect`. The canonical digest is lowercase SHA-256 of UTF-8 `JSON.stringify(manifest)` with no trailing newline: `7cef0f307e365ec4f2ee0e8c83a2b8f0bb56401e6d8ccabafdf4008cea3631e9`.

```json
[
  {
    "id": "T01",
    "source": "PREPARING",
    "event": "PLAN_READY",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "SERVER_AUTHORIZED",
      "SERVER_ENTITLED",
      "CONTENT_VERSION_CURRENT",
      "ITEM_AVAILABLE"
    ],
    "effects": ["CLEAR_RETRY_CONTEXT", "CLEAR_OFFLINE_CONTEXT"],
    "target": "ACTIVE",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T02",
    "source": "PREPARING",
    "event": "REVIEW_EMPTY",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SERVER_REVIEW_EMPTY"],
    "effects": ["CLEAR_RETRY_CONTEXT"],
    "target": "EMPTY_REVIEW",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T03",
    "source": "PREPARING",
    "event": "ACCESS_DENIED",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SERVER_ACCESS_DENIED"],
    "effects": ["STOP_ATTEMPT", "CLEAR_UNCONFIRMED_ANSWER", "PRESERVE_AUTHENTICATED_SESSION"],
    "target": "ACCESS_BLOCKED",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T04",
    "source": "PREPARING",
    "event": "PREPARE_FAILED",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "RETRYABLE_PREPARATION_FAILURE"
    ],
    "effects": ["SET_RETRY_ORIGIN_PREPARE", "CLEAR_SUBMISSION_CONTEXT"],
    "target": "RETRYABLE_ERROR",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T05",
    "source": "PREPARING",
    "event": "SESSION_INVALID",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SESSION_INVALID"],
    "effects": [
      "FENCE_LATE_RESULTS",
      "PRESERVE_CONFIRMED_SERVER_PROGRESS",
      "PRESERVE_OWNER_NEUTRAL_ROUTE",
      "CLEAR_AUTH_BOUND_WORK",
      "CLEAR_OWNER_BOUND_CLIENT_STATE",
      "CLEAR_UNCONFIRMED_ANSWER",
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_RETRY_CONTEXT",
      "CLEAR_OFFLINE_CONTEXT"
    ],
    "target": "SESSION_ENDED",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T06",
    "source": "PREPARING",
    "event": "NETWORK_OFFLINE",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "NETWORK_OFFLINE"],
    "effects": ["SET_OFFLINE_ORIGIN_PREPARE", "CLEAR_UNCONFIRMED_ANSWER"],
    "target": "OFFLINE_READ_ONLY",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T07",
    "source": "PREPARING",
    "event": "EXIT",
    "guards": ["ALWAYS"],
    "effects": ["CLEAR_RETRY_CONTEXT", "CLEAR_OFFLINE_CONTEXT", "CLEAR_UNCONFIRMED_ANSWER"],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T08",
    "source": "ACTIVE",
    "event": "SUBMIT_REQUESTED",
    "guards": ["CURRENT_AUTH_GENERATION", "CONTENT_VERSION_CURRENT", "ANSWER_READY"],
    "effects": ["CREATE_OR_REUSE_SUBMISSION_IDEMPOTENCY_KEY"],
    "target": "SUBMITTING",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T09",
    "source": "ACTIVE",
    "event": "ACCESS_DENIED",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SERVER_ACCESS_DENIED"],
    "effects": ["STOP_ATTEMPT", "CLEAR_UNCONFIRMED_ANSWER", "PRESERVE_AUTHENTICATED_SESSION"],
    "target": "ACCESS_BLOCKED",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T10",
    "source": "ACTIVE",
    "event": "SESSION_INVALID",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SESSION_INVALID"],
    "effects": [
      "FENCE_LATE_RESULTS",
      "PRESERVE_CONFIRMED_SERVER_PROGRESS",
      "PRESERVE_OWNER_NEUTRAL_ROUTE",
      "CLEAR_AUTH_BOUND_WORK",
      "CLEAR_OWNER_BOUND_CLIENT_STATE",
      "CLEAR_UNCONFIRMED_ANSWER",
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_RETRY_CONTEXT",
      "CLEAR_OFFLINE_CONTEXT"
    ],
    "target": "SESSION_ENDED",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T11",
    "source": "ACTIVE",
    "event": "NETWORK_OFFLINE",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "NETWORK_OFFLINE"],
    "effects": ["SET_OFFLINE_ORIGIN_ACTIVE", "PRESERVE_EPHEMERAL_ANSWER_IN_MEMORY"],
    "target": "OFFLINE_READ_ONLY",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T12",
    "source": "ACTIVE",
    "event": "EXIT",
    "guards": ["NO_UNCONFIRMED_ANSWER_OR_DISCARD_CONFIRMED"],
    "effects": [
      "FENCE_LATE_RESULTS",
      "CLEAR_UNCONFIRMED_ANSWER",
      "CLEAR_RETRY_CONTEXT",
      "CLEAR_OFFLINE_CONTEXT"
    ],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T13",
    "source": "SUBMITTING",
    "event": "ATTEMPT_CONFIRMED",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "SERVER_CONFIRMATION_MATCHES_IDEMPOTENCY_KEY",
      "CONTENT_VERSION_CURRENT"
    ],
    "effects": [
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_RETRY_CONTEXT",
      "REFLECT_SERVER_CONFIRMED_PROGRESS"
    ],
    "target": "CONFIRMED",
    "externalDestination": null,
    "durableEffect": "REFLECT_SERVER_CONFIRMED_PROGRESS"
  },
  {
    "id": "T14",
    "source": "SUBMITTING",
    "event": "SUBMIT_FAILED",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "RETRYABLE_TRANSPORT_OR_SERVER_FAILURE"
    ],
    "effects": ["SET_RETRY_ORIGIN_SUBMIT", "PRESERVE_SUBMISSION_IDEMPOTENCY_KEY"],
    "target": "RETRYABLE_ERROR",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T15",
    "source": "SUBMITTING",
    "event": "CONTENT_STALE",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "SERVER_CONTENT_VERSION_CONFLICT"
    ],
    "effects": ["FENCE_LATE_RESULTS", "CLEAR_SUBMISSION_CONTEXT", "CLEAR_UNCONFIRMED_ANSWER"],
    "target": "STALE_CONTENT",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T16",
    "source": "SUBMITTING",
    "event": "ACCESS_DENIED",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SERVER_ACCESS_DENIED"],
    "effects": [
      "FENCE_LATE_RESULTS",
      "STOP_ATTEMPT",
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_UNCONFIRMED_ANSWER",
      "PRESERVE_AUTHENTICATED_SESSION"
    ],
    "target": "ACCESS_BLOCKED",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T17",
    "source": "SUBMITTING",
    "event": "SESSION_INVALID",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SESSION_INVALID"],
    "effects": [
      "FENCE_LATE_RESULTS",
      "PRESERVE_CONFIRMED_SERVER_PROGRESS",
      "PRESERVE_OWNER_NEUTRAL_ROUTE",
      "CLEAR_AUTH_BOUND_WORK",
      "CLEAR_OWNER_BOUND_CLIENT_STATE",
      "CLEAR_UNCONFIRMED_ANSWER",
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_RETRY_CONTEXT",
      "CLEAR_OFFLINE_CONTEXT"
    ],
    "target": "SESSION_ENDED",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T18",
    "source": "SUBMITTING",
    "event": "EXIT",
    "guards": ["USER_CONFIRMED_DISCARD"],
    "effects": [
      "FENCE_LATE_RESULTS",
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_UNCONFIRMED_ANSWER",
      "CLEAR_RETRY_CONTEXT"
    ],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T19",
    "source": "CONFIRMED",
    "event": "CONTINUE",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "SERVER_SELECTED_NEXT_AVAILABLE"
    ],
    "effects": ["CLEAR_SUBMISSION_CONTEXT", "CLEAR_RETRY_CONTEXT"],
    "target": "ACTIVE",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T20",
    "source": "CONFIRMED",
    "event": "REVIEW_EMPTY",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SERVER_REVIEW_EMPTY"],
    "effects": ["CLEAR_SUBMISSION_CONTEXT", "CLEAR_RETRY_CONTEXT"],
    "target": "EMPTY_REVIEW",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T21",
    "source": "CONFIRMED",
    "event": "FINISH",
    "guards": ["ALWAYS"],
    "effects": ["CLEAR_SUBMISSION_CONTEXT", "CLEAR_RETRY_CONTEXT", "CLEAR_OFFLINE_CONTEXT"],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T22",
    "source": "RETRYABLE_ERROR",
    "event": "RETRY_REQUESTED",
    "guards": ["RETRY_ORIGIN_PREPARE", "NO_SUBMISSION_IDEMPOTENCY_KEY"],
    "effects": ["CLEAR_RETRY_CONTEXT"],
    "target": "PREPARING",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T23",
    "source": "RETRYABLE_ERROR",
    "event": "RETRY_REQUESTED",
    "guards": [
      "RETRY_ORIGIN_SUBMIT",
      "SAME_SUBMISSION_IDEMPOTENCY_KEY_PRESENT",
      "CURRENT_AUTH_GENERATION",
      "CONTENT_VERSION_CURRENT"
    ],
    "effects": ["PRESERVE_SUBMISSION_IDEMPOTENCY_KEY", "CLEAR_RETRY_ORIGIN"],
    "target": "SUBMITTING",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T24",
    "source": "RETRYABLE_ERROR",
    "event": "SESSION_INVALID",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SESSION_INVALID"],
    "effects": [
      "FENCE_LATE_RESULTS",
      "PRESERVE_CONFIRMED_SERVER_PROGRESS",
      "PRESERVE_OWNER_NEUTRAL_ROUTE",
      "CLEAR_AUTH_BOUND_WORK",
      "CLEAR_OWNER_BOUND_CLIENT_STATE",
      "CLEAR_UNCONFIRMED_ANSWER",
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_RETRY_CONTEXT",
      "CLEAR_OFFLINE_CONTEXT"
    ],
    "target": "SESSION_ENDED",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T25",
    "source": "RETRYABLE_ERROR",
    "event": "EXIT",
    "guards": ["ALWAYS"],
    "effects": [
      "FENCE_LATE_RESULTS",
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_RETRY_CONTEXT",
      "CLEAR_UNCONFIRMED_ANSWER"
    ],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T26",
    "source": "STALE_CONTENT",
    "event": "REFRESH",
    "guards": ["ALWAYS"],
    "effects": ["CLEAR_SUBMISSION_CONTEXT", "CLEAR_UNCONFIRMED_ANSWER", "CLEAR_RETRY_CONTEXT"],
    "target": "PREPARING",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T27",
    "source": "STALE_CONTENT",
    "event": "SESSION_INVALID",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SESSION_INVALID"],
    "effects": [
      "FENCE_LATE_RESULTS",
      "PRESERVE_CONFIRMED_SERVER_PROGRESS",
      "PRESERVE_OWNER_NEUTRAL_ROUTE",
      "CLEAR_AUTH_BOUND_WORK",
      "CLEAR_OWNER_BOUND_CLIENT_STATE",
      "CLEAR_UNCONFIRMED_ANSWER",
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_RETRY_CONTEXT",
      "CLEAR_OFFLINE_CONTEXT"
    ],
    "target": "SESSION_ENDED",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T28",
    "source": "STALE_CONTENT",
    "event": "EXIT",
    "guards": ["ALWAYS"],
    "effects": ["CLEAR_SUBMISSION_CONTEXT", "CLEAR_UNCONFIRMED_ANSWER", "CLEAR_RETRY_CONTEXT"],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T29",
    "source": "SESSION_ENDED",
    "event": "BEGIN_SIGN_IN",
    "guards": ["OWNER_NEUTRAL_ROUTE_PRESENT"],
    "effects": ["START_INTERNAL_SIGN_IN"],
    "target": "SESSION_ENDED",
    "externalDestination": "INTERNAL_SIGN_IN",
    "durableEffect": "NONE"
  },
  {
    "id": "T30",
    "source": "SESSION_ENDED",
    "event": "SIGN_IN_RETURN_VALID",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "SIGN_IN_RETURN_RESULT_VALID",
      "AUTH_IDENTITY_CONFIRMED",
      "AUTH_SAME_OWNER",
      "SERVER_AUTHORIZED",
      "SERVER_ENTITLED",
      "CONTENT_VERSION_CURRENT",
      "ACTIVITY_AVAILABLE",
      "ROUTE_IS_LEARNING_SESSION_ENTRY"
    ],
    "effects": ["DISCARD_OWNER_NEUTRAL_ROUTE", "REQUEST_SERVER_SELECTED_ACTIVITY"],
    "target": "PREPARING",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T31",
    "source": "SESSION_ENDED",
    "event": "SIGN_IN_RETURN_REJECTED",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "SIGN_IN_RETURN_RESULT_OWNER_CHANGED"
    ],
    "effects": [
      "DISCARD_OWNER_NEUTRAL_ROUTE",
      "CLEAR_PREVIOUS_OWNER_CLIENT_STATE",
      "PRESERVE_CURRENT_AUTHENTICATED_SESSION"
    ],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T32",
    "source": "SESSION_ENDED",
    "event": "SIGN_IN_RETURN_REJECTED",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "SIGN_IN_RETURN_RESULT_AUTHORIZATION_DENIED"
    ],
    "effects": ["DISCARD_OWNER_NEUTRAL_ROUTE", "PRESERVE_AUTHENTICATED_SESSION"],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T33",
    "source": "SESSION_ENDED",
    "event": "SIGN_IN_RETURN_REJECTED",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "SIGN_IN_RETURN_RESULT_ENTITLEMENT_DENIED"
    ],
    "effects": ["DISCARD_OWNER_NEUTRAL_ROUTE", "PRESERVE_AUTHENTICATED_SESSION"],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T34",
    "source": "SESSION_ENDED",
    "event": "SIGN_IN_RETURN_REJECTED",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "SIGN_IN_RETURN_RESULT_CONTENT_STALE"
    ],
    "effects": ["DISCARD_OWNER_NEUTRAL_ROUTE", "PRESERVE_AUTHENTICATED_SESSION"],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T35",
    "source": "SESSION_ENDED",
    "event": "SIGN_IN_RETURN_REJECTED",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "SIGN_IN_RETURN_RESULT_ACTIVITY_UNAVAILABLE"
    ],
    "effects": ["DISCARD_OWNER_NEUTRAL_ROUTE", "PRESERVE_AUTHENTICATED_SESSION"],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T36",
    "source": "SESSION_ENDED",
    "event": "SIGN_IN_CANCELED",
    "guards": ["ALWAYS"],
    "effects": ["STOP_INTERNAL_SIGN_IN"],
    "target": "SESSION_ENDED",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T37",
    "source": "ACCESS_BLOCKED",
    "event": "RETURN_TO_LEARNING",
    "guards": ["ALWAYS"],
    "effects": ["CLEAR_UNCONFIRMED_ANSWER", "PRESERVE_AUTHENTICATED_SESSION"],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T38",
    "source": "ACCESS_BLOCKED",
    "event": "SESSION_INVALID",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SESSION_INVALID"],
    "effects": [
      "FENCE_LATE_RESULTS",
      "PRESERVE_CONFIRMED_SERVER_PROGRESS",
      "PRESERVE_OWNER_NEUTRAL_ROUTE",
      "CLEAR_AUTH_BOUND_WORK",
      "CLEAR_OWNER_BOUND_CLIENT_STATE",
      "CLEAR_UNCONFIRMED_ANSWER",
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_RETRY_CONTEXT",
      "CLEAR_OFFLINE_CONTEXT"
    ],
    "target": "SESSION_ENDED",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T39",
    "source": "EMPTY_REVIEW",
    "event": "CONTINUE_LEARNING",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "SERVER_SELECTED_NEXT_AVAILABLE"
    ],
    "effects": ["REQUEST_SERVER_SELECTED_ACTIVITY", "CLEAR_REVIEW_CONTEXT"],
    "target": "PREPARING",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T40",
    "source": "EMPTY_REVIEW",
    "event": "CONTINUE_LEARNING",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "NO_SERVER_SELECTED_ACTIVITY"],
    "effects": ["CLEAR_REVIEW_CONTEXT"],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T41",
    "source": "EMPTY_REVIEW",
    "event": "SESSION_INVALID",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SESSION_INVALID"],
    "effects": [
      "FENCE_LATE_RESULTS",
      "PRESERVE_CONFIRMED_SERVER_PROGRESS",
      "PRESERVE_OWNER_NEUTRAL_ROUTE",
      "CLEAR_AUTH_BOUND_WORK",
      "CLEAR_OWNER_BOUND_CLIENT_STATE",
      "CLEAR_UNCONFIRMED_ANSWER",
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_RETRY_CONTEXT",
      "CLEAR_OFFLINE_CONTEXT"
    ],
    "target": "SESSION_ENDED",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T42",
    "source": "EMPTY_REVIEW",
    "event": "NETWORK_OFFLINE",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "NETWORK_OFFLINE"],
    "effects": ["SET_OFFLINE_ORIGIN_PREPARE", "PRESERVE_SAFE_DISPLAY_PREFERENCES"],
    "target": "OFFLINE_READ_ONLY",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T43",
    "source": "OFFLINE_READ_ONLY",
    "event": "RECONNECT",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "NETWORK_ONLINE",
      "OFFLINE_ORIGIN_PREPARE"
    ],
    "effects": ["CLEAR_OFFLINE_CONTEXT"],
    "target": "PREPARING",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T44",
    "source": "OFFLINE_READ_ONLY",
    "event": "RECONNECT",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "NETWORK_ONLINE",
      "OFFLINE_ORIGIN_ACTIVE",
      "RECONNECT_RESULT_VALID",
      "AUTH_SAME_OWNER",
      "SERVER_AUTHORIZED",
      "SERVER_ENTITLED",
      "CONTENT_VERSION_CURRENT",
      "ACTIVITY_AVAILABLE"
    ],
    "effects": ["RESTORE_EPHEMERAL_ANSWER", "CLEAR_OFFLINE_CONTEXT"],
    "target": "ACTIVE",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T45",
    "source": "OFFLINE_READ_ONLY",
    "event": "RECONNECT_REJECTED",
    "guards": [
      "CURRENT_AUTH_GENERATION",
      "CURRENT_ASYNC_OPERATION",
      "RECONNECT_RESULT_OWNER_CHANGED"
    ],
    "effects": [
      "CLEAR_EPHEMERAL_ANSWER",
      "CLEAR_OFFLINE_CONTEXT",
      "CLEAR_PREVIOUS_OWNER_CLIENT_STATE",
      "PRESERVE_CURRENT_AUTHENTICATED_SESSION"
    ],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  },
  {
    "id": "T46",
    "source": "OFFLINE_READ_ONLY",
    "event": "RECONNECT_REJECTED",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "RECONNECT_RESULT_REVALIDATE"],
    "effects": ["CLEAR_EPHEMERAL_ANSWER", "CLEAR_OFFLINE_CONTEXT"],
    "target": "PREPARING",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T47",
    "source": "OFFLINE_READ_ONLY",
    "event": "SESSION_INVALID",
    "guards": ["CURRENT_AUTH_GENERATION", "CURRENT_ASYNC_OPERATION", "SESSION_INVALID"],
    "effects": [
      "FENCE_LATE_RESULTS",
      "PRESERVE_CONFIRMED_SERVER_PROGRESS",
      "PRESERVE_OWNER_NEUTRAL_ROUTE",
      "CLEAR_AUTH_BOUND_WORK",
      "CLEAR_OWNER_BOUND_CLIENT_STATE",
      "CLEAR_UNCONFIRMED_ANSWER",
      "CLEAR_SUBMISSION_CONTEXT",
      "CLEAR_RETRY_CONTEXT",
      "CLEAR_OFFLINE_CONTEXT"
    ],
    "target": "SESSION_ENDED",
    "externalDestination": null,
    "durableEffect": "NONE"
  },
  {
    "id": "T48",
    "source": "OFFLINE_READ_ONLY",
    "event": "EXIT",
    "guards": ["ALWAYS"],
    "effects": ["CLEAR_EPHEMERAL_ANSWER", "CLEAR_OFFLINE_CONTEXT"],
    "target": null,
    "externalDestination": "LEARNING_HOME",
    "durableEffect": "NONE"
  }
]
```

### Closed asynchronous result fence

`LearningAsyncSource` is exactly `PREPARING | ACTIVE | SUBMITTING | CONFIRMED | RETRYABLE_ERROR | STALE_CONTENT | SESSION_ENDED | ACCESS_BLOCKED | EMPTY_REVIEW | OFFLINE_READ_ONLY`. `LearningAsyncResult` is exactly `PLAN_READY | REVIEW_EMPTY | ACCESS_DENIED | PREPARE_FAILED | SESSION_INVALID | NETWORK_OFFLINE | ATTEMPT_CONFIRMED | SUBMIT_FAILED | CONTENT_STALE | NEXT_AVAILABLE | NO_NEXT_AVAILABLE | SIGN_IN_VALID | SIGN_IN_OWNER_CHANGED | SIGN_IN_AUTHORIZATION_DENIED | SIGN_IN_ENTITLEMENT_DENIED | SIGN_IN_CONTENT_STALE | SIGN_IN_ACTIVITY_UNAVAILABLE | RECONNECT_PREPARE | RECONNECT_VALID | RECONNECT_OWNER_CHANGED | RECONNECT_REVALIDATE`. `LearningAsyncEvent` is exactly `PLAN_READY | REVIEW_EMPTY | ACCESS_DENIED | PREPARE_FAILED | SESSION_INVALID | NETWORK_OFFLINE | ATTEMPT_CONFIRMED | SUBMIT_FAILED | CONTENT_STALE | CONTINUE | SIGN_IN_RETURN_VALID | SIGN_IN_RETURN_REJECTED | CONTINUE_LEARNING | RECONNECT | RECONNECT_REJECTED`.

`LearningAsyncResultEnvelopeV1` has exactly the keys `{ schemaVersion: 1; source: LearningAsyncSource; event: LearningAsyncEvent; result: LearningAsyncResult; authGeneration: AuthGenerationToken; operationGeneration: AsyncOperationToken }`. `AuthGenerationToken` and `AsyncOperationToken` are opaque in-memory identity tokens: they are not strings, numbers, serializable values, public exports, diagnostics, logs, persisted state, network values, telemetry, or evidence. The envelope and its tokens are discarded after settlement. Validated result data stays operation-owned until the fence and row guards pass.

The normalizer accepts exactly these 34 source/result/event/row tuples:

| Source              | Result                         | Event                     | Row   |
| ------------------- | ------------------------------ | ------------------------- | ----- |
| `PREPARING`         | `PLAN_READY`                   | `PLAN_READY`              | `T01` |
| `PREPARING`         | `REVIEW_EMPTY`                 | `REVIEW_EMPTY`            | `T02` |
| `PREPARING`         | `ACCESS_DENIED`                | `ACCESS_DENIED`           | `T03` |
| `PREPARING`         | `PREPARE_FAILED`               | `PREPARE_FAILED`          | `T04` |
| `PREPARING`         | `SESSION_INVALID`              | `SESSION_INVALID`         | `T05` |
| `PREPARING`         | `NETWORK_OFFLINE`              | `NETWORK_OFFLINE`         | `T06` |
| `ACTIVE`            | `ACCESS_DENIED`                | `ACCESS_DENIED`           | `T09` |
| `ACTIVE`            | `SESSION_INVALID`              | `SESSION_INVALID`         | `T10` |
| `ACTIVE`            | `NETWORK_OFFLINE`              | `NETWORK_OFFLINE`         | `T11` |
| `SUBMITTING`        | `ATTEMPT_CONFIRMED`            | `ATTEMPT_CONFIRMED`       | `T13` |
| `SUBMITTING`        | `SUBMIT_FAILED`                | `SUBMIT_FAILED`           | `T14` |
| `SUBMITTING`        | `CONTENT_STALE`                | `CONTENT_STALE`           | `T15` |
| `SUBMITTING`        | `ACCESS_DENIED`                | `ACCESS_DENIED`           | `T16` |
| `SUBMITTING`        | `SESSION_INVALID`              | `SESSION_INVALID`         | `T17` |
| `CONFIRMED`         | `NEXT_AVAILABLE`               | `CONTINUE`                | `T19` |
| `CONFIRMED`         | `REVIEW_EMPTY`                 | `REVIEW_EMPTY`            | `T20` |
| `RETRYABLE_ERROR`   | `SESSION_INVALID`              | `SESSION_INVALID`         | `T24` |
| `STALE_CONTENT`     | `SESSION_INVALID`              | `SESSION_INVALID`         | `T27` |
| `SESSION_ENDED`     | `SIGN_IN_VALID`                | `SIGN_IN_RETURN_VALID`    | `T30` |
| `SESSION_ENDED`     | `SIGN_IN_OWNER_CHANGED`        | `SIGN_IN_RETURN_REJECTED` | `T31` |
| `SESSION_ENDED`     | `SIGN_IN_AUTHORIZATION_DENIED` | `SIGN_IN_RETURN_REJECTED` | `T32` |
| `SESSION_ENDED`     | `SIGN_IN_ENTITLEMENT_DENIED`   | `SIGN_IN_RETURN_REJECTED` | `T33` |
| `SESSION_ENDED`     | `SIGN_IN_CONTENT_STALE`        | `SIGN_IN_RETURN_REJECTED` | `T34` |
| `SESSION_ENDED`     | `SIGN_IN_ACTIVITY_UNAVAILABLE` | `SIGN_IN_RETURN_REJECTED` | `T35` |
| `ACCESS_BLOCKED`    | `SESSION_INVALID`              | `SESSION_INVALID`         | `T38` |
| `EMPTY_REVIEW`      | `NEXT_AVAILABLE`               | `CONTINUE_LEARNING`       | `T39` |
| `EMPTY_REVIEW`      | `NO_NEXT_AVAILABLE`            | `CONTINUE_LEARNING`       | `T40` |
| `EMPTY_REVIEW`      | `SESSION_INVALID`              | `SESSION_INVALID`         | `T41` |
| `EMPTY_REVIEW`      | `NETWORK_OFFLINE`              | `NETWORK_OFFLINE`         | `T42` |
| `OFFLINE_READ_ONLY` | `RECONNECT_PREPARE`            | `RECONNECT`               | `T43` |
| `OFFLINE_READ_ONLY` | `RECONNECT_VALID`              | `RECONNECT`               | `T44` |
| `OFFLINE_READ_ONLY` | `RECONNECT_OWNER_CHANGED`      | `RECONNECT_REJECTED`      | `T45` |
| `OFFLINE_READ_ONLY` | `RECONNECT_REVALIDATE`         | `RECONNECT_REJECTED`      | `T46` |
| `OFFLINE_READ_ONLY` | `SESSION_INVALID`              | `SESSION_INVALID`         | `T47` |

Settlement is atomic and ordered: validate the exact six-key schema and closed enums; compare the auth-generation token by identity; compare the operation-generation token by identity; require `source` to equal the current state; require exact table membership; run sign-in/reconnect classification and the selected row guards against the same immutable snapshot; atomically compare-and-consume the operation token; return exactly one row; only then release operation-owned data and execute effects. Replay returns no row. Direct dispatch of an asynchronous event without a normalized envelope is rejected.

An authentication change invalidates every operation. Starting or restarting asynchronous work rotates the source-state operation token. Leaving the state, `EXIT`, cancellation, `FENCE_LATE_RESULTS`, or accepted settlement invalidates or consumes the operation token. Leave and re-enter of the same state creates a new token, so the prior result is stale. A stale auth or operation token yields zero event, effect, navigation, external destination, cleanup, write, route use or discard, answer mutation, submission mutation, activity request, and progress mutation; it does not consume the current operation token. All 34 asynchronous rows begin with `CURRENT_AUTH_GENERATION`, `CURRENT_ASYNC_OPERATION`. The synchronous/initiation complement is exactly `T07`, `T08`, `T12`, `T18`, `T21`, `T22`, `T23`, `T25`, `T26`, `T28`, `T29`, `T36`, `T37`, `T48`; none gains `CURRENT_ASYNC_OPERATION`. `T08` and `T23` remain current-auth-generation initiators.

### Closed sign-in-return and reconnect normalization

`SignInReturnResult` is exactly `VALID | OWNER_CHANGED | AUTHORIZATION_DENIED | ENTITLEMENT_DENIED | CONTENT_STALE | ACTIVITY_UNAVAILABLE | INVALID`. It is computed once from one immutable validation snapshot that includes required `currentGeneration: boolean`, after the outer asynchronous fence passes. The first normalization rule is `if (!snapshot.complete || !snapshot.currentGeneration) return INVALID`, before any other classification. Its remaining priority is owner change, then same-owner authorization denial, entitlement denial, stale content, unavailable activity, and finally fully valid. `INVALID` emits no graph event and remains in `SESSION_ENDED`. A stale-generation result executes no T30–T35 effect: it does not use or discard the owner-neutral route, request an activity, navigate, clear or write owner state, replace or preserve a session, or reflect progress; current state and data remain unchanged. The exhaustive regression covers all `2^10` sign-in snapshots after that fence. Exactly one normalized result and at most one graph event may be produced.

`ReconnectResult` is exactly `VALID | OWNER_CHANGED | REVALIDATE | INVALID`. It is computed only after the outer asynchronous fence, network restoration, and current-generation validation, using fresh post-reconnect server authorization, entitlement, content-version, and activity-availability evidence. Its priority is owner change, then any same-owner authorization denial, entitlement denial, stale content, or unavailable activity as `REVALIDATE`, and finally fully valid. Cached evidence, stale-generation evidence, or missing fresh evidence yields `INVALID`, emits no graph event, and never restores an answer. The exhaustive regression covers all `2^9` reconnect snapshots after that fence. Exactly one normalized result and at most one graph event may be produced.

The closed transient context is `RetryOrigin = prepare | submit | null`, `OfflineOrigin = prepare | active | null`, and `OwnerNeutralReturnRoute = learning_session_entry | null`. Every transient field and normalization snapshot/result is memory-only, unlogged, unpersisted, and excluded from telemetry and retained evidence. `OwnerNeutralReturnRoute` accepts only the literal `learning_session_entry`; it cannot contain a path, query, fragment, activity ID, content ID, owner ID, URL, or arbitrary string. The learning module stores no owner ID. The authentication coordinator supplies the normalized sign-in-return or reconnect result; the learning module never infers owner identity.

A submit retry reuses the same opaque submission idempotency key. A prepare retry has no submission idempotency key. `SUBMITTING|SUBMIT_FAILED` is the network-failure path; submitting never transitions to offline read-only. Only a server-confirmed attempt may be reflected as progress, and T13 is the sole durable-effect row. Repeated source/event pairs are allowed only where the manifest shows mutually exclusive guards. Every entry to `SESSION_ENDED` preserves only the literal owner-neutral `learning_session_entry` route, never an activity, owner, URL, path, query, fragment, or content value. A sign-in return reaches T30 only after identity, same-owner, authorization, entitlement, content-version, activity-availability, and exact route validation; T31–T35 discard the route and go to learning home.

Only `CONFIRMED` may reflect a canonical progress change already committed by the server. Late results after exit, authentication-generation change, or content-version change are discarded.

The three terminal and recovery rows are authoritative:

| State            | Exact heading, body, and primary action                                                                                                                                           | Preserve and clear                                                                                                                                                                                               | Safe destination                                                                              | Focus and announcement                                                                                                                                                                         | Mutation boundary                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `SESSION_ENDED`  | **Your session ended** — “Sign in again to continue safely. Your confirmed progress hasn’t changed.” Primary: **Sign in**.                                                        | Preserve confirmed server progress and the allowlisted return destination. Clear or fence auth-bound work. Retain no owner-bound client state. Never carry an unconfirmed answer across the signed-out boundary. | Internal sign-in, then only the allowlisted learning destination after identity confirmation. | Focus the heading once on session loss. Announce the heading and body assertively once as one deduplicated message; no duplicate focus or live-region output.                                  | Entering, displaying, or leaving this state cannot complete an activity or mutate progress or awards. |
| `ACCESS_BLOCKED` | **You can’t open this activity** — “This activity isn’t available for your account right now. Return to learning to choose something available.” Primary: **Return to learning**. | Preserve confirmed progress and unrelated safe navigation. Stop the attempt. Do not submit or retain an unconfirmed answer as progress. Keep the user signed in.                                                 | Current learning home or curriculum filtered to activities the server says are available.     | Focus the heading once after the access decision. Announce assertively once without entitlement, subscription, provider, or diagnostic detail.                                                 | No activity completion, goal change, review-eligibility change, reward, or progress mutation.         |
| `EMPTY_REVIEW`   | **Nothing to review right now** — “You can continue with your next activity.” Primary: **Continue learning**.                                                                     | Preserve confirmed progress, curriculum position, and safe display preferences. Create no synthetic review item or hidden completion.                                                                            | Server-selected next available activity; fall back to learning home when none exists.         | On client-side entry, focus the heading once; on direct load, retain normal focus order. Announce politely once when an existing list becomes empty; do not repeat on reload or recomposition. | No activity completion, goal change, or manufactured review progress.                                 |

## Dependency-safe phase sequence

| Phase | Scope                                                                                          | Explicit exclusions                                                                                  | Exit evidence                                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| R0    | This evidence report, dated plan, ADR 0007, repository links, and regression test              | No runtime code, dependency, schema, API, UI, vendor, external action, or product claim              | Provenance classified; originality and unknowns explicit; specialist reviews; Elana exact-head PASS              |
| R1    | Shared `LearningSessionPlanV1` and `LearningOperationalPolicyV1` closed types plus tests       | No API, DB, UI, SDK, telemetry transport, notification delivery, or hosted flags                     | Deterministic serialization; closed records; unknown-field rejection; disabled default; zero schema delta        |
| R2    | Read-only zero-or-one session planner over ADR 0005 authority                                  | No progress mutation, new projection table, offline write, social, economy, or new entitlement       | `reason: "next"`; owner and entitlement enforcement; stable ordering; existing dashboard fallback                |
| R3    | Static repository kill switch, typed no-op operational sink, failure isolation, rollback drill | No analytics ingestion, crash exporter, remote flags, stable device/owner IDs, or production rollout | Malformed/unavailable policy disables optional feature; sink failure is isolated; sanitized rollback proof       |
| R4-A  | Dated UX/visual specification and Break-UI catalog                                             | No UI implementation                                                                                 | Camila flow/accessibility and Daniela originality/tokens/motion accepted                                         |
| R4-B  | Web-only Conversation Canvas behind the approved boundary                                      | No native, audio, reminder, social, competition, commerce, public campaign, or offline-write claim   | Full states; 390px and desktop; 200% text; RTL; keyboard/screen reader; runtime/build/start evidence; Elana PASS |

R1 may begin only after R0 merges, all post-main checks pass, and ADR 0007 is recorded as accepted at an exact head reviewed by the required specialists and Elana. R1 implements only the shared files and closed contracts named above. R1 begins only after R0 merges under this exact phase lock. Every phase uses a separate small branch and pull request.

## R1 contract requirements

### Exact seven-file map and dependency edges

R1 changes only these seven files:

```text
packages/shared/src/learning-contract-json.ts
packages/shared/src/learning-contract-json.test.ts
packages/shared/src/learning-session-plan.ts
packages/shared/src/learning-session-plan.test.ts
packages/shared/src/learning-operational-policy.ts
packages/shared/src/learning-operational-policy.test.ts
packages/shared/src/index.ts
```

No R1 change is permitted under:

```text
apps/api/
apps/web/
apps/ios/
apps/android/
apps/api/prisma/
.github/
contracts/
package.json
package-lock.json
```

R1 adds no dependency, environment variable, workflow, Prisma/OpenAPI artifact, API route, UI, SDK, hosted integration, database object, fixture toggle, or runtime consumer.
No Prisma, OpenAPI, workspace dependency, environment variable, UI, workflow, or hosted integration changes are allowed in R1.

```text
learning-session-plan.ts ───────┐
                                ├─ imports learning-contract-json.ts
learning-operational-policy.ts ─┘

learning-contract-json.ts
  └─ no project import, I/O, network, storage, process environment,
     global clock, or third-party dependency

packages/shared/src/index.ts
  ├─ exports learning-session-plan.ts public types/functions
  └─ exports learning-operational-policy.ts public types/functions

learning-session-plan.test.ts
  └─ imports learning-session-plan.ts

learning-operational-policy.test.ts
  └─ imports learning-operational-policy.ts

apps/api and apps/web
  └─ no R1 dependency edge to either new module
```

`learning-contract-json.ts` is package-internal and is not re-exported from `index.ts`.

R2 may later add a server-side planner adapter. R3 may later add a policy consumer. Neither edge exists in R1.

### Shared raw JSON boundary

```ts
export const LEARNING_CONTRACT_JSON_MAX_BYTES = 1_024 as const;

export type LearningContractJsonFailure =
  "missing" | "oversize" | "invalid_utf8" | "invalid_json" | "duplicate_key";

export type LearningContractJsonDecodeResult =
  { ok: true; value: unknown } | { ok: false; reason: LearningContractJsonFailure };

export function decodeLearningContractJson(
  rawUtf8Json: Uint8Array,
): LearningContractJsonDecodeResult;
```

Closed decoder behavior:

1. The function immediately copies the exact `Uint8Array` view. Length, decoding, duplicate detection, and parsing all use that immutable snapshot.
2. Zero bytes return `missing`; more than 1,024 bytes return `oversize`.
3. Fatal UTF-8 validation maps invalid, truncated, or overlong encodings to `invalid_utf8`.
4. A UTF-8 BOM, trailing non-whitespace content, malformed JSON grammar, invalid escape, or unpaired surrogate returns `invalid_json`.
5. Parsing is dependency-free and duplicate-aware. It does not use `JSON.parse` or a reviver for duplicate detection.
6. Object keys are compared after JSON escape decoding, so `"a"` plus `"\u0061"` in the same object returns `duplicate_key`.
7. Duplicate detection is scoped per object. The same key in distinct nested objects is allowed.
8. Objects are constructed without invoking `__proto__`, setters, or inherited properties. Contract validators subsequently reject all unknown keys.
9. The result contains only a value or fixed reason. It never returns input text, key names, offsets, paths, stacks, or partial objects.
10. The caller's byte array is not mutated.

Required decoder tests cover valid object, array, primitive, and surrounding JSON whitespace; empty input; exact 1,024-byte valid input and 1,025-byte rejection; invalid, truncated, and overlong UTF-8; BOM and trailing-document rejection; root and nested duplicate keys; escaped-equivalent duplicate keys; the same key in separate objects; malformed escapes and unpaired surrogates; `__proto__`, `constructor`, and inherited-property safety; input immutability; and fixed non-disclosing failures.

### `LearningSessionPlanV1`

The plan cannot mutate progress; a null, invalid, absent, or later disabled plan preserves the existing dashboard behavior.

```ts
export const LEARNING_SESSION_PLAN_SCHEMA_VERSION = 1 as const;
export const LEARNING_SESSION_REASONS = ["next"] as const;

export interface LearningSessionPlanItemV1 {
  activityId: string;
  contentVersion: number;
  reason: "next";
}

export interface LearningSessionPlanV1 {
  schemaVersion: 1;
  item: LearningSessionPlanItemV1 | null;
}

export type LearningSessionPlanFailure = LearningContractJsonFailure | "invalid_shape";

export type LearningSessionPlanParseResult =
  { ok: true; value: LearningSessionPlanV1 } | { ok: false; reason: LearningSessionPlanFailure };

export function parseLearningSessionPlanV1(rawUtf8Json: Uint8Array): LearningSessionPlanParseResult;
```

Atomic parser flow:

1. Snapshot and decode through `decodeLearningContractJson`.
2. Propagate only its fixed failure reason.
3. Validate the decoded value against the exact closed `LearningSessionPlanV1` shape.
4. Reject missing, unknown, inherited, or incorrectly typed fields as `invalid_shape`.
5. Return no partial plan and perform no normalization.

Closed validation rules:

1. The root keys are exactly `schemaVersion` and `item`.
2. `schemaVersion` is exactly numeric literal `1`.
3. `item: null` is the only zero-result representation.
4. A non-null `item` has exactly `activityId`, `contentVersion`, and `reason`.
5. `activityId` is a canonical lowercase RFC 4122 UUID v4.
6. `contentVersion` is a positive JavaScript safe integer.
7. `reason` is exactly `"next"`.
8. Unknown, missing, inherited, or incorrectly typed fields fail with `invalid_shape`; duplicate rejection already occurred at the raw JSON boundary before object construction.
9. Invalid input is never partially accepted or normalized into a plan.
10. A valid plan is read-only. It contains no prompt, answer, feedback, owner, email, entitlement, progress, reward, economy, analytics, URL, endpoint, or arbitrary metadata.
11. `item: null` or an invalid/absent plan preserves the existing dashboard behavior.
12. Parsing is dependency-free and side-effect-free. It accepts raw `Uint8Array` JSON and returns `LearningSessionPlanParseResult`; it throws no user-data-bearing diagnostic.

Required tests cover every decoder failure; valid null and item; uppercase/non-v4/malformed UUIDs; zero/negative/fractional/unsafe versions; wrong reason and schema; every missing/extra root and nested key; arrays; primitives; inherited properties; and input immutability.

### `LearningOperationalPolicyV1`

The policy is default-disabled and cannot be enabled by a client. Invalid or unavailable input remains fail-closed.

```ts
export const LEARNING_OPERATIONAL_POLICY_SCHEMA_VERSION = 1 as const;

export const LEARNING_POLICY_ENVIRONMENTS = ["development", "staging", "production"] as const;

export interface LearningOperationalPolicyV1 {
  schemaVersion: 1;
  policyId: "learning_operational_policy";
  environment: "development" | "staging" | "production";
  sourceDigest: `sha256:${string}`;
  issuedAtUtc: string;
  expiresAtUtc: string;
  switches: {
    LEARNING_SESSION_PLAN_ENABLED: boolean;
  };
}

export type LearningOperationalPolicyFailure =
  | LearningContractJsonFailure
  | "invalid_context"
  | "invalid_shape"
  | "unsupported_schema"
  | "environment_mismatch"
  | "source_mismatch"
  | "not_yet_valid"
  | "expired"
  | "lifetime_exceeded"
  | "production_enabled";

export type LearningOperationalPolicyEvaluation =
  | {
      ok: true;
      value: LearningOperationalPolicyV1;
      effective: { LEARNING_SESSION_PLAN_ENABLED: boolean };
    }
  | {
      ok: false;
      reason: LearningOperationalPolicyFailure;
      effective: { LEARNING_SESSION_PLAN_ENABLED: false };
    };

export function evaluateLearningOperationalPolicyV1(
  rawUtf8Json: Uint8Array,
  context: {
    expectedEnvironment: "development" | "staging" | "production";
    expectedSourceDigest: `sha256:${string}`;
    nowUtc: string;
  },
): LearningOperationalPolicyEvaluation;
```

`utf8ByteLength` is not caller-controlled. The evaluator computes length internally from the same immutable byte snapshot that it decodes and validates.

Context is validated before policy decoding, so it has deterministic precedence over document failures:

1. `expectedEnvironment` is exactly one allowed environment.
2. `expectedSourceDigest` is `sha256:` followed by exactly 64 lowercase hexadecimal characters.
3. `nowUtc` matches `YYYY-MM-DDTHH:mm:ssZ` and parses and round-trips to the identical whole-second UTC string.
4. Offsets, fractional seconds, impossible calendar dates, lowercase `z`, missing `Z`, surrounding whitespace, non-string values, and invalid dates return `invalid_context`.
5. `invalid_context` always evaluates `LEARNING_SESSION_PLAN_ENABLED` to `false`.

Atomic evaluation order is exact:

```text
validate runtime context
  → snapshot raw bytes
  → enforce 1,024-byte limit
  → fatal UTF-8 decode
  → duplicate-aware JSON parse
  → exact closed policy-shape validation
  → canonical issued/expires validation
  → environment/source comparison
  → lifetime and half-open time evaluation
  → production-enable rejection
  → bounded success or fail-closed result
```

Closed envelope and bound rules:

1. UTF-8 input is at most **1,024 bytes**.
2. Root keys are exactly `schemaVersion`, `policyId`, `environment`, `sourceDigest`, `issuedAtUtc`, `expiresAtUtc`, and `switches`.
3. `schemaVersion` is exactly `1`.
4. `policyId` is exactly `"learning_operational_policy"`.
5. `environment` is exactly one allowed literal.
6. `sourceDigest` matches `sha256:` followed by exactly 64 lowercase hexadecimal characters.
7. The validator compares `sourceDigest` with the explicitly injected expected digest; it does not read Git or hash files.
8. `issuedAtUtc` and `expiresAtUtc` are canonical round-trip UTC whole-second strings, `YYYY-MM-DDTHH:mm:ssZ`.
9. `issuedAtUtc < expiresAtUtc`.
10. Maximum lifetime is **604,800 seconds (7 days)**.
11. Validity is half-open: `issuedAtUtc <= nowUtc < expiresAtUtc`.
12. The caller injects validated `expectedEnvironment`, `expectedSourceDigest`, and `nowUtc`; the module reads no process environment or global clock.
13. `switches` contains exactly one entry: `LEARNING_SESSION_PLAN_ENABLED`.
14. Maximum switch-entry count is **1**.
15. Missing, malformed, oversized, unsupported, environment-mismatched, source-mismatched, future-issued, expired, or over-lifetime policy evaluates fail-closed to `false`.
16. A production policy with `LEARNING_SESSION_PLAN_ENABLED: true` fails as `production_enabled` and evaluates to `false`.
17. A valid development or staging policy may preserve its boolean value in `effective`, but R1 has no runtime consumer and enables nothing.
18. Unknown fields at any depth fail. Values are not coerced.
19. Evaluation returns only the bounded reason enum and never raw input, paths, stack traces, identifiers, or policy contents.

Required tests cover every valid environment; default false; valid non-production true; production true rejection; exact 1,024/1,025-byte boundary; zero/extra switch entries; upper/lowercase and malformed digests; source/environment mismatch; duplicate root and nested policy keys; issue/expiry exact boundaries; `nowUtc === issuedAtUtc` success; `nowUtc === expiresAtUtc` expiry; offsets; fractional seconds; impossible dates; lowercase or missing `Z`; surrounding whitespace; non-string `nowUtc`; invalid expected environment; malformed expected digest; maximum lifetime and +1 second; unsupported schema; every missing/extra field; nested extras; coercion attempts; injected-clock determinism; input immutability; the same measured and parsed immutable byte snapshot; absence of caller-controlled negative, fractional, `NaN`, or false-small byte lengths; fail-closed invalid context; and bounded non-disclosing reasons.

## Security and privacy acceptance

1. Learning Core retains exclusive authority for owner, access, catalog, attempts, progress, goals, streaks, rewards, social relationships, experiments, and deletion state.
2. Every future mutation requires owner binding, authorization, idempotency, versioning, stale-response rejection, and generation/write fencing.
3. R0–R4 collect no contacts and add no child/social/leaderboard/UGC/advertising/purchase/notification behavior.
4. Child or unknown cohorts use the protective state; no profiling, public visibility, purchase pressure, or notification pressure is inferred.
5. Experience-operational events are typed no-op records. Allowed values are bounded schema version, policy/scenario identifier, enumerated outcome, result, and duration bucket where explicitly defined.
6. Forbidden values include identities, record IDs, activity or lesson IDs, email, tokens, codes, URLs, query strings, provider payloads, device/install IDs, accessibility settings, correlation IDs, answer or free text, file paths, and raw exceptions or stacks.
7. Optional controls stop collection and processing as well as presentation.
8. Offline cache, when later accepted, must be encrypted, owner-partitioned, versioned, expiring, no-backup, and fail-closed. R0–R4 implement no offline write queue.

## UX and visual acceptance

The 390px-first flow is:

`setup → editable goal → start from beginning → prepare → answer → check → confirmed feedback → continue or finish → confirmed progress`

The learner-flow ID order is closed:

```json
[
  "setup",
  "editable_goal",
  "start_from_beginning",
  "prepare",
  "answer",
  "check",
  "confirmed_feedback",
  "continue_or_finish",
  "confirmed_progress"
]
```

The experience-state ID order is closed:

```json
[
  "PREPARING",
  "ACTIVE",
  "SUBMITTING",
  "CONFIRMED",
  "RETRYABLE_ERROR",
  "STALE_CONTENT",
  "SESSION_ENDED",
  "ACCESS_BLOCKED",
  "EMPTY_REVIEW",
  "OFFLINE_READ_ONLY"
]
```

Placement is omitted. One scroll surface contains the top bar, textual progress, prompt, response, feedback/recovery, and action region in reading order. Targets are at least 44px; inputs use at least 16px text; the only action remains reachable at 200% text and compact landscape. Progress has a semantic name and value. Focus, headings, announcements, status, and recovery are deterministic and do not rely on color alone.

The original visual direction is **Conversation Canvas**, using Fluyo paper/ink/cobalt/coral/sun/mint tokens and a clipped lower-start corner. Focus is a 3px cobalt ring plus offset on light surfaces and a 3px sun ring plus offset on dark surfaces. Motion is state-bound and interruptible: 120ms press, 140ms selection, 180ms entry, 220ms confirmed transition, and 240ms progress, each with a static reduced-motion equivalent. No infinite animation, shimmer, floating loop, pulsing call to action, confetti, mascot, shake, or celebration before confirmation is allowed.

Required viewport evidence: 320×568, 390×844, 430px phone, compact landscape, 768px, and at least 1200px; each relevant state also covers 200% text, English pseudolocale expansion, `ar-XB`, keyboard, light/dark, and the 15 Break-UI fixtures listed in the evidence report.

The Break-UI fixture ID order is closed:

```json
[
  "long_localized_prompt_and_choices",
  "rtl_mixed_script_activity",
  "large_text_compact_landscape",
  "one_character_and_multiline_answers",
  "empty_activity_catalog",
  "network_loss_during_submit",
  "duplicate_submit",
  "stale_content_version",
  "late_confirmation_after_exit",
  "authentication_expired",
  "entitlement_blocked",
  "offline_saved_material",
  "corrupt_cache_recovery",
  "protected_mode_unknown_cohort",
  "missing_optional_explanation"
]
```

Every fixture preserves meaningful headings, names, roles, logical focus order, one-time announcements, 200% text reflow, reachable 44px targets, non-color state, and a static reduced-motion equivalent. Motion remains bounded and interruptible. Fixtures may demonstrate only the accepted learning flow and recovery states; placement, audio, notifications, social features, competition, economy, ads, purchases, experiments, child-specific behavior, offline writes, native learning, and downloadable content remain deferred and unavailable.

## Reliability and rollback acceptance

| Failure                                                    | Required behavior                                        |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| Planner throws                                             | Existing next-activity/dashboard fallback remains usable |
| Optional projection throws                                 | Omit the optional card; Learning Core remains usable     |
| Policy is missing, stale, malformed, or build-incompatible | Optional feature is disabled                             |
| No-op sink throws                                          | Learner action and progress are unchanged                |
| Cache owner/version mismatch                               | Purge and refetch; never reveal another owner            |
| Candidate catalog is invalid                               | Preserve last-known-good catalog pointer                 |
| Build is stale                                             | Disable optional experience                              |

Rollback disables the optional module first, verifies Learning Core and attempt idempotency, reverts the application commit if necessary, and records only sanitized source, schema, scenario, outcome, result, artifact hash, and scan evidence. There is no database rollback in R1 because R1 has no schema change.

## Measurement and claim rules

- Correctness measures use exact counts: contract vectors, deterministic plans, zero duplicate awards, and zero forbidden retained fields.
- Exposure, completion, duration, performance, and reliability are descriptive until a separately accepted target exists.
- Every future experiment defines metric version, denominator, eligibility, unit, allocation, platform, locale, build, timezone, and observation window before collection.
- Reports include raw counts, absolute and relative effects, and uncertainty. Correlation, controlled experiment, synthetic test, and runtime observation are labeled separately.
- Engagement cannot be presented as learning efficacy.
- Duolingo's published figures and proprietary metrics are historical reference only and cannot become Fluyo forecasts, defaults, weights, SLOs, or success claims.

## 13-agent responsibility and handoff ledger

| Agent            | Bounded responsibility                            | Required evidence                                             | Handoff                                          |
| ---------------- | ------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| Adriana Solano   | Orchestration, scope, PR sequence, merge/status   | Exact-head gate reconciliation                                | Dispatch and advance only after Elana PASS       |
| Bianca Morales   | Records, dates, filenames, ledgers, handoff       | Cross-document owner/link/status reconciliation               | Today / Waiting / Needs you / Tomorrow           |
| Gabriela Mendoza | Official/public research                          | URL/date provenance; observation/inference/unknown separation | Evidence to Catalina, Isabella, Julieta          |
| Catalina Moreno  | Architecture, interfaces, dependencies, rollback  | ADR, file map, state/authority contract                       | Buildable boundary to Valentina                  |
| Natalia Ortega   | Threat, privacy, child/data/external boundaries   | Abuse cases, no-go list, telemetry/storage constraints        | Defects to Catalina/Valentina; evidence to Elana |
| Renata Vega      | Reproducible environment, CI, controls, rollback  | Clean commands, failure matrix, sanitized evidence            | Runbook and exact commands                       |
| Camila Reyes     | Learning flow, states, accessibility, Break-UI    | State table, focus, 200% text, targets, recovery fixtures     | UX criteria to Daniela/Catalina/Valentina        |
| Daniela Vargas   | Original visual system, responsive layout, motion | Token/contrast/motion table; similarity review                | Approved design spec to Valentina                |
| Isabella Navarro | Positioning and claims                            | Claim inventory with implementation/evidence gates            | Safe wording to Fernanda and Elana               |
| Fernanda Ortiz   | Retention/social and publishing boundary          | Non-coercive rules; community/publishing gate                 | Drafts only after runtime evidence               |
| Julieta Herrera  | Independent numerical/economy audit               | Source, denominator, date, calculation, transferability       | Clears every numerical/economy claim             |
| Valentina Cruz   | Implements only accepted R1–R4 specifications     | Development tests, fixtures, exact diff, QA brief             | Candidate to Adriana; does not self-certify      |
| Elana Castillo   | Sole independent exact-head QA/code-review gate   | Counted checks, PASS/FAIL, bug table, unattempted rows        | Final unchanged-head verdict to Adriana          |

## Risk and decision register

| ID     | Risk or decision                              | Control / owner                                      |
| ------ | --------------------------------------------- | ---------------------------------------------------- |
| RSK-01 | Copying competitor expression or trade dress  | Originality ledger; Daniela, Natalia, Elana          |
| RSK-02 | Transferring published metrics to Fluyo       | Julieta and Isabella claim gates                     |
| RSK-03 | Child or protected-user exposure              | Protective default; Natalia; later material decision |
| RSK-04 | Client-awarded or duplicate progress          | ADR 0005 authority; confirmed-only writes            |
| RSK-05 | Coercive streak/economy mechanics             | Deferred; Camila, Isabella, Fernanda                 |
| RSK-06 | Notification pressure or spam                 | No delivery in R0–R4                                 |
| RSK-07 | Telemetry identity/content leakage            | Closed no-op contract; Natalia/Renata mutations      |
| RSK-08 | Offline conflict or stale award               | Read-only offline; stale results never award         |
| RSK-09 | Fail-open optional control                    | Default disabled; independent kill switch            |
| RSK-10 | Accessibility or contrast regression          | Conversation Canvas tokens, Break-UI, runtime audit  |
| RSK-11 | PR #61 contamination                          | Separate branch and PR; no external-setting action   |
| RSK-12 | Sprint 6 claim outruns incomplete native work | R4 web-only; native claims stay blocked              |

Later decision packets must cover placement, audio, reminders and delivery, protected cohorts, guardians, XP/leagues/hearts/Energy/gems/rewards/badges/quests/streak freezes, social graphs, ads/IAP, experiments, offline writes and conflict resolution, native learning, and atomic downloadable content.

## Verification commands

R0 and every later phase run the relevant focused test plus the unchanged repository gates:

```text
npm ci --ignore-scripts
npm run prisma:generate
npm run audit:policy
npm run prisma:validate
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
git diff --check
```

R1 additionally proves two identical serializations, zero Prisma schema delta, zero dependency delta, unknown-field rejection, forbidden-field mutation resistance, planner fallback, malformed-policy disable, sink failure isolation, and production-fixture exclusion.

## Status

**Today**

- R0 specialist inputs and the lawful evidence boundary are assembled.
- Runtime implementation remains zero.
- PR #61 and its required-check blocker remain separate and untouched.

**Waiting**

- Exact-head specialist review of the R0 candidate.
- Elana's final unchanged-head audit.

**Needs you**

- No new material decision is required for R0–R3.
- Production, signing, stores, spend, credentials, external accounts, economy, social, child, notification, offline-write, and native-learning decisions remain gated.

**Tomorrow**

- Merge R0 only after every specialist gate, protected checks, mergeability, and Elana PASS.
- Verify post-main checks.
- Create a separate R1 branch from the new main; do not carry the R0 worktree forward.
