import React from 'react';
import { Check } from 'lucide-react';

/**
 * The search results the paid lookup actually returned and saved with this item.
 * These are comparable ASKING prices, not sold prices, and never the listing price.
 *
 * Each result is a real suggested item: its title and its price can be adopted as
 * this item's own title and price with one press.
 */
export default function PhotoSerpMatches({ research, photo, busy, onUse }) {
  const evidence = research?.evidence;
  const saved = (evidence?.matches || []).filter(m => m && (m.title || m.price));
  if (saved.length === 0) return null;

  // Already adopted when this item's title (and price, when the result had one)
  // is exactly what the result says.
  const isUsed = match => {
    const title = String(match?.title || '').trim();
    if (!title || title !== String(photo?.name || '').trim()) return false;
    const price = Number(match?.price);
    return price > 0 ? Number(photo?.price) === price : true;
  };

  return (
    <div className="mt-1.5 space-y-1 border-t border-slate-100 pt-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Saved search results · asking prices
        {evidence.avg_asking > 0 && <span className="font-normal text-slate-400"> · avg ${Math.round(evidence.avg_asking)}</span>}
        {evidence.min_asking > 0 && evidence.max_asking > 0 && <span className="font-normal text-slate-400"> · ${evidence.min_asking}–${evidence.max_asking}</span>}
      </p>
      {saved.map((match, i) => {
        const used = isUsed(match);
        return (
          <div key={`${match.link || match.title}-${i}`} className="rounded-md border border-slate-200 bg-slate-50/70 px-1.5 py-1">
            <p className="text-[11px] leading-snug text-slate-700 line-clamp-2">{match.title || 'Untitled listing'}</p>
            <div className="mt-0.5 flex items-center justify-between gap-1.5">
              {match.price > 0
                ? <span className="text-[11px] font-semibold text-slate-800">${match.price}</span>
                : <span className="text-[10px] text-slate-400">no price</span>}
              <div className="flex items-center gap-1.5">
                {match.link
                  ? <a href={match.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-700 underline">{match.source || 'open'}</a>
                  : match.source ? <span className="text-[10px] text-slate-400">{match.source}</span> : null}
                {onUse && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onUse(match)}
                    className={`flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-semibold disabled:opacity-50 ${used ? 'border-green-300 bg-green-50 text-green-700' : 'border-indigo-300 bg-indigo-50 text-indigo-800'}`}
                  >
                    {used ? <><Check className="w-2.5 h-2.5" /> Used</> : 'Use This'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-slate-400">{saved.length} saved search {saved.length === 1 ? 'result' : 'results'} for this item.</p>
    </div>
  );
}