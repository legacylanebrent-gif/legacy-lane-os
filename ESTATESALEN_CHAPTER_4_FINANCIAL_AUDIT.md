# CHAPTER 4 BOOK → ESTATESALEN FEATURE AUDIT
## Financial Performance & Profitability

Audit date: 2026-10-20. Inspection only — nothing was built, no production data modified.

---

## EXECUTIVE RESULT

57 promises audited:

| Classification | Count | % |
|---|---|---|
| ✓ EXISTING / SUPPORTED | 6 | 10.5% |
| △ ENHANCE | 10 | 17.5% |
| ＋ BUILD | 37 | 64.9% |
| ✆ COMMITTED PRE-LAUNCH | 0 | 0% |
| ↔ COVERED BY EXISTING SYSTEM | 3 | 5.3% |
| LATER CHAPTER | 1 | 1.8% |
| ✎ BOOK REVISION CANDIDATE | 0 (see wording risk §) | 0% |

**Headline:** The client-facing money architecture (settlement, payouts, closeout) and the company-side cost containers (Expense, BusinessExpense) exist and work. What is missing is the connective tissue between them: **no labor-hour architecture, no sale-level profitability calculation, no pre-sale economic model, and no AI financial evaluation.** The 37 BUILD items collapse into ~6 coherent builds, not 37 features.

---

## FEATURE PROMISE AUDIT

| # | BOOK FEATURE | CLASS | ACTUAL IMPLEMENTATION | GAP | RECOMMENDATION | PRIORITY |
|---|---|---|---|---|---|---|
| 1 | Gross sales tracking | △ ENHANCE | SettlementStatement sums Item.sold_price (gross, by sale phase) — correct and usable. But EstateSale.actual_revenue/commission_earned are read by SaleStatistics & OperatorDashboard and **written by nothing**; Transaction carries a hardcoded 80/20 split disconnected from the deal's commission rate | Phantom revenue fields undermine the "authoritative source"; two competing gross systems | Persist canonical gross at settlement/closeout in one writer; fix or retire Transaction's fixed 80/20 | P1 |
| 2 | Commission calculator | ✓ EXISTING | SettlementStatement: commission = gross × deal.commission_rate (default 35%), client share = gross × (100−rate), per-item client-share column, PDF export | Rate exists on both deal and EstateSale (dual source); freely editable pre-contract (acceptable) | Keep; unify rate source (deal authoritative, projected onto sale) | P2 |
| 3 | Minimum fee tracking | ＋ BUILD | No minimum-fee field anywhere (verified: zero matches for minimum_fee) | No agreement minimum, no comparison of calculated vs minimum, no settlement use | Add minimum_fee to deal; SettlementStatement applies max(commission, minimum) with visible difference line | P1 |
| 4 | Additional service charges | ＋ BUILD | No authorized-service/fee records; settlement is commission-only | No client-approved charge capture, no settlement inclusion, no audit trail | Reuse SaleClientDecision (decision_type "financial") for client-approved charges; feed into settlement as distinct lines | P1 |
| 5 | Sale expense tracking | △ ENHANCE | Canonical sale-scoped Expense entity exists with right categories (labor_wages, advertising_marketing, supplies_materials, transportation_fuel, professional_services, other) — **but no UI writes it**. The "Sale Expense" modal writes BusinessExpense with the sale id only in a free-text `tags` array | SaleCloseout and IncomeTracker read the canonical (empty) entity; real entries are invisible to sale-level reporting | Wire SaleExpensesModal to Expense (sale_id), keep BusinessExpense for true overhead | **P1** |
| 6 | Actual sale profitability | ＋ BUILD | No sale-level company revenue − direct cost calculation anywhere. IncomeTracker is monthly, business-wide, and derived from Transaction.company_amount (hardcoded 20%) | The central Chapter 4 promise has no calculation | Sale-level contribution calc in closeout/settlement seam | **P1** |
| 7 | Labor-hour tracking | ＋ BUILD | Expense.labor_wages = cost line only. No hours, no time entry, no team-hours anywhere (verified) | Whole dimension missing | Canonical LaborEntry entity (see Labor Architecture Finding) | **P1** |
| 8 | Estimated vs actual labor | ＋ BUILD | Nothing | No estimates, no actuals, no comparison | Estimated hours block on the deal + LaborEntry actuals + variance view | **P1** |
| 9 | Owner-time tracking | ＋ BUILD | Nothing; owner labor only enterable as a wage expense (cash) | Owner time has no non-payroll home | is_owner_time flag in LaborEntry; reports show cash cost vs owner (economic) time separately | **P1** |
| 10 | Cost per sale | ＋ BUILD | SaleCloseout displays expense count/total — but from the unwritten canonical Expense entity | No true total-direct-cost rollup | Σ Expense(sale) + labor cash cost, shown in closeout | P1 (after 5,7) |
| 11 | Travel & distance tracking | ＋ BUILD | Property address + transportation_fuel expense category only. No mileage, tolls, travel time, repeated-trip capture | Address ≠ travel cost | Mileage quick-entry on Expense (miles + rate) and travel work-category in LaborEntry | P2 |
| 12 | Sale profitability calculator (pre-sale) | ＋ BUILD | Deal captures estimated_value + commission_rate only ("$25,000 estimated · 35% comm"). No cost inputs, no model | No prospective economics | Pre-sale economics model on the pipeline deal (see Profitability Engine Finding) | **P1** |
| 13 | Minimum revenue test | ＋ BUILD | Nothing | No threshold, no accept/reject guidance | Minimum acceptable company revenue / minimum contribution in calculator | P1 (with 12) |
| 14 | Conservative scenario | ＋ BUILD | Nothing | No non-destructive scenario modeling | Scenario toggle in the calculator (lower gross, higher labor/expenses) — never writes the deal | P1 (with 12) |
| 15 | Labor sensitivity test | ＋ BUILD | Nothing (no labor model) | "What if +20 hours" unanswerable | Calculator input est hours × rate; sensitivity flows to projected contribution | P1 (after 7) |
| 16 | Commission comparison | ＋ BUILD | Rate editable on draft deal; no comparison surface | Cannot compare rate/min-fee scenarios side by side | Commission comparison view in calculator (pre-proposal only) | P2 |
| 17 | Opportunity-cost check | ↔ COVERED | Chapter 3 OperatorCalendar + OperatorWorkload show overlap, due/blocked/unassigned load, research items; click-through to sales/tasks | No capacity engine (by design, Chapter 3) | Link calendar/workload into the acceptance scorecard; don't pretend capacity analytics | P2 link |
| 18 | AI sale evaluation coach | ＋ BUILD | aiCoach has business_coaching (generic) and sale-context modes (promotion, pricing, ops) — **no mode consumes structured deal economics**; system prompt even says "Do NOT give legal, tax, or financial advice" | No structured-input evaluation; no assumption flagging | New coach mode fed the deal's structured economics; advisory only, human decides | P2 (after 12) |
| 19 | AI risk review | ＋ BUILD | Risk facts (access, sorting volume, deadlines, distance) are not structured fields | AI cannot see risk structurally | Structured risk factors on the deal; coach surfaces them | P2 |
| 20 | AI what-if analysis | ＋ BUILD | Nothing structured | No structured assumptions for AI to flex | Coach mode over calculator scenario inputs | P2 (after 12,14) |
| 21 | AI historical comparison | ＋ BUILD | Structured sale dimensions exist (sale_type enum ×16, city/state, estimated_value, dates, total_items, views) but no comparison engine; labor/expense history too thin to compare yet | "Similar" is determinable structurally for size/type/location only | Comparison service over completed sales with recorded economics | LATER-leaning P2 |
| 22 | AI profitability coach | ＋ BUILD | No projected-vs-actual data exists to explain variance | Cannot honestly run | Post-sale variance report first; AI explains it after | LATER (after 23) |
| 23 | Projected vs actual dashboard | ＋ BUILD | Only estimated_value vs (computed, unpersisted) gross. Labor: neither. Expenses: actual only | Most cells of the matrix are empty | Projected-vs-actual panel in sale closeout | **P1** (after 5,7,12) |
| 24 | Sale performance history | ＋ BUILD | SaleStatistics per sale (reads phantom fields); OperatorDashboard revenue chart reads actual_revenue (never written); MySales list has no financial columns | No trustworthy cross-sale performance view | Fix canonical persistence, then comparative table (gross, contribution, by sale) | P1→P2 |
| 25 | Labor benchmarking | LATER CHAPTER | Impossible without hours data | Needs seasons of LaborEntry data first | Benchmark service in growth chapter | LATER |
| 26 | Marketing performance tracking | △ ENHANCE | Strong on campaign sends (MarketingCampaignPerformance/SaleMarketingPerformance: sent/delivered/opened/clicked per sale), attendance (CheckIn sale_visit, EarlySignIn), but **no buyer-source capture** → no source→attendance→revenue chain | Sending metrics ≠ financial attribution | Add "how did you hear" + campaign source on sign-in/checkout; attribution report | P2 |
| 27 | Expense trends | △ ENHANCE | IncomeTracker & MyBusinessExpenses: category filters + monthly income-vs-expense chart; BusinessExpense categories rich | Trends shown, insights not surfaced | Category-over-time panel with per-sale-type slicing | P2 |
| 28 | Profitability by sale type | ＋ BUILD | sale_type is well-structured (16 values) but there is no profitability number to compare | Needs #6 | Aggregate contribution by sale_type once #6 lands | P2 (after 6) |
| 29 | Supply tracking | ↔ COVERED | Expense.supplies_materials + BusinessExpense.office_supplies categories; no consumable inventory | Book wording implies inventory; actual need is expense-level for this market | No build; see Book Wording at Risk | — |
| 30 | Advertising spend | △ ENHANCE | Campaign spend tracked per campaign/sale on the sending side; advertising_marketing expense category exists (sale-scoping broken per #5) | Spend→sale financial link missing | Fix #5; report ad spend per sale next to campaign metrics | P2 |
| 31 | Processing costs | ＋ BUILD | No card-fee capture on sale transactions (grep: none). BusinessExpense.bank_fees and Order.platform_fee (marketplace only) are the only neighbors | POS card fees invisible to profitability | processing_fees Expense category + optional quick-entry at checkout | P2 |
| 32 | Recurring overhead | ✓ EXISTING | BusinessExpense: is_recurring, frequency (monthly/quarterly/annually), MyBusinessExpenses recurring entry with backdating, CashFlowProjection 6-month projection | — | Keep | — |
| 33 | Monthly business dashboard | △ ENHANCE | IncomeTracker: monthly income vs expenses chart, derived Income records, date/category filters. No overhead/direct/labor split, no volume/labor | Not the book's combined dashboard | Consolidated monthly view: revenue, direct, overhead, labor hours, volume, operating result | P2 |
| 34 | Automatic reconciliation | △ ENHANCE | SaleCloseout aggregates items/expenses/settlement/pickups with blockers & warnings; settlement_finalized distinct from sale status | No payment-level tie-out (recorded transactions vs items sold, cash-up discrepancy detection) | Basic tie-out in closeout now; full reconciliation engine = Chapter 23 | P2 / LATER |
| 35 | Client settlement statement | ✓ EXISTING | SettlementStatement: gross by phase (pre/during/post), commission, client share, per-item table, payout history, balance, PDF. Internal economics excluded ✓. IncomeTracker-derived income stays separate ✓ | No minimum-fee/additional-charge lines yet (ties to #3, #4) | Extend settlement lines when #3/#4 land | P1 ext |
| 36 | Company performance report | ＋ BUILD | No internal sale-level profitability report distinct from client settlement | The book's separation promise has only the client half | Internal economics panel in closeout (never on client statement) | P1 (after 6) |
| 37 | Financial closing checklist | ✓ EXISTING | SaleCloseout: settlement state machine (Draft→Paid in full→Finalized), payout blockers ("$X still due to client"), expense count, pickup tracking, finalize gate. "Financially complete" is distinct from sale status | Will strengthen when #3/#4/#10 feed it | Keep | — |

### H. Ready-to-use tools (38–57)

| # | TOOL | STATUS | RECOMMENDED IMPLEMENTATION |
|---|---|---|---|
| 38 | Sale profitability calculator | MISSING | DIGITAL WORKFLOW + CALCULATOR (deal-level, see #12) |
| 39 | Commission calculator | PARTIAL (post-sale only, inside SettlementStatement) | CALCULATOR on the deal (pre-proposal) |
| 40 | Minimum-fee calculator | MISSING | CALCULATOR (with #3) |
| 41 | Service-fee authorization form | MISSING | DIGITAL WORKFLOW via SaleClientDecision 'financial' type + PRINTABLE |
| 42 | Pre-sale budget worksheet | MISSING | BOTH (calculator IS the worksheet; printable export) |
| 43 | Conservative-scenario calculator | MISSING | CALCULATOR (scenario mode, non-destructive) |
| 44 | Labor estimate worksheet | MISSING | DIGITAL WORKFLOW (estimated hours block on deal) + PRINTABLE |
| 45 | Employee-hour sheet | MISSING | DIGITAL WORKFLOW (LaborEntry) + PRINTABLE |
| 46 | Owner-time tracker | MISSING | DIGITAL WORKFLOW (LaborEntry, owner flag) |
| 47 | Travel-cost worksheet | MISSING | CALCULATOR-lite (mileage quick-entry) |
| 48 | Advertising budget | PARTIAL (campaign tools + expense category) | ENHANCE (budget field vs actual spend per sale) |
| 49 | Sale expense tracker | PARTIAL/BROKEN (entity exists, UI writes elsewhere) | **ENHANCE — P1** (wire modal to Expense) |
| 50 | Estimated-vs-actual report | MISSING | REPORT (closeout panel, #23) |
| 51 | Post-sale profitability review | MISSING | REPORT (after #6); AI assist later |
| 52 | Client settlement statement | EXISTS | NO BUILD |
| 53 | Monthly overhead worksheet | EXISTS (BusinessExpense recurring + projection) | NO BUILD |
| 54 | Break-even calculator | MISSING | CALCULATOR (overhead data already exists) — P2 |
| 55 | Opportunity-cost worksheet | COVERED (Chapter 3 calendar + workload) | NO BUILD; link into scorecard |
| 56 | Sale acceptance scorecard | MISSING | DIGITAL WORKFLOW (calculator + minimum-revenue test + calendar/workload links) — P1 |
| 57 | Monthly profit dashboard | PARTIAL (IncomeTracker) | ENHANCE (consolidated, #33) |

---

## FINANCIAL TRUTH AUDIT

| Concept | Verdict | Evidence |
|---|---|---|
| Gross merchandise sales | **PARTIAL** | Correct calculation exists (Σ Item.sold_price in SettlementStatement) but is not persisted canonically; EstateSale.actual_revenue unwritten; Transaction duplicates proceeds with a fixed 80/20 split |
| Amount collected | **PARTIAL** | Transaction records sale-day POS by payment method; no tie-out against item-level sold records; no refunds/adjustments model |
| Company commission/revenue | **CONFUSED** | Four competing expressions: deal commission_rate × gross (settlement, correct); Transaction.company_amount (hardcoded 20% regardless of actual rate); EstateSale.commission_earned (never written); Income auto-derived from company_amount |
| Client proceeds | **CLEAR** | netDueToClient + payout_records + running balance on SettlementStatement — the cleanest concept in the app |
| Additional company service revenue | **MISSING** | No service-fee/authorized-charge records anywhere |
| Direct sale expense | **CONFUSED** | Canonical sale-scoped Expense is read by SaleCloseout & IncomeTracker but has **no writer**; the actual sale-expense UI writes BusinessExpense with sale linkage only as a text tag |
| Labor cost | **PARTIAL** | Cost lines only (labor_wages / wages_payroll); hours do not exist |
| Owner time | **MISSING** | No non-payroll owner-time capture |
| Processing cost | **MISSING** | No card-fee capture for sale-day payments (bank_fees category and marketplace platform_fee are the only neighbors) |
| Overhead | **CLEAR (data)** / PARTIAL (usage) | BusinessExpense recurring model is well designed; no P&L dashboard consumes it as overhead vs direct |
| Sale-level contribution/profitability | **MISSING** | No calculation exists |
| Company-level operating performance | **PARTIAL** | IncomeTracker monthly income-vs-expense chart; derived from flawed company_amount; no overhead/direct/labor decomposition |

**Concepts used as each other (must fix):** Transaction's 80/20 split presents *proceeds* as if they were *commission* regardless of the real contract rate. EstateSale.actual_revenue presents a *field* as if it were a *workflow*. The sale-expense modal presents *overhead entries* as if they were *sale-scoped direct costs*.

---

## PROJECTED VS ACTUAL MATRIX

| Field | PROJECTED | ACTUAL | Verdict |
|---|---|---|---|
| Gross sales | estimated_value (deal & sale) | computed on demand in settlement; not persisted | **BOTH (actual fragile)** |
| Commission / company revenue | implied (est × rate, displayed) | computed in settlement; not persisted | **BOTH (weak)** |
| Labor hours | — | — | **NEITHER** |
| Labor cost | — | expense category only | **ACTUAL ONLY** |
| Advertising | — | categories + campaign spend metrics | **ACTUAL ONLY** |
| Supplies | — | categories | **ACTUAL ONLY** |
| Travel | — | fuel category; no mileage | **ACTUAL ONLY** |
| Processing | — | — | **NEITHER** |
| Other expenses | — | categories | **ACTUAL ONLY** |
| Profitability | — | — | **NEITHER** |

Architecture implication: the eventual profitability engine needs a **persisted actual block** (written once at closeout/settlement) and a **projected block on the deal** — both derived from the fields above, never hand-maintained twice.

---

## LABOR ARCHITECTURE FINDING

**Recommendation: a new canonical LaborEntry entity — do NOT extend Expense.** Expense is a cost line; hours are a different dimension (hours × rate may produce a cost, but owner hours produce none). Conflating them would poison both.

```
LaborEntry:
  sale_id*            — EstateSale scope
  operator_id*        — RLS anchor (sale owner projection)
  user_id             — team member (ManageTeam user) or owner
  member_name         — display snapshot (allows non-platform helpers)
  work_category*      — preparation | research | staging | sale_day | pickup | closeout | travel | other
  entry_date*         — when the work happened
  hours*              — decimal hours
  hourly_rate         — nullable; paid-labor cash rate
  is_owner_time       — boolean; owner time = economic, not cash wage
  notes
  approved / approved_by — optional (needed only if teams want sign-off)
```

Derived at report time (never stored twice): cash labor cost = Σ hours × rate for non-owner entries. Owner time always reported separately from cash cost.

**Estimated hours:** a projected labor block on the SaleConversionPipeline deal (per-category estimated hours + rate), because the deal is already the pre-sale record. This feeds the pre-sale calculator and later the estimated-vs-actual labor variance.

**Entity choice:** LaborEntry (canonical, new dimension) + estimated-labor block on the existing deal. No new expense/settlement system.

---

## PROFITABILITY ENGINE FINDING

**Actual sale economics (derived, persisted once at closeout/settlement finalize — single writer):**
- actual_gross = Σ Item.sold_price (persist to EstateSale.actual_revenue)
- company_revenue = gross × commission_rate + authorized service fees, with minimum fee applied (max(commission, minimum), difference shown)
- direct_costs = Σ Expense(sale_id) by category + cash labor cost (LaborEntry) + processing fees
- sale_contribution = company_revenue − direct_costs
- owner_time reported alongside, never inside cash contribution (disclosed as economic cost)

**Projected sale economics (on the deal, pre-acceptance):**
- est_gross, commission rate, minimum fee, service fees
- est labor hours × rate (per category), est advertising, supplies, travel (incl. mileage), processing, other
- → projected contribution + minimum-revenue test (accept/reject threshold, operator-set)
- conservative scenario = same inputs scaled (−20% gross, +labor, +expenses) — never writes the deal

**Company-level (monthly):** company revenue events − direct costs − BusinessExpense overhead = operating performance. IncomeTracker's derived Income records must switch source from Transaction.company_amount to the canonical settlement-derived revenue.

---

## AI FINANCIAL COVERAGE MATRIX

| Capability | Verdict |
|---|---|
| Pre-sale evaluation (structured inputs) | **MISSING** — business_coaching mode is generic conversation; no mode receives deal economics |
| Risk review (labor, access, travel, sorting, deadlines, closeout) | **MISSING** — risk facts are not structured anywhere AI can read |
| What-if modeling | **MISSING** — no structured assumptions to flex |
| Historical comparison | **GENERIC ONLY** — sale-context injection lists recent sales' estimated values, but no "similar sale" structured comparison |
| Post-sale profitability coaching | **GENERIC ONLY** — no projected-vs-actual variance data exists to explain |

Governance note: aiCoach already carries the right guardrail ("Do NOT give legal, tax, or financial advice") and Chapter 3 established AI-may-suggest/never-set doctrine — extend the same rule to all financial modes: identify assumptions, compare scenarios, surface patterns, flag risk, explain variance; never approve/reject a project, never alter settlement, never create financial facts.

---

## TOP P1 GAPS

1. **Sale-scoped expense repair** — wire the existing sale-expense UI to the canonical Expense entity (sale_id), add processing-fee category. Nothing else in Chapter 4 can be honest while direct costs are unrecordable. (Promises 5, 49, 30, 10)
2. **LaborEntry architecture** — hours, work category, date, rate, owner-time flag; estimated-hours block on the deal. (7, 8, 9, 44, 45, 46)
3. **Canonical revenue persistence** — one writer at settlement/closeout for actual gross + commission; retire phantom reads; fix Transaction's hardcoded 80/20. (1, 24)
4. **Pre-sale Sale Economics Calculator on the pipeline deal** — projected contribution, minimum-fee comparison, minimum-revenue test, conservative scenario, commission comparison, links to Chapter 3 calendar/workload = the sale acceptance scorecard. (12–16, 38–43, 54, 56)
5. **Sale-level contribution + projected-vs-actual surface** in closeout, internal-only. (6, 23, 36, 50, 51)
6. **Minimum fee + additional service charges** into the settlement, with client-approval trail via SaleClientDecision('financial'). (3, 4, 40, 41)

---

## P2 IMPROVEMENTS

- Marketing source attribution chain (source → attendance → revenue) (26)
- Expense trend insights and profitability by sale type (27, 28)
- Consolidated monthly business dashboard (33, 57)
- Break-even calculator (uses existing overhead data) (54)
- Travel/mileage quick entry (11, 47)
- Advertising budget vs actual per sale (48)
- AI financial coach modes once structured inputs exist (18–22)
- Payment tie-out in closeout (basic reconciliation) (34)

---

## LATER CHAPTER ITEMS

- **Labor benchmarking** (25) — needs seasons of accumulated LaborEntry data
- **Full payment reconciliation engine** (34, complete form) — Chapter 23 vision; closeout tie-out is the now-sized piece
- **True capacity planning** — needs labor hours + benchmarks (see below)
- **Consumable supply inventory** (29) — expense categorization is sufficient for this market
- **AI historical comparison at full depth** (21) — improves automatically as economics are recorded

---

## CHAPTER 3 DEPENDENCY RESOLUTION

1. **Is Chapter 4 the correct architectural home for labor-hour tracking?** — **Yes.** Chapter 3's deferral was correct (operations-first), but Chapter 4's profitability promises (6, 7, 8, 9, 10, 15, 23, 25, 44–46) are unfulfillable without it. Deferring again would hollow the chapter.
2. **Exact labor data to capture:** sale, team member (or owner flag), work category (preparation/research/staging/sale_day/pickup/closeout/travel/other), date, decimal hours, optional hourly rate, notes, optional approval — per the LaborEntry spec above.
3. **Still missing for true capacity planning:** accumulated historical hours per sale type/size (benchmarks), sale-calendar density, team availability/scheduling model, hours-vs-revenue per operator. LaborEntry provides the foundation, not the engine.
4. **Recommendation:** **Split.** Build labor-hour capture + estimated-vs-actual hours in **Chapter 4 P1**; defer the capacity-planning engine to a later growth chapter. The Chapter 3 calendar and workload planner remain the honest interim capacity surface.

---

## BOOK WORDING AT RISK

- **#29 Supply tracking:** wording implying consumable-inventory management is not worth building for this market; expense-category tracking covers the operator's real need. Suggest the book present it as "track supply spending by category."
- **#34 Automatic reconciliation:** as an automatic, complete reconciliation this over-promises today; suggest "closeout checklist that ties payments, expenses, and settlement together" for the current architecture.
- **#21/22 AI comparisons and profitability coaching:** safe to promise only once structured projected-vs-actual data exists (Chapter 4 P1 outputs); the book should frame AI as "challenges your assumptions," which the current wording already leans toward.
- Everything else in Chapter 4 is strategically worth building — do **not** soften the labor, profitability, or pre-sale-economics promises merely because they are missing today.

---

## DUPLICATION RISKS

| Existing system | Risk | Rule |
|---|---|---|
| Expense (sale-scoped) vs BusinessExpense (overhead) | A third expense path; the sale-expense modal already writes to the wrong one | Extend Expense via the existing modal; BusinessExpense stays overhead-only |
| Transaction 80/20 vs deal commission_rate | A second commission "calculation" that ignores the contract | Derive any split from commission_rate or retire the split fields |
| Income (derived) vs settlement-derived revenue | Auto-derived Income currently keys off the flawed company_amount | Single source: settlement/closeout writer |
| SettlementStatement payouts | Tempting to add a "profit" figure to the client statement | Never — internal economics stay in closeout only |
| SaleClientDecision | A new "service fee approval" entity would duplicate the financial-decision architecture | Reuse decision_type 'financial' |
| Worksheet page (stubbed Expenses/Summary tabs) | Building profit tools there duplicates the closeout/calculator surfaces | Remove or redirect the stubs when the real surfaces land |
| LaborEntry | Must not become a second expense system | Hours only; costs always derived |

---

## RECOMMENDED IMPLEMENTATION PLAN

**P1 — build/enhance now (Chapter 4):**
1. Sale-scoped expense repair (modal → Expense, processing category)
2. LaborEntry entity + capture UI + estimated-hours block on deal
3. Canonical actual revenue/commission persistence (settlement/closeout single writer; fix Transaction split)
4. Pre-sale Sale Economics Calculator + minimum-fee/minimum-revenue tests + conservative scenario + acceptance scorecard
5. Sale-level contribution + projected-vs-actual in closeout (internal only)
6. Minimum fee + service charges in settlement (client-approved via SaleClientDecision)

**P2 — backlog:** source attribution, trends/by-sale-type insights, monthly dashboard consolidation, break-even, mileage, ad budget vs actual, AI financial modes, payment tie-out.

**✆ PRE-LAUNCH:** none new for Chapter 4 (SMS/Houszu dependencies from prior chapters unchanged; nothing financial depends on them).

**LATER CHAPTER:** labor benchmarking, capacity-planning engine, full reconciliation (Ch 23), consumable inventory, deep AI historical comparison.

**BOOK REVISION:** supply-tracking wording; soften "automatic reconciliation" phrasing (see above).

---

## CANONICAL ARCHITECTURE DISCOVERED (evidence-backed)

- **Expense** — sale-scoped (sale_id required), 17 categories incl. labor_wages, advertising_marketing, supplies_materials, transportation_fuel; read by SaleCloseout & IncomeTracker; **no writer found**
- **BusinessExpense** — company-level, 18 categories, is_recurring + frequency, tax fields, business_use_percentage; written by MyBusinessExpenses, SaleExpensesModal (sale id in tags only), mileage-ish auto_expenses path
- **Transaction** — sale-day POS lines; seller_amount/company_amount with hardcoded "80% to seller / 20% to company" descriptions regardless of contract
- **EstateSale** — estimated_value, commission_rate, commission_earned, actual_revenue: the latter two are read on SaleStatistics/OperatorDashboard/SaleRecap but no code writes them
- **SaleConversionPipeline** — the pre-sale record: estimated_value, commission_rate (default 35), ai_timeline_tasks, payout_records, total_paid_to_client, settlement_finalized
- **SettlementStatement page** — gross = Σ sold items (by phase), commission = gross × deal rate, client share, payout ledger, balance, PDF
- **SaleCloseout** — aggregates items/decisions/tasks/expenses/deals; settlement state machine with blockers; finalize gate distinct from sale status
- **Income / IncomeTracker** — derived monthly income records + manual income; monthly income-vs-expense chart
- **MarketingCampaignPerformance / SaleMarketingPerformance** — sent/delivered/opened/clicked per operator/sale
- **CheckIn (sale_visit) / EarlySignIn** — attendance surfaces, no buyer-source field
- **Worksheet page** — "Sale Worksheet" with Transactions and Offers tabs live; Expenses and Summary/Profit tabs render "Coming soon"
- **aiCoach** — sale-context modes (promotion, pricing, ops, comms) + generic business_coaching; explicit guardrail against legal/tax/financial advice; no structured-deal-economics mode
- **SaleRecap** — public marketing recap (estimated vs actual revenue display); not a financial analysis record

---

## PRODUCT DOCTRINES EXPOSED BY CHAPTER 4

1. **Gross sales are not company income.** — **ACCEPT.** Settlement keeps gross, commission, and client share cleanly separate. Enforce the same in the engine (fix Transaction).
2. **Revenue without labor and expense context is not profitability.** — **ACCEPT.** Nothing today claims otherwise — because nothing calculates profitability. The engine must implement this literally.
3. **Owner time is a business resource even when no paycheck is issued.** — **ACCEPT.** is_owner_time flag; owner hours always visible next to cash contribution.
4. **A sale should be financially evaluated before it is accepted.** — **ACCEPT.** Pre-sale calculator on the deal; human makes the accept/reject call.
5. **Estimates should become measurable predictions, not forgotten guesses.** — **ACCEPT.** Projected block persisted on the deal; variance surfaced at closeout.
6. **Every completed sale should improve the estimates used on the next one.** — **ACCEPT (phased).** Variance report now; benchmarking when data accumulates.
7. **Financial records should distinguish client money from company money.** — **ACCEPT.** Client proceeds are the cleanest concept in the app; internal economics never appear on the settlement.
8. **AI should challenge assumptions, not manufacture financial certainty.** — **ACCEPT.** Extend the existing AI-suggests/never-sets doctrine to all financial modes; no auto-approval, no invented benchmarks from missing data.
9. **Busy is not the same as profitable.** — **ACCEPT.** Workload planner (Ch 3) shows busy; the contribution view shows profitable. Keep them separate surfaces, cross-linked.
10. **Spend labor where labor creates value.** — **ACCEPT (deferred enforcement).** Requires labor-hour data first; becomes actionable with LaborEntry + later benchmarks.

---

## CERTIFICATION

# **SUPPORTED WITH ENHANCEMENTS**

The client-settlement, closeout, expense-container, and overhead foundations are real and working (6 promises fully supported today). The chapter's core promise — knowing what a sale actually made, what the work cost, and whether to take the next one — requires the six P1 enhancements above, headlined by the labor-hour architecture and the sale-level profitability engine. No doctrine is architecturally blocked, no new parallel financial system is required, and no book wording must be weakened except the two soft items noted.

**Audit ends here. Nothing implemented. No production data modified. No payments, emails, SMS, Customer.io events, referrals, or Houszu transfers executed.**