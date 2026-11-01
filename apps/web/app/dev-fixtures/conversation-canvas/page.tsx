import Link from "next/link";
import { notFound } from "next/navigation";

import { ConversationCanvas } from "../../learn/session/conversation-canvas";
import { conversationCanvasFixturesAvailable } from "./fixture-access";
import {
  conversationCanvasBreakCase,
  conversationCanvasBreakCases,
  conversationCanvasFixture,
  conversationCanvasFixtureHref,
  conversationCanvasFixtures,
  conversationCanvasScenario,
} from "./fixtures";

export const dynamic = "force-dynamic";

export default async function ConversationCanvasFixturePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!conversationCanvasFixturesAvailable(process.env.NODE_ENV)) notFound();

  const params = await searchParams;
  const fixtureId = typeof params.fixture === "string" ? params.fixture : undefined;
  const breakCaseId = typeof params.breakCase === "string" ? params.breakCase : undefined;
  const fixture = conversationCanvasFixture(fixtureId);
  const breakCase = conversationCanvasBreakCase(breakCaseId);
  if (!fixture || !breakCase) notFound();
  const scenario = conversationCanvasScenario(fixture, breakCase);

  return (
    <main style={{ margin: "0 auto", maxWidth: "72rem", padding: "2rem 1rem 5rem" }}>
      <p
        style={{
          background: "#ffd34e",
          color: "#17133f",
          display: "inline-block",
          fontWeight: 800,
          padding: "0.5rem 0.75rem",
        }}
      >
        Synthetic development fixture
      </p>
      <p>
        <strong>Conversation Canvas state evidence</strong>
      </p>
      <p>
        State: {fixture.id}. Break-UI case: {breakCase.label}.
      </p>
      <nav
        aria-label="Fixture states"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBlock: "1.5rem" }}
      >
        {conversationCanvasFixtures.map(({ id }) => (
          <Link href={conversationCanvasFixtureHref(id, breakCase.id)} key={id}>
            {id}
          </Link>
        ))}
      </nav>
      <nav
        aria-label="Break-UI cases"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBlock: "1.5rem" }}
      >
        {conversationCanvasBreakCases.map(({ id, label }) => (
          <Link href={conversationCanvasFixtureHref(fixture.id, id)} key={id}>
            {label}
          </Link>
        ))}
      </nav>
      <div
        data-break-case={breakCase.id}
        data-browser-zoom={scenario.environment.browserZoomPercent}
        data-fixture-cell={`${fixture.id}:${breakCase.id}`}
        data-fixture-presentation={fixture.id}
        data-event-script={scenario.eventScript}
        data-viewport={scenario.environment.viewport}
        dir={scenario.direction}
      >
        <ConversationCanvas
          activity={scenario.activity}
          developmentFixtureScript={scenario.eventScript}
          developmentFixtureState={scenario.state}
          initialIdempotencyKey="33333333-3333-4333-8333-333333333333"
          key={`${fixture.id}:${breakCase.id}`}
        />
      </div>
    </main>
  );
}
