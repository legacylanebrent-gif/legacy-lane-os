# CHAPTER 25 — ESTATESALEN CROSS-AUDIT REPORT
**Company Knowledge, SOPs, Relationships & Organizational Learning**

**Date:** 2026-10-22 · **Mode:** AUDIT ONLY — no builds, no data changes, no deploys, no Chapter 26.
**Method:** Source-traced audit of deployed entities, RLS, backend functions, shared modules and pages; no inference from names, UI copy, comments or roadmap.

---

## EXECUTIVE SUMMARY

- **Coverage:** Of 133 Chapter 25 promises: ~50 ✓ EXISTING/SUPPORTED (≈38%), ~30 △ ENHANCE, ~22 ＋ BUILD, ~12 P2, ~5 LATER/manual, remainder satisfied at task level rather than SOP level. The **Relationship Loop is the strongest architecture in the platform**; the **Knowledge Loop is the weakest**.
- **Strongest existing architecture:** (1) Chapter 18 permission-based buyer CRM — `buyerAudience` function verified line-by-line: explicit-only consent with per-channel provenance, deterministic identity reconciliation, explainable match with RELEVANT ≠ CONTACTABLE, cross-sale buyer timeline; (2) Chapter 19 deterministic authority matrix + Ask-for-Help escalation; (3) Chapter 23 per-sale learning (post-sale review, near-miss corrective actions, owner-hours economics); (4) Chapter 24 AI governance (authorize-first, provenance, manual fallback kit).
- **Largest gaps:** No searchable company knowledge base (vault search is title-regex, operator-only); no SOP lifecycle (no steps/decision points/exceptions/completion standard, no change log, no effectiveness review); no AI assistant grounded in company documents; no cross-sale pattern review; no manager role; no owner-dependency report; one fixed platform task template (not sale-type or company-owned).
- **P0 found: NONE.** No cross-company leak, no consent bypass, no AI-approved-policy path (none exists to bypass), no knowledge-search permission bypass (employees cannot search documents at all — the gap is availability, not exposure).

## COMPANY KNOWLEDGE
＋ BUILD. `BusinessDocument` is a private document **vault** (operator/admin-only RLS, signed URLs, categories, version int, expiration warnings) — genuinely DOCUMENT STORAGE. It is not company knowledge: no full-text or content search (page search = title `$regex` only, `BusinessDocuments.jsx:44`), no employee-facing retrieval, no procedure semantics, no recurring-answer capture. **DATA STORAGE ≠ COMPANY KNOWLEDGE** — the doctrine is currently a true description of the gap.

## SOPs
△ ENHANCE. `category: POLICY` + `policy_type` ("Sale-Day Procedure" is an enumerated example) can hold a procedure **as a file**, and `PolicyAcknowledgment` anchors who acknowledged which **version**. But: no DRAFT/APPROVED distinction (status is ACTIVE/REVIEW/ARCHIVED — lifecycle states, not approval states), no structured steps, no obsolete-vs-current marking beyond ARCHIVED. Approved vs draft vs notes vs training **cannot be distinguished** structurally.

## SOP APPROVAL / VERSIONING
△ ENHANCE. Version: ✓ — integer incremented on file replace; acknowledgments snapshot `acknowledged_version` so a replaced policy is never silently covered. Approval provenance: partial — `uploaded_by` + operator-only writes mean "approved = the operator uploaded it"; there is **no who/when/what-changed/why change log**, and no approval act distinct from upload.

## PROCEDURE EXCEPTIONS
＋ BUILD. Exceptions are captured as records (SaleIssue categories, override provenance on research/price paths, walkthrough `exception_note`) but are **never linked to a normal-path procedure** — there is no procedure to link to.

## EMPLOYEE INPUT
✓/△. Employees submit observations through Ask-for-Help → `SaleIssue` (with photo, urgency, `requested_by_name`) and team notes; near-miss `corrective_action` carries a free-text suggestion. Input exists; **it is not a structured improvement-submission path** and nothing routes it toward policy.

## IMPROVEMENT LOOP
BROKEN AT TWO SEAMS. OBSERVATION→LESSON: ✓ (SaleIssue, SaleRecap.post_sale_review "what didn't / change next time", near-miss impact/control fields). LESSON→PROPOSED CHANGE: △ (corrective_action.action_type enumerates SALE_TASK/POLICY_SUGGESTION/TRAINING_ITEM/SYSTEM_IMPROVEMENT — but POLICY_SUGGESTION and TRAINING_ITEM are **note text only**, no destination record). PROPOSED→APPROVED VERSIONED SOP: ✕ (no destination). EMPLOYEE USE / EFFECTIVENESS REVIEW: ✕. The loop exists from WORK to LESSON and stops.

## BUYER COMMUNITY
✓ EXISTING (Ch18). Verified: audience cards built only from the operator's own sales/events; PII (phone/address/zip) never returned; `identity_notes` deterministic; `totals` include audience, email_eligible, sms_eligible, vip, followers, interests_known, repeat_attendees, purchasers.

## CONSENT
✓ EXISTING. `sms_marketing_opt_in` completely separate from email; `email/sms_consent_source` + `_at` + `_opt_out_at` provenance per channel; `buyerConsent.ts` doctrine: opt-out/suppression ALWAYS wins, merges never make consent more permissive, unknown = not eligible. Attendance/purchase/offer/sign-in never create consent (verified in `buyerAudience` — no consent write anywhere in it).

## BUYER INTERESTS
✓ EXISTING. Explicit-only: `ConsumerMarketingProfile.interest_categories`, `BuyerIntent`, `WantedItem`; match reasons label source per signal ("Declared interest…", "Previously purchased…" — declared ≠ offer ≠ purchase).

## SEGMENTATION
△. Interest/flag segmentation ✓. Reseller/collector segmentation exists only as **self-declared profile entities** (`ResellerProfile`, `CollectorProfile`) outside the audience view — no profiling beyond business relationship data (good); no audience-facing segmentation by them.

## REPEAT BUYERS
✓ EXISTING. Deterministic identity reconciliation (same verified email / same authenticated user; name similarity NEVER merges) → `sales_attended`, `repeat_attendees` total. Repeat-buyer rate formula: `repeat_attendees / audience` (cards with `sales_attended > 1`).

## REFERRALS
✓/△. Link + opaque code resolver (`resolveReferralCode` — no user enumeration, safe failure) + QR (`generateReferralQR`) ✓. Full chain: landing → inquiry (`submitPartnerReferredInquiry`) → deal with `referral_source_type/name/contact_id` → sale projection ✓ (Ch10/11). Gaps: `Referral.status` tracks **SaaS signup/subscription outcomes**, not estate-project outcomes — referral-to-**sale** history requires manual correlation; no verified automatic thank-you (reward processing functions exist; thank-you send unverified — draft ≠ sent doctrine stands).

## POST-SALE REVIEW
✓ EXISTING (Ch23). `SaleRecap.post_sale_review` (what_worked/what_didnt/surprised_us/change_next_time/team_input) + `would_take_ten_more` — operator-owned, never AI-written, never client-facing.

## NEAR MISSES
✓ EXISTING (Ch23). `SaleIssue` near-miss layer: `control_weakness` category, `impact_avoided_note`, corrective action reusing canonical destinations.

## SUCCESS REVIEW
✓ EXISTING (what_worked + would_take_ten_more=YES capture unusual success). **Success → reusable practice has no destination** (same missing SOP seam as failures).

## EMPLOYEE LEARNING
✓/△. `TeamMember.skills_detail` (honest sources: PREFERRED/EXPERIENCED/TRAINED/MANAGER_OBSERVED), `preferred_roles`, `training_records` (factual history, document-linked), `document_checklist`, `SaleStaffAssignment` responsibility history ✓. No performance→assignment recommendation (correctly absent; no invented scoring).

## PROVIDER LEARNING
✓ EXISTING (Ch22). `completion.performance_note`, `Donation.performance_note`, confirmation states, operator verification — factual, private per company, never public reviews. Cross-assignment history visible to the owning operator only; no cross-company leak.

## PROJECT TEMPLATES
△. One FIXED platform template (`saleActivationTemplate.ts`, 15+2 tasks, idempotent, mirrored with SaleTasks DEFAULT_TASKS). Not sale-type-specific, not company-owned, not editable, no optional modules, no role/deadline inheritance beyond creation. No stale-truth cloning risk (good), but no company learning inheritance either.

## MANAGER OPERATING SYSTEM
✕ ABSENT. No manager role exists — RLS is operator/admin; sale-team members get `mySaleDay` (own day, least-privilege, verified projection rules). No non-owner manager view. ＋ BUILD if the book promises one.

## AI COMPANY ASSISTANT
✕ ABSENT AS SPECIFIED. Two coaches exist: `aiCoach` (generic business coaching — its prompt even advises "build SOPs" but reads **no company documents or records**) and `operatorAiCoach` (Ch24: authorize-first, sale-scoped, city/state only, hedged language). **Neither answers from approved procedures/policies.** No employee-facing assistant, no source display.

## DOCUMENTATION QUALITY
△. Vault hygiene is strong (private storage, expiration engine with idempotent reminders, version-anchored acknowledgments, RLS). Content/searchability/lifecycle are the gaps, not safety.

## HUMAN TOUCHPOINTS
△. Communication plan (cadence informs human updates; nothing auto-sent), client day plan, CALL CLIENT is creatable as a plain SaleTask. No deterministic "human conversation appropriate" flag; no emotional inference anywhere (correct).

## BUYER BUSINESS ASSET
✓. The $12 buyer is preserved: purchases, attendance, offers, follows, interests, VIP across sales on one reconciled card; value not limited to today's transaction; consent gates all outreach.

## OWNER DEPENDENCY
△/✕. Owner hours by activity ✓ (Ch23 `LaborEntry.is_owner_time`, owner-share/labor-efficiency economics). Escalations to owner are captured per-sale (Ask-for-Help SaleIssues). **No owner-question log, no dependency report, no delegation surfacing** — owner dependency is visible only as raw records, not as a report. ＋/P2.

## OPERATING RHYTHM (126)
Traced on canonical records:
| Handoff | Source truth | Trigger | Dest | Auto/Human | Gap |
|---|---|---|---|---|---|
| Lead→Consultation | SaleConversionPipeline (+bridgeInquiryToDeal) | inquiry | consultation block/deal stage | Human (deterministic seed) | — |
| Consultation→Agreement | consultation + recommendation | operator | SaleProposal/SaleAgreement | Human | — |
| Agreement→Activation | accepted proposal + executed agreement | operator | activateSale (idempotent tasks, provenance snapshot) | Human-triggered, auto-instantiated | — |
| Activation→Preparation | SaleTask template + prep zones | activation | PrepZones/Discovery/Items | Human | — |
| Preparation→Sale | readiness/staging states | operator | status upcoming/active | Human | — |
| Sale→Pickup & Disposition | Order/PaymentAttempt/Releases | checkout | Item.releases / post_sale_disposition | Human, guarded (setItemDisposition) | — |
| Disposition→Reconciliation | transition events + orders/refunds | completion | Reconciliation/CashSession | Human, guarded | — |
| Reconciliation→Settlement | SaleRefund, orders | finalize gates | SettlementStatement (refund-aware waterfall) | Human, gated | — |
| Settlement→Project Close | settlement + transition + access_closeout | approveTransitionCompletion | closeout | Human, gated | — |
| **Project Close→Learning** | SaleRecap review | operator, optional | post_sale_review / TenMore | **Human, OPTIONAL, NO DESTINATION** | **BROKEN SEAM — learning dead-ends** |

## ESTIMATE / PRICING / MARKETING / LABOR / BUYER / PROCESS LEARNING
- **Estimate:** ✓ Ch23 — projected labor categories vs LaborEntry actuals; owner-time excluded from cash cost.
- **Pricing:** △ — DATA EXISTS (`original_price` opening snapshot, Activity price history, `ItemPriceHistory`, sold_price, offers, discount schedule) — **NO LEARNING REPORT** compares asking→offer→sold.
- **Marketing:** △ — `MarketingCampaignPerformance`/`SaleMarketingPerformance`/`OperatorMarketingPerformance` + explicit `discovery_source` (attendance-stated, never timing-inferred). Attribution strictness preserved; no closed-loop win analysis.
- **Labor:** ✓ Ch23.
- **Buyer:** ✓ Ch18.
- **Process:** △ — reviews capture lessons; nothing aggregates them across sales.

## COMPANY BRAIN TEST
| Question | Source exists? | Searchable? | Role-appropriate? | Current version? | Source shown? | Escalation? |
|---|---|---|---|---|---|---|
| Policy for holds | ✓ authority matrix HOLD row (My Sale Day) | ✗ (in-context only, not searchable) | ✓ | n/a (deterministic derivation) | ✓ deterministic | ✓ |
| Buyer "paid" but record UNKNOWN | ✓ matrix PAYMENT_ISSUE + ManualFallbackKit + SaleIssue 'payment' | ✗ | ✓ | ✓ (kit is Ch24-current) | ✓ | ✓ |
| Who approves HIGH_VALUE price change | ✓ matrix PRICE_CHANGE_HIGH_VALUE + itemHold/changeItemPrice enforcement | ✗ | ✓ | n/a | ✓ | ✓ |
| Client authority unclear | ✓ matrix CLIENT_INSTRUCTION + SaleAuthority + SaleClientDecision | ✗ | ✓ | n/a | ✓ | ✓ |
| Pickup procedure, paid furniture | ✓ Item.releases + pickup_requirements + PICKUP_RELEASE row | ✗ | ✓ | n/a | ✓ | ✓ |
| Internet/payment outage | ✓ ManualFallbackKit (printable) | ✗ (must know it exists) | ✓ | ✓ | ✓ | ✓ |
**Verdict: answers exist as deterministic in-context guidance, NOT as a searchable knowledge system. A note someone cannot find is not a useful operating system — that doctrine is currently literally true.**

## SOP MATURITY MATRIX
**No structured SOPs are deployed.** The nearest artifacts: BusinessDocument POLICY files (version ✓, owner ✓ operator, steps/decision points/exceptions/escalation/completion ✗ — content lives inside an opaque file), the activation task template (ordered steps ✓, completion via status ✓, but platform-fixed), and the authority matrix (decision points + escalation ✓, no versioning needed — derived). LAST REVIEW: expiration-based only, no effectiveness review anywhere.

## KNOWLEDGE LIFECYCLE MATRIX
OBSERVATION ✓ → LESSON ✓ → PROPOSED CHANGE △ (suggestion text only) → REVIEW ✗ → APPROVAL ✗ → VERSIONED SOP ✗ → TRAINING △ (manual training_records) → EMPLOYEE USE △ (assigned policies only) → EFFECTIVENESS REVIEW ✗. **Broken seams: lesson→review, approval→SOP, use→effectiveness.**

## BUYER RELATIONSHIP MATRIX
BUYER IDENTITY ✓ (deterministic reconciliation, never name-based) · CONSENT ✓ (explicit, per-channel, provenance) · CHANNEL ELIGIBILITY ✓ (email_ok/sms_ok separate; phone presence required for SMS, PII never returned) · INTEREST ✓ (declared-only) · PURCHASE HISTORY ✓ (Purchase + Order by buyer_id) · ATTENDANCE ✓ (EarlySignIn + CheckIn, exit events approximate) · ENGAGEMENT △ (platform events in-app; email/SMS engagement lives in Customer.io, not in the app's buyer record) · REFERRAL HISTORY △ (separate Referral system, same user id, no explicit link) · REPEAT ACTIVITY ✓ · NEXT-SALE MATCH ✓ (explainable, consent-aware).

## BUYER MATCH TRACE
Records-buyer: declared "records" interest + prior records purchase → match reason "Declared interest in records" + "Previously purchased … from you" → **relevant = YES**; email consent recorded → **email_eligible = YES**; no SMS consent → **sms_eligible = NO** (additionally requires a phone on file). **TRACE PASSES in code** (`buyerAudience` match action + `buyerConsent`), including merge-safety: reconciliation over ALL records can never make SMS eligible.

## UNSUBSCRIBE TRACE
Buyer unsubscribes email → `email_opt_out_at` / `suppression_status: unsubscribed_all` on the profile; `buyerConsent` treats opt-out/suppression as always-winning; audience `email_ok = false` **even if another merged record carries an affirmative flag**; SMS eligibility untouched (separate channel, separately revocable); history preserved (profile retained, timeline intact). Per-company unsubscribe additionally exists (OperatorFollowerSubscription via MarketingPreferences) without killing global alerts. **TRACE PASSES.**

## $12 CUSTOMER TRACE
Sale A purchase → card keyed by buyer user id → Sale B attendance reconciled (same verified email) → joins category interest (`BuyerIntent`/profile interests, explicit) → later refers a seller via own referral code → Referral record + deal `referral_source_*`. **One identity survives all events** within the buyer-audience card; the referral leg lives in the separate Referral system under the same user id with **no explicit cross-link** — preserved but not joined (△, not ＋ — a report join suffices).

## REFERRAL TRACE
Buyer/contact → code (opaque resolver, no enumeration) / QR → seller inquiry → `referral_source_type/name/contact_id` on the pipeline deal → consultation → project → outcome: attribution **survives the whole chain** (verified in schemas + Ch10/11 certified flows); the reverse leg (completed project → referrer outcome/reward) is **not connected** (Referral tracks signup/subscription states only).

## EMPLOYEE KNOWLEDGE TRACE
Employee discovers better prep method → records it as SaleIssue note / near-miss corrective_action note (attribution: `requested_by_name`, `recorded_by_name` ✓) → **human review: only as an issue the operator reads** → approved SOP: ✗ no destination → team availability: only if the operator manually re-briefs. **Knowledge does NOT survive employee departure in any structured way — the Ch25 core promise is the gap, not the existing state.**

## NEAR-MISS → SOP TRACE
Ch23 example (paid Item nearly in cleanout) → near miss recorded ✓ → `control_weakness: process` ✓ → corrective_action POLICY_SUGGESTION (text) ✓ → **human approval of an SOP change: ✗ → versioned SOP/training/checklist: manual only → effectiveness review: ✗.** The structural guard itself (protected-merchandise rejection in `setTransitionEventScope`) IS the inherited fix that protects every future sale — the protection generalized even though the procedure did not.

## SUCCESS → SOP TRACE
✗ No destination. Success is captured per-sale (what_worked, would_take_ten_more) but cannot become reusable practice. Only failures produce (suggestible) changes today.

## OWNER QUESTION TRACE
Routine questions reaching the owner ARE captured (Ask-for-Help SaleIssues with requester, urgency, category — deterministic, per-sale). Frequency/pattern/missing-procedure detection: ✗ (no cross-sale owner-question view). Delegation candidacy: ✗. Current support = capture; intelligence = P2.

## PROVIDER LEARNING TRACE
Provider performs well across assignments → operator's own Donation/Cleanout `performance_note` + completion states accumulate ✓ → future operator (same company) sees them ✓ → **no cross-company exposure** (RLS operator-anchored; Vendor/Profile directory records hold no performance data) ✓.

## PROJECT TEMPLATE TRACE
New routine sale inherits: the fixed 17-step task set (idempotent) ✓, sale-team/zone architecture ✓. It does NOT inherit: company-learned tasks, sale-type variants, optional modules, deadlines/roles. No stale-project cloning (templates are code constants, not copied records) ✓.

## HUMAN TOUCHPOINT TRACE
Repeated unresolved client decisions are visible deterministically per-sale (open SaleClientDecision requests, ANSWER OVERDUE). A "CALL CLIENT" SaleTask is creatable. **No system-generated call task from repeated-decision signals** — the operator must notice. △.

## COMPANY KNOWLEDGE SECURITY TRACE
Employee asks assistant: today the only sale-scoped AI is `operatorAiCoach` — company/sale question → allowed only for operator/team-member/admin (authorize-first verified Ch24); **another company's sale → 403/404 before any context** ✓; private client data outside role → not in context (city/state only; access plans, addresses, economics excluded) ✓. There is no company-policy AI today, so the policy-answer path is untested by absence, not by design.

## ENTITY TESTS
**No new core entities required.** Verdicts: KnowledgeBase ✕ (build search over BusinessDocument + structured procedure fields instead); SOP entity ✕ if BusinessDocument gains procedure semantics (gap is NOT semantic damage — it is missing fields: structured steps array, decision points, exceptions, completion standard, approval/change log, role tags, review date — all fit as additive object fields like every prior chapter); Improvement ✕ (SaleIssue.corrective_action + SaleTask + a future SOP destination suffice); BuyerLearning ✕; OwnerQuestion ✕ (SaleIssue query view suffices); CompanyBrain ✕; ProcessLearning ✕.

## P0
**NONE FOUND.** Specifically checked: cross-company knowledge leak (BusinessDocument/TeamMember/policy RLS operator-admin-only — safe); AI assistant RLS bypass (no document-grounded AI exists; operatorAiCoach fails closed); employee out-of-role reads (vault unreadable by staff entirely — gap is availability); buyer consent bypass (opt-out always wins, verified in code); unsubscribed buyer in campaigns (suppression checked at eligibility computation — not verified against every campaign sender, but the canonical audience/match paths enforce it; sendOperatorCampaign path carries the Ch18 doctrine); AI-approved SOP (no AI writes documents); provider performance leak (operator-anchored); template sensitive-data copy (code constants only). Residual watch-item, not P0: verify the `policyAcknowledgments` server seam only serves documents **assigned** to the calling team member (not traced this audit; RLS makes direct reads impossible, the seam is the only staff view path).

## P1 (smallest set to make Chapter 25 substantially true — DO NOT IMPLEMENT)
1. **SOP semantics on BusinessDocument (additive):** structured `procedure` object (purpose, owner role, ordered steps, decision points, exceptions, escalation, completion standard), APPROVED/DRAFT status distinct from ACTIVE/ARCHIVED, change log (who/when/what/why) alongside version, role tags, next-review date.
2. **Employee-readable approved-knowledge view** (filtered search over APPROVED procedures/policies scoped to the caller's company + role), reusing the policyAcknowledgments seam pattern.
3. **Improvement destination:** corrective_action POLICY_SUGGESTION/TRAINING_ITEM create a real proposed-change record (reuse SaleIssue/BusinessDocument review status) — closing LESSON→REVIEW→APPROVAL.
4. **Effectiveness review date + revisit task** on approved procedure changes (reuse SaleTask).
5. **Cross-sale pattern view** for the operator: SaleIssue/near-miss aggregation by category (deterministic counts, no AI thresholds).
6. **Grounded company Q&A:** answer employee questions from APPROVED procedures with source display, authority-aware ("you cannot decide this — escalate"), Ch24 governance; AI drafts only.
7. **Buyer→referral cross-link + referral-outcome projection** (join, not a new entity).
8. **Owner-dependency report:** owner hours by activity + owner-escalation counts (deterministic, reuse Ch23 economics + SaleIssue).

## P2
Workflow exception analytics · manual-workaround pattern detection · incomplete-procedure alerts · AI process review · recurring-problem detection · high-performance workflow detection · cross-sale AI pattern detection · document usage analytics · unused-document review · duplicate-procedure alerts · communication frequency controls · automation-balance review · advanced engagement analytics · owner-question pattern detection · delegation recommendations · AI owner-dependency coach (Ch26).

## LATER
Semantic company knowledge graph · process mining · predictive workflow recommendations · cross-project process intelligence · anonymized cross-company benchmarks · organizational-learning AI.

## READY-TO-USE TOOLS (all 40)
1 SOP template → ✎ BOOK/PRINTABLE (until P1-1) · 2 SOP creation worksheet → ✎ · 3 Process observation sheet → ↔ SaleIssue/near-miss fields already capture it interactively (INTERACTIVE BETTER) · 4 Workflow map → ✎ · 5 Decision-tree template → ✎ (authority matrix is the interactive core) · 6 Exception/escalation guide → ✓ INTERACTIVE BETTER (authority matrix + Ask for Help) · 7 Procedure-change request → SMALL ENHANCEMENT (P1-3) · 8 SOP version log → SMALL ENHANCEMENT (P1-1 change log) · 9 Team procedure update → ＋ (P1-2 surfaces it; no delivery mechanism) · 10 Best-practice submission → SMALL ENHANCEMENT (P1-3) · 11 KB article template → ✎ · 12 Owner-question log → SMALL ENHANCEMENT (SaleIssue query view) · 13 Owner-dependency audit → P1-8 · 14 Delegation worksheet → P2 · 15 Authority matrix → ✓ INTERACTIVE BETTER (deterministic, shared server-side) · 16 Buyer signup form → ✓ INTERACTIVE BETTER · 17 Buyer communication preferences → ✓ INTERACTIVE BETTER (MarketingPreferences) · 18 Buyer interest form → ✓ INTERACTIVE BETTER · 19/20 Email/SMS consent record → ✓ INTERACTIVE BETTER (provenance fields) · 21 Buyer category sheet → ✓ (interest categories) · 22 VIP signup → ✓ INTERACTIVE BETTER · 23 Referral card → ✓ INTERACTIVE BETTER · 24 Seller referral QR → ✓ INTERACTIVE BETTER · 25 Referral-source record → ✓ (deal referral_source_* + Contact) · 26 Repeat-buyer report → ✓ INTERACTIVE BETTER (audience totals) · 27 Buyer engagement report → △ (timeline exists; cross-channel P2) · 28 Post-sale review → ✓ INTERACTIVE BETTER · 29 Success review → ✓ (capture) · 30 Root-cause worksheet → ✓ INTERACTIVE BETTER (near-miss control/impact fields) · 31 Near-miss report → ✓ INTERACTIVE BETTER · 32 Corrective-action plan → ✓/△ (destinations partial) · 33 Process-improvement proposal → SMALL ENHANCEMENT · 34 Improvement effectiveness review → P1-4 · 35 Employee strengths review → ✓ INTERACTIVE BETTER (skills_detail honest sources) · 36 Provider performance review → ✓ INTERACTIVE BETTER · 37 Sale-type template → GENUINE SOFTWARE GAP (P1 territory) · 38 Project template → GENUINE SOFTWARE GAP (company-ownable template) · 39 Company knowledge audit → ✎ BOOK (quarterly checklist) · 40 Quarterly systems review → ✎ BOOK.

## BOOK TRUTH (every Chapter 25 promise)
✓ EXISTING: 3,5,14,15*,21,24,31,32,33,34,35,36,37,38,41,42,44,46,47,48,49,50,51,52,54,55,56,57,58,61,63,64*,65*,66,67,68,69,73,74,75,81,82,83,84,85,90*,92,93,94,113,116,117,118,124,126,127,130,131,132 (*at task/record level or self-declared profile, not full promise).
△ ENHANCE: 2,10,16,17,19,22,26,27,28,39,40,45,53,59,60,62,72,76,78,86,87,108,111,112,119,120,121,128,129,133.
＋ BUILD: 1,4,6,7,9,11,12,13,20*,23,25,29*,30,43,79,88,90,95,96,97,99,100,104,105,122.
P2: 18,20,43,70,72,80,101,102,103,115,123.
LATER/Ch26: 125.
Overstated promises requiring book rewording: Company Knowledge Base, Quick Answers, SOP Builder, AI Procedure Draft, Real-World Workflow Review, Team Change Notice, Training Update, Review Date, Version History (partial), AI Company Assistant, Source-Based Answers, Authority-Aware Answers, Document Usage, Searchable Knowledge, Sale-Type Templates, Manager Dashboard, Owner Dependency Report, Recurring Problem Alert, High-Performance Workflow, AI Pattern Detection, Delegation Opportunities, Effectiveness Check, Frequency Controls, Engagement History (cross-channel), Automatic Thank-You, Referral-to-Sale History.

## REQUIRED BOOK WORDING CHANGES (exact replacements)
- "A searchable company knowledge base" → "A private company document vault with version-tracked policy acknowledgments; searchable approved-knowledge retrieval is a planned enhancement."
- "SOP Builder with AI-drafted procedures" → "Procedures are stored as versioned policy documents; AI-drafted, structured SOPs are a planned enhancement (AI will never approve policy)."
- "The AI Company Assistant answers from your approved procedures" → "Sale-scoped AI coaching answers from your project records with authorization checks; document-grounded company Q&A is a planned enhancement."
- "Employees find quick answers without the owner" → "Employees get deterministic authority guidance and escalation paths on their sale day; question search is a planned enhancement."
- "The system reviews whether fixes worked" → "Improvements can carry a scheduled review task; automated effectiveness analysis is future."
- "Automatic thank-you to referrers" → "Referral rewards are processed by workflow; thank-you messaging is operator-reviewed."
- "Manager dashboard" → "Owner and employee views exist; a dedicated non-owner manager view is planned."
- "The platform detects recurring problems across sales" → "Problems are captured per sale; cross-sale pattern detection is future."

## DO-NOT-REBUILD
Already satisfied by earlier chapters — do not re-implement in Ch25: lead/referral-source tracking (Ch10/11), task templates/activation/project structure (Ch13), buyer CRM/consent/interests/matching/alerts (Ch18), team/authority/training/Ask-for-Help (Ch19), operational issues/incidents (Ch20), payment/transaction truth (Ch21), provider performance (Ch22), post-sale review/economics/near-miss/owner-hours (Ch23), AI governance/provenance/fallback (Ch24), plus BusinessDocument/PolicyAcknowledgment, SaleTask, SaleIssue, SaleRecap, TeamMember, SaleStaffAssignment, SaleConversionPipeline, buyer identity/consent, Customer.io outbox, existing AI coaches.

## PRODUCT DOCTRINES
All Chapter 25 doctrines are **confirmed as doctrines** — none contradicts the deployed architecture. Notably already embodied in code: RELEVANT ≠ CONTACTABLE, AI never approves, observations ≠ facts, honest sources, opt-out always wins, standardize routine/escalate exception (authority matrix), employee experience must survive the employee (**currently the doctrine the platform does NOT yet meet — it is the Ch25 P1 thesis, not a description**).

## RECOMMENDED IMPLEMENTATION SEQUENCE (DO NOT IMPLEMENT)
P1-1 SOP semantics → P1-2 employee knowledge view → P1-3 improvement destination → P1-4 review dates → P1-5 pattern view → P1-6 grounded Q&A (last — it depends on 1+2) → then P1-7/8 joins and reports. Rationale: approval/versioning before search before AI grounding — Chapter 24's authorize-then-ground order applied to knowledge.

## PRE-LAUNCH DEPENDENCIES (carried, not Ch25 defects)
Ch19 genuine non-owner HIGH_VALUE/client-decision denial · Ch20 Attendance exit/manual confirmation if open · Ch21 428px physical-device pass · Ch22/23 second-company isolation · Ch24 AI coach/comparable second-user isolation · Ch24 access-closeout empty-state visual confirmation (fix applied, re-verify) · policyAcknowledgments seam assignment-scoping check (new, from this audit) · 13 undeclared backend secrets (B1-02).

## FINAL CERTIFICATION

# **GO WITH CONDITIONS**

**Conditions:**
1. Apply the REQUIRED BOOK WORDING CHANGES above before publishing Chapter 25 — the knowledge-loop promises must not ship as descriptions of today's system.
2. Land P1-1 and P1-2 (SOP semantics + employee-readable approved knowledge) before marketing any "company knowledge" capability.
3. No AI may write, approve, or publish an approved procedure — Chapter 24 doctrine carries into any Ch25 build.

**STOP. Chapter 25 not implemented. Chapter 26 not started.**