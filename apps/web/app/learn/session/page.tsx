import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { fetchLearningDashboard, LearningApiError } from "../../../lib/learning-api";
import { getVerifiedWebIdentity } from "../../../lib/supabase/identity";
import { ConversationCanvas } from "./conversation-canvas";
import {
  conversationCanvasInstanceKey,
  type InitialConversationCanvasPresentation,
} from "./conversation-canvas-state";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Conversation Canvas | Fluyo",
  description: "Complete your next server-authorized language activity.",
};

function canvasIdentity(
  presentation: InitialConversationCanvasPresentation,
  activity: Awaited<ReturnType<typeof fetchLearningDashboard>>["nextActivity"],
) {
  const revalidationToken = randomUUID();
  return {
    initialIdempotencyKey: revalidationToken,
    key: conversationCanvasInstanceKey({
      activityId: activity?.id ?? null,
      contentVersion: activity?.contentVersion ?? null,
      presentation,
      revalidationToken,
    }),
  };
}

export default async function LearningSessionPage() {
  const identity = await getVerifiedWebIdentity();
  if (!identity) redirect("/login?error=authentication_required&next=%2Flearn%2Fsession");

  let dashboard: Awaited<ReturnType<typeof fetchLearningDashboard>> | null = null;
  try {
    dashboard = await fetchLearningDashboard(identity.accessToken);
  } catch (error) {
    if (error instanceof LearningApiError && error.status === 401) {
      redirect("/login?error=authentication_required&next=%2Flearn%2Fsession");
    }
  }

  if (!dashboard) {
    const canvas = canvasIdentity("retryable_prepare", null);
    return (
      <main>
        <ConversationCanvas
          activity={null}
          authoritativeInstanceKey={canvas.key}
          initialIdempotencyKey={canvas.initialIdempotencyKey}
          initialPresentation="retryable_prepare"
        />
      </main>
    );
  }

  if (dashboard.nextActivity) {
    const canvas = canvasIdentity("active", dashboard.nextActivity);
    return (
      <main>
        <ConversationCanvas
          activity={dashboard.nextActivity}
          authoritativeInstanceKey={canvas.key}
          initialIdempotencyKey={canvas.initialIdempotencyKey}
        />
      </main>
    );
  }

  const presentation =
    dashboard.access.unavailableReason === "entitlement_required"
      ? "access_blocked"
      : "empty_review";
  const canvas = canvasIdentity(presentation, null);
  return (
    <main>
      <ConversationCanvas
        activity={null}
        authoritativeInstanceKey={canvas.key}
        initialIdempotencyKey={canvas.initialIdempotencyKey}
        initialPresentation={presentation}
      />
    </main>
  );
}
