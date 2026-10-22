// Chapter 22 P1 — CLIENT COMPLETION SUMMARY, UNSOLD INTELLIGENCE (only metrics
// actual data supports), CLOSEOUT CALENDAR, and the factual PROJECT SCORECARD.
// Unsupported metrics display UNKNOWN / NOT AVAILABLE — never zero.
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { clientCompletionSummary, unsoldIntelligence, scorecard, closeoutCalendar, money } from './transitionModel';

export default function SummaryCard({ sale, items, transactions, expenses, buckets, deal, econ, blockers, tasks }) {
  const summary = clientCompletionSummary(buckets, items);
  const intel = unsoldIntelligence(items, transactions);
  const rows = scorecard({ sale, deal, econ, blockers, buckets, expenses });
  const calendar = closeoutCalendar({ sale, items, donations: [], cleanouts: [], tasks });
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Client completion summary</h3>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">sold: {summary.sold}</Badge>
            <Badge variant="outline">buyer pickups resolved: {summary.buyerPickupsResolved}</Badge>
            <Badge variant="outline">client/family retained: {summary.retained}</Badge>
            <Badge variant="outline">donated: {summary.donated}</Badge>
            <Badge variant="outline">cleanout removed: {summary.cleanoutRemoved}</Badge>
            <Badge variant="outline">buyout transferred: {summary.buyoutTransferred}</Badge>
            <Badge variant="outline">specialist resolved: {summary.specialistResolved}</Badge>
            <Badge variant="outline">disposed: {summary.disposed}</Badge>
            {summary.unresolvedExceptions > 0 && <Badge className="bg-red-100 text-red-700">unresolved exceptions: {summary.unresolvedExceptions}</Badge>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Closeout calendar</h3>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {calendar.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 truncate">{e.label}</span>
                <span className="text-slate-500 flex-shrink-0">{e.date} <Badge variant="outline">{e.kind}</Badge></span>
              </div>
            ))}
            {calendar.length === 0 && <p className="text-sm text-slate-400">No dated closeout steps recorded.</p>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Unsold intelligence — only what the data supports</h3>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">sell-through by item count: {intel.sellThroughByCount}</Badge>
            <Badge variant="outline">unsold asking value: {money(intel.unsoldAskingValue)}</Badge>
            <Badge variant="outline">actual recorded revenue: {money(intel.actualRevenue)}</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">Remaining by category: {Object.keys(intel.remainingByCategory).length ? Object.entries(intel.remainingByCategory).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'none remaining'}</p>
          <p className="text-xs text-slate-400 mt-1">Labor-to-revenue by category and marketing-exposure comparisons are NOT claimed — the underlying per-item attribution does not exist.</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Project scorecard — factual dimensions only</h3>
          <div className="space-y-1">
            {rows.map((r, i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-1 py-1 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">{r.label}</span>
                <span className={`text-sm ${r.unknown ? 'text-slate-400 italic' : 'text-slate-800'}`}>{r.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">No composite score — unsupported dimensions display UNKNOWN, never zero.</p>
        </CardContent>
      </Card>
    </div>
  );
}