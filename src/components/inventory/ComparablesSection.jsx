import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { EVIDENCE_TYPES, SOURCE_TYPES, USEFULNESS, MARKET_CONTEXTS, summarizeEvidence, evidenceRangeText } from '@/components/saleops/pricingModel';

// Chapter 16 P1-1..P1-9 — the operator's curated comparable evidence for ONE item.
// ASKING and SOLD stay structurally distinct; outliers are preserved with reasons;
// usefulness is a transparent qualitative judgment — no numeric scores.
export default function ComparablesSection({ item, onChanged }) {
  const [comparables, setComparables] = useState([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    evidence_type: 'ASKING', source_type: 'ONLINE_MARKETPLACE', title: '', price: '',
    evidence_date: '', condition_context: '', similarities: '', differences: '',
    usefulness: 'USEFUL', market_context: 'UNKNOWN', source_ref: '', notes: '',
  });

  useEffect(() => {
    if (item?.id) {
      base44.entities.ItemComparable.filter({ item_id: item.id }, '-created_date', 100)
        .then(setComparables)
        .catch(() => setComparables([]));
    }
  }, [item?.id]);

  const summary = summarizeEvidence(comparables);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addComparable = async () => {
    const price = parseFloat(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Enter the observed price');
      return;
    }
    if (form.evidence_type === 'SOLD' && form.source_type !== 'ESTATESALEN_INTERNAL'
        && !form.source_ref && !window.confirm('Classify as SOLD only when the source shows a COMPLETED sale. Continue?')) {
      return;
    }
    setSaving(true);
    try {
      await base44.entities.ItemComparable.create({
        item_id: item.id,
        sale_id: item.estate_sale_id || undefined,
        operator_id: item.operator_id || undefined,
        sale_team_ids: item.sale_team_ids || [],
        evidence_type: form.evidence_type,
        source_type: form.source_type,
        internal_item_id: form.source_type === 'ESTATESALEN_INTERNAL' ? (form.source_ref || '').trim() || undefined : undefined,
        source_ref: form.source_ref || undefined,
        title: form.title || undefined,
        price,
        evidence_date: form.evidence_date || undefined,
        condition_context: form.condition_context || undefined,
        similarities: form.similarities || undefined,
        differences: form.differences || undefined,
        usefulness: form.usefulness,
        market_context: form.market_context,
        notes: form.notes || undefined,
      });
      toast.success('Comparable evidence recorded');
      setAdding(false);
      setForm({ evidence_type: 'ASKING', source_type: 'ONLINE_MARKETPLACE', title: '', price: '', evidence_date: '', condition_context: '', similarities: '', differences: '', usefulness: 'USEFUL', market_context: 'UNKNOWN', source_ref: '', notes: '' });
      const data = await base44.entities.ItemComparable.filter({ item_id: item.id }, '-created_date', 100);
      setComparables(data);
      onChanged && onChanged();
    } catch (e) {
      toast.error('Could not record comparable: ' + (e.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  const removeComparable = async c => {
    try {
      await base44.entities.ItemComparable.delete(c.id);
      setComparables(prev => prev.filter(x => x.id !== c.id));
      onChanged && onChanged();
    } catch (e) {
      toast.error('Only the operator can remove evidence records.');
    }
  };

  const toggleOutlier = async c => {
    try {
      const reason = c.outlier ? '' : window.prompt('Why is this evidence an outlier? (kept visible, never deleted)', '') || '';
      if (!c.outlier && !reason) return;
      await base44.entities.ItemComparable.update(c.id, { outlier: !c.outlier, outlier_reason: reason });
      const data = await base44.entities.ItemComparable.filter({ item_id: item.id }, '-created_date', 100);
      setComparables(data);
    } catch (e) {
      toast.error('Could not update evidence.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Label className="text-sm font-semibold text-slate-900">Comparable evidence ({summary.total})</Label>
        <Button size="sm" variant="outline" onClick={() => setAdding(a => !a)} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> Add evidence
        </Button>
      </div>

      {/* P1-8 — sold and asking ranges summarized SEPARATELY, never mixed */}
      {(summary.sold || summary.asking) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-green-50 border border-green-200 rounded-md px-2.5 py-2">
            <p className="font-medium text-green-800">Observed SOLD range</p>
            <p className="text-green-700">{summary.sold ? evidenceRangeText(summary.sold) : 'No completed-sale evidence'}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md px-2.5 py-2">
            <p className="font-medium text-blue-800">Observed ASKING range</p>
            <p className="text-blue-700">{summary.asking ? evidenceRangeText(summary.asking) : 'No asking-price references'}</p>
          </div>
          {summary.thinSample && (
            <p className="sm:col-span-2 text-slate-500 italic">
              Small sample — a handful of observations does not establish a market. Weigh this evidence yourself.
            </p>
          )}
        </div>
      )}

      {adding && (
        <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
          <div className="grid grid-cols-2 gap-2">
            <select value={form.evidence_type} onChange={e => set('evidence_type', e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
              {EVIDENCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={form.source_type} onChange={e => set('source_type', e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
              {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="What the evidence item is" className="text-xs h-8" />
            <Input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="Price ($)" className="text-xs h-8" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={form.evidence_date} onChange={e => set('evidence_date', e.target.value)} className="text-xs h-8" />
            <select value={form.market_context} onChange={e => set('market_context', e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
              {MARKET_CONTEXTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <Input value={form.source_ref} onChange={e => set('source_ref', e.target.value)}
            placeholder={form.source_type === 'ESTATESALEN_INTERNAL' ? 'Historical Item ID (internal sale)' : 'Link / reference'}
            className="text-xs h-8" />
          <Input value={form.condition_context} onChange={e => set('condition_context', e.target.value)} placeholder="Condition as described in the evidence" className="text-xs h-8" />
          <Input value={form.similarities} onChange={e => set('similarities', e.target.value)} placeholder="Why it's relevant (same maker, era...)" className="text-xs h-8" />
          <Input value={form.differences} onChange={e => set('differences', e.target.value)} placeholder="Why it's limited (size, condition, market...)" className="text-xs h-8" />
          <div className="grid grid-cols-2 gap-2 items-center">
            <select value={form.usefulness} onChange={e => set('usefulness', e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
              {USEFULNESS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <Button size="sm" onClick={addComparable} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 h-8">
              {saving ? 'Saving…' : 'Record evidence'}
            </Button>
          </div>
        </div>
      )}

      {comparables.length === 0 && !adding && (
        <p className="text-xs text-slate-500 italic">
          No comparable evidence yet. Asking prices and completed sales are recorded separately — one comparable is never "the market."
        </p>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {comparables.map(c => (
          <div key={c.id} className={`border rounded-md p-2.5 text-xs ${c.outlier ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className={c.evidence_type === 'SOLD' ? 'bg-green-100 text-green-700' : c.evidence_type === 'ASKING' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}>
                    {c.evidence_type === 'SOLD' ? 'Sold' : c.evidence_type === 'ASKING' ? 'Asking' : 'Unknown'}
                  </Badge>
                  <span className="font-bold text-slate-900">${Number(c.price).toLocaleString()}</span>
                  {c.evidence_date && <span className="text-slate-400">{c.evidence_date}</span>}
                  <Badge variant="secondary">{c.usefulness}</Badge>
                  {c.outlier && <Badge className="bg-amber-100 text-amber-800 gap-0.5"><AlertTriangle className="w-3 h-3" /> Outlier</Badge>}
                </div>
                {c.title && <p className="mt-1 font-medium text-slate-800 truncate">{c.title}</p>}
                {(SOURCE_TYPES.find(s => s.value === c.source_type) || {}).label && (
                  <p className="text-slate-500">{(SOURCE_TYPES.find(s => s.value === c.source_type) || {}).label}{c.source_label ? ` — ${c.source_label}` : ''}</p>
                )}
                {c.similarities && <p className="text-green-700 mt-0.5">Why relevant: {c.similarities}</p>}
                {c.differences && <p className="text-amber-700 mt-0.5">Why limited: {c.differences}</p>}
                {c.outlier && c.outlier_reason && <p className="text-amber-800 mt-0.5">Outlier reason: {c.outlier_reason}</p>}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button className="text-slate-400 hover:text-amber-600" title="Mark outlier (kept visible)" onClick={() => toggleOutlier(c)}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
                <button className="text-slate-400 hover:text-red-500" title="Remove (operator)" onClick={() => removeComparable(c)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}