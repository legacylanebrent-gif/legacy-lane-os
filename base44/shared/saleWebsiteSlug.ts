// Sale website slug service (Phase 3D.1 — Parts 8/9/10).
// Presentation/routing identity for canonical Sales. Deterministic initial
// generation from the sale title, collision-safe ordinal suffixes, uniqueness
// scoped to the owning Company. NEVER derived from the raw database ID alone
// (final fallback uses a short id tail only when 50 ordinal candidates are taken).

export function normalizeWebsiteSlug(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

async function slugTaken(service, companyId, slug, excludeSaleId) {
  const page = await service.entities.EstateSale.filter(
    { company_id: companyId, website_slug: slug }, { limit: 5, fields: ['id'] });
  const rows = page.items || page;
  return rows.some(r => r.id !== excludeSaleId);
}

// Deterministic initial generation: "Great Estate Sale" → "great-estate-sale",
// then "great-estate-sale-2", "-3", … within the Company scope.
export async function generateUniqueSaleSlug(service, sale) {
  const base = normalizeWebsiteSlug(sale.title) || 'estate-sale';
  let candidate = base;
  for (let n = 1; n <= 50; n++) {
    if (n > 1) candidate = `${base}-${n}`;
    if (!(await slugTaken(service, sale.company_id, candidate, sale.id))) return candidate;
  }
  // Deterministic ordinal space exhausted — URL-safe unique tail (rare).
  return `${base}-${String(sale.id).slice(-6).toLowerCase()}`;
}

// Assign (or validate) the website slug for one Sale. Idempotent.
export async function assignSaleWebsiteSlug(service, sale) {
  if (sale.website_slug && normalizeWebsiteSlug(sale.website_slug) === sale.website_slug) {
    if (!(await slugTaken(service, sale.company_id, sale.website_slug, sale.id))) {
      return { slug: sale.website_slug, changed: false };
    }
  }
  const slug = await generateUniqueSaleSlug(service, sale);
  await service.entities.EstateSale.update(sale.id, { website_slug: slug });
  return { slug, changed: true };
}

// Concurrency arbitration (Part 10): the OLDEST row holding a slug keeps it;
// later collisions regenerate deterministically. Used post-create.
export async function arbitrateSaleSlugs(service, companyId, slug, keepSaleId) {
  const page = await service.entities.EstateSale.filter(
    { company_id: companyId, website_slug: slug }, { limit: 10, sort: 'created_date' });
  const rows = page.items || page;
  let oldest = null;
  for (const r of rows) {
    if (!oldest || (r.created_date || '') < (oldest.created_date || '')) oldest = r;
  }
  const keeper = oldest ? oldest.id : keepSaleId;
  for (const r of rows) {
    if (r.id === keeper) continue;
    const sale = await service.entities.EstateSale.get(r.id).catch(() => null);
    if (!sale) continue;
    const regenerated = await generateUniqueSaleSlug(service, sale);
    if (regenerated !== sale.website_slug) {
      await service.entities.EstateSale.update(r.id, { website_slug: regenerated }).catch(() => {});
    }
  }
  return { keeper };
}