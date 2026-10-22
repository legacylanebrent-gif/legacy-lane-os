// Chapter 20 P1-8/P1-9 + P1-53..P1-55 — ENTRY MODE (operator procedure —
// never a legal occupancy certification) and the CLIENT DAY PLAN (team-safe
// presence/instructions only; a client's presence is NEVER client authority).
// Both live on EstateSale; this card reads and edits those blocks.
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, DoorOpen, UserRound } from 'lucide-react';
import { toast } from 'sonner';

export default function EntryClientCard({ sale, onChanged }) {
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [entry, setEntry] = useState(sale.entry_management || {});
  const [client, setClient] = useState(sale.client_day_plan || {});
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    base44.auth.me().then((me) => {
      setCanEdit(!!me && (me.role === 'admin' || me.id === sale.operator_id));
    }).catch(() => setCanEdit(false));
  }, [sale.operator_id]);

  const save = async () => {
    setBusy(true);
    try {
      await base44.entities.EstateSale.update(sale.id, {
        entry_management: entry,
        client_day_plan: client,
      });
      toast.success('Entry procedure and client day plan saved');
      setEditing(false);
      onChanged && onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Could not save — only the operator can change these');
    } finally {
      setBusy(false);
    }
  };

  const mode = entry.mode;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <DoorOpen className="w-5 h-5 text-teal-700" /> Entry & Client Day
          {mode && <Badge variant="outline" className="text-[10px]">{mode === 'OPEN_ENTRY' ? 'OPEN ENTRY' : 'CAPACITY CONTROLLED'}</Badge>}
          {client.client_on_site && <Badge className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300">CLIENT ON SITE</Badge>}
          {client.client_expected && !client.client_on_site && <Badge variant="outline" className="text-[10px]">CLIENT EXPECTED{client.expected_time ? ` (${client.expected_time})` : ''}</Badge>}
        </CardTitle>
        <p className="text-xs text-slate-500">Operator procedure — never a legal occupancy certification. The team sees this in My Sale Day.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!editing ? (
          <>
            <div className="text-xs space-y-1">
              {mode ? (
                <>
                  <p><span className="font-semibold">Mode:</span> {mode === 'OPEN_ENTRY' ? 'Open entry — customers enter freely' : 'Capacity controlled'}</p>
                  {mode === 'CAPACITY_CONTROLLED' && <p><span className="font-semibold">Working target:</span> {entry.capacity_target || 'not set'}{entry.one_out_one_in ? ' · one-out-one-in' : ''}</p>}
                  {entry.procedure_note && <p><span className="font-semibold">Procedure:</span> {entry.procedure_note}</p>}
                  {entry.instructions && <p><span className="font-semibold">Instructions:</span> {entry.instructions}</p>}
                </>
              ) : <p className="text-slate-400">Entry procedure not set yet.</p>}
            </div>
            <div className="text-xs space-y-1 border-t border-slate-100 pt-2">
              <p className="font-semibold flex items-center gap-1"><UserRound className="w-3.5 h-3.5" /> Client day plan</p>
              {(client.client_expected || client.client_on_site || client.boundaries_note || client.instructions) ? (
                <>
                  {client.client_expected && <p>Client expected{client.expected_time ? ` (${client.expected_time})` : ''}.</p>}
                  {client.client_on_site && <p className="font-medium text-amber-800">Client is ON SITE — involve the operator for any client matter.</p>}
                  {client.boundaries_note && <p><span className="font-semibold">Boundaries:</span> {client.boundaries_note}</p>}
                  {client.instructions && <p><span className="font-semibold">Instructions:</span> {client.instructions}</p>}
                </>
              ) : <p className="text-slate-400">No client visit recorded. A client's presence is never client authority — decisions stay with the operator.</p>}
            </div>
            {canEdit && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit (operator)</Button>}
          </>
        ) : (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Entry mode</Label>
                <select value={entry.mode || ''} onChange={(e) => setEntry((p) => ({ ...p, mode: e.target.value || undefined }))}
                  className="w-full h-8 px-2 rounded border border-input bg-background text-xs">
                  <option value="">Not decided</option>
                  <option value="OPEN_ENTRY">Open entry</option>
                  <option value="CAPACITY_CONTROLLED">Capacity controlled</option>
                </select></div>
              <div><Label className="text-xs">Working target (people)</Label>
                <Input type="number" className="h-8 text-xs" value={entry.capacity_target ?? ''} disabled={entry.mode !== 'CAPACITY_CONTROLLED'}
                  onChange={(e) => setEntry((p) => ({ ...p, capacity_target: e.target.value ? Number(e.target.value) : undefined }))} /></div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={!!entry.one_out_one_in} onChange={(e) => setEntry((p) => ({ ...p, one_out_one_in: e.target.checked }))} />
              One-out-one-in when target reached
            </label>
            <div><Label className="text-xs">Entry procedure (your words)</Label>
              <Input className="h-8 text-xs" value={entry.procedure_note || ''} onChange={(e) => setEntry((p) => ({ ...p, procedure_note: e.target.value }))}
                placeholder="group entry, stroller/bag rules, line management…" /></div>
            <div><Label className="text-xs">Team instructions (team-safe, no codes)</Label>
              <Input className="h-8 text-xs" value={entry.instructions || ''} onChange={(e) => setEntry((p) => ({ ...p, instructions: e.target.value }))} /></div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={!!client.client_expected} onChange={(e) => setClient((p) => ({ ...p, client_expected: e.target.checked }))} />
                Client expected
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={!!client.client_on_site} onChange={(e) => setClient((p) => ({ ...p, client_on_site: e.target.checked }))} />
                Client on site
              </label>
            </div>
            <div><Label className="text-xs">Expected time</Label>
              <Input className="h-8 text-xs" value={client.expected_time || ''} onChange={(e) => setClient((p) => ({ ...p, expected_time: e.target.value }))} placeholder="Sat morning / after 1pm" /></div>
            <div><Label className="text-xs">Team-safe boundaries while present</Label>
              <Input className="h-8 text-xs" value={client.boundaries_note || ''} onChange={(e) => setClient((p) => ({ ...p, boundaries_note: e.target.value }))}
                placeholder="merchandise talks go through the operator; primary bedroom stays private…" /></div>
            <div><Label className="text-xs">Sale-day instructions</Label>
              <Input className="h-8 text-xs" value={client.instructions || ''} onChange={(e) => setClient((p) => ({ ...p, instructions: e.target.value }))} /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={busy}>{busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}