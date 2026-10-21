import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// Chapter 16 P1-25..P1-28 — appraisal CONTEXT on the item. The private document
// itself lives in the Business Document vault (category APPRAISAL, scope 'item').
// The appraisal value is EVIDENCE ONLY — nothing here ever writes Item.price.
export default function AppraisalSection({ item, onChanged }) {
  const [form, setForm] = useState(() => ({
    document_id: item.appraisal_context?.document_id || '',
    value: item.appraisal_context?.value ?? '',
    date: item.appraisal_context?.date || '',
    professional: item.appraisal_context?.professional || '',
    purpose: item.appraisal_context?.purpose || '',
    condition_differs_note: item.appraisal_context?.condition_differs_note || '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const ctx = {};
      if (form.document_id.trim()) ctx.document_id = form.document_id.trim();
      if (form.value !== '' && Number.isFinite(Number(form.value))) ctx.value = Number(form.value);
      if (form.date) ctx.date = form.date;
      if (form.professional.trim()) ctx.professional = form.professional.trim();
      if (form.purpose.trim()) ctx.purpose = form.purpose.trim();
      if (form.condition_differs_note.trim()) ctx.condition_differs_note = form.condition_differs_note.trim();
      await base44.entities.Item.update(item.id, { appraisal_context: ctx });
      toast.success('Appraisal context saved');
      onChanged && onChanged();
    } catch (e) {
      toast.error('Could not save appraisal context: ' + (e.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  const appraised = Number(form.value);
  const current = Number(item.price);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-900">Appraisal (evidence &amp; context)</Label>
      <p className="text-[10px] text-slate-400">
        A client-provided or commissioned appraisal is PRIVATE evidence — the document belongs in the Business Document vault
        (category Appraisal, scope Item). Its value is never copied into the item's price. You record the context without
        interpreting the methodology.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input value={form.document_id} onChange={e => set('document_id', e.target.value)} placeholder="Vault document ID (optional)" className="text-xs h-8" />
        <Input type="number" value={form.value} onChange={e => set('value', e.target.value)} placeholder="Appraised value (context only)" className="text-xs h-8" />
        <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="text-xs h-8" />
        <Input value={form.professional} onChange={e => set('professional', e.target.value)} placeholder="Appraiser / source" className="text-xs h-8" />
      </div>
      <Input value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="Valuation purpose if known (insurance, estate, resale…)" className="text-xs h-8" />
      <Textarea value={form.condition_differs_note} onChange={e => set('condition_differs_note', e.target.value)} rows={2} className="text-xs"
        placeholder="Where current condition differs from the appraised condition (the document itself is never altered)…" />
      <div className="flex items-center justify-between flex-wrap gap-2">
        {Number.isFinite(appraised) && appraised > 0 && Number.isFinite(current) && current > 0 && appraised !== current && (
          <p className="text-[10px] text-slate-500 italic">
            The appraised ${appraised.toLocaleString()} and your current ${current.toLocaleString()} differ — an appraisal is
            evidence for your decision, not the estate-sale price.
          </p>
        )}
        <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save appraisal context'}</Button>
      </div>
    </div>
  );
}