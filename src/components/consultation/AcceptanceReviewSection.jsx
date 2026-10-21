import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { projectedDealEconomics } from '@/components/saleops/saleEconomicsModel';
import { calendarOverlap, advisoryInputs, conservativeScenario, DEFAULT_SCENARIO, acceptanceReview, consultationAdvisory } from '@/components/saleops/acceptanceReviewModel';
import { uid } from '@/components/consultation/consultationModel';

// Chapter 12 P1 — SALE ACCEPTANCE REVIEW (P1-28/P1-29/P1-30): the canonical
// deterministic scorecard (NO numeric score — evidence-based classifications with
// written reasons), expanded ONLY to consume the new consultation evidence as
// ADVISORY reasons. It never decides; the operator does.
const RATING_TONES = {
  STRONG: 'bg-green-100 text-green-700 border-green-300',
  ACCEPTABLE: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  MARGINAL: 'bg-amber-100 text-amber-700 border-amber-300',
  'HIGH RISK': 'bg-red-100 text-red-700 border-red-300',
  'NEEDS INPUTS': 'bg-slate-100 text-slate-600 border-slate-300',
};

export default function AcceptanceReviewSection({ deal, allDeals, linkedSale, authority, unresolvedResearchCount, consult, saveConsult }) {
  const review = useMemo(() => {
    const base = projectedDealEconomics(deal);
    const scenarioResult = conservativeScenario(deal, base, DEFAULT_SCENARIO);
    const overlap = calendarOverlap(deal, allDeals);
    const advisory = advisoryInputs(deal, linkedSale);
    const r = acceptanceReview({ base, scenarioResult, overlap, advisory });
    return { ...r, reasons: [...r.reasons, ...consultationAdvisory({ deal, authority, unresolvedResearchCount })] };
  }, [deal, allDeals, linkedSale, authority, unresolvedResearchCount]);

  const conditions = consult.acceptance_conditions || [];
  const [form, setForm] = useState({ condition: '', due_date: '', note: '' });

  const addCondition = () => {
    if (!form.condition.trim()) return;
    saveConsult({ acceptance_conditions: [...conditions, { condition_id: uid(), condition: form.condition.trim(), due_date: form.due_date || '', note: form.note.trim(), status: 'open' }] });
    setForm({ condition: '', due_date: '', note: '' });
  };
  const resolveCondition = (id) => saveConsult({
    acceptance_conditions: conditions.map(c => (c.condition_id === id ? { ...c, status: 'resolved', resolved_at: new Date().toISOString() } : c)),
  });
  const delCondition = (id) => saveConsult({ acceptance_conditions: conditions.filter(c => c.condition_id !== id) });
  const open = conditions.filter(c => (c.status || 'open') !== 'resolved');

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-cyan-600" /> Sale Acceptance Review</p>
          <Badge className={RATING_TONES[review.rating]}>{review.rating}</Badge>
        </div>
        <p className="text-[10px] text-slate-400">
          Deterministic from canonical records — no numeric score. This is ADVISORY EVIDENCE for YOUR decision: it explains what the
          evidence says and never accepts or declines for you.
        </p>
        <ul className="space-y-1.5">
          {review.reasons.map((r, i) => <li key={i} className="text-xs text-slate-700 flex gap-1.5"><span className="text-cyan-600">•</span>{r}</li>)}
        </ul>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Acceptance conditions</p>
        <p className="text-[10px] text-slate-400">"The project works IF…" — explicit conditions. They flow into the proposal handoff; they never auto-accept or auto-decline anything.</p>
        {conditions.map(c => (
          <div key={c.condition_id} className={`flex items-start justify-between gap-2 border rounded-lg p-2.5 ${c.status === 'resolved' ? 'border-slate-100 bg-slate-50 opacity-75' : 'border-amber-200 bg-amber-50'}`}>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-800">{c.condition}{c.due_date ? ` (by ${c.due_date})` : ''}</p>
              {c.note && <p className="text-[11px] text-slate-500">{c.note}</p>}
              {c.status === 'resolved' && <p className="text-[10px] text-green-600">RESOLVED {c.resolved_at ? new Date(c.resolved_at).toLocaleDateString() : ''}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              {c.status !== 'resolved' && (
                <button onClick={() => resolveCondition(c.condition_id)} className="w-9 h-9 flex items-center justify-center text-green-600 hover:bg-green-50 rounded-full" aria-label="Resolve condition"><CheckCircle2 className="w-4 h-4" /></button>
              )}
              <button onClick={() => delCondition(c.condition_id)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500" aria-label="Remove condition"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <Input value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))} placeholder="e.g. Garage must be cleared by [date]" className="h-11 text-base" />
          <div className="flex gap-2">
            <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} className="h-11 text-base" />
            <Button onClick={addCondition} disabled={!form.condition.trim()} className="h-11 px-4 bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4" /></Button>
          </div>
          <Input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Note (optional)" className="h-11 text-base" />
        </div>
        {open.length > 0 && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">{open.length} OPEN CONDITION{open.length > 1 ? 'S' : ''}</Badge>
        )}
      </div>
    </div>
  );
}