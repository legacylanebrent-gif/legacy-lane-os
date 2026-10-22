// Chapter 21 P1 — SALE ORDERS (per-sale money truth) + TRANSACTION SEARCH:
// the operator can locate transactions by receipt/reference, buyer, amount,
// method, or date from canonical Order records (sale-scoped). Legacy pre-
// Chapter-21 orders without a sale link are intentionally not guessed here.
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Receipt } from 'lucide-react';
import TransactionEvidenceDialog from '@/components/saleops/TransactionEvidenceDialog';

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

export default function SaleOrdersPanel({ sale }) {
  const [orders, setOrders] = useState(null);
  const [refunds, setRefunds] = useState([]);
  const [query, setQuery] = useState('');
  const [evidenceOrder, setEvidenceOrder] = useState(null);

  const load = useCallback(async () => {
    try {
      const [ordersRes, refundsRes] = await Promise.all([
        base44.entities.Order.filter({ sale_id: sale.id }, { sort: '-created_date', limit: 200 }),
        base44.entities.SaleRefund.filter({ sale_id: sale.id }, '-created_date', 100),
      ]);
      setOrders(Array.isArray(ordersRes) ? ordersRes : ordersRes.items || []);
      setRefunds(Array.isArray(refundsRes) ? refundsRes : refundsRes.items || []);
    } catch (e) {
      console.error(e);
      setOrders([]);
    }
  }, [sale]);

  useEffect(() => { load(); }, [load]);

  const refundedFor = (orderId) => refunds.filter((r) => r.order_id === orderId && r.status !== 'CANCELLED').reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const q = query.trim().toLowerCase();
  const filtered = (orders || []).filter((o) => !q
    || (o.order_number || '').toLowerCase().includes(q)
    || (o.buyer_name || '').toLowerCase().includes(q)
    || String(o.total || '').includes(q)
    || (o.payment_method || '').toLowerCase().includes(q)
    || (o.created_date || '').toLowerCase().includes(q));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="w-5 h-5 text-indigo-600" /> Transactions
          <Badge variant="outline">{(orders || []).length}</Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">Sale-scoped orders — search by receipt, buyer, amount, method, or date.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search receipt #, buyer, amount, method, date…" />
        {orders === null ? (
          <p className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-400">No orders found for this sale yet.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {filtered.map((o) => {
              const refunded = refundedFor(o.id);
              return (
                <button key={o.id} onClick={() => setEvidenceOrder(o)}
                  className="w-full text-left border border-slate-200 rounded p-2 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900 truncate">{o.order_number}</p>
                    <p className="text-xs font-bold text-indigo-700">{money(o.total)}</p>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {o.created_date ? new Date(o.created_date).toLocaleString() : '—'} · {o.buyer_name || 'buyer —'} · {o.payment_method || '—'}
                    {o.provider_order_id ? ' · online' : ''}
                  </p>
                  {(o.status !== 'paid' || refunded > 0) && (
                    <p className="text-[10px]">
                      {o.status !== 'paid' && <span className="text-amber-700">status: {o.status} (not paid ≠ paid) </span>}
                      {refunded > 0 && <span className="text-red-700">refunded {money(refunded)}</span>}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {evidenceOrder && (
          <TransactionEvidenceDialog sale={sale} order={evidenceOrder} open={!!evidenceOrder}
            onClose={() => setEvidenceOrder(null)} onChanged={load} />
        )}
      </CardContent>
    </Card>
  );
}