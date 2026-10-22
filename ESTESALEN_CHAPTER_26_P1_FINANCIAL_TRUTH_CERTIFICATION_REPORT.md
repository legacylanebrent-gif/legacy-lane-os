# ESTATESALEN — CHAPTER 26 PHASE 1 FINANCIAL TRUTH CERTIFICATION REPORT

**Scope:** Chapter 26 P0 repairs — truthful labor cost and contribution accounting (unknown labor rates are never $0; wage costs are never double-counted) — verified end-to-end against the live application, plus the AI profitability seam.

**Status: CERTIFIED — all executed checks passed.** Certification was performed against the running application with purpose-built fixtures (created, verified through the real operator UI, then deleted; no residue remains in production data).

---

## 1. Repairs Implemented

### 1.1 Unknown labor rate ≠ $0 (canonical economics model)
`saleEconomicsModel.js` now classifies every non-owner labor entry as either KNOWN (hours × recorded rate, including an explicit rate of $0) or UNKNOWN (rate absent). Unknown hours are surfaced as `laborUnknownHours`; while any exist, the sale's contribution is labeled PARTIAL and can never be presented as complete. An explicit $0 rate stays KNOWN — it is a recorded fact, distinct from an absent one.

### 1.2 One cost, one effect — wage deduplication
Where a `labor_wages` Expense exists alongside rated labor entries for the same sale, the wage expense line is EXCLUDED from direct costs (the labor entries already carry that cost as hours × rate). The exclusion is disclosed on screen ("EXCLUDED from direct costs — their economic effect is deduplicated"), and both source records are preserved unchanged. Wage expenses with NO rated labor hours remain fully included (labeled "no hours tracked"). Non-wage expenses (supplies, advertising, contract services, etc.) are never deduplicated.

### 1.3 Truthful partial presentation
- Contribution figure carries an explicit "INCOMPLETE (PARTIAL, FROM KNOWN COMPONENTS)" header and states that complete contribution cannot be determined until missing rate(s) are recorded.
- Per-hour and margin metrics display "· partial" while incomplete; metrics that cannot be computed show an honest em-dash ("— (no hours recorded)") rather than a computed-looking value.
- Owner time is reported in hours only ("an economic resource, never included in cash cost or contribution") with an owner-share metric making dependence on unpaid owner time visible, never hidden.
- The Sale Closeout checklist gates on incomplete labor economics (finalization surfaces the gap rather than silently accepting a partial figure).

### 1.4 Downstream surfaces updated
Economics panel, Sale Closeout gate, Labor Entries panel, Deal Economics / acceptance review, and the AI Coach grounding context + system prompt guard all consume the canonical model — no surface re-derives or contradicts it. Verified separately: `generateSaleRecap` / `publishSaleRecap` contain no contribution/labor references, and no Sale Export (including the Financial Summary PDF) exports labor cost or contribution — no side channel can turn an unknown into a zero.

### 1.5 AI profitability seam (defect found and fixed during live certification test)
The AI Coach grounded its answer on the sale record's `actual_revenue` field, which is **0 by default until settlement is finalized**. The first live test produced a false claim ("records show actual revenue was $0 … no profit generated") while $10,000 of merchandise was sold — the same silent-zero class of defect, on the revenue side. Fixed in `operatorAiCoach/entry.ts`:
- The operations context now derives sold-item revenue from records and labels it as derived.
- When settlement is not finalized, the context and the sale-context prompt state "NOT YET FINALIZED" and instruct the model to never report $0 revenue or claim "no profit" from the unfinalized field.
- The labor-truth grounding (unknown rates, dedupe disclosure, incomplete-economics warning) ships in the same context block.

---

## 2. Certification Test Results (executed against the live app)

Five fixtures (composite, complete, unknown-only, labor-only, expense-wage-only) were created and verified through the real Sale Closeout economics UI, then deleted.

| # | Check | Result |
|---|-------|--------|
| 1 | Known rate 25h × $20 → $500 known cash labor cost | PASS |
| 2 | Absent rate (10h) surfaced as UNKNOWN hours, "never $0"; unknown-only sale shows $0 known cost but PARTIAL contribution, never presented complete | PASS |
| 3 | Explicit $0 rate (5h) stays KNOWN — unknown hours count is 10.0, not 15.0 | PASS |
| 4 | Partial contribution header "INCOMPLETE (PARTIAL, FROM KNOWN COMPONENTS)" on the unknown-rate sale | PASS |
| 5 | Owner time (10h) shown in hours only, never cash cost; owner-share metric 20% | PASS |
| 6 | Fixture A composite totals: gross $10,000 · company revenue $3,500 · direct costs $900 · contribution $2,600 PARTIAL · margin 74.3% · partial | PASS |
| 7 | Labor-only sale (no expenses): contribution −$150 presented COMPLETE, no incomplete markers | PASS |
| 8 | Expense-wage-only sale (no labor entries): wage $500 included as cash labor ("no hours tracked"), contribution −$150 COMPLETE, per-hour metrics honest em-dash | PASS |
| 9 | Wage dedupe: $500 wage expense EXCLUDED (direct costs $900, not $1,400) with visible disclosure | PASS |
| 10 | Distinct contract labor ($300) still included as a cost | PASS |
| 11 | Supplies ($100) present, never deduplicated | PASS |
| 12 | Complete sale (all rates known): contribution $900 with NO incomplete markers — regression: completeness is still reachable and cleanly presented | PASS |
| 13 | Unknown-only sale: 40 unknown hours, INCOMPLETE + PARTIAL markers present, $4,500 figure labeled partial | PASS |
| 14 | AI coach, unknown-rate sale (before fix): hedged labor correctly but claimed "$0 revenue / no profit" from unfinalized field | FAIL → fixed |
| 15 | AI coach, unknown-rate sale (after fix): no $0-revenue or profit claim; states revenue not finalized and complete profit cannot be determined; no console/invocation errors | PASS |
| 16 | No export surface (recap generators, sale exports incl. Financial Summary PDF) exposes labor cost or contribution — no side channel converts unknown → $0 | PASS (static audit) |
| 17 | Fixture cleanup: all created records deleted and verified gone (no CH26-P1-CERT residue) | PASS |

## 3. Notes and Residual Items

- The coach's post-fix answer is honest but generic (it defers to finalization rather than quoting the derived $10,000). This is a quality nit, not a truth defect; the grounding lines are available to richer modes.
- Certification P2/Chapter wording corrections beyond the implemented labels are tracked as follow-on work.