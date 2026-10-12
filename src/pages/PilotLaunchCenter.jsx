// Phase 5A — Pilot Launch Center: the platform-admin dashboard for the
// Controlled Pilot Program. Wraps the llbbPilot control-plane seam only —
// it never provisions websites itself; provisioning reuses the certified
// provisionWebsiteTenant + websiteCollab flows.
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminPilotDetail from '@/components/pilot/AdminPilotDetail';
import { CandidatesTab } from '@/components/pilot/PilotCandidatesTab';
import { AggregateTab } from '@/components/pilot/PilotAggregateTab';
import { Loader2, Search, ArrowLeft, ClipboardCheck, Users, AlertTriangle, BarChart3, ShieldCheck } from 'lucide-react';

const VIEW_TABS = [
  { key: 'pilots', label: 'Pilots', icon: ClipboardCheck },
  { key: 'candidates', label: 'Candidates', icon: Users },
  { key: 'attention', label: 'Attention', icon: AlertTriangle },
  { key: 'aggregate', label: 'Report', icon: BarChart3 }
];

export default function PilotLaunchCenter() {
  const [view, setView] = useState('pilots');
  const [rows, setRows] = useState([]);
  const [attention, setAttention] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke('llbbPilot', { action: 'list' });
      setRows(res.data.rows || []);
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setError(d ? (d.message || d.code) : 'Could not load pilots.');
    }
    setLoading(false);
  }, []);

  const loadAttention = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('llbbPilot', { action: 'attention' });
      setAttention(res.data.items || []);
    } catch { setAttention([]); }
  }, []);

  useEffect(() => { load(); loadAttention(); }, [load, loadAttention]);

  const filtered = rows.filter(r =>
    !search.trim() || (r.company.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.stage_label || '').toLowerCase().includes(search.toLowerCase()));

  const openPilot = rows.find(r => r.id === openId) || null;
  const activePilots = rows.filter(r => r.stage !== 'PILOT_COMPLETE').length;

  if (openId) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => { setOpenId(null); load(); }} className="mb-3">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> All pilots
        </Button>
        <AdminPilotDetail pilotId={openId} summary={openPilot} onChanged={load} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="text-[10px] font-semibold tracking-widest text-cyan-700 uppercase leading-none mb-1">Business Builder</div>
          <h1 className="font-heading font-bold text-2xl text-slate-900">Pilot Launch Center</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Controlled pilot program — approve operators, shepherd their website setup through the certified
            workflows, and record the milestones that decide whether the pilot scales.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="w-4 h-4 text-cyan-600" />
          <span className="text-slate-500">{activePilots} active pilot{activePilots === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {VIEW_TABS.map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === t.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
            {t.key === 'attention' && attention.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">{attention.length}</span>
            )}
          </button>
        ))}
      </div>

      {view === 'candidates' && <CandidatesTab onApproved={() => { load(); setView('pilots'); }} />}

      {view === 'attention' && (
        <div className="space-y-3">
          {attention.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-sm text-slate-500">
              Nothing needs attention right now.
            </div>
          )}
          {attention.map(a => (
            <div key={a.pilot_id} className="bg-white border border-amber-200 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-semibold text-slate-900">{a.company_name}</span>
                <Badge className="bg-slate-100 text-slate-700">{a.stage}</Badge>
                <button className="text-sm text-cyan-700 hover:underline ml-auto" onClick={() => setOpenId(a.pilot_id)}>Open pilot</button>
              </div>
              <ul className="text-sm text-slate-600 space-y-1">
                {a.issues.map((i, idx) => <li key={idx} className="flex gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />{i.label}{i.detail ? ` — ${i.detail}` : ''}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {view === 'aggregate' && <AggregateTab />}

      {view === 'pilots' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pilots…"
              className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 text-sm bg-white" />
          </div>

          {loading && <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4 text-sm">{error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
              <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No pilots yet. Approve a candidate company to start the first pilot.</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                    <th className="px-4 py-2.5 font-medium">Company</th>
                    <th className="px-4 py-2.5 font-medium">Pilot stage</th>
                    <th className="px-4 py-2.5 font-medium">Website</th>
                    <th className="px-4 py-2.5 font-medium">Setup</th>
                    <th className="px-4 py-2.5 font-medium">Health</th>
                    <th className="px-4 py-2.5 font-medium">Publications</th>
                    <th className="px-4 py-2.5 font-medium">Checklist</th>
                    <th className="px-4 py-2.5 font-medium">Last activity</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.company.name}</div>
                        <div className="text-xs text-slate-400">{r.owner && r.owner.email ? r.owner.email : '—'} · {r.entitlement_tier || '—'}</div>
                      </td>
                      <td className="px-4 py-3"><Badge className="bg-cyan-50 text-cyan-800">{r.stage_label}</Badge></td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.website_status ? (
                          <div>
                            <div className="text-xs">{r.website_status}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{r.platform_hostname || '—'}</div>
                          </div>
                        ) : <span className="text-slate-400">not created</span>}
                      </td>
                      <td className="px-4 py-3">{r.setup_percent != null ? `${r.setup_percent}%` : '—'}</td>
                      <td className="px-4 py-3">
                        <Badge className={
                          r.health === 'healthy' ? 'bg-green-50 text-green-700' :
                          r.health === 'warning' ? 'bg-amber-50 text-amber-700' :
                          r.health === 'fail' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}>
                          {r.health}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.publication_status ? (
                          <div className="text-xs">
                            <div>{r.publication_status.published} published</div>
                            {r.publication_status.failed > 0 && <div className="text-red-600">{r.publication_status.failed} failed</div>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{r.checklist_progress.done}/{r.checklist_progress.total}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {r.last_activity_at ? new Date(r.last_activity_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          {r.attention_required.length > 0 && (
                            <Badge className="bg-amber-50 text-amber-700">{r.attention_required.length}</Badge>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>Open</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}