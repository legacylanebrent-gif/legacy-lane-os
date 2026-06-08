import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BASE_URL = 'https://www.estatesalen.com';

// ── Schema type templates ──
function buildSchema(type, data) {
  const base = { '@context': 'https://schema.org', '@type': type };

  switch (type) {
    case 'Article':
      return {
        ...base,
        headline: data.title || '',
        description: data.description || '',
        url: data.url || '',
        dateModified: new Date().toISOString(),
        publisher: { '@type': 'Organization', name: 'EstateSalen', url: BASE_URL },
        author: { '@type': 'Organization', name: 'EstateSalen Editorial Team' },
      };
    case 'FAQPage':
      return {
        ...base,
        mainEntity: (data.faq || []).map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      };
    case 'HowTo':
      return {
        ...base,
        name: data.title || '',
        description: data.description || '',
        step: (data.steps || []).map((step, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: step.name || step,
          text: step.text || step,
        })),
      };
    case 'BreadcrumbList':
      return {
        ...base,
        itemListElement: (data.breadcrumbs || []).map((crumb, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: crumb.label,
          ...(crumb.path ? { item: `${BASE_URL}${crumb.path}` } : {}),
        })),
      };
    case 'LocalBusiness':
      return {
        ...base,
        name: data.name || '',
        description: data.description || '',
        url: data.url || '',
        address: { '@type': 'PostalAddress', addressRegion: data.state || '', addressCountry: 'US' },
        areaServed: data.state || '',
      };
    case 'Service':
      return {
        ...base,
        name: data.title || '',
        description: data.description || '',
        provider: { '@type': 'Organization', name: 'EstateSalen', url: BASE_URL },
        areaServed: { '@type': 'Country', name: 'US' },
      };
    case 'Product':
      return {
        ...base,
        name: data.title || '',
        description: data.description || '',
        brand: { '@type': 'Brand', name: data.brand || 'Unknown' },
        category: data.category || '',
      };
    case 'Offer':
      return {
        ...base,
        name: data.title || '',
        description: data.description || '',
        seller: { '@type': 'Organization', name: 'EstateSalen' },
        url: data.url || '',
      };
    case 'VideoObject':
      return {
        ...base,
        name: data.title || '',
        description: data.description || '',
        uploadDate: data.date || new Date().toISOString(),
        publisher: { '@type': 'Organization', name: 'EstateSalen' },
        ...(data.youtube_url ? { contentUrl: data.youtube_url } : {}),
        ...(data.thumbnail_url ? { thumbnailUrl: data.thumbnail_url } : {}),
      };
    case 'Organization':
      return {
        ...base,
        name: 'EstateSalen',
        url: BASE_URL,
        description: 'National estate sale and life transition platform. Find estate sales, estate sale companies, probate resources, and life transition guides.',
        sameAs: ['https://www.estatesalen.com'],
      };
    case 'ItemList':
      return {
        ...base,
        name: data.title || '',
        itemListElement: (data.items || []).map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name || item,
          url: item.url || '',
        })),
      };
    default:
      return { ...base, name: data.title || '', description: data.description || '' };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      page_url,
      page_type = 'other',
      seo_title,
      seo_description,
      schema_types = ['Article'],   // array of schema types to generate
      schema_data = {},             // data object used to build schemas
      faq = [],                     // for FAQPage schema
      breadcrumbs = [],             // for BreadcrumbList schema
      entity_id,                    // optional: update the source entity's indexed_status
      entity_type,                  // e.g. 'LifeEventHub', 'StateGuide', 'ItemKnowledgeBase'
    } = body;

    if (!page_url) {
      return Response.json({ error: 'page_url is required' }, { status: 400 });
    }

    const canonicalUrl = page_url.startsWith('http') ? page_url : `${BASE_URL}${page_url}`;

    // ── 1. Build all requested schemas ──
    const schemas = [];

    for (const schemaType of schema_types) {
      const data = {
        ...schema_data,
        url: canonicalUrl,
        faq,
        breadcrumbs,
      };
      schemas.push(buildSchema(schemaType, data));
    }

    // Always include BreadcrumbList if breadcrumbs provided and not already included
    if (breadcrumbs.length > 0 && !schema_types.includes('BreadcrumbList')) {
      schemas.push(buildSchema('BreadcrumbList', { breadcrumbs }));
    }

    // Always include FAQPage if faq provided and not already included
    if (faq.length > 0 && !schema_types.includes('FAQPage')) {
      schemas.push(buildSchema('FAQPage', { faq }));
    }

    // ── 2. Build SEO meta block ──
    const seoMeta = {
      canonical: canonicalUrl,
      title: seo_title || schema_data.title || '',
      description: seo_description || schema_data.description || '',
      og_title: seo_title || schema_data.title || '',
      og_description: seo_description || schema_data.description || '',
      og_url: canonicalUrl,
      og_type: schema_types.includes('Article') ? 'article' : 'website',
      twitter_card: 'summary_large_image',
      schemas,
    };

    const now = new Date().toISOString();

    // ── 3. Upsert SEOIndexLog ──
    const existingLogs = await base44.asServiceRole.entities.SEOIndexLog.filter({ page_url });
    if (existingLogs.length > 0) {
      await base44.asServiceRole.entities.SEOIndexLog.update(existingLogs[0].id, {
        page_type,
        sitemap_status: 'included',
        indexing_status: 'submitted',
        last_submitted_at: now,
        last_checked_at: now,
      });
    } else {
      await base44.asServiceRole.entities.SEOIndexLog.create({
        page_url,
        page_type,
        sitemap_status: 'included',
        indexing_status: 'submitted',
        last_submitted_at: now,
        last_checked_at: now,
      });
    }

    // ── 4. Update source entity's indexed_status if provided ──
    if (entity_id && entity_type) {
      const entityMap = {
        LifeEventHub: base44.asServiceRole.entities.LifeEventHub,
        StateGuide: base44.asServiceRole.entities.StateGuide,
        CountyGuide: base44.asServiceRole.entities.CountyGuide,
        ItemKnowledgeBase: base44.asServiceRole.entities.ItemKnowledgeBase,
        EstateSaleUniversityArticle: base44.asServiceRole.entities.EstateSaleUniversityArticle,
        ProbateState: base44.asServiceRole.entities.ProbateState,
        ProbateCounty: base44.asServiceRole.entities.ProbateCounty,
        EstateSale: base44.asServiceRole.entities.EstateSale,
      };
      const entityClient = entityMap[entity_type];
      if (entityClient) {
        await entityClient.update(entity_id, { indexed_status: 'submitted' });
      }
    }

    return Response.json({
      page_url,
      canonical: canonicalUrl,
      page_type,
      seo_meta: seoMeta,
      schemas,
      schemas_generated: schemas.length,
      logged: true,
      submitted_at: now,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});