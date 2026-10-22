# CHAPTER 23 — ESTATESALEN CROSS-AUDIT REPORT
## Reconciliation, Settlement, Profitability & Business Learning

Date: 2026-10-22 · Mode: AUDIT ONLY — no code changed, no production data touched, no payments initiated.

Audited surfaces: SettlementStatement.jsx, SaleCloseout.jsx, saleEconomicsModel.js, SaleEconomicsPanel.jsx, SaleConversionPipeline.jsonc, Expense.jsonc, LaborEntry, CashSession, PaymentAttempt, Order, SaleRefund, posPayment.ts, wix-payments-webhook, resolvePaymentAttempt, MoneyHealthCard, CashControlPanel, SaleOrdersPanel, SaleRecap, TenMoreReflection, EstateSale (transition block), SaleClientDecision, SaleIssue, SaleScope, SaleProposal/SaleAgreement/accepted_terms_snapshot, BusinessDocument, OperatorDashboard/SaleStatistics/ActualRevenue, Chapter 21/22 reports.

---

## EXECUTIVE SUMMARY

Coverage: of the 155 audit items, roughly **118 are already existing, supported, or deliberately covered by existing architecture** (≈76%). Another **~14 are the smallest P1 set**, **~13 are P2**, **~10 are LATER**, and the rest are book/printable or explicit do-not-build.

Strongest existing architecture:
- **Canonical financial model** (`saleEconomicsModel.js`): GROSS ≠ COMPANY REVENUE ≠ CONTRIBUTION, enforced in one file consumed by settlement, closeout and economics panel.
- **Authorization provenance**: every client-facing deduction is structurally derived (fee + authorized SaleClientDecision charges + decision-linked reimbursable expenses). There is NO free-form deduction line anywhere — an arbitrary client deduction cannot be created.
- **Chapter 21 payment truth**: immutable PaymentAttempt, webhook/merchant-verification shared resolution path, duplicate-payment preservation, cash controls with honest variance.

Largest genuine gaps (the four P0s):
1. **Refunds are absent from settlement math** — SaleRefund is not read by SettlementStatement, SaleCloseout or the economics model. Refunded money can leave client balance overstated.
2. **Settlement finalize and project close have no payment-truth gates** — UNKNOWN/PROCESSING attempts, open payment exceptions, open cash variance, and Transition Completion do not block.
3. **No transaction↔payment reconciliation difference surface** — Item-based gross and Order-based money are both canonical but are never compared.
4. **Gross mislabeled as revenue** in operator-facing surfaces (OperatorDashboard sums `actual_revenue` — which stores GROSS — as "revenue"; SettlementStatement card says "Gross Revenue").

Financial-integrity risks: settlement can currently finalize while payment truth is unresolved; project close does not consult Transition Completion; a refunded online order that stays `status: 'sold'` continues to inflate gross.

---

## RECONCILIATION (§1, §5, §6)

- Recorded merchandise transactions: `saleGross()` = Σ(`sold_price || price`) over Items `status:'sold'` — ✓ canonical, single formula.
- Actual resolved payment truth: Order (`status:'paid'` written only on webhook/verified completion) + PaymentAttempt APPROVED + CashSession physical counts — ✓ exists (Chapter 21).
- **✕ NOT SUPPORTED: a surface that compares the two.** No view computes `Σ Order.total (paid) + cash-sale truth` vs `Σ sold Item prices` and shows the difference. The raw inputs exist; the comparison does not. Classify: ＋ BUILD (P1 — reconciliation dashboard derived at read time; no new entity needed per §116).
- Unresolved transactions: MoneyHealthCard surfaces PROCESSING/UNKNOWN attempts, resolved-failed attempts, and open payment issues (duplicate payment, payment/item conflict) — ✓ existing, but only on the LIVE SALE surface; **settlement and closeout never load PaymentAttempt/SaleIssue-payment** (△ gap feeds P0 #2).

## PAYMENT METHOD BREAKDOWN (§2)

- Order.payment_method ('cash' | 'online' | …) and Item.payment_method_used — ✓ recorded. CashControlPanel splits cash Orders/Transactions; SaleOrdersPanel filters by method; Item payment methods enumerated (cash, check, credit_card, venmo, paypal, zelle, cashapp, square, other). ✓ SUPPORTED for cash/card/other.
- Mixed/split tenders: ✕ NOT SUPPORTED (one method per Order/Item). Honest absence — LATER if ever. Settlement "reconciled proceeds by method" view: ✕ absent (P1 part of reconciliation dashboard).

## PROCESSOR / CASH (§3, §4)

- Customer charge ↔ PaymentAttempt ↔ Order: ✓ via provider_session_id / provider_order_id / provider_payment_ref; webhook is the only APPROVED writer (shared posPayment path with merchant verification). ✓ SUPPORTED.
- Processor fee: webhook passes NO fee; `fee_amount` stays null = UNKNOWN. Operator enters processing fees as an Expense (`processing_fees`). ✓ HONEST UNKNOWN — never estimated-as-actual. (§29 PASS.)
- Deposit/payout data: ✕ EstateSalen receives no payout data. LATER (§30, §32) — correctly not inferred from charges.
- Cash (§4): opening bank + cash Orders/Transactions − cash refunds − drops + signed adjustments = expected; closing count is the human's number; variance never auto-zeroed (only < $0.005 rounding resolved); variance_status OPEN→EXPLAINED→RESOLVED with note. ✓ REUSED — DO NOT REBUILD.

## DIFFERENCES / CORRECTIONS (§7–§10)

- Difference/investigation/cause/resolution: ✓ SaleIssue (category `payment`, OPEN→RESOLVED with resolution text) and CashSession.variance_note already carry this; no new entity needed.
- Correction record (§8): append-only patterns dominate (PaymentAttempt immutable; payout_records append; custody/release append; SaleScope version snapshots). Cash movements append with who/when/reason. ✓ adequate. One caveat: payout_records and Item edits are mutable-by-update (no history array) — acceptable per platform, flagged.
- Materiality review (§9): CashSession supports EXPLAINED/RESOLVED with note; no threshold invented. ✓.
- AI reconciliation assistant (§10): ✕ absent. P2.

## AGREEMENT-CONTROLLED MATH (§16, §40, §41)

- Chain: SaleProposal → acceptance metadata (`commercial_terms_accepted_at/_by/_source`, `accepted_proposal_id`, `accepted_terms_snapshot`) → deal canonical fields (commission_rate, minimum_fee) → SaleAgreement (versioned) → SaleClientDecision authorized changes → SettlementStatement. ✓ architecture EXISTS (Chapter 9).
- **△ GAP: settlement reads the deal's LIVE `commission_rate`/`minimum_fee`.** `accepted_terms_snapshot` is stored but never compared. An operator editing the deal after acceptance silently changes settlement math with no warning. Chapter 9 deliberately made the deal canonical, but the book's "no silent origin from mutable current defaults" is not satisfied by a warning. Classify: ＋ P1 — deterministic AGREEMENT COMPARISON alert (settlement readiness blocker when live terms ≠ accepted snapshot without a later authorized change/decision).
- Financial change history (§41): SaleClientDecision.history (append, last controls) ✓; SaleScope version snapshots ✓; minimum-fee explanation surfaced on statement ✓.

## EXPENSES (§17–§26, §139)

| Aspect | Finding |
|---|---|
| Responsibility (§24) | △ PARTIAL: `is_reimbursable` distinguishes client-chargeable candidates, but there is no explicit COMPANY/CLIENT/OTHER field; an Expense is company-cost by default and client-facing only via authorized decision. Truthful equivalent — ENHANCE (P1: add `responsibility` display derived from decision link; do not invent a third ledger). |
| Authorization (§17, §20, §25) | ✓ SaleClientDecision with `related_expense_id` (current_decision 'authorized') is the ONLY basis for a client deduction; unauthorized marked-reimbursables surface AUTHORIZATION NEEDED and never reduce proceeds. AuthorizeExpenseDialog writes the decision. P0-candidate §21 ("arbitrary deduction") DOES NOT EXIST. |
| Company expenses (§18) | ✓ everything not decision-linked is company cost in `directCosts`. |
| Third-party providers (§19) | ✓ Chapter 22 Cleanout/Donation carry provider_relationship (CLIENT_HIRED/COMPANY_HIRED/REFERRAL_INTRODUCTION), payment_responsibility, invoice_to. Provider invoices are NOT auto-expenses/deductions — informational only unless the operator records an Expense AND the client authorizes. PASS by design. |
| Categories (§22, §26) | ✓ 18 categories incl. advertising, labor_wages, dumpster_disposal, processing_fees, transport; grouped in expenseByGroup; overhead lives on BusinessExpense, not here. No double counting: labor_wages excluded when LaborEntry supplies hours (cashLaborTotal adds wage lines separately, labeled "no hours tracked"). |
| Receipts (§23) | ✓ `receipt_url` private storage URI, signed-URL viewing, operator/team RLS; "receipt on file" surfaced on statement. |

## FINANCIAL WATERFALL (§13, §14, §35–§37)

Actual implemented waterfall (deterministic, no free lines):

```
GROSS MERCHANDISE SALES        = Σ(sold_price || price) for Items status='sold'
  − company fee                = MAX(gross × commission_rate%, minimum_fee)
  − authorized service charges = Σ SaleClientDecision financial, authorized, charge_amount>0, no related_expense_id
  − authorized reimbursables  = Σ Expense.is_reimbursable linked to authorized decision
  = NET DUE TO CLIENT
  − payout_records Σ           = TOTAL PAID TO CLIENT
  = REMAINING BALANCE (client)
```
✓ Supported. **Missing from the waterfall: REFUNDS (P0 #1) and legitimate transaction adjustments** — there is no ± adjustments stage; refunds should enter as a deduction with SaleRefund provenance. §14's "reconciled sale proceeds" is not yet implemented (see P0 #3).

## SETTLEMENT STATEMENT (§33, §34, §38)

- ✓ Existing builder generates from canonical records (sold items, decisions, expenses, payouts); plain-language line items with authorization byline and dates; minimum-fee explanation in client words; "Gross Revenue" card label is a MISLABEL (should read Gross Merchandise Sales) — P0 #4a.
- §38 privacy: internal economics (labor cost, owner time, margins, acceptance score) deliberately excluded — SaleEconomicsPanel is badged "never shown to the client". ✓ PASS.
- §42 missing documentation: receipt "on file" shown; no required-document gate before finalize — △ minor (P2).

## SURPRISE DETECTOR (§39, §126, §147)

- ✓ PARTIALLY EXISTS, deterministically, no AI: unauthorized reimbursable expenses surface "AUTHORIZATION NEEDED — has NOT reduced proceeds". Because ALL deductions are structurally provenance-linked, a $450 cleanout charge cannot appear on the statement at all unless the operator records an authorized Expense+Decision — in which case it is eligible. The book's SURPRISE/REVIEW rule is therefore satisfied by construction for expenses.
- △ The one surprise surface still uncovered: settlement terms differing from the ACCEPTED snapshot (see Agreement-Comparison P1). Trace §147 outcome: an unauthorized charge cannot be added; an unaccepted commission-rate change currently would flow silently → BLOCK/REVIEW recommended (P1).

## CLIENT PAYMENT (§44–§47, §148)

- ✓ `payout_records` preserve amount, date, method, notes (reference goes in notes); `total_paid_to_client` running total; remaining-balance gate before finalize (finalize button only shows when remaining ≤ 0 — a real "fully paid before finalize" order).
- ✕ No contractual payment DUE DATE field (§45). ✕ No statement-DELIVERED vs payment-PAID distinction — `statement_generated` exists on payout rows but is never written true; no delivery acknowledgment (§47). Classify: ＋ small P1 (due date + delivered acknowledgment on the deal; no ClientPayment entity needed per §118).
- §148 trace: statement generated → [delivered ✕] → payout recorded → finalized (only when paid) — works except the delivered seam.

## FINANCIAL COMPLETION (§48, §49, §123, §140)

- Current de-facto definition: `settlement_finalized` && remaining ≤ 0. 
- **P0 #2: finalize has NO check for** UNKNOWN/PROCESSING PaymentAttempts, open payment-category SaleIssues, or OPEN cash variance. Financial completion is possible with unresolved required financial exceptions — exactly the §131 P0 pattern. Fix is a deterministic FINANCIAL COMPLETION READINESS check (reuse MoneyHealth logic; no new entity).
- §49 mapping: FINANCIAL COMPLETE (deal settlement) vs TRANSITION COMPLETE (sale.transition.transition_completed_at) are separate ✓ — but nothing joins them (see next).

## TRANSITION VS FINANCIAL COMPLETION / FULL PROJECT CLOSE (§49–§53, §149)

- ✓ Chapter 22 approveTransitionCompletion gates transition on obligations with endings; closeout blockers today: sold-awaiting-pickup, REVIEW decisions, settlement remaining, plus warnings (equipment pack-out, open tasks).
- **P0 #2b/P1: `Mark Project Complete` does NOT consult `sale.transition.transition_completed_at`** — a project can close with TRANSITION OPEN, violating "CLIENT PAID ≠ PROJECT CLOSED" and §149's expected trace (Financial YES + Transition NO must BLOCK). Classify: ＋ P1 close-gate addition (one deterministic check + human approval already present).
- §53 checklist dimensions: financial ✓(partial), merchandise ✓, client decisions ✓, provider ✓ (donation/cleanout status), equipment ✓; documentation △, access ✕ (below).

## CLOSING FILE (§54–§57)

- ✓ Records exist and stay attached (append-only doctrines); SaleExport provides export. ✕ No assembled dynamic closing-file INDEX. Classify: ↔ mostly covered; small enhancement (P2) — a links-only index, never a duplicate store.

## ACCESS CLOSEOUT (§58–§62)

- Client view permissions: SaleClientPermission / PageAccess exist (operator-managed).
- ✕ No key/lockbox/access-device return record; ✕ no temporary-access-closeout check gating project close; ✕ no sensitive-information review at close. site_assessment.access_details holds codes but has no "returned/closed" state. Classify: ＋ P1 (small, deterministic: access closeout checklist on closeout page; a keys/access block on the sale with who/when returned — no new entity beyond an additive block). Do NOT claim automatic expiration — none exists.

## RECORD RETENTION (§63–§67)

- ✕ No retention rules, reminders, legal hold, privacy review, AI records checklist. Records are simply never deleted (platform soft-delete). Classify: LATER (retention automation, legal hold) / P2 (retention reminder, AI checklist). Do not invent legal periods. §66 privacy review: ✕ P2.

## PROJECT ECONOMICS (§68–§72, §127, §142, §150)

All from `actualSaleEconomics()` + `projectedDealEconomics()`:

| Metric | Source/Formula | Supported? | Unknown handling |
|---|---|---|---|
| Gross | Σ sold Items | ✓ | items unsold = excluded |
| Company revenue | fee.applied + authorized charges | ✓ | — |
| Direct costs | Expense total + cash labor (hours×rate, non-owner) | ✓ | wage lines labeled |
| Contribution | revenue − direct costs | ✓ labeled "NOT net profit" | — |
| Margin | contribution / company revenue | ✕ not computed | P1 one-liner; denominator explicit |
| Fee | MAX(commission, minimum) | ✓ | — |
- §150 trace: fully traceable end-to-end in SaleEconomicsPanel. PASS except margin (add).

## OWNER TIME / LABOR ECONOMICS (§73–§81)

- ✓ Owner hours separate (`is_owner_time` — hours only, never cash); projected owner rows excluded from cash cost; owner callout rendered in economics panel; labor categories rich (17 keys incl. prep, staging, sale-day, pickup, closeout, travel). §75 owner labor BY ACTIVITY: ✓ via work_category.
- ✓ Total labor hours = Σ all entries; revenue & contribution per labor hour: formula trivially derivable but ✕ not surfaced (P1 small, with zero/unknown-hour guard: show "—" when hours = 0).
- §77 invisible labor: ✕ no deterministic "contribution depends on unpaid owner time" flag. △ P1-small (e.g., owner-hours > 50% of total or ownerHours>0 && cashLabor=0 → flag). Deterministic, no AI.

## ESTIMATED VS ACTUAL (§83, §84, §151, §143)

- ✓ Full projected-vs-actual table (gross, company revenue, labor hours, cash labor, advertising, supplies, transport, processing, other, contribution) with variance signs. Estimated gross RANGE preserved (low/high) + accepted snapshot.
- §86 scope-change vs bad estimate: △ PARTIAL — authorized financial decisions (additional charges) and SaleScope version history exist, but the variance table does not split "added authorized scope" from "estimate miss". Enhancement P1/P2: annotate variance with decision provenance when present.
- §87 estimate learning loop: ✕ no feedback into future consultation. Seam broken between recap/reflection and deal estimates → P2.

## PROJECT COMPARISON (§82, §88–§95, §153)

- ✕ No cross-project profitability comparison view (revenue/contribution/labor/owner-hours/margin side-by-side). Inputs all exist. ＋ P1 (read-only comparison table; CompareEstateSales page exists for listings, not economics).
- §88 benchmarks: ✕ insufficient normalized history — honest LATER.
- §89 complexity factors: ✓ structured (site_assessment, client_fit, prep zones, research flags) — persist ✓; retrospective complexity VIEW ✕ (P2).
- §90 merchandise performance: ✓ category breakdown on SaleRecap; connecting category mix to sold results derivable. ✓/△.
- §91 client complexity: ✓ ONLY operational client_fit dimensions (communication, authority clarity, scope stability…) — correctly not personality scoring. No delay/scope-change counts computed → △ P2.
- §93 scorecard / §94 difficulty / §95 schedule impact: ✕ absent as assembled views; data mostly present. P2. Avoid composite score per book.
- §153 ten-more trace: would_take_ten_more + why EXIST (SaleRecap + TenMoreReflection on closeout) ✓; the A-vs-B economics contrast is exactly the missing §82 view (P1).

## WOULD YOU WANT TEN MORE? (§97)

✓ EXISTING / SUPPORTED — SaleRecap.would_take_ten_more (YES/MAYBE/NO) + why + at, operator-owned, saved from closeout. No WITH CONDITIONS enum value (MAYBE covers it) — acceptable; do not churn the enum.

## CLIENT / REFERRAL / BUYER / PROVIDER / EMPLOYEE VALUE (§96, §98–§102)

- Client outcome (§98): ✓ Chapter 22 transition.objective.achieved (YES/PARTIAL/NO + note).
- Referral (§96, §99): ✓ deal referral_source_* + Contact + Referral Exchange architecture; no speculative dollar value ✓.
- Buyer growth (§100): ✓ Chapter 18 permission-based audience (BuyerAudience) — DO NOT REBUILD.
- Provider discovery (§101): ✓ Chapter 22 private performance notes (Donation/Cleanout performance_note) — never public reviews.
- Employee development (§102): ✓ TeamMember.training_records/skills_detail exist; ✕ no per-completed-project development note generator → P2 (operator-written note is enough; no auto-generation).

## POST-SALE REVIEW (§103, §104)

- ✓ SaleRecap (AI summary, historical_notes) + TenMoreReflection; generateSaleRecap upserts by sale_id.
- ✕ No structured five-minute review fields (what worked / didn't / surprised / change / team input). △ ENHANCE (P1-small): additive fields on SaleRecap; §105 AI interview P2.

## NEAR MISS / CORRECTIVE ACTION (§106–§110, §129, §152)

- △ PARTIAL: SaleIssue incident class records facts (what happened, immediate action) — a near-miss (guard caught it before loss) can be recorded as a non-incident issue with category + resolution, but there is NO near-miss flag, NO control-weakness category, NO corrective-action link to SOP/training. §152 trace currently ends at "issue resolved". Classify: ＋ P1-small additive (is_near_miss + control_weakness enum on SaleIssue; corrective action via linked SaleTask/PolicyAcknowledgment reuse — no new entity). §109–§110 AI review/alerts: P2.

## LESSONS / ESTIMATE LEARNING (§111–§115)

- §111 lessons attached to sale: △ historical_notes + issue resolutions + ten-more why ≈ equivalent; no dedicated lessons field → fold into P1 review fields.
- §112 SOP update suggestion: BusinessDocument/POLICY + MyPolicies exist; ✕ no suggestion workflow → P2 (recommendation/draft only).
- §113 training scenario: P2/LATER. §114 estimate adjustment: P2 (human-approved only). §115 AI business coach: Chapter 24+ / P2.

## AI (§10, §43, §67, §92, §105, §110, §115)

All AI reconciliation/settlement/records/interview/near-miss/coach/estimating capabilities: ✕ ABSENT — uniformly P2 or LATER. No AI is used in any settlement or reconciliation math today, which satisfies the book's "AI may not approve/force balance" by construction.

## READY-TO-USE TOOLS — all 34 classified

| # | Tool | Classification |
|---|---|---|
| 1 | Sale reconciliation worksheet | GENUINE SOFTWARE GAP → P1 (reconciliation dashboard) |
| 2 | Cash reconciliation sheet | INTERACTIVE SYSTEM ALREADY BETTER (CashControlPanel) |
| 3 | Payment-provider reconciliation | INTERACTIVE SYSTEM ALREADY BETTER (PaymentAttempt + MoneyHealth + TransactionEvidenceDialog) — but not joined to settlement → part of P1 #1 |
| 4 | Transaction discrepancy form | EXISTING (SaleIssue category payment) |
| 5 | Correction/adjustment record | EXISTING (cash ADJUSTMENT, decision history) |
| 6 | Project expense log | INTERACTIVE SYSTEM ALREADY BETTER (Expense) |
| 7 | Expense receipt record | EXISTING (receipt_url + signed URL) |
| 8 | Client expense authorization | INTERACTIVE SYSTEM ALREADY BETTER (AuthorizeExpenseDialog) |
| 9 | Company expense worksheet | EXISTING (SaleEconomicsPanel; BusinessExpense for overhead) |
| 10 | Commission calculation | INTERACTIVE SYSTEM ALREADY BETTER (companyFee MAX model) |
| 11 | Gross-to-net worksheet | INTERACTIVE SYSTEM ALREADY BETTER (SettlementStatement) |
| 12 | Settlement statement | INTERACTIVE SYSTEM ALREADY BETTER |
| 13 | Settlement review checklist | GENUINE SOFTWARE GAP → P1 (settlement readiness gate) |
| 14 | Client payment record | EXISTING (payout_records) — enhance with due date/delivered (P1) |
| 15 | Financial completion checklist | GENUINE SOFTWARE GAP → P1 (P0 gate) |
| 16 | Outstanding-obligations report | INTERACTIVE SYSTEM ALREADY BETTER (closeout blockers + TransitionCompletion readiness) |
| 17 | Full project close checklist | SMALL ENHANCEMENT → P1 (add transition + access to gate) |
| 18 | Closing-file index | SMALL ENHANCEMENT → P2 (links-only) |
| 19 | Key/access return sheet | GENUINE SOFTWARE GAP → P1 (access closeout block) |
| 20 | Temporary-access closeout | GENUINE SOFTWARE GAP → P1 (same block) |
| 21 | Record-retention schedule | BOOK / PRINTABLE + LATER (no legal periods invented) |
| 22 | Project profitability worksheet | INTERACTIVE SYSTEM ALREADY BETTER (economics panel) |
| 23 | Owner-hours tracker | INTERACTIVE SYSTEM ALREADY BETTER (LaborEntry is_owner_time) |
| 24 | Labor-cost report | EXISTING (cash labor formulas) |
| 25 | Revenue-per-labor-hour report | SMALL ENHANCEMENT → P1 |
| 26 | Estimated-vs-actual report | INTERACTIVE SYSTEM ALREADY BETTER (variance table) |
| 27 | Project quality scorecard | DO NOT BUILD as composite (P2 view of factual dims only) |
| 28 | Client outcome review | EXISTING (transition.objective.achieved) |
| 29 | Referral-opportunity record | EXISTING (deal referral fields + Contact) |
| 30 | Five-minute post-sale review | SMALL ENHANCEMENT → P1 (SaleRecap fields) |
| 31 | Near-miss report | SMALL ENHANCEMENT → P1 (SaleIssue additive) |
| 32 | Corrective-action form | EXISTING path (SaleIssue→SaleTask) — P1 link polish |
| 33 | Lessons-learned record | FOLD INTO #30 (no new entity) |
| 34 | SOP update worksheet | P2 (draft/recommendation via BusinessDocument) |

## ENTITY TESTS (§116–§120)

- **Reconciliation**: ✕ DO NOT BUILD a Reconciliation entity. Derive at read time from Order + PaymentAttempt + CashSession + SaleRefund (+ SaleIssue for exceptions). An immutable close snapshot already exists where needed (CashSession.expected_cash/variance at close). 
- **Settlement**: ✓ reuse SaleConversionPipeline/SettlementStatement flow — no parallel FinancialSettlement.
- **Client Payment**: ✓ payout_records sufficient; multiple payouts already supported (append). No ClientPayment entity. Add due-date/delivered fields to the deal.
- **Project Close**: ✕ no ProjectClose entity. Derived readiness + human approval (Mark Project Complete) — extend the existing gate.
- **Post-Sale Review**: ✓ reuse SaleRecap/SaleIssue/SaleTask — no LessonsLearned entity.

## READINESS DEFINITIONS (§121–§125)

- RECONCILIATION READINESS (recommended, deterministic): zero UNKNOWN/PROCESSING attempts; no open payment-category SaleIssues; cash variance not OPEN; (once built) transaction↔payment difference explained. → ＋ P1.
- SETTLEMENT READINESS: reconciliation ready + commercial terms accepted (live terms = accepted snapshot or later authorized change) + every deduction provenance-linked (already structural) + client balance calculable. → ＋ P1.
- FINANCIAL COMPLETION READINESS: settlement finalized + client fully paid + financial exceptions resolved. → ＋ P1 (the missing gate).
- PROJECT CLOSE READINESS: FINANCIAL COMPLETE + TRANSITION COMPLETE + access closed + closing records index available. → ＋ P1.

## AGREEMENT-TO-SETTLEMENT MATRIX (§138)

| Line | Agreement source | Authorization source | Settlement effect | Client visibility | Block if unsupported? |
|---|---|---|---|---|---|
| Commission | deal commission_rate (accepted snapshot exists) | accepted proposal metadata | fee.applied | shown with rate | △ NO (live-rate gap → P1) |
| Minimum fee | deal minimum_fee | accepted snapshot | MAX() applied, explained | explained in words | △ same gap |
| Service charge | — | SaleClientDecision financial authorized | − from client balance | line + authorizer + date | ✓ YES (structurally) |
| Reimbursable expense | — | decision with related_expense_id | − from client balance | line + receipt flag | ✓ YES (AUTHORIZATION NEEDED) |
| Company expense | — | none needed | none on settlement; company cost internally | not shown | ✓ N/A |
| Refund/adjustment | — | SaleRefund (operator authorized, provider-ref recorded) | ✕ **NO EFFECT TODAY — the gap** | ✕ absent | ✕ — P0 |

## RECONCILIATION MATRIX (§136) — currently computable per cell

| Source | Recorded amount | Payment truth | Adjustment | Unresolved | Reconciled amount | Provenance |
|---|---|---|---|---|---|---|
| Cash | Cash Orders + Transaction totals | CashSession closing count | drops/signed adjustments | OPEN variance | expected−variance | CashSession ✓ |
| Card/online | Order.total (paid) | PaymentAttempt APPROVED (provider refs) | none | UNKNOWN/PROCESSING preserved | per-order ✓ | PaymentAttempt ✓ |
| Refund | (stays in Item gross ✕) | SaleRefund amount/status | — | PROVIDER_PENDING | ✕ not in settlement | SaleRefund ✓ but unwired |
| Duplicate payment | — | preserved attempt, no 2nd Order | — | SaleIssue POSSIBLE DUPLICATE | n/a ✓ | SaleIssue ✓ |
| Void/failed | Item not sold | DECLINED/FAILED attempt | — | — | n/a ✓ | PaymentAttempt ✓ |

The per-row provenance is excellent; the JOINED view is the gap.

## TRACES (§145–§153)

- **§145 $20k trace**: cash expected via CashSession ✓; card via attempts ✓; refund recorded ✓ but never reduces the $20k gross (P0 #1); unknown payment surfaces in MoneyHealth but does not block settlement (P0 #2); fee UNKNOWN honestly ✓; processor fee via operator Expense ✓. Reconciled truth reachable per-channel, NOT yet joined — difference never zeroed ✓.
- **§146 settlement trace**: proceeds→commission→authorized expense→company expense (internal only)→refund(✕ absent)→balance→statement. Unsupported deduction: none possible except the unaccepted-terms seam (P1).
- **§147 surprise trace**: unauthorized charge CANNOT be added (structural); expected behavior satisfied by construction; accepted-terms drift is the remaining surprise (P1).
- **§148 client payment trace**: works except delivered-vs-paid distinction.
- **§149 project close trace**: Financial YES + Transition NO → currently NOT BLOCKED (defect, P1 gate); provider access closeout absent (P1); after both → human close exists ✓.
- **§150 profitability trace**: full chain supported in economics panel; margin + per-hour metrics = one small P1.
- **§151 estimate trace**: 80→125 hrs variance shown ✓; scope-change attribution △ (annotate variance with decision provenance).
- **§152 near-miss trace**: guard prevented paid-Item cleanout inclusion (verified in CH22 cert); recordable as SaleIssue today; control-weakness/corrective linkage = P1-small.
- **§153 ten-more trace**: judgment record ✓; the economics contrast view = P1 comparison.

## DO-NOT-REBUILD (§154)

Chapter 4 economics (gross/fee/contribution/owner-time), Chapter 9 accepted terms/snapshot, Chapter 13 tasks/issues/decisions, Chapter 19 labor/team/training, Chapter 21 PaymentAttempt/cash/refund/resolve, Chapter 22 transition completion/provider responsibility/disposition, Expense/LaborEntry/SettlementStatement/SaleRecap/BusinessDocument/SaleIssue/SaleClientDecision/SaleScope/permissions architecture — all cover their Chapter 23 promises directly.

## INTERFACE / DATA / WORKFLOW / PERMISSION GAPS

1. No reconciliation/failure joined view (data present).
2. SaleRefund unwired to settlement/economics (data present, consumer absent).
3. Settlement finalize & project close gates incomplete (payment truth, transition).
4. Deal payment due date + statement-delivered flag absent.
5. "Gross Revenue"/dashboard "revenue" mislabels.
6. No cross-project economics comparison; no margin/per-hour/invisible-labor displays.
7. No key/access closeout block; no near-miss/control-weakness fields; no structured review fields.
8. RLS: settlement/expense/payment records are operator/admin-anchored — no cross-company exposure found (data layer); final second-user denial check remains manual (carried forward).

## P0 / P1 / P2 / P3 / LATER

**P0 (financial integrity — fix before relying on settlement):**
1. Wire SaleRefund into settlement gross/waterfall (deduction with provenance; never rewrite Order).
2. Financial-completion gate: block settlement finalize on UNKNOWN/PROCESSING attempts, open payment issues, OPEN cash variance (and surface them on the statement).
3. Project close must require TRANSITION COMPLETE.
4. Truth-in-labeling: "Gross Merchandise Sales" everywhere; OperatorDashboard revenue metric must use commission_earned (company revenue), not actual_revenue (gross).

**P1 (smallest set to make Chapter 23 substantially true):** settlement/agreement comparison alert (accepted snapshot); reconciliation dashboard (method breakdown + difference, explained not erased); client payment due date + delivered-vs-paid; margin + revenue/contribution-per-hour + invisible-labor flags; access closeout block + gate; near-miss/control-weakness/corrective-action linkage; five-minute review fields on SaleRecap; cross-project comparison view.

**P2:** AI reconciliation/settlement/records/estimating/interview/near-miss assistants; retention reminder; closing-file index polish; SOP suggestion drafts; complexity/schedule retrospective views; employee development note; merchandise-category→results analytics.

**LATER:** processor payout ingestion, deposit timing, bank-feed/accounting sync, tax workflows, legal retention automation, cohort/cross-company benchmarks, split tenders.

## BOOK TRUTH — strict list (§135)

Processor Reconciliation ✓ partial (refs yes, fee/deposit no) · Deposit Tracking ✕ LATER · Deposit Timing ✕ LATER · AI Reconciliation Assistant ✕ P2 · Settlement Statement Builder ✓ EXISTING · Unexpected Charge Alert ✓ structural (expenses) / △ terms-drift · AI Settlement Review ✕ P2 · Client Confirmation ✕ P1 (delivered flag) · Closing File △ index P2 · Temporary User Access ✕ P1 · Provider Access △ (assignment-window RLS exists; no end-access check) · Key & Lockbox Tracking ✕ P1 · Record Retention Rules ✕ LATER · Retention Reminder ✕ P2 · Legal Hold ✕ LATER (no delete paths for records anyway) · Privacy Review ✕ P2 · AI Records Checklist ✕ P2 · Margin Analysis △ one-line P1 · Owner Labor by Activity ✓ EXISTING · Invisible Labor Alert △ P1-small · Estimate Learning ✕ P2 (seam broken post-review→future estimates) · Sale-Type Benchmarks ✕ LATER (sample too small) · Property Complexity History ✓ data / ✕ view · Client Complexity Patterns ✓ operational-only · AI Estimating Coach ✕ P2 · Project Quality Scorecard ✕ DO NOT BUILD composite · Schedule Impact ✕ P2 · AI Post-Sale Interview ✕ P2 · Near-Miss Record △ P1-small · Repeat-Risk Alert ✕ P2 · AI Near-Miss Review ✕ P2 · SOP Update Suggestion ✕ P2 · Training Scenario ✕ LATER · Estimate Adjustment ✕ P2 · AI Business Coach ✕ Chapter 24+.

Every remaining numbered promise (§1–§134 not listed above) is classified in its section above; none were classified as existing without an identified entity/field/page/function/formula.

## PRODUCT DOCTRINES

All permanent doctrines audited as enforced EXCEPT: "refund attached to financial story" (stored attached, not CONSUMED — P0 #1); "a sale is not financially complete because we know the gross" (finalize gate gap — P0 #2); "client paid ≠ project closed" (close gate gap — P0 #3); "gross ≠ revenue" (label violations — P0 #4). Zero-for-unknown, honest-variance, unknown-is-data, provenance-or-block, and no-silent-rewrite doctrines are genuinely enforced in code.

## RECOMMENDED IMPLEMENTATION SEQUENCE (NOT IMPLEMENTED)

1. P0 #1–#4 (refund wiring → completion gates → close gate → labels).
2. Settlement/agreement comparison alert + reconciliation dashboard.
3. Client payment due date/delivered + financial completion readiness panel.
4. Access closeout + near-miss/review fields + comparison/per-hour/margin views.
5. P2 AI assists afterwards, if desired.

## PRE-LAUNCH DEPENDENCIES (§155, carried forward)

- CH19: genuine non-owner HIGH_VALUE price-change denial (manual second account).
- CH21: 428px physical-device cash/POS confirmation.
- CH22: genuine second-operator Donation/Cleanout isolation denial.
- CH23 adds: none impossible to automate beyond the above; the four P0s are automatable and testable with the established fixture methodology. No new manual-only checks required.

## FINAL CERTIFICATION

**GO WITH CONDITIONS**

The agreement-authorization architecture, canonical economics, and Chapter 21/22 truth chains are strong and genuinely deployed. Conditions: remediate the four P0s (refund-in-settlement, payment-truth completion gate, transition-complete close gate, gross-vs-revenue labeling) and the accepted-terms comparison alert before settlement output is relied on for client money. Everything else in Chapter 23 is enhancement, P2, or later — none of it blocks the truth chain once the P0 conditions are met.

**AUDIT COMPLETE — NOTHING BUILT. CHAPTER 23 NOT IMPLEMENTED. CHAPTER 24 NOT STARTED.**