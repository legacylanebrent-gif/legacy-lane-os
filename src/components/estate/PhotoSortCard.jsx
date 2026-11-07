import React from 'react';

const BADGE = {
  scan: { text: 'Scan', className: 'bg-green-600 text-white' },
  skip: { text: 'Skip', className: 'bg-slate-500 text-white' },
  needs_review: { text: 'Review', className: 'bg-amber-500 text-white' },
  failed: { text: 'Failed', className: 'bg-red-600 text-white' },
  none: { text: 'Not sorted', className: 'bg-slate-200 text-slate-600' },
  pending: { text: 'Sorting…', className: 'bg-slate-300 text-slate-700' },
};

export default function PhotoSortCard({ photo, index, assessment, saving, onOverride, onRetry }) {
  const decision = assessment.status === 'assessed' ? assessment.decision : null;
  const badge = BADGE[assessment.status === 'assessed' ? decision : assessment.status] || BADGE.none;
  const reason = assessment.status === 'failed'
    ? assessment.error || 'Assessment failed — retry it.'
    : assessment.reason;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${decision === 'scan' ? 'border-green-300' : decision === 'skip' ? 'border-slate-200' : assessment.status === 'failed' ? 'border-red-300' : 'border-amber-200'}`}>
      <div className="relative aspect-square bg-slate-100">
        <img
          src={photo.url}
          alt={`Photo ${index + 1}`}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <span className={`absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.className}`}>
          {badge.text}
        </span>
      </div>
      <div className="p-2 space-y-1.5">
        <p className={`text-[11px] leading-snug max-h-8 overflow-hidden ${assessment.status === 'failed' ? 'text-red-600' : 'text-slate-600'}`}>
          {reason ? `${assessment.source === 'operator' ? 'You' : 'AI'}: ${reason}` : `Photo ${index + 1}`}
        </p>
        {assessment.status === 'failed' && onRetry && (
          <button
            type="button"
            onClick={() => onRetry(photo)}
            disabled={saving}
            className="w-full py-1 rounded border border-red-300 bg-red-50 text-red-700 text-[11px] font-semibold disabled:opacity-50"
          >
            Retry
          </button>
        )}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onOverride(photo, 'scan')}
            disabled={saving}
            className={`flex-1 py-1 rounded border text-[11px] font-semibold transition-colors disabled:opacity-50 ${decision === 'scan' ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-green-500 hover:text-green-700'}`}
          >
            Scan
          </button>
          <button
            type="button"
            onClick={() => onOverride(photo, 'skip')}
            disabled={saving}
            className={`flex-1 py-1 rounded border text-[11px] font-semibold transition-colors disabled:opacity-50 ${decision === 'skip' ? 'bg-slate-600 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-800'}`}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}