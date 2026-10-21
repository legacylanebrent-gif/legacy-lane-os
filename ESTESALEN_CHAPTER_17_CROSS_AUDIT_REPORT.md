# CHAPTER 17 — ESTATESALEN CROSS-AUDIT REPORT
## STAGING, SALE-FLOOR DESIGN & CUSTOMER FRICTION

Audit date: 2026-10-21. AUDIT ONLY — nothing built, no data modified, no communications sent, no synthetic production records created, no deployment.

Verification method: direct source inspection of the deployed surfaces (PrintSigns.jsx + signTemplatesData.jsx, ItemLabels.jsx, prepareModel.js, PrepZonesPanel.jsx, EndOfDayPanel.jsx + discoveryModel.js, AiStagingCoachPanel.jsx, ScanAndCart.jsx, CheckoutStation.jsx, ItemDetail.jsx, SaleInventory.jsx, saleActivationTemplate.ts, changeItemPrice), the canonical entity schemas (Item, EstateSale, SaleDiscovery, SaleTask, SaleIssue, SaleEquipmentAssignment, EquipmentAsset, LaborEntry, SaleClientDecision, Offer, Order/Cart), and workflows/permissions as documented in Chapters 13–16 certification reports. No test data was created.

---

## EXECUTIVE SUMMARY

- **Of 106 audit parts: ~44 already EXISTING / SUPPORTED by canonical systems, ~22 are small ENHANCEMENTS of existing systems, ~12 are genuine gaps needing modest P1 work, ~14 are BOOK/printable or checklist (non-software) items, ~10 are P2/AI or LATER, ~4 are DO-NOT-BUILD.** Roughly **65% of Chapter 17 is achievable today as an existing-system outcome**; most of the remainder needs only zone/Item field extensions and one walkthrough/checklist surface — no new core entity.
- **Strongest existing architecture:** the Chapter 14 zone registry (prep_status, access_class, security_flags, removal/protection notes), Chapter 15 Item completeness (dimensions, condition, included/excluded, zone/location, item_number, display_attention, custody), Chapter 16 pricing guardrails, the deterministic Prepare-Sale readiness model, the SaleTask/SaleIssue dependency spine, PrintSigns + ItemLabels printable surfaces, and the Scan & Cart / Checkout Station QR loop.
- **Largest genuine gaps:** (1) prep zones carry no staging/display/customer-flow fields and no sale-day states; (2) no customer-flow / bottleneck walkthrough; (3) no item-tied SOLD sign or physical↔digital status reconciliation check; (4) buyer-facing item page omits dimensions/pickup info that canonical Item already holds; (5) no "How This Sale Works" buyer guide; (6) most legacy sign templates are title-only placeholders (empty content), so signage is catalog-named but not data-driven; (7) no room completion standard or staging labor alert.

---

## 1. STAGING WALKTHROUGH

**Classification: ＋ BUILD (small) — one pre-opening walkthrough surface assembled from existing checklists.**

There is no single workflow that considers entrance, exit, stairs, hallways, customer flow, restricted areas, checkout, furniture removal, bottlenecks, and property protection TOGETHER. The pieces exist but are fragmented:
- **Security walkthrough** — SaleTask checklist prefixed `Security:` (prepareModel.js, ProjectDashboard), covering restricted areas and display-attention handling.
- **Checkout setup** — SaleTask checklist prefixed `Checkout Setup:` (location, device, payments, pickup process).
- **Site assessment** — EstateSale.site_assessment (stairs, parking, loading access, pickup constraints, sale-day restrictions, community restrictions).
- **Zone architecture** — access_class (OPEN_TO_CUSTOMERS / STAFF_ONLY / CLOSED_RESTRICTED / PICKUP_ONLY / CHECKOUT), security_flags, removal_route_note, protection_note per zone.

**Finding:** Chapter 14/8 checklists cover most inputs but are fragmented across three surfaces. A "Staging Walkthrough" tab on PrepareSale assembling these + a few new deterministic points (entrance/exit, flow, furniture removal) is the smallest gap-closer. No new entity.

## 2. ROOM / PREP-ZONE FOUNDATION

**Classification: ✓ EXISTING / SUPPORTED as foundation; △ ENHANCE for staging fields.**

Chapter 14 prep zones (EstateSale.prep_zones) already carry: zone_id, name, source (consultation room / excluded area / manual), prep_status, assignee, **access_class (customer access ✓)**, **security_flags**, **removal_route_note (furniture removal ✓)**, **protection_note (property protection ✓)**, condition photo, notes, completed_at. The SAME zone/room can support staging information with a small additive extension. Do not create another room system — confirmed.

## 3. ROOM SETUP PLAN

**Classification: ＋ BUILD (additive zone fields).** Missing per-zone: room purpose (sale-display vs prep vs storage), planned merchandise categories, display requirements, signage needs, equipment needs, staging status, lighting concern. See §26/§89 for smallest schema. Customer access already exists (access_class).

## 4. CUSTOMER PATH

**Classification: ＋ BUILD (operational checklist / zone fields, not CAD).** No explicit ENTRY / CHECKOUT / EXIT sequence exists on the sale. Sale record has property address and (via pickup_plan) a pickup location; checkout location is only checklist text. Smallest architecture: three operational text fields on the sale (entry point, checkout location, exit/large-item route) + the walkthrough checklist. No floor-plan engineering.

## 5. BOTTLENECK FLAGS

**Classification: ↔ COVERED BY EXISTING SYSTEM (SaleIssue) with △ ENHANCE.** SaleIssue supports categories (property_access, merchandise, pickup, other) and blocking_areas already include **staging, sale_opening, marketing, pickup**. Narrow hallway / stairs / doorway / tight turn / crowding / checkout conflict / furniture-removal conflict can be recorded today as SaleIssues with category + blocking_areas. Enhancement: add a FLOW category value for clean reporting. No new entity.

## 6. CUSTOMER-FLOW REVIEW

**Classification: ＋ BUILD (deterministic walkthrough, reuses Staging Walkthrough from §1).** The deterministic review questions (can buyer tell where to enter / where to shop / where not to go / where is checkout / can people pass / can large purchases leave) become named checklist items in the walkthrough — executed through the existing SaleTask checklist mechanism (same pattern as Security:/Checkout Setup: prefixes). No new engine.

## 7. MERCHANDISE CATEGORIES

**Classification: ✓ EXISTING.** Item.category carries 26 enum values plus subcategory. A staging view can compute category distribution by zone today by aggregating Item.zone_id × category (one aggregate call). No separate staging categories exist — confirmed none needed.

## 8. ROOM CATEGORY PLAN

**Classification: ＋ BUILD (small).** Operator cannot currently record "KEEP THIS CATEGORY HERE" / "CONSOLIDATE TO ANOTHER ZONE" as a plan. Smallest architecture: a per-zone `category_plan` array (category, intent KEEP/CONSOLIDATE, note) on the zone — a planning record only; Items do not move until physically moved. No Item mutation on planning.

## 9. RELATED ITEMS

**Classification: ✓ EXISTING (partial) / △ ENHANCE (light).** Existing: Chapter 15 grouped merchandise (group_note + quantity), included_items, ItemDetail already renders "related items" (line 508 of ItemDetail.jsx). Chapter 14 related-item tasks exist via SaleDiscovery.linked_task_ids. Missing: a lightweight operational association (display together / matching / part of collection) that is NOT a relationship engine. Smallest option: `display_group` string on Item (operator-assigned group label; zones + reports group by it). Avoid a relational Item↔Item entity.

## 10. COLLECTION RULES

**Classification: △ ENHANCE (derive; do not duplicate included/excluded).** KEEP TOGETHER / MAY SEPARATE / OPERATOR APPROVAL REQUIRED has no field today. Smallest: one Item-level enum `grouping_policy` (or a group-level field if display_group from §9 is adopted). It must NOT overlap included_items/excluded_items (which answer "what comes with it", not "may it be split").

## 11. BETTER-ITEM FLAG

**Classification: ✓ EXISTING / DO NOT BUILD another.** HIGH_VALUE (inventory_level), featured, high_consequence_research, display_attention, research_status, verification_status already express every "better item" truth. Confirmed: no new flag.

## 12. DISPLAY PRIORITY

**Classification: ↔ COVERED BY EXISTING SYSTEM (derivable).** NORMAL / FEATURED / HIGH VISIBILITY / SECURE DISPLAY can be DERIVED deterministically: featured flag → FEATURED; HIGH_VALUE/display_attention → HIGH VISIBILITY; controlled_location or display_attention CONTROLLED_DISPLAY → SECURE DISPLAY; else NORMAL. Recommend a derived view helper, not a stored field.

## 13. HIGH-VALUE PLACEMENT

**Classification: ✓ EXISTING (custody/controlled location) + △ ENHANCE (staging view).** Item.controlled_location (operator-only RLS), custody_events, display_attention, and the security walkthrough's high-value handling review all exist. A staging surface can list HIGH_VALUE items with their display_attention and security-walkthrough considerations WITHOUT exposing controlled_location to non-owners (RLS already enforces; staging views must not project it). Gap: no explicit "intended placement" staging note — covered by §26 zone display notes or the security checklist.

## 14. FURNITURE VISIBILITY

**Classification: ✎ BOOK / CHECKLIST RULE (no data model).** No system reminder exists that merchandise placed ON furniture can hide that the furniture itself is for sale. Correct architecture: one checklist line in the Staging Walkthrough + a guidance note in the staging coach. Not a field.

## 15. LIGHTING

**Classification: △ ENHANCE (zone flag or issue).** No INSUFFICIENT LIGHTING flag exists. Smallest: a boolean + note on the zone (lighting_concern) or a SaleIssue with a LIGHTING category value. No lighting-design software.

## 16. FURNITURE IDENTIFICATION

**Classification: ✓ EXISTING.** Furniture flows through normal Item architecture (category "furniture", dimensions incl. depth, materials, condition, included/excluded). Confirmed: NO Furniture entity needed.

## 17. AUTOMATIC MEASUREMENT REUSE

**Classification: ✓ EXISTING (data) / △ ENHANCE (buyer display).** Item.dimensions (L/W/H/depth/weight/unit) is canonical. The label generator and staff inspect views consume zone/location, not dimensions; **ItemDetail (buyer-facing) does NOT currently display dimensions** (verified by grep). Gap is display-only — data already exists without re-entry.

## 18. CONDITION REUSE

**Classification: ✓ EXISTING.** Item.condition enum + condition_notes (damage/missing/repairs/summary) is the single condition truth; buyer ItemDetail displays condition. No second furniture-condition field — confirmed none exists, none needed.

## 19. INCLUDED COMPONENTS

**Classification: ✓ EXISTING.** Item.included_items / excluded_items answer leaves/cushions/shelves/keys/hardware/matching pieces exactly as Chapter 15 designed. Buyer-facing display of these on ItemDetail is not confirmed — display enhancement only.

## 20. PICKUP REQUIREMENTS

**Classification: ＋ BUILD (small Item extension).** Missing per-item: scheduled-pickup-required, two-person removal, equipment needed, operator assistance, special procedure. EstateSale.pickup_plan (project default window/location/instructions) and Item.fulfillment_options / pickup_location exist. Smallest schema: an Item-level `pickup_requirements` object/enum set (see §90). Reuses pickup architecture — no new entity.

## 21. FURNITURE QR

**Classification: ✓ EXISTING (QR mechanics + privacy) / △ ENHANCE (buyer payload).** Public QR (labels, sign QR sheets) encodes only the public item id → public ItemDetail. Verified: no seller info, research flags, display attention, security or cost encoded (ItemLabels.jsx header comment + payload code). Research/custody photos stay in photo_library private by default. Staff scans open the role-appropriate inspect dialog (ScanAndCart). **Gap:** the public ItemDetail page does not surface dimensions/pickup instructions that the record holds — the QR destination under-delivers for furniture.

## 22. FURNITURE REMOVAL PLAN

**Classification: ✓ EXISTING (zone-level) / △ ENHANCE (item-level).** Zone-level removal route exists (removal_route_note, P1-41) and site assessment carries stairs/loading/pickup constraints. Per-Item removal plan (exit path, doorways, obstacles, floor protection, equipment) is missing — smallest: reuse §20 pickup_requirements + one `removal_note` on Item. Lightweight operational fields, not a structural model.

## 23. DOORWAY / STAIR NOTES

**Classification: ↔ COVERED (zone removal_route_note + site_assessment.stairs_levels + Item removal_note from §22).** No structural property model — confirmed none needed.

## 24. DISASSEMBLY

**Classification: ＋ BUILD (small Item field).** No CAN/MUST/DO NOT/UNKNOWN disassembly field exists. Smallest: Item enum `disassembly` (CAN_DISASSEMBLE / MUST_DISASSEMBLE / DO_NOT_DISASSEMBLE / UNKNOWN, default UNKNOWN) + optional note. One field, honest default.

## 25. PICKUP WINDOWS

**Classification: ✓ EXISTING (project default) / △ ENHANCE (per-item override).** EstateSale.pickup_plan.pickup_window is the default window; display_attention CHECKOUT_HOLD covers held high-value items. Per-large-item designated windows: smallest is an optional window string inside §20 pickup_requirements (or a SaleTask with due date). No duplicate calendar — confirmed none exists, none needed.

## 26. BUYER PICKUP INSTRUCTIONS

**Classification: △ ENHANCE (flow-through, no re-entry).** EstateSale.pickup_plan.instructions is the canonical project default. Today the receipt (SaleReceipt) and public ItemDetail do not demonstrably render pickup instructions. Once Item carries pickup_requirements and the sale carries pickup_plan, instructions can flow to receipt + ItemDetail from one source without repeated entry. Gap is wiring, not architecture.

## 27. LIVE ITEM STATUS

**Classification: ✓ EXISTING.** Canonical chain: available/pending(reserved)/sold (Item.status) + payment truth in Order/Transaction + pickup_completed_at (absent = awaiting pickup) + authorized_pickup. Checkout writes status + payment method + buyer info (CheckoutStation completeCheckout, "truthful current-state sync"). HOLD for high-value is display_attention CHECKOUT_HOLD (deliberately not a status). AWAITING PICKUP is derived (sold + pickup_completed_at absent) and the SaleInventory backup list already surfaces "awaiting pickup" as a critical category. No duplicate financial truth — confirmed.

## 28. PHYSICAL VS DIGITAL STATUS

**Classification: ✕ DUPLICATE RISK IDENTIFIED — the major Chapter 17 gap.** There is NO mechanism reconciling physical tags/signs with digital status. Stale-status risks: a paper price label printed before a changeItemPrice stays wrong until reprinted; a buyer removing a physical item has no sold-marker until checkout; a sold item awaiting pickup can be confused with available on the floor. Today only the generic 'sold' / 'sold-awaiting-pickup' / 'item-sold-do-not-remove' sign TEMPLATE NAMES exist (content empty). **Genuine gap — see §29/§31.**

## 29. PRINTABLE SOLD SIGNS

**Classification: ＋ BUILD (small).** PrintSigns has SOLD-family template names but (a) empty content placeholders, and (b) NO generation path that ties a Sold sign to a specific Item (item number / title / sold status). Gap: a "Sold signs" generator that prints item-number + short-title signs for items with status sold / display_attention, driven from canonical Item state. This is a printable snapshot — printing never changes status (§82).

## 30. QR STATUS CHECK

**Classification: ✓ EXISTING.** Staff scan (ScanAndCart) opens ItemInspectDialog showing the current canonical operational state (status, research, custody, price) — role-appropriate; public QR shows only public truth. Verified in ScanAndCart.jsx (P1-34) and ItemLabels privacy header.

## 31. STATUS ALERTS

**Classification: △ ENHANCE / ＋ BUILD (small guard).** No existing guard was found that warns when: a sold Item is set back to available, a pickup-completed item reappears active, or a duplicate sale occurs. CheckoutStation syncs status at sale time only. Smallest: deterministic UI warnings in the inventory status control (warn on sold→available without a recorded reason; block duplicate checkout of the same item — ScanAndCart already carries an explicit add path but duplicate-sale protection at checkout completion should be verified/hardened). Chapter 21 must NOT be built early — these are warnings only.

## 32. READABLE PRICE LABELS

**Classification: ✓ EXISTING.** ItemLabels prints QR + zero-padded item number + title + zone/location + optional current price, per-item selectable, from canonical data with no re-entry. Confirmed exactly the Chapter 15 label system.

## 33. CATEGORY PRICING SIGNS

**Classification: ✓ EXISTING (static catalog) / △ ENHANCE (custom).** PrintSigns carries ~40 named category pricing templates (Books, Clothing Womens, Hand Tools, Toys Games, etc.) — the operator's real sign library. These are STATIC templates (content placeholders), independent of Item records — which is doctrinally correct for low-value grouped merchandise (no Item record required). Gap: most templates have EMPTY content strings (titles only), and there is no "custom category + price" generator. Enhancement: fill/allow custom category-price signs. No Item linkage required — confirmed.

## 34. DISCOUNT SIGNS

**Classification: ＋ BUILD (small, honest).** EstateSale.discount_schedule (Chapter 16) exists, but PrintSigns CANNOT generate discount signs from it — today's discount signs are static templates ('pricing-perc-off', 'over-10-50-perc-off', DOT Day1/Day2). Gap: a generator that renders each configured discount stage (name, percent, note, excluded note) as a printable sign, with the snapshot doctrine printed on it. Printed sign = snapshot of the plan; Item.price remains the only price truth.

## 35. SPECIAL PRICING RULES

**Classification: △ ENHANCE (derive from Chapter 16).** Item.excluded_from_discounts, negotiation_override (NO_DISCOUNT_WITHOUT_OPERATOR), and Company.negotiation_policy exist. Signage can derive "NO DISCOUNT" markers (label flag or a filtered printable list of excluded items) from these canonical fields. No new authority field — confirmed.

## 36. MISSING PRICE CHECK

**Classification: ✓ EXISTING (deterministic) / △ ENHANCE (staging view).** The research guard (researchGuard.js, Chapter 16) guards pricing/publication progression for non-CLEAR research states; SaleInventory surfaces research/price states and the backup list flags critical items. A staging-facing deterministic check (items with no price, non-CLEAR research without override, unresolved verification) can be assembled today; it just isn't rendered as a "staging readiness" list yet. Deterministic — confirmed; no AI needed.

## 37. ENTRANCE SIGNS — ✓ EXISTING (templates: 'Enter Here', 'Gate Opens at 10 am', 'Sale Starts 10 am', 'Starting Time', "We're Here Walk In"); content placeholders to fill.
## 38. DIRECTIONAL SIGNS — ✓ EXISTING (templates: 'Exit Here', 'Garage w/ Arrow', 'Parking', 'Upstairs/Downstairs' NOT present — small template additions; no system needed).
## 39. RESTRICTED AREA SIGNS — ✓ EXISTING (templates: 'Do Not Enter', 'Not For Sale'; zone architecture from Chapter 14; prep-zone printable signs with access class). Confirmed reuse.
## 40. CHECKOUT SIGNS — ✓ EXISTING (templates: 'Checkout', 'Please See Cashier', payment-method signs incl. Venmo/Zelle QR).
## 41. SOLD SIGNS — see §29: template names exist; item-tied generation is the gap.
## 42. PICKUP SIGNS — ✓ EXISTING (templates: 'Pickup Instructions', 'Pickup Area'); △ ENHANCE: generator from EstateSale.pickup_plan + Item pickup_requirements instead of blank content.

## 43. POLICY SIGNS

**Classification: ✓ EXISTING (static templates) / ✎ WORDING.** No-refunds, no-large-bags, no-public-restroom, remove-shoes, video-cameras, payment-method signs exist as templates. Doctrinally correct: policies are operator content, NOT hardcoded by the platform — confirmed the app does not hardcode legal/business policy text. The discount/hold policies per sale come from canonical fields (§35).

## 44. QR INFORMATION SIGNS

**Classification: ✓ EXISTING (mechanics) / △ ENHANCE (buyer-guide destination).** QR sheets print per-photo QRs linking to public ItemDetail or EstateSaleDetail; zone QRs link to the authenticated prep view (private-safe, confirmed). Missing: a public SALE-level QR that opens a buyer guide (§51/§53) — the destination page, not the QR mechanics, is the gap.

## 45. CHECKOUT LOCATION

**Classification: ＋ BUILD (small).** No sale/zone field stores the designated checkout location; it lives only in the checkout-setup checklist text and zone access_class CHECKOUT (which marks a zone as checkout, partially covering this). Smallest: one `checkout_location` string on the sale (with the zone link already possible via access_class).

## 46. QUEUE REVIEW

**Classification: ✎ CHECKLIST (no entity).** Waiting space / blocked merchandise / entry-exit conflict / stairs-doors / high-value display conflict are checklist lines in the Checkout Setup walkthrough (existing prefix pattern). No data model — confirmed none needed.

## 47. POS READINESS

**Classification: ✓ EXISTING.** SaleKitTemplate → SaleEquipmentAssignment projection (packed / pack-out states), prepareModel's Checkout + Equipment areas (device, payments, pickup process; unpacked equipment counts), and consumable restock flags cover device/tables/bags/wrapping as equipment entries. Receipt printing exists (SaleReceipt). Power/connectivity/cash procedures: covered by checklist items, not data — appropriate.

## 48. EXIT VISIBILITY

**Classification: ✎ CHECKLIST.** The checkout walkthrough includes pickup process; exit awareness should be one added checklist line. No security guarantee implied — wording rule.

## 49. LARGE-PURCHASE WORKFLOW

**Classification: ✓ EXISTING END-TO-END.** Trace verified: Item → (buyer scans QR → cart) OR (operator records Offer → accepted → converted_cart_id/converted_at handoff, Chapter 15 idempotent) → CheckoutStation completes → Order created (payment truth) → Item.status sold + sold_price/buyer/payment fields → sold item remains in house → authorized_pickup (name) → pickup_completed_at → custody event RELEASED for controlled items. No duplicate workflow found. Gaps are the physical-sign and buyer-instruction seams (§28/§29), not the workflow.

## 50. FIRST-TIME BUYER EXPERIENCE

**Classification: ＋ BUILD.** EstateSaleDetail (public) shows hours, address, photos, featured items, payment methods, notes. Nothing explains entry → shopping → checkout → sold merchandise → furniture purchase → pickup → discounts as a first-time-buyer orientation. Genuine gap (§51/§53).

## 51. HOW THIS SALE WORKS

**Classification: ＋ BUILD (small, derived).** No generator exists. Smallest: a printable + QR-linked buyer guide assembled from canonical truth only — sale dates, payment_methods, pickup_plan, discount_schedule (stages + exclusions note), access classes (which areas open), special_notes — with MISSING VALUE honesty where not configured. Do not invent policies.

## 52. POLICY VISIBILITY

**Classification: △ ENHANCE (wiring).** Payment methods and special notes exist on the sale and render publicly; discount approach lives in SaleScope/plan. Gap: consistent rendering at the buyer guide + checkout surfaces rather than verbal-only. Wiring, not new truth.

## 53. QR BUYER GUIDE

**Classification: ＋ BUILD.** No public sale-level QR route to a buyer guide exists today (QRs go to sale detail / item detail / authenticated prep view). Gap confirmed. Must draw from public-safe canonical fields only; no admin data. The existing QR-sheet mechanics make this a small addition.

## 54. CUSTOMER QUESTION REVIEW

**Classification: ✎ BOOK / LATER (P2 for AI).** Reducing repeated questions is the aggregate outcome of §29–§53. An AI "customer question review" is P2 and should stay behind the deterministic signage/guide work. Not built — confirmed.

## 55. STAGING LABOR

**Classification: ✓ EXISTING.** LaborEntry.work_category already includes **cleaning, staging, sorting, pricing, photography, moving, staging, sale_day, pickup, closeout** — every Chapter 17 staging category except a distinct SIGNAGE value (covered by 'staging'/'other'). No new labor entity — confirmed.

## 56. LABOR BUDGET

**Classification: ✓ EXISTING.** SaleConversionPipeline.labor_estimates (category, hours, rate, is_owner_time) vs LaborEntry actuals — the Chapter 4/9 projected-vs-actual comparison exists (DealEconomicsPanel / closeout economics). Staging/prep hours roll into preparation-category comparisons. No new budget system.

## 57. LABOR ALERT

**Classification: ＋ BUILD (small, deterministic).** No current alert when actual prep/staging labor approaches/exceeds the estimate (EndOfDayPanel shows today's hours; closeout compares totals after the fact). Smallest: a deterministic threshold read in the prep/labor surface comparing cumulative actual vs estimate by category (approaching = warn; exceeding = strong warn). Deterministic — no AI.

## 58. PRIORITY STAGING

**Classification: △ ENHANCE (derive).** prepPriorityCues already exist in discoveryModel (deterministic cues from zones/discoveries/deadlines). A Chapter 17 staging-priority order (SAFETY → high-value/featured → pricing → shoppable rooms → signage → checkout → marketing → polish) can be DERIVED from open SaleIssues (blocking areas), research holds, missing prices, zone statuses, and equipment state. Deterministic ordering from existing records — enhance the cue builder, do not invent a scoring engine.

## 59. ROOM COMPLETION STANDARD

**Classification: ＋ BUILD (deterministic checklist — major Chapter 17 concept).** Zone prep_status ends at 'complete' (prep sense). No ROOM READY standard exists covering: walkway clear, customer access established, restricted areas protected, merchandise organized, important items visible, pricing complete, required signs placed, lighting adequate, removal issues addressed. Smallest: a Staging checklist per zone executed through SaleTask (prefix `Staging:` — exactly the Security:/Checkout pattern), plus a derived zone READY state = prep complete AND staging checklist complete AND (no open flow issues on the zone). NO percentage readiness — confirmed doctrine.

## 60. ROOM STATUS (SALE-DAY STATES)

**Classification: △ ENHANCE (additive, careful).** Chapter 14 prep_status (untouched→…→complete) is PREPARATION truth. Sale-day states (SETUP/READY/ACTIVE/DEPLETED/CONSOLIDATE/CLOSED) must NOT corrupt prep history. Smallest: a separate `sale_day_status` field on the zone object (default unset pre-opening), never overwriting prep_status/completed_at. See §91.

## 61. SALE-DAY RECOVERY TASKS

**Classification: ✓ EXISTING (substrate) / △ ENHANCE (template).** SaleTask supports recurring/assigned tasks with categories, priorities, provenance. ACTIVATION_TASKS includes 'Sale Day Operations' generically but NO recovery-task template set (straighten, return abandoned merchandise, clear walkways, replace signs, check sold tags, maintain checkout, remove empty equipment). Smallest: a one-click "add sale-day recovery tasks" template creating SaleTasks. No new task system — confirmed.

## 62. CONSOLIDATION

**Classification: △ ENHANCE (zone sale-day state + task).** Marking CONSOLIDATE THIS ROOM is a zone sale_day_status value (§60) or a SaleTask/issue. No new entity.

## 63. EMPTY EQUIPMENT REMOVAL

**Classification: ✓ EXISTING (architecture supports it).** SaleEquipmentAssignment entries (tables/racks) with pack-out states exist; during the sale an empty table can be flagged by adding a SaleTask ("Remove: folding table — Garage") and updating the assignment. A dedicated mid-sale flow is a small enhancement at most. Do not create new equipment truth.

## 64. LIVE FLOOR NOTES

**Classification: ✓ EXISTING.** SaleNote (team memory) and SaleIssue (unresolved questions with categories incl. merchandise/pickup/property_access + blocking areas incl. staging/sale_opening) cover crowding, blocked walkways, missing signs, broken displays, sold-item confusion, pickup conflicts today. No LiveFloorNote entity — confirmed none needed.

## 65. AI STAGING COACH

**Classification: ✓ EXISTING (advisory, Chapter 8 P2) — be strict about scope.** AiStagingCoachPanel exists: operator describes a room and/or attaches a private photo (private storage + signed URL); the LLM returns PHOTO OBSERVATIONS + hedged suggestions (grouping, flow, visibility, table/rack use, price visibility, clutter, checkout sightlines, high-value handling); nothing auto-writes to records; no safety/security certification. **Strictness notes:** it does NOT automatically consume property records or zone notes (operator types the description), and it is explicitly labeled advisory, NOT Chapter 17 staging intelligence. So: EXISTS as an advisory assistant; deeper record-grounded integration (auto-loading zone/category/labor facts like prepFactsString does for the Prep Coach) is the enhancement path.

## 66. AI DISPLAY REVIEW

**Classification: ✕ NOT EXISTING — do not classify generic image analysis as supported.** No workflow prompts for crowding / hidden merchandise / poor visibility / missing signs detection on staged displays. The staging coach's photo observations are adjacent but not a display-QA review. Classify: ＋ BUILD (P2) or extend the Chapter 8 coach prompt — do not claim it exists.

## 67. AI FURNITURE REVIEW

**Classification: △ ENHANCE — DETERMINISTIC IS BETTER.** Finding furniture items missing dimensions/condition/pickup instructions/photos/price is a deterministic missing-field query on Item (category=furniture, filter field exists/$exists). Recommend a deterministic "furniture completeness" check list in the staging view; AI adds nothing. Do not build an AI version.

## 68. AI OPENING READINESS

**Classification: ✓ EXISTING (deterministic core) / AI advisory layer △.** The deterministic Prepare-Sale analysis (prepareModel) already reviews staging-adjacent readiness (security checklist, checkout checklist, research holds, equipment, marketing, tasks) with READY/NEEDS ATTENTION/NEEDS REVIEW and explicit "AI never determines readiness." An AI explanatory layer exists in the Prep Coach pattern (prepFactsString grounding). Chapter 17 additions (staging checklist, room completion, signage) must extend the DETERMINISTIC model first; AI may only explain/prioritize. Confirmed doctrine intact.

## 69. AI LABOR PRIORITY — **P2. NOT EXISTING.** Deterministic cues (§57/§58) are the right answer; AI next-best-labor is P2 and not built.
## 70. AI SALE-DAY RESET — **P2. NOT EXISTING.** Consolidation prompts can be deterministic (inventory counts declining, zone depleted) — §62; AI recommendation layer is P2, not built.

## 71. DETERMINISTIC VS AI

Verified preference holds in current code: readiness, cues, counts, and guards are deterministic; AI panels are advisory and record-grounded (prepFactsString pattern). For Chapter 17 the deterministic candidates are: missing-price check, furniture completeness, room completion, opening readiness, consolidation prompt, labor threshold — ALL better as rules/queries. AI should remain only on ambiguous visual/judgment tasks (staging coach, display review — P2).

## 72. CUSTOMER FRICTION MODEL

**Classification: ✎ CHECKLIST / BOOK.** The eight friction categories (can't find it / see it / understand it / find price / get help / check out easily / remove purchase / understand policy) are a REVIEW LENS, not a data entity. Implementation = the walkthrough checklist + the signage/guide surfaces from §1/§51. No FrictionEntity — confirmed none should exist.

## 73. SALE-FLOOR ISSUE

**Classification: ↔ COVERED BY EXISTING SYSTEM (SaleIssue) + △ ENHANCE (category values).** SaleIssue covers safety-adjacent items via property_access/merchandise/pickup/other + blocking_areas (staging, sale_opening, marketing, pickup). Enhancement: add SAFETY and FLOW (and optionally SIGNAGE/DISPLAY/CHECKOUT) category enum values for clean staging reporting. Reuse confirmed; no new entity.

## 74. ISSUE → TASK

**Classification: ✓ EXISTING (Chapter 13 certified).** SaleIssue.linked_task_ids + SaleTask.source_type SALE_ISSUE support staging corrections today.

## 75. ISSUE PRIORITY

**Classification: △ ENHANCE (deterministic ordering).** Deterministic order (SAFETY → SECURITY → CHECKOUT → SOLD/PICKUP CONFUSION → CUSTOMER FLOW → MISSING PRICE → IMPORTANT MERCHANDISE → GENERAL) can be derived from category + blocking_areas + item linkage. No numeric score — confirmed doctrine (no vanity percentages/scores anywhere in Chapter 13–16 systems).

## 76. OPENING READINESS

**Classification: ✓ EXISTING (deterministic Prepare-Sale view) / △ ENHANCE (staging areas).** prepareModel.analyzePreparation assembles one view from canonical records (basics, scope/authority, property, inventory, research, security, checkout, high-value, equipment, marketing, tasks) — exactly the "no new DashboardData entity" pattern. Missing areas: staging/room completion, signage placed, customer-flow walkthrough. Extend the model's area list; do not create a dashboard entity.

## 77. OPENING BLOCKERS

**Classification: △ ENHANCE (rules on existing model).** Candidate blockers already partially enforced (research holds guard pricing/publication; unreviewed checkout is NEEDS REVIEW). Recommended true blockers: checkout checklist not reviewed; OPEN safety/flow SaleIssue blocking sale_opening; individually tracked item with no price; restricted-area unresolved on an OPEN zone. Cosmetic gaps (polish) must remain warnings — READY VS POLISHED (§78) is the explicit design rule.

## 78. READY VS POLISHED

**Classification: ✎ DOCTRINE (must be encoded in wording of §76/§77 outputs).** READY / READY WITH WARNINGS / NOT READY — BLOCKERS output style (§92) enforces this: warnings never block, blockers are a short list, and the system should explicitly tell the operator when remaining work is polish-only. No existing text claims this — add to the readiness output.

## 79. CUSTOMER-FACING ITEM TRUTH

**Classification: ✓ EXISTING (canonical derivation) / △ ENHANCE (missing fields displayed).** Buyer ItemDetail derives from canonical Item (title, description, price, condition, images, related items — verified). NOT currently displayed: dimensions, included/excluded components, pickup instructions/requirements, fulfillment options. All exist on the record; gap is buyer-surface rendering only. No duplicated text source found — public templates consume published images only (retained-private photos excluded per Chapter 13, verified in publicationPayload doctrine).

## 80. CUSTOMER-FACING SALE TRUTH

**Classification: ✓ EXISTING (mostly canonical) / △ ENHANCE (guide assembly).** Public sale page derives hours/dates/address/payment methods/notes from EstateSale. Discounts: NOT currently rendered to buyers from discount_schedule (guide gap, §51). Restricted access: not communicated publicly (guide gap). No duplicated/stale policy text found on public surfaces — special_notes is a single operator-owned field.

## 81. SIGN TRUTH

**Classification: ✎ DOCTRINE + current state honest.** Today's signs are STATIC operator templates (a printed sign is a snapshot by nature). No sign claims live sync. The discount-sign generator (§34) and buyer guide (§51) must state: printed = snapshot at print time; QR = live digital truth. Encode in the generator footers.

## 82. SOLD SIGN TRUTH — **✓ DOCTRINE HOLDS.** Status comes only from the canonical checkout/transaction workflow (CheckoutStation sync + changeItemPrice/Activity history). No sign-printing path writes status — confirmed in PrintSigns (window.print only). The future §29 generator must keep this.
## 83. DISCOUNT SIGN TRUTH — **✓ DOCTRINE WILL HOLD.** Discount signs (when built) render discount_schedule; Item.price changes only through changeItemPrice. No existing sign path modifies prices — confirmed.
## 84. PICKUP SIGN TRUTH — **✓ DOCTRINE HOLDS.** Pickup authorization is Item.authorized_pickup / pickup_completed_at only; no sign grants anything.
## 85. QR TRUTH — **✓ EXISTING.** QR resolves to live public pages (ItemDetail/EstateSaleDetail) — digital truth; printed labels are snapshots (a price printed on a label can go stale — mitigate via §31 re-check and item-number identification). Distinction should be stated in the label footer ("Scan for current price and status" is already present as 'Scan for details & cart' — enhance wording).

---

## 23. READY-TO-USE TOOLS — ALL 31 CLASSIFIED

| # | Tool | Classification |
|---|------|----------------|
| 1 | Property staging walkthrough | SMALL ENHANCEMENT (assemble Security/Checkout/Site-assessment + new flow points into one SaleTask-prefixed checklist) |
| 2 | Customer traffic-flow worksheet | SMALL ENHANCEMENT (checklist lines in #1; no CAD) |
| 3 | Room setup sheet | GENUINE SOFTWARE GAP (small — zone staging fields §89) |
| 4 | Room completion checklist | GENUINE SOFTWARE GAP (Staging: prefix per zone, §59) |
| 5 | Merchandise-category signs | EXISTING TEMPLATE (static library; content placeholders to fill) |
| 6 | Display-priority worksheet | INTERACTIVE SYSTEM ALREADY BETTER (derive from flags, §12) |
| 7 | Lighting checklist | SMALL ENHANCEMENT (zone flag / issue category) |
| 8 | Furniture information sheet | EXISTING TEMPLATE-ADJACENT (Item data exists; buyer display gap §79) |
| 9 | Furniture measurement card | EXISTING TEMPLATE (dimensions canonical; label/QR display enhancement) |
| 10 | Furniture pickup instructions | SMALL ENHANCEMENT (pickup_requirements + flow-through §26) |
| 11 | Large-item removal worksheet | SMALL ENHANCEMENT (Item removal_note + zone removal_route_note exists) |
| 12 | Property-protection checklist | EXISTING TEMPLATE (zone protection_note + checklist pattern) |
| 13 | High-value display checklist | EXISTING (security walkthrough covers display-attention handling) |
| 14 | Checkout-location worksheet | GENUINE SOFTWARE GAP (small — checkout_location field, §45) |
| 15 | Checkout readiness checklist | EXISTING (Checkout Setup: SaleTask checklist + prepareModel area) |
| 16 | Customer queue plan | CHECKLIST ONLY (lines in #15; no entity) |
| 17 | Entrance sign | EXISTING TEMPLATE |
| 18 | Directional signs | EXISTING TEMPLATE (add upstairs/downstairs variants) |
| 19 | Upstairs/downstairs signs | SMALL ENHANCEMENT (two template entries) |
| 20 | Restricted-area signs | EXISTING (templates + zone signs + access class) |
| 21 | Category signs | EXISTING TEMPLATE |
| 22 | Price signs | EXISTING (DOT/pricing templates + ItemLabels) |
| 23 | Discount signs | GENUINE SOFTWARE GAP (small — generator from discount_schedule, §34) |
| 24 | Sold signs | GENUINE SOFTWARE GAP (small — item-tied generator, §29) |
| 25 | Pickup signs | SMALL ENHANCEMENT (generator from pickup_plan) |
| 26 | Checkout signs | EXISTING TEMPLATE |
| 27 | Sale-policy signs | EXISTING TEMPLATE (operator content; no platform hardcoding — correct) |
| 28 | First-time buyer guide | GENUINE SOFTWARE GAP (§50/§51) |
| 29 | Sale-day recovery checklist | SMALL ENHANCEMENT (SaleTask template set, §61) |
| 30 | Display consolidation checklist | SMALL ENHANCEMENT (zone sale-day state + cues, §62) |
| 31 | Opening-readiness checklist | EXISTING CORE (deterministic Prepare-Sale model) + staging areas enhancement |

**No tool requires a new entity.** All land in existing templates, zone/Item extensions, SaleTask checklist patterns, or the Prepare-Sale model.

## 24. DO-NOT-REBUILD

Certified systems Chapter 17 MUST reuse (all verified present and functional): EstateSale (+ prep_zones, pickup_plan, discount_schedule, site_assessment), SaleDiscovery, Item (full Chapter 15/16 architecture incl. dimensions, condition, included/excluded, item_number, zone/location, custody, display_attention, pricing fields), SaleTask (incl. checklist-prefix pattern + dependency model), SaleIssue (+ blocking areas), SaleNote, EquipmentAsset / SaleKitTemplate / SaleEquipmentAssignment, PrintSigns + sign library, ItemLabels, Scan & Cart + ItemInspectDialog, Checkout Station + SaleReceipt + Order/Cart, Offers (accepted→cart handoff), changeItemPrice, LaborEntry, Project Dashboard / Prepare Sale (deterministic analysis), research guard, restricted-area architecture, property-protection zone notes, AI Staging Coach (advisory), Professional Network (unchanged relevance).

## 25. NEW ENTITY TEST

**Recommendation: NO NEW CORE ENTITY.** Chapter 17 is fully coverable by: (a) additive fields on EstateSale.prep_zones and Item, (b) SaleTask checklist-prefix patterns, (c) SaleIssue category values, (d) printable generators on PrintSigns/ItemLabels, (e) the deterministic prepareModel extension, (f) one buyer-guide surface. No requirement discovered that existing architecture genuinely cannot support. StagingItem/StagingRoom/CheckoutEntity/SignEntity/LiveFloorNote: all ✕ DO NOT BUILD.

## 26. SMALLEST RECOMMENDED ARCHITECTURE (DO NOT IMPLEMENT)

1. **Zone extension (EstateSale.prep_zones items):** `room_purpose` (enum: SALE_FLOOR/PREP_ONLY/STORAGE/CHECKOUT/OTHER), `category_plan` [{category, intent: KEEP_HERE/CONSOLIDATE_TO, note, target_zone_id?}], `signage_needs` (free text), `display_notes`, `lighting_concern` (enum ok/insufficient/needs_added_lighting/unknown + note), `flow_concerns` (free text), `sale_day_status` (enum SETUP/READY/ACTIVE/DEPLETED/CONSOLIDATE/CLOSED, unset by default).
2. **Item extension:** `pickup_requirements` {scheduled_required: bool, two_person: bool, equipment_needed: string, assistance_required: bool, special_procedure: string, window: string}, `disassembly` (enum CAN/MUST/DO_NOT/UNKNOWN + note), `removal_note` (string), optional `display_group` (string) + `grouping_policy` (enum KEEP_TOGETHER/MAY_SEPARATE/APPROVAL_REQUIRED/NA).
3. **Sale extension:** `entry_note`, `checkout_location`, `exit_route_note` (operational strings).
4. **Checklists:** Staging Walkthrough + per-zone `Staging:` checklist via SaleTask; sale-day recovery task template.
5. **Generators:** item-tied Sold signs; discount-stage signs; pickup-instruction signs; custom category-price signs; buyer guide (print + public QR route) — all snapshot doctrine.
6. **Deterministic model:** extend prepareModel with Staging area + room-READY derivation + missing-price staging list + furniture completeness query + labor threshold alert; add READY / READY WITH WARNINGS / NOT READY — BLOCKERS output.
7. **Status safety warnings:** sold→available and duplicate-sale warnings in inventory/checkout UI.
8. **SaleIssue category values:** SAFETY, FLOW (optional SIGNAGE/DISPLAY/CHECKOUT).

## 27. INTERFACE / DATA / WORKFLOW / PERMISSION GAPS

- **Interface:** buyer ItemDetail missing dimensions/included-excluded/pickup; no buyer guide; no staging tab; PrintSigns legacy templates empty-content; no upstairs/downstairs template.
- **Data:** zone staging fields absent; Item pickup/disassembly/removal fields absent; checkout_location absent.
- **Workflow:** no pre-opening flow walkthrough; no room-READY standard; no sold-sign generation; no recovery-task template; no consolidation state; no labor threshold alert.
- **Permissions:** no NEW permission surfaces required. Must-preserve invariants: zone staging data is team-readable (same as prep zones) but `lighting/display` notes are team-safe (no codes); controlled_location and custody NEVER enter staging views or public QR (RLS already enforces — keep views from projecting); buyer guide renders only public-safe fields (dates, payment_methods, pickup_plan, discount stages, access classes, special_notes) — never site_assessment.access_details, excluded-area notes with sensitive content, or operator-private economics.

## 28. P0 / P1 / P2 / P3 / LATER

**P0 (genuine, audit-found):**
- None found in deployed staging/QR paths today: public QR encodes only public item id (verified); zone QR is authenticated; photo privacy holds; sold/discount/pickup signs cannot mutate truth. **Residual P0-adjacent (verification items, not defects):** (1) confirm at deploy time that the future staging views never project controlled_location/custody to sale-team members (RLS enforces on Item, but view-layer discipline is required); (2) the CheckoutStation duplicate-sale guard (same item sold twice across concurrent carts) could not be fully verified — flag as pre-launch check; (3) sold→available status reversal has no warning today — a stale-floor/truth risk, cheap to warn on (could be argued P1; it is a truth-safety warning, so treat as P0-warning/P1-build).

**P1 (minimum to make Chapter 17 substantially true):**
1. Zone staging fields (§89/§26.1) + sale_day_status.
2. Item pickup/disassembly/removal/grouping fields (§90).
3. Sale entry/checkout/exit operational fields (§4/§45).
4. Staging Walkthrough + per-zone `Staging:` completion checklist + room READY derivation (§59/§60).
5. Flow/bottleneck walkthrough + SaleIssue FLOW/SAFETY categories (§5/§73).
6. Item-tied Sold sign generator + discount-stage sign generator + pickup-sign generator (§29/§34/§42).
7. Buyer guide (print + public QR route) drawing from canonical truth (§51/§53).
8. Buyer ItemDetail: render dimensions, included/excluded, fulfillment/pickup info (§79).
9. Missing-price / furniture-completeness deterministic staging checks (§36/§67).
10. Opening readiness extension with READY / READY WITH WARNINGS / NOT READY — BLOCKERS (§76–§78/§92).
11. Sale-day recovery task template + consolidation state (§61/§62).
12. Labor threshold alert (§57).
13. Status-safety warnings (§31).

**P2 (not now):** record-grounded upgrade of AI Staging Coach (auto-load zone/category facts); AI Display Review; AI customer-question review; AI labor priority; AI sale-day reset suggestions.
**LATER:** floor-plan designer, CV room mapping, traffic simulation, crowd sensors, retail-layout optimization — all ✕ not planned.

## 29. BOOK TRUTH (every promise classified)

- Staging Walkthrough — NOT YET: BUILD (small, reuses checklists).
- Room Setup Plan — NOT YET: BUILD (zone fields).
- Customer Path Review — NOT YET: BUILD (checklist + 3 sale fields).
- Bottleneck Flags — YES AS EXISTING-SYSTEM OUTCOME (SaleIssue; add FLOW value).
- AI Staging Coach — YES AS EXISTING-SYSTEM OUTCOME (advisory, Chapter 8 P2; record-grounding is enhancement).
- Merchandise Categories — YES (Item.category + zone aggregation).
- Room Category Plan — NOT YET: BUILD (small zone array).
- Related-Item Grouping — YES AS EXISTING-SYSTEM OUTCOME (grouped merchandise, related display) / WORDING: keep as display_group only.
- Collection Rules — NOT YET: BUILD (one enum; do not duplicate included/excluded).
- Better-Item Flags — YES (existing flags suffice; DO NOT BUILD another).
- Display Priority — YES AS EXISTING-SYSTEM OUTCOME (derived from flags).
- High-Value Placement — YES AS EXISTING-SYSTEM OUTCOME (custody + security walkthrough; staging view enhancement).
- Furniture Visibility Check — BOOK/CHECKLIST (no software).
- Lighting Checklist — YES WITH SMALL ENHANCEMENT (zone flag/issue).
- AI Display Review — NOT YET: P2 (do not claim).
- Automatic Measurements — YES (data) / buyer display BUILD-small.
- Condition Details — YES.
- Included Components — YES (buyer display enhancement).
- Pickup Requirements — NOT YET: BUILD (Item fields).
- Furniture QR Information — YES AS EXISTING-SYSTEM OUTCOME (mechanics+privacy) / payload enhancement.
- Furniture Removal Plan — YES AS EXISTING-SYSTEM OUTCOME (zone-level) / item-level BUILD-small.
- Doorway & Stair Notes — YES AS EXISTING-SYSTEM OUTCOME (zone note + site assessment).
- Disassembly Notes — NOT YET: BUILD (one field).
- Pickup Windows — YES (project default) / per-item override BUILD-small.
- Buyer Pickup Instructions — YES (canonical pickup_plan) / flow-through BUILD-small.
- Live Item Status — YES (canonical chain verified).
- Printable Sold Signs — NOT YET: BUILD (small generator).
- QR Status Check — YES.
- Pickup Record — YES (authorized_pickup + pickup_completed_at).
- Status Alerts — NOT YET: BUILD warnings.
- Readable Price Labels — YES.
- Category Pricing Signs — YES (static templates; custom generator enhancement).
- Discount Signs — NOT YET: BUILD (small generator from discount_schedule).
- Special Pricing Rules — YES WITH SMALL ENHANCEMENT (derive from Chapter 16 exclusions).
- Missing Price Check — YES AS EXISTING-SYSTEM OUTCOME (deterministic; staging view BUILD-small).
- Entrance / Directional / Restricted / Checkout / Sold / Policy Signs — YES (templates exist; sold/pickup generators BUILD-small; upstairs/downstairs WORDING/template addition).
- Furniture Pickup Signs — YES WITH SMALL ENHANCEMENT (generator from pickup truth).
- QR Information Signs — YES (mechanics) / buyer-guide destination BUILD.
- Checkout Planner — YES AS EXISTING-SYSTEM OUTCOME (checklist + area status) / location field BUILD-small.
- Queue Review — BOOK/CHECKLIST.
- POS Readiness Checklist — YES.
- Exit Visibility — BOOK/CHECKLIST line.
- Large-Purchase Workflow — YES (end-to-end verified).
- Customer Experience Walkthrough — NOT YET: BUILD (buyer guide).
- How This Sale Works Sign — NOT YET: BUILD (derived generator).
- Policy Visibility Check — YES WITH SMALL ENHANCEMENT (wiring).
- QR Buyer Guide — NOT YET: BUILD (public route).
- AI Customer Question Review — P2.
- Staging Labor Tracking — YES (LaborEntry categories).
- Labor Budget Alert — NOT YET: BUILD-small (deterministic threshold).
- Priority Staging — YES WITH SMALL ENHANCEMENT (extend deterministic cues).
- Room Completion Standard — NOT YET: BUILD (deterministic checklist — core P1).
- AI Labor Coach — P2.
- Sale-Day Recovery Tasks — YES WITH SMALL ENHANCEMENT (template on SaleTask).
- Consolidation Prompts — YES WITH SMALL ENHANCEMENT (sale_day_status + cue).
- Room Status Updates — YES WITH SMALL ENHANCEMENT (separate sale-day field).
- Empty Equipment Removal — YES AS EXISTING-SYSTEM OUTCOME (task + assignment states).
- Live Floor Notes — YES (SaleNote/SaleIssue).
- AI Staging Review / AI Furniture Review / AI Opening Readiness Check — deterministic-first; AI layers P2 (furniture review should stay deterministic per §67; opening readiness deterministic core EXISTS).
- AI Sale-Day Reset — P2.

## 30. CUSTOMER JOURNEY MATRIX

| Stage | Customer need | EstateSalen system | Physical tool | Digital tool | Current gap |
|---|---|---|---|---|---|
| ARRIVE | Find sale, hours | EstateSaleDetail/SEO, marketing kit | entrance/starting-time sign templates | public sale page | guide not at door |
| ENTER | Know where to go | access_class (zones) | 'Enter Here' template | — | no entry/exit fields or walkthrough |
| NAVIGATE | Find areas | zones, categories | directional/room templates; zone QR signs (auth) | sale detail | no upstairs/downstairs templates; no buyer guide |
| DISCOVER | See merchandise | Item + zones, featured | staging (manual practice) | featured items, photos | no staging plan/visibility checks |
| UNDERSTAND ITEM | Condition/what's included | Item condition, included/excluded | labels w/ QR | ItemDetail (title, price, condition, related) | dimensions/included/pickup not shown to buyer |
| SEE PRICE | Clear price | Item.price + labels | price labels, DOT/category sign templates | ItemDetail price | discount/exclusion signs not generated from rules |
| ASK QUESTION | Get help | staff; signage answers | 'Please See Cashier', policy templates | — | question-reduction guide absent |
| DECIDE | Availability truth | Item.status + display_attention | — (no item-tied sold sign) | live status via QR | physical status marker gap (§28/§29) |
| MAKE OFFER | Submit offer | Offer entity + OffersPanel | — | offer flow (EstateSaleDetail) | none material |
| CHECKOUT | Find checkout, pay | Checkout Station, Order, receipt; checkout checklist | 'Checkout'/payment templates | cart QR scan | checkout_location field absent |
| PAY | Payment methods | Order/payment_method; sale payment_methods | payment signs | receipt | none material |
| PICKUP | Know procedure | pickup_plan, authorized_pickup, pickup_completed_at | pickup templates (blank content) | receipt/ItemDetail (wiring gap) | per-item requirements + sign generator absent |
| EXIT | Leave with large item | removal_route_note, site assessment | — | — | exit-route field + sign gap |

## 31. ROOM / ZONE MATRIX (conceptual example)

| Zone | Purpose | Customer access | Categories | Equipment | Signs | Flow issues | Lighting | Status | Open tasks | Current support |
|---|---|---|---|---|---|---|---|---|---|---|
| Living Room | Sale floor (example) | OPEN_TO_CUSTOMERS | furniture, home_decor | folding tables (assignment) | room sign, price signs | doorway width (example issue) | unknown | prep: complete | Staging: none | access/security/removal/protection notes ✓; purpose/categories/signage/flow/lighting/sale-day ✗ |
| Garage | Sale floor + pickup | PICKUP_ONLY | tools, sporting_goods | tables, racks | 'Garage w/ Arrow' | — | unknown | prep: sorting | Prep task ✓ | same gaps |
| Primary BR closet | Restricted | CLOSED_RESTRICTED | — | — | 'Do Not Enter' | — | n/a | excluded-area link ✓ | — | restricted architecture ✓ |

## 32. FURNITURE MATRIX (conceptual example)

| Item | Dimensions | Condition | Included | Price | QR | Removal path | Pickup reqs | Status | Current support |
|---|---|---|---|---|---|---|---|---|---|
| Dining set (example) | ✓ Item.dimensions | ✓ condition + notes | ✓ included/excluded | ✓ + history/rationale | ✓ label + public ItemDetail | zone removal_route_note only | ✗ (fields absent) | available→sold→awaiting pickup→released ✓ | all Item truth ✓; pickup/disassembly/removal-note ✗; buyer display of dimensions ✗ |

## 33. SIGNAGE MATRIX

| Sign type | Source of truth | Static/Live | Print/QR | Current support | Gap |
|---|---|---|---|---|---|
| ENTRANCE | operator template | static snapshot | print | templates exist (empty content) | fill content |
| DIRECTIONAL | operator template | static | print | templates exist | upstairs/downstairs variants |
| RESTRICTED | zone access_class + templates | static | print + zone sign w/ auth QR | ✓ | none material |
| CATEGORY | operator template (no Item required) | static | print | ✓ static library | custom generator (P1-small) |
| PRICE (item) | Item.price/item_number | snapshot | label print + live QR | ✓ ItemLabels | none material |
| DISCOUNT | EstateSale.discount_schedule | snapshot (print) / live (QR) | print | ✗ static templates only | generator (P1) |
| SOLD | Item.status | snapshot | print | ✗ template names only | item-tied generator (P1) |
| PICKUP | pickup_plan + pickup_requirements | snapshot | print | templates only | generator (P1) |
| CHECKOUT | checklist + templates | static | print | ✓ | checkout_location field |
| POLICY | operator content (correctly not hardcoded) | static | print | ✓ templates | none |
| BUYER GUIDE | sale canonical fields | snapshot (print) / live (QR route) | both | ✗ | build (P1) |

## 34. OPENING READINESS MATRIX

| Area | Ready condition | Warning | Blocker | Can derive? | Current support |
|---|---|---|---|---|---|
| CUSTOMER ACCESS | entry/checkout/exit defined; zones classified | unclassified zones | none | yes (after §4 fields) | partial (access_class ✓; entry/exit ✗) |
| ROOMS | all open zones staging-complete | cosmetic polish | staging checklist not run on an open zone | yes (§59) | ✗ |
| PRICING | every individually tracked item priced | research hold w/o override | item with no price on an open zone | yes (deterministic) | partial (research guard ✓; staging list ✗) |
| RESEARCH HOLDS | none unresolved w/o override | specialist pending | high-value unresolved | ✓ | ✓ (prepareModel + guard) |
| SIGNAGE | required signs placed | missing minor signs | none (warning only) | checklist | ✗ |
| CHECKOUT | checklist reviewed; location set | partial review | checklist not reviewed | ✓ | ✓ (prepareModel) |
| EQUIPMENT | load-out packed | unpacked entries | none | ✓ | ✓ |
| RESTRICTED AREAS | all restricted zones marked/signed | unmarked area | unresolved restricted area on open path | ✓ | ✓ (zones) |
| HIGH VALUE | display handling reviewed (security walkthrough) | unreviewed | none (handled by security review) | ✓ | ✓ |
| PICKUP | pickup plan recorded; large items have requirements | plan absent | none | yes (after §20) | partial (pickup_plan ✓; item reqs ✗) |
| TASKS | no overdue critical tasks | overdue minor | critical overdue safety task | ✓ | ✓ |
| ISSUES | no OPEN safety/flow issue blocking sale_opening | open non-blocking | safety blocker | ✓ (after category values) | partial |

## 35. SALE-DAY RESET MATRIX

| Condition | Signal | Action | Owner | Existing system |
|---|---|---|---|---|
| Room depleted | zone sale_day_status DEPLETED | consolidate remaining merchandise | assigned team member | ✗ (needs §60 state; consolidation = task ✓ substrate) |
| Table mostly empty | operator observation | restock/consolidate; flag equipment removal | staff | SaleEquipmentAssignment + SaleTask ✓ (manual) |
| Walkway blocked | observation / SaleIssue FLOW | clear; issue→task | staff | SaleIssue ✓ (category value enhancement) |
| Sold furniture confusing buyers | sold item awaiting pickup on floor | place item-tied SOLD sign | staff | ✗ sign generator (P1); status truth ✓ |
| Missing sign | observation | replace | staff | sign templates ✓ (reprint) |
| Abandoned item | observation | return to zone | staff | Item zone/location ✓ |
| Empty rack | observation | mark for removal | staff | SaleTask ✓ |
| Checkout queue conflict | observation / issue | reposition; checklist review | operator | SaleIssue + checkout checklist ✓ |

## 36. END-TO-END FURNITURE TRACE (conceptual; no test data)

Item created (dimensions/condition/included recorded ✓) → staged in zone (zone ✓; display plan ✗) → priced (changeItemPrice, rationale, range ✓) → label printed (QR + item number + price ✓) → buyer scans QR → public ItemDetail (title/price/condition ✓; dimensions/pickup ✗ — **re-entry seam 1**: buyer must ask staff for measurements) → buyer decides → offer accepted OR direct purchase → Checkout Station → Order paid → Item sold (✓) → item remains in house → **manual seam 2: no item-tied SOLD sign** (generic blank template only) → pickup: project default plan shown (✓) but **manual seam 3: per-item removal/two-person/disassembly info lives nowhere** → authorized_pickup recorded (✓) → pickup_completed_at (✓) → custody RELEASED for controlled items (✓). Three manual seams, all covered by the §26/§28 P1 list; no duplicate workflow, no financial-truth violation found.

## 37. PRODUCT DOCTRINES (audit affirmation)

Friction-removal framing, physical↔digital agreement, sold-must-look-sold, signs-answer-first, checkout-as-floor-design, labor-where-value, ready-vs-polished, printed-snapshot-vs-QR-live — NONE currently contradicted by deployed behavior; all are implementable under §26 without new entities. The one doctrine currently UNSUPPORTED (not violated): "sold merchandise that remains in the house must look sold" (§28/§29 gap).

## 38. STAGING LEARNING LOOP

PLAN (zones/categories ✗ planning fields) → STAGE (LaborEntry staging ✓) → OPEN (readiness ✓ partial) → OBSERVE (SaleNote/SaleIssue ✓) → RESET (recovery tasks ✗ template) → SELL (checkout ✓) → CONSOLIDATE (✗ state) → REVIEW LABOR (projected vs actual ✓ at closeout; mid-prep threshold ✗) → IMPROVE (SaleRecap exists; staging lessons fold into notes ✗ structured). Broken transitions: PLAN (no room setup fields), RESET (no template), CONSOLIDATE (no state), mid-course LABOR (no alert). All P1-small.

## 39. RECOMMENDED IMPLEMENTATION SEQUENCE (DO NOT IMPLEMENT)

1. P1-a Data: zone staging/sale-day fields + Item pickup/disassembly/removal (+grouping) + sale entry/checkout/exit fields (one schema pass).
2. P1-b Deterministic core: Staging checklist + room READY derivation + prepareModel Staging area + missing-price/furniture-completeness checks + labor threshold + status-safety warnings.
3. P1-c Customer truth: buyer ItemDetail fields + buyer guide (print + QR route) + checkout_location.
4. P1-d Printables: item-tied SOLD signs, discount-stage signs, pickup signs, custom category signs, upstairs/downstairs templates, recovery-task template.
5. P2: AI display review / record-grounded staging coach / AI question & labor & reset layers.

## 40. PRE-LAUNCH DEPENDENCIES (carried + new)

Carried from Ch. 14–16: manual verification of cross-company RLS and photo-access security (still open); Meta lead-ads webhook fail-closed pending secrets; duplicate Launch_Issues record cleanup; B2-02 secrets; scraped-record PII in public directory surfaces. New Chapter 17 dependencies: (1) verify staging views never project controlled_location/custody to sale-team roles at deploy time; (2) verify/harden duplicate-sale protection at checkout completion; (3) confirm buyer-guide public route renders public-safe fields only (no site_assessment.access_details, no operator economics) before first publish.

## 41. CERTIFICATION

# **GO WITH CONDITIONS**

The canonical architecture (zones, Item, tasks/issues, equipment, signs, labels, checkout, custody, labor, deterministic readiness) already carries roughly two-thirds of Chapter 17, and the remainder requires **no new core entity** — only additive zone/Item/sale fields, checklist patterns, printable generators, and deterministic model extensions. Conditions: implement the P1 list (§28) before the book claims staging support; close the three manual seams in the furniture trace (§36); add the physical-status (SOLD sign) and status-alert safety items; keep all AI staging capabilities advisory and behind the deterministic readiness core; and clear the three Chapter 17 pre-launch verification items.

**AUDIT COMPLETE — NOTHING BUILT. Awaiting explicit authorization for any Chapter 17 implementation. Chapter 18 not started.**