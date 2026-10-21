// Chapter 18 P1-11..P1-13 — deterministic listing-completeness display.
// Blockers are real publication problems; warnings are quality improvements
// that never block publishing. No AI, no percentage score.
import React from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

const STATE_STYLE = {
  READY: { icon: CheckCircle2, cls: 'text-green-700 bg-green-50 border-green-200', label: 'READY' },
  READY_WITH_WARNINGS: { icon: AlertTriangle, cls: 'text-amber-700 bg-amber-50 border-amber-200', label: 'READY WITH WARNINGS' },
  INCOMPLETE: { icon: AlertCircle, cls: 'text-red-700 bg-red-50 border-red-200', label: 'INCOMPLETE' },
};

export default function ListingCompletenessCard({ completeness }) {
  if (!completeness) return null;
  const { state, blockers = [], warnings = [] } = completeness;
  const S = STATE_STYLE[state] || STATE_STYLE.READY_WITH_WARNINGS;
  const Icon = S.icon;
  return (
    <div className={`rounded-lg border p-4 ${S.cls}`}>
      <div className="flex items-center gap-2 font-semibold">
        <Icon className="w-4 h-4" /> Listing completeness: {S.label}
      </div>
      {blockers.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {blockers.map((b, i) => (
            <li key={i} className="flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span><span className="font-medium">Blocker:</span> {b.issue}</span></li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span><span className="font-medium">Warning:</span> {typeof w === 'string' ? w : w.issue}</span></li>
          ))}
        </ul>
      )}
      <p className="text-xs mt-2 opacity-80">
        Deterministic check of the sale record. Warnings never block publishing — fix blockers before publishing.
      </p>
    </div>
  );
}