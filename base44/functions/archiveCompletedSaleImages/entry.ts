import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Nightly job that:
 * 1. Finds sales whose last sale_date has passed and are still active/upcoming
 * 2. Marks them as "completed"
 * 3. Rewrites each image URL to a 400px-wide resized version to free up full-res CDN bandwidth
 *
 * The metadata (name, description, price) is preserved — only the URL gets the resize suffix appended.
 * Already-resized URLs (containing ?w=400) are skipped to avoid double-processing.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin manual trigger OR scheduled (no user auth needed for scheduled)
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch active/upcoming sales that have sale_dates
    const sales = await base44.asServiceRole.entities.EstateSale.filter(
      { status: ['active', 'upcoming'] },
      '-created_date',
      500
    );

    let completedCount = 0;
    let imagesResized = 0;
    const results = [];

    for (const sale of sales) {
      const dates = sale.sale_dates || [];
      if (dates.length === 0) continue;

      // Find the latest date in the sale
      const lastDate = dates
        .map(d => d.date)
        .filter(Boolean)
        .sort()
        .pop();

      if (!lastDate || lastDate >= today) continue; // Sale hasn't ended yet

      // Rewrite image URLs to 400px resize param
      const updatedImages = (sale.images || []).map(img => {
        if (!img.url) return img;
        // Skip if already has resize param
        if (img.url.includes('?w=') || img.url.includes('&w=')) return img;
        imagesResized++;
        return { ...img, url: `${img.url}?w=400` };
      });

      await base44.asServiceRole.entities.EstateSale.update(sale.id, {
        status: 'completed',
        images: updatedImages,
      });

      completedCount++;
      results.push({ id: sale.id, title: sale.title, last_date: lastDate, images: updatedImages.length });
    }

    return Response.json({
      success: true,
      sales_completed: completedCount,
      images_resized: imagesResized,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});