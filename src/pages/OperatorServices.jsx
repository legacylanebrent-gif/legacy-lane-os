import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Loader2, Package } from 'lucide-react';

const SERVICE_TYPES = [
  { value: 'estate_sale', label: 'Estate Sale' },
  { value: 'downsizing_sale', label: 'Downsizing Sale' },
  { value: 'moving_sale', label: 'Moving Sale' },
  { value: 'living_estate_sale', label: 'Living Estate Sale' },
  { value: 'cleanout_coordination', label: 'Cleanout Coordination' },
  { value: 'buyout', label: 'Buyout' },
  { value: 'donation_coordination', label: 'Donation Coordination' },
  { value: 'specialty', label: 'Specialty / Other' },
];

const STARTERS = [
  { service_type: 'estate_sale', display_name: 'Estate Sale', description: 'Full-service estate sale: inventory, pricing, staging, sale-day operations, and settlement.' },
  { service_type: 'downsizing_sale', display_name: 'Downsizing Sale', description: 'Helping seniors and families downsize with a managed sale of unneeded contents.' },
  { service_type: 'moving_sale', display_name: 'Moving Sale', description: 'Sale coordination for a household preparing to move.' },
  { service_type: 'living_estate_sale', display_name: 'Living Estate Sale', description: 'Managed sale for a client who is still living in the home.' },
  { service_type: 'cleanout_coordination', display_name: 'Cleanout Coordination', description: 'Coordinating cleanout services after the sale ends (typically outside the base package).' },
  { service_type: 'buyout', display_name: 'Buyout', description: 'Whole-contents buyout offers for suitable properties.' },
  { service_type: 'donation_coordination', display_name: 'Donation Coordination', description: 'Arranging donation pickup for unsold items after the sale.' },
];

const EMPTY_FORM = {
  id: null,
  service_type: 'estate_sale',
  display_name: '',
  description: '',
  public_description: '',
  enabled: true,
  included_by_default: true,
  additional_charge_possible: false,
  scope_notes: '',
  sort_order: 0,
};

export default function OperatorServices() {
  const [services, setServices] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    try {
      const user = await base44.auth.me();
      const items = await base44.entities.OperatorService.filter({ operator_id: user.id });
      items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setServices(items);
    } catch (e) {
      setServices([]);
    }
  };

  const openAdd = (starter) => {
    setForm(starter ? { ...EMPTY_FORM, ...starter } : { ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setForm({
      id: s.id,
      service_type: s.service_type,
      display_name: s.display_name,
      description: s.description || '',
      public_description: s.public_description || '',
      enabled: s.enabled !== false,
      included_by_default: s.included_by_default !== false,
      additional_charge_possible: !!s.additional_charge_possible,
      scope_notes: s.scope_notes || '',
      sort_order: s.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) return;
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const payload = {
        operator_id: user.id,
        company_id: user.company_id || undefined,
        service_type: form.service_type,
        display_name: form.display_name.trim(),
        description: form.description,
        public_description: form.public_description,
        enabled: form.enabled,
        included_by_default: form.included_by_default,
        additional_charge_possible: form.additional_charge_possible,
        scope_notes: form.scope_notes,
        sort_order: Number(form.sort_order) || 0,
      };
      if (form.id) {
        await base44.entities.OperatorService.update(form.id, payload);
      } else {
        await base44.entities.OperatorService.create(payload);
      }
      setDialogOpen(false);
      await loadServices();
    } catch (e) {
      alert('Could not save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Remove "${s.display_name}" from your catalog? Sales already using it keep their snapshot.`)) return;
    try {
      await base44.entities.OperatorService.delete(s.id);
      await loadServices();
    } catch (e) {
      alert('Could not delete: ' + e.message);
    }
  };

  const toggleEnabled = async (s) => {
    try {
      await base44.entities.OperatorService.update(s.id, { enabled: !s.enabled });
      await loadServices();
    } catch (e) {
      alert('Could not update: ' + e.message);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-6 h-6 text-cyan-600" /> Service Catalog
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          What your company generally offers. Your website explains these services, each sale selects from this
          catalog into an agreed scope, and agreements reference what the client actually hired you to do.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Start</CardTitle>
          <p className="text-xs text-slate-500">Add only what you actually offer — edit each to fit your business.</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {STARTERS.map(st => (
            <Button key={st.service_type} variant="outline" size="sm" onClick={() => openAdd(st)}>
              <Plus className="w-3.5 h-3.5" /> {st.display_name}
            </Button>
          ))}
          <Button size="sm" onClick={() => openAdd(null)}>
            <Plus className="w-3.5 h-3.5" /> Custom service
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My Services ({(services || []).length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {services === null && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}
          {services !== null && services.length === 0 && (
            <p className="text-sm text-slate-500 py-4">No services yet. Add the ones you actually offer above.</p>
          )}
          {(services || []).map(s => (
            <div key={s.id} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-900">{s.display_name}</span>
                  <Badge variant="outline">{(SERVICE_TYPES.find(t => t.value === s.service_type) || {}).label || s.service_type}</Badge>
                  {s.additional_charge_possible && <Badge className="bg-amber-100 text-amber-800 border-amber-200">May cost extra</Badge>}
                  {!s.enabled && <Badge variant="secondary">Disabled</Badge>}
                </div>
                {(s.public_description || s.description) && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.public_description || s.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => toggleEnabled(s)}>{s.enabled ? 'Disable' : 'Enable'}</Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Service type</Label>
              <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service name</Label>
              <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
            </div>
            <div>
              <Label>Description (internal)</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Public description (website-ready)</Label>
              <Textarea rows={3} value={form.public_description} onChange={e => setForm(f => ({ ...f, public_description: e.target.value }))} />
              <p className="text-xs text-slate-400 mt-1">Marketing may interpret verified facts — never invent them. No credentials, years, awards, or guarantees you have not verified.</p>
            </div>
            <div>
              <Label>Typical scope notes / boundaries</Label>
              <Textarea rows={2} value={form.scope_notes} onChange={e => setForm(f => ({ ...f, scope_notes: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>May carry an additional charge (only when the client authorizes it)</Label>
              <Switch checked={form.additional_charge_possible} onCheckedChange={v => setForm(f => ({ ...f, additional_charge_possible: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Usually included in the standard package</Label>
              <Switch checked={form.included_by_default} onCheckedChange={v => setForm(f => ({ ...f, included_by_default: v }))} />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.display_name.trim()}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}