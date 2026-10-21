import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

// Chapter 8 P2 — RECEIPT (small extension of the existing Order truth; no new
// financial record, no refunds/voids). Everything renders from the Order that
// checkout already created. Print opens a plain receipt window.
export default function SaleReceipt({ order, companyName }) {
  if (!order) return null;
  const when = order.created_date ? new Date(order.created_date) : new Date();
  const items = order.items || [];
  const printReceipt = () => {
    const rows = items.map(it => (
      `<tr><td>${(it.item_title || '').replace(/</g, '&lt;')}</td><td style="text-align:center">${it.quantity || 1}</td><td style="text-align:right">$${(it.quantity * it.price).toFixed(2)}</td></tr>`
    )).join('');
    const html = `<!doctype html><html><head><title>Receipt ${order.order_number}</title><style>
      body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111;max-width:320px;margin:24px auto}
      h1{font-size:16px;margin:0 0 2px} .muted{color:#555} table{width:100%;border-collapse:collapse;margin-top:10px}
      td,th{padding:3px 0;border-bottom:1px solid #ddd;font-size:12px;text-align:left}
      .total{font-size:15px;font-weight:bold} hr{border:none;border-top:1px solid #222;margin:10px 0}
    </style></head><body>
      <h1>${(companyName || 'Estate Sale').replace(/</g, '&lt;')}</h1>
      <div class="muted">Receipt</div>
      <hr/>
      <div>Order: ${order.order_number}</div>
      <div>Date: ${when.toLocaleString()}</div>
      <div>Buyer: ${(order.buyer_name || 'Customer').replace(/</g, '&lt;')}</div>
      <div>Payment: ${order.payment_method || '—'}</div>
      <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="total" style="text-align:right;margin-top:8px">Total: $${(order.total || 0).toFixed(2)}</p>
      <hr/>
      <div class="muted">Please keep this receipt. Purchased items should be picked up during the sale per staff directions; hold this receipt for any pickup questions.</div>
      <script>window.onload = () => window.print();</script>
    </body></html>`;
    const w = window.open('', '_blank', 'width=380,height=640');
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div className="border border-slate-300 rounded-lg p-4 space-y-2 bg-slate-50">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">Receipt — {order.order_number}</p>
          <p className="text-xs text-slate-500">{when.toLocaleString()} · {order.payment_method} · ${ (order.total || 0).toFixed(2)}</p>
        </div>
        <Button size="sm" variant="outline" onClick={printReceipt}><Printer className="w-4 h-4 mr-1" />Print</Button>
      </div>
      <p className="text-xs text-slate-500">Derived from the completed order — no separate financial record is created.</p>
    </div>
  );
}