// Chapter 22 P1 — REMAINING MERCHANDISE: the deterministic no-anonymous-
// leftovers projection. Every remaining tracked item appears in exactly one
// bucket, with its next status, authority, and actions.
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { remainingBuckets, OUTCOME_LABELS, OUTCOME_STYLES, protectionPreview, changeImpact } from './transitionModel';
import ItemDispositionDialog from './ItemDispositionDialog';
import ReleasePickupDialog from '@/components/pickup/ReleasePickupDialog';

const BUCKET_META = [
  ['unrouted', 'Not yet routed', 'bg-slate-100 text-slate-600'],
  ['decisionNeeded', 'Decision needed', 'bg-red-100 text-red-700'],
  ['awaitingPickup', 'Buyer pickup outstanding', 'bg-orange-100 text-orange-700'],
  ['retained', 'Client / family retains', 'bg-emerald-100 text-emerald-700'],
  ['donation', 'Donation', 'bg-pink-100 text-pink-700'],
  ['cleanout', 'Cleanout', 'bg-cyan-100 text-cyan-700'],
  ['buyout', 'Buyout', 'bg-amber-100 text-amber-700'],
  ['specialist', 'Specialist', 'bg-purple-100 text-purple-700'],
  ['dispose', 'Dispose', 'bg-slate-200 text-slate-700'],
  ['resell', 'Resell', 'bg-blue-100 text-blue-700'],
  ['resolved', 'Resolved (ended)', 'bg-green-100 text-green-700'],
];

export default function RemainingMerchCard({ sale, items, decisions, donations, cleanouts, onChanged }) {
  const [dispItem, setDispItem] = useState(null);
  const [releaseItem, setReleaseItem] = useState(null);
  const buckets = remainingBuckets(items);
  const remaining = Object.entries(buckets).filter(([k]) => k !== 'resolved').flatMap(([, v]) => v);
  const award = sale.transition?.buyout_award;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold text-slate-900 mb-1">Remaining merchandise</h3>
        <p className="text-xs text-slate-500 mb-3">NOTHING IS LEFTOVER — every remaining tracked item has a next status. {remaining.length} remaining · {buckets.resolved.length} resolved.</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {BUCKET_META.map(([key, label, style]) => (
            <Badge key={key} className={style}>{label}: {buckets[key].length}</Badge>
          ))}
        </div>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {remaining.map((it) => {
            const d = it.post_sale_disposition || {};
            const impact = changeImpact(it, { donations, cleanouts, buyoutAward: award });
            return (
              <div key={it.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 truncate">{it.title} <span className="text-slate-400">· {it.status}</span></p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {d.outcome ? <Badge className={OUTCOME_STYLES[d.outcome]}>{OUTCOME_LABELS[d.outcome]}</Badge> : <Badge className="bg-red-50 text-red-600 border border-red-200">NOT YET ROUTED</Badge>}
                    {d.authorized_by_name && <span className="text-xs text-slate-400">authorized by {d.authorized_by_name}</span>}
                    {d.collector_name && <span className="text-xs text-slate-400">collector: {d.collector_name}</span>}
                    {impact.events.length > 0 && <span className="text-xs text-slate-400">· {impact.events.join(' · ')}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {(it.status === 'sold' && !it.pickup_completed_at) && (
                    <Button size="sm" variant="outline" onClick={() => setReleaseItem(it)}>Release</Button>
                  )}
                  {d.outcome === 'CLIENT_RETAINS' && (
                    <Button size="sm" variant="outline" onClick={() => setReleaseItem(it)}>Family pickup release</Button>
                  )}
                  {!protectionPreview(it) && (
                    <Button size="sm" variant="outline" onClick={() => setDispItem(it)}>{d.outcome ? 'Change' : 'Set disposition'}</Button>
                  )}
                </div>
              </div>
            );
          })}
          {remaining.length === 0 && <p className="text-sm text-slate-400">No remaining merchandise — every tracked item has an ending.</p>}
        </div>
        {dispItem && (
          <ItemDispositionDialog item={dispItem} decisions={decisions} open={!!dispItem}
            onClose={() => setDispItem(null)} onChanged={() => { setDispItem(null); onChanged && onChanged(); }} />
        )}
        {releaseItem && (
          <ReleasePickupDialog item={releaseItem} open={!!releaseItem}
            onClose={() => setReleaseItem(null)} onChanged={() => { setReleaseItem(null); onChanged && onChanged(); }} />
        )}
      </CardContent>
    </Card>
  );
}