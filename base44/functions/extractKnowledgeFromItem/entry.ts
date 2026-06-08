/**
 * KNOWLEDGE EXTRACTION ENGINE — Stage 1–7 + 11
 * 
 * Triggered by: entity automation on SaleItemPricing (create/update)
 * Also callable directly with { sale_item_pricing_id } or { item_knowledge_id }
 * 
 * What it does:
 *  1. Normalizes item into structured entity fields (brand, category, era, etc.)
 *  2. Matches or creates an ItemKnowledge record
 *  3. Stores price data in ItemPriceHistory
 *  4. Updates ItemKnowledge aggregates (avg/high/low, occurrence_count)
 *  5. Updates DemandMetrics inventory counts
 *  6. Ensures Brand + Category hub stubs exist
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

function toSlug(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[''""]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function truncate(s, max = 90) {
  if (s.length <= max) return s;
  const cut = s.substring(0, max);
  const h = cut.lastIndexOf('-');
  return h > max * 0.5 ? cut.substring(0, h) : cut;
}

function buildKnowledgeSlug(entityName, shortId) {
  const base = toSlug(entityName || 'estate-sale-item');
  return '/items/' + truncate(base, 80) + (shortId ? '-' + shortId : '');
}

async function normalizeItemWithAI(openai, itemTitle, priceAvg, topMatches, knowledgeGraphTitle) {
  const matchTitles = (topMatches || []).slice(0, 5).map(m => m.title).join('; ');
  const prompt = `You are an expert antiques appraiser and collectibles specialist. Extract structured metadata from this estate sale item.

Item Title: ${itemTitle || 'Unknown'}
Knowledge Graph Title: ${knowledgeGraphTitle || 'N/A'}
Similar Items Found: ${matchTitles || 'N/A'}
Average Market Price: ${priceAvg ? '$' + priceAvg : 'Unknown'}

Return JSON only:
{
  "entity_name": "clean canonical name, e.g. Pyrex Butterprint Cinderella Mixing Bowl",
  "normalized_name": "lowercase version for deduplication",
  "brand": "brand name or empty string",
  "manufacturer": "manufacturer company or empty string",
  "category": "broad category: Furniture, Jewelry, Art, Kitchenware, Clothing, Collectibles, Books, Electronics, Tools, Decor, Linens, Toys, Sporting Goods, Musical Instruments, China & Glassware, Silver & Metalware, or other",
  "subcategory": "more specific type, e.g. Mixing Bowls, Dining Chairs",
  "pattern": "pattern name if applicable, e.g. Butterprint, Gooseberry, or empty",
  "style": "design era/style if detectable, e.g. Mid-Century Modern, Victorian, Art Deco, or empty",
  "material": "primary material, e.g. Glass, Oak, Sterling Silver, or empty",
  "color": "primary color if identifiable, or empty",
  "era": "decade/era if detectable, e.g. 1950s, circa 1920, Early 20th Century, or empty",
  "country_of_origin": "country if detectable or empty",
  "ai_description": "2-3 sentence collector-grade description of this item type",
  "historical_context": "1-2 sentences of historical or collector context",
  "collector_notes": "1 sentence tip for collectors or buyers, or empty",
  "related_brands": ["brand1", "brand2"],
  "related_categories": ["category1", "category2"]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 700,
  });

  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return { entity_name: itemTitle, normalized_name: (itemTitle || '').toLowerCase(), brand: '', category: '', subcategory: '' };
  }
}

async function upsertItemKnowledge(base44, normalized, priceAvg, priceMin, priceMax, imageUrl) {
  // Try to find existing by normalized_name
  const candidates = normalized.normalized_name
    ? await base44.asServiceRole.entities.ItemKnowledge.filter({ normalized_name: normalized.normalized_name })
    : [];

  const now = new Date().toISOString();

  if (candidates.length > 0) {
    const existing = candidates[0];
    // Update aggregates
    const newCount = (existing.occurrence_count || 0) + 1;
    const prices = [existing.average_value, priceAvg].filter(p => p != null && p > 0);
    const newAvg = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : existing.average_value;
    const newHigh = priceMax != null ? Math.max(existing.highest_value || 0, priceMax) : existing.highest_value;
    const newLow = (priceMin != null && priceMin > 0)
      ? (existing.lowest_value ? Math.min(existing.lowest_value, priceMin) : priceMin)
      : existing.lowest_value;

    await base44.asServiceRole.entities.ItemKnowledge.update(existing.id, {
      occurrence_count: newCount,
      average_value: newAvg || existing.average_value,
      highest_value: newHigh,
      lowest_value: newLow,
      primary_image_url: existing.primary_image_url || imageUrl || '',
      // Enrich with AI data if fields are empty
      brand: existing.brand || normalized.brand || '',
      manufacturer: existing.manufacturer || normalized.manufacturer || '',
      category: existing.category || normalized.category || '',
      subcategory: existing.subcategory || normalized.subcategory || '',
      pattern: existing.pattern || normalized.pattern || '',
      style: existing.style || normalized.style || '',
      material: existing.material || normalized.material || '',
      color: existing.color || normalized.color || '',
      era: existing.era || normalized.era || '',
      ai_description: existing.ai_description || normalized.ai_description || '',
      historical_context: existing.historical_context || normalized.historical_context || '',
      collector_notes: existing.collector_notes || normalized.collector_notes || '',
      active_inventory_count: (existing.active_inventory_count || 0) + 1,
    });
    return existing.id;
  } else {
    // Create new ItemKnowledge record
    const shortId = Date.now().toString(36);
    const slug = buildKnowledgeSlug(normalized.entity_name || normalized.normalized_name, shortId);

    const seoTitle = normalized.entity_name
      ? `${normalized.entity_name} — Price Guide & Value | EstateSalen`
      : 'Estate Sale Item Price Guide | EstateSalen';
    const metaDesc = normalized.ai_description
      ? normalized.ai_description.substring(0, 155)
      : `Find out what ${normalized.entity_name || 'this item'} is worth at estate sales. Price history and collector data on EstateSalen.com.`;

    const created = await base44.asServiceRole.entities.ItemKnowledge.create({
      slug,
      entity_name: normalized.entity_name || normalized.normalized_name || 'Unknown Item',
      normalized_name: normalized.normalized_name || '',
      brand: normalized.brand || '',
      manufacturer: normalized.manufacturer || '',
      category: normalized.category || '',
      subcategory: normalized.subcategory || '',
      pattern: normalized.pattern || '',
      style: normalized.style || '',
      material: normalized.material || '',
      color: normalized.color || '',
      era: normalized.era || '',
      country_of_origin: normalized.country_of_origin || '',
      ai_description: normalized.ai_description || '',
      historical_context: normalized.historical_context || '',
      collector_notes: normalized.collector_notes || '',
      primary_image_url: imageUrl || '',
      occurrence_count: 1,
      average_value: priceAvg || null,
      highest_value: priceMax || null,
      lowest_value: priceMin || null,
      active_inventory_count: 1,
      sold_inventory_count: 0,
      buyer_interest_count: 0,
      watch_count: 0,
      wanted_count: 0,
      demand_score: 0,
      seo_title: seoTitle,
      meta_description: metaDesc,
      status: 'published',
      indexed_status: 'not_submitted',
    });
    return created.id;
  }
}

async function storePriceHistory(base44, knowledgeId, pricing, imageUrl) {
  if (!pricing.price_avg && !pricing.price_min && !pricing.price_max) return;
  const price = pricing.price_avg || pricing.price_min || pricing.price_max;
  await base44.asServiceRole.entities.ItemPriceHistory.create({
    item_knowledge_id: knowledgeId,
    sale_item_pricing_id: pricing.id || null,
    price,
    source: 'serp_api',
    source_url: pricing.top_matches?.[0]?.link || null,
    source_title: pricing.top_matches?.[0]?.title || null,
    lookup_date: pricing.created_date || new Date().toISOString(),
    condition: 'unknown',
    operator_id: pricing.operator_id || null,
  });
}

async function upsertDemandMetrics(base44, knowledgeId, slug) {
  const existing = await base44.asServiceRole.entities.DemandMetrics.filter({ item_knowledge_id: knowledgeId });
  if (existing.length > 0) {
    await base44.asServiceRole.entities.DemandMetrics.update(existing[0].id, {
      active_inventory_count: (existing[0].active_inventory_count || 0) + 1,
      last_computed: new Date().toISOString(),
    });
  } else {
    await base44.asServiceRole.entities.DemandMetrics.create({
      item_knowledge_id: knowledgeId,
      slug,
      active_inventory_count: 1,
      sold_inventory_count: 0,
      watch_count: 0,
      wanted_count: 0,
      save_count: 0,
      view_count: 0,
      demand_score: 0,
      demand_trend: 'new',
      price_trend: 'unknown',
      last_computed: new Date().toISOString(),
    });
  }
}

async function ensureBrandHub(base44, brandName) {
  if (!brandName || brandName.length < 2) return;
  const slug = '/brands/' + toSlug(brandName);
  const existing = await base44.asServiceRole.entities.SEOBrandHub.filter({ slug });
  if (existing.length === 0) {
    await base44.asServiceRole.entities.SEOBrandHub.create({
      brand_name: brandName,
      slug,
      total_items_found: 1,
      seo_title: `${brandName} at Estate Sales — Value Guide | EstateSalen`,
      meta_description: `Find ${brandName} items at estate sales nationwide. Price history, value guides, and collector data on EstateSalen.com.`,
      status: 'draft',
      indexed_status: 'not_submitted',
    });
  } else {
    await base44.asServiceRole.entities.SEOBrandHub.update(existing[0].id, {
      total_items_found: (existing[0].total_items_found || 0) + 1,
    });
  }
}

async function ensureCategoryHub(base44, categoryName) {
  if (!categoryName || categoryName.length < 2) return;
  const slug = '/categories/' + toSlug(categoryName);
  const existing = await base44.asServiceRole.entities.SEOCategoryHub.filter({ slug });
  if (existing.length === 0) {
    await base44.asServiceRole.entities.SEOCategoryHub.create({
      category_name: categoryName,
      slug,
      total_items_found: 1,
      seo_title: `${categoryName} at Estate Sales — Buying Guide | EstateSalen`,
      meta_description: `Shop ${categoryName} at estate sales near you. Price guides, buying tips, and collector data on EstateSalen.com.`,
      status: 'draft',
      indexed_status: 'not_submitted',
    });
  } else {
    await base44.asServiceRole.entities.SEOCategoryHub.update(existing[0].id, {
      total_items_found: (existing[0].total_items_found || 0) + 1,
    });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support: entity automation payload OR direct call
    // Automation sends: { event, data } where data = SaleItemPricing record
    const pricingRecord = body?.data || null;
    const pricingId = body?.sale_item_pricing_id || pricingRecord?.id;

    let pricing = pricingRecord;

    // If triggered via direct call with just an ID, fetch it
    if (!pricing && pricingId) {
      const found = await base44.asServiceRole.entities.SaleItemPricing.filter({ id: pricingId });
      if (!found.length) return Response.json({ error: 'SaleItemPricing not found' }, { status: 404 });
      pricing = found[0];
    }

    if (!pricing) {
      return Response.json({ error: 'No pricing data provided' }, { status: 400 });
    }

    // Only proceed if we have an item title (meaningful data)
    const itemTitle = pricing.item_title || pricing.knowledge_graph_title;
    if (!itemTitle || itemTitle === 'Unidentified Item') {
      return Response.json({ message: 'Skipped — no item title to extract knowledge from' });
    }

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    // Stage 1: Normalize item with AI
    const normalized = await normalizeItemWithAI(
      openai,
      itemTitle,
      pricing.price_avg,
      pricing.top_matches || [],
      pricing.knowledge_graph_title
    );

    // Stage 2–3: Match or create ItemKnowledge + update aggregates
    const knowledgeId = await upsertItemKnowledge(
      base44,
      normalized,
      pricing.price_avg,
      pricing.price_min,
      pricing.price_max,
      null // no image URL from pricing record
    );

    // Stage 3: Store price history data point
    await storePriceHistory(base44, knowledgeId, pricing, null);

    // Stage 5: Update DemandMetrics inventory counts
    const knowledgeSlug = '/items/' + toSlug(normalized.entity_name || itemTitle);
    await upsertDemandMetrics(base44, knowledgeId, knowledgeSlug);

    // Stage 11: Ensure hub stubs
    await Promise.all([
      ensureBrandHub(base44, normalized.brand).catch(() => {}),
      ensureCategoryHub(base44, normalized.category).catch(() => {}),
    ]);

    return Response.json({
      success: true,
      knowledge_id: knowledgeId,
      entity_name: normalized.entity_name,
      brand: normalized.brand,
      category: normalized.category,
    });

  } catch (error) {
    console.error('extractKnowledgeFromItem error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});