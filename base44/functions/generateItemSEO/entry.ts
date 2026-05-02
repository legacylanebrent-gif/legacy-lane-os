import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { item_id } = await req.json();
    if (!item_id) return Response.json({ error: 'item_id required' }, { status: 400 });

    const item = await base44.entities.Item.filter({ id: item_id });
    if (!item || item.length === 0) return Response.json({ error: 'Item not found' }, { status: 404 });
    const itemData = item[0];

    // Build a rich prompt using all available item data
    const specsText = itemData.category_specs && Object.keys(itemData.category_specs).length > 0
      ? Object.entries(itemData.category_specs)
          .filter(([, v]) => v && v !== false)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
          .join(', ')
      : '';

    const prompt = `You are an SEO expert specializing in estate sale and resale marketplace listings.

Generate a complete SEO package for this item listing:
- Title: ${itemData.title}
- Category: ${itemData.category || 'general'}
- Condition: ${itemData.condition || 'used'}
- Price: $${itemData.price || 'unknown'}
- Description: ${itemData.description || 'No description provided'}
- Brand: ${itemData.brand || 'unknown'}
- Additional specs: ${specsText || 'none'}

Return a JSON object with:
{
  "suggested_title": "SEO-optimized title under 60 characters",
  "suggested_description": "Rich 150-250 word description with natural keyword integration",
  "meta_description": "Compelling meta description under 160 characters",
  "primary_keyword": "single best search keyword phrase",
  "secondary_keywords": ["keyword2", "keyword3", "keyword4", "keyword5"],
  "seo_score": number between 0 and 100,
  "estimated_organic_reach": estimated monthly search impressions as integer,
  "category_insights": {
    "trending_keywords": ["kw1","kw2","kw3"],
    "search_volume": integer,
    "competition": "low" or "medium" or "high"
  }
}`;

    const seoData = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          suggested_title: { type: 'string' },
          suggested_description: { type: 'string' },
          meta_description: { type: 'string' },
          primary_keyword: { type: 'string' },
          secondary_keywords: { type: 'array', items: { type: 'string' } },
          seo_score: { type: 'integer' },
          estimated_organic_reach: { type: 'integer' },
          category_insights: { type: 'object' }
        }
      }
    });

    // Upsert: remove old boost for this item if exists
    const existing = await base44.asServiceRole.entities.SEOBoost.filter({ item_id });
    for (const old of existing) {
      await base44.asServiceRole.entities.SEOBoost.delete(old.id);
    }

    const boost = await base44.asServiceRole.entities.SEOBoost.create({
      item_id,
      marketplace_item_id: itemData.marketplace_item_id || null,
      estate_sale_id: itemData.estate_sale_id || null,
      boost_type: 'keyword_rich_title',
      keywords: [seoData.primary_keyword, ...(seoData.secondary_keywords || [])],
      primary_keyword: seoData.primary_keyword,
      secondary_keywords: seoData.secondary_keywords || [],
      suggested_title: seoData.suggested_title,
      suggested_description: seoData.suggested_description,
      meta_description: seoData.meta_description,
      seo_score: seoData.seo_score,
      estimated_organic_reach: seoData.estimated_organic_reach,
      category_insights: seoData.category_insights,
      status: 'active',
      last_updated: new Date().toISOString(),
      boost_reason: `AI-generated SEO boost on demand for "${itemData.title}"`
    });

    return Response.json({ status: 'success', boost, seoData });
  } catch (error) {
    console.error('generateItemSEO error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});