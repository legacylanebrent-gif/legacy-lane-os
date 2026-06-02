import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SITE_URL = 'sc-domain:estatesalen.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_search_console');

    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    const start28 = new Date(today);
    start28.setDate(start28.getDate() - 28);
    const startDate = start28.toISOString().split('T')[0];

    const gscFetch = async (body) => {
      const res = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`GSC API error ${res.status}: ${err}`);
      }
      return res.json();
    };

    const [topQueries, topPages, deviceBreakdown] = await Promise.all([
      gscFetch({ startDate, endDate, dimensions: ['query'], rowLimit: 25, orderBy: [{ fieldName: 'impressions', sortOrder: 'DESCENDING' }] }),
      gscFetch({ startDate, endDate, dimensions: ['page'], rowLimit: 50, orderBy: [{ fieldName: 'impressions', sortOrder: 'DESCENDING' }] }),
      gscFetch({ startDate, endDate, dimensions: ['device'], rowLimit: 10 })
    ]);

    const rows = topPages.rows || [];
    const totalClicks = rows.reduce((s, r) => s + (r.clicks || 0), 0);
    const totalImpressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
    const avgCtr = rows.length > 0 ? rows.reduce((s, r) => s + (r.ctr || 0), 0) / rows.length : 0;
    const avgPosition = rows.length > 0 ? rows.reduce((s, r) => s + (r.position || 0), 0) / rows.length : 0;

    const salePages = rows
      .filter(r => r.keys?.[0]?.includes('EstateSaleDetail'))
      .map(r => {
        const url = r.keys[0];
        const idMatch = url.match(/id=([^&]+)/);
        return {
          page_url: url,
          sale_id: idMatch?.[1] || null,
          clicks: r.clicks || 0,
          impressions: r.impressions || 0,
          ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
          position: parseFloat((r.position || 0).toFixed(1))
        };
      })
      .sort((a, b) => b.impressions - a.impressions);

    const lowCtrOpportunities = rows
      .filter(r => (r.impressions || 0) > 50 && (r.ctr || 0) < 0.03)
      .map(r => ({
        page: r.keys[0],
        impressions: r.impressions || 0,
        ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
        position: parseFloat((r.position || 0).toFixed(1))
      }))
      .slice(0, 10);

    const snapshot = {
      snapshot_date: endDate,
      period_days: 28,
      site_total_clicks: totalClicks,
      site_total_impressions: totalImpressions,
      site_avg_ctr: parseFloat((avgCtr * 100).toFixed(2)),
      site_avg_position: parseFloat(avgPosition.toFixed(1)),
      top_queries: (topQueries.rows || []).map(r => ({
        query: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
        position: parseFloat((r.position || 0).toFixed(1))
      })),
      top_pages: rows.slice(0, 20).map(r => ({
        page: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
        position: parseFloat((r.position || 0).toFixed(1))
      })),
      device_breakdown: (deviceBreakdown.rows || []).map(r => ({
        device: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0
      })),
      sale_pages: salePages,
      low_ctr_opportunities: lowCtrOpportunities,
      fetched_at: new Date().toISOString()
    };

    await base44.asServiceRole.entities.KPISnapshot.create({
      title: `Search Console Snapshot — ${endDate}`,
      period: endDate,
      source: 'search_console',
      notes: JSON.stringify(snapshot)
    });

    // Update individual EstateSale records with search metrics
    for (const sp of salePages) {
      if (!sp.sale_id) continue;
      try {
        await base44.asServiceRole.entities.EstateSale.update(sp.sale_id, {
          seo_clicks_28d: sp.clicks,
          seo_impressions_28d: sp.impressions,
          seo_ctr_28d: sp.ctr,
          seo_avg_position: sp.position,
          seo_data_updated: new Date().toISOString()
        });
      } catch (_) {}
    }

    return Response.json({ status: 'success', snapshot });

  } catch (error) {
    console.error('fetchSearchConsoleData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});