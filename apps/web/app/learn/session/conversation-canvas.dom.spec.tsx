import type { PublishedActivity } from "@fluyo/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("./actions", () => ({
  submitConversationAttempt: vi.fn(),
}));

import { submitConversationAttempt } from "./actions";
import { ConversationCanvas, conversationCanvasAttemptAction } from "./conversation-canvas";
import {
  ATTEMPT_PRIMARY_ACTION_DOM_ID,
  applyDevelopmentConversationEventScript,
  traceDevelopmentConversationEventScript,
  initialAttemptState,
  type AttemptEnvelope,
  type ConversationCanvasState,
} from "./conversation-canvas-state";
import {
  conversationCanvasBreakCases,
  conversationCanvasFixtures,
  conversationCanvasScenario,
} from "../../dev-fixtures/conversation-canvas/fixtures";

const activity: PublishedActivity = {
  id: "22222222-2222-4222-8222-222222222222",
  kind: "phrase_choice",
  contentVersion: 4,
  prompt: "Choose one",
  choices: [{ id: "choice", label: "Choice" }],
};
const attempt: AttemptEnvelope = {
  activityId: activity.id,
  contentVersion: 4,
  selectedChoiceId: "choice",
  idempotencyKey: "33333333-3333-4333-8333-333333333333",
  operationGeneration: 1,
};

const states: ConversationCanvasState[] = [
  {
    id: "ACTIVE",
    activityId: activity.id,
    contentVersion: 4,
    selectedChoiceId: "choice",
    idempotencyKey: attempt.idempotencyKey,
    operationGeneration: 1,
  },
  { id: "SUBMITTING", attempt },
  {
    id: "RETRYABLE_ERROR",
    origin: "submit",
    attempt,
    operationGeneration: 1,
  },
];

function renderState(
  state: ConversationCanvasState,
  options: {
    fixtureActivity?: PublishedActivity;
    script?: Parameters<typeof applyDevelopmentConversationEventScript>[1];
  } = {},
): string {
  return renderToStaticMarkup(
    <ConversationCanvas
      activity={options.fixtureActivity ?? activity}
      developmentFixtureScript={options.script}
      developmentFixtureState={state}
      initialIdempotencyKey={attempt.idempotencyKey}
    />,
  );
}

describe("Conversation Canvas primary-action DOM continuity", () => {
  it("keeps development-fixture submission local and omits the live form action", async () => {
    const html = renderState(states[0]!);
    const fixtureAction = conversationCanvasAttemptAction(true);

    expect(html).not.toMatch(/<form[^>]*\saction=/u);
    expect(fixtureAction).not.toBe(submitConversationAttempt);
    await expect(fixtureAction(initialAttemptState, new FormData())).resolves.toEqual(
      initialAttemptState,
    );
    expect(submitConversationAttempt).not.toHaveBeenCalled();
    expect(conversationCanvasAttemptAction(false)).toBe(submitConversationAttempt);
  });

  it.each(states)("keeps one stable focused-node owner in $id", (state) => {
    const html = renderState(state);
    expect(html.match(new RegExp(`id="${ATTEMPT_PRIMARY_ACTION_DOM_ID}"`, "gu"))).toHaveLength(1);
    expect(html).toContain('data-focus-owner="attempt-action"');
  });

  it("keeps exact action copy across active, submitting, and retry", () => {
    expect(renderState(states[0]!)).toContain(">Check answer</button>");
    expect(renderState(states[1]!)).toContain(">Checking…</button>");
    expect(renderState(states[2]!)).toContain(">Try again</button>");
  });

  it.each([
    [
      "prepare",
      { id: "OFFLINE_READ_ONLY", origin: "prepare", active: null, operationGeneration: 1 },
    ],
    [
      "active",
      {
        id: "OFFLINE_READ_ONLY",
        origin: "active",
        active: states[0],
        operationGeneration: 1,
      },
    ],
  ] as const)("renders the exact offline %s revalidation action", (_origin, state) => {
    const html = renderState(state as ConversationCanvasState);
    expect(html).toContain(">Try again</button>");
  });
});

describe("Conversation Canvas rendered Break-UI event cells", () => {
  it.each(
    conversationCanvasFixtures.flatMap((fixture) =>
      conversationCanvasBreakCases.map((breakCase) => ({ breakCase, fixture })),
    ),
  )("initially preserves $fixture.id under $breakCase.id", ({ fixture, breakCase }) => {
    const scenario = conversationCanvasScenario(fixture, breakCase);
    const html = renderState(scenario.state, {
      fixtureActivity: scenario.activity,
      script: scenario.eventScript,
    });

    expect(html).toContain(`data-state="${fixture.state.id}"`);
    expect(html).toContain(`data-development-requested-presentation="${fixture.state.id}"`);
    expect(html).toContain('data-development-event-outcome="not-triggered"');
    expect(html).toContain(">Run synthetic event</button>");
  });

  it.each(
    conversationCanvasFixtures.flatMap((fixture) =>
      conversationCanvasBreakCases.map((breakCase) => ({ breakCase, fixture })),
    ),
  )("traces $breakCase.id separately from $fixture.id", ({ fixture, breakCase }) => {
    const scenario = conversationCanvasScenario(fixture, breakCase);
    const selectedChoiceId = scenario.activity.choices[0]?.id ?? "fixture-choice";
    const expected = applyDevelopmentConversationEventScript(
      scenario.state,
      scenario.eventScript,
      selectedChoiceId,
    );
    const result = traceDevelopmentConversationEventScript(
      scenario.state,
      scenario.eventScript,
      selectedChoiceId,
    );

    expect(result.trace).toEqual({
      requestedPresentation: fixture.state.id,
      settledOutcome: expected.id,
    });
    expect(result.settledState).toEqual(expected);
  });
});
