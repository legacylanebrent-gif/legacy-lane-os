import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import fetch from 'npm:node-fetch@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { item_id, sold_price, first_image_url } = await req.json();

    if (!item_id) {
      return Response.json({ error: 'item_id required' }, { status: 400 });
    }

    // Fetch the item
    const items = await base44.entities.Item.filter({ id: item_id });
    if (items.length === 0) {
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = items[0];

    // Keep only the first image (or provided image)
    const keptImage = first_image_url || (item.images?.[0] || null);
    const optimizedImages = keptImage ? [keptImage] : [];

    // Update item with cleaned images and sold price
    await base44.entities.Item.update(item_id, {
      images: optimizedImages,
      sold_price: sold_price || item.sold_price,
    });

    // Trigger SEO regeneration with sold price
    try {
      const seoResponse = await base44.functions.invoke('generateItemSEO', {
        item_id: item_id,
        sold_price: sold_price || item.sold_price,
      });
    } catch (seoError) {
      console.warn('SEO generation warning:', seoError.message);
    }

    return Response.json({
      success: true,
      item_id,
      images_kept: optimizedImages.length,
      sold_price: sold_price || item.sold_price,
    });
  } catch (error) {
    console.error('Error processing sold item:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});