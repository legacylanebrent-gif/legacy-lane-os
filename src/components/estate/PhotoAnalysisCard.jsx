import React, { useState } from 'react';
import { Loader2, RotateCcw, Search, RefreshCw, Check, AlertTriangle, ImageOff, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import PhotoOperatorEditor from '@/components/estate/PhotoOperatorEditor';
import PhotoSerpMatches from '@/components/estate/PhotoSerpMatches';

const TONE = {
  ready: 'bg-green-50 border-green-200 text-green-700',
  needs_review: 'bg-amber-50 border-amber-200 text-amber-800',
  awaiting_credits: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  failed: 'bg-red-50 border-red-200 text-red-700',
  inflight: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  blocked: 'bg-slate-100 border-slate-200 text-slate-500',
  pending: 'bg-slate-50 border-slate-200 text-slate-600',
};

const LABEL = {
  ready: 'Ready',
  needs_review: 'Needs review',
  awaiting_credits: 'Awaiting credits',
  failed: 'Failed',
  inflight: 'Working',
  blocked: 'On hold',
  pending: 'Not analyzed',
};

const reasonList = job => (job?.review_flags || []).filter(Boolean);

export default function PhotoAnalysisCard({ photo, index, state, busy, onRetry, onReanalyze, onResearch, onClassify, onRelease, onSaveFields, onDelete }) {
  const [editing, setEditing] = useState(false);
  const job = photo?.pipeline?.jobs?.analysis;
  const research = job?.research;
  const suggested = research?.suggested_price;
  const reasons = reasonList(job);
  const classification = job?.classification;
  const held = state === 'blocked';
  // Manual review happens once the photo is not being worked on, so it is
  // available for every item after Step 2 finishes.
  const canOperate = state !== 'inflight';
  // A run disables every card's buttons, so say why instead of going quietly grey.
  const working = state === 'inflight';
  const waiting = busy && !working;
  const lensUrl = photo?.url
    ? `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(photo.url)}`
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex gap-2.5 p-2.5">
        <div className="w-20 h-20 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
          {photo?.url
            ? <img src={photo.url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
            : <ImageOff className="w-5 h-5 text-slate-300" />}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2">
              {photo?.name || <span className="text-slate-400 font-normal">Photo {index + 1} — no title yet</span>}
            </p>
            <span className={`flex-shrink-0 text-[10px] font-semibold border rounded-full px-1.5 py-0.5 ${TONE[state] || TONE.pending}`}>
              {state === 'inflight' && <Loader2 className="w-2.5 h-2.5 inline animate-spin mr-0.5" />}
              {LABEL[state] || LABEL.pending}
            </span>
          </div>

          {photo?.description && <p className="text-[11px] text-slate-600 line-clamp-2">{photo.description}</p>}

          {(suggested != null || research?.price_low != null) && (
            <p className="text-[11px] text-slate-700">
              <span className="font-semibold text-indigo-700">
                ${suggested ?? '—'}
              </span>
              {research?.price_low != null && research?.price_high != null && <span className="text-slate-500"> · range ${research.price_low}–${research.price_high}</span>}
              {photo?.price > 0 && <span className="text-slate-500"> · listed ${photo.price}</span>}
            </p>
          )}
          {research?.price_basis && <p className="text-[10px] text-slate-500 line-clamp-2">{research.price_basis}</p>}

          {reasons.length > 0 && (
            <p className="text-[10px] text-amber-700 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
              <span className="line-clamp-2">{reasons[0]}{reasons.length > 1 ? ` +${reasons.length - 1} more` : ''}</span>
            </p>
          )}
        </div>
      </div>

      <div className="px-2.5">
        <PhotoSerpMatches research={research} />
      </div>

      {editing && (
        <PhotoOperatorEditor
          photo={photo}
          busy={busy}
          onSave={fields => onSaveFields(photo, fields)}
          onClose={() => setEditing(false)}
        />
      )}

      <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5">
        {working && (
          <span className="w-full inline-flex items-center gap-1 text-[10px] font-medium text-cyan-700">
            <Loader2 className="w-3 h-3 animate-spin" /> Reading the photo, then the web search — each step saves as it finishes.
          </span>
        )}
        {waiting && (
          <span className="w-full text-[10px] text-slate-500">
            Analysis is running on another photo right now, so these buttons stay locked until it finishes.
          </span>
        )}
        {canOperate && lensUrl && (
          <a
            href={lensUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cyan-600 bg-cyan-50 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100"
          >
            <ExternalLink className="w-3 h-3" /> Google Lens
          </a>
        )}
        {canOperate && (
          <button
            type="button"
            onClick={() => setEditing(value => !value)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium ${editing ? 'border-cyan-600 bg-cyan-50 text-cyan-800' : 'border-slate-300 bg-white text-slate-700'}`}
          >
            <Pencil className="w-3 h-3" /> {editing ? 'Close editor' : 'Edit title, price'}
          </button>
        )}
        {held && (
          <>
            <span className="text-[10px] text-slate-500 w-full">
              On hold — you marked this photo skip / do not scan, so analysis skips it.
            </span>
            <button type="button" disabled={busy} onClick={() => onRelease(photo)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cyan-300 bg-cyan-50 text-[11px] font-semibold text-cyan-800 disabled:opacity-50">
              <RefreshCw className="w-3 h-3" /> Take off hold &amp; analyze
            </button>
          </>
        )}
        {!held && (state === 'failed' || state === 'awaiting_credits') && (
          <button type="button" disabled={busy} onClick={() => onRetry(photo)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 bg-white text-[11px] font-medium text-slate-700 disabled:opacity-50">
            <RotateCcw className="w-3 h-3" /> Resume
          </button>
        )}
        {!held && state !== 'inflight' && (
          <button type="button" disabled={busy} onClick={() => onReanalyze(photo)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 bg-white text-[11px] font-medium text-slate-700 disabled:opacity-50">
            <RefreshCw className="w-3 h-3" /> {state === 'pending' ? 'Analyze' : 'Re-analyze'}
          </button>
        )}
        {!held && classification === 'group' && state !== 'inflight' && (
          <button type="button" disabled={busy} onClick={() => onClassify(photo, 'single')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cyan-300 bg-cyan-50 text-[11px] font-medium text-cyan-800 disabled:opacity-50">
            <Search className="w-3 h-3" /> Single item — search
          </button>
        )}
        {!held && classification === 'single' && state !== 'inflight' && (
          <button type="button" disabled={busy} onClick={() => onClassify(photo, 'group')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 bg-white text-[11px] font-medium text-slate-600 disabled:opacity-50">
            <Check className="w-3 h-3" /> Group — no search
          </button>
        )}
        {!held && state === 'ready' && !suggested && classification === 'single' && (
          <button type="button" disabled={busy} onClick={() => onResearch(photo)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-indigo-300 bg-indigo-50 text-[11px] font-medium text-indigo-800 disabled:opacity-50">
            <Search className="w-3 h-3" /> Search again
          </button>
        )}
        {canOperate && (
          <button type="button" disabled={busy} onClick={() => onDelete(photo)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-300 bg-white text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        )}
      </div>
    </div>
  );
}