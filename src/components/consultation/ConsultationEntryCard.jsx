import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList } from 'lucide-react';
import { consultationState, RECOMMENDATION_LABEL, RECOMMENDATION_TONE } from '@/components/consultation/consultationModel';

// Chapter 12 P1 — START/CONTINUE/REVIEW CONSULTATION entry from the canonical
// Chapter 10 opportunity. Loads known information; never duplicates the deal.
export default function ConsultationEntryCard({ deal }) {
  const state = consultationState(deal);
  const rec = deal?.consultation?.recommendation?.classification;
  return (
    <div className="border border-cyan-200 rounded-lg p-4 space-y-3 bg-gradient-to-br from-cyan-50 to-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-cyan-600" /> Consultation Mode
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            The consultation is an EVALUATION, not merely a sales appointment. Walk the property with your phone, capture evidence,
            review projected economics, and make a structured human recommendation that carries into the proposal.
          </p>
        </div>
        {rec && <Badge className={RECOMMENDATION_TONE(rec)}>{RECOMMENDATION_LABEL(rec).toUpperCase()}</Badge>}
      </div>
      <Button asChild className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 h-11 text-base">
        <Link to={`/Consultation?dealId=${deal.id}`}>{state.action}</Link>
      </Button>
    </div>
  );
}