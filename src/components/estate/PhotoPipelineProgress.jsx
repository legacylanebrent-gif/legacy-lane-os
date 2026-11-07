import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const TYPE_LABELS = {
  classify: 'Initial classification',
  standard: 'Standard Identify & Price',
  deep: 'Explicit Deep Scan',
};

export default function PhotoPipelineProgress({ pipeline }) {
  const { state, pause } = pipeline;
  const counts = state.counts || {};
  const done = ['completed', 'needs_review', 'failed', 'save_failed', 'stale'].reduce((n, key) => n + (counts[key] || 0), 0);
  const total = state.total || 0;
  const percent = total ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <Dialog open={state.running} onOpenChange={open => { if (!open) pause(); }}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm p-4 gap-3">
        <DialogTitle className="flex items-center gap-2 text-base">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
          {TYPE_LABELS[state.type] || 'Scanning'} running
        </DialogTitle>
        <DialogDescription className="sr-only">Live progress of the photo scan run.</DialogDescription>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs text-slate-600">
            <span>{done} of {total || '…'} photos</span>
            <span className="font-semibold text-slate-800">{percent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 py-2">
            <p className="text-lg font-bold text-slate-800">{counts.completed || 0}</p>
            <p className="text-[10px] text-slate-500">Complete</p>
          </div>
          <div className="rounded-lg bg-amber-50 py-2">
            <p className="text-lg font-bold text-amber-700">{counts.needs_review || 0}</p>
            <p className="text-[10px] text-amber-700">Review</p>
          </div>
          <div className="rounded-lg bg-red-50 py-2">
            <p className="text-lg font-bold text-red-700">{(counts.failed || 0) + (counts.save_failed || 0)}</p>
            <p className="text-[10px] text-red-700">Failed</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Each finished photo is saved right away, so nothing is lost if you close the page. Finished photos are never scanned again.
        </p>

        <Button type="button" variant="outline" onClick={pause} className="w-full">
          Pause after current photos
        </Button>
      </DialogContent>
    </Dialog>
  );
}