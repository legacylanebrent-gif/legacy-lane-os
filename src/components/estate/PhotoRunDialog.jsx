import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

const COPY = {
  step2: {
    title: 'Searching the web for these items',
    body: 'The paid product search is running on the single-item photos, and each item is then priced from the comparable asking prices it finds.',
  },
  step1: {
    title: 'Analyzing your photos',
    body: 'Each photo gets a title and a short description from the photo itself. Single items then get a web search and a suggested price.',
  },
  single: {
    title: 'Working on this item',
    body: 'The photo is read, the web search runs, and the result is saved back to this item.',
  },
};

export default function PhotoRunDialog({ open, mode, progress, analyzed, total, onHide }) {
  const copy = COPY[mode] || COPY.single;
  const hasBar = progress && progress.total > 0;

  return (
    <Dialog open={open} onOpenChange={value => { if (!value) onHide?.(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-cyan-600" />
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">{copy.body}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {hasBar ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-cyan-600 transition-all duration-300"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-600">
                {progress.done} of {progress.total} finished
              </p>
            </>
          ) : (
            <p className="text-[11px] text-slate-600">
              {typeof total === 'number' && total > 0
                ? `${analyzed || 0} of ${total} analyzed so far`
                : 'This usually takes a few seconds per photo.'}
            </p>
          )}

          <p className="text-[11px] text-slate-500">
            Every photo saves the moment it finishes, so you can hide this and keep working, or leave the page and come back.
          </p>
        </div>

        <button
          type="button"
          onClick={onHide}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Hide — the work keeps running
        </button>
      </DialogContent>
    </Dialog>
  );
}