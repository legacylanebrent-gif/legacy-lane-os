import React from 'react';
import { LABOR_CATEGORIES, laborCategoryLabel, money } from '@/components/saleops/saleEconomicsModel';
import { calendarOverlap } from '@/components/saleops/acceptanceReviewModel';

// Chapter 12 P1 — LABOR & CAPACITY VISIBILITY (P1-21/P1-22/P1-23). Reads the
// canonical projected labor (deal.labor_estimates) — owner time stays separate from
// cash labor. CAPACITY VISIBILITY shows known signals only; it NEVER concludes
// "you have capacity" (no true capacity engine — that is deliberately LATER).
export default function LaborCapacitySection({ deal, allDeals }) {
  const rows = (deal.labor_estimates || []).filter(l => Number(l.hours) > 0);
  const cash = rows.filter(l => !l.is_owner_time);
  const owner = rows.filter(l => l.is_owner_time);
  const cashHours = cash.reduce((s, l) => s + Number(l.hours), 0);
  const cashCost = cash.reduce((s, l) => s + Number(l.hours) * Number(l.rate || 0), 0);
  const ownerHours = owner.reduce((s, l) => s + Number(l.hours), 0);
  const overlap = calendarOverlap(deal, allDeals);
  const activeCount = (allDeals || []).filter(d => d.id !== deal.id && ['new_lead', 'contacted', 'consultation_scheduled', 'contract_signed', 'setup_in_progress', 'sale_live'].includes(d.stage)).length;
  const prepHours = rows.filter(l => l.category === 'preparation').reduce((s, l) => s + Number(l.hours), 0);
  const saleDayHours = rows.filter(l => l.category === 'sale_day').reduce((s, l) => s + Number(l.hours), 0);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Projected labor (canonical Chapter 4 estimate)</p>
        {rows.length ? (
          <>
            {rows.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 last:border-0">
                <span className="text-xs text-slate-600">{laborCategoryLabel(l.category)}{l.is_owner_time ? ' · OWNER TIME' : ''}</span>
                <span className="text-xs font-medium text-slate-800">{Number(l.hours)} hrs{!l.is_owner_time && Number(l.rate) ? ` × ${money(l.rate)} = ${money(Number(l.hours) * Number(l.rate))}` : ''}</span>
              </div>
            ))}
            <div className="flex gap-2 pt-2 flex-wrap">
              <span className="text-[11px] bg-sky-50 border border-sky-200 rounded px-2 py-1 text-sky-700">Prep: {prepHours} hrs</span>
              <span className="text-[11px] bg-cyan-50 border border-cyan-200 rounded px-2 py-1 text-cyan-700">Sale day: {saleDayHours} hrs</span>
            </div>
            <p className="text-xs text-slate-700 pt-1">Cash labor: <strong>{cashHours} hrs · {money(cashCost)}</strong> — owner time reported separately: <strong>{ownerHours} hrs (never cash cost)</strong>.</p>
            <p className="text-[10px] text-slate-400">Edit hours on the Projected Economics section (the canonical calculator) — consultation observations inform YOUR estimate; nothing is invented.</p>
          </>
        ) : (
          <p className="text-xs text-slate-500">No projected labor yet — UNKNOWN, not zero. Enter hours in the Projected Economics section.</p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Capacity considerations (VISIBILITY)</p>
        {overlap.count != null ? (
          <>
            <p className="text-xs text-slate-700">{overlap.count === 0 ? 'No other active deals overlap this sale window.' : `${overlap.count} other active deal${overlap.count > 1 ? 's' : ''} overlap${overlap.count > 1 ? '' : 's'} this sale window:`}</p>
            {overlap.others.slice(0, 5).map(o => <p key={o.id} className="text-[11px] text-slate-500">• {o.client_name} ({o.estimated_sale_start_date}{o.estimated_sale_end_date ? ` – ${o.estimated_sale_end_date}` : ''})</p>)}
          </>
        ) : (
          <p className="text-xs text-slate-500">No estimated sale dates on this deal — calendar overlap is UNKNOWN.</p>
        )}
        <p className="text-xs text-slate-600">{activeCount} other active opportunit{activeCount === 1 ? 'y' : 'ies'} in your pipeline. Projected labor for this project: {cashHours + ownerHours} hrs (cash + owner).</p>
        <p className="text-[10px] text-slate-400 bg-slate-50 rounded p-2 border border-slate-100">
          This is CAPACITY VISIBILITY — known facts only. The system does NOT conclude "you have capacity"; that judgment is yours
          (a true capacity engine is deliberately a later chapter).
        </p>
      </div>
    </div>
  );
}