// Chapter 22 P0-3/P0-5 — the ONE UI for setting an item's post-sale
// disposition. Enforcement lives in the setItemDisposition backend function;
// this dialog only previews the protection and authority rules.
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldAlert } from 'lucide-react';
import { OUTCOME_LABELS, OUTCOME_STYLES, CONSEQUENTIAL, protectionPreview } from './transitionModel';

export default function ItemDispositionDialog({ item, decisions, open, onClose, onChanged }) {
  const [outcome, setOutcome] = useState('');
  const [decisionId, setDecisionId] = useState('');
  const [responsibleNote, setResponsibleNote] = useState('');
  const [collectorName, setCollectorName] = useState('');
  const [pickupDeadline, setPickupDeadline] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const usableDecisions = useMemo(
    () => (decisions || []).filter((d) => ['disposition', 'merchandise'].includes(d.decision_type) && (d.history || []).length > 0 && !['REQUESTED', 'UNDER_REVIEW'].includes(d.request_status)),
    [decisions]
  );
  const protection = item ? protectionPreview(item) : null;

  const reset = () => { setOutcome(''); setDecisionId(''); setResponsibleNote(''); setCollectorName(''); setPickupDeadline(''); setNextAction(''); setError(''); };

  const submit = async () => {
    setBusy(true); setError('');
    try {
      await base44.functions.invoke('setItemDisposition', {
        item_id: item.id,
        outcome,
        decision_id: CONSEQUENTIAL.includes(outcome) ? decisionId : undefined,
        responsible_note: responsibleNote || undefined,
        collector_name: outcome === 'CLIENT_RETAINS' ? collectorName || undefined : undefined,
        pickup_deadline: outcome === 'CLIENT_RETAINS' ? pickupDeadline || undefined : undefined,
        next_action_note: nextAction || undefined,
      });
      reset();
      onClose();
      onChanged && onChanged();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Could not set the disposition.');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post-sale disposition — {item?.title}</DialogTitle>
        </DialogHeader>
        {protection && protection.startsWith('PROTECTED') ? (
          <Alert variant="destructive">
            <ShieldAlert className="w-4 h-4" />
            <AlertDescription>{protection}. The backend path will refuse this change — release or resolve the merchandise first, or record an authoritative decision change.</AlertDescription>
          </Alert>
        ) : (
          <p className="text-xs text-slate-500">
            Consequential outcomes (donate, dispose, buyout, cleanout, client retains, specialist) require a client-authorized decision — a pending client request is never authorization. Free text may explain the disposition; it must never be the only protection.
          </p>
        )}
        <div className="space-y-3">
          <div>
            <Label>What is supposed to happen to this merchandise?</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue placeholder="Choose the next status" /></SelectTrigger>
              <SelectContent>
                {Object.keys(OUTCOME_LABELS).map((k) => (
                  <SelectItem key={k} value={k}>{OUTCOME_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {outcome && CONSEQUENTIAL.includes(outcome) && (
            <div>
              <Label>Client decision evidencing authority</Label>
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
          )}
          {outcome === 'CLIENT_RETAINS' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Family / collector (name only — gains no broader authority)</Label>
                <Input value={collectorName} onChange={(e) => setCollectorName(e.target.value)} placeholder="Niece, son..." />
              </div>
              <div>
                <Label>Pickup deadline (optional)</Label>
                <Input type="date" value={pickupDeadline} onChange={(e) => setPickupDeadline(e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <Label>Who/what is responsible (organization, provider, family...)</Label>
            <Input value={responsibleNote} onChange={(e) => setResponsibleNote(e.target.value)} />
          </div>
          <div>
            <Label>Next action</Label>
            <Textarea className="h-16" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
          </div>
          {item?.post_sale_disposition?.outcome && (
            <p className="text-xs text-slate-400">Current: <span className={`px-1.5 py-0.5 rounded text-xs ${OUTCOME_STYLES[item.post_sale_disposition.outcome]}`}>{OUTCOME_LABELS[item.post_sale_disposition.outcome]}</span></p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={!outcome || busy || (CONSEQUENTIAL.includes(outcome) && !decisionId)} onClick={submit}>
              {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Set disposition
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}