import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Truck, PackageMinus, ClipboardList, Loader2 } from 'lucide-react';
import AssignmentCard from '@/components/equipment/AssignmentCard';
import AiChecklistPanel from '@/components/equipment/AiChecklistPanel';
import { CHECKLIST_TEMPLATES } from '@/components/equipment/checklistTemplates';
import { ENTRY_TYPES, ENTRY_TYPE_LABELS, KIT_CATEGORY_OPTIONS, PACKOUT_ASSET_STATUS, asList } from '@/components/equipment/equipmentModel';

// Chapter 8 P1 — per-sale LOAD OUT / PACK OUT over SaleEquipmentAssignment
// records. Execution stays in SaleTask; this is equipment truth only.
export default function SaleEquipment() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', entry_type: 'REQUIREMENT', category: 'STAGING', equipment_asset_id: '' });
  const [taskMsg, setTaskMsg] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');
      if (!saleId) { navigate(createPageUrl('MySales')); return; }
      const saleData = asList(await base44.entities.EstateSale.filter({ id: saleId }));
      if (saleData.length === 0) { navigate(createPageUrl('MySales')); return; }
      const s = saleData[0];
      setSale(s);
      const [assignRes, assetRes, templateRes] = await Promise.all([
        base44.entities.SaleEquipmentAssignment.filter({ sale_id: s.id }),
        base44.entities.EquipmentAsset.filter({ operator_id: s.operator_id }),
        base44.entities.SaleKitTemplate.filter({ operator_id: s.operator_id, enabled: true }),
      ]);
      setAssignments(asList(assignRes));
      setAssets(asList(assetRes));
      setTemplate(asList(templateRes)[0] || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const patchAssignment = async (id, patch) => {
    setAssignments(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)));
    try {
      const before = assignments.find(a => a.id === id);
      await base44.entities.SaleEquipmentAssignment.update(id, patch);
      // Deterministic asset-status synchronization.
      if (before?.equipment_asset_id) {
        if (patch.packed === true) {
          await base44.entities.EquipmentAsset.update(before.equipment_asset_id, { status: 'AT_SALE' });
        }
        if (patch.packout_state && PACKOUT_ASSET_STATUS[patch.packout_state]) {
          await base44.entities.EquipmentAsset.update(before.equipment_asset_id, { status: PACKOUT_ASSET_STATUS[patch.packout_state] });
        }
        setAssets(prev => prev.map(a => a.id === before.equipment_asset_id
          ? { ...a, status: patch.packout_state ? PACKOUT_ASSET_STATUS[patch.packout_state] : (patch.packed ? 'AT_SALE' : a.status) }
          : a));
      }
    } catch (e) {
      console.error(e);
      load();
    }
  };

  const deleteAssignment = async (id) => {
    try {
      await base44.entities.SaleEquipmentAssignment.delete(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (e) { console.error(e); }
  };

  const projectKit = async () => {
    if (!template || !sale) return;
    setBusy(true);
    try {
      const created = await base44.entities.SaleEquipmentAssignment.bulkCreate((template.items || []).map(it => ({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        company_id: sale.company_id || '',
        sale_team_ids: sale.sale_team || [],
        kit_template_id: template.id,
        source: 'kit',
        entry_type: it.entry_type,
        name: it.name,
        category: it.category || 'OTHER',
        equipment_asset_id: it.equipment_asset_id || null,
        packed: false,
        packout_state: 'PENDING',
        restock_needed: false,
      })));
      setAssignments(asList(created));
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const addSaleSpecific = async () => {
    if (!addForm.name.trim()) return;
    setBusy(true);
    try {
      const created = await base44.entities.SaleEquipmentAssignment.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        company_id: sale.company_id || '',
        sale_team_ids: sale.sale_team || [],
        source: 'sale_specific',
        entry_type: addForm.entry_type,
        name: addForm.name.trim(),
        category: addForm.category,
        equipment_asset_id: addForm.entry_type === 'REUSABLE_EQUIPMENT' ? (addForm.equipment_asset_id || null) : null,
      });
      setAssignments(prev => [...prev, created]);
      setAddForm({ name: '', entry_type: 'REQUIREMENT', category: 'STAGING', equipment_asset_id: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const createRestockTask = async (a) => {
    try {
      await base44.entities.SaleTask.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        company_id: sale.company_id || '',
        sale_team_ids: sale.sale_team || [],
        name: `Restock: ${a.name}`,
        description: `Consumable supply "${a.name}" was marked RESTOCK NEEDED at pack-out of this sale.`,
        category: 'Post-Sale',
        status: 'not_started',
        priority: 'medium',
      });
      setTaskMsg(`Restock task created for ${a.name}.`);
    } catch (e) {
      console.error(e);
      setTaskMsg('Could not create the restock task.');
    }
  };

  const addTemplateTasks = async (key) => {
    const tpl = CHECKLIST_TEMPLATES[key];
    setBusy(true);
    setTaskMsg('');
    try {
      const existing = asList(await base44.entities.SaleTask.filter({ sale_id: sale.id }));
      const names = new Set(existing.map(t => t.name.toLowerCase()));
      const additions = tpl.tasks
        .filter(t => !names.has(t.name.toLowerCase()))
        .map((t, i) => ({
          sale_id: sale.id, operator_id: sale.operator_id, company_id: sale.company_id || '',
          sale_team_ids: sale.sale_team || [], name: t.name, description: t.description,
          category: t.category, status: 'not_started', priority: 'medium', sort_order: 200 + i,
        }));
      if (additions.length === 0) { setTaskMsg(`${tpl.label} tasks already exist on this sale.`); return; }
      await base44.entities.SaleTask.bulkCreate(additions);
      setTaskMsg(`Added ${additions.length} ${tpl.label} task(s) to SaleTasks.`);
    } catch (e) {
      console.error(e);
      setTaskMsg('Could not add the checklist tasks.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="p-8 animate-pulse"><div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div><div className="h-64 bg-slate-200 rounded"></div></div>;
  }
  if (!sale) return <div className="p-8 text-slate-500">Sale not found.</div>;

  const stats = {
    expected: assignments.length,
    packed: assignments.filter(a => a.packed).length,
    returned: assignments.filter(a => a.packout_state === 'RETURNED').length,
    unresolved: assignments.filter(a => a.packed && a.packout_state === 'PENDING' && a.entry_type === 'REUSABLE_EQUIPMENT').length,
    restock: assignments.filter(a => a.restock_needed).length,
  };
  const assetById = Object.fromEntries(assets.map(a => [a.id, a.name]));
  const categories = [...new Set(assignments.map(a => a.category || 'OTHER'))];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MySales'))} className="text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Sales
          </Button>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 break-words">{sale.title}</h1>
          <p className="text-slate-600">Load Out / Pack Out — company equipment for this sale</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ['Expected', stats.expected, 'text-slate-700'],
          ['Packed', stats.packed, 'text-green-600'],
          ['Returned', stats.returned, 'text-green-600'],
          ['Unresolved', stats.unresolved, stats.unresolved > 0 ? 'text-red-600' : 'text-slate-700'],
          ['Restock needed', stats.restock, stats.restock > 0 ? 'text-amber-600' : 'text-slate-700'],
        ].map(([label, value, cls]) => (
          <Card key={label}><CardContent className="p-3">
            <div className="text-xs text-slate-500">{label}</div>
            <div className={`text-xl font-bold ${cls}`}>{value}</div>
          </CardContent></Card>
        ))}
      </div>

      {stats.unresolved > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-3 text-sm text-amber-800">
            {stats.unresolved} reusable asset(s) went to this sale with no ending recorded yet. Every company asset that leaves should have an ending.
          </CardContent>
        </Card>
      )}

      {/* Kit projection / sale-specific additions */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2"><Truck className="w-4 h-4 text-orange-600" />Sale Equipment List</CardTitle>
          {assignments.length === 0 && template && (
            <Button onClick={projectKit} disabled={busy} className="bg-orange-600 hover:bg-orange-700">
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Project "{template.name}"
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {assignments.length === 0 && !template && (
            <p className="text-sm text-slate-500">No standard sale kit yet — create one in Equipment &amp; Sale Kit, or add sale-specific requirements below.</p>
          )}
          {categories.map(cat => (
            <div key={cat} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{cat}</p>
              {assignments.filter(a => (a.category || 'OTHER') === cat).map(a => (
                <AssignmentCard
                  key={a.id}
                  a={a}
                  assetName={a.equipment_asset_id ? assetById[a.equipment_asset_id] : null}
                  onPatch={patchAssignment}
                  onDelete={deleteAssignment}
                  onRestockTask={createRestockTask}
                />
              ))}
            </div>
          ))}
          {taskMsg && <p className="text-sm text-slate-700">{taskMsg}</p>}

          {/* Sale-specific addition (never mutates the standard kit) */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><PackageMinus className="w-4 h-4 text-purple-600" />Add a sale-specific requirement</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <Input placeholder="e.g. Two extra clothing racks" value={addForm.name} onChange={e => setAddForm(s => ({ ...s, name: e.target.value }))} />
              <Select value={addForm.entry_type} onValueChange={v => setAddForm(s => ({ ...s, entry_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTRY_TYPES.map(t => <SelectItem key={t} value={t}>{ENTRY_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={addForm.category} onValueChange={v => setAddForm(s => ({ ...s, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KIT_CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              {addForm.entry_type === 'REUSABLE_EQUIPMENT' ? (
                <Select value={addForm.equipment_asset_id || 'none'} onValueChange={v => setAddForm(s => ({ ...s, equipment_asset_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Link asset (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific asset</SelectItem>
                    {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : <div />}
              <Button onClick={addSaleSpecific} disabled={busy} variant="outline">Add</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist templates (executed through the existing SaleTask system) */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-slate-600" />Operational Checklists (added to SaleTasks)</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(CHECKLIST_TEMPLATES).map(([key, tpl]) => (
            <Button key={key} variant="outline" size="sm" onClick={() => addTemplateTasks(key)} disabled={busy}>
              Add {tpl.label} tasks
            </Button>
          ))}
          <p className="w-full text-xs text-slate-500 pt-1">Security completion means CHECKLIST REVIEWED — never a safety or security certification.</p>
        </CardContent>
      </Card>

      <AiChecklistPanel sale={sale} />
    </div>
  );
}