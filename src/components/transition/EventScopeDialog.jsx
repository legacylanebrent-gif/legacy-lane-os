// Chapter 22 P0-6..P0-9 — the ONE UI for the structural item scope of a
// donation / cleanout load, and for the buyout award. Protected merchandise
// is structurally rejected by the setTransitionEventScope backend function.
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldAlert } from 'lucide-react';
import { protectionPreview } from './transitionModel';

export default function EventScopeDialog({ mode, event, saleId, items, decisions, open, onClose, onChanged }) {
  const isBuyout = mode === 'buyout';
  const [buyerName, setBuyerName] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [conditions, setConditions] = useState('');
  const [decisionId, setDecisionId] = useState('');
  const [include, setInclude] = useState({});
  const [exclude, setExclude] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const usableDecisions = useMemo(
    () => (decisions || []).filter((d) => ['disposition', 'merchandise'].includes(d.decision_type) && (d.history || []).length > 0 && !['REQUESTED', 'UNDER_REVIEW'].includes(d.request_status)),
    [decisions]
  );
  const candidates = useMemo(
    () => (items || []).filter((i) => i.status !== 'sold' && !protectionPreview(i)?.startsWith('PROTECTED')),
    [items]
  );
  const current = isBuyout ? (event?.transition?.buyout_award || {}) : (event || {});
  const currentIncluded = current.included_item_ids || [];

  const reset = () => { setBuyerName(''); setOfferAmount(''); setConditions(''); setDecisionId(''); setInclude({}); setExclude({}); setError(''); };

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const included = Object.keys(include).filter((k) => include[k]);
      const excluded = Object.keys(exclude).filter((k) => exclude[k]);
      const payload = { event_type: mode, decision_id: decisionId, included_item_ids: included, excluded_item_ids: excluded };
      if (isBuyout) {
        payload.sale_id = saleId;
        payload.buyer_name = buyerName || undefined;
        payload.offer_amount = offerAmount ? parseFloat(offerAmount) : undefined;
        payload.conditions_note = conditions || undefined;
      } else {
        payload.event_id = event.id;
      }
      const res = await base44.functions.invoke('setTransitionEventScope', payload);
      const rejected = res?.data?.rejected || [];
      if (rejected.length) setError(`Rejected ${rejected.length} protected item(s): ${rejected.map((r) => r.title).join(', ')}`);
      else reset();
      onChanged && onChanged(rejected);
      if (!rejected.length) onClose();
    } catch (e) {
      const rej = e?.response?.data?.rejected;
      setError(e?.response?.data?.error || e.message || 'Could not save the scope.');
      if (rej?.length) setError((prev) => `${prev} Rejected: ${rej.map((r) => r.title).join(', ')}`);
    } finally { setBusy(false); }
  };

  const title = isBuyout ? 'Buyout award — included merchandise' : `Item load — ${event?.title || ''}`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-500">
          Free-text scope may EXPLAIN what is included; this structural list is the protection. Sold/paid, specialist-custody, client-retained, and resolved merchandise cannot be included — the backend path rejects it.
        </p>
        {isBuyout && (
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Buyer / reseller</Label><Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} defaultValue={current.buyer_name} /></div>
            <div><Label>Offer amount</Label><Input type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} defaultValue={current.offer_amount} /></div>
            <div className="col-span-2"><Label>Conditions</Label><Textarea className="h-16" value={conditions} onChange={(e) => setConditions(e.target.value)} defaultValue={current.conditions_note} /></div>
          </div>
        )}
        <div>
          <Label>Client decision authorizing this {isBuyout ? 'buyout' : mode}</Label>
          <Select value={decisionId} onValueChange={setDecisionId}>
            <SelectTrigger><SelectValue placeholder="Choose the authorized client decision" /></SelectTrigger>
            <SelectContent>
              {usableDecisions.length === 0 && <SelectItem value="none" disabled>No authorized decisions recorded</SelectItem>}
              {usableDecisions.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.subject || d.current_decision} — {d.authorized_by_name || 'client'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Merchandise ({candidates.length} eligible)</Label>
          {currentIncluded.length > 0 && <p className="text-xs text-slate-400">Currently in load: {currentIncluded.length} item(s)</p>}
          {candidates.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-700 truncate">{i.title} <span className="text-slate-400">({i.status})</span></span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={!!include[i.id]} onChange={(e) => setInclude((s) => ({ ...s, [i.id]: e.target.checked }))} /> Include
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={!!exclude[i.id]} onChange={(e) => setExclude((s) => ({ ...s, [i.id]: e.target.checked }))} /> Exclude
                </label>
              </div>
            </div>
          ))}
          {candidates.length === 0 && <p className="text-sm text-slate-400">No eligible merchandise — all remaining items are protected or resolved.</p>}
        </div>
        {error && <AlertLine text={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy || !decisionId} onClick={submit}>
            {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save scope
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AlertLine({ text }) {
  return (
    <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
      <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{text}</span>
    </div>
  );
}