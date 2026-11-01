import { describe, expect, it } from "vitest";

import {
  ATTEMPT_PRIMARY_ACTION_DOM_ID,
  browserConnectivityInstruction,
  type AttemptEnvelope,
  conversationCanvasInstanceKey,
  conversationCanvasReducer,
  activeStateFromAuthority,
  initialConversationCanvasState,
  ownsStableAttemptAction,
  rebindOfflineSelection,
  sanitizeConfirmedFeedback,
  shouldMoveFocusToStateHeading,
  shouldRotateAttemptKey,
} from "./conversation-canvas-state";

const ACTIVITY_ID = "22222222-2222-4222-8222-222222222222";
const ATTEMPT_KEY = "33333333-3333-4333-8333-333333333333";
const ROTATED_KEY = "44444444-4444-4444-8444-444444444444";

function active() {
  return conversationCanvasReducer(initialConversationCanvasState(), {
    type: "ACTIVITY_READY",
    activityId: ACTIVITY_ID,
    contentVersion: 4,
    idempotencyKey: ATTEMPT_KEY,
  });
}

function submitting(): {
  state: ReturnType<typeof conversationCanvasReducer>;
  attempt: AttemptEnvelope;
} {
  const selected = conversationCanvasReducer(active(), {
    type: "SELECT_CHOICE",
    selectedChoiceId: "hola",
    idempotencyKey: ATTEMPT_KEY,
  });
  const state = conversationCanvasReducer(selected, { type: "SUBMIT" });
  if (state.id !== "SUBMITTING") throw new Error("Expected SUBMITTING state");
  return { state, attempt: state.attempt };
}

describe("Conversation Canvas state authority", () => {
  it("opens an issued activity without inventing a selection", () => {
    expect(active()).toEqual({
      id: "ACTIVE",
      activityId: ACTIVITY_ID,
      contentVersion: 4,
      selectedChoiceId: null,
      idempotencyKey: ATTEMPT_KEY,
      operationGeneration: 1,
    });
  });

  it("does not submit before a valid answer is selected", () => {
    const state = active();
    expect(conversationCanvasReducer(state, { type: "SUBMIT" })).toBe(state);
  });

  it("binds submission to the complete client operation envelope", () => {
    const { state, attempt } = submitting();
    expect(state.id).toBe("SUBMITTING");
    expect(attempt).toEqual({
      activityId: ACTIVITY_ID,
      contentVersion: 4,
      selectedChoiceId: "hola",
      idempotencyKey: ATTEMPT_KEY,
      operationGeneration: 1,
    });
  });

  it("accepts only the matching server confirmation", () => {
    const { state, attempt } = submitting();
    const confirmed = conversationCanvasReducer(state, {
      type: "CONFIRM",
      attempt,
      result: "correct",
      feedback: "Your result was confirmed.",
      nextActivityAvailable: true,
    });
    expect(confirmed).toMatchObject({
      id: "CONFIRMED",
      result: "correct",
      nextActivityAvailable: true,
    });
  });

  it.each([
    ["activityId", "55555555-5555-4555-8555-555555555555"],
    ["contentVersion", 5],
    ["selectedChoiceId", "adios"],
    ["idempotencyKey", ROTATED_KEY],
    ["operationGeneration", 2],
  ] as const)("discards a late confirmation with mismatched %s", (field, value) => {
    const { state, attempt } = submitting();
    const staleAttempt = { ...attempt, [field]: value };
    expect(
      conversationCanvasReducer(state, {
        type: "CONFIRM",
        attempt: staleAttempt,
        result: "correct",
        feedback: "Your result was confirmed.",
        nextActivityAvailable: false,
      }),
    ).toBe(state);
  });

  it("preserves the exact attempt when submit recovery retries", () => {
    const { state, attempt } = submitting();
    const failed = conversationCanvasReducer(state, { type: "SUBMIT_FAILED", attempt });
    const retried = conversationCanvasReducer(failed, { type: "TRY_AGAIN" });
    expect(retried).toEqual({ id: "SUBMITTING", attempt });
  });

  it("restarts preparation without retaining attempt data after a prepare failure", () => {
    const preparing = initialConversationCanvasState();
    const failed = conversationCanvasReducer(preparing, { type: "PREPARE_FAILED" });
    expect(conversationCanvasReducer(failed, { type: "TRY_AGAIN" })).toEqual(preparing);
  });

  it("keeps an active answer in memory only while offline", () => {
    const selected = conversationCanvasReducer(active(), {
      type: "SELECT_CHOICE",
      selectedChoiceId: "hola",
      idempotencyKey: ATTEMPT_KEY,
    });
    const offline = conversationCanvasReducer(selected, { type: "CONNECTIVITY_LOST" });
    expect(offline).toMatchObject({ id: "OFFLINE_READ_ONLY", origin: "active" });
  });

  it("does not retain an answer when connectivity is lost during preparation", () => {
    const offline = conversationCanvasReducer(initialConversationCanvasState(), {
      type: "CONNECTIVITY_LOST",
    });
    expect(offline).toMatchObject({ id: "OFFLINE_READ_ONLY", origin: "prepare", active: null });
  });

  it.each(["CONTENT_STALE", "SESSION_ENDED", "ACCESS_BLOCKED", "EMPTY_REVIEW"] as const)(
    "fences the prior operation on %s",
    (type) => {
      const { state } = submitting();
      const fenced = conversationCanvasReducer(state, { type });
      expect(fenced).toMatchObject({ operationGeneration: 2 });
    },
  );

  it("clears all transient context and increments the fence on leave", () => {
    const { state } = submitting();
    expect(conversationCanvasReducer(state, { type: "LEAVE" })).toEqual({
      id: "PREPARING",
      operationGeneration: 2,
    });
  });

  it("fails closed on an illegal transition", () => {
    const state = active();
    expect(
      conversationCanvasReducer(state, {
        type: "CONFIRM",
        attempt: {
          activityId: ACTIVITY_ID,
          contentVersion: 4,
          selectedChoiceId: "hola",
          idempotencyKey: ATTEMPT_KEY,
          operationGeneration: 1,
        },
        result: "correct",
        feedback: "Your result was confirmed.",
        nextActivityAvailable: false,
      }),
    ).toBe(state);
  });
});

describe("attempt key ownership", () => {
  it("preserves the key for a same-answer retry", () => {
    expect(shouldRotateAttemptKey("hola", "hola")).toBe(false);
  });

  it("rotates the key after the submitted answer changes", () => {
    expect(shouldRotateAttemptKey("hola", "adios")).toBe(true);
  });
});

describe("authoritative instance and primary-action ownership", () => {
  const instance = (overrides: Partial<Parameters<typeof conversationCanvasInstanceKey>[0]> = {}) =>
    conversationCanvasInstanceKey({
      activityId: ACTIVITY_ID,
      contentVersion: 4,
      presentation: "active",
      revalidationToken: ATTEMPT_KEY,
      ...overrides,
    });

  it.each([
    {
      overrides: { activityId: "55555555-5555-4555-8555-555555555555" },
      reason: "new activity",
    },
    { overrides: { contentVersion: 5 }, reason: "new content version" },
    {
      overrides: { presentation: "retryable_prepare" as const },
      reason: "new authoritative presentation",
    },
    { overrides: { revalidationToken: ROTATED_KEY }, reason: "fresh revalidation" },
  ])("changes the remount key for $reason", ({ overrides }) => {
    expect(instance(overrides)).not.toBe(instance());
  });

  it("uses one stable DOM owner for active, submitting, and submit retry", () => {
    const { state, attempt } = submitting();
    const retry = conversationCanvasReducer(state, { type: "SUBMIT_FAILED", attempt });
    expect([active(), state, retry].every(ownsStableAttemptAction)).toBe(true);
    expect(ATTEMPT_PRIMARY_ACTION_DOM_ID).toBe("conversation-canvas-attempt-action");
  });

  it.each([
    ["ACTIVE", "SUBMITTING"],
    ["RETRYABLE_ERROR", "SUBMITTING"],
  ] as const)("keeps action-position focus across %s to %s", (previous, next) => {
    expect(shouldMoveFocusToStateHeading(previous, next)).toBe(false);
  });
});

describe("offline authoritative revalidation", () => {
  const selected = conversationCanvasReducer(active(), {
    type: "SELECT_CHOICE",
    selectedChoiceId: "hola",
    idempotencyKey: ATTEMPT_KEY,
  });
  const offlineActive = conversationCanvasReducer(selected, { type: "CONNECTIVITY_LOST" });
  const fresh = activeStateFromAuthority({
    activityId: ACTIVITY_ID,
    contentVersion: 4,
    idempotencyKey: ROTATED_KEY,
  });

  it("rebinds a session-memory answer only after matching activity/version revalidation", () => {
    expect(rebindOfflineSelection(offlineActive, fresh)).toEqual({
      ...fresh,
      selectedChoiceId: "hola",
    });
  });

  it("keeps browser online inert locally and requires authoritative revalidation", () => {
    const instruction = browserConnectivityInstruction("online");
    expect(instruction).toEqual({ reducerEvent: null, revalidate: true });
    expect(offlineActive.id).toBe("OFFLINE_READ_ONLY");
  });

  it.each([
    activeStateFromAuthority({
      activityId: "55555555-5555-4555-8555-555555555555",
      contentVersion: 4,
      idempotencyKey: ROTATED_KEY,
    }),
    activeStateFromAuthority({
      activityId: ACTIVITY_ID,
      contentVersion: 5,
      idempotencyKey: ROTATED_KEY,
    }),
  ])("clears the answer when fresh authority does not match %#", (mismatch) => {
    expect(rebindOfflineSelection(offlineActive, mismatch)).toEqual(mismatch);
  });

  it("keeps offline-prepare answerless after fresh revalidation", () => {
    const offlinePrepare = conversationCanvasReducer(initialConversationCanvasState(), {
      type: "CONNECTIVITY_LOST",
    });
    expect(rebindOfflineSelection(offlinePrepare, fresh)).toEqual(fresh);
  });

  it("clears the session-memory answer on explicit exit", () => {
    const left = conversationCanvasReducer(offlineActive, { type: "LEAVE" });
    expect(rebindOfflineSelection(left, fresh)).toEqual(fresh);
  });
});

describe("confirmed feedback boundary", () => {
  it.each(["Correct", "You used the right form.", "😀".repeat(128), "a".repeat(160)])(
    "preserves exact valid NFC text %#",
    (value) => {
      expect(sanitizeConfirmedFeedback(value)).toBe(value);
    },
  );

  it.each([
    " Leading space",
    "Trailing space ",
    "Cafe\u0301",
    "<b>Correct</b>",
    "&lt;b&gt;Correct&lt;/b&gt;",
    "**Correct**",
    "[Correct](javascript:alert(1))",
    "data:text/html,Correct",
    "reviewer@example.com",
    "private.internal.example",
    "?debug=true",
    "GitHub provider",
    "error stack trace",
    "correlation code abc",
    "state=abc nonce=def verifier=ghi",
    "requestId=abc account_id=def",
    "deviceUuid=abc profileGuid:abc sessionUUID:abc",
    "9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f",
    "{9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f}",
    "9f8e7d6c5b4a4c3d8e2f1a0b9c8d7e6f",
    "+1\u00a0202\u00a0555\u00a00123",
    "+1\u202f202\u202f555\u202f0123",
    "+1\u00b7202\u00b7555\u00b70123",
    "+١ ٢٠٢ ٥٥٥ ٠١٢٣",
    "C:\\private\\trace.txt",
    "\\\\private-server\\review\\trace.txt",
    "/workspace/private/trace.txt",
    "src/private/trace.txt",
    "src∕foo∕bar",
    "src⁄foo⁄bar",
    "src／foo／bar",
    "src＼foo＼bar",
    "src∖foo∖bar",
    "src⧵foo⧵bar",
    "src⧹foo⧹bar",
    "src﹨foo﹨bar",
    "%2e%2e%2Fsrc%2Fprivate",
    "src%",
    "src%2",
    "src%GGfoo",
    "src%252Ffoo%252Fbar",
    "Correct\u202e",
    "Correct\u2066",
    "Correct\u200d",
    "😀".repeat(129),
    "a".repeat(161),
  ])("uses the frozen fallback for forbidden family member %#", (value) => {
    expect(sanitizeConfirmedFeedback(value)).toBe("Your result was confirmed.");
  });
});
