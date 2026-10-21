# CHAPTER 13 — ESTATESALEN CROSS-AUDIT REPORT
## Sale Activation, Client Onboarding & Project Control

Audit date: 2026-10-21. AUDIT ONLY — no code, data, workflows, communications, or agreements were modified. All findings are from inspection of the deployed source, entity schemas, backend functions, and the Chapter 1–12 certification history.

---

## EXECUTIVE SUMMARY

**Coverage:** 89 audit parts inspected against live architecture.
- ✓ EXISTING / SUPPORTED or COVERED BY EXISTING SYSTEM: **41 parts**
- △ ENHANCE (existing system, small gap): **14 parts**
- ＋ BUILD (genuine gap): **8 parts**
- ✆ COMMITTED PRE-LAUNCH (carried standing dependency): **4 parts**
- ✎ BOOK / PRINTABLE: **4 parts**
- ✕ DO NOT BUILD / DUPLICATE: **18 parts**
- P2 (AI/advanced, not this chapter's P1): **9 parts**
- LATER CHAPTER: **5 parts**

**Coverage estimate: ~68% of the Chapter 13 truth chain is already supported by certified, canonical systems; ~22% needs small enhancement; ~10% is genuine gap.**

**Strongest existing architecture:**
1. **Change history** — SaleClientDecision `history[]` (previous instruction, new instruction, requested/authorized by, timestamp, source, reason, recorded-by) is the strictest history model in the platform. SaleScope `history[]` + versioning and SaleProposal/SaleAgreement immutable snapshots complete it.
2. **Automatic Sale File** — EstateSale is already the permanent project home: items, tasks, notes, decisions, authorities, scope, proposals, agreements, expenses, labor, equipment, marketing kit, transactions, early sign-ins, offers, settlement (via linked deal), recap — all anchored by `sale_id` + `operator_id` + `sale_team_ids` RLS projections.
3. **Task accountability** — SaleTask (owner, due date, blocked flag, priority, attention, completion audit) + cross-sale Workload Planner + calendar + due-soon/overdue logic.
4. **Keep/Sell/Review** — merchandise decisions fully independent of Item.status, available from onboarding onward.
5. **Deterministic readiness** — SellerOnboarding (10-step post-yes readiness) and PrepareSale (deterministic preparation readiness) — honest, record-driven, no fake AI.

**Largest genuine gaps (all P1, none P0):**
1. **No one-click sale activation** — a deal becomes a sale only by manually creating an EstateSale (re-typing title, address, dates, commission) and then linking it; no activation gate, no inheritance, no onboarding launch.
2. **No Unresolved Issues system** — nothing represents an important unanswered operational question that is not a task, not a client decision, and not merchandise research.
3. **No task dependencies** — SaleTask has a blocked *flag* only; no `blocked_by` references to tasks, decisions, or issues.
4. **No promise→task capture** — commitments in notes/consultation/agreement have no "Create Task from this" action and no provenance field.
5. **No project control dashboard** — the data exists across six surfaces; no assembled view.
6. **No communication plan** — no primary communication contact, preferred method, or update cadence on the active project (inquiry-level `preferred_contact_method` is captured but never carried forward).

**Verdict: GO WITH CONDITIONS** (§50).

---

## 1. SALE ACTIVATION

**Classification: ＋ BUILD (one-click activation) / current state = manual link.**

Actual deployed paths (verified in `src/pages/SaleConversionPipeline.jsx`, `src/pages/SaleEditor.jsx`, `src/components/estate/CreateEstateSaleModal.jsx`):

- **Deal → link an EXISTING sale:** `handleLinkSale` sets `deal.estate_sale_id` and copies `referral_source_type` / `referral_source_name` projections onto the sale. The sale must already exist — created by hand in SaleEditor/CreateEstateSaleModal/MySales with re-typed title, description, sale_type, address, dates, commission, team.
- **Sale → deal (reverse auto-create):** `handleSyncAllDeals` auto-creates pipeline deals for *unlinked sales*, with `client_name = sale.title` (poor fidelity — a title is not a client).
- **Stage sync:** `SALE_STATUS_TO_STAGE` projects sale status → deal stage for linked records.

**What copies today:** referral source projections only (plus distance snapshot via `applyDistanceSnapshot` when the sale is saved).
**What remains referenced (correctly, not duplicated):** consultation block, client goals, acceptance conditions, economics, authority verification, accepted-terms snapshot — all stay on the canonical deal/records and are read live through `deal.estate_sale_id`.
**What is lost:** nothing is destroyed, but **nothing is inherited** either.
**What must be re-entered:** sale title, description, sale_type, property address, sale dates, commission_rate, sale team — i.e., the operator rebuilds the sale by hand.

**Doctrine check:** ACTIVATION ≠ DUPLICATION — correct. The fix is an activation action that *creates the EstateSale from the linked deal + accepted proposal snapshot* (address from deal, dates from accepted snapshot, commission/minimum from deal canonical fields, title generated not re-typed), links `estate_sale_id`, and leaves everything else referenced. No truth should be copied except presentation identity (title) and projections already defined (referral source, distance).

## 2. ACTIVATION GATE

**Classification: ＋ BUILD (gate is currently absent).**

Current rule: **none.** The stage mover lets any deal jump to `setup_in_progress` / `sale_live` with one click; a sale can be linked at any stage; `requestStageChange` only gates terminal outcomes (lost/referred/nurture open the outcome dialog). AgreementReadiness surfaces missing items (proposal, authority, scope, terms acceptance) as NEEDS REVIEW — but it is a readiness *view*, not a gate.

**Honest gate recommendation (no invented legal requirement):** activation should require, deterministically and operationally: linked deal + client identity + property address + at least draft status sale. It should *warn* (not block) on: no accepted proposal, no ACTIVE scope, UNRESOLVED/DISPUTED authority, no sale dates. An operator may legitimately activate without a signed agreement (e.g., verbal + check) — the gate records the exception, it does not forbid it.

## 3. AUTOMATIC SALE FILE

**Classification: ✓ EXISTING / SUPPORTED.**

EstateSale is the project home for: documents (BusinessDocument scope=sale), photos (images + private consultation photos via file_uri), tasks (SaleTask), inventory (Item), research (research_status), marketing (MarketingKit, campaigns, SocialPost), transactions (Transaction), pickups (Item.pickup_completed_at, pickup_location), communications (Activity), decisions (SaleClientDecision), expenses (Expense), labor (LaborEntry), equipment (SaleEquipmentAssignment), settlement (SettlementStatement via deal), closeout (SaleCloseout 6-step + SaleRecap). Sale-editor team changes sync `sale_team_ids` projections on children (verified in SaleEditor `handleSave`).

**Still outside the sale without a reliable link:** consultation-private photos live on the *deal's* consultation block (linked via `estate_sale_id` — reliable, by design, never auto-copied). Donation/Cleanout records are operator-scoped with optional sale linkage — acceptable. **No second Sale File entity needed.**

## 4. ONBOARDING CHECKLIST

**Classification: ✓ EXISTING ×2, △ one launch seam; ✕ DO NOT BUILD a third.**

Three distinct, non-duplicative systems:
- **Chapter 1 SaleTasks** — 15-step DEFAULT_TASKS template (includes the Chapter 6 Sensitive Material Review step), persisted as SaleTask records with accountability. Created only when the operator opens SaleTasks for a sale and generates them.
- **Chapter 7 SellerOnboarding** — 10-step deterministic readiness over canonical records (client, authority, scope, documents, site assessment, K/S/R, instructions, dates, tasks, communications); creates NO records; every step deep-links to the canonical system.
- **Chapter 8 PrepareSale** — deterministic preparation readiness + Load-Out/Pack-Out/Security/Checkout checklist templates projected into SaleTask.

**Gap:** activation launches NOTHING automatically. No conflicting templates found (different purposes, same SaleTask substrate). **One consistent activation sequence should launch: create tasks from template + open SellerOnboarding.** Templates are hardcoded — see §31.

## 5. PROJECT DASHBOARD

**Classification: △ INTERFACE GAP (data exists; no assembled view).**

Today the operator assembles the picture from: SaleConversionPipeline detail tabs (next action, Ch9 progression, consultation entry, economics, client fit, activity), SellerOnboarding readiness, PrepareSale readiness, SaleClientDecisions, SaleTasks, SaleCloseout. Everything a Chapter 13 dashboard needs is queryable — this is purely an assembled-view gap (see §32, §71). **Do not create a DashboardData entity.**

## 6. AUTHORITY / CONTACTS (Parts 7–9, 38)

**Authority: ✓ EXISTING.** SaleAuthority: `verification_status` VERIFIED / UNRESOLVED / DISPUTED, `authority_scopes` (what this person may authorize), `is_primary`, evidence refs, activation/deactivation audit. Panels and the Ch12 Acceptance Review surface "AUTHORITY NEEDS REVIEW" operationally. Chapter 12 certifying flow verified the warning clears on operator verification.

**Authority rules (who may instruct / receive updates / approve):** structured via `authority_scopes` + `is_primary`; AgreementReadiness names the authorized person. **△** there is no plain-language "who may give instructions" summary on the active project — an assembled-view item, not a data gap.

**Contacts (Part 8): △.** Contact's role taxonomy (seller, executor, attorney, agent, referral, contractor, …) already distinguishes people. **Missing:** a sale-scoped roster — Contact has no `sale_id` link, and neither deal nor sale names a PRIMARY COMMUNICATION CONTACT. INVOLVEMENT ≠ AUTHORITY is enforced inside SaleAuthority, but the communication contact is unrepresented.

**Part 38 — Primary Communication Contact: ＋ small BUILD** (one field/block on the sale or deal: contact link + role labels).

## 7. KEEP / SELL / REVIEW (Part 12)

**✓ EXISTING / SUPPORTED.** MerchandiseDecisionPanel: keep/sell/review decisions through SaleClientDecision (decision_type `merchandise`, `item_id`, history, authority). Explicit doctrine in code: "KEEP/SELL/REVIEW is the client's disposition authority — it never changes an item's selling status." Status is available early (onboarding), filterable unresolved REVIEW list. **Verified live in Chapter 12 certification.**

## 8. RETAINED ITEMS / EXCLUDED AREAS (Parts 13–16)

- **Retained-item register (Part 16): ✓ EXISTING-SYSTEM OUTCOME** — query `SaleClientDecision` where decision_type=merchandise AND current_decision=keep (+ Item link). △ small interface gap: no saved register view; a filtered panel is a small enhancement. **No RetainedItem entity.**
- **Retained-item photos (Part 13): ＋ GENUINE GAP.** Item.images and EstateSale.images are public marketing channels; consultation photos are private but live on the pre-sale deal block. There is **no private photo association for KEEP/excluded merchandise**. Smallest fix: reuse the consultation private-photo pattern (private file_uri on the decision or item, signed-URL viewing) — do NOT create a photo system.
- **Excluded areas (Part 14): △.** Data exists: `site_assessment.access_details.restricted_rooms` / `occupied_areas` (Ch9) and consultation room observations. Team visibility is a checklist prompt ("Restricted areas identified" in the Security Walkthrough template) — not a surfaced list on the project view. Small enhancement: surface restricted areas on PrepareSale/dashboard.
- **Family removal deadline (Part 15): △.** `consultation.external_deadlines` (movers, property_turnover, etc.) captures the date on the deal; SaleTask can represent the work. Missing: the link from a retained/excluded set to its removal deadline + responsible person + status. Smallest fix: reuse external_deadlines + a decision/task reference — no new date system.

## 9. CLIENT CHANGE CONTROL (Parts 17, 20, 66)

**Recording: ✓ EXISTING.** All post-activation changes flow through SaleClientDecision (merchandise, pricing, disposition, financial, property_access, general) with DecisionChangeDialog; scope changes append SaleScope history; commercial-term acceptance writes deal metadata without rewriting snapshots.

**Workflow: △ PARTIAL.** SaleClientDecision records an *already-authorized* instruction. There is no REQUESTED → APPROVED state: a client request and an approved change collapse into one recorded decision (the operator is trusted to record only authorized instructions). The `status: open/resolved` field partially serves, and REVIEW merchandise creates an open awaiting-decision state. **Smallest P1 enhancement:** treat `status: open` + a `requested_at/requested_by` pair as the request state, so "request submitted" ≠ "approved" is representable without a new entity.

## 10. CHANGE HISTORY (Part 18)

**✓ EXISTING — strictest system audited.** Per change: what changed (subject/item), previous AND new instruction (history entries, never overwritten), requested-by/authorized-by (SaleAuthority id + name snapshot), decided_at timestamp, source (phone/email/in-person/text/contract), reason, recorded_by audit. SaleScope adds versioned snapshot history; proposals/agreements freeze accepted/executed truth. **Current state alone is never the history.**

## 11. DOWNSTREAM IMPACT (Part 19)

**＋ NOT PRESENT — classify LATER/P2.** No system knows that a SELL→KEEP change affects an item that was already photographed/researched/priced/marketed. The raw state exists on Item (research_status, images, status, sold_date, included_in_settlement, pickup_completed_at), so a deterministic "this item already has X/Y/Z work on it" advisory is feasible later. **Do not build now** (Chapter 15/18/21 territory).

## 12. TIMELINE / MILESTONES (Parts 22–24, 26)

- **Dates stored: ✓** — sale_dates, task due dates, consultation external deadlines, document expirations.
- **Timeline builder: ＋ GENUINE INTERFACE GAP.** No backward plan from property-completion deadline through disposition/pickup/sale days/marketing/photography/pricing/research/preparation. All inputs exist; this is an assembled view + derived dates (e.g., "photography must complete N days before first sale date"), never an auto-scheduler.
- **Milestones: △.** No milestone entity, and none should be built. EstateSale status (draft→upcoming→active→completed), SellerOnboarding readiness, PrepareSale readiness, and the 6-step closeout already cover ACTIVATED / ONBOARDING / PREPARATION / SALE / CLOSEOUT states. Missing only: explicit FAMILY REMOVALS COMPLETE / PICKUP COMPLETE / DISPOSITION COMPLETE checkpoints — these can be readiness items derived from records (items' pickup_completed_at, Donation/Cleanout status), not new records.
- **Deadline alerts (Part 26): ✓.** isOverdue/isDueSoon in SaleTasks, Workload overdue groups, OperatorCalendar, `notifyCalendarSaleReminders` function. Surfaces before emergency. **No second alert engine.**

## 13. TASKS / OWNERS / DUE DATES (Parts 28–29)

**✓ EXISTING.** SaleTask: sale, name, description, category, assignee (user id + name snapshot), due date, status, priority, blocked flag, attention flag, completion audit (completed_at/by/name), RLS read for operator + sale_team + admin. Orphan behavior: unassigned tasks surface in their own Workload group ("Unassigned"). Due dates drive upcoming/overdue/calendar. **No orphan-task hiding.**

## 14. TASK DEPENDENCIES (Parts 25, 30, 47, 58, 70)

**＋ GENUINE DATA GAP.** SaleTask.blocked is a boolean + free-text reason only. No `blocked_by_task_ids`, no dependency on a client decision, authority resolution, family removal, research, or outside provider. Checklist sort_order is sequence, not dependency. **Recommended smallest model (do NOT implement):** `SaleTask.blocked_by_task_ids: []`, `blocked_by_decision_id`, `blocked_by_issue_id` — three references, no workflow engine.

## 15. PROMISE → TASK (Parts 27, 68)

**＋ GENUINE GAP (manual capture).** No "Create Task from this" exists on SaleNote, consultation commitments, agreement obligations, or communications; SaleTask has no provenance/source field. **Smallest P1:** a manual convert action writing `source_type` + `source_ref` on the created SaleTask. **AI extraction of promises: P2** (Ch32) — never automatic without human approval.

## 16. TEAM ASSIGNMENTS / ROLE VIEWS (Parts 33–34, 76)

**Assignments: ✓.** Any category of work is a SaleTask with an assignee from the sale team; category field covers research/photography/pricing/staging/signs/marketing/staffing/checkout/pickups/donation/cleanout. **No department-specific systems.**

**Role-based views: △ privacy finding (P1, not P0).** SaleTask RLS read includes sale_team members — employees see their work ✓. BUT EstateSale read for team members exposes the whole record: `site_assessment.access_details` (alarm/gate codes), actual_revenue, commission fields (field-level RLS also admits sale_team). Sale-team membership is operator-designated (same company), so this is not a cross-company leak; it IS broader than "only necessary data." **Recommend P1 policy decision:** either accept (small trusted teams) or add field-level RLS excluding sale_team from `access_details`/financials. **No cross-company P0 found** — Contact, company, deal, and sale RLS are operator/creator/admin anchored (Chapter P0 RLS certification report stands).

## 17. WORKLOAD / OWNER DASHBOARD (Parts 36–37)

**Workload: ✓ EXISTING (Chapter 3).** Cross-sale planner groups open tasks by Overdue / Due Today / Due This Week / Blocked / Unassigned, per sale + assignee with due dates. Task count is honestly a count, not capacity. Sufficient for Chapter 13.

**Owner dashboard: △ INTERFACE GAP.** "What needs attention" is scattered across pipeline next-actions, workload, decisions, readiness views. Same assembled-view recommendation as §5. **No DashboardData entity.**

## 18. COMMUNICATION PLAN (Parts 39–40)

**＋ small GAPS (fields, not systems).**
- Preferred method: captured at inquiry (WebsiteLead.preferred_contact_method, with explicit consent separation: marketing_opt_in, sms_opt_in, consent_captured_at — preference ≠ consent, correctly modeled) — **but never carried to the deal/sale.** No per-project communication preference.
- Update schedule (as needed / weekly / milestone-based): **absent.**
Smallest fix: a small `communication_plan` block on the deal or sale (primary contact link, preferred method, cadence, notes), mirroring the consultation-block pattern. **No communication engine** — the plan informs the human; AI drafting already exists (§19).

## 19. CLIENT DECISION REQUESTS & AI UPDATES (Parts 41–42)

- **Decision requests (Part 41): △.** SaleClientDecision has question (subject), authority (authorized_by), decision, status, history — but no requested-date / answer-by-date / awaiting-response state. Reuse SaleClientDecision (per audit instruction); add answer-by + requested-state as the small enhancement (same as §9).
- **AI client updates (Part 42): ✓ EXISTING-SYSTEM OUTCOME.** `client_progress_update` coach mode is grounded in server-fetched verified per-sale context (tasks, decisions, authorities, items, research, pinned/recent notes) with a strict governance footer; draft-only, no auto-send. Chapter 13's "AI client updates" promise is supported today. `sellerOnboardingAi.draft_client_update` adds an onboarding-grounded draft.

## 20. COMMUNICATION HISTORY (Part 43)

**✓ EXISTING — canonical.** Activity entity is the single sale-scoped communication log (CommunicationsPanel / DealCommsPanel; Chapter 3). SaleNote remains internal team memory; Activity remains client communication. **No second log.** △ one seam: client decision *communications* are not automatically linked as Activity entries — the operator logs them manually.

## 21. UNRESOLVED ISSUES (Parts 44–46, 79, 69)

**＋ GENUINE GAP — the one justified new entity.**

Proof of necessity (Part 79): SaleTask = work that must be done. SaleClientDecision = a matter requiring the client/authority. Research flag = merchandise needing another look. SaleNote = narrative memory. **None of these is "an important unanswered operational question that may block work"** ("Who is removing the piano?", "Will the HOA permit Saturday?", "Which family member has the garage key?"). Generic notes are not proof of an issues system — a note has no owner, no answer-by date, no blocking semantics, no resolution.

**Recommended (DO NOT IMPLEMENT): ONE narrowly scoped `SaleIssue` entity** — sale_id, operator_id, sale_team_ids, question, category (blocking-area), status (open/answered/resolved-into-decision/resolved-into-task/obsolete), owner, answer_by date, blocking_note, resolve refs (decision_id/task_id), timestamps; same RLS pattern as SaleTask. **Issue → resolution (Part 69):** an issue may resolve into an answer only, a SaleClientDecision, a SaleTask, or both — recorded as references so final truth lives in exactly one canonical place.

## 22. ISSUE OWNERS / DATES / DEPENDENCIES (Parts 45–47)

Absent with the system (see §21). The recommended entity carries owner, answer_by date, and a `blocking` descriptor (pricing / photography / marketing / sale opening / pickup / cleanout / settlement / specific task id) — deliberately a descriptor + optional task reference, **not a generalized dependency graph**.

## 23. POST-SALE PLAN (Part 49)

**✓ EXISTING.** SaleScope.post_sale_plan: default outcome (CLIENT_RETAINS/DONATE/CLEANOUT/BUYOUT/SPECIALIST/OTHER/DECISION_REQUIRED), notes, authorization metadata (who, how, when, authority ref). Honest DECISION_REQUIRED state; NO ACTION INFERRED FROM SILENCE. Active sale inherits it at scope creation; closeout step 2 reads live disposition state (donation/cleanout linked). **Do not wait until closeout — the plan already exists pre-sale.**

## 24. DONATION / CLEANOUT / BUYOUT (Parts 50–52)

**✓ EXISTING.**
- Donation: status workflow draft→published→responses_closed→awarded→completed, pickup_deadline (schedulable BEFORE sale), scope, photos, operator/property anchoring. Authorization is the post-sale-plan + decision seam. △ provider selection is response-driven (matches Ch22 model); pre-sale scheduling with a chosen provider works via pickup_deadline.
- Cleanout: same architecture + Chapter 11 Professional Network / CleanoutNetwork for provider coordination around sale, pickup, property deadline.
- Buyout/alternate: EstateSale.buyout_config, BuyoutModal, disposition decision types; consultation recommendation alternative_solution + Who-Can-Help link preserves the approved alternate channel (verified live in Ch12/Ch13 checks).

## 25. PICKUP / EQUIPMENT / FINAL WALKTHROUGH (Parts 53–55)

- **Large-item pickup plan: ✓ PARTIAL.** Item: fulfillment_options, pickup_location + instructions, pickup_completed_at; site_assessment.pickup_constraints. A pre-sale pickup *plan* (window/location/responsibility) is representable today across these fields; △ no single assembled plan view (acceptable — do not rebuild Ch21).
- **Equipment removal: ✓.** Pack-out checklist template + SaleEquipmentAssignment terminal states (RETURNED/DAMAGED/MISSING/LEFT_INTENTIONALLY) + closeout unresolved-equipment warning.
- **Final walkthrough: ✓ with △ seam.** Exists as Pack-Out step 4 + closeout resolution flow; **it can be scheduled from onboarding today** by creating the task from the template — but activation/onboarding does not pre-create it. Small P1: include closeout-stage template tasks at activation.

## 26. AI (Parts 6, 32, 42, 48, 56–61)

| Promise | Status | Evidence |
|---|---|---|
| AI Onboarding Review | ✕ deterministic already better | SellerOnboarding status IS the missing-info review (record-driven). AI layer unnecessary for P1; P2 optional |
| AI Task Extraction | P2 | No AI reviews notes/consultation for missing tasks. `team_task_suggestions` coach mode exists but is prompt-based, not record-grounded task creation. Never auto-create without approval |
| AI Open-Issue Review | P2 | Requires SaleIssue data first |
| AI Project Coach ("what am I overlooking") | △ partial → P2 | PrepCoachPanel is grounded on deterministic prepFactsString (preparation scope only); no whole-project grounding yet |
| AI Deadline Review | P2 | Dates exist; no collision analysis |
| AI Dependency Review | P2 | Blocked by missing dependency data (§14) |
| AI Client Decision Review | ✓ mostly | Verified per-sale context includes open/review decision counts; "identify unresolved decisions" is readable today in grounded modes |
| AI Readiness Check | ✓ deterministic (correctly NOT AI) | prepareModel stages; PrepareSale. Chapter 13 must reuse deterministic readiness — no fake AI |
| AI Daily Briefing | P2 | generateDailyAdminReport is admin/platform-scope, not per-operator project briefing |

**AI context privacy (verified):** aiCoach's sale context block contains ONLY title/status/location/dates/categories/featured/tasks/decisions/authorities/inventory/research/notes — **access_details, alarm codes, financials, settlement, and private family matters are NOT sent to any AI.** Governance footer forbids guessing and forbids consequential decisions.

## 27. ACTIVATION TRUTH CHAIN (Part 62)

Chain verified: **SaleConversionPipeline → SaleProposal (deal_id, snapshot at finalize) → accepted terms (commercial_terms_accepted_at/by/source, accepted_proposal_id, accepted_terms_snapshot) → SaleAgreement (deal_id, proposal_id, template_version, immutable body_text) → EstateSale (deal.estate_sale_id)**.

**Values that flow forward today:** client/property/dates/terms/goals/conditions/authority/economics — all remain on canonical records read through the link. Referral source + distance project onto the sale at link/save time.

**Re-entry seams (all in sale CREATION):** title, description, sale_type, address, dates, commission_rate, team — retyped by hand because the sale is created independently of the deal. **This is the single largest seam in the chain and the core of the one-click activation build.**

## 28. PROPOSED / ACCEPTED / CURRENT (Parts 63–65)

**✓ EXISTING / SUPPORTED (Chapter 9 doctrine holds).**
- Agreement immutability: activation paths never write to SaleProposal/SaleAgreement; snapshots freeze finalize/accept/execute states (re-verified live during Chapter 12 certification: post-save deal edits did not rewrite a saved proposal snapshot).
- Proposed ≠ accepted ≠ current: proposal snapshot (proposed) → accepted_terms_snapshot (accepted) → deal canonical fields + SaleScope versioned history (current). A later authorized change makes the project Y while X stays frozen in the accepted/executed records. ✓
- Current project truth lives in: SaleScope (ACTIVE, versioned), SaleClientDecision history, EstateSale editable fields, SaleTask, site_assessment. **The immutable agreement is never used as a mutable project database.** ✓

## 29. CLIENT REQUEST → DECISION → TASK (Part 66, 67)

**Map today:** CLIENT REQUEST → recorded directly as an authorized SaleClientDecision (the request and the authorization collapse — see §9) → CURRENT PROJECT TRUTH (decision/scope). **DECISION → TASK: ✕ absent.** An approved donation decision does not create/require a scheduling SaleTask; the operator creates it by hand. **Smallest P1:** a "Create task from this decision" action on the decision panel (with provenance ref), and a readiness warning when an authorized actionable decision has no related open task.

## 30. PROMISE → TASK (Part 68)

Absent (§15). Manual convert + provenance is the P1; AI extraction P2.

## 31. ISSUE → RESOLUTION (Part 69)

Absent (§21). Recommended resolution refs so the issue never duplicates final truth.

## 32. PROJECT DASHBOARD MODEL (Part 71)

**Assembled view only — feasible from live queries:** dates (sale_dates + external deadlines), readiness (SellerOnboarding/PrepareSale), tasks/overdue/blocked (SaleTask), client decisions (open), unresolved issues (future SaleIssue), authority state (SaleAuthority), team (sale_team + assignees), research (Item research_status), preparation (assignments/kit/marketing kit component_status), post-sale plan (SaleScope). **No DashboardData entity.** Same gap as §5/§17 — one interface, three sections of the report.

## 33. ACTIVATION VS PREPARE SALE (Part 72)

**Boundary confirmed in the deployed architecture:** SellerOnboarding = "what happens after the client says yes" (turn accepted business into a live, organized project); PrepareSale = "is the live project operationally ready for preparation/sale" (deterministic preparation readiness). The missing **ACTIVATE SALE** step sits BEFORE SellerOnboarding and is the only missing lifecycle seam. Boundary to adopt: ACTIVATE SALE = create/link the project + launch onboarding records; PREPARE THIS SALE = readiness over the live project.

## 34. ONBOARDING VS SELLER ONBOARDING (Part 73)

**REUSE + EXTEND.** Chapter 13 must not create new onboarding: SellerOnboarding is the post-yes orchestration view; Chapter 13 adds (a) the activation action that precedes it and (b) the onboarding-launch it lacks. No rename, no merge needed — the 10 steps already cover Chapter 13's client-side checklist.

## 35. PRIVACY / RLS (Part 74)

**No P0 found.**
- Cross-company: none — operator_id/created_by anchoring throughout; Contact read is creator/assigned/admin; ProviderDirectory writes admin-only; drafts private; consultation photos private with signed URLs.
- Employee views: sale_team sees full sale incl. access codes + revenue (§16) — **P1 policy decision**, within one company, not a leak across companies.
- Photos: consultation photos private, never auto-marketing (MarketingKit requires explicit approved_photo_indexes); Item/sale marketing photos public by design. Retained-item photos gap noted (§8) — the risk is an operator putting private merchandise photos into the public sale gallery; today nothing marks a KEEP item's photos as restricted. **△ recommend a small "marketing-eligible" guard for KEEP items (P1).**
- Agreement mutation: no path mutates executed records (verified §28).
- Unsafe client-change application: decisions record authority + source; no auto-application of unapproved changes.
- Communication-consent: preference separated from consent at capture; Customer.io outbox guardrails certified; marketing kit drafts never auto-send.

## 36. ACCESS INFORMATION (Part 75)

**✓ EXISTING, correctly quarantined.** `site_assessment.access_details` (key/access method, alarm considerations, gate access, pets, association requirements, contractors, occupied/restricted rooms, access windows). Private to operator/admin/sale-team by sale RLS. **Excluded from:** proposals/agreements (merge variable is access RESPONSIBILITIES only, per Ch9), public pages, marketing kit, AI context (verified §26). △ Only exposure: sale_team members (see §16) and generic task descriptions — the audit found no access codes in task templates; **recommendation: keep codes out of SaleTask free text (policy, already the pattern).**

## 37. READY-TO-USE TOOLS — all 27 classified

| # | Tool | Classification |
|---|---|---|
| 1 | Client onboarding checklist | INTERACTIVE SYSTEM ALREADY BETTER (SellerOnboarding) — ✕ no worksheet |
| 2 | Authorized decision-maker form | INTERACTIVE ALREADY BETTER (SaleAuthority + panels) — ✕ |
| 3 | Family contact sheet | GENUINE SMALL GAP → interactive sale-scoped contact roster (P1); printable ✎ optional later |
| 4 | Communication-plan worksheet | SMALL ENHANCEMENT → comm-plan block on deal/sale (P1); ✎ printable only as export |
| 5 | Client important-dates sheet | EXISTING-SYSTEM OUTCOME (consultation external_deadlines) — △ surface on project view |
| 6 | Sale timeline | GENUINE INTERFACE GAP → timeline builder view (P1) |
| 7 | Family removal deadline notice | EXISTING OUTCOME (deadlines + tasks) + ✎ BOOK printable client letter (P2) |
| 8 | Keep/Sell/Review worksheet | INTERACTIVE ALREADY BETTER — ✕ do not build |
| 9 | Retained-item register | EXISTING-SYSTEM OUTCOME via decision query — △ small filtered view (P1) |
| 10 | Retained-item labels | ✎ PRINTABLE (PrintSigns infra exists) — P2 |
| 11 | Excluded-area signs | ✎ PRINTABLE (P2) + △ data surface for restricted areas (P1 view) |
| 12 | Client change-request form | INTERACTIVE ALREADY BETTER (SaleClientDecision) — △ request state (P1); ✕ worksheet |
| 13 | Change authorization | EXISTING (decision history + authority) — ✕ |
| 14 | Property-access instructions | EXISTING (access_details) — ✕ |
| 15 | Key/alarm/access record | EXISTING (access_details, quarantined) — ✕ |
| 16 | Team responsibility sheet | EXISTING (assignees + workload) — ✕ |
| 17 | Sale preparation task list | EXISTING (SaleTasks templates) — ✕ |
| 18 | Employee assignment sheet | EXISTING (assignee on tasks; workload) — ✕ |
| 19 | Outside-provider checklist | LATER (professional network covers referral; provider coordination is Ch22 scope) |
| 20 | Marketing deadline checklist | SMALL ENHANCEMENT (MarketingKit component_status + tasks view) |
| 21 | Unresolved-issues worksheet | GENUINE SOFTWARE GAP → SaleIssue entity (P1) — interactive, ✕ not a worksheet |
| 22 | Post-sale disposition plan | EXISTING (SaleScope.post_sale_plan) — ✕ |
| 23 | Donation authorization | EXISTING (Donation + post-sale-plan + decision) — ✕ |
| 24 | Cleanout authorization | EXISTING (Cleanout + network) — ✕ |
| 25 | Large-item pickup plan | EXISTING PARTIAL (item pickup fields + constraints) — ✕ no rebuild |
| 26 | Final walkthrough checklist | EXISTING (pack-out + closeout steps) — △ pre-create at activation |
| 27 | Client welcome/next-steps letter | EXISTING-SYSTEM OUTCOME (sellerOnboardingAi draft_client_update) — ✕ |

## 38. DO-NOT-REBUILD (Part 78)

Certified systems Chapter 13 MUST reuse (inspected): SaleConversionPipeline (incl. consultation block), EstateSale (+site_assessment/access_details), Contact (+professional_profile), Company, SaleAuthority, SaleClientDecision, SaleTask, SaleNote, Activity, SaleScope (post_sale_plan + history), SaleProposal, SaleAgreement, BusinessDocument (+templates), SellerOnboarding (+sellerOnboardingAi), PrepareSale (+prepareModel), research flags, LaborEntry, Expense, equipment architecture (EquipmentAsset/SaleKitTemplate/SaleEquipmentAssignment + checklist templates), Donation, Cleanout, buyout (buyout_config/BuyoutModal), pickup architecture, SettlementStatement, SaleRecap, SaleCloseout, Professional Network + Who-Can-Help, Customer.io (IdentityActivityOutbox guardrails), AI communication modes (aiCoach verified context), Chapter 12 Consultation Mode, MarketingKit, Workload Planner, OperatorCalendar, AgreementReadiness, EarlySignIn/Offer/VIP (buyer-side, out of scope).

## 39. DUPLICATION RISKS

1. Onboarding checklist — three systems exist; a fourth (or auto-created per-sale checklist records) would duplicate. Launch existing templates instead.
2. Issues vs tasks/decisions — only justified if SaleIssue stays a question with resolution refs; it must never become a task list.
3. Timeline builder must read existing dates — creating schedule records would fork truth.
4. Family removal deadlines — must reuse consultation external_deadlines / SaleTask, not a new date entity.
5. Retained-item register — a saved VIEW of decisions, not a RetainedItem entity.
6. Communication plan — a small block, not a CRM.
7. Reverse deal auto-creation (`handleSyncAllDeals` with client_name = sale.title) — existing duplication seam; activation should make this legacy.

## 40. SMALLEST RECOMMENDED ARCHITECTURE (Part 79 — DO NOT IMPLEMENT)

- **ONE new entity: `SaleIssue`** (unresolved operational question) — proven necessary (§21). Owner, answer_by, status, blocking descriptor, resolution refs, SaleTask-style RLS.
- **Small SaleTask additions (no new entity):** `blocked_by_task_ids[]`, `blocked_by_decision_id`, `blocked_by_issue_id`, `source_type` + `source_ref` (promise→task provenance).
- **Small SaleClientDecision additions:** `requested_at`/`requested_by` + answer-by reuse of existing fields (request ≠ approval), optional `created_task_id` ref.
- **Small deal/sale additions:** `communication_plan` block (primary contact link, preferred method, cadence); activation writes only projections already defined.
- **One activation action (function/page seam, no new entity):** create EstateSale from linked deal + accepted snapshot, launch template tasks, open SellerOnboarding, record activation gate exceptions.
- **One assembled Project Dashboard view (no new entity).**
- Everything else: reuse.

## 41. INTERFACE vs DATA vs WORKFLOW vs PERMISSION GAPS (Part 80)

| Area | Gap type |
|---|---|
| Sale activation | WORKFLOW + INTERFACE (data exists; no action) |
| Project dashboard | INTERFACE (pure) |
| Timeline builder | INTERFACE (+ small derived-date logic) |
| Task dependencies | DATA |
| Promise→task | WORKFLOW + DATA (provenance field) + INTERFACE (action) |
| Unresolved issues | DATA (entity) |
| Communication plan | DATA (small block) + INTERFACE |
| Post-sale planning | ✕ none — existing |
| Decision requests | WORKFLOW (request state) + DATA (answer-by) |
| Activation gate | WORKFLOW |
| Employee restricted views | PERMISSION (policy decision) |

## 42. P0 / P1 / P2 / P3 / LATER ROADMAP

**P0: NONE FOUND.** No cross-company leakage, no agreement mutation path, no access-code exposure to AI/public/client documents, no consent leakage. (Near-P0 monitored: KEEP-item photos can enter the public gallery — recommend the small marketing-eligibility guard at P1; sale_team access-codes visibility — policy decision at P1.)

**P1 (minimum to make the Chapter 13 statement true):**
1. One-click sale activation (create-from-deal + link + gate with recorded exceptions)
2. Activation launches the standard task template + SellerOnboarding (sequence, not new checklist)
3. Project control dashboard (assembled view)
4. `SaleIssue` entity + owner/answer-by/blocking + resolution refs
5. Task dependencies (3 reference fields) + promise→task manual convert with provenance
6. Decision request state (requested ≠ approved) + answer-by + decision→task action
7. Communication plan block (primary contact, preferred method, cadence)
8. Retained-item register view + private retained-photo association; excluded-area surface
9. Closeout-stage template tasks pre-created at activation (incl. final walkthrough)
10. Timeline builder view (backward plan from deadlines, read-only derived)

**P2:** AI Task Extraction; AI Open-Issue Review; AI Project Coach (whole-project grounding); AI Deadline Review; AI Dependency Review; AI Daily Briefing; operator-configurable recurring task templates; printable tools (labels, excluded-area signs, family-removal letter); downstream impact advisory.

**P3/LATER:** generalized workflow engine; predictive deadline risk; automatic cross-sale resource balancing; multi-company provider orchestration; advanced client portal; downstream-impact system (Ch15/18/21).

## 43. BOOK TRUTH (Part 85)

| Promise | Can the book say it today? |
|---|---|
| One-Click Sale Activation | NOT YET — BUILD (P1) |
| Automatic Sale File | YES |
| Onboarding Checklist | YES (as SellerOnboarding readiness; "automatic launch" NOT YET) |
| Project Dashboard | NOT YET — BUILD (P1 assembled view) |
| AI Onboarding Review | WORDING SHOULD CHANGE — deterministic review exists; AI is P2 |
| Authority Rules | YES AS EXISTING-SYSTEM OUTCOME (scopes + verification; plain-language summary small enhancement) |
| Decision Requests | YES WITH SMALL ENHANCEMENT (request state + answer-by) |
| Authority Hold | NOT YET — warnings exist; true hold = P1 decision-gate behavior |
| Retained-Item Photos | NOT YET — BUILD (private association, small) |
| Excluded Areas | YES WITH SMALL ENHANCEMENT (data exists; team surface) |
| Family Removal Deadline | YES AS EXISTING-SYSTEM OUTCOME (external deadlines + tasks) |
| Retained-Item Register | YES AS EXISTING-SYSTEM OUTCOME (query/view) |
| Client Change Request | YES AS EXISTING-SYSTEM OUTCOME; approval distinction needs small enhancement |
| Change History | YES |
| Downstream Impact Alert | NOT YET — P2/LATER |
| Approval Workflow | YES WITH SMALL ENHANCEMENT |
| Team Notification | YES AS EXISTING-SYSTEM OUTCOME (activity/workload; no external automation) |
| Sale Timeline Builder | NOT YET — BUILD (view) |
| Milestones | YES AS EXISTING-SYSTEM OUTCOME (status/readiness/closeout; no milestone entity needed) |
| Dependencies | NOT YET — BUILD (small data) |
| Deadline Alerts | YES |
| Promise-to-Task Capture | NOT YET — BUILD (manual, P1) |
| Task Dependencies | NOT YET — see Dependencies |
| Recurring Sale Templates | YES (templates exist) / operator-configurable NOT YET (P2) |
| AI Task Extraction | NOT YET — P2 |
| Role-Based Task Views | YES with privacy caveat (P1 policy) |
| Workload View | YES |
| Owner Dashboard | NOT YET — same assembled view (P1) |
| Primary Communication Contact | NOT YET — BUILD (small) |
| Preferred Communication Method | NOT YET at project level (captured at inquiry only) — BUILD (small) |
| Client Update Schedule | NOT YET — BUILD (small field) |
| Unresolved Issues List | NOT YET — BUILD (the one entity) |
| Issue Owner / Answer-By Date / Dependency Warning | NOT YET — with SaleIssue (P1) |
| AI Open-Issue Review | NOT YET — P2 |
| Post-Sale Plan | YES |
| Donation Scheduling | YES |
| Cleanout Scheduling | YES |
| Large-Item Pickup Plan | YES AS EXISTING-SYSTEM OUTCOME |
| Final Walkthrough | YES (scheduling at activation = small enhancement) |
| AI Project Coach / Deadline / Dependency / Daily Briefing | NOT YET — P2 (PrepCoach grounded for preparation only) |
| AI Readiness Check | YES — deterministic (state it as deterministic, not AI) |
| AI Client Updates | YES (grounded, draft-only) |

## 44. ACTIVATION FIELD MATRIX (Part 86)

| Source (deal/records) | Destination (active project) | Mechanism today | Retyping? | Risk |
|---|---|---|---|---|
| Client name/email/phone | deal (referenced) | LINK via estate_sale_id | No | Low — but sale title must be typed by hand |
| Property address | EstateSale.property_address | RE-TYPED at sale creation | **Yes** | Divergence from deal address |
| Referral source | EstateSale projections | COPY at link | No | Low |
| Client goals / acceptance conditions | deal consultation block | LINK | No | Low |
| Sale dates | EstateSale.sale_dates | RE-TYPED | **Yes** | Divergence from accepted snapshot |
| Commission / minimum | EstateSale.commission_rate vs deal | RE-TYPED (two fields!) | **Yes** | Highest financial-divergence risk; settlement reads deal |
| Services / scope | SaleScope (created in Ch9 flows) | LINK | No | Low |
| Authority | SaleAuthority (sale-scoped) | Created on sale | No — but **cannot exist before the sale exists** | Pre-sale authority capture impossible (Ch12 panel says "ask at consultation") |
| Communication contact / preference | none | **ABSENT** | — | Inquiry data never carried forward |
| Post-sale plan | SaleScope.post_sale_plan | LINK | No | Low |
| Access | site_assessment.access_details | Manual entry on sale | **Yes** | Duplication with consultation access notes |
| Research | Item research flags | LINK (items on sale) | No | Low |
| Client decisions | SaleClientDecision (sale-scoped) | LINK | No | Low |
| Distance snapshot | EstateSale/E deal | COPY at save | No | Low |

## 45. PROJECT CONTROL CANONICAL-TRUTH MATRIX (Part 87)

| Truth | Canonical home | Conflicts |
|---|---|---|
| PROMISE | Proposal/Agreement snapshots (+ SaleNote narrative) | none |
| TASK | SaleTask | none |
| DECISION | SaleClientDecision | none |
| ISSUE | **MISSING → proposed SaleIssue** | today it leaks into notes |
| NOTE | SaleNote | none |
| MILESTONE | EstateSale status + readiness/closeout states | none (do not build milestone entity) |
| DEADLINE (client/family) | deal consultation external_deadlines | must not be duplicated by task due dates — task carries company work, deadline carries family date (Part 23 doctrine: distinguish CLIENT ACTION DATE from COMPANY DUE DATE — currently distinguishable only by where they live) |
| CLIENT REQUEST / APPROVED CHANGE | SaleClientDecision history | request-vs-approval collapses (P1) |
| ACCESS INSTRUCTION | site_assessment.access_details | none |
| POST-SALE PLAN | SaleScope.post_sale_plan | none |

**No two systems claim canonical ownership of the same truth** — the architecture discipline holds; the one unowned truth is ISSUE.

## 46. PRODUCT DOCTRINES

- "A signed agreement gives permission to begin organizing" ✓ (agreement is evidence; SellerOnboarding begins organizing).
- "Every promise should become work" ✕ (promise→task gap — P1).
- "Every important task should have an owner / due date" ✓ (fields exist; unassigned surfaced honestly).
- "Every unresolved question should have a home" ✕ (the gap).
- "Every blocked action should explain what it is waiting for" △ (blocked_reason free text; no structured waits — P1 fields).
- "Involvement ≠ authority" ✓ (SaleAuthority vs Contact roles).
- "A client request ≠ an approved change" △ (P1 request state).
- "The agreement is historical truth; activation must not rewrite it" ✓ (verified).
- "The project should inherit what the company already knows / do not type the same truth twice" ✕ (activation re-types address, dates, commission — the core P1).
- "The framework should not differ" ✓ (one SaleTask/SaleClientDecision substrate across all sales).

## 47. PROJECT LEARNING LOOP (Part 88)

PROMISE ✓ → PLAN △ (no timeline builder) → ASSIGN ✓ → EXECUTE ✓ (tasks/status) → BLOCK/RESOLVE △ (blocked flag only; issues unrepresented) → COMMUNICATE ✓ (Activity + grounded AI drafts; decision-comms manual) → COMPLETE ✓ (completion audit) → CLOSE ✓ (6-step closeout + SaleRecap + settlement) → LEARN △ (SaleRecap captures outcomes; no structured retro feeding templates — templates hardcoded, so learning cannot update them. Operator-configurable templates would close this loop at P2).

**Broken transitions:** PROMISE→PLAN (builder), BLOCK/RESOLVE (dependencies + issues), LEARN (configurable templates).

## 48. RECOMMENDED IMPLEMENTATION SEQUENCE (DO NOT IMPLEMENT)

1. Activation action + gate (with recorded exceptions) — unblocks everything else.
2. Onboarding launch sequence (template tasks + SellerOnboarding + closeout-stage tasks incl. final walkthrough).
3. SaleIssue entity (owner/answer-by/blocking/resolution).
4. SaleTask dependency + provenance fields; promise→task and decision→task convert actions.
5. Decision request state + answer-by.
6. Communication plan block (primary contact, method, cadence).
7. Retained/excluded surfaces: register view, private retained photos, restricted-area surface, marketing-eligibility guard for KEEP items.
8. Project dashboard assembled view + timeline builder view.
9. (P2, later) AI layers + operator-configurable templates + printables.

## 49. PRE-LAUNCH DEPENDENCIES (Part 89)

Carried forward (unchanged, not Chapter 13 blockers): physical Item QR → camera → checkout/receipt; Chapter 9 manual decision-dialog confirmation; Chapter 9 closeout-warning-clearing confirmation; second-account RLS checks; Worksheet Add Transaction click-through; Vault Expiring Soon filter; professional escalation Contact selection; SMS certification; Houszu certification; Meta access token (190 expired — standing issue); physical Chapter 11 partner QR scan; Chapter 12 manual RLS/photo checks; **Chapter 13-specific:** verify task-template launch behavior on a second operator account; confirm sale_team access-code policy decision before enabling wider team use; clean up the known residual Chapter 12 test photo in private storage (inert, unlinked).

## 50. CERTIFICATION

# **GO WITH CONDITIONS**

The truth chain from CONSULTATION → PROPOSAL → ACCEPTED TERMS → AGREEMENT is certified, immutable, and honest; the project-side substrate (tasks, decisions, authority, scope, notes, communications, equipment, post-sale plan, workload, closeout) is certified and canonical. **Conditions:** Chapter 13 P1 must deliver (1) the activation action + gate so the accepted deal becomes the working project without re-typing, (2) the SaleIssue entity for unresolved questions, and (3) task dependency/provenance + promise→task capture — before the book may claim One-Click Sale Activation, Unresolved Issues, Dependencies, or Promise-to-Task. No P0 findings. AI claims must remain deterministic-first (readiness is already correctly deterministic; AI reviews stay P2).

**AUDIT ONLY — nothing was built, modified, or sent. Awaiting explicit authorization for Chapter 13 P1.**