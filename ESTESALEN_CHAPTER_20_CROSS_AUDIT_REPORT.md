# CHAPTER 20 — ESTATESALEN CROSS-AUDIT REPORT
LIVE SALE OPERATIONS, COMMAND CENTER, INCIDENTS & REAL-TIME ADAPTATION
Audited 2026-10-22 against the DEPLOYED application code, entities, RLS, functions, and pages. AUDIT ONLY — nothing was built, modified, or sent.

Method: source inspection of the actual deployed artifacts (entities, RLS, backend functions, pages, components) named inline per finding. No intended/planned behavior is classified as existing.

---

## EXECUTIVE SUMMARY

**Coverage estimate across the 135 audit parts:** ~41% fully supported today by existing systems (verified in code), ~31% supported with a small P1 enhancement, ~7% P2 (AI), ~6% wording-change (the book promises something the system deliberately does not do, or does not track), ~10% genuine build candidates, ~5% do-not-build/later. No fabricated readiness percentages were found; every readiness surface audited is deterministic.

**Strongest existing architecture (verified):**
1. **Money/merchandise/custody separation** — Item (merchandise truth), Order/Transaction (money truth), pickup fields (custody truth), Offer (negotiation truth). HOLD ≠ SOLD ≠ PAID ≠ RELEASED is structurally true: `liveItemStatus()` derives AVAILABLE/HOLD/AWAITING PICKUP/RELEASED from four independent canonical sources (Item.status, display_attention, sold state, pickup_completed_at).
2. **Authority enforcement** — Chapter 19 P0 is real at the data layer (Item RLS HIGH_VALUE update gate; SaleClientDecision operator/admin-only create+update) plus the CheckoutStation deterministic HV stop and duplicate-sale guard.
3. **Opening readiness (Chapter 17)** — `stagingModel.openingReadiness()` assembles deterministic blockers/warnings from canonical records only; no percentages.
4. **Staffing + escalation loop** — SaleStaffAssignment with CLEARED history and deterministic coverage check; SaleIssue is the single escalation path with urgency, categories (incl. payment/security/safety), private photo; My Sale Day is the least-privilege employee view; opening brief + authority matrix + acknowledgment are wired end-to-end.

**Largest genuine gaps:**
1. No assembled LIVE SALE operator view (command center) — the pieces exist in canonical records but are scattered across Project Dashboard, Sale Statistics, Worksheet, Attendance, and Offers pages.
2. Entry/capacity: no entry mode, no capacity procedure, no waitlist, no entry/exit counts — attendance exists (CheckIn + EarlySignIn) but occupancy cannot be truthfully stated.
3. POS does not apply or even display the discount schedule (deliberate doctrine, but the cashier gets no stage guidance); no payment-unknown state at offline checkout (assertion-based `paid`).
4. Hold has no expiry, no authority gate, and no linked-buyer requirement beyond free text; a team member can set a non-HV item to `reserved`.
5. No last-minute change review, no manager priority queue (badges exist, no ordered queue), no manager broadcast, no client sale-day plan, no end-of-day sale-day reset/closing checklist (the existing EndOfDayPanel is prep-day focused).

---

## 1. LIVE SALE MODE

✓ EXISTING / SUPPORTED (as assembled mode). EstateSalen has no `LiveSale` entity — correctly. A live-sale *mode* already exists conceptually as: EstateSale.status `active` + sale_dates (the session clock), ProjectDashboard (operator command surface), MySaleDay (employee surface), CheckoutStation (transaction surface). Classification: no new entity; a P1 "Live Sale" assembled tab on Project Dashboard is the smallest gap-closer (§31).

## 2. OPENING READINESS

✓ EXISTING / SUPPORTED. `stagingModel.openingReadiness({sale, zones, items, issues, tasks, laborEntries, deal})` (src/components/staging/stagingModel.js, Ch17 P1-38/39) returns deterministic blockers (sale_opening safety/customer_flow/property_access issues; unpriced tracked items; unconfigured checkout) and warnings (unclassified sale-floor zone access, lighting, flow concerns, research holds, labor threshold). Rendered by StagingReadinessCard. No percentage anywhere.
△ ENHANCE (P1): add staffing-coverage check (staffingModel already computes it), High-Value placement confirmation, signs readiness (MarketingKit component_status), payment-equipment readiness, and awaiting-pickup/presale-sold blockers into the same deterministic assembly. All are already canonical; this is assembly work only.

## 3. LAST-MINUTE CHANGES

△ ENHANCE (P1 — deterministic, no AI). Every needed timestamp exists: Item.updated_date, price-change Activity (changeItemPrice), SaleClientDecision history/decided_at, SaleIssue.created_date, excluded_areas, prep_zones, SaleStaffAssignment status/timestamps, brief-ack Activity ("Opening brief reviewed", per user/date — mySaleDay). A "changes since your last brief acknowledgment" list is assemblable purely from records; it is NOT assembled anywhere today. Genuinely missing: none at the data layer.

## 4. TEAM BRIEFING

✓ EXISTING / SUPPORTED (Chapter 19). OpeningBriefCard (Project Dashboard) + the same brief inside mySaleDay: responsibilities, high-value/attention merchandise, controlling client decisions, open issues, authority matrix, urgent-issue flag, brief reviewers (ack Activity), policies + acknowledgment staleness. △ ENHANCE (P1): add restricted/excluded areas, pickup requirements summary, current discount stage, and featured-item status to the brief (all canonical; display-only).

## 5. ENTRY / CAPACITY / WAITLIST

✕ NOT BUILT — genuine gaps, smallest versions are P1:
- **Entry mode (Part 12):** ✕ no OPEN ENTRY vs CAPACITY CONTROLLED field. EstateSale has `early_sign_in_enabled` (sign-up list toggle, not entry control). P1: one operator-supplied entry-procedure block (operator supplies policy; nothing hardcoded).
- **Digital waitlist (Part 13):** ✕ none. EarlySignIn is a pre-sale sign-up list, NOT a waitlist (correctly distinguished). Justification is real for capacity-controlled sales → P1 only if the operator wants capacity control; otherwise BOOK/PRINTABLE.
- **Entry count / occupancy (Part 14):** ✕ no exit tracking exists (Attendance.jsx counts CheckIns, auto-refresh 30s; `handleDecrement` decrements a local counter only, does not write an exit record). The system cannot truthfully state current occupancy → do not pretend. P1: honest "checked-in today" count + operator-logged approximate occupancy field, clearly labeled approximate.
- **Capacity rules (Part 16):** ✕ none; P1 as operator-supplied procedure text shown to the entry staffer (My Sale Day). No fire-code/legal occupancy anywhere — correct.

## 6. ATTENDANCE

✓ EXISTING / SUPPORTED. CheckIn entity (`check_in_type: 'sale_visit'`, location_id=saleId), Attendance page (QR poster auto-generated per sale, manual +1 counter writing CheckIns, deduplicateCheckins function, charts), EarlySignIn sign-up list with explicit discovery_source and user_id (no unnecessary PII required). Attendance can be recorded without accounts (manual counter) — verified in code.

## 7. LIVE FLOOR OBSERVATION

✓ EXISTING / SUPPORTED via SaleNote (pinned, team-readable, RLS-scoped) and SaleIssue (crowding = category `customer_flow`, checkout pressure = `checkout`, weak area/observations = notes or issues with urgency). Determination: observations that need an answer → SaleIssue; memory/context → SaleNote. Both are team-writable (create RLS includes sale_team_ids). No duplicate live-note entity needed. △ ENHANCE (P1): surface both on a live view.

## 8. LIVE STAFF REASSIGNMENT

✓ EXISTING / SUPPORTED (Chapter 19). StaffingPanel allows changing assignments during the sale: the record supports status ACTIVE→CLEARED (history preserved — "Employee A originally covered entry" remains as the CLEARED record) plus a new ACTIVE record. My Sale Day reads live, so both employees see current assignments immediately.

## 9. COVERAGE GAPS

✓ EXISTING / SUPPORTED. staffingModel's deterministic coverage check derives UNASSIGNED/Covered per responsibility type from ACTIVE assignments and renders UNASSIGNED badges (verified rendering in the Chapter 19 certification run). Reassignment re-runs the check — an invisible gap cannot occur silently; it appears as UNASSIGNED. △ ENHANCE (P1): after a reassignment, show the gap prominently on the live view (today it is visible in the staffing card).

## 10. NEGOTIATION / OFFERS

✓ EXISTING / SUPPORTED. Canonical Offer (item_id-linked, buyer name/phone, amount, pending/accepted/rejected), OffersPanel capture, accept/reject, accepted→Cart handoff (idempotent via converted_at) or `reserved` with explicit "NO payment record" warning, authority matrix (EMPLOYEE_AUTHORITY_LIMIT → "up to $10 off without asking" derived; HV price → STOP/ESCALATE), negotiation_override (NO_DISCOUNT_WITHOUT_OPERATOR) wins over employee authority, PosPractice negotiation scenarios. Manager approval path = Offer/Help → operator decision (only operator can change authoritative prices via changeItemPrice with reason; client-facing decisions gated by P0 RLS).

## 11. OFFER FOLLOW-UP

△ ENHANCE (P1). Offers are preserved (rejected never mutated — status only, no deletion path in OffersPanel) and visible in OffersPanel, PricingWorkspace, ItemInspectDialog, PostSaleReviewCard. What is missing: a deterministic "prior offers on unsold items" follow-up surface for the NEXT session (data exists; assembly doesn't). Offer clustering (Part 32/83): multiple independent offers around similar amounts — data exists (Offer per item), no clustered display; deterministic display is a small P1, no AI needed, and must never claim market value (ItemComparable already keeps asking/sold evidence distinct — Part 33 ✓).
Buyer recontact (Part 31): ✓ correct today — Offer carries contact info as operational truth; ConsumerMarketingProfile/consent govern marketing eligibility; no offer creates consent (Chapter 18 doctrine intact).

## 12. ITEM / HOLD / PAYMENT / PICKUP STATUS

✓ EXISTING / SUPPORTED as a truthful composite model (Parts 34–39). The manuscript's 9-state monolithic vocabulary must NOT be built. Actual truth:
- Item.status: available/pending/sold/reserved (master selling state)
- Derived live state: `stagingModel.liveItemStatus()` → RELEASED (pickup_completed_at) / AWAITING PICKUP (sold) / HOLD (pending|reserved or display_attention CHECKOUT_HOLD) / AVAILABLE
- Money truth: Order.status (pending_payment→paid→…; pending_checkout_id for online) / Transaction (offline record w/ payment_method)
- Custody truth: authorized_pickup, pickup_completed_at, custody_events (HV)
- Status history (Part 39): ✓ Activity-based item history (itemHistory.js, Ch15) + changeItemPrice reason ledger + sold_date/pickup_completed_at timestamps. Who/what/when preserved.
Gaps (△ P1): **Hold** (Part 35–37) — exists (reserved/pending + CHECKOUT_HOLD) but: no expiry timer, no authority gate (any team member can set reserved on a non-HV item via Item update RLS — the P0 update gate protects only HIGH_VALUE), buyer link is free-text (buyer_name) with optional user_id. If Hold is a consequential commitment, P1 = hold creation through a sanctioned path with who/when/expiry; HV holds already blocked. **Deposit** — no deposit concept; do not build (Ch21 boundary).

## 13. DISCOUNTS

✓ EXISTING (plan) / ✕ NOT APPLIED (deliberate). EstateSale.discount_schedule (Ch16) holds operator stages; Item.excluded_from_discounts exists; Company.negotiation_policy + Item.negotiation_override exist. **POS applies nothing automatically** (verified: zero discount logic in CheckoutStation/ScanAndCart) — this matches Chapter 16 doctrine (a stage is guidance; applying is an explicit human price change through changeItemPrice). Book truth for "Automatic POS Rules": **WORDING SHOULD CHANGE** — the system is honest that it never auto-discounts; a P1 cashier aid could display the current stage next to the total as guidance only. Excluded items (Part 42): ✓ flag exists and is honored by doctrine/manual path. Employee discount limit (Part 43): ✓ matrix guidance + no POS discount entry (nothing to bypass); note Item.price on non-HV items is technically editable by team members (RLS) — guidance-level control, consistent with Ch19 scope. Discount performance (Part 44): ✓ partially — sold_price vs price, stage timing, sell-through derivable from Items/Orders; causal claims must stay cautious (no attribution engine — correct).

## 14. SECURITY

✓ EXISTING / SUPPORTED (Parts 45–48): HV coverage (SaleStaffAssignment HIGH_VALUE + controlled_location + custody_events), zones security_flags, security walkthrough via SaleTask/staging tasks, RLS-verified least privilege: Item.controlled_location, research_override fields, and EstateSale.site_assessment (+access_details) are field-level read-restricted to owner/admin — an assigned team member CANNOT read alarm/gate/key material (verified in RLS). Ask-for-Help private photos go to private storage. No security note leaks into briefs, My Sale Day (projection excludes site assessment), buyer surfaces, or marketing (verified projection code). Escalation (Part 49): ✓ Ask-for-Help category `security`, URGENT urgency.

## 15. INCIDENTS

△ ENHANCE (P1) — entity test result: **SaleIssue is adequate as the record; extend additively, do NOT create an Incident entity today.** Verified: SaleIssue already carries category (safety, security, payment, customer-flow…), urgency (ROUTINE/IMPORTANT/URGENT), factual title/description, private photo, requested_by, owner, resolution refs, linked tasks (hazard follow-up Part 54 ✓ reuses SaleTask), full history, team-scoped privacy. Missing for serious incidents (Part 53): structured people-involved/witnesses/location-time fields and an incident-type taxonomy — all fit as additive SaleIssue fields (facts only; no speculation/blame fields should ever be added). An Incident entity is NOT justified yet because retention/legal workflow does not exist to demand it. Incident button (Part 51): Ask-for-Help already covers it — relabel/route by category; no duplicate path. Immediate action guide (Part 52): ✓ policy documents (BusinessDocument POLICY) shown in My Sale Day; for emergencies the honest pattern (already used in PosPractice's declined-card lesson: "raise an issue and find the operator") extends to "call 911/human first" guidance — P1 copy, no AI improvisation.

## 16. PROPERTY PROTECTION

✓ EXISTING / SUPPORTED (Ch14/17): zone protection_note, condition_photo_uri (private), customer_flow plan, staging walkthrough tasks, RECOVERY_TASKS, property-issue reporting via Help (category + private photo + zone context in description). Property condition record (Part 59): ✓ before (condition photos), during (issue photos), after (closeout) — all preserved without a new entity. Restricted-area status during sale (Part 58): ✓ zone access_class + sale_day_status are mutable and team-visible. Pickup protection (Part 57): ✓ pickup_requirements, disassembly, removal_note (internal), authorized_pickup, pickup windows.

## 17. HELP / ESCALATION

✓ EXISTING / SUPPORTED (Ch19, verified): AskForHelpDialog (title/details/category/urgency/private photo stored privately via UploadPrivateFile), employee sees answers in My Sale Day, mobile-verified. Priority (Part 61): ✓ qualitative ROUTINE/IMPORTANT/URGENT; no numeric severity — correct. Item link (Part 62): △ P1 — SaleIssue has no item_id field; the item reference lives in free text today. One additive field (sufficient, referenced, never duplicating item truth). Voice note (Part 63): ✕ text + photo only — do not claim voice. Manager response (Part 64): ✓ resolution record + answer visible to raiser.

## 18. MANAGER PRIORITY QUEUE

△ ENHANCE (P1). SaleIssuesPanel shows urgency badges + OVERDUE; mySaleDay sorts issues by urgency for the employee. The operator view renders in load order — no ordered queue (urgency → blocking → age). Data suffices; assembly is the gap. Critical alerts vs routine queue (Parts 66–67): ✓ separable by urgency + blocking_areas; no distinct display yet — same P1.

## 19. CHECKOUT

✓ EXISTING / SUPPORTED (Parts 70–74). CheckoutStation is focused: scan cart → items/total → payment method (offline cash/card-manual/venmo/check) or online (Base44 Payments via create-checkout → redirect; Order.pending_checkout_id; wix-payments-webhook grants and marks paid) → receipt. No project noise on the screen — clean. Duplicate-sale guard (re-checks availability) and HV operator-requirement (Ch19 P0-1 seam) verified in code. POS status (Part 71): ✓ Order distinguishes pending_payment vs paid; Transaction records offline method. Offline completion is assertion-based (`status: 'paid'` on the cashier's click — a deliberate in-person model; the honest limitation is that the system records the cashier's assertion, not verified payment). Pickup conversion (Part 73): ✓ sold items flow to pickup fields; large-item requirements carried on Item. Checkout help routing (Part 74): △ P1 UI nicety — nothing stops a cashier from being pulled into non-checkout issues; a "route to assigned staff" hint is UI-only. Cash (Part 72): ✓ records exist (Transaction payment_method cash, Worksheet), no reconciliation — Chapter 21 boundary respected; do not build here.

## 20. LIVE SALE DASHBOARD

＋ BUILD (P1) — assembled view only. All signals exist in canonical records (see §39 matrix); no single live view exists. ProjectDashboard already hosts staffing, brief, matrix, issues, attention; Project Dashboard needs one Live Sale tab assembling: today's orders/transactions (Order by date + Transaction by sale), attendance today (CheckIn), HV sales (Items), open offers, awaiting pickup (Items sold w/o pickup_completed_at), open issues by urgency, coverage map. No new entities.

## 21. PATTERN / FEEDBACK

△ Partial. Signals that exist: offers per item (real), CheckIn/EarlySignIn counts (real), Item views/saves fields exist (live increment behavior unverified — do not claim tracked traffic). Buyer feedback (Part 82): ✕ no structured buyer-feedback capture → book must not promise automated pattern recognition; P2 at most. No-conversion alert (Part 84): ✕ evidence (views/discussion) not reliably tracked → WORDING CHANGE / P2. Single-data-point protection (Part 85): ✓ structurally sound — one Offer is one record; clustering display (P1) must visually distinguish N independent offers from one comment.

## 22. CLIENT SALE-DAY MANAGEMENT

△ ENHANCE (P1, small). Absent today: client visiting/remaining/expected time. Boundaries exist (Part 93 ✓): excluded_areas, SaleAuthority (decision-makers), SaleClientDecision, communication_plan. Last-minute client request (Part 94): ✓ enforced — client decisions are operator-only (Ch19 P0 RLS); an employee cannot authorize a removal; the path is Help → operator → SaleClientDecision (verified in RLS + dialogs). Team notification of client presence (Part 95): ✕ — P1: one team-safe field (client expected/present) on the sale; sensitive interaction notes (Part 96): ✓ least-privilege pattern already established (Activity/sale comms are operator-visible; My Sale Day projects only safe fields).

## 23. END-OF-DAY RESET

△ ENHANCE (P1). EndOfDayPanel exists but is PREP-day focused (zones/discoveries/labor). A sale-day reset checklist is assemblable deterministically: sold items marked (✓ they are, at checkout), awaiting pickup (✓ derivable), HV check (custody_events ✓), open offers review (✓ derivable), next-day discount stage (✓ schedule exists — activation is an authorized human action, never automatic), reset tasks via SaleTask template (✓ pattern exists — RECOVERY_TASKS/staging checklists prove it). Team debrief (Part 101): ✓ SaleNote (pinned) is the right home — small P1 to label a debrief note type or just use pinned notes.

## 24. CLOSING

△ ENHANCE (P1). Closing checklist is assemblable: open transactions at close (Order pending_payment ✓ queryable), sold w/o pickup (✓), open issues (✓), zone sale_day_status (✓), property security = human checklist via SaleTask (Part 105: system correctly does not claim electronic lock verification — keep it that way). Last customer status (Part 104): ✓ pending orders exist as records. Cash/payment close (Part 106): record-only; Chapter 21 owns reconciliation — boundary respected.

## 25. MULTI-DAY SALES

✓ MOSTLY SUPPORTED / △ small P1. EstateSale.sale_dates holds per-day sessions; Item.sold_date + sale_phase (pre/during/post), CheckIn/EarlySignIn dates, Activity timestamps, brief-ack per day, assignment CLEARED history — Day 1 truth demonstrably survives to Day 2 (§41 trace). Missing: an explicit per-day session state (PRE-OPEN/OPEN/PAUSED/CLOSED FOR DAY) — today only project-level draft/upcoming/active/completed exists (Part 110). **SaleSession entity test (Part 112): recommendation — DO NOT BUILD an entity.** Day context is derivable by date; if operators need explicit state, the smallest honest move is a small `sale_day_state` block on EstateSale (operator-set, per date) — P1, decided at implementation time. Day-1 close ≠ project closeout is already structurally true (SaleCloseout is a separate deliberate phase).

## 26. AI

✕ P2 for all six AI promises (Opening Review, Opening Pulse, Offer Context, Triage, Sale Pulse, Pattern Review, Day-Two Brief). Verified: aiCoach/operatorAiCoach are business/ops coaching functions with no live-sale canonical context; no AI reads sale-day truth today. Deterministic versions satisfy most needs first (change review, offer context panel from ItemComparable+Offer+discount stage, priority queue). Doctrine intact: AI may summarize/surface; never decides; the deterministic readiness engine already refuses to be called AI.

## 27. READY-TO-USE SALE-DAY TOOLS (all 38)

| # | Tool | Classification |
|---|------|----------------|
| 1 | Opening readiness checklist | SMALL ENHANCEMENT (engine exists; add staffing/HV/signs/payment checks) |
| 2 | Five-minute team briefing | INTERACTIVE SYSTEM ALREADY BETTER (OpeningBriefCard + ack) |
| 3 | Employee role cards | INTERACTIVE SYSTEM ALREADY BETTER (My Sale Day) |
| 4 | Entry-management procedure | GENUINE SOFTWARE GAP (P1, operator-supplied text) |
| 5 | Customer waitlist sheet | GENUINE SOFTWARE GAP (P1, only with capacity control) |
| 6 | Attendance tracker | INTERACTIVE SYSTEM ALREADY BETTER (Attendance page + CheckIn) |
| 7 | Opening fifteen-minute review | SMALL ENHANCEMENT (readiness + change review assembly) |
| 8 | Negotiation guide | INTERACTIVE SYSTEM ALREADY BETTER (Authority Matrix) |
| 9 | Employee authority card | INTERACTIVE SYSTEM ALREADY BETTER (MyAuthoritiesCard) |
| 10 | Offer form | INTERACTIVE SYSTEM ALREADY BETTER (OffersPanel) |
| 11 | Offer follow-up sheet | SMALL ENHANCEMENT (prior-offers surface) |
| 12 | Hold policy | ✎ BOOK / POLICY DOCUMENT (policy docs exist; system P1 for timer) |
| 13 | Hold tag | EXISTING (reserved/CHECKOUT_HOLD state + item labels) — timer P1 |
| 14 | Discount schedule | EXISTING (EstateSale.discount_schedule) |
| 15 | Discount-exclusion sheet | EXISTING (Item.excluded_from_discounts) |
| 16 | High-value security checklist | EXISTING (HV + custody_events + assignment) |
| 17 | Security walkthrough | EXISTING (SaleTask/staging walkthrough tasks) |
| 18 | Suspected-theft procedure | ✎ BOOK / POLICY DOCUMENT + Help category `security` (exists) |
| 19 | Customer incident form | SMALL ENHANCEMENT (SaleIssue additive fields) |
| 20 | Employee incident form | SMALL ENHANCEMENT (same) |
| 21 | Property-damage form | SMALL ENHANCEMENT (same + photo, exists) |
| 22 | Emergency-response sheet | ✎ BOOK / POLICY DOCUMENT (never AI-adjudicated) |
| 23 | Property walkthrough checklist | EXISTING (staging walkthrough tasks) |
| 24 | Help/escalation guide | INTERACTIVE SYSTEM ALREADY BETTER (Ask for Help) |
| 25 | Manager priority sheet | SMALL ENHANCEMENT (ordered queue assembly) |
| 26 | Checkout readiness checklist | EXISTING (openingReadiness checkout blocker) |
| 27 | Payment-problem procedure | EXISTING (payment issue category + POS practice lesson) |
| 28 | Furniture pickup form | EXISTING (pickup_requirements/disassembly/removal) |
| 29 | Client sale-day plan | GENUINE SOFTWARE GAP (P1, small) |
| 30 | Live staffing sheet | INTERACTIVE SYSTEM ALREADY BETTER (StaffingPanel + coverage) |
| 31 | Sale-floor reset checklist | SMALL ENHANCEMENT (SaleTask template) |
| 32 | Day-one debrief | EXISTING (pinned SaleNote) — label debrief P1 |
| 33 | Day-two briefing | SMALL ENHANCEMENT (change review + carried truth, all canonical) |
| 34 | Closing checklist | GENUINE SOFTWARE GAP (P1 assembly — data exists) |
| 35 | Property secure checklist | EXISTING PATTERN (SaleTask; no electronic lock claims) |
| 36 | End-of-day payment checklist | LATER / Chapter 21 boundary (records exist) |
| 37 | Awaiting-pickup report | EXISTING (derivable; SaleCloseout/Inventory surfaces) — live display P1 |
| 38 | Open-issues handoff | EXISTING (SaleIssue persists; nothing resets) |

## 28. DO-NOT-REBUILD

Chapter 20 must reuse (all verified in place): SaleStaffAssignment, Authority Matrix (base44/shared/authorityMatrix.ts), My Sale Day (mySaleDay function + page), SaleTask (+DoD), SaleIssue (single escalation path), Ask for Help, SaleNote, SaleAuthority, SaleClientDecision, Item (+HV guards), ItemComparable, Offer, EarlySignIn/CheckIn (attendance), Order/Transaction (+Base44 Payments webhook), Item pickup/release fields, prep_zones (+sale_day_status), staging/openingReadiness, PrintSigns, LaborEntry, PolicyAcknowledgment/BusinessDocument, public availability flags, MarketingKit featured items. No duplicate LiveSale*/SaleDay* entity is warranted by the audit.

## 29. SALE SESSION ENTITY TEST

**Recommendation: DO NOT BUILD.** Existing architecture preserves daily truth by timestamps (§25); the only genuinely session-scoped state is operational (open/paused/closed-for-day), which is a small operator-set block on EstateSale at most. Re-evaluate only if per-day readiness snapshots or per-day staffing plans prove operationally necessary.

## 30. INCIDENT ENTITY TEST

**Recommendation: DO NOT BUILD today; extend SaleIssue additively (P1).** SaleIssue already preserves facts, privacy (photo private; team-scoped RLS), history, follow-up (linked tasks), type (category), urgency, ownership, and resolution. Structured people-involved/witness/location fields fit additively. An Incident entity becomes justified only if legal/retention workflow demands immutability guarantees the issue lifecycle lacks.

## 31. LIVE SALE COMMAND CENTER RECOMMENDATION

**Recommendation (P1, when authorized): one assembled "Live Sale" tab on Project Dashboard** — sections OPENING (readiness + change review + brief), STAFF (assignments + coverage map), ISSUES (ordered priority queue), CHECKOUT (today's orders/payment state), OFFERS (open + follow-up), ITEMS (HV/attention + sold-today), PICKUPS (awaiting), CLOSING (end-of-day + close checklist). Pure assembly of canonical records via existing entities — zero new entities, consistent with the audit's strongest finding that data exists and assembly is the gap.

## 32. SMALLEST RECOMMENDED ARCHITECTURE

DO NOT IMPLEMENT (pending authorization). Smallest set: (a) Command Center assembled view; (b) openingReadiness extension (staffing/HV/signs/payment); (c) change-since-last-brief assembly; (d) SaleIssue additive fields (item_id, incident detail fields); (e) operator-supplied entry/capacity procedure + honest checked-in count; (f) hold expiry/authority via sanctioned path; (g) closing + EOD reset checklists; (h) offer follow-up/clustering display; (i) priority-ordered issue queue. All display/assembly on existing truth.

## 33. INTERFACE / DATA / WORKFLOW / PERMISSION GAPS

- Interface: no live operator view; no entry-staff procedure display; no ordered manager queue; no closing view.
- Data: SaleIssue.item_id absent; no hold expiry; no entry/capacity block; no client-presence field; no structured incident detail fields.
- Workflow: discount stage not shown to cashier; release (pickup_completed_at) has no payment-confirmed prompt; EOD sale-day reset not templated.
- Permission: verified intact — HV update gate, client-decision gates, site-assessment/controlled-location field RLS, My Sale Day projection. One watch item: non-HV Item.price remains team-editable by design (Ch19 scope); if the operator wants enforceable discount discipline beyond HV, that is a deliberate policy change, not a defect.

## 34. P0 / P1 / P2 / P3 / LATER

**P0 found:** NONE new. All eight audited P0 risks are either enforced or structurally impossible: employee HV price bypass (blocked, RLS+function), client-decision bypass (blocked), unauthorized Hold — partially open on non-HV items (P1: hold is a commitment; today `reserved` is settable by team — flag as P1 because it is scoped by Ch19's deliberate HV-only gate, not an oversight in the audited protections), unauthorized release — pickup_completed_at is team-settable on sold non-HV items without a payment-confirmed check (P1: add release prompt/guard; offline `paid` is the cashier's in-person assertion), checkout-unknown-as-paid — offline completion records assertion-based `paid` (honest limitation; online path is webhook-verified; P1: make the assertion explicit in UI copy), duplicate charge path (guarded), security/controlled-location leakage (none found — RLS verified), reassignment coverage invisibility (deterministic check exists), cross-company leakage (sale_team/operator RLS anchors verified).
**P1:** §32 items (a)–(i).
**P2:** all AI promises (§26); buyer-feedback capture; no-conversion alerts (needs tracked signals first).
**LATER:** predictive traffic, CV occupancy, theft detection, indoor positioning, predictive pricing, automatic staff optimization, queue prediction, advanced buyer analytics — none implemented, none claimed.

## 35. BOOK TRUTH (every promise)

Opening Readiness Check — YES AS EXISTING-SYSTEM OUTCOME (Ch17 engine) + small enhancement. Last-Minute Change Review — NOT YET (P1 assembly; data ready). Unresolved Issue Alert — YES (urgency + My Sale Day banner). Team Position Check — YES (coverage check). AI Opening Review — P2. Sale-Day Briefing — YES (Ch19). Employee Role Card — YES (My Sale Day). Negotiation Authority — YES (matrix). Featured Item Update — YES WITH SMALL ENHANCEMENT (Ch18 conflict engine exists; not in brief). Employee Acknowledgment — YES (PolicyAcknowledgment + brief ack). Entry Management — NOT YET (P1). Digital Waitlist — NOT YET (P1 conditional). Entry Count — NOT YET (be honest: no exits tracked; P1 approximate only). Attendance Tracking — YES. Capacity Rules — NOT YET (P1 operator-supplied). Live Floor Notes — YES (SaleNote/SaleIssue). Coverage Adjustment — YES. High-Interest Alerts — YES WITH SMALL ENHANCEMENT (multi-offer data exists; no alert display; do not claim views). Checkout Queue Alert — WORDING SHOULD CHANGE (no queue signal; P1 operational flag). AI Opening Pulse — P2. Pricing Rules — YES (Ch16/19). Employee Authority Limits — YES (data layer, HV-scoped). Offer Capture — YES. Manager Approval — YES. Offer History — YES. AI Offer Context — P2 (deterministic context panel is the P1). Rejected Offer Record — YES. Offer Follow-Up — SMALL ENHANCEMENT. Buyer Recontact — YES (consent-separated). Offer Clustering — SMALL ENHANCEMENT. Market Feedback — YES (evidence-kind separation). Live Merchandise Status — YES (liveItemStatus composite; no monolithic status). Hold Timer — NOT YET (P1). Hold Authority — PARTIAL (HV enforced; non-HV P1). Buyer Record — YES (user_id where known; name snapshots otherwise). Status History — YES (Activity). Discount Schedule — YES. Automatic POS Rules — WORDING SHOULD CHANGE (system never auto-applies — by doctrine). Excluded Items — YES. Employee Discount Limits — YES (guidance + no POS discount path). Discount Performance — YES (derivable; cautious causality). High-Value Coverage — YES. Controlled Access Notes — YES (private, RLS). Security Walkthrough Tasks — YES. Private Security Notes — YES (RLS verified). Escalation Procedure — YES. Incident Button — YES (Help; relabel P1). Immediate Action Guide — YES AS POLICY DOCUMENT (+emergency copy P1). Incident Details — SMALL ENHANCEMENT (additive fields). Hazard Follow-Up — YES (issue→task). Incident Record — YES VIA SALEISSUE (entity not needed). Property Walkthrough — YES. Property Issue Report — YES (Help + photo). Pickup Protection — YES. Restricted Area Status — YES. Property Condition Record — YES. Help Request — YES. Priority Level — YES (qualitative). Item Link — SMALL ENHANCEMENT (P1 field). Photo or Voice Note — PHOTO YES / VOICE NO (say so). Manager Response — YES. Priority Queue — SMALL ENHANCEMENT. Critical Alerts — YES (urgency/blocking) / display P1. Routine Queue — YES (ROUTINE default). Assigned Resolution — YES. AI Triage — P2. Checkout Mode — YES. POS Status — YES (assertion caveat). Cash Procedures — YES (record) / reconciliation Ch21. Pickup Conversion — YES. Checkout Help Routing — SMALL ENHANCEMENT (UI). Live Sale Dashboard — NOT YET (P1 assembly). Category Performance — YES (Item.category + sold data; no live grouping display — P1 assembly). Buyer Behavior — NOT YET (only real signals: offers/checkins; no browsing). Offer Activity — YES (data) / display P1. Large-Item Performance — YES WITH SMALL ENHANCEMENT (furniture category + pickup flags define it). AI Sale Pulse — P2. Repeated Feedback Flag — NOT YET (no structured feedback capture). Offer Pattern — SMALL ENHANCEMENT (deterministic). No-Conversion Alert — WORDING SHOULD CHANGE / P2. Single Data Point Protection — YES. AI Pattern Review — P2. Live Reassignment — YES. Current Assignment View — YES. Coverage Map — YES. Manager Broadcast — NOT YET (P1; notifications infra exists but no sale-day broadcast — do not claim delivery). Dynamic Staffing Record — YES (CLEARED history + LaborEntry). Client Sale-Day Plan — NOT YET (P1). Client Boundaries — YES. Client Decision Alert — YES (brief + attention). Team Notification — SMALL ENHANCEMENT (client-presence field). Sensitive Interaction Notes — YES (least privilege). End-of-Day Reset — SMALL ENHANCEMENT (prep version exists). Unresolved Offer Review — SMALL ENHANCEMENT. Awaiting Pickup Review — YES. Next-Day Discount Update — YES WITH CARE (schedule exists; activation is authorized human action only). Team Debrief — YES (pinned SaleNote). AI Day-Two Brief — P2. Closing Checklist — NOT YET (P1 assembly). Last Customer Status — YES (pending orders). Property Secure Check — YES AS TASK (no electronic claims). Cash & Payment Close — Ch21 BOUNDARY. Open Issue Handoff — YES (persistence).

## 36. OPENING TRUTH MATRIX

| CHECK | Digital? | Human confirm? | Blocker/Warning? | Source | Support |
|---|---|---|---|---|---|
| CHECKOUT READY | Yes | Setup physically | Blocker (no location) | EstateSale.customer_flow + Checkout Setup tasks | ✓ existing |
| PAYMENT EQUIPMENT | No | Yes | — (task only) | SaleTask | △ add to readiness |
| ENTRY | Partial (zones/access) | Yes | Warning | prep_zones.access_class | ✓ existing |
| RESTRICTED AREAS | Yes | Signage physical | Warning | access_class/sale_day_status | ✓ |
| HIGH-VALUE PLACEMENT | Yes (record) | Physical verify | △ add | Item.controlled_location + custody_events | △ |
| SIGNS | Partial (kit status) | Physical | △ add | MarketingKit.component_status, PrintSigns | △ |
| STAFF POSITIONS | Yes | — | △ add (coverage blocker) | SaleStaffAssignment + staffingModel | △ |
| PICKUPS | Yes | — | Warning (presale sold) | Item.sold/pickup fields | △ display |
| OPEN ISSUES | Yes | — | Blocker (sale_opening cats) | SaleIssue + openingReadiness | ✓ |
| CLIENT DECISIONS | Yes | — | Warning (open) | SaleClientDecision | ✓ |
| PROPERTY SAFETY | Partial (flags/obs) | Yes | Blocker (safety issue) | zones.security_flags, SaleIssue | ✓ |

## 37. LIVE PRIORITY MATRIX

| Issue type | Level | Owner | Authority | Escalation | Support |
|---|---|---|---|---|---|
| Price question | ROUTINE | Operator/authorized | Matrix CAN DECIDE | Ask-for-Help | ✓ |
| Discount | ROUTINE/IMPORTANT | Employee within limit | Matrix | Help | ✓ |
| Payment unknown | IMPORTANT/URGENT | Operator | Do NOT release | payment issue (URGENT) | ✓ (doctrine; POS practice) |
| Client dispute | IMPORTANT | Operator | Client-decision only | Help→SaleClientDecision | ✓ (P0-gated) |
| Injury | URGENT | Human/emergency first | Human | Help safety URGENT + policy | △ incident fields |
| Property damage | IMPORTANT | Operator | Operator | Help + photo → task | ✓ |
| Suspected theft | URGENT | Operator | Operator | Help security URGENT | ✓ (facts only) |
| Missing HV item | URGENT | Operator | Operator | custody_events + Help | ✓ |
| Pickup problem | IMPORTANT | Assigned staff | Assignment scope | Help pickup | ✓ |
| Customer conflict | IMPORTANT | Customer-issues assignee | Assignment scope | Help | ✓ |
| Crowd/capacity | IMPORTANT | Entry assignee | Operator procedure (absent) | Help customer_flow | △ procedure P1 |

## 38. ITEM / MONEY / CUSTODY MATRIX

| State | Item | Offer | Order/Transaction | Payment | Pickup |
|---|---|---|---|---|---|
| AVAILABLE | status available | any | none | — | — |
| INTEREST | available (display_attention possible) | pending offer(s) | none | — | — |
| HOLD/COMMITMENT | reserved/pending or CHECKOUT_HOLD | accepted (pre-conversion) | none | none asserted | — |
| OFFER (only) | available | pending | none | — | — |
| SOLD | status sold + sold_date | accepted | Order created (offline: paid assertion / online: pending→webhook) | method recorded | pending |
| PAYMENT UNKNOWN | (not a system state — online pending_checkout_id; offline is assertion) | — | pending_payment | unverified | must NOT release |
| PAID | sold | accepted | Order paid | recorded | awaiting |
| AWAITING PICKUP | sold, pickup_completed_at empty | — | paid | recorded | pending (liveItemStatus ✓) |
| RELEASED | pickup_completed_at set | — | paid | recorded | complete (authorized_pickup honored) |

## 39. LIVE DASHBOARD MATRIX

| Signal | Canonical source | Exact/Approx | Live/Delayed | Support |
|---|---|---|---|---|
| Gross sales today | Order (by date) + Transaction | Exact | Near-live | data ✓ / view ✗ |
| Transaction count | Order/Transaction | Exact | Near-live | ✓ data |
| Attendance | CheckIn (sale_visit, date) | Exact entries | 30s refresh exists | ✓ data |
| Current occupancy | — none (no exits) | Approx at best | — | ✗ do not claim |
| Offers | Offer | Exact | Live | ✓ data |
| HV sales | Item (HV + sold today) | Exact | Live | ✓ data |
| Large-item sales | Item category/pickup flags | Exact | Live | ✓ data |
| Open issues | SaleIssue | Exact | Live | ✓ data (queue △) |
| Critical issues | urgency URGENT/blocking | Exact | Live | ✓ data |
| Awaiting pickup | Item sold w/o pickup_completed_at | Exact | Live | ✓ data |
| Staff coverage | SaleStaffAssignment + staffingModel | Exact | Live | ✓ |
| Checkout status | Order pending/created today | Exact | Near-live | ✓ data |
| Category performance | Item.category + sold | Exact | Delayed-ok | ✓ data / grouping △ |

## 40. INCIDENT MATRIX

| Incident type | Current record | Required fields | Privacy | Follow-up | Entity gap? |
|---|---|---|---|---|---|
| Customer injury | SaleIssue (safety, URGENT, photo) | title/desc/category/urgency/photo ✓; people/witnesses/time-location △ | Team-scoped, photo private | linked tasks ✓ | No — extend P1 |
| Employee injury | Same | Same | Same | Same | No |
| Property damage | SaleIssue + zone context + photo | Same | Same | task to fix ✓ | No |
| Suspected theft | SaleIssue (security) + custody_events (HV) | facts only ✓ | private photo ✓ | task ✓ | No |
| Payment dispute | SaleIssue (payment) + Order/Transaction truth | separated money truth ✓ | team/operator | task | No |
| Security issue | SaleIssue (security) | same | same | same | No |
| Other | SaleIssue | — | — | — | No |

## 41. DAY 1 → DAY 2 TRACE

Survives (verified persistence): current Item truth (status/sold_date/phase ✓), prior offers (Offer immutable history ✓), pickups (pickup fields ✓), open issues (✓ nothing resets), staffing (ACTIVE + CLEARED history ✓), discount strategy (schedule ✓; next-day activation = authorized human act ✓), client decisions (✓), security concerns (issues/custody ✓), tasks (✓), briefing (per-day ack Activity ✓). Broken seams: (1) no per-day opening state (project status only); (2) no "what changed since Day 1" assembly (P1); (3) day-2 brief is the same static brief (P1 change review fixes); (4) attendance roll-up per day is derivable but not displayed.

## 42. OPENING TRACE

sale scheduled (sale_dates ✓) → readiness (openingReadiness ✓ deterministic) → unresolved issues (badges ✓, ordered queue △) → staff positions (coverage ✓) → brief (OpeningBriefCard ✓) → acknowledgment (brief ack + policy acks ✓) → open (no digital open action — physical; correct per Part 105 doctrine). Digital vs human: physical payment equipment, signage placement, HV physical placement, property safety walkthrough = HUMAN; everything recordable is digital and deterministic.

## 43. OFFER TRACE

buyer offer → OffersPanel (item-linked ✓) → employee authority (matrix ✓; HV STOP ✓) → manager decision (operator-only price change ✓) → rejected (preserved, never mutated ✓) → item remains unsold (status untouched by offer ✓) → later follow-up (△ display P1) → buyer contact eligibility (consent-separated ✓; no offer creates marketing consent ✓).

## 44. PAYMENT / RELEASE TRACE

checkout (cart verified available ✓, HV gate ✓) → payment pending/unknown (online: pending_checkout_id + webhook ✓; offline: assertion) → payment confirmed (webhook marks paid / cashier records method ✓) → Item sold (synced ✓ with failure warning ✓) → pickup (windows/authorized person ✓) → release (pickup_completed_at). SEAM: release is recordable by team staff on non-HV sold items without a payment-confirmed prompt, and offline `paid` is the cashier's assertion — both are P1 prompt/guard refinements, not silent paths (nothing auto-releases; the duplicate-sale guard prevents double-sell).

## 45. INCIDENT TRACE

slip → employee reports (Ask-for-Help safety URGENT + private photo ✓) → immediate guidance (policy doc shown in My Sale Day ✓; emergency = human/911 first — P1 copy) → manager alerted (URGENT surfaces in My Sale Day + issue panel ✓) → factual details (title/desc/photo ✓; structured people/witnesses △) → hazard task (issue→task link ✓) → private record (RLS ✓) → follow-up (task tracking ✓). Missing architecture: only additive detail fields (P1).

## 46. REASSIGNMENT TRACE

queue pressure (no digital signal — P1 operational flag; today the manager observes) → manager moves staff (StaffingPanel ✓) → assignment changes (CLEARED + new ACTIVE ✓) → coverage re-check (deterministic UNASSIGNED badge ✓) → replacement assigned (✓) → both employees see current (My Sale Day live ✓). Missing seam: queue signal and a live-view gap banner (assembly P1).

## 47. CLIENT VISIT TRACE

client arrives (no presence field — P1) → team notified (△ broadcast/presence P1) → client requests removal (employee CANNOT authorize — P0 RLS verified ✓) → SaleClientDecision path (operator records ✓) → authorized resolution (history ✓) → Item truth updates (status/decision linked ✓). Chapter 19 protections survive live sale — verified at the data layer, not just UI.

## 48. CLOSING TRACE

doors close (physical) → last customer (pending orders queryable ✓) → open transactions (Order pending_payment ✓) → payment state (recorded ✓) → sold items (✓) → awaiting pickups (✓ derivable, display △) → property security (SaleTask checklist ✓, no electronic claims ✓) → cash/payment handoff (records ✓; reconciliation = Ch21) → open issues (persist ✓) → reset tasks (△ template P1) → next-day brief (△ change review P1). Missing: only assembly.

## 49. PRODUCT DOCTRINES

All Chapter 20 doctrines verified as structurally honored: HOLD≠SOLD≠PAID≠RELEASED (four truths, §38); URGENT≠LOUD (qualitative urgency only); item tells merchandise / transaction tells money (separation enforced); checkout protected from noise (focused UI verified); security info private (RLS verified); incident facts not speculation (no blame fields exist); reassignment never hides gaps (deterministic check); AI never makes consequential live decisions (no AI in the live path today at all); one buyer opinion = one data point (offer records independent). Pattern vs decision: the system may surface (P1), human decides — nothing today decides automatically.

## 50. LIVE SALE OPERATING LOOP

READY→BRIEF (✓✓) → OPEN (physical; correct) → OBSERVE (△ live view) → PRIORITIZE (△ ordered queue) → ASSIGN (✓) → TRANSACT (✓) → ESCALATE (✓) → ADAPT (△ queue/coverage signals) → CLOSE (△ assembly) → RESET (△ template) → LEARN (△ debrief view) → REOPEN (✓ persistence; △ change review). Broken transitions are all assembly-level, not data-level.

## 51. RECOMMENDED IMPLEMENTATION SEQUENCE (DO NOT IMPLEMENT)

1. SaleIssue additive fields (item_id, incident detail fields) + incident relabel of Ask-for-Help.
2. Manager priority queue (ordered by urgency→blocking→age) + critical/routine split.
3. Opening readiness extension (staffing/HV/signs/payment/coverage) + change-since-last-brief.
4. Live Sale Command Center tab (assembled view) incl. closing + EOD checklists.
5. Entry/capacity procedure + honest checked-in count (+waitlist only if capacity-controlled).
6. Hold sanctioned path (expiry/authority/buyer link).
7. Offer follow-up/clustering display + cashier discount-stage guidance.
8. Client sale-day plan (presence/expected/boundaries) + release payment-confirmed prompt.
9. (P2, later) AI surfaces on top of the assembled deterministic views.

## 52. PRE-LAUNCH DEPENDENCIES (carried forward)

- Chapter 19 real sale-team-member denial test (owner-role account could not be downgraded) — RELEVANT: remains the single largest unverified P0 surface; recommend a manual test with a real team account before relying on employee-denial paths in a live sale.
- Cross-company RLS/photo-access manual verification — RELEVANT (live-sale data leakage class); recommend one manual cross-account spot check.
- Customer.io outbox idempotency re-check — NOT a Chapter 20 blocker (no marketing sends in the live-sale loop).
- Chapter 16 remaining manual/security dependency — NOT a Chapter 20 blocker.
- No Chapter 20 blocker found in payment records; Base44 Payments webhook path exists and is registered.

## 53. CERTIFICATION

**GO WITH ENHANCEMENTS.**

The systems that guard money, merchandise, authority, and privacy — the parts that make a live sale SAFE to run on EstateSalen — are built, enforced at the data layer, and verified (HV price gate, client-decision gate, duplicate-sale guard, checkout HV stop, RLS-verified privacy of security/access material, persistence of all sale-day truth). The gaps are observation and assembly surfaces (live view, priority queue, entry procedure, change review, closing checklists), which are P1 enhancements on existing canonical records and carry no truth-integrity risk. Recommended condition before a high-stakes multi-day live sale: complete the Chapter 19 employee-denial manual test and the P1 release-prompt/priority-queue items.

— END OF AUDIT. Nothing was built. Awaiting explicit authorization before any Chapter 20 implementation. Chapter 21 not started. —