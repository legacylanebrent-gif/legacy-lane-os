import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Pencil, Clock, DollarSign, User } from 'lucide-react';
import { asArray } from '@/components/saleops/saleDecisionModel';
import {
  LABOR_CATEGORIES, laborCategoryLabel, money,
  totalLaborHours, ownerHours, cashLaborFromHours,
} from '@/components/saleops/saleEconomicsModel';

// Chapter 4 P1 — canonical LaborEntry workflow for a sale. Hours in; cash cost DERIVED.
// Owner time is tracked as hours only and is never silently counted as cash cost.
// This is not a payroll system.

const today = () => new Date().toISOString().split('T')[0];
const emptyForm = () => ({
  member: 'owner', member_name: '', user_id: '',
  work_category: 'preparation', entry_date: today(),
  hours: '', hourly_rate: '', is_owner_time: false, notes: '',
});

function LaborSummary({ entries }) {
  const byCategory = {};
  const byPerson = {};
  entries.forEach(e => {
    byCategory[e.work_category] = (byCategory[e.work_category] || 0) + (Number(e.hours) || 0);
    const p = e.member_name || e.user_id || 'Unknown';
    byPerson[p] = (byPerson[p] || 0) + (Number(e.hours) || 0);
  });
  const cash = cashLaborFromHours(entries);
  const owner = ownerHours(entries);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card><CardContent className="p-3">
        <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />Total actual hours</div>
        <div className="text-lg font-bold text-slate-900">{totalLaborHours(entries).toFixed(1)}</div>
      </CardContent></Card>
      <Card><CardContent className="p-3">
        <div className="text-xs text-slate-500 flex items-center gap-1"><DollarSign className="w-3 h-3" />Cash labor cost</div>
        <div className="text-lg font-bold text-green-700">{money(cash)}</div>
        <div className="text-[10px] text-slate-400">paid hours × rate</div>
      </CardContent></Card>
      <Card><CardContent className="p-3">
        <div className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" />Owner time</div>
        <div className="text-lg font-bold text-orange-600">{owner.toFixed(1)} hrs</div>
        <div className="text-[10px] text-slate-400">not cash cost</div>
      </CardContent></Card>
      <Card><CardContent className="p-3">
        <div className="text-xs text-slate-500">Entries</div>
        <div className="text-lg font-bold text-slate-900">{entries.length}</div>
      </CardContent></Card>
      {Object.keys(byCategory).length > 0 && (
        <Card className="col-span-2 md:col-span-4"><CardContent className="p-3">
          <div className="text-xs text-slate-500 mb-1.5">Hours by category</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, hrs]) => (
              <Badge key={cat} variant="outline" className="bg-slate-50">{laborCategoryLabel(cat)}: {hrs.toFixed(1)}h</Badge>
            ))}
          </div>
          <div className="text-xs text-slate-500 mt-2 mb-1.5">Hours by person</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(byPerson).sort((a, b) => b[1] - a[1]).map(([p, hrs]) => (
              <Badge key={p} variant="outline" className="bg-cyan-50">{p}: {hrs.toFixed(1)}h</Badge>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

export default function LaborEntriesPanel({ saleId }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [team, setTeam] = useState([]); // [{id, name}]
  const [workers, setWorkers] = useState([]); // Chapter 6 P1 worker directory (TeamMember records)
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [saleId]);

  const load = async () => {
    if (!saleId) return;
    setLoading(true);
    try {
      const [saleRes, entryRes] = await Promise.all([
        base44.entities.EstateSale.filter({ id: saleId }),
        base44.entities.LaborEntry.filter({ sale_id: saleId }),
      ]);
      const sale = saleRes[0];
      setEntries(asArray(entryRes));
      // Resolve team member names for the picker (best effort; helpers can always be typed by name).
      try {
        const ids = (sale?.sale_team || []).filter(Boolean);
        if (ids.length) {
          const users = await base44.entities.User.filter({ id: { $in: ids } });
          setTeam(asArray(users).map(u => ({ id: u.id, name: u.full_name || u.email || 'Team member' })));
        }
      } catch { /* team name resolution is cosmetic — helper-by-name always works */ }
      // Chapter 6 P1 — worker directory: consistent identity + default rate.
      try {
        const workers = await base44.entities.TeamMember.filter({ operator_id: sale?.operator_id, status: 'ACTIVE' });
        setWorkers(asArray(workers));
      } catch { /* directory unavailable for this viewer — sale team + helper-by-name still work */ }
    } catch (e) {
      console.error('Labor load failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const hours = parseFloat(form.hours);
    if (!hours || hours <= 0) return alert('Enter hours greater than 0');
    setSaving(true);
    try {
      const saleRes = await base44.entities.EstateSale.filter({ id: saleId });
      const sale = saleRes[0];
      const payload = {
        work_category: form.work_category,
        entry_date: form.entry_date,
        hours,
        hourly_rate: form.is_owner_time || form.hourly_rate === '' ? null : parseFloat(form.hourly_rate) || null,
        is_owner_time: !!form.is_owner_time,
        notes: form.notes || '',
        member_name: form.member === 'owner' ? 'Owner' : (
          form.member.startsWith('worker:')
            ? (workers.find(w => w.id === form.member.replace('worker:', ''))?.name || 'Worker')
            : (form.member_name || 'Team member')
        ),
        user_id: form.member.startsWith('team:') ? form.member.replace('team:', '')
          : (form.member.startsWith('worker:') ? (workers.find(w => w.id === form.member.replace('worker:', ''))?.user_id || null) : null),
        team_member_id: form.member.startsWith('worker:') ? form.member.replace('worker:', '') : null,
      };
      if (editingId) {
        await base44.entities.LaborEntry.update(editingId, payload);
      } else {
        await base44.entities.LaborEntry.create({
          ...payload,
          sale_id: saleId,
          operator_id: sale.operator_id,
          sale_team_ids: sale.sale_team || [],
        });
      }
      setForm(emptyForm());
      setEditingId(null);
      await load();
    } catch (e) {
      console.error(e);
      alert('Could not save the labor entry');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      member: entry.team_member_id ? `worker:${entry.team_member_id}` : (entry.user_id ? `team:${entry.user_id}` : (entry.is_owner_time ? 'owner' : 'helper')),
      member_name: entry.is_owner_time ? '' : (entry.member_name || ''),
      user_id: entry.user_id || '',
      work_category: entry.work_category,
      entry_date: (entry.entry_date || '').slice(0, 10) || today(),
      hours: String(entry.hours ?? ''),
      hourly_rate: entry.hourly_rate != null ? String(entry.hourly_rate) : '',
      is_owner_time: !!entry.is_owner_time,
      notes: entry.notes || '',
    });
  };

  const handleDelete = async (entry) => {
    if (!confirm('Delete this labor entry?')) return;
    try {
      await base44.entities.LaborEntry.delete(entry.id);
      await load();
    } catch (e) {
      alert('Could not delete this entry');
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading labor…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Labor Hours</h3>
        <p className="text-xs text-slate-500">
          Track hours worked on this sale. Paid hours × rate become cash labor cost; owner time is tracked as hours only and is never counted as cash cost.
        </p>
      </div>

      <LaborSummary entries={entries} />

      {/* Add / edit form */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">{editingId ? 'Edit entry' : 'Add labor entry'}</p>
            {editingId && (
              <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>Cancel edit</Button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Who worked</Label>
              <Select value={form.member} onValueChange={v => {
                if (v.startsWith('worker:')) {
                  const w = workers.find(x => x.id === v.replace('worker:', ''));
                  setForm(p => ({
                    ...p, member: v, member_name: w?.name || '', is_owner_time: false,
                    hourly_rate: w?.default_hourly_rate != null && p.hourly_rate === '' ? String(w.default_hourly_rate) : p.hourly_rate,
                  }));
                } else {
                  setForm(p => ({ ...p, member: v, is_owner_time: v === 'owner' }));
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner (my time)</SelectItem>
                  {team.map(t => <SelectItem key={t.id} value={`team:${t.id}`}>{t.name}</SelectItem>)}
                  {workers.filter(w => !w.user_id || !team.some(t => t.id === w.user_id)).map(w => (
                    <SelectItem key={w.id} value={`worker:${w.id}`}>{w.name}{w.default_hourly_rate != null ? ` ($${w.default_hourly_rate}/hr)` : ''}</SelectItem>
                  ))}
                  <SelectItem value="helper">Helper (by name)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Work category</Label>
              <Select value={form.work_category} onValueChange={v => setForm(p => ({ ...p, work_category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LABOR_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.member === 'helper' && (
              <div>
                <Label>Helper name</Label>
                <Input value={form.member_name} onChange={e => setForm(p => ({ ...p, member_name: e.target.value }))} placeholder="e.g. Maria (crew)" />
              </div>
            )}
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.entry_date} onChange={e => setForm(p => ({ ...p, entry_date: e.target.value }))} />
            </div>
            <div>
              <Label>Hours</Label>
              <Input type="number" step="0.25" min="0" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))} placeholder="e.g. 6.5" />
            </div>
            {!form.is_owner_time && (
              <div>
                <Label>Hourly rate ($)</Label>
                <Input type="number" step="0.01" min="0" value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} placeholder="e.g. 20" />
                <p className="text-[10px] text-slate-400 mt-0.5">Blank = unpaid help (hours only, no cash cost)</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="owner-time" checked={form.is_owner_time} onCheckedChange={v => setForm(p => ({ ...p, is_owner_time: !!v, member: !!v ? 'owner' : p.member }))} />
            <Label htmlFor="owner-time" className="text-sm font-normal cursor-pointer">Owner time (my own hours — not a cash wage cost)</Label>
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional note" />
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            {editingId ? 'Save Changes' : 'Add Entry'}
          </Button>
        </CardContent>
      </Card>

      {/* Entries list */}
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No labor hours recorded for this sale yet.</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map(e => (
            <div key={e.id} className={`flex items-center gap-3 p-3 rounded-lg border ${e.is_owner_time ? 'bg-orange-50 border-orange-100' : 'bg-white border-slate-200'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {e.member_name || 'Team member'} · {laborCategoryLabel(e.work_category)} · {(Number(e.hours) || 0).toFixed(1)} hrs
                  {e.is_owner_time && <Badge className="ml-2 bg-orange-100 text-orange-700">OWNER TIME</Badge>}
                </p>
                <p className="text-xs text-slate-500">
                  {(e.entry_date || '').slice(0, 10)}
                  {e.hourly_rate != null && !e.is_owner_time && ` · ${money(e.hourly_rate)}/hr = ${money((Number(e.hours) || 0) * (Number(e.hourly_rate) || 0))} cash`}
                  {e.notes ? ` · ${e.notes}` : ''}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleEdit(e)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(e)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}