import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sale_id, image_index, skip_item, skip_saved_name, skip_saved_description, clear_data } = body;

    if (!sale_id || image_index === undefined || image_index === null) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the sale to get current images
    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: sale_id });
    const sale = sales[0];
    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    const images = [...(sale.images || [])];
    const idx = parseInt(image_index);
    if (idx < 0 || idx >= images.length) {
      return Response.json({ error: 'Invalid image index' }, { status: 400 });
    }

    if (typeof images[idx] === 'string') {
      images[idx] = { url: images[idx], name: '', description: '' };
    }

    if (clear_data) {
      // Clear all item data but keep the image URL and skip flag
      images[idx] = {
        ...images[idx],
        name: '',
        description: '',
        price: null,
        ai_first_search_price: null,
      };
      await base44.asServiceRole.entities.EstateSale.update(sale_id, { images });
      return Response.json({ success: true, index: idx, cleared: true });
    }

    images[idx] = {
      ...images[idx],
      skip_item: skip_item === true,
    };

    if (skip_item === true) {
      images[idx].skip_saved_name = skip_saved_name || images[idx].name || '';
      images[idx].skip_saved_description = skip_saved_description || images[idx].description || '';
      images[idx].name = '';
      images[idx].description = '';
      images[idx].skip_updated_at = new Date().toISOString();
    } else {
      // NEVER restore old auto-generated data — un-skip always starts fresh
      images[idx].name = '';
      images[idx].description = '';
      images[idx].synopsis = '';
      images[idx].price = null;
      images[idx].ai_first_search_price = null;
      images[idx].ai_deep_search_price = null;
      images[idx].skip_saved_name = '';
      images[idx].skip_saved_description = '';
      delete images[idx].skip_updated_at;
    }

    await base44.asServiceRole.entities.EstateSale.update(sale_id, { images });

    return Response.json({ success: true, index: idx, skip_item: skip_item === true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});