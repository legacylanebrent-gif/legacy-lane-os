import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

// ─── Slug helper ──────────────────────────────────────────────────────────────
function toSlugPart(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[''""]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── AI content generator ─────────────────────────────────────────────────────
async function generateBrandContent(openai, brandName, items, soldItems, activeItems) {
  const categories = [...new Set(items.map(i => i.category_name).filter(Boolean))].slice(0, 8);
  const cities = [...new Set(
    items.map(i => i.sale_id).filter(Boolean) // placeholder — enriched below
  )];

  const soldExamples = soldItems.slice(0, 10).map(i =>
    `${i.item_name || 'Item'}${i.sold_price ? ' — sold for $' + i.sold_price : ''}${i.condition_summary ? ' (' + i.condition_summary + ')' : ''}`
  ).join('\n');

  const activeExamples = activeItems.slice(0, 8).map(i =>
    `${i.item_name || 'Item'}${i.value_low && i.value_high ? ' — est. $' + i.value_low + '–$' + i.value_high : ''}`
  ).join('\n');

  const prompt = `You are an expert estate sale content writer for EstateSalen.com.

Write a comprehensive brand hub page for "${brandName}" found at estate sales.

DATA:
- Total items found: ${items.length}
- Sold examples:\n${soldExamples || 'None yet'}
- Active/available examples:\n${activeExamples || 'None yet'}
- Categories associated: ${categories.join(', ') || 'Various'}

Return JSON only with this exact structure:
{
  "seo_title": "",
  "meta_description": "",
  "h1": "",
  "brand_overview": "",
  "brand_history": "",
  "value_guide": "",
  "why_estate_sales": "",
  "buying_tips": "",
  "keywords": [],
  "faq": [
    {"question": "", "answer": ""},
    {"question": "", "answer": ""},
    {"question": "", "answer": ""},
    {"question": "", "answer": ""}
  ]
}

Field rules:
- seo_title: max 60 chars, include brand name and "estate sale"
- meta_description: max 155 chars, compelling, mention value/estate sales
- h1: natural headline including brand name
- brand_overview: 2-3 sentences — what this brand is known for, products, reputation. Use hedging if uncertain ("commonly associated with," "known for making").
- brand_history: 3-5 sentences — brand background, founding era if known, collectibility. Never fabricate specific dates or facts; use "believed to have been founded," "reportedly," etc.
- value_guide: 3-5 sentences — typical price ranges at estate sales based on the sold data provided, factors affecting value, condition notes. If no sold data, give general guidance.
- why_estate_sales: 2-3 sentences — why buyers specifically search for this brand at estate sales vs. retail.
- buying_tips: 2-4 practical bullet points as a single string using "- " prefix per tip.
- keywords: 8-12 keyword phrases for this brand in estate sale context.
- faq: 4 genuine questions a collector or buyer might ask.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 1500,
  });

  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return {
      seo_title: `${brandName} at Estate Sales | EstateSalen`,
      meta_description: `Find ${brandName} items at estate sales. Browse current listings and sold examples on EstateSalen.com.`,
      h1: `${brandName} at Estate Sales`,
      brand_overview: `${brandName} items appear regularly at estate sales across the country.`,
      brand_history: '',
      value_guide: '',
      why_estate_sales: '',
      buying_tips: '',
      keywords: [brandName, `${brandName} estate sale`, `buy ${brandName}`],
      faq: [],
    };
  }
}

// ─── Schema builder ───────────────────────────────────────────────────────────
function buildBrandSchema(brandName, slug, ai, totalItems) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${brandName} Items at Estate Sales`,
    description: ai.brand_overview || `${brandName} items found at estate sales on EstateSalen.com.`,
    url: `https://estatesalen.com${slug}`,
    numberOfItems: totalItems,
  };
}

function buildBreadcrumbSchema(brandName, slug) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://estatesalen.com' },
      { '@type': 'ListItem', position: 2, name: 'Brands', item: 'https://estatesalen.com/brands' },
      { '@type': 'ListItem', position: 3, name: brandName, item: `https://estatesalen.com${slug}` },
    ],
  };
}

// ─── Main content builder ─────────────────────────────────────────────────────
function buildMainContent(brandName, ai, items, soldItems, activeItems, categories, relatedCities, relatedCompanies) {
  let content = '';

  if (ai.brand_overview) {
    content += `## About ${brandName}\n\n${ai.brand_overview}\n\n`;
  }

  if (ai.brand_history) {
    content += `## Brand History\n\n${ai.brand_history}\n\n`;
  }

  if (ai.why_estate_sales) {
    content += `## Why Buyers Search for ${brandName} at Estate Sales\n\n${ai.why_estate_sales}\n\n`;
  }

  if (ai.value_guide) {
    content += `## Value Guide\n\n${ai.value_guide}\n\n`;
  }

  if (activeItems.length) {
    content += `## Recently Found on EstateSalen.com\n\n`;
    activeItems.slice(0, 8).forEach(item => {
      const price = item.value_low && item.value_high
        ? ` — est. $${item.value_low}–$${item.value_high}`
        : '';
      content += `- **${item.item_name || 'Item'}**${price}${item.condition_summary ? ' (' + item.condition_summary + ')' : ''}\n`;
    });
    content += '\n';
  }

  if (soldItems.length) {
    content += `## Sold Examples\n\n`;
    soldItems.slice(0, 8).forEach(item => {
      const price = item.sold_price ? ` — sold for $${item.sold_price}` : '';
      content += `- **${item.item_name || 'Item'}**${price}${item.condition_summary ? ' (' + item.condition_summary + ')' : ''}\n`;
    });
    content += '\n';
  }

  if (ai.buying_tips) {
    content += `## Buying Tips\n\n${ai.buying_tips}\n\n`;
  }

  if (categories.length) {
    content += `## Related Categories\n\n`;
    categories.forEach(c => {
      content += `- [${c}](/categories/${toSlugPart(c)})\n`;
    });
    content += '\n';
  }

  if (relatedCities.length) {
    content += `## Cities Where ${brandName} Items Have Been Found\n\n`;
    relatedCities.forEach(({ city, state }) => {
      content += `- [Estate Sales in ${city}, ${state}](/estate-sales/${toSlugPart(city)}-${toSlugPart(state)})\n`;
    });
    content += '\n';
  }

  if (relatedCompanies.length) {
    content += `## Companies That Have Sold ${brandName} Items\n\n`;
    relatedCompanies.forEach(name => {
      content += `- ${name}\n`;
    });
    content += '\n';
  }

  content += `## Find More ${brandName} Items\n\nBrowse upcoming estate sales on [EstateSalen.com](/estate-sales/finder) to find more ${brandName} items near you.\n`;

  return content;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Accept: { brand_name } for direct call, or automation payload with brand_name in data
    const brandName = body?.brand_name || body?.data?.brand_name;

    if (!brandName || !brandName.trim()) {
      return Response.json({ error: 'brand_name is required' }, { status: 400 });
    }

    const trimmedBrand = brandName.trim();
    const slug = `/brands/${toSlugPart(trimmedBrand)}`;

    // Check if brand hub already exists
    const existingHubs = await base44.asServiceRole.entities.SEOBrandHub.filter({ slug });
    const existingHub = existingHubs[0] || null;

    // Pull all SEOItemProfiles for this brand
    const allItems = await base44.asServiceRole.entities.SEOItemProfile.filter({ brand_name: trimmedBrand });
    const soldItems = allItems.filter(i => i.sold_status === 'sold');
    const activeItems = allItems.filter(i => i.sold_status !== 'sold');

    // Derive unique categories, cities, companies from items
    const categories = [...new Set(allItems.map(i => i.category_name).filter(Boolean))].slice(0, 8);

    // Load sale data for city/company context (up to 20 unique sale IDs)
    const saleIds = [...new Set(allItems.map(i => i.sale_id).filter(Boolean))].slice(0, 20);
    const relatedCities = [];
    const relatedCompanies = [];

    if (saleIds.length) {
      const salePromises = saleIds.map(id =>
        base44.asServiceRole.entities.EstateSale.filter({ id }).catch(() => [])
      );
      const saleResults = await Promise.all(salePromises);
      const sales = saleResults.flat();

      const citySet = new Map();
      const companySet = new Set();
      for (const sale of sales) {
        const city = sale.property_address?.city;
        const state = sale.property_address?.state;
        if (city && state) citySet.set(`${city}-${state}`, { city, state });
        if (sale.operator_name) companySet.add(sale.operator_name);
      }
      relatedCities.push(...[...citySet.values()].slice(0, 8));
      relatedCompanies.push(...[...companySet].slice(0, 6));
    }

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    // Generate AI content
    const ai = await generateBrandContent(openai, trimmedBrand, allItems, soldItems, activeItems);

    // Compute stats
    const soldPrices = soldItems.map(i => i.sold_price).filter(p => p > 0);
    const avgSoldPrice = soldPrices.length
      ? Math.round(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length)
      : null;

    // Upsert SEOBrandHub
    const hubData = {
      brand_name: trimmedBrand,
      slug,
      brand_history: ai.brand_history || '',
      value_guide: ai.value_guide || '',
      related_categories: categories,
      total_items_found: allItems.length,
      total_items_sold: soldItems.length,
      average_sold_price: avgSoldPrice,
      seo_title: ai.seo_title || `${trimmedBrand} at Estate Sales | EstateSalen`,
      meta_description: ai.meta_description || '',
      schema_json: buildBrandSchema(trimmedBrand, slug, ai, allItems.length),
      status: 'published',
      indexed_status: 'not_submitted',
    };

    let hubId;
    if (existingHub) {
      await base44.asServiceRole.entities.SEOBrandHub.update(existingHub.id, hubData);
      hubId = existingHub.id;
    } else {
      const created = await base44.asServiceRole.entities.SEOBrandHub.create(hubData);
      hubId = created.id;
    }

    // Build schemas
    const brandSchema = buildBrandSchema(trimmedBrand, slug, ai, allItems.length);
    const breadcrumbSchema = buildBreadcrumbSchema(trimmedBrand, slug);
    const combinedSchema = { '@graph': [brandSchema, breadcrumbSchema] };

    // Build main content
    const mainContent = buildMainContent(trimmedBrand, ai, allItems, soldItems, activeItems, categories, relatedCities, relatedCompanies);

    // Build internal links
    const internalLinks = [
      '/estate-sales/finder',
      '/brands',
      ...categories.slice(0, 4).map(c => `/categories/${toSlugPart(c)}`),
      ...relatedCities.slice(0, 3).map(({ city, state }) => `/estate-sales/${toSlugPart(city)}-${toSlugPart(state)}`),
    ];

    const pageData = {
      page_type: 'brand',
      entity_id: hubId,
      slug,
      title: ai.seo_title || `${trimmedBrand} at Estate Sales | EstateSalen`,
      meta_description: ai.meta_description || '',
      h1: ai.h1 || `${trimmedBrand} at Estate Sales`,
      intro_content: ai.brand_overview || '',
      main_content: mainContent,
      faq_json: (ai.faq || []).map(f => ({ question: f.question, answer: f.answer })),
      schema_json: combinedSchema,
      canonical_url: `https://estatesalen.com${slug}`,
      status: 'published',
      indexed_status: 'not_submitted',
      published_at: new Date().toISOString(),
    };

    // Upsert SEOPage
    const existingPages = await base44.asServiceRole.entities.SEOPage.filter({ slug });
    if (existingPages.length > 0) {
      await base44.asServiceRole.entities.SEOPage.update(existingPages[0].id, pageData);
    } else {
      await base44.asServiceRole.entities.SEOPage.create(pageData);
    }

    return Response.json({
      message: existingHub ? 'Brand hub updated' : 'Brand hub created',
      brand_name: trimmedBrand,
      slug,
      hub_id: hubId,
      items_found: allItems.length,
      items_sold: soldItems.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});