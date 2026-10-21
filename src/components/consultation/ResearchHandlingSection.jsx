import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

// Chapter 12 P1 — RESEARCH & SPECIAL HANDLING (P1-16/P1-17/P1-18): routes into the
// EXISTING research-needed architecture, SaleClientDecision KEEP/SELL/REVIEW, and
// Chapter 11 WHO CAN HELP? No second research queue, no second provider directory.
const WHO_CAN_HELP = [
  { label: 'Appraiser', category: 'appraisal' },
  { label: 'Cleanout', category: 'cleanout' },
  { label: 'Realtor', category: 'real_estate' },
  { label: 'Senior move manager', category: 'senior_move' },
  { label: 'Donation', category: 'donation' },
  { label: 'Specialist (jewelry / art / collectibles)', category: 'collectibles_specialty' },
];

export default function ResearchHandlingSection({ deal, linkedSaleId, consult, researchItems }) {
  const researchRooms = (consult.rooms || []).filter(r => r.research_needed);
  const state = deal?.property_state || '';

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Research needed</p>
        {researchRooms.length > 0 ? (
          researchRooms.map(r => (
            <div key={r.room_id} className="border border-amber-200 bg-amber-50 rounded-lg p-2.5">
              <p className="text-xs font-medium text-slate-800">{r.name}</p>
              {r.research_note && <p className="text-[11px] text-slate-600">{r.research_note}</p>}
              <p className="text-[10px] text-slate-400 mt-0.5">Consultation observation — preserved here until a formal item exists. Nothing is auto-inventoried.</p>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500">No research flagged in the walkthrough yet. Flag unfamiliar or possibly important merchandise on its room card.</p>
        )}
        {researchItems.length > 0 && (
          <div className="pt-1">
            <p className="text-xs font-medium text-slate-600">Inventoried items flagged for research</p>
            {researchItems.slice(0, 8).map(i => (
              <p key={i.id} className="text-xs text-slate-600">• {i.title}{i.research_reason ? ` — ${i.research_reason}` : ''} <Badge variant="outline" className="text-[9px] ml-1">{i.research_status}</Badge></p>
            ))}
            {researchItems.length > 8 && <p className="text-[10px] text-slate-400">+{researchItems.length - 8} more</p>}
            {linkedSaleId && <Link to={`/SaleInventory?saleId=${linkedSaleId}`} className="text-xs text-cyan-600 hover:underline">Open the existing research workflow →</Link>}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Special handling</p>
        <p className="text-[10px] text-slate-400">Route decisions into the existing systems — nothing is duplicated here.</p>
        <div className="flex flex-col gap-2">
          {linkedSaleId ? (
            <Link to={`/SaleClientDecisions?saleId=${linkedSaleId}`} className="min-h-[44px] flex items-center justify-between border border-slate-200 rounded-lg px-3 text-xs text-slate-700">
              KEEP / SELL / REVIEW — family merchandise decisions <span className="text-cyan-600">→</span>
            </Link>
          ) : (
            <p className="text-xs text-slate-500">Merchandise decisions (KEEP / SELL / REVIEW) live on the linked sale's client decisions — link or create the sale first.</p>
          )}
          <p className="text-xs text-slate-500">Exclude from sale / family decision / alternative selling method — record on the deal notes and the sale's decisions when the sale exists.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Who Can Help? (Chapter 11 professional network)</p>
        <p className="text-[10px] text-slate-400">Launch the existing professional search from this consultation need.</p>
        <div className="grid grid-cols-2 gap-2">
          {WHO_CAN_HELP.map(w => (
            <Link key={w.category} to={`/ProfessionalNetwork?category=${w.category}${state ? `&state=${state}` : ''}`}
              className="min-h-[44px] flex items-center justify-center border border-slate-200 rounded-lg text-xs text-slate-700 bg-slate-50">
              {w.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}