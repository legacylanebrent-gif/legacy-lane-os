# CHAPTER 14 — ESTATESALEN CROSS-AUDIT REPORT
## PREPARATION, DISCOVERY, SORTING & ESCALATION

**Date:** 2026-10-21 · **Mode:** AUDIT ONLY. No code, data, workflows, permissions, or communications were changed. Every claim below was verified against deployed source, entity schemas, or functions.

---

## EXECUTIVE SUMMARY

Of the 90 audit parts and 31 book tools examined:

- **~38% of Chapter 14 promises are SUPPORTED TODAY** by certified existing systems (Chapter 13 project control, Chapter 12 rooms/consultation, Chapter 8 prep/security/equipment, Chapter 3 research flags, SaleClientDecision request architecture, Professional Network, PrintSigns, LaborEntry, private photo architecture).
- **~24% are printable/small enhancements** — mostly a sorting-zone SIGN SET and checklist extensions on existing templates.
- **~22% are genuine P1 gaps**, dominated by one structural finding: **there is no DISCOVERY/SORTING layer between "found it" and "formal Item inventory."** Found cash/valuables have no auditable record; sensitive material has no canonical state; restricted material has no hold state; nothing prevents research-flagged merchandise from being priced/published today.
- **~16% are AI items (P2/LATER)** — with one notable exception: an AI sensitive-material screen ALREADY EXISTS in `analyzeItemImage` but is not wired into the sale photo pipeline.

**Strongest existing architecture:** Chapter 13's Project Dashboard + SaleTask dependency/provenance model; SaleClientDecision request-state architecture; Item research flags; Chapter 8 security/checkout checklists; private consultation photo architecture; Professional Network.

**Largest genuine gaps:** (1) no discovery object — found cash/valuables and sensitive/restricted discoveries have no accountable home; (2) no research-before-pricing guardrail; (3) Chapter 12 rooms are operator-private deal data and cannot serve as team-visible work zones; (4) no room-level labor link; (5) no prep-day close view.

---

## 1. PREP DASHBOARD

**Partly EXISTS.** Chapter 13 ProjectDashboard already assembles: attention items, milestones, timeline, authorities, communication plan, open client decisions (DecisionsCard), SaleIssues (SaleIssuesPanel), retained register, excluded areas. Chapter 8 PrepareSale assembles deterministic prep analysis (timing, security walkthrough, checkout setup, research-flagged items, display-attention/high-value items, open decisions, unpacked equipment). Verified: `projectModel.js` (`attentionItems`, `computeMilestones`, `timelineEntries`) and `prepareModel.js` (`analyzePreparation`) are deterministic and record-derived.

**Missing:** rooms/work zones (do not exist as team-visible records — see §2), and blocked-work surfacing exists only via SaleTask dependency cache, not aggregated into the dashboard.

**Verdict:** Assembled-view problem. **DO NOT build another dashboard** — extend ProjectDashboard with a rooms/prep panel. One standing defect: the Chapter 13 crash fix (attention-array shadowing) is compile-verified but needs one manual dashboard open.

## 2. ROOM / WORK-ZONE WORKFLOW

**NOT SUPPORTED as-is — the audit's most important architectural finding.** Chapter 12 rooms (`SaleConversionPipeline.consultation.rooms`) DO capture room, merchandise observation, prep level, access concern, research-needed and private room photos. **BUT** they live on the DEAL, whose RLS is `operator_id === user` or admin — **sale-team members cannot read the deal or its rooms.** Rooms are also consultation observations, not prep work zones with assignment/status.

**Verdict:** Reuse is impossible without either (a) projecting room zones onto a sale-scoped, team-readable structure (like `excluded_areas` did — proven pattern), or (b) a work-zone block on EstateSale. No new room model — a `prep_zones`/rooms projection with the excluded-areas pattern is the smallest fix. **＋ BUILD (small).**

## 3. TEAM ASSIGNMENTS

**SUPPORTED.** SaleTask carries `assignee_user_id`, `assignee_name`, `due_date`, category, blocked state, and provenance (`source_type/source_label`). Chapter 13 dependency model certified. Room/category/responsibility assignment works if room becomes a task category/reference (task `source_label` or a room link field on SaleTask). **↔ COVERED** — no separate prep assignments.

## 4. PREP PROGRESS

**NOT SUPPORTED for rooms.** The book's truthful states (UNTOUCHED / SORTING / WAITING ON DECISION / WAITING ON RESEARCH / READY FOR INVENTORY / COMPLETE) map cleanly to Chapter 13's deterministic derivation doctrine: WAITING states can be derived from open decisions/research/issues linked to the zone. No percentage progress exists anywhere (consistent with the Chapter 13 decision). State belongs on the §2 zone structure, derived not stored where possible. **＋ BUILD (small, derived).**

## 5. SORTING STATUS

**PARTIAL — the core gap.** Existing: Item.status is TRANSACTIONAL (available/pending/sold/reserved) and must NOT be overloaded — confirmed correct doctrine. Item.research_status (CLEAR/RESEARCH_NEEDED/VERIFY/SPECIALIST_REVIEW) is a genuine pre-sale attention state but exists only AFTER a formal Item exists. SaleClientDecision merchandise (keep/sell/review + request state) and image-level KEEP (→ `excluded_from_public`) cover FAMILY KEEP and CLIENT DECISION well.

**Missing entirely:** SENSITIVE (no canonical state), RESTRICTED/HOLD (no state), DONATION (Donation entity is project-level, not a per-thing routing state), UNSUITABLE. A lightweight PRE-INVENTORY sorting state does not exist and IS needed (see §30/31). **＋ BUILD (the discovery layer).**

## 6. DISCOVERY MODEL

**DOES NOT EXIST.** Verified: no SaleDiscovery/PrepDiscovery/FoundItem entity, page, or function. SaleNote is plain text with no routing/status/photo/custody. SaleIssue is for questions. SaleClientDecision is client instruction, not a discovery record. Full analysis in §30.

## 7. RESEARCH (reuse)

**SUPPORTED at inventory stage.** Item.research_status + research_reason + resolution fields; ResearchFlagDialog is human-controlled; AI may suggest but never set it (Chapter 3 doctrine, enforced in code comments and coach guardrails). Research pricing tools (googleLensPricing, ai_first/deep search prices) exist. **Discovery→research without pricing:** possible today only by creating a full Item with a research flag — which forces premature inventory (the anti-pattern Chapter 14 forbids). Reuse the flags; they need a discovery-side home. **↔ COVERED with §30 condition.**

## 8. CLIENT DECISION QUEUE

**SUPPORTED.** SaleClientDecision: subject, item_id or image_index, request state (REQUESTED/UNDER_REVIEW/APPROVED/DECLINED/CANCELLED), requested_decision distinct from current_decision, requested_by_name, answer_by (overdue display), status open/resolved, append-only history with authorized_by (SaleAuthority link). Request ≠ approved is enforced by design. DecisionsCard surfaces open decisions. **↔ COVERED.** Routing a discovery into a decision needs only a link field on the discovery object.

## 9. SPECIALIST ROUTING

**PARTIAL.** Item.research_status includes SPECIALIST_REVIEW. Professional Network (Contact.professional_profile: service_categories including jewelry, fine_art, coins, collectibles_specialty, appraisal, auction; service areas; limitations; licensing with "never concludes legality"; private fit_notes) and Who-Can-Help (deterministic) are certified Chapter 11. Outbound referral dialog records authorized context. **Missing:** a link from a flagged item/discovery to a chosen professional — routing is manual today. **△ ENHANCE (link, not a new queue).**

## 10. DISPOSITION / RESTRICTED

**Disposition PARTIAL:** Donation entity (photos, scope, status, pickup deadline), Cleanout entity (bid award, vendor), buyout_config on EstateSale (buyout/cleanout sales), SaleScope.post_sale_plan with authorized outcomes. All project-level. Per-discovered-thing routing does not exist. **Restricted: NO HOLD STATE EXISTS** — display_attention (HIGH_VALUE/CONTROLLED_DISPLAY/CHECKOUT_HOLD/STAFF_ATTENTION) is sale-day handling, not a removal-from-sale-flow hold. Chapter 22 owns expanded disposition; Chapter 14 needs only a route/flag. **＋ small (restricted flag) / ↔ disposition reuse.**

## 11. PHYSICAL SIGNS / QR

**Signs EXIST** (PrintSigns page: 7 categories, print/download/view, room signs, Not For Sale, Do Not Enter, directional, payment). **Sorting-zone sign set does not exist** (no RESEARCH, CLIENT DECISION, FAMILY KEEP, SPECIALIST, SENSITIVE, DONATION, RESTRICTED/HOLD signs) → **✎ printable-only enhancement** (templates are static text; trivially added to signTemplatesData).

**QR:** per-image QR sheet tab exists; MobileQRCheckIn scans → `/CheckIn?saleId=`; CartQRScanner/generateCartQR for checkout; referral QR (Chapter 11). **No work-zone QR and no route that opens a sale+room prep view** — QR routing exists (scan→route pattern proven) but there is no destination view to open until §2 exists. **＋ P1 (after §2), reuse routing.**

## 12. SENSITIVE MATERIAL

**FUNCTION EXISTS, NOT WIRED.** `analyzeItemImage` implements a genuine sensitive-material screen: checks for financial statements, IDs, medical records, medication, correspondence, credentials; on detection returns `sensitive=true`, refuses to transcribe, and emits a STOP/REVIEW signal. **But its only caller is AgentGuidedHunt (profile flow). The sale photo import path and googleLensPricing have NO sensitive screen** — an operator can photograph and price a document stack with no warning. Sensitive material otherwise: no canonical state, no controlled-location record, no procedure doc. **Privacy-critical gap → P1 (wire the existing screen + a sensitive route).**

## 13. FOUND CASH / VALUABLES

**GENUINE GAP.** Nothing exists. SaleNote is insufficient (no photo, no custody, no resolution status, no accountability — and notes are team-visible plain text, poor for "$2,400 found in a drawer"). This alone justifies the discovery entity (§30). **＋ P1.**

## 14. DISCOVERY EVIDENCE / CUSTODY

**DOES NOT EXIST.** Requirements (what/where/when/who found/photo/handling/notification/resolution, custody states FOUND→SECURED→NOTIFIED→TRANSFERRED/RETURNED/ADDED) have no home. Private photo architecture (file_uri + short-lived signed URLs — verified in PhotoThumb, 900s) is reusable for discovery photos. Recommendation: a small `custody_events` array on the discovery record — NOT a forensic system. **＋ small (with §30).**

## 15. RESEARCH BEFORE PRICING (major doctrine)

**NO GUARDRAIL EXISTS — P1.** Verified: pricing paths (googleLensPricing, batch pricing, photo labeling) never check `research_status`. A RESEARCH_NEEDED item can receive a price and even marketing/publication state today. Item images carry skip/do-not-search states (Chapter 13 privacy filter works at publication), but research-vs-pricing is unenforced. **＋ P1: block/mark price-setting while research_status ≠ CLEAR (warn + allow explicit operator override, never a hard lock that strands work).**

## 16. PROFESSIONAL ESCALATION

**SUPPORTED.** Chapter 6 compliance escalation (ComplianceQuestion verification states: AI SUGGESTION / professional / authority verified — AI can never produce them) + Chapter 11 network. An operator can record why/who/status/resolution. **↔ COVERED.**

## 17. RELATED ITEMS / COLLECTIONS

**NOT SUPPORTED.** No grouping across rooms, no related-item search, no pattern recognition (verified — no such AI code). Family story ("my father bought these in Italy") can only live in note/description free text with no FAMILY STATEMENT label. **✎ book/manual task now; AI grouping P2/LATER (Chapter 15 should own formal inventory grouping).**

## 18. SECURITY / CUSTOMER ACCESS

**LARGELY SUPPORTED.** Security walkthrough checklist (verified in equipment/checklistTemplates.js): entrances/exits, restricted areas identified, checkout location with sightlines, high-value handling, sold-item area, pickup area, staff visibility. Customer-access classification vocabulary (OPEN/STAFF ONLY/CLOSED/PICKUP ONLY) does not exist as structured state; excluded_areas is the closest (team-safe, family deadline, resolved). **△ small enhancement** (access classification on excluded_areas/zones), no duplicate room truth.

## 19. PROPERTY PROTECTION

**PARTIAL.** No floors/walls/stairs/landscaping protection points in the checklist template (verified — template covers security/traffic, not property protection). **△ small enhancement:** add a "Property Protection:" checklist group. Pre-traffic condition photos: reusable via Chapter 12 private consultation photo architecture (private storage, room-associated, signed URLs — verified). **↔ photo reuse; checklist extension.**

## 20. LARGE-ITEM REMOVAL

**PARTIAL.** EstateSale.pickup_plan (window/location/instructions — Chapter 13), site_assessment.loading_access + pickup_constraints, security checklist pickup points. A per-room removal PATH through the property is not stored (only free-text access notes). **△ small** (removal-path note on zones or pickup_plan), do not touch Chapter 21 transaction state.

## 21. PREP LABOR

**SUPPORTED.** LaborEntry: work_category includes preparation/research/staging/sale_day/pickup/closeout/travel/other; entry_date (day); member identity (user_id/team_member_id/name); owner time (hours only, never cash); derived cash cost. **↔ COVERED.** **Room-level link: ABSENT** — no zone/room field. **△ small P1 enhancement** (one field), no new labor system.

## 22. PREP PRIORITY

**PARTIAL.** Deterministic signals all exist in records (blocked decisions, research flags, overdue tasks, timing phase); PrepCoachPanel already feeds `prepFactsString` (deterministic facts + "never invent" line) to the AI coach for prioritization. No zone-level readiness view yet (needs §2). **↔ COVERED at sale level; extends with zones.**

## 23. AI — TRUTHFUL CAPABILITY INVENTORY

| AI promise | Actual state | Class |
|---|---|---|
| AI Prep Coach (where to concentrate labor) | EXISTS: PrepCoachPanel/AiStagingCoachPanel/AiChecklistPanel, fed deterministic record facts; guardrails forbid claiming done/certified | ✓ EXISTING (P2 to deepen) |
| AI Item Assistant | EXISTS: googleLensPricing search + ai_first/deep prices; suggestions only; skip/do-not-search states | ✓ EXISTING |
| AI Sensitive Photo Warning | Function EXISTS (analyzeItemImage) — NOT wired to sale photo flow | △ ENHANCE (wire) — P1-adjacent |
| AI Privacy Review (publication screening) | NOT EXISTS end-to-end | P2 after wiring |
| AI Prep Notes (voice → structured) | VoiceNoteInput = browser dictation → plain note. No AI structuring | P2 (book must not claim) |
| AI Uncertainty / Escalation Prompt | PARTIAL: compliance_research mode enforces evidence labels (AI SUGGESTION/UNKNOWN) and never verifies; item paths suggest prices | △/P2 for prep context |
| AI Research Assistant (marks/labels organization) | NOT EXISTS as organized clue capture | P2 |
| AI Pattern Recognition (cross-sale similar maker) | NOT EXISTS | P2/LATER |
| AI Labor Review (labor vs value) | NOT EXISTS | P2 |
| AI Prep Briefing (rooms/research/decisions summary) | NOT EXISTS, but Chapter 13 structure now makes it possible | P2 (possible ≠ existing) |

## 24. PHYSICAL ↔ DIGITAL TRUTH (matrix, Part 87)

| PHYSICAL CATEGORY | DIGITAL CANONICAL STATE | EXISTS? | SIGN/LABEL? | QR? | PUBLIC/PRIVATE | NEXT PROCESS |
|---|---|---|---|---|---|---|
| SELL | Item.status=available — but only AFTER formal inventory; no discovery-stage state | △ | ✓ (pricing signs) | ✓ (item/cart QR at inventory) | Public listing when published | Formal inventory → pricing |
| RESEARCH | Item.research_status + reason | ✓ (item stage only) | ✗ sign | ✗ | Internal | Research → pricing |
| CLIENT DECISION | SaleClientDecision (request state) | ✓ | ✗ sign | ✗ | Internal | Approval → route |
| FAMILY KEEP | Decision 'keep' + image excluded_from_public + RetainedRegister | ✓ | ✗ sign | ✗ | PRIVATE (Ch13 certified) | Retained register |
| SPECIALIST | research_status=SPECIALIST_REVIEW + Professional Network | △ (no link) | ✗ sign | ✗ | Internal | Network referral |
| SENSITIVE | NONE (screen function unwired) | ✗ | ✗ sign | ✗ | Must be PRIVATE | Controlled location → client |
| DONATION | Donation entity (project-level) | △ | ✗ sign | ✗ | Internal | Donation scheduling |
| RESTRICTED | NONE (no hold state) | ✗ | ✗ sign | ✗ | Must be PRIVATE | Professional review / operator action |

**Signs with no digital state:** SENSITIVE, RESTRICTED (neither exists at all today). **Digital state with no physical indicator:** CLIENT DECISION, RESEARCH, SPECIALIST (states exist; zone signs don't).

## 25. DISCOVERY → INVENTORY BOUNDARY (Parts 63–70)

Boundary today is implicit and bad: something becomes an Item only when someone fills the full required form (title, seller_id, price — verified schema requirements). That forces premature pricing for anything found — exactly what Chapter 14 forbids. **Recommended boundary: DISCOVERED (no Item) → SORTED (route chosen) → READY FOR INVENTORY (zone complete / decision made) → ITEM CREATED (Chapter 15 owns Item lifecycle from there).** Routing traces (65–70) all terminate correctly in existing systems EXCEPT sensitive (68) and restricted (69), which have no destination, and found-cash (71), which has no record → notification task → resolution chain. Donation routing (70) reaches the Donation entity; client-decision routing (65) reaches SaleClientDecision with provenance preserved (source_id) — re-entry exists via the deal/decision link.

## 26. PREP DAY CLOSE / NEXT DAY

**PARTIAL.** ProjectDashboard assembles nearly every input the book's end-of-day review wants (rooms worked is the exception; labor exists via LaborEntry; tasks/decisions/issues open counts all present). No "prep day close" summary view exists. Unfinished work carries forward naturally (SaleTask/Issue/Decision persist; no reset logic anywhere — verified). **△ ENHANCE: one assembled panel on ProjectDashboard. P1-lite.**

## 27. PRIVACY / RLS (Part 74)

Audited entity RLS: all sale-scoped operational entities (SaleTask, SaleIssue, SaleClientDecision, SaleProposal, SaleAgreement, SaleEquipmentAssignment, LaborEntry, SaleNote) read-scope to operator + sale_team + admin; deals and consultation blocks are operator/admin-only; site_assessment (alarm/gate/key truth) is field-level owner/creator/admin-only; consultation photos and retained-private photos are private-storage + signed-URL; MarketingKit/case studies are approved-photo-only.

**P0 findings:** NONE new. Standing issues carried forward: scraped-record PII in public Directory/Operator Profiles (known, pre-Chapter-14); found-cash-in-SaleNote would be team-visible plain text (argument FOR the discovery entity with least-privilege custody fields, not a P0 today because no such data flows yet). **Any future discovery entity MUST ship with: sensitive discoveries and custody details least-privilege (operator/admin), team sees only the fact that a hold exists.**

## 28. READY-TO-USE TOOLS — ALL 31 CLASSIFIED

| # | Tool | Classification |
|---|---|---|
| 1 | Preparation-day checklist | ✓ INTERACTIVE ALREADY BETTER (PrepareSale + equipment load-out) |
| 2 | Room-by-room prep sheet | ＋ P1 (needs §2 zones) — BOOK interim |
| 3 | Team assignment sheet | ✓ INTERACTIVE BETTER (SaleTask) |
| 4 | Work-zone plan | ＋ P1 (zones + plan view) |
| 5 | Sorting rules sheet | ✎ BOOK/PRINTABLE + BusinessDocument POLICY |
| 6 | Sell sign | ✓ EXISTING TEMPLATE |
| 7 | Research Before Pricing sign | ✎ SMALL ENHANCEMENT (template) + ＋ P1 digital guard |
| 8 | Family Keep sign | ✎ SMALL ENHANCEMENT (template); digital ✓ |
| 9 | Client Decision sign | ✎ SMALL ENHANCEMENT (template); digital ✓ |
| 10 | Specialist Review sign | ✎ SMALL ENHANCEMENT (template); digital △ |
| 11 | Sensitive Material sign | ✎ SMALL ENHANCEMENT (template); digital ＋ P1 |
| 12 | Donation sign | ✎ SMALL ENHANCEMENT (template); Donation entity ✓ |
| 13 | Restricted/Hold sign | ✎ SMALL ENHANCEMENT (template); digital ＋ P1 |
| 14 | Client-question form | ✓ INTERACTIVE BETTER (SaleClientDecision request capture) |
| 15 | Found-cash record | ＋ GENUINE SOFTWARE GAP (P1) |
| 16 | Found-valuables record | ＋ GENUINE SOFTWARE GAP (P1, same record) |
| 17 | Sensitive-document procedure | ✎ BUSINESS DOCUMENT (policy) + ＋ P1 route |
| 18 | Privacy checklist | ↔ ARCHITECTURE EXISTS (BusinessDocument + PolicyAcknowledgment); content ✎ BOOK |
| 19 | Research-needed tag | ✓ EXISTING (Item.research_status / ResearchFlagDialog); discovery-stage ＋ |
| 20 | Specialist referral sheet | ✓ INTERACTIVE BETTER (Professional Network) |
| 21 | Hazard/restricted procedure | ✎ BUSINESS DOC + ＋ RESTRICTED state |
| 22 | Customer-access worksheet | △ SMALL ENHANCEMENT (classification on zones) |
| 23 | Restricted-area signs | ✓ EXISTING (Do Not Enter / Not For Sale) |
| 24 | Security walkthrough | ✓ EXISTING (Security: checklist) |
| 25 | Sightline checklist | ✓ EXISTING (staff visibility + checkout sightline points) |
| 26 | High-value checklist | ✓ EXISTING (Security point + display_attention) |
| 27 | Property-protection checklist | △ SMALL ENHANCEMENT (add checklist group) |
| 28 | Furniture pickup-route worksheet | △ SMALL ENHANCEMENT (path on pickup_plan/zones) — BOOK interim |
| 29 | Preparation labor sheet | ✓ INTERACTIVE BETTER (LaborEntry) |
| 30 | End-of-day prep review | △ SMALL ENHANCEMENT (dashboard panel) |
| 31 | Room completion checklist | ＋ P1 (zone completion state) |

## 29. DO-NOT-REBUILD (certified reuse list)

EstateSale (excluded_areas, pickup_plan, site_assessment) · Chapter 12 consultation rooms/photos (private, signed URLs) · Chapter 13 ProjectDashboard + SaleTask (deps, provenance) + SaleIssue · SaleClientDecision (request architecture) · SaleAuthority · SaleNote · Activity · Item research/display-attention flags · LaborEntry · PrepareSale + security/checkout checklists · EquipmentAsset/SaleEquipmentAssignment/kit templates · PrintSigns + signTemplatesData · QR scan/routing (MobileQRCheckIn, cart QR, referral QR) · Professional Network + Who-Can-Help + outbound referral dialog · Donation/Cleanout/buyout · MarketingKit approved-photo pipeline + Ch13 retained-private filters · BusinessDocument vault + PolicyAcknowledgment + ComplianceQuestion escalation · consultation PhotoThumb signed-URL pattern · Google Lens research tools · operatorAiCoach modes + brand-truth guardrails · projectModel/prepareModel deterministic analysis.

## 30. NEW ENTITY TEST

**Recommendation: SALE DISCOVERY ENTITY JUSTIFIED** (name it `SaleDiscovery`), as the ONE new Chapter 14 entity.

Proof of necessity — the four failure cases no existing object can hold:
1. **Found cash/valuables** need photo, custody, controlled location, resolution, history-that-survives — SaleNote has none of these and is team-visible plain text.
2. **Sensitive material** needs a private state with controlled location and least-privilege visibility — no object has it.
3. **Pre-inventory routing** (research/decision/specialist/donation/restricted) must not force an Item: Item requires title/seller/price (premature pricing — the exact anti-pattern), and its statuses are transactional.
4. **Employee discovery record** needs found-by/timestamp/room/next-action with integrity after resolution — only append-friendly records qualify, and none is discovery-shaped.

Extending Item instead would push every sorted-but-unsellable thing (trash, donation, sensitive documents) into inventory, polluting Chapter 15's lifecycle, marketing surfaces, and counts — and would still need sensitive/custody fields that don't belong on merchandise. **Minimum fields (audit-only proposal):** sale_id, operator_id, sale_team_ids (RLS pattern), zone/room ref, description, discovery_type (merchandise/cash/valuable/sensitive_document/other), sorting_route (sell/research/client_decision/family_keep/specialist/sensitive/donation/restricted/unsuitable), route_link (decision/issue/task ref), photo file_uri (private), found_by, found_at, research flag, specialist_need, controlled_location (operator-visibility only), custody_events[], client_notified (task ref + at), resolution (returned_to_client/family_keep/added_to_sale/research/specialist/donation/other) + resolved_at, promoted_to_item_id, timestamps. RLS: sale-scoped team-readable EXCEPT controlled_location/custody for sensitive discoveries (operator/admin).

## 31. ITEM VS DISCOVERY

**NO — every discovered object should NOT immediately become an Item.** Speed: forcing full inventory records mid-sorting stops the prep day. Data quality: premature Items carry guessed titles/prices that later look "verified." Inventory lifecycle: Chapter 15 owns Item maturity; pre-inventory junk pollutes counts/marketing/research. Research: discovery can carry "unknown, needs research" honestly; an Item implies saleable merchandise. Sensitive/found-valuables: must NEVER become public-inventory-adjacent records. Trash/donation: creating Items for discard is waste. **The promotion point (discovery → Item) is a human decision recorded as `promoted_to_item_id`.**

## 32. SMALLEST RECOMMENDED ARCHITECTURE (NOT IMPLEMENTED)

1. **Prep zones:** project Chapter 12 room names onto a team-readable zone structure on EstateSale (excluded_areas pattern), with derived prep state (UNTOUCHED/SORTING/WAITING ON…/READY/COMPLETE — derived from linked decisions/research/tasks, no percentages).
2. **SaleDiscovery entity** (§30) with sorting_route + links into existing queues (SaleClientDecision, SaleIssue/SaleTask, research workflow via promotion, Professional Network).
3. **Sensitive + restricted routes:** sensitive (private, controlled location, custody) and restricted/HOLD (removed from ordinary flow, professional review recommended — never a legality conclusion).
4. **Research-before-pricing guard:** warn/block pricing while research unresolved, explicit operator override.
5. **Sign set:** add the 8 sorting-zone sign templates (printable only).
6. **Wire analyzeItemImage sensitive screen** into the sale photo import path.
7. **LaborEntry zone field + end-of-day prep panel** on ProjectDashboard.
Everything else reuses certified systems.

## 33. GAP CLASSIFICATION (Part 81)

- **INTERFACE GAP:** prep-day close panel; zone views on ProjectDashboard; discovery capture UI; sorting-route picker.
- **DATA GAP:** SaleDiscovery entity; sensitive/restricted states; zone structure; LaborEntry room link; family-statement label.
- **WORKFLOW GAP:** discovery→queue routing (decision/research/specialist); research-before-pricing; custody; work-zone QR destination.
- **PERMISSION GAP:** team visibility of rooms (deal-RLS block); least-privilege on sensitive discovery fields; sensitive-screen wiring (privacy-critical).

## 34. P0 / P1 / P2 / LATER

- **P0:** none new (audit found no exploitable leak in audited Chapter 14 surfaces; standing Directory PII issue carried).
- **P1:** discovery/sorting layer (SaleDiscovery + routes); prep zones + derived state; sensitive/restricted handling + custody; found cash/valuables record; research-before-pricing guard; wire sensitive screen; sorting-zone signs; end-of-day panel; LaborEntry zone field; customer-access classification.
- **P2:** AI Prep Briefing, AI Prep Notes, AI Privacy Review (post-wiring), AI Uncertainty/Escalation in prep context, AI Research Assistant clue organization, AI labor review, related-item intelligence.
- **LATER:** pattern recognition across sales, automatic collection detection, predictive prep labor, advanced custody, inventory vision automation (Chapter 15/22 territory).

## 35. BOOK TRUTH (key promises)

| Promise | Can the book say it today? |
|---|---|
| Preparation Dashboard | YES AS EXISTING-SYSTEM OUTCOME (Ch13/Ch8), zones NOT YET |
| Room-by-Room Workflow | NOT YET — BUILD (zones; Ch12 rooms are private observations) |
| Prep Progress | NOT YET — BUILD (derived) |
| AI Prep Coach | YES, EXISTING (hedged, record-grounded) |
| Sorting Status | NOT YET — BUILD (discovery layer) |
| Research Queue | YES AS EXISTING-SYSTEM OUTCOME (item stage) |
| Client Decision Queue | YES, EXISTING |
| Specialist Queue | YES WITH SMALL ENHANCEMENT (link) |
| Disposition Status | YES AS EXISTING-SYSTEM OUTCOME (project level) |
| Restricted Item Hold | NOT YET — BUILD |
| QR Work-Zone Signs | NOT YET — BUILD (routing exists) |
| Status Labels / Sorting Signs | SMALL ENHANCEMENT (printable) |
| Sensitive-Item Workflow | NOT YET — BUILD (screen function exists, unwired) |
| Controlled Location / Custody | NOT YET — BUILD (small) |
| Sensitive Photo Warning | NOT YET — WIRE EXISTING FUNCTION |
| Found Cash & Valuables | NOT YET — BUILD |
| Employee Discovery Record | NOT YET — BUILD (in discovery entity) |
| Client Notification (discovery) | YES AS EXISTING-SYSTEM OUTCOME via task/decision (draft-only, no auto-send — keep that wording) |
| Resolution Status | NOT YET — BUILD (in discovery entity) |
| Research Before Pricing | NOT YET — BUILD (P1; book must NOT claim until shipped) |
| Professional Escalation | YES, EXISTING (Ch6/Ch11) |
| Related Items / Collections / Pattern Recognition | P2/LATER — WORDING SHOULD CHANGE (manual task only) |
| Customer Access / Sightlines / High-Value | YES AS EXISTING-SYSTEM OUTCOME (checklists), classification small enhancement |
| Property Condition Photos | YES AS EXISTING-SYSTEM OUTCOME (Ch12 private photos) |
| Room-Level Labor | NOT YET — small enhancement |
| AI Labor Review / Prep Briefing / Prep Notes / Privacy Review | P2 — WORDING SHOULD CHANGE |
| AI Item Assistant | YES, EXISTING (suggestions, never verified) |

## 38. PRODUCT DOCTRINES — CONFIRMED ALIGNED

The existing codebase already enforces: DISCOVERED≠INVENTORIED and SORTED≠PRICED (architecturally, once §30 exists); CLIENT CLAIM≠VERIFIED (request≠approved); AI SUGGESTION≠IDENTIFICATION (guardrails verified in operatorAiCoach + Chapter 3); RESEARCH≠LOW VALUE; SENSITIVE≠MERCHANDISE and RESTRICTED≠DISCARDED (new states, kept distinct by design); no fake percentages (Ch13 decision); privacy-first photos (signed URLs, retained-private filters certified).

## 39. PREP LEARNING LOOP

PLAN (PrepareSale/ProjectDashboard ✓) → ASSIGN (SaleTask ✓) → DISCOVER (**BROKEN — no object**) → SORT (**BROKEN — no state**) → ESCALATE (Issue/Decision/Network ✓) → RESOLVE (decision/issue resolution ✓, discovery-resolution missing) → INVENTORY (Item ✓ at promotion) → TRACK LABOR (LaborEntry ✓, zone link missing) → REVIEW (**BROKEN — no day-close view**) → BETTER NEXT DAY (carries forward ✓ once the view exists).

## 40. RECOMMENDED IMPLEMENTATION SEQUENCE (NOT IMPLEMENTED)

1. Research-before-pricing guard (protects truth today, no schema change)
2. SaleDiscovery entity + sorting routes (the spine)
3. Prep zones projection + derived state (+ LaborEntry zone field)
4. Sensitive/restricted routes + custody + found-cash/valuables flow
5. Dashboard: zone panel + end-of-day prep close
6. Sign set + work-zone QR (after zones exist)
7. Wire sensitive screen into photo import
8. P2 AI items on request

## 41. PRE-LAUNCH DEPENDENCIES (carried forward)

Chapter 13: Project Dashboard manual open (crash fix), task-dependency manual flow + cycle-refusal check. Physical Item QR → phone camera → checkout/receipt test. Second-account RLS spot checks. SMS certification. Houszu certification. Chapter 11 physical partner QR scan. Standing issues: Directory PII, Meta webhook secrets, Houszu identityResolve. **Chapter 14-specific:** research-before-pricing guard and found-cash record must ship before the book claims them.

## 42. CERTIFICATION

## **GO WITH CONDITIONS**

The certified Chapter 13/12/8/11/6 architecture is strong and reusable; no P0 was found. But the Chapter 14 central promise — "everything discovered enters the correct process" — is **not yet true**: the discovery/sorting layer, sensitive/restricted handling, found-cash record, and research-before-pricing guard do not exist. Chapter 14 P1 (per §32/§40) must be authorized and built before the book's discovery/sorting/sensitive/found-cash claims are published.

**AUDIT COMPLETE. NOTHING WAS BUILT. AWAITING EXPLICIT AUTHORIZATION FOR CHAPTER 14 P1.**