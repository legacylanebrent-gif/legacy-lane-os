import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BASE_URL = 'https://www.estatesalen.com';
const today = () => new Date().toISOString().split('T')[0];

function xmlUrl(loc, changefreq = 'monthly', priority = '0.6', lastmod = today()) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all published content in parallel
    const [hubs, stateGuides, countyGuides, items, articles, reports, probateStates, probateCounties, providers] = await Promise.all([
      base44.asServiceRole.entities.LifeEventHub.filter({ status: 'published' }),
      base44.asServiceRole.entities.StateGuide.filter({ status: 'published' }),
      base44.asServiceRole.entities.CountyGuide.filter({ status: 'published' }),
      base44.asServiceRole.entities.ItemKnowledgeBase.filter({ status: 'published' }),
      base44.asServiceRole.entities.EstateSaleUniversityArticle.filter({ status: 'published' }),
      base44.asServiceRole.entities.WeeklyMarketReport.filter({ status: 'published' }),
      base44.asServiceRole.entities.ProbateState.filter({ status: 'published' }),
      base44.asServiceRole.entities.ProbateCounty.filter({ status: 'published' }),
      base44.asServiceRole.entities.ProviderDirectory.filter({ status: 'active' }),
    ]);

    const urls = [];

    // ── Static priority pages ──
    const staticPages = [
      { path: '/', freq: 'daily', pri: '1.0' },
      { path: '/probate', freq: 'weekly', pri: '0.9' },
      { path: '/pre-probate', freq: 'weekly', pri: '0.9' },
      { path: '/inherited-property', freq: 'weekly', pri: '0.9' },
      { path: '/senior-downsizing', freq: 'weekly', pri: '0.9' },
      { path: '/assisted-living-transition', freq: 'weekly', pri: '0.9' },
      { path: '/divorce-property-sale', freq: 'weekly', pri: '0.9' },
      { path: '/foreclosure-cleanout', freq: 'weekly', pri: '0.8' },
      { path: '/estate-cleanout', freq: 'weekly', pri: '0.8' },
      { path: '/executor-guide', freq: 'weekly', pri: '0.8' },
      { path: '/trustee-guide', freq: 'weekly', pri: '0.8' },
      { path: '/heir-guide', freq: 'weekly', pri: '0.8' },
      { path: '/moving-sale', freq: 'weekly', pri: '0.7' },
      { path: '/estate-settlement-planner', freq: 'weekly', pri: '0.9' },
      { path: '/estate-checklist', freq: 'weekly', pri: '0.8' },
      { path: '/items', freq: 'weekly', pri: '0.8' },
      { path: '/learn', freq: 'weekly', pri: '0.8' },
      { path: '/estate-sale-companies', freq: 'weekly', pri: '0.9' },
      { path: '/probate-realtors', freq: 'weekly', pri: '0.9' },
    ];
    for (const p of staticPages) urls.push(xmlUrl(`${BASE_URL}${p.path}`, p.freq, p.pri));

    // ── Life event hubs ──
    for (const hub of hubs) {
      if (hub.slug) urls.push(xmlUrl(`${BASE_URL}/${hub.slug}`, 'weekly', '0.8'));
    }

    // ── State guides ──
    for (const sg of stateGuides) {
      if (sg.state_slug && sg.guide_type) {
        urls.push(xmlUrl(`${BASE_URL}/${sg.guide_type}/${sg.state_slug}`, 'monthly', '0.7'));
      }
    }

    // ── County guides ──
    for (const cg of countyGuides) {
      if (cg.county_slug) urls.push(xmlUrl(`${BASE_URL}/${cg.county_slug}`, 'monthly', '0.6'));
    }

    // ── Probate state pages ──
    for (const ps of probateStates) {
      if (ps.slug) urls.push(xmlUrl(`${BASE_URL}/probate/${ps.slug}`, 'monthly', '0.7'));
    }

    // ── Probate county pages ──
    for (const pc of probateCounties) {
      if (pc.slug && pc.state_slug) urls.push(xmlUrl(`${BASE_URL}/probate/${pc.state_slug}/${pc.slug}`, 'monthly', '0.6'));
    }

    // ── Item knowledge guides ──
    for (const item of items) {
      if (item.item_slug) urls.push(xmlUrl(`${BASE_URL}/items/${item.item_slug}`, 'monthly', '0.6'));
    }

    // ── Learn articles ──
    for (const article of articles) {
      if (article.slug) urls.push(xmlUrl(`${BASE_URL}/learn/${article.slug}`, 'monthly', '0.7'));
    }

    // ── Weekly reports ──
    for (const report of reports) {
      if (report.report_slug) urls.push(xmlUrl(`${BASE_URL}/blog-post?slug=${report.report_slug}`, 'monthly', '0.5'));
    }

    // ── Provider directory pages (state-level) ──
    const statesSeen = new Set();
    for (const p of providers) {
      const stateSlug = p.state?.toLowerCase().replace(/\s+/g, '-');
      if (stateSlug && !statesSeen.has(`es-${stateSlug}`)) {
        urls.push(xmlUrl(`${BASE_URL}/estate-sale-companies/${stateSlug}`, 'weekly', '0.7'));
        statesSeen.add(`es-${stateSlug}`);
      }
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n${urls.join('\n')}\n</urlset>`;

    // Log the generation
    const totalUrls = urls.length;

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'X-Total-URLs': String(totalUrls),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});