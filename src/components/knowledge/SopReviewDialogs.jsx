// Chapter 25 P1 — operator dialogs: approve a draft (human approval only,
// superseding the prior approved version) and record an effectiveness review.
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { OUTCOME_LABELS, fmtDate } from './knowledgeModel';

const callFn = async (payload) => {
  const res = await base44.functions.invoke('companyKnowledge', payload);
  const d = res.data || res;
  if (d.error) throw new Error(d.error.message || 'Action failed');
  return d;
};

export function ApproveSopDialog({ open, onClose, doc, onDone }) {
  const [employeeVisible, setEmployeeVisible] = useState(true);
  const [reviewDate, setReviewDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const approve = async () => {
    setBusy(true); setError('');
    try {
      await callFn({ action: 'approve', id: doc.id, employee_visible: employeeVisible, review_date: reviewDate || null });
      onDone && onDone();
      onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base"><ShieldCheck className="w-4 h-4 text-green-600" /> Approve “{doc?.title}” v{doc?.version}?</DialogTitle>
          <p className="text-xs text-slate-500">
            {doc?.supersedes_document_id ? 'The prior approved version becomes SUPERSEDED (kept for history). ' : ''}
            Approval is a human act — this records you as the approver, with the time.
          </p>
        </DialogHeader>
        <div className="space-y-3">
          {doc?.change_reason && <p className="text-sm text-slate-600"><span className="font-medium">Why this version:</span> {doc.change_reason}</p>}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={employeeVisible} onChange={(e) => setEmployeeVisible(e.target.checked)} className="w-4 h-4" />
            Publish to employees (visible on their knowledge page)
          </label>
          <div>
            <Label className="text-xs">Effectiveness review date (optional)</Label>
            <Input type="date" className="mt-1" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">Did this change actually help? You'll get a due-for-review count on the audit.</p>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={approve} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EffectivenessDialog({ open, onClose, doc, onDone }) {
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true); setError('');
    try {
      await callFn({ action: 'review_effectiveness', id: doc.id, outcome, note, next_review_date: nextDate || null });
      onDone && onDone();
      onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const prior = (doc?.effectiveness_reviews || []).slice(-1)[0];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="w-4 h-4 text-cyan-600" /> Did the change help?</DialogTitle>
          <p className="text-xs text-slate-500">
            “{doc?.title}” v{doc?.version}{doc?.review_date ? ` · due ${fmtDate(doc.review_date)}` : ''}
            {prior ? ` · last review: ${OUTCOME_LABELS[prior.outcome] || prior.outcome}` : ''}
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="w-full text-sm border rounded-md p-2 bg-white">
            <option value="">Choose an assessment…</option>
            {Object.entries(OUTCOME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Textarea className="min-h-[60px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes (optional)" />
          <div>
            <Label className="text-xs">Next review date (optional)</Label>
            <Input type="date" className="mt-1" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy || !outcome}>
            {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Record review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}