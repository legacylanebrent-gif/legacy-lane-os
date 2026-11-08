import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * Central database capture status for ONE sale, shown on its Photos & Descriptions
 * page. Counts come back from the server — an operator never reads another
 * operator's observations, only their own sale's totals.
 */
export default function ObservationCaptureStatus({ saleId, saleStatus }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const published = ['upcoming', 'active', 'completed', 'archived'].includes(saleStatus);

  const load = useCallback(async () => {
    if (!saleId || !published) return;
    try {
      const res = await base44.functions.invoke('itemObservationCapture', { action: 'status', sale_id: saleId });
      setStatus(res.data);
    } catch (e) {
      setError('Could not read the central capture status.');
    }
  }, [saleId, published]);

  useEffect(() => { load(); }, [load]);

  const run = async (action) => {
    setBusy(action);
    setError('');
    try {
      const res = await base44.functions.invoke('itemObservationCapture', { action, sale_id: saleId });
      setStatus(res.data?.status || null);
      if (res.data?.result && res.data.result.ok === false) setError(res.data.result.error || 'Capture could not finish.');
    } catch (e) {
      setError('Capture could not finish — try again.');
    } finally {
      setBusy('');
    }
  };

  if (!saleId) return null;
  if (!published) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
        <Database className="w-3 h-3 inline mr-1" />
        Central database capture starts automatically when this sale is published.
      </div>
    );
  }

  const job = status?.job;
  const failed = (job?.failed_count || 0) > 0 || job?.status === 'partial' || job?.status === 'failed';
  const pending = job && (job.status === 'queued' || job.status === 'processing');

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
          <Database className="w-3 h-3 text-cyan-700" /> Central database
        </span>
        {!status ? (
          <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
        ) : (
          <>
            <Badge variant="outline" className="text-[10px]">{status.captured} captured</Badge>
            {status.withdrawn > 0 && <Badge variant="outline" className="text-[10px] text-slate-500">{status.withdrawn} withdrawn</Badge>}
            {(status.by_outcome?.transaction_linked_sold || 0) > 0 && (
              <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-800">
                {status.by_outcome.transaction_linked_sold} transaction-linked
              </Badge>
            )}
            {(status.by_outcome?.operator_reported_sold || 0) > 0 && (
              <Badge variant="outline" className="text-[10px] border-cyan-200 bg-cyan-50 text-cyan-800">
                {status.by_outcome.operator_reported_sold} operator-reported sold
              </Badge>
            )}
            {pending && <span className="text-[10px] text-amber-700">{job.units_processed}/{job.units_total} processing…</span>}
            {failed && (
              <span className="inline-flex items-center gap-1 text-[10px] text-red-600">
                <AlertTriangle className="w-3 h-3" /> {job?.failed_count || 0} failed
              </span>
            )}
          </>
        )}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" disabled={!!busy} onClick={() => run('refresh')}>
            {busy === 'refresh' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Refresh
          </Button>
          {(failed || status?.withdrawn > 0) && (
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-red-600" disabled={!!busy} onClick={() => run('retry')}>
              {busy === 'retry' ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Retry failed
            </Button>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}
      {!error && failed && job?.last_error && <p className="mt-1 text-[10px] text-amber-700">{job.last_error}</p>}
    </div>
  );
}