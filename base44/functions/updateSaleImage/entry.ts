import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { mutateSalePhotos } from '../../shared/photoStore.ts';
import { operatorPhotoEdit, applyScanReceipt } from '../../shared/photoMutations.ts';
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const body = await req.json().catch(() => ({}));
    if (!body.sale_id || !(body.photo_id || body.image_url)) return Response.json({ error: 'sale_id and photo_id required' }, { status: 400 });
    const result = await mutateSalePhotos(base44.asServiceRole, body.sale_id, user, images => body.result_id
      ? applyScanReceipt(images, body, body.type)
      : operatorPhotoEdit(images, body, body.fields || {}));
    return Response.json({ saved: true, photo: result.value, conflicts: result.conflicts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}