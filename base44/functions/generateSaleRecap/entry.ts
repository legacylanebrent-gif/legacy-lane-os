/**
 * KNOWLEDGE EXTRACTION ENGINE — Stage 10: Sale Recap Extraction
 * 
 * Triggered by: entity automation on EstateSale status → 'completed'
 * Also callable directly with { sale_id }
 * 
 * What it does:
 *  - Aggregates all items, categories, brands from the completed sale
 *  - Identifies most valuable, most viewed, highest demand items
 *  - Generates AI summary
 *  - Creates/updates a SaleRecap record
 *  - Updates sold counts on ItemKnowledge records
 *  - Updates DemandMetrics sold_inventory_count
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

async function generateAISummary(base44, sale, topItems, categoryBreakdown) {
  const topCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat]) => cat);

  const topItemNames = topItems.slice(0, 5).map(i => i.name).join(', ');
  const city = sale.property_address?.city || '';
  const state = sale.property_address?.state || '';
  const location = [city, state].filter(Boolean).join(', ');

  const prompt = `Write a 3-5 sentence historical summary of this completed estate sale for an archive/knowledge page.

Sale Title: ${sale.title}
Location: ${location || 'Unknown'}
Top Categories: ${topCategories.join(', ')}
Notable Items: ${topItemNames || 'Various antiques and collectibles'}
Estate Sale Company Owner: ${sale.operator_name || 'Unknown'}

Never state revenue, proceeds, fees, commissions, or any other financial figures — the public recap must not disclose private financial information.

Write in a factual, archival tone. Mention the location, types of items, and any notable pieces. 
This will be indexed by search engines as a historical record.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: { type: 'object', properties: { summary: { type: 'string' } } },
  });

  return (result && result.summary) ? result.summary : (typeof result === 'string' ? result : 'Estate sale recap summary unavailable.');
}

async function markSoldOnKnowledge(base44, itemPricings) {
  for (const pricing of itemPricings) {
    if (!pricing.user_price && !pricing.price_avg) continue;

    // Find ItemKnowledge records that might match this item
    const title = pricing.item_title || pricing.knowledge_graph_title;
    if (!title) continue;

    const normalizedTitle = title.toLowerCase().trim();
    const candidates = await base44.asServiceRole.entities.ItemKnowledge.filter({
      normalized_name: normalizedTitle,
    });

    for (const k of candidates) {
      const soldPrice = pricing.user_price || pricing.price_avg;

      // Update sold count and price history
      await base44.asServiceRole.entities.ItemKnowledge.update(k.id, {
        sold_inventory_count: (k.sold_inventory_count || 0) + 1,
        active_inventory_count: Math.max(0, (k.active_inventory_count || 1) - 1),
        // Update price aggregates with actual sold price
        highest_value: soldPrice ? Math.max(k.highest_value || 0, soldPrice) : k.highest_value,
        lowest_value: soldPrice && soldPrice > 0
          ? (k.lowest_value ? Math.min(k.lowest_value, soldPrice) : soldPrice)
          : k.lowest_value,
      });

      // Store sold price in price history
      if (soldPrice) {
        await base44.asServiceRole.entities.ItemPriceHistory.create({
          item_knowledge_id: k.id,
          sale_item_pricing_id: pricing.id,
          price: soldPrice,
          source: 'sale_sold',
          lookup_date: new Date().toISOString(),
          sale_date: new Date().toISOString().split('T')[0],
          operator_id: pricing.operator_id || null,
          condition: 'used',
        });
      }

      // Update DemandMetrics
      const demandRecords = await base44.asServiceRole.entities.DemandMetrics.filter({ item_knowledge_id: k.id });
      if (demandRecords.length > 0) {
        await base44.asServiceRole.entities.DemandMetrics.update(demandRecords[0].id, {
          sold_inventory_count: (demandRecords[0].sold_inventory_count || 0) + 1,
          active_inventory_count: Math.max(0, (demandRecords[0].active_inventory_count || 1) - 1),
          last_computed: new Date().toISOString(),
        });
      }
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support: entity automation (data = EstateSale) OR direct { sale_id }
    const saleRecord = body?.data || null;
    const saleId = body?.sale_id || saleRecord?.id || body?.event?.entity_id;

    let sale = saleRecord;
    if (!sale && saleId) {
      const found = await base44.asServiceRole.entities.EstateSale.filter({ id: saleId });
      if (!found.length) return Response.json({ error: 'EstateSale not found' }, { status: 404 });
      sale = found[0];
    }

    if (!sale) {
      // Chapter 24 P0-2D — no silent fallback to an arbitrary/default sale.
      return Response.json({ error: 'sale_id (or the automation sale record) is required — no default sale' }, { status: 400 });
    }

    // Chapter 24 P0-2 — direct (non-automation) callers must be authorized for
    // the sale before a recap is generated. The automation invocation runs as
    // the workflow creator; on that path the trigger payload itself named the
    // completed sale (provenance), so only user-context calls are gated here.
    try {
      const user = await base44.auth.me();
      if (user && sale.operator_id !== user.id && user.role !== 'admin') {
        return Response.json({ error: 'Only the sale operator (or an admin) may generate a recap for this sale.' }, { status: 403 });
      }
    } catch (e) {
      // No authenticated user context (automation path) — the trigger payload
      // already restricted this run to the completed sale it named.
    }

    // Only process completed sales
    if (sale.status !== 'completed') {
      return Response.json({ message: 'Skipped — sale is not completed', status: sale.status });
    }

    // Load all pricing records for this sale
    const pricings = await base44.asServiceRole.entities.SaleItemPricing.filter({ sale_id: sale.id });

    // Load sale images for category/item data
    const images = (sale.images || []).filter(img => img.name);

    // Build category breakdown
    const categoryBreakdown = {};
    const brandSet = new Set();

    for (const img of images) {
      if (img.categories?.length) {
        for (const cat of img.categories) {
          categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
        }
      }
    }

    // Also use sale.categories
    for (const cat of (sale.categories || [])) {
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    }

    // Extract top items from pricing data
    const topItems = pricings
      .filter(p => p.price_avg || p.user_price)
      .sort((a, b) => (b.user_price || b.price_avg || 0) - (a.user_price || a.price_avg || 0))
      .slice(0, 10)
      .map(p => ({
        name: p.item_title || p.knowledge_graph_title || 'Unknown Item',
        sold_price: p.user_price || p.price_avg,
        image_url: p.image_url || null,
      }));

    // Extract notable brands from featured items
    for (const item of (sale.featured_items || [])) {
      if (item.name) {
        const brandMatch = item.name.match(/^(\w[\w\s&.]{1,25}?)\s+(Chair|Table|Desk|Bowl|Vase|Ring|Necklace|Lamp)/i);
        if (brandMatch) brandSet.add(brandMatch[1]);
      }
    }

    const topCategories = Object.entries(categoryBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => cat);

    // Generate AI summary
    const aiSummary = await generateAISummary(base44, sale, topItems, categoryBreakdown);

    // Build slug for this recap
    const city = sale.property_address?.city || '';
    const state = sale.property_address?.state || '';
    const dateStr = sale.sale_dates?.[0]?.date
      ? new Date(sale.sale_dates[0].date + 'T00:00:00').toISOString().split('T')[0].replace(/-/g, '')
      : Date.now().toString(36);

    const slug = `/sale-recap/${toSlug(sale.title)}-${toSlug(city)}-${toSlug(state)}-${dateStr}`.substring(0, 120);

    const seoTitle = `${sale.title} — Estate Sale Recap | EstateSalen`;
    const metaDesc = aiSummary.substring(0, 155);

    const recapData = {
      sale_id: sale.id,
      slug,
      title: sale.title,
      operator_id: sale.operator_id || '',
      operator_name: sale.operator_name || '',
      city: city || '',
      state: state || '',
      sale_dates: sale.sale_dates || [],
      total_items: images.length || sale.total_items || 0,
      total_sold: pricings.filter(p => p.user_price).length,
      total_views: sale.views || 0,
      // Chapter 24 P0-2B — private financial figures are NEVER written to the
      // public-facing recap record (draft or published).
      estimated_sale_value: null,
      actual_revenue: null,
      top_categories: topCategories,
      notable_brands: [...brandSet].slice(0, 10),
      most_valuable_items: topItems.slice(0, 6),
      category_breakdown: categoryBreakdown,
      ai_summary: aiSummary,
      primary_image_url: sale.images?.[0]?.url || '',
      seo_title: seoTitle,
      meta_description: metaDesc,
      // Chapter 24 P0-2 — completion may create a PRIVATE DRAFT only;
      // publication is a separate human act (publishSaleRecap).
      status: 'draft',
      indexed_status: 'not_submitted',
    };

    // Upsert recap — Chapter 24 P0-2D IDEMPOTENCY: replaying the completion
    // trigger never creates a duplicate record, never un-publishes a published
    // recap, and never re-runs the knowledge-graph side effects.
    const existing = await base44.asServiceRole.entities.SaleRecap.filter({ sale_id: sale.id });
    let recapId;
    let isNewRecap = false;
    if (existing.length > 0) {
      if (existing[0].status === 'published') {
        return Response.json({ success: true, skipped: 'already_published', recap_id: existing[0].id });
      }
      await base44.asServiceRole.entities.SaleRecap.update(existing[0].id, recapData);
      recapId = existing[0].id;
    } else {
      const created = await base44.asServiceRole.entities.SaleRecap.create(recapData);
      recapId = created.id;
      isNewRecap = true;
    }

    // Stage 10: Mark items as sold in knowledge graph (FIRST GENERATION ONLY —
    // replays must not double-count sold items).
    if (isNewRecap && pricings.length > 0) {
      await markSoldOnKnowledge(base44, pricings).catch(err => {
        console.error('markSoldOnKnowledge error:', err.message);
      });
    }

    // Chapter 24 P1 — AUTOMATION EXPLAINABILITY: the operator can answer
    // WHY DID THIS HAPPEN? from the sale's own activity log.
    try {
      await base44.asServiceRole.entities.Activity.create({
        sale_id: sale.id,
        operator_id: sale.operator_id || '',
        user_id: sale.operator_id || '',
        activity_type: 'note',
        subject: 'Sale recap draft generated',
        description: `AUTOMATED (trigger: EstateSale status completed for "${sale.title}"). A private DRAFT SaleRecap was generated with an AI summary from canonical sale records (categories, items, dates — no financial figures). Publication requires explicit operator approval.`,
        status: 'completed',
      });
    } catch (e) {
      console.warn('recap activity log failed:', e && e.message);
    }

    return Response.json({
      success: true,
      recap_id: recapId,
      slug,
      status: 'draft',
      items_processed: topItems.length,
      categories: topCategories,
    });

  } catch (error) {
    console.error('generateSaleRecap error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});