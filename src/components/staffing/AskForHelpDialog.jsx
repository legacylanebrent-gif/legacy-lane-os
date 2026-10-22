// Chapter 19 P1-28..P1-31 — ASK FOR HELP / ESCALATE: a sale-team member who
// hits the edge of their authority raises a SaleIssue (the ONE escalation
// entity). Optionally URGENT, optionally with a PRIVATE photo. The employee
// can see the answer once the operator resolves it. Never blocks the UI.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Loader2 } from 'lucide-react';
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

export default function AskForHelpDialog({ sale, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'pricing', urgency: 'ROUTINE' });
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
        source_type: 'MANUAL',
      });
      toast.success(form.urgency === 'URGENT' ? 'Sent — find the operator now' : 'Sent — the operator will see it');
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
        <DialogHeader><DialogTitle>Ask for help / escalate</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-500">
          This goes to the operator with your name on it. You will see the answer in My Sale Day once it is resolved.
        </p>
        <div className="space-y-3">
          <div><Label>What do you need? *</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Buyer offers $40 on the $60 lamp — can I take it?" /></div>
          <div><Label>Details</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="Item number, who is involved, what you already told the customer…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
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
            <Label className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Photo (optional, stored privately)</Label>
            <input type="file" accept="image/*" className="text-xs text-slate-500 mt-1"
              onChange={(e) => setPhotoFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Send to operator
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}