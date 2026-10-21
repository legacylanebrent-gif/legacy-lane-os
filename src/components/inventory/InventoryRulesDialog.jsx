import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_RULES } from '@/components/saleops/inventoryLevels';

// Chapter 15 P1-9 — the smallest company-level deterministic inventory guidance.
// Operator-defined GUIDELINES stored on Company.inventory_rules; suggestions are shown
// to the employee at item creation, and the human always chooses the actual level.
export default function InventoryRulesDialog({ open, sale, onClose }) {
  const [company, setCompany] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && sale) load();
  }, [open, sale]);

  const load = async () => {
    setLoading(true);
    try {
      let companies = [];
      if (sale.company_id) {
        companies = await base44.entities.Company.filter({ id: sale.company_id });
      }
      if (!companies.length && sale.operator_id) {
        companies = await base44.entities.Company.filter({ primary_contact_user_id: sale.operator_id });
      }
      if (companies.length > 0) {
        setCompany(companies[0]);
        setRules(companies[0].inventory_rules || []);
      } else {
        setCompany(null);
        setRules([]);
      }
    } catch (e) {
      toast.error('Could not load company guidance');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!company) return;
    setSaving(true);
    try {
      await base44.entities.Company.update(company.id, { inventory_rules: rules.filter(r => r.suggested_level) });
      toast.success('Inventory guidance saved');
      onClose();
    } catch (e) {
      toast.error('Could not save guidance: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const setRule = (idx, patch) => {
    const next = [...rules];
    next[idx] = { ...next[idx], ...patch };
    setRules(next);
  };

  const addRule = () => setRules([...rules, { rule_id: `r-${Date.now()}`, enabled: true }]);
  const removeRule = idx => setRules(rules.filter((_, i) => i !== idx));

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventory guidance (company rules)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            These GUIDELINES suggest an inventory depth when your team creates items. They never set a level
            automatically — the person creating the item always chooses. Built-in defaults apply where you have no rule.
          </p>

          {!loading && !company && (
            <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded p-3">
              No company profile is linked to this sale, so only the built-in guidance applies. Built-in defaults:
              <span className="block mt-1 text-xs text-slate-500">
                {DEFAULT_RULES.filter(r => r.enabled).map(r => `${r.category ? r.category : `$${r.min_price}+`} → ${r.suggested_level}`).join(' · ')}
              </span>
            </p>
          )}

          {company && rules.length === 0 && (
            <p className="text-xs text-slate-400">No company rules yet — add one, or rely on the built-in defaults.</p>
          )}

          {company && rules.map((r, idx) => (
            <div key={r.rule_id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end border border-slate-200 rounded-lg p-2">
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-xs">Category</Label>
                <Input value={r.category || ''} onChange={e => setRule(idx, { category: e.target.value })} placeholder="jewelry" className="h-8 text-sm" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Min $</Label>
                <Input type="number" value={r.min_price ?? ''} onChange={e => setRule(idx, { min_price: e.target.value === '' ? undefined : Number(e.target.value) })} className="h-8 text-sm" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Max $</Label>
                <Input type="number" value={r.max_price ?? ''} onChange={e => setRule(idx, { max_price: e.target.value === '' ? undefined : Number(e.target.value) })} className="h-8 text-sm" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Suggest</Label>
                <select value={r.suggested_level || 'STANDARD'} onChange={e => setRule(idx, { suggested_level: e.target.value })} className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm">
                  <option value="QUICK">Quick</option>
                  <option value="STANDARD">Standard</option>
                  <option value="RESEARCH">Research</option>
                  <option value="HIGH_VALUE">High Value</option>
                </select>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Enabled</Label>
                <input type="checkbox" checked={r.enabled !== false} onChange={e => setRule(idx, { enabled: e.target.checked })} className="h-8" />
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => removeRule(idx)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
              </div>
              <div className="sm:col-span-12">
                <Input value={r.note || ''} onChange={e => setRule(idx, { note: e.target.value })} placeholder="Why — shown to the employee as guidance" className="h-8 text-sm" />
              </div>
            </div>
          ))}

          {company && (
            <Button size="sm" variant="outline" onClick={addRule} className="gap-2">
              <Plus className="w-4 h-4" /> Add rule
            </Button>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {company && (
            <Button onClick={save} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Saving…' : 'Save guidance'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}