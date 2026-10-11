# ESTATESALEN / LEGACY LANE OS → LEGACY LANE SALES
## Targeted Canonical Sale, Feed, Identity & Publication Architecture Audit
### EstateSalen Side — READ-ONLY (no code, data, config, or workflow was modified)

Audit date: 2026-10-11 · Auditor: Base44 (read-only investigation) · Evidence: live code, live data, live URLs

---

## ⚠️ CORRECTION TO THE PRIOR PHASE 7D.3 REPORT (found during this audit)

One synthetic record from the Phase 7D.3 certification was previously misclassified as a "real production record" and left in place:

- `EstateSale` id `6aca1cb87ecd3477e20d3abe`, title **"CERT7D3-SYNTHETIC-DO-NOT-CONTACT"**, created 2026-10-10 11:08:40, status draft, 0 items/images.
- Its related `IdentityActivityOutbox` record (`sale_created`) is also still present (status `retrying`, attempts 1).

This audit is read-only, so **neither was deleted**. They are the only two Phase 7D.3 residue records that remain. Recommend deleting both (by exact ID) in a subsequent write-enabled turn.

---

# PART 1 — VERIFICATION OF LLS AUDIT CLAIMS

| # | LLS Claim | EstateSalen-side verdict |
|---|---|---|
| 1 | `legacy-lane-os-0c72fcc7.base44.app` returns 404 "App not found" | **CONFIRMED.** Live fetch returns `{"error_type":"HTTPException","message":"App not found"}` |
| 2 | One live EstateSalen-origin sale exists in LLS, "Come and Get IT!", id `os_69b0584...` | **CONFIRMED.** Sale exists: id `69b058479d65ca9487ea8e2e` |
| 3 | `business_id = lls-legacy-lane-estates-llc`, `estatesalen_company_id = null` | **EXPLAINED** (Part 8): EstateSalen has no standalone company entity and never transmits a company ID to any destination |
| 4 | LLS holds 27 inventory rows for the sale, none with `source_key` | **CONSISTENT.** EstateSalen has **0** `Item` rows for this sale; it has **27** `images[]` entries on the sale itself (Part 15) |
| 5 | LLS reconciliation engine never successfully ran | **STRUCTURALLY CONFIRMED.** EstateSalen's feed provides no `source_key`, no `updated_since`, no cursor, no tombstones (Parts 12–13) |

---

# PART 2 — ACTUAL ESTATESALEN APPLICATION IDENTITY

| Item | Value (verified) |
|---|---|
| Internal Base44 app name | **"Legacy Lane OS"** — still set in `base44/config.jsonc` (never renamed internally) |
| Public/rebranded name | EstateSalen / EstateSalen.com (used throughout UI, emails, system pages) |
| Application ID | `69471382fc72e5b50c72fcc7` (visible in media URLs; NOT a secret) |
| Builder/operator user | `69471383fc72e5b50c72fcc8` (Brent Cramp, `company_name: "Legacy Lane"`, role admin, primary_account_type `estate_sale_operator`) |
| Current production URL | **https://estatesalen.base44.app** — verified live (full public storefront renders) |
| Custom domain | **estatesalen.com** (configured platform-side; system emails and brand theme resolve to it) |
| Old URL | `legacy-lane-os-0c72fcc7.base44.app` — DEAD. The `0c72fcc7` fragment = **last 8 characters of the app ID** (`…e5b50c72fcc7`); the slug prefix was the app's original name "legacy-lane-os" |
| Backend function base | `https://estatesalen.base44.app/functions/<functionName>` (platform-served) |
| App status | Published, live, serving real traffic |

**Root cause of the dead URL (Part 11):** the application was **renamed/re-published** (Legacy Lane OS → EstateSalen). The Base44 subdomain was regenerated from the new name; the old-name subdomain no longer resolves. This is **stale LLS configuration + application rename**, not infrastructure failure, not unpublished, not a domain change of the underlying app ID.

---

# PART 3 — ALL LEGACY LANE / FEED / SYNDICATION INTEGRATION CODE

Searches performed (case-insensitive): `legacy lane`, `legacy-lane`, `lls`, `os_`, `syndicat*`, `website feed`, `operator website`, `white-label`, `microsite`, `feed`, `reconcile`, `synchronization`, `partner API`, `destination`, `channel`, `publication`, `publish`.

### ACTIVE

| Component | What it is |
|---|---|
| `base44/functions/saleDataFeed/entry.ts` (104 lines) | **REST pull feed.** POST + `api_key` body auth (CompanyApiKey). Returns FULL snapshot: all sales + all items for one operator. CORS `*`. No pagination, no `updated_since`, no tombstones. **No access logging — pulls leave no trace.** |
| `base44/functions/pushSaleDataWebhook/entry.ts` (112 lines) | **Push feed.** Full snapshot POSTed to each `CompanyApiKey.webhook_url` with header `X-LegacyLane-Api-Key`. Triggered by workflows, or manually from the ApiKeyManager UI. Writes `last_push_at`/`last_push_status` back. |
| `base44/functions/receiveSaleUpdate/entry.ts` (187 lines) | **Reverse write-back receiver.** api_key auth. Events: `item_status_update`/`item_sold` (updates Item + auto-creates a `Transaction` at a hardcoded 80/20 split), `sale_update` (whitelisted sale fields, validated enums), `sale_view` (increments `views`). |
| `src/pages/ApiKeyManager.jsx` | Operator-facing UI: generates/manages `CompanyApiKey` records, documents pull URL, manual "push now" button, reverse-webhook docs. |
| `base44/workflows/Push Sale Data on Change.jsonc` | Entity trigger: EstateSale **create/update** → `pushSaleDataWebhook` |
| `base44/workflows/Push Sale Data on EstateSale Change.jsonc` | Same trigger, duplicate implementation (both migrated from a legacy automation) |
| `base44/workflows/Push Sale Data on Item Change.jsonc` | Entity trigger: Item create/update → `pushSaleDataWebhook` |
| `base44/entities/CompanyApiKey.jsonc` | The only outbound-channel registry that exists: `operator_id`, `operator_name`, `api_key`, `webhook_url`, `webhook_enabled`, `is_active`, `last_push_at`, `last_push_status`. |

### DORMANT / UNUSED RIGHT NOW

- The push workflows are live but effectively **no-ops**: the single `CompanyApiKey` record (operator `69471383…fcc8`, created 2026-04-25) has `webhook_url: null`, `webhook_enabled: false`, `last_push_at: null` — the push feed has **never fired successfully to anyone**.
- `syncToBCRise`, `testBCRiseValidation`, `bcRiseValidationReport`, `testBCRiseDeduplication` — a parallel BCRise sync experiment using `llos_test_*` source-record ids ("llos" = Legacy Lane OS). Data-push pattern, dormant.
- `phase7dProbe` — Houszu certification probe (unrelated to LLS).

### NOT FOUND ANYWHERE IN ESTATESALEN

- The string `os_` as an identifier prefix — **not generated by EstateSalen**.
- Any `source_key` generation for inventory.
- Any "Legacy Lane Sales" / `lls-legacy-lane-estates-llc` business id.
- Any publication / destination / channel abstraction for sale data.
- Any tombstone, deletion log, or sync-cursor concept.

---

# PART 4 — THE REAL SOURCE SALE

| Field | Verified value |
|---|---|
| Canonical EstateSalen sale ID | `69b058479d65ca9487ea8e2e` |
| Title | **"Come and Get IT!"** |
| Operator | "Legacy Lane" (`operator_id` `69471383fc72e5b50c72fcc8` = builder user) |
| Created | 2026-03-10T17:43:35Z |
| Last updated | 2026-06-14T10:22:05Z |
| Status | `completed` |
| Item records | **0** (`Item` rows with `estate_sale_id` = this sale: none) |
| Images | **27** (image objects with names like "Gorgeous Signed Pottery Glazed Pitcher - Etsy", hosted on `base44.app` public storage) |
| Views | 49 |
| SEO | `seo_slug: null`, `indexed_status: not_submitted` — never SEO-published |
| Ever sent to LLS? | **Unverifiable by design.** `last_push_at` is null on the only API-key record, so no push ever succeeded. The **pull** feed logs nothing. If LLS obtained this sale through EstateSalen, it was via an authenticated **pull** of `saleDataFeed` (labeled inference — the pull leaves no audit trail). |

---

# PART 5 — THE `os_` IDENTIFIER — RESOLVED

**`os_69b0584...` is NOT an EstateSalen identifier. It is an LLS-generated representation that embeds the EstateSalen canonical sale ID.**

- EstateSalen canonical ID: `69b058479d65ca9487ea8e2e`
- LLS identifier: `os_69b0584...`
- Transformation: **`os_` (LLS-side namespace prefix, "os" = Legacy Lane OS origin) + the EstateSalen sale ID (at minimum its leading 7+ characters).**
- EstateSalen code contains zero occurrences of `os_` as an ID prefix (only unrelated substrings like `ll_os_subscriber` and `llos_test_*`).
- Conclusion: EstateSalen has no `os_` vocabulary. The mapping lives entirely on the LLS side: `os_<estatesalen_sale_id>`.

---

# PART 6 — CANONICAL SALE ENTITY

**Entity: `EstateSale`** (`base44/entities/EstateSale.jsonc`)

- Primary key: platform `id` (stable)
- Company/operator: `operator_id` (User ID) + denormalized `operator_name`
- Title / description / sale_type (16-type enum) / status
- Address: `property_address{street, city, state, zip, region, formatted_address}`; `location{lat,lng}`
- Dates/hours: `sale_dates[{date, start_time, end_time}]`
- Status lifecycle: `draft → upcoming → active → completed → archived` — **no `cancelled` state** (receivingSaleUpdate also validates only these five)
- Timestamps: `created_date`, `updated_date` (platform-managed)
- Publishing fields: `seo_title`, `seo_description`, `seo_slug`, `seo_keywords`, `schema_json`, `indexed_status`, `ai_summary`
- Visibility/promotion: `premium_listing`, `national_featured`, `local_featured`, `local_featured_until`, `promoted_to_all_users`
- Media: `images[]` — **each image object carries name, description, url, thumbnail_url, price, categories, rotation, synopsis, skip flags, AI price suggestions**. In current operator behavior the `images[]` array IS the de-facto inventory.
- Deletion/archive: `status: archived`; no hard-delete tombstone concept

**Answer: YES — EstateSale is the canonical owner of a sale, and EstateSalen already behaves internally as the canonical source** (it is the only place sales are created/edited; every consumer receives copies).

---

# PART 7 — CANONICAL INVENTORY MODEL

**Entity: `Item`** (`base44/entities/Item.jsonc`)

- Primary key: platform `id` (stable, immutable)
- Sale FK: `estate_sale_id`
- Seller: `seller_id`, `seller_name`
- Fields: `title`, `description`, `category`, `subcategory`, `condition`, `price`, `original_price`, `quantity`, `sku`, `barcode`, `tags[]`, `images[]`, `fulfillment_options[]`, `featured`, `status` (availability incl. sold), `marketplace_item_id`, `marketplace_display_status`, views/saves/rating
- POS/QR: `barcode`, `sku` (used by ScanAndCart / checkout flows)

**Suitable for external publication? YES — platform IDs are stable and immutable, and the feed already exposes them. BUT: in current production behavior (Legacy Lane's own sales) inventory is NOT stored as `Item` rows — it is stored as `sale.images[]` entries.** The 27 "inventory items" in LLS correspond to the 27 image objects, not to `Item` records. This is a critical structural fact for the migration decision (Part 15).

---

# PART 8 — COMPANY / OPERATOR IDENTITY (Legacy Lane)

| Question | Answer |
|---|---|
| Canonical company/operator ID? | **No dedicated company entity exists.** Company identity is **denormalized fields on the `User` record** (`69471383fc72e5b50c72fcc8`): `company_name: "Legacy Lane"`, `company_logo_url/logo_dark/logo_light`, `business_phone: 732-939-0600`, `business_address: 49 Cherry Tree Farm Rd, Middletown, NJ 07748`, `company_email`. `company_website`, `company_description`, `company_tagline`, `years_in_business` are **null**. |
| Entity containing it | `User` (primary). `MasterOperatorDirectory` (for scraped third-party operators) has **no** Legacy Lane record — it is a scraping artifact store, not the canonical registry. |
| Is the ID stable? | The User ID is stable. There is no separate "Company" object whose ID could serve as a tenant key. |
| Transmitted to LLS? | Only **implicitly**: the feed payload includes `operator_id` and `operator_name` at top level. EstateSalen never sends a "company ID" concept. |
| Does EstateSalen know `lls-legacy-lane-estates-llc`? | **NO** — zero occurrences anywhere. |
| Cross-app identity mapping? | None (except the unrelated Houszu identity outbox for consumers). |
| Hardcoded mapping? | No. |
| Email/name/domain-based mapping? | No. |
| Can `EstateSalen Company ID ↔ Website Tenant ID` become 1:1? | **YES, but first EstateSalen must promote company identity from denormalized User fields into a first-class Company entity (or accept User ID as the company key).** The one existing candidate registry is `CompanyApiKey` (one row per operator → outbound channel), which already pairs a stable operator key with a destination. |

---

# PART 9 — SALE CREATION AUTHORITY

Inventory of sale-creation paths:

1. **Operator UI** — `SaleEditor` / `CreateEstateSaleModal` (primary path)
2. **Admin UI** — `AdminEstateSales`
3. **Imports** — `ImportedSale` entity + `ImportedSalesDashboard` (scraped/imported sales)
4. **Cloning** — sale cloning in operator tooling
5. **Backend functions** — `onSalePublished` (post-publish orchestration), `receiveSaleUpdate` `sale_update` event (**external sites CAN patch sale fields via reverse webhook — including `status`**)
6. **Automations** — `Auto-Complete Expired Sales (Daily)` flips statuses automatically; `Sale Status Change Notifications`

**Does EstateSalen expect downstream apps to create independent sale copies?** There is no explicit architecture comment, but the implementation answers it: `receiveSaleUpdate` exists precisely so external sites can **write back into the canonical record** (sold status, sale edits, view counts) — i.e., EstateSalen was designed as canonical owner with a write-back channel, NOT as a peer that accepts independently-created sales. LLS's mirrored-copy model diverges from EstateSalen's actual design intent.

---

# PART 10 — CURRENT OUTBOUND FEEDS (complete)

| # | Feed | Auth | Shape | Pagination | Updated-since | Deletion | Versioning | Active usage |
|---|---|---|---|---|---|---|---|---|
| 1 | `saleDataFeed` (POST pull) | Static `api_key` (CompanyApiKey, per-operator) | Full snapshot: operator + all sales + all items | None | None | None (status field only) | None | **Unknown (no logging)** — the only mechanism that could have served LLS |
| 2 | `pushSaleDataWebhook` (push) | Static `api_key` in `X-LegacyLane-Api-Key` header | Full snapshot per push event | None | None | None | None | **Never fired** (`webhook_url: null`) |
| 3 | Public pages (`EstateSaleDetail`, marketplaces, SEO pages, sitemap) | Public | Rendered/SEO | n/a | n/a | n/a | n/a | Live |
| 4 | `saleDataFeed` companion: `pushSaleDataWebhook` Houszu side (identity outbox) | Service token | Canonical identity events only — **not sale data** | n/a | n/a | n/a | **v1.6.0 contract** | Live, certified |

**Feed intended for LLS:** the CompanyApiKey pull/push pair (LLS-facing by design — header literally named `X-LegacyLane-Api-Key`, and ApiKeyManager instructs operators to hand the pull URL + key to "their website").

---

# PART 11 — ENDPOINT FAILURE VERDICT

**Root cause: APPLICATION RENAMED / RE-PUBLISHED.**

Evidence chain:
1. `base44/config.jsonc` → `"name": "Legacy Lane OS"` (internal name unchanged).
2. Old URL `legacy-lane-os-0c72fcc7.base44.app` → live fetch: **"App not found"**.
3. Current URL `estatesalen.base44.app` → live fetch: full storefront renders.
4. `0c72fcc7` = last 8 chars of the unchanged app ID (`69471382fc72e5b50c72fcc7`) → **same application**, different published slug. The rename changed the subdomain; the old one was not retained as a redirect.
5. Classification: **stale LLS configuration following an application rename.** No repair performed (per instructions).

---

# PART 12 — CURRENT FEED CONTRACT (the LLS feed)

**Design: SNAPSHOT COPYING. Full stop.**

Sale schema exposed: `id, title, description, status, sale_type, sale_dates[], address, location, images[] (full objects incl. per-image price/categories), categories[], payment_methods[], special_notes, total_items, estimated_value, created_date, updated_date`.

Item schema exposed: `id, title, description, price, original_price, category, subcategory, condition, status, images[], quantity, sku, tags[], fulfillment_options[], created_date, updated_date`.

Company schema exposed: `operator_id`, `operator_name` only.

- IDs: canonical EstateSalen platform IDs
- Source keys: **none** (no source_key, no external mapping field)
- Version fields: **none**
- Update timestamps: `updated_date` only (no `last_modified` semantics contract)
- Deletion indicators: **none** (no tombstones; only status enum, which lacks even `cancelled`)
- Publication status: implicit via `status`
- Media URLs: permanent public `base44.app` URLs (hot-linkable)

---

# PART 13 — DELTA / RECONCILIATION SUPPORT

EstateSalen provides to a reconciler:

| Capability | Present? |
|---|---|
| `updated_since` | NO |
| version / sequence / cursor / sync token | NO |
| `source_key` | NO |
| tombstone / `deleted_at` / `archived_at` | NO (only `status: archived/completed`) |
| ETag/hash | NO |
| Access log of what was delivered | NO (pull is unlogged) |

**Conclusion: LLS's fail-closed reconciliation engine cannot run against EstateSalen's actual contract — there is nothing for it to reconcile against. The mismatch is total, not partial.** (This is why a repaired URL alone would not make reconciliation work.)

---

# PART 14 — SOURCE KEY ARCHITECTURE

EstateSalen **does not generate or expose a source key for inventory**. The identifiers available and already exposed in the feed are:

- Item: canonical platform `id` (stable, unique — suitable) plus optional `sku`/`barcode`
- Sale: canonical platform `id`
- Company: `operator_id` (User ID)

LLS's expected `source_key` was never part of EstateSalen's contract. The correct join key was always the canonical EstateSalen ID; `os_<id>` on the LLS side is its derived form. Any future contract should declare `source_key = estatesalen.<entity>.<platform_id>` explicitly.

---

# PART 15 — THE 27 INVENTORY ITEMS

| Measure | EstateSalen | LLS (per their audit) |
|---|---|---|
| Inventory records | **0** `Item` rows | 27 rows |
| Image entries | **27** `sale.images[]` objects | — |

**Interpretation:** LLS's 27 inventory rows mirror the sale's 27 image objects (each image object carries a name and price — item-like). EstateSalen itself renders the public sale gallery from `images[]`, not from `Item` rows. Alternative reading (labeled speculation): LLS pulled at a time when `Item` rows existed and they were later removed; no evidence supports this, and `total_items: 0` on the sale supports the images-as-inventory reading.

**LLS copy classification: STALE** (source last updated 2026-06-14; LLS feed target dead; reconciliation impossible by design).

---

# PART 16 — SALE EDIT PROPAGATION

When a sale is edited, EstateSalen today:

1. **Push workflows fire automatically** (EstateSale create/update and Item create/update → `pushSaleDataWebhook`) — which then deliver a **full snapshot to every registered webhook URL** — currently none.
2. **Public pages/SEO re-derive** on next render (plus explicit pipelines: `Generate Sale SEO Page on Publish`, `Nightly Sale Image SEO Enrichment`, `Process Item SEO on Sale Update`).
3. **No delta records, no event journal for sale data, no consumer polling support** (no cursor/updated_since).
4. Deletion/cancellation/completion changes propagate only through the same full-snapshot push — **or not at all** if the consumer only pulls.

**Mechanism: consumer polling or push-snapshot; nothing incremental.**

---

# PART 17 — DELETE / CANCELLATION CONTRACT

**There is no tombstone contract.** External consumers learn of removals only by:

- `status` transitions (`completed`, `archived`) inside a full snapshot, or
- the record's absence from the next full snapshot (only if the consumer diffs entire snapshots).

There is no `deleted_at`, no cancellation status (`cancelled` is not even a valid EstateSale status — a gap in its own right), no deletion event feed. **Stale operator websites are structurally guaranteed under the current design.**

---

# PART 18 — PUBLICATION CONCEPT SEARCH

What exists that resembles `Sale → Publication → Destination`:

| Concept | EstateSalen equivalent | Fit |
|---|---|---|
| Sale → Publication → Destination (websites) | **Nothing** for sale data | MISSING |
| Event → Outbox → Destination (identity) | `IdentityActivityOutbox` + `canonicalContract.ts` v1.6.0 → Houszu (durable queue, retries, idempotency, contract validation, worker leases, dead-lettering, hourly flush workflow) | **EXISTS — proven publication-engine pattern, wrong domain (identity events, not sale/inventory)** |
| Operator → API key → destination | `CompanyApiKey` (+ ApiKeyManager UI, push workflows) | **PARTIALLY EXISTS — the destination registry skeleton, snapshot-push only** |
| Sale → SEO publication | `generateSaleSeoPage`, `SEOPage`, `submitPageToIndex`, `SEOIndexLog`, sitemap engine | EXISTS (in-app SEO only) |
| Sale → social/email publication | `SaleMarketingTrigger`, campaign engine, `sendNewSaleAlerts` | EXISTS (in-platform channels) |

**A publication abstraction has NOT begun for sale data — but the architectural pattern (outbox + destination + contract version) already exists and is certified in the Houszu integration. Do not invent a new pattern; extend this one.**

---

# PART 19 — CURRENT PUBLIC SALE EXPERIENCE

- Public route: `/EstateSaleDetail?id=…` (plus SEO pages via `generateSaleSeoPage`)
- Sale detail page: map, dates, address, gallery, search-over-images, favorites (localStorage), save-to-wanted (`WantedItem` create), route planner integration
- Inventory gallery: **rendered from `sale.images[]`** (each image = a displayable "item" with name/price/categories)
- Public item pages: `MarketplaceItemDetail` (marketplace items — separate entity from sale inventory)
- SEO: `seo_title/description/slug/keywords`, `schema_json` (JSON-LD), `indexed_status`, sitemap, GSC submission
- Social metadata: SEOHead component
- Company branding: operator name/logo on detail page
- RSVP/VIP: VIPEvent/VIPInvite flows; offers: `Offer`/`BidRequest`; favorites: `Watchlist`/localStorage; lead capture: `EstateTransitionLeadForm`, contact modal, early sign-in

**Operational vs presentation:** operational truth lives in entities; presentation is largely derived at render time. No presentation layer is stored per-destination.

---

# PART 20 — WEBSITE-RELATED FEATURES (existing)

| Feature | Status |
|---|---|
| Company public profile | EXISTS — `CompanyProfilePage`, `OperatorProfile`, `CompanyLanding`, `BusinessProfile` (self-serve editor) |
| Operator directory listing | EXISTS — `EstateSaleCompanyDirectory`, `BrowseOperators`, `StateOperators` |
| Website URL field on company | EXISTS as data (`website_url`, `company_website` — currently null for Legacy Lane) |
| Website builder / microsite / white-label / hosted site | **DOES NOT EXIST** |
| Theme/branding settings | PARTIAL — logos, company name, tagline fields exist; no theme engine |
| API-key "your website" integration | EXISTS — ApiKeyManager explicitly supports "your website can pull our data and push updates back" (the LLS pattern, generalized per operator) |

---

# PART 21 — MULTI-TENANT FOUNDATION

- Canonical tenant: **`User`** with `primary_account_type` (estate_sale_operator, reseller, vendor, agent, consumer, …) + `role` (admin/user)
- Isolation: platform RLS per entity (`created_by_id`, `data.operator_id`, `data.seller_id` patterns) — ownership enforced at the data layer
- Sale ownership: `EstateSale.operator_id`; inventory ownership: `Item.estate_sale_id` + `seller_id`
- Roles/permissions: `PageAccess` per account type; team memberships (`ManageTeam`, `PendingTeamInvite`, `SaleTeamSection` — sale-level team sharing)
- Geographic permissions: territory model exists for agents (`AgentTerritoryApplication`, `OperatorTerritoryProfile`) — not for operators' web presence
- **Verdict: the tenant model (operator-owned records + RLS + role gates) is sound and could become the authority for operator websites, but "tenant" currently means "User", not "Company".**

---

# PART 22 — WEBSITE TENANT IDENTITY

Existing structures that map to `company_id → site_id → domain`:

- `company_id` → **partial**: `User.id` for operators (no Company entity); `CompanyApiKey.operator_id`
- `site_id` → **missing** (closest: `CompanyApiKey.id` — a per-operator channel row)
- `domain` → **missing**

**Equivalent structures do not fully exist; the gap is small and well-defined (one Company/Site entity), not architectural.**

---

# PART 23 — CUSTOM DOMAIN READINESS

- In-app search for `custom_domain`, `hostname`, DNS, SSL, host routing: **nothing** (the only `hostname` hit is a URL-cleaning utility in email enrichment).
- Custom domains exist only at the **platform level** (EstateSalen's own estatesalen.com), not as a per-tenant feature.
- **Verdict: no custom-domain infrastructure exists for tenants.** Provisioning would be platform-side configuration plus a tenant-domain field — not impossible, just absent.

---

# PART 24 — BRAND PROFILE READINESS (auto-population score)

From the operator `User` record and related entities, already stored today:

| Data | Present? |
|---|---|
| Company name | ✅ ("Legacy Lane") |
| DBA / tagline | ❌ (null) |
| Logo | ✅ (logo_dark, logo_light URLs; company_logo_url null but logos resolved) |
| Phone | ✅ |
| Email | ✅ |
| Address | ✅ (structured street/city/state/zip) |
| Service area | ✅ (`OperatorTerritoryProfile`, territory_ids) |
| About / description | ❌ (null) |
| Team | ✅ (ManageTeam) |
| Social accounts | ✅ (SocialMediaTab on profile) |
| Licensing | ⚠️ field exists, null |
| Business hours | ❌ |
| Photos | ✅ (sale galleries, sale images) |
| Colors | ❌ |
| Testimonials | ✅ (OperatorTestimonials component, Review entity) |
| Services | ⚠️ (package descriptions; no structured service list) |

**Score: ~65/100 — a majority of a future website could be auto-populated; gaps are tagline, about, hours, colors.**

---

# PART 25 — SUBSCRIPTION / ENTITLEMENT MODEL

- `Subscription` entity: `user_id`, `plan_type`, `tier` (basic→elite), `price`, `billing_period`, `status` (active/cancelled/paused/expired/pending), `features[]` (string flags), renewal/expiry dates, `package_name`
- `SubscriptionPackage` entity: purchasable packages (drives OperatorPackages UI and checkout)
- Payments: Base44 Payments pipe (`create-checkout`, `wix-payments-webhook`, Subscription.wix_* linkage) — certified in prior phases
- **A future "Operator Website" entitlement fits the existing `features[]` / package model directly. Nothing about the current billing architecture blocks it. Entitlement readiness: high.**

---

# PART 26 — LEAD ROUTING INTO ESTATESALEN

Existing ingest surfaces, all with attribution:

| Source | Entity/Function | Attribution available |
|---|---|---|
| Contact company | `ContactFormModal` + `sendBusinessContactEmail` | company ✅ |
| Request estate sale | `EstateTransitionLeadForm` → `EstateTransitionLead` (`source_url`, `source_page_type`, routing) | company/sale/page ✅ |
| Website lead | `Lead` entity (`website_page`, `source`, `ad_campaign`) | page/campaign ✅ |
| VIP signup / RSVP | `VIPEvent`/`VIPInvite` | sale ✅ |
| Item inquiry / offer | `BidRequestModal`, `Offer`, `ItemMessage` | item ✅ |
| Seller lead (consumer) | `syncConsumerProfile`, `ConsumerMarketingProfile` | identity ✅ |

**Website/campaign-level attribution is the only gap (no website/tenant id exists yet). All other attribution dimensions already exist.**

---

# PART 27 — ANALYTICS INGESTION

Existing event/analytics architecture:

- `MarketingEventLog`, `MarketingEngagementLog`, `MarketingInteraction`, `MarketingCampaignPerformance` — engagement + campaign events
- `ConversationAnalytics`, `DemandMetrics`, `SEOIndexLog`, `SEOReport` — derived analytics
- Counters: `EstateSale.views/saves`, `Item.views/saves`
- Reverse-webhook events: `sale_view` already increments canonical counters (the exact pattern a website would use)
- Platform analytics track (`base44.analytics.track`)

**Verdict: an ingestion architecture exists; extending it with website-sourced events (UTM, referral) is additive, not new.**

---

# PART 28 — MEDIA ARCHITECTURE

- Storage: platform public storage (`base44.app/api/apps/<appid>/files/...`) and `media.base44.com` public image URLs — **permanent, world-readable, no expiry**
- Sale images carry `thumbnail_url` (pre-generated thumbnails; `regenerateSaleThumbnails` exists) plus per-image `price/categories/description`
- Private storage + signed URLs (`UploadPrivateFile`/`CreateFileSignedUrl`) exist for gated media
- **Answer: NO — copying EstateSalen media into operator websites is NOT technically necessary.** Public permanent URLs can be hot-linked directly; thumbnails already exist for performance. (SEO-sensitive operators may still prefer proxied or copied media for canonical control — that is a policy choice, not a technical necessity.)

---

# PART 29 — SECURITY MODEL FOR PUBLICATION (existing raw material)

| Mechanism | Exists? |
|---|---|
| Static per-operator API keys | ✅ (CompanyApiKey) — weak but functional |
| Partner service-token client | ✅ (`houszuPartnerClient.ts` — production-proven pattern) |
| Signed webhook receiver | ✅ (wix-payments-webhook JWT verification; customerioWebhookIngest signature check) |
| Scoped credentials / secrets store | ✅ (platform secrets; canonical contract versioning) |
| Public read APIs | ✅ (public pages; CORS `*` feeds) |

**Appropriate model for EstateSalen → Operator Website: the Houszu-style pattern — a scoped per-tenant credential + contract-versioned, idempotent, delta-capable feed — reusing the certified outbox/contract infrastructure. Do not create credentials now (per instructions).**

---

# PART 30 — CURRENT API VERSIONING

- Sale feeds (`saleDataFeed`, `pushSaleDataWebhook`, `receiveSaleUpdate`): **no explicit versions, no schema versions, no deprecation strategy.**
- Houszu identity integration: **explicit `contract_version` 1.6.0** with frozen vocabulary, registry-gap quarantine, and reconciliation tooling (`verifyGatewayContract`).
- **Verdict: versioning discipline exists in-house (Houszu) and is absent on the LLS-facing feeds. If hundreds/thousands of sites will depend on feeds, adopt the same contract-version pattern.**

---

# PART 31 — ONE-CANONICAL-SALE FEASIBILITY

**Classification: YES — MODERATE REFACTOR.**

Why not minor: the LLS-facing feeds are full-snapshot push/pull with no delta, no tombstones, no source keys, no versioning; a reconciliation/subscription model cannot be retro-fitted onto them as-is; and company identity must be promoted to a first-class entity.

Why not major: **EstateSalen already is the canonical owner** (Part 6), `receiveSaleUpdate` already encodes "write back to canonical," stable platform IDs exist on every entity, media is hot-linkable, and the certified Houszu outbox/contract pattern provides a proven template for a publication engine. The work is: (1) a Company/Site entity, (2) a Publication→Destination layer over sales/inventory, (3) delta + tombstone semantics on the feed, (4) contract versioning. All additive around a correct core.

---

# PART 32 — LLS AS REFERENCE WEBSITE TENANT #1

| Requirement | Status in EstateSalen |
|---|---|
| Company identity | PARTIAL — denormalized on User; no Company entity |
| Site identity | MISSING |
| Publication (Sale→Publication→Destination) | MISSING (pattern exists in Houszu outbox) |
| Domain | MISSING (platform-level only) |
| Presentation settings | PARTIAL (logo/name; no theme) |
| Canonical sale access | EXISTS (feed entities + public pages; needs contract upgrade) |
| Inventory access | EXISTS (Item + images; needs source-key semantics) |
| Lead writeback | **EXISTS** (multiple forms with attribution) |
| Analytics writeback | **EXISTS** (`sale_view` reverse event, event logs) |

---

# PART 33 — ONE-CLICK WEBSITE READINESS SCORES

| Dimension | Score |
|---|---|
| Company data | 65 |
| Tenant identity | 55 |
| Branding | 60 |
| Sale publication | 35 (canonical exists; publication layer absent) |
| Inventory publication | 40 (IDs stable; images-as-inventory complicates) |
| Media | 90 |
| Leads | 85 |
| Analytics | 80 |
| Entitlement | 90 |
| Provisioning | 20 |
| Custom domain | 15 |
| Security | 70 (proven patterns exist; feeds need upgrade) |

---

# PART 34 — CLONE VS SHARED WEBSITE ENGINE

**Recommendation: ONE SHARED MULTI-TENANT OPERATOR WEBSITE ENGINE (on EstateSalen or tightly coupled to it), not cloned apps.**

- Cloned per-operator Base44 apps would create version drift (every upgrade × hundreds of tenants), N× security surface, N× provisioning, and would immediately break the "one canonical source" goal (each clone re-introduces copying).
- A shared engine keeps one publication contract, one security model, one upgrade path; tenant isolation comes from the existing tenant model + per-tenant data scoping (pattern already proven by RLS).
- Hybrid (shared engine + per-tenant theme/presentation config) is the practical form: shared code, tenant-scoped presentation rows.

---

# PART 35 — TARGET ARCHITECTURE LAYER CLASSIFICATION

Target: ESTATESALEN → COMPANY → CANONICAL SALE → CANONICAL INVENTORY → PUBLICATION ENGINE → DESTINATIONS

| Layer | Classification |
|---|---|
| COMPANY | **PARTIALLY EXISTS** (denormalized on User; wrong shape for tenancy) |
| CANONICAL SALE | **EXISTS** (EstateSale; no `cancelled` status) |
| CANONICAL INVENTORY | **EXISTS BUT WRONG ARCHITECTURE IN PRACTICE** (Item entity is right; live operators use images[] as inventory) |
| PUBLICATION ENGINE | **MISSING for sale data** (pattern exists for identity events) |
| DESTINATIONS | **PARTIALLY EXISTS** (CompanyApiKey as channel registry; Houszu outbox as event destination) |
| Marketplace destination | EXISTS |
| Houszu destination | EXISTS (certified) |
| Social/Email/SMS | EXISTS |
| Operator Website destination | MISSING |

Operator Website sub-stack: WEBSITE TENANT (missing) · BRANDING/PRESENTATION (partial) · CANONICAL SALE PUBLICATION (missing) · CUSTOM DOMAIN (missing)

---

# PART 36 — WHAT SHOULD NOT BE DUPLICATED

**Must remain canonical (never independently editable on websites):** company identity; sale identity; address; dates; hours; sale status; inventory identity; item price; sold status; operational media (source-of-truth); offers; RSVP/VIP operational state.

**Legitimate website-only presentation data:** site title/tagline; theme colors/typography; section ordering; hero selections; marketing copy; about-us text; which sales/items are featured on the site; page slugs; SEO overrides; analytics/UTM config.

---

# PART 37 — MIGRATION IMPACT (future, not executed)

EstateSalen could support canonical publication for LLS's mirrored data without breaking history by: mapping `os_<estatesalen_id>` back to canonical IDs (the mapping is already deterministic); serving permanent media URLs (already hot-linkable, so LLS URLs survive); keeping historical `completed` sales published (status exists); preserving LLS-side SEO via redirects on the LLS side; and back-filling `source_key` in LLS from the mirrored IDs. No EstateSalen data migration is required — the canonical IDs never changed.

---

# PART 38 — PRESERVE EXISTING WORK

| Component | Disposition |
|---|---|
| EstateSale / Item entities + RLS | **KEEP** |
| Public sale experience + SEO engine | **KEEP** |
| Lead capture (all forms, attribution fields) | **KEEP** |
| Subscription/entitlement architecture | **KEEP** |
| Media (public URLs + thumbnails) | **KEEP** |
| CompanyApiKey + ApiKeyManager | **EXTEND** (becomes the destination registry; add delta/tombstone/versioning) |
| Push workflows | **REFACTOR** (three overlapping triggers → one; snapshot payload → delta payload) |
| saleDataFeed / pushSaleDataWebhook / receiveSaleUpdate | **REFACTOR** (keep endpoints, add contract version, cursor, source_key, tombstones) |
| Houszu outbox/contract pattern | **EXTEND** (template for the publication engine) |
| images[]-as-inventory practice | **REFACTOR** (promote real Item records; keep images as media) |
| BCRise sync experiment (`llos_test_*`) | **RETIRE or REFACTOR** under the same publication engine |
| Legacy Lane OS internal app name | **REPLACE** (cosmetic; rename to EstateSalen for consistency) |

---

# PART 39 — CROSS-AUDIT ANSWERS

1. **Current production URL:** https://estatesalen.base44.app (custom domain: estatesalen.com)
2. **Why LLS's URL 404s:** app renamed Legacy Lane OS → EstateSalen; the subdomain is name-derived; old slug dropped on re-publish. Stale LLS config.
3. **Correct feed/API base:** `https://estatesalen.base44.app/functions/` (e.g. `/functions/saleDataFeed`)
4. **Does "Come and Get IT!" exist?** YES — id `69b058479d65ca9487ea8e2e`, status completed
5. **Canonical ID:** `69b058479d65ca9487ea8e2e`
6. **`os_69b0584...`:** LLS-side representation = `os_` prefix + the EstateSalen canonical ID
7. **Canonical Legacy Lane company ID?** No standalone company entity; operator User ID `69471383fc72e5b50c72fcc8` is the de-facto key
8. **Why is LLS's `estatesalen_company_id` null?** EstateSalen never transmits a company-ID concept — only `operator_id`/`operator_name` inside feed payloads; LLS has nothing to map
9. **Feed LLS was intended to consume:** `saleDataFeed` (pull, api_key) + `pushSaleDataWebhook` (push) — the CompanyApiKey pair
10. **Operational?** Endpoints exist and work, but the push target was never configured; pull works but is unlogged and the LLS-side base URL is dead
11. **Sale updates?** Only via full-snapshot push/pull — no delta support
12. **Inventory updates?** Same — full snapshot only
13. **Deletions/tombstones?** NO
14. **Stable inventory IDs?** YES (platform IDs) — but no `source_key` field
15. **Company identity?** `operator_id` + `operator_name` only
16. **Publication abstraction?** NO (for sale data; the Houszu outbox is the pattern to extend)
17. **Destination abstraction?** PARTIAL (CompanyApiKey)
18. **Operator website functionality?** NO website builder/microsite; public profiles only
19. **Custom-domain functionality?** NO (platform-level only)
20. **Support LLS without duplicating operational data?** YES — moderate refactor (Part 31)
21. **Support hundreds/thousands of sites?** YES, conditional on contract versioning + shared engine (Parts 30, 34)
22. **Reuse:** entities + RLS, feeds (upgraded), media, lead capture, analytics, entitlements, Houszu contract pattern
23. **Conflicts:** snapshot-copy feeds, images-as-inventory, denormalized company identity, no tombstones/versioning
24. **Has development begun?** The foundation has (feeds, keys, write-back, outbox pattern); the publication/website layer has not

---

# PART 40 — SIDE-BY-SIDE RECONSTRUCTION

1. **EstateSalen sale created** — CONFIRMED (2026-03-10, "Come and Get IT!", operator Legacy Lane)
2. **Sale exposed/sent to LLS** — UNVERIFIABLE (push never fired per `last_push_at: null`; pull is unlogged). Labeled inference: the api_key pull is the only mechanism that could have delivered it
3. **LLS created `os_...` sale** — CONFIRMED by ID-derivation evidence (Part 5)
4. **Inventory mirrored** — CONFIRMED-in-effect (27 LLS rows ↔ 27 sale images; EstateSalen has 0 Item rows)
5. **Reconciliation expected** — CONFIRMED impossible by design (Part 13); no source_key/tombstones/cursor exist
6. **Endpoint became unavailable** — CONFIRMED (rename; old slug dead; new slug live)
7. **LLS reconciliation stopped/never ran** — CONSISTENT with all EstateSalen-side evidence

Sequence: **confirmed with two labeled unknowns** (the delivery mechanism; whether LLS's rows derive from images or from since-deleted Item rows).

---

# PART 41 — CURRENT (VERIFIED) ARCHITECTURE DIAGRAM

```
┌─────────────────────────── ESTATESALEN (base44 app id 69471382fc72e5b50c72fcc7) ───────────────────────────┐
│                                                                                                             │
│  USER (operator) ── de-facto company identity (name/logo/phone/address denormalized)                        │
│    │                                                                                                        │
│    ├── EstateSale (CANONICAL) ──< Item (CANONICAL inventory; 0 rows for this operator)                      │
│    │        └── images[] = de-facto inventory for live operators (27 for "Come and Get IT!")                │
│    │                                                                                                        │
│    ├── CompanyApiKey (channel registry) ── api_key, webhook_url (null), webhook_enabled (false)             │
│    │        │                                                                                               │
│    │        ├──> saleDataFeed (PULL, full snapshot, CORS*, unlogged) ─ ─ ─ ? ─ ─ ➤ LLS (via os_ id)         │
│    │        │                                                                                               │
│    │        ├──> pushSaleDataWebhook (PUSH, full snapshot) ─ ─ ✗ never fired (no target) ─ ─ ➤ LLS          │
│    │        │        ▲ triggered by: 3 entity-trigger workflows (EstateSale/Item create+update)             │
│    │        │                                                                                               │
│    │        └──< receiveSaleUpdate (REVERSE write-back: item_sold/sale_update/sale_view) ─ ─ ◄ LLS?         │
│    │                                                                                                        │
│    ├── Public pages / SEO / sitemap / GSC ──> estatesalen.base44.app + estatesalen.com                      │
│    ├── IdentityActivityOutbox ──> Houszu (certified v1.6.0; identity events ONLY)                           │
│    └── Marketplace / Social / Email / SMS destinations (native)                                             │
│                                                                                                             │
│  ✗ KNOWN BROKEN LINK: LLS → legacy-lane-os-0c72fcc7.base44.app = "App not found" (stale rename)             │
│  ─ ─ dashed = unverified relationship (pull delivery mechanism unlogged)                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 42 — PROPOSED REFERENCE ARCHITECTURE (do NOT implement)

```
ESTATESALEN
  COMPANY (first-class entity; promoted from User denormalized fields) ── website branding data
      │
      ├── CANONICAL SALE (EstateSale; add `cancelled` status)
      │       └── CANONICAL INVENTORY (Item promoted as the inventory source; images = media)
      │
      ├── PUBLICATION ENGINE  ← reuse the certified Houszu outbox pattern:
      │       durable queue · contract_version · request_id idempotency ·
      │       delta semantics (updated_since + cursor) · tombstones (deleted_at) ·
      │       per-record error isolation · worker leases
      │
      └── DESTINATIONS (destination registry = extended CompanyApiKey)
              ├── EstateSalen Marketplace   (exists)
              ├── Operator Website          (NEW: Website Tenant → Presentation config → published sale/inventory views → custom domain)
              ├── Houszu                    (exists, identity events)
              ├── Social / Email / SMS      (exists)
              └── Future Partners           (same contract)

Operator Website stack:
  COMPANY → WEBSITE TENANT (site_id, domain, status, entitlement check)
        → BRANDING / PRESENTATION (theme, hero, copy — website-only data, Part 36)
        → CANONICAL SALE PUBLICATION (read views over canonical data; lead + analytics writeback via existing forms/events)
        → CUSTOM DOMAIN (platform-level provisioning + tenant domain field)

Where things belong: branding → Website Tenant; SEO → per-destination presentation + canonical schema_json; lead capture → existing forms with website/tenant attribution; analytics → existing event logs with tenant id; subscription entitlement → Subscription.features ("operator_website").
```

---

# PART 43 — FINAL SCORECARD

| Dimension | Score |
|---|---|
| Canonical sale maturity | 85 |
| Inventory identity | 70 (IDs stable; practice diverges to images[]) |
| Company identity | 45 |
| Outbound API/feed maturity | 40 |
| Deletion/tombstone support | 10 |
| Publication architecture | 35 (pattern proven for identity, absent for sales) |
| Destination architecture | 45 |
| Multi-tenant readiness | 70 |
| Website branding readiness | 65 |
| Custom-domain readiness | 15 |
| Lead ingestion | 85 |
| Analytics ingestion | 80 |
| Entitlement readiness | 90 |
| Security | 70 |
| Operator website engine readiness | 25 |

### ESTATESALEN CANONICAL PLATFORM READINESS: **74/100**
### ESTATESALEN → OPERATOR WEBSITE READINESS: **48/100**

---

# PART 44 — FINAL VERDICT

## **B — STRONG FOUNDATION, TARGETED REFACTOR NEEDED**

EstateSalen already owns sales canonically, has stable IDs everywhere, hot-linkable media, mature lead/analytics/entitlement systems, and a certified publication-engine pattern (the Houszu outbox). What's missing is bounded and well-defined: a first-class Company/Site entity, a Publication→Destination layer over sale data, delta/tombstone/versioned feed semantics, and images-as-inventory normalization. Nothing requires a fundamental rebuild, and nothing about the current core is wrong-shaped except the company-identity denormalization.

---

# PART 45 — NEXT-STEP PLAN (do NOT execute)

## WHAT EXISTS AND SHOULD BE KEPT
EstateSale/Item entities + RLS · public sale experience + SEO engine · lead capture with attribution · subscription/entitlement architecture · public media + thumbnails · receiveSaleUpdate write-back concept · Houszu outbox/contract discipline.

## WHAT EXISTS AND SHOULD BE EXTENDED
CompanyApiKey → destination registry (add tenant/domain/status/entitlement) · Houszu outbox pattern → sale publication engine · analytics event logs (website-sourced events) · lead forms (website/tenant attribution).

## WHAT EXISTS BUT SHOULD BE REFACTORED
saleDataFeed/pushSaleDataWebhook (snapshot → versioned delta + tombstones + source_key) · three overlapping push workflows → one · images[]-as-inventory practice → Item-first · denormalized company identity → Company entity.

## WHAT SHOULD EVENTUALLY BE RETIRED
BCRise `llos_test_*` experiment scaffolding (or fold under the publication engine) · duplicate push workflow · the "Legacy Lane OS" internal name.

## WHAT IS ACTUALLY MISSING
Website Tenant entity · Publication records (Sale→Destination) · tombstone/cancellation contract · feed contract versioning · custom-domain provisioning (platform feature) · `cancelled` sale status · provisioning UX.

## RECOMMENDED FIRST 10 IMPLEMENTATION ACTIONS (dependency order; do not execute)

| # | Objective | App | Reuses | Risk | Depends on | Success condition |
|---|---|---|---|---|---|---|
| 1 | Delete residual cert records (`6aca1cb87ecd3477e20d3abe` sale + its outbox row) | EstateSalen | manifest IDs | none | audit sign-off | zero residue |
| 2 | Create `Company` entity; backfill from operator User fields; keep User fields in sync read-only | EstateSalen | existing user data | low | — | every operator has a Company ID |
| 3 | Add `cancelled` status + `deleted_at` semantics to EstateSale lifecycle | EstateSalen | existing status pipeline | low | — | cancel/complete transitions propagate |
| 4 | Define feed contract v1 (versioned): source_key = platform id, updated_since, cursor, tombstones | EstateSalen | canonicalContract.ts pattern | low | 3 | contract doc frozen |
| 5 | Upgrade `saleDataFeed` to contract v1 (delta + cursor + tombstones + access log) | EstateSalen | existing endpoint | medium | 2,3,4 | LLS-style consumer can diff |
| 6 | Consolidate push workflows → single Publication Push workflow emitting contract v1 deltas | EstateSalen | existing entity triggers | medium | 4,5 | one trigger, delta payloads |
| 7 | Create `WebsiteTenant` entity (company_id → site_id → domain, status, presentation config ref) | EstateSalen | CompanyApiKey as registry precedent | low | 2 | tenant row per operator site |
| 8 | Create `Publication` records (sale → destination, publication status, last_pushed_at) | EstateSalen | outbox pattern | medium | 4,7 | every published sale has publication rows |
| 9 | Point LLS at `https://estatesalen.base44.app/functions/saleDataFeed` with the existing api_key; map `os_<id>` back to canonical ids; backfill `source_key` in LLS | LLS | existing keys + os_ mapping | low (config-only) | 5 | LLS reconciliation first successful run |
| 10 | Add website/tenant attribution to lead + analytics ingestion; entitlement flag `operator_website` in Subscription.features | EstateSalen | existing forms/logs/features[] | low | 7 | website-sourced leads attributable |

---

# PART 46 — CRITICAL IMPLEMENTATION GATE

## SHOULD WE REPAIR THE CURRENT LLS FEED FIRST?

## **HYBRID — TEMPORARILY RESTORE THE FEED WHILE MIGRATING** — with a narrow definition of "restore."

Rationale from the actual architecture:
- The **repair is nearly free and lives almost entirely on the LLS side**: the endpoints still work; LLS just points at a dead subdomain. Repointing to `https://estatesalen.base44.app/functions/saleDataFeed` with the already-issued api_key restores basic data flow without building anything.
- But a **full repair of the copy-and-sync architecture is NOT worth development time**: the feed has no delta, no tombstones, no source_key, no versioning, and no access logging — LLS's reconciliation engine can never run correctly against it (Part 13). Money spent adding reconciliation to the snapshot feed would be thrown away when the publication architecture lands.
- Therefore: restore as a **stopgap only** (URL repoint + pull for current-state correctness, tombstone-free), while steps 2–8 of the plan build the canonical publication layer; then cut LLS over to contract v1 and retire the snapshot push.

**Do not invest in making the copy-and-sync architecture reconcile. Make it merely correct, then replace it.**

---

*END OF ESTATESALEN-SIDE AUDIT — read-only; no EstateSalen or LLS system was modified. STOP.*