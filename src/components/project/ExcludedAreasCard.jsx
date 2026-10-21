// Chapter 13 P1 — EXCLUDED AREAS (P1-22/P1-23): areas EXCLUDED / RESTRICTED
// FROM SALE, team-safe by design (names/notes only — access codes stay in the
// operator-only site assessment). Each area can carry a CLIENT/FAMILY ACTION
// DEADLINE, deliberately distinct from any team task due date.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Ban, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const AREA_TYPES = ['room', 'closet', 'cabinet', 'storage', 'outbuilding', 'other'];
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ExcludedAreasCard({ sale, onChanged }) {
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'room', note: '', family_deadline: '' });
  const areas = (sale && sale.excluded_areas) || [];

  const saveAreas = async (next, message) => {
    setSaving(true);
    try {
      await base44.entities.EstateSale.update(sale.id, { excluded_areas: next });
      toast.success(message);
      onChanged && onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Could not save the excluded areas');
    } finally {
      setSaving(false);
    }
  };

  const add = async () => {
    if (!form.name.trim()) { toast.error('Area name is required'); return; }
    const next = [...areas, {
      area_id: crypto.randomUUID(),
      name: form.name.trim(),
      type: form.type,
      note: form.note.trim(),
      family_deadline: form.family_deadline || '',
      resolved: false,
    }];
    await saveAreas(next, 'Area marked excluded');
    setShowNew(false);
    setForm({ name: '', type: 'room', note: '', family_deadline: '' });
  };

  const toggleResolved = async (a) => {
    const next = areas.map((x) => x.area_id === a.area_id
      ? { ...x, resolved: !x.resolved, resolved_at: !x.resolved ? new Date().toISOString() : null }
      : x);
    await saveAreas(next, x_resolved(a));
  };
  const x_resolved = (a) => a.resolved ? 'Area reopened' : 'Area marked handled';

  const remove = async (a) => {
    const next = areas.filter((x) => x.area_id !== a.area_id);
    await saveAreas(next, 'Excluded area removed');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Ban className="w-5 h-5 text-red-500" /> Excluded / Restricted Areas
          <Badge variant="outline" className="ml-1">{areas.filter((a) => !a.resolved).length} active</Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">
          Areas the client retains or restricts. Team-safe: names and notes only — never access codes.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {areas.length === 0 && <p className="text-sm text-slate-400 text-center py-1">No excluded areas recorded.</p>}
        {areas.map((a) => {
          const overdue = a.family_deadline && !a.resolved && a.family_deadline < todayStr();
          return (
            <div key={a.area_id} className={`p-3 border rounded-lg space-y-1.5 ${a.resolved ? 'bg-green-50/50 border-green-200' : overdue ? 'bg-red-50/60 border-red-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{a.name}
                    <span className="text-xs text-slate-400 ml-1.5 capitalize">({(a.type || 'room').replace(/_/g, ' ')})</span>
                  </p>
                  {a.note && <p className="text-xs text-slate-500">{a.note}</p>}
                </div>
                {a.resolved
                  ? <Badge className="bg-green-100 text-green-700 border-green-300 flex-shrink-0">HANDLED</Badge>
                  : <Badge className="bg-red-100 text-red-700 border-red-300 flex-shrink-0">EXCLUDED</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                {a.family_deadline && (
                  <span>Family deadline:{' '}
                    <span className={`font-medium ${overdue ? 'text-red-600' : 'text-slate-700'}`}>{a.family_deadline}</span>
                    {overdue && <span className="text-red-600 font-semibold"> (overdue)</span>}
                  </span>
                )}
                <span className="text-slate-400">A family deadline is the client's commitment — not a team task due date.</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleResolved(a)} disabled={saving}>
                  {a.resolved ? 'Reopen' : 'Mark Handled'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a)} disabled={saving}>Remove</Button>
              </div>
            </div>
          );
        })}
        <Button size="sm" variant="outline" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-1" />Mark Area Excluded
        </Button>

        <Dialog open={showNew} onOpenChange={(o) => { if (!o) setShowNew(false); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Mark an Area Excluded / Restricted</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Area *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Primary bedroom closet" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AREA_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Family action deadline</Label>
                  <Input type="date" value={form.family_deadline} onChange={(e) => setForm((f) => ({ ...f, family_deadline: e.target.value }))} /></div>
              </div>
              <div><Label>Note (team-safe — no access codes)</Label>
                <Textarea rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button onClick={add} disabled={saving || !form.name.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}