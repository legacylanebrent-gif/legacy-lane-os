import React from 'react';
import { Button } from '@/components/ui/button';

export default function PhotoScanDetails({ photo, pipeline }) {
  const info = photo.pipeline || {};
  const standard = info.jobs?.standard?.result;
  return <div className="space-y-2 text-xs">
    <p className="text-muted-foreground">Classification: {info.classification || 'not run'}{info.classification_reason ? ` · ${info.classification_reason}` : ''}</p>
    {(info.review_required || /mid.century.*(credenza|sideboard)|vintage.*(credenza|sideboard)/i.test(photo.name || '')) && <p className="font-medium text-destructive">Identity needs operator review. The existing label remains visible until reviewed.</p>}
    {standard && <div className="rounded border border-border bg-muted p-2">
      <p>Suggested identity: {standard.name || 'Not confidently identified'}</p>
      {standard.description && <p>{standard.description}</p>}
      <p>Estate-sale price estimate (model only): {standard.estimated_price == null ? 'unavailable' : `$${standard.estimated_price}`}</p>
      <p>Identification confidence: {standard.confidence || 'unknown'}. {standard.uncertainty_note || 'Visual identification is not authentication.'}</p>
      <p className="text-muted-foreground">Not an appraisal or verified comparable sale. Your listing price is unchanged.</p>
    </div>}
    {Object.entries(info.jobs || {}).filter(([, job]) => ['failed', 'outcome_unknown', 'receipt_save_failed', 'stale'].includes(job.state)).map(([type, job]) => <p key={type} className="text-destructive">{type}: {job.error || job.state}. Unknown provider outcomes are not automatically charged again.</p>)}
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={pipeline.state.running} onClick={() => pipeline.run('classify', [photo])}>Classify</Button>
      <Button type="button" size="sm" disabled={pipeline.state.running || info.classification !== 'single'} onClick={() => pipeline.run('standard', [photo])}>Standard Identify &amp; Price</Button>
      <Button type="button" size="sm" variant="outline" disabled={pipeline.state.running || info.classification !== 'single'} onClick={() => pipeline.run('deep', [photo])}>Explicit Deep Scan</Button>
    </div>
  </div>;
}