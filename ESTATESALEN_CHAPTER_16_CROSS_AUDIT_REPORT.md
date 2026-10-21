# CHAPTER 16 — ESTATESALEN CROSS-AUDIT REPORT
## Research, Comparable Evidence & Pricing Intelligence (AUDIT ONLY — NOTHING BUILT)

Date: 2026-10-21 · Method: source-level inspection of deployed entities, functions, pages, components, workflows, and agents. No production data touched, nothing deployed.

---

## EXECUTIVE SUMMARY

- **Coverage: ~40% of Chapter 16 promises are EXISTING / SUPPORTED today** (largely through Chapter 15's research/facts/verification architecture, the Chapter 14 research guard, Offer/checkout snapshots, custody, and the professional network). ~15% are supported with SMALL ENHANCEMENTS. ~35% are genuine gaps (concentrated in: per-Item comparable evidence, price range/rationale/history, negotiation/discount rules, selling-channel decision, appraisal handling, buyer-interest capture for estate inventory). ~10% are P2/LATER/DO-NOT-BUILD.
- **Strongest existing architecture:** Chapter 15's Item research stack (research_notes vs verified_facts vs verification_status, AI_SUGGESTION firewall, photo privacy), the research-before-pricing guard with explicit operator override, immutable Offer/transaction amount snapshots, custody/off-site specialist tracking, and the Publication-Sync-on-Item-Change workflow.
- **Largest genuine gaps:** (1) no structured per-Item comparable-evidence store — Google Lens output is stored as a photo-scoped "Market Price Range" with asking prices presented as market evidence; (2) no price range/rationale/authorization layer for consequential merchandise; (3) no negotiation/discount-schedule configuration anywhere; (4) no selling-channel decision or appraisal context on Item.
- **One wording/honesty P0 and one permission gap** identified (below). No data-truth P0s found: Offer amounts and transaction amounts are immutable by architecture.

---

## 1. ITEM RESEARCH FOUNDATION
- Item (base44/entities/Item.jsonc) already holds: `photo_library` (purpose/privacy per photo), `brand`, `maker`, `model`, `serial_number`, `signature_mark`, `materials`, `dimensions` (incl. depth/unit, P1-25), `condition` + `condition_notes` (damage/missing/repairs/summary), `research_notes` (working info), `verified_facts` (approved), `verification_status`, `custody_events`, `offsite_research`.
- **Verdict:** ✓ EXISTING/SUPPORTED (Chapter 15). Chapter 16 needs **no new research fields** on Item. Additive needs (comparables, price range, rationale) are pricing-layer, not research-layer.

## 2. CONDITION / PROVENANCE
- Condition: enum + structured `condition_notes` (damage/missing_parts/repairs/summary) is sufficient to explain why a similar comparable isn't comparable. Testing status (electronics "tested/works") is NOT structured — only free text. △ ENHANCE (optional "tested" note; do not over-model).
- Provenance: family statements land in `research_notes` (source CLIENT_FAMILY_STATEMENT, labeled unverified); documentary evidence and specialist input are distinct source_types; operator conclusion lives in `verified_facts` with who/when. ✓ EXISTING — no second provenance system needed.

## 3. RESEARCH STATUS
- Actual architecture is a clean TWO-AXIS model, correctly not collapsed:
  - `Item.research_status` (CLEAR/RESEARCH_NEEDED/VERIFY/SPECIALIST_REVIEW) = attention state, human-set.
  - `Item.verification_status` (UNVERIFIED/RESEARCHING/REASONABLY_VERIFIED/SPECIALIST_REVIEWED) = identification-fact state.
- Book states UNRESEARCHED/RESEARCHING/READY-TO-PRICE/SPECIALIST-REVIEW map acceptably. **Do not collapse.** "READY TO PRICE" does not exist as an explicit state (see §5).

## 4. COMPARABLE EVIDENCE (major finding)
- What exists:
  - `SaleItemPricing` — photo-scoped Google Lens output (min/avg/max, top_matches, user_price). Legacy sale-photo surface; NOT linked to Item; matches are retail listings.
  - `ItemKnowledge` + `ItemPriceHistory` — platform-level item knowledge repository with per-observation `sold_status` (sold/listed/estimated/unknown), source_type, source_url, condition, location. Keyed to knowledge records, not to a specific operator Item.
  - `Item.research_notes` — free text only.
- What does NOT exist: a per-Item curated comparable store with asking-vs-sold classification, condition/venue/geography context, outlier flag, usefulness. ✕ genuine gap.

## 5. READY TO PRICE
- Closest deterministic composite: `researchGuard.researchBlocked()` + `readinessCues()` (needs price/photo, research required blocks) + verification_status. The system can show honest cues but has NO explicit "operator has enough evidence to make a defensible pricing decision" state. ＋ BUILD candidate (P1): derive "Ready to price" as a deterministic display from existing fields (research CLEAR-or-overridden + price set + level-appropriate evidence), NOT a new stored state that can go stale.

## 6. ASKING VS SOLD
- `ItemPriceHistory.sold_status` (sold/listed/estimated/unknown) proves the DATA model can distinguish. But no operator-facing per-Item comparable UI classifies it, and the Google Lens pricing tool **labels retail listing matches as "Market Price Range"** — asking prices presented as market evidence. △ P0 wording + P1 structured surface.

## 7. COMPARABLE QUALITY / RANGE / OUTLIERS
- Range: SaleItemPricing/ItemKnowledge compute min/avg/max — but no body-of-evidence view with sample-size honesty, no per-Item usefulness/outlier flag. ＋ P1 (in the comparable-evidence feature).

## 8. INTERNAL HISTORICAL COMPARABLES
- Operator's own sold Items exist as queryable canonical records (`Item.status='sold'`, sold_price, sold_date, category, condition; `SoldInventory.jsx` page). There is NO "find my similar sold items" matching today. Data supports it; feature is ＋ P1/P2 (historical match). `itemMatchingService` exists but operates on the platform knowledge repository, not operator-scoped item search.

## 9. AI RESEARCH (Parts 15–21)
- `analyzeItemImage` (deployed): sensitive-material screen + category + searchQuery only. It does NOT suggest maker/model/period/material/style, does not expose uncertainty — but whatever it returns is structurally advisory (goes to search query / research path, never to verified_facts).
- `BatchPricingModal` / DeepSearch prompts explicitly instruct "Look for SOLD/COMPLETED listings when possible" and return 3 site prices + range — but results are stored on sale photos (ai_first_search_price / ai_deep_search_price / price), not Item-linked, and asking-vs-sold is not surfaced.
- AI Suggestion Label: ✓ EXISTING — `AI_SUGGESTION` source exists ONLY in research_notes; `approveNoteToFact` in UnifiedItemForm forces AI_SUGGESTION → RESEARCH_SOURCE provenance before a fact is approved. Firewall verified.
- AI Research Summary / Missing-Evidence Prompt / Search Builder / Comparable Organizer / Channel Coach / Pricing Coach: ✕ NOT EXISTING. → P2.
- `InventoryPricingAgent.jsonc` (agent config) promises comparable research, sold-data ranges, condition adjustments — it is an advisory chat agent over ItemPriceHistory, NOT wired into item pricing workflow; do not classify its claims as operator workflow truth.

## 10. VERIFICATION / CLAIM CONTROL
- ✓ EXISTING (Chapter 15 certified): facts become buyer-facing only via human approval (`stampFacts`, verified_by/at); publication payload derives from approved photos/verified facts (brandTruthGuard/publicationPayload, Ch15-certified); research_notes never projected publicly. Terminology: REASONABLY_VERIFIED/SPECIALIST_REVIEWED carry explicit "not an appraisal/authentication" doctrine. PASS.

## 11. CONSEQUENCE-BASED VERIFICATION
- Architecture supports it via inventory_level (QUICK→HIGH_VALUE workflow depth) + research_status + verification_status + research override (who/when/reason). There is NO explicit "HIGH CONSEQUENCE RESEARCH" value-risk flag (original-vs-reproduction, signed-vs-unsigned). △ SMALL ENHANCEMENT (a value-risk reason vocabulary on research flag — data fits in research_reason today).

## 12. RESEARCH PRIORITY / ROI
- ✓ reuse: research_status + inventory_level + SaleTask priority. LaborEntry already tracks `research` and `pricing` work categories → research-time-vs-consequence guidance is derivable deterministically. No AI ROI intelligence exists (correctly P2/LATER).

## 13. SPECIALIST NETWORK / REQUEST
- Directory: Chapter 11 Professional Network service categories cover jewelry, fine art, coins, vehicles, appraisal, auction, consignment, collectibles/specialty, plus "other". Books/tools not named but covered by collectibles_specialty/other. ✓ adequate.
- Escalation: research flag SPECIALIST_REVIEW exists; custody transfer to specialist exists (`offsite_research`, TRANSFERRED_SPECIALIST/RETURNED events). But there is NO "send to specialist with assembled evidence" action — WhoCanHelpPanel is not Item-linked; an operator would re-type context. ✕ "One-click specialist request" is NOT true today → WORDING SHOULD CHANGE ("route to your professional network — assemble the request from the item record" is a P1 build; until then the book must not say one-click).

## 14. SPECIALIST OPINION
- Today a specialist opinion can only live as a research_note (source SPECIALIST_INPUT) or an approved fact (SPECIALIST_REVIEWED + verified_facts entry). No structured who/date/opinion/basis/attachments/independence record. △ SMALL ENHANCEMENT: structured `specialist_opinions` block on Item (who, at, opinion, basis, attachments, relationship INDEPENDENT/POTENTIAL_BUYER/BOTH). Not a new entity.

## 15. APPRAISALS
- BusinessDocument supports scopes business/sale/contact/team_member — **no item scope**; no appraisal-context fields anywhere; no client-explanation content. `Item.original_price` exists but is unused in all code (dead field). ✓ appraisal ≠ price: nothing copies external values into Item.price (no path exists at all). Gaps: ＋ item-scoped document + appraisal context (date, appraiser, purpose, market type, assumptions, condition-vs-appraisal note) — P1; client-education language is content (✎ book/website content, not core software).

## 16. LOCAL MARKET / BUYER HISTORY
- `Item.views` increments on marketplace item detail; **`Item.saves` is never written by any code**; Watchlist keys on marketplace_item_id only — estate-sale inventory interest is NOT captured. Sale-level views/saves exist. ✕ buyer-interest history for estate inventory is a genuine gap (classify: ＋ P1 small — surface + capture in QR checkout/digital item view; Chapter 18 owns deeper intelligence).

## 17. SELLING WINDOW / GEOGRAPHY / REACH
- Selling window: EstateSale.sale_dates, deal external_deadlines, client family_deadline on excluded areas — ✓ derivable in a pricing view; no duplicate timeline needed.
- Geography/market context: no field distinguishes local pickup vs regional vs national/shipped in pricing research. △ P1 (a market-context enum on comparables + guidance that internet results don't transfer to local floor price).
- Marketing reach: `featured` flag + Marketing Kit exist (Ch18 owns deeper). ✓ minimal support.

## 18. SELLING CHANNEL
- `Item.sales_channels` enum is only inventory/marketplace. No AUCTION/CONSIGNMENT/SPECIALTY/DIRECT evaluation, no "consider alternate channel" flag, no channel-outcome record. Professional Network can refer out (Chapter 10 referred_service), and SaleScope post_sale_plan covers disposition (Ch22). ＋ P1: channel decision (flag + reason + SaleClientDecision linkage for client approval). Not premature analytics.

## 19. PRICING DECISION VIEW
- `ItemInspectDialog` is the closest surface: price, verification, offer count, photo, facts. No comparables/appraisal/local history/selling window aggregation. ✕ CLASSIFY P1 — a pricing decision view composed from existing canonical fields (largest single Chapter 16 product gap).

## 20. PRICE RANGE / OPENING PRICE / RATIONALE
- `Item.price` = current asking price (canonical; checkout/labels/QR read it live). `original_price` dead/unused → opening price is NOT preserved after change (only via Activity text log). No evidence-supported price range. No pricing rationale. ＋ P1: `price_range_low/high` + `pricing_rationale` + repurpose `original_price` (set once, never overwritten).

## 21. PRICE HISTORY
- ✓ partial: `logItemChange('price')` writes an Activity record (item-linked) with `$old → $new`, who (created_by_id), when — best-effort, already deployed in UnifiedItemForm. Missing: reason. **Smallest reliable architecture: keep Activity as the price log, add an optional reason input at change time** (no dedicated entity needed for P1).

## 22. NEGOTIATION RULES / OFFER THRESHOLDS / APPROVAL LEVELS
- ✕ nothing exists: no company negotiation policy, no employee discount authority, no auto-decline/escalation thresholds. Offer accept/reject is free for anyone with sale update rights. ＋ P1 (Company-level negotiation policy + HIGH_VALUE guard; see P0 below).

## 23. DISCOUNT SCHEDULE / EXCLUSIONS
- ✕ nothing: day-1/day-2 discounts are manual price edits today (which DO log to Activity). No schedule, no per-item/category exclusion flags. ＋ P1.

## 24. BUYER RESPONSE / SELL-THROUGH / PRICE PERFORMANCE
- Offers: ✓ canonical item_id, immutable amounts, status history, checkout handoff idempotent.
- Advance interest alerts: ✕ (no capture, §16).
- Sell-through: SaleStatistics computes sold items vs total per sale (sale-level only, not category; `soldItems = items.filter(status='sold')` over canonical states — reliable). Category-level sell-through/price performance: ✕ derivable (aggregate on Item) but not built → P1/P2.
- Price performance (opening vs final): derivable from Activity price log + sold_price once original_price is repurposed; ✕ not built (P1 dependency).

## 25. POST-SALE LEARNING
- `generateSaleRecap` updates platform knowledge aggregates from sold prices (post-sale loop exists at repository level). No operator-facing "what we asked vs what happened" review. Unsold-item review is derivable (status != sold at closeout; Chapter 22 owns disposition). ＋ P2 (deterministic review view; do not build AI).

## 26. READY-TO-USE TOOLS — all 26 classified
1. Item research worksheet — INTERACTIVE SYSTEM ALREADY BETTER (Ch15 form/facts).
2. Comparable-sales worksheet — GENUINE SOFTWARE GAP (P1 comparable evidence).
3. Asking-vs-sold sheet — SMALL ENHANCEMENT on #2 (sold_status exists in data model).
4. Condition assessment — EXISTING (condition_notes).
5. Provenance notes — EXISTING (source-typed research notes/facts).
6. Identification checklist — SMALL ENHANCEMENT (P2 template in research UI; evidence fields exist).
7. AI research verification checklist — P2.
8. Research confidence worksheet — P2 (deterministic uncertainty display, no %).
9. High-value research checklist — EXISTING as level guidance + custody; printable ✎ optional.
10. Specialist consultation request — GENUINE SOFTWARE GAP (P1; wording change meanwhile).
11. Specialist opinion record — SMALL ENHANCEMENT (P1 structured block).
12. Appraisal review worksheet — GENUINE SOFTWARE GAP (P1 item-scoped document + context).
13. Estate-sale pricing worksheet — the pricing decision view IS this (P1).
14. Local-market adjustment worksheet — P1 (market-context guidance, not a fake formula).
15. Selling-channel decision sheet — P1 (channel flag + reason).
16. Pricing rationale record — P1 field.
17. Price-change authorization — P0/P1 permission gap (see §35).
18. Negotiation policy — P1 (Company-level config).
19. Employee negotiation limits — P1.
20. Offer form — EXISTING (OffersPanel).
21. Discount schedule — P1.
22. Discount-exclusion list — P1.
23. Advance-interest report — P2 (capture first, §16).
24. Unsold-item review — P2 view (data exists).
25. Post-sale pricing review — P2.
26. Category performance report — P2 (aggregate derivable).

## 27. DO-NOT-REBUILD (certified reuse list)
Item + inventory_level/item_number/photo privacy/research_notes/verified_facts/verification_status/custody_events/offsite_research · SaleDiscovery (provenance promotion) · SaleClientDecision + SaleAuthority (client approval) · SaleTask/SaleIssue (priority/dependencies) · Professional Network/WhoCanHelp (specialist directory + outbound referral record) · Offer.item_id + checkout handoff · Cart/Order/Transaction (payment truth) · ItemLabels/PrintSigns QR · Publication Sync on Item Change workflow + Marketing Kit · Project Dashboard · Activity (item change log) · LaborEntry (research/pricing labor) · researchGuard + override · SaleScope post_sale_plan (channel-adjacent disposition) · Chapter 10 referred_service (channel referrals).

## 28. NEW ENTITY TEST — COMPARABLE EVIDENCE
**Recommendation: STRUCTURED COMPARABLE ENTITY JUSTIFIED (build in P1, pending explicit authorization).**
Why not "no new entity": the three candidate homes each fail a required capability — SaleItemPricing is photo-scoped and un-curated; ItemKnowledge/ItemPriceHistory is platform-level and not Item-linked; research_notes are free text that cannot structurally preserve asking-vs-sold, price, date, venue, condition, outlier, or usefulness. The audit's own test ("structured distinction between ASKING vs SOLD, price, date, source, condition, market, similarities/differences, outlier/usefulness") is not meetable by generic notes. Smallest shape: ONE lightweight `ItemComparable` (item_id, source_type, asking/sold/other, source/venue, title, price, currency, sale_date, condition, maker/model, geography, shipping context, url, similarities/differences, usefulness STRONG/USEFUL/CONTEXTUAL, outlier + outlier_reason, notes, created_by/at) with the same RLS pattern as Item projections. No scores, no statistics.

## 29. PRICING DECISION RECORD TEST
**Recommendation: NO new versioned PricingDecision entity.** One stored pricing decision per Item at a time is the reality; add fields on Item (`price_range_low/high`, `pricing_rationale`, repurposed `original_price`, a `pricing_state` derived display — not stored) and keep history in Activity. A versioned snapshot entity is justified only if operators repeatedly re-price with evidence snapshots — no evidence of that need.

## 30. PRICE HISTORY ARCHITECTURE
Smallest reliable: **Activity log (already deployed) + optional reason field at change time.** Needs: reason, and a price-history read surface in the item/pricing view. Dedicated record rejected for P1 (Activity already carries old→new, who, when, item_id).

## 31. SPECIALIST OPINION ARCHITECTURE
Smallest: **structured `specialist_opinions` array on Item** (who, at, opinion, basis, attachments, relationship INDEPENDENT/POTENTIAL_BUYER/BOTH). Not Contact-level (opinion belongs to the merchandise decision), not a new entity. Relationship is operator-declared — never inferred (doctrine preserved).

## 32. APPRAISAL ARCHITECTURE
Smallest: **extend BusinessDocument scope with 'item' + item_id ref** (reuse private storage, signed-URL access, expiration/version), **plus a small appraisal-context block on Item** (appraisal value, date, appraiser, purpose, market type, assumptions, condition-differs note). NO new Appraisal entity; appraisal value NEVER copied to Item.price.

## 33. SMALLEST RECOMMENDED ARCHITECTURE (DO NOT IMPLEMENT)
1. `ItemComparable` (lightweight, RLS-projection pattern like Item). 2. Item additive fields: price_range_low/high, pricing_rationale, specialist_opinions[], appraisal_context{}, repurpose original_price. 3. BusinessDocument scope 'item'. 4. Derived "Ready to price" cue (no stored state). 5. Pricing Decision View (composition of existing + new fields, incl. Activity price history and Offer responses). 6. Company negotiation policy + HIGH_VALUE price-change guard + discount schedule/exclusions. 7. Asking-vs-sold + outlier/usefulness in the comparable surface; fix "Market Price Range" wording.

## 34. INTERFACE / DATA / WORKFLOW / PERMISSION GAPS
- INTERFACE: pricing decision view; price history read; comparable browse/outlier UI.
- DATA: ItemComparable; price range/rationale/specialist opinion/appraisal context; buyer-interest capture for estate inventory; original_price repurpose.
- WORKFLOW: specialist request assembly; channel decision + client approval linkage; discount schedule application; post-sale review.
- PERMISSION: price-change authority for HIGH_VALUE items; employee negotiation limits; discount approval levels.

## 35. P0 / P1 / P2 / P3 / LATER
**Genuine P0 (2):**
- **P0-1 (truth/wording):** Google Lens tool presents retail listing matches as "Market Price Range" — asking prices as market evidence, with no sold/asking distinction. Fix wording + mark evidence as listing prices before launch (small UI/text change, not part of this audit's build ban).
- **P0-2 (permission):** ANY sale-team member can change any item's price under Item.update RLS (sale_team_ids included), including HIGH_VALUE — no role/level gate, no reason required. Research-guard override is properly gated, but ordinary price edits are not. Recommend a HIGH_VALUE price-change guard before launch (or explicit acceptance of risk).
- Verified NON-P0s: AI/unverified research cannot reach public facts (firewall verified); Offer amounts and Transaction price/total are independent snapshots — item price changes cannot rewrite them (PASS); no photo-privacy regression found (Chapter 15 guards still in place); no cross-company research leakage path found in read code (RLS projections intact) — final confirmation remains the standing second-account manual check.

**P1 (minimum for Chapter 16 truth):** ItemComparable + asking/sold + outlier/usefulness; price range + opening-price preservation + rationale; price-change reason + HIGH_VALUE guard; negotiation policy + discount schedule/exclusions; specialist opinion record + request assembly (or honest rewording); appraisal item-scope + context; channel decision flag + client-approval linkage; Pricing Decision View; derived Ready-to-Price cue; value-risk research reason vocabulary.

**P2:** AI search builder, comparable organizer, missing-evidence prompt, research summary, channel coach, pricing coach, historical-match search, advance-interest alerts, unsold-item review, post-sale pricing review, category-performance report, buyer-interest signals for estate inventory.

**LATER:** automated external sold-comparable ingestion, statistical models, predictive sell-through, cross-company anonymized market data, research-ROI analytics.

**DO NOT BUILD:** 0-100 comparable/confidence scores (fake precision), second provenance system, PricingItem/PricingDecision entity, price-disposition engine (Ch22), duplicate specialist directory, duplicate custody/timeline/marketing systems, Appraisal entity.

## 36. BOOK TRUTH (every promise)
| Promise | Verdict |
|---|---|
| Item research record | YES (Ch15) |
| Condition assessment | YES (structured condition_notes; testing status free-text only) |
| Provenance notes | YES |
| Research photo prompts | YES AS EXISTING-SYSTEM OUTCOME (photo purposes/screen) |
| Research status states | YES (two-axis; READY TO PRICE = NOT YET — derive in P1) |
| Comparable sale record | NOT YET — BUILD (P1 entity justified) |
| Asking vs sold classification | YES IN DATA (ItemPriceHistory.sold_status) / NOT YET in operator UI — P0 wording + P1 |
| Comparable details | NOT YET — P1 fields |
| Comparable range | PARTIAL (min/avg/max exists; no body-of-evidence honesty) — P1 |
| Outlier flag | NOT YET — P1 |
| Comparable quality tiers | NOT YET — P1 (transparent factors only) |
| Internal comparables | YES AS EXISTING-SYSTEM OUTCOME (sold items queryable); matching = P2 |
| AI identification assistant | NOT YET (only category/searchQuery) — P2 |
| AI search builder | P2 |
| AI comparable organizer | P2 |
| AI mark & label assistant | NOT YET (analyzeItemImage is a screen, not an interpreter) — P2 |
| AI research summary | P2 |
| AI missing-evidence prompt | P2 |
| AI suggestion label | YES (AI_SUGGESTION firewall, verified) |
| Evidence checklist | NOT YET — P2 template |
| Verification status | YES (Ch15, honest terminology) |
| Claim control | YES (verified — publication derives from approved facts only) |
| Human approval | YES (facts/level/screen; price authorization gap = P0-2) |
| Value-risk flag | YES AS EXISTING-SYSTEM OUTCOME (research reason free text) — small P1 vocabulary |
| Research priority | YES (level + status + tasks) |
| Confidence review | NOT YET — P2 (deterministic, no %) |
| Specialist escalation | YES AS EXISTING-SYSTEM OUTCOME (flag + custody + network) |
| Research-time check | YES AS EXISTING-SYSTEM OUTCOME (LaborEntry research/pricing hours) |
| Specialist directory | YES (Ch11 categories cover book list) |
| One-click specialist request | WORDING SHOULD CHANGE — evidence assembly does not exist (P1 build) |
| Specialist opinion record | NOT YET (research note only) — P1 block |
| Independent vs buyer flag | NOT YET — P1 field (operator-declared) |
| Off-site custody tracking | YES (offsite_research + custody events) |
| Appraisal document storage | NOT YET at item scope (BusinessDocument has no item scope) — P1 |
| Appraisal context | NOT YET — P1 |
| Current condition vs appraisal | NOT YET — P1 |
| Estate-sale price record (separate from appraisal) | YES (no copy path exists; price is operational truth) |
| Client explanation content | BOOK/CONTENT (website copy, not core software) |
| Local buyer intelligence | NOT YET — P2 (data partially exists) |
| Buyer interest history | NOT YET for estate inventory (saves never written; watchlist marketplace-only) — P1 capture |
| Selling-window context | YES AS EXISTING-SYSTEM OUTCOME (sale dates/deadlines derivable) |
| Geographic context | NOT YET — P1 guidance/field |
| Marketing reach | YES minimal (featured/Marketing Kit); deeper = Ch18 |
| Selling channel review | NOT YET (inventory/marketplace only) — P1 |
| Alternative channel recommendation | NOT YET — P1 flag + reason |
| Client approval for channel change | YES (SaleClientDecision/authority — ready to reuse) |
| Channel outcome tracking | NOT YET — P2 (avoid Ch22 collision) |
| AI channel coach | P2 |
| Pricing recommendation | NOT YET as evidence-based recommendation (Google Lens = image inference only, no verified facts/condition/local inputs — do not call it a recommendation) — wording + P2 |
| Price range | NOT YET — P1 |
| Opening price preserved | NOT YET (original_price dead) — P1 |
| Pricing rationale | NOT YET — P1 |
| Price history | YES AS EXISTING-SYSTEM OUTCOME (Activity old→new/who/when; no reason) — small enhancement |
| Negotiation rules | NOT YET — P1 |
| Offer thresholds | NOT YET — P1 (no auto-accept exists — doctrine safe) |
| Approval levels | PARTIAL via RLS only; HIGH_VALUE gap = P0-2 |
| Discount schedule | NOT YET (manual edits) — P1 |
| Discount exclusions | NOT YET — P1 |
| Advance interest alert | NOT YET — P2 |
| Offer history | YES (canonical, immutable) |
| Buyer interest signals | PARTIAL (views only; saves dead) |
| Sell-through by category | PARTIAL (sale-level only) — P2 |
| Price performance | NOT YET — P2 |
| Unsold item review | NOT YET — P2 view |
| Local market intelligence | NOT YET — P2/LATER |
| AI pricing coach | P2 |
| Historical match | P2 |
| Category performance | P2 |
| Research efficiency | LATER |
| Post-sale pricing review | P2 |

## 37. COMPARABLE EVIDENCE MATRIX
| Evidence type | Asking/sold/other | Source | Date | Condition ctx | Market ctx | Usefulness | Outlier? | Current support |
|---|---|---|---|---|---|---|---|---|
| Google Lens visual match | Mostly ASKING (unclassified) | SerpAPI (retail web) | observed_at (created) | none | none (national web) | unranked | no flag | SaleItemPricing (photo-scoped) |
| AI batch/deep search price | asks for SOLD/COMPLETED but unverified | LLM search (prompt-instructed) | created | none | none | unranked | no flag | sale photo fields |
| Platform price observation | sold/listed/estimated/unknown ✓ | serpapi/ebay/pos_sale etc. | observed_at ✓ | free text ✓ | location ✓ | n/a | no flag | ItemPriceHistory (knowledge-scoped, not Item) |
| Operator's own sold item | SOLD ✓ (canonical) | internal POS/checkout | sold_date ✓ | structured ✓ | local sale ✓ | implicit | n/a | Item records (no matching surface) |
| Free-text research note | unclassified | any | note.at | free text | free text | n/a | n/a | Item.research_notes |

## 38. PRICING TRUTH MATRIX (canonical home)
ITEM IDENTITY → Item fields · VERIFIED FACTS → Item.verified_facts · RESEARCH NOTES → Item.research_notes · VERIFICATION → Item.verification_status · CONDITION → Item.condition/condition_notes · COMPARABLES → (gap — proposed ItemComparable) · APPRAISAL → (gap — BusinessDocument item-scope + Item.appraisal_context) · SPECIALIST OPINION → (gap — Item.specialist_opinions) · PRICE RANGE → (gap — Item fields) · OPENING PRICE → Item.original_price (repurposed) · CURRENT PRICE → Item.price · PRICE HISTORY → Activity (item_id) · NEGOTIATION RULES → (gap — Company config) · OFFERS → Offer (item_id) · FINAL TRANSACTION → Cart/Order/Transaction snapshots · CHANNEL → (gap — Item channel decision) · BUYER INTEREST → Item.views (partial; saves gap) · LOCAL HISTORICAL EVIDENCE → sold Item records + ItemKnowledge aggregates.

## 39. PRICE DECISION TRACE (HIGH_VALUE example)
Item → research notes (family statement, labeled) → verification_status → [MISSING: comparable evidence capture — today the operator keeps comps in their head or unstructured notes] → [MISSING: price range] → price set in form (Activity logs $old→$new; [MISSING: reason; MISSING: HIGH_VALUE authority gate — P0-2]) → buyer interest (partial) → Offer captured (canonical, immutable) → checkout snapshot → Transaction (immutable). Broken seams: comparable capture, range, rationale/reason, authority gate, evidence aggregation view.

## 40. APPRAISAL TRACE
Client supplies appraisal → [MISSING: item-scoped document upload — BusinessDocument has no item scope; operator would park it at sale scope or outside the system] → [MISSING: appraisal context fields] → [MISSING: condition-differs note] → Item.price set independently ✓ (NO auto-copy path exists anywhere — PASS on the core doctrine).

## 41. SPECIALIST TRACE
Item flagged SPECIALIST_REVIEW → [MISSING: evidence-package assembly from item photos/marks/dimensions — manual today] → custody transfer recorded ✓ (offsite_research + events) → opinion returns → [MISSING: structured opinion record; research note is the only home] → [MISSING: independence declaration] → verification_status update ✓ (logged) → pricing decision. Re-entry seams: request assembly and opinion record.

## 42. PRICE CHANGE TRACE
Price edited in UnifiedItemForm → Activity logs old→new ✓ → labels: print-time snapshot — physical labels go stale until reprinted (ItemLabels re-print reads live price ✓; QR/digital item shows live price ✓) → marketing: Publication Sync on Item Change workflow re-syncs published payloads ✓ → Offer.offer_amount: independent stored field — NEVER recomputed from item price ✓ PASS → Cart/Transaction price/total: checkout-time snapshots — never rewritten ✓ PASS.

## 43. PRODUCT DOCTRINES — verdicts
Pricing is a decision supported by evidence (guard enforces research-before-price ✓; evidence layer incomplete ✗) · Asking ≠ sold (data model yes; UI wording P0-1 ✗) · One comparable ≠ market (no single-comp logic exists; but no body-of-evidence view either) · AI ≠ fact (✓ verified firewall) · Family statement ≠ provenance (✓) · Appraisal ≠ estate price (✓ no copy path) · National ≠ local (✗ no market-context distinction — P1) · More risk → more verification (✓ via levels; price authority gap P0-2) · Research ∝ consequence (✓ guidance exists; ROI analytics LATER) · Preserve why a price was chosen (✗ rationale gap — P1) · Final transaction is new evidence (✓ repository loop exists via SaleRecap; operator loop P2).

## 44. PRICING LEARNING LOOP
IDENTIFY ✓ → RESEARCH ✓ → VERIFY ✓ → COMPARE ✗ (broken — no comparable store) → PRICE △ (no range/rationale) → MARKET ✓ (publication sync) → OBSERVE BUYER RESPONSE △ (offers ✓, passive interest ✗) → SELL/UNSOLD ✓ (canonical states) → REVIEW ✗ (no operator-facing review) → IMPROVE ✗ (no historical match). Broken transitions: COMPARE and REVIEW.

## 45. RECOMMENDED IMPLEMENTATION SEQUENCE (DO NOT IMPLEMENT — awaiting authorization)
1. P0 fixes: "Market Price Range" wording + listing-price labeling; HIGH_VALUE price-change guard + reason. 2. P1 data: ItemComparable; Item price range/rationale/original_price; specialist_opinions; appraisal item-scope + context. 3. P1 workflow/permission: negotiation policy + thresholds; discount schedule + exclusions; specialist request assembly; channel decision + client approval. 4. P1 interface: Pricing Decision View with derived Ready-to-Price and price history. 5. P2: buyer-interest capture, historical match, post-sale review, AI assistants.

## 46. PRE-LAUNCH DEPENDENCIES (carried forward)
Standing Chapter 15 manual checks: level escalation/downgrade UI gesture, fact-approval UI gesture, Offer/label/backup-list UI, mobile layout sweep, item-form photo upload, second-account cross-company RLS + photo-access security (also covers Chapter 16 research-leakage confirmation), physical QR scans, SMS certification, Houszu certification. **Chapter 16 adds:** P0-1 wording fix, P0-2 HIGH_VALUE price authority decision (fix or explicit acceptance), and the negotiation/discount absence must be documented as a known manual-process gap until P1.

## 47. CERTIFICATION

# **GO WITH CONDITIONS**

The Chapter 15 research/verification foundation and the immutable Offer/transaction architecture are strong enough to build Chapter 16 on without rework. Conditions: (1) fix the "Market Price Range" asking-price wording before launch; (2) resolve the HIGH_VALUE price-change authority gap (guard or explicit acceptance); (3) do not describe specialist requests as "one-click" until assembled; (4) no new provenance, pricing-decision, or appraisal entities — extend Item/ItemComparable/BusinessDocument as specified. No Chapter 16 feature was built in this audit; no Chapter 17 work was started.

— END OF REPORT —