import { ConversationCanvas } from "../web/app/learn/session/conversation-canvas";
import {
  CONVERSATION_CANVAS_BREAK_UI_IDS,
  conversationCanvasBreakCase,
  conversationCanvasFixture,
  conversationCanvasScenario,
} from "../web/app/dev-fixtures/conversation-canvas/fixtures";
import { CONVERSATION_CANVAS_PRESENTATION_IDS } from "../web/app/learn/session/conversation-canvas-state";
import { HARNESS_LOCALES, LocalizedBoundary, type HarnessLocale } from "./localized-boundary";
import { TransitionIntentBoundary, type TransitionFamilyId } from "./transition-intent-boundary";

export const PRODUCT_SOURCE_COMMIT = "fea1f5fadb2307ca611379f30461a7ee47861fff";
export const PRODUCT_PRESENTATION_BINDINGS = Object.freeze([
  Object.freeze({
    path: "apps/r4b-preflight-harness/app/globals.css",
    sha256: "141bdc6b02bb2e034c11f778c93b311d38d186c91fd806ef065b638c996c4a53",
    provenance: "exact-minimal-context-from-apps/web/app/globals.css",
  }),
  Object.freeze({
    path: "apps/web/app/globals.css",
    sha256: "02072d8dcaae7a69d4ced3fc8fc91f349f23fb7088bfb79f74be04756bdf7b32",
    provenance: "frozen-product-global-context-plus-approved-zoom-reflow-override",
  }),
  Object.freeze({
    path: "apps/r4b-preflight-harness/localized-boundary.tsx",
    sha256: "1436189ed735bed310df768973f7064700bd09aeba962ab6d35d2e19e181b0d8",
    provenance: "deterministic-visible-product-string-pseudolocalization",
  }),
  Object.freeze({
    path: "apps/web/app/learn/session/conversation-canvas.tsx",
    sha256: "0e62e6112791e84142e2c062f6ed1fda30e988d9e56a8521574ee37e1be43e7e",
    provenance:
      "frozen-product-source-plus-approved-progress-valuetext-native-radio-group-and-aria-disabled-arrow-guards",
  }),
  Object.freeze({
    path: "apps/web/app/learn/session/conversation-canvas.module.css",
    sha256: "f4d9180738c84b06d1331c76ec1710b4447ba320f8545fddb377fab377733828",
    provenance:
      "approved-opaque-focusable-disabled-progress-contextual-contrast-warning-rule-and-unbroken-content-reflow-adjustment",
  }),
  Object.freeze({
    path: "apps/web/app/learn/session/conversation-canvas-state.ts",
    sha256: "865ef1029899343ffc46862a42ea3a04fb3e91b1dc76fd0b1abedd8cf9a0a4e1",
  }),
  Object.freeze({
    path: "apps/web/app/dev-fixtures/conversation-canvas/fixtures.ts",
    sha256: "7598e27c1d6a7ff5d970395bc13038f96d38fdbe8ee3653c643d84a3f081e191",
  }),
]);

export const EXACT_QUERY_KEYS = Object.freeze([
  "breakCase",
  "fixture",
  "locale",
  "transition",
] as const);
export const PRESENTATION_IDS = CONVERSATION_CANVAS_PRESENTATION_IDS;
export const BREAK_CASE_IDS = CONVERSATION_CANVAS_BREAK_UI_IDS;
export const LOCALE_IDS = HARNESS_LOCALES;

export function isExactHarnessQuery(
  value: Record<string, string | string[] | undefined>,
): value is Record<(typeof EXACT_QUERY_KEYS)[number], string> {
  const keys = Object.keys(value).sort();
  return (
    JSON.stringify(keys) === JSON.stringify(EXACT_QUERY_KEYS) &&
    EXACT_QUERY_KEYS.every((key) => typeof value[key] === "string")
  );
}

export function ExactProductConversationHarness({
  breakCaseId,
  fixtureId,
  localeId,
  transitionFamilyId,
}: {
  breakCaseId: string;
  fixtureId: string;
  localeId: HarnessLocale;
  transitionFamilyId: TransitionFamilyId;
}) {
  const fixture = conversationCanvasFixture(fixtureId);
  const breakCase = conversationCanvasBreakCase(breakCaseId);
  if (!fixture || !breakCase) return null;
  const scenario = conversationCanvasScenario(fixture, breakCase);
  const transitionTargetPresentation: Record<Exclude<TransitionFamilyId, "none">, string> = {
    direct_load: "preparing",
    client_transition: "preparing",
    same_screen_refresh: "active",
    delayed_preparing_refresh: "preparing",
    connectivity_lost_preparing: "offline-prepare",
    connectivity_lost_active: "offline-active",
    connectivity_restored_preparing: "preparing",
    connectivity_restored_active: "active",
  };
  const targetFixture =
    transitionFamilyId === "none"
      ? fixture
      : conversationCanvasFixture(transitionTargetPresentation[transitionFamilyId]);
  if (!targetFixture) return null;
  return (
    <LocalizedBoundary locale={localeId}>
      <TransitionIntentBoundary
        familyId={transitionFamilyId}
        sourceState={scenario.state}
        targetState={targetFixture.state}
      >
        <div
          data-break-case={breakCase.id}
          data-fixture-cell={`${fixture.id}:${breakCase.id}`}
          data-fixture-presentation={fixture.id}
          data-product-source-commit={PRODUCT_SOURCE_COMMIT}
          dir={localeId === "ar-XB" ? "rtl" : scenario.direction}
        >
          <ConversationCanvas
            activity={scenario.activity}
            developmentFixtureScript={scenario.eventScript}
            developmentFixtureState={scenario.state}
            initialIdempotencyKey="33333333-3333-4333-8333-333333333333"
          />
        </div>
      </TransitionIntentBoundary>
    </LocalizedBoundary>
  );
}
