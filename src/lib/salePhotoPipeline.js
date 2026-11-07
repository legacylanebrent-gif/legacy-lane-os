// Production adapter. Tests supply the SDK transport, never a second scan/save
// implementation. Paid provider responses are retained independently of saves.
export function salePhotoPipeline({ engine, invoke, saleId, images, type, journal, onPhoto, onEvent, isPaused, isCurrent, retryUnknown = false }) {
  const { createPhotoBatchRunner, buildJobs } = engine;
  const request = async (name, body) => {
    try { return await invoke(name, body); }
    catch (error) {
      if (error.response?.data?.error) error.message = error.response.data.error;
      throw error;
    }
  };
  const jobs = buildJobs({ images, scanType: type, isBlocked: p => p.skip_item || p.skip_serp_search || p.excluded_from_public || p.serp_search_status === 'do_not_search' || (type !== 'classify' && p.pipeline?.classification !== 'single') });
  const old = journal?.read?.() || {};
  const runner = createPhotoBatchRunner({
    concurrency: 3, maxScanAttempts: 3, maxSaveAttempts: 4, baseDelayMs: 1000,
    initialStatus: old.statuses, initialPendingSaves: old.pendingSaves || [],
    checkpoint: state => journal?.write?.(state), isPaused, isJobCurrent: isCurrent,
    scanFn: async job => {
      const { data } = await request(type === 'deep' ? 'googleLensPricing' : 'identifySalePhoto', {
        sale_id: saleId, photo_id: job.photoId, image_url: job.photoUrl, image_revision: job.imageRevision, type, explicit_deep: type === 'deep', retry_unknown: retryUnknown
      });
      if (data.state === 'receipt_save_failed') {
        journal?.retainRecovery?.({ job, data });
        throw Object.assign(new Error(data.error), { status: 423 });
      }
      if (data.error) throw Object.assign(new Error(data.error), { status: 422 });
      return data;
    },
    saveFn: async (job, result) => {
      const { data } = await request(type === 'deep' ? 'googleLensPricing' : 'identifySalePhoto', {
        action: 'save', sale_id: saleId, photo_id: job.photoId, image_revision: job.imageRevision,
        result_id: result.raw.result_id, type, explicit_deep: type === 'deep'
      });
      if (data.state === 'stale') throw Object.assign(new Error('Stale photo work rejected'), { status: 409 });
      onPhoto?.(data.photo);
    }, onEvent
  });
  return { runner, jobs };
}