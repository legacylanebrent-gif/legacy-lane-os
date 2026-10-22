import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, CheckCircle2, AlertTriangle } from 'lucide-react';

// Chapter 23 P1 — CLOSING FILE INDEX: an assembled VIEW of the canonical records
// a completed project needs at close. Links only — records are never duplicated
// here. Each line resolves to its canonical home.

export default function ClosingFileCard({ sale, deal, econ, readiness, accessCloseout }) {
  const rows = [
    { label: 'Accepted commercial terms', href: `/SaleConversionPipeline?dealId=${deal?.id}`, ready: !!deal?.commercial_terms_accepted_at || !!(deal?.accepted_terms_snapshot?.commission_rate != null), note: deal ? (econ?.terms?.source === 'ACCEPTED_TERMS' ? 'accepted snapshot preserved' : 'no acceptance recorded') : 'no linked deal' },
    { label: 'Settlement statement', href: deal ? `/SettlementStatement?dealId=${deal.id}` : '/SaleConversionPipeline', ready: !!deal?.settlement_finalized, note: deal?.settlement_finalized ? `finalized ${deal.settlement_finalized_date || ''}` : 'not finalized' },
    { label: 'Client payments', ready: !deal || (deal.total_paid_to_client || 0) >= (econ?.netDueToClient || 0) - 0.005, note: deal ? `paid $${(deal.total_paid_to_client || 0).toLocaleString()} of $${(econ?.netDueToClient || 0).toLocaleString()} due` : 'no deal record' },
    { label: 'Project expenses', href: `/SaleCloseout?saleId=${sale.id}`, ready: !!econ, note: econ ? `${econ.expenses ? 'direct costs recorded' : ''}` : '' },
    { label: 'Reconciliation', href: deal ? `/SettlementStatement?dealId=${deal.id}` : null, ready: readiness?.ready, note: readiness?.ready ? 'payment truth resolved' : `${readiness?.blockers?.length || 0} blocker(s)` },
    { label: 'Transition completion', href: `/TransitionCompletion?saleId=${sale.id}`, ready: !!sale?.transition?.transition_completed_at, note: sale?.transition?.transition_completed_at ? 'transition complete' : 'transition open' },
    { label: 'Disposition / walkthrough records', href: `/TransitionCompletion?saleId=${sale.id}`, ready: !!sale?.transition?.walkthrough?.completed_at, note: sale?.transition?.walkthrough?.completed_at ? 'final walkthrough recorded' : 'walkthrough open' },
    { label: 'Post-sale review & lessons', href: `/SaleCloseout?saleId=${sale.id}`, ready: null, note: 'owner reflection on the closeout page' },
    { label: 'Access closeout (keys / devices)', ready: !!accessCloseout?.status && accessCloseout.status !== 'UNRESOLVED', note: accessCloseout?.status ? `${accessCloseout.status.toLowerCase().replace('_', ' ')}${accessCloseout.note ? ` — ${accessCloseout.note}` : ''}` : 'not yet confirmed' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-slate-600" /> Closing File
        </CardTitle>
        <p className="text-xs text-slate-500">Assembled index of the canonical records — links only, nothing is duplicated.</p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-x-6">
          {rows.map(r => {
            const content = (
              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-700 min-w-0 truncate">{r.label}</span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-[180px]">{r.note}</span>
                  {r.ready === true && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {r.ready === false && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                  {r.ready == null && <Badge variant="outline" className="text-[9px] h-4">VIEW</Badge>}
                </span>
              </div>
            );
            return r.href ? <Link key={r.label} to={r.href} className="hover:bg-slate-50 rounded px-1">{content}</Link> : <div key={r.label}>{content}</div>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}