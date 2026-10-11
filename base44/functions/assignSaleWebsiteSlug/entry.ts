// Sale website slug assignment (Phase 3D.1 — Parts 8/9/10).
// Two modes:
// 1. Platform trigger (workflow, entity create on EstateSale): assigns the
//    deterministic, Company-scoped website slug to a NEW sale. Unauthenticated
//    platform-triggered mode is idempotent and only ever SETS a slug — it can
//    never read or expose data.
// 2. Authenticated backfill (admin/company member): batch-scope for one
//    Company. Production mass-backfill is NOT performed in Phase 3D.1
//    (migration plan reported separately).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { assignSaleWebsiteSlug, arbitrateSaleSlugs } from '../../shared/saleWebsiteSlug.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    if (body.company_id) {
      // Authenticated batch mode for one Company (explicit backfill).
      const user = await base44.auth.me();
      const isPrivileged = user && (user.role === 'admin' ||
        (await base44.asServiceRole.entities.Company.get(body.company_id).catch(() => null))?.member_user_ids?.includes(user.id));
      if (!isPrivileged) return Response.json({ error: 'forbidden' }, { status: 403 });
      const page = await service.entities.EstateSale.filter(
        { company_id: body.company_id }, { limit: Math.min(Number(body.limit) || 100, 500) });
      const sales = page.items || page;
      const results = [];
      for (const sale of sales) {
        const r = await assignSaleWebsiteSlug(service, sale);
        if (r.changed) await arbitrateSaleSlugs(service, sale.company_id, r.slug, sale.id);
        results.push({ sale_id: sale.id, slug: r.slug, changed: r.changed });
      }
      return Response.json({ ok: true, mode: 'company_backfill', processed: results.length, results });
    }

    const saleId = String(body.sale_id || '').trim();
    if (!saleId) return Response.json({ error: 'sale_id_required' }, { status: 400 });
    const sale = await service.entities.EstateSale.get(saleId).catch(() => null);
    if (!sale) return Response.json({ error: 'sale_not_found' }, { status: 404 });
    const r = await assignSaleWebsiteSlug(service, sale);
    if (r.changed) await arbitrateSaleSlugs(service, sale.company_id, r.slug, sale.id);
    return Response.json({ ok: true, sale_id: sale.id, website_slug: r.slug, changed: r.changed });
  } catch (error) {
    console.error('assignSaleWebsiteSlug error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}