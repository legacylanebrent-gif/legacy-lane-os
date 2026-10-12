// LLBB setup/readiness display (Phase 4A — Part 8/9).
// Renders the server-computed readiness engine: weighted meaningful sections,
// explicit launch blockers, human-readable reasons.
import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Circle, ShieldAlert } from 'lucide-react';

const ICONS = {
  complete: <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />,
  blocking: <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />,
  warning: <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
  incomplete: <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />,
  optional: <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
};

export default function ReadinessPanel({ readiness, compact }) {
  if (!readiness) return null;
  const { percent, sections, blockers, launch_ready } = readiness;
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
        <div className="text-sm font-semibold text-slate-900">Website Readiness</div>
        <div className="flex-1 min-w-[120px] max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${launch_ready ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${percent}%` }} />
        </div>
        <div className="text-sm font-bold text-slate-800">{percent}%</div>
        <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${launch_ready ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          {launch_ready ? 'Launch-ready' : `${blockers.length} blocker${blockers.length === 1 ? '' : 's'}`}
        </div>
      </div>
      <ul className="divide-y divide-slate-100">
        {sections.map((s) => (
          <li key={s.key} className="px-4 py-2.5 flex items-start gap-3">
            {ICONS[s.status] || ICONS.optional}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-800 flex flex-wrap items-center gap-2">
                {s.label}
                {s.blocking && <span className="text-[10px] font-semibold uppercase tracking-wide bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Required</span>}
                {s.optional && <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Optional</span>}
              </div>
              {s.reason && <div className="text-xs text-slate-500 mt-0.5">{s.reason}</div>}
            </div>
          </li>
        ))}
      </ul>
      {!compact && blockers.length > 0 && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-100 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-700">
            <span className="font-semibold">Launch blockers:</span> {blockers.map(b => b.label).join(', ')} must be complete before this website can go live.
          </div>
        </div>
      )}
    </div>
  );
}