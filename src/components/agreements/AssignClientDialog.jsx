import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, UserPlus } from 'lucide-react';

// ONE short form that puts a client on the sale: name, email, phone, relationship.
// Saving writes the sale's decision-maker record, the deal's client fields (what
// proposals and the contract merge) and the CRM contact, so contracts and
// communication can start right away — no authority paperwork to fill in first.
export default function AssignClientDialog({ open, onOpenChange, sale, deal, authorities, user, onDone }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', relationship: '' });
  const [isPrimary, setIsPrimary] = useState(true);
  const [verified, setVerified] = useState(true);
  const [toCrm, setToCrm] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const active = (authorities || []).filter(a => a.is_active);
    const primary = active.find(a => a.is_primary) || active[0];
    setForm({
      name: deal?.client_name || primary?.full_name || '',
      email: deal?.client_email || primary?.email || '',
      phone: deal?.client_phone || primary?.phone || '',
      relationship: primary?.relationship || '',
    });
    setIsPrimary(true);
    setVerified(true);
    setToCrm(true);
    setError('');
  }, [open, deal, authorities]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    const name = form.name.trim();
    if (!name) { setError('A client name is required.'); return; }
    const email = form.email.trim();
    const phone = form.phone.trim();
    setSaving(true);
    setError('');
    try {
      const existing = (authorities || []).find(a => a.is_active && (
        (email && a.email && a.email.toLowerCase() === email.toLowerCase()) ||
        (a.full_name || '').trim().toLowerCase() === name.toLowerCase()
      ));

      const payload = {
        sale_id: sale.id,
        operator_id: sale.operator_id,
        company_id: sale.company_id || '',
        sale_team_ids: sale.sale_team || [],
        full_name: name,
        email,
        phone,
        relationship: form.relationship.trim(),
        is_primary: isPrimary,
        authority_scopes: ['general_project'],
        verification_status: verified ? 'VERIFIED' : 'UNRESOLVED',
        source: 'Assigned by operator',
        is_active: true,
      };

      if (existing) {
        await base44.entities.SaleAuthority.update(existing.id, payload);
      } else {
        await base44.entities.SaleAuthority.create(payload);
      }

      if (isPrimary) {
        const others = (authorities || []).filter(a => a.is_active && a.is_primary && a.id !== existing?.id);
        for (const o of others) {
          await base44.entities.SaleAuthority.update(o.id, { is_primary: false });
        }
      }

      // Proposals and the contract merge the deal's client fields.
      if (deal?.id) {
        await base44.entities.SaleConversionPipeline.update(deal.id, {
          client_name: name, client_email: email, client_phone: phone,
        });
      } else {
        await base44.entities.SaleConversionPipeline.create({
          operator_id: sale.operator_id,
          estate_sale_id: sale.id,
          client_name: name,
          client_email: email,
          client_phone: phone,
          property_address: [sale.property_address?.street, sale.property_address?.city, sale.property_address?.state].filter(Boolean).join(', '),
          notes: `Client assigned to ${sale.title}.`,
        });
      }

      // CRM contact, so messages and follow-up can begin immediately.
      if (toCrm && email && user?.id) {
        const dupe = await base44.entities.Connection.filter({ account_owner_id: user.id, connected_user_email: email });
        if (!dupe.length) {
          await base44.entities.Connection.create({
            account_owner_id: user.id,
            account_owner_type: user.primary_account_type || 'estate_sale_operator',
            connected_user_name: name,
            connected_user_email: email,
            connected_user_phone: phone,
            connection_type: 'client',
            status: 'connected',
            notes: `Client on sale: ${sale.title}`,
          });
        }
      }

      onOpenChange(false);
      onDone(`${name} is now the client on this sale — proposals and the contract use their details.`);
    } catch (e) {
      console.error(e);
      setError('Could not assign the client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign client to this sale</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            One step: the client is recorded as the decision-maker, saved to the deal that proposals and the contract read from, and added to your CRM.
          </p>
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
            </div>
          )}
          <div>
            <Label>Client name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@email.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 123-4567" />
            </div>
          </div>
          <div>
            <Label>Relationship to the estate</Label>
            <Input value={form.relationship} onChange={e => set('relationship', e.target.value)} placeholder="Executor, son of owner, attorney…" />
          </div>
          <div className="space-y-1.5 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />
              Primary decision-maker for this sale
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} />
              Mark authority verified (I have established they can instruct this sale)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={toCrm} onChange={e => setToCrm(e.target.checked)} disabled={!form.email.trim()} />
              Add to CRM contacts{!form.email.trim() ? ' (needs an email)' : ''}
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
              {saving ? 'Assigning…' : 'Assign client'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}