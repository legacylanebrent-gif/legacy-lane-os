// Chapter 21 P1 — RELEASE / PARTIAL PICKUP dialog: the ONE sanctioned path to
// record merchandise leaving the property. Who released, when, to whom, and
// what left (quantity for grouped merchandise). A partial release never closes
// custody; authority and payment confirmation are enforced by the
// recordItemRelease backend function, not this UI.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReleasePickupDialog({ item, open, onClose, onChanged }) {
  const remaining = Math.max(0, (Number(item?.quantity) || 1) - ((item?.releases) || []).reduce((s, r) => s + (Number(r.quantity) || 0), 0));
  const [qty, setQty] = useState('');
  const [releasedTo, setReleasedTo] = useState('');
  const [componentNote, setComponentNote] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('recordItemRelease', {
        item_id: item.id,
        quantity_released: qty ? parseInt(qty, 10) : undefined,
        released_to: releasedTo.trim() || undefined,
        component_note: componentNote.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(res.data?.fully_released
        ? 'Fully released — custody closed.'
        : `Released ${res.data?.released}. ${res.data?.remaining} still awaiting pickup.`);
      setQty(''); setReleasedTo(''); setComponentNote(''); setNotes('');
      onChanged && onChanged();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Release — {item?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <p className="text-slate-500">
            Remaining: <b>{remaining}</b> of {Number(item?.quantity) || 1}
            {item?.authorized_pickup ? ` · authorized collector on record: ${item.authorized_pickup}` : ''}
            {item?.buyer_name ? ` · buyer: ${item.buyer_name}` : ''}
          </p>
          <p className="text-slate-500">Only merchandise with CONFIRMED payment can be released (enforced server-side).</p>
          {remaining > 1 && (
            <div className="space-y-1">
              <Label>Quantity leaving now (partial pickup allowed)</Label>
              <Input type="number" min={1} max={remaining} value={qty} onChange={(e) => setQty(e.target.value)} placeholder={`1–${remaining}`} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Collected by (buyer or the named authorized person)</Label>
            <Input value={releasedTo} onChange={(e) => setReleasedTo(e.target.value)} placeholder={item?.buyer_name || 'Name'} />
          </div>
          {remaining > 1 && (
            <div className="space-y-1">
              <Label>Which components left (optional)</Label>
              <Input value={componentNote} onChange={(e) => setComponentNote(e.target.value)} placeholder="e.g. table + 4 chairs" />
            </div>
          )}
          <div className="space-y-1">
            <Label>Notes (only where necessary)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-1.5 pt-1">
            <Button size="sm" disabled={busy} onClick={submit}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Record release
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}