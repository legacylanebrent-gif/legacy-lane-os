import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { mutateSalePhotos } from '../../shared/photoStore.ts';

/**
 * Nightly job that:
 * 1. Finds sales whose last sale_date has passed and are still active/upcoming
 * 2. Marks them as "completed"
 * 3. Rewrites each image URL to a 400px-wide resized version to free up full-res CDN bandwidth
 *
 * The metadata (name, description, price) is preserved — only the URL gets the resize suffix appended.
 * Already-resized URLs (containing ?w=400) are skipped to avoid double-processing.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin manual trigger OR scheduled (no user auth needed for scheduled)
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
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

      const saved = await mutateSalePhotos(base44.asServiceRole, sale.id, user, images => {
        // A CDN presentation URL is not a new image/content revision. Stable
        // identity and original URL survive; resize only the thumbnail reference.
        for (const image of images) {
          if (!image.url || image.thumbnail_url) continue;
          image.thumbnail_url = `${image.url}${image.url.includes('?') ? '&' : '?'}w=400`;
          imagesResized++;
        }
      }, { patch: { status: 'completed' } });
      const updatedImages = saved.images;

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
}