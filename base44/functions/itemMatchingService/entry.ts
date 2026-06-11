/**
 * ITEM INTELLIGENCE REPOSITORY — Central Matching & Upsert Service
 *
 * This is the single entry point for all item intelligence pipelines.
 * All sources (sale uploads, marketplace, SERP, barcode, reseller) call this.
 *
 * Matching priority:
 *  1. Barcode match
 *  2. Exact normalized_name match
 *  3. Perceptual hash match (image_hash)
 *  4. Brand + model + pattern match
 *  5. AI semantic match (normalized_name fuzzy)
 *  6. Create new ItemKnowledge record
 *
 * Input payload:
 * {
 *   // Item identity
 *   canonical_name, normalized_name, brand, manufacturer, category, subcategory,
 *   item_type, model, pattern, era, style, material, color, country_of_origin,
 *   short_description, long_description, historical_context, collector_notes,
 *   seo_title, seo_description, search_keywords, confidence_score,
 *
 *   // Image refs
 *   original_image_url, compressed_image_url, thumbnail_url,
 *   image_hash, perceptual_hash,
 *
 *   // Barcode
 *   barcode_value, barcode_type,
 *
 *   // Pricing
 *   price, price_min, price_max, source_type, source_url, condition, sold_status, location,
 *
 *   // Context
 *   sale_id, sale_item_id, operator_id, reseller_id,
 *   source_type: "sale_upload" | "marketplace" | "reseller_lookup" | "serpapi" | "barcode" | "admin",
 *   ai_metadata: { raw AI response object to cache, avoids re-processing }
 * }
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

function buildSlug(name) {
  const base = toSlug(name || 'estate-sale-item');
  const suffix = '-' + Date.now().toString(36);
  const max = 90 - suffix.length;
  return '/items/' + (base.length > max ? base.substring(0, max) : base) + suffix;
}

async function matchByBarcode(base44, barcodeValue) {
  if (!barcodeValue) return null;
  const barcodes = await base44.asServiceRole.entities.ItemBarcode.filter({ barcode_value: barcodeValue });
  if (barcodes.length > 0 && barcodes[0].item_knowledge_id) {
    const items = await base44.asServiceRole.entities.ItemKnowledge.filter({ id: barcodes[0].item_knowledge_id });
    return items[0] || null;
  }
  return null;
}

async function matchByNormalizedName(base44, normalizedName) {
  if (!normalizedName) return null;
  const items = await base44.asServiceRole.entities.ItemKnowledge.filter({ normalized_name: normalizedName });
  return items[0] || null;
}

async function matchByPerceptualHash(base44, perceptualHash) {
  if (!perceptualHash) return null;
  const refs = await base44.asServiceRole.entities.ItemImageReference.filter({ perceptual_hash: perceptualHash, is_public_approved: true });
  if (refs.length > 0 && refs[0].item_knowledge_id) {
    const items = await base44.asServiceRole.entities.ItemKnowledge.filter({ id: refs[0].item_knowledge_id });
    return items[0] || null;
  }
  return null;
}

async function matchByBrandModelPattern(base44, brand, model, pattern) {
  if (!brand || (!model && !pattern)) return null;
  const candidates = await base44.asServiceRole.entities.ItemKnowledge.filter({ brand });
  if (!candidates.length) return null;
  // Check model and/or pattern
  return candidates.find(c =>
    (model && c.model && c.model.toLowerCase() === model.toLowerCase()) ||
    (pattern && c.pattern && c.pattern.toLowerCase() === pattern.toLowerCase())
  ) || null;
}

async function upsertItemKnowledge(base44, existing, payload, matchMethod) {
  const now = new Date().toISOString();

  if (existing) {
    // Update aggregates — never overwrite verified fields with lower confidence data
    const updates = {
      times_seen: (existing.times_seen || 0) + 1,
      last_seen_at: now,
    };

    // Only enrich empty fields
    const enrichFields = ['brand', 'manufacturer', 'category', 'subcategory', 'item_type', 'model',
      'pattern', 'era', 'style', 'material', 'color', 'country_of_origin', 'short_description',
      'long_description', 'historical_context', 'collector_notes', 'seo_title', 'seo_description'];
    for (const f of enrichFields) {
      if (!existing[f] && payload[f]) updates[f] = payload[f];
    }

    // Update search_keywords by merging
    if (payload.search_keywords?.length) {
      const merged = [...new Set([...(existing.search_keywords || []), ...payload.search_keywords])];
      updates.search_keywords = merged.slice(0, 30);
    }

    // Update source_types_seen
    if (payload.source_type) {
      const types = new Set(existing.source_types_seen || []);
      types.add(payload.source_type);
      updates.source_types_seen = [...types];
    }

    // Update price aggregates if we have pricing
    if (payload.price) {
      const prices = [existing.avg_price, payload.price].filter(p => p > 0);
      updates.avg_price = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      updates.low_price = existing.low_price ? Math.min(existing.low_price, payload.price) : payload.price;
      updates.high_price = existing.high_price ? Math.max(existing.high_price, payload.price) : payload.price;
    }

    if (payload.image_hash || payload.perceptual_hash) updates.has_verified_image = true;
    if (payload.barcode_value) updates.has_barcode = true;

    // Confidence: bump toward 100 if new sources confirm
    if (payload.confidence_score > (existing.confidence_score || 0)) {
      updates.confidence_score = Math.min(100, Math.round((existing.confidence_score || 0) * 0.7 + payload.confidence_score * 0.3));
    }

    await base44.asServiceRole.entities.ItemKnowledge.update(existing.id, updates);
    return { id: existing.id, created: false };
  } else {
    // Create new
    const slug = buildSlug(payload.canonical_name || payload.normalized_name);
    const created = await base44.asServiceRole.entities.ItemKnowledge.create({
      canonical_name: payload.canonical_name || payload.normalized_name || 'Unknown Item',
      normalized_name: payload.normalized_name || (payload.canonical_name || '').toLowerCase(),
      slug,
      brand: payload.brand || '',
      manufacturer: payload.manufacturer || '',
      category: payload.category || '',
      subcategory: payload.subcategory || '',
      item_type: payload.item_type || '',
      model: payload.model || '',
      pattern: payload.pattern || '',
      era: payload.era || '',
      style: payload.style || '',
      material: payload.material || '',
      color: payload.color || '',
      country_of_origin: payload.country_of_origin || '',
      short_description: payload.short_description || '',
      long_description: payload.long_description || '',
      historical_context: payload.historical_context || '',
      collector_notes: payload.collector_notes || '',
      seo_title: payload.seo_title || `${payload.canonical_name} — Price Guide | EstateSalen`,
      seo_description: payload.seo_description || `Find out what ${payload.canonical_name} is worth at estate sales. Price history and collector data on EstateSalen.com.`,
      search_keywords: payload.search_keywords || [],
      confidence_score: payload.confidence_score || 50,
      public_status: 'private', // Always private until reviewed
      indexed_status: 'not_submitted',
      times_seen: 1,
      has_barcode: !!payload.barcode_value,
      has_verified_image: !!(payload.image_hash || payload.perceptual_hash),
      source_types_seen: payload.source_type ? [payload.source_type] : [],
      match_method_first: matchMethod,
      avg_price: payload.price || null,
      low_price: payload.price_min || payload.price || null,
      high_price: payload.price_max || payload.price || null,
      first_seen_at: now,
      last_seen_at: now,
    });
    return { id: created.id, slug: created.slug, created: true };
  }
}

async function createImageReference(base44, knowledgeId, payload) {
  if (!payload.original_image_url && !payload.compressed_image_url) return null;
  return await base44.asServiceRole.entities.ItemImageReference.create({
    item_knowledge_id: knowledgeId,
    source_type: payload.source_type || 'sale_upload',
    source_record_id: payload.source_record_id || payload.sale_item_id || null,
    sale_id: payload.sale_id || null,
    sale_item_id: payload.sale_item_id || null,
    operator_id: payload.operator_id || null,
    reseller_id: payload.reseller_id || null,
    original_image_url: payload.original_image_url || '',
    compressed_image_url: payload.compressed_image_url || '',
    thumbnail_url: payload.thumbnail_url || '',
    image_hash: payload.image_hash || '',
    perceptual_hash: payload.perceptual_hash || '',
    barcode_detected: !!payload.barcode_value,
    barcode_value: payload.barcode_value || '',
    image_confidence_score: payload.confidence_score || 50,
    is_primary_image: payload.is_primary_image || false,
    is_public_approved: false, // Never auto-approve
    retention_status: 'temporary', // Originals are always temporary
    ai_metadata: payload.ai_metadata || null,
  });
}

async function upsertBarcode(base44, knowledgeId, payload) {
  if (!payload.barcode_value) return;
  const existing = await base44.asServiceRole.entities.ItemBarcode.filter({ barcode_value: payload.barcode_value });
  if (existing.length === 0) {
    await base44.asServiceRole.entities.ItemBarcode.create({
      item_knowledge_id: knowledgeId,
      barcode_type: payload.barcode_type || 'unknown',
      barcode_value: payload.barcode_value,
      product_title: payload.canonical_name || '',
      brand: payload.brand || '',
      manufacturer: payload.manufacturer || '',
      model: payload.model || '',
      category: payload.category || '',
      confidence_score: payload.confidence_score || 50,
      source: payload.source_type || 'scan',
    });
  } else if (!existing[0].item_knowledge_id) {
    await base44.asServiceRole.entities.ItemBarcode.update(existing[0].id, { item_knowledge_id: knowledgeId });
  }
}

async function writePriceHistory(base44, knowledgeId, payload) {
  if (!payload.price && !payload.price_min && !payload.price_max) return;
  const price = payload.price || payload.price_min || payload.price_max;
  await base44.asServiceRole.entities.ItemPriceHistory.create({
    item_knowledge_id: knowledgeId,
    source_type: payload.price_source_type || payload.source_type || 'operator_price',
    source_url: payload.source_url || null,
    source_title: payload.source_title || null,
    price,
    currency: 'USD',
    condition: payload.condition || 'unknown',
    sold_status: payload.sold_status || 'unknown',
    location: payload.location || null,
    sale_id: payload.sale_id || null,
    operator_id: payload.operator_id || null,
    observed_at: payload.observed_at || new Date().toISOString(),
  });
}

async function upsertDemandMetrics(base44, knowledgeId, payload) {
  const existing = await base44.asServiceRole.entities.DemandMetrics.filter({ item_knowledge_id: knowledgeId });
  const now = new Date().toISOString();
  if (existing.length > 0) {
    const rec = existing[0];
    const updates = {
      times_seen: (rec.times_seen || 0) + 1,
      active_inventory_count: (rec.active_inventory_count || 0) + 1,
      last_calculated_at: now,
    };
    if (!rec.category && payload.category) updates.category = payload.category;
    if (payload.price) {
      const prices = [rec.avg_price, payload.price].filter(p => p > 0);
      updates.avg_price = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      updates.low_price = rec.low_price ? Math.min(rec.low_price, payload.price) : payload.price;
      updates.high_price = rec.high_price ? Math.max(rec.high_price, payload.price) : payload.price;
    }
    await base44.asServiceRole.entities.DemandMetrics.update(rec.id, updates);
  } else {
    await base44.asServiceRole.entities.DemandMetrics.create({
      item_knowledge_id: knowledgeId,
      category: payload.category || '',
      times_seen: 1,
      active_inventory_count: 1,
      sold_inventory_count: 0,
      avg_price: payload.price || null,
      low_price: payload.price_min || payload.price || null,
      high_price: payload.price_max || payload.price || null,
      demand_score: 0,
      demand_trend: 'new',
      price_trend: 'unknown',
      last_calculated_at: now,
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
      meta_description: `Find ${brandName} items at estate sales nationwide. Price history and collector data on EstateSalen.com.`,
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
      meta_description: `Shop ${categoryName} at estate sales near you. Price guides and collector data on EstateSalen.com.`,
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
    const payload = await req.json();

    if (!payload.canonical_name && !payload.normalized_name && !payload.barcode_value) {
      return Response.json({ error: 'canonical_name, normalized_name, or barcode_value required' }, { status: 400 });
    }

    // ── MATCHING PIPELINE ──────────────────────────────────────────
    let existing = null;
    let matchMethod = 'new';

    // 1. Barcode match (most authoritative)
    if (!existing && payload.barcode_value) {
      existing = await matchByBarcode(base44, payload.barcode_value);
      if (existing) matchMethod = 'barcode';
    }

    // 2. Exact normalized_name match
    if (!existing && payload.normalized_name) {
      existing = await matchByNormalizedName(base44, payload.normalized_name);
      if (existing) matchMethod = 'exact_name';
    }

    // 3. Perceptual hash match
    if (!existing && payload.perceptual_hash) {
      existing = await matchByPerceptualHash(base44, payload.perceptual_hash);
      if (existing) matchMethod = 'image_hash';
    }

    // 4. Brand + model/pattern match
    if (!existing) {
      existing = await matchByBrandModelPattern(base44, payload.brand, payload.model, payload.pattern);
      if (existing) matchMethod = 'brand_model';
    }

    // ── UPSERT ItemKnowledge ──────────────────────────────────────
    const { id: knowledgeId, slug, created } = await upsertItemKnowledge(base44, existing, payload, matchMethod);

    // ── CREATE ItemImageReference ─────────────────────────────────
    let imageRefId = null;
    if (payload.original_image_url || payload.compressed_image_url) {
      const ref = await createImageReference(base44, knowledgeId, payload);
      imageRefId = ref?.id || null;
    }

    // ── UPSERT ItemBarcode ────────────────────────────────────────
    if (payload.barcode_value) {
      await upsertBarcode(base44, knowledgeId, payload).catch(() => {});
    }

    // ── WRITE ItemPriceHistory ────────────────────────────────────
    if (payload.price || payload.price_min || payload.price_max) {
      await writePriceHistory(base44, knowledgeId, payload).catch(() => {});
    }

    // ── UPSERT DemandMetrics ──────────────────────────────────────
    await upsertDemandMetrics(base44, knowledgeId, payload).catch(() => {});

    // ── Ensure hub stubs (brand/category) ────────────────────────
    await Promise.all([
      ensureBrandHub(base44, payload.brand).catch(() => {}),
      ensureCategoryHub(base44, payload.category).catch(() => {}),
    ]);

    return Response.json({
      success: true,
      item_knowledge_id: knowledgeId,
      slug: slug || existing?.slug,
      match_method: matchMethod,
      created,
      image_reference_id: imageRefId,
    });

  } catch (error) {
    console.error('itemMatchingService error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});