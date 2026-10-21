# CHAPTER 11 — ESTATESALEN CROSS-AUDIT REPORT
## Professional Referral Network, Transition Coordination & Houszu Connection

**AUDIT ONLY.** No production data modified. No communications sent. No records created. No payments touched. No Houszu configuration changed. Nothing deployed.

Classification legend: ✓ EXISTING / SUPPORTED · △ ENHANCE · ＋ BUILD · ✆ COMMITTED PRE-LAUNCH · ↔ COVERED BY EXISTING SYSTEM · LATER CHAPTER · ✎ BOOK / PRINTABLE TOOL · ✕ DUPLICATE / DO NOT BUILD

---

## EXECUTIVE SUMMARY

**Coverage: roughly 55% of the Chapter 11 promise is already supported by existing architecture; ~20% needs enhancement to existing records; ~15% is genuine (mostly P1) build; ~10% is P2/Later AI and portal capability. Zero P0 privacy breaks found in the operator-side referral path.**

**Strongest existing architecture:**
1. **Chapter 10 CRM is referral-ready.** `SaleConversionPipeline` already carries structured referral-source attribution (`referral_source_type` incl. real_estate_agent / attorney / senior_move_manager / professional_organizer / estate_sale_company / past_client, `referral_source_name`, `referral_source_contact_id` — a canonical Contact link), the distinct REFERRED-out outcome (`referred_to_contact_id`, `referred_service`, `referred_reason`, `referred_at`), next-action discipline, and provenance. The Lead Source Performance report already groups **by referring Contact** and follows source → consultation → proposal → agreement → revenue.
2. **The canonical Contact entity already has a professional role taxonomy** (agent, attorney, cpa, tax_adviser, insurance, bookkeeper, payroll, employment_adviser, contractor, vendor, referral) with operator-private RLS — one Contact taxonomy, no separate adviser directory (a Chapter 6 doctrine already honored).
3. **A complete COMPENSATED agent↔operator referral exchange already exists** (ReferralLead → MasterReferralAgreement → OperatorAgentMatch → ReferralDealPipeline → ReferralDealAgreement → ReferralCommission → OperatorWallet → withdrawal/approval), with potential-vs-available wallet balance separation.
4. **Provider service-area modeling exists in production** (CleanoutVendorProfile: `services[]`, `service_states[]`, `service_radius`, `territory_ids`, plus primary human `contact_name`; ProviderDirectory: `counties_served_json`, `zip_codes_served_json`, `specialties_json`) — proof the vocabulary exists, but it lives in the platform's network/directory systems, not the operator's private Contact book.

**Largest genuine gaps:**
1. **The operator's own Contact book has no professional PROFILE layer**: no service categories, no service area (only an office address), no project preferences, no service limitations, no organization→primary-person distinction, no licensing flags, no factual-vs-experience note separation. Contact can HOLD a professional; it cannot yet DESCRIBE one. This is the central Chapter 11 gap.
2. **No "Who Can Help?" workflow**: there is no operator-facing need → category → geography search over the operator's own professional contacts. (Search/filter exists only inside the platform cleanout network and public directories.)
3. **No partner-attributed seller intake link/QR**: existing referral links+QR (`?ref=` codes, ReferralLanding, ReferCompany, generateReferralQR) are SIGNUP/marketing attribution, not professional-partner client-referral attribution into Chapter 10. The bridge ALREADY accepts `professional_referral` provenance — only the attributed link + pre-fill is missing.
4. **No outbound referral outcome/experience recording** beyond stage=referred + notes: no structured "what happened after the introduction," no client-experience-with-provider record, no private reliability history.
5. **Houszu agent-network promises remain pre-launch/unverified** (gateway implemented; deal-pull seam legacy; identity resolve down; certification pending).

**P0 security findings (report-only):**
- **P0-A (platform, pre-existing):** `ProviderDirectory` has **no RLS block at all** → default access means any authenticated user can read AND WRITE provider directory records, including `rating` and `review_count`. This is the platform's public directory (separate from operator-private contacts), but unguarded writes + editable ratings are a real integrity/abuse exposure. Aligns with the standing known issue "Public Directory and Operator Profiles display sensitive PII."
- **P0-B (low risk, real):** `ReferralLanding.jsx` (public page) calls `asServiceRole.entities.User.list()` to resolve a referrer code — a service-role user enumeration on a public route, wrapped in a permissive try/catch. Should resolve the referrer server-side by code, not list all users.
- **Operator-side referral privacy is otherwise CLEAN:** Contact RLS is strictly `created_by_id` / `assigned_to` / admin. No referral field, match record, or agreement entity grants any access to EstateSale, SaleScope, SaleAuthority, SaleClientDecision, settlements, notes, inventory, access plans, or documents. No partner portal exists, so no unrestricted partner access exists.

---

## 1. PROFESSIONAL CONTACT / PARTNER CRM

**Verdict: ✓ EXISTING as identity + roles; △ ENHANCE for professional profile.**

- `Contact` is the canonical person record: name, email, phone, address object, `roles[]` (seller, buyer, executor, vendor, investor, referral, **agent, attorney, cpa, insurance, payroll, bookkeeper, tax_adviser, employment_adviser, contractor**), `tags[]`, `notes`, `status` (new/contacted/qualified/nurturing/active/closed_won/closed_lost), `priority`, `next_follow_up`, `score`, `lifetime_value`, `activities_count`, `deals[]`, `properties[]`.
- Chapter 6 P1 already established the one-taxonomy doctrine ("one Contact taxonomy, no separate adviser directory"); Chapter 9/10 already link deals to Contacts (`referral_source_contact_id`, `referred_to_contact_id`, `client_contact_id`, ComplianceQuestion `professional_contact_id`).
- Chapter 10's referred-out outcome reuses Contact for the destination professional — **proven, certified in the Chapter 10 sweep (a new destination contact was created and linked through the Referred dialog).**
- **Gaps:** Contact can organize WHO the professional is, but not WHAT THEY DO, WHERE THEY WORK, WHAT FITS, or WHAT THEY DON'T DO (see §2–§5). Missing: organization/company linkage (a Contact is a person; the "ABC Cleanouts" company has no Contact-side representation), and the role enum lacks senior_move_manager, mover, cleanout, donation, appraiser, auctioneer, consignment, organizer-only, realtor-vs-agent distinction — several of these are services, not person-roles, and belong in the service-category layer, not the role enum.
- **DO NOT BUILD a Partner entity** — confirmed: Contact genuinely can carry the architecture with an additive professional-profile layer. ✕ new entity.

## 2. SERVICE CATEGORIES

**Verdict: △ ENHANCE (additive, on Contact) — vocabularies already exist to reuse.**

- Existing taxonomies: `SaleConversionPipeline.referred_service` (cleanout, donation, auction, consignment, mover, real_estate_agent, attorney, organizer, specialist, other); `Contact.roles` professional roles; `CleanoutVendorProfile.services[]`; `ProviderDirectory.provider_type` + `specialties_json`; `ProbateProviderRoutingRule.services`; `OperatorService` (operator's own catalog — deliberately NOT this); `ClientTestimonial`/case-study service families.
- **Reuse the `referred_service` family as the base vocabulary and extend it** (real_estate, elder_law, probate_estate_law, organizing, senior_move, moving, cleanout, donation, appraisal, auction, consignment, buyout, jewelry, art, coins, vehicles, contractor, accounting, other). Multiple categories per provider = array field on the professional profile. **Do not create a second vocabulary** — ✕ duplicate.
- Today: no operator-side structured category on Contact → the Book cannot say this today.

## 3. SERVICE AREAS

**Verdict: △ ENHANCE (on Contact); precedent exists in production.**

- `Contact.address` is an OFFICE ADDRESS — correctly NOT a service area (the doctrine "an office address is not a service area" is already architecturally true, but there is no service-area field to contrast it with).
- Precedent: `CleanoutVendorProfile` (`service_states[]`, `service_radius`, `territory_ids`), `ProviderDirectory` (`counties_served_json`, `zip_codes_served_json`), `ProviderRoutingRule` / `ProbateProviderRoutingRule` (state/county/zip routing), Chapter 5's territory/county infrastructure (`HousioTerritory`, county data, `distance_miles` snapshots).
- Additive fields on the professional profile: counties, zips, state(s), optional radius, free-text exceptions. Unknown = empty = UNKNOWN, never inferred. **Additive fields are a schema change — must not be done during this audit; listed for authorization.**

## 4. PREFERENCES / LIMITATIONS (Parts 4–5, 9)

**Verdict: ＋ BUILD (small, additive profile fields). Currently only free `notes` + `tags`.**

- No preferred-project/client/property fields, no minimums, no "does not handle," no travel limits, no licensing boundaries, no availability constraints, no fit notes.
- Part 9's FACTUAL PROFILE vs OPERATOR EXPERIENCE separation does not exist — a single `notes` field currently mixes both. The enhancement should carry separate fields: factual profile (categories, areas, preferences, limitations, licensing) vs experience notes (operator observations, response behavior) — the latter private-by-RLS already.
- **UNKNOWN CAPABILITY ≠ SUPPORTED CAPABILITY** is naturally preserved if all new fields default to empty/unknown and are never defaulted to optimistic values.

## 5. PRIMARY CONTACTS (Part 6)

**Verdict: △ ENHANCE (light).**

- The pattern "organization → actual human" exists in the platform systems (`CleanoutVendorProfile.business_name` + `contact_name`; `ProviderDirectory.business_name` + `contact_name`; `Company` has `primary_contact_user_id`) but NOT in the operator's Contact model: a Contact is only a person; there is no organization field, no company link, and no "primary contact OF this organization" concept.
- Smallest fix: an optional `organization_name` (+ optional `organization_contact_id` link for company-level records) on the professional profile. **Do not duplicate Company** — Company is the operator's own/claimed company entity, not a partner-organization directory. ✕ new Partner-organization entity.

## 6. WHO CAN HELP? / REFERRAL MATCH (Parts 7, 55)

**Verdict: ＋ BUILD (P1 — likely the central Chapter 11 workflow). Today: ✕ nothing operator-facing exists.**

- `grep` across the app finds NO "who can help" search over operator Contacts. `ProviderMatchCTA` (life-transition checklists) is a **static CTA to provider TYPES**, not matching. `matchCleanoutLead` / `matchResellerLead` are real state/territory matchers but they serve the platform's cleanout/reseller networks, not the operator's private book.
- The workflow (need/category + location + optional timeline → appropriate existing options) is implementable as **pure deterministic SEARCH/FILTER** over enriched Contacts — category ∩ service-area ∩ not-disqualified. Correctly classify any AI layer as P2 (§25). Filtering must never be called AI.
- This is the top P1 recommendation and directly enables Parts 7, 8 (multiple options per category/geography is just "return all matches," no exclusivity rule exists), 10, 11, 64.

## 7. GEOGRAPHIC MATCHING (Part 10)

**Verdict: data partially exists (after §3 enhancement); matching UI does not exist.**

- Chapter 5 geography (county lists, territory model, distance snapshots) is reusable. Comparison of client/property location vs provider service area is straightforward once service-area fields exist. **Distinguish honestly: today NO operator-side geographic matching exists; only the platform cleanout network matches by state.**

## 8. HOUSZU AGENT NETWORK (Part 12)

**Verdict: ✆ COMMITTED PRE-LAUNCH / PARTIALLY IMPLEMENTED, UNVERIFIED. Do not overstate.**

Verified state:
- **LIVE-IMPLEMENTED (code-complete, gateway activated Phase 7D.2):** `houszuPartnerClient.ts` (single certified Partner API v1.6.0 dispatcher client, service-token auth, idempotent deterministic payload builder), `flushIdentityOutbox` (hourly workflow: lease-based worker, exponential backoff, dead-letter only for genuine failures, canonical-event quarantine), `verifyGatewayContract` (includes operator registration mapping).
- **IMPLEMENTED BUT UNVERIFIED:** operator deal pull (`getOperatorDealsFromHouszu`, `getOperatorCommissionsFromHouszu`, `getHouszu_DealDetails`, `syncClosedDealFromHouszu`) — note `getOperatorDealsFromHouszu` authenticates with the **legacy `LEGACY_SHARED_API_KEY` seam**, not the certified partner dispatcher. Deal-stage notifications (`notifyHouszu_DealStageUpdate`, `notifyHouszu_CloseDeal`) rely on Houszu accepting EstateSalen IDs — the documented dead-end (receiver refused unknown IDs; **feed-pull cadence is the working assumption**).
- **BLOCKED / DOWN:** Houszu `identityResolve` (known issue B2-03). Houszu certification overall is a standing pre-launch dependency.
- **The agent "network" itself (LandingPageAgent, AgentSignup, AgentTerritoryApplication, agent matching, ReferralDealPipeline) is EstateSalen's OWN referral exchange — it exists independently of Houszu.** Any promise of a shared EstateSalen↔Houszu agent graph is NOT yet true; only consumer-identity/activity outflow and operator-deal pull/push seams exist. Bidirectional contents-need routing (Part 48) is architectural intent, not implemented.

## 9. AGENT → OPERATOR (Part 13)

**Verdict: ✓ EXISTING (compensated exchange) + ✓ Chapter 10 inbound provenance; △ alignment gap between them.**

- Intake exists: agent signup/landing, `AgentListingPoolSubmission` (listing-based), `ReferralLead` (client_name, property_address, assigned_agent_id, assigned_operator_id, source_type, status new→accepted→in_progress→closed), operator matching (`OperatorAgentMatch` pending/accepted/declined, `getMatchingOperatorsForAgentTerritory`), notifications to operators.
- Source attribution, operator assignment, status/outcome all exist — **but in the ReferralLead/ReferralDealPipeline system, not the Chapter 10 canonical pipeline.** Chapter 10's bridge already accepts `inquiry_source_type: professional_referral` and seeds a next action, so the canonical path exists — the two systems are not currently bridged to each other (an accepted ReferralLead does not deterministically create a SaleConversionPipeline opportunity). **Duplication/conflation risk — see §32. Recommend the professional network FEED Chapter 10, never replace it.**

## 10. OPERATOR → AGENT (Part 14)

**Verdict: ✓ EXISTING in two layers; △ nothing records operator→agent home-sale referrals as a Chapter 10 outbound event.**

- Referred-out outcome supports `referred_service: real_estate_agent` with Contact link + reason + date — operator CAN record referring a client to an agent as a deal outcome ✓ (certified in the Chapter 10 sweep).
- The compensated exchange supports operator→agent direction (`ReferralLead.source_type: "Estate Sale Company Owner"`, agent matching).
- Houszu handoff of a real-estate need: ✆ pre-launch only (see §8). Attribution and client-authorization recording: `referral_source_*`/`referred_*` preserve attribution; **client authorization to share is NOT currently captured for outbound referrals** (no SaleClientDecision type for "authorize introduction") — see §22/§24 note and Part 61.

## 11. SHARED TRANSITION STATUS / PRIVACY (Parts 15, 23–25, 62)

**Verdict: ↔ CORRECTLY ABSENT today (by privacy design); coordination updates ＋ P2.**

- There is NO mechanism by which another professional receives milestone information — and that is currently the SAFE state: no partner portal, no shared records, no external access. A referral creates no grant of any kind (verified: no permission/membership writes in the referred-out flow; Contact RLS stays operator-private; nothing links a referrer to a sale).
- Milestone sharing (REFERRAL RECEIVED / CLIENT CONTACTED / CONSULTATION SCHEDULED / SALE SCHEDULED...) to a referring professional would be a NEW outbound channel → classify **＋ P2**, with mandatory minimum-necessary payload (client name, preferred contact, general need, property city ONLY), explicit client authorization, per-milestone recipient, and history. **Do not assume the referrer has a right to updates merely because they referred** — no such default exists today, correctly.
- Client-CONTACTED confirmation to a referrer: today achievable as a manual email/Activity note; structured milestone sharing is P2.

## 12. DIGITAL REFERRAL LINKS / QR (Parts 17–19)

**Verdict: ✓ exists for SIGNUP attribution; ＋ BUILD for partner-attributed seller intake. Critical distinction.**

- Existing: `generateReferralQR` (`?ref=<last-8-of-userId>` → ReferralLanding → subscription signup attribution; rewards via `Referral` entity), `ReferCompany` (`/CompareEstateSales?ref=<full userId>` + client-side QR canvas). These are marketing/signup links. Inconsistencies found: QR code = last-8 of ID while ReferCompany link uses the FULL ID; `ReferralLanding` resolves codes by listing all users (see P0-B).
- **A professional partner cannot currently receive a link that pre-attributes a future SELLER INQUIRY to them.** The bridge (`sellerInquiryBridge`) already accepts `professional_referral` + `referral_source_type/name/contact`, so the backend half exists — the missing half is the attributed public intake URL (per-partner token → pre-populated referral source → safe attribution stored, client never sees internal attribution).
- QR of that attributed link: ↔ reuse the existing QR pattern (generateReferralQR / client-side `qrcode`); do not build a new QR subsystem. ✕

## 13. REFERRAL INTAKE → CHAPTER 10 CRM (Parts 20–21)

**Verdict: ✓ EXISTING (certified); △ only for the agent-exchange seam.**

- Chapter 10 inquiry bridge preserves original referral, date, client need, referring professional (source fields + provenance + `inquiry_source_record_id`), and deterministically seeds "Respond to seller inquiry" with the 4-hour speed-to-lead grace — all verified in the Chapter 10 certification sweep. Part 20's "Client Introduction record" is ↔ the Chapter 10 deal + provenance; ✕ ClientIntroduction entity.
- Immediate follow-up next action for professional referrals: ✓ same deterministic seed (an appropriate first action exists); a more specific default ("Contact referred client") is a copy-level △ enhancement at most.
- The compensated agent exchange's ReferralLead does NOT seed a Chapter 10 next action — flagged in §9/§32.

## 14. REFERRAL ACKNOWLEDGMENT / FOLLOW-UP (Parts 22, 31, 36, 63)

**Verdict: △ ENHANCE (drafting); ✓ backbone exists.**

- Acknowledgment today: manual — operator records an Activity/communication against the deal (DealCommsPanel, certified) and/or emails via existing send paths (SendEmail with consent guard for platform users; operator's own email outside the platform). No partner acknowledgment template, no AI draft, no automated send (automation correctly absent).
- Relationship follow-up for professionals: `Contact.next_follow_up` (date) + `Activity` + operator notes exist ✓. Chapter 10's full next-action machine is deal-scoped; **do NOT copy seller-opportunity fields wholesale onto Contact** — the smallest truthful model is Contact's existing `next_follow_up` + Activity, optionally surfaced in a small "professional follow-ups" view. ✕ second reminder system.

## 15. REFERRAL OUTCOMES (Part 26)

**Verdict: ✓ EXISTING (inbound) / △ ENHANCE (outbound experience).**

- Inbound referral outcome rides Chapter 10's outcome model: completed (WON), lost (+structured reason), referred (directed elsewhere), nurture (future opportunity) — verified. No second status model needed. ✕
- Outbound (referred-TO provider): stage=referred + `referred_reason` records the decision, but there is no structured "what happened after" (provider engaged / client declined / provider unavailable / problem reported). Smallest model: additive outcome fields on the deal's referred block or a structured note convention — see §18.

## 16. REFERRAL HISTORY (Part 27, 65)

**Verdict: ✓ QUERYABLE from canonical data; ✕ no history entity. △ no per-contact view.**

- REFERRALS FROM a professional: every deal with `referral_source_contact_id = X` (plus inquiry provenance). REFERRALS TO a professional: every deal with `referred_to_contact_id = X`. Date/client/service/outcome/status all live on the deal. LeadSourcePerformance already aggregates referrer-level volume/conversion/revenue.
- What does NOT exist: a per-Contact "relationship history" UI and outbound experience accumulation (§18). Queryability ≠ UI — both directions are honest about that.

## 17. SOURCE → REVENUE (Parts 28, 66)

**Verdict: ✓ EXISTING and certified.**

- LeadSourcePerformance groups by `referral_source_contact_id || referral_source_name`, reports inquiries → consultations → proposals → agreements → completed → revenue with UNKNOWN as its own category. Contact-linked professional referral sources participate correctly (verified live: referrer-level rows rendered with revenue). No duplication needed. ✕

## 18. CLIENT EXPERIENCE / RELIABILITY HISTORY (Parts 29–30, 56)

**Verdict: ＋ BUILD (small, private). No public ratings — correctly none.**

- Today: `referred_reason` + deal notes are the only place client-reported provider experience can live (unstructured).
- Smallest truthful model: on the referred-out block, additive structured outcome (engaged / chose them / declined / unavailable / problem) + optional client-experience note (clearly an observation, not a rating) — all operator-private by existing deal RLS. Accumulate as history via queries (§16); **structured reliability scoring is NOT necessary at this stage** — history/events first. ProviderDirectory's public `rating/review_count` is platform-directory data, not operator intelligence, and is covered by P0-A's write-access concern.

## 19. RELATIONSHIP REMINDERS — covered in §14. ✓ minimal backbone exists; △ view; ✕ new system.

## 20. NETWORK GAPS (Parts 32, 50)

**Verdict: ＋ P2. Data does not exist yet (professional profiles), so gap analysis cannot exist.** Honest classification: once §2/§3 land, coverage queries ("cleanout provider in this county?", "which categories have no provider?") are deterministic filters (Part 64). AI gap analysis (repeated needs without providers) is P2 and must not be claimed.

## 21. PROFESSIONAL RESOURCES (Parts 33–35, 44–46)

**Verdict: ✓ EXISTING (content), ↔ reuse; ✕ no new CMS.**

- Life-transition hub pages (Probate, Pre-Probate, Executor, Trustee, Heir, Downsizing, Moving, Inherited Property, Foreclosure, Divorce, Assisted Living), LearnHub, EstateChecklist + ChecklistDownloadForm + ProbateChecklist, probate state/county guides, provider directory pages, EstateSaleUniversity articles, LeadMagnet downloads. A partner can be pointed at (or handed) these today.
- Educational content builder: existing AI/content systems (content-engine generators, blog/lead-magnet generators) can draft professional-facing resources — classify ✓ as existing AI capability with △ prompt work; a dedicated "Realtor guide generator" is P2 polish.
- Transition resource guide for families: ✓ content exists across the hubs; a curated single printable guide is ✎ BOOK/PRINTABLE.
- Recommended next step after the sale: ✓ human-selected via referred-out + checklists (Part 46); AI suggestions stay hedged (existing coach doctrine).

## 22. COMPENSATED REFERRALS (Parts 38–42, 59–60)

**Verdict: ✓ EXISTING as a SEPARATE, explicit channel; attribution/compensation separation is architecturally intact.**

- Ordinary professional relationship: Chapter 10 referral-source/referred-out fields carry ZERO compensation semantics — **attribution ≠ compensation is already true** in the data model. ✓
- Compensated arrangements live in the dedicated exchange: MasterReferralAgreement (per-user master) → per-deal ReferralDealAgreement (signed, IP/timestamp, percentage) → ReferralCommission (`status: pending → confirmed → paid`) → OperatorWallet (`pending_balance` vs `available_balance` vs `frozen_balance`, WalletTransaction `pending/available/completed/hold/rejected`) → withdrawal request/approval. **POTENTIAL ≠ EARNED ≠ APPROVED ≠ PAID is preserved by these distinct states** (estimated vs actual fee fields; pending vs confirmed vs paid; pending vs available balance). ✓
- Caveats (report-only): (a) no explicit "VOID/cancelled" terminal on ReferralCommission (rejected exists only at wallet-transaction level); (b) known issue B5-03 — referral exchange lacks ownership checks (standing security item, not a Chapter 11 blocker but adjacent); (c) ReferralCommission "confirmed" is operator-side bookkeeping, not a legal conclusion — wording discipline required.
- Payment Status (Part 42): as above — statuses exist; do not modify payment behavior (none was).

## 23. COMPLIANCE / LICENSING (Parts 41, 43)

**Verdict: ✓ compliance backbone exists; △ licensing flags on the professional profile.**

- ComplianceQuestion carries category, jurisdiction, provenance (source_name/type/url), `professional_review_needed`, `professional_contact_id`, `verified_by`, `last_verified_at`, and statuses RESEARCH_NEEDED / OPERATOR_VERIFIED / PROFESSIONAL_VERIFIED / AUTHORITY_VERIFIED — the Chapter 6 doctrines (QUESTION ≠ ANSWER; AI suggestion ≠ verified requirement; operator belief ≠ authoritative source; unknown ≠ no requirement) are encoded in complianceModel and were certified in Chapter 6.
- AI Compliance Navigator reuse for referral-compensation questions: ✓ architecture supports it (escalation dialog → professional Contact selection is a listed standing pre-launch dependency to confirm); AI must never declare legal/illegal/permitted — existing guard language must extend verbatim to compensation topics.
- Licensing flags (license type/jurisdiction/verification date/"professional review needed") on the professional profile: △ additive fields. EstateSalen must only surface VERIFY REQUIREMENTS — ✓ consistent with existing doctrine.

## 24. TRANSITION RESOURCE GUIDES — see §21. ✓ content; ✎ printable curation.

## 25. AI (Parts 34, 37, 49–53)

**Verdict: △–＋ P2 across the board; nothing referral-AI is live today. Grounding rails already exist.**

- AI Partner Outreach / Referral Follow-Up drafting:＋P2 — existing AI comms architecture (InvokeLLM, coach modes, brand-truth guardrail `brandTruthGuard.ts`, ai_removals transparency ledger pattern from MarketingKit) provides the grounding/no-invention rails (must not invent relationship history/referrals/credentials; no auto-send — no send path exists from drafts today, correctly).
- AI Referral Match (explainable WHY, need×location×timeline vs profile): ＋ P2 after deterministic Who-Can-Help ships. Today only filtering is possible (and even that needs Part 6).
- AI Network Gap Analysis, AI Partner Performance Review (facts vs interpretation), AI Relationship Coach ("consider whether…", never "the client needs…"), AI Transition Coach: ＋ P2/LATER. None must be claimed as existing.

## 26. PRIVACY / RLS (Parts 25, 61–62, 71)

- Contact: operator-private (created_by/assigned_to/admin only) — **no cross-company professional Contact leakage.** ✓
- Referred-out / referral-source links create NO record access for the professional: they are plain string ID references readable only under deal RLS (operator/team/admin). No partner, referrer, or professional gains any read of EstateSale, SaleScope, SaleAuthority, SaleClientDecision, settlement, notes, inventory, access plans, or documents. ✓ **P0 clean.**
- Minimum-necessary boundary (Part 62): no defined shareable-context payload exists today — because no sharing channel exists (§11). When built (P2), define the allow-list explicitly (client name, preferred contact, general need, property city) and keep the deny-list out by construction.
- Client authorization to introduce (Part 61): no dedicated capture for outbound referrals — smallest model: a SaleClientDecision (decision_type 'general'/'other') recording authorization for the introduction, or a simple confirmation in the referred-out flow. △ P1 candidate (paired with §18).
- Customer.io / marketing consent: inquiry capture never grants marketing consent (Chapter 10 doctrine, enforced in bridge); consentGuard opt-out model + IdentityActivityOutbox for all production activity. ✓ No referral flow leaks consent.
- Findings P0-A / P0-B stand (platform directory, public-page user listing) — both outside the operator referral path, both pre-existing.

## 27. REFERRAL TRUTH-CHAIN MATRIX

**INBOUND (professional → operator):**

| Link | Status | Carrier |
|---|---|---|
| PARTNER | ✓ | Contact (roles + referral_source_contact_id) |
| → REFERRAL / INTRODUCTION | ✓/△ | Chapter 10 inquiry bridge provenance (`inquiry_source_type: professional_referral`, source record, received_at); △ attributed link |
| → CLIENT | ✓ | deal client fields + client_contact_id |
| → CRM OPPORTUNITY | ✓ | SaleConversionPipeline (certified) |
| → NEXT ACTION | ✓ | deterministic seed (certified) |
| → CONSULTATION | ✓ | stage + consultation_date |
| → PROPOSAL / AGREEMENT | ✓ | SaleProposal/SaleAgreement snapshots (Ch 9) |
| → SALE / REVENUE | ✓ | EstateSale + actual_revenue mirror |
| → OUTCOME | ✓ | completed/lost/nurture (structured) |
| → ATTRIBUTION → REVENUE REPORT | ✓ | LeadSourcePerformance by referrer (certified) |
| → COMPENSATION (only if contracted) | ✓ separate | ReferralDealAgreement/Commission/Wallet |

**OUTBOUND (operator → provider):**

| Link | Status | Carrier |
|---|---|---|
| CLIENT NEED identified | ✓ | operator judgment / referred_service taxonomy |
| PROVIDER MATCH | ✕ | no Who-Can-Help search (P1) |
| CLIENT AUTHORIZATION | △ | not captured (P1 candidate) |
| INTRODUCTION recorded | ✓ | stage=referred + referred_* (certified) |
| → OUTCOME after introduction | △ | unstructured (referred_reason/notes only) |
| → EXPERIENCE HISTORY | △ | no structured client-experience record (P1) |
| → BETTER FUTURE MATCH | ✕ | depends on profile + experience layers |

**Broken transitions:** OUTBOUND match, outbound outcome/experience, inbound exchange→Chapter-10 alignment, partner-attributed link. Everything else holds.

## 28. ATTRIBUTION VS COMPENSATION — see §22. ✓ Separated by architecture. Referral source fields carry no payment semantics; compensation requires signed per-deal agreement. Preserve; do not conflate.

## 29. NETWORK COVERAGE MATRIX (Part 64 — queryability only)

| Question | Answerable today? | After P1 profile fields? |
|---|---|---|
| Cleanout provider in this county? | ✕ (only platform network by state) | ✓ (filter) |
| >1 Realtor option here? | ✕ | ✓ (filter returns all) |
| Who handles jewelry? | ✕ | ✓ (category filter) |
| Who handles senior moves? | ✕ | ✓ |
| Which categories have no provider? | ✕ | ✓ (category ∩ empty) |
| Per-referrer revenue? | ✓ already (report) | ✓ |

No artificial exclusivity exists anywhere (Part 8 ✓); ProviderRoutingRule has an `exclusive_until_date` concept but that is platform routing, not operator-book exclusivity.

## 30. CHAPTER 10 REUSE / REGRESSION (Part 67)

- Reusable and intact: inquiry bridge ✓, source provenance ✓, seeded next action ✓, owner ✓, Needs Action/Overdue/Stale ✓, Nurture/Referred/Lost ✓, first meaningful response ✓, source-to-revenue ✓, conversion funnel ✓ (all freshly certified end-to-end).
- Regression risks for any Chapter 11 build: (1) do not add a second lead/deal record for professional referrals — ✕; (2) bridging the agent-exchange into Chapter 10 must map attribution without rewriting bridge provenance semantics; (3) any professional-profile fields must not leak into public projections (follow ClientTestimonial/CaseStudy precedent); (4) referred_* snapshot semantics (name preserved even if Contact changes) must be preserved in any history UI.

## 31. READY-TO-USE TOOLS (all 24)

| # | Tool | Classification |
|---|---|---|
| 1 | Referral partner intake form | ＋ P1 (attributed intake link reusing bridge) |
| 2 | Professional partner profile | △ ENHANCE Contact profile layer (P1) |
| 3 | Service-area worksheet | ✕/＋ — interactive profile fields replace a static worksheet |
| 4 | Partner qualification checklist | ✎ BOOK (chapter content) — profile limitations fields carry the live data |
| 5 | Referral-network gap worksheet | ✕ static — becomes coverage query (P2) |
| 6–9 | Realtor/attorney/senior-move/cleanout introduction emails | ＋ P2 AI drafts (grounded, no auto-send); manual today |
| 10 | Professional follow-up templates | ＋ P2 (Activity/next_follow_up backbone exists) |
| 11 | Client referral form | ↔ Chapter 10 referred-out flow (✓ better than a form) |
| 12 | Digital referral link | ＋ P1 (attribution seam exists; link does not) |
| 13 | Partner QR handout | ↔ reuse existing QR pattern once #12 exists |
| 14 | Referral acknowledgment | △ P1/P2 (manual Activity today; draft template small) |
| 15 | Referral outcome record | ↔ Chapter 10 outcomes (✓); outbound outcome △ |
| 16 | Client experience follow-up | ＋ P1 small (structured outbound outcome fields) |
| 17 | Professional relationship review | ✕ static / P2 (history is queryable §16) |
| 18 | Compensated-referral checklist | ✓↔ existing compliance/question architecture (Ch 6); ✎ book list |
| 19 | Referral agreement worksheet | ✓ EXISTING system better (MasterReferralAgreement + per-deal ReferralDealAgreement + BusinessDocument vault) |
| 20 | Disclosure checklist | ↔ BusinessDocument + PolicyAcknowledgment (✓) |
| 21 | Transition resource guide | ✎ BOOK/PRINTABLE curation of existing ✓ content |
| 22 | Life-transition checklist | ✓ EXISTING (EstateChecklist/ProbateChecklist hubs) |
| 23 | "Who Can Help?" client worksheet | ＋ P1 INTERACTIVE (the real workflow) — the book version is a stopgap |
| 24 | Partner performance review | P2/LATER (private intelligence only) |

## 32. DUPLICATION RISKS

1. **Two lead systems**: ReferralLead/ReferralDealPipeline vs SaleConversionPipeline. Chapter 10 made SaleConversionPipeline canonical for seller opportunities; the agent exchange is a legitimate compensated-deal system, but an ACCEPTED agent referral should feed (not duplicate) the operator's Chapter 10 board. P1 alignment.
2. **Three referral-link systems** (signup `Referral`, ReferCompany link, agent exchange) — an attributed partner link must reuse the Chapter 10 bridge, not add a fourth attribution model.
3. **Provider profile duplication**: CleanoutVendorProfile/ProviderDirectory vocabularies must be borrowed, not forked, for Contact profile fields.
4. **New Partner/ReferralHistory/ClientIntroduction entities**: ✕ all unnecessary (proven above).

## 33. SMALLEST RECOMMENDED ARCHITECTURE (DO NOT IMPLEMENT — awaiting authorization)

**No new entity.** The smallest Chapter 11 architecture is:

**EXISTING `Contact`** (canonical person, roles, operator-private RLS)
**＋ additive professional-profile layer** (nullable/empty = unknown): service categories (reuse/extend referred_service vocabulary), service areas (states/counties/zips/radius/exceptions), project preferences, service limitations, organization name + optional org-contact link, licensing flags (type/jurisdiction/verification date/review-needed), experience notes (separate from factual notes)
**＋ deterministic "Who Can Help?" filter** (need × category × geography over the operator's own Contacts; plain search, labeled as search)
**＋ partner-attributed seller intake link** (per-Contact token → existing public inquiry forms → bridge pre-populates referral_source_contact_id/type + professional_referral provenance; QR via existing pattern)
**＋ outbound referral outcome/experience fields** on the deal's referred block (+ optional SaleClientDecision authorization capture)
**＋ small per-Contact referral-history view** (two queries: from-contact, to-contact)
**＋ per-Contact follow-up surfacing** (reuse next_follow_up/Activity)
riding on **EXISTING Chapter 10 CRM + source-to-revenue report, unchanged.**

A narrowly scoped Referral record is NOT justified: inbound is the Chapter 10 deal; outbound is the deal's referred block; compensated is the existing exchange.

## 34. P0 / P1 / P2 / P3 / LATER ROADMAP

- **P0 (security, platform-side, report-only):** P0-A ProviderDirectory has no RLS (any authenticated user can write incl. ratings); P0-B public-page service-role user listing in ReferralLanding; plus standing B5-03 referral-exchange ownership checks.
- **P1 (core promise):** Contact professional-profile fields; Who-Can-Help filter; attributed partner link + QR pre-fill; outbound outcome/experience + authorization capture; per-contact history view; agent-exchange→Chapter-10 feed alignment.
- **P2:** AI partner outreach/follow-up drafts; acknowledgment templates; coordination milestone updates (minimum-necessary payload); coverage/gap queries + view; AI referral match (explainable); partner performance review (private); relationship reminders view.
- **P3/LATER:** AI network gap analysis; AI relationship coach; partner portal / shared transition status; compensation automation beyond existing exchange; multi-party orchestration; public provider discovery/marketplace; EstateSalen↔Houszu bidirectional contents-need routing.

## 35. BOOK TRUTH (strict list)

| Promise | Can the book say it today? |
|---|---|
| Referral Partner CRM | YES AS EXISTING-SYSTEM OUTCOME (identity/roles/attribution) — profile layer NOT YET — BUILD (P1) |
| Service Categories | NOT YET — BUILD (P1, reuse vocabulary) |
| Service Areas | NOT YET — BUILD (P1; precedent in platform systems) |
| Project Preferences | NOT YET — BUILD (P1 small) |
| Service Limitations | NOT YET — BUILD (P1 small) |
| Referral Match (filter) | NOT YET — BUILD (P1) |
| Geographic Matching | NOT YET — BUILD (P1, after areas) |
| Houszu Agent Network | COMMITTED PRE-LAUNCH (do not overstate) |
| Agent→Operator Referrals | YES AS EXISTING-SYSTEM OUTCOME (compensated exchange); Chapter-10 alignment △ |
| Operator→Agent Referrals | YES AS EXISTING-SYSTEM OUTCOME (referred-out); Houszu handoff pre-launch |
| Shared Transition Status | WORDING SHOULD CHANGE — not available; privacy-safe absence today |
| Digital Referral Link | NOT YET for partners (signup links only) — BUILD (P1) |
| Partner QR Code | NOT YET (pattern exists) — P1 with link |
| Pre-Filled Referral Source | NOT YET (bridge accepts it) — BUILD (P1) |
| Immediate Follow-Up Task | YES (deterministic seed, certified) |
| Referral Acknowledgment | YES AS MANUAL OUTCOME; templates P2 |
| Coordination Updates | NOT YET — P2 |
| Referral History | YES AS EXISTING-SYSTEM OUTCOME (queryable; UI △) |
| Conversion Tracking | YES (certified report) |
| Client Experience Notes | NOT YET — BUILD (P1 small) |
| Partner Reliability History | NOT YET — BUILD (events, not scores) |
| Relationship Reminders | YES AS EXISTING-SYSTEM OUTCOME (next_follow_up/Activity); view △ |
| Network Gaps | NOT YET — P2 |
| AI Partner Outreach | NOT YET — P2 |
| Compensation Status | YES (explicit separate channel; potential/earned/paid preserved) |
| Payment Status | YES (pending/confirmed/paid; wallet balances) — verified, unmodified |
| AI Compliance Navigator | YES AS EXISTING-SYSTEM OUTCOME (Ch 6); compensation wording must inherit doctrines |
| Transition Resource Guide | YES (content) — printable curation ✎ |
| Life Transition Checklists | YES (existing hubs/checklists) |
| AI Referral Match | NOT YET — P2 |
| AI Network Gap Analysis | NOT YET — P2 |
| AI Partner Performance Review | NOT YET — P2 |
| AI Referral Follow-Up | NOT YET — P2 |
| AI Transition Coach | PARTIAL — existing coach hedging doctrine; referral coaching NOT YET (P2) |

## 36. PRODUCT DOCTRINES — all thirteen evaluated and ADOPTED as written. Two are already enforced by architecture (attribution≠compensation; referral grants no record access). "A referral network is not a contact list" is the audit's central finding: EstateSalen has the CONTACT LIST half; Chapter 11 P1 supplies the NETWORK half.

## 37. NETWORK LEARNING LOOP — broken transitions (fix in P1/P2): provider match ✕, outbound outcome ✕, experience→history ✕, attributed link ✕, coverage learning P2. Intact: intake→CRM→sale→revenue→report (both directions of attribution).

## 38. RECOMMENDED IMPLEMENTATION SEQUENCE (not implemented)
1. Contact professional-profile fields (categories → areas → preferences/limitations → org/licensing/experience).
2. Who-Can-Help filter view.
3. Outbound outcome/experience + authorization capture + per-contact history view.
4. Attributed partner link + QR pre-fill through the bridge.
5. Agent-exchange → Chapter 10 feed alignment.
6. (P2) drafts, coordination updates, coverage analytics, AI layers.

## 39. PRE-LAUNCH DEPENDENCIES (carried forward; only Chapter-11-relevant ones are new)
- Standing: physical Item QR → camera → checkout/receipt; Ch 9 manual decision-dialog confirmation; Ch 9 closeout-warning-clearing confirmation; second-account RLS denial if outstanding; Worksheet Add Transaction click-through; Vault Expiring Soon filter; professional-escalation Contact selection (Ch 6/11-shared); SMS certification; Houszu certification; Meta access/secrets (B5-01); referral-exchange ownership checks (B5-03).
- Chapter 11 adds: P0-A ProviderDirectory RLS guard; P0-B referrer-resolution hardening — both P0-class, both platform-side, neither blocks the audit's P1 build but should precede public promotion of provider directories.

## 40. CERTIFICATION

**GO WITH CONDITIONS.**

Chapter 11's promise is substantially buildable on existing canonical architecture with NO new core entity: Contact + additive professional profile + deterministic Who-Can-Help + the certified Chapter 10 CRM and source-to-revenue chain. Conditions: (1) resolve the two P0 platform findings (ProviderDirectory write access; public-page user listing) before any provider-facing promotion; (2) implement the P1 professional-network layer through the recommended sequence with Chapter 10 regression checks; (3) keep Houszu agent-network wording pre-launch; (4) keep all AI layers as P2 with existing no-invention/no-send guardrails.

**AUDIT COMPLETE — NOTHING BUILT. AWAITING EXPLICIT AUTHORIZATION BEFORE ANY CHAPTER 11 IMPLEMENTATION.**