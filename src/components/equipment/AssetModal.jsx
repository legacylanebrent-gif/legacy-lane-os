import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EQUIPMENT_CATEGORIES, ASSET_STATUSES, ASSET_CONDITIONS } from './equipmentModel';

// Chapter 8 P1 — create/edit ONE reusable company EquipmentAsset.
export default function AssetModal({ open, asset, operatorId, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', category: 'OTHER', status: 'AVAILABLE', condition: '', purchase_date: '', purchase_cost: '', replacement_target: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm({
        name: asset?.name || '',
        category: asset?.category || 'OTHER',
        status: asset?.status || 'AVAILABLE',
        condition: asset?.condition || '',
        purchase_date: asset?.purchase_date || '',
        purchase_cost: asset?.purchase_cost ?? '',
        replacement_target: asset?.replacement_target || '',
        notes: asset?.notes || '',
      });
    }
  }, [open, asset]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        operator_id: operatorId,
        name: form.name.trim(),
        category: form.category,
        status: form.status,
        condition: form.condition || null,
        purchase_date: form.purchase_date || null,
        purchase_cost: form.purchase_cost === '' ? null : Number(form.purchase_cost),
        replacement_target: form.replacement_target || null,
        notes: form.notes || '',
      };
      if (asset) await base44.entities.EquipmentAsset.update(asset.id, payload);
      else await base44.entities.EquipmentAsset.create(payload);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setError('Could not save the asset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{asset ? 'Edit Equipment Asset' : 'Add Equipment Asset'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Name (e.g. Folding table, Clothing rack, Checkout iPad)" value={form.name} onChange={e => set('name', e.target.value)} />
          <Select value={form.category} onValueChange={v => set('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EQUIPMENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ASSET_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.condition || 'none'} onValueChange={v => set('condition', v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Condition not set</SelectItem>
              {ASSET_CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-slate-500 mb-1">Purchase date (optional)</p>
              <Input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Purchase cost (optional)</p>
              <Input type="number" min="0" placeholder="0.00" value={form.purchase_cost} onChange={e => set('purchase_cost', e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Replacement target date (optional)</p>
            <Input type="date" value={form.replacement_target} onChange={e => set('replacement_target', e.target.value)} />
          </div>
          <Textarea rows={2} placeholder="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-xs text-slate-500">Purchase cost is informational capital truth only — it is never counted against an individual sale.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Asset'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}