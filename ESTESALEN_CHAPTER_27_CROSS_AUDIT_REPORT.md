# CHAPTER 27 — ESTATESALEN CROSS-AUDIT REPORT
## THE FIRST 90 DAYS / LAUNCH MODE / FIRST-SALE GUARDRAILS / QUARTER TWO

**AUDIT ONLY — nothing was built, deployed, or written to production data.**

**Central question:** CAN A BRAND-NEW OPERATOR MOVE THROUGH THE EXISTING ESTATESALEN OPERATING SYSTEM IN THE RIGHT ORDER FOR THEIR FIRST 90 DAYS?

---

## EXECUTIVE SUMMARY

Of the 137 classified Chapter 27 promises:

| Classification | Count | ~% |
|---|---|---|
| ✓ EXISTING / SUPPORTED (verified artifact) | 79 | 58% |
| ↔ COVERED BY EXISTING SYSTEM | (included above) | — |
| △ ENHANCE / ＋ ORCHESTRATION LAYER (P1) | 23 | 17% |
| P2 (mostly AI surfaces / intelligence) | 19 | 14% |
| ✎ BOOK / WORKSHEET / PRINTABLE | 10 | 7% |
| ✕ DO NOT BUILD (numeric score variants, duplicate vaults) | 3 | 2% |
| LATER | 3 | 2% |

**Verdict in one line:** EstateSalen contains essentially the entire FIRST-SALE OPERATING SYSTEM already (Chapters 6–26 are certified and verified), but it has **no orchestration layer that sequences a brand-new operator through it**. The capability inventory is ~58% complete out of the box; the missing ~17% is one coherent P1 orchestration surface (Launch Mode / readiness status / first-sale fit / Day-1-baseline→Day-90→Quarter-Two loop), plus AI conveniences that are honestly P2.

**P0: NONE FOUND.** No verified P0. (Full P0 search below; pre-existing known issues carried, not new Chapter 27 defects.)

One honest caution up front: **"Launch" already means three unrelated things in this codebase** — the admin-side app-quality `LaunchReadinessScore`/`LaunchCommandCenter`/`LaunchAuditCenter`, the LLBB website-pilot `LaunchWizard`/`llbbSetupEngine`, and the marketing pages (`StartYourCompany`, `BizInABox`). **None of these is operator Launch Mode.** Any P1 must not reuse that name confusionally.

---

## 90-DAY LAUNCH MODE

**＋ ORCHESTRATION LAYER — DOES NOT EXIST.** Verified: no operator launch mode, no launch stage, no graduation semantics anywhere. `OnboardingChat.jsx` performs role selection and, for `estate_sale_operator`, jumps to a claim step and sets `primary_account_type` — that is the entire operator onboarding state machine. `ProfileCompletionGate.jsx` enforces exactly two fields (company name + city/state location) before creating a sale — a profile gate, NOT launch readiness.

**Operator stage storage:** no `stage`/`launch_state` field exists on Company or user profile. Per the Entity Test, the smallest honest home for launch state (if built) is an additive block on the Company record or user profile — NOT a Launch entity.

**Reuse verdict:** existing architecture CAN be orchestrated into Launch Mode without new entities (see P1).

## LAUNCH READINESS

**＋ DOES NOT EXIST as a readiness surface.** What exists and is real:
- `ComplianceQuestion` (Ch 6): question/provenance status architecture (`RESEARCH_NEEDED → OPERATOR_VERIFIED / PROFESSIONAL_VERIFIED / AUTHORITY_VERIFIED`), AI can never set verified statuses. ✓
- `BusinessDocument` vault with categories INSURANCE, FORMATION, REGISTRATION, PERMIT, POLICY, AGREEMENT, CERTIFICATION, PROFESSIONAL. ✓
- `OperatorService` catalog, `EquipmentAsset`, `SaleAgreement` templates, Base44 Payments (Ch 21).

What does not exist: any aggregation of these into complete/incomplete/critical/optional/next-action. General onboarding completion (profile 2 fields) must NOT be confused with responsible launch readiness — it currently is the only "readiness" the product knows.

**✕ Book wording:** no numeric score. If built: **LAUNCH READINESS STATUS — BLOCKED / NEEDS ATTENTION / RESPONSIBLY READY** (see Wording).

## BUSINESS FOUNDATION

**△ REUSE, ORCHESTRATE.** Startup topics map cleanly onto existing records: insurance/banking/registration → `BusinessDocument` categories; tax/employment/local requirements → `ComplianceQuestion` (jurisdiction_type FEDERAL…HOA, provenance status); bookkeeping → project money capture (Ch 26 Expense/LaborEntry/CashSession truth). Nothing new needed except organization + sequencing.

**Finding (wording risk):** `BizInABox.jsx` markets "LLC filing, EIN registration, business bank account setup" as package features. If EstateSalen does not actually perform these, this is book-truth wording that implies legal/formation services — flag for correction (not a Chapter 27 build item).

**Finding (dead seam, non-P0):** `StartYourCompany.jsx` submit handler is `console.log('Application submitted')` — no persistence, no notification. A marketing form that silently eats applications. Recommend wiring or removing (pre-existing, not Chapter 27 P0).

## PROFESSIONAL REVIEW

**✓ EXISTING (Ch 6, verified).** `ComplianceQuestion` status `PROFESSIONAL_VERIFIED` + `source_type: PROFESSIONAL` + escalation dialogs say "this may require qualified professional review" without claiming to determine compliance. AI is deliberately not a source type. Reuse as-is.

## DOCUMENTS

**✓ EXISTING.** `BusinessDocument` is the one vault; startup organization = a filtered view, not a second vault. **✕ DO NOT BUILD a Launch Documents Vault.**

## SERVICES & PRICING

- **Service Builder: ✓ EXISTING** (Ch 7 `OperatorService`, `OperatorServices` page).
- **Service Boundaries: △** — no explicit "we do NOT provide" field verified. Expressible via catalog absence + `Company.service_area_notes`, but no dedicated boundary semantics. Classify △ ENHANCE (small) or ✎ worksheet.
- **Picing Setup: △** — deal-level commercial truth is certified (Ch 4/9: commission_rate, minimum_fee, accepted_terms_snapshot). Catalog-level service pricing on `OperatorService` was NOT verified to exist. Do not conflate Item pricing (Ch 16, ✓) with company service pricing.

## AGREEMENTS

**✓ EXISTING (Ch 9, certified).** `SaleProposal`/`SaleAgreement`, operator `template_text` with merge variables, no fabricated values, no legal-sufficiency claims. `ProposalBuilder`/`AgreementBuilder` organize business terms into the agreement workflow. Reuse.

**AI Service Explainer: P2** (Ch 24 approved-source → AI draft → human review pattern exists; not implemented for services).

## MINIMUM OPERATING SYSTEM

**＋ P1 GAP.** The system has no LAUNCH CRITICAL vs IMPROVE LATER semantics anywhere (verified: no criticality vocabulary in tasks, docs, or company records). Everything is either mandatory (profile gate) or nothing. This is the single clearest small P1: a readiness category model with critical/optional flags on existing records.

## EQUIPMENT

- **Inventory: ✓ EXISTING** (Ch 8 `EquipmentAsset`, statuses, pack-out truth).
- **Starter Equipment Builder: P2** — no recommendation logic exists (verified: no recommend/starter logic in equipment model or functions). Data exists; recommendation does not.
- **Essential/Useful/Later priority: ✗** — no priority field on assets. △ small or ✎ worksheet.
- **First-Sale Equipment Check: △** — `SaleEquipmentAssignment` records what is assigned; `checklistTemplates.js` generates suggested SaleTasks; `prep_zones[].equipment_needs` holds plan text. No compare-plan-vs-available surface. Small P1 enhancement.
- **Purchase Justification: P2/LATER** — requires cross-project history aggregation; nothing exists.

## BUSINESS INTRODUCTION

**✎ BOOK** for the structured worksheet. Partially served by existing AI coach modes (`referral_partner_builder`, `territory_intelligence` generate outreach copy — verified in `coachModes.jsx`). **AI Conversation Coach: P2.** **Service FAQ Builder: △** reuse Ch 25 knowledge architecture (audience-scoped) — employee-facing is certified; client-facing FAQ exists only inside LLBB website FaqEditor (pilot-gated). **Consultation Introduction: ✎ BOOK** (client-facing explainer does not exist). **Referral Partner Explainer: △** via existing coach mode, under Ch 24 governance.

## FIRST-SALE FIT

- **First-Sale Opportunity Score: ✕ DO NOT BUILD** (numeric). Rename **FIRST-SALE FIT REVIEW**.
- **Complexity Flags: ✓ EXISTING** — `client_fit` dimensions (authority_clarity, deadline_realism, expectation_realism, access, labor…) are observable project conditions, NOT subjective family scoring; consultation rooms carry prep/access/research observations. Reuse exactly as built.
- **Sale Acceptance Review: ✓ EXISTING and certified** (`acceptanceReviewModel.js`, advisory reasons, human recommendation classification `strong_candidate…decline`). No numeric score restored (Ch 11 doctrine intact — verified).
- **First-Sale Fit layer: ＋ P1** — nothing evaluates suitability specifically FOR A NEW OPERATOR. Same advisory model, first-sale lens; AI may explain risk, human accepts/declines (doctrine already enforced by Ch 12: `recommendation` is operator-owned, advisory review can never write it).
- **Decline & Referral: ✓ EXISTING** (Ch 10 `referred` outcome with provenance; "a well-evaluated decline is progress" is supported by preserved history — declined deals keep consultation blocks, lost_reason, notes).

## COMPLETE PROJECT CYCLE (Promises 11–15, 36–41, 52–76)

**✓ EXISTING — the strongest part of the audit.** Full chain verified present and certified in Ch 6–26: Lead (`Lead`, `WebsiteLead`, bridge) → Qualification (`SaleConversionPipeline` + client_fit) → Consultation (Ch 11/12 Mode) → Agreement (Ch 9) → Activation (`activateSale` + provenance) → Preparation (prep zones, excluded areas, access plan) → Inventory (Ch 14–16 discovery→Item) → Pricing (operator ranges, research guard) → Marketing (Ch 18 kit, consent) → Staffing (Ch 19) → Sale (Ch 20 Live Sale) → Payment (Ch 21 attempts/checkout/cash) → Pickup (releases) → Disposition (Ch 22) → Reconciliation/Settlement (Ch 23) → Project Close (transition completion gates) → Learning (Ch 23/25).

**Seam findings:** no broken P0 seams. Two honest gaps inside the chain: (1) no first-sale roadmap sequencing — `ProjectDashboard`/lifecycle show current position, but nothing says what a NEW operator should do next; (2) task/issue/alert discipline exists but there is no cross-entity Priority Engine or daily brief (see below).

Specific verifications:
- **Starter Task Templates: ✓** `saleActivationTemplate.ts`, `source_type: ONBOARDING_TEMPLATE`, `CHECKLIST_TEMPLATES` (equipment→SaleTask).
- **Overdue alerts: ✓** deterministic (`next_action_at` overdue, task due dates, answer_by overdue — all display-truth, no deadline engine).
- **Issues board / Employee help / Escalation: ✓** (Ch 19 Ask-for-Help; Ch 20 incident class; Ch 25 SOP escalation block).
- **Priority Engine: ✗ honest** — attention flags, urgency, blockers, and "Needs Next Action" badges exist, but NO cross-entity deterministic priority ranking. Do not call the current sorted lists a Priority Engine. Small P1 if wanted.
- **AI Daily Brief: P2** — does not exist.
- **Contingency checklist: ✎ BOOK** — except tech failure, which is genuinely covered (see Fallback).
- **Pickups/Disposition/Reconciliation/Settlement/Completion: ✓** all certified Ch 21–23.

## WEEKS 1–2 (Foundation)

Existing covers documents (vault), economics capture (Ch 4/26 deal economics), payment approach (Ch 21 config + POS). **Bookkeeping Setup: wording only** — EstateSalen captures project money truthfully (Ch 26 certified); it does not set up an accounting system. **Payment Setup: wording** — merchant onboarding happens in the Base44 Payments dashboard, outside EstateSalen. **Basic Web Presence: ✓** — every operator has public profile pages (`CompanyProfilePage`, `OperatorSitePage`, `CompanyLanding`); LLBB custom websites are pilot-gated (`LlbbPilot`) and must NOT be presented as universally available (verified gating exists).

## WEEKS 3–4 (Market entry)

**Referral Partner CRM: ✓** (`Contact`, `ProfessionalNetwork`, `Relationship`/`RelationshipHealthDashboard`, partner referral code resolver). **Outreach tasks: ✓** (SaleTask + OutreachSequence/OutreachModal). **Partner notes: ✓** (Contact/Relationship records). **Market Observation Worksheet: ✎ BOOK** — no competitor-observation capture exists; do not treat observation as market truth. **AI Market Debrief: P2.**

## WEEKS 5–6 (Consultations)

**✓ EXISTING and certified**: pipeline capture → qualification → Consultation Mode → Sale Acceptance Review → decline/refer with full history preserved (Ch 10 CRM discipline verified: nurture ≠ lost, referred ≠ lost; declined opportunities remain queryable history).

## WEEKS 7–9 (First sale execution)

**✓ EXISTING** (Ch 13–20 activation→sale-day). Busy-sale discipline holds: overdue tasks, open issues, help escalation, holds, checkout guardrails all exist and are certified. The doctrine "don't abandon the system when the sale gets busy" is supported by the surfaces but not enforced by any sequencing layer.

## BUSY-SALE DISCIPLINE

**✓ EXISTING** — Live Sale Command Center, My Sale Day, AttentionQueue, Issues, Ask-for-Help. No P0.

## CONTINGENCY / FALLBACK

**✓ Manual Fallback Kit EXISTS and is real** (verified: printable continuity kit assembled from canonical records — capture rows, staff, awaiting-pickup list; team-safe fields only). **AI Situation Assistant: P2.**

## WEEKS 10–11 (Closeout)

**✓ EXISTING** (Ch 21–23: pickup releases → disposition → reconciliation → settlement → remaining obligations → transition completion → access closeout). Certified.

## FIRST-SALE LEARNING

**✓ EXISTING**: `SaleRecap.post_sale_review` (what worked/didn't/surprised/change next time), `would_take_ten_more`, near-miss layer (Ch 23), corrective action → SOP/task (Ch 25). **First-sale CONTEXT (framing the first recap as the first full-cycle lesson): △ small P1** — the review record exists; nothing marks it as the first-cycle learning artifact.

## IMPROVEMENT INBOX

**△/＋ P1.** Verified: `ProcessObservationDialog` ("Suggest an improvement") creates a SaleIssue-class observation the operator reviews; `companyKnowledge` seam converts issues into SOP drafts with human approval. **Missing:** a dedicated operator-facing inbox/sort surface; photo capture on observations (SaleIssue.photo_uri exists elsewhere — reuse); one-time vs recurring classification; voice note outside Consultation Mode (`VoiceNoteInput` is consultation-only — verified; do not call text notes voice notes). **✕ No ImprovementInbox entity** — reuse SaleIssue + BusinessDocument knowledge per Entity Test.

## OBSERVATION VS PATTERN

**✓ doctrine EXISTS (Ch 25)**: AI suggestions are labeled forever, human approval only, no auto-promotion; one experience never becomes policy automatically. **✗ cross-sale pattern detection does not exist** — as Ch 26 classified, pricing/marketing pattern review and an evidence counter are FUTURE INTELLIGENCE (P2), not current capability. **AI Pattern Guard: △** — Ch 24/26 truth guardrails exist in the operator AI coach grounding; an explicit evidence-warning pattern guard is P2.

## WEEKS 12–13 (Business review)

**＋ P1.** Per-sale truth is excellent (Ch 26 certified estimate-vs-actual, owner-share, labor efficiency; `LeadSourcePerformance` is a real referral-source review page — verified). **Missing:** any 90-day/quarterly aggregate: no Day 1 baseline (verified: nothing stores initial assumptions), no Day 90 comparison, no cross-sale marketing review surface, no next-quarter priorities, no Company Learning Report (data exists; report does not), no Quarter Two builder.

## PIPELINE CONTINUITY

**△ P1.** `SaleConversionPipeline` page shows stage columns incl. consultations/proposals/signed (✓ Future Project View), with "Needs Next Action" badges (✓ Ch 10 doctrine). **Missing:** a single dashboard combining active projects + future opportunities, a pipeline-gap alert (no "your future pipeline is thin" signal exists), and operator lead follow-up reminders (next_action is operator-owned; no nudge automation verified). **AI Pipeline Coach: P2.**

## REPUTATION

**✓ EXISTING** — first response timestamp (`first_meaningful_response_at`), appointment/calendar records, decision records with history, privacy RLS, issue resolution — all certified. No report surfaces response-time yet (P2).

## LAUNCH READINESS / ANTI-PROCRASTINATION

**＋ P1 orchestration.** The "show what matters now / what can wait / what's blocking me" surface does not exist. Readiness categories + critical/optional + acknowledge-gate (see Launch Gate below) are the P1. **AI Launch Coach: P2** — must ask "what specifically remains unsafe or incomplete?", never declare readiness.

**Launch Gate (Promise 19):** no gate exists today. `activateSale` (Ch 13) activates without any launch acknowledgment. If built: **ACKNOWLEDGE** model — the operator explicitly acknowledges unresolved critical items before FIRST activation; never an automatic block, never a legal conclusion. BLOCK is reserved for true hard blockers only (per platform doctrine, e.g. payment/authority/security controls already enforce real blockers downstream).

## DAY 1 BASELINE / DAY 90 REALITY

**✗ DOES NOT EXIST — the most important verified gap.** Nothing stores initial assumptions (prep hours, expected revenue, expected lead source, owner hours/week). Without it, Day 90 comparison is retrospective storytelling, exactly as the book warns. **＋ P1**: an additive `baseline` block (Company record or operator profile — no new entity) capturing a small structured Day 1 assumption set, plus a Day 90 comparison view reading actual evidence (Ch 26 economics, LeadSourcePerformance, labor history — all real data). "What changed / what still needs work" flow from the same block into Quarter Two priorities.

## QUARTER TWO

**✗ DOES NOT EXIST.** No next-quarter planning surface, no priority selection, no evidence-based goals, no continuous cycle loop. **Evidence-Based Goals: P2** — Ch 26 delivered financial TRUTH (economics metrics, owner-share), NOT owner-goals architecture; carry that honestly. **Owner Capacity Review: ✗** — Ch 26 actual capability is truthful per-sale owner-share and labor-efficiency metrics; no capacity planning exists. Do not claim it.

## CONTINUOUS 90-DAY CYCLE

**✗ Partially supportable.** PLAN→OPERATE→MEASURE→LEARN all exist within a project; the loop-close (quarterly aggregate → next-quarter plan → launch graduation) does not. Same P1.

---

# TRACES

**FIRST 90 DAYS TRACE** — Day 1 the app tells a new operator: pick role, set company name + city/state. It cannot yet say what must exist before a first client, what can wait, what needs professional review. **Verdict: the pieces exist; the sequence does not.**

**WEEK 1–2 TRACE** — Documents ✓ (vault), economics capture ✓, payment approach ✓ (config; merchant onboarding external), presence ✓ (public profile pages). Software vs checklist vs external responsibility is NOT delineated anywhere. **Verdict: capable, unorchestrated.**

**WEEK 3–4 TRACE** — Referral CRM ✓, outreach tasks ✓, partner notes ✓, market observation = book only. **Verdict: capable.**

**WEEK 5–6 TRACE** — capture/qualify/consult/evaluate/decline-refer all work with history preserved. **Verdict: PASS.**

**FIRST-SALE FIT TRACE** — Project A vs B: the Sale Acceptance Review surfaces authority_clarity, deadline_realism, labor demand, access concerns, research flags as advisory reasons — it CAN explain why A looks more manageable for anyone. It does NOT know the operator is NEW, so it cannot say "for your first sale." **Verdict: needs the P1 first-sale lens; never auto-accept/decline (already enforced).**

**WEEK 7–9 TRACE** — signed→activated→onboarded(template tasks)→scheduled(timeline)→assigned→inventoried→priced→marketed→staffed→operated. **Verdict: PASS.**

**BUSY-SALE TRACE** — overdue task, open issue, employee help, buyer problem, payment issue all have canonical surfaces; discipline preserved in-system. **Verdict: PASS.**

**TECH FAILURE TRACE** — Manual Fallback Kit is real and printable (capture sheet, staff list, awaiting-pickup); offline activity must be reconciled after recovery (honest doctrine, verified in kit copy). **Verdict: PASS.**

**WEEK 10–11 TRACE** — pickup→disposition→reconciliation→settlement→obligations→close, with human verification gates. **Verdict: PASS.**

**FIRST-SALE LEARNING TRACE** — what worked/didn't/surprised ✓, near miss ✓, corrective action ✓, SOP change ✓ (human-approved), future task ✓. First project CAN make the second better. **Verdict: PASS.**

**FIX-THIS-NEXT-TIME TRACE** — during a sale the fastest capture is SaleIssue (title+note, seconds) — does not interrupt operations ✓. Post-project: operator reviews issue → corrective action → SOP draft/task. Missing: instant classification one-time vs recurring; no photo in the observation dialog. **Verdict: PASS with small gaps.**

**OBSERVATION VS PATTERN TRACE** — vinyl records sell poorly → an observation is just notes/recap text; nothing promotes it to a pattern, and no cross-sale evidence exists yet. The system CANNOT yet distinguish states beyond doctrine labels — pattern review is future intelligence. **Verdict: doctrine PASS, intelligence honestly absent.**

**DAY 1 VS DAY 90 TRACE** — actual evidence (labor, revenue, lead source) is truthfully recorded, but there is NO baseline to compare against. **Verdict: FAIL today — the P1 baseline block is the fix.**

**PIPELINE CONTINUITY TRACE** — inquiry arrival, partner follow-up, future consultation all persist independently of the active project ✓; buyer communication is consent-gated ✓. What's missing is a combined view + gap alert so the operator SEES the future pipeline while busy. **Verdict: data PASS, visibility △.**

**REPUTATION TRACE** — response time recorded, appointments calendared, decisions/privacy/issues all canonical. **Verdict: PASS.**

**LAUNCH GRADUATION TRACE** — nothing graduates anyone; Launch Mode itself doesn't exist. Evidence criteria (foundation substantially complete, one full cycle, review completed, Quarter Two created) are all derivable from existing records when the P1 lands. **Verdict: absent until P1.**

**QUARTER TWO TRACE** — Day 90 evidence exists but cannot become next priorities in-product today. **Verdict: absent until P1.**

---

## ENTITY TEST

**PASS — no new entities required.** Verified strong preference holds: no Launch/LaunchReadiness/FirstSale/ImprovementInbox/Pattern/Day90/QuarterPlan/LaunchScore entities exist and none should be created. Persistent launch state, if genuinely needed, fits as **additive blocks on the existing Company record** (e.g. `launch.status`, `launch.criticals_acknowledged_at`, `baseline` assumption block, `next_quarter` plan block) — Company already carries policy/notes blocks and is operator-anchored. Improvement inbox reuses SaleIssue (+ existing `photo_uri`); knowledge reuses BusinessDocument; reviews reuse SaleRecap. **DO NOT IMPLEMENT.**

## P0

**NONE VERIFIED.** Searched: launch-mode isolation bypass (N/A — no launch mode), AI declaring legal readiness (none found; `sellerOnboardingAi` and coach surfaces do not claim compliance), gate built on unsupported legal conclusions (no gate exists), first-sale AI auto-accept (impossible — Ch 12 recommendation is human-owned), unknown→zero financial truth (fixed and certified in Ch 26), private-doc exposure to employees (BusinessDocument RLS is operator-only — verified schema), buyer communication ignoring consent (Ch 18 explicit-only consent — verified in `buyerAudience`), first-sale bypassing payment/authority controls (no bypass path exists; Ch 19/21 controls apply to all sales), Day 90 fabricated analytics (no analytics exist to fabricate). Pre-existing known issues (B1-02 secrets, B2-03 Houszu identityResolve, Meta token) carry forward unchanged — not Chapter 27 defects.

## P1 — smallest set to make Chapter 27 substantially true

1. **Launch Mode orchestration surface** (status + sequencing + "what matters now"), reading existing records only.
2. **Readiness categories with LAUNCH CRITICAL / IMPROVE LATER semantics** + missing-critical-item surfacing.
3. **Launch Gate as ACKNOWLEDGE** (first-activation acknowledgment of unresolved criticals; never auto-block).
4. **FIRST-SALE FIT REVIEW** (advisory lens over the certified acceptance review; human decision).
5. **Improvement Inbox** — operator review surface over existing observation SaleIssues, + one-time-vs-recurring sort.
6. **Day 1 Baseline block + Day 90 Reality comparison** (Company-record blocks; reads Ch 26/10 truth).
7. **90-Day Business Review + Quarter Two builder** (priorities selected from evidence; closes the loop; defines launch graduation).
8. **Combined pipeline view + pipeline gap alert** (active work + future opportunities).

## P2

AI Readiness Coach (explainer, never decider) · AI Service Explainer · Starter Equipment Builder (recommendation from service/sale needs) · AI Conversation Coach · AI Market Debrief · AI First-Sale Coach · AI Daily Brief · AI Situation Assistant · Quick Voice Note for observations · Evidence Counter · AI Pattern Guard · AI Pipeline Coach · Company Learning Report · Buyer/Referral audience GROWTH trends (current counts exist, growth over time does not) · SOP growth report (lifecycle semantics exist — verified; aggregate report does not) · Team development quarterly measure · Response-time report (field exists) · Evidence-based goals · Purchase justification · Equipment priority taxonomy.

## LATER

Predictive first-sale fit · cross-company anonymized launch benchmarks · adaptive launch curriculum · advanced market benchmarking.

---

## READY-TO-USE TOOLS — all 47 classified

| # | Tool | Classification |
|---|---|---|
| 1 | 90-day launch calendar | ORCHESTRATION LAYER (P1; sequencing of existing steps) |
| 2 | Launch-readiness checklist | ORCHESTRATION LAYER (P1; reuse BusinessDocument/ComplianceQuestion) |
| 3 | Business foundation checklist | SMALL ENHANCEMENT (views over existing records) |
| 4 | Professional-adviser checklist | EXISTING (ComplianceQuestion professional provenance) |
| 5 | Service-definition worksheet | INTERACTIVE SYSTEM ALREADY BETTER (OperatorService) |
| 6 | Service-boundary worksheet | GENUINE SMALL GAP (△ enhance; or BOOK) |
| 7 | Initial pricing worksheet | EXISTING (deal commercial terms; catalog pricing △) |
| 8 | Client agreement checklist | EXISTING (Ch 9 readiness/builder) |
| 9 | Starter equipment list | BOOK (recommendation = P2) |
| 10 | Equipment inventory | INTERACTIVE SYSTEM ALREADY BETTER (Ch 8) |
| 11 | First-sale equipment checklist | SMALL ENHANCEMENT (compare plan vs assigned) |
| 12 | Business introduction worksheet | BOOK (AI copy modes exist) |
| 13 | Referral-partner introduction | EXISTING (coach mode + ProfessionalNetwork) |
| 14 | First-sale opportunity scorecard | RENAME → FIRST-SALE FIT REVIEW; numeric ✕ DO NOT BUILD |
| 15 | First-sale risk assessment | EXISTING (acceptance review complexity flags) + P1 lens |
| 16 | First-sale roadmap | ORCHESTRATION LAYER (reuse ProjectDashboard lifecycle) |
| 17 | Weeks 1–2 checklist | ORCHESTRATION LAYER |
| 18 | Weeks 3–4 outreach plan | EXISTING (tasks/outreach) + sequencing |
| 19 | Referral-partner contact sheet | INTERACTIVE SYSTEM ALREADY BETTER (Contact/Relationship) |
| 20 | Market observation worksheet | BOOK |
| 21 | Weeks 5–6 consultation tracker | INTERACTIVE SYSTEM ALREADY BETTER (pipeline) |
| 22 | Consultation worksheet | INTERACTIVE SYSTEM ALREADY BETTER (Consultation Mode) |
| 23 | Opportunity evaluation | INTERACTIVE SYSTEM ALREADY BETTER (Sale Acceptance Review) |
| 24 | Weeks 7–9 preparation checklist | EXISTING (activation template tasks) |
| 25 | First-sale project timeline | INTERACTIVE SYSTEM ALREADY BETTER (ProjectDashboard) |
| 26 | First-sale team briefing | EXISTING (OpeningBriefCard, Ch 19) |
| 27 | Sale-day contingency plan | BOOK (tech failure covered by Fallback Kit) |
| 28 | Technology fallback checklist | INTERACTIVE SYSTEM ALREADY BETTER (Manual Fallback Kit) |
| 29 | Weeks 10–11 closeout checklist | INTERACTIVE SYSTEM ALREADY BETTER (Ch 22/23 gates) |
| 30 | Pickup checklist | EXISTING (releases architecture) |
| 31 | Disposition checklist | EXISTING (Ch 22 structural scope) |
| 32 | Reconciliation checklist | EXISTING (ReconciliationPanel + cash variance) |
| 33 | Client settlement checklist | EXISTING (Ch 23 settlement) |
| 34 | First-sale review | EXISTING (SaleRecap post_sale_review) + P1 first-cycle framing |
| 35 | Fix-this-next-time log | EXISTING (SaleIssue capture) + inbox P1 |
| 36 | Near-miss report | INTERACTIVE SYSTEM ALREADY BETTER (Ch 23 near-miss layer) |
| 37 | Lessons-learned worksheet | EXISTING (Ch 25 knowledge loop) |
| 38 | Observation-vs-pattern worksheet | EXISTING DOCTRINE; detection = P2 |
| 39 | Weeks 12–13 business review | GENUINE SOFTWARE GAP (P1 aggregate) |
| 40 | 90-day scorecard | REWORD → 90-day review; numeric score ✕ |
| 41 | Estimate-vs-actual report | EXISTING (Ch 4/26 projected vs actual) |
| 42 | Referral-source review | INTERACTIVE SYSTEM ALREADY BETTER (LeadSourcePerformance) |
| 43 | Marketing review | P2 aggregate (Ch 18 data exists) |
| 44 | Pipeline review | SMALL ENHANCEMENT (combined view + gap alert) |
| 45 | Day 1 vs Day 90 comparison | GENUINE SOFTWARE GAP (P1 baseline) |
| 46 | Quarter Two planning worksheet | GENUINE SOFTWARE GAP (P1 builder) |
| 47 | Next 90-day plan | ORCHESTRATION LAYER (P1, closes the cycle) |

---

## BOOK TRUTH — key promises

| Promise | Truth |
|---|---|
| 90-Day Launch Mode | ＋ DOES NOT EXIST — orchestration P1 |
| Launch Readiness Dashboard | ＋ DOES NOT EXIST (components ✓) |
| Business Foundation Checklist | △ reusable records, no organization |
| Professional Review Flags | ✓ REAL (Ch 6) |
| Launch Documents Vault | ✓ vault exists; ✕ second vault |
| Service Builder | ✓ REAL |
| Service Boundaries | △ unverified/no dedicated semantics |
| Pricing Setup | ✓ deal-level; △ catalog-level |
| Client Agreement Builder | ✓ REAL |
| AI Service Explainer | P2 |
| Minimum Readiness Standard | ✗ ABSENT (P1) |
| Missing Critical Item Alert | ✗ ABSENT (P1) |
| Launch Gate | ✗ ABSENT (P1 acknowledge-model) |
| AI Readiness Coach | P2 (never a readiness decider) |
| Starter Equipment Builder | P2 (no recommendation logic — verified) |
| First-Sale Equipment Check | △ (assignment real; comparison absent) |
| Purchase Justification | P2/LATER |
| Business Introduction Builder | ✎ BOOK (+ AI copy modes) |
| AI Conversation Coach | P2 |
| Service FAQ Builder | △ (Ch 25 employee ✓; client-facing pilot-gated) |
| Referral Partner Explainer | △ via coach mode |
| First-Sale Opportunity Score | ✕ numeric — rename FIRST-SALE FIT REVIEW |
| First-Sale Fit | ＋ P1 lens |
| AI First-Sale Coach | P2 |
| First-Sale Roadmap | △ lifecycle exists; sequencing absent |
| Startup Checklist | ✗ ABSENT (P1) |
| Bookkeeping Setup | ✎ WORDING — money capture real; accounting setup is external |
| Payment Setup | ✓ config real; merchant onboarding external (WORDING) |
| Basic Web Presence | ✓ public profiles; LLBB pilot-gated |
| Referral Partner CRM | ✓ REAL |
| Market Observation Worksheet | ✎ BOOK |
| AI Market Debrief | P2 |
| Consultation Review (declined history) | ✓ REAL |
| Priority Engine | ✗ honest — flags/badges only |
| AI Daily Brief | P2 |
| First-Sale Contingency Checklist | ✎ BOOK |
| Manual Fallback Kit | ✓ REAL (printable, verified) |
| AI Situation Assistant | P2 |
| First-Sale Review | ✓ per-sale real; first-cycle framing △ |
| Improvement Inbox | △ observation records real; inbox P1 |
| Quick Voice Note | ✗ for improvements (consultation-only voice input) |
| Photo + Note | ✓ architecture exists on SaleIssue (private); observation dialog △ |
| Post-Sale Sort | ✗ one-time-vs-recurring absent (P1 small) |
| Observation vs Pattern | ✓ doctrine; ✗ detection (honest) |
| Evidence Counter | ✗ ABSENT (P2) |
| Pricing Pattern Review | ✗ FUTURE INTELLIGENCE (carry Ch 26) |
| Marketing Pattern Review | ✗ same |
| AI Pattern Guard | △ truth guardrails exist; explicit guard P2 |
| 90-Day Business Review | ✗ ABSENT (P1) |
| Referral Source Review | ✓ REAL page |
| Marketing Review | △ per-sale ✓; quarterly ✗ |
| Next-Quarter Priorities | ✗ ABSENT (P1) |
| Referral Relationship Reminders | ✗ no reminder automation (health scores exist) |
| Pipeline Dashboard (combined) | ✗ ABSENT (P1) |
| Future Project View | ✓ pipeline stages |
| Pipeline Gap Alert | ✗ ABSENT (P1 small) |
| AI Pipeline Coach | P2 |
| Experience Gained | △ records ✓; aggregate ✗ |
| Buyer Audience Growth | ✗ growth metric absent; current consented counts ✓ (permission-based only) |
| Referral Network Growth | ✗ growth trend absent; health metrics ✓ |
| SOP Growth | ✗ report absent; lifecycle semantics ✓ |
| Team Development | ✗ quarterly measure absent; TeamMember/acknowledgments ✓ |
| Launch Readiness Score | ✕ numeric — LAUNCH READINESS STATUS instead |
| AI Launch Coach | P2 |
| Day 1 Baseline | ✗ ABSENT — highest-value P1 |
| Day 90 Reality | ✗ ABSENT (P1) |
| Company Learning Report | ✗ report absent (data exists) |
| Quarter Two Builder | ✗ ABSENT (P1) |
| Evidence-Based Goals | ✗ Ch 26 delivered truth, not goals — carry honestly |
| Owner Capacity Review | ✗ Ch 26 actual = owner-share/labor-efficiency metrics only |
| Continuous 90-Day Cycle | ✗ loop-close absent (P1) |

---

## REQUIRED BOOK WORDING CHANGES (exact replacements)

1. **"First-Sale Opportunity Score"** → **"First-Sale Fit Review"** — advisory evidence from observable project conditions; the human operator accepts, declines, or refers. Never a numeric score.
2. **"Launch Readiness Score"** → **"Launch Readiness Status"** — BLOCKED / NEEDS ATTENTION / RESPONSIBLY READY. Never gamified; never a legal or insurance sufficiency claim.
3. **"Bookkeeping Setup"** → **"Project Money Capture Setup"** — EstateSalen records sale revenue, expenses, labor and cash truthfully; configuring an accounting system remains the owner's responsibility with their qualified professional.
4. **"Payment Setup"** → **"Payment Method Configuration"** — EstateSalen configures how sales take money; merchant-account onboarding happens in the payments provider's dashboard, outside EstateSalen.
5. **"Professional Review Flags"** → **"Professional Review Recommended"** — a prompt to consult a qualified professional; never a determination that anything is legally compliant.
6. **"AI Readiness Coach"** → **"AI Readiness Explainer"** — organizes and explains readiness evidence; never declares the business legally ready.
7. **"Buyer Audience Growth"** → **"Consented Audience Overview"** — permission-based only; consent is explicit and never inferred from attendance or purchase.
8. **"Observation vs Pattern"** → **"Observation (single project)"** — a pattern may only be claimed from evidence across multiple completed comparable projects.
9. **"Company Learning Report"** → use only when an actual report exists; until then **"Learning Records Summary"**.
10. **"Owner Capacity Review"** → **"Owner Share & Labor Efficiency (per completed sale)"** — the actual certified Chapter 26 capability; no capacity-planning claim.
11. **"Evidence Counter"** → **"Completed-Projects Count Supporting This Change"** — counts only genuinely completed comparable projects.
12. **"Starter Equipment Builder"** (if kept in book) → note it is a RECOMMENDATION AID, not automated procurement intelligence, until built.

---

## DO-NOT-REBUILD

Chapter 27 promises already satisfied by: **Ch 6** (compliance questions, professional provenance, policy vault/acknowledgments) · **Ch 7** (service catalog) · **Ch 8** (equipment assets, assignments, checklist templates) · **Ch 9** (proposals/agreements, merge variables) · **Ch 10** (pipeline, next-action doctrine, outcomes, source tracking, response timestamps, LeadSourcePerformance) · **Ch 11/12** (Consultation Mode, client fit, Sale Acceptance Review, human recommendation) · **Ch 13** (activation provenance, task templates/timeline/dependencies) · **Ch 14–16** (discovery→inventory→pricing, research guard) · **Ch 17** (staging) · **Ch 18** (marketing kit, consent-only buyer audience) · **Ch 19** (team, authority matrix, Ask-for-Help) · **Ch 20** (Live Sale, incidents, near-miss foundation) · **Ch 21** (payment attempts, checkout, cash control, refunds, releases) · **Ch 22** (disposition, transition completion) · **Ch 23** (reconciliation, settlement, post-sale review, near-miss layer) · **Ch 24** (AI governance, manual fallback kit) · **Ch 25** (SOP/knowledge lifecycle, observation capture) · **Ch 26** (financial truth, estimate-vs-actual, owner-share). Plus entities: BusinessDocument, SaleConversionPipeline, SaleTask, SaleIssue, SaleRecap, EquipmentAsset, TeamMember, SaleAuthority, SaleClientDecision, EstateSale, Company, ComplianceQuestion, OperatorService, Contact/Relationship.

## PRODUCT DOCTRINES

All permanent Chapter 27 doctrines are CONFIRMED as consistent with the certified architecture, with these refinements:
- Responsibly-ready ≠ perfect; acknowledge-gate model (not auto-block) matches existing hard-blocker doctrine (real blockers stay structural: payment, authority, security).
- AI boundaries hold platform-wide (Ch 24/26 guardrails): organize/evaluate/draft yes; declare compliance, accept projects, invent readiness, or promote patterns — no.
- Unknown ≠ zero is now enforced in economics (Ch 26) and must be enforced in any readiness surface: missing critical item ≠ hidden, missing baseline ≠ invented.
- The platform-remembers doctrine argues FOR the P1 baseline/graduation blocks (Company-record additive, no new entities).

## RECOMMENDED IMPLEMENTATION SEQUENCE (DO NOT IMPLEMENT)

1. Readiness categories + critical/optional semantics (foundation for everything).
2. Launch Mode status surface + missing-critical alert + acknowledge gate.
3. First-Sale Fit Review lens (advisory, over existing model).
4. Improvement Inbox + one-time-vs-recurring sort.
5. Day 1 Baseline block → Day 90 Reality comparison.
6. 90-Day Review + Quarter Two builder + graduation (closes the master loop).
7. Combined pipeline view + gap alert.
(P2 AI surfaces after the loop is real.)

## PRE-LAUNCH DEPENDENCIES (carried, unchanged)

13 undeclared backend secrets (Twilio, Meta lead-gen, etc.) · duplicate Launch_Issues records · expired Meta access token · referral exchange ownership checks · Houszu identityResolve undeployed · destructive maintenance endpoints lacking admin guards · public directory PII exposure · feed operator-name default · Meta lead-ads webhook fail-closed pending secrets. None introduced by Chapter 27.

---

## FINAL CERTIFICATION

**GO WITH ENHANCEMENTS.**

The operating system a first-time operator needs is ~58% present and certified end-to-end for the project cycle; no P0 exists; every missing promise is either one coherent P1 orchestration layer (Launch Mode, readiness status, first-sale fit, baseline→Day-90→Quarter-Two loop) or honestly-classified P2/book. Chapter 27 does not require new entities or new startup features — it requires EstateSalen to SEQUENCE what it already truthfully does.

**AUDIT ENDS HERE. NOTHING WAS BUILT.**