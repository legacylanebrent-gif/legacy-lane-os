// Chapter 19 P1-28..P1-31 + Chapter 20 P1-32..P1-39 — ASK FOR HELP /
// ESCALATE / REPORT INCIDENT: the ONE escalation path (SaleIssue). A team
// member who hits the edge of their authority raises an issue (optionally
// URGENT, optionally with a PRIVATE photo, optionally linked to the canonical
// Item). An incident records FACTS ONLY (what/where/when/who/witnesses/
// immediate action) — never fault, blame, or legal conclusion. For real
// emergencies the human calls emergency services FIRST; this form only
// records facts. Never blocks the UI.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const HELP_CATEGORIES = [
  { key: 'pricing', label: 'Pricing / Discount' },
  { key: 'client_family', label: 'Client / Family' },
  { key: 'payment', label: 'Payment problem' },
  { key: 'merchandise', label: 'Merchandise' },
  { key: 'security', label: 'Security / Theft concern' },
  { key: 'safety', label: 'Safety' },
  { key: 'pickup', label: 'Pickup' },
  { key: 'customer_flow', label: 'Customer flow' },
  { key: 'checkout', label: 'Checkout' },
  { key: 'other', label: 'Other' },
];

const INCIDENT_TYPES = [
  { key: 'CUSTOMER_INJURY', label: 'Customer injury', category: 'safety' },
  { key: 'EMPLOYEE_INJURY', label: 'Employee injury', category: 'safety' },
  { key: 'PROPERTY_DAMAGE', label: 'Property damage', category: 'other' },
  { key: 'SUSPECTED_THEFT', label: 'Suspected theft', category: 'security' },
  { key: 'PAYMENT_DISPUTE', label: 'Payment dispute', category: 'payment' },
  { key: 'SECURITY', label: 'Security concern', category: 'security' },
  { key: 'OTHER', label: 'Other incident', category: 'other' },
];

const asArr = (r) => (Array.isArray(r) ? r : (r && r.items) || []);

export default function AskForHelpDialog({ sale, onClose, onCreated, defaultCategory, defaultUrgency }) {
  const [form, setForm] = useState({ title: '', description: '', category: defaultCategory || 'pricing', urgency: defaultUrgency || 'ROUTINE' });
  const [incident, setIncident] = useState(false);
  const [inc, setInc] = useState({ incident_type: 'CUSTOMER_INJURY', occurred_at: '', location_note: '', people_involved: '', witnesses: '', immediate_action_taken: '' });
  const [itemList, setItemList] = useState(null);
  const [itemId, setItemId] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleIncident = (val) => {
    setIncident(val);
    if (val) {
      set('urgency', 'URGENT');
      setIncidentType(inc.incident_type);
    }
  };

  const setIncidentType = (typeKey) => {
    const t = INCIDENT_TYPES.find((x) => x.key === typeKey);
    setInc((p) => ({ ...p, incident_type: typeKey }));
    if (t) set('category', t.category);
  };

  // Chapter 20 P1-38 — optional canonical Item link, loaded lazily.
  const loadItems = async () => {
    if (itemList || !sale?.id) return;
    try {
      const r = await base44.entities.Item.filter({ estate_sale_id: sale.id }, { limit: 200 });
      setItemList(asArr(r));
    } catch (e) {
      setItemList([]);
    }
  };

  const submit = async () => {
    if (!form.title.trim()) { toast.error('Say what you need in one line'); return; }
    setSaving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      let photo_uri = '';
      if (photoFile) {
        const up = await base44.integrations.Core.UploadPrivateFile({ file: photoFile });
        photo_uri = up?.file_uri || '';
      }
      await base44.entities.SaleIssue.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        company_id: sale.company_id || '',
        sale_team_ids: sale.sale_team || [],
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        urgency: form.urgency,
        status: 'OPEN',
        owner_user_id: sale.operator_id,
        owner_name: sale.operator_name || 'Operator',
        requested_by_name: me?.full_name || 'Team member',
        photo_uri,
        item_id: itemId || '',
        is_incident: incident,
        incident_type: incident ? inc.incident_type : undefined,
        occurred_at: incident && inc.occurred_at ? new Date(inc.occurred_at).toISOString() : undefined,
        location_note: incident ? inc.location_note.trim() : undefined,
        people_involved: incident ? inc.people_involved.trim() : undefined,
        witnesses: incident ? inc.witnesses.trim() : undefined,
        immediate_action_taken: incident ? inc.immediate_action_taken.trim() : undefined,
        source_type: 'MANUAL',
      });
      toast.success(incident
        ? 'Incident recorded with the facts — the operator sees it now'
        : form.urgency === 'URGENT' ? 'Sent — find the operator now' : 'Sent — the operator will see it');
      onCreated && onCreated();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Could not send — check your connection and try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{incident ? 'Report incident (facts only)' : 'Ask for help / escalate'}</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-500">
          {incident
            ? 'Record WHAT HAPPENED — time, place, people, what was done. No fault, no blame, no conclusions. The operator and admins see it; it is private from the rest of the team.'
            : 'This goes to the operator with your name on it. You will see the answer in My Sale Day once it is resolved.'}
        </p>
        {incident && (
          <div className="p-2 rounded bg-red-50 border border-red-200 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">
              If anyone is injured or in danger, call 911 / your local emergency services FIRST. This form records facts afterwards — it is not an emergency response.
            </p>
          </div>
        )}
        <div className="space-y-3">
          <div><Label>What do you need? *</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder={incident ? 'e.g. Customer slipped near the back steps' : 'e.g. Buyer offers $40 on the $60 lamp — can I take it?'} /></div>
          <div><Label>Details</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="Item number, who is involved, what you already told the customer…" /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)} disabled={incident}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{HELP_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>Urgency</Label>
              <Select value={form.urgency} onValueChange={(v) => set('urgency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Routine</SelectItem>
                  <SelectItem value="IMPORTANT">Important</SelectItem>
                  <SelectItem value="URGENT">Urgent — find the operator now</SelectItem>
                </SelectContent>
              </Select></div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-slate-700 py-1">
              <input type="checkbox" checked={incident} onChange={(e) => toggleIncident(e.target.checked)} />
              This is an incident (injury, damage, theft, payment or security event)
            </label>
          </div>

          {incident && (
            <div className="space-y-2.5 border border-slate-200 rounded p-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Incident type</Label>
                  <Select value={inc.incident_type} onValueChange={setIncidentType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INCIDENT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label className="text-xs">When it happened</Label>
                  <Input type="datetime-local" className="h-9 text-xs" value={inc.occurred_at}
                    onChange={(e) => setInc((p) => ({ ...p, occurred_at: e.target.value }))} /></div>
              </div>
              <div><Label className="text-xs">Where (room / area)</Label>
                <Input className="h-9 text-xs" value={inc.location_note} onChange={(e) => setInc((p) => ({ ...p, location_note: e.target.value }))} /></div>
              <div><Label className="text-xs">People involved (facts as reported)</Label>
                <Input className="h-9 text-xs" value={inc.people_involved} onChange={(e) => setInc((p) => ({ ...p, people_involved: e.target.value }))} /></div>
              <div><Label className="text-xs">Witnesses (facts)</Label>
                <Input className="h-9 text-xs" value={inc.witnesses} onChange={(e) => setInc((p) => ({ ...p, witnesses: e.target.value }))} /></div>
              <div><Label className="text-xs">Immediate action taken</Label>
                <Input className="h-9 text-xs" value={inc.immediate_action_taken} onChange={(e) => setInc((p) => ({ ...p, immediate_action_taken: e.target.value }))}
                  placeholder="e.g. area closed off, operator called" /></div>
            </div>
          )}

          <div>
            <Label className="flex items-center gap-1.5">
              <button type="button" className="text-cyan-700 underline text-xs" onClick={loadItems}>Link an item…</button>
              <span className="text-[10px] text-slate-400">(optional — for merchandise questions/incidents)</span>
            </Label>
            {itemList && (
              <select value={itemId} onChange={(e) => setItemId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm mt-1">
                <option value="">No specific item</option>
                {itemList.map((i) => <option key={i.id} value={i.id}>{i.title}{i.item_number ? ` (#${i.item_number})` : ''}</option>)}
              </select>
            )}
          </div>

          <div>
            <Label className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Photo (optional, stored privately)</Label>
            <input type="file" accept="image/*" className="text-xs text-slate-500 mt-1"
              onChange={(e) => setPhotoFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{incident ? 'Record incident' : 'Send to operator'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}