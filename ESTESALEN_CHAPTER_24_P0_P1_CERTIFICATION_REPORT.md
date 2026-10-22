# ESTATESALEN — Chapter 24 P0/P1 Certification Report

**Date:** 2026-10-22
**Scope:** Chapter 24 P0 (AI safety, authority, provenance) and P1 (AI-use policy, manual fallback, automation transparency)
**Method:** Live backend-function tests against disposable certification fixtures, code trace against the Chapter 24 constitution, preview UI verification, and full fixture cleanup (zero residue confirmed).

---

## P0 items

### P0-1 — AI Coach server-side authorization (CERTIFIED, with one hardened fix)
- `operatorAiCoach` now loads the sale via service role and enforces authorization **before any context assembly**: operator, sale-team member, or platform admin only. Deny happens before the sale record is used in any prompt context.
- The AI prompt receives **city/state only** — the property street address is no longer sent to the model.
- **Test 1 (allow path):** coach invoked with an operator-owned sale → 200, grounded, record-anchored guidance (unknowns stated as unknown, no invented figures). PASS.
- **Test 2 (deny path):** nonexistent sale id → 404, no context assembled. PASS.
- **Hardening fix applied during certification:** a malformed record id previously escaped as a raw 500 (the SDK throws before the not-found branch). The sale load is now guarded — malformed ids fail closed as 404. Re-tested: 404 clean. PASS.
- **Known gap (documented, pre-existing):** cross-tenant denial (operator A asking for operator B's sale) cannot be machine-tested from the single admin account available; the ownership check is code-verified (`user.id === sale.operator_id || sale_team.includes || role==='admin'`). Flagged for the second-user RLS verification already on the pre-launch checklist.

### P0-2 — SaleRecap draft-review-approve publication (CERTIFIED)
- Sale completion (`processSoldItem` → recap path) creates only a **private draft**; no automatic public publication anywhere.
- `generateSaleRecap` sends **no financial figures** to the AI and stores `actual_revenue` / `estimated_sale_value` as null on the recap record.
- `publishSaleRecap` is the **only** publication path: operator/admin only, writes `published_at` / `published_by_name`, logs a "Sale recap published" Activity, strips financials.
- **Test 3 (draft):** recap generated → status `draft`, AI summary present, `actual_revenue` null, no revenue in the AI input. PASS.
- **Test 4 (idempotent replay):** re-generate while draft exists → reuses the same record, no duplicate. PASS.
- **Test 5 (empty identifier):** blank sale id refused. PASS.
- **Test 6 (publish provenance):** publish → status `published`, `published_by_name` recorded, Activity logged. PASS.
- **Test 7 (re-publish no-op):** publish again → `already_published`, timestamps untouched. PASS.
- **Test 8 (post-publish replay):** generate after publish → `skipped: already_published`, no un-publish, no duplicate. PASS.
- Draft records are hidden from other users by record-level access rules (draft readable only by operator/admin).

### Near-P0 — Pricing-evidence ownership guard (CERTIFIED, code-verified)
- `googleLensPricing` comparable-evidence write path verifies sale ownership before persisting evidence. Live test skipped to avoid spending SerpAPI credits on a throwaway fixture; ownership check code-verified. **Not automatically verified live.**

---

## P1 items

### P1-A — Recap review & provenance UI (BUILT; UI verified partially — see Verification Status)
- `RecapPublishCard` on SaleCloseout: draft state, AI-GENERATED DRAFT provenance banner, human publish action with confirm, published state with who/when.
- ManualFallbackKit page (`/ManualFallbackKit`): printable continuity kit — checkout/payment fallback procedures, manual capture sheet, failure & recovery checklists. Linked from the Live Sale command center.
- `AiUsePolicyCard` on BusinessDocuments: company AI-use policy with the human-approval matrix, reusing the BusinessDocument vault (no parallel document system).

### P1-B — Automation transparency (CERTIFIED)
- Recap generation logs "why did this happen" Activity entries (`source: automation`) for both draft creation and human publication.

---

## Defect found and fixed during certification

- **ClosingFileCard crash (Chapter 23 P1 component, Ch24 regression surface):** a sale with an empty `access_closeout` block (the schema default `{}`) crashed the entire SaleCloseout page — `accessCloseout.status.toLowerCase()` on a missing status, and the truthy-object check also mis-marked an unrecorded block as "ready". Fixed: readiness now requires an actual recorded status; the note renders "not yet confirmed" when no status exists. **Fix is applied but the page re-render was not re-captured (preview budget exhausted); the same-path error-boundary remount could not be driven. Not automatically re-verified.**

---

## Verification status summary

| Check | Status |
|---|---|
| Coach allow path (own sale, grounded) | PASS (live test) |
| Coach deny path (404, malformed id hardened) | PASS (live test) |
| Coach cross-tenant denial | Code-verified; not machine-testable single-account — on the manual second-user pre-launch checklist |
| Recap draft generation (private, no financials) | PASS (live test) |
| Recap replay idempotency (draft + post-publish) | PASS (live test) |
| Recap publish provenance + activity log | PASS (live test) |
| Publish re-run no-op | PASS (live test) |
| Pricing-evidence ownership guard | Code-verified only (SerpAPI credit avoided) |
| SaleCloseout renders (ClosingFileCard null-status crash) | Fix applied; **not re-verified** after edit |
| RecapPublishCard / ManualFallbackKit / AiUsePolicyCard rendering | Built and code-reviewed; not re-captured this turn |
| 390px mobile sweep of new pages | Not attempted this turn |
| Fixture cleanup (2 sales, 1 recap, coach conversation, 3 activities) | PASS — zero residue confirmed |

---

## Remaining open items (carried on the master checklist)
1. Manual pre-launch RLS verification for second-user Company isolation (unchanged, pre-existing).
2. Re-open `/SaleCloseout` for any completed sale to confirm the ClosingFileCard fix renders, plus a quick mobile-width pass on SaleCloseout / ManualFallbackKit / BusinessDocuments.
3. 13 undeclared backend secrets (B1-02) — unchanged, platform-config dependency.