import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Front-end transport for the canonical photo analysis pipeline.
 * All work happens server-side, one photo at a time, and every photo keeps its
 * own saved state — so closing the page loses nothing.
 */
const LANES = 3;

const ref = photo => ({
  photo_id: photo?.pipeline?.id,
  image_revision: photo?.pipeline?.revision,
  edit_revision: photo?.pipeline?.edit_revision,
});

export default function useSalePhotoAnalysis({ saleId, onPhoto, onRunComplete }) {
  const [state, setState] = useState({ counts: null, credits: null, running: false, mode: null, progress: null, error: '' });
  const runningRef = useRef(false);

  const call = useCallback(async body => {
    try {
      const response = await base44.functions.invoke('salePhotoAnalysis', { sale_id: saleId, ...body });
      return response.data || {};
    } catch (error) {
      throw new Error(error.response?.data?.error || error.message || 'Photo analysis failed');
    }
  }, [saleId]);

  const refresh = useCallback(async () => {
    if (!saleId) return;
    try {
      const data = await call({ action: 'status' });
      setState(s => ({ ...s, counts: data.counts || s.counts, credits: data.credits ?? s.credits }));
    } catch (error) {
      setState(s => ({ ...s, error: error.message }));
    }
  }, [saleId, call]);

  useEffect(() => { refresh(); }, [refresh]);

  const settle = result => {
    if (result.photo) onPhoto?.(result.photo);
    if (result.counts || result.photo) setState(s => ({
      ...s,
      counts: result.counts || s.counts,
      credits: result.credits ?? s.credits,
      // One finished photo is visible progress even when the totals do not move.
      progress: s.progress && result.photo ? { ...s.progress, done: s.progress.done + 1 } : s.progress,
    }));
  };

  const drain = async scope => {
    let exhausted = false;
    await Promise.all(Array.from({ length: LANES }, async () => {
      for (;;) {
        const result = await call({ action: 'next', credits_exhausted: exhausted, ...(scope ? { scope } : {}) });
        if (result.exhausted) exhausted = true;
        settle(result);
        if (result.done) return;
      }
    }));
    await onRunComplete?.();
    await refresh();
  };

  const guard = (work, mode = null) => async (...args) => {
    if (!saleId) { setState(s => ({ ...s, error: 'Save the sale before analyzing photos.' })); return; }
    if (runningRef.current) return;
    runningRef.current = true;
    setState(s => ({ ...s, running: true, mode, progress: null, error: '' }));
    try { await work(...args); }
    catch (error) { setState(s => ({ ...s, error: error.message })); }
    finally { runningRef.current = false; setState(s => ({ ...s, running: false, mode: null, progress: null })); }
  };

  /** Analyze every photo that still needs work, then stop. */
  const start = guard(drain, 'step1');

  /** Requeue failed / interrupted / credit-blocked photos, then run them. */
  const retryFailed = guard(async () => {
    await call({ action: 'retry_failed' });
    await drain();
  }, 'step1');

  /**
   * Step 2: the paid web search only, for single-item photos and any photo that
   * still needs review. Keeps the Step 1 copy and never re-runs it.
   */
  const startStep2 = guard(async () => {
    const queued = await call({ action: 'step2_queue' });
    if (queued.counts) setState(s => ({ ...s, counts: queued.counts, credits: queued.credits ?? s.credits }));
    if (queued.queued > 0) {
      setState(s => ({ ...s, progress: { total: queued.queued, done: 0 } }));
      await drain('step2');
    } else await refresh();
  }, 'step2');

  const single = (photo, body, { follow = true } = {}) => guard(async () => {
    settle(await call({ ...body, ...ref(photo) }));
    if (follow) await drain();
    else await refresh();
  })();

  return {
    state,
    refresh,
    start,
    startStep2,
    stop: () => { runningRef.current = false; },
    retryFailed,
    retry: photo => single(photo, { action: 'retry' }),
    reanalyze: photo => single(photo, { action: 'reanalyze' }),
    /** Take the operator's own skip / do-not-scan marker off one photo, then analyze it. */
    releaseHold: photo => single(photo, { action: 'release_hold' }),
    research: photo => single(photo, { action: 'research' }),
    classify: (photo, classification) => single(photo, { action: 'classify', classification }),
    saveFields: (photo, fields) => single(photo, { action: 'save_fields', fields }, { follow: false }),
    applyPrice: photo => single(photo, { action: 'apply_price' }, { follow: false }),
  };
}