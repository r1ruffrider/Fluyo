import { notFound } from "next/navigation";

import { InertClientBoundary } from "../inert-client-boundary";
import { TRANSITION_FAMILY_IDS } from "../transition-intent-boundary";
import {
  BREAK_CASE_IDS,
  EXACT_QUERY_KEYS,
  ExactProductConversationHarness,
  LOCALE_IDS,
  PRESENTATION_IDS,
  isExactHarnessQuery,
} from "../source-contract";

export const SOURCE_COMMIT = "fea1f5fadb2307ca611379f30461a7ee47861fff";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (!isExactHarnessQuery(params)) notFound();
  const fixtureId = params.fixture;
  const breakCaseId = params.breakCase;
  const localeId = params.locale;
  const transitionFamilyId = params.transition;
  if (!PRESENTATION_IDS.includes(fixtureId as (typeof PRESENTATION_IDS)[number])) notFound();
  if (!BREAK_CASE_IDS.includes(breakCaseId as (typeof BREAK_CASE_IDS)[number])) notFound();
  if (!LOCALE_IDS.includes(localeId as (typeof LOCALE_IDS)[number])) notFound();
  if (
    transitionFamilyId !== "none" &&
    !TRANSITION_FAMILY_IDS.includes(transitionFamilyId as (typeof TRANSITION_FAMILY_IDS)[number])
  )
    notFound();
  return (
    <main
      data-accepted-break-cases={BREAK_CASE_IDS.length}
      data-accepted-presentations={PRESENTATION_IDS.length}
      data-exact-query-keys={EXACT_QUERY_KEYS.join(",")}
      data-r4b-preflight-source={SOURCE_COMMIT}
    >
      <InertClientBoundary>
        <ExactProductConversationHarness
          breakCaseId={breakCaseId}
          fixtureId={fixtureId}
          localeId={localeId as (typeof LOCALE_IDS)[number]}
          transitionFamilyId={transitionFamilyId as "none" | (typeof TRANSITION_FAMILY_IDS)[number]}
        />
      </InertClientBoundary>
    </main>
  );
}
