// Phase 4E (Parts 30-35) — manager-facing website analytics.
// Tenant-scoped aggregate reads over WebsiteEvent. Authorization: the certified
// assertTenantAccess chain (platform admin or tenant Company member/website
// manager). Attribution is always server-derived — this function only READS
// events that the tracking seam already attributed. No PII leaves the system.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { assertTenantAccess } from '../../shared/websiteTenantService.ts';
import { getPublishedSales, resolveWebsiteTenant } from '../../shared/websiteRuntimeService.ts';
import { SITES_HOST, normalizeHostname } from '../../shared/websiteTenantService.ts';

const jerr = (code, message, status) => Response.json({ error: { code, message: message || code } }, { status: status || 400 });
const pageOf = (p) => (p.items || p);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return jerr('unauthorized', 'Authentication required', 401);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const tenantPage = await service.entities.WebsiteTenant.filter({ id: body.website_tenant_id }, { limit: 1 });
    const tenant = pageOf(tenantPage)[0];
    if (!tenant) return jerr('tenant_not_found', 'Website not found', 404);
    const access = assertTenantAccess(user, tenant);
    if (access.error) return Response.json({ error: access.error }, { status: access.status || 403 });

    const days = Number.isFinite(Number(body.days)) && Number(body.days) >= 1 && Number(body.days) <= 90
      ? Number(body.days) : 30;
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    const q = { website_tenant_id: tenant.id, created_date: { $gte: since } };

    // One aggregate per question (server-side; no raw record loading).
    const byType = await service.entities.WebsiteEvent.aggregate({ query: q, groupBy: 'event_type' });
    const typeRows = byType.rows || [];
    const countOf = (t) => (typeRows.find(r => r.event_type === t) || { count: 0 }).count;

    const visitorsAgg = await service.entities.WebsiteEvent.aggregate({
      query: { ...q, event_type: 'page_view' }, countDistinct: 'session_hash'
    });
    const visitors = (visitorsAgg.rows && visitorsAgg.rows[0] && visitorsAgg.rows[0].countDistinct_session_hash) || 0;

    const topPages = await service.entities.WebsiteEvent.aggregate({
      query: { ...q, event_type: 'page_view' }, groupBy: 'page', sort: '-count', limit: 10
    });
    const topSalesAgg = await service.entities.WebsiteEvent.aggregate({
      query: { ...q, event_type: 'sale_view', sale_public_id: { $exists: true, $ne: null } },
      groupBy: 'sale_public_id', sort: '-count', limit: 10
    });
    const sources = await service.entities.WebsiteEvent.aggregate({
      query: { ...q, event_type: 'page_view', referrer: { $exists: true, $ne: null } },
      groupBy: 'referrer', sort: '-count', limit: 8
    });

    // Join sale_public_id → canonical Sale titles (canonical truth, no copies).
    const platformHostname = normalizeHostname(`${tenant.slug}.${SITES_HOST}`);
    const ctx = await resolveWebsiteTenant(service, platformHostname);
    const titleByPublicId = {};
    if (ctx.ok) {
      const sales = await getPublishedSales(service, ctx);
      for (const s of sales) {
        const raw = s._raw || {};
        titleByPublicId[raw.website_slug || raw.seo_slug || raw.id] = raw.title || null;
        titleByPublicId[raw.id] = raw.title || null;
      }
    }

    const pageViews = countOf('page_view');
    const sellerLeads = countOf('seller_lead');
    const buyerSignups = countOf('buyer_signup');
    const phoneClicks = countOf('phone_click');
    const emailClicks = countOf('email_click');
    const directionsClicks = countOf('directions_click');
    const saleViews = countOf('sale_view');
    const shares = countOf('share_click');
    const calendarAdds = countOf('calendar_add');

    return Response.json({
      ok: true,
      range_days: days,
      summary: {
        visitors, page_views: pageViews, sale_views: saleViews,
        seller_leads: sellerLeads, buyer_signups: buyerSignups,
        phone_clicks: phoneClicks, email_clicks: emailClicks,
        directions_clicks: directionsClicks, sale_shares: shares, calendar_adds: calendarAdds,
        // Part 35 — conversion is lead-count based, never falsely attributed
        // to unidentified individuals.
        visitor_to_seller_lead_rate: visitors > 0 ? Math.round((sellerLeads / visitors) * 1000) / 10 : null
      },
      top_pages: (topPages.rows || []).map(r => ({ page: r.page, views: r.count })),
      top_sales: (topSalesAgg.rows || []).map(r => ({
        sale_public_id: r.sale_public_id,
        title: titleByPublicId[r.sale_public_id] || 'Estate Sale',
        views: r.count
      })),
      traffic_sources: (sources.rows || []).map(r => ({
        referrer: r.referrer === hostname ? 'Direct / own site' : r.referrer,
        visits: r.count
      })),
      tracked_total: typeRows.reduce((a, r) => a + (r.count || 0), 0)
    });
  } catch (error) {
    console.error('websiteAnalytics error:', error && error.message);
    return jerr('internal_error', 'Unexpected error', 500);
  }
}