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
async function generateCategoryContent(openai, categoryName, items, soldItems, activeItems) {
  const brands = [...new Set(items.map(i => i.brand_name).filter(Boolean))].slice(0, 12);
  const styles = [...new Set(items.map(i => i.style).filter(Boolean))].slice(0, 8);

  const soldExamples = soldItems.slice(0, 10).map(i =>
    `${i.item_name || 'Item'}${i.brand_name ? ' (' + i.brand_name + ')' : ''}${i.sold_price ? ' — sold $' + i.sold_price : ''}${i.condition_summary ? ' / ' + i.condition_summary : ''}`
  ).join('\n');

  const activeExamples = activeItems.slice(0, 8).map(i =>
    `${i.item_name || 'Item'}${i.brand_name ? ' (' + i.brand_name + ')' : ''}${i.value_low && i.value_high ? ' — est. $' + i.value_low + '–$' + i.value_high : ''}`
  ).join('\n');

  const prompt = `You are an expert estate sale content writer for EstateSalen.com.

Write a comprehensive category hub page for the estate sale category: "${categoryName}".

DATA:
- Total items found in this category: ${items.length}
- Common brands: ${brands.join(', ') || 'Various'}
- Common styles: ${styles.join(', ') || 'Various'}
- Sold examples:\n${soldExamples || 'None yet'}
- Active/available examples:\n${activeExamples || 'None yet'}

Return JSON only with this exact structure:
{
  "seo_title": "",
  "meta_description": "",
  "h1": "",
  "category_intro": "",
  "what_buyers_look_for": "",
  "buying_guide": "",
  "selling_guide": "",
  "condition_factors": "",
  "price_factors": "",
  "common_brands": [],
  "keywords": [],
  "faq": [
    {"question": "", "answer": ""},
    {"question": "", "answer": ""},
    {"question": "", "answer": ""},
    {"question": "", "answer": ""}
  ]
}

Field rules:
- seo_title: max 60 chars, include category and "estate sale"
- meta_description: max 155 chars, compelling, mention estate sales and value
- h1: natural headline, include category name
- category_intro: 2-3 sentences introducing this category in the estate sale context
- what_buyers_look_for: 2-4 sentences on what collectors and buyers prioritize in this category
- buying_guide: 4-6 practical tips for buying this category at estate sales, written as flowing paragraphs
- selling_guide: 3-5 sentences advising sellers on how to present and price this category
- condition_factors: 3-5 sentences on how condition affects value in this category. Be specific and practical.
- price_factors: 3-5 sentences on what drives prices up or down. Use data provided if available.
- common_brands: array of 6-12 notable brands commonly found in this category at estate sales. Only include brands that realistically appear at estate sales.
- keywords: 10-14 SEO keyword phrases
- faq: 4 genuine questions a shopper or seller might ask about this category at estate sales`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 1800,
  });

  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return {
      seo_title: `${categoryName} at Estate Sales | EstateSalen`,
      meta_description: `Find ${categoryName} at estate sales near you. Browse current listings and sold examples on EstateSalen.com.`,
      h1: `${categoryName} at Estate Sales`,
      category_intro: `${categoryName} items appear regularly at estate sales across the country.`,
      what_buyers_look_for: '',
      buying_guide: '',
      selling_guide: '',
      condition_factors: '',
      price_factors: '',
      common_brands: brands,
      keywords: [categoryName, `${categoryName} estate sale`, `buy ${categoryName}`],
      faq: [],
    };
  }
}

// ─── Schema builders ──────────────────────────────────────────────────────────
function buildCategorySchema(categoryName, slug, ai, totalItems) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${categoryName} at Estate Sales`,
    description: ai.category_intro || `${categoryName} items found at estate sales on EstateSalen.com.`,
    url: `https://estatesalen.com${slug}`,
    numberOfItems: totalItems,
  };
}

function buildBreadcrumbSchema(categoryName, slug) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://estatesalen.com' },
      { '@type': 'ListItem', position: 2, name: 'Categories', item: 'https://estatesalen.com/categories' },
      { '@type': 'ListItem', position: 3, name: categoryName, item: `https://estatesalen.com${slug}` },
    ],
  };
}

// ─── Main content builder ─────────────────────────────────────────────────────
function buildMainContent(categoryName, ai, items, soldItems, activeItems, relatedBrands, relatedCities) {
  let content = '';

  if (ai.category_intro) {
    content += `## About ${categoryName} at Estate Sales\n\n${ai.category_intro}\n\n`;
  }

  if (ai.what_buyers_look_for) {
    content += `## What Buyers Look For\n\n${ai.what_buyers_look_for}\n\n`;
  }

  if (ai.buying_guide) {
    content += `## Buying Guide\n\n${ai.buying_guide}\n\n`;
  }

  if (ai.condition_factors) {
    content += `## Condition Factors\n\n${ai.condition_factors}\n\n`;
  }

  if (ai.price_factors) {
    content += `## What Affects the Price\n\n${ai.price_factors}\n\n`;
  }

  if (activeItems.length) {
    content += `## Recently Found on EstateSalen.com\n\n`;
    activeItems.slice(0, 8).forEach(item => {
      const brand = item.brand_name ? ` (${item.brand_name})` : '';
      const price = item.value_low && item.value_high ? ` — est. $${item.value_low}–$${item.value_high}` : '';
      content += `- **${item.item_name || 'Item'}**${brand}${price}\n`;
    });
    content += '\n';
  }

  if (soldItems.length) {
    content += `## Sold Examples\n\n`;
    soldItems.slice(0, 8).forEach(item => {
      const brand = item.brand_name ? ` (${item.brand_name})` : '';
      const price = item.sold_price ? ` — sold for $${item.sold_price}` : '';
      content += `- **${item.item_name || 'Item'}**${brand}${price}\n`;
    });
    content += '\n';
  }

  if (ai.selling_guide) {
    content += `## Selling Guide\n\n${ai.selling_guide}\n\n`;
  }

  const allBrands = [...new Set([
    ...(ai.common_brands || []),
    ...relatedBrands,
  ])].slice(0, 10);

  if (allBrands.length) {
    content += `## Common Brands in This Category\n\n`;
    allBrands.forEach(b => {
      content += `- [${b}](/brands/${toSlugPart(b)})\n`;
    });
    content += '\n';
  }

  if (relatedCities.length) {
    content += `## Where to Find ${categoryName} at Estate Sales\n\n`;
    relatedCities.forEach(({ city, state }) => {
      content += `- [Estate Sales in ${city}, ${state}](/estate-sales/${toSlugPart(city)}-${toSlugPart(state)})\n`;
    });
    content += '\n';
  }

  content += `## Browse ${categoryName} at Estate Sales\n\nFind ${categoryName} at upcoming estate sales near you on [EstateSalen.com](/estate-sales/finder).\n`;

  return content;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const categoryName = body?.category_name || body?.data?.category_name;
    if (!categoryName || !categoryName.trim()) {
      return Response.json({ error: 'category_name is required' }, { status: 400 });
    }

    const trimmedCategory = categoryName.trim();
    const slug = `/categories/${toSlugPart(trimmedCategory)}`;

    // Check if hub already exists
    const existingHubs = await base44.asServiceRole.entities.SEOCategoryHub.filter({ slug });
    const existingHub = existingHubs[0] || null;

    // Pull all SEOItemProfiles for this category
    const allItems = await base44.asServiceRole.entities.SEOItemProfile.filter({ category_name: trimmedCategory });
    const soldItems = allItems.filter(i => i.sold_status === 'sold');
    const activeItems = allItems.filter(i => i.sold_status !== 'sold');

    // Derive brands from items
    const relatedBrands = [...new Set(allItems.map(i => i.brand_name).filter(Boolean))].slice(0, 10);

    // Load sale records for city context
    const saleIds = [...new Set(allItems.map(i => i.sale_id).filter(Boolean))].slice(0, 20);
    const relatedCities = [];

    if (saleIds.length) {
      const saleResults = await Promise.all(
        saleIds.map(id => base44.asServiceRole.entities.EstateSale.filter({ id }).catch(() => []))
      );
      const sales = saleResults.flat();
      const citySet = new Map();
      for (const sale of sales) {
        const city = sale.property_address?.city;
        const state = sale.property_address?.state;
        if (city && state) citySet.set(`${city}-${state}`, { city, state });
      }
      relatedCities.push(...[...citySet.values()].slice(0, 8));
    }

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    // Generate AI content
    const ai = await generateCategoryContent(openai, trimmedCategory, allItems, soldItems, activeItems);

    // Compute stats
    const soldPrices = soldItems.map(i => i.sold_price).filter(p => p > 0);
    const avgSoldPrice = soldPrices.length
      ? Math.round(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length)
      : null;

    const allBrands = [...new Set([...(ai.common_brands || []), ...relatedBrands])].slice(0, 10);

    // Upsert SEOCategoryHub
    const hubData = {
      category_name: trimmedCategory,
      slug,
      category_intro: ai.category_intro || '',
      buying_guide: ai.buying_guide || '',
      selling_guide: ai.selling_guide || '',
      related_brands: allBrands,
      total_items_found: allItems.length,
      total_items_sold: soldItems.length,
      average_sold_price: avgSoldPrice,
      seo_title: ai.seo_title || `${trimmedCategory} at Estate Sales | EstateSalen`,
      meta_description: ai.meta_description || '',
      schema_json: buildCategorySchema(trimmedCategory, slug, ai, allItems.length),
      status: 'published',
      indexed_status: 'not_submitted',
    };

    let hubId;
    if (existingHub) {
      await base44.asServiceRole.entities.SEOCategoryHub.update(existingHub.id, hubData);
      hubId = existingHub.id;
    } else {
      const created = await base44.asServiceRole.entities.SEOCategoryHub.create(hubData);
      hubId = created.id;
    }

    // Build schemas
    const categorySchema = buildCategorySchema(trimmedCategory, slug, ai, allItems.length);
    const breadcrumbSchema = buildBreadcrumbSchema(trimmedCategory, slug);
    const combinedSchema = { '@graph': [categorySchema, breadcrumbSchema] };

    // Build main content
    const mainContent = buildMainContent(trimmedCategory, ai, allItems, soldItems, activeItems, relatedBrands, relatedCities);

    // Internal links
    const internalLinks = [
      '/estate-sales/finder',
      '/categories',
      ...allBrands.slice(0, 4).map(b => `/brands/${toSlugPart(b)}`),
      ...relatedCities.slice(0, 3).map(({ city, state }) => `/estate-sales/${toSlugPart(city)}-${toSlugPart(state)}`),
    ];

    const pageData = {
      page_type: 'category',
      entity_id: hubId,
      slug,
      title: ai.seo_title || `${trimmedCategory} at Estate Sales | EstateSalen`,
      meta_description: ai.meta_description || '',
      h1: ai.h1 || `${trimmedCategory} at Estate Sales`,
      intro_content: ai.category_intro || '',
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
      message: existingHub ? 'Category hub updated' : 'Category hub created',
      category_name: trimmedCategory,
      slug,
      hub_id: hubId,
      items_found: allItems.length,
      items_sold: soldItems.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});