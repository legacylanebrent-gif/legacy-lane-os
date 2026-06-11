/**
 * PIPELINE: SaleItemPricing (SERP/Google Lens) → Item Intelligence Repository
 *
 * Triggered by: entity automation on SaleItemPricing (create/update)
 * Also callable directly with { sale_item_pricing_id } or full payload
 *
 * Accepts full image context now — no longer passes null for imageUrl.
 * Routes everything through itemMatchingService.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

async function normalizeItemWithAI(openai, itemTitle, priceAvg, topMatches, knowledgeGraphTitle) {
  const matchTitles = (topMatches || []).slice(0, 5).map(m => m.title).join('; ');
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 700,
    messages: [{
      role: 'user',
      content: `You are an expert antiques appraiser. Extract structured metadata from this estate sale item.

Item Title: ${itemTitle || 'Unknown'}
Knowledge Graph Title: ${knowledgeGraphTitle || 'N/A'}
Similar Items Found: ${matchTitles || 'N/A'}
Average Market Price: ${priceAvg ? '$' + priceAvg : 'Unknown'}

Return JSON only:
{
  "canonical_name": "clean canonical name",
  "normalized_name": "lowercase canonical name",
  "brand": "brand name or empty",
  "manufacturer": "manufacturer or empty",
  "category": "broad category",
  "subcategory": "specific type",
  "item_type": "single item type word",
  "model": "model or empty",
  "pattern": "pattern name or empty",
  "style": "design era/style or empty",
  "material": "primary material or empty",
  "color": "primary color or empty",
  "era": "decade/era or empty",
  "country_of_origin": "country or empty",
  "short_description": "1-2 sentence collector-grade description",
  "long_description": "3-4 sentence SEO-rich description",
  "historical_context": "1 sentence historical context or empty",
  "collector_notes": "1 sentence collector tip or empty",
  "search_keywords": ["kw1","kw2","kw3","kw4","kw5"],
  "confidence_score": 0-100
}`
    }]
  });
  try { return JSON.parse(completion.choices[0].message.content); }
  catch { return { canonical_name: itemTitle, normalized_name: (itemTitle || '').toLowerCase(), confidence_score: 40 }; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support entity automation payload OR direct call
    const pricingRecord = body?.data || null;
    const pricingId = body?.sale_item_pricing_id || pricingRecord?.id;
    let pricing = pricingRecord;

    if (!pricing && pricingId) {
      const found = await base44.asServiceRole.entities.SaleItemPricing.filter({ id: pricingId });
      if (!found.length) return Response.json({ error: 'SaleItemPricing not found' }, { status: 404 });
      pricing = found[0];
    }

    if (!pricing) return Response.json({ error: 'No pricing data provided' }, { status: 400 });

    const itemTitle = pricing.item_title || pricing.knowledge_graph_title;
    if (!itemTitle || itemTitle === 'Unidentified Item') {
      return Response.json({ message: 'Skipped — no item title' });
    }

    // Accept pre-computed metadata from processItemSeoOnSaleUpdate if passed
    let metadata = body?.ai_metadata || null;
    if (!metadata) {
      const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
      metadata = await normalizeItemWithAI(openai, itemTitle, pricing.price_avg, pricing.top_matches || [], pricing.knowledge_graph_title);
    }

    const price = pricing.price_avg || pricing.price_min || pricing.price_max;

    // Route through central matching service
    const matchRes = await base44.asServiceRole.functions.invoke('itemMatchingService', {
      canonical_name: metadata.canonical_name || itemTitle,
      normalized_name: metadata.normalized_name || (itemTitle || '').toLowerCase(),
      brand: metadata.brand || '',
      manufacturer: metadata.manufacturer || '',
      category: metadata.category || '',
      subcategory: metadata.subcategory || '',
      item_type: metadata.item_type || '',
      model: metadata.model || '',
      pattern: metadata.pattern || '',
      era: metadata.era || '',
      style: metadata.style || '',
      material: metadata.material || '',
      color: metadata.color || '',
      country_of_origin: metadata.country_of_origin || '',
      short_description: metadata.short_description || '',
      long_description: metadata.long_description || '',
      historical_context: metadata.historical_context || '',
      collector_notes: metadata.collector_notes || '',
      search_keywords: metadata.search_keywords || [],
      confidence_score: metadata.confidence_score || 60,

      // Image context — no longer null
      original_image_url: body?.original_image_url || pricing.image_url || '',
      compressed_image_url: body?.compressed_image_url || '',
      thumbnail_url: body?.thumbnail_url || '',
      image_hash: body?.image_hash || '',
      perceptual_hash: body?.perceptual_hash || '',

      // Barcode
      barcode_value: body?.barcode_value || pricing.barcode_value || '',
      barcode_type: body?.barcode_type || '',

      // Pricing
      price: price || null,
      price_min: pricing.price_min || null,
      price_max: pricing.price_max || null,
      price_source_type: 'serpapi',
      source_url: (pricing.top_matches || [])[0]?.link || null,
      source_title: (pricing.top_matches || [])[0]?.title || null,
      condition: 'unknown',
      observed_at: pricing.created_date || new Date().toISOString(),

      // Context
      source_type: 'serpapi',
      source_record_id: pricing.id,
      sale_id: pricing.sale_id || body?.sale_id || null,
      operator_id: pricing.operator_id || body?.operator_id || null,
      ai_metadata: metadata,
    });

    return Response.json({
      success: true,
      item_knowledge_id: matchRes?.item_knowledge_id,
      match_method: matchRes?.match_method,
      created: matchRes?.created,
    });

  } catch (error) {
    console.error('extractKnowledgeFromItem error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});