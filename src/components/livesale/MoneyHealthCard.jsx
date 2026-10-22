// Chapter 21 P1 — CHECKOUT HEALTH (money truth only): unresolved payment
// attempts, resolved-failed attempts, and open payment exceptions — all from
// canonical records. No fake queue/wait/interruption metrics are shown.
// The operator (or admin) resolves ambiguous attempts here: DO NOT RELEASE →
// VERIFY THE MERCHANT RECORD (Base44 Payments dashboard) → RESOLVE.
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MoneyHealthCard({ sale, attempts, issues, onChanged }) {
  const [user, setUser] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notes, setNotes] = useState({});

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const list = attempts || [];
  const unresolved = list.filter((a) => ['PROCESSING', 'UNKNOWN'].includes(a.status));
  const failedRecent = list.filter((a) => ['DECLINED', 'FAILED'].includes(a.status));
  const openPaymentIssues = (issues || []).filter((i) => i.category === 'payment' && ['OPEN', 'WAITING'].includes(i.status || 'OPEN'));

  const canResolve = !!(user && (user.role === 'admin' || list.some((a) => a.operator_id === user.id)));

  const resolve = async (attempt, action) => {
    setBusyId(attempt.id);
    try {
      const res = await base44.functions.invoke('resolvePaymentAttempt', {
        attempt_id: attempt.id,
        action,
        note: notes[attempt.id] || '',
      });
      const data = res.data || {};
      toast.success(data.message || 'Attempt resolved');
      onChanged && onChanged();
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-700" /> Checkout Health
          <Badge variant="outline">{unresolved.length} unresolved</Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">
          Payment truth from PaymentAttempt records — no queue or wait-time estimates (not measured).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {unresolved.length === 0 && openPaymentIssues.length === 0 && failedRecent.length === 0 && (
          <p className="text-xs text-slate-400">No unresolved payments or payment exceptions.</p>
        )}

        {unresolved.map((a) => (
          <div key={a.id} className="border border-amber-300 bg-amber-50 rounded p-2.5 space-y-2">
            <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Online payment {a.status.toLowerCase()} — do NOT release merchandise
            </p>
            <p className="text-[11px] text-amber-900">
              ${Number(a.amount).toFixed(2)} · started {a.created_date ? new Date(a.created_date).toLocaleString() : '—'} · session {a.provider_session_id || '—'}
            </p>
            <p className="text-[11px] text-amber-800">
              Customer says paid? The merchant record is the truth — check Dashboard → Payments → All Payments, then resolve. A pending bank charge or phone screenshot is never payment.
            </p>
            {canResolve ? (
              <div className="space-y-1.5">
                <Input
                  placeholder="What the merchant record showed (optional note)"
                  value={notes[a.id] || ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))}
                  className="h-7 text-xs"
                />
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" disabled={busyId === a.id} onClick={() => resolve(a, 'verified_approved')}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                    {busyId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Verified paid — complete
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === a.id} onClick={() => resolve(a, 'merchant_declined')} className="h-7 text-xs">
                    Merchant says declined
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === a.id} onClick={() => resolve(a, 'merchant_failed')} className="h-7 text-xs">
                    Merchant says failed
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busyId === a.id} onClick={() => resolve(a, 'still_unknown')} className="h-7 text-xs">
                    Checked — still unknown
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-amber-800">Ask the operator to verify with the payment provider and resolve this attempt.</p>
            )}
          </div>
        ))}

        {failedRecent.length > 0 && (
          <div className="border border-slate-200 rounded p-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Resolved failed / declined attempts</p>
            {failedRecent.slice(0, 5).map((a) => (
              <p key={a.id} className="text-[11px] text-slate-600">
                {a.status} — ${Number(a.amount).toFixed(2)} · {a.created_date ? new Date(a.created_date).toLocaleString() : '—'}{a.resolved_by_name ? ` · resolved by ${a.resolved_by_name}` : ''}
              </p>
            ))}
          </div>
        )}

        {openPaymentIssues.length > 0 && (
          <div className="border border-red-200 bg-red-50 rounded p-2 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-red-700">Payment exceptions — manager review</p>
            {openPaymentIssues.map((i) => (
              <p key={i.id} className="text-[11px] text-red-800">
                {i.is_incident ? 'INCIDENT — ' : ''}{i.title} ({i.urgency || 'ROUTINE'})
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}