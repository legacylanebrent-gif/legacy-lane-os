// Chapter 20 P1-20..P1-23 — HOLDS in the live view. There is no Hold entity:
// the Item holds the truth (status 'reserved' + hold block), and every action
// goes through the sanctioned itemHold backend function, which enforces
// authority. HOLD ≠ SOLD ≠ PAID ≠ RELEASED.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { holdState } from './liveSaleModel';

const HOLD_BADGE = {
  ACTIVE: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  EXPIRING: 'bg-amber-100 text-amber-800 border-amber-300',
  EXPIRED: 'bg-slate-100 text-slate-400 border-slate-300 line-through',
};

const EXPIRY_OPTIONS = [
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: 'No expiry', value: 0 },
];

export default function HoldsCard({ sale, items, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ item_id: '', buyer_name: '', buyer_contact: '', reason: '', expires_minutes: 60 });

  const held = (items || []).filter((i) => (i.hold && i.hold.created_at) || i.status === 'reserved' || i.display_attention === 'CHECKOUT_HOLD');
  const available = (items || []).filter((i) => i.status === 'available');

  const call = async (payload, successMsg) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('itemHold', payload);
      if (res?.data?.error) { toast.error(res.data.error); return false; }
      toast.success(successMsg);
      onChanged && onChanged();
      return true;
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Hold action failed';
      toast.error(msg);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createHold = async () => {
    if (!form.item_id) { toast.error('Pick the merchandise to hold'); return; }
    const ok = await call({
      action: 'create', item_id: form.item_id,
      buyer_name: form.buyer_name, buyer_contact: form.buyer_contact,
      reason: form.reason, expires_minutes: form.expires_minutes || null,
    }, 'Held — the item is reserved for that buyer. No payment is recorded.');
    if (ok) setForm({ item_id: '', buyer_name: '', buyer_contact: '', reason: '', expires_minutes: 60 });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="w-5 h-5 text-cyan-700" /> Holds
          <Badge variant="outline">{held.length}</Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">
          A hold reserves merchandise for a buyer — it NEVER records payment. High-Value holds and extensions require the operator.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {held.length === 0 && <p className="text-xs text-slate-400">Nothing is on hold right now.</p>}
        {held.map((i) => {
          const st = holdState(i);
          return (
            <div key={i.id} className="border border-slate-200 rounded p-2 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{i.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {i.hold?.buyer_name ? `for ${i.hold.buyer_name}` : 'buyer not recorded'}
                    {i.hold?.held_by_name ? ` · held by ${i.hold.held_by_name}` : ''}
                    {i.hold?.expires_at ? ` · ${st === 'EXPIRED' ? 'expired' : 'expires'} ${new Date(i.hold.expires_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ' · no expiry'}
                  </p>
                </div>
                <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${HOLD_BADGE[st] || HOLD_BADGE.ACTIVE}`}>{st}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy}
                  onClick={() => call({ action: 'clear', item_id: i.id }, 'Hold cleared — the item is AVAILABLE again.')}>
                  {st === 'EXPIRED' ? 'Clear expired hold' : 'Clear hold'}
                </Button>
                {st !== 'EXPIRED' && (
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" disabled={busy}
                    onClick={() => call({ action: 'extend', item_id: i.id, expires_minutes: 60 }, 'Hold extended one hour (operator action).')}>
                    Extend 1h (operator)
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        <details className="border border-slate-200 rounded p-2">
          <summary className="text-xs font-semibold text-slate-700 cursor-pointer">Hold merchandise for a buyer…</summary>
          <div className="space-y-2 pt-2">
            <div><Label className="text-xs">Merchandise (available only)</Label>
              <select value={form.item_id} onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))}
                className="w-full h-8 px-2 rounded border border-input bg-background text-xs">
                <option value="">Select an item…</option>
                {available.map((i) => <option key={i.id} value={i.id}>{i.title}{i.inventory_level === 'HIGH_VALUE' ? ' (HIGH VALUE — operator only)' : ''}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Buyer name</Label>
                <Input className="h-8 text-xs" value={form.buyer_name} onChange={(e) => setForm((f) => ({ ...f, buyer_name: e.target.value }))} /></div>
              <div><Label className="text-xs">Buyer phone (optional)</Label>
                <Input className="h-8 text-xs" value={form.buyer_contact} onChange={(e) => setForm((f) => ({ ...f, buyer_contact: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Reason (factual)</Label>
              <Input className="h-8 text-xs" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. getting cash from the car" /></div>
            <div><Label className="text-xs">Expires</Label>
              <select value={form.expires_minutes} onChange={(e) => setForm((f) => ({ ...f, expires_minutes: Number(e.target.value) }))}
                className="w-full h-8 px-2 rounded border border-input bg-background text-xs">
                {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select></div>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700" disabled={busy} onClick={createHold}>
              {busy && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}Create hold
            </Button>
            <p className="text-[10px] text-slate-500">Buyer details here are operational truth only — they never create marketing consent.</p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}