// Chapter 20 P1-16..P1-19 + P1-52 — OFFERS in the live view: open offers,
// factual clusters (RECENT OFFER ACTIVITY — never "market value"), and
// follow-up offers on items still available. Contact eligibility stays
// separate from marketing consent (Chapter 18 doctrine).
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HandCoins } from 'lucide-react';
import { format } from 'date-fns';
import { offerClusters, offersOnAvailableItems } from './liveSaleModel';

export default function OffersCard({ items, offers }) {
  const list = offers || [];
  const open = list.filter((o) => o.status === 'pending');
  const clusters = offerClusters(items, list);
  const followUps = offersOnAvailableItems(items, list).slice(0, 12);
  const titleFor = (o) => {
    const it = (items || []).find((i) => i.id === o.item_id);
    return it ? it.title : o.item_name;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-orange-600" /> Offers
          <Badge variant="outline">{open.length} open</Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">Canonical Offer records — rejected offers are preserved history, never mutated.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {open.length === 0 && <p className="text-xs text-slate-400">No open offers right now.</p>}
          {open.slice(0, 8).map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-2 text-xs border border-slate-200 rounded p-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">${Number(o.offer_amount).toLocaleString()} — {titleFor(o)}</p>
                <p className="text-slate-500">{o.full_name}{o.created_date ? ` · ${format(new Date(o.created_date), 'h:mm a')}` : ''}</p>
              </div>
              <Badge variant="outline" className="text-[10px] flex-shrink-0">{o.status}</Badge>
            </div>
          ))}
        </div>

        {clusters.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Recent offer activity — independent offers, not a market value</p>
            {clusters.map((c) => (
              <div key={c.item_id} className="text-xs border border-cyan-200 bg-cyan-50 rounded p-2">
                <p className="font-medium text-slate-900">{c.item ? c.item.title : 'Item'} ({c.offers.length} offers)</p>
                <p className="text-cyan-900">{c.amounts.map((a) => `$${a.toLocaleString()}`).join(' · ')}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">The system surfaces the pattern; the human decides what to do about it.</p>
              </div>
            ))}
          </div>
        )}

        {followUps.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Offers on still-available items — follow-up review</p>
            {followUps.map((o) => (
              <p key={o.id} className="text-xs text-slate-700">
                ${Number(o.offer_amount).toLocaleString()} — {titleFor(o)} ({o.status}, {o.full_name})
              </p>
            ))}
            <p className="text-[10px] text-slate-500">
              Responding to an offer is operational contact. It is NEVER marketing consent — buyer marketing eligibility lives only where it was explicitly captured.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}