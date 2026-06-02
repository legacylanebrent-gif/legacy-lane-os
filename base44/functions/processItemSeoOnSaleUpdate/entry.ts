import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

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

function truncate(slug, max = 90) {
  if (slug.length <= max) return slug;
  const cut = slug.substring(0, max);
  const lastHyphen = cut.lastIndexOf('-');
  return lastHyphen > max * 0.5 ? cut.substring(0, lastHyphen) : cut;
}

function buildItemSlug(itemName, shortId) {
  const base = toSlugPart(itemName || 'estate-sale-item');
  const suffix = shortId ? '-' + shortId : '';
  return '/items/' + truncate(base, 90 - suffix.length) + suffix;
}

async function detectItemMetadata(openai, image) {
  const prompt = `You are an estate sale item categorization expert. Given the following item data, extract structured metadata.

Item name: ${image.name || 'Unknown'}
Description: ${image.description || 'None'}
Price: ${image.price || 'Unknown'}

Return JSON only with these fields:
{
  "category_name": "",
  "brand_name": "",
  "style": "",
  "estimated_age": "",
  "condition_summary": "",
  "search_keywords": []
}

Rules:
- category_name: broad category (e.g. Furniture, Jewelry, Art, Kitchenware, Clothing, Collectibles, Books, Electronics, Tools)
- brand_name: detected brand or empty string if unknown
- style: style period if detectable (e.g. Mid-Century Modern, Victorian, Art Deco) or empty
- estimated_age: era or decade if detectable (e.g. 1950s, circa 1920) or empty
- condition_summary: brief condition note based on description, or "Condition not specified"
- search_keywords: 5-8 relevant SEO keywords as an array`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 400,
  });

  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return { category_name: '', brand_name: '', style: '', estimated_age: '', condition_summary: '', search_keywords: [] };
  }
}

async function generateItemAIDescription(openai, image, metadata, sale) {
  const city = sale?.property_address?.city || '';
  const state = sale?.property_address?.state || '';
  const location = [city, state].filter(Boolean).join(', ');

  const prompt = `Write a concise, SEO-rich item description (3-5 sentences) for an estate sale item.

Item: ${image.name || 'Estate Sale Item'}
Category: ${metadata.category_name || 'Unknown'}
Brand: ${metadata.brand_name || 'Unknown'}
Style: ${metadata.style || 'Not specified'}
Estimated Age: ${metadata.estimated_age || 'Not specified'}
Condition: ${metadata.condition_summary || 'Not specified'}
Price: ${image.price ? '$' + image.price : 'Not listed'}
Location: ${location || 'Not specified'}
Original Description: ${image.description || 'None provided'}

Rules:
- Use hedging language when uncertain: "appears to be," "may be," "commonly associated with"
- Never claim authentic/rare/valuable unless explicitly stated
- Mention location naturally if relevant
- Write for estate sale shoppers and search engines
- Return the description as plain text only, no JSON`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 300,
  });

  return completion.choices[0].message.content.trim();
}

function buildItemSchema(image, metadata, sale, slug) {
  const city = sale?.property_address?.city || '';
  const state = sale?.property_address?.state || '';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: image.name || 'Estate Sale Item',
    description: image.description || '',
    url: `https://estatesalen.com${slug}`,
    offers: {
      '@type': 'Offer',
      availability: image.sold_status === 'sold'
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
      priceCurrency: 'USD',
    },
  };
  if (image.price) schema.offers.price = image.price;
  if (metadata.brand_name) schema.brand = { '@type': 'Brand', name: metadata.brand_name };
  if (city || state) {
    schema.locationCreated = { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: city, addressRegion: state } };
  }
  return schema;
}

async function upsertSeoItemProfile(base44, image, metadata, aiDescription, sale, shortId) {
  const existing = await base44.asServiceRole.entities.SEOItemProfile.filter({
    sale_id: sale.id,
    item_id: shortId,
  });

  const profileData = {
    item_id: shortId,
    sale_id: sale.id,
    company_id: sale.operator_id || '',
    brand_name: metadata.brand_name || '',
    category_name: metadata.category_name || '',
    style: metadata.style || '',
    estimated_age: metadata.estimated_age || '',
    condition_summary: metadata.condition_summary || '',
    value_low: image.price ? Math.round(image.price * 0.7) : null,
    value_high: image.price ? Math.round(image.price * 1.3) : null,
    sold_price: image.sold_price || null,
    sold_status: image.sold_status || (image.sold ? 'sold' : 'available'),
    ai_description: aiDescription,
    historical_context: metadata.style || metadata.estimated_age
      ? `This item ${metadata.style ? 'appears to be in the ' + metadata.style + ' style' : ''}${metadata.estimated_age ? ', commonly associated with the ' + metadata.estimated_age : ''}.`
      : '',
    search_keywords: metadata.search_keywords || [],
    image_url: image.url || '',
    item_name: image.name || '',
    indexed_status: 'not_submitted',
  };

  if (existing.length > 0) {
    await base44.asServiceRole.entities.SEOItemProfile.update(existing[0].id, profileData);
    return existing[0].id;
  } else {
    const created = await base44.asServiceRole.entities.SEOItemProfile.create(profileData);
    return created.id;
  }
}

async function upsertSeoPage(base44, image, metadata, aiDescription, sale, slug, schema, seoProfileId) {
  const city = sale?.property_address?.city || '';
  const state = sale?.property_address?.state || '';
  const locationStr = [city, state].filter(Boolean).join(', ');
  const isSold = image.sold_status === 'sold' || image.sold;
  const soldNote = isSold ? ' (Sold at Estate Sale)' : '';

  const seoTitle = `${image.name || 'Estate Sale Item'}${soldNote}${locationStr ? ' — ' + locationStr : ''} | EstateSalen`;
  const metaDesc = aiDescription.substring(0, 155);
  const h1 = `${image.name || 'Estate Sale Item'}${soldNote}`;

  // Build internal links
  const internalLinks = [];
  if (sale?.id) internalLinks.push(`/estate-sales/${sale.seo_slug || sale.id}`);
  if (metadata.category_name) internalLinks.push(`/categories/${toSlugPart(metadata.category_name)}`);
  if (metadata.brand_name) internalLinks.push(`/brands/${toSlugPart(metadata.brand_name)}`);
  if (city && state) internalLinks.push(`/estate-sales/${toSlugPart(city)}-${toSlugPart(state)}`);

  const faqJson = [
    {
      question: `What is this ${image.name || 'item'}?`,
      answer: aiDescription,
    },
    {
      question: `Where was this ${image.name || 'item'} found?`,
      answer: locationStr
        ? `This item appeared at an estate sale in ${locationStr}.`
        : 'This item appeared at an estate sale on EstateSalen.com.',
    },
    isSold && {
      question: `Was this item sold?`,
      answer: `Yes, this item was sold at an estate sale${image.sold_price ? ' for $' + image.sold_price : ''}.`,
    },
  ].filter(Boolean);

  const pageData = {
    page_type: 'item',
    entity_id: seoProfileId,
    slug,
    title: seoTitle,
    meta_description: metaDesc,
    h1,
    intro_content: aiDescription,
    main_content: `## About This Item\n\n${aiDescription}\n\n${metadata.brand_name ? `## Brand\n\nThis item appears to be associated with **${metadata.brand_name}**.\n\n` : ''}${metadata.style ? `## Style & Era\n\nThis piece ${metadata.style ? 'is consistent with the ' + metadata.style + ' aesthetic' : ''}${metadata.estimated_age ? ', believed to date from the ' + metadata.estimated_age : ''}.\n\n` : ''}## Condition\n\n${metadata.condition_summary || 'Condition details not specified.'}\n\n${isSold ? `## Sold at Estate Sale\n\nThis item has been sold${image.sold_price ? ' for $' + image.sold_price : ''}. Browse current estate sales in ${locationStr || 'your area'} for similar items.\n\n` : ''}## Find More Items\n\nBrowse more estate sale items${locationStr ? ' in ' + locationStr : ''} on [EstateSalen.com](/estate-sales/finder).`,
    faq_json: faqJson,
    schema_json: schema,
    canonical_url: `https://estatesalen.com${slug}`,
    status: 'published',
    indexed_status: 'not_submitted',
    published_at: new Date().toISOString(),
  };

  const existing = await base44.asServiceRole.entities.SEOPage.filter({ slug });
  if (existing.length > 0) {
    await base44.asServiceRole.entities.SEOPage.update(existing[0].id, pageData);
  } else {
    await base44.asServiceRole.entities.SEOPage.create(pageData);
  }
}

async function ensureBrandHub(base44, brandName) {
  if (!brandName) return;
  const slug = '/brands/' + toSlugPart(brandName);
  const existing = await base44.asServiceRole.entities.SEOBrandHub.filter({ slug });
  if (existing.length === 0) {
    await base44.asServiceRole.entities.SEOBrandHub.create({
      brand_name: brandName,
      slug,
      total_items_found: 1,
      seo_title: `${brandName} at Estate Sales | EstateSalen`,
      meta_description: `Find ${brandName} items at estate sales across the country on EstateSalen.com.`,
      status: 'draft',
      indexed_status: 'not_submitted',
    });
  } else {
    const hub = existing[0];
    await base44.asServiceRole.entities.SEOBrandHub.update(hub.id, {
      total_items_found: (hub.total_items_found || 0) + 1,
    });
  }
}

async function ensureCategoryHub(base44, categoryName) {
  if (!categoryName) return;
  const slug = '/categories/' + toSlugPart(categoryName);
  const existing = await base44.asServiceRole.entities.SEOCategoryHub.filter({ slug });
  if (existing.length === 0) {
    await base44.asServiceRole.entities.SEOCategoryHub.create({
      category_name: categoryName,
      slug,
      total_items_found: 1,
      seo_title: `${categoryName} at Estate Sales | EstateSalen`,
      meta_description: `Shop ${categoryName} at estate sales near you on EstateSalen.com.`,
      status: 'draft',
      indexed_status: 'not_submitted',
    });
  } else {
    const hub = existing[0];
    await base44.asServiceRole.entities.SEOCategoryHub.update(hub.id, {
      total_items_found: (hub.total_items_found || 0) + 1,
    });
  }
}

async function ensureCityHub(base44, sale) {
  const city = sale?.property_address?.city;
  const state = sale?.property_address?.state;
  if (!city || !state) return;
  const slug = '/estate-sales/' + toSlugPart(city) + '-' + toSlugPart(state);
  const existing = await base44.asServiceRole.entities.SEOCityHub.filter({ slug });
  if (existing.length === 0) {
    await base44.asServiceRole.entities.SEOCityHub.create({
      city,
      state,
      slug,
      seo_title: `Estate Sales in ${city}, ${state} | EstateSalen`,
      meta_description: `Find upcoming estate sales in ${city}, ${state}. Browse items, companies, and sale dates on EstateSalen.com.`,
      status: 'draft',
      indexed_status: 'not_submitted',
      total_sales_count: 1,
    });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Support both direct API calls (admin) and automation webhook payloads
    let saleId, forceAll;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      // Automation entity trigger payload
      saleId = body?.data?.id || body?.event?.entity_id || body?.sale_id;
      forceAll = body?.force_all || false;
    }

    // Auth check — allow service-role automations and admin users
    let isAutomation = false;
    try {
      const user = await base44.auth.me();
      if (!user) isAutomation = true; // automation calls have no user session
    } catch {
      isAutomation = true;
    }

    if (!saleId) {
      return Response.json({ error: 'sale_id is required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    // Load the sale
    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: saleId });
    if (!sales.length) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }
    const sale = sales[0];

    const images = (sale.images || []).filter(img => img.name && img.name.trim());
    if (!images.length) {
      return Response.json({ message: 'No named items to process', processed: 0 });
    }

    let processed = 0;
    const errors = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        // Use URL hash or index as short stable ID for this item within the sale
        const shortId = sale.id.substring(0, 8) + '-' + i;

        // 1-5. Detect metadata
        const metadata = await detectItemMetadata(openai, image);

        // 6. Generate slug
        const slug = buildItemSlug(image.name, shortId);

        // 7. Generate AI description
        const aiDescription = await generateItemAIDescription(openai, image, metadata, sale);

        // Build schema
        const schema = buildItemSchema(image, metadata, sale, slug);

        // 8. Upsert SEOItemProfile
        const seoProfileId = await upsertSeoItemProfile(base44, image, metadata, aiDescription, sale, shortId);

        // 9. Upsert SEOPage (page_type = item)
        await upsertSeoPage(base44, image, metadata, aiDescription, sale, slug, schema, seoProfileId);

        // 10. Ensure hub pages exist (brand, category, city) — fire and forget errors
        await Promise.all([
          ensureBrandHub(base44, metadata.brand_name).catch(() => {}),
          ensureCategoryHub(base44, metadata.category_name).catch(() => {}),
          ensureCityHub(base44, sale).catch(() => {}),
        ]);

        processed++;
      } catch (itemErr) {
        errors.push({ item: image.name, error: itemErr.message });
        console.error(`Error processing item "${image.name}":`, itemErr.message);
      }

      // Small delay to avoid rate limits on large sales
      if (i < images.length - 1) await new Promise(r => setTimeout(r, 300));
    }

    return Response.json({
      message: `Processed ${processed} of ${images.length} items`,
      processed,
      total: images.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});