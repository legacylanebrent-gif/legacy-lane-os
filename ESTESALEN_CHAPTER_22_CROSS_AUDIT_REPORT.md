# CHAPTER 22 — ESTATESALEN CROSS-AUDIT REPORT
POST-SALE DISPOSITION, PROVIDERS & TRANSITION COMPLETION
Audit date: 2026-10-22 · AUDIT ONLY — nothing built, no data modified, no communications sent.

---

## EXECUTIVE SUMMARY

**Coverage (of 141 audited parts, approximate):** ~44% supported by existing architecture (✓/↔), ~20% small enhancement (△), ~22% genuine build gap (＋), ~9% P2/Later, ~5% do-not-build/duplicate (✕). One honest caveat: "existing" coverage is strongest for the *records and warnings* of the chain; the *per-item operational routing* of remaining merchandise is largely absent.

**Strongest existing architecture.**
1. **Agreed-scope truth** — `SaleScope` (included/excluded work, special commitments, versioned append-only history) plus `post_sale_plan` with explicit authority fields and a closeout warning when an actionable outcome lacks authorization (`postSaleAuthorizationWarning`, SaleCloseout.jsx:182).
2. **Client authority** — `SaleAuthority` (scopes incl. `disposition`, verification states that surface "authority needs review") + `SaleClientDecision` (append-only history, REQUESTED vs controlling decision, operator-only create/update enforced at the data layer since Ch19 P0).
3. **Outstanding custody** — Chapter 21 paid-awaiting-pickup blocker, release/partial-release truth; Chapter 8 equipment pack-out terminal states (MISSING never silently returns) surfaced in closeout.
4. **Closeout blocker gate** — the Close Project button hard-disables on: sold items awaiting pickup, unresolved REVIEW merchandise decisions, incomplete client settlement.
5. **Dependencies & deadlines** — Chapter 13 SaleTask dependency model (tasks/decisions/issues) and structured external deadlines at consultation-deal level with conflict analysis (consultationModel.js:148-170).

**Largest genuine gaps.** No property-level completion deadline on EstateSale (deadlines live only on the pre-sale pipeline deal). No item-level disposition routing — a remaining item has no canonical "what happens to this" record, so the 25-items trace cannot account for all 25. Donation/Cleanout are standalone free-text events matched to sales by *fuzzy street address*, not by sale_id, with no item lists, no client authorization, no exclusions, no acceptance/schedule/receipt/verified-completion. No provider work order, relationship (client-hired vs company-hired vs referral), or payment-responsibility records. No completion objective/standard, no final walkthrough mode, no transition-complete state distinct from `EstateSale.status='completed'`.

**Property/client-authority risk summary.** One genuine P0 privacy defect: **Donation, DonationResponse, Cleanout, CleanoutBid, CleanoutVendorProfile, CleanoutLead, and Vendor entities carry NO RLS** — any authenticated app user can read property addresses, access notes, and (on published donations) seller name/phone/email, and can write records across companies. Second P0-class gap: **no item-level protection or exclusion architecture for donation/cleanout/disposal** — a cleanout scope is free text; nothing structurally prevents sold/paid/retained/sensitive merchandise from being included, and the system cannot warn because it does not know what a scope contains. Also: unsold merchandise with no disposition recorded downgrades closeout Step 2 only to a *warning* (not a blocker), so a project can close with merchandise unaccounted and no recorded reason — truthful only if a completion standard says that's in scope, and none exists.

---

## 1. COMPLETION OBJECTIVE / STANDARD
- Objective (maximize proceeds / meet deadline / clear property / minimize work / preserve merchandise): **✕ not recorded anywhere.** No field on EstateSale, SaleScope, or the deal captures the client's transition objective. ＋ P1.
- Completion standard ("finished" = sale only / sale+donation / sale+cleanout / empty property / specified rooms): **✕ not recorded.** SaleScope's included/excluded work is the nearest truth (✓ scope_items, e.g. a cleanout service included=true/false, `charge_policy: additional_when_authorized`) but there is no derived "what does done mean for the property" statement. ＋ P1. **Do not assume EMPTY HOUSE** — nothing today assumes it either, which is honest but also means the system cannot say what done means.

## 2. PROPERTY DEADLINES
- Structured external deadlines (closing, walkthrough, move, possession, cleaning) **exist only on the pre-sale pipeline deal**: `SaleConversionPipeline.consultation.external_deadlines`, with deterministic conflict analysis vs sale dates (consultationModel.js:148-170) and surfacing through the project model (projectModel.js:117). ✓ at deal level.
- **△ gap:** nothing is projected onto EstateSale; closeout never reads a property deadline; no backward planning. A post-sale project whose deal link is weak has UNKNOWN deadlines with no honest "unknown" display at closeout. △→＋ P1 (canonical sale-level deadline + closeout surface).

## 3. COMPLETION SCOPE
✓ **SaleScope is strong**: one ACTIVE scope per sale, included/excluded boundaries, special commitments, client expectations, versioned append-only history, agreement_reference. The distinction "what we agreed to do" vs "what the client later wants" is exactly supported by scope + `SaleClientDecision` (changes authorize through decisions, never silent scope rewrites). **↔ Covered by Chapter 9 — do not rebuild.**

## 4. REMAINING MERCHANDISE
- Deterministic "still needs disposition" query: **✕.** Item.status (`available/pending/sold/reserved`) + `pickup_completed_at` + releases support *sold/awaiting-pickup* extraction (✓, Ch21), but an unsold item has **no disposition state at all** — the system cannot distinguish "donated (resolved)" from "still sitting in the house" from "intentionally retained, resolved". Closeout counts `unsoldItems` and only checks whether *any* donation/cleanout record exists at the address (`dispositionScheduled = saleDonations.length>0 || saleCleanouts.length>0 || buyout`) — a single draft donation makes Step 2 read `done`. ＋ P0/P1.
- Donation/Cleanout records link to sales by **fuzzy street-address matching** (SaleCloseout.jsx:82-88), not sale_id — a broken seam: same-street sales can cross-match; renamed addresses break matching. ＋ P1.

## 5. DISPOSITION
- Categories map to scattered existing truth: RESELL/SELL ELSEWHERE → `Item.selling_channel` (AUCTION/CONSIGNMENT/SPECIALTY_MARKETPLACE/DIRECT_SALE) + `channel_considered` ✓; SPECIALIST → `Item.offsite_research` + `custody_events` ✓ custody, △ status; DONATE/CLEANOUT → standalone Donation/Cleanout events ＋; CLIENT RETAINS → `SaleClientDecision` merchandise KEEP ✓ decision, ✕ physical resolution; BUYOUT → buyout events + Offer records △; DISPOSE → ✕; DECISION NEEDED → open decisions + `post_sale_plan.DECISION_REQUIRED` ✓ visibility.
- **No per-item routing record.** See entity test (§29): recommendation is an additive Item-level disposition block, NOT a new entity.

## 6. CLIENT AUTHORITY
✓ SaleAuthority (scopes incl. `disposition`, `financial_settlement`; VERIFIED/UNRESOLVED/DISPUTED with "authority needs review" warnings; deactivation keeps history). ✓ SaleClientDecision history (who authorized, when, how received, reason). ✓ operator-only decision writes (Ch19 P0 data-layer enforcement). **△ gap:** the disposition *actions* (publish donation, award cleanout, accept buyout) do not today require or reference any decision/authority record — authority truth exists but is not wired to the actions. ＋ P1 (require linked decision; see §18).

## 7. CLIENT CHANGES
✓ Request vs controlling decision (`request_status`, `requested_decision`, `answer_by` overdue display), append-only history, source (how received). ✓ conflicting verbal instruction → SaleIssue (employee help path) without overwriting the authoritative plan. **✕ Change impact:** no deterministic "this change affects these tasks/providers/pickups/deadlines/cost" surface — linked tasks exist only where a human created them. ＋ P1 (deterministic relationship listing, not AI).

## 8. FAMILY PICKUP
- `Item.authorized_pickup` + `releases.released_to` record *who physically collected* sold merchandise (✓ Ch21) — and correctly confer no broader authority.
- **✕ Family-retained (not sold) merchandise** has no pickup/collector/deadline/resolved record: a KEEP decision is the only trace; whether the niece ever took the dresser is unknown and stays unknown. ＋ P1. (Distinguish from buyer pickup; do not grant collector authority — architecture already supports this distinction.)

## 9. DONATION
Actual flow (DonationEditor/DonationDetail + notifyDonationCompanies): operator drafts donation (title, scope free text, pickup_deadline, access_notes, seller contact optional) → publish → DonationResponse records auto-created for in-state `vendor_type='donation_company'` Vendors → vendors respond (interested items, can_facilitate_pickup, available dates) → operator accepts a response (all others declined) → `awarded` → `completed`/`cancelled`.
- Directory: ✓ Vendor (donation_company) + CleanoutVendorProfile (overlapping — fragmentation note).
- Organization + service area + pickup capability + restrictions: △ (service radius/states on profiles; restrictions only in free-text notes).
- **Gaps:** no sale_id link; no client authorization; no item list/load grouping; no org acceptance of a specific load (response status is vendor *interest*, not acceptance); no scheduled pickup event (only a deadline); no receipt/acknowledgment record; completion not per-item. ＋ P1 across the board. **P0 privacy:** Donation shares seller name/phone/email with all matched vendors when `operator_handling_donations=false`, and the whole entity family has NO RLS (§40).

## 10. CLEANOUT
Actual flow (CleanoutEditor/CleanoutDetail + CleanoutBid): operator publishes (scope free text, cleanout_deadline, access_notes, photos) → CleanoutVendorProfile members notified (matchCleanoutLead emails with property address) → bids (amount, estimated_days, message) → operator awards → `completed`/`cancelled`.
- Quote comparison: ✓ interactive (bids side-by-side with amount + days + message).
- **Gaps:** no structured rooms/contents/exclusions; no stairs/heavy-items/disposal-requirements fields; completion is an operator-set status with **no verification record** ("provider says done" is all the system holds); no provider confirmation of schedule; no relationship/payment-responsibility; access_notes shared with all bidding vendors (same least-privilege concern). ＋ P1; exclusions ＋ P0-class (see §26).

## 11. BUYOUT
- `EstateSale.buyout_config` (mode full/cherry-pick, minimum bid, deadlines, payment terms, reseller registration, pickup deadline) ✓ as event config; offers arrive as `Offer` records (Buyouts.jsx: operators see offers on their sales, consumers their own) ✓ offer+timing preserved; BuyoutModal supports photo-labeling of bulk lots △.
- **Gaps:** included merchandise is NOT identified at item level (a buyout event, not a merchandise schedule); exclusions ✕; client approval of a specific accepted buyout ✕ (no decision record required); tradeoff summary ✕ (P2 — inputs don't exist). ＋ P1 for schedule/exclusions/approval.

## 12. SPECIALISTS / ALTERNATIVE CHANNELS
✓ Strong reuse: ProfessionalNetwork (Contact-based, operator-private) for referral; `Item.selling_channel` + `channel_considered` + `channel_decision_id` (client-approval link) for channel choice; `Item.offsite_research` (with whom, reason, expected return, ONSITE/OFFSITE/RETURNED) + append-only `custody_events` (TRANSFERRED_SPECIALIST / RETURNED_FROM_SPECIALIST) for custody; specialist_opinions with operator-declared relationships (Ch16). **△ gap:** no outcome status for the alternate path (awaiting/accepted/declined/consigned/sold/returned) beyond offsite RETURNED, and no link to a property deadline. △ P1.

## 13. PROVIDER WORK
✕ No general provider work order exists. Donation/Cleanout carry scope+access+deadline for their narrow cases; SaleTask carries work; BusinessDocument can hold an agreement. What does not exist: assembled work order (address, contact, access, schedule, scope, exclusions), provider confirmation states (tentative/scheduled/confirmed), provider-side completion + operator verification, relationship and payment responsibility. ＋ P1 (see entity test §30: extend, don't new-entity, first).

## 14. PROVIDER RELATIONSHIP / PAYMENT RESPONSIBILITY
✕ Neither Donation nor Cleanout records CLIENT HIRED vs COMPANY HIRED vs REFERRAL, nor who pays the provider / who is invoiced. (Buyout payment terms and bid amounts are event facts, not responsibility truth.) ＋ P1. The system today must not imply any of these — and it doesn't, which is honest but incomplete.

## 15. PROVIDER PERFORMANCE
✕ No private per-assignment operational history (communication, timeliness, property care, scope adherence). Public marketplace `Vendor.rating/total_reviews/jobs_completed` exist for the consumer vendor directory — a different surface; **do not conflate**, and do not build public ratings for closeout providers. Internal notes exist (CleanoutVendorProfile.notes, Contact notes) △. Performance intelligence: P2.

## 16. CLOSEOUT CALENDAR / DEPENDENCIES
✓ Chapter 13 dependency model (blocked_by_task/decision/issue ids with deterministic cycle guard) — BUYER PICKUP before CLEANOUT before CLEANING before WALKTHROUGH is representable today. △ But: no assembled closeout calendar (pickups + donation + cleanout + cleaning + walkthrough + property deadline in one timeline), no working backward from a property deadline (none exists on the sale), and overdue/blocked tasks surface only as closeout warnings rather than deadline-risk against dependent milestones. △→＋ P1 (mostly assembly over existing truth).

## 17. FINAL WALKTHROUGH
✕ No guided room-by-room final walkthrough. Nearest existing: Chapter 20 Closing/EOD checklists (SaleTask-based, explicit "human confirmations — EstateSalen does not claim to verify locks electronically" honesty), prep_zones (rooms with per-zone truth), closeout Step 6 counts. ＋ P1 — build as a zone-driven verification flow reusing prep_zones + SaleIssue for exceptions; **do not pretend software checked rooms.**

## 18. REMAINING-ITEM EXCEPTIONS
✓ SaleIssue can represent "why does this remain" (category vocabulary incl. disposition/pickup). ✕ Nothing *flags* an unexplained remaining item — no requirement that anything still present has a reason, and closeout does not demand one. ＋ P1 (deterministic flag + exception linkage; no new entity).

## 19. COMPANY EQUIPMENT
✓ Chapter 8 is complete for this audit: EquipmentAsset (MISSING never silently returns AVAILABLE), SaleEquipmentAssignment pack-out terminal states (RETURNED/DAMAGED/MISSING/LEFT_INTENTIONALLY), closeout surfaces "Company equipment with no pack-out ending: N" and unresolved-equipment warnings. △ Two honest limits: the sweep is a warning line, not a closeout blocker (close is not blocked while equipment is outstanding); "location history" is assignment history only — the book must never claim tracking. ✎ wording.

## 20. PROPERTY CONDITION / SECURITY
- Pre-sale condition: ✓ prep_zones.protection_note + condition_photo_uri (private, signed URL).
- Final condition: ✕ no final walls/floors/stairs/doors observations record. ＋ P1 (walkthrough section).
- Security at close: ✓ Chapter 20 closing checklist (doors, windows, rooms — human confirmations, explicitly not electronic claims). ↔ Covered by existing system; reuse in final walkthrough.
- Property issues: ✓ SaleIssue (reuse — no PropertyIssue entity).

## 21. SCOPE COMPLETION
✕ No comparison of AGREED SCOPE vs ACTUAL COMPLETION. All inputs exist (SaleScope, closeout steps, settlement, equipment, decisions) but nothing assembles "included services: delivered / not delivered / partially delivered". ＋ P1 (derived view, no new truth store).

## 22. ADDITIONAL WORK / SCOPE CREEP
✓ Authorization side is strong: `charge_policy: additional_when_authorized` on scope items; financial SaleClientDecision (authorized charges flow to settlement; reimbursable-expense authorization Ch6 P2). △ Gap: unpriced/unauthorized extra *labor requests* are not flagged against scope — a verbal "also empty the garage" becomes invisible free labor unless a human creates a decision. ＋ P1: deterministic OUTSIDE ORIGINAL SCOPE flag when new work/tasks reference services with included=false or no scope item, plus explicit additional-work decisions. No AI needed.

## 23. CLIENT COMPLETION SUMMARY
✕ No assembled per-outcome summary (sold / retained / donated / buyout / removed / referred / exceptions). All raw truth exists; the assembled view does not. ＋ P1 (projection over canonical records — no duplicate record).

## 24. UNSOLD INTELLIGENCE
- Remaining-value evidence: ✓ rich per item (price, original_price, research_status, comparables, offers, buyer interest via Watchlist/BuyerIntent, discount history via ItemPriceHistory, category, condition, labor categories). △ No assembled "resale opportunity vs removal problem" review — ＋ P1 view.
- Sell-through: counts ✓ (SaleRecap total_items/total_sold; derive from Item directly); quantity/asking-value/actual-revenue variants are derivable from Item + Transaction — supported at data level, no report view △.
- Discount performance: △ derivable from original_price/price/sold_price + ItemPriceHistory; no view.
- Labor-to-revenue: △ LaborEntry IS categorized (Ch14+ categories) — category-level comparison is supportable; per-item labor is not tracked and must not be claimed.
- Marketing exposure: △ strict — Ch18 attribution is explicit attendee-response only; an unsold-vs-promoted comparison can use featured/kit truth but must stay honest about what exposure means. No automated recommendation: ✕ and don't claim one.
- Category report: ✓ derivable (Item.category is reliable at these volumes) △ view only.

## 25. PROJECT SCORECARD
✕ No factual closeout scorecard. Inputs exist for: sale proceeds (✓ settlement), company profitability (✓ Ch4 contribution — honest "sale contribution, not net profit" wording), disposition cost (✓ Expense categories dumpster_disposal/cleaning_services/professional_services flow to economics), open exceptions (✓ derivable). Missing inputs: client objective, completion standard, property deadline — so objective-achieved / deadline-met cells are UNKNOWN until Parts 1/2 land. ＋ P1 after those. No vanity composite number.

## 26. AI
Actual capability today: none specific to Chapter 22 (no disposition coach, authority reminder, provider match, closeout brief, leftover review). The Chapter 16/19/20 AI coach panels exist for other domains. All five Chapter 22 AI items: **P2 — do not build now**, and none may decide client-property outcomes.

## 27. READY-TO-USE TOOLS (all 39)
| # | Tool | Classification |
|---|------|----------------|
| 1 | Post-sale disposition plan | INTERACTIVE SYSTEM ALREADY BETTER (SaleScope.post_sale_plan + closeout warning) |
| 2 | Client completion-objective worksheet | GENUINE SOFTWARE GAP (P1 field) — printable is interim only |
| 3 | Property deadline worksheet | SMALL ENHANCEMENT (deal external_deadlines exist; sale-level canonical field P1) |
| 4 | Unsold merchandise review | SMALL ENHANCEMENT (data exists; assembled review P1) |
| 5 | Disposition decision guide | BOOK / PRINTABLE (decision records are the system) |
| 6 | Donation authorization | GENUINE SOFTWARE GAP (P1) |
| 7 | Donation inventory (item load) | GENUINE SOFTWARE GAP (P1) |
| 8 | Donation pickup sheet | SMALL ENHANCEMENT (deadline exists; scheduled pickup P1) |
| 9 | Donation receipt record | GENUINE SOFTWARE GAP (P1) |
| 10 | Cleanout authorization | GENUINE SOFTWARE GAP (P1) |
| 11 | Cleanout scope sheet | SMALL ENHANCEMENT (free-text scope exists; structure P1) |
| 12 | Cleanout exclusion list | GENUINE SOFTWARE GAP (P0-class protection) |
| 13 | Cleanout quote comparison | INTERACTIVE SYSTEM ALREADY BETTER (bids view) |
| 14 | Buyout offer form | INTERACTIVE SYSTEM ALREADY BETTER (buyout events + offers) |
| 15 | Buyout merchandise schedule | GENUINE SOFTWARE GAP (P1) |
| 16 | Buyout authorization | GENUINE SOFTWARE GAP (P1) |
| 17 | Specialist referral form | INTERACTIVE SYSTEM ALREADY BETTER (ProfessionalNetwork) |
| 18 | Alternative-channel worksheet | INTERACTIVE SYSTEM ALREADY BETTER (Item channel window) |
| 19 | Client change authorization | INTERACTIVE SYSTEM ALREADY BETTER (SaleClientDecision) |
| 20 | Family pickup form | GENUINE SOFTWARE GAP (P1) |
| 21 | Provider work order | GENUINE SOFTWARE GAP (P1) |
| 22 | Provider scope confirmation | GENUINE SOFTWARE GAP (P1) |
| 23 | Provider relationship form | GENUINE SOFTWARE GAP (P1) |
| 24 | Provider performance review | P2 |
| 25 | Referral disclosure record | EXISTING TEMPLATE (B2B referral agreements); per-job disclosure SMALL ENHANCEMENT |
| 26 | Closeout calendar | SMALL ENHANCEMENT (P1 assembly over tasks/deadlines) |
| 27 | Provider confirmation sheet | SMALL ENHANCEMENT |
| 28 | Final walkthrough checklist | GENUINE SOFTWARE GAP (P1 mode, reuse zones) |
| 29 | Remaining-item exception sheet | SMALL ENHANCEMENT (reuse SaleIssue + P1 flag) |
| 30 | Sold-item pickup report | INTERACTIVE SYSTEM ALREADY BETTER (Ch21) |
| 31 | Client-retained merchandise record | SMALL ENHANCEMENT (P1) |
| 32 | Company equipment checklist | INTERACTIVE SYSTEM ALREADY BETTER (Ch8 pack-out) |
| 33 | Property-condition checklist | GENUINE SOFTWARE GAP (P1 walkthrough section) |
| 34 | Completion photo guide | BOOK / PRINTABLE |
| 35 | Property secure checklist | INTERACTIVE SYSTEM ALREADY BETTER (Ch20 closing checklist) |
| 36 | Additional-work authorization | INTERACTIVE SYSTEM ALREADY BETTER (financial decision + charge_policy); scope-creep flag is the P1 |
| 37 | Client completion summary | GENUINE SOFTWARE GAP (P1 assembled view) |
| 38 | Unsold merchandise report | SMALL ENHANCEMENT (derivable; report view P1) |
| 39 | Post-sale performance review | SMALL ENHANCEMENT (SaleRecap + Ch4 econ exist; scorecard P1) |

## 28. DO-NOT-REBUILD (already satisfied by)
- Ch9: SaleScope incl. post_sale_plan, boundaries, versioning; agreement/contract evidence. → objective/standard/plan *inputs* (not the derived views).
- Ch13: SaleTask dependencies, SaleIssue, SaleClientDecision request/history. → change requests, exceptions, fallbacks, dependency engine, deadline overdue display.
- Ch14: SaleDiscovery + custody chain. → sensitive/valuable finds routing.
- Ch15/16: Item custody_events, offsite_research, specialist_opinions, comparables, channel window. → specialist custody, alternative channels, remaining-value evidence.
- Ch17: pickup requirements, removal notes. → removal planning.
- Ch19: SaleAuthority + authority-scoped decisions + data-layer operator-only decision writes. → decision-maker, change authority.
- Ch20: closing/EOD human-confirmation checklists, client-day plan. → secure-property.
- Ch21: outstanding pickups/release/partial truth, settlement linkage, refunds. → sold-item check, proceeds.
- Donation/Cleanout/buyout event architecture, EquipmentAsset/SaleEquipmentAssignment, BusinessDocument, Expense/LaborEntry, Settlement/SaleRecap, ProfessionalNetwork/Contact referral architecture.

## 29. DISPOSITION ENTITY TEST
**Recommendation: NO new SaleDisposition/ItemDisposition entity.** A new top-level entity would create a second merchandise truth competing with Item + decisions. The clean smallest representation is an **additive, append-friendly block on Item** (`post_sale_disposition`: outcome, decision_id link, authorized_by, resolved_at, exclusion/hold flags) written only through the existing decision/authorization paths, with a deterministic remaining-merchandise query derived from Item + decision + Donation/Cleanout records. Do not force disposition into Item.status. **DO NOT IMPLEMENT.**

## 30. PROVIDER WORK ORDER ENTITY TEST
**Recommendation: no new entity in P1.** Extend the existing Donation/Cleanout records (sale_id link, structured scope/exclusions, relationship, confirmation states, provider completion + operator verification) and reuse SaleTask for work tracking; a lightweight ProviderWorkOrder entity is justified only if multi-provider coordination (cleaning, hauling, transport beyond donation/cleanout) becomes common — the audit found no current record that would host that, so flag it as the one *possible* future entity, gated on real operator demand. **DO NOT IMPLEMENT.**

## 31. COMPLETION ENTITY TEST
**Recommendation: NO Completion entity.** Completion must be DERIVED from scope + obligations + human approval. Represent as an additive `transition` block on EstateSale (objective, completion_standard, property_deadline, transition_completed_at, approved_by) with closeout computing readiness from canonical records. No duplicate project truth store. **DO NOT IMPLEMENT.**

## 32. CHANGE REQUEST ENTITY TEST
**Recommendation: NO ChangeRequest entity.** SaleClientDecision request_status + history + SaleIssue + SaleTask dependencies represent change requests, history, and impact-linkage. Audit found no history/impact fact these cannot hold. **DO NOT IMPLEMENT.**

## 33. TRANSITION COMPLETION MODE
**Recommended (not built):** a "Transition Completion" projection on the existing closeout page (or a sibling tab) assembling: OBJECTIVE · DEADLINE · SCOPE · REMAINING MERCHANDISE (per-item disposition state) · CLIENT DECISIONS · BUYER/FAMILY PICKUPS · DONATION · CLEANOUT · BUYOUT · SPECIALISTS · EQUIPMENT · PROPERTY · OPEN ISSUES · FINAL WALKTHROUGH · COMPLETION. Pure derivation over canonical records — owns nothing. **DO NOT IMPLEMENT.**

## 34. COMPLETION STATE
Represent three distinct states, never conflated: sale event finished (`EstateSale.status='completed'` — exists), financial settlement finished (`deal.settlement_finalized` — exists), property transition finished (✕ new additive `transition.completed_at` on EstateSale, gated by derived blockers + human approval). "SALE COMPLETE — TRANSITION OPEN" is therefore representable as: sale completed + no transition completion timestamp.

## 35. CLOSEOUT DEPENDENCY ENGINE
✓ Chapter 13's deterministic dependency model derives blocked/unblocked without a new engine; blocked-by-decision/issue links already gate on the right resolutions. What's missing is only deadline-aware derivation (blocked/at-risk against a property deadline) — assembly, not an engine. **No new engine.**

## 36. CLIENT CHANGE IMPACT
Smallest deterministic approach: when a SaleClientDecision is approved/changed, list records referencing the affected item/scope (tasks with source/dependency links, open Donation/Cleanout records at the sale, outstanding pickups, open SaleIssues) as a static "affected by this change" panel. No AI, no inference — reference listing only. **DO NOT IMPLEMENT.**

## 37. PROVIDER PERFORMANCE INTELLIGENCE
Accumulate later from completed assignments as private operator-scoped notes/outcomes on the provider profile (no public ratings — the public Vendor rating is a separate consumer surface and must not be reused). **P2. DO NOT IMPLEMENT.**

## 38. COMPLETION SCORECARD
Smallest factual scorecard: per-row facts with sources and honest UNKNOWN cells — objective achieved (needs P1 objective field), scope completed (derived), deadline met (needs P1 deadline), sale proceeds (settlement ✓), company contribution (Ch4 ✓, "not net profit" wording), disposition cost (Expense ✓), open exceptions (derived ✓). No composite number. **DO NOT IMPLEMENT.**

## 39. SMALLEST RECOMMENDED ARCHITECTURE (P1 sketch — NOT BUILT)
1. EstateSale additive `transition` block: objective, completion_standard, property_deadline, transition_completed_at/approved_by (fields only; views derive).
2. Item additive `post_sale_disposition` block (outcome, decision_id, authorized_by, resolved_at) + deterministic remaining-merchandise derivation + reason-required flag on closeout (promote Step 2 warning→blocker when standard requires disposition).
3. Donation/Cleanout: sale_id link (replace address matching), client-authorization decision link required before publish/award, item/exception lists, acceptance/schedule/receipt (donation) and exclusions/verified completion (cleanout) fields.
4. Provider relationship/payment-responsibility + confirmation states on those records.
5. Closeout assembly: open-obligation check extended (provider work incomplete, equipment outstanding → blockers per standard; non-REVIEW open decisions), scope-completion comparison, client completion summary, family-pickup records, final walkthrough (zones + SaleIssue), property condition + completion photos (private storage).
6. RLS on the entire donation/cleanout/vendor chain (P0, independent of the rest).

## 40. INTERFACE / DATA / WORKFLOW / PERMISSION GAPS
- **Permissions (P0):** Donation, DonationResponse, Cleanout, CleanoutBid, CleanoutVendorProfile, CleanoutLead, Vendor — no RLS at all (verified: zero `rls` blocks). Property addresses, access notes, seller PII readable and writable by ANY authenticated user; cross-company leakage by design of default access. CleanoutLead additionally holds agent emails/phones + `permission_to_share` — unenforced by any permission layer.
- **Data:** no sale_id on Donation/Cleanout (fuzzy address match); no item-level disposition; no completion standard/objective/deadline; DonationResponse acceptance ≠ org acceptance; Cleanout completion unverified.
- **Workflow:** closeout blockers incomplete (provider work, equipment, non-REVIEW decisions, unexplained unsold merchandise are warnings); Step 2 satisfied by a single draft donation; no walkthrough; no change-impact surface.
- **Interface:** no transition-completion view; donation/cleanout editors are operator-generic (no sale context); closeout shows statuses not per-item truth.
- **Honest positives:** EstateSale site_assessment.access_details is operator/admin-only by field RLS; BusinessDocument/Item private photos use signed URLs; Item HIGH_VALUE price changes data-layer guarded; decisions operator-only.

## 41. P0 / P1 / P2 / P3 / LATER
- **P0 (2):** (1) RLS on Donation/DonationResponse/Cleanout/CleanoutBid/CleanoutVendorProfile/CleanoutLead/Vendor — PII + cross-company access. (2) Protected-merchandise risk: no item-level exclusion/authorization architecture for donation/cleanout/disposal, and closeout can complete with unaccounted merchandise and no recorded reason — until a completion standard exists, the system cannot truthfully answer "can this project close?" (the two together: scope-standard gap + no gates).
- **P1 (smallest true set):** completion objective/standard; property deadline on EstateSale; item-level disposition block + remaining-merchandise query + reason-required; donation/cleanout sale links + authorization + item lists/exclusions + acceptance/receipt/verified completion; buyout schedule/exclusions/approval; specialist outcome status; provider relationship/payment responsibility + confirmation states; family pickup; change-impact listing; scope-creep flag; final walkthrough (zones); property condition/notes; scope-completion + client completion summary + scorecard; closeout obligation matrix completed; transition completion state + blockers.
- **P2:** AI Disposition Coach, AI Authority Reminder, AI Provider Match, AI Closeout Brief, AI Leftover Review, buyout tradeoff summary, provider performance intelligence, change/team/provider notifications beyond dashboard truth.
- **Later:** provider portal/marketplace, real-time availability, automated dispatch, donation eligibility APIs, auction marketplace integrations, automated tax documentation, logistics routing, predictive closeout.

## 42. BOOK TRUTH (every promise classified)
Legend: ✓ exists · △ enhance · ＋ build · ✆ committed pre-launch (none) · ↔ covered by existing · ✎ wording · ✕ do not build/duplicate.
- Completion Objective ＋ · Property Deadline △(deal-level ✓, sale-level ＋) · Completion Scope ✓ · Disposition Plan ✓(plan)＋(item-level) · Completion Standard ＋ · Disposition Categories △ · Remaining Value Review △ · Alternative Channel Flag ✓ · Time-vs-Value ✎(cannot be claimed; inputs absent → P2) · AI Disposition Coach ✕P2 · Post-Sale Plan ✓ · Provider Holds ＋ · Decision Deadlines ✓(answer_by) · Fallback Plan ↔(Issue/task/notes) · Closeout Timeline △ · Authorized Decision-Maker ✓ · Disposition Authorization ＋(wire decisions to actions) · Item-Level Exceptions ＋P0 · Decision History ✓ · Authority Warning △ · Scope Clarification ＋ · Donation Authority ＋ · Cleanout Authority ＋ · Buyout Authority ＋ · Disposal Restrictions ＋P0 · Change Request ✓ · Impact Check ＋ · Team Update ✎(dashboard truth only; notifications P2) · Provider Update ✎(none today) · New Deadline △ · Authority Lookup ✓ · Conflicting Instruction Alert ✓(request-vs-controlling + SaleIssue) · Decision Hold △(REVIEW blocks; broader hold △) · Family Pickup Record ＋ · AI Authority Reminder ✕P2 · Donation Directory ✓(fragmented) · Donation Load ＋ · Acceptance Check ＋ · Pickup Schedule △ · Donation Documentation ＋ · Cleanout Scope △ · Cleanout Quote ✓ · Provider Assignment △ · Exclusion List ＋P0 · Completion Check ＋ · Buyout Offer Record ✓ · Included Merchandise ＋ · Excluded Items ＋ · Client Approval(buyout) ＋ · Tradeoff Summary ✕P2 · Specialist Referral ✓ · Alternative Sales Channel ✓ · Specialist Status △ · Deadline Check △ · Chain of Custody ✓ · Provider Work Order ＋ · Property Access Instructions △(+P0 privacy) · Scope Confirmation ＋ · Change Notification ✎ · Provider Completion Record ＋ · Provider Relationship ＋ · Payment Responsibility ＋ · Change Authority ✓ · Provider Agreement ✓(BusinessDocument) · Referral Disclosure △(B2B ✓) · Provider Directory ✓(fragmented) · Service Territory ✓ · Provider Performance History ✕P2 · Reliability Notes △(exist; unprotected by RLS → P0) · AI Provider Match ✕P2 · Closeout Calendar △ · Task Dependencies ✓ · Deadline Risk Alert △ · Provider Confirmation △ · AI Closeout Brief ✕P2 · Final Walkthrough Mode ＋ · Room Completion ＋ · Remaining Item Exception △(Issue exists; flag ＋) · Sold Item Check ✓ · Client-Retained Check △ · Exception Record ✓(SaleIssue) · Awaiting Pickup ✓ · Client Retained △ · Donation Pending ＋ · Provider Pending ＋ · Decision Needed ✓ · Company Equipment Inventory ✓ · Equipment Check-In/Out ✓ · Final Equipment Sweep ✓(warning-level) · Missing Equipment Alert △ · Equipment Location History ✎(assignment history, never "tracking") · Property Condition Check ＋ · Completion Photos △ · Property Issue Record ✓ · Secure Property Check ✓ · Final Condition Notes ＋ · Scope Completion Review ＋ · Open Obligation Check △ · Completion Approval △ · Additional Work Flag △ · Client Completion Summary ＋ · Unsold Category Report △ · Sell-Through △(counts ✓, all bases derivable; be explicit) · Discount Performance △ · Labor-to-Revenue △(categorized labor ✓; no per-item labor — never claim it) · Marketing Exposure Review △(explicit-only attribution) · AI Leftover Review ✕P2 · Client Outcome ＋ · Sale Proceeds ✓ · Company Profitability ✓("contribution, not net profit") · Deadline Performance ＋(after deadline) · Disposition Cost ✓(Expense flows; event-linkage △) · Project Scorecard ＋.

## 43. DISPOSITION MATRIX
| Outcome | Authority required | Canonical record today | Responsible party | Next action | Completion evidence | Property effect | Financial effect |
|---|---|---|---|---|---|---|---|
| RESELL/SELL ELSEWHERE | Client (channel change via `channel_decision_id`) | Item.selling_channel + channel_considered | Operator | Choose channel / create decision | ✕ none per-channel | Item remains until sold+released | Order/Transaction when sold |
| SPECIALIST | Operator (research routing); client for value-affecting transfer | Item.offsite_research + custody_events + ProfessionalNetwork referral | Operator/specialist | Transfer or refer | ✕ outcome status (ONSITE/OFFSITE/RETURNED only) | Physically leaves/returns (custody ✓) | Fees via Expense if any |
| BUYOUT | Client (✕ not recorded today) | EstateSale.buyout_config + Offer records | Operator | Receive/approve offers | ✕ item-level | Cherry-pick/full — ✕ untracked | Offer amount; buyer pays operator |
| DONATE | Client (✕ not recorded) | Donation + DonationResponse (no sale link, no items) | Operator → awarded donation company | Publish, award, coordinate | Awarded status only; ✕ receipt/pickup | Removed by vendor — ✕ untracked | ✕ no record (donation ≠ revenue) |
| CLEANOUT | Client (✕ not recorded) | Cleanout + CleanoutBid | Operator → awarded vendor | Publish, award, verify | `completed` status, unverified | Emptied per free-text scope — ✕ untracked | Bid amount; payer ✕ unrecorded |
| CLIENT RETAINS | Client (KEEP decision ✓) | SaleClientDecision merchandise + item exclusion marks ✕ | Family/client | Family pickup (✕ untracked) | ✕ physical resolution | Item intended to remain — must carry reason | None |
| DISPOSE | Client | ✕ (no path; only implied by cleanout) | — | — | ✕ | Removed | Disposal cost via Expense ✓ |
| DECISION NEEDED | — | Open SaleClientDecision + post_sale_plan.DECISION_REQUIRED ✓ | Client (authority) | Record decision (answer_by overdue ✓) | Decision record ✓ | Awaits instruction | None yet |

## 44. PROVIDER RELATIONSHIP MATRIX
| Relationship | Who contracts | Who pays | Who controls scope | Who approves changes | EstateSalen stores | EstateSalen must NOT imply |
|---|---|---|---|---|---|---|
| CLIENT HIRED | Client↔provider | Client | Client/provider | Client | ✕ nothing today (P1 field on records) | That the company vouches for or supervises the provider |
| COMPANY HIRED | Company↔provider | Company (Expense-eligible ✓ categories exist) | Company | Operator (+ client when charge_policy additional_when_authorized ✓) | ✕ relationship; bid/award facts only | That costs are client-authorized without a decision |
| REFERRAL/INTRODUCTION | Client↔provider | Client | Client/provider | Client | ✓ B2B referral agreements (operator-agent); ✕ per-job provider referral record | Compensation determines fit; any endorsement beyond introduction |

## 45. CLOSEOUT OBLIGATION MATRIX
| Obligation | OPEN condition | Owner | Deadline | Blocks transition complete today? | Completion evidence |
|---|---|---|---|---|---|
| Buyer pickup | sold + pickup option + !pickup_completed_at (partial releases counted) | Operator/team | Item.pickup_due_date | **YES — blocker** ✓ | Item.releases + pickup_completed_at ✓ |
| Family pickup | retained merchandise not removed | ✕ unowned | ✕ | No (invisible) | ✕ |
| Donation | any Donation at address not completed | Operator/awarded org | Donation.pickup_deadline | No (status line only) | `awarded/completed` status; ✕ per-item |
| Cleanout | any Cleanout at address not completed | Operator/awarded vendor | Cleanout.cleanout_deadline | No | `completed` status, unverified |
| Buyout | configured event unresolved | Operator | buyout_config deadlines | No | Offer acceptance |
| Specialist | item OFFSITE unresolved | Operator | expected_return | No | offsite_research status |
| Company equipment | packed reusable assignment packout_state PENDING | Operator | ✕ | No (warning only) | pack-out terminal states ✓ |
| Client decision | status open (REVIEW merchandise) | Client authority | answer_by (requests) | **YES for REVIEW** ✓; general open = warning | decision history ✓ |
| Property issue | SaleIssue OPEN/WAITING | owner_user_id | answer_by | No (not in blockers) | resolution + linked refs ✓ |
| Payment/refund | settlement remaining > 0; unresolved payment attempts | Operator | ✕ | **YES — settlement blocker** ✓ | settlement deal + SaleRefund ✓ |
| Document | ✕ no obligation check | — | — | No | BusinessDocument exists, unlinked to close |
| Additional work | unauthorized extra work detected | ✕ no flag | — | No | ✕ |

## 46. PROPERTY COMPLETION MATRIX
| Area/requirement | Human confirmation today | Digital evidence | Exception | Blocker? |
|---|---|---|---|---|
| Rooms | ✕ (Ch20 closing checklist is sale-day, not final) | prep_zones truth | SaleIssue | ✕ |
| Closets/cabinets | ✕ | excluded_areas records | SaleIssue | ✕ |
| Garage/basement/attic/shed | ✕ | prep_zones/excluded_areas | SaleIssue | ✕ |
| Sold Items at property | ✓ (release records) | Ch21 awaiting-pickup count | partial releases shown | **YES** ✓ |
| Retained Items | ✕ | KEEP decisions | ✕ reason not enforced | ✕ |
| Company equipment | ✓ pack-out states | assignment records | MISSING state honest | warning only |
| Property condition | ✕ final | pre-sale condition photos only | SaleIssue | ✕ |
| Security/access | ✓ Ch20 closing checklist (human confirmations) | tasks | — | ✕ |

## 47. CHANGE IMPACT MATRIX — "CLIENT NOW RETAINS DINING TABLE" (was donate)
| Dimension | Today |
|---|---|
| Item disposition | ✓ new KEEP decision records the change with authority/history; donation load ✕ does not reference items, so nothing automatically excludes it — **broken seam: the donation scope is free text; an operator must remember to edit it** |
| Cleanout exclusion | ✕ same — free-text scope |
| Provider work order | ✕ doesn't exist; awarded vendor has no update path (record updated = operator edits scope text; provider notified = ✕ nothing) |
| Family pickup | ✕ no record to schedule the niece's pickup |
| Deadline | △ decision answer_by exists; no cascade |
| Labor | △ LaborEntry manual; no flag that removal labor changed |
| Cost | △ Expense/charge decisions manual; charge_policy guardrail exists if invoked |
| Scope | ✓ decision history preserves old + new instruction with impact noted in `reason` (free text) |
| Tasks | △ only if a human creates/links them |

## 48. COMPLETION SCORECARD MATRIX
| Metric | Source | Supported? | Unknown handling |
|---|---|---|---|
| Client objective achieved | ✕ (needs objective field + client outcome record) | No | Must display UNKNOWN, not assume |
| Scope completed | SaleScope + closeout steps | △ derivable, not assembled | Missing scope = UNKNOWN |
| Deadline met | ✕ (needs sale-level deadline + completion date) | No | No deadline = "no deadline recorded", never "met" |
| Sale proceeds | Settlement deal | ✓ | No deal = explicitly "no settlement record" ✓ |
| Company profitability | Ch4 econ | ✓ with "contribution, not net profit" wording | Owner hours excluded from cash ✓ |
| Disposition cost | Expense (dumpster/cleaning/professional) | ✓ cost lines; event-linkage △ | Unrecorded = honest gap |
| Remaining exceptions | Derivable from decisions/issues | △ | — |

## 49. TRANSITION TRACE (25 remaining)
Sale ends → 25 unsold items. System today: **5 family retained** = 5 KEEP decisions ✓ (removal untracked ✕). **8 donation** = one Donation record maybe, items not identified ✕. **6 cleanout** = one Cleanout record maybe ✕ items. **3 specialist** = offsite_research/custody ✓ 3. **2 buyer pickups outstanding** = ✓ Ch21 blocker. **1 decision needed** = ✓ open decision surfaces. **Accounting for all 25 without anonymous leftovers: ✕ FAILS** — 14 of 25 (donation+cleanout groups) are anonymous; the remainder are visible only as statuses, and 25 minus all recorded outcomes leaves an unexplained residue with no flag. Broken seams: no per-item disposition; no donation/cleanout item lists; no reason-required on residue.

## 50. CLIENT CHANGE TRACE (dresser: donation → niece)
Decision ✓ (new merchandise KEEP decision, authority, history, source). Item disposition ✓ decision record; ✕ no disposition field on Item. Donation exclusion ✕ free-text scope — seam. Family pickup ✕ no record (collector/deadline/release). Deadline ✕ no cascade. Provider impact ✕ no provider update path. Completion △ KEEP decision visible; physical removal unknown. **Chain breaks at the physical-truth layer.**

## 51. DONATION TRACE
Approved items ✕ (no approval record) → organization selected △ (award to a responder ✓) → acceptance checked ✕ (response is interest, not load acceptance) → pickup scheduled ✕ (deadline only) → pickup completed △ (status, no evidence) → documentation ✕ → items resolved ✕. **Two of seven steps exist.**

## 52. CLEANOUT TRACE
Scope △ free text → exclusions ✕ → quote ✓ (bids) → assignment ✓ (award) → provider confirmation ✕ (no scheduled/confirmed states) → work ✕ (invisible) → operator verification ✕ (status only) → completion △ (operator-set, unverified). **Three of eight.**

## 53. BUYOUT TRACE
Offer ✓ (Offer records + config) → included merchandise ✕ → exclusions ✕ → client authority ✕ → acceptance △ (offer status, no decision) → transfer ✕ → financial record △ (buyer pays operator; no canonical transaction) → items resolved ✕.

## 54. SPECIALIST TRACE
Item selected ✓ → specialist ✓ (ProfessionalNetwork/opinions) → custody ✓ (TRANSFERRED_SPECIALIST + offsite_research) → review ✓ (opinions/offsite) → accepted/declined/consigned ✕ (no outcome status) → sold/returned △ (RETURNED only) → final resolution ✕. **Strongest chain; missing only outcome statuses.**

## 55. PROVIDER CHANGE TRACE (client changes scope after cleanout awarded)
Authoritative decision ✓ recordable. Work order change ✕ (edit free-text scope). Affected price/cost ✕ (bid amount is fixed at award; change ≠ recorded). Provider update ✕ (no notification/confirmation). Confirmation ✕. Task/deadline impact △ manual tasks only. **Chain breaks immediately after the decision.**

## 56. FINAL WALKTHROUGH TRACE
Room-by-room ✕ (no mode) → remaining items ✕ → sold pickup ✓ (counts + release actions) → client retained ✕ → equipment ✓ (pack-out) → property issue ✓ (SaleIssue) → security △ (Ch20 checklist reusable) → exception ✕ → completion ✕. **Reuse prep_zones + Ch20 checklist + SaleIssue — all inputs exist; the guided flow does not.**

## 57. SCOPE CREEP TRACE ("also empty the garage" — garage excluded from scope)
Request ✓ recordable (decision request, issue, or note). Compare to scope ✓ possible manually (included=false visible). Additional-work flag ✕ automatic. Authority ✓ path exists (financial decision, additional_when_authorized). Price/cost ✓ if decision priced. Assignment △ SaleTask. Completion △ manual. **The determination is possible today but nothing flags it — the operator must notice.**

## 58. TRANSITION COMPLETION TRACE
Mark TRANSITION COMPLETE with one buyer pickup open → **BLOCKED today** ✓ (hard close-button disable). With provider work incomplete → **NOT blocked** ✕ (Cleanout status not consulted). With unresolved client decision → blocked only if REVIEW merchandise ✕. Resolve all three → blockers clear, close enabled, human approves ✓. **Verdict: the blocker gate is real but its obligation set is incomplete (§45).**

## 59. PRODUCT DOCTRINES (system-held today)
Truthfully held: SALE COMPLETE ≠ TRANSITION COMPLETE (derivable, not yet represented); paid-awaiting-pickup is not unsold merchandise ✓; retained merchandise ≠ unresolved leftover △ (decision exists, resolution doesn't); UNKNOWN is data ✓ (fee UNKNOWN, authority UNRESOLVED, no-guessed defaults); good records need endings ✓ (pack-out, authority deactivation, decision history); no silent zero-substitution ✓. Not yet held: NOTHING IS LEFTOVER / EVERYTHING HAS A NEXT STATUS (✕ no per-item disposition); a project should not close while obligations remain (✕ partial blocker set); employee authority ≠ client authority for disposition actions (✓ in decisions, ✕ in donation/cleanout/buyout actions).

## 60. RECOMMENDED IMPLEMENTATION SEQUENCE (DO NOT IMPLEMENT)
1. **P0-1:** RLS on the donation/cleanout/vendor entity chain (operator_id anchors + vendor-side scoped access). Independent, ships alone.
2. **P0-2:** Completion standard + item-level disposition block + reason-required residue + protected-merchandise exclusion requirements before publish/award (safety spine).
3. Sale-level objective/property deadline + closeout deadline surfacing.
4. Donation/Cleanout sale links + client-authorization links + item/exception lists + acceptance/receipt/verified completion.
5. Buyout schedule/exclusions/approval; specialist outcome status.
6. Provider relationship/payment/confirmation fields; change-impact listing; scope-creep flag.
7. Final walkthrough mode + property condition + family pickup + completion photos.
8. Scope-completion review, client completion summary, scorecard, transition-completion state + completed obligation matrix in the close gate.
9. (P2, much later) AI assistants under the never-decide doctrine.

## 61. PRE-LAUNCH DEPENDENCIES (carried forward, unresolved — not new Chapter 22 defects)
- Chapter 19: genuine non-owner denial of HIGH_VALUE price changes (pre-existing item).
- Chapter 21: 428px physical-device layout confirmation.
- Cross-company RLS/privacy verification — now EXPANDED by this audit's P0-1 (donation/cleanout chain has no RLS at all).

## 62. CERTIFICATION
**NO-GO.**
EstateSalen cannot yet truthfully move a project from SALE COMPLETE to TRANSITION COMPLETE: per-item disposition, the property deadline, provider work truth, and the completion standard do not exist, and the close gate consults an incomplete obligation set. Two genuine P0s (unprotected donation/cleanout PII chain; no protected-merchandise exclusion/authorization architecture) must land before Chapter 22 can be claimed even in part. Chapters 1–21 scope remains as previously certified; this verdict is about Chapter 22 capability only.
**STOP. Nothing built. Chapter 23 not started.**