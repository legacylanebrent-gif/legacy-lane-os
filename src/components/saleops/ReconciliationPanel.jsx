import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Scale, AlertTriangle, CheckCircle2, MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';
import { money, reconciliationView, settlementReadiness } from './saleEconomicsModel';

// Chapter 23 P1 — RECONCILIATION VIEW: recorded merchandise sales vs payment
// truth, by method, with refunds, payment exceptions, and cash truth. The
// difference is displayed honestly — never auto-balanced, never zeroed. An
// explanation is preserved as a RESOLVED payment SaleIssue (who/when/why kept).

const RECON_LABEL = 'reconciliation-difference-explained';

export default function ReconciliationPanel({ sale, items, orders, refunds, attempts, issues, cashSessions, onChanged }) {
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [busy, setBusy] = useState(false);

  const recon = useMemo(() => reconciliationView({ items, orders, refunds }), [items, orders, refunds]);
  const explained = useMemo(
    () => (issues || []).some(i => i.source_label === RECON_LABEL && i.status === 'RESOLVED'),
    [issues]
  );
  const readiness = useMemo(
    () => settlementReadiness({ attempts, issues, cashSessions, refunds, reconciliationDifference: recon.difference, differenceExplained: explained }),
    [attempts, issues, cashSessions, refunds, recon.difference, explained]
  );

  const recordExplanation = async () => {
    if (!explanation.trim()) { toast.error('Write what explains the difference'); return; }
    setBusy(true);
    try {
      const me = await base44.auth.me();
      const note = explanation.trim();
      await base44.entities.SaleIssue.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        sale_team_ids: sale.sale_team || [],
        title: `Reconciliation difference explained — ${money(Math.abs(recon.difference))}`,
        description: `Recorded merchandise sales (net of refunds) ${money(recon.recordedNet)} vs payment truth ${money(recon.paymentTruth)} = difference ${money(recon.difference)}.\n\nExplanation: ${note}`,
        category: 'payment',
        urgency: 'ROUTINE',
        status: 'RESOLVED',
        resolution: note,
        resolution_source: 'answer_only',
        resolved_at: new Date().toISOString(),
        source_type: 'MANUAL',
        source_label: RECON_LABEL,
      });
      toast.success('Explanation recorded — the difference stays visible with its cause');
      setExplaining(false);
      setExplanation('');
      onChanged && onChanged();
    } catch (e) {
      toast.error('Could not record the explanation');
    } finally {
      setBusy(false);
    }
  };

  const row = (label, value, cls = 'text-slate-800') => (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${cls}`}>{value}</span>
    </div>
  );

  return (
    <Card className={readiness.ready ? 'border-emerald-200' : 'border-amber-300'}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <Scale className="w-4 h-4 text-slate-600" /> Reconciliation
          <Badge variant="outline" className={recon.reconciled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>
            {recon.reconciled ? 'RECONCILED' : explained ? 'DIFFERENCE — EXPLAINED' : 'DIFFERENCE — UNEXPLAINED'}
          </Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">
          Recorded merchandise sales vs payment truth (canonical paid Orders). A difference is not a failure — an unexplained one is. Never auto-balanced.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {row('Recorded merchandise sales (gross)', money(recon.recordedGross))}
        {row('Completed refunds', `− ${money(recon.refundsTotal)}`, 'text-cyan-700')}
        {row('Recorded net merchandise proceeds', money(recon.recordedNet), 'text-slate-900')}
        <div className="pt-1 border-t border-slate-100 space-y-2">
          {row('Cash payment truth', money(recon.byMethod.cash || 0))}
          {row('Card / online payment truth', money(recon.byMethod.card || 0))}
          {row('Other payment truth', money(recon.byMethod.other || 0))}
          {row('Payment truth total (paid Orders)', money(recon.paymentTruth))}
        </div>
        <div className="pt-1 border-t border-slate-100">
          {row(
            'Reconciliation difference (recorded − payments)',
            money(recon.difference),
            recon.reconciled ? 'text-emerald-700' : 'text-amber-700'
          )}
          {row('Status', recon.reconciled ? 'RECONCILED' : (explained ? 'EXPLAINED — difference remains visible' : 'UNEXPLAINED — review required'),
            recon.reconciled ? 'text-emerald-700' : 'text-amber-700')}
        </div>

        {readiness.blockers.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded p-2.5 space-y-1">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Settlement blockers ({readiness.blockers.length})
            </p>
            {readiness.blockers.map((b, i) => (
              <p key={i} className="text-[11px] text-amber-800">· {b}</p>
            ))}
          </div>
        )}
        {readiness.ready && (
          <p className="text-xs text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for settlement review — no unresolved payment truth.
          </p>
        )}

        {!recon.reconciled && !explained && !explaining && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setExplaining(true)}>
            <MessageSquarePlus className="w-3 h-3 mr-1" /> Record explanation for the difference
          </Button>
        )}
        {explaining && (
          <div className="space-y-1.5">
            <Input
              placeholder="What explains the difference (timing, cash sale without Order, recorded correction…)"
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              className="text-xs"
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={recordExplanation}>Save explanation</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExplaining(false)}>Cancel</Button>
            </div>
            <p className="text-[10px] text-slate-400">The difference stays visible; only its explanation is recorded (who, when, why).</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}