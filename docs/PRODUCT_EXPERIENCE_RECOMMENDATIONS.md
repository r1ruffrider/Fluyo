# Fluyo Product Experience Review

## Experience goal

Fluyo should make a learner feel capable of entering a real Spanish conversation after a few
minutes, while clearly separating the working product from planned capabilities.

## Current experience direction

The main Next.js route now serves as the canonical local landing and product-preview surface. It
replaces infrastructure-first Sprint copy with a conversation-first story, a local illustration,
clear product status, and direct paths into a working phrase sprint, account creation, pricing, and
billing. The standalone `landing/index.html` is intentionally a lightweight handoff to that running
application so it cannot drift into a second, misleading product surface.

The first learning interaction is available at `/learn`. It is labeled as a preview and demonstrates
a complete loop: situational prompt, answer attempt, friendly failure feedback, correction, progress,
completion, reload persistence, and restart. Preview progress is stored in a first-party browser
cookie. No
lesson or progress record is written to the Fluyo API.

## Implemented design system

- **Voice:** warm, direct, playful, and honest about product maturity.
- **Color:** deep cobalt for confidence, coral for energy, yellow for encouragement, mint for success,
  and warm paper for an approachable learning environment.
- **Type:** rounded system display fallbacks paired with the existing system UI stack; no third-party
  font request is required.
- **Shape:** high-radius cards, asymmetric corners, dark keylines, and offset shadows create a tactile
  flashcard quality without reducing readability.
- **Motion:** floating speech cards, a lightweight speaking waveform, entrance motion, progress
  transitions, and a completion burst. All animations collapse under `prefers-reduced-motion`.
- **Assets:** the hero conversation illustration is an original repository-owned SVG. The pages load
  no remote or unlicensed imagery.
- **Accessibility:** semantic headings and landmarks, visible focus, at least 44-pixel interaction
  targets, live feedback, a labeled progress indicator, language attributes for Spanish phrases,
  keyboard-operable controls, and responsive layouts down to 320 pixels.

## Product honesty rules

Use the following labels consistently until the underlying capabilities exist:

- `Available locally`: the phrase sprint, Supabase account/profile flow, responsive web interface,
  and Stripe test-mode billing flow.
- `Preview`: the phrase sprint and any sample lesson content that does not persist to the backend.
- `On the roadmap`: structured courses, cross-device learning progress, speech scoring, AI
  conversation, translation, and native iOS/Android applications.

Do not publish latency, offline support, lesson-count, efficacy, market-leadership, or product-usage
claims without current evidence. Do not expose a waitlist form until it has a real consent,
submission, storage, and confirmation flow.

## Recommended product sequence

1. **Product shell and navigation:** turn the authenticated account page into a learner dashboard
   with a daily goal, next activity, recent progress, and subscription-aware access.
2. **Lesson contract:** define versioned lesson, exercise, attempt, and progress contracts before
   moving preview state to the API. Include idempotent attempt writes and resumable lesson state.
3. **First production lesson:** ship one high-quality café lesson with text, recorded native audio,
   transcript, meaning, answer feedback, and a final speaking task. Validate pedagogy with a Spanish
   curriculum owner.
4. **Progress foundation:** add server-owned completion and streak logic with timezone-safe dates,
   transparent reset behavior, offline conflict rules, and accessible non-streak motivation.
5. **Speech prototype:** test microphone permission, recording recovery, upload limits, privacy,
   caption/transcript review, and provider fallbacks before claiming pronunciation scoring.
6. **Mobile adaptation:** reuse the design tokens and learning contract, while treating App Store and
   Play billing, permissions, offline storage, and native interaction as separate implementation work.

## Content and interaction recommendations

- Organize the entry point around **moments** such as café, introductions, transit, hotel, and asking
  for help. A moment gives each lesson an emotional reason to exist.
- Keep an activity between two and five minutes and end with one portable phrase. Show the next
  action before displaying secondary statistics.
- Use correction language that explains the decision without shaming the learner. Preserve the
  learner's incorrect answer long enough to compare it with the correction.
- Add audio only when it includes replay, transcript, speed controls, loading/failure states, and a
  no-audio path. Decorative speaker buttons should never appear before audio works.
- Let progress reinforce competence. Avoid streak-loss threats and animation that blocks the next
  action.

## Motion and media plan

The home hero and completion state are safe for product screen recordings because they contain no
account or billing data. A vertical clip can use the hook “Spanish for the moments that matter” for
three seconds, then show the incorrect-answer recovery and the `¡Lo lograste!` completion within
15–20 seconds. Capture at 9:16 with captions and keep all instructional meaning available without
sound. The same story works at 1:1 by framing the lesson card rather than the full page.

Future motion should be short, interruptible, and tied to feedback. Prefer transforms and opacity;
avoid continuous background animation on lesson screens. Every new animated state needs a static
reduced-motion equivalent.

## Design QA gate for future phases

Every product phase should test the primary loop, keyboard input, incorrect and recovery paths,
refresh persistence, mobile width, wide layout, 200% text scaling, reduced motion, browser console,
and claim accuracy. A phase should not pass if a prominent control is inert, a planned capability is
presented as available, or task completion depends on animation or color alone.
