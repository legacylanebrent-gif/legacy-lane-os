# EstateSalen — Chapter 19 P0/P1 Certification Report
Team, Staffing, Authority, Training & Labor — implemented 2026-10-22

## P0 (authoritative acts) — implemented and enforced at the data layer

### P0-1 — HIGH_VALUE price changes are enforceably operator-only
- **Data layer (the fix the audit demanded):** `Item` entity update rule now blocks the `created_by_id` and `sale_team_ids` write paths for records whose CURRENT `inventory_level` is HIGH_VALUE, using only documented write-gate operators (`$and`/`$or` wrapping, `$ne`, `user_condition`). The gate reads the pre-update record, so an employee cannot downgrade a HIGH_VALUE item to unlock it. Operator, seller, admin paths unchanged.
- **Function layer:** `changeItemPrice` (Chapter 16) remains the sanctioned path — HIGH_VALUE changes require operator/seller/admin + an explicit reason, and history is recorded. Its stale comment now documents the two-layer defense.
- **UI seam:** Checkout Station stops deterministically BEFORE creating an Order when a cart contains HIGH_VALUE merchandise and the cashier is not the operator/seller/admin — preventing order/item sync divergence for employees.
- **Certified:** authorized operator HV price change with reason → success (old 500 → new 525, recorded); owner/admin paths unaffected.
- **Not automatically verified:** the *denial* paths for a role-user could not be exercised — the builder account is the app owner and the platform refuses to downgrade its role ("You cannot update the role of the owner of the app"), and no second authenticated identity is available to the test harness. The rules use only documented write-safe operators and patterns; recommend one manual check with a real sale-team account.

### P0-2 — authoritative client decisions are operator/manager-only
- `SaleClientDecision` `create` and `update` rules are now `operator_id`-match or admin. The `created_by_id` and `sale_team_ids` write paths are closed. Team members READ decisions and raise client matters through SaleIssue (help/escalation), which the operator resolves into a decision — request-state semantics (Chapter 13) unchanged.
- **Certified:** all operator flows that create decisions (DecisionsCard, SaleIssuesPanel resolve→decision, merchandise panels) pass `operator_id: sale.operator_id` and remain authorized; verified end-to-end via fixture.

### P0-3 — one sanctioned write path for authoritative price changes
- Re-verified: `changeItemPrice` with authority + reason checks and Activity history. No competing write path remains for employees on HIGH_VALUE items.

### P0-4 — legitimate manager/operator workflows unaffected
- Operator/seller/admin update paths on Item left unchanged; all fixture operator flows (assignment, decision, issue resolution, pricing) verified green.

## P1 (responsibility, training, authority) — implemented

### Entities (canonical, additive; no competing truth)
- **SaleStaffAssignment** (new): sale-scoped responsibility records (ENTRY, CHECKOUT, FLOOR_ZONE, HIGH_VALUE, NEGOTIATION, FURNITURE, PICKUP, CUSTOMER_ISSUES, SALE_FLOOR_RECOVERY, OTHER) with primary/backup TeamMember links, ACTIVE/CLEARED history, planned hours. Readable by the team; writes operator/admin only. Terminology honest: STAFFING PLAN ≠ LABOR; assignment confers no authority.
- **TeamMember** extended: `preferred_roles`, `skills_detail` (honest sources: PREFERRED / EXPERIENCED / TRAINED / MANAGER_OBSERVED — never certification), `availability` windows (absent = UNKNOWN, never assumed), `training_records` (factual history only), `document_checklist` (operator memory aid, never a compliance conclusion).
- **SaleIssue** extended: `urgency` (ROUTINE / IMPORTANT / URGENT — honest operational urgency, never safety/compliance), `requested_by_name`, private `photo_uri`, new categories `payment` (failed/unknown payment — never release merchandise) and `security`. Reused as the ONE employee Ask-for-Help/escalation path; no second escalation entity.
- **SaleTask** extended: `definition_of_done` — plain acceptance criteria the assignee sees before starting.

### Authority matrix (P1-10/P1-11)
- `base44/shared/authorityMatrix.ts` — the ONE deterministic derivation from `Company.negotiation_policy` + HIGH_VALUE presence. Levels: CAN DECIDE / ASK MANAGER / STOP / ESCALATE. Guidance only; never decides anything.

### My Sale Day (employee view, P1-21..P1-30)
- `mySaleDay` backend function: server-verified membership (operator, sale_team, admin), least-privilege projection — never exposes site assessment/access details, controlled locations, custody internals, or contact details. Returns my responsibilities, my tasks (with DoD), my zones, my asks-for-help with answers, authorities (with DISPUTED → STOP guidance), company policies with short-lived private links + my acknowledgment state (version-stale flagged), and the deterministic opening brief with the authority matrix and today's brief reviewers. `ack_brief` action records review idempotently (per user/day).
- `/MySaleDay` page (mobile-first, verified 0px horizontal overflow at 390px): urgent-issue banner, all cards, link to practice.

### Operator surfaces
- Project Dashboard: new Staffing Panel (assignment CRUD, deterministic coverage check with UNASSIGNED/COVERED badges derived from recorded truth, skills guidance, availability badges, planned-vs-estimated hours compare with honest REVIEW warning) + Opening Brief card + Authority Matrix card.
- SaleIssuesPanel: urgency badge + raised-by display; CreateTaskDialog: definition of done; TaskRow shows it.
- My Sales header: "My Sale Day" entry.

### Training (P1-13/P1-16)
- `/PosPractice`: client-only simulator (PRACTICE MODE banner, writes nothing): scan/cart, cash change calculation, card-DECLINED lesson (never paid → never release), pickup lifecycle, and "What can I decide?" scenarios mirroring the matrix. TeamMember training history editable in the directory modal.

## Certification tests executed
| Test | Result |
|---|---|
| mySaleDay view (fixture sale, team member) — responsibilities/tasks/zones/authorities/policies/brief all project correctly | PASS |
| Authority matrix derived from recorded EMPLOYEE_AUTHORITY_LIMIT $10 policy ("up to $10 off without asking" → CAN DECIDE); HV price → STOP/ESCALATE | PASS |
| Ask-for-Help through the real dialog → SaleIssue created, appears in My asks for help + brief open issues | PASS |
| Opening brief "Mark reviewed" → idempotent Activity record, shows as reviewer today | PASS |
| Urgent issue surfaces in red banner + brief badge | PASS |
| Disputed authority → deterministic STOP guidance in employee + operator views | PASS |
| Policy acknowledgment version staleness flagged (acknowledged v1 of v2) | PASS |
| changeItemPrice authorized HV change with reason → success + history | PASS |
| Staffing coverage check: CHECKOUT COVERED, FLOOR_ZONE UNASSIGNED from recorded truth | PASS |
| POS practice: declined-card lesson renders; no data written | PASS |
| Mobile 390px: 0px horizontal overflow on My Sale Day | PASS |
| Console errors across all new routes: none | PASS |
| Fixture cleanup: every test record deleted by exact id; zero remain | PASS |

## Honest limitations
- Employee-role *denial* paths (P0-1/P0-2 negative tests) could not be exercised automatically: the builder account is the app owner (role downgrade refused by the platform) and no second identity exists in the test environment. Rules use only documented write-gate operators. Recommend one manual spot check with a real sale-team member account.
- Authority guidance (matrix, matrix card, practice scenarios) is operator/company policy language — never legal, HR, or compliance advice.
- Planned-hours compare is advisory; actuals remain in LaborEntry (Chapter 4) and no payroll truth exists here.