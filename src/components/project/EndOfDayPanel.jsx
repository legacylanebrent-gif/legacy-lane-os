// Chapter 14 P1-47 — END-OF-DAY PREP REVIEW: an assembled deterministic view.
// Owns nothing — every number is derived from canonical records, so the next
// prep day carries forward with NO reset and NO re-entry.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck } from 'lucide-react';
import { endOfDaySummary } from '@/components/saleops/discoveryModel';

export default function EndOfDayPanel({ sale, zones, discoveries, tasks, issues, decisions, laborEntries }) {
  const s = endOfDaySummary({ zones, discoveries, tasks, issues, decisions, laborEntries });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-cyan-700" /> End-of-Day Prep Review
        </CardTitle>
        <p className="text-xs text-slate-500">Deterministic, from records only — no AI. Unfinished work carries to the next prep day automatically.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card><CardContent className="p-2.5">
            <p className="text-[10px] text-slate-500">Zones complete</p>
            <p className="text-lg font-bold text-emerald-700">{s.zonesComplete.length}</p>
            {s.zonesComplete.length > 0 && <p className="text-[10px] text-slate-400 truncate">{s.zonesComplete.join(', ')}</p>}
          </CardContent></Card>
          <Card><CardContent className="p-2.5">
            <p className="text-[10px] text-slate-500">Still sorting</p>
            <p className="text-lg font-bold text-amber-700">{s.zonesSorting.length}</p>
            {s.zonesSorting.length > 0 && <p className="text-[10px] text-slate-400 truncate">{s.zonesSorting.join(', ')}</p>}
          </CardContent></Card>
          <Card><CardContent className="p-2.5">
            <p className="text-[10px] text-slate-500">Labor today</p>
            <p className="text-lg font-bold text-slate-900">{s.laborHoursToday.toFixed(1)}h</p>
            <p className="text-[10px] text-slate-400">{s.laborEntriesToday} entr(ies)</p>
          </CardContent></Card>
          <Card><CardContent className="p-2.5">
            <p className="text-[10px] text-slate-500">Open discoveries</p>
            <p className="text-lg font-bold text-slate-900">{s.openDiscoveries}</p>
            <p className="text-[10px] text-slate-400">{s.researchOpen} on research</p>
          </CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {s.zonesWaiting.length > 0 && <Badge variant="outline" className="text-cyan-700 border-cyan-300">Waiting zones: {s.zonesWaiting.join(', ')}</Badge>}
          {s.zonesUntouched.length > 0 && <Badge variant="outline" className="text-slate-500">Untouched: {s.zonesUntouched.join(', ')}</Badge>}
          {s.decisionsOpen > 0 && <Badge variant="outline" className="text-cyan-700 border-cyan-300">{s.decisionsOpen} client decision(s) open</Badge>}
          {s.issuesOpen > 0 && <Badge variant="outline" className="text-amber-700 border-amber-300">{s.issuesOpen} SaleIssue(s) open</Badge>}
          {s.sensitiveUnresolved > 0 && <Badge className="bg-rose-100 text-rose-700">{s.sensitiveUnresolved} sensitive unresolved</Badge>}
          {s.restrictedUnresolved > 0 && <Badge className="bg-red-100 text-red-700">{s.restrictedUnresolved} restricted unresolved</Badge>}
          {s.tasksBlocked > 0 && <Badge variant="outline" className="text-amber-700 border-amber-300">{s.tasksBlocked} blocked task(s)</Badge>}
          {s.tasksDueToday > 0 && <Badge variant="outline" className="text-red-700 border-red-300">{s.tasksDueToday} task(s) due</Badge>}
        </div>

        <p className="text-[10px] text-slate-400">
          Carries to the next prep day: every open discovery, decision, issue, and unfinished zone persists in canonical records — nothing resets, nothing re-enters.
        </p>
      </CardContent>
    </Card>
  );
}