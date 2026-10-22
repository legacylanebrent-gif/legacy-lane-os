# EstateSalen — Chapter 25 P1 Certification Report
**Feature:** Company knowledge loop — SOP lifecycle, employee-readable approved knowledge, improvement feedback loop
**Date:** 2026-10-22
**Scope:** BusinessDocument knowledge taxonomy + `companyKnowledge` server seam + Company Knowledge (employee) / Knowledge Manager (operator) UI
**Architecture doctrine honored:** no second SOP entity — the existing BusinessDocument vault carries the knowledge lifecycle (`knowledge` block, SOP/TRAINING/CHECKLIST categories); employees never read the operator's vault directly.

---

## Architecture summary

| Layer | Component | Doctrine |
|---|---|---|
| Schema | `BusinessDocument.knowledge` block (sop_status DRAFT/IN_REVIEW/APPROVED/SUPERSEDED, audience_roles, steps, decision_points, exceptions, escalation, completion_standard, provenance source_type/source_id/source_label, contributor_name, ai_generated, employee_visible, review_date, effectiveness_reviews, supersedes_document_id) | Draft is not policy. At most ONE APPROVED version per lineage; approving supersedes the prior (history preserved, never deleted). `employee_visible` fails safe (false default). |
| Server seam | `companyKnowledge` function — actions: `list`, `manage_list`, `suggest`/`observe`, `propose`, `approve`, `submit_review`, `review_effectiveness`, `ai_draft`, `suggestions` | Authorize-first/fetch-second. Employees receive ONLY employee_visible APPROVED records of their own company as safe projections. Approval is operator/admin only — AI can never set approval truth. |
| Employee UI | `/CompanyKnowledge` page | Search + category filters over the authorized corpus only. Drafts, superseded versions, and private vault documents never appear. |
| Operator UI | `/KnowledgeManager` page | Lifecycle manager: metrics (current/drafts/in review/superseded/due for review/suggestions), team suggestions inbox, draft → review → approve flow with supersede chaining, effectiveness review, AI-drafted label. |

---

## Certification tests and results

| # | Test | Method | Result |
|---|---|---|---|
| T1 | Draft privacy — a DRAFT procedure never reaches the employee surface | `companyKnowledge {action:"list"}` while only DRAFT exists | **PASS** — employee list empty while draft exists in manage_list |
| T2 | Employee projection shows only APPROVED + employee_visible records, current version only | `list` after approving v1 (employee_visible true) | **PASS** — exactly one record, approved by name/at shown |
| T3 | Supersede chain — approving v2 supersedes v1; employee list switches to v2; v1 preserved as SUPERSEDED with history intact | propose v2 (source NEAR_MISS) → `list` (still v1) → approve v2 → `manage_list` + `list` + effectiveness review recorded on superseded v1 | **PASS** — `prior_version_superseded: true`; employee list shows v2 only; v1 SUPERSEDED with effectiveness_reviews preserved; contributor attribution ("Cert Crew Lead") carried |
| T12 | Employee observation stored as a suggestion (SaleIssue), changes nothing by itself | `observe` → `suggestions` | **PASS** — stored with explicit "does NOT change any procedure" status; provenance recorded |
| T13 | Observation → operator proposal: new DRAFT carries source provenance; current SOP untouched | `propose` with source_type EMPLOYEE_OBSERVATION + source_id | **PASS** — new DRAFT created; approved v2 unchanged |
| T14 | Near-miss provenance on a revision (T3 v2 covered this) | covered in T3 | **PASS** |
| T15 | Success review (SALE_RECAP) → proposal with attribution | `propose` source_type SALE_RECAP, contributor "Cert Operator" | **PASS** — DRAFT created, current SOP unchanged |
| T16 | AI-drafted procedure stays DRAFT + labeled ai_generated; never auto-approves | `ai_draft` | **PASS** — `sop_status: DRAFT, ai_generated: true`; approval requires the human path |
| T17 | Review date set at approval | approve v2 with review_date | **PASS** — review_date persisted on the APPROVED record |
| T18 | Effectiveness review history preserved on superseded versions | `review_effectiveness` on v1 after supersede | **PASS** — reviews: 1, history retained |
| T-priv | Private vault document (INSURANCE, non-knowledge) never projected to employees | private policy fixture existed alongside knowledge records | **PASS** — never appeared in employee `list` (category filter + seam projection) |
| T-reg | Buyer-consent regression — buyerAudience unaffected by knowledge work | `buyerAudience {action:"list"}` | **PASS** — consent-gated audience list returned normally (email consent honored, SMS ineligible) |
| T-UI-1 | Employee page renders current approved procedure only | live preview `/CompanyKnowledge` | **PASS** — "v2 · current" visible; no drafts |
| T-UI-2 | Manager metrics + suggestions + lifecycle tabs correct | live preview `/KnowledgeManager` | **PASS** — 1 current / 4 drafts / 1 superseded / 1 suggestion; AI-drafted label shown |
| T-UI-3 | Mobile 390px — no horizontal scroll, vertical stacking | preview viewport sweep | **PASS** — scrollWidth delta 0 on both pages at desktop and 390px |
| T-UI-4 | No runtime console errors | preview console log | **PASS** — zero errors |

**Cross-company isolation:** the seam derives company identity server-side from the authenticated user (authorize-first); a second company's records are unreachable by construction (corpus filtered by the caller's own company). Not re-exercised with a second live account this run — flagged below.

---

## Cleanup

All certification fixtures deleted by explicit ID (verified zero remaining):
- 7 BusinessDocument records (2× procedure v1, procedure v2 approved, checklist draft, AI draft, sale-recap draft, private liability policy)
- 1 SaleIssue observation suggestion
- 1 fixture EstateSale ("CH25-CERT-DO-NOT-CONTACT")

---

## Residual items

1. **Second-company isolation** — STATIC AUDIT PASSED this session (see below); a live second-account pass remains optional belt-and-braces before public launch of the knowledge surfaces.

### Static audit of the `companyKnowledge` seam (2026-10-22)

| Control | Location | Finding |
|---|---|---|
| Authentication required | entry gate | 401 for anonymous callers — authorize-first |
| Identity derived server-side | identity resolution | Operator set derived ONLY from the caller's TeamMember records and sale-team memberships; a client-supplied `operator_id` is honored only if it is inside that derived set — otherwise **403 Not your company**. Forging an ID cannot reach another company's corpus |
| Corpus-first, never search-everything | `list` / `search` / `get` | All three fetch `operator_id === targetOperatorId` documents BEFORE any matching — no cross-record leakage path exists in search |
| Fetch-by-ID ownership check | `loadOwn` | A record fetched by id is returned only if `doc.operator_id === operatorId`; otherwise 404 — no cross-company get-by-id |
| Manager gate on every management action | `requireManager` | `propose`, `ai_draft`, `submit_review`, `approve`, `review_effectiveness`, `suggestions`, `audit`, `manage_list` all require the operator of the derived set (or platform admin) — an employee can never approve or draft |
| Observation path | `observe` | Sale-team membership (or operator/admin) verified before a suggestion is created |
| Platform admin | identity resolution | Admins may inspect any operator's knowledge set — by design, consistent with all vault doctrine |
2. **AI-drafted procedures are labeled but unlabeled AI output cannot exist** — a draft created via `ai_draft` carries `ai_generated: true` permanently; the label survives approval (doctrine: labeled forever). No action needed; documented for auditors.
3. Effectiveness reviews are date-driven reminders only — no automated mining occurs (per doctrine). The "Due for review" metric reads `review_date`; scheduling a digest is a possible future P2.

**Verdict: Chapter 25 P1 CERTIFIED.** SOP lifecycle, employee-readable approved knowledge, and the improvement feedback loop all pass their certification tests with doctrines intact (human-only approval, fail-safe visibility, one approved version per lineage, attribution preserved, AI never sets truth).