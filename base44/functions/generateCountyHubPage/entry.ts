import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

function toSlug(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
  catch { return dateStr; }
}

async function generateCountyContent(openai, county, state, stats) {
  const prompt = `You are an expert local SEO writer for EstateSalen.com.

Write a county-level estate sale hub page for ${county} County, ${state}.

CONTEXT:
- Total sales listed: ${stats.totalSales}
- Cities with sales: ${stats.cities.join(', ') || 'Various'}
- Popular item categories: ${stats.categories.join(', ') || 'Various'}

Return JSON only:
{
  "seo_title": "",
  "meta_description": "",
  "h1": "",
  "county_intro": "",
  "estate_sale_guide": "",
  "what_to_expect": "",
  "faq": [
    {"question": "", "answer": ""},
    {"question": "", "answer": ""},
    {"question": "", "answer": ""},
    {"question": "", "answer": ""}
  ]
}

Rules:
- seo_title: max 60 chars, include county, state, "estate sales"
- meta_description: max 155 chars
- h1: headline for estate sales in ${county} County, ${state}
- county_intro: 2-3 sentences about estate sales in ${county} County
- estate_sale_guide: 3-4 sentences practical guide for this county
- what_to_expect: 2-3 sentences about items typically found here
- faq: 4 questions about estate sales in this county`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 1000,
  });

  try { return JSON.parse(completion.choices[0].message.content); }
  catch {
    return {
      seo_title: `Estate Sales in ${county} County, ${state} | EstateSalen`,
      meta_description: `Find estate sales in ${county} County, ${state}. Browse listings on EstateSalen.com.`,
      h1: `Estate Sales in ${county} County, ${state}`,
      county_intro: `${county} County, ${state} hosts estate sales throughout the year featuring furniture, antiques, and collectibles.`,
      estate_sale_guide: '', what_to_expect: '', faq: [],
    };
  }
}

function buildSchemas(county, state, slug, ai, totalSales) {
  const list = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Estate Sales in ${county} County, ${state}`,
    description: ai.county_intro,
    url: `https://estatesalen.com${slug}`,
    numberOfItems: totalSales,
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://estatesalen.com' },
      { '@type': 'ListItem', position: 2, name: 'Estate Sales', item: 'https://estatesalen.com/estate-sales' },
      { '@type': 'ListItem', position: 3, name: state, item: `https://estatesalen.com/estate-sales/${toSlug(state)}` },
      { '@type': 'ListItem', position: 4, name: `${county} County`, item: `https://estatesalen.com${slug}` },
    ],
  };
  return { '@graph': [list, breadcrumb] };
}

function buildMainContent(county, state, ai, upcomingSales, recentSales, cities, companies, categories) {
  let c = '';

  if (ai.county_intro) c += `## Estate Sales in ${county} County, ${state}\n\n${ai.county_intro}\n\n`;
  if (ai.what_to_expect) c += `## What to Expect\n\n${ai.what_to_expect}\n\n`;

  if (upcomingSales.length) {
    c += `## Upcoming Estate Sales in ${county} County\n\n`;
    upcomingSales.slice(0, 6).forEach(s => {
      const date = s.sale_dates?.[0]?.date ? formatDate(s.sale_dates[0].date) : '';
      const city = s.property_address?.city || '';
      c += `- **${s.title}**${city ? ' — ' + city : ''}${date ? ', ' + date : ''}\n`;
    });
    c += '\n';
  }

  if (recentSales.length) {
    c += `## Recent Estate Sales in ${county} County\n\n`;
    recentSales.slice(0, 6).forEach(s => {
      const city = s.property_address?.city || '';
      c += `- **${s.title}**${city ? ' — ' + city : ''}\n`;
    });
    c += '\n';
  }

  if (cities.length) {
    c += `## Cities in ${county} County with Estate Sales\n\n`;
    cities.forEach(({ city, state: st }) => {
      c += `- [Estate Sales in ${city}, ${st}](/estate-sales/${toSlug(city)}-${toSlug(st)})\n`;
    });
    c += '\n';
  }

  if (companies.length) {
    c += `## Estate Sale Companies in ${county} County\n\n`;
    companies.slice(0, 6).forEach(co => { c += `- ${co}\n`; });
    c += '\n';
  }

  if (categories.length) {
    c += `## Popular Item Categories in ${county} County\n\n`;
    categories.slice(0, 8).forEach(cat => {
      c += `- [${cat}](/categories/${toSlug(cat)})\n`;
    });
    c += '\n';
  }

  if (ai.estate_sale_guide) c += `## Local Estate Sale Guide\n\n${ai.estate_sale_guide}\n\n`;

  c += `## Find More Estate Sales\n\nBrowse all upcoming estate sales in ${county} County on [EstateSalen.com](/estate-sales/finder).\n`;
  return c;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const county = (body?.county || '').trim();
    const state = (body?.state || '').trim();

    if (!county || !state) return Response.json({ error: 'county and state are required' }, { status: 400 });

    const slug = `/estate-sales/${toSlug(state)}/${toSlug(county)}-county`;

    // Load all sales for this county
    const allSales = await base44.asServiceRole.entities.EstateSale.filter({
      'property_address.region': county,
      'property_address.state': state,
    });

    // Fallback: also check county field directly if region is not set
    let sales = allSales;
    if (sales.length === 0) {
      const allStateSales = await base44.asServiceRole.entities.EstateSale.filter({
        'property_address.state': state,
      });
      sales = allStateSales.filter(s =>
        (s.property_address?.region || '').toLowerCase().includes(county.toLowerCase()) ||
        (s.property_address?.city || '').toLowerCase().includes(county.toLowerCase())
      );
    }

    const upcomingSales = sales.filter(s => ['upcoming', 'active'].includes(s.status));
    const recentSales = sales.filter(s => s.status === 'completed').slice(0, 10);

    // Aggregate
    const companies = [...new Set(sales.map(s => s.operator_name).filter(Boolean))].slice(0, 8);
    const citySet = new Map();
    sales.forEach(s => {
      const city = s.property_address?.city;
      const st = s.property_address?.state;
      if (city && st) citySet.set(`${city}-${st}`, { city, state: st });
    });
    const cities = [...citySet.values()].slice(0, 10);

    const categoryCount = {};
    sales.flatMap(s => s.categories || []).forEach(cat => { categoryCount[cat] = (categoryCount[cat] || 0) + 1; });
    const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).map(([cat]) => cat).slice(0, 10);

    const stats = { totalSales: sales.length, cities: cities.map(c => c.city), categories: topCategories };

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
    const ai = await generateCountyContent(openai, county, state, stats);
    const schema = buildSchemas(county, state, slug, ai, sales.length);
    const mainContent = buildMainContent(county, state, ai, upcomingSales, recentSales, cities, companies, topCategories);

    // Upsert SEOPage (no separate county entity — store directly in SEOPage)
    const pageData = {
      page_type: 'county', entity_id: null, slug,
      title: ai.seo_title || `Estate Sales in ${county} County, ${state} | EstateSalen`,
      meta_description: ai.meta_description || '',
      h1: ai.h1 || `Estate Sales in ${county} County, ${state}`,
      intro_content: ai.county_intro || '',
      main_content: mainContent,
      faq_json: (ai.faq || []).map(f => ({ question: f.question, answer: f.answer })),
      schema_json: schema,
      canonical_url: `https://estatesalen.com${slug}`,
      status: 'published',
      indexed_status: 'not_submitted',
      published_at: new Date().toISOString(),
    };

    const existingPages = await base44.asServiceRole.entities.SEOPage.filter({ slug });
    if (existingPages.length > 0) {
      await base44.asServiceRole.entities.SEOPage.update(existingPages[0].id, pageData);
    } else {
      await base44.asServiceRole.entities.SEOPage.create(pageData);
    }

    return Response.json({ message: existingPages.length ? 'County hub updated' : 'County hub created', county, state, slug, total_sales: sales.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});