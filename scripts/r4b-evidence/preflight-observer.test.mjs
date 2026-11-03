import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Script } from "node:vm";
import {
  assertProductionFixtureBoundaryEligible,
  contextualSemanticContrastPairs,
  effectiveRgbaWithOpacity,
  fillUnattemptedObservationStatuses,
  fixturePresentation,
  focusContrastAgainstExposedSurface,
  nativeRadioArrowModel,
  nativeSequentialFocusModel,
  preflightPageAuditScriptForTesting,
  resolveAccessibleNameEvidence,
  rgbaContrastRatio,
  validateRtlNotchGeometry,
  validateHarnessQueryProofResponses,
  validateInertClientBoundaryProbe,
  validateLongContentReflow,
  validateObservationTransactionTrace,
  validateRepresentativeFocusFixture,
} from "./preflight-observer.mjs";
import { createDiscardedPreflightPlan } from "./preflight-plan.mjs";

test("maps every sampled accepted state variant to a closed development fixture", () => {
  const plan = createDiscardedPreflightPlan();
  const allowed = new Set([
    "preparing",
    "active",
    "submitting",
    "confirmed-correct-continue",
    "confirmed-correct-finish",
    "confirmed-incorrect-continue",
    "confirmed-incorrect-finish",
    "retryable-prepare",
    "retryable-submit",
    "stale-content",
    "session-ended",
    "access-blocked",
    "empty-review",
    "offline-prepare",
    "offline-active",
  ]);
  assert.equal(
    plan.visualCells.every((cell) => allowed.has(fixturePresentation(cell))),
    true,
  );
});

test("marks only not-started observations UNATTEMPTED after mid-matrix cancellation", () => {
  const plan = createDiscardedPreflightPlan();
  const completed = plan.observations.slice(0, 17).map((observation) => ({
    cellOrdinal: observation.cellOrdinal,
    status: "PASS",
    audit: {},
    metrics: {},
  }));
  const announcements = plan.observations.slice(0, 17).map((observation) => ({
    observationId: observation.observationId,
    eventCount: 1,
    normalizedTextSha256: "a".repeat(64),
    duplicateCount: 0,
    expectedOrderStatus: "PASS",
    oneTimeAnnouncementStatus: "PASS",
  }));
  const filled = fillUnattemptedObservationStatuses(plan, completed, announcements);
  assert.equal(filled.observations.length, 120);
  assert.equal(filled.observations.filter(({ status }) => status === "PASS").length, 17);
  assert.equal(filled.observations.filter(({ status }) => status === "UNATTEMPTED").length, 103);
  assert.equal(filled.announcements[17].expectedOrderStatus, "UNATTEMPTED");
  assert.equal(completed.length, 17);
});

test("requires inert client navigation, action substitution, presentation, and focus", () => {
  const probe = {
    boundary: "v1",
    actionAlias: "fluyo:r4b:inert-conversation-action:v1",
    anchorNavigationPrevented: true,
    routerButtonPrevented: true,
    actionCallbackPrevented: true,
    pointerSubmitPrevented: true,
    keyboardSubmitPrevented: true,
    locationStable: true,
    presentationStable: true,
    focusStable: true,
    zeroRequestActivation: true,
    zeroActionActivation: true,
    blockedActivationCount: 5,
  };
  assert.deepEqual(validateInertClientBoundaryProbe(probe), { status: "PASS" });
  for (const field of [
    "anchorNavigationPrevented",
    "routerButtonPrevented",
    "actionCallbackPrevented",
    "pointerSubmitPrevented",
    "keyboardSubmitPrevented",
    "locationStable",
    "presentationStable",
    "focusStable",
    "zeroRequestActivation",
    "zeroActionActivation",
  ]) {
    assert.throws(() => validateInertClientBoundaryProbe({ ...probe, [field]: false }), /failed/u);
  }
  assert.throws(
    () => validateInertClientBoundaryProbe({ ...probe, blockedActivationCount: 4 }),
    /failed/u,
  );
});

test("holds every post-PREPARING mutation boundary on crash", () => {
  const boundaries = [
    "PREPARING_RECORDED",
    "ATTEMPT_ROOT_CREATED",
    "AUTHORITY_COPIED",
    "MANIFEST_COPIED",
    "RAW_ROOT_CREATED",
    "PREPARED_RECORDED",
    "OBSERVING_RECORDED",
    "WEB_SPAWNED",
    "WEB_REGISTERED",
    "SERVER_READY_RECORDED",
    "DRIVER_SPAWNED",
    "DRIVER_REGISTERED",
    "DRIVER_READY_RECORDED",
    "NVDA_REGISTERED",
    "NVDA_READY_RECORDED",
  ];
  assert.deepEqual(validateObservationTransactionTrace(boundaries), {
    status: "NVDA_READY",
    boundary: "NVDA_READY_RECORDED",
  });
  for (let index = 1; index <= boundaries.length; index += 1) {
    assert.deepEqual(
      validateObservationTransactionTrace([...boundaries.slice(0, index), "FAILED_HELD"]),
      {
        status: "FAILED_HELD",
        boundary: boundaries[index - 1],
      },
    );
  }
  assert.throws(
    () => validateObservationTransactionTrace([boundaries[0], boundaries[2]]),
    /skipped or reordered/u,
  );
});

test("requires two distinct production query cells and rejects malformed or extra keys", () => {
  const responses = [
    {
      kind: "valid-a",
      status: 200,
      body: '<div data-fixture-cell="a" data-r4b-inert-navigation-boundary="v1">A</div>',
    },
    {
      kind: "valid-b",
      status: 200,
      body: '<div data-fixture-cell="b" data-r4b-inert-navigation-boundary="v1">B</div>',
    },
    { kind: "malformed", status: 404, body: "not found" },
    { kind: "extra", status: 404, body: "not found" },
  ];
  assert.deepEqual(validateHarnessQueryProofResponses(responses), {
    valid: 2,
    rejected: 2,
    status: "PASS",
  });
  assert.throws(
    () => validateHarnessQueryProofResponses(responses.map((entry) => ({ ...entry, status: 200 }))),
    /status/u,
  );
  assert.throws(
    () =>
      validateHarnessQueryProofResponses([
        responses[0],
        { ...responses[1], body: responses[0].body },
        ...responses.slice(2),
      ]),
    /byte-identical/u,
  );
});

test("accepts only the inert isolated production harness boundary", () => {
  assert.doesNotThrow(() => assertProductionFixtureBoundaryEligible());
});

test("resolves progress names through complete aria-labelledby references", () => {
  assert.deepEqual(
    resolveAccessibleNameEvidence({
      ariaLabelledby: "progress-label progress-context",
      referencedLabels: {
        "progress-label": "Activity progress",
        "progress-context": "Lesson one",
      },
    }),
    {
      name: "Activity progress Lesson one",
      source: "aria-labelledby",
      status: "PASS",
    },
  );
  assert.equal(
    resolveAccessibleNameEvidence({
      ariaLabelledby: "progress-label missing",
      referencedLabels: { "progress-label": "Activity progress" },
    }).status,
    "FAIL",
  );
  assert.equal(
    resolveAccessibleNameEvidence({
      ariaLabelledby: "progress-label empty",
      referencedLabels: { "progress-label": "Activity progress", empty: "  " },
    }).status,
    "FAIL",
  );
});

test("measures offset focus and semantic indicators against the exposed surface", () => {
  for (const sample of [
    {
      outlineRgba: [38, 57, 182, 1],
      elementSurfaceRgba: [38, 57, 182, 1],
      exposedSurfaceRgba: [255, 255, 255, 1],
    },
    {
      outlineRgba: [255, 211, 78, 1],
      elementSurfaceRgba: [255, 211, 78, 1],
      exposedSurfaceRgba: [33, 28, 74, 1],
    },
  ]) {
    assert.equal(rgbaContrastRatio(sample.outlineRgba, sample.elementSurfaceRgba), 1);
    assert.equal(focusContrastAgainstExposedSurface(sample).status, "PASS");
  }
  assert.ok(rgbaContrastRatio([38, 57, 182, 1], [255, 253, 248, 1]) >= 3);
  assert.ok(rgbaContrastRatio([174, 184, 255, 1], [42, 36, 86, 1]) >= 3);
  assert.ok(rgbaContrastRatio([22, 122, 91, 1], [232, 251, 244, 1]) >= 3);
});

test("alpha-composes disabled-control and ancestor opacity instead of trusting raw tokens", () => {
  const cobalt = [38, 57, 182, 1];
  const activeSurface = [235.47, 235.36, 242.06, 1];
  const submittingSurface = [255, 247, 216, 1];
  const priorActive = effectiveRgbaWithOpacity({
    foregroundRgba: cobalt,
    backgroundRgba: activeSurface,
    opacityChain: [0.52],
  });
  const priorSubmitting = effectiveRgbaWithOpacity({
    foregroundRgba: cobalt,
    backgroundRgba: submittingSurface,
    opacityChain: [0.52],
  });
  assert.ok(rgbaContrastRatio(cobalt, activeSurface) >= 3);
  assert.ok(rgbaContrastRatio(cobalt, submittingSurface) >= 3);
  assert.ok(Math.abs(rgbaContrastRatio(priorActive, activeSurface) - 2.5965) < 0.001);
  assert.ok(Math.abs(rgbaContrastRatio(priorSubmitting, submittingSurface) - 2.7075) < 0.001);
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: cobalt,
      elementSurfaceRgba: cobalt,
      exposedSurfaceRgba: activeSurface,
      opacityChain: [0.52],
    }).status,
    "FAIL",
  );
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: cobalt,
      elementSurfaceRgba: cobalt,
      exposedSurfaceRgba: activeSurface,
      opacityChain: [1, 0.5],
    }).status,
    "FAIL",
  );
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: [38, 57, 182, 0.2],
      elementSurfaceRgba: [38, 57, 182, 0.2],
      exposedSurfaceRgba: activeSurface,
    }).status,
    "FAIL",
  );
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: cobalt,
      elementSurfaceRgba: cobalt,
      exposedSurfaceRgba: activeSurface,
      opacityChain: [Number.NaN],
    }).status,
    "FAIL",
  );
});

test("uses explicit opaque disabled tokens with compliant light and dark contrast", () => {
  const lightParent = [255, 247, 216, 1];
  const lightSurface = [89, 96, 127, 1];
  const darkParent = [42, 36, 86, 1];
  const darkSurface = [144, 153, 197, 1];
  for (const evidence of [
    contextualSemanticContrastPairs({
      elementId: "primary-action",
      elementSurfaceRgba: lightSurface,
      parentSurfaceRgba: lightParent,
      boundaryRgba: [23, 19, 63, 1],
    }),
    contextualSemanticContrastPairs({
      elementId: "primary-action",
      elementSurfaceRgba: darkSurface,
      parentSurfaceRgba: darkParent,
      boundaryRgba: [255, 211, 78, 1],
    }),
  ]) {
    assert.equal(
      evidence.every(({ status }) => status === "PASS"),
      true,
    );
  }
  assert.ok(rgbaContrastRatio([255, 255, 255, 1], lightSurface) >= 4.5);
  assert.ok(rgbaContrastRatio([23, 19, 63, 1], darkSurface) >= 4.5);
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: [38, 57, 182, 1],
      elementSurfaceRgba: lightSurface,
      exposedSurfaceRgba: lightParent,
    }).status,
    "PASS",
  );
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: [255, 211, 78, 1],
      elementSurfaceRgba: darkSurface,
      exposedSurfaceRgba: darkParent,
    }).status,
    "PASS",
  );
  assert.equal(
    focusContrastAgainstExposedSurface({
      outlineRgba: [0, 0, 0, 1],
      elementSurfaceRgba: [20, 20, 20, 1],
      exposedSurfaceRgba: [255, 255, 255, 1],
      opacityChain: [0.9, 0.9],
    }).status,
    "PASS",
  );
});

test("uses opaque checked and unchecked disabled-choice tokens and rejects the prior alpha fade", () => {
  const white = [255, 255, 255, 1];
  const lightSurface = [242, 240, 248, 1];
  const darkSurface = [42, 36, 86, 1];
  const themes = [
    {
      surface: lightSurface,
      ink: [79, 75, 109, 1],
      uncheckedBoundary: [111, 105, 148, 1],
      checkedBoundary: [38, 57, 182, 1],
      focus: [38, 57, 182, 1],
    },
    {
      surface: darkSurface,
      ink: [215, 208, 229, 1],
      uncheckedBoundary: [174, 184, 255, 1],
      checkedBoundary: [255, 211, 78, 1],
      focus: [255, 211, 78, 1],
    },
  ];
  for (const theme of themes) {
    assert.ok(rgbaContrastRatio(theme.ink, theme.surface) >= 4.5);
    for (const [state, boundaryRgba] of [
      ["unchecked", theme.uncheckedBoundary],
      ["checked", theme.checkedBoundary],
    ]) {
      const [pair] = contextualSemanticContrastPairs({
        elementId: `choice-disabled-${state}`,
        elementSurfaceRgba: theme.surface,
        parentSurfaceRgba: white,
        boundaryRgba,
      });
      assert.equal(pair.pairId, `choice-disabled-${state}:choice-boundary`);
      assert.equal(pair.status, "PASS");
      assert.ok(pair.ratio >= 3);
    }
    assert.equal(
      focusContrastAgainstExposedSurface({
        outlineRgba: theme.focus,
        elementSurfaceRgba: theme.surface,
        exposedSurfaceRgba: theme.surface,
      }).status,
      "PASS",
    );
  }

  const [oldOpacityPair] = contextualSemanticContrastPairs({
    elementId: "choice-disabled-unchecked",
    elementSurfaceRgba: [255, 253, 248, 1],
    parentSurfaceRgba: white,
    boundaryRgba: [111, 105, 148, 1],
    opacityChain: [0.72],
  });
  assert.ok(Math.abs(oldOpacityPair.ratio - 2.9073645442184133) < 1e-12);
  assert.equal(oldOpacityPair.status, "FAIL");
  assert.equal(
    contextualSemanticContrastPairs({
      elementId: "choice-disabled-unchecked",
      elementSurfaceRgba: [255, 253, 248, 1],
      parentSurfaceRgba: white,
      boundaryRgba: [111, 105, 148, 1],
      opacityChain: [1, 0.72],
    })[0].status,
    "FAIL",
  );
  assert.equal(
    contextualSemanticContrastPairs({
      elementId: "choice-disabled-unchecked",
      elementSurfaceRgba: [255, 253, 248, 1],
      parentSurfaceRgba: white,
      boundaryRgba: [111, 105, 148, 0.72],
    })[0].status,
    "FAIL",
  );
});

test("uses closed contextual semantic contrast pairs and never compares a decorative border to its own fill", () => {
  const state = contextualSemanticContrastPairs({
    elementId: "state-panel",
    elementSurfaceRgba: [255, 247, 216, 1],
    parentSurfaceRgba: [255, 253, 248, 1],
    boundaryRgba: [138, 91, 0, 1],
  });
  assert.deepEqual(
    state.map(({ pairId }) => pairId),
    ["state-panel:state-rule"],
  );
  assert.equal(state[0].status, "PASS");

  const choice = contextualSemanticContrastPairs({
    elementId: "choice-cerca",
    elementSurfaceRgba: [255, 253, 248, 1],
    parentSurfaceRgba: [255, 255, 255, 1],
    boundaryRgba: [111, 105, 148, 1],
  });
  assert.deepEqual(
    choice.map(({ pairId }) => pairId),
    ["choice-cerca:choice-boundary"],
  );
  assert.equal(choice[0].status, "PASS");

  const primary = contextualSemanticContrastPairs({
    elementId: "primary-action",
    elementSurfaceRgba: [38, 57, 182, 1],
    parentSurfaceRgba: [255, 253, 248, 1],
    boundaryRgba: [38, 57, 182, 1],
  });
  assert.deepEqual(
    primary.map(({ pairId }) => pairId),
    ["primary-action:primary-surface", "primary-action:primary-boundary"],
  );
  assert.equal(
    primary.every(({ status }) => status === "PASS"),
    true,
  );
  assert.equal(
    primary.some(
      ({ foregroundRgba, backgroundRgba }) =>
        JSON.stringify(foregroundRgba) === JSON.stringify(backgroundRgba),
    ),
    false,
  );
  assert.equal(
    contextualSemanticContrastPairs({
      elementId: "choice-cerca",
      elementSurfaceRgba: [255, 253, 248, 1],
      parentSurfaceRgba: [255, 255, 255, 1],
      boundaryRgba: [255, 253, 248, 1],
    })[0].status,
    "FAIL",
  );
});

test("keeps the warning rule above 3:1 in light and dark themes", () => {
  assert.ok(rgbaContrastRatio([138, 91, 0, 1], [255, 247, 216, 1]) >= 3);
  assert.ok(rgbaContrastRatio([255, 211, 78, 1], [42, 36, 86, 1]) >= 3);
});

test("models native Tab radio grouping and guarded Arrow selection for representative states", () => {
  const common = [
    { key: "a:Skip to activity", type: "link" },
    { key: "hidden", type: "hidden" },
    { key: "non-rendered", type: "button", rendered: false },
    { key: "inert", type: "button", inert: true },
    { key: "disabled", type: "button", disabled: true },
    { key: "a:Back to dashboard", type: "link" },
  ];
  const radios = [
    {
      key: "radio:selectedChoiceId:cerca",
      type: "radio",
      name: "selectedChoiceId",
      checked: true,
    },
    {
      key: "radio:selectedChoiceId:gracias",
      type: "radio",
      name: "selectedChoiceId",
      checked: false,
    },
  ];
  const activeKeys = nativeSequentialFocusModel([
    ...common,
    ...radios,
    { key: "conversation-canvas-attempt-action", type: "button" },
    { key: "button:Run synthetic event", type: "button" },
  ]);
  assert.deepEqual(activeKeys, [
    "a:Skip to activity",
    "a:Back to dashboard",
    "radio:selectedChoiceId:cerca",
    "conversation-canvas-attempt-action",
    "button:Run synthetic event",
  ]);
  const activeArrow = nativeRadioArrowModel({
    members: radios.map(({ key }) => key),
    currentIndex: 0,
    direction: "ArrowRight",
    ariaDisabled: false,
  });
  assert.deepEqual(activeArrow, {
    activeKey: "radio:selectedChoiceId:gracias",
    checkedKey: "radio:selectedChoiceId:gracias",
    selectionChanged: true,
    guarded: false,
  });
  const submittingArrow = nativeRadioArrowModel({
    members: radios.map(({ key }) => key),
    currentIndex: 0,
    direction: "ArrowRight",
    ariaDisabled: true,
  });
  assert.deepEqual(submittingArrow, {
    activeKey: "radio:selectedChoiceId:cerca",
    checkedKey: "radio:selectedChoiceId:cerca",
    selectionChanged: false,
    guarded: true,
  });
  for (const [stateId, expectedKeys, radioArrow] of [
    ["ACTIVE", activeKeys, { status: "PASS", guarded: false }],
    ["SUBMITTING", activeKeys, { status: "PASS", guarded: true }],
    [
      "CONFIRMED",
      [
        "a:Skip to activity",
        "a:Back to dashboard",
        "conversation-canvas-primary-action",
        "button:Run synthetic event",
      ],
      null,
    ],
  ]) {
    assert.equal(
      validateRepresentativeFocusFixture({
        stateId,
        keyboardTrace: {
          status: "PASS",
          expectedKeys,
          reverse: [...expectedKeys].reverse().map((key) => ({ key })),
        },
        radioArrow,
      }).status,
      "PASS",
    );
  }
});

test("requires the exact unbroken phone-risk fixture and zero document or named-region overflow", () => {
  const value = {
    prompt: "P".repeat(600),
    choices: ["1", "2", "3", "4"].map((value) => value.repeat(180)),
    documentScrollWidth: 320,
    documentClientWidth: 320,
    regions: [
      { id: "canvas", missing: false, horizontalClipped: false },
      { id: "choices", missing: false, horizontalClipped: false },
      { id: "primary", missing: false, horizontalClipped: false },
    ],
  };
  assert.equal(validateLongContentReflow(value).status, "PASS");
  assert.equal(
    validateLongContentReflow({
      ...value,
      regions: value.regions.map((region, index) =>
        index === 1 ? { ...region, horizontalClipped: true } : region,
      ),
    }).status,
    "FAIL",
  );
});

test("derives the RTL notch side from the responsive computed token", () => {
  for (const notchSize of [20, 24]) {
    assert.equal(
      validateRtlNotchGeometry({
        clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${notchSize}px), calc(100% - ${notchSize}px) 100%, 0 100%)`,
        notchSize,
        width: 720,
        height: 480,
      }),
      true,
    );
  }
  assert.equal(
    validateRtlNotchGeometry({
      clipPath: "polygon(0 0, 100% 0, 100% 100%, 20px 100%, 0 calc(100% - 20px))",
      notchSize: 20,
      width: 720,
      height: 480,
    }),
    false,
  );
});

test("keeps the embedded browser audit executable after exact geometry changes", () => {
  assert.doesNotThrow(() => new Script(`(${preflightPageAuditScriptForTesting()})`));
});

test("binds presentation fidelity, full geometry artifacts, locale, and reducer transitions", () => {
  const observer = readFileSync(new URL("./preflight-observer.mjs", import.meta.url), "utf8");
  const source = readFileSync(
    new URL("../../apps/r4b-preflight-harness/source-contract.tsx", import.meta.url),
    "utf8",
  );
  const styles = readFileSync(
    new URL("../../apps/r4b-preflight-harness/app/globals.css", import.meta.url),
    "utf8",
  );
  const localizer = readFileSync(
    new URL("../../apps/r4b-preflight-harness/localized-boundary.tsx", import.meta.url),
    "utf8",
  );
  const transition = readFileSync(
    new URL("../../apps/r4b-preflight-harness/transition-intent-boundary.tsx", import.meta.url),
    "utf8",
  );
  const productCanvas = readFileSync(
    new URL("../../apps/web/app/learn/session/conversation-canvas.tsx", import.meta.url),
    "utf8",
  );
  const productStyles = readFileSync(
    new URL("../../apps/web/app/learn/session/conversation-canvas.module.css", import.meta.url),
    "utf8",
  );
  for (const marker of [
    "--display",
    "--body",
    "box-sizing: border-box",
    "min-width: 320px",
    ":focus-visible",
  ])
    assert.equal(styles.includes(marker), true, marker);
  for (const marker of ["en-XA", "ar-XB", "pseudoLocalizeVisibleString", "MutationObserver"]) {
    assert.equal(localizer.includes(marker), true, marker);
  }
  for (const marker of [
    "activationElement",
    "contrastPairs",
    "namedRegions",
    "keyboardTrace",
    "progressValueTextPass",
    "logicalMirrorPass",
    "identicalStaticOutcome",
    "requiredRegionsPass",
    "actionableOverlapPass",
    "borderInlineStartColor",
    "parentBg=background(e.parentElement",
    "closedSemanticIds",
    "semanticPairIdsPass",
    "progressAccessibleName",
    "notchSize",
    "effectiveOpacity",
    "colorComputationPass",
    "data-r4b-transition-intent",
  ])
    assert.equal(observer.includes(marker), true, marker);
  assert.equal(source.includes("provenance"), true);
  assert.equal(transition.includes('type: "AUTHORITATIVE_RESET"'), false);
  for (const marker of [
    "conversationCanvasReducer",
    "browserConnectivityInstruction",
    "rebindOfflineSelection",
    "retrySubmitState",
    "retryPrepareState",
    "lateConfirmationIgnored",
    "answerRetained",
    "answerCleared",
  ])
    assert.equal(transition.includes(marker), true, marker);
  assert.equal(observer.includes("ratio(bg,bg)"), false);
  assert.equal(observer.includes("background(e.parentElement??document.body)"), true);
  assert.equal(observer.includes("['progress','progress-fill','state-panel'"), false);
  assert.equal(productCanvas.includes("aria-disabled={disabled || undefined}"), true);
  assert.equal(
    productCanvas.includes('disabled={isBusy || state.id === "OFFLINE_READ_ONLY"}'),
    false,
  );
  assert.equal(productCanvas.includes("if (!canSubmit) return"), true);
  assert.equal(productStyles.includes("--cc-mint-strong: #167a5b"), true);
  assert.equal(productStyles.includes("--cc-warning-strong: #8a5b00"), true);
  assert.equal(productStyles.includes("--cc-disabled-surface: #59607f"), true);
  assert.equal(productStyles.includes("--cc-disabled-focus: #2639b6"), true);
  assert.equal(productStyles.includes("opacity: 0.52"), false);
  assert.equal(productStyles.includes("--cc-disabled-choice-surface: #f2f0f8"), true);
  assert.equal(productStyles.includes("--cc-disabled-choice-boundary: #6f6994"), true);
  assert.equal(productStyles.includes("--cc-disabled-choice-focus: #2639b6"), true);
  assert.equal(productStyles.includes("opacity: 0.72"), false);
  assert.equal(observer.includes("...scope.querySelectorAll('fieldset label')"), true);
  assert.equal(observer.includes("semanticId+':choice-boundary'"), true);
  assert.equal(productStyles.includes("overflow-wrap: anywhere"), true);
  assert.equal(productStyles.includes("min-inline-size: 0"), true);
  assert.equal(productStyles.includes("background: var(--cc-cobalt);"), true);
  assert.equal(styles.includes("scroll-behavior: auto"), true);
});
