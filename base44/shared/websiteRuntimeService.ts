// Shared multi-tenant website RUNTIME service (Phase 3C).
// ONE runtime architecture for ALL operator websites:
//   hostname → WebsiteDomain → WebsiteTenant → Company → Destination → Publication-aware content.
// Everything public is derived from the hostname alone. Client-supplied
// tenant/company/destination ids are NEVER trusted for resolution.
// Reuses the CERTIFIED Phase 2 publication privacy allowlists
// (publicationPayload.publicSale / publicItem) — one source of privacy truth.
import { normalizeHostname } from './websiteTenantService.ts';
import { computeSourceVersion, publicSale, publicItem, stripMarkdownBody, stripMarkdownText } from './publicationPayload.ts';
import { getTenantSettings, projectPublicSettings } from './websiteSettingsService.ts';
import { getActivePresentation, projectPublicPresentation } from './websiteSalePresentationService.ts';

// ── Cache (Part 26) ──────────────────────────────────────────────────────────
// Every cache key carries tenant/domain identity. Never cache by path alone.
const SALES_CACHE_TTL_MS = 30000;
const CTX_CACHE_TTL_MS = 5000; // suspension/lifecycle propagation bound: ≤5s
const cache = new Map();
function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.exp) { cache.delete(key); return null; }
  return entry.value;
}
function cacheSet(key, value, ttl) { cache.set(key, { value, exp: Date.now() + (ttl || SALES_CACHE_TTL_MS) }); }
export function clearWebsiteRuntimeCache() { cache.clear(); }

// ── Lifecycle policy (Parts 5/6/7) ───────────────────────────────────────────
// Domain: only 'active' is routable. All other states (reserved,
// verification_pending, verified, provisioning, error, disconnected) → neutral
// unavailable. Tenant: only 'active' serves ('setup' = not publicly live,
// suspended/archived = unavailable, data retained). Company: only 'active'.
export function domainRoutable(domain) { return !!domain && domain.status === 'active'; }

// ── Resolver (Parts 3/4/21/22/23/24) ─────────────────────────────────────────
// Platform subdomains and future custom domains resolve through the SAME chain.
export async function resolveWebsiteTenant(service, rawHost) {
  const hostname = normalizeHostname(rawHost);
  if (!hostname) return { ok: false, error: 'malformed_host' }; // Part 44 — no wildcard, no fallback

  const ctxKey = `ctx:${hostname}`;
  const hit = cacheGet(ctxKey);
  if (hit) return hit;

  // Part 24 — ambiguity defense: fail closed, never pick "the first one".
  const domPage = await service.entities.WebsiteDomain.filter({ hostname }, { limit: 5 });
  const candidates = (domPage.items || domPage).filter(d => d.status !== 'disconnected'); // disconnected rows are tombstones
  if (candidates.length === 0) { const r = { ok: false, error: 'unknown_host' }; cacheSet(ctxKey, r, 5000); return r; } // Part 23
  if (candidates.length > 1) {
    console.error(`[websiteRuntime] AMBIGUOUS HOST '${hostname}': ${candidates.length} candidate domains (${candidates.map(d => d.id).join(', ')})`);
    return { ok: false, error: 'ambiguous_host' };
  }
  const domain = candidates[0];
  if (!domainRoutable(domain)) return { ok: false, error: 'site_unavailable' }; // Part 5

  // Part 4 — relationship validation, fail closed on mismatch.
  const tenant = await service.entities.WebsiteTenant.get(domain.website_tenant_id).catch(() => null);
  if (!tenant || domain.company_id !== tenant.company_id) {
    console.error(`[websiteRuntime] CONFIG ERROR: domain ${domain.id} → tenant/ownership mismatch for '${hostname}'`);
    return { ok: false, error: 'config_error' };
  }
  if (tenant.status === 'setup') return { ok: false, error: 'site_not_live' }; // Part 6
  if (tenant.status !== 'active') return { ok: false, error: 'site_unavailable' }; // suspended / archived

  // Part 7 — Company lifecycle gate.
  const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
  if (!company || company.status !== 'active') return { ok: false, error: 'site_unavailable' };

  // Part 14 — Destination association (safe resolution; secrets never leave).
  let destination = null;
  if (tenant.destination_id) {
    destination = await service.entities.Destination.get(tenant.destination_id).catch(() => null);
    if (!destination || destination.company_id !== tenant.company_id || destination.status !== 'active') {
      destination = null; // invalid association → site serves, zero published sales; diagnostics flag it
    }
  }

  const ctx = { ok: true, hostname, domain, tenant, company, destination };
  cacheSet(ctxKey, ctx, CTX_CACHE_TTL_MS);
  return ctx;
}

// ── Canonical data access (Parts 11/16/17) ───────────────────────────────────
export async function getCanonicalItems(service, saleId) {
  const page = await service.entities.Item.filter({ estate_sale_id: saleId }, { limit: 1000 });
  return page.items || page;
}

// ── Publication-aware visibility (Parts 12/13/15) ────────────────────────────
// ONLY Publication rows with status 'published' to THIS tenant's Destination
// make a Sale website-visible. Company ownership of a Sale is NOT sufficient.
// Currentness (source_version vs canonical signature) is computed and carried
// internally (_currentness); failed/pending publications are never treated as
// published because they are filtered out at query time.
export async function getPublishedSales(service, ctx) {
  if (!ctx.ok || !ctx.destination) return [];
  // Fresh, cheap publication query every call — the fingerprint cache below
  // only avoids re-fetching expensive sale + inventory projections.
  const pubPage = await service.entities.Publication.filter(
    { destination_id: ctx.destination.id, status: 'published' }, { limit: 200, sort: '-published_at' });
  const pubs = pubPage.items || pubPage;
  const fingerprint = pubs.map(p => `${p.id}:${p.status}:${p.source_version || ''}`).join('|');
  const cacheKey = `t:${ctx.tenant.id}:sales`;
  const hit = cacheGet(cacheKey);
  if (hit && hit.fingerprint === fingerprint) return hit.sales;

  // Phase 4C lifecycle policy (Parts 5/35/36): on LLBB websites a canonical
  // Sale that is draft, archived (cancelled) or address-less/internal is never
  // publicly rendered — even when a stale publication exists. Legacy tenants
  // (pre-LLBB, e.g. production Legacy Lane) keep their certified behavior.
  const llbbLifecycle = ctx.tenant.created_via === 'llbb';

  const sales = [];
  for (const pub of pubs) {
    if (pub.company_id !== ctx.tenant.company_id) {
      console.error(`[websiteRuntime] cross-company publication ${pub.id} on destination ${ctx.destination.id} — skipped`);
      continue;
    }
    const sale = await service.entities.EstateSale.get(pub.sale_id).catch(() => null);
    if (!sale || sale.company_id !== ctx.tenant.company_id) {
      console.error(`[websiteRuntime] cross-company sale on published publication ${pub.id} — skipped`);
      continue; // fail closed per-record
    }
    if (llbbLifecycle && (sale.status === 'draft' || sale.status === 'archived')) {
      console.log(`[websiteRuntime] llbb lifecycle policy: hidden ${sale.status} sale on publication ${pub.id}`);
      continue; // cancelled/archived sales must never appear active
    }
    const items = await getCanonicalItems(service, sale.id);
    sales.push({
      _raw: sale,
      _currentness: pub.source_version === computeSourceVersion(sale, items) ? 'current' : 'stale',
      ...projectPublicSale(sale)
    });
  }
  cacheSet(cacheKey, { fingerprint, sales });
  return sales;
}

export async function getPublishedSale(service, ctx, publicId) {
  const wanted = String(publicId || '').trim().toLowerCase();
  if (!wanted) return null;
  const sales = await getPublishedSales(service, ctx);
  const match = sales.find(s => s._raw && ((s._raw.seo_slug || '').toLowerCase() === wanted || (s._raw.website_slug || '').toLowerCase() === wanted || s._raw.id === publicId));
  if (!match) return null; // cross-tenant sale identifiers resolve to nothing (Parts 35/36)
  const items = await getCanonicalItems(service, match._raw.id);
  return {
    _raw_id: match._raw.id,
    _currentness: match._currentness,
    sale: projectPublicSale(match._raw),
    inventory: projectPublicInventory(items)
  };
}

// ── Public projections (Parts 9/10/18/20) ────────────────────────────────────
// Tenant projection: name + platform slug only. NEVER: status_reason,
// entitlement_tier, member_user_ids, idempotency_key, destination internals.
// Company projection: display name, logo, public website, city/state only.
// NEVER: email, phone, street address, notes, membership, status internals.
export function projectPublicSale(sale) {
  const p = publicSale(sale);
  const metaDesc = stripMarkdownText(p.description);
  return {
    public_id: sale.website_slug || sale.seo_slug || sale.id, // Part 20 — prefer the Company-scoped unique website_slug, fall back to legacy seo_slug, then opaque id
    title: p.title,
    description: stripMarkdownBody(p.description),
    meta_description: metaDesc ? metaDesc.slice(0, 300) : null,
    status: p.status,
    sale_type: p.sale_type,
    sale_dates: p.sale_dates,
    address: p.address,
    location: p.location,
    categories: p.categories,
    payment_methods: p.payment_methods,
    total_items: p.total_items,
    parking_info: p.parking_info,
    special_notes: p.special_notes,
    images: p.images
  };
}

// Inventory projection: certified publicItem allowlist minus routing-irrelevant
// fields; hidden inventory rows never render.
export function projectPublicInventory(items) {
  return (items || [])
    .filter(it => it.inventory_display_status !== 'hidden')
    .map(it => {
      const p = publicItem(it);
      return {
        public_id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        subcategory: p.subcategory,
        brand: p.brand,
        condition: p.condition,
        price: p.price,
        sold_status: p.sold_status,
        sold_price: p.sold_price,
        featured: p.featured,
        images: p.images
      };
    });
}

export function buildPublicCompanyContext(company) {
  return {
    display_name: company.display_name || company.legal_name || null,
    logo_url: company.logo_url || null,
    website_url: company.website_url || null,
    city: company.city || null,
    state: company.state || null
  };
}

// Strips internal diagnostics markers (_currentness, _raw) from public output.
export function stripInternalFields(entry) {
  if (!entry) return null;
  const { _currentness, _raw, ...rest } = entry;
  return rest;
}

export function buildPublicWebsiteContext({ ctx, sales, settings, template }) {
  return {
    hostname: ctx.hostname,
    site_name: ctx.tenant.name,
    tenant_slug: ctx.tenant.slug,
    company: buildPublicCompanyContext(ctx.company),
    template: template || null,
    settings: settings || null,
    published_sales: (sales || []).map(stripInternalFields),
    generated_at: new Date().toISOString()
  };
}

// ── Phase 3D.1 thin runtime projections (Parts 18/19/20/21) ──────────────────
// Five thin compositions over the CERTIFIED Phase 3C services — no new
// inventory service, no raw settings exposure, canonical data always wins.

// 1. Tenant/site configuration projection.
export async function getPublicSettingsForContext(service, ctx) {
  const settings = await getTenantSettings(service, ctx.tenant.id);
  return projectPublicSettings(settings, ctx.company);
}

// Presentation ordering: featured first (featured_order asc), then canonical
// published order. Presentation NEVER removes a sale from the collection.
export function orderSalesWithPresentation(entries) {
  const featured = entries
    .map((e, i) => ({ e, i }))
    .filter(x => x.e.presentation && x.e.presentation.featured)
    .sort((a, b) => {
      const ao = a.e.presentation.featured_order == null ? 999999 : a.e.presentation.featured_order;
      const bo = b.e.presentation.featured_order == null ? 999999 : b.e.presentation.featured_order;
      return ao - bo || a.i - b.i;
    })
    .map(x => x.e);
  const rest = entries.filter(e => !(e.presentation && e.presentation.featured));
  return [...featured, ...rest];
}

// 2. Public sale collection (+ optional presentation enhancement).
export async function listPublicSales(service, ctx) {
  const sales = await getPublishedSales(service, ctx);
  const out = [];
  for (const entry of sales) {
    const presentation = await getActivePresentation(service, ctx.tenant.id, entry._raw.id);
    out.push({ ...stripInternalFields(entry), presentation: projectPublicPresentation(presentation) });
  }
  return orderSalesWithPresentation(out);
}

// 3. Public sale detail — canonical wins; presentation contributes only
// approved website fields (Part 19).
export async function getPublicSaleDetail(service, ctx, slugOrId) {
  const result = await getPublishedSale(service, ctx, slugOrId);
  if (!result) return null;
  const presentation = await getActivePresentation(service, ctx.tenant.id, result._raw_id);
  return {
    _raw_id: result._raw_id,
    sale: result.sale,
    presentation: projectPublicPresentation(presentation),
    inventory: result.inventory,
    inventory_count: result.inventory.length
  };
}

// 4. Public inventory presentation — reuses the CERTIFIED canonical inventory
// projection via getPublishedSale (Part 20 — no new inventory service).
export async function getPublicInventory(service, ctx, slugOrId) {
  const result = await getPublishedSale(service, ctx, slugOrId);
  if (!result) return null;
  return {
    sale: {
      public_id: result.sale.public_id,
      title: result.sale.title,
      status: result.sale.status,
      sale_dates: result.sale.sale_dates
    },
    inventory: result.inventory
  };
}

// 5. Public lead/form context (Part 31) — trusted tenant-derived form context.
export async function getPublicLeadContext(service, ctx) {
  const settings = await getPublicSettingsForContext(service, ctx);
  const sales = await getPublishedSales(service, ctx);
  return {
    site_name: ctx.tenant.name,
    display_business_name: settings.display_business_name,
    contact: settings.contact,
    lead_types: ['seller_inquiry', 'contact', 'sale_question'],
    sales: sales.map(s => ({
      public_id: stripInternalFields(s).public_id,
      website_slug: s._raw.website_slug || null,
      title: s._raw.title || null
    }))
  };
}

// Sitemap entries (Part 37): ONLY publication-visible resources + static
// template paths, for the resolved hostname. Unpublished sales never appear.
export async function getPublicSitemapEntries(service, ctx) {
  const sales = await getPublishedSales(service, ctx);
  // FAQ is an optional page — never advertised when the tenant has no FAQ content.
  const settings = await getTenantSettings(service, ctx.tenant.id);
  const faqLive = !!(((settings && settings.faq && settings.faq.items) || []).length);
  const galleryLive = !!(((settings && settings.gallery && settings.gallery.items) || []).length);
  return {
    hostname: ctx.hostname,
    static_paths: ['/site', '/site/sales', '/site/about', '/site/services', '/site/contact', ...(faqLive ? ['/site/faq'] : []), ...(galleryLive ? ['/site/gallery'] : []), '/site/legal'],
    sales: sales.map(s => ({
      slug: s._raw.website_slug || stripInternalFields(s).public_id,
      updated_at: s._raw.updated_date || null
    }))
  };
}