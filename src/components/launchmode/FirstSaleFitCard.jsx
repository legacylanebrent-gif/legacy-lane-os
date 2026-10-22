import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { firstSaleFitReview, FIRST_SALE_FIT_TONES } from './firstSaleFit';

// Chapter 27 P1 — FIRST-SALE FIT REVIEW shown during CONSULTATIONS /
// FIRST-SALE SELECTION. A LENS over the certified Sale Acceptance Review —
// no numeric score, no auto-decision. The operator accepts, declines or refers.

export default function FirstSaleFitCard({ deals }) {
  const consultish = deals.filter(d => d.consultation?.started_at
    || ['consultation_scheduled', 'contract_signed', 'setup_in_progress', 'sale_live', 'completed'].includes(d.stage));
  const list = (consultish.length ? consultish : deals).slice(0, 5);
  if (!list.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Compass className="w-4 h-4 text-cyan-600" />
        <p className="text-sm font-semibold text-slate-800">First-Sale Fit Review</p>
      </div>
      <p className="text-[11px] text-slate-500">
        The first project should be chosen for learning and manageability — not ego. This is a first-sale LENS over the
        Sale Acceptance Review: advisory evidence from observable project conditions. A well-evaluated decline is progress.
      </p>
      {list.map(deal => {
        const fit = firstSaleFitReview(deal);
        return (
          <div key={deal.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800 min-w-0">{deal.client_name}{deal.property_city ? ` — ${deal.property_city}` : ''}</p>
              <Badge className={FIRST_SALE_FIT_TONES[fit.verdict]}>{fit.verdict}</Badge>
            </div>
            <ul className="space-y-1">
              {fit.reasons.slice(0, 4).map((r, i) => <li key={i} className="text-[11px] text-slate-600 flex gap-1.5"><span className="text-cyan-600">•</span>{r}</li>)}
            </ul>
            <p className="text-[10px] text-slate-400">{fit.advisory}</p>
            <Link to={`/Consultation?dealId=${deal.id}`} className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-900">Open Consultation Mode →</Link>
          </div>
        );
      })}
    </div>
  );
}