import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_id } = await req.json();
    if (!sale_id) {
      return Response.json({ error: 'sale_id is required' }, { status: 400 });
    }

    // Fetch the sale (service role for any user's sale)
    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: sale_id });
    if (sales.length === 0) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    const sale = sales[0];
    const images = sale.images || [];
    let updatedCount = 0;

    for (let i = 0; i < images.length; i++) {
      const img = typeof images[i] === 'string' ? { url: images[i] } : images[i];
      
      // Skip images that already have a thumbnail
      if (img.thumbnail_url) continue;

      if (!img.url) continue;

      try {
        // Download the original image
        const response = await fetch(img.url);
        if (!response.ok) {
          console.log(`Failed to fetch image at index ${i}: ${response.status}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        // Upload as a private file (we'll create a signed URL for it)
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
      total: images.length,
      message: `Updated ${updatedCount} out of ${images.length} images`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});