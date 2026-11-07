import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, RotateCcw, AlertTriangle, Wallet, Info, Search } from 'lucide-react';
import PhotoAnalysisCard from '@/components/estate/PhotoAnalysisCard';
import PhotoRunDialog from '@/components/estate/PhotoRunDialog';
import { viewStateOf } from '@/lib/photoAnalysisState';
import { base44 } from '@/api/base44Client';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Ready' },
  { key: 'needs_review', label: 'Needs Review' },
  { key: 'failed', label: 'Failed' },
];

export default function SalePhotoAnalysisPanel({ saleId, analysis, photos = [], onRemovePhoto }) {
  const [filter, setFilter] = useState('all');
  const [runDialogHidden, setRunDialogHidden] = useState(false);
  const { counts, credits, running, mode, progress, error } = analysis.state;
  const step2Running = running && mode === 'step2';

  // Every new run announces itself again, even after the last one was hidden.
  useEffect(() => { if (running) setRunDialogHidden(false); }, [running]);

  const states = useMemo(() => {
    const map = {};
    photos.forEach(photo => { map[photo.pipeline?.id || photo.url] = viewStateOf(photo); });
    return map;
  }, [photos]);

  const stateOf = photo => states[photo.pipeline?.id || photo.url] || 'pending';
  const visible = photos.filter(photo => {
    if (filter === 'all') return true;
    const state = stateOf(photo);
    if (filter === 'failed') return state === 'failed';
    return state === filter;
  });

  const removePhoto = async photo => {
    if (!saleId) return;
    if (!window.confirm('Remove this photo and its item from the sale?')) return;
    try {
      await base44.functions.invoke('saveSaleImageChanges', {
        sale_id: saleId,
        remove: [{ photo_id: photo.pipeline?.id, image_revision: photo.pipeline?.revision }],
      });
      onRemovePhoto?.(photo);
    } catch (error) {
      window.alert(error.response?.data?.error || error.message || 'Could not remove this photo.');
    }
  };

  const total = counts?.all ?? photos.length;
  const analyzed = counts ? Math.max(0, total - (counts.pending || 0) - (counts.blocked || 0)) : null;
  const awaiting = counts?.awaiting_credits || 0;
  const blocked = counts?.blocked || 0;
  const filters = blocked > 0 ? [...FILTERS, { key: 'blocked', label: 'On hold' }] : FILTERS;
  const remaining = credits?.remaining;
  const creditText = typeof remaining === 'number'
    ? (remaining >= 999999 ? 'Unlimited searches available' : `${remaining} search${remaining === 1 ? '' : 'es'} remaining this month`)
    : null;

  return (
    <div className="space-y-3">
      <PhotoRunDialog
        open={running && !runDialogHidden && mode !== 'save'}
        mode={mode}
        progress={progress}
        analyzed={analyzed}
        total={total}
        onHide={() => setRunDialogHidden(true)}
      />

      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Analyze Sale Photos</h2>
          <p className="text-xs text-slate-600 mt-1">
            Room views, shelves, tables and piles get a title and short description from the photo alone — no search, no price.
            A single item also gets a web search and a suggested local estate-sale price.
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Suggested prices use comparable <span className="font-medium">asking</span> prices, not sold prices, and are never written
            into your listing price unless you apply them.
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Every photo saves the moment it finishes, so you can leave this page and come back. A finished search is never charged twice.
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Once an item is analyzed, open <span className="font-semibold">Google Lens</span> to check it yourself, edit its title,
            description and price, or delete it. Your edits are never overwritten by a later analysis.
          </p>
        </div>

        <button
          type="button"
          onClick={analysis.start}
          disabled={running || !saleId || photos.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-cyan-600 text-white font-semibold text-sm hover:bg-cyan-700 disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
        >
          {running && mode !== 'step2' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {step2Running ? 'Step 1 is idle — Step 2 is running below'
            : running ? 'Analyzing photos…'
            : counts && counts.ready + counts.needs_review + counts.awaiting_credits === total && total > 0 ? 'Re-check all photos' : 'Analyze Sale Photos'}
        </button>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-2">
          <button
            type="button"
            onClick={analysis.startStep2}
            disabled={running || !saleId || !(counts?.step2 > 0)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-cyan-600 bg-white text-cyan-800 font-semibold text-sm hover:bg-cyan-50 disabled:border-slate-200 disabled:bg-white disabled:text-slate-400 transition-colors"
          >
            {step2Running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {step2Running
              ? (progress ? `Searching the web — ${progress.done} of ${progress.total} done` : 'Starting the web search…')
              : `Step 2 — web search (${counts?.step2 || 0})`}
          </button>
          {step2Running && progress?.total > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-cyan-600 transition-all duration-300"
                style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
            </div>
          )}
          <p className="text-[11px] text-slate-600">
            Step 2 runs the paid SERPAPI product search on single-item photos and on every single item still flagged for
            review. It keeps the Step 1 copy, reuses the image matches already paid for, and skips photos that are already
            confidently identified and priced — one search credit per photo, and never on room views or piles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          {creditText && <span className="inline-flex items-center gap-1"><Wallet className="w-3 h-3" />{creditText}</span>}
          {counts && <span className="inline-flex items-center gap-1"><Info className="w-3 h-3" />{analyzed} of {total} analyzed</span>}
          {running && runDialogHidden && (
            <button type="button" onClick={() => setRunDialogHidden(false)}
              className="inline-flex items-center gap-1 font-semibold text-cyan-700 underline">
              <Loader2 className="w-3 h-3 animate-spin" /> Show progress
            </button>
          )}
          {!saleId && <span className="text-amber-700">Save the sale first to analyze photos.</span>}
        </div>

        {awaiting > 0 && !running && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2.5 space-y-1.5">
            <p className="text-[11px] text-indigo-800">
              {awaiting} photo{awaiting === 1 ? '' : 's'} finished the description but could not run the paid search because no search
              credits were left. Their descriptions are safe.
            </p>
            <button type="button" onClick={analysis.retryFailed}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-indigo-300 bg-white text-[11px] font-semibold text-indigo-800">
              <RotateCcw className="w-3 h-3" /> Resume research
            </button>
          </div>
        )}

        {(counts?.failed || 0) > 0 && !running && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-[11px] text-amber-800">
                {counts.failed} photo{counts.failed === 1 ? '' : 's'} did not finish. A search that was interrupted while it was running
                is never repeated automatically, because the provider may already have charged for it.
              </p>
              <button type="button" onClick={analysis.retryFailed}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-300 bg-white text-[11px] font-semibold text-amber-800">
                <RotateCcw className="w-3 h-3" /> Retry
              </button>
            </div>
          </div>
        )}

        {blocked > 0 && !running && (
          <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2">
            {blocked} photo{blocked === 1 ? ' is' : 's are'} on hold because {blocked === 1 ? 'it is' : 'they are'} marked
            skip / do not scan. {blocked === 1 ? 'It is' : 'They are'} not analyzed and never searched. Open the
            <span className="font-semibold"> On hold </span> filter below to take one off hold and analyze it.
          </p>
        )}

        {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filters.map(({ key, label }) => {
          const count = key === 'all' ? total : (counts?.[key] || 0);
          const active = filter === key;
          return (
            <button key={key} type="button" onClick={() => setFilter(key)}
              className={`rounded-lg border px-2 py-2 text-left transition-colors ${active ? 'border-cyan-600 bg-cyan-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <span className="block text-[11px] font-medium text-slate-500">{label}</span>
              <span className={`block text-lg font-bold ${key === 'needs_review' && count ? 'text-amber-600' : 'text-slate-800'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          {photos.length === 0 ? 'Add photos to this sale first.' : 'No photos in this filter.'}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map(photo => (
            <PhotoAnalysisCard
              key={photo.pipeline?.id || photo.url}
              photo={photo}
              index={photos.indexOf(photo)}
              state={stateOf(photo)}
              busy={running}
              onRetry={analysis.retry}
              onReanalyze={analysis.reanalyze}
              onResearch={analysis.research}
              onClassify={analysis.classify}
              onRelease={analysis.releaseHold}
              onSaveFields={analysis.saveFields}
              onDelete={removePhoto}
            />
          ))}
        </div>
      )}
    </div>
  );
}