import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CQ_CATEGORIES, CQ_JURISDICTIONS, CQ_STATUSES, CQ_SOURCE_TYPES } from './complianceModel';

const emptyForm = {
  question: '', category: 'OTHER', jurisdiction_type: 'OTHER', jurisdiction_name: '',
  sale_id: '', status: 'RESEARCH_NEEDED', source_type: '', source_name: '', source_url: '',
  last_verified_at: '', verified_by: '', notes: '',
};

// Add / edit a compliance question with full provenance capture.
// Verification status is set ONLY here by explicit operator action — never by AI.
export default function QuestionModal({ open, onClose, onSave, initial, sales }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm(initial ? {
        question: initial.question || '',
        category: initial.category || 'OTHER',
        jurisdiction_type: initial.jurisdiction_type || 'OTHER',
        jurisdiction_name: initial.jurisdiction_name || '',
        sale_id: initial.sale_id || '',
        status: initial.status || 'RESEARCH_NEEDED',
        source_type: initial.source_type || '',
        source_name: initial.source_name || '',
        source_url: initial.source_url || '',
        last_verified_at: initial.last_verified_at ? String(initial.last_verified_at).slice(0, 10) : '',
        verified_by: initial.verified_by || '',
        notes: initial.notes || '',
      } : emptyForm);
    }
  }, [open, initial]);

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.question.trim()) { setError('Enter the question that needs answering.'); return; }
    // Provenance floors: higher statuses must name where the answer came from.
    if (form.status === 'AUTHORITY_VERIFIED' && !form.source_name.trim()) {
      setError('Authority-verified requires the name of the authority/source you consulted.');
      return;
    }
    if (form.status === 'PROFESSIONAL_VERIFIED' && !form.source_name.trim() && !(initial?.professional_contact_id)) {
      setError('Professional-verified requires the source or professional the answer came from.');
      return;
    }
    onSave({
      ...form,
      question: form.question.trim(),
      jurisdiction_name: form.jurisdiction_name.trim(),
      source_name: form.source_name.trim(),
      sale_id: form.sale_id || null,
      // A status above RESEARCH_NEEDED with no verification date/verifier defaults to now / operator.
      last_verified_at: form.status !== 'RESEARCH_NEEDED' && !form.last_verified_at
        ? new Date().toISOString() : (form.last_verified_at ? new Date(form.last_verified_at).toISOString() : null),
      verified_by: form.status !== 'RESEARCH_NEEDED' && !form.verified_by && !initial?.verified_by
        ? 'Operator' : form.verified_by,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Compliance Question' : 'Add Compliance Question'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Question to investigate *</Label>
            <Textarea rows={2} placeholder="e.g., Does this municipality require a permit or registration for an estate sale?"
              value={form.question} onChange={e => set('question')(e.target.value)} className="mt-1" />
            <p className="text-xs text-slate-400 mt-1">Record the question — EstateSalen never treats it as an answer or legal advice.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={set('category')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CQ_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jurisdiction</Label>
              <Select value={form.jurisdiction_type} onValueChange={set('jurisdiction_type')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CQ_JURISDICTIONS.map(j => <SelectItem key={j.key} value={j.key}>{j.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Jurisdiction name</Label>
              <Input placeholder="e.g., City of Troy" value={form.jurisdiction_name} onChange={e => set('jurisdiction_name')(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Sale (optional)</Label>
              <Select value={form.sale_id || 'none'} onValueChange={v => set('sale_id')(v === 'none' ? '' : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Not sale-specific" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not sale-specific</SelectItem>
                  {(sales || []).map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div>
              <Label>What was learned — provenance status</Label>
              <Select value={form.status} onValueChange={set('status')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CQ_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1">
                Status records WHERE the answer came from. It never means EstateSalen guarantees it is legally correct.
                {form.status !== 'RESEARCH_NEEDED' && ' Setting this is your explicit action — AI cannot set it.'}
              </p>
            </div>
            {form.status !== 'RESEARCH_NEEDED' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Source name</Label>
                  <Input placeholder="e.g., Troy City Clerk" value={form.source_name} onChange={e => set('source_name')(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Source type</Label>
                  <Select value={form.source_type || 'OTHER'} onValueChange={set('source_type')}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CQ_SOURCE_TYPES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {form.status !== 'RESEARCH_NEEDED' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Last verified</Label>
                  <Input type="date" value={form.last_verified_at} onChange={e => set('last_verified_at')(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Verified by</Label>
                  <Input placeholder="e.g., Jane (operator)" value={form.verified_by} onChange={e => set('verified_by')(e.target.value)} className="mt-1" />
                </div>
              </div>
            )}
            <div>
              <Label>Source link (optional)</Label>
              <Input placeholder="https://…" value={form.source_url} onChange={e => set('source_url')(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="What you learned, in your own words…" value={form.notes} onChange={e => set('notes')(e.target.value)} className="mt-1" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-orange-600 hover:bg-orange-700">{initial ? 'Save Changes' : 'Add Question'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}