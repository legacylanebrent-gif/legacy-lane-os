# CHAPTER 18 — ESTATESALEN CROSS-AUDIT REPORT
## Marketing, Buyer Intelligence & Audience Compounding

Date: 2026-10-21 · Mode: **AUDIT ONLY** (no builds, no data changes, no sends, no deploys)

---

## EXECUTIVE SUMMARY

Audited ~90 book promises against the deployed application. Approximate classification:

| Class | Count (≈) |
|---|---|
| ✓ EXISTING / SUPPORTED | 41 |
| ↔ COVERED BY EXISTING SYSTEM | 12 |
| △ ENHANCE (small) | 18 |
| ＋ BUILD (genuine gap) | 9 |
| ✎ BOOK / TEMPLATE / WORDING CHANGE | 7 |
| P2 (AI capability not present) | 9 |
| LATER | 4 |
| ✕ DO NOT BUILD | 3 |

**Strongest existing architecture (do not touch):**
1. **Canonical buyer/marketing identity**: `ConsumerMarketingProfile` (explicit, separately-flagged consent: `global_marketing_opt_in`, `estate_sale_alerts_opt_in`, `vip_alerts_opt_in`, `weekly_digest_opt_in`; suppression status; interest categories; never-downgrade upsert in `submitBuyerAlertSignup`).
2. **Marketing truth guard**: `base44/shared/brandTruthGuard.ts` (sentence-level sanitizer on every kit/social AI surface) + `base44/shared/publicationPayload.ts` (allowlist-only public sale/item payloads; `excluded_from_public` photos stripped; buyer/payment fields never published).
3. **One-Click Marketing Kit** (`buildMarketingKit` + `MarketingKit` entity): per-sale canonical kit (description / social / email / SMS / QR / signs / featured), photo approval with privacy pre-filter, component statuses, AI-claim removals reported to the operator.
4. **Operator buyer-audience projection** (`buyerAudience` function + `BuyerAudience` page): operator-scoped, privacy-safe assembled cards (sign-ins, check-ins, offers, purchases, VIP, follows) with EXPLICIT-ONLY consent flags and declared interests — no new buyer database.
5. **Customer.io discipline**: direct CIO writes hard-blocked (`CIO_DIRECT_WRITES_BLOCKED`); canonical path IdentityActivityOutbox → Houszu gateway → CIO, with idempotency keys, claim-leased flush, dead-lettering, and `MarketingEngagementLog` ingesting CIO events back.

**Largest genuine gaps:**
1. **Consent guard is opt-out, not explicit** (`consentGuard.ts` returns `true` when no preference record exists) — conflicts with Chapter 18's "no implicit consent" doctrine. The *buyer-facing* surfaces (signup, buyerAudience) are explicit-only; the *app-user send paths* are not. **P0-policy finding.**
2. **No SMS delivery anywhere** (drafts exist; `sendNotification` has a TODO placeholder; Twilio secret undeclared). Book must not imply SMS sending.
3. **Buyer identity fragmentation**: `buyerAudience` keys a person by `user_id` OR normalized email — the same human appearing with user_id in one event and email-only in another yields two cards; no stitch. Email changes fragment Customer.io identity too (masterUserID resolved by email).
4. **Featured-item marketing conflict alert absent** (no warning when a promoted/featured item sells before opening).
5. **No deterministic listing-completeness check** and "One-Click Sale Listing" is not literally one click.
6. **No attendance↔campaign attribution** (CheckIn/EarlySignIn carry no source).

---

## 1. PUBLIC SALE LISTING
✓ EXISTING. Canonical public page: `src/pages/EstateSaleDetail.jsx` (live reads, shows per-item sold status) + operator websites (`Template1SaleDetail`, runtime-served) via `publicationService`/`websiteRuntimeService`, payload built ONLY by `publicationPayload.publicSale/publicItem` (dates, hours, address, categories, payment methods, parking, special notes, filtered images). `source_version` (sale+inventory signature) marks publication currentness; workflows "Publication Sync on Sale Change" / "Publication Sync on Item Change" re-sync. Buyer guide: `/SaleGuide` (Chapter 17, safe subset). Re-entry: `publishSale` / `autoPublishSales` / `assignSaleWebsiteSlug` workflow; SEO pipeline (`generateSaleSeoPage`, sitemap, robots).
Gap △: hours live inside `sale_dates[]` objects only; policies are free text (`special_notes`, `payment_methods`) — no structured policy block (see §19).

## 2. LISTING COMPLETENESS
✗ Not implemented. No deterministic check that dates/hours/location/photos/policies exist before publishing (grep found none in editor/publish path). SaleEditorFooter offers Save + Publish with no readiness gate. ➕ P1: small deterministic checklist (dates present, address city/state, ≥1 eligible photo, categories, payment methods) surfaced in editor and kit; prefer deterministic over AI.

## 3. AI LISTING / CLAIM TRUTH
✓ EXISTING, with caveats. `buildMarketingKit` generates sale description from a **facts-only JSON** (title, city/state, dates, categories, total_items, type, parking, notes, payment methods, services, featured names); every output sentence passes `sanitizeMarketingText` and removed claims are recorded in `kit.ai_removals`. `generateSocialCampaign` and `salePromotionEngine` (credit-based) also generate from sale truth with an address-reveal rule. **Verified**: no function anywhere references `research_notes` or `verified_facts` (grep across `base44/functions` = zero hits) — unverified research **cannot** silently become marketing copy (safety ✓) but verified item facts are also **not yet piped** into marketing (missed reuse, △ P1). Item-level public copy comes from operator-authored `Item.description` — human-controlled ✓.

## 4. MERCHANDISE HIGHLIGHTS
△ PARTIAL. Kit `featured` component uses `EstateSale.featured_items` (operator-entered snapshots, ≤6). Canonical `Item.featured` exists and publishes to the public payload, but is NOT surfaced into the kit or auto-highlight selection. HIGH_VALUE is never auto-published by level (✓ by omission). ➕ Small enhancement: kit build should offer operator-selected canonical Items (featured + HIGH_VALUE candidates) as highlight picks, human-chosen only.

## 5. MARKETING PHOTOS
✓ EXISTING. Kit `approve_photos` + `PhotoApprovalGrid`: photos assembled from `sale.images` with `eligiblePhotos()` privacy pre-filter (skip_item, skip/do_not_search statuses, `excluded_from_public`); approved indexes stored in `kit.approved_photo_indexes`. No re-upload required (references by URL/index) ✓. Item published photos (`Item.images`) come only through the Chapter 15 screen+approval path and are included in public payloads. Gap △: photo ORDER/hero selection not supported (approval only, no sequencing); item photos not offered in the kit workspace.

## 6. CAMPAIGN WORKSPACE
✓ EXISTING (per sale). `MarketingKit` entity is the ONE canonical workspace (component_status: not_created/draft/ready per component; drafts saved via `save_drafts`). Channel execution stays in its own systems (doctrine respected: kit never sends). △ No campaign-level scheduling/state beyond SocialPost's approval/publish/scheduling statuses — see §31/§32 (recommend NO new entity).

## 7. CHANNEL CAPABILITIES
- **PUBLIC SALE PAGE**: draft ↔, publish ✓ (operator action), schedule ✗ (not applicable), track ✓ (`WebsiteEvent`, views/saves), consent n/a. LIVE.
- **EMAIL**: draft ✓ (kit + `emailTemplates` + `EmailCampaignModal`), approval △ (operator sends; no formal approval state for email drafts), send ✓ via `sendOperatorCampaign` (followers, opt-out filter, weekly limit, `OperatorEmailQuota`, `CompanyEmailLog`) and `sendPersonalizedSaleNotifications`/`sendSaleAlertDigest`/`sendNewSaleAlerts` (consent-guarded, CIO-routed), schedule △ (CIO-side), track ✓ (`MarketingEngagementLog` ingest), consent: opt-out model (see P0 finding).
- **SMS**: draft ✓ (kit `sms_draft`), approval ✓ (same), send ✗ (no provider; TODO placeholder), schedule ✗, track ✗, consent ✓ separate flag captured (`sms_opt_in`) but unusable until a provider exists. **Draft ≠ delivery — book wording required.**
- **SOCIAL (FB/IG/LinkedIn)**: draft ✓ (`generateSocialCampaign`, `SocialPostDraft`, `SocialCampaignModal`), approval ✓ (`approval_status`, `approveSocialPost`), publish △ (`pushPostToSocialMedia` posts via operator-supplied page credentials at click time — assisted manual publish, not autonomous), schedule △ (`scheduleSocialPost` → Make webhook; `MAKE_SOCIAL_SCHEDULER_WEBHOOK_URL` not in secrets → currently fails closed 503), track △ (`refreshCampaignStats`/manual metrics on `MarketingTask`), consent n/a (public). No TikTok. **Do not claim auto-posting.**
- **PRINT/QR**: ✓ Chapter 17 PrintSigns (floor signs, zone signs, QR sheets), kit `signs` component, `qr_url` → estatesalen.com sale page. Snapshot by nature.

## 8. MARKETING CALENDAR / TASKS
△ PARTIAL. `SaleTask` (canonical sale work, assignee/due/blocked/attention) + `ai_timeline_tasks` (AI timeline generated backward from sale dates) + `MarketingTask` (already exists: per-post launch checklist — `launch_checklist`, `caption_copied`, `image_downloaded`, `posted_to_platform`, manual stats). No new MarketingTask entity needed (one exists; book's "no MarketingTask entity" instruction is moot). Pre-opening countdown surfacing (incomplete marketing work as opening approaches) ✗ ➕ P1 small: deterministic assembly of overdue marketing SaleTasks/days-to-opening in kit or dashboard.

## 9. BUYER CANONICAL IDENTITY
△ The canonical marketing person is `ConsumerMarketingProfile` (by email, optionally `user_id`; upsert never downgrades consent). Operator-side relationship records (`EarlySignIn`, `CheckIn`, `Offer`, `Purchase`, `VIPInvite`, `OperatorFollowerSubscription`) all carry user_id and/or email. `buyerAudience` merges by `keyOf(user_id) || keyOf(email)` — **fragmentation risk**: user_id-keyed and email-keyed cards for the same human do not merge; email change re-fragments. ➕ P1: identity stitching (prefer user_id, fall back email, record unresolved aliases) or a canonical `person_id` written at each event. Do NOT create a Buyer entity (✕) — fix the projection.

## 10. BUYER CRM
△ PARTIAL. `buyerAudience` detail returns a per-buyer timeline (sign-ins, check-ins, offers w/ items, purchases, VIP) + explicit interests + consent flags — a real assembled profile. Missing: purchase item/categories not aggregated (`Order.item_title` exists but not joined), inquiries (ItemMessage is marketplace-only), no per-buyer notes on operator side, attendance↔sale linkage partial (CheckIn location_id↔sale map ✓). Strict verdict: attendance ✓, purchases △, offers ✓, interests ✓, consent ✓, preference △ (NotificationPreference is app-user-side), inquiries ✗.

## 11. BUYER INTERESTS
✓ EXISTING, source-separated. DECLARED: `ConsumerMarketingProfile.interest_categories` (signup checkbox vocabulary), `BuyerIntent` (active, category/brand/era/budget/radius), `WantedItem` (public listing, `allow_dealer_contact` flag, `notified_match_ids` dedup). OBSERVED (never auto-converted to consent/interest): buyerAudience `observed.*` (offer_items etc.). Distinction is explicit in code ✓. Sources are visibly labeled ✓.

## 12. CONSENT / COMMUNICATION PREFERENCES
✓/△ SPLIT VERDICT.
- **Buyer-facing capture is explicit-only** ✓: `submitBuyerAlertSignup` requires the alerts checkbox, marketing and SMS separate and never pre-checked; existing opt-ins never downgraded.
- **`NotificationPreference`** has separate `marketing_email` / `marketing_sms` flags ✓ (consumer app-user prefs).
- **`consentGuard.ts`** (used by `sendPersonalizedSaleNotifications`, `notifyEndedSalesCleanoutOffer`, `sendOperatorSEODigest`) is **OPT-OUT**: absent records = allowed, and a transient error resolves to allowed. **P0-policy finding**: aligns with neither the doctrine nor the explicit model everywhere else. Also no provenance/timestamp on EmailPreferences flags (source not recorded) △.
- **`sendOperatorCampaign`**: followers filtered by `company_direct_emails !== false` — same opt-out model.

## 13. BUYER SEGMENTS
△ PARTIAL. No persisted segment entity. Available: buyerAudience filters (email_ok, vip, follower, interests), `NotificationPreference.sale_alert_followed_only` / `sale_alert_categories` (a real persisted per-user alert segment), `OperatorFollowerSubscription.alert_types`, CIO-side segments (`CustomerIOSegmentation`), `RetargetingAudience`. Verdict: manual query + per-user alert config = functional but not a segment engine. ➕ Small P1: saved audience filters on the existing projection (no new entity); LATER for anything more.

## 14. BUYER MATCH
△ TWO REAL SYSTEMS, BOTH OPERATOR-FACING (correctly no auto-send):
1. `matchWantedItemsToSales` (admin scheduled) + `matchWantedItemOnCreate`: WantedItem ↔ active sales/items/marketplace by text-term relevance; dedup via `notified_match_ids`; requires `allow_dealer_contact`.
2. `notifyOperatorOfMatchingBuyers(saleId)`: text-blob scoring of the whole sale vs. wanted items → notifies the OPERATOR with matched buyers (no buyer contact).
3. `buyerAudience.explicit_interests` gives the operator a manual match surface for their own audience.
Gaps: text-blob scoring is **not explainable per-item** (Part 99 ✗), purchases/categories not used as signals, no featured-item→buyer match (Part 37 ✗), no past-purchase-category query (Part 38 ✗). ➕ P1: deterministic category/interest match (explainable reasons list) over ConsumerMarketingProfile.interest_categories + BuyerIntent + buyerAudience observed offer items.

## 15. SOCIAL
See §7. `SocialPost` carries `approval_status`, `publish_status`, `platform_post_ids`, `engagement_metrics`; `SocialCampaign` groups posts w/ address-reveal rule (24h-before address disclosure enforced in generation prompt AND stored as `address_visibility_rule`). Auto-post: NOT certified (assisted manual publish only; scheduling webhook unconfigured). AI content variations: `headline_options` on SocialPost + kit prompt generates multiple platform variants ✓.

## 16. SIGNS / QR
✓ EXISTING (Chapter 17). PrintSigns (sign templates, prep-zone signs, floor signs — sold/pickup/discount/category, buyer-guide QR), kit `signs` component, `generateCartQR`, `generateReferralQR`. "ONE-CLICK SIGN PACKAGE": ✎ wording — printing is per-category clicks on one page (several actions), all local/static. Acceptable as "one-page sign package"; or one small "print all" enhancement. Sign PLACEMENT plan/checklist/removal: ✗ absent (only `prep_zones.signage_needs` free text). ➕ P1 small: sign placement notes (where signs go, restrictions) + removal tasks via existing SaleTask template at closeout (no new entity). Local rules note: ✓ reuse `site_assessment.community_restrictions` + `sale_day_restrictions` (signage/traffic rules captured at assessment; honest, no legal inference).

## 17. PRESALES / VIP
✓ EXISTING, correctly separated. Presale permission = `Item.pre_sale_allowed` (operator per-item) + deal `pre_sale_selling_enabled` (Chapter 9 commercial truth); negotiation/discount authority = Chapter 16 (`Company.negotiation_policy`, `Item.negotiation_override`). VIP/early access = `VIPEvent`/`VIPInvite`/`VIPTicket` (event access, RSVP, check-in) + `EarlySignIn` list (`EstateSale.early_sign_in_enabled`) — buyer-status/event-access/presale-permission are distinct fields, not conflated ✓.

## 18. HOLD / RESERVED / DEPOSIT
✎ BOOK WORDING MUST CHANGE. Actual Item.status: `available | pending | sold | reserved` (Chapters 15/16 audited). NO Hold, NO deposit state, NO payment-state vocabulary. `pending` is the de-facto hold-ish state (maps to inactive on channels via `syncItemStatusAcrossChannels`); `reserved` exists and is distinct in the enum but the sale-floor UI uses pending/sold primarily. Deposit: no deposit architecture (Order has `escrow_status` for marketplace only; Chapter 21 payment boundary). Recommendations: book should describe AVAILABLE / PENDING (hold/commitment) / RESERVED / SOLD / PAID & AWAITING PICKUP (payment+pickup on the transaction record) / RELEASED (pickup_completed_at) — as Item state + Offer state (pending/accepted/rejected) + payment state + pickup state, NOT eight Item statuses. Employee authority for hold/reserve/negotiate: ✓ Chapter 16 (negotiation policy + `research_override` pattern for high-stakes; no hold-specific authority level △ small).

## 19. SALE POLICIES
△ PARTIAL. Policy truth currently lives in: `EstateSale.special_notes`, `parking_info`, `payment_methods`, `discount_schedule` (Ch16 plan), `pickup_plan` (Ch13 default), `SaleScope.discount_approach` (Ch9 client-facing). Public buyer guide (Ch17 `/SaleGuide`) renders the safe subset ✓ — same fields, no stale copy (it reads the sale record). Employee view: same sale record ✓ (single source). No structured policy builder (free text) △; AI policy communication ✗ P2/template; discount rules ✓ Ch16 (excluded_from_discounts, negotiation policy).

## 20. PICKUP COMMUNICATION
✓ Chapter 17: `Item.pickup_requirements` (scheduled_required, window, additional_people, equipment, assistance, special_handling), `disassembly`, `removal_note` (internal), sale `pickup_plan` default, buyer-guide renders the safe subset, floor PICKUP signs. "Automatically send the buyer pickup instructions": ✎ wording — system STORES/GENERATES/PRINTS; it does not auto-send (and should not without consent). Moving responsibility ✓ (equipment/assistance/2-person flags = buyer-facing safe). Missed pickup △: `pickup_completed_at` absence is visible; SaleIssue category `pickup` exists for manual escalation; no auto-issue/task creation (reuse SaleTask template if wanted — P1 small). Proof of purchase→release: checkout (`CheckoutStation`, receipt) → `Transaction`/`Order` → Item sold fields → release recorded (`pickup_completed_at`, `authorized_pickup` name-only) ✓.

## 21. AVAILABILITY SYNC
- PUBLIC SALE PAGE: LIVE ✓ (EstateSaleDetail reads items; sold shown as sold).
- OPERATOR WEBSITES: LIVE-ish ✓ via "Publication Sync on Item Change" workflow + `source_version` staleness marker.
- MARKETPLACE: ✓ `syncItemStatusAcrossChannels`.
- ITEM QR: LIVE ✓ (ItemDetail reads canonical status).
- EMAIL/SMS/SOCIAL DRAFTS: SNAPSHOT by design; kit drafts carry no per-item availability re-check ✗ (see conflict alert).
- SENT EMAIL / PUBLISHED SOCIAL / PRINTED: STATIC (inherent). ✎ Book must state external sent content cannot be updated.
- MARKETING CONFLICT ALERT ✗ ABSENT: no warning when a featured/promoted item sells before opening or before future campaign use. ➕ P1: deterministic check in kit/publish path (featured item sold/unavailable → warn "remove/update from campaign material").

## 22. MARKETING TRUTH GUARD
✓ EXISTING and small. Current guard set: `brandTruthGuard` (credentials/superlatives/money/volume/testimonials regexes + sentence removal), `publicationPayload` allowlists, `eligiblePhotos` privacy filter, Chapter 15 photo screen (analyzeItemImage, fail-safe), verified-facts human approval boundary, address-reveal rule for social. Missing from guard: item-specific hype words (RARE / AUTHENTIC / MUSEUM QUALITY / ANTIQUE / SIGNED) ✗ → P2 (AI Hype Check) or extend regex list △; date-conflict/draft-consistency check ✗ P2; sale-representation review (photo mix vs actual categories) ✗ P1 checklist / P2.

## 23. COMPANY / SELLER / REFERRAL MARKETING
✓ Company identity: `loadBusinessIdentity` (Company first, legacy fallback) feeds pages, templates, kit (`business.name`), signs, emails. ✓ Seller inquiry CTA: `SellerInquiryForm` → `submitWebsiteLead`/`submitPublicWebsiteLead` → `bridgeInquiryToDeal` (canonical pipeline; attribution `inquiry_source_type`). ✓ Professional referral: `Contact.partner_referral_token` → `resolvePartnerReferral` → `ReferralLanding` → attributed inquiry (Chapter 10/11 attribution preserved). ✓ Completed-sale portfolio: `SaleCaseStudy` + `saleCaseStudies` function + `CaseStudies` page (public-safe, operator-approved). Post-sale seller follow-up: ✎ precise meaning = nothing automatic today; operator CRM next_action can carry it (reuse; no build).

## 24. ATTRIBUTION
△ PARTIAL. Captured: seller-side `referral_source_type/name` + `inquiry_source_type` (enums, consistent), `WebsiteEvent.utm_*` + referrer + hostname→tenant (buyer website attribution ✓), `MarketingEventLog`/`MarketingEngagementLog` (CIO delivery/opens/clicks with campaign ids), `OperatorFollowerSubscription.source_page`. Missing: attendance/source at CheckIn/EarlySignIn ✗ (no "how did you hear" / campaign ref), QR scans not attributed to a campaign (QRs point to pages, page views tracked via WebsiteEvent on operator sites; estatesalen.com sale-page views via `views`) △, social engagement only via manual refresh △. Campaign engagement metrics EXIST for email (CIO webhook ingest) and website; NOT for social auto-tracking; SMS n/a. **Do not claim social engagement if not integrated** — manual refresh only.

## 25. MARKETING COST
△ PARTIAL. `Expense` (category, amount, sale_id, receipt; reimbursable via SaleClientDecision Ch6), `LaborEntry` (marketing-relevant categories), `EstateSale.email_campaign_price` / `sms_campaign_price` / `national_featured_price` / `local_featured_price` (advertising spend snapshots), `Campaign.budget/spent/revenue` (legacy entity, partially used), `MarketingCampaignPerformance` refresh. Campaign-level cost attribution: ✗ weak (spend fields are sale-scoped, not campaign-scoped). AI marketing review (cost vs outcomes) ✗ P2. Category performance (channel↔category↔attendance↔purchase) ✗ LATER (no attribution chain).

## 26. BUYER HISTORY
- Attendance history ✓ (EarlySignIn + CheckIn per user; buyerAudience `sales_attended` count + timeline).
- Purchase history △ (Purchase/Order carry buyer_id; categories not aggregated; buyerAudience counts only).
- Inquiry history △ (Offer timeline ✓ as strongest signal; ItemMessage marketplace-only; no estate-sale item-inquiry record beyond offers — **note: an unanswered offer IS captured buyer intelligence** ✓ per doctrine).
- Engagement profile: ✓ ASSEMBLED VIEW EXISTS (`buyerAudience` detail) — no new derived entity needed ✕.

## 27. AUDIENCE GROWTH
△ buyerAudience `totals` (audience / email_eligible / sms_eligible / vip / followers) exist today as a point-in-time count; `CustomerIOReportingCenter` gives CIO-side trends. No time series of consented buyers/repeat attendees in-app ✗. ➕ Small P1: store a daily snapshot row (reuse pattern exists: `CentralRepositoryDailySnapshot`) or accept LATER. No vanity percentage ✓.

## 28. AI
- AI Listing Draft ✓ (kit, guarded). AI Social ✓ (drafts, address rule, human approval). AI Email ✓ (kit + CIO orchestration). AI SMS draft ✓ / send ✗. Short-form video: ✓ scripts exist (`generateYoutubeRecapScript`, `WeeklyVideoBatch` — recap-oriented; sale-preview script from highlights △ template). AI Hype Check ✗ P2. AI Campaign Coach ✗ P2 (PrepCoach/AiStagingCoach are prep-side, not campaign moments). AI Audience Builder ✗ P2 (buyerAudience is deterministic projection — good base). AI Policy Communication ✗ P2/template. AI Accuracy Check ✗ P2. AI Marketing Review ✗ P2. AI Next-Sale Match ✗ P2/LATER. AI content variations ✓ (headline_options; same facts, materially different drafts).

## 29. READY-TO-USE MARKETING TOOLS (all 35)
1 Sale listing template — INTERACTIVE SYSTEM ALREADY BETTER (public page + payload)
2 Sale description worksheet — INTERACTIVE (kit description + facts input)
3 Merchandise-highlight worksheet — SMALL ENHANCEMENT (canonical Item picks into kit)
4 Marketing photo checklist — EXISTING (approval grid + eligibility)
5 Photo sequencing guide — SMALL ENHANCEMENT (order field on approved photos)
6 Marketing accuracy checklist — GENUINE GAP P1 (deterministic pre-publish check)
7 Sale representation review — P2 (checklist P1 optional)
8 Email campaign templates — EXISTING (emailTemplates + kit)
9 SMS templates — EXISTING AS DRAFTS (no send — wording)
10 Social post templates — EXISTING (generateSocialCampaign/SocialPost)
11 Short-form video scripts — EXISTING (recap engine; sale-preview variant △)
12 Marketing calendar — EXISTING (SaleTask + timeline; countdown △)
13 Campaign task sheet — EXISTING (MarketingTask launch checklist; SaleTask for sale work)
14 Buyer-interest form — INTERACTIVE (signup interest categories + BuyerIntent)
15 Email consent form — INTERACTIVE (signup; explicit checkbox)
16 SMS consent form — INTERACTIVE (flag captured; unusable until provider)
17 Buyer-segment worksheet — SMALL ENHANCEMENT (saved filters on buyerAudience)
18 Featured-item promotion sheet — SMALL ENHANCEMENT (item-linked highlight + conflict alert)
19 Presale policy — EXISTING (Item.pre_sale_allowed + deal flag)
20 VIP access policy — EXISTING (VIPEvent/Invite/Ticket + EarlySignIn)
21 Hold/reservation policy — WORDING (pending/reserved; no Hold entity)
22 Deposit form — DO NOT BUILD (no payment truth; Ch21 boundary)
23 Advance-offer form — EXISTING (Offer, item_id-linked, pre-opening allowed by flags)
24 Sale policy sheet — SMALL ENHANCEMENT (structured policy block vs free text)
25 Discount-policy sheet — EXISTING (discount_schedule + negotiation policy Ch16)
26 Pickup policy — EXISTING (pickup_plan + Ch17)
27 Buyer pickup instructions — EXISTING (buyer guide + signs; not auto-sent — wording)
28 Directional signs — EXISTING (sign templates incl. Upstairs/Downstairs/Basement)
29 Sale-property signs — EXISTING (PrintSigns)
30 QR sale flyer — EXISTING (kit qr_url + QR sheets)
31 Sign-placement worksheet — GENUINE GAP P1 (notes + removal tasks)
32 Sign-removal checklist — GENUINE GAP P1 (SaleTask template at closeout)
33 Marketing-source tracker — GENUINE GAP P1 (attendance source capture; taxonomy exists to reuse)
34 Post-sale campaign review — P2 (metrics partially exist; no review workflow)
35 Buyer-community growth report — SMALL ENHANCEMENT (snapshot trend from buyerAudience totals)

## 30. DO-NOT-REBUILD (confirmed reuse list)
EstateSale · Item (+photo_library privacy, verified_facts/research firewall) · categories · Item.featured · price/availability · Offer · Purchase/Order/Cart/Transaction · CheckIn · EarlySignIn · VIPEvent/VIPInvite/VIPTicket · ConsumerMarketingProfile · EmailPreferences · NotificationPreference · OperatorFollowerSubscription · BuyerIntent · WantedItem · SaleClientDecision (discount/client authorization) · SaleTask · MarketingTask · SaleTask timeline/ai_timeline_tasks · MarketingKit · SocialCampaign/SocialPost/SocialPostDraft · Campaign (legacy, careful) · PrintSigns + Ch17 floor signs · QR functions · SaleGuide (buyer guide) · pickup architecture (Ch13/17) · seller inquiry pipeline (submitWebsiteLead→bridgeInquiryToDeal) · referral attribution (partner_referral_token, referral_source_*) · Expense · LaborEntry · Customer.io outbox (identityActivityOutbox → Houszu gateway) · MarketingEngagementLog/MarketingEventLog · WebsiteEvent · publicationPayload/publicationService/website workflows · brandTruthGuard · consentGuard · buyerAudience · SaleCaseStudy/ClientTestimonial (portfolio) · OperatorService catalog · site_assessment restrictions (local rules).

## 31. NEW ENTITY TEST
**No new entity is justified by this audit.**
- MarketingCampaign? ✕ — `MarketingKit` (per-sale workspace, component statuses) + `SocialCampaign`/`SocialPost` (approval/publish/scheduling states) + `Campaign` (legacy metrics) already cover campaign state. A new entity would duplicate.
- BuyerInterest? ✕ — `ConsumerMarketingProfile.interest_categories` + `BuyerIntent` + `WantedItem`.
- BuyerSegment? ✕ — saved filters over `buyerAudience` projection suffice (P1 enhancement); `NotificationPreference.sale_alert_*` already persists per-user alert segmentation.
- CampaignMessage? ✕ — kit drafts + SocialPost + CIO messages cover it.
- Buyer? ✕ — identity fix belongs in the projection/stitching, not a new entity.

## 32. SMALLEST RECOMMENDED ARCHITECTURE (NOT IMPLEMENTED)
1. **P0-policy**: make `consentGuard`/`sendOperatorCampaign` explicit-consent or documented-opt-in aligned (read ConsumerMarketingProfile flags as primary; keep suppression).
2. P1: deterministic listing-completeness + kit accuracy pre-checks (dates/address/photo/categories/policies + featured-item-still-available warning).
3. P1: buyer identity stitching in buyerAudience (user_id-first, email fallback, merge alias cards; record unresolved).
4. P1: deterministic explainable Buyer Match (interest_categories + BuyerIntent + observed offer items → reasons list; audience export only).
5. P1: attendance source capture (small field on CheckIn/EarlySignIn from a controlled taxonomy; reuse inquiry_source_type vocabulary).
6. P1: sign placement notes + removal SaleTask template; structured sale-policy block; saved audience filters; photo ordering; audience-growth daily snapshot.
7. P2: hype-check regex/AI extension; campaign coach; accuracy check; marketing review.
Nothing else. No new entities.

## 33. INTERFACE / DATA / WORKFLOW / PERMISSION GAPS
- Interface: no marketing readiness/countdown surface; no photo ordering UI; no saved segments UI.
- Data: buyer fragmentation key; purchase categories unlinked; attendance source absent; EmailPreferences lacks provenance/timestamp; featured-items are snapshots not Item links.
- Workflow: no sign-removal closeout template; no auto-issue for missed pickup; scheduling webhook unconfigured (fails closed — acceptable); `publishSocialPost` intentionally 501.
- Permissions: social publish/schedule admin-gated ✓; buyerAudience operator-scoped ✓; pushPostToSocialMedia requires operator's own credentials ✓ (verify credentials never stored — they are request-scoped ✓).

## 34. P0 / P1 / P2 / P3 / LATER
**P0 (policy/truth):** (1) consentGuard opt-out model vs no-implicit-consent doctrine (buyer surfaces are explicit; app-user send paths are not). (2) Confirmed-safe (no P0 found): photo privacy ✓, research firewall ✓, private-field allowlists ✓, operator-scoping ✓, CIO dedup/idempotency ✓, live public availability ✓, public payload safety ✓.
**P1:** listing completeness check; featured-item conflict alert; buyer identity stitching; explainable deterministic buyer match; attendance source; sign placement/removal; structured policies; saved segments; photo ordering; kit item-highlights from canonical Items; audience snapshot growth; missed-pickup task template.
**P2:** AI hype check; AI campaign coach; AI audience builder; AI policy communication; AI accuracy check; AI marketing review; sale representation review; post-sale campaign review.
**LATER:** social OAuth auto-posting; cross-channel orchestration; attribution modeling; predictive targeting; lookalikes; category performance causality; AI next-sale match.
**DO NOT BUILD:** Buyer/segment/interest/campaign entities; deposit state (Ch21 boundary); auto-send pickup emails; social auto-post claims; 8-state Item vocabulary.

## 35. BOOK TRUTH (every promise, compressed)
One-Click Sale Listing — WORDING (publish is one action, but listing readiness + kit are separate; "one-click publish" true, "one-click listing" overstated).
AI Listing Draft — YES (existing system, guarded).
Merchandise Highlights — YES WITH SMALL ENHANCEMENT.
Sale Overview — YES AS EXISTING-SYSTEM OUTCOME (volume/variety from facts; hype-guarded).
Listing Completeness Check — NOT YET, BUILD P1 (deterministic).
Specificity-First — YES AS EXISTING-SYSTEM OUTCOME (categories/featured/dates; item-level detail is operator copy).
Verified Item Details — YES AS EXISTING-SYSTEM OUTCOME (human boundary; marketing reuse manual — small enhancement).
Uncertainty Protection — YES (verified: no research leakage path).
Category Highlights — YES (categories in facts/prompt).
AI Hype Check — P2 (partial regex guard exists).
Marketing Photo Library — YES.
Featured Photo Selection — YES (approval); Photo Sequence — SMALL ENHANCEMENT.
Representation Check — P2/checklist.
Photo Privacy Guard — YES (P0-grade, verified).
Marketing Campaign Builder — YES (kit).
AI Social Posts — YES drafts; auto-post NOT claimed.
AI Email Campaign — YES (draft + CIO orchestration + consent-guarded sends).
AI SMS Drafts — YES; SMS delivery — NOT YET (no provider).
Short-Form Video Script — YES (recap-oriented; preview variant small enhancement).
QR Sale Link — YES.
Marketing Calendar — YES (timeline/tasks); Countdown — P1 small.
Campaign Tasks — YES (MarketingTask + SaleTask).
AI Campaign Coach — P2.
Final Accuracy Review — P1 (checklist; today operator reviews drafts manually).
Buyer CRM — YES AS EXISTING-SYSTEM OUTCOME (buyerAudience; strict gaps noted).
Buyer Interests — YES (source-labeled).
Buyer Segments — SMALL ENHANCEMENT (saved filters).
Email Consent — YES (explicit at capture; guard model P0-policy finding).
SMS Consent — YES captured / channel unusable.
Communication Preferences — YES (NotificationPreference/EmailPreferences; preference≠consent respected).
Buyer Match — PARTIAL (wanted-item + audience; deterministic explainable match P1).
Category Alerts — YES AS EXISTING-SYSTEM OUTCOME (sale_alert_categories + alert digests, consent-guarded); automated item-category→buyer alert NOT claimed.
Featured Item Alerts — NOT YET (P1, operator-facing list).
Past Buyer Matching — NOT YET (P1 query).
AI Audience Builder — P2.
Sale Announcement / Category Spotlight / Featured Item Posts / Final Reminder — YES drafts (salePromotionEngine sections incl. final reminder).
Sale Preview Video — SMALL ENHANCEMENT (template).
AI Content Variations — YES.
One-Click Sign Package — WORDING (one-page, several prints).
Sign Placement / Checklist / Removal — NOT YET, P1.
Local Rules Note — YES (site_assessment fields).
Presale Policy — YES.
VIP Access — YES (distinct from presale).
Advance Offer Tracking — YES (item-linked offers).
Live Availability — YES on live surfaces.
Marketing Conflict Alert — NOT YET, P1.
Standard Item Statuses — WORDING (4 statuses; map manuscript terms to item/offer/payment/pickup states).
Hold Expiration — NOT YET (no hold); Reserved distinct in enum.
Employee Authority — YES (Ch16 negotiation; hold-specific levels not modeled — wording).
Buyer Confirmation — PARTIAL (offers/notes/issues; no structured commitment record — small enhancement or wording).
Status History — YES (Activity item history Ch15; custody chain; price history via changeItemPrice).
Sale Policy Builder — SMALL ENHANCEMENT (structured block).
Buyer-Facing Policies — YES (buyer guide reads same truth).
Employee Policy View — YES (same record).
Discount Rules — YES (Ch16).
AI Policy Communication — P2.
Pickup Requirements — YES (Ch17).
Pickup Scheduler — PARTIAL (windows/plan; no calendar scheduler — LATER).
Moving Responsibility — YES (Ch17 fields).
Proof of Purchase — YES (checkout→transaction→release path).
Pickup Instructions — YES generated/printed; "automatically send" — WORDING.
Missed Pickup Workflow — SMALL ENHANCEMENT (issue/task template).
Availability Sync — YES on live; static external content cannot update — WORDING.
Claim Verification — YES (verified).
Human Approval — YES (no autonomous public publishing; admin gates).
Company Identity — YES.
Seller Inquiry Link — YES.
Professional Referral Link — YES.
Completed Sale Portfolio — YES (case studies).
Post-Sale Seller Follow-Up — WORDING (means: operator CRM next-action; nothing automatic).
Marketing Source Tracking — PARTIAL (seller + website + utm; attendance source P1).
Attendance Attribution — NOT YET (P1 source field).
Campaign Engagement — PARTIAL (email+website real; social manual; be honest).
Category Performance — LATER.
Marketing Cost Tracking — PARTIAL (sale-scoped spend; campaign attribution weak).
AI Marketing Review — P2.
Attendance/Purchase/Inquiry History — YES/PARTIAL/PARTIAL (see §26).
Buyer Engagement Profile — YES (assembled).
Audience Growth Dashboard — SMALL ENHANCEMENT.
AI Next-Sale Match — P2/LATER.

## 36. MARKETING TRUTH MATRIX
| Truth | Canonical source |
|---|---|
| SALE DATES / HOURS | EstateSale.sale_dates |
| ADDRESS | EstateSale.property_address (public via publicSale) |
| POLICIES | EstateSale.special_notes/parking_info/payment_methods + SaleScope.discount_approach (△ structured block) |
| CATEGORIES | EstateSale.categories; Item.category |
| FEATURED ITEMS | EstateSale.featured_items (snapshot) △ + Item.featured (canonical) |
| ITEM FACTS | Item.verified_facts (approved) — marketing reuse manual today |
| ITEM PRICE | Item.price (via changeItemPrice) |
| ITEM AVAILABILITY | Item.status (live) |
| PHOTOS | sale.images (+privacy flags) / Item.photo_library→images (screened) |
| DISCOUNTS | EstateSale.discount_schedule + Item.excluded_from_discounts |
| PRESALE RULES | Item.pre_sale_allowed + deal pre_sale_selling_enabled |
| PICKUP RULES | EstateSale.pickup_plan + Item.pickup_requirements |
| BUYER IDENTITY | ConsumerMarketingProfile (+user_id) |
| BUYER INTEREST | interest_categories / BuyerIntent / WantedItem |
| EMAIL CONSENT | ConsumerMarketingProfile flags + EmailPreferences (△ provenance) |
| SMS CONSENT | ConsumerMarketingProfile.phone + sms_opt_in / NotificationPreference.marketing_sms |
| ATTENDANCE | EarlySignIn / CheckIn |
| OFFERS | Offer (item_id-linked) |
| PURCHASES | Purchase / Order / Transaction |
| MARKETING SOURCE | inquiry_source_type / referral_source_* / WebsiteEvent.utm_* (△ attendance source absent) |

## 37. BUYER IDENTITY MATRIX
| Event | Identifiers | Canonical person | Consent effect | Interest effect | History effect | Gap |
|---|---|---|---|---|---|---|
| PUBLIC SIGNUP | email | ConsumerMarketingProfile upsert | explicit flags, never downgraded | interest_categories | profile | none material |
| VIP RSVP | user_id/email (VIPInvite) | via profile lookup | none | none | vip_events count | stitch gap |
| ATTENDANCE | user_id (EarlySignIn) / created_by_id (CheckIn) | via user_id | none | none | sales_attended | no source field |
| ITEM INQUIRY | ItemMessage (marketplace only) | from/to user ids | none | implicit (unused) | messages | estate-sale inquiries not captured |
| OFFER | user_id or email/name | buyerAudience card | none | observed offer_items | timeline | email-only offers fragment |
| PURCHASE | buyer_id | user-scoped | none | not aggregated | count only | category aggregation absent |
| EMAIL ENGAGEMENT | consumer_email/user_id | MarketingEngagementLog→profile | none (logs) | none | CIO metrics | none (CIO-side) |
| SMS ENGAGEMENT | — | — | — | — | — | no provider |

## 38. CHANNEL CAPABILITY MATRIX
| Channel | Draft | Approval | Send/Publish | Schedule | Track | Consent req | Support |
|---|---|---|---|---|---|---|---|
| PUBLIC PAGE | n/a | operator publish | ✓ | n/a | ✓ views/WebsiteEvent | n/a | LIVE |
| EMAIL | ✓ kit | △ operator | ✓ CIO/platform | △ CIO | ✓ engagement log | yes (opt-out guard — P0 finding) | WORKING |
| SMS | ✓ kit | ✓ | ✗ | ✗ | ✗ | yes (separate) | DRAFT ONLY |
| FACEBOOK | ✓ | ✓ approved | △ assisted (operator creds) | ✗ webhook unconfigured | △ manual | n/a | PARTIAL |
| INSTAGRAM | ✓ | ✓ | △ assisted | ✗ | △ manual | n/a | PARTIAL |
| LINKEDIN | ✓ | ✓ | △ assisted | ✗ | ✗ | n/a | PARTIAL |
| PRINT/QR | ✓ | operator prints | ✓ local | n/a | n/a | n/a | WORKING (snapshot) |

## 39. BUYER MATCH MATRIX
| Signal | Available | Reliability | Explainable | Consent impact | Support |
|---|---|---|---|---|---|
| DECLARED CATEGORY | ✓ (profile/Intent/Wanted) | high | ✓ | none | manual surface + wanted-item match |
| INQUIRY | △ marketplace only | medium | ✓ | none | partial |
| OFFER | ✓ (operator-recorded) | high | ✓ item list | none | buyerAudience observed |
| PURCHASE | ✓ records | high | ✓ | none (not consent) | count only — no category join |
| ATTENDANCE | ✓ | low for interest | ✓ | none | observed counts |
| VIP | ✓ | low | ✓ | none | flag |
| PAST CAMPAIGN ENGAGEMENT | △ CIO events | medium | △ | none | log only |

## 40. AVAILABILITY MATRIX
| Surface | Live/Snapshot | Updates on sale? | Stale risk | Support |
|---|---|---|---|---|
| PUBLIC SALE PAGE | LIVE | ✓ | low | ✓ |
| ITEM QR→ItemDetail | LIVE | ✓ | low | ✓ |
| OPERATOR WEBSITE | LIVE via sync workflow | ✓ (source_version marker) | medium if workflow lag | ✓ |
| EMAIL/SMS/SOCIAL DRAFT | SNAPSHOT | ✗ (no re-check — conflict alert P1) | medium | △ |
| SENT EMAIL | STATIC | ✗ (inherent) | high | inherent |
| PUBLISHED SOCIAL | STATIC | ✗ (inherent) | high | inherent |
| PRINTED FLYER/SIGN | STATIC | ✗ (inherent) | high | inherent |

## 41. CONSENT MATRIX
| Action | Email consent | SMS consent | Can market? | Provenance |
|---|---|---|---|---|
| RSVP (VIP) | ✗ | ✗ | ✗ | none recorded (correct) |
| ATTENDANCE | ✗ | ✗ | ✗ | none (correct) |
| PURCHASE | ✗ | ✗ | ✗ | none (correct) |
| INQUIRY | ✗ | ✗ | ✗ | none (correct) |
| EXPLICIT EMAIL OPT-IN | ✓ | ✗ | email only | signup checkbox + timestamp (ConsumerMarketingProfile) |
| EXPLICIT SMS OPT-IN | ✗ | ✓ | sms only (channel not live) | signup checkbox |
| UNSUBSCRIBE | blocked via prefs/suppression | — | ✗ | EmailPreferences/CIO suppression (✎: Customer.io suppression syncs INTO profile via webhook ingest ✓) |
| SMS STOP | ✗ no provider | n/a | n/a | — |
Guard caveat: consentGuard default-allow on missing records (P0-policy finding); buyerAudience flags are explicit-only (correct).

## 42. SALE A → SALE B TRACE (vintage records)
Buyer RSVPs Sale A (no consent effect ✓) → attends (CheckIn, user_id ✓) → asks about records (no estate-sale inquiry record — only an Offer would capture; GAP 1) → purchases records (Purchase ✓ but category not stored — GAP 2) → email consent ✓ (profile flag) → SMS consent ✗ (correctly excluded). Sale B has records: WantedItem/buyerAudience interests can surface the buyer to the OPERATOR (✓ manual), a deterministic category match does NOT exist yet (GAP 3), email eligibility ✓ via buyerAudience email_ok, SMS exclusion ✓ (sms_ok false), campaign selection ✓ via sendOperatorCampaign/alert digests (with the opt-out caveat). Explainability of match ✗ today (GAP 4). Broken seams: (1) inquiry capture, (2) purchase-category, (3) deterministic match, (4) explainability, (5) identity stitch, (6) consentGuard default.

## 43. FEATURED ITEM TRACE
Verified Item (verified_facts approved) → operator marks featured (Item.featured / sale.featured_items) → approved photo (Ch15 screen+approval → images) → kit/campaign draft (facts+photo ✓, no research leak ✓) → public page (publicItem allowlist, featured flag ✓) → buyer inquiry/Offer (item_id-linked ✓) → item sells pre-opening (status→sold; live surfaces update ✓) → public availability correct ✓ → FUTURE CAMPAIGN WARNING ✗ ABSENT (kit draft still references it; no alert) — P1. Static sent email/social/flyer cannot update (inherent; book wording).

## 44. CAMPAIGN TRACE
Sale truth → kit build (facts + eligible photos + guard) ✓ → listing (public page via publish) ✓ → email draft ✓ → SMS draft ✓ (no send) → social draft ✓ → human approval (SocialPost approval; kit never sends) ✓ → delivery: email ✓ (consent-guarded, quota/weekly-limited), social △ assisted, SMS ✗ → engagement (CIO log + website events; social manual) △ → attendance (no attribution link ✗) → purchase ✓ → post-sale review ✗ (metrics exist; no workflow). Re-entry points: kit build action; publish; per-channel execution. Unsupported steps: SMS send, scheduling webhook, attendance attribution, auto social publish.

## 45. CUSTOMER.IO TRACE
EstateSalen canonical identity (User masterUserID, resolved by id or email — never guessed) → IdentityActivityOutbox (idempotency request_id, canonical event registry, registry_gap quarantine with no payload stored, consent_context carried, claim-leased flush, retry/backoff, dead-letter, orphan-token release) → Houszu v1.6.0 gateway → Customer.io Person. Direct CIO writes hard-blocked in code ✓. Failure: IdentitySyncError + dedup functions + DedupKillSwitch. Inbound: customerioWebhookIngest → MarketingEngagementLog (delivery/open/click with campaign ids; suppression ingested). Privacy: no codes/credentials/private deal fields in events (canonicalContract enforced). Gaps: email-change fragmentation of masterUserID resolution; CIO enabled flag/keys present but gateway-side delivery is Houszu-dependent (known B2-02 dependency). NOT MODIFIED ✓.

## 46. PRODUCT DOCTRINES (verdicts)
CREATE SALE TRUTH ONCE ✓ (kit/publication reuse). MARKETING WITHOUT REDISCOVERY ✓ (facts JSON). SPECIFICITY> HYPE ✓ (guard). UNVERIFIED RESEARCH STAYS INTERNAL ✓ (verified no path). PUBLIC USES APPROVED PRIVACY-SAFE INFO ✓. REACH PEOPLE WITH REASON TO CARE △ (wanted-item/interest match exists; deterministic match P1). EMAIL≠SMS CONSENT ✓ (separate flags). INTEREST≠PURCHASE ✓ (observed vs explicit labeled). ATTENDANCE≠PURCHASE ✓. INQUIRY IS INTELLIGENCE ✓ (offers captured; estate-sale inquiry record △). NO PROMISING SOLD MERCHANDISE △ (live surfaces ✓; conflict alert P1). EVERY SALE BUILDS NEXT AUDIENCE ✓ architecture (profile/interests/history), △ tooling. ATTRIBUTION REPORTS WHAT IS KNOWN ✓ (no invented ROI found). AI DRAFTS, HUMANS APPROVE ✓.

## 47. AUDIENCE COMPOUNDING LOOP
SALE ✓ → BUYER DISCOVERY ✓ (events captured) → CONSENT ✓ explicit (guard caveat) → INTEREST ✓ declared+observed → ATTENDANCE ✓ → INQUIRY △ → OFFER ✓ → PURCHASE ✓ → HISTORY △ (fragmentation/category) → SEGMENT △ (saved filters P1) → NEXT-SALE MATCH △ (P1 deterministic) → NEXT CAMPAIGN ✓ (kit reuse). Broken transitions: inquiry capture, identity stitch, deterministic match, segment persistence, attendance attribution.

## 48. RECOMMENDED IMPLEMENTATION SEQUENCE (NOT IMPLEMENTED)
P0-policy → P1a (completeness + conflict alert + identity stitch) → P1b (deterministic match + attendance source + segments) → P1c (signs placement/removal, policies, photo order, growth snapshot, highlights) → P2 batch → LATER.

## 49. PRE-LAUNCH DEPENDENCIES (carried + new)
Carried: cross-company RLS manual verification; photo-access security verification; Meta webhook secrets (B1-02/B5-01); Houszu identityResolve deployment (B2-02); public directory PII exposure remediation. New from Ch18: consentGuard model decision; social scheduler webhook configuration or removal of scheduling UI; SMS provider decision (or remove send-implying wording); buyer identity stitch before relying on audience history.

## 50. CERTIFICATION

# **GO WITH CONDITIONS**

Conditions:
1. Resolve the consentGuard opt-out/default-allow policy before any broad consumer marketing send (explicit-consent alignment or a documented, operator-visible opt-in basis).
2. Book wording changes: One-Click Sale Listing, One-Click Sign Package, "automatically send pickup instructions", SMS delivery, Item status vocabulary (no HOLD/DEPOSIT), static external content cannot update, social "assisted manual publish" (never auto-post).
3. P1 list above (completeness check, featured-item conflict alert, identity stitching, explainable match, attendance source) before Chapter 18 is claimed "true" in the manuscript.
4. Do NOT create Buyer/Segment/Campaign entities; reuse the systems in §30.

AUDIT COMPLETE — NO BUILDS PERFORMED, NO DATA MODIFIED, NO MESSAGES SENT, NO INTEGRATIONS ALTERED. STOP. Awaiting explicit authorization for Chapter 18 P1 or Chapter 19.