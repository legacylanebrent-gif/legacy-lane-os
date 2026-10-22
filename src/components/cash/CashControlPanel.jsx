// Chapter 21 P1 — CASH CONTROL: opening bank, cash drops, signed adjustments,
// deterministic expected cash, physical closing count, honest variance.
// Cash sales are NOT duplicated here — they come from canonical Order
// (POS) and Transaction (worksheet) records of the operating day.
// Formula: EXPECTED = OPENING BANK + CASH ORDERS TODAY + CASH WORKSALE
// TRANSACTIONS TODAY − CASH REFUNDS TODAY − DROPS + SIGNED ADJUSTMENTS.
// Variance is never silently zeroed; the closing count is always the human's
// own number.
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Landmark, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);
const dayStartIso = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };
const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

export default function CashControlPanel({ sale, onChanged }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [derived, setDerived] = useState({ orders: 0, transactions: 0, refunds: 0 });
  const [loading, setLoading] = useState(true);
  const [openingBank, setOpeningBank] = useState('');
  const [register, setRegister] = useState('');
  const [dropAmount, setDropAmount] = useState('');
  const [dropNote, setDropNote] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [closingCount, setClosingCount] = useState('');
  const [varianceNote, setVarianceNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!sale) return;
    setLoading(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      setUser(me);
      const [sessionsRes, ordersRes, transRes, refundsRes] = await Promise.all([
        base44.entities.CashSession.filter({ sale_id: sale.id }),
        base44.entities.Order.filter({ sale_id: sale.id, created_date: { $gte: dayStartIso() } }, { sort: '-created_date', limit: 200 }),
        base44.entities.Transaction.filter({ sale_id: sale.id, payment_method: 'cash', created_date: { $gte: dayStartIso() } }, { sort: '-created_date', limit: 200 }),
        base44.entities.SaleRefund.filter({ sale_id: sale.id, refund_method: 'cash', status: { $ne: 'CANCELLED' } }, { sort: '-created_date', limit: 100 }),
      ]);
      const sessions = Array.isArray(sessionsRes) ? sessionsRes : sessionsRes.items || [];
      const todaySession = sessions.find((s) => s.session_date === today()) || null;
      setSession(todaySession);
      const orders = Array.isArray(ordersRes) ? ordersRes : ordersRes.items || [];
      const transactions = Array.isArray(transRes) ? transRes : transRes.items || [];
      const refunds = Array.isArray(refundsRes) ? refundsRes : refundsRes.items || [];
      setDerived({
        orders: orders.filter((o) => o.payment_method === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0),
        transactions: transactions.reduce((s, t) => s + (Number(t.total) || 0), 0),
        refunds: refunds.filter((r) => (r.refunded_at || r.created_date) >= dayStartIso()).reduce((s, r) => s + (Number(r.amount) || 0), 0),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sale]);

  useEffect(() => { load(); }, [load]);

  const drops = (session?.movements || []).filter((m) => m.kind === 'DROP').reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const adjustments = (session?.movements || []).filter((m) => m.kind === 'ADJUSTMENT').reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const expected = session
    ? (Number(session.opening_bank) || 0) + derived.orders + derived.transactions - derived.refunds - drops + adjustments
    : null;

  const openSession = async () => {
    const amt = parseFloat(openingBank);
    if (isNaN(amt) || amt < 0) { toast.error('Enter the actual opening cash you counted'); return; }
    setBusy(true);
    try {
      await base44.entities.CashSession.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        sale_team_ids: sale.sale_team || [],
        session_date: today(),
        register_label: register || null,
        opening_bank: amt,
        opened_by: user?.id,
        opened_by_name: user?.full_name || '',
        opened_at: new Date().toISOString(),
        status: 'OPEN',
        movements: [],
      });
      toast.success('Opening bank recorded');
      setOpeningBank(''); setRegister('');
      load(); onChanged && onChanged();
    } catch (e) { toast.error(e?.response?.data?.error || 'Could not open the cash session'); } finally { setBusy(false); }
  };

  const addMovement = async (kind) => {
    const raw = kind === 'DROP' ? dropAmount : adjAmount;
    const amt = parseFloat(raw);
    if (isNaN(amt) || (kind === 'DROP' ? amt <= 0 : amt === 0)) { toast.error(kind === 'DROP' ? 'Enter the amount removed' : 'Enter a signed amount (+/-)'); return; }
    if (kind === 'DROP' && !dropNote.trim()) { toast.error('Record who removed it and where it was secured'); return; }
    if (kind === 'ADJUSTMENT' && !adjReason.trim()) { toast.error('An adjustment requires an authorized reason'); return; }
    setBusy(true);
    try {
      const movements = [...(session.movements || []), {
        movement_id: crypto.randomUUID(),
        kind,
        amount: amt,
        note: kind === 'DROP' ? dropNote.trim() : adjReason.trim(),
        by: user?.id,
        by_name: user?.full_name || '',
        at: new Date().toISOString(),
      }];
      await base44.entities.CashSession.update(session.id, { movements });
      setDropAmount(''); setDropNote(''); setAdjAmount(''); setAdjReason('');
      toast.success(kind === 'DROP' ? 'Cash drop recorded' : 'Adjustment recorded');
      load();
    } catch (e) { toast.error('Could not record the movement'); } finally { setBusy(false); }
  };

  const closeSession = async () => {
    const count = parseFloat(closingCount);
    if (isNaN(count) || count < 0) { toast.error('Enter the actual physical cash you counted at close'); return; }
    setBusy(true);
    try {
      const variance = count - expected;
      await base44.entities.CashSession.update(session.id, {
        status: 'CLOSED',
        closing_count: count,
        closed_by: user?.id,
        closed_by_name: user?.full_name || '',
        closed_at: new Date().toISOString(),
        expected_cash: expected,
        variance,
        variance_status: Math.abs(variance) < 0.005 ? 'RESOLVED' : 'OPEN',
        variance_note: Math.abs(variance) < 0.005 ? 'Counted balanced at close.' : null,
      });
      toast.success('Cash closed — count recorded');
      setClosingCount('');
      load(); onChanged && onChanged();
    } catch (e) { toast.error('Could not close the session'); } finally { setBusy(false); }
  };

  const resolveVariance = async (status) => {
    if (!varianceNote.trim()) { toast.error('Record the explanation or resolution first'); return; }
    setBusy(true);
    try {
      await base44.entities.CashSession.update(session.id, { variance_status: status, variance_note: varianceNote.trim() });
      setVarianceNote('');
      toast.success('Variance recorded');
      load();
    } catch (e) { toast.error('Could not update the variance'); } finally { setBusy(false); }
  };

  if (loading) return <Card><CardContent className="py-6 flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading cash control…</CardContent></Card>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="w-5 h-5 text-emerald-700" /> Cash Control
          {session && <Badge variant="outline">{session.status}</Badge>}
          {session?.register_label && <Badge variant="outline" className="text-[10px]">{session.register_label}</Badge>}
        </CardTitle>
        <p className="text-xs text-slate-500">Cash handled by the operator. Expected cash is derived; the count is always yours.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!session ? (
          <div className="space-y-2 border border-slate-200 rounded p-2.5">
            <p className="text-xs font-semibold text-slate-700">Open today's cash session</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Opening bank (actual count)</Label>
                <Input type="number" step="0.01" value={openingBank} onChange={(e) => setOpeningBank(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Register (optional)</Label>
                <Input value={register} onChange={(e) => setRegister(e.target.value)} placeholder="Drawer 1" />
              </div>
            </div>
            <Button size="sm" disabled={busy} onClick={openSession}>Record opening bank</Button>
          </div>
        ) : (
          <>
            <div className="border border-slate-200 rounded p-2 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Opening bank</span><span className="font-semibold">{money(session.opening_bank)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">+ Cash POS orders today</span><span className="font-semibold">{money(derived.orders)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">+ Cash worksheet sales today</span><span className="font-semibold">{money(derived.transactions)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">− Cash refunds today</span><span className="font-semibold">{money(derived.refunds)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">− Cash drops</span><span className="font-semibold">{money(drops)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">± Authorized adjustments</span><span className="font-semibold">{money(adjustments)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="font-bold text-slate-800">{session.status === 'CLOSED' ? 'Expected cash (at close)' : 'Expected cash on hand'}</span>
                <span className="font-bold text-slate-900">{money(expected)}</span>
              </div>
              {session.status === 'CLOSED' && (
                <>
                  <div className="flex justify-between"><span className="text-slate-500">Actual closing count</span><span className="font-semibold">{money(session.closing_count)}</span></div>
                  <div className="flex justify-between">
                    <span className={`font-bold ${Math.abs(session.variance) < 0.005 ? 'text-emerald-700' : 'text-red-700'}`}>Variance</span>
                    <span className={`font-bold ${Math.abs(session.variance) < 0.005 ? 'text-emerald-700' : 'text-red-700'}`}>{money(session.variance)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Variance status: {session.variance_status}{session.variance_note ? ` — ${session.variance_note}` : ''}</p>
                </>
              )}
            </div>

            {session.status === 'OPEN' && (
              <>
                <div className="border border-slate-200 rounded p-2.5 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1"><ArrowDownToLine className="w-3.5 h-3.5" /> Cash drop (remove & secure)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" step="0.01" value={dropAmount} onChange={(e) => setDropAmount(e.target.value)} placeholder="Amount" />
                    <Input value={dropNote} onChange={(e) => setDropNote(e.target.value)} placeholder="Who removed / where secured" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => addMovement('DROP')}>Record drop</Button>
                  </div>
                </div>
                <div className="border border-slate-200 rounded p-2.5 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">Authorized adjustment (signed)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" step="0.01" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} placeholder="e.g. -5.00 or 5.00" />
                    <Input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="Authorized reason" />
                  </div>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => addMovement('ADJUSTMENT')}>Record adjustment</Button>
                </div>
                <div className="border border-slate-300 rounded p-2.5 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">Close the day — physical count</p>
                  <Input type="number" step="0.01" value={closingCount} onChange={(e) => setClosingCount(e.target.value)} placeholder="Actual cash counted" />
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={closeSession}>Close & compare to expected</Button>
                </div>
              </>
            )}

            {session.status === 'CLOSED' && session.variance_status === 'OPEN' && (
              <div className="border border-red-300 bg-red-50 rounded p-2.5 space-y-1.5">
                <p className="text-xs font-semibold text-red-800">Variance unresolved — it stays visible until you explain or resolve it.</p>
                <Input value={varianceNote} onChange={(e) => setVarianceNote(e.target.value)} placeholder="Explanation / resolution" />
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => resolveVariance('EXPLAINED')}>Mark explained</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => resolveVariance('RESOLVED')}>Mark resolved</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}