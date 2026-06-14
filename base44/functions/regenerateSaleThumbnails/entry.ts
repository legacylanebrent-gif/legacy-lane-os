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
    
    // Only process the batch window
    const end = Math.min(startFrom + batchLimit, images.length);
    let updatedCount = 0;

    for (let i = startFrom; i < end; i++) {
      const img = typeof images[i] === 'string' ? { url: images[i] } : images[i];
      
      if (img.thumbnail_url) continue;
      if (!img.url) continue;

      try {
        const response = await fetch(img.url);
        if (!response.ok) {
          console.log(`Failed to fetch image at index ${i}: ${response.status}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        const file = new File([arrayBuffer], `sale_img_${i}.jpg`, { type: contentType });
        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        
        if (uploadResult?.file_url) {
          images[i] = { ...img, thumbnail_url: uploadResult.file_url };
          updatedCount++;
        }
      } catch (e) {
        console.log(`Error processing image ${i}:`, e.message);
      }
    }

    // Save updated images back to the sale
    if (updatedCount > 0) {
      await base44.asServiceRole.entities.EstateSale.update(sale_id, { images });
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