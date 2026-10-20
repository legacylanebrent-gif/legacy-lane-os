import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ShieldCheck, UserPlus, Loader2 } from 'lucide-react';
import { AUTHORITY_SCOPES, scopeLabel, fmtDate } from './saleDecisionModel';

const EMPTY = {
  full_name: '', email: '', phone: '', relationship: '', authority_role: '',
  authority_scopes: ['general_project'], is_primary: false,
  effective_from: '', effective_until: '', source: '', evidence_ref: '', notes: '',
};

export default function AuthorityPanel({ sale, user, authorities, onChanged }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const activeAuthorities = authorities.filter(a => a.is_active);
  const inactiveAuthorities = authorities.filter(a => !a.is_active);

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowDialog(true); };
  const openEdit = (a) => {
    setEditing(a);
    setForm({
      full_name: a.full_name || '', email: a.email || '', phone: a.phone || '',
      relationship: a.relationship || '', authority_role: a.authority_role || '',
      authority_scopes: a.authority_scopes?.length ? a.authority_scopes : ['general_project'],
      is_primary: !!a.is_primary, effective_from: a.effective_from || '',
      effective_until: a.effective_until || '', source: a.source || '',
      evidence_ref: a.evidence_ref || '', notes: a.notes || '',
    });
    setShowDialog(true);
  };

  const toggleScope = (key) => {
    setForm(f => ({
      ...f,
      authority_scopes: f.authority_scopes.includes(key)
        ? f.authority_scopes.filter(s => s !== key)
        : [...f.authority_scopes, key],
    }));
  };

  const save = async () => {
    if (!form.full_name.trim()) { alert('Name is required'); return; }
    setSaving(true);
    try {
      const base = {
        sale_id: sale.id,
        operator_id: sale.operator_id,
        company_id: sale.company_id || '',
        sale_team_ids: sale.sale_team || [],
      };
      if (editing) {
        await base44.entities.SaleAuthority.update(editing.id, { ...form });
      } else {
        await base44.entities.SaleAuthority.create({ ...base, ...form, is_active: true });
      }
      setShowDialog(false);
      onChanged();
    } catch (e) {
      console.error(e);
      alert('Could not save decision-maker');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (a, active) => {
    try {
      await base44.entities.SaleAuthority.update(a.id, {
        is_active: active,
        deactivated_at: active ? '' : new Date().toISOString(),
        deactivated_by: active ? '' : (user?.id || ''),
      });
      onChanged();
    } catch (e) {
      console.error(e);
      alert('Could not update decision-maker');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          People authorized to give instructions on this sale. Communication history and portal access do not grant authority.
        </p>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" />Add Decision-Maker</Button>
      </div>

      {activeAuthorities.length === 0 && inactiveAuthorities.length === 0 && (
        <Card><CardContent className="p-8 text-center text-slate-500">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p>No decision-makers recorded yet. Authority status for this sale is <strong>NOT RECORDED</strong>.</p>
        </CardContent></Card>
      )}

      {activeAuthorities.map(a => (
        <Card key={a.id} className="border-cyan-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{a.full_name}</span>
                  {a.is_primary && <Badge className="bg-cyan-100 text-cyan-700">PRIMARY</Badge>}
                  {a.authority_role && <Badge variant="outline">{a.authority_role}</Badge>}
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{a.relationship || 'Relationship not recorded'}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(a.authority_scopes || []).map(s => (
                    <Badge key={s} variant="secondary" className="text-xs">{scopeLabel(s)}</Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {a.source ? `Established via: ${a.source}. ` : 'Source not recorded. '}
                  {a.effective_from ? `Effective from ${fmtDate(a.effective_from)}.` : ''}
                  {a.effective_until ? ` Expires ${fmtDate(a.effective_until)}.` : ''}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => openEdit(a)}>Edit</Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setActive(a, false)}>Deactivate</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {inactiveAuthorities.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Deactivated (history preserved)</p>
          {inactiveAuthorities.map(a => (
            <Card key={a.id} className="opacity-70">
              <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-slate-700">{a.full_name}</span>
                  <span className="text-xs text-slate-500 ml-2">Deactivated {fmtDate(a.deactivated_at)}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(a)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => setActive(a, true)}>Reactivate</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Decision-Maker' : 'Add Authorized Decision-Maker'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Jane Smith" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Relationship to estate</Label><Input value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} placeholder="Executor, Son of owner…" /></div>
              <div><Label>Authority role</Label><Input value={form.authority_role} onChange={e => setForm(f => ({ ...f, authority_role: e.target.value }))} placeholder="Primary executor…" /></div>
            </div>
            <div>
              <Label>Authority scope</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {AUTHORITY_SCOPES.map(s => (
                  <button key={s.key} type="button" onClick={() => toggleScope(s.key)}
                    className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${form.authority_scopes.includes(s.key) ? 'bg-cyan-100 border-cyan-400 text-cyan-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.is_primary} onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))} />
              Primary decision-maker for this sale
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Effective from</Label><Input type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} /></div>
              <div><Label>Effective until</Label><Input type="date" value={form.effective_until} onChange={e => setForm(f => ({ ...f, effective_until: e.target.value }))} /></div>
            </div>
            <div><Label>Source / how verified</Label><Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Signed contract, letters testamentary, client call…" /></div>
            <div><Label>Evidence reference</Label><Input value={form.evidence_ref} onChange={e => setForm(f => ({ ...f, evidence_ref: e.target.value }))} placeholder="Contract ID, document reference…" /></div>
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}{editing ? 'Save' : 'Add'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}