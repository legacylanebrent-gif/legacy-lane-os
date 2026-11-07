import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { assessmentOf } from '@/lib/photoAssessment';

const CONCURRENCY = 4;
const MAX_ATTEMPTS = 3;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Step 1 sorting. One backend call per photo (bounded concurrency), each of which
 * claims, assesses and persists that single photo, so progress survives an
 * interruption and finished photos are never re-assessed.
 */
export default function usePhotoSorting(saleId) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [savingIds, setSavingIds] = useState([]);
  const [error, setError] = useState('');
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!saleId) return;
    setLoading(true);
    try {
      // Also returns the stable photo ids/revisions, initialising them if needed.
      const res = await base44.functions.invoke('saveSaleImageChanges', { sale_id: saleId });
      setPhotos(res.data?.images || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Could not load photos.');
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  useEffect(() => { load(); }, [load]);

  const replacePhoto = useCallback(updated => {
    if (!updated?.pipeline?.id) return;
    setPhotos(prev => prev.map(p => (p.pipeline?.id === updated.pipeline.id ? updated : p)));
  }, []);

  const assessOne = useCallback(async (photo, retryFailed) => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await base44.functions.invoke('identifySalePhoto', {
          sale_id: saleId,
          photo_id: photo.pipeline.id,
          image_revision: photo.pipeline.revision,
          type: 'assess',
          retry_failed: retryFailed === true || attempt > 1,
        });
        const data = res.data || {};
        if (data.photo) replacePhoto(data.photo);
        const assessment = data.assessment || assessmentOf(data.photo || photo);
        if (assessment.status === 'failed' && assessment.retryable && attempt < MAX_ATTEMPTS) {
          await sleep(700 * 2 ** (attempt - 1));
          continue;
        }
        return assessment.status;
      } catch (e) {
        const status = e.response?.status;
        const message = e.response?.data?.error || e.message || 'Assessment failed.';
        // Already sorted elsewhere, or the photo changed under us: no retry.
        if (status === 409 || status === 401 || status === 403) { setError(message); return 'blocked'; }
        if (attempt === MAX_ATTEMPTS) { setError(message); return 'failed'; }
        await sleep(700 * 2 ** (attempt - 1) + Math.random() * 300);
      }
    }
    return 'failed';
  }, [saleId, replacePhoto]);

  const sort = useCallback(async ({ retryFailed = false, onlyIds = null } = {}) => {
    if (busy.current || !saleId) return;
    const targets = photos.filter(p => p.pipeline?.id).filter(p => {
      if (onlyIds && !onlyIds.includes(p.pipeline.id)) return false;
      const { status } = assessmentOf(p);
      return retryFailed ? status === 'failed' : status === 'none' || status === 'pending';
    });
    if (!targets.length) return;
    busy.current = true;
    setRunning(true);
    setError('');
    setProgress({ done: 0, total: targets.length });
    const queue = [...targets];
    let done = 0;
    const worker = async () => {
      while (queue.length) {
        const photo = queue.shift();
        await assessOne(photo, retryFailed);
        done += 1;
        setProgress({ done, total: targets.length });
      }
    };
    try {
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));
    } finally {
      busy.current = false;
      setRunning(false);
    }
  }, [photos, saleId, assessOne]);

  /** Operator override — persisted immediately for this photo only. */
  const override = useCallback(async (photo, decision) => {
    if (!photo?.pipeline?.id) return;
    const id = photo.pipeline.id;
    setSavingIds(ids => [...ids, id]);
    try {
      const res = await base44.functions.invoke('identifySalePhoto', {
        sale_id: saleId,
        photo_id: id,
        image_revision: photo.pipeline.revision,
        type: 'assess',
        action: 'override',
        decision,
      });
      if (res.data?.photo) replacePhoto(res.data.photo);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Selection did not save. Try again.');
    } finally {
      setSavingIds(ids => ids.filter(x => x !== id));
    }
  }, [saleId, replacePhoto]);

  return { photos, loading, running, progress, savingIds, error, setError, sort, override, reload: load };
}