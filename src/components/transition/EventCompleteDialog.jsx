// Chapter 22 P1 — donation / cleanout completion dialog.
// Donation: acceptance of THIS load + recorded pickup + documentation.
// Cleanout: provider-reported completion is NEVER completion — the operator
// verifies. Enforced by completeTransitionEvent.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function EventCompleteDialog({ mode, event, open, onClose, onChanged }) {
  const [acceptance, setAcceptance] = useState(event?.acceptance_status || 'NOT_CHECKED');
  const [pickupAt, setPickupAt] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [providerDoneAt, setProviderDoneAt] = useState('');
  const [providerNote, setProviderNote] = useState('');
  const [exceptions, setExceptions] = useState('');
  const [verified, setVerified] = useState(false);
  const [performance, setPerformance] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isDonation = mode === 'donation';

  const uploadReceipt = async (file) => {
    setReceiptBusy(true);
    try {
      const res = await base44.integrations.Core.UploadPrivateFile({ file });
      if (res?.data?.file_uri) {
        await base44.entities.Donation.update(event.id, { receipt_uri: res.data.file_uri });
        onChanged && onChanged();
      }
    } catch (e) { setError(e?.message || 'Could not attach the receipt.'); }
    finally { setReceiptBusy(false); }
  };

  const submit = async () => {
    setBusy(true); setError('');
    try {
      if (isDonation) {
        await base44.entities.Donation.update(event.id, {
          acceptance_status: acceptance,
          receipt_note: receiptNote || undefined,
          performance_note: performance || undefined,
        });
        await base44.functions.invoke('completeTransitionEvent', {
          event_type: 'donation', event_id: event.id,
          pickup_completed_at: pickupAt ? new Date(pickupAt).toISOString() : undefined,
          receipt_note: receiptNote || undefined,
          performance_note: performance || undefined,
        });
      } else {
        await base44.functions.invoke('completeTransitionEvent', {
          event_type: 'cleanout', event_id: event.id,
          operator_verified: verified,
          provider_completed_at: providerDoneAt ? new Date(providerDoneAt).toISOString() : undefined,
          provider_reported_note: providerNote || undefined,
          exceptions_note: exceptions || undefined,
          performance_note: performance || undefined,
        });
      }
      onClose();
      onChanged && onChanged();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Could not complete.');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Complete — {event?.title}</DialogTitle></DialogHeader>
        {isDonation ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Directory interest is never acceptance. An organization or employee cannot convert an item into donated merely because it was physically picked up — record the organization's acceptance of THIS load.</p>
            <div>
              <Label>Organization acceptance of this load</Label>
              <Select value={acceptance} onValueChange={setAcceptance}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['NOT_CHECKED', 'PENDING', 'ACCEPTED', 'PARTIAL', 'DECLINED'].map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Pickup completed at</Label><Input type="datetime-local" value={pickupAt} onChange={(e) => setPickupAt(e.target.value)} /></div>
            <div>
              <Label>Receipt / acknowledgment (stored privately)</Label>
              <Input type="file" onChange={(e) => e.target.files?.[0] && uploadReceipt(e.target.files[0])} />
              {receiptBusy && <p className="text-xs text-slate-400 mt-1"><Loader2 className="w-3 h-3 inline animate-spin" /> Uploading…</p>}
              <p className="text-xs text-slate-400 mt-1">Record preservation only — EstateSalen does not provide tax valuation or tax advice.</p>
            </div>
            <div><Label>Receipt note</Label><Input value={receiptNote} onChange={(e) => setReceiptNote(e.target.value)} placeholder="What it is, who issued it" /></div>
            <div><Label>Private performance note (internal only — never a public review)</Label><Textarea className="h-16" value={performance} onChange={(e) => setPerformance(e.target.value)} /></div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Provider says done ≠ verified completion. The operator verifies the agreed scope was actually completed before the event resolves.</p>
            <div><Label>Provider reported complete at</Label><Input type="datetime-local" value={providerDoneAt} onChange={(e) => setProviderDoneAt(e.target.value)} /></div>
            <div><Label>Provider's report (their statement)</Label><Textarea className="h-16" value={providerNote} onChange={(e) => setProviderNote(e.target.value)} /></div>
            <div><Label>Exceptions observed (factual)</Label><Textarea className="h-16" value={exceptions} onChange={(e) => setExceptions(e.target.value)} /></div>
            <div><Label>Private performance note (internal only)</Label><Textarea className="h-16" value={performance} onChange={(e) => setPerformance(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
              I verified the agreed scope was actually completed (operator verification)
            </label>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={submit}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{isDonation ? 'Complete donation' : 'Record verified completion'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}