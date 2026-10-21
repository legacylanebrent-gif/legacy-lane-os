// Chapter 17 P1-3/P1-38 — CUSTOMER FLOW + OPENING READINESS card. Deterministic
// ONLY: verdicts assemble from canonical records (zones, Items, tasks, issues,
// labor, deal estimates). READY / READY WITH WARNINGS / NOT READY — BLOCKERS;
// no numeric score, no percentage, no AI determination.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Route, ClipboardList, ClipboardCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  openingReadiness, STAGING_WALKTHROUGH_TASKS, RECOVERY_TASKS,
  missingPriceItems, furnitureCompleteness, displayPriority, laborThreshold,
} from '@/components/staging/stagingModel';

const verdictTone = (v) => v === 'READY'
  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
  : v === 'READY WITH WARNINGS'
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200';

export default function StagingReadinessCard({ sale, zones = [], items = [], issues = [], tasks = [], laborEntries = [], linkedDeal, onChanged }) {
  const [flow, setFlow] = useState(sale?.customer_flow || {});
  const [savingFlow, setSavingFlow] = useState(false);
  const [adding, setAdding] = useState(null);

  const readiness = openingReadiness({ sale, zones, items, issues, tasks, laborEntries, deal: linkedDeal });
  const unpriced = missingPriceItems(items);
  const furnitureGaps = furnitureCompleteness(items);
  const highVisibility = items.filter(i => ['HIGH VISIBILITY', 'SECURE DISPLAY'].includes(displayPriority(i)));

  const saveFlow = async () => {
    setSavingFlow(true);
    try {
      await base44.entities.EstateSale.update(sale.id, { customer_flow: flow });
      if (onChanged) onChanged();
    } catch (e) { console.error('Customer flow save failed', e); } finally { setSavingFlow(false); }
  };

  // P1-4/P1-34 — deterministic walkthrough + P1-44 recovery template, through
  // the existing SaleTask system. Idempotent by task name.
  const addTasks = async (key, defs) => {
    setAdding(key);
    const existing = new Set(tasks.map(t => t.name));
    const toCreate = defs.filter(d => !existing.has(d.name)).map(d => ({
      sale_id: sale.id, operator_id: sale.operator_id, ...d, source_type: 'MANUAL',
    }));
    try {
      if (toCreate.length) await base44.entities.SaleTask.bulkCreate(toCreate);
      if (onChanged) onChanged();
    } catch (e) { console.error('Template tasks failed', e); } finally { setAdding(null); }
  };

  const FLOW_FIELDS = [
    { key: 'entry_note', label: 'Where customers enter' },
    { key: 'exit_note', label: 'Where customers exit / large items leave' },
    { key: 'checkout_location', label: 'Checkout location' },
    { key: 'queue_note', label: 'Where the line forms (and what it must not block)' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="w-5 h-5 text-cyan-700" /> Customer Flow & Opening Readiness
        </CardTitle>
        <p className="text-xs text-slate-500">
          Staging is friction removal: a first-time buyer should tell where to enter, shop, check out and leave. Verdicts are deterministic from records only — ready to open does not mean perfect.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* P1-3 — customer path */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {FLOW_FIELDS.map(f => (
            <label key={f.key} className="block">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">{f.label}</span>
              <Input value={flow[f.key] || ''} onChange={e => setFlow(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder="e.g. Front porch door" className="mt-1 text-xs h-8" />
            </label>
          ))}
        </div>
        <Button size="sm" onClick={saveFlow} disabled={savingFlow} className="bg-cyan-700 hover:bg-cyan-800 text-xs h-8">
          {savingFlow ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Save customer path
        </Button>

        {/* P1-38/P1-39 — opening readiness */}
        <div className={`border rounded-lg p-3 ${verdictTone(readiness.verdict)}`}>
          <div className="flex items-center gap-2 font-semibold text-sm">
            {readiness.verdict === 'READY' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            Opening readiness: {readiness.verdict}
          </div>
          {readiness.blockers.map((b, i) => <p key={i} className="text-xs mt-1.5 font-medium">BLOCKER — {b}</p>)}
          {readiness.warnings.map((w, i) => <p key={i} className="text-xs mt-1 opacity-80">Warning — {w}</p>)}
        </div>

        {/* P1-40 / P1-8 / P1-52 — deterministic staging checks */}
        <div className="space-y-1.5">
          {unpriced.length > 0 && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-2">
              <p className="text-xs font-semibold text-red-700">{unpriced.length} tracked item{unpriced.length === 1 ? '' : 's'} with no price:</p>
              <p className="text-xs text-red-600">{unpriced.slice(0, 5).map(i => i.title).join(' · ')}{unpriced.length > 5 ? ' …' : ''}</p>
            </div>
          )}
          {furnitureGaps.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-2">
              <p className="text-xs font-semibold text-amber-800">Furniture missing information ({furnitureGaps.length}):</p>
              <p className="text-xs text-amber-700">
                {furnitureGaps.slice(0, 5).map(f => `${f.title} (${f.missing.join(', ')})`).join(' · ')}{furnitureGaps.length > 5 ? ' …' : ''}
              </p>
            </div>
          )}
          {highVisibility.length > 0 && (
            <div className="border border-cyan-200 bg-cyan-50 rounded-lg p-2">
              <p className="text-xs font-semibold text-cyan-800">{highVisibility.length} item{highVisibility.length === 1 ? '' : 's'} needing high-visibility / secure display:</p>
              <p className="text-xs text-cyan-700">{highVisibility.slice(0, 5).map(i => `${i.title} (${displayPriority(i)})`).join(' · ')}{highVisibility.length > 5 ? ' …' : ''}</p>
            </div>
          )}
        </div>

        {/* P1-4/P1-34 walkthrough + P1-44 recovery template */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="text-xs h-8" disabled={adding === 'walk'} onClick={() => addTasks('walk', STAGING_WALKTHROUGH_TASKS)}>
            {adding === 'walk' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ClipboardList className="w-3 h-3 mr-1" />}Add staging walkthrough checklist
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-8" disabled={adding === 'rec'} onClick={() => addTasks('rec', RECOVERY_TASKS)}>
            {adding === 'rec' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ClipboardCheck className="w-3 h-3 mr-1" />}Add sale-day recovery tasks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}