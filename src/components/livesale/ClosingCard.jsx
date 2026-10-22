// Chapter 20 P1-56..P1-63 — CLOSING: closing + end-of-day reset checklists
// (SaleTask reuse, day-scoped), unresolved-offer review, awaiting pickups,
// open issues carry-over, team debrief (pinned SaleNote), and next-day
// discount guidance. Day 1 closing NEVER closes the project; nothing is
// copied to tomorrow — current truth IS tomorrow's truth.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, CheckCircle2, MoonStar } from 'lucide-react';
import { toast } from 'sonner';
import { CLOSING_CHECKLIST, EOD_RESET_CHECKLIST, checklistPrefix, inChecklist, nextDiscountStage, offersOnAvailableItems } from './liveSaleModel';

export default function ClosingCard({ sale, items, offers, issues, tasks, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [debrief, setDebrief] = useState('');

  const closeTasks = inChecklist(tasks, 'Closing');
  const resetTasks = inChecklist(tasks, 'End-of-day reset');
  const openIssues = (issues || []).filter((i) => ['OPEN', 'WAITING'].includes(i.status || 'OPEN'));
  const followUps = offersOnAvailableItems(items, offers || []).filter((o) => o.status === 'accepted' || o.status === 'rejected').slice(0, 8);
  const awaiting = (items || []).filter((i) => i.status === 'sold' && !i.pickup_completed_at);
  const nextStage = nextDiscountStage(sale);

  const generate = async (kind, list) => {
    setBusy(true);
    try {
      if (inChecklist(tasks, kind).length > 0) { toast.info('That checklist already exists for today.'); return; }
      await base44.entities.SaleTask.bulkCreate(list.map((name) => ({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        sale_team_ids: sale.sale_team || [],
        name: `${checklistPrefix(kind)} ${name}`,
        category: 'Post-Sale',
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
      toast.error('Could not update the check');
    } finally {
      setBusy(false);
    }
  };

  const saveDebrief = async () => {
    if (!debrief.trim()) { toast.error('Write what worked / what to change first'); return; }
    setBusy(true);
    try {
      await base44.entities.SaleNote.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        sale_team_ids: sale.sale_team || [],
        note: `[Day debrief — ${new Date().toLocaleDateString()}] ${debrief.trim()}`,
        pinned: true,
      });
      setDebrief('');
      toast.success('Debrief note saved (pinned)');
      onChanged && onChanged();
    } catch (e) {
      toast.error('Could not save the debrief');
    } finally {
      setBusy(false);
    }
  };

  const renderChecks = (kind, list, source) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">{kind === 'Closing' ? 'Closing checklist' : 'End-of-day reset checklist'}</p>
        {source.length === 0 ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => generate(kind, kind === 'Closing' ? CLOSING_CHECKLIST : EOD_RESET_CHECKLIST)}>
            {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}Create for today
          </Button>
        ) : (
          <Badge variant="outline" className="text-[10px]">{source.filter((t) => t.status === 'completed').length}/{source.length} done</Badge>
        )}
      </div>
      {source.map((t) => (
        <button key={t.id} onClick={() => toggleTask(t)} disabled={busy}
          className="w-full flex items-start gap-2 text-left text-xs p-1.5 rounded hover:bg-slate-50">
          <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${t.status === 'completed' ? 'text-emerald-600' : 'text-slate-300'}`} />
          <span className={t.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}>
            {t.name.replace(checklistPrefix(kind), '').trim()}
          </span>
        </button>
      ))}
      <p className="text-[10px] text-slate-400">Physical items (doors, windows, rooms) are HUMAN confirmations — EstateSalen does not claim to verify locks electronically.</p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MoonStar className="w-5 h-5 text-indigo-600" /> Closing & Tomorrow
        </CardTitle>
        <p className="text-xs text-slate-500">The end of today's session is preparation for the next opening. Nothing is copied — open work simply persists.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-slate-200 rounded p-2">
            <p className="text-[10px] text-slate-500">AWAITING PICKUP</p>
            <p className="text-lg font-bold text-slate-900">{awaiting.length}</p>
          </div>
          <div className="border border-slate-200 rounded p-2">
            <p className="text-[10px] text-slate-500">OPEN ISSUES (carry over)</p>
            <p className="text-lg font-bold text-slate-900">{openIssues.length}</p>
          </div>
          <div className="border border-slate-200 rounded p-2">
            <p className="text-[10px] text-slate-500">OFFERS ON AVAILABLE ITEMS</p>
            <p className="text-lg font-bold text-slate-900">{followUps.length}</p>
          </div>
        </div>

        {followUps.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded p-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Unresolved offer review — you decide whether to act</p>
            {followUps.map((o) => (
              <p key={o.id} className="text-xs text-amber-900">
                ${Number(o.offer_amount).toLocaleString()} on {(items || []).find((i) => i.id === o.item_id)?.title || o.item_name} — {o.status} ({o.full_name})
              </p>
            ))}
          </div>
        )}

        {nextStage && (
          <div className="border border-slate-200 rounded p-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Next-day discount guidance</p>
            <p className="text-xs text-slate-700">
              Next approved stage: {nextStage.name}{nextStage.discount_percent ? ` (${nextStage.discount_percent}% off guidance)` : ''}.
              Applying it is an AUTHORIZED HUMAN price change through the normal path — the system never changes prices automatically.
            </p>
          </div>
        )}

        {renderChecks('Closing', CLOSING_CHECKLIST, closeTasks)}
        {renderChecks('End-of-day reset', EOD_RESET_CHECKLIST, resetTasks)}

        <div className="border border-slate-200 rounded p-2 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Team debrief — what worked / what changed / what to change tomorrow</p>
          <Textarea rows={2} value={debrief} onChange={(e) => setDebrief(e.target.value)}
            placeholder="e.g. checkout line built up at 10am; moved a second register tomorrow; jewelry table needs a staffer at open" />
          <Button size="sm" variant="outline" disabled={busy} onClick={saveDebrief}>Save debrief note (pinned)</Button>
        </div>
      </CardContent>
    </Card>
  );
}