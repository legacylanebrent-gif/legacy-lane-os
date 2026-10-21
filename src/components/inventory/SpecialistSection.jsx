import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { SPECIALIST_RELATIONSHIPS } from '@/components/saleops/pricingModel';

// Chapter 16 P1-22/P1-23 — specialist opinion as EVIDENCE for the pricing
// decision. The relationship is OPERATOR-DECLARED and never inferred: a
// POTENTIAL_BUYER opinion is visibly labeled and never shown as independent.
// Not an authentication, not an appraisal — the operator prices the item.
export default function SpecialistSection({ item, onChanged }) {
  const [opinions, setOpinions] = useState(item.specialist_opinions || []);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ specialist_name: '', relationship: 'INDEPENDENT', opinion: '', basis: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    setOpinions(item.specialist_opinions || []);
  }, [item?.id, item?.specialist_opinions]);

  const addOpinion = async () => {
    if (!form.specialist_name.trim() || !form.opinion.trim()) {
      toast.error('Specialist name and their opinion are required');
      return;
    }
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const next = [...(item.specialist_opinions || []), {
        opinion_id: crypto.randomUUID(),
        specialist_name: form.specialist_name.trim(),
        relationship: form.relationship,
        opinion: form.opinion.trim(),
        basis: form.basis.trim() || undefined,
        at: new Date().toISOString(),
        by: user.id,
        by_name: user.full_name || user.email || '',
      }];
      await base44.entities.Item.update(item.id, { specialist_opinions: next });
      setOpinions(next);
      setAdding(false);
      setForm({ specialist_name: '', relationship: 'INDEPENDENT', opinion: '', basis: '' });
      toast.success('Specialist opinion recorded');
      onChanged && onChanged();
    } catch (e) {
      toast.error('Could not record opinion: ' + (e.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  const relationshipTone = r =>
    r === 'INDEPENDENT' ? 'bg-green-100 text-green-700'
    : r === 'POTENTIAL_BUYER' ? 'bg-amber-100 text-amber-800'
    : r === 'BOTH' ? 'bg-violet-100 text-violet-700'
    : 'bg-slate-100 text-slate-600';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Label className="text-sm font-semibold text-slate-900">Specialist opinions ({opinions.length})</Label>
        <Button size="sm" variant="outline" onClick={() => setAdding(a => !a)} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> Record opinion
        </Button>
      </div>
      <p className="text-[10px] text-slate-400">
        Evidence for your pricing decision — never an authentication. Relationship is declared by you; a potential buyer's opinion is labeled as such.
      </p>

      {adding && (
        <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input value={form.specialist_name} onChange={e => set('specialist_name', e.target.value)} placeholder="Specialist name" className="text-xs h-8" />
            <select value={form.relationship} onChange={e => set('relationship', e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
              {SPECIALIST_RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <Input value={form.opinion} onChange={e => set('opinion', e.target.value)} placeholder="Their opinion in plain words" className="text-xs h-8" />
          <Input value={form.basis} onChange={e => set('basis', e.target.value)} placeholder="Basis: in-person inspection, photos, documents…" className="text-xs h-8" />
          <Button size="sm" onClick={addOpinion} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
            {saving ? 'Saving…' : 'Save opinion'}
          </Button>
        </div>
      )}

      {opinions.length === 0 && !adding && (
        <p className="text-xs text-slate-500 italic">No specialist opinions recorded.</p>
      )}
      {opinions.map(o => (
        <div key={o.opinion_id} className="border border-slate-200 rounded-md p-2.5 text-xs bg-white">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-800">{o.specialist_name}</span>
            <Badge className={relationshipTone(o.relationship)}>
              {o.relationship === 'INDEPENDENT' ? 'Independent' : o.relationship === 'POTENTIAL_BUYER' ? 'Potential buyer — not independent' : o.relationship === 'BOTH' ? 'Both / other' : 'Relationship unknown'}
            </Badge>
            {o.at && <span className="text-slate-400">{new Date(o.at).toLocaleDateString()}</span>}
          </div>
          <p className="text-slate-700 mt-1">{o.opinion}</p>
          {o.basis && <p className="text-slate-500 mt-0.5">Basis: {o.basis}</p>}
        </div>
      ))}
    </div>
  );
}