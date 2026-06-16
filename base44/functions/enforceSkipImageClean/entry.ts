import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;

    if (!event || event.type !== 'update' || event.entity_name !== 'EstateSale') {
      return Response.json({ action: 'skipped', reason: 'Not an EstateSale update event' });
    }

    const saleId = event.entity_id;
    if (!saleId) {
      return Response.json({ error: 'Missing entity_id' }, { status: 400 });
    }

    const sale = await base44.asServiceRole.entities.EstateSale.get(saleId);
    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    const images = sale.images || [];
    let cleaned = 0;
    const cleanedImages = images.map((img) => {
      if (typeof img === 'string') return { url: img, name: '', description: '' };

      const isSkipped = img.skip_item === true
        || img.skip_serp_search === true
        || img.serp_search_status === 'do_not_search';

      if (!isSkipped) return img;

      const hasData = (img.name && img.name.trim())
        || (img.description && img.description.trim())
        || img.price != null
        || img.ai_first_search_price != null
        || img.ai_deep_search_price != null;

      if (!hasData) return img;

      cleaned++;
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

    if (cleaned > 0) {
      await base44.asServiceRole.entities.EstateSale.update(saleId, { images: cleanedImages });
    }

    return Response.json({ success: true, cleaned });
  } catch (error) {
    console.error('enforceSkipImageClean error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});