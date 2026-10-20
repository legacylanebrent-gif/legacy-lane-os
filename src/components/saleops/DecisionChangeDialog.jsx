import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DECISION_SOURCES } from './saleDecisionModel';

// One dialog for recording/changing any decision (used by both Decisions and
// Merchandise panels). Submits { decision, authorityId, source, reason, notes }.
export default function DecisionChangeDialog({
  open, onClose, onSubmit, authorities, mode, lockedDecision, needsDecisionText, decisionTextPlaceholder,
}) {
  const [authorityId, setAuthorityId] = useState('');
  const [source, setSource] = useState('phone');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [decisionText, setDecisionText] = useState('');
  const [saving, setSaving] = useState(false);

  const activeAuthorities = authorities.filter(a => a.is_active);

  const reset = () => { setAuthorityId(''); setSource('phone'); setReason(''); setNotes(''); setDecisionText(''); };
  const close = () => { reset(); onClose(); };
  const submit = async () => {
    if (!authorityId) { alert('Select the authorized decision-maker'); return; }
    if (needsDecisionText && !decisionText.trim()) { alert('Enter the instruction'); return; }
    setSaving(true);
    try {
      await onSubmit({ authorityId, source, reason, notes, decisionText: decisionText.trim() });
      close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'change' ? 'Change Decision' : 'Record Decision'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {lockedDecision && (
            <div className="text-sm p-2.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700">
              {lockedDecision}
            </div>
          )}
          {activeAuthorities.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5">
              Add an authorized decision-maker first — a decision must record who authorized it.
            </p>
          ) : (
            <div>
              <Label>Authorized by *</Label>
              <Select value={authorityId} onValueChange={setAuthorityId}>
                <SelectTrigger><SelectValue placeholder="Select decision-maker" /></SelectTrigger>
                <SelectContent>
                  {activeAuthorities.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name}{a.authority_role ? ` — ${a.authority_role}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>How was this instruction received?</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DECISION_SOURCES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {needsDecisionText && (
            <div><Label>{mode === 'change' ? 'New instruction *' : 'Instruction *'}</Label>
              <Input value={decisionText} onChange={e => setDecisionText(e.target.value)} placeholder={decisionTextPlaceholder || 'What did they instruct?'} /></div>
          )}
          {mode === 'change' && (
            <div><Label>Reason for change</Label><Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. family member requested item" /></div>
          )}
          <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={submit} disabled={saving || activeAuthorities.length === 0}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Save Decision
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}