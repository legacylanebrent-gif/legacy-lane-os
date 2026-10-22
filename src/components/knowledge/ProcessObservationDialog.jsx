// Chapter 25 P1 — employee process observation dialog. Submits an
// OBSERVATION/SUGGESTION (a SaleIssue the operator reviews) — it never
// changes a procedure.
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Lightbulb } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ProcessObservationDialog({ open, onClose, sales, onSubmitted }) {
  const [saleId, setSaleId] = useState('');
  const [title, setTitle] = useState('');
  const [happened, setHappened] = useState('');
  const [workflow, setWorkflow] = useState('');
  const [difficult, setDifficult] = useState('');
  const [workaround, setWorkaround] = useState('');
  const [better, setBetter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const res = await base44.functions.invoke('companyKnowledge', {
        action: 'observe', sale_id: saleId, title,
        what_happened: happened, workflow, difficult, workaround, better,
      });
      const d = res.data || res;
      if (d.error) { setError(d.error.message || 'Could not save'); return; }
      onSubmitted && onSubmitted();
      setTitle(''); setHappened(''); setWorkflow(''); setDifficult(''); setWorkaround(''); setBetter('');
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not save the observation.');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base"><Lightbulb className="w-4 h-4 text-cyan-600" /> Suggest an improvement</DialogTitle>
          <p className="text-xs text-slate-500">Tell the operator how work actually happens. This is stored as a suggestion for review — it never changes a procedure on its own.</p>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Which sale were you working?</Label>
            <select value={saleId} onChange={(e) => setSaleId(e.target.value)} className="w-full mt-1 text-sm border rounded-md p-2 bg-white">
              <option value="">Pick a sale…</option>
              {(sales || []).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">One-line summary</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Furniture pickups always back up the driveway" />
          </div>
          <Textarea className="min-h-[60px]" value={happened} onChange={(e) => setHappened(e.target.value)} placeholder="What happened?" />
          <Input value={workflow} onChange={(e) => setWorkflow(e.target.value)} placeholder="Which procedure / workflow was involved?" />
          <Textarea className="min-h-[50px]" value={difficult} onChange={(e) => setDifficult(e.target.value)} placeholder="What was difficult?" />
          <Input value={workaround} onChange={(e) => setWorkaround(e.target.value)} placeholder="What workaround did you use?" />
          <Textarea className="min-h-[50px]" value={better} onChange={(e) => setBetter(e.target.value)} placeholder="What might work better?" />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !saleId || !title || (!happened && !better)}>
            {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Submit suggestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}