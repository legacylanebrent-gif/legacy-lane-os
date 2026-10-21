// Chapter 13 P1 — TIMELINE (P1-30): assembled read-only project timeline from
// sale dates, client external deadlines, family removal deadlines, task due
// dates, and issue answer-by dates. Date truth is never duplicated here.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarRange } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { timelineEntries } from '@/components/saleops/projectModel';

const KIND_STYLE = {
  sale: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  client: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  family: 'bg-orange-100 text-orange-700 border-orange-300',
  task: 'bg-slate-100 text-slate-600 border-slate-300',
  issue: 'bg-red-100 text-red-700 border-red-300',
};

export default function ProjectTimeline({ sale, linkedDeal, tasks, issues }) {
  const entries = timelineEntries({
    sale, linkedDeal, tasks, issues,
    excludedAreas: (sale && sale.excluded_areas) || [],
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-indigo-600" /> Project Timeline
        </CardTitle>
        <p className="text-xs text-slate-500">
          Sale dates, client deadlines, family removal deadlines, task due dates and issue answer-by dates — assembled
          from the records that own them.
        </p>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">No dates recorded yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {entries.map((e, idx) => {
              const d = e.date ? parseISO(e.date) : null;
              return (
                <div key={idx} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${e.past ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'}`}>
                  <div className="w-16 flex-shrink-0 text-xs">
                    {d ? <span className={`font-semibold ${e.past ? 'text-red-600' : 'text-slate-700'}`}>{format(d, 'MMM d')}</span>
                      : <span className="text-slate-400">—</span>}
                    {d && <span className="block text-slate-400">{format(d, 'yyyy')}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 truncate">{e.label}</p>
                    {e.detail && <p className="text-xs text-slate-500 truncate">{e.detail}</p>}
                  </div>
                  <Badge className={`${KIND_STYLE[e.kind] || KIND_STYLE.task} flex-shrink-0`}>
                    {e.kind === 'client' ? 'CLIENT' : e.kind.toUpperCase()}
                  </Badge>
                  {e.past && <Badge className="bg-red-100 text-red-700 border-red-300 flex-shrink-0">PAST</Badge>}
                </div>
              );
            })}
          </div>
        )}
        {today && null}
      </CardContent>
    </Card>
  );
}