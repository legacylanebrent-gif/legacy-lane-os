import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Fetch ALL SaleItemPricing records for this sale
    const pricingRecords = await base44.asServiceRole.entities.SaleItemPricing.filter({ sale_id });

    // Build a lookup map: image_url -> price_avg
    const priceMap = {};
    for (const record of pricingRecords) {
      if (record.image_url && record.price_avg != null) {
        priceMap[record.image_url] = record.price_avg;
      }
    }

    // Merge prices into images without losing any images
    const updatedImages = (sale.images || []).map(img => {
      const avg = priceMap[img.url];
      if (avg != null && !img.ai_first_search_price) {
        return { ...img, ai_first_search_price: avg };
      }
      return img;
    });

    const filled = updatedImages.filter(img => img.ai_first_search_price != null).length;
    const total = updatedImages.length;

    await base44.asServiceRole.entities.EstateSale.update(sale_id, { images: updatedImages });

    return Response.json({
      success: true,
      message: `Backfilled ${filled} of ${total} images with ai_first_search_price`,
      pricing_records_found: pricingRecords.length,
      filled,
      total
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});