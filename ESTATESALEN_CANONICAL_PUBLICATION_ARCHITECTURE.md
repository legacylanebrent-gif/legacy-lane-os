# EstateSalen — Canonical Publication Architecture

> **EstateSalen owns operational truth. Operator websites own presentation. Publication connects the two.**

Status: Phase 2 complete (Legacy Lane Sales = Destination #1). Phase 3 (Website Tenant Engine) not started.

---

## 1. Canonical Ownership

EstateSalen is the **single authoritative source** for:

| Domain | EstateSalen owns |
|---|---|
| Identity | Company, Sale, Item IDs |
| Sale truth | status, address, dates, hours, description, lifecycle, cancellation, completion, archival |
| Inventory truth | item identity, price, sold status, operational media |
| Operations | offers, RSVP/VIP operational state |

Website destinations own **presentation only**: branding, theme, navigation, hero, featured ordering, CTA wording, SEO overrides, domains, marketing copy.

**Rule:** no destination may independently mutate canonical operational fields (dates, address, hours, inventory, item price, sold status, sale status).

## 2. Architecture

```
COMPANY  (canonical, e.g. 6acbbf22de3c0f719679038d)
   │
   ▼
CANONICAL SALE  (e.g. 69b058479d65ca9487ea8e2e "Come and Get IT!")
   │
   ▼
PUBLICATION  (relationship record — one per Sale × Destination, idempotent)
   │
   ▼
DESTINATION ADAPTER REGISTRY  (base44/shared/destinationAdapters.ts)
   │
   ▼
DESTINATION  (e.g. "Legacy Lane Sales Website" — operator_website)
   │
   ▼
DESTINATION PRESENTATION  (LLS record: os_69b058479d65ca9487ea8e2e)
```

### Components

| Component | Location | Role |
|---|---|---|
| `Destination` entity | `base44/entities/Destination.jsonc` | A channel to which canonical data can be published. Company-owned, typed (`destination_type`), lifecycle (`active/inactive/suspended/retired`), non-secret `configuration`, `capabilities`. Admin-only RLS. |
| `Publication` entity | `base44/entities/Publication.jsonc` | The Sale ↔ Destination relationship. Own ID. Status lifecycle (`draft/pending/published/update_pending/failed/unpublished/suspended`), `external_reference`, `source_version` (currentness), attempt/audit fields. Admin-only writes. |
| Canonical payload builder | `base44/shared/publicationPayload.ts` | **Single** source of publishable Sale representation. Whitelist-based privacy filtering (see §3). Also produces the deterministic `source_version`. |
| Adapter registry | `base44/shared/destinationAdapters.ts` | `operator_website` adapter implemented; new destination types register here — no service-side conditionals. |
| Publication service | `base44/shared/publicationService.ts` | `publishSaleToDestination`, `unpublishSaleFromDestination`, `syncSalePublications`, `authorizeSaleActor`. All fail-closed checks live here. |
| `publishSale` function | `base44/functions/publishSale/entry.ts` | User-invoked: actions `publish` / `unpublish` / `status`. Authenticates actor, authorizes company. |
| `syncSalePublications` function | `base44/functions/syncSalePublications/entry.ts` | Workflow-invoked change propagation. **Fail closed: only republishes existing publications; never creates one.** |
| Workflows | `base44/workflows/Publication Sync on Sale Change.jsonc`, `Publication Sync on Item Change.jsonc` | EstateSale / Item change → mark `update_pending` → safe idempotent republish. |
| Operator UI | `/SalePublication` page | Select sale → see destination, status, last published, pending changes, failures → Publish / Republish / Unpublish. |

## 3. Canonical Payload (`estatesalen.publication.v1`)

Included: schema + event (`publish|update|unpublish`), company (id + names), publication (id/status/external_reference/source_version), sale (id, company_id, title, description, status, type, dates/times, public address, location, categories, payment methods, item count, parking, special notes, public images), items (canonical Item ID, title, description, category, brand, condition, price, **sold_status**, featured, public images).

Excluded: private notes, internal operator notes, buyer PII (`buyer_name`, `buyer_contact`, payment details), settlement flags, commission/revenue/estimated-value fields, SEO internals, AI image synopses, skip flags, internal pricing intelligence, admin metadata, credentials.

**Item identity:** canonical EstateSalen Item IDs are published verbatim — no destination-specific fuzzy keys.

## 4. Publication Semantics

- **Idempotency:** one active publication per (Sale, Destination). Repeated and concurrent publishes reuse the same Publication ID; races self-collapse to the oldest record.
- **Ownership enforcement (server-side):** `Sale.company_id == Destination.company_id`, else `403 company_mismatch`. Destination must be `active`, else `403 destination_not_active`. Missing sale/destination → 404. Unauthenticated → 401. No silent fallback company.
- **Adoption:** for `operator_website` destinations the destination-side presentation ID follows the established convention `os_<canonical sale id>`. A publication adopts the existing presentation record (`adopted: true`) instead of creating a duplicate.
- **Update propagation:** canonical change → publication marked `update_pending` → republish. `source_version` (`sale.updated_date|item_count|sold_count|latest_item_update`) detects currentness; a current published publication is skipped.
- **Unpublish:** publication-level operation. Removes/suspends the sale at the destination; **never deletes the canonical EstateSalen Sale**.
- **Completed sales:** publication lifecycle retains the relationship; no automatic deletion of historical public content.
- **Failure handling:** sanitized error categories only (`not_configured`, `retryable_delivery`, `permanent_delivery`) — no secrets, no raw payloads in errors. Retries are idempotent.
- **Fail closed:** inactive destination, company mismatch, invalid sale/destination, unauthorized actor, malformed request — all fail closed.

## 5. Legacy Lane Sales — Destination #1

| Field | Value |
|---|---|
| Destination ID | `6acbc7657ddd5307aa98094b` |
| Company | `6acbbf22de3c0f719679038d` (Legacy Lane Estates LLC) |
| Type | `operator_website` |
| Status | `active` |
| Capabilities | sale_details, inventory, media, pricing, sold_status, cancellation, completion |
| Auth | secret-name reference `LEGACY_SHARED_API_KEY` (value never stored in the record) |
| Delivery endpoint | **Not yet registered** — publication status `pending` until LLS registers a receiver URL in `configuration.webhook_url` |

### Certification publication

```
COMPANY  6acbbf22de3c0f719679038d  (canonical — EstateSalen)
   ▼
SALE     69b058479d65ca9487ea8e2e  (canonical — EstateSalen, 27 items)
   ▼
PUBLICATION  6acbc7b902d141675d6dd9d5  (relationship — adopted, source_version recorded)
   ▼
DESTINATION  6acbc7657ddd5307aa98094b  (Legacy Lane Sales Website, operator_website)
   ▼
LLS PRESENTATION  os_69b058479d65ca9487ea8e2e  (existing LLS record — adopted, not duplicated)
```

## 6. Legacy Bridge (temporary compatibility, retained)

The Phase 0/1 snapshot architecture remains fully operational and untouched:
`saleDataFeed` (pull), `pushSaleDataWebhook` (push), `os_` presentation IDs, and the LLS API key record. Retirement happens only after the publication path is independently certified end-to-end with a live LLS receiver.

**Known debt (intentional, deferred):**
1. LLS receiver endpoint for publication delivery — LLS-side work; until registered, publications to LLS hold status `pending` with `no_delivery_endpoint_configured`.
2. LLS-side read-only enforcement for canonically-managed sale fields + "Edit in EstateSalen" action — LLS-side work.
3. Legacy snapshot bridge retirement — later migration phase.
4. LLS `operator_name` still surfaces as company name in the legacy feed envelope — cosmetic, legacy only.
5. Publication deletion-dedupe keeps oldest record on concurrency races (deterministic; verified).

## 7. Phase 3 Boundary (NOT built)

Website tenant engine, one-click website creation, themes, generalized domains, DNS/SSL automation, site templates, multi-tenant rendering, subscription website entitlement — explicitly reserved for Phase 3. Other destination types (`estatesalen_marketplace`, `houszu`, `social`, `email`, `sms`, `partner_feed`, `external_marketplace`) are schema-supported but not implemented.