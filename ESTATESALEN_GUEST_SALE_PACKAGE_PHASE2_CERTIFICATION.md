# ESTATESALEN — ONE-TIME ESTATE SALE PACKAGE — PHASE 2 CERTIFICATION REPORT

Date: 2026-11-09
Scope: AI allowance integration, usage/cost tracking, paid featured placements ($19 local / $49 national), lifecycle verification, sale-status write paths, regression.

## 1. Decisions applied

| Decision | Implementation |
| --- | --- |
| $147 per weekend | `GUEST_SALE_PACKAGE.amount = 147.00`, bound once per sale |
| 60 standard AI descriptions | `ai_description_allowance = 60` set server-side at checkout; enforced in the canonical photo pipeline |
| Deep Scan separately metered | Never counted against the allowance; still billed through search credits (`checkGoogleLensCredits`) |
| Local Featured $19 / National $49 | `FEATURED_PLACEMENTS` (own products, own entitlement kinds) |
| Existing payment infrastructure | Same `create-checkout` → Base44 Payments → `wix-payments-webhook` verified-grant path |

## 2. What was built

- **AI allowance gate (canonical pipeline only).** `runPhotoAnalysis` checks the sale's bound package *before* any model call. At zero remaining it returns `allowance_exhausted` with a plain message and spends nothing. The client stops cleanly and shows the message.
- **Count only persisted successes.** Consumption happens at exactly one point: after the description has been written to the photo (`stage: described`). A failed call, a release, or a retry of a photo that already reached that stage never increments the count.
- **Unlimited manual work preserved.** The gate only blocks AI descriptions; manual item entry, manual pricing, signage, checkout and reporting are untouched.
- **Usage + cost tracking.** Each consumed description increments `ai_descriptions_used` and `ai_usage` (`descriptions`, `estimated_cost_usd`, `cost_basis`, `last_at`) on the sale's entitlement — internal reporting only, never charged.
- **Paid placements.** `create-checkout` product `featured_placement` (owner-only, refuses completed sales, refuses duplicates and in-flight payments) creates a pending entitlement bound to that sale. The webhook switches the placement on **only** after `APPROVED` + `PAID` + exact amount/currency match. A placement paid after the weekend ended is recorded `expired` and never switched on.
- **Automatic expiry.** Placement liveness is computed from the sale's last sale day on every read; the paid record is closed and the sale flags cleared on completion and by the enforcement path.
- **Canonical status transitions.** Sale completion now goes through `salePublish { action: 'complete' }` instead of a browser write (`SaleCloseout`).
- **No free placement toggles.** Removed from `CreateEstateSaleModal` and replaced in `MySales` by paid purchase buttons.

## 3. Certification results (actually executed)

| Check | Result |
| --- | --- |
| Allowance exhausted blocks before any model call | PASS — `allowance_exhausted`, remaining 0, no spend |
| Description persisted → allowance 59→60 | PASS — real description produced, `ai_descriptions_used = 60` |
| Next analysis after exhaustion blocked | PASS |
| Placement expiry when weekend passed | PASS — entitlement `expired`, flag cleared, audit entry |
| Paid placement inside its weekend survives enforcement | PASS — flag kept, sale stayed `upcoming` |
| Refund retires access, sale preserved | PASS — `refunded`, sale → `draft`, title/photos intact |
| Dispute retires access | PASS — `disputed`, sale → `draft` |
| Reactivation restores paid state | PASS — back to `bound` |
| Completed sale cannot be republished | PASS — `completed_sale_cannot_be_republished` |
| Completion transition through server | PASS — `salePublish complete` → `completed` |
| Historical access to completed sale | PASS — record readable, status action returns `completed` |
| Professional operator publishes on subscription, no package | PASS — `approval_source: subscription`, `upcoming` |
| Webhook fails closed on unsigned payload | PASS — 401 `Invalid signature` |
| Clean build | PASS — no unresolved imports or build errors |

## 4. NOT certified (and why)

- **Live card checkout + real entitlement grant on a non-admin guest account.** Not executed. This requires a real guest login and a real charge; a simulated webhook is explicitly not accepted as proof. The two guest-side branches below therefore remain unproven in production.
- **Guest publish refusal → purchase → publish (second sale).** Cannot be exercised without a guest session: every automated call ran as an admin/operator, which correctly took the subscription path.
- **Placement checkout reaching the provider.** The function refuses to build a return URL without the app URL header, which the internal test harness does not send; it is reachable from the browser only.
- **Deep Scan spend with real credits.** Structure verified (not counted, separately metered), not measured live.

## 5. Residual risks

1. A nightly sweep is not scheduled. Placement liveness is computed from sale dates on every read, and records close on completion/enforcement, but a sale whose weekend ended and was never completed keeps its stored flag until the next enforcement call. No discovery surface currently reads that flag, so there is no live exposure — only stale data.
2. Featured placements have **no discovery boost** today: listing queries do not sort or highlight by the placement flags. Nothing promises visibility.
3. The allowance is per photo description, so a group photo consumes one of the 60 like a single item.
4. The unit-cost figure used for internal tracking is an estimate, not a measured provider invoice.

## 6. Readiness verdict

Phase 2 build work is complete and all backend-verifiable behaviour passes. The guest package is **not yet cleared for Phase 3** until one real end-to-end run is completed on a real non-admin guest account: pay $147 → package appears → sale publishes → 60 descriptions metered → closeout → second sale refused → second purchase → publish → one $19 or $49 placement → weekend ends → placement expires.