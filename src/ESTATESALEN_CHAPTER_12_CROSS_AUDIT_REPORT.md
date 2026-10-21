# CHAPTER 12 — ESTATESALEN CROSS-AUDIT REPORT
## Consultation, Project Evaluation & Acceptance Decision

**AUDIT ONLY — no code modified, no production data touched, no communications sent, no synthetic records created.** All findings verified against deployed source: `SaleConversionPipeline.jsx`, `NewDealForm.jsx`, `DealEconomicsPanel.jsx`, `ClientFitPanel.jsx`, `SiteAssessmentSection.jsx`, `AccessPlanSection.jsx`, `SaleEconomicsPanel.jsx`, `saleEconomicsModel.js`, `proposalModel.js`, `agreementModel.js` + `AgreementReadiness.jsx`, `prepareModel.js`, `LaborEntriesPanel.jsx`, `ResearchFlagDialog.jsx`, `prepareModel`/`OperatorWorkload.jsx`, `coachModes.jsx`/`aiCoach/entry.ts`, `VoiceCommandButton.jsx`, entity schemas (SaleConversionPipeline, EstateSale.site_assessment, SaleAuthority, SaleScope, SaleProposal, SaleAgreement, LaborEntry, Item, Contact, SaleEquipmentAssignment, OperatorService), and the Chapter 9/10/11 certification reports.

**CENTRAL QUESTION verdict:** Not yet. The economics, authority, client-fit, timeline, and proposal systems exist and are strong — but there is **no consultation-mode surface that assembles them**, capture is scattered across a deal form and (later) a sale editor, and the recommendation-with-conditions step does not exist. The gap is **primarily an interface gap, not a data-model gap** (§38).

---

## EXECUTIVE SUMMARY

- **Coverage:** ~48% of Chapter 12 promises are EXISTING / SUPPORTED or strong-partial (economics, acceptance scorecard, authority, client fit, timeline tasks, proposal snapshot, estimated-vs-actual, decline/refer/nurture, professional network handoff); ~14% are small enhancements; ~24% are genuine P1 interface gaps (consultation mode, pre-consultation intake, room-by-room capture, condition flags, client goals, deadlines, recommendation + conditions, consultation summary, mobile walkthrough); ~10% are P2 (the nine AI consultation modes, risk-accuracy analytics); ~4% LATER (capacity engine, offline, cross-sale learning).
- **Strongest existing architecture:** the deterministic **Sale Acceptance Scorecard** (STRONG / ACCEPTABLE / MARGINAL / HIGH RISK / NEEDS INPUTS with written reasons, conservative scenario, calendar overlap, client-fit/distance/site-complexity advisories) sitting on canonical deal economics (`saleEconomicsModel` is the single financial truth); Chapter 9 authority warnings already gating agreement readiness; `buildProposalSnapshot` already populating proposals from canonical records with zero re-entry; `SaleEconomicsPanel` already comparing projected vs actual (gross, revenue, labor hours, cash labor, costs, contribution).
- **Largest genuine gaps:** (1) no guided **Consultation Mode** — capture is scattered and desktop-first; (2) no structured **client goals / external deadlines / condition flags / acceptance conditions**; (3) no **room-by-room** capture; (4) no consultation photo/voice capture distinct from marketing photos; (5) no **recommendation record** (strong/conditional/alternative/decline with explicit IF-conditions); (6) property facts live on `EstateSale` — at deal stage there is nowhere to put them, creating the one real **retyping seam**.

---

## 1. PRE-CONSULTATION

- **Existing (partial):** Seller inquiry → `EstateTransitionLead`/`WebsiteLead` → `bridgeInquiryToDeal` seeds a deal with provenance, deterministic next action ("Respond to seller inquiry"), 4-hour grace. `NewDealForm` captures client, phone/email, address, city/state, **situation** (probate/divorce/downsizing/relocation/foreclosure/standard = "reason for sale" proxy), consultation date, estimated sale start/end dates, estimated value, notes.
- **Missing:** no structured pre-consultation questionnaire — **occupancy, previous removals, important deadlines, decision-maker inventory, merchandise overview, special circumstances** have no fields (free-text notes only). There is no pre-consultation workflow, only scattered fields.
- **Classification:** ＋ BUILD (narrow — a structured intake block on the deal), reusing SaleConversionPipeline + Contact + inquiry provenance. △ for the fields that exist.

## 2. PROPERTY PROFILE

- **Existing (sale-scoped):** `EstateSale.site_assessment` is the canonical property-facts block: property_type, approx_size, stairs_levels, elevator, parking, gated_access, community/HOA restrictions, loading_access, merchandise_volume, storage_areas (garage/attic/basement/outbuildings free text), pickup_constraints, sale_day_restrictions, access_details (private), notes — all with honest `unknown` defaults, explicitly "not a home inspection." Facts vs observation distinction is respected (operator enters facts; AI never sets them).
- **Gap:** none of this exists at the **deal/consultation stage** — a property is only assessed after an EstateSale is created. Basement/attic/outbuildings are free-text, not structured flags.
- **Classification:** ↔ COVERED BY EXISTING SYSTEM (site_assessment) once a sale exists; △ seam to expose at consultation stage. **Do NOT create another property entity.**

## 3. AUTHORITY

- **Existing:** `SaleAuthority` (scopes, is_primary, source, evidence, `verification_status` VERIFIED/UNRESOLVED/DISPUTED) + `agreementModel` readiness surfaces "AUTHORITY NEEDS REVIEW" warnings for UNRESOLVED/DISPUTED before presenting the agreement. Pre-sale, `client_fit.authority_clarity` records the observation.
- **Gaps:** SaleAuthority is sale-scoped (not usable during a pre-sale consultation); authority status does **not** currently hold a consultation recommendation (none exists) and is not in the scorecard rating.
- **Classification:** ↔ EXISTING / SUPPORTED at agreement level; △ consult-stage exposure. No new decision-maker model.

## 4. TIMELINE / DEADLINES

- **Existing:** forward AI timeline (`ai_timeline_tasks` with days_before_sale) generated from estimated start date; estimated sale start/end dates on the deal; `SaleScope.effective_date`.
- **Missing:** **no backward planning from a "property must be cleared by [DATE]"**; no structured external-deadline entity (closing, movers, lease, court/probate timing); no deterministic deadline-vs-work conflict check.
- **Classification:** ✕ do not claim timeline builder; stored dates ≠ backward-planning workflow. ＋ BUILD (P1, small: deadline field + deterministic backward checklist + conflict warning).

## 5. MOBILE CONSULTATION

- **Reality:** the deal modal and sale editor are responsive (390/428 verified in prior chapters), but there is **no consultation-specific mobile workflow** — no walking capture of notes/photos/rooms/flags in one flow. Voice button is navigation-only.
- **Classification:** ＋ BUILD (the core P1 — a guided mobile Consultation Mode). Do not call current responsive forms a consultation mode.

## 6. ROOM-BY-ROOM WALKTHROUGH

- **Existing:** none. `StorageLocation` is warehouse storage; Item has storage_location fields; no room/area assessment.
- **Classification:** ＋ BUILD (P1) as a lightweight consultation capture structure (room name + notes + photos + flags), **not** a permanent room entity unless proven necessary.

## 7. PHOTOS / VOICE / NOTES

- **Photos:** `EstateSale.images` exist (with private AI synopsis, skip/do-not-search flags, marketing approval via `MarketingKit.approved_photo_indexes` — nothing is marketing-eligible by default). But consultation-stage capture into the same array conflates consultation documentation with marketing assets; no timestamp/room association at capture; publish requires explicit approval, so no default public exposure.
- **Voice:** `VoiceCommandButton` = voice **navigation commands** only. No dictation→consultation-note conversion.
- **Notes:** `SaleNote` (sale-scoped), deal notes, Activity log exist.
- **Classification:** Photos △ (capture seam + private consultation gallery); Voice-to-notes ＋ BUILD (P2 — speech→notes with human review); Notes ↔ existing.

## 8. CONDITIONS / SAFETY

- **Existing:** Chapter 8 security walkthrough checklist ("Reviewed — not certified safe" doctrine); `access_details` for hazards-adjacent access notes. **No structured condition flags** (dirt/smoke/odor/pests/moisture/mold concern/missing parts/unsafe areas).
- **Classification:** ＋ BUILD (P1, small structured observation enum). "Mold concern" must remain an observation — the platform must never diagnose (doctrine already encoded elsewhere; keep it here).

## 9. RESEARCH

- **Existing:** `Item.research_status` (CLEAR/RESEARCH_NEEDED/VERIFY/SPECIALIST_REVIEW) + `ResearchFlagDialog`, human-controlled, AI never sets it. Chapter 3 doctrine: AI suggestion ≠ verified identification/value.
- **Gap/seam:** flags attach to inventory Items — consultation-stage merchandise observations have no item yet, so the path is "note it now, flag it when inventoried."
- **Classification:** ↔ COVERED BY EXISTING SYSTEM; △ consultation-mode link only. **No second research queue.**

## 10. PREPARATION ASSESSMENT

- **Existing:** Chapter 8 `checklistTemplates` + SaleTask architecture (sorting, staging, security, checkout checklists), equipment kit projection.
- **Gap:** no structured *expected preparation work* observations at consultation; labor estimates are manually entered with no structured reasoning input.
- **Classification:** ↔ existing for execution; △ consultation observations → labor estimate assistance is a small enhancement (advisory only).

## 11. LABOR / STAFFING

- **Existing (strong):** `deal.labor_estimates` (category/hours/rate/is_owner_time — owner hours displayed separately, never cash) + `LaborEntry` actuals (same categories, team-member identity, rate snapshots) + `DealEconomicsPanel` conservative scenario. Canonical doctrine: hours in, cash out, never reverse.
- **Missing:** no **staffing** derivation (people count, prep-day vs sale-day crew, skill needs); no structured estimate reasoning.
- **Classification:** Labor ↔ EXISTING; Staffing ＋ BUILD (P2 — derived suggestion from hours, operator-owned); no formula changes.

## 12. ACCESS / SALE SETUP

- **Existing:** site_assessment covers stairs/parking/elevator/gated/loading/pickup; `access_details` covers occupied/restricted rooms, checkout-adjacent concerns; scorecard surfaces site-complexity advisory flags; prepareModel has CHECKOUT checklist state.
- **Gap:** consultation-stage (deal) capture again absent.
- **Classification:** ↔ existing at sale level; △ consult-stage seam.

## 13. CLIENT GOALS

- **Missing entirely.** No MAXIMIZE PROCEEDS / SPEED / EMPTY PROPERTY / MINIMAL INVOLVEMENT / SPECIALIZED HANDLING structured record anywhere. `client_fit.expectation_realism` is an operator rating, not the client's stated goal.
- **Classification:** ＋ BUILD (P1, small — a goals multi-select on the deal, kept distinct from operator recommendation).

## 14. CLIENT EXPECTATIONS

- **Partial:** `client_fit` dimensions (expectation_realism, deadline_realism), `SaleScope.client_expectations` (sale-scoped, honest-uncertainty doctrine), deal notes.
- **Missing:** no structured expectation record at consultation stage; no comparison against proposed scope/economics (Part 21 AI check: absent → P2).
- **Classification:** △ ENHANCE.

## 15. SALEABLE VALUE

- **Existing:** `estimated_value` working estimate + operator-supplied low/high range (Ch9: system never invents a range) + ESTIMATE_NOTE doctrine ("estimate is a planning tool, not a promise"). `property_considerations` string in proposals derives from site facts.
- **Missing:** no structured whole-mix assessment (category mix, volume sense beyond the site enum); "best three items" distortion has no counter-mechanism beyond operator discipline.
- **Classification:** △ ENHANCE (advisory mix capture); no false precision — ✓ doctrine already encoded.

## 16. PROJECTED ECONOMICS

- **Existing (strong):** `DealEconomicsPanel` = full pre-sale calculator (gross, commission vs minimum via `companyFee` MAX(), authorized additional services, five projected direct-cost groups, labor estimates, thresholds) + conservative scenario + contribution. `projectedDealEconomics` in the canonical model. No competing calculation exists.
- **Classification:** ✓ EXISTING / SUPPORTED.

## 17. CAPACITY

- **Existing:** `OperatorWorkload` (explicitly "workload VISIBILITY only — never a capacity recommendation") + calendar + scorecard's calendar-overlap count (≥2 overlapping deals contributes to MARGINAL).
- **Strict verdict:** TRUE CAPACITY remains deferred (Chapter 3/4 decision stands). Scheduling data ≠ capacity engine.
- **Classification:** △ partial / LATER for a real engine. Do not overclaim.

## 18. RED FLAGS

- **Existing:** scorecard reasons + client-fit advisory + site-complexity flags are deterministic, explained, advisory-only ("a warning flag explains what needs attention") — exactly the Chapter 12 doctrine. Unresolved-authority warnings exist at agreement readiness.
- **Missing:** timeline-conflict flag (no deadline math), dedicated labor-risk flag (site conditions feed advisory text but aren't labeled labor risk), expectation mismatch flag.
- **Classification:** ✓ for what exists; ＋ small deterministic additions (P1/P2). Flags never decide — encoded.

## 19. CLIENT FIT

- **Existing (strong):** `ClientFitPanel` — 8 observable-project-condition dimensions (communication, authority clarity, expectation realism, deadline realism, responsiveness, family complexity, scope stability, property access), good/caution/concern/**unknown**, explicit "rate conditions, not the person," feeds scorecard as advisory. Boundaries/family-conflict/confidentiality concerns are captured in notes + dimensions.
- **Classification:** ✓ EXISTING / SUPPORTED.

## 20. AI

- **Existing:** aiCoach has verified per-sale context for communication/pricing/ops modes; content/marketing modes get public-safe facts only; `PrepCoachPanel` (Ch8) is sale-scoped prep coaching ("can summarize, suggest, prioritize; cannot complete anything"). Data boundaries: sale-context restricted to eligible modes. No consultation data exists yet, so no leakage — but when it does, AI boundary rules (access codes, private notes out of context) must be re-audited.
- **Missing (all P2):** AI Consultation Prep, Expectation Check, Sale Evaluation Coach, Labor Risk Review (no cross-sale pattern analysis — historical records exist, learning does not), Profitability Review (scorecard already self-explains; AI must not recalculate), Client-Fit Review, What-Am-I-Missing, Recommendation Draft, Consultation Learning. Deterministic `unresolvedFacts()` already gives a completeness list at proposal build — a non-AI version of "what am I missing" exists.
- **Classification:** P2 as a suite; grounded/draft/advisory constraints match existing architecture. Do not claim any today.

## 21. ACCEPTANCE / OPPORTUNITY REVIEW

- **Existing:** the **Sale Acceptance Scorecard** (DealEconomicsPanel) — deterministic rating + reasons, considers merchandise economics, labor/costs, thresholds, conservative scenario, calendar overlap, client fit, distance, site complexity. It does NOT yet consider research unknowns or authority verification in its rating.
- **Classification:** ✓ (Option A nearly fulfilled) + △ small enhancement (add research-unknown and authority advisories to reasons). See §41 for wording.

## 22. STRONG / CONDITIONAL / RESEARCH / ALTERNATIVE / DECLINE

- **Strong:** scorecard STRONG rating exists (evidence-based, no auto-accept) ✓.
- **Conditional:** **does not exist** — no structured "project works IF…" conditions field, and conditions cannot flow into proposal/scope (Part 48 broken) ＋ BUILD (P1, the recommendation record).
- **Research required:** research flags exist but cannot HOLD a recommendation (nothing to hold); uncertainty never silently becomes a positive recommendation — safe today by absence, must be wired in the new record ＋.
- **Alternative:** ✓ Chapter 11 Who Can Help + `referred_service`/`referred_to_contact_id` outcomes record "estate sale not best fit → alternative service."
- **Decline:** ✓ Chapter 10 DealOutcomeDialog — lost (13 structured reasons incl. not_enough_saleable_value, operator_capacity, scope_mismatch, authority_family_issue), referred, nurture, lost_notes. Preserves why, whether another solution was offered (referred provenance), whether future opportunity remains (nurture).

## 23. CONSULTATION SUMMARY

- **Missing as an assembled view.** Deal Overview tab is the nearest thing (stage, dates, contact link, economics summary). Data exists across tabs/records — an assembled internal summary (counts, known/unknown, risks) is a small enhancement. Client-facing vs private separation would need the recommendation record's fields. ＋ BUILD (P1, assembled from canonical records only — no data duplication).

## 24. CLIENT RECOMMENDATION

- **Missing.** The proposal's `overview`/`next_steps` are free-text client-facing fields, but there is no structured recommendation (estate sale appropriate / conditional / alternative / decline) and no private-vs-client-facing separation. ＋ BUILD (P1).

## 25. PROPOSAL HANDOFF

- **Existing (strong):** `buildProposalSnapshot({sale, deal, scope})` populates client, property, services, scope summary, dates, estimated range, compensation, additional services, discount approach, post-sale plan, property considerations **entirely from canonical records — nothing retyped**. `unresolvedFacts()` keeps unknowns visible. Finalize freezes the snapshot; acceptance writes back to the deal.
- **Seams:** requires EstateSale + SaleScope to exist (consultation-stage facts captured only on the deal, e.g. goals/conditions/expectations, have no path into the snapshot yet); `overview`, `sale_strategy`, `next_steps` are operator-written.
- **Classification:** ✓ EXISTING / SUPPORTED for the built chain; △ extend snapshot inputs for new consultation fields. This is the major promise — it is ~80% true today.

## 26. ESTIMATED VS ACTUAL

- **Existing (verified):** `SaleEconomicsPanel` renders projected-vs-actual variance rows — company revenue, **labor hours**, cash labor cost, direct costs, contribution — from the canonical model (`variance` helper). Deal economics are projected truth; settlement is the actuals writer.
- **Classification:** ✓ EXISTING / SUPPORTED (Parts 52 & 53).

## 27. RISK ACCURACY

- **Missing:** consultation flags (client fit, site flags) persist, but nothing links them to post-sale outcomes ("did this risk materialize?"). Retained notes ≠ accuracy analytics. ＋ BUILD (P2). Do not infer.

## 28. DECLINED-SALE HISTORY

- **Existing (data):** structured lost_reason + lost_notes + referred provenance + nurture stage are all retained on deals. **Analytics:** LeadSourcePerformance is source→revenue, not decline-reason analysis; no "why we say no" dashboard. Data collection ✓; pattern analytics △/P2 (simple deterministic counts, matching the no-vanity-scores decision).

## 29. CONSULTATION LEARNING LOOP

CONSULT (△ scattered) → ESTIMATE (✓) → DECIDE (△ scorecard yes, structured recommendation no) → PROPOSE (✓) → OPERATE (✓ Ch8) → MEASURE ACTUAL (✓ settlement/labor) → COMPARE (✓ SaleEconomicsPanel variance) → **LEARN (✗ broken — no risk-outcome link, no cross-sale pattern analysis)** → **BETTER NEXT CONSULTATION (✗ nothing feeds back into questions/estimates)**. Two broken transitions; both P2/LATER.

## 30. CONSULTATION TRUTH MODEL

| Truth | Canonical source | Conflict/duplicate |
|---|---|---|
| SELLER FACT | Inquiry record (EstateTransitionLead/WebsiteLead) → deal fields | deal snapshot vs live inquiry — bridge-time copy is provenance-linked ✓ |
| PROPERTY FACT | EstateSale.property_address / site_assessment | **deal.property_address duplicates sale property_address** (known accepted duplication for pre-sale stage) |
| OPERATOR OBSERVATION | client_fit, site_assessment enums, notes | clean |
| CLIENT EXPECTATION | client_fit ratings + SaleScope.client_expectations | split across deal (pre-sale) and scope (post-contract) — acceptable, stages differ |
| CLIENT GOAL | **NONE — GAP** | — |
| AUTHORITY | SaleAuthority (+ client_fit.authority_clarity pre-sale) | observation vs authority record properly separated ✓ |
| DEADLINE | **NONE — GAP** (estimated dates only) | — |
| MERCHANDISE OBSERVATION | Item fields / notes | **GAP at consultation stage** |
| RESEARCH UNKNOWN | Item.research_status + reason/resolution | clean, human-only ✓ |
| LABOR ESTIMATE | deal.labor_estimates | clean vs LaborEntry actuals ✓ |
| PROJECTED ECONOMICS | deal economics block + saleEconomicsModel | single writer ✓ |
| CLIENT FIT | deal.client_fit | clean |
| SAFETY CONCERN | Ch8 security checklist state | **no consultation-stage structured flag — GAP** |
| ACCEPTANCE CONDITION | **NONE — GAP** | — |
| OPERATOR RECOMMENDATION | **NONE — GAP** (scorecard rating is computed, not recorded) | — |

## 31. OBSERVATION / EVIDENCE / UNKNOWN

- **Encoded and verified:** authority UNRESOLVED ≠ verified (readiness warns); research_status human-only, AI never sets; estimates carry ESTIMATE_NOTE; site/client-fit enums default `unknown`; range never invented from a single estimate; "populated license ≠ validity" (Ch11); "NOT_CERTIFIED safe" language in Ch8. No path turns an observation into a verified fact. ✓ The architecture passes; the new consultation fields must inherit the same discipline ("possible moisture concern" stays an observation).

## 32. PRIVACY / RLS

- Deal data: operator-scoped RLS on SaleConversionPipeline; site_assessment/access_details carry field-level read rules + explicit private doctrine (alarm/gate codes never projected to client docs); EstateSale drafts are private; marketing photo approval is opt-in; Ch11 fit notes private. **No consultation leakage found — no P0.** Watch item: consultation photos must not silently enter the marketing-eligible pool — current approval gate already prevents default exposure ✓.

## 33. MOBILE REALITY

- 390/428px: deal modal, panels, outcome dialogs verified responsive in prior chapters. But a desktop-responsive deal form is **not** a Mobile Consultation Mode — no walking flow, no large-target capture sequence, no room navigation. ＋ BUILD (P1). Offline: none; LATER (Chapter 24 manual fallback remains the honest answer).

## 34. READY-TO-USE TOOLS (all 29)

1. Pre-consultation questionnaire — SMALL ENHANCEMENT (deal intake block)
2. Property profile — EXISTING TEMPLATE (site_assessment, sale-scoped) / seam at deal stage
3. Decision-maker worksheet — INTERACTIVE SYSTEM ALREADY BETTER (SaleAuthority + client_fit)
4. Authority clarification form — EXISTING (SaleAuthority verification_status + readiness warnings)
5. Property deadline worksheet — GENUINE GAP (P1)
6. Room-by-room checklist — GENUINE GAP (P1, lightweight)
7. Merchandise assessment worksheet — SMALL ENHANCEMENT (mix/volume advisory; honest range exists)
8. Property condition checklist — GENUINE GAP (P1, small structured enum)
9. Safety observation sheet — SMALL ENHANCEMENT (observation-only, Ch8 checklist exists)
10. Access & parking assessment — EXISTING (site_assessment enums)
11. Customer-flow worksheet — EXISTING partial (sale_day_restrictions, checkout checklist state)
12. Furniture-removal assessment — EXISTING (loading_access, pickup_constraints)
13. Preparation-work estimator — SMALL ENHANCEMENT (Ch8 checklists exist; advisory link to labor)
14. Labor-hour estimator — INTERACTIVE SYSTEM ALREADY BETTER (labor_estimates + categories + owner time)
15. Staffing worksheet — P2 (derive suggestion from hours)
16. Client-goals worksheet — GENUINE GAP (P1, small)
17. Client-expectations worksheet — SMALL ENHANCEMENT (client_fit + scope exist; consult-stage structure missing)
18. Research-needed tags — INTERACTIVE SYSTEM ALREADY BETTER (Item.research_status)
19. Specialist-review form — EXISTING (VERIFY/SPECIALIST_REVIEW states + Ch11 network)
20. Sale profitability calculator — INTERACTIVE SYSTEM ALREADY BETTER (DealEconomicsPanel + scorecard)
21. Sale opportunity scorecard — INTERACTIVE SYSTEM ALREADY BETTER (Sale Acceptance Scorecard; see §41)
22. Client-fit checklist — INTERACTIVE SYSTEM ALREADY BETTER (ClientFitPanel)
23. Consultation red-flag checklist — SMALL ENHANCEMENT (deterministic flags exist across scorecard/readiness; not assembled)
24. Alternative-solution worksheet — INTERACTIVE SYSTEM ALREADY BETTER (Ch11 Who Can Help + referred outcome)
25. Consultation summary — GENUINE GAP (P1, assembled view)
26. Conditional recommendation — GENUINE GAP (P1 — conditions record)
27. Professional decline template — P2 (decline outcomes exist; letter template does not)
28. Post-consultation review — P2 (risk-outcome link)
29. Estimated-vs-actual evaluation — INTERACTIVE SYSTEM ALREADY BETTER (SaleEconomicsPanel variance)

No static printable worksheets should be built where the interactive system is better (per standing decision).

## 35. DO-NOT-REBUILD

SaleConversionPipeline (canonical deal + client_fit + economics + labor_estimates + outcomes) · Contact · EstateSale (+site_assessment + access_details) · SaleAuthority · SaleScope · SaleClientDecision · SaleTask/SaleNote/Activity · Item.research_status · LaborEntry · Expense/BusinessExpense · saleEconomicsModel (single financial truth — untouchable) · Sale Acceptance Scorecard · SaleProposal/snapshot · SaleAgreement · SettlementStatement · Chapter 11 Professional Network + Who Can Help + outbound referral · BusinessDocument/ComplianceQuestions/AI Compliance Navigator · PrepareSale/prepareModel · Equipment architecture · Customer.io outbox · source-to-revenue reporting · aiCoach mode architecture + data boundaries · MarketingKit photo approval.

## 36. DUPLICATION RISKS

- A new Consultation entity duplicating deal/scope/site_assessment truth — avoid (see §37).
- A second room entity vs StorageLocation — avoid; use lightweight consultation capture.
- A second deadline/reminder engine — deadlines must reuse the next-action/Activity pattern.
- Numeric "opportunity score" competing with the deterministic scorecard — do not build.
- Client goals on both Contact and deal — goals are project-scoped → deal only.

## 37. SMALLEST RECOMMENDED ARCHITECTURE (NOT IMPLEMENTED)

**Recommendation: NO new entity.** Extend the canonical deal (SaleConversionPipeline) with one `consultation` object (or small set of top-level fields): structured intake answers, client goals (multi-select), external deadline(s), condition observations, room-by-room capture array, consultation photo URIs, recommendation {classification: appropriate|conditional|alternative|decline, reasons, conditions[], decided_at}, and let the existing proposal snapshot consume it. Historical truth is already served: the deal persists, the proposal freezes at finalize, and accepted terms snapshot at acceptance — a separate consultation *snapshot entity* is NOT necessary unless the deal is expected to be rewritten after consultation (it is not: history discipline exists on scope; deal consultation fields are append-correctable via Activity). Property facts captured at consultation should write into `site_assessment` once the sale exists, via one explicit copy step (the single honest re-key, not retyping).

## 38. INTERFACE GAP VS DATA-MODEL GAP

**Primarily B — a missing guided interface that assembles existing systems.** The data model covers ~70% (economics, fit, authority, labor, research, proposal, outcomes). The genuine data-model additions are small and additive (goals, deadline, conditions, condition flags, room capture, recommendation) and belong on the canonical deal. The larger work is the Consultation Mode UI: a mobile-first, staged walkthrough that reads/writes canonical records and ends in a structured human recommendation that flows into the proposal.

## 39. P0 / P1 / P2 / P3 / LATER ROADMAP

- **P0:** none new found (privacy verified; approval gates in place; single financial writer; no safety certification language).
- **P1:** Guided mobile **Consultation Mode** (staged: intake → property/rooms → merchandise/conditions → access → client goals/expectations → deadline → authority/fit → economics review → recommendation) · pre-consultation intake block · client goals + external deadlines + deterministic deadline-conflict check · condition/safety observation flags (observation-only) · room-by-room lightweight capture · consultation photos kept private by default · recommendation record with explicit conditions · research-unknown/authority advisories added to scorecard reasons · consultation summary (assembled) · proposal snapshot extension for consultation fields · decline/alternative already handled (verify seams only).
- **P2:** the nine AI modes (Prep, Expectation Check, Evaluation Coach, Labor Risk Review, Profitability Review, Client-Fit Review, What-Am-I-Missing, Recommendation Draft, Consultation Learning — minus learning→LATER) · risk-accuracy analytics · declined-reason analytics · staffing suggestion · decline letter template.
- **P3/LATER:** cross-sale predictive labor modeling · true capacity engine · offline-first consultation · computer-vision assessment · predictive outcome modeling · AI consultation learning.

## 40. BOOK TRUTH (strict list)

- Pre-Consultation Questionnaire — **NOT YET — BUILD** (fields partial)
- Property Profile — **YES AS EXISTING-SYSTEM OUTCOME** (sale-scoped; consult-stage seam pending)
- Decision-Maker/Authority — **YES** (sale-scoped; consult exposure = small enhancement)
- Timeline Builder — **NOT YET — BUILD** (only forward dates exist)
- AI Consultation Prep — **P2**
- Mobile Consultation Mode — **NOT YET — BUILD (P1)**
- Room-by-Room — **NOT YET — BUILD (P1)**
- Photo Documentation — **YES AS EXISTING-SYSTEM OUTCOME** (marketing-gated); consultation-distinct capture = small enhancement
- Voice-to-Notes — **NOT YET — P2** (voice navigation exists; do not overclaim)
- Condition Flags — **NOT YET — BUILD (P1)**
- Research Flags — **YES**
- Preparation Assessment — **YES AS EXISTING-SYSTEM OUTCOME** (Ch8); consultation input = enhancement
- Labor Estimator — **YES**
- Staffing Estimate — **P2**
- Access Complexity — **YES** (sale-scoped)
- Sale Setup Assessment — **YES AS EXISTING-SYSTEM OUTCOME** (partial; rooms/checkout via records)
- Client Goal Record — **NOT YET — BUILD (P1)**
- Deadline Tracking — **NOT YET — BUILD (P1)**
- Special Handling — **YES**
- Expectation Notes — **YES AS EXISTING-SYSTEM OUTCOME** (partial)
- AI Expectation Check — **P2**
- Saleable-Value Assessment — **YES AS EXISTING-SYSTEM OUTCOME** (honest range; mix advisory = enhancement)
- Labor-to-Value — **YES**
- Commission & Minimum Calculator — **YES**
- Projected Expense Review — **YES**
- Profitability Preview — **YES**
- Capacity Check — **WORDING SHOULD CHANGE** — "capacity visibility" only; true capacity = LATER
- Authority Flag — **YES** (agreement-level)
- Safety Flag — **YES AS EXISTING-SYSTEM OUTCOME** (Ch8, reviewed-not-certified); consult-stage flag = enhancement
- Timeline Flag — **NOT YET — BUILD (P1, deterministic)**
- Labor-Risk Flag — **YES AS EXISTING-SYSTEM OUTCOME** (site advisories, human-entered); dedicated labeling = enhancement
- Expectation Flag — **YES AS EXISTING-SYSTEM OUTCOME** (client_fit advisory)
- Client-Fit Flag — **YES**
- AI Evaluation Coach / Labor Risk Review / Profitability Review / Client-Fit Review / What-Am-I-Missing — **P2**
- AI Research Assistant — **YES** (existing, suggestion≠verified)
- Sale Opportunity Score — **WORDING SHOULD CHANGE** (§41)
- Strong Candidate — **YES** (scorecard STRONG, evidence-based, no auto-accept)
- Conditional Candidate — **NOT YET — BUILD (P1)**
- Research Required (hold) — **NOT YET** (safe by absence; wire in recommendation)
- Alternative Solution — **YES**
- Decline — **YES**
- Consultation Summary — **NOT YET — BUILD (P1, assembled)**
- Client Recommendation — **NOT YET — BUILD (P1)**
- Conditional → proposal flow — **NOT YET — BUILD (P1)**
- AI Recommendation Draft — **P2**
- Decline Letter — **P2**
- One-Click Proposal — **YES AS EXISTING-SYSTEM OUTCOME** (~80%; consultation-field extension pending)
- Estimated vs Actual Labor — **YES**
- Projected vs Actual Results — **YES**
- Risk Accuracy — **P2**
- Declined-Sale History — **YES** (data) / analytics **P2**
- AI Consultation Learning — **LATER**
- Offline — **LATER**

## 41. SALE OPPORTUNITY SCORE WORDING

**CHANGE — recommend "SALE ACCEPTANCE REVIEW"** (matching the shipped product name "Sale Acceptance Scorecard"). Rationale: the platform deliberately rejected a standalone complexity score (Chapter 9 decision) and shipped a deterministic, explainable rating (STRONG/ACCEPTABLE/MARGINAL/HIGH RISK/NEEDS INPUTS) with written reasons — no numeric precision. "Score" in the manuscript implies a number the product will not fabricate; "Sale Opportunity Review" is acceptable second choice, but "Sale Acceptance Review" is the truthful, already-shipped language. Do NOT build a numeric score to preserve wording.

## 42. PRODUCT DOCTRINES (all confirmed encoded or to be inherited)

A packed house is not automatically a good sale → scorecard requires economics, not volume ✓ (merchandise_volume is advisory only). Open date ≠ reason to accept → calendar overlap advisory, no auto-accept ✓. Consultation is an evaluation → deal tabs (economics/fit) exist; mode pending △. Best three items ≠ the property → honest range doctrine ✓. Unknown is data ✓. Observation is not verification ✓ (authority/research). AI suggestion is not verified fact ✓. Projected ≠ actual ✓ (separate writers). Expectation is not authority ✓ (client_fit vs SaleAuthority). A flag explains, never decides ✓. Consultation feeds the proposal's factual foundation ✓ (buildProposalSnapshot). Do not type the same truth twice — ✓ at sale stage; one accepted seam at deal→sale property facts (explicit copy, not retyping).

## 43. CONSULTATION → PROPOSAL TRUTH CHAIN

SELLER INQUIRY ✓ (bridge) → QUALIFICATION ✓ (deal + scorecard inputs) → PRE-CONSULTATION △ (gap) → CONSULTATION ＋ (mode gap) → EVIDENCE △ (site/fit exist; rooms/conditions gap) → LABOR/ACCESS/TIMELINE/CAPACITY ✓/✓/△/△ → PROJECTED ECONOMICS ✓ → RISKS/UNKNOWNS ✓ (deterministic; unknowns stay visible) → RECOMMENDATION ＋ (gap) → PROPOSAL ✓ (snapshot, zero re-entry, unresolved facts visible) → AGREEMENT ✓ (immutable Ch9) → ACTUAL SALE ✓ → POST-SALE LEARNING ＋ (compare ✓, learn ✗).

## 44. LEARNING LOOP

Broken transitions: LEARN and BETTER NEXT CONSULTATION (§29). All earlier transitions intact or buildable within existing architecture.

## 45. RECOMMENDED IMPLEMENTATION SEQUENCE (NOT IMPLEMENTED)

1. Data additions on the deal (goals, deadlines, conditions, condition flags, room capture, recommendation) — additive, RLS inherited.
2. Deterministic extensions: deadline-conflict check; scorecard research/authority advisory reasons; consultation summary assembly.
3. Guided mobile Consultation Mode (staged walkthrough, photos private, large targets).
4. Proposal snapshot extension (consultation fields, conditions, goals) — one-way handoff.
5. P2 AI suite atop the captured, grounded consultation record.

## 46. PRE-LAUNCH DEPENDENCIES (carried forward)

Physical Item QR scan · Ch9 decision-dialog + closeout-warning manual confirmations · second-account RLS checks · Worksheet Add Transaction click-through · Vault Expiring Soon filter · Professional escalation Contact selection · SMS certification · Houszu certification · Meta access/secrets · physical Ch11 partner QR scan. **Chapter 12-specific:** none yet (nothing built); when Consultation Mode ships — mobile walkthrough on a real property, private-photo default verification, consultation→proposal handoff on a live deal.

## 47. CERTIFICATION

# **GO WITH CONDITIONS**

The existing architecture (economics, acceptance scorecard, authority, client fit, research, proposal/agreement, decline/refer/nurture, professional network, projected-vs-actual) is certified for truthful book claims today, with two wording changes required (Sale Acceptance Review; capacity visibility). The consultation-specific promises (pre-consultation intake, mobile consultation mode, room-by-room, conditions, goals, deadlines, recommendation with conditions, consultation summary) are **NOT YET — BUILD (P1 interface-first, minimal additive data)** and must not be claimed until implemented and certified.

**STOP — CHAPTER 12 NOT BUILT. CHAPTER 13 NOT STARTED. Awaiting explicit authorization.**