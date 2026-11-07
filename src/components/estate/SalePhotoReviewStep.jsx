import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Loader2, RotateCcw, AlertTriangle, ShieldAlert } from 'lucide-react';
import usePhotoSorting from '@/hooks/usePhotoSorting';
import PhotoSortCard from '@/components/estate/PhotoSortCard';
import { assessmentOf } from '@/lib/photoAssessment';

const FILTERS = [
  { key: 'needs_review', label: 'Needs Review' },
  { key: 'scan', label: 'Scan' },
  { key: 'skip', label: 'Skip' },
  { key: 'all', label: 'All' },
];

export default function SalePhotoReviewStep({ saleId, onStepComplete }) {
  const { photos, loading, running, progress, savingIds, error, sort, override } = usePhotoSorting(saleId);
  const [filter, setFilter] = useState('all');
  const wasRunning = useRef(false);

  const counts = useMemo(() => {
    const totals = { scan: 0, skip: 0, needs_review: 0, failed: 0, unassessed: 0, total: photos.length };
    photos.forEach(photo => {
      const assessment = assessmentOf(photo);
      if (assessment.status === 'failed') totals.failed += 1;
      else if (assessment.status === 'assessed') totals[assessment.decision] += 1;
      else totals.unassessed += 1;
    });
    return totals;
  }, [photos]);

  // Exceptions first: once sorting finishes, show Needs Review if any exist.
  useEffect(() => {
    if (wasRunning.current && !running && counts.needs_review > 0) setFilter('needs_review');
    wasRunning.current = running;
  }, [running, counts.needs_review]);

  const visible = useMemo(() => photos.filter(photo => {
    if (filter === 'all') return true;
    const assessment = assessmentOf(photo);
    if (filter === 'failed') return assessment.status === 'failed';
    if (filter === 'unassessed') return assessment.status !== 'assessed' && assessment.status !== 'failed';
    return assessment.status === 'assessed' && assessment.decision === filter;
  }), [photos, filter]);

  const retryOne = photo => sort({ retryFailed: true, onlyIds: [photo.pipeline?.id] });
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  if (loading) return <div className="p-6 text-slate-500">Loading photos…</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Step 1: Photo Review</h2>
          <p className="text-sm text-slate-600 mt-1">
            AI selects photos suitable for individual-item scanning. Room views and mixed-item photos stay in your
            sale gallery and are skipped in Step 2. You can change any selection.
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => sort()}
            disabled={running || counts.unassessed === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-cyan-600 text-white font-semibold text-sm hover:bg-cyan-700 disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {running ? `Sorting ${progress.done} of ${progress.total}…` : 'AI Sort Photos'}
          </button>
          <p className="text-[11px] text-slate-500">
            {photos.length === 0
              ? 'Add photos to this sale first.'
              : counts.unassessed === 0
                ? 'Every photo has been sorted. Change any selection below, or continue to Step 2.'
                : `${counts.unassessed} photo${counts.unassessed === 1 ? '' : 's'} not sorted yet. Uses Base44's built-in AI — integration credits apply.`}
          </p>
          {running && (
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all" style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>

        {counts.failed > 0 && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-800">
                {counts.failed} photo{counts.failed === 1 ? '' : 's'} could not be assessed. They stay out of Step 2 until they are sorted or you set them yourself.
              </p>
            </div>
            <button
              type="button"
              onClick={() => sort({ retryFailed: true })}
              disabled={running}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-300 bg-white text-red-700 text-[11px] font-semibold disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" /> Retry Failed
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" /> Sensitive material — STOP · SEPARATE · ESCALATE
        </p>
        <p className="text-[11px] text-amber-700 mt-1">
          Separate documents, IDs, medications, financial information and private photos before cataloging, and set
          those photos to Skip.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FILTERS.map(({ key, label }) => {
          const count = key === 'all' ? counts.total : counts[key];
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg border px-2 py-2 text-left transition-colors ${active ? 'border-cyan-600 bg-cyan-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <span className="block text-[11px] font-medium text-slate-500">{label}</span>
              <span className={`block text-lg font-bold ${key === 'needs_review' && count ? 'text-amber-600' : 'text-slate-800'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {(counts.failed > 0 || counts.unassessed > 0) && (
        <div className="flex gap-2">
          {counts.failed > 0 && (
            <button
              type="button"
              onClick={() => setFilter('failed')}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-medium ${filter === 'failed' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}
            >
              Failed {counts.failed}
            </button>
          )}
          {counts.unassessed > 0 && (
            <button
              type="button"
              onClick={() => setFilter('unassessed')}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-medium ${filter === 'unassessed' ? 'border-slate-500 bg-slate-50 text-slate-700' : 'border-slate-200 bg-white text-slate-500'}`}
            >
              Not sorted {counts.unassessed}
            </button>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">
          {photos.length === 0 ? 'No photos yet.' : 'No photos in this filter.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {visible.map(photo => (
            <PhotoSortCard
              key={photo.pipeline?.id || photo.url}
              photo={photo}
              index={photos.indexOf(photo)}
              assessment={assessmentOf(photo)}
              saving={savingIds.includes(photo.pipeline?.id)}
              onOverride={override}
              onRetry={retryOne}
            />
          ))}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-3 sticky bottom-2 shadow-md space-y-2">
        <button
          type="button"
          onClick={() => onStepComplete && onStepComplete()}
          disabled={counts.scan === 0}
          className="w-full px-4 py-3 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
        >
          Continue to Step 2 — Scan {counts.scan} Photo{counts.scan === 1 ? '' : 's'}
        </button>
        <p className="text-[11px] text-slate-500 text-center">
          {counts.scan === 0
            ? 'Select at least one photo for scanning.'
            : `${counts.needs_review} needs review and ${counts.skip} skipped stay out of Step 2. Nothing is deleted — every photo stays in your sale gallery.`}
        </p>
      </div>
    </div>
  );
}