import React from 'react';
import { INCLUDED_PARTS } from './content';

export default function IncludedParts() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {INCLUDED_PARTS.map((part, i) => (
        <div key={part.title} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-black text-amber-600 mb-1">0{i + 1}</div>
          <h3 className="font-black text-slate-900 text-base mb-1">{part.title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{part.body}</p>
        </div>
      ))}
    </div>
  );
}