import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { applyPhotoFields, photoUrl, AI_OWNED_FIELDS } from '../../shared/photoFields.ts';

/**
 * THE canonical per-photo save service.
 *
 * Every AI result for a photograph is persisted through here. Properties that
 * make cross-item contamination and "reverting" titles impossible:
 *
 *  - the target is addressed by the photo's OWN url, never by array index,
 *    completion order, or a "current item" pointer;
 *  - the merge happens against the CURRENT stored sale read inside this call,
 *    so a slow job can never re-apply an older copy of the whole photo array;
 *  - only the targeted photo index is written back;
 *  - a replaced photo has a new url, so a stale job's url is no longer present
 *    and the write is refused (404) instead of landing on the wrong photo;
 *  - operator-entered text is protected unless the caller explicitly asks to
 *    replace it (mode: 'overwrite').
 */
Deno.serve(async (req) => {
  const started = Date.now();
  let saleIdForLog = null;
  let urlForLog = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { sale_id, image_url, fields, mode = 'fill_empty', result_id = null } = body || {};
    saleIdForLog = sale_id;
    urlForLog = typeof image_url === 'object' && image_url ? image_url.url : image_url;

    if (!sale_id || !urlForLog || !fields || typeof fields !== 'object') {
      return Response.json({ error: 'sale_id, image_url and fields are required' }, { status: 400 });
    }
    if (!['fill_empty', 'overwrite'].includes(mode)) {
      return Response.json({ error: "mode must be 'fill_empty' or 'overwrite'" }, { status: 400 });
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

    // Authorization and identity are derived server-side; nothing is trusted from the client.
    const images = [...(sale.images || [])];
    const idx = images.findIndex((img) => photoUrl(img) === urlForLog);
    if (idx === -1) {
      console.warn('updateSaleImage: photo no longer on sale', { sale_id, url: urlForLog });
      return Response.json(
        { error: 'Photo not found on this sale (it may have been replaced or removed).' },
        { status: 404 },
      );
    }

    const safeFields = {};
    for (const key of AI_OWNED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) safeFields[key] = fields[key];
    }
    safeFields.ai_result_id = result_id || fields.ai_result_id || null;

    const current = typeof images[idx] === 'string' ? { url: images[idx] } : images[idx];
    const { photo, changed } = applyPhotoFields(current, safeFields, mode);
    if (changed.length === 0) {
      return Response.json({ saved: true, changed: [], photo, note: 'Nothing to change — existing values preserved.' });
    }

    images[idx] = photo;
    await base44.asServiceRole.entities.EstateSale.update(sale_id, { images });

    console.log('updateSaleImage: saved', {
      sale_id,
      photo_url: urlForLog,
      changed,
      mode,
      actor: user.id,
      ms: Date.now() - started,
    });

    return Response.json({ saved: true, changed, photo });
  } catch (error) {
    console.error('updateSaleImage failed', {
      sale_id: saleIdForLog,
      photo_url: urlForLog,
      ms: Date.now() - started,
      error: error.message,
    });
    return Response.json({ error: error.message }, { status: 500 });
  }
});