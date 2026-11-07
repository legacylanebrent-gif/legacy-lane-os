import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Saves AI-generated fields for ONE photo of a sale.
 *
 * Every write is addressed by the photo's URL and merged into the CURRENT stored
 * images array, so a save can never write one photo's title onto other photos and
 * can never re-apply an older copy of the whole array (the cause of titles
 * "reverting" after a batch run).
 */
const ALLOWED_FIELDS = [
  'name',
  'description',
  'synopsis',
  'price',
  'ai_first_search_price',
  'ai_deep_search_price',
  'categories',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sale_id, image_url, fields } = await req.json();
    if (!sale_id || !image_url || !fields || typeof fields !== 'object') {
      return Response.json({ error: 'sale_id, image_url and fields are required' }, { status: 400 });
    }

    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: sale_id });
    const sale = sales[0];
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    const isOperator = sale.operator_id === user.id;
    const isSaleTeam = (sale.sale_team || []).includes(user.id);
    const isAdmin = user.role === 'admin';
    if (!isOperator && !isSaleTeam && !isAdmin) {
      return Response.json({ error: 'Only the sale operator, its team or an admin may edit these photos.' }, { status: 403 });
    }

    const images = [...(sale.images || [])];
    const idx = images.findIndex((img) => {
      if (typeof img === 'string') return img === image_url;
      if (!img) return false;
      const url = typeof img.url === 'object' && img.url ? img.url.url : img.url;
      return url === image_url;
    });
    if (idx === -1) return Response.json({ error: 'Photo not found on this sale' }, { status: 404 });

    const current = typeof images[idx] === 'string' ? { url: images[idx] } : { ...images[idx] };

    for (const key of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        current[key] = fields[key];
      }
    }
    current.url = image_url;

    images[idx] = current;
    await base44.asServiceRole.entities.EstateSale.update(sale_id, { images });

    return Response.json({ success: true, index: idx });
  } catch (error) {
    console.error('updateSaleImage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});