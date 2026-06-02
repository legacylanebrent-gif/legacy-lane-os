import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toSlug(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function weekRange() {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  const fmt = d => d.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end), label: `${fmt(start)} to ${fmt(end)}` };
}

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; }

// ─── AI summary generator ────────────────────────────────────────────────────
async function generateReportContent(openai, reportType, scope, stats) {
  const prompt = `You are an expert estate sale market analyst writing SEO content for EstateSalen.com.

Write a weekly estate sale market report for: ${reportType}${scope ? ' — ' + scope : ''}.

DATA:
${JSON.stringify(stats, null, 2)}

Return JSON only:
{
  "seo_title": "",
  "meta_description": "",
  "h1": "",
  "summary": "",
  "market_overview": "",
  "trending_analysis": "",
  "buyer_takeaways": "",
  "seller_takeaways": ""
}

Rules:
- seo_title: max 60 chars, include scope/type and week/date
- meta_description: max 155 chars, mention estate sales, market data
- h1: engaging headline for this weekly report
- summary: 2-3 sentences executive summary of the week
- market_overview: 3-5 sentences about active sales, volume, geographic spread
- trending_analysis: 3-4 sentences on trending brands and categories this week
- buyer_takeaways: 2-3 actionable insights for buyers
- seller_takeaways: 2-3 actionable insights for sellers/operators`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 900,
  });

  try { return JSON.parse(completion.choices[0].message.content); }
  catch {
    return {
      seo_title: `${reportType} Weekly Report | EstateSalen`,
      meta_description: `Weekly estate sale market report for ${scope || 'national'}. Browse data on EstateSalen.com.`,
      h1: `${reportType} — Weekly Estate Sale Report`,
      summary: `This week's estate sale market report covers active sales, sold items, and trending categories.`,
      market_overview: '', trending_analysis: '', buyer_takeaways: '', seller_takeaways: '',
    };
  }
}

// ─── Content builder ──────────────────────────────────────────────────────────
function buildReportContent(ai, stats, topSales, topBrands, topCategories, topItems, week) {
  let c = `*Report period: ${week.label}*\n\n`;

  if (ai.summary) c += `## Executive Summary\n\n${ai.summary}\n\n`;
  if (ai.market_overview) c += `## Market Overview\n\n${ai.market_overview}\n\n`;

  // Stats table
  c += `## Key Metrics This Week\n\n`;
  c += `| Metric | Value |\n|---|---|\n`;
  c += `| Active Sales | ${stats.activeSales} |\n`;
  c += `| Completed Sales | ${stats.completedSales} |\n`;
  c += `| Total Items Tracked | ${stats.totalItems} |\n`;
  c += `| Items Sold This Week | ${stats.soldItems} |\n`;
  if (stats.avgSoldPrice) c += `| Avg Sold Price | $${stats.avgSoldPrice} |\n`;
  if (stats.totalSoldValue) c += `| Total Sold Value | $${stats.totalSoldValue.toLocaleString()} |\n`;
  c += '\n';

  if (ai.trending_analysis) c += `## Trending This Week\n\n${ai.trending_analysis}\n\n`;

  if (topSales.length) {
    c += `## Featured Active Sales\n\n`;
    topSales.slice(0, 8).forEach(s => {
      const city = s.property_address?.city || '';
      const st = s.property_address?.state || '';
      const slug = s.seo_slug || `/sales/${s.id}`;
      c += `- [**${s.title}**](${slug})${city ? ' — ' + city + (st ? ', ' + st : '') : ''}\n`;
    });
    c += '\n';
  }

  if (topBrands.length) {
    c += `## Trending Brands\n\n`;
    topBrands.slice(0, 10).forEach(({ brand, count }) => {
      c += `- [${brand}](/brands/${toSlug(brand)}) — ${count} item${count !== 1 ? 's' : ''} found\n`;
    });
    c += '\n';
  }

  if (topCategories.length) {
    c += `## Top Categories\n\n`;
    topCategories.slice(0, 10).forEach(({ category, count }) => {
      c += `- [${category}](/categories/${toSlug(category)}) — ${count} item${count !== 1 ? 's' : ''}\n`;
    });
    c += '\n';
  }

  if (topItems.length) {
    c += `## Most Viewed Items This Week\n\n`;
    topItems.slice(0, 8).forEach(item => {
      const brand = item.brand_name ? ` (${item.brand_name})` : '';
      const price = item.sold_price ? ` — sold $${item.sold_price}` : item.value_low ? ` — est. $${item.value_low}–$${item.value_high}` : '';
      const slug = item.slug ? `/items/${item.slug}` : '';
      if (slug) {
        c += `- [**${item.item_name || 'Item'}**](${slug})${brand}${price}\n`;
      } else {
        c += `- **${item.item_name || 'Item'}**${brand}${price}\n`;
      }
    });
    c += '\n';
  }

  if (ai.buyer_takeaways) c += `## For Buyers\n\n${ai.buyer_takeaways}\n\n`;
  if (ai.seller_takeaways) c += `## For Estate Sale Operators\n\n${ai.seller_takeaways}\n\n`;

  c += `## Browse Estate Sales\n\nFind upcoming estate sales near you on [EstateSalen.com](/estate-sales/finder).\n`;
  return c;
}

function buildSchema(title, slug, summary, publishedAt) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Report',
    name: title,
    description: summary,
    url: `https://estatesalen.com${slug}`,
    datePublished: publishedAt,
    publisher: { '@type': 'Organization', name: 'EstateSalen.com', url: 'https://estatesalen.com' },
  };
}

async function upsertReport(base44, reportType, geoScope, slug, ai, mainContent, stats, week) {
  const publishedAt = new Date().toISOString();
  const schema = buildSchema(ai.h1 || ai.seo_title, slug, ai.summary || '', publishedAt);

  const reportData = {
    report_type: reportType,
    report_period_start: week.start,
    report_period_end: week.end,
    title: ai.seo_title || `${geoScope || reportType} Weekly Report`,
    slug,
    summary: ai.meta_description || ai.summary || '',
    full_report: mainContent,
    data_json: stats,
    schema_json: schema,
    geo_scope: geoScope || 'National',
    status: 'published',
    indexed_status: 'not_submitted',
    published_at: publishedAt,
  };

  const existing = await base44.asServiceRole.entities.SEOReport.filter({ slug });
  let reportId;
  if (existing.length > 0) {
    await base44.asServiceRole.entities.SEOReport.update(existing[0].id, reportData);
    reportId = existing[0].id;
  } else {
    const created = await base44.asServiceRole.entities.SEOReport.create(reportData);
    reportId = created.id;
  }

  // Upsert SEOPage
  const pageData = {
    page_type: 'report',
    entity_id: reportId,
    slug,
    title: ai.seo_title || reportData.title,
    meta_description: ai.meta_description || '',
    h1: ai.h1 || reportData.title,
    intro_content: ai.summary || '',
    main_content: mainContent,
    faq_json: [],
    schema_json: schema,
    canonical_url: `https://estatesalen.com${slug}`,
    status: 'published',
    indexed_status: 'not_submitted',
    published_at: publishedAt,
  };

  const existingPage = await base44.asServiceRole.entities.SEOPage.filter({ slug });
  if (existingPage.length > 0) {
    await base44.asServiceRole.entities.SEOPage.update(existingPage[0].id, pageData);
  } else {
    await base44.asServiceRole.entities.SEOPage.create(pageData);
  }

  return reportId;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const week = weekRange();
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    const weekSlug = `${week.start}-to-${week.end}`;
    const results = [];

    // ── Load all sales data ───────────────────────────────────────────────────
    let allSales = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.EstateSale.list('-created_date', 200, skip);
      if (!batch || batch.length === 0) break;
      allSales = allSales.concat(batch);
      if (batch.length < 200) break;
      skip += 200;
    }

    const activeSales = allSales.filter(s => ['upcoming', 'active'].includes(s.status));
    const completedSales = allSales.filter(s => s.status === 'completed');

    // Load SEOItemProfiles for item data
    let allItems = [];
    skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.SEOItemProfile.list('-created_date', 200, skip);
      if (!batch || batch.length === 0) break;
      allItems = allItems.concat(batch);
      if (batch.length < 200) break;
      skip += 200;
    }

    const soldItems = allItems.filter(i => i.sold_status === 'sold');
    const recentSoldItems = soldItems.filter(i => i.updated_date >= week.start + 'T00:00:00.000Z');

    // Aggregate brands
    const brandCount = {};
    allItems.forEach(i => { if (i.brand_name) brandCount[i.brand_name] = (brandCount[i.brand_name] || 0) + 1; });
    const topBrands = Object.entries(brandCount).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([brand, count]) => ({ brand, count }));

    // Aggregate categories
    const catCount = {};
    allItems.forEach(i => { if (i.category_name) catCount[i.category_name] = (catCount[i.category_name] || 0) + 1; });
    const topCategories = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([category, count]) => ({ category, count }));

    // Sold value stats
    const soldPrices = soldItems.map(i => i.sold_price).filter(p => p > 0);
    const totalSoldValue = soldPrices.reduce((a, b) => a + b, 0);
    const avgSoldPrice = soldPrices.length ? Math.round(totalSoldValue / soldPrices.length) : 0;

    const globalStats = {
      activeSales: activeSales.length,
      completedSales: completedSales.length,
      totalItems: allItems.length,
      soldItems: soldItems.length,
      recentSoldItems: recentSoldItems.length,
      avgSoldPrice,
      totalSoldValue: Math.round(totalSoldValue),
      topBrands: topBrands.slice(0, 5),
      topCategories: topCategories.slice(0, 5),
    };

    // ── 1. National Report ────────────────────────────────────────────────────
    {
      const slug = `/reports/national-estate-sale-market-${weekSlug}`;
      const ai = await generateReportContent(openai, 'National Estate Sale Market Report', 'United States', globalStats);
      const content = buildReportContent(ai, globalStats, activeSales.slice(0, 8), topBrands, topCategories, recentSoldItems.slice(0, 8), week);
      await upsertReport(base44, 'weekly_national', 'National', slug, ai, content, globalStats, week);
      results.push({ type: 'national', slug });
    }

    // ── 2. Top Brands Report ─────────────────────────────────────────────────
    {
      const slug = `/reports/top-brands-estate-sales-${weekSlug}`;
      const brandStats = { ...globalStats, topBrandsDetail: topBrands.slice(0, 20) };
      const ai = await generateReportContent(openai, 'Top Brands Found at Estate Sales This Week', 'All Brands', brandStats);
      const content = buildReportContent(ai, brandStats, activeSales.slice(0, 6), topBrands, topCategories, [], week);
      await upsertReport(base44, 'weekly_national', 'Brands', slug, ai, content, brandStats, week);
      results.push({ type: 'top_brands', slug });
    }

    // ── 3. Top Categories Report ─────────────────────────────────────────────
    {
      const slug = `/reports/top-categories-estate-sales-${weekSlug}`;
      const catStats = { ...globalStats, topCategoriesDetail: topCategories.slice(0, 20) };
      const ai = await generateReportContent(openai, 'Top Categories at Estate Sales This Week', 'All Categories', catStats);
      const content = buildReportContent(ai, catStats, activeSales.slice(0, 6), topBrands, topCategories, [], week);
      await upsertReport(base44, 'weekly_national', 'Categories', slug, ai, content, catStats, week);
      results.push({ type: 'top_categories', slug });
    }

    // ── 4. Most Viewed Items Report ───────────────────────────────────────────
    {
      const slug = `/reports/most-viewed-items-estate-sales-${weekSlug}`;
      const viewedStats = {
        ...globalStats,
        recentItems: recentSoldItems.slice(0, 10).map(i => ({
          name: i.item_name, brand: i.brand_name, category: i.category_name,
          sold_price: i.sold_price, value_low: i.value_low, value_high: i.value_high,
        })),
      };
      const ai = await generateReportContent(openai, 'Most Viewed Items at Estate Sales This Week', 'All Items', viewedStats);
      const content = buildReportContent(ai, viewedStats, activeSales.slice(0, 6), topBrands, topCategories, recentSoldItems.slice(0, 10), week);
      await upsertReport(base44, 'weekly_national', 'Items', slug, ai, content, viewedStats, week);
      results.push({ type: 'most_viewed_items', slug });
    }

    // ── 5. Sold Item Value Report ─────────────────────────────────────────────
    {
      const slug = `/reports/sold-item-value-estate-sales-${weekSlug}`;
      // Top sold items by price
      const topSoldByValue = soldItems.filter(i => i.sold_price > 0).sort((a, b) => b.sold_price - a.sold_price).slice(0, 15);
      const valueStats = {
        ...globalStats,
        topSoldItems: topSoldByValue.slice(0, 10).map(i => ({
          name: i.item_name, brand: i.brand_name, sold_price: i.sold_price, category: i.category_name,
        })),
        priceDistribution: {
          under100: soldPrices.filter(p => p < 100).length,
          p100to500: soldPrices.filter(p => p >= 100 && p < 500).length,
          p500to1000: soldPrices.filter(p => p >= 500 && p < 1000).length,
          over1000: soldPrices.filter(p => p >= 1000).length,
        },
      };
      const ai = await generateReportContent(openai, 'Sold Item Value Report — Estate Sales This Week', 'Sold Items', valueStats);
      const content = buildReportContent(ai, valueStats, activeSales.slice(0, 4), topBrands.slice(0, 5), topCategories.slice(0, 5), topSoldByValue.slice(0, 10), week);
      await upsertReport(base44, 'weekly_national', 'Sold Values', slug, ai, content, valueStats, week);
      results.push({ type: 'sold_values', slug });
    }

    // ── 6. State Reports ─────────────────────────────────────────────────────
    const stateSet = new Map();
    allSales.forEach(s => {
      const state = s.property_address?.state?.trim().toUpperCase();
      if (state) {
        if (!stateSet.has(state)) stateSet.set(state, []);
        stateSet.get(state).push(s);
      }
    });

    for (const [state, stateSales] of stateSet.entries()) {
      if (stateSales.length < 2) continue; // skip states with < 2 sales
      const stateActive = stateSales.filter(s => ['upcoming', 'active'].includes(s.status));
      if (stateActive.length === 0) continue;

      const stateItems = allItems.filter(i => {
        const sale = allSales.find(s => s.id === i.sale_id);
        return sale?.property_address?.state?.toUpperCase() === state;
      });

      const stateBrandCount = {};
      stateItems.forEach(i => { if (i.brand_name) stateBrandCount[i.brand_name] = (stateBrandCount[i.brand_name] || 0) + 1; });
      const stateBrands = Object.entries(stateBrandCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([brand, count]) => ({ brand, count }));

      const stateCatCount = {};
      stateSales.flatMap(s => s.categories || []).forEach(cat => { stateCatCount[cat] = (stateCatCount[cat] || 0) + 1; });
      const stateCats = Object.entries(stateCatCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([category, count]) => ({ category, count }));

      const stateSoldPrices = stateItems.filter(i => i.sold_price > 0).map(i => i.sold_price);
      const stateStats = {
        activeSales: stateActive.length,
        completedSales: stateSales.filter(s => s.status === 'completed').length,
        totalItems: stateItems.length,
        soldItems: stateItems.filter(i => i.sold_status === 'sold').length,
        avgSoldPrice: stateSoldPrices.length ? Math.round(stateSoldPrices.reduce((a, b) => a + b, 0) / stateSoldPrices.length) : 0,
        totalSoldValue: Math.round(stateSoldPrices.reduce((a, b) => a + b, 0)),
        topBrands: stateBrands.slice(0, 5),
        topCategories: stateCats.slice(0, 5),
      };

      const slug = `/reports/${toSlug(state)}-estate-sales-${weekSlug}`;
      const ai = await generateReportContent(openai, `${state} Estate Sale Market Report`, state, stateStats);
      const content = buildReportContent(ai, stateStats, stateActive.slice(0, 6), stateBrands, stateCats, [], week);
      await upsertReport(base44, 'state', state, slug, ai, content, stateStats, week);
      results.push({ type: 'state', state, slug });
    }

    // ── 7. County Reports ────────────────────────────────────────────────────
    const countySet = new Map();
    allSales.forEach(s => {
      const county = (s.property_address?.region || '').trim();
      const state = (s.property_address?.state || '').trim().toUpperCase();
      if (county && state) {
        const key = `${county}||${state}`;
        if (!countySet.has(key)) countySet.set(key, { county, state, sales: [] });
        countySet.get(key).sales.push(s);
      }
    });

    for (const { county, state, sales: countySales } of countySet.values()) {
      const countyActive = countySales.filter(s => ['upcoming', 'active'].includes(s.status));
      if (countyActive.length === 0) continue;

      const countyItems = allItems.filter(i => {
        const sale = allSales.find(s => s.id === i.sale_id);
        return (sale?.property_address?.region || '').toLowerCase() === county.toLowerCase() &&
               (sale?.property_address?.state || '').toUpperCase() === state;
      });

      const countyCatCount = {};
      countySales.flatMap(s => s.categories || []).forEach(cat => { countyCatCount[cat] = (countyCatCount[cat] || 0) + 1; });
      const countyCats = Object.entries(countyCatCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([category, count]) => ({ category, count }));

      const countyStats = {
        activeSales: countyActive.length,
        completedSales: countySales.filter(s => s.status === 'completed').length,
        totalItems: countyItems.length,
        soldItems: countyItems.filter(i => i.sold_status === 'sold').length,
        topCategories: countyCats.slice(0, 5),
      };

      const slug = `/reports/${toSlug(state)}-${toSlug(county)}-county-estate-sales-${weekSlug}`;
      const ai = await generateReportContent(openai, `${county} County, ${state} Estate Sale Report`, `${county} County, ${state}`, countyStats);
      const content = buildReportContent(ai, countyStats, countyActive.slice(0, 6), [], countyCats, [], week);
      await upsertReport(base44, 'county', `${county} County, ${state}`, slug, ai, content, countyStats, week);
      results.push({ type: 'county', county, state, slug });
    }

    return Response.json({
      message: 'Weekly SEO reports generated',
      week: week.label,
      reports_created: results.length,
      breakdown: {
        national: results.filter(r => r.type === 'national').length,
        top_brands: results.filter(r => r.type === 'top_brands').length,
        top_categories: results.filter(r => r.type === 'top_categories').length,
        most_viewed_items: results.filter(r => r.type === 'most_viewed_items').length,
        sold_values: results.filter(r => r.type === 'sold_values').length,
        states: results.filter(r => r.type === 'state').length,
        counties: results.filter(r => r.type === 'county').length,
      },
      slugs: results.map(r => r.slug).slice(0, 30),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});