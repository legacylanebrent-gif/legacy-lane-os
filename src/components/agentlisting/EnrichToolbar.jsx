import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { enrichment } from './listingApi';
import { runEnrichJob, continueEnrichJob } from './enrichRunner';

const CATEGORIES = [
  ['enriched_count', 'Enriched'],
  ['current_count', 'Already current'],
  ['partial_count', 'Partial'],
  ['review_required_count', 'Review needed'],
  ['no_reference_count', 'No reference'],
  ['failed_count', 'Failed'],
];

export default function EnrichToolbar({ filter, q, selectedIds, matchingCount, onFinished }) {
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    enrichment.status().then((res) => setJob(res.active || null)).catch(() => {});
  }, []);

  const finish = useCallback((j) => {
    setJob(j);
  }, []);

  const start = async (scope) => {
    setBusy(scope);
    setError('');
    try {
      const payload = scope === 'selected'
        ? { scope: 'selected', opportunity_ids: [...selectedIds] }
        : { scope: 'filtered', filter, q };
      const result = await runEnrichJob(payload, finish);
      if (result.alreadyRunning) setError('Another enrichment job is already running — its progress is shown below.');
      setOpen(false);
      onFinished?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const resume = async () => {
    setBusy('resume');
    setError('');
    try {
      finish(await continueEnrichJob(job.id, finish));
      onFinished?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const retry = async () => {
    setBusy('retry');
    setError('');
    try {
      const res = await enrichment.retry(job.id);
      finish(await continueEnrichJob(res.job.id, finish));
      onFinished?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const running = job && (job.status === 'queued' || job.status === 'processing');

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setOpen(true)} disabled={!!busy} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Enrich Data
        </Button>
        {running && (
          <Button size="sm" variant="outline" onClick={resume} disabled={!!busy} className="gap-1.5">
            {busy === 'resume' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Continue job · {job.remaining} left
          </Button>
        )}
        {selectedIds.size > 0 && <span className="text-xs text-slate-600">{selectedIds.size} selected</span>}
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {job && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-800">
              Enrichment · {job.processed_count}/{job.total_targets} processed
              {job.status === 'completed' ? ' · finished' : ''}
              {job.status === 'partial' ? ' · finished with failures' : ''}
            </p>
            <div className="flex gap-2">
              {job.failed_count > 0 && (
                <Button size="sm" variant="outline" onClick={retry} disabled={!!busy}>
                  {busy === 'retry' ? 'Retrying…' : 'Retry failed'}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setJob(null)}>Hide</Button>
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-cyan-600" style={{ width: `${job.percent}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {CATEGORIES.map(([key, label]) => (
              <span key={key}>
                {label}: <span className="font-medium text-slate-900">{job[key] || 0}</span>
              </span>
            ))}
          </div>
          {job.last_error && <p className="mt-1 text-xs text-rose-600">{job.last_error}</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enrich owner and property data</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Reads owner, contact and property details from the stored reference records already matched to these
            properties. Nothing is invented, and no contact is attached to an unverified match.
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => start('selected')}
              disabled={selectedIds.size === 0 || !!busy}
              className="w-full rounded-lg border border-slate-200 p-3 text-left hover:border-cyan-300 disabled:opacity-50"
            >
              <span className="block text-sm font-medium text-slate-900">Selected properties</span>
              <span className="block text-xs text-slate-500">{selectedIds.size} selected</span>
            </button>
            <button
              type="button"
              onClick={() => start('filtered')}
              disabled={!matchingCount || !!busy}
              className="w-full rounded-lg border border-slate-200 p-3 text-left hover:border-cyan-300 disabled:opacity-50"
            >
              <span className="block text-sm font-medium text-slate-900">Everything in this view</span>
              <span className="block text-xs text-slate-500">{matchingCount || 0} matching the current filters</span>
            </button>
          </div>
          {busy && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting…
            </p>
          )}
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}