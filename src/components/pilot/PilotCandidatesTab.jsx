// Phase 5A — Candidate search + Approve For Pilot (Parts 4/5).
// Approve records the pilot decision only — it never provisions a website;
// the website is launched through the certified provisioning flow afterward.
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle2, XCircle, UserPlus, AlertTriangle } from 'lucide-react';

const MODE_LABELS = {
  admin_managed: 'Admin managed — the EstateSalen team builds it',
  client_managed: 'Client managed — the operator builds it',
  collaborative: 'Collaborative — build together'
};

export function CandidatesTab({ onApproved }) {
  const [q, setQ] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(null);
  const [detail, setDetail] = useState(null); // { company_id, checks, eligible }
  const [mode, setMode] = useState('collaborative');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState(null);

  const search = useCallback(async (term) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('llbbPilot', { action: 'candidates', q: term || '' });
      setCompanies(res.data.companies || []);
    } catch { setCompanies([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 350);
    return () => clearTimeout(t);
  }, [q, search]);

  const check = async (id) => {
    setChecking(id); setApproveError(null);
    try {
      const res = await base44.functions.invoke('llbbPilot', { action: 'eligibility', company_id: id });
      setDetail(res.data);
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setApproveError(d ? (d.message || d.code) : 'Could not check eligibility.');
    }
    setChecking(null);
  };

  const approve = async () => {
    if (!detail) return;
    setApproving(true); setApproveError(null);
    try {
      await base44.functions.invoke('llbbPilot', {
        action: 'approve', company_id: detail.company_id || detail.id, management_mode: mode, confirm: true
      });
      setDetail(null);
      onApproved();
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setApproveError(d ? `${d.message}${d.checks ? ' — ' + d.checks.filter(c => !c.ok).map(c => c.label).join(', ') : ''}` : 'Approval failed.');
    }
    setApproving(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search companies…"
          className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 text-sm bg-white" />
      </div>

      {approveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {approveError}
        </div>
      )}

      {loading && <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>}

      {!loading && companies.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">No companies match.</div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {companies.map(c => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium text-slate-900">{c.display_name}</div>
                <div className="text-xs text-slate-400">
                  {c.owner ? `${c.owner.name || ''} ${c.owner.email ? '· ' + c.owner.email : ''}` : 'No owner contact'}
                  {c.already_in_pilot && <Badge className="ml-2 bg-indigo-50 text-indigo-700">In pilot</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.already_in_pilot ? (
                  <Button size="sm" variant="ghost" onClick={() => onApproved()}>View pilots</Button>
                ) : c.eligible ? (
                  <Button size="sm" onClick={() => check(c.id)} disabled={checking === c.id}>
                    {checking === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />} Approve…
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => check(c.id)} disabled={checking === c.id}>
                    {checking === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg text-slate-900 mb-1">Approve for pilot</h3>
            <p className="text-sm text-slate-500 mb-4">Record the pilot approval. The website itself is created afterward through the standard Business Builder provisioning flow.</p>
            <div className="space-y-2 mb-4">
              {detail.checks.map(ch => (
                <div key={ch.key} className="flex items-start gap-2 text-sm">
                  {ch.ok ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                  <div>
                    <span className="text-slate-800">{ch.label}</span>
                    {ch.detail && <span className="text-slate-400"> — {ch.detail}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">How will this pilot be managed?</label>
              <select value={mode} onChange={e => setMode(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm bg-white">
                {Object.entries(MODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {detail.eligible ? (
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetail(null)}>Cancel</Button>
                <Button size="sm" onClick={approve} disabled={approving}>
                  {approving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Approve for pilot
                </Button>
              </div>
            ) : (
              <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => setDetail(null)}>Close</Button></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}