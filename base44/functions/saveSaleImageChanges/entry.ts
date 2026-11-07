import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { photoUrl } from '../../shared/photoFields.ts';

/**
 * STRUCTURAL photo changes (rotation, skip flags, order, newly uploaded photos).
 *
 * The photo list used to be rewritten from the browser with a whole-array
 * save. Any tab holding an older copy of the list would then put back titles
 * and descriptions that had already been corrected or cleared — that is how
 * cleaned photos re-acquired the same invented label.
 *
 * This function does that work on the SERVER against the CURRENT stored list:
 *  - identity text (name/description/synopsis/prices) is never accepted here;
 *    it belongs to updateSaleImage / the scan functions
 *  - every change is addressed by the photo's own url, never by array position
 *  - only the allowed structural fields are copied
 *  - a photo that no longer exists is skipped instead of receiving another
 *    photo's data
 *
 * Body: { sale_id, updates?: [{url, fields}], order?: [url], append?: [photo] }
 */
const ALLOWED_FIELDS = [
  'rotation',
  'skip_item',
  'skip_serp_search',
  'serp_search_status',
  'skip_updated_at',
  'skip_saved_name',
  'skip_saved_description',
  'excluded_from_public',
  'thumbnail_url',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) || {};
    const { sale_id, updates = [], order = null, append = [] } = body;
    if (!sale_id) return Response.json({ error: 'sale_id is required' }, { status: 400 });

    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: sale_id });
    const sale = sales[0];
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    const allowed = sale.operator_id === user.id
      || (sale.sale_team || []).includes(user.id)
      || user.role === 'admin';
    if (!allowed) {
      return Response.json({ error: 'Only the sale operator, its team or an admin may change these photos.' }, { status: 403 });
    }

    const images = [...(sale.images || [])];
    const skipped = [];

    for (const update of updates) {
      const url = String(update?.url || '');
      if (!url) continue;
      const idx = images.findIndex((img) => photoUrl(img) === url);
      if (idx === -1) { skipped.push(url); continue; }
      const current = typeof images[idx] === 'string' ? { url: images[idx] } : { ...images[idx] };
      for (const key of ALLOWED_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(update.fields || {}, key)) {
          current[key] = update.fields[key];
        }
      }
      images[idx] = current;
    }

    const existing = new Set(images.map((img) => photoUrl(img)).filter(Boolean));
    for (const photo of append) {
      const url = photoUrl(photo);
      if (!url || existing.has(url)) continue;
      existing.add(url);
      const clean = { url };
      for (const key of ALLOWED_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(photo || {}, key)) clean[key] = photo[key];
      }
      images.push(clean);
    }

    let nextImages = images;
    if (Array.isArray(order) && order.length > 0) {
      const byUrl = new Map(images.map((img) => [photoUrl(img), img]));
      const ordered = [];
      for (const url of order) {
        const found = byUrl.get(String(url));
        if (found) { ordered.push(found); byUrl.delete(String(url)); }
      }
      for (const leftover of byUrl.values()) ordered.push(leftover);
      nextImages = ordered;
    }

    await base44.asServiceRole.entities.EstateSale.update(sale_id, { images: nextImages });

    console.log('saveSaleImageChanges: saved', {
      sale_id,
      updates: updates.length,
      appended: append.length,
      reordered: Array.isArray(order) ? order.length : 0,
      photo_count: nextImages.length,
      skipped: skipped.length,
      actor: user.id,
    });

    return Response.json({
      saved: true,
      photo_count: nextImages.length,
      skipped_urls: skipped,
    });
  } catch (error) {
    console.error('saveSaleImageChanges failed', { error: error.message });
    return Response.json({ error: error.message }, { status: 500 });
  }
});