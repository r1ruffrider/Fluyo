import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const specPath = "docs/2026-10-31_sprint-6-r4a-conversation-canvas-spec_v1.md";
const testPath = "packages/shared/src/sprint-6-r4a-conversation-canvas-spec.test.ts";
const planPath = "docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md";
const adrPath = "docs/adr/0007-learning-experience-and-operational-boundaries.md";
const reportPath = "docs/research/2026-10-31_duolingo-public-evidence-study_v1.md";
const spec = read(specPath);
const plan = read(planPath);
const adr = read(adrPath);
const report = read(reportPath);

const rawJsonAfter = (source: string, marker: string): string => {
  const block = (source.split(marker)[1] ?? "").match(/```json\s*([\s\S]*?)\r?\n```/);
  if (!block?.[1]) throw new Error(`missing closed JSON after ${marker}`);
  return block[1];
};

const parseStrictJson = (raw: string): unknown => {
  let cursor = 0;
  const whitespace = () => {
    while (/\s/.test(raw[cursor] ?? "")) cursor += 1;
  };
  const string = (): string => {
    if (raw[cursor] !== '"') throw new Error("expected JSON string");
    const start = cursor++;
    while (cursor < raw.length) {
      if (raw[cursor] === "\\") {
        cursor += 2;
        continue;
      }
      if (raw[cursor] === '"') {
        cursor += 1;
        return JSON.parse(raw.slice(start, cursor)) as string;
      }
      cursor += 1;
    }
    throw new Error("unterminated JSON string");
  };
  const value = (): unknown => {
    whitespace();
    if (raw[cursor] === "{") {
      cursor += 1;
      const output: Record<string, unknown> = {};
      const keys = new Set<string>();
      whitespace();
      if (raw[cursor] === "}") {
        cursor += 1;
        return output;
      }
      while (cursor < raw.length) {
        const key = string();
        if (keys.has(key)) throw new Error(`duplicate JSON key ${key}`);
        keys.add(key);
        whitespace();
        if (raw[cursor++] !== ":") throw new Error("expected colon");
        output[key] = value();
        whitespace();
        if (raw[cursor] === "}") {
          cursor += 1;
          return output;
        }
        if (raw[cursor++] !== ",") throw new Error("expected comma");
        whitespace();
      }
      throw new Error("unterminated JSON object");
    }
    if (raw[cursor] === "[") {
      cursor += 1;
      const output: unknown[] = [];
      whitespace();
      if (raw[cursor] === "]") {
        cursor += 1;
        return output;
      }
      while (cursor < raw.length) {
        output.push(value());
        whitespace();
        if (raw[cursor] === "]") {
          cursor += 1;
          return output;
        }
        if (raw[cursor++] !== ",") throw new Error("expected comma");
      }
      throw new Error("unterminated JSON array");
    }
    if (raw[cursor] === '"') return string();
    for (const [token, parsed] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ] as const) {
      if (raw.startsWith(token, cursor)) {
        cursor += token.length;
        return parsed;
      }
    }
    const number = raw.slice(cursor).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!number) throw new Error("invalid JSON value");
    cursor += number[0].length;
    return Number(number[0]);
  };
  const result = value();
  whitespace();
  if (cursor !== raw.length) throw new Error("trailing JSON content");
  return result;
};

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord => value as JsonRecord;
const records = (value: unknown): JsonRecord[] => value as JsonRecord[];
const strings = (value: unknown): string[] => value as string[];
const exactKeys = (value: unknown, keys: string[]) =>
  expect(Object.keys(record(value))).toEqual(keys);
const valueDigest = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const validateScalarSafety = (value: unknown): void => {
  if (typeof value === "string") {
    if (value !== value.normalize("NFC") || /[\u0000-\u001f\u007f]/.test(value))
      throw new Error("unsafe string");
  } else if (typeof value === "number") {
    if (
      !Number.isFinite(value) ||
      Object.is(value, -0) ||
      (Number.isInteger(value) && !Number.isSafeInteger(value))
    )
      throw new Error("unsafe number");
  } else if (Array.isArray(value)) value.forEach(validateScalarSafety);
  else if (value && typeof value === "object")
    for (const [key, child] of Object.entries(value)) {
      validateScalarSafety(key);
      validateScalarSafety(child);
    }
};

const rawCatalog = rawJsonAfter(spec, "The following is the single closed");
const catalog = parseStrictJson(rawCatalog) as JsonRecord;
const planVisual = parseStrictJson(
  rawJsonAfter(plan, "The measurable Conversation Canvas visual-regression contract is closed:"),
) as JsonRecord;
const topLevelKeys = [
  "schemaVersion",
  "date",
  "phase",
  "status",
  "authority",
  "transitionDigest",
  "uxContractDigestAlgorithm",
  "uxContractDigest",
  "flowIds",
  "flowContractFields",
  "flowContracts",
  "flowVariantFields",
  "flowVariants",
  "dynamicCopyRuleFields",
  "dynamicCopyRules",
  "exitDialogFields",
  "exitDialogContextFields",
  "exitDialogContexts",
  "exitDialogs",
  "modalInteractionContractFields",
  "modalInteractionContract",
  "stateIds",
  "statePresentationFields",
  "states",
  "stateVariantFields",
  "stateVariants",
  "stateActionContractFields",
  "stateActionContracts",
  "stateFixtureVariantFields",
  "stateFixtureVariants",
  "readingOrder",
  "visual",
  "matrix",
  "evidence",
  "contrast",
  "nonCoerciveBoundary",
  "provenance",
  "phaseBoundary",
  "handoff",
];
const stateIds = [
  "PREPARING",
  "ACTIVE",
  "SUBMITTING",
  "CONFIRMED",
  "RETRYABLE_ERROR",
  "STALE_CONTENT",
  "SESSION_ENDED",
  "ACCESS_BLOCKED",
  "EMPTY_REVIEW",
  "OFFLINE_READ_ONLY",
];
const flowIds = [
  "setup",
  "editable_goal",
  "start_from_beginning",
  "prepare",
  "answer",
  "check",
  "confirmed_feedback",
  "continue_or_finish",
  "confirmed_progress",
];
const flowContractFields = [
  "flowId",
  "heading",
  "body",
  "primaryAction",
  "preservationRule",
  "safeDestination",
  "focusAnnouncement",
  "noProgressRule",
];
const expectedFlowContracts: JsonRecord[] = [
  [
    "setup",
    "Set up today’s practice",
    "Choose a daily goal before you begin.",
    "Set a goal",
    "preserve_confirmed_goal_progress_preferences_and_safe_navigation",
    "editable_goal",
    "client_navigation_focuses_heading_once_direct_load_uses_natural_order_no_live_announcement",
    "setup_display_and_navigation_cannot_complete_activity_or_change_confirmed_progress",
  ],
  [
    "editable_goal",
    "Choose today’s goal",
    "Pick from 1 to 20 activities. You can change this later.",
    "Save goal",
    "previous_confirmed_goal_remains_authoritative_proposed_value_is_memory_only_until_server_confirmation",
    "start_from_beginning_after_server_confirmation_otherwise_editable_goal",
    "client_navigation_focuses_heading_once_then_labelled_input_and_action_follow_natural_order_contextual_status_uses_flowVariant_focusAnnouncement",
    "editing_saving_retrying_or_leaving_goal_setup_cannot_complete_activity_or_change_confirmed_progress",
  ],
  [
    "start_from_beginning",
    "Ready to start?",
    "Your first available activity will open next.",
    "Start from beginning",
    "preserve_confirmed_goal_progress_and_safe_navigation_create_no_attempt_until_activity_validation",
    "PREPARING",
    "client_navigation_focuses_heading_once_direct_load_uses_natural_order_no_live_announcement",
    "starting_navigation_cannot_complete_activity_or_change_confirmed_progress",
  ],
  [
    "prepare",
    "Getting your activity ready",
    "Checking the latest activity and your confirmed progress.",
    null,
    "preserve_confirmed_progress_goal_preferences_and_safe_navigation_clear_stale_transient_context",
    "ACTIVE_or_explicit_recovery_or_learning_home",
    "after_navigation_focus_heading_once_same_screen_refresh_keeps_focus_and_announces_politely_once",
    "preparation_cannot_complete_activity_or_change_progress",
  ],
  [
    "answer",
    "Choose your answer",
    "Select one answer, then check it.",
    "Check answer",
    "one_unconfirmed_answer_in_memory_only_preserve_confirmed_progress_and_content_version",
    "SUBMITTING_or_learning_home_after_explicit_discard",
    "focus_heading_once_after_state_transition_then_logical_progress_prompt_radio_choices_action_order_native_selection_speech_only",
    "selecting_changing_or_checking_an_answer_cannot_award_progress_before_server_confirmation",
  ],
  [
    "check",
    "Checking your answer",
    "Waiting for a confirmed result.",
    "Checking…",
    "preserve_answer_and_exact_idempotency_key_until_settlement_fence_duplicates_and_late_results",
    "CONFIRMED_or_recovery_or_learning_home_after_explicit_exit",
    "keep_focus_at_action_position_polite_status_once_no_repeated_spinner_announcement",
    "checking_retrying_or_leaving_cannot_change_progress_without_matching_server_confirmation",
  ],
  [
    "confirmed_feedback",
    "Your result",
    "Your result was confirmed.",
    { kind: "dynamic_action", ruleId: "confirmed_result_action" },
    "preserve_only_confirmed_result_and_progress_clear_answer_retry_and_submission_context",
    "next_server_selected_activity_or_learning_home",
    "focus_result_heading_once_announce_result_feedback_and_changed_progress_once",
    "feedback_and_its_actions_only_reflect_progress_already_committed_by_the_server",
  ],
  [
    "continue_or_finish",
    "Continue or finish",
    "Your result is confirmed. Choose the available next step.",
    { kind: "dynamic_action", ruleId: "confirmed_result_action" },
    "preserve_confirmed_result_and_progress_until_the_validated_destination_replaces_the_current_view",
    "next_server_selected_activity_after_fresh_authorization_and_version_validation_or_server_filtered_learning_home",
    "activation_focuses_the_next_PREPARING_heading_or_learning_home_heading_once_without_reannouncing_prior_feedback",
    "continue_and_finish_create_no_additional_completion_award_or_progress",
  ],
  [
    "confirmed_progress",
    "Today’s goal progress",
    "{confirmed count} of {daily target} activities complete today.",
    null,
    "render_server_confirmed_count_and_daily_target_only",
    "current_confirmed_screen_or_learning_home",
    "do_not_move_focus_announce_named_progress_value_once_only_when_confirmed_count_changes",
    "progressbar_never_increments_optimistically_or_from_local_action",
  ],
].map((values) =>
  Object.fromEntries(flowContractFields.map((field, index) => [field, values[index]])),
);
const fixtureIds = [
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
];
const artifactIds = [
  "actual.png",
  "baseline.png",
  "diff.png",
  "overflow.json",
  "contrast.json",
  "focus.json",
  "announcements.txt",
  "reduced-motion.json",
];
const identityFields = ["stateId", "viewportId", "themeId", "localeId", "textScaleId", "fixtureId"];
const artifactPathFields = ["buildSha", ...identityFields, "browserAtProfileId"];
const filenameFields = [
  ...identityFields,
  "browserId",
  "browserVersion",
  "atId",
  "atVersion",
  "artifactId",
];
const stateVariantFields = [
  "variantId",
  "stateId",
  "guard",
  "heading",
  "body",
  "primaryAction",
  "preservationRule",
  "safeDestination",
  "focusAnnouncement",
  "noProgressRule",
  "visualTreatment",
];
const stateActionContractFields = ["stateId", "variantId", "primaryActionId"];
const stateFixtureVariantFields = ["stateId", "fixtureId", "variantId"];
const focusRingFields = [
  "themeId",
  "ringId",
  "widthCssPx",
  "offsetCssPx",
  "colorToken",
  "colorHex",
  "semanticPairId",
];
const keyboardProtocolFields = [
  "sequence",
  "interactionId",
  "contextId",
  "keyIds",
  "expectedOutcomeId",
  "expectedFocusId",
  "announcementDelta",
  "noProgressMutation",
];
const keyboardApplicabilityFields = [
  "stateId",
  "variantId",
  "dialogContextId",
  "applicableInteractionIds",
];
const keyboardPresentationFocusMapFields = [
  "presentationId",
  "interactionId",
  "applicability",
  "expectedFocusTargetId",
  "expectedFocusMoveCount",
  "rationaleId",
];
const syntheticObservationFields = [
  "confirmedCount",
  "dailyTarget",
  "selectedOptionLabel",
  "selectedOptionPosition",
  "selectedOptionCount",
];
const keyboardExecutionFields = [
  "sequence",
  "interactionId",
  "applicability",
  "exclusionReason",
  "expectedOutcomeId",
  "expectedFocusId",
  "expectedFocusMoveCount",
  "observedOutcomeId",
  "observedFocusId",
  "observedFocusMoveCount",
  "observedAnnouncementDelta",
  "noProgressMutation",
  "verdict",
];
const keyboardProtocol = [
  [1, "document_tab_forward", "document", ["Tab"], "focus_next", "next_expected_stop", 0],
  [
    2,
    "document_tab_reverse",
    "document",
    ["ShiftTab"],
    "focus_previous",
    "previous_expected_stop",
    0,
  ],
  [
    3,
    "radio_next",
    "active_radio_group",
    ["ArrowDown", "ArrowRight"],
    "select_next_radio",
    "next_radio_in_canonical_order",
    0,
  ],
  [
    4,
    "radio_previous",
    "active_radio_group",
    ["ArrowUp", "ArrowLeft"],
    "select_previous_radio",
    "previous_radio_in_canonical_order",
    0,
  ],
  [5, "radio_select", "active_radio_group", ["Space"], "select_current_radio", "current_radio", 0],
  [
    6,
    "primary_action_activate",
    "primary_action",
    ["Enter", "Space"],
    "activate_control",
    "presentation_specific_focus_map",
    1,
  ],
  [
    7,
    "dialog_tab_cycle",
    "exit_dialog",
    ["Tab", "ShiftTab"],
    "cycle_within_dialog",
    "exit_stay",
    0,
  ],
  [8, "dialog_escape", "exit_dialog", ["Escape"], "dismiss_as_stay", "invoking_exit_control", 0],
  [9, "skip_link_activate", "skip_link", ["Enter"], "move_to_main_heading", "single_h1", 0],
].map(
  ([
    sequence,
    interactionId,
    contextId,
    keyIds,
    expectedOutcomeId,
    expectedFocusId,
    announcementDelta,
  ]) => ({
    sequence,
    interactionId,
    contextId,
    keyIds,
    expectedOutcomeId,
    expectedFocusId,
    announcementDelta,
    noProgressMutation: true,
  }),
) as JsonRecord[];
const keyboardPresentationInteractionGroups: ReadonlyArray<
  readonly [presentationId: string, interactionIds: readonly string[]]
> = [
  ["PREPARING", ["document_tab_forward", "document_tab_reverse", "skip_link_activate"]],
  [
    "ACTIVE",
    [
      "document_tab_forward",
      "document_tab_reverse",
      "radio_next",
      "radio_previous",
      "radio_select",
      "primary_action_activate",
      "skip_link_activate",
    ],
  ],
  ["SUBMITTING", ["document_tab_forward", "document_tab_reverse", "skip_link_activate"]],
  ...[
    "CONFIRMED:confirmed_correct_continue",
    "CONFIRMED:confirmed_correct_finish",
    "CONFIRMED:confirmed_incorrect_continue",
    "CONFIRMED:confirmed_incorrect_finish",
    "RETRYABLE_ERROR:retryable_error_prepare",
    "RETRYABLE_ERROR:retryable_error_submit",
    "STALE_CONTENT",
    "SESSION_ENDED",
    "ACCESS_BLOCKED",
    "EMPTY_REVIEW",
    "OFFLINE_READ_ONLY:offline_read_only_prepare",
    "OFFLINE_READ_ONLY:offline_read_only_active",
  ].map(
    (presentationId) =>
      [
        presentationId,
        [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate",
        ],
      ] as const,
  ),
  ["ACTIVE", ["dialog_tab_cycle", "dialog_escape"]],
  ["SUBMITTING", ["dialog_tab_cycle", "dialog_escape"]],
  ["RETRYABLE_ERROR:retryable_error_submit", ["dialog_tab_cycle", "dialog_escape"]],
  ["OFFLINE_READ_ONLY:offline_read_only_active", ["dialog_tab_cycle", "dialog_escape"]],
];
const focusContractByInteraction: Record<
  string,
  readonly [expectedFocusTargetId: string, expectedFocusMoveCount: number, rationaleId: string]
> = {
  document_tab_forward: ["next_expected_stop", 1, "sequential_focus_navigation"],
  document_tab_reverse: ["previous_expected_stop", 1, "sequential_focus_navigation"],
  radio_next: ["next_radio_in_canonical_order", 1, "radio_roving_focus"],
  radio_previous: ["previous_radio_in_canonical_order", 1, "radio_roving_focus"],
  radio_select: ["current_radio", 0, "in_place_selection"],
  dialog_tab_cycle: ["exit_stay", 1, "modal_focus_cycle"],
  dialog_escape: ["invoking_exit_control", 1, "modal_dismiss_focus_restore"],
  skip_link_activate: ["single_h1", 1, "skip_link_main_heading"],
};
const retainedPrimaryActionPresentations = new Set([
  "ACTIVE",
  "RETRYABLE_ERROR:retryable_error_submit",
]);
const keyboardPresentationFocusMap = keyboardPresentationInteractionGroups.flatMap(
  ([presentationId, interactionIds]) =>
    interactionIds.map((interactionId) => {
      const focusContract =
        interactionId === "primary_action_activate"
          ? retainedPrimaryActionPresentations.has(presentationId)
            ? ([
                "primary_action_status_position",
                0,
                "retain_primary_action_status_position",
              ] as const)
            : (["activated_destination_heading", 1, "activated_destination_heading"] as const)
          : focusContractByInteraction[interactionId]!;
      return {
        presentationId,
        interactionId,
        applicability: "APPLICABLE",
        expectedFocusTargetId: focusContract[0],
        expectedFocusMoveCount: focusContract[1],
        rationaleId: focusContract[2],
      };
    }),
) as JsonRecord[];
const nvdaProtocolFields = [
  "sequence",
  "eventId",
  "modeId",
  "sourceTargetId",
  "roleId",
  "accessibleName",
  "accessibleState",
  "accessibleValue",
  "politeness",
  "count",
  "spokenText",
];
const nvdaExpectationTemplateFields = [
  "eventId",
  "stateId",
  "variantScope",
  "fixtureScope",
  "dialogContextId",
  "sourceTargetId",
  "roleId",
  "accessibleNameTemplate",
  "accessibleState",
  "accessibleValueTemplate",
  "modeId",
  "politeness",
  "spokenTextTemplate",
  "count",
];
const uxSubsetKeys = [
  "flowContracts",
  "flowVariants",
  "dynamicCopyRules",
  "states",
  "stateVariants",
  "stateActionContracts",
  "stateFixtureVariants",
  "exitDialogContexts",
  "exitDialogs",
  "modalInteractionContract",
];
const nvdaProtocolEventIds = [
  "state_entry",
  "active_radio_group",
  "radio_selection",
  "submission_pending",
  "confirmation",
  "retryable_error",
  "offline",
  "session_ended",
  "access_blocked",
  "empty_review",
  "confirmed_progress_changed",
  "exit_dialog_opened",
  "exit_dialog_dismissed",
];
const expectedFocusRings: JsonRecord[] = [
  {
    themeId: "light",
    ringId: "focus_light",
    widthCssPx: 3,
    offsetCssPx: 3,
    colorToken: "--cc-action-cobalt",
    colorHex: "#2639b6",
    semanticPairId: "light_focus_on_paper",
  },
  {
    themeId: "dark",
    ringId: "focus_dark",
    widthCssPx: 3,
    offsetCssPx: 3,
    colorToken: "--cc-sun",
    colorHex: "#ffd34e",
    semanticPairId: "dark_focus_sun_on_canvas",
  },
];
const variantCycles: Record<string, string[]> = {
  CONFIRMED: [
    "confirmed_correct_continue",
    "confirmed_correct_finish",
    "confirmed_incorrect_continue",
    "confirmed_incorrect_finish",
  ],
  RETRYABLE_ERROR: ["retryable_error_prepare", "retryable_error_submit"],
  OFFLINE_READ_ONLY: ["offline_read_only_prepare", "offline_read_only_active"],
};
const expectedStateFixtureVariantRecords = (): JsonRecord[] =>
  stateIds.flatMap((stateId) =>
    fixtureIds.map((fixtureId, index) => ({
      stateId,
      fixtureId,
      variantId: variantCycles[stateId]?.[index % variantCycles[stateId]!.length] ?? null,
    })),
  );
const flowVariantFields = [
  "variantId",
  "flowId",
  "guard",
  "heading",
  "body",
  "primaryAction",
  "preservationRule",
  "safeDestination",
  "focusAnnouncement",
  "noProgressRule",
  "semanticContract",
];
const dynamicCopyRuleFields = [
  "ruleId",
  "appliesTo",
  "source",
  "validation",
  "fallbackHeading",
  "fallbackBody",
  "actionRule",
  "renderBoundary",
];
const confirmedVariantIds = [
  "confirmed_correct_continue",
  "confirmed_correct_finish",
  "confirmed_incorrect_continue",
  "confirmed_incorrect_finish",
] as const;
const confirmedActionReference = {
  kind: "dynamic_action",
  ruleId: "confirmed_result_action",
};
const confirmedFeedbackBodyReference = {
  kind: "dynamic_copy",
  ruleId: "confirmed_feedback_body",
};
const forbiddenRenderableBodyInstructions = [
  "Show non-empty server feedback; otherwise show Your result was confirmed.",
  "Render the full server prompt and one named radio group.",
  "Show Continue only for another server-selected activity; otherwise show Finish.",
  "Submit recovery states that the answer wasn’t confirmed.",
];
const validRenderableBody = (body: unknown, allowsDynamicFeedback: boolean): boolean =>
  (typeof body === "string" &&
    body.length > 0 &&
    !forbiddenRenderableBodyInstructions.some((instruction) => body.includes(instruction))) ||
  (allowsDynamicFeedback &&
    JSON.stringify(body) === JSON.stringify(confirmedFeedbackBodyReference));
const expectedDynamicCopyRules: JsonRecord[] = [
  {
    ruleId: "confirmed_feedback_body",
    appliesTo: [
      "flow:confirmed_feedback",
      "state:CONFIRMED",
      ...confirmedVariantIds.map((variantId) => `state_variant:${variantId}`),
    ],
    source: "server_confirmed_feedback",
    validation:
      "NFC_trim_canonical_nonempty_UTF8_max_512_bytes_max_160_graphemes_plain_text_with_NFKC_compatibility_detection_shadow_bounded_one_pass_percent_decode_rejecting_malformed_or_residual_percent_bytes_then_Unicode_slash_normalization_and_traversal_evaluation_without_Unicode_control_format_bidi_or_line_separator_HTML_entity_Markdown_emphasis_strikethrough_fence_horizontal_rule_link_or_code_any_URI_scheme_Unicode_decimal_phone_contact_URL_host_query_provider_diagnostic_stack_correlation_token_code_state_nonce_verifier_credential_session_identity_key_ending_ID_UUID_or_GUID_canonical_braced_or_compact_UUID_or_generic_absolute_relative_workspace_path_families",
    fallbackHeading: "Your result",
    fallbackBody: "Your result was confirmed.",
    actionRule: "validated_feedback_or_exact_fallback_only",
    renderBoundary:
      "render_only_after_matching_server_confirmation_never_render_validation_or_dispatcher_instructions",
  },
  {
    ruleId: "confirmed_result_action",
    appliesTo: [
      "flow:confirmed_feedback",
      "flow:continue_or_finish",
      "state:CONFIRMED",
      ...confirmedVariantIds.map((variantId) => `state_variant:${variantId}`),
    ],
    source: "freshly_authorized_server_selected_next_activity",
    validation: "exact_owner_entitlement_activity_and_version_validation",
    fallbackHeading: "Your result",
    fallbackBody: "Your result was confirmed.",
    actionRule:
      "nextActivityAvailable=true_exactly_Continue_nextActivityAvailable=false_exactly_Finish_only_one_action",
    renderBoundary:
      "render_one_validated_action_only_never_render_authorization_or_dispatcher_instructions",
  },
  {
    ruleId: "retryable_error_variant",
    appliesTo: [
      "state:RETRYABLE_ERROR",
      "state_variant:retryable_error_prepare",
      "state_variant:retryable_error_submit",
    ],
    source: "closed_prepare_or_submit_origin",
    validation: "origin_must_equal_prepare_or_submit_for_current_operation_and_generation",
    fallbackHeading: "We couldn’t finish that",
    fallbackBody: "Nothing changed. Check your connection and try again.",
    actionRule: "unknown_missing_or_stale_origin_uses_exact_generic_fallback_and_exact_Try_again",
    renderBoundary: "dispatcher_and_origin_validation_are_never_visible",
  },
];
const feedbackFallback = "Your result was confirmed.";
const serverFeedbackMaxUtf8Bytes = 512;
const serverFeedbackMaxGraphemes = 160;
const serverFeedbackSegmenter = new Intl.Segmenter("und", { granularity: "grapheme" });
const serverFeedbackGraphemeCount = (value: string): number =>
  [...serverFeedbackSegmenter.segment(value)].length;
const serverFeedbackDetectionShadow = (value: string): string | undefined => {
  const compatibilityInput = value.normalize("NFKC");
  if (/%(?![0-9a-f]{2})/iu.test(compatibilityInput)) return undefined;
  let onceDecoded: string;
  try {
    onceDecoded = decodeURIComponent(compatibilityInput);
  } catch {
    return undefined;
  }
  if (/%[0-9a-f]{2}/iu.test(onceDecoded)) return undefined;
  return onceDecoded
    .normalize("NFKC")
    .replace(/[\u2044\u2215\u29f8\uff0f]/gu, "/")
    .replace(/[\u2216\u29f5\u29f9\ufe68\uff3c]/gu, "\\");
};
const serverFeedbackContainsPhoneContact = (value: string): boolean =>
  [
    ...value.matchAll(
      /(?<![\p{L}\p{N}])\+?\p{Nd}[\p{Nd} ()./\-\u00a0\u00b7\u202f]{5,}\p{Nd}(?![\p{L}\p{N}])/gu,
    ),
  ].some(([candidate]) => {
    const digitCount = candidate.match(/\p{Nd}/gu)?.length ?? 0;
    return digitCount >= 7 && digitCount <= 15;
  });
const validatedServerFeedback = (value: unknown): string | undefined => {
  if (typeof value !== "string" || value.length === 0 || value !== value.normalize("NFC"))
    return undefined;
  if (value.trim() !== value || value.trim().length === 0) return undefined;
  if (
    Buffer.byteLength(value, "utf8") > serverFeedbackMaxUtf8Bytes ||
    serverFeedbackGraphemeCount(value) > serverFeedbackMaxGraphemes
  )
    return undefined;
  const detectionShadow = serverFeedbackDetectionShadow(value);
  if (detectionShadow === undefined || serverFeedbackContainsPhoneContact(detectionShadow))
    return undefined;
  const forbiddenFamilies = [
    /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u,
    /[<>]/u,
    /&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);/iu,
    /[*_`\[\]]/u,
    /~{2,}/u,
    /(?:^|\n)\s{0,3}(?:(?:-\s*){3,}|(?:_\s*){3,}|(?:\*\s*){3,})(?:\n|$)/mu,
    /(?:^|\n)\s{0,3}(?:#{1,6}|>|[-+]|\d+[.)])\s/mu,
    /\[[^\]\r\n]*\]\s*(?:\([^\)\r\n]*\)|\[[^\]\r\n]*\])/u,
    /(?:^|[^\p{L}\p{N}+.-])[a-z][a-z0-9+.-]{0,31}:(?=\S)/iu,
    /(?:www\.|\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b)/iu,
    /(?:\b[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[:/]\d*)?\b|[?&#][a-z0-9_.-]+=)/iu,
    /\b(?:google|microsoft|apple|github|stripe|supabase|vercel|openai|auth0|okta)\b/iu,
    /\b(?:error|exception|diagnostic|stack|trace|provider|correlation|request|operation)\b/iu,
    /\b(?:token|code|state|nonce|verifier|credential|secret|password|session|cookie|bearer|authorization)\b/iu,
    /\b(?:user|account|owner|profile|device|install(?:ation)?|app[_-]?set|advertis(?:ing|ement)|ad|aaid|gaid|idfa|idfv|oaid|android|activity|attempt|request|operation|correlation|session)[_-]?(?:id|identifier)\b/iu,
    /(?:^|[\s,{])["']?[a-z][a-z0-9_-]*(?:id|uuid|guid)["']?\s*[:=]/iu,
    /(?<![0-9a-f])(?:\{[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|[0-9a-f]{32})(?![0-9a-f])/iu,
    /(?:[A-Za-z]:\\|\\\\|\/(?:home|users?|var|tmp|private|etc|srv|opt)\/|\.\.[\\/])/u,
    /(?:^|[\s("'`])(?:(?:[A-Za-z]:)?[\\/]|\.{1,2}[\\/])?(?=[^\s"'`]*[A-Za-z._-])(?:[A-Za-z0-9._-]+[\\/]){1,}[A-Za-z0-9._-]+(?=$|[\s)"'`,.;])/u,
  ];
  return forbiddenFamilies.some((pattern) => pattern.test(detectionShadow)) ? undefined : value;
};
const resolveServerFeedback = (value: unknown): string =>
  validatedServerFeedback(value) ?? feedbackFallback;
const exitDialogFields = [
  "dialogId",
  "guard",
  "heading",
  "body",
  "initialFocus",
  "primaryAction",
  "secondaryAction",
  "dismissRule",
  "focusReturn",
  "preservationRule",
  "noProgressRule",
  "motionId",
];
const exitDialogContextFields = [
  "contextId",
  "stateId",
  "variantId",
  "guard",
  "dialogId",
  "stayEffect",
  "leaveEffect",
  "noProgressRule",
];
const modalInteractionContractFields = [
  "dialogRole",
  "ariaModal",
  "nameSource",
  "descriptionSource",
  "tabbableIds",
  "semanticContainerTabbable",
  "initialFocusId",
  "forwardCycle",
  "reverseCycle",
  "backgroundKeyboard",
  "backgroundPointer",
  "backgroundAccessibilityTree",
  "escapeEffect",
  "backdropEffect",
  "stayEffect",
  "leaveEffect",
  "dismissalAnnouncement",
  "noProgressRule",
  "excludedBackgroundIds",
];
const expectedModalInteractionContract: JsonRecord = {
  dialogRole: "dialog",
  ariaModal: true,
  nameSource: "exact_dialog_heading",
  descriptionSource: "exact_dialog_body",
  tabbableIds: ["exit_stay", "exit_leave"],
  semanticContainerTabbable: false,
  initialFocusId: "exit_stay",
  forwardCycle: ["exit_stay", "exit_leave", "exit_stay"],
  reverseCycle: ["exit_stay", "exit_leave", "exit_stay"],
  backgroundKeyboard: "inert",
  backgroundPointer: "inert_except_backdrop_dismissal",
  backgroundAccessibilityTree: "not_traversable",
  escapeEffect: "Stay",
  backdropEffect: "Stay",
  stayEffect: "close_preserve_context_and_return_focus_to_invoking_exit_control",
  leaveEffect:
    "apply_context_clear_and_late_result_fence_then_safe_navigation_without_obsolete_focus_restore",
  dismissalAnnouncement: "none",
  noProgressRule:
    "open_Tab_ShiftTab_Escape_backdrop_Stay_and_Leave_never_synthesize_confirmation_or_progress",
  excludedBackgroundIds: [
    "skip_link",
    "top_bar_back",
    "named_progress",
    "state_heading",
    "prompt",
    "response_group",
    "feedback_status",
    "primary_action",
    "invoking_exit_control",
  ],
};
const transitionEvidenceFields = [
  "schemaVersion",
  "sequence",
  "scenarioId",
  "entryContextId",
  "sourcePresentationId",
  "targetPresentationId",
  "triggerId",
  "expectedFocusTargetId",
  "observedFocusTargetId",
  "expectedFocusMoveCount",
  "observedFocusMoveCount",
  "expectedAnnouncementMode",
  "observedAnnouncementMode",
  "expectedAnnouncementCount",
  "observedAnnouncementCount",
  "expectedAnnouncementText",
  "observedAnnouncementText",
  "deduplicationKey",
  "recompositionCount",
  "reconnectCount",
  "noProgressMutation",
  "verdict",
];
const transitionPresentationContracts = [
  [
    "PREPARING",
    "Getting your activity ready. Checking the latest activity and your confirmed progress.",
    "polite",
    "state_heading",
    1,
  ],
  ["ACTIVE", "Choose your answer", "native_focus", "state_heading", 1],
  [
    "SUBMITTING",
    "Checking your answer. Waiting for a confirmed result.",
    "polite",
    "current_visible_focus",
    0,
  ],
  [
    "CONFIRMED:confirmed_correct_continue",
    "Correct. Your result was confirmed.",
    "polite",
    "state_heading",
    1,
  ],
  [
    "CONFIRMED:confirmed_correct_finish",
    "Correct. Your result was confirmed.",
    "polite",
    "state_heading",
    1,
  ],
  [
    "CONFIRMED:confirmed_incorrect_continue",
    "Not quite. Your result was confirmed.",
    "polite",
    "state_heading",
    1,
  ],
  [
    "CONFIRMED:confirmed_incorrect_finish",
    "Not quite. Your result was confirmed.",
    "polite",
    "state_heading",
    1,
  ],
  [
    "RETRYABLE_ERROR:retryable_error_prepare",
    "We couldn’t load the activity. Nothing changed. Check your connection and try again.",
    "assertive",
    "state_heading",
    1,
  ],
  [
    "RETRYABLE_ERROR:retryable_error_submit",
    "We couldn’t check your answer. Your answer wasn’t confirmed. Try again to finish checking it.",
    "assertive",
    "state_heading",
    1,
  ],
  [
    "STALE_CONTENT",
    "This activity changed. Refresh to get the latest version before you continue.",
    "assertive",
    "state_heading",
    1,
  ],
  [
    "SESSION_ENDED",
    "Your session ended. Sign in again to continue safely. Your confirmed progress hasn’t changed.",
    "assertive",
    "state_heading",
    1,
  ],
  [
    "ACCESS_BLOCKED",
    "You can’t open this activity. This activity isn’t available for your account right now. Return to learning to choose something available.",
    "assertive",
    "state_heading",
    1,
  ],
  [
    "EMPTY_REVIEW",
    "Nothing to review right now. You can continue with your next activity.",
    "polite",
    "state_heading",
    1,
  ],
  [
    "OFFLINE_READ_ONLY:offline_read_only_prepare",
    "You’re offline. Reconnect to load your activity.",
    "polite",
    "state_heading",
    1,
  ],
  [
    "OFFLINE_READ_ONLY:offline_read_only_active",
    "You’re offline. Your answer is kept for this session. Reconnect to check it.",
    "polite",
    "state_heading",
    1,
  ],
] as const;
const validTransitionPresentationId = (presentationId: unknown): boolean => {
  if (typeof presentationId !== "string") return false;
  const [stateId, variantId, extra] = presentationId.split(":");
  if (stateId === undefined || extra !== undefined || !stateIds.includes(stateId)) return false;
  if (variantId === undefined)
    return !["CONFIRMED", "RETRYABLE_ERROR", "OFFLINE_READ_ONLY"].includes(stateId);
  return records(catalog.stateVariants).some(
    (variant) => variant.stateId === stateId && variant.variantId === variantId,
  );
};
const expectedTransitionEvidenceRecords = (): JsonRecord[] => {
  const output: JsonRecord[] = [];
  const add = (
    entryContextId: string,
    sourcePresentationId: string,
    targetPresentationId: string,
    triggerId: string,
    focusTargetId: string,
    focusMoveCount: number,
    announcementMode: string,
    announcementCount: number,
    announcementText: string,
    reconnectCount = 0,
  ) => {
    const sequence = output.length + 1;
    output.push({
      schemaVersion: 1,
      sequence,
      scenarioId: `transition_${String(sequence).padStart(2, "0")}`,
      entryContextId,
      sourcePresentationId,
      targetPresentationId,
      triggerId,
      expectedFocusTargetId: focusTargetId,
      observedFocusTargetId: null,
      expectedFocusMoveCount: focusMoveCount,
      observedFocusMoveCount: null,
      expectedAnnouncementMode: announcementMode,
      observedAnnouncementMode: null,
      expectedAnnouncementCount: announcementCount,
      observedAnnouncementCount: null,
      expectedAnnouncementText: announcementText,
      observedAnnouncementText: null,
      deduplicationKey: null,
      recompositionCount: 1,
      reconnectCount,
      noProgressMutation: true,
      verdict: "SIMULATED_CONTRACT_ONLY",
    });
  };
  transitionPresentationContracts.forEach(([presentationId]) =>
    add("direct_load", "none", presentationId, "direct_load", "document", 0, "none", 0, ""),
  );
  transitionPresentationContracts.forEach(
    ([presentationId, text, mode, focusTargetId, focusMoveCount]) =>
      add(
        "client_transition",
        "current_presentation",
        presentationId,
        "client_transition",
        focusTargetId,
        focusMoveCount,
        mode,
        1,
        text,
      ),
  );
  transitionPresentationContracts.forEach(([presentationId, text]) => {
    const delayedPreparing = presentationId === "PREPARING";
    add(
      "same_screen_refresh",
      presentationId,
      presentationId,
      delayedPreparing ? "delayed_preparing_refresh" : "same_screen_refresh",
      "current_visible_focus",
      0,
      delayedPreparing ? "polite" : "none",
      delayedPreparing ? 1 : 0,
      delayedPreparing ? text : "",
    );
  });
  add(
    "connectivity_lost",
    "PREPARING",
    "OFFLINE_READ_ONLY:offline_read_only_prepare",
    "connectivity_lost",
    "state_heading",
    1,
    "polite",
    1,
    transitionPresentationContracts[13][1],
  );
  add(
    "connectivity_lost",
    "ACTIVE",
    "OFFLINE_READ_ONLY:offline_read_only_active",
    "connectivity_lost",
    "state_heading",
    1,
    "polite",
    1,
    transitionPresentationContracts[14][1],
  );
  add(
    "connectivity_restored",
    "OFFLINE_READ_ONLY:offline_read_only_prepare",
    "PREPARING",
    "fresh_validation_completed",
    "state_heading",
    1,
    "polite",
    1,
    transitionPresentationContracts[0][1],
    1,
  );
  add(
    "connectivity_restored",
    "OFFLINE_READ_ONLY:offline_read_only_active",
    "ACTIVE",
    "fresh_validation_completed",
    "state_heading",
    1,
    "native_focus",
    1,
    transitionPresentationContracts[1][1],
    1,
  );
  return output;
};
const transitionEvidenceArtifactFields = [
  "schemaVersion",
  "sourceCommit",
  "workflowRunId",
  "runAttempt",
  "recordCount",
  "records",
  "privacyScanStatus",
  "retentionClass",
  "status",
  "validationDigest",
];
const transitionEvidenceValidationDigest = (value: JsonRecord): string =>
  createHash("sha256")
    .update(
      `fluyo:r4b:transition-evidence-validation:v1\n${JSON.stringify(
        withoutField(value, "validationDigest"),
      )}`,
    )
    .digest("hex");
const transitionEvidencePayload = (
  sourceCommit: string,
  workflowRunId: string,
  runAttempt: number,
): JsonRecord => {
  const payload: JsonRecord = {
    schemaVersion: 1,
    sourceCommit,
    workflowRunId,
    runAttempt,
    recordCount: 49,
    records: expectedTransitionEvidenceRecords(),
    privacyScanStatus: "PASS",
    retentionClass: "SANITIZED_DURABLE_THROUGH_FINALIZED",
    status: "SIMULATED_CONTRACT_ONLY",
    validationDigest: "",
  };
  payload.validationDigest = transitionEvidenceValidationDigest(payload);
  return payload;
};
const normalMotionFields = [
  "motionId",
  "triggerId",
  "ownerId",
  "propertyIds",
  "durationMs",
  "easingId",
  "interruptionPolicyId",
  "settlementPolicyId",
  "focusInvariantId",
  "announcementInvariantId",
];
const expectedNormalMotion = [
  ["press", "pointer_or_key_press_release", "current_enabled_control", ["transform_scale"], 120],
  [
    "selection",
    "committed_radio_change",
    "selected_indicator_and_surface",
    ["transform_scale", "opacity"],
    140,
  ],
  [
    "entry",
    "newly_active_panel_or_dialog",
    "entering_panel_or_dialog_only",
    ["transform_translate", "opacity"],
    180,
  ],
  [
    "confirmed_transition",
    "matching_server_confirmed_state_current",
    "feedback_region",
    ["transform_translate", "opacity"],
    220,
  ],
  [
    "progress",
    "confirmed_progress_value_change",
    "progress_fill",
    ["transform_scale_x_logical_start"],
    240,
  ],
].map(([motionId, triggerId, ownerId, propertyIds, durationMs]) => ({
  motionId,
  triggerId,
  ownerId,
  propertyIds,
  durationMs,
  easingId: "cubic-bezier(0.22, 1, 0.36, 1)",
  interruptionPolicyId:
    "new_semantic_state_generation_dialog_dismissal_resize_visibility_or_reduced_motion_cancels_old_motion",
  settlementPolicyId:
    "next_frame_uses_newest_canonical_state_equivalent_events_coalesce_without_queue",
  focusInvariantId: "motion_never_moves_focus_and_stale_callbacks_cannot_focus_or_navigate",
  announcementInvariantId: "callbacks_are_silent_and_semantic_announcement_occurs_exactly_once",
})) as JsonRecord[];
const motionInterruptionFixtureFields = [
  "stateId",
  "fixtureId",
  "motionId",
  "interruptedBy",
  "expectedSettledStateId",
  "expectedSettledVariantId",
  "expectedAnnouncementCount",
];
const expectedMotionInterruptionFixtures: JsonRecord[] = [
  {
    stateId: "PREPARING",
    fixtureId: "authentication_expired",
    motionId: "entry",
    interruptedBy: "semantic_state",
    expectedSettledStateId: "SESSION_ENDED",
    expectedSettledVariantId: null,
    expectedAnnouncementCount: 1,
  },
  {
    stateId: "ACTIVE",
    fixtureId: "stale_content_version",
    motionId: "selection",
    interruptedBy: "generation",
    expectedSettledStateId: "STALE_CONTENT",
    expectedSettledVariantId: null,
    expectedAnnouncementCount: 1,
  },
  {
    stateId: "SUBMITTING",
    fixtureId: "network_loss_during_submit",
    motionId: "entry",
    interruptedBy: "semantic_state",
    expectedSettledStateId: "OFFLINE_READ_ONLY",
    expectedSettledVariantId: "offline_read_only_active",
    expectedAnnouncementCount: 1,
  },
  {
    stateId: "CONFIRMED",
    fixtureId: "large_text_compact_landscape",
    motionId: "confirmed_transition",
    interruptedBy: "resize",
    expectedSettledStateId: "CONFIRMED",
    expectedSettledVariantId: "confirmed_incorrect_continue",
    expectedAnnouncementCount: 1,
  },
];
const motionInterruptionFor = (cell: JsonRecord, motionId: unknown): JsonRecord | undefined =>
  expectedMotionInterruptionFixtures.find(
    (fixture) =>
      fixture.stateId === cell.stateId &&
      fixture.fixtureId === cell.fixtureId &&
      fixture.motionId === motionId,
  );
const motionInterruptionForCell = (cell: JsonRecord): JsonRecord | undefined =>
  expectedMotionInterruptionFixtures.find(
    (fixture) => fixture.stateId === cell.stateId && fixture.fixtureId === cell.fixtureId,
  );
const motionExecutionFields = [
  "motionId",
  "triggerId",
  "ownerId",
  "propertyIds",
  "configuredDurationMs",
  "observedDurationMs",
  "easingId",
  "startedStateId",
  "interruptedBy",
  "settledStateId",
  "staleCallbackCount",
  "focusPosition",
  "announcementCount",
  "applicability",
  "exclusionReason",
];
const applicableMotionIdsForCell = (cell: JsonRecord): Set<string> =>
  new Set([
    "entry",
    ...(cell.stateId === "ACTIVE" ? ["press", "selection"] : []),
    ...(cell.stateId === "CONFIRMED" ? ["confirmed_transition", "progress"] : []),
  ]);
const breakUiRecordFields = [
  "fixtureId",
  "setup",
  "renderStateIds",
  "criterionFocusStates",
  "preservationRule",
  "focusRule",
  "noProgressRule",
  "accessibilityCriteria",
  "visualCriteria",
];
const cellMappingFields = ["ordinal", ...identityFields, "cellDigest"];

const linear = (channel: number): number => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string): number => {
  const parts = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!parts) throw new Error(`invalid color ${hex}`);
  const channels = parts.slice(1).map((part) => linear(Number.parseInt(part!, 16)));
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
};
const contrast = (foreground: string, background: string): number => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
};
const windowsReservedBasename = (value: string): boolean => {
  const stem = value.split(".")[0]?.toUpperCase() ?? "";
  return /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(stem);
};
const safeSegment = (value: string): boolean =>
  /^[A-Za-z0-9._-]+$/.test(value) &&
  value !== "." &&
  value !== ".." &&
  value === value.trim() &&
  !value.startsWith(".") &&
  !value.endsWith(".") &&
  !value.includes("__") &&
  !value.includes("%") &&
  !value.includes(":") &&
  !/[\\/\u0000-\u001f\u007f]/.test(value) &&
  !windowsReservedBasename(value);
const safePathEntry = (entry: {
  segment: string;
  symlink: boolean;
  junction: boolean;
  reparsePoint: boolean;
  hardlinkCount: number;
  collidesAfterCaseFoldOrSanitization: boolean;
}): boolean =>
  safeSegment(entry.segment) &&
  !entry.symlink &&
  !entry.junction &&
  !entry.reparsePoint &&
  entry.hardlinkCount === 1 &&
  !entry.collidesAfterCaseFoldOrSanitization;
const validPhysicalArtifactKey = (value: string): boolean => {
  if (value.length > 96 || value.length > 90 || /[\\:%\u0000-\u001f\u007f]/.test(value))
    return false;
  const parts = value.split("/");
  return (
    parts.length === 3 &&
    parts[0] === "cells" &&
    /^[0-9a-f]{64}$/.test(parts[1] ?? "") &&
    artifactIds.includes(parts[2] ?? "") &&
    parts.every((segment) => segment.length <= 64) &&
    (parts[2]?.length ?? 33) <= 32
  );
};
const validFreshPhysicalRoot = (root: {
  displayValue: string;
  local: boolean;
  empty: boolean;
  exclusive: boolean;
  unc: boolean;
  devicePath: boolean;
  reparsePoint: boolean;
  utf16CodeUnits: number;
  fullPathUtf16CodeUnits: number;
}): boolean =>
  root.displayValue === "not_retained" &&
  root.local &&
  root.empty &&
  root.exclusive &&
  !root.unc &&
  !root.devicePath &&
  !root.reparsePoint &&
  Number.isSafeInteger(root.utf16CodeUnits) &&
  root.utf16CodeUnits > 0 &&
  root.utf16CodeUnits <= 128 &&
  Number.isSafeInteger(root.fullPathUtf16CodeUnits) &&
  root.fullPathUtf16CodeUnits > root.utf16CodeUnits &&
  root.fullPathUtf16CodeUnits <= 240;
const canonicalUtc = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) &&
  new Date(value).toISOString().replace(".000Z", "Z") === value;
const safeDottedVersion = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length >= 3 &&
  value.length <= 32 &&
  /^\d+(?:\.\d+){1,5}$/.test(value) &&
  safeSegment(value);
const safeOsDisplayVersion = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 48 &&
  /^Windows (?:10|11)(?: \d{2}H[12])?$/.test(value) &&
  !/(?:[/:\\?#]|(?:\d{1,3}\.){3}\d{1,3}|localhost|\.com\b|\.net\b|\.org\b)/i.test(value);

const closedCellRecords = (): JsonRecord[] => {
  const matrix = record(catalog.matrix);
  const cells: JsonRecord[] = [];
  for (const stateId of stateIds)
    for (const viewport of records(matrix.viewports))
      for (const themeId of strings(matrix.themes))
        for (const localeId of strings(matrix.locales))
          for (const textScale of records(matrix.textScales))
            for (const fixtureId of fixtureIds)
              cells.push({
                stateId,
                viewportId: viewport.id,
                themeId,
                localeId,
                textScaleId: textScale.id,
                fixtureId,
              });
  return cells;
};

const cellDigest = (cell: JsonRecord): string =>
  createHash("sha256")
    .update(
      `fluyo:r4a:cell:v1\n${JSON.stringify(identityFields.map((field) => String(cell[field])))}`,
      "utf8",
    )
    .digest("hex");
const closedCellMappings = (): JsonRecord[] =>
  closedCellRecords().map((cell, index) => ({
    ordinal: index + 1,
    ...cell,
    cellDigest: cellDigest(cell),
  }));

const expectedCaptureProfile = (cell: JsonRecord): JsonRecord => {
  const matrix = record(catalog.matrix);
  const viewport = records(matrix.viewports).find(({ id }) => id === cell.viewportId);
  const scale = records(matrix.textScales).find(({ id }) => id === cell.textScaleId);
  if (!viewport || !scale) throw new Error("closed capture axis missing");
  const browserZoomPercent = Number(scale.browserZoomPercent);
  const configuredWidthCssPx = Number(viewport.widthCssPx);
  const configuredHeightCssPx = Number(viewport.heightCssPx);
  if (
    ![100, 200].includes(browserZoomPercent) ||
    !Number.isSafeInteger(configuredWidthCssPx) ||
    !Number.isSafeInteger(configuredHeightCssPx) ||
    (configuredWidthCssPx * 100) % browserZoomPercent !== 0 ||
    (configuredHeightCssPx * 100) % browserZoomPercent !== 0
  )
    throw new Error("capture profile is not exactly derivable");
  return {
    cellDigest: cellDigest(cell),
    ...Object.fromEntries(identityFields.map((field) => [field, cell[field]])),
    configuredWidthCssPx,
    configuredHeightCssPx,
    observedWidthCssPx: (configuredWidthCssPx * 100) / browserZoomPercent,
    observedHeightCssPx: (configuredHeightCssPx * 100) / browserZoomPercent,
    browserZoomPercent,
    deviceScaleFactor: 1,
    colorProfile: "sRGB",
  };
};

let closedCaptureProfilesCache: JsonRecord | undefined;
let closedCaptureProfilesJsonCache: string | undefined;
const closedCaptureProfiles = (): JsonRecord => {
  closedCaptureProfilesCache ??= Object.fromEntries(
    closedCellRecords().map((cell) => [cellDigest(cell), expectedCaptureProfile(cell)]),
  );
  return closedCaptureProfilesCache;
};
const closedCaptureProfilesJson = (): string => {
  closedCaptureProfilesJsonCache ??= JSON.stringify(closedCaptureProfiles());
  return closedCaptureProfilesJsonCache;
};

const artifactEnvelope = (cell: JsonRecord): JsonRecord => ({
  cellDigest: cellDigest(cell),
  ...Object.fromEntries(identityFields.map((field) => [field, cell[field]])),
});

const validArtifactEnvelope = (value: unknown, owningCell: JsonRecord): boolean => {
  const envelope = artifactEnvelope(owningCell);
  return Object.entries(envelope).every(([field, expected]) => record(value)[field] === expected);
};

const validCellIdentity = (value: unknown): value is JsonRecord => {
  if (!exactObjectKeys(value, identityFields)) return false;
  const cell = record(value);
  const matrix = record(catalog.matrix);
  return (
    stateIds.includes(String(cell.stateId)) &&
    records(matrix.viewports).some(({ id }) => id === cell.viewportId) &&
    strings(matrix.themes).includes(String(cell.themeId)) &&
    strings(matrix.locales).includes(String(cell.localeId)) &&
    records(matrix.textScales).some(({ id }) => id === cell.textScaleId) &&
    fixtureIds.includes(String(cell.fixtureId))
  );
};

const stateActionContract = (stateId: unknown, variantId: unknown): JsonRecord | undefined =>
  records(catalog.stateActionContracts).find(
    (entry) => entry.stateId === stateId && entry.variantId === variantId,
  );

const stateFixtureVariantMap = new Map(
  records(catalog.stateFixtureVariants).map((entry) => [
    `${String(entry.stateId)}\u0000${String(entry.fixtureId)}`,
    entry,
  ]),
);
const stateFixtureVariant = (stateId: unknown, fixtureId: unknown): JsonRecord | undefined =>
  stateFixtureVariantMap.get(`${String(stateId)}\u0000${String(fixtureId)}`);

const validVariantForState = (stateId: unknown, variantId: unknown): boolean => {
  const variants = records(catalog.stateVariants).filter((entry) => entry.stateId === stateId);
  return variants.length === 0
    ? variantId === null
    : variants.some((entry) => entry.variantId === variantId);
};

const closedCellVariantRecords = (): JsonRecord[] =>
  closedCellRecords().map((cell) => ({
    ...cell,
    variantId: stateFixtureVariant(cell.stateId, cell.fixtureId)?.variantId,
  }));

const canonicalArtifactKeys = (manifest: JsonRecord): string[] => {
  if (
    !safeOsDisplayVersion(manifest.osVersion) ||
    !safeDottedVersion(manifest.chromiumVersion) ||
    !safeDottedVersion(manifest.nvdaVersion)
  )
    return [];
  const output: string[] = [];
  for (const mapping of manifest.cellMappings as JsonRecord[])
    for (const artifactId of artifactIds)
      output.push(`cells/${String(mapping.cellDigest)}/${artifactId}`);
  return output;
};
const closedArtifactKeys = (): string[] =>
  canonicalArtifactKeys({
    osVersion: "Windows 11 24H2",
    chromiumVersion: "130.0.1",
    nvdaVersion: "2026.1",
    cellMappings: closedCellMappings(),
  });

const forbiddenManifestData = (value: unknown): boolean => {
  const forbiddenKeys = new Set(
    strings(record(record(catalog.evidence).runManifest).forbiddenFields).map((key) =>
      key.toLowerCase(),
    ),
  );
  const approvedArtifactPath =
    /^cells\/[0-9a-f]{64}\/(?:actual|baseline|diff)\.png$|^cells\/[0-9a-f]{64}\/(?:overflow|contrast|focus|reduced-motion)\.json$|^cells\/[0-9a-f]{64}\/announcements\.txt$/;
  const walk = (current: unknown): boolean => {
    if (typeof current === "string") {
      if (approvedArtifactPath.test(current)) return false;
      return /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|bearer\s|eyJ[A-Za-z0-9_-]{8,}\.|sk_(?:live|test)_|password=|secret=|token=|https?:\/\/|www\.|localhost|(?:\d{1,3}\.){3}\d{1,3}|[A-Za-z]:[\\/]|\\\\|(?:^|[\s"'])\.\.?(?:[\\/]|$)|[?#][A-Za-z0-9_-]+=|private[_-](?:key|canary|identity)|internal\.(?:com|net|org))/i.test(
        current,
      );
    }
    if (Array.isArray(current)) return current.some(walk);
    if (current && typeof current === "object")
      return Object.entries(current).some(
        ([key, nested]) => forbiddenKeys.has(key.toLowerCase()) || walk(key) || walk(nested),
      );
    return false;
  };
  return walk(value);
};

const validRetentionUpdate = (
  priorDeleteByUtc: string,
  eventAtUtc: string,
  nextDeleteByUtc: string,
) =>
  [priorDeleteByUtc, eventAtUtc, nextDeleteByUtc].every(canonicalUtc) &&
  Date.parse(nextDeleteByUtc) <= Date.parse(priorDeleteByUtc) &&
  Date.parse(nextDeleteByUtc) <= Date.parse(eventAtUtc) + 24 * 60 * 60 * 1000;

const confirmedProgressSemantics = (confirmedCount: number, dailyTarget: number) => ({
  role: "progressbar",
  ariaLabel: "Today’s goal progress",
  ariaValueMin: 0,
  ariaValueNow: Math.min(confirmedCount, dailyTarget),
  ariaValueMax: dailyTarget,
  visualWidthPercent: Math.min(100, (confirmedCount / dailyTarget) * 100),
  ariaValueText: `${confirmedCount} of ${dailyTarget} activities complete today`,
  announcement: `${confirmedCount} of ${dailyTarget} activities complete today`,
});

const artifactEnums = record(record(catalog.evidence).artifactEnums);
const artifactRegistry = records(record(catalog.evidence).artifactTypeRegistry);
const registryByName = new Map(artifactRegistry.map((entry) => [String(entry.typeName), entry]));
const enumIncludes = (name: string, value: unknown): boolean =>
  strings(artifactEnums[name]).includes(String(value));
const exactObjectKeys = (value: unknown, fields: string[]): boolean =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  JSON.stringify(Object.keys(record(value))) === JSON.stringify(fields);
const validFocusRingContracts = (value: unknown): boolean => {
  if (!Array.isArray(value) || value.length !== 2) return false;
  if (!value.every((entry) => exactObjectKeys(entry, focusRingFields))) return false;
  if (JSON.stringify(value) !== JSON.stringify(expectedFocusRings)) return false;
  const rings = records(value);
  return (
    new Set(rings.map(({ themeId }) => themeId)).size === rings.length &&
    new Set(rings.map(({ ringId }) => ringId)).size === rings.length &&
    rings.every(({ semanticPairId }) => enumIncludes("contrastSemanticPairIds", semanticPairId))
  );
};
const focusRingContractForTheme = (themeId: unknown): JsonRecord | undefined => {
  const rings = record(catalog.visual).focusRings;
  if (!validFocusRingContracts(rings)) return undefined;
  return records(rings).find((entry) => entry.themeId === themeId);
};
const safeText = (value: unknown, maximum: number): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= maximum &&
  value === value.normalize("NFC") &&
  !/[\u0000-\u001f\u007f]/.test(value) &&
  value.trim().length > 0;
const safeFinite = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
const roundSix = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;
const safeRoundedSix = (value: unknown, minimum: number, maximum: number): value is number =>
  safeFinite(value, minimum, maximum) && !Object.is(value, -0) && value === roundSix(value);
const linearSrgbChannel = (channel: number): number => {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
};
const relativeLuminance = (rgba: JsonRecord): number =>
  0.2126 * linearSrgbChannel(Number(rgba.red)) +
  0.7152 * linearSrgbChannel(Number(rgba.green)) +
  0.0722 * linearSrgbChannel(Number(rgba.blue));
const computedContrastRatio = (foreground: JsonRecord, background: JsonRecord): number => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return roundSix((lighter + 0.05) / (darker + 0.05));
};

const validArtifactType = (typeName: string, value: unknown): boolean => {
  const entry = registryByName.get(typeName);
  if (!entry || !exactObjectKeys(value, strings(entry.fieldOrder))) return false;
  const item = record(value);
  switch (typeName) {
    case "CssRect":
      return (
        safeRoundedSix(item.x, -100_000, 100_000) &&
        safeRoundedSix(item.y, -100_000, 100_000) &&
        safeRoundedSix(item.width, 0, 100_000) &&
        safeRoundedSix(item.height, 0, 100_000)
      );
    case "DocumentDimensions":
      return (
        [
          item.scrollWidthCssPx,
          item.scrollHeightCssPx,
          item.clientWidthCssPx,
          item.clientHeightCssPx,
        ].every(
          (entryValue) =>
            Number.isSafeInteger(entryValue) &&
            Number(entryValue) > 0 &&
            Number(entryValue) <= 100_000,
        ) &&
        Number(item.scrollWidthCssPx) >= Number(item.clientWidthCssPx) &&
        Number(item.scrollHeightCssPx) >= Number(item.clientHeightCssPx) &&
        Number(item.scrollWidthCssPx) <= 100_000 &&
        Number(item.scrollHeightCssPx) <= 100_000
      );
    case "RegionRecord":
      return (
        enumIncludes("regionIds", item.regionId) &&
        validArtifactType("CssRect", item.rect) &&
        item.visible === true
      );
    case "ClippingRecord":
      return enumIncludes("regionIds", item.regionId) && typeof item.clipped === "boolean";
    case "OverlapRecord":
      return (
        enumIncludes("regionIds", item.firstRegionId) &&
        enumIncludes("regionIds", item.secondRegionId) &&
        item.firstRegionId !== item.secondRegionId &&
        strings(artifactEnums.regionIds).indexOf(String(item.firstRegionId)) <
          strings(artifactEnums.regionIds).indexOf(String(item.secondRegionId)) &&
        typeof item.overlaps === "boolean"
      );
    case "Rgba":
      return (
        [item.red, item.green, item.blue].every(
          (channel) =>
            Number.isSafeInteger(channel) && Number(channel) >= 0 && Number(channel) <= 255,
        ) && safeRoundedSix(item.alpha, 0, 1)
      );
    case "ContrastPair": {
      if (!(
        enumIncludes("contrastSemanticPairIds", item.semanticPairId) &&
        ["light", "dark", "both"].includes(String(item.themeId)) &&
        safeText(item.usageClass, 64) &&
        safeText(item.foregroundTokenId, 32) &&
        safeText(item.backgroundTokenId, 32) &&
        validArtifactType("Rgba", item.observedForegroundRgba) &&
        validArtifactType("Rgba", item.observedBackgroundRgba) &&
        record(item.observedForegroundRgba).alpha === 1 &&
        record(item.observedBackgroundRgba).alpha === 1 &&
        [3, 4.5].includes(Number(item.requiredRatio)) &&
        safeRoundedSix(item.computedRatio, 1, 21) &&
        typeof item.passes === "boolean"
      ))
        return false;
      const computedRatio = computedContrastRatio(
        record(item.observedForegroundRgba),
        record(item.observedBackgroundRgba),
      );
      return (
        item.computedRatio === computedRatio &&
        item.passes === computedRatio >= Number(item.requiredRatio)
      );
    }
    case "FocusTarget":
      return (
        enumIncludes("focusTargetIds", item.targetId) &&
        enumIncludes("focusRoleIds", item.roleId) &&
        safeText(item.accessibleName, 160) &&
        validArtifactType("CssRect", item.rect) &&
        Number(record(item.rect).width) > 0 &&
        Number(record(item.rect).height) > 0 &&
        ["focus_light", "focus_dark"].includes(String(item.focusRingId))
      );
    case "FocusPosition":
      return (
        enumIncludes("focusPositionKinds", item.kind) &&
        ((item.kind === "document" && item.target === null) ||
          (item.kind === "element" && validArtifactType("FocusTarget", item.target)))
      );
    case "FocusStop":
      return (
        Number.isSafeInteger(item.order) &&
        Number(item.order) > 0 &&
        validArtifactType("FocusTarget", item.target) &&
        item.visible === true &&
        item.named === true &&
        item.operable === true
      );
    case "KeyboardProtocolRecord":
      return (
        Number.isSafeInteger(item.sequence) &&
        Number(item.sequence) > 0 &&
        safeText(item.interactionId, 64) &&
        enumIncludes("keyboardContextIds", item.contextId) &&
        Array.isArray(item.keyIds) &&
        item.keyIds.length > 0 &&
        item.keyIds.every((keyId) => enumIncludes("keyboardKeyIds", keyId)) &&
        new Set(item.keyIds).size === item.keyIds.length &&
        enumIncludes("keyboardOutcomeIds", item.expectedOutcomeId) &&
        enumIncludes("keyboardFocusIds", item.expectedFocusId) &&
        [0, 1].includes(Number(item.announcementDelta)) &&
        Number.isSafeInteger(item.announcementDelta) &&
        item.noProgressMutation === true
      );
    case "KeyboardExecutionRecord":
      return (
        Number.isSafeInteger(item.sequence) &&
        Number(item.sequence) > 0 &&
        keyboardProtocol.some(({ interactionId }) => interactionId === item.interactionId) &&
        ["APPLICABLE", "EXCLUDED"].includes(String(item.applicability)) &&
        (item.exclusionReason === null ||
          strings(record(catalog.evidence).keyboardExclusionReasons).includes(
            String(item.exclusionReason),
          )) &&
        enumIncludes("keyboardOutcomeIds", item.expectedOutcomeId) &&
        enumIncludes("keyboardFocusIds", item.expectedFocusId) &&
        (item.expectedFocusMoveCount === null ||
          (Number.isSafeInteger(item.expectedFocusMoveCount) &&
            [0, 1].includes(Number(item.expectedFocusMoveCount)))) &&
        (item.observedOutcomeId === null ||
          enumIncludes("keyboardOutcomeIds", item.observedOutcomeId)) &&
        (item.observedFocusId === null || enumIncludes("keyboardFocusIds", item.observedFocusId)) &&
        (item.observedFocusMoveCount === null ||
          (Number.isSafeInteger(item.observedFocusMoveCount) &&
            [0, 1].includes(Number(item.observedFocusMoveCount)))) &&
        (item.observedAnnouncementDelta === null ||
          (Number.isSafeInteger(item.observedAnnouncementDelta) &&
            [0, 1].includes(Number(item.observedAnnouncementDelta)))) &&
        item.noProgressMutation === true &&
        ["PASS", "EXCLUDED"].includes(String(item.verdict))
      );
    case "AnnouncementRecord":
      return (
        Number.isSafeInteger(item.sequence) &&
        Number(item.sequence) > 0 &&
        enumIncludes("announcementEventIds", item.eventId) &&
        enumIncludes("nvdaModeIds", item.modeId) &&
        enumIncludes("focusTargetIds", item.sourceTargetId) &&
        enumIncludes("focusRoleIds", item.roleId) &&
        safeText(item.accessibleName, 160) &&
        [item.accessibleState, item.accessibleValue].every(
          (field) =>
            typeof field === "string" &&
            field === field.normalize("NFC") &&
            !/[\u0000-\u001f\u007f]/.test(field),
        ) &&
        ["polite", "assertive", "none", "off"].includes(String(item.politeness)) &&
        item.count === 1 &&
        safeText(item.spokenText, 240)
      );
    case "StateOutcome":
      return (
        enumIncludes("visibleStatusIds", item.stateId) &&
        validVariantForState(item.stateId, item.variantId) &&
        item.stateId === item.visibleStatusId &&
        enumIncludes("primaryActionIds", item.primaryActionId)
      );
    case "MotionExecution": {
      const motion = expectedNormalMotion.find(({ motionId }) => motionId === item.motionId);
      const interrupted = item.interruptedBy !== null;
      return (
        !!motion &&
        item.triggerId === motion.triggerId &&
        item.ownerId === motion.ownerId &&
        JSON.stringify(item.propertyIds) === JSON.stringify(motion.propertyIds) &&
        item.configuredDurationMs === motion.durationMs &&
        Number.isSafeInteger(item.observedDurationMs) &&
        Number(item.observedDurationMs) >= 0 &&
        Number(item.observedDurationMs) <= Number(item.configuredDurationMs) &&
        item.easingId === motion.easingId &&
        stateIds.includes(String(item.startedStateId)) &&
        (item.interruptedBy === null ||
          [
            "semantic_state",
            "generation",
            "dialog_dismissal",
            "resize",
            "visibility",
            "reduced_motion",
          ].includes(String(item.interruptedBy))) &&
        stateIds.includes(String(item.settledStateId)) &&
        item.staleCallbackCount === 0 &&
        validArtifactType("FocusPosition", item.focusPosition) &&
        [0, 1].includes(Number(item.announcementCount)) &&
        Number.isSafeInteger(item.announcementCount) &&
        ["APPLICABLE", "NON_APPLICABLE"].includes(String(item.applicability)) &&
        ((item.applicability === "APPLICABLE" && item.exclusionReason === null) ||
          (item.applicability === "NON_APPLICABLE" &&
            ["trigger_not_observed", "owner_not_present"].includes(String(item.exclusionReason)) &&
            item.observedDurationMs === 0)) &&
        (!interrupted ||
          (item.applicability === "APPLICABLE" &&
            item.exclusionReason === null &&
            Number(item.observedDurationMs) < Number(item.configuredDurationMs) &&
            item.announcementCount === 1))
      );
    }
    case "StaticEquivalent":
      return (
        enumIncludes("visibleStatusIds", item.finalStateId) &&
        enumIncludes("primaryActionIds", item.primaryActionId) &&
        validArtifactType("FocusPosition", item.focusPosition) &&
        typeof item.copyDigest === "string" &&
        /^[0-9a-f]{64}$/.test(item.copyDigest) &&
        Number.isSafeInteger(item.progressValue) &&
        Number(item.progressValue) >= 0 &&
        Number.isSafeInteger(item.announcementCount) &&
        Number(item.announcementCount) >= 0 &&
        Number(item.announcementCount) <= 1
      );
    default:
      return false;
  }
};

const focusPositionMatchesTheme = (value: unknown, requiredRingId: string): boolean => {
  if (!validArtifactType("FocusPosition", value)) return false;
  const position = record(value);
  return (
    (position.kind === "document" && position.target === null) ||
    (position.kind === "element" && record(position.target).focusRingId === requiredRingId)
  );
};

const validKeyboardProtocol = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.length === keyboardProtocol.length &&
  value.every(
    (entry, index) =>
      exactObjectKeys(entry, keyboardProtocolFields) &&
      validArtifactType("KeyboardProtocolRecord", entry) &&
      record(entry).sequence === index + 1,
  ) &&
  new Set(records(value).map(({ interactionId }) => interactionId)).size === value.length &&
  JSON.stringify(value) === JSON.stringify(keyboardProtocol);

const validKeyboardPresentationFocusMap = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.length === 69 &&
  value.every(
    (entry) =>
      exactObjectKeys(entry, keyboardPresentationFocusMapFields) &&
      validTransitionPresentationId(record(entry).presentationId) &&
      keyboardProtocol.some(({ interactionId }) => interactionId === record(entry).interactionId) &&
      record(entry).applicability === "APPLICABLE" &&
      enumIncludes("keyboardFocusIds", record(entry).expectedFocusTargetId) &&
      Number.isSafeInteger(record(entry).expectedFocusMoveCount) &&
      [0, 1].includes(Number(record(entry).expectedFocusMoveCount)) &&
      enumIncludes("keyboardFocusRationaleIds", record(entry).rationaleId),
  ) &&
  new Set(
    records(value).map(({ presentationId, interactionId }) => `${presentationId}|${interactionId}`),
  ).size === value.length &&
  JSON.stringify(value) === JSON.stringify(keyboardPresentationFocusMap);

const dialogContextForCell = (cell: JsonRecord): string | null => {
  const variantId = stateFixtureVariant(cell.stateId, cell.fixtureId)?.variantId ?? null;
  if (cell.stateId === "ACTIVE" && cell.fixtureId === "late_confirmation_after_exit")
    return "active_with_answer";
  if (cell.stateId === "SUBMITTING" && cell.fixtureId === "late_confirmation_after_exit")
    return "submitting_in_flight";
  if (
    cell.stateId === "RETRYABLE_ERROR" &&
    variantId === "retryable_error_submit" &&
    cell.fixtureId === "network_loss_during_submit"
  )
    return "retryable_submit_with_answer";
  if (
    cell.stateId === "OFFLINE_READ_ONLY" &&
    variantId === "offline_read_only_active" &&
    cell.fixtureId === "network_loss_during_submit"
  )
    return "offline_active_with_answer";
  return null;
};

const keyboardApplicabilityForCell = (cell: JsonRecord): JsonRecord | undefined => {
  const variantId = stateFixtureVariant(cell.stateId, cell.fixtureId)?.variantId ?? null;
  const dialogContextId = dialogContextForCell(cell);
  return records(record(catalog.evidence).keyboardApplicability).find(
    (entry) =>
      entry.stateId === cell.stateId &&
      entry.variantId === variantId &&
      entry.dialogContextId === dialogContextId,
  );
};

const keyboardPresentationIdForCell = (cell: JsonRecord): string => {
  const variantId = stateFixtureVariant(cell.stateId, cell.fixtureId)?.variantId ?? null;
  return variantId === null ? String(cell.stateId) : `${String(cell.stateId)}:${variantId}`;
};

const keyboardPresentationFocusContract = (
  presentationId: string,
  interactionId: string,
): JsonRecord | undefined =>
  records(record(catalog.evidence).keyboardPresentationFocusMap).find(
    (entry) => entry.presentationId === presentationId && entry.interactionId === interactionId,
  );

const exclusionReason = (interactionId: unknown, dialogContextId: unknown): string => {
  if (
    dialogContextId !== null &&
    !["dialog_tab_cycle", "dialog_escape"].includes(String(interactionId))
  )
    return "modal_background_inert";
  if (["radio_next", "radio_previous", "radio_select"].includes(String(interactionId)))
    return "radio_group_not_present";
  if (interactionId === "primary_action_activate") return "enabled_primary_action_not_present";
  return "exit_dialog_not_open";
};

const expectedKeyboardExecutions = (cell: JsonRecord): JsonRecord[] => {
  const applicability = keyboardApplicabilityForCell(cell);
  if (!applicability) return [];
  const applicable = new Set(strings(applicability.applicableInteractionIds));
  const presentationId = keyboardPresentationIdForCell(cell);
  return keyboardProtocol.map((protocol) => {
    const isApplicable = applicable.has(String(protocol.interactionId));
    const focusContract = isApplicable
      ? keyboardPresentationFocusContract(presentationId, String(protocol.interactionId))
      : undefined;
    return {
      sequence: protocol.sequence,
      interactionId: protocol.interactionId,
      applicability: isApplicable ? "APPLICABLE" : "EXCLUDED",
      exclusionReason: isApplicable
        ? null
        : exclusionReason(protocol.interactionId, applicability.dialogContextId),
      expectedOutcomeId: protocol.expectedOutcomeId,
      expectedFocusId: focusContract?.expectedFocusTargetId ?? protocol.expectedFocusId,
      expectedFocusMoveCount: focusContract?.expectedFocusMoveCount ?? null,
      observedOutcomeId: isApplicable ? protocol.expectedOutcomeId : null,
      observedFocusId: isApplicable ? focusContract?.expectedFocusTargetId : null,
      observedFocusMoveCount: isApplicable ? focusContract?.expectedFocusMoveCount : null,
      observedAnnouncementDelta: isApplicable ? protocol.announcementDelta : null,
      noProgressMutation: true,
      verdict: isApplicable ? "PASS" : "EXCLUDED",
    };
  });
};

const validKeyboardExecutions = (value: unknown, cell: JsonRecord): boolean =>
  Array.isArray(value) &&
  value.length === keyboardProtocol.length &&
  value.every(
    (entry) =>
      exactObjectKeys(entry, keyboardExecutionFields) &&
      validArtifactType("KeyboardExecutionRecord", entry),
  ) &&
  JSON.stringify(value) === JSON.stringify(expectedKeyboardExecutions(cell));

const focusRoleByTarget: Record<string, string> = {
  skip_link: "link",
  top_bar_back: "button",
  named_progress: "progressbar",
  state_heading: "heading",
  prompt: "heading",
  response_group: "radiogroup",
  feedback_status: "status",
  primary_action: "button",
  exit_dialog: "dialog",
  exit_stay: "button",
  exit_leave: "button",
  invoking_exit_control: "button",
};

const expectedFocusStops = (cell: JsonRecord): JsonRecord[] => {
  const variantId = stateFixtureVariant(cell.stateId, cell.fixtureId)?.variantId ?? null;
  const action = stateActionContract(cell.stateId, variantId);
  const targets = dialogContextForCell(cell)
    ? ["exit_stay", "exit_leave"]
    : ["skip_link", "top_bar_back", "named_progress", "state_heading"];
  if (!dialogContextForCell(cell)) {
    if (cell.stateId === "ACTIVE") targets.push("prompt", "response_group");
    else targets.push("feedback_status");
    if (action?.primaryActionId !== "none") targets.push("primary_action");
  }
  const profile = expectedCaptureProfile(cell);
  const ring = focusRingContractForTheme(cell.themeId);
  if (!ring) return [];
  return targets.map((targetId, index) => ({
    order: index + 1,
    target: {
      targetId,
      roleId: focusRoleByTarget[targetId],
      accessibleName:
        targetId === "exit_stay"
          ? "Stay"
          : targetId === "exit_leave"
            ? "Leave activity"
            : targetId.replaceAll("_", " "),
      rect: {
        x: 0,
        y: Math.min(index * 44, Number(profile.observedHeightCssPx) - 44),
        width: Math.min(160, Number(profile.observedWidthCssPx)),
        height: 44,
      },
      focusRingId: ring.ringId,
    },
    visible: true,
    named: true,
    operable: true,
  }));
};

const validFocusArtifact = (value: unknown, owningCell: unknown): boolean => {
  const contract = record(
    records(record(catalog.evidence).artifactContracts).find(
      ({ artifactId }) => artifactId === "focus.json",
    )?.validationRecordContract,
  );
  if (!exactObjectKeys(value, strings(contract.fieldOrder)) || !validCellIdentity(owningCell))
    return false;
  const item = record(value);
  if (!Array.isArray(item.stops)) return false;
  const stops = item.stops;
  const variantAssignment = stateFixtureVariant(
    record(owningCell).stateId,
    record(owningCell).fixtureId,
  );
  const requiredRingContract = focusRingContractForTheme(record(owningCell).themeId);
  if (!requiredRingContract || !variantAssignment) return false;
  const requiredRingId = String(requiredRingContract.ringId);
  const expectedStops = expectedFocusStops(record(owningCell));
  const dialogOpen = dialogContextForCell(record(owningCell)) !== null;
  return (
    item.schemaVersion === 1 &&
    validArtifactEnvelope(item, record(owningCell)) &&
    item.stateId === record(owningCell).stateId &&
    item.variantId === variantAssignment.variantId &&
    item.themeId === record(owningCell).themeId &&
    stops.every((stop, index) => {
      if (!validArtifactType("FocusStop", stop)) return false;
      return (
        record(stop).order === index + 1 &&
        record(record(stop).target).focusRingId === requiredRingId
      );
    }) &&
    JSON.stringify(stops) === JSON.stringify(expectedStops) &&
    (stateActionContract(item.stateId, item.variantId)?.primaryActionId === "none" ||
      stops.length > 0) &&
    new Set(stops.map((stop) => record(record(stop).target).targetId)).size === stops.length &&
    focusPositionMatchesTheme(item.initialFocus, requiredRingId) &&
    (dialogOpen
      ? record(record(item.initialFocus).target ?? {}).targetId === "exit_stay"
      : record(item.initialFocus).kind === "document") &&
    validKeyboardProtocol(item.keyboardProtocol) &&
    validKeyboardExecutions(item.keyboardExecutions, record(owningCell)) &&
    focusPositionMatchesTheme(item.finalFocus, requiredRingId) &&
    (dialogOpen
      ? record(record(item.finalFocus).target ?? {}).targetId === "invoking_exit_control"
      : record(item.finalFocus).kind === "document") &&
    item.verdict === "PASS"
  );
};

const nvdaEventIdsForCell = (cell: JsonRecord): string[] => {
  const byState: Record<string, string[]> = {
    PREPARING: ["state_entry"],
    ACTIVE: ["state_entry", "active_radio_group", "radio_selection"],
    SUBMITTING: ["submission_pending"],
    CONFIRMED: ["confirmation", "confirmed_progress_changed"],
    RETRYABLE_ERROR: ["retryable_error"],
    STALE_CONTENT: ["state_entry"],
    SESSION_ENDED: ["session_ended"],
    ACCESS_BLOCKED: ["access_blocked"],
    EMPTY_REVIEW: ["empty_review"],
    OFFLINE_READ_ONLY: ["offline"],
  };
  const events = [...(byState[String(cell.stateId)] ?? [])];
  if (dialogContextForCell(cell)) events.push("exit_dialog_opened", "exit_dialog_dismissed");
  return nvdaProtocolEventIds.filter((eventId) => events.includes(eventId));
};

const expectedNvdaRecords = (cell: JsonRecord): JsonRecord[] => {
  const variantId = stateFixtureVariant(cell.stateId, cell.fixtureId)?.variantId ?? null;
  const copy =
    records(catalog.stateVariants).find(({ variantId: id }) => id === variantId) ??
    records(catalog.states).find(({ stateId }) => stateId === cell.stateId);
  if (!copy) return [];
  const dialogContextId = dialogContextForCell(cell);
  const context = records(catalog.exitDialogContexts).find(
    ({ contextId }) => contextId === dialogContextId,
  );
  const dialog = context
    ? records(catalog.exitDialogs).find(({ dialogId }) => dialogId === context.dialogId)
    : undefined;
  const templates = records(record(catalog.evidence).nvdaExpectationTemplates);
  const observation = record(record(catalog.evidence).syntheticObservationValues);
  const selectedOption = `${String(observation.selectedOptionLabel)}, ${String(
    observation.selectedOptionPosition,
  )} of ${String(observation.selectedOptionCount)}`;
  const confirmedProgress = `${String(observation.confirmedCount)} of ${String(
    observation.dailyTarget,
  )} activities complete today.`;
  return nvdaEventIdsForCell(cell).map((eventId, index) => {
    const template = templates.find(
      (entry) =>
        entry.eventId === eventId &&
        (entry.stateId === cell.stateId || entry.stateId === "closed_by_dialog_context"),
    );
    if (!template) return {};
    const accessibleName =
      template.accessibleNameTemplate === "exact_state_or_variant_heading"
        ? copy.heading
        : template.accessibleNameTemplate === "literal_Answers"
          ? "Answers"
          : template.accessibleNameTemplate === "exact_synthetic_selected_option"
            ? selectedOption
            : template.accessibleNameTemplate === "literal_Today’s_goal_progress"
              ? "Today’s goal progress"
              : template.accessibleNameTemplate === "exact_dialog_heading"
                ? dialog?.heading
                : "Leave activity";
    const accessibleValue =
      template.accessibleValueTemplate === "exact_confirmed_count_of_daily_target"
        ? confirmedProgress
        : "";
    const spokenText =
      template.spokenTextTemplate === "exact_heading_period_space_exact_body"
        ? `${String(copy.heading)}. ${String(copy.body)}`
        : template.spokenTextTemplate === "exact_heading"
          ? String(copy.heading)
          : template.spokenTextTemplate === "literal_Answers_required"
            ? "Answers required"
            : template.spokenTextTemplate === "exact_synthetic_selected_option_checked"
              ? `${selectedOption} checked`
              : template.spokenTextTemplate ===
                  "literal_Today’s_goal_progress_period_space_exact_confirmed_count_of_daily_target"
                ? `Today’s goal progress. ${confirmedProgress}`
                : template.spokenTextTemplate === "exact_dialog_heading"
                  ? dialog?.heading
                  : "Leave activity";
    return {
      sequence: index + 1,
      eventId,
      modeId: template.modeId,
      sourceTargetId: template.sourceTargetId,
      roleId: template.roleId,
      accessibleName,
      accessibleState: template.accessibleState,
      accessibleValue,
      politeness: template.politeness,
      count: template.count,
      spokenText,
    };
  });
};

const validAnnouncementsArtifact = (
  value: unknown,
  owningCell: unknown,
  expectedNvdaVersion: string,
): boolean => {
  const contract = record(
    records(record(catalog.evidence).artifactContracts).find(
      ({ artifactId }) => artifactId === "announcements.txt",
    )?.validationRecordContract,
  );
  if (!exactObjectKeys(value, strings(contract.fieldOrder)) || !validCellIdentity(owningCell))
    return false;
  const item = record(value);
  const variantAssignment = stateFixtureVariant(
    record(owningCell).stateId,
    record(owningCell).fixtureId,
  );
  if (!variantAssignment || !safeDottedVersion(expectedNvdaVersion)) return false;
  if (!Array.isArray(item.records)) return false;
  const announcementRecords = records(item.records);
  const expectedRecords = expectedNvdaRecords(record(owningCell));
  const dialogContextId = dialogContextForCell(record(owningCell));
  return (
    item.schemaVersion === 1 &&
    validArtifactEnvelope(item, record(owningCell)) &&
    item.stateId === record(owningCell).stateId &&
    item.variantId === variantAssignment.variantId &&
    item.themeId === record(owningCell).themeId &&
    item.dialogContextId === dialogContextId &&
    item.entryContextId === "client_transition" &&
    item.nvdaVersion === expectedNvdaVersion &&
    item.reviewerRole === "Elana" &&
    announcementRecords.length === expectedRecords.length &&
    announcementRecords.every(
      (entry, index) =>
        validArtifactType("AnnouncementRecord", entry) &&
        JSON.stringify(entry) === JSON.stringify(expectedRecords[index]),
    ) &&
    new Set(announcementRecords.map(({ eventId }) => eventId)).size ===
      announcementRecords.length &&
    !forbiddenManifestData(item) &&
    item.verdict === "PASS"
  );
};

const presentationForStateVariant = (stateId: unknown, variantId: unknown): JsonRecord => {
  return (
    records(catalog.stateVariants).find(({ variantId: candidate }) => candidate === variantId) ??
    records(catalog.states).find(({ stateId: candidate }) => candidate === stateId)!
  );
};
const motionOutcomeForCell = (
  cell: JsonRecord,
): { stateId: unknown; variantId: unknown; announcementCount: number } => {
  const interruption = motionInterruptionForCell(cell);
  return interruption
    ? {
        stateId: interruption.expectedSettledStateId,
        variantId: interruption.expectedSettledVariantId,
        announcementCount: Number(interruption.expectedAnnouncementCount),
      }
    : {
        stateId: cell.stateId,
        variantId: stateFixtureVariant(cell.stateId, cell.fixtureId)?.variantId ?? null,
        announcementCount: 0,
      };
};
const resolvedPresentationBody = (presentation: JsonRecord): string =>
  JSON.stringify(presentation.body) === JSON.stringify(confirmedFeedbackBodyReference)
    ? feedbackFallback
    : String(presentation.body);
const semanticTextForMotionOutcome = (cell: JsonRecord): string => {
  const outcome = motionOutcomeForCell(cell);
  const presentation = presentationForStateVariant(outcome.stateId, outcome.variantId);
  return `${String(presentation.heading)}. ${resolvedPresentationBody(presentation)}`;
};
const copyDigestForMotionOutcome = (cell: JsonRecord): string => {
  const outcome = motionOutcomeForCell(cell);
  const presentation = presentationForStateVariant(outcome.stateId, outcome.variantId);
  return valueDigest({
    heading: presentation.heading,
    body: resolvedPresentationBody(presentation),
    primaryAction: presentation.primaryAction,
  });
};

const validReducedMotionArtifact = (
  value: unknown,
  owningCell: unknown,
  pairedFocusArtifact: unknown,
): boolean => {
  const contract = record(
    records(record(catalog.evidence).artifactContracts).find(
      ({ artifactId }) => artifactId === "reduced-motion.json",
    )?.validationRecordContract,
  );
  if (!exactObjectKeys(value, strings(contract.fieldOrder))) return false;
  const item = record(value);
  const variantAssignment = validCellIdentity(owningCell)
    ? stateFixtureVariant(record(owningCell).stateId, record(owningCell).fixtureId)
    : undefined;
  const motionOutcome = variantAssignment ? motionOutcomeForCell(record(owningCell)) : undefined;
  const actionContract = motionOutcome
    ? stateActionContract(motionOutcome.stateId, motionOutcome.variantId)
    : undefined;
  const pairedFocus = record(pairedFocusArtifact);
  if (!Array.isArray(item.normalRun) || !Array.isArray(item.reducedRun)) return false;
  const normalRun = records(item.normalRun);
  const reducedRun = records(item.reducedRun);
  const staticEquivalent = record(item.staticEquivalent);
  const focusBinding = record(item.focusBinding);
  const announcementBinding = record(item.announcementBinding);
  const runsMatchCatalog = (run: JsonRecord[], reduced: boolean): boolean =>
    run.length === expectedNormalMotion.length &&
    run.every((execution, index) => {
      const motion = expectedNormalMotion[index]!;
      const applicable = execution.applicability === "APPLICABLE";
      const expectedApplicable = applicableMotionIdsForCell(record(owningCell)).has(
        String(motion.motionId),
      );
      const interruption = motionInterruptionFor(record(owningCell), motion.motionId);
      const expectedSettledStateId =
        interruption?.expectedSettledStateId ?? record(owningCell).stateId;
      const expectedAnnouncementCount = interruption
        ? Number(interruption.expectedAnnouncementCount)
        : applicable && motion.motionId === "entry"
          ? 1
          : 0;
      const expectedNormalDuration = interruption
        ? Math.max(1, Math.floor(Number(motion.durationMs) / 2))
        : applicable
          ? motion.durationMs
          : 0;
      return (
        exactObjectKeys(execution, motionExecutionFields) &&
        validArtifactType("MotionExecution", execution) &&
        execution.motionId === motion.motionId &&
        execution.startedStateId === record(owningCell).stateId &&
        execution.settledStateId === expectedSettledStateId &&
        execution.interruptedBy === (interruption?.interruptedBy ?? null) &&
        execution.staleCallbackCount === 0 &&
        execution.announcementCount === expectedAnnouncementCount &&
        applicable === expectedApplicable &&
        (interruption === undefined || expectedApplicable) &&
        JSON.stringify(execution.focusPosition) === JSON.stringify(pairedFocus.finalFocus) &&
        (reduced
          ? execution.observedDurationMs === 0
          : execution.observedDurationMs === expectedNormalDuration) &&
        (applicable
          ? execution.exclusionReason === null
          : execution.exclusionReason === "trigger_not_observed")
      );
    });
  const pairedRunsEqual = normalRun.every((normalExecution, index) => {
    const reducedExecution = reducedRun[index];
    if (!reducedExecution) return false;
    const withoutObservedDuration = (execution: JsonRecord) =>
      Object.fromEntries(
        Object.entries(execution).filter(([field]) => field !== "observedDurationMs"),
      );
    return (
      JSON.stringify(withoutObservedDuration(normalExecution)) ===
      JSON.stringify(withoutObservedDuration(reducedExecution))
    );
  });
  return (
    validCellIdentity(owningCell) &&
    actionContract !== undefined &&
    item.schemaVersion === 1 &&
    validArtifactEnvelope(item, record(owningCell)) &&
    validFocusArtifact(pairedFocusArtifact, owningCell) &&
    runsMatchCatalog(normalRun, false) &&
    runsMatchCatalog(reducedRun, true) &&
    pairedRunsEqual &&
    validArtifactType("StaticEquivalent", item.staticEquivalent) &&
    motionOutcome !== undefined &&
    staticEquivalent.finalStateId === motionOutcome.stateId &&
    staticEquivalent.primaryActionId === actionContract.primaryActionId &&
    JSON.stringify(staticEquivalent.focusPosition) === JSON.stringify(pairedFocus.finalFocus) &&
    staticEquivalent.copyDigest === copyDigestForMotionOutcome(record(owningCell)) &&
    staticEquivalent.progressValue ===
      Number(record(record(catalog.evidence).syntheticObservationValues).confirmedCount) &&
    exactObjectKeys(item.focusBinding, ["normalPosition", "reducedPosition", "preserved"]) &&
    JSON.stringify(focusBinding.normalPosition) === JSON.stringify(pairedFocus.finalFocus) &&
    JSON.stringify(focusBinding.reducedPosition) === JSON.stringify(pairedFocus.finalFocus) &&
    focusBinding.preserved === true &&
    exactObjectKeys(item.announcementBinding, [
      "normalCount",
      "reducedCount",
      "semanticText",
      "callbacksSilent",
      "preserved",
    ]) &&
    announcementBinding.normalCount === staticEquivalent.announcementCount &&
    announcementBinding.reducedCount === staticEquivalent.announcementCount &&
    staticEquivalent.announcementCount === motionOutcome.announcementCount &&
    announcementBinding.semanticText === semanticTextForMotionOutcome(record(owningCell)) &&
    announcementBinding.callbacksSilent === true &&
    announcementBinding.preserved === true &&
    item.verdict === "PASS"
  );
};

const canonicalJsonBytes = (value: unknown): Buffer => Buffer.from(`${JSON.stringify(value)}\n`);

const parseCanonicalJsonBytes = (bytes: Buffer): unknown | undefined => {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.startsWith("\uFEFF") || !text.endsWith("\n") || text.includes("\r")) return undefined;
    const parsed = parseStrictJson(text.slice(0, -1));
    return text === `${JSON.stringify(parsed)}\n` ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const syntheticRegions = (cell: JsonRecord): JsonRecord[] => {
  const profile = expectedCaptureProfile(cell);
  const regionIds = strings(artifactEnums.regionIds);
  const width = Number(profile.observedWidthCssPx);
  const height = Number(profile.observedHeightCssPx);
  const baseHeight = Math.floor(height / regionIds.length);
  let y = 0;
  return regionIds.map((regionId, index) => {
    const regionHeight = index === regionIds.length - 1 ? height - y : baseHeight;
    const entry = { regionId, rect: { x: 0, y, width, height: regionHeight }, visible: true };
    y += regionHeight;
    return entry;
  });
};

const rectWithin = (rectValue: unknown, width: number, height: number): boolean => {
  const rect = record(rectValue);
  return (
    Number(rect.x) >= 0 &&
    Number(rect.y) >= 0 &&
    Number(rect.x) + Number(rect.width) <= width &&
    Number(rect.y) + Number(rect.height) <= height
  );
};

const rectanglesOverlap = (firstValue: unknown, secondValue: unknown): boolean => {
  const first = record(firstValue);
  const second = record(secondValue);
  return (
    Number(first.x) < Number(second.x) + Number(second.width) &&
    Number(first.x) + Number(first.width) > Number(second.x) &&
    Number(first.y) < Number(second.y) + Number(second.height) &&
    Number(first.y) + Number(first.height) > Number(second.y)
  );
};

const expectedOverlapPairs = (regions: JsonRecord[]): JsonRecord[] => {
  const contentRegions = regions.filter(({ regionId }) => regionId !== "document");
  const pairs: JsonRecord[] = [];
  for (let first = 0; first < contentRegions.length; first += 1)
    for (let second = first + 1; second < contentRegions.length; second += 1)
      pairs.push({
        firstRegionId: contentRegions[first]!.regionId,
        secondRegionId: contentRegions[second]!.regionId,
        overlaps: rectanglesOverlap(contentRegions[first]!.rect, contentRegions[second]!.rect),
      });
  return pairs;
};

const validOverflowArtifact = (value: unknown, owningCell: JsonRecord): boolean => {
  const contract = record(
    records(record(catalog.evidence).artifactContracts).find(
      ({ artifactId }) => artifactId === "overflow.json",
    )?.validationRecordContract,
  );
  if (!exactObjectKeys(value, strings(contract.fieldOrder))) return false;
  const item = record(value);
  if (
    item.schemaVersion !== 1 ||
    !validArtifactType("DocumentDimensions", item.document) ||
    !Array.isArray(item.regions) ||
    !item.regions.every((entry) => validArtifactType("RegionRecord", entry)) ||
    !Array.isArray(item.clipping) ||
    !item.clipping.every((entry) => validArtifactType("ClippingRecord", entry)) ||
    !Array.isArray(item.overlap) ||
    !item.overlap.every((entry) => validArtifactType("OverlapRecord", entry))
  )
    return false;
  const profile = expectedCaptureProfile(owningCell);
  const document = record(item.document);
  const regions = records(item.regions);
  const regionIds = strings(artifactEnums.regionIds);
  const expectedClipping = regions.map(({ regionId, rect, visible }) => ({
    regionId,
    clipped:
      visible !== true ||
      !rectWithin(rect, Number(document.clientWidthCssPx), Number(document.clientHeightCssPx)),
  }));
  const expectedOverlap = expectedOverlapPairs(regions);
  const primary = regions.find(({ regionId }) => regionId === "primary_action");
  const primaryClipping = expectedClipping.find(({ regionId }) => regionId === "primary_action");
  const horizontalPageOverflow =
    Number(document.scrollWidthCssPx) > Number(document.clientWidthCssPx);
  const pass =
    expectedClipping.every(({ clipped }) => clipped === false) &&
    expectedOverlap.every(({ overlaps }) => overlaps === false) &&
    !!primary &&
    primaryClipping?.clipped === false &&
    horizontalPageOverflow === false;
  return (
    validArtifactEnvelope(item, owningCell) &&
    document.clientWidthCssPx === profile.observedWidthCssPx &&
    document.clientHeightCssPx === profile.observedHeightCssPx &&
    regions.map(({ regionId }) => regionId).join("\0") === regionIds.join("\0") &&
    regions.every(({ rect }) =>
      rectWithin(rect, Number(document.scrollWidthCssPx), Number(document.scrollHeightCssPx)),
    ) &&
    JSON.stringify(item.clipping) === JSON.stringify(expectedClipping) &&
    JSON.stringify(item.overlap) === JSON.stringify(expectedOverlap) &&
    item.primaryActionReachable === (!!primary && primaryClipping?.clipped === false) &&
    item.horizontalPageOverflow === horizontalPageOverflow &&
    item.verdict === (pass ? "PASS" : "FAIL")
  );
};

const semanticContrastOwnershipFields = [
  "semanticPairId",
  "themeId",
  "usageClass",
  "foregroundTokenId",
  "backgroundTokenId",
  "observedForegroundRgba",
  "observedBackgroundRgba",
  "requiredRatio",
  "computedRatio",
  "passes",
];
const semanticContrastOwnership = records(record(catalog.visual).semanticContrastOwnership);
const expectedContrastPairs = (cell: JsonRecord): JsonRecord[] =>
  semanticContrastOwnership.filter(({ themeId }) => themeId === cell.themeId || themeId === "both");

const validContrastArtifact = (value: unknown, owningCell: JsonRecord): boolean => {
  const contract = record(
    records(record(catalog.evidence).artifactContracts).find(
      ({ artifactId }) => artifactId === "contrast.json",
    )?.validationRecordContract,
  );
  if (!exactObjectKeys(value, strings(contract.fieldOrder))) return false;
  const item = record(value);
  if (
    item.schemaVersion !== 1 ||
    !Array.isArray(item.pairs) ||
    item.pairs.length === 0 ||
    !item.pairs.every((entry) => validArtifactType("ContrastPair", entry))
  )
    return false;
  return (
    validArtifactEnvelope(item, owningCell) &&
    JSON.stringify(item.pairs) === JSON.stringify(expectedContrastPairs(owningCell)) &&
    new Set(records(item.pairs).map(({ semanticPairId }) => semanticPairId)).size ===
      item.pairs.length &&
    item.verdict === "PASS"
  );
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
const crc32 = (bytes: Buffer): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const pngChunk = (type: string, data: Buffer): Buffer => {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
};
const resourceBudgets = record(record(catalog.evidence).artifactResourceBudgets);
const safeProduct = (...values: number[]): number | undefined => {
  let product = 1;
  for (const value of values) {
    if (!Number.isSafeInteger(value) || value <= 0 || product > Number.MAX_SAFE_INTEGER / value)
      return undefined;
    product *= value;
  }
  return product;
};

const syntheticFixturePngPixels = (
  cell: JsonRecord,
  role: "actual.png" | "baseline.png" | "diff.png",
  width: number,
  height: number,
): Buffer => {
  const pixelBytes = safeProduct(width, height, 4);
  if (!pixelBytes || pixelBytes > Number(resourceBudgets.pngMaximumDecodedBytes))
    throw new Error("synthetic PNG exceeds closed decoded budget");
  const pixels = Buffer.alloc(pixelBytes);
  if (role !== "diff.png") {
    const digestBytes = Buffer.from(cellDigest(cell), "hex");
    digestBytes.copy(pixels, 0, 0, Math.min(digestBytes.length, pixels.length));
    if (role === "actual.png") {
      pixels[32] = 255;
      pixels[33] = 0;
      pixels[34] = 255;
      pixels[35] = 255;
    }
  } else {
    pixels[32] = 255;
    pixels[33] = 0;
    pixels[34] = 255;
    pixels[35] = 255;
  }
  return pixels;
};

const encodePng = (width: number, height: number, pixels: Buffer): Buffer => {
  const rowPixelBytes = safeProduct(width, 4);
  if (!rowPixelBytes || pixels.length !== rowPixelBytes * height)
    throw new Error("invalid synthetic RGBA8 pixels");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rowBytes = rowPixelBytes + 1;
  const decodedBytes = safeProduct(rowBytes, height);
  if (!decodedBytes || decodedBytes > Number(resourceBudgets.pngMaximumDecodedBytes))
    throw new Error("synthetic PNG exceeds decoded budget");
  const raw = Buffer.alloc(decodedBytes);
  for (let row = 0; row < height; row += 1)
    pixels.copy(raw, row * rowBytes + 1, row * rowPixelBytes, (row + 1) * rowPixelBytes);
  const idat = deflateSync(raw, { level: 1 });
  if (idat.length > Number(resourceBudgets.pngMaximumCompressedIdatBytes))
    throw new Error("synthetic PNG exceeds compressed budget");
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
};

const syntheticPng = (
  cell: JsonRecord,
  role: "actual.png" | "baseline.png" | "diff.png",
): Buffer => {
  const profile = expectedCaptureProfile(cell);
  const width = Number(profile.observedWidthCssPx) * Number(profile.deviceScaleFactor);
  const height = Number(profile.observedHeightCssPx) * Number(profile.deviceScaleFactor);
  return encodePng(width, height, syntheticFixturePngPixels(cell, role, width, height));
};

type PngInfo = {
  width: number;
  height: number;
  pixels: Buffer;
  idatBytes: number;
  decodedBytes: number;
};
const parsePng = (
  bytes: Buffer,
  expectedWidth: number,
  expectedHeight: number,
): PngInfo | undefined => {
  try {
    if (bytes.length > Number(resourceBudgets.pngMaximumBytes)) return undefined;
    if (!bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return undefined;
    let offset = 8;
    let width = 0;
    let height = 0;
    const compressed: Buffer[] = [];
    const types: string[] = [];
    while (offset < bytes.length) {
      if (offset + 12 > bytes.length) return undefined;
      const length = bytes.readUInt32BE(offset);
      const end = offset + 12 + length;
      if (end > bytes.length) return undefined;
      const typeBytes = bytes.subarray(offset + 4, offset + 8);
      const type = typeBytes.toString("ascii");
      const data = bytes.subarray(offset + 8, offset + 8 + length);
      if (bytes.readUInt32BE(offset + 8 + length) !== crc32(Buffer.concat([typeBytes, data])))
        return undefined;
      if (!["IHDR", "IDAT", "IEND"].includes(type)) return undefined;
      types.push(type);
      if (type === "IHDR") {
        if (types.length !== 1 || length !== 13) return undefined;
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        if (
          !Number.isSafeInteger(width) ||
          !Number.isSafeInteger(height) ||
          width <= 0 ||
          height <= 0 ||
          data[8] !== 8 ||
          data[9] !== 6 ||
          data[10] !== 0 ||
          data[11] !== 0 ||
          data[12] !== 0
        )
          return undefined;
        if (width !== expectedWidth || height !== expectedHeight) return undefined;
      } else if (type === "IDAT") compressed.push(data);
      else if (type === "IEND" && (length !== 0 || end !== bytes.length)) return undefined;
      offset = end;
    }
    if (types[0] !== "IHDR" || types.at(-1) !== "IEND" || compressed.length === 0) return undefined;
    const idatBytes = compressed.reduce((total, chunk) => total + chunk.length, 0);
    if (idatBytes > Number(resourceBudgets.pngMaximumCompressedIdatBytes)) return undefined;
    const rowPixelBytes = safeProduct(width, 4);
    if (!rowPixelBytes) return undefined;
    const rowBytes = rowPixelBytes + 1;
    const decodedBytes = safeProduct(rowBytes, height);
    if (!decodedBytes || decodedBytes > Number(resourceBudgets.pngMaximumDecodedBytes))
      return undefined;
    const raw = inflateSync(Buffer.concat(compressed), { maxOutputLength: decodedBytes });
    if (raw.length !== decodedBytes) return undefined;
    const pixels = Buffer.alloc(rowPixelBytes * height);
    for (let row = 0; row < height; row += 1) {
      if (raw[row * rowBytes] !== 0) return undefined;
      raw.copy(pixels, row * rowPixelBytes, row * rowBytes + 1, (row + 1) * rowBytes);
    }
    return { width, height, pixels, idatBytes, decodedBytes };
  } catch {
    return undefined;
  }
};

const announcementFields = [
  "sequence",
  "eventId",
  "modeId",
  "sourceTargetId",
  "roleId",
  "accessibleName",
  "accessibleState",
  "accessibleValue",
  "politeness",
  "count",
  "spokenText",
];
const announcementEnvelopeFields = ["cellDigest", ...identityFields];
const announcementsBytes = (value: JsonRecord): Buffer =>
  Buffer.from(
    `@cell\t${announcementEnvelopeFields.map((field) => String(value[field])).join("\t")}\n${records(
      value.records,
    )
      .map((entry) => announcementFields.map((field) => String(entry[field])).join("\t"))
      .join("\n")}\n`,
  );
const parseAnnouncementRecords = (
  bytes: Buffer,
): { envelope: JsonRecord; records: JsonRecord[] } | undefined => {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.endsWith("\n") || text.includes("\r") || text !== text.normalize("NFC"))
      return undefined;
    const lines = text.slice(0, -1).split("\n");
    const header = lines.shift()?.split("\t") ?? [];
    if (
      header[0] !== "@cell" ||
      header.length !== announcementEnvelopeFields.length + 1 ||
      header.slice(1).some((value) => !safeSegment(value))
    )
      return undefined;
    const envelope = Object.fromEntries(
      announcementEnvelopeFields.map((field, index) => [field, header[index + 1]]),
    );
    const records = lines.map((line) => {
      const values = line.split("\t");
      if (
        values.length !== announcementFields.length ||
        values.some((value) => /[\r\n\t]/.test(value))
      )
        throw new Error("invalid announcement record");
      return Object.fromEntries(
        announcementFields.map((field, index) => [
          field,
          ["sequence", "count"].includes(field) ? Number(values[index]) : values[index],
        ]),
      );
    });
    return { envelope, records };
  } catch {
    return undefined;
  }
};

const scanEvidenceFields = [
  "physicalKey",
  "artifactId",
  "artifactHash",
  "structuredScannerId",
  "structuredScannerVersion",
  "structuredInputDigest",
  "structuredOutputDigest",
  "structuredCanarySetDigest",
  "structuredCanaryStatus",
  "structuredStatus",
  "metadataScannerId",
  "metadataScannerVersion",
  "metadataInputDigest",
  "metadataOutputDigest",
  "metadataCanarySetDigest",
  "metadataCanaryStatus",
  "metadataStatus",
  "ocrScannerId",
  "ocrScannerVersion",
  "ocrInputDigest",
  "ocrOutputDigest",
  "ocrCanarySetDigest",
  "ocrCanaryStatus",
  "ocrStatus",
  "ocrDenyScannerId",
  "ocrDenyScannerVersion",
  "ocrDenyInputDigest",
  "ocrDenyOutputDigest",
  "ocrDenyCanarySetDigest",
  "ocrDenyCanaryStatus",
  "ocrDenyStatus",
  "recursiveDenyScannerId",
  "recursiveDenyScannerVersion",
  "recursiveDenyInputDigest",
  "recursiveDenyOutputDigest",
  "recursiveDenyCanarySetDigest",
  "recursiveDenyCanaryStatus",
  "recursiveDenyStatus",
  "semanticValidatorId",
  "semanticValidatorVersion",
  "semanticInputDigest",
  "semanticOutputDigest",
  "semanticStatus",
  "scannerEvidenceDigest",
  "networkEgress",
  "cleanupDisposition",
];
const scannerContract = {
  structuredScannerId: "r4b_structured_artifact_v1",
  metadataScannerId: "r4b_png_metadata_v1",
  ocrScannerId: "r4b_local_no_network_ocr_v1",
  ocrDenyScannerId: "r4b_ocr_deny_v1",
  recursiveDenyScannerId: "r4b_recursive_deny_v1",
  semanticValidatorId: "r4b_cell_artifact_semantics_v1",
  scannerVersion: "1.0.0",
};
const scannerResultPayloadFields = [
  "schemaVersion",
  "sourceCommit",
  "buildCommit",
  "validationHead",
  "workflowFilePath",
  "workflowFileDigest",
  "workflowRunId",
  "runAttempt",
  "executedAtUtc",
  "scannerId",
  "scannerVersion",
  "physicalKey",
  "artifactId",
  "artifactHash",
  "captureInputDigest",
  "canarySetId",
  "canaryOutcomes",
  "findings",
  "status",
  "networkEgress",
];
type ScannerRunContext = {
  sourceCommit: string;
  buildCommit: string;
  validationHead: string;
  workflowFilePath: string;
  workflowFileDigest: string;
  workflowRunId: string;
  runAttempt: number;
  executedAtUtc: string;
  captureInputDigest: string;
};
const workflowFilePath = ".github/workflows/r4b-conversation-canvas.yml";
const scannerContext = (
  manifest: JsonRecord,
  physicalKey: string,
  artifactHash: string,
  workflowFileDigest = "d".repeat(64),
): ScannerRunContext => ({
  sourceCommit: String(manifest.sourceCommit),
  buildCommit: String(manifest.buildCommit),
  validationHead: String(manifest.buildCommit),
  workflowFilePath,
  workflowFileDigest,
  workflowRunId: "1001",
  runAttempt: 1,
  executedAtUtc: addUtcSeconds(manifest.capturedAtUtc, 24000),
  captureInputDigest: createHash("sha256")
    .update(`fluyo:r4b:scanner-capture-input:v1\n${physicalKey}\n${artifactHash}`)
    .digest("hex"),
});
const scannerCanaryIds: Record<string, string[]> = {
  r4b_structured_artifact_v1: ["canonical_schema", "forbidden_field", "wrong_cell"],
  r4b_png_metadata_v1: ["forbidden_chunk", "wrong_dimensions", "wrong_color_profile"],
  r4b_local_no_network_ocr_v1: ["pixel_text", "network_denied"],
  r4b_ocr_deny_v1: ["identity_text", "secret_text", "local_path_text"],
  r4b_recursive_deny_v1: ["binary_canary", "nested_archive", "metadata_canary"],
};
const applicableScannerIds = (artifactId: string): string[] =>
  artifactId.endsWith(".png")
    ? [
        scannerContract.metadataScannerId,
        scannerContract.ocrScannerId,
        scannerContract.ocrDenyScannerId,
        scannerContract.recursiveDenyScannerId,
      ]
    : [scannerContract.structuredScannerId, scannerContract.recursiveDenyScannerId];
const scannerResultPayload = (
  scannerId: string,
  physicalKey: string,
  artifactHash: string,
  context: ScannerRunContext,
): JsonRecord => ({
  schemaVersion: 1,
  sourceCommit: context.sourceCommit,
  buildCommit: context.buildCommit,
  validationHead: context.validationHead,
  workflowFilePath: context.workflowFilePath,
  workflowFileDigest: context.workflowFileDigest,
  workflowRunId: context.workflowRunId,
  runAttempt: context.runAttempt,
  executedAtUtc: context.executedAtUtc,
  scannerId,
  scannerVersion: scannerContract.scannerVersion,
  physicalKey,
  artifactId: artifactIdFromKey(physicalKey),
  artifactHash,
  captureInputDigest: context.captureInputDigest,
  canarySetId: "closed_canary_set_v1",
  canaryOutcomes: (scannerCanaryIds[scannerId] ?? []).map((canaryId) => ({
    canaryId,
    detected: true,
  })),
  findings: [],
  status: "PASS",
  networkEgress: "NONE",
});
const validScannerResultPayload = (
  bytes: Buffer | undefined,
  scannerId: string,
  physicalKey: string,
  artifactHash: string,
  context: ScannerRunContext,
): JsonRecord | undefined => {
  if (!bytes) return undefined;
  const parsed = parseCanonicalJsonBytes(bytes);
  if (!exactObjectKeys(parsed, scannerResultPayloadFields)) return undefined;
  const payload = record(parsed);
  const expectedCanaries = scannerCanaryIds[scannerId];
  if (!expectedCanaries) return undefined;
  const outcomes = records(payload.canaryOutcomes);
  if (
    payload.schemaVersion !== 1 ||
    payload.sourceCommit !== context.sourceCommit ||
    payload.buildCommit !== context.buildCommit ||
    payload.validationHead !== context.validationHead ||
    payload.workflowFilePath !== context.workflowFilePath ||
    payload.workflowFileDigest !== context.workflowFileDigest ||
    payload.workflowRunId !== context.workflowRunId ||
    payload.runAttempt !== context.runAttempt ||
    payload.executedAtUtc !== context.executedAtUtc ||
    payload.captureInputDigest !== context.captureInputDigest ||
    !canonicalUtc(String(payload.executedAtUtc)) ||
    payload.scannerId !== scannerId ||
    payload.scannerVersion !== scannerContract.scannerVersion ||
    payload.physicalKey !== physicalKey ||
    payload.artifactId !== artifactIdFromKey(physicalKey) ||
    payload.artifactHash !== artifactHash ||
    payload.canarySetId !== "closed_canary_set_v1" ||
    outcomes.map(({ canaryId }) => canaryId).join("\0") !== expectedCanaries.join("\0") ||
    outcomes.some(
      (outcome) => !exactObjectKeys(outcome, ["canaryId", "detected"]) || outcome.detected !== true,
    ) ||
    !Array.isArray(payload.findings) ||
    payload.findings.length !== 0 ||
    payload.status !== "PASS" ||
    payload.networkEgress !== "NONE"
  )
    return undefined;
  return payload;
};
const scannerProofKey = (physicalKey: string, scannerId: string): string =>
  `${physicalKey}#${scannerId}`;
const scanEvidenceCache = new Map<string, JsonRecord>();
const scannerProof = (
  scannerId: string,
  physicalKey: string,
  artifactHash: string,
  status: "PASS" | "NOT_APPLICABLE",
  context: ScannerRunContext,
  resultBytes?: Buffer,
): JsonRecord => {
  const inputDigest = createHash("sha256")
    .update(
      `fluyo:r4b:scanner-input:v1\n${scannerId}\n${scannerContract.scannerVersion}\n${physicalKey}\n${artifactHash}`,
    )
    .digest("hex");
  const parsed =
    status === "PASS"
      ? validScannerResultPayload(resultBytes, scannerId, physicalKey, artifactHash, context)
      : undefined;
  const canarySetDigest = createHash("sha256")
    .update(
      status === "PASS"
        ? JSON.stringify(parsed?.canaryOutcomes ?? null)
        : `fluyo:r4b:scanner-canaries:v1\n${scannerId}\nNOT_APPLICABLE`,
    )
    .digest("hex");
  const canaryStatus = status === "PASS" ? "PASS" : "NOT_APPLICABLE";
  const outputDigest =
    status === "PASS" && resultBytes
      ? createHash("sha256").update(resultBytes).digest("hex")
      : createHash("sha256")
          .update(
            `fluyo:r4b:scanner-output:v1\n${inputDigest}\n${status}\n${canarySetDigest}\n${canaryStatus}`,
          )
          .digest("hex");
  return { inputDigest, outputDigest, canarySetDigest, canaryStatus, status };
};
const scanEvidenceFor = (
  physicalKey: string,
  hash: string,
  trustedResultBytesByProofKey?: Record<string, Buffer>,
  context?: ScannerRunContext,
): JsonRecord => {
  const activeContext =
    context ??
    scannerContext(
      {
        sourceCommit: "a".repeat(40),
        buildCommit: "b".repeat(40),
        capturedAtUtc: "2026-10-31T00:00:00Z",
      },
      physicalKey,
      hash,
    );
  const cacheKey = `${physicalKey}\u0000${hash}`;
  const cached = trustedResultBytesByProofKey ? undefined : scanEvidenceCache.get(cacheKey);
  if (cached) return cached;
  const artifactId = physicalKey.slice(physicalKey.lastIndexOf("/") + 1);
  const png = artifactId.endsWith(".png");
  const resultBytes = (scannerId: string, applicable: boolean): Buffer | undefined =>
    applicable
      ? (trustedResultBytesByProofKey?.[scannerProofKey(physicalKey, scannerId)] ??
        canonicalJsonBytes(scannerResultPayload(scannerId, physicalKey, hash, activeContext)))
      : undefined;
  const structured = scannerProof(
    scannerContract.structuredScannerId,
    physicalKey,
    hash,
    png ? "NOT_APPLICABLE" : "PASS",
    activeContext,
    resultBytes(scannerContract.structuredScannerId, !png),
  );
  const metadata = scannerProof(
    scannerContract.metadataScannerId,
    physicalKey,
    hash,
    png ? "PASS" : "NOT_APPLICABLE",
    activeContext,
    resultBytes(scannerContract.metadataScannerId, png),
  );
  const ocr = scannerProof(
    scannerContract.ocrScannerId,
    physicalKey,
    hash,
    png ? "PASS" : "NOT_APPLICABLE",
    activeContext,
    resultBytes(scannerContract.ocrScannerId, png),
  );
  const ocrDeny = scannerProof(
    scannerContract.ocrDenyScannerId,
    physicalKey,
    hash,
    png ? "PASS" : "NOT_APPLICABLE",
    activeContext,
    resultBytes(scannerContract.ocrDenyScannerId, png),
  );
  const recursiveDeny = scannerProof(
    scannerContract.recursiveDenyScannerId,
    physicalKey,
    hash,
    "PASS",
    activeContext,
    resultBytes(scannerContract.recursiveDenyScannerId, true),
  );
  const cell = cellForPhysicalKey(physicalKey);
  if (!cell) throw new Error("invalid synthetic semantic evidence cell");
  const semanticInputDigest = createHash("sha256")
    .update(
      `fluyo:r4b:semantic-input:v1\n${scannerContract.semanticValidatorId}\n${scannerContract.scannerVersion}\n${physicalKey}\n${artifactId}\n${hash}\n${identityFields
        .map((field) => String(cell[field]))
        .join("\n")}`,
    )
    .digest("hex");
  const semanticOutputDigest = createHash("sha256")
    .update(`fluyo:r4b:semantic-output:v1\n${semanticInputDigest}\nPASS`)
    .digest("hex");
  const scannerEvidenceDigest = createHash("sha256")
    .update("fluyo:r4b:scanner-evidence:v1\n")
    .update(
      [structured, metadata, ocr, ocrDeny, recursiveDeny]
        .map(({ outputDigest }) => String(outputDigest))
        .join("\n"),
    )
    .update("\n")
    .update(semanticOutputDigest)
    .digest("hex");
  const evidence = {
    physicalKey,
    artifactId,
    artifactHash: hash,
    structuredScannerId: scannerContract.structuredScannerId,
    structuredScannerVersion: scannerContract.scannerVersion,
    structuredInputDigest: structured.inputDigest,
    structuredOutputDigest: structured.outputDigest,
    structuredCanarySetDigest: structured.canarySetDigest,
    structuredCanaryStatus: structured.canaryStatus,
    structuredStatus: structured.status,
    metadataScannerId: scannerContract.metadataScannerId,
    metadataScannerVersion: scannerContract.scannerVersion,
    metadataInputDigest: metadata.inputDigest,
    metadataOutputDigest: metadata.outputDigest,
    metadataCanarySetDigest: metadata.canarySetDigest,
    metadataCanaryStatus: metadata.canaryStatus,
    metadataStatus: metadata.status,
    ocrScannerId: scannerContract.ocrScannerId,
    ocrScannerVersion: scannerContract.scannerVersion,
    ocrInputDigest: ocr.inputDigest,
    ocrOutputDigest: ocr.outputDigest,
    ocrCanarySetDigest: ocr.canarySetDigest,
    ocrCanaryStatus: ocr.canaryStatus,
    ocrStatus: ocr.status,
    ocrDenyScannerId: scannerContract.ocrDenyScannerId,
    ocrDenyScannerVersion: scannerContract.scannerVersion,
    ocrDenyInputDigest: ocrDeny.inputDigest,
    ocrDenyOutputDigest: ocrDeny.outputDigest,
    ocrDenyCanarySetDigest: ocrDeny.canarySetDigest,
    ocrDenyCanaryStatus: ocrDeny.canaryStatus,
    ocrDenyStatus: ocrDeny.status,
    recursiveDenyScannerId: scannerContract.recursiveDenyScannerId,
    recursiveDenyScannerVersion: scannerContract.scannerVersion,
    recursiveDenyInputDigest: recursiveDeny.inputDigest,
    recursiveDenyOutputDigest: recursiveDeny.outputDigest,
    recursiveDenyCanarySetDigest: recursiveDeny.canarySetDigest,
    recursiveDenyCanaryStatus: recursiveDeny.canaryStatus,
    recursiveDenyStatus: recursiveDeny.status,
    semanticValidatorId: scannerContract.semanticValidatorId,
    semanticValidatorVersion: scannerContract.scannerVersion,
    semanticInputDigest,
    semanticOutputDigest,
    semanticStatus: "PASS",
    scannerEvidenceDigest,
    networkEgress: "NONE",
    cleanupDisposition: "retained_until_deleteByUtc",
  };
  if (!trustedResultBytesByProofKey) scanEvidenceCache.set(cacheKey, evidence);
  return evidence;
};
const validScanEvidence = (
  value: unknown,
  physicalKey: string,
  artifactHash: unknown,
  trustedResultBytesByProofKey?: Record<string, Buffer>,
  context?: ScannerRunContext,
): boolean => {
  const activeContext =
    context ??
    scannerContext(
      {
        sourceCommit: "a".repeat(40),
        buildCommit: "b".repeat(40),
        capturedAtUtc: "2026-10-31T00:00:00Z",
      },
      physicalKey,
      String(artifactHash),
    );
  if (!exactObjectKeys(value, scanEvidenceFields)) return false;
  const hash = String(artifactHash);
  if (
    trustedResultBytesByProofKey &&
    applicableScannerIds(artifactIdFromKey(physicalKey)).some(
      (scannerId) =>
        !validScannerResultPayload(
          trustedResultBytesByProofKey[scannerProofKey(physicalKey, scannerId)],
          scannerId,
          physicalKey,
          hash,
          activeContext,
        ),
    )
  )
    return false;
  const expected = scanEvidenceFor(physicalKey, hash, trustedResultBytesByProofKey, activeContext);
  return JSON.stringify(value) === JSON.stringify(expected) && !forbiddenManifestData(value);
};
const scanEvidenceMapValidationCache = new WeakMap<JsonRecord, WeakMap<JsonRecord, boolean>>();
const validScanEvidenceMap = (
  scanEvidence: JsonRecord,
  hashes: JsonRecord,
  artifactKeys: string[],
): boolean => {
  const cached = scanEvidenceMapValidationCache.get(scanEvidence)?.get(hashes);
  if (cached !== undefined) return cached;
  const valid = !artifactKeys.some((physicalKey) => {
    const value = scanEvidence[physicalKey];
    if (!exactObjectKeys(value, scanEvidenceFields) || forbiddenManifestData(value)) return true;
    const entry = record(value);
    const png = artifactIdFromKey(physicalKey).endsWith(".png");
    const digestFields = scanEvidenceFields.filter((field) => field.endsWith("Digest"));
    return (
      entry.physicalKey !== physicalKey ||
      entry.artifactId !== artifactIdFromKey(physicalKey) ||
      entry.artifactHash !== hashes[physicalKey] ||
      entry.structuredScannerId !== scannerContract.structuredScannerId ||
      entry.metadataScannerId !== scannerContract.metadataScannerId ||
      entry.ocrScannerId !== scannerContract.ocrScannerId ||
      entry.ocrDenyScannerId !== scannerContract.ocrDenyScannerId ||
      entry.recursiveDenyScannerId !== scannerContract.recursiveDenyScannerId ||
      entry.semanticValidatorId !== scannerContract.semanticValidatorId ||
      digestFields.some((field) => !/^[0-9a-f]{64}$/.test(String(entry[field]))) ||
      entry.structuredStatus !== (png ? "NOT_APPLICABLE" : "PASS") ||
      entry.metadataStatus !== (png ? "PASS" : "NOT_APPLICABLE") ||
      entry.ocrStatus !== (png ? "PASS" : "NOT_APPLICABLE") ||
      entry.ocrDenyStatus !== (png ? "PASS" : "NOT_APPLICABLE") ||
      entry.recursiveDenyStatus !== "PASS" ||
      entry.semanticStatus !== "PASS" ||
      entry.networkEgress !== "NONE" ||
      entry.cleanupDisposition !== "retained_until_deleteByUtc"
    );
  });
  let byHash = scanEvidenceMapValidationCache.get(scanEvidence);
  if (!byHash) {
    byHash = new WeakMap<JsonRecord, boolean>();
    scanEvidenceMapValidationCache.set(scanEvidence, byHash);
  }
  byHash.set(hashes, valid);
  return valid;
};

const cellByDigest = new Map(
  closedCellMappings().map((mapping, index) => [
    String(mapping.cellDigest),
    closedCellRecords()[index]!,
  ]),
);
const artifactIdFromKey = (physicalKey: string): string =>
  physicalKey.slice(physicalKey.lastIndexOf("/") + 1);
const cellForPhysicalKey = (physicalKey: string): JsonRecord | undefined =>
  cellByDigest.get(physicalKey.split("/")[1] ?? "");
const trustedCapturePayloadFields = [
  "schemaVersion",
  "sourceCommit",
  "buildCommit",
  "validationHead",
  "physicalKey",
  "artifactId",
  "artifactHash",
  "cellDigest",
  ...identityFields,
  "pixelWidth",
  "pixelHeight",
  "browserZoomPercent",
  "deviceScaleFactor",
  "colorProfile",
  "captureToolId",
  "captureToolVersion",
  "captureLegId",
  "captureSequenceOrdinal",
  "capturedAtUtc",
  "provenanceDigest",
  "changedPixelCount",
];
const syntheticBaselineProvenanceFields = [
  "schemaVersion",
  "sourceCommit",
  "buildCommit",
  "validationHead",
  "physicalKey",
  "artifactHash",
  "cellDigest",
  ...identityFields,
  "pixelWidth",
  "pixelHeight",
  "browserZoomPercent",
  "deviceScaleFactor",
  "colorProfile",
  "captureToolId",
  "captureToolVersion",
  "capturedAtUtc",
  "approvalReference",
  "approvalArtifactDigest",
  "approvedBy",
  "approvedAtUtc",
  "provenanceDigest",
];
const baselineProvenanceFields = [
  "schemaVersion",
  "baselineSetId",
  "captureSourceCommit",
  "captureWorkflowPath",
  "captureWorkflowBlobObjectId",
  "captureWorkflowBlobDigest",
  "captureRunId",
  "captureRunAttempt",
  "physicalKey",
  "artifactHash",
  "artifactByteSize",
  "cellDigest",
  "captureProfileDigest",
  ...identityFields,
  "pixelWidth",
  "pixelHeight",
  "browserZoomPercent",
  "deviceScaleFactor",
  "colorProfile",
  "captureToolId",
  "captureToolVersion",
  "capturedAtUtc",
  "approvalReference",
  "approvalBlobObjectId",
  "approvalBlobDigest",
  "approvedBy",
  "approvedAtUtc",
  "provenanceDigest",
];
const withoutField = (value: JsonRecord, field: string): JsonRecord =>
  Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
const captureProvenanceDigest = (payload: JsonRecord): string =>
  createHash("sha256")
    .update(
      `fluyo:r4b:capture-provenance:v2\n${JSON.stringify(withoutField(payload, "provenanceDigest"))}`,
    )
    .digest("hex");
const baselineApprovalArtifactDigest = (payload: JsonRecord): string =>
  createHash("sha256")
    .update(
      `fluyo:r4b:baseline-approval:v1\n${payload.approvalReference}\n${payload.approvedBy}\n${payload.approvedAtUtc}\n${payload.artifactHash}`,
    )
    .digest("hex");
const baselineProvenanceDigest = (payload: JsonRecord): string =>
  createHash("sha256")
    .update(
      `fluyo:r4b:baseline-provenance:v1\n${JSON.stringify(withoutField(payload, "provenanceDigest"))}`,
    )
    .digest("hex");
const addUtcSeconds = (value: unknown, seconds: number): string =>
  new Date(Date.parse(String(value)) + seconds * 1000).toISOString().replace(".000Z", "Z");
const cellOrdinal = (cell: JsonRecord): number =>
  Number(closedCellMappings().find((mapping) => mapping.cellDigest === cellDigest(cell))?.ordinal);
const syntheticBaselineProvenance = (
  manifest: JsonRecord,
  physicalKey: string,
  artifactHash: string,
): JsonRecord => {
  const cell = cellForPhysicalKey(physicalKey)!;
  const profile = expectedCaptureProfile(cell);
  const priorHead = "c".repeat(40);
  const payload: JsonRecord = {
    schemaVersion: 1,
    sourceCommit: priorHead,
    buildCommit: priorHead,
    validationHead: priorHead,
    physicalKey,
    artifactHash,
    cellDigest: cellDigest(cell),
    ...Object.fromEntries(identityFields.map((field) => [field, cell[field]])),
    pixelWidth: Number(profile.observedWidthCssPx) * Number(profile.deviceScaleFactor),
    pixelHeight: Number(profile.observedHeightCssPx) * Number(profile.deviceScaleFactor),
    browserZoomPercent: profile.browserZoomPercent,
    deviceScaleFactor: profile.deviceScaleFactor,
    colorProfile: profile.colorProfile,
    captureToolId: "r4b_chromium_capture_v1",
    captureToolVersion: "1.0.0",
    capturedAtUtc: addUtcSeconds(manifest.capturedAtUtc, -172800 - cellOrdinal(cell)),
    approvalReference: `git:${priorHead}:docs/r4b-baselines/${cellDigest(cell)}.json`,
    approvalArtifactDigest: "",
    approvedBy: "Daniela Vargas",
    approvedAtUtc: addUtcSeconds(manifest.capturedAtUtc, -86400 - cellOrdinal(cell)),
    provenanceDigest: "",
  };
  payload.approvalArtifactDigest = baselineApprovalArtifactDigest(payload);
  payload.provenanceDigest = baselineProvenanceDigest(payload);
  return payload;
};
const validSyntheticBaselineProvenance = (
  bytes: Buffer | undefined,
  manifest: JsonRecord,
  physicalKey: string,
  artifactHash: string,
): JsonRecord | undefined => {
  if (!bytes || !physicalKey.endsWith("/baseline.png")) return undefined;
  const parsed = parseCanonicalJsonBytes(bytes);
  if (!exactObjectKeys(parsed, syntheticBaselineProvenanceFields)) return undefined;
  const payload = record(parsed);
  const cell = cellForPhysicalKey(physicalKey);
  if (!cell) return undefined;
  const profile = expectedCaptureProfile(cell);
  if (
    payload.schemaVersion !== 1 ||
    ![payload.sourceCommit, payload.buildCommit, payload.validationHead].every((value) =>
      /^[0-9a-f]{40}$/.test(String(value)),
    ) ||
    payload.sourceCommit !== payload.buildCommit ||
    payload.buildCommit !== payload.validationHead ||
    payload.buildCommit === manifest.buildCommit ||
    payload.physicalKey !== physicalKey ||
    payload.artifactHash !== artifactHash ||
    payload.cellDigest !== cellDigest(cell) ||
    identityFields.some((field) => payload[field] !== cell[field]) ||
    payload.pixelWidth !== Number(profile.observedWidthCssPx) * Number(profile.deviceScaleFactor) ||
    payload.pixelHeight !==
      Number(profile.observedHeightCssPx) * Number(profile.deviceScaleFactor) ||
    payload.browserZoomPercent !== profile.browserZoomPercent ||
    payload.deviceScaleFactor !== profile.deviceScaleFactor ||
    payload.colorProfile !== profile.colorProfile ||
    payload.captureToolId !== "r4b_chromium_capture_v1" ||
    payload.captureToolVersion !== "1.0.0" ||
    !canonicalUtc(String(payload.capturedAtUtc)) ||
    !/^git:[0-9a-f]{40}:docs\/r4b-baselines\/[0-9a-f]{64}\.json$/.test(
      String(payload.approvalReference),
    ) ||
    payload.approvalReference !==
      `git:${payload.validationHead}:docs/r4b-baselines/${cellDigest(cell)}.json` ||
    !["Daniela Vargas", "Elana Castillo"].includes(String(payload.approvedBy)) ||
    !canonicalUtc(String(payload.approvedAtUtc)) ||
    Date.parse(String(payload.capturedAtUtc)) > Date.parse(String(payload.approvedAtUtc)) ||
    Date.parse(String(payload.approvedAtUtc)) > Date.parse(String(manifest.capturedAtUtc)) ||
    payload.approvalArtifactDigest !== baselineApprovalArtifactDigest(payload) ||
    payload.provenanceDigest !== baselineProvenanceDigest(payload)
  )
    return undefined;
  return payload;
};
const resolvedBaselineProvenance = (
  baseline: ResolvedBaseline,
  physicalKey: string,
): JsonRecord | undefined => {
  const entry = baseline.inventory.get(physicalKey);
  const cell = cellForPhysicalKey(physicalKey);
  if (!entry || !cell || !physicalKey.endsWith("/baseline.png")) return undefined;
  const profile = expectedCaptureProfile(cell);
  const payload: JsonRecord = {
    schemaVersion: 1,
    baselineSetId: baseline.approval.baselineSetId,
    captureSourceCommit: baseline.approval.captureSourceCommit,
    captureWorkflowPath: r4bWorkflowPath,
    captureWorkflowBlobObjectId: baseline.workflow.objectId,
    captureWorkflowBlobDigest: baseline.workflow.sha256,
    captureRunId: baseline.run.runId,
    captureRunAttempt: baseline.run.runAttempt,
    physicalKey,
    artifactHash: entry.artifactHash,
    artifactByteSize: entry.artifactByteSize,
    cellDigest: entry.cellDigest,
    captureProfileDigest: entry.captureProfileDigest,
    ...Object.fromEntries(identityFields.map((field) => [field, cell[field]])),
    pixelWidth: Number(profile.observedWidthCssPx) * Number(profile.deviceScaleFactor),
    pixelHeight: Number(profile.observedHeightCssPx) * Number(profile.deviceScaleFactor),
    browserZoomPercent: profile.browserZoomPercent,
    deviceScaleFactor: profile.deviceScaleFactor,
    colorProfile: entry.colorProfile,
    captureToolId: entry.captureToolId,
    captureToolVersion: entry.captureToolVersion,
    capturedAtUtc: entry.capturedAtUtc,
    approvalReference: `git:${baseline.approvalCommit}:${baseline.approvalPath}`,
    approvalBlobObjectId: baseline.blob.objectId,
    approvalBlobDigest: baseline.blob.sha256,
    approvedBy: baseline.approval.approvedBy,
    approvedAtUtc: baseline.approval.approvedAtUtc,
    provenanceDigest: "",
  };
  payload.provenanceDigest = baselineProvenanceDigest(payload);
  return payload;
};
const validResolvedBaselineProvenance = (
  bytes: Buffer | undefined,
  baseline: ResolvedBaseline,
  physicalKey: string,
  artifactHash: string,
): JsonRecord | undefined => {
  if (!bytes) return undefined;
  const parsed = parseCanonicalJsonBytes(bytes);
  if (!exactObjectKeys(parsed, baselineProvenanceFields)) return undefined;
  const expected = resolvedBaselineProvenance(baseline, physicalKey);
  return expected &&
    expected.artifactHash === artifactHash &&
    JSON.stringify(parsed) === JSON.stringify(expected)
    ? record(parsed)
    : undefined;
};
const trustedCapturePayload = (
  manifest: JsonRecord,
  physicalKey: string,
  artifactHash: string,
  changedPixelCount: number | null,
  baseline?: JsonRecord,
): JsonRecord => {
  const cell = cellForPhysicalKey(physicalKey)!;
  const profile = expectedCaptureProfile(cell);
  const artifactId = artifactIdFromKey(physicalKey);
  const baselineRole = artifactId === "baseline.png";
  const sequenceOrdinal = artifactId === "diff.png" ? 2 : 1;
  const payload: JsonRecord = {
    schemaVersion: 1,
    sourceCommit: baselineRole
      ? (baseline?.captureSourceCommit ?? baseline?.sourceCommit)
      : manifest.sourceCommit,
    buildCommit: baselineRole
      ? (baseline?.captureSourceCommit ?? baseline?.buildCommit)
      : manifest.buildCommit,
    validationHead: baselineRole
      ? (baseline?.captureSourceCommit ?? baseline?.validationHead)
      : manifest.buildCommit,
    physicalKey,
    artifactId,
    artifactHash,
    cellDigest: cellDigest(cell),
    ...Object.fromEntries(identityFields.map((field) => [field, cell[field]])),
    pixelWidth: Number(profile.observedWidthCssPx) * Number(profile.deviceScaleFactor),
    pixelHeight: Number(profile.observedHeightCssPx) * Number(profile.deviceScaleFactor),
    browserZoomPercent: profile.browserZoomPercent,
    deviceScaleFactor: profile.deviceScaleFactor,
    colorProfile: profile.colorProfile,
    captureToolId: "r4b_chromium_capture_v1",
    captureToolVersion: "1.0.0",
    captureLegId: `${baselineRole ? "approved_baseline" : "candidate"}_${cellDigest(cell)}`,
    captureSequenceOrdinal: sequenceOrdinal,
    capturedAtUtc: baselineRole
      ? baseline?.capturedAtUtc
      : addUtcSeconds(manifest.capturedAtUtc, cellOrdinal(cell) * 2 + sequenceOrdinal),
    provenanceDigest: "",
    changedPixelCount,
  };
  payload.provenanceDigest = captureProvenanceDigest(payload);
  return payload;
};
const validTrustedCapturePayload = (
  bytes: Buffer | undefined,
  manifest: JsonRecord,
  physicalKey: string,
  artifactHash: string,
  changedPixelCount: number | null,
  baselineBytes?: Buffer,
  resolvedBaseline?: ResolvedBaseline,
): boolean => {
  if (!bytes) return false;
  const parsed = parseCanonicalJsonBytes(bytes);
  if (!exactObjectKeys(parsed, trustedCapturePayloadFields)) return false;
  const payload = record(parsed);
  const baseline = physicalKey.endsWith("/baseline.png")
    ? resolvedBaseline
      ? validResolvedBaselineProvenance(baselineBytes, resolvedBaseline, physicalKey, artifactHash)
      : validSyntheticBaselineProvenance(baselineBytes, manifest, physicalKey, artifactHash)
    : undefined;
  if (physicalKey.endsWith("/baseline.png") && !baseline) return false;
  return (
    JSON.stringify(payload) ===
      JSON.stringify(
        trustedCapturePayload(manifest, physicalKey, artifactHash, changedPixelCount, baseline),
      ) &&
    payload.provenanceDigest === captureProvenanceDigest(payload) &&
    canonicalUtc(String(payload.capturedAtUtc))
  );
};
const pngInfoCache = new Map<string, PngInfo | null>();
const canonicalJsonCache = new Map<string, unknown>();
const semanticValidationCache = new Map<string, boolean>();
const cachedPng = (
  bytes: Buffer,
  expectedWidth: number,
  expectedHeight: number,
): PngInfo | undefined => {
  const hash = `${createHash("sha256").update(bytes).digest("hex")}:${expectedWidth}x${expectedHeight}`;
  if (!pngInfoCache.has(hash))
    pngInfoCache.set(hash, parsePng(bytes, expectedWidth, expectedHeight) ?? null);
  return pngInfoCache.get(hash) ?? undefined;
};
const cachedCanonicalJson = (bytes: Buffer): unknown | undefined => {
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (!canonicalJsonCache.has(hash))
    canonicalJsonCache.set(hash, parseCanonicalJsonBytes(bytes) ?? null);
  return canonicalJsonCache.get(hash) ?? undefined;
};

const semanticArtifactValid = (
  physicalKey: string,
  bytes: Buffer,
  manifest: JsonRecord,
  artifactBytesByPath: Record<string, Buffer>,
  capturePayloadBytesByPhysicalKey: Record<string, Buffer> = {},
  baselineProvenanceBytesByPhysicalKey: Record<string, Buffer> = {},
  resolvedBaseline?: ResolvedBaseline,
): boolean => {
  const artifactId = artifactIdFromKey(physicalKey);
  const owningCell = cellForPhysicalKey(physicalKey);
  if (!owningCell) return false;
  const bytesHash = createHash("sha256").update(bytes).digest("hex");
  const root = physicalKey.slice(0, physicalKey.lastIndexOf("/") + 1);
  const relatedHash = artifactId.endsWith(".png")
    ? ["actual.png", "baseline.png", "diff.png"]
        .map((id) =>
          createHash("sha256")
            .update(artifactBytesByPath[`${root}${id}`] ?? Buffer.alloc(0))
            .digest("hex"),
        )
        .join("")
    : artifactId === "reduced-motion.json"
      ? createHash("sha256")
          .update(artifactBytesByPath[`${root}focus.json`] ?? Buffer.alloc(0))
          .digest("hex")
      : "";
  const cacheKey = [
    artifactId,
    bytesHash,
    relatedHash,
    ...identityFields.map((field) => owningCell[field]),
    manifest.nvdaVersion,
    artifactId.endsWith(".png")
      ? createHash("sha256")
          .update(capturePayloadBytesByPhysicalKey[physicalKey] ?? Buffer.alloc(0))
          .update(baselineProvenanceBytesByPhysicalKey[`${root}baseline.png`] ?? Buffer.alloc(0))
          .digest("hex")
      : "",
  ].join("\u0000");
  const cached = semanticValidationCache.get(cacheKey);
  if (cached !== undefined) return cached;
  let valid = false;
  if (artifactId.endsWith(".png")) {
    const profile = record(record(manifest.captureProfiles)[cellDigest(owningCell)]);
    if (JSON.stringify(profile) !== JSON.stringify(expectedCaptureProfile(owningCell)))
      return false;
    const expectedWidth = Number(profile.observedWidthCssPx) * Number(profile.deviceScaleFactor);
    const expectedHeight = Number(profile.observedHeightCssPx) * Number(profile.deviceScaleFactor);
    const info = cachedPng(bytes, expectedWidth, expectedHeight);
    if (!info) return false;
    const actual = cachedPng(
      artifactBytesByPath[`${root}actual.png`] ?? Buffer.alloc(0),
      expectedWidth,
      expectedHeight,
    );
    const baseline = cachedPng(
      artifactBytesByPath[`${root}baseline.png`] ?? Buffer.alloc(0),
      expectedWidth,
      expectedHeight,
    );
    const diff = cachedPng(
      artifactBytesByPath[`${root}diff.png`] ?? Buffer.alloc(0),
      expectedWidth,
      expectedHeight,
    );
    if (!actual || !baseline || !diff) return false;
    const roleInfo =
      artifactId === "actual.png"
        ? actual
        : artifactId === "baseline.png"
          ? baseline
          : artifactId === "diff.png"
            ? diff
            : undefined;
    if (!roleInfo || !info.pixels.equals(roleInfo.pixels)) return false;
    const derivedDiff = Buffer.alloc(actual.pixels.length);
    let changedPixelCount = 0;
    for (let offset = 0; offset < actual.pixels.length; offset += 4) {
      const changed = !actual.pixels
        .subarray(offset, offset + 4)
        .equals(baseline.pixels.subarray(offset, offset + 4));
      if (changed) {
        changedPixelCount += 1;
        derivedDiff.set([255, 0, 255, 255], offset);
      }
    }
    const pngKeys = ["actual.png", "baseline.png", "diff.png"].map((id) => `${root}${id}`);
    const pngHashes = Object.fromEntries(
      pngKeys.map((key) => [
        key,
        createHash("sha256")
          .update(artifactBytesByPath[key] ?? Buffer.alloc(0))
          .digest("hex"),
      ]),
    );
    const baselineProvenance = resolvedBaseline
      ? validResolvedBaselineProvenance(
          baselineProvenanceBytesByPhysicalKey[`${root}baseline.png`],
          resolvedBaseline,
          `${root}baseline.png`,
          String(pngHashes[`${root}baseline.png`]),
        )
      : validSyntheticBaselineProvenance(
          baselineProvenanceBytesByPhysicalKey[`${root}baseline.png`],
          manifest,
          `${root}baseline.png`,
          String(pngHashes[`${root}baseline.png`]),
        );
    const trustedCaptureValid = pngKeys.every((key) =>
      validTrustedCapturePayload(
        capturePayloadBytesByPhysicalKey[key],
        manifest,
        key,
        String(pngHashes[key]),
        key.endsWith("/diff.png") ? changedPixelCount : null,
        baselineProvenanceBytesByPhysicalKey[`${root}baseline.png`],
        resolvedBaseline,
      ),
    );
    const actualCapture = record(
      parseCanonicalJsonBytes(capturePayloadBytesByPhysicalKey[`${root}actual.png`]!) ?? {},
    );
    const baselineCapture = record(
      parseCanonicalJsonBytes(capturePayloadBytesByPhysicalKey[`${root}baseline.png`]!) ?? {},
    );
    const diffCapture = record(
      parseCanonicalJsonBytes(capturePayloadBytesByPhysicalKey[`${root}diff.png`]!) ?? {},
    );
    const chronologyValid =
      !!baselineProvenance &&
      actualCapture.captureLegId === diffCapture.captureLegId &&
      actualCapture.captureSequenceOrdinal === 1 &&
      diffCapture.captureSequenceOrdinal === 2 &&
      baselineCapture.captureSequenceOrdinal === 1 &&
      baselineCapture.captureLegId !== actualCapture.captureLegId &&
      Date.parse(String(baselineCapture.capturedAtUtc)) ===
        Date.parse(String(baselineProvenance.capturedAtUtc)) &&
      Date.parse(String(baselineCapture.capturedAtUtc)) <=
        Date.parse(String(baselineProvenance.approvedAtUtc)) &&
      Date.parse(String(baselineProvenance.approvedAtUtc)) <=
        Date.parse(String(manifest.capturedAtUtc)) &&
      Date.parse(String(actualCapture.capturedAtUtc)) >=
        Date.parse(String(manifest.capturedAtUtc)) &&
      Date.parse(String(actualCapture.capturedAtUtc)) <
        Date.parse(String(diffCapture.capturedAtUtc)) &&
      Date.parse(String(diffCapture.capturedAtUtc)) < Date.parse(String(manifest.deleteByUtc));
    valid =
      trustedCaptureValid &&
      chronologyValid &&
      diff.pixels.equals(derivedDiff) &&
      Number.isSafeInteger(changedPixelCount) &&
      changedPixelCount >= 0 &&
      info.width === actual.width &&
      info.height === actual.height;
  } else if (artifactId === "announcements.txt") {
    const parsedText = parseAnnouncementRecords(bytes);
    if (!parsedText) return false;
    const variantId =
      stateFixtureVariant(owningCell.stateId, owningCell.fixtureId)?.variantId ?? null;
    valid = validAnnouncementsArtifact(
      {
        schemaVersion: 1,
        cellDigest: parsedText.envelope.cellDigest,
        stateId: parsedText.envelope.stateId,
        viewportId: parsedText.envelope.viewportId,
        variantId,
        themeId: parsedText.envelope.themeId,
        localeId: parsedText.envelope.localeId,
        textScaleId: parsedText.envelope.textScaleId,
        fixtureId: parsedText.envelope.fixtureId,
        dialogContextId: dialogContextForCell(owningCell),
        entryContextId: "client_transition",
        nvdaVersion: manifest.nvdaVersion,
        reviewerRole: "Elana",
        records: parsedText.records,
        verdict: "PASS",
      },
      owningCell,
      String(manifest.nvdaVersion),
    );
  } else {
    const parsed = cachedCanonicalJson(bytes);
    if (!parsed) return false;
    if (artifactId === "overflow.json") valid = validOverflowArtifact(parsed, owningCell);
    else if (artifactId === "contrast.json") valid = validContrastArtifact(parsed, owningCell);
    else if (artifactId === "focus.json") valid = validFocusArtifact(parsed, owningCell);
    else if (artifactId === "reduced-motion.json") {
      const focusKey = `${physicalKey.slice(0, physicalKey.lastIndexOf("/") + 1)}focus.json`;
      const focus = cachedCanonicalJson(artifactBytesByPath[focusKey] ?? Buffer.alloc(0));
      valid = !!focus && validReducedMotionArtifact(parsed, owningCell, focus);
    }
  }
  semanticValidationCache.set(cacheKey, valid);
  return valid;
};

const syntheticOverflow = (cell: JsonRecord): JsonRecord => ({
  schemaVersion: 1,
  ...artifactEnvelope(cell),
  document: {
    scrollWidthCssPx: expectedCaptureProfile(cell).observedWidthCssPx,
    scrollHeightCssPx: expectedCaptureProfile(cell).observedHeightCssPx,
    clientWidthCssPx: expectedCaptureProfile(cell).observedWidthCssPx,
    clientHeightCssPx: expectedCaptureProfile(cell).observedHeightCssPx,
  },
  regions: syntheticRegions(cell),
  clipping: strings(artifactEnums.regionIds).map((regionId) => ({ regionId, clipped: false })),
  overlap: expectedOverlapPairs(syntheticRegions(cell)),
  primaryActionReachable: true,
  horizontalPageOverflow: false,
  verdict: "PASS",
});
const syntheticContrast = (cell: JsonRecord): JsonRecord => ({
  schemaVersion: 1,
  ...artifactEnvelope(cell),
  pairs: expectedContrastPairs(cell),
  verdict: "PASS",
});
const syntheticFocus = (cell: JsonRecord): JsonRecord => {
  const stops = expectedFocusStops(cell);
  const dialogOpen = dialogContextForCell(cell) !== null;
  const stayTarget = record(stops[0]).target;
  const ring = focusRingContractForTheme(cell.themeId)!;
  const invokingExitTarget = {
    targetId: "invoking_exit_control",
    roleId: "button",
    accessibleName: "Leave activity",
    rect: { x: 0, y: 0, width: 160, height: 44 },
    focusRingId: ring.ringId,
  };
  return {
    schemaVersion: 1,
    cellDigest: cellDigest(cell),
    stateId: cell.stateId,
    viewportId: cell.viewportId,
    variantId: stateFixtureVariant(cell.stateId, cell.fixtureId)?.variantId ?? null,
    themeId: cell.themeId,
    localeId: cell.localeId,
    textScaleId: cell.textScaleId,
    fixtureId: cell.fixtureId,
    stops,
    initialFocus: dialogOpen
      ? { kind: "element", target: stayTarget }
      : { kind: "document", target: null },
    keyboardProtocol,
    keyboardExecutions: expectedKeyboardExecutions(cell),
    finalFocus: dialogOpen
      ? { kind: "element", target: invokingExitTarget }
      : { kind: "document", target: null },
    verdict: "PASS",
  };
};
const syntheticAnnouncements = (cell: JsonRecord, nvdaVersion: string): JsonRecord => ({
  schemaVersion: 1,
  cellDigest: cellDigest(cell),
  stateId: cell.stateId,
  viewportId: cell.viewportId,
  variantId: stateFixtureVariant(cell.stateId, cell.fixtureId)?.variantId ?? null,
  themeId: cell.themeId,
  localeId: cell.localeId,
  textScaleId: cell.textScaleId,
  fixtureId: cell.fixtureId,
  dialogContextId: dialogContextForCell(cell),
  entryContextId: "client_transition",
  nvdaVersion,
  reviewerRole: "Elana",
  records: expectedNvdaRecords(cell),
  verdict: "PASS",
});
const syntheticReducedMotion = (cell: JsonRecord): JsonRecord => {
  const outcome = motionOutcomeForCell(cell);
  const action = stateActionContract(outcome.stateId, outcome.variantId);
  const focusPosition = { kind: "document", target: null };
  const applicableMotionIds = applicableMotionIdsForCell(cell);
  const run = (reduced: boolean): JsonRecord[] =>
    expectedNormalMotion.map((motion) => {
      const applicable = applicableMotionIds.has(String(motion.motionId));
      const interruption = motionInterruptionFor(cell, motion.motionId);
      return {
        motionId: motion.motionId,
        triggerId: motion.triggerId,
        ownerId: motion.ownerId,
        propertyIds: motion.propertyIds,
        configuredDurationMs: motion.durationMs,
        observedDurationMs:
          reduced || !applicable
            ? 0
            : interruption
              ? Math.max(1, Math.floor(Number(motion.durationMs) / 2))
              : motion.durationMs,
        easingId: motion.easingId,
        startedStateId: cell.stateId,
        interruptedBy: interruption?.interruptedBy ?? null,
        settledStateId: interruption?.expectedSettledStateId ?? cell.stateId,
        staleCallbackCount: 0,
        focusPosition,
        announcementCount: interruption
          ? interruption.expectedAnnouncementCount
          : applicable && motion.motionId === "entry"
            ? 1
            : 0,
        applicability: applicable ? "APPLICABLE" : "NON_APPLICABLE",
        exclusionReason: applicable ? null : "trigger_not_observed",
      };
    });
  return {
    schemaVersion: 1,
    ...artifactEnvelope(cell),
    normalRun: run(false),
    reducedRun: run(true),
    staticEquivalent: {
      finalStateId: outcome.stateId,
      primaryActionId: action?.primaryActionId,
      focusPosition,
      copyDigest: copyDigestForMotionOutcome(cell),
      progressValue: Number(
        record(record(catalog.evidence).syntheticObservationValues).confirmedCount,
      ),
      announcementCount: outcome.announcementCount,
    },
    focusBinding: {
      normalPosition: focusPosition,
      reducedPosition: focusPosition,
      preserved: true,
    },
    announcementBinding: {
      normalCount: outcome.announcementCount,
      reducedCount: outcome.announcementCount,
      semanticText: semanticTextForMotionOutcome(cell),
      callbacksSilent: true,
      preserved: true,
    },
    verdict: "PASS",
  };
};

const syntheticArtifactBytesForKeys = (
  physicalKeys: string[],
  nvdaVersion: string,
): Record<string, Buffer> => {
  const cache = new Map<string, Buffer>();
  return Object.fromEntries(
    physicalKeys.map((physicalKey) => {
      const cell = cellForPhysicalKey(physicalKey)!;
      const artifactId = artifactIdFromKey(physicalKey);
      const cacheKey = `${artifactId}\u0000${identityFields.map((field) => String(cell[field])).join("\u0000")}`;
      let bytes = cache.get(cacheKey);
      if (!bytes) {
        if (
          artifactId === "actual.png" ||
          artifactId === "baseline.png" ||
          artifactId === "diff.png"
        )
          bytes = syntheticPng(cell, artifactId);
        else if (artifactId === "overflow.json")
          bytes = canonicalJsonBytes(syntheticOverflow(cell));
        else if (artifactId === "contrast.json")
          bytes = canonicalJsonBytes(syntheticContrast(cell));
        else if (artifactId === "focus.json") bytes = canonicalJsonBytes(syntheticFocus(cell));
        else if (artifactId === "announcements.txt")
          bytes = announcementsBytes(syntheticAnnouncements(cell, nvdaVersion));
        else bytes = canonicalJsonBytes(syntheticReducedMotion(cell));
        cache.set(cacheKey, bytes);
      }
      return [physicalKey, bytes];
    }),
  );
};

const changedPixelCountForRoot = (
  root: string,
  bytesByPhysicalKey: Record<string, Buffer>,
): number => {
  const cell = cellForPhysicalKey(`${root}actual.png`)!;
  const profile = expectedCaptureProfile(cell);
  const width = Number(profile.observedWidthCssPx) * Number(profile.deviceScaleFactor);
  const height = Number(profile.observedHeightCssPx) * Number(profile.deviceScaleFactor);
  const actual = parsePng(bytesByPhysicalKey[`${root}actual.png`]!, width, height)!;
  const baseline = parsePng(bytesByPhysicalKey[`${root}baseline.png`]!, width, height)!;
  let count = 0;
  for (let offset = 0; offset < actual.pixels.length; offset += 4)
    if (
      !actual.pixels
        .subarray(offset, offset + 4)
        .equals(baseline.pixels.subarray(offset, offset + 4))
    )
      count += 1;
  return count;
};

const syntheticCapturePayloadBytes = (
  physicalKeys: string[],
  bytesByPhysicalKey: Record<string, Buffer>,
  manifest: JsonRecord,
  baselineProvenanceBytesByPhysicalKey: Record<string, Buffer>,
): Record<string, Buffer> =>
  Object.fromEntries(
    physicalKeys
      .filter((physicalKey) => physicalKey.endsWith(".png"))
      .map((physicalKey) => {
        const root = physicalKey.slice(0, physicalKey.lastIndexOf("/") + 1);
        const changedPixelCount = physicalKey.endsWith("/diff.png")
          ? changedPixelCountForRoot(root, bytesByPhysicalKey)
          : null;
        const hash = createHash("sha256").update(bytesByPhysicalKey[physicalKey]!).digest("hex");
        const baseline = physicalKey.endsWith("/baseline.png")
          ? record(
              parseCanonicalJsonBytes(
                baselineProvenanceBytesByPhysicalKey[physicalKey] ?? Buffer.alloc(0),
              ) ?? {},
            )
          : undefined;
        return [
          physicalKey,
          canonicalJsonBytes(
            trustedCapturePayload(manifest, physicalKey, hash, changedPixelCount, baseline),
          ),
        ];
      }),
  );

const syntheticBaselineProvenanceBytes = (
  physicalKeys: string[],
  bytesByPhysicalKey: Record<string, Buffer>,
  manifest: JsonRecord,
): Record<string, Buffer> =>
  Object.fromEntries(
    physicalKeys
      .filter((physicalKey) => physicalKey.endsWith("/baseline.png"))
      .map((physicalKey) => {
        const hash = createHash("sha256").update(bytesByPhysicalKey[physicalKey]!).digest("hex");
        return [
          physicalKey,
          canonicalJsonBytes(syntheticBaselineProvenance(manifest, physicalKey, hash)),
        ];
      }),
  );

const syntheticScannerResultBytes = (
  physicalKeys: string[],
  hashes: JsonRecord,
  manifest: JsonRecord,
  workflowFileDigest: string,
): Record<string, Buffer> =>
  Object.fromEntries(
    physicalKeys.flatMap((physicalKey) =>
      applicableScannerIds(artifactIdFromKey(physicalKey)).map((scannerId) => [
        scannerProofKey(physicalKey, scannerId),
        canonicalJsonBytes(
          scannerResultPayload(
            scannerId,
            physicalKey,
            String(hashes[physicalKey]),
            scannerContext(manifest, physicalKey, String(hashes[physicalKey]), workflowFileDigest),
          ),
        ),
      ]),
    ),
  );

const representativeSemanticCells = (): JsonRecord[] => {
  const cells = closedCellRecords();
  // Axis values can collide (for example DEFAULT); namespace them before the greedy cover.
  const uncoveredAxes = new Set(
    identityFields.flatMap((field) => [
      ...new Set(cells.map((cell) => `${field}:${String(cell[field])}`)),
    ]),
  );
  const selected: JsonRecord[] = [];
  while (uncoveredAxes.size > 0) {
    let best: JsonRecord | undefined;
    let bestCoverage = -1;
    for (const cell of cells) {
      const coverage = identityFields.filter((field) =>
        uncoveredAxes.has(`${field}:${String(cell[field])}`),
      ).length;
      if (coverage > bestCoverage) {
        best = cell;
        bestCoverage = coverage;
      }
    }
    if (!best || bestCoverage <= 0) throw new Error("representative semantic cover incomplete");
    selected.push(best);
    for (const field of identityFields) uncoveredAxes.delete(`${field}:${String(best[field])}`);
  }
  return selected;
};

const representativeSemanticKeys = (): string[] =>
  representativeSemanticCells().flatMap((cell) => {
    const digest = cellDigest(cell);
    return artifactIds.map((artifactId) => `cells/${digest}/${artifactId}`);
  });

const validSemanticArtifactSet = (
  physicalKeys: string[],
  bytesByPhysicalKey: Record<string, Buffer>,
  manifest: JsonRecord,
  capturePayloadBytesByPhysicalKey: Record<string, Buffer>,
  baselineProvenanceBytesByPhysicalKey: Record<string, Buffer>,
  resolvedBaseline?: ResolvedBaseline,
): boolean =>
  JSON.stringify(Object.keys(bytesByPhysicalKey)) === JSON.stringify(physicalKeys) &&
  physicalKeys.every((physicalKey) => {
    const bytes = bytesByPhysicalKey[physicalKey];
    return (
      bytes !== undefined &&
      (physicalKey.endsWith(".png") || !forbiddenManifestData(bytes.toString("utf8"))) &&
      semanticArtifactValid(
        physicalKey,
        bytes,
        manifest,
        bytesByPhysicalKey,
        capturePayloadBytesByPhysicalKey,
        baselineProvenanceBytesByPhysicalKey,
        resolvedBaseline,
      )
    );
  });

const artifactValidationResultFields = [
  "schemaVersion",
  "ordinal",
  "physicalKey",
  "artifactHash",
  "scannerEvidenceDigest",
  "semanticOutputDigest",
  "validationHead",
  "status",
  "resultDigest",
];
const artifactValidationResult = (
  physicalKey: string,
  ordinal: number,
  artifactHash: string,
  scanEvidence: JsonRecord,
  validationHead: string,
): JsonRecord => {
  const result: JsonRecord = {
    schemaVersion: 1,
    ordinal,
    physicalKey,
    artifactHash,
    scannerEvidenceDigest: scanEvidence.scannerEvidenceDigest,
    semanticOutputDigest: scanEvidence.semanticOutputDigest,
    validationHead,
    status: "PASS",
    resultDigest: "",
  };
  result.resultDigest = createHash("sha256")
    .update(
      `fluyo:r4b:artifact-validation-result:v1\n${JSON.stringify(withoutField(result, "resultDigest"))}`,
    )
    .digest("hex");
  return result;
};
const validArtifactValidationResult = (value: unknown, expected: JsonRecord): boolean =>
  exactObjectKeys(value, artifactValidationResultFields) &&
  JSON.stringify(value) === JSON.stringify(expected) &&
  !forbiddenManifestData(value);
const artifactValidationDigest = (
  keys: string[],
  hashes: JsonRecord,
  scanEvidence: JsonRecord,
  validationHead: string,
): string => {
  const digest = createHash("sha256").update("fluyo:r4b:artifact-validation-completeness:v1\n");
  keys.forEach((key, index) => {
    const result = artifactValidationResult(
      key,
      index + 1,
      String(hashes[key]),
      record(scanEvidence[key]),
      validationHead,
    );
    digest.update(String(result.resultDigest)).update("\n");
  });
  return digest.digest("hex");
};
type ArtifactValidationResultProvider = (
  physicalKey: string,
  ordinal: number,
) => JsonRecord | undefined;
const validArtifactValidationResultStream = (
  keys: string[],
  hashes: JsonRecord,
  scanEvidence: JsonRecord,
  validationHead: string,
  expectedDigest: unknown,
  provider: ArtifactValidationResultProvider,
): boolean => {
  const digest = createHash("sha256").update("fluyo:r4b:artifact-validation-completeness:v1\n");
  for (let index = 0; index < keys.length; index += 1) {
    const physicalKey = keys[index]!;
    const expected = artifactValidationResult(
      physicalKey,
      index + 1,
      String(hashes[physicalKey]),
      record(scanEvidence[physicalKey]),
      validationHead,
    );
    if (!validArtifactValidationResult(provider(physicalKey, index + 1), expected)) return false;
    digest.update(String(expected.resultDigest)).update("\n");
  }
  return digest.digest("hex") === expectedDigest;
};

const artifactContentDigestCache = new WeakMap<
  JsonRecord,
  WeakMap<
    JsonRecord,
    {
      scanEvidence: JsonRecord;
      validationDigest: string;
      transitionBinding: string;
      digest: string;
    }
  >
>();
const artifactContentDigest = (
  hashes: JsonRecord,
  sizes: JsonRecord,
  scanEvidence: JsonRecord,
  keys: string[],
  validationDigest: string,
  transitionEvidenceHash: string,
  transitionEvidenceByteSize: number,
  transitionEvidenceValidationDigestValue: string,
): string => {
  const transitionBinding = `${transitionEvidenceHash}\0${transitionEvidenceByteSize}\0${transitionEvidenceValidationDigestValue}`;
  const cached = artifactContentDigestCache.get(hashes)?.get(sizes);
  if (
    cached?.scanEvidence === scanEvidence &&
    cached.validationDigest === validationDigest &&
    cached.transitionBinding === transitionBinding
  )
    return cached.digest;
  const digest = createHash("sha256").update("fluyo:r4b:artifact-content:v1\n");
  for (const key of keys) {
    const scannerEvidenceDigest = String(record(scanEvidence[key]).scannerEvidenceDigest);
    digest
      .update(key)
      .update("\0")
      .update(String(hashes[key]))
      .update("\0")
      .update(String(sizes[key]))
      .update("\0")
      .update(scannerEvidenceDigest)
      .update("\n");
  }
  digest.update("validation\0").update(validationDigest).update("\n");
  digest.update("run-level-transition-evidence\0").update(transitionBinding).update("\n");
  const value = digest.digest("hex");
  let bySize = artifactContentDigestCache.get(hashes);
  if (!bySize) {
    bySize = new WeakMap<
      JsonRecord,
      {
        scanEvidence: JsonRecord;
        validationDigest: string;
        transitionBinding: string;
        digest: string;
      }
    >();
    artifactContentDigestCache.set(hashes, bySize);
  }
  bySize.set(sizes, { scanEvidence, validationDigest, transitionBinding, digest: value });
  return value;
};
const artifactSetDigest = (
  contentDigest: string,
  reviewerEvidenceHash: string,
  cleanupEvidenceHash: string,
): string =>
  createHash("sha256")
    .update(
      `fluyo:r4b:artifact-set:v2\n${contentDigest}\n${reviewerEvidenceHash}\n${cleanupEvidenceHash}`,
    )
    .digest("hex");
const priorArtifactSetDigest = (contentDigest: string, validationDigest: string): string =>
  createHash("sha256")
    .update(`fluyo:r4b:prior-artifact-set:v1\n${contentDigest}\n${validationDigest}`)
    .digest("hex");

const exactArtifactByteTotal = (sizes: JsonRecord, keys: string[]): number | undefined => {
  let total = 0;
  for (const key of keys) {
    const size = sizes[key];
    if (!Number.isSafeInteger(size) || Number(size) <= 0) return undefined;
    const artifactId = artifactIdFromKey(key);
    const ceiling = artifactId.endsWith(".png")
      ? Number(resourceBudgets.pngMaximumBytes)
      : artifactId.endsWith(".json")
        ? Number(resourceBudgets.jsonMaximumBytes)
        : Number(resourceBudgets.textMaximumBytes);
    if (Number(size) > ceiling || total > Number.MAX_SAFE_INTEGER - Number(size)) return undefined;
    total += Number(size);
    if (total > Number(resourceBudgets.aggregateMaximumBytes)) return undefined;
  }
  return total;
};

const reviewerCompletionFields = [
  "schemaVersion",
  "sourceCommit",
  "buildCommit",
  "validationHead",
  "artifactContentDigest",
  "priorArtifactSetDigest",
  "artifactCount",
  "transitionEvidenceHash",
  "transitionEvidenceValidationDigest",
  "reviewerIdentity",
  "reviewerRole",
  "workflowId",
  "workflowRevision",
  "workflowFilePath",
  "workflowFileDigest",
  "workflowRunId",
  "runAttempt",
  "evidenceReference",
  "evidenceArtifactId",
  "evidenceArtifactDigest",
  "completedAtUtc",
  "verdict",
];
const cleanupEvidenceFields = [
  "schemaVersion",
  "sourceCommit",
  "buildCommit",
  "validationHead",
  "artifactContentDigest",
  "priorArtifactSetDigest",
  "artifactCount",
  "durableArtifactIds",
  "durableArtifactDigests",
  "retainedDurableArtifactCount",
  "deletedArtifactCount",
  "retainedArtifactCount",
  "startedAtUtc",
  "completedAtUtc",
  "outcome",
  "retryState",
  "failureCode",
  "workflowId",
  "workflowRevision",
  "workflowFilePath",
  "workflowFileDigest",
  "workflowRunId",
  "runAttempt",
  "evidenceReference",
  "evidenceArtifactId",
  "evidenceArtifactDigest",
];
const evidenceArtifactDigest = (payload: JsonRecord): string =>
  createHash("sha256")
    .update(
      `fluyo:r4b:durable-evidence-artifact:v1\n${JSON.stringify(withoutField(payload, "evidenceArtifactDigest"))}`,
    )
    .digest("hex");
const validReviewerCompletion = (
  manifest: JsonRecord,
  contentDigest: string,
  validationDigest: string,
  count: number,
  trustedBytes?: Buffer,
  workflowFileBytes?: Buffer,
  scannerExecutedAtUtc?: string,
): boolean => {
  const trusted = trustedBytes
    ? parseCanonicalJsonBytes(trustedBytes)
    : manifest.reviewerCompletion;
  if (!exactObjectKeys(trusted, reviewerCompletionFields)) return false;
  const review = record(trusted);
  const workflowDigest = workflowFileBytes
    ? createHash("sha256").update(workflowFileBytes).digest("hex")
    : review.workflowFileDigest;
  const priorDigest = priorArtifactSetDigest(contentDigest, validationDigest);
  return (
    (!trustedBytes ||
      (JSON.stringify(review) === JSON.stringify(manifest.reviewerCompletion) &&
        createHash("sha256").update(trustedBytes).digest("hex") ===
          manifest.reviewerEvidenceHash)) &&
    review.schemaVersion === 1 &&
    review.sourceCommit === manifest.sourceCommit &&
    review.buildCommit === manifest.buildCommit &&
    review.validationHead === manifest.buildCommit &&
    review.artifactContentDigest === contentDigest &&
    review.priorArtifactSetDigest === priorDigest &&
    review.artifactCount === count &&
    review.transitionEvidenceHash === manifest.transitionEvidenceHash &&
    review.transitionEvidenceValidationDigest === manifest.transitionEvidenceValidationDigest &&
    review.reviewerIdentity === "Elana Castillo" &&
    review.reviewerRole === "sole_independent_exact_head_QA" &&
    review.workflowId === "r4b_base_controlled_visual_evidence_v1" &&
    review.workflowRevision === 1 &&
    review.workflowFilePath === workflowFilePath &&
    review.workflowFileDigest === workflowDigest &&
    review.workflowRunId === "1001" &&
    review.runAttempt === 1 &&
    review.evidenceReference ===
      `git:${manifest.buildCommit}:artifacts/r4b/reviewer-completion.json` &&
    review.evidenceArtifactId === "reviewer-completion.json" &&
    review.evidenceArtifactDigest === evidenceArtifactDigest(review) &&
    canonicalUtc(String(review.completedAtUtc)) &&
    Date.parse(String(review.completedAtUtc)) >
      Date.parse(String(scannerExecutedAtUtc ?? manifest.capturedAtUtc)) &&
    Date.parse(String(review.completedAtUtc)) <= Date.parse(String(manifest.deleteByUtc)) &&
    review.verdict === "PASS"
  );
};
const validCleanupEvidence = (
  manifest: JsonRecord,
  contentDigest: string,
  validationDigest: string,
  count: number,
  trustedBytes?: Buffer,
  workflowFileBytes?: Buffer,
): boolean => {
  const trusted = trustedBytes ? parseCanonicalJsonBytes(trustedBytes) : manifest.cleanupEvidence;
  if (!exactObjectKeys(trusted, cleanupEvidenceFields)) return false;
  const cleanup = record(trusted);
  const workflowDigest = workflowFileBytes
    ? createHash("sha256").update(workflowFileBytes).digest("hex")
    : cleanup.workflowFileDigest;
  const priorDigest = priorArtifactSetDigest(contentDigest, validationDigest);
  return (
    (!trustedBytes ||
      (JSON.stringify(cleanup) === JSON.stringify(manifest.cleanupEvidence) &&
        createHash("sha256").update(trustedBytes).digest("hex") ===
          manifest.cleanupEvidenceHash)) &&
    cleanup.schemaVersion === 1 &&
    cleanup.sourceCommit === manifest.sourceCommit &&
    cleanup.buildCommit === manifest.buildCommit &&
    cleanup.validationHead === manifest.buildCommit &&
    cleanup.artifactContentDigest === contentDigest &&
    cleanup.priorArtifactSetDigest === priorDigest &&
    cleanup.artifactCount === count &&
    JSON.stringify(cleanup.durableArtifactIds) ===
      JSON.stringify([completeResultsArtifactId, transitionEvidenceArtifactId]) &&
    JSON.stringify(cleanup.durableArtifactDigests) ===
      JSON.stringify([manifest.artifactContentDigest, manifest.transitionEvidenceHash]) &&
    cleanup.retainedDurableArtifactCount === 2 &&
    cleanup.deletedArtifactCount === count &&
    cleanup.retainedArtifactCount === 0 &&
    canonicalUtc(String(cleanup.startedAtUtc)) &&
    canonicalUtc(String(cleanup.completedAtUtc)) &&
    Date.parse(String(cleanup.startedAtUtc)) >=
      Date.parse(String(record(manifest.reviewerCompletion).completedAtUtc)) &&
    Date.parse(String(cleanup.completedAtUtc)) >= Date.parse(String(cleanup.startedAtUtc)) &&
    Date.parse(String(cleanup.completedAtUtc)) <= Date.parse(String(manifest.deleteByUtc)) &&
    cleanup.outcome === "DELETED" &&
    cleanup.retryState === "NOT_REQUIRED" &&
    cleanup.failureCode === null &&
    cleanup.workflowId === "r4b_base_controlled_visual_evidence_v1" &&
    cleanup.workflowRevision === 1 &&
    cleanup.workflowFilePath === workflowFilePath &&
    cleanup.workflowFileDigest === workflowDigest &&
    cleanup.workflowRunId === "1001" &&
    cleanup.runAttempt === 1 &&
    cleanup.evidenceReference ===
      `git:${manifest.buildCommit}:artifacts/r4b/cleanup-evidence.json` &&
    cleanup.evidenceArtifactId === "cleanup-evidence.json" &&
    cleanup.evidenceArtifactDigest === evidenceArtifactDigest(cleanup)
  );
};
const futureReviewerCompletion = (
  manifest: JsonRecord,
  contentDigest: string,
  validationDigest: string,
  count: number,
  workflowDigest = "d".repeat(64),
): JsonRecord => ({
  schemaVersion: 1,
  sourceCommit: manifest.sourceCommit,
  buildCommit: manifest.buildCommit,
  validationHead: manifest.buildCommit,
  artifactContentDigest: contentDigest,
  priorArtifactSetDigest: priorArtifactSetDigest(contentDigest, validationDigest),
  artifactCount: count,
  transitionEvidenceHash: manifest.transitionEvidenceHash,
  transitionEvidenceValidationDigest: manifest.transitionEvidenceValidationDigest,
  reviewerIdentity: "Elana Castillo",
  reviewerRole: "sole_independent_exact_head_QA",
  workflowId: "r4b_base_controlled_visual_evidence_v1",
  workflowRevision: 1,
  workflowFilePath,
  workflowFileDigest: workflowDigest,
  workflowRunId: "1001",
  runAttempt: 1,
  evidenceReference: `git:${manifest.buildCommit}:artifacts/r4b/reviewer-completion.json`,
  evidenceArtifactId: "reviewer-completion.json",
  evidenceArtifactDigest: "",
  completedAtUtc: addUtcSeconds(manifest.capturedAtUtc, 25000),
  verdict: "PASS",
});
const futureCleanupEvidence = (
  manifest: JsonRecord,
  contentDigest: string,
  validationDigest: string,
  count: number,
  workflowDigest = "d".repeat(64),
): JsonRecord => ({
  schemaVersion: 1,
  sourceCommit: manifest.sourceCommit,
  buildCommit: manifest.buildCommit,
  validationHead: manifest.buildCommit,
  artifactContentDigest: contentDigest,
  priorArtifactSetDigest: priorArtifactSetDigest(contentDigest, validationDigest),
  artifactCount: count,
  durableArtifactIds: [completeResultsArtifactId, transitionEvidenceArtifactId],
  durableArtifactDigests: [contentDigest, manifest.transitionEvidenceHash],
  retainedDurableArtifactCount: 2,
  deletedArtifactCount: count,
  retainedArtifactCount: 0,
  startedAtUtc: addUtcSeconds(manifest.capturedAtUtc, 25100),
  completedAtUtc: addUtcSeconds(manifest.capturedAtUtc, 25200),
  outcome: "DELETED",
  retryState: "NOT_REQUIRED",
  failureCode: null,
  workflowId: "r4b_base_controlled_visual_evidence_v1",
  workflowRevision: 1,
  workflowFilePath,
  workflowFileDigest: workflowDigest,
  workflowRunId: "1001",
  runAttempt: 1,
  evidenceReference: `git:${manifest.buildCommit}:artifacts/r4b/cleanup-evidence.json`,
  evidenceArtifactId: "cleanup-evidence.json",
  evidenceArtifactDigest: "",
});

const futurePassEvidence = (
  manifest: JsonRecord,
  hashes: JsonRecord,
  sizes: JsonRecord,
  keys: string[],
  workflowDigest = "d".repeat(64),
): JsonRecord => {
  const artifactScanEvidence = Object.fromEntries(
    keys.map((key) => [
      key,
      scanEvidenceFor(
        key,
        String(hashes[key]),
        undefined,
        scannerContext(manifest, key, String(hashes[key]), workflowDigest),
      ),
    ]),
  );
  const validationDigest = artifactValidationDigest(
    keys,
    hashes,
    artifactScanEvidence,
    String(manifest.buildCommit),
  );
  const contentDigest = artifactContentDigest(
    hashes,
    sizes,
    artifactScanEvidence,
    keys,
    validationDigest,
    String(manifest.transitionEvidenceHash),
    Number(manifest.transitionEvidenceByteSize),
    String(manifest.transitionEvidenceValidationDigest),
  );
  const reviewerCompletion = futureReviewerCompletion(
    manifest,
    contentDigest,
    validationDigest,
    keys.length,
    workflowDigest,
  );
  reviewerCompletion.evidenceArtifactDigest = evidenceArtifactDigest(reviewerCompletion);
  const cleanupEvidence = futureCleanupEvidence(
    manifest,
    contentDigest,
    validationDigest,
    keys.length,
    workflowDigest,
  );
  cleanupEvidence.evidenceArtifactDigest = evidenceArtifactDigest(cleanupEvidence);
  const reviewerEvidenceBytes = canonicalJsonBytes(reviewerCompletion);
  const cleanupEvidenceBytes = canonicalJsonBytes(cleanupEvidence);
  const reviewerEvidenceHash = createHash("sha256").update(reviewerEvidenceBytes).digest("hex");
  const cleanupEvidenceHash = createHash("sha256").update(cleanupEvidenceBytes).digest("hex");
  return {
    artifactScanEvidence,
    artifactValidationDigest: validationDigest,
    artifactContentDigest: contentDigest,
    reviewerEvidenceHash,
    cleanupEvidenceHash,
    artifactSetDigest: artifactSetDigest(contentDigest, reviewerEvidenceHash, cleanupEvidenceHash),
    reviewerCompletion,
    cleanupEvidence,
    reviewerEvidenceBytes,
    cleanupEvidenceBytes,
  };
};

const transitionEvidenceLocatorFields = ["workflowRunId", "runAttempt", "artifactId"];
const validTransitionEvidenceLocator = (value: unknown): boolean =>
  exactObjectKeys(value, transitionEvidenceLocatorFields) &&
  /^[1-9][0-9]{0,19}$/.test(String(record(value).workflowRunId)) &&
  Number.isSafeInteger(record(value).runAttempt) &&
  Number(record(value).runAttempt) > 0 &&
  record(value).artifactId === transitionEvidenceArtifactId;

const validManifestStructure = (manifest: JsonRecord): boolean => {
  const run = record(record(catalog.evidence).runManifest);
  if (JSON.stringify(Object.keys(manifest)) !== JSON.stringify(run.fieldOrder)) return false;
  if (forbiddenManifestData(manifest)) return false;
  if (manifest.schemaVersion !== 1) return false;
  if (![manifest.sourceCommit, manifest.buildCommit].every((x) => /^[0-9a-f]{40}$/.test(String(x))))
    return false;
  if (
    ![
      manifest.specDigest,
      manifest.uxContractDigest,
      manifest.fixtureDigest,
      manifest.fontDigest,
      manifest.keyboardProtocolDigest,
      manifest.nvdaProtocolDigest,
    ].every((x) => /^[0-9a-f]{64}$/.test(String(x)))
  )
    return false;
  if (
    ![manifest.specByteSize, manifest.fixtureBundleByteSize, manifest.fontBundleByteSize].every(
      (value) => Number.isSafeInteger(value) && Number(value) > 0,
    )
  )
    return false;
  const evidence = record(catalog.evidence);
  if (
    manifest.uxContractDigest !== catalog.uxContractDigest ||
    manifest.keyboardProtocolDigest !== evidence.keyboardProtocolDigest ||
    manifest.nvdaProtocolDigest !== evidence.nvdaProtocolDigest
  )
    return false;
  if (manifest.browserAtProfileId !== "windows_chromium_nvda") return false;
  if (!safeOsDisplayVersion(manifest.osVersion)) return false;
  if (!safeDottedVersion(manifest.chromiumVersion) || !safeDottedVersion(manifest.nvdaVersion))
    return false;
  if (!canonicalUtc(String(manifest.capturedAtUtc)) || !canonicalUtc(String(manifest.deleteByUtc)))
    return false;
  const captured = Date.parse(String(manifest.capturedAtUtc));
  const deletion = Date.parse(String(manifest.deleteByUtc));
  if (deletion <= captured || deletion > captured + 30 * 24 * 60 * 60 * 1000) return false;
  if (!Array.isArray(manifest.cells) || manifest.cells.length !== 10_800) return false;
  if (JSON.stringify(manifest.cells) !== JSON.stringify(closedCellRecords())) return false;
  const reconstructedCellVariants = closedCellVariantRecords();
  if (
    JSON.stringify(catalog.stateFixtureVariants) !==
      JSON.stringify(expectedStateFixtureVariantRecords()) ||
    reconstructedCellVariants.length !== 10_800 ||
    reconstructedCellVariants.some(({ variantId }) => variantId === undefined)
  )
    return false;
  if (!Array.isArray(manifest.cellMappings) || manifest.cellMappings.length !== 10_800)
    return false;
  if (JSON.stringify(manifest.cellMappings) !== JSON.stringify(closedCellMappings())) return false;
  if (
    !manifest.captureProfiles ||
    JSON.stringify(manifest.captureProfiles) !== closedCaptureProfilesJson()
  )
    return false;
  const cellKeys = new Set<string>();
  for (const cell of manifest.cells) {
    if (JSON.stringify(Object.keys(record(cell))) !== JSON.stringify(identityFields)) return false;
    const values = identityFields.map((field) => String(record(cell)[field]));
    if (!values.every(safeSegment)) return false;
    cellKeys.add(values.join("__"));
  }
  if (cellKeys.size !== 10_800) return false;
  if (!manifest.artifactHashes || !manifest.artifactByteSizes || !manifest.artifactScanEvidence)
    return false;
  const hashes = record(manifest.artifactHashes);
  const sizes = record(manifest.artifactByteSizes);
  const scanEvidence = record(manifest.artifactScanEvidence);
  if (
    JSON.stringify(Object.keys(hashes)) !== JSON.stringify(Object.keys(sizes)) ||
    JSON.stringify(Object.keys(hashes)) !== JSON.stringify(Object.keys(scanEvidence))
  )
    return false;
  const artifactKeys = Object.keys(hashes);
  if (!artifactKeys.every(validPhysicalArtifactKey)) return false;
  if (manifest.verdict === "PASS") {
    if (manifest.scanStatus !== "PASS") return false;
    if (
      !validTransitionEvidenceLocator(manifest.transitionEvidenceLocator) ||
      !/^[0-9a-f]{64}$/.test(String(manifest.transitionEvidenceHash)) ||
      !Number.isSafeInteger(manifest.transitionEvidenceByteSize) ||
      Number(manifest.transitionEvidenceByteSize) <= 0 ||
      Number(manifest.transitionEvidenceByteSize) > 256 * 1024 ||
      !/^[0-9a-f]{64}$/.test(String(manifest.transitionEvidenceValidationDigest))
    )
      return false;
    if (JSON.stringify(artifactKeys) !== JSON.stringify(canonicalArtifactKeys(manifest)))
      return false;
    const total = exactArtifactByteTotal(sizes, artifactKeys);
    const validationDigest = artifactValidationDigest(
      artifactKeys,
      hashes,
      scanEvidence,
      String(manifest.buildCommit),
    );
    const contentDigest = artifactContentDigest(
      hashes,
      sizes,
      scanEvidence,
      artifactKeys,
      validationDigest,
      String(manifest.transitionEvidenceHash),
      Number(manifest.transitionEvidenceByteSize),
      String(manifest.transitionEvidenceValidationDigest),
    );
    if (
      ![manifest.reviewerEvidenceHash, manifest.cleanupEvidenceHash].every((value) =>
        /^[0-9a-f]{64}$/.test(String(value)),
      )
    )
      return false;
    const digest = artifactSetDigest(
      contentDigest,
      String(manifest.reviewerEvidenceHash),
      String(manifest.cleanupEvidenceHash),
    );
    if (
      total === undefined ||
      manifest.aggregateArtifactBytes !== total ||
      manifest.artifactValidationDigest !== validationDigest ||
      manifest.artifactContentDigest !== contentDigest ||
      manifest.artifactSetDigest !== digest ||
      !validReviewerCompletion(manifest, contentDigest, validationDigest, artifactKeys.length) ||
      !validCleanupEvidence(manifest, contentDigest, validationDigest, artifactKeys.length)
    )
      return false;
  } else if (manifest.verdict === "FAIL") {
    if (
      manifest.scanStatus !== "FAIL" ||
      artifactKeys.length !== 0 ||
      Object.keys(scanEvidence).length !== 0 ||
      manifest.aggregateArtifactBytes !== 0 ||
      manifest.transitionEvidenceLocator !== null ||
      manifest.transitionEvidenceHash !== null ||
      manifest.transitionEvidenceByteSize !== null ||
      manifest.transitionEvidenceValidationDigest !== null ||
      manifest.artifactValidationDigest !== null ||
      manifest.artifactContentDigest !== null ||
      manifest.reviewerEvidenceHash !== null ||
      manifest.cleanupEvidenceHash !== null ||
      manifest.artifactSetDigest !== null ||
      manifest.reviewerCompletion !== null ||
      manifest.cleanupEvidence !== null
    )
      return false;
  } else if (manifest.verdict === "UNATTEMPTED") {
    if (
      manifest.scanStatus !== "NOT_RUN" ||
      artifactKeys.length !== 0 ||
      Object.keys(scanEvidence).length !== 0 ||
      manifest.aggregateArtifactBytes !== 0 ||
      manifest.transitionEvidenceLocator !== null ||
      manifest.transitionEvidenceHash !== null ||
      manifest.transitionEvidenceByteSize !== null ||
      manifest.transitionEvidenceValidationDigest !== null ||
      manifest.artifactValidationDigest !== null ||
      manifest.artifactContentDigest !== null ||
      manifest.reviewerEvidenceHash !== null ||
      manifest.cleanupEvidenceHash !== null ||
      manifest.artifactSetDigest !== null ||
      manifest.reviewerCompletion !== null ||
      manifest.cleanupEvidence !== null
    )
      return false;
  } else return false;
  if (!Object.values(hashes).every((value) => /^[0-9a-f]{64}$/.test(String(value)))) return false;
  if (!Object.values(sizes).every((value) => Number.isSafeInteger(value) && Number(value) > 0))
    return false;
  if (!validScanEvidenceMap(scanEvidence, hashes, artifactKeys)) return false;
  if (!(["NOT_RUN", "PASS", "FAIL"] as unknown[]).includes(manifest.scanStatus)) return false;
  if (
    !(["Camila", "Daniela", "Natalia", "Renata", "Elana"] as unknown[]).includes(
      manifest.reviewerRole,
    )
  )
    return false;
  if (manifest.verdict === "PASS" && manifest.reviewerRole !== "Elana") return false;
  return true;
};

type SyntheticManifestFixtureInputs = {
  sourceCommit: string;
  buildCommit: string;
  specBytes: Buffer;
  fixtureBytesByPath: Record<string, Buffer>;
  fontBytesByPath: Record<string, Buffer>;
  artifactBytesByPath: Record<string, Buffer>;
  capturePayloadBytesByPhysicalKey: Record<string, Buffer>;
  baselineProvenanceBytesByPhysicalKey: Record<string, Buffer>;
  scannerResultBytesByProofKey: Record<string, Buffer>;
  workflowFileBytes: Buffer;
  artifactValidationResultForPhysicalKey: ArtifactValidationResultProvider;
  transitionEvidenceBytes?: Buffer;
  reviewerEvidenceBytes?: Buffer;
  cleanupEvidenceBytes?: Buffer;
};

const bundleDigest = (prefix: string, files: Record<string, Buffer>): string => {
  const digest = createHash("sha256").update(prefix);
  for (const path of Object.keys(files).sort()) {
    const bytes = files[path]!;
    digest.update(path).update("\0").update(String(bytes.length)).update("\0").update(bytes);
  }
  return digest.digest("hex");
};

const bundleByteSize = (files: Record<string, Buffer>): number =>
  Object.values(files).reduce((total, bytes) => total + bytes.length, 0);

const computedUxContractDigest = (): string => {
  const subset = Object.fromEntries(uxSubsetKeys.map((key) => [key, catalog[key]]));
  subset.keyboardProtocol = record(catalog.evidence).keyboardProtocol;
  subset.keyboardPresentationFocusMap = record(catalog.evidence).keyboardPresentationFocusMap;
  subset.nvdaExpectationTemplates = record(catalog.evidence).nvdaExpectationTemplates;
  subset.syntheticObservationValues = record(catalog.evidence).syntheticObservationValues;
  return createHash("sha256")
    .update(`fluyo:r4a:ux-contract:v1\n${JSON.stringify(subset)}`)
    .digest("hex");
};

const validSyntheticManifestFixtureInternal = (
  manifest: JsonRecord,
  trusted: SyntheticManifestFixtureInputs,
): boolean => {
  if (!validManifestStructure(manifest)) return false;
  if (
    manifest.sourceCommit !== trusted.sourceCommit ||
    manifest.buildCommit !== trusted.buildCommit
  )
    return false;
  if (
    manifest.specDigest !== createHash("sha256").update(trusted.specBytes).digest("hex") ||
    manifest.specByteSize !== trusted.specBytes.length ||
    manifest.uxContractDigest !== computedUxContractDigest() ||
    manifest.uxContractDigest !== catalog.uxContractDigest ||
    manifest.fixtureDigest !==
      bundleDigest("fluyo:r4a:fixture-bundle:v1\n", trusted.fixtureBytesByPath) ||
    manifest.fixtureBundleByteSize !== bundleByteSize(trusted.fixtureBytesByPath) ||
    manifest.fontDigest !== bundleDigest("fluyo:r4a:font-bundle:v1\n", trusted.fontBytesByPath) ||
    manifest.fontBundleByteSize !== bundleByteSize(trusted.fontBytesByPath)
  )
    return false;
  const expectedKeys = manifest.verdict === "PASS" ? canonicalArtifactKeys(manifest) : [];
  const representativeKeys = manifest.verdict === "PASS" ? representativeSemanticKeys() : [];
  if (
    JSON.stringify(Object.keys(trusted.artifactBytesByPath)) !== JSON.stringify(representativeKeys)
  )
    return false;
  const expectedCaptureKeys = representativeKeys.filter((key) => key.endsWith(".png"));
  if (
    JSON.stringify(Object.keys(trusted.capturePayloadBytesByPhysicalKey)) !==
    JSON.stringify(expectedCaptureKeys)
  )
    return false;
  const expectedBaselineKeys = representativeKeys.filter((key) => key.endsWith("/baseline.png"));
  if (
    JSON.stringify(Object.keys(trusted.baselineProvenanceBytesByPhysicalKey)) !==
    JSON.stringify(expectedBaselineKeys)
  )
    return false;
  const expectedScannerProofKeys = representativeKeys.flatMap((physicalKey) =>
    applicableScannerIds(artifactIdFromKey(physicalKey)).map((scannerId) =>
      scannerProofKey(physicalKey, scannerId),
    ),
  );
  if (
    JSON.stringify(Object.keys(trusted.scannerResultBytesByProofKey)) !==
    JSON.stringify(expectedScannerProofKeys)
  )
    return false;
  const hashes = record(manifest.artifactHashes);
  const sizes = record(manifest.artifactByteSizes);
  const scanEvidence = record(manifest.artifactScanEvidence);
  const workflowDigest = createHash("sha256").update(trusted.workflowFileBytes).digest("hex");
  if (
    !representativeKeys.every((physicalKey) =>
      validScanEvidence(
        scanEvidence[physicalKey],
        physicalKey,
        hashes[physicalKey],
        trusted.scannerResultBytesByProofKey,
        scannerContext(manifest, physicalKey, String(hashes[physicalKey]), workflowDigest),
      ),
    )
  )
    return false;
  if (
    !representativeKeys.every((path) => {
      const bytes = trusted.artifactBytesByPath[path];
      return (
        bytes !== undefined &&
        (path.endsWith(".png") || !forbiddenManifestData(bytes.toString("utf8"))) &&
        createHash("sha256").update(bytes).digest("hex") === hashes[path] &&
        bytes.length === sizes[path] &&
        semanticArtifactValid(
          path,
          bytes,
          manifest,
          trusted.artifactBytesByPath,
          trusted.capturePayloadBytesByPhysicalKey,
          trusted.baselineProvenanceBytesByPhysicalKey,
        )
      );
    })
  )
    return false;
  if (manifest.verdict === "PASS") {
    const transitionBytes = trusted.transitionEvidenceBytes;
    const transitionPayload = transitionBytes
      ? parseCanonicalJsonBytes(transitionBytes)
      : undefined;
    if (
      !transitionBytes ||
      !transitionPayload ||
      transitionBytes.length !== manifest.transitionEvidenceByteSize ||
      bufferDigest(transitionBytes) !== manifest.transitionEvidenceHash ||
      transitionEvidenceValidationDigest(record(transitionPayload)) !==
        manifest.transitionEvidenceValidationDigest ||
      JSON.stringify(transitionPayload) !==
        JSON.stringify(
          transitionEvidencePayload(
            String(manifest.sourceCommit),
            String(record(manifest.transitionEvidenceLocator).workflowRunId),
            Number(record(manifest.transitionEvidenceLocator).runAttempt),
          ),
        )
    )
      return false;
    const contentDigest = artifactContentDigest(
      hashes,
      sizes,
      scanEvidence,
      expectedKeys,
      String(manifest.artifactValidationDigest),
      String(manifest.transitionEvidenceHash),
      Number(manifest.transitionEvidenceByteSize),
      String(manifest.transitionEvidenceValidationDigest),
    );
    if (
      !validReviewerCompletion(
        manifest,
        contentDigest,
        String(manifest.artifactValidationDigest),
        expectedKeys.length,
        trusted.reviewerEvidenceBytes,
        trusted.workflowFileBytes,
        scannerContext(
          manifest,
          representativeKeys[0]!,
          String(hashes[representativeKeys[0]!]),
          workflowDigest,
        ).executedAtUtc,
      ) ||
      !validCleanupEvidence(
        manifest,
        contentDigest,
        String(manifest.artifactValidationDigest),
        expectedKeys.length,
        trusted.cleanupEvidenceBytes,
        trusted.workflowFileBytes,
      )
    )
      return false;
    if (
      !validArtifactValidationResultStream(
        expectedKeys,
        hashes,
        scanEvidence,
        String(manifest.buildCommit),
        manifest.artifactValidationDigest,
        trusted.artifactValidationResultForPhysicalKey,
      )
    )
      return false;
  } else if (
    trusted.transitionEvidenceBytes ||
    trusted.reviewerEvidenceBytes ||
    trusted.cleanupEvidenceBytes
  )
    return false;
  return true;
};
const validateSyntheticManifestFixtureOnly = (
  manifest: JsonRecord,
  trusted: SyntheticManifestFixtureInputs,
): "SIMULATED_FIXTURE_ONLY" | undefined =>
  validSyntheticManifestFixtureInternal(manifest, trusted) ? "SIMULATED_FIXTURE_ONLY" : undefined;

const r4bRepository = "r1ruffrider/Fluyo";
const r4bWorkflowPath = ".github/workflows/r4b-conversation-canvas.yml";
const r4bWorkflowId = "r4b_conversation_canvas_v1";
const completeResultsArtifactId = "complete-results.jsonl";
const transitionEvidenceArtifactId = "transition-evidence.json";
const representativeBundleArtifactId = "representative-evidence.json";
const rawPngCaptureBundleArtifactId = "raw-png-capture-bundle.jsonl";
const rawStructuredBundleArtifactId = "raw-structured-artifact-bundle.jsonl";
const rawArtifactTargetIds = [
  rawPngCaptureBundleArtifactId,
  rawStructuredBundleArtifactId,
  representativeBundleArtifactId,
] as const;
const rawArtifactLogicalMemberCounts = [32_400, 54_000, 0] as const;
const rawBundleMaximumBytes = 64 * 1024 * 1024;
const rawMemberMaximumBytes = 8 * 1024 * 1024;
const rawBundlePayloadMaximumBytes = 32 * 1024 * 1024;
const rawBundleMaximumLineBytes = Math.ceil((rawMemberMaximumBytes * 4) / 3) + 32 * 1024;
const cleanupArtifactId = "cleanup-result.json";

type ResolvedCommit = {
  sha: string;
  parents: string[];
  changedPaths: string[];
  reachableFromTrustedMain: boolean;
};
type ResolvedGitBlob = { bytes: Buffer; objectId: string; sha256: string };
type ResolvedWorkflowRun = {
  repository: typeof r4bRepository;
  workflowPath: typeof r4bWorkflowPath;
  workflowId: typeof r4bWorkflowId;
  workflowBlobObjectId: string;
  workflowBlobDigest: string;
  runId: string;
  runAttempt: number;
  headSha: string;
  event: "workflow_dispatch";
  startedAtUtc: string;
  completedAtUtc: string;
  conclusion: "success" | "failure";
  runner: "github-hosted-ubuntu-24.04";
};
type ResolvedWorkflowArtifact = {
  repository: typeof r4bRepository;
  runId: string;
  runAttempt: number;
  artifactId: string;
  immutable: true;
  createdAtUtc: string;
  byteSize: number;
  sha256: string;
  stream: () => Iterable<Buffer>;
};
type ResolvedReviewerAttestation = {
  provider: "github_protected_environment";
  repository: typeof r4bRepository;
  attestationId: string;
  sourceCommit: string;
  workflowRunId: string;
  runAttempt: number;
  artifactSetDigest: string;
  rawArtifactInventoryDigest: string;
  transitionEvidenceHash: string;
  transitionEvidenceValidationDigest: string;
  verdict: "PASS";
  subjectId: "elana_castillo_quality";
  displayName: "Elana Castillo";
  role: "sole_independent_exact_head_QA";
  completedAtUtc: string;
  providerDigest: string;
};
type ResolvedArtifactAbsence = {
  provider: "github_artifact_retention_service";
  repository: typeof r4bRepository;
  attestationId: string;
  sourceCommit: string;
  captureRunId: string;
  captureRunAttempt: number;
  targetInventoryDigest: string;
  targetCount: number;
  logicalMemberCount: number;
  targetArtifactIds: string[];
  targetArtifactDigests: string[];
  absent: boolean[];
  verifiedAtUtc: string;
  providerDigest: string;
};
interface EvidenceResolver {
  resolveCommit(commit: string): ResolvedCommit | undefined;
  isAncestor(ancestor: string, descendant: string): boolean;
  resolveGitBlob(commit: string, closedPath: string): ResolvedGitBlob | undefined;
  resolveWorkflowRun(
    workflowPath: typeof r4bWorkflowPath,
    runId: string,
    runAttempt: number,
  ): ResolvedWorkflowRun | undefined;
  resolveWorkflowArtifact(
    runId: string,
    runAttempt: number,
    artifactId: string,
  ): ResolvedWorkflowArtifact | undefined;
  resolveReviewerAttestation(attestationId: string): ResolvedReviewerAttestation | undefined;
  resolveArtifactAbsence(attestationId: string): ResolvedArtifactAbsence | undefined;
}

const bufferDigest = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const providerRecordDigest = (domain: string, value: JsonRecord): string =>
  createHash("sha256")
    .update(`${domain}\n${JSON.stringify(withoutField(value, "providerDigest"))}`)
    .digest("hex");
const iterableMetadata = (
  factory: () => Iterable<Buffer>,
): { byteSize: number; sha256: string } => {
  let byteSize = 0;
  const digest = createHash("sha256");
  for (const chunk of factory()) {
    byteSize += chunk.length;
    if (!Number.isSafeInteger(byteSize) || byteSize > 128 * 1024 * 1024)
      throw new Error("bounded artifact size exceeded");
    digest.update(chunk);
  }
  return { byteSize, sha256: digest.digest("hex") };
};
const runKey = (runId: string, attempt: number): string => `${runId}/${attempt}`;
const artifactKey = (runId: string, attempt: number, artifactId: string): string =>
  `${runId}/${attempt}/${artifactId}`;

class SealedFakeEvidenceResolver implements EvidenceResolver {
  readonly #gitRoot: string;
  readonly #runs = new Map<string, ResolvedWorkflowRun>();
  readonly #artifacts = new Map<string, ResolvedWorkflowArtifact>();
  readonly #reviewerAttestations = new Map<string, ResolvedReviewerAttestation>();
  readonly #absenceAttestations = new Map<string, ResolvedArtifactAbsence>();
  readonly #stable = new Map<string, string>();
  #sealed = false;

  constructor(gitRoot: string) {
    this.#gitRoot = gitRoot;
  }

  seedRun(run: ResolvedWorkflowRun): this {
    if (this.#sealed) throw new Error("resolver sealed");
    this.#runs.set(runKey(run.runId, run.runAttempt), structuredClone(run));
    return this;
  }

  seedArtifact(
    runId: string,
    runAttempt: number,
    artifactId: string,
    createdAtUtc: string,
    factory: () => Iterable<Buffer>,
  ): this {
    if (this.#sealed) throw new Error("resolver sealed");
    const metadata = iterableMetadata(factory);
    this.#artifacts.set(artifactKey(runId, runAttempt, artifactId), {
      repository: r4bRepository,
      runId,
      runAttempt,
      artifactId,
      immutable: true,
      createdAtUtc,
      ...metadata,
      stream: factory,
    });
    return this;
  }

  seedResolvedArtifact(artifact: ResolvedWorkflowArtifact): this {
    if (this.#sealed) throw new Error("resolver sealed");
    this.#artifacts.set(artifactKey(artifact.runId, artifact.runAttempt, artifact.artifactId), {
      ...artifact,
    });
    return this;
  }

  cleanupSnapshotDeleting(
    runId: string,
    runAttempt: number,
    artifactIds: readonly string[],
  ): SealedFakeEvidenceResolver {
    if (!this.#sealed) throw new Error("cleanup snapshot requires sealed provider state");
    const next = new SealedFakeEvidenceResolver(this.#gitRoot);
    for (const run of this.#runs.values())
      next.#runs.set(runKey(run.runId, run.runAttempt), { ...run });
    const deletionKeys = new Set(
      artifactIds.map((artifactId) => artifactKey(runId, runAttempt, artifactId)),
    );
    for (const [key, artifact] of this.#artifacts)
      if (!deletionKeys.has(key)) next.#artifacts.set(key, { ...artifact });
    for (const [key, attestation] of this.#reviewerAttestations)
      next.#reviewerAttestations.set(key, structuredClone(attestation));
    for (const [key, attestation] of this.#absenceAttestations)
      next.#absenceAttestations.set(key, structuredClone(attestation));
    return next;
  }

  seedReviewerAttestation(attestation: ResolvedReviewerAttestation): this {
    if (this.#sealed) throw new Error("resolver sealed");
    this.#reviewerAttestations.set(attestation.attestationId, structuredClone(attestation));
    return this;
  }

  seedArtifactAbsence(attestation: ResolvedArtifactAbsence): this {
    if (this.#sealed) throw new Error("resolver sealed");
    this.#absenceAttestations.set(attestation.attestationId, structuredClone(attestation));
    return this;
  }

  seal(): this {
    this.#sealed = true;
    return this;
  }

  #remember(key: string, value: unknown): void {
    if (!this.#sealed) throw new Error("resolver must be sealed before use");
    const digest = valueDigest(value);
    const prior = this.#stable.get(key);
    if (prior !== undefined && prior !== digest) throw new Error("resolver equivocation");
    this.#stable.set(key, digest);
  }

  resolveCommit(commit: string): ResolvedCommit | undefined {
    if (!/^[0-9a-f]{40}$/.test(commit)) return undefined;
    try {
      execFileSync("git", ["cat-file", "-e", `${commit}^{commit}`], { cwd: this.#gitRoot });
      const parents = execFileSync("git", ["show", "-s", "--format=%P", commit], {
        cwd: this.#gitRoot,
        encoding: "utf8",
      })
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const changedPaths = execFileSync(
        "git",
        ["diff-tree", "--no-commit-id", "--name-only", "-r", commit],
        { cwd: this.#gitRoot, encoding: "utf8" },
      )
        .split(/\r?\n/)
        .filter(Boolean)
        .sort();
      let reachableFromTrustedMain = true;
      try {
        execFileSync("git", ["merge-base", "--is-ancestor", commit, "refs/heads/trusted-main"], {
          cwd: this.#gitRoot,
        });
      } catch {
        reachableFromTrustedMain = false;
      }
      const resolved = { sha: commit, parents, changedPaths, reachableFromTrustedMain };
      this.#remember(`commit:${commit}`, resolved);
      return resolved;
    } catch {
      return undefined;
    }
  }

  isAncestor(ancestor: string, descendant: string): boolean {
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
        cwd: this.#gitRoot,
      });
      return true;
    } catch {
      return false;
    }
  }

  resolveGitBlob(commit: string, closedPath: string): ResolvedGitBlob | undefined {
    if (
      !/^[0-9a-f]{40}$/.test(commit) ||
      closedPath.startsWith("/") ||
      closedPath.includes("\\") ||
      closedPath.split("/").some((segment) => !segment || segment === "." || segment === "..")
    )
      return undefined;
    try {
      const bytes = execFileSync("git", ["show", `${commit}:${closedPath}`], {
        cwd: this.#gitRoot,
      });
      const objectId = execFileSync("git", ["rev-parse", `${commit}:${closedPath}`], {
        cwd: this.#gitRoot,
        encoding: "utf8",
      }).trim();
      const resolved = { bytes, objectId, sha256: bufferDigest(bytes) };
      this.#remember(`blob:${commit}:${closedPath}`, {
        objectId,
        sha256: resolved.sha256,
        byteSize: bytes.length,
      });
      return resolved;
    } catch {
      return undefined;
    }
  }

  resolveWorkflowRun(
    workflowPath: typeof r4bWorkflowPath,
    runId: string,
    runAttempt: number,
  ): ResolvedWorkflowRun | undefined {
    if (workflowPath !== r4bWorkflowPath) return undefined;
    const value = this.#runs.get(runKey(runId, runAttempt));
    if (!value) return undefined;
    const copy = structuredClone(value);
    this.#remember(`run:${runId}:${runAttempt}`, copy);
    return copy;
  }

  resolveWorkflowArtifact(
    runId: string,
    runAttempt: number,
    artifactId: string,
  ): ResolvedWorkflowArtifact | undefined {
    const value = this.#artifacts.get(artifactKey(runId, runAttempt, artifactId));
    if (!value) return undefined;
    const metadata = {
      repository: value.repository,
      runId: value.runId,
      runAttempt: value.runAttempt,
      artifactId: value.artifactId,
      immutable: value.immutable,
      createdAtUtc: value.createdAtUtc,
      byteSize: value.byteSize,
      sha256: value.sha256,
    };
    this.#remember(`artifact:${runId}:${runAttempt}:${artifactId}`, metadata);
    return { ...metadata, stream: value.stream };
  }

  resolveReviewerAttestation(attestationId: string): ResolvedReviewerAttestation | undefined {
    const value = this.#reviewerAttestations.get(attestationId);
    if (!value) return undefined;
    const copy = structuredClone(value);
    this.#remember(`reviewer-attestation:${attestationId}`, copy);
    return copy;
  }

  resolveArtifactAbsence(attestationId: string): ResolvedArtifactAbsence | undefined {
    const value = this.#absenceAttestations.get(attestationId);
    if (!value) return undefined;
    const copy = structuredClone(value);
    this.#remember(`artifact-absence:${attestationId}`, copy);
    return copy;
  }
}

const stableResolvedCommit = (
  resolver: EvidenceResolver,
  commit: string,
): ResolvedCommit | undefined => {
  const first = resolver.resolveCommit(commit);
  const second = resolver.resolveCommit(commit);
  return first && second && JSON.stringify(first) === JSON.stringify(second) ? first : undefined;
};
const stableResolvedBlob = (
  resolver: EvidenceResolver,
  commit: string,
  path: string,
): ResolvedGitBlob | undefined => {
  const first = resolver.resolveGitBlob(commit, path);
  const second = resolver.resolveGitBlob(commit, path);
  return first &&
    second &&
    first.objectId === second.objectId &&
    first.sha256 === second.sha256 &&
    first.bytes.equals(second.bytes)
    ? first
    : undefined;
};
const stableResolvedRun = (
  resolver: EvidenceResolver,
  workflowPath: typeof r4bWorkflowPath,
  runId: string,
  runAttempt: number,
): ResolvedWorkflowRun | undefined => {
  const first = resolver.resolveWorkflowRun(workflowPath, runId, runAttempt);
  const second = resolver.resolveWorkflowRun(workflowPath, runId, runAttempt);
  return first && second && JSON.stringify(first) === JSON.stringify(second) ? first : undefined;
};
const stableResolvedArtifact = (
  resolver: EvidenceResolver,
  runId: string,
  runAttempt: number,
  artifactId: string,
): ResolvedWorkflowArtifact | undefined => {
  const first = resolver.resolveWorkflowArtifact(runId, runAttempt, artifactId);
  const second = resolver.resolveWorkflowArtifact(runId, runAttempt, artifactId);
  if (!first || !second) return undefined;
  const metadata = (value: ResolvedWorkflowArtifact) => ({
    repository: value.repository,
    runId: value.runId,
    runAttempt: value.runAttempt,
    artifactId: value.artifactId,
    immutable: value.immutable,
    createdAtUtc: value.createdAtUtc,
    byteSize: value.byteSize,
    sha256: value.sha256,
  });
  return JSON.stringify(metadata(first)) === JSON.stringify(metadata(second)) ? first : undefined;
};
const stableReviewerAttestation = (
  resolver: EvidenceResolver,
  attestationId: string,
): ResolvedReviewerAttestation | undefined => {
  const first = resolver.resolveReviewerAttestation(attestationId);
  const second = resolver.resolveReviewerAttestation(attestationId);
  return first && second && JSON.stringify(first) === JSON.stringify(second) ? first : undefined;
};
const stableArtifactAbsence = (
  resolver: EvidenceResolver,
  attestationId: string,
): ResolvedArtifactAbsence | undefined => {
  const first = resolver.resolveArtifactAbsence(attestationId);
  const second = resolver.resolveArtifactAbsence(attestationId);
  return first && second && JSON.stringify(first) === JSON.stringify(second) ? first : undefined;
};

const evidenceLocatorFields = [
  "schemaVersion",
  "phase",
  "sourceCommit",
  "baselineApprovalCommit",
  "baselineSetId",
  "captureRunId",
  "captureRunAttempt",
  "completeResultsArtifactId",
  "transitionEvidenceArtifactId",
  "representativeBundleArtifactId",
  "reviewCommit",
  "cleanupCommit",
  "cleanupRunId",
  "cleanupRunAttempt",
  "cleanupArtifactId",
];
type EvidenceLocators = {
  schemaVersion: 1;
  phase: "PRE_CLEANUP" | "FINALIZED";
  sourceCommit: string;
  baselineApprovalCommit: string;
  baselineSetId: string;
  captureRunId: string;
  captureRunAttempt: number;
  completeResultsArtifactId: typeof completeResultsArtifactId;
  transitionEvidenceArtifactId: typeof transitionEvidenceArtifactId;
  representativeBundleArtifactId: typeof representativeBundleArtifactId;
  reviewCommit: string | null;
  cleanupCommit: string | null;
  cleanupRunId: string | null;
  cleanupRunAttempt: number | null;
  cleanupArtifactId: typeof cleanupArtifactId | null;
};
const validEvidenceLocators = (value: unknown): value is EvidenceLocators => {
  if (!exactObjectKeys(value, evidenceLocatorFields)) return false;
  const locator = record(value);
  const pre = locator.phase === "PRE_CLEANUP";
  return (
    locator.schemaVersion === 1 &&
    [locator.sourceCommit, locator.baselineApprovalCommit].every((sha) =>
      /^[0-9a-f]{40}$/.test(String(sha)),
    ) &&
    /^[a-z0-9][a-z0-9_-]{0,63}$/.test(String(locator.baselineSetId)) &&
    /^[1-9][0-9]{0,19}$/.test(String(locator.captureRunId)) &&
    Number.isSafeInteger(locator.captureRunAttempt) &&
    Number(locator.captureRunAttempt) > 0 &&
    locator.completeResultsArtifactId === completeResultsArtifactId &&
    locator.transitionEvidenceArtifactId === transitionEvidenceArtifactId &&
    locator.representativeBundleArtifactId === representativeBundleArtifactId &&
    (pre
      ? locator.reviewCommit === null &&
        locator.cleanupCommit === null &&
        locator.cleanupRunId === null &&
        locator.cleanupRunAttempt === null &&
        locator.cleanupArtifactId === null
      : locator.phase === "FINALIZED" &&
        /^[0-9a-f]{40}$/.test(String(locator.reviewCommit)) &&
        /^[0-9a-f]{40}$/.test(String(locator.cleanupCommit)) &&
        /^[1-9][0-9]{0,19}$/.test(String(locator.cleanupRunId)) &&
        Number.isSafeInteger(locator.cleanupRunAttempt) &&
        Number(locator.cleanupRunAttempt) > 0 &&
        locator.cleanupArtifactId === cleanupArtifactId)
  );
};

const resolvedRunValid = (
  run: ResolvedWorkflowRun | undefined,
  sourceCommit: string,
  workflow: ResolvedGitBlob,
): run is ResolvedWorkflowRun =>
  !!run &&
  run.repository === r4bRepository &&
  run.workflowPath === r4bWorkflowPath &&
  run.workflowId === r4bWorkflowId &&
  run.headSha === sourceCommit &&
  run.workflowBlobObjectId === workflow.objectId &&
  run.workflowBlobDigest === workflow.sha256 &&
  run.event === "workflow_dispatch" &&
  canonicalUtc(run.startedAtUtc) &&
  canonicalUtc(run.completedAtUtc) &&
  Date.parse(run.startedAtUtc) < Date.parse(run.completedAtUtc) &&
  run.conclusion === "success" &&
  run.runner === "github-hosted-ubuntu-24.04" &&
  /^[1-9][0-9]{0,19}$/.test(run.runId) &&
  Number.isSafeInteger(run.runAttempt) &&
  run.runAttempt > 0;

const completeResultFields = [
  "schemaVersion",
  "ordinal",
  "physicalKey",
  "cellDigest",
  "artifactId",
  "artifactHash",
  "artifactByteSize",
  "capturePayloadDigest",
  "scannerSetDigest",
  "semanticDigest",
  "sourceCommit",
  "workflowRunId",
  "runAttempt",
  "validatedAtUtc",
  "status",
  "resultDigest",
];
const completeResultDigest = (result: JsonRecord): string =>
  createHash("sha256")
    .update(`fluyo:r4b:complete-result:v1\n${JSON.stringify(withoutField(result, "resultDigest"))}`)
    .digest("hex");
const simulatedRawPayloadBytes = (physicalKey: string): Buffer =>
  createHash("sha256")
    .update(`fluyo:r4b:simulated-raw-payload:v1\n${physicalKey}`)
    .digest()
    .subarray(0, 1);
const completeResult = (
  physicalKey: string,
  ordinal: number,
  sourceCommit: string,
  run: ResolvedWorkflowRun,
  overrides: JsonRecord = {},
): JsonRecord => {
  const artifactId = artifactIdFromKey(physicalKey);
  const defaultPayload = simulatedRawPayloadBytes(physicalKey);
  const result: JsonRecord = {
    schemaVersion: 1,
    ordinal,
    physicalKey,
    cellDigest: physicalKey.split("/")[1],
    artifactId,
    artifactHash: bufferDigest(defaultPayload),
    artifactByteSize: defaultPayload.length,
    capturePayloadDigest: createHash("sha256").update(`r4b:capture:${physicalKey}`).digest("hex"),
    scannerSetDigest: createHash("sha256").update(`r4b:scanner:${physicalKey}`).digest("hex"),
    semanticDigest: createHash("sha256").update(`r4b:semantic:${physicalKey}`).digest("hex"),
    sourceCommit,
    workflowRunId: run.runId,
    runAttempt: run.runAttempt,
    validatedAtUtc: addUtcSeconds(run.startedAtUtc, ordinal),
    status: "PASS",
    resultDigest: "",
    ...overrides,
  };
  result.resultDigest = completeResultDigest(result);
  return result;
};
const jsonlHeaderFields = [
  "schemaVersion",
  "recordType",
  "sourceCommit",
  "workflowRunId",
  "runAttempt",
  "artifactCount",
];
const jsonlFooterFields = ["schemaVersion", "recordType", "artifactCount", "orderedResultDigest"];

const validateBoundedCanonicalJsonlStream = (
  artifact: ResolvedWorkflowArtifact,
  maximumArtifactBytes: number,
  maximumLineBytes: number,
  consumeLine: (rawLine: string) => boolean,
): boolean => {
  const digest = createHash("sha256");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let residual = "";
  let streamedBytes = 0;
  const drainCompleteLines = (): boolean => {
    let newline = residual.indexOf("\n");
    while (newline >= 0) {
      const rawLine = residual.slice(0, newline);
      if (Buffer.byteLength(rawLine) > maximumLineBytes || !consumeLine(rawLine)) return false;
      residual = residual.slice(newline + 1);
      newline = residual.indexOf("\n");
    }
    return Buffer.byteLength(residual) <= maximumLineBytes;
  };
  try {
    for (const chunk of artifact.stream()) {
      streamedBytes += chunk.length;
      if (streamedBytes > artifact.byteSize || streamedBytes > maximumArtifactBytes) return false;
      digest.update(chunk);
      residual += decoder.decode(chunk, { stream: true });
      if (!drainCompleteLines()) return false;
    }
    residual += decoder.decode();
    if (!drainCompleteLines()) return false;
  } catch {
    return false;
  }
  return (
    residual === "" &&
    streamedBytes === artifact.byteSize &&
    digest.digest("hex") === artifact.sha256
  );
};

type CompleteResultsValidation = {
  artifactCount: number;
  orderedResultDigest: string;
  artifactSha256: string;
  artifactByteSize: number;
  representativeResults: Map<string, JsonRecord>;
  rawMemberAuthority: Map<string, JsonRecord>;
};
const validateCompleteResults = (
  artifact: ResolvedWorkflowArtifact,
  sourceCommit: string,
  run: ResolvedWorkflowRun,
  representativeKeys: Set<string>,
): CompleteResultsValidation | undefined => {
  if (
    artifact.repository !== r4bRepository ||
    artifact.runId !== run.runId ||
    artifact.runAttempt !== run.runAttempt ||
    artifact.artifactId !== completeResultsArtifactId ||
    artifact.immutable !== true ||
    !canonicalUtc(artifact.createdAtUtc) ||
    Date.parse(artifact.createdAtUtc) < Date.parse(run.startedAtUtc) ||
    Date.parse(artifact.createdAtUtc) > Date.parse(run.completedAtUtc) ||
    artifact.byteSize <= 0 ||
    artifact.byteSize > 128 * 1024 * 1024 ||
    !/^[0-9a-f]{64}$/.test(artifact.sha256)
  )
    return undefined;
  const orderedDigest = createHash("sha256").update("fluyo:r4b:complete-results:v1\n");
  const expectedKeys = closedArtifactKeys();
  const representativeResults = new Map<string, JsonRecord>();
  const rawMemberAuthority = new Map<string, JsonRecord>();
  let lineIndex = 0;
  let footer: JsonRecord | undefined;
  const consumeLine = (rawLine: string): boolean => {
    if (!rawLine) return false;
    const parsed = parseCanonicalJsonBytes(Buffer.from(`${rawLine}\n`));
    if (!parsed || canonicalJsonBytes(parsed).toString("utf8") !== `${rawLine}\n`) return false;
    if (lineIndex === 0) {
      if (!exactObjectKeys(parsed, jsonlHeaderFields)) return false;
      const header = record(parsed);
      if (
        header.schemaVersion !== 1 ||
        header.recordType !== "header" ||
        header.sourceCommit !== sourceCommit ||
        header.workflowRunId !== run.runId ||
        header.runAttempt !== run.runAttempt ||
        header.artifactCount !== expectedKeys.length
      )
        return false;
    } else if (lineIndex <= expectedKeys.length) {
      if (!exactObjectKeys(parsed, completeResultFields)) return false;
      const result = record(parsed);
      const physicalKey = expectedKeys[lineIndex - 1]!;
      if (
        result.schemaVersion !== 1 ||
        result.ordinal !== lineIndex ||
        result.physicalKey !== physicalKey ||
        result.cellDigest !== physicalKey.split("/")[1] ||
        result.artifactId !== artifactIdFromKey(physicalKey) ||
        !/^[0-9a-f]{64}$/.test(String(result.artifactHash)) ||
        !Number.isSafeInteger(result.artifactByteSize) ||
        Number(result.artifactByteSize) <= 0 ||
        ![result.capturePayloadDigest, result.scannerSetDigest, result.semanticDigest].every(
          (value) => /^[0-9a-f]{64}$/.test(String(value)),
        ) ||
        result.sourceCommit !== sourceCommit ||
        result.workflowRunId !== run.runId ||
        result.runAttempt !== run.runAttempt ||
        !canonicalUtc(String(result.validatedAtUtc)) ||
        Date.parse(String(result.validatedAtUtc)) < Date.parse(run.startedAtUtc) ||
        Date.parse(String(result.validatedAtUtc)) > Date.parse(run.completedAtUtc) ||
        result.status !== "PASS" ||
        result.resultDigest !== completeResultDigest(result)
      ) {
        return false;
      }
      orderedDigest.update(String(result.resultDigest)).update("\n");
      rawMemberAuthority.set(physicalKey, {
        physicalKey,
        cellDigest: result.cellDigest,
        artifactId: result.artifactId,
        artifactHash: result.artifactHash,
        artifactByteSize: result.artifactByteSize,
      });
      if (representativeKeys.has(physicalKey)) representativeResults.set(physicalKey, result);
    } else if (lineIndex === expectedKeys.length + 1) {
      if (!exactObjectKeys(parsed, jsonlFooterFields)) return false;
      footer = record(parsed);
    } else return false;
    lineIndex += 1;
    return true;
  };
  if (!validateBoundedCanonicalJsonlStream(artifact, 128 * 1024 * 1024, 16 * 1024, consumeLine))
    return undefined;
  const orderedResultDigest = orderedDigest.digest("hex");
  if (
    lineIndex !== expectedKeys.length + 2 ||
    !footer ||
    footer.schemaVersion !== 1 ||
    footer.recordType !== "footer" ||
    footer.artifactCount !== expectedKeys.length ||
    footer.orderedResultDigest !== orderedResultDigest ||
    representativeResults.size !== representativeKeys.size
  ) {
    return undefined;
  }
  return {
    artifactCount: expectedKeys.length,
    orderedResultDigest,
    artifactSha256: artifact.sha256,
    artifactByteSize: artifact.byteSize,
    representativeResults,
    rawMemberAuthority,
  };
};

const representativeBundleFields = [
  "schemaVersion",
  "sourceCommit",
  "workflowRunId",
  "runAttempt",
  "entries",
];
const representativeEntryFields = [
  "physicalKey",
  "artifactBytesBase64",
  "capturePayloadBytesBase64",
  "baselineProvenanceBytesBase64",
  "scannerPayloadsBase64",
];
type RepresentativeBundleValidation = {
  digest: string;
  rawPayloads: Map<string, Buffer>;
};
const validateRepresentativeBundle = (
  artifact: ResolvedWorkflowArtifact,
  sourceCommit: string,
  run: ResolvedWorkflowRun,
  complete: CompleteResultsValidation,
  baseline: ResolvedBaseline,
): RepresentativeBundleValidation | undefined => {
  if (
    artifact.repository !== r4bRepository ||
    artifact.runId !== run.runId ||
    artifact.runAttempt !== run.runAttempt ||
    artifact.artifactId !== representativeBundleArtifactId ||
    artifact.immutable !== true ||
    !canonicalUtc(artifact.createdAtUtc) ||
    Date.parse(artifact.createdAtUtc) < Date.parse(run.startedAtUtc) ||
    Date.parse(artifact.createdAtUtc) > Date.parse(run.completedAtUtc) ||
    !Number.isSafeInteger(artifact.byteSize) ||
    artifact.byteSize <= 0 ||
    artifact.byteSize > 16 * 1024 * 1024
  )
    return undefined;
  const chunks: Buffer[] = [];
  let streamedBytes = 0;
  const streamedDigest = createHash("sha256");
  for (const chunk of artifact.stream()) {
    streamedBytes += chunk.length;
    if (streamedBytes > artifact.byteSize || streamedBytes > 16 * 1024 * 1024) return undefined;
    chunks.push(chunk);
    streamedDigest.update(chunk);
  }
  const bytes = Buffer.concat(chunks);
  if (
    streamedBytes !== artifact.byteSize ||
    streamedDigest.digest("hex") !== artifact.sha256 ||
    bytes.length !== artifact.byteSize
  )
    return undefined;
  const parsed = parseCanonicalJsonBytes(bytes);
  if (!exactObjectKeys(parsed, representativeBundleFields)) return undefined;
  const bundle = record(parsed);
  if (
    bundle.schemaVersion !== 1 ||
    bundle.sourceCommit !== sourceCommit ||
    bundle.workflowRunId !== run.runId ||
    bundle.runAttempt !== run.runAttempt
  )
    return undefined;
  const entries = records(bundle.entries);
  const expectedKeys = representativeSemanticKeys();
  if (entries.length !== expectedKeys.length) return undefined;
  const artifactBytesByPath: Record<string, Buffer> = {};
  const capturePayloads: Record<string, Buffer> = {};
  const baselinePayloads: Record<string, Buffer> = {};
  const scannerPayloads: Record<string, Buffer> = {};
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    const key = expectedKeys[index]!;
    if (!exactObjectKeys(entry, representativeEntryFields) || entry.physicalKey !== key)
      return undefined;
    try {
      artifactBytesByPath[key] = Buffer.from(String(entry.artifactBytesBase64), "base64");
      if (key.endsWith(".png"))
        capturePayloads[key] = Buffer.from(String(entry.capturePayloadBytesBase64), "base64");
      else if (entry.capturePayloadBytesBase64 !== null) return undefined;
      if (key.endsWith("/baseline.png"))
        baselinePayloads[key] = Buffer.from(String(entry.baselineProvenanceBytesBase64), "base64");
      else if (entry.baselineProvenanceBytesBase64 !== null) return undefined;
      const scannerEntries = record(entry.scannerPayloadsBase64);
      for (const scannerId of applicableScannerIds(artifactIdFromKey(key))) {
        const value = scannerEntries[scannerId];
        if (typeof value !== "string") return undefined;
        scannerPayloads[scannerProofKey(key, scannerId)] = Buffer.from(value, "base64");
      }
      if (
        Object.keys(scannerEntries).length !== applicableScannerIds(artifactIdFromKey(key)).length
      )
        return undefined;
    } catch {
      return undefined;
    }
  }
  const syntheticManifest = {
    sourceCommit,
    buildCommit: sourceCommit,
    capturedAtUtc: run.startedAtUtc,
    deleteByUtc: addUtcSeconds(run.completedAtUtc, 86400),
    nvdaVersion: "2026.1",
    captureProfiles: closedCaptureProfiles(),
  };
  if (
    !validSemanticArtifactSet(
      expectedKeys,
      artifactBytesByPath,
      syntheticManifest,
      capturePayloads,
      baselinePayloads,
      baseline,
    )
  )
    return undefined;
  for (const key of expectedKeys.filter((candidate) => candidate.endsWith("/baseline.png"))) {
    const inventoryEntry = baseline.inventory.get(key);
    const baselineBytes = artifactBytesByPath[key];
    if (
      !inventoryEntry ||
      !baselineBytes ||
      inventoryEntry.artifactHash !== bufferDigest(baselineBytes) ||
      inventoryEntry.artifactByteSize !== baselineBytes.length
    )
      return undefined;
  }
  const workflowDigest = run.workflowBlobDigest;
  for (const key of expectedKeys) {
    const result = complete.representativeResults.get(key);
    const bytesForKey = artifactBytesByPath[key]!;
    const artifactHash = bufferDigest(bytesForKey);
    const captureDigest = key.endsWith(".png")
      ? bufferDigest(capturePayloads[key]!)
      : bufferDigest(Buffer.from("NOT_APPLICABLE"));
    const evidence = scanEvidenceFor(
      key,
      artifactHash,
      scannerPayloads,
      scannerContext(syntheticManifest, key, artifactHash, workflowDigest),
    );
    if (
      !result ||
      result.artifactHash !== artifactHash ||
      result.artifactByteSize !== bytesForKey.length ||
      result.capturePayloadDigest !== captureDigest ||
      result.scannerSetDigest !== evidence.scannerEvidenceDigest ||
      result.semanticDigest !== evidence.semanticOutputDigest
    )
      return undefined;
  }
  return {
    digest: createHash("sha256")
      .update(
        `fluyo:r4b:representative-bundle:v1\n${artifact.sha256}\n${complete.orderedResultDigest}`,
      )
      .digest("hex"),
    rawPayloads: new Map(Object.entries(artifactBytesByPath)),
  };
};

const baselineApprovalFields = [
  "schemaVersion",
  "baselineSetId",
  "captureSourceCommit",
  "captureRunId",
  "captureRunAttempt",
  "captureArtifactId",
  "captureArtifactHash",
  "captureArtifactByteSize",
  "inventoryDigest",
  "cellCatalogDigest",
  "captureProfileCatalogDigest",
  "captureToolId",
  "captureToolVersion",
  "colorProfile",
  "artifactCount",
  "capturedAtUtc",
  "approvedBy",
  "approvedAtUtc",
  "decisionDigest",
];
const baselineDecisionDigest = (recordValue: JsonRecord): string =>
  createHash("sha256")
    .update(
      `fluyo:r4b:baseline-approval:v1\n${JSON.stringify(withoutField(recordValue, "decisionDigest"))}`,
    )
    .digest("hex");
type ResolvedBaseline = {
  approval: JsonRecord;
  approvalCommit: string;
  approvalPath: string;
  blob: ResolvedGitBlob;
  workflow: ResolvedGitBlob;
  run: ResolvedWorkflowRun;
  artifact: ResolvedWorkflowArtifact;
  inventory: Map<string, JsonRecord>;
};
const baselineInventoryFields = ["schemaVersion", "baselineSetId", "entries"];
const baselineInventoryEntryFields = [
  "ordinal",
  "physicalKey",
  "cellDigest",
  "captureProfileDigest",
  "artifactHash",
  "artifactByteSize",
  "captureSourceCommit",
  "captureRunId",
  "captureRunAttempt",
  "capturedAtUtc",
  "captureToolId",
  "captureToolVersion",
  "colorProfile",
];
const baselineInventoryDigest = (entries: JsonRecord[]): string =>
  createHash("sha256")
    .update(`fluyo:r4b:baseline-inventory:v1\n${JSON.stringify(entries)}`)
    .digest("hex");
const resolveBaseline = (
  resolver: EvidenceResolver,
  locators: EvidenceLocators,
): ResolvedBaseline | undefined => {
  const approvalCommit = stableResolvedCommit(resolver, locators.baselineApprovalCommit);
  if (
    !approvalCommit?.reachableFromTrustedMain ||
    !resolver.isAncestor(locators.baselineApprovalCommit, locators.sourceCommit)
  )
    return undefined;
  const path = `docs/r4b-baselines/${locators.baselineSetId}.json`;
  const blob = stableResolvedBlob(resolver, locators.baselineApprovalCommit, path);
  if (!blob) return undefined;
  const parsed = parseCanonicalJsonBytes(blob.bytes);
  if (!exactObjectKeys(parsed, baselineApprovalFields)) return undefined;
  const approval = record(parsed);
  if (
    approval.schemaVersion !== 1 ||
    approval.baselineSetId !== locators.baselineSetId ||
    !/^[0-9a-f]{40}$/.test(String(approval.captureSourceCommit)) ||
    !/^[1-9][0-9]{0,19}$/.test(String(approval.captureRunId)) ||
    !Number.isSafeInteger(approval.captureRunAttempt) ||
    Number(approval.captureRunAttempt) <= 0 ||
    approval.captureArtifactId !== "approved-baseline-bundle.json" ||
    !/^[0-9a-f]{64}$/.test(String(approval.captureArtifactHash)) ||
    !Number.isSafeInteger(approval.captureArtifactByteSize) ||
    Number(approval.captureArtifactByteSize) <= 0 ||
    !/^[0-9a-f]{64}$/.test(String(approval.inventoryDigest)) ||
    approval.cellCatalogDigest !==
      createHash("sha256").update(JSON.stringify(closedCellRecords())).digest("hex") ||
    approval.captureProfileCatalogDigest !==
      createHash("sha256").update(JSON.stringify(closedCaptureProfiles())).digest("hex") ||
    approval.captureToolId !== "r4b_chromium_capture_v1" ||
    approval.captureToolVersion !== "1.0.0" ||
    approval.colorProfile !== "srgb" ||
    approval.artifactCount !== 10_800 ||
    !canonicalUtc(String(approval.capturedAtUtc)) ||
    approval.approvedBy !== "Daniela Vargas" ||
    !canonicalUtc(String(approval.approvedAtUtc)) ||
    Date.parse(String(approval.capturedAtUtc)) > Date.parse(String(approval.approvedAtUtc)) ||
    approval.decisionDigest !== baselineDecisionDigest(approval)
  )
    return undefined;
  const run = stableResolvedRun(
    resolver,
    r4bWorkflowPath,
    String(approval.captureRunId),
    Number(approval.captureRunAttempt),
  );
  const baselineWorkflow = stableResolvedBlob(
    resolver,
    String(approval.captureSourceCommit),
    r4bWorkflowPath,
  );
  if (
    !baselineWorkflow ||
    !resolvedRunValid(run, String(approval.captureSourceCommit), baselineWorkflow)
  )
    return undefined;
  const artifact = stableResolvedArtifact(
    resolver,
    run.runId,
    run.runAttempt,
    String(approval.captureArtifactId),
  );
  if (
    !artifact ||
    artifact.repository !== r4bRepository ||
    artifact.runId !== run.runId ||
    artifact.runAttempt !== run.runAttempt ||
    artifact.artifactId !== approval.captureArtifactId ||
    artifact.immutable !== true ||
    artifact.sha256 !== approval.captureArtifactHash ||
    artifact.byteSize !== approval.captureArtifactByteSize ||
    artifact.createdAtUtc !== approval.capturedAtUtc ||
    Date.parse(run.completedAtUtc) > Date.parse(String(approval.approvedAtUtc)) ||
    Date.parse(String(approval.approvedAtUtc)) > Date.parse(run.startedAtUtc) + 7 * 86400_000
  )
    return undefined;
  const inventoryBytes = readResolvedArtifactBytes(artifact, 32 * 1024 * 1024);
  const inventoryParsed = inventoryBytes ? parseCanonicalJsonBytes(inventoryBytes) : undefined;
  if (!exactObjectKeys(inventoryParsed, baselineInventoryFields)) return undefined;
  const inventoryRecord = record(inventoryParsed);
  const entries = records(inventoryRecord.entries);
  const expectedKeys = closedArtifactKeys().filter((key) => key.endsWith("/baseline.png"));
  if (
    inventoryRecord.schemaVersion !== 1 ||
    inventoryRecord.baselineSetId !== locators.baselineSetId ||
    entries.length !== expectedKeys.length ||
    baselineInventoryDigest(entries) !== approval.inventoryDigest
  )
    return undefined;
  const inventory = new Map<string, JsonRecord>();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    const physicalKey = expectedKeys[index]!;
    const cell = cellForPhysicalKey(physicalKey);
    if (
      !cell ||
      !exactObjectKeys(entry, baselineInventoryEntryFields) ||
      entry.ordinal !== index + 1 ||
      entry.physicalKey !== physicalKey ||
      entry.cellDigest !== cellDigest(cell) ||
      entry.captureProfileDigest !== valueDigest(expectedCaptureProfile(cell)) ||
      !/^[0-9a-f]{64}$/.test(String(entry.artifactHash)) ||
      !Number.isSafeInteger(entry.artifactByteSize) ||
      Number(entry.artifactByteSize) <= 0 ||
      entry.captureSourceCommit !== approval.captureSourceCommit ||
      entry.captureRunId !== run.runId ||
      entry.captureRunAttempt !== run.runAttempt ||
      entry.capturedAtUtc !== approval.capturedAtUtc ||
      entry.captureToolId !== approval.captureToolId ||
      entry.captureToolVersion !== approval.captureToolVersion ||
      entry.colorProfile !== approval.colorProfile
    )
      return undefined;
    inventory.set(physicalKey, entry);
  }
  return {
    approval,
    approvalCommit: locators.baselineApprovalCommit,
    approvalPath: path,
    blob,
    workflow: baselineWorkflow,
    run,
    artifact,
    inventory,
  };
};

const reviewRecordFields = [
  "schemaVersion",
  "sourceCommit",
  "workflowRunId",
  "runAttempt",
  "completeResultsArtifactHash",
  "transitionEvidenceArtifactHash",
  "transitionEvidenceArtifactByteSize",
  "transitionEvidenceValidationDigest",
  "representativeBundleArtifactHash",
  "baselineApprovalCommit",
  "baselineBlobDigest",
  "rawArtifactInventory",
  "rawArtifactInventoryDigest",
  "artifactSetDigest",
  "reviewerAttestationId",
  "reviewerAttestationDigest",
  "completedAtUtc",
  "verdict",
];
const rawArtifactTargetFields = [
  "artifactId",
  "artifactDigest",
  "artifactByteSize",
  "memberInventoryDigest",
  "logicalMemberCount",
];
const rawArtifactInventoryFields = [
  "schemaVersion",
  "sourceCommit",
  "captureRunId",
  "captureRunAttempt",
  "targets",
];
const artifactAbsenceFields = [
  "provider",
  "repository",
  "attestationId",
  "sourceCommit",
  "captureRunId",
  "captureRunAttempt",
  "targetInventoryDigest",
  "targetCount",
  "logicalMemberCount",
  "targetArtifactIds",
  "targetArtifactDigests",
  "absent",
  "verifiedAtUtc",
  "providerDigest",
];
const rawArtifactInventoryDigest = (inventory: JsonRecord): string =>
  createHash("sha256")
    .update(`fluyo:r4b:raw-artifact-inventory:v2\n${JSON.stringify(inventory)}`)
    .digest("hex");

const rawBundleHeaderFields = [
  "schemaVersion",
  "recordType",
  "sourceCommit",
  "workflowRunId",
  "runAttempt",
  "bundleArtifactId",
  "bundleTargetDigest",
  "logicalMemberCount",
];
const rawBundleMemberFields = [
  "schemaVersion",
  "recordType",
  "ordinal",
  "physicalKey",
  "cellDigest",
  "artifactId",
  "artifactHash",
  "artifactByteSize",
  "rawPayloadBase64",
  "bundleArtifactId",
  "bundleTargetDigest",
  "sourceCommit",
  "workflowRunId",
  "runAttempt",
];
const rawBundleFooterFields = [
  "schemaVersion",
  "recordType",
  "bundleArtifactId",
  "bundleTargetDigest",
  "logicalMemberCount",
];
const rawBundleKeys = (bundleArtifactId: string): string[] =>
  closedArtifactKeys().filter((physicalKey) =>
    bundleArtifactId === rawPngCaptureBundleArtifactId
      ? physicalKey.endsWith(".png")
      : bundleArtifactId === rawStructuredBundleArtifactId && !physicalKey.endsWith(".png"),
  );
const rawBundleMemberAuthorityDigest = (
  sourceCommit: string,
  run: ResolvedWorkflowRun,
  bundleArtifactId: string,
  members: JsonRecord[],
): string => {
  const digest = createHash("sha256").update(
    `fluyo:r4b:raw-bundle-member-inventory:v1\n${sourceCommit}\n${run.runId}\n${run.runAttempt}\n${bundleArtifactId}\n`,
  );
  for (const member of members) digest.update(JSON.stringify(member)).update("\n");
  return digest.digest("hex");
};
const decodeCanonicalBase64 = (value: unknown, maximumBytes: number): Buffer | undefined => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  )
    return undefined;
  const bytes = Buffer.from(value, "base64");
  return bytes.length > 0 && bytes.length <= maximumBytes && bytes.toString("base64") === value
    ? bytes
    : undefined;
};
type RawBundleValidation = {
  artifactId: string;
  artifactDigest: string;
  artifactByteSize: number;
  memberInventoryDigest: string;
  logicalMemberCount: number;
};
const validateRawBundle = (
  artifact: ResolvedWorkflowArtifact,
  sourceCommit: string,
  run: ResolvedWorkflowRun,
  complete: CompleteResultsValidation,
  representativePayloads: Map<string, Buffer>,
): RawBundleValidation | undefined => {
  if (
    ![rawPngCaptureBundleArtifactId, rawStructuredBundleArtifactId].includes(artifact.artifactId) ||
    artifact.repository !== r4bRepository ||
    artifact.runId !== run.runId ||
    artifact.runAttempt !== run.runAttempt ||
    artifact.immutable !== true ||
    !canonicalUtc(artifact.createdAtUtc) ||
    Date.parse(artifact.createdAtUtc) < Date.parse(run.startedAtUtc) ||
    Date.parse(artifact.createdAtUtc) > Date.parse(run.completedAtUtc) ||
    !Number.isSafeInteger(artifact.byteSize) ||
    artifact.byteSize <= 0 ||
    artifact.byteSize > rawBundleMaximumBytes ||
    !/^[0-9a-f]{64}$/.test(artifact.sha256)
  )
    return undefined;
  const expectedKeys = rawBundleKeys(artifact.artifactId);
  const expectedMembers = expectedKeys.map((physicalKey) =>
    record(complete.rawMemberAuthority.get(physicalKey)),
  );
  if (expectedMembers.some((member) => Object.keys(member).length === 0)) return undefined;
  const expectedTargetDigest = rawBundleMemberAuthorityDigest(
    sourceCommit,
    run,
    artifact.artifactId,
    expectedMembers,
  );
  let payloadBytes = 0;
  let lineIndex = 0;
  let footer: JsonRecord | undefined;
  const consumeLine = (rawLine: string): boolean => {
    if (!rawLine) return false;
    const parsed = parseCanonicalJsonBytes(Buffer.from(`${rawLine}\n`));
    if (!parsed || canonicalJsonBytes(parsed).toString("utf8") !== `${rawLine}\n`) return false;
    if (lineIndex === 0) {
      if (!exactObjectKeys(parsed, rawBundleHeaderFields)) return false;
      const header = record(parsed);
      if (
        header.schemaVersion !== 1 ||
        header.recordType !== "header" ||
        header.sourceCommit !== sourceCommit ||
        header.workflowRunId !== run.runId ||
        header.runAttempt !== run.runAttempt ||
        header.bundleArtifactId !== artifact.artifactId ||
        header.bundleTargetDigest !== expectedTargetDigest ||
        header.logicalMemberCount !== expectedKeys.length
      )
        return false;
    } else if (lineIndex <= expectedKeys.length) {
      if (!exactObjectKeys(parsed, rawBundleMemberFields)) return false;
      const member = record(parsed);
      const expected = expectedMembers[lineIndex - 1]!;
      const payload = decodeCanonicalBase64(member.rawPayloadBase64, rawMemberMaximumBytes);
      if (!payload) return false;
      payloadBytes += payload.length;
      if (payloadBytes > rawBundlePayloadMaximumBytes) return false;
      const representativePayload = representativePayloads.get(String(expected.physicalKey));
      if (
        member.schemaVersion !== 1 ||
        member.recordType !== "member" ||
        member.ordinal !== lineIndex ||
        member.physicalKey !== expected.physicalKey ||
        member.cellDigest !== expected.cellDigest ||
        member.artifactId !== expected.artifactId ||
        member.artifactHash !== expected.artifactHash ||
        member.artifactByteSize !== expected.artifactByteSize ||
        payload.length !== expected.artifactByteSize ||
        bufferDigest(payload) !== expected.artifactHash ||
        (representativePayload !== undefined && !payload.equals(representativePayload)) ||
        member.bundleArtifactId !== artifact.artifactId ||
        member.bundleTargetDigest !== expectedTargetDigest ||
        member.sourceCommit !== sourceCommit ||
        member.workflowRunId !== run.runId ||
        member.runAttempt !== run.runAttempt
      )
        return false;
    } else if (lineIndex === expectedKeys.length + 1) {
      if (!exactObjectKeys(parsed, rawBundleFooterFields)) return false;
      footer = record(parsed);
    } else return false;
    lineIndex += 1;
    return true;
  };
  if (
    !validateBoundedCanonicalJsonlStream(
      artifact,
      rawBundleMaximumBytes,
      rawBundleMaximumLineBytes,
      consumeLine,
    )
  )
    return undefined;
  if (
    lineIndex !== expectedKeys.length + 2 ||
    !footer ||
    footer.schemaVersion !== 1 ||
    footer.recordType !== "footer" ||
    footer.bundleArtifactId !== artifact.artifactId ||
    footer.bundleTargetDigest !== expectedTargetDigest ||
    footer.logicalMemberCount !== expectedKeys.length
  )
    return undefined;
  return {
    artifactId: artifact.artifactId,
    artifactDigest: artifact.sha256,
    artifactByteSize: artifact.byteSize,
    memberInventoryDigest: expectedTargetDigest,
    logicalMemberCount: expectedKeys.length,
  };
};
const rawArtifactInventoryFixture = (
  sourceCommit: string,
  run: ResolvedWorkflowRun,
  artifacts: {
    artifactId: string;
    artifactDigest: string;
    artifactByteSize: number;
    memberInventoryDigest: string;
  }[],
): JsonRecord => ({
  schemaVersion: 1,
  sourceCommit,
  captureRunId: run.runId,
  captureRunAttempt: run.runAttempt,
  targets: artifacts.map((artifact, index) => ({
    ...artifact,
    logicalMemberCount: rawArtifactLogicalMemberCounts[index],
  })),
});
const validRawArtifactInventory = (
  value: unknown,
  sourceCommit: string,
  captureRunId: string,
  captureRunAttempt: number,
  representativeDigest: string,
): { inventory: JsonRecord; targets: JsonRecord[]; digest: string } | undefined => {
  if (!exactObjectKeys(value, rawArtifactInventoryFields)) return undefined;
  const inventory = record(value);
  const targets = records(inventory.targets);
  if (
    inventory.schemaVersion !== 1 ||
    inventory.sourceCommit !== sourceCommit ||
    inventory.captureRunId !== captureRunId ||
    inventory.captureRunAttempt !== captureRunAttempt ||
    targets.length !== rawArtifactTargetIds.length
  )
    return undefined;
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index]!;
    if (
      !exactObjectKeys(target, rawArtifactTargetFields) ||
      target.artifactId !== rawArtifactTargetIds[index] ||
      !/^[0-9a-f]{64}$/.test(String(target.artifactDigest)) ||
      !Number.isSafeInteger(target.artifactByteSize) ||
      Number(target.artifactByteSize) <= 0 ||
      !/^[0-9a-f]{64}$/.test(String(target.memberInventoryDigest)) ||
      target.logicalMemberCount !== rawArtifactLogicalMemberCounts[index]
    )
      return undefined;
  }
  if (
    targets.reduce((sum, target) => sum + Number(target.logicalMemberCount), 0) !== 86_400 ||
    targets[2]!.artifactDigest !== representativeDigest
  )
    return undefined;
  return { inventory, targets, digest: rawArtifactInventoryDigest(inventory) };
};
const cleanupRecordFields = [
  "schemaVersion",
  "sourceCommit",
  "reviewCommit",
  "reviewBlobObjectId",
  "artifactSetDigest",
  "cleanupRunId",
  "cleanupRunAttempt",
  "cleanupArtifactId",
  "cleanupArtifactHash",
  "durableArtifactIds",
  "durableArtifactDigests",
  "retainedDurableArtifactCount",
  "rawArtifactInventory",
  "rawArtifactInventoryDigest",
  "rawArtifactTargetCount",
  "rawArtifactLogicalMemberCount",
  "rawArtifactTargetIds",
  "rawArtifactTargetDigests",
  "absenceAttestationId",
  "absenceAttestationDigest",
  "deletedArtifactCount",
  "retainedArtifactCount",
  "outcome",
  "retryState",
  "failureCode",
  "completedAtUtc",
];
const cleanupProofFields = cleanupRecordFields.filter((field) => field !== "cleanupArtifactHash");
const readResolvedArtifactBytes = (
  artifact: ResolvedWorkflowArtifact,
  maximumBytes = 2 * 1024 * 1024,
): Buffer | undefined => {
  const chunks: Buffer[] = [];
  let total = 0;
  const digest = createHash("sha256");
  for (const chunk of artifact.stream()) {
    total += chunk.length;
    if (total > maximumBytes || total > artifact.byteSize) return undefined;
    chunks.push(chunk);
    digest.update(chunk);
  }
  if (total !== artifact.byteSize || digest.digest("hex") !== artifact.sha256) return undefined;
  return Buffer.concat(chunks);
};
type TransitionEvidenceValidation = {
  artifactHash: string;
  artifactByteSize: number;
  validationDigest: string;
};
const validateTransitionEvidenceArtifact = (
  artifact: ResolvedWorkflowArtifact,
  sourceCommit: string,
  run: ResolvedWorkflowRun,
): TransitionEvidenceValidation | undefined => {
  if (
    artifact.repository !== r4bRepository ||
    artifact.runId !== run.runId ||
    artifact.runAttempt !== run.runAttempt ||
    artifact.artifactId !== transitionEvidenceArtifactId ||
    artifact.immutable !== true ||
    !Number.isSafeInteger(artifact.byteSize) ||
    artifact.byteSize <= 0 ||
    artifact.byteSize > 256 * 1024 ||
    !canonicalUtc(artifact.createdAtUtc) ||
    Date.parse(artifact.createdAtUtc) < Date.parse(run.startedAtUtc) ||
    Date.parse(artifact.createdAtUtc) > Date.parse(run.completedAtUtc)
  )
    return undefined;
  const bytes = readResolvedArtifactBytes(artifact, 256 * 1024);
  const parsed = bytes ? parseCanonicalJsonBytes(bytes) : undefined;
  if (!bytes || !exactObjectKeys(parsed, transitionEvidenceArtifactFields)) return undefined;
  const payload = record(parsed);
  const expected = transitionEvidencePayload(sourceCommit, run.runId, run.runAttempt);
  const text = bytes.toString("utf8");
  if (
    JSON.stringify(payload) !== JSON.stringify(expected) ||
    payload.validationDigest !== transitionEvidenceValidationDigest(payload) ||
    /(?:https?:\/\/|www\.|mailto:|[A-Za-z]:\\|\\\\|\btoken\b|\bsecret\b|\bcredential\b|\bsession[_-]?id\b|\buser[_-]?id\b|\baccount[_-]?id\b)/iu.test(
      text,
    )
  )
    return undefined;
  return {
    artifactHash: artifact.sha256,
    artifactByteSize: artifact.byteSize,
    validationDigest: String(payload.validationDigest),
  };
};
type ResolvedEvidenceValidation = {
  stage: "PRE_CLEANUP" | "FINALIZED";
  artifactSetDigest: string;
  artifactCount: number;
  rawArtifactInventory?: JsonRecord;
  rawArtifactInventoryDigest?: string;
  transitionEvidence?: TransitionEvidenceValidation;
};
const validateResolvedEvidence = (
  locatorsValue: unknown,
  resolver: EvidenceResolver,
): ResolvedEvidenceValidation | undefined => {
  if (!validEvidenceLocators(locatorsValue)) return undefined;
  const locators = locatorsValue;
  const source = stableResolvedCommit(resolver, locators.sourceCommit);
  if (!source?.reachableFromTrustedMain) return undefined;
  const workflow = stableResolvedBlob(resolver, locators.sourceCommit, r4bWorkflowPath);
  if (!workflow) return undefined;
  const baseline = resolveBaseline(resolver, locators);
  if (!baseline) return undefined;
  if (locators.phase === "PRE_CLEANUP") {
    const run = stableResolvedRun(
      resolver,
      r4bWorkflowPath,
      locators.captureRunId,
      locators.captureRunAttempt,
    );
    if (!resolvedRunValid(run, locators.sourceCommit, workflow)) return undefined;
    if (Date.parse(String(baseline.approval.approvedAtUtc)) > Date.parse(run.startedAtUtc))
      return undefined;
    const completeArtifact = stableResolvedArtifact(
      resolver,
      run.runId,
      run.runAttempt,
      locators.completeResultsArtifactId,
    );
    const transitionArtifact = stableResolvedArtifact(
      resolver,
      run.runId,
      run.runAttempt,
      locators.transitionEvidenceArtifactId,
    );
    const representativeArtifact = stableResolvedArtifact(
      resolver,
      run.runId,
      run.runAttempt,
      locators.representativeBundleArtifactId,
    );
    const rawPngArtifact = stableResolvedArtifact(
      resolver,
      run.runId,
      run.runAttempt,
      rawPngCaptureBundleArtifactId,
    );
    const rawStructuredArtifact = stableResolvedArtifact(
      resolver,
      run.runId,
      run.runAttempt,
      rawStructuredBundleArtifactId,
    );
    if (
      !completeArtifact ||
      !transitionArtifact ||
      !representativeArtifact ||
      !rawPngArtifact ||
      !rawStructuredArtifact
    )
      return undefined;
    const representativeKeys = new Set(representativeSemanticKeys());
    const complete = validateCompleteResults(
      completeArtifact,
      locators.sourceCommit,
      run,
      representativeKeys,
    );
    if (!complete) return undefined;
    const transitionEvidence = validateTransitionEvidenceArtifact(
      transitionArtifact,
      locators.sourceCommit,
      run,
    );
    if (!transitionEvidence) return undefined;
    const representative = validateRepresentativeBundle(
      representativeArtifact,
      locators.sourceCommit,
      run,
      complete,
      baseline,
    );
    if (!representative) return undefined;
    const rawPng = validateRawBundle(
      rawPngArtifact,
      locators.sourceCommit,
      run,
      complete,
      representative.rawPayloads,
    );
    const rawStructured = validateRawBundle(
      rawStructuredArtifact,
      locators.sourceCommit,
      run,
      complete,
      representative.rawPayloads,
    );
    if (!rawPng || !rawStructured) return undefined;
    const rawArtifactInventory = rawArtifactInventoryFixture(locators.sourceCommit, run, [
      rawPng,
      rawStructured,
      {
        artifactId: representativeBundleArtifactId,
        artifactDigest: representativeArtifact.sha256,
        artifactByteSize: representativeArtifact.byteSize,
        memberInventoryDigest: representative.digest,
      },
    ]);
    const rawInventory = validRawArtifactInventory(
      rawArtifactInventory,
      locators.sourceCommit,
      run.runId,
      run.runAttempt,
      representativeArtifact.sha256,
    );
    if (!rawInventory) return undefined;
    const artifactSetDigest = createHash("sha256")
      .update(
        `fluyo:r4b:resolved-artifact-set:v4\n${locators.sourceCommit}\n${workflow.objectId}\n${run.runId}\n${run.runAttempt}\n${complete.artifactSha256}\n${complete.orderedResultDigest}\n${transitionEvidence.artifactHash}\n${transitionEvidence.artifactByteSize}\n${transitionEvidence.validationDigest}\n${representativeArtifact.sha256}\n${representative.digest}\n${baseline.blob.sha256}\n${baseline.artifact.sha256}\n${rawInventory.digest}`,
      )
      .digest("hex");
    return {
      stage: "PRE_CLEANUP",
      artifactSetDigest,
      artifactCount: complete.artifactCount,
      rawArtifactInventory: rawInventory.inventory,
      rawArtifactInventoryDigest: rawInventory.digest,
      transitionEvidence,
    };
  }
  const reviewCommitSha = locators.reviewCommit;
  const cleanupCommitSha = locators.cleanupCommit;
  const cleanupRunId = locators.cleanupRunId;
  const cleanupRunAttempt = locators.cleanupRunAttempt;
  if (
    reviewCommitSha === null ||
    cleanupCommitSha === null ||
    cleanupRunId === null ||
    cleanupRunAttempt === null
  )
    return undefined;
  const reviewCommit = stableResolvedCommit(resolver, reviewCommitSha);
  const reviewPath = `evidence/r4b/${locators.captureRunId}/review.json`;
  if (
    !reviewCommit ||
    reviewCommit.parents.length !== 1 ||
    reviewCommit.parents[0] !== locators.sourceCommit ||
    JSON.stringify(reviewCommit.changedPaths) !== JSON.stringify([reviewPath])
  )
    return undefined;
  const reviewBlob = stableResolvedBlob(resolver, reviewCommitSha, reviewPath);
  if (!reviewBlob) return undefined;
  const reviewParsed = parseCanonicalJsonBytes(reviewBlob.bytes);
  if (!exactObjectKeys(reviewParsed, reviewRecordFields)) return undefined;
  const review = record(reviewParsed);
  if (
    review.schemaVersion !== 1 ||
    review.sourceCommit !== locators.sourceCommit ||
    review.workflowRunId !== locators.captureRunId ||
    review.runAttempt !== locators.captureRunAttempt ||
    ![
      review.completeResultsArtifactHash,
      review.transitionEvidenceArtifactHash,
      review.transitionEvidenceValidationDigest,
      review.representativeBundleArtifactHash,
      review.baselineBlobDigest,
      review.rawArtifactInventoryDigest,
      review.artifactSetDigest,
    ].every((value) => /^[0-9a-f]{64}$/.test(String(value))) ||
    !Number.isSafeInteger(review.transitionEvidenceArtifactByteSize) ||
    Number(review.transitionEvidenceArtifactByteSize) <= 0 ||
    Number(review.transitionEvidenceArtifactByteSize) > 256 * 1024 ||
    review.baselineApprovalCommit !== locators.baselineApprovalCommit ||
    review.baselineBlobDigest !== baseline.blob.sha256 ||
    typeof review.reviewerAttestationId !== "string" ||
    !/^[a-z0-9][a-z0-9_-]{0,127}$/.test(review.reviewerAttestationId) ||
    !/^[0-9a-f]{64}$/.test(String(review.reviewerAttestationDigest)) ||
    !canonicalUtc(String(review.completedAtUtc)) ||
    review.verdict !== "PASS"
  )
    return undefined;
  const reviewerAttestation = stableReviewerAttestation(
    resolver,
    String(review.reviewerAttestationId),
  );
  if (
    !reviewerAttestation ||
    reviewerAttestation.provider !== "github_protected_environment" ||
    reviewerAttestation.repository !== r4bRepository ||
    reviewerAttestation.sourceCommit !== locators.sourceCommit ||
    reviewerAttestation.workflowRunId !== locators.captureRunId ||
    reviewerAttestation.runAttempt !== locators.captureRunAttempt ||
    reviewerAttestation.artifactSetDigest !== review.artifactSetDigest ||
    reviewerAttestation.rawArtifactInventoryDigest !== review.rawArtifactInventoryDigest ||
    reviewerAttestation.transitionEvidenceHash !== review.transitionEvidenceArtifactHash ||
    reviewerAttestation.transitionEvidenceValidationDigest !==
      review.transitionEvidenceValidationDigest ||
    reviewerAttestation.verdict !== "PASS" ||
    reviewerAttestation.subjectId !== "elana_castillo_quality" ||
    reviewerAttestation.displayName !== "Elana Castillo" ||
    reviewerAttestation.role !== "sole_independent_exact_head_QA" ||
    reviewerAttestation.completedAtUtc !== review.completedAtUtc ||
    reviewerAttestation.providerDigest !==
      providerRecordDigest("fluyo:r4b:reviewer-attestation:v1", record(reviewerAttestation)) ||
    reviewerAttestation.providerDigest !== review.reviewerAttestationDigest
  )
    return undefined;
  const captureRun = stableResolvedRun(
    resolver,
    r4bWorkflowPath,
    locators.captureRunId,
    locators.captureRunAttempt,
  );
  if (
    !resolvedRunValid(captureRun, locators.sourceCommit, workflow) ||
    Date.parse(String(review.completedAtUtc)) <= Date.parse(captureRun.completedAtUtc)
  )
    return undefined;
  const durableTransitionArtifact = stableResolvedArtifact(
    resolver,
    locators.captureRunId,
    locators.captureRunAttempt,
    transitionEvidenceArtifactId,
  );
  const durableTransitionEvidence = durableTransitionArtifact
    ? validateTransitionEvidenceArtifact(
        durableTransitionArtifact,
        locators.sourceCommit,
        captureRun,
      )
    : undefined;
  if (
    !durableTransitionEvidence ||
    durableTransitionEvidence.artifactHash !== review.transitionEvidenceArtifactHash ||
    durableTransitionEvidence.artifactByteSize !== review.transitionEvidenceArtifactByteSize ||
    durableTransitionEvidence.validationDigest !== review.transitionEvidenceValidationDigest
  )
    return undefined;
  const reviewedRawInventory = validRawArtifactInventory(
    review.rawArtifactInventory,
    locators.sourceCommit,
    locators.captureRunId,
    locators.captureRunAttempt,
    String(review.representativeBundleArtifactHash),
  );
  if (!reviewedRawInventory || reviewedRawInventory.digest !== review.rawArtifactInventoryDigest)
    return undefined;
  const durableCompleteResults = stableResolvedArtifact(
    resolver,
    locators.captureRunId,
    locators.captureRunAttempt,
    completeResultsArtifactId,
  );
  if (
    !durableCompleteResults ||
    durableCompleteResults.repository !== r4bRepository ||
    durableCompleteResults.artifactId !== completeResultsArtifactId ||
    durableCompleteResults.immutable !== true ||
    durableCompleteResults.sha256 !== review.completeResultsArtifactHash ||
    !Number.isSafeInteger(durableCompleteResults.byteSize) ||
    durableCompleteResults.byteSize <= 0 ||
    !canonicalUtc(durableCompleteResults.createdAtUtc) ||
    Date.parse(durableCompleteResults.createdAtUtc) < Date.parse(captureRun.startedAtUtc) ||
    Date.parse(durableCompleteResults.createdAtUtc) > Date.parse(captureRun.completedAtUtc)
  )
    return undefined;
  const cleanupCommit = stableResolvedCommit(resolver, cleanupCommitSha);
  const cleanupPath = `evidence/r4b/${locators.captureRunId}/cleanup.json`;
  if (
    !cleanupCommit ||
    cleanupCommit.parents.length !== 1 ||
    cleanupCommit.parents[0] !== reviewCommitSha ||
    JSON.stringify(cleanupCommit.changedPaths) !== JSON.stringify([cleanupPath])
  )
    return undefined;
  const cleanupBlob = stableResolvedBlob(resolver, cleanupCommitSha, cleanupPath);
  if (!cleanupBlob) return undefined;
  const cleanupRun = stableResolvedRun(resolver, r4bWorkflowPath, cleanupRunId, cleanupRunAttempt);
  const cleanupWorkflow = stableResolvedBlob(resolver, reviewCommitSha, r4bWorkflowPath);
  if (!cleanupWorkflow || !resolvedRunValid(cleanupRun, reviewCommitSha, cleanupWorkflow))
    return undefined;
  const cleanupArtifact = stableResolvedArtifact(
    resolver,
    cleanupRun.runId,
    cleanupRun.runAttempt,
    String(locators.cleanupArtifactId),
  );
  if (
    !cleanupArtifact ||
    cleanupArtifact.repository !== r4bRepository ||
    cleanupArtifact.runId !== cleanupRun.runId ||
    cleanupArtifact.runAttempt !== cleanupRun.runAttempt ||
    cleanupArtifact.artifactId !== cleanupArtifactId ||
    cleanupArtifact.immutable !== true ||
    !canonicalUtc(cleanupArtifact.createdAtUtc) ||
    Date.parse(cleanupArtifact.createdAtUtc) < Date.parse(cleanupRun.startedAtUtc) ||
    Date.parse(cleanupArtifact.createdAtUtc) > Date.parse(cleanupRun.completedAtUtc)
  )
    return undefined;
  const cleanupArtifactBytes = readResolvedArtifactBytes(cleanupArtifact);
  if (!cleanupArtifactBytes) return undefined;
  const cleanupArtifactParsed = parseCanonicalJsonBytes(cleanupArtifactBytes);
  const cleanupBlobParsed = parseCanonicalJsonBytes(cleanupBlob.bytes);
  if (
    !exactObjectKeys(cleanupArtifactParsed, cleanupProofFields) ||
    !exactObjectKeys(cleanupBlobParsed, cleanupRecordFields) ||
    cleanupProofFields.some(
      (field) =>
        JSON.stringify(record(cleanupArtifactParsed)[field]) !==
        JSON.stringify(record(cleanupBlobParsed)[field]),
    )
  )
    return undefined;
  const cleanup = record(cleanupBlobParsed);
  if (
    cleanup.schemaVersion !== 1 ||
    cleanup.sourceCommit !== locators.sourceCommit ||
    cleanup.reviewCommit !== locators.reviewCommit ||
    cleanup.reviewBlobObjectId !== reviewBlob.objectId ||
    cleanup.artifactSetDigest !== review.artifactSetDigest ||
    cleanup.cleanupRunId !== cleanupRun.runId ||
    cleanup.cleanupRunAttempt !== cleanupRun.runAttempt ||
    cleanup.cleanupArtifactId !== cleanupArtifactId ||
    cleanup.cleanupArtifactHash !== cleanupArtifact.sha256 ||
    JSON.stringify(cleanup.durableArtifactIds) !==
      JSON.stringify([completeResultsArtifactId, transitionEvidenceArtifactId]) ||
    JSON.stringify(cleanup.durableArtifactDigests) !==
      JSON.stringify([
        String(review.completeResultsArtifactHash),
        String(review.transitionEvidenceArtifactHash),
      ]) ||
    cleanup.retainedDurableArtifactCount !== 2 ||
    !/^[0-9a-f]{64}$/.test(String(cleanup.rawArtifactInventoryDigest)) ||
    typeof cleanup.absenceAttestationId !== "string" ||
    !/^[0-9a-f]{64}$/.test(String(cleanup.absenceAttestationDigest)) ||
    cleanup.deletedArtifactCount !== 86_400 ||
    cleanup.retainedArtifactCount !== 0 ||
    cleanup.outcome !== "DELETED" ||
    cleanup.retryState !== "NOT_REQUIRED" ||
    cleanup.failureCode !== null ||
    !canonicalUtc(String(cleanup.completedAtUtc)) ||
    Date.parse(String(cleanup.completedAtUtc)) <= Date.parse(String(review.completedAtUtc)) ||
    Date.parse(String(cleanup.completedAtUtc)) < Date.parse(cleanupRun.completedAtUtc)
  )
    return undefined;
  const rawInventory = validRawArtifactInventory(
    cleanup.rawArtifactInventory,
    locators.sourceCommit,
    locators.captureRunId,
    locators.captureRunAttempt,
    String(review.representativeBundleArtifactHash),
  );
  if (
    !rawInventory ||
    JSON.stringify(rawInventory.inventory) !== JSON.stringify(reviewedRawInventory.inventory) ||
    rawInventory.digest !== reviewedRawInventory.digest
  )
    return undefined;
  const expectedRawArtifactIds = rawInventory.targets.map((target) => String(target.artifactId));
  const expectedRawArtifactDigests = rawInventory.targets.map((target) =>
    String(target.artifactDigest),
  );
  const expectedRawLogicalMemberCount = rawInventory.targets.reduce(
    (sum, target) => sum + Number(target.logicalMemberCount),
    0,
  );
  if (
    cleanup.rawArtifactInventoryDigest !== rawInventory.digest ||
    cleanup.rawArtifactTargetCount !== rawInventory.targets.length ||
    cleanup.rawArtifactLogicalMemberCount !== expectedRawLogicalMemberCount ||
    JSON.stringify(cleanup.rawArtifactTargetIds) !== JSON.stringify(expectedRawArtifactIds) ||
    JSON.stringify(cleanup.rawArtifactTargetDigests) !== JSON.stringify(expectedRawArtifactDigests)
  )
    return undefined;
  const absence = stableArtifactAbsence(resolver, String(cleanup.absenceAttestationId));
  if (
    !absence ||
    !exactObjectKeys(absence, artifactAbsenceFields) ||
    absence.provider !== "github_artifact_retention_service" ||
    absence.repository !== r4bRepository ||
    absence.sourceCommit !== locators.sourceCommit ||
    absence.captureRunId !== locators.captureRunId ||
    absence.captureRunAttempt !== locators.captureRunAttempt ||
    absence.targetInventoryDigest !== rawInventory.digest ||
    absence.targetCount !== rawInventory.targets.length ||
    absence.logicalMemberCount !== expectedRawLogicalMemberCount ||
    JSON.stringify(absence.targetArtifactIds) !== JSON.stringify(expectedRawArtifactIds) ||
    JSON.stringify(absence.targetArtifactDigests) !== JSON.stringify(expectedRawArtifactDigests) ||
    JSON.stringify(absence.absent) !== JSON.stringify(expectedRawArtifactIds.map(() => true)) ||
    !canonicalUtc(absence.verifiedAtUtc) ||
    Date.parse(absence.verifiedAtUtc) < Date.parse(String(cleanup.completedAtUtc)) ||
    absence.providerDigest !==
      providerRecordDigest("fluyo:r4b:artifact-absence:v1", record(absence)) ||
    absence.providerDigest !== cleanup.absenceAttestationDigest ||
    expectedRawArtifactIds.some(
      (artifactId) =>
        stableResolvedArtifact(
          resolver,
          locators.captureRunId,
          locators.captureRunAttempt,
          artifactId,
        ) !== undefined,
    )
  )
    return undefined;
  return {
    stage: "FINALIZED",
    artifactSetDigest: String(review.artifactSetDigest),
    artifactCount: 86_400,
    transitionEvidence: durableTransitionEvidence,
  };
};

const gitFixture = (repositoryRoot: string, ...args: string[]): string =>
  execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const writeFixtureFile = (repositoryRoot: string, path: string, bytes: Buffer | string): void => {
  const absolute = join(repositoryRoot, ...path.split("/"));
  mkdirSync(resolve(absolute, ".."), { recursive: true });
  writeFileSync(absolute, bytes);
};
const fixtureCommit = (
  repositoryRoot: string,
  files: Record<string, Buffer | string>,
  message: string,
): string => {
  Object.entries(files).forEach(([path, bytes]) => writeFixtureFile(repositoryRoot, path, bytes));
  gitFixture(repositoryRoot, "add", "--", ...Object.keys(files));
  gitFixture(repositoryRoot, "commit", "-m", message);
  return gitFixture(repositoryRoot, "rev-parse", "HEAD");
};
const fixtureWorkflowBlob = (repositoryRoot: string, commit: string): ResolvedGitBlob => {
  const bytes = execFileSync("git", ["show", `${commit}:${r4bWorkflowPath}`], {
    cwd: repositoryRoot,
  });
  return {
    bytes,
    objectId: gitFixture(repositoryRoot, "rev-parse", `${commit}:${r4bWorkflowPath}`),
    sha256: bufferDigest(bytes),
  };
};
const fixtureRun = (
  repositoryRoot: string,
  headSha: string,
  runId: string,
  runAttempt: number,
  startedAtUtc: string,
  completedAtUtc: string,
): ResolvedWorkflowRun => {
  const workflow = fixtureWorkflowBlob(repositoryRoot, headSha);
  return {
    repository: r4bRepository,
    workflowPath: r4bWorkflowPath,
    workflowId: r4bWorkflowId,
    workflowBlobObjectId: workflow.objectId,
    workflowBlobDigest: workflow.sha256,
    runId,
    runAttempt,
    headSha,
    event: "workflow_dispatch",
    startedAtUtc,
    completedAtUtc,
    conclusion: "success",
    runner: "github-hosted-ubuntu-24.04",
  };
};
const completeResultsFactory = (
  sourceCommit: string,
  run: ResolvedWorkflowRun,
  overrides: Map<string, JsonRecord>,
  mutation?: { kind: "omit" | "duplicate" | "stale" | "extra"; ordinal: number },
): (() => Iterable<Buffer>) =>
  function* () {
    const keys = closedArtifactKeys();
    yield canonicalJsonBytes({
      schemaVersion: 1,
      recordType: "header",
      sourceCommit,
      workflowRunId: run.runId,
      runAttempt: run.runAttempt,
      artifactCount:
        keys.length + (mutation?.kind === "extra" ? 1 : mutation?.kind === "omit" ? -1 : 0),
    });
    const digest = createHash("sha256").update("fluyo:r4b:complete-results:v1\n");
    let emitted = 0;
    for (let index = 0; index < keys.length; index += 1) {
      const ordinal = index + 1;
      if (mutation?.kind === "omit" && mutation.ordinal === ordinal) continue;
      const key = keys[index]!;
      let result = completeResult(key, ordinal, sourceCommit, run, overrides.get(key));
      if (mutation?.kind === "stale" && mutation.ordinal === ordinal)
        result = completeResult(key, ordinal, "0".repeat(40), run, overrides.get(key));
      const copies = mutation?.kind === "duplicate" && mutation.ordinal === ordinal ? 2 : 1;
      for (let copy = 0; copy < copies; copy += 1) {
        yield canonicalJsonBytes(result);
        digest.update(String(result.resultDigest)).update("\n");
        emitted += 1;
      }
    }
    if (mutation?.kind === "extra") {
      const key = keys[keys.length - 1]!;
      const result = completeResult(key, keys.length + 1, sourceCommit, run);
      yield canonicalJsonBytes(result);
      digest.update(String(result.resultDigest)).update("\n");
      emitted += 1;
    }
    yield canonicalJsonBytes({
      schemaVersion: 1,
      recordType: "footer",
      artifactCount: emitted,
      orderedResultDigest: digest.digest("hex"),
    });
  };

const rawBundleFactory = (
  sourceCommit: string,
  run: ResolvedWorkflowRun,
  bundleArtifactId: typeof rawPngCaptureBundleArtifactId | typeof rawStructuredBundleArtifactId,
  overrides: Map<string, JsonRecord>,
  payloadOverrides: Map<string, Buffer>,
  mutation?: {
    kind:
      | "omit"
      | "duplicate"
      | "partition_mismatch"
      | "payload_missing"
      | "payload_changed"
      | "invalid_base64"
      | "hash_mismatch"
      | "size_mismatch"
      | "truncated"
      | "oversize";
    ordinal: number;
  },
): (() => Iterable<Buffer>) =>
  function* () {
    const allKeys = closedArtifactKeys();
    const ordinalByKey = new Map(allKeys.map((physicalKey, index) => [physicalKey, index + 1]));
    const keys = allKeys.filter((physicalKey) =>
      bundleArtifactId === rawPngCaptureBundleArtifactId
        ? physicalKey.endsWith(".png")
        : !physicalKey.endsWith(".png"),
    );
    const oppositeKey = allKeys.find((physicalKey) =>
      bundleArtifactId === rawPngCaptureBundleArtifactId
        ? !physicalKey.endsWith(".png")
        : physicalKey.endsWith(".png"),
    )!;
    const members = keys.flatMap((physicalKey, index) => {
      const ordinal = index + 1;
      if (mutation?.kind === "omit" && mutation.ordinal === ordinal) return [];
      const key =
        mutation?.kind === "partition_mismatch" && mutation.ordinal === ordinal
          ? oppositeKey
          : physicalKey;
      const result = completeResult(
        key,
        ordinalByKey.get(key)!,
        sourceCommit,
        run,
        overrides.get(key),
      );
      const authoritativePayload = payloadOverrides.get(key) ?? simulatedRawPayloadBytes(key);
      const payload =
        mutation?.kind === "payload_changed" && mutation.ordinal === ordinal
          ? (() => {
              const changed = Buffer.from(authoritativePayload);
              changed[0] = changed[0]! ^ 0xff;
              return changed;
            })()
          : mutation?.kind === "oversize" && mutation.ordinal === ordinal
            ? Buffer.alloc(rawMemberMaximumBytes + 1, 0x61)
            : authoritativePayload;
      const member = {
        authority: {
          physicalKey: key,
          cellDigest: result.cellDigest,
          artifactId: result.artifactId,
          artifactHash:
            mutation?.kind === "hash_mismatch" && mutation.ordinal === ordinal
              ? "0".repeat(64)
              : result.artifactHash,
          artifactByteSize:
            mutation?.kind === "size_mismatch" && mutation.ordinal === ordinal
              ? Number(result.artifactByteSize) + 1
              : result.artifactByteSize,
        },
        payloadBase64:
          mutation?.kind === "invalid_base64" && mutation.ordinal === ordinal
            ? "%%%="
            : payload.toString("base64"),
        omitPayload: mutation?.kind === "payload_missing" && mutation.ordinal === ordinal,
        truncate: mutation?.kind === "truncated" && mutation.ordinal === ordinal,
      };
      return mutation?.kind === "duplicate" && mutation.ordinal === ordinal
        ? [member, { ...member }]
        : [member];
    });
    const bundleTargetDigest = rawBundleMemberAuthorityDigest(
      sourceCommit,
      run,
      bundleArtifactId,
      members.map((member) => member.authority),
    );
    yield canonicalJsonBytes({
      schemaVersion: 1,
      recordType: "header",
      sourceCommit,
      workflowRunId: run.runId,
      runAttempt: run.runAttempt,
      bundleArtifactId,
      bundleTargetDigest,
      logicalMemberCount: members.length,
    });
    if (mutation && ["omit", "duplicate", "partition_mismatch"].includes(mutation.kind)) return;
    for (let index = 0; index < members.length; index += 1) {
      const member = members[index]!;
      const memberRecord = {
        schemaVersion: 1,
        recordType: "member",
        ordinal: index + 1,
        ...member.authority,
        ...(member.omitPayload ? {} : { rawPayloadBase64: member.payloadBase64 }),
        bundleArtifactId,
        bundleTargetDigest,
        sourceCommit,
        workflowRunId: run.runId,
        runAttempt: run.runAttempt,
      };
      const memberBytes = canonicalJsonBytes(memberRecord);
      yield member.truncate ? memberBytes.subarray(0, memberBytes.length - 2) : memberBytes;
      if (mutation && index + 1 >= mutation.ordinal) return;
    }
    yield canonicalJsonBytes({
      schemaVersion: 1,
      recordType: "footer",
      bundleArtifactId,
      bundleTargetDigest,
      logicalMemberCount: members.length,
    });
  };

const representativeFixture = (
  sourceCommit: string,
  run: ResolvedWorkflowRun,
  baseline: ResolvedBaseline,
): {
  bytes: Buffer;
  resultOverrides: Map<string, JsonRecord>;
  rawPayloads: Map<string, Buffer>;
} => {
  const keys = representativeSemanticKeys();
  const manifest = {
    sourceCommit,
    buildCommit: sourceCommit,
    capturedAtUtc: run.startedAtUtc,
    deleteByUtc: addUtcSeconds(run.completedAtUtc, 86400),
    nvdaVersion: "2026.1",
    captureProfiles: closedCaptureProfiles(),
  };
  const artifactBytes = syntheticArtifactBytesForKeys(keys, "2026.1");
  const baselineBytes = Object.fromEntries(
    keys
      .filter((key) => key.endsWith("/baseline.png"))
      .map((key) => {
        const provenance = resolvedBaselineProvenance(baseline, key);
        if (!provenance) throw new Error(`missing approved baseline provenance for ${key}`);
        return [key, canonicalJsonBytes(provenance)];
      }),
  );
  const captureBytes = syntheticCapturePayloadBytes(keys, artifactBytes, manifest, baselineBytes);
  const hashes = Object.fromEntries(keys.map((key) => [key, bufferDigest(artifactBytes[key]!)]));
  const scannerBytes = syntheticScannerResultBytes(keys, hashes, manifest, run.workflowBlobDigest);
  const resultOverrides = new Map<string, JsonRecord>();
  const entries = keys.map((key) => {
    const hash = String(hashes[key]);
    const evidence = scanEvidenceFor(
      key,
      hash,
      scannerBytes,
      scannerContext(manifest, key, hash, run.workflowBlobDigest),
    );
    const capturePayloadDigest = key.endsWith(".png")
      ? bufferDigest(captureBytes[key]!)
      : bufferDigest(Buffer.from("NOT_APPLICABLE"));
    resultOverrides.set(key, {
      artifactHash: hash,
      artifactByteSize: artifactBytes[key]!.length,
      capturePayloadDigest,
      scannerSetDigest: evidence.scannerEvidenceDigest,
      semanticDigest: evidence.semanticOutputDigest,
    });
    return {
      physicalKey: key,
      artifactBytesBase64: artifactBytes[key]!.toString("base64"),
      capturePayloadBytesBase64: key.endsWith(".png")
        ? captureBytes[key]!.toString("base64")
        : null,
      baselineProvenanceBytesBase64: key.endsWith("/baseline.png")
        ? baselineBytes[key]!.toString("base64")
        : null,
      scannerPayloadsBase64: Object.fromEntries(
        applicableScannerIds(artifactIdFromKey(key)).map((scannerId) => [
          scannerId,
          scannerBytes[scannerProofKey(key, scannerId)]!.toString("base64"),
        ]),
      ),
    };
  });
  return {
    bytes: canonicalJsonBytes({
      schemaVersion: 1,
      sourceCommit,
      workflowRunId: run.runId,
      runAttempt: run.runAttempt,
      entries,
    }),
    resultOverrides,
    rawPayloads: new Map(Object.entries(artifactBytes)),
  };
};

const baselineInventoryFixture = (
  sourceCommit: string,
  run: ResolvedWorkflowRun,
): { bytes: Buffer; entries: JsonRecord[] } => {
  const keys = closedArtifactKeys().filter((key) => key.endsWith("/baseline.png"));
  const artifactBytes = syntheticArtifactBytesForKeys(keys, "2026.1");
  const entries = keys.map((physicalKey, index) => {
    const cell = cellForPhysicalKey(physicalKey)!;
    const bytes = artifactBytes[physicalKey]!;
    return {
      ordinal: index + 1,
      physicalKey,
      cellDigest: cellDigest(cell),
      captureProfileDigest: valueDigest(expectedCaptureProfile(cell)),
      artifactHash: bufferDigest(bytes),
      artifactByteSize: bytes.length,
      captureSourceCommit: sourceCommit,
      captureRunId: run.runId,
      captureRunAttempt: run.runAttempt,
      capturedAtUtc: run.completedAtUtc,
      captureToolId: "r4b_chromium_capture_v1",
      captureToolVersion: "1.0.0",
      colorProfile: "srgb",
    };
  });
  return {
    bytes: canonicalJsonBytes({
      schemaVersion: 1,
      baselineSetId: "conversation_canvas_v1",
      entries,
    }),
    entries,
  };
};

// Windows real-Git A→S→E1→E2 fixtures plus 86,400 content-bearing streams take about 240s
// in isolation. Keep at least 2x headroom and never run focused/shared/full suites concurrently.
const sealedTopologyTimeoutMs = 600_000;

describe("Sprint 6 R4-A Conversation Canvas specification", () => {
  it("drains complete JSONL records before bounding residual lines across arbitrary chunks", () => {
    const lineCount = 2_048;
    const bytes = Buffer.concat(
      Array.from({ length: lineCount }, (_, index) =>
        canonicalJsonBytes({ index, label: index % 2 === 0 ? "مرحبا" : "chunk-boundary" }),
      ),
    );
    expect(bytes.length).toBeGreaterThan(64 * 1024);
    const metadata = { byteSize: bytes.length, sha256: bufferDigest(bytes) };
    const artifactFor = (factory: () => Iterable<Buffer>): ResolvedWorkflowArtifact => ({
      repository: r4bRepository,
      runId: "1",
      runAttempt: 1,
      artifactId: "chunk-invariance.jsonl",
      immutable: true,
      createdAtUtc: "2026-10-31T00:00:00Z",
      ...metadata,
      stream: factory,
    });
    const factories: (() => Iterable<Buffer>)[] = [
      function* () {
        for (let offset = 0; offset < bytes.length; offset += 1)
          yield bytes.subarray(offset, offset + 1);
      },
      function* () {
        for (let offset = 0; offset < bytes.length; offset += 64 * 1024)
          yield bytes.subarray(offset, offset + 64 * 1024);
      },
      function* () {
        const widths = [3, 257, 8_191, 17, 65_537];
        let offset = 0;
        let widthIndex = 0;
        while (offset < bytes.length) {
          const width = widths[widthIndex % widths.length]!;
          yield bytes.subarray(offset, Math.min(bytes.length, offset + width));
          offset += width;
          widthIndex += 1;
        }
      },
    ];
    for (const factory of factories) {
      let consumed = 0;
      expect(
        validateBoundedCanonicalJsonlStream(
          artifactFor(factory),
          2 * 1024 * 1024,
          1_024,
          (rawLine) => {
            const parsed = parseCanonicalJsonBytes(Buffer.from(`${rawLine}\n`));
            if (!exactObjectKeys(parsed, ["index", "label"])) return false;
            consumed += 1;
            return true;
          },
        ),
      ).toBe(true);
      expect(consumed).toBe(lineCount);
    }
    const oversizedLine = canonicalJsonBytes({ payload: "x".repeat(2_048) });
    const oversizedArtifact = artifactFor(() => [oversizedLine]);
    oversizedArtifact.byteSize = oversizedLine.length;
    oversizedArtifact.sha256 = bufferDigest(oversizedLine);
    expect(
      validateBoundedCanonicalJsonlStream(oversizedArtifact, 2 * 1024 * 1024, 1_024, () => true),
    ).toBe(false);
    const unterminated = oversizedLine.subarray(0, oversizedLine.length - 1);
    const unterminatedArtifact = artifactFor(() => [unterminated]);
    unterminatedArtifact.byteSize = unterminated.length;
    unterminatedArtifact.sha256 = bufferDigest(unterminated);
    expect(
      validateBoundedCanonicalJsonlStream(unterminatedArtifact, 2 * 1024 * 1024, 1_024, () => true),
    ).toBe(false);
  });

  it("simulates the sealed A to S to E1 to E2 evidence topology without runtime claims", () => {
    expect(sealedTopologyTimeoutMs).toBe(600_000);
    const evidence = record(catalog.evidence);
    expect(record(evidence.authoritativeEvidenceTopology)).toEqual({
      repository: r4bRepository,
      commitOrder:
        "baseline_approval_A_is_trusted_main_ancestor_of_source_S;capture_run_R_executes_exact_S_and_fixed_workflow_blob;evidence_E1_is_direct_child_of_S_with_only_Elana_review_json;evidence_E2_is_direct_child_of_E1_with_only_cleanup_json",
      sourceInvalidation:
        "any_byte_change_after_S_requires_a_new_capture_run_and_new_E1_E2_chain;post_squash_main_requires_a_new_chain_at_merged_main",
      trustBoundary:
        "manifest_contains_closed_locators_only;repository_host_credentials_bytes_callbacks_expected_values_and_trust_status_are_resolver_owned_and_cannot_be_caller_supplied",
    });
    expect(record(evidence.evidenceResolverContract).methods).toEqual([
      "resolveCommit",
      "isAncestor",
      "resolveGitBlob",
      "resolveWorkflowRun",
      "resolveWorkflowArtifact",
      "resolveReviewerAttestation",
      "resolveArtifactAbsence",
    ]);
    expect(evidence.evidenceLocatorFields).toEqual(evidenceLocatorFields);
    expect(record(evidence.rawArtifactInventoryAuthority)).toMatchObject({
      targetFields: rawArtifactTargetFields,
      targetArtifactIds: [...rawArtifactTargetIds],
      logicalMemberCounts: [...rawArtifactLogicalMemberCounts],
      aggregateLogicalMemberCount: 86_400,
    });
    expect(record(evidence.r4aSimulationBoundary)).toEqual({
      verdict: "SIMULATED_CONTRACT_PASS",
      fixture:
        "R4A_uses_a_real_temporary_Git_P_A_S_E1_E2_graph_and_a_sealed_test_only_fake_resolver_seeded_before_seal",
      claim:
        "future_actual_resolver_workflow_baseline_capture_scan_review_and_cleanup_remain_R4B_prerequisites;runtime_browser_AT_scanner_reviewer_cleanup_execution_counts_are_zero;all_10800_cells_and_86400_artifacts_remain_UNATTEMPTED",
    });
    const temporaryRepositoryRoot = mkdtempSync(join(tmpdir(), "fluyo-r4b-resolver-"));
    try {
      gitFixture(temporaryRepositoryRoot, "init", "-b", "trusted-main");
      gitFixture(temporaryRepositoryRoot, "config", "user.name", "R4A Contract Fixture");
      gitFixture(temporaryRepositoryRoot, "config", "user.email", "r4a-fixture@invalid.test");
      const workflowBytes = Buffer.from(
        "name: R4-B Conversation Canvas\non:\n  workflow_dispatch:\njobs:\n  evidence:\n    runs-on: ubuntu-24.04\n    steps: []\n",
      );
      const p = fixtureCommit(
        temporaryRepositoryRoot,
        { [r4bWorkflowPath]: workflowBytes, "README.md": "fixture\n" },
        "test: create trusted R4-B fixture base",
      );
      const baselineRun = fixtureRun(
        temporaryRepositoryRoot,
        p,
        "9001",
        1,
        "2026-10-20T00:00:00Z",
        "2026-10-20T01:00:00Z",
      );
      const baselineInventory = baselineInventoryFixture(p, baselineRun);
      const baselineArtifactBytes = baselineInventory.bytes;
      const baselineArtifactHash = bufferDigest(baselineArtifactBytes);
      const baselineApproval: JsonRecord = {
        schemaVersion: 1,
        baselineSetId: "conversation_canvas_v1",
        captureSourceCommit: p,
        captureRunId: baselineRun.runId,
        captureRunAttempt: baselineRun.runAttempt,
        captureArtifactId: "approved-baseline-bundle.json",
        captureArtifactHash: baselineArtifactHash,
        captureArtifactByteSize: baselineArtifactBytes.length,
        inventoryDigest: baselineInventoryDigest(baselineInventory.entries),
        cellCatalogDigest: createHash("sha256")
          .update(JSON.stringify(closedCellRecords()))
          .digest("hex"),
        captureProfileCatalogDigest: createHash("sha256")
          .update(JSON.stringify(closedCaptureProfiles()))
          .digest("hex"),
        captureToolId: "r4b_chromium_capture_v1",
        captureToolVersion: "1.0.0",
        colorProfile: "srgb",
        artifactCount: 10_800,
        capturedAtUtc: baselineRun.completedAtUtc,
        approvedBy: "Daniela Vargas",
        approvedAtUtc: "2026-10-21T00:00:00Z",
        decisionDigest: "",
      };
      baselineApproval.decisionDigest = baselineDecisionDigest(baselineApproval);
      const baselinePath = "docs/r4b-baselines/conversation_canvas_v1.json";
      const a = fixtureCommit(
        temporaryRepositoryRoot,
        { [baselinePath]: canonicalJsonBytes(baselineApproval) },
        "docs: approve R4-B baseline fixture",
      );
      const s = fixtureCommit(
        temporaryRepositoryRoot,
        { "src/r4b-source.txt": "fixed source S\n" },
        "test: freeze R4-B source fixture",
      );
      const captureRun = fixtureRun(
        temporaryRepositoryRoot,
        s,
        "10001",
        1,
        "2026-10-31T00:00:00Z",
        "2026-11-02T00:00:00Z",
      );
      const preLocators: EvidenceLocators = {
        schemaVersion: 1,
        phase: "PRE_CLEANUP",
        sourceCommit: s,
        baselineApprovalCommit: a,
        baselineSetId: "conversation_canvas_v1",
        captureRunId: captureRun.runId,
        captureRunAttempt: captureRun.runAttempt,
        completeResultsArtifactId,
        transitionEvidenceArtifactId,
        representativeBundleArtifactId,
        reviewCommit: null,
        cleanupCommit: null,
        cleanupRunId: null,
        cleanupRunAttempt: null,
        cleanupArtifactId: null,
      };
      const baselineResolver = new SealedFakeEvidenceResolver(temporaryRepositoryRoot)
        .seedRun(baselineRun)
        .seedArtifact(
          baselineRun.runId,
          baselineRun.runAttempt,
          "approved-baseline-bundle.json",
          baselineRun.completedAtUtc,
          () => [baselineArtifactBytes],
        )
        .seal();
      const resolvedBaseline = resolveBaseline(baselineResolver, preLocators);
      expect(resolvedBaseline).toBeDefined();
      const representative = representativeFixture(
        s,
        captureRun,
        resolvedBaseline as ResolvedBaseline,
      );
      const representativeBaselineKey = representativeSemanticKeys().find((key) =>
        key.endsWith("/baseline.png"),
      )!;
      const approvedProvenance = resolvedBaselineProvenance(
        resolvedBaseline as ResolvedBaseline,
        representativeBaselineKey,
      )!;
      const approvedProvenanceMutation = (changes: JsonRecord): Buffer => {
        const mutation = { ...approvedProvenance, ...changes };
        mutation.provenanceDigest = baselineProvenanceDigest(mutation);
        return canonicalJsonBytes(mutation);
      };
      expect(
        validResolvedBaselineProvenance(
          canonicalJsonBytes(approvedProvenance),
          resolvedBaseline as ResolvedBaseline,
          representativeBaselineKey,
          String(approvedProvenance.artifactHash),
        ),
      ).toEqual(approvedProvenance);
      for (const mutation of [
        { captureSourceCommit: "0".repeat(40) },
        { captureRunId: "9002" },
        { captureRunAttempt: 2 },
        { capturedAtUtc: addUtcSeconds(approvedProvenance.capturedAtUtc, 1) },
        { captureToolId: "attacker_capture" },
        { captureToolVersion: "2.0.0" },
        { captureProfileDigest: "0".repeat(64) },
        { approvalReference: `git:${p}:docs/r4b-baselines/attacker.json` },
      ])
        expect(
          validResolvedBaselineProvenance(
            approvedProvenanceMutation(mutation),
            resolvedBaseline as ResolvedBaseline,
            representativeBaselineKey,
            String(approvedProvenance.artifactHash),
          ),
        ).toBeUndefined();
      const completeFactory = completeResultsFactory(s, captureRun, representative.resultOverrides);
      const completeMetadata = iterableMetadata(completeFactory);
      const transitionEvidenceBytes = canonicalJsonBytes(
        transitionEvidencePayload(s, captureRun.runId, captureRun.runAttempt),
      );
      const transitionEvidenceMetadata = iterableMetadata(() => [transitionEvidenceBytes]);
      expect(completeMetadata.byteSize).toBeLessThanOrEqual(128 * 1024 * 1024);
      const rawPngFactory = rawBundleFactory(
        s,
        captureRun,
        rawPngCaptureBundleArtifactId,
        representative.resultOverrides,
        representative.rawPayloads,
      );
      const rawStructuredFactory = rawBundleFactory(
        s,
        captureRun,
        rawStructuredBundleArtifactId,
        representative.resultOverrides,
        representative.rawPayloads,
      );
      const rawPngMetadata = iterableMetadata(rawPngFactory);
      const rawStructuredMetadata = iterableMetadata(rawStructuredFactory);
      expect(rawPngMetadata.byteSize).toBeLessThanOrEqual(rawBundleMaximumBytes);
      expect(rawStructuredMetadata.byteSize).toBeLessThanOrEqual(rawBundleMaximumBytes);
      const representativeHash = bufferDigest(representative.bytes);
      const preResolver = new SealedFakeEvidenceResolver(temporaryRepositoryRoot)
        .seedRun(baselineRun)
        .seedArtifact(
          baselineRun.runId,
          baselineRun.runAttempt,
          "approved-baseline-bundle.json",
          baselineRun.completedAtUtc,
          () => [baselineArtifactBytes],
        )
        .seedRun(captureRun)
        .seedArtifact(
          captureRun.runId,
          captureRun.runAttempt,
          completeResultsArtifactId,
          captureRun.completedAtUtc,
          completeFactory,
        )
        .seedArtifact(
          captureRun.runId,
          captureRun.runAttempt,
          transitionEvidenceArtifactId,
          captureRun.completedAtUtc,
          () => [transitionEvidenceBytes],
        )
        .seedArtifact(
          captureRun.runId,
          captureRun.runAttempt,
          representativeBundleArtifactId,
          captureRun.completedAtUtc,
          () => [representative.bytes],
        )
        .seedArtifact(
          captureRun.runId,
          captureRun.runAttempt,
          rawPngCaptureBundleArtifactId,
          captureRun.completedAtUtc,
          rawPngFactory,
        )
        .seedArtifact(
          captureRun.runId,
          captureRun.runAttempt,
          rawStructuredBundleArtifactId,
          captureRun.completedAtUtc,
          rawStructuredFactory,
        )
        .seal();
      expect(validEvidenceLocators(preLocators)).toBe(true);
      const resolvedSourceWorkflow = preResolver.resolveGitBlob(s, r4bWorkflowPath);
      expect(resolvedSourceWorkflow).toBeDefined();
      expect(resolveBaseline(preResolver, preLocators)).toBeDefined();
      const resolvedCaptureRun = preResolver.resolveWorkflowRun(
        r4bWorkflowPath,
        captureRun.runId,
        captureRun.runAttempt,
      );
      expect(
        resolvedRunValid(resolvedCaptureRun, s, resolvedSourceWorkflow as ResolvedGitBlob),
      ).toBe(true);
      const resolvedComplete = preResolver.resolveWorkflowArtifact(
        captureRun.runId,
        captureRun.runAttempt,
        completeResultsArtifactId,
      );
      expect(resolvedComplete).toBeDefined();
      const validatedComplete = validateCompleteResults(
        resolvedComplete as ResolvedWorkflowArtifact,
        s,
        captureRun,
        new Set(representativeSemanticKeys()),
      );
      expect(validatedComplete).toBeDefined();
      const resolvedRepresentative = preResolver.resolveWorkflowArtifact(
        captureRun.runId,
        captureRun.runAttempt,
        representativeBundleArtifactId,
      );
      expect(resolvedRepresentative).toBeDefined();
      const validatedRepresentative = validateRepresentativeBundle(
        resolvedRepresentative as ResolvedWorkflowArtifact,
        s,
        captureRun,
        validatedComplete as CompleteResultsValidation,
        resolveBaseline(preResolver, preLocators) as ResolvedBaseline,
      );
      expect(validatedRepresentative).toMatchObject({
        digest: expect.stringMatching(/^[0-9a-f]{64}$/),
        rawPayloads: expect.any(Map),
      });
      const pre = validateResolvedEvidence(preLocators, preResolver);
      expect(pre).toMatchObject({
        stage: "PRE_CLEANUP",
        artifactSetDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
        artifactCount: 86_400,
        rawArtifactInventory: expect.objectContaining({ targets: expect.any(Array) }),
        rawArtifactInventoryDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
        transitionEvidence: {
          artifactHash: transitionEvidenceMetadata.sha256,
          artifactByteSize: transitionEvidenceMetadata.byteSize,
          validationDigest: record(parseCanonicalJsonBytes(transitionEvidenceBytes))
            .validationDigest,
        },
      });
      const withCaptureArtifactOverride = (
        original: EvidenceResolver,
        artifactId: string,
        override: ResolvedWorkflowArtifact | undefined,
      ): EvidenceResolver => ({
        resolveCommit: original.resolveCommit.bind(original),
        isAncestor: original.isAncestor.bind(original),
        resolveGitBlob: original.resolveGitBlob.bind(original),
        resolveWorkflowRun: original.resolveWorkflowRun.bind(original),
        resolveWorkflowArtifact: (runId, runAttempt, candidateArtifactId) =>
          runId === captureRun.runId &&
          runAttempt === captureRun.runAttempt &&
          candidateArtifactId === artifactId
            ? override
            : original.resolveWorkflowArtifact(runId, runAttempt, candidateArtifactId),
        resolveReviewerAttestation: original.resolveReviewerAttestation.bind(original),
        resolveArtifactAbsence: original.resolveArtifactAbsence.bind(original),
      });
      const resolvedRawArtifact = (
        artifactId: string,
        factory: () => Iterable<Buffer>,
      ): ResolvedWorkflowArtifact => ({
        repository: r4bRepository,
        runId: captureRun.runId,
        runAttempt: captureRun.runAttempt,
        artifactId,
        immutable: true,
        createdAtUtc: captureRun.completedAtUtc,
        ...iterableMetadata(factory),
        stream: factory,
      });
      expect(
        validateResolvedEvidence(
          preLocators,
          withCaptureArtifactOverride(preResolver, rawPngCaptureBundleArtifactId, undefined),
        ),
      ).toBeUndefined();
      for (const invalidRawFactory of [
        rawBundleFactory(
          s,
          captureRun,
          rawPngCaptureBundleArtifactId,
          representative.resultOverrides,
          representative.rawPayloads,
          { kind: "payload_missing", ordinal: 1 },
        ),
        rawBundleFactory(
          s,
          captureRun,
          rawPngCaptureBundleArtifactId,
          representative.resultOverrides,
          representative.rawPayloads,
          { kind: "payload_changed", ordinal: 1 },
        ),
        rawBundleFactory(
          s,
          captureRun,
          rawPngCaptureBundleArtifactId,
          representative.resultOverrides,
          representative.rawPayloads,
          { kind: "invalid_base64", ordinal: 1 },
        ),
        rawBundleFactory(
          s,
          captureRun,
          rawPngCaptureBundleArtifactId,
          representative.resultOverrides,
          representative.rawPayloads,
          { kind: "hash_mismatch", ordinal: 1 },
        ),
        rawBundleFactory(
          s,
          captureRun,
          rawPngCaptureBundleArtifactId,
          representative.resultOverrides,
          representative.rawPayloads,
          { kind: "size_mismatch", ordinal: 1 },
        ),
        rawBundleFactory(
          s,
          captureRun,
          rawPngCaptureBundleArtifactId,
          representative.resultOverrides,
          representative.rawPayloads,
          { kind: "duplicate", ordinal: 1 },
        ),
        rawBundleFactory(
          s,
          captureRun,
          rawPngCaptureBundleArtifactId,
          representative.resultOverrides,
          representative.rawPayloads,
          { kind: "truncated", ordinal: 1 },
        ),
        rawBundleFactory(
          s,
          captureRun,
          rawPngCaptureBundleArtifactId,
          representative.resultOverrides,
          representative.rawPayloads,
          { kind: "oversize", ordinal: 1 },
        ),
        rawBundleFactory(
          s,
          captureRun,
          rawPngCaptureBundleArtifactId,
          representative.resultOverrides,
          representative.rawPayloads,
          { kind: "partition_mismatch", ordinal: 1 },
        ),
        rawBundleFactory(
          s,
          captureRun,
          rawPngCaptureBundleArtifactId,
          representative.resultOverrides,
          representative.rawPayloads,
          { kind: "omit", ordinal: 1 },
        ),
      ])
        expect(
          validateRawBundle(
            resolvedRawArtifact(rawPngCaptureBundleArtifactId, invalidRawFactory),
            s,
            captureRun,
            validatedComplete as CompleteResultsValidation,
            (validatedRepresentative as RepresentativeBundleValidation).rawPayloads,
          ),
        ).toBeUndefined();
      const invalidRunResolver = (runOverride: ResolvedWorkflowRun) =>
        new SealedFakeEvidenceResolver(temporaryRepositoryRoot)
          .seedRun(baselineRun)
          .seedArtifact(
            baselineRun.runId,
            baselineRun.runAttempt,
            "approved-baseline-bundle.json",
            baselineRun.completedAtUtc,
            () => [baselineArtifactBytes],
          )
          .seedRun(runOverride)
          .seal();
      expect(
        validateResolvedEvidence(preLocators, invalidRunResolver({ ...captureRun, headSha: p })),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence(
          preLocators,
          invalidRunResolver({ ...captureRun, conclusion: "failure" }),
        ),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence(
          preLocators,
          invalidRunResolver({ ...captureRun, workflowBlobDigest: "0".repeat(64) }),
        ),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence({ ...preLocators, captureRunAttempt: 2 }, preResolver),
      ).toBeUndefined();
      const missingArtifactResolver = invalidRunResolver(captureRun);
      expect(validateResolvedEvidence(preLocators, missingArtifactResolver)).toBeUndefined();
      const artifactOverrideResolver = (
        artifactId: string,
        override: (
          artifact: ResolvedWorkflowArtifact | undefined,
        ) => ResolvedWorkflowArtifact | undefined,
      ): EvidenceResolver => ({
        resolveCommit: preResolver.resolveCommit.bind(preResolver),
        isAncestor: preResolver.isAncestor.bind(preResolver),
        resolveGitBlob: preResolver.resolveGitBlob.bind(preResolver),
        resolveWorkflowRun: preResolver.resolveWorkflowRun.bind(preResolver),
        resolveReviewerAttestation: preResolver.resolveReviewerAttestation.bind(preResolver),
        resolveArtifactAbsence: preResolver.resolveArtifactAbsence.bind(preResolver),
        resolveWorkflowArtifact: (runId, attempt, candidateArtifactId) => {
          const artifact = preResolver.resolveWorkflowArtifact(runId, attempt, candidateArtifactId);
          return candidateArtifactId === artifactId ? override(artifact) : artifact;
        },
      });
      expect(
        validateResolvedEvidence(
          preLocators,
          artifactOverrideResolver(completeResultsArtifactId, (artifact) =>
            artifact
              ? ({ ...artifact, immutable: false } as unknown as ResolvedWorkflowArtifact)
              : undefined,
          ),
        ),
      ).toBeUndefined();
      const resolvedTransition = preResolver.resolveWorkflowArtifact(
        captureRun.runId,
        captureRun.runAttempt,
        transitionEvidenceArtifactId,
      );
      expect(
        validateTransitionEvidenceArtifact(
          resolvedTransition as ResolvedWorkflowArtifact,
          s,
          captureRun,
        ),
      ).toEqual(pre!.transitionEvidence);
      const transitionMutationArtifact = (changes: JsonRecord): ResolvedWorkflowArtifact => {
        const payload = {
          ...record(parseCanonicalJsonBytes(transitionEvidenceBytes)),
          ...changes,
          validationDigest: "",
        };
        payload.validationDigest = transitionEvidenceValidationDigest(payload);
        const bytes = canonicalJsonBytes(payload);
        return {
          ...(resolvedTransition as ResolvedWorkflowArtifact),
          ...iterableMetadata(() => [bytes]),
          stream: () => [bytes],
        };
      };
      for (const artifact of [
        transitionMutationArtifact({ privacyScanStatus: "FAIL" }),
        transitionMutationArtifact({ status: "PASS" }),
        transitionMutationArtifact({
          records: expectedTransitionEvidenceRecords().map((entry, index) =>
            index === 0 ? { ...entry, observedFocusTargetId: "document" } : entry,
          ),
        }),
        transitionMutationArtifact({
          records: expectedTransitionEvidenceRecords().map((entry, index) =>
            index === 0 ? { ...entry, deduplicationKey: "retained-key" } : entry,
          ),
        }),
      ])
        expect(
          validateResolvedEvidence(
            preLocators,
            artifactOverrideResolver(transitionEvidenceArtifactId, () => artifact),
          ),
        ).toBeUndefined();
      expect(
        validateResolvedEvidence(
          preLocators,
          artifactOverrideResolver(transitionEvidenceArtifactId, (artifact) =>
            artifact ? { ...artifact, stream: () => [Buffer.from("changed")] } : undefined,
          ),
        ),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence(
          preLocators,
          artifactOverrideResolver(representativeBundleArtifactId, () => undefined),
        ),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence(
          preLocators,
          artifactOverrideResolver(representativeBundleArtifactId, (artifact) =>
            artifact ? { ...artifact, byteSize: 16 * 1024 * 1024 + 1 } : undefined,
          ),
        ),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence(
          preLocators,
          artifactOverrideResolver(representativeBundleArtifactId, (artifact) =>
            artifact ? { ...artifact, stream: () => [Buffer.from("stream-mismatch")] } : undefined,
          ),
        ),
      ).toBeUndefined();
      let equivocationRead = 0;
      const equivocatingResolver: EvidenceResolver = {
        resolveCommit: preResolver.resolveCommit.bind(preResolver),
        isAncestor: preResolver.isAncestor.bind(preResolver),
        resolveGitBlob: preResolver.resolveGitBlob.bind(preResolver),
        resolveWorkflowRun: (path, runId, attempt) => {
          const value = preResolver.resolveWorkflowRun(path, runId, attempt);
          if (runId !== captureRun.runId || !value) return value;
          equivocationRead += 1;
          return equivocationRead % 2 === 0 ? { ...value, conclusion: "failure" } : value;
        },
        resolveWorkflowArtifact: preResolver.resolveWorkflowArtifact.bind(preResolver),
        resolveReviewerAttestation: preResolver.resolveReviewerAttestation.bind(preResolver),
        resolveArtifactAbsence: preResolver.resolveArtifactAbsence.bind(preResolver),
      };
      expect(validateResolvedEvidence(preLocators, equivocatingResolver)).toBeUndefined();
      const reviewPath = `evidence/r4b/${captureRun.runId}/review.json`;
      const reviewerAttestation: ResolvedReviewerAttestation = {
        provider: "github_protected_environment",
        repository: r4bRepository,
        attestationId: "review-attestation-10001",
        sourceCommit: s,
        workflowRunId: captureRun.runId,
        runAttempt: captureRun.runAttempt,
        artifactSetDigest: pre!.artifactSetDigest,
        rawArtifactInventoryDigest: pre!.rawArtifactInventoryDigest!,
        transitionEvidenceHash: pre!.transitionEvidence!.artifactHash,
        transitionEvidenceValidationDigest: pre!.transitionEvidence!.validationDigest,
        verdict: "PASS",
        subjectId: "elana_castillo_quality",
        displayName: "Elana Castillo",
        role: "sole_independent_exact_head_QA",
        completedAtUtc: "2026-11-02T01:00:00Z",
        providerDigest: "",
      };
      reviewerAttestation.providerDigest = providerRecordDigest(
        "fluyo:r4b:reviewer-attestation:v1",
        record(reviewerAttestation),
      );
      const reviewRecord = {
        schemaVersion: 1,
        sourceCommit: s,
        workflowRunId: captureRun.runId,
        runAttempt: captureRun.runAttempt,
        completeResultsArtifactHash: completeMetadata.sha256,
        transitionEvidenceArtifactHash: pre!.transitionEvidence!.artifactHash,
        transitionEvidenceArtifactByteSize: pre!.transitionEvidence!.artifactByteSize,
        transitionEvidenceValidationDigest: pre!.transitionEvidence!.validationDigest,
        representativeBundleArtifactHash: representativeHash,
        baselineApprovalCommit: a,
        baselineBlobDigest: bufferDigest(canonicalJsonBytes(baselineApproval)),
        rawArtifactInventory: pre!.rawArtifactInventory!,
        rawArtifactInventoryDigest: pre!.rawArtifactInventoryDigest!,
        artifactSetDigest: pre!.artifactSetDigest,
        reviewerAttestationId: reviewerAttestation.attestationId,
        reviewerAttestationDigest: reviewerAttestation.providerDigest,
        completedAtUtc: "2026-11-02T01:00:00Z",
        verdict: "PASS",
      };
      gitFixture(temporaryRepositoryRoot, "checkout", "--detach", s);
      const e1 = fixtureCommit(
        temporaryRepositoryRoot,
        { [reviewPath]: canonicalJsonBytes(reviewRecord) },
        "test: record independent R4-B review fixture",
      );
      const reviewBlobObjectId = gitFixture(
        temporaryRepositoryRoot,
        "rev-parse",
        `${e1}:${reviewPath}`,
      );
      const cleanupRun = fixtureRun(
        temporaryRepositoryRoot,
        e1,
        "10002",
        1,
        "2026-11-02T02:00:00Z",
        "2026-11-02T03:00:00Z",
      );
      const rawArtifactInventory = pre!.rawArtifactInventory!;
      const rawTargets = records(rawArtifactInventory.targets);
      const rawInventoryDigest = pre!.rawArtifactInventoryDigest!;
      expect(
        validRawArtifactInventory(
          rawArtifactInventory,
          s,
          captureRun.runId,
          captureRun.runAttempt,
          representativeHash,
        ),
      ).toBeDefined();
      for (const invalidInventory of [
        { ...rawArtifactInventory, targets: rawTargets.slice(1) },
        {
          ...rawArtifactInventory,
          targets: [
            ...rawTargets,
            {
              artifactId: "raw-extra-bundle.jsonl",
              artifactDigest: "0".repeat(64),
              artifactByteSize: 1,
              memberInventoryDigest: "0".repeat(64),
              logicalMemberCount: 0,
            },
          ],
        },
        {
          ...rawArtifactInventory,
          targets: rawTargets.map((target, index) =>
            index === 2 ? { ...target, artifactDigest: "0".repeat(64) } : target,
          ),
        },
        {
          ...rawArtifactInventory,
          targets: rawTargets.map((target, index) =>
            index === 0 ? { ...target, logicalMemberCount: 32_399 } : target,
          ),
        },
      ])
        expect(
          validRawArtifactInventory(
            invalidInventory,
            s,
            captureRun.runId,
            captureRun.runAttempt,
            representativeHash,
          ),
        ).toBeUndefined();
      const cleanupProof = {
        schemaVersion: 1,
        sourceCommit: s,
        reviewCommit: e1,
        reviewBlobObjectId,
        artifactSetDigest: pre!.artifactSetDigest,
        cleanupRunId: cleanupRun.runId,
        cleanupRunAttempt: cleanupRun.runAttempt,
        cleanupArtifactId,
        durableArtifactIds: [completeResultsArtifactId, transitionEvidenceArtifactId],
        durableArtifactDigests: [completeMetadata.sha256, transitionEvidenceMetadata.sha256],
        retainedDurableArtifactCount: 2,
        rawArtifactInventory,
        rawArtifactInventoryDigest: rawInventoryDigest,
        rawArtifactTargetCount: rawTargets.length,
        rawArtifactLogicalMemberCount: rawTargets.reduce(
          (sum, target) => sum + Number(target.logicalMemberCount),
          0,
        ),
        rawArtifactTargetIds: rawTargets.map((target) => String(target.artifactId)),
        rawArtifactTargetDigests: rawTargets.map((target) => String(target.artifactDigest)),
        absenceAttestationId: "absence-attestation-10001",
        absenceAttestationDigest: "",
        deletedArtifactCount: 86_400,
        retainedArtifactCount: 0,
        outcome: "DELETED",
        retryState: "NOT_REQUIRED",
        failureCode: null,
        completedAtUtc: "2026-11-02T03:00:00Z",
      };
      const absenceAttestation: ResolvedArtifactAbsence = {
        provider: "github_artifact_retention_service",
        repository: r4bRepository,
        attestationId: cleanupProof.absenceAttestationId,
        sourceCommit: s,
        captureRunId: captureRun.runId,
        captureRunAttempt: captureRun.runAttempt,
        targetInventoryDigest: cleanupProof.rawArtifactInventoryDigest,
        targetCount: cleanupProof.rawArtifactTargetCount,
        logicalMemberCount: cleanupProof.rawArtifactLogicalMemberCount,
        targetArtifactIds: cleanupProof.rawArtifactTargetIds,
        targetArtifactDigests: cleanupProof.rawArtifactTargetDigests,
        absent: cleanupProof.rawArtifactTargetIds.map(() => true),
        verifiedAtUtc: "2026-11-02T03:01:00Z",
        providerDigest: "",
      };
      absenceAttestation.providerDigest = providerRecordDigest(
        "fluyo:r4b:artifact-absence:v1",
        record(absenceAttestation),
      );
      const signedAbsenceMutation = (changes: JsonRecord): ResolvedArtifactAbsence => {
        const mutation = {
          ...absenceAttestation,
          ...changes,
          providerDigest: "",
        } as unknown as ResolvedArtifactAbsence;
        mutation.providerDigest = providerRecordDigest(
          "fluyo:r4b:artifact-absence:v1",
          record(mutation),
        );
        return mutation;
      };
      cleanupProof.absenceAttestationDigest = absenceAttestation.providerDigest;
      const cleanupProofBytes = canonicalJsonBytes(cleanupProof);
      const cleanupRecord = {
        schemaVersion: cleanupProof.schemaVersion,
        sourceCommit: cleanupProof.sourceCommit,
        reviewCommit: cleanupProof.reviewCommit,
        reviewBlobObjectId: cleanupProof.reviewBlobObjectId,
        artifactSetDigest: cleanupProof.artifactSetDigest,
        cleanupRunId: cleanupProof.cleanupRunId,
        cleanupRunAttempt: cleanupProof.cleanupRunAttempt,
        cleanupArtifactId: cleanupProof.cleanupArtifactId,
        cleanupArtifactHash: bufferDigest(cleanupProofBytes),
        durableArtifactIds: cleanupProof.durableArtifactIds,
        durableArtifactDigests: cleanupProof.durableArtifactDigests,
        retainedDurableArtifactCount: cleanupProof.retainedDurableArtifactCount,
        rawArtifactInventory: cleanupProof.rawArtifactInventory,
        rawArtifactInventoryDigest: cleanupProof.rawArtifactInventoryDigest,
        rawArtifactTargetCount: cleanupProof.rawArtifactTargetCount,
        rawArtifactLogicalMemberCount: cleanupProof.rawArtifactLogicalMemberCount,
        rawArtifactTargetIds: cleanupProof.rawArtifactTargetIds,
        rawArtifactTargetDigests: cleanupProof.rawArtifactTargetDigests,
        absenceAttestationId: cleanupProof.absenceAttestationId,
        absenceAttestationDigest: cleanupProof.absenceAttestationDigest,
        deletedArtifactCount: cleanupProof.deletedArtifactCount,
        retainedArtifactCount: cleanupProof.retainedArtifactCount,
        outcome: cleanupProof.outcome,
        retryState: cleanupProof.retryState,
        failureCode: cleanupProof.failureCode,
        completedAtUtc: cleanupProof.completedAtUtc,
      };
      const cleanupPath = `evidence/r4b/${captureRun.runId}/cleanup.json`;
      const e2 = fixtureCommit(
        temporaryRepositoryRoot,
        { [cleanupPath]: canonicalJsonBytes(cleanupRecord) },
        "test: record R4-B cleanup fixture",
      );
      const finalResolver = preResolver
        .cleanupSnapshotDeleting(captureRun.runId, captureRun.runAttempt, rawArtifactTargetIds)
        .seedReviewerAttestation(reviewerAttestation)
        .seedArtifactAbsence(absenceAttestation)
        .seedRun(cleanupRun)
        .seedArtifact(
          cleanupRun.runId,
          cleanupRun.runAttempt,
          cleanupArtifactId,
          cleanupRun.completedAtUtc,
          () => [cleanupProofBytes],
        )
        .seal();
      const finalLocators: EvidenceLocators = {
        ...preLocators,
        phase: "FINALIZED",
        reviewCommit: e1,
        cleanupCommit: e2,
        cleanupRunId: cleanupRun.runId,
        cleanupRunAttempt: cleanupRun.runAttempt,
        cleanupArtifactId,
      };
      expect(validateResolvedEvidence(finalLocators, finalResolver)).toEqual({
        stage: "FINALIZED",
        artifactSetDigest: pre!.artifactSetDigest,
        artifactCount: 86_400,
        transitionEvidence: pre!.transitionEvidence,
      });
      const withAbsenceOverride = (
        original: EvidenceResolver,
        override: ResolvedArtifactAbsence,
      ): EvidenceResolver => ({
        resolveCommit: original.resolveCommit.bind(original),
        isAncestor: original.isAncestor.bind(original),
        resolveGitBlob: original.resolveGitBlob.bind(original),
        resolveWorkflowRun: original.resolveWorkflowRun.bind(original),
        resolveWorkflowArtifact: original.resolveWorkflowArtifact.bind(original),
        resolveReviewerAttestation: original.resolveReviewerAttestation.bind(original),
        resolveArtifactAbsence: () => structuredClone(override),
      });
      for (const mutation of [
        signedAbsenceMutation({ targetCount: rawTargets.length - 1 }),
        signedAbsenceMutation({ logicalMemberCount: 86_399 }),
        signedAbsenceMutation({ targetArtifactIds: cleanupProof.rawArtifactTargetIds.slice(1) }),
        signedAbsenceMutation({
          targetArtifactIds: [...cleanupProof.rawArtifactTargetIds, "raw-extra-bundle.jsonl"],
        }),
        signedAbsenceMutation({
          targetArtifactDigests: cleanupProof.rawArtifactTargetDigests.map((digest, index) =>
            index === 0 ? "0".repeat(64) : digest,
          ),
        }),
        signedAbsenceMutation({ absent: [false, true, true] }),
      ])
        expect(
          validateResolvedEvidence(finalLocators, withAbsenceOverride(finalResolver, mutation)),
        ).toBeUndefined();
      const finalResolverWithoutDurableResults = preResolver
        .cleanupSnapshotDeleting(captureRun.runId, captureRun.runAttempt, [
          ...rawArtifactTargetIds,
          completeResultsArtifactId,
        ])
        .seedReviewerAttestation(reviewerAttestation)
        .seedArtifactAbsence(absenceAttestation)
        .seedRun(cleanupRun)
        .seedArtifact(
          cleanupRun.runId,
          cleanupRun.runAttempt,
          cleanupArtifactId,
          cleanupRun.completedAtUtc,
          () => [cleanupProofBytes],
        )
        .seal();
      expect(
        validateResolvedEvidence(finalLocators, finalResolverWithoutDurableResults),
      ).toBeUndefined();
      const finalResolverWithoutDurableTransition = preResolver
        .cleanupSnapshotDeleting(captureRun.runId, captureRun.runAttempt, [
          ...rawArtifactTargetIds,
          transitionEvidenceArtifactId,
        ])
        .seedReviewerAttestation(reviewerAttestation)
        .seedArtifactAbsence(absenceAttestation)
        .seedRun(cleanupRun)
        .seedArtifact(
          cleanupRun.runId,
          cleanupRun.runAttempt,
          cleanupArtifactId,
          cleanupRun.completedAtUtc,
          () => [cleanupProofBytes],
        )
        .seal();
      expect(
        validateResolvedEvidence(finalLocators, finalResolverWithoutDurableTransition),
      ).toBeUndefined();
      const finalResolverWithoutAttestation = preResolver
        .cleanupSnapshotDeleting(captureRun.runId, captureRun.runAttempt, rawArtifactTargetIds)
        .seedRun(cleanupRun)
        .seedArtifact(
          cleanupRun.runId,
          cleanupRun.runAttempt,
          cleanupArtifactId,
          cleanupRun.completedAtUtc,
          () => [cleanupProofBytes],
        )
        .seedArtifactAbsence(absenceAttestation)
        .seal();
      expect(
        validateResolvedEvidence(finalLocators, finalResolverWithoutAttestation),
      ).toBeUndefined();
      const forgedReviewerAttestation = {
        ...reviewerAttestation,
        subjectId: "attacker_subject",
        displayName: "Elana Castillo",
        providerDigest: "",
      } as unknown as ResolvedReviewerAttestation;
      forgedReviewerAttestation.providerDigest = providerRecordDigest(
        "fluyo:r4b:reviewer-attestation:v1",
        record(forgedReviewerAttestation),
      );
      const forgedAttestationResolver = preResolver
        .cleanupSnapshotDeleting(captureRun.runId, captureRun.runAttempt, rawArtifactTargetIds)
        .seedRun(cleanupRun)
        .seedArtifact(
          cleanupRun.runId,
          cleanupRun.runAttempt,
          cleanupArtifactId,
          cleanupRun.completedAtUtc,
          () => [cleanupProofBytes],
        )
        .seedReviewerAttestation(forgedReviewerAttestation)
        .seedArtifactAbsence(absenceAttestation)
        .seal();
      expect(validateResolvedEvidence(finalLocators, forgedAttestationResolver)).toBeUndefined();
      const rawStillResolvableResolver = preResolver
        .cleanupSnapshotDeleting(captureRun.runId, captureRun.runAttempt, [
          rawStructuredBundleArtifactId,
          representativeBundleArtifactId,
        ])
        .seedRun(cleanupRun)
        .seedArtifact(
          cleanupRun.runId,
          cleanupRun.runAttempt,
          cleanupArtifactId,
          cleanupRun.completedAtUtc,
          () => [cleanupProofBytes],
        )
        .seedReviewerAttestation(reviewerAttestation)
        .seedArtifactAbsence(absenceAttestation)
        .seal();
      expect(validateResolvedEvidence(finalLocators, rawStillResolvableResolver)).toBeUndefined();
      const withBlobOverride = (
        original: EvidenceResolver,
        commit: string,
        path: string,
        bytes: Buffer,
      ): EvidenceResolver => ({
        resolveCommit: original.resolveCommit.bind(original),
        isAncestor: original.isAncestor.bind(original),
        resolveGitBlob: (candidateCommit, candidatePath) =>
          candidateCommit === commit && candidatePath === path
            ? {
                bytes,
                objectId: createHash("sha1").update(bytes).digest("hex"),
                sha256: bufferDigest(bytes),
              }
            : original.resolveGitBlob(candidateCommit, candidatePath),
        resolveWorkflowRun: original.resolveWorkflowRun.bind(original),
        resolveWorkflowArtifact: original.resolveWorkflowArtifact.bind(original),
        resolveReviewerAttestation: original.resolveReviewerAttestation.bind(original),
        resolveArtifactAbsence: original.resolveArtifactAbsence.bind(original),
      });
      const substitutedRawInventory = {
        ...rawArtifactInventory,
        targets: rawTargets.map((target, index) =>
          index === 0 ? { ...target, artifactDigest: "1".repeat(64) } : target,
        ),
      };
      const substitutedRawInventoryDigest = rawArtifactInventoryDigest(substitutedRawInventory);
      expect(
        validateResolvedEvidence(
          finalLocators,
          withBlobOverride(
            finalResolver,
            e1,
            reviewPath,
            canonicalJsonBytes({
              ...reviewRecord,
              rawArtifactInventory: substitutedRawInventory,
              rawArtifactInventoryDigest: substitutedRawInventoryDigest,
            }),
          ),
        ),
      ).toBeUndefined();
      const substitutedCleanupProof = {
        ...cleanupProof,
        rawArtifactInventory: substitutedRawInventory,
        rawArtifactInventoryDigest: substitutedRawInventoryDigest,
        rawArtifactTargetDigests: records(substitutedRawInventory.targets).map((target) =>
          String(target.artifactDigest),
        ),
      };
      const substitutedCleanupProofBytes = canonicalJsonBytes(substitutedCleanupProof);
      const substitutedCleanupRecord = {
        ...cleanupRecord,
        rawArtifactInventory: substitutedCleanupProof.rawArtifactInventory,
        rawArtifactInventoryDigest: substitutedCleanupProof.rawArtifactInventoryDigest,
        rawArtifactTargetDigests: substitutedCleanupProof.rawArtifactTargetDigests,
        cleanupArtifactHash: bufferDigest(substitutedCleanupProofBytes),
      };
      const substitutedCleanupMetadata = iterableMetadata(() => [substitutedCleanupProofBytes]);
      const e1E2InventoryMismatchResolver: EvidenceResolver = {
        resolveCommit: finalResolver.resolveCommit.bind(finalResolver),
        isAncestor: finalResolver.isAncestor.bind(finalResolver),
        resolveGitBlob: (commit, path) =>
          commit === e2 && path === cleanupPath
            ? {
                bytes: canonicalJsonBytes(substitutedCleanupRecord),
                objectId: createHash("sha1")
                  .update(canonicalJsonBytes(substitutedCleanupRecord))
                  .digest("hex"),
                sha256: bufferDigest(canonicalJsonBytes(substitutedCleanupRecord)),
              }
            : finalResolver.resolveGitBlob(commit, path),
        resolveWorkflowRun: finalResolver.resolveWorkflowRun.bind(finalResolver),
        resolveWorkflowArtifact: (runId, runAttempt, artifactId) =>
          runId === cleanupRun.runId &&
          runAttempt === cleanupRun.runAttempt &&
          artifactId === cleanupArtifactId
            ? {
                repository: r4bRepository,
                runId,
                runAttempt,
                artifactId,
                immutable: true,
                createdAtUtc: cleanupRun.completedAtUtc,
                ...substitutedCleanupMetadata,
                stream: () => [substitutedCleanupProofBytes],
              }
            : finalResolver.resolveWorkflowArtifact(runId, runAttempt, artifactId),
        resolveReviewerAttestation: finalResolver.resolveReviewerAttestation.bind(finalResolver),
        resolveArtifactAbsence: finalResolver.resolveArtifactAbsence.bind(finalResolver),
      };
      expect(
        validateResolvedEvidence(finalLocators, e1E2InventoryMismatchResolver),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence(
          finalLocators,
          withBlobOverride(
            finalResolver,
            e1,
            reviewPath,
            canonicalJsonBytes({ ...reviewRecord, reviewerIdentity: "Adriana Solano" }),
          ),
        ),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence(
          finalLocators,
          withBlobOverride(
            finalResolver,
            e1,
            reviewPath,
            canonicalJsonBytes({ ...reviewRecord, verdict: "FAIL" }),
          ),
        ),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence(
          finalLocators,
          withBlobOverride(
            finalResolver,
            e1,
            reviewPath,
            canonicalJsonBytes({ ...reviewRecord, completedAtUtc: captureRun.startedAtUtc }),
          ),
        ),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence(
          finalLocators,
          withBlobOverride(
            finalResolver,
            e2,
            cleanupPath,
            canonicalJsonBytes({ ...cleanupRecord, retainedArtifactCount: 1 }),
          ),
        ),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence(
          finalLocators,
          withBlobOverride(
            finalResolver,
            e2,
            cleanupPath,
            canonicalJsonBytes({ ...cleanupRecord, outcome: "FAILED" }),
          ),
        ),
      ).toBeUndefined();

      expect(
        validateResolvedEvidence({ ...preLocators, baselineSetId: "../escape" }, preResolver),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence({ ...preLocators, baselineApprovalCommit: p }, preResolver),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence(
          { ...preLocators, repository: "attacker/repository" },
          preResolver,
        ),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence({ ...finalLocators, reviewCommit: e2 }, finalResolver),
      ).toBeUndefined();
      expect(
        validateResolvedEvidence({ ...finalLocators, cleanupCommit: e1 }, finalResolver),
      ).toBeUndefined();
      gitFixture(temporaryRepositoryRoot, "checkout", "-b", "source-v2", s);
      const s2 = fixtureCommit(
        temporaryRepositoryRoot,
        { "src/r4b-source.txt": "changed source S2\n" },
        "test: mutate R4-B source fixture",
      );
      gitFixture(temporaryRepositoryRoot, "branch", "-f", "trusted-main", s2);
      expect(
        validateResolvedEvidence({ ...preLocators, sourceCommit: s2 }, preResolver),
      ).toBeUndefined();

      const shortInvalidFactory = (kind: "gap" | "duplicate" | "stale" | "extra") =>
        completeResultsFactory(
          s,
          captureRun,
          representative.resultOverrides,
          kind === "gap"
            ? { kind: "omit", ordinal: 1 }
            : kind === "duplicate"
              ? { kind: "duplicate", ordinal: 1 }
              : kind === "stale"
                ? { kind: "stale", ordinal: 1 }
                : { kind: "extra", ordinal: 86_400 },
        );
      for (const kind of ["gap", "duplicate", "stale", "extra"] as const) {
        const invalidResolver = new SealedFakeEvidenceResolver(temporaryRepositoryRoot)
          .seedRun(baselineRun)
          .seedArtifact(
            baselineRun.runId,
            baselineRun.runAttempt,
            "approved-baseline-bundle.json",
            baselineRun.completedAtUtc,
            () => [baselineArtifactBytes],
          )
          .seedRun(captureRun)
          .seedArtifact(
            captureRun.runId,
            captureRun.runAttempt,
            completeResultsArtifactId,
            captureRun.completedAtUtc,
            shortInvalidFactory(kind),
          )
          .seedArtifact(
            captureRun.runId,
            captureRun.runAttempt,
            representativeBundleArtifactId,
            captureRun.completedAtUtc,
            () => [representative.bytes],
          )
          .seal();
        const invalidCompleteArtifact = invalidResolver.resolveWorkflowArtifact(
          captureRun.runId,
          captureRun.runAttempt,
          completeResultsArtifactId,
        );
        expect(
          validateCompleteResults(
            invalidCompleteArtifact as ResolvedWorkflowArtifact,
            s,
            captureRun,
            new Set(representativeSemanticKeys()),
          ),
        ).toBeUndefined();
      }

      expect(() => preResolver.seedRun({ ...captureRun, conclusion: "failure" })).toThrow(
        "resolver sealed",
      );
      expect(record(catalog.evidence).runtimeExecutions).toBe(0);
      expect(record(catalog.evidence).cellStatus).toBe("UNATTEMPTED");
    } finally {
      rmSync(temporaryRepositoryRoot, { recursive: true, force: true });
    }
  }, 600_000);

  it("uses canonical duplicate-free safe JSON and rejects structural mutations", () => {
    expect(createHash("sha256").update(rawCatalog).digest("hex")).toBe(
      "93571a5b5068faa6f5ec4e93986f6555220e281730744df39984fec708255bf8",
    );
    exactKeys(catalog, topLevelKeys);
    expect(() => validateScalarSafety(catalog)).not.toThrow();
    expect(() =>
      parseStrictJson(
        rawCatalog.replace(
          '{\n  "schemaVersion": 1,',
          '{\n  "schemaVersion": 1,\n  "schemaVersion": 1,',
        ),
      ),
    ).toThrow(/duplicate/);
    expect(() => parseStrictJson(`${rawCatalog} true`)).toThrow(/trailing/);
    expect(() =>
      validateScalarSafety(
        parseStrictJson(
          rawCatalog.replace('"schemaVersion": 1', '"schemaVersion": 9007199254740992'),
        ),
      ),
    ).toThrow(/unsafe number/);
    expect(() =>
      validateScalarSafety(parseStrictJson(rawCatalog.replace("You’re", "Yu\\u0301ou’re"))),
    ).toThrow(/unsafe string/);
    expect(() =>
      validateScalarSafety(
        parseStrictJson(rawCatalog.replace("Sprint 6 R4-A", "Sprint 6 R4-A\\u0000")),
      ),
    ).toThrow(/unsafe string/);
    const missing = { ...catalog };
    delete missing.handoff;
    expect(Object.keys(missing)).not.toEqual(topLevelKeys);
    expect(Object.keys({ ...catalog, unknown: true })).not.toEqual(topLevelKeys);
    expect(Object.keys({ date: catalog.date, schemaVersion: catalog.schemaVersion })).not.toEqual(
      topLevelKeys.slice(0, 2),
    );
    const exactValueDigest = valueDigest(catalog);
    for (const family of [
      "flowContracts",
      "flowVariants",
      "dynamicCopyRules",
      "exitDialogContexts",
      "exitDialogs",
      "modalInteractionContract",
      "states",
      "stateVariants",
      "stateActionContracts",
      "stateFixtureVariants",
      "visual",
      "matrix",
      "evidence",
      "contrast",
      "nonCoerciveBoundary",
      "provenance",
      "phaseBoundary",
      "handoff",
    ]) {
      const added = structuredClone(catalog);
      const familyValue = added[family];
      const target = Array.isArray(familyValue) ? record(familyValue[0]) : record(familyValue);
      target.unknown = true;
      expect(valueDigest(added)).not.toBe(exactValueDigest);

      const removed = structuredClone(catalog);
      const removedFamily = removed[family];
      const removedTarget = Array.isArray(removedFamily)
        ? record(removedFamily[0])
        : record(removedFamily);
      delete removedTarget[Object.keys(removedTarget)[0]!];
      expect(valueDigest(removed)).not.toBe(exactValueDigest);

      const reordered = structuredClone(catalog);
      const reorderedFamily = reordered[family];
      const reorderedTarget = Array.isArray(reorderedFamily)
        ? record(reorderedFamily[0])
        : record(reorderedFamily);
      const reversed = Object.fromEntries(Object.entries(reorderedTarget).reverse());
      if (Array.isArray(reorderedFamily)) reorderedFamily[0] = reversed;
      else reordered[family] = reversed;
      expect(valueDigest(reordered)).not.toBe(exactValueDigest);
    }
  });

  it("is exactly the two-file zero-runtime phase and binds authority", () => {
    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.status).toBe("repository_specification_only");
    expect(catalog.authority).toEqual([adrPath, planPath, reportPath]);
    expect(catalog.transitionDigest).toBe(
      "7cef0f307e365ec4f2ee0e8c83a2b8f0bb56401e6d8ccabafdf4008cea3631e9",
    );
    const transitions = parseStrictJson(
      rawJsonAfter(plan, "Canonical ordered learning transition manifest"),
    );
    expect(records(transitions)).toHaveLength(48);
    expect(createHash("sha256").update(JSON.stringify(transitions)).digest("hex")).toBe(
      catalog.transitionDigest,
    );
    expect(adr).toContain(`exact canonical digest is \`${catalog.transitionDigest}\``);
    const boundary = record(catalog.phaseBoundary);
    expect(boundary.changedPaths).toEqual([specPath, testPath]);
    expect(boundary.runtimeBrowserAtExecutions).toBe(0);
    expect(boundary.unattemptedCells).toBe(10_800);
    expect(boundary.unattemptedArtifacts).toBe(86_400);
    expect(boundary.forbiddenChanges).toEqual([
      "ui_runtime",
      "route",
      "dependency",
      "package_lock",
      "fixture_switch",
      "telemetry",
      "schema",
      "workflow",
      "native_surface",
      "production_configuration",
      "external_action",
    ]);
  });

  it("locks exact flow, state, presentation, and reading-order arrays", () => {
    expect(catalog.flowIds).toEqual(flowIds);
    expect(catalog.flowContractFields).toEqual(flowContractFields);
    expect(catalog.flowContracts).toEqual(expectedFlowContracts);
    records(catalog.flowContracts).forEach((flow) => exactKeys(flow, flowContractFields));
    expect(records(catalog.flowContracts).map(({ flowId }) => flowId)).toEqual(flowIds);
    expect(catalog.stateIds).toEqual(stateIds);
    expect(records(catalog.states).map(({ stateId }) => stateId)).toEqual(stateIds);
    const fields = [
      "stateId",
      "heading",
      "body",
      "primaryAction",
      "preservationRule",
      "safeDestination",
      "focusAnnouncement",
      "noProgressRule",
      "visualTreatment",
    ];
    expect(catalog.statePresentationFields).toEqual(fields);
    records(catalog.states).forEach((state) => exactKeys(state, fields));
    expect(catalog.readingOrder).toEqual([
      "skip_link",
      "top_bar_back",
      "named_progress",
      "single_h1",
      "prompt_instructions",
      "response_group",
      "feedback_recovery_status",
      "action_region",
    ]);
  });

  it("locks learner copy and validates dynamic feedback, action, and retry fallbacks", () => {
    expect(catalog.dynamicCopyRuleFields).toEqual(dynamicCopyRuleFields);
    expect(catalog.dynamicCopyRules).toEqual(expectedDynamicCopyRules);
    records(catalog.dynamicCopyRules).forEach((rule) => exactKeys(rule, dynamicCopyRuleFields));
    expect(records(catalog.dynamicCopyRules).map(({ ruleId }) => ruleId)).toEqual([
      "confirmed_feedback_body",
      "confirmed_result_action",
      "retryable_error_variant",
    ]);
    const flowById = new Map(records(catalog.flowContracts).map((flow) => [flow.flowId, flow]));
    const stateById = new Map(records(catalog.states).map((state) => [state.stateId, state]));
    expect(flowById.get("answer")).toMatchObject({
      heading: "Choose your answer",
      body: "Select one answer, then check it.",
      primaryAction: "Check answer",
    });
    expect(flowById.get("confirmed_feedback")).toMatchObject({
      heading: "Your result",
      body: "Your result was confirmed.",
      primaryAction: confirmedActionReference,
    });
    expect(flowById.get("continue_or_finish")).toMatchObject({
      heading: "Continue or finish",
      body: "Your result is confirmed. Choose the available next step.",
      primaryAction: confirmedActionReference,
    });
    expect(stateById.get("ACTIVE")).toMatchObject({
      heading: "Choose your answer",
      body: "Select one answer, then check it.",
      primaryAction: "Check answer",
    });
    expect(stateById.get("CONFIRMED")).toMatchObject({
      heading: "Your result",
      body: "Your result was confirmed.",
      primaryAction: confirmedActionReference,
    });
    expect(stateById.get("RETRYABLE_ERROR")).toMatchObject({
      heading: "We couldn’t finish that",
      body: "Nothing changed. Check your connection and try again.",
      primaryAction: "Try again",
    });
    expect(resolveServerFeedback("You used the right form.")).toBe("You used the right form.");
    expect(resolveServerFeedback("Correct")).toBe("Correct");
    const maximumByteFeedback = "😀".repeat(128);
    const maximumGraphemeFeedback = "a".repeat(serverFeedbackMaxGraphemes);
    const overByteFeedback = "😀".repeat(129);
    const overGraphemeFeedback = "a".repeat(serverFeedbackMaxGraphemes + 1);
    expect(Buffer.byteLength(maximumByteFeedback, "utf8")).toBe(serverFeedbackMaxUtf8Bytes);
    expect(serverFeedbackGraphemeCount(maximumGraphemeFeedback)).toBe(serverFeedbackMaxGraphemes);
    expect(resolveServerFeedback(maximumByteFeedback)).toBe(maximumByteFeedback);
    expect(resolveServerFeedback(maximumGraphemeFeedback)).toBe(maximumGraphemeFeedback);
    expect(Buffer.byteLength(overByteFeedback, "utf8")).toBeGreaterThan(serverFeedbackMaxUtf8Bytes);
    expect(serverFeedbackGraphemeCount(overGraphemeFeedback)).toBeGreaterThan(
      serverFeedbackMaxGraphemes,
    );
    for (const invalid of [
      "",
      "   ",
      " Leading space",
      "Trailing space ",
      "Cafe\u0301",
      "<b>Correct</b>",
      "&lt;b&gt;Correct&lt;/b&gt;",
      "**Correct**",
      "`Correct`",
      "~~Correct~~",
      "~~~Correct~~~",
      "---",
      "- - -",
      "[Correct](javascript:alert(1))",
      "data:text/html,Correct",
      "intent://feedback/Correct",
      "chrome-extension://abcdefghijklmnop/feedback",
      "custom+feedback:Correct",
      "reviewer@example.com",
      "+1 (202) 555-0123",
      "+44 20 7946 0958",
      "Call +1/202/555/0123",
      "Call +1\u00a0202\u00a0555\u00a00123",
      "Call +1\u202f202\u202f555\u202f0123",
      "Call +1\u00b7202\u00b7555\u00b70123",
      "Call +١ ٢٠٢ ٥٥٥ ٠١٢٣",
      "https://private.example/result?token=abc",
      "private.internal.example",
      "?debug=true",
      "GitHub provider",
      "error stack trace",
      "correlation code abc",
      "state=abc nonce=def verifier=ghi",
      "credential sessionId=abc",
      "requestId=abc account_id=def",
      "deviceId=abc",
      "profile_id=abc",
      "installId=abc",
      "appSetId=abc",
      "advertising_id=abc",
      "deviceUuid=abc",
      "profileGuid:abc",
      "opaque_id=abc",
      "sessionUUID:abc",
      "9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f",
      "{9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f}",
      "9f8e7d6c5b4a4c3d8e2f1a0b9c8d7e6f",
      "C:\\private\\trace.txt",
      "/home/reviewer/trace.txt",
      "/workspace/private/trace.txt",
      "src/private/trace.txt",
      "packages\\private\\trace.txt",
      "src%2Ffoo%2Fbar",
      "src%5Cfoo%5Cbar",
      "src∕foo∕bar",
      "src⁄foo⁄bar",
      "src＼foo＼bar",
      "src∖foo∖bar",
      "src⧹foo⧹bar",
      "src%E2%88%95foo%E2%88%95bar",
      "%2e%2e%2Fsrc%2Fprivate",
      "src%",
      "src%2",
      "src%GGfoo",
      "src%E2%88foo",
      "src%252Ffoo%252Fbar",
      "%252e%252e%252Fsrc%252Fprivate",
      "src%25E2%2588%2595foo",
      "token=secret",
      "failure\u0000detail",
      "Correct\u202e",
      "Correct\u2066",
      "Correct\u200d",
      overByteFeedback,
      overGraphemeFeedback,
    ])
      expect(resolveServerFeedback(invalid)).toBe(feedbackFallback);
    const validTypedReferences = new Set([
      ...records(catalog.flowContracts).map(({ flowId }) => `flow:${String(flowId)}`),
      ...records(catalog.states).map(({ stateId }) => `state:${String(stateId)}`),
      ...records(catalog.stateVariants).map(
        ({ variantId }) => `state_variant:${String(variantId)}`,
      ),
    ]);
    records(catalog.dynamicCopyRules).forEach((rule) => {
      expect(Array.isArray(rule.appliesTo)).toBe(true);
      expect(strings(rule.appliesTo).length).toBeGreaterThan(0);
      expect(new Set(strings(rule.appliesTo)).size).toBe(strings(rule.appliesTo).length);
      expect(
        strings(rule.appliesTo).every((reference) => validTypedReferences.has(reference)),
      ).toBe(true);
    });
    const dynamicActionOwners = [
      flowById.get("confirmed_feedback"),
      flowById.get("continue_or_finish"),
      stateById.get("CONFIRMED"),
    ];
    expect(dynamicActionOwners.map((owner) => owner?.primaryAction)).toEqual([
      confirmedActionReference,
      confirmedActionReference,
      confirmedActionReference,
    ]);
    expect(JSON.stringify(dynamicActionOwners)).not.toContain("Continue or Finish");
    expect(
      records(catalog.stateVariants)
        .filter(({ variantId }) => confirmedVariantIds.includes(variantId as never))
        .map(({ primaryAction }) => primaryAction),
    ).toEqual(["Continue", "Finish", "Continue", "Finish"]);
    const confirmedVariants = records(catalog.stateVariants).filter(({ variantId }) =>
      confirmedVariantIds.includes(variantId as never),
    );
    expect(confirmedVariants.map(({ body }) => body)).toEqual(
      confirmedVariantIds.map(() => confirmedFeedbackBodyReference),
    );
    records(catalog.flowContracts).forEach((flow) =>
      expect(validRenderableBody(flow.body, false)).toBe(true),
    );
    records(catalog.states).forEach((state) =>
      expect(validRenderableBody(state.body, false)).toBe(true),
    );
    records(catalog.stateVariants).forEach((variant) =>
      expect(
        validRenderableBody(variant.body, confirmedVariantIds.includes(variant.variantId as never)),
      ).toBe(true),
    );
    for (const forbiddenInstruction of forbiddenRenderableBodyInstructions)
      expect(
        [catalog.flowContracts, catalog.states, catalog.stateVariants].some((collection) =>
          JSON.stringify(collection).includes(forbiddenInstruction),
        ),
      ).toBe(false);
    expect(
      validRenderableBody(
        "Show non-empty server feedback; otherwise show Your result was confirmed.",
        true,
      ),
    ).toBe(false);
    expect(validRenderableBody({ kind: "dynamic_copy", ruleId: "unknown" }, true)).toBe(false);
    expect(validRenderableBody(confirmedFeedbackBodyReference, false)).toBe(false);
    const resolveAction = (nextActivityAvailable: boolean) =>
      nextActivityAvailable ? "Continue" : "Finish";
    expect([resolveAction(true)]).toEqual(["Continue"]);
    expect([resolveAction(false)]).toEqual(["Finish"]);
    expect(JSON.stringify(catalog.flowContracts)).not.toContain(
      "Render the full server prompt and one named radio group.",
    );
    expect(JSON.stringify(catalog.flowContracts)).not.toContain(
      "Show Continue only for another server-selected activity; otherwise show Finish.",
    );
    expect(JSON.stringify(catalog.states)).not.toContain(
      "Submit recovery states that the answer wasn’t confirmed.",
    );
  });

  it("locks modal-only focus stops, inert background, dismissal, and invoker return", () => {
    expect(catalog.modalInteractionContractFields).toEqual(modalInteractionContractFields);
    expect(catalog.modalInteractionContract).toEqual(expectedModalInteractionContract);
    exactKeys(catalog.modalInteractionContract, modalInteractionContractFields);
    const dialogCell = {
      stateId: "ACTIVE",
      viewportId: "phone_320x568",
      themeId: "light",
      localeId: "en",
      textScaleId: "browser_zoom_100",
      fixtureId: "late_confirmation_after_exit",
    };
    const focusArtifact = syntheticFocus(dialogCell);
    expect(validFocusArtifact(focusArtifact, dialogCell)).toBe(true);
    expect(records(focusArtifact.stops).map((stop) => record(stop.target).targetId)).toEqual([
      "exit_stay",
      "exit_leave",
    ]);
    expect(record(record(focusArtifact.initialFocus).target).targetId).toBe("exit_stay");
    expect(record(record(focusArtifact.finalFocus).target).targetId).toBe("invoking_exit_control");
    const backgroundStop = {
      ...records(focusArtifact.stops)[0],
      order: 3,
      target: {
        ...record(records(focusArtifact.stops)[0]?.target),
        targetId: "state_heading",
        roleId: "heading",
      },
    };
    expect(
      validFocusArtifact(
        { ...focusArtifact, stops: [...records(focusArtifact.stops), backgroundStop] },
        dialogCell,
      ),
    ).toBe(false);
    expect(
      validFocusArtifact(
        { ...focusArtifact, initialFocus: { kind: "document", target: null } },
        dialogCell,
      ),
    ).toBe(false);
    expect(
      validFocusArtifact(
        {
          ...focusArtifact,
          finalFocus: {
            kind: "element",
            target: record(records(focusArtifact.stops)[1]?.target),
          },
        },
        dialogCell,
      ),
    ).toBe(false);
    for (const mutation of [
      { tabbableIds: ["exit_dialog", "exit_stay", "exit_leave"] },
      { initialFocusId: "exit_leave" },
      { escapeEffect: "Leave activity" },
      { backdropEffect: "Leave activity" },
      { backgroundAccessibilityTree: "traversable" },
      { dismissalAnnouncement: "Dialog closed" },
    ])
      expect({ ...expectedModalInteractionContract, ...mutation }).not.toEqual(
        catalog.modalInteractionContract,
      );
  });

  it("locks the separate 49-record run-level transition evidence without changing cell counts", () => {
    const evidence = record(catalog.evidence);
    const transition = record(evidence.transitionEvidence);
    const expectedRecords = expectedTransitionEvidenceRecords();
    expect(Object.keys(transition)).toEqual([
      "artifactId",
      "artifactClass",
      "resolverLocatorFields",
      "manifestBindingFields",
      "reviewBinding",
      "privacyValidation",
      "retention",
      "rawCleanupTarget",
      "perCellArtifact",
      "newMatrixAxis",
      "recordCount",
      "entryContextIds",
      "presentationIdFormat",
      "presentationIds",
      "fieldOrder",
      "deduplicationKeyFormat",
      "deduplicationKeyRetention",
      "staleEventRule",
      "records",
    ]);
    expect(transition).toMatchObject({
      artifactId: "transition-evidence.json",
      artifactClass: "sanitized_durable_run_level_evidence",
      resolverLocatorFields: transitionEvidenceLocatorFields,
      manifestBindingFields: [
        "transitionEvidenceLocator",
        "transitionEvidenceHash",
        "transitionEvidenceByteSize",
        "transitionEvidenceValidationDigest",
      ],
      rawCleanupTarget: false,
      perCellArtifact: false,
      newMatrixAxis: false,
      recordCount: 49,
      entryContextIds: [
        "direct_load",
        "client_transition",
        "same_screen_refresh",
        "connectivity_lost",
        "connectivity_restored",
      ],
      presentationIdFormat:
        "base_state_without_variants_or_exact_STATE:variant_reference_validated_against_closed_stateVariants_ownership",
      presentationIds: transitionPresentationContracts.map(([presentationId]) => presentationId),
      fieldOrder: transitionEvidenceFields,
      deduplicationKeyFormat: "authGeneration|operationId|entryContextId|targetPresentationId",
      deduplicationKeyRetention:
        "memory_only_runtime_key_never_retained_in_R4A_contract_templates_or_product_logs",
      staleEventRule:
        "stale_canceled_late_or_exited_events_cause_no_focus_announcement_navigation_or_progress",
    });
    expect(transition.records).toEqual(expectedRecords);
    const transitionAuthority = record(evidence.transitionEvidenceAuthority);
    expect(transitionAuthority).toMatchObject({
      artifactId: transitionEvidenceArtifactId,
      artifactClass: "sanitized_durable_run_level_evidence",
      rawCleanupTarget: false,
    });
    expect(JSON.stringify(rawArtifactTargetIds)).not.toContain(transitionEvidenceArtifactId);
    const payload = transitionEvidencePayload("a".repeat(40), "1001", 1);
    exactKeys(payload, transitionEvidenceArtifactFields);
    expect(payload).toMatchObject({
      recordCount: 49,
      records: expectedRecords,
      privacyScanStatus: "PASS",
      retentionClass: "SANITIZED_DURABLE_THROUGH_FINALIZED",
      status: "SIMULATED_CONTRACT_ONLY",
    });
    expect(payload.validationDigest).toBe(transitionEvidenceValidationDigest(payload));
    expect(expectedRecords).toHaveLength(49);
    expect(transitionPresentationContracts).toHaveLength(15);
    expect(
      transitionPresentationContracts.every(([presentationId]) =>
        validTransitionPresentationId(presentationId),
      ),
    ).toBe(true);
    for (const invalidPresentationId of [
      "CONFIRMED_CORRECT_CONTINUE",
      "CONFIRMED",
      "RETRYABLE_ERROR",
      "OFFLINE_READ_ONLY",
      "CONFIRMED:retryable_error_prepare",
      "RETRYABLE_ERROR:confirmed_correct_continue",
      "OFFLINE_READ_ONLY:unknown_variant",
      "UNKNOWN:confirmed_correct_continue",
      "CONFIRMED:confirmed_correct_continue:extra",
    ])
      expect(validTransitionPresentationId(invalidPresentationId)).toBe(false);
    expectedRecords.forEach((entry, index) => {
      exactKeys(entry, transitionEvidenceFields);
      expect(entry.sequence).toBe(index + 1);
      expect(entry.observedFocusTargetId).toBeNull();
      expect(entry.observedFocusMoveCount).toBeNull();
      expect(entry.observedAnnouncementMode).toBeNull();
      expect(entry.observedAnnouncementCount).toBeNull();
      expect(entry.observedAnnouncementText).toBeNull();
      expect(entry.deduplicationKey).toBeNull();
      expect(entry.noProgressMutation).toBe(true);
      expect(entry.verdict).toBe("SIMULATED_CONTRACT_ONLY");
      expect(
        entry.sourcePresentationId === "none" ||
          entry.sourcePresentationId === "current_presentation" ||
          validTransitionPresentationId(entry.sourcePresentationId),
      ).toBe(true);
      expect(validTransitionPresentationId(entry.targetPresentationId)).toBe(true);
    });
    expect(
      Object.fromEntries(
        [
          "direct_load",
          "client_transition",
          "same_screen_refresh",
          "connectivity_lost",
          "connectivity_restored",
        ].map((entryContextId) => [
          entryContextId,
          expectedRecords.filter((record) => record.entryContextId === entryContextId).length,
        ]),
      ),
    ).toEqual({
      direct_load: 15,
      client_transition: 15,
      same_screen_refresh: 15,
      connectivity_lost: 2,
      connectivity_restored: 2,
    });
    expect(new Set(expectedRecords.map(({ deduplicationKey }) => deduplicationKey))).toEqual(
      new Set([null]),
    );
    expect(JSON.stringify(expectedRecords)).not.toContain('"verdict":"PASS"');
    expect(evidence.artifactIds).toEqual(artifactIds);
    expect(record(catalog.matrix).cellCount).toBe(10_800);
    expect(record(catalog.phaseBoundary).unattemptedArtifacts).toBe(86_400);
    for (const mutation of [
      expectedRecords.slice(1),
      [...expectedRecords, expectedRecords[0]!],
      [...expectedRecords].reverse(),
      expectedRecords.map((record, index) =>
        index === 0 ? { ...record, expectedAnnouncementMode: "unknown" } : record,
      ),
      expectedRecords.map((record, index) =>
        index === 16 ? { ...record, observedFocusTargetId: "state_heading" } : record,
      ),
      expectedRecords.map((record, index) =>
        index === 16 ? { ...record, deduplicationKey: "synthetic-key" } : record,
      ),
      expectedRecords.map((record, index) =>
        index === 16 ? { ...record, verdict: "PASS" } : record,
      ),
      expectedRecords.map((record, index) =>
        index === 47 ? { ...record, triggerId: "connectivity_restored" } : record,
      ),
      expectedRecords.map((record, index) =>
        index === 3
          ? { ...record, targetPresentationId: "CONFIRMED:retryable_error_prepare" }
          : record,
      ),
      expectedRecords.map((record, index) =>
        index === 7 ? { ...record, targetPresentationId: "RETRYABLE_ERROR" } : record,
      ),
      expectedRecords.map((record, index) =>
        index === 13
          ? { ...record, targetPresentationId: "OFFLINE_READ_ONLY:unknown_variant" }
          : record,
      ),
    ])
      expect(mutation).not.toEqual(transition.records);
  });

  it("locks editable-goal, confirmed-progress, and exit-dialog branches", () => {
    expect(catalog.flowVariantFields).toEqual(flowVariantFields);
    const flowVariants = records(catalog.flowVariants);
    flowVariants.forEach((variant) => exactKeys(variant, flowVariantFields));
    expect(flowVariants.map(({ variantId }) => variantId)).toEqual([
      "editable_goal_saving",
      "editable_goal_error",
      "editable_goal_unchanged",
      "confirmed_progress_changed",
    ]);
    expect(flowVariants.map(({ guard }) => guard)).toEqual([
      "saveStatus=pending",
      "saveStatus=failed",
      "proposedGoal=confirmedGoal",
      "confirmedCountChanged=true",
    ]);
    expect(flowVariants[1]).toMatchObject({
      heading: "We couldn’t save your goal",
      body: "Your previous goal is unchanged. Check your connection and try again.",
      primaryAction: "Try again",
    });
    expect(flowVariants[3]?.semanticContract).toBe(
      "role_progressbar_aria_label_Today’s_goal_progress_aria_valuemin_0_aria_valuenow_min_confirmedCount_dailyTarget_aria_valuemax_dailyTarget_visual_width_min_confirmedCount_dailyTarget_divided_by_dailyTarget_capped_at_100_percent_aria_valuetext_and_announcement_use_uncapped_confirmedCount_of_dailyTarget_activities_complete_today",
    );
    expect(confirmedProgressSemantics(2, 5)).toEqual({
      role: "progressbar",
      ariaLabel: "Today’s goal progress",
      ariaValueMin: 0,
      ariaValueNow: 2,
      ariaValueMax: 5,
      visualWidthPercent: 40,
      ariaValueText: "2 of 5 activities complete today",
      announcement: "2 of 5 activities complete today",
    });
    expect(confirmedProgressSemantics(5, 5)).toMatchObject({
      ariaValueNow: 5,
      ariaValueMax: 5,
      visualWidthPercent: 100,
      ariaValueText: "5 of 5 activities complete today",
    });
    expect(confirmedProgressSemantics(7, 5)).toMatchObject({
      ariaValueNow: 5,
      ariaValueMax: 5,
      visualWidthPercent: 100,
      ariaValueText: "7 of 5 activities complete today",
      announcement: "7 of 5 activities complete today",
    });
    expect(catalog.exitDialogFields).toEqual(exitDialogFields);
    expect(catalog.exitDialogContextFields).toEqual(exitDialogContextFields);
    const contexts = records(catalog.exitDialogContexts);
    contexts.forEach((context) => exactKeys(context, exitDialogContextFields));
    expect(contexts).toEqual([
      {
        contextId: "active_with_answer",
        stateId: "ACTIVE",
        variantId: null,
        guard: "unconfirmedAnswerPresent=true",
        dialogId: "exit_unconfirmed_answer",
        stayEffect: "preserve_answer_and_return_focus_to_invoking_exit_control",
        leaveEffect: "clear_unconfirmed_answer_and_attempt_context_then_return_to_learning",
        noProgressRule: "stay_leave_escape_and_backdrop_never_change_confirmed_progress",
      },
      {
        contextId: "retryable_submit_with_answer",
        stateId: "RETRYABLE_ERROR",
        variantId: "retryable_error_submit",
        guard: "unconfirmedAnswerPresent=true;idempotencyKeyPresent=true",
        dialogId: "exit_unconfirmed_answer",
        stayEffect: "preserve_answer_and_idempotency_key_and_return_focus_to_invoking_exit_control",
        leaveEffect: "clear_unconfirmed_answer_and_idempotency_key_then_return_to_learning",
        noProgressRule: "stay_leave_escape_and_backdrop_never_confirm_result_or_change_progress",
      },
      {
        contextId: "offline_active_with_answer",
        stateId: "OFFLINE_READ_ONLY",
        variantId: "offline_read_only_active",
        guard: "unconfirmedAnswerPresent=true",
        dialogId: "exit_unconfirmed_answer",
        stayEffect: "preserve_session_memory_answer_and_return_focus_to_invoking_exit_control",
        leaveEffect: "clear_session_memory_answer_then_return_to_learning",
        noProgressRule: "stay_leave_escape_and_backdrop_never_submit_complete_or_change_progress",
      },
      {
        contextId: "submitting_in_flight",
        stateId: "SUBMITTING",
        variantId: null,
        guard: "requestInFlight=true",
        dialogId: "exit_submitting",
        stayEffect: "preserve_submission_context_and_return_focus_to_invoking_exit_control",
        leaveEffect: "fence_late_response_clear_local_wait_state_and_return_to_learning",
        noProgressRule: "stay_leave_escape_and_backdrop_never_synthesize_confirmation_or_progress",
      },
    ]);
    expect(new Set(contexts.map(({ contextId }) => contextId)).size).toBe(4);
    expect(contexts.filter(({ dialogId }) => dialogId === "exit_unconfirmed_answer")).toHaveLength(
      3,
    );
    expect(contexts.filter(({ dialogId }) => dialogId === "exit_submitting")).toHaveLength(1);
    const dialogs = records(catalog.exitDialogs);
    dialogs.forEach((dialog) => exactKeys(dialog, exitDialogFields));
    expect(dialogs.map(({ dialogId, guard }) => ({ dialogId, guard }))).toEqual([
      {
        dialogId: "exit_unconfirmed_answer",
        guard:
          "contextId=active_with_answer|retryable_submit_with_answer|offline_active_with_answer",
      },
      { dialogId: "exit_submitting", guard: "state=SUBMITTING;requestInFlight=true" },
    ]);
    expect(dialogs[0]).toMatchObject({
      heading: "Leave this activity?",
      body: "Your unsubmitted answer will be discarded.",
      initialFocus: "Stay",
      primaryAction: "Stay",
      secondaryAction: "Leave activity",
      dismissRule: "Escape_or_backdrop_equals_Stay",
      focusReturn: "invoking_exit_control",
      preservationRule:
        "Stay_preserves_context_scoped_answer_and_key_Leave_clears_only_context_scoped_unconfirmed_answer_and_key",
      noProgressRule: "opening_dismissing_or_leaving_never_changes_progress",
    });
    const missingContext = contexts.slice(1);
    const duplicateContext = [...contexts, contexts[0]!];
    const wrongVariant = contexts.map((context) =>
      context.contextId === "retryable_submit_with_answer"
        ? { ...context, variantId: "retryable_error_prepare" }
        : context,
    );
    expect(missingContext).not.toEqual(contexts);
    expect(new Set(duplicateContext.map(({ contextId }) => contextId)).size).not.toBe(
      duplicateContext.length,
    );
    expect(wrongVariant).not.toEqual(contexts);
    expect(
      dialogs.map(({ initialFocus, primaryAction, secondaryAction, dismissRule, motionId }) => ({
        initialFocus,
        primaryAction,
        secondaryAction,
        dismissRule,
        motionId,
      })),
    ).toEqual([
      {
        initialFocus: "Stay",
        primaryAction: "Stay",
        secondaryAction: "Leave activity",
        dismissRule: "Escape_or_backdrop_equals_Stay",
        motionId: "entry",
      },
      {
        initialFocus: "Stay",
        primaryAction: "Stay",
        secondaryAction: "Leave activity",
        dismissRule: "Escape_or_backdrop_equals_Stay",
        motionId: "entry",
      },
    ]);
  });

  it("locks confirmed, retry, and offline variants with exact guards and copy", () => {
    expect(catalog.stateVariantFields).toEqual(stateVariantFields);
    const variants = records(catalog.stateVariants);
    variants.forEach((variant) => exactKeys(variant, stateVariantFields));
    expect(variants.map(({ variantId }) => variantId)).toEqual([
      "confirmed_correct_continue",
      "confirmed_correct_finish",
      "confirmed_incorrect_continue",
      "confirmed_incorrect_finish",
      "retryable_error_prepare",
      "retryable_error_submit",
      "offline_read_only_prepare",
      "offline_read_only_active",
    ]);
    expect(variants.map(({ guard }) => guard)).toEqual([
      "result=correct;nextActivityAvailable=true",
      "result=correct;nextActivityAvailable=false",
      "result=incorrect;nextActivityAvailable=true",
      "result=incorrect;nextActivityAvailable=false",
      "retryOrigin=prepare",
      "retryOrigin=submit",
      "offlineOrigin=prepare",
      "offlineOrigin=active",
    ]);
    expect(variants.map(({ primaryAction }) => primaryAction)).toEqual([
      "Continue",
      "Finish",
      "Continue",
      "Finish",
      "Try again",
      "Try again",
      "Try again",
      "Try again",
    ]);
    expect(variants.map(({ heading }) => heading)).toEqual([
      "Correct",
      "Correct",
      "Not quite",
      "Not quite",
      "We couldn’t load the activity",
      "We couldn’t check your answer",
      "You’re offline",
      "You’re offline",
    ]);
    expect(variants[5]?.body).toBe(
      "Your answer wasn’t confirmed. Try again to finish checking it.",
    );
    expect(variants[7]?.body).toBe("Your answer is kept for this session. Reconnect to check it.");
    expect(
      variants.every((v) =>
        [v.preservationRule, v.safeDestination, v.focusAnnouncement, v.noProgressRule].every(
          (x) => typeof x === "string" && x.length > 0,
        ),
      ),
    ).toBe(true);
  });

  it("locks one exact primary action for every accepted state and variant", () => {
    expect(catalog.stateActionContractFields).toEqual(stateActionContractFields);
    const contracts = records(catalog.stateActionContracts);
    contracts.forEach((contract) => exactKeys(contract, stateActionContractFields));
    expect(contracts).toEqual([
      { stateId: "PREPARING", variantId: null, primaryActionId: "none" },
      { stateId: "ACTIVE", variantId: null, primaryActionId: "check_answer" },
      { stateId: "SUBMITTING", variantId: null, primaryActionId: "none" },
      {
        stateId: "CONFIRMED",
        variantId: "confirmed_correct_continue",
        primaryActionId: "continue",
      },
      {
        stateId: "CONFIRMED",
        variantId: "confirmed_correct_finish",
        primaryActionId: "finish",
      },
      {
        stateId: "CONFIRMED",
        variantId: "confirmed_incorrect_continue",
        primaryActionId: "continue",
      },
      {
        stateId: "CONFIRMED",
        variantId: "confirmed_incorrect_finish",
        primaryActionId: "finish",
      },
      {
        stateId: "RETRYABLE_ERROR",
        variantId: "retryable_error_prepare",
        primaryActionId: "try_again",
      },
      {
        stateId: "RETRYABLE_ERROR",
        variantId: "retryable_error_submit",
        primaryActionId: "try_again",
      },
      { stateId: "STALE_CONTENT", variantId: null, primaryActionId: "refresh_activity" },
      { stateId: "SESSION_ENDED", variantId: null, primaryActionId: "sign_in" },
      {
        stateId: "ACCESS_BLOCKED",
        variantId: null,
        primaryActionId: "return_to_learning",
      },
      {
        stateId: "EMPTY_REVIEW",
        variantId: null,
        primaryActionId: "continue_learning",
      },
      {
        stateId: "OFFLINE_READ_ONLY",
        variantId: "offline_read_only_prepare",
        primaryActionId: "try_again",
      },
      {
        stateId: "OFFLINE_READ_ONLY",
        variantId: "offline_read_only_active",
        primaryActionId: "try_again",
      },
    ]);
    expect(
      new Set(contracts.map(({ stateId, variantId }) => `${stateId}:${String(variantId)}`)).size,
    ).toBe(contracts.length);
    expect(
      records(catalog.stateVariants).every((variant) =>
        contracts.some(
          (contract) =>
            contract.stateId === variant.stateId && contract.variantId === variant.variantId,
        ),
      ),
    ).toBe(true);
    expect(
      stateIds.every((stateId) => contracts.some((contract) => contract.stateId === stateId)),
    ).toBe(true);
  });

  it("locks 150 state-fixture variants and reconstructs all 10,800 cells without a new axis", () => {
    expect(catalog.stateFixtureVariantFields).toEqual(stateFixtureVariantFields);
    const assignments = records(catalog.stateFixtureVariants);
    expect(assignments).toHaveLength(150);
    assignments.forEach((assignment) => exactKeys(assignment, stateFixtureVariantFields));
    expect(assignments).toEqual(expectedStateFixtureVariantRecords());
    expect(
      new Set(assignments.map(({ stateId, fixtureId }) => `${stateId}:${fixtureId}`)).size,
    ).toBe(150);
    expect(
      new Set(
        assignments.map(({ variantId }) => variantId).filter((variantId) => variantId !== null),
      ),
    ).toEqual(new Set(records(catalog.stateVariants).map(({ variantId }) => variantId)));
    const cells = closedCellRecords();
    const reconstructed = closedCellVariantRecords();
    expect(reconstructed).toHaveLength(10_800);
    reconstructed.forEach((entry, index) => {
      expect(Object.keys(entry)).toEqual([...identityFields, "variantId"]);
      expect(Object.fromEntries(identityFields.map((field) => [field, entry[field]]))).toEqual(
        cells[index],
      );
      expect(entry.variantId).toBe(stateFixtureVariant(entry.stateId, entry.fixtureId)?.variantId);
    });
    expect(catalog.matrix).not.toHaveProperty("variantIds");
    expect(record(catalog.matrix).cellCount).toBe(10_800);
  });

  it("locks tokens, six layouts, component geometry, focus, and exact motion ownership", () => {
    const visual = record(catalog.visual);
    exactKeys(visual, [
      "concept",
      "scopedTokens",
      "semanticContrastOwnershipFields",
      "semanticContrastOwnership",
      "forbiddenSemanticContrastUses",
      "scopedTintTokens",
      "requiredCssToken",
      "forbiddenCssAlias",
      "typography",
      "spacingPx",
      "targetMinCssPx",
      "focusRingFields",
      "focusRings",
      "normalMotionFields",
      "normalMotion",
      "motionInterruptionFixtureFields",
      "motionInterruptionFixtures",
      "exitDialogMotionId",
      "easing",
      "reducedMotion",
      "forbiddenMotion",
      "layoutFields",
      "layout",
      "componentGeometry",
    ]);
    expect(visual.requiredCssToken).toBe("--cc-coral:#d63f52");
    expect(visual.focusRingFields).toEqual(focusRingFields);
    expect(visual.focusRings).toEqual(expectedFocusRings);
    expect(validFocusRingContracts(visual.focusRings)).toBe(true);
    const focusRings = records(visual.focusRings);
    expect(validFocusRingContracts(focusRings.slice(1))).toBe(false);
    expect(validFocusRingContracts([...focusRings, focusRings[0]])).toBe(false);
    for (const [index, mutation] of [
      [1, { themeId: "light" }],
      [0, { ringId: "focus_dark" }],
      [0, { widthCssPx: 2 }],
      [0, { offsetCssPx: 2 }],
      [0, { colorToken: "--cc-coral" }],
      [0, { colorHex: "#d63f52" }],
      [0, { semanticPairId: "dark_focus_sun_on_canvas" }],
    ] as const) {
      const changed = structuredClone(focusRings);
      changed[index] = { ...record(changed[index]), ...mutation };
      expect(validFocusRingContracts(changed)).toBe(false);
    }
    expect(validFocusRingContracts([{ ...focusRings[0], unknown: true }, focusRings[1]])).toBe(
      false,
    );
    expect(visual.normalMotionFields).toEqual(normalMotionFields);
    expect(visual.normalMotion).toEqual(expectedNormalMotion);
    records(visual.normalMotion).forEach((motion) => exactKeys(motion, normalMotionFields));
    expect(visual.motionInterruptionFixtureFields).toEqual(motionInterruptionFixtureFields);
    expect(visual.motionInterruptionFixtures).toEqual(expectedMotionInterruptionFixtures);
    records(visual.motionInterruptionFixtures).forEach((fixture) => {
      exactKeys(fixture, motionInterruptionFixtureFields);
      expect(applicableMotionIdsForCell(fixture).has(String(fixture.motionId))).toBe(true);
      expect(
        validVariantForState(fixture.expectedSettledStateId, fixture.expectedSettledVariantId),
      ).toBe(true);
      expect(fixture.expectedAnnouncementCount).toBe(1);
    });
    expect(visual.forbiddenMotion).toEqual([
      "layout",
      "color",
      "shadow",
      "filter",
      "scroll",
      "loop",
      "stagger",
      "bounce",
      "shake",
      "pulse",
      "shimmer",
      "mascot",
    ]);
    expect(visual.exitDialogMotionId).toBe("entry");
    const fields = [
      "viewportId",
      "columnCount",
      "inlineGutterCssPx",
      "blockGutterCssPx",
      "canvasMaxWidthCssPx",
      "topBarMinHeightCssPx",
      "panelPaddingCssPx",
      "backplateOffsetCssPx",
      "notchCssPx",
      "actionLayout",
    ];
    expect(visual.layoutFields).toEqual(fields);
    const layouts = records(visual.layout);
    layouts.forEach((layout) => exactKeys(layout, fields));
    expect(layouts.map(({ viewportId }) => viewportId)).toEqual(
      records(record(catalog.matrix).viewports).map(({ id }) => id),
    );
    expect(layouts.map(({ columnCount }) => columnCount)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(layouts.map(({ inlineGutterCssPx }) => inlineGutterCssPx)).toEqual([
      16, 20, 20, 16, 32, 32,
    ]);
    expect(layouts.map(({ canvasMaxWidthCssPx }) => canvasMaxWidthCssPx)).toEqual([
      720, 720, 720, 720, 680, 760,
    ]);
    expect(layouts.map(({ topBarMinHeightCssPx }) => topBarMinHeightCssPx)).toEqual([
      56, 56, 56, 48, 64, 64,
    ]);
    expect(layouts.map(({ backplateOffsetCssPx }) => backplateOffsetCssPx)).toEqual([
      4, 4, 4, 4, 8, 8,
    ]);
    expect(layouts.map(({ notchCssPx }) => notchCssPx)).toEqual([20, 20, 20, 20, 24, 24]);
    const typography = record(visual.typography);
    exactKeys(typography, [
      "displayStack",
      "bodyStack",
      "roleFields",
      "roles",
      "proseMaxCh",
      "inputMinCssPx",
    ]);
    const typographyFields = [
      "roleId",
      "fontStack",
      "mobileFontSizeCssPx",
      "mobileLineHeightCssPx",
      "desktopFontSizeCssPx",
      "desktopLineHeightCssPx",
      "fontWeightMin",
      "fontWeightMax",
      "letterSpacingEm",
    ];
    expect(typography.roleFields).toEqual(typographyFields);
    const typographyRoles = records(typography.roles);
    typographyRoles.forEach((role) => exactKeys(role, typographyFields));
    expect(typographyRoles).toEqual([
      {
        roleId: "state_heading_h1",
        fontStack: "display",
        mobileFontSizeCssPx: 32,
        mobileLineHeightCssPx: 36,
        desktopFontSizeCssPx: 40,
        desktopLineHeightCssPx: 44,
        fontWeightMin: 700,
        fontWeightMax: 900,
        letterSpacingEm: -0.025,
      },
      {
        roleId: "prompt_heading",
        fontStack: "display",
        mobileFontSizeCssPx: 22,
        mobileLineHeightCssPx: 30,
        desktopFontSizeCssPx: 24,
        desktopLineHeightCssPx: 32,
        fontWeightMin: 700,
        fontWeightMax: 700,
        letterSpacingEm: -0.025,
      },
      {
        roleId: "secondary_heading_h2_or_dialog_title",
        fontStack: "display",
        mobileFontSizeCssPx: 24,
        mobileLineHeightCssPx: 30,
        desktopFontSizeCssPx: 28,
        desktopLineHeightCssPx: 34,
        fontWeightMin: 700,
        fontWeightMax: 700,
        letterSpacingEm: -0.025,
      },
      {
        roleId: "body",
        fontStack: "body",
        mobileFontSizeCssPx: 18,
        mobileLineHeightCssPx: 28,
        desktopFontSizeCssPx: 18,
        desktopLineHeightCssPx: 28,
        fontWeightMin: 400,
        fontWeightMax: 500,
        letterSpacingEm: 0,
      },
      {
        roleId: "supporting",
        fontStack: "body",
        mobileFontSizeCssPx: 16,
        mobileLineHeightCssPx: 24,
        desktopFontSizeCssPx: 16,
        desktopLineHeightCssPx: 24,
        fontWeightMin: 400,
        fontWeightMax: 600,
        letterSpacingEm: 0,
      },
      {
        roleId: "button_label",
        fontStack: "body",
        mobileFontSizeCssPx: 17,
        mobileLineHeightCssPx: 24,
        desktopFontSizeCssPx: 17,
        desktopLineHeightCssPx: 24,
        fontWeightMin: 700,
        fontWeightMax: 700,
        letterSpacingEm: 0,
      },
      {
        roleId: "metadata",
        fontStack: "body",
        mobileFontSizeCssPx: 14,
        mobileLineHeightCssPx: 20,
        desktopFontSizeCssPx: 14,
        desktopLineHeightCssPx: 20,
        fontWeightMin: 600,
        fontWeightMax: 600,
        letterSpacingEm: 0,
      },
      {
        roleId: "progress_text",
        fontStack: "body",
        mobileFontSizeCssPx: 16,
        mobileLineHeightCssPx: 24,
        desktopFontSizeCssPx: 16,
        desktopLineHeightCssPx: 24,
        fontWeightMin: 700,
        fontWeightMax: 700,
        letterSpacingEm: 0,
      },
    ]);
    expect(
      typographyRoles.every(
        (role) =>
          [
            role.mobileFontSizeCssPx,
            role.mobileLineHeightCssPx,
            role.desktopFontSizeCssPx,
            role.desktopLineHeightCssPx,
            role.fontWeightMin,
            role.fontWeightMax,
          ].every(Number.isSafeInteger) &&
          Number(role.fontWeightMin) >= 100 &&
          Number(role.fontWeightMax) <= 900 &&
          Number(role.fontWeightMin) <= Number(role.fontWeightMax),
      ),
    ).toBe(true);
    exactKeys(record(visual.componentGeometry), [
      "canvas",
      "backplate",
      "statePanel",
      "choice",
      "primaryAction",
      "progress",
      "topBar",
    ]);
    expect(record(record(visual.componentGeometry).topBar)).toEqual({
      sticky: false,
      fixed: false,
      obscuresContent: false,
    });
    expect(record(record(visual.componentGeometry).canvas)).toEqual({
      borderCssPx: 2,
      cornerRadiusCssPx: 24,
    });
    expect(record(record(visual.componentGeometry).backplate)).toEqual({
      borderCssPx: 0,
      cornerRadiusCssPx: 24,
      minimumInlineSizeCssPx: 0,
    });
    expect(record(record(visual.componentGeometry).choice).borderCssPx).toBe(2);
    expect(record(record(visual.componentGeometry).progress)).toEqual({
      trackBlockSizeCssPx: 12,
      cornerRadiusCssPx: 6,
    });
    expect(visual.scopedTintTokens).toEqual({
      light: {
        "--cc-coral-tint": "#fff0f1",
        "--cc-sun-tint": "#fff7d8",
        "--cc-mint-tint": "#e8fbf4",
      },
      dark: {
        "--cc-coral-tint": "#2a2456",
        "--cc-sun-tint": "#2a2456",
        "--cc-mint-tint": "#2a2456",
      },
    });
    const tokens = record(visual.scopedTokens) as Record<string, string>;
    expect(tokens).toEqual({
      paper: "#fffaf0",
      ink: "#17133f",
      lightCanvas: "#ffffff",
      darkCanvas: "#211c4a",
      lightRaised: "#fffdf8",
      darkRaised: "#2a2456",
      lightSecondaryText: "#4f4b6d",
      darkSecondaryText: "#d7d0e5",
      structuralBorder: "#6f6994",
      lightCobalt: "#2639b6",
      darkCobalt: "#aeb8ff",
      lightCoral: "#d63f52",
      darkCoral: "#ff8c96",
      sun: "#ffd34e",
      mint: "#7de2c4",
    });
    expect(visual.semanticContrastOwnershipFields).toEqual(semanticContrastOwnershipFields);
    expect(semanticContrastOwnership).toHaveLength(26);
    semanticContrastOwnership.forEach((pair) => {
      exactKeys(pair, semanticContrastOwnershipFields);
      expect(validArtifactType("ContrastPair", pair)).toBe(true);
      expect(pair.computedRatio).toBe(
        computedContrastRatio(
          record(pair.observedForegroundRgba),
          record(pair.observedBackgroundRgba),
        ),
      );
      expect(pair.passes).toBe(true);
    });
    expect(semanticContrastOwnership.map(({ computedRatio }) => computedRatio)).toEqual([
      16.801416, 17.195202, 7.885465, 8.070282, 4.894214, 5.008923, 8.614277, 8.816176, 8.614277,
      8.816176, 4.301832, 4.402657, 15.180301, 13.590645, 10.561566, 9.455577, 3.101683, 7.473816,
      8.348005, 7.473816, 7.102343, 6.358598, 11.040282, 9.884162, 12.219281, 11.27695,
    ]);
    expect(
      semanticContrastOwnership.some(
        ({ foregroundTokenId, backgroundTokenId }) =>
          foregroundTokenId === "structuralBorder" && backgroundTokenId === "darkRaised",
      ),
    ).toBe(false);
    expect(
      semanticContrastOwnership.find(
        ({ semanticPairId }) => semanticPairId === "dark_structural_cobalt_on_raised",
      ),
    ).toMatchObject({
      foregroundTokenId: "darkCobalt",
      backgroundTokenId: "darkRaised",
      requiredRatio: 3,
      computedRatio: 7.473816,
    });
    expect(
      semanticContrastOwnership
        .filter(({ foregroundTokenId }) => foregroundTokenId === "lightCoral")
        .every(({ usageClass }) => usageClass === "state_boundary_only_not_normal_text"),
    ).toBe(true);
    expect(visual.forbiddenSemanticContrastUses).toEqual([
      "structuralBorder_on_darkRaised_ratio_2.776880",
      "lightCoral_as_normal_text",
    ]);
    const contrastCell = {
      stateId: "ACTIVE",
      viewportId: "phone_320x568",
      themeId: "light",
      localeId: "en",
      textScaleId: "browser_zoom_100",
      fixtureId: "long_localized_prompt_and_choices",
    };
    const contrastArtifact = syntheticContrast(contrastCell);
    expect(validContrastArtifact(contrastArtifact, contrastCell)).toBe(true);
    for (const mutation of [
      { foregroundTokenId: "lightSecondaryText" },
      { backgroundTokenId: "lightRaised" },
      { semanticPairId: "light_ink_on_raised" },
      { computedRatio: 16.8 },
      { observedForegroundRgba: { red: 24, green: 19, blue: 63, alpha: 1 } },
    ]) {
      const changed = structuredClone(contrastArtifact);
      records(changed.pairs)[0] = { ...records(changed.pairs)[0], ...mutation };
      expect(validContrastArtifact(changed, contrastCell)).toBe(false);
    }
    expect(contrast(tokens.ink!, tokens.paper!)).toBeCloseTo(16.801416, 5);
    expect(contrast(tokens.lightCoral!, tokens.paper!)).toBeCloseTo(4.301832, 5);
    expect(contrast("#ff6b72", tokens.paper!)).toBeLessThan(3);
  });

  it("mirrors exact plan identity, viewports, profile, and browser zoom contracts", () => {
    const matrix = record(catalog.matrix);
    exactKeys(matrix, [
      "viewports",
      "themes",
      "locales",
      "textScales",
      "breakUiFixtures",
      "breakUiRecordFields",
      "breakUiRecords",
      "identityFields",
      "evidenceCellIdentity",
      "browserAtProfile",
      "cellCount",
      "stressFixture",
    ]);
    expect(matrix.viewports).toEqual(planVisual.viewports);
    expect(matrix.themes).toEqual(planVisual.themes);
    expect(matrix.locales).toEqual(planVisual.locales);
    expect(matrix.textScales).toEqual(planVisual.textScales);
    expect(matrix.identityFields).toEqual(identityFields);
    expect(matrix.evidenceCellIdentity).toEqual(planVisual.evidenceCellIdentity);
    expect(record(matrix.evidenceCellIdentity).manifestFields).toEqual(identityFields);
    expect(record(matrix.evidenceCellIdentity).artifactPathFields).toEqual(artifactPathFields);
    expect(record(matrix.evidenceCellIdentity).filenameFields).toEqual(filenameFields);
    const profile = record(matrix.browserAtProfile);
    exactKeys(profile, ["id", "os", "browser", "assistiveTechnology", "versionPolicy"]);
    expect({
      ...profile,
      versionPolicy: record(planVisual.browserAtProfile).versionPolicy,
    }).toEqual(planVisual.browserAtProfile);
    expect(profile.versionPolicy).toBe(
      "os_display_ASCII_1_to_48_chars_allowlisted_no_url_host_path_query_fragment_or_ip_chromium_and_nvda_ASCII_dotted_numeric_1_to_32_chars_safeSegment_before_artifact_key_construction",
    );
    expect(records(matrix.textScales).map(({ mechanism }) => mechanism)).toEqual([
      "chromium_browser_zoom",
      "chromium_browser_zoom",
    ]);
  });

  it("defines all fifteen closed descriptive Break-UI records", () => {
    const matrix = record(catalog.matrix);
    expect(matrix.breakUiFixtures).toEqual(fixtureIds);
    expect(matrix.breakUiFixtures).toEqual(planVisual.breakUiFixtures);
    expect(matrix.breakUiRecordFields).toEqual(breakUiRecordFields);
    const fixtureRecords = records(matrix.breakUiRecords);
    expect(fixtureRecords.map(({ fixtureId }) => fixtureId)).toEqual(fixtureIds);
    fixtureRecords.forEach((fixture) => {
      exactKeys(fixture, breakUiRecordFields);
      expect(fixture.renderStateIds).toEqual(stateIds);
      expect(strings(fixture.criterionFocusStates).every((id) => stateIds.includes(id))).toBe(true);
      for (const field of breakUiRecordFields.filter(
        (field) => !["renderStateIds", "criterionFocusStates"].includes(field),
      ))
        expect(String(fixture[field]).length).toBeGreaterThan(0);
      for (const field of [
        "preservationRule",
        "focusRule",
        "noProgressRule",
        "accessibilityCriteria",
        "visualCriteria",
      ])
        expect(String(fixture[field])).not.toMatch(/\s/);
      expect(String(fixture.noProgressRule)).toMatch(
        /progress|award|completion|attempt|incentive|result/,
      );
      expect(fixture.accessibilityCriteria).not.toBe(fixture.visualCriteria);
    });
    expect(createHash("sha256").update(JSON.stringify(fixtureRecords)).digest("hex")).toBe(
      "b84b80c41bfcc7eb4a9a3e1426f957f5868ab527a0e873354b078dc423280177",
    );
  });

  it("enumerates 10,800 collision-free cells and 86,400 artifact identities", () => {
    const matrix = record(catalog.matrix);
    const cells = new Set<string>();
    const artifacts = new Set<string>();
    for (const stateId of stateIds)
      for (const viewport of records(matrix.viewports))
        for (const theme of strings(matrix.themes))
          for (const locale of strings(matrix.locales))
            for (const textScale of records(matrix.textScales))
              for (const fixtureId of fixtureIds) {
                const parts = [
                  stateId,
                  String(viewport.id),
                  theme,
                  locale,
                  String(textScale.id),
                  fixtureId,
                ];
                expect(parts.every(safeSegment)).toBe(true);
                const identity = parts.join("__");
                cells.add(identity);
                artifactIds.forEach((artifactId) => artifacts.add(`${identity}__${artifactId}`));
              }
    expect(cells.size).toBe(10_800);
    expect(artifacts.size).toBe(86_400);
    expect(matrix.cellCount).toBe(cells.size);
    expect(record(catalog.evidence).artifactPairCount).toBe(artifacts.size);
    expect(record(catalog.evidence).cellMappingFields).toEqual(cellMappingFields);
    expect(record(catalog.evidence).cellDigestAlgorithm).toBe(
      "lowercase_sha256_of_UTF8_fluyo:r4a:cell:v1_LF_plus_JSON_stringified_six_identity_value_array",
    );
    expect(record(catalog.evidence).physicalArtifactKeyPattern).toBe(
      "cells/<lowercase-cell-digest-64>/<closed-artifact-id>",
    );
    const mappings = closedCellMappings();
    expect(mappings).toHaveLength(10_800);
    mappings.forEach((mapping, index) => {
      expect(Object.keys(mapping)).toEqual(cellMappingFields);
      expect(mapping.ordinal).toBe(index + 1);
      expect(mapping.cellDigest).toMatch(/^[0-9a-f]{64}$/);
    });
    expect(new Set(mappings.map(({ cellDigest: digest }) => digest)).size).toBe(10_800);
  });

  it("locks the keyboard and state-specific NVDA protocols without adding artifacts", () => {
    const evidence = record(catalog.evidence);
    expect(evidence.keyboardProtocolFields).toEqual(keyboardProtocolFields);
    expect(evidence.keyboardProtocol).toEqual(keyboardProtocol);
    expect(records(evidence.keyboardProtocol).map(({ sequence }) => sequence)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    records(evidence.keyboardProtocol).forEach((entry) => {
      exactKeys(entry, keyboardProtocolFields);
      expect(validArtifactType("KeyboardProtocolRecord", entry)).toBe(true);
      expect(entry.noProgressMutation).toBe(true);
    });
    expect(evidence.keyboardPresentationFocusMapFields).toEqual(keyboardPresentationFocusMapFields);
    expect(evidence.keyboardPresentationFocusMap).toEqual(keyboardPresentationFocusMap);
    expect(validKeyboardPresentationFocusMap(evidence.keyboardPresentationFocusMap)).toBe(true);
    expect(records(evidence.keyboardPresentationFocusMap)).toHaveLength(69);
    expect(evidence.keyboardPresentationFocusMapRules).toEqual([
      "one_row_for_every_applicable_presentation_interaction_pair_in_exact_keyboardApplicability_order",
      "ACTIVE_check_answer_and_RETRYABLE_ERROR_submit_try_again_retain_primary_action_status_position_with_zero_programmatic_focus_moves",
      "true_navigation_primary_actions_focus_activated_destination_heading_with_one_programmatic_focus_move",
      "in_place_and_modal_interactions_retain_their_closed_focus_targets_and_move_counts",
      "missing_extra_duplicate_reordered_or_unknown_references_fail_closed",
    ]);
    const applicabilityPairs = records(evidence.keyboardApplicability).flatMap((entry) => {
      const presentationId =
        entry.variantId === null
          ? String(entry.stateId)
          : `${String(entry.stateId)}:${String(entry.variantId)}`;
      return strings(entry.applicableInteractionIds).map(
        (interactionId) => `${presentationId}|${interactionId}`,
      );
    });
    expect(
      records(evidence.keyboardPresentationFocusMap).map(
        ({ presentationId, interactionId }) => `${presentationId}|${interactionId}`,
      ),
    ).toEqual(applicabilityPairs);
    expect(
      records(evidence.keyboardPresentationFocusMap).filter(
        ({ interactionId }) => interactionId === "primary_action_activate",
      ),
    ).toHaveLength(13);
    expect(
      records(evidence.keyboardPresentationFocusMap).filter(
        ({ rationaleId }) => rationaleId === "retain_primary_action_status_position",
      ),
    ).toEqual([
      {
        presentationId: "ACTIVE",
        interactionId: "primary_action_activate",
        applicability: "APPLICABLE",
        expectedFocusTargetId: "primary_action_status_position",
        expectedFocusMoveCount: 0,
        rationaleId: "retain_primary_action_status_position",
      },
      {
        presentationId: "RETRYABLE_ERROR:retryable_error_submit",
        interactionId: "primary_action_activate",
        applicability: "APPLICABLE",
        expectedFocusTargetId: "primary_action_status_position",
        expectedFocusMoveCount: 0,
        rationaleId: "retain_primary_action_status_position",
      },
    ]);
    expect(evidence.keyboardProtocolRules).toEqual([
      "radio_arrows_follow_canonical_answer_order_in_LTR_and_RTL",
      "Enter_and_Space_activate_only_native_control_semantics",
      "dialog_Tab_and_ShiftTab_never_escape_dialog",
      "disabled_or_busy_controls_cannot_activate",
      "keyboard_interactions_cannot_synthesize_confirmation_or_progress",
    ]);
    expect(evidence.keyboardProtocolDigest).toBe(
      createHash("sha256")
        .update(
          JSON.stringify({
            keyboardProtocol,
            keyboardPresentationFocusMap,
          }),
        )
        .digest("hex"),
    );
    expect(evidence.nvdaProtocolFields).toEqual(nvdaProtocolFields);
    expect(evidence.nvdaProtocolEventIds).toEqual(nvdaProtocolEventIds);
    expect(evidence.nvdaProtocolDigest).toBe(
      createHash("sha256")
        .update(
          JSON.stringify({
            fields: nvdaProtocolFields,
            eventIds: nvdaProtocolEventIds,
            rules: evidence.nvdaProtocolRules,
          }),
        )
        .digest("hex"),
    );
    expect(catalog.evidence).toMatchObject({ artifactIds, artifactPairCount: 86_400 });

    for (const mutation of [
      keyboardProtocol.slice(1),
      [...keyboardProtocol, keyboardProtocol[0]],
      keyboardProtocol.map((entry, index) => (index === 0 ? { ...entry, sequence: 2 } : entry)),
      keyboardProtocol.map((entry, index) =>
        index === 0 ? { ...entry, contextId: "unknown" } : entry,
      ),
      keyboardProtocol.map((entry, index) =>
        index === 0 ? { ...entry, noProgressMutation: false } : entry,
      ),
      keyboardProtocol.map((entry, index) =>
        index === 0 ? Object.fromEntries(Object.entries(entry).reverse()) : entry,
      ),
    ])
      expect(validKeyboardProtocol(mutation)).toBe(false);

    const mutatePresentationFocus = (index: number, mutation: JsonRecord) =>
      keyboardPresentationFocusMap.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...mutation } : entry,
      );
    for (const mutation of [
      keyboardPresentationFocusMap.slice(1),
      [
        ...keyboardPresentationFocusMap,
        {
          presentationId: "PREPARING",
          interactionId: "radio_select",
          applicability: "APPLICABLE",
          expectedFocusTargetId: "current_radio",
          expectedFocusMoveCount: 0,
          rationaleId: "in_place_selection",
        },
      ],
      [...keyboardPresentationFocusMap, keyboardPresentationFocusMap[0]],
      [
        keyboardPresentationFocusMap[1],
        keyboardPresentationFocusMap[0],
        ...keyboardPresentationFocusMap.slice(2),
      ],
      mutatePresentationFocus(0, { presentationId: "UNKNOWN" }),
      mutatePresentationFocus(0, { interactionId: "unknown_interaction" }),
      mutatePresentationFocus(0, { applicability: "EXCLUDED" }),
      mutatePresentationFocus(8, { expectedFocusTargetId: "activated_destination_heading" }),
      mutatePresentationFocus(8, { expectedFocusMoveCount: 1 }),
      mutatePresentationFocus(8, { rationaleId: "activated_destination_heading" }),
      keyboardPresentationFocusMap.map((entry, index) =>
        index === 0 ? Object.fromEntries(Object.entries(entry).reverse()) : entry,
      ),
    ])
      expect(validKeyboardPresentationFocusMap(mutation)).toBe(false);

    const activeCell = closedCellRecords().find(
      ({ stateId, fixtureId }) =>
        stateId === "ACTIVE" && fixtureId === "long_localized_prompt_and_choices",
    )!;
    const activeAnnouncements = syntheticAnnouncements(activeCell, "2026.1");
    const activeAnnouncementRecords = records(activeAnnouncements.records);
    expect(validAnnouncementsArtifact(activeAnnouncements, activeCell, "2026.1")).toBe(true);
    expect(activeAnnouncements.entryContextId).toBe("client_transition");
    expect(
      validAnnouncementsArtifact(
        { ...activeAnnouncements, entryContextId: "direct_load" },
        activeCell,
        "2026.1",
      ),
    ).toBe(false);
    expect(
      validAnnouncementsArtifact(
        { ...activeAnnouncements, nvdaVersion: "2026-beta" },
        activeCell,
        "2026-beta",
      ),
    ).toBe(false);
    expect(
      validAnnouncementsArtifact(
        { ...activeAnnouncements, reviewerRole: "Camila" },
        activeCell,
        "2026.1",
      ),
    ).toBe(false);
    expect(
      validAnnouncementsArtifact(
        { ...activeAnnouncements, stateId: "PREPARING" },
        activeCell,
        "2026.1",
      ),
    ).toBe(false);
    expect(
      validAnnouncementsArtifact({ ...activeAnnouncements, themeId: "dark" }, activeCell, "2026.1"),
    ).toBe(false);
    expect(
      validAnnouncementsArtifact(
        { ...activeAnnouncements, records: activeAnnouncementRecords.slice(1) },
        activeCell,
        "2026.1",
      ),
    ).toBe(false);
    expect(
      validAnnouncementsArtifact(
        {
          ...activeAnnouncements,
          records: [activeAnnouncementRecords[0], activeAnnouncementRecords[0]],
        },
        activeCell,
        "2026.1",
      ),
    ).toBe(false);
    expect(
      validAnnouncementsArtifact(
        {
          ...activeAnnouncements,
          records: activeAnnouncementRecords.map((entry, index) =>
            index === 1 ? { ...entry, politeness: "polite" } : entry,
          ),
        },
        activeCell,
        "2026.1",
      ),
    ).toBe(false);
  });

  it("defines one closed registry for every nested artifact record", () => {
    const evidence = record(catalog.evidence);
    const registryFields = ["typeName", "fieldOrder", "fieldTypes", "bounds"];
    expect(evidence.artifactTypeRegistryFields).toEqual(registryFields);
    artifactRegistry.forEach((entry) => {
      exactKeys(entry, registryFields);
      expect(Object.keys(record(entry.fieldTypes))).toEqual(entry.fieldOrder);
      expect(strings(entry.bounds).length).toBeGreaterThan(0);
    });
    expect(artifactRegistry.map(({ typeName }) => typeName)).toEqual([
      "CssRect",
      "DocumentDimensions",
      "RegionRecord",
      "ClippingRecord",
      "OverlapRecord",
      "Rgba",
      "ContrastPair",
      "FocusTarget",
      "FocusPosition",
      "FocusStop",
      "KeyboardProtocolRecord",
      "KeyboardExecutionRecord",
      "AnnouncementRecord",
      "StateOutcome",
      "MotionExecution",
      "StaticEquivalent",
    ]);
    exactKeys(artifactEnums, [
      "regionIds",
      "contrastSemanticPairIds",
      "focusTargetIds",
      "focusRoleIds",
      "focusPositionKinds",
      "keyboardContextIds",
      "keyboardKeyIds",
      "keyboardOutcomeIds",
      "keyboardFocusIds",
      "keyboardFocusRationaleIds",
      "keyboardApplicabilityIds",
      "keyboardExecutionVerdicts",
      "keyboardExclusionReasonIds",
      "nvdaModeIds",
      "announcementEventIds",
      "visibleStatusIds",
      "primaryActionIds",
    ]);
    expect(artifactEnums).toEqual({
      regionIds: [
        "document",
        "top_bar",
        "named_progress",
        "state_heading",
        "prompt",
        "response_group",
        "feedback_status",
        "primary_action",
      ],
      contrastSemanticPairIds: semanticContrastOwnership.map(
        ({ semanticPairId }) => semanticPairId,
      ),
      focusTargetIds: [
        "skip_link",
        "top_bar_back",
        "named_progress",
        "state_heading",
        "prompt",
        "response_group",
        "feedback_status",
        "primary_action",
        "exit_dialog",
        "exit_stay",
        "exit_leave",
        "invoking_exit_control",
      ],
      focusRoleIds: [
        "link",
        "button",
        "progressbar",
        "heading",
        "radiogroup",
        "radio",
        "status",
        "alert",
        "dialog",
        "textbox",
      ],
      focusPositionKinds: ["document", "element"],
      keyboardContextIds: [
        "document",
        "active_radio_group",
        "primary_action",
        "exit_dialog",
        "skip_link",
      ],
      keyboardKeyIds: [
        "Tab",
        "ShiftTab",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Space",
        "Enter",
        "Escape",
      ],
      keyboardOutcomeIds: [
        "focus_next",
        "focus_previous",
        "select_next_radio",
        "select_previous_radio",
        "select_current_radio",
        "activate_control",
        "dismiss_as_stay",
        "cycle_within_dialog",
        "move_to_main_heading",
      ],
      keyboardFocusIds: [
        "next_expected_stop",
        "previous_expected_stop",
        "next_radio_in_canonical_order",
        "previous_radio_in_canonical_order",
        "current_radio",
        "presentation_specific_focus_map",
        "primary_action_status_position",
        "activated_destination_heading",
        "invoking_exit_control",
        "exit_stay",
        "single_h1",
      ],
      keyboardFocusRationaleIds: [
        "sequential_focus_navigation",
        "radio_roving_focus",
        "in_place_selection",
        "retain_primary_action_status_position",
        "activated_destination_heading",
        "modal_focus_cycle",
        "modal_dismiss_focus_restore",
        "skip_link_main_heading",
      ],
      keyboardApplicabilityIds: ["APPLICABLE", "EXCLUDED"],
      keyboardExecutionVerdicts: ["PASS", "EXCLUDED"],
      keyboardExclusionReasonIds: [
        "radio_group_not_present",
        "enabled_primary_action_not_present",
        "exit_dialog_not_open",
        "modal_background_inert",
      ],
      nvdaModeIds: ["browse", "focus"],
      announcementEventIds: [
        "state_entry",
        "active_radio_group",
        "radio_selection",
        "submission_pending",
        "confirmation",
        "retryable_error",
        "offline",
        "session_ended",
        "access_blocked",
        "empty_review",
        "confirmed_progress_changed",
        "exit_dialog_opened",
        "exit_dialog_dismissed",
      ],
      visibleStatusIds: stateIds,
      primaryActionIds: [
        "none",
        "set_goal",
        "save_goal",
        "start_from_beginning",
        "check_answer",
        "continue",
        "finish",
        "try_again",
        "refresh_activity",
        "sign_in",
        "return_to_learning",
        "continue_learning",
        "stay",
        "leave_activity",
      ],
    });

    const rect = { x: 0, y: 0, width: 320, height: 44 };
    const target = {
      targetId: "primary_action",
      roleId: "button",
      accessibleName: "Continue",
      rect,
      focusRingId: "focus_light",
    };
    const examples: Record<string, JsonRecord> = {
      CssRect: rect,
      DocumentDimensions: {
        scrollWidthCssPx: 320,
        scrollHeightCssPx: 700,
        clientWidthCssPx: 320,
        clientHeightCssPx: 568,
      },
      RegionRecord: { regionId: "primary_action", rect, visible: true },
      ClippingRecord: { regionId: "primary_action", clipped: false },
      OverlapRecord: {
        firstRegionId: "prompt",
        secondRegionId: "primary_action",
        overlaps: false,
      },
      Rgba: { red: 23, green: 19, blue: 63, alpha: 1 },
      ContrastPair: {
        semanticPairId: "light_ink_on_paper",
        themeId: "light",
        usageClass: "normal_text",
        foregroundTokenId: "ink",
        backgroundTokenId: "paper",
        observedForegroundRgba: { red: 23, green: 19, blue: 63, alpha: 1 },
        observedBackgroundRgba: { red: 255, green: 250, blue: 240, alpha: 1 },
        requiredRatio: 4.5,
        computedRatio: 16.801416,
        passes: true,
      },
      FocusTarget: target,
      FocusPosition: { kind: "document", target: null },
      FocusStop: { order: 1, target, visible: true, named: true, operable: true },
      KeyboardProtocolRecord: keyboardProtocol[0]!,
      KeyboardExecutionRecord: expectedKeyboardExecutions(
        closedCellRecords().find(({ stateId }) => stateId === "PREPARING")!,
      )[0]!,
      AnnouncementRecord: {
        sequence: 1,
        eventId: "state_entry",
        modeId: "browse",
        sourceTargetId: "state_heading",
        roleId: "heading",
        accessibleName: "Getting your activity ready",
        accessibleState: "",
        accessibleValue: "",
        politeness: "polite",
        count: 1,
        spokenText: "Getting your activity ready heading",
      },
      StateOutcome: {
        stateId: "ACTIVE",
        variantId: null,
        visibleStatusId: "ACTIVE",
        primaryActionId: "check_answer",
      },
      MotionExecution: {
        motionId: "entry",
        triggerId: "newly_active_panel_or_dialog",
        ownerId: "entering_panel_or_dialog_only",
        propertyIds: ["transform_translate", "opacity"],
        configuredDurationMs: 180,
        observedDurationMs: 180,
        easingId: "cubic-bezier(0.22, 1, 0.36, 1)",
        startedStateId: "ACTIVE",
        interruptedBy: null,
        settledStateId: "ACTIVE",
        staleCallbackCount: 0,
        focusPosition: { kind: "document", target: null },
        announcementCount: 1,
        applicability: "APPLICABLE",
        exclusionReason: null,
      },
      StaticEquivalent: {
        finalStateId: "ACTIVE",
        primaryActionId: "check_answer",
        focusPosition: { kind: "element", target },
        copyDigest: "a".repeat(64),
        progressValue: 3,
        announcementCount: 1,
      },
    };
    for (const [typeName, example] of Object.entries(examples)) {
      expect(validArtifactType(typeName, example)).toBe(true);
      const keys = Object.keys(example);
      const missing = { ...example };
      delete missing[keys[0]!];
      expect(validArtifactType(typeName, missing)).toBe(false);
      expect(validArtifactType(typeName, { ...example, extra: true })).toBe(false);
      expect(
        validArtifactType(typeName, Object.fromEntries(Object.entries(example).reverse())),
      ).toBe(false);
    }
    expect(validArtifactType("CssRect", { ...rect, width: "320" })).toBe(false);
    expect(validArtifactType("CssRect", { ...rect, width: 100_001 })).toBe(false);
    expect(validArtifactType("CssRect", { ...rect, x: -0 })).toBe(false);
    expect(validArtifactType("CssRect", { ...rect, y: Number.NaN })).toBe(false);
    expect(validArtifactType("CssRect", { ...rect, width: Number.POSITIVE_INFINITY })).toBe(false);
    expect(validArtifactType("CssRect", { ...rect, height: 1.0000001 })).toBe(false);
    expect(
      validArtifactType("DocumentDimensions", {
        ...examples.DocumentDimensions,
        clientWidthCssPx: "320",
      }),
    ).toBe(false);
    expect(
      validArtifactType("DocumentDimensions", {
        ...examples.DocumentDimensions,
        scrollWidthCssPx: 319,
      }),
    ).toBe(false);
    expect(
      validArtifactType("DocumentDimensions", {
        ...examples.DocumentDimensions,
        clientHeightCssPx: 100_001,
      }),
    ).toBe(false);
    expect(validArtifactType("Rgba", { red: 256, green: 0, blue: 0, alpha: 1 })).toBe(false);
    expect(validArtifactType("Rgba", { red: 0, green: 0, blue: 0, alpha: -0 })).toBe(false);
    expect(validArtifactType("Rgba", { red: 0, green: 0, blue: 0, alpha: 0.1234567 })).toBe(false);
    expect(validArtifactType("RegionRecord", { regionId: "unknown", rect, visible: true })).toBe(
      false,
    );
    expect(
      validArtifactType("ClippingRecord", {
        ...examples.ClippingRecord,
        clipped: "false",
      }),
    ).toBe(false);
    expect(
      validArtifactType("ClippingRecord", {
        ...examples.ClippingRecord,
        regionId: "unknown",
      }),
    ).toBe(false);
    expect(
      validArtifactType("OverlapRecord", {
        ...examples.OverlapRecord,
        secondRegionId: "prompt",
      }),
    ).toBe(false);
    expect(
      validArtifactType("OverlapRecord", {
        firstRegionId: "primary_action",
        secondRegionId: "prompt",
        overlaps: false,
      }),
    ).toBe(false);
    expect(
      validArtifactType("OverlapRecord", { ...examples.OverlapRecord, overlaps: "false" }),
    ).toBe(false);
    const contrastPair = record(examples.ContrastPair);
    expect(validArtifactType("ContrastPair", { ...contrastPair, computedRatio: 0 })).toBe(false);
    expect(validArtifactType("ContrastPair", { ...contrastPair, computedRatio: 22 })).toBe(false);
    expect(validArtifactType("ContrastPair", { ...contrastPair, requiredRatio: 7 })).toBe(false);
    expect(validArtifactType("ContrastPair", { ...contrastPair, passes: false })).toBe(false);
    expect(
      validArtifactType("ContrastPair", {
        ...contrastPair,
        observedForegroundRgba: { red: 255, green: 255, blue: 255, alpha: 1 },
        observedBackgroundRgba: { red: 255, green: 255, blue: 255, alpha: 1 },
        computedRatio: 21,
      }),
    ).toBe(false);
    expect(
      validArtifactType("ContrastPair", {
        ...contrastPair,
        observedForegroundRgba: { red: 255, green: 255, blue: 255, alpha: 1 },
        observedBackgroundRgba: { red: 255, green: 255, blue: 255, alpha: 1 },
        computedRatio: 1,
        passes: false,
      }),
    ).toBe(true);
    expect(
      validArtifactType("ContrastPair", {
        ...contrastPair,
        observedForegroundRgba: {
          ...record(contrastPair.observedForegroundRgba),
          alpha: 0.5,
        },
      }),
    ).toBe(false);
    expect(validArtifactType("ContrastPair", { ...contrastPair, computedRatio: 16.801417 })).toBe(
      false,
    );
    expect(validArtifactType("ContrastPair", { ...contrastPair, computedRatio: 16.8014161 })).toBe(
      false,
    );
    expect(validArtifactType("FocusTarget", { ...target, targetId: "unknown" })).toBe(false);
    expect(validArtifactType("FocusTarget", { ...target, roleId: "unknown" })).toBe(false);
    expect(validArtifactType("FocusTarget", { ...target, accessibleName: " " })).toBe(false);
    expect(validArtifactType("FocusTarget", { ...target, rect: { ...rect, width: 0 } })).toBe(
      false,
    );
    expect(validArtifactType("FocusTarget", { ...target, focusRingId: "focus_none" })).toBe(false);
    expect(validArtifactType("FocusTarget", { ...target, focusRingId: "light_cobalt" })).toBe(
      false,
    );
    expect(validArtifactType("FocusTarget", { ...target, focusRingId: "dark_sun" })).toBe(false);
    expect(validArtifactType("FocusPosition", { kind: "document", target: null })).toBe(true);
    expect(validArtifactType("FocusPosition", { kind: "element", target })).toBe(true);
    const directLoadNoMove = {
      initialFocus: { kind: "document", target: null },
      finalFocus: { kind: "document", target: null },
    };
    expect(validArtifactType("FocusPosition", directLoadNoMove.initialFocus)).toBe(true);
    expect(validArtifactType("FocusPosition", directLoadNoMove.finalFocus)).toBe(true);
    expect(validArtifactType("FocusPosition", { kind: "document", target })).toBe(false);
    expect(validArtifactType("FocusPosition", { kind: "element", target: null })).toBe(false);
    expect(
      validArtifactType("FocusPosition", {
        kind: "element",
        target: { ...target, targetId: "unknown" },
      }),
    ).toBe(false);
    expect(validArtifactType("FocusStop", { ...examples.FocusStop, order: 0 })).toBe(false);
    expect(validArtifactType("FocusStop", { ...examples.FocusStop, order: 1.5 })).toBe(false);
    expect(
      validArtifactType("FocusStop", {
        ...examples.FocusStop,
        target: { ...target, roleId: "unknown" },
      }),
    ).toBe(false);
    expect(validArtifactType("FocusStop", { ...examples.FocusStop, visible: false })).toBe(false);
    expect(validArtifactType("FocusStop", { ...examples.FocusStop, named: false })).toBe(false);
    expect(validArtifactType("FocusStop", { ...examples.FocusStop, operable: false })).toBe(false);
    expect(
      validArtifactType("KeyboardProtocolRecord", {
        ...examples.KeyboardProtocolRecord,
        contextId: "unknown",
      }),
    ).toBe(false);
    expect(
      validArtifactType("KeyboardProtocolRecord", {
        ...examples.KeyboardProtocolRecord,
        keyIds: ["Unknown"],
      }),
    ).toBe(false);
    expect(
      validArtifactType("KeyboardProtocolRecord", {
        ...examples.KeyboardProtocolRecord,
        announcementDelta: 2,
      }),
    ).toBe(false);
    expect(
      validArtifactType("KeyboardProtocolRecord", {
        ...examples.KeyboardProtocolRecord,
        noProgressMutation: false,
      }),
    ).toBe(false);
    expect(
      validArtifactType("MotionExecution", {
        ...examples.MotionExecution,
        observedDurationMs: 181,
      }),
    ).toBe(false);
    expect(
      validArtifactType("MotionExecution", {
        ...examples.MotionExecution,
        propertyIds: ["width"],
      }),
    ).toBe(false);
    expect(
      validArtifactType("MotionExecution", {
        ...examples.MotionExecution,
        staleCallbackCount: 1,
      }),
    ).toBe(false);
    expect(
      validArtifactType("AnnouncementRecord", {
        ...examples.AnnouncementRecord,
        sequence: 9_007_199_254_740_992,
      }),
    ).toBe(false);
    expect(
      validArtifactType("AnnouncementRecord", {
        ...examples.AnnouncementRecord,
        spokenText: "Cafe\u0301",
      }),
    ).toBe(false);
    expect(
      validArtifactType("AnnouncementRecord", {
        ...examples.AnnouncementRecord,
        spokenText: "unsafe\u0000text",
      }),
    ).toBe(false);
    expect(
      validArtifactType("AnnouncementRecord", {
        ...examples.AnnouncementRecord,
        eventId: "unknown",
      }),
    ).toBe(false);
    expect(
      validArtifactType("AnnouncementRecord", { ...examples.AnnouncementRecord, count: 2 }),
    ).toBe(false);
    expect(
      validArtifactType("AnnouncementRecord", {
        ...examples.AnnouncementRecord,
        modeId: "unknown",
      }),
    ).toBe(false);
    expect(
      validArtifactType("AnnouncementRecord", {
        ...examples.AnnouncementRecord,
        politeness: "loud",
      }),
    ).toBe(false);
    expect(
      validArtifactType("StateOutcome", { ...examples.StateOutcome, stateId: "UNKNOWN" }),
    ).toBe(false);
    expect(
      validArtifactType("StateOutcome", {
        ...examples.StateOutcome,
        visibleStatusId: "CONFIRMED",
      }),
    ).toBe(false);
    expect(
      validArtifactType("StateOutcome", {
        ...examples.StateOutcome,
        primaryActionId: "unknown",
      }),
    ).toBe(false);
    expect(
      validArtifactType("StateOutcome", {
        ...examples.StateOutcome,
        variantId: "confirmed_correct_continue",
      }),
    ).toBe(false);
    expect(
      validArtifactType("StateOutcome", {
        stateId: "CONFIRMED",
        variantId: null,
        visibleStatusId: "CONFIRMED",
        primaryActionId: "continue",
      }),
    ).toBe(false);
    expect(
      validArtifactType("StateOutcome", {
        stateId: "CONFIRMED",
        variantId: "unknown_variant",
        visibleStatusId: "CONFIRMED",
        primaryActionId: "continue",
      }),
    ).toBe(false);
    expect(
      validArtifactType("StaticEquivalent", {
        ...examples.StaticEquivalent,
        finalStateId: "UNKNOWN",
      }),
    ).toBe(false);
    expect(
      validArtifactType("StaticEquivalent", {
        ...examples.StaticEquivalent,
        primaryActionId: "unknown",
      }),
    ).toBe(false);
    expect(
      validArtifactType("StaticEquivalent", {
        ...examples.StaticEquivalent,
        focusPosition: { kind: "document", target: null },
      }),
    ).toBe(true);
    expect(
      validArtifactType("StaticEquivalent", {
        ...examples.StaticEquivalent,
        focusPosition: { kind: "document", target },
      }),
    ).toBe(false);
    expect(
      validArtifactType("StaticEquivalent", {
        ...examples.StaticEquivalent,
        focusPosition: { kind: "element", target: null },
      }),
    ).toBe(false);
    expect(
      validArtifactType("StaticEquivalent", {
        ...examples.StaticEquivalent,
        focusPosition: { kind: "element", target: { ...target, targetId: "unknown" } },
      }),
    ).toBe(false);
    expect(
      validArtifactType("StaticEquivalent", {
        ...examples.StaticEquivalent,
        announcementCount: 2,
      }),
    ).toBe(false);

    const references = new Set<string>();
    const collectReferences = (fieldTypes: unknown) => {
      for (const value of Object.values(record(fieldTypes))) {
        for (const reference of String(value).replace(/\[\]$/, "").split("|")) {
          if (registryByName.has(reference)) references.add(reference);
        }
      }
    };
    artifactRegistry.forEach((entry) => collectReferences(entry.fieldTypes));
    records(evidence.artifactContracts).forEach((contract) =>
      collectReferences(record(contract.validationRecordContract).fieldTypes),
    );
    expect([...references].sort()).toEqual(
      [...registryByName.keys()].filter((typeName) => typeName !== "StateOutcome").sort(),
    );
    expect(registryByName.has("StateOutcome")).toBe(true);
  });

  it("locks eight artifact schemas, formats, bounds, normalization, and comparison", () => {
    const evidence = record(catalog.evidence);
    expect(evidence.artifactIds).toEqual(artifactIds);
    const fields = [
      "artifactId",
      "fileContract",
      "validationRecordContract",
      "normalization",
      "comparison",
    ];
    expect(evidence.artifactContractFields).toEqual(fields);
    const contracts = records(evidence.artifactContracts);
    expect(contracts.map(({ artifactId }) => artifactId)).toEqual(artifactIds);
    contracts.forEach((contract) => {
      exactKeys(contract, fields);
      exactKeys(record(contract.validationRecordContract), [
        "fieldOrder",
        "fieldTypes",
        "derivedRules",
      ]);
      const validation = record(contract.validationRecordContract);
      expect(strings(validation.fieldOrder).length).toBeGreaterThan(0);
      expect(Object.keys(record(validation.fieldTypes))).toEqual(validation.fieldOrder);
      expect(strings(validation.derivedRules).length).toBeGreaterThan(0);
      for (const field of ["normalization", "comparison"])
        expect(String(contract[field]).length).toBeGreaterThan(0);
    });
    expect(
      contracts.slice(0, 3).map((contract) => record(contract.fileContract).mediaType),
    ).toEqual(["image/png", "image/png", "image/png"]);
    expect(record(contracts[6]?.fileContract)).toMatchObject({ encoding: "utf8_LF_NFC_no_BOM" });
    const contrastRegistryBounds = strings(registryByName.get("ContrastPair")?.bounds);
    const contrastContractRules = strings(
      record(
        contracts.find(({ artifactId }) => artifactId === "contrast.json")
          ?.validationRecordContract,
      ).derivedRules,
    );
    expect(contrastContractRules).toContain(
      "pairs_equal_exact_applicable_catalog_visual.semanticContrastOwnership_records_in_closed_order_for_cell_theme_plus_both",
    );
    expect(contrastRegistryBounds).toEqual([
      "observedForegroundRgba.alpha=1_and_observedBackgroundRgba.alpha=1",
      "normalized_channel=channel_integer/255",
      "sRGB_channel_linearization=channel<=0.04045?channel/12.92:((channel+0.055)/1.055)^2.4",
      "relative_luminance=0.2126*linear_red+0.7152*linear_green+0.0722*linear_blue",
      "1<=computedRatio<=21",
      "computedRatio_is_finite_not_negative_zero_and_equals_round(computedRatio*1000000)/1000000",
      "computedRatio=round6((lighter_luminance+0.05)/(darker_luminance+0.05))",
      "passes=(computed_ratio>=requiredRatio)",
      "all_fields_equal_the_exact_catalog_visual.semanticContrastOwnership_record",
      "actual_scoped_token_ids_and_RGBA_only_no_aliases",
      "records_sorted_by_catalog_semanticContrastOwnership_order",
    ]);
    const reducedMotionContract = record(
      contracts.find(({ artifactId }) => artifactId === "reduced-motion.json")
        ?.validationRecordContract,
    );
    expect(strings(reducedMotionContract.derivedRules)).toContain(
      "normal_and_reduced_final_state_action_focus_copy_progress_and_announcement_are_equal",
    );
    expect(strings(reducedMotionContract.derivedRules)).toContain(
      "interruptedBy_is_null_except_for_exact_visual.motionInterruptionFixtures_state_fixture_motion_combinations",
    );
    expect(strings(reducedMotionContract.derivedRules)).toContain(
      "required_interruption_uses_exact_cause_newest_settlement_staleCallbackCount=0_preserved_focus_one_semantic_announcement_and_matching_reduced_static_outcome",
    );
    const activeCell = closedCellRecords().find(({ stateId }) => stateId === "ACTIVE")!;
    const pairedFocusArtifact = syntheticFocus(activeCell);
    expect(validFocusArtifact(pairedFocusArtifact, activeCell)).toBe(true);
    expect(
      validFocusArtifact(
        { ...pairedFocusArtifact, keyboardProtocol: keyboardProtocol.slice(1) },
        activeCell,
      ),
    ).toBe(false);
    expect(validFocusArtifact({ ...pairedFocusArtifact, stateId: "PREPARING" }, activeCell)).toBe(
      false,
    );
    expect(validFocusArtifact({ ...pairedFocusArtifact, themeId: "dark" }, activeCell)).toBe(false);
    const reducedMotionExample: JsonRecord = syntheticReducedMotion(activeCell);
    const validateReduced = (
      value: unknown,
      cell: unknown = activeCell,
      focusArtifact?: unknown,
    ) => {
      const cellRecord = record(cell);
      const resolvedFocus = focusArtifact ?? syntheticFocus(cellRecord);
      return validReducedMotionArtifact(value, cell, resolvedFocus);
    };
    expect(validateReduced(reducedMotionExample)).toBe(true);
    expect(
      validateReduced({
        ...reducedMotionExample,
        reducedRun: records(reducedMotionExample.reducedRun).map((execution, index) =>
          index === 2 ? { ...execution, observedDurationMs: 1 } : execution,
        ),
      }),
    ).toBe(false);
    for (const field of ["normalRun", "reducedRun"] as const)
      expect(
        validateReduced({
          ...reducedMotionExample,
          [field]: records(reducedMotionExample[field]).map((execution, index) =>
            index === 0 ? { ...execution, propertyIds: ["width"] } : execution,
          ),
        }),
      ).toBe(false);
    expect(
      validateReduced({
        ...reducedMotionExample,
        staticEquivalent: {
          ...record(reducedMotionExample.staticEquivalent),
          finalStateId: "CONFIRMED",
        },
      }),
    ).toBe(false);
    expect(
      validateReduced({
        ...reducedMotionExample,
        staticEquivalent: {
          ...record(reducedMotionExample.staticEquivalent),
          primaryActionId: "continue",
        },
      }),
    ).toBe(false);
    expect(
      validateReduced({
        ...reducedMotionExample,
        staticEquivalent: {
          ...record(reducedMotionExample.staticEquivalent),
          focusPosition: {
            kind: "element",
            target: record(expectedFocusStops(activeCell)[0]).target,
          },
        },
      }),
    ).toBe(false);
    expect(
      validateReduced({
        ...reducedMotionExample,
        normalRun: records(reducedMotionExample.normalRun).map((execution, index) =>
          index === 1 ? { ...execution, staleCallbackCount: 1 } : execution,
        ),
      }),
    ).toBe(false);
    for (const mutation of [
      { configuredDurationMs: 121 },
      { easingId: "ease-in" },
      { ownerId: "obsolete_owner" },
      { settledStateId: "SUBMITTING" },
      { announcementCount: 2 },
      { applicability: "NON_APPLICABLE", exclusionReason: "trigger_not_observed" },
      {
        focusPosition: {
          kind: "element",
          target: record(expectedFocusStops(activeCell)[0]).target,
        },
      },
    ])
      expect(
        validateReduced({
          ...reducedMotionExample,
          normalRun: records(reducedMotionExample.normalRun).map((execution, index) =>
            index === 0 ? { ...execution, ...mutation } : execution,
          ),
        }),
      ).toBe(false);
    expect(
      validateReduced({
        ...reducedMotionExample,
        normalRun: [
          ...records(reducedMotionExample.normalRun),
          records(reducedMotionExample.normalRun)[0],
        ],
      }),
    ).toBe(false);
    expect(
      validateReduced({
        ...reducedMotionExample,
        reducedRun: [...records(reducedMotionExample.reducedRun)].reverse(),
      }),
    ).toBe(false);
    expect(
      validateReduced({
        ...reducedMotionExample,
        announcementBinding: {
          ...record(reducedMotionExample.announcementBinding),
          normalCount: 2,
        },
      }),
    ).toBe(false);
    expect(
      validateReduced({
        ...reducedMotionExample,
        announcementBinding: {
          ...record(reducedMotionExample.announcementBinding),
          callbacksSilent: false,
        },
      }),
    ).toBe(false);
    expect(
      validateReduced(
        reducedMotionExample,
        { ...activeCell, stateId: "PREPARING" },
        pairedFocusArtifact,
      ),
    ).toBe(false);
    const activeSignIn = {
      ...reducedMotionExample,
      staticEquivalent: {
        ...record(reducedMotionExample.staticEquivalent),
        primaryActionId: "sign_in",
      },
    };
    expect(validateReduced(activeSignIn)).toBe(false);

    for (const interruptionContract of expectedMotionInterruptionFixtures) {
      const interruptedCell = {
        ...activeCell,
        stateId: interruptionContract.stateId,
        fixtureId: interruptionContract.fixtureId,
      };
      const interruptedArtifact = syntheticReducedMotion(interruptedCell);
      expect(validateReduced(interruptedArtifact, interruptedCell)).toBe(true);
      const motionIndex = expectedNormalMotion.findIndex(
        ({ motionId }) => motionId === interruptionContract.motionId,
      );
      const normalExecution = record(records(interruptedArtifact.normalRun)[motionIndex]);
      const reducedExecution = record(records(interruptedArtifact.reducedRun)[motionIndex]);
      expect(normalExecution).toMatchObject({
        interruptedBy: interruptionContract.interruptedBy,
        settledStateId: interruptionContract.expectedSettledStateId,
        staleCallbackCount: 0,
        focusPosition: record(interruptedArtifact.focusBinding).normalPosition,
        announcementCount: 1,
      });
      expect(reducedExecution).toMatchObject({
        interruptedBy: interruptionContract.interruptedBy,
        settledStateId: interruptionContract.expectedSettledStateId,
        observedDurationMs: 0,
        staleCallbackCount: 0,
        focusPosition: record(interruptedArtifact.focusBinding).reducedPosition,
        announcementCount: 1,
      });
      expect(interruptedArtifact.staticEquivalent).toMatchObject({
        finalStateId: interruptionContract.expectedSettledStateId,
        focusPosition: normalExecution.focusPosition,
        announcementCount: 1,
      });
      expect(interruptedArtifact.announcementBinding).toMatchObject({
        normalCount: 1,
        reducedCount: 1,
        callbacksSilent: true,
        preserved: true,
      });
    }

    const interruptionContract = expectedMotionInterruptionFixtures[0]!;
    const interruptedCell = {
      ...activeCell,
      stateId: interruptionContract.stateId,
      fixtureId: interruptionContract.fixtureId,
    };
    const interruptedArtifact = syntheticReducedMotion(interruptedCell);
    const interruptedMotionIndex = expectedNormalMotion.findIndex(
      ({ motionId }) => motionId === interruptionContract.motionId,
    );
    const mutateInterruptedExecution = (
      runField: "normalRun" | "reducedRun",
      mutation: JsonRecord,
    ): JsonRecord => ({
      ...interruptedArtifact,
      [runField]: records(interruptedArtifact[runField]).map((execution, index) =>
        index === interruptedMotionIndex ? { ...execution, ...mutation } : execution,
      ),
    });
    expect(
      validateReduced(
        mutateInterruptedExecution("normalRun", { interruptedBy: null }),
        interruptedCell,
      ),
    ).toBe(false);
    expect(
      validateReduced(
        mutateInterruptedExecution("normalRun", { interruptedBy: "visibility" }),
        interruptedCell,
      ),
    ).toBe(false);
    expect(
      validateReduced(
        mutateInterruptedExecution("normalRun", {
          settledStateId: interruptionContract.stateId,
        }),
        interruptedCell,
      ),
    ).toBe(false);
    expect(
      validateReduced(
        {
          ...interruptedArtifact,
          normalRun: [
            ...records(interruptedArtifact.normalRun),
            records(interruptedArtifact.normalRun)[interruptedMotionIndex],
          ],
        },
        interruptedCell,
      ),
    ).toBe(false);
    expect(
      validateReduced(
        mutateInterruptedExecution("normalRun", {
          focusPosition: {
            kind: "element",
            target: record(expectedFocusStops(interruptedCell)[0]).target,
          },
        }),
        interruptedCell,
      ),
    ).toBe(false);
    expect(
      validateReduced(
        mutateInterruptedExecution("normalRun", { announcementCount: 2 }),
        interruptedCell,
      ),
    ).toBe(false);
    expect(
      validateReduced(
        mutateInterruptedExecution("reducedRun", { interruptedBy: null }),
        interruptedCell,
      ),
    ).toBe(false);
    expect(
      validateReduced(
        {
          ...interruptedArtifact,
          staticEquivalent: {
            ...record(interruptedArtifact.staticEquivalent),
            finalStateId: interruptionContract.stateId,
          },
        },
        interruptedCell,
      ),
    ).toBe(false);

    const stateExample = (
      stateId: string,
      _variantId: string | null,
      primaryActionId: string,
      fixtureId: string = String(activeCell.fixtureId),
    ) => {
      const cell = stateCell(stateId, fixtureId);
      const base = syntheticReducedMotion(cell);
      return {
        ...base,
        staticEquivalent: {
          ...record(base.staticEquivalent),
          finalStateId: stateId,
          primaryActionId,
        },
      };
    };
    const stateCell = (stateId: string, fixtureId: string = String(activeCell.fixtureId)) => ({
      ...activeCell,
      stateId,
      fixtureId,
    });
    expect(
      validateReduced(
        stateExample("STALE_CONTENT", null, "refresh_activity"),
        stateCell("STALE_CONTENT"),
      ),
    ).toBe(true);
    expect(
      validateReduced(stateExample("STALE_CONTENT", null, "none"), stateCell("STALE_CONTENT")),
    ).toBe(false);
    expect(
      validateReduced(
        stateExample("EMPTY_REVIEW", null, "continue_learning"),
        stateCell("EMPTY_REVIEW"),
      ),
    ).toBe(true);
    expect(
      validateReduced(stateExample("EMPTY_REVIEW", null, "none"), stateCell("EMPTY_REVIEW")),
    ).toBe(false);

    const confirmedCases = [
      ["confirmed_correct_continue", "continue"],
      ["confirmed_correct_finish", "finish"],
      ["confirmed_incorrect_continue", "continue"],
      ["confirmed_incorrect_finish", "finish"],
    ] as const;
    for (const [variantId, primaryActionId] of confirmedCases) {
      const fixtureId = String(
        records(catalog.stateFixtureVariants).find(
          (entry) => entry.stateId === "CONFIRMED" && entry.variantId === variantId,
        )?.fixtureId,
      );
      const example = stateExample("CONFIRMED", variantId, primaryActionId, fixtureId);
      expect(validateReduced(example, stateCell("CONFIRMED", fixtureId))).toBe(true);
      expect(
        validateReduced(
          stateExample(
            "CONFIRMED",
            variantId,
            primaryActionId === "continue" ? "finish" : "continue",
            fixtureId,
          ),
          stateCell("CONFIRMED", fixtureId),
        ),
      ).toBe(false);
    }
    const wrongConfirmedCopy = stateExample("CONFIRMED", null, "continue");
    record(wrongConfirmedCopy.staticEquivalent).copyDigest = "b".repeat(64);
    expect(validateReduced(wrongConfirmedCopy, stateCell("CONFIRMED"))).toBe(false);
    const confirmedFixture = String(
      records(catalog.stateFixtureVariants).find(
        (entry) =>
          entry.stateId === "CONFIRMED" && entry.variantId === "confirmed_correct_continue",
      )?.fixtureId,
    );
    const confirmedCell = stateCell("CONFIRMED", confirmedFixture);
    const retainedConfirmed = stateExample(
      "CONFIRMED",
      "confirmed_correct_continue",
      "continue",
      confirmedFixture,
    );
    expect(validateReduced(structuredClone(retainedConfirmed), confirmedCell)).toBe(true);
    const missingVariant = structuredClone(retainedConfirmed);
    delete record(missingVariant.staticEquivalent).copyDigest;
    expect(validateReduced(missingVariant, confirmedCell)).toBe(false);
    expect(validateReduced({ ...retainedConfirmed, unknownVariant: true }, confirmedCell)).toBe(
      false,
    );
    const staleFixture = String(
      records(catalog.stateFixtureVariants).find(
        (entry) => entry.stateId === "CONFIRMED" && entry.variantId === "confirmed_correct_finish",
      )?.fixtureId,
    );
    expect(validateReduced(retainedConfirmed, stateCell("CONFIRMED", staleFixture))).toBe(false);
    expect(
      validateReduced(
        {
          ...stateExample("ACTIVE", "confirmed_correct_continue", "check_answer"),
          variantId: "confirmed_correct_continue",
        },
        activeCell,
      ),
    ).toBe(false);
    expect(
      validateReduced(
        { ...retainedConfirmed, callerVariantId: "confirmed_correct_continue" },
        confirmedCell,
      ),
    ).toBe(false);

    const activeDarkCell = { ...activeCell, themeId: "dark" };
    const darkFocusArtifact = syntheticFocus(activeDarkCell);
    const darkReduced = syntheticReducedMotion(activeDarkCell);
    expect(validateReduced(darkReduced, activeDarkCell, darkFocusArtifact)).toBe(true);
    expect(validateReduced(darkReduced, activeCell, darkFocusArtifact)).toBe(false);
    expect(validateReduced(reducedMotionExample, activeDarkCell, pairedFocusArtifact)).toBe(false);

    const documentFocus = { kind: "document", target: null };
    const documentFocusArtifact = {
      ...pairedFocusArtifact,
      finalFocus: documentFocus,
    };
    const documentReduced = {
      ...reducedMotionExample,
      staticEquivalent: {
        ...record(reducedMotionExample.staticEquivalent),
        focusPosition: documentFocus,
      },
    };
    expect(validateReduced(documentReduced, activeCell, documentFocusArtifact)).toBe(true);
    expect(
      validateReduced(
        {
          ...documentReduced,
          focusBinding: {
            ...record(record(documentReduced).focusBinding),
            normalPosition: {
              kind: "element",
              target: record(expectedFocusStops(activeCell)[0]).target,
            },
          },
        },
        activeCell,
        documentFocusArtifact,
      ),
    ).toBe(false);
    expect(createHash("sha256").update(JSON.stringify(contracts)).digest("hex")).toBe(
      "c1630c070a80d9cba914c43c0bd4f7426cf263678d17b147e9bcd8d74403acc8",
    );
  });

  it("binds keyboard executions and NVDA speech field-for-field to the owning cell", () => {
    const evidence = record(catalog.evidence);
    expect(evidence.keyboardApplicabilityFields).toEqual(keyboardApplicabilityFields);
    expect(evidence.keyboardExecutionFields).toEqual(keyboardExecutionFields);
    expect(evidence.nvdaExpectationTemplateFields).toEqual(nvdaExpectationTemplateFields);
    records(evidence.keyboardApplicability).forEach((entry) =>
      exactKeys(entry, keyboardApplicabilityFields),
    );
    records(evidence.nvdaExpectationTemplates).forEach((entry) =>
      exactKeys(entry, nvdaExpectationTemplateFields),
    );
    expect(evidence.syntheticObservationFields).toEqual(syntheticObservationFields);
    expect(evidence.syntheticObservationValues).toEqual({
      confirmedCount: 3,
      dailyTarget: 5,
      selectedOptionLabel: "Biblioteca",
      selectedOptionPosition: 2,
      selectedOptionCount: 4,
    });

    const cell = {
      stateId: "ACTIVE",
      viewportId: "phone_320x568",
      themeId: "light",
      localeId: "en",
      textScaleId: "browser_zoom_100",
      fixtureId: "long_localized_prompt_and_choices",
    };
    const executions = expectedKeyboardExecutions(cell);
    expect(executions).toHaveLength(9);
    expect(validKeyboardExecutions(executions, cell)).toBe(true);
    expect(
      executions.find(({ interactionId }) => interactionId === "primary_action_activate"),
    ).toMatchObject({
      applicability: "APPLICABLE",
      expectedFocusId: "primary_action_status_position",
      expectedFocusMoveCount: 0,
      observedFocusId: "primary_action_status_position",
      observedFocusMoveCount: 0,
    });
    const retrySubmitFixtureId = String(
      records(catalog.stateFixtureVariants).find(
        ({ stateId, variantId }) =>
          stateId === "RETRYABLE_ERROR" && variantId === "retryable_error_submit",
      )?.fixtureId,
    );
    const retrySubmitCell = {
      ...cell,
      stateId: "RETRYABLE_ERROR",
      fixtureId: retrySubmitFixtureId,
    };
    expect(
      expectedKeyboardExecutions(retrySubmitCell).find(
        ({ interactionId }) => interactionId === "primary_action_activate",
      ),
    ).toMatchObject({
      applicability: "APPLICABLE",
      expectedFocusId: "primary_action_status_position",
      expectedFocusMoveCount: 0,
      observedFocusId: "primary_action_status_position",
      observedFocusMoveCount: 0,
    });
    const applicableIndex = executions.findIndex(
      ({ applicability }) => applicability === "APPLICABLE",
    );
    const excludedIndex = executions.findIndex(({ applicability }) => applicability === "EXCLUDED");
    const mutateExecution = (index: number, mutation: JsonRecord) =>
      executions.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...mutation } : entry,
      );
    for (const invalid of [
      executions.slice(1),
      [...executions, executions[0]!],
      [...executions].reverse(),
      mutateExecution(applicableIndex, { applicability: "EXCLUDED" }),
      mutateExecution(applicableIndex, { observedOutcomeId: null }),
      mutateExecution(applicableIndex, { observedFocusId: "single_h1" }),
      mutateExecution(applicableIndex, { expectedFocusMoveCount: 9 }),
      mutateExecution(applicableIndex, { observedFocusMoveCount: 9 }),
      mutateExecution(applicableIndex, { observedAnnouncementDelta: 9 }),
      mutateExecution(applicableIndex, { noProgressMutation: false }),
      mutateExecution(excludedIndex, {
        applicability: "APPLICABLE",
        exclusionReason: null,
        verdict: "PASS",
      }),
    ])
      expect(validKeyboardExecutions(invalid, cell)).toBe(false);

    const nvdaRecords = expectedNvdaRecords(cell);
    const artifact = syntheticAnnouncements(cell, "2026.1");
    expect(validAnnouncementsArtifact(artifact, cell, "2026.1")).toBe(true);
    expect(nvdaRecords.map(({ eventId }) => eventId)).toEqual([
      "state_entry",
      "active_radio_group",
      "radio_selection",
    ]);
    expect(nvdaRecords[0]).toMatchObject({
      eventId: "state_entry",
      modeId: "focus",
      sourceTargetId: "state_heading",
      spokenText: "Choose your answer",
    });
    for (const [field, wrong] of [
      ["sourceTargetId", "primary_action"],
      ["roleId", "button"],
      ["accessibleName", "Wrong"],
      ["accessibleState", "wrong"],
      ["accessibleValue", "wrong"],
      ["modeId", "browse"],
      ["politeness", "assertive"],
      ["spokenText", "reviewer@example.com"],
    ] as const) {
      const records = structuredClone(nvdaRecords);
      records[0] = { ...records[0], [field]: wrong };
      expect(validAnnouncementsArtifact({ ...artifact, records }, cell, "2026.1")).toBe(false);
    }
    const tokenRecords = structuredClone(nvdaRecords);
    tokenRecords[0] = { ...tokenRecords[0], accessibleValue: "token=private-canary" };
    expect(validAnnouncementsArtifact({ ...artifact, records: tokenRecords }, cell, "2026.1")).toBe(
      false,
    );

    const selected = nvdaRecords.find(({ eventId }) => eventId === "radio_selection")!;
    expect(selected.accessibleName).toBe("Biblioteca, 2 of 4");
    expect(selected.spokenText).toBe("Biblioteca, 2 of 4 checked");
    for (const wrong of [
      "Selected answer",
      "Biblioteca, 1 of 4",
      "Biblioteca, 2 of 3",
      "{selected option}, {position} of {count}",
    ]) {
      const records = structuredClone(nvdaRecords);
      const index = records.findIndex(({ eventId }) => eventId === "radio_selection");
      records[index] = { ...records[index], accessibleName: wrong };
      expect(validAnnouncementsArtifact({ ...artifact, records }, cell, "2026.1")).toBe(false);
    }

    const confirmedCell = { ...cell, stateId: "CONFIRMED" };
    const confirmedRecords = expectedNvdaRecords(confirmedCell);
    const progress = confirmedRecords.find(
      ({ eventId }) => eventId === "confirmed_progress_changed",
    )!;
    expect(progress.accessibleValue).toBe("3 of 5 activities complete today.");
    expect(progress.spokenText).toBe("Today’s goal progress. 3 of 5 activities complete today.");
    expect(JSON.stringify(confirmedRecords)).not.toMatch(/\{confirmed count\}|\{daily target\}/);

    const dialogCell = { ...cell, fixtureId: "late_confirmation_after_exit" };
    const dialogExecutions = expectedKeyboardExecutions(dialogCell);
    expect(
      dialogExecutions
        .filter(({ applicability }) => applicability === "APPLICABLE")
        .map(({ interactionId }) => interactionId),
    ).toEqual(["dialog_tab_cycle", "dialog_escape"]);
    expect(
      dialogExecutions
        .filter(({ applicability }) => applicability === "EXCLUDED")
        .every(({ exclusionReason }) => exclusionReason === "modal_background_inert"),
    ).toBe(true);
    const wrongDialog = structuredClone(dialogExecutions);
    wrongDialog[0] = {
      ...wrongDialog[0],
      applicability: "APPLICABLE",
      exclusionReason: null,
      observedOutcomeId: wrongDialog[0]?.expectedOutcomeId,
      observedFocusId: wrongDialog[0]?.expectedFocusId,
      observedAnnouncementDelta: 0,
      verdict: "PASS",
    };
    expect(validKeyboardExecutions(wrongDialog, dialogCell)).toBe(false);
  });

  it("recomputes the UX, source, bundle, and all artifact digests from trusted bytes", () => {
    expect(catalog.uxContractDigest).toBe(computedUxContractDigest());
    const run = record(record(catalog.evidence).runManifest);
    const manifest = Object.fromEntries(strings(run.fieldOrder).map((field) => [field, null]));
    const fixtureBytesByPath = { "fixtures/break-ui.json": Buffer.from("fixture-v1") };
    const fontBytesByPath = { "fonts/display.woff2": Buffer.from("font-v1") };
    Object.assign(manifest, {
      schemaVersion: 1,
      sourceCommit: "a".repeat(40),
      buildCommit: "b".repeat(40),
      specDigest: createHash("sha256").update(Buffer.from(spec)).digest("hex"),
      specByteSize: Buffer.byteLength(spec),
      uxContractDigest: catalog.uxContractDigest,
      fixtureDigest: bundleDigest("fluyo:r4a:fixture-bundle:v1\n", fixtureBytesByPath),
      fixtureBundleByteSize: bundleByteSize(fixtureBytesByPath),
      fontDigest: bundleDigest("fluyo:r4a:font-bundle:v1\n", fontBytesByPath),
      fontBundleByteSize: bundleByteSize(fontBytesByPath),
      keyboardProtocolDigest: record(catalog.evidence).keyboardProtocolDigest,
      nvdaProtocolDigest: record(catalog.evidence).nvdaProtocolDigest,
      browserAtProfileId: "windows_chromium_nvda",
      osVersion: "Windows 11 24H2",
      chromiumVersion: "130.0.1",
      nvdaVersion: "2026.1",
      capturedAtUtc: "2026-10-31T00:00:00Z",
      cells: closedCellRecords(),
      cellMappings: closedCellMappings(),
      captureProfiles: closedCaptureProfiles(),
      artifactHashes: {},
      artifactByteSizes: {},
      aggregateArtifactBytes: 0,
      transitionEvidenceLocator: null,
      transitionEvidenceHash: null,
      transitionEvidenceByteSize: null,
      transitionEvidenceValidationDigest: null,
      artifactValidationDigest: null,
      artifactContentDigest: null,
      reviewerEvidenceHash: null,
      cleanupEvidenceHash: null,
      artifactSetDigest: null,
      artifactScanEvidence: {},
      reviewerCompletion: null,
      cleanupEvidence: null,
      scanStatus: "NOT_RUN",
      reviewerRole: "Elana",
      verdict: "UNATTEMPTED",
      deleteByUtc: "2026-11-01T00:00:00Z",
    });
    const trusted: SyntheticManifestFixtureInputs = {
      sourceCommit: String(manifest.sourceCommit),
      buildCommit: String(manifest.buildCommit),
      specBytes: Buffer.from(spec),
      fixtureBytesByPath,
      fontBytesByPath,
      artifactBytesByPath: {},
      capturePayloadBytesByPhysicalKey: {},
      baselineProvenanceBytesByPhysicalKey: {},
      scannerResultBytesByProofKey: {},
      workflowFileBytes: Buffer.from("future-r4b-base-controlled-workflow-v1\n"),
      artifactValidationResultForPhysicalKey: () => undefined,
    };
    expect(validateSyntheticManifestFixtureOnly(manifest, trusted)).toBe("SIMULATED_FIXTURE_ONLY");
    expect(validateSyntheticManifestFixtureOnly(manifest, trusted)).not.toBe("PASS");
    const keys = canonicalArtifactKeys(manifest);
    const hashes = Object.fromEntries(
      keys.map((key) => [key, createHash("sha256").update(`future-r4b:${key}`).digest("hex")]),
    );
    const artifactByteSizes = Object.fromEntries(keys.map((key) => [key, 1]));
    const workflowFileBytes = Buffer.from("future-r4b-base-controlled-workflow-v1\n");
    const workflowDigest = createHash("sha256").update(workflowFileBytes).digest("hex");
    const transitionEvidenceBytes = canonicalJsonBytes(
      transitionEvidencePayload(String(manifest.sourceCommit), "1001", 1),
    );
    const transitionPayload = record(parseCanonicalJsonBytes(transitionEvidenceBytes));
    const passBase = {
      ...manifest,
      transitionEvidenceLocator: {
        workflowRunId: "1001",
        runAttempt: 1,
        artifactId: transitionEvidenceArtifactId,
      },
      transitionEvidenceHash: bufferDigest(transitionEvidenceBytes),
      transitionEvidenceByteSize: transitionEvidenceBytes.length,
      transitionEvidenceValidationDigest: transitionPayload.validationDigest,
    };
    const proof = futurePassEvidence(passBase, hashes, artifactByteSizes, keys, workflowDigest);
    const pass = {
      ...passBase,
      artifactHashes: hashes,
      artifactByteSizes,
      aggregateArtifactBytes: exactArtifactByteTotal(artifactByteSizes, keys),
      artifactValidationDigest: proof.artifactValidationDigest,
      artifactContentDigest: proof.artifactContentDigest,
      reviewerEvidenceHash: proof.reviewerEvidenceHash,
      cleanupEvidenceHash: proof.cleanupEvidenceHash,
      artifactSetDigest: proof.artifactSetDigest,
      artifactScanEvidence: proof.artifactScanEvidence,
      reviewerCompletion: proof.reviewerCompletion,
      cleanupEvidence: proof.cleanupEvidence,
      scanStatus: "PASS",
      verdict: "PASS",
    };
    expect(keys).toHaveLength(86_400);
    expect(validManifestStructure(pass)).toBe(true);
    const semanticKeys = representativeSemanticKeys();
    const artifactBytesByPath = syntheticArtifactBytesForKeys(
      semanticKeys,
      String(manifest.nvdaVersion),
    );
    const baselineProvenanceBytesByPhysicalKey = syntheticBaselineProvenanceBytes(
      semanticKeys,
      artifactBytesByPath,
      pass,
    );
    const capturePayloadBytesByPhysicalKey = syntheticCapturePayloadBytes(
      semanticKeys,
      artifactBytesByPath,
      pass,
      baselineProvenanceBytesByPhysicalKey,
    );
    const baselineKey = Object.keys(baselineProvenanceBytesByPhysicalKey)[0]!;
    const baselineHash = createHash("sha256")
      .update(artifactBytesByPath[baselineKey]!)
      .digest("hex");
    const baselinePayload = record(
      parseCanonicalJsonBytes(baselineProvenanceBytesByPhysicalKey[baselineKey]!)!,
    );
    const signedBaselineMutation = (changes: JsonRecord): Buffer => {
      const mutation = { ...baselinePayload, ...changes };
      mutation.approvalArtifactDigest = baselineApprovalArtifactDigest(mutation);
      mutation.provenanceDigest = baselineProvenanceDigest(mutation);
      return canonicalJsonBytes(mutation);
    };
    expect(
      validSyntheticBaselineProvenance(
        baselineProvenanceBytesByPhysicalKey[baselineKey],
        pass,
        baselineKey,
        baselineHash,
      ),
    ).toBeDefined();
    for (const mutation of [
      signedBaselineMutation({ approvedBy: "Unknown reviewer" }),
      signedBaselineMutation({ buildCommit: manifest.buildCommit }),
      signedBaselineMutation({ sourceCommit: "d".repeat(40) }),
      signedBaselineMutation({ validationHead: "e".repeat(40) }),
      signedBaselineMutation({ cellDigest: "0".repeat(64) }),
      signedBaselineMutation({ pixelWidth: Number(baselinePayload.pixelWidth) + 1 }),
      signedBaselineMutation({ captureToolVersion: "2.0.0" }),
      signedBaselineMutation({ colorProfile: "display-p3" }),
      signedBaselineMutation({ approvedAtUtc: addUtcSeconds(manifest.capturedAtUtc, 1) }),
      signedBaselineMutation({ capturedAtUtc: addUtcSeconds(baselinePayload.approvedAtUtc, 1) }),
      signedBaselineMutation({
        approvalReference: `git:${"f".repeat(40)}:docs/r4b-baselines/${baselinePayload.cellDigest}.json`,
      }),
      canonicalJsonBytes({ ...baselinePayload, approvalArtifactDigest: "0".repeat(64) }),
    ]) {
      expect(
        validSyntheticBaselineProvenance(mutation, pass, baselineKey, baselineHash),
      ).toBeUndefined();
    }
    const actualCaptureKey = baselineKey.replace(/baseline\.png$/, "actual.png");
    const actualCapturePayload = record(
      parseCanonicalJsonBytes(capturePayloadBytesByPhysicalKey[actualCaptureKey]!)!,
    );
    for (const changes of [
      { capturedAtUtc: addUtcSeconds(manifest.capturedAtUtc, -1) },
      { capturedAtUtc: addUtcSeconds(manifest.deleteByUtc, 1) },
      { captureSequenceOrdinal: 2 },
      { captureLegId: String(actualCapturePayload.captureLegId).replace("candidate_", "reused_") },
    ]) {
      const mutation: JsonRecord = { ...actualCapturePayload, ...changes };
      mutation.provenanceDigest = captureProvenanceDigest(mutation);
      expect(
        validTrustedCapturePayload(
          canonicalJsonBytes(mutation),
          pass,
          actualCaptureKey,
          createHash("sha256").update(artifactBytesByPath[actualCaptureKey]!).digest("hex"),
          null,
        ),
      ).toBe(false);
    }
    expect(semanticKeys.length).toBeLessThanOrEqual(artifactIds.length * 32);
    expect(
      validSemanticArtifactSet(
        semanticKeys,
        artifactBytesByPath,
        pass,
        capturePayloadBytesByPhysicalKey,
        baselineProvenanceBytesByPhysicalKey,
      ),
    ).toBe(true);
    const semanticHashes = Object.fromEntries(
      semanticKeys.map((key) => [
        key,
        createHash("sha256").update(artifactBytesByPath[key]!).digest("hex"),
      ]),
    );
    const scannerResultBytesByProofKey = syntheticScannerResultBytes(
      semanticKeys,
      semanticHashes,
      pass,
      workflowDigest,
    );
    const authoritativeHashes = { ...hashes, ...semanticHashes };
    const authoritativeSizes = {
      ...artifactByteSizes,
      ...Object.fromEntries(semanticKeys.map((key) => [key, artifactBytesByPath[key]!.length])),
    };
    const authoritativeProof = futurePassEvidence(
      passBase,
      authoritativeHashes,
      authoritativeSizes,
      keys,
      workflowDigest,
    );
    const authoritativePass = {
      ...pass,
      artifactHashes: authoritativeHashes,
      artifactByteSizes: authoritativeSizes,
      aggregateArtifactBytes: exactArtifactByteTotal(authoritativeSizes, keys),
      artifactValidationDigest: authoritativeProof.artifactValidationDigest,
      artifactContentDigest: authoritativeProof.artifactContentDigest,
      reviewerEvidenceHash: authoritativeProof.reviewerEvidenceHash,
      cleanupEvidenceHash: authoritativeProof.cleanupEvidenceHash,
      artifactSetDigest: authoritativeProof.artifactSetDigest,
      artifactScanEvidence: authoritativeProof.artifactScanEvidence,
      reviewerCompletion: authoritativeProof.reviewerCompletion,
      cleanupEvidence: authoritativeProof.cleanupEvidence,
    };
    const authoritativeResultFor = (physicalKey: string, ordinal: number): JsonRecord =>
      artifactValidationResult(
        physicalKey,
        ordinal,
        String(authoritativeHashes[physicalKey]),
        record(record(authoritativePass.artifactScanEvidence)[physicalKey]),
        String(manifest.buildCommit),
      );
    const authoritativeTrusted: SyntheticManifestFixtureInputs = {
      sourceCommit: String(manifest.sourceCommit),
      buildCommit: String(manifest.buildCommit),
      specBytes: Buffer.from(spec),
      fixtureBytesByPath,
      fontBytesByPath,
      artifactBytesByPath,
      capturePayloadBytesByPhysicalKey,
      baselineProvenanceBytesByPhysicalKey,
      scannerResultBytesByProofKey,
      workflowFileBytes,
      artifactValidationResultForPhysicalKey: authoritativeResultFor,
      transitionEvidenceBytes,
      reviewerEvidenceBytes: authoritativeProof.reviewerEvidenceBytes as Buffer,
      cleanupEvidenceBytes: authoritativeProof.cleanupEvidenceBytes as Buffer,
    };
    expect(validManifestStructure(authoritativePass)).toBe(true);
    const scannerEvidenceMismatches = semanticKeys.flatMap((physicalKey) => {
      const context = scannerContext(
        authoritativePass,
        physicalKey,
        String(authoritativeHashes[physicalKey]),
        workflowDigest,
      );
      const actual = record(authoritativePass.artifactScanEvidence)[physicalKey];
      const expected = scanEvidenceFor(
        physicalKey,
        String(authoritativeHashes[physicalKey]),
        scannerResultBytesByProofKey,
        context,
      );
      return validScanEvidence(
        actual,
        physicalKey,
        authoritativeHashes[physicalKey],
        scannerResultBytesByProofKey,
        context,
      )
        ? []
        : [
            {
              physicalKey,
              differingFields: scanEvidenceFields.filter(
                (field) =>
                  JSON.stringify(record(actual)[field]) !== JSON.stringify(expected[field]),
              ),
            },
          ];
    });
    expect(scannerEvidenceMismatches).toEqual([]);
    expect(
      validReviewerCompletion(
        authoritativePass,
        String(authoritativeProof.artifactContentDigest),
        String(authoritativeProof.artifactValidationDigest),
        keys.length,
        authoritativeProof.reviewerEvidenceBytes as Buffer,
        workflowFileBytes,
        addUtcSeconds(manifest.capturedAtUtc, 24000),
      ),
    ).toBe(true);
    expect(
      validCleanupEvidence(
        authoritativePass,
        String(authoritativeProof.artifactContentDigest),
        String(authoritativeProof.artifactValidationDigest),
        keys.length,
        authoritativeProof.cleanupEvidenceBytes as Buffer,
        workflowFileBytes,
      ),
    ).toBe(true);
    expect(validateSyntheticManifestFixtureOnly(authoritativePass, authoritativeTrusted)).toBe(
      "SIMULATED_FIXTURE_ONLY",
    );
    expect(
      validArtifactValidationResultStream(
        keys,
        authoritativeHashes,
        record(authoritativePass.artifactScanEvidence),
        String(manifest.buildCommit),
        authoritativePass.artifactValidationDigest,
        (physicalKey, ordinal) =>
          ordinal === 1 ? undefined : authoritativeResultFor(physicalKey, ordinal),
      ),
    ).toBe(false);
    expect(
      validArtifactValidationResultStream(
        keys,
        authoritativeHashes,
        record(authoritativePass.artifactScanEvidence),
        String(manifest.buildCommit),
        authoritativePass.artifactValidationDigest,
        (physicalKey, ordinal) =>
          ordinal === 1
            ? authoritativeResultFor(physicalKey, ordinal + 1)
            : authoritativeResultFor(physicalKey, ordinal),
      ),
    ).toBe(false);
    expect(
      validArtifactValidationResultStream(
        keys,
        authoritativeHashes,
        record(authoritativePass.artifactScanEvidence),
        String(manifest.buildCommit),
        authoritativePass.artifactValidationDigest,
        (physicalKey, ordinal) =>
          ordinal === 1
            ? {
                ...authoritativeResultFor(physicalKey, ordinal),
                validationHead: "0".repeat(40),
              }
            : authoritativeResultFor(physicalKey, ordinal),
      ),
    ).toBe(false);
    const scannerKey = semanticKeys[0]!;
    const representativeScannerContext = scannerContext(
      pass,
      scannerKey,
      String(semanticHashes[scannerKey]),
      workflowDigest,
    );
    const trustedScanEvidence = scanEvidenceFor(
      scannerKey,
      String(semanticHashes[scannerKey]),
      scannerResultBytesByProofKey,
      representativeScannerContext,
    );
    expect(
      validScanEvidence(
        trustedScanEvidence,
        scannerKey,
        semanticHashes[scannerKey],
        scannerResultBytesByProofKey,
        representativeScannerContext,
      ),
    ).toBe(true);
    const scannerId = applicableScannerIds(artifactIdFromKey(scannerKey))[0]!;
    const scannerKeyId = scannerProofKey(scannerKey, scannerId);
    const scannerPayload = record(
      parseCanonicalJsonBytes(scannerResultBytesByProofKey[scannerKeyId]!)!,
    );
    const scannerMutations: JsonRecord[] = [
      { ...scannerPayload, sourceCommit: "0".repeat(40) },
      { ...scannerPayload, buildCommit: "0".repeat(40) },
      { ...scannerPayload, validationHead: "0".repeat(40) },
      { ...scannerPayload, workflowFilePath: ".github/workflows/untrusted.yml" },
      { ...scannerPayload, workflowFileDigest: "0".repeat(64) },
      { ...scannerPayload, workflowRunId: "1000" },
      { ...scannerPayload, runAttempt: 2 },
      { ...scannerPayload, executedAtUtc: addUtcSeconds(scannerPayload.executedAtUtc, 1) },
      { ...scannerPayload, captureInputDigest: "0".repeat(64) },
      { ...scannerPayload, scannerId: "wrong_scanner" },
      { ...scannerPayload, physicalKey: `${scannerKey}-wrong` },
      { ...scannerPayload, artifactHash: "0".repeat(64) },
      { ...scannerPayload, canaryOutcomes: records(scannerPayload.canaryOutcomes).slice(1) },
      {
        ...scannerPayload,
        canaryOutcomes: records(scannerPayload.canaryOutcomes).map((entry, index) =>
          index === 0 ? { ...entry, detected: false } : entry,
        ),
      },
      { ...scannerPayload, findings: [{ code: "private_canary" }] },
      { ...scannerPayload, status: "FAIL" },
      { ...scannerPayload, networkEgress: "USED" },
    ];
    for (const mutation of scannerMutations) {
      const mutatedResults = {
        ...scannerResultBytesByProofKey,
        [scannerKeyId]: canonicalJsonBytes(mutation),
      };
      expect(
        validScanEvidence(
          trustedScanEvidence,
          scannerKey,
          semanticHashes[scannerKey],
          mutatedResults,
          representativeScannerContext,
        ),
      ).toBe(false);
    }
    const missingScannerResult = { ...scannerResultBytesByProofKey };
    delete missingScannerResult[scannerKeyId];
    expect(
      validScanEvidence(
        trustedScanEvidence,
        scannerKey,
        semanticHashes[scannerKey],
        missingScannerResult,
        representativeScannerContext,
      ),
    ).toBe(false);
    for (const changes of [
      { sourceCommit: "0".repeat(40) },
      { buildCommit: "0".repeat(40) },
      { validationHead: "0".repeat(40) },
      { workflowFileDigest: "0".repeat(64) },
      { workflowRunId: "1000" },
      { runAttempt: 2 },
      { evidenceReference: `git:${manifest.buildCommit}:artifacts/r4b/reused-review.json` },
      { priorArtifactSetDigest: "0".repeat(64) },
      { completedAtUtc: addUtcSeconds(manifest.capturedAtUtc, 23999) },
    ]) {
      const mutation: JsonRecord = { ...record(pass.reviewerCompletion), ...changes };
      mutation.evidenceArtifactDigest = evidenceArtifactDigest(mutation);
      expect(
        validReviewerCompletion(
          pass,
          String(pass.artifactContentDigest),
          String(pass.artifactValidationDigest),
          keys.length,
          canonicalJsonBytes(mutation),
          Buffer.from("future-r4b-base-controlled-workflow-v1\n"),
          addUtcSeconds(manifest.capturedAtUtc, 24000),
        ),
      ).toBe(false);
    }
    expect(
      validReviewerCompletion(
        pass,
        String(pass.artifactContentDigest),
        String(pass.artifactValidationDigest),
        keys.length,
        proof.reviewerEvidenceBytes as Buffer,
        Buffer.from("future-r4b-base-controlled-workflow-v1\n"),
        addUtcSeconds(manifest.capturedAtUtc, 24000),
      ),
    ).toBe(true);
    expect(
      validCleanupEvidence(
        pass,
        String(pass.artifactContentDigest),
        String(pass.artifactValidationDigest),
        keys.length,
        proof.cleanupEvidenceBytes as Buffer,
        Buffer.from("future-r4b-base-controlled-workflow-v1\n"),
      ),
    ).toBe(true);
    const wrongReviewerBytes = canonicalJsonBytes({
      ...record(pass.reviewerCompletion),
      reviewerIdentity: "Not Elana",
    });
    expect(
      validReviewerCompletion(
        pass,
        String(pass.artifactContentDigest),
        String(pass.artifactValidationDigest),
        keys.length,
        wrongReviewerBytes,
        Buffer.from("future-r4b-base-controlled-workflow-v1\n"),
        addUtcSeconds(manifest.capturedAtUtc, 24000),
      ),
    ).toBe(false);
    const failedCleanupBytes = canonicalJsonBytes({
      ...record(pass.cleanupEvidence),
      deletedArtifactCount: keys.length - 1,
      retainedArtifactCount: 1,
      outcome: "FAILED",
      retryState: "REQUIRED",
      failureCode: "bounded_cleanup_failure",
    });
    expect(
      validCleanupEvidence(
        pass,
        String(pass.artifactContentDigest),
        String(pass.artifactValidationDigest),
        keys.length,
        failedCleanupBytes,
        Buffer.from("future-r4b-base-controlled-workflow-v1\n"),
      ),
    ).toBe(false);
    for (const changes of [
      { sourceCommit: "0".repeat(40) },
      { buildCommit: "0".repeat(40) },
      { validationHead: "0".repeat(40) },
      { workflowFileDigest: "0".repeat(64) },
      { workflowRunId: "1000" },
      { runAttempt: 2 },
      { evidenceReference: `git:${manifest.buildCommit}:artifacts/r4b/reused-cleanup.json` },
      { priorArtifactSetDigest: "0".repeat(64) },
      { startedAtUtc: addUtcSeconds(record(pass.reviewerCompletion).completedAtUtc, -1) },
      { completedAtUtc: addUtcSeconds(manifest.deleteByUtc, 1) },
    ]) {
      const mutation: JsonRecord = { ...record(pass.cleanupEvidence), ...changes };
      mutation.evidenceArtifactDigest = evidenceArtifactDigest(mutation);
      expect(
        validCleanupEvidence(
          pass,
          String(pass.artifactContentDigest),
          String(pass.artifactValidationDigest),
          keys.length,
          canonicalJsonBytes(mutation),
          Buffer.from("future-r4b-base-controlled-workflow-v1\n"),
        ),
      ).toBe(false);
    }
    for (const field of identityFields)
      expect(new Set(semanticKeys.map((key) => String(cellForPhysicalKey(key)?.[field])))).toEqual(
        new Set(closedCellRecords().map((cell) => String(cell[field]))),
      );
    const firstDigest = String(record(closedCellMappings()[0]).cellDigest);
    const wrongCaptureProfiles = structuredClone(closedCaptureProfiles());
    wrongCaptureProfiles[firstDigest] = {
      ...record(wrongCaptureProfiles[firstDigest]),
      observedWidthCssPx: Number(record(wrongCaptureProfiles[firstDigest]).observedWidthCssPx) + 1,
    };
    expect(validManifestStructure({ ...pass, captureProfiles: wrongCaptureProfiles })).toBe(false);
    expect(
      validManifestStructure({
        ...pass,
        reviewerCompletion: {
          ...record(pass.reviewerCompletion),
          artifactSetDigest: "0".repeat(64),
        },
      }),
    ).toBe(false);
    expect(
      validManifestStructure({
        ...pass,
        cleanupEvidence: { ...record(pass.cleanupEvidence), outcome: "FAILED" },
      }),
    ).toBe(false);
    expect(validManifestStructure({ ...pass, reviewerCompletion: null })).toBe(false);
    expect(validManifestStructure({ ...pass, cleanupEvidence: null })).toBe(false);
    for (const mutation of [
      { ...manifest, uxContractDigest: "0".repeat(64) },
      { ...manifest, specDigest: "0".repeat(64) },
      { ...manifest, specByteSize: Number(manifest.specByteSize) + 1 },
      { ...manifest, fixtureDigest: "0".repeat(64) },
      { ...manifest, fontDigest: "0".repeat(64) },
    ])
      expect(validateSyntheticManifestFixtureOnly(mutation, trusted)).toBeUndefined();
    expect(
      validSemanticArtifactSet(
        semanticKeys,
        Object.fromEntries(Object.entries(artifactBytesByPath).slice(1)),
        pass,
        capturePayloadBytesByPhysicalKey,
        baselineProvenanceBytesByPhysicalKey,
      ),
    ).toBe(false);
    const firstKey = semanticKeys[0]!;
    expect(
      validSemanticArtifactSet(
        semanticKeys,
        {
          ...artifactBytesByPath,
          [firstKey]: Buffer.from("reviewer@example.com token=private-canary"),
        },
        pass,
        capturePayloadBytesByPhysicalKey,
        baselineProvenanceBytesByPhysicalKey,
      ),
    ).toBe(false);
    for (const scanMutation of [
      { artifactHash: "0".repeat(64) },
      { metadataStatus: "FAIL" },
      { ocrStatus: "FAIL" },
      { ocrDenyStatus: "FAIL" },
      { recursiveDenyStatus: "FAIL" },
      { ocrScannerId: "network_ocr" },
      { ocrInputDigest: "0".repeat(64) },
      { ocrOutputDigest: "0".repeat(64) },
      { ocrCanarySetDigest: "0".repeat(64) },
      { ocrCanaryStatus: "FAIL" },
      { semanticValidatorId: "untrusted_semantic_validator" },
      { semanticInputDigest: "0".repeat(64) },
      { semanticOutputDigest: "0".repeat(64) },
      { semanticStatus: "FAIL" },
    ]) {
      const mutatedScan = {
        ...record(record(pass.artifactScanEvidence)[firstKey]),
        ...scanMutation,
      };
      expect(validScanEvidence(mutatedScan, firstKey, record(pass.artifactHashes)[firstKey])).toBe(
        false,
      );
    }
    const missingScan = { ...record(pass.artifactScanEvidence) };
    delete missingScan[firstKey];
    expect(validManifestStructure({ ...pass, artifactScanEvidence: missingScan })).toBe(false);
    const missingCanaryField = {
      ...record(record(pass.artifactScanEvidence)[firstKey]),
    };
    delete missingCanaryField.ocrCanarySetDigest;
    expect(
      validScanEvidence(missingCanaryField, firstKey, record(pass.artifactHashes)[firstKey]),
    ).toBe(false);
    const wrongMediaBytes = { ...artifactBytesByPath, [firstKey]: Buffer.from("not png") };
    expect(
      validSemanticArtifactSet(
        semanticKeys,
        wrongMediaBytes,
        pass,
        capturePayloadBytesByPhysicalKey,
        baselineProvenanceBytesByPhysicalKey,
      ),
    ).toBe(false);
    const firstCell = cellForPhysicalKey(firstKey)!;
    const firstProfile = expectedCaptureProfile(firstCell);
    const metadataCanary = Buffer.concat([
      syntheticPng(firstCell, "actual.png").subarray(0, -12),
      pngChunk("tEXt", Buffer.from("reviewer@example.com")),
      pngChunk("IEND", Buffer.alloc(0)),
    ]);
    expect(
      parsePng(
        metadataCanary,
        Number(firstProfile.observedWidthCssPx),
        Number(firstProfile.observedHeightCssPx),
      ),
    ).toBeUndefined();
    const firstRoot = firstKey.slice(0, firstKey.lastIndexOf("/") + 1);
    expect(
      semanticArtifactValid(
        `${firstRoot}actual.png`,
        artifactBytesByPath[`${firstRoot}baseline.png`]!,
        pass,
        artifactBytesByPath,
        capturePayloadBytesByPhysicalKey,
        baselineProvenanceBytesByPhysicalKey,
      ),
    ).toBe(false);
    expect(
      semanticArtifactValid(
        `${firstRoot}diff.png`,
        artifactBytesByPath[`${firstRoot}actual.png`]!,
        pass,
        artifactBytesByPath,
        capturePayloadBytesByPhysicalKey,
        baselineProvenanceBytesByPhysicalKey,
      ),
    ).toBe(false);
    const pixelWidth =
      Number(firstProfile.observedWidthCssPx) * Number(firstProfile.deviceScaleFactor);
    const pixelHeight =
      Number(firstProfile.observedHeightCssPx) * Number(firstProfile.deviceScaleFactor);
    const pixelByteCount = safeProduct(pixelWidth, pixelHeight, 4)!;
    const arbitraryBaselinePixels = Buffer.alloc(pixelByteCount, 17);
    const arbitraryActualPixels = Buffer.from(arbitraryBaselinePixels);
    arbitraryActualPixels.set([9, 31, 127, 255], 0);
    arbitraryActualPixels.set([240, 5, 80, 255], pixelByteCount - 4);
    const arbitraryDiffPixels = Buffer.alloc(pixelByteCount);
    arbitraryDiffPixels.set([255, 0, 255, 255], 0);
    arbitraryDiffPixels.set([255, 0, 255, 255], pixelByteCount - 4);
    const arbitraryPngs = {
      ...artifactBytesByPath,
      [`${firstRoot}actual.png`]: encodePng(pixelWidth, pixelHeight, arbitraryActualPixels),
      [`${firstRoot}baseline.png`]: encodePng(pixelWidth, pixelHeight, arbitraryBaselinePixels),
      [`${firstRoot}diff.png`]: encodePng(pixelWidth, pixelHeight, arbitraryDiffPixels),
    };
    const arbitraryCapturePayloads = syntheticCapturePayloadBytes(
      [`${firstRoot}actual.png`, `${firstRoot}baseline.png`, `${firstRoot}diff.png`],
      arbitraryPngs,
      pass,
      syntheticBaselineProvenanceBytes([`${firstRoot}baseline.png`], arbitraryPngs, pass),
    );
    const arbitraryBaselineProvenance = syntheticBaselineProvenanceBytes(
      [`${firstRoot}baseline.png`],
      arbitraryPngs,
      pass,
    );
    for (const role of ["actual.png", "baseline.png", "diff.png"])
      expect(
        semanticArtifactValid(
          `${firstRoot}${role}`,
          arbitraryPngs[`${firstRoot}${role}`]!,
          pass,
          arbitraryPngs,
          arbitraryCapturePayloads,
          arbitraryBaselineProvenance,
        ),
      ).toBe(true);
    const unchangedPngs = {
      ...artifactBytesByPath,
      [`${firstRoot}actual.png`]: encodePng(pixelWidth, pixelHeight, arbitraryBaselinePixels),
      [`${firstRoot}baseline.png`]: encodePng(pixelWidth, pixelHeight, arbitraryBaselinePixels),
      [`${firstRoot}diff.png`]: encodePng(pixelWidth, pixelHeight, Buffer.alloc(pixelByteCount)),
    };
    const unchangedCapturePayloads = syntheticCapturePayloadBytes(
      [`${firstRoot}actual.png`, `${firstRoot}baseline.png`, `${firstRoot}diff.png`],
      unchangedPngs,
      pass,
      syntheticBaselineProvenanceBytes([`${firstRoot}baseline.png`], unchangedPngs, pass),
    );
    const unchangedBaselineProvenance = syntheticBaselineProvenanceBytes(
      [`${firstRoot}baseline.png`],
      unchangedPngs,
      pass,
    );
    expect(
      semanticArtifactValid(
        `${firstRoot}diff.png`,
        unchangedPngs[`${firstRoot}diff.png`]!,
        pass,
        unchangedPngs,
        unchangedCapturePayloads,
        unchangedBaselineProvenance,
      ),
    ).toBe(true);
    const fabricatedDiffPngs = {
      ...arbitraryPngs,
      [`${firstRoot}diff.png`]: unchangedPngs[`${firstRoot}diff.png`]!,
    };
    const fabricatedDiffPayloads = syntheticCapturePayloadBytes(
      [`${firstRoot}actual.png`, `${firstRoot}baseline.png`, `${firstRoot}diff.png`],
      fabricatedDiffPngs,
      pass,
      arbitraryBaselineProvenance,
    );
    expect(
      semanticArtifactValid(
        `${firstRoot}diff.png`,
        fabricatedDiffPngs[`${firstRoot}diff.png`]!,
        pass,
        fabricatedDiffPngs,
        fabricatedDiffPayloads,
        arbitraryBaselineProvenance,
      ),
    ).toBe(false);
    const otherActualKey = semanticKeys.find(
      (key) =>
        key.endsWith("/actual.png") &&
        key !== `${firstRoot}actual.png` &&
        cellForPhysicalKey(key)?.viewportId !== firstCell.viewportId,
    )!;
    expect(otherActualKey).toBeDefined();
    const crossCellCapturePayloads = {
      ...capturePayloadBytesByPhysicalKey,
      [`${firstRoot}actual.png`]: capturePayloadBytesByPhysicalKey[otherActualKey]!,
    };
    expect(
      semanticArtifactValid(
        `${firstRoot}actual.png`,
        artifactBytesByPath[`${firstRoot}actual.png`]!,
        pass,
        artifactBytesByPath,
        crossCellCapturePayloads,
        baselineProvenanceBytesByPhysicalKey,
      ),
    ).toBe(false);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(Number(firstProfile.observedWidthCssPx), 0);
    ihdr.writeUInt32BE(Number(firstProfile.observedHeightCssPx), 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    const oversizedIdat = Buffer.concat([
      Buffer.from("89504e470d0a1a0a", "hex"),
      pngChunk("IHDR", ihdr),
      pngChunk("IDAT", Buffer.alloc(Number(resourceBudgets.pngMaximumCompressedIdatBytes) + 1)),
      pngChunk("IEND", Buffer.alloc(0)),
    ]);
    expect(
      parsePng(
        oversizedIdat,
        Number(firstProfile.observedWidthCssPx),
        Number(firstProfile.observedHeightCssPx),
      ),
    ).toBeUndefined();
    expect(safeProduct(Number.MAX_SAFE_INTEGER, 2)).toBeUndefined();
    const focusKeys = semanticKeys.filter((key) => key.endsWith("/focus.json"));
    const firstFocus = focusKeys[0]!;
    const differentFocus = focusKeys.find(
      (key) =>
        cellForPhysicalKey(key)?.stateId !== cellForPhysicalKey(firstFocus)?.stateId &&
        cellForPhysicalKey(key)?.themeId === cellForPhysicalKey(firstFocus)?.themeId,
    )!;
    expect(
      semanticArtifactValid(
        firstFocus,
        artifactBytesByPath[differentFocus]!,
        pass,
        artifactBytesByPath,
      ),
    ).toBe(false);
    for (const axis of identityFields) {
      const swapped = focusKeys.find(
        (key) => cellForPhysicalKey(key)?.[axis] !== cellForPhysicalKey(firstFocus)?.[axis],
      );
      expect(swapped).toBeDefined();
      expect(
        semanticArtifactValid(
          firstFocus,
          artifactBytesByPath[swapped!]!,
          pass,
          artifactBytesByPath,
        ),
      ).toBe(false);
    }
    const overflowKey = semanticKeys.find((key) => key.endsWith("/overflow.json"))!;
    expect(
      semanticArtifactValid(overflowKey, canonicalJsonBytes({}), pass, artifactBytesByPath),
    ).toBe(false);
    const overflowCell = cellForPhysicalKey(overflowKey)!;
    const observedOverflow = syntheticOverflow(overflowCell);
    const observedRegions: JsonRecord[] = records(observedOverflow.regions).map((region, index) => {
      const rect = record(region.rect);
      const inset = index % 2;
      return {
        ...region,
        rect: {
          ...rect,
          x: inset,
          width: Number(rect.width) - inset * 2,
        },
      };
    });
    observedOverflow.regions = observedRegions;
    observedOverflow.clipping = observedRegions.map(({ regionId }) => ({
      regionId,
      clipped: false,
    }));
    observedOverflow.overlap = expectedOverlapPairs(observedRegions);
    expect(
      semanticArtifactValid(
        overflowKey,
        canonicalJsonBytes(observedOverflow),
        pass,
        artifactBytesByPath,
      ),
    ).toBe(true);
    const wrongOverflow = syntheticOverflow(overflowCell);
    wrongOverflow.regions = records(wrongOverflow.regions).slice(1);
    expect(
      semanticArtifactValid(
        overflowKey,
        canonicalJsonBytes(wrongOverflow),
        pass,
        artifactBytesByPath,
      ),
    ).toBe(false);
    const contrastKey = semanticKeys.find((key) => key.endsWith("/contrast.json"))!;
    const contrastCell = cellForPhysicalKey(contrastKey)!;
    const exactContrast = syntheticContrast(contrastCell);
    expect(
      semanticArtifactValid(
        contrastKey,
        canonicalJsonBytes(exactContrast),
        pass,
        artifactBytesByPath,
      ),
    ).toBe(true);
    const wrongContrast = syntheticContrast(contrastCell);
    wrongContrast.pairs = records(wrongContrast.pairs).slice(1);
    expect(
      semanticArtifactValid(
        contrastKey,
        canonicalJsonBytes(wrongContrast),
        pass,
        artifactBytesByPath,
      ),
    ).toBe(false);
    for (const pairMutation of [
      { foregroundTokenId: "paper" },
      { backgroundTokenId: "ink" },
      { observedForegroundRgba: { red: 255, green: 250, blue: 240, alpha: 1 } },
      { observedBackgroundRgba: { red: 23, green: 19, blue: 63, alpha: 1 } },
      { computedRatio: 21 },
      { requiredRatio: 1 },
    ]) {
      const mutatedContrast = syntheticContrast(contrastCell);
      mutatedContrast.pairs = records(mutatedContrast.pairs).map((pair, index) =>
        index === 0 ? { ...pair, ...pairMutation } : pair,
      );
      expect(
        semanticArtifactValid(
          contrastKey,
          canonicalJsonBytes(mutatedContrast),
          pass,
          artifactBytesByPath,
        ),
      ).toBe(false);
    }
    const oversizedSizes = { ...record(pass.artifactByteSizes), [firstKey]: 2_097_153 };
    expect(
      validManifestStructure({
        ...pass,
        artifactByteSizes: oversizedSizes,
        aggregateArtifactBytes: Number(pass.aggregateArtifactBytes) + 2_097_153,
        artifactContentDigest: artifactContentDigest(
          record(pass.artifactHashes),
          oversizedSizes,
          record(pass.artifactScanEvidence),
          keys,
          String(pass.artifactValidationDigest),
          String(pass.transitionEvidenceHash),
          Number(pass.transitionEvidenceByteSize),
          String(pass.transitionEvidenceValidationDigest),
        ),
      }),
    ).toBe(false);
  }, 300_000);

  it("locks a typed ordered run manifest and rejects malformed mutations", () => {
    const run = record(record(catalog.evidence).runManifest);
    exactKeys(run, [
      "fieldOrder",
      "fieldTypes",
      "forbiddenFields",
      "statusRules",
      "retentionRules",
    ]);
    const order = strings(run.fieldOrder);
    expect(Object.keys(record(run.fieldTypes))).toEqual(order);
    expect(run.forbiddenFields).toEqual([
      "identity",
      "email",
      "userId",
      "ownerId",
      "accountId",
      "token",
      "secret",
      "credential",
      "url",
      "host",
      "query",
      "fragment",
      "path",
      "error",
      "stack",
      "log",
      "command",
      "campaign",
      "billing",
      "answer",
      "learningContent",
    ]);
    const valid = Object.fromEntries(order.map((field) => [field, null])) as JsonRecord;
    Object.assign(valid, {
      schemaVersion: 1,
      sourceCommit: "a".repeat(40),
      buildCommit: "b".repeat(40),
      specDigest: "c".repeat(64),
      specByteSize: 1,
      uxContractDigest: catalog.uxContractDigest,
      fixtureDigest: "d".repeat(64),
      fixtureBundleByteSize: 1,
      fontDigest: "e".repeat(64),
      fontBundleByteSize: 1,
      keyboardProtocolDigest: record(catalog.evidence).keyboardProtocolDigest,
      nvdaProtocolDigest: record(catalog.evidence).nvdaProtocolDigest,
      browserAtProfileId: "windows_chromium_nvda",
      osVersion: "Windows 11 24H2",
      chromiumVersion: "130.0.1",
      nvdaVersion: "2026.1",
      capturedAtUtc: "2026-10-31T00:00:00Z",
      cells: closedCellRecords(),
      cellMappings: closedCellMappings(),
      captureProfiles: closedCaptureProfiles(),
      artifactHashes: {},
      artifactByteSizes: {},
      aggregateArtifactBytes: 0,
      transitionEvidenceLocator: null,
      transitionEvidenceHash: null,
      transitionEvidenceByteSize: null,
      transitionEvidenceValidationDigest: null,
      artifactValidationDigest: null,
      artifactContentDigest: null,
      reviewerEvidenceHash: null,
      cleanupEvidenceHash: null,
      artifactSetDigest: null,
      artifactScanEvidence: {},
      reviewerCompletion: null,
      cleanupEvidence: null,
      scanStatus: "NOT_RUN",
      reviewerRole: "Elana",
      verdict: "UNATTEMPTED",
      deleteByUtc: "2026-11-01T00:00:00Z",
    });
    expect(validManifestStructure(valid)).toBe(true);
    expect(canonicalArtifactKeys({ ...valid, chromiumVersion: "130/0" })).toEqual([]);
    expect(canonicalArtifactKeys({ ...valid, nvdaVersion: "2026?1" })).toEqual([]);
    const artifactKeys = canonicalArtifactKeys(valid);
    const passHashes = Object.fromEntries(artifactKeys.map((key) => [key, "f".repeat(64)]));
    const passSizes = Object.fromEntries(artifactKeys.map((key) => [key, 1]));
    const transitionBytes = canonicalJsonBytes(
      transitionEvidencePayload(String(valid.sourceCommit), "1001", 1),
    );
    const transitionPayload = record(parseCanonicalJsonBytes(transitionBytes));
    const passBase = {
      ...valid,
      transitionEvidenceLocator: {
        workflowRunId: "1001",
        runAttempt: 1,
        artifactId: transitionEvidenceArtifactId,
      },
      transitionEvidenceHash: bufferDigest(transitionBytes),
      transitionEvidenceByteSize: transitionBytes.length,
      transitionEvidenceValidationDigest: transitionPayload.validationDigest,
    };
    const passEvidence = futurePassEvidence(passBase, passHashes, passSizes, artifactKeys);
    const passManifest = {
      ...passBase,
      artifactHashes: passHashes,
      artifactByteSizes: passSizes,
      aggregateArtifactBytes: artifactKeys.length,
      artifactValidationDigest: passEvidence.artifactValidationDigest,
      artifactContentDigest: passEvidence.artifactContentDigest,
      reviewerEvidenceHash: passEvidence.reviewerEvidenceHash,
      cleanupEvidenceHash: passEvidence.cleanupEvidenceHash,
      artifactSetDigest: passEvidence.artifactSetDigest,
      artifactScanEvidence: passEvidence.artifactScanEvidence,
      reviewerCompletion: passEvidence.reviewerCompletion,
      cleanupEvidence: passEvidence.cleanupEvidence,
      scanStatus: "PASS",
      verdict: "PASS",
    };
    expect(artifactKeys).toHaveLength(86_400);
    expect(new Set(artifactKeys).size).toBe(86_400);
    expect(artifactKeys.every(validPhysicalArtifactKey)).toBe(true);
    expect(
      canonicalArtifactKeys({
        ...valid,
        chromiumVersion: "131.2.3",
        nvdaVersion: "2027.2",
      }),
    ).toEqual(artifactKeys);
    expect(
      canonicalArtifactKeys({
        ...valid,
        chromiumVersion: `1.${"1".repeat(30)}`,
        nvdaVersion: `2.${"2".repeat(30)}`,
      }),
    ).toEqual(artifactKeys);
    expect(validManifestStructure(passManifest)).toBe(true);
    for (const mutation of [
      { sourceCommit: "A".repeat(40) },
      { specDigest: "0".repeat(63) },
      { keyboardProtocolDigest: "0".repeat(64) },
      { nvdaProtocolDigest: "0".repeat(64) },
      { capturedAtUtc: "2026-10-31T00:00:00.000Z" },
      { captureProfiles: {} },
      { scanStatus: "UNKNOWN" },
      { reviewerRole: "Marlon" },
      { verdict: "SKIPPED" },
      { cells: [] },
      { cells: [...(valid.cells as JsonRecord[])].reverse() },
      { cellMappings: [] },
      { cellMappings: [...(valid.cellMappings as JsonRecord[])].reverse() },
      { osVersion: "reviewer@example.com" },
      { chromiumVersion: "130" },
      { chromiumVersion: `1.${"1".repeat(31)}` },
      { chromiumVersion: "130.0.https://private-canary" },
      { nvdaVersion: "2026-beta" },
      { nvdaVersion: "2026.1?token=private-canary" },
      { osVersion: "Windows 11 https://private-canary.example" },
      { osVersion: "Windows 11 private.internal.com" },
      { osVersion: "Windows 11 C:\\private" },
      { osVersion: "Windows 11 \\\\private" },
      { osVersion: "Windows 11/path" },
      { osVersion: "Windows 11?token=private-canary" },
      { osVersion: "Windows 11#private" },
      { osVersion: "10.0.0.1" },
      { osVersion: `Windows 11 ${"x".repeat(49)}` },
      { verdict: "PASS", scanStatus: "PASS" },
      { verdict: "FAIL", scanStatus: "PASS" },
    ])
      expect(validManifestStructure({ ...valid, ...mutation })).toBe(false);
    expect(validManifestStructure(Object.fromEntries([...Object.entries(valid)].reverse()))).toBe(
      false,
    );
    expect(validManifestStructure({ ...valid, extra: true })).toBe(false);
    const missing = { ...valid };
    delete missing.deleteByUtc;
    expect(validManifestStructure(missing)).toBe(false);
    const aliasedCells = [...(valid.cells as JsonRecord[])];
    aliasedCells[0] = { ...aliasedCells[0], zoomId: aliasedCells[0]?.textScaleId };
    delete aliasedCells[0]?.textScaleId;
    expect(validManifestStructure({ ...valid, cells: aliasedCells })).toBe(false);
    const staleMappings = structuredClone(valid.cellMappings) as JsonRecord[];
    staleMappings[0] = { ...staleMappings[0], cellDigest: "0".repeat(64) };
    expect(validManifestStructure({ ...valid, cellMappings: staleMappings })).toBe(false);
    for (const mutatedFirst of [
      { ...record((valid.cellMappings as JsonRecord[])[0]), extra: true },
      Object.fromEntries(Object.entries(record((valid.cellMappings as JsonRecord[])[0])).reverse()),
      { ...record((valid.cellMappings as JsonRecord[])[0]), cellDigest: "A".repeat(64) },
      { ...record((valid.cellMappings as JsonRecord[])[0]), ordinal: 2 },
      {
        ...record((valid.cellMappings as JsonRecord[])[0]),
        cellDigest: record((valid.cellMappings as JsonRecord[])[1]).cellDigest,
      },
    ]) {
      const mappings = structuredClone(valid.cellMappings) as JsonRecord[];
      mappings[0] = mutatedFirst;
      expect(validManifestStructure({ ...valid, cellMappings: mappings })).toBe(false);
    }
    const traversedHashes = { ...passManifest.artifactHashes };
    const firstArtifact = artifactKeys[0]!;
    delete traversedHashes[firstArtifact];
    traversedHashes[`../${firstArtifact}`] = "f".repeat(64);
    expect(validManifestStructure({ ...passManifest, artifactHashes: traversedHashes })).toBe(
      false,
    );
    expect(
      validRetentionUpdate("2026-11-30T00:00:00Z", "2026-11-01T00:00:00Z", "2026-11-02T00:00:00Z"),
    ).toBe(true);
    expect(
      validRetentionUpdate("2026-11-30T00:00:00Z", "2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z"),
    ).toBe(false);
    expect(
      validRetentionUpdate("2026-11-02T00:00:00Z", "2026-11-01T00:00:00Z", "2026-11-03T00:00:00Z"),
    ).toBe(false);
  }, 120_000);

  it("locks path, origin, and zero-egress families and rejects unsafe segments", () => {
    const evidence = record(catalog.evidence);
    exactKeys(evidence, [
      "profileId",
      "runtimeExecutions",
      "cellStatus",
      "cellCount",
      "artifactIds",
      "transitionEvidence",
      "keyboardProtocolFields",
      "keyboardProtocol",
      "keyboardProtocolRules",
      "keyboardPresentationFocusMapFields",
      "keyboardPresentationFocusMap",
      "keyboardPresentationFocusMapRules",
      "keyboardProtocolDigest",
      "keyboardApplicabilityFields",
      "keyboardApplicability",
      "keyboardExecutionFields",
      "keyboardExclusionReasons",
      "nvdaProtocolFields",
      "nvdaProtocolEventIds",
      "nvdaProtocolRules",
      "nvdaProtocolDigest",
      "nvdaExpectationTemplateFields",
      "nvdaExpectationTemplates",
      "nvdaExpectationExpansion",
      "syntheticObservationFields",
      "syntheticObservationValues",
      "artifactTypeRegistryFields",
      "artifactEnums",
      "artifactTypeRegistry",
      "artifactContractFields",
      "artifactContracts",
      "scanEvidenceFields",
      "scanEvidenceContract",
      "captureProfileFields",
      "captureProfileContract",
      "trustedCapturePayloadFields",
      "trustedCapturePayloadContract",
      "baselineProvenanceFields",
      "baselineProvenanceContract",
      "scannerResultPayloadFields",
      "scannerResultPayloadContract",
      "artifactValidationResultFields",
      "artifactValidationResultContract",
      "artifactEnvelopeFields",
      "artifactResourceBudgets",
      "reviewerCompletionFields",
      "cleanupEvidenceFields",
      "authoritativeEvidenceTopology",
      "evidenceResolverContract",
      "evidenceLocatorFields",
      "completeResultsAuthority",
      "transitionEvidenceAuthority",
      "representativeBundleAuthority",
      "rawArtifactInventoryAuthority",
      "reviewCleanupChainAuthority",
      "r4aSimulationBoundary",
      "futureProofRules",
      "boundedSemanticFixtureContract",
      "artifactPairCount",
      "cellMappingFields",
      "cellDigestAlgorithm",
      "physicalArtifactKeyPattern",
      "runManifestFilename",
      "manifestIsPerCellArtifact",
      "runManifest",
      "pathPolicy",
      "networkPolicy",
      "originPolicy",
      "forbiddenRetainedFamilies",
      "scanOrder",
      "accessPolicy",
      "retention",
      "failureDisposition",
      "deletionEvidenceFields",
    ]);
    expect(evidence.scanEvidenceFields).toEqual(scanEvidenceFields);
    expect(evidence.scanEvidenceContract).toEqual({
      ...scannerContract,
      statusIds: ["PASS", "NOT_APPLICABLE"],
      networkEgress: "NONE",
      cleanupDisposition: "retained_until_deleteByUtc",
      applicabilityRules: [
        "PNG_requires_metadata_OCR_OCR_deny_and_recursive_deny_PASS_with_structured_NOT_APPLICABLE",
        "JSON_and_TXT_require_structured_and_recursive_deny_PASS_with_metadata_OCR_and_OCR_deny_NOT_APPLICABLE",
        "every_applicable_scanner_record_has_hash_bound_input_output_result_and_closed_canary_set_digests_with_PASS_canary_status",
        "every_NOT_APPLICABLE_scanner_record_has_closed_NOT_APPLICABLE_input_output_canary_digests_and_status",
        "each_record_physicalKey_artifactId_and_artifactHash_equal_the_current_owned_artifact",
        "semantic_input_binds_physicalKey_artifactId_artifactHash_cellDigest_and_all_six_identity_fields_and_semantic_output_binds_the_validator_result",
        "every_one_of_86400_artifacts_has_exactly_one_current_record",
        "absence_staleness_hash_mismatch_wrong_scanner_wrong_applicability_failed_scan_or_missing_canary_fails_closed",
        "R4A_defines_only_the_future_R4B_proof_shape_and_does_not_claim_any_scan_execution",
      ],
    });
    expect(evidence.captureProfileFields).toEqual([
      "cellDigest",
      ...identityFields,
      "configuredWidthCssPx",
      "configuredHeightCssPx",
      "observedWidthCssPx",
      "observedHeightCssPx",
      "browserZoomPercent",
      "deviceScaleFactor",
      "colorProfile",
    ]);
    expect(evidence.trustedCapturePayloadFields).toEqual(trustedCapturePayloadFields);
    expect(evidence.scannerResultPayloadFields).toEqual(scannerResultPayloadFields);
    expect(record(evidence.trustedCapturePayloadContract)).toMatchObject({
      authority:
        "future_R4B_base_controlled_capture_workflow_output_resolved_from_the_immutable_provider_artifact_by_EvidenceResolver_not_manifest_caller_fields",
      fixtureBoundary:
        "repository_synthetic_pixel_generators_are_unit_test_fixtures_only_and_are_not_normative_or_authoritative_acceptance_rules",
    });
    expect(record(evidence.scannerResultPayloadContract)).toMatchObject({
      authority:
        "future_R4B_base_controlled_scanner_output_bytes_resolved_from_immutable_workflow_artifacts_by_EvidenceResolver",
      validation:
        "exact_current_source_build_head_base_controlled_workflow_path_digest_run_attempt_execution_time_scanner_id_version_key_role_hash_capture_input_digest_closed_ordered_canary_vector_empty_bounded_findings_PASS_status_and_NONE_network_egress",
    });
    expect(evidence.artifactEnvelopeFields).toEqual(["cellDigest", ...identityFields]);
    expect(evidence.reviewerCompletionFields).toEqual(reviewerCompletionFields);
    expect(evidence.cleanupEvidenceFields).toEqual(cleanupEvidenceFields);
    const path = record(evidence.pathPolicy);
    exactKeys(path, [
      "logicalIdentityOnly",
      "artifactPathFields",
      "filenameFields",
      "physicalKeyFields",
      "cellMappingFields",
      "digestPrefixUtf8Hex",
      "segmentMaxAsciiChars",
      "filenameMaxAsciiChars",
      "relativeKeyMaxAsciiChars",
      "maximumGeneratedRelativeKeyAsciiChars",
      "rootMaxUtf16CodeUnits",
      "fullPathMaxUtf16CodeUnits",
      "rootContract",
      "rootRetention",
      "constructionRule",
      "r4bPhysicalProof",
      "forbiddenFamilies",
    ]);
    expect(path.logicalIdentityOnly).toBe(true);
    expect(path.artifactPathFields).toEqual(artifactPathFields);
    expect(path.filenameFields).toEqual(filenameFields);
    expect(path.physicalKeyFields).toEqual(["literal_cells", "cellDigest", "artifactId"]);
    expect(path.cellMappingFields).toEqual(cellMappingFields);
    expect(path.digestPrefixUtf8Hex).toBe("666c75796f3a7234613a63656c6c3a76310a");
    expect([
      path.segmentMaxAsciiChars,
      path.filenameMaxAsciiChars,
      path.relativeKeyMaxAsciiChars,
      path.maximumGeneratedRelativeKeyAsciiChars,
      path.rootMaxUtf16CodeUnits,
      path.fullPathMaxUtf16CodeUnits,
    ]).toEqual([64, 32, 96, 90, 128, 240]);
    expect(path.rootContract).toBe(
      "fresh_local_empty_exclusive_non_UNC_non_device_non_reparse_directory_created_for_single_run",
    );
    expect(path.rootRetention).toBe(
      "root_value_never_retained_logged_emitted_or_included_in_manifest",
    );
    expect(path.constructionRule).toBe(
      "exact_digest_key_only_no_fallback_truncate_suffix_sanitize_reuse_or_version_component",
    );
    expect(path.r4bPhysicalProof).toBe(
      "Windows_create_read_hash_recursive_scan_delete_with_injected_cleanup_failure_and_retry_proof_required_in_R4B_only",
    );
    expect(path.forbiddenFamilies).toEqual([
      "dot_or_dotdot_segment",
      "backslash_or_mixed_separator",
      "colon_or_URI_scheme",
      "percent_encoding",
      "drive_prefix",
      "UNC_or_device_path",
      "NUL",
      "ASCII_control",
      "Windows_reserved_basename_including_extension",
      "leading_or_trailing_dot_or_space",
      "double_underscore_in_closed_ID",
      "symlink",
      "junction",
      "reparse_point",
      "hardlink",
      "case_fold_or_sanitization_collision",
    ]);
    for (const unsafe of [
      ".",
      "..",
      "a/b",
      "a\\b",
      "a:b",
      "a%2fb",
      "C-drive:",
      "\\\\server",
      "a\u0000b",
      "a\u001fb",
      "a__b",
      "../x",
      "%2e%2e",
      "CON",
      "con.txt",
      "LPT9.json",
      ".hidden",
      "trailing.",
      "trailing ",
    ])
      expect(safeSegment(unsafe)).toBe(false);
    expect(safeSegment("phone_320x568")).toBe(true);
    const physicalKey = `cells/${"a".repeat(64)}/reduced-motion.json`;
    expect(validPhysicalArtifactKey(physicalKey)).toBe(true);
    expect(physicalKey.length).toBeLessThanOrEqual(90);
    for (const invalid of [
      `cell/${"a".repeat(64)}/actual.png`,
      `cells/${"A".repeat(64)}/actual.png`,
      `cells/${"a".repeat(63)}/actual.png`,
      `cells/${"a".repeat(64)}/unknown.json`,
      `cells/${"a".repeat(64)}/../actual.png`,
      `cells/${"a".repeat(64)}/actual.png?x=1`,
      `cells/${"a".repeat(64)}/CON`,
      `${"x".repeat(97)}`,
    ])
      expect(validPhysicalArtifactKey(invalid)).toBe(false);
    expect(
      validFreshPhysicalRoot({
        displayValue: "not_retained",
        local: true,
        empty: true,
        exclusive: true,
        unc: false,
        devicePath: false,
        reparsePoint: false,
        utf16CodeUnits: 128,
        fullPathUtf16CodeUnits: 240,
      }),
    ).toBe(true);
    for (const invalid of [
      { utf16CodeUnits: 129 },
      { fullPathUtf16CodeUnits: 241 },
      { local: false },
      { empty: false },
      { exclusive: false },
      { unc: true },
      { devicePath: true },
      { reparsePoint: true },
      { displayValue: "C:\\private\\capture" },
    ])
      expect(
        validFreshPhysicalRoot({
          displayValue: "not_retained",
          local: true,
          empty: true,
          exclusive: true,
          unc: false,
          devicePath: false,
          reparsePoint: false,
          utf16CodeUnits: 128,
          fullPathUtf16CodeUnits: 240,
          ...invalid,
        }),
      ).toBe(false);
    const safeEntry = {
      segment: "phone_320x568",
      symlink: false,
      junction: false,
      reparsePoint: false,
      hardlinkCount: 1,
      collidesAfterCaseFoldOrSanitization: false,
    };
    expect(safePathEntry(safeEntry)).toBe(true);
    for (const mutation of [
      { symlink: true },
      { junction: true },
      { reparsePoint: true },
      { hardlinkCount: 2 },
      { collidesAfterCaseFoldOrSanitization: true },
    ])
      expect(safePathEntry({ ...safeEntry, ...mutation })).toBe(false);
    const network = record(evidence.networkPolicy);
    exactKeys(network, ["allowedListener", "maximumExternalRequests", "zeroEgressVectors"]);
    expect(network.maximumExternalRequests).toBe(0);
    expect(network.zeroEgressVectors).toEqual([
      "DNS",
      "HTTP",
      "HTTPS",
      "WebSocket",
      "WebTransport",
      "sendBeacon",
      "service_worker",
      "prefetch",
      "preconnect",
      "external_font",
      "external_asset",
      "external_OCR",
      "external_storage",
      "upload",
      "analytics",
      "telemetry",
      "crash_reporting",
    ]);
    expect(evidence.originPolicy).toEqual({
      allowed: ["committed_original_synthetic_fixture", "in_memory_synthetic_session"],
      realAccountsAllowed: false,
      realSessionsAllowed: false,
      productionDataAllowed: false,
    });
  }, 120_000);

  it("locks privacy scans, access, retention, deletion, and fail-closed status", () => {
    const evidence = record(catalog.evidence);
    expect(evidence.runtimeExecutions).toBe(0);
    expect(evidence.cellStatus).toBe("UNATTEMPTED");
    expect(evidence.cellCount).toBe(10_800);
    expect(evidence.artifactPairCount).toBe(86_400);
    expect(evidence.scanOrder).toEqual([
      "structured_recursive_scan",
      "png_metadata_scan",
      "local_no_network_ocr",
      "ocr_forbidden_scan",
      "named_reviewer_manual_review",
    ]);
    expect(evidence.forbiddenRetainedFamilies).toEqual([
      "personal_contact_or_email",
      "owner_profile_user_account_device_install_or_stable_id",
      "secret_private_key_or_credential",
      "authorization_cookie_session_access_or_refresh_token",
      "oauth_pkce_code_state_nonce_verifier_or_provider_payload",
      "real_answer_lesson_activity_or_learning_content",
      "url_host_query_or_fragment",
      "filesystem_user_home_temp_or_workspace_path",
      "ip_header_request_or_response",
      "raw_error_exception_stack_log_or_command",
      "production_endpoint_or_config",
      "campaign_referrer_or_utm",
      "billing_subscription_or_purchase",
      "account_derived_data",
    ]);
    expect(evidence.accessPolicy).toBe(
      "named_reviewer_roles_only_no_public_or_shared_link_no_external_ocr_or_storage",
    );
    expect(evidence.retention).toEqual({
      maximumCalendarDaysFromCapture: 30,
      deleteWithinHoursAfterVerdictPrClosureOrSupersedingCapture: 24,
      failedCellDeletion: "immediate",
    });
    expect(evidence.failureDisposition).toBe(
      "UNATTEMPTED_retain_nothing_delete_all_transient_copies",
    );
  });

  it("locks contrast, arithmetic, non-coercion, provenance, and deferred claims", () => {
    const contrastContract = record(catalog.contrast);
    expect([
      contrastContract.normalTextMinRatio,
      contrastContract.largeTextMinRatio,
      contrastContract.meaningfulNonTextMinRatio,
      contrastContract.focusBoundaryMinRatio,
    ]).toEqual([4.5, 3, 3, 3]);
    expect(record(record(catalog.matrix).stressFixture)).toEqual({
      promptGraphemes: 600,
      choiceCount: 4,
      choiceGraphemesEach: 180,
      productLimitClaimed: false,
    });
    expect(600 + 4 * 180).toBe(1_320);
    const nonCoercive = record(catalog.nonCoerciveBoundary);
    expect(nonCoercive.positiveRequirements).toEqual([
      "affirmative_opt_in",
      "cooperative_only",
      "private_by_default",
      "safely_reversible",
      "non_punitive",
    ]);
    expect(nonCoercive.prohibitedMechanics).toEqual([
      "guilt_or_shame",
      "peer_obligation_reminders_or_nudges",
      "threatened_streak_loss",
      "learning_gates",
      "paid_recovery",
      "scarcity_or_loss_pressure_economy",
      "reward_transfers",
      "rankings",
      "notification_pressure",
    ]);
    expect(nonCoercive.protectedCohorts).toEqual({
      cohorts: ["child", "unknown"],
      prohibited: [
        "social",
        "ranking",
        "profiling",
        "targeted_ads",
        "purchase_pressure",
        "notification_pressure",
      ],
    });
    const provenance = record(catalog.provenance);
    expect(provenance.classification).toBe("INFERENCE");
    expect(provenance.controlledReplay).toEqual({
      evidenceId: "ev_929eebe1b1d987c31030811d071ab83ac3563182a8c93c99853f193fce9359af",
      status: "UNAVAILABLE/UNKNOWN",
      repositoryClaimSupported: false,
      nativeDossierRetained: false,
    });
    expect(report).toContain("`OBSERVATION`");
    expect(report).toContain("`INFERENCE`");
    expect(report).toContain("`UNKNOWN`");
    expect(record(catalog.phaseBoundary).deferredCapabilities).toEqual([
      "placement",
      "audio_microphone",
      "reminders_delivery",
      "social",
      "competition",
      "economy_rewards",
      "ads_purchases",
      "experiments",
      "child_specific_behavior",
      "offline_writes",
      "native_learning",
      "downloadable_content",
      "production_rollout",
      "store_availability",
      "public_efficacy_claims",
    ]);
    expect(spec).not.toContain("https://");
  });

  it("keeps the independent gate and R4-B evidence boundary closed", () => {
    expect(catalog.handoff).toEqual({
      r4aExit:
        "exact_two_file_candidate_no_TBD_closed_catalogs_repository_and_protected_checks_same_head_specialist_PASS_and_Elana_final_PASS",
      r4bEntry: "verified_R4A_merge_commit_fresh_worktree_separate_PR_no_evidence_transfer",
      finalIndependentGate: "Elana Castillo",
      headChangeInvalidatesReviews: true,
    });
    expect(spec).toContain("does not prove rendered\nbehavior or product support");
    expect(spec).toContain("R4-A evidence does not transfer");
    expect(spec).not.toMatch(/currently supported|production ready|available now/i);
  });
});
