import { mutateSalePhotos, locatePhoto, blockedPhoto, photoError } from './photoStore.ts';
import { applyScanReceipt } from './photoMutations.ts';

// Dependency injection is restricted to server imports. The public endpoint
// never accepts a provider override, a mock flag, or caller-supplied AI results.
export async function runPhotoWork({ service, user, saleId, target, type, action = 'run', provider }) {
  if (!['classify', 'standard', 'deep'].includes(type)) throw photoError('Invalid scan type', 400);
  if (action === 'save') {
    const saved = await mutateSalePhotos(service, saleId, user, images => applyScanReceipt(images, target, type));
    return { photo: saved.value, saved: true, state: saved.value.pipeline.jobs[type].state, result_id: target.result_id };
  }
  const id = crypto.randomUUID();
  const claim = await mutateSalePhotos(service, saleId, user, images => {
    const photo = locatePhoto(images, target);
    if (blockedPhoto(photo)) throw photoError('Photo is marked do not search', 422);
    if (type !== 'classify' && photo.pipeline.classification !== 'single') throw photoError('Classify this photo first; only single-item photos can use this scan', 422);
    const old = photo.pipeline.jobs?.[type];
    if (old?.revision === photo.pipeline.revision) {
      if (old.result || ['calling', 'outcome_unknown'].includes(old.state)) return { owner: false, photo, receipt: old };
      if (old.retryable !== true) throw photoError(old.error || 'This attempt cannot be automatically retried', 422);
      if (old.retry_at && Date.parse(old.retry_at) > Date.now()) throw photoError('Provider backoff is still active', 429);
    }
    const active = images.reduce((n,p) => n + Object.values(p.pipeline.jobs || {}).filter(j => j.state === 'calling').length, 0);
    if (active >= 3) throw photoError('Three photo provider calls are already active; resume when they finish', 429);
    const receipt = { id, revision: photo.pipeline.revision, edit_revision: photo.pipeline.edit_revision, state: 'calling', attempts_reserved: (old?.attempts_reserved || 0) + 1, at: new Date().toISOString() };
    photo.pipeline.jobs = { ...photo.pipeline.jobs, [type]: receipt };
    return { owner: true, photo: structuredClone(photo), receipt };
  });
  if (!claim.value.owner) {
    const { photo, receipt } = claim.value;
    if (!receipt.result) throw photoError(receipt.state === 'calling' ? 'Provider attempt is in progress or outcome unknown; it will NOT be automatically charged again' : 'Provider outcome unknown; review before requesting new work', 423);
    return { photo, ...receipt.result, state: receipt.state, result_id: receipt.id, cached: true };
  }
  const { photo, receipt } = claim.value;
  let result;
  try {
    result = await provider(photo, type, id);
  } catch (error) {
    await mutateSalePhotos(service, saleId, user, images => {
      const current = locatePhoto(images, { photo_id: photo.pipeline.id });
      const job = current.pipeline.jobs?.[type];
      if (job?.id !== id) return;
      job.state = error.definite_rejection ? 'failed' : 'outcome_unknown';
      job.error = error.message;
      job.retryable = error.definite_rejection && error.status === 429;
      job.retry_at = new Date(Date.now() + Math.max(30000, Number(error.retry_after || 30) * 1000)).toISOString();
    });
    throw error;
  }
  // Hold the provider answer outside the save retries. It is returned even if
  // receipt persistence fails, so the browser can retain it privately for review.
  try {
    await mutateSalePhotos(service, saleId, user, images => {
      const current = locatePhoto(images, { photo_id: photo.pipeline.id });
      const job = current.pipeline.jobs?.[type];
      if (job?.id !== id || job.revision !== current.pipeline.revision) throw photoError('Stale provider result', 409);
      job.result = result; job.state = 'result_ready';
    });
  } catch (error) {
    return { ...result, photo, result_id: id, state: 'receipt_save_failed', saved: false, error: 'Paid result received but durable receipt save failed. No automatic provider replay.', recovery_result: result };
  }
  console.log('photo provider receipt', { sale_id: saleId, photo_id: photo.pipeline.id, revision: receipt.revision, result_id: id, type, provider: result.provider, provider_request_id: result.provider_request_id });
  return { ...result, photo, result_id: id, state: 'result_ready', saved: false };
}