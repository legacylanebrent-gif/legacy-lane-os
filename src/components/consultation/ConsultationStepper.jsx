import React from 'react';
import { CONSULTATION_SECTIONS } from '@/components/consultation/consultationModel';

// Chapter 12 P1 — guided section navigation (mobile-first, horizontally scrollable).
export default function ConsultationStepper({ section, onGo }) {
  return (
    <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
      <div className="flex gap-2 py-1 min-w-max">
        {CONSULTATION_SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => onGo(s.key)}
            className={`shrink-0 min-h-[44px] px-3 rounded-full border text-xs font-medium flex items-center gap-1.5 ${section === s.key
              ? 'bg-cyan-600 border-cyan-600 text-white'
              : 'bg-white border-slate-200 text-slate-600'}`}
          >
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${section === s.key ? 'bg-white/25' : 'bg-slate-100'}`}>{s.num}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}