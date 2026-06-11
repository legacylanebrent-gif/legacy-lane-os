/**
 * PIPELINE: Marketplace Item → Item Intelligence Repository + SEOBoost
 *
 * Accepts: { item_id }
 * Routes through itemMatchingService to upsert ItemKnowledge first.
 * Creates SEOBoost linked to item_knowledge_id.
 * Creates SEOPage only if ItemKnowledge reaches approved_public status.
 * Stores marketplace image reference in ItemImageReference.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { item_id } = await req.json();
    if (!item_id) return Response.json({ error: 'item_id required' }, { status: 400 });

    const items = await base44.entities.Item.filter({ id: item_id });
    if (!items.length) return Response.json({ error: 'Item not found' }, { status: 404 });
    const item = items[0];

    const specsText = item.category_specs && Object.keys(item.category_specs).length > 0
      ? Object.entries(item.category_specs).filter(([, v]) => v && v !== false)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(', ')
      : '';

    // AI SEO generation
    const seoData = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an SEO expert for estate sale and resale marketplace listings.

Generate a complete SEO and item intelligence package for:
- Title: ${item.title}
- Category: ${item.category || 'general'}
- Condition: ${item.condition || 'used'}
- Price: $${item.price || 'unknown'}
- Description: ${item.description || 'None'}
- Brand: ${item.brand || 'unknown'}
- Specs: ${specsText || 'none'}

Return JSON:
{
  "canonical_name": "clean canonical item name",
  "normalized_name": "lowercase canonical name",
  "category": "broad category",
  "subcategory": "specific type",
  "item_type": "single item type word",
  "brand": "brand or empty",
  "model": "model or empty",
  "pattern": "pattern or empty",
  "era": "era or empty",
  "style": "style or empty",
  "material": "material or empty",
  "short_description": "1-2 sentence summary",
  "long_description": "150-250 word SEO description",
  "seo_title": "SEO title under 60 chars",
  "seo_description": "meta description under 160 chars",
  "search_keywords": ["kw1","kw2","kw3","kw4","kw5"],
  "primary_keyword": "best single keyword phrase",
  "seo_score": 0-100,
  "estimated_organic_reach": integer,
  "confidence_score": 0-100,
  "category_insights": { "trending_keywords": [], "search_volume": integer, "competition": "low|medium|high" }
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          canonical_name: { type: 'string' },
          normalized_name: { type: 'string' },
          category: { type: 'string' },
          subcategory: { type: 'string' },
          item_type: { type: 'string' },
          brand: { type: 'string' },
          model: { type: 'string' },
          pattern: { type: 'string' },
          era: { type: 'string' },
          style: { type: 'string' },
          material: { type: 'string' },
          short_description: { type: 'string' },
          long_description: { type: 'string' },
          seo_title: { type: 'string' },
          seo_description: { type: 'string' },
          search_keywords: { type: 'array', items: { type: 'string' } },
          primary_keyword: { type: 'string' },
          seo_score: { type: 'integer' },
          estimated_organic_reach: { type: 'integer' },
          confidence_score: { type: 'integer' },
          category_insights: { type: 'object' },
        }
      }
    });

    // Route through central matching service
    const matchRes = await base44.asServiceRole.functions.invoke('itemMatchingService', {
      canonical_name: seoData.canonical_name || item.title,
      normalized_name: seoData.normalized_name || (item.title || '').toLowerCase(),
      brand: seoData.brand || item.brand || '',
      category: seoData.category || item.category || '',
      subcategory: seoData.subcategory || '',
      item_type: seoData.item_type || '',
      model: seoData.model || '',
      pattern: seoData.pattern || '',
      era: seoData.era || '',
      style: seoData.style || '',
      material: seoData.material || '',
      short_description: seoData.short_description || '',
      long_description: seoData.long_description || '',
      seo_title: seoData.seo_title || '',
      seo_description: seoData.seo_description || '',
      search_keywords: seoData.search_keywords || [],
      confidence_score: seoData.confidence_score || 65,

      // Marketplace image stored as image reference
      original_image_url: item.image_url || item.images?.[0] || '',
      source_type: 'marketplace',
      source_record_id: item_id,
      operator_id: item.operator_id || user.id,

      price: item.price || null,
      sold_status: item.sold ? 'sold' : 'listed',
      price_source_type: 'marketplace',
      ai_metadata: seoData,
    });

    const knowledgeId = matchRes?.item_knowledge_id;

    // Upsert SEOBoost linked to item_knowledge_id
    const existing = await base44.asServiceRole.entities.SEOBoost.filter({ item_id });
    for (const old of existing) {
      await base44.asServiceRole.entities.SEOBoost.delete(old.id);
    }

    const boost = await base44.asServiceRole.entities.SEOBoost.create({
      item_id,
      item_knowledge_id: knowledgeId || null,
      marketplace_item_id: item.marketplace_item_id || null,
      boost_type: 'keyword_rich_title',
      keywords: [seoData.primary_keyword, ...(seoData.search_keywords || [])],
      primary_keyword: seoData.primary_keyword,
      secondary_keywords: seoData.search_keywords || [],
      suggested_title: seoData.seo_title,
      suggested_description: seoData.long_description,
      meta_description: seoData.seo_description,
      seo_score: seoData.seo_score,
      estimated_organic_reach: seoData.estimated_organic_reach,
      category_insights: seoData.category_insights,
      status: 'active',
      last_updated: new Date().toISOString(),
      boost_reason: `AI-generated SEO boost for "${item.title}"`,
    });

    return Response.json({
      success: true,
      boost,
      item_knowledge_id: knowledgeId,
      match_method: matchRes?.match_method,
    });

  } catch (error) {
    console.error('generateItemSEO error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});