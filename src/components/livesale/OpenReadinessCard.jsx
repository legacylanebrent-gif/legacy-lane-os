// Chapter 20 P1-3/P1-4 — deterministic OPENING READINESS + human-confirmed
// physical checklist. Blockers/warnings derive from canonical records (Ch17
// openingReadiness engine); the physical checklist is SaleTask reuse — a HUMAN
// confirms physical conditions, the software never claims to verify them.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, CheckCircle2, AlertTriangle, Ban, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { openingReadiness } from '@/components/staging/stagingModel';
import { OPENING_CHECKLIST, SECURITY_WALKTHROUGH, checklistPrefix, inChecklist } from './liveSaleModel';

export default function OpenReadinessCard({ sale, items, issues, tasks, coverageGaps, onChanged }) {
  const [busy, setBusy] = useState(false);

  const readiness = openingReadiness({
    sale, zones: sale.prep_zones || [], items, issues, tasks, laborEntries: [], deal: null,
  });

  // Chapter 20 digital extensions — all derived, none stored.
  const digital = [];
  const checkoutGap = (coverageGaps || []).find((g) => g.type === 'CHECKOUT');
  if ((sale.customer_flow || {}).checkout_location && checkoutGap) {
    digital.push({ level: 'BLOCKER', text: 'Checkout is set up but the CHECKOUT responsibility is UNASSIGNED.' });
  }
  if ((coverageGaps || []).filter((g) => g.type === 'HIGH_VALUE').length > 0) {
    digital.push({ level: 'WARNING', text: 'High-Value merchandise is in the sale but the HIGH VALUE watch responsibility is UNASSIGNED.' });
  }
  if (!(sale.entry_management || {}).mode) {
    digital.push({ level: 'WARNING', text: 'Entry procedure not decided yet (OPEN ENTRY vs CAPACITY CONTROLLED) — set it in the Entry & Client section.' });
  }
  const openTasksToday = (tasks || []).filter((t) => (t.blocking_areas || []).length === 0 && t.status !== 'completed' && t.due_date && t.due_date <= new Date().toISOString().slice(0, 10)).length;
  if (openTasksToday > 0) digital.push({ level: 'WARNING', text: `${openTasksToday} task(s) due today are not complete.` });

  const blockers = [...(readiness.blockers || []), ...digital.filter((d) => d.level === 'BLOCKER').map((d) => d.text)];
  const warnings = [...(readiness.warnings || []), ...digital.filter((d) => d.level === 'WARNING').map((d) => d.text)];

  const openTasks = inChecklist(tasks, 'Opening');
  const securityTasks = inChecklist(tasks, 'Security walkthrough');

  const generateChecklist = async (kind, list) => {
    setBusy(true);
    try {
      const prefix = checklistPrefix(kind);
      const existing = inChecklist(tasks, kind);
      if (existing.length > 0) { toast.info('Today\'s checklist already exists.'); return; }
      await base44.entities.SaleTask.bulkCreate(list.map((name) => ({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        sale_team_ids: sale.sale_team || [],
        name: `${prefix} ${name}`,
        category: 'Execution',
        status: 'not_started',
        source_type: 'ONBOARDING_TEMPLATE',
        source_label: `Chapter 20 ${kind.toLowerCase()} checklist`,
      })));
      toast.success(`${kind} checklist created for today`);
      onChanged && onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Could not create the checklist');
    } finally {
      setBusy(false);
    }
  };

  const toggleTask = async (t) => {
    setBusy(true);
    try {
      const done = t.status === 'completed';
      await base44.entities.SaleTask.update(t.id, done
        ? { status: 'not_started', completed_at: null }
        : { status: 'completed', completed_at: new Date().toISOString() });
      onChanged && onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Could not update the check');
    } finally {
      setBusy(false);
    }
  };

  const renderChecks = (list, kind, title) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">{title} — human confirmation</p>
        {list.length === 0 ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => generateChecklist(kind, kind === 'Opening' ? OPENING_CHECKLIST : SECURITY_WALKTHROUGH)}>
            {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}Create for today
          </Button>
        ) : (
          <Badge variant="outline" className="text-[10px]">{list.filter((t) => t.status === 'completed').length}/{list.length} confirmed</Badge>
        )}
      </div>
      {list.map((t) => (
        <button key={t.id} onClick={() => toggleTask(t)} disabled={busy}
          className="w-full flex items-start gap-2 text-left text-xs p-1.5 rounded hover:bg-slate-50">
          <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${t.status === 'completed' ? 'text-emerald-600' : 'text-slate-300'}`} />
          <span className={t.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}>
            {t.name.replace(checklistPrefix(kind), '').trim()}
            {t.completed_at && <span className="text-slate-400"> — confirmed {new Date(t.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-orange-600" /> Opening Readiness
          {blockers.length > 0 && <Badge className="bg-red-100 text-red-700 border border-red-300">{blockers.length} BLOCKER{blockers.length > 1 ? 'S' : ''}</Badge>}
        </CardTitle>
        <p className="text-xs text-slate-500">Deterministic from records — no score, no percentage. Physical checks are confirmed by a human, never by software.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {blockers.map((b, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded bg-red-50 border border-red-200">
              <Ban className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 font-medium">{b}</p>
            </div>
          ))}
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{w}</p>
            </div>
          ))}
          {blockers.length === 0 && warnings.length === 0 && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
              No digital blockers or warnings — complete the physical checks below before opening.
            </p>
          )}
        </div>
        {renderChecks(openTasks, 'Opening', 'Opening checklist')}
        {renderChecks(securityTasks, 'Security walkthrough', 'Security walkthrough')}
      </CardContent>
    </Card>
  );
}