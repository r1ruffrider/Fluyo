# Sprint 6 R4-A Conversation Canvas specification

## Document control

| Field               | Value                                                                |
| ------------------- | -------------------------------------------------------------------- |
| Status              | Accepted repository specification candidate; R4-B is not implemented |
| Date                | 2026-10-31                                                           |
| Phase               | Sprint 6 R4-A                                                        |
| Orchestration owner | Adriana Solano                                                       |
| Architecture        | `docs/adr/0007-learning-experience-and-operational-boundaries.md`    |
| Build plan          | `docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md`      |
| Evidence            | `docs/research/2026-10-31_duolingo-public-evidence-study_v1.md`      |

## Phase and evidence status

This R4-A record is a repository-only UX, visual, accessibility, Break-UI, and
evidence specification. It adds no UI implementation, runtime behavior, route,
dependency, fixture switch, telemetry, schema, native surface, production
configuration, or external action. Runtime, browser, and assistive-technology
executions are 0. All 10,800 future R4-B evidence cells and 86,400 per-cell
artifacts remain `UNATTEMPTED`. Passing document-regression tests proves only
that this specification is internally consistent; it does not prove rendered
behavior or product support.

Conversation Canvas is an original Fluyo specification derived from
repository-recorded public observations and separately labeled Fluyo
inferences. R4-A copies no competitor code, assets, lesson content,
screenshots, characters, sounds, animation, algorithms, composition, visual
hierarchy, or trade dress. Public company figures are historical and
non-transferable; they are not Fluyo targets, forecasts, defaults, weights,
SLOs, efficacy evidence, performance claims, or acceptance thresholds.

All user-facing copy below is future contract copy for synthetic R4-B
fixtures. It must not be presented as currently implemented behavior, current
product availability, or proof of authentication, entitlement, review
availability, offline persistence, accessibility support, or saved progress.
Viewport IDs are evidence configurations, not supported-device, tablet, or
form-factor claims. `en-XA` and `ar-XB` are expansion and RTL probes, not
translated-interface or language-support claims. Windows, Chromium, and NVDA
identify a future recorded evidence profile, not broad support. A local
production-mode build is not a production deployment, live service, or store
readiness claim.

## Closed R4-A catalog

The following is the single closed machine-readable catalog for this
specification. Object and array order are normative for regression tests.

```json
{
  "schemaVersion": 1,
  "date": "2026-10-31",
  "phase": "Sprint 6 R4-A",
  "status": "repository_specification_only",
  "authority": [
    "docs/adr/0007-learning-experience-and-operational-boundaries.md",
    "docs/2026-10-31_sprint-6-learning-experience-build-plan_v1.md",
    "docs/research/2026-10-31_duolingo-public-evidence-study_v1.md"
  ],
  "transitionDigest": "7cef0f307e365ec4f2ee0e8c83a2b8f0bb56401e6d8ccabafdf4008cea3631e9",
  "uxContractDigestAlgorithm": "lowercase_sha256_of_UTF8_fluyo:r4a:ux-contract:v1_LF_plus_canonical_JSON_of_ordered_flowContracts_flowVariants_dynamicCopyRules_states_stateVariants_stateActionContracts_stateFixtureVariants_exitDialogContexts_exitDialogs_modalInteractionContract_keyboardProtocol_keyboardPresentationFocusMap_nvdaExpectationTemplates_syntheticObservationValues",
  "uxContractDigest": "55ee313d911105afbcfa656badbf282b82fcc9ec1d7b04eb611b3eb688b9be13",
  "flowIds": [
    "setup",
    "editable_goal",
    "start_from_beginning",
    "prepare",
    "answer",
    "check",
    "confirmed_feedback",
    "continue_or_finish",
    "confirmed_progress"
  ],
  "flowContractFields": [
    "flowId",
    "heading",
    "body",
    "primaryAction",
    "preservationRule",
    "safeDestination",
    "focusAnnouncement",
    "noProgressRule"
  ],
  "flowContracts": [
    {
      "flowId": "setup",
      "heading": "Set up today’s practice",
      "body": "Choose a daily goal before you begin.",
      "primaryAction": "Set a goal",
      "preservationRule": "preserve_confirmed_goal_progress_preferences_and_safe_navigation",
      "safeDestination": "editable_goal",
      "focusAnnouncement": "client_navigation_focuses_heading_once_direct_load_uses_natural_order_no_live_announcement",
      "noProgressRule": "setup_display_and_navigation_cannot_complete_activity_or_change_confirmed_progress"
    },
    {
      "flowId": "editable_goal",
      "heading": "Choose today’s goal",
      "body": "Pick from 1 to 20 activities. You can change this later.",
      "primaryAction": "Save goal",
      "preservationRule": "previous_confirmed_goal_remains_authoritative_proposed_value_is_memory_only_until_server_confirmation",
      "safeDestination": "start_from_beginning_after_server_confirmation_otherwise_editable_goal",
      "focusAnnouncement": "client_navigation_focuses_heading_once_then_labelled_input_and_action_follow_natural_order_contextual_status_uses_flowVariant_focusAnnouncement",
      "noProgressRule": "editing_saving_retrying_or_leaving_goal_setup_cannot_complete_activity_or_change_confirmed_progress"
    },
    {
      "flowId": "start_from_beginning",
      "heading": "Ready to start?",
      "body": "Your first available activity will open next.",
      "primaryAction": "Start from beginning",
      "preservationRule": "preserve_confirmed_goal_progress_and_safe_navigation_create_no_attempt_until_activity_validation",
      "safeDestination": "PREPARING",
      "focusAnnouncement": "client_navigation_focuses_heading_once_direct_load_uses_natural_order_no_live_announcement",
      "noProgressRule": "starting_navigation_cannot_complete_activity_or_change_confirmed_progress"
    },
    {
      "flowId": "prepare",
      "heading": "Getting your activity ready",
      "body": "Checking the latest activity and your confirmed progress.",
      "primaryAction": null,
      "preservationRule": "preserve_confirmed_progress_goal_preferences_and_safe_navigation_clear_stale_transient_context",
      "safeDestination": "ACTIVE_or_explicit_recovery_or_learning_home",
      "focusAnnouncement": "after_navigation_focus_heading_once_same_screen_refresh_keeps_focus_and_announces_politely_once",
      "noProgressRule": "preparation_cannot_complete_activity_or_change_progress"
    },
    {
      "flowId": "answer",
      "heading": "Choose your answer",
      "body": "Select one answer, then check it.",
      "primaryAction": "Check answer",
      "preservationRule": "one_unconfirmed_answer_in_memory_only_preserve_confirmed_progress_and_content_version",
      "safeDestination": "SUBMITTING_or_learning_home_after_explicit_discard",
      "focusAnnouncement": "focus_heading_once_after_state_transition_then_logical_progress_prompt_radio_choices_action_order_native_selection_speech_only",
      "noProgressRule": "selecting_changing_or_checking_an_answer_cannot_award_progress_before_server_confirmation"
    },
    {
      "flowId": "check",
      "heading": "Checking your answer",
      "body": "Waiting for a confirmed result.",
      "primaryAction": "Checking…",
      "preservationRule": "preserve_answer_and_exact_idempotency_key_until_settlement_fence_duplicates_and_late_results",
      "safeDestination": "CONFIRMED_or_recovery_or_learning_home_after_explicit_exit",
      "focusAnnouncement": "keep_focus_at_action_position_polite_status_once_no_repeated_spinner_announcement",
      "noProgressRule": "checking_retrying_or_leaving_cannot_change_progress_without_matching_server_confirmation"
    },
    {
      "flowId": "confirmed_feedback",
      "heading": "Your result",
      "body": "Your result was confirmed.",
      "primaryAction": {
        "kind": "dynamic_action",
        "ruleId": "confirmed_result_action"
      },
      "preservationRule": "preserve_only_confirmed_result_and_progress_clear_answer_retry_and_submission_context",
      "safeDestination": "next_server_selected_activity_or_learning_home",
      "focusAnnouncement": "focus_result_heading_once_announce_result_feedback_and_changed_progress_once",
      "noProgressRule": "feedback_and_its_actions_only_reflect_progress_already_committed_by_the_server"
    },
    {
      "flowId": "continue_or_finish",
      "heading": "Continue or finish",
      "body": "Your result is confirmed. Choose the available next step.",
      "primaryAction": {
        "kind": "dynamic_action",
        "ruleId": "confirmed_result_action"
      },
      "preservationRule": "preserve_confirmed_result_and_progress_until_the_validated_destination_replaces_the_current_view",
      "safeDestination": "next_server_selected_activity_after_fresh_authorization_and_version_validation_or_server_filtered_learning_home",
      "focusAnnouncement": "activation_focuses_the_next_PREPARING_heading_or_learning_home_heading_once_without_reannouncing_prior_feedback",
      "noProgressRule": "continue_and_finish_create_no_additional_completion_award_or_progress"
    },
    {
      "flowId": "confirmed_progress",
      "heading": "Today’s goal progress",
      "body": "{confirmed count} of {daily target} activities complete today.",
      "primaryAction": null,
      "preservationRule": "render_server_confirmed_count_and_daily_target_only",
      "safeDestination": "current_confirmed_screen_or_learning_home",
      "focusAnnouncement": "do_not_move_focus_announce_named_progress_value_once_only_when_confirmed_count_changes",
      "noProgressRule": "progressbar_never_increments_optimistically_or_from_local_action"
    }
  ],
  "flowVariantFields": [
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
    "semanticContract"
  ],
  "flowVariants": [
    {
      "variantId": "editable_goal_saving",
      "flowId": "editable_goal",
      "guard": "saveStatus=pending",
      "heading": "Saving today’s goal",
      "body": "Your previous goal stays active until this change is confirmed.",
      "primaryAction": "Saving…",
      "preservationRule": "previous_confirmed_goal_remains_authoritative_new_value_memory_only",
      "safeDestination": "editable_goal",
      "focusAnnouncement": "keep_focus_at_action_position_announce_saving_politely_once_after_delay",
      "noProgressRule": "saving_goal_cannot_complete_activity_or_change_confirmed_progress",
      "semanticContract": "busy_true_action_unavailable_one_polite_status"
    },
    {
      "variantId": "editable_goal_error",
      "flowId": "editable_goal",
      "guard": "saveStatus=failed",
      "heading": "We couldn’t save your goal",
      "body": "Your previous goal is unchanged. Check your connection and try again.",
      "primaryAction": "Try again",
      "preservationRule": "previous_confirmed_goal_authoritative_keep_proposed_value_in_current_form_only",
      "safeDestination": "editable_goal",
      "focusAnnouncement": "focus_error_heading_once_assertive_heading_and_body_once_retry_reachable",
      "noProgressRule": "goal_error_and_retry_cannot_complete_activity_or_change_progress",
      "semanticContract": "alert_once_retry_named_no_raw_error"
    },
    {
      "variantId": "editable_goal_unchanged",
      "flowId": "editable_goal",
      "guard": "proposedGoal=confirmedGoal",
      "heading": "Choose today’s goal",
      "body": "Your goal is already set to this value.",
      "primaryAction": "Done",
      "preservationRule": "confirmed_goal_remains_authoritative_no_request_or_pending_state",
      "safeDestination": "learning_home",
      "focusAnnouncement": "focus_confirmation_status_once_then_done_action",
      "noProgressRule": "unchanged_goal_cannot_complete_activity_or_change_progress",
      "semanticContract": "status_once_no_save_request"
    },
    {
      "variantId": "confirmed_progress_changed",
      "flowId": "confirmed_progress",
      "guard": "confirmedCountChanged=true",
      "heading": "Today’s goal progress",
      "body": "{confirmed count} of {daily target} activities complete today.",
      "primaryAction": null,
      "preservationRule": "render_server_confirmed_count_and_daily_target_only",
      "safeDestination": "current_confirmed_screen_or_learning_home",
      "focusAnnouncement": "do_not_move_focus_announce_named_progress_value_once_only_when_confirmed_count_changes",
      "noProgressRule": "progressbar_never_increments_optimistically_or_from_local_action",
      "semanticContract": "role_progressbar_aria_label_Today’s_goal_progress_aria_valuemin_0_aria_valuenow_min_confirmedCount_dailyTarget_aria_valuemax_dailyTarget_visual_width_min_confirmedCount_dailyTarget_divided_by_dailyTarget_capped_at_100_percent_aria_valuetext_and_announcement_use_uncapped_confirmedCount_of_dailyTarget_activities_complete_today"
    }
  ],
  "dynamicCopyRuleFields": [
    "ruleId",
    "appliesTo",
    "source",
    "validation",
    "fallbackHeading",
    "fallbackBody",
    "actionRule",
    "renderBoundary"
  ],
  "dynamicCopyRules": [
    {
      "ruleId": "confirmed_feedback_body",
      "appliesTo": [
        "flow:confirmed_feedback",
        "state:CONFIRMED",
        "state_variant:confirmed_correct_continue",
        "state_variant:confirmed_correct_finish",
        "state_variant:confirmed_incorrect_continue",
        "state_variant:confirmed_incorrect_finish"
      ],
      "source": "server_confirmed_feedback",
      "validation": "NFC_trim_canonical_nonempty_UTF8_max_512_bytes_max_160_graphemes_plain_text_with_NFKC_compatibility_detection_shadow_bounded_one_pass_percent_decode_rejecting_malformed_or_residual_percent_bytes_then_Unicode_slash_normalization_and_traversal_evaluation_without_Unicode_control_format_bidi_or_line_separator_HTML_entity_Markdown_emphasis_strikethrough_fence_horizontal_rule_link_or_code_any_URI_scheme_Unicode_decimal_phone_contact_URL_host_query_provider_diagnostic_stack_correlation_token_code_state_nonce_verifier_credential_session_identity_key_ending_ID_UUID_or_GUID_canonical_braced_or_compact_UUID_or_generic_absolute_relative_workspace_path_families",
      "fallbackHeading": "Your result",
      "fallbackBody": "Your result was confirmed.",
      "actionRule": "validated_feedback_or_exact_fallback_only",
      "renderBoundary": "render_only_after_matching_server_confirmation_never_render_validation_or_dispatcher_instructions"
    },
    {
      "ruleId": "confirmed_result_action",
      "appliesTo": [
        "flow:confirmed_feedback",
        "flow:continue_or_finish",
        "state:CONFIRMED",
        "state_variant:confirmed_correct_continue",
        "state_variant:confirmed_correct_finish",
        "state_variant:confirmed_incorrect_continue",
        "state_variant:confirmed_incorrect_finish"
      ],
      "source": "freshly_authorized_server_selected_next_activity",
      "validation": "exact_owner_entitlement_activity_and_version_validation",
      "fallbackHeading": "Your result",
      "fallbackBody": "Your result was confirmed.",
      "actionRule": "nextActivityAvailable=true_exactly_Continue_nextActivityAvailable=false_exactly_Finish_only_one_action",
      "renderBoundary": "render_one_validated_action_only_never_render_authorization_or_dispatcher_instructions"
    },
    {
      "ruleId": "retryable_error_variant",
      "appliesTo": [
        "state:RETRYABLE_ERROR",
        "state_variant:retryable_error_prepare",
        "state_variant:retryable_error_submit"
      ],
      "source": "closed_prepare_or_submit_origin",
      "validation": "origin_must_equal_prepare_or_submit_for_current_operation_and_generation",
      "fallbackHeading": "We couldn’t finish that",
      "fallbackBody": "Nothing changed. Check your connection and try again.",
      "actionRule": "unknown_missing_or_stale_origin_uses_exact_generic_fallback_and_exact_Try_again",
      "renderBoundary": "dispatcher_and_origin_validation_are_never_visible"
    }
  ],
  "exitDialogFields": [
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
    "motionId"
  ],
  "exitDialogContextFields": [
    "contextId",
    "stateId",
    "variantId",
    "guard",
    "dialogId",
    "stayEffect",
    "leaveEffect",
    "noProgressRule"
  ],
  "exitDialogContexts": [
    {
      "contextId": "active_with_answer",
      "stateId": "ACTIVE",
      "variantId": null,
      "guard": "unconfirmedAnswerPresent=true",
      "dialogId": "exit_unconfirmed_answer",
      "stayEffect": "preserve_answer_and_return_focus_to_invoking_exit_control",
      "leaveEffect": "clear_unconfirmed_answer_and_attempt_context_then_return_to_learning",
      "noProgressRule": "stay_leave_escape_and_backdrop_never_change_confirmed_progress"
    },
    {
      "contextId": "retryable_submit_with_answer",
      "stateId": "RETRYABLE_ERROR",
      "variantId": "retryable_error_submit",
      "guard": "unconfirmedAnswerPresent=true;idempotencyKeyPresent=true",
      "dialogId": "exit_unconfirmed_answer",
      "stayEffect": "preserve_answer_and_idempotency_key_and_return_focus_to_invoking_exit_control",
      "leaveEffect": "clear_unconfirmed_answer_and_idempotency_key_then_return_to_learning",
      "noProgressRule": "stay_leave_escape_and_backdrop_never_confirm_result_or_change_progress"
    },
    {
      "contextId": "offline_active_with_answer",
      "stateId": "OFFLINE_READ_ONLY",
      "variantId": "offline_read_only_active",
      "guard": "unconfirmedAnswerPresent=true",
      "dialogId": "exit_unconfirmed_answer",
      "stayEffect": "preserve_session_memory_answer_and_return_focus_to_invoking_exit_control",
      "leaveEffect": "clear_session_memory_answer_then_return_to_learning",
      "noProgressRule": "stay_leave_escape_and_backdrop_never_submit_complete_or_change_progress"
    },
    {
      "contextId": "submitting_in_flight",
      "stateId": "SUBMITTING",
      "variantId": null,
      "guard": "requestInFlight=true",
      "dialogId": "exit_submitting",
      "stayEffect": "preserve_submission_context_and_return_focus_to_invoking_exit_control",
      "leaveEffect": "fence_late_response_clear_local_wait_state_and_return_to_learning",
      "noProgressRule": "stay_leave_escape_and_backdrop_never_synthesize_confirmation_or_progress"
    }
  ],
  "exitDialogs": [
    {
      "dialogId": "exit_unconfirmed_answer",
      "guard": "contextId=active_with_answer|retryable_submit_with_answer|offline_active_with_answer",
      "heading": "Leave this activity?",
      "body": "Your unsubmitted answer will be discarded.",
      "initialFocus": "Stay",
      "primaryAction": "Stay",
      "secondaryAction": "Leave activity",
      "dismissRule": "Escape_or_backdrop_equals_Stay",
      "focusReturn": "invoking_exit_control",
      "preservationRule": "Stay_preserves_context_scoped_answer_and_key_Leave_clears_only_context_scoped_unconfirmed_answer_and_key",
      "noProgressRule": "opening_dismissing_or_leaving_never_changes_progress",
      "motionId": "entry"
    },
    {
      "dialogId": "exit_submitting",
      "guard": "state=SUBMITTING;requestInFlight=true",
      "heading": "Leave while checking?",
      "body": "Fluyo will stop waiting here. If the server already confirmed the attempt, your progress may appear when you return.",
      "initialFocus": "Stay",
      "primaryAction": "Stay",
      "secondaryAction": "Leave activity",
      "dismissRule": "Escape_or_backdrop_equals_Stay",
      "focusReturn": "invoking_exit_control",
      "preservationRule": "Stay_preserves_submission_context_Leave_fences_late_response_and_clears_local_wait_state",
      "noProgressRule": "dialog_actions_never_synthesize_confirmation_or_progress",
      "motionId": "entry"
    }
  ],
  "modalInteractionContractFields": [
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
    "excludedBackgroundIds"
  ],
  "modalInteractionContract": {
    "dialogRole": "dialog",
    "ariaModal": true,
    "nameSource": "exact_dialog_heading",
    "descriptionSource": "exact_dialog_body",
    "tabbableIds": ["exit_stay", "exit_leave"],
    "semanticContainerTabbable": false,
    "initialFocusId": "exit_stay",
    "forwardCycle": ["exit_stay", "exit_leave", "exit_stay"],
    "reverseCycle": ["exit_stay", "exit_leave", "exit_stay"],
    "backgroundKeyboard": "inert",
    "backgroundPointer": "inert_except_backdrop_dismissal",
    "backgroundAccessibilityTree": "not_traversable",
    "escapeEffect": "Stay",
    "backdropEffect": "Stay",
    "stayEffect": "close_preserve_context_and_return_focus_to_invoking_exit_control",
    "leaveEffect": "apply_context_clear_and_late_result_fence_then_safe_navigation_without_obsolete_focus_restore",
    "dismissalAnnouncement": "none",
    "noProgressRule": "open_Tab_ShiftTab_Escape_backdrop_Stay_and_Leave_never_synthesize_confirmation_or_progress",
    "excludedBackgroundIds": [
      "skip_link",
      "top_bar_back",
      "named_progress",
      "state_heading",
      "prompt",
      "response_group",
      "feedback_status",
      "primary_action",
      "invoking_exit_control"
    ]
  },
  "stateIds": [
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
  ],
  "statePresentationFields": [
    "stateId",
    "heading",
    "body",
    "primaryAction",
    "preservationRule",
    "safeDestination",
    "focusAnnouncement",
    "noProgressRule",
    "visualTreatment"
  ],
  "states": [
    {
      "stateId": "PREPARING",
      "heading": "Getting your activity ready",
      "body": "Checking the latest activity and your confirmed progress.",
      "primaryAction": null,
      "preservationRule": "preserve_confirmed_progress_goal_preferences_and_safe_navigation_clear_stale_transient_context",
      "safeDestination": "ACTIVE_or_explicit_recovery_or_learning_home",
      "focusAnnouncement": "after_navigation_focus_heading_once_same_screen_refresh_keeps_focus_and_announces_politely_once",
      "noProgressRule": "preparation_cannot_complete_activity_or_change_progress",
      "visualTreatment": "cobalt_rule_static_status_mark_no_motion_loop"
    },
    {
      "stateId": "ACTIVE",
      "heading": "Choose your answer",
      "body": "Select one answer, then check it.",
      "primaryAction": "Check answer",
      "preservationRule": "one_unconfirmed_answer_in_memory_only_preserve_confirmed_progress_and_content_version",
      "safeDestination": "SUBMITTING_or_learning_home_after_explicit_discard",
      "focusAnnouncement": "heading_progress_prompt_radio_choices_action_in_order_native_selection_speech_only",
      "noProgressRule": "selecting_or_changing_answer_does_not_award_progress",
      "visualTreatment": "neutral_paper_canvas_cobalt_selected_and_action_treatment"
    },
    {
      "stateId": "SUBMITTING",
      "heading": "Checking your answer",
      "body": "Waiting for a confirmed result.",
      "primaryAction": "Checking…",
      "preservationRule": "preserve_answer_and_exact_idempotency_key_until_settlement_fence_duplicates_and_late_results",
      "safeDestination": "CONFIRMED_or_recovery_or_learning_home_after_explicit_exit",
      "focusAnnouncement": "keep_focus_at_action_position_polite_status_once_no_repeated_spinner_announcement",
      "noProgressRule": "no_progress_until_matching_server_confirmation",
      "visualTreatment": "sun_rule_and_tint_static_checking_status"
    },
    {
      "stateId": "CONFIRMED",
      "heading": "Your result",
      "body": "Your result was confirmed.",
      "primaryAction": {
        "kind": "dynamic_action",
        "ruleId": "confirmed_result_action"
      },
      "preservationRule": "preserve_only_confirmed_result_and_progress_clear_answer_retry_and_submission_context",
      "safeDestination": "next_server_selected_activity_or_learning_home",
      "focusAnnouncement": "focus_result_heading_once_announce_result_feedback_and_changed_progress_once",
      "noProgressRule": "reflect_only_progress_already_committed_by_server",
      "visualTreatment": "mint_correct_or_coral_incorrect_rule_tint_and_text"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "heading": "We couldn’t finish that",
      "body": "Nothing changed. Check your connection and try again.",
      "primaryAction": "Try again",
      "preservationRule": "prepare_retry_has_no_key_submit_retry_preserves_same_answer_and_idempotency_key",
      "safeDestination": "PREPARING_or_SUBMITTING_or_learning_home_after_exit",
      "focusAnnouncement": "focus_heading_once_assertive_announcement_once_retry_reachable",
      "noProgressRule": "error_and_retry_cannot_change_progress_or_synthesize_result",
      "visualTreatment": "coral_rule_and_ink_error_copy"
    },
    {
      "stateId": "STALE_CONTENT",
      "heading": "This activity changed",
      "body": "Refresh to get the latest version before you continue.",
      "primaryAction": "Refresh activity",
      "preservationRule": "preserve_confirmed_progress_clear_stale_answer_and_submission_context",
      "safeDestination": "PREPARING_or_learning_home_after_exit",
      "focusAnnouncement": "focus_heading_once_assertive_announcement_once",
      "noProgressRule": "never_submit_or_award_against_stale_version",
      "visualTreatment": "sun_rule_tint_and_refresh_copy"
    },
    {
      "stateId": "SESSION_ENDED",
      "heading": "Your session ended",
      "body": "Sign in again to continue safely. Your confirmed progress hasn’t changed.",
      "primaryAction": "Sign in",
      "preservationRule": "preserve_confirmed_server_progress_and_owner_neutral_return_clear_and_fence_auth_owner_and_unconfirmed_work",
      "safeDestination": "internal_sign_in_then_validated_learning_destination_only",
      "focusAnnouncement": "focus_heading_once_assertive_heading_and_body_once_deduplicated",
      "noProgressRule": "enter_display_leave_cannot_complete_activity_or_mutate_progress_or_awards",
      "visualTreatment": "coral_rule_no_provider_or_expiry_detail"
    },
    {
      "stateId": "ACCESS_BLOCKED",
      "heading": "You can’t open this activity",
      "body": "This activity isn’t available for your account right now. Return to learning to choose something available.",
      "primaryAction": "Return to learning",
      "preservationRule": "preserve_authentication_confirmed_progress_and_unrelated_safe_navigation_stop_attempt_clear_unconfirmed_answer",
      "safeDestination": "server_filtered_learning_home_or_curriculum",
      "focusAnnouncement": "focus_heading_once_assertive_once_without_entitlement_subscription_provider_or_diagnostic_detail",
      "noProgressRule": "no_completion_goal_review_reward_or_progress_mutation",
      "visualTreatment": "coral_rule_distinct_blocked_text_no_paywall_styling"
    },
    {
      "stateId": "EMPTY_REVIEW",
      "heading": "Nothing to review right now",
      "body": "You can continue with your next activity.",
      "primaryAction": "Continue learning",
      "preservationRule": "preserve_confirmed_progress_curriculum_position_and_safe_display_preferences_create_no_synthetic_review_item",
      "safeDestination": "server_selected_next_activity_or_learning_home",
      "focusAnnouncement": "client_transition_focuses_heading_once_direct_load_natural_order_announce_once_when_existing_list_becomes_empty",
      "noProgressRule": "no_completion_goal_change_or_manufactured_review_progress",
      "visualTreatment": "mint_rule_tint_and_calm_single_action"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "heading": "You’re offline",
      "body": "Reconnect to load your activity. If an answer exists: Your answer is kept for this session. Reconnect to check it.",
      "primaryAction": "Try again",
      "preservationRule": "prepare_retains_no_answer_active_retains_answer_in_memory_only_exit_clears_it_never_saved_synced_or_durable",
      "safeDestination": "freshly_revalidated_PREPARING_or_ACTIVE_otherwise_learning_home",
      "focusAnnouncement": "focus_heading_once_on_transition_polite_once_not_each_connectivity_fluctuation",
      "noProgressRule": "no_submission_completion_progress_reward_or_offline_write",
      "visualTreatment": "sun_rule_tint_no_saved_or_synced_iconography"
    }
  ],
  "stateVariantFields": [
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
    "visualTreatment"
  ],
  "stateVariants": [
    {
      "variantId": "confirmed_correct_continue",
      "stateId": "CONFIRMED",
      "guard": "result=correct;nextActivityAvailable=true",
      "heading": "Correct",
      "body": {
        "kind": "dynamic_copy",
        "ruleId": "confirmed_feedback_body"
      },
      "primaryAction": "Continue",
      "preservationRule": "preserve_confirmed_result_and_progress_clear_answer_retry_and_submission_context",
      "safeDestination": "next_server_selected_activity_after_fresh_authorization_and_version_validation",
      "focusAnnouncement": "focus_result_heading_once_announce_correct_feedback_and_changed_progress_once",
      "noProgressRule": "continue_creates_no_additional_progress_and_only_reflects_server_committed_progress",
      "visualTreatment": "mint_rule_tint_correct_text_and_non_color_check_mark"
    },
    {
      "variantId": "confirmed_correct_finish",
      "stateId": "CONFIRMED",
      "guard": "result=correct;nextActivityAvailable=false",
      "heading": "Correct",
      "body": {
        "kind": "dynamic_copy",
        "ruleId": "confirmed_feedback_body"
      },
      "primaryAction": "Finish",
      "preservationRule": "preserve_confirmed_result_and_progress_clear_answer_retry_and_submission_context",
      "safeDestination": "server_filtered_learning_home",
      "focusAnnouncement": "focus_result_heading_once_announce_correct_feedback_and_changed_progress_once",
      "noProgressRule": "finish_creates_no_additional_progress_and_only_reflects_server_committed_progress",
      "visualTreatment": "mint_rule_tint_correct_text_and_non_color_check_mark"
    },
    {
      "variantId": "confirmed_incorrect_continue",
      "stateId": "CONFIRMED",
      "guard": "result=incorrect;nextActivityAvailable=true",
      "heading": "Not quite",
      "body": {
        "kind": "dynamic_copy",
        "ruleId": "confirmed_feedback_body"
      },
      "primaryAction": "Continue",
      "preservationRule": "preserve_confirmed_result_and_progress_clear_answer_retry_and_submission_context",
      "safeDestination": "next_server_selected_activity_after_fresh_authorization_and_version_validation",
      "focusAnnouncement": "focus_result_heading_once_announce_incorrect_feedback_and_changed_progress_once",
      "noProgressRule": "continue_creates_no_additional_progress_and_only_reflects_server_committed_progress",
      "visualTreatment": "coral_rule_tint_not_quite_text_and_non_color_status_mark"
    },
    {
      "variantId": "confirmed_incorrect_finish",
      "stateId": "CONFIRMED",
      "guard": "result=incorrect;nextActivityAvailable=false",
      "heading": "Not quite",
      "body": {
        "kind": "dynamic_copy",
        "ruleId": "confirmed_feedback_body"
      },
      "primaryAction": "Finish",
      "preservationRule": "preserve_confirmed_result_and_progress_clear_answer_retry_and_submission_context",
      "safeDestination": "server_filtered_learning_home",
      "focusAnnouncement": "focus_result_heading_once_announce_incorrect_feedback_and_changed_progress_once",
      "noProgressRule": "finish_creates_no_additional_progress_and_only_reflects_server_committed_progress",
      "visualTreatment": "coral_rule_tint_not_quite_text_and_non_color_status_mark"
    },
    {
      "variantId": "retryable_error_prepare",
      "stateId": "RETRYABLE_ERROR",
      "guard": "retryOrigin=prepare",
      "heading": "We couldn’t load the activity",
      "body": "Nothing changed. Check your connection and try again.",
      "primaryAction": "Try again",
      "preservationRule": "preserve_confirmed_progress_with_no_answer_or_idempotency_key",
      "safeDestination": "PREPARING_or_learning_home_after_explicit_exit",
      "focusAnnouncement": "focus_heading_once_assertive_heading_and_body_once_retry_reachable",
      "noProgressRule": "prepare_error_and_retry_cannot_change_progress_or_create_attempt_context",
      "visualTreatment": "coral_rule_ink_error_copy_and_non_color_error_mark"
    },
    {
      "variantId": "retryable_error_submit",
      "stateId": "RETRYABLE_ERROR",
      "guard": "retryOrigin=submit",
      "heading": "We couldn’t check your answer",
      "body": "Your answer wasn’t confirmed. Try again to finish checking it.",
      "primaryAction": "Try again",
      "preservationRule": "preserve_same_answer_and_exact_idempotency_key_until_settlement_or_explicit_exit",
      "safeDestination": "SUBMITTING_or_learning_home_after_explicit_exit",
      "focusAnnouncement": "focus_heading_once_assertive_heading_and_body_once_retry_reachable",
      "noProgressRule": "submit_error_and_retry_cannot_synthesize_result_or_change_progress",
      "visualTreatment": "coral_rule_ink_error_copy_and_non_color_error_mark"
    },
    {
      "variantId": "offline_read_only_prepare",
      "stateId": "OFFLINE_READ_ONLY",
      "guard": "offlineOrigin=prepare",
      "heading": "You’re offline",
      "body": "Reconnect to load your activity.",
      "primaryAction": "Try again",
      "preservationRule": "preserve_confirmed_progress_and_no_answer_clear_prepare_transients",
      "safeDestination": "freshly_revalidated_PREPARING_or_learning_home",
      "focusAnnouncement": "focus_heading_once_on_transition_polite_heading_and_body_once_not_each_fluctuation",
      "noProgressRule": "offline_prepare_cannot_submit_complete_award_or_write_progress",
      "visualTreatment": "sun_rule_tint_no_saved_or_synced_iconography"
    },
    {
      "variantId": "offline_read_only_active",
      "stateId": "OFFLINE_READ_ONLY",
      "guard": "offlineOrigin=active",
      "heading": "You’re offline",
      "body": "Your answer is kept for this session. Reconnect to check it.",
      "primaryAction": "Try again",
      "preservationRule": "preserve_answer_in_memory_for_current_session_only_clear_on_exit_never_save_sync_or_persist",
      "safeDestination": "freshly_revalidated_ACTIVE_or_learning_home",
      "focusAnnouncement": "focus_heading_once_on_transition_polite_heading_and_body_once_not_each_fluctuation",
      "noProgressRule": "offline_active_cannot_submit_complete_award_or_write_progress",
      "visualTreatment": "sun_rule_tint_no_saved_or_synced_iconography"
    }
  ],
  "stateActionContractFields": ["stateId", "variantId", "primaryActionId"],
  "stateActionContracts": [
    { "stateId": "PREPARING", "variantId": null, "primaryActionId": "none" },
    { "stateId": "ACTIVE", "variantId": null, "primaryActionId": "check_answer" },
    { "stateId": "SUBMITTING", "variantId": null, "primaryActionId": "none" },
    {
      "stateId": "CONFIRMED",
      "variantId": "confirmed_correct_continue",
      "primaryActionId": "continue"
    },
    {
      "stateId": "CONFIRMED",
      "variantId": "confirmed_correct_finish",
      "primaryActionId": "finish"
    },
    {
      "stateId": "CONFIRMED",
      "variantId": "confirmed_incorrect_continue",
      "primaryActionId": "continue"
    },
    {
      "stateId": "CONFIRMED",
      "variantId": "confirmed_incorrect_finish",
      "primaryActionId": "finish"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "variantId": "retryable_error_prepare",
      "primaryActionId": "try_again"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "variantId": "retryable_error_submit",
      "primaryActionId": "try_again"
    },
    { "stateId": "STALE_CONTENT", "variantId": null, "primaryActionId": "refresh_activity" },
    { "stateId": "SESSION_ENDED", "variantId": null, "primaryActionId": "sign_in" },
    {
      "stateId": "ACCESS_BLOCKED",
      "variantId": null,
      "primaryActionId": "return_to_learning"
    },
    {
      "stateId": "EMPTY_REVIEW",
      "variantId": null,
      "primaryActionId": "continue_learning"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "variantId": "offline_read_only_prepare",
      "primaryActionId": "try_again"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "variantId": "offline_read_only_active",
      "primaryActionId": "try_again"
    }
  ],
  "stateFixtureVariantFields": ["stateId", "fixtureId", "variantId"],
  "stateFixtureVariants": [
    { "stateId": "PREPARING", "fixtureId": "long_localized_prompt_and_choices", "variantId": null },
    { "stateId": "PREPARING", "fixtureId": "rtl_mixed_script_activity", "variantId": null },
    { "stateId": "PREPARING", "fixtureId": "large_text_compact_landscape", "variantId": null },
    {
      "stateId": "PREPARING",
      "fixtureId": "one_character_and_multiline_answers",
      "variantId": null
    },
    { "stateId": "PREPARING", "fixtureId": "empty_activity_catalog", "variantId": null },
    { "stateId": "PREPARING", "fixtureId": "network_loss_during_submit", "variantId": null },
    { "stateId": "PREPARING", "fixtureId": "duplicate_submit", "variantId": null },
    { "stateId": "PREPARING", "fixtureId": "stale_content_version", "variantId": null },
    { "stateId": "PREPARING", "fixtureId": "late_confirmation_after_exit", "variantId": null },
    { "stateId": "PREPARING", "fixtureId": "authentication_expired", "variantId": null },
    { "stateId": "PREPARING", "fixtureId": "entitlement_blocked", "variantId": null },
    { "stateId": "PREPARING", "fixtureId": "offline_saved_material", "variantId": null },
    { "stateId": "PREPARING", "fixtureId": "corrupt_cache_recovery", "variantId": null },
    { "stateId": "PREPARING", "fixtureId": "protected_mode_unknown_cohort", "variantId": null },
    { "stateId": "PREPARING", "fixtureId": "missing_optional_explanation", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "long_localized_prompt_and_choices", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "rtl_mixed_script_activity", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "large_text_compact_landscape", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "one_character_and_multiline_answers", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "empty_activity_catalog", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "network_loss_during_submit", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "duplicate_submit", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "stale_content_version", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "late_confirmation_after_exit", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "authentication_expired", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "entitlement_blocked", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "offline_saved_material", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "corrupt_cache_recovery", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "protected_mode_unknown_cohort", "variantId": null },
    { "stateId": "ACTIVE", "fixtureId": "missing_optional_explanation", "variantId": null },
    {
      "stateId": "SUBMITTING",
      "fixtureId": "long_localized_prompt_and_choices",
      "variantId": null
    },
    { "stateId": "SUBMITTING", "fixtureId": "rtl_mixed_script_activity", "variantId": null },
    { "stateId": "SUBMITTING", "fixtureId": "large_text_compact_landscape", "variantId": null },
    {
      "stateId": "SUBMITTING",
      "fixtureId": "one_character_and_multiline_answers",
      "variantId": null
    },
    { "stateId": "SUBMITTING", "fixtureId": "empty_activity_catalog", "variantId": null },
    { "stateId": "SUBMITTING", "fixtureId": "network_loss_during_submit", "variantId": null },
    { "stateId": "SUBMITTING", "fixtureId": "duplicate_submit", "variantId": null },
    { "stateId": "SUBMITTING", "fixtureId": "stale_content_version", "variantId": null },
    { "stateId": "SUBMITTING", "fixtureId": "late_confirmation_after_exit", "variantId": null },
    { "stateId": "SUBMITTING", "fixtureId": "authentication_expired", "variantId": null },
    { "stateId": "SUBMITTING", "fixtureId": "entitlement_blocked", "variantId": null },
    { "stateId": "SUBMITTING", "fixtureId": "offline_saved_material", "variantId": null },
    { "stateId": "SUBMITTING", "fixtureId": "corrupt_cache_recovery", "variantId": null },
    { "stateId": "SUBMITTING", "fixtureId": "protected_mode_unknown_cohort", "variantId": null },
    { "stateId": "SUBMITTING", "fixtureId": "missing_optional_explanation", "variantId": null },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "long_localized_prompt_and_choices",
      "variantId": "confirmed_correct_continue"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "rtl_mixed_script_activity",
      "variantId": "confirmed_correct_finish"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "large_text_compact_landscape",
      "variantId": "confirmed_incorrect_continue"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "one_character_and_multiline_answers",
      "variantId": "confirmed_incorrect_finish"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "empty_activity_catalog",
      "variantId": "confirmed_correct_continue"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "network_loss_during_submit",
      "variantId": "confirmed_correct_finish"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "duplicate_submit",
      "variantId": "confirmed_incorrect_continue"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "stale_content_version",
      "variantId": "confirmed_incorrect_finish"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "late_confirmation_after_exit",
      "variantId": "confirmed_correct_continue"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "authentication_expired",
      "variantId": "confirmed_correct_finish"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "entitlement_blocked",
      "variantId": "confirmed_incorrect_continue"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "offline_saved_material",
      "variantId": "confirmed_incorrect_finish"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "corrupt_cache_recovery",
      "variantId": "confirmed_correct_continue"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "protected_mode_unknown_cohort",
      "variantId": "confirmed_correct_finish"
    },
    {
      "stateId": "CONFIRMED",
      "fixtureId": "missing_optional_explanation",
      "variantId": "confirmed_incorrect_continue"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "long_localized_prompt_and_choices",
      "variantId": "retryable_error_prepare"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "rtl_mixed_script_activity",
      "variantId": "retryable_error_submit"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "large_text_compact_landscape",
      "variantId": "retryable_error_prepare"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "one_character_and_multiline_answers",
      "variantId": "retryable_error_submit"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "empty_activity_catalog",
      "variantId": "retryable_error_prepare"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "network_loss_during_submit",
      "variantId": "retryable_error_submit"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "duplicate_submit",
      "variantId": "retryable_error_prepare"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "stale_content_version",
      "variantId": "retryable_error_submit"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "late_confirmation_after_exit",
      "variantId": "retryable_error_prepare"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "authentication_expired",
      "variantId": "retryable_error_submit"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "entitlement_blocked",
      "variantId": "retryable_error_prepare"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "offline_saved_material",
      "variantId": "retryable_error_submit"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "corrupt_cache_recovery",
      "variantId": "retryable_error_prepare"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "protected_mode_unknown_cohort",
      "variantId": "retryable_error_submit"
    },
    {
      "stateId": "RETRYABLE_ERROR",
      "fixtureId": "missing_optional_explanation",
      "variantId": "retryable_error_prepare"
    },
    {
      "stateId": "STALE_CONTENT",
      "fixtureId": "long_localized_prompt_and_choices",
      "variantId": null
    },
    { "stateId": "STALE_CONTENT", "fixtureId": "rtl_mixed_script_activity", "variantId": null },
    { "stateId": "STALE_CONTENT", "fixtureId": "large_text_compact_landscape", "variantId": null },
    {
      "stateId": "STALE_CONTENT",
      "fixtureId": "one_character_and_multiline_answers",
      "variantId": null
    },
    { "stateId": "STALE_CONTENT", "fixtureId": "empty_activity_catalog", "variantId": null },
    { "stateId": "STALE_CONTENT", "fixtureId": "network_loss_during_submit", "variantId": null },
    { "stateId": "STALE_CONTENT", "fixtureId": "duplicate_submit", "variantId": null },
    { "stateId": "STALE_CONTENT", "fixtureId": "stale_content_version", "variantId": null },
    { "stateId": "STALE_CONTENT", "fixtureId": "late_confirmation_after_exit", "variantId": null },
    { "stateId": "STALE_CONTENT", "fixtureId": "authentication_expired", "variantId": null },
    { "stateId": "STALE_CONTENT", "fixtureId": "entitlement_blocked", "variantId": null },
    { "stateId": "STALE_CONTENT", "fixtureId": "offline_saved_material", "variantId": null },
    { "stateId": "STALE_CONTENT", "fixtureId": "corrupt_cache_recovery", "variantId": null },
    { "stateId": "STALE_CONTENT", "fixtureId": "protected_mode_unknown_cohort", "variantId": null },
    { "stateId": "STALE_CONTENT", "fixtureId": "missing_optional_explanation", "variantId": null },
    {
      "stateId": "SESSION_ENDED",
      "fixtureId": "long_localized_prompt_and_choices",
      "variantId": null
    },
    { "stateId": "SESSION_ENDED", "fixtureId": "rtl_mixed_script_activity", "variantId": null },
    { "stateId": "SESSION_ENDED", "fixtureId": "large_text_compact_landscape", "variantId": null },
    {
      "stateId": "SESSION_ENDED",
      "fixtureId": "one_character_and_multiline_answers",
      "variantId": null
    },
    { "stateId": "SESSION_ENDED", "fixtureId": "empty_activity_catalog", "variantId": null },
    { "stateId": "SESSION_ENDED", "fixtureId": "network_loss_during_submit", "variantId": null },
    { "stateId": "SESSION_ENDED", "fixtureId": "duplicate_submit", "variantId": null },
    { "stateId": "SESSION_ENDED", "fixtureId": "stale_content_version", "variantId": null },
    { "stateId": "SESSION_ENDED", "fixtureId": "late_confirmation_after_exit", "variantId": null },
    { "stateId": "SESSION_ENDED", "fixtureId": "authentication_expired", "variantId": null },
    { "stateId": "SESSION_ENDED", "fixtureId": "entitlement_blocked", "variantId": null },
    { "stateId": "SESSION_ENDED", "fixtureId": "offline_saved_material", "variantId": null },
    { "stateId": "SESSION_ENDED", "fixtureId": "corrupt_cache_recovery", "variantId": null },
    { "stateId": "SESSION_ENDED", "fixtureId": "protected_mode_unknown_cohort", "variantId": null },
    { "stateId": "SESSION_ENDED", "fixtureId": "missing_optional_explanation", "variantId": null },
    {
      "stateId": "ACCESS_BLOCKED",
      "fixtureId": "long_localized_prompt_and_choices",
      "variantId": null
    },
    { "stateId": "ACCESS_BLOCKED", "fixtureId": "rtl_mixed_script_activity", "variantId": null },
    { "stateId": "ACCESS_BLOCKED", "fixtureId": "large_text_compact_landscape", "variantId": null },
    {
      "stateId": "ACCESS_BLOCKED",
      "fixtureId": "one_character_and_multiline_answers",
      "variantId": null
    },
    { "stateId": "ACCESS_BLOCKED", "fixtureId": "empty_activity_catalog", "variantId": null },
    { "stateId": "ACCESS_BLOCKED", "fixtureId": "network_loss_during_submit", "variantId": null },
    { "stateId": "ACCESS_BLOCKED", "fixtureId": "duplicate_submit", "variantId": null },
    { "stateId": "ACCESS_BLOCKED", "fixtureId": "stale_content_version", "variantId": null },
    { "stateId": "ACCESS_BLOCKED", "fixtureId": "late_confirmation_after_exit", "variantId": null },
    { "stateId": "ACCESS_BLOCKED", "fixtureId": "authentication_expired", "variantId": null },
    { "stateId": "ACCESS_BLOCKED", "fixtureId": "entitlement_blocked", "variantId": null },
    { "stateId": "ACCESS_BLOCKED", "fixtureId": "offline_saved_material", "variantId": null },
    { "stateId": "ACCESS_BLOCKED", "fixtureId": "corrupt_cache_recovery", "variantId": null },
    {
      "stateId": "ACCESS_BLOCKED",
      "fixtureId": "protected_mode_unknown_cohort",
      "variantId": null
    },
    { "stateId": "ACCESS_BLOCKED", "fixtureId": "missing_optional_explanation", "variantId": null },
    {
      "stateId": "EMPTY_REVIEW",
      "fixtureId": "long_localized_prompt_and_choices",
      "variantId": null
    },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "rtl_mixed_script_activity", "variantId": null },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "large_text_compact_landscape", "variantId": null },
    {
      "stateId": "EMPTY_REVIEW",
      "fixtureId": "one_character_and_multiline_answers",
      "variantId": null
    },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "empty_activity_catalog", "variantId": null },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "network_loss_during_submit", "variantId": null },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "duplicate_submit", "variantId": null },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "stale_content_version", "variantId": null },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "late_confirmation_after_exit", "variantId": null },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "authentication_expired", "variantId": null },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "entitlement_blocked", "variantId": null },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "offline_saved_material", "variantId": null },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "corrupt_cache_recovery", "variantId": null },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "protected_mode_unknown_cohort", "variantId": null },
    { "stateId": "EMPTY_REVIEW", "fixtureId": "missing_optional_explanation", "variantId": null },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "long_localized_prompt_and_choices",
      "variantId": "offline_read_only_prepare"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "rtl_mixed_script_activity",
      "variantId": "offline_read_only_active"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "large_text_compact_landscape",
      "variantId": "offline_read_only_prepare"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "one_character_and_multiline_answers",
      "variantId": "offline_read_only_active"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "empty_activity_catalog",
      "variantId": "offline_read_only_prepare"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "network_loss_during_submit",
      "variantId": "offline_read_only_active"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "duplicate_submit",
      "variantId": "offline_read_only_prepare"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "stale_content_version",
      "variantId": "offline_read_only_active"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "late_confirmation_after_exit",
      "variantId": "offline_read_only_prepare"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "authentication_expired",
      "variantId": "offline_read_only_active"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "entitlement_blocked",
      "variantId": "offline_read_only_prepare"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "offline_saved_material",
      "variantId": "offline_read_only_active"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "corrupt_cache_recovery",
      "variantId": "offline_read_only_prepare"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "protected_mode_unknown_cohort",
      "variantId": "offline_read_only_active"
    },
    {
      "stateId": "OFFLINE_READ_ONLY",
      "fixtureId": "missing_optional_explanation",
      "variantId": "offline_read_only_prepare"
    }
  ],
  "readingOrder": [
    "skip_link",
    "top_bar_back",
    "named_progress",
    "single_h1",
    "prompt_instructions",
    "response_group",
    "feedback_recovery_status",
    "action_region"
  ],
  "visual": {
    "concept": "Conversation Canvas is a calm task-focused warm paper sheet with strong ink structure restrained cobalt action and supportive coral sun and mint state cues.",
    "scopedTokens": {
      "paper": "#fffaf0",
      "ink": "#17133f",
      "lightCanvas": "#ffffff",
      "darkCanvas": "#211c4a",
      "lightRaised": "#fffdf8",
      "darkRaised": "#2a2456",
      "lightSecondaryText": "#4f4b6d",
      "darkSecondaryText": "#d7d0e5",
      "structuralBorder": "#6f6994",
      "lightCobalt": "#2639b6",
      "darkCobalt": "#aeb8ff",
      "lightCoral": "#d63f52",
      "darkCoral": "#ff8c96",
      "sun": "#ffd34e",
      "mint": "#7de2c4"
    },
    "semanticContrastOwnershipFields": [
      "semanticPairId",
      "themeId",
      "usageClass",
      "foregroundTokenId",
      "backgroundTokenId",
      "observedForegroundRgba",
      "observedBackgroundRgba",
      "requiredRatio",
      "computedRatio",
      "passes"
    ],
    "semanticContrastOwnership": [
      {
        "semanticPairId": "light_ink_on_paper",
        "themeId": "light",
        "usageClass": "normal_text",
        "foregroundTokenId": "ink",
        "backgroundTokenId": "paper",
        "observedForegroundRgba": { "red": 23, "green": 19, "blue": 63, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 250, "blue": 240, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 16.801416,
        "passes": true
      },
      {
        "semanticPairId": "light_ink_on_raised",
        "themeId": "light",
        "usageClass": "normal_text",
        "foregroundTokenId": "ink",
        "backgroundTokenId": "lightRaised",
        "observedForegroundRgba": { "red": 23, "green": 19, "blue": 63, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 253, "blue": 248, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 17.195202,
        "passes": true
      },
      {
        "semanticPairId": "light_secondary_on_paper",
        "themeId": "light",
        "usageClass": "secondary_text",
        "foregroundTokenId": "lightSecondaryText",
        "backgroundTokenId": "paper",
        "observedForegroundRgba": { "red": 79, "green": 75, "blue": 109, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 250, "blue": 240, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 7.885465,
        "passes": true
      },
      {
        "semanticPairId": "light_secondary_on_raised",
        "themeId": "light",
        "usageClass": "secondary_text",
        "foregroundTokenId": "lightSecondaryText",
        "backgroundTokenId": "lightRaised",
        "observedForegroundRgba": { "red": 79, "green": 75, "blue": 109, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 253, "blue": 248, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 8.070282,
        "passes": true
      },
      {
        "semanticPairId": "light_border_on_paper",
        "themeId": "light",
        "usageClass": "structural_boundary",
        "foregroundTokenId": "structuralBorder",
        "backgroundTokenId": "paper",
        "observedForegroundRgba": { "red": 111, "green": 105, "blue": 148, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 250, "blue": 240, "alpha": 1 },
        "requiredRatio": 3,
        "computedRatio": 4.894214,
        "passes": true
      },
      {
        "semanticPairId": "light_border_on_raised",
        "themeId": "light",
        "usageClass": "structural_boundary",
        "foregroundTokenId": "structuralBorder",
        "backgroundTokenId": "lightRaised",
        "observedForegroundRgba": { "red": 111, "green": 105, "blue": 148, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 253, "blue": 248, "alpha": 1 },
        "requiredRatio": 3,
        "computedRatio": 5.008923,
        "passes": true
      },
      {
        "semanticPairId": "light_action_on_paper",
        "themeId": "light",
        "usageClass": "action_text",
        "foregroundTokenId": "lightCobalt",
        "backgroundTokenId": "paper",
        "observedForegroundRgba": { "red": 38, "green": 57, "blue": 182, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 250, "blue": 240, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 8.614277,
        "passes": true
      },
      {
        "semanticPairId": "light_action_on_raised",
        "themeId": "light",
        "usageClass": "action_text",
        "foregroundTokenId": "lightCobalt",
        "backgroundTokenId": "lightRaised",
        "observedForegroundRgba": { "red": 38, "green": 57, "blue": 182, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 253, "blue": 248, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 8.816176,
        "passes": true
      },
      {
        "semanticPairId": "light_focus_on_paper",
        "themeId": "light",
        "usageClass": "focus_boundary",
        "foregroundTokenId": "lightCobalt",
        "backgroundTokenId": "paper",
        "observedForegroundRgba": { "red": 38, "green": 57, "blue": 182, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 250, "blue": 240, "alpha": 1 },
        "requiredRatio": 3,
        "computedRatio": 8.614277,
        "passes": true
      },
      {
        "semanticPairId": "light_focus_on_raised",
        "themeId": "light",
        "usageClass": "focus_boundary",
        "foregroundTokenId": "lightCobalt",
        "backgroundTokenId": "lightRaised",
        "observedForegroundRgba": { "red": 38, "green": 57, "blue": 182, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 253, "blue": 248, "alpha": 1 },
        "requiredRatio": 3,
        "computedRatio": 8.816176,
        "passes": true
      },
      {
        "semanticPairId": "light_state_coral_on_paper",
        "themeId": "light",
        "usageClass": "state_boundary_only_not_normal_text",
        "foregroundTokenId": "lightCoral",
        "backgroundTokenId": "paper",
        "observedForegroundRgba": { "red": 214, "green": 63, "blue": 82, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 250, "blue": 240, "alpha": 1 },
        "requiredRatio": 3,
        "computedRatio": 4.301832,
        "passes": true
      },
      {
        "semanticPairId": "light_state_coral_on_raised",
        "themeId": "light",
        "usageClass": "state_boundary_only_not_normal_text",
        "foregroundTokenId": "lightCoral",
        "backgroundTokenId": "lightRaised",
        "observedForegroundRgba": { "red": 214, "green": 63, "blue": 82, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 253, "blue": 248, "alpha": 1 },
        "requiredRatio": 3,
        "computedRatio": 4.402657,
        "passes": true
      },
      {
        "semanticPairId": "dark_paper_on_canvas",
        "themeId": "dark",
        "usageClass": "normal_text",
        "foregroundTokenId": "paper",
        "backgroundTokenId": "darkCanvas",
        "observedForegroundRgba": { "red": 255, "green": 250, "blue": 240, "alpha": 1 },
        "observedBackgroundRgba": { "red": 33, "green": 28, "blue": 74, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 15.180301,
        "passes": true
      },
      {
        "semanticPairId": "dark_paper_on_raised",
        "themeId": "dark",
        "usageClass": "normal_text",
        "foregroundTokenId": "paper",
        "backgroundTokenId": "darkRaised",
        "observedForegroundRgba": { "red": 255, "green": 250, "blue": 240, "alpha": 1 },
        "observedBackgroundRgba": { "red": 42, "green": 36, "blue": 86, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 13.590645,
        "passes": true
      },
      {
        "semanticPairId": "dark_secondary_on_canvas",
        "themeId": "dark",
        "usageClass": "secondary_text",
        "foregroundTokenId": "darkSecondaryText",
        "backgroundTokenId": "darkCanvas",
        "observedForegroundRgba": { "red": 215, "green": 208, "blue": 229, "alpha": 1 },
        "observedBackgroundRgba": { "red": 33, "green": 28, "blue": 74, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 10.561566,
        "passes": true
      },
      {
        "semanticPairId": "dark_secondary_on_raised",
        "themeId": "dark",
        "usageClass": "secondary_text",
        "foregroundTokenId": "darkSecondaryText",
        "backgroundTokenId": "darkRaised",
        "observedForegroundRgba": { "red": 215, "green": 208, "blue": 229, "alpha": 1 },
        "observedBackgroundRgba": { "red": 42, "green": 36, "blue": 86, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 9.455577,
        "passes": true
      },
      {
        "semanticPairId": "dark_border_on_canvas",
        "themeId": "dark",
        "usageClass": "structural_boundary_canvas_only",
        "foregroundTokenId": "structuralBorder",
        "backgroundTokenId": "darkCanvas",
        "observedForegroundRgba": { "red": 111, "green": 105, "blue": 148, "alpha": 1 },
        "observedBackgroundRgba": { "red": 33, "green": 28, "blue": 74, "alpha": 1 },
        "requiredRatio": 3,
        "computedRatio": 3.101683,
        "passes": true
      },
      {
        "semanticPairId": "dark_structural_cobalt_on_raised",
        "themeId": "dark",
        "usageClass": "structural_boundary_raised",
        "foregroundTokenId": "darkCobalt",
        "backgroundTokenId": "darkRaised",
        "observedForegroundRgba": { "red": 174, "green": 184, "blue": 255, "alpha": 1 },
        "observedBackgroundRgba": { "red": 42, "green": 36, "blue": 86, "alpha": 1 },
        "requiredRatio": 3,
        "computedRatio": 7.473816,
        "passes": true
      },
      {
        "semanticPairId": "dark_action_on_canvas",
        "themeId": "dark",
        "usageClass": "action_text",
        "foregroundTokenId": "darkCobalt",
        "backgroundTokenId": "darkCanvas",
        "observedForegroundRgba": { "red": 174, "green": 184, "blue": 255, "alpha": 1 },
        "observedBackgroundRgba": { "red": 33, "green": 28, "blue": 74, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 8.348005,
        "passes": true
      },
      {
        "semanticPairId": "dark_action_on_raised",
        "themeId": "dark",
        "usageClass": "action_text",
        "foregroundTokenId": "darkCobalt",
        "backgroundTokenId": "darkRaised",
        "observedForegroundRgba": { "red": 174, "green": 184, "blue": 255, "alpha": 1 },
        "observedBackgroundRgba": { "red": 42, "green": 36, "blue": 86, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 7.473816,
        "passes": true
      },
      {
        "semanticPairId": "dark_state_coral_on_canvas",
        "themeId": "dark",
        "usageClass": "state_boundary",
        "foregroundTokenId": "darkCoral",
        "backgroundTokenId": "darkCanvas",
        "observedForegroundRgba": { "red": 255, "green": 140, "blue": 150, "alpha": 1 },
        "observedBackgroundRgba": { "red": 33, "green": 28, "blue": 74, "alpha": 1 },
        "requiredRatio": 3,
        "computedRatio": 7.102343,
        "passes": true
      },
      {
        "semanticPairId": "dark_state_coral_on_raised",
        "themeId": "dark",
        "usageClass": "state_boundary",
        "foregroundTokenId": "darkCoral",
        "backgroundTokenId": "darkRaised",
        "observedForegroundRgba": { "red": 255, "green": 140, "blue": 150, "alpha": 1 },
        "observedBackgroundRgba": { "red": 42, "green": 36, "blue": 86, "alpha": 1 },
        "requiredRatio": 3,
        "computedRatio": 6.358598,
        "passes": true
      },
      {
        "semanticPairId": "dark_focus_sun_on_canvas",
        "themeId": "dark",
        "usageClass": "focus_boundary",
        "foregroundTokenId": "sun",
        "backgroundTokenId": "darkCanvas",
        "observedForegroundRgba": { "red": 255, "green": 211, "blue": 78, "alpha": 1 },
        "observedBackgroundRgba": { "red": 33, "green": 28, "blue": 74, "alpha": 1 },
        "requiredRatio": 3,
        "computedRatio": 11.040282,
        "passes": true
      },
      {
        "semanticPairId": "dark_focus_sun_on_raised",
        "themeId": "dark",
        "usageClass": "focus_boundary",
        "foregroundTokenId": "sun",
        "backgroundTokenId": "darkRaised",
        "observedForegroundRgba": { "red": 255, "green": 211, "blue": 78, "alpha": 1 },
        "observedBackgroundRgba": { "red": 42, "green": 36, "blue": 86, "alpha": 1 },
        "requiredRatio": 3,
        "computedRatio": 9.884162,
        "passes": true
      },
      {
        "semanticPairId": "both_ink_on_sun",
        "themeId": "both",
        "usageClass": "status_text",
        "foregroundTokenId": "ink",
        "backgroundTokenId": "sun",
        "observedForegroundRgba": { "red": 23, "green": 19, "blue": 63, "alpha": 1 },
        "observedBackgroundRgba": { "red": 255, "green": 211, "blue": 78, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 12.219281,
        "passes": true
      },
      {
        "semanticPairId": "both_ink_on_mint",
        "themeId": "both",
        "usageClass": "status_text",
        "foregroundTokenId": "ink",
        "backgroundTokenId": "mint",
        "observedForegroundRgba": { "red": 23, "green": 19, "blue": 63, "alpha": 1 },
        "observedBackgroundRgba": { "red": 125, "green": 226, "blue": 196, "alpha": 1 },
        "requiredRatio": 4.5,
        "computedRatio": 11.27695,
        "passes": true
      }
    ],
    "forbiddenSemanticContrastUses": [
      "structuralBorder_on_darkRaised_ratio_2.776880",
      "lightCoral_as_normal_text"
    ],
    "scopedTintTokens": {
      "light": {
        "--cc-coral-tint": "#fff0f1",
        "--cc-sun-tint": "#fff7d8",
        "--cc-mint-tint": "#e8fbf4"
      },
      "dark": {
        "--cc-coral-tint": "#2a2456",
        "--cc-sun-tint": "#2a2456",
        "--cc-mint-tint": "#2a2456"
      }
    },
    "requiredCssToken": "--cc-coral:#d63f52",
    "forbiddenCssAlias": "--cc-coral:var(--coral)",
    "typography": {
      "displayStack": "existing_var_display",
      "bodyStack": "existing_var_body",
      "roleFields": [
        "roleId",
        "fontStack",
        "mobileFontSizeCssPx",
        "mobileLineHeightCssPx",
        "desktopFontSizeCssPx",
        "desktopLineHeightCssPx",
        "fontWeightMin",
        "fontWeightMax",
        "letterSpacingEm"
      ],
      "roles": [
        {
          "roleId": "state_heading_h1",
          "fontStack": "display",
          "mobileFontSizeCssPx": 32,
          "mobileLineHeightCssPx": 36,
          "desktopFontSizeCssPx": 40,
          "desktopLineHeightCssPx": 44,
          "fontWeightMin": 700,
          "fontWeightMax": 900,
          "letterSpacingEm": -0.025
        },
        {
          "roleId": "prompt_heading",
          "fontStack": "display",
          "mobileFontSizeCssPx": 22,
          "mobileLineHeightCssPx": 30,
          "desktopFontSizeCssPx": 24,
          "desktopLineHeightCssPx": 32,
          "fontWeightMin": 700,
          "fontWeightMax": 700,
          "letterSpacingEm": -0.025
        },
        {
          "roleId": "secondary_heading_h2_or_dialog_title",
          "fontStack": "display",
          "mobileFontSizeCssPx": 24,
          "mobileLineHeightCssPx": 30,
          "desktopFontSizeCssPx": 28,
          "desktopLineHeightCssPx": 34,
          "fontWeightMin": 700,
          "fontWeightMax": 700,
          "letterSpacingEm": -0.025
        },
        {
          "roleId": "body",
          "fontStack": "body",
          "mobileFontSizeCssPx": 18,
          "mobileLineHeightCssPx": 28,
          "desktopFontSizeCssPx": 18,
          "desktopLineHeightCssPx": 28,
          "fontWeightMin": 400,
          "fontWeightMax": 500,
          "letterSpacingEm": 0
        },
        {
          "roleId": "supporting",
          "fontStack": "body",
          "mobileFontSizeCssPx": 16,
          "mobileLineHeightCssPx": 24,
          "desktopFontSizeCssPx": 16,
          "desktopLineHeightCssPx": 24,
          "fontWeightMin": 400,
          "fontWeightMax": 600,
          "letterSpacingEm": 0
        },
        {
          "roleId": "button_label",
          "fontStack": "body",
          "mobileFontSizeCssPx": 17,
          "mobileLineHeightCssPx": 24,
          "desktopFontSizeCssPx": 17,
          "desktopLineHeightCssPx": 24,
          "fontWeightMin": 700,
          "fontWeightMax": 700,
          "letterSpacingEm": 0
        },
        {
          "roleId": "metadata",
          "fontStack": "body",
          "mobileFontSizeCssPx": 14,
          "mobileLineHeightCssPx": 20,
          "desktopFontSizeCssPx": 14,
          "desktopLineHeightCssPx": 20,
          "fontWeightMin": 600,
          "fontWeightMax": 600,
          "letterSpacingEm": 0
        },
        {
          "roleId": "progress_text",
          "fontStack": "body",
          "mobileFontSizeCssPx": 16,
          "mobileLineHeightCssPx": 24,
          "desktopFontSizeCssPx": 16,
          "desktopLineHeightCssPx": 24,
          "fontWeightMin": 700,
          "fontWeightMax": 700,
          "letterSpacingEm": 0
        }
      ],
      "proseMaxCh": 68,
      "inputMinCssPx": 16
    },
    "spacingPx": [4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
    "targetMinCssPx": 44,
    "focusRingFields": [
      "themeId",
      "ringId",
      "widthCssPx",
      "offsetCssPx",
      "colorToken",
      "colorHex",
      "semanticPairId"
    ],
    "focusRings": [
      {
        "themeId": "light",
        "ringId": "focus_light",
        "widthCssPx": 3,
        "offsetCssPx": 3,
        "colorToken": "--cc-action-cobalt",
        "colorHex": "#2639b6",
        "semanticPairId": "light_focus_on_paper"
      },
      {
        "themeId": "dark",
        "ringId": "focus_dark",
        "widthCssPx": 3,
        "offsetCssPx": 3,
        "colorToken": "--cc-sun",
        "colorHex": "#ffd34e",
        "semanticPairId": "dark_focus_sun_on_canvas"
      }
    ],
    "normalMotionFields": [
      "motionId",
      "triggerId",
      "ownerId",
      "propertyIds",
      "durationMs",
      "easingId",
      "interruptionPolicyId",
      "settlementPolicyId",
      "focusInvariantId",
      "announcementInvariantId"
    ],
    "normalMotion": [
      {
        "motionId": "press",
        "triggerId": "pointer_or_key_press_release",
        "ownerId": "current_enabled_control",
        "propertyIds": ["transform_scale"],
        "durationMs": 120,
        "easingId": "cubic-bezier(0.22, 1, 0.36, 1)",
        "interruptionPolicyId": "new_semantic_state_generation_dialog_dismissal_resize_visibility_or_reduced_motion_cancels_old_motion",
        "settlementPolicyId": "next_frame_uses_newest_canonical_state_equivalent_events_coalesce_without_queue",
        "focusInvariantId": "motion_never_moves_focus_and_stale_callbacks_cannot_focus_or_navigate",
        "announcementInvariantId": "callbacks_are_silent_and_semantic_announcement_occurs_exactly_once"
      },
      {
        "motionId": "selection",
        "triggerId": "committed_radio_change",
        "ownerId": "selected_indicator_and_surface",
        "propertyIds": ["transform_scale", "opacity"],
        "durationMs": 140,
        "easingId": "cubic-bezier(0.22, 1, 0.36, 1)",
        "interruptionPolicyId": "new_semantic_state_generation_dialog_dismissal_resize_visibility_or_reduced_motion_cancels_old_motion",
        "settlementPolicyId": "next_frame_uses_newest_canonical_state_equivalent_events_coalesce_without_queue",
        "focusInvariantId": "motion_never_moves_focus_and_stale_callbacks_cannot_focus_or_navigate",
        "announcementInvariantId": "callbacks_are_silent_and_semantic_announcement_occurs_exactly_once"
      },
      {
        "motionId": "entry",
        "triggerId": "newly_active_panel_or_dialog",
        "ownerId": "entering_panel_or_dialog_only",
        "propertyIds": ["transform_translate", "opacity"],
        "durationMs": 180,
        "easingId": "cubic-bezier(0.22, 1, 0.36, 1)",
        "interruptionPolicyId": "new_semantic_state_generation_dialog_dismissal_resize_visibility_or_reduced_motion_cancels_old_motion",
        "settlementPolicyId": "next_frame_uses_newest_canonical_state_equivalent_events_coalesce_without_queue",
        "focusInvariantId": "motion_never_moves_focus_and_stale_callbacks_cannot_focus_or_navigate",
        "announcementInvariantId": "callbacks_are_silent_and_semantic_announcement_occurs_exactly_once"
      },
      {
        "motionId": "confirmed_transition",
        "triggerId": "matching_server_confirmed_state_current",
        "ownerId": "feedback_region",
        "propertyIds": ["transform_translate", "opacity"],
        "durationMs": 220,
        "easingId": "cubic-bezier(0.22, 1, 0.36, 1)",
        "interruptionPolicyId": "new_semantic_state_generation_dialog_dismissal_resize_visibility_or_reduced_motion_cancels_old_motion",
        "settlementPolicyId": "next_frame_uses_newest_canonical_state_equivalent_events_coalesce_without_queue",
        "focusInvariantId": "motion_never_moves_focus_and_stale_callbacks_cannot_focus_or_navigate",
        "announcementInvariantId": "callbacks_are_silent_and_semantic_announcement_occurs_exactly_once"
      },
      {
        "motionId": "progress",
        "triggerId": "confirmed_progress_value_change",
        "ownerId": "progress_fill",
        "propertyIds": ["transform_scale_x_logical_start"],
        "durationMs": 240,
        "easingId": "cubic-bezier(0.22, 1, 0.36, 1)",
        "interruptionPolicyId": "new_semantic_state_generation_dialog_dismissal_resize_visibility_or_reduced_motion_cancels_old_motion",
        "settlementPolicyId": "next_frame_uses_newest_canonical_state_equivalent_events_coalesce_without_queue",
        "focusInvariantId": "motion_never_moves_focus_and_stale_callbacks_cannot_focus_or_navigate",
        "announcementInvariantId": "callbacks_are_silent_and_semantic_announcement_occurs_exactly_once"
      }
    ],
    "motionInterruptionFixtureFields": [
      "stateId",
      "fixtureId",
      "motionId",
      "interruptedBy",
      "expectedSettledStateId",
      "expectedSettledVariantId",
      "expectedAnnouncementCount"
    ],
    "motionInterruptionFixtures": [
      {
        "stateId": "PREPARING",
        "fixtureId": "authentication_expired",
        "motionId": "entry",
        "interruptedBy": "semantic_state",
        "expectedSettledStateId": "SESSION_ENDED",
        "expectedSettledVariantId": null,
        "expectedAnnouncementCount": 1
      },
      {
        "stateId": "ACTIVE",
        "fixtureId": "stale_content_version",
        "motionId": "selection",
        "interruptedBy": "generation",
        "expectedSettledStateId": "STALE_CONTENT",
        "expectedSettledVariantId": null,
        "expectedAnnouncementCount": 1
      },
      {
        "stateId": "SUBMITTING",
        "fixtureId": "network_loss_during_submit",
        "motionId": "entry",
        "interruptedBy": "semantic_state",
        "expectedSettledStateId": "OFFLINE_READ_ONLY",
        "expectedSettledVariantId": "offline_read_only_active",
        "expectedAnnouncementCount": 1
      },
      {
        "stateId": "CONFIRMED",
        "fixtureId": "large_text_compact_landscape",
        "motionId": "confirmed_transition",
        "interruptedBy": "resize",
        "expectedSettledStateId": "CONFIRMED",
        "expectedSettledVariantId": "confirmed_incorrect_continue",
        "expectedAnnouncementCount": 1
      }
    ],
    "exitDialogMotionId": "entry",
    "easing": "cubic-bezier(0.22, 1, 0.36, 1)",
    "reducedMotion": "remove_translation_scale_and_progress_animation_apply_final_state_immediately_preserve_focus_copy_semantics_and_announcement_count",
    "forbiddenMotion": [
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
      "mascot"
    ],
    "layoutFields": [
      "viewportId",
      "columnCount",
      "inlineGutterCssPx",
      "blockGutterCssPx",
      "canvasMaxWidthCssPx",
      "topBarMinHeightCssPx",
      "panelPaddingCssPx",
      "backplateOffsetCssPx",
      "notchCssPx",
      "actionLayout"
    ],
    "layout": [
      {
        "viewportId": "phone_320x568",
        "columnCount": 1,
        "inlineGutterCssPx": 16,
        "blockGutterCssPx": 16,
        "canvasMaxWidthCssPx": 720,
        "topBarMinHeightCssPx": 56,
        "panelPaddingCssPx": 16,
        "backplateOffsetCssPx": 4,
        "notchCssPx": 20,
        "actionLayout": "full_width_below_content"
      },
      {
        "viewportId": "reference_390x844",
        "columnCount": 1,
        "inlineGutterCssPx": 20,
        "blockGutterCssPx": 20,
        "canvasMaxWidthCssPx": 720,
        "topBarMinHeightCssPx": 56,
        "panelPaddingCssPx": 20,
        "backplateOffsetCssPx": 4,
        "notchCssPx": 20,
        "actionLayout": "full_width_below_content"
      },
      {
        "viewportId": "phone_430x932",
        "columnCount": 1,
        "inlineGutterCssPx": 20,
        "blockGutterCssPx": 24,
        "canvasMaxWidthCssPx": 720,
        "topBarMinHeightCssPx": 56,
        "panelPaddingCssPx": 24,
        "backplateOffsetCssPx": 4,
        "notchCssPx": 20,
        "actionLayout": "full_width_below_content"
      },
      {
        "viewportId": "compact_landscape_844x390",
        "columnCount": 1,
        "inlineGutterCssPx": 16,
        "blockGutterCssPx": 16,
        "canvasMaxWidthCssPx": 720,
        "topBarMinHeightCssPx": 48,
        "panelPaddingCssPx": 20,
        "backplateOffsetCssPx": 4,
        "notchCssPx": 20,
        "actionLayout": "full_width_below_content_scroll_reachable"
      },
      {
        "viewportId": "tablet_768x1024",
        "columnCount": 1,
        "inlineGutterCssPx": 32,
        "blockGutterCssPx": 32,
        "canvasMaxWidthCssPx": 680,
        "topBarMinHeightCssPx": 64,
        "panelPaddingCssPx": 32,
        "backplateOffsetCssPx": 8,
        "notchCssPx": 24,
        "actionLayout": "content_width_below_content"
      },
      {
        "viewportId": "desktop_1200x900",
        "columnCount": 1,
        "inlineGutterCssPx": 32,
        "blockGutterCssPx": 40,
        "canvasMaxWidthCssPx": 760,
        "topBarMinHeightCssPx": 64,
        "panelPaddingCssPx": 40,
        "backplateOffsetCssPx": 8,
        "notchCssPx": 24,
        "actionLayout": "content_width_below_content"
      }
    ],
    "componentGeometry": {
      "canvas": {
        "borderCssPx": 2,
        "cornerRadiusCssPx": 24
      },
      "backplate": {
        "borderCssPx": 0,
        "cornerRadiusCssPx": 24,
        "minimumInlineSizeCssPx": 0
      },
      "statePanel": {
        "borderInlineStartCssPx": 4,
        "cornerRadiusCssPx": 16,
        "minimumBlockSizeCssPx": 0
      },
      "choice": {
        "borderCssPx": 2,
        "minimumBlockSizeCssPx": 44,
        "gapCssPx": 12,
        "cornerRadiusCssPx": 12
      },
      "primaryAction": {
        "minimumInlineSizeCssPx": 120,
        "minimumBlockSizeCssPx": 44,
        "cornerRadiusCssPx": 12
      },
      "progress": {
        "trackBlockSizeCssPx": 12,
        "cornerRadiusCssPx": 6
      },
      "topBar": {
        "sticky": false,
        "fixed": false,
        "obscuresContent": false
      }
    }
  },
  "matrix": {
    "viewports": [
      { "id": "phone_320x568", "widthCssPx": 320, "heightCssPx": 568 },
      { "id": "reference_390x844", "widthCssPx": 390, "heightCssPx": 844 },
      { "id": "phone_430x932", "widthCssPx": 430, "heightCssPx": 932 },
      { "id": "compact_landscape_844x390", "widthCssPx": 844, "heightCssPx": 390 },
      { "id": "tablet_768x1024", "widthCssPx": 768, "heightCssPx": 1024 },
      { "id": "desktop_1200x900", "widthCssPx": 1200, "heightCssPx": 900 }
    ],
    "themes": ["light", "dark"],
    "locales": ["en", "en-XA", "ar-XB"],
    "textScales": [
      {
        "id": "browser_zoom_100",
        "mechanism": "chromium_browser_zoom",
        "browserZoomPercent": 100,
        "cssZoomPercent": 100,
        "rootTextScalePercent": 100,
        "osTextScalePercent": 100
      },
      {
        "id": "browser_zoom_200",
        "mechanism": "chromium_browser_zoom",
        "browserZoomPercent": 200,
        "cssZoomPercent": 100,
        "rootTextScalePercent": 100,
        "osTextScalePercent": 100
      }
    ],
    "breakUiFixtures": [
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
    ],
    "breakUiRecordFields": [
      "fixtureId",
      "setup",
      "renderStateIds",
      "criterionFocusStates",
      "preservationRule",
      "focusRule",
      "noProgressRule",
      "accessibilityCriteria",
      "visualCriteria"
    ],
    "breakUiRecords": [
      {
        "fixtureId": "long_localized_prompt_and_choices",
        "setup": "600_grapheme_prompt_four_180_grapheme_choices_in_en_XA",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["ACTIVE"],
        "preservationRule": "prompt_choice_order_and_unconfirmed_selection_remain_exact",
        "focusRule": "logical_heading_prompt_group_choice_action_order_without_focus_loss",
        "noProgressRule": "wrapping_scrolling_and_selection_never_award_progress",
        "accessibilityCriteria": "complete_names_roles_values_and_200_percent_reachable_action",
        "visualCriteria": "no_clip_overlap_horizontal_page_scroll_or_truncated_required_text"
      },
      {
        "fixtureId": "rtl_mixed_script_activity",
        "setup": "ar_XB_direction_with_isolated_Latin_fragments_and_numerals",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["ACTIVE", "CONFIRMED"],
        "preservationRule": "canonical_answer_order_and_confirmed_result_remain_unchanged",
        "focusRule": "logical_RTL_traversal_without_reversing_answer_order",
        "noProgressRule": "direction_changes_never_mutate_answer_or_progress",
        "accessibilityCriteria": "directional_icons_mirror_only_when_semantic_and_names_remain_complete",
        "visualCriteria": "no_bidi_spill_collision_clipping_or_incorrect_physical_alignment"
      },
      {
        "fixtureId": "large_text_compact_landscape",
        "setup": "compact_landscape_844x390_at_browser_zoom_200",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": [
          "PREPARING",
          "ACTIVE",
          "SUBMITTING",
          "CONFIRMED",
          "RETRYABLE_ERROR"
        ],
        "preservationRule": "state_answer_and_confirmed_progress_survive_reflow",
        "focusRule": "action_scrolls_into_view_without_focus_trap_or_obstruction",
        "noProgressRule": "zoom_reflow_and_scroll_never_mutate_progress",
        "accessibilityCriteria": "single_column_full_text_44px_targets_and_visible_focus",
        "visualCriteria": "no_fixed_footer_nested_scroll_horizontal_overflow_or_hidden_action"
      },
      {
        "fixtureId": "one_character_and_multiline_answers",
        "setup": "one_character_choice_and_multiline_choices_in_one_named_radio_group",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["ACTIVE"],
        "preservationRule": "exact_choice_text_order_and_single_selection_remain_unchanged",
        "focusRule": "each_choice_is_one_reachable_named_radio_stop",
        "noProgressRule": "selection_and_line_wrapping_never_award_progress",
        "accessibilityCriteria": "minimum_target_complete_accessible_name_and_group_label",
        "visualCriteria": "short_and_multiline_choices_share_stable_alignment_without_collision"
      },
      {
        "fixtureId": "empty_activity_catalog",
        "setup": "authorized_catalog_contains_zero_available_activities",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["EMPTY_REVIEW"],
        "preservationRule": "confirmed_progress_and_curriculum_position_remain_unchanged",
        "focusRule": "focus_empty_heading_once_then_continue_learning",
        "noProgressRule": "empty_catalog_never_manufactures_review_or_completion",
        "accessibilityCriteria": "single_heading_single_safe_action_and_one_time_announcement",
        "visualCriteria": "calm_mint_non_color_empty_treatment_without_fake_content"
      },
      {
        "fixtureId": "network_loss_during_submit",
        "setup": "network_becomes_unavailable_after_idempotent_submission_starts",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["SUBMITTING", "RETRYABLE_ERROR", "OFFLINE_READ_ONLY"],
        "preservationRule": "same_answer_and_idempotency_key_remain_memory_only_until_settlement_or_exit",
        "focusRule": "announce_recovery_once_without_moving_focus_repeatedly",
        "noProgressRule": "network_loss_retry_and_offline_state_never_synthesize_result_or_progress",
        "accessibilityCriteria": "checking_and_recovery_status_have_named_non_color_semantics",
        "visualCriteria": "one_recovery_panel_no_duplicate_overlay_spinner_or_stale_confirmed_style"
      },
      {
        "fixtureId": "duplicate_submit",
        "setup": "primary_action_is_activated_repeatedly_during_one_in_flight_submission",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["SUBMITTING"],
        "preservationRule": "one_answer_one_idempotency_key_and_one_request_remain_authoritative",
        "focusRule": "action_position_and_status_announcement_remain_stable",
        "noProgressRule": "duplicate_activation_never_creates_duplicate_attempt_or_award",
        "accessibilityCriteria": "disabled_or_busy_action_exposes_one_named_status",
        "visualCriteria": "no_duplicate_button_overlay_spinner_or_layout_shift"
      },
      {
        "fixtureId": "stale_content_version",
        "setup": "server_rejects_attempt_for_noncurrent_content_version",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["STALE_CONTENT"],
        "preservationRule": "confirmed_progress_remains_and_stale_answer_submission_context_clears",
        "focusRule": "focus_changed_heading_once_then_refresh_activity",
        "noProgressRule": "stale_version_never_submits_again_or_awards_progress",
        "accessibilityCriteria": "assertive_once_refresh_action_named_and_reachable",
        "visualCriteria": "sun_non_color_changed_treatment_without_confirmed_decoration"
      },
      {
        "fixtureId": "late_confirmation_after_exit",
        "setup": "confirmation_arrives_after_explicit_exit_and_operation_fence_change",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["SUBMITTING", "PREPARING"],
        "preservationRule": "safe_destination_and_existing_confirmed_progress_ignore_late_result",
        "focusRule": "focus_remains_on_current_safe_destination_without_announcement",
        "noProgressRule": "late_result_never_navigates_renders_or_mutates_progress",
        "accessibilityCriteria": "no_stale_live_region_event_or_focus_theft",
        "visualCriteria": "no_flash_overlay_confirmed_color_or_progress_jump"
      },
      {
        "fixtureId": "authentication_expired",
        "setup": "current_authenticated_generation_becomes_invalid",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["SESSION_ENDED"],
        "preservationRule": "confirmed_progress_owner_neutral_return_preserved_unconfirmed_work_cleared",
        "focusRule": "focus_session_ended_heading_once_then_sign_in",
        "noProgressRule": "session_loss_display_and_sign_in_cannot_create_completion_or_progress",
        "accessibilityCriteria": "assertive_once_without_provider_expiry_or_identity_detail",
        "visualCriteria": "coral_non_color_session_treatment_without_paywall_or_provider_brand"
      },
      {
        "fixtureId": "entitlement_blocked",
        "setup": "server_authorization_reports_activity_unavailable_for_current_owner",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["ACCESS_BLOCKED"],
        "preservationRule": "authentication_confirmed_progress_and_unrelated_safe_navigation_remain",
        "focusRule": "focus_blocked_heading_once_then_return_to_learning",
        "noProgressRule": "blocked_activity_never_completes_or_changes_rewards_goal_or_progress",
        "accessibilityCriteria": "assertive_once_without_entitlement_subscription_or_diagnostic_detail",
        "visualCriteria": "distinct_coral_non_color_blocked_treatment_without_paywall_styling"
      },
      {
        "fixtureId": "offline_saved_material",
        "setup": "offline_origin_is_active_with_one_memory_only_unconfirmed_answer",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["OFFLINE_READ_ONLY"],
        "preservationRule": "answer_is_kept_for_current_session_only_and_cleared_on_exit_never_saved_synced_or_durable",
        "focusRule": "focus_offline_heading_once_and_do_not_repeat_for_connectivity_fluctuations",
        "noProgressRule": "offline_state_never_submits_completes_awards_or_writes_progress",
        "accessibilityCriteria": "plain_offline_copy_try_again_action_and_non_color_status",
        "visualCriteria": "no_saved_synced_download_cloud_or_durable_iconography"
      },
      {
        "fixtureId": "corrupt_cache_recovery",
        "setup": "optional_local_projection_is_malformed_or_owner_version_mismatched",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["PREPARING", "RETRYABLE_ERROR"],
        "preservationRule": "discard_optional_projection_preserve_server_confirmed_state_and_refetch",
        "focusRule": "routine_refetch_keeps_focus_error_focuses_heading_once_only_if_action_required",
        "noProgressRule": "cache_recovery_never_grants_access_or_mutates_progress",
        "accessibilityCriteria": "no_raw_cache_error_path_owner_or_version_is_exposed",
        "visualCriteria": "no_corrupt_content_flash_duplicate_panel_or_stale_progress"
      },
      {
        "fixtureId": "protected_mode_unknown_cohort",
        "setup": "cohort_is_unknown_and_all_social_economy_notification_surfaces_are_absent",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["PREPARING", "ACTIVE", "CONFIRMED"],
        "preservationRule": "learning_flow_and_confirmed_progress_remain_private_and_non_coercive",
        "focusRule": "normal_learning_order_contains_no_hidden_protected_mode_control",
        "noProgressRule": "cohort_handling_never_changes_learning_progress_or_incentives",
        "accessibilityCriteria": "no_ranking_profiling_targeted_ad_purchase_or_notification_semantics",
        "visualCriteria": "no_social_rank_streak_reward_scarcity_or_pressure_treatment"
      },
      {
        "fixtureId": "missing_optional_explanation",
        "setup": "confirmed_server_feedback_is_empty_or absent",
        "renderStateIds": [
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
        ],
        "criterionFocusStates": ["CONFIRMED"],
        "preservationRule": "confirmed_result_and_progress_remain_while_fallback_body_replaces_missing_feedback",
        "focusRule": "focus_result_heading_once_announce_fallback_and_changed_progress_once",
        "noProgressRule": "fallback_copy_never_changes_confirmed_result_or_progress",
        "accessibilityCriteria": "result_heading_fallback_body_and_Continue_or_Finish_are_complete",
        "visualCriteria": "no_blank_gap_placeholder_invented_explanation_or_layout_collapse"
      }
    ],
    "identityFields": ["stateId", "viewportId", "themeId", "localeId", "textScaleId", "fixtureId"],
    "evidenceCellIdentity": {
      "manifestFields": [
        "stateId",
        "viewportId",
        "themeId",
        "localeId",
        "textScaleId",
        "fixtureId"
      ],
      "artifactPathFields": [
        "buildSha",
        "stateId",
        "viewportId",
        "themeId",
        "localeId",
        "textScaleId",
        "fixtureId",
        "browserAtProfileId"
      ],
      "filenameFields": [
        "stateId",
        "viewportId",
        "themeId",
        "localeId",
        "textScaleId",
        "fixtureId",
        "browserId",
        "browserVersion",
        "atId",
        "atVersion",
        "artifactId"
      ]
    },
    "browserAtProfile": {
      "id": "windows_chromium_nvda",
      "os": "Windows",
      "browser": "Chromium",
      "assistiveTechnology": "NVDA",
      "versionPolicy": "os_display_ASCII_1_to_48_chars_allowlisted_no_url_host_path_query_fragment_or_ip_chromium_and_nvda_ASCII_dotted_numeric_1_to_32_chars_safeSegment_before_artifact_key_construction"
    },
    "cellCount": 10800,
    "stressFixture": {
      "promptGraphemes": 600,
      "choiceCount": 4,
      "choiceGraphemesEach": 180,
      "productLimitClaimed": false
    }
  },
  "evidence": {
    "profileId": "windows_chromium_nvda",
    "runtimeExecutions": 0,
    "cellStatus": "UNATTEMPTED",
    "cellCount": 10800,
    "artifactIds": [
      "actual.png",
      "baseline.png",
      "diff.png",
      "overflow.json",
      "contrast.json",
      "focus.json",
      "announcements.txt",
      "reduced-motion.json"
    ],
    "transitionEvidence": {
      "artifactId": "transition-evidence.json",
      "artifactClass": "sanitized_durable_run_level_evidence",
      "resolverLocatorFields": ["workflowRunId", "runAttempt", "artifactId"],
      "manifestBindingFields": [
        "transitionEvidenceLocator",
        "transitionEvidenceHash",
        "transitionEvidenceByteSize",
        "transitionEvidenceValidationDigest"
      ],
      "reviewBinding": "E1_review_record_and_provider_reviewer_attestation_bind_exact_hash_size_validation_digest_and_artifactSetDigest",
      "privacyValidation": "bounded_canonical_bytes_receive_closed_recursive_privacy_scan_before_manifest_binding;R4A_fixture_models_PASS_without_claiming_scanner_execution",
      "retention": "sanitized_content_addressed_artifact_remains_resolver_addressable_through_FINALIZED_and_is_listed_as_durable_in_cleanup_records",
      "rawCleanupTarget": false,
      "perCellArtifact": false,
      "newMatrixAxis": false,
      "recordCount": 49,
      "entryContextIds": [
        "direct_load",
        "client_transition",
        "same_screen_refresh",
        "connectivity_lost",
        "connectivity_restored"
      ],
      "presentationIdFormat": "base_state_without_variants_or_exact_STATE:variant_reference_validated_against_closed_stateVariants_ownership",
      "presentationIds": [
        "PREPARING",
        "ACTIVE",
        "SUBMITTING",
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
        "OFFLINE_READ_ONLY:offline_read_only_active"
      ],
      "fieldOrder": [
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
        "verdict"
      ],
      "deduplicationKeyFormat": "authGeneration|operationId|entryContextId|targetPresentationId",
      "deduplicationKeyRetention": "memory_only_runtime_key_never_retained_in_R4A_contract_templates_or_product_logs",
      "staleEventRule": "stale_canceled_late_or_exited_events_cause_no_focus_announcement_navigation_or_progress",
      "records": [
        {
          "schemaVersion": 1,
          "sequence": 1,
          "scenarioId": "transition_01",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "PREPARING",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 2,
          "scenarioId": "transition_02",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "ACTIVE",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 3,
          "scenarioId": "transition_03",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "SUBMITTING",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 4,
          "scenarioId": "transition_04",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "CONFIRMED:confirmed_correct_continue",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 5,
          "scenarioId": "transition_05",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "CONFIRMED:confirmed_correct_finish",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 6,
          "scenarioId": "transition_06",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "CONFIRMED:confirmed_incorrect_continue",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 7,
          "scenarioId": "transition_07",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "CONFIRMED:confirmed_incorrect_finish",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 8,
          "scenarioId": "transition_08",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "RETRYABLE_ERROR:retryable_error_prepare",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 9,
          "scenarioId": "transition_09",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "RETRYABLE_ERROR:retryable_error_submit",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 10,
          "scenarioId": "transition_10",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "STALE_CONTENT",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 11,
          "scenarioId": "transition_11",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "SESSION_ENDED",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 12,
          "scenarioId": "transition_12",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "ACCESS_BLOCKED",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 13,
          "scenarioId": "transition_13",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "EMPTY_REVIEW",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 14,
          "scenarioId": "transition_14",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "OFFLINE_READ_ONLY:offline_read_only_prepare",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 15,
          "scenarioId": "transition_15",
          "entryContextId": "direct_load",
          "sourcePresentationId": "none",
          "targetPresentationId": "OFFLINE_READ_ONLY:offline_read_only_active",
          "triggerId": "direct_load",
          "expectedFocusTargetId": "document",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 16,
          "scenarioId": "transition_16",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "PREPARING",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "Getting your activity ready. Checking the latest activity and your confirmed progress.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 17,
          "scenarioId": "transition_17",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "ACTIVE",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "native_focus",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "Choose your answer",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 18,
          "scenarioId": "transition_18",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "SUBMITTING",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "Checking your answer. Waiting for a confirmed result.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 19,
          "scenarioId": "transition_19",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "CONFIRMED:confirmed_correct_continue",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "Correct. Your result was confirmed.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 20,
          "scenarioId": "transition_20",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "CONFIRMED:confirmed_correct_finish",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "Correct. Your result was confirmed.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 21,
          "scenarioId": "transition_21",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "CONFIRMED:confirmed_incorrect_continue",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "Not quite. Your result was confirmed.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 22,
          "scenarioId": "transition_22",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "CONFIRMED:confirmed_incorrect_finish",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "Not quite. Your result was confirmed.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 23,
          "scenarioId": "transition_23",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "RETRYABLE_ERROR:retryable_error_prepare",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "assertive",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "We couldn’t load the activity. Nothing changed. Check your connection and try again.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 24,
          "scenarioId": "transition_24",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "RETRYABLE_ERROR:retryable_error_submit",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "assertive",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "We couldn’t check your answer. Your answer wasn’t confirmed. Try again to finish checking it.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 25,
          "scenarioId": "transition_25",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "STALE_CONTENT",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "assertive",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "This activity changed. Refresh to get the latest version before you continue.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 26,
          "scenarioId": "transition_26",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "SESSION_ENDED",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "assertive",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "Your session ended. Sign in again to continue safely. Your confirmed progress hasn’t changed.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 27,
          "scenarioId": "transition_27",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "ACCESS_BLOCKED",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "assertive",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "You can’t open this activity. This activity isn’t available for your account right now. Return to learning to choose something available.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 28,
          "scenarioId": "transition_28",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "EMPTY_REVIEW",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "Nothing to review right now. You can continue with your next activity.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 29,
          "scenarioId": "transition_29",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "OFFLINE_READ_ONLY:offline_read_only_prepare",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "You’re offline. Reconnect to load your activity.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 30,
          "scenarioId": "transition_30",
          "entryContextId": "client_transition",
          "sourcePresentationId": "current_presentation",
          "targetPresentationId": "OFFLINE_READ_ONLY:offline_read_only_active",
          "triggerId": "client_transition",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "You’re offline. Your answer is kept for this session. Reconnect to check it.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 31,
          "scenarioId": "transition_31",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "PREPARING",
          "targetPresentationId": "PREPARING",
          "triggerId": "delayed_preparing_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "Getting your activity ready. Checking the latest activity and your confirmed progress.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 32,
          "scenarioId": "transition_32",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "ACTIVE",
          "targetPresentationId": "ACTIVE",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 33,
          "scenarioId": "transition_33",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "SUBMITTING",
          "targetPresentationId": "SUBMITTING",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 34,
          "scenarioId": "transition_34",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "CONFIRMED:confirmed_correct_continue",
          "targetPresentationId": "CONFIRMED:confirmed_correct_continue",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 35,
          "scenarioId": "transition_35",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "CONFIRMED:confirmed_correct_finish",
          "targetPresentationId": "CONFIRMED:confirmed_correct_finish",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 36,
          "scenarioId": "transition_36",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "CONFIRMED:confirmed_incorrect_continue",
          "targetPresentationId": "CONFIRMED:confirmed_incorrect_continue",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 37,
          "scenarioId": "transition_37",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "CONFIRMED:confirmed_incorrect_finish",
          "targetPresentationId": "CONFIRMED:confirmed_incorrect_finish",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 38,
          "scenarioId": "transition_38",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "RETRYABLE_ERROR:retryable_error_prepare",
          "targetPresentationId": "RETRYABLE_ERROR:retryable_error_prepare",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 39,
          "scenarioId": "transition_39",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "RETRYABLE_ERROR:retryable_error_submit",
          "targetPresentationId": "RETRYABLE_ERROR:retryable_error_submit",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 40,
          "scenarioId": "transition_40",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "STALE_CONTENT",
          "targetPresentationId": "STALE_CONTENT",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 41,
          "scenarioId": "transition_41",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "SESSION_ENDED",
          "targetPresentationId": "SESSION_ENDED",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 42,
          "scenarioId": "transition_42",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "ACCESS_BLOCKED",
          "targetPresentationId": "ACCESS_BLOCKED",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 43,
          "scenarioId": "transition_43",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "EMPTY_REVIEW",
          "targetPresentationId": "EMPTY_REVIEW",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 44,
          "scenarioId": "transition_44",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "OFFLINE_READ_ONLY:offline_read_only_prepare",
          "targetPresentationId": "OFFLINE_READ_ONLY:offline_read_only_prepare",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 45,
          "scenarioId": "transition_45",
          "entryContextId": "same_screen_refresh",
          "sourcePresentationId": "OFFLINE_READ_ONLY:offline_read_only_active",
          "targetPresentationId": "OFFLINE_READ_ONLY:offline_read_only_active",
          "triggerId": "same_screen_refresh",
          "expectedFocusTargetId": "current_visible_focus",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 0,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "none",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 0,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 46,
          "scenarioId": "transition_46",
          "entryContextId": "connectivity_lost",
          "sourcePresentationId": "PREPARING",
          "targetPresentationId": "OFFLINE_READ_ONLY:offline_read_only_prepare",
          "triggerId": "connectivity_lost",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "You’re offline. Reconnect to load your activity.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 47,
          "scenarioId": "transition_47",
          "entryContextId": "connectivity_lost",
          "sourcePresentationId": "ACTIVE",
          "targetPresentationId": "OFFLINE_READ_ONLY:offline_read_only_active",
          "triggerId": "connectivity_lost",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "You’re offline. Your answer is kept for this session. Reconnect to check it.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 0,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 48,
          "scenarioId": "transition_48",
          "entryContextId": "connectivity_restored",
          "sourcePresentationId": "OFFLINE_READ_ONLY:offline_read_only_prepare",
          "targetPresentationId": "PREPARING",
          "triggerId": "fresh_validation_completed",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "polite",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "Getting your activity ready. Checking the latest activity and your confirmed progress.",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 1,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        },
        {
          "schemaVersion": 1,
          "sequence": 49,
          "scenarioId": "transition_49",
          "entryContextId": "connectivity_restored",
          "sourcePresentationId": "OFFLINE_READ_ONLY:offline_read_only_active",
          "targetPresentationId": "ACTIVE",
          "triggerId": "fresh_validation_completed",
          "expectedFocusTargetId": "state_heading",
          "observedFocusTargetId": null,
          "expectedFocusMoveCount": 1,
          "observedFocusMoveCount": null,
          "expectedAnnouncementMode": "native_focus",
          "observedAnnouncementMode": null,
          "expectedAnnouncementCount": 1,
          "observedAnnouncementCount": null,
          "expectedAnnouncementText": "Choose your answer",
          "observedAnnouncementText": null,
          "deduplicationKey": null,
          "recompositionCount": 1,
          "reconnectCount": 1,
          "noProgressMutation": true,
          "verdict": "SIMULATED_CONTRACT_ONLY"
        }
      ]
    },
    "keyboardProtocolFields": [
      "sequence",
      "interactionId",
      "contextId",
      "keyIds",
      "expectedOutcomeId",
      "expectedFocusId",
      "announcementDelta",
      "noProgressMutation"
    ],
    "keyboardProtocol": [
      {
        "sequence": 1,
        "interactionId": "document_tab_forward",
        "contextId": "document",
        "keyIds": ["Tab"],
        "expectedOutcomeId": "focus_next",
        "expectedFocusId": "next_expected_stop",
        "announcementDelta": 0,
        "noProgressMutation": true
      },
      {
        "sequence": 2,
        "interactionId": "document_tab_reverse",
        "contextId": "document",
        "keyIds": ["ShiftTab"],
        "expectedOutcomeId": "focus_previous",
        "expectedFocusId": "previous_expected_stop",
        "announcementDelta": 0,
        "noProgressMutation": true
      },
      {
        "sequence": 3,
        "interactionId": "radio_next",
        "contextId": "active_radio_group",
        "keyIds": ["ArrowDown", "ArrowRight"],
        "expectedOutcomeId": "select_next_radio",
        "expectedFocusId": "next_radio_in_canonical_order",
        "announcementDelta": 0,
        "noProgressMutation": true
      },
      {
        "sequence": 4,
        "interactionId": "radio_previous",
        "contextId": "active_radio_group",
        "keyIds": ["ArrowUp", "ArrowLeft"],
        "expectedOutcomeId": "select_previous_radio",
        "expectedFocusId": "previous_radio_in_canonical_order",
        "announcementDelta": 0,
        "noProgressMutation": true
      },
      {
        "sequence": 5,
        "interactionId": "radio_select",
        "contextId": "active_radio_group",
        "keyIds": ["Space"],
        "expectedOutcomeId": "select_current_radio",
        "expectedFocusId": "current_radio",
        "announcementDelta": 0,
        "noProgressMutation": true
      },
      {
        "sequence": 6,
        "interactionId": "primary_action_activate",
        "contextId": "primary_action",
        "keyIds": ["Enter", "Space"],
        "expectedOutcomeId": "activate_control",
        "expectedFocusId": "presentation_specific_focus_map",
        "announcementDelta": 1,
        "noProgressMutation": true
      },
      {
        "sequence": 7,
        "interactionId": "dialog_tab_cycle",
        "contextId": "exit_dialog",
        "keyIds": ["Tab", "ShiftTab"],
        "expectedOutcomeId": "cycle_within_dialog",
        "expectedFocusId": "exit_stay",
        "announcementDelta": 0,
        "noProgressMutation": true
      },
      {
        "sequence": 8,
        "interactionId": "dialog_escape",
        "contextId": "exit_dialog",
        "keyIds": ["Escape"],
        "expectedOutcomeId": "dismiss_as_stay",
        "expectedFocusId": "invoking_exit_control",
        "announcementDelta": 0,
        "noProgressMutation": true
      },
      {
        "sequence": 9,
        "interactionId": "skip_link_activate",
        "contextId": "skip_link",
        "keyIds": ["Enter"],
        "expectedOutcomeId": "move_to_main_heading",
        "expectedFocusId": "single_h1",
        "announcementDelta": 0,
        "noProgressMutation": true
      }
    ],
    "keyboardProtocolRules": [
      "radio_arrows_follow_canonical_answer_order_in_LTR_and_RTL",
      "Enter_and_Space_activate_only_native_control_semantics",
      "dialog_Tab_and_ShiftTab_never_escape_dialog",
      "disabled_or_busy_controls_cannot_activate",
      "keyboard_interactions_cannot_synthesize_confirmation_or_progress"
    ],
    "keyboardPresentationFocusMapFields": [
      "presentationId",
      "interactionId",
      "applicability",
      "expectedFocusTargetId",
      "expectedFocusMoveCount",
      "rationaleId"
    ],
    "keyboardPresentationFocusMap": [
      {
        "presentationId": "PREPARING",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "PREPARING",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "PREPARING",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "ACTIVE",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "ACTIVE",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "ACTIVE",
        "interactionId": "radio_next",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_radio_in_canonical_order",
        "expectedFocusMoveCount": 1,
        "rationaleId": "radio_roving_focus"
      },
      {
        "presentationId": "ACTIVE",
        "interactionId": "radio_previous",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_radio_in_canonical_order",
        "expectedFocusMoveCount": 1,
        "rationaleId": "radio_roving_focus"
      },
      {
        "presentationId": "ACTIVE",
        "interactionId": "radio_select",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "current_radio",
        "expectedFocusMoveCount": 0,
        "rationaleId": "in_place_selection"
      },
      {
        "presentationId": "ACTIVE",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "primary_action_status_position",
        "expectedFocusMoveCount": 0,
        "rationaleId": "retain_primary_action_status_position"
      },
      {
        "presentationId": "ACTIVE",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "SUBMITTING",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "SUBMITTING",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "SUBMITTING",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "CONFIRMED:confirmed_correct_continue",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "CONFIRMED:confirmed_correct_continue",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "CONFIRMED:confirmed_correct_continue",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "activated_destination_heading",
        "expectedFocusMoveCount": 1,
        "rationaleId": "activated_destination_heading"
      },
      {
        "presentationId": "CONFIRMED:confirmed_correct_continue",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "CONFIRMED:confirmed_correct_finish",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "CONFIRMED:confirmed_correct_finish",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "CONFIRMED:confirmed_correct_finish",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "activated_destination_heading",
        "expectedFocusMoveCount": 1,
        "rationaleId": "activated_destination_heading"
      },
      {
        "presentationId": "CONFIRMED:confirmed_correct_finish",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "CONFIRMED:confirmed_incorrect_continue",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "CONFIRMED:confirmed_incorrect_continue",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "CONFIRMED:confirmed_incorrect_continue",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "activated_destination_heading",
        "expectedFocusMoveCount": 1,
        "rationaleId": "activated_destination_heading"
      },
      {
        "presentationId": "CONFIRMED:confirmed_incorrect_continue",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "CONFIRMED:confirmed_incorrect_finish",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "CONFIRMED:confirmed_incorrect_finish",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "CONFIRMED:confirmed_incorrect_finish",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "activated_destination_heading",
        "expectedFocusMoveCount": 1,
        "rationaleId": "activated_destination_heading"
      },
      {
        "presentationId": "CONFIRMED:confirmed_incorrect_finish",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "RETRYABLE_ERROR:retryable_error_prepare",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "RETRYABLE_ERROR:retryable_error_prepare",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "RETRYABLE_ERROR:retryable_error_prepare",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "activated_destination_heading",
        "expectedFocusMoveCount": 1,
        "rationaleId": "activated_destination_heading"
      },
      {
        "presentationId": "RETRYABLE_ERROR:retryable_error_prepare",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "RETRYABLE_ERROR:retryable_error_submit",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "RETRYABLE_ERROR:retryable_error_submit",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "RETRYABLE_ERROR:retryable_error_submit",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "primary_action_status_position",
        "expectedFocusMoveCount": 0,
        "rationaleId": "retain_primary_action_status_position"
      },
      {
        "presentationId": "RETRYABLE_ERROR:retryable_error_submit",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "STALE_CONTENT",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "STALE_CONTENT",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "STALE_CONTENT",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "activated_destination_heading",
        "expectedFocusMoveCount": 1,
        "rationaleId": "activated_destination_heading"
      },
      {
        "presentationId": "STALE_CONTENT",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "SESSION_ENDED",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "SESSION_ENDED",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "SESSION_ENDED",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "activated_destination_heading",
        "expectedFocusMoveCount": 1,
        "rationaleId": "activated_destination_heading"
      },
      {
        "presentationId": "SESSION_ENDED",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "ACCESS_BLOCKED",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "ACCESS_BLOCKED",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "ACCESS_BLOCKED",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "activated_destination_heading",
        "expectedFocusMoveCount": 1,
        "rationaleId": "activated_destination_heading"
      },
      {
        "presentationId": "ACCESS_BLOCKED",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "EMPTY_REVIEW",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "EMPTY_REVIEW",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "EMPTY_REVIEW",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "activated_destination_heading",
        "expectedFocusMoveCount": 1,
        "rationaleId": "activated_destination_heading"
      },
      {
        "presentationId": "EMPTY_REVIEW",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "OFFLINE_READ_ONLY:offline_read_only_prepare",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "OFFLINE_READ_ONLY:offline_read_only_prepare",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "OFFLINE_READ_ONLY:offline_read_only_prepare",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "activated_destination_heading",
        "expectedFocusMoveCount": 1,
        "rationaleId": "activated_destination_heading"
      },
      {
        "presentationId": "OFFLINE_READ_ONLY:offline_read_only_prepare",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "OFFLINE_READ_ONLY:offline_read_only_active",
        "interactionId": "document_tab_forward",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "next_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "OFFLINE_READ_ONLY:offline_read_only_active",
        "interactionId": "document_tab_reverse",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "previous_expected_stop",
        "expectedFocusMoveCount": 1,
        "rationaleId": "sequential_focus_navigation"
      },
      {
        "presentationId": "OFFLINE_READ_ONLY:offline_read_only_active",
        "interactionId": "primary_action_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "activated_destination_heading",
        "expectedFocusMoveCount": 1,
        "rationaleId": "activated_destination_heading"
      },
      {
        "presentationId": "OFFLINE_READ_ONLY:offline_read_only_active",
        "interactionId": "skip_link_activate",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "single_h1",
        "expectedFocusMoveCount": 1,
        "rationaleId": "skip_link_main_heading"
      },
      {
        "presentationId": "ACTIVE",
        "interactionId": "dialog_tab_cycle",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "exit_stay",
        "expectedFocusMoveCount": 1,
        "rationaleId": "modal_focus_cycle"
      },
      {
        "presentationId": "ACTIVE",
        "interactionId": "dialog_escape",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "invoking_exit_control",
        "expectedFocusMoveCount": 1,
        "rationaleId": "modal_dismiss_focus_restore"
      },
      {
        "presentationId": "SUBMITTING",
        "interactionId": "dialog_tab_cycle",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "exit_stay",
        "expectedFocusMoveCount": 1,
        "rationaleId": "modal_focus_cycle"
      },
      {
        "presentationId": "SUBMITTING",
        "interactionId": "dialog_escape",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "invoking_exit_control",
        "expectedFocusMoveCount": 1,
        "rationaleId": "modal_dismiss_focus_restore"
      },
      {
        "presentationId": "RETRYABLE_ERROR:retryable_error_submit",
        "interactionId": "dialog_tab_cycle",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "exit_stay",
        "expectedFocusMoveCount": 1,
        "rationaleId": "modal_focus_cycle"
      },
      {
        "presentationId": "RETRYABLE_ERROR:retryable_error_submit",
        "interactionId": "dialog_escape",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "invoking_exit_control",
        "expectedFocusMoveCount": 1,
        "rationaleId": "modal_dismiss_focus_restore"
      },
      {
        "presentationId": "OFFLINE_READ_ONLY:offline_read_only_active",
        "interactionId": "dialog_tab_cycle",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "exit_stay",
        "expectedFocusMoveCount": 1,
        "rationaleId": "modal_focus_cycle"
      },
      {
        "presentationId": "OFFLINE_READ_ONLY:offline_read_only_active",
        "interactionId": "dialog_escape",
        "applicability": "APPLICABLE",
        "expectedFocusTargetId": "invoking_exit_control",
        "expectedFocusMoveCount": 1,
        "rationaleId": "modal_dismiss_focus_restore"
      }
    ],
    "keyboardPresentationFocusMapRules": [
      "one_row_for_every_applicable_presentation_interaction_pair_in_exact_keyboardApplicability_order",
      "ACTIVE_check_answer_and_RETRYABLE_ERROR_submit_try_again_retain_primary_action_status_position_with_zero_programmatic_focus_moves",
      "true_navigation_primary_actions_focus_activated_destination_heading_with_one_programmatic_focus_move",
      "in_place_and_modal_interactions_retain_their_closed_focus_targets_and_move_counts",
      "missing_extra_duplicate_reordered_or_unknown_references_fail_closed"
    ],
    "keyboardProtocolDigest": "f7debf47b92f25d22a7b56f75fdca485704f03f61babdffc7bd4b99681c9cafd",
    "keyboardApplicabilityFields": [
      "stateId",
      "variantId",
      "dialogContextId",
      "applicableInteractionIds"
    ],
    "keyboardApplicability": [
      {
        "stateId": "PREPARING",
        "variantId": null,
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "ACTIVE",
        "variantId": null,
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "radio_next",
          "radio_previous",
          "radio_select",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "SUBMITTING",
        "variantId": null,
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "CONFIRMED",
        "variantId": "confirmed_correct_continue",
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "CONFIRMED",
        "variantId": "confirmed_correct_finish",
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "CONFIRMED",
        "variantId": "confirmed_incorrect_continue",
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "CONFIRMED",
        "variantId": "confirmed_incorrect_finish",
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "RETRYABLE_ERROR",
        "variantId": "retryable_error_prepare",
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "RETRYABLE_ERROR",
        "variantId": "retryable_error_submit",
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "STALE_CONTENT",
        "variantId": null,
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "SESSION_ENDED",
        "variantId": null,
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "ACCESS_BLOCKED",
        "variantId": null,
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "EMPTY_REVIEW",
        "variantId": null,
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "OFFLINE_READ_ONLY",
        "variantId": "offline_read_only_prepare",
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "OFFLINE_READ_ONLY",
        "variantId": "offline_read_only_active",
        "dialogContextId": null,
        "applicableInteractionIds": [
          "document_tab_forward",
          "document_tab_reverse",
          "primary_action_activate",
          "skip_link_activate"
        ]
      },
      {
        "stateId": "ACTIVE",
        "variantId": null,
        "dialogContextId": "active_with_answer",
        "applicableInteractionIds": ["dialog_tab_cycle", "dialog_escape"]
      },
      {
        "stateId": "SUBMITTING",
        "variantId": null,
        "dialogContextId": "submitting_in_flight",
        "applicableInteractionIds": ["dialog_tab_cycle", "dialog_escape"]
      },
      {
        "stateId": "RETRYABLE_ERROR",
        "variantId": "retryable_error_submit",
        "dialogContextId": "retryable_submit_with_answer",
        "applicableInteractionIds": ["dialog_tab_cycle", "dialog_escape"]
      },
      {
        "stateId": "OFFLINE_READ_ONLY",
        "variantId": "offline_read_only_active",
        "dialogContextId": "offline_active_with_answer",
        "applicableInteractionIds": ["dialog_tab_cycle", "dialog_escape"]
      }
    ],
    "keyboardExecutionFields": [
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
      "verdict"
    ],
    "keyboardExclusionReasons": [
      "radio_group_not_present",
      "enabled_primary_action_not_present",
      "exit_dialog_not_open",
      "modal_background_inert"
    ],
    "nvdaProtocolFields": [
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
      "spokenText"
    ],
    "nvdaProtocolEventIds": [
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
      "exit_dialog_dismissed"
    ],
    "nvdaProtocolRules": [
      "records_are_state_fixture_specific_and_derived_from_exact_contract_copy_only",
      "only_applicable_events_are_present_and_silent_events_are_absent",
      "records_come_from_running_pinned_NVDA_profile_not_internal_transcript",
      "routine_radio_selection_uses_native_state_speech_only_without_added_live_announcement",
      "direct_load_uses_natural_order_without_fabricated_state_entry",
      "confirmed_progress_speaks_only_when_confirmed_count_changes_without_focus_move",
      "dialog_dismissal_restores_invoker_without_underlying_replay",
      "recomposition_connectivity_retries_and_reduced_motion_cannot_duplicate"
    ],
    "nvdaProtocolDigest": "aaffe627e88dcc6f549e74745e5721eca1b85b139d71c803b1d0e43e6b67ef65",
    "nvdaExpectationTemplateFields": [
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
      "count"
    ],
    "nvdaExpectationTemplates": [
      {
        "eventId": "state_entry",
        "stateId": "PREPARING",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "state_heading",
        "roleId": "heading",
        "accessibleNameTemplate": "exact_state_or_variant_heading",
        "accessibleState": "",
        "accessibleValueTemplate": "",
        "modeId": "browse",
        "politeness": "polite",
        "spokenTextTemplate": "exact_heading_period_space_exact_body",
        "count": 1
      },
      {
        "eventId": "state_entry",
        "stateId": "ACTIVE",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "state_heading",
        "roleId": "heading",
        "accessibleNameTemplate": "exact_state_or_variant_heading",
        "accessibleState": "",
        "accessibleValueTemplate": "",
        "modeId": "focus",
        "politeness": "off",
        "spokenTextTemplate": "exact_heading",
        "count": 1
      },
      {
        "eventId": "state_entry",
        "stateId": "STALE_CONTENT",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "state_heading",
        "roleId": "heading",
        "accessibleNameTemplate": "exact_state_or_variant_heading",
        "accessibleState": "",
        "accessibleValueTemplate": "",
        "modeId": "browse",
        "politeness": "assertive",
        "spokenTextTemplate": "exact_heading_period_space_exact_body",
        "count": 1
      },
      {
        "eventId": "active_radio_group",
        "stateId": "ACTIVE",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "response_group",
        "roleId": "radiogroup",
        "accessibleNameTemplate": "literal_Answers",
        "accessibleState": "required",
        "accessibleValueTemplate": "",
        "modeId": "focus",
        "politeness": "none",
        "spokenTextTemplate": "literal_Answers_required",
        "count": 1
      },
      {
        "eventId": "radio_selection",
        "stateId": "ACTIVE",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "response_group",
        "roleId": "radio",
        "accessibleNameTemplate": "exact_synthetic_selected_option",
        "accessibleState": "checked",
        "accessibleValueTemplate": "",
        "modeId": "focus",
        "politeness": "none",
        "spokenTextTemplate": "exact_synthetic_selected_option_checked",
        "count": 1
      },
      {
        "eventId": "submission_pending",
        "stateId": "SUBMITTING",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "primary_action",
        "roleId": "status",
        "accessibleNameTemplate": "exact_state_or_variant_heading",
        "accessibleState": "busy disabled",
        "accessibleValueTemplate": "",
        "modeId": "focus",
        "politeness": "polite",
        "spokenTextTemplate": "exact_heading_period_space_exact_body",
        "count": 1
      },
      {
        "eventId": "confirmation",
        "stateId": "CONFIRMED",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "feedback_status",
        "roleId": "alert",
        "accessibleNameTemplate": "exact_state_or_variant_heading",
        "accessibleState": "",
        "accessibleValueTemplate": "",
        "modeId": "browse",
        "politeness": "polite",
        "spokenTextTemplate": "exact_heading_period_space_exact_body",
        "count": 1
      },
      {
        "eventId": "retryable_error",
        "stateId": "RETRYABLE_ERROR",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "feedback_status",
        "roleId": "alert",
        "accessibleNameTemplate": "exact_state_or_variant_heading",
        "accessibleState": "",
        "accessibleValueTemplate": "",
        "modeId": "browse",
        "politeness": "assertive",
        "spokenTextTemplate": "exact_heading_period_space_exact_body",
        "count": 1
      },
      {
        "eventId": "offline",
        "stateId": "OFFLINE_READ_ONLY",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "feedback_status",
        "roleId": "status",
        "accessibleNameTemplate": "exact_state_or_variant_heading",
        "accessibleState": "",
        "accessibleValueTemplate": "",
        "modeId": "browse",
        "politeness": "polite",
        "spokenTextTemplate": "exact_heading_period_space_exact_body",
        "count": 1
      },
      {
        "eventId": "session_ended",
        "stateId": "SESSION_ENDED",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "feedback_status",
        "roleId": "alert",
        "accessibleNameTemplate": "exact_state_or_variant_heading",
        "accessibleState": "",
        "accessibleValueTemplate": "",
        "modeId": "browse",
        "politeness": "assertive",
        "spokenTextTemplate": "exact_heading_period_space_exact_body",
        "count": 1
      },
      {
        "eventId": "access_blocked",
        "stateId": "ACCESS_BLOCKED",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "feedback_status",
        "roleId": "alert",
        "accessibleNameTemplate": "exact_state_or_variant_heading",
        "accessibleState": "",
        "accessibleValueTemplate": "",
        "modeId": "browse",
        "politeness": "assertive",
        "spokenTextTemplate": "exact_heading_period_space_exact_body",
        "count": 1
      },
      {
        "eventId": "empty_review",
        "stateId": "EMPTY_REVIEW",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "feedback_status",
        "roleId": "status",
        "accessibleNameTemplate": "exact_state_or_variant_heading",
        "accessibleState": "",
        "accessibleValueTemplate": "",
        "modeId": "browse",
        "politeness": "polite",
        "spokenTextTemplate": "exact_heading_period_space_exact_body",
        "count": 1
      },
      {
        "eventId": "confirmed_progress_changed",
        "stateId": "CONFIRMED",
        "variantScope": "closed_fixture_variant",
        "fixtureScope": "all_15",
        "dialogContextId": null,
        "sourceTargetId": "named_progress",
        "roleId": "progressbar",
        "accessibleNameTemplate": "literal_Today’s_goal_progress",
        "accessibleState": "",
        "accessibleValueTemplate": "exact_confirmed_count_of_daily_target",
        "modeId": "browse",
        "politeness": "polite",
        "spokenTextTemplate": "literal_Today’s_goal_progress_period_space_exact_confirmed_count_of_daily_target",
        "count": 1
      },
      {
        "eventId": "exit_dialog_opened",
        "stateId": "closed_by_dialog_context",
        "variantScope": "closed_by_dialog_context",
        "fixtureScope": "dialog_fixture_only",
        "dialogContextId": "each_of_4_closed_contexts",
        "sourceTargetId": "exit_dialog",
        "roleId": "dialog",
        "accessibleNameTemplate": "exact_dialog_heading",
        "accessibleState": "modal",
        "accessibleValueTemplate": "",
        "modeId": "focus",
        "politeness": "none",
        "spokenTextTemplate": "exact_dialog_heading",
        "count": 1
      },
      {
        "eventId": "exit_dialog_dismissed",
        "stateId": "closed_by_dialog_context",
        "variantScope": "closed_by_dialog_context",
        "fixtureScope": "dialog_fixture_only",
        "dialogContextId": "each_of_4_closed_contexts",
        "sourceTargetId": "invoking_exit_control",
        "roleId": "button",
        "accessibleNameTemplate": "literal_Leave_activity",
        "accessibleState": "focused",
        "accessibleValueTemplate": "",
        "modeId": "focus",
        "politeness": "none",
        "spokenTextTemplate": "literal_Leave_activity",
        "count": 1
      }
    ],
    "nvdaExpectationExpansion": "expand_templates_in_protocol_event_order_over_exact_stateFixtureVariants;derive_heading_and_body_from_exact_stateVariant_or_state;derive_dialog_from_exact_exitDialogContext_and_exitDialog;resolve_confirmed_progress_and_selected_radio_from_exact_repository_owned_syntheticObservationValues;dialog_fixtures_are_ACTIVE_and_SUBMITTING_late_confirmation_after_exit_RETRYABLE_ERROR_submit_and_OFFLINE_READ_ONLY_active_network_loss_during_submit;all_other_events_silent_and_absent",
    "syntheticObservationFields": [
      "confirmedCount",
      "dailyTarget",
      "selectedOptionLabel",
      "selectedOptionPosition",
      "selectedOptionCount"
    ],
    "syntheticObservationValues": {
      "confirmedCount": 3,
      "dailyTarget": 5,
      "selectedOptionLabel": "Biblioteca",
      "selectedOptionPosition": 2,
      "selectedOptionCount": 4
    },
    "artifactTypeRegistryFields": ["typeName", "fieldOrder", "fieldTypes", "bounds"],
    "artifactEnums": {
      "regionIds": [
        "document",
        "top_bar",
        "named_progress",
        "state_heading",
        "prompt",
        "response_group",
        "feedback_status",
        "primary_action"
      ],
      "contrastSemanticPairIds": [
        "light_ink_on_paper",
        "light_ink_on_raised",
        "light_secondary_on_paper",
        "light_secondary_on_raised",
        "light_border_on_paper",
        "light_border_on_raised",
        "light_action_on_paper",
        "light_action_on_raised",
        "light_focus_on_paper",
        "light_focus_on_raised",
        "light_state_coral_on_paper",
        "light_state_coral_on_raised",
        "dark_paper_on_canvas",
        "dark_paper_on_raised",
        "dark_secondary_on_canvas",
        "dark_secondary_on_raised",
        "dark_border_on_canvas",
        "dark_structural_cobalt_on_raised",
        "dark_action_on_canvas",
        "dark_action_on_raised",
        "dark_state_coral_on_canvas",
        "dark_state_coral_on_raised",
        "dark_focus_sun_on_canvas",
        "dark_focus_sun_on_raised",
        "both_ink_on_sun",
        "both_ink_on_mint"
      ],
      "focusTargetIds": [
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
        "invoking_exit_control"
      ],
      "focusRoleIds": [
        "link",
        "button",
        "progressbar",
        "heading",
        "radiogroup",
        "radio",
        "status",
        "alert",
        "dialog",
        "textbox"
      ],
      "focusPositionKinds": ["document", "element"],
      "keyboardContextIds": [
        "document",
        "active_radio_group",
        "primary_action",
        "exit_dialog",
        "skip_link"
      ],
      "keyboardKeyIds": [
        "Tab",
        "ShiftTab",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Space",
        "Enter",
        "Escape"
      ],
      "keyboardOutcomeIds": [
        "focus_next",
        "focus_previous",
        "select_next_radio",
        "select_previous_radio",
        "select_current_radio",
        "activate_control",
        "dismiss_as_stay",
        "cycle_within_dialog",
        "move_to_main_heading"
      ],
      "keyboardFocusIds": [
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
        "single_h1"
      ],
      "keyboardFocusRationaleIds": [
        "sequential_focus_navigation",
        "radio_roving_focus",
        "in_place_selection",
        "retain_primary_action_status_position",
        "activated_destination_heading",
        "modal_focus_cycle",
        "modal_dismiss_focus_restore",
        "skip_link_main_heading"
      ],
      "keyboardApplicabilityIds": ["APPLICABLE", "EXCLUDED"],
      "keyboardExecutionVerdicts": ["PASS", "EXCLUDED"],
      "keyboardExclusionReasonIds": [
        "radio_group_not_present",
        "enabled_primary_action_not_present",
        "exit_dialog_not_open",
        "modal_background_inert"
      ],
      "nvdaModeIds": ["browse", "focus"],
      "announcementEventIds": [
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
        "exit_dialog_dismissed"
      ],
      "visibleStatusIds": [
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
      ],
      "primaryActionIds": [
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
        "leave_activity"
      ]
    },
    "artifactTypeRegistry": [
      {
        "typeName": "CssRect",
        "fieldOrder": ["x", "y", "width", "height"],
        "fieldTypes": {
          "x": "finite_safe_number_rounded_six_decimals",
          "y": "finite_safe_number_rounded_six_decimals",
          "width": "finite_safe_nonnegative_number_rounded_six_decimals",
          "height": "finite_safe_nonnegative_number_rounded_six_decimals"
        },
        "bounds": [
          "-100000<=x<=100000",
          "-100000<=y<=100000",
          "0<=width<=100000",
          "0<=height<=100000",
          "each_value_is_finite_not_negative_zero_and_equals_round(value*1000000)/1000000"
        ]
      },
      {
        "typeName": "DocumentDimensions",
        "fieldOrder": [
          "scrollWidthCssPx",
          "scrollHeightCssPx",
          "clientWidthCssPx",
          "clientHeightCssPx"
        ],
        "fieldTypes": {
          "scrollWidthCssPx": "safe_positive_integer",
          "scrollHeightCssPx": "safe_positive_integer",
          "clientWidthCssPx": "safe_positive_integer",
          "clientHeightCssPx": "safe_positive_integer"
        },
        "bounds": [
          "1<=each<=100000",
          "scrollWidthCssPx>=clientWidthCssPx",
          "scrollHeightCssPx>=clientHeightCssPx"
        ]
      },
      {
        "typeName": "RegionRecord",
        "fieldOrder": ["regionId", "rect", "visible"],
        "fieldTypes": { "regionId": "enum_regionIds", "rect": "CssRect", "visible": "boolean" },
        "bounds": ["regionId_unique", "records_sorted_by_regionIds"]
      },
      {
        "typeName": "ClippingRecord",
        "fieldOrder": ["regionId", "clipped"],
        "fieldTypes": { "regionId": "enum_regionIds", "clipped": "boolean" },
        "bounds": ["regionId_unique", "records_sorted_by_regionIds"]
      },
      {
        "typeName": "OverlapRecord",
        "fieldOrder": ["firstRegionId", "secondRegionId", "overlaps"],
        "fieldTypes": {
          "firstRegionId": "enum_regionIds",
          "secondRegionId": "enum_regionIds",
          "overlaps": "boolean"
        },
        "bounds": ["firstRegionId!=secondRegionId", "ordered_by_regionIds_pair", "pair_unique"]
      },
      {
        "typeName": "Rgba",
        "fieldOrder": ["red", "green", "blue", "alpha"],
        "fieldTypes": {
          "red": "safe_integer",
          "green": "safe_integer",
          "blue": "safe_integer",
          "alpha": "finite_number_rounded_six_decimals"
        },
        "bounds": [
          "0<=red<=255",
          "0<=green<=255",
          "0<=blue<=255",
          "0<=alpha<=1",
          "alpha_is_finite_not_negative_zero_and_equals_round(alpha*1000000)/1000000"
        ]
      },
      {
        "typeName": "ContrastPair",
        "fieldOrder": [
          "semanticPairId",
          "themeId",
          "usageClass",
          "foregroundTokenId",
          "backgroundTokenId",
          "observedForegroundRgba",
          "observedBackgroundRgba",
          "requiredRatio",
          "computedRatio",
          "passes"
        ],
        "fieldTypes": {
          "semanticPairId": "enum_contrastSemanticPairIds",
          "themeId": "enum_light_dark_or_both",
          "usageClass": "closed_semantic_usage_class",
          "foregroundTokenId": "closed_theme_token_id",
          "backgroundTokenId": "closed_theme_token_id",
          "observedForegroundRgba": "Rgba",
          "observedBackgroundRgba": "Rgba",
          "requiredRatio": "enum_3_or_4.5",
          "computedRatio": "finite_number_rounded_six_decimals",
          "passes": "boolean"
        },
        "bounds": [
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
          "records_sorted_by_catalog_semanticContrastOwnership_order"
        ]
      },
      {
        "typeName": "FocusTarget",
        "fieldOrder": ["targetId", "roleId", "accessibleName", "rect", "focusRingId"],
        "fieldTypes": {
          "targetId": "enum_focusTargetIds",
          "roleId": "enum_focusRoleIds",
          "accessibleName": "NFC_control_free_string_1_to_160",
          "rect": "CssRect",
          "focusRingId": "enum_focus_light_or_focus_dark"
        },
        "bounds": ["accessibleName_not_blank", "rect_width_and_height_positive"]
      },
      {
        "typeName": "FocusPosition",
        "fieldOrder": ["kind", "target"],
        "fieldTypes": {
          "kind": "enum_focusPositionKinds",
          "target": "FocusTarget|null"
        },
        "bounds": [
          "kind=document_requires_target=null",
          "kind=element_requires_target=valid_FocusTarget"
        ]
      },
      {
        "typeName": "FocusStop",
        "fieldOrder": ["order", "target", "visible", "named", "operable"],
        "fieldTypes": {
          "order": "safe_positive_integer",
          "target": "FocusTarget",
          "visible": "boolean",
          "named": "boolean",
          "operable": "boolean"
        },
        "bounds": [
          "order_one_based_gap_free",
          "targetId_unique",
          "visible=true",
          "named=true",
          "operable=true"
        ]
      },
      {
        "typeName": "KeyboardProtocolRecord",
        "fieldOrder": [
          "sequence",
          "interactionId",
          "contextId",
          "keyIds",
          "expectedOutcomeId",
          "expectedFocusId",
          "announcementDelta",
          "noProgressMutation"
        ],
        "fieldTypes": {
          "sequence": "safe_positive_integer",
          "interactionId": "closed_unique_interaction_id",
          "contextId": "enum_keyboardContextIds",
          "keyIds": "nonempty_unique_enum_keyboardKeyIds_array",
          "expectedOutcomeId": "enum_keyboardOutcomeIds",
          "expectedFocusId": "enum_keyboardFocusIds",
          "announcementDelta": "safe_integer_0_or_1",
          "noProgressMutation": "literal_true"
        },
        "bounds": [
          "sequence_one_based_gap_free",
          "radio_arrows_follow_canonical_answer_order_in_LTR_and_RTL",
          "Enter_and_Space_use_native_control_semantics_only",
          "dialog_Tab_and_ShiftTab_never_escape_dialog",
          "disabled_or_busy_controls_cannot_activate",
          "keyboard_interaction_cannot_synthesize_confirmation_or_progress"
        ]
      },
      {
        "typeName": "KeyboardExecutionRecord",
        "fieldOrder": [
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
          "verdict"
        ],
        "fieldTypes": {
          "sequence": "safe_positive_integer",
          "interactionId": "closed_unique_interaction_id",
          "applicability": "enum_APPLICABLE_or_EXCLUDED",
          "exclusionReason": "enum_keyboardExclusionReasonIds_or_null",
          "expectedOutcomeId": "enum_keyboardOutcomeIds",
          "expectedFocusId": "enum_keyboardFocusIds",
          "expectedFocusMoveCount": "safe_integer_0_or_1_or_null_only_when_EXCLUDED",
          "observedOutcomeId": "enum_keyboardOutcomeIds_or_null_only_when_EXCLUDED",
          "observedFocusId": "enum_keyboardFocusIds_or_null_only_when_EXCLUDED",
          "observedFocusMoveCount": "safe_integer_0_or_1_or_null_only_when_EXCLUDED",
          "observedAnnouncementDelta": "safe_integer_0_or_1_or_null_only_when_EXCLUDED",
          "noProgressMutation": "literal_true",
          "verdict": "enum_PASS_or_EXCLUDED"
        },
        "bounds": [
          "one_record_per_closed_protocol_interaction_in_sequence_order",
          "applicability_derived_from_owning_state_variant_and_dialog_context",
          "APPLICABLE_requires_PASS_and_observed_outcome_focus_focusMoveCount_announcement_equal_expected_and_the_closed_presentation_focus_map",
          "EXCLUDED_requires_exact_reason_null_observed_fields_and_EXCLUDED_verdict",
          "no_record_can_synthesize_progress"
        ]
      },
      {
        "typeName": "AnnouncementRecord",
        "fieldOrder": [
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
          "spokenText"
        ],
        "fieldTypes": {
          "sequence": "safe_positive_integer",
          "eventId": "enum_announcementEventIds",
          "modeId": "enum_nvdaModeIds",
          "sourceTargetId": "enum_focusTargetIds",
          "roleId": "enum_focusRoleIds",
          "accessibleName": "NFC_control_free_string_1_to_160",
          "accessibleState": "NFC_control_free_string_0_to_160",
          "accessibleValue": "NFC_control_free_string_0_to_160",
          "politeness": "enum_polite_assertive_or_none",
          "count": "literal_safe_integer_1",
          "spokenText": "NFC_control_free_string_1_to_240"
        },
        "bounds": [
          "sequence_one_based_gap_free",
          "eventId_unique",
          "exact_spoken_name_role_state_value_politeness_order",
          "count=1_and_duplicate_event_or_duplicate_spoken_record_rejected",
          "routine_radio_selection_uses_native_state_speech_without_added_live_announcement",
          "direct_load_uses_natural_order_without_fabricated_state_entry",
          "confirmed_progress_speaks_only_when_count_changes_without_focus_move",
          "dialog_dismissal_restores_invoker_without_underlying_replay",
          "recomposition_connectivity_retries_and_reduced_motion_cannot_duplicate",
          "spokenText_not_blank"
        ]
      },
      {
        "typeName": "StateOutcome",
        "fieldOrder": ["stateId", "variantId", "visibleStatusId", "primaryActionId"],
        "fieldTypes": {
          "stateId": "enum_visibleStatusIds",
          "variantId": "closed_variantId_for_state_or_null_only_for_non_variant_state",
          "visibleStatusId": "enum_visibleStatusIds",
          "primaryActionId": "enum_primaryActionIds"
        },
        "bounds": [
          "stateId=visibleStatusId",
          "variantId_matches_closed_state_and_fixture_assignment_when_paired_to_cell"
        ]
      },
      {
        "typeName": "MotionExecution",
        "fieldOrder": [
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
          "exclusionReason"
        ],
        "fieldTypes": {
          "motionId": "enum_press_selection_entry_confirmed_transition_progress",
          "triggerId": "closed_trigger_id_equal_normalMotion",
          "ownerId": "closed_owner_id_equal_normalMotion",
          "propertyIds": "closed_ordered_property_ids_equal_normalMotion",
          "configuredDurationMs": "safe_nonnegative_integer_equal_normalMotion",
          "observedDurationMs": "safe_nonnegative_integer",
          "easingId": "literal_cubic-bezier(0.22, 1, 0.36, 1)",
          "startedStateId": "enum_visibleStatusIds",
          "interruptedBy": "closed_interruption_id_or_null",
          "settledStateId": "enum_visibleStatusIds",
          "staleCallbackCount": "literal_0",
          "focusPosition": "FocusPosition",
          "announcementCount": "safe_integer_0_or_1",
          "applicability": "enum_APPLICABLE_or_NON_APPLICABLE",
          "exclusionReason": "closed_nonapplicable_reason_or_null"
        },
        "bounds": [
          "normal_applicable_execution_exactly_matches_catalog_duration_properties_and_easing",
          "reduced_applicable_execution_observedDurationMs=0_and_has_no_transform_or_movement",
          "nonapplicable_execution_has_closed_reason_and_no_motion",
          "interruption_settles_newest_canonical_state_with_staleCallbackCount=0",
          "interruptedBy_is_null_except_for_exact_visual.motionInterruptionFixtures_state_fixture_motion_combinations",
          "required_interruption_uses_exact_cause_newest_settlement_preserved_focus_one_semantic_announcement_and_no_queued_completion",
          "motion_never_moves_focus_and_callbacks_never_navigate_change_progress_focus_or_announce",
          "equivalent_events_coalesce_without_queue"
        ]
      },
      {
        "typeName": "StaticEquivalent",
        "fieldOrder": [
          "finalStateId",
          "primaryActionId",
          "focusPosition",
          "copyDigest",
          "progressValue",
          "announcementCount"
        ],
        "fieldTypes": {
          "finalStateId": "enum_visibleStatusIds",
          "primaryActionId": "enum_primaryActionIds",
          "focusPosition": "FocusPosition",
          "copyDigest": "lowercase_hex_64",
          "progressValue": "safe_nonnegative_integer",
          "announcementCount": "safe_nonnegative_integer"
        },
        "bounds": [
          "0<=announcementCount<=1",
          "normal_and_reduced_final_state_action_focus_copy_progress_and_announcement_are_equal"
        ]
      }
    ],
    "artifactContractFields": [
      "artifactId",
      "fileContract",
      "validationRecordContract",
      "normalization",
      "comparison"
    ],
    "artifactContracts": [
      {
        "artifactId": "actual.png",
        "fileContract": {
          "mediaType": "image/png",
          "encoding": "png_rgba8_srgb_no_metadata",
          "colorProfile": "sRGB",
          "ancillaryMetadataAllowed": false
        },
        "validationRecordContract": {
          "fieldOrder": ["pixelWidth", "pixelHeight", "sha256", "byteSize"],
          "fieldTypes": {
            "pixelWidth": "safe_positive_integer",
            "pixelHeight": "safe_positive_integer",
            "sha256": "lowercase_hex_64",
            "byteSize": "safe_positive_integer"
          },
          "derivedRules": [
            "role=actual_and_owning_cell=physical_key_cellDigest",
            "normalized_RGBA8_pixels_are_arbitrary_bounded_trusted_capture_pixels_not_a_repository_generated_expected_image",
            "trusted_capture_payload_binds_role_physicalKey_artifactHash_cellDigest_all_six_identity_fields_dimensions_zoom_deviceScale_colorProfile_tool_version_and_provenance",
            "pixelWidth=owning_capture_profile.observedWidthCssPx*deviceScaleFactor",
            "pixelHeight=owning_capture_profile.observedHeightCssPx*deviceScaleFactor",
            "sha256=SHA256_exact_file_bytes",
            "byteSize=exact_file_byte_length"
          ]
        },
        "normalization": "strip_all_ancillary_metadata_use_sRGB_color_profile_no_rescale_no_crop_difference",
        "comparison": "pixel_dimensions_and_crop_equal_baseline_and_diff"
      },
      {
        "artifactId": "baseline.png",
        "fileContract": {
          "mediaType": "image/png",
          "encoding": "png_rgba8_srgb_no_metadata",
          "colorProfile": "sRGB",
          "ancillaryMetadataAllowed": false
        },
        "validationRecordContract": {
          "fieldOrder": ["pixelWidth", "pixelHeight", "sha256", "byteSize"],
          "fieldTypes": {
            "pixelWidth": "safe_positive_integer",
            "pixelHeight": "safe_positive_integer",
            "sha256": "lowercase_hex_64",
            "byteSize": "safe_positive_integer"
          },
          "derivedRules": [
            "role=baseline_and_owning_cell=physical_key_cellDigest",
            "normalized_RGBA8_pixels_are_arbitrary_bounded_trusted_same_cell_baseline_pixels_not_a_repository_generated_expected_image",
            "trusted_capture_payload_binds_role_physicalKey_artifactHash_cellDigest_all_six_identity_fields_dimensions_zoom_deviceScale_colorProfile_tool_version_and_provenance",
            "pixelWidth=actual.pixelWidth",
            "pixelHeight=actual.pixelHeight",
            "sha256=SHA256_exact_file_bytes",
            "byteSize=exact_file_byte_length"
          ]
        },
        "normalization": "approved_comparable_baseline_strip_all_ancillary_metadata_use_sRGB_no_rescale",
        "comparison": "all_comparability_fields_match_candidate_except_buildSha_and_capturedAtUtc"
      },
      {
        "artifactId": "diff.png",
        "fileContract": {
          "mediaType": "image/png",
          "encoding": "png_rgba8_srgb_no_metadata",
          "colorProfile": "sRGB",
          "ancillaryMetadataAllowed": false
        },
        "validationRecordContract": {
          "fieldOrder": ["pixelWidth", "pixelHeight", "changedPixelCount", "sha256", "byteSize"],
          "fieldTypes": {
            "pixelWidth": "safe_positive_integer",
            "pixelHeight": "safe_positive_integer",
            "changedPixelCount": "safe_nonnegative_integer",
            "sha256": "lowercase_hex_64",
            "byteSize": "safe_positive_integer"
          },
          "derivedRules": [
            "role=diff_and_owning_cell=physical_key_cellDigest",
            "trusted_capture_payload_binds_role_physicalKey_artifactHash_cellDigest_all_six_identity_fields_dimensions_zoom_deviceScale_colorProfile_tool_version_and_provenance",
            "pixelWidth=actual.pixelWidth=baseline.pixelWidth",
            "pixelHeight=actual.pixelHeight=baseline.pixelHeight",
            "changedPixelCount=count_pixels_with_any_normalized_channel_difference",
            "each_diff_pixel_is_RGBA_255_0_255_255_when_any_actual_channel_differs_from_baseline_and_RGBA_0_0_0_0_otherwise",
            "decoded_diff_pixels_are_recomputed_from_same_cell_actual_and_baseline_and_must_match_byte_for_byte",
            "0<=changedPixelCount<=pixelWidth*pixelHeight",
            "sha256=SHA256_exact_file_bytes",
            "byteSize=exact_file_byte_length"
          ]
        },
        "normalization": "deterministic_changed_pixel_mask_derived_only_from_trusted_same_cell_normalized_actual_and_baseline_RGBA8_pixels",
        "comparison": "changed_pixels_are_reviewed_never_auto_passed_without_closed_threshold"
      },
      {
        "artifactId": "overflow.json",
        "fileContract": {
          "mediaType": "application/json",
          "encoding": "canonical_utf8_json",
          "trailingNewline": true
        },
        "validationRecordContract": {
          "fieldOrder": [
            "schemaVersion",
            "cellDigest",
            "stateId",
            "viewportId",
            "themeId",
            "localeId",
            "textScaleId",
            "fixtureId",
            "document",
            "regions",
            "clipping",
            "overlap",
            "primaryActionReachable",
            "horizontalPageOverflow",
            "verdict"
          ],
          "fieldTypes": {
            "schemaVersion": "literal_1",
            "cellDigest": "lowercase_hex_64_equal_owning_cell",
            "stateId": "enum_visibleStatusIds_equal_owning_cell",
            "viewportId": "closed_viewportId_equal_owning_cell",
            "themeId": "enum_light_or_dark_equal_owning_cell",
            "localeId": "enum_en_en-XA_or_ar-XB_equal_owning_cell",
            "textScaleId": "enum_browser_zoom_100_or_browser_zoom_200_equal_owning_cell",
            "fixtureId": "closed_fixtureId_equal_owning_cell",
            "document": "DocumentDimensions",
            "regions": "RegionRecord[]",
            "clipping": "ClippingRecord[]",
            "overlap": "OverlapRecord[]",
            "primaryActionReachable": "boolean",
            "horizontalPageOverflow": "boolean",
            "verdict": "enum_PASS_or_FAIL"
          },
          "derivedRules": [
            "all_dimensions_and_rectangles=finite_safe_nonnegative_CSS_pixels",
            "cellDigest_and_all_six_identity_fields_equal_owning_cell",
            "regions=exact_closed_reading_order_with_every_rect_within_owning_observed_viewport",
            "verdict=FAIL_if_horizontal_overflow_or_clipping_or_overlap_or_unreachable_action"
          ]
        },
        "normalization": "CSS_pixel_values_must_already_equal_canonical_six_decimal_rounding_negative_zero_is_rejected_regions_sorted_by_closed_reading_order",
        "comparison": "fail_on_horizontal_overflow_clipped_required_content_overlap_or_unreachable_action"
      },
      {
        "artifactId": "contrast.json",
        "fileContract": {
          "mediaType": "application/json",
          "encoding": "canonical_utf8_json",
          "trailingNewline": true
        },
        "validationRecordContract": {
          "fieldOrder": [
            "schemaVersion",
            "cellDigest",
            "stateId",
            "viewportId",
            "themeId",
            "localeId",
            "textScaleId",
            "fixtureId",
            "pairs",
            "verdict"
          ],
          "fieldTypes": {
            "schemaVersion": "literal_1",
            "cellDigest": "lowercase_hex_64_equal_owning_cell",
            "stateId": "enum_visibleStatusIds_equal_owning_cell",
            "viewportId": "closed_viewportId_equal_owning_cell",
            "themeId": "enum_light_or_dark_equal_owning_cell",
            "localeId": "enum_en_en-XA_or_ar-XB_equal_owning_cell",
            "textScaleId": "enum_browser_zoom_100_or_browser_zoom_200_equal_owning_cell",
            "fixtureId": "closed_fixtureId_equal_owning_cell",
            "pairs": "ContrastPair[]",
            "verdict": "enum_PASS_or_FAIL"
          },
          "derivedRules": [
            "cellDigest_and_all_six_identity_fields_equal_owning_cell",
            "pairs_equal_exact_applicable_catalog_visual.semanticContrastOwnership_records_in_closed_order_for_cell_theme_plus_both",
            "actual_scoped_token_ids_and_observed_RGBA_only_no_aliases",
            "structuralBorder_on_darkRaised_ratio_2.776880_is_forbidden_and_darkCobalt_owns_the_raised_structural_boundary",
            "lightCoral_is_state_boundary_only_and_forbidden_as_normal_text",
            "RGBA_channels=integer_0_to_255",
            "observedForegroundRgba.alpha=1_and_observedBackgroundRgba.alpha=1",
            "normalized_channel=channel_integer/255",
            "sRGB_channel_linearization=channel<=0.04045?channel/12.92:((channel+0.055)/1.055)^2.4",
            "relative_luminance=0.2126*linear_red+0.7152*linear_green+0.0722*linear_blue",
            "1<=computedRatio<=21",
            "computedRatio_is_finite_not_negative_zero_and_equals_round(computedRatio*1000000)/1000000",
            "computedRatio=round6((lighter_luminance+0.05)/(darker_luminance+0.05))",
            "passes=(computed_ratio>=requiredRatio)",
            "verdict=PASS_only_if_every_field_equals_catalog_ownership_computedRatio_recomputes_and_passes_is_true"
          ]
        },
        "normalization": "opaque_RGBA_channels_are_linearized_from_sRGB_relative_luminance_and_computedRatio_is_canonically_rounded_to_six_decimals_pairs_keep_catalog_semanticContrastOwnership_order",
        "comparison": "every_field_equals_the_applicable_catalog_ownership_record_and_computedRatio_recomputes_from_actual_scoped_token_RGBA"
      },
      {
        "artifactId": "focus.json",
        "fileContract": {
          "mediaType": "application/json",
          "encoding": "canonical_utf8_json",
          "trailingNewline": true
        },
        "validationRecordContract": {
          "fieldOrder": [
            "schemaVersion",
            "cellDigest",
            "stateId",
            "viewportId",
            "variantId",
            "themeId",
            "localeId",
            "textScaleId",
            "fixtureId",
            "stops",
            "initialFocus",
            "keyboardProtocol",
            "keyboardExecutions",
            "finalFocus",
            "verdict"
          ],
          "fieldTypes": {
            "schemaVersion": "literal_1",
            "cellDigest": "lowercase_hex_64_equal_owning_cell",
            "stateId": "enum_visibleStatusIds",
            "viewportId": "closed_viewportId_equal_owning_cell",
            "variantId": "closed_variantId_for_state_and_fixture_or_null",
            "themeId": "enum_light_or_dark",
            "localeId": "enum_en_en-XA_or_ar-XB_equal_owning_cell",
            "textScaleId": "enum_browser_zoom_100_or_browser_zoom_200_equal_owning_cell",
            "fixtureId": "closed_fixtureId_equal_owning_cell",
            "stops": "FocusStop[]",
            "initialFocus": "FocusPosition",
            "keyboardProtocol": "KeyboardProtocolRecord[]",
            "keyboardExecutions": "KeyboardExecutionRecord[]",
            "finalFocus": "FocusPosition",
            "verdict": "enum_PASS_or_FAIL"
          },
          "derivedRules": [
            "cellDigest_and_all_six_identity_fields_equal_owning_cell",
            "stop_order=one_based_gap_free_safe_integers",
            "stops_equal_exact_expected_focus_stop_and_action_set_and_are_never_empty_when_the_cell_has_actions",
            "open_dialog_stops_equal_exact_exit_stay_then_exit_leave_semantic_dialog_container_is_not_a_Tab_stop",
            "open_dialog_excludes_skip_link_top_bar_back_named_progress_state_heading_prompt_response_group_feedback_status_primary_action_and_invoking_exit_control_from_focus_and_browse_reachability",
            "open_dialog_background_is_keyboard_inert_pointer_inert_except_backdrop_and_not_accessibility_tree_traversable",
            "open_dialog_initialFocus=exit_stay_forward_and_reverse_Tab_cycle_only_exit_stay_and_exit_leave",
            "Escape_backdrop_and_Stay_close_as_Stay_preserve_context_return_focus_to_invoking_exit_control_and_announce_nothing",
            "Leave_applies_context_clear_and_late_result_fence_then_safe_navigation_without_obsolete_focus_restore",
            "open_Tab_ShiftTab_Escape_backdrop_Stay_and_Leave_never_synthesize_confirmation_or_progress",
            "names=NFC_control_free",
            "all_stops=visible_named_operable",
            "document_focus_represents_natural_no_programmatic_focus",
            "element_focus_requires_a_closed_valid_FocusTarget",
            "stateId_variantId_and_themeId_equal_owning_cell_and_closed_fixture_variant",
            "keyboardProtocol_exactly_matches_closed_nine_interaction_protocol",
            "keyboardExecutions_resolve_every_applicable_presentation_interaction_pair_through_the_closed_69_row_keyboardPresentationFocusMap_without_implicit_defaults",
            "keyboardExecutions_contains_all_nine_interactions_in_protocol_order_with_applicability_derived_from_owning_state_variant_and_dialog_context",
            "every_applicable_execution_is_PASS_with_observed_outcome_focus_and_announcement_equal_expected_and_no_progress_mutation",
            "every_excluded_execution_has_the_exact_closed_reason_null_observed_fields_EXCLUDED_verdict_and_no_progress_mutation",
            "closed_protocol_covers_Tab_ShiftTab_native_radio_arrows_Space_selection_Enter_and_Space_actions_dialog_Tab_containment_Escape_as_Stay_and_focus_return",
            "every_stop_and_element_initialFocus_and_element_finalFocus_focusRingId=focus_light_for_light_cell_or_focus_dark_for_dark_cell",
            "document_initialFocus_or_finalFocus_has_null_target_and_no_ring"
          ]
        },
        "normalization": "stops_sorted_by_order_keyboardProtocol_and_keyboardExecutions_sorted_by_sequence_names_NFC_control_free_no_raw_selectors_or_paths",
        "comparison": "exact_expected_order_and_keyboard_pointer_protocol_applicability_execution_results_and_exclusions_all_stops_visible_named_operable_dialog_contained_focus_returned_and_ring_matches_owning_theme"
      },
      {
        "artifactId": "announcements.txt",
        "fileContract": {
          "mediaType": "text/plain",
          "encoding": "utf8_LF_NFC_no_BOM",
          "finalNewline": true
        },
        "validationRecordContract": {
          "fieldOrder": [
            "schemaVersion",
            "cellDigest",
            "stateId",
            "viewportId",
            "variantId",
            "themeId",
            "localeId",
            "textScaleId",
            "fixtureId",
            "dialogContextId",
            "entryContextId",
            "nvdaVersion",
            "reviewerRole",
            "records",
            "verdict"
          ],
          "fieldTypes": {
            "schemaVersion": "literal_1",
            "cellDigest": "lowercase_hex_64_equal_owning_cell",
            "stateId": "enum_visibleStatusIds",
            "viewportId": "closed_viewportId_equal_owning_cell",
            "variantId": "closed_variantId_for_state_and_fixture_or_null",
            "themeId": "enum_light_or_dark",
            "localeId": "enum_en_en-XA_or_ar-XB_equal_owning_cell",
            "textScaleId": "enum_browser_zoom_100_or_browser_zoom_200_equal_owning_cell",
            "fixtureId": "closed_fixtureId_equal_owning_cell",
            "dialogContextId": "closed_exit_dialog_context_for_cell_or_null",
            "entryContextId": "literal_client_transition",
            "nvdaVersion": "ASCII_dotted_numeric_1_to_32_chars",
            "reviewerRole": "literal_Elana",
            "records": "AnnouncementRecord[]",
            "verdict": "enum_PASS_or_FAIL"
          },
          "derivedRules": [
            "first_line_is_exact_tab_separated_cellDigest_and_six_identity_field_envelope",
            "remaining_lines_are_one_tab_separated_record_per_line",
            "cellDigest_and_all_six_identity_fields_equal_owning_cell",
            "stateId_variantId_and_themeId_equal_owning_cell_and_closed_fixture_variant",
            "dialogContextId_equals_closed_context_for_owning_state_variant_fixture_or_null",
            "entryContextId_is_exactly_client_transition;direct_load_same_screen_refresh_connectivity_lost_and_connectivity_restored_exist_only_in_transition-evidence.json",
            "PREPARING_state_entry_matches_the_client_transition_preparing_heading_and_body;ACTIVE_state_entry_matches_the_client_transition_native_focus_heading_before_native_group_and_selection_events",
            "nvdaVersion_equals_run_manifest_nvdaVersion_and_reviewerRole=Elana",
            "sequence=one_based_gap_free",
            "each_record_contains_exact_NVDA_mode_name_role_state_value_politeness_and_spoken_text_in_order",
            "records_equal_closed_expanded_NVDA_expectations_field_for_field_in_protocol_event_order",
            "silent_or_nonapplicable_events_are_absent",
            "count=1_and_duplicate_event_or_duplicate_spoken_record_rejected",
            "recursive_forbidden_data_scan_covers_every_key_and_value_in_the_entire_artifact",
            "no_trailing_whitespace"
          ]
        },
        "normalization": "LF_only_NFC_one_version_bound_NVDA_record_per_line_no_trailing_whitespace_final_newline_required",
        "comparison": "ordered_mode_name_role_state_value_politeness_spoken_events_and_counts_equal_same_cell_state_fixture_contract_with_no_duplicates"
      },
      {
        "artifactId": "reduced-motion.json",
        "fileContract": {
          "mediaType": "application/json",
          "encoding": "canonical_utf8_json",
          "trailingNewline": true
        },
        "validationRecordContract": {
          "fieldOrder": [
            "schemaVersion",
            "cellDigest",
            "stateId",
            "viewportId",
            "themeId",
            "localeId",
            "textScaleId",
            "fixtureId",
            "normalRun",
            "reducedRun",
            "staticEquivalent",
            "focusBinding",
            "announcementBinding",
            "verdict"
          ],
          "fieldTypes": {
            "schemaVersion": "literal_1",
            "cellDigest": "lowercase_hex_64_equal_owning_cell",
            "stateId": "enum_visibleStatusIds_equal_owning_cell",
            "viewportId": "closed_viewportId_equal_owning_cell",
            "themeId": "enum_light_or_dark_equal_owning_cell",
            "localeId": "enum_en_en-XA_or_ar-XB_equal_owning_cell",
            "textScaleId": "enum_browser_zoom_100_or_browser_zoom_200_equal_owning_cell",
            "fixtureId": "closed_fixtureId_equal_owning_cell",
            "normalRun": "MotionExecution[]",
            "reducedRun": "MotionExecution[]",
            "staticEquivalent": "StaticEquivalent",
            "focusBinding": "closed_normal_and_reduced_FocusPosition_binding",
            "announcementBinding": "closed_normal_and_reduced_semantic_announcement_binding",
            "verdict": "enum_PASS_or_FAIL"
          },
          "derivedRules": [
            "cellDigest_and_all_six_identity_fields_equal_owning_cell",
            "normalRun_and_reducedRun_have_exactly_one_execution_per_catalog_normalMotion_record_in_catalog_order",
            "normal_applicable_execution_uses_exact_catalog_duration_properties_owner_trigger_and_easing",
            "nonapplicable_execution_has_closed_reason_observedDurationMs=0_and_no_motion",
            "reduced_applicable_execution_has_same_semantic_outcome_observedDurationMs=0_and_zero_transform_or_movement",
            "new_semantic_state_generation_dialog_dismissal_resize_visibility_or_reduced_motion_interrupts_old_motion_and_settles_newest_state",
            "interruptedBy_is_null_except_for_exact_visual.motionInterruptionFixtures_state_fixture_motion_combinations",
            "required_interruption_uses_exact_cause_newest_settlement_staleCallbackCount=0_preserved_focus_one_semantic_announcement_and_matching_reduced_static_outcome",
            "staleCallbackCount=0_and_stale_callbacks_cannot_navigate_change_progress_focus_or_announce",
            "equivalent_events_coalesce_without_queue",
            "normal_and_reduced_final_state_action_focus_copy_progress_and_announcement_are_equal",
            "focusBinding_positions_equal_same_cell_theme_validated_focus.json.finalFocus_and_motion_never_moves_focus",
            "announcementBinding_callbacks_are_silent_and_semantic_announcement_occurs_exactly_once"
          ]
        },
        "normalization": "normalRun_and_reducedRun_sorted_by_catalog_normalMotion_order_all_times_integer_milliseconds_closed_properties_and_reasons_only",
        "comparison": "normal_and_reduced_final_state_action_focus_copy_progress_and_announcement_equal_reduced_observedDurationMs_zero_no_transform_or_movement"
      }
    ],
    "scanEvidenceFields": [
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
      "cleanupDisposition"
    ],
    "scanEvidenceContract": {
      "structuredScannerId": "r4b_structured_artifact_v1",
      "metadataScannerId": "r4b_png_metadata_v1",
      "ocrScannerId": "r4b_local_no_network_ocr_v1",
      "ocrDenyScannerId": "r4b_ocr_deny_v1",
      "recursiveDenyScannerId": "r4b_recursive_deny_v1",
      "semanticValidatorId": "r4b_cell_artifact_semantics_v1",
      "scannerVersion": "1.0.0",
      "statusIds": ["PASS", "NOT_APPLICABLE"],
      "networkEgress": "NONE",
      "cleanupDisposition": "retained_until_deleteByUtc",
      "applicabilityRules": [
        "PNG_requires_metadata_OCR_OCR_deny_and_recursive_deny_PASS_with_structured_NOT_APPLICABLE",
        "JSON_and_TXT_require_structured_and_recursive_deny_PASS_with_metadata_OCR_and_OCR_deny_NOT_APPLICABLE",
        "every_applicable_scanner_record_has_hash_bound_input_output_result_and_closed_canary_set_digests_with_PASS_canary_status",
        "every_NOT_APPLICABLE_scanner_record_has_closed_NOT_APPLICABLE_input_output_canary_digests_and_status",
        "each_record_physicalKey_artifactId_and_artifactHash_equal_the_current_owned_artifact",
        "semantic_input_binds_physicalKey_artifactId_artifactHash_cellDigest_and_all_six_identity_fields_and_semantic_output_binds_the_validator_result",
        "every_one_of_86400_artifacts_has_exactly_one_current_record",
        "absence_staleness_hash_mismatch_wrong_scanner_wrong_applicability_failed_scan_or_missing_canary_fails_closed",
        "R4A_defines_only_the_future_R4B_proof_shape_and_does_not_claim_any_scan_execution"
      ]
    },
    "captureProfileFields": [
      "cellDigest",
      "stateId",
      "viewportId",
      "themeId",
      "localeId",
      "textScaleId",
      "fixtureId",
      "configuredWidthCssPx",
      "configuredHeightCssPx",
      "observedWidthCssPx",
      "observedHeightCssPx",
      "browserZoomPercent",
      "deviceScaleFactor",
      "colorProfile"
    ],
    "captureProfileContract": {
      "derivation": "configured_dimensions_equal_closed_viewport_axis;browserZoomPercent_equals_closed_textScale_axis;observed_dimensions_equal_configured_dimensions_times_100_divided_by_browserZoomPercent;deviceScaleFactor=1;colorProfile=sRGB",
      "identityBinding": "cellDigest_and_all_six_identity_fields_equal_the_owning_cell_mapping",
      "cardinality": "exactly_one_profile_for_each_of_10800_cellDigests_in_axis_order",
      "failureRules": [
        "missing_extra_duplicate_or_reordered_profile_fails",
        "cross_viewport_zoom_locale_theme_state_or_fixture_swap_fails",
        "configured_or_observed_dimension_drift_fails"
      ]
    },
    "trustedCapturePayloadFields": [
      "schemaVersion",
      "sourceCommit",
      "buildCommit",
      "validationHead",
      "physicalKey",
      "artifactId",
      "artifactHash",
      "cellDigest",
      "stateId",
      "viewportId",
      "themeId",
      "localeId",
      "textScaleId",
      "fixtureId",
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
      "changedPixelCount"
    ],
    "trustedCapturePayloadContract": {
      "encoding": "canonical_UTF8_JSON_with_one_LF",
      "authority": "future_R4B_base_controlled_capture_workflow_output_resolved_from_the_immutable_provider_artifact_by_EvidenceResolver_not_manifest_caller_fields",
      "binding": "role_physicalKey_artifactHash_cellDigest_all_six_identity_fields_exact_capture_profile_dimensions_zoom_deviceScale_sRGB_tool_version_capture_leg_sequence_time_and_provenance",
      "diffRule": "changedPixelCount_is_null_for_actual_and_baseline_and_equals_recomputed_same_cell_actual_vs_separately_approved_baseline_changed_pixel_count_for_diff",
      "chronology": "candidate_actual_then_diff_capture_ordinals_are_unique_strictly_increasing_and_inside_run_window;baseline_capture_uses_separate_approved_provenance",
      "fixtureBoundary": "repository_synthetic_pixel_generators_are_unit_test_fixtures_only_and_are_not_normative_or_authoritative_acceptance_rules"
    },
    "baselineProvenanceFields": [
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
      "stateId",
      "viewportId",
      "themeId",
      "localeId",
      "textScaleId",
      "fixtureId",
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
      "provenanceDigest"
    ],
    "baselineProvenanceContract": {
      "authority": "future_R4B_canonical_baseline_approval_blob_resolved_from_trusted_main_ancestor_commit_A_plus_its_immutable_provider_run_artifact",
      "binding": "the_entire_canonical_record_is_derived_from_one_ResolvedBaseline_and_binds_baselineSetId_captureSourceCommit_exact_workflow_path_blob_object_and_digest_run_id_attempt_time_tool_version_color_profile_cell_profile_identity_artifact_hash_and_size",
      "approval": "approvalReference_is_exact_git_A_colon_approved_baseline_path;approval_blob_object_digest_approver_and_time_equal_the_resolved_approval_blob;provenanceDigest_is_recomputed",
      "chronology": "resolved_baseline_capture_at_or_before_resolved_approval_at_or_before_current_run_start",
      "failure": "missing_self_derived_unapproved_stale_wrong_source_run_attempt_time_tool_version_cell_profile_artifact_approval_reference_blob_or_digest_fails_closed",
      "fixtureBoundary": "legacy_synthetic_provenance_exists_only_inside_SIMULATED_FIXTURE_ONLY_validation_and_cannot_authorize_PRE_CLEANUP_or_FINALIZED"
    },
    "scannerResultPayloadFields": [
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
      "networkEgress"
    ],
    "scannerResultPayloadContract": {
      "encoding": "canonical_UTF8_JSON_with_one_LF",
      "authority": "future_R4B_base_controlled_scanner_output_bytes_resolved_from_immutable_workflow_artifacts_by_EvidenceResolver",
      "applicableScannerPayloads": "structured_for_JSON_TXT;metadata_OCR_OCR_deny_for_PNG;recursive_deny_for_every_artifact",
      "validation": "exact_current_source_build_head_base_controlled_workflow_path_digest_run_attempt_execution_time_scanner_id_version_key_role_hash_capture_input_digest_closed_ordered_canary_vector_empty_bounded_findings_PASS_status_and_NONE_network_egress",
      "digestBinding": "input_output_canary_and_COMPLETE_ordered_scanner_evidence_digests_are_recomputed_from_trusted_payload_bytes_and_bound_into_artifactContentDigest"
    },
    "artifactValidationResultFields": [
      "schemaVersion",
      "ordinal",
      "physicalKey",
      "artifactHash",
      "scannerEvidenceDigest",
      "semanticOutputDigest",
      "validationHead",
      "status",
      "resultDigest"
    ],
    "artifactValidationResultContract": {
      "authority": "future_R4B_immutable_complete_results_JSONL_artifact_stream_resolved_by_EvidenceResolver_without_a_caller_callback",
      "completeness": "exactly_86400_results_in_canonical_physical_key_order_with_gap_free_ordinals_and_digest_bound_to_manifest",
      "representativeRawBytes": "closed_axis_cover_supplies_real_PNG_JSON_TXT_capture_scanner_baseline_bytes_to_the_same_semantic_validators",
      "failure": "missing_extra_reordered_stale_wrong_head_hash_scanner_semantic_or_result_digest_fails_closed"
    },
    "artifactEnvelopeFields": [
      "cellDigest",
      "stateId",
      "viewportId",
      "themeId",
      "localeId",
      "textScaleId",
      "fixtureId"
    ],
    "artifactResourceBudgets": {
      "pngMaximumBytes": 2097152,
      "pngMaximumCompressedIdatBytes": 1048576,
      "pngMaximumDecodedBytes": 5242880,
      "jsonMaximumBytes": 65536,
      "textMaximumBytes": 32768,
      "aggregateMaximumBytes": 536870912,
      "rules": [
        "dimensions_must_equal_owning_capture_profile_before_inflate",
        "width_height_row_size_area_and_aggregate_arithmetic_must_be_safe_integer_operations",
        "inflate_output_is_bounded_to_exact_expected_decoded_length",
        "oversized_IDAT_decompression_bomb_or_aggregate_ceiling_failure_fails_closed"
      ]
    },
    "reviewerCompletionFields": [
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
      "verdict"
    ],
    "cleanupEvidenceFields": [
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
      "evidenceArtifactDigest"
    ],
    "authoritativeEvidenceTopology": {
      "repository": "r1ruffrider/Fluyo",
      "commitOrder": "baseline_approval_A_is_trusted_main_ancestor_of_source_S;capture_run_R_executes_exact_S_and_fixed_workflow_blob;evidence_E1_is_direct_child_of_S_with_only_Elana_review_json;evidence_E2_is_direct_child_of_E1_with_only_cleanup_json",
      "sourceInvalidation": "any_byte_change_after_S_requires_a_new_capture_run_and_new_E1_E2_chain;post_squash_main_requires_a_new_chain_at_merged_main",
      "trustBoundary": "manifest_contains_closed_locators_only;repository_host_credentials_bytes_callbacks_expected_values_and_trust_status_are_resolver_owned_and_cannot_be_caller_supplied"
    },
    "evidenceResolverContract": {
      "owner": "future_R4B_base_controlled_runner_only",
      "methods": [
        "resolveCommit",
        "isAncestor",
        "resolveGitBlob",
        "resolveWorkflowRun",
        "resolveWorkflowArtifact",
        "resolveReviewerAttestation",
        "resolveArtifactAbsence"
      ],
      "fixedWorkflowPath": ".github/workflows/r4b-conversation-canvas.yml",
      "requirements": "Git_blobs_are_object_id_and_sha256_bound;workflow_runs_are_provider_issued_positive_run_id_attempt_exact_head_workflow_blob_event_times_success_and_runner_bound;artifacts_are_immutable_metadata_plus_byte_stream;repeated_resolution_must_be_stable;raw_maps_or_objects_cannot_substitute"
    },
    "evidenceLocatorFields": [
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
      "cleanupArtifactId"
    ],
    "completeResultsAuthority": {
      "artifactId": "complete-results.jsonl",
      "encoding": "canonical_UTF8_JSONL_header_plus_exactly_86400_gap_free_ordered_results_plus_footer",
      "resultBinding": "ordinal_physical_key_cell_role_hash_size_capture_digest_scanner_set_digest_semantic_digest_S_run_attempt_time_PASS_and_result_digest",
      "validation": "stream_once_with_bounded_UTF8_lines_and_total_bytes;after_each_chunk_consume_every_complete_newline_record_before_enforcing_the_limit_only_on_the_residual_unterminated_line;behavior_is_invariant_for_one_byte_normal_64KiB_multiline_and_arbitrary_splits;reject_malformed_noncanonical_oversized_line_extra_missing_gap_reorder_duplicate_stale_trailing_or_digest_mismatch;no_result_callback_and_no_whole_artifact_buffer",
      "retention": "sanitized_content_addressed_durable_evidence_must_remain_provider_resolvable_through_FINALIZED_and_is_never_a_raw_cleanup_target"
    },
    "transitionEvidenceAuthority": {
      "artifactId": "transition-evidence.json",
      "artifactClass": "sanitized_durable_run_level_evidence",
      "locator": "immutable_EvidenceResolver_workflow_artifact_locator_bound_to_exact_capture_run_id_attempt_and_artifact_id",
      "manifestBinding": "transitionEvidenceLocator_hash_byteSize_and_validationDigest_are_recomputed_from_resolved_canonical_bytes_and_included_in_artifactContentDigest_without_changing_the_86400_per_cell_count",
      "validation": "exact_49_ordered_contract_template_records_closed_fields_values_and_null_observed_fields;bounded_canonical_UTF8_parse;closed_recursive_privacy_scan;status_SIMULATED_CONTRACT_ONLY_in_R4A",
      "review": "E1_review_record_and_independently_resolved_provider_reviewer_attestation_bind_exact_hash_size_validationDigest_and_artifactSetDigest",
      "retention": "cleanup_record_lists_transition-evidence.json_and_complete-results.jsonl_as_the_two_durable_artifacts;both_remain_resolver_addressable_through_FINALIZED",
      "rawCleanupTarget": false
    },
    "representativeBundleAuthority": {
      "artifactId": "representative-evidence.json",
      "coverage": "bounded_closed_axis_cover_for_every_viewport_zoom_locale_theme_state_variant_fixture_and_all_eight_roles",
      "validation": "metadata_positive_size_and_closed_max_are_checked_before_streaming;stream_hash_size_and_cumulative_bounds_are_verified_before_parse;real_PNG_JSON_TXT_capture_baseline_and_scanner_bytes_use_the_same_semantic_resource_privacy_validators;each_baseline_PNG_reconciles_to_the_content_addressed_approved_baseline_inventory;each_entry_reconciles_to_its_exhaustive_complete_results_line"
    },
    "rawArtifactInventoryAuthority": {
      "encoding": "canonical_content_addressed_JSON_object_bound_by_fluyo_r4b_raw_artifact_inventory_v2_digest",
      "targetFields": [
        "artifactId",
        "artifactDigest",
        "artifactByteSize",
        "memberInventoryDigest",
        "logicalMemberCount"
      ],
      "targetArtifactIds": [
        "raw-png-capture-bundle.jsonl",
        "raw-structured-artifact-bundle.jsonl",
        "representative-evidence.json"
      ],
      "logicalMemberCounts": [32400, 54000, 0],
      "aggregateLogicalMemberCount": 86400,
      "rawBundleEncoding": "each_primary_raw_bundle_is_an_immutable_content_bearing_provider_JSONL_artifact_with_bounded_canonical_UTF8_header_exact_ordered_member_records_and_footer;every_member_binds_ordinal_physicalKey_cellDigest_artifactId_hash_byteSize_strict_canonical_base64_raw_payload_bytes_bundle_target_ID_member_inventory_digest_source_S_run_R_and_attempt",
      "preCleanupAuthority": "capture_run_R_emits_and_EvidenceResolver_resolves_both_primary_content_bearing_raw_bundles_and_the_separate_representative_raw_bundle_before_E1;PRE_CLEANUP_enforces_positive_metadata_per_member_aggregate_and_artifact_byte_ceilings_cumulative_stream_hash_and_size_then_incrementally_decodes_each_payload_recomputes_its_byteSize_and_SHA256_and_reconciles_every_primary_member_to_the_corresponding_complete_results_row_and_closed_PNG_or_structured_role_partition_with_exact_32400_plus_54000_coverage_no_gap_duplicate_or_extra;representative_member_bytes_equal_the_independently_deep_validated_representative_bytes_and_nonrepresentative_simulated_fixture_bytes_are_deterministic_actual_bytes_that_author_complete_results_hashes_and_sizes",
      "streaming": "the_shared_complete_results_and_raw_bundle_JSONL_parser_drains_all_complete_newline_records_after_each_appended_chunk_then_bounds_only_the_residual_unterminated_line_while_retaining_cumulative_byte_limits;one_byte_normal_64KiB_multiline_and_arbitrary_split_streams_are_invariant_and_no_whole_artifact_buffer_is_allowed",
      "construction": "RawArtifactInventory_is_constructed_only_from_the_three_PRE_CLEANUP_resolved_artifacts_and_the_two_validated_member_inventory_digests;its_digest_is_included_in_artifactSetDigest_and_bound_unchanged_into_the_E1_review_record_and_provider_reviewer_attestation",
      "binding": "E2_cleanup_record_and_provider_absence_receipt_must_repeat_the_exact_E1_reviewed_inventory_and_bind_inventory_digest_target_count_logical_member_count_exact_ordered_target_IDs_and_artifact_digests;representative_target_artifact_digest_equals_the_reviewed_representative_bundle_hash",
      "retention": "only_the_three_raw_provider_targets_are_deleted_after_E1;representative_logical_member_count_zero_marks_a_duplicate_raw_proof_sample_and_does_not_inflate_the_exact_86400_primary_members;sanitized_complete_results_remains_resolvable",
      "failure": "never_existed_omitted_extra_reordered_resolvable_payload_missing_payload_changed_invalid_base64_payload_hash_or_size_mismatch_duplicate_truncated_oversized_member_or_line_partition_mismatch_post_review_substitution_E1_E2_inventory_or_digest_mismatch_wrong_target_count_or_logical_member_count_fails_closed"
    },
    "reviewCleanupChainAuthority": {
      "review": "E1_direct_child_of_S_changes_only_evidence/r4b/<runId>/review.json;record_binds_the_PRE_CLEANUP_resolved_transition_evidence_hash_size_validationDigest_RawArtifactInventory_and_digest_inside_artifactSetDigest_plus_the_provider_attestation_locator_and_digest;EvidenceResolver_independently_resolves_an_immutable_GitHub_protected_environment_attestation_for_exact_Elana_subject_role_source_run_transition_evidence_raw_inventory_artifact_set_PASS_and_completion_time;Git_author_or_display_name_JSON_alone_has_no_authority",
      "cleanup": "E2_direct_child_of_E1_changes_only_evidence/r4b/<runId>/cleanup.json;record_references_resolved_E1_blob_separate_cleanup_run_artifact_the_exact_unchanged_E1_reviewed_content_addressed_RawArtifactInventory_and_provider_absence_attestation;deleted_logical_member_count_86400_zero_raw_retained_DELETED_NOT_REQUIRED_null_failure_after_review;cleanup_record_lists_complete-results.jsonl_and_transition-evidence.json_as_exact_durable_artifacts;FINALIZED_rejects_if_either_durable_artifact_is_missing_or_any_closed_raw_target_remains_resolvable",
      "twoStage": "PRE_CLEANUP_resolves_streams_and_reconciles_sanitized_complete_results_transition_evidence_representative_evidence_and_both_raw_primary_bundles_then_constructs_the_review_inventory;after_E1_the_cleanup_provider_deletes_only_those_reviewed_raw_targets;FINALIZED_requires_sanitized_complete_results_transition_evidence_review_and_cleanup_records_to_remain_resolvable_while_resolving_the_E1_reviewer_attestation_cleanup_run_artifact_E2_and_provider_absence_receipt_for_the_exact_reviewed_raw_inventory"
    },
    "r4aSimulationBoundary": {
      "verdict": "SIMULATED_CONTRACT_PASS",
      "fixture": "R4A_uses_a_real_temporary_Git_P_A_S_E1_E2_graph_and_a_sealed_test_only_fake_resolver_seeded_before_seal",
      "claim": "future_actual_resolver_workflow_baseline_capture_scan_review_and_cleanup_remain_R4B_prerequisites;runtime_browser_AT_scanner_reviewer_cleanup_execution_counts_are_zero;all_10800_cells_and_86400_artifacts_remain_UNATTEMPTED"
    },
    "futureProofRules": [
      "reviewerCompletion_requires_E1_plus_an_independently_resolved_provider_issued_immutable_attestation_bound_to_exact_Elana_subject_role_source_run_artifact_set_PASS_verdict_and_canonical_completion_time;generic_Git_author_display_name_or_caller_JSON_cannot_authorize_PASS",
      "transition_evidence_is_a_separate_sanitized_durable_run_level_artifact_resolved_immutably_from_capture_run_R;its_hash_size_and_validation_digest_are_bound_into_the_manifest_artifactContentDigest_E1_review_and_provider_reviewer_attestation_and_it_remains_resolvable_through_FINALIZED_without_entering_the_raw_cleanup_inventory",
      "cleanupEvidence_requires_E2_plus_the_separate_cleanup_provider_run_artifact_and_an_independently_resolved_provider_absence_receipt_bound_to_the_closed_content_addressed_raw_target_inventory;every_raw_target_must_be_absent_and_nonresolvable_while_sanitized_complete_results_review_and_cleanup_records_remain_resolvable",
      "raw_bundle_authority_requires_provider_resolved_immutable_content_bearing_PNG_and_structured_JSONL_bundles_to_exist_before_E1_and_stream_decode_rehash_resize_and_reconcile_exactly_32400_plus_54000_raw_payloads_to_complete_results_deep_validated_representatives_and_the_closed_role_partition;the_resolved_inventory_digest_is_bound_into_artifactSetDigest_E1_attestation_E2_and_provider_absence_without_substitution",
      "approved_baseline_artifact_is_a_bounded_canonical_content_addressed_inventory_of_all_10800_baseline_cells_profiles_physical_keys_hashes_sizes_and_capture_provenance;its_own_capture_workflow_blob_is_resolved_at_captureSourceCommit_and_every_representative_baseline_provenance_field_is_derived_from_and_reconciled_to_the_single_ResolvedBaseline",
      "reviewer_and_cleanup_payload_hashes_are_recomputed_from_trusted_bytes_and_bound_with_artifactContentDigest_into_artifactSetDigest_without_self_reference",
      "missing_stale_fabricated_PASS_canary_omission_reviewer_missing_or_cleanup_failure_fails_closed",
      "R4A_defines_and_tests_only_the_future_R4B_proof_shape_and_claims_zero_runtime_browser_AT_scan_review_or_cleanup_execution"
    ],
    "boundedSemanticFixtureContract": {
      "purpose": "R4A_unit_tests_use_a_closed_representative_set_without_materializing_or_inflating_all_future_R4B_payloads",
      "coverage": "deterministic_greedy_axis_cover_in_closed_cell_order_covers_every_viewport_zoom_locale_theme_state_variant_and_fixture_and_validates_all_eight_artifact_roles_for_each_selected_cell",
      "authoritativeR4BRule": "the_immutable_complete_results_JSONL_artifact_requires_one_hash_bound_semantic_and_scanner_PASS_result_for_every_ordered_physical_artifact_key_and_its_ordered_digest_is_included_in_the_resolved_artifact_set_digest",
      "failureRules": [
        "missing_extra_duplicate_reordered_or_non_PASS_semantic_result_fails",
        "semantic_result_from_another_cell_axis_artifact_role_hash_or_validator_version_fails",
        "R4A_representative_fixture_success_is_not_runtime_browser_AT_scan_review_or_cleanup_evidence"
      ]
    },
    "artifactPairCount": 86400,
    "cellMappingFields": [
      "ordinal",
      "stateId",
      "viewportId",
      "themeId",
      "localeId",
      "textScaleId",
      "fixtureId",
      "cellDigest"
    ],
    "cellDigestAlgorithm": "lowercase_sha256_of_UTF8_fluyo:r4a:cell:v1_LF_plus_JSON_stringified_six_identity_value_array",
    "physicalArtifactKeyPattern": "cells/<lowercase-cell-digest-64>/<closed-artifact-id>",
    "runManifestFilename": "manifest.json",
    "manifestIsPerCellArtifact": false,
    "runManifest": {
      "fieldOrder": [
        "schemaVersion",
        "sourceCommit",
        "buildCommit",
        "specDigest",
        "specByteSize",
        "uxContractDigest",
        "fixtureDigest",
        "fixtureBundleByteSize",
        "fontDigest",
        "fontBundleByteSize",
        "keyboardProtocolDigest",
        "nvdaProtocolDigest",
        "browserAtProfileId",
        "osVersion",
        "chromiumVersion",
        "nvdaVersion",
        "capturedAtUtc",
        "cells",
        "cellMappings",
        "captureProfiles",
        "artifactHashes",
        "artifactByteSizes",
        "aggregateArtifactBytes",
        "transitionEvidenceLocator",
        "transitionEvidenceHash",
        "transitionEvidenceByteSize",
        "transitionEvidenceValidationDigest",
        "artifactValidationDigest",
        "artifactContentDigest",
        "reviewerEvidenceHash",
        "cleanupEvidenceHash",
        "artifactSetDigest",
        "artifactScanEvidence",
        "reviewerCompletion",
        "cleanupEvidence",
        "scanStatus",
        "reviewerRole",
        "verdict",
        "deleteByUtc"
      ],
      "fieldTypes": {
        "schemaVersion": "literal_safe_integer_1",
        "sourceCommit": "lowercase_hex_40",
        "buildCommit": "lowercase_hex_40",
        "specDigest": "lowercase_hex_64",
        "specByteSize": "safe_positive_integer_recomputed_from_trusted_spec_bytes",
        "uxContractDigest": "lowercase_hex_64_equal_closed_ux_contract_digest",
        "fixtureDigest": "lowercase_hex_64",
        "fixtureBundleByteSize": "safe_positive_integer_recomputed_from_trusted_fixture_bytes",
        "fontDigest": "lowercase_hex_64",
        "fontBundleByteSize": "safe_positive_integer_recomputed_from_trusted_font_bytes",
        "keyboardProtocolDigest": "lowercase_hex_64_equal_closed_keyboard_protocol_and_presentation_focus_map_digest",
        "nvdaProtocolDigest": "lowercase_hex_64_equal_closed_NVDA_protocol_contract_digest",
        "browserAtProfileId": "literal_windows_chromium_nvda",
        "osVersion": "ASCII_allowlisted_display_1_to_48_chars_no_url_host_drive_UNC_slash_backslash_query_fragment_or_IP",
        "chromiumVersion": "ASCII_dotted_numeric_1_to_32_chars_safeSegment_before_artifact_key_construction",
        "nvdaVersion": "ASCII_dotted_numeric_1_to_32_chars_safeSegment_before_artifact_key_construction",
        "capturedAtUtc": "canonical_UTC_seconds_YYYY_MM_DDTHH_mm_ssZ",
        "cells": "array_exactly_10800_closed_identity_records_in_axis_order",
        "cellMappings": "array_exactly_10800_one_based_ordinal_six_identity_and_lowercase_cellDigest_records_in_axis_order",
        "captureProfiles": "closed_map_exactly_10800_cellDigest_keys_to_derived_capture_profile_records",
        "artifactHashes": "closed_map_exactly_86400_cells_cellDigest_artifactId_physical_keys_to_lowercase_hex_64",
        "artifactByteSizes": "closed_map_same_keys_to_safe_positive_integers",
        "aggregateArtifactBytes": "safe_positive_integer_equal_exact_sum_of_artifactByteSizes_and_within_closed_ceiling",
        "transitionEvidenceLocator": "closed_object_workflowRunId_positive_decimal_runAttempt_positive_integer_artifactId_literal_transition-evidence.json_or_null_only_when_not_PASS",
        "transitionEvidenceHash": "lowercase_hex_64_recomputed_from_immutable_resolved_transition_evidence_bytes_or_null_only_when_not_PASS",
        "transitionEvidenceByteSize": "safe_positive_integer_recomputed_from_resolved_bytes_within_256KiB_or_null_only_when_not_PASS",
        "transitionEvidenceValidationDigest": "lowercase_hex_64_recomputed_from_exact_sanitized_run_level_template_payload_or_null_only_when_not_PASS",
        "artifactValidationDigest": "lowercase_hex_64_recomputed_over_exact_86400_ordered_streamed_validation_results",
        "artifactContentDigest": "lowercase_hex_64_recomputed_over_ordered_physicalKey_hash_size_COMPLETE_scanner_output_semantic_result_artifactValidationDigest_and_transitionEvidence_hash_size_validationDigest_records",
        "reviewerEvidenceHash": "lowercase_hex_64_recomputed_from_trusted_canonical_reviewer_payload_bytes_or_null_only_when_UNATTEMPTED",
        "cleanupEvidenceHash": "lowercase_hex_64_recomputed_from_trusted_canonical_cleanup_payload_bytes_or_null_only_when_UNATTEMPTED",
        "artifactSetDigest": "lowercase_hex_64_recomputed_from_artifactContentDigest_reviewerEvidenceHash_and_cleanupEvidenceHash",
        "artifactScanEvidence": "closed_map_same_keys_to_closed_hash_bound_per_artifact_scan_and_semantic_evidence_records",
        "reviewerCompletion": "closed_trusted_workflow_source_build_head_artifact_content_count_identity_role_revision_time_verdict_record_or_null_only_when_UNATTEMPTED",
        "cleanupEvidence": "closed_trusted_workflow_source_build_head_artifact_content_counts_time_outcome_retry_failure_revision_record_or_null_only_when_UNATTEMPTED",
        "scanStatus": "enum_NOT_RUN_PASS_or_FAIL",
        "reviewerRole": "enum_Camila_Daniela_Natalia_Renata_Elana",
        "verdict": "enum_UNATTEMPTED_PASS_or_FAIL",
        "deleteByUtc": "canonical_UTC_seconds_YYYY_MM_DDTHH_mm_ssZ"
      },
      "forbiddenFields": [
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
        "learningContent"
      ],
      "statusRules": [
        "each_manifest_cell_reconstructs_exactly_one_variantId_from_the_closed_150_row_stateId_fixtureId_table_in_axis_order_without_adding_a_matrix_axis",
        "PASS_requires_a_closed_transitionEvidenceLocator_plus_resolver_recomputed_hash_positive_bounded_byteSize_and_validationDigest_bound_into_artifactContentDigest;FAIL_and_UNATTEMPTED_require_all_four_fields_null",
        "authoritative_FINALIZED_PASS_can_only_be_returned_by_EvidenceResolver_over_the_immutable_complete_results_representative_bundle_approved_baseline_inventory_and_A_S_R_E1_E2_chain_with_provider_reviewer_attestation_and_provider_absence_receipt",
        "legacy_manifest_callback_caller_trusted_bytes_and_hardcoded_fixture_run_identity_routes_are_SIMULATED_FIXTURE_ONLY_and_can_never_authorize_or_finalize_PASS",
        "FAIL_requires_scanStatus_FAIL_cells_exact_closedCellRecords_and_zero_retained_artifacts",
        "UNATTEMPTED_requires_scanStatus_NOT_RUN_cells_exact_closedCellRecords_and_zero_retained_artifacts",
        "contradictory_status_scan_or_artifact_tuple_is_invalid",
        "authoritative_validation_accepts_closed_locators_only_and_resolves_repository_commits_blobs_workflow_runs_immutable_artifacts_reviewer_attestation_and_artifact_absence_from_the_fixed_base_controlled_resolver;no_result_callback_or_caller_bytes_expected_values_repository_host_credentials_or_trust_status_are_accepted",
        "fixture_and_font_bundle_digests_use_domain_prefixed_sorted_path_NUL_length_NUL_bytes_preimages",
        "missing_extra_swapped_stale_secret_bearing_over_budget_or_semantically_invalid_artifact_bytes_fail_closed",
        "scan_evidence_is_future_R4B_structured_proof_not_an_R4A_runtime_scan_claim"
      ],
      "retentionRules": [
        "complete-results.jsonl_and_transition-evidence.json_are_sanitized_durable_run_level_artifacts_and_remain_resolver_addressable_through_FINALIZED",
        "transition-evidence.json_is_not_a_per-cell_artifact_not_a_matrix_axis_and_never_a_raw_cleanup_target",
        "capturedAtUtc_strictly_before_deleteByUtc",
        "candidate_capture_strictly_after_or_equal_run_start_then_scanner_execution_then_Elana_review_then_cleanup_before_deleteByUtc",
        "baseline_capture_at_or_before_baseline_approval_at_or_before_current_run_start",
        "initial_deleteByUtc_at_or_before_capturedAtUtc_plus_30_calendar_days",
        "later_verdict_PR_closure_or_superseding_capture_may_only_shorten_deleteByUtc_to_at_or_before_eventAtUtc_plus_24_hours",
        "later_event_must_never_lengthen_deleteByUtc"
      ]
    },
    "pathPolicy": {
      "logicalIdentityOnly": true,
      "artifactPathFields": [
        "buildSha",
        "stateId",
        "viewportId",
        "themeId",
        "localeId",
        "textScaleId",
        "fixtureId",
        "browserAtProfileId"
      ],
      "filenameFields": [
        "stateId",
        "viewportId",
        "themeId",
        "localeId",
        "textScaleId",
        "fixtureId",
        "browserId",
        "browserVersion",
        "atId",
        "atVersion",
        "artifactId"
      ],
      "physicalKeyFields": ["literal_cells", "cellDigest", "artifactId"],
      "cellMappingFields": [
        "ordinal",
        "stateId",
        "viewportId",
        "themeId",
        "localeId",
        "textScaleId",
        "fixtureId",
        "cellDigest"
      ],
      "digestPrefixUtf8Hex": "666c75796f3a7234613a63656c6c3a76310a",
      "segmentMaxAsciiChars": 64,
      "filenameMaxAsciiChars": 32,
      "relativeKeyMaxAsciiChars": 96,
      "maximumGeneratedRelativeKeyAsciiChars": 90,
      "rootMaxUtf16CodeUnits": 128,
      "fullPathMaxUtf16CodeUnits": 240,
      "rootContract": "fresh_local_empty_exclusive_non_UNC_non_device_non_reparse_directory_created_for_single_run",
      "rootRetention": "root_value_never_retained_logged_emitted_or_included_in_manifest",
      "constructionRule": "exact_digest_key_only_no_fallback_truncate_suffix_sanitize_reuse_or_version_component",
      "r4bPhysicalProof": "Windows_create_read_hash_recursive_scan_delete_with_injected_cleanup_failure_and_retry_proof_required_in_R4B_only",
      "forbiddenFamilies": [
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
        "case_fold_or_sanitization_collision"
      ]
    },
    "networkPolicy": {
      "allowedListener": "explicit_127.0.0.1_ephemeral_fixture_listener_only",
      "maximumExternalRequests": 0,
      "zeroEgressVectors": [
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
        "crash_reporting"
      ]
    },
    "originPolicy": {
      "allowed": ["committed_original_synthetic_fixture", "in_memory_synthetic_session"],
      "realAccountsAllowed": false,
      "realSessionsAllowed": false,
      "productionDataAllowed": false
    },
    "forbiddenRetainedFamilies": [
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
      "account_derived_data"
    ],
    "scanOrder": [
      "structured_recursive_scan",
      "png_metadata_scan",
      "local_no_network_ocr",
      "ocr_forbidden_scan",
      "named_reviewer_manual_review"
    ],
    "accessPolicy": "named_reviewer_roles_only_no_public_or_shared_link_no_external_ocr_or_storage",
    "retention": {
      "maximumCalendarDaysFromCapture": 30,
      "deleteWithinHoursAfterVerdictPrClosureOrSupersedingCapture": 24,
      "failedCellDeletion": "immediate"
    },
    "failureDisposition": "UNATTEMPTED_retain_nothing_delete_all_transient_copies",
    "deletionEvidenceFields": [
      "sourceCommit",
      "buildCommit",
      "deletedAtUtc",
      "outcome",
      "aggregateCount"
    ]
  },
  "contrast": {
    "ownershipSource": "visual.semanticContrastOwnership",
    "expandedPairCount": 26,
    "normalTextMinRatio": 4.5,
    "largeTextMinRatio": 3,
    "largeTextRegularMinCssPx": 24,
    "largeTextBoldMinCssPx": 18.66,
    "meaningfulNonTextMinRatio": 3,
    "focusBoundaryMinRatio": 3,
    "forbiddenUses": ["structuralBorder_on_darkRaised_ratio_2.776880", "lightCoral_as_normal_text"],
    "anchors": [
      { "id": "ink_paper", "ratio": 16.801416 },
      { "id": "secondary_ink_paper", "ratio": 7.885465 },
      { "id": "cobalt_paper", "ratio": 8.614277 },
      { "id": "scoped_coral_paper", "ratio": 4.301832 },
      { "id": "global_coral_paper_forbidden", "ratio": 2.656533 },
      { "id": "ink_sun", "ratio": 12.219281 },
      { "id": "ink_mint", "ratio": 11.27695 },
      { "id": "paper_dark_canvas", "ratio": 15.180301 },
      { "id": "secondary_dark_dark_canvas", "ratio": 10.561566 },
      { "id": "dark_border_dark_canvas", "ratio": 3.101683 },
      { "id": "dark_cobalt_dark_canvas", "ratio": 8.348005 }
    ]
  },
  "nonCoerciveBoundary": {
    "status": "deferred_not_implemented_in_R0_through_R4",
    "positiveRequirements": [
      "affirmative_opt_in",
      "cooperative_only",
      "private_by_default",
      "safely_reversible",
      "non_punitive"
    ],
    "prohibitedMechanics": [
      "guilt_or_shame",
      "peer_obligation_reminders_or_nudges",
      "threatened_streak_loss",
      "learning_gates",
      "paid_recovery",
      "scarcity_or_loss_pressure_economy",
      "reward_transfers",
      "rankings",
      "notification_pressure"
    ],
    "protectedCohorts": {
      "cohorts": ["child", "unknown"],
      "prohibited": [
        "social",
        "ranking",
        "profiling",
        "targeted_ads",
        "purchase_pressure",
        "notification_pressure"
      ]
    },
    "r4aExcludedSurfaces": [
      "social_graph",
      "leaderboard_or_league",
      "competition",
      "rewards_or_economy",
      "reminders_or_notifications",
      "ads_or_purchases",
      "experiments_or_cohort_labels",
      "campaign_or_ugc",
      "sharing_or_publication",
      "mascot_or_competitor_trade_dress"
    ]
  },
  "provenance": {
    "classification": "INFERENCE",
    "controlledReplay": {
      "evidenceId": "ev_929eebe1b1d987c31030811d071ab83ac3563182a8c93c99853f193fce9359af",
      "status": "UNAVAILABLE/UNKNOWN",
      "repositoryClaimSupported": false,
      "nativeDossierRetained": false
    },
    "noCopy": "no_competitor_code_assets_lesson_content_screenshots_characters_sounds_animation_algorithms_composition_visual_hierarchy_or_trade_dress",
    "companyFigures": "historical_non_transferable_not_targets_forecasts_defaults_weights_slos_efficacy_performance_or_acceptance_thresholds"
  },
  "phaseBoundary": {
    "changedPaths": [
      "docs/2026-10-31_sprint-6-r4a-conversation-canvas-spec_v1.md",
      "packages/shared/src/sprint-6-r4a-conversation-canvas-spec.test.ts"
    ],
    "runtimeBrowserAtExecutions": 0,
    "unattemptedCells": 10800,
    "unattemptedArtifacts": 86400,
    "forbiddenChanges": [
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
      "external_action"
    ],
    "deferredCapabilities": [
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
      "public_efficacy_claims"
    ]
  },
  "handoff": {
    "r4aExit": "exact_two_file_candidate_no_TBD_closed_catalogs_repository_and_protected_checks_same_head_specialist_PASS_and_Elana_final_PASS",
    "r4bEntry": "verified_R4A_merge_commit_fresh_worktree_separate_PR_no_evidence_transfer",
    "finalIndependentGate": "Elana Castillo",
    "headChangeInvalidatesReviews": true
  }
}
```

## Interaction and layout contract

The page has one document/main vertical scroll surface. Its order is skip link,
top bar/back, named progress, one H1, prompt/instructions, response group,
feedback/recovery status, then the action region. There is no nested activity
scroll, fixed action footer, sticky obstruction, horizontal page scroll, or
hover-only control. Every target is at least 44×44 CSS px; text-entry controls
use at least 16px text. Required content is never truncated. Long unbroken text
uses emergency wrapping without `word-break: break-all`.

The exit dialog from `ACTIVE` with an answer is **Leave this activity?** with
“Your unsubmitted answer will be discarded.” Actions are **Stay** (initial
focus) and **Leave activity**. From `SUBMITTING`, it is **Leave while
checking?** with “Fluyo will stop waiting here. If the server already confirmed
the attempt, your progress may appear when you return.” Escape or backdrop
dismissal means Stay, and focus returns to the invoking control.

While either exit dialog is open, its semantic `dialog` container supplies the
exact heading and body but is not a Tab stop. The only tabbable controls are
`exit_stay` and `exit_leave`, in that order, and forward or reverse Tab wraps
between those two controls. Background controls are keyboard inert, pointer
inert except for backdrop dismissal, and excluded from accessibility-tree
traversal. Stay, Escape, and backdrop dismissal preserve context, close the
dialog without an announcement, and return focus to the invoking exit control.
Leave applies the context-specific clear and late-result fence before safe
navigation and does not restore obsolete focus. None of these interactions can
synthesize confirmation or progress.

Learner-facing answer, confirmed-result, continue/finish, and generic retry
copy is literal catalog copy, never dispatcher or developer instruction text.
Confirmed feedback renders only after the closed NFC, trim-canonical, nonempty
plain-text validator enforces at most 512 UTF-8 bytes and 160 grapheme clusters.
The rendered value remains the original NFC text. A detection-only NFKC
compatibility shadow performs exactly one bounded percent-decoding pass. It
rejects malformed percent sequences and any residual percent byte sequence
instead of recursively decoding, normalizes the closed security-relevant
Unicode solidus and reverse-solidus set, then evaluates traversal and path
families. Phone-family evaluation counts Unicode decimal digits across the
closed international separator set (space, slash, parentheses, period,
hyphen, NBSP, narrow NBSP, and middle dot).
It rejects every Unicode control, format, bidi, line-separator, and
paragraph-separator character; HTML and entities; Markdown emphasis,
strikethrough, fences, horizontal rules, links, and code; every URI-scheme-
shaped token; phone/contact data, URLs, hosts, and query fragments; provider/
diagnostic/error/stack/correlation families; token/code/state/nonce/verifier/
credential/session families; every key ending in ID, UUID, or GUID; canonical,
braced, or compact UUID values; and generic absolute, relative, workspace,
Windows, UNC, or traversal paths. Every rejection uses
**Your result** / **Your result was confirmed.** Confirmed base
presentations hold only a structural `confirmed_result_action` reference. The
four resolved variants hold a structural `confirmed_feedback_body` reference,
never developer instructions, and render only validated learner feedback or the
exact fallback; their actions render exactly **Continue** or **Finish**. A freshly
authorized server-selected next activity produces exactly one **Continue**
action only after owner, entitlement, activity, and version validation;
otherwise the only action is **Finish**. Missing, unknown, or stale retry origin
uses the exact generic retry fallback and never exposes origin dispatch logic.

Keyboard focus resolution has no implicit or presentation-agnostic fallback.
The closed 69-row `keyboardPresentationFocusMap` contains one ordered record for
every applicable presentation/interaction pair. **Check answer** from `ACTIVE`
and submit-retry **Try again** retain the primary-action status position while
the interface enters `SUBMITTING`, with zero programmatic focus moves. Primary
actions that truly navigate move focus once to the activated destination
heading. In-place selection, sequential navigation, radio roving, modal focus,
modal dismissal, and skip-link activation retain their closed target and move
count. Missing, extra, duplicate, reordered, unknown, or mismatched rows fail
closed. The nine interaction IDs and the matrix/artifact counts do not change.

`transition-evidence.json` is one separate sanitized durable run-level 49-record
artifact, not a ninth per-cell artifact and not a matrix axis. Its 15 direct
loads, 15 client transitions, 15 same-screen refreshes, two connectivity-loss
templates, and two connectivity-restored templates preserve the 10,800 cell and
86,400 per-cell artifact counts. R4-A records expected contracts only: every
observed field and deduplication key is null and every record is
`SIMULATED_CONTRACT_ONLY`, never `PASS`. Real observations and PASS verdicts are
reserved for R4-B. Its 15 presentation IDs use base state IDs only for states
without variants and exact `STATE:variant` references validated against closed
state-variant ownership. Its immutable resolver locator, hash, bounded byte size, and
validation digest enter the manifest and artifact-content digest; E1 review and
the provider reviewer attestation bind them; privacy validation is closed; and
cleanup retains this artifact beside `complete-results.jsonl` while deleting
only reviewed raw targets. Per-cell `announcements.txt` is explicitly the
`client_transition` slice; direct-load, refresh, and connectivity contexts exist
only in the transition artifact. R4-A still executes no browser or assistive
technology and makes no rendered-behavior claim.

Contrast evidence is derived only from the closed ordered
`visual.semanticContrastOwnership` records and their actual scoped tokens and
RGBA values. The failing 2.776880 `structuralBorder`/`darkRaised` use is
forbidden; `darkCobalt` owns that raised structural boundary. Light coral is a
state boundary only, never normal text. Normal and reduced motion evidence pair
the same five catalog motions. Normal runs use exact transform/opacity
properties, durations, owners, triggers, and easing; reduced runs settle the
same state/action/focus/copy/progress/announcement immediately with zero
observed duration and no movement. Only the exact closed
`visual.motionInterruptionFixtures` state/fixture/motion combinations carry a
non-null interruption cause. Each proves the exact newest settlement with zero
stale callbacks, preserved focus, one semantic announcement, no queued obsolete
completion, and the same reduced/static outcome; every other execution has a
null `interruptedBy`. Motion never owns focus or announcement, stale callbacks
remain inert, and equivalent events coalesce without a queue.

At actual 200% Chromium browser zoom, every viewport reflows to one column.
`en` is the fallback. `en-XA` expands every UI string. `ar-XB` mirrors logical
geometry and semantically directional icons but never reverses canonical answer
order. Latin fragments and numerals retain bidi isolation. Hover styling exists
only under `(hover: hover) and (pointer: fine)`.

## Break-UI acceptance

The 15 fixture IDs in the catalog are dimensions, not samples; every fixture
runs against every state. The long-content fixture uses a synthetic
600-grapheme prompt and four 180-grapheme choices. These are stress inputs, not
server or product limits. The compact-landscape fixture uses 844×390 at actual
200% browser zoom. Duplicate, stale, late, blocked, expired, offline, corrupt,
and missing-optional-content fixtures never create fake progress, result
decoration, duplicate overlays, or invented content. `offline_saved_material`
is an immutable fixture identifier only: it asserts no saved, synchronized,
durable, or offline learning material. The UI says “kept for this session,”
retains the answer only in memory, clears it on exit, and requires fresh
validation.

## Phase record and handoff

R4-A changes exactly the two paths in `phaseBoundary.changedPaths` and contains
no TBD or unresolved placeholder. It may complete only when the exact candidate
passes repository and protected checks, receives same-head specialist PASS
reports, and receives Elana’s final unchanged-head PASS. Any byte or head change
invalidates those reports.

R4-B begins only after R4-A merges and every applicable post-main workflow
passes. It starts from the verified merge commit in a fresh worktree and a
separate pull request. R4-A evidence does not transfer into rendered,
browser, or assistive-technology PASS evidence. PR #58 and PR #61 remain
separate and unchanged. Production, native, signing, stores, spending,
credentials, external accounts, deployment, and public claims remain gated.
