import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));

import {
  CONVERSATION_CANVAS_PRESENTATION_IDS,
  conversationCanvasPresentationCopy,
} from "../../learn/session/conversation-canvas-state";
import { conversationCanvasFixturesAvailable } from "./fixture-access";
import {
  CONVERSATION_CANVAS_BREAK_UI_IDS,
  conversationCanvasBreakCase,
  conversationCanvasBreakCases,
  conversationCanvasFixture,
  conversationCanvasFixtureHref,
  conversationCanvasFixtures,
  conversationCanvasScenario,
  exerciseConversationCanvasBreakCase,
} from "./fixtures";

import ConversationCanvasFixturePage from "./page";

const EXPECTED_BREAK_UI_IDS = [
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
  "missing_optional_explanation",
] as const;

const EXPECTED_PRESENTATION_COPY = {
  preparing: ["Getting your activity ready", null],
  active: ["Choose your answer", "Check answer"],
  submitting: ["Checking your answer", "Checking…"],
  "confirmed-correct-continue": ["Correct", "Continue"],
  "confirmed-correct-finish": ["Correct", "Finish"],
  "confirmed-incorrect-continue": ["Not quite", "Continue"],
  "confirmed-incorrect-finish": ["Not quite", "Finish"],
  "retryable-prepare": ["We couldn’t load the activity", "Try again"],
  "retryable-submit": ["We couldn’t check your answer", "Try again"],
  "stale-content": ["This activity changed", "Refresh activity"],
  "session-ended": ["Your session ended", "Sign in"],
  "access-blocked": ["You can’t open this activity", "Return to learning"],
  "empty-review": ["Nothing to review right now", "Continue learning"],
  "offline-prepare": ["You’re offline", "Try again"],
  "offline-active": ["You’re offline", "Try again"],
} as const;

describe("Conversation Canvas development fixture boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is available only in the exact development environment", () => {
    expect(conversationCanvasFixturesAvailable("development")).toBe(true);
  });

  it.each([undefined, "", "test", "production", "Development", "preview"])(
    "fails closed for %s",
    (nodeEnv) => {
      expect(conversationCanvasFixturesAvailable(nodeEnv)).toBe(false);
    },
  );

  it("checks the exact development guard before reading selectors", async () => {
    vi.stubEnv("NODE_ENV", "production");
    let selectorsRead = false;
    const selectors = {
      then: () => {
        selectorsRead = true;
        throw new Error("selectors-must-not-be-read");
      },
    } as unknown as Promise<Record<string, string | string[] | undefined>>;
    await expect(ConversationCanvasFixturePage({ searchParams: selectors })).rejects.toThrow(
      "not-found",
    );
    expect(selectorsRead).toBe(false);
  });

  it("renders a valid development fixture cell", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await expect(
      ConversationCanvasFixturePage({
        searchParams: Promise.resolve({
          fixture: "active",
          breakCase: "duplicate_submit",
        }),
      }),
    ).resolves.toMatchObject({ type: "main" });
  });

  const invalidSelectors: ReadonlyArray<
    readonly [string, Record<string, string | string[] | undefined>]
  > = [
    ["missing", {}],
    ["empty presentation", { fixture: "", breakCase: "duplicate_submit" }],
    ["empty break case", { fixture: "active", breakCase: "" }],
    ["array presentation", { fixture: ["active"], breakCase: "duplicate_submit" }],
    ["array break case", { fixture: "active", breakCase: ["duplicate_submit"] }],
    ["case-changed presentation", { fixture: "ACTIVE", breakCase: "duplicate_submit" }],
    ["case-changed break case", { fixture: "active", breakCase: "DUPLICATE_SUBMIT" }],
    ["unknown presentation", { fixture: "unknown", breakCase: "duplicate_submit" }],
    ["unknown break case", { fixture: "active", breakCase: "unknown" }],
  ];

  it.each(invalidSelectors)("returns not-found for %s selectors", async (_label, searchParams) => {
    vi.stubEnv("NODE_ENV", "development");
    await expect(
      ConversationCanvasFixturePage({ searchParams: Promise.resolve(searchParams) }),
    ).rejects.toThrow("not-found");
  });
});

describe("Conversation Canvas closed fixture manifests", () => {
  it("matches the exact frozen Break-UI catalog IDs and order", () => {
    expect(CONVERSATION_CANVAS_BREAK_UI_IDS).toEqual(EXPECTED_BREAK_UI_IDS);
    expect(conversationCanvasBreakCases.map(({ id }) => id)).toEqual(EXPECTED_BREAK_UI_IDS);
  });

  it("matches the exact 15-presentation manifest and literal primary copy", () => {
    expect(conversationCanvasFixtures.map(({ id }) => id)).toEqual(
      CONVERSATION_CANVAS_PRESENTATION_IDS,
    );
    for (const fixture of conversationCanvasFixtures) {
      const copy = conversationCanvasPresentationCopy(fixture.state);
      expect([copy.heading, copy.primaryAction]).toEqual(EXPECTED_PRESENTATION_COPY[fixture.id]);
    }
  });

  it.each([undefined, "", "unknown"])("rejects an absent or unknown state selector: %s", (id) => {
    expect(conversationCanvasFixture(id)).toBeUndefined();
  });

  it.each([undefined, "", "unknown"])(
    "rejects an absent or unknown Break-UI selector: %s",
    (id) => {
      expect(conversationCanvasBreakCase(id)).toBeUndefined();
    },
  );
});

describe("Conversation Canvas orthogonal fixture matrix", () => {
  it("builds 225 unique exact routable development URLs", () => {
    const urls = conversationCanvasFixtures.flatMap((fixture) =>
      conversationCanvasBreakCases.map((breakCase) =>
        conversationCanvasFixtureHref(fixture.id, breakCase.id),
      ),
    );
    expect(urls).toHaveLength(225);
    expect(new Set(urls)).toHaveLength(225);
    expect(urls[0]).toBe(
      "/dev-fixtures/conversation-canvas?fixture=preparing&breakCase=long_localized_prompt_and_choices",
    );
    expect(urls.at(-1)).toBe(
      "/dev-fixtures/conversation-canvas?fixture=offline-active&breakCase=missing_optional_explanation",
    );
  });

  it.each(
    conversationCanvasFixtures.flatMap((fixture) =>
      conversationCanvasBreakCases.map((breakCase) => ({ breakCase, fixture })),
    ),
  )("preserves presentation $fixture.id under $breakCase.id", ({ fixture, breakCase }) => {
    const scenario = conversationCanvasScenario(fixture, breakCase);
    expect(scenario.state).toBe(fixture.state);
  });

  it("uses the exact synthetic 600/4×180 long-content stress shape", () => {
    const fixture = conversationCanvasFixture("active");
    const breakCase = conversationCanvasBreakCase("long_localized_prompt_and_choices");
    if (!fixture || !breakCase) throw new Error("Expected closed fixtures");
    const { activity } = conversationCanvasScenario(fixture, breakCase);
    expect([...activity.prompt]).toHaveLength(600);
    expect(activity.choices).toHaveLength(4);
    expect(activity.choices.map(({ label }) => [...label].length)).toEqual([180, 180, 180, 180]);
  });

  it("records actual zoom/viewport evidence requirements without fake CSS scaling or nested scroll", () => {
    const fixture = conversationCanvasFixture("active");
    const breakCase = conversationCanvasBreakCase("large_text_compact_landscape");
    if (!fixture || !breakCase) throw new Error("Expected closed fixtures");
    const scenario = conversationCanvasScenario(fixture, breakCase);
    expect(scenario.environment).toEqual({ browserZoomPercent: 200, viewport: "844x390" });
    expect(scenario).not.toHaveProperty("frameStyle");
  });
});

describe("Conversation Canvas executable recovery fixtures", () => {
  it("turns network loss during submit into same-attempt retry", () => {
    expect(exerciseConversationCanvasBreakCase("network_loss_during_submit")).toMatchObject({
      id: "RETRYABLE_ERROR",
      origin: "submit",
    });
  });

  it("fences duplicate submit while the same operation is pending", () => {
    expect(exerciseConversationCanvasBreakCase("duplicate_submit").id).toBe("SUBMITTING");
  });

  it("discards a late confirmation after exit", () => {
    expect(exerciseConversationCanvasBreakCase("late_confirmation_after_exit")).toEqual({
      id: "PREPARING",
      operationGeneration: 2,
    });
  });

  it("purges corrupt cache input into a clean preparing state", () => {
    expect(exerciseConversationCanvasBreakCase("corrupt_cache_recovery")).toEqual({
      id: "PREPARING",
      operationGeneration: 1,
    });
  });

  it("retains an offline answer in memory without creating confirmed progress", () => {
    expect(exerciseConversationCanvasBreakCase("offline_saved_material")).toMatchObject({
      id: "OFFLINE_READ_ONLY",
      origin: "active",
      active: { selectedChoiceId: "cerca" },
    });
  });
});
