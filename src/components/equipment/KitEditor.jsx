import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, PackageCheck } from 'lucide-react';
import { ENTRY_TYPES, ENTRY_TYPE_LABELS, KIT_CATEGORY_OPTIONS, asList } from './equipmentModel';

// Chapter 8 P1 — the operator's reusable STANDARD SALE KIT: what the company
// normally takes to a sale. Entries are lightweight; a REUSABLE_EQUIPMENT entry
// may reference an EquipmentAsset, consumables stay generic. No quantities.
export default function KitEditor({ operatorId, assets }) {
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEntry, setNewEntry] = useState({ name: '', entry_type: 'CONSUMABLE', category: 'SUPPLIES', equipment_asset_id: '' });

  const load = async () => {
    try {
      const t = asList(await base44.entities.SaleKitTemplate.filter({ operator_id: operatorId }))[0] || null;
      setTemplate(t);
      setItems(t?.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [operatorId]);

  const createTemplate = async () => {
    setSaving(true);
    try {
      const t = await base44.entities.SaleKitTemplate.create({ operator_id: operatorId, name: 'Standard Sale Kit', items: [], enabled: true });
      setTemplate(t);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const saveItems = async (next) => {
    setItems(next);
    if (!template) return;
    setSaving(true);
    try {
      await base44.entities.SaleKitTemplate.update(template.id, { items: next });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const addEntry = () => {
    if (!newEntry.name.trim()) return;
    saveItems([...items, {
      entry_type: newEntry.entry_type,
      name: newEntry.name.trim(),
      category: newEntry.category,
      equipment_asset_id: newEntry.entry_type === 'REUSABLE_EQUIPMENT' ? (newEntry.equipment_asset_id || null) : null,
      notes: '',
    }]);
    setNewEntry({ name: '', entry_type: 'CONSUMABLE', category: 'SUPPLIES', equipment_asset_id: '' });
  };

  if (loading) return <div className="text-slate-500 text-sm p-4">Loading kit...</div>;

  if (!template) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <PackageCheck className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-slate-600">No standard sale kit yet. Create one reusable kit of what your company normally takes to a sale.</p>
          <Button onClick={createTemplate} disabled={saving}>Create Standard Sale Kit</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{template.name}</CardTitle>
        <Badge variant="outline">{items.length} entries</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && <p className="text-sm text-slate-500">Add checkout, signage, staging, supplies and security entries below.</p>}
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 border border-slate-200 rounded-lg">
              <Badge variant={it.entry_type === 'REUSABLE_EQUIPMENT' ? 'default' : 'secondary'}>{ENTRY_TYPE_LABELS[it.entry_type] || it.entry_type}</Badge>
              <span className="font-medium text-slate-900 text-sm flex-1 min-w-0 break-words">
                {it.name}
                {it.equipment_asset_id && assets.find(a => a.id === it.equipment_asset_id) && (
                  <span className="text-xs text-slate-500"> — linked asset: {assets.find(a => a.id === it.equipment_asset_id).name}</span>
                )}
              </span>
              <Badge variant="outline">{it.category}</Badge>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => saveItems(items.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <Input placeholder="Entry name (e.g. Price labels)" value={newEntry.name} onChange={e => setNewEntry(s => ({ ...s, name: e.target.value }))} />
          <Select value={newEntry.entry_type} onValueChange={v => setNewEntry(s => ({ ...s, entry_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ENTRY_TYPES.map(t => <SelectItem key={t} value={t}>{ENTRY_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={newEntry.category} onValueChange={v => setNewEntry(s => ({ ...s, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{KIT_CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          {newEntry.entry_type === 'REUSABLE_EQUIPMENT' ? (
            <Select value={newEntry.equipment_asset_id || 'none'} onValueChange={v => setNewEntry(s => ({ ...s, equipment_asset_id: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Link asset (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific asset</SelectItem>
                {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : <div />}
          <Button onClick={addEntry} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
        {saving && <p className="text-xs text-slate-500">Saving...</p>}
      </CardContent>
    </Card>
  );
}