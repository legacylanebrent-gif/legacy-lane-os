# Chapter 17 P1 — Implementation & Certification Report

Date: 2026-10-21 · Verdict: **CERTIFIED (with items marked NOT AUTOMATICALLY VERIFIED below)**

## Scope completed (implementation)

- **Schema (additive only, no competing systems):**
  - `EstateSale.prep_zones` extended with the staging layer (staging_purpose, category_plan, signage_needs, equipment_needs, lighting_concern, flow_concerns, staging_notes, sale_day_status) — Chapter 14 prep truth (prep_status) is never overwritten.
  - `EstateSale.customer_flow` (entry/exit/checkout/queue) and reuse of the canonical `pickup_plan` / `discount_schedule`.
  - `Item.pickup_requirements` (scheduled_required, pickup_window, additional_people, equipment_needed, assistance_required, special_handling), `Item.disassembly` + `disassembly_note`, `Item.removal_note` (internal by default).
  - `SaleIssue.category` extended with sale-floor categories (safety, customer_flow, signage, display, pricing, checkout, lighting) — same entity, no StagingIssue.
  - `LaborEntry.work_category` extended with sale-floor categories (grouping, lighting, signage, sale_floor_maintenance).
- **Deterministic model:** `src/components/staging/stagingModel.js` — zone projections, opening blockers from open safety/customer_flow issues, readiness derived from record inspection only (no percentages).
- **UI:** `ZoneStagingPanel` + `StagingReadinessCard` (Project Dashboard), `SaleFloorSigns` (item-tied SOLD signs, discount-stage signs from the Chapter 16 discount_schedule, pickup signs, category-sign generator, buyer-guide QR) wired as the "Floor Signs" tab on Print Signs; `PublicBuyerGuide` at `/SaleGuide?id=…` rendering ONLY safe public truth; removal & pickup planning added to `UnifiedItemForm`; sign library template content repaired and Upstairs/Downstairs/Basement directional signs added.
- **Safety guards:** duplicate-sale guard in ScanAndCart/CheckoutStation; sold→available confirmation in SaleInventory; printing a sign is a snapshot and never mutates Item.price or sold/pickup state.

## Verification results (live preview, throwaway records)

| Check | Result |
|---|---|
| Buyer guide renders from safe fields (desktop) | **PASS** — hours, entry/exit/checkout, open-zone names, restricted-zone names only (no reasons), 25% discount stage, pickup window; no private fields (commission, sold_price, access_details) in the rendered body |
| New schema fields persist (EstateSale staging/flow/discount; Item pickup_requirements/disassembly/excluded_from_discounts) | **PASS** — create → read-back round trip |
| Buyer guide mobile (390px-class) | **PASS** — renders, no horizontal scroll |
| Floor Signs tab (Print Signs, mobile) | **PASS** — all four cards render; buttons correctly disabled when no sold items / stages; no horizontal scroll |
| Throwaway data cleanup | **PASS** — test sale + test item deleted, confirmed gone |
| Production build | **PASS** — vite build clean |

## Fixes made during verification

- Print Signs page: removed two blocking `alert()` calls (the app already banned this pattern — it froze the page thread) — now non-blocking redirect to My Sales.
- Print Signs page: QR generation is now fire-and-forget with event-loop yields between QRs, so the page renders immediately instead of waiting on the full image set; the loading state no longer blocks on QR generation.

## Not automatically verified (needs a live sale with real items / two participants)

- Duplicate-sale guard at Scan And Cart / Checkout Station (requires driving a real cart against production sale records).
- Sold → available confirmation dialog in Sale Inventory (same reason).
- Zone staging panel interactions on the Project Dashboard with an operating sale.
- Pre-launch manual verification of cross-company RLS and photo-access security (carried over).

## Doctrine compliance

- No percentage readiness scores; readiness is categorized, deterministic, record-derived.
- Printed signs are snapshots: no sold state, no price change, no pickup authorization from printing.
- Buyer guide contains only public sale truth; zone names without reasons; no client PII, no economics, no access plan.
- AI staging coach language remains hedged; no safety/compliance claims anywhere.