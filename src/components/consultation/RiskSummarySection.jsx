import React from 'react';
import { RISK_LEVELS } from '@/components/consultation/consultationModel';

// Chapter 12 P1 — RISK / UNKNOWN SUMMARY (P1-27): one deterministic summary from
// canonical records. KNOWN/CLEAR · NEEDS REVIEW · UNKNOWN — no AI, no fake
// percentage. A warning flag explains what needs attention; it never decides.
export default function RiskSummarySection({ items }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 bg-cyan-50 border border-cyan-200 rounded-lg p-3">
        Deterministic from your records only. UNKNOWN is data — unknown is never zero, never CLEAR, never verified.
      </p>
      {items.map((it, i) => {
        const lvl = RISK_LEVELS[it.level] || RISK_LEVELS.unknown;
        return (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-3">
            <span className={`text-[9px] px-1.5 py-1 rounded border font-semibold shrink-0 ${lvl.tone}`}>{lvl.label}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700">{it.area}</p>
              <p className="text-xs text-slate-600 mt-0.5">{it.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}