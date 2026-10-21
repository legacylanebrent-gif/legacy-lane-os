# CHAPTER 15 — ESTATESALEN CROSS-AUDIT REPORT
## PROGRESSIVE INVENTORY, ITEM RECORDS & LIFECYCLE

**Date:** 2026-10-21 · **Mode:** AUDIT ONLY — no builds, no data changes, no deploys, no Chapter 16.
**Sources inspected:** `Item` / `Offer` / `Transaction` / `Activity` / `ItemBarcode` / `SaleItemPricing` / `ItemPricing` / `BuyerIntent` / `Watchlist` / `ItemMessage` / `SaleDiscovery` (schema in full), `SaleInventory.jsx`, `UnifiedItemForm.jsx`, `ItemLabels.jsx`, `CheckoutStation.jsx`, `ScanAndCart.jsx`, `OffersPanel.jsx`, `SoldDetailsDialog.jsx`, `ItemDetail.jsx`, `DiscoveryPanel.jsx`/`DiscoveryDialog.jsx`, `signTemplatesData.jsx`, `analyzeItemImage`, `googleLensPricing`, `processSoldItem`, `generateCartQR`, LaborEntry schema, MarketingKit schema, PrintSigns, RLS configs, plus Chapter 13/14 certification reports.

---

## EXECUTIVE SUMMARY

- **Book promises classified:** 66 core Chapter 15 promises. **~21 fully true today** (existing system outcome), **~29 true with small enhancement**, **~7 genuine build gaps**, **~5 P2**, **~3 later/printable**, **~2 wording changes**. Roughly **32% YES today, 74% YES-or-small-enhancement**.
- **Strongest existing architecture:** (1) ONE `Item` entity already serves inventory, research flags (with operator override), public/marketplace display, QR/labels, checkout sync, and pickup closeout — no item-type fragmentation exists; (2) Chapter 14's discovery→promotion seam is clean, idempotent, and privacy-preserving; (3) sold/paid/pickup truth separation (Order = payment, Item.status = selling state, `pickup_completed_at` = physical release) is already real and disciplined; (4) the sensitive-material AI screen + RLS on research/display fields prevents the classic privacy failures.
- **Largest genuine gaps:** (1) **no inventory levels** (QUICK/STANDARD/RESEARCH/HIGH VALUE) and no operator rules; (2) **no room/zone reference on Item** — location is only geographic; (3) **no item numbering** (labels/QR work, but no human item number); (4) **no verified-fact vs research-note distinction** at item level; (5) **Item photos are a flat public-URL array** — no purpose tagging (research/condition/marketing) and no item-level privacy review; (6) **Offer attaches by `item_name` string, not `item_id`** and never converts to checkout; (7) **no item change history**; (8) manual sold-path creates no financial record (drift risk, Chapter 21 scope).

**Verdict (preview): GO WITH ENHANCEMENTS** — see §49.

---

## 1. CURRENT ITEM MODEL (Part 1)

Grouped from the live schema (field → status):

| Group | Fields | Notes |
|---|---|---|
| Identity | `id`, `sku` (optional, manual), `barcode` (optional) | **No item number.** `marketplace_item_id` links dual-channel record. |
| Description | `title`, `description` | `title` doubles as identity-for-humans (mutable — anti-doctrine). |
| Category | `category` (28-value enum), `subcategory`, `tags` | Solid. |
| Price | `price`, `sold_price`, `original_price` | `original_price` appears **unused** in sale flows. |
| Location | `location {city,state,zip}`, `storage_location_id/path`, `pickup_location {…instructions}` | **No room/zone field** — geographic only. `pickup_location` overlaps `pickup_instructions` captured in SoldDetailsDialog (dual meaning risk). |
| Status | `status` (available/pending/sold/reserved), `sale_phase`, `inventory_display_status`, `marketplace_display_status` | Two parallel display-status fields (dual-channel); `sale_phase` derived at sale time. |
| Photos | `images[]` (flat public-URL strings) | **No purpose/privacy metadata.** No in-form upload UI (photos arrive via sale-photo flows / edits). |
| Research | `research_status` (CLEAR/RESEARCH_NEEDED/VERIFY/SPECIALIST_REVIEW), `research_reason`, `research_flagged_at/_resolved_at`, `research_resolution`, `research_override_by/_by_name/_reason/_at` | Certified Ch3/Ch14. RLS-restricted from public. Strong. |
| Display/handling | `display_attention` (HIGH_VALUE/CONTROLLED_DISPLAY/CHECKOUT_HOLD/STAFF_ATTENTION) | Ch8; internal only. |
| Condition | `condition` enum (new…for_parts) + free `description` | No damage/missing-parts/repairs structure. |
| Dimensions | `dimensions {length,width,height,weight}`, `size` (free text), `shipping_weight` | Structured but no units/diameter. |
| Maker/model | `brand` only | No maker/model/serial/signature/mark/materials fields. |
| Sale state | `estate_sale_id`, `operator_id`, `seller_id`, `sale_team_ids`, `company_id`(absent), `sales_channels[]`, `pre_sale_allowed`, `post_sale_allowed`, `featured`, `included_in_settlement`, `inventory_reminder_*`, `last_synced_at` | `seller_id` vs `operator_id` dual ownership (documented projection). |
| Buyer | `buyer_name`, `buyer_contact` | Operator-recorded snapshots. |
| Payment | `payment_method_used`, `payment_notes` | **Projections** — payment truth lives in Order/Transaction (correct). |
| Pickup | `pickup_completed_at` | Canonical physical-release field (Ch8). |
| Marketing | `featured`, `views`, `saves`, `rating`, `total_reviews`, `sales_channels` | `rating/total_reviews` marketplace-legacy, unused for estate items. |
| Fulfillment | `fulfillment_options`, `shipping_cost`, `digital_download_url` | Marketplace-only; dead weight for estate sale items. |

**Findings:** unused/legacy: `original_price`, `rating`, `total_reviews`, `digital_download_url` (estate context). Duplicates/dual meaning: `category_specs` vs `specs` (two freeform spec objects), two display statuses, `location` vs `pickup_location`. Free text that should STAY free text: `description`, `buyer_contact`, `payment_notes`, `tags`. Hardcoded assumption: `quantity` default 1 is the only grouping mechanism; `seller_amount/company_amount` on Transaction carry a documented LEGACY fixed-split warning.

## 2. INVENTORY LEVELS (Part 2)

**Do not exist.** No `inventory_level` field; no derived logic anywhere (grep confirms zero hits). The four book depths are **＋ BUILD (as ONE enum field + conditional UI)** — derivation alone is unsafe because "high value" depends on custody/risk/marketing need, not stored data (Part 74). One Item entity stays; no level-specific schemas.

## 3. QUICK ITEM (Part 3)

Today's only creation path is `UnifiedItemForm`: required = sales-channel choice, title, price; then category/condition selects, optional brand/size/weight/SKU, category specs. **~6–8 inputs on one screen** — usable but not a "Quick" tier: no room/zone capture, no save-and-add-next, photo upload absent, and channel selection is forced. **Minimum useful record today** = title + price + sale (location/zone missing). → △ ENHANCE (Quick mode: title/price/zone/level, save-and-next).

## 4. STANDARD ITEM (Part 4)

✓ EXISTING/SUPPORTED: photos (via sale-photo flow, not in-form), description, price, condition, QR label (`ItemLabels`) — all supported without research overhead (research defaults CLEAR). Small gaps: in-form photo capture and room location.

## 5. RESEARCH ITEM (Part 5)

Partially existing: `research_status` + reason/resolution + override chain (certified). **Missing vs book:** marks, signatures, model/serial, materials, structured evidence photos, comparable evidence attached to the Item, provenance leads, verification status vocabulary. Comparables today land in `SaleItemPricing`/`ItemPricing` keyed to `image_url`/`photo_url` — **not linked to item_id**. → △/＋ (fields around Item).

## 6. HIGH-VALUE ITEM (Part 6)

Existing handles: `display_attention` (HIGH_VALUE/CONTROLLED_DISPLAY/CHECKOUT_HOLD), research chain, Offer records, `pickup_completed_at`, receipt. **Missing:** controlled location on Item, custody continuity post-promotion, off-site research tracking. Reuse Ch14 `custody_events` pattern; **do not create HighValueItem entity** (it would violate the one-Item doctrine immediately). → △ ENHANCE.

## 7. GROUPED MERCHANDISE (Part 7)

`Item.quantity` (int, default 1) is the only mechanism — "12 paperback books" works as quantity=12, but checkout marks the whole record sold regardless of remaining quantity; no lot/set/box/"contents of shelf" semantics, no included/excluded parts. **Smallest architecture:** keep one Item with quantity + optional `group_note`/`included_items[]` free-text list + honest display ("Set of 6 glasses"). → △ ENHANCE (P1-lite).

## 8. INVENTORY LEVEL ESCALATION (Part 8)

N/A today (no levels). Recommended design: `inventory_level` change is a field update — Item ID, QR (public link), photos, offers, buyer interest all reference `Item.id` and therefore survive by construction. Nothing needs rebuilding. ✓ architecture supports it once the field exists.

## 9. INVENTORY LEVEL DE-ESCALATION (Part 9)

N/A today. Doctrine adopted: level change NEVER deletes evidence — de-escalation only relaxes UI expectations; photos/research/history remain. The existing research chain already models "flagged → resolved without data loss" (`research_resolution` preserved alongside). ✓ pattern exists to copy.

## 10. SINGLE ITEM RECORD (Part 10)

Traced seams: research (Item fields ✓), pricing (Item.price ✓; comparables ✗ keyed to photo URLs), marketing (sale publication payloads read Item ✓), offers (**✗ `item_name` string only**), transactions (**✗ `Transaction.item_name` string; Order.items carries item_id ✓**), pickup (Order/Item ✓). Manual re-entry points: offer→checkout, manual sold path vs checkout path. Mostly single-record; **the offer/transaction name-string seams are the honest gaps.**

## 11. ITEM IDENTITY (Part 11)

`Item.id` is stable and used by QR payload (`?itemId=`), Scan&Cart, checkout sync. Human-readable identity = mutable `title` (anti-doctrine but current reality); `sku` optional manual. **Verdict:** digital identity stable ✓; human identity ✗ (Part 12).

## 12. ITEM NUMBERING (Part 12)

**Does not exist** (no `item_number`; `ItemBarcode` is a product-barcode knowledge repository, not sale numbering). Collision risk today: none (no numbers); once added, generation must be sale-scoped (`sale_id + ordinal`) and never recycled. → ＋ BUILD (small, P1).

## 13. ROOM / LOCATION (Part 13)

**Item has NO zone/room reference.** Ch14 prep zones live on the sale (`EstateSale.prep_zones[].zone_id`); `SaleDiscovery.zone_id` references them; promotion writes a *note* ("Found in {zone}") but no structured link. Smallest fix: `Item.zone_id` + free-text `location_detail` ("Garage — Back Wall"), reusing the existing zone registry — **no fourth room system**. → ＋ BUILD (small, P1).

## 14. LOCATION HISTORY (Part 14)

None. Recommendation: **only for high-value/controlled items**, reusing a single lightweight events mechanism (see §34) — not for all items (overbuild). ↔ custody pattern from Ch14 covers the important cases.

## 15. ITEM LIFECYCLE (Part 15)

Actual states: `status` ∈ available/pending/sold/reserved (+ derived: awaiting-pickup = sold & !pickup_completed_at; released = pickup_completed_at set). Research states live separately on `research_status` (correct separation). Discovery/sorted states stay on SaleDiscovery ✓ (boundary preserved). The book's RESEARCH→READY-TO-PRICE is handled as a **guard** (research ≠ CLEAR blocks pricing/publication unless overridden) rather than a status — architecturally sound; keep.

## 16. STATE MACHINE TEST (Part 16)

`status` is an **enum, loosely enforced**: `handleStatusChange` lets the operator set any value from a dropdown at any time — **sold→available has no void/refund path**, `reserved→sold` fine, no guard preventing `sold` without buyer/payment on the manual path (SoldDetailsDialog collects them but they're optional text). Checkout path is disciplined. Impossible/unsafe transitions found: (a) RELEASED→AVAILABLE possible via dropdown (only `pickup_completed_at` would need clearing — it isn't, so drift is visible but status flips anyway); (b) SOLD→AVAILABLE without refund record; (c) no "awaiting pickup without sold transaction" on checkout path ✓, but the manual path can create sold-with-no-financial-record. **No transition guard exists — classify genuine P1-lite guard or defer state machine to Chapter 21 as planned.**

## 17. SOLD / PAID / PICKUP / RELEASE (Part 17)

Canonical owners (clean): **SOLD → `Item.status='sold'`** (written by checkout sync; manual path also writes it); **PAID → `Order.status='paid'` + payment_method** (checkout) or `Transaction` records (worksheet/POS); **AWAITING PICKUP → derived** (sold && !pickup_completed_at); **RELEASE → `Item.pickup_completed_at`**. Item's buyer/payment fields are labeled projections. Risk: two sold writers with different financial completeness (see §16). No competing truth otherwise. ✓ architecture substantially correct.

## 18. ITEM HISTORY (Part 18)

Preserved today: research timestamps, sold_date, pickup_completed_at, last_synced_at, offer history (multiple Offer records), decision history (SaleClientDecision). **Not preserved:** price changes, status changes, location moves, verification changes on the Item. `Activity` supports sale/contact/deal/property links — **no `item_id`**. `ItemPriceHistory` is a marketplace knowledge-base artifact, not item audit. See §33/§34.

## 19. PHOTO ARCHITECTURE (Part 19)

Item: flat `images[]` of public URL strings — **no purpose, no privacy flag, no reuse tagging.** Sale-level gallery has rich controls (synopsis, skip, excluded_from_public, AI screen) but Item-level does not inherit them structurally. One photo cannot currently be tagged RESEARCH vs MARKETING vs CONDITION. Avoid duplicate uploads goal: **△ ENHANCE** — structured photo objects `{url, purpose, approved_public}` (additive; keep legacy strings readable) or item-level approval list mirroring MarketingKit's pattern.

## 20. RESEARCH PHOTOS (Part 20)

Capture path exists only via Ch14 discovery (private `photo_uri` + AI screen) and sale photos. **No Item-attached research-photo capture** (marks/signatures/underside) — and discovery photos deliberately do NOT copy into Item (privacy doctrine). Employee cannot currently attach mark/serial evidence to an Item. → ＋ with §19 structure.

## 21. MARKETING PHOTOS (Part 21)

Sale-level: ✓ excellent (MarketingKit `approved_photo_indexes`, `excluded_from_public`, never-assume-public doctrine). Item-level: **no explicit public/marketing selection** — all `Item.images` are public-by-construction for marketplace-channel reads. → △ ENHANCE (item-level approval flag rides on §19).

## 22. CONDITION PHOTOS (Part 22)

**Not supported** (no purpose tag). Buyer-facing disclosure would be possible once photos carry purpose + approval. → ＋ small.

## 23. DETAIL-SHOT PROMPTS (Part 23)

**Not present.** Honest classification: **P2** — a deterministic per-category checklist ("photograph the underside, maker's mark") is cheap but not built.

## 24. PHOTO PRIVACY REVIEW (Part 24)

Sale-photo path: ✓ certified (Ch6/Ch14 — screen runs first, fail-safe, human clears). Discovery photos: ✓ private + screened. **Item photos: do NOT structurally inherit the screen** — items built from sale photos inherit only via the sale-photo pipeline that created them; photos added directly to `Item.images` have no review step, and marketplace RLS publishes them. **Genuine P1 gap** (Part 94 candidate) for photos added outside the sale-photo flow.

## 25. DIMENSIONS (Part 25)

Structured `{length,width,height,weight}` + free `size` text. Missing: diameter, units (assumed), material measurements. Verdict: ✓ adequate; do not over-model (doctrine honored). Optional small add: `unit` default inches.

## 26. CONDITION (Part 26)

Enum (5 grades — already used by the product, so grades are legitimate) + description. Supports useful buyer answers at a basic level; no damage/missing-parts/repairs structure. Recommendation: keep enum; add optional structured `condition_notes {damage, missing_parts, repairs}` only if buyer questions demand it — **P2**, free text suffices for now. ✓/△.

## 27. MAKER / IDENTIFICATION (Part 27)

`brand` + `sku` + freeform `specs`/`category_specs` only. No maker/artist/model/serial/signature/mark/materials structured fields. → ＋ small additive block (RESEARCH level only, per §92) so structure appears only when warranted.

## 28. INCLUDED ITEMS (Part 28)

**Not supported** ("dresser includes mirror" lives in description). Smallest fix: optional `included_items[]`/`excluded_items[]` string arrays. → ＋ small (RESEARCH/STANDARD levels).

## 29. BUYER-FACING DETAILS (Part 29)

Public ItemDetail shows price, condition, description, images, seller; ItemLabels QR opens the same public page. Dimensions/brand stored but under-displayed; employees currently answer from the record, not rediscovery — partially true. ✓ with △ display polish (P3).

## 30. VERIFIED FACTS VS RESEARCH NOTES (Part 30)

**Major gap confirmed.** Today: `research_reason`/`research_resolution` free text (operator words), AI category/searchQuery (advisory by prompt design), family statements labeled UNVERIFIED — but **no per-fact verified/unverified distinction**, and nothing prevents an operator from pasting an AI suggestion into `description` (the buyer-facing field) where it becomes company-represented fact implicitly. → ＋ P1: `verified_facts[]` (operator-approved, display-safe) vs `research_notes` (internal), with the AI/marketing paths reading only verified facts. Doctrines otherwise well-labeled where they exist.

## 31. VERIFICATION STATUS (Part 31)

Book's UNVERIFIED/RESEARCHING/REASONABLY VERIFIED/SPECIALIST REVIEW **does not exist**. Product vocabulary is `research_status` (CLEAR/RESEARCH_NEEDED/VERIFY/SPECIALIST_REVIEW). Recommendation: **WORDING SHOULD CHANGE in the book** to the product's terms; "Reasonably Verified" must never appear as warranty language — map to `research_status=VERIFY` resolved + `research_resolution`. No legal/authentication guarantee anywhere ✓ (consistent with licensing doctrine).

## 32. PROVENANCE (Part 32)

Ch14 discovery preserves `family_statement` explicitly labeled CLIENT/FAMILY STATEMENT (research lead, unverified) ✓. On Item: no provenance fields; documentary evidence vs specialist input indistinguishable. → ＋ small (rides §30/§27 blocks; evidence entries with `source_type`).

## 33–38. AI CAPABILITIES (Parts 33–38)

- **33 — AI item identification:** `analyzeItemImage` (deployed, tested this session): vision model returns `sensitive` guard + `category` + `searchQuery`. It does **not** identify marks/makers, state confidence, or produce claims — prompts enforce JSON + sensitive-first guard. Classify: ✓ EXISTING (modest scope, honest).
- **34 — AI description draft:** sale-level ✓ (MarketingKit drafts with brand-truth guardrail + `ai_removals` transparency ledger). Item-level grounded description from verified facts: **NOT YET** (nothing prevents unverified research entering description manually). → ＋ with §30.
- **35 — AI category suggestion:** ✓ EXISTING — analyzeItemImage returns a category suggestion; the human selects/confirms in the form. Not "automatic categorization" (correct to avoid claiming).
- **36 — AI research assistant:** partial — `googleLensPricing` (SERP visual matches, credit/trial gated) + `ItemPricing`/`SaleItemPricing` price-range records. No organized marks/models/signatures evidence store. △/＋.
- **37 — AI comparable support:** ✓ can store/organize comparables via ItemPricing/SaleItemPricing (price ranges + sources), though keyed to photos, not item_id. Chapter 16 owns depth — not started here.
- **38 — AI uncertainty:** **no confidence/uncertainty vocabulary** anywhere (confidence_score exists only on ItemBarcode product matches). Classify genuine gap → P2 (label AI output possible/likely/needs-verification).

## 39. HUMAN APPROVAL (Part 39)

Boundary exists and is real: research states are human-set (AI never writes them), pricing/publication guard requires explicit operator override with who/when/why, marketing photos require explicit approval at sale level, proposals/agreements are operator-presented. Missing only at item description (§30). ✓ substantially existing.

## 40. QR LABELS (Part 40)

✓ EXISTING and healthy: `ItemLabels` generates printable QR sheets (QR = item's **public page URL**, `?itemId=` — same payload Scan&Cart reads; no seller info/research/security data encoded, documented on-page). Reprint anytime (no state). Authorization: operator-only page (admin/operator RLS). Mobile: Scan&Cart decodes → adds to Cart. **Standing dependency carried:** physical phone-camera scan of printed QR → cart/checkout remains only lightly verified physically (Ch8/14 note) — keep carrying forward.

## 41. PRINTABLE PRICE LABELS (Part 41)

✓ label = title + optional price + QR, populated from stored data without re-entry. Missing: item number (Part 12) and room location on label. → △ small.

## 42. REPLACEMENT LABEL (Part 42)

✓ same Item re-prints labels anytime; QR stable via Item.id; no new Item created. Verified by construction (labels page filters live items).

## 43. MOBILE SCAN (Part 43)

Employee scan → item added to cart (Scan&Cart) → checkout. **No post-scan item detail view** (price/status/location/offers/research/pickup at a glance) and no role-based scan view; buyer/public scanning reaches the public item page. → △ ENHANCE (employee scan-view, P1-lite/P2). Buyer-vs-employee QR behavior difference exists implicitly (public page vs authed scanner) ✓.

## 44. HIGH-VALUE LOCATION CONTROL (Part 44)

Today only via Ch14 discovery `controlled_location` (operator/admin-only RLS ✓) — ends at promotion. Item-level controlled location + least-privilege display: **NOT YET**. → ＋ small (reuse pattern; keep RLS-restricted).

## 45. OFF-SITE RESEARCH (Part 45)

**Not supported** on Item (specialist routing exists on discovery; Professional Network exists). Need: who has it / when transferred / expected return / actual return. → ＋ small (custody-event subset; **not** forensic software — 3 event types + dates).

## 46. CUSTODY HISTORY (Part 46)

Ch14 `custody_events` (append-only) lives on the discovery record and is preserved after promotion ✓ — but the chain **stops at promotion**; Item has no custody. Recommendation: custody continuity = keep SaleDiscovery as the historic chain + Item-level controlled-location/off-site events using the SAME event vocabulary (discovery provenance already links them via `promoted_to_item_id`). One continuity chain achievable without a new system.

## 47. FEATURED ITEM (Part 47)

✓ `Item.featured` + Marketing Kit `featured` component + sale `featured_items[]`. Marketing selects stronger items explicitly. Existing.

## 48. MARKETING REUSE (Part 48)

Sale-level: MarketingKit drafts (description/social/email/SMS/QR/signs/featured) all read canonical EstateSale/Item/Company records ✓. Website/publication payloads reuse Item data ✓. But it is **not "one-click"**: multiple manual steps remain (approve photos, review drafts, publish per channel). Classify honestly: ✓ with △ — book should say "coordinated reuse," not one-click.

## 49. ADVANCE BUYER INTEREST (Part 49)

Item-attached buyer interest: **NOT YET for estate Items** (BuyerIntent/Watchlist/ItemMessage are marketplace_item_id-scoped). Estate-side interest arrives as Offers, WantedItem matches, EarlySignIn/VIP — none attach to a specific estate Item.id. Distinction buyer-interest vs offer vs transaction is architecturally clean ✓. → ＋ small (`InterestedBuyer`-lite or Offer with `item_id` + interest type) — Chapter 18 owns expansion; do not build now.

## 50. BUYER INTEREST MATCHING (Part 50)

✓ EXISTING at sale/category level: `matchWantedItemsToSale`/`matchWantedItemOnCreate`, `notifyOperatorOfMatchingBuyers`, buyer alert signups. Item-level matching later (Ch18). Do not build early ✓.

## 51. ITEM AVAILABILITY (Part 51)

✓ `Item.status` is the single authoritative answer, filtered server-side everywhere (inventory, checkout sync, availability check on public page); `syncItemStatusAcrossChannels` reconciles dual-channel drift. Research state never blocks display but guards pricing/publication. No marketing status cache found for items. ✓ strong.

## 52–55. OFFERS (Parts 52–55)

- **52 — Offer record:** ✓ reuses Offer entity (no auctions, no deletion) with buyer/amount/status/notes; **✗ attaches by `item_name` string — no `item_id`** (the form HAS an item select but stores only the name snapshot). Genuine integrity gap.
- **53 — Multiple offers:** ✓ coexist historically; accepted/rejected preserved (panel explicitly keeps history; delete RLS operator-only).
- **54 — Advance offers:** ✓ offers can be recorded any time; `pre_sale_allowed` gates actual early selling; no auction behavior ✓.
- **55 — Offer → sale:** **✗ MISSING** — accepted offer does not flow into checkout/POS; item, buyer, and amount are re-keyed manually. Classify gap; do not build Ch21 transaction-state early — recommend a thin "accepted offer pre-fills a cart/checkout" enhancement in Ch15 P1 or defer with the item_id fix.

## 56. BUYER COMMUNICATION (Part 56)

`Activity` (call/email/sms/meeting…) links contact/deal/sale/property — **no item link**; ItemMessage is marketplace-only. Smallest fix: optional `item_id` on Activity. → △ small. No new communication system ✓.

## 57. SOLD STATUS (Part 57)

**Two paths exist:** (1) CheckoutStation — Order created (paid, buyer, items) then Item synced to sold+buyer+payment (warning surfaced if sync fails ✓); (2) manual dropdown in SaleInventory with SoldDetailsDialog (captures buyer/payment as optional text; creates NO financial record). Canonical: Item.status is selling-state truth; Order/Transaction are financial truth; the manual path is the drift risk (a sold item with no payment record). Not duplicated across Item+Order beyond documented projection. → guard/notice P1-lite; full transaction-state machine = Ch21.

## 58. PAYMENT STATUS (Part 58)

✓ Payment truth: Order (checkout) / Transaction (POS/worksheet). Item carries labeled projections only (`payment_method_used`, `payment_notes`, `seller_amount/company_amount` on Transaction marked LEGACY with settlement authoritative). Financial formulas untouched here. Correct separation.

## 59–62. PICKUP & RELEASE (Parts 59–62)

- **59 — Awaiting pickup:** derived state sold && !`pickup_completed_at`; surfaced in Guided Closeout (Ch8) + pickup plan defaults on sale (Ch13). ✓.
- **60 — Authorized pickup:** `pickup_location.instructions` + SoldDetailsDialog pickup instructions — **no authorized-alternate-person field**; correctly no sensitive ID collection. → △ small optional.
- **61 — Pickup receipt:** ✓ printable SaleReceipt / Order receipt exists (Ch8).
- **62 — Released:** `pickup_completed_at` timestamp IS the release record; no explicit RELEASED status (fine — derived). Distinction SOLD/PAID/AWAITING/RELEASED is answerable today ✓. Ch21 will deepen; nothing premature built ✓.

## 63–66. BACKUP / OFFLINE (Parts 63–66)

- **63 — Printable item list:** ✓ SaleExport + label sheets; a critical-item filtered list does not exist specifically.
- **64 — Offline:** **NO offline support exists** (no service worker/workbox anywhere). The book's "Offline-Friendly Sale Information" **MUST be reworded** to "printable/downloadable backups prepared before connectivity loss." Do not classify as offline app support.
- **65 — Label recovery:** partial — search by title/SKU + reprint ✓; without item numbers, a damaged tag is recovered only by search. Improves with Part 12 numbering.
- **66 — Critical item backup:** ✗ no printable high-value/custody/off-site backup list. → ✎ BOOK/PRINTABLE (small printable critical-item list) rather than offline database.

## 67. PHOTO ORGANIZATION (Part 67)

Photos live in-app on sale/items (not phone threads) ✓; upload path is the sale-photo pipeline (mobile-friendly) — but Item-level in-form capture is absent, so employees add item photos only through sale flows/edits. △.

## 68–69. INVENTORY LABOR (Parts 68–69)

LaborEntry categories include preparation, sorting, cleaning, research, pricing, staging, photography, moving (Ch14) — covering inventory/photography/measurement work semantically; no explicit `inventory`/`measurement` category (minor; `preparation`/`sorting` cover it). Item/category attribution of labor: **NOT YET** — △/LATER (analytics; avoid burdensome time entry ✓).

## 70–71. CATEGORY / DETAIL INTELLIGENCE (Parts 70–71)

Category vs sell-through/interest comparisons: partial via SaleStatistics/marketing performance entities; labor-vs-category: none. Detail-level-value analytics: none. Classify **P2/LATER** — do not fabricate.

## 72. AI INVENTORY COACH (Part 72)

Not present. **P2** — deterministic level *rules* (Part 73) are the honest first step; AI suggestion later.

## 73. OPERATOR INVENTORY RULES (Part 73)

**No equivalent exists.** Recommendation: simple company-level rule list (category→default level, value threshold→suggest level, risk categories→RESEARCH/HIGH VALUE) that SUGGESTS a level at creation (never auto-sets). → ＋ small (P1 or P2).

## 74. LEVEL ≠ VALUE ONLY (Part 74)

Adopted as doctrine for the design: level logic must consider value, buyer-question likelihood, pickup control, research uncertainty, risk, marketing importance, condition complexity, category, custody. Any rule engine must be multi-factor suggestions, not price-only thresholds. ✓ recorded for implementation.

## 75. QUICK CAPTURE UX (Part 75)

Measured: 1 form, ~6 required interactions (channel, title, price, + selects with defaults), no photo/QR requirement, no save-and-add-next, no mobile-optimized quick path (form is responsive but full-featured). Verdict: **not slow, but not QUICK** — quick tier + zone + save-and-next is the P1 enhancement; product does not defeat the chapter, it just doesn't yet deliver the tier.

## 76. BATCH / GROUP CAPTURE (Part 76)

No duplicate, no save-and-add-next, no batch location/category/level. Batch *pricing* modals exist for sale photos, not item creation. → △ ENHANCE (P1-lite: save-and-next + sticky zone/category).

## 77. SALE DISCOVERY → ITEM (Part 77)

✓ Certified promotion carries: description→title, price, research flag→`research_status`+reason, operator/team RLS projections, discovery preserved with `promoted_to_item_id` (idempotent). **Missing handoff:** zone/room (goes into a text note only), photos (deliberately NOT copied — privacy doctrine; but that means no item photo at all), family statement (stays on discovery — visible via provenance link), client-decision outcome (linked decision id stays on discovery). → △ carry `zone_id` structurally (Part 13); photo copy only via explicit human action after privacy review (§24).

## 78. DISCOVERY CUSTODY → ITEM CUSTODY (Part 78)

Chain remains on the discovery record (found→secured→notified→…) and the Item links back via `promoted_to_item_id` — history is not LOST, but Item-time custody (§44/§45) has no home. → continuity via shared event vocabulary (§46).

## 79–85. STAGE TRACES (Parts 79–85)

- **79 Item→research:** ✓ same Item (research fields + override); duplicate notes risk exists (description vs research_reason free text).
- **80 Item→price:** ✓ same Item.price; research-before-pricing guard survives pricing paths (certified Ch14).
- **81 Item→marketing:** ✓ same Item feeds publication payloads/Marketing Kit; research flags RLS-hidden from public; item-level photo approval gap (§21).
- **82 Item→offer:** **✗ name-string seam** (§52).
- **83 Item→transaction:** ✓ checkout references item_id; Transaction (POS/worksheet) uses item_name strings — manual re-entry seam for non-checkout sales records.
- **84 Item→pickup:** ✓ tied to same Item via pickup_completed_at + Order.
- **85 Item→release:** ✓ Item record remains fully available after release; no deletion path for completed items found (delete RLS operator-only; UI confirm only).

## 86. ITEM TRUTH MATRIX

| Truth | Canonical home | Competing sources? |
|---|---|---|
| IDENTITY | `Item.id` (+ future item_number) | title-as-name (display only) |
| DESCRIPTION | `Item.title/description` | none |
| CATEGORY | `Item.category/subcategory` | tags (supplemental, fine) |
| LOCATION | **MISSING** (zone gap) | geographic location ≠ room location (different meanings, both used) |
| PRICE | `Item.price` (sold_price outcome) | ItemPricing/SaleItemPricing = research comparables, not asking price (labeled, acceptable) |
| RESEARCH | `Item.research_*` | none (RLS-guarded) |
| VERIFICATION | partial (`research_status` VERIFY/SPECIALIST_REVIEW) | no dedicated verified-facts record — gap |
| PHOTOS | `Item.images[]` | sale gallery is a separate canonical set (different subject: property vs item) — acceptable, documented |
| CONDITION | `Item.condition` + description | none |
| DIMENSIONS | `Item.dimensions` | size free text (display) |
| MARKETING eligibility | sale-level approvals ✓; item-level ✗ | gap |
| BUYER INTEREST | marketplace systems (marketplace items) / Offer (estate) | not item_id-linked — gap |
| OFFER | `Offer` | item_name seam — gap |
| SOLD | `Item.status` | two writers (checkout + manual) — drift risk |
| PAYMENT | `Order`/`Transaction` | Item projections labeled; Transaction legacy split fields labeled LEGACY |
| PICKUP | `Item.pickup_completed_at` | pickup plan default on sale (planning, labeled) ✓ |
| RELEASE | `pickup_completed_at` (derived) | none |
| CUSTODY | `SaleDiscovery.custody_events` (pre-promotion) | none post-promotion — gap |

## 87. READY-TO-USE TOOLS — ALL 29 CLASSIFIED

| # | Tool | Classification |
|---|---|---|
| 1 | Inventory-level decision guide | ✎ BOOK/PRINTABLE (with operator rules as interactive helper, P2) |
| 2 | Quick-item record | △ ENHANCE (quick tier of existing form) |
| 3 | Standard-item record | ✓ EXISTING (current form IS standard) |
| 4 | Research-item record | △ ENHANCE (research fields exist; add evidence block) |
| 5 | High-value item record | △ ENHANCE (display_attention exists; add custody/location) |
| 6 | Grouped-merchandise worksheet | ✗ DO NOT BUILD as worksheet — interactive quantity+group note is better |
| 7 | Item photography checklist | ✎ BOOK/PRINTABLE (P2 in-app prompts) |
| 8 | Research-photo guide | ✎ BOOK/PRINTABLE (P2) |
| 9 | Furniture measurement sheet | ↔ COVERED by Item.dimensions (structured) |
| 10 | Condition-description guide | ✎ BOOK/PRINTABLE (enum exists) |
| 11 | Maker/mark documentation sheet | △ ENHANCE (structured fields, RESEARCH level) |
| 12 | Provenance notes | △ ENHANCE (provenance entries with source types) |
| 13 | Research-needed label | ✓ EXISTING (`RESEARCH BEFORE PRICING` sign template + research flags) |
| 14 | Specialist-review label | ✓ EXISTING (research_status SPECIALIST_REVIEW + Who Can Help routing) |
| 15 | High-value merchandise label | ✓ EXISTING (display_attention HIGH_VALUE/CONTROLLED_DISPLAY) |
| 16 | QR price labels | ✓ EXISTING (ItemLabels) |
| 17 | Standard price tags | ✓ EXISTING (labels include price) |
| 18 | Sold tags | △ small printable (status is digital; tag optional) |
| 19 | Paid/Awaiting-pickup tags | △ small printable (derived state exists) |
| 20 | Pickup authorization | △ ENHANCE (optional alternate-person field) |
| 21 | Pickup receipt | ✓ EXISTING (SaleReceipt/Order receipt) |
| 22 | High-value custody record | △ ENHANCE (reuse Ch14 custody events on Item) |
| 23 | Off-site research record | ＋ BUILD small (custody subset) |
| 24 | Item location sheet | △ printable after zone field exists |
| 25 | Offer record | ✓ EXISTING (needs item_id link) |
| 26 | Advance-interest tracker | ↔ COVERED by EarlySignIn/VIP/WantedItem at sale level; item-level later (Ch18) |
| 27 | Photo privacy checklist | ↔ COVERED by AI screen + approvals (item-level gap noted §24) |
| 28 | Inventory backup list | △ small printable (SaleExport exists; add critical-item filter) |
| 29 | Inventory completion checklist | ✎ BOOK/PRINTABLE (deterministic NEEDS INFORMATION lists, §93) |

## 32 (§88). DO-NOT-REBUILD — CERTIFIED SYSTEMS CHAPTER 15 MUST REUSE

Item entity (one merchandise record) · SaleDiscovery + custody_events + promotion idempotency · EstateSale.prep_zones (zone registry) · research flags + operator override chain · SaleClientDecision (KEEP/SELL/REVIEW) · SaleIssue · Offer · Contact/Activity · Order/Transaction/CheckoutStation/ScanAndCart · pickup_completed_at/Guided Closeout · PrintSigns + ItemLabels QR · MarketingKit + publication payload services · analyzeItemImage sensitive screen · Professional Network (specialist routing) · LaborEntry · Chapter 13 Project Dashboard/dependency model · Chapter 8 checkout/receipt · brand-truth guardrail (shared) · ItemPricing/SaleItemPricing comparables · EarlySignIn/VIP/WantedItem buyer-interest systems.

## 33 (§89). NEW ENTITY TEST

**No new core entity justified.** All P1 needs are fields/relationships on Item (+ Offer.item_id, Activity.item_id). **Sole exception considered:** append-only item event/custody ledger. Activity lacks item linkage but is a communication/activity log — reusing it for custody/location/off-site events would blur semantics; however a *separate ItemEvent entity* is not yet PROVEN necessary: the Ch14 custody-event pattern can be reproduced as `Item.custody_events[]` / `Item.location_events[]` (append-only arrays, same as SaleDiscovery.custody_events precedent) with zero new entity. **Recommendation: no new entity in P1.**

## 34 (§90). ITEM HISTORY ARCHITECTURE

Existing Activity = communication log (no item link, wrong semantics). Recommendation (smallest): (a) append-only structured arrays on Item for consequential item-scoped changes (custody/location — mirroring custody_events); (b) an optional `item_id` on Activity for buyer communication history; (c) price/status changes: rely on existing offer/decision/settlement history + a tiny `price_changes[]` append if sales-team audit demands it — defer otherwise. No generic ItemHistory entity now (noise risk).

## 35 (§91–93). SMALLEST RECOMMENDED ARCHITECTURE (DO NOT IMPLEMENT)

1. `Item.inventory_level` enum (QUICK/STANDARD/RESEARCH/HIGH_VALUE, default STANDARD) — one field, no new entities/schemas.
2. `Item.zone_id` + `Item.location_detail` (reuse prep-zone registry; no fourth room system).
3. `Item.item_number` (sale-scoped ordinal, generated server-side, immutable, on labels/QR sheets).
4. Conditional form requirements by level (recommended-not-rigid; §92: QUICK = title/price/zone; STANDARD = + photos/condition/dimensions-where-relevant; RESEARCH = + evidence block/marks/serial/provenance; HIGH_VALUE = + custody/controlled location/pickup control). Deterministic completeness labels only — **NO percentages** (READY / NEEDS INFORMATION / RESEARCH REQUIRED / PICKUP INFORMATION NEEDED).
5. `Item.photos` purpose + public-approval tagging (additive structured object), wired to the existing sensitive screen + MarketingKit-style approval.
6. `verified_facts[]` vs `research_notes` on Item (facts vs leads; marketing/AI read verified only).
7. `Offer.item_id` + accepted-offer prefill into checkout (no new transaction states).
8. `Activity.item_id` (optional link) for buyer communication history.
9. Item custody/location event arrays (HIGH_VALUE only) reusing Ch14 vocabulary.
10. Operator inventory rules (suggestions, never auto-set).
11. Quick capture mode (save-and-next, sticky zone/category) + grouped-merchandise `group_note`/`included_items[]`.

## 36. INTERFACE / DATA / WORKFLOW / PERMISSION GAPS

Interface: no quick tier; no in-form photo capture; no employee scan-detail view; no item number on labels. Data: no zone/level/number/verified-facts/purpose-tagged photos; Offer/Transaction name-string seams. Workflow: offer→checkout manual; two sold writers; no save-and-next; label recovery by search only. Permissions: research/display-attention RLS ✓ strong; item photos public-by-construction (no approval flag) ✗; controlled-location RLS ✓ discovery-only.

## 37. P0 / P1 / P2 / P3 / LATER

**P0 (genuine):**
1. Item photos added outside the sale-photo pipeline have no privacy screen/approval before marketplace-public RLS exposure (§24/§94).
2. Manual sold path can mark sold/record payment text with NO financial record and no guard (status flips freely incl. sold→available without void path) — at minimum a warning; full machine = Ch21. (Severity: process-risk, not data corruption; classify honestly as P0-guard / P1-fix.)

**P1 (minimum to make Ch15 substantially true):** inventory_level + conditional UX · quick capture/save-and-next · zone_id/location_detail · item_number + labels · Offer.item_id · verified-facts vs research-notes · photo purpose/approval on Item + screen wiring · discovery→item zone/photo handoff · item custody/off-site arrays (HIGH_VALUE) · item-level marketing selection · deterministic completeness labels · operator rules (optional P1-lite).

**P2:** detail-shot prompts · AI uncertainty labels · item-level AI description from verified facts · authorized-alternate pickup · employee scan-detail view · printable critical-item/sold/awaiting-pickup tags · AI inventory coach · category labor attribution.

**P3/LATER:** category-performance intelligence · detail-level-value review · predictive sell-through · computer-vision batch inventory · advanced offline sync · Chapter 18 item-level buyer matching.

## 38. BOOK TRUTH (all promises; legend: YES / YES-OUTCOME / SMALL-ENH / BUILD / P2 / LATER / PRINTABLE / WORDING / DO-NOT-BUILD)

Quick Item SMALL-ENH · Standard Item YES · Research Item SMALL-ENH · High-Value Item SMALL-ENH · Grouped Merchandise SMALL-ENH · Single Item Record YES (offer/txn seams noted) · Room & Location BUILD(small) · Item Status YES · Photo Library SMALL-ENH · Item History BUILD(small) · Research Photos BUILD(small) · Marketing Photos SMALL-ENH · Condition Photos BUILD(small) · Detail-Shot Prompts P2 · Photo Privacy Review SMALL-ENH (P0 seam) · Dimensions YES · Condition Notes YES · Maker & Identification SMALL-ENH · Included Items BUILD(small) · Buyer-Facing Details YES · AI Item Identification YES · AI Description Draft SMALL-ENH · AI Category Suggestion YES · AI Research Assistant SMALL-ENH · AI Comparable Search YES-OUTCOME · AI Uncertainty P2 · Verified Facts Record BUILD(P1) · Research Notes YES · AI Marketing Copy YES-OUTCOME (sale-level) · Verification Status WORDING (use research_status terms) · Human Approval YES · QR Labels YES · Printable Price Labels YES · Item Numbering BUILD(small) · Replacement Labels YES · Mobile Scan YES-OUTCOME (enrichment P2) · Location Changes BUILD(HIGH_VALUE only) · High-Value Location Control BUILD(small) · Off-Site Research BUILD(small) · Custody History SMALL-ENH · Featured Item YES · One-Click Marketing Reuse WORDING ("coordinated reuse") · Advance Buyer Interest BUILD(small)/Ch18 · Buyer Interest Matching YES-OUTCOME · Item Availability YES · Offer Record YES (item_id gap) · Multiple Offer History YES · Advance Offers YES · Offer-to-Sale BUILD(small) · Buyer Communication SMALL-ENH · Sold Status YES (two-path risk) · Payment Status YES · Awaiting Pickup YES · Authorized Pickup SMALL-ENH · Pickup Receipt YES · Released Status YES-OUTCOME (derived) · Printable Item Lists YES · Offline-Friendly WORDING (printable backups only) · Label Recovery YES-OUTCOME (improves w/ numbering) · Critical Item Backup PRINTABLE · Inventory Labor YES-OUTCOME · Category Performance P2 · Detail-Level Review LATER · AI Inventory Coach P2 · Operator Inventory Rules BUILD(small) · Inventory Levels BUILD(P1 field).

## 39 (§86 restated) — see ITEM TRUTH MATRIX above.

## 40. ITEM LIFECYCLE MATRIX

| Stage | Canonical entity/field | Entry condition | Exit condition | Human action | Automatic action | History preserved? | Current gap |
|---|---|---|---|---|---|---|---|
| ITEM CREATED | Item | promotion or manual create | record exists | operator/staff creates or promotes | RLS projections derived | created_date ✓ | no level/zone/number |
| RESEARCH | Item.research_status ≠ CLEAR | flagged (human/AI-advised) | resolved or overridden | flag/resolve/override (who/when/why) | guard blocks pricing/publication | research timestamps ✓ | no evidence store |
| READY TO PRICE | research CLEAR or override present | guard released | price set | operator prices | none | override recorded ✓ | none material |
| AVAILABLE | Item.status available | created/priced | sold/reserved/pending | — | public/marketplace display (RLS) | — | zone display missing |
| OFFERED | Offer records | buyer interest recorded | accepted/rejected | operator records/responds | none | offer history ✓ (kept, no delete) | item_name seam; no conversion |
| SOLD | Item.status sold (+buyer/payment projections) | checkout or manual | pickup or status change | checkout / manual+dialog | checkout syncs Item; warning on failure | sold_date ✓ | manual path = no financial record; no transition guard |
| PAID | Order.status paid / Transaction | payment at checkout / POS recorded | — | — (checkout flow) | order created before Item sync ✓ | order retained ✓ | manual path absent |
| AWAITING PICKUP | derived (sold && !pickup_completed_at) | sold, not picked up | pickup_completed_at set | closeout step | surfaced in Guided Closeout | — | none (derived, honest) |
| RELEASED | Item.pickup_completed_at | pickup completed | — (terminal) | closeout | — | timestamp ✓ | no explicit status (acceptable) |

(DISCOVERED/SORTED remain on SaleDiscovery outside Item lifecycle ✓ — boundary preserved.)

## 41. INVENTORY LEVEL MATRIX

| Level | Purpose | Minimum data | Optional data | Required guardrails | Label/QR | Custody | Current support |
|---|---|---|---|---|---|---|---|
| QUICK | ordinary low-value, speed | title, price, zone, status | photo, category | none extra; never blocks | optional | none | ✗ (one-size form) |
| STANDARD | normal sale merch | + photo(s), condition, category | dimensions, brand | research defaults CLEAR | yes (QR label) | none | ✓ (current form) |
| RESEARCH | uncertain/valuable | + research flag, evidence photos, marks/serial notes | provenance, comparables | pricing/publication guard (certified) + verified-fact boundary | yes | optional | △ (flags ✓, evidence ✗) |
| HIGH VALUE | important/controlled | + custody/controlled location, condition evidence | off-site tracking, verified facts | custody RLS, checkout-hold display, pickup control | yes | expected | △ (display_attention ✓, custody ✗) |

## 42. PHOTO MATRIX

| Purpose | Default | AI privacy screen? | Can market? | Human approval? | Current support |
|---|---|---|---|---|---|
| RESEARCH | should be private | yes (existing screen) | only after review | yes | ✗ no purpose tag (discovery photos ✓ private) |
| CONDITION | private | yes | disclosure only when approved | yes | ✗ |
| DETAIL | private-by-default | yes | with approval | yes | ✗ (flat array) |
| MARKETING | not public until approved | yes (sale-photo path ✓) | yes | yes (sale-level ✓) | △ sale-level ✓; item-level ✗ |
| CUSTODY/EVIDENCE | private, RLS | yes | never | n/a | △ discovery custody photo ✓; item ✗ |

## 43. DISCOVERY → ITEM MATRIX

| Route | May become Item? | Required resolution | Data carried forward | History retained? |
|---|---|---|---|---|
| SELL | yes — explicit promote | operator promotes | description→title, price, research flag | ✓ full chain + promoted_to_item_id |
| RESEARCH | yes (with flag) | promote or research-resolve | research_status/reason | ✓ |
| FAMILY_KEEP | no (client keeps) | decision recorded | none (decision link) | ✓ |
| CLIENT_DECISION | conditional on decision | SELL decision → promote | decision outcome | ✓ |
| SPECIALIST | conditional | specialist outcome → operator promotes | research flags | ✓ |
| SENSITIVE | no (privacy) | controlled handling | none | ✓ (never merchandise) |
| DONATION | no | donation workflow | none | ✓ |
| RESTRICTED | **no — certified guard** | appropriate review | none | ✓ (no promote path, fixed Ch14) |

## 44. END-TO-END ITEM TRACE (conceptual, no test data created)

Representative: signed artwork found in Dining Room. **DISCOVERY** (zone, statement labeled UNVERIFIED, private screened photo) → **PROMOTE** (Item created; research flag carried; ✗ zone only in a text note, ✗ no photo carried) → **RESEARCH** (flag + Lens comparables land in ItemPricing keyed to photo URL, ✗ not item_id; ✗ mark/serial evidence has no home) → **PRICE** (Item.price; guard honored ✓) → **MARKETING** (featured + publication payload reuse Item ✓; photo approval sale-level ✓, item-level ✗) → **BUYER INTEREST** (✗ no item-attached interest; WantedItem category match only) → **OFFER** (recorded ✓ but ✗ name-string seam) → **TRANSACTION** (checkout: Order paid ✓, Item sync ✓; ✗ offer amount re-keyed manually) → **PICKUP** (instructions + receipt ✓) → **RELEASE** (pickup_completed_at ✓, record retained ✓). **Re-entry seams:** zone, evidence photos, offer→checkout, comparable linkage.

## 45. PRODUCT DOCTRINES — CONFIRMED/VIOLATED

Confirmed: one Item entity; discovered≠inventoried; sorted≠priced; sensitive≠merchandise; sold≠paid≠picked-up; facts-first labeling (family statement); AI advisory-only; no percentage completeness (Ch14 doctrine extends); no item-type fragmentation. Violated today: "record becomes more valuable through the sale" (no level/evidence escalation path); "capture only what merchandise justifies" (one-size form); "the physical item and digital record stay connected" (no item number for tag recovery); "important items deserve more evidence" (no evidence structure).

## 46. INVENTORY LEARNING LOOP

CAPTURE ✓ → ENRICH △ (no tiered escalation) → RESEARCH ✓ → VERIFY △ (no fact/verification record) → PRICE ✓ (guard) → MARKET ✓/△ (item-level photo approval) → SELL ✓ (two-path drift) → RELEASE ✓ → MEASURE ✗ (no category/labor analytics) → IMPROVE RULES ✗ (no operator rules). Broken transitions: enrich, verify, measure, rules — all classified P1/P2/LATER above; none blocks the core loop.

## 47. RECOMMENDED IMPLEMENTATION SEQUENCE (DO NOT IMPLEMENT)

1. **P0 guard:** item-photo privacy screen/approval seam (reuse analyzeItemImage + approval flag).
2. Item P1 foundation: `inventory_level` + `zone_id`/`location_detail` + `item_number` + labels.
3. Conditional form tiers + quick capture/save-and-next + grouped-merchandise fields.
4. Facts-vs-research: `verified_facts[]`/`research_notes` + evidence block (maker/serial/provenance) at RESEARCH level; AI description reads verified only.
5. Offer integrity: `Offer.item_id` + accepted-offer checkout prefill; sold-path warning (full state machine deferred to Ch21).
6. HIGH_VALUE custody/off-site arrays + printable critical-item/sold/awaiting-pickup tags; Activity.item_id.
7. Operator inventory rules (suggestions) + deterministic completeness labels.
8. P2 batch: detail-shot prompts, AI uncertainty labels, scan-detail view, coach.

## 48. PRE-LAUNCH DEPENDENCIES (carried forward)

From Ch14 (unchanged, not Ch15 blockers): FAMILY KEEP manual gesture · returned-to-client resolution gesture · research override UI manual pass · pricing-tool research-hold notice manual pass · zone QR print/physical scan · **Chapter 14 certification fixture cleanup (still pending — fixture sale/deal/discoveries/decision/tasks/items)** · second-account RLS checks · SMS certification · Houszu certification · physical Item QR → phone camera → checkout/receipt. Ch15-specific: item-photo privacy seam (P0), manual sold-path guard, offer→checkout seam, offline wording correction in the book.

## 49. CERTIFICATION

**GO WITH ENHANCEMENTS.**

Rationale: the architectural skeleton is right — one Item entity, disciplined truth ownership (Order=payment, Item= selling state, pickup_completed_at=release), certified research/privacy/custody guardrails, and a clean discovery→item boundary. The chapter's promises are ~74% true-or-small-enhancement; the gaps are additive fields and UX tiers, not structural rework. Certification is conditional on: (1) closing the item-photo privacy P0 seam, (2) adding the P1 block (levels/zone/numbering/verified-facts/offer link) before the book claims Quick/Research/High-Value tiers, (3) rewording "Offline-Friendly" and "One-Click Marketing" claims, and (4) carrying the manual-sold-path drift risk into Chapter 21 rather than duplicating it now.

**STOPPED. Chapter 15 not built. Chapter 16 not started. Awaiting explicit authorization.**