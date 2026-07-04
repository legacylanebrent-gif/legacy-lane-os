/**
 * KNOWLEDGE EXTRACTION ENGINE — Stages 6, 7, 8, 9
 * 
 * Triggered by: entity automation on WantedItem (create/update)
 * Also callable directly for manual demand signal injection.
 * 
 * What it does:
 *  - Extracts buyer intent from WantedItem into BuyerIntent
 *  - Finds or creates matching ItemKnowledge record
 *  - Updates DemandMetrics wanted_count + demand_score
 *  - Updates ItemKnowledge wanted_count + demand_score
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

function computeDemandScore(metrics) {
  // Weighted demand score 0-100
  const w = {
    watch_count: 3,
    wanted_count: 5,
    save_count: 2,
    view_count: 0.1,
    sold_inventory_count: 4,
  };
  let raw = 0;
  for (const [key, weight] of Object.entries(w)) {
    raw += (metrics[key] || 0) * weight;
  }
  // Normalize: score of 100 = ~20 wanted listings or equivalent engagement
  return Math.min(100, Math.round(raw));
}

async function findOrCreateKnowledgeFromWanted(base44, wanted) {
  // Try to match by brand + category + keywords
  const searchName = [wanted.title, wanted.brand, wanted.category].filter(Boolean).join(' ');
  const normalizedSearch = searchName.toLowerCase().trim();

  // Look for existing knowledge by brand and category
  let candidates = [];
  if (wanted.brand) {
    candidates = await base44.asServiceRole.entities.ItemKnowledge.filter({ brand: wanted.brand });
    // Further filter by category if we have one
    if (wanted.category) {
      candidates = candidates.filter(c => c.category === wanted.category || c.subcategory === wanted.category);
    }
  }

  if (candidates.length > 0) {
    return candidates[0].id;
  }

  // No match — create a new knowledge stub from buyer intent
  // Use AI to normalize
  const prompt = `Given this buyer's wanted listing, create a normalized knowledge record.

Wanted: ${wanted.title}
Brand: ${wanted.brand || 'unknown'}
Category: ${wanted.category || 'unknown'}
Description: ${wanted.description || 'none'}
Era: ${wanted.era || 'unknown'}
Style: ${wanted.style || 'unknown'}
Material: ${wanted.material || 'unknown'}

Return JSON only:
{
  "entity_name": "canonical item type name",
  "normalized_name": "lowercase version",
  "brand": "brand or empty",
  "category": "broad category",
  "subcategory": "specific type",
  "style": "style or empty",
  "material": "material or empty",
  "era": "era/decade or empty",
  "ai_description": "2 sentence description of this item type",
  "historical_context": "1 sentence context or empty"
}`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        entity_name: { type: 'string' },
        normalized_name: { type: 'string' },
        brand: { type: 'string' },
        category: { type: 'string' },
        subcategory: { type: 'string' },
        style: { type: 'string' },
        material: { type: 'string' },
        era: { type: 'string' },
        ai_description: { type: 'string' },
        historical_context: { type: 'string' },
      },
    },
  });

  const normalized = result || { entity_name: wanted.title, normalized_name: normalizedSearch };

  const shortId = Date.now().toString(36);
  const slug = '/items/' + toSlug(normalized.entity_name || wanted.title) + '-' + shortId;

  const created = await base44.asServiceRole.entities.ItemKnowledge.create({
    slug,
    entity_name: normalized.entity_name || wanted.title,
    normalized_name: normalized.normalized_name || normalizedSearch,
    brand: normalized.brand || wanted.brand || '',
    category: normalized.category || wanted.category || '',
    subcategory: normalized.subcategory || wanted.subcategory || '',
    style: normalized.style || wanted.style || '',
    material: normalized.material || wanted.material || '',
    era: normalized.era || wanted.era || '',
    ai_description: normalized.ai_description || '',
    historical_context: normalized.historical_context || '',
    occurrence_count: 0,
    active_inventory_count: 0,
    sold_inventory_count: 0,
    buyer_interest_count: 1,
    watch_count: 0,
    wanted_count: 1,
    demand_score: 5,
    seo_title: `${normalized.entity_name || wanted.title} — Price Guide | EstateSalen`,
    meta_description: `Find ${normalized.entity_name || wanted.title} at estate sales. Price history and buyer demand data on EstateSalen.com.`,
    status: 'published',
    indexed_status: 'not_submitted',
  });

  return created.id;
}

async function upsertBuyerIntent(base44, wanted) {
  const existing = await base44.asServiceRole.entities.BuyerIntent.filter({
    buyer_id: wanted.buyer_id,
    category: wanted.category,
  });

  const intentData = {
    buyer_id: wanted.buyer_id,
    category: wanted.category || '',
    subcategory: wanted.subcategory || '',
    brand: wanted.brand || '',
    style: wanted.style || '',
    material: wanted.material || '',
    era: wanted.era || '',
    keywords: wanted.title ? wanted.title.split(' ').filter(w => w.length > 3) : [],
    budget_min: wanted.budget_min || null,
    budget_max: wanted.budget_max || null,
    distance_radius: wanted.distance || null,
    zip_code: wanted.zip_code || '',
    shipping_ok: wanted.shipping_ok !== false,
    priority_level: 'medium',
    is_active: wanted.status === 'active',
  };

  if (existing.length > 0) {
    await base44.asServiceRole.entities.BuyerIntent.update(existing[0].id, intentData);
    return existing[0].id;
  } else {
    const created = await base44.asServiceRole.entities.BuyerIntent.create(intentData);
    return created.id;
  }
}

async function updateKnowledgeDemand(base44, knowledgeId, wantedItem) {
  const existing = await base44.asServiceRole.entities.ItemKnowledge.filter({ id: knowledgeId });
  if (!existing.length) return;
  const k = existing[0];

  const newWantedCount = (k.wanted_count || 0) + 1;
  const newBuyerInterest = (k.buyer_interest_count || 0) + 1;

  // Simple demand score: weighted combo
  const demandScore = Math.min(100, Math.round(
    (newWantedCount * 5) + ((k.watch_count || 0) * 3) + (Math.min(k.occurrence_count || 0, 20) * 2)
  ));

  await base44.asServiceRole.entities.ItemKnowledge.update(knowledgeId, {
    wanted_count: newWantedCount,
    buyer_interest_count: newBuyerInterest,
    demand_score: demandScore,
    // Link back to wanted item
    item_knowledge_id: wantedItem.item_knowledge_id || knowledgeId,
  });

  // Update DemandMetrics
  const demandRecords = await base44.asServiceRole.entities.DemandMetrics.filter({ item_knowledge_id: knowledgeId });
  if (demandRecords.length > 0) {
    const dm = demandRecords[0];
    const updatedMetrics = {
      wanted_count: (dm.wanted_count || 0) + 1,
      last_computed: new Date().toISOString(),
    };
    updatedMetrics.demand_score = computeDemandScore({ ...dm, ...updatedMetrics });
    await base44.asServiceRole.entities.DemandMetrics.update(dm.id, updatedMetrics);
  } else {
    const newMetrics = {
      item_knowledge_id: knowledgeId,
      wanted_count: 1,
      watch_count: k.watch_count || 0,
      save_count: 0,
      view_count: 0,
      active_inventory_count: k.active_inventory_count || 0,
      sold_inventory_count: k.sold_inventory_count || 0,
      demand_trend: 'new',
      price_trend: 'unknown',
      last_computed: new Date().toISOString(),
    };
    newMetrics.demand_score = computeDemandScore(newMetrics);
    await base44.asServiceRole.entities.DemandMetrics.create(newMetrics);
  }
}

// Update WantedItem with the knowledge ID link
async function linkWantedToKnowledge(base44, wantedId, knowledgeId) {
  await base44.asServiceRole.entities.WantedItem.update(wantedId, {
    item_knowledge_id: knowledgeId,
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Entity automation sends: { event: { type, entity_id }, data: { ...WantedItem } }
    const wantedItem = body?.data || null;
    const wantedId = body?.wanted_item_id || wantedItem?.id;

    let wanted = wantedItem;
    if (!wanted && wantedId) {
      try {
        const found = await base44.asServiceRole.entities.WantedItem.filter({ id: wantedId });
        if (found.length) wanted = found[0];
      } catch { /* not found */ }
    }

    if (!wanted || !wanted.title) {
      return Response.json({ error: 'No WantedItem data provided' }, { status: 400 });
    }

    // Stage 8–9: Extract buyer intent into BuyerIntent entity
    await upsertBuyerIntent(base44, wanted);

    // Stage 9: Find or create ItemKnowledge match
    const knowledgeId = await findOrCreateKnowledgeFromWanted(base44, wanted);

    // Stage 7: Update demand signals on knowledge record
    await updateKnowledgeDemand(base44, knowledgeId, wanted);

    // Link the WantedItem back to ItemKnowledge (only if it actually exists in DB)
    if (wanted.id && !wanted.item_knowledge_id && !wanted.id.startsWith('test-')) {
      await linkWantedToKnowledge(base44, wanted.id, knowledgeId).catch(() => {});
    }

    return Response.json({
      success: true,
      knowledge_id: knowledgeId,
      buyer_intent_created: true,
    });

  } catch (error) {
    console.error('extractDemandSignals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});