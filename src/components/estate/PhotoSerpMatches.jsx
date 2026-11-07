import React from 'react';

/**
 * The search results the paid lookup actually returned and saved with this item.
 * These are comparable ASKING prices, not sold prices, and never the listing price.
 */
export default function PhotoSerpMatches({ research }) {
  const evidence = research?.evidence;
  const saved = (evidence?.matches || []).filter(m => m && (m.title || m.price));
  if (saved.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1 border-t border-slate-100 pt-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Saved search results · asking prices
        {evidence.avg_asking > 0 && <span className="font-normal text-slate-400"> · avg ${Math.round(evidence.avg_asking)}</span>}
        {evidence.min_asking > 0 && evidence.max_asking > 0 && <span className="font-normal text-slate-400"> · ${evidence.min_asking}–${evidence.max_asking}</span>}
      </p>
      {saved.map((match, i) => (
        <div key={`${match.link || match.title}-${i}`} className="flex items-baseline gap-1.5 text-[11px]">
          <span className="min-w-0 flex-1 truncate text-slate-700">{match.title || 'Untitled listing'}</span>
          {match.price > 0
            ? <span className="flex-shrink-0 font-semibold text-slate-800">${match.price}</span>
            : <span className="flex-shrink-0 text-slate-400">no price</span>}
          {match.link
            ? <a href={match.link} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-cyan-700 underline">{match.source || 'open'}</a>
            : match.source ? <span className="flex-shrink-0 text-slate-400">{match.source}</span> : null}
        </div>
      ))}
      <p className="text-[10px] text-slate-400">{saved.length} saved search {saved.length === 1 ? 'result' : 'results'} for this item.</p>
    </div>
  );
}