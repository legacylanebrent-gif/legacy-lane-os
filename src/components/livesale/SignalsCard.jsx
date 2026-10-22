// Chapter 20 P1-12/P1-48/P1-49 — LIVE SIGNALS: only metrics supported by
// canonical data, each labeled EXACT or APPROXIMATE. ATTENDANCE ≠ OCCUPANCY:
// the inside count is entries minus exits today, manually counted — labeled
// APPROXIMATE, never a certification. Fast floor-observation capture reuses
// SaleNote (OBSERVATION); SaleIssue remains the path when a RESPONSE is needed.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity as ActivityIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { OBSERVATION_KINDS } from './liveSaleModel';

const Tile = ({ label, value, sub, quality }) => (
  <div className="border border-slate-200 rounded p-2">
    <p className="text-[10px] text-slate-500">
      {label} {quality && <Badge variant="outline" className="ml-1 text-[9px] py-0">{quality}</Badge>}
    </p>
    <p className="text-lg font-bold text-slate-900 leading-tight">{value}</p>
    {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
  </div>
);

export default function SignalsCard({ sale, metrics, onChanged }) {
  const [kind, setKind] = useState('Crowding');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const m = metrics || {};

  const categories = Object.entries(m.categories || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const saveObservation = async () => {
    if (!note.trim()) { toast.error('Write the observation first'); return; }
    setBusy(true);
    try {
      await base44.entities.SaleNote.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        sale_team_ids: sale.sale_team || [],
        note: `[${kind}] ${note.trim()}`,
        pinned: kind === 'Crowding' || kind === 'Checkout pressure',
      });
      setNote('');
      toast.success('Floor observation recorded');
    } catch (e) {
      console.error(e);
      toast.error('Could not record the observation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ActivityIcon className="w-5 h-5 text-cyan-700" /> Live Signals
        </CardTitle>
        <p className="text-xs text-slate-500">From records only — every number names its source. Unknown stays unknown; zero is a number.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="ATTENDANCE today" value={m.attendanceToday ?? '—'} quality="EXACT" sub="checked-in entries" />
          <Tile label="APPROX. PEOPLE INSIDE" value={m.approxInside ?? '—'} quality="APPROX" sub="entries − exits today (manual)" />
          <Tile label="OPEN OFFERS" value={m.openOffers ?? '—'} quality="EXACT" />
          <Tile label="HIGH-VALUE SOLD today" value={m.hvSoldToday ?? '—'} quality="EXACT" />
          <Tile label="AWAITING PICKUP" value={m.awaitingPickup ?? '—'} quality="EXACT" />
          <Tile label="OPEN ISSUES" value={m.openIssues ?? '—'} quality="EXACT" sub={m.criticalIssues ? `${m.criticalIssues} critical` : 'none critical'} />
          <Tile label="COVERAGE GAPS" value={m.coverageGaps ?? '—'} quality="EXACT" sub="unassigned responsibilities" />
          <Tile label="CATEGORY SALES today" value={categories.length ? categories.map(([c, n]) => `${c}: ${n}`).slice(0, 2).join(' · ') : '—'} quality="EXACT" sub={categories.length > 2 ? categories.slice(2).map(([c, n]) => `${c}: ${n}`).join(' · ') : 'from sold Items'} />
        </div>

        <div className="border border-slate-200 rounded p-2 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Floor observation — worth recording (needs a response? use Ask for Help instead)</p>
          <div className="flex flex-wrap gap-1.5">
            {OBSERVATION_KINDS.map((k) => (
              <button key={k} onClick={() => setKind(k)}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${kind === k ? 'bg-cyan-100 border-cyan-400 text-cyan-900' : 'border-slate-300 text-slate-600'}`}>
                {k}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input className="h-8 text-xs" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. line forming at checkout; jewelry table crowded" />
            <Button size="sm" className="bg-cyan-700 hover:bg-cyan-800 h-8" disabled={busy} onClick={saveObservation}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Record'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}