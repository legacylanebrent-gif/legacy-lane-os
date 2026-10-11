// Public multi-tenant website runtime API (Phase 3C).
// The ONLY seam future operator-website templates consume. Resolution derives
// EVERYTHING from the hostname — client-supplied company_id, website_tenant_id
// and destination_id are never read and cannot influence resolution (Part 29).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  resolveWebsiteTenant,
  buildPublicWebsiteContext,
  getPublishedSales,
  getPublishedSale
} from '../../shared/websiteRuntimeService.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    // Trusted hostname boundary (Part 28): x-forwarded-host is the public host
    // as routed by the platform — proven preserved for the app host AND the
    // connected custom domain in the Phase 3C audit. body.hostname is accepted
    // ONLY because Base44 currently routes every request to one app host; when
    // operator domains route natively, resolution switches to the header alone.
    const routedHost = req.headers.get('x-forwarded-host') || null;
    const hostname = String(body.hostname || routedHost || '').trim();
    if (!hostname) return Response.json({ error: 'hostname_required' }, { status: 400 });

    const ctx = await resolveWebsiteTenant(service, hostname);
    if (!ctx.ok) return safeUnavailable(ctx.error);

    if (body.action === 'sale') {
      const result = await getPublishedSale(service, ctx, String(body.public_sale_id || ''));
      if (!result) return Response.json({ error: 'sale_not_found' }, { status: 404 });
      const { _raw_id, _currentness, sale, inventory } = result;
      return Response.json({ ok: true, sale, inventory, inventory_count: inventory.length });
    }

    const sales = await getPublishedSales(service, ctx);
    return Response.json({ ok: true, website: buildPublicWebsiteContext({ ctx, sales }) });
  } catch (error) {
    console.error('websiteRuntime error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}

// Part 25 — neutral public responses. Never leak suspension reasons, account
// state, or configuration detail. Details go to server logs only.
function safeUnavailable(code) {
  console.error(`[websiteRuntime] resolution denied (${code})`);
  if (code === 'unknown_host') return Response.json({ error: 'unknown_host' }, { status: 404 });
  if (code === 'malformed_host') return Response.json({ error: 'malformed_host' }, { status: 400 });
  // ambiguous_host / config_error / site_not_live / site_unavailable → identical neutral response
  return Response.json({ error: 'site_unavailable' }, { status: 503 });
}