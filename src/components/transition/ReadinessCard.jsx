// Chapter 22 P1 — COMPLETION READINESS: the derived open-obligation answer to
// WHAT STILL PREVENTS THIS PROJECT FROM BEING FINISHED, plus the human
// completion approval. TRANSITION COMPLETE is not a button that makes the
// project finished — it is a conclusion the system becomes willing to support
// after required obligations have endings.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Loader2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';

export default function ReadinessCard({ sale, blockers, states, deadlineRiskNote, additionalWork, onChanged }) {
  const [busy, setBusy] = useState(false);
  const ready = blockers.length === 0;

  const approve = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('approveTransitionCompletion', { sale_id: sale.id, approval_note: 'Human completion approval from Transition Completion.' });
      if (res?.data?.ready) {
        toast.success('Transition completion approved — human approval recorded.');
        onChanged && onChanged();
      }
    } catch (e) {
      const bl = e?.response?.data?.blockers;
      toast.error(e?.response?.data?.error || (bl ? `Not ready — ${bl.length} open obligation(s)` : e.message));
    } finally { setBusy(false); }
  };

  return (
    <Card className={ready ? 'border-green-300' : 'border-red-300'}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={states.saleComplete ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}>{states.saleComplete ? 'SALE COMPLETE' : 'SALE EVENT OPEN'}</Badge>
          <Badge className={states.financiallyComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>{states.financiallyComplete ? 'FINANCIALLY COMPLETE' : 'SETTLEMENT OPEN'}</Badge>
          <Badge className={states.transitionComplete ? 'bg-green-600 text-white' : 'bg-blue-100 text-blue-700'}>{states.transitionComplete ? 'TRANSITION COMPLETE' : 'TRANSITION OPEN'}</Badge>
        </div>
        <p className="text-xs text-slate-500">SALE COMPLETE ≠ TRANSITION COMPLETE. The sale event, financial settlement, and property transition are distinct endings.</p>
        {states.transitionComplete && (
          <p className="text-sm text-green-700">Transition completion approved by {sale.transition?.completed_by_name || 'the operator'} on {new Date(sale.transition.transition_completed_at).toLocaleString()}.</p>
        )}
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            {ready ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
            {ready ? 'READY FOR HUMAN COMPLETION APPROVAL' : 'NOT READY'}
          </h3>
          {blockers.length > 0 && (
            <ul className="mt-2 space-y-1">
              {blockers.map((b, i) => <li key={i} className="text-sm text-red-700 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{b}</li>)}
            </ul>
          )}
          {ready && !states.transitionComplete && (
            <p className="text-sm text-slate-600 mt-1">All required obligations have endings. Human completion approval remains final.</p>
          )}
        </div>
        {deadlineRiskNote && <p className="text-sm text-red-700 font-medium">{deadlineRiskNote}</p>}
        {additionalWork.length > 0 && (
          <div className="border-t pt-2">
            <h4 className="text-sm font-semibold text-slate-800">Additional work — review against accepted scope</h4>
            <p className="text-xs text-slate-500">Post-sale work requests. Scope creep should become visible before it becomes free labor — confirm authorization before absorbing labor.</p>
            {additionalWork.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-1">
                <Badge className="bg-amber-100 text-amber-700">OUTSIDE ORIGINAL SCOPE?</Badge>
                <span className="text-sm text-slate-700 truncate">{t.name}</span>
              </div>
            ))}
          </div>
        )}
        {!states.transitionComplete && (
          <Button disabled={!ready || busy} onClick={approve} className="bg-green-600 hover:bg-green-700">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ListChecks className="w-4 h-4 mr-2" />}
            Approve transition completion
          </Button>
        )}
      </CardContent>
    </Card>
  );
}