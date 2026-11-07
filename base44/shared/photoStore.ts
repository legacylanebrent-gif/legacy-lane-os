import { photoUrl } from './photoFields.ts';

export function photoError(message, status = 409) {
  return Object.assign(new Error(message), { status });
}
export function authorizePhotoSale(sale, user) {
  if (!sale) throw photoError('Sale not found', 404);
  if (!user || !(user.role === 'admin' || sale.operator_id === user.id || (sale.sale_team || []).includes(user.id))) throw photoError('Forbidden', 403);
}
export function initializePhoto(value) {
  const photo = typeof value === 'string' ? { url: value } : { ...value };
  photo.pipeline = { id: crypto.randomUUID(), revision: crypto.randomUUID(), edit_revision: 'initial', jobs: {}, ...photo.pipeline };
  return photo;
}
export function locatePhoto(images, target) {
  // URL is ONLY the migration bridge for old clients. Once issued, the stable ID wins.
  const matches = images.filter(p => target.photo_id ? p.pipeline?.id === target.photo_id : photoUrl(p) === (target.image_url || target.url));
  if (matches.length !== 1) throw photoError('Photo missing or ambiguous; reload the sale.', 409);
  const photo = matches[0];
  if (target.image_revision && photo.pipeline.revision !== target.image_revision) throw photoError('Stale image revision', 409);
  return photo;
}
export function blockedPhoto(photo) {
  return !!(photo.skip_item || photo.skip_serp_search || photo.serp_search_status === 'do_not_search' || photo.excluded_from_public);
}

// Compare-and-swap, not read/replace. Every conflicting write must re-read AND
// re-apply its own mutation. updateMany's conditional update returns `updated`.
// This adapter deliberately has no unconditional-write fallback.
export async function mutateSalePhotos(service, saleId, user, mutate, options = {}) {
  const E = service.entities.EstateSale;
  for (let attempt = 0; attempt < 8; attempt++) {
    const sale = await E.get(saleId);
    authorizePhotoSale(sale, user);
    if (!sale.updated_date) throw photoError('Missing concurrency version; write refused', 503);
    const images = (sale.images || []).map(initializePhoto);
    const value = await mutate(images, sale);
    const patch = { images, ...(options.patch || {}) };
    if (JSON.stringify(images) === JSON.stringify(sale.images || []) && !options.patch) return { sale, images, value, conflicts: attempt };
    let result;
    try {
      result = await E.updateMany({ id: saleId, updated_date: sale.updated_date }, { $set: patch });
    } catch (error) {
      const status = error.status || error.response?.status;
      if (attempt === 7 || !(status === 429 || status >= 500 || /network|fetch|timeout/i.test(error.message))) throw error;
      const retryAfter = Number(error.response?.headers?.['retry-after'] || error.retry_after || (status === 429 ? 60 : 0));
      await new Promise(resolve => setTimeout(resolve, Math.max(retryAfter * 1000, 250 * 2 ** attempt)));
      continue;
    }
    if (result.updated === 1) return { sale, images, value, conflicts: attempt };
    if (result.updated !== 0) throw photoError('Unrecognized conditional-write response; write not acknowledged', 503);
    await new Promise(resolve => setTimeout(resolve, 80 * 2 ** attempt + Math.random() * 80));
  }
  throw photoError('Concurrent photo changes; retry the save, not the provider', 409);
}