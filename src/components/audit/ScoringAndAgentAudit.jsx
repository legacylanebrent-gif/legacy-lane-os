import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SCORING_ENGINES = [
  { name: 'Estate Sale Score', exists: true, active: true, function: 'scorePropstreamListings', last_run: '2026-06-08' },
  { name: 'Reseller Score', exists: true, active: true, function: 'matchResellerLead', last_run: '2026-06-09' },
  { name: 'Buyout Score', exists: false, active: false, function: '—', last_run: '—' },
  { name: 'Cleanout Score', exists: true, active: true, function: 'matchCleanoutLead', last_run: '2026-06-09' },
  { name: 'Real Estate Score', exists: true, active: true, function: 'scoreEstateTransitionLead', last_run: '2026-06-08' },
];

const SUPERAGENT_FUNCTIONS = [
  { name: 'Generate Agent Email', exists: true, active: true, function: 'generateListingAgentEmails', last_run: '2026-06-08' },
  { name: 'Generate Estate Sale Company Owner Email', exists: true, active: true, function: 'sendPropstreamListingToOperators', last_run: '2026-06-08' },
  { name: 'Generate Reseller Email', exists: true, active: true, function: 'matchResellerLead', last_run: '2026-06-09' },
  { name: 'Generate Cleanout Vendor Email', exists: true, active: true, function: 'matchCleanoutLead', last_run: '2026-06-09' },
  { name: 'Generate Follow-Up', exists: false, active: false, function: '—', last_run: '—' },
  { name: 'Generate Lead Summary', exists: true, active: true, function: 'scoreLeads', last_run: '2026-06-08' },
  { name: 'Generate Call Script', exists: false, active: false, function: '—', last_run: '—' },
];

const Bool = ({ val }) => val ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />;

function AuditTable({ title, rows, countKey }) {
  const active = rows.filter(r => r[countKey]).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <span className="text-xs text-slate-400">{active}/{rows.length} active</span>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Exists</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Active</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Function</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Last Run</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(r => (
              <tr key={r.name} className={`${!r.exists ? 'bg-red-50/40' : 'hover:bg-slate-50'} transition-colors`}>
                <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-3 text-center"><Bool val={r.exists} /></td>
                <td className="px-4 py-3 text-center"><Bool val={r.active} /></td>
                <td className="px-4 py-3 text-xs text-slate-500 font-mono">{r.function}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.last_run}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ScoringAndAgentAudit({ onScoreUpdate }) {
  React.useEffect(() => {
    const active = [...SCORING_ENGINES, ...SUPERAGENT_FUNCTIONS].filter(r => r.active).length;
    onScoreUpdate?.({ active, total: SCORING_ENGINES.length + SUPERAGENT_FUNCTIONS.length });
  }, []);

  return (
    <div className="space-y-8">
      <AuditTable title="Opportunity Scoring Engines" rows={SCORING_ENGINES} countKey="active" />
      <AuditTable title="SuperAgent Functions" rows={SUPERAGENT_FUNCTIONS} countKey="active" />
    </div>
  );
}