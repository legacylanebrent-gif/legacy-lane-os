# EstateSalen — Canonical Company Identity & Legacy Lane (LLS) Bridge

**Status:** Phase 0A + Phase 1 complete · Feed `company_id` deployment pending platform propagation
**Date:** 2026-10-11
**Published app:** https://estatesalen.base44.app (old `legacy-lane-os-0c72fcc7.base44.app` is dead — 404)

---

## 1. Purpose

Establish a durable, canonical **Company** identity inside EstateSalen that:
1. Gives every verified operator business a stable identity independent of any single User account.
2. Extends the existing EstateSalen → Legacy Lane Sales (LLS) compatibility bridge so LLS receives the canonical company reference alongside sale data.
3. Prepares the multi-tenant foundation required for a future EstateSalen website/publication layer (see `ESTATESALEN_SIDE_LLS_CANONICAL_PUBLICATION_AUDIT.md`).

---

## 2. Phase 0A — Synthetic residue cleanup (COMPLETE)

The Phase 7D.3 certification suite left one synthetic cluster. All was verified and removed by exact ID:

| Record | Type | Marking |
|---|---|---|
| `6aca1d3b935030566b4dc4fb` (cluster root) | EstateSale (title "CERT7D3 SYNTH") | `CERT7D3` |
| Cluster members | VIPEvent / VIPInvite / IdentityActivityOutbox ×2 | `CERT7D3` |

**Verification:** post-delete sweep — 0 records contain `CERT7D3` anywhere. All 7 legitimate Legacy Lane sales untouched.

---

## 3. LLS compatibility bridge — verified live state

- **Old endpoint** `legacy-lane-os-0c72fcc7.base44.app` → 404 (app was renamed/republished). No runtime reference to it remains anywhere in EstateSalen code.
- **Current endpoint** `https://estatesalen.base44.app/functions/saleDataFeed`
  - `POST { api_key }` → 200 with full sale details.
  - Sale "Come and Get IT!" (`69b058479d65ca9487ea8e2e`) resolves with **27 canonical inventory `Item` records**. (An earlier audit draft described inventory as images-only; that was a data-lag artifact — the live pull returns proper Item records.)
  - Invalid key → 401. No record duplication observed.
- **Push channel** (`pushSaleDataWebhook`) posts `event: 'data_updated'` to each active `CompanyApiKey.webhook_url`.

### LLS-side action required (outside EstateSalen)
LLS must repoint its client to the current pull URL. It should send:
```
POST https://estatesalen.base44.app/functions/saleDataFeed
Content-Type: application/json
{ "api_key": "<LLS key from CompanyApiKey>" }
```
CORS is open (`Access-Control-Allow-Origin: *`), so browser-side calls are allowed.

---

## 4. Phase 1 — Canonical Company entity (COMPLETE)

### 4.1 Entity
New entity `Company` (`base44/entities/Company.jsonc`) with:
- `legal_name` (required), `display_name`, `status` (`active|inactive|pending|suspended`), `primary_contact_user_id`, `member_user_ids[]`, contact fields, address fields, `service_area_notes`, `notes`.
- **Server-side RLS:** read = owner / member / primary contact / admin; update = owner / primary contact / admin; create = authenticated; delete = admin only.
- Built-in `id`, `created_date`, `updated_date`, `created_by_id` never redeclared.

### 4.2 Canonical record
- **Legacy Lane Estates LLC** — canonical Company ID: **`6acbbf22de3c0f719679038d`**, status `active`, primary contact = the verified Legacy Lane operator User.
- Legacy `operator_id` ownership is preserved; Company identity is additive.

### 4.3 Mapping
- Operator User ↔ Company via `primary_contact_user_id` + `member_user_ids`.
- All 7 verified Legacy Lane sales mapped via `EstateSale.company_id`. 0 unmapped sales touched.
- Inventory deliberately **not** double-mapped: Item ownership derives from its sale (single source of truth), matching the decision to leave the Item model unchanged in Phase 1.

---

## 5. Feed changes (Phase 1 extension)

Both feed functions (`saleDataFeed` pull, `pushSaleDataWebhook` push) now emit two additive top-level fields per sale:

```json
{
  "company_id": "6acbbf22de3c0f719679038d",
  "company_name": "Legacy Lane Estates LLC"
}
```

Design:
- **Primary source** for `company_id` is `sale.company_id` (already backfilled) — one DB query saved, and immune to Company-entity runtime registration lag.
- **Fallback**: Company registry lookup by `primary_contact_user_id` (also supplies `company_name`; try/catch'd so the feed degrades gracefully, never fails, when the registry is unreachable).
- Consumers that don't know the fields simply ignore them — fully backward compatible.

**Deployment note:** the public endpoint was observed still serving the previous deployment (200, no `company_id`) — this is the known function-redeploy propagation lag. Source is verified correct; re-verify by polling the endpoint after the platform settles. Probe method used: a temporary synthetic `CompanyApiKey` + literal-key POST, deleted by ID afterward (0 residue).

---

## 6. Out of scope (documented, not built)

- LLS-side repointing of the pull client and any webhook consumer (LLS configuration).
- Phase 2+ website/publication layer (delta feeds, tombstones, source keys, feed versioning) — see the publication audit.
- Restructuring live-sale inventory out of `images[]` (only relevant for sales that genuinely keep inventory there).

---

## 7. Verification ledger

| Check | Result |
|---|---|
| CERT7D3 residue | 0 |
| Old host references in code | 0 |
| Current host live | ✅ 200 |
| Pull auth (valid key / invalid key) | ✅ 200 / 401 |
| Pull sale → items resolution | ✅ 27 items on `69b058479d65ca9487ea8e2e` |
| Duplicate-feed behavior | ✅ no duplication |
| Company entity + RLS | ✅ server-side enforced |
| Canonical Company record | ✅ `6acbbf22de3c0f719679038d` |
| Sales mapped to Company | ✅ 7/7 verified sales, 0 unmapped touched |
| Feed `company_id` (source) | ✅ verified in source |
| Feed `company_id` (live endpoint) | ⏳ pending redeploy propagation — re-poll |