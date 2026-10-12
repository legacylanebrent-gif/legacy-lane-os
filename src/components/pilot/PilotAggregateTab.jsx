// Phase 5A — Aggregate pilot report (Parts 39/40/41): funnel summary,
// median setup time, top friction, per-category scorecard and the Go/No-Go read.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';

export function AggregateTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('llbbPilot', { action: 'aggregate' });
        setData(res.data);
      } catch { setData(null); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;
  if (!data) return <div className="bg-white border border-slate-200 rounded-lg p-6 text-sm text-slate-500">Could not load the report.</div>;

  const s = data.summary;
  const cards = [
    ['Operators invited', s.operators_invited],
    ['Invitations accepted', s.accepted],
    ['Setup completed', s.setup_completed],
    ['Websites published', s.published],
    ['Custom domains connected', s.custom_domains],
    ['First sales published', s.first_sales],
    ['First seller leads', s.seller_leads],
    ['First buyer signups', s.buyer_signups],
    ['Median setup (hours)', s.median_setup_days != null ? Math.round(s.median_setup_days * 10) / 10 : '—'],
    ['Admin interventions', s.admin_interventions],
    ['Health issues', s.health_issues]
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-[11px] text-slate-400 mb-1">{label}</div>
            <div className="font-heading font-bold text-xl text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          {data.decision.recommendation === 'READY FOR GENERAL RELEASE'
            ? <ThumbsUp className="w-5 h-5 text-green-600" />
            : <ThumbsDown className="w-5 h-5 text-amber-500" />}
          <span className="font-heading font-bold text-slate-900">{data.decision.recommendation === 'READY FOR GENERAL RELEASE' ? 'Go' : 'Not yet — keep piloting'}</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-1.5">P0 issues (must fix)</div>
            {(data.decision.p0 || []).length === 0 && <div className="text-sm text-slate-400">None</div>}
            <ul className="text-sm text-slate-600 space-y-1">{(data.decision.p0 || []).map((r, i) => <li key={i}>• {r}</li>)}</ul>
            <div className="text-xs font-semibold text-slate-400 mb-1.5 mt-3">P1 issues (should fix)</div>
            {(data.decision.p1 || []).length === 0 && <div className="text-sm text-slate-400">None</div>}
            <ul className="text-sm text-slate-600 space-y-1">{(data.decision.p1 || []).map((r, i) => <li key={i}>• {r}</li>)}</ul>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-1.5">Evidence</div>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Pilots in scope: {data.decision.evidence.pilots_total}</li>
              <li>• Published sites: {(data.decision.evidence.published || []).length}</li>
              <li>• With first sale published: {data.decision.evidence.with_sales}</li>
              <li>• With first seller lead: {data.decision.evidence.with_seller_leads}</li>
              <li>• With first buyer signup: {data.decision.evidence.with_buyer_signups}</li>
              <li>• Avg admin interventions: {data.decision.evidence.avg_interventions}</li>
            </ul>
            {(data.decision.evidence.red_categories || []).length > 0 && (
              <div className="text-xs font-semibold text-red-500 mt-3">RED categories</div>
            )}
            <ul className="text-sm text-red-600 space-y-1">{(data.decision.evidence.red_categories || []).map((r, i) => <li key={i}>• {r}</li>)}</ul>
          </div>
        </div>
      </div>

      {(s.top_friction || []).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-semibold text-slate-400 mb-2">Top friction points</div>
          <div className="flex flex-wrap gap-2">
            {s.top_friction.map(f => <Badge key={f.kind} className="bg-amber-50 text-amber-700">{f.kind} ({f.count})</Badge>)}
          </div>
        </div>
      )}

      {(data.rows || []).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Stage</th>
                {['Onboarding', 'Setup', 'Sales Integration', 'Reliability'].map(h => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.map(r => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.company.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.stage_label}</td>
                  {['onboarding', 'setup', 'sales_integration', 'reliability'].map(k => {
                    const c = (r.scorecard_categories || []).find(x => x.key === k) || { status: 'YELLOW' };
                    return (
                      <td key={k} className="px-4 py-3">
                        <Badge className={c.status === 'GREEN' ? 'bg-green-50 text-green-700' : c.status === 'RED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}>{c.status}</Badge>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}