// Chapter 20 P1-25..P1-26 — CHECKOUT pulse in the live view: today's orders
// from canonical money records, payment-unknown warnings (never "paid"), and
// current discount-stage GUIDANCE. The system never applies a discount.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { currentDiscountStage } from './liveSaleModel';

export default function CheckoutCard({ sale, ordersToday }) {
  const orders = ordersToday || [];
  const paid = orders.filter((o) => o.status === 'paid');
  const unknown = orders.filter((o) => o.status === 'pending_payment' || o.status === 'processing');
  const gross = paid.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const byMethod = {};
  for (const o of paid) byMethod[o.payment_method || 'unknown'] = (byMethod[o.payment_method || 'unknown'] || 0) + 1;
  const stage = currentDiscountStage(sale);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-700" /> Checkout & Money Today
        </CardTitle>
        <p className="text-xs text-slate-500">EXACT — from canonical Order records created today for this sale.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-slate-200 rounded p-2">
            <p className="text-[10px] text-slate-500">GROSS SALES (paid) <Badge variant="outline" className="ml-1 text-[9px]">EXACT</Badge></p>
            <p className="text-xl font-bold text-slate-900">${gross.toLocaleString()}</p>
          </div>
          <div className="border border-slate-200 rounded p-2">
            <p className="text-[10px] text-slate-500">TRANSACTIONS (paid) <Badge variant="outline" className="ml-1 text-[9px]">EXACT</Badge></p>
            <p className="text-xl font-bold text-slate-900">{paid.length}</p>
            <p className="text-[10px] text-slate-400">{Object.entries(byMethod).map(([m, n]) => `${m}: ${n}`).join(' · ') || '—'}</p>
          </div>
        </div>

        {unknown.length > 0 && (
          <div className="p-2 rounded bg-amber-50 border border-amber-200 space-y-1">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />{unknown.length} transaction(s) with payment NOT confirmed
            </p>
            {unknown.map((o) => (
              <p key={o.id} className="text-[10px] text-amber-800">
                {o.order_number} — ${Number(o.total).toLocaleString()} ({o.status}). Not paid ≠ paid: do NOT release merchandise on it; raise a payment issue.
              </p>
            ))}
          </div>
        )}

        <div className="border border-slate-200 rounded p-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Checkout discount guidance — you apply the discount, the system never changes prices</p>
          {stage.hasSchedule ? (
            <p className="text-xs text-slate-700 mt-0.5">
              {stage.active
                ? `Current stage: ${stage.active.name}${stage.active.discount_percent ? ` — ${stage.active.discount_percent}% off guidance` : ''}${stage.active.note ? ` (${stage.active.note})` : ''}`
                : 'The first stage has not started yet — full asking prices apply.'}
              {stage.next ? ` Next stage: ${stage.next.name}${stage.next.start_at ? ` at ${new Date(stage.next.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}.` : ''}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">No discount schedule recorded for this sale.</p>
          )}
          <p className="text-[10px] text-slate-500 mt-1">Items marked excluded-from-discounts must never be discounted without an explicit authorized price change.</p>
        </div>
      </CardContent>
    </Card>
  );
}