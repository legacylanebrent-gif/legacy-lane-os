import React from 'react';
import { Button } from '@/components/ui/button';

const TYPE_LABELS = { classify: 'Initial classification', standard: 'Standard Identify & Price', deep: 'Explicit Deep Scan' };

export default function PhotoPipelineControls({ pipeline, onSkip }) {
  const { state, run, pause, reset, retryInterrupted } = pipeline;
  const counts = state.counts || {};
  const done = ['completed', 'needs_review', 'failed', 'save_failed', 'stale'].reduce((n, key) => n + (counts[key] || 0), 0);
  const stuck = (counts.failed || 0) + (counts.save_failed || 0);

  return <div className="col-span-2 space-y-2">
    <div className="grid grid-cols-2 gap-2">
      <Button type="button" variant="outline" onClick={onSkip} disabled={state.running}>Flag photos to skip</Button>
      <Button type="button" variant="outline" onClick={() => run('classify')} disabled={state.running}>Initial classification</Button>
      <Button type="button" onClick={() => run('standard')} disabled={state.running} className="h-auto whitespace-normal">Standard Identify &amp; Price</Button>
      <Button type="button" variant="outline" onClick={() => run('deep')} disabled={state.running}>Explicit Deep Scan</Button>
      {state.running ? <Button type="button" variant="outline" onClick={pause}>Pause after active photos</Button> : state.type && <Button type="button" variant="outline" onClick={() => run(state.type)}>Resume / retry {TYPE_LABELS[state.type] || state.type}</Button>}
    </div>
    <p className="text-xs text-muted-foreground">Classification is saved once per image revision. Standard uses OpenAI model estimates, not web research. Only Deep Scan calls SerpAPI.</p>

    {state.type && !state.cleared && <p className="text-xs" role="status">
      {state.running ? 'Scanning' : 'Last run'}: {done} of {state.total || 0} processed — {counts.completed || 0} complete, {counts.needs_review || 0} needs review, {counts.failed || 0} failed, {counts.save_failed || 0} saving.
    </p>}
    {state.cleared && <p className="text-xs text-muted-foreground" role="status">Previous run cleared. Start a new run whenever you are ready.</p>}

    {state.type && stuck > 0 && !state.running && <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 space-y-1.5">
      <p className="text-[11px] text-amber-800">
        {stuck} photo{stuck === 1 ? '' : 's'} in the last run did not finish. Interrupted scans are never retried automatically, because the provider may already have been charged.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={retryInterrupted}>Retry interrupted</Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px]" onClick={reset}>Clear run log</Button>
      </div>
    </div>}

    {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
  </div>;
}