import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X, ShieldOff } from 'lucide-react';

// Add/edit a minimal worker record (person directory — not payroll, not an
// HRIS). Deliberately no fields for SSN, tax IDs, bank details, medical
// data, payroll credentials, IDs, or background-check data.
export default function TeamMemberModal({ open, member, operatorId, platformUsers, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm(member ? {
      name: member.name || '',
      role: member.role || '',
      user_id: member.user_id || '',
      default_hourly_rate: member.default_hourly_rate != null ? String(member.default_hourly_rate) : '',
      skills: (member.skills || []).join(', '),
      status: member.status || 'ACTIVE',
      phone: member.phone || '',
      email: member.email || '',
      notes: member.notes || '',
    } : {
      name: '', role: '', user_id: '', default_hourly_rate: '', skills: '', status: 'ACTIVE', phone: '', email: '', notes: '',
    });
  }, [open, member]);

  if (!open || !form) return null;
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return alert('Enter a name');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: (form.role || '').trim(),
        user_id: form.user_id || null,
        default_hourly_rate: form.default_hourly_rate === '' ? null : parseFloat(form.default_hourly_rate),
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        status: form.status,
        phone: (form.phone || '').trim(),
        email: (form.email || '').trim(),
        notes: (form.notes || '').trim(),
      };
      if (member) {
        const updated = await base44.entities.TeamMember.update(member.id, payload);
        onSaved(updated);
      } else {
        const created = await base44.entities.TeamMember.create({ ...payload, operator_id: operatorId });
        onSaved(created);
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert('Could not save the team member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 space-y-3 my-8">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{member ? 'Edit team member' : 'Add team member'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Maria Lopez" />
          </div>
          <div>
            <Label>Role</Label>
            <Input value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Crew lead" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Platform account</Label>
            <Select value={form.user_id || 'none'} onValueChange={v => set('user_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No account (helper)</SelectItem>
                {(platformUsers || []).map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Default hourly rate ($)</Label>
            <Input type="number" step="0.01" min="0" value={form.default_hourly_rate} onChange={e => set('default_hourly_rate', e.target.value)} placeholder="e.g. 20" />
            <p className="text-[10px] text-slate-400 mt-0.5">Copied into new labor entries; past entries keep their own rate.</p>
          </div>
          <div>
            <Label>Skills</Label>
            <Input value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="e.g. staging, POS, heavy lifting" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Phone (optional)</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <Label>Email (optional)</Label>
            <Input value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-500">
          <ShieldOff className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
          <span>This is a worker directory, not payroll: no Social Security numbers, tax IDs, bank details, medical, or background-check data belong here.</span>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {member ? 'Save changes' : 'Add team member'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}