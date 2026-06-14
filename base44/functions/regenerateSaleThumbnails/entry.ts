import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_id, start_index, batch_size } = await req.json();
    if (!sale_id) {
      return Response.json({ error: 'sale_id is required' }, { status: 400 });
    }

    const batchLimit = Math.min(batch_size || 20, 20);
    const startFrom = start_index || 0;

    // Fetch the sale
    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: sale_id });
    if (sales.length === 0) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    const sale = sales[0];
    const images = sale.images || [];
    const existingThumbs = sale.image_thumbnails || {};
    
    const end = Math.min(startFrom + batchLimit, images.length);
    let updatedCount = 0;

    for (let i = startFrom; i < end; i++) {
      const img = typeof images[i] === 'string' ? { url: images[i] } : images[i];
      const idx = String(i);
      
      if (existingThumbs[idx]) continue;
      if (!img.url) continue;

      // Don't download/re-upload — just use CDN resize params
      // The CDN supports width=200 for thumbnail-sized images
      if (img.url.includes('base44.app')) {
        existingThumbs[idx] = img.url + (img.url.includes('?') ? '&' : '?') + 'width=200';
      } else {
        existingThumbs[idx] = img.url;
      }
      updatedCount++;
    }

    // Store thumbnails in the lightweight image_thumbnails field
    if (updatedCount > 0) {
      await base44.asServiceRole.entities.EstateSale.update(sale_id, { image_thumbnails: existingThumbs });
    }

    return Response.json({
      success: true,
      updated: updatedCount,
      processed: end - startFrom,
      total: images.length,
      done: end >= images.length,
      next_start: end,
      message: `Processed ${end - startFrom} images, updated ${updatedCount}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});