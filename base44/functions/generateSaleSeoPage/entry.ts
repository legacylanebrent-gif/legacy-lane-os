import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

// ─── Slug helpers ─────────────────────────────────────────────────────────────
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

function buildSaleSlug(sale) {
  const city = toSlugPart(sale.property_address?.city || '');
  const state = toSlugPart(sale.property_address?.state || '');
  const title = toSlugPart(sale.title || 'estate-sale');
  const shortId = sale.id.substring(0, 8);
  const base = [title, city, state].filter(Boolean).join('-');
  const truncated = base.length > 80 ? base.substring(0, 80).replace(/-[^-]*$/, '') : base;
  return `/estate-sales/${truncated}-${shortId}`;
}

// ─── Address visibility ───────────────────────────────────────────────────────
function resolveAddress(sale) {
  const addr = sale.property_address || {};
  const city = addr.city || '';
  const state = addr.state || '';
  const zip = addr.zip || '';
  const street = addr.street || '';

  // Find earliest sale date
  const dates = (sale.sale_dates || []).map(d => new Date(d.date)).filter(d => !isNaN(d));
  if (!dates.length) return { display: [city, state].filter(Boolean).join(', '), full: false };

  const earliest = new Date(Math.min(...dates));
  const now = new Date();
  const hoursUntil = (earliest - now) / 36e5;

  const showFull = hoursUntil <= 24;
  if (showFull && street) {
    return { display: `${street}, ${city}, ${state} ${zip}`.trim(), full: true };
  }
  return { display: [city, state, zip].filter(Boolean).join(', '), full: false };
}

// ─── Extract top brands / categories from images ──────────────────────────────
function extractTopFromImages(images, field, limit = 5) {
  const counts = {};
  for (const img of images) {
    const val = (img.categories || []);
    if (Array.isArray(val)) {
      val.forEach(v => { if (v) counts[v] = (counts[v] || 0) + 1; });
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

function extractTopCategories(sale, limit = 8) {
  const cats = sale.categories || [];
  if (cats.length) return cats.slice(0, limit);
  // Fall back to image categories
  return extractTopFromImages(sale.images || [], 'categories', limit);
}

function extractFeaturedItems(images, limit = 10) {
  return images
    .filter(img => img.name)
    .slice(0, limit)
    .map(img => ({ name: img.name, price: img.price, description: img.description }));
}

// ─── AI content generation ────────────────────────────────────────────────────
async function generateSaleAIContent(openai, sale, addressInfo, topCategories, featuredItems, company) {
  const city = sale.property_address?.city || '';
  const county = sale.property_address?.region || '';
  const state = sale.property_address?.state || '';
  const locationStr = [city, county ? county + ' County' : '', state].filter(Boolean).join(', ');

  const dateList = (sale.sale_dates || [])
    .map(d => `${d.date}${d.start_time ? ' ' + d.start_time : ''}${d.end_time ? '–' + d.end_time : ''}`)
    .join(', ');

  const prompt = `You are an SEO content writer for EstateSalen.com, an estate sale directory.

Write a full SEO page for this estate sale. Return JSON only.

SALE DATA:
Title: ${sale.title || 'Estate Sale'}
Location: ${locationStr}
Address shown: ${addressInfo.display}
Dates: ${dateList || 'TBD'}
Company: ${company?.full_name || sale.operator_name || 'Estate Sale Company'}
Sale Type: ${sale.sale_type || 'estate_tag_sale_private_home'}
Categories: ${topCategories.join(', ') || 'Various items'}
Featured Items (sample): ${featuredItems.map(i => i.name + (i.price ? ' ($' + i.price + ')' : '')).join(', ') || 'Various antiques and household items'}
Description: ${sale.description || 'No description provided'}
Special Notes: ${sale.special_notes || 'None'}

Return this exact JSON structure:
{
  "seo_title": "",
  "meta_description": "",
  "h1": "",
  "intro_content": "",
  "local_commentary": "",
  "inventory_summary": "",
  "attending_tips": "",
  "keywords": [],
  "faq": [
    {"question": "", "answer": ""},
    {"question": "", "answer": ""},
    {"question": "", "answer": ""},
    {"question": "", "answer": ""}
  ]
}

Rules:
- seo_title: max 60 chars, include city and state
- meta_description: max 155 chars, compelling and include location + dates
- h1: natural, include city and sale type
- intro_content: 2-3 sentences, engaging opening, mention location and company
- local_commentary: 2-3 sentences about the local estate sale market in this city/area
- inventory_summary: 2-3 sentences describing what's in this sale based on categories and featured items. Use "appears to include," "may feature," etc.
- attending_tips: 2-3 sentences of practical advice for attending this specific sale
- keywords: 8-12 SEO keyword phrases
- faq: 4 genuine questions a shopper might ask about this sale`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 1200,
  });

  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return {
      seo_title: `${sale.title || 'Estate Sale'} in ${city}, ${state} | EstateSalen`,
      meta_description: `Estate sale in ${locationStr}. Browse items and get directions on EstateSalen.com.`,
      h1: sale.title || `Estate Sale in ${city}, ${state}`,
      intro_content: `Browse this estate sale in ${locationStr}.`,
      local_commentary: '',
      inventory_summary: '',
      attending_tips: '',
      keywords: [],
      faq: [],
    };
  }
}

// ─── Schema builders ──────────────────────────────────────────────────────────
function buildEventSchema(sale, slug, addressInfo) {
  const addr = sale.property_address || {};
  const dates = (sale.sale_dates || []).sort((a, b) => new Date(a.date) - new Date(b.date));
  const startDate = dates[0]?.date ? `${dates[0].date}T${dates[0].start_time || '09:00'}` : null;
  const endDate = dates[dates.length - 1]?.date
    ? `${dates[dates.length - 1].date}T${dates[dates.length - 1].end_time || '17:00'}`
    : null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: sale.title || 'Estate Sale',
    description: sale.description || `Estate sale in ${addr.city || ''}, ${addr.state || ''}`,
    url: `https://estatesalen.com${slug}`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: addressInfo.display,
      address: {
        '@type': 'PostalAddress',
        addressLocality: addr.city || '',
        addressRegion: addr.state || '',
        postalCode: addr.zip || '',
        addressCountry: 'US',
        ...(addressInfo.full ? { streetAddress: addr.street || '' } : {}),
      },
    },
    organizer: {
      '@type': 'Organization',
      name: sale.operator_name || 'Estate Sale Company',
    },
  };
  if (startDate) schema.startDate = startDate;
  if (endDate) schema.endDate = endDate;
  return schema;
}

function buildBreadcrumbSchema(sale, slug) {
  const city = sale.property_address?.city || '';
  const state = sale.property_address?.state || '';
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://estatesalen.com' },
      { '@type': 'ListItem', position: 2, name: 'Estate Sales', item: 'https://estatesalen.com/estate-sales/finder' },
      ...(state ? [{ '@type': 'ListItem', position: 3, name: `${state} Estate Sales`, item: `https://estatesalen.com/estate-sales/${toSlugPart(state)}` }] : []),
      ...(city ? [{ '@type': 'ListItem', position: 4, name: `${city} Estate Sales`, item: `https://estatesalen.com/estate-sales/${toSlugPart(city)}-${toSlugPart(state)}` }] : []),
      { '@type': 'ListItem', position: state && city ? 5 : 3, name: sale.title || 'Estate Sale', item: `https://estatesalen.com${slug}` },
    ],
  };
}

// ─── Hub page updaters ────────────────────────────────────────────────────────
async function updateCityHub(base44, sale) {
  const city = sale.property_address?.city;
  const state = sale.property_address?.state;
  if (!city || !state) return;
  const slug = `/estate-sales/${toSlugPart(city)}-${toSlugPart(state)}`;
  const existing = await base44.asServiceRole.entities.SEOCityHub.filter({ slug });
  if (existing.length === 0) {
    await base44.asServiceRole.entities.SEOCityHub.create({
      city, state, slug,
      seo_title: `Estate Sales in ${city}, ${state} | EstateSalen`,
      meta_description: `Find upcoming estate sales in ${city}, ${state}. Browse items, companies, and sale dates on EstateSalen.com.`,
      status: 'draft',
      indexed_status: 'not_submitted',
      total_sales_count: 1,
    });
  } else {
    await base44.asServiceRole.entities.SEOCityHub.update(existing[0].id, {
      total_sales_count: (existing[0].total_sales_count || 0) + 1,
    });
  }
}

async function updateCountyHub(base44, sale) {
  const county = sale.property_address?.region;
  const state = sale.property_address?.state;
  if (!county || !state) return;
  const slug = `/estate-sales/${toSlugPart(county)}-county-${toSlugPart(state)}`;
  const existing = await base44.asServiceRole.entities.SEOCityHub.filter({ slug });
  if (existing.length === 0) {
    await base44.asServiceRole.entities.SEOCityHub.create({
      city: county + ' County', state, slug,
      county,
      seo_title: `Estate Sales in ${county} County, ${state} | EstateSalen`,
      meta_description: `Browse estate sales in ${county} County, ${state}. Find items, dates, and companies on EstateSalen.com.`,
      status: 'draft',
      indexed_status: 'not_submitted',
      total_sales_count: 1,
    });
  } else {
    await base44.asServiceRole.entities.SEOCityHub.update(existing[0].id, {
      total_sales_count: (existing[0].total_sales_count || 0) + 1,
    });
  }
}

async function touchBrandHub(base44, brandName) {
  if (!brandName) return;
  const slug = `/brands/${toSlugPart(brandName)}`;
  const existing = await base44.asServiceRole.entities.SEOBrandHub.filter({ slug });
  if (existing.length === 0) {
    await base44.asServiceRole.entities.SEOBrandHub.create({
      brand_name: brandName, slug,
      total_items_found: 1,
      seo_title: `${brandName} at Estate Sales | EstateSalen`,
      meta_description: `Find ${brandName} items at estate sales on EstateSalen.com.`,
      status: 'draft',
      indexed_status: 'not_submitted',
    });
  }
}

async function touchCategoryHub(base44, categoryName) {
  if (!categoryName) return;
  const slug = `/categories/${toSlugPart(categoryName)}`;
  const existing = await base44.asServiceRole.entities.SEOCategoryHub.filter({ slug });
  if (existing.length === 0) {
    await base44.asServiceRole.entities.SEOCategoryHub.create({
      category_name: categoryName, slug,
      total_items_found: 1,
      seo_title: `${categoryName} at Estate Sales | EstateSalen`,
      meta_description: `Shop ${categoryName} at estate sales near you on EstateSalen.com.`,
      status: 'draft',
      indexed_status: 'not_submitted',
    });
  }
}

// ─── Build full main_content markdown ─────────────────────────────────────────
function buildMainContent(sale, aiContent, addressInfo, topCategories, featuredItems, company) {
  const city = sale.property_address?.city || '';
  const county = sale.property_address?.region || '';
  const state = sale.property_address?.state || '';
  const locationStr = [city, state].filter(Boolean).join(', ');
  const companyName = company?.full_name || sale.operator_name || 'the estate sale company';

  const dateList = (sale.sale_dates || [])
    .map(d => {
      const parts = [d.date];
      if (d.start_time) parts.push(d.start_time);
      if (d.end_time) parts.push('– ' + d.end_time);
      return parts.join(' ');
    })
    .join('\n- ');

  let content = `## About This Estate Sale\n\n${aiContent.intro_content || ''}\n\n`;

  if (dateList) {
    content += `## Sale Dates & Times\n\n- ${dateList}\n\n`;
  }

  content += `## Location\n\n**${addressInfo.display}**\n\n`;
  if (!addressInfo.full) {
    content += `*Full address will be released closer to the sale date. Sign in early to be notified.*\n\n`;
  }

  if (aiContent.inventory_summary) {
    content += `## What's in This Sale\n\n${aiContent.inventory_summary}\n\n`;
  }

  if (topCategories.length) {
    content += `### Item Categories\n\n${topCategories.map(c => `- ${c}`).join('\n')}\n\n`;
  }

  if (featuredItems.length) {
    content += `### Featured Items\n\n`;
    featuredItems.forEach(item => {
      content += `- **${item.name}**${item.price ? ' — $' + item.price : ''}${item.description ? ': ' + item.description.substring(0, 100) : ''}\n`;
    });
    content += '\n';
  }

  if (companyName) {
    content += `## About the Company\n\n`;
    content += `This sale is managed by **${companyName}**`;
    if (city) content += `, serving the ${city}${county ? ' / ' + county + ' County' : ''} area`;
    content += '.\n\n';
  }

  if (aiContent.local_commentary) {
    content += `## Estate Sales in ${locationStr}\n\n${aiContent.local_commentary}\n\n`;
  }

  if (aiContent.attending_tips) {
    content += `## Tips for Attending\n\n${aiContent.attending_tips}\n\n`;
  }

  if (sale.payment_methods?.length) {
    content += `## Payment Methods\n\n${sale.payment_methods.join(', ')}\n\n`;
  }

  if (sale.parking_info) {
    content += `## Parking\n\n${sale.parking_info}\n\n`;
  }

  if (sale.special_notes) {
    content += `## Special Notes\n\n${sale.special_notes}\n\n`;
  }

  content += `## Find More Estate Sales\n\nLooking for more estate sales${locationStr ? ' in ' + locationStr : ''}? [Browse all upcoming sales](/estate-sales/finder) on EstateSalen.com.\n`;

  return content;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    // Accept both automation payload and direct API call
    const saleId = body?.data?.id || body?.event?.entity_id || body?.sale_id;

    if (!saleId) {
      return Response.json({ error: 'sale_id is required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    // Load sale
    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: saleId });
    if (!sales.length) return Response.json({ error: 'Sale not found' }, { status: 404 });
    const sale = sales[0];

    // Only generate for upcoming/active sales
    if (!['upcoming', 'active', 'completed'].includes(sale.status)) {
      return Response.json({ message: `Skipped — sale status is "${sale.status}"` });
    }

    // Buyout events are operator-only — no SEO generation
    if (sale.sale_type === 'buyout_or_cleanout') {
      return Response.json({ message: 'Skipped — buyout event, no SEO' });
    }

    // Load Estate Sale Company Owner/company user
    let company = null;
    if (sale.operator_id) {
      const users = await base44.asServiceRole.entities.User.filter({ id: sale.operator_id });
      if (users.length) company = users[0];
    }

    const addressInfo = resolveAddress(sale);
    const topCategories = extractTopCategories(sale);
    const namedImages = (sale.images || []).filter(img => img.name && img.name.trim());
    const featuredItems = extractFeaturedItems(namedImages);

    // Build slug
    const slug = buildSaleSlug(sale);

    // Generate AI content
    const aiContent = await generateSaleAIContent(openai, sale, addressInfo, topCategories, featuredItems, company);

    // Build schemas
    const eventSchema = buildEventSchema(sale, slug, addressInfo);
    const breadcrumbSchema = buildBreadcrumbSchema(sale, slug);
    const combinedSchema = { '@graph': [eventSchema, breadcrumbSchema] };

    // Build main content
    const mainContent = buildMainContent(sale, aiContent, addressInfo, topCategories, featuredItems, company);

    // Build FAQ
    const faqJson = (aiContent.faq || []).map(f => ({ question: f.question, answer: f.answer }));

    // Internal links
    const city = sale.property_address?.city;
    const state = sale.property_address?.state;
    const county = sale.property_address?.region;
    const internalLinks = [
      '/estate-sales/finder',
      ...(city && state ? [`/estate-sales/${toSlugPart(city)}-${toSlugPart(state)}`] : []),
      ...(county && state ? [`/estate-sales/${toSlugPart(county)}-county-${toSlugPart(state)}`] : []),
      ...(company ? [`/companies/${toSlugPart(company.full_name || sale.operator_name || '')}`] : []),
      ...topCategories.slice(0, 3).map(c => `/categories/${toSlugPart(c)}`),
    ].filter(Boolean);

    const pageData = {
      page_type: 'sale',
      entity_id: sale.id,
      slug,
      title: aiContent.seo_title || `${sale.title} | EstateSalen`,
      meta_description: aiContent.meta_description || '',
      h1: aiContent.h1 || sale.title || 'Estate Sale',
      intro_content: aiContent.intro_content || '',
      main_content: mainContent,
      faq_json: faqJson,
      schema_json: combinedSchema,
      canonical_url: `https://estatesalen.com${slug}`,
      status: 'published',
      indexed_status: 'not_submitted',
      published_at: new Date().toISOString(),
    };

    // Upsert SEOPage for this sale
    const existingPages = await base44.asServiceRole.entities.SEOPage.filter({ entity_id: sale.id, page_type: 'sale' });
    if (existingPages.length > 0) {
      await base44.asServiceRole.entities.SEOPage.update(existingPages[0].id, pageData);
    } else {
      await base44.asServiceRole.entities.SEOPage.create(pageData);
    }

    // Also save slug back to EstateSale record if not set
    if (!sale.seo_slug) {
      await base44.asServiceRole.entities.EstateSale.update(sale.id, { seo_slug: slug });
    }

    // Update hub pages in parallel
    const hubUpdates = [
      updateCityHub(base44, sale).catch(e => console.error('city hub error:', e.message)),
      updateCountyHub(base44, sale).catch(e => console.error('county hub error:', e.message)),
      ...topCategories.map(c => touchCategoryHub(base44, c).catch(() => {})),
    ];

    // Extract brand hints from featured items (simple heuristics from image descriptions)
    const potentialBrands = namedImages
      .flatMap(img => img.categories || [])
      .filter(Boolean)
      .slice(0, 5);
    potentialBrands.forEach(b => hubUpdates.push(touchBrandHub(base44, b).catch(() => {})));

    await Promise.all(hubUpdates);

    return Response.json({
      message: 'Sale SEO page generated successfully',
      slug,
      sale_id: sale.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});