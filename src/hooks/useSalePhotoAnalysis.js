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
  const [state, setState] = useState({ counts: null, credits: null, running: false, error: '' });
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
    if (result.counts) setState(s => ({ ...s, counts: result.counts, credits: result.credits ?? s.credits }));
  };

  const drain = async () => {
    let exhausted = false;
    await Promise.all(Array.from({ length: LANES }, async () => {
      for (;;) {
        const result = await call({ action: 'next', credits_exhausted: exhausted });
        if (result.exhausted) exhausted = true;
        settle(result);
        if (result.done) return;
      }
    }));
    await onRunComplete?.();
    await refresh();
  };

  const guard = work => async (...args) => {
    if (!saleId) { setState(s => ({ ...s, error: 'Save the sale before analyzing photos.' })); return; }
    if (runningRef.current) return;
    runningRef.current = true;
    setState(s => ({ ...s, running: true, error: '' }));
    try { await work(...args); }
    catch (error) { setState(s => ({ ...s, error: error.message })); }
    finally { runningRef.current = false; setState(s => ({ ...s, running: false })); }
  };

  /** Analyze every photo that still needs work, then stop. */
  const start = guard(drain);

  /** Requeue failed / interrupted / credit-blocked photos, then run them. */
  const retryFailed = guard(async () => {
    await call({ action: 'retry_failed' });
    await drain();
  });

  const single = (photo, body, { follow = true } = {}) => guard(async () => {
    settle(await call({ ...body, ...ref(photo) }));
    if (follow) await drain();
    else await refresh();
  })();

  return {
    state,
    refresh,
    start,
    stop: () => { runningRef.current = false; },
    retryFailed,
    retry: photo => single(photo, { action: 'retry' }),
    reanalyze: photo => single(photo, { action: 'reanalyze' }),
    research: photo => single(photo, { action: 'research' }),
    classify: (photo, classification) => single(photo, { action: 'classify', classification }),
    saveFields: (photo, fields) => single(photo, { action: 'save_fields', fields }, { follow: false }),
    applyPrice: photo => single(photo, { action: 'apply_price' }, { follow: false }),
  };
}