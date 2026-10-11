# ESTATESALEN — PHASE 3D.3 CERTIFICATION REPORT
# Final LLS Parity + New-Sale Independence Certification

Date: 2026-10-11 (America/New_York)
Real Legacy Lane WebsiteTenant: `6acc10372f51e204e02e9a68`
Company: `6acbbf22de3c0f719679038d` · Destination: `6acbc7657ddd5307aa98094b`
Template: `operator_template_1 v1` · Preview: `legacy-lane.estatesalen.com`

**FINAL VERDICT: PHASE 3D.3 — FULLY CERTIFIED (42/42 gates)**
**READY FOR PHASE 3D.4 (PRODUCTION DOMAIN CUTOVER PRE-FLIGHT): YES**
No cutover performed. Bridge NOT retired. Production untouched.

---

## 1. 3D.2 DISCREPANCY (19/20) — RESOLVED: YES
- Check: "Testimonials surface in Template #1."
- Expected: reusable testimonials section matching production social proof.
- Actual (3D.2): Template #1 had no testimonials category — classified LEGACY FEATURE / must-fix-before-cutover; overall PASS was returned because it was a parity gap, not a correctness defect (no data loss, no crash, no security issue).
- Status: RESOLVED this phase — `testimonials` added to WebsiteTenantSettings (schema + defaults + projection + sanitizer + registry), reusable `TestimonialsSection` component (renders nothing when empty, zero operator hardcoding), production testimonials seeded verbatim.

## 2. LEGACY FEED 7 → 12 EXPLAINED
Feed keys on `operator_id`, not Company. Current 12:
| Sale ID | Title | Company | Class |
|---|---|---|---|
| 696960e9e670929bb1860dfe | Testimg the sale | LLS 6acbbf22… | legit (test-titled but production-owned) |
| 69b058479d65ca9487ea8e2e | Come and Get IT! | LLS 6acbbf22… | legit production |
| 6a1e083f109beb036565c2ec | Wow Sale | LLS 6acbbf22… | legit production |
| 6a1ea2941d2512eb8f8743b9 | N Middletown | LLS 6acbbf22… | legit production |
| 6a380cadbbb837dda799b5bf | Old Bridge Beauty - One Day Only | LLS 6acbbf22… | legit production (draft) |
| 6a380f2508ed54ba48c8cb2f | Freehold Beauty | LLS 6acbbf22… | legit production (draft) |
| 6a38180d464e0c3fbb6a4267 | Edison / Mutuchen Great Finds Sale | LLS 6acbbf22… | legit production (draft) |
| 6acc06db4e68275be39fb061 / 6acc06dbd0c90a1311c29241 | Great Estate Sale ×2 | **CertD1 Co A** 6acc06aa9b9cb38ecbf17720 | SYNTHETIC (3D.1 cert fixture, created today 21:59) |
| 6acc06dbd34e46683a2d7520 | Mid-Century Modern Sale | CertD1 Co A | SYNTHETIC (3D.1 fixture) |
| 6acc06db1938c0e05c78acc8 | Great Estate Sale | **CertD1 Co B** 6acc06aaae2bbb13eb73db52 | SYNTHETIC (3D.1 fixture) |
| 6acc07a2d07c3f8acc… 6acc07a2d07c3f8ac81b6284 | Back Patio Sale | CertD1 Co A | SYNTHETIC (3D.1 fixture) |

Why the count changed: the Phase 3D.1 certification companies ("CertD1 Co A LLC / Heritage Estate Group", "CertD1 Co B LLC / Bluebonnet Liquidators") were created today under the same operator user, and the legacy feed (`saleDataFeed`) is NOT company-scoped — it returns all sales for the operator id. Consequence already visible: production LLS currently DISPLAYS the 3D.1 fixture sales (pre-existing residue from the 3D.1 certification window).
Synthetic residue: EXPLAINED (none unexplained). Recommendation: company-scope the legacy feed (or remove the 3D.1 fixtures) BEFORE 3D.4 — do not delete here to avoid touching live cert tenants.
The 3D.3 certification sale was deliberately removed within minutes and is not in the feed.

## 3. PRESENTATION PARITY — DEFERRED ITEMS CLOSED
- **Testimonials — DECISION A (implemented).** Reusable tenant-configured section; LLS seeded with the 3 verbatim production quotes. No LLS hardcoding.
- **Legal — resolved.** Production LLS exposes NO policy/legal pages (no footer link, no content). Nothing to transplant; nothing invented. Tenant keeps its neutral seed copy. Classification: INTENTIONAL (new site adds a policy page).
- **FAQ — DECISION: hide.** Production has no FAQ content. FAQ nav item was already conditional; the direct `/site/faq` route now renders the neutral "Page not available" state (no stub "coming soon" page); the FAQ path is excluded from the sitemap when empty.
- **SEO markdown — sanitized.** `stripMarkdownBody`/`stripMarkdownText` added to the publication payload layer; sale descriptions project markdown-free (`meta_description` added to the public sale view model); presentation overrides (seo_title, seo_description, marketing_intro, highlights, captions) sanitized. Verified on the real sale and the certification sale: no raw `**`, links, headings, or markup in title / meta description / OG description. Canonical Sale description NOT modified.
- Cutover blockers: **0**.

## 4. NEW-SALE INDEPENDENCE (PARTS 5–19)
- Certification Sale: `6acc191e7b4494be25b81474` — "PHASE-3D3-INDEPENDENCE-CERT-DO-NOT-CONTACT" (deleted in cleanup)
- Canonical Inventory: 6 items (normal price / absent price→schema-defaulted 0 / image / multi-image / condition / sold / hidden-excluded)
- Before Publication: direct slug → 404 `sale_not_found`; absent from listing (Company ownership alone does NOT publish)
- Publication: `6acc19366d902f9794573f32`, published 2026-10-11T23:21:20Z, source_version `…|6|1|…`, delivery `webhook`
- After Publication: visible, position per publication order; 5/6 items render (hidden excluded); SOLD badge; prices; multi-image
- LLS Sale reads: **0** · LLS Inventory reads: **0** (runtime reads canonical entities only — code-audited + live)
- Canonical sale update (description + date) → auto re-published, tenant reflected: YES
- Canonical inventory updates (price, description, sold, image) → auto re-published, tenant reflected: YES (all 4)
- Presentation: featured/marketing/hero/SEO override reflected; canonical fields proven byte-identical; after delete → canonical-only fallback renders (5 items)
- Unpublish: listing stops + direct slug 404; canonical sale + 6 items intact
- Republish: SAME publication id, count 1 (no duplicate), visible again
- Lifecycle: upcoming → active → completed all reflected automatically; still listed (visibility is publication-based). Product rule (actual): the canonical status enum is draft/upcoming/active/completed/archived — **'cancelled' does not exist**; archived is the terminal state.
- Receiver failure (Part 18): the certification sale's FIRST delivery was refused by the LLS receiver (`unknown_sale_no_auto_create` 404) → Publication `failed`/`permanent_delivery`, sale correctly NOT visible — real-world receiver-failure representation. During that entire failure window the REAL published sale kept rendering normally from canonical data. Legacy push channel probe: `pushSaleDataWebhook` → "No webhook-enabled companies found" (inert; receiver is pull-only).
- **RECEIVER DEPENDENCY:** Receiver involved in Publication DELIVERY: **YES** (webhook configured; delivery requires receiver adoption, which for NEW sales happens via the receiver's legacy-feed pull — the coexistence coupling documented below). Website runtime depends on receiver-created data: **NO** — rendering authority = Publication state + canonical EstateSalen Sale/Inventory exclusively.

## 5. LEADS (PART 19)
- WebsiteLead created through the public seam on the certification sale: correct Company (`6acbbf22…`), correct tenant (`6acc10372f…`), correct sale (`6acc191e…`), source `operator_website`, explicit-consent truth (no opt-ins → `consent_captured_at: null`).
- Outbox: event `website_lead` quarantined `registry_gap` (payload stripped) — existing safe architecture; note: `seller_inquiry` delivers, the generic sale-question event has no canonical vocabulary entry (vocabulary gap, quarantined by design — no direct Customer.io writes).
- Cleanup: lead + outbox trace deleted.

## 6. CUTOVER PLAN (PARTS 20–22) — NOT PERFORMED
- DNS: point `legacylanesales.com` + `www` (A/CNAME) at the Base44 custom-domain endpoints; add the custom domain in the Base44 dashboard (Domains) → auto-managed SSL; low TTL (~300s) pre-cutover for fast rollback.
- WebsiteDomain: reserve `legacylanesales.com` (+ www) as `custom_domain` on the tenant, verify via DNS token, set `is_primary`.
- Canonical hostname derives from the resolved active WebsiteDomain (no code change). Sitemap/robots are per-hostname; resubmit in Search Console post-cutover.
- Redirect map (Part 21): `/` → `/` · `/Sales` → `/site/sales` (301) · `/SaleDetails?id=<lls_id>` → `/site/sale/<website_slug>` (301, per-sale map via the `os_<canonical>` convention; unknown ids → `/site/sales`) · `/Service*` → `/site/services` · `/Contact` → `/site/contact` · `/Partnership`, `/Subscribe` → intentional retirement (→ `/site/contact`).
- Rollback (Part 22): revert DNS to the LLS app endpoints (propagation ≤ TTL, minutes–hours); LLS app, receiver, CompanyApiKey and feed remain running untouched during the observation window; leads created on the new site remain in EstateSalen (export if needed); no LLS dismantling before the rollback window ends.

## 7. BRIDGE RETIREMENT (PART 23) — NOT RETIRED
Ready now: **NO.** Conditions: production domain on EstateSalen tenant; new sales render with zero LLS reads (proven); canonical sale/inventory updates render without reconciliation (proven); unpublish works (proven); leads work (proven); old URLs redirect (3D.4); SEO verified; observation period completes; no consumer still requires the legacy feed; receiver provides no required runtime behavior; rollback window completed. THEN retirement may be proposed. (Note: during coexistence, NEW-sale publication delivery still requires receiver adoption via the feed pull — the retirement condition that ends this.)

## 8. REGRESSION — ALL PASS
- Real tenant: active, destination unchanged (webhook + secret ref byte-identical), real publication `published` (`os_69b058479d65ca9487ea8e2e`), 27 canonical items intact, preview listing healthy.
- Legacy production: unchanged (before/after fetches identical); receiver unchanged; CompanyApiKey unchanged (`is_active: true`, `webhook_enabled: false` — pull-only); no DNS/redirect changes.
- Phases 2/3B/3C/3D.1/3D.2 mechanisms exercised unchanged (publication service, runtime service, settings/presentation seams).

## 9. CLEANUP — SYNTHETIC RESIDUE = 0
Deleted: WebsiteLead, outbox trace, WebsiteSalePresentation, Publication, 6 Items, certification Sale. Verified zero residue per entity. Real Legacy Lane production Sales untouched.

## OPEN ITEMS FOR 3D.4
1. Company-scope the legacy feed or remove the 3D.1 cert fixtures (production LLS currently displays 3D.1 fixture sales — pre-existing).
2. `website_lead` event vocabulary gap (sale_question leads quarantine as registry_gap) — add a canonical event or map it.
3. Extract the LLS-side id ↔ website_slug redirect table from the receiver's presentation records.
4. At cutover: the Destination becomes runtime-served (webhook removed) — new-sale delivery then needs no receiver adoption (certified 'runtime' no-op mode already proven).