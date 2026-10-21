// Public multi-tenant website runtime API (Phase 3C + Phase 3D.1 projections).
// The ONLY seam operator-website templates consume. Resolution derives
// EVERYTHING from the hostname — client-supplied company_id, website_tenant_id
// and destination_id are never read and cannot influence resolution.
// 3D.1 adds the five thin presentation projections (settings, sale collection
// with presentation ordering, sale detail with presentation, inventory,
// lead/form context) plus tenant-safe sitemap/robots — all composed over the
// certified 3C services.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  resolveWebsiteTenant,
  buildPublicWebsiteContext,
  getPublicSettingsForContext,
  listPublicSales,
  getPublicSaleDetail,
  getPublicInventory,
  getPublicLeadContext,
  getPublicSitemapEntries
} from '../../shared/websiteRuntimeService.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const qp = new URL(req.url).searchParams;

    // Trusted hostname boundary: x-forwarded-host is the public host as routed
    // by the platform. body/query hostname accepted ONLY because Base44
    // currently routes every request to one app host; when operator domains
    // route natively, resolution switches to the header alone.
    const routedHost = req.headers.get('x-forwarded-host') || null;
    const hostname = String(body.hostname || qp.get('hostname') || routedHost || '').trim();
    if (!hostname) return Response.json({ error: 'hostname_required' }, { status: 400 });

    const ctx = await resolveWebsiteTenant(service, hostname);
    if (!ctx.ok) return safeUnavailable(ctx.error);

    if (body.action === 'sale') {
      const result = await getPublicSaleDetail(service, ctx, String(body.public_sale_id || ''));
      if (!result) return Response.json({ error: 'sale_not_found' }, { status: 404 });
      return Response.json({
        ok: true,
        sale: result.sale,
        presentation: result.presentation,
        inventory: result.inventory,
        inventory_count: result.inventory_count
      });
    }

    if (body.action === 'inventory') {
      const result = await getPublicInventory(service, ctx, String(body.public_sale_id || ''));
      if (!result) return Response.json({ error: 'sale_not_found' }, { status: 404 });
      return Response.json({ ok: true, ...result });
    }

    if (body.action === 'lead_context') {
      const leadContext = await getPublicLeadContext(service, ctx);
      return Response.json({ ok: true, lead_context: leadContext });
    }

    if (body.action === 'sitemap') {
      const entries = await getPublicSitemapEntries(service, ctx);
      return Response.json({ ok: true, sitemap: entries });
    }

    // Default: full site context (settings + template binding + sales).
    const settings = await getPublicSettingsForContext(service, ctx);
    const template = { id: ctx.tenant.template_id || null, version: ctx.tenant.template_version || 1 };
    const sales = await listPublicSales(service, ctx);
    // Chapter 7 P2 — published case studies (safe projection only).
    const { getPrimaryHostname, listPublicCaseStudies } = await import('../../shared/websiteRuntimeService.ts');
    const caseStudies = await listPublicCaseStudies(service, ctx);
    const primary_hostname = await getPrimaryHostname(service, ctx.tenant.id, ctx.hostname);
    return Response.json({
      ok: true,
      website: { ...buildPublicWebsiteContext({ ctx, sales, settings, template, caseStudies }), primary_hostname }
    });
  } catch (error) {
    console.error('websiteRuntime error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}

// Neutral public responses. Never leak suspension reasons, account state, or
// configuration detail. Details go to server logs only.
function safeUnavailable(code) {
  console.error(`[websiteRuntime] resolution denied (${code})`);
  if (code === 'unknown_host') return Response.json({ error: 'unknown_host' }, { status: 404 });
  if (code === 'malformed_host') return Response.json({ error: 'malformed_host' }, { status: 400 });
  return Response.json({ error: 'site_unavailable' }, { status: 503 });
}