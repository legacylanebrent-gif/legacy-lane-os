// Chapter 19 P1-8..P1-10 — operator STAFFING panel: responsibility
// assignment, deterministic coverage checks, availability and skills
// guidance, planned-hours compare. Reuses TeamMember + the new
// SaleStaffAssignment record; it owns no second truth.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  RESPONSIBILITY_TYPES, TYPE_LABEL, requiredResponsibilities, coverageGaps,
  availabilityState, AVAILABILITY_BADGE, membersWithSkill, laborCompare,
} from './staffingModel';

const blankForm = () => ({
  responsibility_type: 'CHECKOUT', zone_id: '', primary: '', backup: '', planned_hours: '', notes: '',
});

export default function StaffingPanel({ sale, items, linkedDeal, onChanged }) {
  const [assignments, setAssignments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | existing record
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!sale) return;
    setLoading(true);
    try {
      const [a, m] = await Promise.all([
        base44.entities.SaleStaffAssignment.filter({ sale_id: sale.id }),
        base44.entities.TeamMember.filter({ operator_id: sale.operator_id }),
      ]);
      setAssignments(Array.isArray(a) ? a : a.items || []);
      setMembers(Array.isArray(m) ? m : m.items || []);
    } catch (e) {
      console.error(e);
      toast.error('Could not load staffing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sale?.id]);

  const required = requiredResponsibilities({ sale, items });
  const gaps = coverageGaps(required, assignments);
  const active = assignments.filter((a) => (a.status || 'ACTIVE') === 'ACTIVE');
  const cleared = assignments.filter((a) => a.status === 'CLEARED');
  const labor = laborCompare({ assignments: active, deal: linkedDeal });
  const memberById = (id) => members.find((m) => m.id === id);

  const openNew = () => { setForm(blankForm()); setEditing('new'); };
  const openEdit = (a) => {
    setForm({
      responsibility_type: a.responsibility_type, zone_id: a.zone_id || '',
      primary: a.primary_team_member_id || '', backup: a.backup_team_member_id || '',
      planned_hours: a.planned_hours != null ? String(a.planned_hours) : '', notes: a.notes || '',
    });
    setEditing(a);
  };

  const save = async () => {
    const primary = memberById(form.primary);
    const backup = memberById(form.backup);
    const zone = (sale.prep_zones || []).find((z) => z.zone_id === form.zone_id);
    const payload = {
      sale_id: sale.id,
      operator_id: sale.operator_id,
      company_id: sale.company_id || '',
      sale_team_ids: sale.sale_team || [],
      responsibility_type: form.responsibility_type,
      zone_id: form.zone_id || '',
      zone_name: zone ? zone.name : '',
      primary_team_member_id: form.primary || '',
      primary_member_name: primary ? primary.name : '',
      primary_user_id: primary ? (primary.user_id || '') : '',
      backup_team_member_id: form.backup || '',
      backup_member_name: backup ? backup.name : '',
      backup_user_id: backup ? (backup.user_id || '') : '',
      status: 'ACTIVE',
      planned_hours: form.planned_hours === '' ? null : parseFloat(form.planned_hours),
      notes: (form.notes || '').trim(),
    };
    setSaving(true);
    try {
      if (editing === 'new') {
        await base44.entities.SaleStaffAssignment.create(payload);
        toast.success('Responsibility assigned');
      } else {
        await base44.entities.SaleStaffAssignment.update(editing.id, payload);
        toast.success('Responsibility updated');
      }
      setEditing(null);
      await load();
      onChanged && onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Could not save the assignment');
    } finally {
      setSaving(false);
    }
  };

  const clearAssignment = async (a) => {
    try {
      await base44.entities.SaleStaffAssignment.update(a.id, { status: 'CLEARED' });
      toast.success('Responsibility cleared (kept as history)');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Could not clear the assignment');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-700" /> Sale-Day Staffing
          {gaps.length > 0 && <Badge className="bg-amber-100 text-amber-800 border-amber-300">{gaps.length} unassigned</Badge>}
        </CardTitle>
        <p className="text-xs text-slate-500">
          Who is responsible for each sale-day function. Assignment truth only — not payroll, not authority.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading staffing…</div>}

        {/* Coverage check — deterministic from recorded truth */}
        <div className="rounded-lg border border-slate-200 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Coverage check</p>
          {required.length === 0 && <p className="text-xs text-slate-400">No staffing requirements are derivable yet (no checkout/entry plan, zones, or sold items recorded).</p>}
          {required.map((r, idx) => {
            const covered = !gaps.some((g) => g.type === r.type && g.zone_id === r.zone_id);
            const skilled = membersWithSkill(members, r.type).map((m) => m.name);
            return (
              <div key={`${r.type}-${r.zone_id}-${idx}`} className="text-xs flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={covered ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-700 border-red-300'}>
                  {covered ? 'COVERED' : 'UNASSIGNED'}
                </Badge>
                <span className="font-medium text-slate-700">{TYPE_LABEL[r.type]}{r.zone_name ? ` — ${r.zone_name}` : ''}</span>
                <span className="text-slate-400">{r.reason}</span>
                {!covered && skilled.length > 0 && <span className="text-cyan-700">Recorded skill: {skilled.join(', ')}</span>}
              </div>
            );
          })}
        </div>

        {labor.status !== 'UNKNOWN' && (
          <div className="text-xs flex flex-wrap items-center gap-2">
            <span className="text-slate-500">Planned hours: <span className="font-medium text-slate-700">{labor.planned}</span></span>
            <span className="text-slate-500">Deal estimate: <span className="font-medium text-slate-700">{labor.estimated}</span></span>
            {labor.status === 'REVIEW' && <Badge className="bg-amber-100 text-amber-800 border-amber-300">REVIEW PLANNED LABOR — above the deal estimate</Badge>}
            {labor.status === 'OK' && <Badge className="bg-green-100 text-green-700 border-green-300">WITHIN ESTIMATE</Badge>}
          </div>
        )}

        {/* Assignments */}
        <div className="space-y-2">
          {active.length === 0 && <p className="text-sm text-slate-400 text-center py-1">No responsibilities assigned yet.</p>}
          {active.map((a) => {
            const pm = memberById(a.primary_team_member_id);
            return (
              <div key={a.id} className="flex flex-wrap items-start gap-2 p-2.5 rounded-lg border border-slate-100 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">
                    {TYPE_LABEL[a.responsibility_type] || a.responsibility_type}{a.zone_name ? ` — ${a.zone_name}` : ''}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>Primary: <span className="font-medium text-slate-700">{a.primary_member_name || 'Unassigned'}</span></span>
                    {a.backup_member_name && <span>Backup: <span className="font-medium text-slate-700">{a.backup_member_name}</span></span>}
                    {a.planned_hours != null && <span>{a.planned_hours} planned hrs</span>}
                    {pm && sale.sale_dates && (
                      <Badge variant="outline" className={AVAILABILITY_BADGE[availabilityState(pm, sale.sale_dates)]}>
                        {availabilityState(pm, sale.sale_dates).replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  {a.notes && <p className="text-xs text-slate-500 mt-0.5">{a.notes}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => clearAssignment(a)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            );
          })}
        </div>

        {cleared.length > 0 && (
          <details>
            <summary className="text-xs text-slate-500 cursor-pointer">Cleared responsibilities ({cleared.length}) — kept as history</summary>
            <div className="mt-1.5 space-y-1">
              {cleared.map((a) => (
                <div key={a.id} className="text-xs text-slate-400 flex items-center justify-between">
                  <span>{TYPE_LABEL[a.responsibility_type]}{a.zone_name ? ` — ${a.zone_name}` : ''}: {a.primary_member_name}</span>
                  <button className="text-cyan-600" onClick={() => openEdit(a)}>Reassign</button>
                </div>
              ))}
            </div>
          </details>
        )}

        <Button size="sm" onClick={openNew} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="w-4 h-4 mr-1" />Assign responsibility
        </Button>

        <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing === 'new' ? 'Assign a responsibility' : 'Edit responsibility'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Function *</Label>
                  <Select value={form.responsibility_type} onValueChange={(v) => setForm((f) => ({ ...f, responsibility_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RESPONSIBILITY_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select></div>
                {form.responsibility_type === 'FLOOR_ZONE' ? (
                  <div><Label>Zone</Label>
                    <Select value={form.zone_id || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, zone_id: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Whole sale</SelectItem>
                        {(sale.prep_zones || []).map((z) => <SelectItem key={z.zone_id} value={z.zone_id}>{z.name}</SelectItem>)}
                      </SelectContent>
                    </Select></div>
                ) : <div /> }
              </div>
              {['Primary responsible', 'Backup / second'].map((roleLabel, i) => (
                <div key={roleLabel}>
                  <Label>{roleLabel}</Label>
                  <Select value={form[i === 0 ? 'primary' : 'backup'] || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, [i === 0 ? 'primary' : 'backup']: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}{m.role ? ` (${m.role})` : ''}
                          {sale.sale_dates ? ` — ${availabilityState(m, sale.sale_dates).replace(/_/g, ' ')}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div><Label>Planned hours (assumption)</Label>
                <Input type="number" min="0" step="0.5" value={form.planned_hours} onChange={(e) => setForm((f) => ({ ...f, planned_hours: e.target.value }))} placeholder="e.g. 6" /></div>
              <div><Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Team-safe context (no codes or credentials)" /></div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save} disabled={saving || !form.primary}>
                  {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}