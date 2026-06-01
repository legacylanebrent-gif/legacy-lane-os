import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Reconstructs the EstateSale images array from SaleItemPricing records
// Only adds images that are NOT already in the sale's images array
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sale_id } = await req.json();
    if (!sale_id) return Response.json({ error: 'sale_id required' }, { status: 400 });

    // Fetch the sale
    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: sale_id });
    if (!sales.length) return Response.json({ error: 'Sale not found' }, { status: 404 });
    const sale = sales[0];

    // Fetch ALL SaleItemPricing records sorted by created_date
    const pricingRecords = await base44.asServiceRole.entities.SaleItemPricing.filter(
      { sale_id },
      'created_date',
      200
    );

    const existingUrls = new Set((sale.images || []).map(img => img.url));

    // Build new images from SaleItemPricing records that are missing from the sale
    const newImages = [];
    for (const record of pricingRecords) {
      if (!record.image_url || existingUrls.has(record.image_url)) continue;
      
      const img = {
        url: record.image_url,
        name: record.item_title || '',
        description: '',
        categories: [],
        price: null,
        rotation: 0,
        ai_first_search_price: record.price_avg || null,
      };

      // Build description from top_matches
      if (record.top_matches && record.top_matches.length > 0) {
        const withPrices = record.top_matches.filter(m => m.price && m.title);
        const sources = withPrices.slice(0, 3);
        let desc = '';
        if (record.item_title) desc += `${record.item_title}.`;
        if (sources.length > 0) desc += ` Currently listed for ${sources.map(m => `${m.price} on ${m.source}`).join(', ')}.`;
        if (record.price_min && record.price_max) desc += ` Market price range: $${record.price_min}–$${record.price_max}.`;
        img.description = desc.trim();
      }

      newImages.push(img);
      existingUrls.add(record.image_url);
    }

    // Merge: existing (with prices backfilled) + missing ones from SaleItemPricing
    const existingUpdated = (sale.images || []).map(img => {
      const pricing = pricingRecords.find(r => r.image_url === img.url);
      if (pricing && pricing.price_avg != null && !img.ai_first_search_price) {
        return { ...img, ai_first_search_price: pricing.price_avg };
      }
      return img;
    });

    const merged = [...existingUpdated, ...newImages];

    await base44.asServiceRole.entities.EstateSale.update(sale_id, { images: merged });

    return Response.json({
      success: true,
      existing_images: existingUpdated.length,
      recovered_images: newImages.length,
      total_images: merged.length,
      pricing_records: pricingRecords.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});