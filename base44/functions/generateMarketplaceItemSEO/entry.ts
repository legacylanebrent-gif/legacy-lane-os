import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BASE_URL = 'https://www.estatesalen.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Support entity automation payload: { event, data: {...MarketplaceItem}, changed_fields }
    // OR direct call: { marketplace_item_id, item_id }
    let marketplace_item_id = body?.marketplace_item_id || null;
    let item_id = body?.item_id || null;

    // If this is an entity automation payload, extract the marketplace item from data
    if (!marketplace_item_id && !item_id && body?.data) {
      const mp = body.data;
      // MarketplaceItem entity has an `item_id` field linking to the Item entity
      marketplace_item_id = mp.id || null;
      item_id = mp.item_id || null;
    }

    if (!marketplace_item_id && !item_id) {
      return Response.json({ error: 'marketplace_item_id or item_id required' }, { status: 400 });
    }

    // ── 1. Fetch the Item ──
    let item = null;
    if (item_id) {
      const items = await base44.asServiceRole.entities.Item.filter({ id: item_id });
      item = items[0] || null;
    }
    if (!item && marketplace_item_id) {
      const items = await base44.asServiceRole.entities.Item.filter({ marketplace_item_id });
      item = items[0] || null;
    }
    if (!item) return Response.json({ error: 'Item not found' }, { status: 404 });

    const realItemId = item.id;

    // ── 2. Fetch the MarketplaceItem listing ──
    let marketplaceItem = null;
    if (marketplace_item_id) {
      const listings = await base44.asServiceRole.entities.MarketplaceItem.filter({ id: marketplace_item_id });
      marketplaceItem = listings[0] || null;
    }
    if (!marketplaceItem && item.marketplace_item_id) {
      const listings = await base44.asServiceRole.entities.MarketplaceItem.filter({ id: item.marketplace_item_id });
      marketplaceItem = listings[0] || null;
    }

    // ── 3. Generate AI SEO content ──
    const seoData = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an SEO expert for an online marketplace for estate sale items, antiques, vintage, and collectibles.

Generate SEO content for this marketplace listing:
- Title: ${item.title}
- Category: ${item.category || 'general'}
- Price: $${item.price || 'unknown'}
- Condition: ${item.condition || 'used'}
- Brand: ${item.brand || 'unknown'}
- Description: ${item.description || 'None'}

The item is sold on EstateSalen.com's "National Online Marketplace" — a peer-to-peer marketplace for resellers, vendors, shops, and estate sale companies. Buyers purchase direct from the vendor with zero transaction fees.

Return JSON:
{
  "seo_title": "SEO title under 60 chars — include brand/item name and 'for sale'",
  "seo_description": "meta description under 160 chars — enticing, includes price if helpful",
  "seo_slug": "URL-safe slug like vintage-pyrex-butterprint-bowl",
  "seo_keywords": ["kw1","kw2","kw3","kw4","kw5"],
  "ai_summary": "150-250 word rich product description optimized for both buyers and SEO"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          seo_title: { type: 'string' },
          seo_description: { type: 'string' },
          seo_slug: { type: 'string' },
          seo_keywords: { type: 'array', items: { type: 'string' } },
          ai_summary: { type: 'string' }
        },
        required: ['seo_title', 'seo_description', 'seo_slug', 'seo_keywords', 'ai_summary']
      }
    });

    // ── 3b. Build product schema manually ──
    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": item.title,
      "description": seoData.ai_summary || item.description || '',
      "category": item.category || '',
      "offers": {
        "@type": "Offer",
        "price": item.price || 0,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "url": `${BASE_URL}/marketplace/${seoData.seo_slug || item.id}`
      }
    };
    if (item.brand) {
      productSchema.brand = { "@type": "Brand", "name": item.brand };
    }

    // ── 4. Update MarketplaceItem SEO fields ──
    if (marketplaceItem) {
      await base44.asServiceRole.entities.MarketplaceItem.update(marketplaceItem.id, {
        seo_title: seoData.seo_title,
        seo_description: seoData.seo_description,
        seo_slug: seoData.seo_slug,
        seo_keywords: seoData.seo_keywords || [],
        ai_summary: seoData.ai_summary,
        schema_json: productSchema,
        indexed_status: 'submitted',
      });
    }

    // ── 5. Create SEOIndexLog for Google indexing ──
    const pageUrl = `/marketplace/${seoData.seo_slug || item.id}`;
    const now = new Date().toISOString();
    
    const existingLogs = await base44.asServiceRole.entities.SEOIndexLog.filter({ page_url: pageUrl });
    if (existingLogs.length > 0) {
      await base44.asServiceRole.entities.SEOIndexLog.update(existingLogs[0].id, {
        page_type: 'marketplace_item',
        sitemap_status: 'included',
        indexing_status: 'submitted',
        last_submitted_at: now,
        last_checked_at: now,
      });
    } else {
      await base44.asServiceRole.entities.SEOIndexLog.create({
        page_url: pageUrl,
        page_type: 'marketplace_item',
        sitemap_status: 'included',
        indexing_status: 'submitted',
        last_submitted_at: now,
        last_checked_at: now,
      });
    }

    // ── 6. Also upsert SEOPage record ──
    const existingPages = await base44.asServiceRole.entities.SEOPage.filter({
      entity_id: realItemId,
      page_type: 'item',
    });
    if (existingPages.length > 0) {
      await base44.asServiceRole.entities.SEOPage.update(existingPages[0].id, {
        title: seoData.seo_title,
        meta_description: seoData.seo_description,
        slug: seoData.seo_slug,
        schema_json: productSchema,
        status: 'published',
        indexed_status: 'submitted',
        published_at: now,
      });
    } else {
      await base44.asServiceRole.entities.SEOPage.create({
        page_type: 'item',
        entity_id: realItemId,
        slug: seoData.seo_slug || item.id,
        title: seoData.seo_title,
        meta_description: seoData.seo_description,
        h1: item.title,
        intro_content: seoData.ai_summary,
        schema_json: productSchema,
        status: 'published',
        indexed_status: 'submitted',
        published_at: now,
      });
    }

    return Response.json({
      success: true,
      item_id: realItemId,
      marketplace_item_id: marketplaceItem?.id || null,
      seo_title: seoData.seo_title,
      slug: seoData.seo_slug,
      indexed_status: 'submitted',
    });

  } catch (error) {
    console.error('generateMarketplaceItemSEO error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});