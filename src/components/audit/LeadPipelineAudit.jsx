import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader } from 'lucide-react';

const STAGES = [
  { key: 'new', label: 'New Leads', color: 'bg-blue-500' },
  { key: 'sent', label: 'Assigned / Sent', color: 'bg-yellow-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-orange-500' },
  { key: 'quoted', label: 'Quoted', color: 'bg-purple-500' },
  { key: 'won', label: 'Won', color: 'bg-green-500' },
  { key: 'lost', label: 'Lost', color: 'bg-red-400' },
  { key: 'closed', label: 'Closed', color: 'bg-slate-400' },
];

export default function LeadPipelineAudit() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [cleanout, reseller] = await Promise.all([
      base44.entities.CleanoutLead.list('-created_date', 1000),
      base44.entities.ResellerLead.list('-created_date', 1000),
    ]);
    const all = [...cleanout, ...reseller];
    const counts = {};
    STAGES.forEach(s => { counts[s.key] = all.filter(l => l.lead_status === s.key).length; });
    const total = all.length;
    setStats({ counts, total, sources: { cleanout: cleanout.length, reseller: reseller.length } });
    setLoading(false);
  };

  if (loading) return <div className="flex items-center gap-2 text-slate-400 py-6"><Loader className="w-4 h-4 animate-spin" />Loading pipeline…</div>;

  const { counts, total, sources } = stats;
  const wonRate = total > 0 ? Math.round((counts.won / total) * 100) : 0;
  const contactedRate = total > 0 ? Math.round(((counts.contacted + counts.quoted + counts.won) / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">Lead Pipeline Audit</h3>
        <span className="text-xs text-slate-400">{total} total leads across all networks</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <p className="text-xs text-slate-400 font-semibold uppercase">Cleanout Leads</p>
          <p className="text-xl font-bold text-slate-800">{sources.cleanout}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <p className="text-xs text-slate-400 font-semibold uppercase">Reseller Leads</p>
          <p className="text-xl font-bold text-slate-800">{sources.reseller}</p>
        </div>
      </div>

      <div className="space-y-2">
        {STAGES.map(s => {
          const count = counts[s.key] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={s.key} className="flex items-center gap-4">
              <div className="w-36 text-sm text-slate-600 flex-shrink-0">{s.label}</div>
              <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }} />
              </div>
              <div className="w-16 text-right text-sm font-bold text-slate-700">{count}</div>
              <div className="w-10 text-right text-xs text-slate-400">{Math.round(pct)}%</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{wonRate}%</p>
          <p className="text-xs text-slate-500 mt-1">Win Rate</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{contactedRate}%</p>
          <p className="text-xs text-slate-500 mt-1">Contact Rate</p>
        </div>
      </div>
    </div>
  );
}