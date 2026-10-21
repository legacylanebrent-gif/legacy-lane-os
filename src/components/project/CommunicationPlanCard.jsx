// Chapter 13 P1 — COMMUNICATION PLAN (P1-11/P1-12): primary communication
// contact, preferred method, and update cadence on the active project.
// OPERATIONAL PREFERENCE ONLY — it is never marketing consent, and an SMS
// preference never creates SMS marketing consent. Nothing is auto-sent.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { COMM_METHODS, CADENCES } from '@/components/saleops/projectModel';

export default function CommunicationPlanCard({ sale, onChanged }) {
  const plan = sale?.communication_plan || {};
  const [form, setForm] = useState({
    primary_contact_name: plan.primary_contact_name || '',
    relationship: plan.relationship || '',
    preferred_method: plan.preferred_method || '',
    cadence: plan.cadence || '',
    update_note: plan.update_note || '',
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    const p = sale?.communication_plan || {};
    setForm({
      primary_contact_name: p.primary_contact_name || '',
      relationship: p.relationship || '',
      preferred_method: p.preferred_method || '',
      cadence: p.cadence || '',
      update_note: p.update_note || '',
    });
    setEditing(false);
  }, [sale?.id]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.EstateSale.update(sale.id, {
        communication_plan: {
          primary_contact_name: form.primary_contact_name.trim(),
          relationship: form.relationship.trim(),
          preferred_method: form.preferred_method || null,
          cadence: form.cadence || null,
          update_note: form.update_note.trim(),
        },
      });
      toast.success('Communication plan saved');
      setEditing(false);
      onChanged && onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Could not save the communication plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-cyan-700" /> Communication Plan
        </CardTitle>
        <p className="text-xs text-slate-500">
          Preference only — this never opts the client into marketing or SMS campaigns.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!editing ? (
          <div className="space-y-1.5 text-sm">
            <p><span className="text-slate-500">Primary contact:</span>{' '}
              <span className="font-medium">{plan.primary_contact_name || 'Not set'}</span>
              {plan.relationship ? <span className="text-slate-500"> ({plan.relationship})</span> : null}</p>
            <p><span className="text-slate-500">Preferred method:</span>{' '}
              <span className="font-medium">{plan.preferred_method ? plan.preferred_method : 'Unknown'}</span></p>
            <p><span className="text-slate-500">Update cadence:</span>{' '}
              <span className="font-medium">{plan.cadence ? plan.cadence.replace(/_/g, ' ').toLowerCase() : 'Not set'}</span>
              {plan.update_note ? <span className="text-slate-500"> — {plan.update_note}</span> : null}</p>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit Plan</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div><Label>Primary communication contact</Label>
              <Input value={form.primary_contact_name} onChange={(e) => setForm((f) => ({ ...f, primary_contact_name: e.target.value }))}
                placeholder="Who do you update routinely?" /></div>
            <div><Label>Relationship</Label>
              <Input value={form.relationship} onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                placeholder="e.g. daughter, executor" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preferred method</Label>
                <Select value={form.preferred_method || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, preferred_method: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Unknown" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unknown</SelectItem>
                    {COMM_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><Label>Update cadence</Label>
                <Select value={form.cadence || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, cadence: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {CADENCES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select></div>
            </div>
            <div><Label>Notes / custom cadence</Label>
              <Input value={form.update_note} onChange={(e) => setForm((f) => ({ ...f, update_note: e.target.value }))} /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}