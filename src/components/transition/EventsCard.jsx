// Chapter 22 P1 — DONATION / CLEANOUT / BUYOUT event truth for this sale,
// canonically linked by sale_id. Scope management and completion run through
// the sanctioned backend paths (setTransitionEventScope, completeTransitionEvent).
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EventScopeDialog from './EventScopeDialog';
import EventCompleteDialog from './EventCompleteDialog';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600', published: 'bg-blue-100 text-blue-700', responses_closed: 'bg-amber-100 text-amber-700',
  bidding_closed: 'bg-amber-100 text-amber-700', awarded: 'bg-indigo-100 text-indigo-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-slate-200 text-slate-500',
};

export default function EventsCard({ sale, saleId, donations, cleanouts, items, decisions, onChanged }) {
  const [scopeDlg, setScopeDlg] = useState(null); // { mode, event }
  const [completeDlg, setCompleteDlg] = useState(null); // { mode, event }
  const [busy, setBusy] = useState(false);
  const award = sale.transition?.buyout_award;

  const transferBuyout = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke('completeTransitionEvent', { event_type: 'buyout', sale_id: saleId });
      onChanged && onChanged();
    } catch (e) { alert(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900 mb-2">Donation</h3>
          {donations.length === 0 && <p className="text-sm text-slate-400">No donation record linked to this sale.</p>}
          {donations.map((d) => (
            <div key={d.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
              <div className="min-w-0">
                <p className="text-sm text-slate-800 truncate">{d.title}</p>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  <Badge className={STATUS_STYLES[d.status] || STATUS_STYLES.draft}>{d.status}</Badge>
                  <Badge variant="outline">load: {(d.included_item_ids || []).length}</Badge>
                  {(d.included_item_ids || []).length === 0 && <Badge variant="outline">no approved item load</Badge>}
                  <Badge variant="outline">acceptance: {d.acceptance_status || 'NOT_CHECKED'}</Badge>
                  {!d.authorization_decision_id && (d.included_item_ids || []).length > 0 && <Badge className="bg-red-100 text-red-700">no client authorization recorded</Badge>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => setScopeDlg({ mode: 'donation', event: d })}>Manage load</Button>
                {d.status !== 'completed' && d.status !== 'cancelled' && <Button size="sm" variant="outline" onClick={() => setCompleteDlg({ mode: 'donation', event: d })}>Complete</Button>}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t pt-3">
          <h3 className="font-semibold text-slate-900 mb-2">Cleanout</h3>
          {cleanouts.length === 0 && <p className="text-sm text-slate-400">No cleanout record linked to this sale.</p>}
          {cleanouts.map((c) => (
            <div key={c.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
              <div className="min-w-0">
                <p className="text-sm text-slate-800 truncate">{c.title}</p>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  <Badge className={STATUS_STYLES[c.status] || STATUS_STYLES.draft}>{c.status}</Badge>
                  <Badge variant="outline">scope: {(c.included_item_ids || []).length} · excluded: {(c.excluded_item_ids || []).length}</Badge>
                  <Badge variant="outline">confirmation: {c.confirmation_status || 'TENTATIVE'}</Badge>
                  {c.completion?.operator_verified ? <Badge className="bg-green-100 text-green-700">operator verified</Badge> : <Badge variant="outline">not operator-verified</Badge>}
                  {!c.authorization_decision_id && (c.included_item_ids || []).length > 0 && <Badge className="bg-red-100 text-red-700">no client authorization recorded</Badge>}
                  {c.provider_relationship && <Badge variant="outline">{c.provider_relationship.replace('_', ' ')}</Badge>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => setScopeDlg({ mode: 'cleanout', event: c })}>Manage scope</Button>
                {c.status !== 'completed' && c.status !== 'cancelled' && <Button size="sm" variant="outline" onClick={() => setCompleteDlg({ mode: 'cleanout', event: c })}>Complete</Button>}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t pt-3">
          <h3 className="font-semibold text-slate-900 mb-2">Buyout</h3>
          {!award ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-400">No buyout award recorded.</p>
              <Button size="sm" variant="outline" onClick={() => setScopeDlg({ mode: 'buyout', event: sale })}>Record buyout</Button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="text-sm text-slate-800">{award.buyer_name || 'Buyout'} — ${(Number(award.offer_amount) || 0).toLocaleString()}</p>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  <Badge variant="outline">included: {(award.included_item_ids || []).length} · excluded: {(award.excluded_item_ids || []).length}</Badge>
                  {award.transferred_at ? <Badge className="bg-green-100 text-green-700">transferred</Badge> : <Badge className="bg-amber-100 text-amber-700">not transferred</Badge>}
                  {award.authorized_by_name && <span className="text-xs text-slate-400">approved by {award.authorized_by_name}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => setScopeDlg({ mode: 'buyout', event: sale })}>Manage</Button>
                {!award.transferred_at && <Button size="sm" variant="outline" disabled={busy} onClick={transferBuyout}>Record transfer</Button>}
              </div>
            </div>
          )}
        </div>
        {scopeDlg && (
          <EventScopeDialog mode={scopeDlg.mode} event={scopeDlg.event} saleId={saleId} items={items} decisions={decisions}
            open={!!scopeDlg} onClose={() => setScopeDlg(null)} onChanged={() => onChanged && onChanged()} />
        )}
        {completeDlg && (
          <EventCompleteDialog mode={completeDlg.mode} event={completeDlg.event}
            open={!!completeDlg} onClose={() => setCompleteDlg(null)} onChanged={() => onChanged && onChanged()} />
        )}
      </CardContent>
    </Card>
  );
}

import { base44 } from '@/api/base44Client';