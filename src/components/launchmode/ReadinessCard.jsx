import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';

// Chapter 27 P1 — LAUNCH READINESS STATUS + CRITICAL vs NEEDS ATTENTION vs
// IMPROVE LATER. Deterministic and explainable: the operator can always answer
// "why am I in this status?". Legal/tax/insurance/employment items are never
// judged by the system — only on-file facts plus PROFESSIONAL REVIEW language.

const TIER_META = {
  CRITICAL: { icon: ShieldAlert, cls: 'text-red-600', chip: 'bg-red-100 text-red-700 border-red-300', label: 'LAUNCH CRITICAL' },
  ATTENTION: { icon: AlertTriangle, cls: 'text-amber-600', chip: 'bg-amber-100 text-amber-700 border-amber-300', label: 'NEEDS ATTENTION' },
  OPTIONAL: { icon: Clock, cls: 'text-slate-400', chip: 'bg-slate-100 text-slate-500 border-slate-300', label: 'IMPROVE LATER' },
};

const STATUS_TONES = {
  red: 'bg-red-100 text-red-700 border-red-300',
  amber: 'bg-amber-100 text-amber-700 border-amber-300',
  green: 'bg-green-100 text-green-700 border-green-300',
};

export default function ReadinessCard({ items, status }) {
  const tiers = ['CRITICAL', 'ATTENTION', 'OPTIONAL'];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">Launch Readiness Status</p>
        <Badge className={STATUS_TONES[status.tone]}>{status.status}</Badge>
      </div>
      <p className="text-[11px] text-slate-600 border-l-2 border-slate-200 pl-2">{status.why}</p>
      {tiers.map(tier => {
        const rows = items.filter(i => i.tier === tier);
        if (!rows.length) return null;
        const M = TIER_META[tier];
        return (
          <div key={tier} className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1" style={{ color: undefined }}>
              <M.icon className={`w-3 h-3 ${M.cls}`} /><span className={M.cls}>{M.label}</span>
            </p>
            {rows.map(item => (
              <div key={item.id} className={`flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 border rounded-lg p-2.5 ${item.complete === true ? 'border-green-200 bg-green-50/50' : item.complete === false ? 'border-slate-200' : 'border-slate-100'}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800">
                    {item.complete === true && <ShieldCheck className="w-3.5 h-3.5 inline text-green-600 mr-1" />}
                    {item.label}
                  </p>
                  <p className="text-[11px] text-slate-500">{item.why}</p>
                  {item.professionalReview && (
                    <p className="text-[10px] text-purple-700 mt-0.5">REVIEW NEEDED — professional guidance may be appropriate. EstateSalen never declares legal, tax, insurance or employment compliance.</p>
                  )}
                </div>
                {item.action && (
                  <Link to={item.action.to} className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-900 shrink-0">{item.action.label} →</Link>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}