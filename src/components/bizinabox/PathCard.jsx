import React from 'react';
import { Check } from 'lucide-react';

export default function PathCard({ path, onApply }) {
  const { name, headline, blurb, cta, points, featured } = path;
  return (
    <div className={`rounded-2xl border-2 p-6 flex flex-col ${featured ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      {featured && (
        <div className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2">Profit share until buyout</div>
      )}
      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{name}</h3>
      <div className="text-2xl font-black text-slate-900 mt-2">{headline}</div>
      <p className="text-sm text-slate-600 leading-relaxed mt-3">{blurb}</p>
      <ul className="mt-5 space-y-2 flex-1">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
            <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => onApply(path.key)}
        className={`mt-6 w-full py-3 rounded-full font-black text-sm uppercase tracking-widest transition-colors ${
          featured ? 'bg-amber-500 hover:bg-amber-400 text-slate-900' : 'bg-slate-900 hover:bg-slate-800 text-white'
        }`}
      >
        {cta}
      </button>
    </div>
  );
}