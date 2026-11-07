import React from 'react';
import { Button } from '@/components/ui/button';

export default function PhotoPipelineControls({ pipeline, onSkip }) {
  const { state, run, pause } = pipeline;
  const counts = state.counts;
  return <div className="col-span-2 space-y-2">
    <div className="grid grid-cols-2 gap-2">
      <Button type="button" variant="outline" onClick={onSkip} disabled={state.running}>Flag photos to skip</Button>
      <Button type="button" variant="outline" onClick={() => run('classify')} disabled={state.running}>Initial classification</Button>
      <Button type="button" onClick={() => run('standard')} disabled={state.running} className="h-auto whitespace-normal">Standard Identify &amp; Price</Button>
      <Button type="button" variant="outline" onClick={() => run('deep')} disabled={state.running}>Explicit Deep Scan</Button>
      {state.running ? <Button type="button" variant="outline" onClick={pause}>Pause after active photos</Button> : state.type && <Button type="button" variant="outline" onClick={() => run(state.type)}>Resume / retry {state.type}</Button>}
    </div>
    <p className="text-xs text-muted-foreground">Classification is saved once per image revision. Standard uses OpenAI model estimates, not web research. Only Deep Scan calls SerpAPI.</p>
    {state.type && <p className="text-xs" role="status">{state.running ? 'Processing' : 'Saved progress'}: {counts.completed || 0} complete, {counts.needs_review || 0} review, {counts.failed || 0} failed, {counts.save_failed || 0} pending saves, {counts.stale || 0} stale / {state.total} eligible.</p>}
    {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
  </div>;
}