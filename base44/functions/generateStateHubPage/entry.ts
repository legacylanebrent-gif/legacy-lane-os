import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

function toSlug(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'Washington D.C.',
};

async function generateStateContent(openai, state, stats) {
  const stateName = STATE_NAMES[state] || state;
  const prompt = `You are an expert local SEO writer for EstateSalen.com.

Write a state-level estate sale hub page for ${stateName} (${state}).

CONTEXT:
- Total sales listed: ${stats.totalSales}
- Top cities with sales: ${stats.cities.join(', ') || 'Various'}
- Popular item categories: ${stats.categories.join(', ') || 'Various'}
- Active companies: ${stats.companies.join(', ') || 'Various'}

Return JSON only:
{
  "seo_title": "",
  "meta_description": "",
  "h1": "",
  "state_intro": "",
  "estate_sale_guide": "",
  "what_to_expect": "",
  "seller_info": "",
  "faq": [
    {"question": "", "answer": ""},
    {"question": "", "answer": ""},
    {"question": "", "answer": ""},
    {"question": "", "answer": ""}
  ]
}

Rules:
- seo_title: max 60 chars, include state name and "estate sales"
- meta_description: max 155 chars, compelling, mention ${stateName}
- h1: natural headline for estate sales in ${stateName}
- state_intro: 2-3 sentences about estate sales across ${stateName}
- estate_sale_guide: 4-5 sentences comprehensive guide for attending estate sales in ${stateName}
- what_to_expect: 2-3 sentences about items typically found in ${stateName} estate sales
- seller_info: 2-3 sentences for people who want to hire a company to run their estate sale in ${stateName}
- faq: 4 questions specific to estate sales in ${stateName}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 1200,
  });

  try { return JSON.parse(completion.choices[0].message.content); }
  catch {
    const stateName2 = STATE_NAMES[state] || state;
    return {
      seo_title: `Estate Sales in ${stateName2} | EstateSalen`,
      meta_description: `Find estate sales across ${stateName2}. Browse upcoming listings near you on EstateSalen.com.`,
      h1: `Estate Sales in ${stateName2}`,
      state_intro: `${stateName2} hosts estate sales in cities and towns statewide, featuring furniture, antiques, jewelry, and collectibles.`,
      estate_sale_guide: '', what_to_expect: '', seller_info: '', faq: [],
    };
  }
}

function buildSchemas(state, slug, ai, totalSales, stateName) {
  const list = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Estate Sales in ${stateName}`,
    description: ai.state_intro,
    url: `https://estatesalen.com${slug}`,
    numberOfItems: totalSales,
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://estatesalen.com' },
      { '@type': 'ListItem', position: 2, name: 'Estate Sales', item: 'https://estatesalen.com/estate-sales' },
      { '@type': 'ListItem', position: 3, name: stateName, item: `https://estatesalen.com${slug}` },
    ],
  };
  return { '@graph': [list, breadcrumb] };
}

function buildMainContent(state, stateName, ai, upcomingSales, recentSales, cities, counties, companies, categories) {
  let c = '';

  if (ai.state_intro) c += `## Estate Sales in ${stateName}\n\n${ai.state_intro}\n\n`;
  if (ai.what_to_expect) c += `## What to Expect\n\n${ai.what_to_expect}\n\n`;

  if (upcomingSales.length) {
    c += `## Upcoming Estate Sales in ${stateName}\n\n`;
    upcomingSales.slice(0, 8).forEach(s => {
      const city = s.property_address?.city || '';
      c += `- **${s.title}**${city ? ' — ' + city : ''}\n`;
    });
    c += '\n';
  }

  if (cities.length) {
    c += `## Estate Sales by City in ${stateName}\n\n`;
    cities.forEach(city => {
      c += `- [Estate Sales in ${city}, ${state}](/estate-sales/${toSlug(city)}-${toSlug(state)})\n`;
    });
    c += '\n';
  }

  if (counties.length) {
    c += `## Estate Sales by County in ${stateName}\n\n`;
    counties.forEach(county => {
      c += `- [${county} County Estate Sales](/estate-sales/${toSlug(state)}/${toSlug(county)}-county)\n`;
    });
    c += '\n';
  }

  if (companies.length) {
    c += `## Estate Sale Companies in ${stateName}\n\n`;
    companies.slice(0, 8).forEach(co => { c += `- ${co}\n`; });
    c += '\n';
  }

  if (categories.length) {
    c += `## Popular Item Categories in ${stateName}\n\n`;
    categories.slice(0, 10).forEach(cat => {
      c += `- [${cat}](/categories/${toSlug(cat)})\n`;
    });
    c += '\n';
  }

  if (recentSales.length) {
    c += `## Recent Estate Sales in ${stateName}\n\n`;
    recentSales.slice(0, 6).forEach(s => {
      const city = s.property_address?.city || '';
      c += `- **${s.title}**${city ? ' — ' + city : ''}\n`;
    });
    c += '\n';
  }

  if (ai.estate_sale_guide) c += `## ${stateName} Estate Sale Guide\n\n${ai.estate_sale_guide}\n\n`;
  if (ai.seller_info) c += `## Planning an Estate Sale in ${stateName}?\n\n${ai.seller_info}\n\n`;

  c += `## Browse All Estate Sales in ${stateName}\n\nFind upcoming estate sales near you on [EstateSalen.com](/estate-sales/finder).\n`;
  return c;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const state = (body?.state || '').trim().toUpperCase();
    if (!state) return Response.json({ error: 'state is required' }, { status: 400 });

    const stateName = STATE_NAMES[state] || state;
    const slug = `/estate-sales/${toSlug(state)}`;

    // Load all sales for this state
    const allSales = await base44.asServiceRole.entities.EstateSale.filter({
      'property_address.state': state,
    });

    const upcomingSales = allSales.filter(s => ['upcoming', 'active'].includes(s.status));
    const recentSales = allSales.filter(s => s.status === 'completed').slice(0, 10);

    // Aggregate cities
    const cityCount = {};
    allSales.forEach(s => {
      const city = s.property_address?.city;
      if (city) cityCount[city] = (cityCount[city] || 0) + 1;
    });
    const topCities = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 15);

    // Aggregate counties
    const countyCount = {};
    allSales.forEach(s => {
      const region = s.property_address?.region;
      if (region) countyCount[region] = (countyCount[region] || 0) + 1;
    });
    const topCounties = Object.entries(countyCount).sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 12);

    // Aggregate companies & categories
    const companies = [...new Set(allSales.map(s => s.operator_name).filter(Boolean))].slice(0, 10);
    const categoryCount = {};
    allSales.flatMap(s => s.categories || []).forEach(cat => { categoryCount[cat] = (categoryCount[cat] || 0) + 1; });
    const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).map(([cat]) => cat).slice(0, 12);

    const stats = { totalSales: allSales.length, cities: topCities.slice(0, 8), categories: topCategories.slice(0, 6), companies: companies.slice(0, 6) };

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
    const ai = await generateStateContent(openai, state, stats);
    const schema = buildSchemas(state, slug, ai, allSales.length, stateName);
    const mainContent = buildMainContent(state, stateName, ai, upcomingSales, recentSales, topCities, topCounties, companies, topCategories);

    const pageData = {
      page_type: 'state', entity_id: null, slug,
      title: ai.seo_title || `Estate Sales in ${stateName} | EstateSalen`,
      meta_description: ai.meta_description || '',
      h1: ai.h1 || `Estate Sales in ${stateName}`,
      intro_content: ai.state_intro || '',
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

    return Response.json({ message: existingPages.length ? 'State hub updated' : 'State hub created', state, stateName, slug, total_sales: allSales.length, cities: topCities.length, counties: topCounties.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});