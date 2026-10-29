import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { runEnrichJob } from './enrichRunner';

export default function EnrichButton({ opportunityId, status, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const label = status && status !== 'never' ? 'Refresh Data' : 'Enrich Data';

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const { alreadyRunning } = await runEnrichJob({ scope: 'selected', opportunity_ids: [opportunityId] });
      if (alreadyRunning) setError('Another enrichment job is running — finish it first.');
      onDone?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col">
      <Button size="sm" variant="outline" onClick={run} disabled={busy} className="gap-1.5">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        {busy ? 'Enriching…' : label}
      </Button>
      {error && <span className="mt-1 text-xs text-rose-600">{error}</span>}
    </div>
  );
}