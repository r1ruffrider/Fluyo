# Fluyo Product Experience Phase Audit — 2026-10-17

**Phase brief:** Replace Fluyo's infrastructure-first local experience with an honest, playful,
responsive language-learning landing page and a working lesson preview with local imagery and
purposeful motion.

**Verdict:** PASS

**Test counts:** 28 conducted, 28 passed, 0 failed.

## Tests conducted

|   # | Test                            | Evidence observed                                                                                                                                                                           | Result |
| --: | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
|   1 | Existing experience code review | Reviewed the Next home, standalone landing, login, account, pricing, billing, global styles, product documents, and current feature boundaries.                                             | PASS   |
|   2 | Web ESLint                      | `npm run lint --workspace @fluyo/web` completed with zero warnings or errors.                                                                                                               | PASS   |
|   3 | Strict TypeScript               | `npm run typecheck --workspace @fluyo/web` completed successfully.                                                                                                                          | PASS   |
|   4 | Targeted formatting             | Prettier reported all changed app, landing, and recommendation files correctly formatted.                                                                                                   | PASS   |
|   5 | Diff whitespace check           | `git diff --check` reported no whitespace errors in the owned change set.                                                                                                                   | PASS   |
|   6 | Production build                | `npm exec --workspace @fluyo/web -- next build --webpack` completed successfully outside the restricted sandbox and generated every web route, including `/learn`.                          | PASS   |
|   7 | Local development startup       | Environment-loaded Webpack dev server reached Ready at `http://127.0.0.1:3000`.                                                                                                             | PASS   |
|   8 | Local API status integration    | The rendered home footer reported `Local API connected` against the configured local environment.                                                                                           | PASS   |
|   9 | Desktop landing visual review   | At the default wide viewport, the hero hierarchy, original illustration, floating phrases, CTAs, cards, roadmap split, and footer rendered without overlap.                                 | PASS   |
|  10 | Primary lesson CTA              | Clicking `Try the 2-minute preview` navigated from `/` to `/learn`.                                                                                                                         | PASS   |
|  11 | Pricing CTA                     | Clicking `Pricing` navigated to `/pricing`, where test-mode status and current product limits were visible.                                                                                 | PASS   |
|  12 | Account CTA                     | Clicking `Create an account` navigated to `/login`, where sign-in and account-creation forms rendered.                                                                                      | PASS   |
|  13 | Incorrect-answer path           | Selecting `Buenas noches` for “Good morning” showed friendly retry feedback and kept Next disabled.                                                                                         | PASS   |
|  14 | Correct-answer path             | Selecting `Buenos días` showed the contextual explanation and enabled Next.                                                                                                                 | PASS   |
|  15 | Three-step lesson progression   | Correct café answers advanced moment 1 → 2 → 3 with 0%, 33%, and 67% progress states.                                                                                                       | PASS   |
|  16 | Completion path                 | Finishing moment 3 produced the `¡Lo lograste!` completion state and a portable three-phrase recap.                                                                                         | PASS   |
|  17 | Mid-lesson reload persistence   | Reloading after moment 1 returned to moment 2 through the first-party progress cookie.                                                                                                      | PASS   |
|  18 | Completion reload persistence   | Reloading after completion returned to the completion state.                                                                                                                                | PASS   |
|  19 | Restart path                    | `Practice again` cleared completion and returned to moment 1 at 0%.                                                                                                                         | PASS   |
|  20 | Keyboard input                  | Pressing Enter on the focused `Buenos días` button selected the answer and enabled progression.                                                                                             | PASS   |
|  21 | Mobile landing layout           | At 390 × 844, navigation, hero copy, stacked CTAs, illustration, and content remained readable; body `scrollWidth` equaled `clientWidth`.                                                   | PASS   |
|  22 | Mobile lesson layout            | At 390 × 844, the scene, question, answer targets, and feedback card remained usable; body `scrollWidth` equaled `clientWidth`.                                                             | PASS   |
|  23 | Touch-target review             | Primary buttons and answer choices use 44-pixel-or-larger targets in desktop and mobile CSS.                                                                                                | PASS   |
|  24 | Reduced-motion behavior         | Both the Next app and standalone handoff define `prefers-reduced-motion: reduce` overrides that collapse animation and transition duration.                                                 | PASS   |
|  25 | Browser console                 | A fresh page load on the restarted server produced no warning or error entries.                                                                                                             | PASS   |
|  26 | Claim-accuracy review           | Home, pricing, and standalone copy clearly separates available preview/account/test billing behavior from speech, adaptive learning, cross-device progress, and native apps on the roadmap. | PASS   |
|  27 | Asset and performance boundary  | The hero uses a repository-owned SVG and system fonts; no remote image or font dependency was introduced. Motion uses transform/opacity-based CSS.                                          | PASS   |
|  28 | Semantic accessibility review   | Browser accessibility output exposed landmarks, heading order, real links/buttons, Spanish language attributes, live feedback, and a labeled progress indicator.                            | PASS   |

## Code review

Reviewed `apps/web/app/page.tsx`, `apps/web/app/globals.css`, `apps/web/app/layout.tsx`,
`apps/web/app/learn/page.tsx`, `apps/web/app/learn/phrase-sprint.tsx`,
`apps/web/app/pricing/page.tsx`, `apps/web/app/pricing/pricing-card.tsx`,
`apps/web/public/fluyo-conversation.svg`, and `landing/index.html`.

The new canonical Next landing route retains the existing server-rendered identity and health checks,
uses internal destinations, labels the lesson as a preview, and never grants entitlement from UI
state. The lesson stores only a numeric preview step in a first-party cookie; it does not create a
backend learning record. The standalone artifact is now an explicit local handoff rather than a
second product surface. Pricing still exercises the existing server action and Stripe trust boundary,
but no longer claims unreleased learning entitlements.

## Bugs

| Severity | Location                                 | Problem                                                                                                                                             | Action                                                                                                                                      |
| -------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | `apps/web/app/page.tsx`                  | The primary home experience described Sprint 2 infrastructure and sent users to GitHub instead of demonstrating Fluyo.                              | **Fixed:** replaced it with the canonical conversation-first product landing page and working preview CTA.                                  |
| High     | `landing/index.html`                     | The standalone page presented unreleased features as available and included a waitlist interaction with no persistence.                             | **Fixed:** converted it into an honest local-app handoff with working localhost destinations and roadmap labeling.                          |
| High     | `apps/web/app/pricing/*`                 | Paid plan copy promised unlimited lessons, Charla, offline packs, and camera translation although those features do not exist in the current build. | **Fixed:** labeled billing as test mode and described only verified Checkout, promotion-code, webhook, and billing-status behavior.         |
| Medium   | `apps/web/app/learn/phrase-sprint.tsx`   | The initial browser-storage approach reset lesson progress after reload in the real browser test.                                                   | **Fixed:** moved the numeric preview step to a first-party cookie read during server rendering; mid-lesson and completion reloads now pass. |
| Medium   | `apps/web/public/fluyo-conversation.svg` | The long English phrase overflowed its illustrated speech bubble at the desktop viewport.                                                           | **Fixed:** reflowed the phrase across two SVG text lines and rechecked the desktop composition.                                             |
| Low      | `apps/web/app/layout.tsx`                | Next.js logged a smooth-scroll integration warning.                                                                                                 | **Fixed:** declared `data-scroll-behavior="smooth"`; the fresh console is clean.                                                            |

## Phase disposition

The product-experience phase is cleared. The working local review surface is available at
`http://localhost:3000`, and the interactive preview is available at `http://localhost:3000/learn`.
The next authorized work is the Sprint 3.5+ implementation sequence, beginning with an accepted
product/mobile architecture plan and a server-owned lesson/progress contract before claims or UI for
speech, adaptive learning, or native-store availability are added.
