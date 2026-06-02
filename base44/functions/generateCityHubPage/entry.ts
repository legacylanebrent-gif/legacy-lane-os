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

async function generateCityContent(openai, city, state, stats) {
  const prompt = `You are an expert local SEO writer for EstateSalen.com.

Write a local estate sale hub page for ${city}, ${state}.

CONTEXT:
- Total sales listed: ${stats.totalSales}
- Popular item categories: ${stats.categories.join(', ') || 'Various'}
- Active estate sale companies: ${stats.companies.join(', ') || 'Various'}

Return JSON only:
{
  "seo_title": "",
  "meta_description": "",
  "h1": "",
  "local_intro": "",
  "estate_sale_guide": "",
  "what_to_expect": "",
  "tips_for_buyers": "",
  "faq": [
    {"question": "", "answer": ""},
    {"question": "", "answer": ""},
    {"question": "", "answer": ""},
    {"question": "", "answer": ""}
  ]
}

Rules:
- seo_title: max 60 chars, include city, state, "estate sales"
- meta_description: max 155 chars, mention city and estate sales
- h1: natural headline for estate sales in ${city}, ${state}
- local_intro: 2-3 sentences about estate sales in this specific city/area
- estate_sale_guide: 3-5 sentences practical guide for attending estate sales in ${city}
- what_to_expect: 2-3 sentences about what buyers typically find in estate sales in this area
- tips_for_buyers: 3-4 practical tips as a single string with "- " prefix per tip
- faq: 4 questions specific to estate sales in ${city}, ${state}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 1200,
  });

  try { return JSON.parse(completion.choices[0].message.content); }
  catch {
    return {
      seo_title: `Estate Sales in ${city}, ${state} | EstateSalen`,
      meta_description: `Find estate sales in ${city}, ${state}. Browse upcoming and recent listings on EstateSalen.com.`,
      h1: `Estate Sales in ${city}, ${state}`,
      local_intro: `Estate sales in ${city}, ${state} offer a wide variety of antiques, furniture, and collectibles.`,
      estate_sale_guide: '', what_to_expect: '', tips_for_buyers: '',
      faq: [],
    };
  }
}

function buildSchemas(city, state, slug, ai, totalSales) {
  const place = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Estate Sales in ${city}, ${state}`,
    description: ai.local_intro,
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
      { '@type': 'ListItem', position: 4, name: `${city}, ${state}`, item: `https://estatesalen.com${slug}` },
    ],
  };
  return { '@graph': [place, breadcrumb] };
}

function buildMainContent(city, state, ai, upcomingSales, recentSales, companies, categories, soldItems) {
  let c = '';

  if (ai.local_intro) c += `## About Estate Sales in ${city}, ${state}\n\n${ai.local_intro}\n\n`;
  if (ai.what_to_expect) c += `## What to Expect\n\n${ai.what_to_expect}\n\n`;

  if (upcomingSales.length) {
    c += `## Upcoming Estate Sales in ${city}, ${state}\n\n`;
    upcomingSales.slice(0, 6).forEach(s => {
      const date = s.sale_dates?.[0]?.date ? formatDate(s.sale_dates[0].date) : '';
      c += `- **${s.title}**${date ? ' — ' + date : ''}\n`;
    });
    c += '\n';
  }

  if (recentSales.length) {
    c += `## Recent Estate Sales in ${city}, ${state}\n\n`;
    recentSales.slice(0, 6).forEach(s => {
      const date = s.sale_dates?.[0]?.date ? formatDate(s.sale_dates[0].date) : '';
      c += `- **${s.title}**${date ? ' — ' + date : ''}\n`;
    });
    c += '\n';
  }

  if (companies.length) {
    c += `## Featured Estate Sale Companies in ${city}, ${state}\n\n`;
    companies.slice(0, 6).forEach(co => { c += `- ${co}\n`; });
    c += '\n';
  }

  if (categories.length) {
    c += `## Popular Item Categories in ${city}, ${state}\n\n`;
    categories.slice(0, 10).forEach(cat => {
      c += `- [${cat}](/categories/${toSlug(cat)})\n`;
    });
    c += '\n';
  }

  if (soldItems.length) {
    c += `## Recently Sold Estate Sale Items in ${city}\n\n`;
    soldItems.slice(0, 8).forEach(item => {
      const price = item.sold_price ? ` — sold $${item.sold_price}` : '';
      const brand = item.brand_name ? ` (${item.brand_name})` : '';
      c += `- **${item.item_name || 'Item'}**${brand}${price}\n`;
    });
    c += '\n';
  }

  if (ai.estate_sale_guide) c += `## Local Estate Sale Guide\n\n${ai.estate_sale_guide}\n\n`;
  if (ai.tips_for_buyers) c += `## Tips for Buyers\n\n${ai.tips_for_buyers}\n\n`;

  c += `## Find Estate Sales Near ${city}\n\nBrowse all upcoming estate sales on [EstateSalen.com](/estate-sales/finder).\n`;
  return c;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const city = (body?.city || '').trim();
    const state = (body?.state || '').trim();

    if (!city || !state) return Response.json({ error: 'city and state are required' }, { status: 400 });

    const slug = `/estate-sales/${toSlug(city)}-${toSlug(state)}`;
    const today = new Date().toISOString().split('T')[0];

    // Load all sales for this city
    const allSales = await base44.asServiceRole.entities.EstateSale.filter({
      'property_address.city': city,
      'property_address.state': state,
    });

    const upcomingSales = allSales.filter(s => ['upcoming', 'active'].includes(s.status));
    const recentSales = allSales.filter(s => s.status === 'completed').slice(0, 10);

    // Aggregate data
    const companies = [...new Set(allSales.map(s => s.operator_name).filter(Boolean))].slice(0, 8);
    const categories = [...new Set(allSales.flatMap(s => s.categories || []).filter(Boolean))];
    const categoryCount = {};
    allSales.flatMap(s => s.categories || []).forEach(cat => { categoryCount[cat] = (categoryCount[cat] || 0) + 1; });
    const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).map(([cat]) => cat).slice(0, 10);

    // Load sold items from SEOItemProfiles linked to sales in this city
    const saleIds = allSales.map(s => s.id).slice(0, 20);
    let soldItems = [];
    if (saleIds.length) {
      const itemResults = await Promise.all(
        saleIds.map(id => base44.asServiceRole.entities.SEOItemProfile.filter({ sale_id: id, sold_status: 'sold' }).catch(() => []))
      );
      soldItems = itemResults.flat().slice(0, 10);
    }

    const stats = { totalSales: allSales.length, categories: topCategories, companies };

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
    const ai = await generateCityContent(openai, city, state, stats);

    const schema = buildSchemas(city, state, slug, ai, allSales.length);
    const mainContent = buildMainContent(city, state, ai, upcomingSales, recentSales, companies, topCategories, soldItems);

    // Upsert SEOCityHub
    const existingHubs = await base44.asServiceRole.entities.SEOCityHub.filter({ slug });
    const hubData = {
      city, state, slug,
      local_intro: ai.local_intro || '',
      estate_sale_guide: ai.estate_sale_guide || '',
      featured_companies_json: companies.map(c => ({ company_name: c })),
      recent_sales_json: recentSales.slice(0, 5).map(s => ({ sale_id: s.id, title: s.title, date: s.sale_dates?.[0]?.date || '' })),
      popular_categories_json: topCategories,
      total_sales_count: allSales.length,
      seo_title: ai.seo_title || `Estate Sales in ${city}, ${state} | EstateSalen`,
      meta_description: ai.meta_description || '',
      schema_json: schema,
      status: 'published',
      indexed_status: 'not_submitted',
    };

    let hubId;
    if (existingHubs.length > 0) {
      await base44.asServiceRole.entities.SEOCityHub.update(existingHubs[0].id, hubData);
      hubId = existingHubs[0].id;
    } else {
      const created = await base44.asServiceRole.entities.SEOCityHub.create(hubData);
      hubId = created.id;
    }

    // Upsert SEOPage
    const pageData = {
      page_type: 'city', entity_id: hubId, slug,
      title: ai.seo_title || `Estate Sales in ${city}, ${state} | EstateSalen`,
      meta_description: ai.meta_description || '',
      h1: ai.h1 || `Estate Sales in ${city}, ${state}`,
      intro_content: ai.local_intro || '',
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

    return Response.json({ message: existingHubs.length ? 'City hub updated' : 'City hub created', city, state, slug, total_sales: allSales.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});