// Shared multi-tenant website RUNTIME service (Phase 3C).
// ONE runtime architecture for ALL operator websites:
//   hostname → WebsiteDomain → WebsiteTenant → Company → Destination → Publication-aware content.
// Everything public is derived from the hostname alone. Client-supplied
// tenant/company/destination ids are NEVER trusted for resolution.
// Reuses the CERTIFIED Phase 2 publication privacy allowlists
// (publicationPayload.publicSale / publicItem) — one source of privacy truth.
import { normalizeHostname } from './websiteTenantService.ts';
import { computeSourceVersion, publicSale, publicItem } from './publicationPayload.ts';

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
  const match = sales.find(s => s._raw && ((s._raw.seo_slug || '').toLowerCase() === wanted || s._raw.id === publicId));
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
  return {
    public_id: sale.seo_slug || sale.id, // Part 20 — prefer public slug, fall back to opaque id
    title: p.title,
    description: p.description,
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

export function buildPublicWebsiteContext({ ctx, sales }) {
  return {
    hostname: ctx.hostname,
    site_name: ctx.tenant.name,
    tenant_slug: ctx.tenant.slug,
    company: buildPublicCompanyContext(ctx.company),
    published_sales: (sales || []).map(stripInternalFields),
    generated_at: new Date().toISOString()
  };
}