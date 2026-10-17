# Fluyo Marketing Plan — Sprint 3.5 Through Launch

**Owner:** Isabella, marketing
**Prepared:** October 17, 2026
**Planning horizon:** 90-day operating plan plus launch and scale gates
**Status:** Execution-ready strategy; media spend and external publication require separate approval

## 1. Current truth and the decision this plan makes

Fluyo has a working web platform foundation: Supabase identity, profile ownership, Stripe test-mode Checkout and Customer Portal handoffs, signed webhook synchronization, subscription projection, entitlements, and a billing-status UI. The authenticated Stripe lifecycle has been verified in test mode. The learning product described in the business plan—lessons, Charla, live interpretation, pronunciation, progress, translation, iOS, and Android—is still planned work.

That distinction controls the marketing plan:

- **Now:** build an owned audience, validate the problem and message, recruit research and alpha participants, and show only real prototypes or clearly labeled concepts.
- **After the first learning loop works:** market a closed alpha around one repeatable user outcome.
- **After mobile beta quality and store readiness pass:** open pre-registration and creator launch programs.
- **After retention and paid conversion are measured:** scale paid acquisition.

Fluyo should not sell “the complete learning experience” or imply that the 20 planned features are available before they are implemented and verified. The current standalone landing page does this in several places and its waitlist button is not connected to a durable consented email flow. Correcting that page is a launch-blocking dependency for the landing/application experience owner.

## 2. Strategic choice

### Beachhead audience

Lead with **English-speaking adults, ages 25–55, who have a Spanish-speaking trip in the next 8–12 weeks**. Their need is urgent, the situations are concrete, progress can be demonstrated, and travel scenarios naturally produce useful short-form content.

The first offer is:

> Practice the Spanish conversations you will actually need on your trip, then say them out loud with confidence.

The first outcome to prove is not “fluency.” It is **completing and recalling one real travel conversation without reading a script**.

Secondary discovery cohorts:

1. Relationship learners preparing to speak with a partner’s family.
2. Heritage learners reconnecting with family language, researched with culturally representative participants before public claims.
3. Professionals in healthcare, education, sales, and service work, deferred until accuracy, privacy, and domain-safety requirements are defined.

### Tradeoffs

- Deprioritize mass-market “learn Spanish” messaging during Sprint 3.5; it is expensive and undifferentiated.
- Deprioritize schools, families, tutors, certification, video dubbing, wearables, and professional use cases until the product supports them.
- Deprioritize paid app-install campaigns until a native beta exists and activation can be measured.
- Do not use third-party ads or AdSense on Fluyo properties. The business plan explicitly defines the free tier as a subscription funnel with no third-party ads.
- Do not make live-interpreter speed, translation accuracy, fluency, CEFR advancement, or unlimited-usage claims until the relevant capability has passed product verification.

## 3. Positioning and message system

### Positioning

For English-speaking travelers who want to speak rather than memorize, Fluyo is a conversation-first Spanish practice experience built around the real situations ahead of them. Each short lesson ends with a spoken exchange, so progress is measured in conversations completed.

The future two-way interpreter remains a strategic differentiator, but it enters acquisition copy only after a working, measured beta exists. Until then it may appear only as **“in development”** with clear labeling.

### Message hierarchy

| Layer         | Approved message now                                                                                                  | Proof required before stronger copy                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Brand         | Spanish that flows both ways.                                                                                         | Brand statement; no product proof needed.                         |
| Headline      | Practice the Spanish conversations your trip will actually require.                                                   | Usability-tested travel scenario prototype.                       |
| Subhead       | Join early access for short, spoken practice built around airports, restaurants, directions, hotels, and emergencies. | Implemented early-access flow and published privacy notice.       |
| Benefit 1     | Know what to say in a specific situation.                                                                             | Scenario curriculum reviewed by a qualified bilingual educator.   |
| Benefit 2     | Practice saying it, not only recognizing it.                                                                          | Working recording/speaking interaction.                           |
| Benefit 3     | Build confidence one conversation at a time.                                                                          | User research; treat confidence as self-reported, not guaranteed. |
| Primary CTA   | Join early access                                                                                                     | Durable consented form with success/error states.                 |
| Secondary CTA | Preview a conversation                                                                                                | Honest interactive or recorded demo.                              |

### Claim rules

Every external asset must use one of these labels:

- **Available now:** implemented and verified in the exact advertised surface.
- **Early access/beta:** working but limited; limitations named next to the claim.
- **In development:** concept or prototype; no implication of present access.

Forbidden until evidence exists: “fluent in X days,” “real-time” with an unmeasured latency claim, “accurate” without a defined evaluation, “unlimited” without enforced packaging and cost limits, “AI tutor that remembers,” and any testimonial, user count, download count, rating, or learning outcome that did not occur.

## 4. Offer ladder and launch phases

### Phase A — Audience and evidence foundation (Sprint 3.5)

Offer a free early-access list plus a five-minute travel-needs survey. The thank-you state invites qualified users to a 20-minute interview or prototype session. No payment is requested.

Exit gate:

- 30 completed interviews across at least three discovery cohorts;
- at least 60% of the beachhead participants identify a specific upcoming conversation they fear or avoid;
- at least 40% volunteer for a product test without compensation beyond the stated research incentive;
- one landing message wins on qualified-signup rate with at least 500 unique visitors per variant or a predeclared Bayesian decision rule;
- consent, privacy, attribution, and deletion behavior are tested.

### Phase B — Closed web alpha

Offer one end-to-end scenario: select a travel situation, learn the smallest useful phrase set, complete a spoken practice exchange, receive understandable feedback, and return to continue. Invite users in cohorts so support remains manageable.

Exit gate:

- 100 activated alpha users;
- at least 60% complete the first conversation;
- median time to first completed conversation under 10 minutes;
- at least 25% return within seven days;
- no open critical privacy, identity, billing, or data-loss defect;
- qualitative evidence that users can describe what improved without prompting.

### Phase C — Native beta and store pre-registration

Move the verified learning loop to iOS and Android, then add store listings, onboarding, deep links, lifecycle messaging, and creator beta access. Keep Stripe web billing separate from native purchases until the approved RevenueCat/mobile billing architecture is implemented.

Exit gate:

- Apple TestFlight and Google Play closed testing pass the mobile release plan;
- crash-free sessions and startup performance meet engineering thresholds;
- restore/reinstall, offline/poor-network behavior, accessibility, and account deletion are verified;
- App Store and Play Store copy matches current functionality;
- attribution and privacy disclosures match the actual SDKs and data flows.

### Phase D — Public launch

Launch in one English-speaking market first, with the travel conversation wedge. Coordinate store release, landing page, email, creator posts, UGC, customer support, and incident coverage within the same 72-hour window.

Exit gate to paid scale:

- D30 retention at or above the product team’s validated threshold (the business plan’s 20% is a hypothesis);
- free-to-paid conversion at or above the validated threshold (the business plan’s 4% is a hypothesis);
- refund, cancellation, support, and gross-margin data are stable enough to calculate contribution LTV;
- blended LTV:CAC is at least 3:1 using observed cohort data, not forecast-only LTV;
- no unresolved severity-one product or claim issue.

## 5. Acquisition channels

### Owned channels

1. **Landing page:** one primary CTA, a working scenario preview, proof/status labels, transparent pricing only for available packages, privacy link, and a real email capture flow.
2. **Email:** permissioned research, early-access, onboarding, activation, and launch sequences.
3. **SEO:** begin with genuinely useful scenario pages—what to say at airport check-in, a pharmacy, a restaurant, or a hotel—reviewed by a bilingual educator. Do not mass-generate thin dictionary or conjugation pages.
4. **YouTube / Fluyo en Vivo:** one useful flagship conversation per week after the first six scripts and production process meet quality standards. Each video maps to the same practice scenario in the product.

### Social and community

TikTok and Instagram should make practice feel social, specific, and playful: mistakes people recognize, short roleplays, pronunciation challenges, and “try the next line” participation. Fernanda owns the account build, three-posts-per-day operating system, moderation, and platform-specific calendar. The marketing contract is:

- every post maps to one of the approved content pillars;
- every CTA uses a tagged destination;
- every product demonstration labels availability accurately;
- weekly performance is returned by post, hook, pillar, CTA, and cohort;
- organic winners may become paid Spark/partnership ads only after usage rights are recorded.

### Partnerships

Prioritize small creators and communities with audience trust over celebrity reach:

- bilingual travel creators;
- Spanish teachers with a speaking-first approach;
- Mexico, Spain, and Latin America travel planners;
- intercultural relationship creators;
- study-abroad coordinators and travel programs once the alpha is reliable.

Start with ten unpaid research conversations, then five paid pilot partners. Each pilot gets one scenario-specific brief, an honest disclosure, a trackable link, a fixed fee, optional performance bonus, and written usage rights. Never require positive sentiment or scripted personal results.

## 6. Content system

### Five content pillars

| Pillar                 | Job                     | Example                                                                           |
| ---------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| Say this next          | Immediate utility       | “The server asks ‘¿Algo más?’—here are three natural replies.”                    |
| Conversation rehearsal | Demonstrate the loop    | Airport roleplay with a pause for the viewer’s line.                              |
| Mistakes without shame | Build trust and humor   | False friends or a common pronunciation mix-up, corrected warmly.                 |
| Culture and context    | Prevent robotic Spanish | When “ahorita” changes by country; reviewed by a speaker from that culture.       |
| Building Fluyo         | Create participation    | Prototype test, curriculum review, or beta limitation with an invitation to help. |

One weekly anchor scenario should generate one YouTube lesson, three creator/UGC briefs, seven to ten short clips, one email, one SEO page, one in-product prompt, and one research question. Reuse the lesson, not the identical edit: each channel needs its own hook, length, caption, and CTA.

## 7. UGC advertising plan

### Creator pool

Recruit 12–20 creators across four angles: pre-trip anxiety, relationship/family, heritage reconnection, and funny language mistakes. Use a mix of real learners and qualified teachers. Record language background and cultural relationship so the content never impersonates an identity.

### Brief structure

Each creator receives:

1. one audience tension and one scenario;
2. a 1–2 second visual/verbal hook;
3. a real product task to demonstrate;
4. three proof points they may use and a list of prohibited claims;
5. a natural CTA to the scenario preview or early access;
6. disclosure requirements;
7. deliverables: one 20–35 second master, two hooks, two CTAs, raw footage, captions, and 9:16 safe-zone framing;
8. written organic and paid usage term, territories, edit rights, renewal price, and creator approval process.

### Initial concepts

- “I have a trip in 30 days; this is the restaurant conversation I’m practicing.”
- Split-screen “tourist answer vs. natural answer.”
- A partner or family member plays the other half of a conversation.
- “Pause and say the next line” challenge.
- A learner makes a mistake, laughs, retries, and completes the exchange.
- Product-building diary that clearly says “prototype” or “closed alpha.”

### Testing matrix

Test hook, creator, problem, demonstration, proof, and CTA separately. Start with 12 concepts × 2 hooks, then retain the top third by qualified-signup cost and post-click activation. Do not declare a winner on view rate alone.

Kill a creative after it reaches 1.5× the target cost per qualified signup with at least 1,000 impressions and no downstream activation signal. Refresh when frequency rises and qualified conversion declines for two consecutive reporting windows. Scale in 20–30% budget steps only when the seven-day cohort keeps its activation quality.

Compensation planning range (requires approval): $150–$400 per emerging creator concept plus usage, or $500–$1,500 for creators with proven production/audience fit. Performance bonuses should reward qualified activation, not raw clicks.

## 8. Funnel and lifecycle messaging

### Funnel

1. **Discovery:** social, YouTube, creator, search, referral, or partner.
2. **Intent page:** one situation-specific promise and preview.
3. **Early-access signup:** email, trip window, destination/goal, and explicit marketing consent. Optional fields stay optional.
4. **Qualification:** short survey or interview invitation.
5. **Activation:** complete the first conversation.
6. **Habit:** return for a second scenario and build a weekly speaking pattern.
7. **Conversion:** upgrade only when the paid capability is delivered and entitlement-gated.
8. **Retention/referral:** progress recap, next scenario, and a referral tied to useful access rather than spam.

### Email journeys

| Journey               | Trigger                                 | Sequence                                                                                        | Success measure                             |
| --------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Early access          | Confirmed consent                       | Welcome immediately; scenario preference day 2; useful mini-lesson day 5; research invite day 8 | Confirmed signup and research participation |
| Alpha invitation      | Eligibility + available seat            | Expectation/limits; access link; help path; reminder after 48h                                  | First conversation completed                |
| Activation rescue     | Signup but no first conversation in 24h | One-step resume link; obstacle question after 72h                                               | Activation within seven days                |
| Habit                 | First conversation complete             | Feedback recap; next scenario 2–3 days later; weekly progress                                   | Second conversation and W1 return           |
| Paid conversion       | Demonstrated paid-limit encounter       | Exact benefit, price/cadence, renewal, cancellation, and secure Checkout                        | Entitlement confirmed by webhook            |
| Cancellation/win-back | Authoritative billing change            | Access-end date; export/help; optional reason; win-back only with consent                       | Support resolution, not forced retention    |

Marketing messages require consent and one-click unsubscribe. Transactional identity, security, billing, and account messages must remain separate. Never place speech, transcript, translation, payment, or sensitive profile content in marketing tools.

## 9. Measurement and experimentation

### Stage-specific north stars

- Sprint 3.5: **qualified early-access signups who complete a research or prototype action**.
- Alpha/beta: **weekly learners completing at least two spoken conversations**.
- Mature product: **weekly speaking minutes per active learner**, the business plan’s proposed north star, after the metric is technically reliable.

### Privacy-aware event contrac

| Event                                  | Required properties                                                 |
| -------------------------------------- | ------------------------------------------------------------------- |
| `landing_viewed`                       | anonymous session, page/variant, consent state, coarse channel      |
| `primary_cta_clicked`                  | page, placement, creative/UTM, destination                          |
| `early_access_started`                 | page/variant, channel                                               |
| `early_access_completed`               | consent version, cohort, non-sensitive goal category                |
| `account_signup_started` / `completed` | channel, platform; no tokens or passwords                           |
| `scenario_started`                     | scenario ID, platform, app version                                  |
| `conversation_completed`               | scenario ID, duration bucket, attempt count; no audio or transcript |
| `second_session_completed`             | days since first activation                                         |
| `paywall_viewed`                       | entitlement key, placement, current plan                            |
| `checkout_started`                     | internal plan key, interval; no Stripe Price ID or card data        |
| `entitlement_activated`                | internal plan key, interval, source after signed synchronization    |
| `subscription_cancelled`               | internal plan key, tenure bucket, optional coded reason             |

Use first-party server events for signup, activation, and billing truth. Ad-platform events are optimization signals, not the system of record. Consent mode must prevent nonessential tags before consent where required. Document event owner, schema, retention, deduplication key, test case, and dashboard before a campaign launches.

### Weekly dashboard

- reach and qualified traffic by source;
- landing-to-confirmed-signup rate;
- cost per confirmed and cost per qualified signup;
- signup-to-first-conversation activation;
- time to first conversation;
- W1 and D30 retention when cohorts mature;
- weekly conversation completions and speaking minutes;
- paywall exposure, Checkout starts, signed entitlement activations, refunds, cancellations;
- creator/creative performance by downstream activation;
- support and claim complaints.

### Experiment rules

Every experiment has one hypothesis, primary metric, guardrail, minimum sample or time window, and next action written before launch. Do not optimize pre-product campaigns for cheap email alone; use qualified signup and later activation. One major variable changes per landing test. Archive losing claims so they do not reappear without new evidence.

## 10. Paid media

Paid media is a validation tool during Sprint 3.5, capped at an approved amount. Scale begins only after measured retention and LTV.

### Channel order

1. **Meta:** broad targeting and Advantage+ placements, using creator-style scenario ads; retarget only after consented traffic volume exists.
2. **Google Search:** high-intent phrases around upcoming Spanish-speaking travel and conversation practice; exact/phrase match first, rigorous negatives, no broad Display.
3. **TikTok:** Spark Ads from organic posts that already earn strong completion, saves, comments, and qualified clicks.
4. **YouTube Shorts/Demand Gen:** scenario demonstrations after the YouTube content system produces repeatable winners.
5. **Display remarketing:** only after sufficient consented traffic and evidence that it adds qualified conversions.

Planning benchmarks are orientation, not promises. WordStream/LocaliQ’s 2025 US Search benchmark reports Education & Instruction at $6.23 CPC, 11.38% conversion rate, and $90.02 cost per lead. Its 2025 Meta education lead benchmark is summarized at roughly $1.65 CPC and $28.22 per lead. A 2026 TikTok education estimate places in-feed CPM around $8–$14 and CPC around $1.00–$2.50; TikTok itself recommends meaningful daily budgets and advises limiting changes during learning. Auction, geography, objective, season, creative, and the definition of “lead” can move actual results materially.

Fluyo’s first planning ranges:

| Channel       | Planning range                            | First decision threshold                                                                             |
| ------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Meta          | $1.25–$2.50 CPC; $20–$45 qualified signup | Pause if qualified signup exceeds $45 after sufficient delivery; scale only with activation quality. |
| Google Search | $4–$8 CPC; $45–$100 qualified signup      | Keep only queries with clear trip/conversation intent and downstream qualification.                  |
| TikTok/Spark  | $8–$14 CPM; $1–$2.50 CPC                  | Promote organic winners; judge qualified signup and activation, not views.                           |

Sources accessed October 17, 2026:

- WordStream, [Google Ads Benchmarks 2025](https://www.wordstream.com/blog/2025-google-ads-benchmarks)
- The Ad Spend summary of LocaliQ, [Facebook Lead Ads Benchmarks for Education](https://theadspend.com/blog/facebook-leads-education)
- TikTok for Business, [budget best practices](https://ads.tiktok.com/resources/help/article/budget-best-practices)
- Stackmatix, [TikTok Ads Cost Benchmarks](https://www.stackmatix.com/blog/tiktok-ads-cost-benchmarks) (directional third-party estimate)

### Kill and scale policy

- Do not launch a conversion campaign without a tested destination, consent flow, conversion event, exclusions, and budget cap.
- Pause a campaign that reaches 1.5× target cost with adequate delivery and no qualified downstream action.
- Do not increase budget on a winner until at least one seven-day cohort shows acceptable activation.
- Increase budgets by 20–30% per adjustment; keep creative and bid changes separately identifiable.
- Stop all paid acquisition during a critical outage, broken signup/Checkout flow, claim mismatch, or attribution failure.

Meta, Google, and TikTok campaign tooling needs: approved account/business IDs, billing profile, pixel/tag IDs, conversion names, destination URLs, UTM convention, audiences/exclusions, geographies, age limits, budget caps, creative asset IDs, usage-rights expiry, and kill/scale thresholds. Credentials remain in the platforms’ secure connection mechanisms, never in repository files.

## 11. Affiliate and referral program

Two implementation choices:

1. A dedicated `/affiliates` page with terms, application, disclosures, payout rules, prohibited claims, creative kit, and tracking. This is the recommended path once paid subscriptions and cohort economics are stable.
2. A small partner block on the main landing page. This is suitable only for a limited launch cohort and becomes hard to govern as the program grows.

Recommended pilot hypothesis: 20% of net first-year subscription revenue or a fixed verified-activation bounty, a 30-day cookie window, no self-referrals, no trademark bidding, no coupon-site distribution, and reversal for refunds/fraud. Final terms require finance/legal review and observed gross margin. The creative kit should contain approved logos, product screenshots, availability labels, copy blocks, scenario clips, disclosure examples, deep links, and a dated claim sheet. Never promise creator income.

Before the affiliate system exists, use individually contracted creator links and manual reconciliation. Do not publicly invite affiliates into an unimplemented program.

## 12. Budget scenarios for the first 90 days

All amounts are planning envelopes in USD and require explicit approval before commitment.

| Workstream                               |  Lean $15k |  Base $45k | Accelerated $100k |
| ---------------------------------------- | ---------: | ---------: | ----------------: |
| Research incentives and bilingual review |      2,000 |      5,000 |            10,000 |
| Landing/demo creative and production     |      3,000 |      8,000 |            18,000 |
| Creator/UGC pilots and usage rights      |      4,000 |     12,000 |            28,000 |
| YouTube/social production support        |      3,000 |      8,000 |            16,000 |
| Paid validation media                    |      1,500 |      7,000 |            18,000 |
| Email/analytics/privacy tooling          |        500 |      2,000 |             4,000 |
| Contingency                              |      1,000 |      3,000 |             6,000 |
| **Total**                                | **15,000** | **45,000** |       **100,000** |

Recommendation: use the **lean** plan until the first conversation loop exists. Release the base-plan difference only after the Phase A gate. The accelerated plan is inappropriate before retention is measured.

## 13. Ninety-day execution calendar

| Week | Isabella / marketing                                                                                            | Product and experience dependency                                                                                   | Output / decision gate                                            |
| ---- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1    | Freeze claim inventory; define beachhead, interview screener, consent copy, UTM rules, and baseline dashboard.  | Engineering confirms implemented vs. planned capability list. Danila audits landing/app copy and visual experience. | Approved claim sheet and research brief.                          |
| 2    | Run 8–10 traveler interviews; map trigger, alternative, objection, and willingness to test.                     | Working local app and scenario wireframe available for observation.                                                 | Interview synthesis v1; no external product claims yet.           |
| 3    | Run 8–10 relationship/heritage interviews with representative recruitment; draft two landing variants.          | Privacy notice, durable waitlist endpoint, and accessible success/error states specified.                           | Message test ready.                                               |
| 4    | Complete 30 interviews; choose one beachhead message and five content pillars.                                  | Danila’s revised landing is locally reviewable; analytics events are testable.                                      | Phase A research gate review.                                     |
| 5    | Soft-launch early-access landing to owned contacts and communities; start weekly anchor scenario.               | Consent, deletion, analytics, mobile layout, reduced motion, CTA destination, and console pass audit.               | First 100 unique visitors; fix funnel defects.                    |
| 6    | Begin Fernanda’s three-posts-per-day social system; recruit first six UGC creators and five partner interviews. | Product demo/prototype is accurately labeled.                                                                       | Content/creator baseline and rights log.                          |
| 7    | Launch capped Meta message test and high-intent Search test if approved; send first useful email.               | Server-side signup truth and dashboard reconciliation work.                                                         | Cost per confirmed and qualified signup by source.                |
| 8    | Review at least 500 unique visitors per viable variant or apply predeclared decision rule; stop weak claims.    | Alpha scenario acceptance criteria fixed.                                                                           | Winning message or explicit “no winner” decision.                 |
| 9    | Produce 12 UGC concepts with two hooks each; partner beta waitlist opens.                                       | First scenario loop works locally end to end.                                                                       | Creative matrix and closed-alpha cohort plan.                     |
| 10   | Invite first alpha cohort; launch activation and rescue emails.                                                 | Support, feedback, error logging, and data deletion are operational.                                                | Activation and time-to-value baseline.                            |
| 11   | Cut losing creatives; expand best scenario into YouTube/SEO/email/social package.                               | Critical alpha defects resolved before cohort two.                                                                  | W1 behavior and qualitative learning report.                      |
| 12   | Invite cohort two; draft accurate App Store/Play Store message and screenshot storyboard.                       | Mobile build plan identifies feature-complete beta date and billing boundary.                                       | Store creative brief based on available beta scope.               |
| 13   | Hold 90-day gate review; publish the next-quarter marketing backlog and budget recommendation.                  | Product reports activation, retention, quality, privacy, and release readiness.                                     | Continue alpha, enter native beta marketing, or pause and repair. |

## 14. Ownership and operating rhythm

| Owner                         | Accountability                                                                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isabella                      | Positioning, claims, funnel, research, lifecycle, paid validation, partnerships, dashboard, weekly growth decision.                                            |
| Fernanda                      | TikTok and Instagram business setup, three-posts-per-day calendar, community management, social reporting, organic-to-paid candidates.                         |
| Danila                        | Landing and application experience recommendations and implementation coordination: fun, motion, images, accessibility, mobile, reduced motion, CTA integrity. |
| Engineering owner / Adriana   | Local development environment, learning loop, event implementation, release quality, store build plan, privacy/security boundaries.                            |
| Curriculum/bilingual reviewer | Language accuracy, dialect/cultural context, scenario pedagogy, unsafe or misleading content review.                                                           |
| User / business owner         | Budget, production/publication, pricing/package, store release, and material product approvals.                                                                |

Weekly 45-minute growth review:

1. product and funnel reliability;
2. stage KPI vs. predeclared threshold;
3. strongest/weakest message and creative;
4. customer evidence and claim complaints;
5. one continue, one stop, and one next experiment;
6. named owners and due dates.

## 15. Launch blockers and required handoffs

1. **Landing claims:** current standalone page presents planned features as available. Replace with a status-accurate early-access page before traffic acquisition.
2. **Waitlist:** connect the form to a durable, consented system with confirmation, unsubscribe, deletion, deduplication, rate limiting, and safe error handling.
3. **Learning value:** billing is working, but the paid learning capabilities are not yet implemented. Do not drive paid upgrades until the purchased value exists and entitlements gate it.
4. **Analytics:** implement and test the event contract without collecting speech/transcript content.
5. **Curriculum proof:** appoint a bilingual educator/reviewer before publishing teaching assets at scale.
6. **Creative rights:** store contract, disclosure, usage term, territory, and expiry for every creator asset.
7. **Mobile/store readiness:** store marketing starts from the verified beta scope, not the 20-feature vision.
8. **Support and safety:** define escalation, refund/help paths, translation disclaimers, and incident communication before public beta.

## 16. Source of truth

Product availability and claims must be reconciled against the current repository, acceptance evidence, and release notes before every campaign. Key internal sources at preparation time:

- `README.md`
- `docs/ROADMAP.md`
- `docs/PRD.md`
- `docs/BUSINESS_PLAN.md`
- `docs/BILLING_VERIFICATION_2026-10-16.md`
- `docs/adr/0003-forge-compatible-billing-foundation.md`
- current web routes and Stripe plan-catalog code

If these sources disagree, the implemented and verified application behavior wins. Marketing should remove or qualify the claim until the conflict is resolved.
