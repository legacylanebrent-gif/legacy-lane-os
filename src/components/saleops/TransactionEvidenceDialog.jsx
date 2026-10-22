// Chapter 21 P1 — TRANSACTION EVIDENCE (dynamically assembled from canonical
// records — no duplicate snapshot): Order, merchandise custody, payment
// attempts with provider references, receipt, refunds, refund recording
// (operator-only, authority enforced at the backend write layer), and a
// printable evidence package for dispute/investigation. EstateSalen records
// refunds and exports evidence; it does not execute provider refunds or submit
// disputes to a processor.
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import SaleReceipt from '@/components/checkout/SaleReceipt';

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const releasedCount = (i) => ((i && i.releases) || []).reduce((s, r) => s + (Number(r.quantity) || 0), 0);

export default function TransactionEvidenceDialog({ sale, order, open, onClose, onChanged }) {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refundForm, setRefundForm] = useState({ amount: '', type: 'PARTIAL', method: 'cash', reason: '', provider_ref: '', status: 'RECORDED', item_consequence: '' });

  const refundedTotal = refunds.filter((r) => r.status !== 'CANCELLED').reduce((s, r) => s + (Number(r.amount) || 0), 0);

  useEffect(() => {
    if (!open || !order) return;
    setLoading(true);
    Promise.all([
      base44.auth.me().catch(() => null),
      Promise.all((order.items || []).map((ci) => base44.entities.Item.filter({ id: ci.item_id }).then((r) => r[0] || null).catch(() => null))),
      base44.entities.PaymentAttempt.filter({ order_id: order.id }, '-created_date', 20),
      base44.entities.SaleRefund.filter({ order_id: order.id }, '-created_date', 20),
    ]).then(([me, itemRows, attemptRes, refundRes]) => {
      setUser(me);
      setItems(itemRows.filter(Boolean));
      setAttempts(Array.isArray(attemptRes) ? attemptRes : attemptRes.items || []);
      setRefunds(Array.isArray(refundRes) ? refundRes : refundRes.items || []);
      setRefundForm((f) => ({ ...f, amount: String(Math.max(0, (Number(order.total) || 0) - refundedTotal).toFixed(2)) }));
    }).finally(() => setLoading(false));
  }, [open, order]);

  const canRefund = !!(user && (user.role === 'admin' || (sale && sale.operator_id === user.id)));

  const submitRefund = async () => {
    const amount = parseFloat(refundForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a refund amount'); return; }
    if (!refundForm.reason.trim()) { toast.error('A refund requires a reason'); return; }
    setBusy(true);
    try {
      const res = await base44.functions.invoke('saleRefund', {
        order_id: order.id,
        amount,
        refund_type: refundForm.type,
        refund_method: refundForm.method,
        reason: refundForm.reason.trim(),
        provider_ref: refundForm.provider_ref || undefined,
        status: refundForm.status,
        item_consequence: refundForm.item_consequence || undefined,
      });
      toast.success(res.data?.reminder || 'Refund recorded');
      setShowRefund(false);
      const refundRes = await base44.entities.SaleRefund.filter({ order_id: order.id }, '-created_date', 20);
      setRefunds(Array.isArray(refundRes) ? refundRes : refundRes.items || []);
      onChanged && onChanged();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const printEvidence = () => {
    const itemRows = items.map((it) => {
      const released = releasedCount(it);
      const total = Number(it.quantity) || 1;
      return `<tr><td>${(it.title || '').replace(/</g, '&lt;')}</td><td>${it.status}</td><td>${released}/${total} released</td><td>${it.pickup_completed_at ? 'yes' : 'no'}</td></tr>`;
    }).join('');
    const attemptRows = attempts.map((a) => `<tr><td>${a.provider}</td><td>${a.provider_session_id || '—'}</td><td>${a.provider_order_id || '—'}</td><td>${money(a.amount)}</td><td>${a.status}</td><td>${a.fee_amount == null ? 'UNKNOWN' : money(a.fee_amount)}</td></tr>`).join('');
    const refundRows = refunds.map((r) => `<tr><td>${money(r.amount)}</td><td>${r.refund_type}</td><td>${r.refund_method}</td><td>${r.status}</td><td>${(r.authorized_by_name || '')}</td><td>${r.provider_ref || '—'}</td></tr>`).join('');
    const html = `<!doctype html><html><head><title>Evidence — ${order.order_number}</title><style>
      body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;max-width:700px;margin:24px auto}
      h1{font-size:16px;margin:0 0 2px} h2{font-size:13px;margin:14px 0 4px}
      table{width:100%;border-collapse:collapse} td,th{padding:3px 6px;border:1px solid #ccc;font-size:11px;text-align:left}
      .muted{color:#555}
    </style></head><body>
      <h1>Transaction Evidence — ${order.order_number}</h1>
      <div class="muted">Assembled from EstateSalen canonical records on ${new Date().toLocaleString()}</div>
      <h2>Order</h2>
      <table>
        <tr><th>Receipt</th><td>${order.order_number}</td></tr>
        <tr><th>Date</th><td>${order.created_date ? new Date(order.created_date).toLocaleString() : '—'}</td></tr>
        <tr><th>Buyer</th><td>${(order.buyer_name || '—').replace(/</g, '&lt;')}</td></tr>
        <tr><th>Total</th><td>${money(order.total)}</td></tr>
        <tr><th>Payment method</th><td>${order.payment_method || '—'}</td></tr>
        <tr><th>Status</th><td>${order.status}</td></tr>
        <tr><th>Provider order reference</th><td>${order.provider_order_id || '—'}</td></tr>
        <tr><th>Refunded total</th><td>${money(refundedTotal)}</td></tr>
      </table>
      <h2>Merchandise custody</h2>
      <table><tr><th>Item</th><th>Status</th><th>Released</th><th>Pickup complete</th></tr>${itemRows}</table>
      <h2>Payment attempts (provider truth)</h2>
      <table><tr><th>Provider</th><th>Session</th><th>Provider order</th><th>Amount</th><th>Status</th><th>Fee</th></tr>${attemptRows || '<tr><td colspan="6">No online attempts (offline tender)</td></tr>'}</table>
      <h2>Refunds</h2>
      <table><tr><th>Amount</th><th>Type</th><th>Method</th><th>Status</th><th>Authorized by</th><th>Provider ref</th></tr>${refundRows || '<tr><td colspan="6">None recorded</td></tr>'}</table>
      <p class="muted">EstateSalen records refunds and assembles evidence; provider actions happen in the merchant payment dashboard.</p>
      <script>window.onload = () => window.print();</script>
    </body></html>`;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Evidence — {order?.order_number}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Assembling from canonical records…</p>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-1.5">
              <p><span className="text-slate-500">Date:</span> {order.created_date ? new Date(order.created_date).toLocaleString() : '—'}</p>
              <p><span className="text-slate-500">Buyer:</span> {order.buyer_name || '—'}</p>
              <p><span className="text-slate-500">Total:</span> <b>{money(order.total)}</b></p>
              <p><span className="text-slate-500">Method:</span> {order.payment_method || '—'}</p>
              <p><span className="text-slate-500">Status:</span> {order.status}</p>
              <p><span className="text-slate-500">Provider order ref:</span> {order.provider_order_id || '— (offline tender)'}</p>
              {refundedTotal > 0 && <p><span className="text-slate-500">Refunded:</span> <span className="text-red-700 font-semibold">{money(refundedTotal)}</span></p>}
            </div>

            <div>
              <p className="font-semibold text-slate-700 mb-1">Merchandise custody</p>
              {items.length === 0 && <p className="text-slate-400">Tracked items not found (may be general merchandise or removed).</p>}
              {items.map((it) => {
                const released = releasedCount(it);
                const total = Number(it.quantity) || 1;
                return (
                  <p key={it.id} className="text-slate-600">
                    {it.title} — {it.status} · released {released}/{total}
                    {it.pickup_completed_at ? ' · custody closed' : ' · OPEN (paid merchandise still owed)'}
                    {it.buyer_name ? ` · buyer ${it.buyer_name}` : ''}
                    {it.authorized_pickup ? ` · alt. collector: ${it.authorized_pickup}` : ''}
                  </p>
                );
              })}
            </div>

            <div>
              <p className="font-semibold text-slate-700 mb-1">Payment attempts</p>
              {attempts.length === 0 && <p className="text-slate-400">No online attempts — offline tender (cashier-recorded).</p>}
              {attempts.map((a) => (
                <p key={a.id} className="text-slate-600">
                  {a.provider} · ${Number(a.amount).toFixed(2)} · <Badge variant="outline" className="text-[9px]">{a.status}</Badge>
                  {a.provider_session_id ? ` · session ${a.provider_session_id}` : ''}
                  {a.provider_order_id ? ` · provider order ${a.provider_order_id}` : ''}
                  {a.provider_payment_ref ? ` · payment ref ${a.provider_payment_ref}` : ''}
                  {` · fee ${a.fee_amount == null ? 'UNKNOWN (provider does not return one)' : money(a.fee_amount)}`}
                  {a.resolved_via ? ` · resolved via ${a.resolved_via}${a.resolved_by_name ? ` by ${a.resolved_by_name}` : ''}` : ''}
                </p>
              ))}
            </div>

            <div>
              <p className="font-semibold text-slate-700 mb-1">Refunds</p>
              {refunds.length === 0 && <p className="text-slate-400">None recorded.</p>}
              {refunds.map((r) => (
                <p key={r.id} className="text-slate-600">
                  {money(r.amount)} · {r.refund_type} · {r.refund_method} · {r.status}
                  {r.provider_ref ? ` · provider ref ${r.provider_ref}` : ''}
                  {` · authorized by ${r.authorized_by_name || '—'}`}
                  {r.reason ? ` · "${r.reason}"` : ''}
                </p>
              ))}
            </div>

            <SaleReceipt order={order} sale={sale} />

            <div className="flex flex-wrap gap-1.5 pt-1">
              <Button size="sm" variant="outline" onClick={printEvidence}><Printer className="w-3.5 h-3.5 mr-1" />Print evidence package</Button>
              {canRefund && !showRefund && order.status === 'paid' && (
                <Button size="sm" variant="outline" onClick={() => setShowRefund(true)}>
                  <ShieldAlert className="w-3.5 h-3.5 mr-1" />Record refund…
                </Button>
              )}
            </div>

            {showRefund && (
              <div className="border border-slate-200 rounded p-2.5 space-y-1.5">
                <p className="font-semibold text-slate-700">Record a refund (operator action)</p>
                <p className="text-[10px] text-slate-500">
                  Records the refund in EstateSalen — the provider refund itself happens in Dashboard → Payments → All Payments.
                  Never write card numbers or CVV here. A refund never automatically returns merchandise to sale.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <div><Label className="text-[10px]">Amount</Label><Input type="number" step="0.01" value={refundForm.amount} onChange={(e) => setRefundForm((f) => ({ ...f, amount: e.target.value }))} /></div>
                  <div><Label className="text-[10px]">Type</Label>
                    <Select value={refundForm.type} onValueChange={(v) => setRefundForm((f) => ({ ...f, type: v }))}>
                      <SelectItem value="PARTIAL">Partial</SelectItem><SelectItem value="FULL">Full</SelectItem>
                    </Select>
                  </div>
                  <div><Label className="text-[10px]">Method</Label>
                    <Select value={refundForm.method} onValueChange={(v) => setRefundForm((f) => ({ ...f, method: v }))}>
                      <SelectItem value="cash">Cash</SelectItem><SelectItem value="credit_card">Card</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem><SelectItem value="check">Check</SelectItem><SelectItem value="online">Online (provider)</SelectItem><SelectItem value="other">Other</SelectItem>
                    </Select>
                  </div>
                  <div><Label className="text-[10px]">Provider refund state</Label>
                    <Select value={refundForm.status} onValueChange={(v) => setRefundForm((f) => ({ ...f, status: v }))}>
                      <SelectItem value="RECORDED">Recorded (approved here)</SelectItem>
                      <SelectItem value="PROVIDER_PENDING">Provider pending</SelectItem><SelectItem value="PROVIDER_COMPLETED">Provider completed</SelectItem>
                    </Select>
                  </div>
                  <div className="col-span-2"><Label className="text-[10px]">Reason (required)</Label><Input value={refundForm.reason} onChange={(e) => setRefundForm((f) => ({ ...f, reason: e.target.value }))} /></div>
                  <div className="col-span-2"><Label className="text-[10px]">Provider refund reference (from the dashboard, if any)</Label><Input value={refundForm.provider_ref} onChange={(e) => setRefundForm((f) => ({ ...f, provider_ref: e.target.value }))} /></div>
                  <div className="col-span-2"><Label className="text-[10px]">Merchandise consequence (what happens to the item — never automatic)</Label><Textarea rows={2} value={refundForm.item_consequence} onChange={(e) => setRefundForm((f) => ({ ...f, item_consequence: e.target.value }))} /></div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" disabled={busy} onClick={submitRefund}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Record refund</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowRefund(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}