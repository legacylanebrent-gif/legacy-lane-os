# CHAPTER 19 — ESTATESALEN CROSS-AUDIT REPORT
## TEAM, STAFFING, AUTHORITY, TRAINING & LABOR

**Audit date:** 2026-10-21 · **Mode:** AUDIT ONLY — nothing built, no data changed, nothing sent, no synthetic records created.

---

## EXECUTIVE SUMMARY

**Coverage summary (93 audited book promises + 37 ready-to-use tools):**

| Classification | Count (book promises, approx.) |
|---|---|
| ✓ EXISTING / SUPPORTED | 27 |
| △ ENHANCE (small, existing architecture) | 19 |
| ↔ COVERED AS EXISTING-SYSTEM OUTCOME | 8 |
| ✎ BOOK / WORDING SHOULD CHANGE | 6 |
| ＋ NOT YET — BUILD (P1) | 20 |
| P2 (AI candidates) | 7 |
| LATER | 4 |
| ✕ DO NOT BUILD | 2 |

**Roughly 54% of Chapter 19 is true today** as existing or with small enhancement; ~27% requires genuine P1 builds; the remainder is P2/Later/wording.

**Strongest existing architecture:**
- **Labor truth** — LaborEntry is genuinely excellent for Chapter 19: sale, team_member_id/user_id identity, date, hours, rich activity vocabulary (sorting, research, pricing, staging, photography, sale_day, pickup, sale-floor maintenance), zone/room association, snapshot hourly cost, and a first-class owner-time doctrine. Labor by activity, by room, by person, planned-vs-actual — all already supported.
- **Policy + acknowledgment** — BusinessDocument (POLICY category, team_member scope, version) + PolicyAcknowledgment (who / which version / when, assigned-vs-acknowledged version tracking) + MyPolicies self-service page is a complete, honest acknowledgment system.
- **Issue/escalation skeleton** — SaleIssue with practical categories (incl. safety, customer_flow, checkout, pricing), blocking areas, resolution-with-references (task/decision), team-create RLS, and the Chapter 13 dependency model.
- **Authority boundaries (partial)** — HIGH_VALUE price change authority enforced in changeItemPrice (operator-only + mandatory reason); SaleAuthority/SaleClientDecision request-state protects disputed family instructions; negotiation policy truth exists on Company + Item.
- **Zone-level responsibility + end-of-day** — prep_zones.assignee_user_id gives room-level ownership; EndOfDayPanel is a certified deterministic end-of-day/carryover view.

**Largest genuine gaps:**
1. **No sale-day responsibility model** — nothing assigns ENTRY / CHECKOUT / HIGH VALUE / PICKUP ownership for a specific sale, no primary/backup, no deterministic responsibility-gap check. SaleTask cannot truthfully represent ongoing sale-day responsibility (Part 79 distinction unmet).
2. **No employee-facing authority surface** — Company.negotiation_policy and HIGH_VALUE rules exist but only operator-facing; an employee has no CAN DECIDE / ASK / STOP view.
3. **No training system** — no scenario training, no POS practice mode (nothing simulates checkout without financial side effects), no training history beyond policy acknowledgments.
4. **No availability, no staffing plan, no skills-coverage/bench view.**
5. **Ask-for-Help flow absent as a dedicated action** (SaleIssue create exists but no urgency, no photo, no help-first framing).
6. **Two genuine authority seams found (P0/P1 candidates, audit-only):** see §36.

---

## 1. TEAM MEMBER FOUNDATION

**✓ EXISTING (Chapter 6 P1, certified).**
- Entity: `TeamMember` — `name`, `role` (free text, explicitly "not a platform permission"), `status` (ACTIVE/INACTIVE), `phone`/`email` (operator-protected), `default_hourly_rate`, `skills` (shorthand array), `notes`, `user_id` (platform link, null = non-platform helper), `operator_id`/`company_id`.
- Pages: `src/pages/TeamMembers.jsx` (directory, search, status toggle, modal editor), `ManageTeam.jsx` (platform-team membership), `PendingTeamInvite` + `redeemTeamInvite` function (invite flow).
- Boundary doctrine is explicit in the schema: NOT payroll, NOT HRIS; deliberately excludes SSN/tax IDs/bank/medical/background-check data.
- **Missing for Ch19:** availability, training state, employment-document linkage (via BusinessDocument `scope: team_member` — that part ✓ exists), experience/history.

## 2. SKILLS / STRENGTHS / PREFERENCES

- Skills: **△ ENHANCE.** `TeamMember.skills` is a free shorthand array ("heavy lifting, POS, staging") — content exists but there is **no provenance** (SELF-REPORTED vs MANAGER-OBSERVED vs TRAINED vs VERIFIED all indistinguishable; effectively UNKNOWN). No competency scores (correctly so).
- Note: `OperatorSkillsAssessment` (Chapter 3 P1) is the **operator's own business self-assessment** (11 categories, LEARN IT/SYSTEMIZE IT/DELEGATE IT/FIND A SPECIALIST plan) — it is NOT an employee skills system. Do not conflate.
- Preferred roles: **＋ BUILD (small)** — no preference vs skill vs authorization distinction anywhere.
- Strengths: ✎ wording — book should say "operator-recorded shorthand capabilities, provenance unknown" rather than implying assessed strengths.

## 3. PREP / SALE-DAY ROLES

- Prep roles: **↔ COVERED** — prep zones carry `assignee_user_id`/`assignee_name` (zone-level responsibility), `SaleTask.assignee_user_id` (task-level), LaborEntry categories name the activity (sorting, staging, pricing, photography, research, moving…).
- Sale-day roles: **＋ BUILD** — there is NO assignment of entry / checkout / floor coverage / high-value / pickup / customer-issue ownership for sale day. `EstateSale.customer_flow` records WHERE entry/exit/checkout are, but not WHO owns them. `prep_zones.sale_day_status` records zone state, not people.

## 4. STAFFING PLANNER

**＋ BUILD (P1, moderate).** No planner exists. Inputs it would consume already exist: property/site assessment (size, stairs, parking, merchandise_volume), customer_flow (entry/exit/checkout), zones with security_flags, high-value items (inventory_level/display_attention), pickup plan, and Chapter 4 labor estimates + labor budget thresholds. The planner is the missing composition layer. Not workforce-optimization software — a plan-and-warn surface.

## 5. PROPERTY COVERAGE

**↔ COVERED (Ch17 architecture, people-mapping absent).** Zones (with access_class incl. CHECKOUT, OPEN_TO_CUSTOMERS, security_flags), customer_flow entry/exit/checkout, and pickup plan cover the WHERE. Associating a PERSON with each of these is the missing half (same gap as §3). No separate coverage-map entity needed — zones + a responsibility structure suffice.

## 6. LABOR BUDGET

**✓ EXISTING.** SaleConversionPipeline `labor_estimates` (category, hours, rate, owner-time flag, min-revenue/contribution thresholds) + LaborEntry actuals + `saleEconomicsModel` / closeout projected-vs-actual comparison (Chapter 4 certified). What is missing is only staffing-plan-vs-budget comparison (follows from §4).

## 7. ROLE / RESPONSIBILITY ASSIGNMENTS

- Task-level: ✓ (`SaleTask` assignee, due, priority, blocked, completion audit).
- Zone-level: ✓ (prep zone assignee).
- Sale-day responsibility-level: ✕ — **SaleTask cannot truthfully represent ongoing sale-day responsibility** ("Checkout Lead" is not a discrete work item; Part 79 unmet). This is the one place the New Entity Test (§33) may justify a lightweight structure.

## 8. PRIMARY / BACKUP COVERAGE

**＋ BUILD (small).** SaleTask and prep_zones each support exactly ONE owner (`assignee_user_id`). Smallest enhancement: a backup field on whatever responsibility structure is chosen (or on prep_zones for prep coverage). No backup exists today.

## 9. EMPLOYEE VIEW

**△ ENHANCE.** RLS already gives sale-team members read access to the sale, their tasks, issues, decisions, notes, zones (EstateSale/SaleTask/SaleIssue RLS include `sale_team_ids`). `MyPolicies.jsx` gives each acknowledging worker their own acknowledgment list. **Missing:** a single "My Sale Day" aggregation (my role, my tasks, my zone, my deadlines, my unresolved issues, sale-specific rules, required acknowledgments). All sources exist; only the assembled personal view is absent. Note TeamMember directory itself is operator/admin-only by RLS — employees cannot see coworkers' records (correct privacy; also means no peer directory).

## 10. AUTHORITY MODEL

The four kinds of authority are NOT collapsed in current truth, but only two are enforced in software:
- **Software permission** — RLS everywhere; field-level RLS on `Item.controlled_location`, `display_attention`, research-override fields (operator/creator/admin only) — certified Chapters 14–16.
- **Business authority** — exists as recorded truth: `Company.negotiation_policy` (policy enum, employee_authority_max/unit, escalation_threshold, notes) and `Item.negotiation_override` (NO_DISCOUNT_WITHOUT_OPERATOR). **But it is operator-facing only** — no employee-facing authority surface.
- **Client authority** — `SaleAuthority` + `SaleClientDecision` (request-state doctrine, Chapter 13) — certified.
- **Pricing/discount/Offer authority** — HIGH_VALUE guard in `changeItemPrice` (operator-only + mandatory reason); research guard (operator override only); `excluded_from_discounts`. **Checkout/POS has no discount engine at all** — CheckoutStation applies canonical price only, which is currently a *safety* (an employee cannot discount through the POS because the capability does not exist) but also means Offer acceptance is the only negotiation path and it has no guard surfacing in OffersPanel.

## 11. NEGOTIATION / HIGH-VALUE AUTHORITY

- **✓ EXISTING (truth + guard):** Company policy → Item override → HIGH_VALUE price-change guard (`HIGH_VALUE_AUTHORITY_REQUIRED`, operator-only, reason mandatory, Activity history). Limits vary by company policy, per-item override, and item level — but **not by employee role** (no per-employee authority limits; the company policy speaks of "employee authority" generically with one threshold).
- **⚠ GENUINE SEAM (audit finding, do not fix now):** the HIGH_VALUE price guard lives ONLY in the `changeItemPrice` function. A sale-team member with Item update RLS could call `base44.entities.Item.update()` directly and change a HIGH_VALUE item's price, bypassing the function seam (no reason, no operator check, no Activity history). Same class of seam: a team member could create a `SaleClientDecision` with a direct `current_decision` (request-state protects the request path, but nothing structurally prevents a direct authorized-decision write). Both are **P0 candidates** for guard relocation/enforcement (see §36, §45).

## 12. CLIENT AUTHORITY PROTECTION

**✓ EXISTING (Chapter 13 certified).** Request-state (REQUESTED/UNDER_REVIEW never changes `current_decision`); only operator-recorded approval appends controlling history; SaleAuthority distinguishes decision-makers. An employee's verbal family statement has no path into authorized truth through the intended UI. (Direct-write seam noted in §11.)

## 13. SOFTWARE PERMISSIONS

**✓ Mostly aligned; strict audit result:**
- Employee records (TeamMember, PolicyAcknowledgment, team-member-scoped documents): operator/admin only — coworkers cannot read each other ✓.
- Company economics (deals, commission, settlement fields): operator-only field RLS ✓.
- Controlled locations, custody, display_attention, research overrides: operator/creator/admin field RLS ✓.
- Client info: `site_assessment` + `access_details` operator-only (Ch13) ✓.
- Payment/buyer PII: Item sold/buyer fields operator/creator/admin field RLS ✓; EarlySignIn operator-scoped ✓.
- **Known open items (carried):** public directory/operator-profile PII exposure and cross-company RLS manual verification remain unresolved from prior chapters (§52).

## 14. POLICY CENTER

**△ ENHANCE.** Policy truth exists in ONE place (BusinessDocument category POLICY — no duplicate repository), with `policy_type` (Sale-Day Procedure, Safety, Team, Photo/Privacy…), version, team-member scope, and acknowledgment assignment (`PolicyAssignmentDialog`). Missing: an employee-facing **Policy Center page** that shows active policies + sale-specific rules (excluded areas, discount plan, pickup plan, customer flow) side-by-side. All data exists; the assembled employee view does not.

## 15. POLICY ACKNOWLEDGMENT

**✓ EXISTING (certified Chapter 6).** WHO (`team_member_id`/`user_id`), WHAT (`business_document_id` + title snapshot), WHICH VERSION (assigned version vs acknowledged version tracked separately — a replaced policy is never silently covered), WHEN (`acknowledged_at`). Self-service `MyPolicies` acknowledge seam + operator-recorded offline acknowledgments. No legal-enforceability claims. Reuses Chapter 6 renewal/reminder engine for expiration (POLICY docs with expiration dates get 60/30/7/expired reminders ✓).

## 16. TRAINING

- **Training content:** ✎ BOOK / weak — TrainingBlog/TrainingArticleDetail and Courses are consumer marketing/education surfaces, not employee operational training. No scenario training exists.
- **Training history:** △ only PolicyAcknowledgment doubles as "read and acknowledged" history; no completed-training record for operational skills.
- **Checkout readiness/training requirements:** ✕.
- **Interactive scenario system:** ✕ (correctly distinguished in the book — it must not claim one).

## 17. POS PRACTICE MODE

**✕ DOES NOT EXIST.** CheckoutStation has no practice/sandbox flag; any "practice" would create real Orders/Transactions and mutate Item status. **Book wording must change today** ("EstateSalen does not yet include a POS practice mode") OR a P1 build is required to make the promise true. A safe practice mode must not create Order/Transaction/payment/Item-sale/receipt/pickup state — this is a genuine software gap, not template-able.

## 18. ASK FOR HELP

**△ ENHANCE (no new entity).** SaleIssue is the correct home and already supports team creation (RLS create allows `sale_team_ids`), categories, resolution-with-references. Missing links for the HELP flow: a dedicated quick action ("Ask for Help") framed as request-for-help rather than issue-admin; urgency; optional photo; a guaranteed answer loop back to the requester. All fit SaleIssue with small additive fields — **no new entity justified**.

## 19. ISSUE / ESCALATION

**✓ EXISTING (core) + △ small.** Categories already cover PRICING, SAFETY, CUSTOMER_FLOW, CHECKOUT, PICKUP, MERCHANDISE, CLIENT_FAMILY, SECURITY-ish (via safety/customer_flow; no dedicated theft/security category — small enum addition). Resolution preserves question → resolution → who (owner/resolved fields) → when → linked task/decision ✓. **Urgency: ✕** (no ROUTINE/IMPORTANT/URGENT — additive enum, no numeric severity, correct). **Photo: ✕** (no photo field on SaleIssue; privacy-safe photo pattern exists in SaleDiscovery/Item.photo_library to copy).

## 20. DAILY BRIEFING

- **Preparation brief:** △ — `PrepCoachPanel` (Chapter 8 P2) generates a "TODAY'S PREP BRIEF" via AI from current records (operator-facing, button-press, hedged). A deterministic assembly (tasks due today, zones waiting, blockers, labor yesterday) is 90% already computed in `EndOfDayPanel`/`discoveryModel.endOfDaySummary` — deterministic brief is a small enhancement; the AI one exists but must not be called deterministic.
- **Opening brief / daily team brief (roles, decisions, restricted areas, high-value, safety):** ＋ BUILD (small) — every source record exists (assignments [gap §7], excluded_areas, decisions, display_attention items, zone security flags, customer_flow, issues blocking sale_opening); no assembled brief exists and nothing AUTOMATICALLY summarizes today. Employee acknowledgment of a brief: ✕ (PolicyAcknowledgment could be reused only with care — a brief is not a policy; better as a lightweight SaleIssue/SaleTask "brief read" record or P1 decision).

## 21. DEFINITION OF DONE

**△ ENHANCE (small).** SaleTask has name/description/category/status; the Chapter 1 15-step template (`saleActivationTemplate`) seeds tasks with descriptions that function as guidance, but there is no structured completion-criteria field. Smallest enhancement: a `definition_of_done` text field on SaleTask (no new status, no checklist engine).

## 22. END-OF-DAY / CARRYOVER

**✓ EXISTING (certified Chapter 14).** EndOfDayPanel: zones complete/sorting/waiting/untouched, labor today, open discoveries/decisions/issues, blocked tasks, tasks due — deterministic, derived, no re-entry; open work persists in canonical records with no reset. Status grouping (COMPLETED/PARTIAL/BLOCKED/NOT STARTED/OVERDUE) is derivable from SaleTask status + blocked + due_date — a view enhancement at most.

## 23. LABOR

**✓ EXISTING — strongest area.** By activity (rich enum incl. sorting/research/pricing/staging/grouping/lighting/signage/photography/measurement/moving/sale_day/sale_floor_maintenance/pickup/closeout/travel), by room (`prep_zone_id`/`prep_zone_name` snapshot), by person (`team_member_id` canonical + `user_id` + name snapshot), cost (`hourly_rate` snapshot; `default_hourly_rate` convenience on TeamMember), owner time separate (`is_owner_time` — never cash cost), planned-vs-actual (Chapter 4 labor_estimates vs LaborEntry, compared in economics/closeout). Pay rate privacy: rate lives on operator-scoped LaborEntry/TeamMember (operator/admin read) ✓. Employee pay vs project cost distinction preserved (rate snapshot = project cost basis, not payroll).

## 24. ROLE / RELIABILITY HISTORY

**↔ COVERED AS EXISTING-SYSTEM OUTCOME.** SaleTask completion audit (completed_at/by/name) + LaborEntry history + zone assignee history naturally create factual assignment history. No reliability record (assigned/worked/cancelled/no-show) — △ small enhancement if the operator wants it; **no subjective performance score exists and none should be built** (doctrine respected).

## 25. TRAINING HISTORY

**△ ENHANCE.** Acknowledgment history ✓; completed-training history ✕ — smallest path: reuse PolicyAcknowledgment pattern or a `training_completed` flag/date set on TeamMember-linked records via the existing document vault (training doc as POLICY/PROFESSIONAL doc + acknowledgment). No TrainingUser entity.

## 26. AVAILABILITY / BENCH

**✕ ABSENT.** No availability windows on TeamMember (UserCalendarEntry is a consumer's saved-sale list, not availability; OperatorCalendar is the operator's own calendar). Availability request: ✕ — the system has email (SendEmail to registered users) but no availability-request flow; the book must not claim one. Backup bench: ✕ — a filter/view over trained people (once training history exists); not an entity.

## 27. SKILLS COVERAGE / STAFFING GAPS

**✕ ABSENT.** Nothing answers "do we have at least one appropriately trained/authorized person for each critical function?" — requires: critical-function list (deterministic, from customer_flow/zones/high-value items), person-capability truth (skills + training history), and a deterministic matrix. No staffing-gap alert for future sales. **Prefer deterministic — the AI Coverage Review (Part 77) should be answered by a deterministic responsibility-gap check, not AI.**

## 28. EMPLOYEE DOCUMENTS / PRIVACY

- **✓ EXISTING:** BusinessDocument `scope: team_member` + `team_member_id` — employment/business records (W-9-ish docs, certifications, contracts) attach to the worker; operator/admin-only RLS; private file_uri + signed-URL viewing; version; expiration + reminders.
- **✓ PRIVACY (P0 check):** ordinary staff cannot read other employees' documents (RLS operator/admin), TeamMember, or acknowledgments of others. No manager-note leakage (no manager notes exist — `TeamMember.notes` is operator-visible only, which is acceptable but is not a structured coaching note; a private-notes field would need its own operator-only boundary — △ P1 candidate with careful RLS).
- Required-document checklist: ✕ — no per-operator configurable "required docs for this worker" list (must not hardcode jurisdiction-specific employment requirements — correct doctrine; make it operator-configured, advisory).

## 29. AI

- **✓ EXISTING (operator-facing):** AI Coach modes — compliance-research mode (Ch6 P2, tightly guarded, source-type suggestions, no legal conclusions), operations mode (grounded sale context), prep/staging coaches (Ch8/Ch14/Ch17, hedged). AI credit accounting per mode.
- **✕ ABSENT (all P2, do not build):** AI policy lookup for employees (no policy-grounded Q&A; a generic chat must NOT be called policy lookup); AI staffing assistant; AI assignment suggestions (would need explainable, no opaque ranking); AI team coach (must not generate performance judgments from thin data); AI labor review (deterministic variance already covers most); AI daily briefing builder (an AI brief exists for prep; sale-day deterministic assembly is better); AI scenario coach.
- **AI safety boundary ✓ by doctrine:** no AI in any authority/decision path today; coaches hedge and escalate to professionals.

## 30. HR / LEGAL BOUNDARY

**✓ Correctly maintained in architecture** (TeamMember explicitly not HRIS/payroll; ComplianceQuestion provenance-only, AI-is-not-a-source; acknowledgment carries no enforceability claim). **Book wording risk:** Chapter 19 language around "employee records," "required documents," "pay rates," and "authority matrix" could imply HRIS/payroll/legal-advice capabilities — wording must keep the operational-directory framing.

## 31. READY-TO-USE TEAM TOOLS (all 37 classified)

| # | Tool | Classification |
|---|---|---|
| 1 | Employee information sheet | EXISTING TEMPLATE (TeamMember record ≈ interactive system already better) |
| 2 | Employee skills assessment | SMALL ENHANCEMENT (skills + provenance label) |
| 3 | Role preference worksheet | SMALL ENHANCEMENT (preference field) |
| 4 | Preparation-role guide | BOOK / PRINTABLE (roles are free text + zone/task assignment) |
| 5 | Sale-day role guide | GENUINE SOFTWARE GAP (needs responsibility model) |
| 6 | Employee availability sheet | GENUINE SOFTWARE GAP (no availability) |
| 7 | Staffing planner | GENUINE SOFTWARE GAP (P1) |
| 8 | Property coverage worksheet | SMALL ENHANCEMENT (zones + responsibility mapping) |
| 9 | Daily team assignment sheet | GENUINE SOFTWARE GAP (derived once §7 exists) |
| 10 | Role responsibility card | GENUINE SOFTWARE GAP (same structure) |
| 11 | Employee authority matrix | SMALL ENHANCEMENT (surface existing negotiation_policy + HIGH_VALUE rules) |
| 12 | Negotiation limits sheet | EXISTING TEMPLATE (from Company.negotiation_policy truth) |
| 13 | Pricing-policy sheet | EXISTING TEMPLATE (pricing truth + negotiation policy) |
| 14 | Hold/reservation policy | EXISTING TEMPLATE (Item.status reserved + policy doc) |
| 15 | Pickup policy | EXISTING TEMPLATE (pickup_plan + item requirements) |
| 16 | Customer-service standards | BOOK / PRINTABLE (policy doc) |
| 17 | Property-respect policy | BOOK / PRINTABLE (policy doc) |
| 18 | Confidentiality acknowledgment | INTERACTIVE SYSTEM ALREADY BETTER (PolicyAcknowledgment) |
| 19 | Social-media/property-photo policy | INTERACTIVE SYSTEM ALREADY BETTER (POLICY doc + Ch15 photo privacy) |
| 20 | Employee conduct acknowledgment | INTERACTIVE SYSTEM ALREADY BETTER |
| 21 | Checkout training checklist | SMALL ENHANCEMENT (task template / policy doc) |
| 22 | POS practice scenarios | GENUINE SOFTWARE GAP (practice mode P1) |
| 23 | Negotiation scenarios | GENUINE SOFTWARE GAP (no scenario system) |
| 24 | Escalation guide | SMALL ENHANCEMENT (authority matrix + SaleIssue flow) |
| 25 | Incident form | SMALL ENHANCEMENT (SaleIssue safety category; see §85 boundary) |
| 26 | Found-valuables procedure | INTERACTIVE SYSTEM ALREADY BETTER (SaleDiscovery custody chain) |
| 27 | Daily preparation briefing | SMALL ENHANCEMENT (deterministic brief; AI prep brief exists) |
| 28 | Sale-day opening briefing | GENUINE SOFTWARE GAP (assembly missing) |
| 29 | End-of-day review | INTERACTIVE SYSTEM ALREADY BETTER (EndOfDayPanel) |
| 30 | Room completion checklist | INTERACTIVE SYSTEM ALREADY BETTER (zone prep_status) |
| 31 | Employee time sheet | INTERACTIVE SYSTEM ALREADY BETTER (LaborEntry) |
| 32 | Labor-category sheet | INTERACTIVE SYSTEM ALREADY BETTER (work_category) |
| 33 | Estimated-vs-actual labor report | INTERACTIVE SYSTEM ALREADY BETTER (Ch4 economics) |
| 34 | Training record | SMALL ENHANCEMENT (acknowledgment-adjacent) |
| 35 | Employee coaching form | P2 (needs manager-notes boundary first) |
| 36 | Post-sale staffing review | SMALL ENHANCEMENT (deterministic from labor + assignments) |
| 37 | Staffing bench worksheet | GENUINE SOFTWARE GAP (needs skills/availability/training truth) |

## 32. DO-NOT-REBUILD

Certified systems Chapter 19 MUST reuse (all verified present): TeamMember · company/user membership + PendingTeamInvite · roles/RLS · SaleTask (+Ch13 dependencies, completion audit) · SaleIssue (+Ch17 categories) · SaleNote · SaleAuthority · SaleClientDecision (request-state) · Item (+inventory levels, photo privacy, field-level RLS) · HIGH_VALUE guards (changeItemPrice) · pricing/discount/negotiation truth (Company/Item) · Offer · checkout/POS (CheckoutStation/ScanAndCart) · pickup/release (authorized_pickup, pickup_completed_at, pickup_plan, item pickup_requirements) · prep zones (assignee, access_class, security_flags) · room readiness (prep_status) + sale-day room state (sale_day_status) · Equipment (EquipmentAsset/SaleEquipmentAssignment) · LaborEntry · projected/actual economics (deal labor_estimates, SaleEconomicsPanel, closeout) · Business Document Vault (team_member scope, version, expiration reminders) · policy/acknowledgment system (PolicyAcknowledgment + MyPolicies + policyAcknowledgments fn) · ComplianceQuestion · calendar (operator/calendar; personal saved-sales) · Project Dashboard / Prepare Sale (EndOfDayPanel, PrepZonesPanel, DiscoveryPanel) · AI Coach (operator modes).

## 33. NEW ENTITY TEST

**Recommendation: ONE lightweight exception may be justified — a sale-scoped RESPONSIBILITY (assignment) structure** (e.g. `SaleStaffAssignment`: sale_id, function/role enum [ENTRY, CHECKOUT, HIGH_VALUE, FLOOR_ZONE, NEGOTIATION, FURNITURE, PICKUP, CUSTOMER_ISSUES, FLOOR_RECOVERY], zone_id optional, primary team_member/user, backup optional, notes). Proof of necessity: SaleTask is discrete work with completion semantics — an ongoing sale-day function is not completable work, forcing false tasks (violates Part 79/80 distinctions); prep_zones covers prep rooms only, not entry/checkout/pickup functions; nothing else represents person↔function ownership. Everything else (skills, preference, availability, training history, urgency, help photo, definition-of-done, backup-on-tasks) fits existing entities additively. **DO NOT BUILD during audit — this is a P1 recommendation only.**

## 34. SMALLEST RECOMMENDED ARCHITECTURE (DO NOT IMPLEMENT)

1. SaleStaffAssignment (above) + deterministic REQUIRED-FUNCTIONS check (checkout required when customer_flow.checkout_location set; entry required; high-value coverage when HIGH_VALUE/CONTROLLED_DISPLAY items exist; pickup responsibility when sold items pending pickup) → UNASSIGNED surfacing.
2. TeamMember additive fields: `preferred_roles` (free text/enum), `availability` (simple windows array), optional skills provenance label; manager-private notes ONLY with operator-only field RLS.
3. SaleIssue additive: `urgency` enum (ROUTINE/IMPORTANT/URGENT), optional `photo_uri` (private-storage, signed-URL viewing).
4. Employee "My Sale Day" view + employee Policy Center page (assemble existing records only).
5. Authority matrix page: deterministic rendering of Company.negotiation_policy + HIGH_VALUE rules + escalation paths (CAN DECIDE / ASK / STOP).
6. POS practice mode (hard isolation: no Order/Transaction/payment/Item mutation) — largest single build; alternatively change book wording now.
7. Definition-of-done field on SaleTask; deterministic sale-day opening/eod brief assembly.

## 35. INTERFACE / DATA / WORKFLOW / PERMISSION GAPS

- UI: no staffing/assignment surface; no employee personal view; no policy center page; no help button; no authority matrix page; no practice mode.
- Data: no availability, no preference, no training history, no urgency, no issue photo, no backup owner, no responsibility record.
- Workflow: no brief assembly; no staffing-gap alert; no availability request; no answer-loop guarantee on issues (requester not tracked).
- Permission: employee-relevant authority truth is operator-only (visibility gap, not leak); TeamMember invisible to sale-team (safe; may need a minimal name/role projection IF assignments reference members — must not expose phone/email/rate).

## 36. P0 / P1 / P2 / P3 / LATER

**Genuine P0 (audit findings — fix before launch, NOT built now):**
- **P0-A: HIGH_VALUE price guard is function-seam-only.** A sale-team member with Item update RLS can change a HIGH_VALUE item's `price` via direct entity update, bypassing `changeItemPrice` (no operator check, no reason, no history). Guard must be enforced at schema/RLS or a server-side write path. *(The certified UI path is safe; the bypass is the exposure.)*
- **P0-B: Direct-write seam on SaleClientDecision.** Team members can create a decision record whose `current_decision` reads as authorized (request-state protects the request path, not the direct-write path). An employee could manufacture "authorized client truth."
- (Carried, prior chapters: public/operator-directory PII exposure; cross-company RLS manual verification.)

**Minimum P1 to make Chapter 19 substantially true:** responsibility/assignment structure + gap detection; employee view + policy center; authority matrix surfacing; Ask-for-Help (urgency/photo/loop); definition of done; skills-preference-availability additive fields; training/acknowledgment history; skills-coverage + staffing-gap views; P0-A/P0-B guard enforcement. POS practice mode: P1-if-book-claims-it, else wording change.

**P2:** all AI team features (policy lookup, staffing assistant, assignment suggestions, team coach, labor review, briefing builder, scenario coach). **LATER:** HRIS/payroll/scheduling-optimization/geofencing/predictive scoring.

## 37. BOOK TRUTH (every promise)

Employee Profiles ✓(directory-minimal) · Skills & Strengths △(shorthand, provenance UNKNOWN — wording) · Preferred Roles ＋ · Preparation Roles ↔ · Sale-Day Roles ＋ · Staffing Planner ＋ · Property Coverage Map △(where✓ who✕) · Recommended Coverage ＋(deterministic feasible) · Labor Budget ✓ · Understaffing Warning ＋ · Overstaffing Review ＋(compare plan vs estimates) · Role Assignments ＋ · Preparation Assignments ✓ · Primary & Backup ＋(small) · Responsibility Gaps ＋ · Employee View △(assemble) · Authority Levels ＋(surface existing) · Negotiation Limits ✓(truth)/△(employee view) · High-Value Approval ✓(guard)/⚠(seam P0-A) · Client Decision Protection ✓(⚠seam P0-B) · Escalation Rules △ · Role-Based Permissions ✓ · Employee Policy Center △ · Sale-Specific Rules ✓(excluded areas, discount plan, pickup plan — needs assembly) · Pricing Policy ✓ · Hold/Reservation ✓(Item reserved + policy) · Pickup Policy ✓ · Policy Acknowledgment ✓ · Scenario Training ✎(content only) · Checkout Practice Mode ✎→＋ · Negotiation Practice ＋ · Escalation Training ＋ · AI Training Coach P2 · Ask-for-Help △ · Issue Category ✓ · Urgency ＋(enum) · Supporting Photo ＋ · Resolution Record ✓ · AI Policy Lookup P2 · POS Training Mode ✎(wording today) · Sample Cash Transaction ＋ · Discount Practice ＋ · Failed Payment Scenario ＋(content) · Pickup Practice ＋ · Checkout Readiness ＋ · Daily Team Brief ＋(assembly) · Preparation Brief △(AI exists; deterministic small) · Opening Brief ＋ · Employee Acknowledgment ＋ · AI Briefing Builder P2 · Definition of Done △ · Room Completion ✓ · Task Dependencies ✓ · End-of-Day Review ✓ · Carryover ✓ · Employee Time Tracking ✓ · Labor by Activity ✓ · Labor by Room ✓ · Labor Cost ✓ · Estimated vs Actual ✓ · Owner Labor ✓ · Role Performance History ↔ · Reliability Record △ · Training History △ · Manager Notes △(P1 w/ RLS) · AI Team Coach P2 · Team Availability ＋ · Backup Team ＋(view) · Skills Coverage ＋ · Availability Request ✎(no send flow — wording) · Staffing Gap Alert ＋ · Employee Document Vault ✓ · Required Doc Checklist ＋(operator-config) · Renewal Reminders ✓ · AI Admin Checklist P2 · Role-Based Privacy ✓ · AI Staffing Assistant P2 · AI Assignment Suggestions P2 · AI Labor Review P2(deterministic variance mostly covers) · AI Daily Briefing P2 · AI Scenario Coach P2 · AI Coverage Review → deterministic ＋(prefer non-AI).

## 38. STAFFING TRUTH MATRIX

| Function | Required? | Primary | Backup | Skill/Training | Authority | Software access | Gap | Support |
|---|---|---|---|---|---|---|---|---|
| ENTRY | when customers enter | ✕ none | ✕ | ✕ | ✕ | read sale ✓ | full | ＋ |
| CHECKOUT | when checkout_location set | ✕ | ✕ | ✕ | ✕ (no POS discount = implicit safety) | checkout page sale-team ✓ | full | ＋ |
| FLOOR | per zone | zone assignee (prep only) | ✕ | ✕ | ✕ | zone/task read ✓ | sale-day | ＋ |
| HIGH VALUE | when HV items exist | ✕ | ✕ | ✕ | price guard ✓ (⚠P0-A), custody chain ✓ | controlled_location hidden ✓ | coverage | ＋ |
| NEGOTIATION | policy-dependent | ✕ | ✕ | ✕ | Company/Item policy ✓ (operator-facing) | offers operator/creator | employee view | △ |
| FURNITURE | per pickup requirements | ✕ | ✕ | ✕ | pickup rules ✓ | pickup_requirements ✓ | coverage | ＋ |
| PICKUP | when sold items pending | ✕ | ✕ | ✕ | release truth ✓ | Item pickup fields ✓ | coverage | ＋ |
| CUSTOMER ISSUES | always | ✕ | ✕ | ✕ | SaleIssue ✓ | issue create ✓ | owner | △ |
| FLOOR RECOVERY | during sale | ✕ | ✕ | ✕ | sale_day_status ✓ | zone update ✓ | owner | ＋ |

## 39. AUTHORITY MATRIX

| Decision | Employee may decide? | Manager approval? | Client authority? | Software guard? | Escalation | Support |
|---|---|---|---|---|---|---|
| PRICE CHANGE (ordinary) | yes (RLS permits update) | no | no | research guard ✓ (function) | research flag | ✓⚠ |
| PRICE CHANGE (HIGH_VALUE) | NO | operator required | no | ✓ changeItemPrice ⚠ bypass seam | HELP→operator | ✓+P0-A |
| DISCOUNT | no POS capability | policy-dependent | no | no engine (implicit) | policy (recorded) | △ |
| OFFER | record only; accept = operator path | operator | no | OffersPanel no guard surface | operator | △ |
| HOLD | Item.status reserved (RLS permits) | — | no | none | — | △ |
| PRESALE | pre_sale_allowed operator flag ✓ | operator | no | flag gate ✓ | operator | ✓ |
| PAYMENT ISSUE | no | operator | no | payment truth separate ✓ | HELP | △(content) |
| REFUND | ✕ absent (manual) | operator | n/a | none | — | ✎ |
| HIGH-VALUE ACTION (custody/release) | no | operator | no | custody chain + field RLS ✓ | operator | ✓ |
| CLIENT INSTRUCTION | NO | operator approval | SaleAuthority required ✓ | request-state ✓ ⚠ seam | SaleIssue→Decision | ✓+P0-B |
| PICKUP | record truth only | scheduled rules | no | pickup_completed_at independent ✓ | — | ✓ |
| RELEASE | per paid truth | operator for HV | no | field RLS ✓ | — | ✓ |
| FOUND VALUABLE | route/record ✓ | client/specialist routing | client decision for keeps ✓ | SaleDiscovery custody ✓ | decision link ✓ | ✓ |
| SAFETY/SECURITY | STOP ✓ (anyone may halt) | operator | n/a | SaleIssue safety category ✓ | operator | △(incident boundary §85) |

## 40. EMPLOYEE VIEW MATRIX

| Information | Should see | Currently sees | Privacy risk | Source |
|---|---|---|---|---|
| MY ROLE | yes | ✕ | low | ＋assignment |
| MY TASKS | yes | ✓ (sale-scoped lists; no personal filter) | low | SaleTask |
| MY ZONE | yes | ✓ (zones readable) | low | prep_zones |
| MY DEADLINES | yes | △ (due dates visible unfiltered) | low | SaleTask.due_date |
| SALE POLICIES | yes | △ (MyPolicies acks only, not content-first) | low | BusinessDocument |
| PRICING RULES | guidance yes | ✕ (operator-only surfaces) | medium if raw | Company/Item truth |
| PICKUP RULES | yes | ✓ (sale pickup_plan readable) | low | EstateSale/Item |
| CLIENT DECISIONS | controlling yes | ✓ (RLS read) | low | SaleClientDecision |
| RESTRICTED AREAS | yes | ✓ (excluded_areas team-safe) | low | EstateSale |
| HIGH-VALUE INFO | existence yes, location NO | ✓ (controlled_location hidden) | HIGH | field RLS ✓ |
| COMPANY ECONOMICS | no | ✕ (operator-only) | HIGH | deal/commission RLS ✓ |
| OTHER EMPLOYEE RECORDS | no | ✕ (operator-only) | HIGH | TeamMember RLS ✓ |
| MANAGER NOTES | no | n/a (none exist) | HIGH | ＋ with RLS if built |

## 41. TRAINING MATRIX

| Area | Content | Interactive | Practice safe | Acknowledged | History | Support |
|---|---|---|---|---|---|---|
| CHECKOUT | ✕ | ✕ | ✕ | policy-doc possible | ✕ | ＋ |
| CASH | ✕ | ✕ | ✕ | ✕ | ✕ | ＋ |
| DISCOUNT | ✕ (policy truth exists) | ✕ | ✕ | ✕ | ✕ | ＋ |
| NEGOTIATION | △ policy truth | ✕ | ✕ | ✕ | ✕ | ＋ |
| FAILED PAYMENT | ✕ | ✕ | n/a | ✕ | ✕ | ＋(content) |
| PICKUP | △ procedure truth | ✕ | ✕ | ✕ | ✕ | ＋ |
| RESTRICTED AREA | ✓ excluded-areas truth | ✕ | n/a | ✕ | ✕ | △ |
| FOUND VALUABLES | ✓ (SaleDiscovery flow) | ✕ | n/a | ✕ | ✕ | △ |
| SAFETY | △ (issues/policies) | ✕ | n/a | ✕ | ✕ | ＋ |
| CUSTOMER CONFLICT | ✕ | ✕ | ✕ | ✕ | ✕ | ＋ |

## 42. LABOR MATRIX

| Dimension | Planned? | Actual? | Cost? | Employee? | Room? | Activity? | Support |
|---|---|---|---|---|---|---|---|
| Hours | ✓ deal labor_estimates | ✓ LaborEntry | ✓ rate×hours | ✓ member/user | ✓ prep_zone | ✓ category | ✓✓ |
| Owner time | ✓ (is_owner_time flag, excluded from cash) | ✓ | reported hours only | ✓ | ✓ | ✓ | ✓ |
| Variance | ✓ Ch4 comparison | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 43. SALE A → SALE B TEAM TRACE

Sale A facts recorded today: staging + checkout LaborEntry hours ✓, checkout-zone assignment ✗ (no responsibility record — only tasks/zone prep assignee), training completion ✗, offer/issue handling history ✓ (Activity/SaleIssue), labor budget vs actual ✓. Sale B lookup: **broken seams** — no training history, no availability, no preferred role, no assignment history view (SaleTask completions exist but unqueryable as "who ran checkout before"). Factual-history recommendation is achievable by P1 (derive from SaleTask/assignment/LaborEntry; no performance score).

## 44. HELP FLOW TRACE

employee unpriced HV item → HELP button ✗ (no button; must use SaleIssuesPanel form) → PRICING ✓ (category exists) → URGENT ✗ (no urgency) → photo ✗ (no field) → note ✓ → manager receives △ (issue owner exists; no requester field/no notification) → manager reviews ✓ (item/research readable) → resolution ✓ (with task/decision links) → **employee sees answer ✗ (no requester/answer loop)** → preserved ✓. Broken seams: help-first entry, urgency, photo, requester + answer notification.

## 45. AUTHORITY TRACE (large discount on HIGH_VALUE item)

Role → no per-employee limit (company policy generic) → Item.negotiation_override ✓ truth → HIGH_VALUE rule ✓ in changeItemPrice → software permission: **⚠ P0-A direct-update bypass** → manager approval ✓ required in function path → price/Offer history ✓ (Activity via function). **Verdict: consequence control holds ONLY through the function seam; the bypass is genuine and must be closed (P0-A).**

## 46. DISPUTED CLIENT INSTRUCTION TRACE

Family: "remove that item" → employee view: SaleAuthority readable ✓ → DISPUTED authority: request-state ✓ protects → STOP/ESCALATE: △ (doctrine + SaleIssue path, no explicit employee stop instruction surface) → SaleIssue→SaleClientDecision ✓ → resolution ✓. **Employee cannot manufacture authorization through the intended path ✓; direct-write seam P0-B is the exception.**

## 47. TRAINING SAFETY TRACE

No practice mode exists → **trivially safe today and trivially unfulfilled**. Any future practice mode must be hard-isolated: no Order, no Transaction, no payment, no Item status write, no receipt, no pickup state — verified by design requirement, not yet by tests (no automated tests exist in the repo — noted).

## 48. DAILY BRIEF TRACE

Canonical data CAN assemble: employee→sale (sale_team RLS ✓) → responsibility ＋ (missing) → tasks ✓ → deadlines ✓ → policies ✓ (doc vault) → client decisions ✓ → high-value/restricted ✓ (safe subsets) → pickup ✓ → blockers ✓ (issues/blocked tasks). **No re-entry required — only assembly is missing.** Deterministic preferred; AI prep brief already exists (operator-facing).

## 49. PRODUCT DOCTRINES (assessment)

Right person/right responsibility/right authority/right information: **architecture supports the information and authority truth; the person↔responsibility link is the missing keystone.** "I don't know is safe": △ (escalation exists, not help-first). Owner less necessary: △ (authority truth + guards exist; employee surface missing). AI never manages people: ✓ (no AI in authority path). Labor in hours not days ✓. Owner labor real ✓. Responsibility ≠ permission ≠ authority ≠ client authority: ✓ preserved in truth, △ in employee visibility.

## 50. STAFFING LEARNING LOOP

REQUIREMENTS→PLAN ＋gap · PLAN→ASSIGN ＋gap · ASSIGN→BRIEF ＋gap · BRIEF→WORK ✓ · WORK→ESCALATE △ · ESCALATE→COMPLETE ✓ · COMPLETE→LABOR ✓ · LABOR→REVIEW ✓(EOD/economics) · REVIEW→TRAIN ＋gap · TRAIN→BETTER ASSIGNMENT ＋gap. Broken transitions concentrate in the plan/assign/brief/train segment.

## 51. RECOMMENDED IMPLEMENTATION SEQUENCE (DO NOT IMPLEMENT)

1. **P0-A/P0-B guard enforcement** (authority integrity before any employee-facing surface).
2. SaleStaffAssignment + required-functions + gap detection (deterministic).
3. Employee My Sale Day view + Policy Center + Authority Matrix page (surface-only).
4. Ask-for-Help: SaleIssue urgency/photo/requester + answer loop.
5. TeamMember additive: preferred roles, availability, skills provenance, manager notes (operator-only RLS), training history via document/acknowledgment pattern.
6. Skills-coverage matrix + staffing-gap alert + bench view (deterministic).
7. Definition of done + deterministic opening/eod brief.
8. POS practice mode (or permanent book wording change).
9. P2 AI items last, only if deterministic foundations landed.

## 52. PRE-LAUNCH DEPENDENCIES (carried, relevant only)

- Cross-company RLS manual verification (all operator-scoped team/labor/ack records depend on it).
- Public directory / operator-profile PII exposure (employee-adjacent data).
- Chapter 16 authority dependencies: P0-A bypass closure is now a Chapter 19 blocker-class finding.
- Customer.io: no Chapter 19 flow touches it (availability requests would — none exists).
- No automated tests exist in the repository — practice-mode and guard fixes should ship with tests when built.

## 53. CERTIFICATION

**GO WITH CONDITIONS.**

The labor, acknowledgment, issue, authority-truth, and zone-responsibility architecture is genuinely strong and reused without duplication. Certification of Chapter 19 as written is conditioned on: (1) closing the two P0 authority seams (P0-A HIGH_VALUE direct-update bypass, P0-B client-decision direct-write), (2) building the sale-day responsibility/assignment layer with deterministic gap detection, (3) the employee-facing view/policy/authority surfaces, and (4) either a side-effect-free POS practice mode or corrected book wording. Until then, book wording must change for: skills assessment framing, POS practice, scenario training, availability requests, AI team features.

**AUDIT STOPPED HERE — NOTHING BUILT. Awaiting explicit authorization before any Chapter 19 P1 implementation. Chapter 20 not started.**