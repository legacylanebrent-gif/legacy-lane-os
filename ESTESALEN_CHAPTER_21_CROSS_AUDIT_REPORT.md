# CHAPTER 21 — ESTATESALEN CROSS-AUDIT REPORT
## CHECKOUT, PAYMENT TRUTH, CASH CONTROL, RECEIPTS, PICKUP & RELEASE

AUDIT ONLY. No production data modified, no records created, no communications sent, no payment initiated/refunded/voided, no provider configuration touched, no deploy, no Chapter 22 work started.

---

## EXECUTIVE SUMMARY

- **Coverage:** ~111 Chapter 21 promises audited. **≈34 fully supported** by existing architecture (mostly via Chapters 8/15/16/17/19/20 reuse), **≈20 supported with small seams**, **≈25 require the P1 set to become true**, **≈12 are P2/AI/LATER**, **≈20 should be book/printable/template or must NOT be built as duplicates**.
- **Strongest existing architecture:** the Item-as-merchandise-truth doctrine (status/sold_date/payment_method_used/pickup_completed_at/authorized_pickup/pickup_requirements), the Wix/Base44-Payments webhook (JWT-verified, provider-confirmed APPROVED as the only source of online PAID), Chapter 20 checkout guidance + payment-unknown warnings ("Not paid ≠ paid — do NOT release"), the duplicate-sale/HIGH-VALUE checkout gates, and the awaiting-pickup surfaces (Live Sale PickupsCard, ClosingCard, Closeout blocker).
- **Largest genuine gaps:** (1) **no payment-attempt truth** — a retried online POS payment creates a second provider session, overwrites the cart's link, and a late approval of attempt 1 is **silently dropped** (money captured, no Order); (2) **the provider transaction reference is never preserved** on the Order; (3) **the POS webhook marks Items sold with no availability re-check** (a paid item can be overwritten to a second buyer); (4) **no cash controls at all** (opening bank, drops, count, variance); (5) **release records no who/whom** (timestamp only); (6) two parallel money ledgers (Order vs. Transaction) with no reconciliation and no sale link on Order.
- **Financial/custody risk:** MEDIUM-HIGH today for online POS retries (double charge with one unrecorded), MEDIUM for race-window double-sell, LOW for offline cash flow (boring by design, but with no cash reconciliation). The financial/physical separation doctrine (SOLD ≠ PAID ≠ RELEASED) is architecturally sound; the missing pieces are attempt truth, evidence retention, and release detail.

**CERTIFICATION: NO-GO** (see §56) — the Chapter 21 central chain cannot yet truthfully answer "how was payment attempted / did we charge twice / what record did the transaction leave" for the online POS path. The smallest P0 set is small and well-bounded; certification becomes GO WITH CONDITIONS once it lands.

---

## 1. CHECKOUT MODE

**✓ EXISTING / SUPPORTED — `src/pages/CheckoutStation.jsx`.** Simplified cashier surface: scan cart QR → itemized cart (title/qty/price/line total/subtotal/total) → Chapter 20 discount GUIDANCE reuse (current stage, exclusions list, negotiation-authority policy note, "the system never changes prices") → payment method → complete → receipt card. Help routing via `AskForHelpDialog` (default category `checkout`) without abandoning the loaded cart. HIGH-VALUE gate and duplicate-sale guard re-verified at completion. Boring by design — no upsells, no modals beyond help. Chapter 20 guidance is genuinely reused (same `currentDiscountStage` model as LiveSale/CheckoutCard).

## 2. SCAN TO CART

**✓ EXISTING / SUPPORTED.** Buyer/staff path: `ScanAndCart.jsx` scans item QR (`itemId=` URL format — same payload family the printable ItemLabels generate) → `Item.filter({id})` → **canonical Item** → `ItemInspectDialog` (role-appropriate view, Chapter 15 P1-34) → explicit Add-to-Cart (availability checked: non-`available` cannot be added). Cashier path: `CheckoutStation.jsx` scans **cart QR** (`cart:<userId>` / `userId=`) → Cart entity → checkout. No Item truth is recreated in the cart (cart line items reference `item_id` + display snapshots). Conceptual path verified in code; no manual re-entry seam found.

## 3. GENERAL MERCHANDISE

**✓ EXISTING / SUPPORTED — `src/pages/Worksheet.jsx` (sale-scoped) + `Transaction` entity.** Quick low-value/untracked merchandise sells as a `Transaction` (free-text `item_name`, quantity, price, `payment_method` incl. cash, notes, `sale_id`, `operator_id`, `sale_team_ids`) — no Item inventory required, but real accounting truth tied to the sale. Bundles supported ("Box of toys — $15"). Consumer self-reported purchases also land here (`sale_id: 'user_purchase'`). Doctrine honored: low-value merchandise is NOT forced into an inventory project, yet still creates transaction truth. **Seam:** Transaction has no link to Item or Order (see §11).

## 4. PRICE / DISCOUNT AUTHORITY

**✓ EXISTING / SUPPORTED (Chapter 16/19/20 reuse).** Discount guidance in checkout (stage/exclusions/policy); `changeItemPrice` backend function enforces HIGH-VALUE price authority server-side (operator/seller/admin only, explicit reason for HIGH_VALUE); Item-level `negotiation_override` (NO_DISCOUNT_WITHOUT_OPERATOR) wins over company policy; `excluded_from_discounts` surfaced in red to the cashier. The system never auto-applies a discount — every discount is an explicit human price change through the canonical path. Cart lines carry the CURRENT approved Item price (re-fetched at checkout; the duplicate-sale guard's fresh Item fetch also re-reads prices, though the guard only blocks on status — a price changed after cart creation shows the cart's stale price in review; the authoritative charge uses... see §5 seam).

## 5. PAYMENT STATE MODEL

Actual canonical statuses:
- **Order.status:** `pending_payment | paid | processing | shipped | delivered | completed | cancelled | disputed`; **Order.escrow_status:** `held | released | refunded` (marketplace escrow).
- **Purchase.status (marketplace):** `PENDING_PAYMENT_OFFLINE | PENDING_PAYMENT_ONLINE | COMPLETED | PICKUP_SCHEDULED | PICKED_UP`.
- **Cart.pending_checkout_id:** the only "attempt in progress" marker for POS online payment.
- **Transaction:** no status field at all (worksheet entries are one-shot records).

**Truthful mapping vs. the manuscript:** PROCESSING ≈ Cart with `pending_checkout_id` (online) or Order `processing` (unused in POS flow); APPROVED ≈ Order `paid` (offline = cashier attestation; online = provider webhook); DECLINED/FAILED ≈ **not represented** (nothing is written; the cart simply survives); UNKNOWN ≈ **not represented**; VOIDED ≈ not represented; REFUNDED ≈ escrow_status enum value only, no POS refund flow. **Do not rename architecture** — the mapping above is the truth; the gap is the missing attempt/unknown states (§28).

## 6. PAYMENT CONFIRMATION

- **Offline (cash/check/venmo/manual card):** PAID is established by the **cashier's completion action** — `completeCheckout` creates the Order as `paid` with the selected method. The merchant record IS the cashier's attestation; for "Credit/Debit Card (manual)" the processor is the operator's external terminal and EstateSalen stores only the cashier's say-so. This matches the book's honest framing (a small operator's cash sale needs no processor) but the book must not claim "merchant-verified" for manual card.
- **Online (Base44/Wix Payments):** PAID is established **only** by the provider-confirmed `wix.ecom.v1.order_approved` webhook, JWT-verified (RS256, fail-closed) — the authoritative source. Client success screens, pending bank charges, and customer screenshots are never consulted. ✓ The preferred doctrine holds for the online path.
- **Authoritative source:** provider webhook (online) / operator-designated cashier (offline). No path lets a customer's phone become the merchant record.

## 7. UNKNOWN / PENDING PAYMENT

**△ PARTIAL — doctrine is present, representation is not.** `CheckoutCard` (Live Sale) surfaces `pending_payment`/`processing` Orders as "payment NOT confirmed — do NOT release merchandise; raise a payment issue," and PosPractice trains exactly this. **BUT:** the online POS flow never creates a pending Order — an ambiguous payment leaves only a Cart with `pending_checkout_id`, which **appears on no dashboard**. So: (a) UNKNOWN cannot mark an Order paid ✓ (webhook-only), (b) cannot mark an Item paid ✓ (webhook-only), (c) cannot create false settlement certainty ✓ (economics read sold Items + expenses), (d) **release prevention is procedural, not enforced** — the Item remains `available` after an unknown online attempt and could be sold to someone else (the inverse failure). **P0-adjacent representation gap, P1 to surface.**

## 8. DUPLICATE PAYMENT / RETRY

**✕ P0 GAP — `create-checkout` (product `pos_order`).** There is **no guard**: the function does not check whether the cart already has a `pending_checkout_id` before constructing a new provider session, and it **overwrites** `Cart.pending_checkout_id` with the new session id. Consequences (from code, not invented provider behavior):
1. Attempt 1 (session A) is unresolved; cashier retries → session B; cart now points to B.
2. If A later APPROVES, the webhook looks up `pending_checkout_id: A` → **no matching record** → logs "No matching record" and returns 200 OK. **Money captured with no Order, no Item update, no trace.**
3. B approves → Order created. Customer potentially charged twice; the system cannot detect, warn, or reconcile.
Also: the webhook itself has no dedup ledger; idempotency for a single session relies on cart deletion (adequate in practice for redelivery, but a concurrent double-delivery race exists since the Order is created before the cart is deleted with no idempotency key on the Order).

## 9. PAYMENT INCIDENTS

**✓ EXISTING / SUPPORTED (Chapter 20 reuse).** `SaleIssue` category `payment` exists ("a payment that failed or cannot be confirmed — the employee must NOT release merchandise on it"), urgency up to URGENT, `is_incident` classification (PAYMENT_DISPUTE) with facts-only fields, least-privilege read for incident-class issues. Checkout's help dialog (category `checkout`) plus Live Sale payment-unknown guidance both route here. **No PaymentIncident entity needed — correctly refused.**

## 10. CASH

**✕ GENUINE GAP (P1 per book, entity test in §29).** What exists today: cash as a **payment method** on Order (POS), Transaction (worksheet), and EstateSale.payment_methods; found-cash doctrine via SaleDiscovery (never revenue, custody_events); PosPractice cash scenarios (training only, writes nothing); "CASH HANDLED ONLY BY THE OPERATOR" training doctrine. What does NOT exist: opening bank by register/day, cash drops, cash custody transfer records, expected-cash computation, end-of-day count, variance and its honest preservation. Cash is connected to canonical transactions ✓ (Part 17 satisfied) but is not reconcilable.

## 11. TRANSACTION RECORD

**△ TWO PARALLEL MONEY LEDGERS — seam.** Canonical records:
- **Order** (POS + marketplace): order_number, buyer, items (item_id/qty/price snapshots), subtotal/total, payment_method, status, created_date. **Missing: `sale_id`** — LiveSale must join today's Orders to a sale by client-side item-overlap filtering; per-sale money reporting is fragile.
- **Transaction** (worksheet/self-reported): sale_id, item_name (free text), qty, price, payment_method, created_date. **Missing: link to Order or Item.**
- Completed transactions preserve date/time/merchandise/price/method/total ✓ and employee (created_by) ✓; discount is NOT recorded as a field on either ledger (the discount lives in Item.price/original_price + Activity price history). Sale economics (`actualSaleEconomics`) derive gross from **sold Item records**, not from Orders/Transactions — so the two money ledgers are never reconciled against Items. **P1: surface a reconciliation view or at least document the seam; add sale scoping to Order.**

## 12. HIGH-VALUE / RISK-BASED DOCUMENTATION

**✓ EXISTING / SUPPORTED.** Checkout blocks HIGH-VALUE completion by non-operator staff (deterministic pre-check aligned with the Ch19 data-layer RLS that blocks sale-team updates on HIGH_VALUE Items); changeItemPrice enforces operator/seller/admin + explicit reason; Item carries photos/condition/research/verification_status/price history (Activity) — the transaction snapshot (Order line items) preserves item_id + title + price, and the full evidence remains on the Item. **Small seam:** checkout does NOT append `custody_events` (SOLD/RELEASED) for HIGH-VALUE merchandise even though the append-only chain exists — Ch15's chain is not extended by the sale itself (P1 candidate, small).

## 13. NEGOTIATION → CHECKOUT

**✓ EXISTING / SUPPORTED.** Offer → operator accept (authority guidance: Company.negotiation_policy + Item.negotiation_override) → authorized price change through `changeItemPrice` (reason recorded) → cart carries the approved current price → Order. The cashier cannot invent a negotiated price: the cart's price is the Item's approved price, and any change is the canonical price-change path. `Offer.converted_at` is the idempotency anchor for the accepted-offer → checkout handoff (Ch15 P1-40). Gap: the Order line does not record that the price came from an accepted offer (provenance is reconstructable via Offer + Activity, not on the receipt).

## 14. RECEIPTS

**△ EXISTING — generated + printable; nothing else.** `SaleReceipt` renders from the Order (number, date, buyer, payment method, itemized lines, total) and prints via a receipt window. **Distinguish truthfully:** receipt GENERATED ✓, PRINTABLE ✓, DOWNLOADABLE as a file ✕, EMAILED ✕, SMS ✕. Receipt contains a generic pickup note ("pick up during the sale per staff directions") but NOT the sale's pickup window/location from `EstateSale.pickup_plan`, no per-item pickup obligations, no policy reference. Do not call the receipt "sent" anywhere in the book.

## 15. REFUNDS / VOIDS

**✕ NOT SUPPORTED for sale transactions (book must change wording).** No refund policy builder, no refund authority, no refund record linked to an original transaction, no partial refund, no void/refund distinction. What exists: "ALL SALES FINAL — NO REFUNDS OR RETURNS" printable sign; `Order.escrow_status: 'refunded'` (marketplace escrow concept); AdminTransactions shows a 'Refunded' status label for admin-managed platform transactions (wallet/domain — not sale merchandise). If the operator refunds outside the system, nothing records it. **Classification: P1 (smallest truthful refund record + authority) or honest book wording "refunds are operator-policy; EstateSalen records none today."** Never a disconnected negative sale.

## 16. TRANSACTION EVIDENCE / DISPUTES

**△ ASSEMBLABLE, NOT ASSEMBLED.** Canonical records exist to assemble an evidence package: Order + Item (photos, condition, research, price history via Activity/ItemPriceHistory) + Offer/approval + payment method + provider checkout id (in webhook logs only — see §17 gap) + SaleIssue incidents + pickup truth + policies (BusinessDocument POLICY). There is **no dispute view/export** — the operator must hand-assemble across pages. Transaction search: no dedicated search UI by receipt/buyer/amount (AdminEstateSales/Analytics aggregate, not search). **P1/P2: evidence view + export.**

## 17. PAYMENT DATA PRIVACY

**✓ MOSTLY SUPPORTED.** No card-number/CVV/credential fields exist anywhere in the schemas; payment methods are enums/strings; processor secrets live in platform secrets (WIX_*), never in entities. RLS: Order read = creator / seller_id elemMatch / admin (cashier-created Orders visible to the operator via seller_id — the operator CAN see their sale's orders ✓); Transaction = operator/creator/team/admin; Cart = creator/admin only; Purchase = buyer/seller/admin. **Two findings:** (1) **provider transaction reference is NOT preserved** — the webhook receives `order.checkoutId` (and the provider order id) but writes neither onto the Order; the only durable link dies with the Cart deletion. This is an evidence/dispute P0-adjacent gap (P0 list). (2) CheckoutStation's client-side `Cart.filter({user_id: customer})` by a non-admin cashier may be blocked by Cart RLS (created_by_id-only read) — functional/authorization seam to verify in a runtime test (cart QR checkout as staff). (3) Free-text `notes` on Transaction/Order could receive card numbers; no UI discourages it (P1: sensitive-data warning).

## 18. PROCESSING FEES / PROFITABILITY

**✕ PROVIDER FEE NOT CAPTURED.** The webhook does not read/store a processing fee; nothing on Order/Transaction records one. `Expense` (operator-entered, category incl. processing) and the deal's `estimated_processing` are estimates — honest, but not provider truth. Book wording must say: actual per-transaction fees are not tracked; operators record estimated/actual batch fees as Expenses, which flow into Chapter 4 economics (`actualSaleEconomics` includes expenses). **DO NOT estimate and call actual.**

## 19. FURNITURE

**✓ EXISTING / SUPPORTED (Chapter 17 reuse).** Item carries dimensions, disassembly enum + note, removal_note (internal route), pickup_requirements (scheduled_required, window, additional_people, equipment_needed, assistance, special_handling), included/excluded items (components: leaves/cushions/keys ARE representable via included_items + quantity + group_note). Buyer-facing furniture info surfaces via public Item detail + safe pickup subsets. Loading responsibility/property protection live in pickup_requirements + zone protection notes + Ch20/17 tasks.

## 20. PICKUP

**△ MOSTLY SUPPORTED — release detail is thin.** AWAITING PICKUP = Item.status `sold` + no `pickup_completed_at` (deterministic, shown in Live Sale PickupsCard, ClosingCard count, and as a Closeout BLOCKER — "paid merchandise still under company custody"). Pickup requirements/windows display to the team. `authorized_pickup` records a NAME ONLY (PII-minimal ✓, doctrine: never collects ID documents). **Gaps:** no pickup appointment record (Order.pickup_details exists on the schema but POS checkout never populates it); no pickup deadline field; release = `pickup_completed_at` timestamp set in SaleCloseout only — **no who-released / to-whom / method record** (the Item's updated_by is implicit in the update, not surfaced as a release record); HIGH-VALUE custody chain not appended at release.

## 21. PARTIAL / MULTIPLE-TRIP PICKUP

**✕ NOT REPRESENTABLE today.** `pickup_completed_at` is all-or-nothing per Item. A dining set sold as ONE grouped Item (quantity 9: table + 8 chairs) cannot record "table + 4 chairs left Saturday, rest Sunday" — the entire Item flips to picked-up. For individually-tracked Items, each Item is released separately (multi-trip works naturally at the Item level ✓). **Entity test verdict (§30): no new entity — an additive per-Item release line (or custody_events reuse) can represent partial truth; grouped merchandise stays honest only if components are individually tracked (operator's choice at inventory, per Ch15 doctrine).**

## 22. RELEASE

**△ See §20.** WHO released and WHEN: `pickup_completed_at` gives when; who is the updating user (not recorded/displayed). WHAT: the Item itself. TO WHOM: buyer_name/authorized_pickup on the Item (operator-recorded). Verification at pickup: staff can scan the Item QR → ItemInspectDialog shows canonical status/buyer/authorized pickup — a real authorization-check surface ✓. Missing: a release entry with actor + collector confirmation.

## 23. OUTSTANDING / MISSED PICKUPS

**△ PARTIAL.** Outstanding: YES — PickupsCard, ClosingCard, Closeout blocker (all deterministic from Item truth). Missed pickup: NO deadline comparison exists (no pickup deadline field; deal `external_deadlines`/property deadlines exist but nothing joins them to awaiting-pickup urgency). **P1 candidate (small): pickup deadline + property-deadline comparison.**

## 24. CHECKOUT BOTTLENECK / HEALTH

**✕ DO NOT CLAIM.** No queue/wait metrics, no transaction start→payment→confirmation timestamps, no interruption tracking. Available truth: Orders created today (count/gross/by-method — CheckoutCard), payment-unknown Orders, open carts (queryable but not surfaced), checkout Help requests (SaleIssue category checkout). Book must drop Queue Tracking / Interruption Tracking / average-time claims; a small honest "Checkout Health" summary is P2.

## 25. AI

No AI policy assistant, record summary, financial review, or constraint coach exists in this domain. **All P2.** Any future version must summarize/locate existing records only — never invent refund rights or payment states.

## 26. READY-TO-USE TOOLS (all 35 classified)

| # | Tool | Classification |
|---|------|----------------|
| 1 | Checkout procedure | ✓ INTERACTIVE SYSTEM ALREADY BETTER (CheckoutStation + PosPractice) |
| 2 | Cashier opening checklist | ✓ EXISTING via SaleTask checklists (Ch20 opening) — BOOK/printable variant fine |
| 3 | Checkout role card | ✓ EXISTING (Ch19 role cards / authority matrix) — BOOK |
| 4 | Transaction review checklist | ✓ ALREADY BETTER (on-screen review before payment) |
| 5 | Cash opening-bank sheet | ✕ GENUINE GAP (P1 — cash session, §29) — BOOK/printable interim |
| 6 | Cash-drop record | ✕ GENUINE GAP (P1) — BOOK interim |
| 7 | End-of-day cash count | ✕ GENUINE GAP (P1) — BOOK interim |
| 8 | Payment-status guide | ✓ BOOK/TRAINING (PosPractice scenarios s2/s4 already teach it) |
| 9 | Failed-payment procedure | ✓ ALREADY BETTER (CheckoutCard warning + SaleIssue payment category) — BOOK reinforces |
| 10 | Duplicate-charge procedure | ✕ GENUINE GAP (P0 guard) — procedure alone insufficient; system must warn |
| 11 | Payment discrepancy form | ✓ SaleIssue (payment category, is_incident PAYMENT_DISPUTE) ALREADY BETTER |
| 12 | Discount authorization form | ✓ ALREADY BETTER (changeItemPrice authority + reason) |
| 13 | Negotiated-price approval | ✓ ALREADY BETTER (Offer accept → authorized price path) |
| 14 | Receipt template | ✓ EXISTING (SaleReceipt printable) |
| 15 | Furniture purchase receipt | △ SMALL ENHANCEMENT (receipt + Item pickup_requirements note) |
| 16 | Refund policy | ✕ GAP — BOOK (operator's own policy; printable sign exists) + P1 record |
| 17 | Refund authorization form | ✕ GAP (P1 — with §15) |
| 18 | Transaction dispute file checklist | △ P2 evidence view — BOOK interim |
| 19 | High-value transaction checklist | ✓ EXISTING doctrine (HV gates + custody) — BOOK reinforcement |
| 20 | Furniture information card | ✓ EXISTING (public Item detail) |
| 21 | Furniture measurement sheet | ✓ EXISTING (Item.dimensions) |
| 22 | Buyer loading policy | ✓ EXISTING (pickup_requirements special_handling, safe subsets) |
| 23 | Large-item removal checklist | ✓ EXISTING (Ch17 removal architecture + tasks) |
| 24 | Property-protection checklist | ✓ EXISTING (zone protection notes + Ch20 tasks) |
| 25 | Pickup scheduling form | ✕ GAP (no appointment record) — P1 SMALL |
| 26 | Authorized pickup form | ✓ EXISTING (authorized_pickup, name-only) |
| 27 | Sold tags | ✓ EXISTING (PrintSigns: SOLD, SOLD—AWAITING PICKUP, ITEM SOLD—DO NOT REMOVE) |
| 28 | Paid/Awaiting Pickup tags | ✓ EXISTING (same) |
| 29 | Component labels | △ SMALL ENHANCEMENT (ItemLabels per-item QR covers individually-tracked components; grouped items get one label) |
| 30 | Pickup receipt | △ SMALL ENHANCEMENT (receipt pickup note → real window/location from pickup_plan) |
| 31 | Partial-pickup record | ✕ GAP (P1, additive release line) |
| 32 | Merchandise release form | △ SMALL ENHANCEMENT (release actor/collector record, §22) |
| 33 | Missed-pickup procedure | △ P1 deadline field — BOOK interim |
| 34 | Outstanding-pickup report | ✓ ALREADY BETTER (PickupsCard/Closeout) |
| 35 | Checkout bottleneck review | ✕ DO NOT CLAIM (no data) — LATER/P2 |

## 27. DO-NOT-REBUILD

Satisfied already by: **Ch15** (Item inventory levels, item numbers, QR, inspect dialog), **Ch16** (price authority, negotiation policy, discount schedule + exclusions), **Ch17** (furniture/removal/staging, pickup requirements), **Ch18** (buyer consent — checkout never creates marketing consent ✓ cart/hold buyer info stays operational), **Ch19** (Authority Matrix, cashier limits, PosPractice), **Ch20** (Live Sale checkout card, discount guidance, payment-unknown warnings, SaleIssue payment/incident, awaiting-pickup views, closing checklists), **Ch8** (receipt, labels, QR loop, sold-status sync), **Ch4** (sale economics). **Refuse to build:** CheckoutTransaction, PaymentTransaction, FurnitureSale, CashTransaction-as-expense-forcing, PaymentIncident, PickupItem, second receipt entity, second hold system (Item.hold via itemHold is the one hold truth), queue-metrics theater.

## 28. PAYMENT ATTEMPT ENTITY TEST

**＋ GENUINE REQUIREMENT — smallest form recommended, NOT BUILT.** Existing architecture cannot represent "attempt 1 UNKNOWN, attempt 2 APPROVED" without rewriting attempt 1 into fiction: Cart holds ONE `pending_checkout_id`; a retry overwrites it; the webhook cannot distinguish attempts; DECLINED/UNKNOWN leave no record at all. **Recommendation:** a lightweight `PaymentAttempt` (order/cart ref, provider, provider session/transaction ref, amount, status: PROCESSING|UNKNOWN|DECLINED|FAILED|APPROVED|VOIDED, timestamps) — OR an additive `payment_attempts` array on Order plus making the POS path create a PENDING Order before redirect (Order.status already has `pending_payment`). Either preserves attempt truth and enables the duplicate guard. **DO NOT IMPLEMENT — audit only.**

## 29. CASH SESSION ENTITY TEST

**＋ GENUINE REQUIREMENT if Chapter 21 cash promises are kept — NOT BUILT.** Cash controls do NOT fit Expense (semantically wrong: a drop is not a cost; an opening bank is not an expense; variance is not a line item) and LaborEntry is unrelated. The smallest honest architecture is one `CashSession` (sale/day, opening bank, drops[], authorized adjustments[], closing count, expected derived, variance + status OPEN/EXPLAINED/RESOLVED) reusing Order/Transaction for cash sales. Until built, cash promises must be BOOK/PRINTABLE only. **DO NOT IMPLEMENT.**

## 30. PICKUP ENTITY TEST

**✓ NO NEW ENTITY — additive fields suffice.** Scheduled pickup → Order.pickup_details (exists, unpopulated) or Item pickup window; authorized person → Item.authorized_pickup ✓; deadline → additive Item/sale field; partial pickup + release history → additive per-Item release entries or reuse of custody_events pattern; multiple trips → individually-tracked Items release independently. Exact gap: **partial release for grouped merchandise and release actor/collector detail** — an additive release line, not an entity. **DO NOT IMPLEMENT.**

## 31. TRANSACTION STATE ARCHITECTURE (actual)

- **CART:** Cart entity (client state, one per user, `pending_checkout_id` when online attempt in flight).
- **ORDER:** Order (created `paid` offline at cashier completion; created `paid` online only by webhook; `pending_payment`/`processing` exist in the enum but the POS flow never writes them — marketplace/Purchase path uses PENDING_PAYMENT_*).
- **PAYMENT:** no canonical attempt record; online truth = provider webhook event; offline truth = cashier attestation on Order.payment_method.
- **ITEM:** `available → reserved/pending (hold) → sold (sold_date, payment_method_used) → pickup_completed_at (release)`.
- **Correctly separate** — no giant transaction status. ✓ architecture doctrine.

## 32. FINANCIAL VS OPERATIONAL COMPLETION

Actual implementation honors the split: **financially complete** = Order `paid` (+ Item `sold` sync); **operationally open** = Item `sold` without `pickup_completed_at` — surfaced as awaiting-pickup everywhere and as a **Closeout blocker** ("paid merchandise still under company custody"); EstateSale cannot be marked completed while pickups are open (step-1 blocker) unless the operator explicitly marks each picked up. ✓ doctrine implemented. Money-complete-alone is explicitly insufficient in the deployed closeout.

## 33. SMALLEST RECOMMENDED ARCHITECTURE (DO NOT IMPLEMENT)

1. POS Order becomes PENDING before redirect + `payment_attempts` truth (attempt list with provider refs, status, timestamps).
2. Duplicate-charge guard: block a second provider session while an attempt is PROCESSING/UNKNOWN for the same cart; resolve-by-checkoutId (never overwritten, list-append).
3. Webhook: availability re-check before marking Items sold + append custody event + store provider reference on Order + add `sale_id` to Order.
4. Release line: actor + collector + timestamp (+ partial for grouped items).
5. Receipt: real pickup window/location from sale pickup_plan.
6. CashSession (as §29) if cash promises are kept.
7. Sensitive-data warning on money-record notes; CheckoutHealth exception list (open carts with pending attempts).

## 34. INTERFACE / DATA / WORKFLOW / PERMISSION GAPS

- **Interface:** no payment-exception list for carts with pending/unknown attempts; no pickup appointment entry; no release actor capture; receipt lacks pickup window; no transaction search.
- **Data:** Order missing sale_id + provider reference; Transaction missing Item/Order link; no attempt record; no pickup deadline; no fee truth.
- **Workflow:** unknown-payment verification flow (customer says paid → check merchant record → resolve → continue) exists as doctrine/training (PosPractice s2, CheckoutCard warning) but no system state machine enforces it; missed-pickup detection absent.
- **Permissions:** verify Cart RLS vs. staff cart-QR checkout (staff may be unable to read a customer's cart — functional seam); Transaction.create allows any authenticated user for any sale (self-reported buyer purchases rely on this; monitor for abuse).

## 35. P0 / P1 / P2 / P3 / LATER

- **P0:** (1) Duplicate/retry online POS payment can silently drop a captured charge — no attempt guard, overwrite of the only link (§8). (2) POS webhook marks Items sold with NO availability re-check — a paid item can be overwritten to a second buyer and a second Order created for already-sold merchandise (§7/§79). (3) Provider transaction reference not preserved on the Order — evidence/dispute truth lost by design (§17).
- **P1:** payment-verification workflow state (pending Order + exception surfacing); do-not-sell server-side atomic claim (race window is client-checked only); release record (who/whom); receipt pickup window; pickup deadline + missed-pickup warning; pickup appointment population (Order.pickup_details); Order.sale_id; sensitive-data warning; cash controls (if chapter keeps cash promises); checkout custody-event append for HIGH-VALUE; refund record + authority (smallest honest version) — subject to operator demand.
- **P2:** AI policy assistant / record summary / financial review / constraint coach; transaction search/evidence export; checkout health; fee analysis.
- **LATER:** queue estimation, interruption tracking, predictive staffing, dispute submission, hardware drawer integration.
- **P3/wording:** do not claim queue metrics, actual fee tracking, digital receipt delivery, refund capability, or "sent" receipts.

## 36. BOOK TRUTH (every promise, compressed classification)

Checkout Mode ✓; Scan-to-Cart ✓; Quick General Merchandise ✓; Authorized Discounts ✓; Transaction Review ✓ (cart price snapshot seam noted); Checkout Help Routing ✓; Payment Confirmation ✓ online / cashier-attested offline (WORDING: "merchant-verified" only online); Processing Status △ (attempt states missing); Unknown Payment Hold △ (warning yes, representation no); Duplicate Payment Warning ✕ NOT YET (P0); Payment Verification Workflow △ doctrine+training only; Merchant Verification ✓ (webhook-only PAID); Pending Transaction Warning △ (Order-based only — online pending invisible); Retry Protection ✕ (P0); Manager Escalation ✓; Payment Incident Record ✓; Opening Cash Record ✕; Cash Transaction Log ✓ (as transactions, not a log); Cash Drop Record ✕; Cash Custody △ (found-cash only); Expected Cash Balance ✕; End-of-Day Cash Count ✕; Automatic Transaction Record ✓; Tracked Item Connection ✓; Status Update ✓; Receipt Generation ✓ (generated+printable only — WORDING); Transaction Search ✕; Tiered Transaction Records ✓ (naturally via Item levels); High-Value Documentation ✓; Furniture Transaction Record ✓; General Merchandise Sale ✓; Risk-Based Documentation ✓; Approved Price Before Checkout ✓; Manager Price Approval ✓; Negotiation Record ✓; Cashier Limits ✓; Unresolved Price Routing ✓ (help keeps cart); Itemized Receipt ✓; Pickup Status △ (generic note only); Pickup Instructions ✕ on receipt (fields exist); Policy Reference △ (printable sign only); Digital Receipt — WORDING CHANGE (printable, not sent); Refund Policy Builder ✕; Category Exceptions ✕; Refund Authorization ✕; Refund Record ✕; AI Policy Assistant P2; Transaction Evidence File △ assemble-only; Payment Provider Reference ✕ (P0); Dispute Export ✕ (P2); Record Timeline △ (Activity/Item truth reconstructable); AI Record Summary P2; Payment Provider Integration ✓; Minimal Customer Data ✓; Role-Based Access ✓ (Cart-RLS seam verify); Sensitive Data Warning ✕ (P1); Data Retention Controls — WORDING CHANGE (records are kept; no configurable retention); Processing Fee Tracking ✕ — WORDING CHANGE; Payment Method Analysis ✓ (CheckoutCard by-method); Fee-to-Sale Connection △ (Expense estimates only); Provider Cost Review ✕; AI Financial Review P2; Furniture Information Card ✓; QR Furniture Details ✓; Included Components ✓; Removal Notes ✓; Availability Status ✓; Loading Policy ✓; Buyer Responsibility ✓; Specialized Mover Requirement △ (equipment/assistance flags, no explicit "specialized mover" flag — SMALL ENHANCEMENT); Removal Route ✓; Property Protection Requirements ✓; Paid/Awaiting Pickup ✓; Pickup Scheduler ✕; Buyer Pickup Confirmation — NOT CAPABLE (nothing sent); Authorized Pickup Person ✓; Pickup Deadline ✕; Printable Sold Tag ✓; Buyer Identifier △ (order number; no minimal-PII pickup tag — SMALL ENHANCEMENT); QR Sold Status ✓ (staff scan → inspect shows truth); Component Labels △; Do Not Sell Alert △ (client-side guard + webhook gap = P0 seam); Pickup Check-In △ (find via item scan; no purchase-lookup by receipt/buyer — SMALL ENHANCEMENT); Authorization Check ✓ (inspect shows buyer/authorized pickup); Item Verification ✓; Multiple-Trip Pickup △ (per-Item yes; grouped ✕); Employee Release Record ✕ (timestamp only); Pickup Status Chain △ (AWAITING ✓ → RELEASED ✓; no IN-PROGRESS/PARTIAL states); Outstanding Pickup Dashboard ✓; Missed Pickup Alert ✕; Property Deadline Warning ✕; Final Release ✓ (closeout blocker); Queue Tracking ✕ DO NOT CLAIM; Transaction-Time Review ✕ (only created_date); Interruption Tracking ✕; Checkout Performance Review ✕ (only today's counts); AI Constraint Coach P2.

## 37. PAYMENT TRUTH MATRIX

| CONDITION | PROVIDER TRUTH | ESTATESALEN TRUTH | ITEM EFFECT | RELEASE ALLOWED? | EMPLOYEE ACTION |
|---|---|---|---|---|---|
| NO ATTEMPT | none | Cart only | available | No sale to release | Sell or hold normally |
| PROCESSING | session open | Cart.pending_checkout_id (invisible to dashboards) | available (resellable — RISK) | Procedurally no; not enforced | Wait / help |
| UNKNOWN | ambiguous | NOTHING recorded (gap) | available (resellable — RISK) | Doctrine: never; not enforced | Verify with operator/provider; raise payment issue |
| DECLINED | declined | NOTHING recorded (gap) | available | No (doctrine/training) | Offer another method; raise issue |
| FAILED | failed | NOTHING recorded (gap) | available | No | Retry is a financial action — currently unguarded (P0) |
| APPROVED | order_approved webhook | Order paid (webhook-only) | sold + sold_date + payment_method | Yes, to buyer/authorized person; record pickup | Release + mark pickup |
| VOIDED | n/a | not represented | — | — | n/a today |
| PARTIAL/FULL REFUND | n/a | not represented (escrow enum only) | unchanged sold | — | Operator policy outside system |

## 38. ITEM / MONEY / CUSTODY MATRIX

| STATE | ITEM | ORDER/PAYMENT | PICKUP | RESELL? | RELEASE? |
|---|---|---|---|---|---|
| AVAILABLE | available | — | — | Yes | n/a |
| HOLD | reserved/pending + hold block | no money truth | — | No (guard) | No |
| IN CART | available + cart line | cart only | — | Yes (race risk) | No |
| SOLD/ORDERED (offline completing) | sold at Order creation | Order paid (cashier attestation) | awaiting | No (guard re-check; race window) | After paid ✓ |
| PAYMENT PROCESSING (online) | available (gap: looks resellable) | cart pending link only | — | **Yes — RISK** | Doctrine no |
| PAYMENT UNKNOWN | available | nothing | — | **Yes — RISK** | Doctrine no |
| PAID + LEAVES NOW | sold, pickup at once | Order paid | record pickup immediately | No | Yes |
| PAID + REMAINS | sold, no pickup_completed_at | Order paid | AWAITING (surfaced + closeout blocker) | No | Yes when collected |
| PICKUP IN PROGRESS | not represented | — | △ | — | — |
| PARTIAL PICKUP | not representable (grouped) | — | △ | — | — |
| RELEASED | pickup_completed_at set | paid | complete | No | done |
| REFUNDED | not represented | escrow enum only | — | — | — |

## 39. CASH RECONCILIATION MATRIX

| ELEMENT | SOURCE | SUPPORT | GAP |
|---|---|---|---|
| Opening bank | — | ✕ | No register/session record |
| Cash sales | Order.payment_method=cash; Transaction cash | ✓ derivable | split across two ledgers, no sale_id on Order |
| Cash refunds | — | ✕ | No refund truth |
| Cash drops | — | ✕ | Not representable |
| Authorized adjustments | — | ✕ | Not representable |
| Expected cash | derivation | ✕ | Cannot compute (inputs missing) |
| Actual count | — | ✕ | No entry point |
| Variance | — | ✕ | — (must never auto-zero — nothing to zero today) |

## 40. RECEIPT / EVIDENCE MATRIX

| TYPE | EVIDENCE EXISTS | ON RECEIPT TODAY | SHOULD ADD |
|---|---|---|---|
| Ordinary merchandise | Transaction (worksheet) | n/a (worksheet has no receipt) | P2 printable slip |
| Tracked Item | Order + Item + Activity price history | itemized line ✓ | offer provenance optional |
| HIGH_VALUE | Item research/custody + changeItemPrice reason | line only | custody append (P1) |
| Furniture | Item pickup_requirements/dimensions | generic pickup note | window/location + requirements (P1) |
| Pickup | pickup_completed_at | generic note | per-item obligation, deadline |
| Refund | ✕ | ✕ | refund record (P1) |

## 41. PICKUP / RELEASE MATRIX

| STATE | PAYMENT REQ? | AUTHORIZED PERSON CHECK | EMPLOYEE ACTION | RECORD | CAN CLOSE? |
|---|---|---|---|---|---|
| AWAITING PICKUP | paid (Order) | inspect shows buyer/authorized_pickup | locate via scan; arrange | Item truth | when released |
| CHECKED IN | △ (scan → inspect) | ✓ visual | find + verify | none new | — |
| PARTIAL PICKUP | ✕ | — | — | not representable | grouped: prematurely yes (RISK) |
| PICKUP IN PROGRESS | ✕ state absent | — | — | — | — |
| RELEASED | paid | name check procedural | mark picked up (Closeout) | pickup_completed_at only | Yes |
| MISSED DEADLINE | ✕ | — | invisible today | none | — |

## 42. CHECKOUT HEALTH MATRIX

| METRIC | YES/NO | SOURCE | LIMITATION |
|---|---|---|---|
| Open carts | data yes / UI no | Cart entity | not surfaced |
| Payment processing | no | (cart pending id) | invisible |
| Payment unknown | no | — | not represented |
| Failed payments | no | — | not represented |
| Paid/awaiting pickup | YES | Item truth | honest |
| Checkout help requests | YES | SaleIssue category checkout | honest |
| Transaction count/gross | YES | Orders today | per-sale join is client-side (no Order.sale_id) |
| Queue wait | NO | — | do not claim |
| Average transaction time | NO | only created_date | do not claim |
| Interruptions | NO | — | do not claim |

## 43. CHECKOUT TRACE

QR Item → scan → ItemInspectDialog → add to cart (availability ✓) → save cart → cashier scans cart QR → review (items/qty/price/total ✓) → discount guidance (guidance only ✓) → payment: **offline** → Order paid + Item sold + receipt ✓ boring; **online** → create-checkout session → redirect → webhook APPROVED → Order paid + Item sold ✓. **Broken seams:** (a) cart line price is a snapshot — a price change after cart save charges the stale price (re-fresh fetch happens only for the guard's status check); (b) online pending/unknown leaves no order-truth; (c) provider reference discarded; (d) webhook does not re-verify availability.

## 44. UNKNOWN PAYMENT TRACE

Customer attempts card → provider result ambiguous → **nothing is recorded**; customer shows a pending bank charge → cashier has: CheckoutCard warning only if an Order exists (it doesn't in this flow) → doctrine/training says STOP, verify, raise a payment issue (PosPractice s2) → resolution happens at the provider; if APPROVED arrives, webhook completes; if never, cart remains with pending_checkout_id (invisible) and the item stays available. **Expected STOP is trained but not system-enforced, and the ambiguous state is unrecorded. P0/P1 as §35.**

## 45. DUPLICATE PAYMENT TRACE

Attempt 1 unresolved → employee clicks Pay Online again → new session, link overwritten → **no warning, no stop**. If attempt 1 later APPROVES → webhook finds no cart → 200 OK, charge dropped from all records. Attempt 2 approves → Order created. **Result: two charges, one record. P0.**

## 46. CASH TRACE

Opening bank → ✕ no record. Cash sale → ✓ Order (POS) or Transaction (worksheet). Cash drop → ✕. Cash refund → ✕. Closing count → ✕. Expected → ✕. Variance → ✕. Cash is transaction-connected but not reconcilable. (Found cash correctly routes to SaleDiscovery, never revenue ✓.)

## 47. FURNITURE TRACE

Item (dimensions/components/removal/pickup requirements ✓) → buyer info (public detail + safe pickup subset ✓) → approved price (authority ✓) → payment (Order/Item ✓) → sold tag (PrintSigns SOLD—AWAITING PICKUP ✓) → awaiting pickup (✓ surfaced) → pickup appointment → ✕ not recorded (window text only) → authorized collector (name on Item ✓) → component verification (inspect + labels △) → release (timestamp only △). Seams: appointment, release detail, partial.

## 48. PARTIAL PICKUP TRACE

Table + 8 chairs + 2 leaves as ONE grouped Item → buyer takes table + 4 chairs → **system can only mark the whole Item picked up or nothing** — partial truth is lost and the purchase falsely closes. If each chair is an individually-tracked Item → works perfectly. Recommendation (audit-only): additive release lines; the Ch15 grouped-merchandise doctrine remains the operator's control point.

## 49. REFUND TRACE

Original transaction → refund request → **policy ✕ → authority ✕ → provider action ✕ → refund record ✕ → Item consequence ✕ → financial reporting ✕.** Entire chain absent. Either build the smallest P1 (policy note + authority + linked record) or the book states refunds are out-of-system operator policy today.

## 50. DISPUTE TRACE

Search transaction △ (no search UI; IDs navigable) → receipt ✓ → Item evidence ✓ (photos/research/history) → payment reference ✕ (P0) → policy △ → pickup/release evidence △ (timestamp only) → timeline △ (Activity + created/updated dates) → export ✕. Assemble-by-hand only.

## 51. PROCESSING FEE TRACE

Provider charge → fee returned by provider? (webhook does not read one) → **not stored** → operator enters estimated/actual Expense → Chapter 4 economics → profitability. Honest today only as operator-entered expense. WORDING CHANGE required.

## 52. MULTI-PROVIDER TEST

Core business truth is largely provider-neutral: payment_method strings/enums, Order/Item independent of processor UI; the only provider coupling is the Wix session construct + JWT webhook (correctly isolated in two functions). Adding a processor would require only a new attempt/confirm seam — currently the *absence* of an attempt record is the coupling risk (one pending_checkout_id, one webhook resolver). Acceptable; rearchitecture NOT needed.

## 53. PRODUCT DOCTRINES (adherence)

CHECKOUT SHOULD BE BORING ✓; ITEM tells merchandise truth / TRANSACTION money truth △ (dual ledger); phone ≠ merchant record ✓; PENDING ≠ APPROVED ✓ (webhook-only); UNKNOWN ≠ PAID ✓ doctrine / ✕ representation; NEVER create financial certainty from ambiguity △ (nothing recorded = no false certainty, but also no truth); RETRY IS A FINANCIAL ACTION ✕ (unguarded — P0); HOLD≠SOLD≠PAID≠PICKED UP ✓ all separated; payment-confirmation vs custody different truths ✓; do not turn low-value into inventory project ✓; negotiation before payment ✓; good records need endings △ (release ends custody minimally; attempt records have no ending); paid-item-in-house is an open obligation ✓ (closeout blocker).

## 54. RECOMMENDED IMPLEMENTATION SEQUENCE (DO NOT IMPLEMENT)

1. **P0 payment-truth guards** (pending POS Order before redirect; attempt list; retry guard; webhook availability re-check; provider ref + sale_id on Order; webhook buyer_name fix — currently stores user ID as buyer_name).
2. **P1 release & pickup detail** (release actor/collector; appointment via Order.pickup_details; deadline + missed-pickup warning; receipt pickup window).
3. **P1 checkout health exceptions** (carts with pending/unknown attempts; sensitive-data warning).
4. **Cash controls (CashSession)** if the chapter's cash promises are kept — else printable-only wording.
5. **P2** evidence view/export, transaction search, AI assistants.

## 55. PRE-LAUNCH DEPENDENCIES (carried forward)

- **Chapter 19 non-owner employee denial test** (HIGH_VALUE price change): still manual-pending; directly protects checkout money paths — remains a pre-launch item.
- **Chapter 20 Attendance exit-button manual confirmation:** operational only; NOT a Chapter 21 blocker.
- **Cross-company transaction/payment RLS verification:** Item/Order/Transaction RLS rules exist (operator/seller/team/admin scoped); runtime cross-company test still pending; relevant to this chapter (money records) — carry as pre-launch.
- **Cart RLS vs. staff cart-QR checkout (new finding):** verify a non-admin cashier can actually read a customer's cart; if not, the POS cart flow is admin-only in practice — pre-launch functional check.
- Existing cosmetic console warnings: unrelated; not blockers.

## 56. CERTIFICATION

# ✕ NO-GO

The merchandise→price→cart→payment→transaction chain is real and largely honest (offline POS is genuinely boring), and custody separation (paid ≠ picked up ≠ released, with a hard closeout blocker) is among the strongest architecture in the product. **But the Chapter 21 central question fails today on the money side for the online POS path:** payment attempts are unrepresentable, a retried payment can silently discard a captured charge, the provider reference is destroyed by design, and the webhook can resell already-sold merchandise. Those are P0s, not wording issues. Certification becomes **GO WITH CONDITIONS** once the §35 P0 set lands; cash controls and release detail are the P1 conditions.

**STOP. Chapter 21 NOT built. Chapter 22 NOT started. Awaiting explicit authorization.**