import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { mutateSalePhotos } from '../../shared/photoStore.ts';
import { structuralPhotoEdit } from '../../shared/photoMutations.ts';
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const body = await req.json().catch(() => ({}));
    if (!body.sale_id || !(body.photo_id || body.image_url)) return Response.json({ error: 'Stable photo identity required; reload before changing photos' }, { status: 400 });
    const result = await mutateSalePhotos(base44.asServiceRole, body.sale_id, user, images => structuralPhotoEdit(images, { updates: [{ ...body, clear_data: body.clear_data === true, fields: { skip_item: body.skip_item === true, skip_updated_at: new Date().toISOString() } }] }));
    return Response.json({ success: true, saved: true, images: result.images });
  } catch (error) { return Response.json({ error: error.message }, { status: error.status || 500 }); }
}