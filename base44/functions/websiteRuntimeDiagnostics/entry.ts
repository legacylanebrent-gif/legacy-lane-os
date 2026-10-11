// Admin-only website runtime diagnostics (Phase 3C, Part 31).
// Answers, for hostname X: domain resolved? tenant? Company? lifecycle
// eligible? Destination associated? publication counts? current published
// Sales + currentness? configuration errors? NEVER exposed publicly.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  resolveWebsiteTenant,
  getCanonicalItems,
  getPublishedSales,
  domainRoutable
} from '../../shared/websiteRuntimeService.ts';
import { computeSourceVersion } from '../../shared/publicationPayload.ts';
import { evaluateWebsiteEntitlement, normalizeHostname } from '../../shared/websiteTenantService.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const hostname = normalizeHostname(String(body.hostname || ''));
    if (!hostname) return Response.json({ error: 'malformed_host' }, { status: 400 });

    const domPage = await service.entities.WebsiteDomain.filter({ hostname }, { limit: 10 });
    const domains = (domPage.items || domPage).map(d => ({
      id: d.id, status: d.status, domain_type: d.domain_type, is_primary: d.is_primary,
      tenant_id: d.website_tenant_id, company_id: d.company_id, routable: domainRoutable(d)
    }));

    const ctx = await resolveWebsiteTenant(service, hostname);

    const out = {
      hostname_normalized: hostname,
      domains,
      resolution: ctx.ok
        ? { resolved: true, tenant_id: ctx.tenant.id, tenant_slug: ctx.tenant.slug, tenant_status: ctx.tenant.status,
            company_id: ctx.company.id, company_status: ctx.company.status,
            destination_id: ctx.destination ? ctx.destination.id : null,
            destination_status: ctx.destination ? ctx.destination.status : null,
            destination_company_match: ctx.destination ? ctx.destination.company_id === ctx.tenant.company_id : null }
        : { resolved: false, error: ctx.error }
    };

    if (ctx.ok) {
      const pubPage = await service.entities.Publication.filter(
        { destination_id: ctx.tenant.destination_id || '__none__' }, { limit: 500 });
      const pubs = pubPage.items || pubPage;
      const byStatus = {};
      for (const p of pubs) byStatus[p.status] = (byStatus[p.status] || 0) + 1;

      const sales = await getPublishedSales(service, ctx);
      out.publications_by_status = byStatus;
      out.published_sales = [];
      for (const s of sales) {
        const items = await getCanonicalItems(service, s._raw.id);
        out.published_sales.push({
          sale_id: s._raw.id,
          public_id: s.public_id,
          title: s._raw.title,
          currentness: s._currentness,
          recomputed_version_matches: s._currentness === 'current',
          inventory_count: items.length
        });
      }
      out.entitlement = await evaluateWebsiteEntitlement(service, ctx.company);
    }
    return Response.json({ ok: true, diagnostics: out });
  } catch (error) {
    console.error('websiteRuntimeDiagnostics error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}