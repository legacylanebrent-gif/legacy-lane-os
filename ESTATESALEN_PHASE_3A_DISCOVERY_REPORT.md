# ESTATESALEN — PHASE 3A DISCOVERY REPORT
# OPERATOR WEBSITE TENANT ENGINE — DISCOVERY, PRODUCT ARCHITECTURE & BUILD PLAN

Status: DISCOVERY ONLY — no entities created, no code changed, Publication untouched, legacy bridge untouched.
Evidence basis: live production audit of the certified Phase 2 architecture (Company 6acbbf22de3c0f719679038d, Destination 6acbc7657ddd5307aa98094b, Publication 6acbc7b902d141675d6dd9d5), shared publication modules, sync workflows, entitlement/lead/outbox entities, and platform domain documentation.

---

## 0. PRODUCTION EVIDENCE CAPTURED (Part 1–2)

### Company record (Legacy Lane Estates LLC, 6acbbf22de3c0f719679038d)
- Identity: legal_name, display_name, status=active
- Contact: email, phone 7329390600, address/city/state/postal (49 Cherry Tree Farm Rd, Middletown, NJ 07748)
- Ownership: primary_contact_user_id + member_user_ids = [69471383fc72e5b50c72fcc8] (single member)
- website_url: null · logo_url: empty · social profiles: NONE stored on Company · service_area_notes: empty
- notes: used

### Relationships audited
| Relationship | Finding |
|---|---|
| Destinations | Exactly 1: "Legacy Lane Sales Website", operator_website, active, capabilities [sale_details, inventory, media, pricing, sold_status, cancellation, completion], config keys [webhook_url, auth_secret_name, presentation_id_convention] |
| Publications | 1 total, 1 published, anchored to the single Destination |
| CompanyApiKey | 1 active (legacy feed bridge) |
| Subscription | 1 active: plan_type=operator_enterprise, tier=premium, monthly — entitlement state EXISTS today |

### Destination model verdict (Part 2)
- Admin-only RLS for all ops; company_id required (cross-company enforcement).
- Configuration stores non-secret config + secret BY NAME (auth_secret_name) — secrets never in the record. Adapter registry is extensible (destination_type is a free string with reserved values).
- Adapter behavior is correctly decoupled: no webhook configured = relationship waits (fail-closed, no retry); sanitized receiver ack capture exists.
- One Company CAN own multiple Destinations today with zero schema change (company_id is a plain reference; nothing enforces 1:1).
- SHOULD WEBSITE TENANT AND DESTINATION BE THE SAME ENTITY? **NO.** Proven: Destination is a delivery target (webhook/adapter/secret semantics), fully decoupled from presentation. A WebsiteTenant is a product instance (branding, pages, theme, domain, entitlement). Overloading Destination would (a) pollute the frozen publication architecture, (b) mix secret/config concerns with CMS concerns, (c) make "website without publishing" (draft state) impossible.

### Publication sync engine (Part 7/29 evidence)
- "Publication Sync on Sale Change" fires on EstateSale create+update → syncSalePublications — which is **fail-closed create-never**: it republishes ONLY existing Publications.
- publishSale is user-invoked (publish/unpublish/status).
- Therefore: a brand-new Sale today gets NO website presence unless someone calls publishSale. This is the Part 29 gap, confirmed in code.

---

## 1. CURRENT ARCHITECTURE READINESS

**Score: 62/100**

Certified and reusable: canonical Company (+RLS), Destination (admin-only, secret-by-name, adapter registry), Publication (idempotent, lifecycle, source_version), payload builder (privacy-filtered), sync workflows, CompanyApiKey, Subscription/entitlement entity, IdentityActivityOutbox + enqueueCanonicalActivity, lead entities + routing, admin data-table patterns, PageAccess role gating.

Missing: WebsiteTenant entity, multi-tenant runtime, template/theme layer, provisioning flow, Website Manager UI, auto-publish-on-new-sale, domain automation, tenant analytics, health rollup.

**Verdict:** Foundation is production-proven and correctly frozen; Phase 3 adds a presentation/product layer ON TOP of it, not inside it.

---

## 2. CAN PHASE 2 PUBLICATION ARCHITECTURE REMAIN UNCHANGED?

**YES**

Evidence:
- destinationAdapters.ts is a registry keyed by destination_type — a website runtime needs no new adapter if it renders from canonical data + Publication state in-app; a receiver-based path already exists.
- Destination.destination_type is extensible (operator_website remains valid); no schema change needed.
- Publication is destination-anchored and company-anchored — a WebsiteTenant referencing destination_id composes cleanly without touching Publication.
- The single additive change ever required would be a website_tenant_id annotation for observability only — not required for MVP and NOT recommended while the architecture is frozen.

---

## 3. RECOMMENDED WEBSITE RUNTIME

**B — one multi-tenant runtime resolving tenant by hostname** (with an explicitly documented platform dependency; Option C hybrid is the fallback, see §14).

Reason:
- Thousands of cloned Base44 apps (A) is unmaintainable: template upgrades × N, security scans × N, publish cycles × N.
- B reuses the certified runtime: Company→WebsiteTenant→Destination→Publication all in one DB; tenant resolution = read hostname → lookup WebsiteTenant → render.
- Presentation creation for new Sales becomes trivial under B: the runtime renders from canonical data gated by Publication status; no per-sale receiver "presentation record" to create — the Phase 2B adopt-only limitation disappears for every NEW tenant.
- Tenant isolation is enforced by RLS + server-side authorization, the same patterns already certified.
- SEO: SPA rendering is a known constraint of this platform; the existing SEO engine (hub pages, schema_json, submitPageToIndex, sitemap/robotsTxt functions) already operates under the same constraint and is reusable.

---

## 4. WEBSITE TENANT MODEL

**Recommended entity: WebsiteTenant** (new, Part 32)

- Cardinality: Company 1 → 0..N WebsiteTenant (architecture supports N from day one; entitlement may cap at 1). WebsiteTenant 1 → 1 operator_website Destination (MVP constraint; N Destinations per tenant deferred — e.g. social/marketplace destinations are future destination_types, not tenant concepts).
- Relationship to Company: company_id required; RLS mirrors Company pattern (primary_contact_user_id / member_user_ids / created_by_id, admin override). Company deletion does NOT cascade-delete tenants (suspend instead).
- Relationship to Destination: **WebsiteTenant holds destination_id (tenant → destination, one-directional).** Destination stays tenant-agnostic (frozen). Uniqueness: one active tenant per destination enforced server-side in provisioning.
- Lifecycle: setup → draft → live → suspended → archived (+ domain states independently). Suspend = hide website + set tenant status; Publication rows and history are RETAINED (status survives: published stays published in history, but the runtime stops serving the tenant, and publications may be marked suspended).

---

## 5. FIELD OWNERSHIP MATRIX

| Category | Owner | Class |
|---|---|---|
| Sale id/title/dates/hours/address/status, sale lifecycle | EstateSalen (EstateSale) | 1 CANONICAL |
| Item identity/price/final price/sold/cancel/completion | EstateSalen (Item) | 1 CANONICAL |
| Company identity, members, roles, contact facts | EstateSalen (Company) | 1 CANONICAL |
| Publication lifecycle/status/external_reference/source_version | EstateSalen (Publication) | 1 CANONICAL |
| Lead records, consent evidence | EstateSalen (canonical lead + outbox) | 1 CANONICAL |
| Logo/colors/fonts/hero/about/contact copy/nav/footer/favicon/CTA wording/SEO title templates/meta descriptions/analytics IDs | WebsiteTenant settings | 2 WEBSITE TENANT |
| Featured items, image order, local captions, featured sale ordering, sale-page marketing intro, show-prices/show-sold toggles | WebsiteTenant (sale/inventory presentation settings) | 3 PRESENTATION OVERRIDE |
| Computed: current source_version, health status, lead counts, analytics rollups, subdomain URL | Derived | 4 DERIVED |
| Domain verification state, tenant suspension, entitlement enforcement, template registry | Admin/System | 5 ADMIN/SYSTEM |
| Sale title for display vs operational, item names, prices, sold state, canonical facts on tenant | — | 6 PROHIBITED DUPLICATION |

Rule: the tenant NEVER stores a copy of any canonical fact; it stores only presentation directives. Rendering = canonical data + tenant presentation overrides.

---

## 6. PROPOSED DATA MODEL (Part 32; none created)

| Entity | Status | Purpose / Key fields / RLS / Lifecycle |
|---|---|---|
| Company | EXISTS (frozen) | Canonical owner. Unchanged. |
| WebsiteTenant | NEW · MVP | company_id, name, slug (immutable after launch, system-verified unique), status lifecycle, website_type, template_id, theme_id, primary_domain, default_subdomain, destination_id, entitlement_ref (derived read), launched_at/suspended_at/archived_at, settings (object: pages/nav/branding). RLS: member/primary-contact/admin; create via provisioning function only. |
| WebsiteTemplate | NEW · MVP (registry) | Structural layout registry: id, key, version, status (draft/released/deprecated), pages/layout manifest. Admin-managed, versioned, immutable-after-release, forkable. |
| WebsiteTheme | NEW · MVP (registry) | Visual tokens: colors/fonts/spacing presets. Admin-managed; tenant stores theme_id + override tokens. |
| WebsiteTenantSettings | FOLD INTO WebsiteTenant.settings (NOT a separate entity for MVP) | Avoids a second write surface and versioning fork; revisit only if settings grow past entity-field limits. |
| WebsiteDomain | NEW · MVP (state machine) | tenant_id, hostname, role (apex/www/custom), state (requested → verification_pending → verified → provisioning → active → error → disconnected), last_checked, error. Admin/tenant RLS by membership. |
| Destination | EXISTS (frozen) | Unchanged. Created by provisioning (admin context). |
| Publication | EXISTS (frozen) | Unchanged. |
| EstateSale / Item | EXISTS (frozen) | Canonical truth. |
| WebsiteLead | NEW · MVP | tenant_id, company_id, sale_id?, form_type (seller_inquiry/contact/vip_signup/sale_question/consultation), name/email/phone/message, consent_context, source/referrer, status. Single shared table — attribution columns prevent "per-website silos". Feeds enqueueCanonicalActivity. |
| WebsiteAnalyticsEvent | NEW · FUTURE | Tenant/sale-scoped counters; vendor TBD by existing architecture (base44.analytics exists platform-side). |
| Subscription | EXISTS | Entitlement consumed via derived check — no pricing on tenant. |

---

## 7. NEW-SALE PRESENTATION GAP (Part 29) — CRITICAL

**Current state (proven in code):** sync workflows fire on EstateSale create+update but syncSalePublications never creates Publications; publishSale is user-invoked; the LLS receiver was adopt-only (Phase 2B limitation). A new Sale reaches a website only through manual publish + (for LLS) legacy-bridge-created presentation.

**Required Phase 3 solution:**
1. `publishSaleToWebsites(sale_id)` — server-side function: resolve Company → active WebsiteTenants → ensure Publication per tenant destination (idempotent, reusing publicationService.publishSale) → adapter delivery (no-op for in-app runtime B).
2. Auto-publish wiring (Option C): website-level `auto_publish_all_sales` (default ON for MVP simplicity of launch) + per-sale override (sale.do_not_publish flag or publish button). New entity-trigger workflow on EstateSale create (and eligible status transition to upcoming/active) calls the function. No Publication redesign — publicationService already handles idempotent create/reuse.
3. Runtime B renders sale pages from canonical data gated by Publication existence/status — presentation is generated at render, so no receiver "create presentation" step exists for new tenants. LLS keeps its receiver until migrated (3K).
4. Strict separation: canonical Sale creation stays exactly as-is; this path only creates the publication GRANT (Presentation ≠ canonical authority).

---

## 8. CREATE MY WEBSITE FLOW (Part 8)

Automatic: tenant record + slug reservation + subdomain assignment + default template/theme + branding import from Company (logo/name/address/contact) + Destination creation (service role) + default pages + auto-publish ON.
Operator input: template choice (one screen, default preselected), branding tweaks, contact email, auto-publish preference.
Admin approval: NOT required for MVP (entitlement check is the gate); required only for custom domain connection (manual platform step initially).
Asynchronous: template import render/preview generation.
Rollback: provisioning is transactional by ordering — tenant created in `setup` status; Destination only created after tenant passes validation; failure leaves an orphan `setup` tenant (harmless, deletable by admin). Slugs reserved only on commit.
Easy button: 2 screens (confirm → preview) + publish button.

## 9. SUBDOMAIN STRATEGY (Part 9)

Recommend `operator-slug.estatesalen.com` (or a dedicated sites domain e.g. `estatesalen.site` to keep the main domain's SEO/cookie space clean — Brent decision). Slug: system-generated from display_name, unique-checked server-side, immutable post-launch; reserved list (www, app, admin, api, mail, probate, blog, items, companies, learn...). Renames never change the slug (SEO stability). SSL: platform issues certs per connected exact subdomain (no wildcards — 150-domain cap, see §14). Routing: hostname → tenant lookup, 404 page for unknown hostnames.

## 10. CUSTOM DOMAIN ARCHITECTURE (Part 10)

State machine on WebsiteDomain (§6). Application side: ownership check (one hostname across all tenants), verification via DNS TXT/CNAME check, redirect behavior (www↔apex canonical), disconnect = release hostname, suspended/expired tenant → site down, domain state → error, reactivation restores. Platform dependency: each custom domain must be connected to THIS app via the platform Domains page (up to 150 total, manual admin step today) — Base44 does not expose domain automation; SSL is issued per exact connected hostname. No assumption of API-driven DNS.

## 11. TEMPLATE / THEME / CONTENT (Parts 11–12)

Template = structure (pages, sections, layout) — versioned, immutable after release, centrally maintained, forkable for tenant overrides; upgrade = re-render against new template version with tenant settings preserved (opt-in migration). Theme = token preset. Tenant Content = settings object. Canonical Content = Sales/Inventory.
MVP pages — REQUIRED: Home, Upcoming Sales, Sale Detail, About, Contact, Privacy/Terms (legal), plus Sell With Us (lead form). OPTIONAL: Services, FAQs. FUTURE: Past Sales, Testimonials, Blog, Resources, VIP portal, mailing-list center.

## 12. SALE DETAIL + INVENTORY (Parts 13–14)

Sale page = canonical facts (title, address, dates/hours, description, policies) rendered from EstateSale + presentation layer (hero selection, featured items, intro copy, CTA) from tenant settings. Inventory = canonical items rendered with tenant presentation controls (show prices default ON, show sold items toggle default ON with sold badge, grid default, category filter, search server-side via $regex, item gallery, item modal — no separate item pages MVP). NO duplication: sold state, prices, availability always read live from canonical + publication gating.

## 13. LEADS + CUSTOMER.IO (Parts 15–16)

All website forms → WebsiteLead (shared, attributed: company_id, website_tenant_id, sale_id?, form_type, source_url/referrer, consent captured at submission) → enqueueCanonicalActivity (existing certified path; event vocabulary: seller_inquiry, vip_signup, contact) → IdentityActivityOutbox → Houszu. NO direct Customer.io writes (existing guardrail preserved). Lead visibility: company members via RLS; admins platform-wide. No per-website lead silos.

## 14. PLATFORM DEPENDENCIES (must be proven before/during Phase 3)

1. **Hostname-based tenant resolution in one app** — docs confirm up to 150 domains/subdomains per app but do NOT document how (or whether) the platform routes differing hostnames into one app's runtime. MVP verification: connect one subdomain, confirm the app sees the hostname (client `window.location.hostname` + server Host header).
2. **No wildcard subdomains** — each operator subdomain must be individually connected; 150-domain ceiling is a real scale constraint (§16).
3. **SSL per exact hostname** — automatic per connected subdomain; fine for ≤150.
4. **SPA SEO** — same constraint as existing SEO engine; reuse established pattern.
5. **Entitlement/billing** — Subscription entity exists; operator_website entitlement level is a product decision, not a platform build.

## 15. SECURITY ASSESSMENT (Part 22)

Reusable: Company RLS pattern (member/primary/admin), Destination+Publication admin-only RLS, server-side authorization in publishSale (sale-actor checks), secrets-by-name (never in records), privacy-filtered payload builder, sanitized diagnostics, outbox guardrails.
Missing (Phase 3B scope): WebsiteTenant RLS (mirror Company pattern), server-side tenant-scope checks in every runtime read (tenant→company→membership chain), provisioning as the ONLY tenant-creation path (service role, entitlement-checked), WebsiteLead RLS (member read + own-write), slug/hostname uniqueness enforcement server-side, frontend-hiding explicitly insufficient (all enforcement server-side).
Cross-tenant invariants: Company A can never read/render/lead-claim Company B data — enforced at render-time authorization and RLS, not navigation.

## 16. SCALE ASSESSMENT (Part 31)

- 100 websites: fully supported by Option B. Domain cap irrelevant (subdomains ≤150 OK at pilots).
- 1,000 websites: runtime fine (DB lookups by hostname, indexed); subdomain connection per-tenant becomes an operational drag (manual) — needs automation or platform wildcard; 150-domain cap EXCEEDED for subdomain-per-tenant ⇒ mitigate with single sites-domain path routing (e.g. path/query fallback) OR platform wildcard dependency. Custom domains also capped at 150 across the platform.
- 5,000 websites: requires either platform wildcard-subdomain support or a separate multi-tenant sites domain with non-hostname tenant routing; Publication/Publication-driven rendering fine (aggregate queries); analytics needs the event abstraction, not per-view entity writes.

## 17. SUSPENSION / LIFECYCLE (Parts 20–21)

Entitlement ends → tenant status suspended (site down, DNS/custom domain disconnected or parked, publications retained with suspended marker, leads retained, canonical data untouched). Reactivation restores state. No destructive deletion of canonical Sales/Inventory/Publications ever; archived tenant = final state after explicit export.

## 18. OBSERVABILITY + ADMIN (Parts 23–24)

Tenant health = derived (no new state): healthy / setup / publication_error (any Publication failed), domain_error (WebsiteDomain error), entitlement_error (subscription inactive), suspended. Admin center: tenants table (company, status, domain, template, publication health, last publish, lead count), suspend/restore, domain troubleshooting, re-provision, template migration. Operator Website Manager sections: Overview, Branding, Pages, Sales, Domain, Leads, Settings, Preview, Publish (Analytics + SEO advanced = later waves). Preview/draft: MVP = settings save → instant preview in-app → explicit Publish Live (single published settings version). Versioning: MVP = published settings version integer + template version pin; full draft/publish diff = future.

## 19. SEO (Part 25)

Canonical sale facts stay canonical; tenant owns title templates, meta descriptions, OG images, canonical URL choice (subdomain vs custom domain), sitemap inclusion. Sale pages emit JSON-LD (schema_json pattern exists). Redirects + canonicalization on domain changes. Sitemap/robots: extend existing sitemap/robotsTxt functions per tenant.

## 20. LLS MIGRATION STRATEGY (Parts 27–28)

Tenant #1 migration (when 3K runs): create WebsiteTenant for Company 6acbbf22de3c0f719679038d → associate EXISTING Destination 6acbc7657ddd5307aa98094b → adopt current LLS presentation/branding into tenant settings → keep destination receiver delivery during transition (bridge stays) → cut over when runtime renders all 7 sales from canonical data → then apply bridge-retirement gate.
Retirement criteria (certification checklist): 1) LLS tenant live on runtime; 2) all LLS sales Publication-backed; 3) new Sale appears via auto-publish without bridge; 4) inventory updates propagate; 5) sold/cancel/complete propagate; 6) website renders without snapshot feed; 7) 14-day monitoring (publication health clean); 8) rollback = re-enable bridge (receiver + feed keys intact, not deleted). Certification recorded as a report + PunchListItem before deleteMany of bridge config (never delete secrets).

## 21. IMPLEMENTATION WAVES (Part 36)

| Wave | Objective | Gate |
|---|---|---|
| 3B | WebsiteTenant + WebsiteLead + WebsiteDomain entities, RLS, server-side scope checks | Cross-tenant isolation test |
| 3C | Multi-tenant runtime + hostname resolution (platform dependency #1 proven) | One subdomain resolves tenant |
| 3E | Canonical Sale/Inventory rendering + publishSaleToWebsites + auto-publish workflow (closes §7 gap) | New sale appears without bridge |
| 3D | Template/theme abstraction from LLS reference (needs LLS audit §23) | LLS-equivalent rendering |
| 3F | Website Manager (operator admin UI) | Nontechnical operator edits branding |
| 3G | Provisioning / Create My Website | Easy-button flow E2E |
| 3H | Subdomain + custom domain states | Domain state machine live |
| 3I | Lead capture + outbox events | WebsiteLead → outbox certified |
| 3J | Entitlements + suspension lifecycle | Suspension/restore E2E |
| 3K | LLS Tenant #1 migration | Runtime replaces receiver path |
| 3L | Production certification + bridge retirement gate | Retirement checklist pass |

(3E before 3D: rendering the canonical data is the harder dependency and unblocks the gap; LLS template abstraction benefits from the LLS audit performed in parallel.)

## 22. MVP DEFINITION (Part 37)

IN: entitlement gate (existing Subscription), Create My Website (2 screens), 1 template + 2 themes, branding (logo/colors/about/contact), pages from §11 REQUIRED list, EstateSalen-hosted subdomain, auto-publish ON default + per-sale override, canonical sale + inventory rendering with presentation toggles, seller-inquiry + VIP forms (WebsiteLead + outbox), Website Manager core sections, preview + publish, suspension lifecycle, admin tenants table.
OUT (explicitly): custom domain automation (manual platform step, phase 3H+), template marketplace, page builder/drag-drop, blogs, draft/publish diffing + rollback UI, per-tenant analytics dashboards, A/B, multi-template per tenant, multiple websites per tenant UI (arch supports it; entitlement defaults to 1), VIP portal, past-sales archive pages, SEO sitemap per tenant (v1.1), dark mode.

## 23. PRODUCT DECISIONS FOR BRENT (Part 38)

1. Subdomain brand: `*.estatesalen.com` vs dedicated sites domain (e.g. estatesalen.site). Default: dedicated sites domain (cleaner SEO/cookie separation). Consequence: domain purchase + platform connection.
2. Auto-publish default: ON (Option C) vs OFF. Default: ON — "create once, publish everywhere" promise. Consequence: OFF would reintroduce per-sale manual work.
3. Custom domain in MVP: yes-with-manual-step vs deferred. Default: manual-step supported in 3H (platform dependency documented).
4. Lead entity: new shared WebsiteLead (recommended) vs reuse EstateTransitionLead. Default: WebsiteLead (EstateTransitionLead is probate/life-event-shaped; overloading it violates no-overload principle).
5. Suspension policy timeline: suspend immediately on payment failure vs grace period. Default: 7-day grace then suspend.

## 24. LLS REFERENCE AUDIT (Part 34)

EstateSalen CANNOT inspect the Legacy Lane Sales app directly (separate Base44 app; cross-app SDK access previously returned 401 — recorded dead end). No guessing. Ready-to-paste audit prompt below.

---

### LLS PHASE 3 REFERENCE-TENANT AUDIT PROMPT (paste into the Legacy Lane Sales Base44 app)

# LLS — PHASE 3 REFERENCE-TENANT AUDIT (TENANT #1 TEMPLATE ABSTRACTION)
This is a READ-ONLY audit. Do NOT create entities. Do NOT modify anything. Return an evidence-based report.

Audit and report on:
1. PAGES: full route list (App.jsx), purpose of each, which are public vs auth-gated.
2. COMPONENTS: inventory of reusable presentation components (cards, grids, sale detail, inventory gallery, hero, nav, footer, forms) vs Legacy Lane-specific ones.
3. NAVIGATION: nav structure and labels.
4. BRANDING: where logo, colors, fonts, favicon are defined (hardcoded vs tokens/config). Exact values.
5. DATA SOURCES: for each page — which entity/function/webhook it reads. Flag any local DB entities that duplicate canonical EstateSalen data (sales, items, companies).
6. SALE PRESENTATION: how a sale page renders; which fields are displayed; hero image selection; policies/directions rendering.
7. INVENTORY PRESENTATION: grid/list behavior, sold handling, price display, filters, search, item detail.
8. FORMS + LEAD CAPTURE: every form (contact, seller inquiry, VIP, questions), where submissions are stored, where they are forwarded (note anything that writes to EstateSalen or third parties).
9. SEO: title/meta handling, structured data, sitemap, robots, canonical URLs, custom domain configuration.
10. ADMIN: any admin UI in LLS and what it manages.
11. PRESENTATION SETTINGS: any configurable presentation state (vs hardcoded).
12. HARDCODED LEGACY LANE REFERENCES: every hardcoded string/asset specific to LLS (would break template abstraction).
13. LEGACY BRIDGE DEPENDENCIES: code depending on the snapshot feed / push webhook / LEGACY_SHARED_API_KEY; the collision guard implementation (publication-managed skip logic) — exact file and logic.
14. CANONICAL PUBLICATION DEPENDENCIES: receivePublication handler, what it stores (presentation records schema), provenance stamps, adopt-only path for new sales (Phase 2B limitation) — exact code path.
15. DIAGNOSTIC PROBES: any diagnostic probe endpoints/functions created during Phase 2 debugging that should be deleted (cleanup list).
16. OBSOLETE CODE: anything superseded by canonical publication delivery.
17. TEMPLATE CANDIDACY: propose which pages/components could become "WebsiteTemplate #1" structure vs which are tenant content, and list what must move to tenant settings.
Return the report with file paths as evidence for every claim.

---

# FINAL GATE

## READY TO BUILD PHASE 3B — CORE WEBSITE TENANT MODEL
**YES** — conditioned on nothing in 3B touching the frozen Phase 2 architecture.

Phase 3B should implement:
- Entities: WebsiteTenant, WebsiteLead, WebsiteDomain (schemas + RLS mirroring the Company ownership pattern; Destination/Publication remain admin-only).
- Security boundaries: tenant→company→membership server-side authorization chain; provisioning as sole tenant-creation path (entitlement-checked, service role); slug/hostname uniqueness; WebsiteLead member-scope RLS; explicit cross-tenant isolation tests.
- Plus the minimal server scope helpers shared by later waves (base44/shared/websiteTenantService.ts), no runtime, no provisioning UI, no templates yet.