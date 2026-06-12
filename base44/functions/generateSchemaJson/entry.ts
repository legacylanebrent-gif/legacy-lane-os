import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Schema builders ──────────────────────────────────────────────────────────

function buildBreadcrumbs(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function buildFAQSchema(faqJson) {
  if (!faqJson?.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: faqJson.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

function saleSchema(data) {
  const { sale, faqJson, canonicalUrl } = data;
  const address = sale.property_address || {};
  const startDate = sale.sale_dates?.[0]?.date || null;
  const endDate = sale.sale_dates?.[sale.sale_dates.length - 1]?.date || null;
  const schemas = [];

  // Event
  const event = {
    '@type': 'Event',
    name: sale.title || 'Estate Sale',
    description: sale.seo_description || sale.ai_summary || sale.description || '',
    url: canonicalUrl,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: sale.title,
      address: {
        '@type': 'PostalAddress',
        addressLocality: address.city || '',
        addressRegion: address.state || '',
        postalCode: address.zip || '',
        addressCountry: 'US',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: sale.operator_name || 'Estate Sale Company Owner',
    },
  };
  if (startDate) event.startDate = startDate;
  if (endDate) event.endDate = endDate;
  if (sale.images?.[0]?.url) event.image = sale.images[0].url;
  schemas.push(event);

  // LocalBusiness
  schemas.push({
    '@type': 'LocalBusiness',
    name: sale.operator_name || 'Estate Sale Company',
    url: `https://estatesalen.com`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: address.city || '',
      addressRegion: address.state || '',
      postalCode: address.zip || '',
      addressCountry: 'US',
    },
  });

  // BreadcrumbList
  schemas.push(buildBreadcrumbs([
    { name: 'Home', url: 'https://estatesalen.com/' },
    { name: 'Estate Sales', url: 'https://estatesalen.com/estate-sales/finder' },
    ...(address.state ? [{ name: `${address.state} Estate Sales`, url: `https://estatesalen.com/state/${address.state.toLowerCase()}` }] : []),
    { name: sale.title || 'Estate Sale', url: canonicalUrl },
  ]));

  // FAQPage
  const faq = buildFAQSchema(faqJson);
  if (faq) schemas.push(faq);

  return schemas;
}

function itemSchema(data) {
  const { item, sale, faqJson, canonicalUrl } = data;
  const schemas = [];

  // Product
  const product = {
    '@type': 'Product',
    name: item.item_name || 'Estate Sale Item',
    description: item.ai_description || item.condition_summary || '',
    url: canonicalUrl,
    brand: item.brand_name ? { '@type': 'Brand', name: item.brand_name } : undefined,
    category: item.category_name || undefined,
  };
  if (item.image_url) product.image = item.image_url;

  // Offer if value data available
  if (item.value_low || item.sold_price) {
    product.offers = {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: item.sold_price || item.value_low,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: item.sold_status === 'sold'
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
      url: canonicalUrl,
    };
  }
  schemas.push(product);

  // BreadcrumbList
  const crumbs = [
    { name: 'Home', url: 'https://estatesalen.com/' },
    { name: 'Items', url: 'https://estatesalen.com/items' },
  ];
  if (item.category_name) crumbs.push({ name: item.category_name, url: `https://estatesalen.com/categories/${item.category_name.toLowerCase().replace(/\s+/g, '-')}` });
  crumbs.push({ name: item.item_name || 'Item', url: canonicalUrl });
  schemas.push(buildBreadcrumbs(crumbs));

  // FAQPage
  const faq = buildFAQSchema(faqJson);
  if (faq) schemas.push(faq);

  return schemas;
}

function companySchema(data) {
  const { company, reviews, canonicalUrl } = data;
  const schemas = [];

  const sharedAddress = {
    '@type': 'PostalAddress',
    addressLocality: company.city || '',
    addressRegion: company.state || '',
    postalCode: company.zip_code || '',
    addressCountry: 'US',
  };

  // LocalBusiness
  const localBiz = {
    '@type': 'LocalBusiness',
    name: company.company_name || 'Estate Sale Company',
    url: canonicalUrl,
    address: sharedAddress,
  };
  if (company.phone) localBiz.telephone = company.phone;
  if (company.website_url) localBiz.sameAs = [company.website_url];
  schemas.push(localBiz);

  // Organization
  schemas.push({
    '@type': 'Organization',
    name: company.company_name || 'Estate Sale Company',
    url: canonicalUrl,
    address: sharedAddress,
    ...(company.website_url ? { sameAs: [company.website_url] } : {}),
  });

  // Reviews if available
  if (reviews?.length) {
    schemas[0].review = reviews.slice(0, 5).map(r => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: r.rating || 5, bestRating: 5 },
      author: { '@type': 'Person', name: r.author || 'Anonymous' },
      reviewBody: r.body || '',
    }));
  }

  return schemas;
}

function blogSchema(data) {
  const { page, faqJson, canonicalUrl } = data;
  const schemas = [];

  // Article
  schemas.push({
    '@type': 'BlogPosting',
    headline: page.h1 || page.title || '',
    description: page.meta_description || '',
    url: canonicalUrl,
    datePublished: page.published_at || new Date().toISOString(),
    dateModified: page.updated_date || page.published_at || new Date().toISOString(),
    author: { '@type': 'Organization', name: 'EstateSalen.com', url: 'https://estatesalen.com' },
    publisher: { '@type': 'Organization', name: 'EstateSalen.com', url: 'https://estatesalen.com' },
  });

  // BreadcrumbList
  schemas.push(buildBreadcrumbs([
    { name: 'Home', url: 'https://estatesalen.com/' },
    { name: 'Blog', url: 'https://estatesalen.com/blog' },
    { name: page.h1 || page.title || 'Article', url: canonicalUrl },
  ]));

  // FAQPage
  const faq = buildFAQSchema(faqJson);
  if (faq) schemas.push(faq);

  return schemas;
}

function collectionPageSchema(data) {
  const { page, pageType, faqJson, canonicalUrl, items } = data;
  const schemas = [];

  // CollectionPage
  const collection = {
    '@type': 'CollectionPage',
    name: page.h1 || page.title || '',
    description: page.meta_description || '',
    url: canonicalUrl,
  };
  if (items?.length) {
    collection.hasPart = items.slice(0, 10).map(i => ({
      '@type': 'Thing',
      name: i.name || i.item_name || i.title || '',
      url: i.url || '',
    }));
  }
  schemas.push(collection);

  // BreadcrumbList — tailored per page type
  const typeLabels = { brand: 'Brands', category: 'Categories', city: 'Cities', county: 'Locations', state: 'States' };
  schemas.push(buildBreadcrumbs([
    { name: 'Home', url: 'https://estatesalen.com/' },
    { name: typeLabels[pageType] || 'Browse', url: `https://estatesalen.com/${pageType}s` },
    { name: page.h1 || page.title || '', url: canonicalUrl },
  ]));

  // FAQPage
  const faq = buildFAQSchema(faqJson);
  if (faq) schemas.push(faq);

  return schemas;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
function generateSchemas(pageType, data) {
  switch (pageType) {
    case 'sale':     return saleSchema(data);
    case 'item':     return itemSchema(data);
    case 'company':  return companySchema(data);
    case 'blog':     return blogSchema(data);
    case 'brand':
    case 'category':
    case 'city':
    case 'county':
    case 'state':    return collectionPageSchema({ ...data, pageType });
    default:         return [];
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { page_type, data, save_to_slug } = body;

    if (!page_type) return Response.json({ error: 'page_type is required' }, { status: 400 });
    if (!data) return Response.json({ error: 'data is required' }, { status: 400 });

    const canonicalUrl = data.canonicalUrl || (save_to_slug ? `https://estatesalen.com${save_to_slug}` : '');
    const schemas = generateSchemas(page_type, { ...data, canonicalUrl });

    // Wrap in @context graph
    const schemaJson = {
      '@context': 'https://schema.org',
      '@graph': schemas.filter(Boolean),
    };

    // Optionally persist to the SEOPage record
    if (save_to_slug) {
      const existing = await base44.asServiceRole.entities.SEOPage.filter({ slug: save_to_slug });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.SEOPage.update(existing[0].id, { schema_json: schemaJson });
      }
    }

    return Response.json({ schema_json: schemaJson });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});