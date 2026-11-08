import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlayCircle, History } from 'lucide-react';

/**
 * Resumable backfill over already-published sales. Each click starts a job (or
 * advances the running one) using the same capture engine as a live publish, so
 * historical sales are never captured by a second, divergent code path.
 */
export default function ObservationBackfillPanel({ onChanged }) {
  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [limit, setLimit] = useState(40);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const start = async () => {
    setBusy('start');
    setMessage('');
    try {
      const res = await base44.functions.invoke('itemObservationCapture', { action: 'backfill_start', limit: Number(limit) || 40 });
      const data = res.data || {};
      if (data.job_id) {
        setJobId(data.job_id);
        setMessage(`${data.targets} sale(s) queued for backfill — ${data.skipped} already captured. Press "Process next sale" to continue.`);
      } else {
        setMessage(data.reason || 'Nothing to backfill in this batch.');
      }
      if (onChanged) onChanged();
    } catch (e) {
      setMessage('Could not start the backfill.');
    } finally {
      setBusy('');
    }
  };

  const step = async () => {
    if (!jobId) return;
    setBusy('step');
    setMessage('');
    try {
      const res = await base44.functions.invoke('itemObservationCapture', { action: 'backfill_step', job_id: jobId, max_units: 80 });
      const data = res.data || {};
      setJob(data.job || null);
      setMessage(data.done ? 'Backfill complete.' : `Captured sale ${data.position} of ${data.total}.`);
      if (onChanged) onChanged();
    } catch (e) {
      setMessage('Could not continue the backfill.');
    } finally {
      setBusy('');
    }
  };

  const processed = job?.cursor_sale_index || 0;
  const total = job?.total_sales || 0;
  const percent = total ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <History className="w-4 h-4 text-cyan-700" />
        <span className="text-sm font-semibold text-slate-900">Backfill published sales</span>
      </div>
      <p className="text-[11px] text-slate-500 mb-2">
        Resumable, deduplicated by sale and source item. A price first seen during backfill is labelled first-observed, never called the original price.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          value={limit}
          onChange={event => setLimit(event.target.value)}
          className="w-20 h-8 text-xs"
          aria-label="Sales per backfill batch"
        />
        <Button size="sm" onClick={start} disabled={!!busy}>
          {busy === 'start' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Start backfill
        </Button>
        <Button size="sm" variant="outline" onClick={step} disabled={!jobId || !!busy || (job && job.status === 'completed')}>
          {busy === 'step' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <PlayCircle className="w-3 h-3 mr-1" />} Process next sale
        </Button>
      </div>
      {total > 0 && (
        <div className="mt-2">
          <div className="h-1.5 w-full rounded bg-slate-100 overflow-hidden">
            <div className="h-full bg-cyan-600" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1 text-[10px] text-slate-500">{processed}/{total} sales walked · job {job?.status || 'running'}</p>
        </div>
      )}
      {message && <p className="mt-2 text-[11px] text-slate-600">{message}</p>}
    </div>
  );
}