import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { mutateSalePhotos, blockedPhoto } from '../../shared/photoStore.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    let totalSales = 0;
    let totalImagesCleaned = 0;
    let skip = 0;
    const PAGE_SIZE = 50;

    while (true) {
      const sales = await base44.asServiceRole.entities.EstateSale.list(null, PAGE_SIZE, skip);
      if (!sales || sales.length === 0) break;

      for (const sale of sales) {
        const images = sale.images || [];
        let saleCleaned = 0;
        const updatedImages = images.map((img) => {
          if (typeof img === 'string') return { url: img, name: '', description: '' };

          const isSkipped = img.skip_item === true
            || img.skip_serp_search === true
            || img.serp_search_status === 'do_not_search';

          if (!isSkipped) return img;

          saleCleaned++;
          return {
            ...img,
            name: '',
            description: '',
            synopsis: '',
            price: null,
            ai_first_search_price: null,
            ai_deep_search_price: null,
            categories: [],
          };
        });

        if (saleCleaned > 0) {
          await mutateSalePhotos(base44.asServiceRole, sale.id, user, current => {
            for (const photo of current) if (blockedPhoto(photo)) {
              photo.name = ''; photo.description = ''; photo.synopsis = ''; photo.price = null;
              photo.ai_first_search_price = null; photo.ai_deep_search_price = null;
              photo.pipeline.edit_revision = crypto.randomUUID();
            }
          });
          totalSales++;
          totalImagesCleaned += saleCleaned;
        }
      }

      skip += PAGE_SIZE;
      if (sales.length < PAGE_SIZE) break;
    }

    return Response.json({
      success: true,
      sales_updated: totalSales,
      images_cleaned: totalImagesCleaned,
    });
  } catch (error) {
    console.error('cleanSkippedImageData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}